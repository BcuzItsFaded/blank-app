// Las Poquianchis (long version): a paper-cut lightbox film, 1080x1920. Documented case; violence implied, never shown in detail. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70, TAU = Math.PI * 2;
window.DUR = 140.4;

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
  ['v01', 0.35, 9.033, "In the 1950s, four sisters in central Mexico ran some of the most feared brothels in the country. People called them Las Poquianchis."],
  ['v02', 9.88, 10.508, "Delfina, Carmen, María Luisa and María de Jesús González Valenzuela grew up in Jalisco, daughters of a violent, hard-drinking small-town policeman."],
  ['v03', 20.89, 5.517, "When he shot a man, the family fled, changed its surname, and settled in Guanajuato."],
  ['v04', 26.91, 11.548, "Delfina, the eldest, opened their first bar. A back room soon made more money than the bar itself. Before long, they ran brothels across Jalisco, Guanajuato, and Querétaro."],
  ['v05', 38.96, 6.558, "Their trap was simple: a newspaper ad. Housemaid wanted. Poor young women answered it… and never came home."],
  ['v06', 46.01, 9.217, "Inside, they were locked in, forced to work, and beaten. Debts they could never repay kept them there. Those who got sick, or became inconvenient, disappeared."],
  ['v07', 55.73, 8.042, "A former army captain, Delfina's partner, guarded the doors. And according to later accounts, some local officials looked the other way."],
  ['v08', 64.27, 6.97, "In 1964, a young woman named Catalina Ortega escaped, and reached the police in León."],
  ['v09', 71.74, 5.489, "Officers went to the sisters' ranch near San Francisco del Rincón… and started digging."],
  ['v10', 77.73, 9.398, "Delfina and María de Jesús were arrested. María Luisa fled at the last moment. The tabloid press splashed the story across Mexico."],
  ['v11', 87.63, 10.754, "Reports claimed ninety-one bodies: women, men, even unborn children. Historians still argue over the true number. Some say only eight victims were ever confirmed."],
  ['v12', 98.88, 6.799, "The surviving sisters were each sentenced to forty years in prison. Carmen had died of cancer years before."],
  ['v13', 106.18, 12.91, "Delfina died in prison in 1968, in a strange accident. María Luisa died behind bars in 1984. María de Jesús was eventually released… and vanished from public view."],
  ['v14', 119.59, 11.099, "Mexico never stopped retelling the story: in Felipe Cazals' 1976 film, in Jorge Ibargüengoitia's novel Las Muertas, and in a 2025 series."],
  ['v15', 131.19, 7.928, "For more than a decade, everyone knew what those houses were. Nobody asked where the girls went. This is Plot Twist with A&R."],
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

// ---------- San Miguel Canoa helpers ----------
const FIRE = '#ff8a2a', INKC = '#05060a';
function volcano(c, base, x0 = -OFF, x1 = W + OFF) { c.beginPath(); c.moveTo(x0, base); c.lineTo(x0, base - 120); c.quadraticCurveTo(220, base - 240, 400, base - 520); c.lineTo(450, base - 600); c.lineTo(490, base - 570); c.lineTo(530, base - 640); c.lineTo(580, base - 590); c.lineTo(630, base - 610); c.quadraticCurveTo(820, base - 300, x1, base - 140); c.lineTo(x1, base); c.closePath(); c.fill(); }
function adobe(c, x, base, w, h) { c.fillRect(x, base - h, w, h + 400); for (let i = 0; i < 4; i++) c.fillRect(x + 10 + i * (w - 30) / 3, base - h - 8, 10, 10); hole(c, c2 => { c2.fillRect(x + w * .38, base - h * .62, w * .24, h * .62); c2.fillRect(x + w * .1, base - h * .7, w * .14, h * .22); }); }
function adobeBack(c, x, base, w, h, a, t) { c.fillStyle = rgba('#ffb060', a * flick(t + x)); c.fillRect(x + w * .1, base - h * .7, w * .14, h * .22); c.fillStyle = rgba('#ffb060', a * .5); c.fillRect(x + w * .38, base - h * .62, w * .24, h * .62); }
function church(c, x, base, s) { c.fillRect(x - 180 * s, base - 300 * s, 360 * s, 300 * s + 400); poly0(c, [[x - 190 * s, base - 300 * s], [x - 60 * s, base - 380 * s], [x + 70 * s, base - 300 * s]]); c.fill();
  c.fillRect(x + 80 * s, base - 620 * s, 120 * s, 620 * s); c.fillRect(x + 70 * s, base - 630 * s, 140 * s, 16 * s); c.beginPath(); c.arc(x + 140 * s, base - 630 * s, 44 * s, Math.PI, TAU); c.fill(); c.fillRect(x + 136 * s, base - 730 * s, 8 * s, 70 * s); c.fillRect(x + 118 * s, base - 712 * s, 44 * s, 8 * s);
  hole(c, c2 => { archPath(c2, x + 140 * s, base - 560 * s, 64 * s, 120 * s); c2.fill(); archPath(c2, x - 60 * s, base - 200 * s, 90 * s, 200 * s); c2.fill(); c2.beginPath(); c2.arc(x - 60 * s, base - 290 * s, 24 * s, 0, TAU); c2.fill(); }); }
function bell(c, x, y, s, ang, glow = 0) { c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s); if (glow) { c.shadowColor = '#ffc070'; c.shadowBlur = 30 * glow; } c.fillStyle = '#c89a52'; c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-30, 10, -32, 60); c.quadraticCurveTo(-36, 90, -52, 100); c.lineTo(52, 100); c.quadraticCurveTo(36, 90, 32, 60); c.quadraticCurveTo(30, 10, 14, 0); c.closePath(); c.fill(); c.shadowBlur = 0; c.fillStyle = '#5a3c18'; c.beginPath(); c.arc(0, 108, 10, 0, TAU); c.fill(); c.restore(); }
function rain(c, t, n, a = .35, seed = 3, ang = .22) { const R = mulberry(seed); c.save(); c.strokeStyle = '#b8c8dc'; c.lineCap = 'round'; for (let i = 0; i < n; i++) { const sp = 1400 + R() * 900, x0 = R() * (W + 400) - 200, ph = R() * 3000, y = ((t * sp + ph) % (H + 300)) - 150, l = 40 + R() * 50; c.globalAlpha = a * (.4 + .6 * R()); c.lineWidth = 1 + R() * 1.6; c.beginPath(); c.moveTo(x0 + y * ang, y); c.lineTo(x0 + (y + l) * ang, y + l); c.stroke(); } c.restore(); }
function flame(c, x, y, k, t, ph) { const f = 1 + .18 * Math.sin(t * 14 + ph) * Math.sin(t * 6 + ph * 2); c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 1, x, y, 110 * k); g.addColorStop(0, 'rgba(255,150,60,.5)'); g.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = g; c.fillRect(x - 110 * k, y - 110 * k, 220 * k, 220 * k); c.restore();
  c.fillStyle = FIRE; c.beginPath(); c.ellipse(x, y - 10 * k * f, 12 * k, 26 * k * f, 0, 0, TAU); c.fill(); c.fillStyle = '#ffd890'; c.beginPath(); c.ellipse(x, y - 6 * k, 6 * k, 13 * k * f, 0, 0, TAU); c.fill(); }
// a villager silhouette; item: 0 none, 1 torch, 2 machete (raised, no blood ever shown)
function villager(c, x, y, k, t, ph, item = 1, hat = 1) { const sw = Math.sin(t * 2.2 + ph) * .06; c.save(); c.translate(x, y); c.rotate(sw); c.scale(k, k); c.fillStyle = c.strokeStyle = INKC; c.lineCap = 'round';
  c.lineWidth = 16; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 12, -104); c.lineTo(s * 18, -4); c.stroke(); } poly0(c, [[-26, -206], [26, -206], [36, -96], [-36, -96]]); c.fill(); c.beginPath(); c.ellipse(0, -232, 22, 26, 0, 0, TAU); c.fill();
  if (hat) { c.beginPath(); c.ellipse(0, -252, 46, 9, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -262, 22, 16, 0, Math.PI, TAU); c.fill(); } else { c.beginPath(); c.ellipse(0, -240, 24, 22, 0, Math.PI, TAU); c.fill(); }
  c.lineWidth = 12; const up = Math.sin(t * 3 + ph) * .15; c.beginPath(); c.moveTo(22, -192); c.lineTo(40, -250 + up * 30); c.lineTo(46, -300 + up * 40); c.stroke(); c.beginPath(); c.moveTo(-22, -192); c.lineTo(-30, -110); c.stroke();
  if (item === 2) { c.save(); c.translate(46, -300 + up * 40); c.rotate(-.5); poly0(c, [[-4, 0], [6, 0], [10, -90], [0, -110], [-6, -90]]); c.fill(); c.restore(); }
  c.restore(); if (item === 1) { c.save(); c.strokeStyle = INKC; c.lineWidth = 6 * k; const hx = x + 46 * k, hy = y - (300 - Math.sin(t * 3 + ph) * 6) * k; c.beginPath(); c.moveTo(hx, hy + 20 * k); c.lineTo(hx, hy - 40 * k); c.stroke(); c.restore(); flame(c, x + 46 * k, y - (340 - Math.sin(t * 3 + ph) * 6) * k, k, t, ph); } }
