// El vampiro de Guadalajara: La tumba prohibida — a vertical field sketchbook in pen and wash (Plot Twist with A&R).
// One page per scene, drawn in stroke order; washes bloom. The only strong colour is the vampire's dark red:
// his coat lining, his curse, then the tree's roots, then two points in the dark. Figures are original faceless sketch people.
// Horror stays implied: covered shapes, a raised stake (never the blow), colour draining away.
import { INK, PAPER, clamp, lerp, ss, TAU, rng, fbm, rgba, hex, mix3, ellipse, rough, penStroke, drawPen, wash, reserve, figure, drawPrims, handwrite, sketchShape, R3 } from './engine.js';
import { stand, walk, run } from './poses.js';
import { cues, wrap } from './subs.js';
const { V } = R3;

const W = 1080, H = 1920;
const out = document.getElementById('c'), ctx = out.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const IC = mk().getContext('2d'), CC = mk().getContext('2d'), STAT = mk(), SX = STAT.getContext('2d'), SNAP = mk(), SNX = SNAP.getContext('2d');
let T = 0;
const seg = (t, a, d) => clamp((t - a) / Math.max(1e-6, d));

const C = { night: hex('#56627d'), slate: hex('#8d96a3'), stone: hex('#cdbd9c'), lamp: hex('#e6d39a'), dawn: hex('#d9c3a5'), soil: hex('#9a7f63'), leaf: hex('#7fa04a'), leafL: hex('#aabf57'), sky: hex('#a9c0d6'), wood: hex('#a57c55'), torch: hex('#e2b45c'), iron: hex('#4a4a4e'), adobe: hex('#c9a27e') };
const RED = hex('#9e2a2b'), REDINK = mix3(RED, INK, .25);
const LK = {
  stranger: { skin: hex('#e9dfd3'), top: hex('#2b2930'), bottom: hex('#2b2930'), hair: hex('#1a1718'), sleeve: 'long', pants: 1, torso: [.078, .084, .11], shoe: hex('#141414') },
  man: { skin: hex('#c48e6e'), top: hex('#ebe6da'), bottom: hex('#9a8a70'), hair: hex('#2a221e'), sleeve: 'long', pants: 1, shoe: hex('#5a4030') },
  man2: { skin: hex('#b07a5c'), top: hex('#c9b893'), bottom: hex('#6d6256'), hair: hex('#231c1a'), sleeve: 'long', pants: 1, shoe: hex('#4a3428') },
  woman: { skin: hex('#d9a383'), top: hex('#6d5a78'), hair: hex('#231c1a'), dress: 1, flare: .16, sleeve: 'long', hairLong: 1, torso: [.08, .062, .088], shoe: hex('#3a2a22') },
  woman2: { skin: hex('#c89274'), top: hex('#7a6248'), hair: hex('#2a1e18'), dress: 1, flare: .16, sleeve: 'long', hairLong: 1, torso: [.08, .062, .088], shoe: hex('#3a2a22') },
};

let S = [], D = [], LINES = [], CUES = [], SHOTS = [];
const GAP = .2;
const Lt = (i, f) => S[i - 1] + f * (D[i - 1] + GAP);
const LEND = i => S[i - 1] + D[i - 1] + GAP;

// ---------------------------------------------------------------- a page (same pipeline as Tenet, sketched)
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
  hatch(x, y, w, h, gap = 10, ang = .9, o = {}) {
    const t = Math.tan(ang), segs = [];
    for (let k = -h * t; k < w; k += gap) { let x0 = x + k, y0 = y + h, x1 = x + k + h * t, y1 = y; if (x0 < x) { y0 = y + h - (x - x0) / t; x0 = x; } if (x1 > x + w) { y1 = y + (x1 - x - w) / t; x1 = x + w; } if (y0 > y1) segs.push([x0, y0, x1, y1]); }
    for (const [a, b, c, d] of segs) this.line(a, b, c, d, { w: o.w ?? 1.2, a: o.a ?? .7, over: 1, gap: 0, wob: .6, col: o.col });
  }
  text(s, x, y, size, o = {}) { this.items.push({ ty: 'text', s, x, y, size, font: o.font ?? 'Caveat', weight: o.weight ?? 500, col: o.col, align: o.align, rot: o.rot }); }
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

