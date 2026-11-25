// Tenet, sketched: a spy's travel sketchbook in pen and wash. One page per place.
// The pen draws the world forward in stroke order; inverted things un-draw and are washed in rose.
// The orange trinket is the only saturated colour in the film. Figures are original sketch stand-ins (faces left blank, as the style asks).
import { INK, PAPER, clamp, lerp, ss, TAU, rng, fbm, rgba, hex, mix3, ellipse, rough, penStroke, drawPen, wash, reserve, figure, drawPrims, handwrite, sketchShape, R3 } from './engine.js';
import { stand, walk } from './poses.js';
import { cues, wrap } from './subs.js';
const { V } = R3;

const W = 1920, H = 1080;
const out = document.getElementById('c'), ctx = out.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const IC = mk().getContext('2d'), CC = mk().getContext('2d'), STAT = mk(), SX = STAT.getContext('2d'), SNAP = mk(), SNX = SNAP.getContext('2d');
let T = 0;
const seg = (t, a, d) => clamp((t - a) / Math.max(1e-6, d));

// ---------------------------------------------------------------- palette (muted washes; one warm orange)
const C = {
  night: hex('#5f6f8c'), stone: hex('#d8c6a0'), slate: hex('#8d96a3'), sky: hex('#a9c0d6'), lamp: hex('#e6d39a'), maroon: hex('#8e5552'),
  sea: hex('#86a8b8'), asphalt: hex('#8b8f99'), sage: hex('#a7b39a'), sand: hex('#d7bf94'), ochre: hex('#d8ad74'), steel: hex('#9aa3ad'),
  brick: hex('#b97c63'), olive: hex('#8a8f6e'), dusk: hex('#c9a183'), violet: hex('#77739e'), paper: hex('#f5eede'),
};
const ROSE = hex('#d17a9d'), ORANGE = hex('#e8701f');
// ---------------------------------------------------------------- the cast (original sketch figures)
const LK = {
  prot: { skin: hex('#c98f6c'), top: hex('#3f4b68'), bottom: hex('#3a4562'), hair: hex('#1f1a18'), sleeve: 'long', pants: 1, torso: [.08, .088, .112], shoe: hex('#222222') },
  protTac: { skin: hex('#c98f6c'), top: hex('#4f5546'), bottom: hex('#474c40'), hair: hex('#2a2a2a'), sleeve: 'long', pants: 1, torso: [.082, .09, .114], shoe: hex('#222222') },
  neil: { skin: hex('#efc9aa'), top: hex('#c9b893'), bottom: hex('#857b6b'), hair: hex('#9b6f46'), hairVol: 1.18, sleeve: 'long', pants: 1, shoe: hex('#6a4a34') },
  kat: { skin: hex('#efc4a6'), top: hex('#9f968a'), hair: hex('#c49a5c'), dress: 1, flare: .13, sleeve: 'long', torso: [.08, .062, .088], shoe: hex('#3a2a22') },
  sator: { skin: hex('#d4a487'), top: hex('#3b312d'), bottom: hex('#3b312d'), hair: hex('#a39d95'), sleeve: 'long', pants: 1, torso: [.098, .112, .122], shoe: hex('#1c1c1c') },
  guard: { skin: hex('#c18a6a'), top: hex('#2c2c30'), bottom: hex('#2c2c30'), hair: hex('#1c1c1c'), sleeve: 'long', pants: 1, torso: [.09, .1, .118], shoe: hex('#111111') },
  sci: { skin: hex('#e9bfa0'), top: hex('#eeece6'), bottom: hex('#5a6173'), hair: hex('#3a2a22'), hairLong: 1, sleeve: 'long', pants: 1 },
  handler: { skin: hex('#d8a384'), top: hex('#2f3a55'), bottom: hex('#3a3f4a'), hair: hex('#a39d95'), sleeve: 'long', pants: 1 },
  soldier: { skin: hex('#c48e6e'), top: hex('#4e5345'), bottom: hex('#474b3f'), hair: hex('#2a2a2a'), sleeve: 'long', pants: 1, torso: [.082, .09, .114], shoe: hex('#1d1d1d') },
};
const rose = (L, k = 1) => { const o = { ...L }; for (const key of ['skin', 'top', 'bottom', 'hair', 'shoe']) if (o[key]) o[key] = mix3(o[key], ROSE, (key === 'skin' ? .3 : .62) * k); return o; };

// ---------------------------------------------------------------- timing
let S = [], D = [], LINES = [], CUES = [], SHOTS = [];
const Lt = (i, f) => S[i - 1] + f * (D[i - 1] + 0.3);
const LEND = i => S[i - 1] + D[i - 1] + 0.3;

