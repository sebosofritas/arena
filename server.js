// ============================================================
//  ARENA DE SOBREVIVÊNCIA - servidor (versão 0.1: lobby)
//  Aqui fica a "verdade" do jogo. O navegador só mostra o que
//  o servidor manda.
// ============================================================
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));
app.get('/saude', (req, res) => res.send('ok')); // usado para "acordar" o servidor

// ---------- CONFIGURAÇÕES (fáceis de mudar depois) ----------
const MAX_JOGADORES = 24;       // limite técnico por sala
const TAMANHO_NOME = 16;        // letras máximas no nome
const SALA_VAZIA_EXPIRA_MS = 60 * 60 * 1000; // sala sem ninguém some após 1h

// ---------- ESTADO ----------
// salas: código -> { codigo, fase, jogadores: [..], hostToken, criadaEm }
const salas = new Map();

function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I e O (confundem com 1 e 0)
  let codigo;
  do {
    codigo = Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
  } while (salas.has(codigo));
  return codigo;
}

function limparNome(nome) {
  return String(nome || '').replace(/\s+/g, ' ').trim().slice(0, TAMANHO_NOME);
}

// O que o navegador pode ver (nunca manda o token dos outros!)
function estadoPublico(sala) {
  return {
    codigo: sala.codigo,
    fase: sala.fase, // 'lobby' ou 'jogo'
    max: MAX_JOGADORES,
    jogadores: sala.jogadores.map(j => ({
      nome: j.nome,
      conectado: j.conectado,
      host: j.token === sala.hostToken
    }))
  };
}

function enviarSala(sala) {
  for (const j of sala.jogadores) {
    if (j.socketId) {
      io.to(j.socketId).emit('sala', {
        ...estadoPublico(sala),
        voce: { nome: j.nome, token: j.token, eHost: j.token === sala.hostToken }
      });
    }
  }
}

function novoJogador(sala, nome, socket) {
  const jogador = {
    token: crypto.randomBytes(12).toString('hex'),
    nome,
    socketId: socket.id,
    conectado: true
  };
  sala.jogadores.push(jogador);
  socket.data.codigo = sala.codigo;
  socket.data.token = jogador.token;
  return jogador;
}

// ---------- CONEXÕES ----------
io.on('connection', (socket) => {

  socket.on('criarSala', ({ nome }) => {
    nome = limparNome(nome);
    if (!nome) return socket.emit('erro', 'Escolha um nome para o seu personagem.');
    const codigo = gerarCodigo();
    const sala = { codigo, fase: 'lobby', jogadores: [], hostToken: null, criadaEm: Date.now() };
    salas.set(codigo, sala);
    const jogador = novoJogador(sala, nome, socket);
    sala.hostToken = jogador.token;
    enviarSala(sala);
  });

  socket.on('entrarSala', ({ codigo, nome }) => {
    codigo = String(codigo || '').toUpperCase().trim();
    nome = limparNome(nome);
    const sala = salas.get(codigo);
    if (!nome) return socket.emit('erro', 'Escolha um nome para o seu personagem.');
    if (!sala) return socket.emit('erro', 'Não existe sala com esse código.');
    if (sala.fase !== 'lobby') return socket.emit('erro', 'A partida dessa sala já começou.');
    if (sala.jogadores.length >= MAX_JOGADORES) return socket.emit('erro', 'A sala está cheia.');
    if (sala.jogadores.some(j => j.nome.toLowerCase() === nome.toLowerCase())) {
      return socket.emit('erro', 'Já existe um personagem com esse nome na sala.');
    }
    novoJogador(sala, nome, socket);
    enviarSala(sala);
  });

  // Voltar para o mesmo personagem (aba fechada, wifi caiu, etc.)
  socket.on('reconectar', ({ codigo, token }) => {
    const sala = salas.get(String(codigo || '').toUpperCase());
    const jogador = sala && sala.jogadores.find(j => j.token === token);
    if (!jogador) return socket.emit('reconexaoFalhou');
    jogador.socketId = socket.id;
    jogador.conectado = true;
    socket.data.codigo = sala.codigo;
    socket.data.token = jogador.token;
    enviarSala(sala);
  });

  socket.on('iniciarPartida', () => {
    const sala = salas.get(socket.data.codigo);
    if (!sala || sala.hostToken !== socket.data.token) return;
    if (sala.fase !== 'lobby') return;
    if (sala.jogadores.length < 2) return socket.emit('erro', 'Precisa de pelo menos 2 jogadores.');
    sala.fase = 'jogo';
    enviarSala(sala);
    // >>> AQUI entrará o motor do jogo (períodos, ações, combate...) <<<
  });

  socket.on('sairSala', () => {
    const sala = salas.get(socket.data.codigo);
    if (!sala) return;
    if (sala.fase === 'lobby') {
      sala.jogadores = sala.jogadores.filter(j => j.token !== socket.data.token);
      if (sala.hostToken === socket.data.token && sala.jogadores.length) {
        sala.hostToken = sala.jogadores[0].token; // passa o comando para o próximo
      }
    }
    socket.emit('saiu');
    socket.data.codigo = null;
    enviarSala(sala);
  });

  socket.on('disconnect', () => {
    const sala = salas.get(socket.data.codigo);
    if (!sala) return;
    const jogador = sala.jogadores.find(j => j.token === socket.data.token);
    if (jogador) { jogador.conectado = false; jogador.socketId = null; }
    enviarSala(sala);
  });
});

// Limpeza de salas abandonadas
setInterval(() => {
  const agora = Date.now();
  for (const [codigo, sala] of salas) {
    const ninguemOnline = sala.jogadores.every(j => !j.conectado);
    if (ninguemOnline && agora - sala.criadaEm > SALA_VAZIA_EXPIRA_MS) salas.delete(codigo);
  }
}, 10 * 60 * 1000);

const PORTA = process.env.PORT || 3000;
server.listen(PORTA, () => console.log('Arena rodando na porta ' + PORTA));
