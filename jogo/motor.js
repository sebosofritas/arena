'use strict';
// =====================================================================
//  MOTOR DO JOGO: resolve uma rodada (1 dia = 3 períodos: manhã, tarde, noite) de uma vez.
//  Não depende de internet nem de pacotes: só Node puro.
// =====================================================================
const { LOCAIS } = require('../data/locais');
const { rolarComodo, sortearPonderado, criarRng } = require('../data/sorteio');
const { REGRAS } = require('./config');
const M = require('./mundo');
const P = require('./personagem');
const { ACOES, montarAgenda } = require('./acoes');
const { infoItem, nomeItem, diasAteEstragar, RECEITAS } = require('./itens');

const T = REGRAS.TURNOS;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ABRE_LATA = ['abridor_lata', 'faca_cozinha', 'faca_caca', 'canivete', 'facao'];
const ISQUEIROS = ['isqueiro', 'fosforos'];
const CACA_TEMA = { mata: 8, rural: 6, montanha: 4, pantano: 3, lago: 3, bairro: 1, ruinas: 2, praia: 1, rodovia: 1, campus: 1 };
const SUSSURROS = [
  'Você jura ter ouvido seu nome ser sussurrado... mas não há ninguém.',
  'Um rádio chia ao longe e, por um segundo, parece repetir uma sequência de números.',
  'Os animais evitam olhar para o centro do mapa. Algo os incomoda.',
  'Uma lembrança estranha: o último som que você ouviu antes de tudo ficar em silêncio.',
  'Um cheiro de chuva em dia seco. A névoa nunca está longe.',
  'Você acha que viu uma luz azul se apagar no horizonte.',
];
const DICAS_LORE = [
  'Uma anotação: "A névoa não é clima. Quem passa por ela não volta."',
  'Um bilhete: "Procurem onde o rádio para de chiar."',
  'Rabiscado: "Ninguém sumiu. Fomos nós que ficamos."',
  'Escrito às pressas: "Se achar os pedaços do mapa, não conte para ninguém."',
];

// ícone simples para cada item (a tela usa isso nas listas)
function iconeItem(id, it) {
  if (!it) return '📦';
  const t = it.tags || [], u = it.uso || {};
  if (id === 'agua_rio') return '🟤';
  if (t.includes('arma_fogo')) return '🔫';
  if (t.includes('arma_distancia')) return '🏹';
  if (t.includes('arma_branca') || it.dano) return '🗡️';
  if (t.includes('municao')) return '🔸';
  if (u.sede) return t.includes('alcool') ? '🍺' : '🥤';
  if (/carne|peixe|ovo/.test(id)) return '🥩';
  if (u.fome) return t.includes('comida_conserva') ? '🥫' : t.includes('doce') ? '🍫' : '🍞';
  if (u.sangramento || u.fratura) return '🩹';
  if (t.includes('medicina') || t.includes('medicina_forte') || u.pv || u.dor || u.infeccao) return '💊';
  if (t.includes('capacete')) return '🪖';
  if (t.includes('calcado')) return '👟';
  if (t.includes('mochila')) return '🎒';
  if (t.includes('roupa') || it.slot) return '👕';
  if (t.includes('fogo')) return '🔥';
  if (t.includes('chave')) return '🔑';
  if (t.includes('luz')) return '🔦';
  if (t.includes('corda')) return '🪢';
  if (t.includes('material')) return '🪵';
  if (t.includes('mapa')) return '🗺️';
  if (t.includes('livro') || t.includes('lore')) return '📜';
  if (t.includes('ferramenta')) return '🔧';
  if (t.includes('pesca')) return '🎣';
  if (t.includes('camping') || t.includes('sobrevivencia')) return '⛺';
  return '📦';
}

class Jogo {
  constructor(personagens, cfg, seed, mundo) {
    this.cfg = cfg;
    this.rng = criarRng(seed == null ? (Date.now() & 0x7fffffff) : seed);
    this.mundo = mundo || M.gerarMundo(this.rng);
    for (const r of this.mundo.regioes) if (r.apagaDia == null) r.apagaDia = 6 + Math.floor(this.rng() * 11);
    this.jog = new Map();
    for (const p of personagens) this.jog.set(p.id, p);
    this.total = personagens.length;
    this.rodada = 0; this.fim = false; this.vencedor = null; this.resultado = null;
    this.publico = []; this.propostas = []; this.proxProp = 1;
    this._preparar();
  }

  // ---------- utilidades ----------
  // registra quanto fome/sede/energia subiu ou caiu no dia (para o resumo do jogador)
  fluxar(p, antes, fn) {
    if (fn) fn();
    if (!p.fluxo) return;
    for (const k of ['fome', 'sede', 'energia']) {
      if (antes[k] == null) continue;
      const d = p[k] - antes[k];
      if (d > 0.01) p.fluxo[k][0] += d; else if (d < -0.01) p.fluxo[k][1] -= d;
    }
  }
  d20() { return 1 + Math.floor(this.rng() * 20); }
  entre(a, b) { return a + Math.floor(this.rng() * (b - a + 1)); }
  vivos() { return [...this.jog.values()].filter(p => p.vivo && !p.escapou); }
  tAbs(t) { return (this.rodada - 1) * T + t; }
  dia(t) { return Math.floor(this.tAbs(t) / T) + 1; }
  reg(p) { return this.mundo.regioes[p.regiao]; }
  log(p, t, tipo, texto) {
    if (!p || !p.diario) return;
    p.diario.push({ t, d: this.dia(t), per: REGRAS.PERIODOS[t % T], tipo, texto });
  }
  pub(tipo, texto) { this.publico.push({ rodada: this.rodada, tipo, texto }); if (this.publico.length > 200) this.publico.shift(); }
  nome(id) { const p = this.jog.get(id); return p ? p.nome : '?'; }
  aliados(a, b) { return a.aliados.includes(b.id); }
  emTregua(a, b) { const t = a.tregua[b.id]; return t != null && t >= this.rodada; }
  amigavel(a, b) { return this.aliados(a, b) || this.emTregua(a, b); }
  naRegiao(p, incluirEscondidos) { return this.vivos().filter(o => o.id !== p.id && o.regiao === p.regiao); }
  dormindoEm(p, t) { return (p.sono || []).some(iv => t + 0.5 >= iv.ini && t + 0.5 < iv.fim); }
  acordar(p, t) { for (const iv of p.sono || []) if (iv.fim > t + 1) iv.fim = Math.max(iv.ini, t + 1); }

  // ---------- início ----------
  _preparar() {
    const base = { camiseta: 1, calca_jeans: 1 };
    for (const p of this.jog.values()) {
      P.aplicarBase(p);
      p.frescor = {}; p.sono = []; p.vistos = {}; p.diario = []; p.hist = []; p.postura = p.postura || 'defender';
      p.pista = { x: null, y: null, regiao: null };
      if (p.inicio == null || !this.cfg.inicioLivre || !this.mundo.regioes[p.inicio]) p.inicio = Math.floor(this.rng() * this.mundo.regioes.length);
      p.regiao = p.inicio;
      const kit = Object.assign({ tenis: 1, agua_garrafa: 1 }, base, (P.CLASSES[p.classe] || P.CLASSES.comum).kit);
      if (kit.botas_militares) delete kit.tenis;
      for (const id in kit) { if (!infoItem(id)) continue; p.inv[id] = (p.inv[id] || 0) + kit[id]; }
      for (const id of Object.keys(p.inv)) { const it = infoItem(id); if (it && (it.slot || it.dano)) P.equipar(p, id); }
    }
    this._presentes();
  }
  _presentes() {
    for (const p of this.vivos()) {
      p.presentes = this.vivos().filter(o => o.id !== p.id && o.regiao === p.regiao && (this.aliados(p, o) || !o.escondido)).map(o => o.id);
    }
  }

  // ---------- inventário ----------
  ganhar(p, id, q, t) {
    const cabe = P.pegar(p, id, q);
    if (cabe > 0) {
      const it = infoItem(id);
      if (it && it.estraga && !p.frescor[id]) p.frescor[id] = this.dia(t == null ? 0 : t);
    }
    if (cabe < q) { const r = this.reg(p); r.chao[id] = (r.chao[id] || 0) + (q - cabe); }
    return cabe;
  }
  tem(p, ids) { return ids.some(i => P.temItem(p, i)); }

  // ---------- dano e morte ----------
  dano(p, n, causa) { p.pv -= n; p.ultimaCausa = causa; }
  matar(vit, causa, t, assassino) {
    if (!vit.vivo) return;
    vit.vivo = false; vit.causa = causa; vit.rodadaMorte = this.rodada; vit.pv = 0;
    const r = this.reg(vit);
    for (const id in vit.inv) r.chao[id] = (r.chao[id] || 0) + vit.inv[id];
    vit.inv = {}; vit.equip = {};
    for (const o of this.jog.values()) { o.aliados = o.aliados.filter(x => x !== vit.id); }
    vit.aliados = [];
    if (assassino) assassino.kills++;
    this.log(vit, t, 'morte', '💀 Você morreu: ' + causa + '.');
    this.pub('morte', `💀 ${vit.nome} morreu — ${causa}. (Dia ${this.dia(t)}, ${REGRAS.PERIODOS[t % T]})`);
    for (const o of this.vivos()) if (o.regiao === vit.regiao && o.id !== vit.id) this.log(o, t, 'morte', `💀 ${vit.nome} morreu aqui perto (${causa}).`);
  }

  // ---------- visão ----------
  ve(obs, alvo, t) {
    if (this.aliados(obs, alvo)) return true;
    if (this.dormindoEm(obs, t)) return false;
    let c = 0.62 + (P.atr(obs, 'AST') - 6) * 0.05 + P.traco(obs, 'percepcao') * 0.04 + P.traco(obs, 'alerta') * 0.05;
    c -= (alvo.escondido ? 0.35 : 0) + P.traco(alvo, 'furtivo') * 0.05;
    if (t >= T - 1) c -= 0.1;
    if (this.dormindoEm(alvo, t)) c += 0.15;
    const lc = alvo.local && this.mundo.regioes[alvo.regiao].locais.find(x => x.id === alvo.local);
    if (lc && lc.dono === alvo.id && lc.trancado) c -= 0.35;
    return this.rng() < clamp(c, 0.05, 0.95);
  }

