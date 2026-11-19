// Cementerio Lindo: The Forgotten Dead. A paper-cut lightbox film, 1080x1920. Phoenix under the moon; forgotten graves, whispering spirits, marigolds of remembrance. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70, TAU = Math.PI * 2;
window.DUR = 60.5;

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
  ['v01', 0.35, 4.171, "What if you entered a cemetery… and discovered thousands of graves had been forgotten?"],
  ['v02', 4.82, 12.255, "In Phoenix, Arizona, lies a real burial ground called Cementerio Lindo. Established in 1890, it became the final resting place for thousands of people, many too poor to afford another burial."],
  ['v03', 17.38, 5.817, "Over time, grave markers disappeared. Names were lost. Families struggled to locate their loved ones."],
  ['v04', 23.49, 6.1, "But imagine visiting this cemetery after sunset. You hear footsteps behind you. You turn. Nobody's there."],
  ['v05', 29.89, 9.478, "Then a faint whisper breaks the silence. \"Remember me…\" Suddenly, more voices rise from the darkness. Hundreds of forgotten souls, calling out names nobody remembers."],
  ['v06', 39.67, 3.489, "You try to leave. But the whisper follows. \"Don't forget us again.\""],
  ['v07', 43.46, 6.385, "No verified evidence confirms these ghostly voices. Yet the cemetery's forgotten graves are very real."],
  ['v08', 50.15, 9.551, "And maybe the scariest thing about Cementerio Lindo isn't what might haunt it… It's how many people were nearly erased from history. This is Plot Twist with A&R."],
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

