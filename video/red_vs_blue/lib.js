// ===== core =====
const C = document.getElementById('c'), X0 = C.getContext('2d');
let X = X0;
const W = 1080, H = 1920;
const off = document.createElement('canvas'); off.width = W; off.height = H;
const OX = off.getContext('2d');
const CREAM = '#efe4cf', GREY = '#8f897f', AMBER = '#ff9a3c', RUST = '#8a3b1c', BLUE = '#6cc3ff', GREEN = '#7dff9a', RED = '#ff3b2f', DARK = '#0b0b0d';
const R = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t = clamp(t), t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const eo = t => (t = clamp(t), 1 - Math.pow(1 - t, 3));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const PI = Math.PI;

function cam(x, y, z, rot = 0) { X.translate(W / 2, H / 2); X.rotate(rot); X.scale(z, z); X.translate(-x, -y); }
function camL(a, b, p) { const q = ease(p); cam(lerp(a[0], b[0], q), lerp(a[1], b[1], q), lerp(a[2], b[2], q), lerp(a[3] || 0, b[3] || 0, q)); }
function shake(t, amt) { X.translate(Math.sin(t * 91) * amt, Math.cos(t * 77) * amt); }

function fillBG(top, bot) { const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); X.fillStyle = g; X.fillRect(-4000, -4000, 9920, 9080); }
function rect(x, y, w, h, c) { X.fillStyle = c; X.fillRect(x, y, w, h); }
function glow(x, y, r, c, a = 1) { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); X.globalAlpha *= a; X.fillStyle = g; X.fillRect(x - r, y - r, 2 * r, 2 * r); X.globalAlpha /= a || 1; }
function line(pts, c, w, cap = 'round') { X.beginPath(); X.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) X.lineTo(pts[i], pts[i + 1]); X.strokeStyle = c; X.lineWidth = w; X.lineCap = cap; X.lineJoin = 'round'; X.stroke(); }
function poly(pts, c) { X.beginPath(); X.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) X.lineTo(pts[i], pts[i + 1]); X.closePath(); X.fillStyle = c; X.fill(); }
function circ(x, y, r, fill, stroke, lw) { X.beginPath(); X.arc(x, y, r, 0, 2 * PI); if (fill) { X.fillStyle = fill; X.fill(); } if (stroke) { X.strokeStyle = stroke; X.lineWidth = lw; X.stroke(); } }
function txt(s, x, y, size, c, o = {}) {
  X.save(); X.font = `${o.w || 800} ${size}px ${o.font || 'Inter'}`; X.textAlign = o.al || 'center'; X.textBaseline = 'middle';
  if (o.ls) X.letterSpacing = o.ls + 'px';
  X.globalAlpha *= (o.a ?? 1);
  if (o.glow) { X.shadowColor = o.glow; X.shadowBlur = o.gb || 20; }
  if (o.stroke) { X.lineWidth = o.sw || 8; X.strokeStyle = o.stroke; X.lineJoin = 'round'; X.strokeText(s, x, y); }
  X.fillStyle = c; X.fillText(s, x, y); X.restore();
}
function label(s, x, y, a = 1, c = CREAM, size = 26) {
  if (a <= 0) return;
  X.save(); X.globalAlpha *= a;
  line([x, y, x, y - 40], c, 2);
  X.font = `800 ${size}px Inter`; X.letterSpacing = '3px';
  const w = X.measureText(s).width + 28;
  X.fillStyle = 'rgba(0,0,0,0.65)'; X.fillRect(x - w / 2, y - 40 - size - 14, w, size + 14);
  X.strokeStyle = c; X.lineWidth = 2; X.strokeRect(x - w / 2, y - 40 - size - 14, w, size + 14);
  X.fillStyle = c; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(s, x, y - 40 - (size + 14) / 2);
  X.restore();
}
function stamp(s, x, y, size, c, a, rot = -0.06) {
  if (a <= 0) return; X.save(); X.translate(x, y); X.rotate(rot); X.globalAlpha *= a; const sc = 1 + 0.4 * (1 - eo(a)); X.scale(sc, sc);
  X.font = `900 ${size}px Inter`; X.letterSpacing = '6px'; const w = X.measureText(s).width + 50;
  X.strokeStyle = c; X.lineWidth = 6; X.strokeRect(-w / 2, -size * 0.75, w, size * 1.5);
  txt(s, 0, 0, size, c, { w: 900, ls: 6 }); X.restore();
}

