// La Planchada, in oil: palette-knife impasto plates, knife-painted figures, colour re-laid by the knife. Pure function of t.
import { knife, poly, blob, ell, rect, line, dab, bake, knifeText, setGrey, mulberry, hx, css, TAU, lerp, clamp } from './knife.js';
import { buildFigure, drawFigure, drawPart, SPECS, buildBed, buildHeart, buildBottle, buildBouquet, face } from './figs.js';
const cv = document.getElementById('c'), W = 1080, H = 1920, MX = 140, MY = 260;
window.DUR = 62.4;
const VO = [
  ['v01', 0.35, 7.603, "In hospitals across Mexico, patients tell stories of a mysterious nurse who appears at night… but doesn't belong to the living."],
  ['v02', 8.25, 6.783, 'They call her La Planchada. She wears an old-fashioned white uniform, perfectly ironed, without a single wrinkle.'],
  ['v03', 15.34, 6.066, 'According to legend, she was once a dedicated nurse who fell deeply in love with a doctor who betrayed her.'],
  ['v04', 21.7, 7.85, 'Some versions say she died heartbroken. Others claim she neglected her patients before dying, leaving her spirit unable to rest.'],
  ['v05', 29.85, 6.556, 'Patients have claimed a strange nurse appeared beside their beds, checked their medicine, and comforted them through the night.'],
  ['v06', 36.71, 6.112, 'But when those patients thanked the hospital staff the next morning, nobody recognized the nurse they described.'],
  ['v07', 43.12, 7.036, 'According to the stories, some patients later discovered that the woman who cared for them had supposedly died years earlier.'],
  ['v08', 50.46, 8.165, "And here's the chilling legend: La Planchada doesn't haunt hospitals to hurt people. She returns because she never stopped caring for her patients."],
];
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const spring = (t, k = 7, z = 4) => 1 - Math.exp(-z * t) * Math.cos(k * t);
let G, PL = {}, FG = {}, SP = {}, TX = {};
const cam = (g, cx, cy, z) => g.setTransform(z, 0, 0, z, 540 - cx * z, 960 - cy * z);
const plate = (w, h, fn, ridge = false) => bake(W + 2 * MX, H + 2 * MY, MX, MY, fn, ridge);
const drawPlate = (g, p) => g.drawImage(p.cv, -p.ox, -p.oy);
const drawRake = (g, p, a) => { if (a > 0 && p.rv) { g.save(); g.globalAlpha = a * .3; g.globalCompositeOperation = 'screen'; g.drawImage(p.rv, -p.ox, -p.oy); g.restore(); } };
function glow(g, x, y, r, c, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, css(hx(c), a)); gr.addColorStop(1, css(hx(c), 0)); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }

