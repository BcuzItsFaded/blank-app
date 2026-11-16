// La Llorona: a paper-cut lightbox film, 1080x1920. Layered cut paper, backlight, cast shadows. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70, TAU = Math.PI * 2;
window.DUR = 60.4;

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
  ['v01', 0.35, 6.122, "What if I told you La Llorona's legend is far older than the story of a mother drowning her children?"],
  ['v02', 6.91, 6.014, 'Centuries ago, the people of ancient Mexico told of a mysterious woman crying through the darkness.'],
  ['v03', 13.37, 6.511, 'Before the Spanish conquest, an omen described a woman wandering the streets, desperately crying out for her children.'],
  ['v04', 20.32, 6.728, 'Some researchers connect those cries to Cihuacóatl, an ancient Aztec goddess associated with motherhood.'],
  ['v05', 27.48, 7.48, 'Over time, another story emerged. A woman named María, betrayed by the man she loved, drowned her own children in a river.'],
  ['v06', 35.41, 6.402, 'Consumed by guilt and sorrow, her spirit was said to wander the rivers forever, screaming, "¡Ay, mis hijos!"'],
  ['v07', 42.25, 7.371, 'But historians have never confirmed that this tragedy happened. Different regions tell completely different versions of her story.'],
  ['v08', 50.06, 8.54, 'Maybe La Llorona was never one woman. But for centuries, one terrifying warning has survived: Never follow the crying near the water.'],
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
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * .22; c.filter = 'blur(26px)'; c.fillStyle = '#cfe6f2'; blob(c, [[-40, -300], [40, -300], [70, -80], [0, 20], [-70, -80]]); c.restore();
  c.fillStyle = '#eef6f6';
  blob(c, [[-34, -300], [34, -300], [26, -180], [78, -40], [40, 26], [0, -10], [-40, 26], [-78, -40], [-26, -180]]);
  const up = pose === 'cry' ? 1 : pose === 'reach' ? .5 : 0;
  for (const s of [-1, 1]) { const ex = s * (18 + up * 10), ey = -300 + up * -26 + (1 - up) * 90; c.save(); c.lineCap = 'round'; c.strokeStyle = '#eef6f6'; c.lineWidth = 20; c.beginPath(); c.moveTo(s * 30, -280); c.lineTo(ex, ey); c.stroke(); c.restore(); }
  c.beginPath(); c.ellipse(0, -330, 30, 36, 0, 0, TAU); c.fill();
  c.fillStyle = '#dcebf0'; blob(c, [[-40, -356], [-34, -300], [-20, -190], [-8, -300], [8, -300], [20, -190], [34, -300], [40, -356], [0, -374]]);
  if (pose === 'cry') { c.globalAlpha = a; c.fillStyle = '#13314a'; c.beginPath(); c.ellipse(-11, -336, 5, 9, 0, 0, TAU); c.ellipse(11, -336, 5, 9, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -314, 7, 11, 0, 0, TAU); c.fill(); }
  c.restore();
}
function child(c, x, y, k, a) { c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = a; c.fillStyle = '#d7e8ef'; blob(c, [[-18, -120], [18, -120], [26, -14], [-26, -14]]); c.beginPath(); c.ellipse(0, -136, 17, 19, 0, 0, TAU); c.fill(); c.restore(); }
function reeds(c, y, x0, x1, hmax, seed) { const R = mulberry(seed); for (let x = x0; x < x1; x += 22) { const h = hmax * (.5 + R() * .7), bend = (R() - .5) * 30; c.save(); c.strokeStyle = c.fillStyle; c.lineWidth = 5 + R() * 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + bend * .5, y - h * .6, x + bend, y - h); c.stroke(); c.restore(); } }
function pyramid(c, cx, base, w, h, steps) { for (let i = 0; i < steps; i++) { const f = i / steps, f2 = (i + 1) / steps; poly0(c, [[cx - w / 2 * (1 - f), base - h * f], [cx + w / 2 * (1 - f), base - h * f], [cx + w / 2 * (1 - f) - w * .06, base - h * f2], [cx - w / 2 * (1 - f) + w * .06, base - h * f2]]); c.fill(); } poly0(c, [[cx - w * .12, base - h * .86], [cx + w * .12, base - h * .86], [cx + w * .1, base - h], [cx - w * .1, base - h]]); c.fill(); }
function cryArc(c, x, y, t, t0, col) { for (let k = 0; k < 4; k++) { const u = ((t - t0 - k * .4) / 1.8); if (u < 0 || u > 1) continue; c.save(); c.globalAlpha = (1 - u) * .7; c.strokeStyle = col || '#cfe4ee'; c.lineWidth = 7 - 4 * u; c.beginPath(); c.arc(x, y, 50 + u * 360, Math.PI * .7, Math.PI * 1.3); c.stroke(); c.restore(); } }
function manSil2(c, x, y, k) { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = '#0e0a18'; blob(c, [[-26, -220], [26, -220], [40, -14], [-40, -14]]); c.beginPath(); c.ellipse(0, -250, 26, 30, 0, 0, TAU); c.fill(); poly0(c, [[-30, -280], [30, -280], [26, -260], [-26, -260]]); c.fill(); c.restore(); }

