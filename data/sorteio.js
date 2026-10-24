'use strict';
// =====================================================================
//  SORTEIO DE LOOT
//  Recebe um local (ou cômodo) e devolve o que a pessoa encontrou.
// =====================================================================
const { ITENS } = require('./itens');
const { LOCAIS } = require('./locais');

// Gerador de números aleatórios com "semente" (permite repetir testes iguais)
function criarRng(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Índice: tag -> lista de itens
const itensPorTag = {};
for (const item of Object.values(ITENS)) {
  for (const tag of item.tags) (itensPorTag[tag] = itensPorTag[tag] || []).push(item);
}

function sortearPonderado(pares, rng) {
  let total = 0;
  for (const par of pares) total += par[1];
  let r = rng() * total;
  for (const par of pares) {
    r -= par[1];
    if (r < 0) return par[0];
  }
  return pares[pares.length - 1][0];
}

function inteiroEntre(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

function escolherComodo(local, rng) {
  return sortearPonderado(local.comodos.map(c => [c, c.peso]), rng);
}

// Rola um cômodo. Devolve { id_do_item: quantidade }
// opcoes.bonusRolagens: ex. +1 para quem tem muita astúcia, -1 para quem está exausto
function rolarComodo(comodo, opcoes) {
  opcoes = opcoes || {};
  const rng = opcoes.rng || Math.random;
  const n = Math.max(0, inteiroEntre(comodo.rolagens[0], comodo.rolagens[1], rng) + (opcoes.bonusRolagens || 0));
  const achados = {};
  const pares = Object.entries(comodo.tabela);
  for (let i = 0; i < n; i++) {
    const tag = sortearPonderado(pares, rng);
    if (tag === 'vazio') continue;
    const candidatos = itensPorTag[tag];
    if (!candidatos) throw new Error('Tag sem itens: ' + tag);
    const item = sortearPonderado(candidatos.map(it => [it, it.raridade]), rng);
    const q = inteiroEntre(item.qtd[0], item.qtd[1], rng);
    achados[item.id] = (achados[item.id] || 0) + q;
  }
  return achados;
}

// Vasculhar um local inteiro: escolhe o cômodo (ou usa o pedido) e rola
function vasculhar(localId, opcoes) {
  opcoes = opcoes || {};
  const rng = opcoes.rng || Math.random;
  const local = LOCAIS[localId];
  if (!local) throw new Error('Local inexistente: ' + localId);
  let comodo;
  if (opcoes.comodo) {
    comodo = local.comodos.find(c => c.nome === opcoes.comodo);
    if (!comodo) throw new Error('Cômodo inexistente: ' + opcoes.comodo);
  } else {
    comodo = escolherComodo(local, rng);
  }
  return { local: local.nome, comodo: comodo.nome, achados: rolarComodo(comodo, opcoes) };
}

module.exports = { criarRng, itensPorTag, escolherComodo, rolarComodo, vasculhar, sortearPonderado };
