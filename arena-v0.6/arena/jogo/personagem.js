'use strict';
const { infoItem, pesoItem } = require('./itens');
const ATRS = ['FOR', 'AGI', 'AST', 'CAR'];

const CLASSES = {
  comum:      { nome: 'Pessoa comum', desc: 'Sem treino especial. Atributos mais equilibrados.', b: { FOR: 0, AGI: 0, AST: 0, CAR: 0 }, kit: { agua_garrafa: 1, bandagem: 1 } },
  atleta:     { nome: 'Atleta', desc: 'Corpo preparado: mais força e agilidade.', b: { FOR: 1, AGI: 2, AST: -1, CAR: 0 }, kit: { tenis: 1, agua_garrafa: 2 } },
  soldado:    { nome: 'Ex-militar', desc: 'Resistente e treinado, mas pouco sociável.', b: { FOR: 2, AGI: 1, AST: 0, CAR: -1 }, kit: { faca_caca: 1, botas_militares: 1 } },
  medico:     { nome: 'Médico(a)', desc: 'Sabe tratar feridas. Inteligente e confiável.', b: { FOR: -1, AGI: 0, AST: 2, CAR: 1 }, kit: { bandagem: 3, analgesico: 1, antibiotico: 1 } },
  estudante:  { nome: 'Estudante', desc: 'Esperto e adaptável, fraco no braço.', b: { FOR: -1, AGI: 0, AST: 2, CAR: 1 }, kit: { mochila_escolar: 1, caneta: 1 } },
  cacador:    { nome: 'Caçador(a)', desc: 'Conhece a mata. Quase não fala com ninguém.', b: { FOR: 1, AGI: 1, AST: 1, CAR: -2 }, kit: { estilingue: 1, pedra: 4, faca_caca: 1 } },
  mecanico:   { nome: 'Mecânico(a)', desc: 'Mãos firmes, bom com ferramentas.', b: { FOR: 1, AGI: 0, AST: 1, CAR: -1 }, kit: { chave_inglesa: 1, alicate: 1 } },
  cozinheiro: { nome: 'Cozinheiro(a)', desc: 'Faz comida render. Bom de papo.', b: { FOR: 0, AGI: 0, AST: 1, CAR: 1 }, kit: { faca_cozinha: 1, fosforos: 1 } },
  lider:      { nome: 'Líder nato', desc: 'Convence e reúne gente. Físico comum.', b: { FOR: -1, AGI: 0, AST: 1, CAR: 2 }, kit: { agua_garrafa: 1, relogio_parado: 1 } },
};

const PALAVRAS = [
  [/forte|muscul|academia|pesad|luta|briga/i, 'FOR'], [/rápid|rapid|ágil|agil|corr|veloz/i, 'AGI'],
  [/inteligen|esperto|estud|nerd|lê |le muito|ciência|ciencia/i, 'AST'], [/carisma|simpátic|simpatic|líder|lider|charm|amig|popular/i, 'CAR'],
];

const TRACOS = [
  { id: 'metabolismo_lento', nome: 'Metabolismo lento', desc: 'Fome e sede caem 20% mais devagar.', fome: .8, sede: .8 },
  { id: 'estomago_fraco', nome: 'Estômago fraco', desc: 'Comida estragada e crua faz mais mal.', risco: 1.6 },
  { id: 'resistente', nome: 'Resistente', desc: '+12 de PV máximo.', pvMax: 12 },
  { id: 'fragil', nome: 'Frágil', desc: '-12 de PV máximo, mas sente tudo antes dos outros.', pvMax: -12, busca: 1 },
  { id: 'sortudo', nome: 'Sortudo', desc: 'Ao vasculhar, às vezes acha um item a mais.', sorte: .25 },
  { id: 'furtivo', nome: 'Furtivo', desc: 'Mais difícil de ser notado.', furtivo: 2 },
  { id: 'maos_firmes', nome: 'Mãos firmes', desc: 'Trata ferimentos melhor.', cuidado: 1 },
  { id: 'pavio_curto', nome: 'Pavio curto', desc: 'Bônus ao iniciar briga, mas é notado mais fácil.', furtivo: -1, iniciativa: 2 },
  { id: 'sono_leve', nome: 'Sono leve', desc: 'Menos vulnerável dormindo, dorme pior.', sono: .75, alerta: 1 },
  { id: 'olho_clinico', nome: 'Olho clínico', desc: 'Percebe mais coisas ao observar.', percepcao: 2 },
];

