// La Casa de Aramberri: a paper-cut lightbox film, 1080x1920. Layered cut paper, backlight, cast shadows. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, OFF = 70;
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
  ['v01', 0.3, 6.422, "In Monterrey, Mexico, there's a house where two women were brutally murdered… and where some claim their screams never stopped."],
  ['v02', 7.04, 8.711, 'April fifth, 1933. Antonia Lozano and her daughter, Florinda Montemayor, were home when their lives came to a horrifying end.'],
  ['v03', 16.07, 6.069, 'Both women were stabbed to death. Investigators discovered a brutal double murder that shocked the entire city.'],
  ['v04', 22.46, 6.72, 'The investigation pointed toward robbery. Thousands of pesos in gold were reportedly the target of the attackers.'],
  ['v05', 29.5, 6.666, "According to a famous legend, the family's parrot repeated a desperate cry that supposedly helped identify a killer."],
  ['v06', 36.49, 7.563, 'Suspects were identified, but the story of the talking parrot remains disputed. The real investigation was far more complicated.'],
  ['v07', 44.37, 6.792, "Years later, stories spread of women's screams, mysterious footsteps, and ghostly figures appearing inside the abandoned house."],
  ['v08', 51.48, 7.655, "But here's the terrifying truth: the murders really happened. The ghosts were never proven. Yet the house became one of Monterrey's darkest legends."],
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
const SCENES = [];       // {t0, t1, build}
function addScene(t0, t1, build) { SCENES.push({ t0, t1, build, S: null }); }
const SK = (top, bot, glow) => (c) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); if (glow) { const r = c.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.r); r.addColorStop(0, glow.col); r.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = r; c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); } };
const HOUSE = { x: 220, y: 730, w: 640, h: 520 };
const frontBand = (col, seed) => Ly(c => ground(c, 1470, seed), col, 1, { noShadow: false, rimA: .25 });
function winLights(c, wins, on, col = '#ffb25a', tOn = 0, t = 0) {
  for (const q of wins) { const a = on(q, t); if (a <= 0) continue; c.save(); c.globalAlpha = a * flick(t); const g = c.createLinearGradient(0, q.y, 0, q.y + q.h); g.addColorStop(0, col); g.addColorStop(1, rgba(col, .65)); c.fillStyle = g; archPath(c, q.x, q.y, q.w, q.h); c.fill(); c.restore(); }
}
function winBloom(c, wins, on, col, t) { for (const q of wins) { const a = on(q, t); if (a <= 0) continue; bloom(c, c2 => { archPath(c2, q.x, q.y, q.w * 1.2, q.h * 1.1); c2.fill(); }, col, .5 * a * flick(t), 30); } }

// 1 · THE HOUSE OF SCREAMS (night, cool ladder; amber + one red window)
addScene(0, 6.9, () => {
  const info = {}; const moon = { x: 790, y: 360 };
  const sky = Ly(SK('#18203c', '#6a7ca6', { x: moon.x, y: moon.y, r: 520, col: 'rgba(235,238,215,.55)' }), '#000', 0, { raw: true, front: (c) => { bloom(c, c2 => { c2.beginPath(); c2.arc(moon.x, moon.y, 110, 0, 7); c2.fill(); }, '#f4f0d8', .9, 18); c.fillStyle = '#f2eed6'; c.beginPath(); c.arc(moon.x, moon.y, 105, 0, 7); c.fill(); } });
  const clouds1 = Ly(c => { cloudBand(c, 560, 3, 70); }, '#4c5b7e', .12, { glow: { x: moon.x, y: moon.y, r: 600, col: '#e9efe0', a: .5 } });
  const clouds2 = Ly(c => { cloudBand(c, 700, 9, 90); }, '#3a4767', .22, { glow: { x: moon.x, y: moon.y, r: 560, col: '#e9efe0', a: .35 } });
  const far = Ly(c => skylineFar(c, 1190, 12, 90, 200), '#2b3552', .32, { glow: { x: moon.x, y: moon.y + 600, r: 700, col: '#d8e0f0', a: .22 } });
  const mid = Ly(c => rowHouses(c, -40, W + 40, 1260, 31, 220, 380, [[HOUSE.x - 10, HOUSE.x + HOUSE.w + 10]]), '#1a2038', .5, { glow: { x: moon.x, y: moon.y + 700, r: 700, col: '#c9d4ee', a: .16 } });
  let fa; const house = Ly(c => { fa = facade(c, HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h); c.fillRect(HOUSE.x - 40, HOUSE.y + HOUSE.h, HOUSE.w + 80, 40); }, '#10152a', .66, { rimA: .35 });
  const on = (q, t) => { const i = fa.wins.indexOf(q); if (i === 4) return 0; if (i === 1) return .55 + .45 * seg(t, 4.6, 5.6) * (.8 + .2 * Math.sin(t * 9)); if (i === 3) return .85 * seg(t, 1.5, 2.2); return 0; };
  house.back = (c, t) => { winLights(c, fa.wins, on, '#ffb25a', 0, t); winLights(c, [fa.wins[1]], () => 0, '#d6362c'); const q = fa.wins[1]; const r = seg(t, 4.5, 5.4) * (.7 + .3 * Math.sin(t * 8)); if (r > 0) { c.save(); c.globalAlpha = r; c.fillStyle = '#d6362c'; archPath(c, q.x, q.y, q.w, q.h); c.fill(); c.restore(); } };
  house.front = (c, t) => { winBloom(c, fa.wins, on, '#ff9a40', t); const q = fa.wins[1]; const r = seg(t, 4.5, 5.4); if (r > 0) bloom(c, c2 => { archPath(c2, q.x, q.y, q.w * 1.3, q.h * 1.15); c2.fill(); }, '#ff3b2a', .6 * r, 34); };
  const near = Ly(c => { treeSil(c, 120, 1420, 560, 7); treeSil(c, 960, 1420, 420, 11); fence(c, 1430, -20, W + 20, 100); }, '#0a0e1c', .84);
  return { layers: [sky, clouds1, clouds2, far, mid, house, near, frontBand('#04050a', 3)], cam: t => ({ x: 8 * Math.sin(t * .6), y: 0, z: lerp(1.0, 1.22, ss(seg(t, 0, 6.9))) }),
    over: (c, t) => { strip(c, t, 0.1, .9, 'PLOT TWIST WITH A&R  ·  EPISODE 15', 540, 150, 34, { col: '#c9d4ee', font: 'Cormorant Garamond' }); strip(c, t, .5, 1.3, 'LA CASA DE ARAMBERRI', 540, 330, 78, { col: '#ffcf8a' }); strip(c, t, 2.5, 1.0, 'THE HOUSE OF SCREAMS', 540, 450, 54, { col: '#ff6a50', t1: 6.9 }); } };
});

