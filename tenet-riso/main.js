// Tenet, printed: a risograph film. Three plates (blue, sunflower, pink) drawn as densities, printed by riso.js.
// Blue = forward time, pink = inverted time, sunflower = the Algorithm and the trinket. Overprint is the shader's multiply.
// Every beat of the narration is its own sheet: the plates roll in again at each cut.
// All characters are original stand-ins drawn for this film (no likeness of any actor), built from one rig (person()).
import { makeRiso } from './riso.js';
import { cues, wrap } from './subs.js';

const W = 1920, H = 1080, TAU = Math.PI * 2;
const out = document.getElementById('c');
const print = makeRiso(out, W, H);
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const PL = {}; for (const p of ['B', 'S', 'K']) PL[p] = mk().getContext('2d', { willReadFrequently: true });
const MC = mk().getContext('2d');                       // scratch: a figure's silhouette
const SEP = mk(), SC = SEP.getContext('2d');
const PLATES = ['B', 'S', 'K'];
const INKS = [[0, 120, 191], [255, 181, 17], [255, 72, 176]];   // R = blue, G = sunflower, B = fluorescent pink
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, d) => clamp((t - a) / Math.max(1e-6, d));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- timing (every shot is keyed to a narration line)
let S = [], D = [], LINES = [], CUES = [], SHOTS = [];
const Lt = (i, f) => S[i - 1] + f * (D[i - 1] + 0.3);
const LEND = i => S[i - 1] + D[i - 1] + 0.3;
let T = 0;

// ---------------------------------------------------------------- camera (applied to every plate and the scratch canvas)
let CAM = { z: 1, cx: 960, cy: 540, px: 0, py: 0 };
function setCam(z, cx, cy, px = 0, py = 0) {
  CAM = { z, cx, cy, px, py };
  for (const c of [PL.B, PL.S, PL.K, MC]) c.setTransform(z, 0, 0, z, (1 - z) * cx + px, (1 - z) * cy + py);
}
const scr = (x, y) => [CAM.z * x + (1 - CAM.z) * CAM.cx + CAM.px, CAM.z * y + (1 - CAM.z) * CAM.cy + CAM.py];

