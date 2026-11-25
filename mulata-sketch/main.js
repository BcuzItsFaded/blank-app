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

const C = { ink: hex('#2b2a2a'), steel: hex('#9aa3ad'), sea: hex('#7c9aa6'), night: hex('#56627d'), stone: hex('#cdbd9c'), slate: hex('#8d96a3'), wall: hex('#d9c9a8'), dusk: hex('#c9a183'), lamp: hex('#e6d39a'), adobe: hex('#c9a27e'), sky: hex('#a9c0d6'), leaf: hex('#7fa04a'), sand: hex('#d7bf94'), wood: hex('#a57c55'), ochre: hex('#d8ad74') };
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

// ---------------------------------------------------------------- figures: a clear silhouette per person
// Accessories are drawn over the engine's figure at the head and torso anchors, so each character reads at a glance.
function person(c, look, pose, x, y, Sz, yaw, o = {}) {
  const prims = figure(look, pose, { x, y, S: Sz, yaw }, { seed: o.seed ?? (x | 0), boil: b12() });
  drawPrims(c, prims, { color: o.color ?? 1, ink: o.ink ?? 1 });
  const h = prims.head, lw = Math.max(1.2, Sz * .0045), col = o.color ?? 1, hx = h.c[0], hy = h.c[1], r = h.r;
  const sk = (name, poly, fillCol, wa = .8, seed = 0) => sketchShape(c, poly, fillCol, { ink: lw, wash: wa * col, seed: seed + b12() });
  // hair and head coverings
  if (o.bun) sketchShape(c, ellipse(hx - r * 1.1, hy - r * .9, r * .55, r * .5, 12), look.hair ?? C.ink, { ink: lw, wash: .85 * col, seed: 300 + b12() });
  if (o.mantilla) { const m = [[hx - r * 1.5, hy - r * .3], [hx - r * 1.2, hy - r * 1.9], [hx, hy - r * 2.2], [hx + r * 1.2, hy - r * 1.9], [hx + r * 1.5, hy - r * .3], [hx + r * 1.9, hy + r * 3.2], [hx - r * 1.9, hy + r * 3.2]]; sk('mantilla', m, hex('#f2ede3'), .5, 310); for (let i = 0; i < 7; i++) drawPen(c, penStroke([[hx - r * 1.6 + i * r * .45, hy - r * 1.6], [hx - r * 1.5 + i * r * .45, hy + r * 2.6]], { w: .7, wob: .3, seed: 320 + i, over: 0, gap: 0 }), .55 * col, INK, .5); }
  if (o.hat === 'tricorn') { sk('hat', [[hx - r * 2.1, hy - r * .8], [hx + r * 2.1, hy - r * .8], [hx + r * .4, hy - r * 2.6], [hx - r * .4, hy - r * 2.6]], C.ink, .9, 330); sk('brim', [[hx - r * 2.6, hy - r * .9], [hx + r * 2.6, hy - r * .9], [hx + r * 1.4, hy - r * .5], [hx - r * 1.4, hy - r * .5]], C.ink, .9, 331); }
  if (o.hat === 'wide') { sk('brim', ellipse(hx, hy - r * .85, r * 2.6, r * .5, 20), hex('#c9b48a'), .6, 340); sk('crown', [[hx - r * .9, hy - r * .9], [hx + r * .9, hy - r * .9], [hx + r * .75, hy - r * 2.3], [hx - r * .75, hy - r * 2.3]], hex('#c9b48a'), .6, 341); }
  if (o.hat === 'top') { sk('brim', ellipse(hx, hy - r * .9, r * 1.6, r * .28, 18), C.ink, .9, 350); sk('crown', [[hx - r * .9, hy - r * .9], [hx + r * .9, hy - r * .9], [hx + r * .78, hy - r * 2.7], [hx - r * .78, hy - r * 2.7]], C.ink, .9, 351); wash(c, [[hx - r * .8, hy - r * 1.7], [hx + r * .8, hy - r * 1.7], [hx + r * .8, hy - r * 1.5], [hx - r * .8, hy - r * 1.5]], RED, { a: .6 * col, j: 1, layers: 1, seed: 352 }); }
  if (o.helmet) sk('helmet', ellipse(hx, hy - r * .4, r * 1.25, r * 1.05, 16), C.slate, .6, 360);
  // neck and collar: ruff for the judge, lace for her
  if (o.ruff) { for (let i = 0; i < 8; i++) { const a = Math.PI * (i / 7 + .08); drawPen(c, penStroke([[hx + Math.cos(a) * r * 1.2, hy + r * 1.8 + Math.sin(a) * r * .5], [hx + Math.cos(a) * r * 1.85, hy + r * 1.8 + Math.sin(a) * r * .7]], { w: lw * .9, wob: .3, seed: 370 + i, over: 0, gap: 0 }), col); } sk('ruff', ellipse(hx, hy + r * 2.1, r * 1.5, r * .35, 16), hex('#f2ede3'), .3, 372); }
  if (o.lace) for (let i = 0; i < 6; i++) drawPen(c, penStroke([[hx - r * 1.1 + i * r * .44, hy + r * 1.85], [hx - r * .9 + i * r * .44, hy + r * 2.25]], { w: .8, wob: .2, seed: 380 + i, over: 0, gap: 0 }), .7 * col);
  // a cross on the chest (inquisition) and a rosary on her hand
  if (o.cross) { const cx2 = hx, cy2 = hy + r * 3.4; drawPen(c, penStroke([[cx2, cy2 - r * .9], [cx2, cy2 + r * .9]], { w: lw, wob: .2, seed: 390, over: 0 }), col); drawPen(c, penStroke([[cx2 - r * .5, cy2 - r * .2], [cx2 + r * .5, cy2 - r * .2]], { w: lw, wob: .2, seed: 391, over: 0 }), col); }
  if (o.cape) { const s0 = Sz * .14; sk('cape', [[hx - r * 1.2, hy + r * 1.2], [hx + r * 1.2, hy + r * 1.2], [hx + r * 1.7, hy + r * 4.5], [hx + r * 2.4, hy + r * 10], [hx - r * 2.4, hy + r * 10], [hx - r * 1.7, hy + r * 4.5]], C.ink, .85, 400); }
  if (o.belt) { const bx = prims.hand?.R ? 0 : 0; const by = hy + r * 8.5; drawPen(c, penStroke([[hx - r * 1.5, by], [hx + r * 1.5, by]], { w: lw * 1.2, wob: .2, seed: 410, over: 1 }), col); drawPen(c, penStroke([...ellipse(hx + r * 1.7, by + r * .3, r * .35, r * .35, 10)], { w: lw * .8, wob: .2, seed: 411, over: 0 }), col); }
  if (o.rebozo) sk('rebozo', [[hx - r * 1.3, hy + r * .7], [hx + r * 1.3, hy + r * .7], [hx + r * 2.1, hy + r * 5.5], [hx - r * 2.1, hy + r * 5.5]], RED, .85, 420);
  if (o.earrings) { c.fillStyle = rgba(INK, .9); c.beginPath(); c.arc(hx - r * 1.05, hy + r * .3, Math.max(.8, r * .14), 0, TAU); c.fill(); c.beginPath(); c.arc(hx + r * 1.05, hy + r * .3, Math.max(.8, r * .14), 0, TAU); c.fill(); }
  if (o.torch) { const [tx, ty] = prims.hand.R; drawPen(c, penStroke([[tx, ty + Sz * .04], [tx + Sz * .02, ty - Sz * .2]], { w: lw * 2.2, wob: .5, seed: 430, over: 1 }), 1); const fx = tx + Sz * .02, fy = ty - Sz * .24, fl = 1 + .15 * Math.sin(T * 17 + x); reserve(c, ellipse(fx, fy, Sz * .09, Sz * .11, 14), .35, 6, 3); wash(c, ellipse(fx, fy, Sz * .05 * fl, Sz * .08 * fl, 12), C.ochre, { a: .8, j: 3, layers: 2, seed: 431 + b12() }); }
  if (o.halberd) { const [gx, gy] = prims.hand.R; drawPen(c, penStroke([[gx, gy + Sz * .1], [gx + Sz * .06, gy - Sz * .95]], { w: lw * 1.6, wob: .4, seed: 440, over: 2 }), 1); sk('blade', [[gx + Sz * .06, gy - Sz * .95], [gx + Sz * .14, gy - Sz * .86], [gx + Sz * .1, gy - Sz * .72], [gx + Sz * .06, gy - Sz * .78]], C.steel, .7, 441); }
  if (o.candle) { const [gx, gy] = prims.hand.L; sk('candle', [[gx - 3, gy - 26], [gx + 3, gy - 26], [gx + 3, gy], [gx - 3, gy]], hex('#f2ede3'), .5, 450); wash(c, ellipse(gx, gy - 32, 6, 8, 10), C.ochre, { a: .9 * col, j: 1, layers: 1, seed: 451 + b12() }); }
  return prims;
}
function carrot(c, x, y, h, col, seed, o = {}) {
  wash(c, ellipse(x, y - h * .62, h * .17, h * .3, 10), col, { a: .6, j: 1.5, layers: 2, edge: .3, seed: seed + b12() });
  const ph = o.walk ?? 0;
  drawPen(c, penStroke([[x - h * .06, y - h * .34], [x - h * .08 + Math.sin(ph) * h * .07, y]], { w: Math.max(1, h * .035), wob: .3, seed: seed + 1 + b12(), over: 1 }), 1);
  drawPen(c, penStroke([[x + h * .06, y - h * .34], [x + h * .08 - Math.sin(ph) * h * .07, y]], { w: Math.max(1, h * .035), wob: .3, seed: seed + 2 + b12(), over: 1 }), 1);
  c.fillStyle = rgba(INK, .9); c.beginPath(); c.arc(x, y - h * .98, h * .085, 0, TAU); c.fill();
}
function shipInk(c, x, y, s, p, col = INK, seed = 7, sails = 0) {   // a three-masted ship: hull, masts, yards, and sails that fill as sails > 0
  const hull = [[x - 220 * s, y], [x - 170 * s, y + 60 * s], [x + 200 * s, y + 60 * s], [x + 250 * s, y]];
  drawPen(c, penStroke([...hull, hull[0]], { w: 3, wob: 1, seed, over: 3 }), p, col);
  for (const mx of [-120, 0, 120]) drawPen(c, penStroke([[x + mx * s, y], [x + mx * s, y - 260 * s]], { w: 2.2, wob: .6, seed: seed + 1 + mx, over: 2 }), clamp(p * 1.2 - .1), col);
  for (const mx of [-120, 0, 120]) drawPen(c, penStroke([[x + (mx - 90) * s, y - 240 * s], [x + (mx + 90) * s, y - 240 * s]], { w: 1.8, wob: .4, seed: seed + 4 + mx, over: 1 }), clamp(p * 1.4 - .3), col);
  if (sails > 0) for (const mx of [-120, 0, 120]) { const bulge = 30 * s * sails; drawPen(c, penStroke([[x + (mx - 84) * s, y - 236 * s], [x + (mx - 84 + bulge / s * .4) * s, y - 120 * s], [x + (mx - 84) * s, y - 20 * s]], { w: 1.2, wob: .6, seed: seed + 10 + mx, over: 1 }), sails, col); drawPen(c, penStroke([[x + (mx + 84) * s, y - 236 * s], [x + (mx + 84 - bulge / s * .4) * s, y - 120 * s], [x + (mx + 84) * s, y - 20 * s]], { w: 1.2, wob: .6, seed: seed + 13 + mx, over: 1 }), sails, col); }
  for (let k = 0; k < 4; k++) drawPen(c, penStroke([[x - 230 * s + k * 110 * s, y + 90 * s], [x - 180 * s + k * 110 * s, y + 96 * s]], { w: 1, wob: .5, seed: seed + 30 + k, over: 0, gap: 0 }), clamp(p - .2) * .6, col, .6);
}