// ---------------------------------------------------------------- a page: items drawn in stroke order, then washes bloom
class Page {
  constructor(seed, note) { this.items = []; this.seed = seed; this.k = 0; if (note) this.text(note, 1840, 92, 46, { font: 'Reenie Beanie', align: 'right', weight: 400 }); }
  s() { return this.seed * 97 + (this.k++) * 13; }
  ink(pts, o = {}) { const st = penStroke(pts, { w: o.w ?? 2.3, wob: o.wob ?? 1.1, over: o.over ?? 5, gap: o.gap ?? .35, seed: this.s(), smooth: o.smooth }); this.items.push({ ty: 'ink', st, a: o.a ?? 1, col: o.col }); return st; }
  line(x0, y0, x1, y1, o = {}) { return this.ink([[x0, y0], [x1, y1]], { smooth: false, ...o }); }
  rect(x, y, w, h, o = {}) { this.line(x, y, x + w, y, o); this.line(x + w, y, x + w, y + h, o); this.line(x + w, y + h, x, y + h, o); this.line(x, y + h, x, y, o); }
  shape(poly, o = {}) { this.ink([...poly, poly[0]], { smooth: false, ...o }); }
  circle(x, y, r, o = {}) { this.ink([...ellipse(x, y, r, o.ry ?? r, 30), ellipse(x, y, r, o.ry ?? r, 30)[0], ellipse(x, y, r, o.ry ?? r, 30)[1]], { smooth: true, ...o }); }
  wash(poly, col, o = {}) { this.items.push({ ty: 'wash', poly, col, a: o.a ?? .45, seed: this.s(), dx: o.dx ?? 3, dy: o.dy ?? 2, j: o.j ?? 5, src: o.src, layers: o.layers ?? 3, late: o.late ?? 0, edge: o.edge ?? .3 }); }
  rwash(x, y, w, h, col, o = {}) { this.wash([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, o); }
  reserve(poly, o = {}) { this.items.push({ ty: 'reserve', poly, a: o.a ?? .95, late: o.late ?? 0 }); }
  hatch(x, y, w, h, gap = 10, ang = .9, o = {}) {   // diagonal hatching inside a rectangle
    const t = Math.tan(ang), seg2 = [];
    for (let k = -h * t; k < w; k += gap) { let x0 = x + k, y0 = y + h, x1 = x + k + h * t, y1 = y; if (x0 < x) { y0 = y + h - (x - x0) / t; x0 = x; } if (x1 > x + w) { y1 = y + (x1 - x - w) / t; x1 = x + w; } if (y0 > y1) seg2.push([x0, y0, x1, y1]); }
    for (const [a, b, c, d] of seg2) this.line(a, b, c, d, { w: o.w ?? 1.2, a: o.a ?? .7, over: 1, gap: 0, wob: .6 });
  }
  text(s, x, y, size, o = {}) { this.items.push({ ty: 'text', s, x, y, size, font: o.font ?? 'Caveat', weight: o.weight ?? 500, col: o.col, align: o.align, rot: o.rot }); }
  fn(f, o = {}) { this.items.push({ ty: 'fn', f, late: o.late ?? 0 }); }
  schedule(Tdraw) {   // ink and text in order, finishing by ~85% of Tdraw; washes bloom over the second half
    const cost = it => it.ty === 'ink' ? Math.max(30, it.st.L) : it.ty === 'text' ? it.s.length * 26 * it.size / 40 : 0;
    const total = this.items.reduce((a, it) => a + cost(it), 0) || 1; let acc = 0;
    const nw = this.items.filter(it => ['wash', 'reserve', 'fn'].includes(it.ty)).length || 1; let iw = 0;
    for (const it of this.items) {
      const c = cost(it);
      if (c) { it.t0 = acc / total * Tdraw * .8; it.d = Math.max(.06, c / total * Tdraw * 1.6); acc += c; }
      else { it.t0 = Tdraw * .4 + iw / nw * Tdraw * .55 + (it.late ?? 0); it.d = .8; iw++;
        if (it.poly) { let cx = 0, cy = 0; for (const p of it.poly) { cx += p[0]; cy += p[1]; } cx /= it.poly.length; cy /= it.poly.length; it.src = it.src ?? [cx, cy]; it.R = Math.max(...it.poly.map(p => Math.hypot(p[0] - it.src[0], p[1] - it.src[1]))) + 30; } }
    }
    this.end = Math.max(...this.items.map(it => (it.t0 ?? 0) + (it.d ?? 0))) + .05;
    return this;
  }
}

// ---------------------------------------------------------------- paper, tooth, the frayed page edge
const PAPERCV = mk(), PX = PAPERCV.getContext('2d'), TOOTH = document.createElement('canvas'), MASK = mk();
function makePaper() {
  PX.fillStyle = rgba(PAPER); PX.fillRect(0, 0, W, H);
  const sm = document.createElement('canvas'); sm.width = 240; sm.height = 135; const sx = sm.getContext('2d'), id = sx.createImageData(240, 135);
  for (let y = 0; y < 135; y++) for (let x = 0; x < 240; x++) { const v = fbm(x * .05, y * .05, 3, 4) * .7 + fbm(x * .2, y * .2, 9, 2) * .3, g = 255 - v * 26; const i = (y * 240 + x) * 4; id.data[i] = g; id.data[i + 1] = g - 2; id.data[i + 2] = g - 6; id.data[i + 3] = 255; }
  sx.putImageData(id, 0, 0); PX.save(); PX.globalCompositeOperation = 'multiply'; PX.imageSmoothingQuality = 'high'; PX.drawImage(sm, 0, 0, W, H); PX.restore();
  TOOTH.width = TOOTH.height = 256; const tx = TOOTH.getContext('2d'), td = tx.createImageData(256, 256), r = rng(5);
  for (let i = 0; i < 256 * 256; i++) { const g = 255 - Math.pow(r(), 3) * 40; td.data[i * 4] = td.data[i * 4 + 1] = td.data[i * 4 + 2] = g; td.data[i * 4 + 3] = 255; }
  tx.putImageData(td, 0, 0);
  const mx = MASK.getContext('2d');
  mx.fillStyle = '#000'; mx.beginPath(); const pg = rough([[46, 34], [1874, 34], [1874, 900], [46, 900]], 18, 4, 12, .006); pg.forEach(([x, y], i) => i ? mx.lineTo(x, y) : mx.moveTo(x, y)); mx.closePath(); mx.fill();
  mx.globalCompositeOperation = 'destination-out'; const rr = rng(9);
  for (let i = 0; i < 420; i++) { const side = i % 4, u = rr(); let x = side < 2 ? u * W : (side === 2 ? 46 + rr() * 60 : 1874 - rr() * 60), y = side >= 2 ? u * H : (side === 0 ? 34 + rr() * 50 : 900 - rr() * 60); mx.beginPath(); mx.ellipse(x, y, 4 + rr() * 16, 3 + rr() * 10, rr() * 3, 0, TAU); mx.fill(); }
}

// ---------------------------------------------------------------- props
function trinket(c, x, y, r, o = {}) {   // the orange trinket: a knotted cord, a ring, a tassel; always in colour, with a paper halo
  const p = o.p ?? 1, col = o.color ?? 1, b = T * 12 | 0;
  reserve(c, ellipse(x, y + r * .4, r * 2.1, r * 2.6, 24), .85, 3, 5);
  drawPen(c, penStroke([[x - r * .3, y - r * 3.2], [x, y - r * 2], [x, y - r]], { w: Math.max(1.2, r * .12), wob: .5, seed: 3 + b, over: 2 }), p);
  if (col > 0) { wash(c, ellipse(x, y, r, r, 20), ORANGE, { a: .95 * col, j: r * .12, layers: 3, edge: .45, seed: 7, dx: r * .08, dy: r * .05 }); for (let i = -2; i <= 2; i++) wash(c, [[x + i * r * .18 - r * .08, y + r * .85], [x + i * r * .18 + r * .08, y + r * .85], [x + i * r * .34 + r * .06, y + r * 2.5], [x + i * r * .34 - r * .06, y + r * 2.5]], ORANGE, { a: .8 * col, j: 1, layers: 2, edge: .2, seed: 11 + i }); }
  drawPen(c, penStroke([...ellipse(x, y, r, r, 20), ...ellipse(x, y, r, r, 20).slice(0, 2)], { w: Math.max(1.2, r * .1), wob: r * .04, seed: 5 + b, over: 2 }), p);
  drawPen(c, penStroke([...ellipse(x, y, r * .38, r * .38, 14), ...ellipse(x, y, r * .38, r * .38, 14).slice(0, 2)], { w: Math.max(1, r * .08), wob: .3, seed: 6 + b, over: 1 }), p);
  for (let i = -2; i <= 2; i++) drawPen(c, penStroke([[x + i * r * .18, y + r * .9], [x + i * r * .34, y + r * 2.5]], { w: Math.max(1, r * .06), wob: .4, seed: 20 + i + b, over: 1 }), p);
}
function person(c, look, pose, x, y, Sz, yaw, o = {}) {   // a sketched person, boiling at 12 fps; returns the head and hand anchors
  const prims = figure(look, pose, { x, y, S: Sz, yaw }, { seed: o.seed ?? (x | 0), boil: T * 12 | 0 });
  drawPrims(c, prims, { color: o.color ?? 1, ink: o.ink ?? 1 });
  const h = prims.head;
  if (o.helmet) sketchShape(c, [...ellipse(h.c[0], h.c[1] - h.r * .25, h.r * 1.25, h.r * 1.05, 18).filter(p => p[1] <= h.c[1] - h.r * .1)], o.helmetCol ?? hex('#4e5345'), { ink: Math.max(1.2, Sz * .005), wash: .7 * (o.color ?? 1), seed: 31 + (T * 12 | 0) });
  if (o.gas) { const fx = h.c[0] + (h.fwd?.[0] ?? 0) * h.r * .5; sketchShape(c, ellipse(fx, h.c[1] + h.r * .35, h.r * .62, h.r * .5, 14), hex('#3d3f3a'), { ink: Math.max(1.1, Sz * .0045), wash: .75 * (o.color ?? 1), seed: 33 + (T * 12 | 0) }); sketchShape(c, ellipse(fx, h.c[1] + h.r * .85, h.r * .3, h.r * .28, 10), hex('#2d2f2a'), { ink: Math.max(1, Sz * .004), wash: .8 * (o.color ?? 1), seed: 34 }); }
  if (o.tie && Sz > 200) { const tx = h.c[0], ty = h.c[1] + h.r * 1.6; sketchShape(c, [[tx - h.r * .12, ty], [tx + h.r * .12, ty], [tx + h.r * .16, ty + h.r * 1.7], [tx, ty + h.r * 2], [tx - h.r * .16, ty + h.r * 1.7]], hex('#3a2d4e'), { ink: Math.max(1, Sz * .004), wash: .7 * (o.color ?? 1), seed: 35 }); }
  if (o.trinket) { const sd = o.trinketSide ?? 1; trinket(c, h.c[0] + sd * h.r * 1.9, h.c[1] + h.r * 6.6, Math.max(5, h.r * .42)); }
  return prims;
}
function rifle(c, hand, dir, len, Sz) {   // a rifle held at the hand, pointing along dir (+1 right, -1 left)
  const [x, y] = hand, k = len / 100;
  const poly = [[x - dir * 30 * k, y - 4 * k], [x + dir * 70 * k, y - 5 * k], [x + dir * 70 * k, y + 1 * k], [x + dir * 10 * k, y + 3 * k], [x + dir * 6 * k, y + 14 * k], [x - dir * 2 * k, y + 14 * k], [x - dir * 4 * k, y + 4 * k], [x - dir * 30 * k, y + 6 * k]];
  sketchShape(c, poly, hex('#3a3a36'), { ink: Math.max(1.2, Sz * .005), wash: .75, seed: 41 + (T * 12 | 0) });
  return [x + dir * 72 * k, y - 2 * k];
}
function carrot(c, x, y, h, col, seed, o = {}) {   // a far figure: a wash blob, two leg lines and a head dot
  const b = T * 12 | 0;
  wash(c, ellipse(x, y - h * .62, h * .17, h * .3, 10), col, { a: .6 * (o.color ?? 1), j: 1.5, layers: 2, edge: .3, seed: seed + b });
  const ph = o.walk ?? 0;
  drawPen(c, penStroke([[x - h * .06, y - h * .34], [x - h * .08 + Math.sin(ph) * h * .07, y]], { w: Math.max(1, h * .035), wob: .3, seed: seed + 1 + b, over: 1 }), 1);
  drawPen(c, penStroke([[x + h * .06, y - h * .34], [x + h * .08 - Math.sin(ph) * h * .07, y]], { w: Math.max(1, h * .035), wob: .3, seed: seed + 2 + b, over: 1 }), 1);
  c.fillStyle = rgba(INK, .9); c.beginPath(); c.arc(x, y - h * .98, h * .085, 0, TAU); c.fill();
  if (o.helmet) { c.beginPath(); c.arc(x, y - h * 1.0, h * .11, Math.PI, 0); c.fill(); }
}
function car(c, x, y, len, col, dir, o = {}) {   // a sketched car, side view
  const k = len / 100, b = T * 12 | 0, m = ([u, v]) => [x + dir * u * k, y + v * k];
  const body = [[0, -10], [3, -22], [22, -25], [34, -38], [70, -39], [84, -26], [98, -23], [100, -10]].map(m);
  const p = o.p ?? 1, from = o.from ?? 0;
  if ((o.color ?? 1) > 0) wash(c, [...body, m([100, -8]), m([0, -8])], col, { a: .6 * (o.color ?? 1), j: 2, layers: 2, edge: .3, seed: 51 + (x | 0) % 7, dx: 2, dy: 1 });
  drawPen(c, penStroke([...body, m([100, -8]), m([0, -8]), body[0]], { w: Math.max(1.2, len * .007), wob: .8, seed: 52 + b, over: 3, smooth: false }), p, INK, 1, from);
  drawPen(c, penStroke([m([37, -35]), m([51, -35]), m([51, -25]), m([31, -25]), m([37, -35])], { w: 1.2, wob: .4, seed: 53 + b, over: 1, smooth: false }), p, INK, 1, from);
  drawPen(c, penStroke([m([54, -35]), m([68, -35]), m([79, -25]), m([54, -25]), m([54, -35])], { w: 1.2, wob: .4, seed: 54 + b, over: 1, smooth: false }), p, INK, 1, from);
  for (const u of [20, 80]) { const [wx, wy] = m([u, -8]); drawPen(c, penStroke([...ellipse(wx, wy, 8.5 * k, 8.5 * k, 16), ...ellipse(wx, wy, 8.5 * k, 8.5 * k, 16).slice(0, 2)], { w: Math.max(1.2, len * .008), wob: .4, seed: 55 + u + b, over: 1 }), p, INK, 1, from); if (p >= 1 && from <= 0) { c.fillStyle = rgba(INK, .85); c.beginPath(); c.arc(wx, wy, 3.4 * k, 0, TAU); c.fill(); } }
}
function arrowInk(c, pts, col = INK, p = 1, w = 2.4, seed = 1) {
  drawPen(c, penStroke(pts, { w, wob: .8, seed, over: 2 }), p, col);
  if (p >= .98) { const [a, b2] = [pts[pts.length - 2], pts[pts.length - 1]], an = Math.atan2(b2[1] - a[1], b2[0] - a[0]); for (const s of [-1, 1]) drawPen(c, penStroke([b2, [b2[0] - Math.cos(an + s * .5) * 22, b2[1] - Math.sin(an + s * .5) * 22]], { w, wob: .3, seed: seed + 3 + s, over: 1 }), 1, col); }
}
const PARTS = [   // the nine parts of the Algorithm: generic machine parts, as polygons
  (x, y, r) => [...Array(24)].map((_, i) => { const a = i / 24 * TAU, rr = i % 2 ? r : r * .82; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; }),
  (x, y, r) => [[x - r * .45, y - r], [x + r * .45, y - r], [x + r * .45, y + r], [x - r * .45, y + r]],
  (x, y, r) => [...Array(6)].map((_, i) => [x + Math.cos(i / 6 * TAU) * r, y + Math.sin(i / 6 * TAU) * r]),
  (x, y, r) => ellipse(x, y, r, r * .9, 20),
  (x, y, r) => [[x - r * .9, y + r * .7], [x + r * .9, y + r * .7], [x + r * .3, y - r], [x - r * .3, y - r]],
  (x, y, r) => [[x - r * .3, y - r], [x + r * .3, y - r], [x + r * .3, y - r * .3], [x + r, y - r * .3], [x + r, y + r * .3], [x + r * .3, y + r * .3], [x + r * .3, y + r], [x - r * .3, y + r], [x - r * .3, y + r * .3], [x - r, y + r * .3], [x - r, y - r * .3], [x - r * .3, y - r * .3]],
  (x, y, r) => [[x - r, y - r * .5], [x + r, y - r * .5], [x + r, y + r * .5], [x - r, y + r * .5]],
  (x, y, r) => [[x, y - r], [x + r * .75, y - r * .2], [x + r * .45, y + r], [x - r * .45, y + r], [x - r * .75, y - r * .2]],
  (x, y, r) => [...Array(13)].map((_, i) => { const a = Math.PI + i / 12 * Math.PI; return [x + Math.cos(a) * r, y + Math.sin(a) * r * .9 + r * .4]; }).concat([[x + r * .6, y + r * .4], [x - r * .6, y + r * .4]]),
];
function partsRing(c, cx, cy, R, sc, rot = 0, col = 1, ry = 1) { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rot; sketchShape(c, PARTS[i](cx + Math.cos(a) * R, cy + Math.sin(a) * R * ry, sc), C.steel, { ink: 1.4, wash: .55 * col, seed: 60 + i + (T * 12 | 0) }); } }