// ---------------------------------------------------------------- paper, tooth, frayed page edge (vertical page; the bottom margin holds the subtitles)
const PAPERCV = mk(), PX = PAPERCV.getContext('2d'), TOOTH = document.createElement('canvas'), MASK = mk();
function makePaper() {
  PX.fillStyle = rgba(PAPER); PX.fillRect(0, 0, W, H);
  const sm = document.createElement('canvas'); sm.width = 135; sm.height = 240; const sx = sm.getContext('2d'), id = sx.createImageData(135, 240);
  for (let y = 0; y < 240; y++) for (let x = 0; x < 135; x++) { const v = fbm(x * .05, y * .05, 3, 4) * .7 + fbm(x * .2, y * .2, 9, 2) * .3, g = 255 - v * 26; const i = (y * 135 + x) * 4; id.data[i] = g; id.data[i + 1] = g - 2; id.data[i + 2] = g - 6; id.data[i + 3] = 255; }
  sx.putImageData(id, 0, 0); PX.save(); PX.globalCompositeOperation = 'multiply'; PX.imageSmoothingQuality = 'high'; PX.drawImage(sm, 0, 0, W, H); PX.restore();
  TOOTH.width = TOOTH.height = 256; const tx = TOOTH.getContext('2d'), td = tx.createImageData(256, 256), r = rng(5);
  for (let i = 0; i < 256 * 256; i++) { const g = 255 - Math.pow(r(), 3) * 40; td.data[i * 4] = td.data[i * 4 + 1] = td.data[i * 4 + 2] = g; td.data[i * 4 + 3] = 255; }
  tx.putImageData(td, 0, 0);
  const mx = MASK.getContext('2d');
  mx.fillStyle = '#000'; mx.beginPath(); const pg = rough([[40, 40], [1040, 40], [1040, 1580], [40, 1580]], 16, 4, 12, .006); pg.forEach(([x, y], i) => i ? mx.lineTo(x, y) : mx.moveTo(x, y)); mx.closePath(); mx.fill();
  mx.globalCompositeOperation = 'destination-out'; const rr = rng(9);
  for (let i = 0; i < 360; i++) { const side = i % 4, u = rr(); const x = side < 2 ? u * W : (side === 2 ? 40 + rr() * 50 : 1040 - rr() * 50), y = side >= 2 ? u * H : (side === 0 ? 40 + rr() * 50 : 1580 - rr() * 60); mx.beginPath(); mx.ellipse(x, y, 4 + rr() * 14, 3 + rr() * 9, rr() * 3, 0, TAU); mx.fill(); }
}