  // ---------- combate ----------
  lutar(att, def, t, opc) {
    opc = opc || {};
    const sono = this.dormindoEm(def, t);
    if (sono) this.acordar(def, t);
    const a0 = P.arma(att), d0 = P.arma(def);
    const regiao = this.reg(att);
    att.emCombate = t; def.emCombate = t;
    this.logDois(att, def, t, 'combate', opc.emboscada
      ? `🗡️ ${att.nome} surge de surpresa e emboscou ${def.nome}!`
      : `⚔️ ${att.nome} parte para cima de ${def.nome}${opc.surpresa ? ' sem ser notado' : ''}!`);
    let fugiu = false;
    for (let rd = 1; rd <= 3 && att.vivo && def.vivo && !fugiu; rd++) {
      // atacante golpeia; depois o defensor responde (se acordado)
      this.golpe(att, def, t, rd === 1 && (opc.surpresa || opc.emboscada), sono && rd === 1, rd);
      if (def.vivo && !(sono && rd === 1)) this.golpe(def, att, t, false, false, rd);
      if (!att.vivo || !def.vivo) break;
      // fuga: quem está com pouca vida ou na postura "evitar"
      for (const [fug, per] of [[def, att], [att, def]]) {
        if ((fug.pv < fug.pvMax * 0.3 || fug.postura === 'evitar') && rd < 3 && !fugiu) {
          const mine = P.atr(fug, 'AGI') + this.d20() + (fug.classe === 'atleta' ? 2 : 0);
          const theirs = P.atr(per, 'AGI') + this.d20();
          if (mine >= theirs) { fugiu = true; this.logDois(att, def, t, 'combate', `🏃 ${fug.nome} consegue se afastar da briga.`); this._afastar(fug); }
        }
      }
    }
    if (att.vivo && def.vivo && !fugiu) this.logDois(att, def, t, 'combate', `🩸 A briga termina. ${att.nome}: ${Math.max(0, Math.round(att.pv))}/${att.pvMax} PV | ${def.nome}: ${Math.max(0, Math.round(def.pv))}/${def.pvMax} PV.`);
    if (a0 && a0.tags.includes('arma_fogo')) this._barulho(regiao.id, att, t);
  }
  _afastar(p) {
    const viz = M.vizinhas(this.mundo, p.regiao), dirs = Object.keys(viz);
    if (!dirs.length) return;
    p.regiao = viz[dirs[Math.floor(this.rng() * dirs.length)]]; p.local = null; p.escondido = false;
  }
  logDois(a, b, t, tipo, txt) { this.log(a, t, tipo, txt); this.log(b, t, tipo, txt); }
  _barulho(regId, fonte, t) {
    for (const o of this.vivos()) {
      if (o.id === fonte.id) continue;
      const d = M.distancia(this.mundo, o.regiao, regId);
      if (d >= 1 && d <= 2 && !this.dormindoEm(o, t)) this.log(o, t, 'info', '🔫 Você ouve tiros ao longe.');
    }
  }
  golpe(a, d, t, bonusSurpresa, alvoDormindo, rd) {
    let arma = P.arma(a), municao = null, ruim = false;
    if (arma && (arma.tags.includes('arma_fogo') || arma.tags.includes('arma_distancia'))) {
      municao = arma.municao;
      if (municao === 'pedra' || P.temItem(a, municao)) { /* ok */ } else { arma = null; ruim = true; }
    }
    const atq = this.d20();
    let acerto = atq + Math.floor(P.atr(a, 'AGI') / 2) + P.traco(a, 'iniciativa') + (a.classe === 'soldado' ? 1 : 0) + (arma && arma.tags.includes('arma_fogo') ? 3 : 0) + (bonusSurpresa ? 4 : 0);
    const defesa = alvoDormindo ? -99 : this.d20() + Math.floor(P.atr(d, 'AGI') / 2);
    const nome = arma ? arma.nome : (ruim ? 'coronhada' : 'punhos');
    if (municao && arma) {
      if (municao !== 'pedra' || P.temItem(a, 'pedra')) P.tirar(a, municao, 1);
    }
    if (acerto + 2 < defesa) {
      this.logDois(a, d, t, 'combate', `   ↳ ${a.nome} erra ${d.nome} (${nome}).`);
      return;
    }
    let dmg = arma ? this.entre(arma.dano[0], arma.dano[1]) : this.entre(2, 6);
    const longe = arma && (arma.tags.includes('arma_fogo') || arma.tags.includes('arma_distancia'));
    if (!longe) dmg += Math.floor((P.atr(a, 'FOR') - 5) / 2);
    const crit = atq === 20;
    if (crit) dmg = Math.round(dmg * 1.5);
    if (bonusSurpresa) dmg = Math.round(dmg * 1.5);
    if (alvoDormindo) dmg = Math.round(dmg * 1.5);
    dmg = Math.max(1, dmg - Math.round(P.protecao(d) * 0.8));
    this.dano(d, dmg, `ferimentos causados por ${a.nome}${arma ? ' (' + arma.nome + ')' : ''}`);
    d.dor = clamp(d.dor + dmg * 1.5, 0, 100);
    let extra = '';
    if (dmg >= 14 && this.rng() < 0.4) {
      const parte = this.rng() < 0.15 ? 'cabeca' : (this.rng() < 0.5 ? 'perna' : 'braco');
      const grave = dmg >= 22 ? 2 : 1;
      if (parte === 'cabeca') { d.ferida.cabeca = 1; extra += ' Golpe na cabeça!'; }
      else { d.ferida[parte] = Math.max(d.ferida[parte], grave); extra += grave === 2 ? (parte === 'perna' ? ' A perna quebra!' : ' O braço quebra!') : (parte === 'perna' ? ' Perna machucada.' : ' Braço machucado.'); }
    }
    if ((arma && (arma.tags.includes('arma_fogo') || /faca|facao|machad|serra|foice|tesoura/.test(arma.id))) && this.rng() < 0.4) { d.sangramento = Math.min(2, d.sangramento + 1); extra += ' 🩸 Sangrando.'; }
    this.logDois(a, d, t, 'combate', `   ↳ ${crit ? 'CRÍTICO! ' : ''}${a.nome} acerta ${d.nome} com ${nome}: -${dmg} PV.${extra}`);
    if (d.pv <= 0) this.matar(d, `morto por ${a.nome}${arma ? ' (' + arma.nome + ')' : ''}`, t, a);
  }