// ---------------------------------------------------------------- the pages (static ink + wash) and what moves on them
const PG = {
  title: () => { const P = new Page(1, 'notebook · no. 1');
    P.text('TENET', 120, 250, 150, { weight: 700 }); P.text('a sketchbook, kept backwards and forwards', 126, 330, 44);
    const cx = 1240, cy = 480, R = 270; P.circle(cx, cy, R, { w: 3 }); P.circle(cx, cy, R - 16, { w: 1.4, a: .6 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; P.line(cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30), cx + Math.cos(a) * (R - (i % 3 ? 48 : 70)), cy + Math.sin(a) * (R - (i % 3 ? 48 : 70)), { w: i % 3 ? 1.6 : 3 }); }
    for (const [s, a] of [['12', -Math.PI / 2], ['3', 0], ['6', Math.PI / 2], ['9', Math.PI]]) P.text(s, cx + Math.cos(a) * (R - 110) - 14, cy + Math.sin(a) * (R - 110) + 16, 48);
    P.wash(ellipse(cx, cy, R, R, 40), C.slate, { a: .28 });
    for (const [x, s] of [[230, 1], [520, -1]]) { P.shape([[x - 26, 820], [x - 26, 540], [x, 480], [x + 26, 540], [x + 26, 820]], { w: 2 }); P.line(x - 26, 820, x - 50, 860); P.line(x + 26, 820, x + 50, 860); P.wash([[x - 26, 820], [x - 26, 540], [x, 480], [x + 26, 540], [x + 26, 820]], C.olive, { a: .3 }); }
    P.text('no nukes', 270, 900, 40, { rot: -.04 }); return P; },
  operaOut: () => { const P = new Page(2, 'Kyiv · the opera house · night');
    P.rwash(46, 34, 1828, 730, C.night, { a: .5, src: [960, 80] });
    P.reserve([[180, 760], [160, 760], [600, 40], [700, 40]], { late: .2 }); P.reserve([[1700, 760], [1720, 760], [1240, 40], [1150, 40]], { late: .25 });
    P.line(60, 760, 1860, 760, { w: 2.6 });
    P.rect(470, 430, 980, 330, { w: 2.6 }); P.shape([[700, 430], [960, 300], [1220, 430]], { w: 2.4 }); P.line(520, 470, 1400, 470, { w: 1.6 });
    for (let i = 0; i < 8; i++) { const x = 560 + i * 114; P.line(x - 14, 480, x - 14, 740, { w: 1.6 }); P.line(x + 14, 480, x + 14, 740, { w: 1.6 }); P.line(x - 22, 480, x + 22, 480, { w: 2 }); }
    for (let i = 0; i < 7; i++) { const x = 617 + i * 114; P.ink([[x - 26, 740], [x - 26, 620], [x - 14, 596], [x, 590], [x + 14, 596], [x + 26, 620], [x + 26, 740]], { w: 1.4, a: .8 }); P.wash([[x - 26, 740], [x - 26, 620], [x, 590], [x + 26, 620], [x + 26, 740]], C.lamp, { a: .5 }); }
    for (const x of [540, 1380]) { P.ink([[x, 430], [x, 404], [x - 8, 392], [x + 8, 380], [x, 368]], { w: 1.8 }); P.line(x - 14, 392, x + 14, 384, { w: 1.4 }); }
    for (let k = 0; k < 4; k++) P.line(440 - k * 18, 770 + k * 14, 1480 + k * 18, 770 + k * 14, { w: 1.3, a: .7 });
    for (const x of [300, 1620]) { P.line(x, 870, x, 600, { w: 2.2 }); P.ink([[x - 16, 600], [x - 20, 578], [x, 566], [x + 20, 578], [x + 16, 600]], { w: 1.6 }); P.wash(ellipse(x, 590, 60, 60, 18), C.lamp, { a: .35 }); }
    P.wash([[470, 430], [1450, 430], [1450, 760], [470, 760]], C.stone, { a: .32 }); P.wash([[700, 430], [960, 300], [1220, 430]], C.stone, { a: .3 });
    P.hatch(1300, 480, 140, 260, 9, .9, { a: .5 });
    return P; },
  operaIn: () => { const P = new Page(3, 'inside · the siege');
    P.rwash(46, 34, 1828, 860, C.violet, { a: .4 });
    P.ink([[620, 760], [620, 300], [700, 200], [960, 160], [1220, 200], [1300, 300], [1300, 760]], { w: 3 });
    for (let i = 0; i < 14; i++) { const x = 650 + i * 46; P.ink([[x, 230 + Math.abs(i - 6.5) * 6], [x + 6, 480], [x - 4, 760]], { w: 1.2, a: .75 }); }
    P.wash([[640, 760], [640, 300], [960, 180], [1280, 300], [1280, 760]], C.maroon, { a: .45 });
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const y = 260 + k * 150, x0 = s < 0 ? 60 : 1860, x1 = s < 0 ? 560 : 1360; P.ink([[x0, y], [lerp(x0, x1, .5), y + 30], [x1, y + 22]], { w: 2.4 }); P.ink([[x0, y + 26], [lerp(x0, x1, .5), y + 56], [x1, y + 48]], { w: 1.4, a: .7 }); P.wash([[x0, y], [x1, y + 22], [x1, y + 48], [x0, y + 26]], C.stone, { a: .45 }); }
    P.wash(ellipse(960, 110, 150, 60, 20), C.lamp, { a: .35 }); for (let i = 0; i < 9; i++) P.line(890 + i * 18, 90, 892 + i * 18, 130, { w: 1, a: .8 });
    P.line(60, 820, 1860, 820, { w: 2 });
    return P; },
  bullet: () => { const P = new Page(4, 'the bullet came back');
    P.rwash(1120, 60, 740, 800, C.brick, { a: .4, src: [1460, 440] });
    for (let r = 0; r < 13; r++) { const y = 80 + r * 60; P.line(1120, y, 1860, y, { w: 1.2, a: .7 }); for (let i = 0; i < 7; i++) P.line(1140 + i * 110 + (r % 2) * 55, y, 1140 + i * 110 + (r % 2) * 55, y + 60, { w: 1, a: .6 }); }
    return P; },
  loyalty: () => { const P = new Page(5, 'a rail yard · the test');
    const VY = 430; P.rwash(46, 34, 1828, VY - 34, C.night, { a: .45, src: [960, 60] }); P.rwash(46, VY, 1828, 470, C.slate, { a: .3 });
    P.line(60, VY, 1860, VY, { w: 1.6 });
    for (const s of [-1, 1]) P.line(960 + s * 8, VY, 960 + s * 330, 900, { w: 2.6 });
    for (let i = 1; i < 16; i++) { const q = Math.pow(i / 16, 1.8), y = VY + 470 * q, w = 18 + 760 * q; P.line(960 - w / 2, y, 960 + w / 2, y, { w: 1.2 + q * 2, a: .85 }); }
    for (const [x, h] of [[760, 180], [1180, 230]]) { P.line(x, VY + 10, x, VY - h, { w: 2 }); P.rect(x - 14, VY - h - 46, 28, 46, { w: 1.6 }); P.wash(ellipse(x, VY - h - 30, 9, 9, 10), C.lamp, { a: .6 }); }
    P.circle(1500, 340, 190, { w: 2.6 }); P.text('the loyalty test', 1360, 600, 50);
    P.ink([[1390, 400], [1360, 340], [1400, 290], [1610, 270], [1640, 330], [1600, 380], [1390, 400]], { w: 2.4 }); P.line(1500, 280, 1505, 390, { w: 1.6 });
    P.wash([[1390, 400], [1360, 340], [1400, 290], [1500, 280], [1505, 390]], C.ochre, { a: .45 });
    P.ink([[1330, 430], [700, 640]], { w: 1.4, a: .7 });
    return P; },
  recruit: () => { const P = new Page(6, 'at sea · recruited');
    const HZ = 560; P.rwash(46, 34, 1828, HZ - 34, C.sky, { a: .3, src: [1500, HZ] }); P.rwash(46, HZ, 1828, 340, C.sea, { a: .4 });
    P.line(60, HZ, 1860, HZ, { w: 1.8 }); P.circle(1500, HZ - 30, 70, { w: 1.8 }); P.wash(ellipse(1500, HZ - 30, 70, 70, 20), C.sand, { a: .35 });
    for (const [x, h] of [[240, 150], [420, 110], [620, 80], [1100, 120]]) { P.line(x, HZ, x, HZ - h, { w: 1.8 }); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 - .4; P.line(x, HZ - h, x + Math.cos(a) * h * .5, HZ - h + Math.sin(a) * h * .5, { w: 1.2 }); } }
    const r = rng(6); for (let i = 0; i < 40; i++) { const y = HZ + 20 + r() * 300, x = 80 + r() * 1700; P.line(x, y, x + 30 + r() * 60, y, { w: 1, a: .6, over: 1, gap: 0 }); }
    P.line(60, 790, 1860, 790, { w: 3 }); for (let x = 90; x < 1860; x += 110) P.line(x, 790, x, 880, { w: 2 }); P.line(60, 880, 1860, 880, { w: 2 });
    return P; },
  lab: () => { const P = new Page(7, 'the lab · inversion explained');
    P.rwash(46, 34, 1828, 860, C.sage, { a: .25 });
    for (let s = 0; s < 3; s++) { const y = 240 + s * 140; P.line(80, y, 470, y, { w: 2.2 }); const rr = rng(s + 40); let x = 92; while (x < 450) { const w = 36 + rr() * 46, h = 46 + rr() * 60, inv = rr() < .3; P.rect(x, y - h, w, h, { w: 1.4 }); P.rwash(x, y - h, w, h, inv ? ROSE : C.stone, { a: inv ? .5 : .35 }); x += w + 10; } }
    P.rect(1140, 150, 620, 360, { w: 2.6 }); P.rwash(1140, 150, 620, 360, C.slate, { a: .5 });
    P.text('entropy', 1360, 230, 60); P.text('forward', 1250, 320, 40); P.text('inverted', 1250, 450, 40, { col: mix3(ROSE, INK, .35) });
    P.ink([[1240, 340], [1660, 340]], { w: 2.6 }); P.line(1660, 340, 1636, 326, { w: 2.6 }); P.line(1660, 340, 1636, 354, { w: 2.6 });
    P.ink([[1660, 470], [1240, 470]], { w: 2.6, col: mix3(ROSE, INK, .35) }); P.line(1240, 470, 1264, 456, { w: 2.6, col: mix3(ROSE, INK, .35) }); P.line(1240, 470, 1264, 484, { w: 2.6, col: mix3(ROSE, INK, .35) });
    P.line(880, 40, 880, 120, { w: 1.4 }); P.shape([[840, 150], [920, 150], [900, 118], [860, 118]], { w: 2 }); P.reserve([[846, 152], [914, 152], [1120, 700], [640, 700]], { late: .1 });
    P.rect(560, 230, 320, 280, { w: 1.6 }); P.rwash(560, 230, 320, 280, C.steel, { a: .35 }); const r = rng(70); for (let i = 0; i < 8; i++) { const x = 590 + r() * 260, y = 260 + r() * 220; P.circle(x, y, 8, { w: 1.2 }); P.wash(ellipse(x, y, 8, 8, 10), ROSE, { a: .7 }); }
    P.line(420, 700, 1500, 700, { w: 3 }); P.line(420, 712, 1500, 712, { w: 1.2 }); for (const x of [450, 1470]) P.line(x, 712, x, 900, { w: 2.4 });
    for (let i = 0; i < 5; i++) { const x = 560 + i * 70; P.shape([[x, 692], [x + 34, 692], [x + 44, 686], [x + 34, 680], [x, 680]], { w: 1.4 }); }
    return P; },
  sator: () => { const P = new Page(8, 'the coast · Andrei Sator');
    const HZ = 520; P.rwash(46, 34, 1828, HZ - 34, C.sky, { a: .35 }); P.rwash(46, HZ, 1828, 250, C.sea, { a: .45 });
    P.line(60, HZ, 1860, HZ, { w: 1.6 });
    const mx = 300; P.line(mx - 70, 770, mx, 120, { w: 2.2 }); P.line(mx + 70, 770, mx, 120, { w: 2.2 }); for (let y = 160; y < 770; y += 52) { const w = (y - 120) / 650 * 70; P.line(mx - w, y, mx + w * 1.08, y + 52, { w: 1.1, a: .8 }); P.line(mx + w, y, mx - w * 1.08, y + 52, { w: 1.1, a: .8 }); }
    P.ink([[60, 770], [1860, 770]], { w: 3 }); for (let x = 70; x < 1860; x += 60) P.ink([[x, 770], [x - 4, 860]], { w: 1.6 }); P.rwash(46, 770, 1828, 120, C.stone, { a: .4 });
    P.rect(420, 640, 340, 130, { w: 2.2 }); P.line(420, 640, 760, 770, { w: 1.4 }); P.rwash(420, 640, 340, 130, C.brick, { a: .35 });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) { const bx = 450 + row * 40 + i * 76, by = 640 - row * 36; const pts = [[bx, by], [bx + 70, by], [bx + 60, by - 32], [bx + 10, by - 32]]; P.shape(pts, { w: 1.6 }); P.wash(pts, mix3(C.ochre, ROSE, .55), { a: .7 }); }
    P.text('inverted gold', 470, 520, 46, { rot: -.05 }); P.text('A. Sator', 1460, 200, 64);
    return P; },
  parts: () => { const P = new Page(9, 'study · the Algorithm');
    P.text('the Algorithm', 120, 170, 80, { weight: 700 }); P.text('nine parts · one device', 126, 236, 44);
    for (let i = 0; i < 9; i++) { const x = 620 + (i % 3) * 400, y = 230 + Math.floor(i / 3) * 250, poly = PARTS[i](x, y, 70); P.shape(poly, { w: 2.2 }); P.wash(poly, C.steel, { a: .45 }); P.text(String(i + 1), x - 130, y - 50, 48); }
    return P; },
  planet: () => { const P = new Page(10, 'the whole planet');
    const cx = 960, cy = 460, R = 330; P.circle(cx, cy, R, { w: 3 });
    for (let i = -2; i <= 2; i++) P.ink(ellipse(cx, cy + i * R / 3, Math.sqrt(R * R - (i * R / 3) ** 2), 10, 30).concat([ellipse(cx, cy + i * R / 3, Math.sqrt(R * R - (i * R / 3) ** 2), 10, 30)[0]]), { w: 1, a: .6 });
    for (const k of [.35, .75]) P.ink(ellipse(cx, cy, R * k, R, 30).concat([ellipse(cx, cy, R * k, R, 30)[0]]), { w: 1, a: .6 });
    P.wash(ellipse(cx, cy, R, R, 40), C.sea, { a: .4 });
    for (const [x, y, rx, ry] of [[860, 360, 120, 80], [1080, 520, 140, 100], [900, 620, 80, 60]]) { const pol = rough(ellipse(x, y, rx, ry, 18), 18, x, 10, .02); P.shape(pol, { w: 1.6 }); P.wash(pol, C.sage, { a: .5 }); }
    P.text('inverting the planet', 1340, 820, 50); P.text('wiping out the past', 1340, 870, 40);
    return P; },
  team: () => { const P = new Page(11, 'London · the team');
    P.rwash(46, 34, 1828, 500, C.sky, { a: .28 });
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const x0 = s < 0 ? 60 + i * 150 : 1860 - i * 150 - 140, h = 420 - i * 50; P.rect(x0, 620 - h, 140, h, { w: 1.8 }); P.rwash(x0, 620 - h, 140, h, i % 2 ? C.brick : C.stone, { a: .35 }); for (let k = 0; k < 4; k++) P.line(x0 + 30, 620 - h + 40 + k * 70, x0 + 50, 620 - h + 40 + k * 70, { w: 1.6 }); }
    P.line(60, 620, 1860, 620, { w: 2 }); P.line(60, 640, 1860, 640, { w: 1.2, a: .7 }); P.rwash(46, 640, 1828, 260, C.asphalt, { a: .3 });
    for (const x of [140, 1780]) { P.line(x, 800, x, 470, { w: 2 }); P.wash(ellipse(x + 20, 470, 40, 40, 14), C.lamp, { a: .4 }); P.ink([[x, 480], [x + 20, 462], [x + 40, 470]], { w: 1.6 }); }
    return P; },
  freeport: () => { const P = new Page(12, 'Oslo · the freeport');
    P.rwash(46, 34, 1828, 680, C.night, { a: .45 }); P.line(60, 700, 1860, 700, { w: 2 }); P.rwash(46, 700, 1828, 200, C.asphalt, { a: .4 });
    for (let i = 0; i < 10; i++) P.line(80 + i * 130, 790, 140 + i * 130, 790, { w: 3 });
    P.rect(1340, 300, 520, 400, { w: 2.6 }); for (let i = 0; i < 16; i++) P.line(1370 + i * 30, 340, 1370 + i * 30, 680, { w: 1.1, a: .8 }); P.rwash(1340, 300, 520, 400, C.steel, { a: .45 }); P.text('FREEPORT', 1480, 280, 56, { weight: 700 });
    return P; },
  highway: () => { const P = new Page(13, 'Tallinn · the highway');
    P.rwash(46, 34, 1828, 360, C.sky, { a: .3 });
    for (let i = 0; i < 9; i++) { const x = 70 + i * 205, h = 80 + (i * 37 % 90); P.rect(x, 360 - h, 170, h, { w: 1.4 }); P.rwash(x, 360 - h, 170, h, C.slate, { a: .25 }); }
    P.line(300, 400, 300, 150, { w: 2.4 }); P.line(1180, 400, 1180, 150, { w: 2.4 }); P.line(290, 160, 1190, 160, { w: 2.4 }); P.rect(420, 170, 640, 120, { w: 2.6 }); P.rwash(420, 170, 640, 120, C.sage, { a: .55 }); P.text('TALLINN →', 520, 260, 78, { weight: 700 });
    P.line(60, 400, 1860, 400, { w: 2.6 }); P.rwash(46, 400, 1828, 500, C.asphalt, { a: .35 }); P.line(60, 880, 1860, 880, { w: 2.6 });
    for (const y of [560, 720]) for (let x = 80; x < 1860; x += 170) P.line(x, y, x + 80, y, { w: 3, a: .8 });
    return P; },
  kat: () => { const P = new Page(14, 'a warehouse · the last piece');
    P.rwash(46, 34, 1828, 860, C.slate, { a: .3 });
    for (let i = 0; i < 5; i++) { P.rect(120 + i * 340, 100, 260, 340, { w: 1.6 }); P.line(250 + i * 340, 100, 250 + i * 340, 440, { w: 1.2 }); P.line(120 + i * 340, 270, 380 + i * 340, 270, { w: 1.2 }); P.reserve([[120 + i * 340, 100], [380 + i * 340, 100], [380 + i * 340, 440], [120 + i * 340, 440]]); }
    P.line(60, 760, 1860, 760, { w: 2 }); for (let x = 60; x < 1860; x += 140) P.line(x, 760, x - 90, 900, { w: 1.2, a: .7 });
    P.rect(870, 330, 180, 430, { w: 2.2 }); P.line(890, 370, 950, 450, { w: 1, a: .6 }); P.line(910, 370, 990, 470, { w: 1, a: .6 });
    return P; },
  turnstile: () => { const P = new Page(15, 'the turnstile');
    P.rwash(46, 34, 914, 860, C.slate, { a: .35 }); P.rwash(960, 34, 914, 860, ROSE, { a: .35 });
    P.line(960, 60, 960, 880, { w: 2.4 }); P.circle(960, 470, 300, { w: 3 });
    P.text('forward', 200, 170, 64); P.text('inverted', 1560, 170, 64, { col: mix3(ROSE, INK, .35) });
    for (const x of [120, 1640]) { P.circle(x + 80, 330, 40, { w: 1.6 }); P.line(x + 80, 330, x + 100, 306, { w: 1.4 }); }
    P.line(60, 800, 1860, 800, { w: 2 });
    return P; },
  yacht: () => { const P = new Page(16, 'Vietnam · the yacht');
    const HZ = 560; P.rwash(46, 34, 1828, HZ - 34, C.dusk, { a: .4, src: [1300, HZ] }); P.rwash(46, HZ, 1828, 330, C.sea, { a: .35 }); P.wash(ellipse(1300, HZ - 30, 80, 80, 20), C.ochre, { a: .45 });
    for (const [x0, s] of [[80, 1], [1500, 2]]) { const r = rng(s); let x = x0; for (let i = 0; i < 4; i++) { const w = 70 + r() * 80, h = 120 + r() * 160, pol = [[x, HZ], [x + w * .15, HZ - h * .8], [x + w * .35, HZ - h], [x + w * .65, HZ - h * .9], [x + w * .9, HZ - h * .55], [x + w, HZ]]; P.shape(pol, { w: 1.6 }); P.wash(pol, C.sage, { a: .45 }); x += w * .85; } }
    P.line(60, HZ, 1860, HZ, { w: 1.6 });
    const L = (u, v) => [380 + u * 1.15, 690 + v * 1.15];
    P.shape([L(0, -20), L(40, -60), L(880, -64), L(960, -44), L(1000, -20), L(960, 30), L(60, 30)], { w: 2.6 });
    for (let d = 0; d < 3; d++) { const y0 = -64 - d * 50, x0 = 120 + d * 90, x1 = 860 - d * 110; P.shape([L(x0, y0), L(x1, y0), L(x1 + 30, y0 - 46), L(x0 + 20, y0 - 46)], { w: 2 }); P.line(...L(x0 + 30, y0 - 22), ...L(x1, y0 - 22), { w: 3, a: .85 }); }
    P.line(...L(520, -214), ...L(520, -300), { w: 2 }); P.line(...L(480, -280), ...L(560, -280), { w: 1.6 });
    const r = rng(16); for (let i = 0; i < 30; i++) { const y = HZ + 140 + r() * 180, x = 80 + r() * 1700; P.line(x, y, x + 40 + r() * 60, y, { w: 1, a: .6, over: 1, gap: 0 }); }
    P.circle(1620, 250, 150, { w: 2.4 }); P.text("a dead-man's switch", 1490, 460, 44);
    return P; },
  stalsk: () => { const P = new Page(17, 'Stalsk-12 · a Soviet-era blast site');
    const GY = 480; P.rwash(46, 34, 1828, GY - 34, C.sand, { a: .3 });
    const r = rng(17); let x = 70; while (x < 1840) { const w = 110 + r() * 110, h = 100 + r() * 180, top = [[x, GY - h], [x + w * .3, GY - h + r() * 50], [x + w * .6, GY - h - r() * 20], [x + w, GY - h + r() * 60]]; P.ink([[x, GY], ...top, [x + w, GY]], { w: 1.8, smooth: false }); for (let k = 0; k < 5; k++) P.line(x + 20 + (k % 3) * 30, GY - h + 40 + Math.floor(k / 3) * 50, x + 34 + (k % 3) * 30, GY - h + 40 + Math.floor(k / 3) * 50, { w: 1.6 }); P.wash([[x, GY], ...top, [x + w, GY]], C.stone, { a: .35 }); x += w + 20 + r() * 40; }
    P.line(60, GY, 1860, GY, { w: 2.4 }); P.rwash(46, GY, 1828, 420, C.sand, { a: .35 });
    for (let i = 0; i < 6; i++) P.line(200, GY + 70 + i * 60, 1720, GY + 70 + i * 60, { w: 1, a: .5 });
    P.line(870, GY, 870, 890, { w: 3 }); P.line(1050, GY, 1050, 890, { w: 3 }); for (let y = GY + 30; y < 880; y += 40) P.line(870, y, 1050, y, { w: 1.4, a: .8 }); P.reserve([[872, GY], [1048, GY], [1048, 900], [872, 900]]);
    P.rect(900, GY - 110, 120, 110, { w: 2.4 }); P.rwash(900, GY - 110, 120, 110, C.olive, { a: .6 }); P.rwash(900, GY - 70, 120, 20, C.ochre, { a: .6 });
    P.text('the Algorithm', 1100, 820, 46); P.text('buried forever?', 1080, GY - 40, 40);
    return P; },
  pincer: () => { const P = new Page(18, 'Stalsk-12 · the pincer');
    P.rwash(46, 34, 1828, 500, C.sand, { a: .25 }); P.ink([[60, 520], [400, 440], [800, 500], [1200, 430], [1600, 490], [1860, 450]], { w: 1.8 });
    const r = rng(18); let x = 70; while (x < 1840) { const w = 90 + r() * 90, h = 60 + r() * 110; P.ink([[x, 540], [x, 540 - h], [x + w * .5, 540 - h + r() * 40], [x + w, 540 - h + 10], [x + w, 540]], { w: 1.4, smooth: false, a: .8 }); x += w + 30; }
    P.line(60, 560, 1860, 560, { w: 2.2 }); P.rwash(46, 560, 1828, 340, C.sand, { a: .3 });
    P.text('forward', 120, 180, 60); P.text('inverted', 1580, 180, 60, { col: mix3(ROSE, INK, .35) });
    return P; },
  pull: () => { const P = new Page(19, 'meanwhile');
    P.line(960, 60, 960, 880, { w: 2.4 });
    P.rwash(46, 34, 900, 860, C.sand, { a: .3 }); P.line(300, 260, 300, 890, { w: 3 }); P.line(620, 260, 620, 890, { w: 3 }); for (let y = 290; y < 880; y += 40) P.line(300, y, 620, y, { w: 1.2, a: .7 }); P.reserve([[302, 260], [618, 260], [618, 900], [302, 900]]);
    P.ink([[300, 120], [460, 40], [620, 120]], { w: 2.6 }); P.line(460, 40, 460, 260, { w: 2.6 }); P.line(60, 260, 900, 260, { w: 2 });
    P.rwash(990, 34, 884, 560, C.dusk, { a: .4 }); P.rwash(990, 594, 884, 300, C.sea, { a: .35 }); P.wash(ellipse(1500, 560, 70, 70, 18), C.ochre, { a: .45 });
    P.line(990, 640, 1860, 640, { w: 3 }); for (let x = 1010; x < 1860; x += 60) P.line(x, 640, x, 720, { w: 1.6 }); P.line(990, 720, 1860, 720, { w: 2 });
    P.text('meanwhile, on the yacht', 1010, 130, 50);
    return P; },
  sacrifice: () => { const P = new Page(20, 'the tunnel · the gate');
    P.rwash(46, 34, 1828, 860, C.slate, { a: .4 });
    for (let i = 0; i < 6; i++) { const k = 1 - i * .13; P.ink([[960 - 760 * k, 900], [960 - 760 * k, 900 - 700 * k], [960 - 500 * k, 900 - 900 * k], [960, 900 - 960 * k], [960 + 500 * k, 900 - 900 * k], [960 + 760 * k, 900 - 700 * k], [960 + 760 * k, 900]], { w: 2.2 - i * .2, a: .9 - i * .08 }); }
    for (let i = 0; i < 8; i++) P.line(860 + i * 30, 360, 860 + i * 30, 760, { w: 2.6 }); P.line(840, 360, 1100, 360, { w: 2.4 }); P.line(840, 560, 1100, 560, { w: 2.4 });
    P.line(60, 800, 1860, 800, { w: 2 });
    return P; },
  trinketPage: () => { const P = new Page(21, "Neil's bag");
    P.rwash(46, 34, 1828, 860, C.sage, { a: .18 });
    P.ink([[1000, 160], [1620, 150], [1660, 860], [960, 870], [1000, 160]], { w: 3, smooth: false }); P.wash([[1000, 160], [1620, 150], [1660, 860], [960, 870]], C.olive, { a: .45 });
    P.ink([[1010, 380], [1640, 370]], { w: 2 }); for (let i = 0; i < 60; i++) P.line(1020 + i * 10, 372, 1020 + i * 10, 388, { w: 1, a: .7, over: 0, gap: 0 });
    P.ink([[1060, 150], [1020, 40]], { w: 3 }); P.ink([[1560, 150], [1600, 40]], { w: 3 });
    P.ink([[1050, 560], [1600, 552], [1620, 840], [1030, 850], [1050, 560]], { w: 2, smooth: false }); P.reserve(ellipse(1320, 470, 110, 130, 24), { late: .2 });
    return P; },
  farewell: () => { const P = new Page(22, 'dawn · the edge of the site');
    const GY = 600; P.rwash(46, 34, 1828, GY - 34, C.dusk, { a: .3, src: [1500, GY] }); P.wash(ellipse(1500, GY - 20, 80, 80, 18), C.ochre, { a: .45 });
    const r = rng(22); let x = 70; while (x < 1700) { const w = 100 + r() * 100, h = 80 + r() * 140; P.ink([[x, GY], [x, GY - h], [x + w * .4, GY - h + r() * 40], [x + w, GY - h + 20], [x + w, GY]], { w: 1.4, smooth: false, a: .85 }); P.wash([[x, GY], [x, GY - h], [x + w, GY - h + 20], [x + w, GY]], C.stone, { a: .3 }); x += w + 40; }
    P.line(60, GY, 1860, GY, { w: 2.2 }); P.rwash(46, GY, 1700, 300, C.sand, { a: .28 });
    return P; },
  founder: () => { const P = new Page(23, 'the last page');
    P.line(960, 60, 960, 890, { w: 1.4, a: .5 });
    P.text('THE FOUNDER', 1040, 200, 110, { weight: 700 }); P.text('of Tenet', 1046, 270, 54);
    const cx = 1380, cy = 590, R = 210;
    P.ink(ellipse(cx, cy, R, R, 30).filter((_, i) => i >= 15).concat([ellipse(cx, cy, R, R, 30)[0]]), { w: 2.6 });
    P.ink(ellipse(cx, cy, R, R, 30).filter((_, i) => i <= 15), { w: 2.6, col: mix3(ROSE, INK, .35) });
    for (const [s, a] of [['Kyiv', Math.PI * 1.15], ['Oslo', Math.PI * 1.4], ['Tallinn', Math.PI * 1.7], ['turnstile', Math.PI * .1], ['Stalsk-12', Math.PI * .45], ['the yacht', Math.PI * .8]]) { const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; P.circle(x, y, 9, { w: 2 }); P.text(s, x + Math.cos(a) * 40 - 40, y + Math.sin(a) * 40 + 12, 38); }
    return P; },
};
// what moves on each page (world coordinates, drawn every frame)
const DY = {
  title: (c, t, u) => { const cx = 1240, cy = 480, b = T * 12 | 0, ah = 2 - t * .35, am = -t * 2.5 - .6;
    for (const [a, l, w] of [[ah, 140, 6], [am, 210, 3.4]]) drawPen(c, penStroke([[cx, cy], [cx + Math.cos(a) * l, cy + Math.sin(a) * l]], { w, wob: .8, seed: 70 + b, over: 2 }), clamp(t / 1.2));
    for (let i = 0; i < 2; i++) { const a0 = -.6 + i * Math.PI - t * .7; arrowInk(c, [...Array(10)].map((_, k) => { const a = a0 + .9 - k * .1; return [cx + Math.cos(a) * (310), cy + Math.sin(a) * 310]; }), mix3(ROSE, INK, .2), clamp(t - .8), 3, 80 + i); }
    const k2 = seg(T, Lt(1, .5), .6); for (const x of [230, 520]) { if (k2 > 0) { drawPen(c, penStroke([[x - 70, 520], [x + 70, 820]], { w: 5, wob: 1.5, seed: x + b, over: 6 }), k2, mix3(ROSE, INK, .2)); drawPen(c, penStroke([[x + 70, 520], [x - 70, 820]], { w: 5, wob: 1.5, seed: x + 1 + b, over: 6 }), k2, mix3(ROSE, INK, .2)); } } },
  operaOut: (c, t, u) => { for (let i = 4; i >= 0; i--) { const x = 560 + i * 150 + t * 18, ph = t * 6.2 + i * 1.7; const hd = person(c, LK.protTac, walk(ph), x, 900 - i * 6, 300 - i * 12, Math.PI * .55, { helmet: true, seed: 100 + i }); if (i === 0 && u > .3) handwrite(c, 'the Protagonist', hd.head.c[0] - 80, hd.head.c[1] - 60, 40, seg(u, .3, .2)); } },
  operaIn: (c, t, u) => {
    for (let i = 0; i < 2; i++) for (let k = 0; k < 14; k++) carrot(c, (i ? 1440 : 80) + k * 30, 250 + (k % 3) * 150 + 14, 30, C.violet, 200 + i * 20 + k);
    const p1 = person(c, LK.protTac, stand({ handR: V(.06, .8, .5), handL: V(-.02, .78, .34), elbR: V(1, -.3, 0), elbL: V(-1, -.3, 0) }), 700, 860, 380, Math.PI * .5, { helmet: true, seed: 210 }); rifle(c, p1.hand.R, 1, 120, 380);
    const p2 = person(c, LK.guard, stand({ handR: V(.06, .8, .5), handL: V(-.02, .78, .34), elbR: V(1, -.3, 0), elbL: V(-1, -.3, 0) }), 1220, 840, 330, -Math.PI * .5, { seed: 211 }); rifle(c, p2.hand.R, -1, 110, 330);
    const mx = lerp(2100, 1620, ss(seg(t, 0, 1.6)));
    const m = person(c, LK.soldier, stand({ handR: V(.06, .8, .5), handL: V(-.02, .78, .34), elbR: V(1, -.3, 0), elbL: V(-1, -.3, 0) }), mx, 1000, 640, -Math.PI * .5, { helmet: true, gas: true, trinket: true, trinketSide: 1, seed: 212 }); rifle(c, m.hand.R, -1, 200, 640);
    if (u > .4) handwrite(c, 'the masked soldier', mx - 200, 240, 46, seg(u, .4, .2));
    if (u > .55) { handwrite(c, 'an orange trinket', mx + 30, 860, 40, seg(u, .55, .2)); } },
  bullet: (c, t, u) => {
    const m = person(c, LK.soldier, stand({ handR: V(.06, .8, .5), handL: V(-.02, .78, .34), elbR: V(1, -.3, 0), elbL: V(-1, -.3, 0) }), 380, 1500, 1200, Math.PI * .5, { helmet: true, gas: true, trinket: true, trinketSide: -1, seed: 300 });
    const mz = rifle(c, m.hand.R, 1, 330, 1200);
    const hx = 1460, hy = 440, b = T * 12 | 0, cr = 1 - ss(seg(u, .05, .5));
    const rr = rng(7); for (let i = 0; i < 10; i++) { const a = rr() * TAU, l = 60 + rr() * 140; drawPen(c, penStroke([[hx, hy], [hx + Math.cos(a) * l * .5, hy + Math.sin(a) * l * .5 + 6], [hx + Math.cos(a) * l, hy + Math.sin(a) * l]], { w: 2, wob: .6, seed: 310 + i + b, over: 2 }), cr, mix3(ROSE, INK, .25)); }
    if (cr > .02) { wash(c, ellipse(hx, hy, 22 * cr + 4, 22 * cr + 4, 12), ROSE, { a: .8, j: 2, layers: 2, seed: 320 }); }
    const bu = ss(seg(u, .2, .55));
    if (u > .15) { const st = penStroke([mz, [hx, hy]], { w: 2.6, wob: .6, seed: 330 + b, over: 0, smooth: false }); drawPen(c, st, 1 - bu, mix3(ROSE, INK, .25)); const bx = lerp(hx, mz[0], bu), by = lerp(hy, mz[1], bu); if (bu < 1) sketchShape(c, ellipse(bx, by, 26, 10, 12), ROSE, { ink: 2, wash: .85, seed: 340 + b }); }
    handwrite(c, 'out of the wall, back into the gun', 1180, 960 - 120, 44, seg(u, .2, .3)); },
  loyalty: (c, t, u) => {
    const k = .12 + .45 * ss(u), tb = 430 + 120 * k, tt = tb - 340 * k; const tr = [[960 - 150 * k, tb], [960 - 140 * k, tt + 40 * k], [960 - 90 * k, tt], [960 + 90 * k, tt], [960 + 140 * k, tt + 40 * k], [960 + 150 * k, tb]];
    reserve(c, [[960 - 60 * k, tb - 100 * k], [960 + 60 * k, tb - 100 * k], [960 + 700 * k, 900], [960 - 700 * k, 900]], .5, 6, 3);
    sketchShape(c, tr, C.slate, { ink: 2.4, wash: .6, seed: 400 + (T * 12 | 0) }); for (const s of [-1, 1]) sketchShape(c, ellipse(960 + s * 90 * k, tb - 90 * k, 18 * k + 2, 18 * k + 2, 12), C.lamp, { ink: 1.6, wash: .6, seed: 410 + s });
    for (const x of [430, 560]) drawPen(c, penStroke([[x, 640], [x, 900]], { w: 2.6, wob: .6, seed: x, over: 2 }), 1); drawPen(c, penStroke([[420, 760], [580, 760]], { w: 2.6, wob: .6, seed: 433, over: 2 }), 1);
    person(c, LK.prot, { hipY: .3, lean: 0, legL: 1.45, kneeL: 1.45, legR: 1.45, kneeR: 1.45, armL: -.45, armR: -.45, bendL: .3, bendR: .3, nod: .1 }, 500, 900, 440, Math.PI * .5, { seed: 420 });
    for (const y of [700, 730, 760]) drawPen(c, penStroke([[440, y], [560, y + 4]], { w: 2, wob: .8, seed: y, over: 3 }), 1, INK, .85); },
  recruit: (c, t, u) => {
    person(c, LK.prot, stand({ nod: .05 }), 760, 900, 460, Math.PI * .5, { tie: false, seed: 500 });
    const h = person(c, LK.handler, stand({ handR: V(.1, .78, .4), elbR: V(1, -.3, 0) }), 1160, 900, 440, -Math.PI * .5, { seed: 501 });
    const [hx, hy] = h.hand.R; reserve(c, [[hx - 40, hy - 26], [hx, hy - 26], [hx, hy], [hx - 40, hy]], .95, 0); drawPen(c, penStroke([[hx - 40, hy - 26], [hx, hy - 26], [hx, hy], [hx - 40, hy], [hx - 40, hy - 26]], { w: 1.6, wob: .3, seed: 502, smooth: false, over: 1 }), 1);
    handwrite(c, 'TENET', 760, 280, 170, seg(u, .1, .3), { weight: 700 });
    if (u > .45) { c.save(); c.font = '700 170px Caveat'; const tw = c.measureText('TENET').width; c.restore(); c.save(); c.translate(2 * 760 + tw, 0); c.scale(-1, 1); handwrite(c, 'TENET', 760, 280, 170, seg(u, .45, .3), { weight: 700, col: mix3(ROSE, INK, .2), alpha: .7 }); c.restore(); }
    if (u > .6) handwrite(c, 'a secret organisation', 820, 360, 50, seg(u, .6, .25)); },
  lab: (c, t, u) => {
    person(c, LK.prot, stand({}), 320, 900, 460, Math.PI * .62, { tie: true, seed: 600 });
    const sci = person(c, LK.sci, stand({ handR: V(.12, .62, .3), elbR: V(1, -.3, 0) }), 960, 900, 450, Math.PI * .58, { seed: 601 });
    const ju = ss(seg(u, .3, .3)), [hx, hy] = sci.hand.R, bx = lerp(1110, hx, ju), by = lerp(684, hy + 18, ju);
    drawPen(c, penStroke([[1110, 690], [hx, hy + 18]], { w: 2, wob: .6, seed: 610, over: 0, smooth: false }), 1 - ju, mix3(ROSE, INK, .25));
    sketchShape(c, ellipse(bx, by, 10, 22, 12), ROSE, { ink: 2, wash: .85, seed: 611 + (T * 12 | 0) });
    if (u > .35) handwrite(c, 'it falls up, into her hand', 1160, 640, 42, seg(u, .35, .25)); },
  sator: (c, t, u) => {
    for (let i = 0; i < 4; i++) { const r = (1 - ((t * .35 + i * .25) % 1)) * 240 + 20; drawPen(c, penStroke([...Array(12)].map((_, k) => { const a = -.8 + k * .14; return [300 + Math.cos(a) * r, 120 + Math.sin(a) * r]; }), { w: 2.4, wob: .6, seed: 700 + i, over: 1 }), 1, mix3(ROSE, INK, .2), clamp(r / 100)); }
    for (const [x, sz] of [[1720, 560], [880, 470]]) person(c, LK.guard, stand({}), x, 870, sz, -Math.PI * .45, { seed: 710 + x, tie: true });
    person(c, LK.sator, stand({ armL: -.35, armR: -.35, bendL: .6, bendR: .6, nod: .05 }), 1300, 900, 660, -Math.PI * .55, { seed: 720, tie: true });
    if (u > .3) handwrite(c, 'a ruthless oligarch', 1440, 270, 46, seg(u, .3, .2)); if (u > .55) handwrite(c, 'orders from the future', 360, 110, 40, seg(u, .55, .2), { col: mix3(ROSE, INK, .3) }); },
  parts: (c, t, u) => { const g = ss(seg(u, .55, .35)); if (g > 0) { drawPen(c, penStroke([...ellipse(1020, 480, 330, 300, 40), ...ellipse(1020, 480, 330, 300, 40).slice(0, 2)], { w: 2.4, wob: 1, seed: 800, over: 3 }), g); } if (u > .7) handwrite(c, 'a doomsday device', 1250, 860, 52, seg(u, .7, .2)); },
  planet: (c, t, u) => { const cx = 960, cy = 460, R = 330, edge = lerp(cx + R + 40, cx - R - 40, ss(seg(u, .1, .8)));
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip(); wash(c, [[edge, cy - R - 20], ...[...Array(14)].map((_, k) => [edge + Math.sin(k + t * 4) * 20, cy - R + k * R * 2 / 13]), [edge, cy + R + 20], [cx + R + 30, cy + R + 20], [cx + R + 30, cy - R - 20]], ROSE, { a: .6, j: 8, layers: 3, seed: 900 }); c.restore();
    partsRing(c, cx, cy, R + 120, 24, t * .4, 1, .3); },
  team: (c, t, u) => {
    for (let i = 0; i < 3; i++) { const x = (300 + i * 500 + t * (i % 2 ? -30 : 30)), ph = t * 6 + i; carrot(c, x, 640, 70, [C.brick, C.slate, C.olive][i], 1000 + i, { walk: ph }); }
    car(c, 1100, 700, 260, C.slate, 1, { color: .8 });
    const kP = ss(seg(u, 0, .15)), kN = ss(seg(u, .15, .15)), kK = ss(seg(u, .42, .15));
    const names = [];
    if (kN > 0) { const h = person(c, LK.neil, walk(t * 5), lerp(330, 560, kN), 880, 560, Math.PI * .85, { seed: 1010, ink: kN }); names.push(['Neil · a sharp handler', h, kN]); }
    if (kP > 0) { const h = person(c, LK.prot, walk(t * 5 + 1.2), 960, 890, 580, Math.PI, { tie: true, seed: 1011, ink: kP }); names.push(['the Protagonist', h, kP]); }
    if (kK > 0) { const h = person(c, LK.kat, walk(t * 5 + 2.4), lerp(1600, 1360, kK), 880, 570, Math.PI * 1.15, { seed: 1012, ink: kK }); names.push(["Kat · Sator's wife", h, kK]); }
    for (const [s, h, k] of names) handwrite(c, s, h.head.c[0] - 110, h.head.c[1] - 70, 40, k); },
  freeport: (c, t, u) => {
    const px = lerp(-900, 1340 - 620, ss(seg(u, 0, .85))), y = 640, m = ([a, b]) => [px + a, y + b];
    const hull = [[0, -26], [30, -46], [520, -50], [580, -44], [612, -28], [620, -14], [604, -4], [560, 2], [40, 0], [8, -10]].map(m);
    sketchShape(c, hull, C.steel, { ink: 2.4, wash: .35, seed: 1100 + (T * 12 | 0) });
    sketchShape(c, [[2, -26], [10, -118], [44, -118], [84, -46]].map(m), C.steel, { ink: 2.2, wash: .5, seed: 1101 });
    sketchShape(c, [[300, -14], [400, -16], [210, 46], [180, 46]].map(m), C.steel, { ink: 2.2, wash: .5, seed: 1102 });
    for (const u2 of [262, 340]) sketchShape(c, ellipse(px + u2 + 30, y + 16, 34, 12, 12), C.slate, { ink: 1.8, wash: .6, seed: 1103 + u2 });
    for (let i = 0; i < 30; i++) { const [wx, wy] = m([104 + i * 15, -32]); c.fillStyle = rgba(INK, .8); c.fillRect(wx, wy, 4, 5); }
    if (u > .78) { const k = ss(seg(u, .78, .2)); for (let i = 0; i < 9; i++) drawPen(c, penStroke([[1340, 600], [1340 + Math.cos(i * .7 - 2) * 220 * k, 600 + Math.sin(i * .7 - 2) * 220 * k]], { w: 3, wob: 1, seed: 1110 + i, over: 4 }), 1); wash(c, ellipse(1330, 600, 120 * k, 90 * k, 16), C.ochre, { a: .5, j: 8, seed: 1120 }); }
    handwrite(c, 'a Boeing 747', 120, 180, 52, seg(u, .1, .2)); },
  highway: (c, t, u) => {
    for (const [l, x0, sp, len] of [[1, 0, 380, 300], [1, 900, 380, 280], [2, 300, 300, 330], [2, 1300, 300, 300]]) { const y = l === 1 ? 650 : 830, x = ((x0 + t * sp) % (W + 1200) + W + 1200) % (W + 1200) - 600; car(c, x, y, len, C.slate, 1, { color: .8 }); }
    const ix = ((1800 - t * 520) % (W + 1000) + W + 1000) % (W + 1000) - 500, k = ss(u);
    car(c, ix, 500, 330, ROSE, 1, { color: 1 - k * .4, from: k * .35 });
    handwrite(c, 'driving backwards', ix + 40, 430, 40, 1, { col: mix3(ROSE, INK, .3) });
    handwrite(c, 'a chaotic heist', 1380, 470, 44, seg(u, .1, .2)); },
  kat: (c, t, u) => {
    person(c, LK.prot, stand({ handR: V(.12, .9, .4), elbR: V(1, -.3, 0) }), 960, 760, 330, -Math.PI * .5, { tie: true, seed: 1300 });
    const drain = ss(seg(u, .6, .3));
    person(c, LK.kat, stand({}), 520, 880, 560, Math.PI * .5, { seed: 1301, color: 1 - drain, ink: 1 - drain * .5 });
    const s = person(c, rose(LK.sator), stand({ handR: V(.12, .86, .55), elbR: V(1, -.3, 0) }), 1420, 880, 600, -Math.PI * .5, { seed: 1302, gas: false, tie: true });
    sketchShape(c, [[1540, 820], [1620, 820], [1620, 880], [1540, 880]], C.steel, { ink: 2, wash: .6, seed: 1303 }); sketchShape(c, PARTS[0](1580, 850, 16), C.steel, { ink: 1.4, wash: .5, seed: 1304 });
    const [gx, gy] = s.hand.R, bu = ss(seg(u, .4, .2));
    if (u > .38 && u < .62) { drawPen(c, penStroke([[gx, gy], [640, 640]], { w: 2.4, wob: .6, seed: 1310, over: 0, smooth: false }), 1 - bu, mix3(ROSE, INK, .25)); sketchShape(c, ellipse(lerp(640, gx, bu), lerp(640, gy, bu), 22, 9, 12), ROSE, { ink: 1.8, wash: .85, seed: 1311 + (T * 12 | 0) }); }
    handwrite(c, 'Sator, inverted', 1320, 220, 46, seg(u, .1, .2), { col: mix3(ROSE, INK, .3) }); handwrite(c, 'the final piece', 1500, 780, 38, seg(u, .25, .2)); },
  turnstile: (c, t, u) => {
    const cx = 960, cy = 470, R = 300; for (let i = 0; i < 4; i++) { const a = t * 1.4 + i * Math.PI / 2; drawPen(c, penStroke([[cx, cy], [cx + Math.cos(a) * R, cy + Math.sin(a) * R * .35]], { w: 3, wob: .8, seed: 1400 + i + (T * 12 | 0), over: 2 }), 1); }
    const w1 = ss(seg(u, 0, .42)), w2 = ss(seg(u, .5, .45));
    if (u < .45) { person(c, LK.neil, walk(t * 6), lerp(140, 760, w1), 820, 420, Math.PI * .5, { seed: 1410 }); person(c, LK.prot, walk(t * 6 + 1), lerp(280, 860, w1), 830, 410, Math.PI * .5, { tie: true, seed: 1411 }); }
    if (u > .5) { person(c, rose(LK.neil), walk(t * 6), lerp(1060, 1560, w2), 820, 420, Math.PI * .5, { seed: 1412 }); person(c, rose(LK.prot), walk(t * 6 + 1), lerp(1160, 1700, w2), 830, 410, Math.PI * .5, { seed: 1413 }); } },
  yacht: (c, t, u) => {
    person(c, LK.sator, stand({ armL: -.35, armR: -.35, bendL: .6, bendR: .6 }), 380 + 640 * 1.15, 690 - 160 * 1.15, 100, -Math.PI * .5, { seed: 1500 });
    const cx = 1620, cy = 250; c.save(); c.beginPath(); c.arc(cx, cy, 146, 0, TAU); c.clip();
    sketchShape(c, [[cx - 160, cy + 40], [cx + 160, cy - 20], [cx + 160, cy + 80], [cx - 160, cy + 140]], LK.sator.skin, { ink: 2, wash: .5, seed: 1510 });
    sketchShape(c, [[cx - 30, cy + 10], [cx + 40, cy - 4], [cx + 50, cy + 90], [cx - 20, cy + 104]], hex('#3b312d'), { ink: 2, wash: .8, seed: 1511 });
    const beat = (t * 1.1) % 1; if (beat < .2) wash(c, ellipse(cx + 10, cy + 50, 10, 10, 10), C.lamp, { a: .9, j: 1, seed: 1512 });
    const pts = []; for (let i = 0; i <= 50; i++) { const x = cx - 130 + i * 5.2, ph = ((i / 50) - (t * .6) % 1 + 1) % 1; pts.push([x, cy - 70 + (Math.abs(ph - .5) < .03 ? -50 : Math.abs(ph - .53) < .02 ? 30 : 0)]); }
    drawPen(c, penStroke(pts, { w: 2, wob: .3, seed: 1513, smooth: false, over: 0 }), 1); c.restore();
    handwrite(c, 'dying of cancer', 1480, 520, 40, seg(u, .3, .2)); },
  stalsk: (c, t, u) => {
    const b = T * 12 | 0; partsRing(c, 960, 820, 60, 16, t * .3, 1, .4);
    const sigU = (t * .7) % 1; for (let i = 0; i < 12; i++) { const q = (i / 12 + sigU) % 1, x = lerp(120, 900, q), y = lerp(120, 360, q) - Math.sin(q * Math.PI) * 120; drawPen(c, penStroke([[x, y], [x + 18, y + 4]], { w: 2.4, wob: .3, seed: 1600 + i + b, over: 0 }), 1, mix3(C.ochre, INK, .4)); }
    handwrite(c, "the dead-man's switch", 140, 110, 42, seg(u, .2, .2)); },
  pincer: (c, t, u) => {
    const e = ss(u);
    for (let i = 0; i < 14; i++) { const x = lerp(80 + (i % 7) * 60, 600 + (i % 7) * 50, e), y = 640 + Math.floor(i / 7) * 90 + (i % 2) * 20; carrot(c, x, y, 70, C.olive, 1700 + i, { walk: t * 7 + i, helmet: true }); }
    for (let i = 0; i < 14; i++) { const x = lerp(1840 - (i % 7) * 60, 1320 - (i % 7) * 50, e), y = 640 + Math.floor(i / 7) * 90 + (i % 2) * 20; carrot(c, x, y, 70, ROSE, 1750 + i, { walk: -t * 7 + i, helmet: true }); }
    for (let i = 0; i < 12; i++) { const r = rng(i * 13 + 1), x = 820 + (i % 4) * 70, y0 = 300 + Math.floor(i / 4) * 80, side = x < 960, k = side ? ss(seg(u, .1 + r() * .3, .5)) : 1 - ss(seg(u, .1 + r() * .3, .5)), y = y0 + k * (520 - y0); sketchShape(c, [[x, y], [x + 60, y], [x + 60, y + 70], [x, y + 70]].map(([px, py]) => { const a = k * (r() - .5); return [x + 30 + (px - x - 30) * Math.cos(a) - (py - y - 35) * Math.sin(a), y + 35 + (px - x - 30) * Math.sin(a) + (py - y - 35) * Math.cos(a)]; }), side ? C.stone : ROSE, { ink: 1.8, wash: .55, seed: 1800 + i + (T * 12 | 0) }); }
    const hx = lerp(-400, 1100, e); sketchShape(c, [[hx, 140], [hx + 200, 136], [hx + 230, 160], [hx + 200, 180], [hx + 10, 180]], C.olive, { ink: 2, wash: .5, seed: 1850 }); for (const u2 of [20, 200]) drawPen(c, penStroke([[hx + u2 - 120 * Math.cos(t * 30), 120], [hx + u2 + 120 * Math.cos(t * 30), 120]], { w: 2, wob: .4, seed: 1851 + u2, over: 0 }), 1); },
  pull: (c, t, u) => {
    const ry = lerp(820, 300, ss(seg(u, 0, .6)));
    drawPen(c, penStroke([[460, 60], [460, ry - 40]], { w: 2.4, wob: .5, seed: 1900, over: 0 }), 1); partsRing(c, 460, ry, 70, 18, t * .6, 1, .35);
    for (const [x, f] of [[180, 1], [740, -1]]) person(c, LK.soldier, stand({ handR: V(.1, 1.0, .35), handL: V(-.05, .95, .3), elbR: V(1, -.3, 0), elbL: V(-1, -.3, 0) }), x, 260, 150, f > 0 ? Math.PI * .5 : -Math.PI * .5, { helmet: true, seed: 1910 + x });
    const drain = ss(seg(u, .62, .3));
    person(c, LK.kat, stand({ handR: V(.12, .8, .45), elbR: V(1, -.3, 0) }), 1280, 870, 440, Math.PI * .5, { seed: 1920 });
    person(c, LK.sator, stand({}), 1620, 870, 480, -Math.PI * .5, { seed: 1921, tie: true, color: 1 - drain, ink: 1 - drain * .6 });
    if (u > .45) handwrite(c, 'the Algorithm · recovered', 140, 880 - 20, 40, seg(u, .45, .2)); },
  sacrifice: (c, t, u) => {
    person(c, LK.guard, stand({ handR: V(.06, .8, .5), handL: V(-.02, .78, .34), elbR: V(1, -.3, 0), elbL: V(-1, -.3, 0) }), 1180, 780, 230, -Math.PI * .5, { seed: 2000 });
    person(c, LK.protTac, stand({}), 600, 900, 460, Math.PI * .5, { helmet: true, seed: 2001 });
    const k = ss(seg(u, .15, .3)), drain = ss(seg(u, .6, .3));
    if (k > 0) person(c, rose(LK.soldier), walk(-t * 6), lerp(1500, 860, k), 910, 480, -Math.PI * .5, { helmet: true, gas: true, trinket: true, trinketSide: 1, seed: 2002, color: 1 - drain, ink: 1 - drain * .5 });
    if (u > .3) handwrite(c, 'an inverted soldier', 760, 300, 46, seg(u, .3, .2), { col: mix3(ROSE, INK, .3) }); },
  trinketPage: (c, t, u) => {
    person(c, LK.prot, stand({}), 420, 1950, 1750, Math.PI * .58, { tie: true, seed: 2100 });
    const p = clamp(t / 1.2), col = ss(seg(t, 1.0, 1.0)), sw = Math.sin(t * 2.2) * .06;
    c.save(); c.translate(1320, 380); c.rotate(sw); trinket(c, 0, 90, 58 * (1 + 0 * col), { p, color: col }); c.restore();
    drawPen(c, penStroke([[640, 360], [1180, 460]], { w: 1.4, wob: .6, seed: 2110, over: 2 }), clamp(t / 1.5), INK, .7);
    handwrite(c, 'the orange trinket', 1150, 120, 54, seg(u, .3, .2)); },
  farewell: (c, t, u) => {
    person(c, LK.prot, stand({}), 520, 880, 520, Math.PI * .6, { tie: false, seed: 2200 });
    const w = ss(seg(u, .2, .8)), x = lerp(900, 2050, w), pk = ss(seg(u, .3, .5)), sz = lerp(500, 380, w);
    person(c, rose(LK.neil, pk), u < .2 ? stand({ handR: V(.15, 1.12, .05), elbR: V(1, 0, 0) }) : walk(t * 5.5), x, lerp(880, 800, w), sz, u < .2 ? Math.PI * .8 : Math.PI * .5, { seed: 2201, trinket: true, trinketSide: -1 });
    if (u > .1) handwrite(c, 'Neil goes back', 1100, 300, 46, seg(u, .1, .2), { col: mix3(mix3(INK, ROSE, pk * .6), INK, .2) }); },
  founder: (c, t, u) => {
    person(c, LK.prot, stand({}), 480, 880, 640, Math.PI * .9, { tie: true, seed: 2300 });
    const endT = LEND(15) + .1, k = ss(seg(T, endT, 1.2));
    if (k > 0) {   // the sketchbook closes: the right-hand board swings over, a cover with the trinket on its band
      const w = W * k; c.save(); c.globalCompositeOperation = 'source-over';
      c.fillStyle = rgba(mix3(hex('#4a3428'), PAPER, .1)); c.fillRect(W - w, 0, w, H); c.restore();
      if (k > .98) { drawPen(c, penStroke([[0, 0], [W, 0]], { w: 1, seed: 1 }), 0); handwrite(c, 'TENET  ', 760, 520, 150, seg(T, endT + 1.2, .5), { weight: 700, col: PAPER, alpha: .9 }); c.fillStyle = rgba(hex('#2a1e18')); c.fillRect(1400, 0, 26, H); trinket(c, 1413, 640, 34, { p: 1, color: 1 }); }
    } },
};