// ---------------------------------------------------------------- drawing on plates: density = alpha (the shader turns it into halftone)
const ink = d => `rgba(0,0,0,${clamp(d)})`;
function on(p, fn, comp) { const c = PL[p]; c.save(); if (comp) c.globalCompositeOperation = comp; fn(c); c.restore(); }
function fill(p, d, shape) { if (d <= 0) return; on(p, c => { c.fillStyle = ink(d); c.beginPath(); shape(c); c.fill(); }); }
function stroke(p, d, w, shape, dash) { if (d <= 0) return; on(p, c => { c.strokeStyle = ink(d); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; if (dash) c.setLineDash(dash); c.beginPath(); shape(c); c.stroke(); }); }
function knock(ps, shape, w = 0) {   // zero ink: paper shows through (a knockout)
  for (const p of ps) on(p, c => { c.fillStyle = c.strokeStyle = '#000'; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); shape(c); if (w) { c.lineWidth = w; c.stroke(); } else c.fill(); }, 'destination-out');
}
function paint(p, d, shape, halo = []) { knock([p, ...halo], shape); fill(p, d, shape); }   // a lighter shape over a darker one
function grad(p, x0, y0, x1, y1, stops, shape) { on(p, c => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [o, d] of stops) g.addColorStop(o, ink(d)); c.fillStyle = g; c.beginPath(); shape(c); c.fill(); }); }
function rgrad(p, x, y, r, stops, shape) { on(p, c => { const g = c.createRadialGradient(x, y, 0, x, y, r); for (const [o, d] of stops) g.addColorStop(o, ink(d)); c.fillStyle = g; c.beginPath(); shape(c); c.fill(); }); }
const rect = (x, y, w, h) => c => c.rect(x, y, w, h);
const ell = (x, y, rx, ry = rx, a = 0) => c => c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), a, 0, TAU);
const poly = pts => c => { pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
const path = pts => c => { pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
const ring = (x, y, r0, r1) => c => { c.arc(x, y, r1, 0, TAU); c.moveTo(x + r0, y); c.arc(x, y, r0, 0, TAU, true); };
const archS = (cx, by, w, h) => c => { c.moveTo(cx - w / 2, by); c.lineTo(cx - w / 2, by - h + w / 2); c.arc(cx, by - h + w / 2, w / 2, Math.PI, 0); c.lineTo(cx + w / 2, by); c.closePath(); };
function text(p, d, s, x, y, font, align = 'center', comp, ls = 0) { on(p, c => { c.font = font; c.letterSpacing = ls + 'px'; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = ink(d); c.fillText(s, x, y); }, comp); }
function knockText(ps, s, x, y, font, align = 'center', ls = 0) { for (const p of ps) text(p, 1, s, x, y, font, align, 'destination-out', ls); }
// a zine label: a solid ink box with the words knocked out of it, a paper fringe around
function tag(s, x, y, p = 'B', size = 26, align = 'left') {
  const c = PL[p]; c.save(); c.font = `600 ${size}px Jost`; c.letterSpacing = size * .14 + 'px'; const w = c.measureText(s).width + size * 1.1; c.restore();
  const h = size * 1.55, X = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  knock(PLATES, rect(X - 5, y - h - 5, w + 10, h + 10));
  fill(p, 1, rect(X, y - h, w, h));
  on(p, c => { c.font = `600 ${size}px Jost`; c.letterSpacing = size * .14 + 'px'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(s, X + size * .55, y - h / 2 + size * .06); }, 'destination-out');
}
// local drawing frame: (u, v) local units -> world, scale k, flip f
function LT(x, y, k, f = 1) {
  const m = ([u, v]) => [x + f * u * k, y + v * k];
  return {
    m, k,
    poly: (p, d, pts) => fill(p, d, poly(pts.map(m))),
    paint: (p, d, pts, halo) => paint(p, d, poly(pts.map(m)), halo),
    ko: (ps, pts, w = 0) => knock(ps, w ? path(pts.map(m)) : poly(pts.map(m)), w * k),
    line: (p, d, w, pts, dash) => stroke(p, d, w * k, path(pts.map(m)), dash),
    ell: (p, d, u, v, rx, ry = rx) => { const [X, Y] = m([u, v]); fill(p, d, ell(X, Y, rx * k, ry * k)); },
    paintE: (p, d, u, v, rx, ry = rx, halo) => { const [X, Y] = m([u, v]); paint(p, d, ell(X, Y, rx * k, ry * k), halo); },
    koE: (ps, u, v, rx, ry = rx) => { const [X, Y] = m([u, v]); knock(ps, ell(X, Y, rx * k, ry * k)); },
  };
}
function wheel(L, u, v, r, rot, p = 'B') {
  L.paintE(p, 1, u, v, r, r, PLATES.filter(q => q !== p));
  L.koE([p], u, v, r * .58);
  L.ell(p, .55, u, v, r * .5);
  for (let i = 0; i < 5; i++) { const a = rot + i * TAU / 5; L.ko([p], [[u, v], [u + Math.cos(a) * r * .5, v + Math.sin(a) * r * .5]], r * .06); }
  L.ell(p, 1, u, v, r * .14);
}

// ---------------------------------------------------------------- the character rig
// A person 100 units tall, feet at (0, 0), facing +x, light from the left. Options:
//  coat: suit | tactical | linen | trench | overcoat | labcoat | peacoat ; hair: crop | swept | slick | bun | bob | cap | helmet | balaclava | grey
//  cloth, skin, hairD, build, walk (phase), stride, armF/armB [shoulder, elbow] (rad, 0 = hanging, + = forward), tie, scarf, pack,
//  mask: gas | oxy ; glasses, stubble, earrings, watch, gloves, rolled, seated, gun: aim | port | pistol, case, card, look, brows: 'stern'
function person(c, o, A, mask, mul = 1) {
  const I = d => mask ? '#000' : ink(d * mul);
  const F = (d, fn) => { if (d <= 0) return; c.fillStyle = I(d); c.beginPath(); fn(); c.fill(); };
  const Lw = (d, w, fn) => { if (d <= 0) return; c.strokeStyle = I(d); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); fn(); c.stroke(); };
  const KO = (w, fn) => { if (mask) return; c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = c.strokeStyle = '#000'; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); fn(); if (w) { c.lineWidth = w; c.stroke(); } else c.fill(); c.restore(); };
  const PA = (d, fn) => { KO(0, fn); F(d, fn); };
  const P = pts => () => pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  const PC = pts => () => { P(pts)(); c.closePath(); };
  const E = (x, y, rx, ry = rx, a = 0) => () => c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), a, 0, TAU);
  const R_ = (x, y, w, h) => () => c.rect(x, y, w, h);
  const fem = !!o.fem;
  const bw = o.build ?? 1, cl = o.cloth ?? .85, sk = o.skin ?? .14, hd = o.hairD ?? 1, tr = o.legs ?? Math.max(cl, .75);
  const coat = o.coat ?? 'suit', light = cl < .35;
  const det = (w, fn) => light ? Lw(.9, w * .8, fn) : KO(w, fn);   // seams: paper lines on dark cloth, ink lines on pale cloth
  const ph = o.walk ?? 0, st = o.stride ?? 0, sit = !!o.seated, dy = sit ? 22 : 0;
  const hipY = -50 + dy, shY = -80 + dy, shX = (fem ? 8.7 : 10.5) * bw, hY = shY - 10.6;   // hY: the head's centre
  const wst = (fem ? 6.8 : 8.6) * bw, hipW = (fem ? 10 : 9.4) * bw;
  const longC = ['trench', 'overcoat', 'labcoat'].includes(coat);
  const hem = sit ? hipY + 5 : ({ suit: -44, tactical: -45, linen: -43, peacoat: -37, trench: -21, overcoat: -23, labcoat: -26 }[coat] ?? -44);
  const hw = longC && !sit ? (fem ? 14.5 : 13.2) * bw : (fem ? 10.6 : 10.2) * bw;
  const lx = o.look ?? .7, jaw = o.jaw ?? (fem ? .86 : 1), nose = o.nose ?? 1;
  const mood = o.mood ?? (o.smile ? 'smile' : o.brows === 'stern' ? 'stern' : 'calm');

  // ---- legs
  const legG = sgn => {
    const hx = sgn * (fem ? 4.1 : 4.4) * bw;
    if (sit) return { hip: [hx, hipY], k: [hx + 23, hipY - 1], an: [hx + 23.5, -3] };
    const p = ph + (sgn > 0 ? 0 : Math.PI);
    const a = st * .42 * Math.sin(p), b = st * .6 * Math.max(0, Math.sin(p + 1.7));
    const k = [hx + Math.sin(a) * 25, hipY + Math.cos(a) * 25];
    return { hip: [hx, hipY], k, an: [k[0] + Math.sin(a - b) * 24, k[1] + Math.cos(a - b) * 24] };
  };
  const drawLeg = (g, d) => {
    Lw(d, (fem ? 7.4 : 8.3) * bw, P([g.hip, g.k, g.an]));
    KO(.42, P([[lerp(g.hip[0], g.k[0], .4) + 1.2, lerp(g.hip[1], g.k[1], .4)], [g.k[0] + 1.2, g.k[1]], [g.an[0] + 1, g.an[1] - 4]]));   // crease
    if (coat === 'tactical') { PA(1, E(g.k[0] + 1, g.k[1] + 1, 3.6, 3)); KO(.35, P([[g.k[0] - 2, g.k[1] + 1], [g.k[0] + 4, g.k[1] + 1]])); }   // knee pad
    F(1, PC([[g.an[0] - 3, g.an[1] - 2.6], [g.an[0] + 2.6, g.an[1] - 3], [g.an[0] + 7.8, g.an[1] + .2], [g.an[0] + 7.6, g.an[1] + 1.8], [g.an[0] - 3.3, g.an[1] + 1.8]]));   // shoe
    KO(.32, P([[g.an[0] - 3, g.an[1] + .8], [g.an[0] + 7.4, g.an[1] + .8]]));   // sole
    KO(.28, P([[g.an[0] + 3.4, g.an[1] - 2.2], [g.an[0] + 4.6, g.an[1] - .6]]));  // laces
  };
  // ---- arms
  const swing = st * .5 * Math.sin(ph);
  const armG = (sgn, a, e) => {
    const sh = [sgn * shX * .9, shY + 2.6];
    const el = [sh[0] + Math.sin(a) * 16, sh[1] + Math.cos(a) * 16];
    return { sh, el, wr: [el[0] + Math.sin(a + e) * 15, el[1] + Math.cos(a + e) * 15], ang: a + e };
  };
  const aF = o.armF ?? [-swing, .22], aB = o.armB ?? [swing, .22];
  const gF = armG(1, aF[0], aF[1]), gB = armG(-1, aB[0], aB[1]);
  // a hand: a palm, four fingers and a thumb (the thumb leads, toward +x)
  const drawHand = (hx, hy, ang, glove) => {
    const dx = Math.sin(ang), dyy = Math.cos(ang), nx = Math.cos(ang), ny = -Math.sin(ang);
    const cx0 = hx + dx * 2.4, cy0 = hy + dyy * 2.4;
    const fing = [];
    for (const k of [-1.25, -.42, .42, 1.25]) { const s0 = [cx0 + nx * k * .85 + dx * 1.2, cy0 + ny * k * .85 + dyy * 1.2], len = 3.6 - Math.abs(k) * .35; fing.push([s0, [s0[0] + dx * len + nx * k * .12, s0[1] + dyy * len + ny * k * .12]]); }
    const th0 = [cx0 + nx * 1.9, cy0 + ny * 1.9], th1 = [th0[0] + dx * 2.3 + nx * .9, th0[1] + dyy * 2.3 + ny * .9];
    const fp = () => { for (const [a, b] of [...fing, [th0, th1]]) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } };
    if (glove) { Lw(1, 2.1, fp); F(1, E(cx0, cy0, 2.6, 3.1, -ang)); KO(.28, P([[cx0 - nx * 1.8 + dx * .6, cy0 - ny * 1.8 + dyy * .6], [cx0 + nx * 1.8 + dx * .6, cy0 + ny * 1.8 + dyy * .6]])); return; }
    Lw(.8, 2.0, fp); KO(1.15, fp); Lw(sk, 1.15, fp);
    PA(sk, E(cx0, cy0, 2.4, 3, -ang)); Lw(.75, .42, E(cx0, cy0, 2.4, 3, -ang));
    Lw(.55, .3, P([[cx0 + nx * 1.2, cy0 + ny * 1.2], [cx0 + nx * 1.6 + dx * 1.2, cy0 + ny * 1.6 + dyy * 1.2]]));   // thumb crease
  };
  const drawArm = (g, d, front) => {
    Lw(d, (fem ? 5.8 : 6.5) * bw, P([g.sh, g.el, g.wr]));
    if (o.rolled) { const m0 = [lerp(g.el[0], g.wr[0], .2), lerp(g.el[1], g.wr[1], .2)]; KO(4.6, P([m0, g.wr])); Lw(sk, 4.6, P([m0, g.wr])); Lw(.75, .4, P([[m0[0] - 2, m0[1]], [m0[0] + 2, m0[1]]])); Lw(.55, .3, P([[lerp(m0[0], g.wr[0], .5) - 1, lerp(m0[1], g.wr[1], .5)], [lerp(m0[0], g.wr[0], .5) + 1.4, lerp(m0[1], g.wr[1], .5) + .3]])); }
    det(.42, P([[lerp(g.sh[0], g.el[0], .5) + .9, lerp(g.sh[1], g.el[1], .5)], [g.el[0] + 1.1, g.el[1] + .4]]));   // sleeve fold
    det(.36, P([[g.el[0] - 1.2, g.el[1] - 1.4], [g.el[0] + 1.6, g.el[1] + .6]]));   // elbow crease
    const ca = Math.cos(g.ang), sa = Math.sin(g.ang);
    if (!o.gloves && !o.rolled && !light) KO(1.3, P([[g.wr[0] - ca * 2.7, g.wr[1] + sa * 2.7], [g.wr[0] + ca * 2.7, g.wr[1] - sa * 2.7]]));   // white cuff
    if (o.pocketsH) return null;
    drawHand(g.wr[0], g.wr[1], g.ang, o.gloves);
    if (front && o.watch) { F(1, R_(g.wr[0] - 1.9, g.wr[1] - 1, 3.8, 2)); KO(.3, E(g.wr[0], g.wr[1], .7)); A.watch = [g.wr[0], g.wr[1]]; }
    return [g.wr[0] + sa * 4.2, g.wr[1] + ca * 4.2];
  };
  // ---- pack (behind the body); the trinket hangs from its lower corner
  if (o.pack) {
    PA(o.packD ?? .95, PC([[-shX - 5, shY + 1.5], [-shX + 3, shY + .5], [-shX + 3.5, shY + 27], [-shX - 4.6, shY + 27.5]]));
    KO(.4, P([[-shX - 4.3, shY + 10], [-shX + 2.8, shY + 9.6]])); for (let i = 0; i < 6; i++) KO(.35, E(-shX - 1, shY + 12 + i * 2.4, .35));
    Lw(1, .9, E(-shX - 1, shY - .5, 1.6, 1.2)); A.trinket = [-shX - 3.4, shY + 31];
  }
  if (o.hair === 'bun') { F(hd, E(-4.6, hY - 4.4, 3.4, 3.1)); KO(.3, P([[-6.6, hY - 4.8], [-2.6, hY - 3.4]])); KO(.25, P([[-6.2, hY - 3.4], [-3, hY - 2.6]])); }
  drawLeg(legG(-1), tr * .82);
  drawArm(gB, cl * .8 + (light ? .1 : 0), false);
  drawLeg(legG(1), tr);
  // ---- neck (a shorter one) with a shadow under the jaw
  const nk = Math.min(1.3, bw); PA(sk, PC([[-2.9 * nk, hY + 4.4], [2.9 * nk, hY + 4.4], [3.5 * nk, shY + 1.4], [-3.5 * nk, shY + 1.4]])); F(sk + .3, PC([[-2.9 * nk, hY + 4.4], [2.9 * nk, hY + 4.4], [3 * nk, hY + 6.6], [-3 * nk, hY + 6.6]]));
  // ---- torso: sloped shoulders, a waist
  const torsoP = () => { c.moveTo(-shX, shY + .8); c.lineTo(-3.4, shY - 1.2); c.lineTo(3.4, shY - 1.2); c.lineTo(shX, shY + .8); c.quadraticCurveTo(shX + .9, shY + 10, wst, shY + 22); c.lineTo(hipW, hipY + 2); c.lineTo(hw, hem); c.lineTo(-hw, hem); c.lineTo(-hipW, hipY + 2); c.lineTo(-wst, shY + 22); c.quadraticCurveTo(-shX - .9, shY + 10, -shX, shY + .8); c.closePath(); };
  PA(cl, torsoP); F(cl, E(-shX * .86, shY + 2.6, 3.4)); F(cl, E(shX * .86, shY + 2.6, 3.4));
  F(Math.min(1, cl + .22), PC([[shX * .42, shY - 1], [shX, shY + .8], [shX + .4, shY + 10], [wst, shY + 22], [hipW, hipY + 2], [hw, hem], [hw * .5, hem]]));   // shadow side
  F(Math.min(1, cl + .12), PC([[-wst, shY + 22], [-wst + 2.2, shY + 22], [-hipW + 1.6, hipY + 2], [-hipW, hipY + 2]]));   // the waist, a little darker
  if (light) Lw(.9, .7, torsoP);
  if (fem && !sit) KO(.4, P([[-wst, shY + 22], [wst, shY + 22]]));   // a seam at the waist
  // coat details
  const V = PC([[-3.7, shY - .4], [3.7, shY - .4], [0, shY + 15.5]]);
  const collar = sgn => PC([[sgn * 2.7, shY - 2.3], [sgn * 4.9, shY + .8], [sgn * 1.2, shY + 4.4], [0, shY + 1]]);
  if (coat === 'suit' || coat === 'overcoat' || coat === 'labcoat' || coat === 'peacoat') {
    KO(0, V);
    if (coat === 'labcoat') F(.75, V);
    if (o.tie) {
      const tp = [[-1.25, shY + .2], [1.25, shY + .2], [2, shY + 13.6], [0, shY + 16.6], [-2, shY + 13.6]];
      F(1, PC(tp)); F(1, E(0, shY + 1, 1.7, 1.3)); KO(.25, P([[-1.2, shY + 6], [1.6, shY + 7.5]])); A.tie = tp;
    } else if (coat !== 'labcoat') F(sk, PC([[-2.2, shY - .4], [2.2, shY - .4], [0, shY + 6]]));
    if (coat !== 'labcoat') { KO(0, collar(-1)); KO(0, collar(1)); Lw(1, .38, collar(-1)); Lw(1, .38, collar(1)); }
    det(.85, P([[-3.7, shY - .4], [-6.7, shY + 8.6], [-1.5, shY + 18.5]])); det(.85, P([[3.7, shY - .4], [6.7, shY + 8.6], [1.5, shY + 18.5]]));   // lapels
    det(.7, P([[-8.4, shY + 23], [-4.2, shY + 23]])); det(.7, P([[4.2, shY + 23], [8.4, shY + 23]])); det(.6, P([[4, shY + 8.8], [7.4, shY + 8.5]]));   // pockets
    if (coat === 'suit') { KO(0, E(.3, shY + 22.5, .75)); KO(0, E(.3, shY + 27.5, .75)); KO(0, PC([[4.4, shY + 8.6], [6.4, shY + 8.4], [5.4, shY + 6.6]])); det(.35, P([[-6, shY + 12], [-3, shY + 18]])); det(.35, P([[3, shY + 12], [6, shY + 18]])); }
    if (coat === 'overcoat' || coat === 'peacoat') { for (let i = 0; i < 3; i++) { KO(0, E(-2.8, shY + 19 + i * 5, .8)); KO(0, E(3.6, shY + 19 + i * 5, .8)); } PA(Math.min(1, cl + .1), PC([[-6.4, shY - 1.2], [-3.9, shY - 1.8], [-3.2, shY + .8], [-3.7, shY + 2], [0, shY + 9], [3.7, shY + 2], [3.2, shY + .8], [3.9, shY - 1.8], [6.4, shY - 1.2], [8.6, shY + 5], [3.7, shY + 2], [0, shY + 9], [-3.7, shY + 2], [-8.6, shY + 5]])); KO(.4, P([[-6.4, shY - 1.2], [-8.6, shY + 5]])); KO(.4, P([[6.4, shY - 1.2], [8.6, shY + 5]])); if (o.tie) F(1, PC([[-1.25, shY + 4], [1.25, shY + 4], [2, shY + 13.6], [0, shY + 16.6], [-2, shY + 13.6]])); }
    if (coat === 'overcoat') { det(.5, P([[.6, shY + 30], [.9, hem]])); det(.45, P([[-9.4, hipY + 8], [-6, hipY + 7]])); det(.45, P([[6, hipY + 7], [9.4, hipY + 8]])); det(.3, P([[-10, hipY + 14], [-8, hem - 4]])); det(.3, P([[10, hipY + 14], [8, hem - 4]])); }
    if (coat === 'labcoat') { det(.5, P([[.5, shY + 16], [.8, hem]])); Lw(1, .38, P([[-2.6, shY + .5], [-.6, shY + 13], [.6, shY + 13], [2.6, shY + .5]])); F(1, R_(-1.8, shY + 13, 3.6, 4.6)); KO(0, R_(-1.2, shY + 13.6, 2.4, 1.4)); for (let i = 0; i < 3; i++) Lw(.9, .4, P([[4.6 + i * .8, shY + 7.4], [4.6 + i * .8, shY + 10.6]])); }
  }
  if (coat === 'linen') {
    PA(sk, PC([[-2.6, shY - .4], [2.6, shY - .4], [0, shY + 7.6]]));
    Lw(1, .55, P([[-3.7, shY - .4], [-6.4, shY + 8.6], [-1.6, shY + 20]])); Lw(1, .55, P([[3.7, shY - .4], [6.4, shY + 8.6], [1.6, shY + 20]]));
    Lw(1, .45, collar(-1)); Lw(1, .45, collar(1));
    for (const [a, b, e] of [[-7, shY + 12, 1], [5, shY + 20, -1], [-6, hipY - 2, 1], [6.5, hipY - 6, -1], [-2, shY + 25, 1]]) Lw(.95, .4, P([[a, b], [a + 2.6 * e, b + 1.4], [a + 4 * e, b + .6]]));   // creases of linen
    Lw(.95, .55, P([[-8.4, shY + 24], [-4.4, shY + 24]])); Lw(.95, .55, P([[4.4, shY + 24], [8.4, shY + 24]]));
    for (let i = 0; i < 3; i++) F(1, E(0, shY + 8 + i * 4.4, .55));   // buttons
  }
  if (coat === 'trench') {
    PA(Math.min(1, cl + .12), PC([[-7, shY - 2.6], [7, shY - 2.6], [9.2, shY + 9], [3.2, shY + 3], [0, shY + 12], [-3.2, shY + 3], [-9.2, shY + 9]]));
    KO(0, PC([[-2.4, shY - .6], [2.4, shY - .6], [0, shY + 5.6]])); F(sk, PC([[-2.4, shY - .6], [2.4, shY - .6], [0, shY + 5.6]]));
    for (let i = 0; i < 3; i++) { KO(0, E(-2.6, shY + 15 + i * 5.2, .75)); KO(0, E(4.2, shY + 15 + i * 5.2, .75)); }
    const by = fem ? shY + 21 : hipY - 2.2;   // a belt at the waist
    F(1, R_(-(fem ? wst + 1.5 : hw * .74), by, (fem ? wst + 1.5 : hw * .74) * 2, 3.6)); KO(.38, R_(-1.6, by + .4, 3.2, 2.8)); A.buckle = [0, by + 1.8];
    Lw(1, .9, P([[-1, by + 3.6], [-3.4, by + 13]])); Lw(1, .9, P([[1.2, by + 3.6], [2.4, by + 12]]));   // belt ends
    det(.5, P([[.7, by + 4], [1.1, hem]])); det(.45, P([[-8.6, hipY + 7], [-5.4, hipY + 12]])); det(.45, P([[8.6, hipY + 7], [5.4, hipY + 12]]));
    det(.6, P([[-shX * .9, shY + .4], [-shX * .45, shY + .6]])); det(.6, P([[shX * .45, shY + .6], [shX * .9, shY + .4]]));   // epaulettes
    det(.3, P([[-hw + .8, hem - 1.6], [hw - .8, hem - 1.6]])); det(.3, P([[-hw + 2, by + 8], [-hw + 3, hem - 3]])); det(.3, P([[hw - 2, by + 8], [hw - 3, hem - 3]]));
  }
  if (coat === 'tactical') {
    F(1, PC([[-3.4, shY - 3.6], [3.4, shY - 3.6], [3.9, shY + 1], [-3.9, shY + 1]])); KO(.3, P([[-3, shY - 1], [3, shY - 1]]));   // neck gaiter
    PA(1, PC([[-9, shY + .4], [9, shY + .4], [9.5, hipY + 3], [-9.5, hipY + 3]]));   // plate carrier
    for (let i = 0; i < 3; i++) { KO(.5, R_(-8.2 + i * 5.7, shY + 18.5, 4.6, 6.6)); KO(.35, P([[-8 + i * 5.7, shY + 20.3], [-3.8 + i * 5.7, shY + 20.3]])); }
    for (let r = 0; r < 4; r++) KO(.32, P([[-8.4, shY + 4 + r * 3.3], [-2, shY + 4 + r * 3.3]]));
    KO(.4, P([[2, shY + 4], [7.6, shY + 4]])); KO(.4, R_(2.6, shY + 6, 5, 7.6));
    PA(1, R_(-9.8, hipY + 1.2, 19.6, 3.1)); KO(.4, R_(-1.4, hipY + 1.5, 2.8, 2.5));
    Lw(1, .55, P([[-7.2, shY + 1.6], [-8.8, shY - 8]]));   // radio antenna
  }
  if (o.scarf) {
    const s1 = [[-4.4, shY - 2.4], [4.4, shY - 2.4], [4.9, shY + 2], [-4.9, shY + 2]], s2 = [[1.2, shY + 1], [4, shY + 1], [3.4, shY + 19], [.8, shY + 19]];
    PA(o.scarfD ?? 1, PC(s1)); PA(o.scarfD ?? 1, PC(s2)); A.scarf = [s1, s2];
    for (let i = 0; i < 4; i++) KO(.3, P([[1.4 + i * .5, shY + 4 + i * 3.6], [3.8 - i * .1, shY + 4.6 + i * 3.6]]));
    for (let i = 0; i < 4; i++) Lw(o.scarfD ?? 1, .3, P([[1 + i * .7, shY + 19], [1 + i * .7, shY + 20.6]]));
  }
  if (o.pack) { Lw(1, 1.5, P([[shX * .5, shY + .5], [shX * .4, shY + 17]])); KO(.4, R_(shX * .4 - 1.1, shY + 8, 2.2, 1.8)); }
  // ---- guns and things held (drawn under the front hand)
  if (o.gun === 'aim' || o.gun === 'port') {
    let pts = [[4, -79], [11, -79.6], [13, -76.2], [30, -76.6], [31, -79], [44, -78.8], [44.4, -77.2], [55, -77.2], [55, -75.6], [44.4, -75.6], [40, -74.2], [31, -74.2], [29.4, -70.4], [27, -64.6], [24, -65], [25, -71], [17, -72.2], [14.6, -68.6], [11.6, -68.8], [12.6, -73.2], [5.4, -74]];
    let tf = ([x, y]) => [x, y + dy];
    if (o.gun === 'port') { const a = -.82; tf = ([x, y]) => { const X = x - 20, Y = y + 74; return [-1 + (X * Math.cos(a) - Y * Math.sin(a)) * .9, -64 + dy + (X * Math.sin(a) + Y * Math.cos(a)) * .9]; }; }
    PA(1, PC(pts.map(tf))); KO(.35, P([[20, -75.4], [28, -75.4]].map(tf))); KO(.35, P([[33, -77.8], [43, -77.8]].map(tf))); KO(.3, P([[6, -77], [11, -77.4]].map(tf)));
    A.muzzle = tf([55.5, -76.4]);
  }
  if (o.gun === 'pistol') { const [x, y] = gF.wr; const q = [[x + 1, y - 2.4], [x + 10, y - 2.4], [x + 10, y - .6], [x + 4.4, y - .6], [x + 3.8, y + 3], [x + 1.4, y + 3], [x + 1.8, y - .6], [x + 1, y - .6]]; PA(1, PC(q)); KO(.3, P([[x + 4, y - 1.6], [x + 9, y - 1.6]])); A.muzzle = [x + 10.4, y - 1.5]; }
  // ---- front arm
  const hand = drawArm(gF, cl, true);
  if (hand) A.hand = hand;
  if (o.case && hand) { PA(1, R_(hand[0] - 5.5, hand[1] + 2.4, 11, 8)); Lw(1, .7, P([[hand[0] - 1.6, hand[1] + 2.4], [hand[0] - 1.6, hand[1] + .8], [hand[0] + 1.6, hand[1] + .8], [hand[0] + 1.6, hand[1] + 2.4]])); A.case = [hand[0], hand[1] + 6.4]; }
  if (o.card && hand) { KO(0, R_(hand[0] + .6, hand[1] - 4.2, 5.4, 3.4)); Lw(1, .3, R_(hand[0] + .6, hand[1] - 4.2, 5.4, 3.4)); Lw(1, .25, P([[hand[0] + 1.6, hand[1] - 2.6], [hand[0] + 4.8, hand[1] - 2.6]])); }
  // ---- head: a skull with a jaw and a chin, ears, a nose, eyes with an iris, brows, a mouth that has a mood
  const headP = () => { const j = jaw; c.moveTo(0, hY - 6.9); c.bezierCurveTo(4.2, hY - 6.9, 5.7, hY - 4.2, 5.6, hY - .6); c.bezierCurveTo(5.6, hY + 2.2, 4.6 * j, hY + 5.4, 2.5 * j, hY + 6.7); c.quadraticCurveTo(0, hY + 7.7, -2.5 * j, hY + 6.7); c.bezierCurveTo(-4.6 * j, hY + 5.4, -5.6, hY + 2.2, -5.6, hY - .6); c.bezierCurveTo(-5.7, hY - 4.2, -4.2, hY - 6.9, 0, hY - 6.9); c.closePath(); };
  PA(sk, E(-5.5, hY + .6, 1.15, 1.9)); PA(sk, E(5.5, hY + .6, 1.15, 1.9));   // ears
  Lw(.6, .3, P([[-5.7, hY - .2], [-5.1, hY + .8], [-5.7, hY + 1.6]])); Lw(.6, .3, P([[5.7, hY - .2], [5.1, hY + .8], [5.7, hY + 1.6]]));
  PA(sk, headP);
  c.save(); c.beginPath(); headP(); c.clip(); F(sk + .22, R_(1.5 + lx * .4, hY - 8, 8, 16)); F(sk + .14, R_(-6, hY + 4.6, 12, 3.4)); F(sk + .1, PC([[-5.6, hY - 1], [-4, hY - 1], [-4.4, hY + 4], [-5.6, hY + 3]])); c.restore();   // shade
  Lw(.8, .45, headP);
  if (o.stubble) F(.32, PC([[-5.4, hY + 1.2], [-4.8, hY + 4.6], [-2.5, hY + 6.8], [2.5, hY + 6.8], [4.8, hY + 4.6], [5.4, hY + 1.2], [3.6, hY + 3.7], [1.8, hY + 4.4], [-1.8, hY + 4.4], [-3.6, hY + 3.7]]));
  const mk_ = o.mask;
  if (o.hair !== 'balaclava') {
    const ey = hY - .5, bd = hd > .5 ? hd : .9;
    if (mk_ !== 'gas') {
      // eyes
      for (const sx of [-1, 1]) {
        const ex = sx * 2.25 + lx * .9;
        if (o.blink) { Lw(1, .55, P([[ex - 1.3, ey + .1], [ex, ey + .35], [ex + 1.3, ey + .1]])); continue; }
        KO(0, E(ex, ey, 1.3, .8)); F(.85, E(ex + lx * .5, ey, .7, .72)); F(1, E(ex + lx * .56, ey, .36));
        KO(0, E(ex + lx * .5 - .24, ey - .3, .17));   // the highlight
        Lw(1, .5, P([[ex - 1.45, ey + .15], [ex - .5, ey - .82], [ex + .6, ey - .86], [ex + 1.45, ey + .08]]));   // upper lid
        Lw(.4, .24, P([[ex - 1.2, ey + .72], [ex, ey + .96], [ex + 1.2, ey + .7]]));   // lower lid
        if (fem || o.lashes) Lw(1, .38, P([[ex + sx * 1.4, ey - .1], [ex + sx * 2.2, ey - .75]]));
        if (o.bags) Lw(.4, .26, P([[ex - 1.3, ey + 1.5], [ex, ey + 1.9], [ex + 1.3, ey + 1.45]]));
        if (mood === 'smile' || mood === 'grin') Lw(.55, .28, P([[ex - 1.2, ey + 1.1], [ex, ey + .8], [ex + 1.2, ey + 1.1]]));
      }
      // brows
      const bt = { stern: .6, calm: 0, smile: -.15, grin: -.2, worry: -.6, smirk: .25 }[mood] ?? 0;
      const bwid = { heavy: 1.2, flat: .95, arched: .5, soft: .75 }[o.brow ?? 'flat'], bar = o.brow === 'arched' ? 1 : .3;
      for (const sx of [-1, 1]) {
        const xi = sx * 1.2 + lx * 1.1, xo = sx * 4.3 + lx * .9, yb = hY - 2.9 - (o.brow === 'arched' ? .3 : 0);
        Lw(bd, bwid, P([[xi, yb + bt * 1.1], [lerp(xi, xo, .6), yb - bar - bt * .3], [xo, yb + .5 - bt * .2]]));
      }
      if (mood === 'stern' && !fem) { Lw(.4, .26, P([[-3 + lx, hY - 4.4], [3 + lx, hY - 4.4]])); Lw(.35, .24, P([[-2.2 + lx, hY - 5.1], [2.2 + lx, hY - 5.1]])); }
      if (o.glasses) { const ex1 = -2.25 + lx * .9, ex2 = 2.25 + lx * .9; Lw(1, .45, R_(ex1 - 1.9, ey - 1.4, 3.8, 2.8)); Lw(1, .45, R_(ex2 - 1.9, ey - 1.4, 3.8, 2.8)); Lw(1, .38, P([[ex1 + 1.9, ey - .6], [ex2 - 1.9, ey - .6]])); Lw(1, .32, P([[ex1 - 1.9, ey - .8], [-5.4, hY - .8]])); Lw(1, .32, P([[ex2 + 1.9, ey - .8], [5.4, hY - .8]])); }
    }
    if (!mk_) {
      // nose: bridge, tip, nostril, a shadow on the far side
      const nn = nose;
      F(sk + .26, PC([[lx + 1.3 * nn, hY - 1.2], [lx + 2.2 * nn, hY + 2.4], [lx + 1.2 * nn, hY + 3]]));
      Lw(.75, .5, P([[.3 + lx, hY - .6], [1.2 * nn + lx, hY + 2.6], [.1 + lx, hY + 3.1 + (nn - 1) * .4], [-.9 * nn + lx, hY + 2.7]]));
      F(.9, E(lx + .85 * nn, hY + 3.05, .3, .2));
      if (mood === 'stern' && o.brow === 'heavy') { Lw(.5, .26, P([[-2.2 + lx, hY + 2.2], [-2.1 + lx, hY + 4.5]])); Lw(.5, .26, P([[2.6 + lx, hY + 2.2], [2.5 + lx, hY + 4.5]])); }   // nasolabial lines
      // mouth
      if (mood === 'smile') { Lw(.9, .6, P([[-1.9 + lx, hY + 4.5], [lx - .2, hY + 5.25], [1.9 + lx, hY + 4.5]])); Lw(.55, .3, P([[-2.2 + lx, hY + 4.1], [-1.9 + lx, hY + 4.5]])); Lw(.55, .3, P([[2.2 + lx, hY + 4.1], [1.9 + lx, hY + 4.5]])); }
      else if (mood === 'grin') { F(.9, PC([[-2.1 + lx, hY + 4.4], [lx, hY + 5.5], [2.1 + lx, hY + 4.4], [lx, hY + 4.9]])); KO(0, PC([[-1.6 + lx, hY + 4.6], [lx, hY + 5.1], [1.6 + lx, hY + 4.6], [lx, hY + 4.78]])); Lw(.55, .3, P([[-2.5 + lx, hY + 4], [-2.1 + lx, hY + 4.4]])); Lw(.55, .3, P([[2.5 + lx, hY + 4], [2.1 + lx, hY + 4.4]])); }
      else if (mood === 'smirk') { Lw(.9, .55, P([[-1.5 + lx, hY + 5.15], [.4 + lx, hY + 5.05], [1.9 + lx, hY + 4.4]])); Lw(.5, .28, P([[2.2 + lx, hY + 4.1], [1.9 + lx, hY + 4.4]])); }
      else if (mood === 'worry') Lw(.85, .55, P([[-1.6 + lx, hY + 5.2], [lx, hY + 4.85], [1.6 + lx, hY + 5.2]]));
      else Lw(.9, .55, P([[-1.7 + lx, hY + 4.9], [lx - .3, hY + 5.05], [1.7 + lx, hY + 4.85]]));
      Lw(.4, .3, P([[-1.7 + lx, hY + 6.1], [1.7 + lx, hY + 6.1]]));   // under the lip
      if (o.cleft) Lw(.4, .26, P([[lx, hY + 6.3], [lx, hY + 7]]));
      A.face = { hY, lx };
    }
  }
  // hair in front
  const hp = pts => pts.map(([x, y]) => [x, y + hY]);
  switch (o.hair) {
    case 'crop': case 'grey':
      F(o.hair === 'grey' ? .45 : hd, PC(hp([[-5.8, .4], [-6, -3.6], [-4.7, -6.4], [-1.8, -7.8], [1.8, -7.8], [4.7, -6.4], [6, -3.6], [5.8, .4], [5.1, -2.4], [3.6, -4], [0, -4.5], [-3.6, -4], [-5.1, -2.4]])));
      for (let i = 0; i < 8; i++) KO(.22, P(hp([[-4.4 + i * 1.25, -5.6], [-3.9 + i * 1.25, -7]]))); KO(.28, P(hp([[-1.6, -7.7], [-.4, -5.6]])));   // a side parting
      F(hd, PC(hp([[-5.9, .4], [-5.3, 3], [-4.8, 1.4]]))); F(hd, PC(hp([[5.9, .4], [5.3, 3], [4.8, 1.4]]))); break;   // sideburns
    case 'swept':
      F(hd, PC(hp([[-5.9, .8], [-6.4, -3.8], [-5, -7.2], [-1.5, -9], [2.8, -9.1], [6.1, -7.2], [7, -3.4], [6.1, 0], [5.3, -2.6], [3.8, -4.2], [1.2, -4.5], [-.8, -3.4], [-2.6, -1.6], [-3.4, -3.4], [-4.9, -2.4]])));
      for (let i = 0; i < 6; i++) KO(.25, P(hp([[-3.8 + i * 1.8, -7.2], [-1.6 + i * 1.8, -5]])));
      F(hd, PC(hp([[-1.4, -4.5], [.8, -4], [-2.8, -.4]]))); F(hd, PC(hp([[2.8, -9], [4.6, -10], [5.4, -8.2]])));   // a flick
      F(hd, PC(hp([[-6, .8], [-5.4, 3.6], [-4.9, 1.6]]))); break;
    case 'slick':
      for (const s of [-1, 1]) F(hd * .6, PC(hp([[s * 5.8, .5], [s * 6.2, -3], [s * 5.4, -5.8], [s * 3.3, -7.1], [s * 3.4, -5.4], [s * 4.5, -3.6], [s * 4.9, -.4]])));
      for (let i = 0; i < 5; i++) Lw(hd * .55, .32, P(hp([[-3.2 + i * 1.6, -6.7], [-2.4 + i * 1.6, -7.1]])));
      F(hd * .5, PC(hp([[-5.5, -3], [-3.3, -6.6], [-2, -7.4], [-3.4, -4.6]]))); F(hd * .5, PC(hp([[5.5, -3], [3.3, -6.6], [2, -7.4], [3.4, -4.6]])));
      F(hd * .7, PC(hp([[-5.9, .6], [-6.3, 3.4], [-5.2, 4.6], [-4.9, 1.2]]))); F(hd * .7, PC(hp([[5.9, .6], [6.3, 3.4], [5.2, 4.6], [4.9, 1.2]])));
      F(hd * .45, PC(hp([[-3.4, -6.2], [0, -7.6], [3.4, -6.2], [0, -5.9]]))); break;
    case 'bun':
      F(hd, PC(hp([[-5.8, .4], [-5.9, -3.8], [-4.3, -6.6], [-.8, -7.6], [2.8, -7.2], [5.3, -5.4], [6, -2.4], [5.7, .4], [4.7, -3.2], [2.4, -4.8], [-.6, -5.2], [-3.7, -4.2], [-5, -2.2]])));
      F(hd, PC(hp([[-5.6, -2], [-2, -5.6], [1.6, -6.2], [4.4, -4.6], [2.4, -4.4], [-.8, -4.6], [-3.6, -3.4], [-5.4, .6]])));   // a swept fringe
      KO(.3, P(hp([[-1.6, -7.3], [-.4, -5.2]]))); for (let i = 0; i < 5; i++) KO(.2, P(hp([[.4 + i, -6.9], [1.8 + i, -4.8]])));
      Lw(hd, .55, P(hp([[5.2, -3], [5.9, 2], [5.4, 6.4]])));   // a loose strand
      F(hd, PC(hp([[5.8, .4], [5.2, 3.4], [4.8, 1.2]]))); break;
    case 'bob':
      F(hd, PC(hp([[-6.7, 5], [-7.1, -2], [-5.5, -7], [0, -8.7], [5.5, -7], [7.1, -2], [6.7, 5], [5, 5.3], [5.4, 0], [4.7, -3.4], [1, -4.7], [-4.7, -3.4], [-5.4, 0], [-5, 5.3]])));
      for (let i = 0; i < 6; i++) KO(.22, P(hp([[-4.2 + i * 1.7, -7.4], [-4.8 + i * 1.8, -4]]))); break;
    case 'cap':
      F(.45, E(-5.4, hY - .4, 1, 2.2)); F(.45, E(5.4, hY - .4, 1, 2.2));
      F(1, PC(hp([[-6.1, -2.6], [-5.7, -6.6], [-2, -8.2], [3.2, -8], [5.9, -5.8], [6.4, -3.4], [9.6, -2.8], [9.6, -2], [5.9, -1.8], [-6, -1.8]])));
      KO(.3, P(hp([[-5.5, -3.6], [6, -3.4]]))); KO(.25, P(hp([[0, -8.1], [.6, -3.6]]))); F(1, E(0, hY - 8.3, .7)); break;
    case 'helmet':
      F(1, () => { c.ellipse(0, hY - 1, 7.4, 8.8, 0, Math.PI, 0); c.lineTo(7.4, hY + .2); c.lineTo(-7.4, hY + .2); c.closePath(); });
      KO(.45, P(hp([[-7.1, -.9], [7.1, -.9]]))); KO(.3, P(hp([[-4, -6.8], [4, -6.8]]))); F(1, R_(-1.8, hY - 10.8, 3.6, 2.6)); KO(.3, R_(-1.2, hY - 10.2, 2.4, 1.2));
      F(1, E(-5.7, hY + .4, 1.9, 2.4)); F(1, E(5.7, hY + .4, 1.9, 2.4));
      Lw(1, .6, P(hp([[-5.5, 1.6], [-2.6, 6.5], [2.6, 6.5], [5.5, 1.6]]))); break;
    case 'balaclava':
      F(1, E(0, hY + .2, 5.9, 7)); KO(0, R_(-3.8 + lx, hY - 1.9, 7.6, 2.6));
      for (const sx of [-1, 1]) F(1, E(sx * 2.05 + lx * 1.25, hY - .6, .55)); break;
  }
  if (mk_ === 'gas') {
    F(1, PC([[-5.1, hY - .2], [5.1, hY - .2], [4.5, hY + 4.8], [0, hY + 7.6], [-4.5, hY + 4.8]]));
    F(1, E(lx * .6, hY + 5.4, 2.8, 2.3)); KO(.45, E(lx * .6, hY + 5.4, 1.7, 1.3)); KO(.3, E(lx * .6, hY + 5.4, .6, .5));
    for (const sx of [-1, 1]) { F(1, E(sx * 2.25 + lx, hY - 1.6, 2, 1.7)); KO(.35, () => c.arc(sx * 2.25 + lx - .4, hY - 2, 1, 3.6, 4.8)); }
    Lw(1, .9, P([[-5.6, hY - 1.4], [-6.6, hY - 2.6]])); Lw(1, .9, P([[5.6, hY - 1.4], [6.6, hY - 2.6]]));
  }
  if (mk_ === 'oxy') {
    F(1, PC([[-2.8 + lx, hY + 1.2], [2.8 + lx, hY + 1.2], [3.2 + lx, hY + 4], [lx, hY + 5.6], [-3.2 + lx, hY + 4]])); for (let i = 0; i < 3; i++) KO(0, E(-1 + i + lx, hY + 3.4, .32));
    Lw(1, 1.1, P([[2.8 + lx, hY + 4], [6.6, hY + 7.4], [8.2, hY + 12.6]])); KO(.25, P([[3.4 + lx, hY + 4.6], [6.2, hY + 7.6]]));
    Lw(1, .45, P([[-5.3, hY], [-2.8 + lx, hY + 2]])); Lw(1, .45, P([[5.3, hY], [2.8 + lx, hY + 2]]));
  }
  if (o.earrings) { F(1, E(-5.5, hY + 2.9, .5, .75)); F(1, E(5.5, hY + 2.9, .5, .75)); A.earrings = [[-5.5, hY + 2.9], [5.5, hY + 2.9]]; }
  A.head = [0, hY]; A.chest = [0, shY + 8]; if (A.face) A.ears = [[-5.5, hY + .6], [5.5, hY + .6]];
}

