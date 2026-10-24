'use strict';
// Testa fabricação, armadilhas, arrombamento, abrigo, frio/calor e salvamento.
const { Jogo } = require('./jogo/motor');
const { Sala } = require('./jogo/sala');
const { configPadrao } = require('./jogo/config');
const P = require('./jogo/personagem');
const M = require('./jogo/mundo');
const { criarRng } = require('./data/sorteio');
const { sanitizarFila } = require('./jogo/acoes');
let erros = 0; const ok = (c, m) => { if (!c) { erros++; console.log('FALHOU:', m); } };

function novo(n) {
  const r = criarRng(11), ps = [];
  for (let i = 1; i <= n; i++) { const p = P.novoPersonagem('j' + i, 'P' + i, r); p.inicio = 12; ps.push(p); }
  const cfg = configPadrao(); cfg.inicioLivre = 1;
  return new Jogo(ps, cfg, 9);
}
const dar = (p, o) => { for (const k in o) p.inv[k] = (p.inv[k] || 0) + o[k]; };
const fila = (j, p, f) => { p.fila = sanitizarFila(f, [...j.jog.keys()]).fila; };
const texto = (p) => { const h = p.hist[p.hist.length - 1]; return h ? h.entradas.map(e => e.texto).join(' | ') : ''; };

// fabricar
let j = novo(2), a = j.jog.get('j1');
dar(a, { galho: 4, corda: 2, faca_cozinha: 1, pano: 2, lencol: 1 });
fila(j, a, [{ tipo: 'fabricar', receita: 'lanca' }, { tipo: 'fabricar', receita: 'bandagem_improvisada' }, { tipo: 'fabricar', receita: 'laco' }]);
j.resolver();
ok(a.inv.lanca_improvisada === 1 && a.inv.armadilha_laco === 1 && a.inv.bandagem >= 2, 'fabricação funcionou: ' + JSON.stringify(a.inv) + texto(a));
ok(P.equipar(a, 'lanca_improvisada') && P.arma(a).dano[1] === 15, 'lança equipável');

// armadilha: A arma, B pisa
j = novo(2); a = j.jog.get('j1'); let b = j.jog.get('j2');
a.regiao = b.regiao = 12; dar(a, { armadilha_urso: 1 });
fila(j, a, [{ tipo: 'armar_armadilha', item: 'armadilha_urso' }]);
j.resolver();
ok(j.mundo.regioes[12].armadilhas.length === 1 || b.hist.some(h => h.entradas.some(e => /armadilha/.test(e.texto))), 'armadilha armada (ou já disparou)');
let pegou = false;
for (let i = 0; i < 6 && !pegou; i++) { j.resolver(); if (b.hist.some(h => h.entradas.some(e => /CLAC/.test(e.texto))) || j.mundo.regioes[12].armadilhas.length === 0) pegou = true; }
ok(pegou, 'intruso eventualmente cai na armadilha');

// arrombar + barricar
j = novo(2); a = j.jog.get('j1'); b = j.jog.get('j2');
const reg = j.mundo.regioes[12]; reg.locais.push({ id: '12:casa:x', tipo: 'casa', nome: 'Casa teste', icone: '🏠', vasculhados: {}, buscas: 0, trancado: true, dono: null });
a.regiao = b.regiao = 12; dar(a, { pe_de_cabra: 1 });
fila(j, b, [{ tipo: 'vasculhar', local: '12:casa:x' }]);
fila(j, a, [{ tipo: 'arrombar', local: '12:casa:x' }, { tipo: 'arrombar', local: '12:casa:x' }, { tipo: 'arrombar', local: '12:casa:x' }, { tipo: 'arrombar', local: '12:casa:x' }, { tipo: 'arrombar', local: '12:casa:x' }, { tipo: 'arrombar', local: '12:casa:x' }]);
j.resolver();
ok(/trancado|Tudo aqui/.test(texto(b)) || !reg.locais.find(l => l.id === '12:casa:x').trancado, 'B não entra antes do arrombo (ou A abriu cedo)');
ok(!reg.locais.find(l => l.id === '12:casa:x').trancado, 'A arrombou: ' + texto(a));
dar(a, { tabua: 2 }); a.local = '12:casa:x';
fila(j, a, [{ tipo: 'barricar' }]); j.resolver();
ok(reg.locais.find(l => l.id === '12:casa:x').dono === 'j1', 'barricada: ' + texto(a));