// ===== stick figure =====
function pose(name, ph = 0) {
  const p = { lt: -0.07, lk: 0, rt: 0.07, rk: 0, la: -0.13, le: 0.12, ra: 0.13, re: 0.18, lean: 0, ht: 0.03 * Math.sin(ph * 0.5) };
  const s = Math.sin(ph);
  switch (name) {
    case 'walk': p.lt = 0.42 * s; p.rt = -0.42 * s; p.lk = -0.7 * Math.max(0, Math.sin(ph - 1.3)); p.rk = -0.7 * Math.max(0, Math.sin(ph + PI - 1.3)); p.la = -0.38 * s; p.ra = 0.38 * s; p.le = 0.35; p.re = 0.35; p.lean = 0.06; break;
    case 'run': p.lt = 0.8 * s; p.rt = -0.8 * s; p.lk = -1.4 * Math.max(0, Math.sin(ph - 1.1)) - 0.2; p.rk = -1.4 * Math.max(0, Math.sin(ph + PI - 1.1)) - 0.2; p.la = -0.9 * s; p.ra = 0.9 * s; p.le = 1.5; p.re = 1.5; p.lean = 0.3; break;
    case 'point': p.ra = 1.55; p.re = 0; p.la = -0.1; break;
    case 'talk': p.ra = 0.55 + 0.25 * Math.sin(ph * 0.8); p.re = 0.9 + 0.2 * Math.sin(ph * 1.1); break;
    case 'armsup': p.la = -2.5 - 0.1 * s; p.ra = 2.5 + 0.1 * s; p.le = 0.1; p.re = 0.1; break;
    case 'preach': p.ra = 1.9 + 0.2 * Math.sin(ph * 0.7); p.re = 0.3; p.la = 0.4; p.le = 0.8; break;
    case 'cross': p.la = 0.4; p.le = 1.95; p.ra = 0.4; p.re = 1.95; break;
    case 'stomach': p.la = 0.25; p.le = 1.75; p.ra = 0.35; p.re = 1.6; p.lean = 0.2; p.ht = 0.2; break;
    case 'cower': p.lean = -0.2; p.la = 1.0; p.le = 2.2; p.ra = 1.2; p.re = 2.2; p.lt = 0.9; p.lk = -1.9; p.rt = 0.5; p.rk = -1.6; p.ht = 0.2; break;
    case 'fall': p.la = -1.9; p.ra = 1.9; p.le = -0.1; p.re = 0.1; p.lt = 0.15; p.rt = -0.25; p.rk = -0.3; break;
    case 'hold': p.ra = 1.1; p.re = 0.7; p.la = 0.9; p.le = 0.9; break;
    case 'push': p.ra = 1.45; p.re = 0.15; p.la = 1.3; p.le = 0.3; p.lean = 0.22; p.lt = 0.35; p.rt = -0.35; break;
    case 'reach': p.ra = 1.35; p.re = 0.1; break;
    case 'paint': p.ra = 1.5 + 0.5 * Math.sin(ph * 2); p.re = 0.5; p.la = 0.3; p.le = 0.6; break;
    case 'lever': p.ra = 1.2 + 0.6 * s; p.re = 0.3; p.la = 1.1 + 0.6 * s; p.le = 0.4; p.lean = 0.15; break;
    case 'gun': p.ra = 1.45; p.re = 0.2; p.la = 1.2; p.le = 0.5; break;
    case 'headdown': p.ht = 0.35; break;
  }
  return p;
}
function stick(o) {
  const h = o.h || 300, f = o.f || 1, col = o.col || CREAM, lw = o.lw || h * 0.03;
  const p = Object.assign(pose(o.pose || 'stand', o.ph || 0), o.p || {});
  const th = 0.245 * h, ar = 0.17 * h, tor = 0.31 * h, hr = 0.1 * h;
  X.save(); X.translate(o.x, o.y); if (o.rot) X.rotate(o.rot); X.globalAlpha *= (o.a ?? 1);
  if (o.sc) X.scale(o.sc[0], o.sc[1]);
  const leg = (t, k) => { const kx = Math.sin(t) * th * f, ky = Math.cos(t) * th; return [kx, ky, kx + Math.sin(t + k) * th * f, ky + Math.cos(t + k) * th]; };
  const L = leg(p.lt, p.lk), Rg = leg(p.rt, p.rk);
  if (!o.rot && !o.float && o.shadow !== false) { X.save(); X.globalAlpha *= 0.45; X.beginPath(); X.ellipse(0, 0, h * 0.16, h * 0.028, 0, 0, 2 * PI); X.fillStyle = '#000'; X.fill(); X.restore(); }
  const yoff = o.float ? -2 * th : -Math.max(L[3], Rg[3]) - lw / 2; X.translate(0, yoff);
  const sx = Math.sin(p.lean) * tor * f, sy = -Math.cos(p.lean) * tor;
  const arm = (a, e) => { const ex = sx + Math.sin(a) * ar * f, ey = sy + Math.cos(a) * ar; return [ex, ey, ex + Math.sin(a + e) * ar * f, ey + Math.cos(a + e) * ar]; };
  const A1 = arm(p.la, p.le), A2 = arm(p.ra, p.re);
  X.strokeStyle = col; X.lineWidth = lw; X.lineCap = 'round'; X.lineJoin = 'round';
  if (o.glow !== false) { X.shadowColor = o.glowc || 'rgba(255,240,210,0.35)'; X.shadowBlur = o.gb ?? 14; }
  const hx = sx + Math.sin(p.lean + p.ht) * (hr + 0.04 * h) * f, hy = sy - Math.cos(p.lean + p.ht) * (hr + 0.04 * h);
  if (o.shirt || o.pants) { X.save(); X.shadowBlur = 0; X.lineCap = 'round'; X.lineJoin = 'round';
    if (o.pants) { X.strokeStyle = o.pants; X.lineWidth = lw * 2.6; X.beginPath(); X.moveTo(0, 0); X.lineTo(L[0], L[1]); X.lineTo(L[2], L[3]); X.moveTo(0, 0); X.lineTo(Rg[0], Rg[1]); X.lineTo(Rg[2], Rg[3]); X.stroke(); }
    if (o.shirt) { X.strokeStyle = o.shirt; X.lineWidth = lw * 4.2; X.beginPath(); X.moveTo(sx * 0.12, sy * 0.12); X.lineTo(sx, sy); X.stroke(); X.lineWidth = lw * 2.6; X.beginPath(); X.moveTo(sx, sy); X.lineTo(A1[0], A1[1]); X.moveTo(sx, sy); X.lineTo(A2[0], A2[1]); X.stroke();
      if (o.vest) { X.strokeStyle = o.vest; X.lineWidth = lw * 1.4; X.beginPath(); X.moveTo(sx * 0.2, sy * 0.2); X.lineTo(sx * 0.95, sy * 0.95); X.stroke(); } }
    if (o.pack) { X.fillStyle = o.pack; X.translate(-sx * 0.55 * f - 0.07 * h * f, sy * 0.5); X.rotate(-p.lean); X.fillRect(-0.05 * h, -0.1 * h, 0.1 * h, 0.2 * h); }
    X.restore(); }
  X.beginPath();
  X.moveTo(0, 0); X.lineTo(L[0], L[1]); X.lineTo(L[2], L[3]);
  X.moveTo(0, 0); X.lineTo(Rg[0], Rg[1]); X.lineTo(Rg[2], Rg[3]);
  X.moveTo(0, 0); X.lineTo(sx, sy);
  X.moveTo(sx, sy); X.lineTo(A1[0], A1[1]); X.lineTo(A1[2], A1[3]);
  X.moveTo(sx, sy); X.lineTo(A2[0], A2[1]); X.lineTo(A2[2], A2[3]);
  // feet + hands
  X.moveTo(L[2], L[3]); X.lineTo(L[2] + 0.05 * h * f, L[3]); X.moveTo(Rg[2], Rg[3]); X.lineTo(Rg[2] + 0.05 * h * f, Rg[3]);
  X.stroke();
  if (h >= 110) { X.fillStyle = col; for (const A of [A1, A2]) { X.beginPath(); X.arc(A[2], A[3], lw * 0.75, 0, 2 * PI); X.fill(); } }
  if (o.prisoner) { X.save(); X.lineWidth = lw * 0.45; X.globalAlpha *= 0.7; X.beginPath(); X.moveTo(sx * 0.55 - 0.035 * h, sy * 0.55); X.lineTo(sx * 0.55 + 0.035 * h, sy * 0.55); X.stroke(); X.restore(); }
  if (o.coat) { X.beginPath(); X.moveTo(sx - 0.05 * h * f, sy + 0.02 * h); X.lineTo(-0.11 * h * f, 0.13 * h); X.moveTo(sx + 0.05 * h * f, sy + 0.02 * h); X.lineTo(0.11 * h * f, 0.13 * h); X.lineWidth = lw * 0.6; X.stroke(); X.lineWidth = lw; }
  if (o.gunHeld) { X.beginPath(); X.moveTo(A2[2] - 0.05 * h * f, A2[3] + 0.02 * h); X.lineTo(A2[2] + 0.28 * h * f, A2[3] - 0.02 * h); X.lineWidth = lw * 1.3; X.stroke(); X.lineWidth = lw; }
  // head
  X.beginPath(); X.arc(hx, hy, hr, 0, 2 * PI); X.fillStyle = o.headFill || DARK; X.fill(); X.stroke();
  X.shadowBlur = 0;
  if (o.hair) { // curly mass on back/top
    X.beginPath(); X.arc(hx - 0.02 * h * f, hy - 0.01 * h, hr * 1.18, f > 0 ? PI * 0.75 : -PI * 0.75 - 0, f > 0 ? PI * 1.9 : PI * 0.1 + 0.15, f < 0); X.lineWidth = lw * 1.6; X.stroke();
    X.beginPath(); X.moveTo(hx - hr * 0.9 * f, hy + hr * 0.2); X.quadraticCurveTo(hx - hr * 1.5 * f, hy + hr * 0.9, hx - hr * 1.2 * f, hy + hr * 1.5); X.lineWidth = lw * 0.8; X.stroke(); X.lineWidth = lw;
  }
  if (o.pig) { line([hx - hr * f, hy - hr * 0.2, hx - hr * 1.7 * f, hy + hr * 0.4], col, lw * 0.7); line([hx - hr * 0.6 * f, hy - hr * 0.8, hx - hr * 1.3 * f, hy - hr * 1.2], col, lw * 0.7); }
  if (o.bald) { X.beginPath(); X.arc(hx, hy, hr * 0.62, -PI * 0.8, -PI * 0.55); X.lineWidth = lw * 0.5; X.strokeStyle = 'rgba(255,255,255,0.5)'; X.stroke(); X.strokeStyle = col; X.lineWidth = lw; }
  if (o.glasses) { line([hx + hr * 0.15 * f, hy - hr * 0.15, hx + hr * 1.05 * f, hy - hr * 0.15], col, lw * 0.6); circ(hx + hr * 0.7 * f, hy - hr * 0.12, hr * 0.22, null, col, lw * 0.45); }
  if (o.cap) { line([hx - hr * 1.05 * f, hy - hr * 0.55, hx + hr * 1.05 * f, hy - hr * 0.55], col, lw); line([hx + hr * 0.6 * f, hy - hr * 0.55, hx + hr * 1.6 * f, hy - hr * 0.45], col, lw * 0.8); X.beginPath(); X.arc(hx, hy - hr * 0.55, hr * 1.0, PI, 0); X.fillStyle = col; X.fill(); }
  if (o.band) { line([hx - hr * 1.0 * f, hy - hr * 0.35, hx + hr * 1.0 * f, hy - hr * 0.35], o.bandc || RED, lw * 0.9); }
  if (o.android) { X.lineWidth = lw * 0.35; X.strokeStyle = 'rgba(180,230,255,0.8)'; X.beginPath(); X.moveTo(hx - hr * 0.3, hy + hr * 0.2); X.lineTo(hx, hy - hr * 0.3); X.lineTo(hx + hr * 0.4, hy - hr * 0.2); X.stroke(); X.strokeStyle = col; }
  if (o.eye !== false && o.eyes) { circ(hx + hr * 0.45 * f, hy - hr * 0.1, hr * 0.12, o.eyes); }
  else if (o.face !== false && h >= 120) face(hx, hy, hr, f, col, lw, o.ex || EXP[o.pose] || 'calm', o.ph || 0, o.rot);
  if (o.qmark) txt('?', hx + hr * 0.5 * f, hy - hr * 2.4, hr * 1.6, o.qc || CREAM, { a: o.qmark });
  X.restore();
  if (o.label) label(o.label, o.x + (o.lx || 0), o.y - h * 1.05 + (o.ly || 0), o.la ?? 1, o.lc || col);
  return { hx: o.x + hx, hy: o.y + yoff + hy };
}

