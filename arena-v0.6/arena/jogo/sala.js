'use strict';
// =====================================================================
//  SALA: cuida de jogadores, fases (espera → criação → jogo → fim),
//  tempo das rodadas e do que cada um pode ver.
//  Não conhece sockets: recebe funções "enviar" prontas.
// =====================================================================
const { OPCOES, REGRAS, configPadrao, limparConfig } = require('./config');
const M = require('./mundo');
const P = require('./personagem');
const { Jogo } = require('./motor');
const { ACOES, POSTURAS, sanitizarFila } = require('./acoes');
const { criarRng } = require('../data/sorteio');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const NOME_OK = /^[\p{L}\p{N} _.\-]+$/u;

function codigoAleatorio() { let c = ''; for (let i = 0; i < 4; i++) c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]; return c; }
function token() { let t = ''; for (let i = 0; i < 24; i++) t += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]; return t; }

class Sala {
  constructor(codigo, opc) {
    opc = opc || {};
    this.codigo = codigo;
    this.agendar = opc.agendar || ((fn, ms) => setTimeout(fn, ms));
    this.cancelar = opc.cancelar || ((h) => clearTimeout(h));
    this.agora = opc.agora || (() => Date.now());
    this.min = opc.minJogadores != null ? opc.minJogadores : REGRAS.MIN_JOGADORES;
    this.seed = opc.seed;
    this.jogadores = new Map();
    this.fase = 'lobby';
    this.cfg = configPadrao();
    this.timer = null; this.prazo = null;
    this.jogo = null; this.pers = null; this.mundo = null;
    this.proxId = 1;
    this.criada = this.agora();
    this.ultima = this.criada;
    this.aoMudar = null;
  }

