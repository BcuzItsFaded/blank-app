// The 26 Deaths at Mazorra: a paper-cut lightbox film, 1080x1920. Havana, January 2010; cold light, iron beds, 26 candles. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70, TAU = Math.PI * 2;
window.DUR = 61.13;

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
  ['v01', 0.35, 5.792, "What if you checked into a hospital for help… but the people responsible for protecting you became your worst nightmare?"],
  ['v02', 6.362, 9.246, "January 2010. Havana, Cuba. A rare cold front swept across the island. Inside a psychiatric hospital known as Mazorra, something horrifying was happening."],
  ['v03', 15.828, 8.305, "Patients were exposed to freezing temperatures. Windows were reportedly broken. Blankets and warm clothing were missing. Some patients were severely malnourished."],
  ['v04', 24.353, 6.094, "Then people started dying. One after another. By the time the tragedy was discovered, 26 patients were dead."],
  ['v05', 30.667, 8.899, "But the cold wasn't the entire story. Investigators uncovered serious negligence and corruption. Essential supplies had reportedly been stolen or sold."],
  ['v06', 39.786, 7.365, "In 2011, more than a dozen hospital officials and employees were sentenced to prison. The hospital's director received fifteen years."],
  ['v07', 47.371, 6.627, "And here's the most disturbing part. There was no supernatural monster lurking inside Mazorra. The horror was entirely human."],
  ['v08', 54.218, 6.108, "Twenty-six people entered a place meant to care for them… and never made it out alive. This is Plot Twist with A&R."],
];
// scenes were laid out on the first timing; this piecewise map stretches each one onto its narration line
const WOLD = [0, 0.35, 6.48, 16.07, 24.71, 31.15, 40.39, 46.71, 53.68, 60.8], WNEW = [0, 0.35, 6.362, 15.828, 24.353, 30.667, 39.786, 47.371, 54.218, 61.13];
const warp = t => { for (let i = 1; i < WNEW.length; i++) if (t <= WNEW[i]) return WOLD[i - 1] + (t - WNEW[i - 1]) / (WNEW[i] - WNEW[i - 1]) * (WOLD[i] - WOLD[i - 1]); return WOLD[WOLD.length - 1]; };

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

