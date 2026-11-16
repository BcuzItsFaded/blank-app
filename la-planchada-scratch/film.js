// La Planchada — Scratchboard Long Take. Ink + paper + one red, a single unbroken camera move through a printed hospital.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, TAU = Math.PI * 2;
window.DUR = 62.4;
const INK = '#16171b', PAPER = '#ede5cd', RED = '#c4332b', YEL = '#dfa443';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a)), ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
function mulberry(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const vnoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

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

// ---------- cut-line fields: tone is the width/spacing of parallel knife cuts ----------
// fill the clipped region with `base`, then draw parallel cuts of `cut`. toneFn(x,y)->0..1 (1 = more/wider cut colour).
function cuts(g, base, cut, spacing, vertical, toneFn, x0, y0, x1, y1, seed = 1) {
  g.save(); g.fillStyle = base; g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  g.strokeStyle = cut; g.lineCap = 'round'; const R = mulberry(seed * 131 + 7);
  if (vertical) { for (let x = x0; x <= x1; x += spacing) { for (let y = y0; y < y1; y += 46) { const tn = toneFn((x), (y + 23)); if (tn <= 0.02) continue; g.lineWidth = clamp(tn, 0, 1) * spacing * 0.82; g.beginPath(); const jx = (vnoise(x * .05 + y * .01 + seed) - .5) * 3; g.moveTo(x + jx, y); g.lineTo(x + jx + (R() - .5) * 2, Math.min(y1, y + 46 - R() * 10)); g.stroke(); } } }
  else { for (let y = y0; y <= y1; y += spacing) { for (let x = x0; x < x1; x += 60) { const tn = toneFn(x + 30, y); if (tn <= 0.02) continue; g.lineWidth = clamp(tn, 0, 1) * spacing * 0.82; g.beginPath(); const jy = (vnoise(y * .05 + x * .01 + seed) - .5) * 2.4; g.moveTo(x, y + jy); g.lineTo(Math.min(x1, x + 60 - R() * 12), y + jy + (R() - .5) * 2); g.stroke(); } } }
  g.restore();
}
// a knife stroke: blunt entry, tapered exit
function knife(g, x0, y0, x1, y1, w, col = INK) { g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; g.quadraticCurveTo(mx, my, x1, y1); g.stroke(); g.restore(); }
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
// shade a closed shape as an ink field with paper cuts running one direction
function inkShape(g, pts, dir, dens, seed) { g.save(); poly(g, pts); g.clip(); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); g.fillStyle = INK; g.fillRect(Math.min(...xs) - 2, Math.min(...ys) - 2, Math.max(...xs) - Math.min(...xs) + 4, Math.max(...ys) - Math.min(...ys) + 4); g.strokeStyle = PAPER; g.lineCap = 'round'; const R = mulberry(seed || 3); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 900 * dens; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), l = 8 + R() * 26; g.lineWidth = .8 + R() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(dir) * l, y + Math.sin(dir) * l); g.stroke(); } g.restore(); }
// a paper field (lit) with fine ink cuts
function paperShape(g, pts, dir, dens, seed) { g.save(); poly(g, pts); g.clip(); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); g.fillStyle = PAPER; g.fillRect(Math.min(...xs) - 2, Math.min(...ys) - 2, Math.max(...xs) - Math.min(...xs) + 4, Math.max(...ys) - Math.min(...ys) + 4); g.strokeStyle = INK; g.lineCap = 'round'; const R = mulberry(seed || 4); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 900 * dens; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), l = 6 + R() * 18; g.lineWidth = .7 + R() * 1.0; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(dir) * l, y + Math.sin(dir) * l); g.stroke(); } g.restore(); }
function edge(g, pts, w = 2.4) { g.save(); poly(g, pts); g.lineWidth = w; g.strokeStyle = INK; g.stroke(); g.restore(); }

