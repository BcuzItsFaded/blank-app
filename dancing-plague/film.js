// The Dancing Plague of 1518: a paper-cut lightbox film, 1080x1920. Hot summer dusk over Strasbourg, dancers in cut paper, red shoes. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70, TAU = Math.PI * 2;
window.DUR = 62.2;

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
  ['v01', 0.35, 9.062, "In 1518, an entire city witnessed something terrifying. People began dancing uncontrollably… and nobody knew how to stop them."],
  ['v02', 9.77, 6.601, "In Strasbourg, a mysterious woman suddenly began dancing in the streets. She appeared unable to control her movements."],
  ['v03', 16.73, 7.01, "Within days, dozens joined her. They danced for hours, their bodies exhausted, as frightened residents watched helplessly."],
  ['v04', 24.1, 7.09, "Doctors blamed the summer heat and the stars. But the strange dancing continued, leaving authorities desperate for answers."],
  ['v05', 31.55, 6.954, "Officials eventually banned public dancing and drums. The city was struggling to control an illness nobody understood."],
  ['v06', 38.87, 7.957, "Later accounts claimed hundreds were affected, and some danced until they died. But historians still dispute those terrifying death reports."],
  ['v07', 47.18, 6.541, "Some believed they were cursed by Saint Vitus. Sufferers were taken to his shrine, hoping the mysterious affliction would end."],
  ['v08', 54.09, 7.429, "Was it mass psychological distress, illness, or something else? More than five hundred years later, the true cause remains unknown."],
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