// 2 · A NORMAL MORNING (dawn, warm ladder)
addScene(6.9, 15.9, () => {
  const sun = { x: 540, y: 1100 };
  const sky = Ly(SK('#efb273', '#fbe5b6', { x: sun.x, y: sun.y, r: 700, col: 'rgba(255,240,200,.6)' }), '#000', 0, { raw: true });
  const clouds = Ly(c => cloudBand(c, 600, 5, 80), '#f0b27c', .14, { glow: { x: sun.x, y: sun.y, r: 800, col: '#fff0c8', a: .5 } });
  const far = Ly(c => skylineFar(c, 1190, 22, 80, 190), '#d79866', .3, { glow: { x: sun.x, y: sun.y, r: 700, col: '#ffe8b0', a: .4 } });
  const mid = Ly(c => rowHouses(c, -40, W + 40, 1260, 41, 220, 380, [[HOUSE.x - 10, HOUSE.x + HOUSE.w + 10]]), '#a35f3f', .5, { glow: { x: sun.x, y: sun.y, r: 700, col: '#ffe0a0', a: .3 } });
  let fa; const house = Ly(c => { fa = facade(c, HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h); c.fillRect(HOUSE.x - 40, HOUSE.y + HOUSE.h, HOUSE.w + 80, 40); }, '#6b3a2a', .66, { glow: { x: sun.x, y: sun.y, r: 560, col: '#ffcf80', a: .3 }, rim: '#ffe2a8', rimA: .6 });
  const on = (q, t) => { const i = fa.wins.indexOf(q); return (i === 0 || i === 2) ? seg(t, 7.2, 8.0) * .95 : i === 4 || i === 3 ? seg(t, 7.4, 8.4) * .8 : i === 1 ? .6 * seg(t, 7.4, 8.4) : 0; };
  house.back = (c, t) => { winLights(c, fa.wins, on, '#ffc46a', 0, t); c.fillStyle = '#1b0d0a'; const p1 = seg(t, 9.6, 10.4), p2 = seg(t, 11.5, 12.3); if (p1 > 0) { c.save(); c.globalAlpha = p1; c.beginPath(); const q = fa.wins[0]; archPath(c, q.x, q.y, q.w, q.h); c.clip(); woman(c, q.x, q.y + 62, 1.0, 'old'); c.restore(); } if (p2 > 0) { c.save(); c.globalAlpha = p2; const q = fa.wins[2]; archPath(c, q.x, q.y, q.w, q.h); c.clip(); woman(c, q.x, q.y + 62, 1.0, 'young'); c.restore(); } };
  house.front = (c, t) => winBloom(c, fa.wins, on, '#ffb050', t);
  const near = Ly(c => { fence(c, 1440, -20, W + 20, 90); treeSil(c, 90, 1420, 380, 17); }, '#3a1c13', .84);
  return {
    layers: [sky, clouds, far, mid, house, near, frontBand('#1b0c08', 8)], cam: t => ({ x: lerp(-24, 24, ss(seg(t, 6.9, 15.9))), y: 0, z: lerp(1.12, 1.0, ss(seg(t, 6.9, 15.9))) }),
    over: (c, t) => { strip(c, t, 7.7, .9, 'APRIL 5, 1933', 540, 330, 78, { col: '#ffd69a' }); strip(c, t, 10.3, .8, 'ANTONIA LOZANO', 330, 1300, 40, { col: '#ffd69a' }); strip(c, t, 12.3, .8, 'FLORINDA MONTEMAYOR', 700, 1380, 38, { col: '#ffd69a' }); }
  };
});