// ---------- figures: flat ink silhouettes with a few paper cuts; nurse carries the one red ----------
function nurseSil(g, x, y, k, o = {}) { // ghost/nurse; the red cross on the cap is the one red
  g.save(); g.translate(x, y); g.scale(k * (o.flip || 1), k); if (o.rot) g.rotate(o.rot);
  const body = o.ghost ? [[-30, -186], [30, -186], [22, -120], [58, -46], [40, -4], [18, -34], [0, 30], [-18, -32], [-40, -2], [-58, -48], [-22, -120]] : [[-30, -186], [30, -186], [22, -120], [66, -14], [-66, -14], [-22, -120]];
  for (const s of [-1, 1]) { const a = o.aR != null && s > 0 ? o.aR : (o.aL != null && s < 0 ? o.aL : .12); const sx = s * 30, sy = -178, ex = sx + s * Math.sin(a) * 96, ey = sy + Math.cos(a) * 96; knife(g, sx, sy, ex, ey, 18, o.pale || INK); g.fillStyle = o.pale || INK; g.beginPath(); g.arc(ex, ey + 4, 10, 0, TAU); g.fill(); }
  if (o.pale) { paperShape(g, body, Math.PI / 2, 1.1, 21); // her uniform: lit paper with perfectly straight creases
    g.save(); poly(g, body); g.clip(); g.strokeStyle = INK; g.lineWidth = 2; for (const dx of [-22, -8, 8, 22]) { g.beginPath(); g.moveTo(dx * .5, -120); g.lineTo(dx * 1.6, -24); g.stroke(); } g.restore(); edge(g, body, 2.2); }
  else inkShape(g, body, Math.PI / 2 - .4, 1.0, 21);
  // head
  const head = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU; head.push([Math.cos(a) * 34, -224 + Math.sin(a) * 42]); }
  if (o.pale) { paperShape(g, head, -.5, 1.2, 22); edge(g, head, 2.2); } else inkShape(g, head, -.5, .9, 22);
  g.fillStyle = o.pale || INK; g.fillRect(-9, -188, 18, 18);
  // cap
  const cap = [[-34, -256], [-22, -292], [24, -292], [36, -254], [0, -264]];
  if (o.pale) { paperShape(g, cap, 0, 1, 23); edge(g, cap, 2.2); } else inkShape(g, cap, 0, 1, 23);
  g.fillStyle = RED; const rc = 7; g.fillRect(-rc / 2, -284, rc, 20); g.fillRect(-11, -278, 22, rc); // THE ONE RED: her cross
  g.restore();
}
function manSil(g, x, y, k, kind, o = {}) { g.save(); g.translate(x, y); g.scale(k * (o.flip || 1), k);
  const body = kind === 'bed' ? null : kind === 'doc' ? [[-34, -186], [34, -186], [40, -14], [-40, -14]] : kind === 'wide' ? [[-40, -184], [40, -184], [30, -120], [82, -14], [-82, -14], [-30, -120]] : [[-30, -184], [30, -184], [22, -120], [62, -14], [-62, -14], [-22, -120]];
  for (const s of [-1, 1]) { const a = (s > 0 ? (o.aR ?? .12) : (o.aL ?? .12)); const sx = s * 30, sy = -176, ex = sx + s * Math.sin(a) * 92, ey = sy + Math.cos(a) * 92; knife(g, sx, sy, ex, ey, 17, INK); g.fillStyle = INK; g.beginPath(); g.arc(ex, ey + 4, 9, 0, TAU); g.fill(); }
  inkShape(g, body, Math.PI / 2 - .3, .9, kind.length * 5 + 2);
  const head = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU; head.push([Math.cos(a) * 32, -220 + Math.sin(a) * 40]); } inkShape(g, head, -.4, .8, 9); g.fillStyle = INK; g.fillRect(-8, -184, 16, 16);
  if (kind === 'doc') { inkShape(g, [[-10, -254], [12, -256], [14, -244], [-8, -242]], 0, 1, 7); }
  if (kind === 'matron' || kind === 'nurse2') inkShape(g, [[-32, -248], [-22, -282], [22, -282], [32, -246], [0, -256]], 0, 1, 7);
  g.restore();
}