// who is who: a recurring cast gets the same face, brows and bearing in every shot
const WHO = {
  prot: { brow: 'flat', mood: 'stern', cleft: true },
  sator: { brow: 'heavy', mood: 'smirk', jaw: 1.3, nose: 1.3, bags: true },
  neil: { brow: 'soft', mood: 'grin' },
  kat: { fem: true, brow: 'arched', mood: 'calm', jaw: .86, lashes: true },
};
// draw one person: knocked out of every plate (a paper fringe), inked on plate p (and overprinted on o.over)
function figure(p, x, y, h, o = {}) {
  if (!o.fixedY && y > 940) y -= 70;                          // feet stay above the subtitle bar
  const who = o.who ?? (o.coat === 'overcoat' && o.hair === 'slick' ? 'sator' : o.coat === 'linen' && o.hair === 'swept' ? 'neil' : o.coat === 'trench' && o.hair === 'bun' ? 'kat' : o.coat === 'suit' && o.hair === 'crop' ? 'prot' : null);
  if (who) o = { ...WHO[who], ...o };
  const ph0 = T * 2.2 + x * .013;
  if (o.walk === undefined && !o.armF) o = { ...o, armF: [Math.sin(ph0) * .05, .22], armB: [-Math.sin(ph0) * .05, .22] };   // breathing
  if (o.blink === undefined) o = { ...o, blink: (T * .9 + x * .0037) % 3 < .12 };
  if (o.walk === undefined) y += Math.sin(ph0) * 1.3 * (h / 400);
  const f = o.face ?? 1, s = h / 100, A = {};
  const [ax, ay] = scr(x - h * .7, y - h * 1.12), [bx, by] = scr(x + h * .7, y + h * .1);
  const X0 = Math.max(0, Math.floor(ax) - 10), Y0 = Math.max(0, Math.floor(ay) - 10), X1 = Math.min(W, Math.ceil(bx) + 10), Y1 = Math.min(H, Math.ceil(by) + 10);
  const over = o.over || [], mul = 1 - (o.lift ?? 0);
  const L2 = ([u, v]) => [x + f * s * u, y + s * v];
  if (X1 > X0 && Y1 > Y0) {
    if (!o.seated && !o.noShadow) fill(p === 'K' ? 'K' : 'B', .24 * mul, ell(x, y + 2, h * .26, h * .03));   // a shadow to stand on
    MC.save(); MC.setTransform(1, 0, 0, 1, 0, 0); MC.clearRect(X0, Y0, X1 - X0, Y1 - Y0); MC.restore();
    MC.save(); MC.translate(x, y); MC.scale(f * s, s); person(MC, o, {}, true); MC.restore();
    const halo = o.halo ?? 4, self = o.selfHalo ?? 2.2;
    for (const q of PLATES) {
      const own = q === p || over.includes(q);
      const hh = own ? self : halo, offs = hh ? [[-hh, 0], [hh, 0], [0, -hh], [0, hh]] : [[0, 0]];
      const c = PL[q]; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-out';
      for (const [dx, dy] of offs) c.drawImage(MC.canvas, X0, Y0, X1 - X0, Y1 - Y0, X0 + dx, Y0 + dy, X1 - X0, Y1 - Y0);
      c.restore();
    }
    PL[p].save(); PL[p].translate(x, y); PL[p].scale(f * s, s); person(PL[p], o, A, false, mul); PL[p].restore();
    for (const q of over) { PL[q].save(); PL[q].translate(x, y); PL[q].scale(f * s, s); person(PL[q], o, {}, false, mul * (o.overD ?? 1)); PL[q].restore(); }
    // colour on the other plates: pink cheeks and lips, a sunflower scarf, watch, buckle and earrings
    const acc = (pl, d, shape) => fill(pl, d * mul, shape);
    if (A.face && o.pinkSkin !== false && !over.includes('K') && p !== 'K' && !o.mask && o.hair !== 'balaclava') {
      const { hY: fy, lx: fl } = A.face;
      for (const sx of [-1, 1]) { const [cx, cy] = L2([sx * 3.1 + fl * .5, fy + 2.5]); acc('K', .26, ell(cx, cy, 1.8 * s, 1.2 * s)); }
      const [lxp, lyp] = L2([fl, fy + 5.05]); acc('K', o.fem ? .95 : .6, ell(lxp, lyp, 1.5 * s, .55 * s));
      const [nxp, nyp] = L2([.9 + fl, fy + 2.8]); acc('K', .24, ell(nxp, nyp, .9 * s, .7 * s));
      for (const e of A.ears || []) { const [ex, ey] = L2(e); acc('K', .3, ell(ex, ey, 1 * s, 1.8 * s)); }
    }
    if (A.scarf && p === 'B') {
      for (const pg of A.scarf) { const pts = pg.map(L2); knock(['B'], poly(pts)); acc('S', .95, poly(pts)); }
      const [a, b, c2, d] = A.scarf[1].map(L2);
      for (const t_ of [.2, .5, .8]) { const l0 = [lerp(a[0], d[0], t_), lerp(a[1], d[1], t_)], r0 = [lerp(b[0], c2[0], t_), lerp(b[1], c2[1], t_)]; stroke('B', mul, .9 * s, path([l0, r0])); }
    }
    if (A.tie && !over.includes('K') && p === 'B') acc('K', .8, poly(A.tie.map(L2)));
    if (A.watch) { const [wx, wy] = L2(A.watch); knock(['B'], ell(wx, wy, 2.1 * s, 1.4 * s)); acc('S', 1, ell(wx, wy, 1.8 * s, 1.1 * s)); }
    if (A.buckle) { const [bxp, byp] = L2(A.buckle); knock(['B'], ell(bxp, byp, 2.3 * s, 1.6 * s)); acc('S', 1, ell(bxp, byp, 1.9 * s, 1.3 * s)); }
    for (const e of A.earrings || []) { const [ex, ey] = L2(e); knock(['B'], ell(ex, ey, .9 * s, 1.1 * s)); acc('S', 1, ell(ex, ey, .6 * s, .9 * s)); }
  }
  const wa = k => A[k] && [x + f * s * A[k][0], y + s * A[k][1]];
  if (o.trinket && A.trinket) trinket(...wa('trinket'), s * 1.1, o.lift ?? 0);
  if (o.ring && A.hand) { const [hx, hy] = wa('hand'); knock(['B', 'K'], ell(hx, hy, s * 1.1)); fill('S', 1, ell(hx, hy, s * .85)); }
  return { muzzle: wa('muzzle'), hand: wa('hand'), head: wa('head'), case: wa('case'), chest: wa('chest'), s };
}
// the orange trinket: sunflower overprinted with a little pink, on a blue cord, with a tassel
function trinket(x, y, s, lift = 0, big = 1) {
  const r = 2 * s * big, a = 1 - lift * .3;
  knock(['B'], ell(x, y + r * .2, r * 1.7, r * 2.2));
  stroke('B', a, .45 * s * big, path([[x, y - r * 3], [x, y - r]]));
  fill('B', a, ell(x, y - r * 1.15, r * .35, r * .3));
  fill('S', a, ell(x, y, r, r)); fill('K', .4 * a, ell(x, y, r, r));
  knock(['S', 'K'], ell(x, y, r * .4, r * .4));
  for (let i = -2; i <= 2; i++) { stroke('S', a, .32 * s * big, path([[x + i * r * .15, y + r * .9], [x + i * r * .3, y + r * 2.5]])); stroke('K', .4 * a, .32 * s * big, path([[x + i * r * .15, y + r * .9], [x + i * r * .3, y + r * 2.5]])); }
}

