'use strict';
// Simula partidas inteiras com "bots" para achar erros no motor.
// Uso: node teste-motor.js [numero_de_partidas]
const { Jogo } = require('./jogo/motor');
const { configPadrao } = require('./jogo/config');
const P = require('./jogo/personagem');
const { criarRng } = require('./data/sorteio');
const { infoItem } = require('./jogo/itens');
const { sanitizarFila } = require('./jogo/acoes');

function bot(jogo, p, rng) {
  const f = [], ids = [...jogo.jog.keys()];
  const alguem = () => { const o = jogo.vivos().filter(x => x.id !== p.id && x.regiao === p.regiao); return o.length ? o[Math.floor(rng() * o.length)].id : null; };
  const temUso = (campo) => Object.keys(p.inv).find(i => { const it = infoItem(i); return it && it.uso && it.uso[campo] > 0 && !it.risco && !(it.req); });
  const bebida = temUso('sede'), comida = temUso('fome');
  for (let n = 0; n < 12; n++) {
    const r = rng();
    if (p.sede < 70 && bebida && p.inv[bebida]) f.push({ tipo: 'beber', item: bebida });
    if (p.fome < 60 && comida && p.inv[comida]) f.push({ tipo: 'comer', item: comida });
    if (r < 0.35) f.push({ tipo: 'vasculhar' });
    else if (r < 0.5) f.push({ tipo: ['norte', 'sul', 'leste', 'oeste'][Math.floor(rng() * 4)] ? 'mover' : 'mover', dir: ['norte', 'sul', 'leste', 'oeste'][Math.floor(rng() * 4)] });
    else if (r < 0.58) f.push({ tipo: 'dormir', turnos: 2 });
    else if (r < 0.66) f.push({ tipo: 'observar' });
    else if (r < 0.72 && alguem()) f.push({ tipo: 'falar', alvo: alguem(), texto: 'oi' });
    else if (r < 0.78 && alguem()) f.push({ tipo: 'propor', alvo: alguem(), acordo: rng() < 0.5 ? 'tregua' : 'alianca' });
    else if (r < 0.84 && alguem()) f.push({ tipo: 'atacar', alvo: alguem() });
    else if (r < 0.88) f.push({ tipo: 'cozinhar', item: 'carne_crua' });
    else if (r < 0.92) f.push({ tipo: 'cacar' });
    else if (r < 0.95) f.push({ tipo: 'pescar' });
    else if (r < 0.97) f.push({ tipo: 'coletar_agua' });
    else if (r < 0.98) f.push([{ tipo: 'fabricar', receita: 'lanca' }, { tipo: 'recolher' }, { tipo: 'construir_abrigo' }, { tipo: 'barricar' }, { tipo: 'armar_armadilha', item: 'armadilha_urso' }, { tipo: 'arrombar', local: jogo.reg(p).locais.length ? jogo.reg(p).locais[0].id : 'x' }][Math.floor(rng() * 6)]);
    else f.push({ tipo: 'esconder' });
  }
  const s = sanitizarFila(f, ids);
  return s.fila;
}