// ---------- the world: sections laid left→right in world X; the camera glides through once ----------
const SECW = 1560, GROUND = 1230, OFF = 120;
const SEC = [];   // {cx, sky, build, front}
function section(sky, build, front) { SEC.push({ cx: SEC.length * SECW + SECW / 2, sky, build, front, cache: null }); }
// bake a depth strip for a section: a canvas covering [cx-SECW/2-OFF, cx+SECW/2+OFF] × full H
function strip(cx, draw) { const w = SECW + 2 * OFF, c = mk(w, H), g = c.getContext('2d'); g.translate(OFF + SECW / 2, 0); draw(g); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in'; const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(OFF / w, '#000'); gr.addColorStop(1 - OFF / w, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, H); return { cv: c, wx0: cx - SECW / 2 - OFF, d: 1 }; }

// facade helper (an ink building wall with lit paper windows; one may be red)
function facade(g, bx, by, bw, bh, cols, rows, redWin) { const pts = [[bx, by + bh], [bx, by], [bx + bw, by], [bx + bw, by + bh]]; inkShape(g, pts, Math.PI / 2, .8, Math.abs(bx) + 3);
  const mw = bw / cols, mh = bh / rows; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = bx + c * mw + mw * .24, y = by + r * mh + mh * .22, ww = mw * .52, wh = mh * .56; const lit = hash(bx + c * 3 + r * 7) > .45; const isRed = redWin && c === redWin[0] && r === redWin[1]; if (isRed) { g.fillStyle = RED; g.fillRect(x, y, ww, wh); } else if (lit) { paperShape(g, [[x, y], [x + ww, y], [x + ww, y + wh], [x, y + wh]], Math.PI / 2, .6, c + r); edge(g, [[x, y], [x + ww, y], [x + ww, y + wh], [x, y + wh]], 1.6); } else { g.strokeStyle = PAPER; g.lineWidth = 1.4; g.strokeRect(x, y, ww, wh); } }
}
function archHole(g, cx, cy, w, h) { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(cx - w / 2, cy + h); g.lineTo(cx - w / 2, cy); g.arc(cx, cy, w / 2, Math.PI, 0); g.lineTo(cx + w / 2, cy + h); g.closePath(); g.fill(); g.restore(); }

// S1 — the hospital at night, one red window (high wide); a carved night sky
section('night',
  cx => [
    strip(cx, g => { // far city silhouette + ground
      for (let i = -3; i < 4; i++) { const x = i * 240 + 60, w = 120 + hash(i) * 120, h = 180 + hash(i + 9) * 260; inkShape(g, [[x, GROUND - 40], [x, GROUND - 40 - h], [x + w, GROUND - 40 - h], [x + w, GROUND - 40]], Math.PI / 2, .5, i + 30); }
      cuts(g, PAPER, INK, 10, false, (x, y) => clamp((y - GROUND) / 500, 0, 1) * .5 + .15, -SECW / 2 - OFF, GROUND, SECW / 2 + OFF, H, 5); // snow-pale ground foreground paper with cuts
    }),
    (() => { const s = strip(cx, g => { facade(g, -430, 300, 860, 760, 7, 6, [4, 2]); archHole(g, 0, 1060, 150, 160); }); s.d = .85; return s; })(),
  ],
  (g, t, red) => { } );

// S2 — inside the corridor: the uniform; lit doorways; she walks ahead
section('night',
  cx => [
    strip(cx, g => { cuts(g, PAPER, INK, 11, false, (x, y) => clamp((y - GROUND) / 480, 0, 1) * .55 + .12, -SECW / 2 - OFF, GROUND, SECW / 2 + OFF, H, 7); }),
    (() => { const s = strip(cx, g => { // corridor walls receding, lit doorways (paper)
      inkShape(g, [[-SECW / 2 - OFF, 300], [-SECW / 2 - OFF, GROUND], [SECW / 2 + OFF, GROUND], [SECW / 2 + OFF, 300]], Math.PI / 2, .7, 40);
      for (const dx of [-520, -230, 230, 520]) { const dw = 150, dh = 430; paperShape(g, [[dx - dw / 2, GROUND - dh], [dx + dw / 2, GROUND - dh], [dx + dw / 2, GROUND], [dx - dw / 2, GROUND]], Math.PI / 2, .45, dx); edge(g, [[dx - dw / 2, GROUND - dh], [dx + dw / 2, GROUND - dh], [dx + dw / 2, GROUND], [dx - dw / 2, GROUND]], 2.4); }
    }); s.d = .9; return s; })(),
  ],
  (g, t, red) => { } );