function hiker(c, x, y, k, t, ph, walk = 1) { const w = t * 6 + ph, st = walk ? Math.sin(w) : 0; c.save(); c.translate(x, y - Math.abs(st) * 4 * k); c.scale(k, k); c.fillStyle = c.strokeStyle = INKC; c.lineCap = 'round';
  c.lineWidth = 15; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 10, -104); c.lineTo(s * 10 + s * st * 22, -54); c.lineTo(s * 14 + s * st * 30, -4); c.stroke(); }
  poly0(c, [[-24, -200], [24, -200], [32, -100], [-32, -100]]); c.fill(); blob(c, [[-58, -204], [-20, -206], [-18, -110], [-56, -114]]); c.fillRect(-52, -230, 30, 28);   // backpack + bedroll
  c.beginPath(); c.ellipse(0, -228, 21, 25, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(4, -248, 26, 12, 0, Math.PI, TAU); c.fill();
  c.lineWidth = 11; c.beginPath(); c.moveTo(20, -190); c.lineTo(30 + st * 14, -130); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(34 + st * 14, -140); c.lineTo(48 + st * 14, 0); c.stroke(); c.restore(); }

// ---------- Clipperton helpers ----------
const CRAB = '#e8642a', BEAM = '#ffe6a0';
function seaBands(c, t, y0, col = '#9fd0d8', a = .35, seed = 3) { c.save(); c.strokeStyle = col; c.lineCap = 'round'; const R = mulberry(seed); for (let i = 0; i < 26; i++) { const y = y0 + Math.pow(R(), 1.6) * (H - y0), x = ((R() * W + t * (8 + R() * 14)) % (W + 200)) - 100, l = 40 + R() * 140 * (y - y0) / (H - y0) + 20; c.globalAlpha = a * (.4 + .6 * R()); c.lineWidth = 1.5 + 3 * (y - y0) / (H - y0); c.beginPath(); c.moveTo(x, y + Math.sin(t * 2 + i) * 2); c.lineTo(x + l, y + Math.sin(t * 2 + i + 1) * 2); c.stroke(); } c.restore(); }
// the atoll seen from the sea: a low ring of coral and palms, and the dark volcanic rock with its lighthouse
function atoll(c, x, base, s) { c.beginPath(); c.moveTo(x - 520 * s, base); c.quadraticCurveTo(x, base - 30 * s, x + 520 * s, base); c.lineTo(x + 520 * s, base + 14 * s); c.quadraticCurveTo(x, base - 6 * s, x - 520 * s, base + 14 * s); c.closePath(); c.fill();
  for (let i = 0; i < 14; i++) { const px = x - 480 * s + i * 72 * s, h = (40 + (i * 37 % 30)) * s; c.fillRect(px - 2 * s, base - h, 4 * s, h); for (let f = 0; f < 5; f++) { const a = -Math.PI / 2 + (f - 2) * .6; c.beginPath(); c.ellipse(px + Math.cos(a) * 12 * s, base - h + Math.sin(a) * 6 * s + 4 * s, 14 * s, 3 * s, a, 0, TAU); c.fill(); } }
  const rx = x + 230 * s; c.beginPath(); c.moveTo(rx - 90 * s, base - 4 * s); c.lineTo(rx - 50 * s, base - 90 * s); c.lineTo(rx - 10 * s, base - 120 * s); c.lineTo(rx + 40 * s, base - 100 * s); c.lineTo(rx + 90 * s, base - 4 * s); c.closePath(); c.fill(); c.fillRect(rx - 6 * s, base - 170 * s, 12 * s, 54 * s); c.fillRect(rx - 10 * s, base - 182 * s, 20 * s, 14 * s); }
function lampAt(x, base, s) { return [x + 230 * s, base - 176 * s]; }
function beam(c, x, y, ang, len, a, w = .14) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 4, x, y, len); g.addColorStop(0, rgba(BEAM, .55 * a)); g.addColorStop(1, rgba(BEAM, 0)); c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, ang - w, ang + w); c.closePath(); c.fill(); c.fillStyle = rgba(BEAM, .9 * a); c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); c.restore(); }
function hut(c, x, base, w, h) { c.fillRect(x, base - h, w, h + 400); poly0(c, [[x - 14, base - h], [x + w / 2, base - h - w * .38], [x + w + 14, base - h]]); c.fill(); hole(c, c2 => { c2.fillRect(x + w * .4, base - h * .7, w * .2, h * .7); c2.fillRect(x + w * .1, base - h * .75, w * .16, h * .22); }); }
function flagMX(c, x, base, h, t) { c.save(); c.fillStyle = '#0a0a0e'; c.fillRect(x - 3, base - h, 6, h); const fw = 120, fh = 72, y = base - h + 4; for (let i = 0; i < 3; i++) { c.fillStyle = ['#1f8a4a', '#f2ece0', '#c8323a'][i]; c.beginPath(); for (let k = 0; k <= 10; k++) { const u = k / 10, xx = x + 3 + (i + u) * fw / 3, wv = Math.sin(t * 4 + (i + u) * 2.2) * 6 * (i + u) / 3; k ? c.lineTo(xx, y + wv) : c.moveTo(xx, y + wv); } for (let k = 10; k >= 0; k--) { const u = k / 10, xx = x + 3 + (i + u) * fw / 3, wv = Math.sin(t * 4 + (i + u) * 2.2) * 6 * (i + u) / 3; c.lineTo(xx, y + fh + wv); } c.closePath(); c.fill(); } c.restore(); }
function crabs(c, t, n, y0, y1, seed, a = 1) { const R = mulberry(seed); c.save(); c.globalAlpha = a; c.fillStyle = CRAB; c.strokeStyle = CRAB; c.lineWidth = 2; for (let i = 0; i < n; i++) { const x = ((R() * W + t * (6 + R() * 18) * (R() > .5 ? 1 : -1)) % W + W) % W, y = y0 + R() * (y1 - y0), s = .6 + R() * .8 * (y - y0) / (y1 - y0 + 1) + .3; c.beginPath(); c.ellipse(x, y, 9 * s, 6 * s, 0, 0, TAU); c.fill(); for (const d of [-1, 1]) for (let l = 0; l < 3; l++) { c.beginPath(); c.moveTo(x + d * 6 * s, y + (l - 1) * 3 * s); c.lineTo(x + d * 14 * s, y + (l - 1) * 5 * s + 4 * s); c.stroke(); } } c.restore(); }
function woman(c, x, y, k, o = {}) { dancer(c, x, y, k, 0, Object.assign({ tired: 1, shoes: false }, o)); }
function gunboat(c, x, base, s, t) { c.save(); c.fillStyle = '#0a0c12'; c.beginPath(); c.moveTo(x - 260 * s, base - 30 * s); c.lineTo(x + 280 * s, base - 30 * s); c.lineTo(x + 230 * s, base + 10 * s); c.lineTo(x - 230 * s, base + 10 * s); c.closePath(); c.fill(); c.fillRect(x - 140 * s, base - 70 * s, 240 * s, 42 * s); c.fillRect(x - 60 * s, base - 130 * s, 26 * s, 64 * s); c.fillRect(x + 10 * s, base - 130 * s, 26 * s, 64 * s);
  c.fillRect(x - 200 * s, base - 230 * s, 6 * s, 200 * s); c.fillRect(x + 160 * s, base - 210 * s, 6 * s, 180 * s); c.fillRect(x - 230 * s, base - 190 * s, 60 * s, 4 * s); c.fillStyle = 'rgba(70,76,90,.45)';
  for (let k = 0; k < 6; k++) { const u = ((t * .3 + k / 6) % 1); for (const fx of [-47, 23]) { c.beginPath(); c.arc(x + fx * s - u * 140 * s, base - 140 * s - u * 120 * s, (10 + u * 30) * s, 0, TAU); c.fill(); } } c.restore(); }

