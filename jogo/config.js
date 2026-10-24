'use strict';
// =====================================================================
//  CONFIGURAÇÃO DO JOGO
//  O anfitrião pode mudar estes valores na sala de espera.
//  "padrao" é o valor Recomendado.
// =====================================================================
const OPCOES = {
  periodo:       { nome: 'Tempo de cada rodada (segundos)', padrao: 210, min: 30, max: 900, passo: 10, dica: '210 s = 3:30. Cada rodada equivale a 3 dias no jogo.' },
  pa:            { nome: 'Pontos de ação por rodada', padrao: 40, min: 16, max: 100, passo: 2, dica: 'Quanto mais ações complexas, mais pontos gastam.' },
  pisoPA:        { nome: 'Mínimo de pontos mesmo ferido', padrao: 16, min: 4, max: 40, passo: 1, dica: 'Ninguém fica travado: ferido/faminto ainda tem este mínimo.' },
  rerolagens:    { nome: 'Re-rolagens de atributos', padrao: 3, min: 0, max: 10, passo: 1, dica: 'Quantas vezes dá para sortear os atributos de novo.' },
  tempoCriacao:  { nome: 'Tempo para criar personagem (s)', padrao: 180, min: 30, max: 600, passo: 10, dica: 'Se acabar, o jogo completa o que faltar sozinho.' },
  abundancia:    { nome: 'Abundância de itens', padrao: 0, min: -1, max: 1, passo: 1, dica: '-1 escasso, 0 normal (Recomendado), 1 farto.' },
  neblinaInicio: { nome: 'Névoa começa na rodada', padrao: 6, min: 2, max: 30, passo: 1, dica: 'A névoa avança devagar das bordas, mas nunca cobre o centro.' },
  neblinaPasso:  { nome: 'Névoa avança a cada (rodadas)', padrao: 4, min: 1, max: 10, passo: 1, dica: 'Menor = partida mais curta e tensa.' },
  aliancaMax:    { nome: 'Tamanho máximo de aliança', padrao: 4, min: 2, max: 12, passo: 1, dica: 'Alianças maiores deixam o jogo menos "cada um por si".' },
  tregua:        { nome: 'Duração da trégua (rodadas)', padrao: 2, min: 1, max: 10, passo: 1, dica: 'Quebrar uma trégua é traição e todos ficam sabendo.' },
  inicioLivre:   { nome: 'Escolher onde começar (1 = sim, 0 = sorteio)', padrao: 1, min: 0, max: 1, passo: 1, dica: 'Recomendado: cada um escolhe o ponto de partida.' },
  escape:        { nome: 'Existe uma saída secreta (1 = sim)', padrao: 1, min: 0, max: 1, passo: 1, dica: 'Ninguém é avisado. Quem achar, descobre.' },
};

function configPadrao() {
  const c = {};
  for (const k in OPCOES) c[k] = OPCOES[k].padrao;
  return c;
}

// Aceita só números válidos dentro dos limites; o resto é ignorado.
function limparConfig(entrada, base) {
  const c = Object.assign({}, base || configPadrao());
  if (!entrada || typeof entrada !== 'object') return c;
  for (const k in OPCOES) {
    if (!(k in entrada)) continue;
    let v = Number(entrada[k]);
    if (!Number.isFinite(v)) continue;
    v = Math.round(v);
    c[k] = Math.min(OPCOES[k].max, Math.max(OPCOES[k].min, v));
  }
  return c;
}

// Constantes de regra (não configuráveis)
const REGRAS = {
  TURNOS: 12,               // 3 dias x 4 períodos
  PERIODOS: ['manhã', 'tarde', 'noite', 'madrugada'],
  DIAS_POR_RODADA: 3,
  GRADE: 7,                 // mapa 7x7 = 49 regiões
  MAX_JOGADORES: 24,
  MIN_JOGADORES: 2,
  TAMANHO_NOME: 16,
  FOME_POR_TURNO: 25 / 4,   // 25 por dia
  SEDE_POR_TURNO: 34 / 4,   // 34 por dia
  ENERGIA_POR_TURNO: 6,
  ENERGIA_SONO: 14,
  FILA_MAX: 40,
};

module.exports = { OPCOES, REGRAS, configPadrao, limparConfig };