  // ---------- encontros no fim de cada turno ----------
  encontros(t) {
    const porRegiao = {};
    for (const p of this.vivos()) (porRegiao[p.regiao] = porRegiao[p.regiao] || []).push(p);
    for (const rid in porRegiao) {
      const g = porRegiao[rid];
      if (g.length < 2) continue;
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) this.encontro(g[i], g[j], t);
    }
  }
  encontro(A, B, t) {
    if (!A.vivo || !B.vivo || A.regiao !== B.regiao) return;
    if (A.emCombate === t || B.emCombate === t) return;
    const amigos = this.amigavel(A, B);
    const aVe = this.ve(A, B, t), bVe = this.ve(B, A, t);
    if (!aVe && !bVe) return;
    if (aVe && !A.vistos[B.id]) { A.vistos[B.id] = 1; this.log(A, t, 'encontro', `👁️ Você avista ${B.nome}${this.aliados(A, B) ? ' (aliado)' : ''}.`); }
    if (bVe && !B.vistos[A.id]) { B.vistos[A.id] = 1; this.log(B, t, 'encontro', `👁️ Você avista ${A.nome}${this.aliados(A, B) ? ' (aliado)' : ''}.`); }
    const quer = (x, y, xv) => !amigos && xv && x.postura === 'atacar' && !this.dormindoEm(x, t);
    const qA = quer(A, B, aVe), qB = quer(B, A, bVe);
    if (!qA && !qB) {
      if (!amigos && A.postura === 'acolher' && B.postura === 'acolher' && aVe && bVe && !A.cumpr?.[B.id]) {
        A.cumpr = A.cumpr || {}; B.cumpr = B.cumpr || {}; A.cumpr[B.id] = B.cumpr[A.id] = 1;
        this.logDois(A, B, t, 'social', `🤝 ${A.nome} e ${B.nome} se cumprimentam sem hostilidade.`);
        for (const [x, y] of [[A, B], [B, A]]) if (!x.conhecidos.includes(y.id)) x.conhecidos.push(y.id);
      }
      return;
    }
    let att, def, defVe;
    if (qA && qB) { att = this.rng() < 0.5 ? A : B; } else att = qA ? A : B;
    def = att === A ? B : A; defVe = att === A ? bVe : aVe;
    if (def.postura === 'evitar' && defVe && !this.dormindoEm(def, t)) {
      if (P.atr(def, 'AGI') + this.d20() + P.traco(def, 'furtivo') >= P.atr(att, 'AGI') + this.d20()) {
        this.logDois(att, def, t, 'encontro', `💨 ${def.nome} percebe ${att.nome} e se afasta a tempo.`);
        this._afastar(def); return;
      }
    }
    this.lutar(att, def, t, { surpresa: !defVe });
  }

  // ---------- turno a turno ----------
  resolver() {
    if (this.fim) return;
    this.rodada++;
    const antes = this.mundo.estagioNeblina;
    const est = M.estagioDaRodada(this.rodada, this.cfg, this.mundo), emax = M.estagioMax(this.mundo);
    if (est > antes) {
      M.aplicarNeblina(this.mundo, est);
      this.pub('neblina', `🌫️ A névoa avançou (estágio ${est}/${emax}). ${est >= emax ? 'Ela parou de avançar: só o coração do mapa continua limpo.' : 'Mais um pedaço das bordas ficou perigoso.'}`);
    } else if (this.rodada === this.cfg.neblinaInicio - 1) {
      this.pub('sinal', '📻 Rádios chiam sozinhos e os animais fogem para o centro. Algo está se aproximando das bordas...');
    }
    this.armadilhasRodada();
    const alvos = this.vivos();
    for (const p of alvos) {
      p.diario = []; p.vistos = {}; p.emCombate = -1; p.sono = [];
      p.fluxo = { ini: { fome: p.fome, sede: p.sede, energia: p.energia, pv: p.pv }, fome: [0, 0], sede: [0, 0], energia: [0, 0], pv: [0, 0] };
      const pa = P.calcPA(p, this.cfg);
      const ag = montarAgenda(p, pa, p.fila);
      ag.ordenados = ag.itens.slice().sort((x, y) => x.inicio - y.inicio || x.idx - y.idx);
      p.agenda = ag;
      for (const it of ag.itens) if (it.a.tipo === 'dormir' && it.estado === 'ok') p.sono.push({ ini: it.inicio, fim: it.fim });
      p.proximaFila = ag.carregadas;
      for (const it of ag.itens) {
        if (it.estado === 'adiado') this.log(p, 0, 'sistema', `⏳ Sem tempo para "${ACOES[it.a.tipo].nome}" nesta rodada. Ficou para a próxima.`);
        if (it.estado === 'continua') this.log(p, it.turno, 'sistema', `🔧 Você começa "${ACOES[it.a.tipo].nome}" e continua na próxima rodada.`);
      }
    }
    const ordem = alvos.slice();
    for (let t = 0; t < T; t++) {
      if (t === 0) this.eventosDia(t);
      const sh = M.embaralhar(ordem, this.rng);
      for (const p of sh) {
        if (!p.vivo || p.escapou) continue;
        for (const it of p.agenda.ordenados) {
          if (it.turno !== t || it.estado === 'adiado') continue;
          if (!p.vivo || p.escapou) break;
          if (it.estado === 'continua') continue; // só termina na rodada seguinte
          this.executar(p, it.a, t);
        }
      }
      this.encontros(t);
      this.armadilhasTurno(t);
      for (const p of this.vivos()) this.passarTurno(p, t);
      if (t === T - 1) this.estragar(t);
      if (this.total > 1 && this.vivos().length <= 1) break;
    }
    // fim da rodada
    for (const p of this.vivos()) this.resumoDoDia(p);
    for (const p of this.jog.values()) {
      if (!p.vivo || p.escapou) { p.hist.push({ rodada: this.rodada, entradas: p.diario }); p.diario = []; if (p.hist.length > 6) p.hist.shift(); continue; }
      p.fila = (p.proximaFila || []).map(a => Object.assign({}, a, { carregada: true }));
      p.hist.push({ rodada: this.rodada, entradas: p.diario }); if (p.hist.length > 6) p.hist.shift();
      p.diario = [];
      p.prontoRodada = false;
      for (const k in p.tregua) if (p.tregua[k] < this.rodada) { delete p.tregua[k]; }
    }
    this.propostas = this.propostas.filter(pr => pr.estado === 'pendente' && pr.ate >= this.rodada + 1);
    this._presentes();
    this.verificarFim();
  }

  // texto simples que explica por que fome/sede/energia estão como estão
  resumoDoDia(p) {
    const f = p.fluxo; if (!f) return;
    const linha = (nome, k, ganho, perda) => {
      const ini = Math.round(f.ini[k]), fim = Math.round(p[k]);
      const g = Math.round(f[k][0]), q = Math.round(f[k][1]);
      return `${nome} ${ini} → ${fim}` + (g || q ? ` (${g ? ganho + ' +' + g : ''}${g && q ? ', ' : ''}${q ? perda + ' −' + q : ''})` : ' (sem mudança)');
    };
    const partes = [linha('🍖 Fome', 'fome', 'comeu', 'o dia gastou'), linha('💧 Sede', 'sede', 'bebeu', 'o dia gastou'), linha('⚡ Energia', 'energia', 'descansou', 'cansaço')];
    const pv = Math.round(p.pv) - Math.round(f.ini.pv);
    partes.push(`❤️ Vida ${Math.round(f.ini.pv)} → ${Math.round(p.pv)}${pv ? ' (' + (pv > 0 ? '+' : '') + pv + ')' : ''}`);
    this.log(p, T - 1, 'resumo', partes.join('  ·  '));
  }

  verificarFim() {
    const v = this.vivos();
    if (this.total > 1 && v.length <= 1) {
      this.fim = true;
      this.vencedor = v[0] ? v[0].id : null;
      const esc = [...this.jog.values()].filter(p => p.escapou).map(p => p.nome);
      this.resultado = {
        vencedor: v[0] ? v[0].nome : null,
        desaparecidos: esc,
        texto: v[0] ? `🏆 ${v[0].nome} é o último sobrevivente.` : (esc.length ? '🌫️ Ninguém ficou. Quem escapou sumiu sem deixar rastro.' : '☠️ Ninguém sobreviveu.'),
      };
      this.pub('fim', this.resultado.texto);
    }
  }

  eventosDia(t) {
    const ab = this.tAbs(t);
    // chuva
    if (this.rng() < 0.12) {
      const rs = M.embaralhar(this.mundo.regioes, this.rng).slice(0, 6);
      for (const r of rs) {
        r.fogueiraAte = 0;
        for (const p of this.vivos()) if (p.regiao === r.id) { this.log(p, t, 'info', '🌧️ Uma chuva forte cai sobre a região, apaga fogueiras e dá para beber um pouco (sede +15).'); this.fluxar(p, { sede: p.sede }, () => { p.sede = clamp(p.sede + 15, 0, 100); }); }
      }
    }
    // apagão
    for (const r of this.mundo.regioes) {
      if (r.luz !== false && this.dia(t) >= r.apagaDia) {
        r.luz = false;
        for (const p of this.vivos()) if (p.regiao === r.id) this.log(p, t, 'info', '💡 As luzes piscam e a eletricidade acaba de vez nesta região.');
      }
    }
    for (const p of this.vivos()) {
      if (this.mundo.regioes[p.regiao].neblina && t === 0) this.log(p, t, 'perigo', '🌫️ Você está dentro da névoa. O ar queima por dentro. Saia daqui.');
      if (this.rng() < 0.06 && this.cfg.escape) this.log(p, t, 'sussurro', '🌀 ' + SUSSURROS[Math.floor(this.rng() * SUSSURROS.length)]);
    }
  }

  passarTurno(p, t) {
    if (!p.vivo || p.escapou) return;
    const dorm = this.dormindoEm(p, t);
    const f0 = { fome: p.fome, sede: p.sede, energia: p.energia, pv: p.pv };
    p.fome = clamp(p.fome - REGRAS.FOME_POR_TURNO * P.multTraco(p, 'fome') * (dorm ? 0.5 : 1), 0, 100);
    p.sede = clamp(p.sede - REGRAS.SEDE_POR_TURNO * P.multTraco(p, 'sede') * (dorm ? 0.6 : 1), 0, 100);
    p.energia = clamp(p.energia + (dorm ? REGRAS.ENERGIA_SONO * P.multTraco(p, 'sono') : -REGRAS.ENERGIA_POR_TURNO), 0, 100);
    this.fluxar(p, f0);
    p.dor = Math.max(0, p.dor - 2.5);
    if (p.sangramento > 0) {
      this.dano(p, 2 * p.sangramento, 'sangramento (perdeu muito sangue)');
      if (this.rng() < 0.12) p.sangramento--;
      if (this.rng() < 0.06) p.infeccao = Math.max(p.infeccao, 5);
    }
    if (p.infeccao > 0) { p.infeccao = Math.min(100, p.infeccao + 1); this.dano(p, p.infeccao >= 70 ? 3 : p.infeccao >= 30 ? 1.5 : 0.5, 'infecção generalizada'); }
    if (p.doenca > 0) { p.doenca--; this.dano(p, 1, 'doença'); }
    if (p.fome <= 0) this.dano(p, 3, 'fome');
    if (p.sede <= 0) this.dano(p, 5, 'sede');
    if (p.energia <= 0) this.dano(p, 2, 'exaustão');
    const r0 = this.reg(p), temp = M.temperatura(r0, this.dia(t), t % T);
    let aque = 0;
    for (const sl in p.equip) { const it = infoItem(p.equip[sl]); if (it && it.frio) aque += it.frio / 6; }
    if (P.temItem(p, 'cobertor') || P.temItem(p, 'manta_termica')) aque += dorm ? 4 : 2;
    if (this.abrigado(p)) aque += 6;
    if (r0.fogueiraAte > this.tAbs(t)) aque += 5;
    const ef = temp + aque;
    const tinhaFrio = p.frio, tinhaCalor = p.calor;
    p.frio = 0; p.calor = 0;
    if (ef < 7) { p.frio = 1; this.dano(p, Math.min(3, (7 - ef) * 0.2), 'frio (hipotermia)'); p.energia = clamp(p.energia - 1, 0, 100); if (!tinhaFrio) this.log(p, t, 'perigo', `🥶 Está muito frio (${temp}°C). Agasalho, abrigo ou fogueira ajudam.`); }
    else if (ef > 33) { p.calor = 1; this.fluxar(p, { sede: p.sede }, () => { p.sede = clamp(p.sede - 3, 0, 100); }); if (ef > 38) this.dano(p, 1.5, 'insolação'); if (!tinhaCalor) this.log(p, t, 'perigo', `🥵 Calor forte (${temp}°C). A sede aumenta. Procure sombra/abrigo.`); }
    p.temp = temp;
    const r = this.reg(p);
    if (r.neblina) { this.dano(p, this.mundo.estagioNeblina >= 3 ? 2 : 1, 'consumido pela névoa'); p.energia = clamp(p.energia - 1, 0, 100); }
    if (!p.sangramento && p.fome > 50 && p.sede > 50 && p.energia > 30 && p.infeccao === 0 && p.doenca === 0 && !r.neblina) p.pv = Math.min(p.pvMax, p.pv + (dorm ? 2 : 0.8));
    p.moral = (p.fome < 25 || p.sede < 25) ? clamp(p.moral - 2, 0, 100) : clamp(p.moral + 0.3, 0, 100);
    if (p.pv <= 0) this.matar(p, p.ultimaCausa || 'causas desconhecidas', t);
  }

  estragar(t) {
    const d = this.dia(t);
    for (const p of this.vivos()) {
      for (const id of Object.keys(p.inv)) {
        const it = infoItem(id);
        if (!it || !it.estraga) continue;
        if (!p.frescor[id]) p.frescor[id] = d;
        if (d - p.frescor[id] >= diasAteEstragar(it)) {
          const q = p.inv[id]; P.tirar(p, id, q); delete p.frescor[id];
          const novo = id + '_estragado';
          if (infoItem(novo)) { P.pegar(p, novo, q); }
          this.log(p, t, 'info', `🦠 ${nomeItem(id)} (${q}) estragou.`);
        }
      }
    }
  }

  // ---------- ações ----------
  executar(p, a, t) {
    const def = ACOES[a.tipo];
    const fn = this['a_' + a.tipo];
    if (!fn) return;
    p.escondidoAntes = p.escondido;
    if (!['esconder', 'observar', 'esperar', 'dormir', 'comer', 'beber', 'usar', 'equipar', 'largar', 'pegar_chao'].includes(a.tipo)) p.escondido = false;
    fn.call(this, p, a, t, def);
  }
  alvoPresente(p, a, t, exigeVisivel) {
    const o = this.jog.get(a.alvo);
    if (!o || !o.vivo || o.escapou || o.regiao !== p.regiao || o.id === p.id) { this.log(p, t, 'info', `🔎 ${o ? o.nome : 'Essa pessoa'} não está aqui.`); return null; }
    if (exigeVisivel && o.escondido && !this.aliados(p, o) && !this.ve(p, o, t)) { this.log(p, t, 'info', `🔎 Você não encontra ${o.nome}. Deve estar escondido.`); return null; }
    return o;
  }
  acessivel(p, l) {
    if (!l.trancado) return true;
    if (l.dono === p.id) return true;
    const d = l.dono && this.jog.get(l.dono);
    return !!(d && this.aliados(p, d));
  }
  // devolve o local, null (nada na região) ou 'trancado'
  localAtual(p, a) {
    const r = this.reg(p);
    if (a.local) { const l = r.locais.find(x => x.id === a.local); if (l) return this.acessivel(p, l) ? l : 'trancado'; }
    if (p.local) { const l = r.locais.find(x => x.id === p.local); if (l && this.acessivel(p, l)) return l; }
    if (!r.locais.length) return null;
    const livres = r.locais.filter(l => this.acessivel(p, l));
    if (!livres.length) return 'trancado';
    const cand = livres.filter(l => Object.keys(l.vasculhados).length < LOCAIS[l.tipo].comodos.length);
    const pool = cand.length ? cand : livres;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  a_mover(p, a, t) {
    const viz = M.vizinhas(this.mundo, p.regiao), dest = viz[a.dir];
    if (dest == null) { this.log(p, t, 'info', `🧭 Não há nada ao ${a.dir}: é o limite do mundo.`); return; }
    p.regiao = dest; p.local = null; p.escondido = false;
    const r = this.reg(p);
    this.log(p, t, 'mover', `🚶 Você segue para o ${a.dir}: ${r.icone} ${r.nome}.`);
    if (r.neblina) this.log(p, t, 'perigo', '🌫️ Névoa densa nesta região!');
  }
  a_ir(p, a, t) {
    const r = this.reg(p), l = r.locais.find(x => x.id === a.local);
    if (!l) { this.log(p, t, 'info', '🧭 Esse local não existe nesta região.'); return; }
    if (!this.acessivel(p, l)) { this.log(p, t, 'info', `🔒 ${l.nome} está trancado${l.dono ? ' (barricado por dentro)' : ''}. Arrombe a porta.`); return; }
    p.local = l.id; this.log(p, t, 'mover', `${l.icone} Você entra em: ${l.nome}.`);
  }
  a_observar(p, a, t) {
    const r = this.reg(p);
    const outros = this.naRegiao(p).filter(o => this.ve(p, o, t) || this.aliados(p, o));
    let txt = `🔭 Você observa ${r.nome}.`;
    txt += outros.length ? ' Vê: ' + outros.map(o => o.nome + (this.dormindoEm(o, t) ? ' (dormindo)' : '')).join(', ') + '.' : ' Nenhum sinal de gente por perto.';
    const chao = Object.keys(r.chao).filter(k => r.chao[k] > 0);
    if (chao.length) txt += ' No chão: ' + chao.slice(0, 6).map(k => `${nomeItem(k)} x${r.chao[k]}`).join(', ') + '.';
    const viz = M.vizinhas(this.mundo, p.regiao), perto = [];
    for (const d in viz) if (this.mundo.regioes[viz[d]].neblina) perto.push(d);
    if (perto.length) txt += ' Névoa visível ao: ' + perto.join(', ') + '.';
    if (r.fogueiraAte > this.tAbs(t)) txt += ' Há uma fogueira acesa.';
    this.log(p, t, 'info', txt + (P.traco(p, 'percepcao') && this.rng() < 0.5 ? ' (Seu olho clínico nota detalhes a mais: há movimento recente em regiões vizinhas.)' : ''));
  }
  a_esconder(p, a, t) { p.escondido = true; this.log(p, t, 'info', '🫥 Você se esconde e fica em silêncio.'); }
  a_esperar(p, a, t) { /* nada */ }
  a_dormir(p, a, t) { this.log(p, t, 'info', '😴 Você dorme. Está vulnerável.'); }
  a_descansar(p, a, t) {
    this.fluxar(p, { energia: p.energia }, () => { p.energia = clamp(p.energia + 30, 0, 100); }); p.pv = Math.min(p.pvMax, p.pv + 6); p.dor = Math.max(0, p.dor - 10); p.moral = clamp(p.moral + 2, 0, 100);
    this.log(p, t, 'info', '🛌 Você descansa um pouco. Energia e ânimo sobem.');
  }

  rolarLoot(p, local, profundo, t) {
    const tabela = LOCAIS[local.tipo], vis = local.vasculhados;
    const novos = tabela.comodos.filter(c => !vis[c.nome]);
    const base = novos.length ? novos : tabela.comodos;
    const comodo = sortearPonderado(base.map(c => [c, c.peso]), this.rng);
    const repetido = !!vis[comodo.nome];
    vis[comodo.nome] = (vis[comodo.nome] || 0) + 1; local.buscas++;
    const bonus = this.cfg.abundancia + (profundo ? 1 : 0) - (repetido ? 2 : 0) + (this.rng() < P.traco(p, 'sorte') ? 1 : 0);
    const achados = rolarComodo(comodo, { rng: this.rng, bonusRolagens: bonus });
    const ids = Object.keys(achados);
    if (!ids.length) { this.log(p, t, 'loot', `🔍 ${comodo.nome} (${local.nome}): nada de útil${repetido ? ' (já foi vasculhado)' : ''}.`); return; }
    const partes = [], sobra = [];
    for (const id of ids) {
      const q = achados[id], cabe = this.ganhar(p, id, q, t);
      if (cabe) partes.push(`${nomeItem(id)}${cabe > 1 ? ' x' + cabe : ''}`);
      if (cabe < q) sobra.push(nomeItem(id));
      if (id === 'fragmento_mapa') this.fragmento(p, t);
      if (['bilhete_estranho', 'diario_encontrado', 'carta_nao_lida', 'jornal_ultima_edicao'].includes(id) && this.cfg.escape) this.log(p, t, 'sussurro', '📜 ' + DICAS_LORE[Math.floor(this.rng() * DICAS_LORE.length)]);
    }
    this.log(p, t, 'loot', `🔍 ${comodo.nome} (${local.nome}): ${partes.join(', ') || 'nada que coubesse'}.${sobra.length ? ' Sem espaço para: ' + sobra.join(', ') + ' (ficou no chão).' : ''}`);
  }
  fragmento(p, t) {
    if (!this.cfg.escape) return;
    p.fragmentos++;
    const s = this.mundo.saida, r = this.mundo.regioes[s], N = this.mundo.N;
    if (p.fragmentos === 1) { p.pista.x = r.x; this.log(p, t, 'sussurro', `🧩 Fragmento de mapa: uma linha vertical marca o lado ${r.x < N / 3 ? 'oeste' : r.x > N * 2 / 3 ? 'leste' : 'do meio'} do mundo.`); }
    else if (p.fragmentos === 2) { p.pista.y = r.y; this.log(p, t, 'sussurro', `🧩 Segundo fragmento: agora uma linha horizontal, ${r.y < N / 3 ? 'ao norte' : r.y > N * 2 / 3 ? 'ao sul' : 'no meio'}. As linhas se cruzam em algum lugar...`); }
    else if (p.fragmentos === 3) { p.pista.regiao = s; this.log(p, t, 'sussurro', `🧩 O mapa se completa: um X marca ${r.icone} ${r.nome}. Se existir uma saída, é lá. (Marcado no seu mapa.)`); }
  }
  a_vasculhar(p, a, t) {
    const l = this.localAtual(p, a);
    if (l === 'trancado') { this.log(p, t, 'info', '🔒 Tudo aqui está trancado. Use "Arrombar porta" no local que quiser.'); return; }
    if (!l) { this.log(p, t, 'info', '🔍 Não há construções aqui, só terreno vazio.'); return; }
    if (!p.local) p.local = l.id;
    this.rolarLoot(p, l, false, t);
  }
  a_vasculhar_fundo(p, a, t) {
    const l = this.localAtual(p, a);
    if (l === 'trancado') { this.log(p, t, 'info', '🔒 Tudo aqui está trancado. Use "Arrombar porta" no local que quiser.'); return; }
    if (!l) { this.log(p, t, 'info', '🔍 Não há nada para vasculhar aqui.'); return; }
    if (!p.local) p.local = l.id;
    this.rolarLoot(p, l, true, t);
    this.rolarLoot(p, l, true, t);
  }
  a_rastrear(p, a, t) {
    const o = this.jog.get(a.alvo);
    if (!o || !o.vivo || o.escapou) { this.log(p, t, 'info', '👣 Não há rastros recentes dessa pessoa.'); return; }
    const d = M.distancia(this.mundo, p.regiao, o.regiao);
    const ch = 0.5 + (P.atr(p, 'AST') - 6) * 0.05 + (p.classe === 'cacador' ? 0.15 : 0) - (o.escondido ? 0.2 : 0) - P.traco(o, 'furtivo') * 0.04;
    if (d <= 2 && this.rng() < clamp(ch, 0.1, 0.9)) {
      const r = this.mundo.regioes[o.regiao];
      this.log(p, t, 'info', `👣 Rastros de ${o.nome} levam a: ${r.icone} ${r.nome} (${d === 0 ? 'aqui mesmo' : d + ' região(ões) de distância'}).`);
    } else this.log(p, t, 'info', `👣 Você não consegue seguir os rastros de ${o.nome}.`);
  }

  // comida, água, remédios
  consumir(p, a, t, verbo) {
    const id = a.item, it = infoItem(id);
    if (!it || !P.temItem(p, id)) { this.log(p, t, 'info', `🎒 Você não tem ${nomeItem(id)}.`); return; }
    if (!it.uso) { this.log(p, t, 'info', `🎒 ${it.nome} não serve para isso.`); return; }
    if (it.req === 'abridor_ou_faca' && !this.tem(p, ABRE_LATA)) { this.log(p, t, 'info', `🥫 Você não tem como abrir ${it.nome}. Precisa de abridor ou faca.`); return; }
    P.tirar(p, id, 1);
    const u = it.uso, partes = [];
    const add = (campo, v, nm) => { const antes = p[campo]; p[campo] = clamp(p[campo] + v, 0, 100); this.fluxar(p, { [campo]: antes }); if (Math.round(p[campo] - antes)) partes.push(`${nm} ${v > 0 ? '+' : ''}${Math.round(p[campo] - antes)}`); };
    if (u.fome) add('fome', u.fome, 'fome');
    if (u.sede) add('sede', u.sede, 'sede');
    if (u.energia) add('energia', u.energia, 'energia');
    if (u.moral) add('moral', u.moral, 'ânimo');
    if (u.alcool) add('moral', u.alcool * 2, 'ânimo');
    if (u.higiene) add('moral', 1, 'ânimo');
    if (u.pv) { const antes = p.pv; p.pv = Math.min(p.pvMax, p.pv + u.pv); if (p.pv - antes >= 1) partes.push(`PV +${Math.round(p.pv - antes)}`); }
    if (typeof u.dor === 'number' && u.dor < 0) { p.dor = Math.max(0, p.dor + u.dor); partes.push('dor alivia'); }
    if (typeof u.infeccao === 'number' && u.infeccao < 0) { p.infeccao = Math.max(0, p.infeccao + u.infeccao); partes.push('infecção combatida'); }
    if (u.sangramento === 'estanca' || u.sangramento === 'estanca_membro') { if (p.sangramento) partes.push('sangramento estancado'); p.sangramento = 0; }
    if (u.sangramento === 'estanca_fraco' && p.sangramento) { p.sangramento--; partes.push('sangramento diminui'); }
    if (u.fratura === 'imobiliza') { for (const m of ['perna', 'braco']) if (p.ferida[m] === 2) { p.ferida[m] = 1; partes.push(`${m === 'perna' ? 'perna' : 'braço'} imobilizado(a)`); } }
    if (u.doenca === 'diarreia' || u.doenca === 'alergia' || u.doenca === 'anafilaxia') { if (p.doenca) partes.push('sintomas passam'); p.doenca = 0; }
    this.log(p, t, 'item', `${verbo === 'comer' ? '🍽️' : verbo === 'beber' ? '🥤' : '💊'} Você ${verbo === 'comer' ? 'come' : verbo === 'beber' ? 'bebe' : 'usa'} ${it.nome}${partes.length ? ' (' + partes.join(', ') + ')' : ''}.`);
    if (it.risco && this.rng() < Math.min(0.95, it.risco * P.multTraco(p, 'risco'))) {
      p.doenca = Math.max(p.doenca, 8);
      this.log(p, t, 'perigo', '🤢 Você passa mal depois disso (enjoo e dor de barriga por um tempo).');
    }
  }
  a_comer(p, a, t) { this.consumir(p, a, t, 'comer'); }
  a_beber(p, a, t) { this.consumir(p, a, t, 'beber'); }
  a_usar(p, a, t) { this.consumir(p, a, t, 'usar'); }
  a_equipar(p, a, t) {
    if (!P.temItem(p, a.item)) { this.log(p, t, 'info', `🎒 Você não tem ${nomeItem(a.item)}.`); return; }
    if (P.equipar(p, a.item)) this.log(p, t, 'item', `🧥 Você equipa: ${nomeItem(a.item)}.`); else this.log(p, t, 'info', `🎒 ${nomeItem(a.item)} não pode ser equipado.`);
  }
  a_largar(p, a, t) {
    const q = Math.min(a.qtd || 1, p.inv[a.item] || 0);
    if (!q) { this.log(p, t, 'info', `🎒 Você não tem ${nomeItem(a.item)}.`); return; }
    P.tirar(p, a.item, q); const r = this.reg(p); r.chao[a.item] = (r.chao[a.item] || 0) + q;
    this.log(p, t, 'item', `📥 Você deixa no chão: ${nomeItem(a.item)} x${q}.`);
  }
  a_pegar_chao(p, a, t) {
    const r = this.reg(p), tem = r.chao[a.item] || 0;
    if (!tem) { this.log(p, t, 'info', `📤 Não há ${nomeItem(a.item)} no chão.`); return; }
    const q = Math.min(tem, a.qtd || tem);
    const cabe = P.pegar(p, a.item, q);
    if (cabe) { r.chao[a.item] -= cabe; if (r.chao[a.item] <= 0) delete r.chao[a.item]; const it = infoItem(a.item); if (it && it.estraga && !p.frescor[a.item]) p.frescor[a.item] = this.dia(t); }
    this.log(p, t, 'item', cabe ? `📤 Você pega: ${nomeItem(a.item)} x${cabe}.` : '🎒 Está pesado demais. Largue algo antes.');
  }
  a_tratar(p, a, t) {
    const kit = this.tem(p, ['kit_medico', 'kit_primeiros_socorros']);
    const curativo = ['bandagem', 'atadura', 'curativo', 'gaze'].find(i => P.temItem(p, i));
    if (!kit && !curativo) { this.log(p, t, 'info', '🩹 Você não tem material para tratar ferimentos.'); return; }
    if (!kit) P.tirar(p, curativo, 1);
    const bom = 1 + P.traco(p, 'cuidado') * 0.3 + (p.classe === 'medico' ? 0.5 : 0);
    const partes = [];
    if (p.sangramento) { p.sangramento = 0; partes.push('sangramento estancado'); }
    if (p.infeccao) { p.infeccao = Math.max(0, p.infeccao - Math.round(30 * bom)); partes.push('infecção reduzida'); }
    if ((p.ferida.perna === 2 || p.ferida.braco === 2) && this.tem(p, ['tala', 'kit_medico'])) { for (const m of ['perna', 'braco']) if (p.ferida[m] === 2) p.ferida[m] = 1; partes.push('osso imobilizado'); }
    else for (const m of ['perna', 'braco']) if (p.ferida[m] === 1 && this.rng() < 0.5 * bom) { p.ferida[m] = 0; partes.push(m === 'perna' ? 'perna melhora' : 'braço melhora'); }
    if (p.ferida.cabeca && this.rng() < 0.4 * bom) { p.ferida.cabeca = 0; partes.push('cabeça melhora'); }
    p.pv = Math.min(p.pvMax, p.pv + Math.round(8 * bom));
    this.log(p, t, 'item', '🩹 Você trata seus ferimentos' + (partes.length ? ': ' + partes.join(', ') : '') + '.');
  }


  // ---------- arrombar, barricar, fabricar, armadilhas, abrigo ----------
  a_arrombar(p, a, t) {
    const r = this.reg(p), l = r.locais.find(x => x.id === a.local);
    if (!l) { this.log(p, t, 'info', '🧭 Esse local não existe nesta região.'); return; }
    if (!l.trancado) { this.log(p, t, 'info', `🔓 ${l.nome} já está aberto.`); return; }
    if (this.acessivel(p, l)) { this.log(p, t, 'info', `🔓 Você já tem acesso a ${l.nome}.`); return; }
    let ch = 0.25 + P.atr(p, 'FOR') * 0.03, silencio = false;
    if (P.temItem(p, 'chave_mestra')) { ch = 0.95; silencio = true; }
    else if (P.temItem(p, 'kit_arrombamento')) { ch += 0.4; silencio = true; }
    else if (P.temItem(p, 'pe_de_cabra')) ch += 0.35;
    else if (this.tem(p, ['machado', 'machadinha', 'martelo', 'marreta'])) ch += 0.2;
    if (l.dono) ch -= 0.15;
    const dono = l.dono && this.jog.get(l.dono);
    if (this.rng() < clamp(ch, 0.1, 0.95)) {
      l.trancado = false; l.dono = null;
      this.log(p, t, 'item', `🔓 Você arromba ${l.nome}.`);
      if (dono && dono.vivo) this.log(dono, t, 'perigo', `🔨 Alguém arrombou ${l.nome}, onde você estava barricado!`);
    } else {
      this.log(p, t, 'item', `🔒 ${l.nome} resiste.${!silencio && !this.tem(p, ['pe_de_cabra']) && this.rng() < 0.25 ? ' Você machuca as mãos (-2 PV).' : ''}`);
      if (!silencio && !this.tem(p, ['pe_de_cabra', 'machado', 'machadinha', 'martelo']) && this.rng() < 0.25) this.dano(p, 2, 'ferimentos ao arrombar uma porta');
    }
    if (!silencio) {
      for (const o of this.vivos()) if (o.id !== p.id && !this.dormindoEm(o, t) && M.distancia(this.mundo, o.regiao, p.regiao) <= 1) this.log(o, t, 'info', '🔨 Você ouve barulho de arrombamento' + (o.regiao === p.regiao ? ' bem perto.' : ' ao longe.'));
    }
  }
  a_barricar(p, a, t) {
    const r = this.reg(p), l = p.local && r.locais.find(x => x.id === p.local);
    if (!l || LOCAIS[l.tipo].tipo === 'natural') { this.log(p, t, 'info', '🚪 Para barricar, entre antes num prédio ou veículo ("Ir").'); return; }
    if (l.dono && l.dono !== p.id) { this.log(p, t, 'info', '🚪 Alguém já barricou este local.'); return; }
    if ((p.inv.tabua || 0) >= 2) P.tirar(p, 'tabua', 2); else if (P.temItem(p, 'cadeado')) P.tirar(p, 'cadeado', 1);
    else { this.log(p, t, 'info', '🚪 Você precisa de 2 tábuas ou um cadeado para barricar.'); return; }
    l.trancado = true; l.dono = p.id;
    this.log(p, t, 'item', `🚪 Você barrica ${l.nome} por dentro. Quem quiser entrar vai ter que arrombar.`);
  }
  temFerr(p, tags) { return tags.every(tg => P.temTag(p, tg)); }
  a_fabricar(p, a, t) {
    const R = RECEITAS[a.receita];
    if (!R) return;
    for (const id in R.ing) if (!P.temItem(p, id, R.ing[id])) { this.log(p, t, 'info', `🛠️ Faltam materiais para "${R.nome}": precisa de ${Object.keys(R.ing).map(i => nomeItem(i) + ' x' + R.ing[i]).join(', ')}.`); return; }
    if (!this.temFerr(p, R.ferr)) { this.log(p, t, 'info', `🛠️ Para "${R.nome}" você precisa de uma lâmina/ferramenta de corte.`); return; }
    for (const id in R.ing) P.tirar(p, id, R.ing[id]);
    for (const id in R.res) this.ganhar(p, id, R.res[id], t);
    this.log(p, t, 'item', `🛠️ Você fabrica: ${R.nome}.`);
  }
  a_armar_armadilha(p, a, t) {
    const it = infoItem(a.item);
    if (!it || !it.tags.includes('armadilha') || !P.temItem(p, a.item)) { this.log(p, t, 'info', '🪤 Você não tem essa armadilha.'); return; }
    const r = this.reg(p);
    if (r.armadilhas.filter(x => x.dono === p.id).length >= 3) { this.log(p, t, 'info', '🪤 Você já tem 3 armadilhas aqui.'); return; }
    P.tirar(p, a.item, 1);
    r.armadilhas.push({ dono: p.id, item: a.item, presa: 0, vista: {} });
    this.log(p, t, 'item', `🪤 Você arma: ${it.nome}. Cuidado para não pisar nela. Presas aparecem na próxima rodada.`);
  }
  a_recolher(p, a, t) {
    const r = this.reg(p); let n = 0;
    for (const tr of r.armadilhas) if (tr.dono === p.id && tr.presa > 0) { n += tr.presa; tr.presa = 0; }
    if (!n) { this.log(p, t, 'info', '🪤 Nenhuma presa nas suas armadilhas desta região.'); return; }
    this.ganhar(p, 'carne_crua', n, t);
    this.log(p, t, 'loot', `🪤 Você recolhe ${n} presa(s): carne crua x${n}. Cozinhe antes de comer.`);
  }
  a_construir_abrigo(p, a, t) {
    const r = this.reg(p);
    if (P.temItem(p, 'lona')) P.tirar(p, 'lona', 1);
    else if ((p.inv.galho || 0) >= 4 && this.tem(p, ['pano', 'lencol', 'cobertor'])) { P.tirar(p, 'galho', 4); P.tirar(p, ['pano', 'lencol', 'cobertor'].find(i => P.temItem(p, i)), 1); }
    else { this.log(p, t, 'info', '⛺ Para um abrigo você precisa de uma lona, ou 4 galhos e um pano/lençol/cobertor.'); return; }
    r.abrigos.push({ dono: p.id });
    this.log(p, t, 'item', '⛺ Você monta um abrigo. Quem estiver nesta região fica protegido do frio.');
  }
  abrigado(p) {
    const r = this.reg(p);
    if (r.abrigos.length) return true;
    const l = p.local && r.locais.find(x => x.id === p.local);
    return !!(l && LOCAIS[l.tipo].tipo !== 'natural');
  }
  armadilhasRodada() {
    for (const r of this.mundo.regioes) {
      if (!r.armadilhas.length) continue;
      if (r.caca == null) r.caca = CACA_TEMA[r.tema] || 0;
      for (const tr of r.armadilhas) {
        if (r.caca > 0 && this.rng() < (tr.item === 'armadilha_urso' ? 0.4 : 0.3)) { tr.presa += 1 + (tr.item === 'armadilha_urso' && this.rng() < 0.4 ? 1 : 0); r.caca--; }
      }
    }
  }
  armadilhasTurno(t) {
    for (const p of this.vivos()) {
      const r = this.reg(p);
      for (let i = r.armadilhas.length - 1; i >= 0; i--) {
        const tr = r.armadilhas[i], dono = this.jog.get(tr.dono);
        if (tr.dono === p.id || tr.vista[p.id] || (dono && this.aliados(p, dono))) continue;
        if (this.rng() > 0.22) continue;
        if (this.rng() < 0.15 + P.atr(p, 'AST') * 0.04) { tr.vista[p.id] = true; this.log(p, t, 'perigo', '🪤 Você nota uma armadilha a tempo e a evita.'); continue; }
        r.armadilhas.splice(i, 1);
        const urso = tr.item === 'armadilha_urso', dmg = urso ? this.entre(10, 18) : this.entre(2, 5);
        this.dano(p, dmg, `armadilha armada por ${dono ? dono.nome : 'alguém'}`);
        p.dor = clamp(p.dor + dmg * 1.5, 0, 100);
        if (urso) { p.ferida.perna = Math.max(p.ferida.perna, dmg >= 16 ? 2 : 1); p.sangramento = Math.min(2, p.sangramento + 1); }
        this.log(p, t, 'perigo', `🪤 CLAC! Você pisa numa ${urso ? 'armadilha de urso' : 'armadilha de laço'}: -${dmg} PV${urso ? ', perna ferida e sangrando' : ''}.`);
        if (dono && dono.vivo && dono.id !== p.id) this.log(dono, t, 'social', `🪤 Sua armadilha pegou ${p.nome}!`);
        if (p.pv <= 0) this.matar(p, `armadilha armada por ${dono ? dono.nome : 'alguém'}`, t, dono);
      }
    }
  }

  // fogo, comida, água
  temFogo(p, t, consumir) {
    const r = this.reg(p);
    if (r.fogueiraAte > this.tAbs(t)) return 'fogueira';
    const l = p.local && r.locais.find(x => x.id === p.local);
    if (l && ['casa', 'apartamento', 'restaurante', 'fazenda', 'acampamento'].includes(l.tipo) && (r.luz !== false || l.tipo === 'acampamento')) return 'cozinha';
    if (this.tem(p, ISQUEIROS) && P.temItem(p, 'lenha')) { if (consumir) P.tirar(p, 'lenha', 1); return 'lenha'; }
    return null;
  }
  a_fogueira(p, a, t) {
    if (!this.tem(p, ISQUEIROS) || (p.inv.lenha || 0) < 2) { this.log(p, t, 'info', '🔥 Para fazer fogueira você precisa de isqueiro ou fósforos e 2 lenhas.'); return; }
    P.tirar(p, 'lenha', 2); this.reg(p).fogueiraAte = this.tAbs(t) + 6;
    this.log(p, t, 'item', '🔥 Você acende uma fogueira. Ela dura cerca de 2 dias e chama atenção.');
  }
  a_cozinhar(p, a, t) {
    const it = infoItem(a.item);
    if (!it || !it.cozinhar || !P.temItem(p, a.item)) { this.log(p, t, 'info', '🍳 Isso não dá para cozinhar (ou você não tem).'); return; }
    const fonte = this.temFogo(p, t, true);
    if (!fonte) { this.log(p, t, 'info', '🍳 Sem fogo: acenda uma fogueira, use uma cozinha com luz, ou tenha isqueiro e lenha.'); return; }
    P.tirar(p, a.item, 1);
    const q = (p.classe === 'cozinheiro' && this.rng() < 0.25) ? 2 : 1;
    const id = a.item + '_cozido';
    this.ganhar(p, id, q, t);
    this.log(p, t, 'item', `🍳 Você cozinha ${it.nome}${q > 1 ? ' e rende o dobro (mão de cozinheiro!)' : ''}.`);
  }
  a_purificar(p, a, t) {
    if (!P.temItem(p, 'agua_rio')) { this.log(p, t, 'info', '💧 Você não tem água suja para purificar.'); return; }
    const pastilha = this.tem(p, ['pastilha_purificadora', 'purificador_agua']);
    if (!pastilha && !this.temFogo(p, t, true)) { this.log(p, t, 'info', '💧 Sem pastilha e sem fogo para ferver a água.'); return; }
    const q = Math.min(2, p.inv.agua_rio);
    P.tirar(p, 'agua_rio', q); if (P.temItem(p, 'pastilha_purificadora')) P.tirar(p, 'pastilha_purificadora', 1);
    this.ganhar(p, 'agua_garrafa', q, t);
    this.log(p, t, 'item', `💧 Você purifica ${q} água(s). Agora dá para beber.`);
  }
  aguaEncanada(r, t) { return this.dia(t) < r.apagaDia + 4; }
  a_coletar_agua(p, a, t) {
    const r = this.reg(p);
    const predios = r.locais.filter(l => LOCAIS[l.tipo].tipo === 'predio');
    const lago = r.locais.some(l => l.tipo === 'lago');
    const torneira = predios.length && this.aguaEncanada(r, t);
    if (!torneira && !lago) { this.log(p, t, 'info', predios.length ? '💧 A água encanada secou e não há lago por perto.' : '💧 Não há torneira nem lago nesta região.'); return; }
    let n = 0;
    const limpa = !!torneira;
    if (limpa) { const antes = p.sede; p.sede = clamp(p.sede + 45, 0, 100); this.fluxar(p, { sede: antes }); if (p.sede - antes >= 5) this.log(p, t, 'item', `🚰 Você bebe direto da torneira (sede +${Math.round(p.sede - antes)}).`); }
    if (P.temItem(p, 'cantil')) n += 2;
    for (const c of ['garrafa_vazia', 'garrafa_plastica']) { const q = Math.min(p.inv[c] || 0, Math.max(0, 3 - n)); if (q > 0) { P.tirar(p, c, q); n += q; } }
    if (!n) { if (!limpa) this.log(p, t, 'info', '💧 Você não tem garrafa vazia nem cantil para encher.'); return; }
    this.ganhar(p, limpa ? 'agua_garrafa' : 'agua_rio', n, t);
    this.log(p, t, 'item', limpa ? `🚰 Você enche ${n} recipiente(s) com água limpa.` : `💧 Você enche ${n} recipiente(s) com água do lago (suja: purifique antes de beber).`);
  }
  a_pescar(p, a, t) {
    const r = this.reg(p), lago = r.locais.find(l => l.tipo === 'lago') || (r.tema === 'praia' ? (r.pescaMar = r.pescaMar || { pesca: 0 }) : null);
    const kit = this.tem(p, ['kit_pesca', 'rede_pesca']) || (P.temItem(p, 'vara_pesca') && P.temItem(p, 'anzol_linha'));
    if (!lago) { this.log(p, t, 'info', '🎣 Não há lago nem mar nesta região.'); return; }
    if (!kit) { this.log(p, t, 'info', '🎣 Você precisa de equipamento de pesca.'); return; }
    const ch = (0.4 + P.atr(p, 'AST') * 0.02 + (p.classe === 'cacador' ? 0.1 : 0)) * Math.pow(0.93, lago.pesca || 0);
    lago.pesca = (lago.pesca || 0) + 1;
    if (this.rng() < ch) { const q = this.rng() < 0.3 ? 2 : 1; this.ganhar(p, 'peixe_pequeno', q, t); this.log(p, t, 'loot', `🎣 Você pesca ${q} peixe(s).`); }
    else this.log(p, t, 'loot', '🎣 Nada mordeu o anzol.');
  }
  a_cacar(p, a, t) {
    const r = this.reg(p);
    if (r.caca == null) r.caca = CACA_TEMA[r.tema] || 0;
    const armas = Object.keys(p.inv).map(infoItem).filter(i => i && (i.tags.includes('arma_distancia') || i.tags.includes('arma_fogo')) && i.municao && (i.municao === 'pedra' ? P.temItem(p, 'pedra') : P.temItem(p, i.municao)));
    if (!armas.length) { this.log(p, t, 'info', '🏹 Você precisa de uma arma à distância com munição (ou estilingue e pedras).'); return; }
    const arma = armas.sort((x, y) => y.dano[1] - x.dano[1])[0];
    P.tirar(p, arma.municao, 1);
    if (arma.tags.includes('arma_fogo')) this._barulho(r.id, p, t);
    if (r.caca <= 0) { this.log(p, t, 'loot', '🏹 Você procura por horas, mas não há mais animais por aqui.'); return; }
    const ch = 0.3 + P.atr(p, 'AGI') * 0.04 + (p.classe === 'cacador' ? 0.15 : 0) + (arma.dano[1] >= 12 ? 0.15 : 0);
    if (this.rng() < clamp(ch, 0.1, 0.9) && (arma.dano[1] >= 6 || this.rng() < 0.4)) {
      r.caca--; const q = this.entre(1, arma.dano[1] >= 12 ? 3 : 2);
      this.ganhar(p, 'carne_crua', q, t);
      this.log(p, t, 'loot', `🏹 Caça bem-sucedida com ${arma.nome}: carne crua x${q}. Cozinhe antes de comer.`);
      if (r.tema === 'rural') p.moral = clamp(p.moral - 3, 0, 100);
    } else this.log(p, t, 'loot', `🏹 A presa escapa. (${arma.nome})`);
  }

  // social
  a_falar(p, a, t) {
    const o = this.alvoPresente(p, a, t, false); if (!o) return;
    this.log(o, t, 'fala', `💬 ${p.nome} diz: “${a.texto}”`);
    this.log(p, t, 'fala', `💬 Você diz a ${o.nome}: “${a.texto}”`);
    if (!o.conhecidos.includes(p.id)) o.conhecidos.push(p.id);
    if (!p.conhecidos.includes(o.id)) p.conhecidos.push(o.id);
  }
  a_dar(p, a, t) {
    const o = this.alvoPresente(p, a, t, false); if (!o) return;
    const q = Math.min(a.qtd || 1, p.inv[a.item] || 0);
    if (!q) { this.log(p, t, 'info', `🎒 Você não tem ${nomeItem(a.item)}.`); return; }
    P.tirar(p, a.item, q);
    const cabe = this.ganhar(o, a.item, q, t);
    this.log(p, t, 'social', `🎁 Você entrega ${nomeItem(a.item)} x${q} a ${o.nome}.`);
    this.log(o, t, 'social', `🎁 ${p.nome} entrega a você: ${nomeItem(a.item)} x${q}${cabe < q ? ' (parte ficou no chão por falta de espaço)' : ''}.`);
    p.moral = clamp(p.moral + 1, 0, 100); o.moral = clamp(o.moral + 2, 0, 100);
  }
  a_furtar(p, a, t) {
    const o = this.alvoPresente(p, a, t, true); if (!o) return;
    const ids = Object.keys(o.inv).filter(i => o.equip.maos !== i && o.equip[(infoItem(i) || {}).slot] !== i);
    if (!ids.length) { this.log(p, t, 'info', `🕵️ ${o.nome} não tem nada fácil de pegar.`); return; }
    const dormindo = this.dormindoEm(o, t);
    const meu = P.atr(p, 'AGI') + this.d20() + P.traco(p, 'furtivo');
    const dele = dormindo ? 0 : P.atr(o, 'AST') + this.d20();
    if (meu >= dele) {
      const id = ids[Math.floor(this.rng() * ids.length)];
      P.tirar(o, id, 1); this.ganhar(p, id, 1, t);
      this.log(p, t, 'social', `🕵️ Você furta ${nomeItem(id)} de ${o.nome} sem ele perceber.`);
      if (this.rng() < 0.25) this.log(o, t, 'perigo', `🕵️ Você sente falta de algo na sua mochila: ${nomeItem(id)}...`);
    } else {
      this.log(p, t, 'social', `🕵️ ${o.nome} pega você com a mão na massa!`);
      this.log(o, t, 'perigo', `🕵️ Você flagra ${p.nome} tentando furtar você!`);
    }
  }
  a_propor(p, a, t) {
    const o = this.alvoPresente(p, a, t, false); if (!o) return;
    const tipo = a.tipoAcordo;
    if (tipo === 'alianca' && this.aliados(p, o)) { this.log(p, t, 'info', `🤝 Você e ${o.nome} já são aliados.`); return; }
    if (tipo === 'alianca' && (p.aliados.length + 1 >= this.cfg.aliancaMax || o.aliados.length + 1 >= this.cfg.aliancaMax)) { this.log(p, t, 'info', '🤝 O limite de tamanho da aliança foi atingido.'); return; }
    if (this.propostas.some(x => x.estado === 'pendente' && x.de === p.id && x.para === o.id && x.tipo === tipo)) { this.log(p, t, 'info', '🤝 Você já fez essa proposta.'); return; }
    this.propostas.push({ id: this.proxProp++, de: p.id, para: o.id, tipo, estado: 'pendente', ate: this.rodada + 1 });
    this.log(p, t, 'social', `🤝 Você propõe ${tipo === 'alianca' ? 'uma ALIANÇA' : 'uma TRÉGUA'} a ${o.nome}. Ele(a) responde na próxima rodada.`);
    this.log(o, t, 'social', `🤝 ${p.nome} propõe ${tipo === 'alianca' ? 'uma ALIANÇA' : 'uma TRÉGUA'}. Você pode aceitar ou recusar no próximo planejamento.`);
  }
  a_romper(p, a, t) {
    const o = this.jog.get(a.alvo); if (!o) return;
    const tinha = this.aliados(p, o) || this.emTregua(p, o);
    p.aliados = p.aliados.filter(x => x !== o.id); o.aliados = o.aliados.filter(x => x !== p.id);
    delete p.tregua[o.id]; delete o.tregua[p.id];
    if (tinha) { this.log(p, t, 'social', `✂️ Você rompe o acordo com ${o.nome}.`); this.log(o, t, 'social', `✂️ ${p.nome} rompeu o acordo com você.`); }
  }
  quebrarAcordo(p, o, t) {
    const era = this.aliados(p, o) ? 'a aliança' : this.emTregua(p, o) ? 'a trégua' : null;
    if (!era) return;
    p.aliados = p.aliados.filter(x => x !== o.id); o.aliados = o.aliados.filter(x => x !== p.id);
    delete p.tregua[o.id]; delete o.tregua[p.id];
    this.pub('traicao', `💔 TRAIÇÃO! ${p.nome} quebrou ${era} e atacou ${o.nome}.`);
    p.moral = clamp(p.moral - 8, 0, 100);
  }
  a_atacar(p, a, t) {
    const o = this.alvoPresente(p, a, t, true); if (!o) return;
    this.quebrarAcordo(p, o, t);
    this.lutar(p, o, t, { surpresa: !this.ve(o, p, t) });
  }
  a_emboscar(p, a, t) {
    const o = this.alvoPresente(p, a, t, true); if (!o) return;
    this.quebrarAcordo(p, o, t);
    if (!p.escondidoAntes) { this.lutar(p, o, t, { surpresa: !this.ve(o, p, t) }); return; }
    this.lutar(p, o, t, { emboscada: true });
  }
  a_escapar(p, a, t) {
    if (!this.cfg.escape || p.fragmentos < 3 || p.regiao !== this.mundo.saida) { this.log(p, t, 'info', '🌀 Você não sabe para onde ir.'); return; }
    p.escapou = true;
    this.log(p, t, 'fim', '🌌 Você atravessa. Tudo fica branco, depois silencioso. Você escapou — para quem ficou, você simplesmente sumiu.');
    this.pub('desaparecido', `🌫️ ${p.nome} desapareceu sem deixar rastros. (Dia ${this.dia(t)})`);
    for (const o of this.jog.values()) o.aliados = o.aliados.filter(x => x !== p.id);
    p.aliados = [];
  }

  // respostas a propostas (fora da resolução)
  responder(pid, propId, aceitar) {
    const pr = this.propostas.find(x => x.id === propId);
    const p = this.jog.get(pid);
    if (!pr || !p || pr.para !== pid || pr.estado !== 'pendente') return { erro: 'Proposta inválida.' };
    const de = this.jog.get(pr.de);
    if (!de || !de.vivo || de.escapou || !p.vivo) { pr.estado = 'expirada'; return { erro: 'Essa pessoa não está mais no jogo.' }; }
    if (!aceitar) { pr.estado = 'recusada'; this.mensagem(de, `✋ ${p.nome} recusou sua proposta de ${pr.tipo === 'alianca' ? 'aliança' : 'trégua'}.`); return { ok: true }; }
    if (pr.tipo === 'alianca') {
      if (p.aliados.length + 1 >= this.cfg.aliancaMax || de.aliados.length + 1 >= this.cfg.aliancaMax) return { erro: 'Limite de tamanho da aliança atingido.' };
      p.aliados.push(de.id); de.aliados.push(p.id);
      this.pub('alianca', `🤝 ${de.nome} e ${p.nome} formaram uma aliança.`);
    } else {
      p.tregua[de.id] = de.tregua[p.id] = this.rodada + this.cfg.tregua;
      this.pub('tregua', `🕊️ ${de.nome} e ${p.nome} firmaram uma trégua.`);
    }
    pr.estado = 'aceita';
    this.mensagem(de, `✅ ${p.nome} aceitou sua proposta de ${pr.tipo === 'alianca' ? 'aliança' : 'trégua'}!`);
    return { ok: true };
  }
  mensagem(p, texto) { (p.avisos = p.avisos || []).push({ rodada: this.rodada, texto }); if (p.avisos.length > 20) p.avisos.shift(); }

  // ---------- o que o jogador PODE fazer agora (a tela só mostra isso) ----------
  disponiveis(p) {
    const r = this.reg(p), d = {};
    const predios = r.locais.filter(l => LOCAIS[l.tipo].tipo === 'predio');
    const lago = r.locais.some(l => l.tipo === 'lago');
    d.agua = !!((predios.length && (this.rodada + 1) < r.apagaDia + 4) || lago);
    d.aguaTipo = predios.length && (this.rodada + 1) < r.apagaDia + 4 ? 'torneira' : lago ? 'lago' : null;
    d.pescar = !!(lago || r.tema === 'praia') && !!(this.tem(p, ['kit_pesca', 'rede_pesca']) || (P.temItem(p, 'vara_pesca') && P.temItem(p, 'anzol_linha')));
    d.cacar = Object.keys(p.inv).map(infoItem).some(i => i && (i.tags.includes('arma_distancia') || i.tags.includes('arma_fogo')) && i.municao && (i.municao === 'pedra' ? P.temItem(p, 'pedra') : P.temItem(p, i.municao)));
    d.fogueira = this.tem(p, ISQUEIROS) && (p.inv.lenha || 0) >= 2;
    const fogoDisp = r.fogueiraAte > this.rodada * T || (this.tem(p, ISQUEIROS) && P.temItem(p, 'lenha')) || (predios.some(l => ['casa', 'apartamento', 'restaurante', 'fazenda', 'acampamento'].includes(l.tipo)) && r.luz !== false);
    d.cozinhar = fogoDisp;
    d.purificar = P.temItem(p, 'agua_rio') && (this.tem(p, ['pastilha_purificadora', 'purificador_agua']) || fogoDisp);
    d.abrigo = P.temItem(p, 'lona') || ((p.inv.galho || 0) >= 4 && this.tem(p, ['pano', 'lencol', 'cobertor']));
    d.barricar = predios.length > 0 && ((p.inv.tabua || 0) >= 2 || P.temItem(p, 'cadeado'));
    d.tratar = this.tem(p, ['kit_medico', 'kit_primeiros_socorros']) || ['bandagem', 'atadura', 'curativo', 'gaze'].some(i => P.temItem(p, i));
    d.recolher = r.armadilhas.some(x => x.dono === p.id && x.presa > 0);
    return d;
  }

  // ---------- o que cada jogador pode ver ----------
  visao(pid) {
    const p = this.jog.get(pid);
    if (!p) return null;
    const r = this.mundo.regioes[p.regiao];
    const vivo = p.vivo && !p.escapou;
    const pa = P.calcPA(p, this.cfg);
    const ag = montarAgenda(p, pa, p.fila);
    const inv = Object.keys(p.inv).map(id => {
      const it = infoItem(id) || {};
      const resta = it.estraga && p.frescor[id] ? Math.max(0, Math.ceil(diasAteEstragar(it) - (this.diaAtual() - p.frescor[id]))) : null;
      return { id, nome: it.nome || id, qtd: p.inv[id], peso: it.peso || 0, equipado: Object.values(p.equip).includes(id), slot: it.slot || null, dano: it.dano || null,
        uso: it.uso || null, icone: iconeItem(id, it), cozinha: !!it.cozinhar, efeito: it.efeito || null, risco: it.risco || 0, diasRestantes: resta, tags: it.tags || [] };
    });
    const conhecido = (o) => ({ id: o.id, nome: o.nome, aliado: this.aliados(p, o), tregua: this.emTregua(p, o) });
    const viz = M.vizinhas(this.mundo, p.regiao);
    const propsPara = this.propostas.filter(x => x.para === pid && x.estado === 'pendente').map(x => ({ id: x.id, de: x.de, deNome: this.nome(x.de), tipo: x.tipo }));
    const propsDe = this.propostas.filter(x => x.de === pid && x.estado === 'pendente').map(x => ({ id: x.id, para: x.para, paraNome: this.nome(x.para), tipo: x.tipo }));
    return {
      rodada: this.rodada, diaInicio: this.rodada + 1, fim: this.fim, resultado: this.resultado,
      voce: {
        id: p.id, nome: p.nome, classe: p.classe, classeNome: (P.CLASSES[p.classe] || {}).nome, descricao: p.descricao, atributos: p.atributos,
        atributosEfetivos: { FOR: P.atr(p, 'FOR'), AGI: P.atr(p, 'AGI'), AST: P.atr(p, 'AST'), CAR: P.atr(p, 'CAR') },
        tracos: p.tracos.map(id => P.TRACOS.find(x => x.id === id)).map(x => ({ nome: x.nome, desc: x.desc })),
        vivo: p.vivo, escapou: p.escapou, causa: p.causa,
        pv: Math.round(p.pv), pvMax: p.pvMax, fome: Math.round(p.fome), sede: Math.round(p.sede), energia: Math.round(p.energia), moral: Math.round(p.moral), dor: Math.round(p.dor),
        sangramento: p.sangramento, infeccao: Math.round(p.infeccao), doenca: p.doenca, ferida: p.ferida,
        estados: P.estados(p), frio: p.frio || 0, calor: p.calor || 0, temp: p.temp != null ? p.temp : null, penalidades: P.penalidades(p), pa, paBase: this.cfg.pa,
        peso: P.pesoTotal(p), capacidade: Math.round(P.capacidade(p) * 10) / 10, protecao: P.protecao(p),
        fragmentos: p.fragmentos, postura: p.postura, escondido: p.escondido, local: p.local,
        podeEscapar: !!(this.cfg.escape && vivo && p.fragmentos >= 3 && p.regiao === this.mundo.saida),
        aliados: p.aliados.map(id => ({ id, nome: this.nome(id), regiao: (this.jog.get(id) || {}).regiao })),
        kills: p.kills,
      },
      inventario: inv,
      regiao: {
        id: r.id, nome: r.nome, icone: r.icone, x: r.x, y: r.y, neblina: r.neblina, luz: r.luz !== false, fogueira: r.fogueiraAte > ((this.rodada) * T), tema: r.tema, temp: M.temperatura(r, this.diaAtual(), 0), abrigo: r.abrigos.length > 0,
        armadilhas: r.armadilhas.filter(x => x.dono === pid).map(x => ({ item: nomeItem(x.item), presa: x.presa })),
        locais: r.locais.map(l => ({ id: l.id, nome: l.nome, icone: l.icone, trancado: !this.acessivel(p, l), barricada: !!l.dono, cmdVasculhados: Object.keys(l.vasculhados).length, cmdTotal: LOCAIS[l.tipo].comodos.length })),
        vizinhas: Object.keys(viz).reduce((o, d) => { const v = this.mundo.regioes[viz[d]]; o[d] = { id: v.id, nome: v.nome, icone: v.icone, neblina: v.neblina }; return o; }, {}),
        chao: Object.keys(r.chao).filter(k => r.chao[k] > 0).map(k => ({ id: k, nome: nomeItem(k), qtd: r.chao[k] })),
      },
      mapa: { N: this.mundo.N, seed: this.mundo.seed, regioes: this.mundo.regioes.map(g => ({ id: g.id, x: g.x, y: g.y, tema: g.tema, icone: g.icone, nome: g.nome, neblina: g.neblina, luz: g.luz !== false, marcos: g.locais.map(l => l.tipo) })), estagio: this.mundo.estagioNeblina, estagioMax: M.estagioMax(this.mundo), pista: p.pista },
      presentes: vivo ? (p.presentes || []).map(id => this.jog.get(id)).filter(o => o && o.vivo && !o.escapou && o.regiao === p.regiao).map(conhecido) : [],
      jogadores: [...this.jog.values()].map(o => ({ id: o.id, nome: o.nome, estado: o.escapou ? 'desaparecido' : o.vivo ? 'vivo' : 'morto', causa: o.vivo || o.escapou ? null : o.causa, aliado: this.aliados(p, o), classeNome: (P.CLASSES[o.classe] || {}).nome })),
      receitas: Object.keys(RECEITAS).map(k => ({ id: k, nome: RECEITAS[k].nome, custo: RECEITAS[k].custo, ing: Object.keys(RECEITAS[k].ing).map(i => nomeItem(i) + ' x' + RECEITAS[k].ing[i]).join(', '), ferr: RECEITAS[k].ferr.length > 0, pode: Object.keys(RECEITAS[k].ing).every(i => P.temItem(p, i, RECEITAS[k].ing[i])) && RECEITAS[k].ferr.every(tg => P.temTag(p, tg)) })),
      fila: p.fila, previa: ag.itens.map(i => ({ inicio: Math.round(i.inicio * 100) / 100, fim: Math.round(i.fim * 100) / 100, custo: Math.round(i.custo * 100) / 100, estado: i.estado })), usado: ag.usado,
      postura: p.postura, disp: vivo ? this.disponiveis(p) : {}, taxas: { fome: 25, sede: 34, energia: REGRAS.ENERGIA_POR_TURNO * T },
      propostasRecebidas: propsPara, propostasEnviadas: propsDe,
      historico: p.hist, avisos: p.avisos || [], publico: this.publico.slice(-40),
    };
  }
  diaAtual() { return this.rodada + 1; }

  // ---------- salvar / carregar ----------
  exportar() {
    return {
      versao: REGRAS.VERSAO, cfg: this.cfg, mundo: this.mundo, total: this.total, rodada: this.rodada, fim: this.fim, vencedor: this.vencedor, resultado: this.resultado,
      publico: this.publico, propostas: this.propostas, proxProp: this.proxProp,
      jog: [...this.jog.values()].map(p => { const c = Object.assign({}, p); delete c.agenda; delete c.proximaFila; return c; }),
    };
  }
  static importar(d) {
    const j = Object.create(Jogo.prototype);
    Object.assign(j, { cfg: d.cfg, mundo: d.mundo, total: d.total, rodada: d.rodada, fim: d.fim, vencedor: d.vencedor, resultado: d.resultado, publico: d.publico, propostas: d.propostas, proxProp: d.proxProp });
    j.rng = criarRng((Date.now() ^ (d.rodada * 7919)) & 0x7fffffff);
    j.jog = new Map(d.jog.map(p => [p.id, p]));
    return j;
  }
}

module.exports = { Jogo, ACOES };