// ---------------------------------------------------------------- props and sets
function stars(n, seed, y1 = 700, ps = ['B']) { const r = rng(seed); for (let i = 0; i < n; i++) { const x = r() * (W + 300) - 150, y = r() * (y1 + 150) - 150, s = .8 + r() * 2.4; knock(ps, ell(x, y, s, s)); } }
function sparks(n, seed, x0, x1, y0, rise, p = 'S', big = 4) {   // embers rising and fading
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const ph = (T * (.15 + r() * .25) + r()) % 1, x = x0 + (x1 - x0) * r() + Math.sin(T * 2 + i) * 14, y = y0 - ph * rise, a = 1 - ph, q = 1.5 + r() * big * a; if (a > .05) fill(p, a, ell(x, y, q, q)); }
}
function ambient(t, i) {   // drifting paper flecks (a knockout in the blue plate)
  const r = rng(i * 31 + 5);
  for (let k = 0; k < 70; k++) { const x = ((r() * W + t * (6 + r() * 14) * (k % 2 ? 1 : -1)) % W + W) % W, y = ((r() * H + t * (4 + r() * 8)) % H + H) % H, q = .8 + r() * 1.8; knock(['B'], ell(x, y, q, q)); }
}
function statue(x, y, s = 1) {
  fill('B', 1, rect(x - 16 * s, y - 12 * s, 32 * s, 12 * s));
  fill('B', 1, poly([[x - 7 * s, y - 12 * s], [x + 7 * s, y - 12 * s], [x + 5 * s, y - 52 * s], [x - 5 * s, y - 52 * s]]));
  fill('B', 1, ell(x, y - 59 * s, 6 * s, 7 * s));
  for (const f of [-1, 1]) fill('B', 1, poly([[x + f * 4 * s, y - 46 * s], [x + f * 30 * s, y - 80 * s], [x + f * 26 * s, y - 56 * s], [x + f * 36 * s, y - 62 * s], [x + f * 9 * s, y - 34 * s]]));
  stroke('B', 1, 3 * s, path([[x + 5 * s, y - 50 * s], [x + 15 * s, y - 84 * s]]));
}
function lamp(x, gy, h = 300) {
  stroke('B', 1, 9, path([[x, gy], [x, gy - h]])); fill('B', 1, rect(x - 16, gy - 30, 32, 30)); fill('B', 1, rect(x - 10, gy - 70, 20, 40)); knock(['B'], rect(x - 6, gy - 64, 12, 3));
  stroke('B', 1, 5, path([[x, gy - h + 12], [x + 36, gy - h - 12], [x + 70, gy - h + 4]]));
  rgrad('S', x + 70, gy - h + 34, 110, [[0, .5], [1, 0]], ell(x + 70, gy - h + 34, 110));
  fill('B', 1, poly([[x + 56, gy - h + 4], [x + 84, gy - h + 4], [x + 92, gy - h + 18], [x + 48, gy - h + 18]]));
  knock(['B'], rect(x + 58, gy - h + 18, 24, 28)); fill('S', 1, rect(x + 58, gy - h + 18, 24, 28)); stroke('B', 1, 2, path([[x + 70, gy - h + 18], [x + 70, gy - h + 46]])); fill('B', 1, rect(x + 54, gy - h + 46, 32, 6));
}
function van(x, gy, f, t, k = 1) {
  const L = LT(x, gy, k, f);
  L.paint('B', .96, [[0, -30], [0, -150], [10, -164], [176, -164], [204, -118], [240, -104], [244, -30]], ['S', 'K']);
  L.ko(['B'], [[180, -156], [198, -122], [180, -122]]); L.ko(['B'], [[20, -150], [70, -150], [70, -112], [20, -112]]); L.ko(['B'], [[80, -150], [168, -150], [168, -112], [80, -112]]);
  for (const u of [70, 172]) L.ko(['B'], [[u, -110], [u, -34]], 2);
  L.ko(['B'], [[150, -84], [164, -84]], 3); L.ko(['B'], [[6, -60], [236, -60]], 1.5);
  L.ko(['B'], [[232, -92], [242, -92], [242, -80], [232, -80]]); L.poly('S', 1, [[232, -92], [242, -92], [242, -80], [232, -80]]);
  const on1 = Math.floor(t * 4) % 2;
  L.paint('K', on1 ? 1 : .35, [[60, -164], [96, -164], [96, -176], [60, -176]], ['B']); L.paint('S', on1 ? .35 : 1, [[100, -164], [136, -164], [136, -176], [100, -176]], ['B']);
  wheel(L, 50, -30, 26, t * 3); wheel(L, 196, -30, 26, t * 3);
  L.ko(['B'], [[236, -50], [244, -50], [244, -36], [236, -36]]);
}
function bullet(x, y, a, len, p = 'K') {   // a cartridge pointing along a (rad)
  const m = ([u, v]) => [x + Math.cos(a) * u - Math.sin(a) * v, y + Math.sin(a) * u + Math.cos(a) * v];
  const P_ = pts => poly(pts.map(m)), k = len / 100;
  knock(PLATES.filter(q => q !== p), P_([[-6 * k, -16 * k], [104 * k, -16 * k], [104 * k, 16 * k], [-6 * k, 16 * k]]));
  paint(p, .55, P_([[0, -11 * k], [58 * k, -11 * k], [58 * k, 11 * k], [0, 11 * k]]));
  fill(p, 1, P_([[58 * k, -10 * k], [80 * k, -8 * k], [100 * k, 0], [80 * k, 8 * k], [58 * k, 10 * k]]));
  for (const u of [8, 50]) knock([p], path([[u * k, -11 * k], [u * k, 11 * k]].map(m)), 2.2 * k);
  knock([p], path([[62 * k, -4 * k], [86 * k, -2.4 * k]].map(m)), 2.4 * k);
  fill(p, 1, P_([[-3 * k, -12 * k], [3 * k, -12 * k], [3 * k, 12 * k], [-3 * k, 12 * k]]));
}
function burst(x, y, r, n = 9, seed = 1, p1 = 'S', p2 = 'K') {   // a stylised flash (no gore): sunflower with a pink core = orange
  if (r <= 1) return;
  const R_ = rng(seed); const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, rr = i % 2 ? r * (.42 + R_() * .15) : r * (.85 + R_() * .3); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  knock(['B'], poly(pts)); fill(p1, 1, poly(pts)); fill(p2, .45, ell(x, y, r * .45, r * .45));
}
function blueprintGrid(d = .82) {
  fill('B', d, rect(-200, -200, W + 400, H + 400));
  for (let x = 0; x <= W; x += 40) knock(['B'], path([[x, -200], [x, H + 200]]), x % 200 ? .8 : 2);
  for (let y = 0; y <= H; y += 40) knock(['B'], path([[-200, y], [W + 200, y]]), y % 200 ? .8 : 2);
}
function blocks(x0, x1, gy, seed, d = .9, hmin = 160, hmax = 330, ruined = false) {   // Soviet-era panel blocks: window grids, some broken
  const r = rng(seed); let x = x0;
  while (x < x1) {
    const w = 110 + r() * 120, h = hmin + r() * (hmax - hmin);
    const top = [];
    if (ruined) { const n = 5; for (let i = 0; i <= n; i++) top.push([x + w * i / n, gy - h + (r() < .5 ? r() * 70 : 0)]); }
    else top.push([x, gy - h], [x + w, gy - h]);
    fill('B', d, poly([[x, gy], ...top, [x + w, gy]]));
    for (let wy = gy - h + 26; wy < gy - 24; wy += 30) for (let wx = x + 12; wx < x + w - 18; wx += 24) {
      if (ruined && r() < .25) continue;
      knock(['B'], rect(wx, wy, 12, 15)); if (r() < .12) fill('S', .7, rect(wx, wy, 12, 15));
    }
    x += w + 6 + r() * 30;
  }
}
function crowdRow(x0, x1, y, size, d, seed) { const r = rng(seed); for (let x = x0; x < x1; x += size * 2.3) { const yy = y + r() * 4; paint('B', d, ell(x, yy - size * 1.3, size * .62, size * .72)); paint('B', d, poly([[x - size, yy + size * .4], [x - size * .7, yy - size * .4], [x + size * .7, yy - size * .4], [x + size, yy + size * .4]])); } }
function plane(x, y, k, t) {   // a generic wide-body airliner, side view, facing right
  const L = LT(x, y, k);
  const hull = [[0, -26], [30, -46], [520, -50], [580, -44], [612, -28], [620, -14], [604, -4], [560, 2], [40, 0], [8, -10]];
  L.paint('B', .12, hull, ['S', 'K']); L.line('B', 1, 3, [...hull, hull[0]]);
  L.paint('B', 1, [[2, -26], [10, -118], [44, -118], [84, -46]]);   // tail fin
  L.ko(['B'], [[16, -108], [38, -108]], 3); L.ko(['B'], [[14, -94], [44, -94]], 2);
  L.paint('B', .8, [[20, -30], [70, -30], [72, -22], [10, -22]]);
  for (let i = 0; i < 34; i++) L.ell('B', 1, 104 + i * 13.4, -32, 3.2, 4.2);   // windows
  L.paint('B', 1, [[584, -38], [600, -36], [606, -30], [586, -30]]);   // cockpit
  L.line('B', 1, 2, [[240, -48], [240, 0]]); L.line('B', 1, 2, [[470, -50], [470, 0]]);
  L.line('B', .6, 1.5, [[60, -14], [600, -14]]);
  L.paint('B', .9, [[300, -14], [400, -16], [210, 46], [180, 46]]);   // wing
  L.ko(['B'], [[260, 8], [360, -12]], 1.6);
  for (const u of [262, 340]) { L.paint('B', 1, [[u, 6], [u + 64, 6], [u + 70, 26], [u - 2, 26]]); L.koE(['B'], u + 66, 16, 6, 9); L.ell('B', .5, u + 66, 16, 4, 7); }
  L.line('B', 1, 3, [[120, 2], [120, 24]]); L.line('B', 1, 3, [[540, 2], [540, 24]]);
  wheel(L, 116, 30, 9, t); wheel(L, 132, 30, 9, t); wheel(L, 538, 30, 8, t);
}
function car(x, gy, len, p, f, t, o = {}) {
  const L = LT(x, gy, len / 100, f);
  const halo = PLATES.filter(q => q !== p);
  L.paint(p, o.d ?? .95, [[0, -10], [2, -22], [20, -25], [34, -38], [70, -39], [84, -26], [98, -23], [100, -12], [100, -8], [0, -8]], halo);
  L.ko([p], [[37, -35], [51, -35.6], [51, -26], [31, -26]]); L.ko([p], [[54, -35.6], [68, -35], [79, -26], [54, -26]]);
  L.ko([p], [[52.5, -26], [52.5, -10]], .8); L.ko([p], [[30, -26], [30, -10]], .8); L.ko([p], [[2, -17], [99, -17]], .7);
  L.ko([p], [[44, -21], [48, -21]], 1); L.ko([p], [[64, -21], [68, -21]], 1);
  L.ko(PLATES, [[96, -22], [100, -22], [100, -17], [96, -17]]); L.poly('S', 1, [[96, -22], [100, -22], [100, -17], [96, -17]]);
  L.ko(PLATES, [[0, -21], [3, -21], [3, -16], [0, -16]]); L.poly('K', 1, [[0, -21], [3, -21], [3, -16], [0, -16]]);
  const rot = (o.back ? -1 : 1) * t * 9;
  wheel(L, 20, -8, 8.5, rot, p); wheel(L, 80, -8, 8.5, rot, p);
}
function helo(x, y, k, t) {   // a generic twin-rotor transport helicopter
  const L = LT(x, y, k);
  L.paint('B', 1, [[0, -10], [10, -30], [180, -34], [214, -26], [220, -6], [206, 10], [16, 10]], ['S', 'K']);
  L.paint('B', 1, [[0, -24], [10, -54], [30, -54], [40, -30]]); L.paint('B', 1, [[186, -30], [196, -52], [214, -52], [216, -26]]);
  for (let i = 0; i < 9; i++) L.ko(['B'], [[40 + i * 16, -22], [50 + i * 16, -22], [50 + i * 16, -12], [40 + i * 16, -12]]);
  L.ko(['B'], [[200, -22], [214, -20], [214, -10], [202, -10]]);
  for (const u of [20, 205]) { const a = t * 30; L.ell('B', .25, u, -56, 120, 8); L.line('B', 1, 3, [[u - Math.cos(a) * 118, -56], [u + Math.cos(a) * 118, -56]]); }
  L.line('B', 1, 2, [[40, 10], [40, 20], [180, 20], [180, 10]]);
}
function profileHead(x, y, s, p = 'B') {   // an original profile, facing right: forehead, nose, lips, chin
  const L = LT(x, y, s);
  const pts = [[-40, -60], [-20, -82], [10, -86], [32, -74], [40, -52], [42, -36], [52, -20], [44, -14], [44, -6], [48, 0], [42, 6], [40, 16], [30, 28], [12, 30], [0, 40], [0, 90], [-46, 90], [-50, 30], [-60, -10], [-56, -40]];
  L.paint(p, .16, pts, ['S', 'K']); L.line(p, 1, 2.2, [...pts, pts[0]]);
  L.paint(p, 1, [[-56, -40], [-44, -70], [-20, -86], [12, -88], [30, -78], [34, -66], [18, -72], [-6, -66], [-22, -60], [-30, -36], [-40, -20], [-56, -10]]);   // hair
  L.ell(p, .45, -26, -14, 8, 12); L.line(p, 1, 2, [[-30, -20], [-28, -6], [-22, -4]]);   // ear
  L.line(p, 1, 4, [[18, -44], [32, -44]]); L.ell(p, 1, 28, -36, 3.2, 3);   // brow, eye
  L.line(p, 1, 2, [[34, 6], [40, 8]]); L.poly(p, .38, [[42, -36], [52, -20], [44, -14]]);
  L.poly(p, .3, [[-50, 30], [0, 40], [0, 90], [-46, 90]]);
  for (let i = 0; i < 30; i++) { const r = rng(i + 400); L.ell(p, .5, -10 + r() * 46, 8 + r() * 18, .9); }   // stubble
}

// ---------------------------------------------------------------- the shots
function shTitle(t, u) {   // 1 · WHAT IF... : a clock running backward, the old weapons crossed out
  fill('B', .94, rect(-200, -200, W + 400, H + 400));
  stars(60, 3, 1080);
  const cx = 960, cy = 600, R = 250;
  knock(['B'], ring(cx, cy, R - 20, R));
  for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r0 = R - 36, r1 = R - (i % 5 ? 48 : 74); knock(['B'], path([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]]), i % 5 ? 4 : 11); }
  for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU - Math.PI / 2; knockText(['B'], String(i), cx + Math.cos(a) * (R - 106), cy + Math.sin(a) * (R - 106) + 12, '700 34px Jost'); }
  const am = -t * 2.4 - .6, ah = -t * .32 + 2.1;
  for (const [a, len, w] of [[ah, 120, 16], [am, 190, 9]]) { const p0 = [cx - Math.cos(a) * 26, cy - Math.sin(a) * 26], p1 = [cx + Math.cos(a) * len, cy + Math.sin(a) * len]; knock(['B'], path([p0, p1]), w + 10); stroke('K', 1, w, path([p0, p1])); }
  knock(['B'], ell(cx, cy, 20)); fill('K', 1, ell(cx, cy, 14));
  for (let i = 0; i < 3; i++) { const a0 = -1.2 + i * 2.1 - t * .8; knock(['B'], c => c.arc(cx, cy, R + 40, a0, a0 + 1.1), 20); on('K', c => { c.strokeStyle = '#000'; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy, R + 40, a0, a0 + 1.1); c.stroke(); }); fill('K', 1, poly([[cx + Math.cos(a0 - .1) * (R + 40), cy + Math.sin(a0 - .1) * (R + 40)], [cx + Math.cos(a0 + .05) * (R + 18), cy + Math.sin(a0 + .05) * (R + 18)], [cx + Math.cos(a0 + .05) * (R + 62), cy + Math.sin(a0 + .05) * (R + 62)]])); }
  // the old weapons: two missiles knocked out of the night, crossed out in pink
  for (const mx of [300, 1620]) {
    const L = LT(mx, 880, 1);
    L.ko(['B'], [[-34, 0], [-34, -330], [-22, -380], [0, -420], [22, -380], [34, -330], [34, 0]]);
    L.poly('B', .25, [[-34, 0], [-34, -330], [34, -330], [34, 0]]);
    for (const v of [-90, -200, -300]) L.line('B', 1, 3, [[-34, v], [34, v]]);
    L.poly('B', 1, [[-34, -60], [-70, 10], [-34, 0]]); L.poly('B', 1, [[34, -60], [70, 10], [34, 0]]); L.poly('B', .8, [[-8, -60], [8, -60], [8, 10], [-8, 10]]);
    L.line('B', 1, 2, [[0, -330], [0, -412]]);
    const k2 = ss(seg(T, Lt(1, .5), .7));
    if (k2 > 0) { stroke('K', 1, 22, path([[mx - 110, 470], [mx - 110 + 220 * k2, 470 + 400 * k2]])); stroke('K', 1, 22, path([[mx + 110, 470], [mx + 110 - 220 * k2, 470 + 400 * k2]])); }
  }
  knockText(['B'], 'WHAT IF TIME ITSELF', 960, 150, '800 104px Bricolage');
  knockText(['B'], 'WAS THE WEAPON?', 960, 262, '800 104px Bricolage');
  if (t > 1.4) { const k = ss(seg(t, 1.4, .5)); text('K', k, 'WHAT IF TIME ITSELF', 968, 156, '800 104px Bricolage'); text('K', k, 'WAS THE WEAPON?', 968, 268, '800 104px Bricolage'); }
}

function shOperaOut(t, u) {   // 2a · the opera house under siege, at night
  grad('B', 0, -200, 0, 860, [[0, 1], [1, .5]], rect(-300, -300, W + 600, 1170));
  stars(110, 11, 420);
  for (const [x0, a0, ph] of [[180, -1.15, 0], [1740, -1.95, 2], [980, -1.62, 4]]) { const a = a0 + Math.sin(t * .6 + ph) * .16; fill('S', .18, poly([[x0, 870], [x0 + Math.cos(a - .045) * 1500, 870 + Math.sin(a - .045) * 1500], [x0 + Math.cos(a + .045) * 1500, 870 + Math.sin(a + .045) * 1500]])); }
  const GY = 860;
  const sil = poly([[420, GY], [420, 450], [520, 450], [520, 360], [770, 360], [960, 252], [1150, 360], [1400, 360], [1400, 450], [1500, 450], [1500, GY]]);
  knock(['B', 'S'], sil); fill('B', .1, sil);
  fill('B', .55, poly([[790, 352], [960, 270], [1130, 352]])); stroke('B', 1, 7, path([[760, 362], [960, 256], [1160, 362]]));
  for (let i = 0; i < 9; i++) { const x = 840 + i * 30; fill('B', 1, ell(x, 336 - Math.max(0, 4 - Math.abs(i - 4)) * 8, 7, 11)); }   // relief figures in the pediment
  knock(['B'], ell(960, 316, 30, 20)); stroke('B', 1, 3, ell(960, 316, 30, 20));
  fill('B', 1, rect(500, 356, 920, 12)); fill('B', 1, rect(410, 446, 1100, 10));
  for (const [sx, sc] of [[540, 1], [1380, 1], [960, 1.25]]) statue(sx, sx === 960 ? 256 : 358, sc);
  for (let i = 0; i < 12; i++) { const x = 545 + i * 72; if (x > 760 && x < 1140) continue; fill('B', .95, rect(x, 384, 26, 42)); knock(['B'], rect(x + 4, 390, 18, 30)); fill('S', .5, rect(x + 4, 390, 18, 30)); }
  fill('B', .7, rect(470, 456, 980, 30)); for (let i = 0; i < 70; i++) knock(['B'], rect(474 + i * 14, 474, 7, 8));
  for (let i = 0; i < 8; i++) {
    const cx = 560 + i * 114;
    fill('B', 1, rect(cx - 32, 486, 64, 16)); fill('B', 1, ell(cx - 24, 494, 9, 7)); fill('B', 1, ell(cx + 24, 494, 9, 7));
    fill('B', .2, rect(cx - 22, 502, 44, 286)); fill('B', .55, rect(cx + 8, 502, 14, 286));
    for (let k = -2; k <= 2; k++) stroke('B', .8, 1.6, path([[cx + k * 7, 508], [cx + k * 7, 782]]));
    fill('B', 1, rect(cx - 32, 786, 64, 16));
  }
  for (let i = 0; i < 7; i++) { const cx = 617 + i * 114; fill('S', .65, archS(cx, 780, 56, 200)); knock(['S'], path([[cx, 590], [cx, 780]]), 3); knock(['S'], path([[cx - 28, 690], [cx + 28, 690]]), 3); stroke('B', 1, 4, archS(cx, 782, 60, 204)); fill('B', .85, rect(cx - 30, 600, 60, 8)); }
  for (const wx of [438, 1418]) for (let r = 0; r < 3; r++) { fill('S', .55, archS(wx + 32, 560 + r * 110, 34, 70)); stroke('B', 1, 3, archS(wx + 32, 562 + r * 110, 38, 74)); fill('B', 1, rect(wx + 8, 562 + r * 110, 48, 6)); }
  for (let k = 0; k < 6; k++) fill('B', .3 + k * .07, rect(470 - k * 16, 802 + k * 10, 980 + k * 32, 4));
  for (let i = 0; i < 40; i++) fill('B', 1, rect(470 + i * 24.5, 430, 4, 16));   // balustrade
  fill('B', .5, rect(-300, GY, W + 600, 400));
  const r = rng(5); for (let y = GY + 14; y < H + 60; y += 16) for (let x = -40 + (y % 32); x < W + 40; x += 34) knock(['B'], path([[x, y], [x + 16 + r() * 8, y]]), 1.6);
  lamp(300, GY + 40, 320); lamp(1560, GY + 40, 320);
  van(-60, 1000, 1, t, 1.1); van(1980, 1000, -1, t, 1.1);
  // the assault team walks to the doors; the Protagonist leads
  sparks(26, 3, 60, 360, 960, 380, 'S', 5); sparks(26, 4, 1560, 1860, 960, 380, 'S', 5);
  { const hx = lerp(-300, 2100, u); fill('S', .22, poly([[hx + 100, 150], [hx + 20, 900], [hx + 360, 900]])); helo(hx - 100, 110, 1.15, t);
    for (const [rx, ry] of [[500, 452], [1380, 452], [700, 364], [1190, 364]]) figure('B', rx, ry, 78, { coat: 'tactical', hair: 'helmet', gun: 'aim', armF: [1.15, .55], armB: [.95, .75], gloves: true, face: rx < 900 ? 1 : -1, halo: 2 }); }
  for (let i = 4; i >= 0; i--) {
    const x = 560 + i * 170 + t * 16, wph = t * 6.5 + i * 1.7;
    figure('B', x, 928 - i * 8, 352 - i * 16, { coat: 'tactical', hair: 'helmet', gun: 'port', gloves: true, walk: wph, stride: .85, face: 1, skin: .16, stubble: i === 0, look: .9, fixedY: true });
  }
  if (u > .25) tag('THE PROTAGONIST', 640, 520, 'B', 24);
  tag('KYIV · OPERA HOUSE', 60, 110, 'B', 30);
}

