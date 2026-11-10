const A = j => TIM.sents[j].start;
const SPL = [[600, 0], [520, 380], [585, 760], [500, 1180], [560, 1560], [520, 1920]];
const REDC = '#ff5240', BLUEC = '#4fb0ff';
function splitPath(side) { X.beginPath(); if (side < 0) { X.moveTo(0, 0); for (const p of SPL) X.lineTo(p[0], p[1]); X.lineTo(0, 1920); } else { X.moveTo(1080, 0); for (const p of SPL) X.lineTo(p[0], p[1]); X.lineTo(1080, 1920); } X.closePath(); }
function splitBG(t, o = {}) {
  const dim = o.dim || 0;
  X.save(); splitPath(-1); X.clip();
  let g = X.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#6f1a12'); g.addColorStop(0.45, '#cf4f1c'); g.addColorStop(0.62, '#7a2410'); g.addColorStop(1, '#2a0b07'); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
  for (let i = 0; i < 16; i++) { glow(R(i) * 700 + Math.sin(t * 0.3 + i) * 30, R(i + 9) * 1500, 220 + R(i + 3) * 200, i % 3 ? 'rgba(255,140,50,0.22)' : 'rgba(60,10,5,0.35)'); }
  X.restore();
  X.save(); splitPath(1); X.clip();
  g = X.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#0f2f6b'); g.addColorStop(0.45, '#2c88c6'); g.addColorStop(0.62, '#134a7a'); g.addColorStop(1, '#06182c'); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
  for (let i = 0; i < 16; i++) { glow(1080 - R(i + 20) * 700 + Math.sin(t * 0.3 + i) * 30, R(i + 29) * 1500, 220 + R(i + 23) * 200, i % 3 ? 'rgba(90,200,255,0.22)' : 'rgba(5,20,60,0.35)'); }
  X.restore();
  if (o.ground) { for (const side of [-1, 1]) { X.save(); splitPath(side); X.clip(); const gg = X.createLinearGradient(0, 1000, 0, 1920); if (side < 0) { gg.addColorStop(0, '#3a1209'); gg.addColorStop(1, '#14060a'); } else { gg.addColorStop(0, '#0d2d4a'); gg.addColorStop(1, '#04121f'); } X.fillStyle = gg; X.fillRect(0, 1000, 1080, 920); X.strokeStyle = side < 0 ? 'rgba(255,150,70,0.25)' : 'rgba(120,210,255,0.25)'; X.lineWidth = 3; X.beginPath(); X.moveTo(0, 1000); X.lineTo(1080, 1000); for (let k = 1; k < 7; k++) { const yy = 1000 + Math.pow(k / 7, 1.7) * 900; X.moveTo(0, yy); X.lineTo(1080, yy); } for (let k = -6; k < 12; k++) { X.moveTo(540 + k * 80, 1000); X.lineTo(540 + k * 260, 1920); } X.stroke(); X.restore(); } }
  particles(t, { n: 40, c: '#ffb050', a: 0.9, up: true, sp: 70, r: 4, add: true });
  // left embers only visually: mask by drawing again clipped
  if (dim) { X.globalAlpha = dim; rect(0, 0, 1080, 1920, '#000'); X.globalAlpha = 1; }
  // cracked divider
  const flick = 0.75 + 0.25 * Math.sin(t * 25);
  X.save(); X.globalAlpha = flick; line(SPL.flat(), '#fff4cf', 9); line(SPL.flat(), 'rgba(255,255,255,0.9)', 3); glow(560, 960, 380, 'rgba(255,240,200,0.35)'); X.restore();
}
function poster(a = 1) { X.save(); X.globalAlpha = a; X.setTransform(1, 0, 0, 1, 0, 0); X.strokeStyle = '#efe4cf'; X.lineWidth = 26; X.strokeRect(0, 0, W, H); X.restore(); }
function shadow(x, y, w, a = 0.5) { X.save(); X.globalAlpha = a; X.beginPath(); X.ellipse(x, y + 6, w, w * 0.14, 0, 0, 2 * PI); X.fillStyle = '#000'; X.fill(); X.restore(); }
function bannerSlam(s, x, y, size, c, a, rot = -0.05) { if (a <= 0) return; X.save(); X.translate(x, y); X.rotate(rot); const k = 1 + 0.5 * (1 - eo(prog(a, 0, 0.5))); X.scale(k, k); txt(s, 0, 0, size, c, { w: 900, ls: 4, stroke: INK, sw: size * 0.22, a: Math.min(1, a * 3) }); X.restore(); }
function iconFlame(x, y, s, c = '#ff7a2a') { X.save(); X.translate(x, y); X.scale(s, s); X.beginPath(); X.moveTo(0, -60); X.quadraticCurveTo(50, -10, 36, 30); X.quadraticCurveTo(20, 60, 0, 58); X.quadraticCurveTo(-30, 55, -38, 25); X.quadraticCurveTo(-40, -5, -12, -25); X.quadraticCurveTo(-10, -5, 6, -10); X.quadraticCurveTo(14, -35, 0, -60); X.closePath(); inkFill(c, 6); X.restore(); }
function iconDrop(x, y, s, c = '#3aa0ff') { X.save(); X.translate(x, y); X.scale(s, s); X.beginPath(); X.moveTo(0, -62); X.quadraticCurveTo(48, 6, 40, 30); X.quadraticCurveTo(30, 62, 0, 62); X.quadraticCurveTo(-30, 62, -40, 30); X.quadraticCurveTo(-48, 6, 0, -62); X.closePath(); inkFill(c, 6); X.restore(); }
function partyBalls(x, y, left, a = 1) { X.save(); X.globalAlpha *= a; for (let i = 0; i < 6; i++) { if (i === 0) ball(x + i * 44, y, 16); else { circ(x + i * 44, y, 16, null, 'rgba(255,255,255,0.35)', 3); } } X.restore(); }
// trainers
function redTrainer(x, y, h, o = {}) { const r = stick(Object.assign({ x, y, h, f: 1, col: CREAM, shirt: '#d8322a', vest: '#f2f2f2', pants: '#4f86b8', pack: '#e6b52a', ex: 'angry', lw: h * 0.028 }, o)); const hr = 0.1 * h; X.save(); X.translate(r.hx, r.hy); X.beginPath(); X.arc(0, -hr * 0.1, hr * 1.08, PI * 1.02, PI * 1.98); X.closePath(); inkFill('#d8322a', 5); X.beginPath(); X.moveTo(hr * 0.7, -hr * 0.28); X.quadraticCurveTo(hr * 1.9, -hr * 0.2, hr * 1.7, hr * 0.0); X.lineTo(hr * 0.5, -hr * 0.1); X.closePath(); inkFill('#f2f2f2', 4); circ(hr * 0.1, -hr * 0.78, hr * 0.28, '#f2f2f2', INK, 3); X.restore(); return r; }
function blueTrainer(x, y, h, o = {}) { const r = stick(Object.assign({ x, y, h, f: -1, col: CREAM, shirt: '#4a4fb8', pants: '#4a3a2c', ex: 'smile', lw: h * 0.028 }, o)); const hr = 0.1 * h; X.save(); X.translate(r.hx, r.hy); X.beginPath(); const sp = [[-1.0, -0.3], [-1.3, -1.0], [-0.55, -0.75], [-0.4, -1.55], [0.05, -0.85], [0.45, -1.45], [0.6, -0.7], [1.15, -1.0], [1.0, -0.2], [0.85, 0.15]]; X.moveTo(-hr * 1.0, hr * 0.1); for (const p of sp) X.lineTo(p[0] * hr, p[1] * hr); X.lineTo(hr * 1.0, hr * 0.1); X.closePath(); inkFill('#b8732e', 5); X.restore(); return r; }
function throwPose(lt, dur) { const k = prog(lt, 0, dur); return k < 0.5 ? { ra: lerp(1.6, 3.0, k * 2), re: -0.2 } : { ra: lerp(3.0, 1.3, (k - 0.5) * 2), re: 0.1 }; }
function chunks(se) { const words = se.text.split(' '), out = []; let cur = []; for (const w of words) { cur.push(w); const len = cur.join(' ').length; if (len >= 22 || (len >= 14 && /[,.?!…]$/.test(w))) { out.push(cur.join(' ')); cur = []; } } if (cur.length) { if (cur.join(' ').length < 9 && out.length) out[out.length - 1] += ' ' + cur.join(' '); else out.push(cur.join(' ')); } const tot = out.reduce((a, s) => a + s.length, 0); let t = se.start; const d = se.end - se.start; return out.map(s => { const st = t; t += d * s.length / tot; return { s, st, en: t }; }); }
function captions(t) { for (const se of TIM.sents) { if (t < se.start - 0.05 || t > se.end + 0.35) continue; for (const c of chunks(se)) if (t >= c.st - 0.05 && t < c.en + (c.en >= se.end - 0.01 ? 0.35 : 0)) { let fs = 66; X.save(); X.font = `900 ${fs}px Inter`; let w = X.measureText(c.s).width; if (w > 980) { fs = Math.floor(66 * 980 / w); } X.restore(); const pop = 1 + 0.12 * (1 - eo(prog(t - c.st, 0, 0.12))); X.save(); X.translate(540, 1500); X.scale(pop, pop); txt(c.s, 0, 0, fs, '#fff', { w: 900, stroke: 'rgba(0,0,0,0.95)', sw: 14 }); X.restore(); return; } } }
function brandTag(a = 1) { txt('RG BRICK&STICKVERSE', 540, 74, 30, CREAM, { w: 800, ls: 7, a: a * 0.9, stroke: 'rgba(0,0,0,0.7)', sw: 8 }); }
function lightning(t, seed, x0, y0, x1, y1, c = '#fff') { const n = 9; const pts = [x0, y0]; for (let i = 1; i < n; i++) { const u = i / n; pts.push(lerp(x0, x1, u) + (R(seed + i + Math.floor(t * 20)) - 0.5) * 90, lerp(y0, y1, u) + (R(seed + i + 40 + Math.floor(t * 20)) - 0.5) * 60); } pts.push(x1, y1); X.save(); X.globalCompositeOperation = 'lighter'; line(pts, c, 14); line(pts, '#fff', 5); X.restore(); }