// 3 · THE MURDERS (red-black ladder; lights go out; a city wakes)
addScene(15.9, 22.3, () => {
  const rl = { x: 540, y: 1300 };
  const sky = Ly(SK('#33090f', '#7a2630', { x: rl.x, y: rl.y, r: 800, col: 'rgba(210,50,40,.45)' }), '#000', 0, { raw: true });
  const clouds = Ly(c => cloudBand(c, 620, 15, 90), '#4a141a', .14, { glow: { x: rl.x, y: rl.y, r: 800, col: '#e04a3a', a: .25 } });
  let farWins = []; const far = Ly(c => { skylineFar(c, 1190, 52, 90, 220); const r = mulberry(8); for (let i = 0; i < 26; i++) farWins.push([rnd(10, W - 20), rnd(1010, 1170)]); hole(c, c2 => { for (const [x, y] of farWins) c2.fillRect(x, y, 10, 14); }); }, '#2b0b11', .3, {
    back: (c, t) => { for (let i = 0; i < farWins.length; i++) { const a = seg(t, 20.2 + i * .06, 20.6 + i * .06); if (a > 0) { c.fillStyle = rgba('#ffb25a', a * .9 * flick(t + i)); c.fillRect(farWins[i][0], farWins[i][1], 10, 14); } } },
    front: (c, t) => { for (let i = 0; i < farWins.length; i++) { const a = seg(t, 20.2 + i * .06, 20.6 + i * .06); if (a > 0) bloom(c, c2 => c2.fillRect(farWins[i][0] - 5, farWins[i][1] - 5, 20, 24), '#ff9a40', .5 * a, 10); } }
  });
  const mid = Ly(c => rowHouses(c, -40, W + 40, 1260, 61, 220, 380, [[HOUSE.x - 10, HOUSE.x + HOUSE.w + 10]]), '#1b070c', .5, { glow: { x: rl.x, y: rl.y, r: 700, col: '#d8402e', a: .22 } });
  let fa; const house = Ly(c => { fa = facade(c, HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h); c.fillRect(HOUSE.x - 40, HOUSE.y + HOUSE.h, HOUSE.w + 80, 40); }, '#0e0407', .66, { rim: '#ff8a70', rimA: .3 });
  const red = (t) => seg(t, 16.7, 17.0) * (1 - seg(t, 19.2, 20.0) * 0) ;
  const on = (q, t) => { const i = fa.wins.indexOf(q); if (t < 16.75) return .85 * seg(t, 15.9, 16.3); if (i === 1) return (.55 + .45 * Math.sin(t * 6)) * (t < 21.5 ? 1 : 1 - seg(t, 21.5, 22.0)); const off = [17.4, 0, 17.9, 18.4, 18.9][i] ?? 17.5; return t > off ? 0 : .8 * (.5 + .5 * Math.abs(Math.sin(t * 20))) * (t > 16.75 ? 1 : 1); };
  house.back = (c, t) => { for (const q of fa.wins) { const a = on(q, t); if (a <= 0) continue; const isRed = t > 16.75; c.save(); c.globalAlpha = a * flick(t); c.fillStyle = isRed ? '#d6362c' : '#ffb25a'; archPath(c, q.x, q.y, q.w, q.h); c.fill(); c.restore(); } };
  house.front = (c, t) => { for (const q of fa.wins) { const a = on(q, t); if (a > 0) bloom(c, c2 => { archPath(c2, q.x, q.y, q.w * 1.3, q.h * 1.15); c2.fill(); }, t > 16.75 ? '#ff2a1a' : '#ff9a40', .55 * a, 34); } };
  const near = Ly(c => { treeSil(c, 110, 1420, 520, 21); treeSil(c, 980, 1420, 400, 23); fence(c, 1432, -20, W + 20, 100); }, '#090305', .84);
  return {
    layers: [sky, clouds, far, mid, house, near, frontBand('#050203', 13)],
    cam: t => { const sh = (hit => hit * Math.sin(t * 60) * 8 * Math.exp(-(t - 16.75) * 7))(t > 16.75 ? 1 : 0) + (t > 17.3 ? 5 * Math.sin(t * 55) * Math.exp(-(t - 17.3) * 8) : 0); return { x: sh, y: sh * .5, z: lerp(1.04, 1.14, ss(seg(t, 15.9, 22.3))) }; },
    over: (c, t) => { strip(c, t, 17.9, .9, 'DOUBLE MURDER', 540, 330, 86, { col: '#ff5a48', bg: '#12080a', t1: 22.0 }); strip(c, t, 20.5, .8, 'THE CITY WAS SHOCKED', 540, 440, 44, { col: '#ffb870', t1: 22.2 }); }
  };
});