const EXP = { cower: 'fear', run: 'fear', headdown: 'sad', stomach: 'pain', cross: 'angry', push: 'angry', talk: 'talk', preach: 'talk', armsup: 'shout', fall: 'fear', point: 'firm', lever: 'shout', paint: 'calm', gun: 'firm', reach: 'calm' };
function face(hx, hy, hr, f, col, lw, ex, ph, rot) {
  X.save(); X.strokeStyle = col; X.fillStyle = col; X.lineCap = 'round'; X.shadowBlur = 0;
  const exx = hx + hr * 0.42 * f, ey = hy - hr * 0.12, mx = hx + hr * 0.42 * f, my = hy + hr * 0.42, w = lw * 0.5;
  if (ex === 'dead') { X.lineWidth = w; X.beginPath(); X.moveTo(exx - hr * 0.13, ey - hr * 0.13); X.lineTo(exx + hr * 0.13, ey + hr * 0.13); X.moveTo(exx + hr * 0.13, ey - hr * 0.13); X.lineTo(exx - hr * 0.13, ey + hr * 0.13); X.stroke(); X.restore(); return; }
  if (ex === 'fear' || ex === 'shout') { X.lineWidth = w * 0.7; X.beginPath(); X.arc(exx, ey, hr * 0.2, 0, 2 * PI); X.stroke(); X.beginPath(); X.arc(exx, ey, hr * 0.07, 0, 2 * PI); X.fill(); }
  else if (ex === 'closed') { X.lineWidth = w; X.beginPath(); X.arc(exx, ey - hr * 0.05, hr * 0.13, 0.2, PI - 0.2); X.stroke(); }
  else { X.beginPath(); X.arc(exx, ey, hr * 0.11, 0, 2 * PI); X.fill(); }
  X.lineWidth = w;
  if (ex === 'sad' || ex === 'pain') { X.beginPath(); X.moveTo(exx - hr * 0.28 * f, ey - hr * 0.26); X.lineTo(exx + hr * 0.18 * f, ey - hr * 0.4); X.stroke(); }
  if (ex === 'angry' || ex === 'firm') { X.beginPath(); X.moveTo(exx - hr * 0.28 * f, ey - hr * 0.42); X.lineTo(exx + hr * 0.2 * f, ey - hr * 0.26); X.stroke(); }
  if (ex === 'fear') { X.beginPath(); X.moveTo(exx - hr * 0.25 * f, ey - hr * 0.3); X.lineTo(exx + hr * 0.2 * f, ey - hr * 0.42); X.stroke(); }
  X.beginPath();
  if (ex === 'sad') X.arc(mx, my + hr * 0.14, hr * 0.17, -PI * 0.85, -PI * 0.15);
  else if (ex === 'pain') { X.moveTo(mx - hr * 0.18, my); X.lineTo(mx - hr * 0.06, my - hr * 0.06); X.lineTo(mx + hr * 0.06, my + hr * 0.04); X.lineTo(mx + hr * 0.18, my - hr * 0.02); }
  else if (ex === 'fear' || ex === 'shout') { X.ellipse(mx, my, hr * 0.12, hr * (ex === 'shout' ? 0.2 : 0.15), 0, 0, 2 * PI); }
  else if (ex === 'talk') { const op = Math.abs(Math.sin(ph * 2.3)) * 0.13 + 0.02; X.ellipse(mx, my, hr * 0.13, hr * op, 0, 0, 2 * PI); }
  else if (ex === 'smile') X.arc(mx, my - hr * 0.1, hr * 0.17, PI * 0.15, PI * 0.85);
  else { X.moveTo(mx - hr * 0.15, my); X.lineTo(mx + hr * 0.12, my); }
  X.stroke(); X.restore();
}
function wallSign(x, y, s, c = '#c8b48a', bg = '#1b120c', size = 22) { X.save(); X.font = `800 ${size}px DejaVu Sans Mono`; const w = X.measureText(s).width + 26; rect(x - w / 2, y - size, w, size * 2, bg); X.strokeStyle = c; X.globalAlpha *= 0.8; X.lineWidth = 2; X.strokeRect(x - w / 2 + 4, y - size + 4, w - 8, size * 2 - 8); X.fillStyle = c; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(s, x, y + 1); X.restore(); }
function hazard(x, y, w, h, a = 0.7) { X.save(); X.beginPath(); X.rect(x, y, w, h); X.clip(); X.globalAlpha *= a; rect(x, y, w, h, '#1a1206'); for (let i = -2; i < w / 30 + 2; i++) poly([x + i * 30, y + h, x + i * 30 + 15, y + h, x + i * 30 + 15 + h, y, x + i * 30 + h, y], '#b8861c'); X.restore(); }
function valve(x, y, r, c = '#4a2a1a', t = 0) { X.save(); X.translate(x, y); X.rotate(t); circ(0, 0, r, null, c, r * 0.18); for (let i = 0; i < 4; i++) { X.rotate(PI / 4 * 2); line([0, 0, r, 0], c, r * 0.12); } circ(0, 0, r * 0.2, c); X.restore(); }
function blinker(x, y, t, c = '#ff3b2f', rate = 1.3, ph = 0) { const on = Math.sin(t * rate * 2 * PI + ph) > 0.3; circ(x, y, 5, on ? c : '#2a0a08'); if (on) glow(x, y, 40, c.length === 7 ? c + '88' : c); }
function railing(y, x0, x1, c, cx = 0, par = 1) { line([x0, y, x1, y], c, 6); line([x0, y + 40, x1, y + 40], c, 3); for (let x = x0 - ((cx * par) % 80); x < x1; x += 80) line([x, y, x, y + 70], c, 4); }
function cables(cx, t, c = '#0a0605', n = 6, y0 = 0) { X.save(); X.strokeStyle = c; X.lineWidth = 5; for (let i = 0; i < n; i++) { const x = ((i * 410 + R(i) * 200 - cx * 0.8) % 2600 + 2600) % 2600 - 300, sag = 120 + R(i + 4) * 160; X.beginPath(); X.moveTo(x, y0); X.quadraticCurveTo(x + 160, y0 + sag + 6 * Math.sin(t + i), x + 330, y0); X.stroke(); } X.restore(); }
function fgPipe(cx, t, c = '#050302') { for (let i = 0; i < 3; i++) { const x = ((i * 900 - cx * 2.2) % 2700 + 2700) % 2700 - 400; rect(x, -100, 110, 1300, c); rect(x - 10, 300 + i * 120, 130, 26, c); } }
function ekg(x, y, w, h, t, col, flat = 0) { X.save(); rect(x - 6, y - 6, w + 12, h + 12, '#0b0f12'); rect(x, y, w, h, '#020506'); X.beginPath(); X.rect(x, y, w, h); X.clip();
  X.strokeStyle = col; X.lineWidth = 3; X.shadowColor = col; X.shadowBlur = 8; X.beginPath();
  for (let i = 0; i <= w; i += 3) { const u = (i / w * 2 + t * 0.9) % 1; let v = 0; if (!flat || i / w < 1 - flat) { if (u > 0.4 && u < 0.43) v = -0.9; else if (u > 0.43 && u < 0.46) v = 0.5; else if (u > 0.3 && u < 0.36) v = -0.15; } const yy = y + h / 2 + v * h * 0.45; i ? X.lineTo(x + i, yy) : X.moveTo(x + i, yy); }
  X.stroke(); X.restore(); }
function cabinet(x, y, w, h, c = '#1a2226') { rect(x, y, w, h, c); for (let k = 0; k < 3; k++) { X.strokeStyle = 'rgba(255,255,255,0.08)'; X.lineWidth = 3; X.strokeRect(x + 8, y + 8 + k * (h - 16) / 3, w - 16, (h - 16) / 3 - 6); rect(x + w / 2 - 15, y + 8 + k * (h - 16) / 3 + 14, 30, 6, 'rgba(255,255,255,0.18)'); } }
function brazier(x, y, t, s = 1) { line([x - 30 * s, y, x, y - 70 * s, x + 30 * s, y], '#2a1408', 6 * s); poly([x - 45 * s, y - 70 * s, x + 45 * s, y - 70 * s, x + 30 * s, y - 95 * s, x - 30 * s, y - 95 * s], '#2a1408'); flames(x, y - 92 * s, 70 * s, 120 * s, t, 10, 1); glow(x, y - 120 * s, 220 * s, 'rgba(255,140,50,0.35)'); }
function dust(t, col = '255,230,200', a = 0.35, n = 70) { X.save(); for (let i = 0; i < n; i++) { const x = (R(i) * W + Math.sin(t * 0.3 + i) * 60 + t * 8 * (R(i + 2) - 0.5)) % W, y = (R(i + 1) * H + t * (6 + R(i + 3) * 10)) % H; X.globalAlpha = a * (0.3 + 0.7 * R(i + 5)) * (0.6 + 0.4 * Math.sin(t * 2 + i)); X.fillStyle = `rgb(${col})`; const r = 1 + R(i + 7) * 2.5; X.fillRect((x + W) % W, y, r, r); } X.restore(); }