function speech(x, y, s, a = 1, size = 44) { if (a <= 0) return; X.save(); X.globalAlpha *= a; X.font = `900 ${size}px Inter`; const w = X.measureText(s).width + 60, h = size + 50; X.beginPath(); X.roundRect(x - w / 2, y - h / 2, w, h, 28); X.fillStyle = '#fff'; X.fill(); X.strokeStyle = INK; X.lineWidth = 6; X.stroke(); X.beginPath(); X.moveTo(x - 24, y + h / 2 - 3); X.lineTo(x - 56, y + h / 2 + 42); X.lineTo(x + 12, y + h / 2 - 3); X.closePath(); X.fillStyle = '#fff'; X.fill(); X.stroke(); X.beginPath(); X.moveTo(x - 20, y + h / 2 - 3); X.lineTo(x + 8, y + h / 2 - 3); X.strokeStyle = '#fff'; X.lineWidth = 8; X.stroke(); txt(s, x, y + 3, size, INK, { w: 900 }); X.restore(); }
function star4(x, y, r, a = 1, rot = 0) { X.save(); X.translate(x, y); X.rotate(rot); X.globalAlpha *= a; X.globalCompositeOperation = 'lighter'; glow(0, 0, r * 2.2, 'rgba(255,255,255,0.9)'); X.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.22 : r; const ang = i * PI / 4; X.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } X.closePath(); X.fillStyle = '#fff'; X.fill(); X.restore(); }