// 4 · THE MOTIVE (gold)
addScene(22.3, 29.4, () => {
  const gl = { x: 540, y: 980 };
  const sky = Ly(SK('#24130a', '#7a4a1c', { x: gl.x, y: gl.y, r: 640, col: 'rgba(255,200,100,.5)' }), '#000', 0, { raw: true });
  const wall = Ly(c => { for (let i = 0; i < 3; i++) { const x = 200 + i * 340; archPath(c, x, 560, 260, 700); c.fill(); } c.fillRect(-20, 1240, W + 40, 300); hole(c, c2 => { for (let i = 0; i < 3; i++) { archPath(c2, 200 + i * 340, 600, 190, 640); c2.fill(); } }); }, '#4a2a12', .3, { glow: { x: gl.x, y: gl.y, r: 700, col: '#ffcf80', a: .5 } });
  const sacks = Ly(c => { for (const [x, s] of [[160, 1], [900, 1.1]]) { c.beginPath(); c.ellipse(x, 1180, 120 * s, 130 * s, 0, 0, 7); c.fill(); poly(c, [[x - 30 * s, 1070 * 1], [x + 30 * s, 1070], [x + 46 * s, 1010], [x - 46 * s, 1010]]); c.fillRect(x - 50 * s, 1070, 100 * s, 12); } }, '#2a1608', .55, { glow: { x: gl.x, y: gl.y, r: 800, col: '#ffcf80', a: .35 } });
  const coinPos = []; const rr = mulberry(77); for (let i = 0; i < 70; i++) { const a = rr() * Math.PI * 2, r = Math.sqrt(rr()) * 190; coinPos.push([540 + Math.cos(a) * r * 1.2, 1130 - Math.abs(Math.sin(a)) * r * .55 - rr() * 30, rr()]); }
  let chestL; const chest = Ly(c => { poly(c, [[300, 1250], [780, 1250], [800, 1130], [280, 1130]]); poly(c, [[280, 1130], [800, 1130], [760, 1070], [320, 1070]]); c.fillRect(250, 1236, 580, 24); hole(c, c2 => { poly(c2, [[330, 1130], [750, 1130], [725, 1085], [355, 1085]]); }); }, '#3a2210', .66, { rim: '#ffe0a0', rimA: .5 });
  chest.back = (c, t) => { const a = seg(t, 24.6, 25.4); c.save(); const g = c.createRadialGradient(540, 1110, 0, 540, 1110, 280); g.addColorStop(0, '#fff0b0'); g.addColorStop(1, '#ffb030'); c.globalAlpha = a; c.fillStyle = g; poly(c, [[330, 1130], [750, 1130], [725, 1085], [355, 1085]]); c.restore(); };
  chest.front = (c, t) => {
    bloom(c, c2 => poly(c2, [[330, 1130], [750, 1130], [725, 1085], [355, 1085]]), '#ffc850', .9 * seg(t, 24.6, 25.4), 40);
    coinPos.forEach(([x, y, k], i) => { const a = seg(t, 25.2 + i * .045, 25.5 + i * .045); if (a <= 0) return; const yy = y - (1 - eo(a)) * 120; c.save(); c.globalAlpha = a; c.fillStyle = '#ffd25a'; c.strokeStyle = '#a8701a'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, yy, 30, 12, 0, 0, 7); c.fill(); c.stroke(); c.restore(); if (a > .9) bloom(c, c2 => { c2.beginPath(); c2.ellipse(x, yy, 30, 14, 0, 0, 7); c2.fill(); }, '#ffcc50', .25, 8); });
  };
  const hands = Ly(c => { for (const sgn of [-1, 1]) { const x0 = sgn < 0 ? -80 : W + 80; c.beginPath(); c.moveTo(x0, 1500); c.quadraticCurveTo(x0 - sgn * 260, 1280, x0 - sgn * 420, 1210); c.lineTo(x0 - sgn * 470, 1230); c.quadraticCurveTo(x0 - sgn * 260, 1360, x0, 1620); c.fill(); for (let f = 0; f < 4; f++) { c.beginPath(); c.moveTo(x0 - sgn * 400, 1210 + f * 8); c.quadraticCurveTo(x0 - sgn * 440, 1170 + f * 14, x0 - sgn * (470 + f * 8), 1196 + f * 22); c.lineWidth = 14; c.lineCap = 'round'; c.stroke(); } } }, '#07030a', .9, { rimA: .2 });
  const cam = t => ({ x: 0, y: 0, z: lerp(1.0, 1.2, ss(seg(t, 22.3, 29.4))) });
  hands.cvOff = true;
  return {
    layers: [sky, wall, sacks, chest, hands, frontBand('#0a0503', 31)], cam,
    handX: t => 1 - eo(seg(t, 26.6, 28.6)),
    over: (c, t) => { strip(c, t, 24.2, .8, 'ROBBERY', 540, 330, 92, { col: '#ffcf70', t1: 29.2 }); strip(c, t, 26.2, .9, 'THOUSANDS OF PESOS IN GOLD', 540, 450, 40, { col: '#ffd890', t1: 29.2 }); }
  };
});