// ======================================================= SCENES =======================================================
// 1 · THE HOOK — the hospital at night in a cold wind
addScene(0, 6.48, () => {
  const sky = Ly(SK('#060b18', '#1e3550', [{ x: 760, y: 420, r: 520, col: 'rgba(190,215,235,.35)' }]), '#000', 0, { raw: true, front: c => sunDisc(c, 760, 420, 70, '#dfeaf2', .8) });
  const clouds = Ly(c => cloudBand(c, 560, 7, 110), '#0e1a2c', .15);
  const hosp = Ly(c => hospital(c, 540, 1300, .95), '#0b1220', .5, { rimA: .3, rim: '#bfe0f2' }); hosp.back = (c, t) => hospBack(c, 540, 1300, .95, t);
  const palms = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { c.fillStyle = c.strokeStyle = '#04070d'; palm(c, 70, 1480, 640, t, 1.1); palm(c, 1010, 1480, 560, t, 1.0); palm(c, 900, 1480, 400, t, .7); windStreaks(c, t, 26, 300, 1400, .22); } });
  return { layers: [sky, clouds, hosp, haze(1100, 1500, '#3a6a90', .5), palms, frontBand('#03050a', 3)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 0, 6.48))) }),
    over: (c, t) => { strip(c, t, .1, .9, 'PLOT TWIST WITH A&R  ·  EPISODE 20', 540, 150, 30, { col: ICE, font: 'Cormorant Garamond', t1: 6.3 }); strip(c, t, .5, 1.2, 'THE 26 DEATHS', 540, 290, 70, { col: '#dcefff', t1: 6.3 }); strip(c, t, 1.0, 1.2, 'AT MAZORRA', 540, 400, 70, { col: '#dcefff', t1: 6.3 }); strip(c, t, 2.6, 1.0, 'A DOCUMENTED TRUE STORY', 540, 510, 34, { col: ICE, t1: 6.3 }); } };
});
// 2a · HAVANA, JANUARY 2010 — a rare cold front; waves over the Malecón
addScene(6.48, 12.2, () => {
  const sky = Ly(SK('#0a1424', '#3a5670', [{ x: 300, y: 700, r: 520, col: 'rgba(200,220,235,.3)' }]), '#000', 0, { raw: true });
  const clouds = Ly(c => { cloudBand(c, 420, 11, 120); }, '#142236', .15, { front: (c, t) => { } }); clouds.drift = 30;
  const city = Ly(c => { skylineFar(c, 1160, 90, 60, 220, false); capitolio(c, 560, 1160, 1.0); }, '#101c2e', .3, { rimA: .3, rim: '#bfe0f2' });
  city.back = (c, t) => { c.fillStyle = rgba('#9cc4de', .45); c.fillRect(440, 1160 - 196, 240, 80); c.fillRect(480, 1160 - 286, 160, 64); };
  const wall = Ly(c => { c.fillRect(-OFF, 1250, W + 2 * OFF, 700); }, '#0a1220', .6, { rimA: .5, rim: '#cfe8f6' });
  const sea = Ly(c => { }, '#000', .85, { raw: true, front: (c, t) => {   // waves crashing over the seawall
    for (let i = 0; i < 4; i++) { const p = ((t - 6.48) * .42 + i * .27) % 1, x = 140 + i * 260; if (p > .85) continue; const R = mulberry(i * 11 + Math.floor((t - 6.48) * .42 + i * .27)); c.save(); c.fillStyle = '#e2f0f8';
      for (let k = 0; k < 70; k++) { const vx = (R() - .5) * 420, vy = 380 + R() * 420, q = p * 1.25, px = x + vx * q, py = 1262 - vy * q + 600 * q * q; if (py > 1262) continue; c.globalAlpha = (1 - p / .85) * (.35 + .5 * R()); c.beginPath(); c.arc(px, py, 2 + R() * 5, 0, TAU); c.fill(); }
      c.globalAlpha = .1 * (1 - p / .85); c.filter = 'blur(18px)'; c.beginPath(); c.ellipse(x, 1250 - 140 * Math.sin(Math.PI * Math.min(1, p * 1.3)), 150, 70, 0, 0, TAU); c.fill(); c.restore(); }
    c.fillStyle = c.strokeStyle = '#04070d'; palm(c, 120, 1480, 520, t, .95, 1.4); palm(c, 960, 1480, 600, t, 1.05, 1.4); windStreaks(c, t, 34, 200, 1400, .3, 9); } });
  return { layers: [sky, clouds, city, wall, sea, frontBand('#03050a', 5)], cam: t => ({ x: lerp(-20, 20, ss(seg(t, 6.48, 12.2))), y: 0, z: lerp(1.02, 1.1, ss(seg(t, 6.48, 12.2))) }),
    over: (c, t) => { strip(c, t, 6.9, .9, 'HAVANA, CUBA · JANUARY 2010', 540, 250, 42, { col: ICE, t1: 12.0 }); strip(c, t, 9.4, .8, 'A RARE COLD FRONT', 540, 360, 40, { col: '#dcefff', t1: 12.0 }); } };
});
// 2b · MAZORRA — the psychiatric hospital, closer
addScene(12.2, 16.07, () => {
  const sky = Ly(SK('#060b18', '#22405c'), '#000', 0, { raw: true });
  const hosp = Ly(c => hospital(c, 540, 1420, 1.55), '#0b1220', .55, { rimA: .3, rim: '#bfe0f2' }); hosp.back = (c, t) => hospBack(c, 540, 1420, 1.55, t, '#9cc4de', .6);
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = c.strokeStyle = '#03060c'; palm(c, -10, 1500, 760, t, 1.2, 1.2); palm(c, 1090, 1500, 700, t, 1.15, 1.2); windStreaks(c, t, 22, 300, 1400, .22, 21); } });
  return { layers: [sky, hosp, haze(1150, 1500, '#3a6a90', .45), fg, frontBand('#03050a', 7)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 12.2, 16.07))) }),
    over: (c, t) => strip(c, t, 12.6, .9, 'MAZORRA · HAVANA PSYCHIATRIC HOSPITAL', 540, 250, 34, { col: ICE, t1: 15.9 }) };
});
// the cold ward: arched windows with broken panes, iron beds, no blankets
function ward(o) {
  const sky = Ly(SK('#0a1628', '#3a5a78', [{ x: 540, y: 600, r: 700, col: 'rgba(200,225,240,.35)' }]), '#000', 0, { raw: true });
  const WIN = [[230, 330, 190, 470], [540, 330, 190, 470], [850, 330, 190, 470]];
  const wall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => WIN.forEach(([x, y, w, h]) => { archPath(c2, x, y, w, h); c2.fill(); })); }, '#0e1828', .35, { rimA: .3, rim: '#bfe0f2', glow: { x: 540, y: 1100, r: 700, col: '#5a86a8', a: .35 },
    front: (c, t) => { WIN.forEach(([x, y, w, h], i) => { // glass panes with a jagged broken hole, mullions, a torn curtain
      c.save(); archPath(c, x, y, w, h); c.clip(); c.fillStyle = 'rgba(150,190,215,.22)'; c.beginPath(); c.rect(x - w, y, w * 2, h); const jx = x + (i - 1) * 14, jy = y + h * .5, R = mulberry(i + 4); for (let k = 0; k <= 12; k++) { const a = k / 12 * TAU, r = (54 + R() * 46) * (i === 1 ? .8 : 1); k ? c.lineTo(jx + Math.cos(a) * r, jy + Math.sin(a) * r * 1.3) : c.moveTo(jx + r, jy); } c.closePath(); c.fill('evenodd');
      c.strokeStyle = 'rgba(200,230,245,.5)'; c.lineWidth = 2; for (let k = 0; k < 6; k++) { const a = R() * TAU; c.beginPath(); c.moveTo(jx + Math.cos(a) * 60, jy + Math.sin(a) * 70); c.lineTo(jx + Math.cos(a) * 140, jy + Math.sin(a) * 160); c.stroke(); } c.restore();
      c.fillStyle = '#0e1828'; c.fillRect(x - 5, y, 10, h); c.fillRect(x - w / 2, y + h * .55, w, 8);
      c.save(); c.fillStyle = '#0a1220'; const fl = Math.sin(t * 3 + i) * 30 + 40; blob(c, [[x + w / 2 - 6, y + 60], [x + w / 2 + 10, y + 60], [x + w / 2 + 30 + fl * .4, y + h * .5], [x + w / 2 + 40 + fl, y + h - 30], [x + w / 2 + 6 + fl * .5, y + h]]); c.restore(); }); } });
  const floor = Ly(c => { c.fillRect(-OFF, 1150, W + 2 * OFF, 900); }, '#0b1422', .55, { rimA: .35, rim: '#bfe0f2' });
  const beds = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => {
    const back = [190, 540, 890], front = [270, 810];
    back.forEach((x, i) => { const f = o.fade ? o.fade(t, i) : 1; ironBed(c, x, 1190, .9, t, { fig: f, col: '#081020', flip: i % 2 ? -1 : 1 }); if (f > .5) breath(c, x - 4 * (i % 2 ? -1 : 1), 1190 - 196 * .9, t, i * .3, .9); });
    front.forEach((x, i) => { const f = o.fade ? o.fade(t, i + 3) : 1; ironBed(c, x, 1460, 1.55, t, { fig: f, flip: i % 2 ? 1 : -1 }); if (f > .5) breath(c, x + 6 * (i % 2 ? 1 : -1), 1460 - 196 * 1.55, t, i * .4 + .2, 1.4); });
    windStreaks(c, t, 30, 360, 1300, .26, 17); if (o.extra) o.extra(c, t); } });
  return [sky, wall, floor, haze(980, 1500, '#7aa2c2', .6), beds];
}
// 3 · THE COLD — freezing, broken windows, no blankets, hunger
addScene(16.07, 24.71, () => ({ layers: [...ward({}), frontBand('#03050a', 9)], cam: t => ({ x: lerp(-16, 16, ss(seg(t, 16.07, 24.71))), y: 0, z: lerp(1.0, 1.08, ss(seg(t, 16.07, 24.71))) }),
  over: (c, t) => { strip(c, t, 17.0, .8, 'FREEZING TEMPERATURES', 540, 200, 40, { col: '#dcefff', t1: 19.4 }); strip(c, t, 19.6, .8, 'BROKEN WINDOWS · NO BLANKETS', 540, 200, 38, { col: '#dcefff', t1: 22.4 }); strip(c, t, 22.5, .8, 'SEVERELY MALNOURISHED', 540, 200, 40, { col: '#dcefff', t1: 24.6 }); } }));