// ---------------------------------------------------------------- subtitles: handwriting in the lower margin
function subtitle(t) {
  const cue = CUES.find(q => t >= q.t0 && t < q.t1); if (!cue) return;
  const rows = wrap(cue.text, 76), p = clamp((t - cue.t0) / Math.min(1.1, (cue.t1 - cue.t0) * .45));
  rows.forEach((r, i) => handwrite(ctx, r, 96, 968 + i * 50 - (rows.length - 1) * 22, 44, clamp(p * rows.length - i), { weight: 500, alpha: .9 }));
}

// ---------------------------------------------------------------- the frame
let built = -1, page = null, statDone = false, snapIdx = -1;
function renderStatic(lt) {
  IC.clearRect(0, 0, W, H); CC.clearRect(0, 0, W, H);
  for (const it of page.items) {
    const p = (lt - it.t0) / it.d;
    if (p <= 0) continue;
    if (it.ty === 'ink') drawPen(IC, it.st, Math.min(1, p), it.col ?? INK, it.a);
    else if (it.ty === 'text') handwrite(IC, it.s, it.x, it.y, it.size, Math.min(1, p), { font: it.font, weight: it.weight, col: it.col, align: it.align, rot: it.rot });
    else if (it.ty === 'wash') { const k = ss(p); CC.save(); if (k < 1) { CC.beginPath(); const rr = rough(ellipse(it.src[0], it.src[1], it.R * k + 2, it.R * k + 2, 24), it.R * .05 * k + 1, it.seed, 10, .01); rr.forEach(([x, y], i) => i ? CC.lineTo(x, y) : CC.moveTo(x, y)); CC.closePath(); CC.clip(); } wash(CC, it.poly, it.col, { a: it.a, j: it.j, layers: it.layers, seed: it.seed, dx: it.dx, dy: it.dy, edge: it.edge }); CC.restore(); }
    else if (it.ty === 'reserve') { CC.save(); CC.globalAlpha = ss(p); CC.globalCompositeOperation = 'destination-out'; CC.fillStyle = '#000'; CC.beginPath(); rough(it.poly, 4, 3).forEach(([x, y], i) => i ? CC.lineTo(x, y) : CC.moveTo(x, y)); CC.closePath(); CC.fill(); CC.restore(); }
    else if (it.ty === 'fn') it.f(CC, ss(p));
  }
  CC.save(); CC.globalCompositeOperation = 'destination-in'; CC.drawImage(MASK, 0, 0); CC.restore();
  SX.globalCompositeOperation = 'source-over'; SX.fillStyle = '#fff'; SX.fillRect(0, 0, W, H);
  SX.globalCompositeOperation = 'multiply'; SX.drawImage(CC.canvas, 0, 0); SX.globalCompositeOperation = 'source-over'; SX.drawImage(IC.canvas, 0, 0);
}
function frame(t) {
  T = t;
  let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].t0) i++;
  const sh = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t0 : window.DUR, lt = t - sh.t0, u = clamp(lt / (t1 - sh.t0));
  if (built !== i) { page = PG[sh.key]().schedule(sh.draw ?? Math.min(2.4, (t1 - sh.t0) * .45)); built = i; statDone = false; }
  if (!statDone) { renderStatic(lt); if (lt > page.end) statDone = true; }
  const cm = sh.cam || {}, e = ss(u), z = lerp(cm.z0 ?? 1, cm.z1 ?? 1.04, e), cx = cm.cx ?? 960, cy = cm.cy ?? 500;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(PAPERCV, 0, 0);
  ctx.setTransform(z, 0, 0, z, (1 - z) * cx, (1 - z) * cy);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(STAT, 0, 0); ctx.globalCompositeOperation = 'source-over';
  DY[sh.key](ctx, lt, u);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
  // a page turn: the previous page lifts away to the left
  if (i > 0 && snapIdx === i - 1 && lt < .5) { const k = ss(lt / .5), x = W * (1 - k); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); ctx.drawImage(SNAP, -W * k * .2, 0); ctx.restore(); const g = ctx.createLinearGradient(x - 40, 0, x + 50, 0); g.addColorStop(0, 'rgba(60,45,35,0)'); g.addColorStop(.5, 'rgba(60,45,35,.25)'); g.addColorStop(1, 'rgba(60,45,35,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40, 0, 90, H); }
  else if (lt >= .5 || snapIdx !== i - 1) { SNX.drawImage(out, 0, 0); snapIdx = i; }
  subtitle(t);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .35; ctx.fillStyle = ctx.createPattern(TOOTH, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

window.DUR = 0; window.READY = false;
(async () => {
  await Promise.all(['500 40px Caveat', '700 40px Caveat', '40px "Reenie Beanie"'].map(f => document.fonts.load(f)));
  LINES = await (await fetch('lines.json')).json();
  const dur = await (await fetch('voices/dur.json')).json();
  let t = 0.35; for (const l of LINES) { S.push(t); D.push(dur[l.id]); t += dur[l.id] + 0.3; }
  window.DUR = LEND(15) + 3.4;
  CUES = cues(LINES, S, D); window.SUBS = CUES;
  makePaper();
  SHOTS = [
    { t0: 0, key: 'title', cam: { z0: 1, z1: 1.04 } },
    { t0: Lt(2, 0), key: 'operaOut', cam: { z0: 1, z1: 1.08, cy: 600 } },
    { t0: Lt(2, .38), key: 'operaIn', cam: { z0: 1.04, z1: 1, cx: 1200 } },
    { t0: Lt(2, .68), key: 'bullet', cam: { z0: 1, z1: 1.05, cx: 1100, cy: 450 } },
    { t0: Lt(3, 0), key: 'loyalty', cam: { z0: 1, z1: 1.06, cx: 1300, cy: 400 } },
    { t0: Lt(3, .55), key: 'recruit', cam: { z0: 1.04, z1: 1 } },
    { t0: Lt(4, 0), key: 'lab', cam: { z0: 1, z1: 1.05 } },
    { t0: Lt(5, 0), key: 'sator', cam: { z0: 1, z1: 1.08, cx: 1300, cy: 380 } },
    { t0: Lt(6, 0), key: 'parts', cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(6, .55), key: 'planet', cam: { z0: 1, z1: 1.06, cy: 460 } },
    { t0: Lt(7, 0), key: 'team', cam: { z0: 1.04, z1: 1, cy: 650 } },
    { t0: Lt(8, 0), key: 'freeport', cam: { z0: 1, z1: 1.05, cx: 1300 } },
    { t0: Lt(8, .5), key: 'highway', cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(9, 0), key: 'kat', cam: { z0: 1, z1: 1.05 } },
    { t0: Lt(10, 0), key: 'turnstile', cam: { z0: 1, z1: 1.04 } },
    { t0: Lt(11, 0), key: 'yacht', cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(11, .52), key: 'stalsk', cam: { z0: 1, z1: 1.05, cy: 600 } },
    { t0: Lt(12, 0), key: 'pincer', cam: { z0: 1.03, z1: 1 } },
    { t0: Lt(13, 0), key: 'pull', cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(13, .45), key: 'sacrifice', cam: { z0: 1, z1: 1.07, cx: 800, cy: 600 } },
    { t0: Lt(14, 0), key: 'trinketPage', cam: { z0: 1, z1: 1.08, cx: 1300, cy: 450 } },
    { t0: Lt(15, 0), key: 'farewell', cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(15, .55), key: 'founder', cam: { z0: 1.05, z1: 1 } },
  ];
  window.SHOTS = SHOTS.map(s => s.t0);
  window.render = t => frame(t);
  window.READY = true;
})();