// 5 · THE LEGEND OF THE PARROT
addScene(29.4, 36.4, () => {
  const lamp = { x: 540, y: 880 };
  const sky = Ly(SK('#0c2328', '#3e7076', { x: lamp.x, y: lamp.y, r: 700, col: 'rgba(255,190,110,.5)' }), '#000', 0, { raw: true });
  const wall = Ly(c => { c.fillRect(-20, 0, W + 40, H); hole(c, c2 => { archPath(c2, 540, 300, 700, 1100); c2.fill(); }); }, '#0a1b20', .45, { glow: { x: lamp.x, y: lamp.y, r: 780, col: '#ffc470', a: .5 } });
  const cage = Ly(c => { for (let i = 0; i <= 14; i++) { const x = 230 + i * 44; c.fillRect(x - 3, 330, 6, 1050); } c.fillRect(220, 330, 640, 10); c.fillRect(220, 1360, 640, 26); c.beginPath(); c.arc(540, 330, 322, Math.PI, 0); c.lineWidth = 8; c.stroke(); }, '#142a30', .6, { glow: { x: lamp.x, y: lamp.y, r: 700, col: '#ffc470', a: .5 } });
  const bird = Ly(c => { parrot(c, 560, 980, 1.5); hole(c, c2 => { c2.beginPath(); c2.arc(560 - 34 * 1.5 - 14, 980 - 128 * 1.5 - 6, 7, 0, 7); c2.fill(); }); }, '#05090b', .8, { rimA: .35 });
  const cx = 560 - 130 * 1.5, cy = 980 - 120 * 1.5;
  bird.front = (c, t) => {
    const ey = [560 - 34 * 1.5 - 14, 980 - 128 * 1.5 - 6]; const eye = .6 + .4 * seg(t, 33.0, 33.6); c.save(); c.fillStyle = `rgba(255,70,50,${eye})`; c.beginPath(); c.arc(ey[0], ey[1], 6, 0, 7); c.fill(); c.restore(); bloom(c, c2 => { c2.beginPath(); c2.arc(ey[0], ey[1], 14, 0, 7); c2.fill(); }, '#ff3a2a', .8 * eye, 14);
    // the cry: red arcs leaving the beak, in pulses
    for (let k = 0; k < 4; k++) { const u = ((t - 33.0 - k * .32) / 1.6); if (t < 32.0 || u < 0 || u > 1) continue; c.save(); c.globalAlpha = (1 - u) * .9 * seg(t, 32.0, 33.0); c.strokeStyle = '#ff4a38'; c.lineWidth = 9 - 5 * u; c.lineCap = 'round'; const r = 60 + u * 380; c.beginPath(); c.arc(cx, cy, r, Math.PI * .72, Math.PI * 1.28); c.stroke(); c.restore(); bloom(c, c2 => { c2.strokeStyle = '#ff2a1a'; c2.lineWidth = 16; c2.beginPath(); c2.arc(cx, cy, 60 + u * 380, Math.PI * .72, Math.PI * 1.28); c2.stroke(); }, '#ff3a2a', .5 * (1 - u), 12); }
  };
  return {
    layers: [sky, wall, cage, bird, frontBand('#030708', 41)], cam: t => ({ x: lerp(-10, 10, seg(t, 29.4, 36.4)), y: 0, z: lerp(1.0, 1.2, ss(seg(t, 29.4, 36.4))) }),
    over: (c, t) => { strip(c, t, 29.9, .8, 'THE LEGEND', 540, 330, 90, { col: '#ffcf8a', t1: 36.2 }); strip(c, t, 35.0, .6, '?', 820, 560, 190, { col: '#ff5a48', bg: '#12070a', t1: 36.4, rot: .08 }); }
  };
});

