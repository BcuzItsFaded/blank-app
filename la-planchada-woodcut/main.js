// La Planchada as a woodcut novel: black wood block, light only where a knife has cut it. Each shot is a plate that carves itself.
const cv = document.getElementById('c'), W = 1080, H = 1920, PW = 960, PH = 1460, PX = 60, PY = 70;
window.DUR = 62.4;
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
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a)), ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PAPER = '#ece2cc', INK = '#0e0b09', COLOR = '#b32a1f';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---------------------------------------------------------------- the block: a tone picture + id map, turned into form-following cuts
const ang = (spec, x, y) => typeof spec === 'number' ? spec : spec.rad ? Math.atan2(y - spec.rad[1], x - spec.rad[0]) : spec.tan ? Math.atan2(y - spec.tan[1], x - spec.tan[0]) + Math.PI / 2 : spec.f(x, y);
const rectp = (x, y, w, h) => g => { g.rect(x, y, w, h); }, polyp = pts => g => { pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }, ellp = (x, y, rx, ry, r = 0) => g => { g.ellipse(x, y, rx, ry, r, 0, TAU); };
const gray = v => { const k = Math.round(clamp(v) * 255); return `rgb(${k},${k},${k})`; };
class Plate {
  constructor(dur, o = {}) { this.dur = dur; this.o = o; this.g = mk(PW, PH).getContext('2d'); this.gi = mk(PW, PH).getContext('2d'); this.g.fillStyle = '#000'; this.g.fillRect(0, 0, PW, PH); this.gi.fillStyle = '#000'; this.gi.fillRect(0, 0, PW, PH); this.dirs = [null]; this.par = [null]; this.strokes = []; this.stabs = []; }
  save() { this.g.save(); this.gi.save(); } restore() { this.g.restore(); this.gi.restore(); }
  xf(x, y, k = 1, flip = 1, rot = 0) { for (const c of [this.g, this.gi]) { c.translate(x, y); c.rotate(rot); c.scale(k * flip, k); } }
  shape(path, tone, dir = .6, o = {}) { const id = this.dirs.length; this.dirs.push(dir); this.par.push(o); const g = this.g, gi = this.gi; g.fillStyle = typeof tone === 'function' ? tone(g) : gray(tone); g.beginPath(); path(g); g.fill(); gi.fillStyle = `rgb(${id},0,0)`; gi.beginPath(); path(gi); gi.fill(); return id; }
  line(x0, y0, x1, y1, w, tone, dir = .6, o = {}) { const id = this.dirs.length; this.dirs.push(dir); this.par.push(o); for (const [c, st] of [[this.g, gray(tone)], [this.gi, `rgb(${id},0,0)`]]) { c.strokeStyle = st; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); } return id; }
  halo(path, w = 16, tone = .42, dir = 1.0) { const id = this.dirs.length; this.dirs.push(dir); this.par.push({ sp: 9 }); for (const [c, st] of [[this.g, gray(tone)], [this.gi, `rgb(${id},0,0)`]]) { c.strokeStyle = st; c.lineWidth = w; c.lineJoin = 'round'; c.beginPath(); path(c); c.stroke(); } }
  text(str, x, y, size, tone, dir, font = '700') { (this.texts = this.texts || []).push({ str, x, y, size, font, start: .3 + (this.texts?.length || 0) * .35, dur: .9, tone }); }
  lin(x0, y0, x1, y1, a, b) { return g => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, gray(a)); gr.addColorStop(1, gray(b)); return gr; }; }
  rad(cx, cy, r, a, b) { return g => { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, gray(a)); gr.addColorStop(1, gray(b)); return gr; }; }
  stab(n, x0, y0, x1, y1, tone = 1, col = false) { const R = mulberry(this.stabs.length * 13 + n); for (let i = 0; i < n; i++) this.stabs.push({ x: x0 + R() * (x1 - x0), y: y0 + R() * (y1 - y0), r: 2.5 + R() * 4.5, s: R() * 1.6, col }); }
  carve() {
    const T = this.g.getImageData(0, 0, PW, PH).data, I = this.gi.getImageData(0, 0, PW, PH).data, R = mulberry(77 + this.dirs.length), tone = (x, y) => { x |= 0; y |= 0; return x < 0 || y < 0 || x >= PW || y >= PH ? 0 : T[(y * PW + x) * 4] / 255; }, idAt = (x, y) => { x |= 0; y |= 0; return x < 0 || y < 0 || x >= PW || y >= PH ? 0 : I[(y * PW + x) * 4]; };
    const base = 7, scaleT = Math.min(1, (this.dur - .35) / 1.7);
    for (let y = 0; y < PH; y += base) for (let x = 0; x < PW; x += base) {
      const sx = x + R() * base, sy = y + R() * base, T0 = tone(sx, sy), id = idAt(sx, sy); if (T0 < .16 || !id) continue;
      const par = this.par[id] || {}, sp = par.sp || 12; if (R() > Math.pow(base / sp, 2) * 1.15) continue;
      const maxL = (par.len || 100) * (.5 + R()), dirS = this.dirs[id], pts = [];
      for (const sgn of [1, -1]) { let px = sx, py = sy, ok = 0; const arr = []; for (let s = 0; s < maxL / 4 / 2; s++) { const a = ang(dirS, px, py) + (sgn < 0 ? Math.PI : 0); px += Math.cos(a) * 4; py += Math.sin(a) * 4; if (Math.abs(idAt(px, py) - id) > 1 || tone(px, py) < .1) break; arr.push([px, py]); } if (sgn > 0) pts.push(...arr.reverse(), [sx, sy]); else pts.push(...arr); }
      if (pts.length < 6) continue;
      const ws = pts.map(([px, py], i) => { const tt = tone(px, py), w = 1.3 + (sp * .8 - 1.3) * Math.pow(tt, 1.25), e = Math.min(i, pts.length - 1 - i) / (pts.length * .3); return Math.max(.7, w * (par.ws || 1) * (.55 + .45 * clamp(e)) * (.88 + R() * .24)); });
      let len = 0; const cl = [0]; for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cl.push(len); }
      const wmax = Math.max(...ws), start = ((1 - T0) * .9 + (1 - wmax / (sp * .8)) * .45 + R() * .28) * scaleT, dur = (.1 + R() * .16) * (.6 + len / 140);
      this.strokes.push({ pts, ws, cl, len, start, dur, col: !!par.col, keep: R() < .12 });
    }
    this.tEnd = Math.max(...this.strokes.map(s => s.start + s.dur), ...(this.texts || []).map(t => t.start + t.dur), 0.2);
    this.bmp = null;
  }
}
function drawStroke(c, s, p, colourOn) {
  const n = s.pts.length, upto = s.len * p; let m = 1; while (m < n - 1 && s.cl[m] < upto) m++;
  const L = [], Rr = [];
  for (let i = 0; i <= m; i++) { const a = s.pts[Math.max(0, i - 1)], b = s.pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = s.ws[i] * (i === m && p < 1 ? .5 : 1) / 2, nx = -dy / l * w, ny = dx / l * w, j = (Math.sin(i * 12.9 + s.len) * .18 + 1); L.push([s.pts[i][0] + nx * j, s.pts[i][1] + ny * j]); Rr.push([s.pts[i][0] - nx, s.pts[i][1] - ny]); }
  c.beginPath(); L.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); for (let i = Rr.length - 1; i >= 0; i--) c.lineTo(Rr[i][0], Rr[i][1]); c.closePath(); c.fill();
}
// render a plate into its block canvas at local time lt
function paintPlate(P, lt, ctx, withBlock = true) {
  if (P.bmp && lt >= P.tEnd + .05) return P.bmp;
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = INK; c.fillRect(0, 0, PW, PH); c.drawImage(GRAIN, 0, 0);
  const colOn = !P.o.colorEnd || lt < P.o.colorEnd;
  c.fillStyle = PAPER; for (const s of P.strokes) { if (s.col) continue; const p = clamp((lt - s.start) / s.dur); if (p > 0) drawStroke(c, s, p); }
  for (const T of (P.texts || [])) { const p = clamp((lt - T.start) / T.dur); if (p <= 0) continue; c.save(); c.beginPath(); c.rect(0, 0, PW * ss(p) + 1, PH); c.clip(); c.font = `${T.font} ${T.size}px "IM Fell English SC"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = PAPER; c.fillText(T.str, T.x, T.y); c.globalAlpha = .5; c.fillText(T.str, T.x + 1.2, T.y + .8); c.restore(); }
  for (const s of P.stabs) { const p = clamp((lt - s.s) / .1); if (p > 0 && !s.col) { c.fillStyle = PAPER; c.beginPath(); c.ellipse(s.x, s.y, s.r * p, s.r * p * .8, s.s, 0, TAU); c.fill(); } }
  if (P.strokes.some(s => s.col)) { for (const s of P.strokes) { if (!s.col) continue; const p = clamp((lt - s.start) / s.dur); if (p <= 0) continue; const keep = P.o.colorEnd && lt > P.o.colorEnd ? s.keep : true; c.fillStyle = PAPER; drawStroke(c, s, p); if (keep) { c.save(); c.translate(3, 2); c.fillStyle = COLOR; c.globalAlpha = .93; drawStroke(c, s, p); c.restore(); } } }
  if (lt >= P.tEnd + .05) { const b = mk(PW, PH); b.getContext('2d').drawImage(c.canvas, 0, 0); P.bmp = b; }
  return P.bmp || c.canvas;
}

// ---------------------------------------------------------------- illustration helpers
function figure(P, x, y, k, o = {}) {
  const fl = o.flip || 1, ghost = o.ghost, aL = o.aL ?? .15, aR = o.aR ?? .15, hc = [x, y - 232 * k];
  P.save(); P.xf(x, y, k, fl, o.rot || 0);
  const dress = ghost ? [[-34, -190], [34, -190], [24, -130], [66, -50], [44, -2], [20, -34], [0, 34], [-22, -30], [-46, 4], [-68, -48], [-24, -130]] : [[-34, -190], [34, -190], [24, -130], [74, -20], [-74, -20], [-24, -130]];
  const bodyPath = polyp(dress);
  P.halo(bodyPath, 18 / k, .45, 1.2);
  P.shape(bodyPath, P.lin(-70, -190, 70, -20, o.dark ? .6 : .98, o.dark ? .22 : .5), Math.PI / 2 + (fl < 0 ? -.05 : .05), { sp: 11, ws: 1, len: 120 });
  if (o.creases !== false) for (const dx of [-36, -18, 0, 18, 36]) P.line(dx * .5, -128, dx * 1.7, -26, 5, .12, Math.PI / 2, { sp: 99 });
  for (const s of [-1, 1]) { const a = s < 0 ? aL : aR, sx = s * 34, sy = -182, ex = sx + s * Math.sin(a) * 100 * (a > 1.5 ? 1 : 1), ey = sy + Math.cos(a) * 100 * (a > 1.6 ? 1 : 1); P.halo(g => { g.moveTo(sx, sy); g.lineTo(ex, ey); }, 28 / k, .4, 1); P.line(sx, sy, ex, ey, 20, ghost ? .8 : .7, Math.atan2(ey - sy, ex - sx), { sp: 12 }); P.shape(ellp(ex, ey + 6, 11, 13), .9, .5, { sp: 8 }); }
  P.shape(polyp([[-8, -192], [8, -192], [8, -214], [-8, -214]]), .8, Math.PI / 2, { sp: 9 });
  const head = ellp(0, -234, 38, 46); P.halo(g => g.ellipse(0, -234, 38, 46, 0, 0, TAU), 18 / k, .45, .8);
  if (o.hair !== false) P.shape(polyp([[-44, -222], [-40, -270], [0, -286], [40, -270], [44, -222], [34, -204], [30, -250], [0, -262], [-30, -250], [-34, -204]]), .02, 0, {});
  P.shape(head, P.rad(-8, -244, 60, .98, .66), { f: (px, py) => Math.atan2(py - hc[1], px - hc[0]) + Math.PI / 2 }, { sp: 7, len: 50 });
  if (o.cap !== false) { P.shape(polyp([[-36, -268], [-24, -306], [26, -306], [38, -266], [0, -276]]), .96, .15, { sp: 8 }); P.line(0, -300, 0, -282, 5, .02, 0, { sp: 99 }); P.line(-9, -291, 9, -291, 5, .02, 0, { sp: 99 }); }
  const ex = o.look || 0; for (const s of [-1, 1]) P.shape(ellp(s * 15 + ex * 4, -238, o.wide ? 7.5 : 5.5, o.wide ? 9 : 6), .0, 0, {});
  P.line(-10, -214, 10, -214 + (o.frown ? -3 : 3), 4, .02, 0, { sp: 99 });
  P.restore();
  return hc;
}
function bedP(P, x, y, k, patient = true) {
  P.save(); P.xf(x, y, k); P.shape(polyp([[-250, -90], [250, -90], [250, 0], [-250, 0]]), P.lin(0, -90, 0, 0, .8, .35), .3, { sp: 11 }); P.shape(polyp([[-170, -120], [-60, -150], [-30, -110], [-170, -90]]), .95, -.2, { sp: 9 });
  if (patient) { P.shape(ellp(-120, -150, 34, 38), P.rad(-128, -158, 50, .96, .6), { f: (px, py) => Math.atan2(py + 150 * k - y, px - x + 120 * k) + 1.5 }, { sp: 7 }); P.shape(polyp([[-150, -168], [-120, -196], [-86, -170], [-120, -176]]), .9, .2, { sp: 8 }); P.shape(ellp(-130, -152, 4, 3), 0, 0); P.shape(ellp(-110, -152, 4, 3), 0, 0); }
  P.shape(polyp([[-90, -100], [-40, -140], [40, -134], [130, -142], [250, -110], [250, -40], [-90, -40]]), P.lin(-90, -140, 250, -40, .9, .4), .5, { sp: 13, len: 120 });
  for (const sx of [-250, 250]) P.shape(polyp([[sx - 8, -170], [sx + 8, -170], [sx + 8, 20], [sx - 8, 20]]), .55, Math.PI / 2, { sp: 10 });
  P.restore();
}
const heartPath = (cx, cy, r) => g => { for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); const px = cx + x * r / 16, py = cy + y * r / 16 + r * .1; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); };
function rays(P, cx, cy, r0, r1, n, tone = .8, w = 10, a0 = 0, a1 = TAU) { for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / n) + (i % 2) * .02; P.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, w, tone, a, { sp: 99 }); } }
function discWithRays(P, cx, cy, r, ray = 520) { P.shape(ellp(cx, cy, r, r), P.rad(cx, cy, r, 1, .7), { rad: [cx, cy] }, { sp: 8 }); P.shape(g => g.arc(cx, cy, ray, 0, TAU), P.rad(cx, cy, ray, .55, 0), { rad: [cx, cy] }, { sp: 15, len: 200 }); }

// ---------------------------------------------------------------- the plates, in order
const PLATES = [];
const plate = (t0, t1, build, o = {}) => PLATES.push({ t0, t1, build, o });
plate(0, 3.4, P => { P.text('LA', 480, 600, 280, 1, .6); P.text('PLANCHADA', 480, 840, 118, 1, .6); P.text('THE NURSE WHO NEVER LEFT', 480, 1050, 50, .9, .5, '400'); P.shape(g => g.arc(480, 300, 120, 0, TAU), P.rad(480, 300, 120, .9, .5), { rad: [480, 300] }, { sp: 8 }); rays(P, 480, 300, 140, 460, 22, .6, 12); P.shape(rectp(120, 1200, 720, 40), .6, 0, { sp: 8 }); });
plate(3.4, 8.15, P => { // the corridor
  const vx = 480, vy = 620;
  P.shape(polyp([[0, 0], [300, 400], [300, 860], [0, 1300]]), P.lin(0, 0, 300, 0, .3, .16), { rad: [vx, vy] }, { sp: 14, len: 160 }); P.shape(polyp([[960, 0], [660, 400], [660, 860], [960, 1300]]), P.lin(960, 0, 660, 0, .24, .12), { rad: [vx, vy] }, { sp: 14, len: 160 });
  P.shape(polyp([[0, 0], [960, 0], [660, 400], [300, 400]]), .2, { rad: [vx, vy] }, { sp: 16, len: 160 }); P.shape(polyp([[300, 860], [660, 860], [960, 1300], [960, 1460], [0, 1460], [0, 1300]]), P.lin(0, 860, 0, 1460, .7, .3), { rad: [vx, vy] }, { sp: 11, len: 200 });
  P.shape(rectp(380, 470, 200, 390), P.rad(vx, 700, 180, 1, .8), { rad: [vx, vy] }, { sp: 7 }); rays(P, vx, 640, 130, 470, 26, .55, 12);
  for (const s of [-1, 1]) for (const [u, w] of [[.2, 1], [.55, .62], [.8, .4]]) { const x = vx + s * lerp(480, 180, u), t = lerp(-10, 400, u), b = lerp(1300, 860, u); P.halo(g => { g.moveTo(x, t + 160 * w); g.lineTo(x + s * 80 * w * -1, t + 130 * w); g.lineTo(x + s * 80 * w * -1, b); g.lineTo(x, b); g.closePath(); }, 5, .6, 1.2); }
  figure(P, 480, 880, .62, { ghost: true, aL: .15, aR: .15 });
}, { });
plate(8.15, 11.5, P => { P.shape(g => g.arc(480, 480, 420, 0, TAU), P.rad(480, 480, 420, .5, 0), { rad: [480, 480] }, { sp: 13, len: 180 }); figure(P, 480, 1380, 3.2, { ghost: true, aL: .16, aR: .16 }); });
plate(11.5, 15.2, P => { // the pleats and the iron
  for (let i = 0; i < 9; i++) { const x0 = 40 + i * 100; P.shape(polyp([[x0, 200], [x0 + 98, 200], [x0 + 110, 1460], [x0 - 10, 1460]]), P.lin(x0, 0, x0 + 100, 0, i % 2 ? .95 : .55, i % 2 ? .6 : .9), Math.PI / 2, { sp: 10, len: 220 }); P.line(x0, 230, x0 - 6, 1460, 5, 0, Math.PI / 2, { sp: 99 }); }
  P.shape(polyp([[160, 160], [560, 160], [660, 300], [660, 360], [160, 360]]), P.lin(160, 160, 660, 360, .96, .5), .1, { sp: 8 }); P.shape(polyp([[240, 160], [300, 60], [520, 60], [580, 160], [540, 160], [500, 100], [320, 100], [280, 160]]), .6, 0, { sp: 8 }); P.stab(26, 660, 60, 900, 360, 1);
});
plate(15.2, 18.5, P => { // the garden arch
  discWithRays(P, 480, 560, 160, 600); P.shape(polyp([[120, 1300], [120, 520], [260, 260], [480, 200], [700, 260], [840, 520], [840, 1300], [780, 1300], [780, 560], [680, 330], [480, 280], [280, 330], [180, 560], [180, 1300]]), P.lin(0, 200, 0, 1300, .15, .45), { tan: [480, 700] }, { sp: 12 });
  figure(P, 250, 1330, 1.5, { aL: .12, aR: -.4 }); figure(P, 720, 1330, 1.55, { flip: -1, hair: true, cap: false, dark: true, aL: .15, aR: .3 }); P.shape(rectp(0, 1330, 960, 130), P.lin(0, 1330, 0, 1460, .6, .1), .05, { sp: 12 });
});
plate(18.5, 20.9, P => { figure(P, 480, 1380, 2.6, { wide: false, look: .5 }); P.save(); for (const [x, y, r] of [[200, 280, 70], [380, 150, 50], [600, 240, 64], [760, 380, 46], [140, 520, 38]]) P.shape(heartPath(x, y, r), P.rad(x, y, r, 1, .7), 0.5, { sp: 9, col: true, len: 70 }); P.restore(); }, { colorEnd: 99 });
plate(20.9, 21.6, P => { figure(P, 250, 1340, 2.0, { frown: true }); figure(P, 700, 1340, 1.4, { flip: -1, dark: true, cap: false }); figure(P, 860, 1340, 1.3, { flip: -1, dark: true, cap: false }); const L = polyp([[240, 160], [160, 100], [80, 180], [100, 300], [200, 340], [260, 400], [240, 300], [270, 230]]), Rr = polyp([[260, 420], [270, 330], [250, 240], [280, 170], [360, 100], [440, 170], [420, 300], [330, 360]]); P.shape(g => { for (const f of [L]) f(g); }, .96, .5, { col: true, sp: 9 }); P.shape(Rr, .96, .5, { col: true, sp: 9 }); });
plate(21.6, 24.45, P => { // she falls in the rain; her spirit rises
  for (let i = 0; i < 44; i++) { const x = (i * 97) % 960, y = (i * 211) % 700; P.line(x, y, x - 30, y + 90, 7, .7, 1.9, { sp: 99 }); }
  P.save(); P.xf(480, 1340, 1.9, 1, -1.4); P.restore(); figure(P, 520, 1400, 1.9, { rot: -1.4, frown: true, aL: .15, aR: .15 }); figure(P, 360, 700, 1.3, { ghost: true, aL: 2.4, aR: 2.4 }); rays(P, 360, 520, 120, 440, 16, .5, 10, -Math.PI * .95, -Math.PI * .05);
});
plate(24.45, 27.0, P => { // the bell
  rays(P, 700, 420, 200, 460, 24, .55, 12); P.shape(g => { g.moveTo(560, 600); g.quadraticCurveTo(560, 220, 700, 200); g.quadraticCurveTo(840, 220, 840, 600); g.closePath(); }, P.lin(560, 0, 840, 0, .97, .45), { tan: [700, 520] }, { sp: 8 }); P.shape(ellp(700, 640, 26, 26), .9, 0, {});
  bedP(P, 640, 1380, .95); figure(P, 220, 1400, 1.6, { rot: .16, hair: true }); P.stab(30, 60, 380, 460, 800, .9);
});
plate(27.0, 29.75, P => { // pulled back like a rubber band
  P.shape(g => g.arc(480, 500, 380, 0, TAU), P.rad(480, 500, 380, .45, 0), { rad: [480, 500] }, { sp: 13, len: 200 }); for (let i = 0; i < 9; i++) P.line(480 + Math.sin(i) * 14, 1300 - i * 90, 480 - Math.sin(i + 1) * 14, 1300 - (i + 1) * 90, 6, .7, Math.PI / 2, { sp: 99 }); figure(P, 480, 760, 1.9, { ghost: true, aL: 2.6, aR: 2.6, wide: true }); P.shape(polyp([[360, 1460], [600, 1460], [580, 1280], [380, 1280]]), .5, .2, { sp: 10 });
});
plate(29.75, 32.5, P => { // a feverish patient under the moon
  discWithRays(P, 700, 380, 120, 520); P.shape(rectp(520, 160, 360, 460), .08, .6, { sp: 99 }); P.halo(rectp(520, 160, 360, 460), 10, .7, .5); bedP(P, 500, 1260, 1.6, true);
  for (let i = 0; i < 7; i++) { P.line(110 - i * 6, 760 + i * 18, 190 - i * 6, 770 + i * 18, 6, .8, 0.1, { sp: 99 }); P.line(870 + i * 6, 760 + i * 18, 800 + i * 6, 770 + i * 18, 6, .8, 0.1, { sp: 99 }); }
});
plate(32.5, 35.3, P => { discWithRays(P, 760, 260, 100, 480); figure(P, 340, 1400, 2.3, { ghost: true, aL: .15, aR: 2.5, look: .6 }); P.shape(polyp([[640, 560], [660, 400], [690, 330], [710, 400], [730, 560], [700, 600]]), P.lin(640, 0, 730, 0, 1, .35), { tan: [690, 480] }, { sp: 8 }); P.shape(polyp([[675, 330], [705, 330], [705, 290], [675, 290]]), .1, 0, {}); });
plate(35.3, 36.7, P => { // a hand on a feverish brow
  P.shape(ellp(480, 900, 330, 430), P.rad(420, 800, 480, .98, .45), { tan: [480, 860] }, { sp: 8, len: 150 }); P.shape(polyp([[140, 700], [200, 420], [480, 330], [760, 420], [820, 700], [700, 620], [480, 560], [260, 620]]), .02, 0, {});
  for (const s of [-1, 1]) P.line(480 + s * 120 - 70, 860, 480 + s * 120 + 70, 860 + 0, 12, .02, 0, { sp: 99 }); P.line(400, 1130, 560, 1130, 10, .02, 0, { sp: 99 });
  P.halo(g => g.ellipse(480, 470, 190, 120, .1, 0, TAU), 16, .45, .8); P.shape(ellp(480, 470, 190, 120, .1), P.lin(300, 400, 640, 540, .98, .55), { tan: [480, 470] }, { sp: 8, len: 80 });
  for (let i = 0; i < 4; i++) { const x = 340 + i * 90; P.halo(g => { g.moveTo(x, 520); g.lineTo(x - 30, 700); }, 56, .45, 1); P.line(x, 520, x - 30 - i * 4, 680 + (i % 2) * 20, 44, .92, Math.PI / 2, { sp: 8, len: 70 }); }
  P.line(660, 450, 780, 340, 40, .9, -.8, { sp: 8 });
});
plate(36.7, 40.4, P => { // the morning lobby
  discWithRays(P, 220, 380, 130, 700); P.shape(rectp(70, 140, 300, 560), .96, .5, { sp: 8 }); rays(P, 220, 420, 160, 800, 30, .45, 12, .1, 1.5);
  figure(P, 230, 1380, 1.9, { dark: true, hair: true, cap: false, aL: .2, aR: 1.4 }); figure(P, 640, 1370, 1.7, { flip: -1, dark: true, aL: .15, aR: .15 }); figure(P, 850, 1380, 1.75, { flip: -1, dark: true, cap: false });
  P.shape(polyp([[500, 1250], [960, 1250], [960, 1460], [500, 1460]]), .3, 0, { sp: 11 });
});
plate(40.4, 43.0, P => { for (const [x, tone] of [[170, .95], [480, .9], [790, .95]]) { P.save(); P.xf(x, 1000, 1.5); P.shape(ellp(0, -234, 38, 46), P.rad(-8, -244, 60, .98, .66), { tan: [x, 780] }, { sp: 7, len: 50 }); P.shape(polyp([[-44, -222], [-40, -270], [0, -286], [40, -270], [44, -222], [34, -204], [30, -250], [0, -262], [-30, -250], [-34, -204]]), .02, 0, {}); P.shape(ellp(-14, -236, 4, 5), 0, 0); P.shape(ellp(14, -236, 4, 5), 0, 0); P.line(-10, -212, 10, -212, 4, .02, 0, { sp: 99 }); P.restore(); P.text('?', x, 300, 240, .96, .5, '700'); P.shape(polyp([[x - 120, 1090], [x + 120, 1090], [x + 160, 1460], [x - 160, 1460]]), .55, Math.PI / 2, { sp: 11 }); } });
plate(43.0, 46.8, P => { // the wall of photographs, and a patient seen from behind
  for (const [x, y, w, h] of [[80, 120, 220, 290], [370, 90, 240, 320], [680, 130, 200, 270], [120, 520, 200, 260], [650, 520, 220, 280]]) { P.halo(rectp(x, y, w, h), 12, .8, 0); P.shape(rectp(x + 14, y + 14, w - 28, h - 28), .55, .3, { sp: 10 }); }
  P.save(); P.xf(490, 330, .85); P.shape(ellp(0, -90, 34, 42), .95, .5, { sp: 7 }); P.shape(polyp([[-40, -110], [0, -150], [40, -110]]), .96, 0, {}); P.restore(); P.save(); P.xf(280, 1460, 3.2); P.shape(polyp([[-40, -190], [40, -190], [50, 0], [-50, 0]]), .02, 0, {}); P.shape(ellp(0, -236, 40, 48), .02, 0, {}); P.halo(g => { g.ellipse(0, -236, 40, 48, 0, 0, TAU); }, 5, .7, 1); P.halo(polyp([[-40, -190], [40, -190], [50, 0], [-50, 0]]), 5, .6, 1.2); P.restore();
});
plate(46.8, 49.1, P => { P.halo(rectp(130, 130, 700, 900), 24, .85, 0); P.shape(rectp(160, 160, 640, 840), .3, .3, { sp: 10 }); figure(P, 480, 1270, 3.0, { ghost: true, aL: .12, aR: .12 }); P.shape(polyp([[160, 160], [420, 160], [160, 420]]), .0, 0, {}); P.halo(polyp([[160, 160], [420, 160], [160, 420]]), 6, .7, 0.8); }, { });
plate(49.1, 50.3, P => { for (let i = 0; i < 18; i++) P.line(100 + (i % 3) * 40, 300 + i * 60, 520 - (i % 4) * 30, 300 + i * 60, 9, .8, 0, { sp: 99 }); figure(P, 640, 1380, 1.9, { rot: .2, dark: true, hair: true, cap: false, wide: true, aL: 2.5, aR: 1.0 }); });
plate(50.3, 53.5, P => { discWithRays(P, 760, 300, 100, 460); bedP(P, 640, 1340, 1.25, true); figure(P, 270, 1400, 2.1, { ghost: true, aL: .15, aR: 1.5, look: .4 }); });
plate(53.5, 56.0, P => { P.shape(g => g.arc(480, 640, 440, 0, TAU), P.rad(480, 640, 440, .5, 0), { rad: [480, 640] }, { sp: 13, len: 200 }); figure(P, 480, 1380, 3.3, { ghost: true, aL: .15, aR: .15 }); });
plate(56.0, 59.0, P => { bedP(P, 480, 1340, 1.35, true); P.shape(heartPath(480, 520, 260), P.rad(480, 520, 270, 1, .55), { rad: [480, 540] }, { sp: 9, col: true, len: 120 }); rays(P, 480, 540, 300, 520, 30, .5, 10); }, { colorEnd: 2.2 });
plate(59.0, 62.4, P => { P.text('THE NURSE', 480, 480, 130, 1, .5); P.text('IS A LEGEND.', 480, 660, 118, 1, .5); P.shape(rectp(140, 800, 680, 14), .9, 0, { sp: 8 }); P.text('HER STORY STILL', 480, 960, 84, .95, .5, '400'); P.text('HAUNTS MEXICO.', 480, 1070, 84, .95, .5, '400'); P.shape(heartPath(480, 1260, 70), .98, .5, { col: true, sp: 8 }); }, { colorEnd: 99 });

// ---------------------------------------------------------------- print, paper, captions
let GRAIN, PAPERBG, BLOCK;
function bakeGrain() { GRAIN = mk(PW, PH); const g = GRAIN.getContext('2d'), R = mulberry(5); g.fillStyle = INK; g.fillRect(0, 0, PW, PH); g.fillStyle = 'rgba(255,240,210,.045)'; for (let i = 0; i < 900; i++) g.fillRect(R() * PW, R() * PH, 40 + R() * 220, 1); g.fillStyle = 'rgba(236,226,204,.55)'; for (let i = 0; i < 520; i++) g.fillRect(R() * PW, R() * PH, 1 + R() * 2, 1 + R() * 2); }
function bakePaper() { PAPERBG = mk(W, H); const g = PAPERBG.getContext('2d'), R = mulberry(9); g.fillStyle = PAPER; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(120,100,70,.08)'; g.lineWidth = 1; for (let y = 0; y < H; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(110,90,60,${.03 + R() * .05})`; g.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); } for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, r = 80 + R() * 200, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,120,70,.05)'); gr.addColorStop(1, 'rgba(150,120,70,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } const e = g.createRadialGradient(540, 960, 600, 540, 960, 1200); e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(90,70,40,.22)'); g.fillStyle = e; g.fillRect(0, 0, W, H); }
function caption(g, t) {
  for (const [id, t0, d, txt] of VO) {
    const a = t0 - .1, b = t0 + Math.max(d + .6, 1.8); if (t < a || t >= b || t >= 58.8) continue;
    const al = Math.min(seg(t, a, a + .1), 1 - seg(t, b - .15, b));
    g.save(); g.font = '40px "IM Fell English"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = al * .93; g.fillStyle = '#17110c';
    const words = txt.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > 860 && cur) { lines.push(cur); cur = w; } else cur = tt; }
    lines.push(cur); const y0 = 1704 - (lines.length - 1) * 26; lines.forEach((l, i) => { g.fillText(l, 540 + (Math.sin(i * 3 + t0) * 1.5), y0 + i * 52); g.globalAlpha = al * .3; g.fillText(l, 541.5, y0 + i * 52 + .8); g.globalAlpha = al * .93; });
    g.restore();
  }
}
function render(t) {
  t = Math.min(t, window.DUR - 1e-4); const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAPERBG, 0, 0);
  let i = PLATES.findIndex(p => t >= p.t0 && t < p.t1); if (i < 0) i = PLATES.length - 1; const P = PLATES[i].P, lt = t - PLATES[i].t0, dur = PLATES[i].t1 - PLATES[i].t0;
  const frame = (idx, ltt, ox = 0, oy = 0, z = 1) => { const Pn = PLATES[idx].P; const bmp = paintPlate(Pn, ltt, BLOCK); g.save(); g.beginPath(); const R = mulberry(idx + 4); const pts = []; for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push([PX + u * PW + (R() - .5) * 3, PY + (R() - .5) * 3]); } for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push([PX + PW + (R() - .5) * 3, PY + u * PH + (R() - .5) * 3]); } for (let k = 40; k >= 0; k--) { const u = k / 40; pts.push([PX + u * PW + (R() - .5) * 3, PY + PH + (R() - .5) * 3]); } for (let k = 40; k >= 0; k--) { const u = k / 40; pts.push([PX + (R() - .5) * 3, PY + u * PH + (R() - .5) * 3]); } pts.forEach(([x, y], q) => q ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip(); g.translate(PX + PW / 2 + ox, PY + PH / 2 + oy); g.scale(z, z); g.translate(-PW / 2, -PH / 2); g.drawImage(bmp, 0, 0); g.restore(); };
  let z = lerp(1, 1.06, clamp(lt / dur)); if (i === 17) z = lerp(1, 1.4, ss(seg(lt, 0, .25))) + .02 * lt;
  const mis = lt < .09 ? [5, 3] : [0, 0];
  // the paper transition (brayer, lay down, peel) between the day and the night, and again before the end
  const pT = [[29.75, 0.7], [50.3, 0.7]].find(([tb, d]) => t >= tb && t < tb + d);
  if (pT) { const p = ss(seg(t, pT[0], pT[0] + pT[1])), edge = lerp(PY + PH + 30, PY - 40, p); frame(i, lt, 0, 0, 1); g.save(); g.beginPath(); g.rect(0, 0, W, edge); g.clip(); g.drawImage(PAPERBG, 0, 0); frame(i - 1, PLATES[i - 1].t1 - PLATES[i - 1].t0 + 1, 0, 0, 1.06); g.restore(); const gr = g.createLinearGradient(0, edge - 70, 0, edge + 8); gr.addColorStop(0, 'rgba(60,45,25,0)'); gr.addColorStop(.8, 'rgba(60,45,25,.5)'); gr.addColorStop(1, 'rgba(255,248,225,.7)'); g.fillStyle = gr; g.fillRect(0, edge - 70, W, 78); }
  else frame(i, lt, mis[0], mis[1], z);
  // the very first seconds show the block itself: mirrored, wood-brown
  if (t < 1.1) { g.save(); g.fillStyle = `rgba(150,100,55,${.5 * (1 - seg(t, .6, 1.1))})`; g.fillRect(PX, PY, PW, PH); g.restore(); }
  caption(g, t);
}
window.render = render; window.TEXTS = () => [];
(async () => {
  cv.width = W; cv.height = H; await document.fonts.ready; for (const f of ['40px "IM Fell English"', '700 100px "IM Fell English SC"', '400 60px "IM Fell English SC"']) await document.fonts.load(f);
  BLOCK = mk(PW, PH).getContext('2d'); bakeGrain(); bakePaper();
  for (const p of PLATES) { const P = new Plate(p.t1 - p.t0, p.o); p.build(P); P.carve(); p.P = P; }
  window.READY = true;
})();
