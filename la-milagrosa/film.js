// The Tomb in Havana (La Milagrosa): a 30-second paper-cut lightbox film, 1080x1920. Colón Cemetery's marble under the moon; the knocking husband; the legend of the baby in her arms. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70, TAU = Math.PI * 2;
window.DUR = 30.5;

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
  ['v01', 0.6, 3.585, "In Havana's Colón Cemetery lies Amelia Goyri."],
  ['v02', 4.6, 4.981, "After her death, her grieving husband would knock on her tomb… as though he could wake her."],
  ['v03', 10.1, 2.547, "But here's where the legend turns chilling."],
  ['v04', 13.2, 2.666, "They say her baby was buried at her feet."],
  ['v05', 16.4, 6.498, "When the tomb was opened years later, Amelia's body was untouched… And the baby was now in her arms."],
  ['v06', 23.6, 4.678, "A mother's love beyond death… or a story the living couldn't bear to let go?"],
];
const warp = t => t;

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
const frontBand = (col, seed) => Ly(c => ground(c, 1505, seed), col, 1, { rimA: .25 });

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

// ---------- 1518 helpers (poly0/cutOn/blob/flick/bloom/strip come from the engine above) ----------
const SHOE = '#e0402c';
// an animated dancer silhouette; o.man, o.tired (0..1), o.ph phase, o.sp speed, o.col, o.a alpha, o.fall (0..1 collapse)
function dancer(c, x, y, k, t, o = {}) {
  const ph = o.ph || 0, sp = o.sp || 1, tr = o.tired || 0, w = t * 5.4 * sp * (1 - .55 * tr) + ph;
  const bob = Math.abs(Math.sin(w)) * 16 * (1 - tr * .8), sway = Math.sin(w * .5) * .2 * (1 - tr * .6) + (o.lean || 0) + tr * .18 * Math.sign(Math.sin(ph + 1) || 1);
  const fall = o.fall || 0;
  c.save(); c.globalAlpha = o.a ?? 1; c.translate(x, y - bob * k * (1 - fall)); c.rotate(lerp(sway * .55, -1.45, ss(fall))); c.scale(k * (o.flip || 1), k);
  const col = o.col || '#0c0806'; c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  const arm = (s, a) => { const sx = s * 22, sy = -190, ex = sx + s * Math.sin(a) * 56, ey = sy + Math.cos(a) * 56, a2 = a + .5 * Math.sin(w + s), hx = ex + s * Math.sin(a2) * 52, hy = ey + Math.cos(a2) * 52; c.lineWidth = 13; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke(); c.beginPath(); c.arc(hx, hy, 8, 0, TAU); c.fill(); };
  const up = 1 - tr;
  arm(-1, lerp(.35, 2.3, up) + Math.sin(w + .4) * .7 * up); arm(1, lerp(.3, 2.1, up) + Math.sin(w + 2.1) * .8 * up);
  if (o.man) {
    for (const s of [-1, 1]) { const kx = s * 16 + Math.sin(w + (s > 0 ? 0 : Math.PI)) * 22 * up, fx = s * 18 + Math.sin(w + (s > 0 ? 0 : Math.PI)) * 34 * up; c.lineWidth = 17; c.beginPath(); c.moveTo(s * 12, -106); c.lineTo(kx, -54); c.lineTo(fx, -4); c.stroke(); c.beginPath(); c.ellipse(fx + s * 9, -3, 15, 7, 0, 0, TAU); c.fill(); }
    blob(c, [[-24, -204], [24, -204], [34, -98], [-34, -98]]);
    c.beginPath(); c.ellipse(0, -258, 46, 8, 0, 0, TAU); c.fill(); c.fillRect(-24, -292, 48, 36);   // brimmed hat
  } else {
    const s1 = Math.sin(w) * 26 * up, s2 = Math.sin(w + 1.2) * 16 * up;
    blob(c, [[-20, -204], [20, -204], [18, -140], [56 + s1, -14], [26 + s2, 4], [-22 + s2, 6], [-56 + s1, -12], [-18, -140]]);   // flaring skirt
    if (o.shoes !== false) { const fx1 = -18 + Math.sin(w) * 20 * up, fx2 = 20 - Math.sin(w) * 20 * up, lift = Math.max(0, Math.sin(w)) * 16 * up; c.save(); c.fillStyle = SHOE; c.shadowColor = SHOE; c.shadowBlur = 14; c.beginPath(); c.ellipse(fx1, 6 - lift, 15, 7, 0, 0, TAU); c.ellipse(fx2, 8, 15, 7, 0, 0, TAU); c.fill(); c.restore(); }
    blob(c, [[-30, -230], [0, -270], [30, -230], [26, -200], [-26, -200]]);   // coif / kerchief
  }
  c.fillRect(-7, -214, 14, 16); c.beginPath(); c.ellipse(0, -234, 24, 28, 0, 0, TAU); c.fill();
  c.restore();
}
// a pale paper skeleton (the danse macabre), animated
function skel(c, x, y, k, t, ph = 0) {
  const w = t * 5 + ph, bob = Math.abs(Math.sin(w)) * 14; c.save(); c.translate(x, y - bob * k); c.rotate(Math.sin(w * .5) * .16); c.scale(k, k);
  c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(22px)'; c.fillStyle = 'rgba(230,225,200,.18)'; c.beginPath(); c.ellipse(0, -150, 90, 170, 0, 0, TAU); c.fill(); c.restore();
  const B = '#efe7cf'; c.strokeStyle = B; c.fillStyle = B; c.lineCap = 'round';
  const bone = (x0, y0, x1, y1, lw = 10) => { c.lineWidth = lw; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  bone(0, -200, 0, -100, 8); for (let i = 0; i < 4; i++) { c.lineWidth = 6; c.beginPath(); c.ellipse(0, -186 + i * 18, 34 - i * 4, 9, 0, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
  blob(c, [[-28, -104], [28, -104], [20, -80], [-20, -80]]);
  const lg = Math.sin(w) * 26; bone(-14, -86, -26 + lg, -44, 9); bone(-26 + lg, -44, -22 + lg * 1.4, -2, 9); bone(14, -86, 26 - lg, -44, 9); bone(26 - lg, -44, 22 - lg * 1.4, -2, 9);
  const aa = Math.sin(w + 1) * .5; bone(-26, -194, -70, -240 + aa * 30, 9); bone(-70, -240 + aa * 30, -84, -300 + aa * 40, 8); bone(26, -194, 74, -176 - aa * 20, 9); bone(74, -176 - aa * 20, 116, -214 - aa * 30, 8);
  c.beginPath(); c.ellipse(0, -236, 26, 30, 0, 0, TAU); c.fill();
  c.fillStyle = '#1a0c0a'; c.beginPath(); c.ellipse(-10, -240, 7, 8, 0, 0, TAU); c.ellipse(10, -240, 7, 8, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -224, 3, 5, 0, 0, TAU); c.fill(); c.fillRect(-10, -213, 20, 3);
  c.restore();
}
// Strasbourg rooftops: half-timbered houses with steep gables; windows are cut holes, lit from behind
function townRow(seed, base, x0, x1, hmin, hmax) { const R = mulberry(seed), H_ = []; let x = x0; while (x < x1) { const w = 110 + R() * 90, h = hmin + R() * (hmax - hmin); H_.push({ x, w, h, base, lit: [R() > .4, R() > .5, R() > .45, R() > .6] }); x += w + 4; } return H_; }
function drawRow(c, row) { for (const h of row) { const top = h.base - h.h; c.fillRect(h.x, top, h.w, h.h + 400); poly0(c, [[h.x - 8, top + 2], [h.x + h.w / 2, top - h.w * .78], [h.x + h.w + 8, top + 2]]); c.fill(); c.fillRect(h.x + h.w * .62, top - h.w * .62, 16, 40); }
  hole(c, c2 => { for (const h of row) { const top = h.base - h.h; winRects(h).forEach(([x, y, w, hh]) => c2.fillRect(x, y, w, hh)); c2.beginPath(); c2.arc(h.x + h.w / 2, top - h.w * .3, 9, 0, TAU); c2.fill(); } }); }
function winRects(h) { const top = h.base - h.h, out = [], fl = Math.max(2, Math.floor(h.h / 110)); for (let f = 0; f < fl; f++) for (const u of [.28, .72]) out.push([h.x + u * h.w - 13, top + 30 + f * 104, 26, 44]); return out; }
function rowBack(c, row, col, a, t, heads) { c.save(); for (const h of row) { winRects(h).forEach(([x, y, w, hh], i) => { if (!h.lit[i % 4]) return; c.fillStyle = rgba(col, a * flick(t + i + h.x)); c.fillRect(x - 2, y - 2, w + 4, hh + 4); if (heads && i % 3 === 0) { c.fillStyle = '#0c0806'; c.beginPath(); c.ellipse(x + w / 2, y + hh - 6, 9, 11, 0, 0, TAU); c.fill(); c.fillRect(x + w / 2 - 12, y + hh - 4, 24, 10); } }); c.fillStyle = rgba(col, a); c.beginPath(); c.arc(h.x + h.w / 2, h.base - h.h - h.w * .3, 11, 0, TAU); c.fill(); } c.restore(); }
// Strasbourg cathedral: the west front with its rose window and the single north spire
function cathedral(c, x, base, s) { c.fillRect(x - 130 * s, base - 560 * s, 260 * s, 560 * s + 400); c.fillRect(x - 130 * s, base - 780 * s, 96 * s, 230 * s);
  poly0(c, [[x - 140 * s, base - 780 * s], [x - 24 * s, base - 780 * s], [x - 52 * s, base - 960 * s], [x - 82 * s, base - 1180 * s], [x - 112 * s, base - 960 * s]]); c.fill(); c.fillRect(x - 85 * s, base - 1240 * s, 6 * s, 70 * s);
  for (const dx of [-120, -40, 40, 120]) { poly0(c, [[x + dx * s - 9 * s, base - 556 * s], [x + dx * s, base - 600 * s], [x + dx * s + 9 * s, base - 556 * s]]); c.fill(); }
  hole(c, c2 => { c2.beginPath(); c2.arc(x, base - 360 * s, 52 * s, 0, TAU); c2.fill(); for (const dx of [-90, 90]) { archPath(c2, x + dx * s, base - 470 * s, 24 * s, 120 * s); c2.fill(); } archPath(c2, x - 82 * s, base - 760 * s, 22 * s, 110 * s); c2.fill(); archPath(c2, x, base - 140 * s, 70 * s, 140 * s); c2.fill(); }); }
function cathBack(c, x, base, s, col, a) { c.save(); c.fillStyle = rgba(col, a); c.beginPath(); c.arc(x, base - 360 * s, 54 * s, 0, TAU); c.fill(); for (const dx of [-90, 90]) { archPath(c, x + dx * s, base - 470 * s, 26 * s, 124 * s); c.fill(); } archPath(c, x - 82 * s, base - 760 * s, 24 * s, 114 * s); c.fill(); archPath(c, x, base - 140 * s, 72 * s, 144 * s); c.fill(); c.restore(); }
function sunDisc(c, x, y, r, col, a = 1) { bloom(c, c2 => { c2.beginPath(); c2.arc(x, y, r * 1.25, 0, TAU); c2.fill(); }, col, .55 * a, 40); c.save(); c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); }
const starPath = (c, cx, cy, r, n = 5) => { c.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * .42 : r; i ? c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } c.closePath(); };
const haze = (y0, y1, col, a) => Ly(c => { }, '#000', .85, { raw: true, front: c => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(col, 0)); g.addColorStop(.55, rgba(col, a * .6)); g.addColorStop(1, rgba(col, a)); c.fillStyle = g; c.fillRect(-OFF, y0, W + 2 * OFF, y1 - y0); } });
const night = (c, a) => { if (a <= 0) return; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(8,10,30,${a})`; c.fillRect(0, 0, W, H); c.restore(); };

// ---------- Mazorra helpers (engine + 1518 helpers above: dancer, haze, night, sunDisc, cloudBand ...) ----------
const ICE = '#bfe0f2', INK2 = '#070b12', CANDLE = '#ffc46a';
// the hospital: a long neoclassical block with a columned portico and arched windows (holes, lit from behind)
function hospWins(x, base, s) { const o = []; for (const sg of [-1, 1]) for (const u of [0, 1, 2]) for (const r of [0, 1]) o.push([x + sg * (290 + u * 70) * s, base - (360 - r * 170) * s, 38 * s, 112 * s]); return o; }
function colGaps(x, base, s) { const o = []; for (let i = 0; i < 5; i++) { const c0 = x - 185 * s + i * 74 * s; o.push([c0 + 14 * s, base - 388 * s, 46 * s, 388 * s]); } return o; }
function hospital(c, x, base, s) {
  c.fillRect(x - 470 * s, base - 400 * s, 940 * s, 400 * s + 500); c.fillRect(x - 482 * s, base - 414 * s, 964 * s, 18 * s);
  c.fillRect(x - 232 * s, base - 476 * s, 464 * s, 80 * s); poly0(c, [[x - 254 * s, base - 470 * s], [x, base - 596 * s], [x + 254 * s, base - 470 * s]]); c.fill();
  for (let i = 0; i < 26; i++) c.fillRect(x - 470 * s + i * 36.6 * s, base - 446 * s, 14 * s, 34 * s);   // balustrade
  hole(c, c2 => { for (const [wx, wy, ww, wh] of hospWins(x, base, s)) { archPath(c2, wx, wy, ww, wh); c2.fill(); } for (const [gx, gy, gw, gh] of colGaps(x, base, s)) c2.fillRect(gx, gy, gw, gh); c2.beginPath(); c2.arc(x, base - 528 * s, 22 * s, 0, TAU); c2.fill(); });
}
function hospBack(c, x, base, s, t, col = '#9cc4de', a = .55) { c.save(); hospWins(x, base, s).forEach(([wx, wy, ww, wh], i) => { const on = (i * 7) % 3 !== 0; c.fillStyle = rgba(col, on ? a * (.75 + .25 * Math.sin(t * 2.1 + i * 1.7)) : a * .15); archPath(c, wx, wy, ww + 2, wh + 2); c.fill(); });
  c.fillStyle = rgba('#5a7a96', .5); for (const [gx, gy, gw, gh] of colGaps(x, base, s)) c.fillRect(gx, gy, gw, gh); c.fillStyle = rgba(col, .7); c.beginPath(); c.arc(x, base - 528 * s, 24 * s, 0, TAU); c.fill(); c.restore(); }
// a royal palm bending in the cold wind (animated)
function palm(c, x, base, h, t, k = 1, wind = 1) { const sw = Math.sin(t * 1.3 + x * .01) * 18 * wind + 30 * wind, tx = x + sw * k, ty = base - h;
  c.save(); c.lineCap = 'round'; c.lineWidth = 20 * k; c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + sw * .3 * k, base - h * .5, tx, ty); c.stroke();
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * .42 + .35 * wind + Math.sin(t * 2.4 + i) * .1 * wind, l = 150 * k; c.lineWidth = 11 * k; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * l * .6, ty + Math.sin(a) * l * .6 - 20 * k, tx + Math.cos(a + .5) * l, ty + Math.sin(a + .5) * l + 30 * k); c.stroke(); } c.restore(); }
function capitolio(c, x, base, s) { c.fillRect(x - 330 * s, base - 110 * s, 660 * s, 110 * s + 400); c.fillRect(x - 120 * s, base - 210 * s, 240 * s, 110 * s); c.fillRect(x - 80 * s, base - 300 * s, 160 * s, 100 * s);
  c.beginPath(); c.ellipse(x, base - 300 * s, 84 * s, 150 * s, 0, Math.PI, TAU); c.fill(); c.fillRect(x - 14 * s, base - 500 * s, 28 * s, 60 * s); poly0(c, [[x - 6 * s, base - 500 * s], [x, base - 540 * s], [x + 6 * s, base - 500 * s]]); c.fill();
  hole(c, c2 => { for (let i = 0; i < 9; i++) c2.fillRect(x - 110 * s + i * 25 * s, base - 196 * s, 12 * s, 80 * s); for (let i = 0; i < 6; i++) c2.fillRect(x - 70 * s + i * 25 * s, base - 286 * s, 10 * s, 64 * s); }); }
// an iron hospital bed, side view; o.fig = alpha of a huddled, shivering patient (no face is ever shown)
function ironBed(c, x, base, k, t, o = {}) { c.save(); c.translate(x, base); c.scale(k * (o.flip || 1), k); c.fillStyle = o.col || INK2; c.strokeStyle = o.col || INK2;
  c.fillRect(-150, -172, 9, 172); c.fillRect(-112, -172, 6, 98); c.fillRect(-150, -176, 46, 8); for (const bx of [-138, -126]) c.fillRect(bx, -170, 4, 90);
  c.fillRect(140, -122, 9, 122); c.fillRect(106, -122, 6, 50); c.fillRect(104, -126, 46, 7); c.fillRect(-150, -84, 300, 16); c.fillRect(-150, -60, 300, 5);
  const f = o.fig ?? 1; if (f > 0) { c.globalAlpha = f; const sh = Math.sin(t * 38 + x) * 1.6; c.translate(sh, 0);
    blob(c, [[-34, -84], [34, -84], [40, -118], [22, -168], [-16, -176], [-38, -130]]); blob(c, [[6, -112], [62, -116], [68, -88], [16, -84]]); c.beginPath(); c.arc(-4, -194, 23, 0, TAU); c.fill(); }
  c.restore(); }
function breath(c, x, y, t, ph, k = 1) { for (let j = 0; j < 3; j++) { const u = ((t * .55 + ph + j / 3) % 1); c.save(); c.globalAlpha = .28 * Math.sin(Math.PI * u); c.fillStyle = ICE; c.beginPath(); c.ellipse(x + u * 40 * k, y - u * 70 * k, (8 + u * 22) * k, (6 + u * 14) * k, 0, 0, TAU); c.fill(); c.restore(); } }
function windStreaks(c, t, n, y0, y1, a = .25, seed = 3) { const R = mulberry(seed); c.save(); c.strokeStyle = ICE; c.lineCap = 'round'; for (let i = 0; i < n; i++) { const sp = 500 + R() * 600, y = y0 + R() * (y1 - y0), ph = R() * 2000, x = ((t * sp + ph) % (W + 600)) - 300, l = 60 + R() * 140; c.globalAlpha = a * (.4 + .6 * R()); c.lineWidth = 1.5 + R() * 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l * .5, y - 8, x + l, y + 4); c.stroke(); } c.restore(); }
function candleRow(c, t, n, y, x0, x1, t0, dt, k = 1) { for (let i = 0; i < n; i++) { const lt = t - (t0 + i * dt); if (lt < 0) continue; const x = lerp(x0, x1, n > 1 ? i / (n - 1) : .5), on = ss(clamp(lt / .35)), fl = 1 + .12 * Math.sin(t * 13 + i * 2.3) * Math.sin(t * 5 + i);
  c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y - 30 * k, 1, x, y - 30 * k, 90 * k); g.addColorStop(0, rgba(CANDLE, .26 * on)); g.addColorStop(1, rgba(CANDLE, 0)); c.fillStyle = g; c.fillRect(x - 90 * k, y - 120 * k, 180 * k, 180 * k); c.restore();
  c.fillStyle = '#e9dcc0'; c.fillRect(x - 7 * k, y - 22 * k, 14 * k, 34 * k); c.fillStyle = rgba('#ffd98a', on); c.beginPath(); c.ellipse(x, y - 34 * k, 5 * k, 13 * k * fl * on + .1, 0, 0, TAU); c.fill(); } }

// ---------- Cementerio Lindo helpers ----------
const MOON = '#e8eef0', GHOST = '#cfe6ee', MARI = '#ff9a2a';
const NAMES = ['MARÍA', 'JOSÉ', 'GUADALUPE', 'FRANCISCO', 'ROSA', 'MANUEL', 'CARMEN', 'ANTONIO', 'DOLORES', 'JUAN', 'ELENA', 'RAMÓN', 'LUZ', 'PEDRO', 'TERESA', 'JESÚS', 'ANA', 'MIGUEL'];
function saguaro(c, x, base, h, s = 1) { c.save(); c.lineCap = 'round'; c.strokeStyle = c.fillStyle; c.lineWidth = 30 * s; c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - h); c.stroke();
  c.lineWidth = 20 * s; c.beginPath(); c.moveTo(x, base - h * .45); c.quadraticCurveTo(x - 60 * s, base - h * .45, x - 60 * s, base - h * .75); c.stroke(); c.beginPath(); c.moveTo(x, base - h * .6); c.quadraticCurveTo(x + 54 * s, base - h * .6, x + 54 * s, base - h * .88); c.stroke(); c.restore(); }
function camelback(c, base) { c.beginPath(); c.moveTo(-OFF, base); c.lineTo(-OFF, base - 60); c.quadraticCurveTo(140, base - 150, 300, base - 120); c.quadraticCurveTo(420, base - 300, 560, base - 250); c.quadraticCurveTo(640, base - 200, 700, base - 150); c.quadraticCurveTo(820, base - 200, 900, base - 110); c.lineTo(W + OFF, base - 70); c.lineTo(W + OFF, base); c.closePath(); c.fill(); }
// a grave marker: 0 wooden cross, 1 round-topped stone, 2 small flat stone, 3 leaning broken cross
function marker(c, x, base, s, kind, tilt = 0) { c.save(); c.translate(x, base); c.rotate(tilt); c.scale(s, s);
  if (kind === 0 || kind === 3) { c.fillRect(-7, -120, 14, 120); c.fillRect(-34, -94, 68, 13); if (kind === 3) c.fillRect(-34, -94, 30, 13); }
  else if (kind === 1) { c.beginPath(); c.moveTo(-36, 0); c.lineTo(-36, -70); c.arc(0, -70, 36, Math.PI, 0); c.lineTo(36, 0); c.closePath(); c.fill(); }
  else { c.fillRect(-40, -34, 80, 34); }
  c.beginPath(); c.ellipse(0, 2, 56, 12, 0, 0, TAU); c.fill(); c.restore(); }
// a field of graves receding into the dark: rows scale with depth; returns marker records for later effects
function graveField(seed, y0, y1, rows, x0 = -60, x1 = W + 60) { const R = mulberry(seed), out = []; for (let r = 0; r < rows; r++) { const u = r / (rows - 1), y = lerp(y0, y1, u * u), s = lerp(.35, 1.25, u * u), gap = 150 * s; for (let x = x0 + R() * gap; x < x1; x += gap * (.75 + R() * .6)) out.push({ x, y, s, kind: R() < .45 ? 0 : R() < .5 ? 1 : R() < .6 ? 2 : 3, tilt: (R() - .5) * .3, name: NAMES[Math.floor(R() * NAMES.length)], r }); } return out; }
function drawField(c, F) { for (const m of F) marker(c, m.x, m.y, m.s, m.kind, m.tilt); }
function dust(c, t, n, seed, a = .5) { const R = mulberry(seed); c.save(); c.fillStyle = MOON; for (let i = 0; i < n; i++) { const sp = 10 + R() * 30, x = ((R() * W + t * sp * (R() > .5 ? 1 : -.6)) % (W + 40) + W + 40) % (W + 40) - 20, y = (R() * 1500 + Math.sin(t * .7 + i) * 30), r = .8 + R() * 2.2; c.globalAlpha = a * (.25 + .75 * R()) * (.6 + .4 * Math.sin(t * 2 + i)); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } c.restore(); }
function mist(c, t, y, a = .3, col = '#a8bcc8') { c.save(); for (let i = 0; i < 4; i++) { const x = ((t * (18 + i * 6) + i * 400) % (W + 900)) - 450; const g = c.createRadialGradient(x, y + i * 30, 10, x, y + i * 30, 520); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - 520, y - 300, 1040, 640); } c.restore(); }
// a pale spirit of light rising from a grave; a 0..1
function spirit(c, x, y, k, a, t, ph = 0) { if (a <= 0) return; const sw = Math.sin(t * 1.3 + ph) * 14; c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = a;
  c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(26px)'; c.fillStyle = 'rgba(180,220,235,.35)'; c.beginPath(); c.ellipse(sw * .5, -150, 70, 170, 0, 0, TAU); c.fill(); c.restore();
  c.globalAlpha = a * .8; const gb = c.createLinearGradient(0, -300, 0, 40); gb.addColorStop(0, 'rgba(215,236,244,.95)'); gb.addColorStop(.6, 'rgba(200,228,238,.55)'); gb.addColorStop(1, 'rgba(200,228,238,0)'); c.fillStyle = gb; blob(c, [[-20 + sw, -250], [20 + sw, -250], [34 + sw * .7, -150], [40, -40], [18 + sw * -.6, 30], [0, -10], [-22 + sw * -.6, 34], [-40, -40], [-34 + sw * .7, -150]]);
  c.fillStyle = 'rgba(220,238,245,.9)'; c.beginPath(); c.ellipse(sw, -280, 22, 26, 0, 0, TAU); c.fill(); const fg = c.createRadialGradient(sw, -278, 2, sw, -278, 20); fg.addColorStop(0, 'rgba(14,22,34,.7)'); fg.addColorStop(1, 'rgba(14,22,34,0)'); c.fillStyle = fg; c.beginPath(); c.ellipse(sw, -278, 15, 19, 0, 0, TAU); c.fill(); c.restore(); }
function floatName(c, txt, x, y, a, size = 34) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.font = `${size}px "IM Fell English SC"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = GHOST; c.shadowBlur = 18; c.fillStyle = '#e6f4f8'; c.fillText(txt, x, y); c.restore(); }
function marigolds(c, x, y, k, a, t) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y - 10 * k, 1, x, y - 10 * k, 70 * k); g.addColorStop(0, 'rgba(255,150,50,.45)'); g.addColorStop(1, 'rgba(255,150,50,0)'); c.fillStyle = g; c.fillRect(x - 70 * k, y - 80 * k, 140 * k, 140 * k); c.restore();
  const R = mulberry(Math.floor(x * 7 + y)); for (let i = 0; i < 7; i++) { const fx = x + (R() - .5) * 46 * k, fy = y - R() * 26 * k, r = (7 + R() * 5) * k; c.fillStyle = i % 2 ? '#ff8a1c' : '#ffb23a'; c.beginPath(); for (let p = 0; p < 10; p++) { const an = p / 10 * TAU, rr = r * (p % 2 ? .75 : 1); p ? c.lineTo(fx + Math.cos(an) * rr, fy + Math.sin(an) * rr) : c.moveTo(fx + rr, fy); } c.closePath(); c.fill(); } c.restore(); }