// 6a · THE ARRESTS: a line-up under one cold lamp
addScene(36.4, 40.0, () => {
  const lamp = { x: 300, y: 260 };
  const sky = Ly(SK('#2a3340', '#74869a', { x: lamp.x, y: lamp.y, r: 900, col: 'rgba(230,240,255,.55)' }), '#000', 0, { raw: true });
  const chart = Ly(c => { c.fillRect(-20, 300, W + 40, 1000); hole(c, c2 => { for (let i = 0; i < 14; i++) c2.fillRect(40, 420 + i * 60, i % 2 ? 40 : 80, 6); }); }, '#566275', .35, { glow: { x: lamp.x, y: lamp.y, r: 1000, col: '#e8f0ff', a: .45 } });
  const men = Ly(c => { for (const [x, h] of [[230, 250], [540, 290], [850, 260]]) { c.beginPath(); c.arc(x, 1030 - h + 150, 40, 0, 7); c.fill(); c.fillRect(x - 70, 1030 - h + 135, 140, 12); poly(c, [[x - 44, 1030 - h + 150], [x + 44, 1030 - h + 150], [x + 44, 1030 - h + 168], [x - 44, 1030 - h + 168]]); poly(c, [[x - 78, 1030 - h + 210], [x - 50, 1030 - h + 180], [x + 50, 1030 - h + 180], [x + 78, 1030 - h + 210], [x + 82, 1300], [x - 82, 1300]]); } }, '#161c26', .65, { rim: '#dbe8ff', rimA: .45 });
  const bars = Ly(c => { for (let i = 0; i < 9; i++) c.fillRect(i * 140 - 8, 200, 16, 1400); c.fillRect(-20, 230, W + 40, 18); }, '#0a0d12', .85, { rimA: .25 });
  return { layers: [sky, chart, men, bars, frontBand('#05070a', 51)], cam: t => ({ x: lerp(-14, 14, seg(t, 36.4, 40)), y: 0, z: lerp(1.0, 1.1, seg(t, 36.4, 40)) }), over: (c, t) => { strip(c, t, 36.9, .8, 'SUSPECTS', 540, 330, 92, { col: '#dce8ff', t1: 40 }); } };
});
// 6b · ... but the parrot's story stays disputed
addScene(40.0, 41.9, () => {
  const sky = Ly(SK('#20262f', '#566275', { x: 540, y: 900, r: 800, col: 'rgba(230,240,255,.4)' }), '#000', 0, { raw: true });
  const frame = Ly(c => { c.fillRect(160, 560, 760, 900); hole(c, c2 => c2.fillRect(210, 610, 660, 800)); c.fillRect(110, 1460, 860, 40); }, '#3a2a1c', .55, { rim: '#ffd9a0', rimA: .5, glow: { x: 540, y: 900, r: 700, col: '#ffcf90', a: .2 } });
  const inner = Ly(c => { c.fillRect(210, 610, 660, 800); }, '#c9b896', .45, { glow: { x: 540, y: 900, r: 600, col: '#fff2d0', a: .5 }, noShadow: true });
  const pb = Ly(c => parrot(c, 560, 1000, 1.0), '#1a1410', .6, { rimA: .3 });
  return { layers: [sky, inner, pb, frame, frontBand('#05070a', 61)], cam: t => ({ x: 0, y: 0, z: lerp(1.02, 1.1, seg(t, 40, 41.9)) }), over: (c, t) => { strip(c, t, 40.5, .35, 'DISPUTED', 540, 930, 150, { col: '#ff4b3a', bg: '#190909', rot: -.16, scale: 1.7, t1: 41.9 }); } };
});
// 6c · the real investigation: a tangle of red thread
addScene(41.9, 44.5, () => {
  const sky = Ly(SK('#2a1f17', '#5a4632', { x: 540, y: 900, r: 800, col: 'rgba(255,220,160,.35)' }), '#000', 0, { raw: true });
  const board = Ly(c => c.fillRect(70, 380, 940, 1100), '#4a3826', .4, { glow: { x: 540, y: 900, r: 800, col: '#ffe0a8', a: .35 }, rim: '#ffd9a0' });
  const cards = [[220, 560, -.08], [600, 520, .05], [830, 760, -.04], [260, 940, .06], [620, 960, -.07], [860, 1180, .05]];
  const cardsL = Ly(c => { for (const [x, y, a] of cards) { c.save(); c.translate(x, y); c.rotate(a); c.fillRect(-100, -120, 200, 240); c.restore(); } }, '#cbbf9f', .6, { rim: '#fff0d0', rimA: .5, glow: { x: 540, y: 900, r: 800, col: '#fff2d0', a: .3 } });
  cardsL.front = (c, t) => { const pts = cards.map(([x, y]) => [x, y - 100]); c.save(); c.strokeStyle = '#d6362c'; c.lineWidth = 5; c.lineCap = 'round'; const order = [[0, 1], [1, 2], [2, 4], [4, 3], [3, 0], [0, 4], [1, 3], [2, 5], [5, 3], [4, 5], [1, 4]]; order.forEach(([a, b], i) => { const p = eo(seg(t, 42.2 + i * .17, 42.5 + i * .17)); if (p <= 0) return; c.beginPath(); c.moveTo(pts[a][0], pts[a][1]); c.lineTo(lerp(pts[a][0], pts[b][0], p), lerp(pts[a][1], pts[b][1], p) + Math.sin(i) * 20 * p); c.stroke(); }); for (const [x, y] of pts) { c.fillStyle = '#d6362c'; c.beginPath(); c.arc(x, y, 10, 0, 7); c.fill(); } c.restore(); };
  return { layers: [sky, board, cardsL, frontBand('#070503', 71)], cam: t => ({ x: lerp(-8, 8, seg(t, 41.9, 44.5)), y: 0, z: lerp(1.0, 1.08, seg(t, 41.9, 44.5)) }), over: (c, t) => { strip(c, t, 42.4, .8, 'FAR MORE COMPLICATED', 540, 300, 62, { col: '#ffd69a', t1: 44.5 }); } };
});