// ======================================================= SCENES =======================================================
// 1 · THE HOOK — a hot summer dusk over Strasbourg; the whole street dances
addScene(0, 9.77, () => {
  const sky = Ly(SK('#3a0f12', '#f08a3a', [{ x: 540, y: 1040, r: 760, col: 'rgba(255,190,110,.6)' }]), '#000', 0, { raw: true, front: c => sunDisc(c, 540, 1060, 150, '#ffd890') });
  const far = Ly(c => { skylineFar(c, 1180, 18, 60, 160, false); cathedral(c, 540, 1180, .78); }, '#5a1f1c', .25, { glow: { x: 540, y: 1000, r: 600, col: '#ff9a5a', a: .3 } });
  far.back = (c, t) => cathBack(c, 540, 1180, .78, '#ffd08a', .95);
  const rowA = townRow(5, 1240, -80, 1160, 260, 380), near = Ly(c => drawRow(c, rowA), '#2a0e0c', .55, { rimA: .4 });
  near.back = (c, t) => rowBack(c, rowA, '#ffc070', .95, t);
  const crowd = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { [[120, 1.05, 0, 0], [320, 1.2, 2.1, 1], [540, 1.3, 4.0, 0], [760, 1.18, 1.1, 1], [960, 1.05, 3.2, 0]].forEach(([x, k, ph, m], i) => dancer(c, x, 1470, k, t, { ph, man: !!m, flip: i % 2 ? -1 : 1, sp: .9 + .08 * i })); } });
  return { layers: [sky, far, near, haze(1020, 1500, '#ffb468', .9), crowd, frontBand('#0a0504', 3)], cam: t => ({ x: 0, y: lerp(30, 0, ss(seg(t, 0, 9.77))), z: lerp(1.0, 1.1, ss(seg(t, 0, 9.77))) }),
    over: (c, t) => { strip(c, t, .1, .9, 'PLOT TWIST WITH A&R  ·  EPISODE 19', 540, 150, 30, { col: '#ffcf8a', font: 'Cormorant Garamond', t1: 9.6 }); strip(c, t, .5, 1.3, 'THE DANCING PLAGUE', 540, 300, 70, { col: '#ffd59a', t1: 9.6 }); strip(c, t, 2.4, 1.0, 'STRASBOURG · 1518', 540, 420, 46, { col: '#ffcf8a', t1: 9.6 }); } };
});
// 2 · THE FIRST WOMAN — one woman alone in a narrow lane, unable to stop
addScene(9.77, 16.73, () => {
  const sky = Ly(SK('#5a1a14', '#f4a04a', [{ x: 540, y: 760, r: 520, col: 'rgba(255,210,140,.7)' }]), '#000', 0, { raw: true, front: c => sunDisc(c, 540, 760, 110, '#ffe2a8') });
  const far = Ly(c => cathedral(c, 540, 1060, .62), '#6a2a20', .2); far.back = (c, t) => cathBack(c, 540, 1060, .62, '#ffd890', .9);
  const rowL = townRow(9, 1360, -120, 300, 700, 980), rowR = townRow(13, 1360, 780, 1220, 700, 980);
  const lane = Ly(c => { drawRow(c, rowL); drawRow(c, rowR); }, '#240c0a', .6, { rimA: .35 }); lane.back = (c, t) => { rowBack(c, rowL, '#ffc070', .9, t); rowBack(c, rowR, '#ffc070', .9, t); };
  const cob = Ly(c => { c.fillRect(-OFF, 1380, W + 2 * OFF, 600); hole(c, c2 => { const R = mulberry(3); for (let y = 1396; y < 1480; y += 26) for (let x = -40 + (y % 52 ? 30 : 0); x < W + 40; x += 64) { c2.beginPath(); c2.ellipse(x, y, 24 + R() * 4, 8, 0, 0, TAU); c2.fill(); } }); }, '#1c0a08', .8);
  cob.back = c => { c.fillStyle = 'rgba(255,170,90,.28)'; c.fillRect(-OFF, 1380, W + 2 * OFF, 120); };
  const her = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { dancer(c, 540, 1440, 2.1, t, { ph: .4, sp: 1.05 }); for (const [x, f] of [[180, 1], [900, -1]]) { c.save(); c.globalAlpha = .9; dancer(c, x, 1440, .95, 0, { man: x > 500, tired: 1, shoes: false, flip: f }); c.restore(); } } });
  return { layers: [sky, far, lane, cob, her, frontBand('#0a0504', 7)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.12, ss(seg(t, 9.77, 16.73))) }),
    over: (c, t) => strip(c, t, 11.6, .9, 'FRAU TROFFEA · JULY 1518', 540, 250, 42, { col: '#ffd59a', t1: 16.5 }) };
});
// 3 · THE MADNESS SPREADS — dozens join; then exhaustion, while the town watches from its windows
addScene(16.73, 24.1, () => {
  const sky = Ly(SK('#2a0c14', '#d8703a', [{ x: 300, y: 900, r: 600, col: 'rgba(255,170,100,.45)' }]), '#000', 0, { raw: true });
  const far = Ly(c => { skylineFar(c, 1050, 33, 80, 200, false); cathedral(c, 820, 1060, .7); }, '#4a1a1a', .25, { glow: { x: 300, y: 900, r: 600, col: '#ff9a5a', a: .25 } }); far.back = (c, t) => cathBack(c, 820, 1060, .7, '#ffd08a', .9);
  const rowA = townRow(21, 1150, -80, 1160, 300, 440), houses = Ly(c => drawRow(c, rowA), '#260c0c', .5, { rimA: .35 });
  houses.back = (c, t) => rowBack(c, rowA, '#ffc070', .95, t, true);   // faces in the windows
  const crowd = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { const tr = ss(seg(t, 20.4, 23.0));
    for (let i = 0; i < 8; i++) dancer(c, 80 + i * 132, 1330, .78, t, { ph: i * 1.7, man: i % 3 === 1, flip: i % 2 ? -1 : 1, col: '#1d0b09', tired: tr * .9, sp: .85 + (i % 3) * .1 });
    for (let i = 0; i < 6; i++) dancer(c, 60 + i * 192, 1470, 1.15, t, { ph: i * 2.3 + 1, man: i % 2 === 1, flip: i % 2 ? 1 : -1, tired: tr, sp: .95 + (i % 2) * .1 }); } });
  return { layers: [sky, far, houses, haze(960, 1500, '#ffa860', .92), crowd, frontBand('#0a0504', 11)], cam: t => ({ x: lerp(-24, 24, ss(seg(t, 16.73, 24.1))), y: 0, z: lerp(1.04, 1.1, ss(seg(t, 16.73, 24.1))) }),
    over: (c, t) => strip(c, t, 17.6, .9, 'DOZENS JOIN HER', 540, 250, 46, { col: '#ffd59a', t1: 20.6 }) };
});
// 4 · THE DOCTORS — a blazing sun, a physician reading his flask; then night, and the stars
addScene(24.1, 31.55, () => {
  const nt = t => ss(seg(t, 27.2, 28.8));
  const sky = Ly(SK('#4a1410', '#f7b050', [{ x: 700, y: 520, r: 620, col: 'rgba(255,220,150,.75)' }]), '#000', 0, { raw: true, front: (c, t) => { sunDisc(c, 700, 520, 170, '#fff0c0', 1 - nt(t)); night(c, nt(t) * .82);
    const a = nt(t); if (a > 0) { c.save(); c.globalAlpha = a; c.strokeStyle = '#f2e2b0'; c.lineWidth = 4; c.shadowColor = '#f2e2b0'; c.shadowBlur = 16; const cx = 540, cy = 640, rot = t * .08; for (const r of [300, 380]) { c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke(); }
      for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + rot; c.beginPath(); c.moveTo(cx + Math.cos(an) * 300, cy + Math.sin(an) * 300); c.lineTo(cx + Math.cos(an) * 380, cy + Math.sin(an) * 380); c.stroke(); c.fillStyle = '#ffeec0'; starPath(c, cx + Math.cos(an + TAU / 24) * 340, cy + Math.sin(an + TAU / 24) * 340, 18); c.fill(); }
      const R = mulberry(8); for (let i = 0; i < 40; i++) { c.globalAlpha = a * (.4 + .6 * R()) * (.7 + .3 * Math.sin(t * 3 + i)); c.beginPath(); c.arc(R() * W, R() * 1100, 1.5 + R() * 2.5, 0, TAU); c.fill(); } c.restore(); } } });
  const far = Ly(c => { skylineFar(c, 1180, 41, 60, 170, false); cathedral(c, 240, 1180, .6); }, '#4a1c18', .3); far.back = (c, t) => cathBack(c, 240, 1180, .6, '#ffd08a', .85);
  const doc = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => {   // the physician: long robe, round cap, flask raised to the light
    c.save(); c.translate(340, 1470); c.scale(1.9, 1.9); c.fillStyle = '#0c0806'; c.strokeStyle = '#0c0806'; c.lineCap = 'round';
    poly0(c, [[-30, -206], [30, -206], [50, -186], [56, -120], [70, 0], [-70, 0], [-56, -120], [-50, -186]]); c.fill(); poly0(c, [[-50, -186], [-70, -110], [-48, -100], [-40, -150]]); c.fill(); c.fillRect(-7, -218, 14, 16); c.beginPath(); c.ellipse(0, -238, 23, 27, 0, 0, TAU); c.fill(); poly0(c, [[-20, -228], [20, -228], [14, -196], [0, -186], [-14, -196]]); c.fill();
    c.beginPath(); c.ellipse(0, -262, 44, 11, 0, 0, TAU); c.fill(); c.fillRect(-28, -284, 56, 24); c.beginPath(); c.ellipse(0, -284, 28, 7, 0, 0, TAU); c.fill(); c.lineWidth = 22; c.beginPath(); c.moveTo(34, -190); c.lineTo(72, -232); c.stroke(); c.lineWidth = 12; c.beginPath(); c.moveTo(72, -232); c.lineTo(96, -290); c.stroke(); c.restore();
    const fx = 340 + 96 * 1.9, fy = 1470 - 318 * 1.9; c.save(); c.fillStyle = '#ffd27a'; c.shadowColor = '#ffb040'; c.shadowBlur = 30 * flick(t); c.beginPath(); c.ellipse(fx, fy, 34, 40, 0, 0, TAU); c.fill(); c.fillRect(fx - 10, fy - 70, 20, 36); c.restore();
    dancer(c, 860, 1470, .9, t, { ph: 2, flip: -1 }); } });
  return { layers: [sky, far, haze(1100, 1500, '#ffb468', .55), doc, frontBand('#0a0504', 13)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 24.1, 31.55))) }),
    over: (c, t) => { strip(c, t, 25.0, .8, 'THE SUMMER HEAT?', 540, 250, 44, { col: '#ffd59a', t1: 27.4 }); strip(c, t, 28.6, .8, 'THE STARS?', 540, 250, 44, { col: '#f2e2b0', t1: 31.4 }); } };
});
// 5 · THE CITY'S RESPONSE — the council's edict nailed up; the drums silenced
addScene(31.55, 38.87, () => {
  const sky = Ly(SK('#1c0c10', '#7a3020', [{ x: 540, y: 700, r: 600, col: 'rgba(255,170,100,.35)' }]), '#000', 0, { raw: true });
  const hall = Ly(c => { c.fillRect(-OFF, 380, W + 2 * OFF, 1600); poly0(c, [[-OFF, 390], [540, 120], [W + OFF, 390]]); c.fill(); hole(c, c2 => { for (const x of [150, 930]) { archPath(c2, x, 480, 120, 420); c2.fill(); } }); }, '#2a100c', .4, { rimA: .3 });
  hall.back = (c, t) => { c.fillStyle = rgba('#ffb060', .8 * flick(t)); for (const x of [150, 930]) { archPath(c, x, 480, 124, 424); c.fill(); } };
  const edict = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => {
    const p = ss(seg(t, 31.8, 32.8)), y0 = lerp(-700, 0, p); c.save(); c.translate(0, y0);
    bloom(c, c2 => c2.fillRect(250, 420, 580, 620), '#ffd9a0', .35, 40); c.fillStyle = '#ecdcb4'; c.fillRect(250, 420, 580, 620); c.fillStyle = '#d8c497'; c.fillRect(250, 420, 580, 26); c.fillRect(250, 1014, 580, 26);
    c.fillStyle = '#2a1a10'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '600 58px "IM Fell English SC"'; c.fillText('BY ORDER', 540, 510); c.font = '400 30px "IM Fell English SC"'; c.fillText('OF THE COUNCIL OF STRASBOURG', 540, 575);
    c.fillRect(330, 625, 420, 4); c.font = '600 72px "IM Fell English SC"'; c.fillText('NO DANCING', 540, 720); c.fillText('NO DRUMS', 540, 830);
    c.fillStyle = SHOE; c.shadowColor = SHOE; c.shadowBlur = 18; c.beginPath(); c.arc(690, 950, 46, 0, TAU); c.fill(); c.shadowBlur = 0; c.fillStyle = '#9c2a1c'; c.beginPath(); c.arc(690, 950, 30, 0, TAU); c.fill(); c.restore();
    // the drum below, struck out
    c.save(); c.translate(540, 1300); c.fillStyle = '#0c0806'; c.fillRect(-170, -100, 340, 190); c.beginPath(); c.ellipse(0, -100, 170, 44, 0, 0, TAU); c.fill(); c.strokeStyle = '#ffb060'; c.globalAlpha = .55; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-160 + i * 64, -80); c.lineTo(-128 + i * 64, 80); c.lineTo(-96 + i * 64, -80); c.stroke(); } c.globalAlpha = 1;
    c.strokeStyle = '#0c0806'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(80, -150); c.lineTo(230, -300); c.moveTo(-80, -150); c.lineTo(-230, -300); c.stroke();
    const x = ss(seg(t, 35.4, 36.2)); if (x > 0) { c.strokeStyle = SHOE; c.shadowColor = SHOE; c.shadowBlur = 24; c.lineWidth = 26; c.beginPath(); c.moveTo(-240, -260); c.lineTo(-240 + 480 * x, -260 + 420 * x); if (x > .5) { const y2 = (x - .5) * 2; c.moveTo(240, -260); c.lineTo(240 - 480 * y2, -260 + 420 * y2); } c.stroke(); } c.restore(); } });
  return { layers: [sky, hall, edict, frontBand('#0a0504', 17)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 31.55, 38.87))) }) };
});
// 6 · DANCING UNTIL DEATH? — the danse macabre under a blood moon; she falls; the numbers are disputed
addScene(38.87, 47.18, () => {
  const sky = Ly(SK('#12060a', '#4a1416', [{ x: 540, y: 560, r: 620, col: 'rgba(220,80,60,.4)' }]), '#000', 0, { raw: true, front: c => sunDisc(c, 540, 560, 190, '#e0644a') });
  const far = Ly(c => { skylineFar(c, 1150, 52, 70, 190, false); cathedral(c, 180, 1150, .55); }, '#24090c', .3); far.back = (c, t) => cathBack(c, 180, 1150, .55, '#ff8a60', .7);
  const pair = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { const f = ss(seg(t, 42.4, 43.6)); skel(c, 380, 1460, 1.9, t, .3); dancer(c, lerp(700, 760, f), 1460, 1.85, t, { ph: .3, flip: -1, fall: f, tired: f }); } });
  return { layers: [sky, far, haze(980, 1500, '#e0563c', .7), pair, frontBand('#060203', 19)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 38.87, 47.18))) }),
    over: (c, t) => { strip(c, t, 40.6, .8, 'HUNDREDS AFFECTED?', 540, 230, 44, { col: '#ffb8a0', t1: 44.6 }); strip(c, t, 44.9, .8, 'DEATHS · DISPUTED', 540, 230, 50, { col: '#ffd59a', t1: 47.0 }); } };
});
// 7 · THE CURSE OF SAINT VITUS — the sufferers carried up the hill to his shrine
addScene(47.18, 54.09, () => {
  const sky = Ly(SK('#0c1028', '#5a5288', [{ x: 780, y: 520, r: 620, col: 'rgba(255,220,160,.5)' }, { x: 300, y: 1100, r: 520, col: 'rgba(200,170,230,.35)' }]), '#000', 0, { raw: true });
  const hills = Ly(c => cloudBand(c, 980, 61, 120), '#1a1a34', .25);
  const hill = Ly(c => { poly0(c, [[-OFF, 1600], [-OFF, 1300], [400, 1000], [780, 760], [W + OFF, 700], [W + OFF, 1600]]); c.fill(); c.fillRect(700, 520, 170, 260); poly0(c, [[690, 525], [785, 420], [880, 525]]); c.fill(); c.fillRect(781, 330, 8, 100); c.fillRect(760, 360, 50, 8);
    hole(c, c2 => { archPath(c2, 785, 640, 56, 140); c2.fill(); c2.beginPath(); c2.arc(785, 580, 16, 0, TAU); c2.fill(); }); }, '#0e0c1c', .55, { rimA: .3 });
  hill.back = (c, t) => { c.fillStyle = rgba('#ffd08a', .95 * flick(t)); archPath(c, 785, 640, 60, 144); c.fill(); c.beginPath(); c.arc(785, 580, 18, 0, TAU); c.fill(); };
  const rays = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => {
    c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const a = -Math.PI + i / 15 * Math.PI, l = 300 + 60 * Math.sin(t * 2 + i); c.strokeStyle = `rgba(255,214,150,${.12 + .06 * Math.sin(t * 3 + i)})`; c.lineWidth = 10; c.beginPath(); c.moveTo(785 + Math.cos(a) * 140, 560 + Math.sin(a) * 140); c.lineTo(785 + Math.cos(a) * l, 560 + Math.sin(a) * l); c.stroke(); } c.restore();
    for (let i = 0; i < 7; i++) { const u = clamp(((t - 47.18) * .04 + i * .1) % 1), x = lerp(20, 640, u), y = (x < 400 ? lerp(1300, 1000, (x + OFF) / (400 + OFF)) : lerp(1000, 760, (x - 400) / 380)) + 6, kk = lerp(1.05, .6, u); dancer(c, x, y, kk, t, { man: i % 2 === 1, tired: i % 3 === 0 ? 0 : .85, ph: i * 1.9, lean: .25, shoes: i % 3 === 0 }); } } });
  return { layers: [sky, hills, hill, rays, frontBand('#05040c', 23)], cam: t => ({ x: lerp(-20, 20, ss(seg(t, 47.18, 54.09))), y: 0, z: lerp(1.0, 1.08, ss(seg(t, 47.18, 54.09))) }),
    over: (c, t) => strip(c, t, 48.0, .9, 'THE CURSE OF SAINT VITUS', 540, 230, 46, { col: '#ffe2a8', t1: 53.9 }) };
});
// 8 · THE FINAL TWIST — one dancer under the moon slows and vanishes; only the red shoes remain
addScene(54.09, 62.2, () => {
  const sky = Ly(SK('#0a0c1c', '#3a2a40', [{ x: 540, y: 700, r: 640, col: 'rgba(240,230,200,.5)' }]), '#000', 0, { raw: true, front: c => sunDisc(c, 540, 720, 260, '#efe6cc') });
  const far = Ly(c => { skylineFar(c, 1240, 77, 70, 180, false); cathedral(c, 860, 1240, .6); }, '#16121e', .3); far.back = (c, t) => cathBack(c, 860, 1240, .6, '#ffd08a', .7);
  const last = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { const v = ss(seg(t, 58.6, 60.2)); dancer(c, 545, 1436, 2.3, t, { ph: .8, tired: ss(seg(t, 55.5, 58.4)) * .7, a: 1 - v, shoes: false });
    c.save(); c.fillStyle = SHOE; c.shadowColor = SHOE; c.shadowBlur = 30 + 14 * Math.sin(t * 3); c.beginPath(); c.ellipse(494, 1446, 48, 20, -.08, 0, TAU); c.ellipse(596, 1452, 48, 20, .08, 0, TAU); c.fill(); c.restore(); } });
  return { layers: [sky, far, last, frontBand('#06050a', 29)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 54.09, 62.2))) }),
    over: (c, t) => { strip(c, t, 58.4, 1.0, 'THE CAUSE', 540, 290, 60, { col: '#ffe2a8' }); strip(c, t, 59.2, 1.0, 'REMAINS UNKNOWN.', 540, 400, 60, { col: '#ffe2a8' }); } };
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