function shOperaIn(t, u) {   // 2b · inside: the masked soldier with the orange trinket
  fill('B', .8, rect(-300, -300, W + 600, H + 600));
  rgrad('S', 960, 110, 300, [[0, .5], [1, 0]], ell(960, 110, 300, 170));
  stroke('B', 1, 3, path([[960, -40], [960, 70]]));
  for (let rg = 0; rg < 3; rg++) for (let i = 0; i < 14 + rg * 4; i++) { const a = i / (14 + rg * 4) * TAU, x = 960 + Math.cos(a) * (40 + rg * 34), y = 96 + rg * 18 + Math.sin(a) * (10 + rg * 6); knock(['B'], ell(x, y, 4, 7)); fill('S', 1, ell(x, y, 3, 6)); }
  // the proscenium and the curtain
  knock(['B'], archS(960, 780, 880, 640));
  for (let i = 0; i < 22; i++) { const x = 520 + i * 40; fill('B', i % 2 ? .78 : .5, rect(x, 150, 40, 630)); knock(['B'], path([[x + 6, 160], [x + 6, 770]]), 1.2); }
  for (let i = 0; i < 11; i++) { const x = 520 + i * 80; knock(['B'], ell(x + 40, 168, 42, 26)); fill('B', .95, ell(x + 40, 162, 40, 24)); }
  stroke('B', 1, 36, archS(960, 790, 900, 656)); for (let i = 0; i < 40; i++) { const a = Math.PI + i / 39 * Math.PI; knock(['B'], ell(960 + Math.cos(a) * 450, 584 + Math.sin(a) * 450, 5, 5)); }
  fill('B', .35, rect(470, 760, 980, 40)); for (let x = 480; x < 1450; x += 60) knock(['B'], path([[x, 762], [x - 10, 798]]), 1.4);
  // balconies: three tiers each side, an audience peeking over the rails
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const y = 250 + k * 170, x0 = side < 0 ? -80 : 2000, x1 = side < 0 ? 470 : 1450;
    fill('B', .96, poly([[x0, y - 110], [x1, y - 76], [x1, y + 10], [x0, y]]));
    crowdRow(Math.min(x0, x1) + 40, Math.max(x0, x1) - 30, y - 20, 13, .5, 30 + k + side);
    stroke('B', 1, 26, path([[x0, y + 8], [lerp(x0, x1, .5), y + 30], [x1, y + 22]]));
    for (let i = 0; i <= 20; i++) { const q = i / 20, x = lerp(x0, x1, q), yy = lerp(y + 8, y + 22, q) + Math.sin(q * Math.PI) * 14; knock(['B'], ell(x, yy, 4, 4)); }
  }
  // the standoff: the Protagonist aims; a hostile aims back; the masked soldier steps in from the right
  figure('B', 690, 880, 390, { coat: 'tactical', hair: 'helmet', gun: 'aim', armF: [1.15, .55], armB: [.95, .75], gloves: true, stubble: true, face: 1, skin: .18 });
  figure('B', 1270, 860, 360, { coat: 'tactical', hair: 'balaclava', gun: 'aim', armF: [1.15, .55], armB: [.95, .75], gloves: true, face: -1, cloth: .9 });
  for (let row = 0; row < 2; row++) for (let i = 0; i < 20; i++) { const x = -40 + i * 102 + row * 50, y = 940 + row * 80; paint('B', .62, c => c.roundRect(x, y, 86, 90, 18), ['S', 'K']); knock(['B'], path([[x + 10, y + 26], [x + 76, y + 26]]), 2); knock(['B'], path([[x + 43, y + 30], [x + 43, y + 80]]), 1.4); }
  const mx = lerp(2160, 1640, ss(seg(t, 0, 1.6)));
  figure('B', mx, 1150, 720, { coat: 'tactical', hair: 'helmet', mask: 'gas', gun: 'aim', armF: [1.15, .55], armB: [.95, .75], gloves: true, pack: true, trinket: true, face: -1, cloth: .92 });
  if (u > .35) tag('THE MASKED SOLDIER', 1260, 230, 'B', 26);
  if (u > .5) tag('AN ORANGE TRINKET', 1560, 560, 'S', 22);
}

function shBullet(t, u) {   // 2c · the bullet flies backward: out of the wall and into the gun
  grad('B', 0, 0, W, 0, [[0, .78], [.5, .55], [1, .4]], rect(-300, -300, W + 600, H + 600));
  const wx = 1180;
  knock(['B'], rect(wx, -300, W, H + 600)); fill('B', .42, rect(wx, -300, W, H + 600));
  for (let r = 0; r < 20; r++) for (let i = 0; i < 9; i++) { const x = wx + i * 120 + (r % 2) * 60, y = -40 + r * 62; knock(['B'], path([[x, y], [x + 116, y]]), 2.4); knock(['B'], path([[x, y], [x, y + 62]]), 2.4); }
  const hx = 1460, hy = 470, cr = 1 - ss(seg(u, .05, .55));
  const rr = rng(7);
  for (let i = 0; i < 12; i++) { const a = rr() * TAU, l = (60 + rr() * 160) * cr; if (l > 2) stroke('K', 1, 4, path([[hx, hy], [hx + Math.cos(a) * l * .5, hy + Math.sin(a) * l * .5 + 8], [hx + Math.cos(a) * l, hy + Math.sin(a) * l]])); }
  const hole = 30 * cr + 6; fill('K', 1, poly(Array.from({ length: 14 }, (_, i) => { const a = i / 14 * TAU, r = hole * (i % 2 ? .6 : 1); return [hx + Math.cos(a) * r, hy + Math.sin(a) * r]; })));
  for (let i = 0; i < 30; i++) { const a = rr() * TAU, d0 = 60 + rr() * 300, d = d0 * (1 - ss(seg(u, 0, .45))); if (d > 4) fill('K', 1, ell(hx + Math.cos(a) * d, hy + Math.sin(a) * d * .8, 4 + rr() * 6, 3 + rr() * 4, rr() * 3)); }
  const m = figure('B', 300, 1260, 1140, { coat: 'tactical', hair: 'helmet', mask: 'gas', gun: 'aim', armF: [1.15, .55], armB: [.95, .75], gloves: true, pack: true, trinket: true, face: 1, cloth: .9, halo: 6 });
  const mz = m.muzzle || [900, 400];
  const bu = ss(seg(u, .2, .55));
  if (u > .2 && u < .76) {
    const bx = lerp(hx, mz[0] + 40, bu), by = lerp(hy, mz[1], bu), a = Math.atan2(hy - mz[1], hx - mz[0]);
    for (let i = 0; i < 6; i++) stroke('K', 1, 3, path([[bx + 120 + i * 4, by - 20 + i * 8], [bx + 260 + i * 18, by - 20 + i * 8 + Math.tan(a) * (140 + i * 14)]]));
    bullet(bx, by, a + Math.PI, 120, 'K');
  }
  if (u > .7 && u < .92) { const k = 1 - ss(seg(u, .7, .2)); burst(mz[0] + 20, mz[1], 40 + 60 * k, 8, 4, 'K', 'S'); }
  tag('THE BULLET RETURNS TO THE GUN', 1240, 200, 'K', 26);
}

function portraitScene(cfg, t, u) {   // a big bust on a sunburst, and a dossier card with the facts from the narration
  fill('B', .2, rect(-300, -300, W + 600, H + 600));
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + t * .04, b = a + TAU / 56; fill('B', .16, poly([[600, 420], [600 + Math.cos(a) * 1700, 420 + Math.sin(a) * 1700], [600 + Math.cos(b) * 1700, 420 + Math.sin(b) * 1700]])); }
  knock(PLATES, ell(600, 330, 340)); fill(cfg.accent, .5, ell(600, 330, 330)); stroke('B', 1, 10, ell(600, 330, 346));
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU + t * .1; knock(PLATES, ell(600 + Math.cos(a) * 372, 330 + Math.sin(a) * 372, 5)); fill(i % 2 ? 'B' : cfg.accent, 1, ell(600 + Math.cos(a) * 372, 330 + Math.sin(a) * 372, 3.4)); }
  figure('B', 600 + Math.sin(t * 1.3) * 6, 1880, 1800, { ...cfg.fig, fixedY: true, face: 1, halo: 8 });
  knock(PLATES, rect(1080, 100, 760, 800)); fill('B', 1, rect(1080, 100, 760, 14)); stroke('B', 1, 6, rect(1080, 100, 760, 800));
  tag(cfg.kicker, 1120, 190, cfg.accent === 'S' ? 'B' : 'K', 24);
  cfg.inks.forEach((c, i) => { const x = 1740 + i * 50; knock(PLATES, ell(x, 168, 20)); fill(c, 1, ell(x, 168, 15)); });
  cfg.name.forEach((s, i) => text('B', 1, s, 1120, 300 + i * 92, '800 84px Bricolage', 'left'));
  const y0 = 300 + (cfg.name.length - 1) * 92 + 40;
  stroke('B', 1, 4, path([[1120, y0 - 14], [1800, y0 - 14]]));
  cfg.facts.forEach(([k, v], i) => { const kk = ss(seg(u, .06 + i * .13, .12)); if (kk <= 0) return; const y = y0 + 40 + i * 88; text('B', kk, k, 1120, y, '600 22px Jost', 'left', undefined, 4); text('B', kk, v, 1120, y + 40, '600 36px Jost', 'left'); stroke('B', kk * .5, 2, path([[1120, y + 60], [1800, y + 60]]), [8, 8]); });
  tag('PROFILE', 80, 110, 'B', 26);
}
const PROTAG = { kicker: 'CIA · NO NAME ON FILE', name: ['THE', 'PROTAGONIST'], accent: 'S', inks: ['B'], facts: [['ROLE', 'CIA AGENT'], ['SURVIVES', 'THE KYIV SIEGE'], ['PASSES', 'A LETHAL LOYALTY TEST'], ['RECRUITED INTO', 'TENET'], ['MISSION', 'STOP INVERSION']], fig: { who: 'prot', coat: 'suit', hair: 'crop', tie: true, stubble: true, watch: true, look: .9, armF: [.5, 2.0], armB: [.05, .2] } };
const SATOR = { kicker: 'THE MAN BEHIND IT', name: ['ANDREI', 'SATOR'], accent: 'K', inks: ['B', 'K'], facts: [['ROLE', 'RUSSIAN OLIGARCH'], ['RECEIVES', 'INVERTED GOLD'], ['TAKES ORDERS FROM', 'FUTURE ANTAGONISTS'], ['HEALTH', 'DYING OF CANCER']], fig: { coat: 'overcoat', hair: 'slick', hairD: .9, build: 1.3, cloth: .9, tie: true, stubble: true, brows: 'stern', over: ['K'], overD: .75, ring: true, look: .9, armF: [.55, 1.5], armB: [.12, .2] } };
const NEIL = { kicker: 'A SHARP HANDLER', name: ['NEIL'], accent: 'S', inks: ['B', 'K'], facts: [['ROLE', 'HANDLER'], ['TEAMS UP WITH', 'THE PROTAGONIST'], ['CARRIES', 'AN ORANGE TRINKET'], ['IN THE END', 'GOES BACK, ON PURPOSE']], fig: { coat: 'linen', cloth: .48, hair: 'swept', scarf: true, scarfD: .95, rolled: true, pack: true, trinket: true, look: .9, armF: [.35, 2.2] } };
const KAT = { kicker: "SATOR'S ESTRANGED WIFE", name: ['KAT'], accent: 'K', inks: ['B'], facts: [['ROLE', 'TEAMS UP WITH THE PROTAGONIST'], ['KNOWS', 'SATOR BEST'], ['ON THE YACHT', 'STALLS HIM, THEN ENDS IT']], fig: { coat: 'trench', cloth: .7, hair: 'bun', hairD: .85, earrings: true, build: .92, look: .7, armF: [.45, 2.3], armB: [.3, 2.0] } };
const portrait = cfg => (t, u) => portraitScene(cfg, t, u);

function shLoyalty(t, u) {   // 3a · the loyalty test: the rails, the train, the pill
  const VY = 430;
  grad('B', 0, -200, 0, VY, [[0, 1], [1, .6]], rect(-300, -300, W + 600, VY + 300));
  stars(70, 21, 360);
  fill('B', .38, rect(-300, VY, W + 600, H));
  const r = rng(9); for (let i = 0; i < 260; i++) { const y = VY + Math.pow(r(), 1.7) * 700, x = r() * W; knock(['B'], ell(x, y, 1 + (y - VY) / 120, .6 + (y - VY) / 300)); }
  for (let i = 1; i < 28; i++) { const q = Math.pow(i / 28, 1.9), y = VY + 650 * q, w = 20 + 900 * q; fill('B', .95, poly([[960 - w / 2, y], [960 + w / 2, y], [960 + w / 2 * 1.02, y + 6 + 22 * q], [960 - w / 2 * 1.02, y + 6 + 22 * q]])); }
  for (const s of [-1, 1]) knock(['B'], poly([[960 + s * 6, VY], [960 + s * 9, VY], [960 + s * 330, H + 40], [960 + s * 300, H + 40]]));
  for (const [x, h] of [[740, 200], [1250, 260]]) { stroke('B', 1, 6, path([[x, VY + 20], [x, VY - h]])); fill('B', 1, rect(x - 16, VY - h - 50, 32, 60)); knock(['B'], ell(x, VY - h - 34, 11)); fill('S', 1, ell(x, VY - h - 34, 9)); knock(['B'], ell(x, VY - h - 14, 9)); fill('K', 1, ell(x, VY - h - 14, 7)); }
  const k = .12 + .5 * ss(u), tb = VY + 140 * k, tt_ = tb - 360 * k;
  fill('S', .2, poly([[960 - 60 * k, tb - 120 * k], [960 + 60 * k, tb - 120 * k], [960 + 700 * k, H + 100], [960 - 700 * k, H + 100]]));
  fill('B', 1, poly([[960 - 150 * k, tb], [960 - 140 * k, tt_ + 40 * k], [960 - 90 * k, tt_], [960 + 90 * k, tt_], [960 + 140 * k, tt_ + 40 * k], [960 + 150 * k, tb]]));
  knock(['B'], rect(960 - 110 * k, tt_ + 50 * k, 220 * k, 90 * k)); fill('B', .45, rect(960 - 110 * k, tt_ + 50 * k, 220 * k, 90 * k));
  for (const s of [-1, 1]) { knock(['B'], ell(960 + s * 90 * k, tb - 90 * k, 22 * k)); fill('S', 1, ell(960 + s * 90 * k, tb - 90 * k, 20 * k)); }
  for (let i = 0; i < 6; i++) knock(['B'], rect(960 - 120 * k, tb - 40 * k + i * 6 * k, 240 * k, 2.5 * k));
  // the chair and the Protagonist, tied
  const L = LT(470, 1020, 4.6);
  L.line('B', 1, 3.4, [[-6, 0], [-6, -62]]); L.line('B', 1, 3.4, [[-6, -28], [28, -28]]); L.line('B', 1, 3.2, [[26, -28], [26, 0]]);
  figure('B', 470, 1020, 460, { fixedY: true, seated: true, coat: 'suit', hair: 'crop', armF: [-.55, .25], armB: [-.5, .3], stubble: true, cloth: .85, face: 1, look: .4 });
  for (const yy of [-48, -42, -36]) L.ko(['B'], [[-10, yy], [12, yy - 1]], 1.4);
  // the pill, magnified
  const cx = 1460, cy = 360, R = 210;
  knock(PLATES, ell(cx, cy, R + 10)); stroke('B', 1, 12, ell(cx, cy, R));
  const a = -.5;
  const cap = (x0, x1) => c => { c.save(); c.translate(cx, cy); c.rotate(a); c.roundRect(x0, -48, x1 - x0, 96, 48); c.restore(); };
  fill('S', 1, cap(-150, 10)); fill('B', 1, cap(-10, 150)); knock(['S', 'B'], c => { c.save(); c.translate(cx, cy); c.rotate(a); c.roundRect(-120, -32, 220, 14, 7); c.restore(); });
  knock(['B'], c => { c.save(); c.translate(cx, cy); c.rotate(a); c.moveTo(0, -48); c.lineTo(0, 48); c.restore(); }, 4);
  stroke('B', .9, 4, path([[cx - R * .8, cy + R * .6], [560, 600]]), [12, 10]);
  tag('THE LOYALTY TEST', cx, cy + R + 64, 'B', 28, 'center');
}

function shRecruit(t, u) {   // 3b · he wakes at sea, and a handler shows him one word
  const HZ = 600;
  grad('B', 0, -100, 0, HZ, [[0, .42], [1, .05]], rect(-300, -300, W + 600, HZ + 300));
  rgrad('S', 1500, HZ, 320, [[0, .55], [.5, .25], [1, 0]], ell(1500, HZ, 320, 260)); fill('S', 1, ell(1500, HZ - 10, 70)); knock(['S'], rect(1400, HZ, 200, 100));
  for (const [x, h, ph] of [[220, 150, 0], [420, 110, 1], [620, 80, 2], [1080, 120, 3], [1260, 90, 4]]) {
    stroke('B', 1, 4 * h / 120, path([[x, HZ], [x, HZ - h]])); fill('B', 1, ell(x, HZ - h, 5 * h / 120));
    for (let i = 0; i < 3; i++) { const a = t * .9 + ph + i * TAU / 3; stroke('B', 1, 3 * h / 120, path([[x, HZ - h], [x + Math.cos(a) * h * .55, HZ - h + Math.sin(a) * h * .55]])); }
  }
  fill('B', .25, rect(-300, HZ, W + 600, H));
  const r = rng(13); for (let y = HZ + 6; y < H; y += 7 + (y - HZ) * .05) for (let i = 0; i < 6; i++) { const x = r() * W, w = 20 + (y - HZ) * .3 * r(); knock(['B'], path([[x, y], [x + w, y]]), 1 + (y - HZ) * .006); }
  for (let y = HZ + 10; y < 800; y += 14) { const w = 60 + Math.sin(y * .3 + t * 4) * 20; fill('S', .85, rect(1500 - w / 2, y, w, 4)); }
  fill('B', .92, rect(-300, 820, 520, 400)); for (let i = 0; i < 3; i++) { knock(['B'], ell(-60 + i * 90, 900, 22)); stroke('B', 1, 4, ell(-60 + i * 90, 900, 22)); }
  knock(['B'], rect(-300, 960, W + 600, 300)); fill('B', .55, rect(-300, 960, W + 600, 300)); for (let x = -300; x < W + 300; x += 90) knock(['B'], path([[x, 960], [x - 40, H + 20]]), 2);
  stroke('B', 1, 10, path([[-300, 820], [W + 300, 820]])); stroke('B', 1, 4, path([[-300, 880], [W + 300, 880]]));
  for (let x = -280; x < W + 300; x += 120) stroke('B', 1, 6, path([[x, 820], [x, 960]]));
  figure('B', 760, 1010, 450, { coat: 'suit', hair: 'crop', tie: false, stubble: true, armF: [.2, .5], face: 1, cloth: .85 });
  figure('B', 1160, 1010, 430, { coat: 'peacoat', hair: 'cap', cloth: .95, stubble: true, glasses: true, armF: [1.3, .2], card: true, face: -1, smile: true });
  const k = ss(seg(u, .15, .3));
  if (k > 0) {
    knockText(['B', 'S'], 'TENET', 960, 300, '800 230px Bricolage', 'center', 18);
    text('B', k, 'TENET', 960, 300, '800 230px Bricolage', 'center', undefined, 18);
    const k2 = ss(seg(u, .5, .3));
    if (k2 > 0) on('K', c => { c.translate(960, 0); c.scale(-1, 1); c.font = '800 230px Bricolage'; c.letterSpacing = '18px'; c.textAlign = 'center'; c.fillStyle = ink(k2); c.fillText('TENET', 0, 300); });
    if (u > .55) tag('A SECRET ORGANIZATION', 960, 390, 'B', 26, 'center');
  }
}