// S3 — a warm memory: a garden arch, the sun (yellow), the doctor, a red heart
section('warm',
  cx => [
    (() => { const s = strip(cx, g => { // arch + trees
      inkShape(g, [[-260, GROUND], [-260, 560], [-120, 360], [120, 360], [260, 560], [260, GROUND], [200, GROUND], [200, 600], [110, 420], [-110, 420], [-200, 600], [-200, GROUND]], Math.PI / 2, .6, 55);
      for (const [tx, th] of [[-540, 640], [540, 560]]) { inkShape(g, [[tx - 14, GROUND], [tx - 14, GROUND - th * .5], [tx + 14, GROUND - th * .5], [tx + 14, GROUND]], Math.PI / 2, .6, tx); const cr = []; for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU; cr.push([tx + Math.cos(a) * th * .4, GROUND - th * .72 + Math.sin(a) * th * .42]); } inkShape(g, cr, -.5, .7, tx + 1); }
      cuts(g, PAPER, INK, 12, false, (x, y) => clamp((y - GROUND) / 440, 0, 1) * .5 + .14, -SECW / 2 - OFF, GROUND, SECW / 2 + OFF, H, 9);
    }); s.d = .82; return s; })(),
  ],
  (g, t, red) => { // live: sun, doctor walking off, heart splitting, drawn in section-local coords (origin = cx, handled by caller)
    const bet = t > 20.9, away = ss(seg(t, 21.0, 21.6));
    // sun (yellow)
    g.save(); g.fillStyle = YEL; g.beginPath(); g.arc(0, 560, 100, 0, TAU); g.fill(); g.strokeStyle = PAPER; g.lineWidth = 2; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 108, 560 + Math.sin(a) * 108); g.lineTo(Math.cos(a) * 150, 560 + Math.sin(a) * 150); g.stroke(); } g.restore();
    nurseSil(g, -340, GROUND, 1.15, { pale: '#f2efe0', aR: bet ? .1 : (t > 17.5 && t < 18.8 ? -.5 : .12), rot: bet ? .05 : 0 });
    manSil(g, lerp(360, 620, away), GROUND, 1.0, 'doc', { flip: bet ? 1 : -1 });
    if (t > 20.3) manSil(g, lerp(820, 640, ss(seg(t, 20.4, 21.0))) + away * 120, GROUND, .95, 'wide', { flip: -1 });
    // red heart: her love, floating up, then splitting
    if (t > 19.6 && t < 21.0) { for (let k = 0; k < 5; k++) { const u = t - (19.66 + k * .2); if (u < 0 || u > 1.5) continue; redHeart(g, -340 + Math.sin(u * 4 + k) * 36 + (k - 2) * 20, 760 - u * 150, 20, 1 - seg(u, 1.0, 1.5)); } }
    if (t > 21.0) { const u = seg(t, 21.0, 21.7), w = Math.max(0, (u - .35) / .65); if (u < .35) redHeart(g, -340, 760, 48, 1); else { redHeart(g, -340 - w * 70, 760 + w * w * 300, 44, 1, -1, -w * 1.2); redHeart(g, -340 + w * 70, 760 + w * w * 300, 44, 1, 1, w * 1.2); } }
  } );
function redHeart(g, x, y, r, a, half, rot) { g.save(); g.globalAlpha = a; g.translate(x, y); if (rot) g.rotate(rot); g.fillStyle = RED; g.beginPath(); for (let i = 0; i <= 30; i++) { const ang = half ? (half > 0 ? i / 30 * Math.PI : Math.PI + i / 30 * Math.PI) : i / 30 * TAU, px = 16 * Math.pow(Math.sin(ang), 3) * r / 16, py = -(13 * Math.cos(ang) - 5 * Math.cos(2 * ang) - 2 * Math.cos(3 * ang) - Math.cos(4 * ang)) * r / 16; i ? g.lineTo(px, py) : g.moveTo(px, py); } if (half) { g.lineTo(0, r * .9); } g.closePath(); g.fill(); g.restore(); }