function moveTag(t, x, y, col, a) { txt(t, x, y, 56, col, { w: 900, ls: 3, stroke: INK, sw: 14, a }); }
function ninjaHead(cx, cy, r, col, a = 1) { X.save(); X.translate(cx, cy); X.globalAlpha *= a; circ(0, 0, r, '#14141c', CREAM, r * 0.1); X.beginPath(); X.arc(0, 0, r * 1.0, 0.05 * PI, 0.95 * PI); X.closePath(); X.fillStyle = col; X.fill(); X.strokeStyle = INK; X.lineWidth = r * 0.06; X.stroke(); X.strokeStyle = '#f4f4f4'; X.lineWidth = r * 0.28; X.beginPath(); X.moveTo(-r, -r * 0.6); X.lineTo(r, -r * 0.6); X.stroke(); circ(-r * 0.32, -r * 0.1, r * 0.1, '#fff'); circ(r * 0.32, -r * 0.1, r * 0.1, '#fff'); X.strokeStyle = '#fff'; X.lineWidth = r * 0.07; X.beginPath(); X.moveTo(-r * 0.55, -r * 0.3); X.lineTo(-r * 0.12, -r * 0.2); X.moveTo(r * 0.55, -r * 0.3); X.lineTo(r * 0.12, -r * 0.2); X.stroke(); X.restore(); }


