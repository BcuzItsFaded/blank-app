// La Planchada as Chinese-style shadow theatre: translucent dyed-hide puppets pressed to a lit cloth. Pure function of t.
import { piece, poly, blob, circ, ellp, rectp, all, diamonds, coins, crescents, slit, lattice, scrollRow, mulberry, clamp, lerp, TAU, SS } from './carve.js';
const cv = document.getElementById('c'), W = 1080, H = 1920;
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
const spring = (t, k = 8, z = 5) => 1 - Math.exp(-z * t) * Math.cos(k * t);
const noise = (x) => { const i = Math.floor(x), f = x - i, h = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }; const u = f * f * (3 - 2 * f); return lerp(h(i), h(i + 1), u); };
const DY = { vermil: '#d8452c', ochre: '#e3a23c', mala: '#3f9360', indigo: '#3b52a0', hide: '#f1dcae', hide2: '#d9b27a', ink: '#2a1710', jade: '#68b79c', rose: '#c9566a', pale: '#f6ead0', lilac: '#8b6fb0' };
let TC, TCx, LC, LCx, OUT, OUTx, CLOTH, BL, BLx, PUP = {}, SET = {}, FRAME;

// ---------------------------------------------------------------- puppets
const HEAD = poly([[-22, -10], [-28, -62], [-18, -114], [6, -132], [26, -120], [32, -102], [44, -92], [34, -86], [37, -76], [30, -72], [34, -64], [26, -56], [22, -36], [12, -20], [6, -8]]);
function buildPuppet(sp) {
  const P = {};
  P.head = piece(120, 170, 60, 150, { path: HEAD, dye: sp.skin || '#e8bf7c', dye2: sp.skin2 || '#bf8a4e', holes: [ellp(15, -100, 5.4, 3.2, -.1), poly([[22, -64], [32, -65], [30, -62], [22, -62]]), ...(sp.open === false ? [] : [poly([[2, -108], [26, -112], [26, -110], [2, -106]])])].slice(0, sp.open === false ? 1 : 3) });
  if (sp.hair) P.hair = piece(120, 170, 60, 150, { path: all(poly(sp.hairShape || [[-30, -56], [-26, -118], [0, -136], [14, -128], [-4, -112], [-12, -80], [-16, -56]]), circ(-30, -96, 17)), dye: DY.ink, holes: [], lw: 1.6 });
  if (sp.cap) P.cap = piece(120, 170, 60, 150, { path: poly(sp.cap), dye: sp.capDye || DY.pale, holes: sp.capHoles || [], lw: 2 });
  P.body = piece(220, 340, 110, 110, { path: poly(sp.body), dye: sp.dye, dye2: sp.dye2, holes: sp.holes || [], lw: 2.4 });
  P.arm = piece(60, 130, 30, 14, { path: all(poly([[-8, -4], [8, -4], [7, 60], [9, 90], [-9, 90], [-7, 60]]), circ(0, 100, 9)), dye: sp.sleeve || DY.jade, holes: coins(-6, 8, 8, 84, 16), lw: 2 });
  if (sp.legs) P.leg = piece(50, 140, 25, 6, { path: all(poly([[-6, 0], [7, 0], [6, 100], [-6, 100]]), poly([[-8, 100], [20, 104], [22, 114], [-9, 114]])), dye: DY.ink, holes: [], lw: 1.5 });
  return P;
}
function initPuppets() {
  const nurseBody = [[-20, -80], [22, -80], [24, -40], [18, 0], [54, 170], [-50, 170], [-14, 0], [-22, -40]];
  const ghostBody = [[-20, -80], [22, -80], [24, -40], [18, 0], [54, 150], [38, 196], [20, 158], [0, 212], [-20, 160], [-38, 198], [-50, 150], [-14, 0], [-22, -40]];
  const pleats = [-30, -14, 3, 20, 37].map(x => slit(x, 22, 150, 3.6));
  const cap = [[-26, -118], [-6, -150], [28, -142], [26, -120], [0, -122]], capHoles = [poly([[0, -142], [5, -142], [5, -134], [13, -134], [13, -129], [5, -129], [5, -121], [0, -121], [0, -129], [-8, -129], [-8, -134], [0, -134]])];
  PUP.nurse = buildPuppet({ hair: 1, cap, capHoles, dye: '#cf9a58', dye2: '#9a6a38', capDye: '#e8c07c', body: nurseBody, holes: [...pleats, ...crescents(-24, 120, 44, 164, 12), ...coins(-10, -70, 14, -42, 10)], sleeve: DY.jade, legs: true });
  PUP.ghost = buildPuppet({ hair: 1, cap, capHoles, skin: '#bfe3d0', skin2: '#7fbba3', capDye: '#d6efe2', dye: '#a2d9c3', dye2: '#5fa38b', body: ghostBody, holes: [...pleats, ...crescents(-22, 112, 40, 152, 12), ...coins(-10, -70, 14, -42, 10)], sleeve: '#3f8f78' });
  PUP.doc = buildPuppet({ hair: 1, hairShape: [[-26, -60], [-24, -112], [4, -134], [26, -122], [10, -118], [-8, -100], [-14, -60]], cap: [[-8, -140], [14, -142], [16, -128], [-6, -126]], capDye: '#e8e0c0', capHoles: [circ(4, -134, 4)], dye: DY.indigo, dye2: '#2a3a7a', body: [[-24, -80], [26, -80], [30, -20], [34, 168], [-30, 168], [-28, -20]], holes: [slit(2, -70, 160, 3), ...diamonds(-24, 20, 26, 110, 16)], sleeve: '#cfd6e8', legs: true, open: false });
  PUP.woman = buildPuppet({ hair: 1, cap: [[-26, -112], [-22, -146], [18, -150], [34, -118], [30, -108], [0, -116]], capDye: DY.vermil, capHoles: [], dye: DY.mala, dye2: '#2a6e44', body: [[-18, -80], [20, -80], [20, -40], [44, 150], [-42, 150], [-16, -40]], holes: [...diamonds(-30, 40, 34, 140, 14)], sleeve: DY.ochre, legs: true });
  PUP.pj = buildPuppet({ hair: 0, cap: [[-24, -112], [-14, -150], [20, -166], [40, -140], [34, -118], [0, -124]], capDye: '#a9c4de', capHoles: [], dye: '#6f95bd', dye2: '#46699a', body: [[-24, -80], [26, -80], [30, 20], [28, 160], [-28, 160], [-30, 20]], holes: [...lattice(-18, -60, 18, 120, 18)], sleeve: '#6f95bd', legs: true });
  PUP.matron = buildPuppet({ hair: 1, cap: [[-30, -112], [-22, -152], [26, -150], [34, -118], [0, -122]], capDye: DY.pale, dye: DY.lilac, dye2: '#5d4a88', body: [[-26, -80], [28, -80], [34, 0], [64, 168], [-60, 168], [-30, 0]], holes: [...crescents(-40, 100, 50, 160, 14), ...coins(-12, -70, 14, -30, 10)], sleeve: DY.lilac, legs: true });
}
// draw a puppet. o: x,y (waist), k, dir, rot, armF, armB (0 = hanging; positive = swing forward), head (tilt), alpha, blur, t, rods
function puppet(g, P, o) {
  const k = o.k || 1, t = o.t || 0, tr = (o.tremor ?? 1), sd = (o.seed || 0);
  const jr = tr * .02 * (noise(t * 2.2 + sd) - .5) * 2, jx = tr * 2.2 * (noise(t * 1.7 + sd + 9) - .5) * 2;
  g.save(); g.globalCompositeOperation = 'multiply'; if (o.alpha != null) g.globalAlpha = o.alpha; if (o.blur) g.filter = `blur(${o.blur}px)`;
  g.translate(o.x + jx, o.y); g.scale((o.dir || 1) * k * (o.sx || 1), k * (o.sy || 1)); g.rotate((o.rot || 0) + jr);
  const dp = (p, x, y, r = 0) => { g.save(); g.translate(x, y); g.rotate(r); g.scale(1 / p.s, 1 / p.s); g.drawImage(p.cv, -p.ox, -p.oy); g.restore(); };
  if (P.leg) { const w = o.walk ?? 0; dp(P.leg, -10, 160, Math.sin(w) * .35 * (o.walkOn ? 1 : 0)); dp(P.leg, 12, 160, -Math.sin(w) * .35 * (o.walkOn ? 1 : 0)); }
  dp(P.arm, 2, -66, -(o.armB ?? .1));
  dp(P.body, 0, 0, 0);
  g.save(); g.translate(2, -80); g.rotate(o.head || 0); const dh = (p) => { g.save(); g.scale(1 / p.s, 1 / p.s); g.drawImage(p.cv, -p.ox, -p.oy); g.restore(); };
  g.translate(0, 80 - 80); dp(P.head, 0, 0, 0); if (P.hair) dp(P.hair, 0, 0, 0); if (P.cap) dp(P.cap, 0, 0, 0); g.restore();
  dp(P.arm, 6, -64, -(o.armF ?? .1));
  g.restore();
  if (o.rods !== false) { g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = 'rgba(70,45,30,.4)'; g.lineWidth = 2; g.beginPath(); const nx = o.x + jx + (o.dir || 1) * 2 * k, ny = o.y - 80 * k; g.moveTo(nx, ny); g.lineTo(nx + 2, 1900); g.stroke(); g.restore(); }
}