// ===== alien (four-legged runner) =====
function alien(o) {
  const ph = o.ph || 0, mode = o.mode || 'stand', run = mode === 'run';
  X.save(); X.translate(o.x, o.y); X.scale(o.s * (o.f || 1), o.s * (o.flipY ? -1 : 1)); if (o.rot) X.rotate(o.rot);
  X.globalAlpha *= (o.a ?? 1);
  const bob = run ? Math.sin(ph * 2) * 0.07 : Math.sin(ph * 0.6) * 0.02;
  const cr = mode === 'crouch' ? 0.3 : (mode === 'rear' ? -0.5 : 0);
  const hip = [-0.95, -0.95 + bob + (mode === 'rear' ? 0.25 : 0)], sh = [0.75, -1.0 - bob * 0.6 + cr];
  const amp = run ? 1 : 0.12;
  const legs = [
    // [base, thigh angle, knee rel, foot rel, l1,l2,l3]
    [sh, 0.25 + 0.75 * amp * Math.sin(ph), -0.5 - 0.6 * amp * Math.max(0, Math.cos(ph)), 0.6, 0.55, 0.5, 0.18],
    [sh, 0.25 + 0.75 * amp * Math.sin(ph + 0.7), -0.5 - 0.6 * amp * Math.max(0, Math.cos(ph + 0.7)), 0.6, 0.55, 0.5, 0.18],
    [hip, 0.7 + 0.7 * amp * Math.sin(ph + PI), -1.7, 1.2, 0.45, 0.45, 0.25],
    [hip, 0.7 + 0.7 * amp * Math.sin(ph + PI + 0.7), -1.7, 1.2, 0.45, 0.45, 0.25],
  ];
  if (mode === 'rear') { legs[0][1] = 1.4 + 0.1 * Math.sin(ph); legs[1][1] = 1.7; legs[0][2] = -1.2; legs[1][2] = -1.3; }
  const head = [sh[0] + 0.32, sh[1] - 0.08 + cr * 0.3], ha = (o.ha ?? 0.2) + (run ? 0.05 * Math.sin(ph * 2) : 0);
  const jaw = o.jaw || 0;
  const passes = [[o.rim || AMBER, 0.055, o.rimA ?? 0.85], ['#030304', 0, 1]];
  for (const [col, ex, al] of passes) {
    X.save(); X.globalAlpha *= al; X.strokeStyle = col; X.fillStyle = col; X.lineCap = 'round'; X.lineJoin = 'round';
    // tail
    X.beginPath();
    for (let i = 0; i <= 24; i++) { const u = i / 24; const tx = hip[0] - 0.1 - u * 2.4, ty = hip[1] + 0.05 - 0.45 * u + 0.25 * Math.sin(ph * 1.3 + u * 4) * u; i ? X.lineTo(tx, ty) : X.moveTo(tx, ty); }
    X.lineWidth = 0.09 + ex; X.stroke();
    const tu = 1, tx = hip[0] - 0.1 - 2.4, ty = hip[1] + 0.05 - 0.45 + 0.25 * Math.sin(ph * 1.3 + 4);
    X.beginPath(); X.moveTo(tx, ty); X.lineTo(tx - 0.35 - ex, ty - 0.12); X.lineTo(tx - 0.05, ty + 0.12 + ex); X.closePath(); X.fill();
    // legs
    for (const [b, a1, k, fa, l1, l2, l3] of legs) {
      const kx = b[0] + Math.sin(a1) * l1, ky = b[1] + Math.cos(a1) * l1;
      const fx = kx + Math.sin(a1 + k) * l2, fy = ky + Math.cos(a1 + k) * l2;
      const tx2 = fx + Math.sin(a1 + k + fa) * l3, ty2 = fy + Math.cos(a1 + k + fa) * l3;
      X.beginPath(); X.moveTo(b[0], b[1]); X.lineTo(kx, ky); X.lineTo(fx, fy); X.lineTo(tx2, ty2); X.lineWidth = 0.1 + ex; X.stroke();
    }
    // torso
    X.beginPath(); X.moveTo(hip[0], hip[1]); X.bezierCurveTo(hip[0] + 0.5, hip[1] - 0.45, sh[0] - 0.5, sh[1] - 0.4, sh[0], sh[1]); X.lineWidth = 0.4 + ex; X.stroke();
    X.beginPath(); X.moveTo(hip[0] + 0.2, hip[1] + 0.05); X.bezierCurveTo(hip[0] + 0.6, hip[1] - 0.1, sh[0] - 0.6, sh[1] - 0.05, sh[0] - 0.1, sh[1] + 0.12); X.lineWidth = 0.22 + ex; X.stroke();
    // dorsal tubes
    for (let i = 0; i < 3; i++) { const u = 0.35 + i * 0.13; const bx = lerp(hip[0], sh[0], u), by = lerp(hip[1], sh[1], u) - 0.32; X.beginPath(); X.moveTo(bx, by); X.lineTo(bx - 0.28, by - 0.22); X.lineWidth = 0.07 + ex; X.stroke(); }
    // neck
    X.beginPath(); X.moveTo(sh[0], sh[1]); X.lineTo(head[0], head[1]); X.lineWidth = 0.2 + ex; X.stroke();
    // head
    X.save(); X.translate(head[0], head[1]); X.rotate(ha); const e = ex * 0.9;
    X.beginPath(); X.moveTo(0.78 + e, 0.1); X.quadraticCurveTo(0.65, -0.16 - e, 0.2, -0.24 - e); X.quadraticCurveTo(-0.35, -0.36 - e, -0.75 - e, -0.55 - e); X.quadraticCurveTo(-0.4, -0.08 + e, -0.05, 0.08 + e); X.quadraticCurveTo(0.35, 0.2 + e, 0.78 + e, 0.1); X.closePath(); X.fill();
    // lower jaw
    X.beginPath(); X.moveTo(-0.05, 0.05); X.quadraticCurveTo(0.3, 0.24 + jaw * 0.18 + e, 0.66 + e, 0.2 + jaw * 0.3 + e); X.lineTo(0.62, 0.1); X.closePath(); X.fill();
    if (col !== passes[0][0] && jaw > 0) { // teeth + inner jaw
      X.strokeStyle = o.rim || AMBER; X.lineWidth = 0.015; X.globalAlpha *= 0.9;
      for (let i = 0; i < 6; i++) { const u = 0.3 + i * 0.07; X.beginPath(); X.moveTo(u, 0.13); X.lineTo(u + 0.01, 0.13 + 0.07 * jaw); X.stroke(); }
      X.beginPath(); X.moveTo(0.35, 0.16 + jaw * 0.05); X.lineTo(0.62 + jaw * 0.45, 0.17 + jaw * 0.06); X.lineWidth = 0.06; X.strokeStyle = '#030304'; X.stroke();
      X.beginPath(); X.moveTo(0.35, 0.16 + jaw * 0.05); X.lineTo(0.62 + jaw * 0.45, 0.17 + jaw * 0.06); X.lineWidth = 0.012; X.strokeStyle = o.rim || AMBER; X.stroke();
    }
    if (col !== passes[0][0]) { // glossy dome highlight
      X.beginPath(); X.moveTo(0.55, -0.12); X.quadraticCurveTo(0.1, -0.24, -0.45, -0.42); X.strokeStyle = 'rgba(255,200,140,0.35)'; X.lineWidth = 0.02; X.stroke();
    }
    X.restore();
    X.restore();
  }
  X.restore();
}
function facehugger(x, y, s, t, a = 1) {
  X.save(); X.translate(x, y); X.scale(s, s); X.globalAlpha *= a;
  X.strokeStyle = '#d8c7a6'; X.fillStyle = '#c9b48f'; X.lineCap = 'round'; X.lineWidth = 0.06;
  for (let i = 0; i < 8; i++) { const sd = i < 4 ? -1 : 1, k = i % 4; const a0 = sd * (0.4 + k * 0.32) + 0.05 * Math.sin(t * 6 + i); X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(Math.sin(a0) * 0.5, -0.3 + Math.cos(a0) * 0.1, Math.sin(a0) * 0.75, 0.25 + Math.abs(Math.cos(a0)) * 0.1); X.stroke(); }
  X.beginPath(); X.ellipse(0, -0.05, 0.32, 0.22, 0, 0, 2 * PI); X.fill();
  X.beginPath(); X.moveTo(0.3, -0.05); for (let i = 0; i < 20; i++) X.lineTo(0.3 + i * 0.05, -0.05 + 0.12 * Math.sin(t * 5 + i * 0.6)); X.lineWidth = 0.07; X.stroke();
  X.restore();
}
function dog(x, y, s, o = {}) {
  X.save(); X.translate(x, y); X.scale(s * (o.f || 1), s); X.globalAlpha *= (o.a ?? 1);
  X.strokeStyle = o.col || CREAM; X.lineWidth = 0.09; X.lineCap = 'round'; X.lineJoin = 'round'; X.shadowColor = 'rgba(255,240,210,0.3)'; X.shadowBlur = 10;
  const ly = o.lying;
  X.beginPath();
  if (ly) { X.moveTo(-0.7, -0.3); X.lineTo(0.6, -0.3); X.moveTo(-0.5, -0.3); X.lineTo(-0.1, -0.05); X.moveTo(0.4, -0.3); X.lineTo(0.85, -0.08); X.moveTo(-0.7, -0.3); X.lineTo(-1.1, -0.15); }
  else { X.moveTo(-0.7, -0.75); X.lineTo(0.6, -0.75); X.moveTo(-0.6, -0.75); X.lineTo(-0.7, 0); X.moveTo(-0.45, -0.75); X.lineTo(-0.4, 0); X.moveTo(0.45, -0.75); X.lineTo(0.4, 0); X.moveTo(0.58, -0.75); X.lineTo(0.7, 0); X.moveTo(-0.7, -0.75); X.lineTo(-1.1, -1.05); }
  X.stroke();
  const hx = ly ? 0.85 : 0.85, hy = ly ? -0.42 : -1.05;
  X.beginPath(); X.ellipse(hx, hy, 0.24, 0.18, 0, 0, 2 * PI); X.fillStyle = DARK; X.fill(); X.stroke();
  X.beginPath(); X.moveTo(hx + 0.2, hy + 0.03); X.lineTo(hx + 0.42, hy + 0.08); X.stroke();
  X.beginPath(); X.moveTo(hx - 0.1, hy - 0.15); X.lineTo(hx - 0.22, hy - 0.4); X.lineTo(hx + 0.02, hy - 0.17); X.stroke();
  if (ly) { X.beginPath(); X.moveTo(0.6, -0.3); X.lineTo(hx - 0.2, hy); X.stroke(); } else { X.beginPath(); X.moveTo(0.6, -0.75); X.lineTo(hx - 0.2, hy + 0.05); X.stroke(); }
  X.restore();
}