// S4 — two versions: rain, and the spirit that cannot rest (a grey page of ink cuts)
section('rain',
  cx => [
    (() => { const s = strip(cx, g => { cuts(g, PAPER, INK, 9, false, (x, y) => clamp((y - GROUND + 200) / 700, 0, 1) * .6 + .2, -SECW / 2 - OFF, 300, SECW / 2 + OFF, H, 11); }); s.d = .9; return s; })(),
  ],
  (g, t, red) => { // rain cuts; a bed; the spirit pulled back
    g.save(); g.strokeStyle = INK; g.lineWidth = 3; const R = mulberry(9); for (let i = 0; i < 70; i++) { const x = R() * SECW - SECW / 2, sp = .6 + R() * .6, y = ((t * 760 * sp + R() * 2000) % 2200) - 300; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 7, y + 46); g.stroke(); } g.restore();
    bedSil(g, 360, GROUND, 1.0);
    const dead = t > 26.86, lift = ss(seg(t, 26.86, 27.8)), pull = ss(seg(t, 28.0, 28.7)), snap = ss(seg(t, 28.8, 29.4));
    manSil(g, -360, GROUND, 1.0, 'nurse2', { aL: dead ? 0 : .1, rot: dead ? .22 : 0 });
    if (dead) { const y = lerp(GROUND, 640, Math.min(1, lift * .55 + pull * .45) * (1 - snap)); g.save(); g.strokeStyle = PAPER; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-360, GROUND - 100); g.quadraticCurveTo(-360 + 36 * Math.sin(t * 7), (GROUND + y) / 2, -360, y - 50); g.stroke(); g.restore(); nurseSil(g, -360, y, 1.0, { pale: '#f2efe0', ghost: true, aL: pull > 0 && snap < 1 ? -2.2 : .12, aR: pull > 0 && snap < 1 ? -2.2 : .12 }); }
  } );
function bedSil(g, x, y, k) { g.save(); g.translate(x, y); g.scale(k, k); inkShape(g, [[-100, -70], [-40, -112], [60, -106], [190, -78], [190, -20], [-100, -20]], Math.PI / 2, .7, 71); g.fillStyle = INK; g.fillRect(-196, -160, 14, 160); g.fillRect(182, -120, 14, 120); g.fillRect(-196, -84, 380, 16); const hd = []; for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU; hd.push([-140 + Math.cos(a) * 30, -96 + Math.sin(a) * 28]); } inkShape(g, hd, -.4, .7, 72); g.restore(); }

// S5 — the night visit: a ward, she tends a bed; a red lamp
section('night',
  cx => [
    (() => { const s = strip(cx, g => { inkShape(g, [[-SECW / 2 - OFF, 300], [-SECW / 2 - OFF, GROUND], [SECW / 2 + OFF, GROUND], [SECW / 2 + OFF, 300]], Math.PI / 2, .7, 80); // a tall window of paper
      paperShape(g, [[300, 420], [560, 420], [560, 900], [300, 900]], Math.PI / 2, .4, 81); edge(g, [[300, 420], [560, 420], [560, 900], [300, 900]], 2.6); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(430, 420); g.lineTo(430, 900); g.moveTo(300, 660); g.lineTo(560, 660); g.stroke();
      cuts(g, PAPER, INK, 11, false, (x, y) => clamp((y - GROUND) / 460, 0, 1) * .5 + .12, -SECW / 2 - OFF, GROUND, SECW / 2 + OFF, H, 82); }); s.d = .88; return s; })(),
  ],
  (g, t, red) => { bedSil(g, 300, GROUND, 1.05);
    const arrive = ss(seg(t, 30.4, 32.6)), x = lerp(-640, -120, arrive), med = ss(seg(t, 33.9, 34.3)) * (1 - ss(seg(t, 35.0, 35.3))), tuck = ss(seg(t, 35.35, 35.8));
    nurseSil(g, x, GROUND + Math.sin(t * 4) * 4, 1.0, { pale: '#f2efe0', ghost: true, aR: med > .2 ? -2.2 * med : (tuck > .2 ? -1.1 : .12) });
    if (med > .01) { g.save(); g.fillStyle = RED; g.globalAlpha = med; g.fillRect(x + 92, GROUND - 240, 14, 40); g.restore(); }
  } );

