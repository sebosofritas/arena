// =====================================================================
//  MAPA 2D ESTILO WORLDBOX
//  Tudo é desenhado em pixels a partir da "semente" do mundo, então todos
//  os jogadores veem a mesma ilha. Uma camada fixa (terreno, rios, estradas,
//  prédios) é desenhada uma vez; a camada animada (água, fumaça, bichos,
//  nuvens, névoa, pessoas) é redesenhada ~30 vezes por segundo.
// =====================================================================
(function () {
  'use strict';
  const R = 16, MARG = 10, TS = 8;

  // ---------- números pseudoaleatórios ----------
  function rngDe(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const suave = (t) => t * t * (3 - 2 * t);
  function ruido(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = suave(x - xi), fy = suave(y - yi);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const fbm = (x, y, s) => ruido(x, y, s) * 0.5 + ruido(x * 2.03, y * 2.03, s + 7) * 0.3 + ruido(x * 4.1, y * 4.1, s + 13) * 0.2;
  function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`; }
  const escolha = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

  // ---------- tipos de chão ----------
  const T = { FUNDO: 0, AGUA: 1, AREIA: 2, GRAMA: 3, MATA: 4, ROCHA: 5, NEVE: 6, PANTANO: 7, LAMA: 8, CONCRETO: 9, TERRA: 10, LAGO: 11, RIO: 12, ESTRADA: 13, PONTE: 14, TRILHA: 15, RASO: 16 };
  const AGUAS = new Set([T.FUNDO, T.AGUA, T.LAGO, T.RIO, T.LAMA, T.RASO]);
  const CORES = {
    [T.FUNDO]: ['#123a6e', '#164580'], [T.AGUA]: ['#1f5c9e', '#2668ad'], [T.RASO]: ['#2f7cc0', '#3a8bd0'], [T.AREIA]: ['#dcc584', '#e9d697'],
    [T.GRAMA]: ['#4f9a3c', '#5daa47'], [T.MATA]: ['#2b6a2c', '#32772f'], [T.ROCHA]: ['#7e8288', '#92969b'], [T.NEVE]: ['#e6edf2', '#f6f9fb'],
    [T.PANTANO]: ['#4d5d35', '#58693c'], [T.LAMA]: ['#2f4b47', '#385a55'], [T.CONCRETO]: ['#7b7f84', '#878b90'], [T.TERRA]: ['#8a6d48', '#977a53'],
    [T.LAGO]: ['#2a6fb8', '#3580c6'], [T.RIO]: ['#2b73bd', '#3683cc'], [T.ESTRADA]: ['#4b4f56', '#53575e'], [T.PONTE]: ['#7a6248', '#86704f'], [T.TRILHA]: ['#9c7f55', '#a88b60'],
  };
  const URBANOS = new Set(['centro', 'comercio', 'hospitalar']);
  const COM_RUAS = new Set(['centro', 'comercio', 'hospitalar', 'industrial', 'bairro', 'campus']);
  const NOS_ESTRADA = new Set(['centro', 'comercio', 'hospitalar', 'campus', 'bairro', 'industrial', 'rodovia', 'rural', 'militar', 'praia', 'ruinas']);

  // =================================================================
  //  GERAÇÃO DA CENA (camada fixa)
  // =================================================================
  function gerarCena(d) {
    const N = d.N, seed = d.seed | 0, Wt = N * R + MARG * 2, WP = Wt * TS;
    const img = document.createElement('canvas'); img.width = WP; img.height = WP;
    const g = img.getContext('2d');
    const tipo = new Uint8Array(Wt * Wt), reg = new Int16Array(Wt * Wt).fill(-1), occ = new Uint8Array(Wt * Wt), alt = new Float32Array(Wt * Wt);
    const cena = { N, WP, Wt, img, agua: [], espuma: [], fumaca: [], bichos: [], barcos: [], janelas: {}, centros: [], seed };
    const idx = (x, y) => y * Wt + x;
    const dentro = (x, y) => x >= 0 && y >= 0 && x < Wt && y < Wt;
    const regs = d.regioes, meio = (N * R) / 2;
    const temaDe = (i) => (regs[i] ? regs[i].tema : 'mata');

    const distIlha = (gx, gy) => { const ex = Math.abs(gx - meio + 0.5) / meio, ey = Math.abs(gy - meio + 0.5) / meio;
      return Math.max(ex, ey) * 0.65 + Math.hypot(ex, ey) * 0.30 + (fbm(gx * 0.06, gy * 0.06, seed + 21) - 0.5) * 0.36 + (fbm(gx * 0.2, gy * 0.2, seed + 22) - 0.5) * 0.08; };
    const costaDe = (gx, gy, praia) => { const dd = distIlha(gx, gy); return dd > 1.06 ? T.FUNDO : dd > 0.99 ? T.AGUA : dd > 0.955 ? T.RASO : dd > (praia ? 0.82 : 0.915) ? T.AREIA : null; };
    // ---------- 1) terreno ----------
    for (let ty = 0; ty < Wt; ty++) for (let tx = 0; tx < Wt; tx++) {
      const gx = tx - MARG, gy = ty - MARG, i = idx(tx, ty);
      const sx = gx + (fbm(gx * 0.09, gy * 0.09, seed) - 0.5) * 9, sy = gy + (fbm(gx * 0.09 + 40, gy * 0.09 + 40, seed + 3) - 0.5) * 9;
      const rx = Math.max(0, Math.min(N - 1, Math.floor(sx / R))), ry = Math.max(0, Math.min(N - 1, Math.floor(sy / R)));
      const ri = ry * N + rx, tema = temaDe(ri);
      reg[i] = ri;
      const dist = distIlha(gx, gy);
      const praia = tema === 'praia';
      if (dist > 1.06) { tipo[i] = (fbm(gx * 0.13, gy * 0.13, seed + 55) > 0.74 && dist < 1.25) ? T.AREIA : T.FUNDO; continue; }
      if (dist > 0.99) { tipo[i] = T.AGUA; continue; }
      if (dist > 0.955) { tipo[i] = T.RASO; continue; }
      if (dist > (praia ? 0.82 : 0.915)) { tipo[i] = T.AREIA; continue; }
      const lx = gx - (rx * R + R / 2), ly = gy - (ry * R + R / 2), n = fbm(gx * 0.18, gy * 0.18, seed + 5);
      let t = T.GRAMA;
      if (URBANOS.has(tema)) t = n > 0.7 ? T.GRAMA : T.CONCRETO;
      else if (tema === 'industrial') t = n > 0.62 ? T.TERRA : T.CONCRETO;
      else if (tema === 'rodovia' || tema === 'ruinas') t = n > 0.64 ? T.TERRA : T.GRAMA;
      else if (tema === 'mata') t = T.MATA;
      else if (tema === 'montanha') {
        const cr = 1 - Math.abs(2 * fbm(gx * 0.12, gy * 0.12, seed + 9) - 1);
        const e = 0.55 * (1 - Math.hypot(lx, ly) / (R * 0.85)) + 0.5 * cr + 0.15 * fbm(gx * 0.3, gy * 0.3, seed + 10);
        alt[i] = e; t = e > 0.88 ? T.NEVE : e > 0.56 ? T.ROCHA : T.GRAMA;
      } else if (tema === 'lago') {
        const dd = Math.hypot(lx, ly) + (fbm(gx * 0.25, gy * 0.25, seed + 31) - 0.5) * 7;
        t = dd < R * 0.33 ? T.LAGO : dd < R * 0.33 + 1.3 ? T.AREIA : T.GRAMA;
      } else if (tema === 'pantano') t = fbm(gx * 0.22, gy * 0.22, seed + 33) > 0.53 ? T.LAMA : T.PANTANO;
      else if (tema === 'militar') t = (Math.abs(lx) < 6.5 && Math.abs(ly) < 6.5) ? T.TERRA : T.GRAMA;
      tipo[i] = t;
    }

    // ---------- 2) rio: da montanha até o lago e depois até o mar ----------
    const centroReg = (id) => { const r = regs[id]; return [MARG + r.x * R + R / 2, MARG + r.y * R + R / 2]; };
    const rr = rngDe(seed + 101);
    function cavarRio(a, b, w0, w1, semente) {
      const passos = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2.5), px = -(b[1] - a[1]), py = b[0] - a[0], pl = Math.hypot(px, py) || 1;
      for (let k = 0; k <= passos; k++) {
        const f = k / passos, curva = (fbm(f * 3.2, 0.5, semente) - 0.5) * R * 2.2 * Math.sin(Math.PI * f);
        const x = a[0] + (b[0] - a[0]) * f + px / pl * curva, y = a[1] + (b[1] - a[1]) * f + py / pl * curva, w = w0 + (w1 - w0) * f;
        for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
          const tx = Math.round(x + ox), ty = Math.round(y + oy);
          if (!dentro(tx, ty) || Math.hypot(tx - x, ty - y) > w) continue;
          const i = idx(tx, ty);
          if (tipo[i] === T.FUNDO || tipo[i] === T.AGUA || tipo[i] === T.LAGO) continue;
          tipo[i] = T.RIO;
        }
      }
    }
    const montanhas = regs.filter(r => r.tema === 'montanha'), lagos = regs.filter(r => r.tema === 'lago');
    const dC = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let alvo = lagos.length ? centroReg(lagos[Math.floor(rr() * lagos.length)].id) : [MARG + N * R / 2, MARG + N * R / 2];
    const fontes = montanhas.length ? montanhas.slice().sort((p, q) => dC(centroReg(q.id), alvo) - dC(centroReg(p.id), alvo)) : [regs[Math.floor(rr() * regs.length)]];
    cavarRio(centroReg(fontes[0].id), alvo, 1.0, 1.9, seed + 7);
    const bordaPerto = (p) => { const b = [[p[0], 2], [p[0], Wt - 3], [2, p[1]], [Wt - 3, p[1]]]; b.sort((u, v) => dC(u, p) - dC(v, p)); return b[0]; };
    cavarRio(alvo, bordaPerto(alvo), 1.7, 2.6, seed + 8);
    if (fontes[1]) { const f2 = centroReg(fontes[1].id); cavarRio(f2, bordaPerto(f2), 0.9, 1.8, seed + 17); }

    // ---------- 3) estradas ligando as regiões ----------
    const nos = regs.filter(r => NOS_ESTRADA.has(r.tema)).map(r => { const c = centroReg(r.id); return { r, x: c[0] + (hash(r.id, 1, seed) - 0.5) * 5, y: c[1] + (hash(r.id, 2, seed) - 0.5) * 5 }; });
    const arestas = [], chave = new Set();
    const ligar = (a, b, maior) => { const k = Math.min(a.r.id, b.r.id) + '-' + Math.max(a.r.id, b.r.id); if (chave.has(k)) return; chave.add(k); arestas.push({ a, b, maior }); };
    if (nos.length) {   // árvore mínima (todo mundo conectado)
      const dentroArv = [nos[0]], fora = nos.slice(1);
      while (fora.length) {
        let best = null;
        for (const p of dentroArv) for (const q of fora) { const dd = Math.hypot(p.x - q.x, p.y - q.y); if (!best || dd < best[2]) best = [p, q, dd]; }
        ligar(best[0], best[1], false); dentroArv.push(best[1]); fora.splice(fora.indexOf(best[1]), 1);
      }
    }
    for (const p of nos) for (const q of nos) {   // vizinhos urbanos e rodovias
      if (p === q || Math.abs(p.r.x - q.r.x) + Math.abs(p.r.y - q.r.y) !== 1) continue;
      const rod = p.r.tema === 'rodovia' || q.r.tema === 'rodovia';
      if (rod || (COM_RUAS.has(p.r.tema) && COM_RUAS.has(q.r.tema))) ligar(p, q, rod);
    }
    const trechos = []; // pontos ao longo das estradas (para carros abandonados e faixas)
    function pavimentar(a, b, larg, semente) {
      const passos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 3);
      const px = -(b.y - a.y), py = b.x - a.x, pl = Math.hypot(px, py) || 1;
      let ant = null;
      for (let k = 0; k <= passos; k++) {
        const f = k / passos, curva = (fbm(f * 2.2, 3.3, semente) - 0.5) * R * 0.9 * Math.sin(Math.PI * f);
        const x = a.x + (b.x - a.x) * f + px / pl * curva, y = a.y + (b.y - a.y) * f + py / pl * curva;
        for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
          const tx = Math.round(x + ox), ty = Math.round(y + oy);
          if (!dentro(tx, ty) || Math.hypot(tx - x, ty - y) > larg) continue;
          const i = idx(tx, ty), t0 = tipo[i];
          if (t0 === T.FUNDO || t0 === T.AGUA) continue;
          if (t0 === T.RIO || t0 === T.LAGO || t0 === T.LAMA || t0 === T.RASO || t0 === T.PONTE) tipo[i] = T.PONTE;
          else if (t0 !== T.ESTRADA) { const tm = temaDe(reg[i]); tipo[i] = (tm === 'mata' || tm === 'montanha' || tm === 'pantano' || tm === 'ruinas' || tm === 'lago') && larg < 1.2 ? T.TRILHA : T.ESTRADA; }
          occ[i] = 1;
        }
        if (ant && k % 2 === 0) trechos.push({ x: x * TS, y: y * TS, ang: Math.atan2(y - ant[1], x - ant[0]), larg });
        ant = [x, y];
      }
    }
    arestas.forEach((e, k) => pavimentar(e.a, e.b, e.maior ? 1.25 : 0.78, seed + 300 + k));

    // ---------- 4) ruas dentro das cidades ----------
    for (const r of regs) {
      if (!COM_RUAS.has(r.tema)) continue;
      const passo = URBANOS.has(r.tema) ? 6 : 8;
      const x0 = MARG + r.x * R, y0 = MARG + r.y * R, off = Math.floor(hash(r.id, 9, seed) * passo);
      for (let ty = y0; ty < y0 + R; ty++) for (let tx = x0; tx < x0 + R; tx++) {
        const i = idx(tx, ty);
        if (reg[i] !== r.id || AGUAS.has(tipo[i]) || tipo[i] === T.AREIA) continue;
        if ((tx - x0 + off) % passo === 0 || (ty - y0 + off) % passo === 0) { if (tipo[i] !== T.PONTE) tipo[i] = T.ESTRADA; occ[i] = 2; }
      }
    }

    // ---------- 5) pintar o chão ----------
    for (let ty = 0; ty < Wt; ty++) for (let tx = 0; tx < Wt; tx++) {
      const i = idx(tx, ty), t = tipo[i], c = CORES[t], n = fbm(tx * 0.3, ty * 0.3, seed + 77), px = tx * TS, py = ty * TS;
      if (t === T.ESTRADA || t === T.PONTE || t === T.TRILHA || t === T.RIO) { g.fillStyle = mix(c[0], c[1], n); g.fillRect(px, py, TS, TS); }
      else {
        const praia = temaDe(reg[i]) === 'praia', perto = distIlha(tx - MARG, ty - MARG) > (praia ? 0.76 : 0.86), mont = alt[i] > 0;
        for (let q = 0; q < 4; q++) {
          const qx = q & 1, qy = q >> 1, fx = tx + qx * 0.5 + 0.25, fy = ty + qy * 0.5 + 0.25;
          let tt = t;
          if (perto && t !== T.LAGO && t !== T.LAMA) { let ct = costaDe(fx - MARG, fy - MARG, praia); if (ct != null && !AGUAS.has(t) && t !== T.AREIA && (ct === T.FUNDO || ct === T.AGUA)) ct = T.RASO; tt = ct != null ? ct : ([T.FUNDO, T.AGUA, T.RASO, T.AREIA].includes(t) ? T.GRAMA : t); }
          let a = 0;
          if (mont && (tt === T.GRAMA || tt === T.ROCHA || tt === T.NEVE)) {
            const ax = fx - 0.5, ay = fy - 0.5, x0 = Math.floor(ax), y0 = Math.floor(ay), wx = ax - x0, wy = ay - y0;
            const A = (x, y) => dentro(x, y) ? alt[idx(x, y)] : 0;
            a = A(x0, y0) * (1 - wx) * (1 - wy) + A(x0 + 1, y0) * wx * (1 - wy) + A(x0, y0 + 1) * (1 - wx) * wy + A(x0 + 1, y0 + 1) * wx * wy;
            tt = a > 0.88 ? T.NEVE : a > 0.56 ? T.ROCHA : T.GRAMA;
          }
          const cc = CORES[tt], nn = fbm(fx * 0.45, fy * 0.45, seed + 77);
          let cor = mix(cc[0], cc[1], nn);
          if (mont && a > 0.3) { const nw = (dentro(tx - 1, ty - 1) ? alt[idx(tx - 1, ty - 1)] : a), dz = a - nw; cor = mix(dz > 0 ? cc[1] : cc[0], dz > 0 ? '#ffffff' : '#1c2026', Math.max(0, Math.min(0.4, Math.abs(dz) * 5 + (fbm(fx, fy, seed + 4) - 0.5) * 0.2))); }
          g.fillStyle = cor; g.fillRect(px + qx * 4, py + qy * 4, 4, 4);
        }
      }
      // textura
      const h1 = hash(tx, ty, seed + 1);
      if (t === T.GRAMA || t === T.MATA || t === T.PANTANO) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(px + Math.floor(h1 * 6), py + Math.floor(hash(tx, ty, seed + 2) * 6), 1, 2); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(px + Math.floor(hash(tx, ty, 5) * 7), py + Math.floor(hash(tx, ty, 6) * 7), 1, 1); }
      else if (t === T.AREIA && h1 < 0.3) { g.fillStyle = 'rgba(120,90,40,.18)'; g.fillRect(px + Math.floor(h1 * 20) % 7, py + 3, 1, 1); }
      else if (t === T.CONCRETO && h1 < 0.15) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(px, py + Math.floor(h1 * 40) % 8, TS, 1); }
      else if (t === T.ESTRADA) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(px + Math.floor(h1 * 7), py + Math.floor(hash(tx, ty, 8) * 7), 1, 1); }
      else if (t === T.PONTE) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(px, py + 3, TS, 1); g.fillRect(px + 3, py, 1, TS); }
      if (AGUAS.has(t) && t !== T.LAMA) {
        if (h1 < 0.35) cena.agua.push([px + Math.floor(hash(tx, ty, 3) * 6), py + Math.floor(hash(tx, ty, 4) * 7), h1 * 100]);
        // espuma na beira
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!dentro(tx + ox, ty + oy)) continue;
          const v = tipo[idx(tx + ox, ty + oy)];
          if (!AGUAS.has(v) && v !== T.PONTE) { cena.espuma.push([px + (ox === 1 ? TS - 2 : ox === -1 ? 0 : 0), py + (oy === 1 ? TS - 2 : 0), ox !== 0, h1 * 50]); break; }
        }
      }
      if (t === T.RASO || t === T.AGUA) occ[i] = 3;
      if (AGUAS.has(t) || t === T.ESTRADA || t === T.PONTE || t === T.TRILHA) occ[i] = occ[i] || 1;
    }
    // bordas suaves nas estradas (meio-fio)
    for (let ty = 1; ty < Wt - 1; ty++) for (let tx = 1; tx < Wt - 1; tx++) {
      const t = tipo[idx(tx, ty)];
      if (t !== T.ESTRADA) continue;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const v = tipo[idx(tx + ox, ty + oy)];
        if (v !== T.ESTRADA && v !== T.PONTE) { g.fillStyle = 'rgba(200,200,190,.35)'; g.fillRect(tx * TS + (ox === 1 ? TS - 1 : 0), ty * TS + (oy === 1 ? TS - 1 : 0), ox ? 1 : TS, oy ? 1 : TS); }
      }
    }
    // faixas amarelas nas estradas principais
    g.fillStyle = 'rgba(240,200,80,.75)';
    trechos.forEach((p, k) => { if (p.larg >= 1.2 && k % 2 === 0) { g.save(); g.translate(p.x, p.y); g.rotate(p.ang); g.fillRect(-2, -0.5, 4, 1); g.restore(); } });

    // ---------- 6) pincéis ----------
    const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    function disco(cx, cy, r, c) { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6)); g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1); } }
    const livre = (tx, ty, w, h, aceita) => {
      for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
        if (!dentro(x, y)) return false;
        const i = idx(x, y); if (occ[i]) return false;
        if (distIlha(x - MARG, y - MARG) > 0.9) return false;
        if (aceita && !aceita(tipo[i])) return false;
      }
      return true;
    };
    const ocupar = (tx, ty, w, h) => { for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (dentro(x, y)) occ[idx(x, y)] = 4; };
    const terra = (t) => !AGUAS.has(t) && t !== T.ESTRADA && t !== T.PONTE && t !== T.TRILHA;
    function lugar(r, w, h, rng, aceita, tentativas, perto) {
      const x0 = MARG + r.x * R, y0 = MARG + r.y * R;
      for (let k = 0; k < (tentativas || 40); k++) {
        let tx, ty;
        if (perto) { tx = Math.round(x0 + R / 2 - w / 2 + (rng() - 0.5) * perto); ty = Math.round(y0 + R / 2 - h / 2 + (rng() - 0.5) * perto); }
        else { tx = x0 + Math.floor(rng() * (R - w + 1)); ty = y0 + Math.floor(rng() * (R - h + 1)); }
        let ok = livre(tx, ty, w, h, aceita || terra);
        if (ok) for (let y = ty; y < ty + h && ok; y++) for (let x = tx; x < tx + w; x++) if (reg[idx(x, y)] !== r.id) { ok = false; break; }
        if (ok) { ocupar(tx, ty, w, h); return [tx * TS, ty * TS]; }
      }
      return null;
    }
    const sombra = (x, y, w, h, alto) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + w, y + 2, Math.max(2, Math.round(alto * 0.6)), h - 1); g.fillRect(x + 2, y + h, w, Math.max(1, Math.round(alto * 0.35))); };
    function predio(x, y, w, h, o) {   // w,h em pixels
      o = o || {};
      const alto = o.alto || 4, teto = o.teto || '#9aa1a8', parede = o.parede || mix(teto, '#1d2228', 0.45), regId = o.reg;
      sombra(x, y, w, h, alto);
      const fh = Math.min(Math.round(h * 0.4), alto + 1);
      px(x, y, w, h - fh, teto);
      px(x, y, w, 1, mix(teto, '#ffffff', 0.3)); px(x, y, 1, h - fh, mix(teto, '#ffffff', 0.18));
      px(x + w - 1, y, 1, h - fh, mix(teto, '#000000', 0.2));
      px(x, y + h - fh, w, fh, parede);
      // janelas
      if (o.janelas !== false) {
        for (let wy = y + h - fh + 1; wy < y + h - 1; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 3) {
          px(wx, wy, 2, 1, '#26303c');
          if (regId != null) (cena.janelas[regId] = cena.janelas[regId] || []).push([wx, wy, hash(wx, wy, seed)]);
        }
      }
      // detalhes no telhado
      if (o.ac !== false && w >= 10 && h >= 10) {
        const rr2 = hash(x, y, seed + 5);
        px(x + 2 + Math.floor(rr2 * (w - 6)), y + 2, 3, 2, mix(teto, '#c8ccd0', 0.5));
        if (rr2 > 0.5) { disco(x + w - 4, y + 3, 1, '#6a7078'); }
      }
      return { x, y, w, h };
    }
    function casa(x, y, rng, regId) {
      const tetos = ['#b5523b', '#a0462f', '#8a5a3a', '#5f6f8f', '#7b3f5a', '#40706a', '#c77a3a', '#8f3a3a'];
      const paredes = ['#e8dcc4', '#d9cdb4', '#f0e6d2', '#cfd8dc', '#e4c9a8'];
      const teto = escolha(tetos, rng()), parede = escolha(paredes, rng());
      // quintal
      px(x, y, 16, 16, 'rgba(110,170,80,.35)');
      if (rng() < 0.6) { g.fillStyle = 'rgba(240,240,230,.55)'; g.fillRect(x, y, 16, 1); g.fillRect(x, y, 1, 16); g.fillRect(x + 15, y, 1, 16); }
      sombra(x + 2, y + 2, 11, 10, 3);
      px(x + 2, y + 2, 11, 6, teto); px(x + 2, y + 2, 6, 6, mix(teto, '#ffffff', 0.15)); px(x + 2, y + 5, 11, 1, mix(teto, '#000000', 0.25));
      px(x + 2, y + 8, 11, 4, parede); px(x + 6, y + 9, 2, 3, '#5a3b27'); px(x + 3, y + 9, 2, 1, '#26303c'); px(x + 10, y + 9, 2, 1, '#26303c');
      if (regId != null) (cena.janelas[regId] = cena.janelas[regId] || []).push([x + 3, y + 9, rng()], [x + 10, y + 9, rng()]);
      px(x + 10, y + 1, 2, 3, '#6b4a3a');
      if (rng() < 0.18) { px(x + 3, y + 13, 6, 3, '#e8f4f8'); px(x + 4, y + 13, 4, 2, '#46b5e0'); }
      else if (rng() < 0.5) arvore(x + 13, y + 13, 3, rng);
      if (rng() < 0.35) carro(x + 12, y + 12, 0, rng);
    }
    function arvore(cx, cy, r, rng, estilo) {
      estilo = estilo || 'redonda';
      if (estilo === 'pinheiro') {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(cx - 2, cy + 3, 6, 2);
        const c1 = '#1d4f24', c2 = '#2a6a30';
        for (let k = 0; k < 3; k++) { const yy = cy - 6 + k * 3, ww = 1 + k * 2; px(cx - ww, yy, ww * 2 + 1, 3, k % 2 ? c1 : c2); }
        px(cx, cy + 3, 1, 2, '#5a3b27');
        return;
      }
      if (estilo === 'palmeira') {
        px(cx, cy - 4, 1, 7, '#8a6a3a'); px(cx + 1, cy - 1, 1, 3, '#7a5a2a');
        const f = '#3d8f3a';
        px(cx - 4, cy - 5, 4, 1, f); px(cx + 1, cy - 5, 4, 1, f); px(cx - 2, cy - 7, 1, 2, f); px(cx + 2, cy - 7, 1, 2, f); px(cx - 3, cy - 4, 1, 2, f); px(cx + 4, cy - 4, 1, 2, f);
        return;
      }
      if (estilo === 'seca') { px(cx, cy - 4, 1, 7, '#3b2f22'); px(cx - 3, cy - 3, 3, 1, '#3b2f22'); px(cx + 1, cy - 1, 3, 1, '#3b2f22'); px(cx - 2, cy - 5, 1, 2, '#3b2f22'); return; }
      const tons = rng && rng() < 0.2 ? ['#5a7f2a', '#6e9a33', '#86b440'] : ['#22602a', '#2f7a35', '#46963f'];
      disco(cx + 2, cy + 3, r, 'rgba(0,0,0,.22)');
      disco(cx, cy, r, tons[0]); disco(cx - 1, cy - 1, Math.max(1, r - 1), tons[1]); disco(cx - 2, cy - 2, Math.max(0, r - 3), tons[2]);
    }
    function carro(x, y, ang, rng, cor) {
      const cores = ['#c0392b', '#2e86c1', '#f4d03f', '#ecf0f1', '#27ae60', '#7f8c8d', '#1c2833', '#d35400'];
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-3, -1, 7, 4);
      g.fillStyle = cor || escolha(cores, rng()); g.fillRect(-3, -2, 6, 3);
      g.fillStyle = '#9fc6e0'; g.fillRect(0, -2, 2, 3);
      g.fillStyle = '#111'; g.fillRect(-2, -3, 1, 1); g.fillRect(1, -3, 1, 1); g.fillRect(-2, 1, 1, 1); g.fillRect(1, 1, 1, 1);
      g.restore();
    }
    function veiculoGrande(x, y, ang, cor, comp) {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-comp / 2 + 1, -1, comp, 5);
      g.fillStyle = cor; g.fillRect(-comp / 2, -2, comp, 4);
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-comp / 2, -2, comp, 1);
      g.fillStyle = '#9fc6e0'; g.fillRect(comp / 2 - 2, -2, 2, 4);
      g.restore();
    }
    function cruz(x, y, cor) { px(x - 1, y - 3, 3, 7, cor); px(x - 3, y - 1, 7, 3, cor); }
    function toldo(x, y, w, c1, c2) { for (let k = 0; k < w; k += 2) px(x + k, y, 2, 2, (k / 2) % 2 ? c1 : c2); }
    function campo(x, y, w, h, rng) {
      const tipos = [['#d9be52', '#c9ab42'], ['#6a9e3a', '#5a8e2a'], ['#7a5a3a', '#6a4a2a'], ['#8fc45a', '#79ad48'], ['#c7a24a', '#e0c060']];
      const [a, b] = escolha(tipos, rng());
      px(x, y, w, h, a);
      for (let k = 0; k < h; k += 2) px(x, y + k, w, 1, b);
      g.fillStyle = 'rgba(90,65,40,.6)'; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h);
    }
    function fumaca(x, y) { cena.fumaca.push([x, y, hash(x, y, seed)]); }
    function barco(x, y, cor) { cena.barcos.push([x, y, cor || '#f2f2f2', hash(x, y, seed)]); }

    // ---------- 7) marcos: cada local do jogo vira uma construção ----------
    function marco(tipoLocal, r, rng) {
      const id = r.id;
      let p;
      switch (tipoLocal) {
        case 'casa': if ((p = lugar(r, 2, 2, rng))) casa(p[0], p[1], rng, id); break;
        case 'apartamento': if ((p = lugar(r, 3, 3, rng))) predio(p[0] + 1, p[1] + 1, 22, 22, { alto: 9, teto: escolha(['#a3a9b0', '#b0a48f', '#9aa59a'], rng()), reg: id }); break;
        case 'escritorios': if ((p = lugar(r, 3, 3, rng))) { const b = predio(p[0] + 1, p[1] + 1, 22, 22, { alto: 11, teto: '#5f8fb8', parede: '#3d6286', reg: id }); for (let k = 2; k < 20; k += 4) px(b.x + k, b.y + 1, 1, 11, 'rgba(200,230,255,.45)'); } break;
        case 'mercado': if ((p = lugar(r, 4, 4, rng))) { predio(p[0] + 1, p[1] + 1, 30, 16, { alto: 4, teto: '#c9cdd2', reg: id }); toldo(p[0] + 3, p[1] + 14, 26, '#d63031', '#ffffff');
          px(p[0], p[1] + 20, 32, 12, '#55595e'); for (let k = 2; k < 32; k += 5) px(p[0] + k, p[1] + 21, 1, 4, '#e8e8e8'); for (let k = 0; k < 4; k++) if (rng() < 0.6) carro(p[0] + 4 + k * 7, p[1] + 28, Math.PI / 2, rng); } break;
        case 'padaria': if ((p = lugar(r, 2, 2, rng))) { predio(p[0] + 1, p[1] + 1, 14, 11, { alto: 3, teto: '#d9a066', reg: id }); toldo(p[0] + 1, p[1] + 12, 14, '#f0c27a', '#8a5a2a'); } break;
        case 'restaurante': if ((p = lugar(r, 3, 2, rng))) { predio(p[0] + 1, p[1] + 1, 20, 10, { alto: 3, teto: '#b5523b', reg: id }); toldo(p[0] + 1, p[1] + 11, 20, '#27ae60', '#ffffff'); for (let k = 0; k < 3; k++) { disco(p[0] + 5 + k * 6, p[1] + 14, 1, '#ecf0f1'); } } break;
        case 'farmacia': if ((p = lugar(r, 2, 2, rng))) { predio(p[0] + 1, p[1] + 1, 14, 13, { alto: 3, teto: '#e8f0ea', reg: id }); cruz(p[0] + 8, p[1] + 5, '#27ae60'); } break;
        case 'loja_ferragens': case 'loja_esportes': case 'loja_roupas': case 'loja_eletronicos': {
          const cor = { loja_ferragens: '#e67e22', loja_esportes: '#2980b9', loja_roupas: '#e84393', loja_eletronicos: '#6c5ce7' }[tipoLocal];
          if ((p = lugar(r, 3, 2, rng))) { predio(p[0] + 1, p[1] + 1, 22, 11, { alto: 4, teto: mix(cor, '#ffffff', 0.55), reg: id }); toldo(p[0] + 1, p[1] + 12, 22, cor, '#ffffff'); }
          break; }
        case 'posto_gasolina': if ((p = lugar(r, 4, 3, rng))) {
          px(p[0], p[1], 32, 24, '#5c6066'); sombra(p[0] + 3, p[1] + 3, 18, 9, 3);
          px(p[0] + 3, p[1] + 3, 18, 9, '#ecf0f1'); px(p[0] + 3, p[1] + 3, 18, 2, '#e74c3c');
          for (let k = 0; k < 3; k++) px(p[0] + 6 + k * 5, p[1] + 14, 2, 3, '#c0392b');
          predio(p[0] + 23, p[1] + 3, 8, 10, { alto: 3, teto: '#bdc3c7', reg: id });
          if (rng() < 0.7) carro(p[0] + 10, p[1] + 20, 0, rng);
        } break;
        case 'oficina': if ((p = lugar(r, 3, 3, rng))) { predio(p[0] + 1, p[1] + 1, 22, 14, { alto: 4, teto: '#7f8c8d', reg: id }); px(p[0] + 5, p[1] + 11, 6, 4, '#2d3436'); px(p[0] + 13, p[1] + 11, 6, 4, '#2d3436'); carro(p[0] + 6, p[1] + 20, 0.2, rng); carro(p[0] + 16, p[1] + 20, -0.3, rng); } break;
        case 'hospital': if ((p = lugar(r, 5, 5, rng, null, 60, 6))) {
          const b = predio(p[0] + 2, p[1] + 2, 36, 24, { alto: 8, teto: '#f1f3f4', parede: '#b8c4cc', reg: id }); cruz(b.x + 9, b.y + 7, '#e74c3c');
          disco(b.x + 27, b.y + 7, 5, '#5d6d7e'); px(b.x + 25, b.y + 4, 1, 6, '#fff'); px(b.x + 29, b.y + 4, 1, 6, '#fff'); px(b.x + 25, b.y + 7, 5, 1, '#fff');
          px(p[0], p[1] + 30, 40, 10, '#55595e'); veiculoGrande(p[0] + 8, p[1] + 34, 0, '#ffffff', 9); for (let k = 0; k < 3; k++) carro(p[0] + 20 + k * 6, p[1] + 35, Math.PI / 2, rng);
        } break;
        case 'delegacia': if ((p = lugar(r, 3, 3, rng))) { const b = predio(p[0] + 1, p[1] + 1, 22, 16, { alto: 5, teto: '#34495e', parede: '#22303c', reg: id }); px(b.x, b.y + 4, 22, 2, '#2e86c1'); carro(p[0] + 6, p[1] + 21, 0, rng, '#1b2631'); carro(p[0] + 16, p[1] + 21, 0, rng, '#ecf0f1'); } break;
        case 'bombeiros': if ((p = lugar(r, 3, 3, rng))) { predio(p[0] + 1, p[1] + 1, 22, 15, { alto: 5, teto: '#c0392b', reg: id }); for (let k = 0; k < 3; k++) px(p[0] + 3 + k * 7, p[1] + 12, 5, 4, '#ecf0f1'); veiculoGrande(p[0] + 12, p[1] + 21, 0, '#e74c3c', 12); } break;
        case 'escola': if ((p = lugar(r, 4, 4, rng))) {
          predio(p[0] + 1, p[1] + 1, 30, 9, { alto: 4, teto: '#e67e22', reg: id }); predio(p[0] + 1, p[1] + 10, 9, 12, { alto: 4, teto: '#e67e22', reg: id });
          px(p[0] + 13, p[1] + 13, 18, 12, '#2f8f5a'); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.strokeRect(p[0] + 14.5, p[1] + 14.5, 15, 9); px(p[0] + 22, p[1] + 14, 1, 10, 'rgba(255,255,255,.8)');
        } break;
        case 'biblioteca': if ((p = lugar(r, 3, 3, rng))) { const b = predio(p[0] + 1, p[1] + 1, 22, 16, { alto: 5, teto: '#d5c4a1', parede: '#bfae8a', reg: id }); for (let k = 2; k < 22; k += 4) px(b.x + k, b.y + 10, 2, 6, '#f3ead7'); px(b.x - 1, b.y, 24, 2, '#b7a580'); } break;
        case 'igreja': if ((p = lugar(r, 3, 4, rng))) {
          sombra(p[0] + 6, p[1] + 2, 12, 22, 6); px(p[0] + 6, p[1] + 2, 12, 22, '#d0c3ad'); px(p[0] + 2, p[1] + 9, 20, 7, '#d0c3ad'); px(p[0] + 11, p[1] + 2, 2, 22, '#b5a68e');
          px(p[0] + 9, p[1] - 2, 6, 6, '#8e7f69'); px(p[0] + 11, p[1] - 5, 2, 5, '#f1c40f'); px(p[0] + 10, p[1] - 4, 4, 1, '#f1c40f');
          for (let k = 0; k < 6; k++) px(p[0] + 2 + (k % 3) * 3, p[1] + 26 + Math.floor(k / 3) * 3, 1, 2, '#bdc3c7');
        } break;
        case 'fabrica': if ((p = lugar(r, 5, 4, rng))) {
          const b = predio(p[0] + 1, p[1] + 1, 36, 20, { alto: 6, teto: '#7d8a96', reg: id });
          for (let k = 0; k < 36; k += 6) { px(b.x + k, b.y + 1, 3, 11, '#95a5b4'); px(b.x + k + 3, b.y + 1, 3, 11, '#5f6b77'); }
          for (let k = 0; k < 2; k++) { const cx = b.x + 6 + k * 10, cy = b.y - 6; px(cx, cy, 3, 9, '#4a4f57'); px(cx, cy, 3, 1, '#c0392b'); fumaca(cx + 1, cy - 1); }
          disco(p[0] + 34, p[1] + 26, 3, '#bdc3c7'); disco(p[0] + 34, p[1] + 26, 2, '#d5dbdf');
          for (let k = 0; k < 3; k++) px(p[0] + 4 + k * 7, p[1] + 25, 6, 3, escolha(['#c0392b', '#2980b9', '#27ae60', '#e67e22'], rng()));
        } break;
        case 'armazem': if ((p = lugar(r, 5, 3, rng))) { const b = predio(p[0] + 1, p[1] + 1, 36, 16, { alto: 5, teto: '#a7896a', reg: id, janelas: false }); for (let k = 0; k < 36; k += 3) px(b.x + k, b.y + 1, 1, 10, 'rgba(0,0,0,.18)'); veiculoGrande(p[0] + 10, p[1] + 21, 0, '#ecf0f1', 13); } break;
        case 'fazenda': if ((p = lugar(r, 4, 3, rng))) {
          sombra(p[0] + 2, p[1] + 2, 16, 12, 4); px(p[0] + 2, p[1] + 2, 16, 12, '#a93226'); px(p[0] + 2, p[1] + 2, 16, 3, '#7b241c'); px(p[0] + 7, p[1] + 8, 6, 6, '#f4f6f6'); px(p[0] + 7, p[1] + 8, 6, 1, '#7b241c');
          disco(p[0] + 25, p[1] + 7, 4, '#95a5a6'); disco(p[0] + 25, p[1] + 7, 2, '#bdc3c7');
          for (let k = 0; k < 4; k++) disco(p[0] + 4 + k * 5, p[1] + 20, 1, '#e5c76b');
        } break;
        case 'plantacao': if ((p = lugar(r, 6, 5, rng, (t) => t === T.GRAMA || t === T.TERRA))) { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) campo(p[0] + a * 24, p[1] + b * 20, 23, 19, rng); } break;
        case 'acampamento': if ((p = lugar(r, 3, 3, rng, (t) => t !== T.ESTRADA && !AGUAS.has(t)))) {
          px(p[0] + 2, p[1] + 2, 20, 20, 'rgba(140,110,70,.45)');
          const cores = ['#e67e22', '#2980b9', '#27ae60', '#c0392b'];
          for (let k = 0; k < 3; k++) { const tx = p[0] + 3 + k * 7, ty = p[1] + 4 + (k % 2) * 8, c = escolha(cores, rng()); for (let l = 0; l < 4; l++) px(tx + 2 - l, ty + l, l * 2 + 1, 1, l === 3 ? mix(c, '#000000', 0.3) : c); }
          disco(p[0] + 12, p[1] + 18, 2, '#5a3b27'); px(p[0] + 12, p[1] + 17, 1, 1, '#f39c12'); fumaca(p[0] + 12, p[1] + 16);
        } break;
        case 'ruinas': if ((p = lugar(r, 4, 4, rng, (t) => t !== T.ESTRADA && !AGUAS.has(t)))) {
          for (let k = 0; k < 7; k++) { const w = 2 + Math.floor(rng() * 9), h = 2 + Math.floor(rng() * 3), x = p[0] + Math.floor(rng() * 24), y = p[1] + Math.floor(rng() * 26); sombra(x, y, w, h, 2); px(x, y, w, h, escolha(['#9a9488', '#827c71', '#aaa497'], rng())); }
          for (let k = 0; k < 10; k++) px(p[0] + rng() * 30, p[1] + rng() * 30, 1, 1, '#6e695f');
        } break;
        case 'quartel': if ((p = lugar(r, 6, 6, rng, (t) => t === T.TERRA || t === T.GRAMA, 200))) {
          g.strokeStyle = 'rgba(200,200,200,.7)'; g.setLineDash([2, 1]); g.lineWidth = 1; g.strokeRect(p[0] + 0.5, p[1] + 0.5, 47, 47); g.setLineDash([]);
          for (const [ox, oy] of [[0, 0], [44, 0], [0, 44], [44, 44]]) { px(p[0] + ox, p[1] + oy, 4, 4, '#5b5e3a'); px(p[0] + ox + 1, p[1] + oy + 1, 2, 2, '#3d3f26'); }
          for (let k = 0; k < 3; k++) predio(p[0] + 4, p[1] + 4 + k * 9, 18, 7, { alto: 3, teto: '#6b7040', reg: id });
          disco(p[0] + 35, p[1] + 12, 6, '#555a5e'); px(p[0] + 33, p[1] + 9, 1, 6, '#f1c40f'); px(p[0] + 37, p[1] + 9, 1, 6, '#f1c40f'); px(p[0] + 33, p[1] + 12, 5, 1, '#f1c40f');
          for (let k = 0; k < 4; k++) { const tx = p[0] + 27 + (k % 2) * 9, ty = p[1] + 24 + Math.floor(k / 2) * 8; for (let l = 0; l < 4; l++) px(tx + 2 - l, ty + l, l * 2 + 1, 1, '#556b2f'); }
          veiculoGrande(p[0] + 12, p[1] + 38, 0, '#4b5320', 10); veiculoGrande(p[0] + 30, p[1] + 42, 0, '#4b5320', 8);
        } break;
        case 'lago': {
          // píer e barcos
          const c = centroReg(id);
          for (let k = 0; k < 40; k++) {
            const a = k / 40 * Math.PI * 2, rx = Math.round(c[0] + Math.cos(a) * R * 0.36), ry = Math.round(c[1] + Math.sin(a) * R * 0.36);
            if (dentro(rx, ry) && tipo[idx(rx, ry)] !== T.LAGO) { const ix = rx * TS, iy = ry * TS; for (let l = 0; l < 3; l++) px(ix - Math.cos(a) * l * 6, iy - Math.sin(a) * l * 6, 5, 5, '#8b6b45'); barco(ix - Math.cos(a) * 26, iy - Math.sin(a) * 26, '#ecf0f1'); break; }
          }
          break; }
        case 'pantano': if ((p = lugar(r, 2, 2, rng, (t) => t === T.PANTANO))) { px(p[0] + 2, p[1] + 10, 1, 5, '#4a3a28'); px(p[0] + 12, p[1] + 10, 1, 5, '#4a3a28'); predio(p[0] + 1, p[1] + 2, 13, 9, { alto: 2, teto: '#6d5a3a', janelas: false }); } break;
        case 'montanha': if ((p = lugar(r, 2, 2, rng, (t) => t === T.ROCHA, 60))) { disco(p[0] + 8, p[1] + 9, 5, '#3d4044'); disco(p[0] + 8, p[1] + 10, 3, '#16181b'); } break;
        case 'carro': { const tr = trechoNa(id, rng); if (tr) carro(tr.x + Math.cos(tr.ang + 1.57) * 3, tr.y + Math.sin(tr.ang + 1.57) * 3, tr.ang + (rng() - 0.5) * 0.6, rng); break; }
        case 'caminhao': { const tr = trechoNa(id, rng); if (tr) veiculoGrande(tr.x, tr.y, tr.ang + (rng() - 0.5) * 0.5, escolha(['#ecf0f1', '#2471a3', '#b9770e'], rng()), 13); break; }
        case 'onibus': { const tr = trechoNa(id, rng); if (tr) veiculoGrande(tr.x, tr.y, tr.ang + (rng() - 0.5) * 0.3, '#f1c40f', 15); break; }
        default: break;
      }
    }
    function trechoNa(id, rng) {
      const lista = trechos.filter(p => reg[idx(Math.floor(p.x / TS), Math.floor(p.y / TS))] === id);
      if (lista.length) return lista[Math.floor(rng() * lista.length)];
      const c = centroReg(id); return { x: c[0] * TS, y: c[1] * TS, ang: rng() * 6 };
    }

    // ---------- 8) recheio de cada tipo de região ----------
    for (const r of regs) {
      const rng = rngDe(seed * 31 + r.id * 977 + 5), tema = r.tema;
      const x0 = (MARG + r.x * R) * TS, y0 = (MARG + r.y * R) * TS;
      cena.centros[r.id] = [x0 + R * TS / 2, y0 + R * TS / 2];
      // marcos primeiro (prioridade)
      const marcos = (r.marcos || []).slice().sort((a, b) => ['hospital', 'quartel', 'fabrica', 'plantacao', 'mercado', 'escola'].indexOf(b) - ['hospital', 'quartel', 'fabrica', 'plantacao', 'mercado', 'escola'].indexOf(a));
      for (const m of marcos) marco(m, r, rng);
      const n = (k) => Math.round(k);
      if (URBANOS.has(tema) || tema === 'bairro') {
        // quarteirões: cada espaço livre entre as ruas vira um bloco dividido em lotes
        const livreT = (x, y) => dentro(x, y) && !occ[idx(x, y)] && reg[idx(x, y)] === r.id && (tipo[idx(x, y)] === T.CONCRETO || tipo[idx(x, y)] === T.GRAMA || tipo[idx(x, y)] === T.TERRA);
        const X0 = MARG + r.x * R, Y0 = MARG + r.y * R;
        const lotes = (x, y, w, h, prof) => {
          const lim = tema === 'bairro' ? 2 : 3;
          if (w > lim && (w >= h || h <= lim) && prof < 6) { const c = 1 + Math.floor(rng() * (w - 1)); lotes(x, y, Math.max(1, c), h, prof + 1); lotes(x + c, y, w - c, h, prof + 1); return; }
          if (h > lim && prof < 6) { const c = 1 + Math.floor(rng() * (h - 1)); lotes(x, y, w, Math.max(1, c), prof + 1); lotes(x, y + c, w, h - c, prof + 1); return; }
          const X = x * TS, Y = y * TS, W = w * TS, H = h * TS, q = rng();
          if (tema === 'bairro') {
            if (w >= 2 && h >= 2 && q < 0.82) casa(X + (W - 16) / 2, Y + (H - 16) / 2, rng, r.id);
            else if (q < 0.9) { px(X, Y, W, H, 'rgba(90,160,70,.5)'); for (let k = 0; k < w * h; k++) arvore(X + 3 + rng() * (W - 6), Y + 3 + rng() * (H - 6), 2 + Math.floor(rng() * 2), rng); }
            else { px(X + 1, Y + 1, W - 2, H - 2, '#7a9a4a'); for (let k = 0; k < w * h * 2; k++) disco(X + 3 + rng() * (W - 6), Y + 3 + rng() * (H - 6), 1, escolha(['#e84393', '#fdcb6e', '#ffffff', '#e17055'], rng())); }
            return;
          }
          if (q < 0.08 && w * h >= 2) {   // praça
            px(X, Y, W, H, '#5aa045'); g.strokeStyle = 'rgba(220,210,180,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X, Y + H / 2); g.lineTo(X + W, Y + H / 2); g.moveTo(X + W / 2, Y); g.lineTo(X + W / 2, Y + H); g.stroke();
            disco(X + W / 2, Y + H / 2, 3, '#bdc3c7'); disco(X + W / 2, Y + H / 2, 2, '#5dade2'); cena.agua.push([X + W / 2 - 1, Y + H / 2, rng() * 100]);
            for (let k = 0; k < 4; k++) arvore(X + 4 + (k % 2) * (W - 8), Y + 4 + (k >> 1) * (H - 8), 3, rng);
          } else if (q < 0.16) {           // estacionamento
            px(X, Y, W, H, '#5d6167'); for (let k = 2; k < W - 2; k += 5) px(X + k, Y + 1, 1, 4, 'rgba(255,255,255,.7)');
            for (let k = 0; k < Math.floor(W / 5); k++) if (rng() < 0.55) carro(X + 4 + k * 5, Y + 3, Math.PI / 2, rng);
          } else {
            const centro = tema === 'centro', alto = centro ? 6 + Math.floor(rng() * 12) : tema === 'hospitalar' ? 5 + Math.floor(rng() * 6) : 3 + Math.floor(rng() * 4);
            const tetos = tema === 'hospitalar' ? ['#eef1f3', '#d9e2e8', '#c7d3db', '#aab7c4'] : centro ? ['#8d99a6', '#a3a9b0', '#7d8a96', '#5f8fb8', '#4f6f8f', '#b0a48f', '#6a737d', '#9b8f84'] : ['#c2b8a3', '#b0a48f', '#9aa59a', '#a3a9b0', '#c9a27e'];
            const teto = escolha(tetos, rng());
            const b = predio(X + 1, Y + 1, W - 2, H - 2, { alto, teto, parede: teto === '#5f8fb8' || teto === '#4f6f8f' ? '#2f4f6f' : undefined, reg: r.id });
            if (teto === '#5f8fb8' || teto === '#4f6f8f') for (let k = 2; k < b.w - 1; k += 3) px(b.x + k, b.y + 1, 1, Math.max(2, b.h - 6), 'rgba(200,230,255,.35)');
            if (tema === 'comercio') toldo(b.x, b.y + b.h - 2, b.w, escolha(['#e74c3c', '#27ae60', '#2980b9', '#f39c12', '#8e44ad'], rng()), '#ffffff');
            if (centro && alto > 13 && rng() < 0.4) { px(b.x + b.w / 2 - 1, b.y - 4, 1, 4, '#555'); px(b.x + b.w / 2 - 1, b.y - 5, 1, 1, '#e74c3c'); }
          }
        };
        for (let ty = Y0; ty < Y0 + R; ty++) for (let tx = X0; tx < X0 + R; tx++) {
          if (!livreT(tx, ty)) continue;
          let w = 1; while (w < 7 && livreT(tx + w, ty)) w++;
          let h = 1; for (; h < 7; h++) { let ok = true; for (let k = 0; k < w; k++) if (!livreT(tx + k, ty + h)) { ok = false; break; } if (!ok) break; }
          ocupar(tx, ty, w, h); lotes(tx, ty, w, h, 0);
        }
      } else if (tema === 'campus') {
        for (let k = 0; k < 4; k++) { const p = lugar(r, 3, 2, rng, (t) => t === T.GRAMA); if (p) predio(p[0] + 1, p[1] + 1, 22, 14, { alto: 4, teto: '#c0846a', reg: r.id }); }
        const f = lugar(r, 2, 2, rng, (t) => t === T.GRAMA, 30, 8); if (f) { disco(f[0] + 8, f[1] + 8, 6, '#bdc3c7'); disco(f[0] + 8, f[1] + 8, 4, '#5dade2'); cena.agua.push([f[0] + 7, f[1] + 7, 3]); }
        for (let k = 0; k < 20; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA); if (p) arvore(p[0] + 4, p[1] + 4, 3, rng); }
      } else if (tema === 'industrial') {
        for (let k = 0; k < 8; k++) { const p = lugar(r, 3 + Math.floor(rng() * 2), 2, rng); if (p) { const b = predio(p[0] + 1, p[1] + 1, 22, 13, { alto: 4, teto: escolha(['#7d8a96', '#a7896a', '#6c7a89'], rng()), reg: r.id, janelas: rng() < 0.5 }); if (rng() < 0.3) { px(b.x + 3, b.y - 5, 2, 7, '#4a4f57'); fumaca(b.x + 4, b.y - 6); } } }
        for (let k = 0; k < 6; k++) { const p = lugar(r, 2, 1, rng); if (p) for (let l = 0; l < 3; l++) px(p[0] + 1, p[1] + l * 2 + 1, 14, 2, escolha(['#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad'], rng())); }
        for (let k = 0; k < 3; k++) { const p = lugar(r, 2, 2, rng); if (p) { disco(p[0] + 8, p[1] + 8, 6, '#a6acaf'); disco(p[0] + 7, p[1] + 7, 4, '#cfd4d7'); } }
      } else if (tema === 'rural') {
        for (let k = 0; k < 10; k++) { const w = 3 + Math.floor(rng() * 4), h = 2 + Math.floor(rng() * 3), p = lugar(r, w, h, rng, (t) => t === T.GRAMA || t === T.TERRA); if (p) campo(p[0] + 1, p[1] + 1, w * TS - 2, h * TS - 2, rng); }
        const pasto = lugar(r, 5, 4, rng, (t) => t === T.GRAMA, 40);
        if (pasto) { g.strokeStyle = 'rgba(120,85,50,.9)'; g.lineWidth = 1; g.strokeRect(pasto[0] + 0.5, pasto[1] + 0.5, 39, 31); for (let k = 0; k < 4 + Math.floor(rng() * 4); k++) cena.bichos.push({ x0: pasto[0] + 4, y0: pasto[1] + 4, w: 30, h: 22, tipo: rng() < 0.6 ? 'vaca' : 'ovelha', h0: rng() * 100 }); }
        for (let k = 0; k < 4; k++) { const p = lugar(r, 2, 2, rng, (t) => t === T.GRAMA); if (p) casa(p[0], p[1], rng, r.id); }
        for (let k = 0; k < 12; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA); if (p) { if (rng() < 0.4) disco(p[0] + 4, p[1] + 4, 2, '#e5c76b'); else arvore(p[0] + 4, p[1] + 4, 3, rng); } }
      } else if (tema === 'mata') {
        for (let k = 0; k < 160; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.MATA || t === T.GRAMA, 3); if (p) arvore(p[0] + 4, p[1] + 4, 3 + Math.floor(rng() * 2), rng, rng() < 0.25 ? 'pinheiro' : 'redonda'); }
        for (let k = 0; k < 6; k++) cena.bichos.push({ x0: x0 + 20, y0: y0 + 20, w: R * TS - 40, h: R * TS - 40, tipo: 'cervo', h0: rng() * 100, raro: true });
      } else if (tema === 'montanha') {
        for (let k = 0; k < 60; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA || t === T.ROCHA, 3); if (p) { if (tipo[idx(p[0] / TS, p[1] / TS)] === T.GRAMA) arvore(p[0] + 4, p[1] + 4, 3, rng, 'pinheiro'); else if (rng() < 0.5) { disco(p[0] + 4, p[1] + 5, 2, '#5d6166'); px(p[0] + 3, p[1] + 3, 2, 1, '#a0a5aa'); } } }
      } else if (tema === 'lago') {
        for (let k = 0; k < 40; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA); if (p) arvore(p[0] + 4, p[1] + 4, 3, rng); }
        for (let k = 0; k < 25; k++) { const tx = Math.floor(MARG + r.x * R + rng() * R), ty = Math.floor(MARG + r.y * R + rng() * R); if (tipo[idx(tx, ty)] === T.AREIA) for (let l = 0; l < 3; l++) px(tx * TS + l * 2, ty * TS + 2, 1, 4, '#5f7a35'); }
      } else if (tema === 'pantano') {
        for (let k = 0; k < 50; k++) { const tx = Math.floor(MARG + r.x * R + rng() * R), ty = Math.floor(MARG + r.y * R + rng() * R), t = tipo[idx(tx, ty)];
          if (t === T.LAMA) { disco(tx * TS + 4, ty * TS + 4, 1, '#4f8a3a'); px(tx * TS + 4, ty * TS + 3, 1, 1, '#e8a0c0'); } else if (t === T.PANTANO && rng() < 0.4) arvore(tx * TS + 4, ty * TS + 4, 3, rng, 'seca'); else if (t === T.PANTANO) for (let l = 0; l < 3; l++) px(tx * TS + l * 2 + 1, ty * TS + 2, 1, 4, '#6d7f3a'); }
      } else if (tema === 'militar') {
        for (let k = 0; k < 8; k++) { const p = lugar(r, 3, 1, rng, (t) => t === T.TERRA || t === T.GRAMA); if (p) predio(p[0] + 1, p[1] + 1, 22, 7, { alto: 3, teto: '#6b7040', reg: r.id }); }
        for (let k = 0; k < 8; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.TERRA || t === T.GRAMA); if (p) for (let l = 0; l < 4; l++) px(p[0] + 4 - l, p[1] + 2 + l, l * 2 + 1, 1, l === 3 ? '#3d4a1f' : '#556b2f'); }
        for (let k = 0; k < 4; k++) { const p = lugar(r, 2, 1, rng, (t) => t === T.TERRA); if (p) veiculoGrande(p[0] + 8, p[1] + 4, 0, '#4b5320', 9); }
        { const p = lugar(r, 2, 2, rng, (t) => t === T.TERRA || t === T.GRAMA); if (p) { disco(p[0] + 8, p[1] + 8, 6, '#555a5e'); px(p[0] + 6, p[1] + 5, 1, 6, '#f1c40f'); px(p[0] + 10, p[1] + 5, 1, 6, '#f1c40f'); px(p[0] + 6, p[1] + 8, 5, 1, '#f1c40f'); } }
        for (let k = 0; k < 10; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA); if (p) arvore(p[0] + 4, p[1] + 4, 3, rng); }
      } else if (tema === 'praia') {
        for (let k = 0; k < 6; k++) { const p = lugar(r, 2, 2, rng, (t) => t === T.GRAMA, 10); if (p) casa(p[0], p[1], rng, r.id); }
        for (let k = 0; k < 40; k++) { const tx = Math.floor(MARG + r.x * R + rng() * R), ty = Math.floor(MARG + r.y * R + rng() * R), i = idx(tx, ty);
          if (tipo[i] !== T.AREIA || occ[i]) continue; occ[i] = 4;
          const q = rng(); if (q < 0.35) arvore(tx * TS + 4, ty * TS + 4, 3, rng, 'palmeira'); else if (q < 0.65) { disco(tx * TS + 4, ty * TS + 4, 3, escolha(['#e74c3c', '#f1c40f', '#3498db', '#ffffff'], rng())); px(tx * TS + 4, ty * TS + 4, 1, 1, '#555'); } else if (q < 0.8) px(tx * TS + 2, ty * TS + 3, 4, 2, escolha(['#e84393', '#00cec9', '#fdcb6e'], rng())); }
        for (let k = 0; k < 3; k++) { const tx = Math.floor(MARG + r.x * R + rng() * R), ty = Math.floor(MARG + r.y * R + rng() * R); if (tipo[idx(tx, ty)] === T.RASO || tipo[idx(tx, ty)] === T.AGUA) barco(tx * TS + 4, ty * TS + 4, escolha(['#ffffff', '#e74c3c', '#f39c12'], rng())); }
        for (let k = 0; k < 12; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA); if (p) arvore(p[0] + 4, p[1] + 4, 3, rng, rng() < 0.5 ? 'palmeira' : 'redonda'); }
      } else if (tema === 'rodovia') {
        for (let k = 0; k < 3; k++) { const p = lugar(r, 2, 1, rng, (t) => t === T.GRAMA || t === T.TERRA); if (p) { px(p[0] + 2, p[1] + 2, 12, 4, escolha(['#f39c12', '#16a085', '#8e44ad'], rng())); px(p[0] + 2, p[1] + 2, 12, 1, 'rgba(255,255,255,.4)'); px(p[0] + 7, p[1] + 6, 1, 2, '#555'); } }
        for (let k = 0; k < 20; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA); if (p) arvore(p[0] + 4, p[1] + 4, 3, rng); }
      } else if (tema === 'ruinas') {
        for (let k = 0; k < 14; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA || t === T.TERRA); if (p) { const w = 3 + Math.floor(rng() * 5); sombra(p[0], p[1] + 2, w, 2, 2); px(p[0], p[1] + 2, w, 2, '#9a9488'); } }
        for (let k = 0; k < 30; k++) { const p = lugar(r, 1, 1, rng, (t) => t === T.GRAMA); if (p) arvore(p[0] + 4, p[1] + 4, 3, rng, rng() < 0.2 ? 'seca' : 'redonda'); }
      }
      void n;
    }
    // carros abandonados pelas estradas (todo mundo sumiu de repente)
    const rc = rngDe(seed + 999);
    for (let k = 0; k < trechos.length; k++) if (rc() < 0.05) { const p = trechos[k]; carro(p.x + Math.cos(p.ang + 1.57) * (rc() < 0.5 ? -2 : 2), p.y + Math.sin(p.ang + 1.57) * 2, p.ang + (rc() - 0.5) * 0.8, rc); }
    // árvores soltas nos gramados que sobraram
    for (let k = 0; k < Wt * Wt * 0.02; k++) { const tx = Math.floor(rc() * Wt), ty = Math.floor(rc() * Wt), i = idx(tx, ty); if (occ[i] || tipo[i] !== T.GRAMA) continue; const tm = temaDe(reg[i]); if (URBANOS.has(tm)) continue; occ[i] = 4; arvore(tx * TS + 4, ty * TS + 4, 3, rc); }
    // ilhotas com palmeiras
    for (let k = 0; k < Wt * 4; k++) { const tx = Math.floor(rc() * Wt), ty = Math.floor(rc() * Wt), i = idx(tx, ty); if (tipo[i] === T.AREIA && reg[i] >= 0 && occ[i] === 0 && fbm(tx * 0.13, ty * 0.13, seed + 55) > 0.74 && rc() < 0.3) { arvore(tx * TS + 4, ty * TS + 4, 3, rc, 'palmeira'); occ[i] = 4; } }
    // barcos à deriva no mar
    for (let k = 0; k < 6; k++) { const tx = Math.floor(rc() * Wt), ty = Math.floor(rc() * Wt); if (tipo[idx(tx, ty)] === T.AGUA) barco(tx * TS, ty * TS, escolha(['#ffffff', '#c0392b', '#2c3e50'], rc())); }
    // limita a quantidade de brilhos de água (desempenho)
    cena.tipo = tipo;
    if (cena.agua.length > 2200) cena.agua = cena.agua.filter((_, k) => k % Math.ceil(cena.agua.length / 2200) === 0);
    if (cena.espuma.length > 3000) cena.espuma = cena.espuma.filter((_, k) => k % Math.ceil(cena.espuma.length / 3000) === 0);
    return cena;
  }

  // =================================================================
  //  COMPONENTE (camera, animação, interação)
  // =================================================================
  function nuvemSprite(cor, raio) {
    const c = document.createElement('canvas'); c.width = c.height = raio * 2;
    const g = c.getContext('2d'), gr = g.createRadialGradient(raio, raio, 1, raio, raio, raio);
    gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, raio * 2, raio * 2);
    return c;
  }
  const SPR_NEVOA = nuvemSprite('rgba(214,204,236,0.85)', 48), SPR_NUVEM = nuvemSprite('rgba(255,255,255,0.75)', 48), SPR_SOMBRA = nuvemSprite('rgba(0,10,30,0.35)', 48), SPR_FUMACA = nuvemSprite('rgba(200,200,205,0.8)', 12);

  function criarMundoCanvas(canvas, opc) {
    opc = opc || {};
    // embrulho com botões
    const caixa = document.createElement('div'); caixa.className = 'mundo-caixa';
    canvas.parentNode.insertBefore(caixa, canvas); caixa.appendChild(canvas);
    const barra = document.createElement('div'); barra.className = 'mundo-botoes';
    barra.innerHTML = '<button type="button" data-b="mais" title="Aproximar">＋</button><button type="button" data-b="menos" title="Afastar">－</button><button type="button" data-b="eu" title="Centralizar em mim">📍</button><button type="button" data-b="tudo" title="Ver a ilha inteira">🗺️</button><button type="button" data-b="cheia" title="Tela cheia">⛶</button>';
    caixa.appendChild(barra);
    const ctx = canvas.getContext('2d');
    let cena = null, dados = null, cam = { z: 1, cx: 0, cy: 0 }, ajustado = false, hover = -1, mouse = null, ultimo = 0, rodando = false;
    const dpr = () => Math.min(2, window.devicePixelRatio || 1);
    function tamanho() {
      const w = Math.max(200, caixa.clientWidth), h = Math.max(200, caixa.clientHeight);
      if (canvas.width !== Math.round(w * dpr()) || canvas.height !== Math.round(h * dpr())) { canvas.width = Math.round(w * dpr()); canvas.height = Math.round(h * dpr()); }
    }
    const zFit = () => cena ? Math.min(canvas.width, canvas.height) / (cena.WP - MARG * TS * 1.2) : 1;
    function limitar() {
      if (!cena) return;
      cam.z = Math.max(zFit() * 0.9, Math.min(zFit() * 8, cam.z));
      const mx = canvas.width / 2 / cam.z, my = canvas.height / 2 / cam.z;
      cam.cx = Math.max(Math.min(mx, cena.WP / 2), Math.min(cena.WP - Math.min(mx, cena.WP / 2), cam.cx));
      cam.cy = Math.max(Math.min(my, cena.WP / 2), Math.min(cena.WP - Math.min(my, cena.WP / 2), cam.cy));
    }
    function verTudo() { if (!cena) return; cam.z = zFit(); cam.cx = cam.cy = cena.WP / 2; limitar(); }
    function irPara(id, zoom) { if (!cena || id == null || !cena.centros[id]) return; cam.cx = cena.centros[id][0]; cam.cy = cena.centros[id][1]; cam.z = zFit() * (zoom || 2.6); limitar(); }
    const telaParaMundo = (sx, sy) => [(sx * dpr() - canvas.width / 2) / cam.z + cam.cx, (sy * dpr() - canvas.height / 2) / cam.z + cam.cy];
    const mundoParaTela = (wx, wy) => [(wx - cam.cx) * cam.z + canvas.width / 2, (wy - cam.cy) * cam.z + canvas.height / 2];
    function regiaoEm(wx, wy) {
      if (!cena) return -1;
      const tx = Math.floor(wx / TS) - MARG, ty = Math.floor(wy / TS) - MARG;
      if (tx < 0 || ty < 0 || tx >= cena.N * R || ty >= cena.N * R) return -1;
      return Math.floor(ty / R) * cena.N + Math.floor(tx / R);
    }

    function pessoa(sx, sy, cor, cabelo, esc, bob) {
      const s = esc, y = sy + bob * s;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sx - 4 * s, sy + 8 * s, 8 * s, 2 * s);
      ctx.fillStyle = '#1e1e1e'; ctx.fillRect(sx - 3 * s, y + 5 * s, 2 * s, 3 * s); ctx.fillRect(sx + 1 * s, y + 5 * s, 2 * s, 3 * s);
      ctx.fillStyle = cor; ctx.fillRect(sx - 3 * s, y - 1 * s, 6 * s, 6 * s);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(sx - 3 * s, y - 1 * s, 6 * s, 1 * s);
      ctx.fillStyle = '#f1c7a0'; ctx.fillRect(sx - 2 * s, y - 6 * s, 5 * s, 5 * s);
      ctx.fillStyle = cabelo; ctx.fillRect(sx - 2 * s, y - 7 * s, 5 * s, 2 * s);
      ctx.fillStyle = '#111'; ctx.fillRect(sx - 1 * s, y - 4 * s, 1 * s, 1 * s); ctx.fillRect(sx + 1 * s, y - 4 * s, 1 * s, 1 * s);
    }
    function caixaRegiao(id, cor, larg, tracejado, tempo) {
      const r = dados.regioes[id]; if (!r) return;
      const x = (MARG + r.x * R) * TS, y = (MARG + r.y * R) * TS;
      ctx.strokeStyle = cor; ctx.lineWidth = larg / cam.z;
      ctx.setLineDash(tracejado ? [8 / cam.z, 5 / cam.z] : []); ctx.lineDashOffset = tracejado ? -tempo / 60 / cam.z : 0;
      ctx.strokeRect(x + 2, y + 2, R * TS - 4, R * TS - 4); ctx.setLineDash([]);
    }

    function quadro(tempo) {
      tamanho();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#123a6e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!cena) return;
      ctx.setTransform(cam.z, 0, 0, cam.z, canvas.width / 2 - cam.cx * cam.z, canvas.height / 2 - cam.cy * cam.z);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cena.img, 0, 0);
      // água brilhando e espuma
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      for (const [x, y, h] of cena.agua) { const s = Math.sin(tempo / 700 + h); if (s > 0.82) ctx.fillRect(x, y, s > 0.95 ? 3 : 2, 1); }
      for (const [x, y, horiz, h] of cena.espuma) { const s = (Math.sin(tempo / 900 + h) + 1) / 2; ctx.fillStyle = `rgba(255,255,255,${0.15 + s * 0.4})`; if (horiz) ctx.fillRect(x, y, 2, TS); else ctx.fillRect(x, y, TS, 2); }
      // barcos
      for (const [x, y, cor, h] of cena.barcos) { const b = Math.sin(tempo / 800 + h * 20) * 1; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 3, y + 2 + b, 8, 2); ctx.fillStyle = cor; ctx.fillRect(x - 4, y + b, 8, 3); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x - 3, y + 2 + b, 6, 1); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - 6 - (tempo / 200 % 3), y + 2 + b, 2, 1); }
      // janelas acesas onde ainda há luz
      for (const r of dados.regioes) {
        if (r.luz === false) continue;
        const js = cena.janelas[r.id]; if (!js) continue;
        for (const [x, y, h] of js) { if (h < 0.55) continue; const f = h > 0.97 && Math.sin(tempo / 120 + h * 99) > 0.6 ? 0.25 : 0.85; ctx.fillStyle = `rgba(255,214,120,${f})`; ctx.fillRect(x, y, 2, 1); }
      }
      // bichos
      for (const b of cena.bichos) {
        if (b.raro && Math.sin(tempo / 9000 + b.h0) < 0.3) continue;
        const x = b.x0 + (Math.sin(tempo / 7000 + b.h0) * 0.5 + 0.5) * b.w, y = b.y0 + (Math.cos(tempo / 9000 + b.h0 * 1.7) * 0.5 + 0.5) * b.h;
        if (b.tipo === 'vaca') { ctx.fillStyle = '#f5f5f5'; ctx.fillRect(x, y, 4, 3); ctx.fillStyle = '#222'; ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + 4, y, 1, 2); }
        else if (b.tipo === 'ovelha') { ctx.fillStyle = '#ecf0f1'; ctx.fillRect(x, y, 3, 2); ctx.fillStyle = '#333'; ctx.fillRect(x + 3, y, 1, 1); }
        else { ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x, y, 4, 2); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 3, y - 1, 1, 1); }
      }
      // fumaça
      for (const [x, y, h] of cena.fumaca) for (let k = 0; k < 6; k++) {
        const f = ((tempo / 2600) + k / 6 + h) % 1, sx = x + Math.sin(f * 5 + h * 10) * 2 + f * 10, sy = y - f * 26, raio = 3 + f * 7;
        ctx.globalAlpha = (1 - f) * 0.55; ctx.drawImage(SPR_FUMACA, sx - raio, sy - raio, raio * 2, raio * 2);
      }
      ctx.globalAlpha = 1;
      // pistas do mapa secreto
      const p = dados.pista;
      if (p && p.regiao == null) {
        ctx.fillStyle = `rgba(179,146,240,${0.12 + 0.05 * Math.sin(tempo / 500)})`;
        if (p.x != null) ctx.fillRect((MARG + p.x * R) * TS, MARG * TS, R * TS, cena.N * R * TS);
        if (p.y != null) ctx.fillRect(MARG * TS, (MARG + p.y * R) * TS, cena.N * R * TS, R * TS);
      }
      // grade discreta das regiões
      ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1 / cam.z;
      for (let i = 0; i <= cena.N; i++) { const o = (MARG + i * R) * TS; ctx.beginPath(); ctx.moveTo(o, MARG * TS); ctx.lineTo(o, (MARG + cena.N * R) * TS); ctx.moveTo(MARG * TS, o); ctx.lineTo((MARG + cena.N * R) * TS, o); ctx.stroke(); }
      // névoa
      for (const r of dados.regioes) if (r.neblina) {
        const x = (MARG + r.x * R) * TS, y = (MARG + r.y * R) * TS, L = R * TS;
        ctx.fillStyle = 'rgba(70,60,100,.16)'; ctx.fillRect(x, y, L, L);
        for (let k = 0; k < 4; k++) {
          const a = tempo / 6000 + k * 1.9 + r.id, bx = x + L / 2 + Math.cos(a) * L * 0.3 + Math.sin(tempo / 4000 + k) * 10, by = y + L / 2 + Math.sin(a * 0.7) * L * 0.3, raio = L * (0.32 + (k % 3) * 0.08);
          ctx.globalAlpha = 0.22; ctx.drawImage(SPR_NEVOA, bx - raio, by - raio, raio * 2, raio * 2);
        }
        ctx.globalAlpha = 1;
      }
      // nuvens (sombra no chão + nuvem)
      for (let k = 0; k < 7; k++) {
        const vel = 0.004 + (k % 3) * 0.002, x = ((tempo * vel + hash(k, 1, cena.seed) * cena.WP * 2) % (cena.WP + 300)) - 150, y = hash(k, 2, cena.seed) * cena.WP, raio = 50 + hash(k, 3, cena.seed) * 60;
        ctx.globalAlpha = 0.5; ctx.drawImage(SPR_SOMBRA, x + 30 - raio, y + 40 - raio * 0.7, raio * 2, raio * 1.4);
        ctx.globalAlpha = 0.28; ctx.drawImage(SPR_NUVEM, x - raio, y - raio * 0.7, raio * 2, raio * 1.4); ctx.drawImage(SPR_NUVEM, x - raio * 0.4, y - raio * 0.9, raio * 1.5, raio * 1.1);
      }
      ctx.globalAlpha = 1;
      // destaques
      for (const id of dados.vizinhas || []) caixaRegiao(id, 'rgba(74,163,255,.95)', 2.5, true, tempo);
      if (dados.eu != null) caixaRegiao(dados.eu, `rgba(63,185,80,${0.6 + 0.4 * Math.sin(tempo / 300)})`, 3.5, false, tempo);
      if (dados.escolha != null) caixaRegiao(dados.escolha, '#e3b341', 4, false, tempo);
      if (hover >= 0) caixaRegiao(hover, 'rgba(255,255,255,.85)', 2, false, tempo);
      if (p && p.regiao != null && cena.centros[p.regiao]) {
        const [x, y] = cena.centros[p.regiao]; ctx.strokeStyle = `rgba(179,146,240,${0.6 + 0.4 * Math.sin(tempo / 250)})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x - 16, y - 16); ctx.lineTo(x + 16, y + 16); ctx.moveTo(x + 16, y - 16); ctx.lineTo(x - 16, y + 16); ctx.stroke();
      }
      // ---- camada de tela: nomes, pessoas e dica ----
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fz = cam.z / zFit();
      if (fz >= 1.9) {
        ctx.font = `bold ${Math.round(11 * dpr())}px monospace`; ctx.textAlign = 'left';
        for (const r of dados.regioes) {
          const [sx, sy] = mundoParaTela((MARG + r.x * R) * TS + 4, (MARG + r.y * R) * TS + 4);
          if (sx < -200 || sy < -50 || sx > canvas.width || sy > canvas.height) continue;
          const txt = `${r.icone || ''} ${r.nome}`; const w = ctx.measureText(txt).width;
          ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sx, sy, w + 8 * dpr(), 16 * dpr()); ctx.fillStyle = r.neblina ? '#d6ccec' : '#fff'; ctx.fillText(txt, sx + 4 * dpr(), sy + 12 * dpr());
        }
      }
      const porRegiao = {};
      const ponha = (id, cor, nome) => { if (id == null) return; (porRegiao[id] = porRegiao[id] || []).push({ cor, nome }); };
      for (const a of dados.aliados || []) ponha(a.regiao, '#4aa3ff', a.nome);
      for (const o of dados.outros || []) ponha(o.regiao, '#f85149', o.nome);
      if (dados.eu != null) ponha(dados.eu, '#3fb950', 'Você');
      const esc = Math.max(1.5, Math.min(4, cam.z * 0.9)) * dpr() / 1.4;
      ctx.font = `bold ${Math.round(11 * dpr())}px monospace`; ctx.textAlign = 'center';
      for (const id in porRegiao) {
        const c = cena.centros[id]; if (!c) continue;
        const [cx, cy] = mundoParaTela(c[0], c[1]), lista = porRegiao[id];
        lista.forEach((q, i) => {
          const x = cx + (i - (lista.length - 1) / 2) * Math.max(14 * esc, 46 * dpr()), bob = Math.sin(tempo / 220 + i * 1.7) * 0.8;
          pessoa(x, cy, q.cor, ['#2d1b0e', '#5a3b1a', '#c9a15b', '#111', '#8a2b0e'][(q.nome.length + i) % 5], esc, bob);
          ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(q.nome, x + 1, cy - 9 * esc + 1); ctx.fillStyle = '#fff'; ctx.fillText(q.nome, x, cy - 9 * esc);
        });
      }
      if (hover >= 0 && mouse && dados.regioes[hover]) {
        const r = dados.regioes[hover];
        const linhas = [`${r.icone || ''} ${r.nome}${r.neblina ? '  🌫️ névoa' : ''}${r.luz === false ? '  (sem luz)' : ''}`];
        if (r.marcos && r.marcos.length) linhas.push(resumoMarcos(r.marcos));
        if ((dados.vizinhas || []).includes(hover)) linhas.push('Clique para planejar ir até aqui');
        else if (opc.dicaClique) linhas.push(opc.dicaClique);
        ctx.font = `${Math.round(12 * dpr())}px monospace`; ctx.textAlign = 'left';
        const w = Math.max(...linhas.map(l => ctx.measureText(l).width)) + 14 * dpr(), h = linhas.length * 16 * dpr() + 8 * dpr();
        let x = mouse[0] * dpr() + 14 * dpr(), y = mouse[1] * dpr() + 14 * dpr();
        if (x + w > canvas.width) x = canvas.width - w - 4; if (y + h > canvas.height) y = canvas.height - h - 4;
        ctx.fillStyle = 'rgba(10,14,20,.88)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w, h);
        linhas.forEach((l, k) => { ctx.fillStyle = k === 0 ? '#fff' : '#9fb0bf'; ctx.fillText(l, x + 7 * dpr(), y + (17 + k * 16) * dpr()); });
      }
    }
    const NOMES_MARCO = { casa: 'casas', apartamento: 'prédios', mercado: 'mercado', padaria: 'padaria', restaurante: 'restaurante', farmacia: 'farmácia', loja_ferragens: 'ferragens', loja_esportes: 'loja de esportes', loja_roupas: 'loja de roupas', loja_eletronicos: 'eletrônicos', posto_gasolina: 'posto', oficina: 'oficina', hospital: 'hospital', delegacia: 'delegacia', quartel: 'quartel', bombeiros: 'bombeiros', escola: 'escola', biblioteca: 'biblioteca', igreja: 'igreja', escritorios: 'escritórios', fabrica: 'fábrica', armazem: 'armazém', fazenda: 'fazenda', carro: 'carros', caminhao: 'caminhão', onibus: 'ônibus', acampamento: 'acampamento', mata: 'mata', lago: 'lago', plantacao: 'plantação', ruinas: 'ruínas', montanha: 'caverna', pantano: 'cabana' };
    function resumoMarcos(m) { const u = [...new Set(m)].map(x => NOMES_MARCO[x] || x); return u.slice(0, 6).join(', ') + (u.length > 6 ? '…' : ''); }

    function laco(t) {
      if (!rodando) return;
      requestAnimationFrame(laco);
      if (canvas.offsetParent === null && !caixa.classList.contains('cheia')) return;
      if (t - ultimo < 33) return; ultimo = t;
      quadro(t);
    }
    // ---- interação: arrastar, zoom, clique ----
    const toques = new Map(); let arrasto = null, pinca = null;
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); toques.set(e.pointerId, [e.offsetX, e.offsetY]);
      if (toques.size === 1) arrasto = { x: e.offsetX, y: e.offsetY, cx: cam.cx, cy: cam.cy, mov: 0 };
      if (toques.size === 2) { const [a, b] = [...toques.values()]; pinca = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z }; arrasto = null; } });
    canvas.addEventListener('pointermove', (e) => {
      mouse = [e.offsetX, e.offsetY];
      const w = telaParaMundo(e.offsetX, e.offsetY); hover = regiaoEm(w[0], w[1]);
      if (toques.has(e.pointerId)) toques.set(e.pointerId, [e.offsetX, e.offsetY]);
      if (pinca && toques.size === 2) { const [a, b] = [...toques.values()]; cam.z = pinca.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinca.d; limitar(); return; }
      if (arrasto) { const dx = e.offsetX - arrasto.x, dy = e.offsetY - arrasto.y; arrasto.mov = Math.max(arrasto.mov, Math.hypot(dx, dy)); if (arrasto.mov > 4) { cam.cx = arrasto.cx - dx * dpr() / cam.z; cam.cy = arrasto.cy - dy * dpr() / cam.z; limitar(); } }
    });
    const soltar = (e) => {
      const foi = arrasto && arrasto.mov <= 4 && toques.size === 1;
      toques.delete(e.pointerId); if (toques.size < 2) pinca = null;
      if (foi) { const w = telaParaMundo(e.offsetX, e.offsetY), id = regiaoEm(w[0], w[1]); if (id >= 0 && opc.onClick) opc.onClick(id); }
      arrasto = null;
    };
    canvas.addEventListener('pointerup', soltar); canvas.addEventListener('pointercancel', (e) => { toques.delete(e.pointerId); arrasto = null; pinca = null; });
    canvas.addEventListener('pointerleave', () => { hover = -1; mouse = null; });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const antes = telaParaMundo(e.offsetX, e.offsetY);
      cam.z *= Math.pow(1.0015, -e.deltaY); limitar();
      const depois = telaParaMundo(e.offsetX, e.offsetY);
      cam.cx += antes[0] - depois[0]; cam.cy += antes[1] - depois[1]; limitar();
    }, { passive: false });
    canvas.addEventListener('dblclick', (e) => { const w = telaParaMundo(e.offsetX, e.offsetY); cam.cx = w[0]; cam.cy = w[1]; cam.z *= 1.8; limitar(); });
    barra.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.dataset.b;
      if (k === 'mais') { cam.z *= 1.4; limitar(); } else if (k === 'menos') { cam.z /= 1.4; limitar(); }
      else if (k === 'eu') irPara(dados && (dados.eu != null ? dados.eu : dados.escolha));
      else if (k === 'tudo') verTudo();
      else if (k === 'cheia') { caixa.classList.toggle('cheia'); setTimeout(() => { tamanho(); limitar(); }, 30); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && caixa.classList.contains('cheia')) { caixa.classList.remove('cheia'); setTimeout(() => { tamanho(); limitar(); }, 30); } });
    window.addEventListener('resize', () => { tamanho(); limitar(); });

    return {
      atualizar(d) {
        const chave = d.seed + ':' + d.N + ':' + d.regioes.map(r => r.tema).join(',');
        dados = d;
        if (!cena || cena.chave !== chave) { cena = gerarCena(d); cena.chave = chave; ajustado = false; }
        tamanho();
        if (!ajustado && caixa.clientWidth > 0) { verTudo(); ajustado = true; }
        if (!rodando) { rodando = true; requestAnimationFrame(laco); }
      },
      irPara, verTudo,
      _estado: () => ({ cam, temCena: !!cena, centros: cena && cena.centros, rio: cena ? cena.tipo.filter(t => t === 12).length : 0, primeiroRio: cena ? cena.tipo.indexOf(12) : -1, Wt: cena && cena.Wt, cor: cena ? (() => { const i = cena.tipo.indexOf(12), x = (i % cena.Wt) * 8 + 4, y = Math.floor(i / cena.Wt) * 8 + 4; return Array.from(cena.img.getContext('2d').getImageData(x, y, 1, 1).data); })() : null, ponte: cena ? cena.tipo.filter(t => t === 14).length : 0 }),
    };
  }
  window.criarMundoCanvas = criarMundoCanvas;
})();