// ===== environments =====
function stars(cx, cy, n = 420, par = 0.15, t = 0) {
  for (let i = 0; i < n; i++) {
    const x = ((R(i) * 2600 - cx * par) % 2600 + 2600) % 2600 - 340, y = ((R(i + 999) * 1500 - cy * par) % 1500 + 1500) % 1500 - 210;
    const r = R(i + 77) < 0.92 ? 1.2 : 2.4, a = 0.35 + 0.65 * R(i + 5) * (0.75 + 0.25 * Math.sin(t * 2 + i));
    X.fillStyle = `rgba(220,230,255,${a})`; X.fillRect(x, y, r, r);
  }
}
function ship(x, y, s, t, fire = 0) {
  X.save(); X.translate(x, y); X.scale(s, s);
  poly([-520, -40, 380, -60, 520, -20, 540, 10, 380, 50, -520, 40, -560, 20, -560, -20], '#262b33');
  poly([-480, -90, -300, -90, -260, -40, -480, -40], '#1d2128'); poly([-480, 40, -300, 40, -260, 90, -480, 90], '#1d2128');
  poly([100, -60, 300, -95, 360, -58], '#1d2128');
  for (let i = 0; i < 14; i++) rect(-420 + i * 60, -8, 26, 6, i % 3 ? '#3a414c' : '#4a535f');
  line([-560, -20, 540, -20], '#4b5563', 2);
  const cw = fire > 0 ? `rgba(255,${Math.floor(120 - 60 * fire)},60,1)` : BLUE;
  rect(140, -30, 90, 22, cw); glow(185, -19, 160, fire > 0 ? 'rgba(255,90,40,0.55)' : 'rgba(108,195,255,0.45)');
  for (let i = 0; i < 3; i++) glow(-560, -10 + i * 15, 60 + 10 * Math.sin(t * 9 + i), 'rgba(140,190,255,0.6)');
  if (Math.sin(t * 3) > 0.6) circ(520, -10, 5, '#ff5555');
  X.restore();
}
function planet(x, y, r, t) {
  const g = X.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#b0562a'); g.addColorStop(0.6, '#5a2412'); g.addColorStop(1, '#170806');
  circ(x, y, r, g); X.save(); X.beginPath(); X.arc(x, y, r, 0, 2 * PI); X.clip();
  for (let i = 0; i < 9; i++) { X.globalAlpha = 0.18; X.fillStyle = i % 2 ? '#d07a40' : '#3a160c'; X.fillRect(x - r, y - r + i * r * 0.23 + 20 * Math.sin(t * 0.1 + i), 2 * r, r * 0.06); }
  X.restore(); X.globalAlpha = 1;
  glow(x, y, r * 1.15, 'rgba(255,120,60,0.12)');
}
function pod(x, y, s, col, o = {}) { // cryo tube
  X.save(); X.translate(x, y); X.scale(s, s); if (o.rot) X.rotate(o.rot);
  X.beginPath(); X.ellipse(0, 0, 170, 52, 0, 0, 2 * PI); X.fillStyle = '#1a1f26'; X.fill(); X.lineWidth = 6; X.strokeStyle = '#59636f'; X.stroke();
  X.beginPath(); X.ellipse(0, -6, 140, 34, 0, 0, 2 * PI); X.fillStyle = col; X.globalAlpha = o.glass ?? 0.32; X.fill(); X.globalAlpha = 1;
  X.strokeStyle = 'rgba(255,255,255,0.35)'; X.lineWidth = 2; X.stroke();
  X.restore();
}
function lamp(x, y, w, depth, col, t, flick = 0) {
  const f = flick ? (Math.sin(t * 47) > 0.92 - flick * 0.3 ? 0.35 : 1) : 1;
  X.save(); X.globalAlpha = 0.22 * f;
  const g = X.createLinearGradient(0, y, 0, y + depth); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  X.fillStyle = g; X.beginPath(); X.moveTo(x - w / 2, y); X.lineTo(x + w / 2, y); X.lineTo(x + w * 1.4, y + depth); X.lineTo(x - w * 1.4, y + depth); X.closePath(); X.fill();
  X.restore(); rect(x - w / 2, y - 8, w, 12, '#2a2d31'); X.globalAlpha = f; rect(x - w / 2 + 6, y, w - 12, 6, col); X.globalAlpha = 1;
  glow(x, y, w * 0.8, col.replace(')', ',0.35)').replace('rgb', 'rgba'), 1);
}
function floor(y, c1, c2) { const g = X.createLinearGradient(0, y, 0, y + 600); g.addColorStop(0, c1); g.addColorStop(1, c2); X.fillStyle = g; X.fillRect(-3000, y, 8000, 3000); }
function grating(y, c, cx = 0) { X.strokeStyle = c; X.lineWidth = 2; X.beginPath(); for (let i = -40; i < 80; i++) { const xx = i * 60 - (cx % 60); X.moveTo(xx, y); X.lineTo(xx + (xx - 960) * 0.6, y + 500); } for (let j = 0; j < 8; j++) { const yy = y + Math.pow(j / 8, 1.6) * 500; X.moveTo(-3000, yy); X.lineTo(5000, yy); } X.stroke(); }
function industrial(t, o = {}) { // rusty foundry backdrop with parallax layers; o.tint glow color
  const cx = o.cx || 0;
  fillBG(o.top || '#140805', o.bot || '#2a120a');
  if (o.glowAt !== false) glow(o.gx ?? 960, o.gy ?? 700, o.gr || 1100, o.glowc || 'rgba(255,110,40,0.35)');
  // far girders
  for (let l = 0; l < 3; l++) {
    const par = 0.3 + l * 0.35, c = ['#2b150d', '#1c0d08', '#0d0604'][l];
    for (let i = -3; i < 10; i++) {
      const x = i * (420 - l * 60) - cx * par + R(i + l * 50) * 120, w = 30 + l * 22 + R(i * 3 + l) * 20;
      rect(x, -800, w, 3000, c);
      if (R(i + l * 9) > 0.4) { X.strokeStyle = c; X.lineWidth = 6 + l * 3; X.beginPath(); X.moveTo(x, 100 + R(i) * 300); X.lineTo(x + 380 - l * 60, 400 + R(i + 1) * 200); X.stroke(); }
    }
    if (l === 1) { rect(-3000, 300 + (o.cy || 0) * 0.2, 9000, 14, c); for (let i = -60; i < 120; i++) rect(i * 40 - cx * par % 40, 250 + (o.cy || 0) * 0.2, 4, 50, c); rect(-3000, 250 + (o.cy || 0) * 0.2, 9000, 5, c); }
  }
  // pipes
  if (o.pipes !== false) { line([-3000, 160, 5000, 160], '#3a1d10', 26); line([-3000, 200, 5000, 200], '#24120a', 14); }
  // detail layer
  if (o.detail !== false) {
    const cy = (o.cy || 0) * 0.2;
    railing(250 + cy, -3000, 5000, '#1c0d08', cx, 0.65);
    for (let i = -2; i < 8; i++) { const x = i * 640 + 120 - cx * 0.65; valve(x + 200, 160, 26, '#4a2414', t * 0.1 + i); wallSign(x + 420, 470, ['FURNACE 3', 'BAY 161-B', 'NO ENTRY', 'LEAD WORKS', 'SECTOR 9'][((i % 5) + 5) % 5], '#b8956a', '#160b06', 18); blinker(x + 40, 420, t, '#ff3b2f', 0.7, i); hazard(x + 300, 620, 160, 22, 0.5); }
    cables(cx, t, '#0c0605', 6, -20);
    for (let i = 0; i < 3; i++) { const vx = ((i * 700 + 300 - cx * 0.65) % 2100 + 2100) % 2100 - 100; steam(vx, 230, t + i * 3, 30, 0.25); }
  }
  // light shafts
  if (o.shafts !== false) {
    X.save(); X.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const x = 200 + i * 380 - cx * 0.4; X.globalAlpha = 0.06 + 0.03 * Math.sin(t * 0.7 + i); X.fillStyle = o.shaftc || '#ff9a50'; X.beginPath(); X.moveTo(x, -200); X.lineTo(x + 70, -200); X.lineTo(x + 420, 1200); X.lineTo(x + 220, 1200); X.closePath(); X.fill(); }
    X.restore();
  }
}
function furnace(x, y, w, h, t, inten = 1) {
  // arched mouth
  X.save(); X.translate(x, y);
  rect(-w * 0.75, -h * 1.3, w * 1.5, h * 1.6, '#160a06');
  X.beginPath(); X.moveTo(-w / 2, 0); X.lineTo(-w / 2, -h * 0.6); X.quadraticCurveTo(0, -h * 1.15, w / 2, -h * 0.6); X.lineTo(w / 2, 0); X.closePath();
  const g = X.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, `rgba(255,${Math.floor(170 + 30 * Math.sin(t * 5))},60,${inten})`); g.addColorStop(1, `rgba(255,80,20,${inten})`);
  X.fillStyle = g; X.fill();
  X.lineWidth = 18; X.strokeStyle = '#2a140b'; X.stroke();
  X.restore();
  flames(x, y, w * 0.9, h * 0.9, t, 26, inten);
  glow(x, y - h * 0.4, w * 1.6, `rgba(255,120,40,${0.45 * inten})`);
}
function flames(x, y, w, h, t, n = 20, a = 1) {
  X.save(); X.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ph = (t * (0.9 + R(i) * 0.8) + R(i + 3)) % 1; const fx = x - w / 2 + R(i + 11) * w + Math.sin(t * 3 + i) * 12, fy = y - ph * h, r = (1 - ph) * (w / n) * 1.5 + 5;
    X.globalAlpha = (1 - ph) * 0.55 * a; X.fillStyle = ph < 0.3 ? '#fff0a0' : ph < 0.6 ? '#ff9a3c' : '#c8401a';
    X.beginPath(); X.moveTo(fx - r * 0.45, fy + r * 0.3); X.quadraticCurveTo(fx - r * 0.5, fy - r * 0.6, fx + Math.sin(t * 7 + i) * r * 0.3, fy - r * 1.6); X.quadraticCurveTo(fx + r * 0.5, fy - r * 0.6, fx + r * 0.45, fy + r * 0.3); X.closePath(); X.fill();
  }
  X.restore();
}
function particles(t, o) { // ash/embers/dust drifting
  const n = o.n || 60;
  X.save(); if (o.add) X.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = o.sp || 40, life = ((t * sp / 400 + R(i + 300)) % 1);
    const x = (R(i) * 2200 - 140) + Math.sin(t * 0.8 + i) * 30 + (o.dx || 0) * life * 400, y = (o.up ? 1200 - life * 1400 : -100 + life * 1300) + R(i + 7) * 50;
    X.globalAlpha = (o.a || 0.5) * Math.sin(life * PI); X.fillStyle = o.c || '#aaa'; const r = (o.r || 3) * (0.5 + R(i + 9));
    X.fillRect(x, y, r, r);
  }
  X.restore();
}
function sparks(x, y, t, n = 18, c = '#ffd27a', spread = 1) {
  X.save(); X.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const life = (t * 1.6 + R(i)) % 1, a = -PI / 2 + (R(i + 4) - 0.5) * 2.4 * spread, v = 300 + R(i + 8) * 400;
    const px = x + Math.cos(a) * v * life, py = y + Math.sin(a) * v * life + 600 * life * life;
    X.globalAlpha = 1 - life; line([px, py, px - Math.cos(a) * 14, py - Math.sin(a) * 14 - 10 * life], c, 3);
  }
  X.restore();
}
function steam(x, y, t, w, a = 1) {
  X.save();
  for (let i = 0; i < 40; i++) { const life = (t * 0.5 + R(i)) % 1; const px = x + (R(i + 1) - 0.5) * w + Math.sin(t + i) * 40, py = y - life * 700; const r = 60 + life * 260;
    X.globalAlpha = a * 0.16 * Math.sin(life * PI); X.fillStyle = '#e8ecef'; X.beginPath(); X.arc(px, py, r, 0, 2 * PI); X.fill(); }
  X.restore();
}
function tunnel(t, speed, o = {}) {
  fillBG(o.top || '#07090a', o.bot || '#101310');
  const vx = o.vx ?? 960, vy = o.vy ?? 520;
  for (let i = 14; i >= 0; i--) {
    const z = ((i - (t * speed) % 1) + 15) % 15 + 0.6, s = 1 / z * 4;
    const w = 900 * s, h = 620 * s;
    const sh = clamp(1.2 - z / 13);
    X.strokeStyle = `rgba(${o.rc || '120,140,120'},${0.55 * sh})`; X.lineWidth = Math.max(1, 26 * s);
    X.strokeRect(vx - w, vy - h, 2 * w, 2 * h);
    if (i % 3 === 0) { X.lineWidth = Math.max(1, 5 * s); X.beginPath(); X.moveTo(vx - w, vy - h * 0.6); X.lineTo(vx + w, vy - h * 0.6); X.stroke(); }
    if (o.lights && i % 4 === 0) glow(vx, vy - h * 0.95, 140 * s, `rgba(${o.lights},${0.6 * sh})`);
  }
  // perspective rails
  X.strokeStyle = `rgba(${o.rc || '120,140,120'},0.25)`; X.lineWidth = 3;
  X.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { X.moveTo(vx, vy); X.lineTo(vx + a * 3600, vy + b * 2480); } X.stroke();
  glow(vx, vy, 400, 'rgba(0,0,0,0.9)');
}
function monitor(x, y, w, h, lines, t, col = GREEN, o = {}) {
  X.save(); X.translate(x, y);
  rect(-w / 2 - 30, -h / 2 - 30, w + 60, h + 60, '#15171a'); rect(-w / 2, -h / 2, w, h, o.bg || '#031008');
  glow(0, 0, w * 0.7, col === GREEN ? 'rgba(80,255,140,0.12)' : 'rgba(255,90,60,0.12)');
  X.save(); X.beginPath(); X.rect(-w / 2, -h / 2, w, h); X.clip();
  let y0 = -h / 2 + 60;
  X.font = `600 ${o.fs || 38}px DejaVu Sans Mono`; X.textBaseline = 'middle'; X.fillStyle = col; X.shadowColor = col; X.shadowBlur = 12;
  let chars = t * (o.cps || 28);
  for (const ln of lines) {
    if (chars <= 0) break; const s = ln.slice(0, Math.floor(chars)); chars -= ln.length + 8;
    X.fillStyle = ln.startsWith('!') ? (o.alert || RED) : col; X.shadowColor = X.fillStyle;
    X.fillText(s.replace(/^!/, ''), -w / 2 + 40, y0); y0 += (o.fs || 38) * 1.55;
  }
  if (Math.sin(t * 8) > 0) rect(-w / 2 + 40, y0 - 18, 22, 36, col);
  X.shadowBlur = 0;
  for (let i = 0; i < h; i += 6) { X.globalAlpha = 0.18; rect(-w / 2, -h / 2 + i, w, 2, '#000'); }
  X.globalAlpha = 0.06 + 0.04 * Math.sin(t * 30); rect(-w / 2, -h / 2 + ((t * 200) % h), w, 40, col);
  X.restore(); X.restore();
}
function vhs(t, a = 1) { // interference bands
  X.save(); X.globalAlpha = 0.25 * a;
  for (let i = 0; i < 6; i++) { const y = ((t * 300 + R(i + Math.floor(t * 4)) * H) % H); rect(0, y, W, 4 + R(i) * 16, R(i + 2) > 0.5 ? '#fff' : '#0f0'); }
  X.restore();
}
function rifleIcon(x, y, s, c) { X.save(); X.translate(x, y); X.scale(s, s); poly([-160, -14, 120, -14, 150, -24, 160, -24, 160, 0, 30, 0, 20, 40, -5, 40, 5, 0, -90, 0, -130, 40, -170, 40, -150, -2], c); rect(40, -32, 70, 10, c); X.restore(); }
function flamerIcon(x, y, s, c) { X.save(); X.translate(x, y); X.scale(s, s); poly([-170, -20, 100, -20, 100, 10, -20, 10, -40, 50, -70, 50, -60, 10, -170, 10], c); rect(100, -10, 60, 12, c); circ(-100, 35, 26, c); X.restore(); }
function slash(x, y, r, a = 1) { X.save(); X.globalAlpha *= a; circ(x, y, r, null, RED, 16); line([x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7], RED, 16); X.restore(); }
function sheetBody(x, y, s) { X.save(); X.translate(x, y); X.scale(s, s); rect(-170, 0, 340, 18, '#3b4048'); line([-150, 18, -150, 110], '#3b4048', 10); line([150, 18, 150, 110], '#3b4048', 10);
  X.beginPath(); X.moveTo(-140, 0); X.quadraticCurveTo(-130, -42, -80, -40); X.quadraticCurveTo(0, -30, 60, -34); X.quadraticCurveTo(110, -60, 130, -30); X.lineTo(140, 0); X.closePath(); X.fillStyle = '#d8dde2'; X.fill(); X.restore(); }