// S6 — morning: the sky carved open to day; staff silhouettes; nobody knows her
section('day',
  cx => [
    strip(cx, g => { cuts(g, PAPER, INK, 12, false, (x, y) => clamp((y - GROUND) / 460, 0, 1) * .45 + .1, -SECW / 2 - OFF, GROUND, SECW / 2 + OFF, H, 83); }),
    (() => { const s = strip(cx, g => { // a lobby wall with framed portraits (paper)
      paperShape(g, [[-SECW / 2 - OFF, 300], [-SECW / 2 - OFF, GROUND], [SECW / 2 + OFF, GROUND], [SECW / 2 + OFF, 300]], Math.PI / 2, .28, 84);
      for (const [fx, fy] of [[-420, 560], [-220, 540], [-20, 560]]) { paperShape(g, [[fx - 70, fy - 90], [fx + 70, fy - 90], [fx + 70, fy + 90], [fx - 70, fy + 90]], Math.PI / 2, .3, fx); edge(g, [[fx - 76, fy - 96], [fx + 76, fy - 96], [fx + 76, fy + 96], [fx - 76, fy + 96]], 3); }
    }); s.d = .86; return s; })(),
  ],
  (g, t, red) => { const gl = ss(seg(t, 40.65, 41.0));
    manSil(g, 340, GROUND, 1.0, 'matron', { flip: -1, aR: gl > .5 ? -1.4 : .12 });
    manSil(g, 540, GROUND, 1.0, 'doc', { flip: -1 });
    if (t > 40.9) for (const [t0, x, y] of [[41.0, 360, 760], [41.4, 560, 760]]) { const u = seg(t, t0, t0 + .4); if (u <= 0) continue; g.save(); g.fillStyle = INK; g.font = `${120 * eo(u)}px "IM Fell English SC"`; g.textAlign = 'center'; g.fillText('?', x, y); g.restore(); }
  } );

// S7 — the impossible truth: a portrait of her on the wall, held (long lens), a patient reading it
section('day',
  cx => [
    (() => { const s = strip(cx, g => { paperShape(g, [[-SECW / 2 - OFF, 300], [-SECW / 2 - OFF, GROUND], [SECW / 2 + OFF, GROUND], [SECW / 2 + OFF, 300]], Math.PI / 2, .28, 85);
      cuts(g, PAPER, INK, 12, false, (x, y) => clamp((y - GROUND) / 460, 0, 1) * .45 + .1, -SECW / 2 - OFF, GROUND, SECW / 2 + OFF, H, 86); }); s.d = .9; return s; })(),
  ],
  (g, t, red) => { // the portrait frame (paper) with her small figure inside; a black ribbon; a patient looking up
    paperShape(g, [[-150, 360], [150, 360], [150, 760], [-150, 760]], Math.PI / 2, .28, 87); edge(g, [[-160, 350], [160, 350], [160, 770], [-160, 770]], 5);
    g.save(); g.translate(0, 700); g.scale(.5, .5); nurseSil(g, 0, 0, 1.0, { pale: '#efe7cf' }); g.restore();
    g.save(); g.fillStyle = INK; poly(g, [[-160, 350], [-60, 350], [-160, 440]]); g.fill(); g.restore();  // the mourning ribbon
    const run = seg(t, 49.5, 50.3), px = t < 49.5 ? 360 : 360 + run * run * 700;
    manSil(g, px, GROUND, 1.0, 'wide', { aL: t > 48.4 && t < 49.5 ? -2.4 : .12, aR: t > 48.4 && t < 49.5 ? -2.4 : .12, rot: t >= 49.5 ? .2 : 0 });
  } );

// S8 — the final twist: a last ward; the red heart rises; pull back to the whole hospital, one red window
section('night',
  cx => [
    (() => { const s = strip(cx, g => { facade(g, -430, 300, 860, 700, 7, 5, null); cuts(g, PAPER, INK, 11, false, (x, y) => clamp((y - GROUND) / 460, 0, 1) * .5 + .12, -SECW / 2 - OFF, GROUND, SECW / 2 + OFF, H, 88); }); s.d = .82; return s; })(),
  ],
  (g, t, red) => { bedSil(g, 360, GROUND, 1.0); const tuck = t > 53.3 && t < 54.3, wag = t > 54.4 && t < 55.5;
    nurseSil(g, -340, GROUND + Math.sin(t * 4) * 4, 1.0, { pale: '#f2efe0', ghost: true, rot: tuck ? .08 : 0, aR: wag ? -2.0 + Math.sin(t * 22) * .1 : (t > 56.3 && t < 57.2 ? -1.1 : .12) });
    if (t > 55.7) { const u = seg(t, 55.7, 58.2); redHeart(g, lerp(-240, 120, ss(u)), 980 - 260 * eo(u), 42 * (1 + .1 * Math.sin(t * 9)), 1); }
  } );