// ---------------------------------------------------------------- props
const b12 = () => T * 12 | 0;
function person(c, look, pose, x, y, Sz, yaw, o = {}) {
  const prims = figure(look, pose, { x, y, S: Sz, yaw }, { seed: o.seed ?? (x | 0), boil: b12() });
  drawPrims(c, prims, { color: o.color ?? 1, ink: o.ink ?? 1 });
  const h = prims.head, lw = Math.max(1.2, Sz * .005);
  if (o.coat) {   // the stranger's long coat, open over a dark red lining
    const sh = h.c[1] + h.r * 1.5, hem = y - Sz * .22, cx = h.c[0];
    const coat = [[cx - Sz * .1, sh], [cx + Sz * .1, sh], [cx + Sz * .15, hem], [cx - Sz * .15, hem]];
    sketchShape(c, coat, LK.stranger.top, { ink: lw, wash: .85 * (o.color ?? 1), seed: 900 + b12() });
    if ((o.red ?? 1) > 0) wash(c, [[cx - Sz * .02, sh + h.r], [cx + Sz * .03, sh + h.r], [cx + Sz * .06, hem], [cx - Sz * .05, hem]], RED, { a: .9 * (o.red ?? 1), j: 1.5, layers: 2, edge: .3, seed: 901 });
    drawPen(c, penStroke([[cx, sh + h.r * .5], [cx + Sz * .005, hem]], { w: lw, wob: .5, seed: 902 + b12(), over: 1 }), 1);
  }
  if (o.tophat) { const hx = h.c[0], hy = h.c[1] - h.r * .7; sketchShape(c, [[hx - h.r * .8, hy], [hx + h.r * .8, hy], [hx + h.r * .7, hy - h.r * 2.1], [hx - h.r * .7, hy - h.r * 2.1]], LK.stranger.top, { ink: lw, wash: .85 * (o.color ?? 1), seed: 903 + b12() }); sketchShape(c, ellipse(hx, hy, h.r * 1.5, h.r * .3, 16), LK.stranger.top, { ink: lw, wash: .85 * (o.color ?? 1), seed: 904 }); if ((o.red ?? 1) > 0) wash(c, [[hx - h.r * .72, hy - h.r * .5], [hx + h.r * .72, hy - h.r * .5], [hx + h.r * .72, hy - h.r * .25], [hx - h.r * .72, hy - h.r * .25]], RED, { a: .85 * (o.red ?? 1), j: 1, layers: 2, seed: 905 }); }
  if (o.sombrero) { const hx = h.c[0], hy = h.c[1] - h.r * .55; sketchShape(c, ellipse(hx, hy, h.r * 2.3, h.r * .45, 18), C.stone, { ink: lw, wash: .55, seed: 906 + b12() }); sketchShape(c, [[hx - h.r * .75, hy], [hx + h.r * .75, hy], [hx + h.r * .5, hy - h.r * 1.3], [hx - h.r * .5, hy - h.r * 1.3]], C.stone, { ink: lw, wash: .55, seed: 907 }); }
  if (o.rebozo) { sketchShape(c, [[h.c[0] - h.r * 1.2, h.c[1] - h.r * .9], [h.c[0] + h.r * 1.2, h.c[1] - h.r * .9], [h.c[0] + h.r * 1.9, h.c[1] + h.r * 4.5], [h.c[0] - h.r * 1.9, h.c[1] + h.r * 4.5]], o.rebozo, { ink: lw, wash: .7, seed: 908 + b12() }); }
  if (o.torch) { const [hx, hy] = prims.hand.R; drawPen(c, penStroke([[hx, hy + Sz * .04], [hx + Sz * .02, hy - Sz * .2]], { w: lw * 2.2, wob: .5, seed: 909, over: 1 }), 1); const fx = hx + Sz * .02, fy = hy - Sz * .24, fl = 1 + .15 * Math.sin(T * 17 + x); reserve(c, ellipse(fx, fy, Sz * .09, Sz * .11, 14), .35, 6, 3); wash(c, ellipse(fx, fy, Sz * .05 * fl, Sz * .08 * fl, 12), C.torch, { a: .8, j: 3, layers: 2, seed: 910 + b12() }); drawPen(c, penStroke([[fx - Sz * .03, fy + Sz * .04], [fx, fy - Sz * .08 * fl], [fx + Sz * .03, fy + Sz * .04]], { w: lw, wob: 1, seed: 911 + b12(), over: 1 }), 1); }
  return prims;
}
function carrot(c, x, y, h, col, seed, o = {}) {
  wash(c, ellipse(x, y - h * .62, h * .17, h * .3, 10), col, { a: .6, j: 1.5, layers: 2, edge: .3, seed: seed + b12() });
  const ph = o.walk ?? 0;
  drawPen(c, penStroke([[x - h * .06, y - h * .34], [x - h * .08 + Math.sin(ph) * h * .07, y]], { w: Math.max(1, h * .035), wob: .3, seed: seed + 1 + b12(), over: 1 }), 1);
  drawPen(c, penStroke([[x + h * .06, y - h * .34], [x + h * .08 - Math.sin(ph) * h * .07, y]], { w: Math.max(1, h * .035), wob: .3, seed: seed + 2 + b12(), over: 1 }), 1);
  c.fillStyle = rgba(INK, .9); c.beginPath(); c.arc(x, y - h * .98, h * .085, 0, TAU); c.fill();
}
function tree(c, x, y, g, o = {}) {   // a big old tree (ficus-like): a buttressed trunk that forks, thick limbs, a broad crown; g = growth 0..1
  const b = o.boil ?? 0, Hh = (o.h ?? 900) * g, red = o.red ?? 0;
  if (g <= 0) return;
  const k = g, fy = y - Hh * .55;
  const trunk = [[x - 100 * k, y], [x - 62 * k, y - Hh * .2], [x - 50 * k, y - Hh * .42], [x - 70 * k, fy], [x - 24 * k, fy + 10], [x, fy - 8], [x + 24 * k, fy + 10], [x + 72 * k, fy], [x + 52 * k, y - Hh * .42], [x + 64 * k, y - Hh * .2], [x + 104 * k, y]];
  sketchShape(c, trunk, C.wood, { ink: 2.6, wash: .55, seed: 1000 + b });
  wash(c, [[x + 10 * k, y], [x + 30 * k, y - Hh * .45], [x + 64 * k, fy], [x + 52 * k, y - Hh * .42], [x + 64 * k, y - Hh * .2], [x + 104 * k, y]], mix3(C.wood, hex('#6e6a9a'), .45), { a: .45, j: 2, layers: 2, edge: .1, seed: 1003 });
  for (let i = 0; i < 6; i++) drawPen(c, penStroke([[x - 50 * k + i * 20 * k, y - 8], [x - 40 * k + i * 16 * k, y - Hh * .4], [x - 44 * k + i * 18 * k, fy + 6]], { w: 1.2, wob: 1.4, seed: 1001 + i + b, over: 2 }), 1, INK, .55);
  for (const [s2, kk] of [[-1, 1], [1, 1], [-1, .65], [1, .6]]) { const pts = [[x + s2 * 70 * k, y - 20], [x + s2 * 140 * k * kk, y - 4], [x + s2 * 240 * k * kk, y + 8]]; drawPen(c, penStroke(pts, { w: 5 * k + 1, wob: 1, seed: 1010 + s2 * 7 + kk * 10 + b, over: 2 }), 1); if (red > 0) wash(c, [pts[0], pts[1], pts[2], [pts[2][0], pts[2][1] + 9], [pts[1][0], pts[1][1] + 14], [pts[0][0], pts[0][1] + 24]], RED, { a: .75 * red, j: 2, layers: 2, seed: 1020 }); }
  const limbs = [[-1, .95, .22], [1, .9, .2], [-1, .55, .38], [1, .6, .36], [0, .3, .45]];
  for (const [s2, a, up] of limbs) { const sx = x + s2 * 40 * k, ex = x + s2 * Hh * .42 * a, ey = fy - Hh * up; drawPen(c, penStroke([[sx, fy], [lerp(sx, ex, .5), lerp(fy, ey, .6) + 10], [ex, ey]], { w: 8 * k + 1, wob: 1.2, seed: 1030 + s2 * 3 + a * 10 + b, over: 3 }), 1); drawPen(c, penStroke([[lerp(sx, ex, .6), lerp(fy, ey, .6)], [ex + s2 * 60 * k, ey - 40 * k]], { w: 3 * k + 1, wob: 1, seed: 1036 + s2 + a * 10 + b, over: 2 }), 1); }
  const cr = o.crown ?? 1;
  if (g > .35 && cr > 0) { const kc = ss((g - .35) / .65) * cr, r = rng(1040), ccx = x, ccy = fy - Hh * .32, rx = Hh * .55, ry = Hh * .27;
    for (let i = 0; i < 120 * kc; i++) { const a = r() * TAU, d = Math.sqrt(r()), px = ccx + Math.cos(a) * rx * d, py = ccy + Math.sin(a) * ry * d, lit = (px - ccx) / rx - (py - ccy) / ry * .6; wash(c, ellipse(px, py, 22 + r() * 32, 14 + r() * 20, 8), lit < 0 ? C.leafL : C.leaf, { a: (o.leafA ?? .45) * (.7 + r() * .5), j: 4, layers: 1, edge: .1, seed: 1050 + i }); }
    for (let i = 0; i < 16 * kc; i++) { const a = i / 16 * TAU, px = ccx + Math.cos(a) * rx * .95, py = ccy + Math.sin(a) * ry * .95; drawPen(c, penStroke([[px - 22, py + 4], [px - 8, py - 12], [px + 8, py - 12], [px + 22, py + 4]], { w: 1.8, wob: 1, seed: 1070 + i + b, over: 1 }), 1); } }
}
function coffin(c, x, y, w, h, o = {}) { const p = [[x - w * .38, y - h / 2], [x + w * .38, y - h / 2], [x + w / 2, y - h * .2], [x + w * .38, y + h / 2], [x - w * .38, y + h / 2], [x - w / 2, y - h * .2]].map(([a, b2]) => [a, b2]); sketchShape(c, p, C.wood, { ink: 2.4, wash: o.wash ?? .5, seed: 1100 + b12() }); drawPen(c, penStroke([[x, y - h * .4], [x, y + h * .4]], { w: 2, seed: 1101, over: 1 }), 1); drawPen(c, penStroke([[x - w * .14, y - h * .1], [x + w * .14, y - h * .1]], { w: 2, seed: 1102, over: 1 }), 1); }
function tomb(P, x, y, w) { P.rect(x - w / 2, y - 40, w, 40, { w: 2.4 }); P.shape([[x - w * .2, y - 40], [x - w * .2, y - 200], [x - w * .12, y - 240], [x + w * .12, y - 240], [x + w * .2, y - 200], [x + w * .2, y - 40]], { w: 2.4 }); P.line(x, y - 210, x, y - 110, { w: 2.4 }); P.line(x - 36, y - 180, x + 36, y - 180, { w: 2.4 }); P.wash([[x - w / 2, y - 40], [x + w / 2, y - 40], [x + w / 2, y], [x - w / 2, y]], C.stone, { a: .45 }); P.wash([[x - w * .2, y - 40], [x - w * .2, y - 200], [x, y - 240], [x + w * .2, y - 200], [x + w * .2, y - 40]], C.stone, { a: .4 }); }
function cross(P, x, y, s = 1) { P.line(x, y, x, y - 90 * s, { w: 1.8 }); P.line(x - 28 * s, y - 64 * s, x + 28 * s, y - 64 * s, { w: 1.8 }); }

