'use strict';
const { LOCAIS } = require('../data/locais');
const { REGRAS } = require('./config');

// Cada tema de região lista: locais certos [id, min, max] e possíveis [id, chance]
const TEMAS = {
  centro:     { nome: 'Centro da cidade', icone: '🏙️', fixos: [['apartamento', 1, 2], ['mercado', 1, 1], ['farmacia', 1, 1], ['restaurante', 1, 1]], talvez: [['hospital', .5], ['delegacia', .5], ['escritorios', .8], ['loja_roupas', .6], ['loja_eletronicos', .5], ['loja_esportes', .4], ['posto_gasolina', .5], ['onibus', .6], ['carro', .8], ['biblioteca', .4]] },
  bairro:     { nome: 'Bairro residencial', icone: '🏘️', fixos: [['casa', 2, 4]], talvez: [['padaria', .5], ['escola', .4], ['igreja', .4], ['carro', .9], ['mercado', .3], ['loja_ferragens', .3]] },
  industrial: { nome: 'Zona industrial', icone: '🏭', fixos: [['fabrica', 1, 1], ['armazem', 1, 1]], talvez: [['oficina', .7], ['bombeiros', .4], ['caminhao', .8], ['posto_gasolina', .4], ['carro', .5]] },
  rural:      { nome: 'Área rural', icone: '🌾', fixos: [['fazenda', 1, 1], ['casa', 1, 2]], talvez: [['plantacao', .9], ['carro', .6], ['igreja', .3], ['caminhao', .4]] },
  mata:       { nome: 'Mata fechada', icone: '🌲', fixos: [['mata', 1, 1]], talvez: [['acampamento', .6], ['ruinas', .4], ['lago', .3], ['carro', .2]] },
  montanha:   { nome: 'Montanha', icone: '⛰️', fixos: [['montanha', 1, 1]], talvez: [['acampamento', .5], ['ruinas', .4], ['mata', .4]] },
  lago:       { nome: 'Lago e margens', icone: '🏞️', fixos: [['lago', 1, 1]], talvez: [['acampamento', .6], ['casa', .6], ['mata', .5]] },
  pantano:    { nome: 'Pântano', icone: '🐊', fixos: [['pantano', 1, 1]], talvez: [['ruinas', .4], ['mata', .4]] },
  militar:    { nome: 'Base militar', icone: '🎖️', fixos: [['quartel', 1, 1]], talvez: [['armazem', .5], ['carro', .6], ['caminhao', .5]] },
  comercio:   { nome: 'Zona comercial', icone: '🛍️', fixos: [['loja_roupas', 1, 1], ['loja_eletronicos', 1, 1]], talvez: [['loja_esportes', .7], ['loja_ferragens', .6], ['mercado', .6], ['restaurante', .7], ['farmacia', .5], ['escritorios', .5], ['carro', .8], ['onibus', .4]] },
  hospitalar: { nome: 'Complexo hospitalar', icone: '🏥', fixos: [['hospital', 1, 1], ['farmacia', 1, 1]], talvez: [['apartamento', .6], ['restaurante', .5], ['carro', .8], ['onibus', .4], ['bombeiros', .4]] },
  campus:     { nome: 'Campus e praça', icone: '🎓', fixos: [['escola', 1, 1], ['biblioteca', 1, 1]], talvez: [['igreja', .7], ['padaria', .5], ['casa', .6], ['restaurante', .4], ['onibus', .5]] },
  rodovia:    { nome: 'Rodovia', icone: '🛣️', fixos: [['posto_gasolina', 1, 1], ['carro', 1, 3]], talvez: [['caminhao', .8], ['onibus', .6], ['oficina', .6], ['restaurante', .4], ['armazem', .3]] },
  ruinas:     { nome: 'Ruínas antigas', icone: '🏚️', fixos: [['ruinas', 1, 2]], talvez: [['mata', .6], ['acampamento', .3], ['igreja', .3]] },
  praia:      { nome: 'Litoral', icone: '🏖️', fixos: [['casa', 1, 2]], talvez: [['restaurante', .6], ['acampamento', .5], ['carro', .5], ['loja_esportes', .3], ['mata', .2]] },
};

// Quantas regiões de cada tipo num mapa 7x7 (49). Outros tamanhos escalam pelos mesmos pesos.
const PESOS = { centro: 3, comercio: 2, hospitalar: 1, campus: 2, bairro: 8, industrial: 3, rodovia: 3, rural: 6, mata: 7, montanha: 4, lago: 2, pantano: 2, ruinas: 2, militar: 1, praia: 3 };
// onde cada tipo prefere ficar: 'meio' (perto do centro), 'borda' (litoral) ou livre
const LUGAR = { centro: 'meio', comercio: 'meio', hospitalar: 'meio', praia: 'borda', montanha: 'fora' };