// ======================================================= SCENES =======================================================
const NIGHT = (top, bot, mx, my, mr = 90) => Ly(SK(top, bot, [{ x: mx, y: my, r: 640, col: 'rgba(220,232,238,.45)' }]), '#000', 0, { raw: true, front: c => sunDisc(c, mx, my, mr, MOON, .95) });
// 1 · THE HOOK — thousands of forgotten graves under the moon
addScene(0, 4.82, () => { const F = graveField(3, 1040, 1470, 7);
  const sky = NIGHT('#070c18', '#243246', 720, 380, 80);
  const hills = Ly(c => { camelback(c, 1060); saguaro(c, 160, 1060, 220, .8); saguaro(c, 930, 1060, 180, .7); }, '#121a26', .25, { rimA: .3, rim: '#dfe8ee' });
  const field = Ly(c => drawField(c, F), '#0a0f16', .7, { rimA: .45, rim: '#dfe8ee' });
  const fx = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { mist(c, t, 1180, 0.088); dust(c, t, 60, 5); } });
  return { layers: [sky, hills, haze(900, 1300, '#6a8094', 0.3), field, fx, frontBand('#04060a', 3)], cam: t => ({ x: 0, y: lerp(20, 0, ss(seg(t, 0, 4.82))), z: lerp(1.0, 1.08, ss(seg(t, 0, 4.82))) }),
    over: (c, t) => { strip(c, t, .1, .8, 'PLOT TWIST WITH A&R  ·  EPISODE 21', 540, 150, 30, { col: '#dfe8ee', font: 'Cormorant Garamond', t1: 4.7 }); strip(c, t, .4, 1.1, 'CEMENTERIO LINDO', 540, 290, 72, { col: '#eef6f8', t1: 4.7 }); strip(c, t, 1.4, 1.0, 'THE FORGOTTEN DEAD', 540, 400, 44, { col: '#dfe8ee', t1: 4.7 }); } };
});
// 2a · PHOENIX, ARIZONA — the iron gate at the edge of the desert city
addScene(4.82, 10.4, () => {
  const sky = NIGHT('#080e1c', '#2c3a4e', 300, 420, 70);
  const far = Ly(c => { camelback(c, 1120); }, '#151d2a', .2, { front: (c, t) => { c.save(); const R = mulberry(4); for (let i = 0; i < 60; i++) { c.fillStyle = rgba('#ffd9a0', .35 + .4 * R()); c.fillRect(R() * W, 1080 + R() * 40, 3, 3); } c.restore(); } });
  const desert = Ly(c => { saguaro(c, 90, 1250, 360, 1.2); saguaro(c, 990, 1250, 300, 1.0); c.fillRect(-OFF, 1240, W + 2 * OFF, 700); }, '#0c121c', .45, { rimA: .35, rim: '#dfe8ee' });
  const gate = Ly(c => { }, '#000', .8, { raw: true, front: (c, t) => { ironGate(c, 540, 1420, 480, 520, 0); dust(c, t, 50, 8, .45); } });
  return { layers: [sky, far, desert, haze(1000, 1460, '#6a8094', 0.27), gate, frontBand('#04060a', 5)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.12, ss(seg(t, 4.82, 10.4))) }),
    over: (c, t) => strip(c, t, 5.4, .9, 'PHOENIX, ARIZONA', 540, 230, 48, { col: '#eef6f8', t1: 10.2 }) };
});
// 2b · EST. 1890 — thousands of simple graves, many of the poor
addScene(10.4, 17.38, () => { const F = graveField(11, 900, 1470, 9);
  const sky = NIGHT('#070c18', '#26364a', 820, 300, 70);
  const hills = Ly(c => { camelback(c, 920); }, '#131b28', .2, { rimA: .25, rim: '#dfe8ee' });
  const field = Ly(c => drawField(c, F), '#0a0f16', .7, { rimA: .5, rim: '#dfe8ee' });
  const fx = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { mist(c, t, 1050, 0.08); dust(c, t, 50, 12); } });
  return { layers: [sky, hills, haze(800, 1300, '#6a8094', 0.3), field, fx, frontBand('#04060a', 7)], cam: t => ({ x: lerp(-30, 30, ss(seg(t, 10.4, 17.38))), y: 0, z: lerp(1.04, 1.12, ss(seg(t, 10.4, 17.38))) }),
    over: (c, t) => { strip(c, t, 10.8, .8, 'ESTABLISHED 1890', 540, 230, 50, { col: '#eef6f8', t1: 13.8 }); strip(c, t, 14.0, .8, 'THOUSANDS BURIED · MANY TOO POOR', 540, 230, 36, { col: '#eef6f8', t1: 17.2 }); } };
});
// 3 · NAMES LOST — the names fade from the markers; a family searches with a lantern
addScene(17.38, 23.49, () => { const F = graveField(19, 980, 1470, 6).filter(m => m.kind !== 2);
  const sky = NIGHT('#070c18', '#243246', 260, 330, 66);
  const field = Ly(c => drawField(c, F), '#0a0f16', .7, { rimA: .5, rim: '#dfe8ee' });
  const fx = Ly(c => { }, '#000', .92, { raw: true, front: (c, t) => {
    const fade = ss(seg(t, 18.2, 21.6)); for (const m of F) if (m.r >= 3) { const a = (1 - fade) * (m.x % 2 ? 1 : .8); c.save(); c.globalAlpha = a; c.font = `${Math.round(16 * m.s)}px "IM Fell English SC"`; c.textAlign = 'center'; c.fillStyle = '#e6eef2'; c.translate(m.x, m.y); c.rotate(m.tilt); c.fillText(m.kind === 1 ? m.name : '', 0, -50 * m.s); if (m.kind === 0) c.fillText(m.name, 0, -60 * m.s); c.restore(); }
    // a woman with a lantern, searching among the blank markers
    const x = lerp(860, 300, ss(seg(t, 17.6, 23.4))); c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x + 70, 1210, 2, x + 70, 1210, 220); g.addColorStop(0, 'rgba(255,190,110,.45)'); g.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = g; c.fillRect(x - 160, 990, 460, 440); c.restore();
    dancer(c, x, 1450, 1.15, 0, { tired: 1, shoes: false, lean: .12, col: '#05070b' }); c.fillStyle = '#ffd08a'; c.beginPath(); c.arc(x + 70, 1215, 10, 0, TAU); c.fill(); c.strokeStyle = '#05070b'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 48, 1184); c.lineTo(x + 70, 1204); c.stroke();
    mist(c, t, 1180, 0.088); dust(c, t, 50, 19); } });
  return { layers: [sky, haze(850, 1300, '#6a8094', 0.27), field, fx, frontBand('#04060a', 9)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 17.38, 23.49))) }),
    over: (c, t) => { strip(c, t, 18.0, .8, 'MARKERS DISAPPEARED', 540, 230, 44, { col: '#eef6f8', t1: 20.0 }); strip(c, t, 20.2, .8, 'NAMES WERE LOST', 540, 230, 48, { col: '#eef6f8', t1: 23.3 }); } };
});
// 4a · AFTER SUNSET — walking the path between the graves; footsteps behind you
addScene(23.49, 27.5, () => { const L = [], R = []; for (let i = 0; i < 9; i++) { const u = i / 8, y = lerp(980, 1470, u * u), s = lerp(.3, 1.4, u * u); L.push({ x: 540 - lerp(60, 520, u * u), y, s, kind: i % 3, tilt: (i % 2 - .5) * .2 }); R.push({ x: 540 + lerp(60, 520, u * u), y, s, kind: (i + 1) % 3, tilt: (.5 - i % 2) * .2 }); }
  const sky = NIGHT('#0a0e1e', '#3a3a5a', 540, 640, 120);
  const path = Ly(c => { c.fillRect(-OFF, 990, W + 2 * OFF, 1000); hole(c, c2 => { poly0(c2, [[520, 990], [560, 990], [820, 1600], [260, 1600]]); c2.fill(); }); }, '#0a0f16', .5, { rimA: .3, rim: '#dfe8ee' });
  path.back = c => { const g = c.createLinearGradient(0, 990, 0, 1500); g.addColorStop(0, '#5a6a80'); g.addColorStop(1, '#2a3444'); c.fillStyle = g; c.fillRect(200, 980, 680, 620); };
  const graves = Ly(c => { for (const m of [...L, ...R]) marker(c, m.x, m.y, m.s, m.kind, m.tilt); }, '#080c12', .75, { rimA: .5, rim: '#dfe8ee' });
  const fx = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { mist(c, t, 1100, 0.08); dust(c, t, 50, 23); } });
  return { layers: [sky, path, graves, fx, frontBand('#04060a', 11)], cam: t => ({ x: Math.sin(t * 4.2) * 4, y: Math.abs(Math.sin(t * 4.2)) * 6, z: lerp(1.0, 1.2, ss(seg(t, 23.49, 27.5))) }),
    over: (c, t) => strip(c, t, 24.3, .8, 'AFTER SUNSET', 540, 230, 48, { col: '#eef6f8', t1: 26.4 }) };
});
// 4b · YOU TURN — nobody's there
addScene(27.5, 29.89, () => { const F = graveField(29, 1000, 1470, 6);
  const sky = NIGHT('#0a0e1e', '#2a3048', 880, 360, 60);
  const field = Ly(c => drawField(c, F), '#080c12', .7, { rimA: .5, rim: '#dfe8ee' });
  const fx = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { mist(c, t, 1150, 0.128); dust(c, t, 60, 31); } });
  return { layers: [sky, haze(850, 1300, '#6a8094', 0.24), field, fx, frontBand('#04060a', 13)], cam: t => ({ x: lerp(-160, 0, eo(seg(t, 27.5, 27.95))), y: 0, z: 1.05 }),
    over: (c, t) => { const w = 1 - seg(t, 27.5, 27.85); if (w > 0) { c.save(); c.globalAlpha = w * .8; for (let i = 0; i < 40; i++) { c.fillStyle = i % 2 ? 'rgba(200,215,225,.12)' : 'rgba(0,0,0,.35)'; c.fillRect(0, (i * 97) % H, W, 20 + (i % 5) * 16); } c.restore(); }
      strip(c, t, 28.3, .7, "NOBODY'S THERE", 540, 230, 48, { col: '#eef6f8', t1: 29.8 }); } };
});
// 5 · REMEMBER ME — spirits of light rise from the graves; forgotten names drift up
addScene(29.89, 39.67, () => { const F = graveField(37, 1000, 1470, 7);
  const sky = NIGHT('#060a16', '#1e2a40', 540, 360, 80);
  const field = Ly(c => drawField(c, F), '#080c12', .7, { rimA: .5, rim: '#dfe8ee' });
  const rise = Ly(c => { }, '#000', .85, { raw: true, front: (c, t) => {
    const P = F.filter(m => m.r >= 3).sort((p, q) => mulberry(Math.round(p.x))() - mulberry(Math.round(q.x))()).slice(0, 16); P.forEach((m, i) => { const t0 = i === 0 ? 30.8 : 33.6 + i * .16, a = ss(seg(t, t0, t0 + 1.2)) * (.55 + .45 * Math.sin(t * 2 + i)); const up = ss(seg(t, t0, t0 + 5)) * 60 * m.s; spirit(c, m.x, m.y - 10 * m.s - up, m.s * (i === 0 ? 1.5 : 1.1), a * (i === 0 ? 1 : .8), t, i); });
    NAMES.forEach((n, i) => { const t0 = 34.2 + i * .28, u = (t - t0) / 4.5; if (u < 0 || u > 1) return; const R = mulberry(i + 9); floatName(c, n, 120 + R() * 840, lerp(1250, 600, u) - R() * 200, Math.sin(Math.PI * u) * .85, 28 + R() * 16); });
    mist(c, t, 1150, 0.104, '#9fb8c8'); dust(c, t, 60, 41); } });
  return { layers: [sky, haze(850, 1300, '#5a7488', 0.24), field, rise, frontBand('#04060a', 17)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 29.89, 39.67))) }),
    over: (c, t) => { strip(c, t, 31.0, 1.0, 'REMEMBER ME…', 540, 230, 54, { col: '#e6f4f8', t1: 34.0 }); strip(c, t, 35.6, .9, 'HUNDREDS OF FORGOTTEN SOULS', 540, 230, 38, { col: '#e6f4f8', t1: 39.5 }); } };
});
// 6 · DON'T FORGET US AGAIN — running for the gate; the whispers follow
addScene(39.67, 43.46, () => {
  const sky = NIGHT('#060a16', '#22304a', 760, 340, 70);
  const ground = Ly(c => { c.fillRect(-OFF, 1240, W + 2 * OFF, 800); for (const [x, s, k] of [[120, 1.1, 0], [300, .8, 1], [800, .9, 0], [960, 1.2, 3]]) marker(c, x, 1250, s, k, (k - 1) * .1); }, '#080c12', .6, { rimA: .5, rim: '#dfe8ee' });
  const gate = Ly(c => { }, '#000', .8, { raw: true, front: (c, t) => { ironGate(c, 540, 1250, 380, 420, ss(seg(t, 39.8, 40.6)));
    for (let i = 0; i < 9; i++) { const R = mulberry(i + 3), x = lerp(-80, 1160, R()), a = ss(seg(t, 39.9 + i * .12, 40.9 + i * .12)) * .7; spirit(c, lerp(x, 540 + (x - 540) * .5, ss(seg(t, 40, 43.4))), 1500 + R() * 60, 1.15 + R() * .5, a, t, i); }
    mist(c, t, 1350, 0.12); dust(c, t, 60, 43); } });
  return { layers: [sky, ground, gate, frontBand('#04060a', 19)], cam: t => ({ x: Math.sin(t * 8) * 6, y: Math.abs(Math.sin(t * 8)) * 10, z: lerp(1.0, 1.16, ss(seg(t, 39.67, 43.46))) }),
    over: (c, t) => strip(c, t, 41.0, .8, "DON'T FORGET US AGAIN.", 540, 230, 50, { col: '#e6f4f8', t1: 43.3 }) };
});
// 7 · THE TRUTH — the spirits are gone; the sunken, unmarked graves remain
addScene(43.46, 50.15, () => { const F = graveField(47, 1040, 1470, 6);
  const sky = NIGHT('#0a1020', '#34445a', 300, 360, 70);
  const field = Ly(c => { drawField(c, F.filter((m, i) => i % 3 === 0)); for (const m of F) if (m.r >= 2) { c.beginPath(); c.ellipse(m.x, m.y, 60 * m.s, 12 * m.s, 0, 0, TAU); c.fill(); } }, '#080c12', .7, { rimA: .55, rim: '#dfe8ee' });
  const fx = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { const g = 1 - ss(seg(t, 43.6, 45.0)); F.filter(m => m.r >= 2).slice(0, 10).forEach((m, i) => spirit(c, m.x, m.y - 60 * m.s, m.s * 1.1, g * .7, t, i));
    // unmarked plots: small numbered stakes where names should be
    F.filter(m => m.r >= 3 && m.x > 130 && m.x < 950).reduce((acc, m) => (acc.every(q => Math.hypot(q.x - m.x, (q.y - m.y) * 3) > 260) ? acc.concat([m]) : acc), []).slice(0, 7).forEach((m, i) => { const a = ss(seg(t, 46.4 + i * .1, 47.0 + i * .1)); c.save(); c.globalAlpha = a; c.fillStyle = '#d8e4ea'; c.font = `${Math.round(30 * m.s)}px "IM Fell English SC"`; c.textAlign = 'center'; c.shadowColor = '#dfe8ee'; c.shadowBlur = 8; c.fillText('UNKNOWN', m.x, m.y - 30 * m.s); c.restore(); });
    mist(c, t, 1150, 0.08); dust(c, t, 50, 47); } });
  return { layers: [sky, haze(860, 1300, '#6a8094', 0.27), field, fx, frontBand('#04060a', 21)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.07, ss(seg(t, 43.46, 50.15))) }),
    over: (c, t) => { strip(c, t, 44.0, .8, 'NO VERIFIED EVIDENCE', 540, 230, 46, { col: '#eef6f8', t1: 46.6 }); strip(c, t, 46.8, .8, 'BUT THE FORGOTTEN GRAVES ARE REAL', 540, 230, 34, { col: '#eef6f8', t1: 50.0 }); } };
});
// 8 · REMEMBERED — marigolds and candles appear on the graves; the names return
addScene(50.15, 60.5, () => { const F = graveField(53, 1000, 1470, 7);
  const sky = NIGHT('#0a1020', '#3a4260', 540, 420, 100);
  const hills = Ly(c => { camelback(c, 1020); saguaro(c, 120, 1020, 200, .7); saguaro(c, 960, 1020, 170, .6); }, '#131b28', .25, { rimA: .3, rim: '#dfe8ee' });
  const field = Ly(c => drawField(c, F), '#0a0f16', .7, { rimA: .5, rim: '#dfe8ee' });
  const fx = Ly(c => { }, '#000', .92, { raw: true, front: (c, t) => { const G = F.filter(m => m.r >= 2);
    G.forEach((m, i) => { const t0 = 51.0 + (i % 18) * .2 + Math.floor(i / 18) * .1; marigolds(c, m.x + 28 * m.s, m.y + 2, m.s * 1.1, ss(seg(t, t0, t0 + .6)), t); });
    G.slice(0, 14).forEach((m, i) => { const t0 = 54.4 + i * .14, a = ss(seg(t, t0, t0 + .8)); c.save(); c.globalAlpha = a; c.font = `${Math.round(17 * m.s)}px "IM Fell English SC"`; c.textAlign = 'center'; c.fillStyle = '#ffe2b0'; c.shadowColor = MARI; c.shadowBlur = 10; c.fillText(m.name, m.x, m.y - (m.kind === 2 ? 14 : 56) * m.s); c.restore(); });
    candleRow(c, t, 9, 1462, 120, 960, 52.0, .25, .9); mist(c, t, 1200, 0.072); dust(c, t, 40, 53, .4); } });
  return { layers: [sky, hills, haze(880, 1300, '#6a8094', 0.24), field, fx, frontBand('#04060a', 23)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 50.15, 60.5))) }),
    over: (c, t) => { strip(c, t, 52.0, .9, 'NEARLY ERASED FROM HISTORY', 540, 230, 42, { col: '#ffe2b0', t1: 56.6 }); strip(c, t, 56.8, .9, 'REMEMBER THEM', 540, 230, 58, { col: '#ffe2b0' }); strip(c, t, 58.2, .8, 'PLOT TWIST WITH A&R', 540, 340, 36, { col: '#ffe2b0', font: 'Cormorant Garamond' }); } };
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