function junk(t, cx, seed, y0, col) {
  for (let i = 0; i < 26; i++) {
    const x = i * 110 - 400 - cx + R(i + seed) * 60, h = 120 + R(i + seed + 1) * 260, w = 90 + R(i + seed + 2) * 160;
    X.save(); X.translate(x, y0); X.rotate((R(i + seed + 3) - 0.5) * 0.6);
    poly([-w / 2, 0, -w * 0.3, -h, w * 0.2, -h * 0.8, w / 2, -h * 0.3, w / 2, 0], col);
    X.strokeStyle = 'rgba(255,140,80,0.12)'; X.lineWidth = 3; X.strokeRect(-w * 0.3, -h * 0.7, w * 0.4, h * 0.3);
    X.restore();
  }
}
function chains(t, cx, col) { for (let i = 0; i < 9; i++) { const x = 120 + i * 230 - cx * 0.6, len = 300 + R(i) * 400, sw = Math.sin(t * 0.8 + i) * 10; X.strokeStyle = col; X.lineWidth = 5; X.setLineDash([16, 8]); X.beginPath(); X.moveTo(x, -50); X.lineTo(x + sw, len); X.stroke(); X.setLineDash([]); } }
function fan(x, y, r, t, spd = 1.2) {
  glow(x, y, r * 1.5, 'rgba(255,220,170,0.55)');
  circ(x, y, r * 1.05, null, '#1b1b1b', 30);
  X.save(); X.translate(x, y); X.rotate(t * spd);
  for (let i = 0; i < 5; i++) { X.rotate(2 * PI / 5); X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(r * 0.5, -r * 0.35, r * 0.98, -r * 0.18); X.lineTo(r * 0.98, r * 0.12); X.quadraticCurveTo(r * 0.4, r * 0.05, 0, 0); X.fillStyle = '#0a0a0a'; X.fill(); }
  circ(0, 0, r * 0.12, '#0a0a0a'); X.restore();
  X.strokeStyle = '#111'; X.lineWidth = 6; X.beginPath(); for (let i = -6; i <= 6; i++) { X.moveTo(x + i * r / 6, y - r); X.lineTo(x + i * r / 6, y + r); } X.stroke();
}
function bigHead(x, y, r, o = {}) { // close-up stick head
  X.save(); X.translate(x, y);
  X.shadowColor = 'rgba(255,240,210,0.3)'; X.shadowBlur = 20;
  circ(0, 0, r, DARK, o.col || CREAM, r * 0.06);
  line([0, r, 0, r * 2.2], o.col || CREAM, r * 0.06); X.shadowBlur = 0;
  const f = o.f || 1;
  if (o.eyes !== false) { circ(r * 0.35 * f, -r * 0.1, r * 0.07, o.eyec || CREAM); circ(r * 0.05 * f, -r * 0.1, r * 0.07, o.eyec || CREAM); }
  if (o.ex) { X.save(); X.strokeStyle = o.col || CREAM; X.lineCap = 'round'; X.lineWidth = r * 0.035; const by = -r * 0.32;
    if (o.ex === 'fear') { X.beginPath(); X.moveTo(-0.05 * r * f, by); X.lineTo(0.15 * r * f, by - r * 0.08); X.moveTo(0.25 * r * f, by - r * 0.08); X.lineTo(0.45 * r * f, by); X.stroke(); X.beginPath(); X.ellipse(0.22 * r * f, r * 0.42, r * 0.08, r * 0.12, 0, 0, 2 * PI); X.stroke(); }
    else if (o.ex === 'sad') { X.beginPath(); X.moveTo(-0.05 * r * f, by - r * 0.02); X.lineTo(0.12 * r * f, by - r * 0.1); X.moveTo(0.28 * r * f, by - r * 0.1); X.lineTo(0.45 * r * f, by - r * 0.02); X.stroke(); X.beginPath(); X.arc(0.22 * r * f, r * 0.55, r * 0.14, -PI * 0.85, -PI * 0.15); X.stroke(); }
    else if (o.ex === 'firm') { X.beginPath(); X.moveTo(-0.05 * r * f, by - r * 0.1); X.lineTo(0.14 * r * f, by); X.moveTo(0.26 * r * f, by); X.lineTo(0.45 * r * f, by - r * 0.1); X.stroke(); line([0.1 * r * f, r * 0.42, 0.36 * r * f, r * 0.42], o.col || CREAM, r * 0.035); }
    else { line([0.1 * r * f, r * 0.42, 0.34 * r * f, r * 0.42], o.col || CREAM, r * 0.03); }
    X.restore(); }
  if (o.mouth) line([r * 0.0 * f, r * 0.4, r * 0.4 * f, r * 0.38], o.col || CREAM, r * 0.03);
  if (o.bald) { X.beginPath(); X.arc(0, 0, r * 0.65, -PI * 0.8, -PI * 0.55); X.lineWidth = r * 0.025; X.strokeStyle = 'rgba(255,255,255,0.45)'; X.stroke(); }
  if (o.tear) { const ty = r * 0.0 + (o.tear % 1) * r * 0.5; circ(r * 0.35 * f, ty, r * 0.03, BLUE); }
  X.restore();
}