const G = 1350, SX = 300, ZX = 780;
function hood(r, h, col) { const hr = 0.1 * h; X.save(); X.translate(r.hx, r.hy); X.rotate(r.rot || 0); X.beginPath(); X.arc(0, 0, hr * 1.06, PI * 1.13, PI * 1.87); X.closePath(); inkFill(col, 4); for (const ex of [-0.38, 0.38]) { circ(ex * hr, -hr * 0.12, hr * 0.13, '#fff'); line([ex * hr - hr * 0.22 * Math.sign(ex), -hr * 0.36, ex * hr + hr * 0.16 * Math.sign(ex) * -1, -hr * 0.24], INK, hr * 0.1); } X.restore(); }
const scorp = (x, y, h, o = {}) => { const r = ninja(x, y, h, '#f2c230', Object.assign({ dark: '#15151a', band: '#f2c230', bandc: '#f2c230', f: 1 }, o)); hood(r, h, '#15151a'); return r; };
const subz = (x, y, h, o = {}) => { const r = subZero(x, y, h, Object.assign({ f: -1, band: '#2f6fd8', bandc: '#2f6fd8' }, o)); hood(r, h, '#15151a'); return r; };
function templeBG(t, o = {}) {
  let g = X.createLinearGradient(0, 0, 0, 1160); g.addColorStop(0, '#12082a'); g.addColorStop(0.6, '#3a1c66'); g.addColorStop(1, '#6a3a8a'); X.fillStyle = g; X.fillRect(0, 0, W, 1160);
  for (let i = 0; i < 40; i++) { X.globalAlpha = 0.5 * R(i + 3) * (0.6 + 0.4 * Math.sin(t * 2 + i)); rect(R(i) * W, R(i + 2) * 500, 3, 3, '#fff'); } X.globalAlpha = 1;
  if (o.moon !== false) { glow(790, 560, 420, 'rgba(210,190,255,0.45)'); circ(790, 560, 150, '#e6dcff'); circ(750, 520, 34, 'rgba(160,140,210,0.5)'); circ(840, 610, 22, 'rgba(160,140,210,0.5)'); }
  for (let i = 0; i < 6; i++) { const cx = (((i * 300 - t * 14) % 1800) + 1800) % 1800 - 300; X.globalAlpha = 0.35; for (const [dx, r] of [[0, 70], [80, 90], [170, 64]]) circ(cx + dx, 380 + R(i) * 300, r, '#2a1450'); X.globalAlpha = 1; }
  if (o.storm && Math.sin(t * 9) > 0.55) { lightning(t, 21, 300 + R(Math.floor(t * 3)) * 400, 0, 380 + R(Math.floor(t * 3) + 1) * 300, 700, '#d8c0ff'); X.globalAlpha = 0.12; rect(0, 0, W, H, '#c8a8ff'); X.globalAlpha = 1; }
  for (let i = 0; i < 14; i++) { const x = i * 84 - 20, hh = 160 + R(i + 40) * 300; poly([x, 1160, x, 1160 - hh, x + 22, 1160 - hh - 70, x + 44, 1160 - hh, x + 44, 1160], '#1a0c30'); }
  for (const px of [90, 990]) { rect(px - 62, 420, 124, 760, '#241238'); for (let k = 0; k < 9; k++) line([px - 62, 500 + k * 80, px + 62, 500 + k * 80], '#160a26', 5); rect(px - 84, 390, 168, 44, '#2e1846'); rect(px - 84, 1140, 168, 40, '#2e1846'); }
  brazier(250, 1160, t, 1.5); brazier(830, 1160, t + 1, 1.5);
  g = X.createLinearGradient(0, 1160, 0, H); g.addColorStop(0, '#3a2a52'); g.addColorStop(1, '#0c0616'); X.fillStyle = g; X.fillRect(0, 1160, W, H - 1160);
  X.strokeStyle = 'rgba(200,170,255,0.16)'; X.lineWidth = 3; X.beginPath(); for (let k = 0; k < 6; k++) { const yy = 1160 + Math.pow(k / 6, 1.6) * 760; X.moveTo(0, yy); X.lineTo(W, yy); } for (let k = -6; k < 12; k++) { X.moveTo(540 + k * 70, 1160); X.lineTo(540 + k * 250, H); } X.stroke();
  steam(540, 1300, t, 1200, 0.12);
}
function hud3(h1, h2, tm, w1 = 0) {
  X.save(); for (const sd of [-1, 1]) { const x0 = sd < 0 ? 40 : 1040, hv = clamp(sd < 0 ? h1 : h2), w = 420, bx = sd < 0 ? x0 : x0 - w;
    txt('WINS: 0' + (sd < 0 ? w1 : 0), x0, 262, 34, '#fff', { w: 900, ls: 2, al: sd < 0 ? 'left' : 'right', stroke: INK, sw: 9 });
    rect(bx, 290, w, 34, '#a01828'); rect(sd < 0 ? bx : bx + w * (1 - hv), 290, w * hv, 34, '#2a3ae8'); rect(sd < 0 ? bx : bx + w * (1 - hv), 290, w * hv, 9, 'rgba(255,255,255,0.3)'); X.strokeStyle = '#e8e8f0'; X.lineWidth = 4; X.strokeRect(bx, 290, w, 34);
    rect(sd < 0 ? bx : bx + w - 230, 328, 230, 30, '#2f9a3a'); txt(sd < 0 ? 'SCORPION' : 'SUB-ZERO', sd < 0 ? bx + 10 : bx + w - 10, 344, 24, '#fff', { w: 900, ls: 2, al: sd < 0 ? 'left' : 'right' }); }
  txt(String(tm), 540, 312, 76, '#ffd24a', { w: 900, stroke: INK, sw: 14 }); X.restore(); }