function shLab(t, u) {   // 4 · inversion, demonstrated: a bullet leaps up into a hand
  fill('B', .16, rect(-300, -300, W + 600, H + 600));
  for (let y = 0; y < 700; y += 60) knock(['B'], path([[-300, y], [W + 300, y]]), 2); for (let x = -300; x < W + 300; x += 60) knock(['B'], path([[x, -300], [x, 700]]), 2);
  for (let s = 0; s < 3; s++) { const y = 230 + s * 150; fill('B', 1, rect(60, y, 420, 12)); const r = rng(s + 40); let x = 74; while (x < 450) { const w = 40 + r() * 50, h = 50 + r() * 70; const inv = r() < .25; paint(inv ? 'K' : 'B', inv ? .9 : .6, rect(x, y - h, w, h), inv ? ['B', 'S'] : ['S']); knock([inv ? 'K' : 'B'], rect(x + 8, y - h + 12, w - 16, 12)); x += w + 8; } }
  // the blackboard: entropy forward (blue), entropy inverted (pink)
  fill('B', 1, rect(1150, 160, 620, 380)); stroke('B', 1, 14, rect(1150, 160, 620, 380));
  knockText(['B'], 'ENTROPY', 1460, 240, '700 46px Jost', 'center', 6);
  knock(['B'], path([[1220, 320], [1660, 320]]), 6); knock(['B'], poly([[1690, 320], [1650, 300], [1650, 340]]));
  knock(['B'], path([[1660, 420], [1250, 420]]), 8); knock(['B'], poly([[1220, 420], [1262, 398], [1262, 442]])); stroke('K', 1, 6, path([[1660, 420], [1250, 420]])); fill('K', 1, poly([[1220, 420], [1260, 400], [1260, 440]]));
  knockText(['B'], 'FORWARD', 1440, 300, '600 26px Jost', 'center', 4); knockText(['B'], 'INVERTED', 1440, 470, '600 26px Jost', 'center', 4);
  // hanging lamp and its light
  stroke('B', 1, 3, path([[880, -40], [880, 120]])); fill('B', 1, poly([[830, 160], [930, 160], [906, 118], [854, 118]])); fill('S', .2, poly([[836, 162], [924, 162], [1180, 720], [580, 720]]));
  // test wall with inverted bullet holes
  fill('B', .45, rect(560, 230, 360, 300)); for (let i = 0; i < 9; i++) { const r2 = rng(i + 70); const x = 600 + r2() * 280, y = 260 + r2() * 240; knock(['B'], ell(x, y, 12)); fill('K', 1, ell(x, y, 8)); }
  // the table and the bullets
  fill('B', 1, rect(430, 720, 1060, 18)); knock(['B'], path([[440, 724], [1480, 724]]), 2); for (const x of [460, 1450]) fill('B', 1, rect(x, 738, 14, 240));
  for (let i = 0; i < 5; i++) bullet(560 + i * 70, 704, 0, 50, 'B');
  const ju = ss(seg(u, .3, .3));
  const sci = figure('B', 980, 1000, 450, { coat: 'labcoat', cloth: .06, hair: 'bob', hairD: .9, glasses: true, armF: [1.05, .55], armB: [.2, .3], earrings: true, face: 1, look: .9 });
  const hd = sci.hand || [1100, 620];
  const by = lerp(708, hd[1] + 22, ju), bxx = lerp(1110, hd[0], ju);
  if (u > .3 && ju < 1) for (let i = 0; i < 4; i++) stroke('K', 1, 3, path([[bxx - 14 + i * 9, by + 30], [bxx - 14 + i * 9, by + 50 + 70 * (1 - ju)]]));
  bullet(bxx, by, -Math.PI / 2, 60, 'K');
  figure('B', 330, 1000, 470, { coat: 'suit', hair: 'crop', tie: true, stubble: true, pocketsH: true, armF: [-.05, -.4], armB: [-.05, -.4], face: 1, look: 1 });
  tag('INVERSION', 1150, 640, 'K', 28);
  tag('THE SCIENTIST', 900, 450, 'B', 22);
}

function shSator(t, u) {   // 5 · Andrei Sator: inverted gold, and orders from the future
  grad('B', 0, -100, 0, 860, [[0, .72], [1, .18]], rect(-300, -300, W + 600, 1160));
  stars(40, 5, 300);
  fill('B', .55, poly([[-300, 860], [300, 790], [800, 820], [1300, 770], [W + 300, 830], [W + 300, H + 300], [-300, H + 300]]));
  // the radio mast: a lattice; orders from the future arrive as pink waves, moving inward (backward)
  const mx = 300;
  stroke('B', 1, 5, path([[mx - 60, 860], [mx, 160], [mx + 60, 860]])); for (let y = 200; y < 860; y += 50) { const w = (y - 160) / 700 * 60; stroke('B', 1, 2.5, path([[mx - w, y], [mx + w * 1.08, y + 50]])); stroke('B', 1, 2.5, path([[mx + w, y], [mx - w * 1.08, y + 50]])); }
  fill('K', 1, ell(mx, 156, 9)); for (let i = 0; i < 4; i++) { const rr = (1 - ((t * .35 + i * .25) % 1)) * 260 + 20; on('K', c => { c.strokeStyle = ink(clamp(rr / 120)); c.lineWidth = 6; c.beginPath(); c.arc(mx, 156, rr, -.9, .9); c.stroke(); c.beginPath(); c.arc(mx, 156, rr, Math.PI - .9, Math.PI + .9); c.stroke(); }); }
  tag('INSTRUCTIONS · FROM THE FUTURE', 380, 120, 'K', 22);
  // the crate of inverted gold
  const cx = 520, cy = 980;
  paint('B', .7, rect(cx - 220, cy - 150, 440, 150), ['S', 'K']); for (let i = 1; i < 6; i++) knock(['B'], path([[cx - 220, cy - 150 + i * 25], [cx + 220, cy - 150 + i * 25]]), 2.5); stroke('B', 1, 10, rect(cx - 220, cy - 150, 440, 150)); stroke('B', 1, 8, path([[cx - 220, cy - 150], [cx + 220, cy]]));
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
    const bx = cx - 170 + row * 50 + i * 100, by = cy - 150 - row * 44;
    const pts = [[bx, by], [bx + 90, by], [bx + 78, by - 40], [bx + 12, by - 40]];
    knock(['B'], poly(pts)); fill('S', 1, poly(pts)); fill('K', .5, poly(pts)); knock(['S', 'K'], path([[bx + 16, by - 34], [bx + 74, by - 34]]), 3); stroke('K', 1, 2, poly(pts));
  }
  rgrad('K', cx, cy - 220, 260, [[0, .35], [1, 0]], ell(cx, cy - 220, 260, 160));
  tag('INVERTED GOLD', cx - 200, cy - 330, 'K', 26);
  // Sator: a heavy man in a dark overcoat, overprinted blue and pink (the darkest ink in the film)
  figure('B', 1260, 1060, 760, { coat: 'overcoat', hair: 'slick', hairD: .9, build: 1.3, cloth: .9, tie: true, stubble: true, brows: 'stern', armF: [.45, .6], armB: [.1, .2], face: -1, over: ['K'], overD: .75, ring: true, look: .8, watch: true });
  tag('ANDREI SATOR', 1460, 140, 'B', 34); tag('A RUSSIAN OLIGARCH', 1460, 200, 'B', 22);
}

const PARTS = [
  (L) => { L.paintE('S', 1, 0, 0, 52, 52, ['B']); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; L.paint('S', 1, [[Math.cos(a - .12) * 50, Math.sin(a - .12) * 50], [Math.cos(a - .1) * 66, Math.sin(a - .1) * 66], [Math.cos(a + .1) * 66, Math.sin(a + .1) * 66], [Math.cos(a + .12) * 50, Math.sin(a + .12) * 50]], ['B']); } L.koE(['S'], 0, 0, 20); L.koE(['S'], 0, -36, 6); L.koE(['S'], 0, 36, 6); },
  (L) => { L.paint('S', 1, [[-30, -70], [30, -70], [30, 70], [-30, 70]], ['B']); for (const v of [-44, -10, 24, 50]) L.ko(['S'], [[-30, v], [30, v]], 4); L.paintE('S', 1, 0, -70, 30, 10, ['B']); L.koE(['S'], 0, -70, 14, 4); },
  (L) => { const h = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; h.push([Math.cos(a) * 62, Math.sin(a) * 62]); } L.paint('S', 1, h, ['B']); L.koE(['S'], 0, 0, 30); L.ell('S', 1, 0, 0, 16); for (const [x, y] of h) L.koE(['S'], x * .7, y * .7, 5); },
  (L) => { L.paintE('S', 1, 0, 0, 66, 66, ['B']); L.koE(['S'], 0, 0, 44); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; L.ko(['S'], [[Math.cos(a) * 44, Math.sin(a) * 44], [Math.cos(a) * 66, Math.sin(a) * 66]], 5); } },
  (L) => { L.paint('S', 1, [[-60, 50], [60, 50], [20, -70], [-20, -70]], ['B']); L.ko(['S'], [[-40, 20], [40, 20]], 4); L.ko(['S'], [[-26, -20], [26, -20]], 4); L.koE(['S'], 0, -50, 10); },
  (L) => { L.paint('S', 1, [[-18, -70], [18, -70], [18, -18], [70, -18], [70, 18], [18, 18], [18, 70], [-18, 70], [-18, 18], [-70, 18], [-70, -18], [-18, -18]], ['B']); L.koE(['S'], 0, 0, 12); for (const [x, y] of [[0, -52], [52, 0], [0, 52], [-52, 0]]) L.koE(['S'], x, y, 5); },
  (L) => { const pts = []; for (let i = 0; i <= 14; i++) pts.push([-60 + i * 8.6, i % 2 ? -40 : 40]); L.ko(['B'], [[-74, -54], [74, -54], [74, 54], [-74, 54]]); L.line('S', 1, 12, pts); L.paint('S', 1, [[-70, -50], [-60, -50], [-60, 50], [-70, 50]], ['B']); L.paint('S', 1, [[60, -50], [70, -50], [70, 50], [60, 50]], ['B']); },
  (L) => { L.paint('S', 1, [[0, -76], [50, -20], [30, 70], [-30, 70], [-50, -20]], ['B']); L.ko(['S'], [[0, -76], [0, 70]], 3); L.ko(['S'], [[-50, -20], [50, -20]], 3); L.ko(['S'], [[-30, 70], [0, -20], [30, 70]], 2); },
  (L) => { const pts = Array.from({ length: 13 }, (_, i) => { const a = Math.PI + i / 12 * Math.PI; return [Math.cos(a) * 64, Math.sin(a) * 64 + 30]; }); L.ko(['B'], pts, 30); L.line('S', 1, 22, pts); for (let i = 0; i < 6; i++) { const a = Math.PI + (i + .5) / 6 * Math.PI; L.koE(['S'], Math.cos(a) * 64, Math.sin(a) * 64 + 30, 5); } L.paint('S', 1, [[-80, 26], [-50, 26], [-50, 46], [-80, 46]], ['B']); L.paint('S', 1, [[50, 26], [80, 26], [80, 46], [50, 46]], ['B']); },
];
function shParts(t, u) {   // 6a · the Algorithm: nine parts on a blueprint, then into a ring
  blueprintGrid(.84);
  knock(['B'], rect(1480, 40, 380, 140)); stroke('B', 1, 3, rect(1480, 40, 380, 140)); text('B', 1, 'DWG. 09 · THE ALGORITHM', 1500, 84, '600 24px Jost', 'left', undefined, 3); text('B', 1, 'NINE PARTS · ONE DEVICE', 1500, 150, '500 22px Jost', 'left', undefined, 3); stroke('B', 1, 2, path([[1480, 106], [1860, 106]]));
  const gather = ss(seg(u, .62, .3));
  for (let i = 0; i < 9; i++) {
    const t0 = .04 + i * .06; if (u < t0) continue;
    const k = ss(seg(u, t0, .1));
    const gx = 560 + (i % 3) * 400, gy = 210 + Math.floor(i / 3) * 280;
    const a = i / 9 * TAU - Math.PI / 2, rx = 960 + Math.cos(a) * 330, ry = 500 + Math.sin(a) * 330;
    const x = lerp(gx, rx, gather), y = lerp(gy, ry, gather), sc = lerp(1, .72, gather) * (.6 + .4 * k);
    PARTS[i](LT(x, y, sc));
    if (gather < .5) { knockText(['B'], '0' + (i + 1), x - 110, y - 70, '700 30px Jost', 'left'); stroke('B', 1, 1.5, path([[x - 110, y - 60], [x - 60, y - 60], [x - 40, y - 40]])); }
  }
  if (gather > .2) stroke('S', gather, 6, ell(960, 500, 330), [16, 12]);
  if (u > .2) tag('THE ALGORITHM', 120, 110, 'S', 30);
}

function shPlanet(t, u) {   // 6b · capable of inverting the entire planet
  fill('B', 1, rect(-300, -300, W + 600, H + 600)); stars(220, 33, 1080);
  const cx = 960, cy = 510, R = 330;
  knock(['B'], ell(cx, cy, R + 8));
  on('B', c => { c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip(); c.fillStyle = ink(.4); c.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    const r = rng(77); c.fillStyle = '#000';
    for (let i = 0; i < 24; i++) { const x = cx - R + r() * 2 * R, y = cy - R + r() * 2 * R, rr = 40 + r() * 110; c.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, q = rr * (.6 + r() * .5); k ? c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * .8) : c.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q * .8); } c.closePath(); c.fill(); }
    c.restore(); });
  for (let i = -3; i <= 3; i++) knock(['B'], ell(cx, cy + i * R / 4, Math.sqrt(Math.max(1, R * R - (i * R / 4) ** 2)), 6), 1.6);
  for (let i = 1; i < 6; i++) knock(['B'], ell(cx, cy, Math.abs(R * Math.cos(i / 6 * Math.PI / 2 + t * .1)), R), 1.6);
  stroke('B', 1, 6, ell(cx, cy, R));
  const edge = lerp(cx + R + 40, cx - R - 60, ss(seg(u, .1, .8)));
  on('K', c => { c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip(); c.fillStyle = ink(.85); c.beginPath(); c.moveTo(edge, cy - R - 10); for (let y = cy - R; y <= cy + R; y += 12) c.lineTo(edge + Math.sin(y * .05 + t * 6) * 18, y); c.lineTo(cx + R + 10, cy + R + 10); c.lineTo(cx + R + 10, cy - R - 10); c.closePath(); c.fill(); c.restore(); });
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + t * .5, x = cx + Math.cos(a) * (R + 110), y = cy + Math.sin(a) * (R + 110) * .32 - 40; if (Math.sin(a) < 0 && Math.abs(x - cx) < R) continue; knock(['B', 'K'], ell(x, y, 26)); PARTS[i](LT(x, y, .3)); }
  if (u > .4) tag('THE WHOLE PLANET · INVERTED', 960, 960, 'K', 28, 'center');
}

function shTeam(t, u) {   // 7 · the team: Neil, the Protagonist, Kat
  grad('B', 0, -100, 0, 700, [[0, .3], [1, .12]], rect(-300, -300, W + 600, 1000));
  const r = rng(51); let x = -60;
  while (x < W + 60) { const w = 150 + r() * 80, h = 380 + r() * 140; fill('B', .32, rect(x, 760 - h, w, h)); fill('B', .45, poly([[x - 6, 760 - h], [x + w / 2, 760 - h - 40], [x + w + 6, 760 - h]])); stroke('B', .9, 10, path([[x + w * .7, 760 - h - 20], [x + w * .7, 760 - h - 70]]));
    for (let wy = 760 - h + 40; wy < 720; wy += 80) for (let wx = x + 22; wx < x + w - 40; wx += 54) { knock(['B'], rect(wx, wy, 30, 50)); fill('B', .22, rect(wx, wy, 30, 50)); knock(['B'], path([[wx + 15, wy], [wx + 15, wy + 50]]), 2); }
    x += w + 8; }
  fill('B', .5, rect(-300, 760, W + 600, 400)); knock(['B'], path([[-300, 776], [W + 300, 776]]), 6);
  for (let x2 = -100; x2 < W + 100; x2 += 64) knock(['B'], path([[x2, 790], [x2 + 30, 790]]), 3);
  lamp(140, 800, 330); lamp(1700, 800, 330);
  const sway = Math.sin(t * 1.4) * .04;
  const kN = ss(seg(u, .12, .15)), kP = ss(seg(u, 0, .12)), kK = ss(seg(u, .4, .15));
  if (kP > 0) figure('B', 960, 1000, 600, { coat: 'suit', hair: 'crop', tie: true, stubble: true, watch: true, face: 1, look: 0, armF: [.08 + sway, .15], armB: [.05, .2], lift: 1 - kP });
  if (kN > 0) figure('B', lerp(380, 560, kN), 1000, 620, { coat: 'linen', cloth: .48, hair: 'swept', scarf: true, scarfD: .95, rolled: true, pack: true, face: 1, look: .9, smile: true, walk: t * 5, stride: .5 * (1 - kN), armF: [.1, .2], lift: 1 - kN });
  if (kK > 0) figure('B', lerp(1580, 1370, kK), 1000, 610, { coat: 'trench', cloth: .7, hair: 'bun', hairD: .85, earrings: true, face: -1, look: .6, build: .92, walk: t * 5, stride: .5 * (1 - kK), armF: [.2, .5], armB: [.05, .15], lift: 1 - kK });
  if (kP > .5) tag('THE PROTAGONIST', 960, 320, 'B', 24, 'center');
  if (kN > .5) tag('NEIL · HANDLER', 560, 300, 'B', 24, 'center');
  if (kK > .5) tag("KAT · SATOR'S WIFE", 1370, 310, 'B', 24, 'center');
}

function shFreeport(t, u) {   // 8a · a jumbo jet into the Oslo freeport
  grad('B', 0, -100, 0, 760, [[0, .95], [1, .55]], rect(-300, -300, W + 600, 1060));
  stars(80, 61, 400);
  fill('B', .65, rect(-300, 760, W + 600, 400));
  for (let i = 0; i < 18; i++) { const q = i / 18; for (const s of [-1, 1]) { const x = 700 + s * (40 + q * 900) - 400 * q, y = 770 + q * q * 300; knock(['B'], ell(x, y, 3 + q * 6, 2 + q * 3)); fill('S', 1, ell(x, y, 2 + q * 5, 1.5 + q * 2.5)); } }
  const bx = 1350;
  paint('B', 1, rect(bx, 330, 700, 450), ['S']); for (let i = 0; i < 26; i++) knock(['B'], rect(bx + 20 + i * 26, 380, 6, 340));
  knock(['B'], rect(bx, 330, 700, 40)); fill('B', .35, rect(bx, 330, 700, 40)); knockText(['B'], 'FREEPORT', bx + 350, 466, '800 64px Bricolage', 'center', 10);
  stroke('B', 1, 3, path([[0, 760], [bx - 40, 760]])); for (let x = 20; x < bx; x += 40) stroke('B', 1, 2, path([[x, 760], [x, 712]])); stroke('B', 1, 2, path([[0, 726], [bx - 40, 726]]));
  const px = lerp(-1000, bx - 640, ss(seg(u, 0, .85)));
  plane(px, 690, 1.0, t * 6);
  if (u > .78) { const k = ss(seg(u, .78, .2)); for (let i = 0; i < 9; i++) knock(['B'], path([[bx + 10, 560], [bx + 10 + Math.cos(i * .7 - 2) * 220 * k, 560 + Math.sin(i * .7 - 2) * 220 * k]]), 4); burst(bx - 10, 600, 120 * k, 11, 8); }
  tag('OSLO · FREEPORT', 60, 110, 'B', 30); tag('A BOEING 747', 60, 170, 'B', 22);
}