function embaralhar(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const entre = (min, max, rng) => min + Math.floor(rng() * (max - min + 1));

function distribuirTemas(N, rng) {
  const total = N * N, soma = Object.values(PESOS).reduce((x, y) => x + y, 0);
  const lista = [];
  for (const k in PESOS) for (let i = 0; i < Math.max(k === 'militar' || k === 'hospitalar' ? 1 : 0, Math.round(PESOS[k] * total / soma)); i++) lista.push(k);
  while (lista.length < total) lista.push('bairro');
  while (lista.length > total) lista.splice(lista.lastIndexOf('bairro') >= 0 ? lista.lastIndexOf('bairro') : lista.length - 1, 1);
  const c = (N - 1) / 2, cel = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cel.push({ i: y * N + x, d: Math.max(Math.abs(x - c), Math.abs(y - c)), borda: x === 0 || y === 0 || x === N - 1 || y === N - 1 });
  const temas = new Array(total).fill(null), livres = new Set(cel.map(q => q.i));
  const pegar = (filtro, ord) => { const cand = embaralhar(cel.filter(q => livres.has(q.i) && filtro(q)), rng); if (ord) cand.sort(ord); return cand[0]; };
  const ordem = embaralhar(lista, rng).sort((a, b) => (LUGAR[b] ? 1 : 0) - (LUGAR[a] ? 1 : 0));
  for (const t of ordem) {
    let q = null;
    if (LUGAR[t] === 'meio') q = pegar(() => true, (x, y) => x.d - y.d);
    else if (LUGAR[t] === 'borda') q = pegar(x => x.borda) || pegar(() => true);
    else if (LUGAR[t] === 'fora') q = pegar(x => x.d >= c - 1) || pegar(() => true);
    else q = pegar(() => true);
    temas[q.i] = t; livres.delete(q.i);
  }
  return temas;
}

function gerarMundo(rng, tamanho) {
  const N = tamanho || REGRAS.GRADE;
  const temas = distribuirTemas(N, rng);
  const regioes = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const id = y * N + x, tema = temas[id], T = TEMAS[tema];
    const locais = [];
    const add = (lid) => {
      if (!LOCAIS[lid]) throw new Error('Local inexistente no mundo: ' + lid);
      const tp = LOCAIS[lid].tipo, ch = tp === 'natural' ? 0 : (['hospital'].includes(lid) ? 0.1 : ['delegacia', 'quartel', 'armazem', 'fabrica', 'farmacia', 'apartamento'].includes(lid) ? 0.5 : tp === 'veiculo' ? 0.4 : 0.3);
      locais.push({ id: `${id}:${lid}:${locais.length}`, tipo: lid, nome: LOCAIS[lid].nome, icone: LOCAIS[lid].icone, vasculhados: {}, buscas: 0, trancado: rng() < ch, dono: null });
    };
    for (const [lid, mn, mx] of T.fixos) for (let i = 0, n = entre(mn, mx, rng); i < n; i++) add(lid);
    for (const [lid, ch] of T.talvez) if (rng() < ch) add(lid);
    regioes.push({ id, x, y, tema, nome: T.nome, icone: T.icone, locais, chao: {}, fogueiraAte: 0, neblina: false, armadilhas: [], abrigos: [] });
  }
  // saída secreta: longe do centro
  const c = (N - 1) / 2;
  const longe = regioes.filter(r => Math.abs(r.x - c) + Math.abs(r.y - c) >= c);
  const saida = longe[Math.floor(rng() * longe.length)].id;
  return { N, regioes, saida, estagioNeblina: 0, seed: Math.floor(rng() * 1e9) };
}

const distCentro = (m, r) => Math.abs(r.x - (m.N - 1) / 2) + Math.abs(r.y - (m.N - 1) / 2);
const vizinhas = (m, id) => {
  const r = m.regioes[id], N = m.N, out = {};
  if (r.y > 0) out.norte = id - N;
  if (r.y < N - 1) out.sul = id + N;
  if (r.x < N - 1) out.leste = id + 1;
  if (r.x > 0) out.oeste = id - 1;
  return out;
};
const distancia = (m, a, b) => Math.abs(m.regioes[a].x - m.regioes[b].x) + Math.abs(m.regioes[a].y - m.regioes[b].y);

// a névoa cobre primeiro as regiões mais distantes do centro. É sutil: nunca cobre tudo,
// sempre sobra metade do mapa limpa no meio (distância até 3 do centro).
const estagioMax = (m) => Math.max(1, (m.N - 1) - 3);
function aplicarNeblina(m, estagio) {
  m.estagioNeblina = estagio;
  const D = m.N - 1;
  for (const r of m.regioes) r.neblina = estagio > 0 && distCentro(m, r) >= D + 1 - estagio;
}
const estagioDaRodada = (rodada, cfg, m) => rodada < cfg.neblinaInicio ? 0 : Math.min(m ? estagioMax(m) : 5, 1 + Math.floor((rodada - cfg.neblinaInicio) / cfg.neblinaPasso));

module.exports = { TEMAS, gerarMundo, vizinhas, distancia, aplicarNeblina, estagioDaRodada, estagioMax, distCentro, embaralhar, entre };

// ---------- temperatura ----------
const TEMP_BASE = { centro: 24, bairro: 23, industrial: 24, rural: 22, mata: 20, montanha: 12, lago: 20, pantano: 25, militar: 23, comercio: 24, hospitalar: 23, campus: 23, rodovia: 25, ruinas: 20, praia: 26 };
const TEMP_PERIODO = [0, 5, -5, -9];
function temperatura(regiao, diaGlobal, turnoDoDia) {
  const deriva = -0.5 * diaGlobal + 3 * Math.sin(diaGlobal / 2.5);
  return Math.round((TEMP_BASE[regiao.tema] || 22) + TEMP_PERIODO[turnoDoDia % 4] + deriva - (regiao.neblina ? 3 : 0));
}
module.exports.temperatura = temperatura;
