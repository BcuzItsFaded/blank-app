// La Mulata de Córdoba: La mujer que desafió a la muerte — a vertical field sketchbook in pen and wash (Plot Twist with A&R).
// One page per scene, drawn in stroke order; washes bloom. The only strong colour is her red shawl (rebozo);
// the drawn ship on the cell wall is a line that the pen can move. Figures are original faceless sketch people.
// Violence is implied: the pyre seen from far off as smoke, the cell empty, no blood.
import { INK, PAPER, clamp, lerp, ss, TAU, rng, fbm, rgba, hex, mix3, ellipse, rough, penStroke, drawPen, wash, reserve, figure, drawPrims, handwrite, sketchShape, R3 } from './engine.js';
import { stand, walk } from './poses.js';
import { cues, wrap } from './subs.js';
const { V } = R3;

const W = 1080, H = 1920;
const out = document.getElementById('c'), ctx = out.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const IC = mk().getContext('2d'), CC = mk().getContext('2d'), STAT = mk(), SX = STAT.getContext('2d'), SNAP = mk(), SNX = SNAP.getContext('2d');
let T = 0;
const seg = (t, a, d) => clamp((t - a) / Math.max(1e-6, d));
const b12 = () => T * 12 | 0;

const C = { sea: hex('#7c9aa6'), night: hex('#56627d'), stone: hex('#cdbd9c'), slate: hex('#8d96a3'), wall: hex('#d9c9a8'), dusk: hex('#c9a183'), lamp: hex('#e6d39a'), adobe: hex('#c9a27e'), sky: hex('#a9c0d6'), leaf: hex('#7fa04a'), sand: hex('#d7bf94'), wood: hex('#a57c55'), ochre: hex('#d8ad74') };
const RED = hex('#a8322f'), REDINK = mix3(RED, INK, .25);
const LK = {
  soledad: { skin: hex('#b9825f'), top: hex('#e9e1d0'), bottom: hex('#e9e1d0'), hair: hex('#1f1a18'), hairLong: 1, dress: 1, flare: .18, sleeve: 'long', torso: [.078, .06, .086], shoe: hex('#2a2a2a') },
  guard: { skin: hex('#c48e6e'), top: hex('#4e5345'), bottom: hex('#474b3f'), hair: hex('#2a2a2a'), sleeve: 'long', pants: 1, torso: [.084, .092, .116], shoe: hex('#1d1d1d') },
  judge: { skin: hex('#e4c0a0'), top: hex('#2a2a30'), bottom: hex('#2a2a30'), hair: hex('#cfcac2'), sleeve: 'long', pants: 1, torso: [.09, .1, .12], shoe: hex('#111111') },
  woman: { skin: hex('#d9a383'), top: hex('#8b7a66'), bottom: hex('#8b7a66'), hair: hex('#2a1e18'), hairLong: 1, dress: 1, flare: .16, sleeve: 'long', torso: [.08, .062, .088], shoe: hex('#3a2a22') },
  old: { skin: hex('#c89274'), top: hex('#7a6248'), bottom: hex('#4a4a4e'), hair: hex('#c9c4bd'), sleeve: 'long', pants: 1, torso: [.082, .088, .112], shoe: hex('#2a2a2a') },
};

let S = [], D = [], LINES = [], CUES = [], SHOTS = [];
const GAP = .2;
const Lt = (i, f) => S[i - 1] + f * (D[i - 1] + GAP);
const LEND = i => S[i - 1] + D[i - 1] + GAP;