// Bot mais esperto: bebe, come, dorme, procura comida e foge da névoa
function botEsperto(jogo, p, rng) {
  const f = [], ids = [...jogo.jog.keys()];
  const usa = (campo, lim, tipo) => {
    let n = 0;
    const lista = Object.keys(p.inv).map(id => [id, infoItem(id)]).filter(([id, it]) => it && it.uso && it.uso[campo] > 0 && (!it.req || jogo.tem(p, ['abridor_lata', 'faca_cozinha', 'faca_caca'])) && !it.tags.includes('alcool'))
      .sort((a, b) => (a[1].risco || 0) - (b[1].risco || 0));
    let nivel = p[campo];
    for (const [id, it] of lista) { for (let k = 0; k < p.inv[id] && nivel < lim && n < 4; k++) { f.push({ tipo, item: id }); nivel += it.uso[campo]; n++; } }
  };
  usa('sede', 75, 'beber'); usa('fome', 70, 'comer');
  for (const q of [0, 4, 8]) f.push({ tipo: 'coletar_agua', quando: q });
  for (const q of [1, 5, 9]) if (jogo.tem(p, ['cantil', 'agua_garrafa'])) f.push({ tipo: 'beber', item: P.temItem(p, 'agua_garrafa') ? 'agua_garrafa' : 'agua_rio', quando: q });
  const r = jogo.reg(p);
  if (r.neblina || (jogo.mundo.estagioNeblina && M.distCentro(jogo.mundo, r) >= 5 - jogo.mundo.estagioNeblina - 1)) {
    const cx = (jogo.mundo.N - 1) / 2;
    f.push({ tipo: 'mover', dir: p.regiao % jogo.mundo.N < cx ? 'leste' : p.regiao % jogo.mundo.N > cx ? 'oeste' : (Math.floor(p.regiao / jogo.mundo.N) < cx ? 'sul' : 'norte') });
  }
  for (let n = 0; n < 5; n++) f.push({ tipo: 'vasculhar' });
  if (r.locais.length && rng() < 0.5) f.push({ tipo: 'arrombar', local: r.locais[0].id });
  f.push({ tipo: 'vasculhar' });
  if (rng() < 0.5) f.push({ tipo: 'mover', dir: ['norte', 'sul', 'leste', 'oeste'][Math.floor(rng() * 4)] });
  f.push({ tipo: 'dormir', turnos: 2, quando: 3 }); f.push({ tipo: 'dormir', turnos: 2, quando: 10 });
  return sanitizarFila(f, ids).fila;
}
const M = require('./jogo/mundo');
const N = Number(process.argv[2]) || 20;
const ESPERTO = process.argv[3] === 'esperto';
const stats = { rodadas: [], causas: {}, vencedores: 0, escapes: 0, kills: 0, erros: 0, cheios: 0 };
const posturas = ['evitar', 'acolher', 'defender', 'atacar'];
for (let seed = 1; seed <= N; seed++) {
  const rng = criarRng(seed * 77);
  const cfg = configPadrao();
  const classes = Object.keys(P.CLASSES);
  const jogadores = [];
  const nj = 6 + (seed % 8);
  for (let i = 0; i < nj; i++) {
    const p = P.novoPersonagem('j' + (i + 1), 'Bot' + (i + 1), rng);
    p.classe = classes[i % classes.length]; p.atributos = P.rolarAtributos(p.classe, '', rng);
    p.inicio = Math.floor(rng() * 49);
    jogadores.push(p);
  }
  const jogo = new Jogo(jogadores, cfg, seed);
  let guarda = 0;
  try {
    while (!jogo.fim && guarda++ < 60) {
      for (const p of jogo.vivos()) {
        const f = ESPERTO ? botEsperto(jogo, p, rng) : bot(jogo, p, rng);
        p.fila = ESPERTO ? f : (p.fila || []).concat(f).slice(0, 40);
        p.postura = posturas[Math.floor(rng() * 4)];
        // aceita propostas
        for (const pr of jogo.propostas.filter(x => x.para === p.id && x.estado === 'pendente')) jogo.responder(p.id, pr.id, rng() < 0.6);
      }
      if (process.env.TRACE && seed===1) console.log('R'+jogo.rodada, jogo.vivos().map(p=>p.nome+':'+Math.round(p.energia)+'/'+Math.round(p.sede)+'/'+Math.round(p.fome)+'/'+Math.round(p.pv)).join(' '), (jogo.vivos()[0]||{}).sono);
      jogo.resolver();
    }
  } catch (e) { stats.erros++; console.log('ERRO na partida', seed, e.stack); continue; }
  stats.rodadas.push(jogo.rodada);
  for (const p of jogo.jog.values()) { if (!p.vivo) { const c = (p.causa || '?').replace(/\(.*\)|por .*/, '').trim(); stats.causas[c] = (stats.causas[c] || 0) + 1; } stats.kills += p.kills; if (p.escapou) stats.escapes++; }
  if (jogo.resultado) stats.vencedores++; else stats.cheios++;
  // consistência
  for (const p of jogo.jog.values()) {
    for (const k of ['pv', 'fome', 'sede', 'energia']) if (!Number.isFinite(p[k])) { stats.erros++; console.log('NaN em', p.nome, k); }
    for (const id in p.inv) if (!(p.inv[id] > 0) || !infoItem(id)) { stats.erros++; console.log('inventário ruim', id, p.inv[id]); }
    jogo.visao(p.id);
  }
}
const med = stats.rodadas.reduce((a, b) => a + b, 0) / stats.rodadas.length;
console.log(`Partidas: ${N} | rodadas (média/min/max): ${med.toFixed(1)}/${Math.min(...stats.rodadas)}/${Math.max(...stats.rodadas)}`);
console.log('Terminaram com resultado:', stats.vencedores, '| sem fim em 60 rodadas:', stats.cheios, '| mortes em combate (kills):', stats.kills);
console.log('Causas de morte:', stats.causas);
console.log(stats.erros ? `${stats.erros} ERRO(S)` : 'Sem erros.');
process.exit(stats.erros ? 1 : 0);