function shHighway(t, u) {   // 8b · the highway heist in Tallinn: one car runs backward
  grad('B', 0, -100, 0, 430, [[0, .55], [1, .02]], rect(-300, -300, W + 600, 730));
  blocks(-40, W + 40, 430, 92, .3, 60, 150); blocks(-40, W + 40, 430, 91, .55, 80, 200);
  // the gantry sign
  stroke('B', 1, 14, path([[300, 470], [300, 150]])); stroke('B', 1, 14, path([[1180, 470], [1180, 150]])); stroke('B', 1, 14, path([[290, 160], [1190, 160]]));
  knock(PLATES, rect(420, 150, 640, 130)); fill('B', 1, rect(420, 150, 640, 130)); knockText(['B'], 'TALLINN  →', 740, 238, '800 74px Bricolage', 'center', 6);
  fill('B', .42, rect(-300, 470, W + 600, 700));
  // lamp posts and the jersey barrier scroll with the traffic
  const sc = (t * 700) % 480;
  for (let x = -480 - sc; x < W + 480; x += 480) { stroke('B', 1, 8, path([[x + 480, 470], [x + 480, 190]])); stroke('B', 1, 5, path([[x + 480, 200], [x + 560, 170]])); fill('B', 1, rect(x + 540, 164, 44, 14)); rgrad('S', x + 562, 200, 120, [[0, .45], [1, 0]], ell(x + 562, 200, 120, 90)); }
  for (let x = -((t * 700) % 120); x < W + 120; x += 120) { fill('B', .95, poly([[x, 470], [x + 100, 470], [x + 92, 498], [x + 8, 498]])); knock(['B'], path([[x + 50, 472], [x + 50, 496]]), 2); }
  for (const y of [650, 830]) { const off = (t * 900) % 160; for (let x = -200 - off; x < W + 200; x += 160) knock(['B'], rect(x, y - 4, 80, 8)); }
  stroke('B', 1, 8, path([[-300, 1040], [W + 300, 1040]]));
  for (let k = 0; k < 4; k++) stroke('K', .55, 5, path([[300 + k * 380, 700 + k * 30], [620 + k * 380, 720 + k * 24]]));   // skid marks
  const car_ = (lane, x0, sp, len) => { const L_ = lane === 1 ? 760 : 940; const x = ((x0 + t * sp) % (W + 1200) + W + 1200) % (W + 1200) - 600; rgrad('K', x, L_ - len * .18, 70, [[0, .5], [1, 0]], ell(x, L_ - len * .18, 70, 40)); rgrad('S', x + len, L_ - len * .18, 130, [[0, .45], [1, 0]], ell(x + len + 60, L_ - len * .18, 150, 40)); car(x, L_, len, 'B', 1, t, {}); };
  for (const [l, x0, sp, len] of [[1, 0, 380, 330], [1, 900, 380, 300], [2, 300, 300, 360], [2, 1300, 300, 320]]) car_(l, x0, sp, len);
  // a lorry with the crew on its roof, a beacon on the cab
  const tx = ((300 + t * 240) % (W + 1400)) - 700; const L = LT(tx, 940, 1.4);
  L.paint('B', 1, [[0, -10], [0, -130], [300, -130], [300, -10]], ['S', 'K']); L.paint('B', 1, [[300, -10], [300, -110], [360, -110], [386, -70], [390, -10]], ['S', 'K']); L.ko(['B'], [[312, -100], [352, -100], [374, -72], [312, -72]]);
  for (let i = 0; i < 6; i++) L.ko(['B'], [[20 + i * 46, -120], [56 + i * 46, -120], [56 + i * 46, -20], [20 + i * 46, -20]], 1.5);
  for (const u2 of [60, 240, 340]) wheel(L, u2, -10, 26, t * 9);
  const bk = Math.floor(t * 5) % 2; fill(bk ? 'K' : 'S', 1, ell(tx + 330 * 1.4, 940 - 118 * 1.4, 12));
  for (const dx of [100, 190]) figure('B', tx + dx * 1.4, 940 - 130 * 1.4, 160, { coat: 'tactical', hair: 'helmet', gun: 'port', gloves: true, face: 1, walk: t * 3 + dx, stride: .2, fixedY: true });
  // the helicopter overhead, its searchlight sweeping the road
  const hx = lerp(-400, 1500, u); fill('S', .2, poly([[hx + 120, 230], [hx - 80, 700], [hx + 320, 700]])); helo(hx, 110, 1.15, t);
  // chaos: a fireball and smoke drifting back along the road
  const ex = 1550 - ((t * 260) % 800); burst(ex, 700, 56 + Math.sin(t * 14) * 8, 9, 12);
  for (let k = 0; k < 5; k++) { const ph = (t * .6 + k * .2) % 1, sx = ex + 50 + k * 54, sy = 640 - ph * 120 - k * 24, q = 26 + k * 12 + ph * 20; knock(['B'], ell(sx, sy, q, q * .8)); fill('B', .55 * (1 - ph), ell(sx, sy, q, q * .8)); }
  sparks(24, 8, ex - 80, ex + 80, 720, 260, 'S', 4);
  // the inverted car runs backward against the traffic, wheels turning the wrong way
  const ix = ((1800 - t * 520) % (W + 1000) + W + 1000) % (W + 1000) - 500;
  car(ix, 580, 340, 'K', 1, t, { back: true, d: 1 });
  for (let i = 0; i < 5; i++) stroke('K', 1, 3, path([[ix + 360 + i * 24, 520 + i * 8], [ix + 480 + i * 30, 520 + i * 8]]));
  tag('INVERTED', ix + 60, 475, 'K', 22);
  tag('TALLINN · HIGHWAY', 60, 110, 'B', 30); tag('THE HEIST', 60, 170, 'S', 22);
}

function shKat(t, u) {   // 9 · an inverted Sator takes the last piece and shoots Kat with an inverted bullet (implied)
  fill('B', .3, rect(-300, -300, W + 600, H + 600));
  for (let i = 0; i < 6; i++) { knock(['B'], rect(80 + i * 300, 120, 240, 360)); fill('B', .12, rect(80 + i * 300, 120, 240, 360)); for (let k = 1; k < 4; k++) knock(['B'], path([[80 + i * 300, 120 + k * 90], [320 + i * 300, 120 + k * 90]]), 6); knock(['B'], path([[200 + i * 300, 120], [200 + i * 300, 480]]), 6); }
  fill('B', .55, rect(-300, 760, W + 600, 400)); for (let x = -300; x < W + 300; x += 120) knock(['B'], path([[x, 760], [x - 80, H + 20]]), 2);
  // the Protagonist behind a glass partition
  figure('B', 960, 840, 360, { coat: 'suit', hair: 'crop', tie: true, armF: [1.45, .1], armB: [.2, .2], face: -1, stubble: true, look: .9 });
  fill('B', .1, rect(860, 300, 200, 560)); stroke('B', 1, 8, rect(860, 300, 200, 560)); for (let i = 0; i < 3; i++) knock(['B'], path([[880 + i * 40, 340], [940 + i * 40, 420]]), 3);
  // Kat
  const kl = ss(seg(u, .58, .3)) * .92;
  figure('B', 520, 980, 560, { coat: 'trench', cloth: .7, hair: 'bun', hairD: .85, earrings: true, face: 1, build: .92, armF: [.5 - kl * .5, .9], armB: [.1, .2], look: .6, lift: kl });
  // inverted Sator: pink, a breathing mask, the last piece in a case, a pistol
  const s = figure('K', 1460, 990, 600, { coat: 'overcoat', hair: 'slick', hairD: .9, build: 1.3, cloth: .9, tie: true, stubble: true, brows: 'stern', mask: 'oxy', gun: 'pistol', armF: [1.42, .08], armB: [.1, .1], face: -1 });
  const cs = LT(1600, 820, 1.6); cs.paint('K', 1, [[-30, 0], [30, 0], [30, 50], [-30, 50]], ['B']); cs.ko(['K'], [[-26, 20], [26, 20]], 1.5); cs.line('K', 1, 3, [[-8, 0], [-8, -10], [8, -10], [8, 0]]); cs.koE(['K'], 0, 34, 12); PARTS[0](LT(1600, 820 + 34 * 1.6, .25));
  const mz = s.muzzle || [1160, 750];
  const bu = ss(seg(u, .4, .2));
  if (u > .4 && u < .62) { const bx = lerp(620, mz[0] - 30, bu), by = lerp(760, mz[1], bu); bullet(bx, by, Math.PI, 70, 'K'); for (let i = 0; i < 4; i++) stroke('K', 1, 3, path([[bx + 80 + i * 8, by - 10 + i * 7], [bx + 200 + i * 20, by - 10 + i * 7]])); }
  tag('SATOR · INVERTED', 1360, 230, 'K', 26); tag('KAT', 430, 300, 'B', 26); tag('THE FINAL PIECE', 1520, 720, 'S', 20);
}

function shTurnstile(t, u) {   // 10 · the turnstile: walk in blue, come out pink
  fill('B', .38, rect(-300, -300, 960 + 300, H + 600)); fill('K', .38, rect(960, -300, 960 + 300, H + 600));
  for (const [x0, p] of [[40, 'B'], [1100, 'K']]) { for (let i = 0; i < 3; i++) { stroke(p, 1, 16, path([[x0, 180 + i * 70], [x0 + 760, 180 + i * 70]])); for (let k = 0; k < 6; k++) knock([p], rect(x0 + 40 + k * 130, 172 + i * 70, 10, 16)); } knock([p], ell(x0 + 680, 460, 44)); stroke(p, 1, 6, ell(x0 + 680, 460, 44)); const sg = p === 'B' ? 2 : -2; stroke(p, 1, 4, path([[x0 + 680, 460], [x0 + 680 + Math.cos(t * sg) * 34, 460 + Math.sin(t * sg) * 34]])); }
  fill('B', .65, rect(-300, 820, 1260, 400)); fill('K', .65, rect(960, 820, 1260, 400));
  // the drum
  const cx = 960, cy = 560, R = 300;
  knock(PLATES, rect(cx - R - 60, cy - R - 60, 2 * R + 120, 2 * R + 380));
  for (let i = 0; i < 24; i++) { const y = cy - R - 60 + i * 40; fill('S', 1, poly([[cx - R - 60, y], [cx - R - 30, y], [cx - R - 60, y + 30]])); fill('S', 1, poly([[cx + R + 60, y], [cx + R + 30, y], [cx + R + 60, y + 30]])); }
  stroke('S', 1, 30, rect(cx - R - 45, cy - R - 45, 2 * R + 90, 2 * R + 400));
  fill('B', .22, c => { c.moveTo(cx, cy); c.arc(cx, cy, R, Math.PI / 2, Math.PI * 1.5); c.closePath(); }); fill('K', .22, c => { c.moveTo(cx, cy); c.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2); c.closePath(); });
  stroke('B', 1, 14, ell(cx, cy, R));
  const rot = t * 1.4;
  for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2; stroke('B', 1, 12, path([[cx, cy], [cx + Math.cos(a) * R, cy + Math.sin(a) * R * .35]])); }
  fill('B', 1, ell(cx, cy, 30)); knock(['B'], ell(cx, cy, 12));
  stroke('B', 1, 6, path([[cx, cy - R], [cx, cy + R + 260]]));
  for (const x of [cx - 200, cx + 200]) { knock(['B', 'K'], ell(x, cy - R - 110, 16)); fill('S', Math.sin(t * 6 + x) > 0 ? 1 : .3, ell(x, cy - R - 110, 14)); }
  // the two men: in on the blue side, out on the pink side, masked
  const w1 = ss(seg(u, 0, .42)), w2 = ss(seg(u, .5, .45));
  if (u < .45) { figure('B', lerp(80, 700, w1), 1010, 440, { coat: 'linen', cloth: .48, hair: 'swept', scarf: true, rolled: true, pack: true, walk: t * 6.5 + 1, stride: .9, face: 1 }); figure('B', lerp(260, 820, w1), 1000, 420, { coat: 'suit', hair: 'crop', tie: true, walk: t * 6.5, stride: .9, face: 1, stubble: true }); }
  if (u > .5) { figure('K', lerp(1000, 1500, w2), 1010, 440, { coat: 'linen', cloth: .48, hair: 'swept', scarf: true, rolled: true, pack: true, mask: 'oxy', walk: t * 6.5 + 1, stride: .9, face: 1 }); figure('K', lerp(1100, 1660, w2), 1000, 420, { coat: 'suit', hair: 'crop', tie: true, mask: 'oxy', walk: t * 6.5, stride: .9, face: 1 }); }
  tag('FORWARD', 300, 120, 'B', 30, 'center'); tag('INVERTED', 1620, 120, 'K', 30, 'center'); tag('THE TURNSTILE', 960, 200, 'B', 24, 'center');
}

function shYacht(t, u) {   // 11a · Sator's yacht in Vietnam at sunset; the dead-man's switch on his wrist
  const HZ = 640;
  grad('S', 0, 0, 0, HZ, [[0, .1], [1, .55]], rect(-300, -300, W + 600, HZ + 300)); grad('B', 0, -100, 0, HZ, [[0, .35], [1, 0]], rect(-300, -300, W + 600, HZ + 300));
  fill('S', 1, ell(1340, HZ - 40, 110)); for (let i = 1; i < 4; i++) knock(['S'], path([[1200, HZ - 40 + i * 22], [1480, HZ - 40 + i * 22]]), 6 + i * 2);
  for (const [x0, seed] of [[-60, 1], [1500, 2]]) { const r = rng(seed); let x = x0; for (let i = 0; i < 5; i++) { const w = 60 + r() * 90, h = 120 + r() * 200; fill('B', .7, poly([[x, HZ], [x + w * .1, HZ - h * .8], [x + w * .3, HZ - h], [x + w * .6, HZ - h * .9], [x + w * .9, HZ - h * .6], [x + w, HZ]])); x += w * .8; } }
  fill('B', .2, rect(-300, HZ, W + 600, H)); fill('S', .3, rect(-300, HZ, W + 600, H));
  // the yacht
  const L = LT(330, 760, 1.25);
  const hull = [[0, -20], [40, -60], [880, -64], [960, -44], [1000, -20], [960, 30], [60, 30]];
  L.paint('B', .08, hull, ['S', 'K']); L.line('B', 1, 4, [...hull, hull[0]]);
  L.paint('B', 1, [[8, 0], [990, 0], [966, 28], [60, 28]]); L.ko(['B'], [[40, 12], [940, 12]], 2);
  for (let deck = 0; deck < 3; deck++) { const y0 = -64 - deck * 54, x0 = 120 + deck * 90, x1 = 860 - deck * 110; L.paint('B', .08, [[x0, y0], [x1, y0], [x1 + 30, y0 - 50], [x0 + 20, y0 - 50]], ['S']); L.line('B', 1, 3, [[x0, y0], [x0 + 20, y0 - 50], [x1 + 30, y0 - 50], [x1, y0]]); L.paint('B', 1, [[x0 + 30, y0 - 14], [x1 + 4, y0 - 14], [x1 + 14, y0 - 36], [x0 + 34, y0 - 36]]); for (let x = x0 + 40; x < x1; x += 60) L.ko(['B'], [[x, y0 - 36], [x, y0 - 14]], 2); L.line('B', 1, 1.5, [[x0, y0 - 50], [x1 + 30, y0 - 50]]); for (let x = x0; x < x1 + 30; x += 16) L.line('B', 1, 1.2, [[x, y0 - 50], [x, y0 - 60]]); L.line('B', 1, 1.5, [[x0, y0 - 60], [x1 + 30, y0 - 60]]); }
  L.line('B', 1, 5, [[520, -226], [520, -330]]); L.line('B', 1, 3, [[480, -300], [560, -300]]); L.ell('B', 1, 520, -334, 10, 6); L.line('B', 1, 3, [[490 + Math.cos(t * 3) * 30, -310], [550 - Math.cos(t * 3) * 30, -310]]);
  figure('B', 330 + 640 * 1.25, 760 - 172 * 1.25, 120, { coat: 'overcoat', hair: 'slick', hairD: .9, build: 1.3, cloth: .9, face: -1, over: ['K'], overD: .75, halo: 2 });
  // magnifier: the wrist, the switch, the pulse
  const cx = 1520, cy = 300, R = 190;
  knock(PLATES, ell(cx, cy, R + 10)); stroke('B', 1, 10, ell(cx, cy, R));
  on('B', c => { c.save(); c.beginPath(); c.arc(cx, cy, R - 5, 0, TAU); c.clip();
    c.fillStyle = ink(.9); c.beginPath(); c.moveTo(cx - R, cy + 60); c.lineTo(cx + R, cy - 10); c.lineTo(cx + R, cy + 90); c.lineTo(cx - R, cy + 160); c.closePath(); c.fill(); c.restore(); });
  paint('B', .16, poly([[cx - 150, cy + 76], [cx - 40, cy + 40], [cx - 34, cy + 108], [cx - 150, cy + 140]])); stroke('B', 1, 2, poly([[cx - 150, cy + 76], [cx - 40, cy + 40], [cx - 34, cy + 108], [cx - 150, cy + 140]]));
  paint('B', 1, poly([[cx - 40, cy + 30], [cx + 30, cy + 16], [cx + 40, cy + 108], [cx - 30, cy + 122]]));
  const beat = (t * 1.1) % 1; knock(['B'], ell(cx, cy + 68, 18)); fill('S', beat < .15 ? 1 : .4, ell(cx, cy + 68, 14));
  const pts = []; for (let i = 0; i <= 60; i++) { const x = cx - 160 + i * 5.4, ph = ((i / 60) - (t * .6) % 1 + 1) % 1; pts.push([x, cy - 70 + (Math.abs(ph - .5) < .03 ? -60 : Math.abs(ph - .53) < .02 ? 34 : 0)]); } stroke('S', 1, 5, path(pts));
  tag("A DEAD-MAN'S SWITCH", cx, cy + R + 60, 'B', 24, 'center');
  tag('VIETNAM · THE YACHT', 60, 110, 'B', 30);
  return { water: { y: 798, b: 925, amp: 6, t, sep: .4, refl: .45 } };
}

function shStalsk(t, u) {   // 11b · Stalsk-12: the Algorithm at the bottom of a shaft, under a bomb
  const GY = 560;
  grad('B', 0, -100, 0, GY, [[0, .3], [1, .1]], rect(-300, -300, W + 600, GY + 300));
  blocks(-40, W + 40, GY, 17, .75, 120, 260, true);
  fill('B', .5, rect(-300, GY, W + 600, H)); const r = rng(4); for (let i = 0; i < 40; i++) { const x = r() * W, y = GY + 10 + r() * 30; knock(['B'], path([[x, y], [x + 20 + r() * 40, y + r() * 6]]), 2); }
  const cx = 960;
  knock(['B'], poly([[200, GY + 60], [1720, GY + 60], [1720, H + 40], [200, H + 40]])); stroke('B', 1, 6, path([[200, GY + 60], [1720, GY + 60]]));
  for (let i = 0; i < 6; i++) { const y = GY + 110 + i * 70; fill('B', .12 + (i % 2) * .1, rect(200, y, 1520, 70)); for (let x = 210 + (i % 2) * 40; x < 1710; x += 80) knock(['B'], ell(x, y + 35, 6, 3)); }
  knock(['B'], rect(cx - 90, GY + 60, 180, H)); stroke('B', 1, 12, path([[cx - 96, GY + 60], [cx - 96, H + 20]])); stroke('B', 1, 12, path([[cx + 96, GY + 60], [cx + 96, H + 20]]));
  for (let y = GY + 80; y < H; y += 40) stroke('B', .9, 3, path([[cx - 90, y], [cx + 90, y]]));
  knock(['B'], ell(cx, 860, 120, 60)); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + t * .3; PARTS[i](LT(cx + Math.cos(a) * 70, 860 + Math.sin(a) * 28, .22)); }
  const bL = LT(cx, GY + 40, 1);
  bL.paint('B', 1, [[-60, 0], [60, 0], [60, -120], [-60, -120]], ['S', 'K']); bL.paint('S', 1, [[-60, -70], [60, -70], [60, -50], [-60, -50]], ['B']); for (let i = 0; i < 6; i++) bL.ko(['S'], [[-60 + i * 22, -70], [-48 + i * 22, -50]], 4);
  bL.ko(['B'], [[-40, -110], [40, -110], [40, -82], [-40, -82]]); const n = Math.max(0, 99 - Math.floor(t * 4)); text('K', 1, '00:' + String(n).padStart(2, '0'), cx, GY + 40 - 87, '700 24px Jost', 'center');
  const sigU = (t * .8) % 1; stroke('S', 1, 6, path([[0, 140], [400, 60], [cx - 70, GY - 90]]), [18, 14]);
  const sp = sigU < .5 ? [lerp(0, 400, sigU * 2), lerp(140, 60, sigU * 2)] : [lerp(400, cx - 70, sigU * 2 - 1), lerp(60, GY - 90, sigU * 2 - 1)]; fill('S', 1, ell(sp[0], sp[1], 10));
  tag('STALSK-12', 60, 110, 'B', 30); tag('A SOVIET-ERA BLAST SITE', 60, 170, 'B', 22); tag('THE ALGORITHM', cx + 150, 880, 'S', 22); tag("THE DEAD-MAN'S SWITCH", 440, 130, 'S', 20);
}

