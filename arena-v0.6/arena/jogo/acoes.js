'use strict';
const { REGRAS } = require('./config');
const { infoItem, RECEITAS } = require('./itens');

// custo em PA (base 40). divisivel = pode terminar na rodada seguinte.
// p = parâmetros esperados: alvo (jogador), item, local, dir, qtd, texto, turnos, tipo
const ACOES = {
  mover:           { nome: 'Ir para outra região', custo: 0.5, grupo: 'Movimento', p: ['dir'], desc: 'Anda para a região vizinha (norte, sul, leste ou oeste).' },
  ir:              { nome: 'Ir a um local da região', custo: 0.25, grupo: 'Movimento', p: ['local'], desc: 'Entra num local (casa, mercado...) da região onde está.' },
  observar:        { nome: 'Observar o entorno', custo: 0.25, grupo: 'Exploração', p: [], desc: 'Olha ao redor: quem está por perto, sinais, o que sobrou no chão.' },
  vasculhar:       { nome: 'Vasculhar um cômodo', custo: 1, grupo: 'Exploração', p: ['local?'], desc: 'Procura itens. Em locais naturais, colhe o que a natureza dá.' },
  vasculhar_fundo: { nome: 'Vasculhar a fundo', custo: 2, grupo: 'Exploração', p: ['local?'], divisivel: true, desc: 'Busca caprichada: mais rolagens de sorteio.' },
  esconder:        { nome: 'Esconder-se', custo: 0.5, grupo: 'Exploração', p: [], desc: 'Fica difícil de ser visto até agir de novo.' },
  rastrear:        { nome: 'Rastrear alguém', custo: 3, grupo: 'Exploração', p: ['alvo'], desc: 'Tenta descobrir a região de alguém por perto (até 2 regiões).' },
  pescar:          { nome: 'Pescar', custo: 2, grupo: 'Sobrevivência', p: [], desc: 'Precisa de equipamento de pesca e um lago (ou o mar, no litoral) na região.' },
  cacar:           { nome: 'Caçar', custo: 4, grupo: 'Sobrevivência', p: [], desc: 'Precisa de arma à distância com munição (ou estilingue com pedras).' },
  coletar_agua:    { nome: 'Pegar água (torneira/lago)', custo: 1, grupo: 'Sobrevivência', p: [], desc: 'Em prédios com água encanada, bebe e enche garrafas (a água acaba depois de alguns dias). No lago a água é suja: purifique.' },
  purificar:       { nome: 'Purificar água', custo: 1, grupo: 'Sobrevivência', p: [], desc: 'Ferve (com fogo) ou usa pastilha para tornar água suja potável.' },
  fogueira:        { nome: 'Acender fogueira', custo: 2, grupo: 'Sobrevivência', p: [], divisivel: true, desc: 'Precisa de isqueiro/fósforos e 2 lenhas. Dura cerca de 2 dias.' },
  cozinhar:        { nome: 'Cozinhar', custo: 1.5, grupo: 'Sobrevivência', p: ['item'], divisivel: true, desc: 'Precisa de fogo (fogueira, cozinha com luz, ou isqueiro e lenha).' },
  fabricar:        { nome: 'Fabricar item', custo: 2, grupo: 'Fabricação', p: ['receita'], divisivel: true, desc: 'Transforma materiais em armas, bandagens, armadilhas... O custo varia com a receita.' },
  armar_armadilha: { nome: 'Armar armadilha', custo: 4, grupo: 'Fabricação', p: ['item'], desc: 'Arma uma armadilha na região: caça animais e fere intrusos. Recolha a presa depois.' },
  recolher:        { nome: 'Recolher presas', custo: 0.5, grupo: 'Fabricação', p: [], desc: 'Pega o que caiu nas suas armadilhas desta região.' },
  construir_abrigo:{ nome: 'Construir abrigo', custo: 6, grupo: 'Fabricação', p: [], divisivel: true, desc: 'Precisa de lona, ou 4 galhos e um pano/lençol/cobertor. Protege do frio e da chuva.' },
  barricar:        { nome: 'Barricar o local', custo: 3, grupo: 'Fabricação', p: [], desc: 'Precisa de 2 tábuas (ou cadeado). Ninguém entra sem arrombar; você fica muito mais difícil de achar.' },
  arrombar:        { nome: 'Arrombar porta', custo: 2, grupo: 'Exploração', p: ['local'], desc: 'Abre local trancado. Pé de cabra, kit de arrombamento ou chave-mestra ajudam. Faz barulho.' },
  comer:           { nome: 'Comer', custo: 0.5, grupo: 'Itens', p: ['item'], desc: 'Nada é automático: se não comer, passa fome (cerca de 25 por dia).' },
  beber:           { nome: 'Beber', custo: 0.5, grupo: 'Itens', p: ['item'], desc: 'A sede cai cerca de 34 por dia: planeje beber.' },
  usar:            { nome: 'Usar item (remédio...)', custo: 1, grupo: 'Itens', p: ['item'], desc: 'Bandagem, analgésico, antibiótico, tala...' },
  equipar:         { nome: 'Equipar', custo: 0.25, grupo: 'Itens', p: ['item'], desc: 'Veste roupa/proteção ou empunha uma arma/ferramenta.' },
  largar:          { nome: 'Largar no chão', custo: 0.25, grupo: 'Itens', p: ['item', 'qtd?'], desc: 'Deixa um item na região (para aliviar peso ou guardar).' },
  pegar_chao:      { nome: 'Pegar do chão', custo: 0.25, grupo: 'Itens', p: ['item', 'qtd?'], desc: 'Recolhe algo que está no chão da região.' },
  tratar:          { nome: 'Tratar ferimentos', custo: 5, grupo: 'Itens', p: [], divisivel: true, desc: 'Precisa de kit médico/primeiros socorros ou bandagens. Cura ossos, sangue e infecção.' },
  descansar:       { nome: 'Descansar', custo: 6, grupo: 'Descanso', p: [], desc: 'Recupera energia e um pouco de vida (acordado).' },
  dormir:          { nome: 'Dormir', custo: 0, grupo: 'Descanso', p: ['turnos'], desc: 'Não gasta PA, mas ocupa tempo. Muito vulnerável. Recupera bem a energia.' },
  esperar:         { nome: 'Esperar', custo: 0, grupo: 'Descanso', p: ['turnos'], desc: 'Aguarda alguns períodos sem gastar PA (útil para combinar horários).' },
  falar:           { nome: 'Falar com alguém', custo: 0.5, grupo: 'Social', p: ['alvo', 'texto'], desc: 'Diz algo a alguém que esteja na mesma região.' },
  dar:             { nome: 'Dar item', custo: 0.5, grupo: 'Social', p: ['alvo', 'item', 'qtd?'], desc: 'Entrega item a alguém na mesma região.' },
  furtar:          { nome: 'Furtar', custo: 3, grupo: 'Social', p: ['alvo'], desc: 'Tenta pegar algo sem ser notado. Se falhar, ele percebe.' },
  propor:          { nome: 'Propor trégua/aliança', custo: 5, grupo: 'Social', p: ['alvo', 'acordo'], divisivel: true, desc: 'Trégua custa 5, aliança custa 6 (calculado sozinho). A pessoa responde na rodada seguinte.' },
  romper:          { nome: 'Romper trégua/aliança', custo: 0.5, grupo: 'Social', p: ['alvo'], desc: 'Termina o acordo sem violência.' },
  atacar:          { nome: 'Atacar', custo: 5, grupo: 'Combate', p: ['alvo'], desc: 'Ataca alguém da mesma região. Atacar aliado/trégua é traição e todos ficam sabendo.' },
  emboscar:        { nome: 'Emboscar', custo: 7, grupo: 'Combate', p: ['alvo'], desc: 'Precisa estar escondido. Ataque surpresa com grande bônus.' },
  escapar:         { nome: '???', custo: 12, grupo: 'Segredo', p: [], divisivel: true, oculta: true, desc: 'Só existe para quem descobriu o caminho.' },
};
const DIRS = ['norte', 'sul', 'leste', 'oeste'];
const POSTURAS = { evitar: 'Evitar encontros', acolher: 'Receber bem', defender: 'Só me defender', atacar: 'Atacar quem eu encontrar' };