// 7 · THE HAUNTING (green night; ghosts in windows, footsteps, fog)
addScene(44.5, 51.4, () => {
  const mn = { x: 280, y: 540 };
  const sky = Ly(SK('#0c1816', '#335049', { x: mn.x, y: mn.y, r: 650, col: 'rgba(200,235,220,.4)' }), '#000', 0, { raw: true, front: c => { bloom(c, c2 => { c2.beginPath(); c2.arc(mn.x, mn.y, 90, 0, 7); c2.fill(); }, '#dff5ea', .8, 16); c.fillStyle = '#dff5ea'; c.beginPath(); c.arc(mn.x, mn.y, 86, 0, 7); c.fill(); } });
  const far = Ly(c => skylineFar(c, 1190, 92, 90, 190), '#1c2e2a', .3, { glow: { x: mn.x, y: mn.y + 500, r: 700, col: '#bfe8d8', a: .2 } });
  const fog1 = Ly(c => { cloudBand(c, 1130, 4, 60); }, '#6f8c82', .38, { noShadow: true, rimA: 0 }); fog1.alpha = .35; fog1.drift = 22;
  let fa; const house = Ly(c => { fa = facade(c, HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h); c.fillRect(HOUSE.x - 40, HOUSE.y + HOUSE.h, HOUSE.w + 80, 40); hole(c, c2 => { c2.save(); c2.translate(HOUSE.x + HOUSE.w * .5, HOUSE.y + 60); poly(c2, [[-30, 0], [-12, 30], [-24, 60], [0, 40], [22, 70], [14, 24], [34, 0]]); c2.restore(); }); for (const q of fa.wins) for (let i = -1; i <= 1; i++) { c.save(); c.translate(q.x, q.y + q.h * .55 + i * 36); c.rotate(i * .12); c.fillRect(-q.w / 2 - 6, -6, q.w + 12, 12); c.restore(); } }, '#070d0c', .66, { rim: '#bfeadb', rimA: .35 });
  const gh = (t) => [[0, 46.3], [2, 47.8], [4, 49.0]];
  house.back = (c, t) => { for (const [i, t0] of gh(t)) { const q = fa.wins[i]; const a = seg(t, t0, t0 + .9) * (.75 + .25 * Math.sin(t * 5 + i)); if (a <= 0) continue; c.save(); c.globalAlpha = a * .8; c.fillStyle = '#9ed9c3'; archPath(c, q.x, q.y, q.w, q.h); c.fill(); c.globalAlpha = a; c.fillStyle = '#f0fff8'; archPath(c, q.x, q.y, q.w, q.h); c.clip(); woman(c, q.x + Math.sin(t * 2 + i) * 4, q.y + 60, 1.0, i % 2 ? 'young' : 'old'); c.restore(); } };
  house.front = (c, t) => { for (const [i, t0] of gh(t)) { const q = fa.wins[i]; const a = seg(t, t0, t0 + .9); if (a > 0) bloom(c, c2 => { archPath(c2, q.x, q.y, q.w * 1.3, q.h * 1.15); c2.fill(); }, '#7fe8c4', .5 * a, 32);
    for (let k = 0; k < 3; k++) { const u = ((t - t0 - 1.0 - k * .45) / 1.4); if (u < 0 || u > 1) continue; c.save(); c.globalAlpha = (1 - u) * .8; c.strokeStyle = '#a8f0d6'; c.lineWidth = 5; c.beginPath(); c.arc(q.x, q.y + q.h * .5, 70 + u * 220, 0, 7); c.stroke(); c.restore(); } } };
  const grd = Ly(c => ground(c, 1290, 9), '#0c1a17', .7, { rimA: .15 });
  grd.front = (c, t) => { for (let i = 0; i < 9; i++) { const a = seg(t, 47.0 + i * .38, 47.3 + i * .38); if (a <= 0) continue; const k = i / 8, y = 1300 + k * 150, x = 540 + (i % 2 ? 26 : -26) * (.5 + k) + Math.sin(i) * 6, sc = .55 + k * .6; const f = .9 - Math.max(0, (t - 47.0 - i * .38 - 1.6) * .45); c.save(); c.globalAlpha = a * Math.max(0, f); c.fillStyle = '#bfeadb'; c.beginPath(); c.ellipse(x, y, 13 * sc, 28 * sc, 0, 0, 7); c.fill(); c.restore(); bloom(c, c2 => { c2.beginPath(); c2.ellipse(x, y, 18 * sc, 34 * sc, 0, 0, 7); c2.fill(); }, '#7fe8c4', .3 * a * Math.max(0, f), 10); } };
  const fog2 = Ly(c => { cloudBand(c, 1290, 6, 70); }, '#5a756c', .78, { noShadow: true, rimA: 0 }); fog2.alpha = .4; fog2.drift = 36;
  const near = Ly(c => { treeSil(c, 100, 1420, 520, 31); treeSil(c, 990, 1420, 460, 33); fence(c, 1436, -20, W + 20, 100); }, '#050908', .86);
  const front = frontBand('#030605', 81);
  return { layers: [sky, far, fog1, house, grd, fog2, near, front], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.16, ss(seg(t, 44.5, 51.4))) }), over: (c, t) => { strip(c, t, 44.9, .8, 'YEARS LATER', 540, 330, 86, { col: '#a8f0d6', t1: 51.2 }); } };
});