// ---------------------------------------------------------------- plates
function wallPt(side, u, v) { const A = { l: 395, r: 685, t: 610, b: 1020 }, x = lerp(side < 0 ? 0 : W, side < 0 ? A.l : A.r, u), top = lerp(-10, A.t, u), bot = lerp(1500, A.b, u); return [x, lerp(top, bot, v)]; }
function paintHall(g, gr) {
  const A = { l: 395, r: 685, t: 610, b: 1020 }, K = (s, o) => knife(g, s, o, gr);
  K(rect(-140, -260, W + 280, 2440), { c: '#0f1720', r: 40, seed: 1, fine: false });
  K(poly([[-140, -260], [W + 140, -260], [A.r, A.t], [A.l, A.t]]), { c: '#111a24', c2: '#1b2937', r: 26, dir: 0, seed: 2 });
  K(poly([[-140, -230], [A.l, A.t], [A.l, A.b], [-140, 1670]]), { c: '#2a3d4f', c2: '#3a5266', r: 24, dir: -.9, seed: 3 });
  K(poly([[W + 140, -230], [A.r, A.t], [A.r, A.b], [W + 140, 1670]]), { c: '#203243', c2: '#2d4358', r: 24, dir: .9, seed: 4 });
  K(rect(A.l, A.t, A.r - A.l, A.b - A.t), { c: '#4a6277', c2: '#5c768c', r: 12, dir: 0, seed: 5 });
  K(poly([[-140, 1670], [A.l, A.b], [A.r, A.b], [W + 140, 1670], [W + 140, 2180], [-140, 2180]]), { c: '#2b3744', c2: '#3b4a5a', r: 26, dir: 0, seed: 6 });
  for (const side of [-1, 1]) for (const [u0, u1] of [[.08, .3], [.42, .56], [.7, .8]]) {
    const q = [wallPt(side, u0, .24), wallPt(side, u1, .24), wallPt(side, u1, 1), wallPt(side, u0, 1)];
    K(poly(q), { c: '#0c1219', c2: '#16212c', r: 14, dir: side * .9, seed: 10 + u0 * 20 });
    K(poly([wallPt(side, u0 + .012, .3), wallPt(side, u1 - .012, .3), wallPt(side, u1 - .012, .5), wallPt(side, u0 + .012, .5)]), { c: '#7a92a8', c2: '#9ab0c4', r: 6, dir: side * .9, seed: 20 + u0 * 20 });
  }
  K(rect(480, 760, 120, 260), { c: '#0a1016', r: 10, dir: -Math.PI / 2, seed: 30, fine: false }); K(rect(486, 1010, 108, 8), { c: '#f0c070', r: 3, dir: 0, seed: 31, fine: false });
  const lamps = [[.12, 90], [.4, 70], [.66, 44], [.86, 26]];
  for (const [u, w] of lamps) { const y = lerp(-10, A.t, u) + 60; K(ell(540, y, w, 14), { c: '#f2b25a', c2: '#ffd98e', r: 6, dir: 0, seed: 40 + u * 10, fine: false }); }
  // wet floor: explicit stacks of short horizontal dabs under each lamp
  const R = mulberry(5); [[1052, 18], [1086, 26], [1130, 36], [1190, 50], [1270, 66], [1380, 84], [1520, 100], [1700, 120]].forEach(([y, w], i) => { for (let k = 0; k < 3; k++) K(ell(540 + (R() - .5) * w * .6, y + k * 7, w * (.7 + R() * .5), 5), { c: '#e0a050', c2: '#f4c478', r: 4, dir: 0, seed: 60 + i * 4 + k, fine: false }); });
}
function paintWard(g, gr) {
  const K = (s, o) => knife(g, s, o, gr);
  K(rect(-140, -260, W + 280, 1820), { c: '#2c4152', c2: '#3a5266', r: 34, dir: -.3, seed: 101 });
  K(rect(-140, 1040, W + 280, 520), { c: '#22313e', c2: '#2c3e4e', r: 28, dir: 0, seed: 102 }); K(rect(-140, 1030, W + 280, 24), { c: '#161f28', r: 6, dir: 0, seed: 103, fine: false });
  K(rect(600, 230, 330, 560), { c: '#c6ced6', r: 8, dir: 0, seed: 104, fine: false }); K(rect(618, 248, 294, 524), { c: '#0d141c', c2: '#16212c', r: 16, dir: -Math.PI / 2, seed: 105 });
  K(ell(790, 420, 74, 74), { c: '#f2efdc', c2: '#e2dec8', r: 8, dir: -.6, seed: 106 }); glow(g, 790, 420, 260, '#cfe0f0', .22);
  K(rect(762, 248, 12, 524), { c: '#c6ced6', r: 4, dir: -Math.PI / 2, seed: 107, fine: false }); K(rect(618, 500, 294, 12), { c: '#c6ced6', r: 4, dir: 0, seed: 108, fine: false });
  K(blob([[560, 220], [660, 230], [650, 420], [610, 560], [560, 700]]), { c: '#586e84', c2: '#6e86a0', r: 12, dir: -Math.PI / 2, seed: 109 }); K(blob([[970, 220], [880, 230], [890, 420], [930, 560], [970, 700]]), { c: '#586e84', c2: '#6e86a0', r: 12, dir: -Math.PI / 2, seed: 110 });
  K(rect(150, 300, 190, 240), { c: '#1c2833', r: 10, dir: 0, seed: 111 }); K(rect(228, 340, 34, 150), { c: '#b8c4d0', r: 5, dir: 0, seed: 112, fine: false }); K(rect(190, 392, 110, 34), { c: '#b8c4d0', r: 5, dir: 0, seed: 113, fine: false });
  K(rect(-140, 1540, W + 280, 640), { c: '#3a4858', c2: '#4a5a6c', r: 30, dir: 0, seed: 114 });
  const R = mulberry(8); for (let i = 0; i < 9; i++) K(ell(790 + (R() - .5) * 120, 1580 + i * 44, 70 - i * 3, 5), { c: '#9fb4c8', c2: '#c0d0de', r: 4, dir: 0, seed: 120 + i, fine: false });
  K(rect(996, 1060, 8, 440), { c: '#161f28', r: 3, dir: -Math.PI / 2, seed: 140, fine: false }); K(rect(960, 1060, 80, 14), { c: '#161f28', r: 4, dir: 0, seed: 141, fine: false }); K(rect(975, 1080, 50, 90), { c: '#9fb4c8', r: 5, dir: -Math.PI / 2, seed: 142, fine: false });
}
function paintWall2(g, gr) {
  const K = (s, o) => knife(g, s, o, gr);
  K(rect(-140, -260, W + 280, 2440), { c: '#16222e', c2: '#22344a', r: 36, dir: -.2, seed: 201 });
  for (let x = -100; x < W + 140; x += 150) K(rect(x, 200, 110, 1300), { c: '#1a2836', c2: '#26394d', r: 14, dir: -Math.PI / 2, seed: 210 + x, fine: false });
  K(poly([[-140, -100], [420, 200], [300, 1500], [-140, 1700]]), { c: '#3a5a78', c2: '#5a7c9a', r: 26, dir: -.9, seed: 202, dens: .8 });
  K(rect(-140, 1560, W + 280, 640), { c: '#101a24', c2: '#1c2a38', r: 30, dir: 0, seed: 203 });
  K(rect(40, 1380, 360, 24), { c: '#4a3828', r: 6, dir: 0, seed: 204 }); K(rect(60, 1404, 24, 160), { c: '#3a2a1e', r: 5, dir: -Math.PI / 2, seed: 205, fine: false }); K(rect(356, 1404, 24, 160), { c: '#3a2a1e', r: 5, dir: -Math.PI / 2, seed: 206, fine: false });
  // an old flat-iron on the table
  K(blob([[90, 1380], [300, 1380], [270, 1330], [180, 1296], [100, 1330]]), { c: '#7c8794', c2: '#a3adb9', r: 10, dir: -.2, seed: 207 }); K(blob([[130, 1308], [180, 1262], [250, 1268], [270, 1318], [250, 1322], [236, 1290], [180, 1288], [150, 1320]]), { c: '#1c2229', r: 5, dir: 0, seed: 208, fine: false });
}
function paintGarden(g, gr) {
  const K = (s, o) => knife(g, s, o, gr);
  K(rect(-140, -260, W + 280, 1500), { c: '#e7a56c', c2: '#f4cf98', r: 34, dir: -.3, seed: 301 }); K(rect(-140, -260, W + 280, 520), { c: '#b98aa6', c2: '#d6a2a4', r: 34, dir: -.2, seed: 302 });
  K(ell(560, 880, 150, 150), { c: '#fde8a8', c2: '#ffd070', r: 10, dir: -.4, seed: 303 });
  K(rect(-140, 1180, W + 280, 1000), { c: '#8aa05c', c2: '#a8b872', r: 30, dir: -.2, seed: 304 });
  K(blob([[190, 1300], [190, 560], [330, 330], [540, 270], [750, 330], [890, 560], [890, 1300], [830, 1300], [830, 580], [720, 400], [540, 340], [360, 400], [250, 580], [250, 1300]]), { c: '#6a4a3a', c2: '#8a6a52', r: 16, dir: -Math.PI / 2, seed: 305 });
  const R = mulberry(31); for (let i = 0; i < 36; i++) { const a = R() * Math.PI, x = 540 + Math.cos(a) * 330 * (R() > .5 ? 1 : -1) * (.82 + R() * .2), y = 560 - Math.sin(a) * 280 + R() * 40; K(ell(x, y, 22 + R() * 14, 12 + R() * 8, R() * 3), { c: '#4f7a52', c2: '#78a05e', r: 6, dir: R(), seed: 320 + i, fine: false }); }
  for (const [x, s] of [[80, 1], [1010, 1.1]]) { K(rect(x - 24, 880, 48, 420), { c: '#4a3426', r: 8, dir: -Math.PI / 2, seed: 340 + x, fine: false }); K(blob([[x - 160 * s, 880], [x - 130 * s, 640], [x, 580], [x + 130 * s, 640], [x + 160 * s, 880], [x, 950]]), { c: '#5a8a52', c2: '#86b05e', r: 14, dir: -.4, seed: 342 + x }); }
  K(poly([[330, 1300], [750, 1300], [W + 140, 2180], [-140, 2180]]), { c: '#e6c79a', c2: '#f4dcb2', r: 26, dir: -1.2, seed: 350 });
  K(rect(650, 1290, 330, 24), { c: '#4a3226', r: 6, dir: 0, seed: 351, fine: false }); K(rect(660, 1226, 310, 60), { c: '#6a4a38', r: 8, dir: 0, seed: 352 }); for (const x of [680, 940]) K(rect(x, 1312, 18, 72), { c: '#3a261c', r: 5, dir: -Math.PI / 2, seed: 353 + x, fine: false });
  for (let i = 0; i < 30; i++) K(ell(R() * W, 1340 + R() * 560, 8, 6), { c: ['#f5eee0', '#e8a23c', '#d4552a', '#c9406a'][i % 4], r: 3, dir: 0, seed: 370 + i, fine: false });
}
function paintLobby(g, gr) {
  const K = (s, o) => knife(g, s, o, gr);
  K(rect(-140, -260, W + 280, 1820), { c: '#d6c4a2', c2: '#e8d9b8', r: 34, dir: -.3, seed: 401 });
  K(rect(-140, 1050, W + 280, 520), { c: '#8a6e58', c2: '#a68870', r: 28, dir: 0, seed: 402 }); K(rect(-140, 1040, W + 280, 22), { c: '#4a362a', r: 6, dir: 0, seed: 403, fine: false });
  K(rect(60, 260, 330, 620), { c: '#e6dcc4', r: 8, dir: 0, seed: 404, fine: false }); K(rect(76, 276, 298, 588), { c: '#fff3c8', c2: '#ffe08a', r: 14, dir: -.5, seed: 405 }); K(rect(214, 276, 12, 588), { c: '#8a7a62', r: 4, dir: -Math.PI / 2, seed: 406, fine: false }); K(rect(76, 540, 298, 12), { c: '#8a7a62', r: 4, dir: 0, seed: 407, fine: false });
  K(poly([[90, 330], [440, 580], [470, 1400], [60, 880]]), { c: '#f6e6b0', c2: '#ffeec0', r: 22, dir: .6, seed: 408, dens: .6 });
  for (const [x, y, w, h] of [[470, 320, 130, 170], [630, 300, 150, 190], [820, 330, 120, 160], [470, 540, 130, 150], [820, 540, 130, 160]]) { K(rect(x, y, w, h), { c: '#3a2a22', r: 6, dir: 0, seed: 410 + x, fine: false }); K(rect(x + 12, y + 12, w - 24, h - 24), { c: '#cdb99a', c2: '#e2d0b0', r: 6, dir: -.3, seed: 411 + y, fine: false }); }
  K(rect(520, 1090, 540, 350), { c: '#5a4032', c2: '#6e5242', r: 14, dir: -Math.PI / 2, seed: 420 }); K(rect(500, 1060, 580, 40), { c: '#2e1f18', r: 6, dir: 0, seed: 421, fine: false });
  K(rect(60, 1230, 90, 120), { c: '#4a3a30', r: 6, dir: 0, seed: 422, fine: false }); for (let i = 0; i < 6; i++) K(blob([[105, 1230], [105 + (i - 2.5) * 40, 1090 - (i % 2) * 40], [105 + (i - 2.5) * 70, 1170]]), { c: '#4f7a46', c2: '#78a05e', r: 6, dir: -Math.PI / 2, seed: 430 + i, fine: false });
  K(rect(-140, 1500, W + 280, 680), { c: '#a89478', c2: '#c2ae92', r: 30, dir: 0, seed: 440 });
  K(rect(300, 130, 480, 90), { c: '#2e1f18', r: 6, dir: 0, seed: 441, fine: false }); TX.sign.draw(g, 1, 1);
}
function paintEnd(g) { knife(g, rect(-140, -260, W + 280, 2440), { c: '#0c1218', c2: '#16212c', r: 44, dir: -.4, seed: 501 }); }