// frio
j = novo(1); a = j.jog.get('j1');
const montanha = j.mundo.regioes.find(r => r.tema === 'montanha'); a.regiao = montanha.id;
j.rodada = 14; // dias avançados
fila(j, a, [{ tipo: 'esperar', turnos: 12 }]);
a.inv = {}; a.equip = {}; const pv0 = a.pv;
j.resolver();
ok(a.frio === 1 || M.temperatura(montanha, 40, 2) > 8, 'frio detectado na montanha tarde no jogo');
ok(a.pv < pv0, 'frio/sede causam dano');
// com abrigo e casaco o dano é menor
// salvar/carregar
const sala = new Sala('SAVE', { seed: 3 });
sala.entrar('Ana', () => {}); sala.entrar('Beto', () => {});
sala.iniciar('j1'); sala.criarPronto('j1'); sala.criarPronto('j2');
ok(sala.fase === 'jogo', 'sala em jogo');
sala.definirFila('j1', [{ tipo: 'vasculhar' }], 'evitar');
sala.pronto('j1', true); sala.pronto('j2', true);
const dump = JSON.parse(JSON.stringify(sala.exportar()));
const s2 = Sala.importar(dump, { agendar: () => 1, cancelar: () => {} });
ok(s2.fase === 'jogo' && s2.jogo.rodada === 1 && s2.jogadores.size === 2, 'sala restaurada');
const rec = s2.reconectar(sala.jogadores.get('j1').token, () => {});
ok(rec.jogador, 'reconecta com o mesmo token após restaurar');
const v = s2.estadoPara('j1').jogo;
ok(v.voce.nome === 'Ana' && v.mapa.seed === sala.jogo.mundo.seed, 'estado coerente após restaurar');
s2.pronto('j1', true); s2.pronto('j2', true);
ok(s2.jogo.rodada === 2, 'restaurada continua jogando (rodada ' + s2.jogo.rodada + ')');

// ---- v0.6: ações disponíveis, resumo do dia, 1 dia por rodada ----
{
  const { Jogo } = require('./jogo/motor');
  const { configPadrao } = require('./jogo/config');
  const P2 = require('./jogo/personagem');
  const { criarRng: cr } = require('./data/sorteio');
  const rng2 = cr(5);
  const ps = ['a', 'b'].map((n, i) => { const p = P2.novoPersonagem('j' + i, n, rng2); p.inicio = 20; return p; });
  const j = new Jogo(ps, configPadrao(), 9);
  const [a, b] = ps;
  const v0 = j.visao(a.id);
  ok(v0.disp && v0.disp.fogueira === false && v0.disp.pescar === false, 'sem equipamento: sem fogueira/pesca nas ações');
  ok(v0.receitas.filter(r => r.pode).length === 0, 'sem materiais: nenhuma receita possível');
  ok(!v0.presentes.some(o => o.tregua), 'ninguém começa em trégua com todo mundo');
  a.fome = 40; a.inv.macarrao_instantaneo = 1;
  a.fila = [{ tipo: 'comer', item: 'macarrao_instantaneo' }]; b.fila = [];
  j.resolver();
  ok(j.rodada === 1 && j.visao(a.id).diaInicio === 2, 'uma rodada = um dia');
  const res = a.hist[a.hist.length - 1].entradas.find(e => e.tipo === 'resumo');
  ok(res && /comeu \+/.test(res.texto), 'resumo do dia mostra o que comeu: ' + (res && res.texto));
  ok(a.hist[a.hist.length - 1].entradas.every(e => e.t >= 0 && e.t <= 2), 'só 3 períodos');
}
console.log(erros ? erros + ' ERRO(S)' : 'Extras OK');
process.exit(erros ? 1 : 0);