function ironGate(c, cx, base, w, h, open = 0) { c.save(); c.fillStyle = c.strokeStyle = '#05070b'; c.fillRect(cx - w / 2 - 40, base - h, 40, h + 300); c.fillRect(cx + w / 2, base - h, 40, h + 300); c.beginPath(); c.arc(cx - w / 2 - 20, base - h - 18, 24, 0, TAU); c.arc(cx + w / 2 + 20, base - h - 18, 24, 0, TAU); c.fill();
  c.lineWidth = 9; c.beginPath(); c.moveTo(cx - w / 2, base - h + 40); c.quadraticCurveTo(cx, base - h - 170, cx + w / 2, base - h + 40); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(cx - w / 2, base - h + 100); c.quadraticCurveTo(cx, base - h - 90, cx + w / 2, base - h + 100); c.stroke();
  for (const s of [-1, 1]) { c.save(); c.translate(cx + s * w / 2, 0); c.scale(lerp(1, .25, open), 1); for (let i = 1; i < 7; i++) { const x = -s * i * (w / 14); c.lineWidth = 5; c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - h + 70 + Math.abs(i - 7) * 4); c.stroke(); poly0(c, [[x - 8, base - h + 70], [x, base - h + 44], [x + 8, base - h + 70]]); c.fill(); } c.fillRect(-s * w / 2, base - h * .55, s * w / 2, 7); c.fillRect(Math.min(0, -s * w / 2), base - 40, w / 2, 7); c.restore(); }
  const sy = base - h - 140; c.lineWidth = 5; c.beginPath(); c.moveTo(cx - w * .42, sy + 40); c.lineTo(cx - w * .42, sy + 70); c.moveTo(cx + w * .42, sy + 40); c.lineTo(cx + w * .42, sy + 70); c.stroke(); c.fillRect(cx - w * .46, sy - 32, w * .92, 66); c.beginPath(); c.arc(cx - w * .46, sy, 33, Math.PI / 2, Math.PI * 1.5); c.arc(cx + w * .46, sy, 33, -Math.PI / 2, Math.PI / 2); c.fill();
  c.font = `600 ${Math.round(w / 11)}px "IM Fell English SC"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#cfdde4'; c.shadowColor = 'rgba(220,235,240,.6)'; c.shadowBlur = 8; c.fillText('CEMENTERIO LINDO', cx, sy + 2); c.restore(); }

// ---------- La Milagrosa helpers ----------
const MARBLE = '#e4e2dc', ROSE = '#d8344a', BRASS = '#d9b064';
function chapelDome(c, x, base, s) { c.fillRect(x - 150 * s, base - 260 * s, 300 * s, 260 * s + 400); c.fillRect(x - 100 * s, base - 380 * s, 200 * s, 130 * s);
  c.beginPath(); c.ellipse(x, base - 380 * s, 104 * s, 150 * s, 0, Math.PI, TAU); c.fill(); c.fillRect(x - 16 * s, base - 590 * s, 32 * s, 70 * s); c.fillRect(x - 4 * s, base - 650 * s, 8 * s, 60 * s); c.fillRect(x - 20 * s, base - 630 * s, 40 * s, 8 * s);
  poly0(c, [[x - 170 * s, base - 255 * s], [x, base - 330 * s], [x + 170 * s, base - 255 * s]]); c.fill();
  hole(c, c2 => { for (let i = 0; i < 5; i++) c2.fillRect(x - 120 * s + i * 52 * s, base - 230 * s, 24 * s, 210 * s); for (let i = 0; i < 4; i++) c2.fillRect(x - 76 * s + i * 46 * s, base - 360 * s, 16 * s, 90 * s); }); }
function angel(c, x, base, s, flip = 1) { c.save(); c.translate(x, base); c.scale(s * flip, s); c.fillRect(-46, -120, 92, 120); c.fillRect(-56, -130, 112, 14);
  blob(c, [[-22, -330], [22, -330], [30, -230], [40, -130], [-40, -130], [-30, -230]]); c.beginPath(); c.ellipse(0, -356, 18, 22, 0, 0, TAU); c.fill();
  blob(c, [[10, -320], [70, -400], [110, -380], [96, -300], [60, -240], [24, -250]]); blob(c, [[-10, -320], [-60, -380], [-80, -350], [-60, -280], [-26, -250]]);
  c.lineCap = 'round'; c.strokeStyle = c.fillStyle; c.lineWidth = 12; c.beginPath(); c.moveTo(-18, -310); c.lineTo(-44, -360); c.lineTo(-40, -420); c.stroke(); c.restore(); }
function mausoleum(c, x, base, w, h) { c.fillRect(x - w / 2, base - h, w, h + 400); poly0(c, [[x - w / 2 - 12, base - h], [x, base - h - w * .45], [x + w / 2 + 12, base - h]]); c.fill(); c.fillRect(x - 4, base - h - w * .45 - 50, 8, 50); c.fillRect(x - 16, base - h - w * .45 - 36, 32, 7);
  hole(c, c2 => { archPath(c2, x, base - h * .7, w * .32, h * .7); c2.fill(); }); }
// the marble statue of La Milagrosa: a woman holding a great cross, a baby in her arm
function milagrosa(c, x, base, s, t) { c.save(); c.translate(x, base); c.scale(s, s); c.fillStyle = MARBLE;
  c.fillRect(-110, -160, 220, 160); c.fillRect(-126, -176, 252, 20); c.fillRect(-96, -16, 192, 16);
  blob(c, [[-34, -520], [34, -520], [46, -420], [70, -230], [80, -176], [-80, -176], [-66, -240], [-46, -420]]); blob(c, [[-46, -540], [-36, -580], [0, -604], [36, -580], [46, -540], [40, -470], [-40, -470]]);
  c.beginPath(); c.ellipse(0, -566, 24, 30, 0, 0, TAU); c.fill(); c.fillRect(-82, -700, 18, 520); c.fillRect(-124, -620, 102, 16);       // the cross
  blob(c, [[6, -470], [62, -480], [80, -440], [50, -410], [4, -420]]); c.beginPath(); c.arc(70, -470, 15, 0, TAU); c.fill();         // the baby in her arm
  c.fillStyle = 'rgba(80,70,64,.35)'; c.fillRect(-60, -110, 120, 3); c.font = '22px "IM Fell English SC"'; c.textAlign = 'center'; c.fillText('AMELIA GOYRI', 0, -78); c.restore(); }
function knocker(c, x, y, r, swing) { c.save(); c.strokeStyle = BRASS; c.lineWidth = r * .28; c.shadowColor = BRASS; c.shadowBlur = 8; c.beginPath(); c.arc(x, y - r * .2, r * .25, 0, TAU); c.stroke(); c.translate(x, y); c.rotate(swing); c.beginPath(); c.arc(0, r, r, 0, TAU); c.stroke(); c.restore(); }
function roses(c, x, y, k, a) { if (a <= 0) return; c.save(); c.globalAlpha = a; const R = mulberry(Math.round(x * 3 + y)); c.strokeStyle = '#1f3a20'; c.lineWidth = 3 * k;
  for (let i = 0; i < 9; i++) { const fx = x + (R() - .5) * 90 * k, fy = y - (20 + R() * 60) * k; c.beginPath(); c.moveTo(x + (R() - .5) * 20 * k, y); c.lineTo(fx, fy); c.stroke(); c.fillStyle = i % 3 ? ROSE : '#f0607a'; c.shadowColor = ROSE; c.shadowBlur = 10; c.beginPath(); c.arc(fx, fy, (8 + R() * 5) * k, 0, TAU); c.fill(); c.shadowBlur = 0; c.fillStyle = 'rgba(90,10,24,.6)'; c.beginPath(); c.arc(fx + 2 * k, fy - 1 * k, 4 * k, 0, TAU); c.fill(); } c.restore(); }
function suitor(c, x, y, k, raise, back = 0) { c.save(); c.translate(x, y); c.scale(k * (back ? -1 : 1), k); c.fillStyle = c.strokeStyle = '#05060a'; c.lineCap = 'round';
  c.lineWidth = 17; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 12, -104); c.lineTo(s * 16, -4); c.stroke(); }
  poly0(c, [[-28, -206], [28, -206], [38, -96], [-38, -96]]); c.fill(); c.fillRect(-7, -218, 14, 16); c.beginPath(); c.ellipse(0, -238, 23, 27, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(0, -258, 40, 8, 0, 0, TAU); c.fill(); c.fillRect(-24, -292, 48, 34);
  c.lineWidth = 13; const a = lerp(.2, 2.2, raise); c.beginPath(); c.moveTo(24, -190); c.lineTo(24 + Math.sin(a) * 60, -190 + Math.cos(a) * 60); c.lineTo(24 + Math.sin(a) * 60 + 50, -190 + Math.cos(a) * 60 - 20 * raise); c.stroke(); c.beginPath(); c.moveTo(-24, -190); c.lineTo(-30, -110); c.stroke(); c.restore(); }
function earthCut(c, y0) { c.fillRect(-OFF, y0, W + 2 * OFF, H); }

// ======================================================= SCENES =======================================================
const NIGHTH = (mx, my, top = '#070a16', bot = '#2c3450') => Ly(SK(top, bot, [{ x: mx, y: my, r: 640, col: 'rgba(225,230,236,.45)' }]), '#000', 0, { raw: true, front: c => sunDisc(c, mx, my, 80, '#eef0f2', .95) });
// 1 · COLÓN CEMETERY — marble angels and the domed chapel under the moon
addScene(0, 4.6, () => {
  const sky = NIGHTH(760, 380);
  const far = Ly(c => { chapelDome(c, 540, 1180, 1.05); for (const [x, w, h] of [[150, 120, 170], [300, 90, 130], [790, 110, 160], [950, 130, 190]]) mausoleum(c, x, 1180, w, h); }, '#10131e', .3, { rimA: .35, rim: '#e8e6e0' });
  far.back = c => { c.fillStyle = 'rgba(200,205,215,.4)'; c.fillRect(380, 900, 320, 280); };
  const angels = Ly(c => { angel(c, 210, 1370, 1.1, 1); angel(c, 880, 1370, 1.25, -1); c.fillRect(-OFF, 1360, W + 2 * OFF, 600); }, '#c9cbcf', .65, { rimA: .3, rim: '#ffffff', glow: { x: 760, y: 380, r: 900, col: '#ffffff', a: .3 } });
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = c.strokeStyle = '#04050a'; palm(c, 40, 1500, 700, t, 1.1, .3); palm(c, 1050, 1500, 640, t, 1.0, .3); mist(c, t, 1300, .08); dust(c, t, 40, 61, .35); } });
  return { layers: [sky, far, haze(1000, 1400, '#7a8296', .3), angels, fg, frontBand('#04050a', 3)], cam: t => ({ x: 0, y: lerp(20, 0, ss(seg(t, 0, 4.6))), z: lerp(1.0, 1.08, ss(seg(t, 0, 4.6))) }),
    over: (c, t) => { strip(c, t, .1, .8, 'PLOT TWIST WITH A&R  ·  EPISODE 22', 540, 150, 30, { col: '#ece8e0', font: 'Cormorant Garamond', t1: 4.5 }); strip(c, t, .4, 1.0, 'THE TOMB IN HAVANA', 540, 290, 64, { col: '#f4f0e8', t1: 4.5 }); strip(c, t, 1.5, .9, 'LA MILAGROSA', 540, 400, 46, { col: '#ffd2d8', t1: 4.5 }); } };
});
// 2 · HE KNOCKS — her grieving husband lifts the iron ring on her tomb
addScene(4.6, 10.1, () => {
  const sky = NIGHTH(300, 420, '#070a16', '#262c44');
  const far = Ly(c => { for (const [x, w, h] of [[640, 150, 240], [880, 120, 200]]) mausoleum(c, x, 1060, w, h); angel(c, 140, 1060, .7); }, '#10131e', .3, { rimA: .35, rim: '#e8e6e0' });
  const tomb = Ly(c => { c.fillRect(160, 1110, 760, 360); c.fillRect(130, 1090, 820, 30); }, '#d4d2cc', .65, { rimA: .3, rim: '#ffffff', glow: { x: 300, y: 420, r: 1100, col: '#ffffff', a: .25 } });
  const act = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => {
    const kn = [2.0, 2.9, 3.8].map(d => 4.6 + d), hit = Math.max(0, ...kn.map(k => 1 - Math.abs(t - k) / .14)), lift = Math.max(...kn.map(k => ss(seg(t, k - .45, k - .12)) * (t < k ? 1 : 0)));
    for (const [x, i] of [[300, 0], [430, 1], [650, 2], [780, 3]]) knocker(c, x, 1180, 22, i === 1 ? -lift * .9 : 0);
    if (hit > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,230,180,${hit * .5})`; c.beginPath(); c.arc(430, 1220, 60, 0, TAU); c.fill(); c.restore(); }
    const back = ss(seg(t, 8.9, 10.1)); suitor(c, lerp(610, 860, back), 1470, 1.35, t > 6 && t < 8.9 ? lift : 0, 1);
    mist(c, t, 1350, .08); dust(c, t, 40, 63, .35); } });
  return { layers: [sky, far, haze(950, 1300, '#7a8296', .25), tomb, act, frontBand('#04050a', 5)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 4.6, 10.1))) }),
    over: (c, t) => strip(c, t, 5.0, .9, 'AMELIA GOYRI · 1901', 540, 230, 50, { col: '#f4f0e8', t1: 9.9 }) };
});
// 3 · THE LEGEND TURNS — closer on the sealed slab; the moon goes behind cloud
addScene(10.1, 13.2, () => {
  const sky = Ly(SK('#05070e', '#1a1e30'), '#000', 0, { raw: true, front: (c, t) => { sunDisc(c, 540, 460, 90, '#eef0f2', lerp(.9, .2, ss(seg(t, 10.4, 12.6)))); } });
  const clouds = Ly(c => cloudBand(c, 520, 71, 140), '#0c0f1a', .2, { rimA: .3, rim: '#c8ccd4' }); clouds.drift = 40;
  const slab = Ly(c => { c.fillRect(60, 980, 960, 900); c.fillRect(30, 960, 1020, 30); }, '#cfcdc7', .7, { rimA: .3, rim: '#ffffff', front: (c, t) => { for (const x of [200, 400, 680, 880]) knocker(c, x, 1100, 30, 0); c.save(); c.fillStyle = 'rgba(70,64,60,.5)'; c.font = '44px "IM Fell English SC"'; c.textAlign = 'center'; c.fillText('AMELIA GOYRI DE ADOT', 540, 1260); c.font = '30px "IM Fell English SC"'; c.fillText('† 1901', 540, 1320); c.restore(); } });
  return { layers: [sky, clouds, slab, frontBand('#04050a', 7)], cam: t => ({ x: 0, y: lerp(0, -30, ss(seg(t, 10.1, 13.2))), z: lerp(1.0, 1.14, ss(seg(t, 10.1, 13.2))) }) };
});
// 4 · AT HER FEET — beneath the slab: her coffin, and a tiny coffin at her feet
addScene(13.2, 16.4, () => {
  const sky = Ly(SK('#05070e', '#141828'), '#000', 0, { raw: true });
  const ground = Ly(c => { c.fillRect(-OFF, 700, W + 2 * OFF, 1300); hole(c, c2 => { c2.fillRect(120, 940, 840, 380); }); }, '#14100c', .5, { rimA: .25, rim: '#c8b8a0' });
  ground.back = c => { const g = c.createLinearGradient(0, 940, 0, 1320); g.addColorStop(0, '#2a2420'); g.addColorStop(1, '#0e0b09'); c.fillStyle = g; c.fillRect(120, 940, 840, 380); };
  const slab = Ly(c => { c.fillRect(90, 640, 900, 70); }, '#d4d2cc', .6, { rimA: .3, rim: '#ffffff' });
  const coffins = Ly(c => { }, '#000', .85, { raw: true, front: (c, t) => { const a = ss(seg(t, 13.5, 14.4)); c.save(); c.globalAlpha = a; c.strokeStyle = '#d8ccb4'; c.lineWidth = 6; c.shadowColor = '#e8dcc4'; c.shadowBlur = 14;
    const cof = (x0, x1, y, h) => { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + (x1 - x0) * .25, y - h / 2); c.lineTo(x1, y - h * .35); c.lineTo(x1, y + h * .35); c.lineTo(x0 + (x1 - x0) * .25, y + h / 2); c.closePath(); c.stroke(); };
    cof(170, 700, 1130, 170); const b = ss(seg(t, 14.4, 15.3)); c.globalAlpha = a * b; cof(740, 900, 1130, 70); c.restore(); } });
  return { layers: [sky, ground, slab, coffins, frontBand('#04050a', 9)], cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.1, ss(seg(t, 13.2, 16.4))) }),
    over: (c, t) => strip(c, t, 14.3, .8, 'HER BABY AT HER FEET', 540, 300, 50, { col: '#f4f0e8', t1: 16.3 }) };
});
// 5 · OPENED YEARS LATER — the slab slides back, light pours in: untouched, and the baby in her arms
addScene(16.4, 23.6, () => {
  const sky = Ly(SK('#05070e', '#141828'), '#000', 0, { raw: true });
  const ground = Ly(c => { c.fillRect(-OFF, 700, W + 2 * OFF, 1300); hole(c, c2 => { c2.fillRect(120, 940, 840, 380); }); }, '#14100c', .5, { rimA: .25, rim: '#c8b8a0' });
  ground.back = (c, t) => { const o = ss(seg(t, 17.2, 19.0)), g = c.createLinearGradient(0, 940, 0, 1320); g.addColorStop(0, rgba('#8a7052', .25 + .45 * o)); g.addColorStop(1, rgba('#1c140e', .9)); c.fillStyle = g; c.fillRect(120, 940, 840, 380); };
  const slab = Ly(c => { }, '#000', .6, { raw: true, front: (c, t) => { const o = ss(seg(t, 17.2, 19.0)); c.save(); c.fillStyle = '#d4d2cc'; c.fillRect(90 + o * 760, 640, 900, 70); c.restore();
    if (o > 0) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, 0, 0, 1300); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(1, `rgba(255,240,210,${.16 * o})`); c.fillStyle = g; poly0(c, [[90, 0], [90 + o * 760, 0], [960, 1320], [120, 1320]]); c.fill(); c.restore(); } } });
  const her = Ly(c => { }, '#000', .85, { raw: true, front: (c, t) => { const a = ss(seg(t, 18.6, 20.0)); if (a <= 0) return; c.save(); c.globalAlpha = a;
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(30px)'; c.fillStyle = 'rgba(255,240,215,.35)'; c.beginPath(); c.ellipse(500, 1130, 380, 120, 0, 0, TAU); c.fill(); c.restore();
    c.fillStyle = '#f4ecdc'; c.shadowColor = '#fff0d0'; c.shadowBlur = 24; blob(c, [[230, 1100], [330, 1080], [600, 1080], [790, 1110], [800, 1150], [600, 1180], [330, 1180], [230, 1160]]); c.beginPath(); c.ellipse(210, 1128, 34, 30, 0, 0, TAU); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = 'rgba(60,44,30,.55)'; c.lineWidth = 3; for (const x of [380, 480, 580, 680]) { c.beginPath(); c.moveTo(x, 1086); c.quadraticCurveTo(x + 30, 1130, x + 10, 1176); c.stroke(); }
    c.fillStyle = '#2a2018'; c.beginPath(); c.ellipse(186, 1110, 38, 22, -.2, 0, Math.PI); c.fill();
    const b = ss(seg(t, 20.4, 21.6)); c.fillStyle = '#ffffff'; c.shadowColor = '#fff6e0'; c.shadowBlur = 30; c.globalAlpha = a * b; blob(c, [[320, 1050], [430, 1040], [450, 1090], [330, 1100]]); c.beginPath(); c.arc(306, 1060, 22, 0, TAU); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#f4ecdc'; c.lineWidth = 16; c.lineCap = 'round'; c.globalAlpha = a; c.beginPath(); c.moveTo(270, 1110); c.quadraticCurveTo(360, 1040, 450, 1080); c.stroke(); c.restore(); } });
  return { layers: [sky, ground, her, slab, frontBand('#04050a', 11)], cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.14, ss(seg(t, 16.4, 23.6))) }),
    over: (c, t) => { strip(c, t, 18.8, .8, 'UNTOUCHED', 540, 300, 54, { col: '#f4f0e8', t1: 21.0 }); strip(c, t, 21.2, .9, 'THE BABY IN HER ARMS', 540, 300, 52, { col: '#ffffff', t1: 23.5 }); } };
});
// 6 · LA MILAGROSA — her statue, fresh roses, the brass rings; love beyond death, or a story?
addScene(23.6, 30.5, () => {
  const sky = NIGHTH(820, 360, '#070a16', '#343a58');
  const far = Ly(c => { chapelDome(c, 860, 1180, .55); mausoleum(c, 150, 1180, 120, 180); }, '#10131e', .25, { rimA: .3, rim: '#e8e6e0' });
  const stat = Ly(c => { }, '#000', .75, { raw: true, front: (c, t) => { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(540, 900, 20, 540, 900, 600); g.addColorStop(0, 'rgba(235,230,220,.28)'); g.addColorStop(1, 'rgba(235,230,220,0)'); c.fillStyle = g; c.fillRect(0, 300, W, 1200); c.restore();
    milagrosa(c, 540, 1440, 1.35, t); for (const [x, i] of [[340, 0], [430, 1], [650, 2], [740, 3]]) knocker(c, x, 1300, 16, Math.sin(t * 1.4 + i) * .06);
    for (const [x, d] of [[220, 24.0], [330, 24.4], [760, 24.8], [870, 25.2], [470, 25.6], [620, 26.0]]) roses(c, x, 1462, 1.2, ss(seg(t, d, d + .6)));
    dust(c, t, 40, 67, .35); } });
  return { layers: [sky, far, haze(1000, 1400, '#7a8296', .25), stat, frontBand('#04050a', 13)], cam: t => ({ x: 0, y: 0, z: lerp(1.08, 1.0, ss(seg(t, 23.6, 30.5))) }),
    over: (c, t) => { strip(c, t, 24.2, .8, 'LOVE BEYOND DEATH?', 540, 170, 50, { col: '#ffd2d8', t1: 28.2 }); strip(c, t, 26.2, .9, "OR A STORY WE COULDN'T LET GO?", 540, 280, 36, { col: '#f4f0e8', t1: 28.2 }); strip(c, t, 28.6, .9, 'PLOT TWIST WITH A&R', 540, 230, 46, { col: '#f4f0e8', font: 'Cormorant Garamond' }); } };
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
function render(tn) {
  const t = warp(tn);
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
  drawSubs(tn); drawLogo();
}
function drawLogo() {   // a small A&R badge, top-right, on every frame
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = .82; ctx.fillStyle = 'rgba(8,12,18,.7)'; ctx.strokeStyle = 'rgba(230,240,244,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(1010, 70, 40, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.font = '600 30px "IM Fell English SC"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#eef6f8'; ctx.fillText('A&R', 1010, 72); ctx.restore(); }
function drawOver(c, S, t) { if (S.over) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); S.over(c, t); c.restore(); } }
function drawSubs(t) {
  for (let q = 0; q < VO.length; q++) { const [id, t0, d, txt] = VO[q];
    const a = t0 - .1, b = Math.min(t0 + d + .5, q + 1 < VO.length ? VO[q + 1][1] - .12 : 1e9); if (t < a || t > b) continue;
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