// ======================================================= SCENES =======================================================
addScene(0, 6.91, () => {
  const moon = { x: 760, y: 380 };
  const sky = Ly(SK('#111f38', '#2d4a6a', [{ x: moon.x, y: moon.y, r: 560, col: 'rgba(230,225,190,.55)' }]), '#000', 0, { raw: true, front: c => { bloom(c, c2 => { c2.beginPath(); c2.arc(moon.x, moon.y, 92, 0, TAU); c2.fill(); }, '#efe8cf', .8, 20); c.fillStyle = '#efe8cf'; c.beginPath(); c.arc(moon.x, moon.y, 88, 0, TAU); c.fill(); } });
  const hills = Ly(c => { cloudBand(c, 760, 3, 90); }, '#1a2c45', .3, { glow: { x: moon.x, y: moon.y, r: 500, col: '#c9d4e8', a: .2 } });
  const far = Ly(c => skylineFar(c, 980, 12, 120, 230, false), '#15273e', .42);
  const wlay = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { water(c, t, 1000, 5, { x: moon.x }, 300); llorona(c, 300, 980, .78, .9, 'idle', t); } });
  const near = Ly(c => { c.fillStyle = '#070e18'; reeds(c, 1500, -40, 360, 420, 7); reeds(c, 1540, 760, W + 40, 360, 9); }, '#070e18', .85);
  return { layers: [sky, hills, far, wlay, near], cam: t => ({ x: 6 * Math.sin(t * .5), y: 0, z: lerp(1.0, 1.1, ss(seg(t, 0, 6.91))) }), over: (c, t) => { strip(c, t, .1, .9, 'PLOT TWIST WITH A&R  ·  EPISODE 17', 540, 150, 30, { col: '#9fb8d0', font: 'Cormorant Garamond' }); strip(c, t, .4, 1.2, 'LA LLORONA', 540, 300, 86, { col: '#cfe6f2' }); strip(c, t, 2.6, 1.0, 'THE WEEPING WOMAN', 540, 420, 46, { col: '#9fc2d6', t1: 6.8 }); } };
});
addScene(6.91, 13.37, () => {
  const sky = Ly(SK('#141026', '#3a2c48', [{ x: 540, y: 1100, r: 600, col: 'rgba(150,110,150,.28)' }]), '#000', 0, { raw: true });
  const hills = Ly(c => cloudBand(c, 820, 15, 110), '#241a36', .28);
  const temple = Ly(c => { c.fillStyle = '#120d22'; pyramid(c, 540, 1180, 640, 620, 7); }, '#120d22', .5, { glow: { x: 540, y: 760, r: 300, col: '#d8a24a', a: .25 } });
  temple.back = (c, t) => cutOn(c, c2 => { c2.fillRect(500, 600, 80, 70); }, '#f0b45a', .9 * (0.8 + .2 * Math.sin(t * 7)));
  const mist = Ly(c => cloudBand(c, 1250, 6, 90), '#3a3050', .7, { noShadow: true }); mist.alpha = .4; mist.drift = 30;
  const wlay = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { llorona(c, 540, 1360, 1.1, .92, 'cry', t); cryArc(c, 540, 1050, t, 8.0); } });
  return { layers: [sky, hills, temple, mist, wlay, frontBand('#05040a', 15)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.12, ss(seg(t, 6.91, 13.37))) }) };
});
addScene(13.37, 20.32, () => {
  const sky = Ly(SK('#15213c', '#3a4e6e', [{ x: 300, y: 500, r: 480, col: 'rgba(220,210,170,.4)' }]), '#000', 0, { raw: true, front: c => { c.fillStyle = '#e7dec4'; c.beginPath(); c.arc(300, 440, 70, 0, TAU); c.fill(); } });
  const city = Ly(c => { rowHouses(c, -40, W + 40, 900, 31, 160, 300); c.fillStyle = '#101a2e'; pyramid(c, 820, 900, 300, 320, 6); }, '#18253f', .42, { glow: { x: 300, y: 500, r: 600, col: '#cdd8ec', a: .18 } });
  const wall = Ly(c => { c.fillStyle = '#0c1424'; c.fillRect(-OFF, 980, W + 2 * OFF, 40); }, '#0c1424', .62);
  const canal = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { water(c, t, 1010, 19, { x: 300 }, null); const wx = lerp(760, 300, ss(seg(t, 13.6, 19.5))); llorona(c, wx, 1010, .9, .9, 'cry', t); cryArc(c, wx, 760, t, 15.0); } });
  const near = Ly(c => { c.fillStyle = '#060b16'; c.fillRect(-OFF, 1300, W + 2 * OFF, 700); }, '#060b16', .85);
  return { layers: [sky, city, wall, canal, near], cam: t => ({ x: lerp(30, -30, ss(seg(t, 13.37, 20.32))), y: 0, z: 1.06 }), over: (c, t) => { strip(c, t, 14.0, .8, '¿POR QUÉ?', 820, 360, 40, { col: '#e7dec4', t1: 20.2 }); } };
});
addScene(20.32, 27.48, () => {
  const sky = Ly(SK('#0f2420', '#245048', [{ x: 540, y: 700, r: 520, col: 'rgba(120,200,160,.3)' }]), '#000', 0, { raw: true });
  const temple = Ly(c => { c.fillStyle = '#08201c'; pyramid(c, 540, 1120, 700, 560, 6); }, '#08201c', .4, { glow: { x: 540, y: 700, r: 460, col: '#66c79a', a: .35 } });
  const glyph = Ly(c => { c.fillStyle = '#0c2a24'; c.beginPath(); c.arc(540, 560, 150, 0, TAU); c.fill(); }, '#0c2a24', .55, { glow: { x: 540, y: 560, r: 240, col: '#8fe0b4', a: .4 } });
  glyph.back = (c, t) => cutOn(c, c2 => { c2.save(); c2.translate(540, 560); for (let i = 0; i < 2; i++) { c2.rotate(Math.PI); c2.beginPath(); c2.moveTo(-70, -20); c2.quadraticCurveTo(0, -90, 70, -20); c2.quadraticCurveTo(0, 20, -70, -20); c2.fill(); } c2.restore(); }, '#7fe0b0', .9);
  const god = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { const a = ss(seg(t, 20.6, 22.0)); c.save(); c.globalAlpha = a; c.fillStyle = '#0a241e'; blob(c, [[540 - 70, 1120], [540 - 56, 820], [540 - 90, 700], [540 - 40, 640], [540, 600], [540 + 40, 640], [540 + 90, 700], [540 + 56, 820], [540 + 70, 1120]]); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(540 + s * 36, 660); c.quadraticCurveTo(540 + s * 150, 560, 540 + s * 110, 460); c.quadraticCurveTo(540 + s * 70, 540, 540 + s * 30, 620); c.fill(); } c.restore(); } });
  return { layers: [sky, temple, glyph, god, frontBand('#04120f', 31)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 20.32, 27.48))) }), over: (c, t) => { strip(c, t, 21.0, 1.0, 'CIHUACÓATL', 540, 1360, 52, { col: '#8fe0b4', t1: 27.3 }); } };
});
addScene(27.48, 35.41, () => {
  const sky = Ly(SK('#1a1326', '#4a3652', [{ x: 820, y: 460, r: 420, col: 'rgba(230,220,180,.35)' }]), '#000', 0, { raw: true, front: c => { c.fillStyle = '#eadfbf'; c.beginPath(); c.arc(820, 420, 64, 0, TAU); c.fill(); } });
  const town = Ly(c => { rowHouses(c, -40, W + 40, 820, 61, 180, 320); }, '#1c1430', .4, { glow: { x: 820, y: 460, r: 560, col: '#d8cdee', a: .16 } });
  const bank = Ly(c => { c.fillStyle = '#0e0a18'; c.fillRect(-OFF, 980, W + 2 * OFF, 30); }, '#0e0a18', .6);
  const river = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { water(c, t, 1005, 27, { x: 820 }, null); const leave = ss(seg(t, 28.0, 30.0)); if (leave < 1) { c.save(); c.globalAlpha = 1 - leave; manSil2(c, lerp(560, 980, leave), 1005, .9); c.restore(); } llorona(c, 320, 1005, .9, .92, 'reach', t); const drown = ss(seg(t, 32.6, 34.4)); for (const dx of [70, 150]) { const yy = lerp(960, 1120, drown), aa = 1 - drown * .9; if (drown < 1) child(c, 320 + dx, yy, .7, aa); if (drown > .2) cryArc(c, 320 + dx, 1030, t, 32.6 + dx * .002, '#9fc2d6'); } } });
  return { layers: [sky, town, bank, river, frontBand('#05040c', 41)], cam: t => ({ x: lerp(-10, 20, ss(seg(t, 27.48, 35.41))), y: 0, z: lerp(1.0, 1.08, ss(seg(t, 27.48, 35.41))) }), over: (c, t) => { strip(c, t, 28.4, .8, 'MARÍA', 320, 760, 46, { col: '#eadfbf', t1: 31.5 }); } };
});
addScene(35.41, 42.25, () => {
  const moon = { x: 540, y: 420 };
  const sky = Ly(SK('#0c1830', '#223a5a', [{ x: moon.x, y: moon.y, r: 600, col: 'rgba(225,220,185,.5)' }]), '#000', 0, { raw: true, front: c => { bloom(c, c2 => { c2.beginPath(); c2.arc(moon.x, moon.y, 100, 0, TAU); c2.fill(); }, '#eadfbf', .8, 22); c.fillStyle = '#eadfbf'; c.beginPath(); c.arc(moon.x, moon.y, 94, 0, TAU); c.fill(); } });
  const hills = Ly(c => cloudBand(c, 820, 24, 90), '#13243e', .3);
  const river = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { water(c, t, 820, 35, { x: moon.x }, 540); llorona(c, 540 + Math.sin(t * .6) * 40, 1120, 1.25, .9, 'cry', t); cryArc(c, 540, 700, t, 36.0); cryArc(c, 540, 700, t, 38.5); } });
  const near = Ly(c => { c.fillStyle = '#050b16'; reeds(c, 1560, -40, 300, 420, 7); reeds(c, 1580, 820, W + 40, 420, 9); }, '#050b16', .86);
  return { layers: [sky, hills, river, near], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 35.41, 42.25))) }), over: (c, t) => { strip(c, t, 38.6, 1.0, '«¡AY, MIS HIJOS!»', 540, 300, 48, { col: '#cfe4ee', t1: 42.1 }); } };
});
addScene(42.25, 50.06, () => {
  const sky = Ly(SK('#161a26', '#30384a'), '#000', 0, { raw: true });
  const map = Ly(c => { c.fillStyle = '#0e1420'; blob(c, [[180, 560], [360, 460], [560, 480], [760, 440], [900, 560], [820, 760], [900, 980], [760, 1180], [600, 1120], [460, 1240], [360, 1060], [240, 940], [300, 760]]); c.save(); c.strokeStyle = '#3f5f7a'; c.lineWidth = 4; c.globalAlpha = .7; for (const [sx, sy, ex, ey, b] of [[360, 540, 460, 900, 40], [600, 520, 540, 820, -30], [780, 560, 700, 1020, 20], [300, 820, 480, 1080, -20]]) { c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + ex) / 2 + b, (sy + ey) / 2, ex, ey); c.stroke(); } c.restore(); }, '#0e1420', .5, { glow: { x: 540, y: 800, r: 520, col: '#9fb8d0', a: .14 } });
  const figs = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { const pos = [[430, 900], [540, 820], [700, 1020], [470, 1080]]; pos.forEach(([x, y], i) => { const a = ss(seg(t, 43.0 + i * .7, 43.8 + i * .7)) * (.7 + .3 * Math.sin(t * 3 + i)); llorona(c, x, y, .42, a * .9, 'idle', t); }); } });
  return { layers: [sky, map, figs, frontBand('#04060c', 51)], cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.12, ss(seg(t, 42.25, 50.06))) }), over: (c, t) => { strip(c, t, 43.2, .8, 'MÉXICO', 540, 360, 44, { col: '#9fb8d0', t1: 50.0 }); } };
});
addScene(50.06, 60.4, () => {
  const moon = { x: 780, y: 420 };
  const sky = Ly(SK('#0a1326', '#1c3150', [{ x: moon.x, y: moon.y, r: 560, col: 'rgba(220,215,180,.45)' }]), '#000', 0, { raw: true, front: c => { bloom(c, c2 => { c2.beginPath(); c2.arc(moon.x, moon.y, 94, 0, TAU); c2.fill(); }, '#e6dcbe', .7, 22); c.fillStyle = '#e6dcbe'; c.beginPath(); c.arc(moon.x, moon.y, 88, 0, TAU); c.fill(); } });
  const hills = Ly(c => skylineFar(c, 960, 61, 120, 230, false), '#13243e', .4);
  const river = Ly(c => { }, '#000', 1, { raw: true, front: (c, t) => { water(c, t, 980, 55, { x: moon.x }, 360); const dis = ss(seg(t, 56.5, 59.6)); llorona(c, 360, 980, .8, .9 * (1 - dis), 'cry', t); } });
  const mist = Ly(c => cloudBand(c, 1300, 6, 100), '#3a4c66', .78, { noShadow: true }); mist.alpha = .36; mist.drift = 40;
  const near = Ly(c => { c.fillStyle = '#050b16'; reeds(c, 1540, -40, 420, 440, 7); reeds(c, 1560, 700, W + 40, 440, 9); }, '#050b16', .88);
  return { layers: [sky, hills, river, mist, near], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.14, ss(seg(t, 50.06, 60.4))) }), over: (c, t) => { strip(c, t, 55.0, 1.0, 'NEVER FOLLOW THE CRYING', 540, 300, 46, { col: '#cfe4ee', t1: 60.2 }); strip(c, t, 56.0, 1.0, 'NEAR THE WATER.', 540, 400, 46, { col: '#cfe4ee', t1: 60.2 }); } };
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