// ---------------------------------------------------------------- set pieces
function initSet() {
  const R = mulberry(3);
  SET.door = piece(170, 360, 85, 340, { path: all(poly([[-70, 20], [70, 20], [70, -240], [0, -320], [-70, -240]])), dye: DY.vermil, dye2: '#a23220', holes: [...lattice(-46, -230, 46, -120, 20), poly([[-46, -80], [46, -80], [46, -10], [-46, -10]]).constructor === Function ? circ(0, -170, 0) : circ(0, -170, 0)], lw: 2.4 });
  SET.doorDark = piece(170, 360, 85, 340, { path: poly([[-70, 20], [70, 20], [70, -240], [0, -320], [-70, -240]]), dye: '#7a2a1a', dye2: '#3a140c', holes: [...lattice(-40, -230, 40, -150, 20)], lw: 2.4 });
  SET.lantern = piece(120, 260, 60, 20, { path: all(ellp(0, 70, 44, 54), rectp(-6, 0, 12, 24)), dye: DY.ochre, dye2: DY.vermil, holes: [...diamonds(-30, 40, 30, 100, 14), ellp(0, 70, 8, 30)], lw: 2 });
  SET.clock = piece(150, 150, 75, 75, { path: circ(0, 0, 66), dye: DY.hide, dye2: DY.hide2, holes: [...[...Array(12)].map((_, i) => circ(Math.cos(i / 12 * TAU) * 52, Math.sin(i / 12 * TAU) * 52, 4))], lw: 3 });
  SET.hand = piece(20, 90, 10, 80, { path: poly([[-3, 6], [3, 6], [1.5, -70], [-1.5, -70]]), dye: DY.ink, holes: [], lw: 1 });
  SET.ground = piece(1080, 80, 540, 10, { path: poly([[-540, 0], [540, 0], [540, 70], [-540, 70]]), dye: '#5a2f1a', dye2: '#2e160c', holes: [...crescents(-520, 12, 520, 62, 22)], lw: 2 });
  SET.bed = piece(560, 280, 280, 250, { path: all(poly([[-250, 0], [250, 0], [250, -130], [-250, -130]]), poly([[-256, -240], [-236, -240], [-236, 0], [-256, 0]]), poly([[236, -190], [256, -190], [256, 0], [236, 0]])), dye: DY.indigo, dye2: '#27387a', holes: [...diamonds(-180, -120, 230, -14, 18)], lw: 2.4 });
  SET.pillow = piece(130, 60, 65, 30, { path: blob([[-58, 8], [-40, -22], [40, -24], [60, 6], [0, 22]]), dye: DY.pale, dye2: DY.hide, holes: [], lw: 2 });
  SET.bottle = piece(60, 110, 30, 100, { path: blob([[-14, 0], [-18, -36], [-8, -58], [-6, -84], [6, -84], [8, -58], [18, -36], [14, 0]]), dye: DY.mala, dye2: '#2a6e44', holes: [circ(0, -26, 7)], lw: 2 });
  SET.iron = piece(220, 160, 110, 130, { path: all(poly([[-86, 0], [86, 0], [66, -60], [10, -96], [-84, -70]]), poly([[-30, -96], [-20, -124], [30, -126], [48, -96], [34, -96], [24, -110], [-8, -108], [-14, -96]])), dye: '#9a9aa8', dye2: '#5a5a6a', holes: [...coins(-70, -50, 40, -10, 16), circ(6, -40, 0)], lw: 2.4 });
  SET.heart = piece(110, 110, 55, 55, { path: g => { for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, x = 16 * Math.pow(Math.sin(a), 3) * 2.6, y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 2.6 + 4; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); }, dye: DY.vermil, dye2: '#9e2a20', holes: [slit(-12, -12, 14, 4), circ(10, -12, 4)], lw: 2.2 });
  SET.heartL = piece(110, 110, 55, 55, { path: g => { for (let i = 0; i <= 20; i++) { const a = Math.PI + i / 20 * Math.PI, x = 16 * Math.pow(Math.sin(a), 3) * 2.6, y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 2.6 + 4; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineTo(4, 30); g.lineTo(-4, 0); g.lineTo(4, -20); g.closePath(); }, dye: DY.vermil, dye2: '#9e2a20', holes: [], lw: 2.2 });
  SET.heartR = piece(110, 110, 55, 55, { path: g => { for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI, x = 16 * Math.pow(Math.sin(a), 3) * 2.6, y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 2.6 + 4; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineTo(-4, 30); g.lineTo(4, 0); g.lineTo(-4, -20); g.closePath(); }, dye: DY.vermil, dye2: '#9e2a20', holes: [], lw: 2.2 });
  SET.window = piece(330, 520, 165, 500, { path: poly([[-150, 0], [150, 0], [150, -380], [0, -480], [-150, -380]]), dye: DY.indigo, dye2: '#1f2d66', holes: [...lattice(-120, -330, 120, -30, 30), circ(0, -420, 26)], lw: 2.6 });
  SET.desk = piece(560, 300, 280, 280, { path: poly([[-270, 0], [270, 0], [270, -240], [-270, -240]]), dye: '#7a3a22', dye2: '#3e1c10', holes: [...diamonds(-230, -200, 230, -20, 22)], lw: 2.6 });
  SET.frame = piece(250, 320, 125, 300, { path: all(poly([[-110, 0], [110, 0], [110, -260], [-110, -260]])), dye: DY.ochre, dye2: '#a86a20', holes: [poly([[-82, -232], [82, -232], [82, -30], [-82, -30]])], lw: 3 });
  SET.photo = piece(170, 220, 85, 220, { path: poly([[-80, -10], [80, -10], [80, -210], [-80, -210]]), dye: DY.pale, dye2: DY.hide, holes: [], lw: 1.6 });
  SET.ribbon = piece(130, 130, 65, 65, { path: poly([[-60, -60], [30, -60], [-60, 30]]), dye: '#1a0f0a', holes: [], lw: 1.4 });
  SET.bell = piece(110, 120, 55, 100, { path: blob([[-44, 0], [-34, -50], [0, -84], [34, -50], [44, 0]]), dye: DY.ochre, dye2: '#a06a18', holes: [circ(0, -34, 8)], lw: 2.2 });
  SET.tree = piece(300, 520, 150, 500, { path: all(poly([[-16, 0], [16, 0], [10, -260], [-10, -260]]), blob([[-130, -250], [-110, -420], [0, -500], [110, -420], [130, -250], [0, -230]])), dye: DY.mala, dye2: '#215a3a', holes: [...coins(-100, -440, 100, -270, 26)], lw: 2.4 });
  SET.arch = piece(560, 560, 280, 540, { path: all(poly([[-250, 0], [-190, 0], [-190, -330], [190, -330], [190, 0], [250, 0], [250, -360], [0, -520], [-250, -360]])), dye: DY.ochre, dye2: DY.vermil, holes: [...scrollRow(-170, 170, -400, 36), ...diamonds(-230, -300, -200, -40, 14), ...diamonds(200, -300, 230, -40, 14)], lw: 2.6 });
  SET.sun = piece(220, 220, 110, 110, { path: circ(0, 0, 90), dye: DY.ochre, dye2: DY.vermil, holes: [...[...Array(12)].map((_, i) => slit(0, 0, 0, 0)), circ(0, 0, 0)].slice(0, 0).concat(coins(-60, -60, 60, 60, 24)), lw: 2.4 });
  SET.thread = null;
  SET.chair = piece(160, 200, 80, 190, { path: all(poly([[-60, 0], [60, 0], [60, -80], [-60, -80]]), poly([[-60, -170], [-44, -170], [-44, 0], [-60, 0]])), dye: '#8a4a28', dye2: '#4a2410', holes: [...lattice(-50, -150, -44, -90, 12)], lw: 2.2 });
  SET.rain = piece(1080, 600, 540, 0, { path: poly([[-540, 0], [540, 0], [540, 600], [-540, 600]]), dye: '#f6ead0', holes: [...[...Array(70)].map((_, i) => { const R = mulberry(i * 7 + 1); const x = -520 + R() * 1040, y = R() * 560; return slit(x, y, y + 38, 4); })], lw: 0, ink: 'rgba(0,0,0,0)' });
}
function glyph(str, size, w, h) { return piece(w, h, w / 2, h / 2, { path: poly([[-w / 2 + 6, -h / 2 + 6], [w / 2 - 6, -h / 2 + 6], [w / 2 - 6, h / 2 - 6], [-w / 2 + 6, h / 2 - 6]]), dye: '#2a1810', dye2: '#160b06', holes: [], lw: 3, ink: '#d9a850', cutText: { str, x: 0, y: 4, font: `700 ${size}px "Cormorant Garamond"` } }); }
function glyph2(lines, size, lh, w, h) { return piece(w, h, w / 2, h / 2, { path: poly([[-w / 2 + 6, -h / 2 + 6], [w / 2 - 6, -h / 2 + 6], [w / 2 - 6, h / 2 - 6], [-w / 2 + 6, h / 2 - 6]]), dye: '#2a1810', dye2: '#160b06', holes: [], lw: 3, ink: '#d9a850', cutText: { lines, x: 0, y: -(lines.length - 1) * lh / 2 + 4, lh, font: `700 ${size}px "Cormorant Garamond"` } }); }