function d3(rng) { return 1 + Math.floor(rng() * 3); }
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

function rolarAtributos(classe, descricao, rng) {
  const C = CLASSES[classe] || CLASSES.comum, bonusDesc = {};
  for (const [re, a] of PALAVRAS) if (re.test(descricao || '')) bonusDesc[a] = 1;
  const at = {};
  for (const a of ATRS) at[a] = limitar(d3(rng) + d3(rng) + d3(rng) + C.b[a] + (bonusDesc[a] || 0), 1, 10);
  return at;
}
function sortearTracos(rng) {
  const pool = TRACOS.slice(), r = [];
  for (let i = 0; i < 2; i++) r.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
  return r;
}
const traco = (p, campo) => p.tracos.map(id => TRACOS.find(t => t.id === id)).reduce((s, t) => s + ((t && t[campo]) || 0), 0);
const multTraco = (p, campo) => p.tracos.map(id => TRACOS.find(t => t.id === id)).reduce((s, t) => s * ((t && t[campo]) || 1), 1);

function novoPersonagem(id, nome, rng) {
  const p = {
    id, nome, classe: 'comum', descricao: '', atributos: { FOR: 6, AGI: 6, AST: 6, CAR: 6 }, tracos: [],
    rerolagensUsadas: 0, inicio: null, pronto: false,
    vivo: true, escapou: false, causa: null, rodadaMorte: null,
    pv: 100, pvMax: 100, fome: 100, sede: 100, energia: 100, moral: 100, dor: 0,
    sangramento: 0, infeccao: 0, doenca: 0, ferida: { perna: 0, braco: 0, cabeca: 0 },
    regiao: 0, local: null, inv: {}, equip: {}, fragmentos: 0, escondido: false, dormindo: false,
    fila: [], posturas: 'defender', carregadas: [], prontoRodada: false,
    aliados: [], tregua: {}, mortes: 0, kills: 0, conhecidos: [],
  };
  p.atributos = rolarAtributos('comum', '', rng);
  p.tracos = sortearTracos(rng);
  return p;
}
function aplicarBase(p) { p.pvMax = 80 + p.atributos.FOR * 3 + 6 + traco(p, 'pvMax'); p.pv = p.pvMax; }

// ---------- inventário ----------
function capacidade(p) {
  let mochila = 0;
  for (const id in p.inv) { const it = infoItem(id); if (it && it.tags.includes('mochila') && p.inv[id] > 0) mochila = Math.max(mochila, it.cap || 0); }
  return 8 + p.atributos.FOR * 1.5 + mochila;
}
function pesoTotal(p) { let s = 0; for (const id in p.inv) s += pesoItem(id) * p.inv[id]; return Math.round(s * 100) / 100; }
function temItem(p, id, q) { return (p.inv[id] || 0) >= (q || 1); }
function temTag(p, tag) { return Object.keys(p.inv).some(id => p.inv[id] > 0 && (infoItem(id) || { tags: [] }).tags.includes(tag)); }
function idsComTag(p, tag) { return Object.keys(p.inv).filter(id => p.inv[id] > 0 && (infoItem(id) || { tags: [] }).tags.includes(tag)); }
function tirar(p, id, q) {
  q = q || 1;
  if (!temItem(p, id, q)) return false;
  p.inv[id] -= q;
  if (p.inv[id] <= 0) { delete p.inv[id]; for (const s in p.equip) if (p.equip[s] === id) delete p.equip[s]; }
  return true;
}
// Devolve quanto coube; o resto precisa ficar no chão
function pegar(p, id, q) {
  const w = pesoItem(id), livre = capacidade(p) - pesoTotal(p);
  const cabe = w <= 0 ? q : Math.max(0, Math.min(q, Math.floor((livre + 1e-9) / w)));
  if (cabe > 0) p.inv[id] = (p.inv[id] || 0) + cabe;
  return cabe;
}
function equipar(p, id) {
  const it = infoItem(id);
  if (!it || !temItem(p, id)) return false;
  if (it.slot) { p.equip[it.slot] = id; return true; }
  if (it.dano) { p.equip.maos = id; return true; }
  return false;
}
function protecao(p) { let s = 0; for (const sl in p.equip) { const it = infoItem(p.equip[sl]); if (it && it.prot) s += it.prot; } return s; }
function arma(p) { const id = p.equip.maos; return id && temItem(p, id) ? infoItem(id) : null; }