// ---------------------------------------------------------------- scenes
const look = (eyes, mouth, extra = {}) => ({ eyes, mouth, lash: true, ...extra });
let SCENE_GREY = 0;
function figGrey(g, fn) { if (SCENE_GREY) { g.save(); g.filter = 'grayscale(1) brightness(.96)'; fn(); g.restore(); } else fn(); }
function bedDraw(g, x, y, k, o = {}) {
  drawPart(g, SP.bed, x, y, 0, k, k, 1, o.rake || 0);
  push(g, () => { g.translate(x - 120 * k, y - 150 * k); g.scale(k * .9, k * .9); drawPart(g, FG.pj.parts.head, 0, 0, o.tilt || -.04, 1, 1, 1, o.rake || 0); g.translate(0, 0); g.save(); g.translate(0, 0); if (o.tilt) g.rotate(o.tilt); g.translate(0, 0); face(g, o.look, '#5a4a40'); g.restore(); });
}
const push = (g, fn) => { g.save(); fn(); g.restore(); };
function bellDraw(g, x, y, t, ring) { const sh = ring ? Math.sin(t * 90) * 3 : 0; push(g, () => { g.translate(x + sh, y); knife(g, ell(0, 0, 44, 44), { c: '#d8d0b8', c2: '#f0e8d0', r: 6, dir: 0, seed: 601, fine: false }); line(g, [[0, 0], [0, -26]], 4, '#2a2218'); line(g, [[0, 0], [18, 8]], 3, '#2a2218'); if (ring) for (const s of [-1, 1]) line(g, [[s * 58, -26], [s * 82, -40]], 4, '#f0e8d0', .8); }); }