// 4 · ONE AFTER ANOTHER — the beds empty, a tally of 26 grows on the wall
addScene(24.71, 31.15, () => { const order = [3, 1, 0, 4, 2];
  const L = ward({ fade: (t, i) => 1 - ss(seg(t, 25.0 + order.indexOf(i) * .85, 25.6 + order.indexOf(i) * .85)), extra: (c, t) => {
    const n = Math.floor(clamp((t - 25.0) / 4.6) * 26); c.save(); c.strokeStyle = '#e4f1fa'; c.lineCap = 'round'; c.lineWidth = 6; c.shadowColor = ICE; c.shadowBlur = 10;
    for (let k = 0; k < n; k++) { const g = Math.floor(k / 5), r = k % 5, gx = 200 + (g % 3) * 260, gy = 880 + Math.floor(g / 3) * 120; if (r < 4) { c.beginPath(); c.moveTo(gx + r * 30, gy); c.lineTo(gx + r * 30 + 4, gy + 80); c.stroke(); } else { c.beginPath(); c.moveTo(gx - 16, gy + 66); c.lineTo(gx + 112, gy + 12); c.stroke(); } } c.restore(); } });
  return { layers: [...L, frontBand('#03050a', 11)], cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.1, ss(seg(t, 24.71, 31.15))) }),
    over: (c, t) => { strip(c, t, 25.2, .8, 'ONE AFTER ANOTHER', 540, 200, 42, { col: '#dcefff', t1: 28.6 }); strip(c, t, 28.8, 1.0, '26 PATIENTS DEAD', 540, 200, 52, { col: '#ffffff', t1: 31.0 }); } }; });