// ---------- shared props for the three true-crime episodes ----------
const PAPERC = '#efe6cf', INKP = '#1a140e';
function facade(c, x, base, w, h, o = {}) { c.fillRect(x, base - h, w, h + 400); c.fillRect(x - 8, base - h - 10, w + 16, 14); if (o.dome) { c.beginPath(); c.ellipse(x + w / 2, base - h - 10, w * .3, w * .3, 0, Math.PI, TAU); c.fill(); }
  hole(c, c2 => { const n = Math.max(1, Math.round(w / 110)); for (let i = 0; i < n; i++) { const wx = x + (i + .5) * w / n; for (let f = 0; f < Math.max(1, Math.floor(h / 150)); f++) { archPath(c2, wx, base - h + 40 + f * 150, 40, 80); c2.fill(); } } if (o.door) { archPath(c2, x + w / 2, base - 150, 70, 150); c2.fill(); } }); }
function facadeBack(c, x, base, w, h, col, a, t, o = {}) { const n = Math.max(1, Math.round(w / 110)); for (let i = 0; i < n; i++) { const wx = x + (i + .5) * w / n; for (let f = 0; f < Math.max(1, Math.floor(h / 150)); f++) { const on = ((i * 3 + f * 5 + Math.round(x)) % 4) !== 0; c.fillStyle = rgba(col, on ? a * flick(t + i + f) : a * .12); archPath(c, wx, base - h + 40 + f * 150, 42, 82); c.fill(); } } if (o.door) { c.fillStyle = rgba(o.doorCol || col, a); archPath(c, x + w / 2, base - 150, 72, 152); c.fill(); } }
function bars(c, x, y, w, h, n = 6, lw = 9) { c.save(); c.strokeStyle = c.fillStyle; c.lineWidth = lw; for (let i = 0; i <= n; i++) { const xx = x + i * w / n; c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + h); c.stroke(); } c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(x, y + h * .5); c.lineTo(x + w, y + h * .5); c.stroke(); c.restore(); }
function redLamp(c, x, y, k, t, a = 1) { c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 2, x, y, 160 * k); g.addColorStop(0, `rgba(255,60,50,${.6 * flick(t)})`); g.addColorStop(1, 'rgba(255,60,50,0)'); c.fillStyle = g; c.fillRect(x - 160 * k, y - 160 * k, 320 * k, 320 * k); c.restore(); c.save(); c.globalAlpha = a; c.fillStyle = '#ff5a48'; c.beginPath(); c.ellipse(x, y, 14 * k, 18 * k, 0, 0, TAU); c.fill(); c.fillStyle = '#0a0606'; c.fillRect(x - 3 * k, y - 34 * k, 6 * k, 18 * k); c.restore(); }
function newspaper(c, x, y, w, h, rot, a, lines) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 30; c.shadowOffsetY = 14; c.fillStyle = PAPERC; c.fillRect(-w / 2, -h / 2, w, h); c.shadowColor = 'transparent';
  c.fillStyle = INKP; c.textAlign = 'center'; c.textBaseline = 'top'; let yy = -h / 2 + 24; for (const L of lines) { if (L.rule) { c.fillRect(-w / 2 + 24, yy, w - 48, L.rule); yy += L.rule + 10; continue; } if (L.box) { c.strokeStyle = INKP; c.lineWidth = 4; c.strokeRect(-w / 2 + 40, yy - 8, w - 80, L.box); } c.font = `${L.w || 400} ${L.s}px "${L.f || 'IM Fell English SC'}"`; c.fillText(L.t, 0, yy); yy += L.s * 1.25; if (L.gap) yy += L.gap; }
  c.globalAlpha = a * .35; for (let r = 0; r < 14; r++) { const ly = yy + 10 + r * 16; if (ly > h / 2 - 20) break; c.fillRect(-w / 2 + 30, ly, (w - 60) * (r % 4 === 3 ? .6 : 1), 5); } c.restore(); }
function aptBlock(c, x, base, w, h) { c.fillRect(x, base - h, w, h + 400); hole(c, c2 => { for (let f = 0; f < Math.floor(h / 70) - 1; f++) for (let i = 0; i < Math.floor(w / 60); i++) c2.fillRect(x + 18 + i * 60, base - h + 26 + f * 70, 30, 36); }); }
function aptBack(c, x, base, w, h, t, seed) { const R = mulberry(seed); for (let f = 0; f < Math.floor(h / 70) - 1; f++) for (let i = 0; i < Math.floor(w / 60); i++) { const on = R() > .55; c.fillStyle = on ? rgba(R() > .5 ? '#ffd890' : '#a8c8f0', .7 * flick(t + i + f)) : 'rgba(30,36,50,.6)'; c.fillRect(x + 16 + i * 60, base - h + 24 + f * 70, 34, 40); } }
function policeLights(c, t, a = 1, y = 0) { if (a <= 0) return; const ph = Math.floor(t * 4) % 2; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter'; for (const [cx, col, on] of [[0, '230,40,40', ph], [W, '40,90,255', 1 - ph]]) { const g = c.createRadialGradient(cx, 1300 + y, 20, cx, 1300 + y, 900); g.addColorStop(0, `rgba(${col},${.5 * a * (on ? 1 : .25)})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(0, 0, W, H); } c.restore(); }
function spotlight(c, x, topY, botY, w, a = .35) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, topY, 0, botY); g.addColorStop(0, `rgba(255,245,220,${a})`); g.addColorStop(1, 'rgba(255,245,220,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x - 30, topY); c.lineTo(x + 30, topY); c.lineTo(x + w / 2, botY); c.lineTo(x - w / 2, botY); c.closePath(); c.fill(); c.restore(); }
function pinkMask(c, x, y, k, a = 1) { c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(k, k); c.shadowColor = '#ff6ab0'; c.shadowBlur = 24; c.fillStyle = '#f070a8'; c.beginPath(); c.ellipse(0, 0, 70, 90, 0, 0, TAU); c.fill(); c.shadowBlur = 0;
  c.fillStyle = '#ffd0e6'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 30, -14, 26, 34, s * .5, 0, TAU); c.fill(); c.beginPath(); c.ellipse(s * 22, 26, 16, 22, -s * .4, 0, TAU); c.fill(); }   // butterfly wings around the eyes
  c.fillStyle = '#1a0a12'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 26, -10, 13, 8, s * .2, 0, TAU); c.fill(); } c.beginPath(); c.ellipse(0, 50, 16, 7, 0, 0, TAU); c.fill(); c.restore(); }
function poster(c, x, y, w, h, rot, a, lines) { newspaper(c, x, y, w, h, rot, a, lines); }
function bridge(c, base) { c.fillRect(-OFF, base - 60, W + 2 * OFF, 40); for (let x = -60; x < W + 60; x += 180) { c.beginPath(); c.moveTo(x, base - 20); c.quadraticCurveTo(x + 90, base + 70, x + 180, base - 20); c.lineTo(x + 180, base); c.quadraticCurveTo(x + 90, base + 50, x, base); c.closePath(); c.fill(); c.fillRect(x - 6, base - 20, 12, 300); } for (let x = -40; x < W + 60; x += 46) c.fillRect(x, base - 92, 5, 34); c.fillRect(-OFF, base - 96, W + 2 * OFF, 6); }
function truck(c, x, base, k, lights = 1) { c.save(); c.translate(x, base); c.scale(k, k); c.fillStyle = '#06070c'; c.fillRect(-150, -70, 300, 50); c.fillRect(-150, -120, 120, 54); c.beginPath(); c.arc(-90, -16, 30, 0, TAU); c.arc(100, -16, 30, 0, TAU); c.fill();
  if (lights) { c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(-150, 0, -700, 0); g.addColorStop(0, 'rgba(255,240,200,.5)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-150, -60); c.lineTo(-700, -140); c.lineTo(-700, 30); c.lineTo(-150, -40); c.closePath(); c.fill(); } c.restore(); }
function cauldron(c, x, base, k, t) { c.save(); c.translate(x, base); c.scale(k, k); c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, -120, 4, 0, -120, 240); g.addColorStop(0, `rgba(255,110,40,${.35 * flick(t)})`); g.addColorStop(1, 'rgba(255,110,40,0)'); c.fillStyle = g; c.fillRect(-240, -360, 480, 480); c.restore();
  c.fillStyle = '#0a0606'; c.beginPath(); c.moveTo(-120, -110); c.lineTo(120, -110); c.quadraticCurveTo(140, 10, 0, 16); c.quadraticCurveTo(-140, 10, -120, -110); c.fill(); c.fillRect(-136, -122, 272, 18); for (const s of [-1, 1]) c.fillRect(s * 70 - 8, 0, 16, 40);
  c.strokeStyle = '#0a0606'; c.lineWidth = 8; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-90 + i * 45, -120); c.lineTo(-110 + i * 55, -230 - (i % 2) * 40); c.stroke(); } c.restore(); }
