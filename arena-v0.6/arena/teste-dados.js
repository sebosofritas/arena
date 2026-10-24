'use strict';
// Confere se o catálogo está coerente e simula buscas para ver as chances.
// Uso:  node teste-dados.js
const { ITENS } = require('./data/itens');
const { LOCAIS } = require('./data/locais');
const { criarRng, itensPorTag, rolarComodo } = require('./data/sorteio');

let erros = 0;
const falhar = (msg) => { erros++; console.log('  ERRO: ' + msg); };

// ---------- 1) Validação ----------
console.log('== Validação ==');
const itens = Object.values(ITENS);
console.log(`Itens: ${itens.length} | Locais: ${Object.keys(LOCAIS).length}`);

for (const it of itens) {
  if (!it.nome) falhar(`${it.id}: sem nome`);
  if (!(it.raridade > 0)) falhar(`${it.id}: raridade inválida`);
  if (!(it.peso >= 0)) falhar(`${it.id}: peso inválido`);
  if (!it.tags.length) falhar(`${it.id}: sem tags`);
  if (it.tags.includes('arma_branca') || it.tags.includes('arma_fogo') || it.tags.includes('arma_distancia')) {
    if (!it.dano) falhar(`${it.id}: arma sem dano`);
  }
  if (it.slot && typeof it.prot !== 'number') falhar(`${it.id}: roupa sem proteção`);
  if (it.municao && !ITENS[it.municao] && it.municao !== 'pedra') falhar(`${it.id}: munição inexistente (${it.municao})`);
}

const tagsUsadas = new Set();
let comodos = 0;
for (const loc of Object.values(LOCAIS)) {
  for (const c of loc.comodos) {
    comodos++;
    if (!(c.rolagens[0] >= 0 && c.rolagens[1] >= c.rolagens[0])) falhar(`${loc.id}/${c.nome}: rolagens inválidas`);
    for (const [tag, peso] of Object.entries(c.tabela)) {
      if (!(peso > 0)) falhar(`${loc.id}/${c.nome}: peso inválido em ${tag}`);
      if (tag === 'vazio') continue;
      tagsUsadas.add(tag);
      if (!itensPorTag[tag]) falhar(`${loc.id}/${c.nome}: tag sem itens "${tag}"`);
    }
  }
}
console.log(`Cômodos: ${comodos}`);

const inalcancaveis = itens.filter(it => !it.tags.some(t => tagsUsadas.has(t)));
console.log('Itens que nenhum local sorteia (só por receita/evento):',
  inalcancaveis.length ? inalcancaveis.map(i => i.id).join(', ') : 'nenhum');

// ---------- 2) Simulação ----------
console.log('\n== Simulação: 20.000 buscas por local (cômodo sorteado pelo peso) ==');
const rng = criarRng(12345);
const N = 20000;
const linhas = [];
const contagemItem = {};

for (const loc of Object.values(LOCAIS)) {
  const pesoTotal = loc.comodos.reduce((s, c) => s + c.peso, 0);
  let vazias = 0, total = 0, comArmaFogo = 0, comMedicina = 0, comComida = 0;
  for (let i = 0; i < N; i++) {
    // escolher cômodo
    let r = rng() * pesoTotal, comodo = loc.comodos[loc.comodos.length - 1];
    for (const c of loc.comodos) { r -= c.peso; if (r < 0) { comodo = c; break; } }
    const achados = rolarComodo(comodo, { rng });
    const ids = Object.keys(achados);
    if (!ids.length) vazias++;
    total += ids.length;
    if (ids.some(id => ITENS[id].tags.includes('arma_fogo'))) comArmaFogo++;
    if (ids.some(id => ITENS[id].tags.includes('medicina'))) comMedicina++;
    if (ids.some(id => ITENS[id].tags.includes('comida') || ITENS[id].tags.includes('bebida'))) comComida++;
    for (const id of ids) contagemItem[id] = (contagemItem[id] || 0) + 1;
  }
  linhas.push({
    local: loc.nome,
    'busca vazia': (100 * vazias / N).toFixed(0) + '%',
    'itens/busca': (total / N).toFixed(2),
    'comida/bebida': (100 * comComida / N).toFixed(0) + '%',
    'medicina': (100 * comMedicina / N).toFixed(0) + '%',
    'arma de fogo': (100 * comArmaFogo / N).toFixed(1) + '%',
  });
}
console.table(linhas);

const raros = Object.entries(contagemItem).sort((a, b) => a[1] - b[1]).slice(0, 8);
console.log('Itens mais raros no sorteio (aparições em todas as simulações):');
for (const [id, n] of raros) console.log(`  ${id}: ${n}`);

console.log(erros ? `\n${erros} ERRO(S).` : '\nTudo certo, sem erros.');
process.exit(erros ? 1 : 0);