function chainSpear(x0, y0, x1, y1, dir = 1) { X.save(); X.lineCap = 'butt'; X.strokeStyle = INK; X.lineWidth = 14; X.beginPath(); X.moveTo(x0, y0); X.lineTo(x1, y1); X.stroke(); X.setLineDash([16, 10]); X.strokeStyle = '#cfd4dc'; X.lineWidth = 8; X.stroke(); X.setLineDash([]); X.translate(x1, y1); X.rotate(Math.atan2(y1 - y0, x1 - x0)); X.beginPath(); X.moveTo(46, 0); X.lineTo(0, -18); X.lineTo(8, 0); X.lineTo(0, 18); X.closePath(); inkFill('#e8ecf2', 5); X.restore(); }
function hitFx(x, y, lt, t0) { if (lt < t0 || lt > t0 + 0.35) return; const q = (lt - t0) / 0.35; sparks(x, y, lt, 16, '#fff4c0', 2); X.save(); X.globalAlpha = 1 - q; X.beginPath(); X.arc(x, y, 40 + 110 * q, 0, 2 * PI); X.strokeStyle = '#ffe8a0'; X.lineWidth = 12; X.stroke(); starPolyFx(x, y, 70 * (1 - q * 0.5)); X.restore(); }
function starPolyFx(x, y, r) { X.beginPath(); for (let i = 0; i < 16; i++) { const rr = i % 2 ? r * 0.45 : r, a = i * PI / 8; X.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } X.closePath(); X.fillStyle = '#fff'; X.fill(); }
const SHOTS = [
 // 0 title
 (lt, d) => { templeBG(lt); scorp(SX - 60, G, 440, { pose: 'stance', ph: lt }); subz(ZX + 60, G, 440, { pose: 'stance', ph: lt });
   const a = eo(prog(lt, 0.2, 0.7)); txt('ULTIMATE MK3 · FAN ANIMATION', 540, 300, 40, '#fff', { w: 900, ls: 5, stroke: INK, sw: 12, a });
   X.save(); X.translate(-500 * (1 - a), 0); txt('SCORPION', 540, 440, 150, '#f2c230', { w: 900, ls: 4, stroke: INK, sw: 34, glow: 'rgba(255,150,40,0.9)', gb: 40 }); X.restore();
   txt('VS', 540, 580, 100, '#fff', { w: 900, stroke: INK, sw: 24, a: prog(lt, 0.8, 1.1) });
   const a2 = eo(prog(lt, 1.2, 1.7)); X.save(); X.translate(500 * (1 - a2), 0); txt('SUB-ZERO', 540, 720, 150, '#5ab0ff', { w: 900, ls: 4, stroke: INK, sw: 34, glow: 'rgba(80,170,255,0.9)', gb: 40 }); X.restore();
   return { tint: '#a070ff', tintA: 0.1, flash: lt < 0.12 ? 0.7 : 0 }; },
 // 1 face off
 (lt, d) => { cam(540, 1000, lerp(1.0, 1.1, lt / d)); templeBG(lt); const w = eo(prog(lt, 0, 1.6)), mv = lt < 1.6;
   shadow(lerp(60, SX, w), G, 120, 0.5); shadow(lerp(1020, ZX, w), G, 120, 0.5);
   scorp(lerp(60, SX, w), G, 440, { pose: mv ? 'walk' : 'stance', ph: mv ? lt * 7 : lt }); subz(lerp(1020, ZX, w), G, 440, { pose: mv ? 'walk' : 'stance', ph: mv ? lt * 7 + 1 : lt });
   X.setTransform(1, 0, 0, 1, 0, 0); hud3(1, 1, 99); txt('ROUND 1', 540, 520, 90, '#fff', { w: 900, ls: 8, stroke: INK, sw: 20, a: prog(lt, 1.8, 2.2) });
   return { tint: '#a070ff', tintA: 0.1 }; },
 // 2 fight
 (lt, d) => { templeBG(lt); shadow(SX, G, 120, 0.5); shadow(ZX, G, 120, 0.5); scorp(SX, G - Math.abs(Math.sin(lt * 9)) * 14, 440, { pose: 'stance', ph: lt }); subz(ZX, G - Math.abs(Math.sin(lt * 9 + 1)) * 14, 440, { pose: 'stance', ph: lt });
   X.setTransform(1, 0, 0, 1, 0, 0); hud3(1, 1, 99); finishText('FIGHT!', 540, 620, 230, prog(lt, 0.45, 0.7), -0.05);
   return { tint: '#ff7050', tintA: 0.1, flash: (prog(lt, 0.42, 0.47) - prog(lt, 0.47, 0.8)) * 0.6 }; },
 // 3 spear
 (lt, d) => { templeBG(lt); const ext = prog(lt, 0.5, 0.8), hitT = 0.8, pull = eo(prog(lt, 1.9, 2.7)), punT = 2.9;
   const zx = lerp(ZX, SX + 190, pull) + (lt > punT ? 160 * eo(prog(lt, punT, punT + 0.5)) : 0), hx = SX + 150, hy = G - 352;
   shadow(SX, G, 120, 0.5); shadow(zx, G, 120, 0.5);
   scorp(SX, G, 440, { pose: lt < 0.35 ? 'stance' : lt < 2.75 ? 'point' : lt < 3.4 ? 'uppercut' : 'stance', ph: lt });
   subz(zx, G, 440, { pose: lt > hitT ? 'hit' : 'stance', ph: lt });
   if (lt > 0.5 && lt < 2.75) chainSpear(hx, hy, lerp(hx, zx - 40, ext), lerp(hy, G - 300, ext));
   hitFx(zx - 40, G - 300, lt, hitT); hitFx(zx - 50, G - 330, lt, punT);
   X.setTransform(1, 0, 0, 1, 0, 0); hud3(1, lerp(1, 0.88, prog(lt, hitT, hitT + 0.3)) - 0.08 * prog(lt, punT, punT + 0.3), 97);
   moveTag('SPEAR!', 540, 560, '#f2c230', prog(lt, 0.5, 0.65) * (1 - prog(lt, 1.5, 1.7)));
   speech(340, 800, 'GET OVER HERE!', prog(lt, 1.5, 1.7) * (1 - prog(lt, 2.8, 3.0)), 46);
   return { tint: '#a070ff', tintA: 0.1, flash: Math.max((prog(lt, hitT - 0.03, hitT) - prog(lt, hitT, hitT + 0.3)) * 0.6, (prog(lt, punT - 0.03, punT) - prog(lt, punT, punT + 0.3)) * 0.6) }; },
 // 4 ice blast
 (lt, d) => { templeBG(lt); const beam = prog(lt, 0.7, 1.2), frz = prog(lt, 1.2, 1.7), sx = SX + 40 * 0 , shiv = lt > 1.7 ? Math.sin(lt * 40) * 3 : 0;
   shadow(SX, G, 120, 0.5); shadow(ZX, G, 120, 0.5);
   scorp(SX + shiv, G, 440, { pose: lt < 1.2 ? 'stance' : 'hit', ph: lt < 1.2 ? lt : 1.2 }); subz(ZX, G, 440, { pose: lt < 0.5 ? 'stance' : 'fireball', ph: lt });
   if (beam > 0 && lt < 2.6) iceBeam(ZX - 150, G - 352, SX + 70, G - 290, lt, beam);
   iceBlock(SX, G + 10, 290, 540 * eo(frz), frz > 0 ? 1 : 0, lt);
   if (frz > 0) for (let i = 0; i < 7; i++) { const hh = (120 + R(i) * 200) * eo(frz), px = SX - 190 + i * 64; poly([px - 30, G + 10, px + (R(i + 2) - 0.5) * 40, G + 10 - hh, px + 30, G + 10], i % 2 ? '#bfeaff' : '#e8fbff'); }
   X.setTransform(1, 0, 0, 1, 0, 0); hud3(lerp(1, 0.8, eo(frz)), 0.8, 94);
   moveTag('ICE BLAST!', 540, 560, '#8fe0ff', prog(lt, 0.7, 0.85) * (1 - prog(lt, 1.7, 1.9))); stamp('FROZEN!', 540, 600, 110, '#bfeaff', prog(lt, 1.8, 2.1), 0.05);
   return { tint: '#80b0ff', tintA: 0.12, flash: (prog(lt, 1.15, 1.2) - prog(lt, 1.2, 1.5)) * 0.6 }; },
 // 5 rapid combo
 (lt, d) => { templeBG(lt); const brk = 0.5, free = lt > brk, HT = [1.4, 1.75, 2.1, 2.45, 2.8, 3.2, 3.7], n = HT.filter(h => lt >= h).length, last = HT[Math.max(0, n - 1)], since = lt - last;
   const adv = eo(prog(lt, 0.7, 1.3)), sx = SX + 250 * adv + 26 * n, zx = ZX + 26 * n + 40 * adv;
   const poses = ['punch', 'punch', 'kick', 'punch', 'punch', 'kick', 'punch'], sp = !free ? 'hit' : lt < 1.3 ? 'run' : (n > 0 && since < 0.28) ? poses[n - 1] : 'stance';
   shadow(sx, G, 120, 0.5); shadow(zx, G, 120, 0.5);
   if (free && lt > 1.3) for (let k = 3; k >= 1; k--) { X.save(); X.globalAlpha = 0.22 / k * 2; scorp(sx - k * 70, G, 440, { pose: sp, ph: lt * 6 - k, shadow: false, glow: false }); X.restore(); }
   scorp(free ? sx : SX, G, 440, { pose: sp, ph: lt * 11 }); subz(zx, G, 440, { pose: n > 0 && since < 0.3 ? 'hit' : (free && lt > 1.0 ? 'block' : 'stance'), ph: lt });
   if (!free) { iceBlock(SX, G + 10, 290, 540, 1, lt); iceCracks(SX, G, 290, 540, prog(lt, 0, brk)); } shards(SX, G - 260, prog(lt, brk, brk + 1.0));
   for (const h of HT) hitFx(zx - 70, G - 270, lt, h);
   X.setTransform(1, 0, 0, 1, 0, 0); hud3(0.8, 0.8 - 0.045 * n, 90);
   if (n > 0) { X.save(); X.translate(40, 500); const pk = 1 + 0.35 * (1 - eo(prog(since, 0, 0.15))); X.scale(pk, pk); txt(String(n), 0, 0, 150, '#ffd24a', { w: 900, al: 'left', stroke: INK, sw: 26 }); txt(n === 1 ? 'HIT' : 'HITS', 120, 28, 60, '#fff', { w: 900, al: 'left', stroke: INK, sw: 16, ls: 3 }); X.restore(); }
   stamp('COMBO!', 700, 640, 110, '#ff6a50', prog(lt, 3.9, 4.2), 0.07);
   return { tint: '#a070ff', tintA: 0.1, flash: Math.max((prog(lt, brk - 0.04, brk) - prog(lt, brk, brk + 0.3)) * 0.8, n > 0 ? (prog(since, 0, 0.03) - prog(since, 0.03, 0.14)) * 0.3 : 0) }; },
 // 6 teleport
 (lt, d) => { templeBG(lt, { storm: true, moon: false }); const van = 0.9, app = 1.9, punT = 2.9, zx = 600, s0 = 330, s1 = 880;
   shadow(zx, G, 120, 0.5);
   if (lt < van + 0.15) { shadow(s0, G, 120, 0.5); X.save(); X.globalAlpha = 1 - prog(lt, van - 0.1, van + 0.15); scorp(s0, G, 440, { pose: lt > 0.4 ? 'cower' : 'stance', ph: lt }); X.restore(); }
   if (lt > van - 0.2 && lt < van + 0.9) { const q = prog(lt, van - 0.2, van + 0.9); flames(s0, G, 260, 560, lt, 26, 1 - q); glow(s0, G - 260, 380, `rgba(255,150,40,${0.7 * (1 - q)})`); steam(s0, G, lt, 260, 0.5 * (1 - q)); }
   if (lt > app - 0.2) { const q = prog(lt, app - 0.2, app + 0.8); flames(s1, G, 260, 560, lt, 26, 1 - q * 0.7); glow(s1, G - 260, 380, `rgba(255,150,40,${0.7 * (1 - q * 0.6)})`); }
   if (lt > app) { shadow(s1, G, 120, 0.5); X.save(); X.globalAlpha = prog(lt, app, app + 0.2); scorp(s1 - (lt > punT - 0.15 ? 130 * eo(prog(lt, punT - 0.15, punT)) : 0), G, 440, { f: -1, pose: lt > punT - 0.15 && lt < punT + 0.5 ? 'punch' : 'stance', ph: lt }); X.restore(); }
   subz(zx - (lt > punT ? 150 * eo(prog(lt, punT, punT + 0.5)) : 0), G, 440, { f: lt > app + 0.5 && lt < punT ? 1 : -1, pose: lt > punT ? 'hit' : 'stance', ph: lt, qmark: prog(lt, van + 0.3, van + 0.5) * (1 - prog(lt, punT - 0.1, punT)) });
   hitFx(zx + 40, G - 300, lt, punT);
   X.setTransform(1, 0, 0, 1, 0, 0); hud3(0.8, 0.48 - 0.06 * prog(lt, punT, punT + 0.3), 86);
   moveTag('TELEPORT!', 540, 560, '#ffb040', prog(lt, van, van + 0.15) * (1 - prog(lt, punT - 0.2, punT)));
   return { tint: '#a070ff', tintA: 0.1, flash: Math.max((prog(lt, van - 0.03, van + 0.02) - prog(lt, van + 0.02, van + 0.3)) * 0.6, (prog(lt, punT - 0.03, punT) - prog(lt, punT, punT + 0.3)) * 0.6) }; },
 // 7 uppercut
 (lt, d) => { templeBG(lt); const hitT = 0.9, crouch = lt < hitT - 0.25, up = prog(lt, hitT, hitT + 1.9), sx = 470, zx0 = 640;
   const zy = G - 620 * Math.sin(Math.min(1, up) * PI * 0.62), zx = zx0 + 170 * up, jump = lt > hitT - 0.1 && lt < hitT + 0.9 ? 150 * Math.sin(prog(lt, hitT - 0.1, hitT + 0.9) * PI) : 0;
   shadow(sx, G, 120, 0.5); shadow(zx, G, 120, up > 0 ? 0.25 : 0.5);
   if (lt > hitT - 0.15 && lt < hitT + 1.0) { const q = prog(lt, hitT - 0.15, hitT + 0.25); X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha = 1 - prog(lt, hitT + 0.3, hitT + 1.0); X.lineCap = 'round'; for (const [w, c] of [[60, 'rgba(255,120,30,0.6)'], [30, 'rgba(255,200,80,0.9)'], [10, '#fff']]) { X.beginPath(); X.arc(sx + 60, G - 330, 230, PI * 0.55, PI * 0.55 - PI * 0.95 * q, true); X.strokeStyle = c; X.lineWidth = w; X.stroke(); } X.restore(); }
   scorp(sx, G - jump, 440, { pose: crouch ? 'cower' : lt < hitT + 1.1 ? 'uppercut' : 'stance', ph: lt, f: 1 });
   subz(zx, up > 0 ? zy : G, 440, { pose: up > 0 ? 'hit' : 'stance', ph: lt, rot: up > 0 ? 1.5 * Math.min(1, up) : 0, shadow: false });
   hitFx(zx0 - 40, G - 380, lt, hitT);
   X.setTransform(1, 0, 0, 1, 0, 0); hud3(0.8, lerp(0.42, 0.1, eo(prog(lt, hitT, hitT + 0.5))), 82);
   finishText('UPPERCUT!', 540, 560, 120, prog(lt, hitT + 0.1, hitT + 0.4), -0.05);
   return { tint: '#a070ff', tintA: 0.1, flash: (prog(lt, hitT - 0.03, hitT) - prog(lt, hitT, hitT + 0.4)) * 0.9 }; },
 // 8 victory + end card
 (lt, d) => { templeBG(lt); const land = prog(lt, 0, 0.35), e = lt - 2.6;
   if (e > 0) { X.save(); X.globalAlpha = 0.5 * prog(e, 0, 0.5); rect(0, 0, W, H, '#080410'); X.restore(); }
   shadow(360, G, 120, 0.5); shadow(700, G, 150, 0.4);
   subz(620, lerp(G - 300, G - 40, eo(land)), 440, { pose: 'hit', rot: PI / 2, shadow: false, ex: 'closed' }); if (lt > 0.3 && lt < 0.8) steam(700, G, lt, 300, 0.5 * (1 - prog(lt, 0.3, 0.8)));
   scorp(360, G, 460, { pose: 'uppercut', p: { lt: -0.12, lk: 0, rt: 0.12, rk: 0, lean: 0, la: -0.2, le: 0.3 }, ph: lt, ex: 'firm' });
   flames(360, G, 300, 200, lt, 14, 0.5);
   X.setTransform(1, 0, 0, 1, 0, 0); hud3(0.8, 0, 74, 1);
   if (e < 0.3) finishText('SCORPION WINS!', 540, 600, 104, prog(lt, 0.5, 0.8) * (1 - prog(e, 0, 0.3)), -0.04, ['#fff2b0', '#f2c230', '#c86a10'], '#ffb030');
   if (e > 0) { const q = eo(prog(e, 0.1, 0.6)); txt("WHO'S YOUR PICK?", 540, 540, 96, '#fff', { w: 900, ls: 3, stroke: INK, sw: 22, a: q }); txt('SCORPION', 300, 680, 76, '#f2c230', { w: 900, stroke: INK, sw: 16, a: q }); txt('or', 540, 684, 46, '#ddd', { w: 700, a: q }); txt('SUB-ZERO', 790, 680, 76, '#5ab0ff', { w: 900, stroke: INK, sw: 16, a: q });
     txt('COMMENT BELOW', 540, 800, 56, '#fff', { w: 900, ls: 5, stroke: INK, sw: 14, a: prog(e, 1.0, 1.5) });
     const c = eo(prog(e, 2.0, 2.6)); txt('RG BRICK&STICKVERSE', 540, 920, 62, '#ffd24a', { w: 900, ls: 3, stroke: INK, sw: 16, glow: 'rgba(255,200,80,0.8)', gb: 24, a: c }); txt('FAN-MADE PARODY · FOLLOW FOR MORE', 540, 990, 32, '#fff', { w: 800, ls: 3, stroke: INK, sw: 10, a: c }); }
   return { tint: '#a070ff', tintA: 0.1 }; },
];
function frame(t) {
  X = X0; X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over'; X.clearRect(0, 0, W, H);
  let k = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= (j === 0 ? 0 : A(j) - 0.15)) k = j;
  const st = k === 0 ? 0 : A(k) - 0.15, en = k + 1 < SHOTS.length ? A(k + 1) - 0.15 : TIM.dur;
  X.save(); const o = SHOTS[k](t - st, en - st) || {}; X.restore();
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over';
  post(t, o); poster(0.9); brandTag(1); captions(t);
  if (t > TIM.dur - 0.4) { X.globalAlpha = prog(t, TIM.dur - 0.4, TIM.dur); rect(0, 0, W, H, '#000'); X.globalAlpha = 1; }
}
window.frame = frame;