// ===== post =====
const grainC = []; for (let k = 0; k < 6; k++) { const g = document.createElement('canvas'); g.width = 270; g.height = 480; const gx = g.getContext('2d'); const id = gx.createImageData(270, 480); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gx.putImageData(id, 0, 0); grainC.push(g); }
const vigC = document.createElement('canvas'); vigC.width = W; vigC.height = H; { const v = vigC.getContext('2d'); const g = v.createRadialGradient(W / 2, H / 2, W * 0.55, W / 2, H / 2, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)'); v.fillStyle = g; v.fillRect(0, 0, W, H); }
function post(t, o = {}) {
  X.setTransform(1, 0, 0, 1, 0, 0);
  if (o.tint) { X.save(); X.globalCompositeOperation = 'soft-light'; X.globalAlpha = o.tintA ?? 0.5; rect(0, 0, W, H, o.tint); X.restore(); }
  if (o.desat) { X.save(); X.globalCompositeOperation = 'saturation'; X.globalAlpha = o.desat; rect(0, 0, W, H, '#808080'); X.restore(); }
  if (o.dust !== false) dust(t, o.dustc || '255,230,200', o.dustA ?? 0.3);
  X.drawImage(vigC, 0, 0);
  X.save(); X.globalCompositeOperation = 'overlay'; X.globalAlpha = 0.16; X.imageSmoothingEnabled = false; X.drawImage(grainC[Math.floor(t * 24) % 6], 0, 0, W, H); X.restore();
  // film scratches
  if (o.flash) { X.globalAlpha = clamp(o.flash); rect(0, 0, W, H, o.flashc || '#fff'); X.globalAlpha = 1; }
}

// ===== creatures (ink-outline cartoon, facing +x; origin = feet) =====
const INK = '#1b0f0a';
function inkFill(fill, lw = 7) { X.fillStyle = fill; X.fill(); X.strokeStyle = INK; X.lineWidth = lw; X.lineJoin = 'round'; X.lineCap = 'round'; X.stroke(); }
function ell(cx, cy, rx, ry, rot, fill, lw) { X.beginPath(); X.ellipse(cx, cy, rx, ry, rot || 0, 0, 2 * PI); inkFill(fill, lw); }
function limb(pts, w, fill) { X.beginPath(); X.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) X.lineTo(pts[i], pts[i + 1]); X.strokeStyle = INK; X.lineWidth = w + 12; X.lineCap = 'round'; X.lineJoin = 'round'; X.stroke(); X.strokeStyle = fill; X.lineWidth = w; X.stroke(); }
function dragon(x, y, s, f, t, o = {}) {
  const breathe = o.breathe || 0, hurt = o.hurt || 0, flap = Math.sin(t * 7) * (o.flap ?? 0.18), bob = Math.sin(t * 3) * 6;
  X.save(); X.translate(x + (hurt ? Math.sin(t * 60) * 10 * hurt : 0), y); X.scale(s * f, s); if (o.rot) X.rotate(o.rot); X.globalAlpha *= (o.a ?? 1);
  const OR = '#f0862a', OR2 = '#d96a1a', CR = '#f6d98a';
  // far wing
  X.save(); X.translate(-30, -330 + bob); X.rotate(-0.62 - flap);
  X.beginPath(); X.moveTo(0, 0); X.lineTo(-90, -250); X.lineTo(-20, -190); X.lineTo(-10, -300); X.lineTo(60, -190); X.lineTo(90, -250); X.lineTo(110, -90); X.closePath(); inkFill('#22706a', 6); X.restore();
  // tail + flame
  const tw = Math.sin(t * 4) * 14;
  limb([-90, -150 + bob, -200, -90, -300, -80 + tw, -370, -150 + tw], 52, OR);
  flames(-380, -140 + tw, 90, 150, t, 12, 1); glow(-380, -190 + tw, 200, 'rgba(255,160,60,0.45)');
  // legs
  limb([-50, -120, -70, -50, -50, 0], 66, OR2); limb([60, -120, 80, -50, 110, 0], 66, OR2);
  for (const cx of [-45, 115]) { for (let k = -1; k <= 1; k++) { X.beginPath(); X.moveTo(cx + k * 22, -4); X.lineTo(cx + k * 22 + 10, 12); X.lineTo(cx + k * 22 + 20, -4); X.closePath(); inkFill('#fff6dd', 4); } }
  // body + belly
  ell(0, -215 + bob, 135, 175, -0.12, OR, 8); ell(35, -195 + bob, 80, 135, -0.12, CR, 5);
  X.strokeStyle = 'rgba(120,70,20,0.45)'; X.lineWidth = 4; for (let k = 0; k < 6; k++) { X.beginPath(); X.moveTo(-25, -290 + k * 40 + bob); X.quadraticCurveTo(35, -270 + k * 40 + bob, 90, -290 + k * 40 + bob); X.stroke(); }
  // arm
  const ar = o.arm ?? 0; limb([75, -290 + bob, 140 + ar * 40, -250 - ar * 70 + bob, 185 + ar * 50, -270 - ar * 110 + bob], 34, OR);
  for (let k = -1; k <= 1; k++) { const hx2 = 185 + ar * 50, hy2 = -270 - ar * 110 + bob; X.beginPath(); X.moveTo(hx2, hy2 + k * 10); X.lineTo(hx2 + 28, hy2 + k * 16 - 4); X.lineTo(hx2 + 4, hy2 + k * 10 + 10); X.closePath(); inkFill(o.glowClaw ? '#ffffff' : '#fff6dd', 4); }
  if (o.glowClaw) glow(190 + ar * 50, -270 - ar * 110 + bob, 150, 'rgba(255,255,255,0.7)');
  // neck + head
  limb([60, -350 + bob, 95, -420 + bob, 110, -470 + bob], 70, OR);
  X.save(); X.translate(120, -490 + bob); X.rotate(breathe ? -0.28 : -0.05 + Math.sin(t * 2) * 0.03);
  X.beginPath(); X.moveTo(-60, 10); X.quadraticCurveTo(-65, -60, 10, -70); X.quadraticCurveTo(95, -75, 125, -20); X.quadraticCurveTo(130, 20, 95, 28); X.lineTo(-40, 40); X.closePath(); inkFill(OR, 7);
  X.beginPath(); X.moveTo(-50, -45); X.lineTo(-120, -90); X.lineTo(-70, -10); X.closePath(); inkFill(OR2, 5);   // back horn
  X.beginPath(); X.moveTo(-20, -62); X.lineTo(-90, -130); X.lineTo(-45, -40); X.closePath(); inkFill(OR2, 5);
  // jaw
  const jaw = breathe ? 38 : 4 + Math.sin(t * 2.5) * 2;
  X.save(); X.translate(-20, 30); X.rotate(jaw / 100); X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(70, 18, 125, -2); X.lineTo(115, 24); X.quadraticCurveTo(50, 34, 0, 22); X.closePath(); inkFill(OR2, 6);
  if (breathe) { X.beginPath(); X.ellipse(60, 4, 52, 14, 0.1, 0, 2 * PI); X.fillStyle = '#7a1018'; X.fill(); } X.restore();
  if (breathe) { X.beginPath(); X.ellipse(70, 22, 50, 12, 0, 0, 2 * PI); X.fillStyle = 'rgba(80,10,20,0.9)'; X.fill(); for (let k = 0; k < 4; k++) { X.beginPath(); X.moveTo(35 + k * 22, 12); X.lineTo(42 + k * 22, 30); X.lineTo(49 + k * 22, 12); X.fillStyle = '#fff'; X.fill(); } }
  circ(40, -30, 13, '#fff', INK, 4); circ(44, -28, 6, hurt > 0.5 ? '#c22' : '#2a8a9a'); circ(46, -29, 2.5, '#000');
  X.beginPath(); X.moveTo(15, -52); X.lineTo(70, -44); X.strokeStyle = INK; X.lineWidth = 7; X.stroke();
  X.restore();
  // near wing
  X.save(); X.translate(10, -340 + bob); X.rotate(-0.98 - flap * 1.2);
  X.beginPath(); X.moveTo(0, 0); X.lineTo(-120, -300); X.lineTo(-30, -230); X.lineTo(-10, -350); X.lineTo(70, -230); X.lineTo(120, -300); X.lineTo(140, -100); X.closePath(); inkFill('#2f9c92', 7);
  X.strokeStyle = 'rgba(10,50,48,0.7)'; X.lineWidth = 5; X.beginPath(); X.moveTo(0, 0); X.lineTo(-30, -230); X.moveTo(0, 0); X.lineTo(70, -230); X.moveTo(0, 0); X.lineTo(-120, -300); X.moveTo(0, 0); X.lineTo(120, -300); X.stroke(); X.restore();
  X.restore();
}
function dragonMouth(x, y, s, f, breathe) { return [x + f * s * 205, y - s * (breathe ? 470 : 480)]; }
function turtle(x, y, s, f, t, o = {}) {
  const hurt = o.hurt || 0, bob = Math.sin(t * 3 + 1) * 5, BL = '#5fa3d9', BL2 = '#4283bd', CR = '#f1e2a8';
  X.save(); X.translate(x + (hurt ? Math.sin(t * 60) * 10 * hurt : 0), y); X.scale(s * f, s); if (o.rot) X.rotate(o.rot); X.globalAlpha *= (o.a ?? 1);
  // tail
  X.beginPath(); X.moveTo(-120, -90); X.quadraticCurveTo(-190, -70, -200, -30); X.quadraticCurveTo(-140, -50, -110, -50); X.closePath(); inkFill(BL2, 6);
  // legs
  limb([-60, -100, -70, -40, -70, 0], 78, BL2); limb([70, -100, 80, -40, 90, 0], 78, BL2);
  for (const cx of [-72, 92]) for (let k = -1; k <= 1; k++) { X.beginPath(); X.moveTo(cx + k * 24 - 8, -2); X.lineTo(cx + k * 24, 14); X.lineTo(cx + k * 24 + 8, -2); X.closePath(); inkFill('#fff', 4); }
  // shell (back) + body
  ell(-35, -215 + bob, 150, 165, -0.1, '#8c5a2a', 8); ell(-35, -215 + bob, 120, 135, -0.1, '#a56c34', 5);
  X.strokeStyle = 'rgba(60,30,10,0.6)'; X.lineWidth = 5; X.beginPath(); X.moveTo(-150, -220 + bob); X.lineTo(70, -220 + bob); X.moveTo(-35, -340 + bob); X.lineTo(-35, -90 + bob); X.stroke();
  ell(45, -205 + bob, 105, 150, 0.05, BL, 8); ell(50, -190 + bob, 80, 125, 0.05, CR, 5);
  X.strokeStyle = 'rgba(150,120,50,0.55)'; X.lineWidth = 4; for (let k = 0; k < 5; k++) { X.beginPath(); X.moveTo(-5, -290 + k * 45 + bob); X.lineTo(105, -290 + k * 45 + bob); X.stroke(); }
  // arms
  const ar = o.arm ?? 0; limb([95, -290 + bob, 160 + ar * 30, -250 + bob, 205 + ar * 40, -285 - ar * 40 + bob], 40, BL);
  for (let k = -1; k <= 1; k++) { X.beginPath(); X.moveTo(205 + ar * 40, -285 - ar * 40 + k * 10 + bob); X.lineTo(232 + ar * 40, -285 - ar * 40 + k * 14 + bob); X.lineTo(210 + ar * 40, -275 - ar * 40 + k * 10 + bob); X.closePath(); inkFill('#fff', 4); }
  // head
  X.save(); X.translate(115, -400 + bob);
  X.beginPath(); X.moveTo(-70, 20); X.quadraticCurveTo(-75, -70, 10, -78); X.quadraticCurveTo(95, -80, 120, -25); X.quadraticCurveTo(128, 25, 90, 35); X.lineTo(-40, 50); X.closePath(); inkFill(BL, 7);
  const open = o.open ? 30 : 6;
  X.beginPath(); X.moveTo(-10, 28); X.quadraticCurveTo(50, 28 + open, 110, 18 + open * 0.4); X.lineTo(100, 38 + open); X.quadraticCurveTo(40, 52 + open, -20, 44); X.closePath(); inkFill(o.open ? '#e8707e' : BL2, 5);
  if (o.open) { for (let k = 0; k < 3; k++) { X.beginPath(); X.moveTo(40 + k * 22, 26); X.lineTo(47 + k * 22, 42); X.lineTo(54 + k * 22, 26); X.fillStyle = '#fff'; X.fill(); } }
  circ(45, -28, 13, '#fff', INK, 4); circ(49, -26, 6, '#3a1a10'); circ(51, -27, 2.5, '#fff');
  X.beginPath(); X.moveTo(18, -50); X.lineTo(78, -34); X.strokeStyle = INK; X.lineWidth = 8; X.stroke();
  X.restore();
  // cannons
  for (const [cx, cy, a] of [[-30, -335, -0.55], [-110, -320, -0.7]]) { X.save(); X.translate(cx, cy + bob); X.rotate(a); X.beginPath(); X.rect(0, -22, 130, 44); inkFill('#9aa3ad', 6); X.beginPath(); X.rect(118, -28, 26, 56); inkFill('#e9eef2', 5); X.beginPath(); X.rect(8, -28, 14, 56); inkFill('#6c747d', 4); X.restore(); }
  X.restore();
}
function turtleMuzzle(x, y, s, f, i) { const [cx, cy, a] = i ? [-110, -320, -0.7] : [-30, -335, -0.55]; return [x + f * s * (cx + Math.cos(a) * 144), y + s * (cy + Math.sin(a) * 144)]; }
function ball(x, y, r, spin = 0) { X.save(); X.translate(x, y); X.rotate(spin); X.beginPath(); X.arc(0, 0, r, PI, 2 * PI); X.closePath(); X.fillStyle = '#e53030'; X.fill(); X.beginPath(); X.arc(0, 0, r, 0, PI); X.closePath(); X.fillStyle = '#f4f4f4'; X.fill(); X.beginPath(); X.arc(0, 0, r, 0, 2 * PI); X.strokeStyle = INK; X.lineWidth = r * 0.14; X.stroke(); X.beginPath(); X.moveTo(-r, 0); X.lineTo(r, 0); X.stroke(); circ(0, 0, r * 0.3, '#f4f4f4', INK, r * 0.12); X.restore(); }
function flameStream(x0, y0, x1, y1, t, u, o = {}) { // flame jet reaching fraction u along path
  const n = 46; X.save(); X.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const life = (t * 1.8 + i / n) % 1, q = life * u; const px = lerp(x0, x1, q) + Math.sin(t * 9 + i) * 16 * q, py = lerp(y0, y1, q) + Math.cos(t * 7 + i * 2) * 14 * q - 40 * Math.sin(q * PI) * (o.arc ?? 1);
    const sz = (34 + 110 * q) * (1 - life * 0.35); X.globalAlpha = (0.7 - life * 0.35) * (o.a ?? 1); X.fillStyle = life < 0.35 ? '#fff4b0' : life < 0.7 ? '#ffa030' : '#d84a1a';
    X.save(); X.translate(px, py); X.rotate(Math.atan2(y1 - y0, x1 - x0) + PI / 2); X.beginPath(); X.moveTo(-sz * 0.5, 0); X.quadraticCurveTo(-sz * 0.5, -sz, 0, -sz * 1.8); X.quadraticCurveTo(sz * 0.5, -sz, sz * 0.5, 0); X.closePath(); X.fill(); X.restore(); }
  X.restore(); }