// ---------- the camera: one monotone move through every section ----------
const TS = [0, 8.25, 15.34, 21.7, 29.85, 36.71, 43.12, 50.46, 62.4];
const KX = [[0, SEC[0].cx - 240]].concat(SEC.map((s, i) => [(TS[i] + TS[i + 1]) / 2, s.cx])).concat([[62.4, SEC[7].cx + 300]]);
function mono(keys, t) { const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1]; let i = 0; while (t > keys[i + 1][0]) i++; const u = ss((t - keys[i][0]) / (keys[i + 1][0] - keys[i][0])); return lerp(keys[i][1], keys[i + 1][1], u); }
const camX = t => mono(KX, t);
const zoom = t => t < 8 ? lerp(.74, 1.0, ss(seg(t, 0, 8))) : t > 50.5 ? lerp(1.0, .78, ss(seg(t, 52, 62.4))) : lerp(1.0, 1.06, Math.abs(Math.sin(t * .2)) * 0); // high-wide in, pull back out
const skyStyleAt = t => { let i = 0; const ts = [0, 8.25, 15.34, 21.7, 29.85, 36.71, 43.12, 50.46]; while (i < 7 && t >= ts[i + 1]) i++; return SEC[i].sky; };

// ---------- sky (travels with camera; carved cuts; night stars, day dense, warm dawn) ----------
let SKYC = {};
function skyCanvas(style) { if (SKYC[style]) return SKYC[style]; const c = mk(W, GROUND + 200), g = c.getContext('2d'); const R = mulberry(style.length * 17 + 3);
  if (style === 'day') { cuts(g, PAPER, INK, 9, false, (x, y) => .18 + .42 * clamp((GROUND - y) / GROUND, 0, 1), -40, -10, W + 40, GROUND + 180, 1); }
  else if (style === 'warm') { cuts(g, PAPER, INK, 10, false, (x, y) => .12 + .3 * clamp((y) / GROUND, 0, 1), -40, -10, W + 40, GROUND + 180, 2); g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(223,164,67,.18)'; g.fillRect(0, 0, W, GROUND); g.restore(); }
  else if (style === 'rain') { cuts(g, PAPER, INK, 8, false, (x, y) => .3 + .4 * clamp((y) / GROUND, 0, 1), -40, -10, W + 40, GROUND + 180, 4); }
  else { g.fillStyle = INK; g.fillRect(0, 0, W, GROUND + 200); g.strokeStyle = PAPER; g.lineWidth = 1.4; for (let y = 40; y < GROUND; y += 26) { for (let x = -20; x < W + 20; x += 54) { if (R() > .5) continue; g.beginPath(); const yy = y + Math.sin(x * .02 + y) * 4; g.moveTo(x, yy); g.lineTo(x + 30, yy + (R() - .5) * 3); g.stroke(); } } g.fillStyle = PAPER; for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * (GROUND - 200); g.fillRect(x, y, 2.4, 2.4); } g.fillStyle = '#efe7cf'; g.beginPath(); g.arc(W * .72, 300, 70, 0, TAU); g.fill(); }
  SKYC[style] = c; return c; }