// ---------------------------------------------------------------- a page (same pipeline as the other sketch films)
class Page {
  constructor(seed, note) { this.items = []; this.seed = seed; this.k = 0; if (note) this.text(note, 1030, 104, 46, { font: 'Reenie Beanie', align: 'right', weight: 400 }); }
  s() { return this.seed * 97 + (this.k++) * 13; }
  ink(pts, o = {}) { const st = penStroke(pts, { w: o.w ?? 2.3, wob: o.wob ?? 1.1, over: o.over ?? 5, gap: o.gap ?? .35, seed: this.s(), smooth: o.smooth }); this.items.push({ ty: 'ink', st, a: o.a ?? 1, col: o.col }); return st; }
  line(x0, y0, x1, y1, o = {}) { return this.ink([[x0, y0], [x1, y1]], { smooth: false, ...o }); }
  rect(x, y, w, h, o = {}) { this.line(x, y, x + w, y, o); this.line(x + w, y, x + w, y + h, o); this.line(x + w, y + h, x, y + h, o); this.line(x, y + h, x, y, o); }
  shape(poly, o = {}) { this.ink([...poly, poly[0]], { smooth: false, ...o }); }
  circle(x, y, r, o = {}) { const e = ellipse(x, y, r, o.ry ?? r, 30); this.ink([...e, e[0], e[1]], { smooth: true, ...o }); }
  wash(poly, col, o = {}) { this.items.push({ ty: 'wash', poly, col, a: o.a ?? .45, seed: this.s(), dx: o.dx ?? 3, dy: o.dy ?? 2, j: o.j ?? 5, src: o.src, layers: o.layers ?? 3, late: o.late ?? 0, edge: o.edge ?? .3 }); }
  rwash(x, y, w, h, col, o = {}) { this.wash([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, o); }
  reserve(poly, o = {}) { this.items.push({ ty: 'reserve', poly, a: o.a ?? .95, late: o.late ?? 0 }); }
  text(s, x, y, size, o = {}) { this.items.push({ ty: 'text', s, x, y, size, font: o.font ?? 'Caveat', weight: o.weight ?? 500, col: o.col, align: o.align }); }
  schedule(Tdraw) {
    const cost = it => it.ty === 'ink' ? Math.max(30, it.st.L) : it.ty === 'text' ? it.s.length * 26 * it.size / 40 : 0;
    const total = this.items.reduce((a, it) => a + cost(it), 0) || 1; let acc = 0;
    const nw = this.items.filter(it => ['wash', 'reserve'].includes(it.ty)).length || 1; let iw = 0;
    for (const it of this.items) {
      const c = cost(it);
      if (c) { it.t0 = acc / total * Tdraw * .8; it.d = Math.max(.06, c / total * Tdraw * 1.6); acc += c; }
      else { it.t0 = Tdraw * .4 + iw / nw * Tdraw * .55 + (it.late ?? 0); it.d = .7; iw++;
        let cx = 0, cy = 0; for (const p of it.poly) { cx += p[0]; cy += p[1]; } cx /= it.poly.length; cy /= it.poly.length; it.src = it.src ?? [cx, cy]; it.R = Math.max(...it.poly.map(p => Math.hypot(p[0] - it.src[0], p[1] - it.src[1]))) + 30; }
    }
    this.end = Math.max(...this.items.map(it => (it.t0 ?? 0) + (it.d ?? 0))) + .05;
    return this;
  }
}

// ---------------------------------------------------------------- paper and the frayed edge
const PAPERCV = mk(), PX = PAPERCV.getContext('2d'), TOOTH = document.createElement('canvas'), MASK = mk();
function makePaper() {
  PX.fillStyle = rgba(PAPER); PX.fillRect(0, 0, W, H);
  const sm = document.createElement('canvas'); sm.width = 135; sm.height = 240; const sx = sm.getContext('2d'), id = sx.createImageData(135, 240);
  for (let y = 0; y < 240; y++) for (let x = 0; x < 135; x++) { const v = fbm(x * .05, y * .05, 3, 4) * .7 + fbm(x * .2, y * .2, 9, 2) * .3, g = 255 - v * 26; const i = (y * 135 + x) * 4; id.data[i] = g; id.data[i + 1] = g - 2; id.data[i + 2] = g - 6; id.data[i + 3] = 255; }
  sx.putImageData(id, 0, 0); PX.save(); PX.globalCompositeOperation = 'multiply'; PX.drawImage(sm, 0, 0, W, H); PX.restore();
  TOOTH.width = TOOTH.height = 256; const tx = TOOTH.getContext('2d'), td = tx.createImageData(256, 256), r = rng(5);
  for (let i = 0; i < 256 * 256; i++) { const g = 255 - Math.pow(r(), 3) * 40; td.data[i * 4] = td.data[i * 4 + 1] = td.data[i * 4 + 2] = g; td.data[i * 4 + 3] = 255; }
  tx.putImageData(td, 0, 0);
  const mx = MASK.getContext('2d'); mx.fillStyle = '#000'; mx.beginPath(); const pg = rough([[40, 40], [1040, 40], [1040, 1580], [40, 1580]], 16, 4, 12, .006); pg.forEach(([x, y], i) => i ? mx.lineTo(x, y) : mx.moveTo(x, y)); mx.closePath(); mx.fill();
  mx.globalCompositeOperation = 'destination-out'; const rr = rng(9);
  for (let i = 0; i < 360; i++) { const side = i % 4, u = rr(); const x = side < 2 ? u * W : (side === 2 ? 40 + rr() * 50 : 1040 - rr() * 50), y = side >= 2 ? u * H : (side === 0 ? 40 + rr() * 50 : 1580 - rr() * 60); mx.beginPath(); mx.ellipse(x, y, 4 + rr() * 14, 3 + rr() * 9, rr() * 3, 0, TAU); mx.fill(); }
}

// ---------------------------------------------------------------- figures
function person(c, look, pose, x, y, Sz, yaw, o = {}) {
  const prims = figure(look, pose, { x, y, S: Sz, yaw }, { seed: o.seed ?? (x | 0), boil: b12() });
  drawPrims(c, prims, { color: o.color ?? 1, ink: o.ink ?? 1 });
  const h = prims.head, lw = Math.max(1.2, Sz * .005);
  if (o.rebozo) sketchShape(c, [[h.c[0] - h.r * 1.2, h.c[1] - h.r * .9], [h.c[0] + h.r * 1.2, h.c[1] - h.r * .9], [h.c[0] + h.r * 1.9, h.c[1] + h.r * 4.5], [h.c[0] - h.r * 1.9, h.c[1] + h.r * 4.5]], RED, { ink: lw, wash: .8 * (o.color ?? 1), seed: 908 + b12() });
  if (o.cap) { const hx = h.c[0], hy = h.c[1] - h.r * .9; sketchShape(c, [[hx - h.r * 1.1, hy], [hx + h.r * 1.1, hy], [hx + h.r * .9, hy - h.r * .9], [hx - h.r * .9, hy - h.r * .9]], C.slate, { ink: lw, wash: .6, seed: 909 }); }
  if (o.torch) { const [hx, hy] = prims.hand.R; drawPen(c, penStroke([[hx, hy + Sz * .04], [hx + Sz * .02, hy - Sz * .2]], { w: lw * 2.2, wob: .5, seed: 910, over: 1 }), 1); const fx = hx + Sz * .02, fy = hy - Sz * .24, fl = 1 + .15 * Math.sin(T * 17 + x); reserve(c, ellipse(fx, fy, Sz * .09, Sz * .11, 14), .35, 6, 3); wash(c, ellipse(fx, fy, Sz * .05 * fl, Sz * .08 * fl, 12), C.ochre, { a: .8, j: 3, layers: 2, seed: 911 + b12() }); }
  return prims;
}
function carrot(c, x, y, h, col, seed, o = {}) {
  wash(c, ellipse(x, y - h * .62, h * .17, h * .3, 10), col, { a: .6, j: 1.5, layers: 2, edge: .3, seed: seed + b12() });
  const ph = o.walk ?? 0;
  drawPen(c, penStroke([[x - h * .06, y - h * .34], [x - h * .08 + Math.sin(ph) * h * .07, y]], { w: Math.max(1, h * .035), wob: .3, seed: seed + 1 + b12(), over: 1 }), 1);
  drawPen(c, penStroke([[x + h * .06, y - h * .34], [x + h * .08 - Math.sin(ph) * h * .07, y]], { w: Math.max(1, h * .035), wob: .3, seed: seed + 2 + b12(), over: 1 }), 1);
  c.fillStyle = rgba(INK, .9); c.beginPath(); c.arc(x, y - h * .98, h * .085, 0, TAU); c.fill();
}
function shipInk(c, x, y, s, p, col = INK, seed = 7) {   // a three-masted ship as a line drawing; p = how far it is drawn
  const pts = [[x - 220 * s, y], [x - 170 * s, y + 60 * s], [x + 200 * s, y + 60 * s], [x + 250 * s, y]];
  drawPen(c, penStroke([...pts, pts[0]], { w: 3, wob: 1, seed, over: 3 }), p, col);
  for (const mx of [-120, 0, 120]) drawPen(c, penStroke([[x + mx * s, y], [x + mx * s, y - 260 * s]], { w: 2, wob: .6, seed: seed + 1 + mx, over: 2 }), clamp(p * 1.2 - .1), col);
  for (const mx of [-120, 0, 120]) drawPen(c, penStroke([[x + (mx - 90) * s, y - 240 * s], [x + (mx + 90) * s, y - 240 * s]], { w: 1.6, wob: .4, seed: seed + 4 + mx, over: 1 }), clamp(p * 1.4 - .3), col);
  drawPen(c, penStroke([[x - 120 * s, y - 260 * s], [x - 120 * s + 110 * s, y - 200 * s]], { w: 1.2, seed: seed + 9, over: 1 }), clamp(p - .2), col, .5);
}

// ---------------------------------------------------------------- the pages
const PG = {
  mar: () => { const P = new Page(1, 'Veracruz · San Juan de Ulúa · de noche');
    P.rwash(40, 40, 1000, 1540, C.night, { a: .5, src: [540, 200] }); P.circle(820, 220, 60, { w: 1.8 }); P.reserve(ellipse(820, 220, 56, 56, 20));
    P.line(40, 1180, 1040, 1180, { w: 2 }); P.rwash(40, 1180, 1000, 400, C.sea, { a: .4 });
    P.shape([[160, 1180], [160, 920], [420, 900], [420, 1180]], { w: 2 }); P.shape([[420, 1180], [420, 860], [700, 840], [700, 1180]], { w: 2 }); P.wash([[160, 1180], [160, 920], [420, 900], [420, 1180]], C.stone, { a: .4 }); P.wash([[420, 1180], [420, 860], [700, 840], [700, 1180]], C.stone, { a: .35 });
    for (let i = 0; i < 6; i++) P.line(200 + i * 40, 950, 200 + i * 40, 1180, { w: 1.2 }); P.line(60, 1260, 1020, 1260, { w: 1.2, a: .6 });
    P.text('Veracruz', 120, 1520, 58); return P; },
  calle: () => { const P = new Page(2, 'Córdoba · la calle');
    P.rwash(40, 40, 1000, 900, C.dusk, { a: .25 }); P.line(40, 1000, 1040, 1000, { w: 2 }); P.rwash(40, 1000, 1000, 600, C.slate, { a: .28 });
    for (let i = 0; i < 4; i++) { const x = 60 + i * 260, h = 420 + (i % 2) * 60; P.rect(x, 1000 - h, 220, h, { w: 1.8 }); P.rwash(x, 1000 - h, 220, h, C.adobe, { a: .35 }); for (let k = 0; k < 3; k++) P.rect(x + 40 + k * 60, 1000 - h + 60, 40, 70, { w: 1.2 }); }
    P.text('sin envejecer', 120, 1520, 58); return P; },
  inquisicion: () => { const P = new Page(3, 'la Santa Inquisición');
    P.rwash(40, 40, 1000, 1540, C.stone, { a: .25 }); P.rect(120, 220, 840, 520, { w: 2.2 }); P.rwash(120, 220, 840, 520, C.wall, { a: .3 });
    P.line(160, 720, 920, 720, { w: 3 }); P.line(200, 720, 200, 1120, { w: 2 }); P.line(880, 720, 880, 1120, { w: 2 });
    P.line(540, 260, 540, 420, { w: 2 }); P.line(480, 320, 600, 320, { w: 2 });
    P.line(40, 1180, 1040, 1180, { w: 2 }); P.rwash(40, 1180, 1000, 400, C.sand, { a: .25 });
    P.text('condenada a la hoguera', 110, 1540, 52); return P; },
  celda: () => { const P = new Page(4, 'la celda · la noche antes');
    P.rwash(40, 40, 1000, 1540, C.night, { a: .55, src: [540, 260] }); P.rect(120, 140, 180, 220, { w: 2.2 }); P.rwash(120, 140, 180, 220, C.lamp, { a: .25 });
    for (let i = 0; i < 6; i++) P.line(120 + i * 30, 140, 120 + i * 30, 360, { w: 1.2, a: .6 });
    P.line(40, 1180, 1040, 1180, { w: 3 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .3 });
    P.reserve([[300, 360], [900, 360], [900, 1180], [300, 1180]], { a: .5, late: .1 });
    P.text('un pedazo de carbón', 110, 1540, 52); return P; },
  dibujo: () => { const P = new Page(5, 'el barco en la pared');
    P.rwash(40, 40, 1000, 1540, C.stone, { a: .22 }); P.rwash(40, 40, 1000, 1540, C.wall, { a: .18 });
    P.rect(90, 240, 900, 700, { w: 1.8, a: .8 }); P.rwash(90, 240, 900, 700, C.sea, { a: .18 });
    P.line(40, 1180, 1040, 1180, { w: 3 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .25 });
    P.text('¿Qué crees que le falta?', 110, 1540, 52); return P; },
  barco: () => { const P = new Page(6, 'y saltó dentro del dibujo');
    P.rwash(40, 40, 1000, 1540, C.night, { a: .4 }); P.rect(90, 240, 900, 700, { w: 1.8 }); P.rwash(90, 240, 900, 700, C.sea, { a: .22 });
    P.line(40, 1180, 1040, 1180, { w: 3 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .25 });
    return P; },
  manana: () => { const P = new Page(7, 'la mañana siguiente');
    P.rwash(40, 40, 1000, 1540, C.sand, { a: .3 }); P.rect(120, 160, 840, 760, { w: 2.2 }); P.rwash(120, 160, 840, 760, C.wall, { a: .25 });
    P.line(40, 1180, 1040, 1180, { w: 3 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .25 });
    P.text('la celda vacía', 110, 1540, 52); return P; },
  hoy: () => { const P = new Page(8, 'hoy · un escaparate en Córdoba');
    P.rwash(40, 40, 1000, 1540, C.dusk, { a: .3 }); P.rect(160, 360, 760, 760, { w: 2.6 }); P.rwash(160, 360, 760, 760, C.sky, { a: .3 });
    P.line(40, 1180, 1040, 1180, { w: 2.4 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .25 });
    P.text('¿y si todavía estuviera entre nosotros?', 110, 1540, 46); return P; },
  final: () => { const P = new Page(9, 'Plot Twist with A&R');
    P.text('LA MULATA', 540, 380, 120, { weight: 700, align: 'center' }); P.text('DE CÓRDOBA', 540, 500, 96, { weight: 700, align: 'center' });
    P.text('Ni la muerte pudo detenerla.', 540, 1180, 60, { align: 'center' });
    P.text('PLOT TWIST WITH A&R', 540, 1400, 54, { weight: 700, align: 'center' });
    P.text('La leyenda forma parte del folclore de Veracruz; los hechos sobrenaturales no están', 540, 1490, 30, { align: 'center' }); P.text('comprobados. La amenaza final es una dramatización original.', 540, 1530, 30, { align: 'center' });
    return P; },
};

// ---------------------------------------------------------------- what moves on each page
const DY = {
  mar: (c, t, u) => { const k = ss(seg(u, .2, .5)); person(c, LK.soledad, stand({ handR: V(.06, .86, .14), elbR: V(1, -.4, 0) }), 540, 1180, 520 * (.9 + .1 * k), Math.PI * .5, { rebozo: true, seed: 10 });
    for (let i = 0; i < 4; i++) { const r = (1 - ((t * .3 + i * .25) % 1)) * 90 + 10; drawPen(c, penStroke([...Array(10)].map((_, q) => { const a = -.9 + q * .2; return [700 + Math.cos(a) * r, 560 + Math.sin(a) * r * .6]; }), { w: 1.6, wob: .4, seed: 20 + i, over: 1 }), 1, mix3(RED, INK, .3), clamp(1 - r / 110)); }
    if (u > .3) handwrite(c, 'una mujer misteriosa', 120, 1440, 56, seg(u, .3, .25)); },
  calle: (c, t, u) => { const x = lerp(-120, 540, ss(seg(u, 0, .6))); person(c, LK.woman, walk(t * 4), x, 1200, 500, Math.PI * .5, { rebozo: true, seed: 30 });
    person(c, LK.old, walk(t * 3.5 + 2), lerp(980, 720, ss(seg(u, 0, .8))), 1200, 500, -Math.PI * .5, { seed: 31 });
    if (u > .4) handwrite(c, 'siglos', 620, 760, 54, seg(u, .4, .25)); },
  inquisicion: (c, t, u) => { person(c, LK.judge, stand({ handR: V(.1, .9, .3), elbR: V(1, -.3, 0) }), 540, 1140, 560, -Math.PI * .5, { seed: 40 });
    const k = ss(seg(u, .3, .4)); for (let i = 0; i < 4; i++) { const x = 830 + i * 20, h = 60 + k * 240 * (1 - i * .15); drawPen(c, penStroke([[x, 1120], [x - 8 + Math.sin(t * 3 + i) * 8, 1120 - h]], { w: 4, wob: 1.2, seed: 50 + i + b12(), over: 2 }), 1, INK, .6); }
    if (u > .3) handwrite(c, 'bruja', 180, 500, 80, seg(u, .3, .2), { weight: 700 }); },
  celda: (c, t, u) => { person(c, LK.soledad, stand({ handR: V(.05, .6, .18), elbR: V(1, -.4, 0) }), 540, 1180, 460, Math.PI * .5, { rebozo: true, seed: 60 });
    const k = ss(seg(u, .4, .5)); drawPen(c, penStroke([[560, 960], [640, 760 + (1 - k) * 60], [700, 620 + (1 - k) * 80]], { w: 3, wob: .8, seed: 61, over: 2 }), 1, INK, .4); if (u > .7) handwrite(c, 'carbón', 740, 980, 46, seg(u, .7, .2)); },
  dibujo: (c, t, u) => { person(c, LK.soledad, stand({ handR: V(.1, .68, .42), elbR: V(1, -.3, 0) }), 260, 1180, 440, Math.PI * .5, { rebozo: true, seed: 70 });
    shipInk(c, 540, 600, 1.55, ss(seg(u, 0, .5)), INK, 71);
    person(c, LK.guard, stand({ handR: V(.1, .7, .2) }), 860, 1180, 460, -Math.PI * .5, { torch: true, seed: 72 });
    if (u > .58) handwrite(c, 'Navegar —respondió él.', 260, 300, 46, seg(u, .58, .3)); },
  barco: (c, t, u) => { const mv = ss(seg(u, .1, .6)), ink = 1 - mv * .25; shipInk(c, 520 + mv * 220, 600, 1.55, 1, INK, 80);
    person(c, LK.soledad, stand({ handR: V(.1, .8, .3), elbR: V(1, -.3, 0) }), lerp(260, 520 + mv * 260, mv), lerp(1180, 620, mv), lerp(440, 220, mv), Math.PI * .5, { rebozo: true, seed: 81, color: 1 - mv * .4, ink: 1 - mv * .6 });
    if (mv > .2) for (let i = 0; i < 6; i++) { drawPen(c, penStroke([[260 + i * 40, 1060], [260 + i * 40 + 30, 1100 - mv * 200 * (i % 2)]], { w: 1.4, wob: .6, seed: 82 + i, over: 1 }), mv, mix3(RED, INK, .3)); }
    if (u > .55) handwrite(c, 'la mujer sonrió', 120, 300, 50, seg(u, .55, .25)); },
  manana: (c, t, u) => { shipInk(c, 540, 560, 1.1, 1, INK, 90); const d = ss(seg(u, .3, .4)); person(c, LK.guard, stand({ armL: -1.1, armR: -1.1, bendL: .3, bendR: .3 }), 280, 1180, 420 * (1 - d * .2), Math.PI * .5, { seed: 91, color: 1 - d * .3, ink: 1 - d * .4 });
    if (u > .5) handwrite(c, 'Soledad había desaparecido', 120, 1000, 50, seg(u, .5, .3)); },
  hoy: (c, t, u) => { const x = lerp(-60, 460, ss(seg(u, 0, .7))); person(c, LK.soledad, walk(t * 4.5), x, 1240, 560, 0, { rebozo: true, seed: 100 });
    drawPen(c, penStroke([[600, 420], [600, 980]], { w: 1, wob: .5, seed: 101, over: 2 }), 1, INK, .4);
    if (u > .4) handwrite(c, 'sin envejecer', 230, 320, 56, seg(u, .4, .25)); },
  final: (c, t, u) => { carrot(c, 300, 1300, 110, C.slate, 110, { walk: t * 3 }); carrot(c, 760, 1300, 110, C.adobe, 111, { walk: -t * 3 }); },
};

// ---------------------------------------------------------------- subtitles: handwritten in the lower margin
function subtitle(t) {
  const cue = CUES.find(q => t >= q.t0 && t < q.t1); if (!cue) return;
  const rows = wrap(cue.text, 36), p = clamp((t - cue.t0) / Math.min(1.1, (cue.t1 - cue.t0) * .45));
  rows.forEach((r, i) => handwrite(ctx, r, 70, 1680 + i * 64 - (rows.length - 1) * 20, 56, clamp(p * rows.length - i), { weight: 500, alpha: .92 }));
}
let built = -1, page = null, statDone = false, snapIdx = -1;
function renderStatic(lt) {
  IC.clearRect(0, 0, W, H); CC.clearRect(0, 0, W, H);
  for (const it of page.items) {
    const p = (lt - it.t0) / it.d; if (p <= 0) continue;
    if (it.ty === 'ink') drawPen(IC, it.st, Math.min(1, p), it.col ?? INK, it.a);
    else if (it.ty === 'text') handwrite(IC, it.s, it.x, it.y, it.size, Math.min(1, p), { font: it.font, weight: it.weight, col: it.col, align: it.align });
    else if (it.ty === 'wash') { const k = ss(p); CC.save(); if (k < 1) { CC.beginPath(); rough(ellipse(it.src[0], it.src[1], it.R * k + 2, it.R * k + 2, 24), it.R * .05 * k + 1, it.seed, 10, .01).forEach(([x, y], i) => i ? CC.lineTo(x, y) : CC.moveTo(x, y)); CC.closePath(); CC.clip(); } wash(CC, it.poly, it.col, { a: it.a, j: it.j, layers: it.layers, seed: it.seed, dx: it.dx, dy: it.dy, edge: it.edge }); CC.restore(); }
    else if (it.ty === 'reserve') { CC.save(); CC.globalAlpha = ss(p); CC.globalCompositeOperation = 'destination-out'; CC.fillStyle = '#000'; CC.beginPath(); rough(it.poly, 4, 3).forEach(([x, y], i) => i ? CC.lineTo(x, y) : CC.moveTo(x, y)); CC.closePath(); CC.fill(); CC.restore(); }
  }
  CC.save(); CC.globalCompositeOperation = 'destination-in'; CC.drawImage(MASK, 0, 0); CC.restore();
  SX.globalCompositeOperation = 'source-over'; SX.fillStyle = '#fff'; SX.fillRect(0, 0, W, H);
  SX.globalCompositeOperation = 'multiply'; SX.drawImage(CC.canvas, 0, 0); SX.globalCompositeOperation = 'source-over'; SX.drawImage(IC.canvas, 0, 0);
}
function frame(t) {
  T = t;
  let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].t0) i++;
  const sh = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t0 : window.DUR, lt = t - sh.t0, u = clamp(lt / (t1 - sh.t0));
  if (built !== i) { page = PG[sh.key]().schedule(Math.min(2.2, (t1 - sh.t0) * .4)); built = i; statDone = false; }
  if (!statDone) { renderStatic(lt); if (lt > page.end) statDone = true; }
  const cm = sh.cam || {}, e = ss(u), z = lerp(cm.z0 ?? 1, cm.z1 ?? 1.04, e), cx = cm.cx ?? 540, cy = cm.cy ?? 800;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(PAPERCV, 0, 0);
  ctx.setTransform(z, 0, 0, z, (1 - z) * cx, (1 - z) * cy);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(STAT, 0, 0); ctx.globalCompositeOperation = 'source-over';
  DY[sh.key](ctx, lt, u);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
  if (i > 0 && snapIdx === i - 1 && lt < .45) { const k = ss(lt / .45), x = W * (1 - k); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); ctx.drawImage(SNAP, -W * k * .2, 0); ctx.restore(); const g = ctx.createLinearGradient(x - 30, 0, x + 40, 0); g.addColorStop(0, 'rgba(60,45,35,0)'); g.addColorStop(.5, 'rgba(60,45,35,.25)'); g.addColorStop(1, 'rgba(60,45,35,0)'); ctx.fillStyle = g; ctx.fillRect(x - 30, 0, 70, H); }
  else { SNX.drawImage(out, 0, 0); snapIdx = i; }
  if (sh.key !== 'final') subtitle(t);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .35; ctx.fillStyle = ctx.createPattern(TOOTH, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

window.DUR = 0; window.READY = false;
(async () => {
  await Promise.all(['500 40px Caveat', '700 40px Caveat', '40px "Reenie Beanie"'].map(f => document.fonts.load(f)));
  LINES = await (await fetch('lines.json')).json();
  const dur = await (await fetch('voices/dur.json')).json();
  let t = 0.3; for (const l of LINES) { S.push(t); D.push(dur[l.id]); t += dur[l.id] + GAP; }
  window.DUR = LEND(10) + 3.4;
  CUES = cues(LINES, S, D, 70); window.SUBS = CUES;
  makePaper();
  SHOTS = [
    { t0: 0, key: 'mar', cam: { z0: 1, z1: 1.05, cy: 1000 } },
    { t0: Lt(2, 0), key: 'calle', cam: { z0: 1, z1: 1.05, cy: 1000 } },
    { t0: Lt(3, 0), key: 'inquisicion', cam: { z0: 1.04, z1: 1, cy: 900 } },
    { t0: Lt(4, 0), key: 'celda', cam: { z0: 1, z1: 1.05, cy: 1000 } },
    { t0: Lt(5, 0), key: 'dibujo', cam: { z0: 1, z1: 1.04, cy: 900 } },
    { t0: Lt(8, 0), key: 'barco', cam: { z0: 1, z1: 1.05, cy: 900 } },
    { t0: Lt(9, 0), key: 'manana', cam: { z0: 1, z1: 1.04, cy: 900 } },
    { t0: Lt(10, 0), key: 'hoy', cam: { z0: 1, z1: 1.04, cy: 1000 } },
    { t0: LEND(10) + .1, key: 'final', cam: { z0: 1.03, z1: 1 } },
  ];
  window.SHOTS = SHOTS.map(s => s.t0);
  window.render = t => frame(t);
  window.READY = true;
})();