function smallFlags(c, t, n, y0, y1, seed, a, t0 = 0, dt = .1) { const R = mulberry(seed); for (let i = 0; i < n; i++) { const x = 60 + R() * 960, y = y0 + R() * (y1 - y0), s = .5 + (y - y0) / (y1 - y0 + 1) * .8, aa = a * ss(clamp((t - t0 - i * dt) / .4)); if (aa <= 0) continue; c.save(); c.globalAlpha = aa; c.strokeStyle = '#e8e0d0'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 60 * s); c.stroke(); c.fillStyle = '#f4ece0'; c.beginPath(); c.moveTo(x, y - 60 * s); c.lineTo(x + 34 * s, y - 50 * s); c.lineTo(x, y - 40 * s); c.closePath(); c.fill(); c.restore(); } }
const darkSky = (top, bot, glow) => Ly(SK(top, bot, glow), '#000', 0, { raw: true });

// ---------- long-form helpers: reuse a scene on a new timeline, or write a scene in local time ----------
function remapScene(S, f) { const w = fn => fn && ((c, t) => fn(c, f(t))); for (const L of S.layers) { L.front = w(L.front); L.back = w(L.back); } const cam = S.cam; S.cam = t => cam(f(t)); if (S.over) { const o = S.over; S.over = (c, t) => o(c, f(t)); } return S; }
const addReuse = (a, b, k) => { const [oa, ob, build] = OLD[k]; addScene(a, b, () => remapScene(build(), t => oa + (t - a) / (b - a) * (ob - oa))); };
const addRel = (a, b, build) => addScene(a, b, () => remapScene(build(b - a), t => t - a));
const addReuseX = (a, b, k, extra) => { const [oa, ob, build] = OLD[k]; addScene(a, b, () => { const S = remapScene(build(), t => oa + (t - a) / (b - a) * (ob - oa)); const o = S.over; S.over = (c, t) => { if (o) o(c, t); extra(c, t - a); }; return S; }); };
function frame(c, x, y, w, h, fill) { c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 24; c.fillStyle = '#3a2a1a'; c.fillRect(x - w / 2 - 22, y - h / 2 - 22, w + 44, h + 44); c.shadowBlur = 0; c.fillStyle = fill || '#d8c8a0'; c.fillRect(x - w / 2, y - h / 2, w, h); c.restore(); }
function tag(c, txt, x, y, size, col = '#fff4e8', a = 1) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.font = `600 ${size}px "IM Fell English SC"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 10; c.fillStyle = col; c.fillText(txt, x, y); c.restore(); }

// ---------- darker props (implied violence only: no wounds, no gore) ----------
const BONE = '#e8e0cc', BLOOD = '#a8141c';
function skull(c, x, y, k, a = 1, col = BONE) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(k, k); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 40, 44, 0, 0, TAU); c.fill(); c.fillRect(-24, 28, 48, 26);
  c.fillStyle = '#0c0808'; c.beginPath(); c.ellipse(-15, 0, 11, 13, 0, 0, TAU); c.ellipse(15, 0, 11, 13, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(0, 14); c.lineTo(-6, 26); c.lineTo(6, 26); c.closePath(); c.fill(); for (let i = -2; i <= 2; i++) c.fillRect(i * 9 - 2, 38, 4, 14); c.restore(); }
function bone(c, x, y, len, rot, k = 1, col = BONE) { c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k); c.fillStyle = col; c.fillRect(-len / 2, -6, len, 12); for (const s of [-1, 1]) { c.beginPath(); c.arc(s * len / 2, -7, 9, 0, TAU); c.arc(s * len / 2, 7, 9, 0, TAU); c.fill(); } c.restore(); }
function chalkOutline(c, x, y, k, a = 1) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(k, k); c.strokeStyle = '#f2f2f0'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); c.ellipse(-150, -10, 28, 32, 0, 0, TAU); c.moveTo(-120, -6);
  c.lineTo(-90, -40); c.lineTo(-30, -60); c.lineTo(10, -100); c.moveTo(-30, -60); c.lineTo(60, -40); c.lineTo(150, -70); c.moveTo(60, -40); c.lineTo(70, 20); c.lineTo(160, 40); c.moveTo(70, 20); c.lineTo(-10, 40); c.lineTo(-60, 90); c.moveTo(-10, 40); c.lineTo(-90, 26); c.lineTo(-120, -6); c.stroke(); c.restore(); }
function crimeTape(c, y, rot, a = 1, txt = 'NO PASAR') { if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(540, y); c.rotate(rot); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 12; c.fillStyle = '#f2c81a'; c.fillRect(-800, -32, 1600, 64); c.shadowBlur = 0; c.fillStyle = '#0a0a0a'; c.font = '600 34px "IM Fell English SC"'; c.textBaseline = 'middle'; for (let x = -780; x < 800; x += 300) c.fillText(txt, x, 2); c.restore(); }
function blood(c, x, y, k, t, t0, a = 1) { const u = clamp((t - t0) / 1.6); if (u <= 0) return; c.save(); c.globalAlpha = a; c.fillStyle = BLOOD; c.beginPath(); c.ellipse(x, y + 60 * k * u, 7 * k, 11 * k, 0, 0, TAU); c.fill(); c.fillRect(x - 2.5 * k, y, 5 * k, 60 * k * u); if (u > .9) { c.beginPath(); c.ellipse(x, y + 72 * k, 26 * k * (u - .9) * 10, 6 * k, 0, 0, TAU); c.fill(); } c.restore(); }
function covered(c, x, y, w, k = 1, tagTxt = '') { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = '#d8d4c8'; c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(-w / 2, -50, -w / 2 + 50, -56); c.quadraticCurveTo(0, -48, w / 2 - 40, -40); c.quadraticCurveTo(w / 2, -30, w / 2, 0); c.closePath(); c.fill(); c.fillStyle = 'rgba(80,70,60,.35)'; c.fillRect(-w / 2, -6, w, 6);
  if (tagTxt) { c.fillStyle = '#c8a870'; c.fillRect(w / 2 - 6, -20, 46, 26); c.fillStyle = '#1a1208'; c.font = '600 16px "IM Fell English SC"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tagTxt, w / 2 + 17, -7); } c.restore(); }
function muzzle(c, x, y, k, on) { if (on <= 0) return; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = on; const g = c.createRadialGradient(x, y, 2, x, y, 200 * k); g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(.3, 'rgba(255,160,60,.5)'); g.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = g; c.fillRect(x - 200 * k, y - 200 * k, 400 * k, 400 * k);
  c.fillStyle = '#fff8e0'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = (i % 2 ? 18 : 70) * k; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + r, y); } c.closePath(); c.fill(); c.restore(); }
function cracks(c, x, y, k, a = 1) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.strokeStyle = 'rgba(235,240,250,.85)'; c.lineWidth = 2; const R = mulberry(Math.round(x + y)); for (let i = 0; i < 9; i++) { let px = x, py = y, ang = R() * TAU; c.beginPath(); c.moveTo(px, py); for (let s = 0; s < 4; s++) { ang += (R() - .5) * .8; px += Math.cos(ang) * 30 * k; py += Math.sin(ang) * 30 * k; c.lineTo(px, py); } c.stroke(); } c.beginPath(); c.arc(x, y, 6 * k, 0, TAU); c.fillStyle = '#0a0a10'; c.fill(); c.restore(); }
function scratchMarks(c, x, y, k, a = 1) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.strokeStyle = 'rgba(240,220,200,.8)'; c.lineCap = 'round'; for (let g = 0; g < 3; g++) for (let i = 0; i < 4; i++) { c.lineWidth = 3 * k; c.beginPath(); const ox = x + g * 120 * k + i * 14 * k, oy = y + g * 40 * k; c.moveTo(ox, oy); c.quadraticCurveTo(ox + 6 * k, oy + 60 * k, ox - 4 * k, oy + 130 * k); c.stroke(); } c.restore(); }
function padlock(c, x, y, k) { c.save(); c.translate(x, y); c.scale(k, k); c.strokeStyle = '#8a8470'; c.lineWidth = 10; c.beginPath(); c.arc(0, -30, 30, Math.PI, TAU); c.stroke(); c.fillStyle = '#a89c78'; c.fillRect(-44, -30, 88, 70); c.fillStyle = '#2a2418'; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill(); c.fillRect(-3, 0, 6, 18); c.restore(); }
function shadowFig(c, x, y, k, raise, col = 'rgba(4,4,8,.9)', item = 0) { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 16; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 12, -104); c.lineTo(s * 18, -4); c.stroke(); } poly0(c, [[-28, -206], [28, -206], [38, -96], [-38, -96]]); c.fill(); c.beginPath(); c.ellipse(0, -232, 22, 26, 0, 0, TAU); c.fill();
  c.lineWidth = 13; const a = lerp(.3, 2.9, raise); const ex = 24 + Math.sin(a) * 70, ey = -190 + Math.cos(a) * 70; c.beginPath(); c.moveTo(24, -190); c.lineTo(ex, ey); c.stroke(); if (item === 1) { c.lineWidth = 7; c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo(ex + 60, ey - 40, ex + 110, ey + 10); c.stroke(); } if (item === 2) { c.lineWidth = 5; c.beginPath(); c.moveTo(ex - 30, ey); c.quadraticCurveTo(ex, ey + 30, ex + 40, ey); c.stroke(); } c.restore(); }
function cower(c, x, y, k, col = 'rgba(4,4,8,.9)') { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = col; blob(c, [[-40, 0], [40, 0], [44, -60], [10, -120], [-30, -110], [-46, -50]]); c.beginPath(); c.ellipse(-6, -132, 22, 24, 0, 0, TAU); c.fill(); c.restore(); }
function bill(c, x, y, k, rot, a = 1) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.scale(k, k); c.fillStyle = '#9ab88a'; c.fillRect(-40, -18, 80, 36); c.strokeStyle = '#4a6a3a'; c.lineWidth = 2; c.strokeRect(-34, -13, 68, 26); c.beginPath(); c.ellipse(0, 0, 9, 11, 0, 0, TAU); c.stroke(); c.restore(); }
function evMarker(c, x, y, k, n) { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = '#f2c81a'; poly0(c, [[-22, 0], [22, 0], [14, -40], [-14, -40]]); c.fill(); c.fillStyle = '#0a0a0a'; c.font = '600 24px "IM Fell English SC"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 0, -18); c.restore(); }

const OLD = [];
// ======================================================= SCENES =======================================================
// 1 · LAS POQUIANCHIS — a 1950s Guanajuato street at dusk; four sisters in a red-lit doorway
OLD.push([0, 10.02, () => { const F = [[-40, 1300, 300, 460], [260, 1300, 300, 520], [560, 1300, 280, 440], [840, 1300, 300, 500]];
  const sky = darkSky('#1a0e14', '#c87050', [{ x: 540, y: 1000, r: 700, col: 'rgba(255,170,110,.45)' }]);
  const far = Ly(c => { skylineFar(c, 1040, 33, 80, 180, false); facade(c, 420, 1040, 240, 260, { dome: 1 }); }, '#3a1e1e', .25, { rimA: .3, rim: '#ffc8a0' });
  const st = Ly(c => F.forEach(([x, b, w, h]) => facade(c, x, b, w, h, { door: x === 260 })), '#1a0e0e', .55, { rimA: .35, rim: '#ffc8a0' });
  st.back = (c, t) => F.forEach(([x, b, w, h]) => facadeBack(c, x, b, w, h, '#ffc070', .55, t, { door: x === 260, doorCol: '#ff4a3a' }));
  const fg = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { redLamp(c, 410, 1080, 1.1, t); for (let i = 0; i < 4; i++) woman(c, 360 + i * 34, 1300, .62, { col: '#0a0606', flip: i % 2 ? -1 : 1 }); dust(c, t, 30, 81, .3); } });
  return { layers: [sky, far, st, haze(1150, 1500, '#c86040', .3), fg, frontBand('#0a0606', 3)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, 10))) }),
    over: (c, t) => { strip(c, t, .1, .8, 'PLOT TWIST WITH A&R  ·  EPISODE 25', 540, 150, 30, { col: '#ffe2c8', font: 'Cormorant Garamond', t1: 7.0 }); strip(c, t, .4, 1.0, 'LAS POQUIANCHIS', 540, 290, 70, { col: '#fff0e0', t1: 7.0 }); strip(c, t, 1.4, .9, 'GUANAJUATO, MEXICO · 1950s', 540, 400, 38, { col: '#ffe2c8', t1: 7.0 }); strip(c, t, 2.4, .9, 'A DOCUMENTED TRUE STORY', 540, 490, 30, { col: '#ffe2c8', t1: 7.0 }); strip(c, t, 7.2, .8, 'FOUR SISTERS', 540, 290, 56, { col: '#fff0e0', t1: 9.9 }); } };
}]);
// 2 · THE AD — "housemaid wanted"; a young woman with a suitcase answers it
OLD.push([10.02, 17.1, () => {
  const sky = darkSky('#2a2420', '#7a6050');
  const fg = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { newspaper(c, 540, 760, 760, 940, -.04, ss(seg(t, 10.2, 11.0)), [{ t: 'AVISOS DE OCASIÓN', s: 56, w: 600 }, { rule: 6 }, { t: 'AVISOS · CLASIFICADOS', s: 30 }, { rule: 3, }, { t: '', s: 20 }, { t: 'SE SOLICITA', s: 70, w: 600, box: 220 }, { t: 'SIRVIENTA', s: 70, w: 600 }, { t: 'BUEN SUELDO · INFORMES AQUÍ', s: 30, gap: 30 }]);
    if (t > 13.6) { const u = ss(seg(t, 13.6, 16.8)); woman(c, lerp(-60, 420, u), 1460, 1.5, { col: '#0a0806' }); c.fillStyle = '#0a0806'; c.fillRect(lerp(-60, 420, u) + 40, 1340, 70, 54); }
    strip(c, t, 11.2, .8, 'HOUSEMAID WANTED', 540, 1310, 44, { col: '#fff0e0', t1: 16.9 }); } });
  return { layers: [sky, fg, frontBand('#0c0806', 5)], cam: t => ({ x: 0, y: 0, z: lerp(1.02, 1.1, ss(seg(t, 10.02, 17.1))) }) };
}]);
// 3 · LOCKED IN — barred windows under a red lamp
OLD.push([17.1, 24.44, () => {
  const sky = darkSky('#0c0608', '#2a1012');
  const wall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { c2.fillRect(160, 520, 320, 460); c2.fillRect(600, 520, 320, 460); }); }, '#1c0e0e', .35, { rimA: .3, rim: '#ff9a80' });
  wall.back = (c, t) => { c.fillStyle = rgba('#ff5040', .5 * flick(t)); c.fillRect(160, 520, 320, 460); c.fillRect(600, 520, 320, 460); c.fillStyle = '#0a0404'; for (const [x, i] of [[300, 0], [760, 1], [820, 2]]) { c.beginPath(); c.ellipse(x, 800, 22, 26, 0, 0, TAU); c.fill(); c.fillRect(x - 36, 826, 72, 160); } };
  const grid = Ly(c => { bars(c, 160, 520, 320, 460, 6, 12); bars(c, 600, 520, 320, 460, 6, 12); c.fillRect(140, 500, 360, 24); c.fillRect(580, 500, 360, 24); c.fillRect(140, 978, 360, 24); c.fillRect(580, 978, 360, 24); }, '#0a0606', .6, { rimA: .3, rim: '#ff9a80', front: (c, t) => { redLamp(c, 540, 400, 1.2, t); c.fillStyle = '#0a0606'; c.fillRect(480, 1100, 120, 140); c.beginPath(); c.arc(540, 1100, 46, Math.PI, TAU); c.lineWidth = 14; c.strokeStyle = '#0a0606'; c.stroke(); } });
  return { layers: [sky, wall, grid, frontBand('#060303', 7)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.07, ss(seg(t, 17.1, 24.44))) }),
    over: (c, t) => { strip(c, t, 17.6, .8, 'LOCKED IN · FORCED TO WORK', 540, 220, 40, { col: '#ffe2d8', t1: 21.0 }); strip(c, t, 21.2, .8, 'THEN THEY DISAPPEARED', 540, 220, 42, { col: '#ffe2d8', t1: 24.3 }); } };
}]);
// 4 · THE ESCAPE — 1964: a woman runs through the night toward the lights of León
OLD.push([24.44, 31.84, () => {
  const sky = darkSky('#060814', '#1e2a44', [{ x: 760, y: 380, r: 500, col: 'rgba(220,228,240,.4)' }]);
  const city = Ly(c => skylineFar(c, 1120, 44, 30, 110, false), '#0c1020', .2, { front: (c, t) => { const R = mulberry(9); for (let i = 0; i < 80; i++) { c.fillStyle = rgba('#ffd890', .35 + .5 * R()); c.fillRect(R() * W, 1060 + R() * 60, 3, 3); } sunDisc(c, 760, 380, 60, '#eef2f8', .85); } });
  const road = Ly(c => { c.fillRect(-OFF, 1140, W + 2 * OFF, 800); hole(c, c2 => { poly0(c2, [[520, 1140], [560, 1140], [900, 1600], [180, 1600]]); c2.fill(); }); }, '#0a0c14', .5, { rimA: .3, rim: '#c8d0e0' });
  road.back = c => { c.fillStyle = '#3a4258'; c.fillRect(150, 1140, 780, 500); };
  const run = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const u = ss(seg(t, 24.6, 31.6)); dancer(c, lerp(560, 540, u), lerp(1500, 1200, u), lerp(1.6, .5, u), t * 1.6, { col: '#06070c', shoes: false, sp: 2.2, tired: .8, lean: -.18 }); } });
  return { layers: [sky, city, road, run, frontBand('#04050a', 9)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 24.44, 31.84))) }),
    over: (c, t) => { strip(c, t, 24.8, .8, '1964', 540, 200, 60, { col: '#f0f4fa', t1: 31.6 }); strip(c, t, 25.8, .8, 'CATALINA ORTEGA ESCAPED', 540, 300, 40, { col: '#f0f4fa', t1: 31.6 }); } };
}]);
// 5 · THE RANCH — police with lanterns and shovels start digging
OLD.push([31.84, 37.86, () => {
  const sky = darkSky('#1a1018', '#7a4a3a', [{ x: 300, y: 1000, r: 600, col: 'rgba(255,170,110,.35)' }]);
  const ranch = Ly(c => { c.fillRect(620, 880, 340, 220); poly0(c, [[600, 884], [790, 800], [980, 884]]); c.fill(); for (let x = -40; x < 600; x += 70) c.fillRect(x, 1010, 10, 90); c.fillRect(-OFF, 1030, 660, 8); c.fillRect(-OFF, 1100, W + 2 * OFF, 900); }, '#1a100c', .4, { rimA: .35, rim: '#ffc8a0' });
  const dig = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { for (const [x, ph] of [[220, 0], [420, 1.4], [680, 2.6], [880, .7]]) { const sw = Math.sin(t * 2.6 + ph); villager(c, x, 1440, 1.0, 0, ph, 0, 1); c.save(); c.strokeStyle = '#06050a'; c.lineWidth = 8; c.beginPath(); c.moveTo(x + 40, 1440 - 190); c.lineTo(x + 70 + sw * 30, 1440 - 20 + sw * 20); c.stroke(); c.restore(); flame(c, x - 50, 1350, .5, t, ph); }
    c.save(); c.fillStyle = '#2a1a12'; for (const x of [240, 700]) { c.beginPath(); c.ellipse(x, 1460, 130, 22, 0, 0, TAU); c.fill(); } c.restore(); } });
  return { layers: [sky, ranch, dig, frontBand('#0c0806', 11)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.07, ss(seg(t, 31.84, 37.86))) }),
    over: (c, t) => strip(c, t, 32.2, .8, 'RANCHO EL ÁNGEL', 540, 220, 48, { col: '#fff0e0', t1: 37.7 }) };
}]);
// 6 · THE NUMBER — small white flags fill the ground; the count is disputed
OLD.push([37.86, 46.1, () => {
  const sky = darkSky('#0c0a10', '#3a2a30');
  const ground = Ly(c => c.fillRect(-OFF, 960, W + 2 * OFF, 1000), '#1a1210', .5, { rimA: .3, rim: '#e8d8c8', front: (c, t) => smallFlags(c, t, 91, 990, 1480, 7, .95, 38.2, .05) });
  return { layers: [sky, ground, frontBand('#080604', 13)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 37.86, 46.1))) }),
    over: (c, t) => { strip(c, t, 38.4, .8, 'REPORTS CLAIMED 91 BODIES', 540, 230, 44, { col: '#fff4ec', t1: 46.0 }); strip(c, t, 42.4, .9, 'THE TRUE NUMBER IS STILL DISPUTED', 540, 340, 34, { col: '#ffe2d0', t1: 46.0 }); } };
}]);
// 7 · FORTY YEARS — prison bars come down
OLD.push([46.1, 50.55, () => {
  const sky = darkSky('#0a0a10', '#2a2a36');
  const cell = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(120, 300, 840, 1100)); }, '#14141c', .35, { rimA: .3, rim: '#d0d4e0' });
  cell.back = c => { const g = c.createLinearGradient(0, 300, 0, 1400); g.addColorStop(0, '#5a5e70'); g.addColorStop(1, '#2a2c38'); c.fillStyle = g; c.fillRect(120, 300, 840, 1100); };
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { for (let i = 0; i < 3; i++) woman(c, 330 + i * 210, 1380, 1.25, { col: '#08080c', flip: i === 1 ? -1 : 1 }); const b = ss(seg(t, 46.4, 47.2)); c.fillStyle = '#05050a'; c.save(); c.translate(0, lerp(-1200, 0, b)); bars(c, 120, 300, 840, 1100, 9, 16); c.restore(); } });
  return { layers: [sky, cell, fg, frontBand('#040408', 15)], cam: t => ({ x: 0, y: 0, z: 1.0 }), over: (c, t) => strip(c, t, 47.3, .8, '40 YEARS EACH', 540, 200, 54, { col: '#f4f4fa', t1: 50.4 }) };
}]);
// 8 · NOBODY ASKED — the street at night; the red lamp goes out
OLD.push([50.55, 59.4, () => { const F = [[-40, 1300, 300, 460], [260, 1300, 300, 520], [560, 1300, 280, 440], [840, 1300, 300, 500]];
  const sky = darkSky('#06060e', '#1e1a2a', [{ x: 800, y: 360, r: 500, col: 'rgba(220,220,236,.35)' }]);
  const st = Ly(c => F.forEach(([x, b, w, h]) => facade(c, x, b, w, h, { door: x === 260 })), '#0e0a0e', .5, { rimA: .3, rim: '#c8c0d0' });
  st.back = (c, t) => F.forEach(([x, b, w, h]) => facadeBack(c, x, b, w, h, '#ffc070', .45, t, { door: x === 260, doorCol: '#ff4a3a' }));
  const fg = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { const off = 1 - ss(seg(t, 56.4, 57.4)); redLamp(c, 410, 1080, 1.1, t, Math.max(.05, off)); sunDisc(c, 800, 360, 50, '#eef0f6', .8); } });
  return { layers: [sky, st, fg, frontBand('#06040a', 17)], cam: t => ({ x: 0, y: 0, z: lerp(1.08, 1.0, ss(seg(t, 50.55, 59.4))) }),
    over: (c, t) => { strip(c, t, 51.0, .8, 'EVERYONE KNEW', 540, 200, 50, { col: '#f4f0f0', t1: 55.6 }); strip(c, t, 53.6, .9, 'NOBODY ASKED WHERE THE GIRLS WENT', 540, 300, 34, { col: '#f4f0f0', t1: 57.6 }); strip(c, t, 57.8, .9, 'PLOT TWIST WITH A&R', 540, 250, 46, { col: '#ffe2c8', font: 'Cormorant Garamond' }); } };
}]);

// ======================================================= LONG-FORM TIMELINE (Episode 25, ~2:20) =======================================================
addReuse(0, 9.88, 0);
// 2 · the family: four girls in an old photograph; their father's shadow behind
addRel(9.88, 15.4, D => ({ layers: [darkSky('#2a1c14', '#7a5a3a'), Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => {
  const sh = ss(seg(t, 4.0, 7.0)); c.save(); c.globalAlpha = .75 * sh; c.translate(540, 1500); c.scale(3.4, 3.4); villager(c, 0, 0, 1, 0, 0, 0, 1); c.restore();
  frame(c, 540, 820, 760, 560, '#d8c4a0'); c.save(); c.beginPath(); c.rect(160, 540, 760, 560); c.clip(); const g = c.createLinearGradient(0, 540, 0, 1100); g.addColorStop(0, '#cdb48c'); g.addColorStop(1, '#8a6e4a'); c.fillStyle = g; c.fillRect(160, 540, 760, 560);
  [[300, .9], [440, .82], [600, .76], [750, .7]].forEach(([x, k], i) => woman(c, x, 1100, k, { col: '#3a2818', flip: i % 2 ? -1 : 1 })); c.restore();
  tag(c, 'DELFINA · CARMEN · MARÍA LUISA · MARÍA DE JESÚS', 540, 1180, 28, '#fff0dc', ss(seg(t, 1.0, 2.0))); } })], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, D))) }),
  over: (c, t) => { strip(c, t, .3, .8, 'THE GONZÁLEZ VALENZUELA SISTERS', 540, 220, 36, { col: '#fff0e0' }); strip(c, t, 5.0, .8, 'A VIOLENT, HARD-DRINKING FATHER', 540, 320, 32, { col: '#fff0e0' }); } }));
// 3 · the flight: a wagon on a night road; a signpost to Guanajuato
addRel(23.2, 26.91, D => ({ layers: [darkSky('#06081a', '#2a3050', [{ x: 760, y: 420, r: 500, col: 'rgba(220,226,240,.35)' }]), Ly(c => { skylineFar(c, 1100, 12, 30, 90, false); c.fillRect(-OFF, 1200, W + 2 * OFF, 800); }, '#0c0e1a', .4, { rimA: .3, rim: '#c8d0e0', front: (c, t) => {
  sunDisc(c, 760, 420, 60, '#eef2f8', .85); const x = lerp(1100, 360, ss(seg(t, 0, D))); c.save(); c.fillStyle = '#06070c'; c.fillRect(x - 120, 1330, 240, 70); c.beginPath(); c.arc(x - 80, 1410, 34, 0, TAU); c.arc(x + 80, 1410, 34, 0, TAU); c.fill(); c.restore();
  for (let i = 0; i < 3; i++) woman(c, x + 170 + i * 60, 1440, .7 - i * .05, { col: '#06070c' }); villager(c, x - 200, 1440, .9, 0, 0, 0, 1);
  c.fillStyle = '#06070c'; c.fillRect(180, 1150, 12, 290); c.save(); c.translate(186, 1170); c.rotate(-.06); c.fillRect(-10, -30, 230, 56); c.restore(); tag(c, 'GUANAJUATO →', 300, 1142, 28, '#e8ecf4'); } })], cam: t => ({ x: lerp(20, -20, ss(seg(t, 0, D))), y: 0, z: 1.04 }),
  over: (c, t) => { strip(c, t, .3, .8, 'THE FAMILY FLED', 540, 220, 46, { col: '#f4f6fa' }); strip(c, t, 2.6, .8, 'AND CHANGED ITS NAME', 540, 320, 40, { col: '#f4f6fa' }); } }));
// 4 · the spread: a paper map of central Mexico; red lamps light town after town
addRel(31.5, 38.96, D => { const TOWNS = [[560, 820, 'SAN FRANCISCO DEL RINCÓN'], [640, 760, 'LEÓN'], [470, 700, 'LAGOS DE MORENO'], [300, 900, 'GUADALAJARA'], [760, 900, 'IRAPUATO'], [880, 860, 'QUERÉTARO']];
  return { layers: [darkSky('#1a1410', '#3a2a1e'), Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 30; c.fillStyle = PAPERC; c.fillRect(110, 420, 860, 760); c.restore();
    c.save(); c.strokeStyle = 'rgba(90,70,50,.55)'; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(150, 640); c.bezierCurveTo(330, 600, 420, 760, 520, 720); c.bezierCurveTo(620, 690, 700, 640, 940, 700); c.moveTo(380, 1150); c.bezierCurveTo(440, 960, 560, 940, 700, 1140); c.stroke(); c.restore();
    for (const [x, y, s] of [[260, 1040, 'JALISCO'], [620, 610, 'GUANAJUATO'], [860, 1040, 'QUERÉTARO']]) tag(c, s, x, y, 30, 'rgba(90,70,50,.7)');
    TOWNS.forEach(([x, y, n], i) => { const a = ss(seg(t, 0.5 + i * 1.0, 1.2 + i * 1.0)); if (a <= 0) return; redLamp(c, x, y, .6, t + i, a); tag(c, n, x, y + 36, 18, INKP, a); }); } })],
    cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'THE FIRST BAR', 540, 220, 46, { col: '#fff0e0', t1: 4.4 }); strip(c, t, 4.6, .8, 'JALISCO · GUANAJUATO · QUERÉTARO', 540, 220, 34, { col: '#fff0e0' }); } }; });
addReuse(38.96, 46.01, 1);
addReuse(46.01, 50.5, 2);
// 7 · the captain at the door; officials walk past and look away
addRel(55.73, 64.27, D => ({ layers: [darkSky('#0c0608', '#2a1214'), Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { archPath(c2, 540, 640, 260, 720); c2.fill(); }); }, '#180c0c', .4, { rimA: .3, rim: '#ff9a80' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.save(); c.globalCompositeOperation = 'destination-over'; c.restore(); redLamp(c, 540, 560, 1.1, t); villager(c, 540, 1380, 1.4, 0, 0, 0, 1); c.save(); c.strokeStyle = '#05050a'; c.lineWidth = 9; c.beginPath(); c.moveTo(500, 1380 - 280); c.lineTo(470, 1380 - 60); c.stroke(); c.restore();
    for (let i = 0; i < 2; i++) { const x = lerp(-120 - i * 140, 1200 - i * 140, ss(seg(t, 2.6, D - .4))); c.save(); c.translate(x, 1480); c.rotate(.04); villager(c, 0, 0, 1.25, 0, i, 0, 1); c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'A FORMER ARMY CAPTAIN', 540, 220, 44, { col: '#ffe2d8', t1: 3.6 }); strip(c, t, 3.8, .8, 'OFFICIALS LOOKED THE OTHER WAY', 540, 220, 36, { col: '#ffe2d8' }); } }));
addReuse(64.27, 71.74, 3);
addReuse(71.74, 75.0, 4);
// 10 · arrests and the press frenzy
addRel(77.73, 87.63, D => ({ layers: [darkSky('#0c0c12', '#2a2a36'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { policeLights(c, t, ss(seg(t, 0, 1.0)) * (1 - ss(seg(t, 4.6, 5.4))));
  if (t < 5.4) { const a = 1 - ss(seg(t, 4.6, 5.4)); c.save(); c.globalAlpha = a; woman(c, 420, 1420, 1.3, { col: '#06060a' }); woman(c, 560, 1420, 1.25, { col: '#06060a' }); villager(c, 300, 1420, 1.35, 0, 0, 0, 1); villager(c, 700, 1420, 1.35, 0, 1, 0, 1); c.restore(); }
  [[0, 300, 720, -.08], [.8, 760, 900, .06], [1.6, 420, 1150, -.03]].forEach(([d, x, y, r], i) => newspaper(c, x, y, 520, 640, r, ss(seg(t, 5.0 + d, 5.6 + d)), [{ t: ['¡HORROR!', 'LAS POQUIANCHIS', '¡CAPTURADAS!'][i], s: 54, w: 600 }, { rule: 5 }, { t: 'EDICIÓN EXTRA', s: 26 }])); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'DELFINA & MARÍA DE JESÚS ARRESTED', 540, 200, 34, { col: '#f4f6fa', t1: 4.6 }); strip(c, t, 2.4, .8, 'MARÍA LUISA FLED', 540, 300, 40, { col: '#f4f6fa', t1: 4.6 }); } }));
addReuseX(87.63, 93.5, 5, (c, t) => strip(c, t, 3.6, .8, 'SOME SAY ONLY 8 CONFIRMED', 540, 450, 32, { col: '#ffe2d0' }));
addReuseX(98.88, 106.18, 6, (c, t) => strip(c, t, 4.2, .8, 'CARMEN HAD DIED YEARS BEFORE', 540, 310, 32, { col: '#f4f4fa' }));
// 13 · their fates: three candles in a cell window go out
addRel(106.18, 119.59, D => ({ layers: [darkSky('#06060c', '#1a1a26'), Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(180, 600, 720, 420)); }, '#121218', .35, { rimA: .3, rim: '#c8c8d8' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = '#05050a'; bars(c, 180, 600, 720, 420, 8, 12); c.fillRect(160, 1020, 760, 30);
    [[300, 'DELFINA', '† 1968', 3.6], [540, 'MARÍA LUISA', '† 1984', 7.4], [780, 'MARÍA DE JESÚS', 'RELEASED', 11.0]].forEach(([x, n, d, t0], i) => { const out = ss(seg(t, t0, t0 + .5)); c.fillStyle = '#e6dcc4'; c.fillRect(x - 8, 970, 16, 50); if (out < 1) { c.save(); c.globalAlpha = 1 - out; flame(c, x, 970, .7, t, i); c.restore(); }
      tag(c, n, x, 1110, 28, '#f4f0e8', ss(seg(t, t0 - 2.6, t0 - 2.0))); tag(c, d, x, 1150, 26, '#c8c0b0', ss(seg(t, t0 - 2.6, t0 - 2.0))); }); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'WHAT BECAME OF THEM', 540, 230, 44, { col: '#f4f4fa' }) }));
// 14 · the legacy: a projector beam, a book, a screen
addRel(119.59, 131.19, D => ({ layers: [darkSky('#06040a', '#1a1220'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => {
  c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(1000, 1100, 300, 600); g.addColorStop(0, 'rgba(255,240,210,.35)'); g.addColorStop(1, 'rgba(255,240,210,.05)'); c.fillStyle = g; c.beginPath(); c.moveTo(1000, 1100); c.lineTo(120, 420); c.lineTo(120, 880); c.closePath(); c.fill(); c.restore();
  c.fillStyle = '#e8e0d0'; c.globalAlpha = .9; c.fillRect(120, 420, 520, 460); c.globalAlpha = 1; for (let i = 0; i < 3; i++) woman(c, 270 + i * 120, 860, .9, { col: '#2a2420' }); tag(c, '1976 · FILM', 380, 940, 30, '#fff0e0', ss(seg(t, .6, 1.4)));
  c.save(); c.translate(820, 1240); c.rotate(.08); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 20; c.fillStyle = '#7a2a24'; c.fillRect(-120, -170, 240, 340); c.shadowBlur = 0; c.fillStyle = '#f4ead4'; c.font = '600 34px "IM Fell English SC"'; c.textAlign = 'center'; c.fillText('LAS', 0, -60); c.fillText('MUERTAS', 0, -16); c.restore(); tag(c, '1977 · NOVEL', 820, 1450, 30, '#fff0e0', ss(seg(t, 3.6, 4.4)));
  c.save(); c.fillStyle = '#0a0a10'; c.fillRect(170, 1140, 380, 250); c.fillStyle = rgba('#8ab0e0', .7 * ss(seg(t, 7.0, 7.8))); c.fillRect(190, 1160, 340, 210); c.restore(); tag(c, '2025 · SERIES', 360, 1450, 30, '#fff0e0', ss(seg(t, 7.0, 7.8))); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'MEXICO NEVER FORGOT', 540, 230, 44, { col: '#fff0e0' }) }));
addReuse(131.19, 140.4, 7);

// ---------- darker inserts ----------

// the father: a shadow on the wall raises a hand; children cower
addRel(15.4, 20.89, D => ({ layers: [darkSky('#1a0e0a', '#4a2a1a'), Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#6a4a30', .3, { glow: { x: 760, y: 1100, r: 700, col: '#ffb060', a: .5 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const r = ss(seg(t, 1.6, 3.2)); shadowFig(c, 640, 1420, 3.2, r, 'rgba(10,6,4,.85)', 1); for (let i = 0; i < 3; i++) cower(c, 200 + i * 120, 1420, 1.05 - i * .12, 'rgba(10,6,4,.85)'); flame(c, 960, 1300, .9, t, 1);
    const hit = Math.max(0, 1 - Math.abs(t - 3.4) / .12); if (hit > 0) { c.save(); c.fillStyle = `rgba(255,240,220,${.35 * hit})`; c.fillRect(0, 0, W, H); c.restore(); } } })],
  cam: t => ({ x: Math.sin(t * 30) * (t > 3.3 && t < 3.7 ? 6 : 0), y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'A VIOLENT, HARD-DRINKING FATHER', 540, 220, 34, { col: '#ffe8d8' }) }));
// the gunshot: a dark street, a flash, a man falls
addRel(20.89, 23.2, D => ({ layers: [darkSky('#04050a', '#14161e'), Ly(c => { facade(c, -40, 1300, 560, 600); facade(c, 560, 1300, 560, 520); c.fillRect(-OFF, 1300, W + 2 * OFF, 700); }, '#0a0a10', .5, { rimA: .3, rim: '#c8c8d8' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const f = Math.max(0, 1 - Math.abs(t - .7) / .1); villager(c, 300, 1460, 1.3, 0, 0, 0, 1); muzzle(c, 360, 1460 - 300 * 1.3 + 40, .9, f); if (f > 0) { c.save(); c.fillStyle = `rgba(255,230,180,${.3 * f})`; c.fillRect(0, 0, W, H); c.restore(); }
    const fall = ss(seg(t, .8, 1.6)); c.save(); c.translate(760, 1460); c.rotate(fall * 1.45); villager(c, 0, 0, 1.2, 0, 3, 0, 0); c.restore(); blood(c, 800, 1470, 1.0, t, 1.4, .9); } })],
  cam: t => ({ x: 0, y: 0, z: 1.06 }), over: (c, t) => strip(c, t, .2, .5, 'HE SHOT A MAN', 540, 230, 50, { col: '#f4f4fa' }) }));
// the first bar: a counter, bottles, and a red curtain over the back room
addRel(26.91, 31.5, D => ({ layers: [darkSky('#140808', '#3a1a14'), Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(660, 620, 260, 560)); }, '#2a1610', .35, { rimA: .3, rim: '#ffc8a0', glow: { x: 400, y: 900, r: 600, col: '#ffb060', a: .3 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const o = ss(seg(t, 1.6, 3.0)); c.fillStyle = '#ff4a3a'; c.fillRect(660, 620, 260, 560); c.fillStyle = '#7a1812'; for (let i = 0; i < 6; i++) c.fillRect(660 + i * 44 + o * 120 * (i < 3 ? -1 : 1) * (i % 3) / 2, 620, 26, 560); redLamp(c, 790, 580, .9, t);
    c.fillStyle = '#0a0606'; c.fillRect(80, 1100, 520, 60); c.fillRect(100, 1160, 480, 300); for (let i = 0; i < 9; i++) { c.fillRect(110 + i * 52, 760 + (i % 3) * 8, 26, 90); c.fillRect(118 + i * 52, 730 + (i % 3) * 8, 10, 34); } c.fillRect(80, 860, 520, 12); villager(c, 360, 1100, .9, 0, 0, 0, 1); } })],
  cam: t => ({ x: lerp(-20, 20, ss(seg(t, 0, D))), y: 0, z: 1.04 }), over: (c, t) => strip(c, t, .3, .8, 'THE FIRST BAR', 540, 220, 48, { col: '#fff0e0' }) }));
// locked in: a padlocked door, fingernail scratches; a shadow strikes
addRel(50.5, 55.73, D => ({ layers: [darkSky('#0a0406', '#200a0c'), Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#3a2018', .3, { glow: { x: 540, y: 800, r: 600, col: '#ff6a50', a: .25 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = '#4a2a1c'; c.fillRect(300, 420, 480, 1060); c.strokeStyle = '#2a160e'; c.lineWidth = 6; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(300 + i * 96, 420); c.lineTo(300 + i * 96, 1480); c.stroke(); }
    scratchMarks(c, 360, 1060, 1.1, ss(seg(t, .2, 1.2))); padlock(c, 700, 900, 1.3); const r = ss(seg(t, 2.0, 3.0)); c.save(); c.globalAlpha = .85; shadowFig(c, 160, 1480, 2.4, r, 'rgba(6,2,2,.9)', 1); c.restore(); const hit = Math.max(0, 1 - Math.abs(t - 3.1) / .1); if (hit > 0) { c.save(); c.fillStyle = `rgba(255,220,200,${.4 * hit})`; c.fillRect(0, 0, W, H); c.restore(); } blood(c, 560, 1180, 1.0, t, 3.3, .9); } })],
  cam: t => ({ x: Math.sin(t * 30) * (t > 3.0 && t < 3.4 ? 6 : 0), y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'DEBTS THEY COULD NEVER REPAY', 540, 220, 36, { col: '#ffe2d8' }) }));
// the dig: a lantern over the pit; bones come up out of the earth
addRel(75.0, 77.73, D => ({ layers: [darkSky('#0a0606', '#1a1210'), Ly(c => { c.fillRect(-OFF, 760, W + 2 * OFF, 1300); }, '#2a1c14', .4, { glow: { x: 540, y: 1100, r: 500, col: '#ffb060', a: .45 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = '#120a06'; c.beginPath(); c.ellipse(540, 1150, 360, 170, 0, 0, TAU); c.fill(); const a = ss(seg(t, .3, 1.4)); skull(c, 470, 1140, 1.4, a); bone(c, 620, 1180, 160, .4, 1.0); bone(c, 560, 1230, 140, -.3, .9); bone(c, 380, 1210, 120, 1.2, .8); flame(c, 820, 980, 1.0, t, 2);
    c.save(); c.strokeStyle = '#08060a'; c.lineWidth = 10; c.beginPath(); c.moveTo(200, 700); c.lineTo(330 + Math.sin(t * 5) * 20, 1060); c.stroke(); c.fillStyle = '#08060a'; c.fillRect(300 + Math.sin(t * 5) * 20, 1040, 60, 46); c.restore(); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.12, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .2, .6, 'THEY KEPT DIGGING', 540, 230, 46, { col: '#fff0e0' }) }));
// the count: covered bodies in rows, each with a tag
addRel(93.5, 98.88, D => ({ layers: [darkSky('#0a0a10', '#22222c'), Ly(c => c.fillRect(-OFF, 900, W + 2 * OFF, 1100), '#2a2824', .4, { glow: { x: 540, y: 1000, r: 700, col: '#d0d8e8', a: .25 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) { const k = .55 + r * .17, a = ss(seg(t, .2 + (r * 4 + i) * .2, .6 + (r * 4 + i) * .2)); if (a <= 0) continue; c.save(); c.globalAlpha = a; covered(c, 190 + i * 230, 1000 + r * 130, 200, k, String(r * 4 + i + 1)); c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'WOMEN · MEN · UNBORN CHILDREN', 540, 230, 36, { col: '#f4f4fa' }) }));

SCENES.sort((a, b) => a.t0 - b.t0);

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

