'use strict';
// Servidor: entrega a página e liga os botões da tela à Sala.
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { Sala, codigoAleatorio } = require('./jogo/sala');
const Persist = require('./jogo/persistencia');

const app = express();
const servidor = http.createServer(app);
const io = new Server(servidor, { maxHttpBufferSize: 1e5 });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/saude', (req, res) => res.send('ok'));


const salas = new Map();           // código -> Sala
const MAX_SALAS = 200;

// Salvamento: grava 2 s depois da última mudança (e a cada fim de rodada, que também muda o estado)
const pendentes = new Map();
function agendarSalvar(sala) {
  if (pendentes.has(sala.codigo)) return;
  pendentes.set(sala.codigo, setTimeout(() => { pendentes.delete(sala.codigo); if (salas.get(sala.codigo) === sala) Persist.salvar(sala); }, 2000));
}
function aoCriar(s) { s.aoMudar = agendarSalvar; return s; }
for (const d of Persist.carregarTodas()) {
  try { const s = aoCriar(Sala.importar(d)); salas.set(s.codigo, s); console.log('Sala restaurada:', s.codigo, s.fase); }
  catch (e) { console.error('Não consegui restaurar uma sala:', e.message); }
}
function salvarTudo() { for (const s of salas.values()) Persist.salvar(s); }
process.on('SIGTERM', () => { salvarTudo(); process.exit(0); });
process.on('SIGINT', () => { salvarTudo(); process.exit(0); });

function novaSala() {
  if (salas.size >= MAX_SALAS) return null;
  let c; do { c = codigoAleatorio(); } while (salas.has(c));
  const s = aoCriar(new Sala(c));
  salas.set(c, s);
  return s;
}

// Limpeza: salas sem ninguém conectado há mais de 40 min, ou com mais de 12 h
setInterval(() => {
  const agora = Date.now();
  for (const [c, s] of salas) {
    if ((s.vazia() && agora - s.ultima > 40 * 60 * 1000) || agora - s.criada > 12 * 3600 * 1000) { s.encerrar(); salas.delete(c); Persist.apagar(c); }
  }
}, 5 * 60 * 1000).unref();

io.on('connection', (socket) => {
  let sala = null, pid = null, ultimoEvento = 0, rajada = 0;

  const enviar = (ev, d) => socket.emit(ev, d);
  const erro = (m) => socket.emit('erro', m);
  const usar = (fn) => (...args) => {
    // limite simples de velocidade
    const agora = Date.now();
    if (agora - ultimoEvento > 1000) { rajada = 0; ultimoEvento = agora; }
    if (++rajada > 25) return erro('Calma! Muitas ações seguidas.');
    try { fn(...args); } catch (e) { console.error('Erro no evento:', e); erro('Erro interno. Tente de novo.'); }
  };
  const exigeSala = () => { if (!sala || !pid) { erro('Você não está em uma sala.'); return false; } return true; };
  const resposta = (r) => { if (r && r.erro) erro(r.erro); return r; };
  const ligar = (s, j) => { sala = s; pid = j.id; socket.join(s.codigo); s.difundir(); };

  socket.on('criarSala', usar((d) => {
    if (sala) return erro('Você já está numa sala.');
    const s = novaSala(); if (!s) return erro('Servidor cheio, tente em alguns minutos.');
    const r = s.entrar(d && d.nome, enviar);
    if (r.erro) { salas.delete(s.codigo); return erro(r.erro); }
    ligar(s, r.jogador);
  }));
  socket.on('entrarSala', usar((d) => {
    if (sala) return erro('Você já está numa sala.');
    const c = String((d && d.codigo) || '').trim().toUpperCase();
    const s = salas.get(c); if (!s) return erro('Sala não encontrada. Confira o código.');
    const r = s.entrar(d && d.nome, enviar);
    if (r.erro) return erro(r.erro);
    ligar(s, r.jogador);
  }));
  socket.on('reconectar', usar((d) => {
    if (sala) return;
    const s = salas.get(String((d && d.codigo) || '').toUpperCase());
    if (!s) return socket.emit('reconexaoFalhou');
    const r = s.reconectar(d && d.token, enviar);
    if (r.erro) return socket.emit('reconexaoFalhou');
    ligar(s, r.jogador);
  }));
  socket.on('sairSala', usar(() => {
    if (!exigeSala()) return;
    const s = sala, id = pid; sala = null; pid = null; socket.leave(s.codigo);
    s.sair(id);
    if (s.jogadores.size === 0) { s.encerrar(); salas.delete(s.codigo); Persist.apagar(s.codigo); }
    socket.emit('saiu');
  }));
  socket.on('configurar', usar((d) => { if (exigeSala()) resposta(sala.configurar(pid, d)); }));
  socket.on('iniciar', usar(() => { if (exigeSala()) resposta(sala.iniciar(pid)); }));
  socket.on('criar:atualizar', usar((d) => { if (exigeSala()) resposta(sala.criarAtualizar(pid, d)); }));
  socket.on('criar:rolar', usar(() => { if (exigeSala()) resposta(sala.criarRolar(pid)); }));
  socket.on('criar:pronto', usar((v) => { if (exigeSala()) resposta(sala.criarPronto(pid, v)); }));
  socket.on('fila', usar((d) => { if (exigeSala()) resposta(sala.definirFila(pid, d && d.fila, d && d.postura)); }));
  socket.on('postura', usar((p) => { if (exigeSala()) resposta(sala.definirPostura(pid, p)); }));
  socket.on('pronto', usar((v) => { if (exigeSala()) resposta(sala.pronto(pid, v)); }));
  socket.on('proposta', usar((d) => { if (exigeSala()) resposta(sala.responderProposta(pid, d && d.id, d && d.aceitar)); }));
  socket.on('chat', usar((t) => { if (exigeSala()) resposta(sala.chat(pid, t)); }));
  socket.on('reiniciar', usar(() => { if (exigeSala()) resposta(sala.reiniciar(pid)); }));

  socket.on('disconnect', () => {
    if (sala && pid) sala.desconectar(pid);
  });
});

const PORTA = process.env.PORT || 3000;
servidor.listen(PORTA, () => console.log('Arena rodando na porta ' + PORTA));