// 8 · THE REAL TWIST: the box pulls out and the lamp goes dark
addScene(51.4, 60.4, () => {
  const mn = { x: 780, y: 420 };
  const sky = Ly(SK('#141a2c', '#566a94', { x: mn.x, y: mn.y, r: 650, col: 'rgba(235,240,220,.45)' }), '#000', 0, { raw: true, front: c => { bloom(c, c2 => { c2.beginPath(); c2.arc(mn.x, mn.y, 100, 0, 7); c2.fill(); }, '#f4f0d8', .8, 18); c.fillStyle = '#f2eed6'; c.beginPath(); c.arc(mn.x, mn.y, 96, 0, 7); c.fill(); } });
  const clouds = Ly(c => cloudBand(c, 700, 61, 80), '#3d4a6a', .2, { glow: { x: mn.x, y: mn.y, r: 600, col: '#e9efe0', a: .35 } });
  const far = Ly(c => skylineFar(c, 1190, 12, 90, 200), '#2b3552', .32);
  const mid = Ly(c => rowHouses(c, -40, W + 40, 1260, 31, 220, 380, [[HOUSE.x - 10, HOUSE.x + HOUSE.w + 10]]), '#1a2038', .5);
  let fa; const house = Ly(c => { fa = facade(c, HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h); c.fillRect(HOUSE.x - 40, HOUSE.y + HOUSE.h, HOUSE.w + 80, 40); }, '#10152a', .66, { rimA: .35 });
  const on = (q, t) => { const i = fa.wins.indexOf(q); if (i !== 1) return 0; return (.6 + .4 * Math.sin(t * 7)) * seg(t, 52.4, 53.2) * (1 - seg(t, 59.7, 60.2)); };
  house.back = (c, t) => { for (const q of fa.wins) { const a = on(q, t); if (a > 0) { c.save(); c.globalAlpha = a; c.fillStyle = '#d6362c'; archPath(c, q.x, q.y, q.w, q.h); c.fill(); c.restore(); } } };
  house.front = (c, t) => { for (const q of fa.wins) { const a = on(q, t); if (a > 0) bloom(c, c2 => { archPath(c2, q.x, q.y, q.w * 1.3, q.h * 1.15); c2.fill(); }, '#ff3a2a', .6 * a, 34); } };
  const near = Ly(c => { treeSil(c, 120, 1420, 560, 7); treeSil(c, 960, 1420, 420, 11); fence(c, 1430, -20, W + 20, 100); }, '#0a0e1c', .84);
  return {
    layers: [sky, clouds, far, mid, house, near, frontBand('#04050a', 3)], box: true,
    cam: t => ({ x: 0, y: 0, z: lerp(1.15, 1.0, ss(seg(t, 51.4, 54))) }),
    over: (c, t) => { strip(c, t, 53.6, .8, 'THE MURDERS REALLY HAPPENED', 540, 300, 50, { col: '#ffb870', t1: 55.2 }); strip(c, t, 55.4, .8, 'THE GHOSTS WERE NEVER PROVEN', 540, 300, 50, { col: '#a8d0f0', t1: 57.3 }); strip(c, t, 57.4, .8, 'ONE OF MONTERREY\'S DARKEST LEGENDS', 540, 300, 44, { col: '#ffd69a', t1: 59.4 }); }
  };
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
  const p = ss(seg(t, 57.0, 59.3)), s = lerp(1, .56, p), lit = 1 - ss(seg(t, 59.75, 60.25));
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
  const SA = getScene(i), tgt = SA.box && t > 57 ? INNER.getContext('2d') : ctx;
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