// ---------- condições e pontos de ação ----------
function penalidades(p) {
  const l = [];
  if (p.fome < 25) l.push(['Fome grave', 5]); else if (p.fome < 50) l.push(['Fome', 2]);
  if (p.sede < 25) l.push(['Sede grave', 6]); else if (p.sede < 50) l.push(['Sede', 3]);
  if (p.energia < 10) l.push(['Exaustão', 6]); else if (p.energia < 25) l.push(['Muito cansado', 4]); else if (p.energia < 50) l.push(['Cansado', 2]);
  if (p.dor >= 60) l.push(['Dor forte', 5]); else if (p.dor >= 30) l.push(['Dor', 2]);
  if (p.sangramento > 0) l.push(['Sangrando', 2 * p.sangramento]);
  if (p.infeccao > 0 || p.doenca > 0) l.push(['Doente', 3]);
  if (p.frio) l.push(['Com frio', 2]);
  if (p.calor) l.push(['Calor', 2]);
  if (p.moral < 25) l.push(['Desanimado', 2]);
  return l;
}
function calcPA(p, cfg) {
  const esc = cfg.pa / 40;
  const total = penalidades(p).reduce((s, x) => s + x[1], 0) * esc;
  return Math.max(Math.min(cfg.pisoPA, cfg.pa), Math.round((cfg.pa - total) * 2) / 2);
}
function estados(p) {
  const e = penalidades(p).map(x => x[0]);
  if (p.ferida.perna === 1) e.push('Perna machucada'); if (p.ferida.perna === 2) e.push('Perna quebrada');
  if (p.ferida.braco === 1) e.push('Braço machucado'); if (p.ferida.braco === 2) e.push('Braço quebrado');
  if (p.ferida.cabeca) e.push('Ferida na cabeça');
  return e;
}
// atributo efetivo (condições reduzem)
function atr(p, a) {
  let v = p.atributos[a];
  const fadiga = (p.fome < 25 ? 2 : p.fome < 50 ? 1 : 0) + (p.energia < 25 ? 2 : p.energia < 50 ? 1 : 0) + (p.dor >= 60 ? 1 : 0);
  if (a === 'FOR' || a === 'AGI') v -= fadiga;
  if (a === 'FOR' && p.ferida.braco) v -= p.ferida.braco;
  if (a === 'AGI' && p.ferida.perna) v -= p.ferida.perna;
  if (a === 'AST' && p.ferida.cabeca) v -= 2;
  if (a === 'AST') v -= (p.sede < 25 ? 1 : 0);
  return Math.max(1, v);
}

module.exports = { ATRS, CLASSES, TRACOS, rolarAtributos, sortearTracos, novoPersonagem, aplicarBase, capacidade, pesoTotal, temItem, temTag, idsComTag,
  tirar, pegar, equipar, protecao, arma, penalidades, calcPA, estados, atr, traco, multTraco };