function custoReceita(a) { const r = RECEITAS[a.receita]; return r ? r.custo : 2; }
function multCusto(p, tipo) {
  let m = 1;
  if (tipo === 'mover') m *= p.ferida.perna === 2 ? 4 : p.ferida.perna === 1 ? 2 : 1;
  if (['atacar', 'emboscar', 'tratar'].includes(tipo) && p.ferida.braco) m *= 1.5;
  return m;
}
function custoBase(a) { return a.tipo === 'propor' && a.tipoAcordo === 'alianca' ? 6 : a.tipo === 'fabricar' ? custoReceita(a) : ACOES[a.tipo].custo; }

// Verifica e limpa a fila enviada pelo jogador
function sanitizarFila(fila, jogadoresIds) {
  const out = [], erros = [];
  if (!Array.isArray(fila)) return { fila: [], erros: ['Fila inválida.'] };
  for (const bruto of fila.slice(0, REGRAS.FILA_MAX)) {
    if (!bruto || typeof bruto !== 'object' || !ACOES[bruto.tipo]) { erros.push('Ação desconhecida ignorada.'); continue; }
    const def = ACOES[bruto.tipo], a = { tipo: bruto.tipo };
    const txt = (v, n) => String(v == null ? '' : v).slice(0, n);
    for (const par of def.p) {
      const opt = par.endsWith('?'), k = par.replace('?', '');
      const v = bruto[k];
      if (k === 'dir') { if (!DIRS.includes(v)) { erros.push('Direção inválida.'); a.invalida = true; } else a.dir = v; }
      else if (k === 'local') { if (v != null && v !== '') a.local = txt(v, 40); else if (!opt) a.invalida = true; }
      else if (k === 'alvo') { if (!jogadoresIds.includes(v)) { erros.push('Alvo inválido.'); a.invalida = true; } else a.alvo = v; }
      else if (k === 'item') { if (!v || typeof v !== 'string' || !infoItem(v)) { erros.push('Item inválido.'); a.invalida = true; } else a.item = v; }
      else if (k === 'qtd') { const n = Math.floor(Number(v)); a.qtd = Number.isFinite(n) && n >= 1 ? Math.min(n, 99) : 1; }
      else if (k === 'texto') { a.texto = txt(v, 140).replace(/[\u0000-\u001f]/g, ' ').trim(); if (!a.texto) a.invalida = true; }
      else if (k === 'turnos') { const n = Math.floor(Number(v)); a.turnos = Number.isFinite(n) ? Math.max(1, Math.min(REGRAS.TURNOS, n)) : 1; }
      else if (k === 'receita') { if (!RECEITAS[v]) a.invalida = true; else a.receita = v; }
      else if (k === 'acordo') { if (v !== 'tregua' && v !== 'alianca') a.invalida = true; else a.tipoAcordo = v; }
    }
    if (a.invalida) continue;
    if (bruto.quando != null && bruto.quando !== '') {
      const q = Math.floor(Number(bruto.quando));
      if (Number.isFinite(q) && q >= 0 && q < REGRAS.TURNOS) a.quando = q;
    }
    if (bruto.restante > 0) a.restante = Math.min(Number(bruto.restante), 99);
    out.push(a);
  }
  return { fila: out, erros };
}