// ---------------------------------------------------------------- the pages
const PG = {
  tumba: () => { const P = new Page(1, 'Guadalajara, Jalisco · Panteón de Belén');
    P.rwash(40, 40, 1000, 900, C.night, { a: .5, src: [800, 260] }); P.circle(800, 260, 70, { w: 1.8 }); P.reserve(ellipse(800, 260, 66, 66, 20));
    P.line(60, 940, 1020, 940, { w: 2 });
    P.shape([[300, 560], [300, 400], [540, 330], [780, 400], [780, 560]], { w: 2 }); for (let i = 0; i < 6; i++) P.line(340 + i * 88, 412, 340 + i * 88, 560, { w: 1.4 }); P.wash([[300, 560], [300, 400], [540, 330], [780, 400], [780, 560]], C.stone, { a: .35 });
    P.text('Panteón de Belén', 400, 610, 40); P.line(120, 560, 960, 560, { w: 1.2, a: .6 });
    for (const [x, s] of [[120, .9], [180, .7], [930, .8], [990, .6]]) cross(P, x, 1300, s);
    P.rwash(40, 940, 1000, 640, C.slate, { a: .35 }); tomb(P, 540, 1420, 360);
    return P; },
  extranjero: () => { const P = new Page(2, 'Guadalajara · siglo XIX · de noche');
    P.rwash(40, 40, 1000, 1540, C.night, { a: .45, src: [540, 200] }); P.circle(800, 200, 60, { w: 1.8 }); P.reserve(ellipse(800, 200, 56, 56, 20));
    for (const s of [-1, 1]) { P.shape([[540 + s * 40, 600], [540 + s * 40, 380], [540 + s * 30, 330], [540 + s * 20, 380], [540 + s * 20, 600]], { w: 1.6 }); }
    P.wash([[500, 600], [500, 380], [510, 330], [520, 380], [560, 380], [570, 330], [580, 380], [580, 600]], C.stone, { a: .35 });
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x0 = s < 0 ? 60 + i * 120 : 1020 - i * 120 - 110, top = 520 + i * 60, bot = 1480 - i * 120; P.ink([[x0, bot], [x0, top], [x0 + 110, top + 20], [x0 + 110, bot - 40]], { w: 1.8, smooth: false }); P.wash([[x0, bot], [x0, top], [x0 + 110, top + 20], [x0 + 110, bot - 40]], C.adobe, { a: .3 }); for (let k = 0; k < 3; k++) { P.rect(x0 + 30, top + 100 + k * 220, 44, 80, { w: 1.4 }); if ((i + k) % 2) P.rwash(x0 + 30, top + 100 + k * 220, 44, 80, C.lamp, { a: .6 }); } }
    P.ink([[420, 1580], [500, 640], [580, 640], [660, 1580]], { w: 1.4, a: .6, smooth: false });
    for (const x of [230, 850]) { P.line(x, 1500, x, 1100, { w: 2 }); P.shape([[x - 18, 1100], [x + 18, 1100], [x + 12, 1060], [x - 12, 1060]], { w: 1.6 }); P.wash(ellipse(x, 1080, 60, 60, 16), C.lamp, { a: .35 }); }
    return P; },
  sinsangre: () => { const P = new Page(3, 'al amanecer');
    P.rwash(40, 40, 1000, 640, C.dawn, { a: .3, src: [540, 680] }); P.line(60, 680, 1020, 680, { w: 1.6 });
    for (let x = 80; x < 1020; x += 90) P.line(x, 640, x, 760, { w: 1.6 }); P.line(60, 660, 1020, 660, { w: 1.4 }); P.line(60, 720, 1020, 720, { w: 1.4 });
    P.rwash(40, 680, 1000, 900, C.slate, { a: .22 });
    for (const [x, y, s] of [[300, 960, 1], [700, 1010, .8]]) { P.line(x - 200 * s, y + 46 * s, x + 220 * s, y + 46 * s, { w: 1.4, a: .7 }); P.shape(ellipse(x, y, 120 * s, 44 * s, 20), { w: 2 }); P.shape(ellipse(x + 150 * s, y + 18 * s, 40 * s, 24 * s, 14), { w: 2 }); P.line(x + 140 * s, y + 14 * s, x + 158 * s, y + 16 * s, { w: 1.4 }); for (let k = 0; k < 4; k++) P.line(x - 60 * s + k * 40 * s, y + 36 * s, x - 30 * s + k * 40 * s + 50 * s, y + 44 * s, { w: 1.6 }); P.wash(ellipse(x, y, 120 * s, 44 * s, 16), C.slate, { a: .3 }); P.wash(ellipse(x, y + 52 * s, 200 * s, 12 * s, 14), C.slate, { a: .3 }); }
    P.rect(560, 1180, 380, 120, { w: 2.2 }); for (const x of [600, 900]) P.circle(x, 1320, 34, { w: 2 }); P.ink([[580, 1180], [620, 1120], [700, 1100], [820, 1100], [900, 1120], [930, 1180]], { w: 2 });
    P.wash([[580, 1180], [620, 1120], [700, 1100], [820, 1100], [900, 1120], [930, 1180]], C.slate, { a: .35 }); for (let k = 0; k < 4; k++) P.line(640 + k * 70, 1112, 660 + k * 70, 1176, { w: 1.2, a: .6 });
    P.text('sin una sola gota de sangre', 120, 1500, 52);
    return P; },
  persecucion: () => { const P = new Page(4, 'la persecución');
    P.rwash(40, 40, 1000, 1540, C.night, { a: .5 });
    P.ink([[60, 1500], [1020, 1100]], { w: 2 });
    for (let i = 0; i < 5; i++) { const x = 80 + i * 200, y0 = 1480 - i * 80; P.ink([[x, y0], [x, y0 - 520 + i * 30], [x + 190, y0 - 540 + i * 30]], { w: 1.6, smooth: false }); P.wash([[x, y0], [x, y0 - 520 + i * 30], [x + 190, y0 - 540 + i * 30], [x + 190, y0 - 80]], C.adobe, { a: .28 }); P.rect(x + 60, y0 - 380 + i * 30, 50, 90, { w: 1.2 }); }
    P.rect(900, 380, 120, 760, { w: 2 }); P.rwash(900, 380, 120, 760, hex('#2a2a32'), { a: .55 });
    return P; },
  estaca: () => { const P = new Page(5, 'la estaca · la maldición');
    P.rwash(40, 40, 1000, 900, C.night, { a: .55, src: [540, 380] }); P.circle(540, 380, 220, { w: 2 }); P.reserve(ellipse(540, 380, 214, 214, 30));
    P.line(60, 1200, 1020, 1200, { w: 2 }); P.rwash(40, 1200, 1000, 380, C.slate, { a: .35 });
    return P; },
  entierro: () => { const P = new Page(6, 'Panteón de Belén');
    P.rwash(40, 40, 1000, 1100, C.night, { a: .4 }); P.line(60, 1380, 1020, 1380, { w: 2 }); P.rwash(40, 1380, 1000, 200, C.soil, { a: .35 });
    for (const [x, s] of [[110, .9], [200, .7], [880, .8], [970, .6]]) cross(P, x, 1380, s);
    P.rect(340, 1340, 400, 40, { w: 2.4 }); P.rwash(340, 1340, 400, 40, C.stone, { a: .5 });
    return P; },
  raices: () => { const P = new Page(7, 'bajo la tumba');
    const GY = 700; P.rwash(40, 40, 1000, GY - 40, C.night, { a: .35 }); P.line(60, GY, 1020, GY, { w: 2.6 });
    P.rwash(40, GY, 1000, 880, C.soil, { a: .45 }); for (let i = 0; i < 7; i++) P.line(60, GY + 80 + i * 110, 1020, GY + 80 + i * 110, { w: 1, a: .5 });
    const r = rng(7); for (let i = 0; i < 60; i++) { const x = 80 + r() * 920, y = GY + 30 + r() * 840; P.circle(x, y, 3 + r() * 5, { w: 1, a: .6 }); }
    P.rect(320, GY - 40, 440, 40, { w: 2.4 }); P.rwash(320, GY - 40, 440, 40, C.stone, { a: .5 });
    P.text('cuando el árbol muera…', 90, 1520, 52);
    return P; },
  existe: () => { const P = new Page(8, 'hoy · Panteón de Belén');
    P.rwash(40, 40, 1000, 900, C.sky, { a: .3, src: [540, 120] }); P.line(60, 1280, 1020, 1280, { w: 2 }); P.rwash(40, 1280, 1000, 300, C.stone, { a: .3 });
    for (const [x, s] of [[100, .9], [180, .7], [900, .8], [980, .6]]) cross(P, x, 1280, s);
    for (let x = 300; x <= 780; x += 30) P.line(x, 1290, x, 1190, { w: 1.6 }); P.line(290, 1200, 790, 1200, { w: 2 }); P.line(290, 1270, 790, 1270, { w: 2 });
    return P; },
  giro: () => { const P = new Page(9, '¿encerrado?');
    const GY = 560; P.rwash(40, 40, 1000, GY - 40, C.night, { a: .5 }); P.line(60, GY, 1020, GY, { w: 2.6 }); P.rwash(40, GY, 1000, 1020, hex('#4d3b30'), { a: .55 });
    P.rect(320, GY - 40, 440, 40, { w: 2.4 }); P.rwash(320, GY - 40, 440, 40, C.stone, { a: .5 });
    return P; },
  final: () => { const P = new Page(10, 'Plot Twist with A&R');
    P.text('EL VAMPIRO', 540, 360, 128, { weight: 700, align: 'center' }); P.text('DE GUADALAJARA', 540, 480, 96, { weight: 700, align: 'center' });
    P.text('Hay muertos que jamás', 540, 1180, 62, { align: 'center' }); P.text('deberían despertar.', 540, 1250, 62, { align: 'center' });
    P.text('PLOT TWIST WITH A&R', 540, 1420, 54, { weight: 700, align: 'center' });
    P.text('El panteón y el árbol existen; la historia del vampiro', 540, 1500, 32, { align: 'center' }); P.text('es folclore, no está comprobada. El giro es una dramatización.', 540, 1540, 32, { align: 'center' });
    return P; },
};
// what moves
const DY = {
  tumba: (c, t, u) => { for (let i = 0; i < 6; i++) { const x = ((i * 220 + t * 30) % 1200) - 100, y = 1250 + (i % 3) * 60; wash(c, ellipse(x, y, 160, 18, 14), C.slate, { a: .25, j: 6, layers: 1, edge: 0, seed: 50 + i }); }
    tree(c, 540, 1380, 1, { h: 620, boil: b12(), leafA: .35 });
    const k = ss(seg(u, .45, .3)); if (k > 0) { const pulse = .6 + .4 * Math.sin(t * 6); drawPen(c, penStroke([[420, 1395], [480, 1400], [520, 1392], [580, 1404], [660, 1396]], { w: 2.6, wob: 1.2, seed: 60 + b12(), over: 2 }), k, mix3(RED, INK, .2)); wash(c, [[420, 1390], [660, 1390], [660, 1404], [420, 1404]], RED, { a: .5 * k * pulse, j: 3, layers: 2, seed: 61 }); }
    if (u > .55) handwrite(c, 'jamás debería abrirse', 120, 1060, 54, seg(u, .55, .25), { col: REDINK }); },
  extranjero: (c, t, u) => { carrot(c, 150, 1250, 70, C.slate, 70); carrot(c, 930, 1180, 60, C.slate, 71);
    const y = lerp(1080, 1460, ss(u)), sz = lerp(520, 760, ss(u));
    person(c, LK.stranger, walk(t * 4.2), 540, y, sz, Math.PI, { coat: true, tophat: true, seed: 72 });
    if (u > .3) handwrite(c, 'un extranjero', 600, 760, 50, seg(u, .3, .2)); if (u > .55) handwrite(c, 'sólo salía de noche', 560, 840, 44, seg(u, .55, .2)); },
  sinsangre: (c, t, u) => { person(c, LK.woman, stand({ handR: V(.06, .86, .14), elbR: V(1, -.4, 0) }), 300, 1420, 420, Math.PI * .8, { rebozo: hex('#6d5a78'), seed: 80, color: lerp(1, .35, ss(u)) });
    person(c, LK.man, stand({}), 160, 1440, 400, Math.PI * .75, { sombrero: true, seed: 81, color: lerp(1, .35, ss(u)) }); },
  persecucion: (c, t, u) => {
    for (let i = 0; i < 7; i++) { const lk = [LK.man, LK.woman, LK.man2, LK.woman2][i % 4], fem = i % 2 === 1, x = lerp(-120 + i * 90, 520 + i * 70, ss(u)) - (i % 3) * 30, y = 1500 - (x + 120) * .4 + (i % 3) * 40, sz = 380 - (i % 3) * 40;
      person(c, lk, run(t * 7 + i, .8), x, y, sz, Math.PI * .5, { sombrero: !fem, rebozo: fem ? hex('#6d5a78') : null, torch: i % 2 === 0, seed: 90 + i }); }
    const sx = lerp(820, 1010, ss(u)); person(c, LK.stranger, run(t * 7, .9), sx, 1150, 420, Math.PI * .5, { coat: true, tophat: true, seed: 99 });
    for (let i = 0; i < 3; i++) { const x = 240 + i * 160, y = 900 - i * 40; drawPen(c, penStroke([[x, y], [x + 30, y - 40]], { w: 2.4, wob: .8, seed: 100 + i + b12(), over: 2 }), 1); drawPen(c, penStroke([[x + 20, y + 10], [x + 60, y - 20]], { w: 2.4, wob: .8, seed: 104 + i + b12(), over: 2 }), 1); }
    handwrite(c, '¡vampiro!', 200, 820, 64, seg(u, .25, .2), { weight: 700 }); },
  estaca: (c, t, u) => {
    const up = ss(seg(u, 0, .3)), cut = u > .38;
    if (!cut) { const hx = 540, hy = lerp(1200, 560, up); sketchShape(c, [[hx - 18, hy + 260], [hx + 18, hy + 260], [hx + 14, hy - 120], [hx, hy - 220], [hx - 14, hy - 120]], C.wood, { ink: 3, wash: .6, seed: 120 + b12() }); sketchShape(c, [[hx - 70, hy + 80], [hx + 66, hy + 76], [hx + 76, hy + 130], [hx + 60, hy + 170], [hx - 60, hy + 172], [hx - 76, hy + 128]], hex('#c48e6e'), { ink: 2.6, wash: .55, seed: 121 + b12() }); for (let k = 0; k < 3; k++) drawPen(c, penStroke([[hx - 64 + k * 44, hy + 84], [hx - 60 + k * 44, hy + 128]], { w: 2, seed: 122 + k + b12(), over: 1 }), 1); drawPen(c, penStroke([[hx - 70, hy + 128], [hx - 110, hy + 170], [hx - 130, hy + 300]], { w: 3, seed: 126 + b12(), over: 2 }), 1); drawPen(c, penStroke([[hx + 60, hy + 170], [hx + 90, hy + 300]], { w: 3, seed: 127 + b12(), over: 2 }), 1); }
    else { const k = ss(seg(u, .38, .4)); const hx = 540, hy = 1240;   // after: only his hat on the ground, its red draining
      sketchShape(c, [[hx - 70, hy], [hx + 70, hy], [hx + 60, hy - 150], [hx - 60, hy - 150]], LK.stranger.top, { ink: 2.6, wash: .85, seed: 130 + b12() }); sketchShape(c, ellipse(hx, hy, 130, 26, 18), LK.stranger.top, { ink: 2.6, wash: .85, seed: 131 });
      wash(c, [[hx - 61, hy - 44], [hx + 61, hy - 44], [hx + 63, hy - 22], [hx - 63, hy - 22]], RED, { a: .85 * (1 - k), j: 1, layers: 2, seed: 132 });
      const sp = ss(seg(u, .5, .45));   // the curse, written in red, spiralling out
      if (sp > 0) { c.save(); c.translate(540, 560); for (let i = 0; i < 4; i++) { const a = i * 1.6 + t * .3, r = 70 + i * 70; c.save(); c.rotate(a); handwrite(c, ['volveré', 'me vengaré', 'algún día', 'volveré'][i], r, 0, 58 - i * 6, clamp(sp * 4 - i), { col: REDINK, weight: 600 }); c.restore(); } c.restore(); } } },
  entierro: (c, t, u) => {
    const g = ss(seg(u, .2, .7)); tree(c, 540, 1340, g, { h: 1040, red: ss(seg(u, .6, .35)), boil: b12() });
    if (u < .3) for (let i = 0; i < 4; i++) carrot(c, 380 + i * 110, 1380, 120, C.slate, 140 + i);
    if (u > .25) handwrite(c, 'un árbol creció sobre su tumba', 90, 1520, 50, seg(u, .25, .25)); },
  raices: (c, t, u) => {
    tree(c, 540, 660, 1, { h: 600, boil: b12(), red: 1, crown: 1, leafA: .25 });
    const gr = ss(seg(u, 0, .7));
    for (let i = 0; i < 7; i++) { const x0 = 400 + i * 45, r = rng(150 + i), pts = [[x0, 700]]; let x = x0, y = 700; for (let k = 0; k < 7; k++) { x += (r() - .5) * 110; y += 80 + r() * 30; pts.push([x, y]); } const st = penStroke(pts, { w: 4 - i * .3, wob: 1.5, seed: 160 + i + b12(), over: 2 }); drawPen(c, st, gr, mix3(RED, INK, .35)); }
    coffin(c, 540, 1260, 360, 170, { wash: .45 });
    const crk = ss(seg(u, .45, .35)); drawPen(c, penStroke([[330, 672], [420, 690], [470, 664], [560, 694], [640, 668], [750, 690]], { w: 3, wob: 1.2, seed: 170 + b12(), over: 2 }), crk);
    if (u > .5) handwrite(c, 'el vampiro despertará', 90, 1450, 52, seg(u, .5, .25), { col: REDINK }); },
  existe: (c, t, u) => { tree(c, 540, 1240, 1, { h: 1100, boil: b12(), leafA: .5 }); for (let i = 0; i < 3; i++) carrot(c, 180 + i * 300, 1460, 110, [C.slate, C.adobe, C.leaf][i], 180 + i);
    handwrite(c, 'el árbol existe', 120, 1520, 60, seg(u, .1, .4), { weight: 600 }); },
  giro: (c, t, u) => {
    tree(c, 540, 520, 1, { h: 470, boil: b12(), red: 1, crown: 1, leafA: .2 });
    const cx = 540, cy = 1140, k = ss(seg(u, .05, .65));
    coffin(c, cx, cy, 380, 180, { wash: .35 });
    for (let i = 0; i < 8; i++) { const off = (i - 3.5), sd = i % 2 ? 1 : -1, a0 = -Math.PI / 2 + off * .3, pts = [[cx + off * 40, 560], [cx + off * 70, cy - 300], [cx + Math.cos(a0) * 260, cy + Math.sin(a0) * 140]]; for (let q = 1; q <= 14; q++) { const a = a0 + sd * q / 14 * Math.PI * 1.25, rr = lerp(260, 215, q / 14); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .56]); } drawPen(c, penStroke(pts, { w: 5 - Math.abs(off) * .4, wob: 1.2, seed: 200 + i + b12(), over: 2 }), k, mix3(RED, INK, .3)); }
    const e = ss(seg(u, .72, .2)); if (e > 0) for (const s of [-1, 1]) { c.fillStyle = rgba(RED, e); c.beginPath(); c.ellipse(cx + s * 28, cy - 10, 10, 4 + 3 * e, 0, 0, TAU); c.fill(); } },
  final: (c, t, u) => { tree(c, 540, 1050, 1, { h: 500, boil: b12(), red: 1, leafA: .3 }); },
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
    else if (it.ty === 'text') handwrite(IC, it.s, it.x, it.y, it.size, Math.min(1, p), { font: it.font, weight: it.weight, col: it.col, align: it.align, rot: it.rot });
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
  window.DUR = LEND(9) + 3.6;
  CUES = cues(LINES, S, D, 70); window.SUBS = CUES;
  makePaper();
  SHOTS = [
    { t0: 0, key: 'tumba', cam: { z0: 1, z1: 1.06, cy: 1300 } },
    { t0: Lt(2, 0), key: 'extranjero', cam: { z0: 1, z1: 1.05, cy: 1100 } },
    { t0: Lt(3, 0), key: 'sinsangre', cam: { z0: 1.04, z1: 1, cy: 1000 } },
    { t0: Lt(4, 0), key: 'persecucion', cam: { z0: 1, z1: 1.05, cx: 700, cy: 1200 } },
    { t0: Lt(5, 0), key: 'estaca', cam: { z0: 1, z1: 1.06, cy: 700 } },
    { t0: Lt(6, 0), key: 'entierro', cam: { z0: 1.05, z1: 1, cy: 900 } },
    { t0: Lt(7, 0), key: 'raices', cam: { z0: 1, z1: 1.05, cy: 1200 } },
    { t0: Lt(8, 0), key: 'existe', cam: { z0: 1, z1: 1.03, cy: 900 } },
    { t0: Lt(9, 0), key: 'giro', cam: { z0: 1, z1: 1.12, cy: 1140 } },
    { t0: LEND(9) + .1, key: 'final', cam: { z0: 1.03, z1: 1 } },
  ];
  window.SHOTS = SHOTS.map(s => s.t0);
  window.render = t => frame(t);
  window.READY = true;
})();