function waterStream(x0, y0, x1, y1, t, u, o = {}) { // thick jet + droplets
  const ex = lerp(x0, x1, u), ey = lerp(y0, y1, u), mx = (x0 + ex) / 2, my = Math.min(y0, ey) - 70 * (o.arc ?? 1);
  X.save(); X.lineCap = 'round';
  for (const [w, c, a] of [[96, 'rgba(70,150,230,0.85)', 1], [60, 'rgba(150,210,255,0.95)', 1], [24, 'rgba(255,255,255,0.95)', 1]]) { X.globalAlpha = a * (o.a ?? 1); X.strokeStyle = c; X.lineWidth = w * (0.8 + 0.2 * Math.sin(t * 20)); X.beginPath(); X.moveTo(x0, y0); X.quadraticCurveTo(mx, my, ex, ey); X.stroke(); }
  X.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const life = (t * 2 + R(i)) % 1, q = clamp(life * 1.1) * u; const bx = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * mx + q * q * ex + (R(i + 3) - 0.5) * 90 * q, by = (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * my + q * q * ey + (R(i + 5) - 0.5) * 90 * q + 60 * life * life; X.globalAlpha = (1 - life) * (o.a ?? 1); circ(bx, by, 3 + R(i + 7) * 7, '#e8f6ff'); }
  X.restore(); }
function hpBox(x, y, name, lv, hp, o = {}) { // original-style battle HUD
  const w = 460, h = 130, a = o.a ?? 1; X.save(); X.globalAlpha *= a; X.translate(x, y);
  X.fillStyle = 'rgba(14,14,18,0.82)'; X.beginPath(); X.roundRect(0, 0, w, h, 22); X.fill(); X.strokeStyle = o.c || CREAM; X.lineWidth = 4; X.stroke();
  txt(name, 28, 36, 38, o.c || CREAM, { al: 'left', w: 900, ls: 2 }); txt('Lv' + lv, w - 28, 36, 30, '#bbb', { al: 'right', w: 700 });
  X.font = '900 24px Inter'; X.fillStyle = '#ffcf40'; X.textBaseline = 'middle'; X.fillText('HP', 28, 88);
  X.fillStyle = '#2a2a30'; X.beginPath(); X.roundRect(78, 74, 350, 28, 14); X.fill();
  const hv = clamp(hp), col = hv > 0.5 ? '#43d96a' : hv > 0.2 ? '#f2c230' : (Math.sin((o.t || 0) * 12) > 0 ? '#ff3b2f' : '#b02a22');
  X.fillStyle = col; X.beginPath(); X.roundRect(78, 74, Math.max(10, 350 * hv), 28, 14); X.fill();
  X.fillStyle = 'rgba(255,255,255,0.25)'; X.beginPath(); X.roundRect(84, 78, Math.max(4, 338 * hv), 8, 4); X.fill();
  X.restore(); }
function ground(y, c1, c2) { const g = X.createLinearGradient(0, y, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); X.fillStyle = g; X.fillRect(0, y, W, H - y); }