// Linha do tempo: capacidade por turno = PA efetivo / 12.
// Ações com "quando" ocupam um horário fixo; as demais vão, na ordem da fila,
// para o primeiro espaço livre depois da anterior.
function montarAgenda(p, pa, fila) {
  const cap = pa / REGRAS.TURNOS, TT = REGRAS.TURNOS;
  const itens = fila.map((a, idx) => {
    const custo = (a.restante != null ? a.restante : custoBase(a)) * multCusto(p, a.tipo);
    const dur = (a.tipo === 'dormir' || a.tipo === 'esperar') ? a.turnos : custo / cap;
    return { idx, a, custo, dur, inicio: 0, fim: 0, turno: 0, estado: 'ok' };
  });
  const ocupado = []; // [ini, fim]
  const livre = (ini, dur) => !ocupado.some(o => ini < o[1] - 1e-9 && ini + dur > o[0] + 1e-9);
  const fixos = itens.filter(i => i.a.quando != null).sort((x, y) => x.a.quando - y.a.quando || x.idx - y.idx);
  for (const it of fixos) {
    let ini = it.a.quando;
    while (!livre(ini, it.dur)) { const o = ocupado.find(o => ini < o[1] - 1e-9 && ini + it.dur > o[0] + 1e-9); ini = o[1]; }
    it.inicio = ini; it.fim = ini + it.dur; ocupado.push([it.inicio, it.fim]);
  }
  let cursor = 0;
  for (const it of itens) {
    if (it.a.quando != null) continue;
    let ini = cursor;
    while (!livre(ini, it.dur) && ini < TT + 1) { const o = ocupado.find(o => ini < o[1] - 1e-9 && ini + it.dur > o[0] + 1e-9); ini = Math.max(ini + 0.001, o[1]); }
    it.inicio = ini; it.fim = ini + it.dur;
    if (it.fim <= TT + 1e-9 || it.inicio < TT) ocupado.push([it.inicio, Math.min(it.fim, TT + 5)]);
    cursor = it.fim;
  }
  const carregadas = []; let usado = 0;
  for (const it of itens) {
    const def = ACOES[it.a.tipo];
    it.turno = Math.min(TT - 1, Math.floor(it.inicio + 1e-9));
    if (it.inicio >= TT - 1e-9) { it.estado = 'adiado'; carregadas.push(Object.assign({}, it.a, { quando: undefined })); }
    else if (it.fim > TT + 1e-9) {
      if (def.divisivel) {
        it.estado = 'continua';
        const rest = it.custo * (it.fim - TT) / it.dur;
        carregadas.push(Object.assign({}, it.a, { quando: undefined, restante: Math.round(rest * 100) / 100 }));
        usado += it.custo - rest;
      } else { it.estado = 'adiado'; carregadas.push(Object.assign({}, it.a, { quando: undefined })); }
    } else usado += it.custo;
  }
  return { itens, carregadas: carregadas.slice(0, 10), usado: Math.round(usado * 100) / 100, pa };
}

module.exports = { ACOES, DIRS, POSTURAS, multCusto, custoBase, sanitizarFila, montarAgenda };
