// La Planchada: a paper-cut lightbox film, 1080x1920. Layered cut paper, backlight, cast shadows. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70, TAU = Math.PI * 2;
window.DUR = 62.4;

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
  ['v01', 0.35, 7.603, "In hospitals across Mexico, patients tell stories of a mysterious nurse who appears at night… but doesn't belong to the living."],
  ['v02', 8.25, 6.783, 'They call her La Planchada. She wears an old-fashioned white uniform, perfectly ironed, without a single wrinkle.'],
  ['v03', 15.34, 6.066, 'According to legend, she was once a dedicated nurse who fell deeply in love with a doctor who betrayed her.'],
  ['v04', 21.7, 7.85, 'Some versions say she died heartbroken. Others claim she neglected her patients before dying, leaving her spirit unable to rest.'],
  ['v05', 29.85, 6.556, 'Patients have claimed a strange nurse appeared beside their beds, checked their medicine, and comforted them through the night.'],
  ['v06', 36.71, 6.112, 'But when those patients thanked the hospital staff the next morning, nobody recognized the nurse they described.'],
  ['v07', 43.12, 7.036, 'According to the stories, some patients later discovered that the woman who cared for them had supposedly died years earlier.'],
  ['v08', 50.46, 8.165, "And here's the chilling legend: La Planchada doesn't haunt hospitals to hurt people. She returns because she never stopped caring for her patients."],
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
const flare = (t, t0, base = 1) => { const u = t - t0; return u < 0 ? 0 : base * (1 + .5 * Math.exp(-u * 3.2) * Math.cos(u * 14)) * Math.min(1, u * 6); };
// ---- silhouettes: y = the ground (hem) ; k scale ; every figure is a paper sheet
function figure(c, kind, x, y, k, o = {}) {
  c.save(); c.translate(x, y); c.scale(k * (o.flip || 1), k); if (o.rot) c.rotate(o.rot);
  const aL = o.aL ?? .12, aR = o.aR ?? .12;
  c.beginPath();
  if (o.ghost) poly0(c, [[-34, -190], [34, -190], [24, -130], [66, -50], [44, -2], [20, -34], [0, 34], [-22, -30], [-46, 4], [-68, -48], [-24, -130]]);
  else if (kind === 'doc') poly0(c, [[-40, -192], [40, -192], [46, -20], [-46, -20]]);
  else if (kind === 'pj') { c.ellipse(0, -110, 48, 90, 0, 0, TAU); }
  else if (kind === 'matron') poly0(c, [[-44, -190], [44, -190], [34, -130], [90, -20], [-90, -20], [-34, -130]]);
  else poly0(c, [[-34, -190], [34, -190], [24, -130], [74, -20], [-74, -20], [-24, -130]]);
  c.fill();
  for (const s of [-1, 1]) { const a = s < 0 ? aL : aR, sx = s * 34, sy = -182, ex = sx + s * Math.sin(a) * 100, ey = sy + Math.cos(a) * 100; c.save(); c.lineCap = 'round'; c.lineWidth = 20; c.strokeStyle = c.fillStyle; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke(); c.restore(); c.beginPath(); c.arc(ex, ey + 6, 12, 0, TAU); c.fill(); }
  if (!o.ghost) { for (const s of [-1, 1]) c.fillRect(s * 16 - 8, -22, 16, 22); }
  c.beginPath(); c.ellipse(0, -234, 38, 46, 0, 0, TAU); c.fill(); c.fillRect(-9, -196, 18, 20);
  if (kind === 'nurse' || kind === 'matron') { c.beginPath(); poly0(c, [[-36, -268], [-24, -306], [26, -306], [38, -266]]); c.fill(); }
  if (kind === 'woman') { c.beginPath(); poly0(c, [[-48, -250], [-44, -296], [0, -312], [44, -296], [48, -250]]); c.fill(); }
  if (kind === 'pj') { c.beginPath(); poly0(c, [[-42, -262], [-24, -310], [20, -322], [52, -294], [60, -258]]); c.fill(); }
  if (kind === 'doc') { c.beginPath(); c.arc(-4, -262, 14, 0, TAU); c.fill(); }
  c.restore();
}
const poly0 = (c, pts) => { pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
function cutOn(c, fn, col, a) { c.save(); c.fillStyle = col; c.globalAlpha = a; fn(c); c.restore(); }
function ghostFig(c, x, y, k, a, o = {}) { // a pale, translucent paper figure that glows
  c.save(); c.globalAlpha = a; c.fillStyle = '#d8f2e6'; figure(c, 'nurse', x, y, k, { ghost: true, ...o });
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * .25; c.filter = 'blur(26px)'; figure(c, 'nurse', x, y, k, { ghost: true, ...o }); c.restore();
  // her perfectly straight creases
  c.save(); c.globalAlpha = a * .6; c.strokeStyle = 'rgba(30,60,60,.55)'; c.lineWidth = 2.6 * k; for (const dx of [-24, -12, 0, 12, 24]) { c.beginPath(); c.moveTo(x + dx * .5 * k * (o.flip || 1), y - 128 * k); c.lineTo(x + dx * 1.7 * k * (o.flip || 1), y - 50 * k); c.stroke(); } c.restore();
}
function bedSil(c, x, y, k) { c.save(); c.translate(x, y); c.scale(k, k); c.fillRect(-200, -70, 400, 30); c.fillRect(-200, -160, 14, 160); c.fillRect(186, -120, 14, 120); c.beginPath(); poly0(c, [[-100, -70], [-40, -120], [60, -112], [200, -80], [200, -40], [-100, -40]]); c.fill(); c.beginPath(); c.ellipse(-140, -100, 36, 32, 0, 0, TAU); c.fill(); c.restore(); }
function heartP(c, x, y, r) { c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, px = x + 16 * Math.pow(Math.sin(a), 3) * r / 16, py = y - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r / 16; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.fill(); }
function heartHalf(c, x, y, r, side) { c.beginPath(); for (let i = 0; i <= 20; i++) { const a = side > 0 ? i / 20 * Math.PI : Math.PI + i / 20 * Math.PI, px = x + 16 * Math.pow(Math.sin(a), 3) * r / 16, py = y - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r / 16; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.lineTo(x, y + r * .9); c.closePath(); c.fill(); }
const bedLayer = (col, seed) => Ly(c => { bedSil(c, 740, 1470, 1.2); c.fillRect(960 - 6, 1100, 12, 360); }, col, .7, { rimA: .3 });

// 1 · THE MIDNIGHT NURSE (corridor, indigo, amber doors)
addScene(0, 8.15, () => {
  const sky = Ly(SK('#141b40', '#4b5a98', [{ x: 540, y: 1000, r: 420, col: 'rgba(255,214,140,.65)' }]), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillRect(-OFF, 300, 330, 1300); c.fillRect(W - 330 + OFF, 300, 330, 1300); c.fillRect(-OFF, -OFF, W + 2 * OFF, 360); hole(c, c2 => { c2.fillRect(500, 900, 80, 120); }); c.fillRect(-OFF, 1010, W + 2 * OFF, 700); hole(c, c2 => { archPath(c2, 540, 760, 140, 250); c2.fill(); }); }, '#222c5a', .3, { glow: { x: 540, y: 900, r: 520, col: '#ffcf80', a: .35 } });
  wall.back = (c, t) => cutOn(c, c2 => archPath(c2, 540, 760, 140, 250), '#ffd890', .95 * flick(t));
  const doors = Ly(c => { for (const [x, w, h, y] of [[130, 190, 520, 1010], [270, 120, 380, 960]]) { c.fillRect(x - w / 2 - 20, y - h - 30, w + 40, h + 40); hole(c, c2 => { archPath(c2, x, y - h + 10, w, h - 10); c2.fill(); }); } for (const [x, w, h, y] of [[950, 190, 520, 1010], [810, 120, 380, 960]]) { c.fillRect(x - w / 2 - 20, y - h - 30, w + 40, h + 40); hole(c, c2 => { archPath(c2, x, y - h + 10, w, h - 10); c2.fill(); }); } }, '#141b3a', .55, { rimA: .35 });
  doors.back = (c, t) => { for (const [x, w, h, y, a] of [[130, 190, 520, 1010, .55], [270, 120, 380, 960, .5], [950, 190, 520, 1010, .5], [810, 120, 380, 960, .6]]) cutOn(c, c2 => archPath(c2, x, y - h + 10, w, h - 10), '#ffb25a', a * flick(t)); const op = ss(seg(t, 5.4, 5.7)) * (1 - ss(seg(t, 6.3, 6.45))); if (op > .01) { cutOn(c, c2 => { c2.fillRect(130 - 70, 600, 140 * op, 400); }, '#ffe9b0', .95); cutOn(c, c2 => figure(c2, 'pj', 150, 1010, .8, {}), '#0d1228', op); } };
  doors.front = (c, t) => { for (const [x, w, h, y] of [[130, 190, 520, 1010], [950, 190, 520, 1010]]) bloom(c, c2 => archPath(c2, x, y - h + 10, w * 1.2, h), '#ff9a40', .35, 40); bloom(c, c2 => archPath(c2, 540, 760, 160, 270), '#ffcf80', .6 * flick(t), 40); };
  const mid = Ly(c => { for (const x of [250, 540, 830]) { c.fillRect(x - 3, -OFF, 6, 330); } }, '#0c1230', .7);
  mid.front = (c, t) => { for (const [x, ph] of [[250, 0], [540, 1.7], [830, 3.1]]) { const sw = Math.sin(t * 1.6 + ph) * 6; cutOn(c, c2 => { c2.beginPath(); c2.ellipse(x + sw, 340, 36, 50, 0, 0, TAU); c2.fill(); }, '#ffb25a', .95 * flick(t + ph)); bloom(c, c2 => { c2.beginPath(); c2.ellipse(x + sw, 340, 50, 64, 0, 0, TAU); c2.fill(); }, '#ff9a40', .5, 30); }
    if (t > 3.5) { const u = ss(seg(t, 3.5, 8.1)), k = lerp(.4, 1.5, u), y = lerp(1060, 1640, u); ghostFig(c, 540 + Math.sin(t * 1.3) * 26 * (1 - u * .5), y + Math.sin(t * 5) * 6, k, .94, {}); if (t > 7.4) bloom(c, c2 => c2.fillRect(520, 800, 40, 40), '#bfe8d8', 0, 10); } };
  return { layers: [sky, wall, doors, mid, frontBand('#05070f', 3)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.12, ss(seg(t, 0, 8.15))) }),
    over: (c, t) => { strip(c, t, 0.1, .9, 'PLOT TWIST WITH A&R  ·  EPISODE 16', 540, 150, 32, { col: '#c9d4ee', font: 'Cormorant Garamond' }); strip(c, t, .5, 1.3, 'LA PLANCHADA', 540, 330, 82, { col: '#ffcf8a' }); strip(c, t, 2.5, 1.0, 'THE NURSE WHO NEVER LEFT', 540, 450, 44, { col: '#bfe8d8', t1: 8.1 }); } };
});
// 2 · THE PERFECT UNIFORM
addScene(8.15, 15.2, () => {
  const sky = Ly(SK('#3f8f88', '#cfe8d8', [{ x: 560, y: 1100, r: 720, col: 'rgba(255,248,214,.8)' }]), '#000', 0, { raw: true });
  const win = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { archPath(c2, 250, 360, 280, 680); c2.fill(); archPath(c2, 830, 460, 200, 500); c2.fill(); }); }, '#2d6e6a', .3, { glow: { x: 560, y: 1000, r: 800, col: '#fff0c0', a: .35 } });
  const tbl = Ly(c => { c.fillRect(30, 1380, 360, 26); c.fillRect(50, 1406, 24, 160); c.fillRect(346, 1406, 24, 160); c.fillRect(-OFF, 1560, W + 2 * OFF, 500); }, '#1c4a48', .75, { rimA: .3 });
  tbl.front = (c, t) => { const fl = flare(t, 12.0, 1); ghostFig(c, 620, 1500 + Math.sin(t * 3) * 7, 1.9, .96, { aL: .1, aR: .1 }); bloom(c, c2 => c2.fillRect(300, 800, 640, 700), '#fff2c0', .18 * fl, 80);
    cutOn(c, c2 => { c2.beginPath(); poly0(c2, [[60, 1380], [260, 1380], [240, 1330], [160, 1300], [70, 1330]]); c2.fill(); }, '#252d3a', 1);
    if (t > 12.1) { const press = seg(t, 12.9, 14.4), x = lerp(1000, 760, ss(seg(t, 12.1, 12.8))) - (press > 0 ? 70 * Math.sin(press * Math.PI * 2) : 0), y = press > 0 ? lerp(1180, 1560, ss(press)) : lerp(900, 1180, ss(seg(t, 12.1, 12.7))); cutOn(c, c2 => { c2.beginPath(); poly0(c2, [[x - 86, y], [x + 86, y], [x + 66, y - 60], [x + 8, y - 96], [x - 84, y - 70]]); c2.fill(); }, '#232a36', 1); c.save(); c.strokeStyle = '#232a36'; c.lineWidth = 14; c.beginPath(); c.moveTo(x + 10, y - 96); c.lineTo(x + 40, -OFF); c.stroke(); c.restore(); for (let i = 0; i < 4; i++) { const u = (t * 2 + i / 4) % 1; cutOn(c, c2 => { c2.beginPath(); c2.arc(x - 30 + Math.sin(u * 7 + i) * 22, y - 150 - u * 160, 16 + u * 22, 0, TAU); c2.fill(); }, '#ffffff', .45 * (1 - u)); } } };
  return { layers: [sky, win, tbl, frontBand('#0c2624', 7)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 8.15, 15.2))) }), over: (c, t) => { strip(c, t, 13.9, .9, 'NOT A SINGLE WRINKLE', 540, 330, 54, { col: '#fff2c0', t1: 15.1 }); } };
});
// 3 · HER TRAGIC PAST (a warm memory)
addScene(15.2, 21.6, () => {
  const sky = Ly(SK('#f2a65a', '#ffe6a8', [{ x: 540, y: 820, r: 560, col: 'rgba(255,240,170,.9)' }]), '#000', 0, { raw: true, front: c => { cutOn(c, c2 => { c2.beginPath(); c2.arc(540, 820, 150, 0, TAU); c2.fill(); }, '#fff6c8', .96); bloom(c, c2 => { c2.beginPath(); c2.arc(540, 820, 170, 0, TAU); c2.fill(); }, '#ffd870', .7, 40); } });
  const arch = Ly(c => { c.fillRect(-OFF, 560, 210, 1000); c.fillRect(W - 140, 560, 210, 1000); poly0(c, [[130, 1000], [130, 560], [300, 300], [540, 220], [780, 300], [950, 560], [950, 1000], [880, 1000], [880, 580], [730, 390], [540, 320], [350, 390], [200, 580], [200, 1000]]); c.fill(); hole(c, c2 => { for (let i = 0; i < 9; i++) { c2.beginPath(); c2.arc(540 + Math.cos(Math.PI + i / 8 * Math.PI) * 330, 600 + Math.sin(Math.PI + i / 8 * Math.PI) * 300, 18, 0, TAU); c2.fill(); } }); }, '#b8662c', .4, { glow: { x: 540, y: 820, r: 700, col: '#ffe090', a: .5 } });
  const trees = Ly(c => { treeSil(c, 80, 1480, 700, 5); treeSil(c, 1010, 1480, 600, 9); c.fillRect(-OFF, 1480, W + 2 * OFF, 500); }, '#6a3a1a', .62, { glow: { x: 540, y: 820, r: 700, col: '#ffe090', a: .25 } });
  trees.front = (c, t) => { const bet = t > 20.9, away = ss(seg(t, 21.0, 21.6)); cutOn(c, c2 => figure(c2, 'nurse', 330, 1480, 1.35, { aR: bet ? .1 : (t > 17.5 && t < 18.8 ? -.5 : .12), rot: bet ? .05 : 0 }), '#3a1d0e', 1); cutOn(c, c2 => figure(c2, 'doc', lerp(800, 1030, away), 1480, 1.4, { flip: bet ? 1 : -1 }), '#2a1a22', 1); if (t > 20.3) cutOn(c, c2 => figure(c2, 'woman', lerp(1220, 940, ss(seg(t, 20.4, 21.0))) + away * 150, 1480, 1.3, { flip: -1 }), '#1c4a42', 1);
    if (t > 19.6) for (let k = 0; k < 6; k++) { const u = t - (19.66 + k * .24); if (u < 0 || u > 1.6) continue; cutOn(c, c2 => heartP(c2, 330 + Math.sin(u * 4 + k) * 40 + (k - 2.5) * 22, 1000 - u * 150, 28 + 8 * (k % 3)), '#e0382a', 1 - seg(u, 1.1, 1.6)); bloom(c, c2 => heartP(c2, 330 + Math.sin(u * 4 + k) * 40 + (k - 2.5) * 22, 1000 - u * 150, 34), '#ff3a2a', .4 * (1 - seg(u, 1.1, 1.6)), 16); }
    if (t > 21.0) { const u = seg(t, 21.0, 21.7), w = Math.max(0, (u - .35) / .65); if (u < .35) { cutOn(c, c2 => heartP(c2, 330, 1000, 70), '#e0382a', 1); bloom(c, c2 => heartP(c2, 330, 1000, 80), '#ff3a2a', .5, 20); } else { c.save(); c.translate(-w * 90, w * w * 360); c.rotate(-w * 1.2); cutOn(c, c2 => heartHalf(c2, 330, 1000, 70, -1), '#e0382a', 1); c.restore(); c.save(); c.translate(w * 90, w * w * 360); c.rotate(w * 1.2); cutOn(c, c2 => heartHalf(c2, 330, 1000, 70, 1), '#e0382a', 1); c.restore(); } } };
  return { layers: [sky, arch, trees, frontBand('#2b1408', 11)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 15.2, 21.6))) }) };
});
// 4a · VERSION A: grey, a death in the rain
addScene(21.6, 24.45, () => {
  const sky = Ly(SK('#7e838e', '#d5d8de', [{ x: 540, y: 900, r: 600, col: 'rgba(255,255,255,.4)' }]), '#000', 0, { raw: true });
  const mid = Ly(c => { treeSil(c, 120, 1500, 600, 21); treeSil(c, 960, 1500, 500, 23); c.fillRect(-OFF, 1500, W + 2 * OFF, 500); }, '#4a4e58', .6);
  mid.front = (c, t) => { const f = eo(seg(t, 23.68, 24.2)); cutOn(c, c2 => figure(c2, 'nurse', 540 - 40 * f, 1500 - 30 * f, 1.4, { rot: -1.4 * f }), '#20232a', 1);
    c.save(); c.strokeStyle = 'rgba(30,36,50,.55)'; c.lineWidth = 4; const R = mulberry(9); for (let i = 0; i < 90; i++) { const x = R() * W, sp = .6 + R() * .6, y = ((t * 900 * sp + R() * 2200) % 2300) - 200; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 8, y + 56); c.stroke(); } c.restore();
    if (f > .5) { const u = seg(t, 24.0, 24.45); ghostFig(c, 440 - 40 * u, 1450 - 380 * u, 1.4 + u * .5, .8 * (1 - u * .85), { aL: -2.4, aR: -2.4 }); } };
  return { layers: [sky, mid, frontBand('#1c1e24', 13)], cam: t => ({ x: 0, y: 0, z: 1.04 }), over: (c, t) => { strip(c, t, 21.8, .8, 'VERSION A', 540, 330, 60, { col: '#e6e8ee', bg: '#20232a', t1: 24.4 }); } };
});
// 4b · VERSION B: the ward at night; she cannot rest
function wardLayers(ward) {
  const sky = Ly(SK('#141b40', '#556699', [{ x: 740, y: 560, r: 520, col: 'rgba(235,240,255,.5)' }]), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { archPath(c2, 740, 300, 300, 600); c2.fill(); }); c.fillRect(110, 400, 200, 250); hole(c, c2 => { c2.fillRect(190, 440, 36, 170); c2.fillRect(150, 500, 116, 36); }); }, '#222c5a', .3, { glow: { x: 740, y: 560, r: 620, col: '#dfe8ff', a: .3 } });
  wall.back = (c, t) => { cutOn(c, c2 => archPath(c2, 740, 300, 300, 600), ward.warm ? '#ffd890' : '#c6d4f2', .96); cutOn(c, c2 => { c2.beginPath(); c2.arc(740, 440, 70, 0, TAU); c2.fill(); }, '#fff8e0', ward.warm ? 0 : .98); cutOn(c, c2 => { c2.fillRect(190, 440, 36, 170); c2.fillRect(150, 500, 116, 36); }, '#c6d4f2', .9); };
  wall.front = (c, t) => { bloom(c, c2 => archPath(c2, 740, 300, 300, 600), ward.warm ? '#ffcf80' : '#aabfee', .45, 40); };
  return [sky, wall];
}
addScene(24.45, 29.75, () => {
  const [sky, wall] = wardLayers({});
  const mid = Ly(c => { c.fillRect(-OFF, 1470, W + 2 * OFF, 600); }, '#0f1636', .6);
  mid.front = (c, t) => { cutOn(c, c2 => bedSil(c2, 740, 1470, 1.2), '#0a0f26', 1); const ring = t < 26.86 || t > 28.9, sh = ring ? Math.sin(t * 80) * 4 : 0; cutOn(c, c2 => { c2.fillRect(960 + sh - 6, 1020, 12, 160); c2.beginPath(); poly0(c2, [[920 + sh, 1020], [930 + sh, 970], [960 + sh, 940], [990 + sh, 970], [1000 + sh, 1020]]); c2.fill(); }, '#e8b84a', .95);
    const dead = t > 26.86; cutOn(c, c2 => { c2.fillRect(150, 1380, 140, 20); c2.fillRect(150, 1300, 14, 160); c2.fillRect(276, 1400, 14, 80); }, '#0a0f26', 1); cutOn(c, c2 => figure(c2, 'nurse', 240, 1470, 1.25, { rot: dead ? .25 : .1 * Math.sin(t * 6) }), '#0a0f26', 1);
    if (dead) { const lift = ss(seg(t, 26.86, 27.8)), pull = ss(seg(t, 28.0, 28.7)), snap = ss(seg(t, 28.8, 29.4)), y = lerp(1450, 760, Math.min(1, lift * .55 + pull * .45) * (1 - snap)); c.save(); c.strokeStyle = 'rgba(230,245,240,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(240, 1350); c.quadraticCurveTo(240 + 40 * Math.sin(t * 7), (1350 + y) / 2, 240, y - 60); c.stroke(); c.restore(); ghostFig(c, 240, y, 1.25 * (1 + pull * .2 * (1 - snap)), .9, { aL: pull > 0 && snap < 1 ? -2.4 : .12, aR: pull > 0 && snap < 1 ? -2.4 : .12 }); } };
  return { layers: [sky, wall, mid, frontBand('#04060f', 17)], cam: t => ({ x: 0, y: 0, z: 1.05 }), over: (c, t) => { strip(c, t, 24.6, .8, 'VERSION B', 540, 330, 60, { col: '#c9d4ee', t1: 29.7 }); } };
});
// 5 · THE NIGHT VISIT
addScene(29.75, 36.7, () => {
  const ward = { warm: false }; const [sky, wall] = wardLayers(ward);
  const wb = wall.back; wall.back = (c, t) => { ward.warm = t > 35.4; wb(c, t); if (t > 35.4) cutOn(c, c2 => archPath(c2, 740, 300, 300, 600), '#ffd890', flare(t, 35.4, .95)); };
  const mid = Ly(c => { c.fillRect(-OFF, 1470, W + 2 * OFF, 600); }, '#0f1636', .6);
  mid.front = (c, t) => { const calm = ss(seg(t, 35.35, 35.8)), sh = t < 35.35 ? Math.sin(t * 90) * 3 : 0; cutOn(c, c2 => bedSil(c2, 740 + sh * (1 - calm), 1470, 1.2), '#0a0f26', 1);
    const arrive = ss(seg(t, 30.4, 32.6)), x = lerp(-100, 380, arrive), med = ss(seg(t, 33.9, 34.3)) * (1 - ss(seg(t, 35.0, 35.3))), tuck = ss(seg(t, 35.35, 35.8));
    ghostFig(c, x, 1480 + Math.sin(t * 4) * 6, 1.6, .92, { rot: ss(seg(t, 33.0, 33.5)) * .08, aR: med > .2 ? -2.4 * med : (tuck > .2 ? -1.2 : .12) });
    if (med > .01) { cutOn(c, c2 => { c2.beginPath(); poly0(c2, [[x + 100, 940], [x + 96, 900], [x + 108, 870], [x + 110, 840], [x + 126, 840], [x + 128, 870], [x + 140, 900], [x + 136, 940]]); c2.fill(); }, '#7fe0b0', med); } };
  return { layers: [sky, wall, mid, frontBand('#04060f', 19)], cam: t => { const pz = ss(seg(t, 35.3, 36.7)); return { x: lerp(0, 60, pz), y: lerp(0, 120, pz), z: lerp(1.04, 1.28, pz) }; } };
});
// 6 · THE DISCOVERY (morning)
function lobbyLayers() {
  const sky = Ly(SK('#f2c773', '#fff0b8', [{ x: 280, y: 760, r: 900, col: 'rgba(255,250,214,.9)' }]), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { archPath(c2, 250, 360, 300, 700); c2.fill(); }); for (const [x, y, w, h] of [[560, 500, 150, 190], [750, 470, 170, 220], [940, 510, 130, 170]]) { c.fillRect(x - 10, y - 10, w + 20, h + 20); hole(c, c2 => c2.fillRect(x, y, w, h)); } }, '#b87a2c', .3, { glow: { x: 400, y: 800, r: 800, col: '#ffffe0', a: .4 } });
  wall.back = (c, t) => { cutOn(c, c2 => archPath(c2, 250, 360, 300, 700), '#fffbe0', 1); cutOn(c, c2 => { for (const [x, y, w, h] of [[560, 500, 150, 190], [750, 470, 170, 220], [940, 510, 130, 170]]) c2.fillRect(x, y, w, h); }, '#f6e0a0', .85); };
  wall.front = (c, t) => bloom(c, c2 => archPath(c2, 250, 360, 330, 740), '#fff8d0', .5, 50);
  return [sky, wall];
}
addScene(36.7, 43.0, () => {
  const [sky, wall] = lobbyLayers(); const mid = Ly(c => { c.fillRect(540, 1100, 520, 380); c.fillRect(-OFF, 1470, W + 2 * OFF, 600); }, '#7a4a1c', .6);
  mid.front = (c, t) => { const talk = t < 40.6 ? Math.sin(t * 9) * .03 : 0, gl = ss(seg(t, 40.65, 41.0)); cutOn(c, c2 => figure(c2, 'pj', 300, 1480, 1.4, { rot: talk, aR: t < 39.9 ? -1.0 + Math.sin(t * 6) * .2 : -.3 }), '#2a1c14', 1); for (const [bx, by, bc] of [[420, 1010, '#e0463a'], [450, 990, '#f2c15a'], [400, 985, '#fff']]) cutOn(c, c2 => { c2.beginPath(); c2.arc(bx, by, 22, 0, TAU); c2.fill(); }, bc, 1);
    cutOn(c, c2 => figure(c2, 'matron', 720, 1480, 1.25, { flip: -1, aR: gl > .5 ? -1.5 : .12 }), '#3a2a50', 1); cutOn(c, c2 => figure(c2, 'doc', 920, 1480, 1.3, { flip: -1 }), '#1f2a44', 1); };
  return { layers: [sky, wall, mid, frontBand('#2b1a08', 23)], cam: t => ({ x: 0, y: 0, z: 1.05 }), over: (c, t) => { for (const [t0, x, y] of [[41.0, 720, 880], [41.4, 920, 880], [42.0, 330, 940]]) strip(c, t, t0, .4, '?', x, y, 120, { col: '#ffcf8a', scale: 1.6, t1: 43.0 }); } };
});
// 7 · THE IMPOSSIBLE TRUTH
addScene(43.0, 50.3, () => {
  const [sky, wall] = lobbyLayers(); const mid = Ly(c => { c.fillRect(-OFF, 1470, W + 2 * OFF, 600); }, '#7a4a1c', .6);
  mid.front = (c, t) => { ghostFig(c, 750, 770, .8, .0, {}); const pz = seg(t, 46.8, 47.4); cutOn(c, c2 => { c2.fillRect(630, 280, 240, 330); }, '#f6e0a0', .85); ghostFig(c, 750, 600, .62, .95, { aL: .12, aR: .12 }); cutOn(c, c2 => { c2.beginPath(); poly0(c2, [[630, 280], [760, 280], [630, 400]]); c2.fill(); }, '#0b0806', 1);
    const dbl = seg(t, 48.4, 49.0), stiff = t > 49.1 && t < 49.5, run = seg(t, 49.5, 50.3), walk = ss(seg(t, 43.0, 45.6)), px = t < 45.6 ? lerp(300, 580, walk) : t < 49.5 ? 580 : 580 + run * run * 900, jump = dbl > 0 && dbl < .4 ? 90 * Math.sin(dbl / .4 * Math.PI) : 0;
    cutOn(c, c2 => figure(c2, 'pj', px + (dbl > 0 && !stiff ? Math.sin(t * 80) * 4 : 0), 1480 - jump, 1.4, { aL: dbl > 0 ? -2.6 : .12, aR: dbl > 0 ? -2.6 : .12, rot: t >= 49.5 ? .2 : 0 }), '#2a1c14', 1); };
  return { layers: [sky, wall, mid, frontBand('#2b1a08', 29)], cam: t => { const pz = ss(seg(t, 46.8, 49.1)); return { x: lerp(0, 150, pz), y: lerp(0, -330, pz), z: lerp(1.04, 1.7, pz) }; } };
});
// 8 · THE FINAL TWIST: the lamp is carried away
addScene(50.3, 62.4, () => {
  const [sky, wall] = wardLayers({});
  const mid = Ly(c => { c.fillRect(-OFF, 1470, W + 2 * OFF, 600); }, '#0f1636', .6);
  mid.front = (c, t) => { cutOn(c, c2 => bedSil(c2, 740, 1470, 1.2), '#0a0f26', 1); const tuck = t > 53.3 && t < 54.3, wag = t > 54.4 && t < 55.5; ghostFig(c, 360, 1480 + Math.sin(t * 4) * 6, 1.6, .93, { rot: tuck ? .08 : 0, aR: wag ? -2.0 + Math.sin(t * 22) * .1 : (t > 56.3 && t < 57.2 ? -1.2 : .12) });
    if (t > 55.7) { const u = seg(t, 55.7, 58.2), hx = lerp(430, 700, ss(u)), hy = 1160 - 280 * eo(u) + Math.sin(u * 14) * 10, k = (1 + .1 * Math.sin(t * 9)) * back(Math.min(1, seg(t, 55.7, 56.1))); cutOn(c, c2 => heartP(c2, hx, hy, 52 * k), '#e0382a', 1); bloom(c, c2 => heartP(c2, hx, hy, 64 * k), '#ff3a2a', .6, 26); } };
  return { layers: [sky, wall, mid, frontBand('#04060f', 31)], box: true, cam: t => ({ x: 0, y: 0, z: lerp(1.12, 1.0, ss(seg(t, 50.3, 54))) }), over: (c, t) => { strip(c, t, 58.2, .8, 'THE NURSE IS A LEGEND.', 540, 300, 54, { col: '#ffcf8a', t1: 62.0 }); strip(c, t, 59.2, .8, 'HER STORY STILL HAUNTS MEXICO.', 540, 420, 40, { col: '#bfe8d8', t1: 62.0 }); } };
});
const back = t => { t = clamp(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

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
  const SA = getScene(i), tgt = SA.box && t > 59.0 ? INNER.getContext('2d') : ctx;
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
    const a = t0 - .1, b = t0 + d + .5; if (t < a || t > b || t >= 59.0) continue;
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
