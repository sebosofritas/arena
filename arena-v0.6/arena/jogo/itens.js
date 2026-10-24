'use strict';
// Acesso aos itens, incluindo versões derivadas (cozidas).
const { ITENS, diasAteEstragar } = require('../data/itens');

// Itens que só existem por fabricação
const EXTRAS = {
  lanca_improvisada: { id: 'lanca_improvisada', nome: 'Lança improvisada', tags: ['arma_branca'], peso: 1.2, dano: [8, 15], ruido: 1, atributo: 'FOR' },
  faca_improvisada: { id: 'faca_improvisada', nome: 'Faca improvisada', tags: ['arma_branca'], peso: 0.2, dano: [5, 11], ruido: 1, atributo: 'AGI' },
  arco_improvisado: { id: 'arco_improvisado', nome: 'Arco improvisado', tags: ['arma_distancia', 'caca'], peso: 1, dano: [6, 14], ruido: 1, municao: 'flecha_improvisada', alcance: 'distancia', atributo: 'AGI' },
  flecha_improvisada: { id: 'flecha_improvisada', nome: 'Flecha improvisada', tags: ['municao'], peso: 0.05 },
  armadilha_laco: { id: 'armadilha_laco', nome: 'Armadilha de laço', tags: ['armadilha'], peso: 0.4 },
  mochila_improvisada: { id: 'mochila_improvisada', nome: 'Mochila improvisada', tags: ['mochila'], peso: 0.8, cap: 10 },
};
// ing = ingredientes consumidos, ferr = precisa ter item com a tag (não é gasto)
const RECEITAS = {
  bandagem_improvisada: { nome: 'Bandagens de pano', ing: { pano: 1 }, res: { bandagem: 2 }, custo: 1, ferr: [] },
  lanca: { nome: 'Lança improvisada', ing: { galho: 2 }, res: { lanca_improvisada: 1 }, custo: 2, ferr: ['arma_branca'] },
  faca_improv: { nome: 'Faca improvisada', ing: { cacos_vidro: 2, pano: 1 }, res: { faca_improvisada: 1 }, custo: 2, ferr: [] },
  arco: { nome: 'Arco improvisado', ing: { galho: 2, corda: 1 }, res: { arco_improvisado: 1 }, custo: 3, ferr: ['arma_branca'] },
  flechas: { nome: '4 flechas improvisadas', ing: { galho: 2, pedra: 1 }, res: { flecha_improvisada: 4 }, custo: 2, ferr: ['arma_branca'] },
  laco: { nome: 'Armadilha de laço', ing: { corda: 1, galho: 1 }, res: { armadilha_laco: 1 }, custo: 2, ferr: [] },
  mochila: { nome: 'Mochila improvisada', ing: { lencol: 1, corda: 1 }, res: { mochila_improvisada: 1 }, custo: 3, ferr: [] },
};
function infoItem(id) {
  if (ITENS[id]) return ITENS[id];
  if (EXTRAS[id]) return EXTRAS[id];
  if (id.endsWith('_cozido')) {
    const base = ITENS[id.slice(0, -7)];
    if (base && base.cozinhar) {
      return Object.assign({}, base, {
        id, nome: base.nome + ' (cozido)', uso: Object.assign({}, base.uso, base.cozinhar),
        risco: 0, req: undefined, cozinhar: undefined, tags: base.tags.concat('cozido'),
      });
    }
  }
  if (id.endsWith('_estragado')) {
    const base = ITENS[id.slice(0, -10)];
    if (base && base.estraga) {
      const f = Math.max(1, Math.floor(((base.uso && base.uso.fome) || 2) / 2));
      return Object.assign({}, base, { id, nome: base.nome + ' (estragado)', uso: { fome: f }, risco: 0.65, estraga: undefined, cozinhar: undefined, req: undefined, tags: ['comida', 'estragado'] });
    }
  }
  return null;
}
const nomeItem = (id) => (infoItem(id) || { nome: id }).nome;
const pesoItem = (id) => (infoItem(id) || { peso: 0 }).peso;
const ehArma = (it) => !!(it && it.dano && (it.tags.includes('arma_branca') || it.tags.includes('arma_fogo') || it.tags.includes('arma_distancia')));
module.exports = { RECEITAS, infoItem, nomeItem, pesoItem, ehArma, diasAteEstragar };