// ---------------------------------------------------------------- the lit cloth
function cam(g, cx, cy, z) { g.setTransform(z, 0, 0, z, 540 - cx * z, 900 - cy * z); }
function dp(g, p, x, y, rot = 0, sx = 1, sy = 1, alpha = 1, blur = 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = alpha; if (blur) g.filter = `blur(${blur}px)`; g.translate(x, y); g.rotate(rot); g.scale(sx / p.s, sy / p.s); g.drawImage(p.cv, -p.ox, -p.oy); g.restore(); }
function lamps(list, t) {
  LCx.setTransform(1, 0, 0, 1, 0, 0); LCx.globalCompositeOperation = 'source-over'; LCx.fillStyle = '#2a170c'; LCx.fillRect(0, 0, W, H); LCx.globalCompositeOperation = 'lighter';
  const n = list.reduce((a, l) => a + l.p, 0), expo = 1 / Math.sqrt(Math.max(.6, n));
  list.forEach((l, i) => { if (l.p <= 0) return; const fl = 1 + .05 * (noise(t * 7 + i * 3.1) - .5) * 2 + .02 * Math.sin(t * 19 + i); const a = l.p * fl * expo;
    for (const [r, c, al] of [[l.r * 1.9, '255,150,70', .62], [l.r * .55, '255,222,150', .55]]) { const gr = LCx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r); gr.addColorStop(0, `rgba(${c},${al * a})`); gr.addColorStop(1, `rgba(${c},0)`); LCx.fillStyle = gr; LCx.fillRect(l.x - r, l.y - r, r * 2, r * 2); } });
  LCx.globalCompositeOperation = 'source-over';
}
const L3 = (p = [1, 1, 1]) => [{ x: 300, y: 700, r: 640, p: p[0] }, { x: 780, y: 1100, r: 640, p: p[1] }, { x: 540, y: 1500, r: 560, p: p[2] }];
function flare(t, t0, base = 1) { const u = t - t0; return u < 0 ? 0 : base * (1 + .5 * Math.exp(-u * 3.2) * Math.cos(u * 14)) * Math.min(1, u * 6); }