// 5 · NEGLIGENCE & CORRUPTION — empty shelves; supplies carried out the back gate at night
addScene(31.15, 40.39, () => {
  const sky = Ly(SK('#060a14', '#1c2e44'), '#000', 0, { raw: true });
  const room = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { c2.fillRect(620, 520, 380, 900); for (let r = 0; r < 4; r++) c2.fillRect(70, 520 + r * 210, 440, 150); }); }, '#0c1422', .4, { rimA: .3, rim: '#bfe0f2' });
  room.back = (c, t) => { c.fillStyle = 'rgba(60,90,120,.55)'; for (let r = 0; r < 4; r++) c.fillRect(70, 520 + r * 210, 440, 150); c.fillStyle = 'rgba(30,50,80,.9)'; c.fillRect(620, 520, 380, 900); };
  const shelf = Ly(c => { for (let r = 0; r < 4; r++) { c.fillRect(70, 664 + r * 210, 440, 10); c.fillRect(110 + (r % 2) * 260, 616 + r * 210, 50, 48); } }, '#0a1220', .7);   // nearly empty shelves
  const act = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => {
    // through the doorway: an old truck in the yard, figures carrying sacks and folded blankets out
    c.save(); c.beginPath(); c.rect(620, 520, 380, 900); c.clip(); c.fillStyle = '#050810'; c.fillRect(640, 1170, 360, 140); c.fillRect(860, 1100, 120, 80); c.beginPath(); c.arc(700, 1320, 28, 0, TAU); c.arc(930, 1320, 28, 0, TAU); c.fill();
    c.fillStyle = rgba('#ffe7b0', .8); c.fillRect(960, 1120, 14, 18);
    for (let i = 0; i < 3; i++) { const u = ((t - 34.5) * .22 + i * .34); if (t < 34.5 || u > 1 || u < 0) continue; const x = lerp(620, 900, u % 1), y = 1340; c.save(); dancer(c, x, y, .62, 0, { man: true, tired: 1, shoes: false, col: '#050810', flip: -1 }); c.fillStyle = '#050810'; blob(c, [[x - 30, y - 190 * .62], [x + 34, y - 196 * .62], [x + 30, y - 150 * .62], [x - 34, y - 146 * .62]]); c.restore(); } c.restore();
    // the investigator's flashlight sweeping the empty shelves
    const a = Math.sin((t - 31.15) * .9) * .35 - .25, ox = 560, oy = 1460; c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(ox, oy, 10, ox, oy, 1000); g.addColorStop(0, 'rgba(255,240,200,.4)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; const ang = -Math.PI / 2 - .45 + a; c.beginPath(); c.moveTo(ox, oy); c.arc(ox, oy, 1000, ang - .2, ang + .2); c.closePath(); c.fill(); c.restore();
    c.fillStyle = INK2; dancer(c, 560, 1480, 1.2, 0, { man: true, tired: 1, shoes: false }); } });
  return { layers: [sky, room, shelf, act, frontBand('#03050a', 13)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.07, ss(seg(t, 31.15, 40.39))) }),
    over: (c, t) => { strip(c, t, 32.6, .8, 'NEGLIGENCE · CORRUPTION', 540, 220, 42, { col: '#dcefff', t1: 36.4 }); strip(c, t, 36.6, .8, 'SUPPLIES STOLEN OR SOLD', 540, 220, 42, { col: '#dcefff', t1: 40.2 }); } };
});
// 6 · THE TRIAL, 2011 — fourteen sentenced; bars come down
addScene(40.39, 46.71, () => {
  const sky = Ly(SK('#0a1020', '#2a3a52', [{ x: 540, y: 520, r: 560, col: 'rgba(210,225,240,.35)' }]), '#000', 0, { raw: true });
  const hall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { for (const x of [170, 910]) { archPath(c2, x, 300, 150, 560); c2.fill(); } c2.beginPath(); c2.arc(540, 450, 130, 0, TAU); c2.fill(); }); }, '#0e1626', .35, { rimA: .3, rim: '#bfe0f2' });
  hall.back = (c, t) => { c.fillStyle = 'rgba(190,215,235,.55)'; for (const x of [170, 910]) { archPath(c, x, 300, 154, 564); c.fill(); } };
  const bench = Ly(c => { c.fillRect(220, 820, 640, 330); c.fillRect(190, 800, 700, 30); }, '#0a1220', .6, { rimA: .4, rim: '#bfe0f2', front: (c, t) => {
    // the scales of justice in the round window; the judge; the gavel
    c.save(); c.translate(0, -60); c.strokeStyle = '#0a1220'; c.fillStyle = '#0a1220'; c.lineWidth = 9; c.beginPath(); c.moveTo(540, 380); c.lineTo(540, 540); c.moveTo(440, 410); c.lineTo(640, 410); c.stroke(); for (const sx of [440, 640]) { c.lineWidth = 4; c.beginPath(); c.moveTo(sx, 410); c.lineTo(sx - 40, 480); c.moveTo(sx, 410); c.lineTo(sx + 40, 480); c.stroke(); c.beginPath(); c.ellipse(sx, 482, 46, 12, 0, 0, Math.PI); c.fill(); } c.fillRect(500, 536, 80, 14); c.restore();
    dancer(c, 540, 820, 1.0, 0, { man: true, tired: 1, shoes: false, col: '#0a1220' }); const hit = Math.max(0, 1 - Math.abs(t - 41.7) / .12); c.save(); c.translate(630, 800); c.rotate(-.6 + hit * .6); c.fillStyle = '#0a1220'; c.fillRect(-6, -70, 12, 70); c.fillRect(-26, -86, 52, 26); c.restore(); } });
  const dock = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) dancer(c, 110 + i * 143 + r * 40, 1300 + r * 160, .72 + r * .14, 0, { man: i % 3 !== 1, tired: 1, shoes: false, lean: -.05, col: r ? INK2 : '#0b1424' }); } });
  return { layers: [sky, hall, bench, haze(1100, 1500, '#4a6a8a', .4), dock, frontBand('#03050a', 15)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 40.39, 46.71))) }),
    over: (c, t) => { const b = ss(seg(t, 44.2, 45.0)); if (b > 0) { c.save(); c.fillStyle = '#05080e'; c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 20; for (let x = 60; x < W; x += 120) c.fillRect(x - 13, lerp(-H, 0, b), 26, H - 380); c.fillRect(0, lerp(-H, 0, b) + 120, W, 22); c.fillRect(0, lerp(-H, 0, b) + H - 420, W, 22); c.restore(); }
      strip(c, t, 40.8, .8, '2011 · OVER A DOZEN SENTENCED', 540, 210, 40, { col: '#dcefff', t1: 46.5 }); strip(c, t, 44.6, .8, 'THE DIRECTOR: 15 YEARS', 540, 320, 38, { col: '#dcefff', t1: 46.5 }); } };
});
// 7 · THE MOST DISTURBING PART — a monster's shadow on the corridor wall... is only a man with a clipboard
addScene(46.71, 53.68, () => {
  const sky = Ly(SK('#0c1424', '#2a4058'), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(60, 200, 960, 1060)); }, '#0a1220', .35, { rimA: .3, rim: '#bfe0f2' });
  wall.back = (c, t) => { const g = c.createRadialGradient(780, 340, 20, 780, 600, 1000); g.addColorStop(0, '#d6e6f0'); g.addColorStop(1, '#3a5068'); c.fillStyle = g; c.fillRect(60, 200, 960, 1060); const fk = (t > 50.2 && t < 50.8) ? (Math.sin(t * 90) > 0 ? .75 : .2) : 0; if (fk) { c.fillStyle = `rgba(4,6,12,${fk})`; c.fillRect(60, 200, 960, 1060); }
    const m = t >= 50.5 ? 1 : 0, grow = ss(seg(t, 47.2, 49.4)); c.save(); c.fillStyle = '#0a0f18';
    if (m < 1) { c.globalAlpha = 1 - m; c.save(); c.translate(470, 1260); c.scale(lerp(.5, .98, grow), lerp(.5, .98, grow)); poly0(c, [[-140, 0], [-170, -260], [-230, -470], [-160, -610], [-40, -660], [20, -700], [70, -760], [110, -700], [150, -640], [190, -560], [170, -420], [120, -260], [130, 0]]); c.fill(); for (const [hx, hy, ex, ey] of [[30, -720, -20, -860], [90, -730, 150, -870]]) { poly0(c, [[hx - 16, hy], [ex, ey], [hx + 16, hy]]); c.fill(); }
      c.lineCap = 'round'; c.strokeStyle = '#0a0f18'; const reach = Math.sin(t * 1.6) * 20; for (const [sx, sy, mx, my, ex, ey] of [[150, -560, 330, -520, 430 + reach, -380], [-150, -560, -300, -420, -330, -200]]) { c.lineWidth = 40; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke(); const ang = Math.atan2(ey - my, ex - mx); for (let f = 0; f < 4; f++) { const a2 = ang + (f - 1.5) * .35; c.lineWidth = 11; c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo(ex + Math.cos(a2) * 50, ey + Math.sin(a2) * 50, ex + Math.cos(a2 + .6) * 90, ey + Math.sin(a2 + .6) * 90); c.stroke(); } } c.restore(); }
    if (m > 0) { c.globalAlpha = m; dancer(c, 460, 1260, 2.9, 0, { man: true, tired: 1, shoes: false, col: '#0a0f18' }); c.fillRect(460 + 64, 1260 - 2.9 * 150, 70, 96); }
    c.restore(); };
  const floor = Ly(c => c.fillRect(-OFF, 1260, W + 2 * OFF, 800), '#0a1220', .55, { rimA: .3, rim: '#bfe0f2', front: (c, t) => { c.save(); c.fillStyle = '#e8f2f8'; c.shadowColor = '#e8f2f8'; c.shadowBlur = 40; c.beginPath(); c.ellipse(780, 300, 46, 18, 0, 0, TAU); c.fill(); c.restore(); } });
  return { layers: [sky, wall, floor, frontBand('#03050a', 17)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 46.71, 53.68))) }),
    over: (c, t) => { strip(c, t, 48.4, .8, 'NO MONSTER', 540, 150, 48, { col: '#dcefff', t1: 50.6 }); strip(c, t, 51.2, .9, 'THE HORROR WAS HUMAN', 540, 150, 46, { col: '#ffffff', t1: 53.5 }); } };
});
// 8 · IN MEMORY — 26 candles lit before the hospital at first light
addScene(53.68, 60.8, () => {
  const sky = Ly(SK('#0a1226', '#5a5a7a', [{ x: 540, y: 1150, r: 700, col: 'rgba(240,190,170,.35)' }]), '#000', 0, { raw: true });
  const hosp = Ly(c => hospital(c, 540, 1180, .9), '#0b1220', .4, { rimA: .3, rim: '#f0d8c8' }); hosp.back = (c, t) => hospBack(c, 540, 1180, .9, t, '#9cc4de', .25);
  const ground = Ly(c => c.fillRect(-OFF, 1260, W + 2 * OFF, 800), '#070b14', .7);
  const cand = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { c.fillStyle = c.strokeStyle = '#04070d'; palm(c, 40, 1480, 620, t, 1.0, .4); palm(c, 1040, 1480, 560, t, .95, .4);
    candleRow(c, t, 13, 1340, 120, 960, 54.2, .13, 1.0); candleRow(c, t, 13, 1450, 80, 1000, 55.9, .13, 1.2); } });
  return { layers: [sky, hosp, ground, haze(1200, 1500, '#ffb468', .1), cand, frontBand('#03050a', 19)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 53.68, 60.8))) }),
    over: (c, t) => { strip(c, t, 55.4, 1.0, '26 LIVES', 540, 230, 64, { col: '#ffe2a8' }); strip(c, t, 57.6, 1.0, 'THE HORROR WAS ENTIRELY HUMAN', 540, 340, 34, { col: '#ffe2a8' }); strip(c, t, 59.0, .8, 'PLOT TWIST WITH A&R', 540, 450, 36, { col: '#ffe2a8', font: 'Cormorant Garamond' }); } };
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
  drawSubs(tn);
}
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