function shPincer(t, u) {   // 12 · the temporal pincer: forward from the left, inverted from the right
  grad('B', 0, -100, 0, 640, [[0, .3], [1, .08]], rect(-300, -300, W + 600, 940));
  fill('B', .22, poly([[-300, 640], [200, 520], [600, 580], [1000, 500], [1400, 560], [W + 300, 500], [W + 300, H], [-300, H]]));
  blocks(-40, W + 40, 660, 23, .6, 100, 200, true);
  fill('B', .45, rect(-300, 660, W + 600, H));
  // a building: collapsing on the forward side, reassembling on the inverted side
  const bx = 960;
  for (let i = 0; i < 18; i++) { const r = rng(i * 13 + 1), x = bx - 170 + (i % 6) * 58, y0 = 330 + Math.floor(i / 6) * 90, side = x < bx ? -1 : 1, d0 = r(), fall = side < 0 ? ss(seg(u, .1 + d0 * .3, .5)) : 1 - ss(seg(u, .1 + d0 * .3, .5)); const y = y0 + fall * (360 - y0 + 300 * r()), rot = fall * (r() - .5) * 2, p = side < 0 ? 'B' : 'K';
    const shp = c => { c.save(); c.translate(x + 26, y + 40); c.rotate(rot); c.rect(-26, -40, 52, 80); c.restore(); };
    knock(PLATES.filter(q => q !== p), shp); fill(p, .85, shp); knock([p], c => { c.save(); c.translate(x + 26, y + 40); c.rotate(rot); c.rect(-12, -22, 24, 30); c.restore(); }); }
  if (u > .2) burst(760, 600, 70 + Math.sin(t * 9) * 8, 9, 3); if (u < .85) burst(1180, 600, 80 * (1 - ss(u)), 9, 5);
  helo(lerp(-500, 700, ss(u)), 150, 1.4, t); helo(lerp(-900, 260, ss(u)), 260, 1, t + .3);
  for (let i = 0; i < 6; i++) { const r = rng(100 + i), x = lerp(-200 + i * 90, 480 + i * 70, ss(u)) - (i % 2) * 40, y = 800 + (i % 3) * 80; figure('B', x, y, 220 + (i % 3) * 40, { coat: 'tactical', hair: 'helmet', gun: 'port', gloves: true, walk: t * 7 + r() * 6, stride: .9, face: 1 }); }
  for (let i = 0; i < 6; i++) { const r = rng(200 + i), x = lerp(W + 200 - i * 90, 1440 - i * 70, ss(u)) + (i % 2) * 40, y = 800 + (i % 3) * 80; figure('K', x, y, 220 + (i % 3) * 40, { coat: 'tactical', hair: 'helmet', mask: 'oxy', gun: 'port', gloves: true, walk: -t * 7 + r() * 6, stride: .9, face: -1 }); }
  tag('FORWARD', 120, 110, 'B', 30); tag('INVERTED', W - 120, 110, 'K', 30, 'right'); tag('A TEMPORAL PINCER · STALSK-12', 960, 200, 'B', 24, 'center');
}

function shPull(t, u) {   // 13a · the Algorithm is pulled out; meanwhile on the yacht, Kat ends it (implied)
  fill('B', .45, rect(-300, -300, 1260, H + 600)); knock(['B'], rect(330, 300, 300, 900)); stroke('B', 1, 12, path([[324, 300], [324, H + 20]])); stroke('B', 1, 12, path([[636, 300], [636, H + 20]]));
  for (let y = 320; y < H; y += 40) stroke('B', .9, 3, path([[330, y], [630, y]]));
  knock(['B'], rect(-300, -300, 1260, 600)); fill('B', .2, rect(-300, -300, 1260, 600)); stroke('B', 1, 8, path([[-300, 300], [948, 300]]));
  stroke('B', 1, 10, path([[330, 120], [480, 40], [630, 120]])); stroke('B', 1, 10, path([[480, 40], [480, 300]]));
  const ry = lerp(980, 380, ss(seg(u, 0, .6)));
  stroke('B', 1, 4, path([[480, 60], [480, ry - 60]]));
  knock(['B'], ell(480, ry, 130, 50)); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + t * .6; PARTS[i](LT(480 + Math.cos(a) * 80, ry + Math.sin(a) * 26, .22)); }
  figure('B', 170, 300, 190, { coat: 'tactical', hair: 'helmet', gloves: true, armF: [1.7, .3], armB: [1.6, .4], face: 1 });
  figure('B', 790, 300, 190, { coat: 'tactical', hair: 'helmet', gloves: true, armF: [1.7, .3], armB: [1.6, .4], face: -1 });
  if (u > .5) tag('THE ALGORITHM · RECOVERED', 480, 520, 'S', 20, 'center');
  // right: the yacht deck at sunset
  grad('S', 0, 0, 0, 700, [[0, .15], [1, .65]], rect(972, -300, W, 1000)); fill('S', 1, ell(1540, 640, 80)); knock(['S'], rect(972, 700, W, 400));
  fill('B', .25, rect(972, 700, W, 400)); fill('B', 1, rect(972, 760, W, 14)); for (let x = 990; x < W; x += 60) stroke('B', 1, 4, path([[x, 760], [x, 840]])); stroke('B', 1, 4, path([[972, 840], [W, 840]])); fill('B', .7, rect(972, 900, W, 200));
  const sl = ss(seg(u, .62, .3));
  figure('B', 1280, 960, 470, { coat: 'trench', cloth: .7, hair: 'bun', hairD: .85, earrings: true, face: 1, build: .92, armF: [1.2, .2], look: .7 });
  figure('B', 1660, 960, 500, { coat: 'overcoat', hair: 'slick', hairD: .9, build: 1.3, cloth: .9, tie: true, stubble: true, brows: 'stern', face: -1, over: ['K'], overD: .75, lift: sl, watch: true });
  // divider
  knock(PLATES, rect(948, -300, 24, H + 600)); fill('B', 1, rect(954, -300, 12, H + 600));
  tag('MEANWHILE · THE YACHT', 1010, 110, 'B', 24);
}

function shSacrifice(t, u) {   // 13b · an inverted soldier steps in front of the Protagonist (implied)
  fill('B', .9, rect(-300, -300, W + 600, H + 600));
  for (let i = 0; i < 7; i++) { const k = 1 - i * .12; knock(['B'], archS(960, 760 + 260 * k, 1500 * k, 1100 * k)); fill('B', .2 + i * .1, archS(960, 760 + 260 * k, 1500 * k, 1100 * k)); }
  fill('B', .5, poly([[0, H], [600, 800], [1320, 800], [W, H]]));
  figure('B', 1180, 790, 240, { coat: 'tactical', hair: 'balaclava', gun: 'aim', armF: [1.15, .55], armB: [.95, .75], gloves: true, face: -1, cloth: .9 });
  for (let i = 0; i < 9; i++) stroke('B', 1, 14, path([[840 + i * 30, 380], [840 + i * 30, 800]])); stroke('B', 1, 12, path([[820, 380], [1100, 380]])); stroke('B', 1, 12, path([[820, 600], [1100, 600]])); fill('B', 1, rect(940, 560, 40, 50)); knock(['B'], ell(960, 580, 8));
  figure('B', 620, 1000, 470, { coat: 'tactical', hair: 'helmet', gloves: true, stubble: true, face: 1, armF: [.3, .4], look: .9 });
  const k = ss(seg(u, .15, .3)), lift = ss(seg(u, .6, .3)) * .9;
  if (k > 0) figure('K', lerp(1500, 860, k), 1020, 500, { coat: 'tactical', hair: 'helmet', mask: 'gas', gloves: true, pack: true, trinket: true, face: -1, walk: -t * 6, stride: .6 * (1 - k), armF: [1.6, .2], armB: [.4, .3], lift });
  if (u > .55 && u < .66) stroke('B', 1, 4, path([[1140, 700], [940, 700]]));
  tag('AN INVERTED SOLDIER', 860, 320, 'K', 24, 'center');
}

function shTrinket(t, u) {   // 14 · the trinket on Neil's bag
  fill('B', .2, rect(-300, -300, W + 600, H + 600)); for (let x = -300; x < W + 300; x += 40) knock(['B'], path([[x, -300], [x + 600, H + 300]]), 2);
  const L = LT(1300, 520, 3.2);
  L.paint('B', .82, [[-90, -150], [80, -160], [100, 120], [-100, 130]], ['S', 'K']);
  L.ko(['B'], [[-80, -40], [86, -46]], 2); for (let i = 0; i < 40; i++) L.ko(['B'], [[-78 + i * 4.2, -44 - i * .15], [-78 + i * 4.2, -38 - i * .15]], .8);
  L.paint('B', 1, [[-60, -170], [60, -176], [60, -150], [-60, -150]]); L.line('B', 1, 10, [[-70, -150], [-90, -260]]); L.line('B', 1, 10, [[70, -152], [90, -260]]);
  L.paint('B', .6, [[-70, 20], [70, 16], [74, 110], [-74, 114]]); L.ko(['B'], [[-70, 20], [70, 16]], 2);
  for (let i = 0; i < 4; i++) L.ko(['B'], [[-60 + i * 38, 60], [-40 + i * 38, 60]], 1.2);
  trinket(1300, 520 - 30, 22, 0, 1);
  const cx = 1300, cy = 560, R = 270; stroke('B', 1, 10, ell(cx, cy, R)); knock(['S', 'K'], ring(cx, cy, R + 5, R + 30));
  const sw = Math.sin(t * 2) * 4;
  figure('B', 400 + sw, 1900, 1700, { ...PROTAG.fig, armF: [.05, .22], fixedY: true, face: 1, look: 1, mood: 'calm', halo: 8 });
  stroke('B', .9, 3, path([[620, 330], [1030, 520]]), [14, 12]);
  if (u > .3) tag('THE ORANGE TRINKET', cx, 140, 'S', 28, 'center');
  tag("NEIL'S BAG", cx + 200, 300, 'B', 24);
}

function shFarewell(t, u) {   // 15a · Neil goes back; he turns pink as he walks away
  grad('S', 0, 0, 0, 640, [[0, .05], [1, .5]], rect(-300, -300, W + 600, 940)); grad('B', 0, -100, 0, 640, [[0, .4], [1, 0]], rect(-300, -300, W + 600, 940));
  fill('S', 1, ell(1500, 640, 90)); knock(['S'], rect(1380, 640, 240, 100));
  blocks(-40, W + 40, 640, 41, .55, 90, 180, true);
  knock(['S'], rect(-300, 640, W + 600, H)); fill('B', .42, rect(-300, 640, W + 600, H));
  const r = rng(8); for (let i = 0; i < 50; i++) { const x = r() * W, y = 660 + r() * 400; knock(['B'], path([[x, y], [x + 20 + r() * 40, y + r() * 6]]), 2); }
  figure('B', 520, 1000, 560, { coat: 'tactical', hair: 'crop', stubble: true, face: 1, look: 1, armF: [.05, .2], armB: [.05, .2] });
  const w = ss(seg(u, .2, .8)), x = lerp(900, 1560, w), pk = ss(seg(u, .35, .5));
  const nO = { coat: 'linen', cloth: .48, hair: 'swept', scarf: true, rolled: true, pack: true, trinket: true, face: u < .2 ? -1 : 1, walk: t * 5.5, stride: u < .2 ? 0 : .8, armF: u < .2 ? [2.7, .2] : undefined, smile: true };
  figure('B', x, 1000 - w * 120, 540 - w * 140, { ...nO, lift: pk, trinket: pk < .5 });
  if (pk > 0) figure('K', x, 1000 - w * 120, 540 - w * 140, { ...nO, trinket: pk >= .5, lift: 1 - pk, halo: 0, selfHalo: 0 });
  tag('NEIL', x, 300, pk > .5 ? 'K' : 'B', 26, 'center');
}

function shFounder(t, u) {   // 15b · the founder: the whole story was a loop, his own plan
  fill('B', .1, rect(-300, -300, W + 600, H + 600));
  const cx = 960, cy = 640, R = 330;
  on('B', c => { c.strokeStyle = '#000'; c.lineWidth = 14; c.beginPath(); c.arc(cx, cy, R, Math.PI, TAU); c.stroke(); });
  on('K', c => { c.strokeStyle = '#000'; c.lineWidth = 14; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI); c.stroke(); });
  fill('B', 1, poly([[cx + R, cy + 6], [cx + R - 30, cy - 40], [cx + R + 30, cy - 40]]));
  fill('K', 1, poly([[cx - R, cy - 6], [cx - R - 30, cy + 40], [cx - R + 30, cy + 40]]));
  const st_ = [['OPERA', Math.PI * 1.12], ['FREEPORT', Math.PI * 1.38], ['TALLINN', Math.PI * 1.62], ['TURNSTILE', Math.PI * 1.88], ['STALSK-12', Math.PI * .3], ['THE YACHT', Math.PI * .7]];
  for (const [s, a] of st_) { const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, p = a > Math.PI ? 'B' : 'K'; knock(['B', 'K'], ell(x, y, 18)); fill(p, 1, ell(x, y, 11)); text(p, 1, s, x + Math.cos(a) * 70, y + Math.sin(a) * 44 + 8, '600 22px Jost', 'center', undefined, 3); }
  figure('B', cx, 1010, 640, { coat: 'suit', hair: 'crop', tie: true, stubble: true, watch: true, face: 1, look: 0, armF: [.15, .35], armB: [.05, .2], halo: 8 });
  const k = ss(seg(u, .05, .2));
  if (k > 0) { knock(['B', 'K'], rect(cx - 520, 60, 1040, 150)); text('S', k, 'THE FOUNDER', cx, 180, '800 128px Bricolage', 'center', undefined, 6); }
  if (u > .3) tag('OF TENET', cx, 260, 'B', 26, 'center');
  trinket(cx + 170, 700, 9, 0, 1.8);
}

// ---------------------------------------------------------------- subtitles: a paper strip knocked out of every plate, the words in blue
function drawSub(t) {
  const cue = CUES.find(q => t >= q.t0 && t < q.t1); if (!cue) return;
  const size = 36, lh = 46, rows = wrap(cue.text, 72);
  const c0 = PL.B; c0.save(); c0.setTransform(1, 0, 0, 1, 0, 0); c0.font = `500 ${size}px Jost`; const w = Math.max(...rows.map(r => c0.measureText(r).width)) + 70; c0.restore();
  const h = rows.length * lh + 30, x = (W - w) / 2, y = H - 26 - h;
  for (const p of PLATES) { const c = PL[p]; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(x, y, w, h); c.restore(); }
  const c = PL.B; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(x, y, w, 4); c.font = `500 ${size}px Jost`; c.textAlign = 'center'; rows.forEach((r, i) => c.fillText(r, W / 2, y + 16 + lh * (i + .78))); c.restore();
}

// ---------------------------------------------------------------- the frame: plates -> separation -> print
function frame(t) {
  T = t;
  for (const p of PLATES) { const c = PL[p]; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); }
  let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].t0) i++;
  const sh = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t0 : window.DUR, lt = t - sh.t0, u = clamp(lt / (t1 - sh.t0));
  const cm = sh.cam || {}; const e = ss(u);
  setCam(lerp(cm.z0 ?? 1, cm.z1 ?? 1.04, e), cm.cx ?? 960, cm.cy ?? 540, lerp(cm.px0 ?? 0, cm.px1 ?? 0, e), lerp(cm.py0 ?? 0, cm.py1 ?? 0, e));
  const extra = sh.draw(lt, u) || {};
  for (const p of PLATES) PL[p].setTransform(1, 0, 0, 1, 0, 0);
  ambient(t, i);
  drawSub(t);
  const bB = PL.B.getImageData(0, 0, W, H).data, bS = PL.S.getImageData(0, 0, W, H).data, bK = PL.K.getImageData(0, 0, W, H).data;
  const sep = SC.createImageData(W, H), d = sep.data;
  for (let j = 0; j < d.length; j += 4) { d[j] = bB[j + 3]; d[j + 1] = bS[j + 3]; d[j + 2] = bK[j + 3]; d[j + 3] = 255; }
  SC.putImageData(sep, 0, 0);
  // a new sheet at every cut: each plate rolls in from the left, staggered; misregistration changes per sheet
  const sweep = [0, .07, .14].map(st => { const v = (lt - st) / .42; return v >= 1 ? 1e5 : -200 + (W + 400) * Math.max(0, v); });
  const endT = LEND(15) + .15;
  if (t > endT) { sweep[0] = W + 200 - (W + 400) * clamp((t - endT) / .7); sweep[2] = W + 200 - (W + 400) * clamp((t - endT - .15) / .7); }
  const r = rng(i * 7 + 3);
  print(SEP, {
    gate: [1, 1, 1], sweep,
    off: [[0, 0], [(r() - .5) * 7, (r() - .5) * 6], [(r() - .5) * 7, (r() - .5) * 6]], rot: [0, (r() - .5) * .002, (r() - .5) * .002],
    seed: Math.floor(t * 12), sheet: i + 1, boil: .35, grain: 1, period: 6.5,
    inks: INKS, water: extra.water || null,
  });
}

window.DUR = 0; window.READY = false;
(async () => {
  await Promise.all(['400 40px Jost', '500 40px Jost', '600 40px Jost', '700 40px Jost', '800 40px Bricolage', '600 40px Bricolage'].map(f => document.fonts.load(f)));
  LINES = await (await fetch('lines.json')).json();
  const dur = await (await fetch('voices/dur.json')).json();
  let t = 0.35; for (const l of LINES) { S.push(t); D.push(dur[l.id]); t += dur[l.id] + 0.3; }
  window.DUR = LEND(15) + 2.2;
  CUES = cues(LINES, S, D); window.SUBS = CUES;
  SHOTS = [
    { t0: 0, draw: shTitle, cam: { z0: 1, z1: 1.05, cy: 560 } },
    { t0: Lt(2, 0), draw: shOperaOut, cam: { z0: 1, z1: 1.08, cy: 640 } },
    { t0: Lt(2, .36), draw: shOperaIn, cam: { z0: 1.05, z1: 1, cx: 1100 } },
    { t0: Lt(2, .66), draw: shBullet, cam: { z0: 1, z1: 1.05, cx: 1100, cy: 450 } },
    { t0: Lt(2, .86), draw: portrait(PROTAG), cam: { z0: 1.02, z1: 1.07, cx: 600, cy: 400 } },
    { t0: Lt(3, 0), draw: shLoyalty, cam: { z0: 1, z1: 1.06, cx: 1300, cy: 400 } },
    { t0: Lt(3, .55), draw: shRecruit, cam: { z0: 1.04, z1: 1 } },
    { t0: Lt(4, 0), draw: shLab, cam: { z0: 1, z1: 1.05, px0: 30, px1: -30 } },
    { t0: Lt(5, 0), draw: shSator, cam: { z0: 1, z1: 1.1, cx: 1260, cy: 380 } },
    { t0: Lt(5, .52), draw: portrait(SATOR), cam: { z0: 1.02, z1: 1.07, cx: 600, cy: 400 } },
    { t0: Lt(6, 0), draw: shParts, cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(6, .55), draw: shPlanet, cam: { z0: 1, z1: 1.08, cy: 510 } },
    { t0: Lt(7, 0), draw: shTeam, cam: { z0: 1.04, z1: 1, cy: 700 } },
    { t0: Lt(7, .43), draw: portrait(NEIL), cam: { z0: 1.02, z1: 1.07, cx: 600, cy: 400 } },
    { t0: Lt(7, .69), draw: portrait(KAT), cam: { z0: 1.02, z1: 1.07, cx: 600, cy: 400 } },
    { t0: Lt(8, 0), draw: shFreeport, cam: { z0: 1, z1: 1.05, cx: 1300 } },
    { t0: Lt(8, .5), draw: shHighway, cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(9, 0), draw: shKat, cam: { z0: 1, z1: 1.05 } },
    { t0: Lt(10, 0), draw: shTurnstile, cam: { z0: 1, z1: 1.04 } },
    { t0: Lt(11, 0), draw: shYacht, cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(11, .52), draw: shStalsk, cam: { z0: 1, z1: 1.05, cy: 700 } },
    { t0: Lt(12, 0), draw: shPincer, cam: { z0: 1.03, z1: 1 } },
    { t0: Lt(13, 0), draw: shPull, cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(13, .45), draw: shSacrifice, cam: { z0: 1, z1: 1.08, cx: 800, cy: 700 } },
    { t0: Lt(14, 0), draw: shTrinket, cam: { z0: 1, z1: 1.08, cx: 1300, cy: 600 } },
    { t0: Lt(15, 0), draw: shFarewell, cam: { z0: 1, z1: 1.03 } },
    { t0: Lt(15, .5), draw: shFounder, cam: { z0: 1.06, z1: 1, cy: 560 } },
  ];
  window.SHOTS = SHOTS.map(s => s.t0);
  window.render = t => frame(t);
  window.READY = true;
})();
