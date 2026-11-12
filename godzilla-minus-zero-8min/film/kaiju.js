// ===== Godzilla: chunky cartoon, side view, feet at x,y facing f =====
const GZ = { b: '#4f5c5e', d: '#3d484a', l: '#66766f', belly: '#7c8a80', sp: '#d7e0e2', glow: '#7fd8ff', core: '#eafaff' };
function spikeRow(pts, sizes, col) { for (let i = 0; i < pts.length; i += 3) { const x = pts[i], y = pts[i + 1], a = pts[i + 2], s = sizes[i / 3]; push(x, y, a); poly([-s * 0.55, 0, -s * 0.3, -s * 0.7, -s * 0.1, -s * 0.45, 0, -s * 1.1, s * 0.12, -s * 0.45, s * 0.32, -s * 0.72, s * 0.55, 0], col); pop(); } }
function godzilla(o) {
  const s = o.s || 1, f = o.face || 1, t = T + (o.seed || 0), m = clamp(o.mouth || 0), g = clamp(o.glow || 0), ph = o.walk;
  push(o.x, o.y, o.rot || 0, s * f, s);
  const sp = g > 0 ? (g > 0.5 ? GZ.glow : shade(GZ.sp, 0.1)) : GZ.sp, br = Math.sin(t * 1.8) * 4;
  // tail
  const tp = []; for (let i = 0; i <= 14; i++) tp.push(-90 - i * 30, -170 + i * 11 + Math.sin(i * 0.4 - t * 1.6) * (2 + i * 1.6));
  for (let i = 0; i < 14; i++) tube([tp[i * 2], tp[i * 2 + 1], tp[i * 2 + 2], tp[i * 2 + 3]], 120 - i * 7.6, i % 2 ? GZ.b : shade(GZ.b, -0.03));
  const ts = [], tz = []; for (let i = 1; i < 12; i += 2) { const a = Math.atan2(tp[i * 2 + 3] - tp[i * 2 + 1], tp[i * 2 + 2] - tp[i * 2]); ts.push(tp[i * 2], tp[i * 2 + 1] - (60 - i * 4.2), a); tz.push(46 - i * 3); }
  spikeRow(ts, tz, sp);
  // legs
  const leg = (k, col) => { const p = ph === undefined ? 0 : ph + k * Math.PI, sw = ph === undefined ? (k ? 18 : -10) : Math.sin(p) * 40, lift = ph === undefined ? 0 : Math.max(0, Math.cos(p)) * 24;
    ell(-20 + sw * 0.5, -150, 78, 96, 0, col); rrect(-70 + sw, -110 - lift, 96, 110, 30, col); ell(-10 + sw, -14 - lift, 70, 26, 0, col); for (let i = 0; i < 3; i++) poly([30 + sw + i * 14, -14 - lift, 52 + sw + i * 14, -6 - lift, 30 + sw + i * 14, 2 - lift], GZ.sp); };
  leg(1, GZ.d);
  // back spikes
  spikeRow([-60, -330 + br, -0.5, -10, -380 + br, -0.35, 40, -420 + br, -0.2, 80, -450 + br, -0.1, -100, -270, -0.7], [92, 112, 96, 66, 76], sp);
  if (g > 0.2) { ctx.globalAlpha = 1; for (const [x, y] of [[-60, -380], [-10, -440], [40, -470]]) circ(x, y + br, 18 * g + Math.sin(t * 20) * 4, GZ.core); }
  // body
  ell(10, -270 + br, 125, 160, -0.25, GZ.b); ell(55, -250 + br, 62, 120, -0.25, GZ.belly);
  for (let i = 0; i < 5; i++) rrect(30, -330 + i * 36 + br, 60, 8, 4, shade(GZ.belly, -0.08));
  leg(0, GZ.b);
  // arms
  if (!o.noFarArm) tube([90, -320 + br, 120, -270, 150, -280 + Math.sin(t * 2) * 6], 30, GZ.d);
  if (!o.noArm) { tube([100, -310 + br, 140, -255, 172, -268 + Math.sin(t * 2 + 1) * 6], 34, GZ.b); for (let i = 0; i < 3; i++) line(172, -268, 188 + i * 3, -282 + i * 12, 7, GZ.sp); }
  else ell(100, -305 + br, 26, 20, 0, shade(GZ.b, -0.15));
  // neck + head
  tube([70, -380 + br, 120, -430 + br], 100, GZ.b);
  push(140, -440 + br, (o.headR || 0) + Math.sin(t * 1.3) * 0.04 - m * 0.12);
  ell(0, 0, 78, 52, 0, GZ.b); rrect(20, -20, 92, 46, 22, GZ.b); ell(-10, -34, 60, 18, 0, GZ.d);
  circ(30, -14, 13, P.white); circ(34, -14, 6, P.ink); rrect(10, -32, 40, 10, 5, GZ.d);
  push(10, 20, m * 0.45); rrect(0, -8, 96, 26, 12, GZ.d); for (let i = 0; i < 6; i++) poly([20 + i * 13, -8, 28 + i * 13, -8, 24 + i * 13, -18], GZ.sp); pop();
  for (let i = 0; i < 6; i++) poly([26 + i * 13, 22, 34 + i * 13, 22, 30 + i * 13, 32], GZ.sp);
  if (o.breath > 0) { const L = (o.breathL || 1500) * clamp(o.breath), w = 34 + Math.sin(t * 40) * 6; push(108, 18, o.breathA || 0); rrect(0, -w, L, w * 2, w, GZ.glow); rrect(0, -w * 0.45, L, w * 0.9, w * 0.45, GZ.core); for (let i = 0; i < 6; i++) circ(hash(i + Math.floor(t * 20)) * L, (hash(i * 3 + Math.floor(t * 20)) - 0.5) * 3 * w, 10, GZ.core); pop(); }
  pop();
  pop();
}
// ===== Ghidorah: golden dragon. heads: 1 or 3; lost: index of a missing head; mutant: that head has spines + heat ray =====
const GH = { b: '#e1b03f', d: '#bf8c2a', l: '#f2d27a', w: '#cf9a35', wd: '#a97624', t: '#fffbe9' };
function ghHead(x, y, a, o, i) {
  const m = o.mouthAt ? o.mouthAt(i) : (o.mouth || 0), mut = o.mutant === i, ice = o.frozen;
  const b = ice ? '#cfe8f2' : GH.b, d = ice ? '#9fc8d8' : GH.d;
  push(x, y, a);
  if (mut) spikeRow([-30, -26, -0.2, -60, -20, -0.4], [40, 34], GZ.sp);
  poly([-40, -18, -110, -64, -70, -10], d); poly([-36, -6, -106, -30, -66, 6], d);   // horns
  ell(0, 0, 52, 32, 0, b); rrect(10, -18, 70, 30, 14, b); circ(18, -12, 9, P.white); circ(21, -12, 4.5, P.ink);
  push(14, 10, m * 0.5); rrect(0, -6, 66, 18, 9, d); for (let k = 0; k < 4; k++) poly([14 + k * 12, -6, 20 + k * 12, -6, 17 + k * 12, -14], GH.t); pop();
  for (let k = 0; k < 4; k++) poly([22 + k * 12, 12, 28 + k * 12, 12, 25 + k * 12, 20], GH.t);
  const beam = o.beamAt ? o.beamAt(i) : 0;
  if (beam > 0) { const L = (o.beamL || 1200) * beam; if (mut || o.heat) { const w = 26 + Math.sin(T * 40) * 5; rrect(80, -w + 6, L, w * 2, w, '#ff6b3d'); rrect(80, -w * 0.4 + 6, L, w * 0.8, w * 0.4, '#ffe0b0'); }
    else { ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 12; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(80, 6); for (let k = 1; k <= 12; k++) ctx.lineTo(80 + L * k / 12, 6 + (hash(k + Math.floor(T * 24)) - 0.5) * 90); ctx.stroke(); ctx.strokeStyle = P.white; ctx.lineWidth = 4; ctx.stroke(); } }
  pop();
}
function ghidorah(o) { // feet at x,y facing f
  const s = o.s || 1, f = o.face || 1, t = T + (o.seed || 0), n = o.heads || 3, ice = o.frozen;
  const b = ice ? '#cfe8f2' : GH.b, d = ice ? '#9fc8d8' : GH.d, w = ice ? '#bcdbe8' : GH.w, wd = ice ? '#9cc3d3' : GH.wd;
  push(o.x, o.y, o.rot || 0, s * f, s);
  const flap = ice ? 0 : Math.sin(t * (o.fly ? 6 : 1.6)) * (o.fly ? 0.35 : 0.12), wo = o.wings ?? 1;
  // wings (far, then near later)
  const wing = (col, cd, sc, dx) => { push(dx - 10, -300, -0.25 - flap); ctx.scale(sc * wo, sc * wo);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-120, -260); ctx.lineTo(-360, -300); ctx.quadraticCurveTo(-340, -200, -380, -120); ctx.quadraticCurveTo(-300, -110, -290, -40); ctx.quadraticCurveTo(-200, -60, -170, 20); ctx.quadraticCurveTo(-80, -10, 0, 40); ctx.closePath(); ctx.fill();
    for (const [x, y] of [[-360, -300], [-380, -120], [-290, -40], [-170, 20]]) tube([-120, -260, x, y], 10, cd); tube([0, 0, -120, -260], 22, cd); pop(); };
  wing(wd, shade(wd, -0.15), 0.85, 40);
  // tails
  const tails = o.tails || (n > 1 ? 2 : 1);
  for (let k = 0; k < tails; k++) { const tp = []; for (let i = 0; i <= 12; i++) tp.push(-100 - i * 30, -150 + k * 30 + i * 8 + Math.sin(i * 0.5 - t * 2 + k * 2) * (3 + i * 2.5)); for (let i = 0; i < 12; i++) tube([tp[i * 2], tp[i * 2 + 1], tp[i * 2 + 2], tp[i * 2 + 3]], 46 - i * 3.2, k ? d : b); push(tp[24], tp[25], 0); poly([0, -16, 40, 0, 0, 16, 10, 0], d); pop(); }
  // legs
  for (const [k, c] of [[1, d], [0, b]]) { const sw = k ? 20 : -10; tube([-20 + sw, -170, 10 + sw, -90, -10 + sw, -10], 44, c); ell(14 + sw, -10, 40, 14, 0, c); for (let i = 0; i < 3; i++) poly([40 + sw + i * 10, -14, 58 + sw + i * 10, -6, 40 + sw + i * 10, 0], GH.t); }
  // body
  ell(0, -220, 150, 105, -0.15, b); ell(40, -200, 90, 60, -0.15, ice ? '#e8f6fb' : GH.l); for (let i = 0; i < 4; i++) rrect(0 + i * 28, -190, 14, 46, 7, d);
  // necks + heads
  const base = n === 1 ? [[0, 0]] : [[-70, -60], [10, 0], [80, 55]];
  base.forEach(([bx, by], i) => {
    if (o.lost === i && !(o.reattach > 0)) { ell(100 + bx * 0.3, -300 + by * 0.4, 30, 24, 0, d); return; }
    const sway = Math.sin(t * 1.5 + i * 1.7) * 30, hx = 260 + bx + (o.reach || 0) * 80, hy = -470 + by * 2.6 + sway + (o.lift || 0);
    tube([80, -280 + by * 0.4, 150 + bx * 0.5, -400 + by * 2 + sway * 0.5, hx - 40, hy + 10], 44, i === 1 ? b : d);
    ghHead(hx, hy, Math.sin(t * 1.2 + i) * 0.1 + (o.headA || 0), o, i);
  });
  wing(w, GH.d, 1, 0);
  pop();
}
function blob(x, y, r, t, c = '#b7c46a') { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, rr = r * (1 + 0.12 * Math.sin(a * 5 + t * 4) + 0.08 * Math.sin(a * 3 - t * 3)); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.fill(); circ(x - r * 0.3, y - r * 0.15, r * 0.12, '#8d9a48'); circ(x + r * 0.25, y - r * 0.05, r * 0.08, '#8d9a48'); }
// ===== planes, vehicles, city =====
function fighter(x, y, s, a = 0, f = 1) { push(x, y, a, s * f, s); rrect(-120, -16, 240, 32, 16, '#7d8574'); poly([-20, -10, 30, -10, -10, -90, -50, -90], '#6a7262'); poly([-20, 10, 30, 10, -10, 70, -50, 70], '#5d6556'); poly([-120, -10, -150, -50, -130, -50, -100, -10], '#6a7262'); ell(30, -16, 30, 14, 0, '#cfe7f0'); circ(124, 0, 8, '#3a3d4c'); rect(126, -30, 6, 60, '#9aa5b3'); pop(); }
function bomber(x, y, s, a = 0) { push(x, y, a, s); rrect(-260, -26, 520, 52, 26, '#b6bcc4'); poly([-40, -14, 60, -14, -40, -170, -110, -170], '#a3a9b2'); poly([-40, 14, 60, 14, -40, 120, -110, 120], '#959ba4'); poly([-250, -10, -300, -90, -260, -90, -210, -10], '#a3a9b2'); ell(240, -10, 30, 18, 0, '#cfe7f0'); for (const k of [-120, -70]) rrect(-20, k, 60, 22, 10, '#8a9099'); pop(); }
function seaplane(x, y, s, a = 0) { push(x, y, a, s); rrect(-280, -40, 560, 80, 40, '#8a9a88'); poly([-280, 20, 280, 20, 240, 50, -240, 50], '#6f7e6d'); rect(-200, -70, 420, 26, '#7a8a78'); for (const k of [-150, -60, 60, 150]) { rrect(k - 22, -86, 60, 30, 14, '#5d6b5b'); rect(k + 36, -100, 6, 58, '#9aa5b3'); } poly([-280, -30, -330, -140, -290, -140, -230, -30], '#7a8a78'); ell(230, -24, 34, 16, 0, '#cfe7f0'); pop(); }
function truck(x, y, s, col = '#6f7656', o = {}) { push(x, y, 0, s * (o.f || 1), s); rrect(-200, -150, 280, 120, 16, col); rrect(90, -140, 110, 110, 14, shade(col, -0.1)); rect(130, -126, 56, 40, '#cfe7f0'); for (const k of [-140, 20, 150]) { circ(k, -26, 32, '#2e3138'); circ(k, -26, 12, '#565a63'); } if (o.tank) { rrect(-200, -190, 280, 110, 55, o.tank); } pop(); }
function ruinCity(seed, c = '#7a7f8f', fy = 820) { for (let i = 0; i < 10; i++) { const x = i * 210 - 40 + hash(i + seed) * 60, h = 180 + hash(i * 2 + seed) * 340, w = 150 + hash(i * 3 + seed) * 60; const top = fy - h; poly([x, fy, x, top + 30, x + w * 0.3, top, x + w * 0.55, top + 40, x + w * 0.8, top + 10, x + w, top + 60, x + w, fy], shade(c, -0.05 * (i % 3))); for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) rect(x + 24 + q * w * 0.45, top + 80 + r * 60, 30, 34, shade(c, -0.25)); } }
function ocean(y, c1 = '#4d7189', c2 = '#5c84a0') { rect(0, y, W, H - y, c1); for (let i = 0; i < 9; i++) { const yy = y + 30 + i * 40, off = (T * 40 * (1 + i * 0.2)) % 260; for (let x = -260; x < W + 260; x += 260) rrect(x + off, yy, 140, 10, 5, c2); } }
function shore(x0, x1, y, c = '#6f8a6a') { poly([x0, y, x0 + (x1 - x0) * 0.2, y - 120, x0 + (x1 - x0) * 0.5, y - 180, x0 + (x1 - x0) * 0.8, y - 90, x1, y], c); }
function houses(fy, seed) { for (let i = 0; i < 7; i++) { const x = i * 290 + hash(i + seed) * 40, w = 220, h = 160 + hash(i + seed * 2) * 60; rect(x, fy - h, w, h, '#a88d6a'); poly([x - 30, fy - h, x + w / 2, fy - h - 90, x + w + 30, fy - h], '#5b4a3e'); rect(x + 30, fy - h + 50, 60, 60, '#e6d6ba'); rect(x + 130, fy - h + 50, 60, 60, '#e6d6ba'); } }
function scaffold(x, y, w, h) { for (let i = 0; i <= 3; i++) rect(x + i * w / 3 - 6, y, 12, h, '#8a6f4c'); for (let j = 0; j <= 4; j++) rect(x, y + j * h / 4 - 5, w, 10, '#8a6f4c'); }
function bolt(x1, y1, x2, y2, seed, w = 14) { ctx.strokeStyle = '#fff3a8'; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); for (let k = 1; k < 8; k++) ctx.lineTo(lerp(x1, x2, k / 8) + (hash(k + seed) - 0.5) * 120, lerp(y1, y2, k / 8)); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = P.white; ctx.lineWidth = w * 0.4; ctx.stroke(); }
function amplifier(x, y, s, on) { push(x, y, 0, s); rrect(-150, -220, 300, 220, 18, '#5b6379'); rrect(-120, -190, 240, 90, 10, on ? '#bff1ff' : '#1e2a3a'); for (let i = 0; i < 3; i++) circ(-80 + i * 80, -50, 22, on && Math.floor(T * 6 + i) % 2 ? GZ.glow : '#3a4256'); rect(-12, -330, 24, 110, '#4b5266'); ell(0, -340, 110, 40, 0, '#8d96ab'); ell(0, -348, 80, 24, 0, '#6f7891'); if (on) for (let k = 0; k < 3; k++) { const r = ((T * 1.5 + k / 3) % 1) * 300; ctx.strokeStyle = GZ.glow; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, -350, r, -2.6, -0.5); ctx.stroke(); } pop(); }
function desk(x, y, w) { rect(x, y, w, 30, '#8a7560'); rect(x, y + 30, w, 12, '#6f5d4b'); rect(x + 20, y + 42, 22, 200, '#6f5d4b'); rect(x + w - 42, y + 42, 22, 200, '#6f5d4b'); }
