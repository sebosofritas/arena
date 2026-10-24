'use strict';
// Testa a Sala inteira com jogadores falsos e relógio falso.
// Uso: node teste-sala.js
const { Sala } = require('./jogo/sala');
let erros = 0;
const ok = (c, msg) => { if (!c) { erros++; console.log('  FALHOU: ' + msg); } };

let agora = 1000, fila = [];
const relogio = { agendar: (fn, ms) => { fila.push({ fn, em: agora + ms }); return fila.length - 1; }, cancelar: (h) => { if (fila[h]) fila[h] = null; }, agora: () => agora };
const avancar = (ms) => { agora += ms; for (let i = 0; i < fila.length; i++) { const f = fila[i]; if (f && f.em <= agora) { fila[i] = null; f.fn(); } } };

const s = new Sala('TEST', Object.assign({ seed: 5 }, relogio));
const recebido = {};
const mk = (nome) => { const r = s.entrar(nome, (ev, d) => { (recebido[nome] = recebido[nome] || []).push([ev, d]); }); ok(r.jogador, 'entrar ' + nome); return r.jogador; };
const A = mk('Ana'), B = mk('Beto'), C = mk('Cadu');
ok(s.entrar('ana', () => {}).erro, 'nome duplicado deve falhar');
ok(s.entrar('<b>', () => {}).erro, 'nome com símbolos deve falhar');
ok(A.host && !B.host, 'primeiro é host');
ok(s.configurar(B.id, { pa: 50 }).erro, 'não-host não configura');
ok(s.configurar(A.id, { pa: 50, periodo: 60 }).ok && s.cfg.pa === 50, 'host configura');
ok(s.iniciar(B.id).erro, 'não-host não inicia');
ok(s.iniciar(A.id).ok && s.fase === 'criacao', 'inicia criação');
ok(s.estadoPara(A.id).criacao.mapa.length === 49, 'mapa na criação');
ok(!s.criarPronto(A.id).erro, 'pronto A');
ok(s.estadoPara(A.id).criacao.atributos, 'rolou automaticamente ao ficar pronto');
s.criarAtualizar(B.id, { classe: 'medico', descricao: 'forte e esperto', inicio: 12 });
ok(!s.criarRolar(B.id).erro, 'primeiro sorteio grátis');
for (let i = 0; i < 3; i++) ok(!s.criarRolar(B.id).erro, 're-rolagem ' + (i + 1));
ok(s.criarRolar(B.id).erro, 'acabou re-rolagens');
s.criarPronto(B.id);
ok(s.fase === 'criacao', 'ainda esperando C');
avancar(s.cfg.tempoCriacao * 1000 + 10);
ok(s.fase === 'jogo', 'tempo acabou → jogo');
const v = s.estadoPara(B.id).jogo;
ok(v.voce.classe === 'medico' && v.regiao.id === 12, 'classe e início respeitados');
ok(v.voce.pa === 50, 'PA configurado');
ok(s.estadoPara(A.id).jogo.catalogo.mover, 'catálogo enviado');

// planejamento
ok(!s.definirFila(A.id, [{ tipo: 'vasculhar' }, { tipo: 'beber', item: 'agua_garrafa' }, { tipo: 'dormir', turnos: 2 }], 'evitar').erro, 'fila A');
ok(s.estadoPara(A.id).jogo.fila.length === 3, 'fila salva');
ok(s.estadoPara(A.id).jogo.previa.length === 3, 'prévia calculada');
s.pronto(A.id, true); s.pronto(B.id, true);
ok(s.jogo.rodada === 0, 'ainda não resolveu');
s.pronto(C.id, true);
ok(s.jogo.rodada === 1, 'todos prontos → resolve antecipado');
ok(s.estadoPara(A.id).jogo.historico.length === 1, 'histórico guardado');
console.log('  diário de Ana:', s.estadoPara(A.id).jogo.historico[0].entradas.slice(0, 4).map(e => e.texto).join(' | '));

// chat
ok(!s.chat(A.id, 'oi').erro, 'chat ok');
// rodadas por tempo até o fim
let guarda = 0;
while (s.fase === 'jogo' && guarda++ < 80) avancar(s.cfg.periodo * 1000 + 5);
ok(s.fase === 'fim', 'partida termina sozinha (todos AFK morrem de fome/sede/névoa) — rodadas: ' + s.jogo.rodada);
const fim = s.estadoPara(C.id).jogo;
ok(fim.resultado && fim.resumoFinal.length === 3, 'resultado final');
console.log('  resultado:', fim.resultado.texto, '| rodadas:', s.jogo.rodada);
ok(s.reiniciar(A.id).ok && s.fase === 'lobby', 'reiniciar volta ao lobby');
// desconexão e reconexão
s.desconectar(B.id);
const rr = s.reconectar(B.token, () => {});
ok(rr.jogador, 'reconecta por token');
console.log(erros ? `${erros} ERRO(S)` : 'Sala OK, sem erros.');
process.exit(erros ? 1 : 0);