// ---------------------------------------------------------------- the pages
const PG = {
  mar: () => { const P = new Page(1, 'Veracruz · San Juan de Ulúa · de noche');
    P.rwash(40, 40, 1000, 1540, C.night, { a: .5, src: [540, 200] }); P.circle(820, 220, 60, { w: 1.8 }); P.reserve(ellipse(820, 220, 56, 56, 20));
    for (let i = 0; i < 40; i++) { const x = 60 + (i * 97) % 960, y = 60 + (i * 53) % 500; P.line(x, y, x + 3, y, { w: 1.4, a: .7 }); }
    // the fortress: walls with crenellations, a tower and a flag
    P.rwash(40, 880, 1000, 320, C.slate, { a: .25 });
    P.shape([[120, 1180], [120, 860], [200, 860], [200, 830], [260, 830], [260, 860], [300, 860], [300, 800], [360, 800], [360, 860], [720, 860], [720, 800], [780, 800], [780, 860], [820, 860], [820, 1180]], { w: 2.2 });
    P.wash([[120, 1180], [120, 860], [820, 860], [820, 1180]], C.stone, { a: .45 });
    P.line(300, 800, 300, 730, { w: 2 }); P.shape([[300, 730], [340, 742], [300, 754]], { w: 1.6 }); P.wash([[300, 730], [340, 742], [300, 754]], RED, { a: .6 });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) P.rect(170 + i * 150, 930 + j * 110, 60, 70, { w: 1.4 });
    P.rwash(40, 1180, 1000, 400, C.sea, { a: .4 });
    for (let k = 0; k < 9; k++) P.line(80 + (k * 110) % 800, 1240 + k * 26, 150 + (k * 110) % 800, 1240 + k * 26, { w: 1.2, a: .55 });
    P.line(40, 1180, 1040, 1180, { w: 2 });
    P.text('Veracruz', 120, 1520, 58); return P; },
  calle: () => { const P = new Page(2, 'Córdoba · la calle');
    P.rwash(40, 40, 1000, 900, C.dusk, { a: .25 });
    for (let i = 0; i < 4; i++) { const x = 60 + i * 260, h = 460 + (i % 2) * 80; P.rect(x, 1000 - h, 220, h, { w: 1.8 }); P.rwash(x, 1000 - h, 220, h, C.adobe, { a: .32 });
      for (let k = 0; k < 2; k++) { const bx = x + 20, by = 1000 - h + 100 + k * 180; P.rect(bx, by, 180, 22, { w: 1.4 }); for (let r = 0; r < 6; r++) P.line(bx + 6 + r * 30, by - 22, bx + 6 + r * 30, by, { w: .9, a: .7 }); P.rect(bx + 80, by + 22, 18, 60, { w: 1.1 }); }
      P.rect(x + 60, 1000 - 170, 100, 170, { w: 1.6 }); P.shape([[x + 60, 1000 - 170], [x + 110, 1000 - 200], [x + 160, 1000 - 170]], { w: 1.4 }); }
    P.line(40, 1000, 1040, 1000, { w: 2 }); P.rwash(40, 1000, 1000, 600, C.slate, { a: .28 });
    for (let i = 0; i < 14; i++) P.line(60 + i * 70, 1080, 80 + i * 70 + (i % 3) * 8, 1140, { w: 1, a: .5 });
    P.text('sin envejecer', 120, 1520, 58); return P; },
  inquisicion: () => { const P = new Page(3, 'la Santa Inquisición');
    P.rwash(40, 40, 1000, 1540, C.stone, { a: .25 }); P.rect(120, 200, 840, 540, { w: 2.2 }); P.rwash(120, 200, 840, 540, C.wall, { a: .3 });
    P.rect(480, 220, 120, 60, { w: 1.4 }); for (let i = 0; i < 4; i++) P.line(500 + i * 26, 220, 500 + i * 26, 280, { w: 1, a: .6 });   // a barred window
    P.line(540, 290, 540, 420, { w: 2 }); P.line(480, 330, 600, 330, { w: 2 }); P.rwash(470, 260, 140, 110, C.lamp, { a: .25 });  // the cross on the wall
    P.line(160, 760, 920, 760, { w: 3 }); P.rwash(160, 760, 760, 26, C.wood, { a: .5 });   // the long table
    for (let i = 0; i < 3; i++) P.rect(230 + i * 260, 790, 60, 60, { w: 1.4 });   // scrolls and papers
    P.line(40, 1180, 1040, 1180, { w: 2 }); P.rwash(40, 1180, 1000, 400, C.sand, { a: .25 });
    for (let i = 0; i < 12; i++) P.line(60 + i * 84, 1190, 80 + i * 84, 1300, { w: .9, a: .5 });
    P.text('condenada a la hoguera', 110, 1540, 52); return P; },
  celda: () => { const P = new Page(4, 'la celda · la noche antes');
    P.rwash(40, 40, 1000, 1540, C.night, { a: .55, src: [540, 260] });
    for (let r = 0; r < 8; r++) for (let k = 0; k < 6; k++) P.rect(40 + k * 170 + (r % 2) * 85, 60 + r * 110, 170, 110, { w: .7, a: .35 });   // stone walls
    P.rect(120, 140, 180, 220, { w: 2.2 }); P.rwash(120, 140, 180, 220, C.lamp, { a: .22 });
    for (let i = 0; i < 6; i++) P.line(120 + i * 30, 140, 120 + i * 30, 360, { w: 1.6 }); P.line(120, 250, 300, 250, { w: 1.6 });   // bars
    P.line(40, 1180, 1040, 1180, { w: 3 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .3 });
    for (let i = 0; i < 40; i++) { const x = 100 + (i * 71) % 880, y = 1190 + (i * 37) % 200; P.line(x, y, x + 12, y + 2, { w: .9, a: .5 }); }   // straw
    for (let i = 0; i < 6; i++) P.line(60 + i * 160, 1200, 40 + i * 160, 1260, { w: 1.1, a: .4 });
    P.reserve([[300, 360], [900, 360], [900, 1180], [300, 1180]], { a: .5, late: .1 });
    P.text('un pedazo de carbón', 110, 1540, 52); return P; },
  dibujo: () => { const P = new Page(5, 'el barco en la pared');
    P.rwash(40, 40, 1000, 1540, C.stone, { a: .22 }); P.rwash(40, 40, 1000, 1540, C.wall, { a: .18 });
    P.rect(90, 240, 900, 700, { w: 1.8, a: .8 }); P.rwash(90, 240, 900, 700, C.sea, { a: .14 });
    P.line(40, 1180, 1040, 1180, { w: 3 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .25 });
    P.text('¿Qué crees que le falta?', 110, 1540, 52); return P; },
  barco: () => { const P = new Page(6, 'y saltó dentro del dibujo');
    P.rwash(40, 40, 1000, 1540, C.night, { a: .4 }); P.rect(90, 240, 900, 700, { w: 1.8 }); P.rwash(90, 240, 900, 700, C.sea, { a: .2 });
    for (let k = 0; k < 6; k++) P.line(120 + k * 140, 880 - k * 10, 180 + k * 140, 880 - k * 10, { w: 1.3, a: .6 });
    P.line(40, 1180, 1040, 1180, { w: 3 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .25 });
    return P; },
  manana: () => { const P = new Page(7, 'la mañana siguiente');
    P.rwash(40, 40, 1000, 1540, C.sand, { a: .3 }); P.rect(120, 160, 840, 760, { w: 2.2 }); P.rwash(120, 160, 840, 760, C.wall, { a: .25 });
    for (let r = 0; r < 6; r++) for (let k = 0; k < 5; k++) P.rect(140 + k * 166 + (r % 2) * 80, 180 + r * 120, 166, 120, { w: .6, a: .3 });
    P.line(40, 1180, 1040, 1180, { w: 3 }); P.rwash(40, 1180, 1000, 400, C.stone, { a: .25 });
    P.text('la celda vacía', 110, 1540, 52); return P; },
  hoy: () => { const P = new Page(8, 'hoy · un escaparate en Córdoba');
    P.rwash(40, 40, 1000, 1540, C.dusk, { a: .3 }); P.rect(160, 340, 760, 760, { w: 2.6 }); P.rwash(160, 340, 760, 760, C.sky, { a: .3 });
    P.rect(200, 360, 680, 60, { w: 1.6 }); P.text('Córdoba · Ver.', 540, 402, 40, { align: 'center' });   // a shop sign
    P.line(160, 1100, 920, 1100, { w: 2.2 }); P.rwash(160, 1100, 760, 16, C.wood, { a: .4 });
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
  mar: (c, t, u) => { const k = ss(seg(u, .2, .5));
    for (let i = 0; i < 4; i++) { const r = (1 - ((t * .3 + i * .25) % 1)) * 90 + 10; drawPen(c, penStroke([...Array(10)].map((_, q) => { const a = -.9 + q * .2; return [700 + Math.cos(a) * r, 560 + Math.sin(a) * r * .6]; }), { w: 1.6, wob: .4, seed: 20 + i, over: 1 }), 1, mix3(RED, INK, .3), clamp(1 - r / 110)); }
    person(c, LK.soledad, stand({ handR: V(.06, .86, .14), elbR: V(1, -.4, 0) }), 540, 1180, 560 * (.92 + .08 * k), Math.PI * .5, { rebozo: true, mantilla: true, earrings: true, seed: 10 });
    if (u > .3) handwrite(c, 'una mujer misteriosa', 120, 1440, 56, seg(u, .3, .25)); },
  calle: (c, t, u) => { const x = lerp(-120, 540, ss(seg(u, 0, .6)));
    person(c, LK.woman, walk(t * 4), x, 1200, 560, Math.PI * .5, { rebozo: true, mantilla: true, earrings: true, seed: 30 });
    person(c, LK.old, walk(t * 3.5 + 2), lerp(980, 720, ss(seg(u, 0, .8))), 1200, 520, -Math.PI * .5, { hat: 'wide', seed: 31 });
    if (u > .4) handwrite(c, 'siglos', 620, 760, 54, seg(u, .4, .25)); },
  inquisicion: (c, t, u) => {
    person(c, LK.judge, stand({ handR: V(.1, .9, .3), elbR: V(1, -.3, 0) }), 540, 1140, 600, -Math.PI * .5, { cape: true, ruff: true, cross: true, hat: 'top', seed: 40 });
    const k = ss(seg(u, .3, .4));
    for (let i = 0; i < 4; i++) { const x = 830 + i * 20, h = 60 + k * 240 * (1 - i * .15); drawPen(c, penStroke([[x, 1120], [x - 8 + Math.sin(t * 3 + i) * 8, 1120 - h]], { w: 4, wob: 1.2, seed: 50 + i + b12(), over: 2 }), 1, INK, .6); }
    if (u > .3) handwrite(c, 'bruja', 180, 500, 80, seg(u, .3, .2), { weight: 700 }); },
  celda: (c, t, u) => {
    person(c, LK.soledad, stand({ handR: V(.05, .6, .18), elbR: V(1, -.4, 0) }), 540, 1180, 520, Math.PI * .5, { rebozo: true, mantilla: true, seed: 60 });
    const k = ss(seg(u, .4, .5)); drawPen(c, penStroke([[560, 960], [640, 760 + (1 - k) * 60], [700, 620 + (1 - k) * 80]], { w: 3, wob: .8, seed: 61, over: 2 }), 1, INK, .4);
    if (u > .7) handwrite(c, 'carbón', 740, 980, 46, seg(u, .7, .2)); },
  dibujo: (c, t, u) => {
    person(c, LK.soledad, stand({ handR: V(.1, .68, .42), elbR: V(1, -.3, 0) }), 260, 1180, 500, Math.PI * .5, { rebozo: true, mantilla: true, seed: 70 });
    shipInk(c, 540, 600, 1.55, ss(seg(u, 0, .5)), INK, 71, ss(seg(u, .4, .4)));
    person(c, LK.guard, stand({ handR: V(.1, .7, .2) }), 860, 1180, 520, -Math.PI * .5, { hat: 'tricorn', halberd: true, belt: true, seed: 72 });
    if (u > .58) handwrite(c, 'Navegar —respondió él.', 260, 300, 46, seg(u, .58, .3)); },
  barco: (c, t, u) => { const mv = ss(seg(u, .1, .6));
    shipInk(c, 520 + mv * 220, 600, 1.55, 1, INK, 80, 1);
    person(c, LK.soledad, stand({ handR: V(.1, .8, .3), elbR: V(1, -.3, 0) }), lerp(260, 520 + mv * 220, mv), lerp(1180, 640, mv), lerp(500, 260, mv), Math.PI * .5, { rebozo: true, mantilla: true, seed: 81, color: 1 - mv * .4, ink: 1 - mv * .6 });
    if (mv > .2) for (let i = 0; i < 6; i++) drawPen(c, penStroke([[260 + i * 40, 1060], [260 + i * 40 + 30, 1100 - mv * 200 * (i % 2)]], { w: 1.4, wob: .6, seed: 82 + i, over: 1 }), mv, mix3(RED, INK, .3));
    if (u > .55) handwrite(c, 'la mujer sonrió', 120, 300, 50, seg(u, .55, .25)); },
  manana: (c, t, u) => { shipInk(c, 540, 600, 1.4, 1, INK, 90, 1);
    const d = ss(seg(u, .3, .4));
    person(c, LK.guard, stand({ armL: -1.1, armR: -1.1, bendL: .3, bendR: .3 }), 280, 1180, 480 * (1 - d * .15), Math.PI * .5, { hat: 'tricorn', seed: 91, color: 1 - d * .3, ink: 1 - d * .4 });
    if (u > .5) handwrite(c, 'Soledad había desaparecido', 120, 1000, 50, seg(u, .5, .3)); },
  hoy: (c, t, u) => { const x = lerp(-60, 460, ss(seg(u, 0, .7)));
    person(c, LK.soledad, walk(t * 4.5), x, 1240, 600, 0, { rebozo: true, mantilla: true, earrings: true, seed: 100 });
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
