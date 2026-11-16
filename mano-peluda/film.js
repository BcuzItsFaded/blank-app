// La Mano Peluda: a paper-cut lightbox film, 1080x1920. Dark bedroom, warm candlelight, the hairy hand in ink. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70, TAU = Math.PI * 2;
window.DUR = 60.6;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const vnoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let RNG = mulberry(5); const rnd = (a = 0, b = 1) => a + (b - a) * RNG();
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (h, a) => { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a).toFixed(3)})`; };

// ---------- narration (id, start, duration, text); mix.py reads these rows ----------
const VO = [
  ['v01', 0.35, 6.852, 'Have you ever felt something brush your ankle in the dark, just before sleep? In Mexico, it has a name: La Mano Peluda.'],
  ['v02', 7.64, 7.979, 'La Mano Peluda — the hairy hand. A single severed hand that crawls from the shadows beneath your bed, reaching for anyone who sleeps.'],
  ['v03', 16.06, 8.075, 'One legend says it belongs to a man buried with a fortune in gold, clawing up from his grave to drag the living down to his treasure.'],
  ['v04', 24.58, 6.866, 'Another says it was severed in the Inquisition — a man punished for witchcraft, his hand returning each night for revenge.'],
  ['v05', 31.88, 6.933, "It comes when the house falls silent. It creeps across the floor, climbs the bedframe, and closes around a sleeper's ankle."],
  ['v06', 39.26, 5.695, 'For generations, grandmothers warned the children: never let a hand or foot hang over the edge of the bed.'],
  ['v07', 45.39, 6.729, 'But no one agrees where it came from. Some say the grip in the dark, the weight on your chest, is only sleep paralysis.'],
  ['v08', 52.56, 7.307, 'Still, one rule survives every version: when the lights go out, keep your feet beneath the blanket. Just in case.'],
];

// ---------- layer baking: a flat colour silhouette with fibre grain, warm top rim, dark bottom band, backlight translucency ----------
let GRAIN;
function bake(drawFn, color, o = {}) {
  const w = W + 2 * OFF, h = H + 2 * OFF, cvv = mkc(w, h), c = cvv.getContext('2d');
  c.translate(OFF, OFF); c.fillStyle = '#000'; c.strokeStyle = '#000'; drawFn(c); c.setTransform(1, 0, 0, 1, 0, 0);
  if (!o.raw) { c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, w, h); }
  c.globalCompositeOperation = 'source-atop';
  if (o.glow) for (const g of [].concat(o.glow)) { const gr = c.createRadialGradient(g.x + OFF, g.y + OFF, 0, g.x + OFF, g.y + OFF, g.r); gr.addColorStop(0, rgba(g.col, g.a)); gr.addColorStop(1, rgba(g.col, 0)); c.fillStyle = gr; c.fillRect(0, 0, w, h); }
  c.globalAlpha = .55; c.fillStyle = GRAIN; c.fillRect(0, 0, w, h); c.globalAlpha = 1;
  if (!o.raw) {
    const rim = mkc(w, h), r = rim.getContext('2d'); r.drawImage(cvv, 0, 0); r.globalCompositeOperation = 'destination-out'; r.drawImage(cvv, 0, 3); r.globalCompositeOperation = 'source-in'; r.fillStyle = rgba(o.rim || '#ffd49a', o.rimA ?? .55); r.fillRect(0, 0, w, h);
    const sh = mkc(w, h), s = sh.getContext('2d'); s.drawImage(cvv, 0, 0); s.globalCompositeOperation = 'destination-out'; s.drawImage(cvv, 0, -4); s.globalCompositeOperation = 'source-in'; s.fillStyle = 'rgba(0,0,0,.55)'; s.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over'; c.drawImage(rim, 0, 0); c.drawImage(sh, 0, 0);
  }
  c.globalCompositeOperation = 'source-over';
  return cvv;
}
// layer descriptor: d = depth (0 far .. 1 near)
const Ly = (drawFn, color, d, o = {}) => ({ cv: bake(drawFn, color, o), d, back: o.back, front: o.front, raw: !!o.raw, noShadow: o.noShadow });

// ---------- shapes (all draw black silhouettes, y down) ----------
function poly(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); }
function archPath(c, x, y, w, h) { c.beginPath(); c.moveTo(x - w / 2, y + h); c.lineTo(x - w / 2, y + w / 2); c.arc(x, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y + h); c.closePath(); }
function hole(c, fn) { c.save(); c.globalCompositeOperation = 'destination-out'; fn(c); c.restore(); }
function facade(c, x, y, w, h, o = {}) {
  c.fillRect(x, y, w, h);
  c.fillRect(x - 14, y - 16, w + 28, 22);                                    // cornice
  for (let i = 0; i < 9; i++) c.fillRect(x + 8 + i * (w - 40) / 8, y - 44, 24, 30);   // parapet blocks
  c.fillRect(x + w / 2 - 50, y - 70, 100, 40);                                 // central pediment
  const wins = [], uw = 84, uh = 165;
  for (const fx of [.17, .5, .83]) wins.push({ x: x + w * fx, y: y + h * .14, w: uw, h: uh });
  wins.push({ x: x + w * .17, y: y + h * .6, w: 90, h: 130 }, { x: x + w * .83, y: y + h * .6, w: 90, h: 130 });
  const door = { x: x + w / 2, y: y + h - 215, w: 124, h: 215 };
  hole(c, c2 => { for (const q of wins) { archPath(c2, q.x, q.y, q.w, q.h); c2.fill(); } archPath(c2, door.x, door.y, door.w, door.h); c2.fill(); });
  // balcony rail in front of the upper windows
  c.fillRect(x + 12, y + h * .14 + 128, w - 24, 8); for (let i = 0; i <= 26; i++) c.fillRect(x + 14 + i * (w - 32) / 26, y + h * .14 + 80, 5, 52);
  c.fillRect(x + 12, y + h * .14 + 80, w - 24, 6);
  // window mullions
  for (const q of wins) c.fillRect(q.x - 2, q.y + q.w / 2, 4, q.h - q.w / 2);
  return { wins, door };
}
function rowHouses(c, x0, x1, base, seed, hmin, hmax, gaps = []) {
  const r = mulberry(seed); let x = x0;
  while (x < x1) {
    const w = 130 + r() * 150, h = hmin + r() * (hmax - hmin); if (gaps.some(g => x + w > g[0] && x < g[1])) { x += w; continue; }
    c.fillRect(x, base - h, w, h + 30); c.fillRect(x - 6, base - h - 14, w + 12, 16);
    if (r() < .5) c.fillRect(x + w * .3, base - h - 50, w * .4, 40);
    const nx = Math.max(1, Math.floor(w / 64));
    hole(c, c2 => { for (let i = 0; i < nx; i++) { const wx = x + (i + .5) * w / nx; c2.fillRect(wx - 12, base - h + 36, 24, 44); if (h > 260) c2.fillRect(wx - 12, base - h + 130, 24, 44); } });
    x += w + 6 + r() * 20;
  }
}
function cloudBand(c, y, seed, amp, n = 9) {
  const r = mulberry(seed); c.beginPath(); c.moveTo(-100, y + 500);
  for (let i = 0; i <= n; i++) { const x = -100 + i * (W + 200) / n; c.quadraticCurveTo(x - 60, y - amp * r(), x + 40, y + amp * .3 * r() - 20); }
  c.lineTo(W + 100, y + 500); c.closePath(); c.fill();
}
function skylineFar(c, base, seed, hmin, hmax, tower = true) {
  const r = mulberry(seed); let x = -20;
  while (x < W + 20) { const w = 50 + r() * 90, h = hmin + r() * (hmax - hmin); c.fillRect(x, base - h, w, h + 40); x += w + r() * 10; }
  if (tower) { c.fillRect(700, base - hmax - 150, 46, 190); poly(c, [[690, base - hmax - 150], [723, base - hmax - 230], [756, base - hmax - 150]]); }
}
function treeSil(c, x, base, h, seed) {
  const r = mulberry(seed); c.fillRect(x - 12, base - h * .55, 24, h * .55 + 20);
  function br(x0, y0, a, len, wd, dep) { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (dep > 0) { br(x1, y1, a - .5 - r() * .3, len * .72, wd * .7, dep - 1); br(x1, y1, a + .5 + r() * .3, len * .72, wd * .7, dep - 1); } }
  br(x, base - h * .5, -Math.PI / 2 + (r() - .5) * .3, h * .28, 16, 5);
}
function fence(c, y, x0, x1, hgt = 90) { for (let x = x0; x < x1; x += 34) { poly(c, [[x, y], [x + 8, y - hgt], [x + 16, y]]); } c.fillRect(x0, y - hgt * .6, x1 - x0, 7); }
function ground(c, y, seed) { c.beginPath(); c.moveTo(-100, H + 200); c.lineTo(-100, y); for (let x = -100; x <= W + 100; x += 60) c.lineTo(x, y + (vnoise(x * .01 + seed) - .5) * 40); c.lineTo(W + 100, H + 200); c.closePath(); c.fill(); }
function woman(c, x, y, s, kind) {
  c.beginPath(); c.arc(x, y, 21 * s, 0, 7); c.fill();
  if (kind === 'old') { c.beginPath(); c.arc(x - 8 * s, y - 12 * s, 14 * s, 0, 7); c.fill(); poly(c, [[x - 52 * s, y + 70 * s], [x - 30 * s, y + 30 * s], [x + 30 * s, y + 30 * s], [x + 52 * s, y + 70 * s], [x + 62 * s, y + 170 * s], [x - 62 * s, y + 170 * s]]); }
  else { c.beginPath(); c.moveTo(x + 14 * s, y); c.quadraticCurveTo(x + 40 * s, y + 70 * s, x + 20 * s, y + 130 * s); c.lineTo(x + 28 * s, y + 130 * s); c.quadraticCurveTo(x + 50 * s, y + 60 * s, x + 20 * s, y - 4 * s); c.fill(); poly(c, [[x - 40 * s, y + 66 * s], [x - 24 * s, y + 30 * s], [x + 24 * s, y + 30 * s], [x + 40 * s, y + 66 * s], [x + 46 * s, y + 170 * s], [x - 46 * s, y + 170 * s]]); }
}
function parrot(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.ellipse(0, 10, 78, 120, .2, 0, 7); c.fill();                         // body
  c.beginPath(); c.arc(-34, -128, 54, 0, 7); c.fill();                                    // head
  poly(c, [[-72, -150], [-130, -138], [-122, -92], [-92, -92], [-80, -108]]);            // beak (hooked)
  poly(c, [[30, 100], [90, 280], [120, 270], [70, 90]]); poly(c, [[10, 110], [30, 300], [62, 296], [48, 100]]); poly(c, [[50, 90], [130, 250], [160, 232], [92, 80]]);   // tail
  poly(c, [[20, -40], [100, 20], [86, 150], [34, 100]]);                                  // wing
  c.fillRect(-170, 160, 340, 12); c.restore();
  hole(c, c2 => { c2.beginPath(); c2.arc(-48 * s + x - x, 0, 0, 0, 0); }); // placeholder
}
function ghostShape(c, x, y, s) { woman(c, x, y, s, 'old'); }

// ---------- text strips ----------
function strip(c, t, t0, d, text, cx, cy, size, o = {}) {
  const t1 = o.t1 ?? 1e9, p = eo(seg(t, t0, t0 + d)) * (1 - ss(seg(t, t1 - .4, t1))); if (p <= 0) return;
  c.save(); c.font = `${size}px "${o.font || 'IM Fell English SC'}"`; const tw = c.measureText(text).width, sw = tw + 90, sh = size * 1.55;
  c.translate(cx, cy); if (o.rot) c.rotate(o.rot); if (o.scale) { const k = lerp(o.scale, 1, eo(seg(t, t0, t0 + .25))); c.scale(k, k); }
  c.beginPath(); c.rect(-sw / 2 - 20, -sh / 2 - 30, (sw + 40) * clamp(p * 1.15), sh + 60); c.clip();
  c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 24; c.shadowOffsetY = 12; c.fillStyle = o.bg || '#15100f'; c.fillRect(-sw / 2, -sh / 2, sw, sh); c.shadowColor = 'transparent';
  c.strokeStyle = rgba(o.col || '#ffcf8a', .35); c.lineWidth = 2; c.strokeRect(-sw / 2 + 8, -sh / 2 + 8, sw - 16, sh - 16);
  c.textAlign = 'center'; c.textBaseline = 'middle'; const fl = 1 + .05 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
  c.shadowColor = rgba(o.col || '#ffb862', .9); c.shadowBlur = 26; c.fillStyle = rgba(o.col || '#ffcf8a', .95 * fl); c.fillText(text, 0, 3); c.fillText(text, 0, 3);
  c.restore();
}
function glowRect(c, fn, col, a, blur = 22) {   // crisp light shape + soft bloom
  c.save(); c.fillStyle = col; c.globalAlpha = a; fn(c); c.restore();
}
function bloom(c, fn, col, a, blur = 28) {
  c.save(); c.filter = `blur(${blur}px)`; c.globalCompositeOperation = 'lighter'; c.fillStyle = col; c.globalAlpha = a; fn(c); c.restore();
}
const flick = t => 1 + .06 * Math.sin(7.3 * t) * Math.sin(3.1 * t);

// ---------- scenes ----------
const SCENES = [];
function addScene(t0, t1, build) { SCENES.push({ t0, t1, build, S: null }); }
const SK = (top, bot, glow) => (c) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); if (glow) for (const q of [].concat(glow)) { const r = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); r.addColorStop(0, q.col); r.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = r; c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); } };
const frontBand = (col, seed) => Ly(c => ground(c, 1470, seed), col, 1, { rimA: .25 });

// ---------- helpers ----------
const poly0 = (c, pts) => { pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
function cutOn(c, fn, col, a) { c.save(); c.fillStyle = col; c.globalAlpha = a; fn(c); c.restore(); }
function blob(c, pts) { const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; c.beginPath(); const s = m(pts[n - 1], pts[0]); c.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const p = pts[i], q = m(p, pts[(i + 1) % n]); c.quadraticCurveTo(p[0], p[1], q[0], q[1]); } c.closePath(); c.fill(); }
function water(c, t, y0, seed, moon, woman) {
  c.save(); c.beginPath(); c.rect(-OFF, y0, W + 2 * OFF, H - y0 + OFF); c.clip();
  const g = c.createLinearGradient(0, y0, 0, H); g.addColorStop(0, '#13314a'); g.addColorStop(1, '#0a1a2c'); c.fillStyle = g; c.fillRect(-OFF, y0, W + 2 * OFF, H);
  if (moon) for (let i = 0; i < 7; i++) { const xx = moon.x + (i - 3) * 10; c.strokeStyle = `rgba(240,210,150,${.5 - Math.abs(i - 3) * .09})`; c.lineWidth = 9 - Math.abs(i - 3); c.beginPath(); for (let y = y0; y < H; y += 10) c.lineTo(xx + Math.sin(y * .04 + t * 2) * 10, y); c.stroke(); }
  if (woman) { c.strokeStyle = '#cfe4ee'; for (let i = 0; i < 5; i++) { const xx = woman + (i - 2) * 9; c.globalAlpha = .3 - Math.abs(i - 2) * .05; c.lineWidth = 7 - Math.abs(i - 2) * 2; c.beginPath(); for (let y = y0; y < H; y += 10) c.lineTo(xx + Math.sin(y * .05 + t * 2.3) * 9, y); c.stroke(); } c.globalAlpha = 1; }
  c.strokeStyle = '#9fc2d6'; const R = mulberry(seed); for (let i = 0; i < 46; i++) { const y = y0 + 20 + R() * (H - y0), x = -OFF + R() * (W + 2 * OFF), w = 30 + R() * 90, ph = R() * 10; c.lineWidth = 1 + R() * 2.4; c.globalAlpha = .18 + R() * .3; c.beginPath(); for (let k = 0; k <= 8; k++) { const xx = x + k / 8 * w; c.lineTo(xx, y + Math.sin(k * .9 + t * 3 + ph) * 3); } c.stroke(); }
  c.restore();
}
function llorona(c, x, y, k, a, pose, t) {
  const jx = Math.sin((t || 0) * 1.4 + x) * 3; c.save(); c.translate(x + jx, y); c.scale(k, k); c.globalAlpha = a;
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * .2; c.filter = 'blur(28px)'; c.fillStyle = '#cfe6f2'; blob(c, [[-48, -324], [48, -324], [88, -30], [0, 34], [-88, -30]]); c.restore();
  c.fillStyle = '#eef6f6';
  // long flaring gown to the ground, a suggested waist
  blob(c, [[-20, -302], [20, -302], [15, -236], [24, -150], [56, -36], [88, 36], [40, 40], [0, 18], [-40, 40], [-88, 36], [-56, -36], [-24, -150], [-15, -236]]);
  // rebozo over the shoulders
  c.fillStyle = '#e4eff3'; blob(c, [[-36, -292], [36, -292], [50, -208], [22, -170], [0, -196], [-22, -170], [-50, -208]]);
  // arms
  const up = pose === 'cry' ? 1 : pose === 'reach' ? .5 : 0;
  for (const s of [-1, 1]) { const ex = s * (16 + up * 12), ey = -292 + up * -30 + (1 - up) * 70; c.save(); c.lineCap = 'round'; c.strokeStyle = '#eef6f6'; c.lineWidth = 18; c.beginPath(); c.moveTo(s * 26, -286); c.lineTo(ex, ey); c.stroke(); c.restore(); c.fillStyle = '#f0f7f7'; c.beginPath(); c.arc(ex, ey + 2, 9, 0, TAU); c.fill(); }
  // head
  c.fillStyle = '#eef6f6'; c.beginPath(); c.ellipse(0, -336, 26, 32, 0, 0, TAU); c.fill();
  // rebozo / veil over the head, falling long down both sides
  c.fillStyle = '#dcebf0'; blob(c, [[-40, -362], [0, -382], [40, -362], [46, -320], [30, -150], [18, -322], [0, -332], [-18, -322], [-30, -150], [-46, -320]]);
  // long hair strands
  c.save(); c.strokeStyle = '#cfe0e8'; c.lineWidth = 4; c.lineCap = 'round'; for (const hx of [-13, 0, 13]) { c.beginPath(); c.moveTo(hx, -322); c.quadraticCurveTo(hx * 1.5, -240, hx * 1.2, -150); c.stroke(); } c.restore();
  // sombre face (hollow voids when crying)
  if (pose === 'cry') { c.fillStyle = '#13314a'; c.beginPath(); c.ellipse(-10, -340, 5, 9, 0, 0, TAU); c.ellipse(10, -340, 5, 9, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -318, 6, 10, 0, 0, TAU); c.fill(); }
  else { c.fillStyle = '#8fb0c0'; c.beginPath(); c.ellipse(-10, -340, 3.6, 4.6, 0, 0, TAU); c.ellipse(10, -340, 3.6, 4.6, 0, 0, TAU); c.fill(); c.save(); c.strokeStyle = '#8fb0c0'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.arc(0, -312, 8, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); c.restore(); }
  c.restore();
}
function child(c, x, y, k, a) { c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = a; c.fillStyle = '#d7e8ef';
  blob(c, [[-22, -150], [22, -150], [32, -6], [-32, -6]]);
  for (const s of [-1, 1]) { c.save(); c.lineCap = 'round'; c.strokeStyle = '#d7e8ef'; c.lineWidth = 12; c.beginPath(); c.moveTo(s * 18, -140); c.lineTo(s * 34, -188); c.stroke(); c.restore(); }
  c.beginPath(); c.ellipse(0, -174, 18, 20, 0, 0, TAU); c.fill(); c.restore();
}
// ---- Mexican detail ----
function agave(c, x, base, s) { c.save(); c.translate(x, base); for (let i = 0; i < 9; i++) { const a = -Math.PI + i / 8 * Math.PI, l = (60 + (i % 2) * 26) * s; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a) * l * .5 - Math.sin(a) * 10 * s, -Math.abs(Math.sin(a)) * l * .5 + 6, Math.cos(a) * l, -Math.abs(Math.sin(a)) * l); c.quadraticCurveTo(Math.cos(a) * l * .5 + Math.sin(a) * 8 * s, -Math.abs(Math.sin(a)) * l * .5 - 4, 0, 0); c.closePath(); c.fill(); } c.restore(); }
function bellTower(c, x, base, w, h) { c.fillRect(x - w / 2, base - h, w, h); poly0(c, [[x - w / 2 - 8, base - h], [x + w / 2 + 8, base - h], [x + w / 2 - 6, base - h - 30], [x - w / 2 + 6, base - h - 30]]); c.fill(); // belfry
  const by = base - h - 30; c.fillRect(x - w / 2 + 2, by - w, w - 4, w); c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(x - w * .22, by); c.lineTo(x - w * .22, by - w * .5); c.arc(x, by - w * .5, w * .22, Math.PI, 0); c.lineTo(x + w * .22, by); c.closePath(); c.fill(); c.restore();
  poly0(c, [[x - w * .3, by - w], [x + w * .3, by - w], [x, by - w - 26]]); c.fill(); c.fillRect(x - 3, by - w - 52, 6, 26); c.fillRect(x - 13, by - w - 42, 26, 6); }
function papel(c, y, x0, x1, seed) { const R = mulberry(seed), fw = 86, fh = 104; c.save(); c.lineWidth = 3; c.strokeStyle = c.fillStyle; c.beginPath(); c.moveTo(x0, y); for (let x = x0; x <= x1; x += 40) c.lineTo(x, y + 8 * Math.sin((x - x0) * .03)); c.stroke(); for (let x = x0 + 20; x < x1; x += fw + 16) { const yy = y + 8 * Math.sin((x - x0) * .03); c.fillRect(x, yy, fw, fh); c.save(); c.globalCompositeOperation = 'destination-out'; for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) { if (R() > .55) continue; c.beginPath(); c.arc(x + 20 + q * 24, yy + 24 + r * 28, 6 + R() * 4, 0, TAU); c.fill(); } c.beginPath(); c.moveTo(x + fw / 2, yy + fh); c.lineTo(x + fw / 2 - 12, yy + fh - 20); c.lineTo(x + fw / 2 + 12, yy + fh - 20); c.closePath(); c.fill(); c.restore(); } c.restore(); }

function reeds(c, y, x0, x1, hmax, seed) { const R = mulberry(seed); for (let x = x0; x < x1; x += 22) { const h = hmax * (.5 + R() * .7), bend = (R() - .5) * 30; c.save(); c.strokeStyle = c.fillStyle; c.lineWidth = 5 + R() * 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + bend * .5, y - h * .6, x + bend, y - h); c.stroke(); c.restore(); } }
function pyramid(c, cx, base, w, h, steps) { for (let i = 0; i < steps; i++) { const f = i / steps, f2 = (i + 1) / steps; poly0(c, [[cx - w / 2 * (1 - f), base - h * f], [cx + w / 2 * (1 - f), base - h * f], [cx + w / 2 * (1 - f) - w * .06, base - h * f2], [cx - w / 2 * (1 - f) + w * .06, base - h * f2]]); c.fill(); } poly0(c, [[cx - w * .12, base - h * .86], [cx + w * .12, base - h * .86], [cx + w * .1, base - h], [cx - w * .1, base - h]]); c.fill(); }
function cryArc(c, x, y, t, t0, col) { for (let k = 0; k < 4; k++) { const u = ((t - t0 - k * .4) / 1.8); if (u < 0 || u > 1) continue; c.save(); c.globalAlpha = (1 - u) * .7; c.strokeStyle = col || '#cfe4ee'; c.lineWidth = 7 - 4 * u; c.beginPath(); c.arc(x, y, 50 + u * 360, Math.PI * .7, Math.PI * 1.3); c.stroke(); c.restore(); } }
function manSil2(c, x, y, k) { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = '#0e0a18'; blob(c, [[-26, -220], [26, -220], [40, -14], [-40, -14]]); c.beginPath(); c.ellipse(0, -250, 26, 30, 0, 0, TAU); c.fill(); poly0(c, [[-30, -280], [30, -280], [26, -260], [-26, -260]]); c.fill(); c.restore(); }

// ---------- mano-peluda helpers (poly0/cutOn/blob/flick come from the engine above) ----------
function candle(c, x, y, k, t) { c.save(); c.translate(x, y); c.scale(k, k); // the one warm light
  c.fillStyle = '#1c140a'; c.fillRect(-12, 0, 24, 70); c.fillStyle = '#efe0c0'; c.fillRect(-11, -8, 22, 12);
  const fh = 1 + .12 * Math.sin(t * 13); c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, -24, 2, 0, -24, 260); g.addColorStop(0, 'rgba(255,196,110,.9)'); g.addColorStop(.5, 'rgba(255,150,70,.18)'); g.addColorStop(1, 'rgba(255,150,70,0)'); c.fillStyle = g; c.fillRect(-260, -284, 520, 520); c.restore();
  c.fillStyle = '#ffce72'; c.beginPath(); c.ellipse(0, -24, 8, 22 * fh, 0, 0, TAU); c.fill(); c.fillStyle = '#fff1c0'; c.beginPath(); c.ellipse(0, -20, 4, 12 * fh, 0, 0, TAU); c.fill(); c.restore(); }
// the hairy hand — a dark ink silhouette with bristles; flex 0 flat .. 1 clawed/crawling
function hairyHand(c, x, y, k, rot, flex, t) { c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(k, k); c.fillStyle = '#0a0c13'; c.strokeStyle = '#0a0c13'; c.lineCap = 'round'; c.lineJoin = 'round';
  blob(c, [[-20, 56], [20, 56], [16, 18], [-16, 18]]);               // wrist stump
  c.beginPath(); c.ellipse(0, 6, 28, 22, 0, 0, TAU); c.fill();        // palm
  const F = [[-42, 60], [-20, 72], [2, 74], [24, 70], [46, 48]];      // finger base angles(deg)/len
  F.forEach(([ad, len], i) => { const a = ad * Math.PI / 180 - Math.PI / 2, fl = flex * (.6 + .25 * Math.sin(t * 4 + i * 1.3)); const bx = Math.cos(a) * 24, by = -12 + Math.sin(a) * 18; const m1x = bx + Math.cos(a) * len * .5, m1y = by + Math.sin(a) * len * .5; const ex = m1x + Math.cos(a + fl * 1.5) * len * .5, ey = m1y + Math.sin(a + fl * 1.5) * len * .5; c.lineWidth = i === 4 ? 13 : 11; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(m1x, m1y, ex, ey); c.stroke(); c.beginPath(); c.arc(ex, ey, (i === 4 ? 6.5 : 5.5), 0, TAU); c.fill(); });
  // bristles
  c.lineWidth = 1.6; const R = mulberry(7); for (let i = 0; i < 46; i++) { const a = R() * TAU, r = 10 + R() * 22; const px = Math.cos(a) * r, py = 6 + Math.sin(a) * r * .8; c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * (5 + R() * 5), py + Math.sin(a) * (5 + R() * 5)); c.stroke(); }
  c.restore(); }
// a bed seen from the side; o.foot = a foot/ankle hanging out; o.tuck = feet pulled in
function bed(c, x, y, k, o = {}) { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = '#0c0e16';
  c.fillRect(-210, -170, 18, 170); c.fillRect(192, -120, 18, 120);   // head / foot board
  c.fillRect(-210, -80, 420, 24);                                     // mattress
  blob(c, [[-178, -92], [-120, -120], [-70, -104], [-88, -82], [-176, -78]]); // pillow
  if (o.sleeper !== false) { c.beginPath(); c.ellipse(-150, -104, 26, 24, 0, 0, TAU); c.fill(); }  // head
  const br = (o.breath || 0); blob(c, [[-90, -92 - 6 * br], [-30, -118 - 8 * br], [60, -112 - 8 * br], [150, -118 - 6 * br], [192, -96], [192, -56], [-90, -56]]); // blanket
  if (o.foot) { c.save(); c.lineCap = 'round'; c.lineWidth = 16; c.strokeStyle = '#0c0e16'; c.beginPath(); c.moveTo(188, -80); c.lineTo(224, -30 + (o.foot === 2 ? 0 : 0)); c.stroke(); c.beginPath(); c.ellipse(232, -22, 16, 10, -.3, 0, TAU); c.fill(); c.restore(); }
  c.restore(); }
function figure2(c, x, y, k, kind, o = {}) { c.save(); c.translate(x, y); c.scale(k * (o.flip || 1), k); c.fillStyle = o.col || '#0c0e16';
  const body = kind === 'child' ? [[-20, -120], [20, -120], [28, -10], [-28, -10]] : kind === 'hood' ? [[-30, -210], [30, -210], [46, -10], [-46, -10]] : [[-34, -200], [34, -200], [30, -130], [60, -10], [-60, -10], [-30, -130]];
  blob(c, body); const hy = kind === 'child' ? -138 : -228; c.beginPath(); c.ellipse(0, hy, kind === 'child' ? 18 : 30, kind === 'child' ? 20 : 34, 0, 0, TAU); c.fill();
  if (kind === 'hood') { blob(c, [[-34, hy - 6], [0, hy - 40], [34, hy - 6], [30, hy + 30], [0, hy + 10], [-30, hy + 30]]); }  // hood
  if (kind === 'abuela') { blob(c, [[-40, hy - 10], [0, hy - 30], [40, hy - 10], [44, hy + 40], [-44, hy + 40]]); c.save(); c.strokeStyle = o.col || '#0c0e16'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-30 + i * 20, -8); c.lineTo(-26 + i * 20, -120); c.stroke(); } c.restore(); }
  c.restore(); }
function chestGold(c, x, y, k, t) { c.save(); c.translate(x, y); c.scale(k, k);   // the one yellow: buried gold
  c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, -6, 2, 0, -6, 160); g.addColorStop(0, `rgba(240,180,70,${.8 * flick(t)})`); g.addColorStop(1, 'rgba(240,180,70,0)'); c.fillStyle = g; c.fillRect(-160, -160, 320, 320); c.restore();
  cutOn(c, c2 => { for (let i = 0; i < 14; i++) { c2.beginPath(); c2.arc((mulberry(i * 3)() - .5) * 90, -10 + (mulberry(i * 5)() - .5) * 26, 9, 0, TAU); c2.fill(); } }, '#f0bf4a', .95);
  c.fillStyle = '#0c0e16'; c.fillRect(-80, 10, 160, 40); c.restore(); }
function graveMound(c, y) { c.fillStyle = '#0a0d10'; blob(c, [[-OFF - 40, y], [-200, y - 40], [0, y - 70], [200, y - 40], [W + OFF + 40, y], [W + OFF + 40, H], [-OFF - 40, H]]); }

// ======================================================= SCENES =======================================================
// 1 · THE HOOK — a dark bedroom, a sleeper, a candle; the hand peeks from under the bed
addScene(0, 7.64, () => {
  const sky = Ly(SK('#10141f', '#272c3e'), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillStyle = '#1a2033'; c.fillRect(-OFF, -OFF, W + 2 * OFF, 1180); hole(c, c2 => { archPath(c2, 820, 300, 230, 360); c2.fill(); }); }, '#1a2033', .28, { glow: { x: 300, y: 1060, r: 420, col: '#ffb45a', a: .3 } });
  wall.back = (c, t) => cutOn(c, c2 => archPath(c2, 820, 300, 230, 360), '#2a3658', .9);  // a dim window
  const floor = Ly(c => { c.fillStyle = '#241c12'; c.fillRect(-OFF, 1160, W + 2 * OFF, 800); for (let x = -OFF; x < W + OFF; x += 90) { c.strokeStyle = '#1a140c'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 1160); c.lineTo(x, H); c.stroke(); } }, '#241c12', .5, { glow: { x: 300, y: 1160, r: 500, col: '#ffb45a', a: .25 } });
  const room = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { candle(c, 250, 1120, 1.1, t); bed(c, 640, 1360, 1.15, { breath: Math.sin(t * 1.2), sleeper: true });
    const peek = ss(seg(t, 3.0, 6.0)); if (peek > 0) hairyHand(c, 760 + peek * 0, 1316, .7 + peek * .1, -.2, .5 + .3 * Math.sin(t * 3), t); } });
  return { layers: [sky, wall, floor, room, frontBand('#06070d', 3)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 0, 7.64))) }), over: (c, t) => { strip(c, t, .1, .9, 'PLOT TWIST WITH A&R  ·  EPISODE 18', 540, 150, 30, { col: '#c9a86a', font: 'Cormorant Garamond' }); strip(c, t, .5, 1.3, 'LA MANO PELUDA', 540, 300, 76, { col: '#e8c488' }); strip(c, t, 2.6, 1.0, 'THE HAIRY HAND', 540, 420, 46, { col: '#c9a86a', t1: 7.5 }); } };
});
// 2 · THE HAIRY HAND — close on the hand crawling across the warm-lit floor
addScene(7.64, 16.06, () => {
  const sky = Ly(SK('#0e1119', '#201a12'), '#000', 0, { raw: true });
  const floor = Ly(c => { c.fillStyle = '#2a2014'; c.fillRect(-OFF, 500, W + 2 * OFF, H); for (let x = -OFF; x < W + OFF; x += 100) { c.strokeStyle = '#1c1409'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, 500); c.lineTo(x + (x - 540) * .2, H); c.stroke(); } for (let y = 640; y < H; y += 160) { c.strokeStyle = '#1c1409'; c.lineWidth = 3; c.beginPath(); c.moveTo(-OFF, y); c.lineTo(W + OFF, y); c.stroke(); } }, '#2a2014', .4, { glow: { x: 760, y: 420, r: 700, col: '#ffbe64', a: .4 } });
  const dark = Ly(c => { c.fillStyle = '#0a0c12'; c.fillRect(-OFF, -OFF, W + 2 * OFF, 420); blob(c, [[-OFF, 460], [200, 380], [540, 430], [900, 380], [W + OFF, 450], [W + OFF, 200], [-OFF, 200]]); }, '#0a0c12', .62, { glow: { x: 760, y: 420, r: 420, col: '#ffbe64', a: .3 } });
  const hand = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { const u = ss(seg(t, 8.2, 15.0)); hairyHand(c, lerp(300, 720, u), lerp(760, 1180, u) + Math.sin(t * 3) * 6, 2.0, -.1 + Math.sin(t * 1.5) * .1, .7 + .3 * Math.sin(t * 5), t); } });
  return { layers: [sky, dark, floor, hand, frontBand('#05060b', 7)], cam: t => ({ x: lerp(10, -10, ss(seg(t, 7.64, 16.06))), y: 0, z: lerp(1.0, 1.12, ss(seg(t, 7.64, 16.06))) }) };
});
// 3 · THE BURIED MAN — a grave at night, a chest of gold below, the hand clawing up
addScene(16.06, 24.58, () => {
  const moon = { x: 760, y: 360 };
  const sky = Ly(SK('#0c1226', '#243a54', [{ x: moon.x, y: moon.y, r: 520, col: 'rgba(220,215,180,.45)' }]), '#000', 0, { raw: true, front: c => { bloom(c, c2 => { c2.beginPath(); c2.arc(moon.x, moon.y, 80, 0, TAU); c2.fill(); }, '#e6dcbe', .7, 20); c.fillStyle = '#e6dcbe'; c.beginPath(); c.arc(moon.x, moon.y, 76, 0, TAU); c.fill(); } });
  const hills = Ly(c => skylineFar(c, 980, 61, 100, 180, false), '#122236', .34);
  const crosses = Ly(c => { c.fillStyle = '#0a0f1a'; for (const [x, s] of [[160, 1], [380, .8], [920, 1.1]]) { c.fillRect(x - 6 * s, 980 - 120 * s, 12 * s, 120 * s); c.fillRect(x - 28 * s, 980 - 92 * s, 56 * s, 12 * s); } }, '#0a0f1a', .5);
  const ground = Ly(c => { graveMound(c, 1120); }, '#0a0d10', .7, { glow: { x: 540, y: 1260, r: 360, col: '#f0bf4a', a: .25 } });
  const grave = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { c.save(); c.fillStyle = '#060809'; poly0(c, [[420, 1120], [660, 1120], [700, H], [380, H]]); c.fill(); c.restore(); chestGold(c, 540, 1430, 1.2, t);
    const rise = ss(seg(t, 16.3, 21.5)); hairyHand(c, 540 + Math.sin(t * 1.6) * 14, lerp(1540, 1086, rise), 1.75, Math.PI + Math.sin(t * 1.3) * .12, .45 + .35 * Math.sin(t * 4), t); } });
  return { layers: [sky, hills, crosses, ground, grave, frontBand('#040608', 13)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 16.06, 24.58))) }), over: (c, t) => { strip(c, t, 16.6, .8, 'ORO', 540, 1360, 40, { col: '#f0bf4a', t1: 24.4 }); } };
});
// 4 · THE TORTURED SOUL — the Inquisition: stone arches, a brazier, a hooded figure, a severed hand
addScene(24.58, 31.88, () => {
  const sky = Ly(SK('#140d0a', '#3a241a', [{ x: 300, y: 900, r: 460, col: 'rgba(255,150,70,.3)' }]), '#000', 0, { raw: true });
  const arches = Ly(c => { c.fillStyle = '#1a120d'; c.fillRect(-OFF, -OFF, W + 2 * OFF, H); hole(c, c2 => { for (const x of [250, 540, 830]) { archPath(c2, x, 360, 200, 520); c2.fill(); } }); }, '#1a120d', .3, { glow: { x: 300, y: 820, r: 560, col: '#ff9a44', a: .3 } });
  arches.back = (c, t) => { for (const x of [250, 540, 830]) cutOn(c, c2 => archPath(c2, x, 360, 200, 520), '#2a1c12', .9); };
  const stage = Ly(c => { c.fillStyle = '#0c0906'; c.fillRect(-OFF, 980, W + 2 * OFF, 800); c.fillRect(360, 820, 360, 170); }, '#0c0906', .6, { glow: { x: 300, y: 980, r: 460, col: '#ff9a44', a: .3 } });
  const souls = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { // a brazier flame, a hooded figure, a hand on the block
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(240, 920, 2, 240, 920, 260); g.addColorStop(0, `rgba(255,150,70,${.8 * flick(t)})`); g.addColorStop(1, 'rgba(255,150,70,0)'); c.fillStyle = g; c.fillRect(0, 700, 480, 440); c.restore();
    for (let i = 0; i < 5; i++) { const fx = 240 + (i - 2) * 16; cutOn(c, c2 => { c2.beginPath(); c2.moveTo(fx, 940); c2.quadraticCurveTo(fx + 8, 880 - 30 * flick(t + i), fx, 850 - 40 * flick(t + i)); c2.quadraticCurveTo(fx - 8, 880, fx, 940); c2.fill(); }, '#ff9a44', .9 * flick(t + i)); }
    c.fillStyle = '#0c0906'; c.fillRect(214, 940, 54, 40);
    figure2(c, 760, 980, 1.3, 'hood', {});
    const sev = ss(seg(t, 26.0, 28.0)); hairyHand(c, 520, 980 - sev * 2, 1.0, -.3, .3, t);
    const ret = ss(seg(t, 29.0, 31.0)); if (ret > 0) hairyHand(c, lerp(520, 300, ret), lerp(980, 900, ret), 1.0, -.6, .6, t); } });
  return { layers: [sky, arches, stage, souls, frontBand('#040302', 17)], cam: t => ({ x: lerp(-10, 14, ss(seg(t, 24.58, 31.88))), y: 0, z: lerp(1.0, 1.08, ss(seg(t, 24.58, 31.88))) }), over: (c, t) => { strip(c, t, 25.2, .8, 'LA INQUISICIÓN', 540, 250, 44, { col: '#ffb060', t1: 31.7 }); } };
});
// 5 · THE NIGHT VISIT — the hand climbs the bedframe to a dangling foot
addScene(31.88, 39.26, () => {
  const sky = Ly(SK('#0e1320', '#20283c'), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillStyle = '#181e30'; c.fillRect(-OFF, -OFF, W + 2 * OFF, 1180); hole(c, c2 => { archPath(c2, 240, 320, 220, 340); c2.fill(); }); }, '#181e30', .28, { glow: { x: 820, y: 1100, r: 440, col: '#ffb45a', a: .28 } });
  wall.back = (c, t) => cutOn(c, c2 => archPath(c2, 240, 320, 220, 340), '#2a3860', .9);
  const floor = Ly(c => { c.fillStyle = '#231b11'; c.fillRect(-OFF, 1160, W + 2 * OFF, 800); }, '#231b11', .5, { glow: { x: 820, y: 1160, r: 520, col: '#ffb45a', a: .22 } });
  const room = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { candle(c, 880, 1120, 1.0, t); bed(c, 520, 1380, 1.3, { breath: Math.sin(t * 1.1), foot: 1 });
    // the hand climbs the footboard toward the foot
    const climb = ss(seg(t, 32.4, 38.0)); const hx = lerp(820, 760, climb), hy = lerp(1500, 1200, climb); hairyHand(c, hx, hy, 1.1, lerp(.2, -.9, climb), .6 + .3 * Math.sin(t * 5), t);
    if (climb > .85) cutOn(c, c2 => { c2.beginPath(); c2.arc(772, 1196, 36, 0, TAU); c2.fill(); }, '#0a0c13', (climb - .85) / .15); } });
  return { layers: [sky, wall, floor, room, frontBand('#06070d', 19)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.14, ss(seg(t, 31.88, 39.26))) }) };
});
// 6 · THE ELDERS' WARNING — a grandmother and children by candlelight; a hand hangs off a bed behind
addScene(39.26, 45.39, () => {
  const sky = Ly(SK('#141020', '#342842', [{ x: 540, y: 980, r: 520, col: 'rgba(255,170,90,.3)' }]), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillStyle = '#20182a'; c.fillRect(-OFF, -OFF, W + 2 * OFF, 1200); }, '#20182a', .3, { glow: { x: 540, y: 1060, r: 560, col: '#ffb85c', a: .32 } });
  const bg = Ly(c => { c.fillStyle = '#120d18'; c.fillRect(140, 560, 360, 360); hole(c, c2 => c2.fillRect(176, 600, 288, 288)); }, '#120d18', .45, { glow: { x: 540, y: 900, r: 500, col: '#ffb85c', a: .2 } });
  const room = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { candle(c, 540, 1140, 1.0, t);
    figure2(c, 540, 1120, 1.4, 'abuela', {});
    figure2(c, 330, 1120, 1.0, 'child', { flip: 1 }); figure2(c, 740, 1120, 1.0, 'child', { flip: -1 });
    // a small bed behind with a hand drooping off the edge
    c.save(); c.globalAlpha = .9; bed(c, 850, 760, .5, { sleeper: true }); c.restore(); hairyHand(c, 905, 740, .4, .6, .4 + .2 * Math.sin(t * 3), t); } });
  return { layers: [sky, wall, bg, room, frontBand('#070510', 23)], cam: t => ({ x: lerp(8, -8, ss(seg(t, 39.26, 45.39))), y: 0, z: lerp(1.0, 1.08, ss(seg(t, 39.26, 45.39))) }) };
});
// 7 · THE REAL MYSTERY — sleep paralysis: a frozen sleeper, a weight on the chest, faint hands
addScene(45.39, 52.56, () => {
  const sky = Ly(SK('#0a0f1c', '#18203a', [{ x: 540, y: 520, r: 500, col: 'rgba(150,170,210,.28)' }]), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillStyle = '#141b2e'; c.fillRect(-OFF, -OFF, W + 2 * OFF, 1180); }, '#141b2e', .3, { glow: { x: 540, y: 900, r: 560, col: '#9fb4d8', a: .2 } });
  const bed2 = Ly(c => { c.fillStyle = '#0c1018'; c.fillRect(-OFF, 980, W + 2 * OFF, 800); }, '#0c1018', .5);
  const para = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { // a sleeper lying flat, head left; eyes open
    c.save(); c.fillStyle = '#0c1018';
    c.fillRect(120, 980, 820, 26);  // bed top
    blob(c, [[180, 980], [260, 940], [520, 952], [760, 944], [820, 980]]); // body under sheet
    c.beginPath(); c.ellipse(220, 952, 34, 30, 0, 0, TAU); c.fill(); c.restore();
    cutOn(c, c2 => { c2.beginPath(); c2.ellipse(210, 950, 5, 7, 0, 0, TAU); c2.ellipse(234, 950, 5, 7, 0, 0, TAU); c2.fill(); }, '#cdd8ee', .9 * (t < 51 ? 1 : 1 - seg(t, 51, 52))); // open eyes
    // a dark weight crouched on the chest
    const sit = ss(seg(t, 46.0, 48.0)); c.save(); c.globalAlpha = sit; c.fillStyle = '#060810'; blob(c, [[470, 950], [520, 820], [600, 820], [650, 950], [640, 900], [480, 900]]); c.beginPath(); c.ellipse(560, 800, 40, 42, 0, 0, TAU); c.fill(); cutOn(c, c2 => { c2.beginPath(); c2.arc(545, 795, 6, 0, TAU); c2.arc(578, 795, 6, 0, TAU); c2.fill(); }, '#c23a3a', .8 * sit * flick(t)); c.restore();
    // faint reaching hands all around (the versions)
    for (const [x, y, d, r] of [[260, 1200, 46.5, .3], [820, 1180, 47.2, -.3], [120, 1260, 48.0, .6]]) { const a2 = ss(seg(t, d, d + .8)) * (.5 + .3 * Math.sin(t * 2)); c.save(); c.globalAlpha = a2; hairyHand(c, x, y, .8, r, .6, t); c.restore(); } } });
  return { layers: [sky, wall, bed2, para, frontBand('#04060c', 29)], cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.12, ss(seg(t, 45.39, 52.56))) }), over: (c, t) => { strip(c, t, 49.5, .8, '¿PARÁLISIS DEL SUEÑO?', 540, 300, 42, { col: '#9fb4d8', t1: 52.4 }); } };
});
// 8 · THE FINAL TWIST — the sleeper tucks their feet in; the hand lurks at the edge; the warning
addScene(52.56, 60.6, () => {
  const sky = Ly(SK('#0e1320', '#20283c'), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillStyle = '#181e30'; c.fillRect(-OFF, -OFF, W + 2 * OFF, 1180); hole(c, c2 => { archPath(c2, 240, 320, 220, 340); c2.fill(); }); }, '#181e30', .28, { glow: { x: 820, y: 1100, r: 440, col: '#ffb45a', a: .28 } });
  wall.back = (c, t) => cutOn(c, c2 => archPath(c2, 240, 320, 220, 340), '#2a3860', .9 * (1 - ss(seg(t, 58.8, 60.3))));
  const floor = Ly(c => { c.fillStyle = '#231b11'; c.fillRect(-OFF, 1160, W + 2 * OFF, 800); }, '#231b11', .5, { glow: { x: 820, y: 1160, r: 520, col: '#ffb45a', a: .22 } });
  const room = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { const lit = 1 - ss(seg(t, 58.8, 60.3)); c.save(); c.globalAlpha = Math.max(.08, lit); candle(c, 880, 1120, 1.0, t); c.restore();
    const tuck = ss(seg(t, 53.5, 55.0)); bed(c, 520, 1380, 1.3, { breath: Math.sin(t * 1.0), foot: tuck < .5 ? 1 : 0 });
    // the hand, foiled, sinks back at the foot of the bed
    const sink = ss(seg(t, 55.0, 57.5)); hairyHand(c, 760, lerp(1220, 1480, sink), 1.1, lerp(-.9, .3, sink), .5, t); } });
  return { layers: [sky, wall, floor, room, frontBand('#06070d', 31)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.12, ss(seg(t, 52.56, 60.6))) }), over: (c, t) => { strip(c, t, 55.4, 1.0, 'KEEP YOUR FEET', 540, 290, 50, { col: '#e8c488', t1: 60.4 }); strip(c, t, 56.3, 1.0, 'UNDER THE BLANKET.', 540, 390, 50, { col: '#e8c488', t1: 60.4 }); } };
});


// ---------- compositing ----------
const CACHE = new Map();
function getScene(i) {
  if (!CACHE.has(i)) { for (const k of [...CACHE.keys()]) if (Math.abs(k - i) > 1) CACHE.delete(k); RNG = mulberry(100 + i); CACHE.set(i, SCENES[i].build()); }
  return CACHE.get(i);
}
function drawScene(c, S, t) {
  const cam = S.cam(t), dt = (S.handX ? S.handX(t) : 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const mx = Math.sin(t * 1.7) * 2.4, my = Math.cos(t * 1.3) * 2.0;
  for (let k = 0; k < S.layers.length; k++) {
    const L = S.layers[k], z = cam.z, s = 1 + (z - 1) * (.35 + .65 * L.d), px = (cam.x + mx) * (.15 + .85 * L.d), py = (cam.y + my) * (.15 + .85 * L.d), fy = 1000;
    let ox = 0; if (L.cvOff) ox = 0;
    c.setTransform(s, 0, 0, s, 540 - s * (540 + px) + (L.drift ? Math.sin(t * .3) * L.drift : 0), fy - s * (fy + py));
    if (S.layers[k].back) S.layers[k].back(c, t);
    if (!L.raw && !L.noShadow) { c.shadowColor = 'rgba(0,0,0,.62)'; c.shadowBlur = 26 * s; c.shadowOffsetY = 18 * s; }
    let slide = 0; if (S.handX && L.d === .9) slide = dt;
    c.globalAlpha = L.alpha ?? 1;
    if (slide) { c.save(); c.translate(0, 0); const sx = (k % 2) * 0; c.drawImage(L.cv, -OFF - slide * 520, -OFF + slide * 80, L.cv.width, L.cv.height); c.restore(); } else c.drawImage(L.cv, -OFF, -OFF);
    c.globalAlpha = 1; c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    if (L.front) L.front(c, t);
  }
  c.restore();
}
function drawHandsFix() { }
function lampRoom(c, t, inner) {
  // pull out of the box: the lit lamp on a dark table, then the lamp goes dark
  const p = ss(seg(t, 59.2, 61.4)), s = lerp(1, .56, p), lit = 1 - ss(seg(t, 61.7, 62.3));
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#050406'; c.fillRect(0, 0, W, H);
  const cx = 540, cy = lerp(960, 820, p), bw = W * s, bh = H * s;
  if (p > 0) {
    const ty = cy + bh / 2; const tb = c.createLinearGradient(0, ty, 0, H); tb.addColorStop(0, '#2a1a10'); tb.addColorStop(1, '#090504'); c.fillStyle = tb; c.fillRect(0, ty, W, H - ty);
    const sp = c.createRadialGradient(cx, ty + 40, 20, cx, ty + 40, 560); sp.addColorStop(0, rgba('#ffb060', .4 * p * lit)); sp.addColorStop(1, 'rgba(255,176,96,0)'); c.fillStyle = sp; c.fillRect(0, ty - 40, W, 640);
    const fw = 42 * p + 1; const wd = c.createLinearGradient(0, 0, W, 0); wd.addColorStop(0, '#6a4528'); wd.addColorStop(.5, '#8a5c34'); wd.addColorStop(1, '#58381f'); c.fillStyle = wd;
    c.fillRect(cx - bw / 2 - fw, cy - bh / 2 - fw, bw + 2 * fw, fw); c.fillRect(cx - bw / 2 - fw, cy + bh / 2, bw + 2 * fw, fw); c.fillRect(cx - bw / 2 - fw, cy - bh / 2, fw, bh); c.fillRect(cx + bw / 2, cy - bh / 2, fw, bh);
  }
  c.save(); c.beginPath(); c.rect(cx - bw / 2, cy - bh / 2, bw, bh); c.clip(); c.globalAlpha = .02 + .98 * lit; c.drawImage(inner, cx - bw / 2, cy - bh / 2, bw, bh); c.restore();
}
let INNER;
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  let i = SCENES.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = SCENES.length - 1;
  const SA = getScene(i), tgt = ctx;
  const dis = .28;
  // dissolve in from the previous scene
  if (i > 0 && t < SCENES[i].t0 + dis) { const P = getScene(i - 1); drawScene(tgt, P, t); drawOver(tgt, P, t); const TM = TMPC.getContext('2d'); drawScene(TM, SA, t); drawOver(TM, SA, t); tgt.globalAlpha = ss(seg(t, SCENES[i].t0, SCENES[i].t0 + dis)); tgt.setTransform(1, 0, 0, 1, 0, 0); tgt.drawImage(TMPC, 0, 0); tgt.globalAlpha = 1; }
  else { drawScene(tgt, SA, t); drawOver(tgt, SA, t); }
  if (tgt !== ctx) lampRoom(ctx, t, INNER);
  // vignette + subtitles
  ctx.setTransform(1, 0, 0, 1, 0, 0); const vg = ctx.createRadialGradient(540, 960, 520, 540, 960, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  drawSubs(t);
}
function drawOver(c, S, t) { if (S.over) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); S.over(c, t); c.restore(); } }
function drawSubs(t) {
  for (const [id, t0, d, txt] of VO) {
    const a = t0 - .1, b = t0 + d + .5; if (t < a || t > b) continue;
    const al = Math.min(seg(t, a, a + .2), 1 - seg(t, b - .3, b));
    ctx.save(); ctx.font = 'italic 600 46px "Cormorant Garamond"'; ctx.textAlign = 'center';
    const words = txt.split(' '), lines = []; let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > 920 && cur) { lines.push(cur); cur = w; } else cur = test; }
    lines.push(cur);
    lines.forEach((ln, i) => { const y = 1545 + (lines.length === 3 ? 0 : 28) + i * 58; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(0,0,0,${.85 * al})`; ctx.strokeText(ln, 540, y); ctx.shadowColor = `rgba(255,190,120,${.35 * al})`; ctx.shadowBlur = 14; ctx.fillStyle = `rgba(247,234,208,${.97 * al})`; ctx.fillText(ln, 540, y); });
    ctx.restore();
  }
}
let TMPC;
window.render = render;
window.TEXTS = () => [];
(async () => {
  for (const f of ['600 40px "IM Fell English SC"', 'italic 600 46px "Cormorant Garamond"', '400 40px "IM Fell English SC"']) await document.fonts.load(f);
  GRAIN = (() => { const g = mkc(256, 256), c = g.getContext('2d'), id = c.createImageData(256, 256), r = mulberry(3); for (let i = 0; i < id.data.length; i += 4) { const v = r(); id.data[i] = id.data[i + 1] = id.data[i + 2] = v < .5 ? 0 : 255; id.data[i + 3] = 18 + r() * 22; } c.putImageData(id, 0, 0); return ctx.createPattern(g, 'repeat'); })();
  TMPC = mkc(W, H); INNER = mkc(W, H);
  window.READY = true;
})();