// ---------- print pass ----------
let FIBRE; function bakeFibre() { FIBRE = mk(W, H); const g = FIBRE.getContext('2d'), R = mulberry(5); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() > .5 ? '20,20,24' : '237,229,205'},${.03 + R() * .06})`; g.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); } for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H * .5, r = 90 + R() * 200, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,120,110,.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }
// ---------- steam / whiteout thresholds (through the steam) ----------
function steam(t, t0, dur) { const u = seg(t, t0, t0 + dur); if (u <= 0 || u >= 1) return; const a = Math.sin(u * Math.PI); ctx.save(); ctx.globalAlpha = a; const R = mulberry(Math.floor(t0)); ctx.strokeStyle = PAPER; ctx.lineCap = 'round'; for (let i = 0; i < 160; i++) { const y = R() * H, x = ((R() * W) + (u - .5) * W * 2) ; ctx.lineWidth = 6 + R() * 22; ctx.beginPath(); ctx.moveTo(x - 80, y); ctx.lineTo(x + 80, y + (R() - .5) * 20); ctx.stroke(); } ctx.fillStyle = PAPER; ctx.globalAlpha = a * a * .7; ctx.fillRect(0, 0, W, H); ctx.restore(); }

function drawSubs(t) { for (const [id, t0, d, txt] of VO) { const a = t0 - .1, b = t0 + d + .5; if (t < a || t > b) continue; const al = Math.min(seg(t, a, a + .2), 1 - seg(t, b - .3, b)); ctx.save(); ctx.font = 'italic 600 42px "Cormorant Garamond"'; ctx.textAlign = 'center'; const words = txt.split(' '), lines = []; let cur = ''; for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > 940 && cur) { lines.push(cur); cur = w; } else cur = test; } lines.push(cur); const bh = lines.length * 52 + 36, by = H - 70 - bh; ctx.globalAlpha = al * .82; ctx.fillStyle = INK; ctx.fillRect(40, by, W - 80, bh); ctx.globalAlpha = al; ctx.fillStyle = PAPER; lines.forEach((ln, i) => ctx.fillText(ln, W / 2, by + 30 + 30 + i * 52)); ctx.restore(); } }

function render(t) {
  t = Math.min(t, window.DUR - 1e-4); const cx = camX(t), z = zoom(t), sky = skyStyleAt(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  // sky (fixed to camera, slight vertical for zoom)
  ctx.save(); const sc = skyCanvas(sky); ctx.globalAlpha = 1; ctx.drawImage(sc, 0, (1 - z) * 200, W, (GROUND + 200) * z); ctx.restore();
  // sections, back (small d) to front
  const vis = SEC.map((s, i) => [s, i]).filter(([s]) => Math.abs(s.cx - cx) < SECW * 1.3);
  for (const pass of [0, 1]) for (const [s, i] of vis) { if (!s.cache) s.cache = s.build(s.cx); const layers = s.cache.filter(L => (pass === 0 ? L.d < .95 : L.d >= .95)); for (const L of layers) { const d = L.d, sx = W / 2 + (L.wx0 - cx) * d * z, sw = L.cv.width * d * z, sh = L.cv.height * z, sy = (1 - z) * GROUND; ctx.drawImage(L.cv, sx, sy, sw, sh); } }
  // live front content of nearby sections, in section-local coords
  for (const [s, i] of vis) if (s.front && Math.abs(s.cx - cx) < SECW * 0.62) { ctx.save(); const d = 1.0, sx = W / 2 + (s.cx - cx) * d * z; ctx.translate(sx, (1 - z) * GROUND); ctx.scale(z, z); s.front(ctx, t); ctx.restore(); }
  // the ghost — the subject the long take follows (stays near frame centre). In S4b/S5/S8 the nurse is drawn by the section (named figure); here she walks the corridor + exterior approaches.
  if (t < 15.0) { const u = clamp(seg(t, 2.2, 14.5)); const gx = lerp(SEC[0].cx + 200, SEC[1].cx + 80, u); nurseSil(ctx, W / 2 + (gx - cx) * z, (1 - z) * GROUND + (GROUND + 14) * z, (t < 8 ? lerp(.7, 1.0, ss(seg(t, 3, 8))) : 1.0) * z, { pale: '#f2efe0', ghost: true, aR: .12 + .05 * Math.sin(t * 3) }); }
  // steam thresholds between memory sections
  steam(t, 14.9, .9); steam(t, 21.3, .9); steam(t, 49.0, .8);
  // print pass
  ctx.save(); ctx.globalAlpha = .5; ctx.drawImage(FIBRE, 0, 0); ctx.restore();
  const fl = (Math.floor(t * 12) % 2) ? .03 : 0; if (fl) { ctx.save(); ctx.globalAlpha = fl; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const vg = ctx.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1300); vg.addColorStop(0, 'rgba(22,23,27,0)'); vg.addColorStop(1, 'rgba(22,23,27,.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  drawSubs(t);
}
window.render = render; window.TEXTS = () => [];
(async () => { cv.width = W; cv.height = H; await document.fonts.ready; for (const f of ['italic 600 42px "Cormorant Garamond"', '700 120px "IM Fell English SC"']) await document.fonts.load(f); bakeFibre(); window.READY = true; })();