function s1(g, t) {
  const u = ss(seg(t, 0, 8.15)); cam(g, 540, 960, lerp(1, 1.12, u)); drawPlate(g, PL.hall);
  // a patient opens a ward door a crack: a sliver of warm light, then it slams
  const op = ss(seg(t, 5.4, 5.7)) * (1 - ss(seg(t, 6.3, 6.45)));
  if (op > .01) { const q = [wallPt(-1, .42, .24), wallPt(-1, .42 + .14 * op, .24), wallPt(-1, .42 + .14 * op, 1), wallPt(-1, .42, 1)]; push(g, () => { g.fillStyle = css(hx('#f0b460'), .9); g.beginPath(); q.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); }); }
  // the clock spins to midnight
  const sp = t < 3.4 ? t * 10 : 0; push(g, () => { g.translate(540, 560); dab(g, 0, 0, 56, 56, '#d8d0b8'); dab(g, 0, 0, 48, 48, '#ece6d4'); line(g, [[0, 0], [Math.sin(sp / 12) * 24, -Math.cos(sp / 12) * 24]], 5, '#1c1c22'); line(g, [[0, 0], [Math.sin(sp) * 38, -Math.cos(sp) * 38]], 3.5, '#1c1c22'); });
  if (t > 3.5) { const u2 = ss(seg(t, 3.5, 8.15)), k = lerp(.5, 1.5, u2), y = lerp(1010, 1650, u2); drawFigure(g, FG.ghost, { x: 540 + Math.sin(t * 1.3) * 30 * (1 - u2 * .5), y, k, bob: Math.sin(t * TAU) * 6 * k, alpha: .93, look: look(t > 7.4 ? 'wide' : 'open', 'smile'), armL: { a: .12 + .05 * Math.sin(t * 3) }, armR: { a: .12 + .05 * Math.sin(t * 3) } }); glow(g, 540, y - 200 * k, 260 * k, '#cfe0f0', .12); }
  const dark = ss(seg(t, 6.0, 8.15)) * 0; void dark;
}
function s2(g, t) {
  cam(g, 540, 1080, lerp(1.1, 1.2, ss(seg(t, 8.15, 15.2)))); drawPlate(g, PL.wall2);
  // steam rising off the iron
  for (let i = 0; i < 9; i++) { const u = ((t * .5) + i / 9) % 1; dab(g, 190 + Math.sin(u * 7 + i) * 24, 1290 - u * 260, 14 + u * 22, 10 + u * 16, '#c8d4e0', .35 * (1 - u)); }
  const rake = ss(seg(t, 11.8, 12.5)) * (1 - ss(seg(t, 14.6, 15.1)));
  const curt = ss(seg(t, 9.3, 9.7)) * (1 - ss(seg(t, 9.9, 10.3)));
  drawFigure(g, FG.ghost, { x: 600, y: 1560, k: 2.0, bob: Math.sin(t * TAU / 1.0) * 9, alpha: .95, lean: -curt * .1, look: look(curt > .5 ? 'happy' : 'open', 'smile', { lx: -.3 }), armL: { a: .1 }, armR: curt > .4 ? { a: -1.2, front: true } : { a: -.1 }, rake: rake * .45 });
  glow(g, 600, 1100, 500, '#cfe0f0', .1 + .1 * rake);
}
function reveal(g, t, t0, t1, cx, cy, drain, draw) {
  // grey -> colour wave re-laid from (cx,cy); drain reverses it
  const p = drain ? 1 - ss(seg(t, t0, t1)) : ss(seg(t, t0, t1)), r = p * 1900;
  if (p <= .001) { SCENE_GREY = 1; draw(1); SCENE_GREY = 0; return; }
  if (p >= .999) { draw(0); return; }
  SCENE_GREY = 1; draw(1); SCENE_GREY = 0;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); const R = mulberry(4); for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU, rr = r * (1 + (Math.sin(a * 7 + t * 2) * .05 + Math.sin(a * 13) * .03)); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.clip(); draw(0); g.restore();
}
function heartHalves(g, x, y, t0, t) { const u = seg(t, t0, t0 + .7), w = Math.max(0, (u - .35) / .65); if (u < .35) drawPart(g, SP.heart, x, y, 0, 1, 1); else { drawPart(g, SP.heartL, x - w * 80, y + w * w * 300, -w * 1.2, 1, 1); drawPart(g, SP.heartR, x + w * 80, y + w * w * 300, w * 1.2, 1, 1); } }
function s3(g, t) {
  reveal(g, t, 15.35, 17.2, 330, 1250, 0, grey => {
    cam(g, 540, 960, lerp(1.0, 1.06, ss(seg(t, 15.2, 21.6)))); drawPlate(g, grey ? PL.gardenG : PL.garden);
    const love = t > 19.5, bet = t > 20.9, away = ss(seg(t, 21.0, 21.6));
    figGrey(g, () => {
      drawFigure(g, FG.nurse, { x: 330, y: 1500, k: 1.75, bob: Math.sin(t * TAU) * 3, lean: bet ? .05 : 0, look: look(love && !bet ? 'happy' : 'open', bet ? 'frown' : 'smile', { lx: .5 }), armL: { a: .1 }, armR: bet ? { a: .1 } : { a: -.5 }, walk: null });
      drawFigure(g, FG.doc, { x: lerp(760, 960, away), y: 1500, k: 1.8, flip: true, look: look(bet ? 'squint' : 'open', bet ? 'grin' : 'smile', { lx: bet ? .6 : -.5 }), armL: { a: .1 }, armR: bet ? { a: -.6 } : { a: -.2 }, walk: away > 0 && away < 1 ? t * 8 : null });
      if (t > 20.3) drawFigure(g, FG.woman, { x: lerp(1250, 1000, ss(seg(t, 20.4, 21.0))) + away * 160, y: 1500, k: 1.6, flip: true, look: look('happy', 'grin'), armL: { a: .1 }, armR: { a: -.4 }, walk: away > 0 && away < 1 ? t * 8 : null });
    });
  });
  if (t > 19.6) for (let k = 0; k < 6; k++) { const t0 = 19.66 + k * .24, u = t - t0; if (u < 0 || u > 1.6) continue; push(g, () => { g.translate(330 + Math.sin(u * 4 + k) * 40 + (k - 2.5) * 22, 1050 - u * 190); const sc = .22 + .1 * (k % 3); g.scale(sc, sc); drawPart(g, SP.heart, 0, 0, 0, 1, 1, 1 - seg(u, 1.1, 1.6)); }); }
  if (t > 21.0) heartHalves(g, 330, 1030, 21.0, t);
}
function s3b(g, t) { reveal(g, t, 21.05, 21.6, 330, 1250, 1, () => { }); }
function s4a(g, t) {
  cam(g, 540, 960, 1); SCENE_GREY = 1; drawPlate(g, PL.gardenG); const f = eo(seg(t, 23.68, 24.2));
  figGrey(g, () => drawFigure(g, FG.nurse, { x: 520, y: 1500, k: 1.75, lean: -1.4 * f, look: look(f > .1 ? 'shut' : 'open', f > .1 ? 'wavy' : 'frown'), armL: { a: .1 }, armR: { a: .1 } }));
  SCENE_GREY = 0;
  // paint-rain: vertical dabs
  const R = mulberry(9); for (let i = 0; i < 70; i++) { const x = R() * W, sp = .6 + R() * .6, y = ((t * 900 * sp + R() * 2200) % 2300) - 200; line(g, [[x, y], [x - 6, y + 46]], 3.4, '#aebdcc', .45); }
  if (f > .6) { const u = seg(t, 24.0, 24.45); drawFigure(g, FG.ghost, { x: 330 - 60 * u, y: 1500 - 240 * u, k: 1.75, alpha: .8 * (1 - ss(seg(t, 24.3, 24.45))), look: look('open', 'smile'), armL: { a: -.8 }, armR: { a: -.8 } }); }
  heartHalves(g, 520 - 40, 1150, 21.0, 30);
}
function s4b(g, t) {
  cam(g, 540, 960, 1); drawPlate(g, PL.ward);
  bedDraw(g, 720, 1600, 1.2, { look: look('wide', 'wavy', { lx: -.6, brows: 'worry' }) });
  bellDraw(g, 960, 960, t, t < 26.86 || t > 28.9);
  const dead = t > 26.86, sn = Math.sin(t * TAU), slump = ss(seg(t, 26.86, 27.2));
  drawFigure(g, FG.nurse, { x: 270, y: 1520, k: 1.6, lean: .12 * sn - slump * .18, sy: 1 - .02 * sn, tilt: .15, look: look('shut', dead ? 'flat' : 'o', { open: .6 }), armL: { a: .1 }, armR: { a: .1 } });
  if (!dead) for (let i = 0; i < 3; i++) { const u = ((t * .8) + i / 3) % 1; push(g, () => { g.translate(300 + u * 80, 1130 - u * 150); g.globalAlpha = 1 - u; g.font = `italic 600 ${50 + u * 30}px "Cormorant Garamond"`; g.fillStyle = '#efe6d2'; g.fillText('Z', 0, 0); }); }
  if (dead) {
    const rise = ss(seg(t, 26.86, 27.8)), pull = ss(seg(t, 28.0, 28.7)), snap = ss(seg(t, 28.8, 29.4)), gy = 1520 - rise * 250 - pull * 250 * (1 - snap), gx = 270 + snap * 0;
    if (pull > 0) { push(g, () => { g.lineCap = 'round'; g.lineWidth = 16; g.strokeStyle = css(hx('#dfe9f2'), .5 * (1 - snap * .5)); g.beginPath(); g.moveTo(270, 1400); g.quadraticCurveTo(270 + 60 * Math.sin(t * 6), (1400 + gy) / 2, gx, gy - 40); g.stroke(); }); }
    drawFigure(g, FG.ghost, { x: gx, y: gy, k: 1.6, alpha: .88, sy: 1 + pull * .25 * (1 - snap), look: look(pull > .1 && snap < 1 ? 'wide' : 'open', pull > .1 && snap < 1 ? 'o' : 'smile'), armL: { a: pull > 0 ? -2.6 : .1 }, armR: { a: pull > 0 ? -2.6 : .1 } });
  }
  heartHalves(g, -300, 0, 0, 0);
}
function s5(g, t) {
  const push_ = ss(seg(t, 35.3, 36.7)); cam(g, lerp(540, 600, push_), lerp(960, 1180, push_), lerp(1, 1.25, push_)); drawPlate(g, PL.ward);
  const calm = ss(seg(t, 35.35, 35.8)), shiver = t < 35.35 ? Math.sin(t * 90) * 4 : 0, hold = Math.floor(t * 12) % 2;
  const rake = ss(seg(t, 35.4, 35.9)) * (1 - ss(seg(t, 36.2, 36.7)));
  drawRake(g, PL.ward, rake * .8);
  push(g, () => { g.translate(shiver * (1 - calm), 0); bedDraw(g, 740, 1600, 1.3, { rake: rake * .8, look: calm > .5 ? look('shut', 'smile') : look('wide', hold ? 'o' : 'wavy', { brows: 'worry' }) }); });
  const arrive = ss(seg(t, 30.4, 32.6)), x = lerp(-120, 330, arrive), bend = ss(seg(t, 33.0, 33.5)), med = ss(seg(t, 33.9, 34.3)) * (1 - ss(seg(t, 35.0, 35.3))), tuck = ss(seg(t, 35.35, 35.8));
  const nurse = { x, y: 1560, k: 1.8, bob: Math.sin(t * TAU) * 8, alpha: .9, lean: bend * .1, look: look(med > .5 ? 'squint' : 'open', tuck > .3 ? 'smile' : 'smile', { lx: .6 }), armL: tuck > .01 ? { a: -1.2 - tuck * .3 + Math.sin(t * 9) * .08 * tuck, front: true } : { a: .1 }, armR: med > .01 ? { a: -2.6 * med, front: true } : { a: -.1 }, rake: rake * .6 };
  drawFigure(g, FG.ghost, nurse);
  if (med > .01) { const hx_ = x + 30 * 1.8 * Math.sin(2.6 * med) * -1 * -1, hy_ = 1560 - 188 * 1.8 + 112 * 1.8 * Math.cos(2.6 * med) * -1; drawPart(g, SP.bottle, x + 32 * 1.8 + (-Math.sin(2.6 * med)) * 118 * 1.8 * -1, 1560 - 188 * 1.8 + Math.cos(2.6 * med) * 118 * 1.8 * -1 + 6, 0, 1.3, 1.3, med, 0); void hx_; void hy_; }
  if (calm > .5 && t > 35.8) for (let i = 0; i < 3; i++) { const u = ((t - 35.8) * .9 + i / 3) % 1; push(g, () => { g.translate(560 + u * 70, 1250 - u * 160); g.globalAlpha = 1 - u; g.font = `italic 600 ${46 + u * 30}px "Cormorant Garamond"`; g.fillStyle = '#efe6d2'; g.fillText('Z', 0, 0); }); }
}
function s6(g, t) {
  cam(g, 540, 960, 1);
  reveal(g, t, 36.85, 38.7, 215, 570, 0, grey => {
    drawPlate(g, grey ? PL.lobbyG : PL.lobby);
    const talk = t < 40.6 ? (Math.floor(t * 8) % 2 ? 'grin' : 'smile') : 'o', gest = Math.sin(t * TAU), glance = ss(seg(t, 40.65, 41.0));
    figGrey(g, () => {
      drawFigure(g, FG.pj, { x: 300, y: 1560, k: 1.85, bob: Math.sin(t * TAU) * 3, look: look(t < 41.4 ? 'open' : 'wide', t < 40.6 ? talk : 'frown', { lx: .5, brows: t > 41.4 ? 'up' : null }), armL: { a: .1 }, armR: t < 39.9 ? { a: -1.0 + gest * .15, front: true } : { a: -.3 + gest * .2, front: true } });
      drawPart(g, SP.bouquet, 300 - 62 * 1.85 - 10, 1560 - 188 * 1.85 + 190, 0, 1.2, 1.2);
      drawFigure(g, FG.matron, { x: 700, y: 1500, k: 1.6, flip: true, look: look('open', glance > .5 ? 'flat' : 'smile', { lx: -.9 * glance + .7 * (1 - glance), brows: glance > .5 ? 'up' : null }), armL: { a: .1 }, armR: { a: glance > .5 ? -1.5 : -.2 } });
      drawFigure(g, FG.doc, { x: 920, y: 1500, k: 1.6, flip: true, look: look('open', glance > .5 ? 'flat' : 'smile', { lx: -.9 * glance + .7 * (1 - glance), brows: glance > .5 ? 'up' : null }), armL: { a: .1 }, armR: { a: -.2 } });
    });
  });
  for (const [t0, x, y] of [[41.0, 700, 1000], [41.4, 920, 1000], [42.0, 330, 1050]]) { const u = seg(t, t0, t0 + .35); if (u > 0) push(g, () => { g.translate(x, y - 14 * Math.sin(t * 5)); const k = spring(u) * 1.0; g.scale(k, k); TX.q.draw(g, 1, 1); }); }
}
function s7(g, t) {
  const pan = ss(seg(t, 43.0, 45.6)), pz = ss(seg(t, 46.8, 49.1));
  const cx = lerp(lerp(540, 700, pan), 705, pz), cy = lerp(lerp(960, 900, pan), 460, pz), z = lerp(lerp(1.0, 1.2, pan), 1.9, pz);
  cam(g, cx, cy, z); drawPlate(g, PL.lobby);
  const rake = ss(seg(t, 48.3, 48.7)) * (1 - ss(seg(t, 49.1, 50.0))); drawRake(g, PL.lobby, rake * .9);
  // the portrait of the nurse of old, with a black ribbon
  push(g, () => { g.translate(705, 460); g.scale(.62, .62); drawPart(g, FG.nurse.parts.head, 0, 0, 0, 1, 1, 1, rake); face(g, { eyes: 'open', mouth: 'smile', lash: true }, '#1a1d26', '#a05a5c'); });
  push(g, () => { g.fillStyle = css(hx('#14161a')); g.beginPath(); g.moveTo(630, 300); g.lineTo(704, 300); g.lineTo(630, 384); g.closePath(); g.fill(); });
  const walkT = seg(t, 43.0, 45.6), dbl = seg(t, 48.4, 49.0), stiff = t > 49.1 && t < 49.5, run = seg(t, 49.5, 50.3);
  const px = t < 45.6 ? lerp(330, 620, ss(walkT)) : t < 49.5 ? 620 : 620 + run * run * 900, wk = t < 45.6 ? t * 7 : t >= 49.5 ? t * 26 : null, sh = dbl > 0 && !stiff ? Math.sin(t * 80) * 5 : 0;
  drawFigure(g, FG.pj, { x: px + sh, y: 1540, k: 1.85, walk: wk, lean: t >= 49.5 ? .22 : 0, look: look(dbl > 0 || stiff ? 'wide' : 'open', dbl > .3 || stiff ? 'o' : 'smile', { open: 1.4, brows: dbl > 0 ? 'up' : null, lx: .3, ly: -.3 }), armL: { a: dbl > 0 ? -2.7 : .1 }, armR: { a: dbl > 0 ? -2.7 : .1 } });
}
function s8(g, t) {
  const z = lerp(1.0, 1.14, ss(seg(t, 50.3, 58.6))), cy = lerp(960, 1010, ss(seg(t, 50.3, 58.6)));
  const fade = 1 - ss(seg(t, 58.0, 58.9)), ridge = ss(seg(t, 58.0, 58.8)) * (1 - ss(seg(t, 58.8, 59.0)));     // the light goes out: only the ridges glow, then black
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#05080c'; g.fillRect(0, 0, W, H);
  cam(g, 560, cy, z);
  g.save(); g.globalAlpha = Math.max(fade, 0); drawPlate(g, PL.ward);
  bedDraw(g, 740, 1600, 1.3, { look: look('shut', 'smile') });
  const tuck = t > 53.3 && t < 54.3, wag = t > 54.4 && t < 55.5 ? Math.sin(t * 22) : 0, lk = ss(seg(t, 51.4, 51.9)) * (1 - ss(seg(t, 52.8, 53.2))) + ss(seg(t, 57.3, 57.7));
  drawFigure(g, FG.ghost, { x: 330, y: 1560, k: 1.8, bob: Math.sin(t * TAU) * 8, alpha: .92, lean: tuck ? .1 : 0, look: look(t > 57.3 ? 'happy' : 'open', 'smile', { lx: lk > .5 ? 0 : .7 }), armL: tuck ? { a: -1.3, front: true } : { a: .1 }, armR: t > 54.4 && t < 55.5 ? { a: -2.3 + wag * .1, front: true } : t > 56.3 && t < 57.2 ? { a: -1.4, front: true } : { a: -.1 } });
  g.restore();
  if (ridge > 0) { g.save(); g.globalAlpha = ridge * .55; g.globalCompositeOperation = 'screen'; g.drawImage(PL.ward.rv, -PL.ward.ox, -PL.ward.oy); g.restore(); }
  // the one coloured thing: a heart leaves her chest and floats over the sleeping patient
  if (t > 55.7) { const u = seg(t, 55.7, 58.2), hx_ = lerp(360, 620, ss(u)), hy_ = 1330 - 220 * eo(u) + Math.sin(u * 14) * 10, k = spring(Math.min(1, seg(t, 55.7, 56.1))) * (1 + .12 * Math.sin(t * 9)); push(g, () => { g.globalAlpha = Math.max(fade, ridge * .0 + (t < 58.6 ? 1 : 0)); drawPart(g, SP.heart, hx_, hy_, 0, .6 * k, .6 * k); }); }
}
function endCard(g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PL.end.cv, -PL.end.ox, -PL.end.oy);
  TX.e1.draw(g, seg(t, 59.3, 60.2)); TX.e2.draw(g, seg(t, 59.7, 60.5)); TX.e3.draw(g, seg(t, 60.3, 61.1)); TX.e4.draw(g, seg(t, 60.6, 61.4));
  if (t > 61.0) drawPart(g, SP.heart, 540, 1330, 0, .9 * (1 + .05 * Math.sin(t * 6)), .9 * (1 + .05 * Math.sin(t * 6)), seg(t, 61.0, 61.5));
}
const SCENES = [[0, 8.15, s1], [8.15, 15.2, s2], [15.2, 21.6, s3], [21.6, 24.45, s4a], [24.45, 29.75, s4b], [29.75, 36.7, s5], [36.7, 43.0, s6], [43.0, 50.3, s7], [50.3, 59.0, s8]];
let TMP;
function subtitles(g, t) {
  for (const [id, t0, d, txt] of VO) {
    const a = t0 - .1, b = t0 + Math.max(d + .6, 1.8); if (t < a || t >= b || t >= 59.0) continue;
    const al = Math.min(seg(t, a, a + .2), 1 - seg(t, b - .3, b));
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = 'italic 600 36px "Cormorant Garamond"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = txt.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > 880 && cur) { lines.push(cur); cur = w; } else cur = tt; }
    lines.push(cur); const h = lines.length * 46 + 36, y0 = 1735 - h / 2;
    g.globalAlpha = al * .82; g.fillStyle = '#0d141b'; g.beginPath(); g.roundRect(70, y0, W - 140, h, 10); g.fill(); g.globalAlpha = al; g.fillStyle = '#efe6d2'; lines.forEach((l, i) => g.fillText(l, 540, y0 + 18 + 23 + i * 46)); g.restore();
  }
}
function drawScene(g, idx, t) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const sc = SCENES[idx]; sc[2](g, t); if (idx === 2) s3b(g, t); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; }
window.render = t => {
  t = Math.min(t, window.DUR - 1e-4); const g = G;
  if (t >= 59.0) { g.setTransform(1, 0, 0, 1, 0, 0); endCard(g, t); return; }
  let idx = SCENES.findIndex(s => t >= s[0] && t < s[1]); if (idx < 0) idx = SCENES.length - 1;
  const sw = .5, tb = SCENES[idx][0];
  if (idx > 0 && t < tb + sw && ![3, 4].includes(idx) === true || (idx === 4 && t < tb + .05)) {
    // paint-over sweep: the next plate is laid over the last in a ragged diagonal pass
    const p = seg(t, tb, tb + sw);
    drawScene(g, idx - 1, t); const T2 = TMP.getContext('2d'); drawScene(T2, idx, t);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); const pos = lerp(-400, W + H + 400, ss(p)); g.moveTo(0, 0); const n = 48;
    for (let i = 0; i <= n; i++) { const y = i / n * H, x = pos - y * .9 + (Math.sin(i * 1.9) * 40 + Math.sin(i * 5.3) * 20); g.lineTo(x, y); }
    g.lineTo(0, H); g.closePath(); g.clip(); g.drawImage(TMP, 0, 0); g.restore();
  } else drawScene(g, idx, t);
  if (t < 3.8) { const a = 1 - ss(seg(t, 3.4, 3.8)); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); TX.t1.draw(g, seg(t, .3, 2.3), a); TX.t2.draw(g, seg(t, 1.9, 3.2), a); g.globalAlpha = a * seg(t, .1, .8); g.font = '600 30px "Cormorant Garamond"'; g.fillStyle = '#d9d2c0'; g.textAlign = 'center'; g.letterSpacing = '5px'; g.fillText('PLOT TWIST WITH A&R  ·  EPISODE 16', 540, 64); g.restore(); }
  if (t >= 21.7 && t < 29.75) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = 'italic 600 54px "Cormorant Garamond"'; g.fillStyle = '#efe6d2'; g.textAlign = 'center'; g.globalAlpha = Math.min(1, (t - 21.7) * 3) * (t < 24.45 ? 1 : seg(t, 24.45, 24.8)); g.fillText(t < 24.45 ? 'Version A' : 'Version B', 540, 130); g.restore(); }
  subtitles(g, t);
};
window.TEXTS = () => [];
(async () => {
  cv.width = W; cv.height = H; G = cv.getContext('2d');
  await document.fonts.ready; for (const f of ['700 120px "Cormorant Garamond"', 'italic 600 36px "Cormorant Garamond"', '600 30px "Cormorant Garamond"']) await document.fonts.load(f);
  TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H;
  const CG = '"Cormorant Garamond"';
  TX.t1 = knifeText('LA PLANCHADA', 540, 330, 136, '700 136px ' + CG, '#efe4cf', 1); TX.t2 = knifeText('THE NURSE WHO NEVER LEFT', 540, 450, 46, '600 46px ' + CG, '#e0b878', 2);
  TX.sign = knifeText('HOSPITAL', 540, 176, 64, '700 64px ' + CG, '#e8dcc0', 3); TX.q = knifeText('?', 0, 0, 150, '700 150px ' + CG, '#f0e8d0', 4);
  TX.e1 = knifeText('THE NURSE', 540, 700, 132, '700 132px ' + CG, '#efe4cf', 5); TX.e2 = knifeText('IS A LEGEND.', 540, 840, 132, '700 132px ' + CG, '#efe4cf', 6);
  TX.e3 = knifeText('HER STORY STILL', 540, 1030, 62, '600 62px ' + CG, '#e0b878', 7); TX.e4 = knifeText('HAUNTS MEXICO.', 540, 1110, 62, '600 62px ' + CG, '#e0b878', 8);
  for (const k of ['nurse', 'ghost', 'doc', 'woman', 'pj', 'matron']) FG[k] = buildFigure(SPECS[k]);
  SP.bed = buildBed(); SP.heart = buildHeart(0); SP.heartL = buildHeart(-1); SP.heartR = buildHeart(1); SP.bottle = buildBottle(); SP.bouquet = buildBouquet();
  PL.hall = plate(0, 0, paintHall); PL.ward = plate(0, 0, paintWard, true); PL.wall2 = plate(0, 0, paintWall2, true);
  PL.garden = plate(0, 0, paintGarden); setGrey(1); PL.gardenG = plate(0, 0, paintGarden); setGrey(0);
  PL.lobby = plate(0, 0, paintLobby, true); setGrey(1); PL.lobbyG = plate(0, 0, paintLobby); setGrey(0);
  PL.end = plate(0, 0, paintEnd);
  window.READY = true;
})();