// ---------------------------------------------------------------- scenes: each draws onto the transmission canvas (white = light) and returns lamps
const GY = 1480;
function ground(g) { dp(g, SET.ground, 540, GY - 10); }
function hall(g, t) {
  for (const x of [120, 280]) dp(g, SET.doorDark, x, 1470, 0, 1, 1);
  for (const x of [800, 960]) dp(g, SET.doorDark, x, 1470, 0, 1, 1);
  dp(g, SET.door, 540, 1470, 0, .5, .5);
  for (const [x, ph] of [[220, 0], [540, 1.7], [860, 3.1]]) dp(g, SET.lantern, x, 190, Math.sin(t * 1.6 + ph) * .05, 1, 1);
  ground(g);
}
function s1(g, t) {
  cam(g, 540, 900, 1); hall(g, t);
  // clock spins to midnight
  const sp = t < 3.4 ? t * 10 : 0; dp(g, SET.clock, 540, 360, 0, 1, 1); dp(g, SET.hand, 540, 360, sp / 12, 1, .55); dp(g, SET.hand, 540, 360, sp, 1, .9);
  // a patient peeks round a door, then it slams
  const op = ss(seg(t, 5.4, 5.7)) * (1 - ss(seg(t, 6.3, 6.45))); if (op > .01) puppet(g, PUP.pj, { x: 300 - 30 * (1 - op) , y: 1320, k: .8, dir: 1, head: .1, alpha: op, t, rods: false, armF: .5, armB: .5 });
  dp(g, SET.doorDark, 280, 1470, -.02 * Math.sin(t * 60) * (t > 6.3 && t < 6.7 ? 1 : 0), 1, 1);
  if (t > 3.6) { const u = ss(seg(t, 3.6, 7.5)), x = lerp(1020, 520, u); puppet(g, PUP.ghost, { x, y: 1270 + Math.sin(t * 3) * 5, k: 1.05, dir: -1, t, armF: .15 + .1 * Math.sin(t * 3), armB: .1, head: t > 7.3 ? -.12 : 0, alpha: ss(seg(t, 3.6, 4.4)) }); }
  return L3([1.0, .5, .7]);
}
function s2(g, t) {
  cam(g, 540, 900, lerp(1.0, 1.25, ss(seg(t, 8.15, 15.2)))); ground(g);
  const sw = Math.sin(t * 2.0) * .02, curt = ss(seg(t, 9.3, 9.7)) * (1 - ss(seg(t, 9.9, 10.3)));
  puppet(g, PUP.ghost, { x: 560, y: 1290 + Math.sin(t * 3) * 6, k: 1.5, dir: -1, rot: sw - curt * .08, t, armF: .1 - curt * .4, armB: .12, head: -.04 + curt * .18 });
  // the flat-iron presses down the skirt on a rod
  if (t > 12.1) { const press = seg(t, 12.9, 14.4), y = press > 0 ? lerp(1180, 1470, ss(press)) : lerp(900, 1180, ss(seg(t, 12.1, 12.7))); const x = lerp(900, 640, ss(seg(t, 12.1, 12.8))) - (press > 0 ? 60 * Math.sin(press * Math.PI * 2) : 0); dp(g, SET.iron, x, y, -.08 * Math.sin(t * 5), 1, 1); g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = 'rgba(70,45,30,.45)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 10, y - 120); g.lineTo(x + 40, 1900); g.stroke(); g.restore();
    for (let i = 0; i < 4; i++) { const u = ((t * 3 + i / 4) % 1); g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .35 * (1 - u); g.fillStyle = '#e8d2a0'; g.beginPath(); g.ellipse(x - 30 + Math.sin(u * 6 + i) * 20, y - 150 - u * 160, 18 + u * 20, 12 + u * 14, 0, 0, TAU); g.fill(); g.restore(); } }
  return L3([1, 1, flare(t, 12.0, 1.1)]);
}
function s3(g, t) {
  cam(g, 540, 900, lerp(1.0, 1.08, ss(seg(t, 15.2, 21.6))));
  dp(g, SET.arch, 540, 1480, 0, 1.3, 1.3); dp(g, SET.sun, 540, 700, 0, 1.4, 1.4); dp(g, SET.tree, 150, 1480, 0, 1, 1); dp(g, SET.tree, 930, 1480, 0, 1.1, 1.1); ground(g);
  const bet = t > 20.9, away = ss(seg(t, 21.0, 21.6)), docX = lerp(800, 1040, away);
  puppet(g, PUP.nurse, { x: 330, y: 1300 + Math.sin(t * 3) * 3, k: 1.2, dir: 1, t, armF: bet ? .1 : -.5 * ss(seg(t, 17.5, 17.9)), armB: .1, head: bet ? .2 : -.04, walkOn: false });
  puppet(g, PUP.doc, { x: docX, y: 1300, k: 1.25, dir: bet ? 1 : -1, t, walkOn: away > 0 && away < 1, walk: t * 8, seed: 3, armF: .1, head: 0 });
  if (t > 20.3) puppet(g, PUP.woman, { x: lerp(1250, 1090, ss(seg(t, 20.4, 21.0))) + away * 170, y: 1316, k: 1.15, dir: -1, t, seed: 5, armF: -.3, head: 0 });
  if (t > 19.6) for (let k = 0; k < 6; k++) { const t0 = 19.66 + k * .24, u = t - t0; if (u < 0 || u > 1.6) continue; const x = 330 + Math.sin(u * 4 + k) * 40 + (k - 2.5) * 22, y = 1000 - u * 190; dp(g, SET.heart, x, y, 0, .5 + .2 * (k % 3), .5 + .2 * (k % 3), 1 - seg(u, 1.1, 1.6)); g.save(); g.strokeStyle = 'rgba(70,45,30,.4)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y + 20); g.lineTo(x + 4, 1900); g.stroke(); g.restore(); }
  if (t > 21.0) { const u = seg(t, 21.0, 21.7), w = Math.max(0, (u - .35) / .65); if (u < .35) dp(g, SET.heart, 330, 1000, 0, 1.2, 1.2); else { dp(g, SET.heartL, 330 - w * 90, 1000 + w * w * 360, -w * 1.2, 1.2, 1.2); dp(g, SET.heartR, 330 + w * 90, 1000 + w * w * 360, w * 1.2, 1.2, 1.2); } }
  return [{ x: 270, y: 640, r: 760, p: 1.1 }, { x: 800, y: 900, r: 760, p: 1.1 }, { x: 540, y: 1400, r: 640, p: 1 }, { x: 540, y: 300, r: 600, p: 1 }];
}
function s4a(g, t) {
  cam(g, 540, 900, 1); dp(g, SET.arch, 540, 1480, 0, 1.3, 1.3); dp(g, SET.tree, 150, 1480, 0, 1, 1); dp(g, SET.tree, 930, 1480, 0, 1.1, 1.1); ground(g);
  const f = eo(seg(t, 23.68, 24.2));
  puppet(g, PUP.nurse, { x: 540 - 40 * f, y: 1300 + 140 * f, k: 1.2, dir: 1, t, rot: -1.4 * f, head: f > .1 ? .35 : 0, armF: .1, armB: .1 });
  for (const sc of [0, 1]) dp(g, SET.rain, 540, ((t * 700 + sc * 600) % 1200) - 600 + 130, 0, 1, 1, .7);
  if (f > .5) { const u = seg(t, 24.0, 24.45); puppet(g, PUP.ghost, { x: 440, y: 1200 - 250 * u, k: 1.2 + u * .9, dir: 1, t, alpha: .85 * (1 - u * .9), blur: u * 14, armF: -.9, armB: -.9, rods: false }); }
  return L3([.55, .5, .45]);
}
function ward(g, t) { dp(g, SET.window, 780, 700, 0, 1, 1); dp(g, SET.lantern, 200, 190, Math.sin(t * 1.5) * .05); ground(g); }
function bedDraw(g, x, y, t, o = {}) { dp(g, SET.bed, x, y, 0, 1, 1); puppet(g, PUP.pj, { x: x - 150 + (o.sh || 0), y: y - 60, k: .55, dir: 1, rot: 1.45, t, head: .1, seed: 11, tremor: o.tremor ?? 1.4, rods: false, sx: 1, sy: 1 }); dp(g, SET.pillow, x - 190, y - 140, 0, 1, 1); }
function s4b(g, t) {
  cam(g, 540, 900, 1); ward(g, t); bedDraw(g, 760, 1470, t, { tremor: 2 });
  const sh = t < 26.86 || t > 28.9 ? Math.sin(t * 80) * 3 : 0; dp(g, SET.bell, 960 + sh, 1060, 0, .8, .8);
  dp(g, SET.chair, 260, 1470, 0, 1.3, 1.3);
  const dead = t > 26.86;
  puppet(g, PUP.nurse, { x: 260, y: 1290, k: 1.1, dir: 1, t, rot: .12 * Math.sin(t * 6) * (dead ? 0 : 1) + (dead ? .2 : 0), head: .55, armF: .1, armB: .1 });
  if (dead) {
    const lift = ss(seg(t, 26.86, 27.8)), pull = ss(seg(t, 28.0, 28.7)), snap = spring(seg(t, 28.8, 29.5), 18, 6), up = lift + pull * 1.0 * (1 - seg(t, 28.8, 29.0));
    const y = lerp(1250, 460, Math.min(1, lift * .6 + pull * .6) * (t < 28.8 ? 1 : 1 - clamp(snap))), sc = 1.1 + (t < 28.8 ? pull * .5 : 0);
    g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = 'rgba(60,35,20,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(260, 1250); g.quadraticCurveTo(260 + 40 * Math.sin(t * 7), (1250 + y) / 2, 260, y + 120); g.stroke(); g.restore();
    puppet(g, PUP.ghost, { x: 260, y, k: sc, dir: 1, t, alpha: .85, armF: -1.3 * pull, armB: -1.3 * pull, rods: false, blur: t < 28.8 ? lift * (1 - pull) * 5 : 0 });
  }
  return [{ x: 300, y: 800, r: 600, p: .6 }, { x: 780, y: 1200, r: 560, p: .5 }];
}
function s5(g, t) {
  const pz = ss(seg(t, 35.3, 36.7)); cam(g, lerp(540, 640, pz), lerp(900, 1180, pz), lerp(1, 1.25, pz)); ward(g, t);
  const calm = ss(seg(t, 35.35, 35.8)); bedDraw(g, 760, 1470, t, { tremor: lerp(2.8, .3, calm), sh: t < 35.35 ? Math.sin(t * 90) * 3 : 0 });
  const arrive = ss(seg(t, 30.4, 32.6)), x = lerp(-120, 390, arrive), med = ss(seg(t, 33.9, 34.3)) * (1 - ss(seg(t, 35.0, 35.3))), tuck = ss(seg(t, 35.35, 35.8));
  puppet(g, PUP.ghost, { x, y: 1290 + Math.sin(t * 3) * 6, k: 1.2, dir: 1, t, alpha: .9, head: ss(seg(t, 33.0, 33.5)) * .22, armF: med > .01 ? -2.3 * med : (tuck > .01 ? -1.2 - tuck * .3 + Math.sin(t * 9) * .08 * tuck : .1), armB: .1 });
  if (med > .01) dp(g, SET.bottle, x + 70 + 20 * med, 1290 - 150 - 90 * med, 0, 1, 1, med);
  const lampsL = [{ x: 300, y: 800, r: 600, p: .5 }, { x: 780, y: 1200, r: 560, p: .45 + flare(t, 35.4, .9) }]; return lampsL;
}
function lobby(g, t) { dp(g, SET.window, 190, 800, 0, 1, 1); dp(g, SET.desk, 760, 1470, 0, 1, 1); for (const [x, y] of [[660, 560], [800, 530], [920, 560]]) { dp(g, SET.photo, x, y + 120, 0, .8, .8); } ground(g); }
function s6(g, t) {
  cam(g, 540, 900, 1); lobby(g, t);
  const talk = t < 40.6 ? Math.sin(t * 9) * .04 : 0, glance = ss(seg(t, 40.65, 41.0));
  puppet(g, PUP.pj, { x: 300, y: 1300, k: 1.25, dir: 1, t, rot: talk, head: .05, armF: t < 39.9 ? -1.0 + Math.sin(t * 6) * .18 : -.3 + Math.sin(t * 6) * .2, armB: .15, seed: 4 });
  dp(g, SET.heart, 0, 0, 0, 0, 0, 0);
  puppet(g, PUP.matron, { x: 680, y: 1296, k: 1.15, dir: -1, t, head: .12 * glance, armF: glance > .5 ? -1.4 : .1, armB: .1, seed: 6 });
  puppet(g, PUP.doc, { x: 900, y: 1300, k: 1.2, dir: -1, t, head: -.1 * glance, armF: .1, armB: .1, seed: 8 });
  for (const [t0, x, y] of [[41.0, 700, 880], [41.4, 900, 880], [42.0, 330, 940]]) { const u = seg(t, t0, t0 + .5); if (u > 0) dp(g, SET.q, x, y, .08 * Math.sin(t * 5), spring(u) * 1.1, spring(u) * 1.1, 1, (1 - u) * 14); }
  return [{ x: 200, y: 700, r: 760, p: 1.2 }, { x: 800, y: 800, r: 760, p: 1.2 }, { x: 540, y: 1300, r: 700, p: 1.1 }, { x: 540, y: 300, r: 700, p: 1 }];
}
function s7(g, t) {
  const pan = ss(seg(t, 43.0, 45.6)), pz = ss(seg(t, 46.8, 49.1)); cam(g, lerp(lerp(540, 640, pan), 750, pz), lerp(900, 640, pz), lerp(lerp(1, 1.15, pan), 1.7, pz)); lobby(g, t);
  const press = ss(seg(t, 46.9, 47.5)); dp(g, SET.frame, 750, 740, 0, 1.2, 1.2); puppet(g, PUP.nurse, { x: 750, y: 760 + 30, k: .5 + .0, dir: 1, t, tremor: .3, rods: false, armF: .1, armB: .1, sy: 1 }); dp(g, SET.ribbon, 690, 560, 0, 1, 1);
  const dbl = seg(t, 48.4, 49.0), stiff = t > 49.1 && t < 49.5, run = seg(t, 49.5, 50.3), walkT = seg(t, 43.0, 45.6);
  const px = t < 45.6 ? lerp(330, 600, ss(walkT)) : t < 49.5 ? 600 : 600 + run * run * 900, sh = dbl > 0 && !stiff ? Math.sin(t * 80) * 5 : 0;
  puppet(g, PUP.pj, { x: px + sh, y: 1300, k: 1.25, dir: 1, t, walkOn: t < 45.6 || t >= 49.5, walk: t * (t >= 49.5 ? 26 : 7), rot: t >= 49.5 ? .2 : (dbl > 0 ? -.12 : 0), armF: dbl > 0 ? -2.7 : .1, armB: dbl > 0 ? -2.7 : .1, head: dbl > 0 ? -.2 : 0, tremor: stiff ? .1 : 1, seed: 4 });
  return [{ x: 200, y: 700, r: 760, p: 1.0 }, { x: 800, y: 800, r: 760, p: 1.0 }, { x: 540, y: 1300, r: 700, p: .9 }];
}
function s8(g, t) {
  cam(g, 540, 900, 1); ward(g, t); bedDraw(g, 760, 1470, t, { tremor: .2 });
  const tuck = t > 53.3 && t < 54.3, wag = t > 54.4 && t < 55.5 ? Math.sin(t * 22) : 0;
  puppet(g, PUP.ghost, { x: 400, y: 1290 + Math.sin(t * 3) * 6, k: 1.2, dir: 1, t, alpha: .92, head: tuck ? .2 : 0, armF: t > 54.4 && t < 55.5 ? -1.6 + wag * .1 : (t > 56.3 && t < 57.2 ? -1.1 : (tuck ? -1.2 : .1)), armB: .1 });
  if (t > 55.7) { const u = seg(t, 55.7, 58.2), hx = lerp(430, 700, ss(u)), hy = 1050 - 240 * eo(u) + Math.sin(u * 14) * 10, k = spring(Math.min(1, seg(t, 55.7, 56.1))) * (1 + .1 * Math.sin(t * 9)); dp(g, SET.heart, hx, hy, 0, .8 * k, .8 * k); g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = 'rgba(70,45,30,.4)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(hx, hy + 30); g.lineTo(hx + 6, 1900); g.stroke(); g.restore(); }
  // the lamp is carried away: the cloth darkens from one side
  const away = ss(seg(t, 57.4, 59.0)); return [{ x: lerp(300, -500, away), y: 800, r: 640, p: .7 * (1 - away) + .05 }, { x: lerp(780, 1700, away), y: 1200, r: 560, p: .6 * (1 - away) + .05 }, { x: lerp(540, 540, away), y: 1500, r: 520, p: .5 * (1 - away) }];
}
function endCard(g, t) {
  cam(g, 540, 900, 1); const u = ss(seg(t, 59.3, 60.1)), blur = (1 - u) * 18, sc = lerp(1.5, 1, u);
  dp(g, SET.endA, 540, 700, 0, sc, sc, u, blur); dp(g, SET.endB, 540, 1060, 0, sc, sc, ss(seg(t, 60.1, 60.9)), (1 - ss(seg(t, 60.1, 60.9))) * 14);
  if (t > 61.1) dp(g, SET.heart, 540, 1400, 0, .9 * (1 + .06 * Math.sin(t * 6)), .9 * (1 + .06 * Math.sin(t * 6)), seg(t, 61.1, 61.6));
  return [{ x: 540, y: 900, r: 760, p: .5 + .5 * ss(seg(t, 59.0, 59.6)) * (1 - ss(seg(t, 62.0, 62.4))) }];
}
function titles(g, t) {
  const a = ss(seg(t, .3, .9)) * (1 - ss(seg(t, 3.4, 4.2))), lift = ss(seg(t, 3.4, 4.2)); if (a <= 0) return;
  cam(g, 540, 900, 1); const sc = lerp(1.6, 1, ss(seg(t, .3, .9))) * (1 + .5 * lift), bl = (1 - ss(seg(t, .3, .9))) * 16 + lift * 18;
  dp(g, SET.title, 540, 560, 0, sc, sc, a, bl); dp(g, SET.title2, 540, 760, 0, sc, sc, a, bl);
}
const SCENES = [[0, 8.15, s1], [8.15, 15.2, s2], [15.2, 21.6, s3], [21.6, 24.45, s4a], [24.45, 29.75, s4b], [29.75, 36.7, s5], [36.7, 43.0, s6], [43.0, 50.3, s7], [50.3, 59.0, s8]];

// ---------------------------------------------------------------- frame, audience, placard, post
function bakeFrame() {
  FRAME = document.createElement('canvas'); FRAME.width = W; FRAME.height = H; const g = FRAME.getContext('2d'), R = mulberry(5);
  const lac = (x, y, w, h, vert) => { const gr = vert ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3a1209'); gr.addColorStop(.5, '#5e1c10'); gr.addColorStop(1, '#2a0d07'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  lac(0, 0, 66, H, 1); lac(W - 66, 0, 66, H, 1); lac(0, 0, W, 150, 0); lac(0, 1700, W, 220, 0);
  g.strokeStyle = '#d4a14a'; g.lineWidth = 3; g.strokeRect(70, 154, W - 140, 1544); g.lineWidth = 1.5; g.strokeRect(76, 160, W - 152, 1532);
  g.fillStyle = '#d4a14a'; for (let x = 100; x < W - 80; x += 46) { g.beginPath(); g.arc(x, 74, 7, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 14, 118); g.lineTo(x, 100); g.lineTo(x + 14, 118); g.stroke(); }
  g.fillStyle = 'rgba(212,161,74,.5)'; for (let y = 200; y < 1680; y += 64) { g.fillRect(28, y, 10, 30); g.fillRect(W - 38, y, 10, 30); }
}
function placard(g, t) {
  for (const [id, t0, d, txt] of VO) {
    const a = t0 - .1, b = t0 + Math.max(d + .6, 1.8); if (t < a || t >= b || t >= 59.0) continue;
    const al = Math.min(seg(t, a, a + .25), 1 - seg(t, b - .3, b)), sl = (1 - eo(seg(t, a, a + .4))) * 40;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = '600 35px "Cormorant Garamond"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = txt.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > 800 && cur) { lines.push(cur); cur = w; } else cur = tt; }
    lines.push(cur); const h = lines.length * 44 + 40, y0 = 1800 - h / 2 + sl;
    g.globalAlpha = al; g.fillStyle = '#1a0a05'; g.beginPath(); g.roundRect(100, y0, W - 200, h, 6); g.fill(); g.strokeStyle = '#d4a14a'; g.lineWidth = 1.6; g.beginPath(); g.roundRect(108, y0 + 8, W - 216, h - 16, 4); g.stroke();
    g.fillStyle = '#f3e4c4'; lines.forEach((l, i) => g.fillText(l, 540, y0 + 20 + 22 + i * 44)); g.fillStyle = '#c0392b'; g.fillRect(W - 168, y0 + 14, 22, 22); g.restore();
  }
}
function render(t) {
  t = Math.min(t, window.DUR - 1e-4);
  let idx = SCENES.findIndex(s => t >= s[0] && t < s[1]); const end = t >= 59.0; if (idx < 0) idx = SCENES.length - 1;
  TCx.setTransform(1, 0, 0, 1, 0, 0); TCx.globalCompositeOperation = 'source-over'; TCx.globalAlpha = 1; TCx.filter = 'none'; TCx.fillStyle = '#fff'; TCx.fillRect(0, 0, W, H);
  let lampList = end ? endCard(TCx, t) : SCENES[idx][2](TCx, t);
  if (t < 4.3) titles(TCx, t);
  // a brief lamp dip at each change of scene
  const tb = SCENES[idx][0], dip = 1 - .7 * Math.exp(-Math.pow((t - tb) / .16, 2)) * (idx > 0 && !end ? 1 : 0);
  lampList = lampList.map(l => ({ ...l, p: l.p * dip }));
  lamps(lampList, t);
  OUTx.setTransform(1, 0, 0, 1, 0, 0); OUTx.globalCompositeOperation = 'source-over'; OUTx.drawImage(LC, 0, 0);
  OUTx.globalCompositeOperation = 'multiply'; OUTx.drawImage(TC, 0, 0); OUTx.drawImage(CLOTH, 0, 0);
  // warm bloom
  BLx.setTransform(1, 0, 0, 1, 0, 0); BLx.clearRect(0, 0, BL.width, BL.height); BLx.filter = 'blur(10px)'; BLx.drawImage(OUT, 0, 0, BL.width, BL.height); BLx.filter = 'none';
  OUTx.globalCompositeOperation = 'screen'; OUTx.globalAlpha = .38; OUTx.drawImage(BL, 0, 0, W, H); OUTx.globalAlpha = 1;
  OUTx.globalCompositeOperation = 'multiply'; const vg = OUTx.createRadialGradient(540, 900, 420, 540, 900, 1200); vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, 'rgba(110,70,40,1)'); OUTx.fillStyle = vg; OUTx.fillRect(0, 0, W, H);
  OUTx.globalCompositeOperation = 'source-over';
  // compose: stage frame around the cloth; the audience's view at the start
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0c0603'; g.fillRect(0, 0, W, H);
  const push = t < 3.6 ? ss(seg(t, 2.6, 3.6)) : 1, z = lerp(.8, 1, push);
  g.save(); g.translate(540, 900); g.scale(z, z); g.translate(-540, -900);
  g.drawImage(OUT, 0, 0); g.drawImage(FRAME, 0, 0); g.globalCompositeOperation = 'source-over';
  // the cloth is only inside the frame: re-draw the dark frame over the lit overflow
  g.restore();
  if (push < 1) { g.save(); g.fillStyle = `rgba(8,4,2,${1 - push})`; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(120 + i * 140 + (i % 2) * 20, 1880, 70, 96, 0, 0, 7); g.fill(); } g.restore(); }
  g.save(); g.globalAlpha = 1; placard(g, t); g.restore();
}
window.render = render; window.TEXTS = () => [];
(async () => {
  cv.width = W; cv.height = H; await document.fonts.ready; for (const f of ['700 80px "Cormorant Garamond"', '600 35px "Cormorant Garamond"']) await document.fonts.load(f);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  TC = mk(W, H); TCx = TC.getContext('2d'); LC = mk(W, H); LCx = LC.getContext('2d'); OUT = mk(W, H); OUTx = OUT.getContext('2d'); BL = mk(W / 4, H / 4); BLx = BL.getContext('2d');
  CLOTH = mk(W, H); { const g = CLOTH.getContext('2d'), tile = mk(8, 8), tg = tile.getContext('2d'); tg.fillStyle = '#fff'; tg.fillRect(0, 0, 8, 8); tg.fillStyle = 'rgba(150,110,70,.28)'; tg.fillRect(0, 0, 8, 1.4); tg.fillRect(0, 0, 1.4, 8); g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, W, H); const R = mulberry(2); for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * H, r = 60 + R() * 200, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(200,160,110,${.05 + R() * .08})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.globalCompositeOperation = 'multiply'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }
  initPuppets(); initSet(); SET.q = glyph('?', 120, 120, 150);
  SET.title = glyph('LA PLANCHADA', 100, 900, 190); SET.title2 = glyph('THE NURSE WHO NEVER LEFT', 52, 860, 110);
  SET.endA = glyph2(['THE NURSE', 'IS A LEGEND.'], 110, 118, 900, 330); SET.endB = glyph2(['HER STORY STILL', 'HAUNTS MEXICO.'], 58, 66, 800, 190);
  bakeFrame(); window.READY = true;
})();