  // ---------- jogadores ----------
  limparNome(n) {
    n = String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, REGRAS.TAMANHO_NOME);
    if (!n) return { erro: 'Digite um nome para o seu personagem.' };
    if (!NOME_OK.test(n)) return { erro: 'Use só letras, números, espaço, _ . ou -.' };
    return { nome: n };
  }
  entrar(nome, enviar) {
    const r = this.limparNome(nome); if (r.erro) return r;
    if (this.fase !== 'lobby') return { erro: 'A partida desta sala já começou.' };
    if (this.jogadores.size >= REGRAS.MAX_JOGADORES) return { erro: 'Sala cheia.' };
    if ([...this.jogadores.values()].some(j => j.nome.toLowerCase() === r.nome.toLowerCase())) return { erro: 'Já existe alguém com esse nome na sala.' };
    const j = { id: 'j' + this.proxId++, token: token(), nome: r.nome, host: this.jogadores.size === 0, conectado: true, enviar, chat: [], ultimoChat: 0 };
    this.jogadores.set(j.id, j);
    this.ultima = this.agora();
    this.difundir();
    return { jogador: j };
  }
  reconectar(tok, enviar) {
    const j = [...this.jogadores.values()].find(x => x.token === tok);
    if (!j) return { erro: 'Não encontrei seu personagem nesta sala.' };
    j.conectado = true; j.enviar = enviar; this.ultima = this.agora();
    this.difundir();
    return { jogador: j };
  }
  desconectar(pid) {
    const j = this.jogadores.get(pid); if (!j) return;
    j.conectado = false; j.enviar = null; this.ultima = this.agora();
    if (this.fase === 'lobby') this.passarHost();
    this.difundir();
    this.checarAntecipado();
  }
  passarHost() {
    const atual = [...this.jogadores.values()].find(x => x.host);
    if (atual && atual.conectado) return;
    const prox = [...this.jogadores.values()].find(x => x.conectado);
    if (prox) { for (const x of this.jogadores.values()) x.host = false; prox.host = true; }
  }
  sair(pid) {
    const j = this.jogadores.get(pid); if (!j) return;
    if (this.fase === 'lobby') { this.jogadores.delete(pid); this.passarHost(); this.difundir(); }
    else this.desconectar(pid);
  }
  ehHost(pid) { const j = this.jogadores.get(pid); return !!(j && j.host); }
  vazia() { return [...this.jogadores.values()].every(j => !j.conectado); }

  // ---------- espera ----------
  configurar(pid, entrada) {
    if (!this.ehHost(pid)) return { erro: 'Só o anfitrião pode mudar as configurações.' };
    if (this.fase !== 'lobby') return { erro: 'Não dá para mudar depois que a partida começou.' };
    this.cfg = limparConfig(entrada, this.cfg);
    this.difundir();
    return { ok: true };
  }
  iniciar(pid) {
    if (!this.ehHost(pid)) return { erro: 'Só o anfitrião pode iniciar.' };
    if (this.fase !== 'lobby') return { erro: 'A partida já começou.' };
    if (this.jogadores.size < this.min) return { erro: `Precisa de pelo menos ${this.min} jogadores.` };
    const rng = criarRng(this.seed == null ? (Date.now() & 0x7fffffff) : this.seed);
    this.mundo = M.gerarMundo(rng);
    this.pers = new Map();
    for (const j of this.jogadores.values()) {
      const p = P.novoPersonagem(j.id, j.nome, Math.random);
      p.rolou = false; p.atributos = null; p.tracos = [];
      p.inicio = null;
      this.pers.set(j.id, p);
    }
    this.fase = 'criacao';
    this.iniciarTimer(this.cfg.tempoCriacao * 1000, () => this.comecarJogo());
    this.difundir();
    return { ok: true };
  }

  // ---------- criação ----------
  criarAtualizar(pid, d) {
    if (this.fase !== 'criacao') return { erro: 'Não é hora de criar personagem.' };
    const p = this.pers.get(pid); if (!p || p.pronto) return { erro: 'Você já marcou como pronto.' };
    if (d && typeof d === 'object') {
      if (typeof d.classe === 'string' && P.CLASSES[d.classe]) p.classe = d.classe;
      if (typeof d.descricao === 'string') p.descricao = d.descricao.replace(/[\u0000-\u001f]/g, ' ').slice(0, 140);
      if (d.inicio === 'sorteio' || d.inicio === null) p.inicio = null;
      else if (Number.isInteger(d.inicio) && d.inicio >= 0 && d.inicio < this.mundo.regioes.length) p.inicio = d.inicio;
    }
    this.difundir();
    return { ok: true };
  }
  criarRolar(pid) {
    if (this.fase !== 'criacao') return { erro: 'Não é hora de criar personagem.' };
    const p = this.pers.get(pid); if (!p || p.pronto) return { erro: 'Você já marcou como pronto.' };
    if (p.rolou) {
      if (p.rerolagensUsadas >= this.cfg.rerolagens) return { erro: 'Acabaram suas re-rolagens.' };
      p.rerolagensUsadas++;
    }
    p.rolou = true;
    p.atributos = P.rolarAtributos(p.classe, p.descricao, Math.random);
    p.tracos = P.sortearTracos(Math.random);
    this.difundir();
    return { ok: true };
  }
  criarPronto(pid, v) {
    if (this.fase !== 'criacao') return { erro: 'Não é hora de criar personagem.' };
    const p = this.pers.get(pid); if (!p) return { erro: 'Personagem não encontrado.' };
    if (v === false) { p.pronto = false; this.difundir(); return { ok: true }; }
    if (!p.rolou) this.criarRolar(pid);
    p.pronto = true;
    this.difundir();
    this.checarAntecipado();
    return { ok: true };
  }

  // ---------- jogo ----------
  comecarJogo() {
    if (this.fase !== 'criacao') return;
    for (const p of this.pers.values()) {
      if (!p.rolou) { p.rolou = true; p.atributos = P.rolarAtributos(p.classe, p.descricao, Math.random); p.tracos = P.sortearTracos(Math.random); }
    }
    const seed = this.seed == null ? (Date.now() & 0x7fffffff) : this.seed + 1;
    this.jogo = new Jogo([...this.pers.values()], this.cfg, seed, this.mundo);
    this.fase = 'jogo';
    this.abrirPlanejamento();
  }
  abrirPlanejamento() {
    for (const p of this.jogo.jog.values()) p.prontoRodada = false;
    this.iniciarTimer(this.cfg.periodo * 1000, () => this.resolverRodada());
    this.difundir();
  }
  definirFila(pid, fila, postura) {
    if (this.fase !== 'jogo') return { erro: 'A partida não está em andamento.' };
    const p = this.jogo.jog.get(pid);
    if (!p || !p.vivo || p.escapou) return { erro: 'Você não está mais jogando.' };
    if (p.prontoRodada) return { erro: 'Desmarque "pronto" para editar.' };
    const s = sanitizarFila(fila, [...this.jogo.jog.keys()]);
    p.fila = s.fila;
    if (postura && POSTURAS[postura]) p.postura = postura;
    this.enviarUm(pid);
    return { ok: true, avisos: s.erros };
  }
  definirPostura(pid, postura) {
    const p = this.jogo && this.jogo.jog.get(pid);
    if (!p || !p.vivo || !POSTURAS[postura]) return { erro: 'Postura inválida.' };
    p.postura = postura; this.enviarUm(pid); return { ok: true };
  }
  pronto(pid, v) {
    if (this.fase !== 'jogo') return { erro: 'A partida não está em andamento.' };
    const p = this.jogo.jog.get(pid);
    if (!p || !p.vivo || p.escapou) return { erro: 'Você não está mais jogando.' };
    p.prontoRodada = v !== false;
    this.difundir();
    this.checarAntecipado();
    return { ok: true };
  }
  responderProposta(pid, propId, aceitar) {
    if (this.fase !== 'jogo') return { erro: 'A partida não está em andamento.' };
    const r = this.jogo.responder(pid, Number(propId), !!aceitar);
    this.difundir();
    return r;
  }
  checarAntecipado() {
    if (this.fase === 'criacao') {
      const todos = [...this.pers.values()].every(p => p.pronto || !this.jogadores.get(p.id).conectado);
      if (todos && [...this.pers.values()].some(p => p.pronto)) this.comecarJogo();
    } else if (this.fase === 'jogo') {
      const vivos = this.jogo.vivos();
      if (vivos.length && vivos.every(p => p.prontoRodada || !this.jogadores.get(p.id).conectado) && vivos.some(p => p.prontoRodada)) this.resolverRodada();
    }
  }
  resolverRodada() {
    if (this.fase !== 'jogo') return;
    this.limparTimer();
    this.jogo.resolver();
    if (this.jogo.fim) { this.fase = 'fim'; this.difundir(); return; }
    this.abrirPlanejamento();
  }
  reiniciar(pid) {
    if (!this.ehHost(pid)) return { erro: 'Só o anfitrião pode reiniciar.' };
    if (this.fase !== 'fim') return { erro: 'A partida ainda não acabou.' };
    this.limparTimer();
    this.fase = 'lobby'; this.jogo = null; this.pers = null; this.mundo = null;
    for (const [id, j] of [...this.jogadores]) { j.chat = []; if (!j.conectado) this.jogadores.delete(id); }
    this.passarHost(); this.difundir();
    return { ok: true };
  }

  // ---------- chat ----------
  chat(pid, texto) {
    const j = this.jogadores.get(pid); if (!j) return { erro: 'Você não está na sala.' };
    texto = String(texto == null ? '' : texto).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
    if (!texto) return { erro: 'Mensagem vazia.' };
    const agora = this.agora();
    if (agora - j.ultimoChat < 600) return { erro: 'Calma, mais devagar.' };
    j.ultimoChat = agora;
    let alvos, canal;
    if (this.fase === 'lobby' || this.fase === 'criacao' || this.fase === 'fim') { alvos = [...this.jogadores.values()]; canal = 'sala'; }
    else {
      const p = this.jogo.jog.get(pid);
      if (!p) return { erro: 'Você não está no jogo.' };
      if (!p.vivo || p.escapou) { canal = 'alem'; alvos = [...this.jogo.jog.values()].filter(o => !o.vivo || o.escapou).map(o => this.jogadores.get(o.id)); }
      else {
        canal = 'local';
        const ids = new Set([pid, ...(p.presentes || []), ...p.aliados]);
        // quem está comigo no início da rodada ou é aliado; só vivos
        alvos = [...ids].map(id => this.jogadores.get(id)).filter(x => { const o = this.jogo.jog.get(x.id); return o && o.vivo && !o.escapou; });
        // aliados distantes entram como canal de aliança
      }
    }
    const msg = { canal, de: j.nome, texto, rodada: this.jogo ? this.jogo.rodada + 1 : 0 };
    for (const a of alvos) { if (!a) continue; a.chat.push(msg); if (a.chat.length > 80) a.chat.shift(); if (a.enviar) a.enviar('chat', msg); }
    return { ok: true };
  }

  // ---------- tempo ----------
  iniciarTimer(ms, fn) {
    this.limparTimer();
    this.prazo = this.agora() + ms;
    this.timer = this.agendar(fn, ms);
  }
  limparTimer() { if (this.timer != null) this.cancelar(this.timer); this.timer = null; this.prazo = null; }
  encerrar() { this.limparTimer(); }

  // ---------- o que cada um vê ----------
  estadoPara(pid) {
    const j = this.jogadores.get(pid);
    const base = {
      codigo: this.codigo, fase: this.fase, max: REGRAS.MAX_JOGADORES, min: this.min,
      voce: { id: j.id, nome: j.nome, token: j.token, host: j.host },
      jogadores: [...this.jogadores.values()].map(x => ({ id: x.id, nome: x.nome, host: x.host, conectado: x.conectado, pronto: this.fase === 'criacao' ? !!(this.pers.get(x.id) || {}).pronto : this.fase === 'jogo' && this.jogo && this.jogo.jog.get(x.id) ? !!this.jogo.jog.get(x.id).prontoRodada : false })),
      cfg: this.cfg, restanteMs: this.prazo ? Math.max(0, this.prazo - this.agora()) : null,
      chat: j.chat.slice(-40),
    };
    if (this.fase === 'lobby') base.opcoes = OPCOES;
    if (this.fase === 'criacao') {
      const p = this.pers.get(pid);
      base.criacao = {
        classe: p.classe, descricao: p.descricao, atributos: p.atributos, tracos: p.tracos.map(id => P.TRACOS.find(x => x.id === id)).map(x => ({ nome: x.nome, desc: x.desc })),
        rolou: p.rolou, rerolagensRestantes: this.cfg.rerolagens - p.rerolagensUsadas, inicio: p.inicio, pronto: p.pronto, inicioLivre: !!this.cfg.inicioLivre,
        classes: Object.keys(P.CLASSES).map(id => ({ id, nome: P.CLASSES[id].nome, desc: P.CLASSES[id].desc, b: P.CLASSES[id].b })),
        mapa: this.mundo.regioes.map(r => ({ id: r.id, x: r.x, y: r.y, tema: r.tema, icone: r.icone, nome: r.nome, luz: true, marcos: r.locais.map(l => l.tipo) })), seed: this.mundo.seed, N: this.mundo.N,
      };
    }
    if (this.fase === 'jogo' || this.fase === 'fim') {
      const v = this.jogo.visao(pid);
      v.pronto = !!this.jogo.jog.get(pid).prontoRodada;
      v.catalogo = this.catalogo();
      v.posturas = POSTURAS;
      v.resumoFinal = this.fase === 'fim' ? [...this.jogo.jog.values()].map(o => ({ nome: o.nome, estado: o.escapou ? 'desaparecido' : o.vivo ? 'sobrevivente' : 'morto', causa: o.causa, rodadaMorte: o.rodadaMorte, kills: o.kills, classe: (P.CLASSES[o.classe] || {}).nome })) : null;
      base.jogo = v;
    }
    return base;
  }
  catalogo() {
    if (this._cat) return this._cat;
    const c = {};
    for (const k in ACOES) c[k] = { nome: ACOES[k].nome, custo: ACOES[k].custo, grupo: ACOES[k].grupo, p: ACOES[k].p, divisivel: !!ACOES[k].divisivel, oculta: !!ACOES[k].oculta, desc: ACOES[k].desc };
    return (this._cat = c);
  }
  enviarUm(pid) { const j = this.jogadores.get(pid); if (j && j.enviar) j.enviar('estado', this.estadoPara(pid)); }
  difundir() { for (const id of this.jogadores.keys()) this.enviarUm(id); if (this.aoMudar) this.aoMudar(this); }

  // ---------- salvar / carregar ----------
  exportar() {
    return {
      versao: 1, codigo: this.codigo, fase: this.fase, cfg: this.cfg, proxId: this.proxId, criada: this.criada, seed: this.seed,
      jogadores: [...this.jogadores.values()].map(j => ({ id: j.id, token: j.token, nome: j.nome, host: j.host, chat: j.chat })),
      mundo: this.fase === 'criacao' ? this.mundo : null,
      pers: this.fase === 'criacao' ? [...this.pers.values()] : null,
      jogo: this.jogo ? this.jogo.exportar() : null,
    };
  }
  static importar(d, opc) {
    const s = new Sala(d.codigo, opc);
    s.fase = d.fase; s.cfg = limparConfig(d.cfg); s.proxId = d.proxId; s.criada = d.criada; s.seed = d.seed;
    for (const j of d.jogadores) s.jogadores.set(j.id, { id: j.id, token: j.token, nome: j.nome, host: j.host, conectado: false, enviar: null, chat: j.chat || [], ultimoChat: 0 });
    if (d.fase === 'criacao') { s.mundo = d.mundo; s.pers = new Map(d.pers.map(p => [p.id, p])); s.iniciarTimer(s.cfg.tempoCriacao * 1000, () => s.comecarJogo()); }
    if (d.jogo) { s.jogo = Jogo.importar(d.jogo); if (d.fase === 'jogo') s.abrirPlanejamento(); }
    s.ultima = s.agora();
    return s;
  }
}

module.exports = { Sala, codigoAleatorio };
