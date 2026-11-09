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

// ---------- stage constants ----------
const DX = 260, TX = 830, GY = 990, CS = 0.85;
function stageCreatures(t, st) {
  shadow(DX, GY, 190 * CS * 1.3); shadow(TX, GY, 190 * CS * 1.3);
  if (st.dragon !== false) dragon(DX + (st.dx || 0), GY + (st.dy || 0), (st.ds ?? CS), 1, t, st.d || {});
  if (st.turtle !== false) turtle(TX + (st.tx || 0), GY + (st.ty || 0), (st.ts ?? CS), -1, t, st.t || {});
}
const SHOTS = [
 // 0 title
 (lt, d) => { const pun = 1 + 0.18 * (1 - eo(prog(lt, 0, 0.5))); X.save(); cam(540, 960, pun); splitBG(lt); X.restore();
   const sl = eo(prog(lt, 0.1, 0.7)); X.save(); X.translate(-600 * (1 - sl), 0); txt('RED', 270, 760, 175, REDC, { w: 900, ls: 4, stroke: INK, sw: 38, glow: 'rgba(255,100,60,0.8)', gb: 40 }); txt('VERSION', 270, 880, 54, CREAM, { w: 900, ls: 14, stroke: INK, sw: 14 }); X.restore();
   X.save(); X.translate(600 * (1 - sl), 0); txt('BLUE', 815, 760, 175, BLUEC, { w: 900, ls: 4, stroke: INK, sw: 38, glow: 'rgba(80,170,255,0.8)', gb: 40 }); txt('VERSION', 815, 880, 54, CREAM, { w: 900, ls: 14, stroke: INK, sw: 14 }); X.restore();
   if (lt > 0.7) { const a = prog(lt, 0.7, 0.9); lightning(lt, 3, 560, 560, 520, 1000, '#ffe8a0'); txt('VS', 548, 1000, 150 * (1 + 0.3 * (1 - a)), '#fff', { w: 900, stroke: INK, sw: 30, glow: '#fff', gb: 40, a }); }
   redTrainer(170, 1400, 380, { pose: 'point', ph: lt }); blueTrainer(910, 1400, 380, { pose: 'cross' });
   return { tint: '#ff8a50', tintA: 0.12, flash: lt < 0.12 ? 0.8 : 0 }; },
 // 1 face-off
 (lt, d) => { const p = lt / d; cam(540, 1000, lerp(1.0, 1.12, p)); splitBG(lt, { ground: true });
   redTrainer(250, 1450, 640, { pose: 'stand', ex: 'angry', ph: lt }); blueTrainer(830, 1450, 640, { pose: 'cross', ex: 'smile' });
   lightning(lt, 7, 560, 700, 530, 1100, '#fff4b0');
   X.setTransform(1, 0, 0, 1, 0, 0); stamp('RIVALS', 540, 330, 120, '#fff', prog(lt, 0.5, 0.9), -0.06); return { tint: '#ff8a50', tintA: 0.1 }; },
 // 2 arena
 (lt, d) => { const p = lt / d; cam(540, lerp(1150, 960, eo(p)), lerp(1.3, 1.0, eo(p))); splitBG(lt, { ground: true });
   redTrainer(150, 1330, 340, { pose: 'hold', ph: lt, ex: 'firm' }); blueTrainer(930, 1330, 340, { pose: 'hold', ex: 'smile' });
   X.save(); ball(250, 1170, 26, lt * 2); ball(830, 1170, 26, -lt * 2); X.restore();
   X.setTransform(1, 0, 0, 1, 0, 0); partyBalls(60, 118, 1, prog(lt, 0.4, 0.9)); partyBalls(760, 118, 1, prog(lt, 0.6, 1.1));
   stamp('1 VS 1', 540, 500, 130, '#fff', prog(lt, 0.2, 0.6), 0.04); return { tint: '#ffb070', tintA: 0.08 }; },
 // 3 red sends dragon
 (lt, d) => { const sh = prog(lt, 1.05, 1.5) * (1 - prog(lt, 1.5, 2.0)); X.save(); shake(lt, 14 * sh); cam(540, 960, 1.0 + 0.03 * prog(lt, 0, d)); splitBG(lt, { ground: true });
   const tp = throwPose(lt, 0.7);
   redTrainer(150, 1330, 340, { pose: lt < 0.8 ? 'stand' : 'point', p: lt < 0.8 ? tp : {}, ph: lt, ex: 'shout' }); blueTrainer(930, 1330, 340, { pose: 'cross', ex: 'smile' });
   if (lt > 0.25 && lt < 1.05) { const u = prog(lt, 0.25, 1.05); ball(lerp(230, DX, u), lerp(1100, 800, 4 * u * (1 - u) * -1 + u) - 260 * Math.sin(u * PI), 26, lt * 14); }
   if (lt > 1.05) { const k = eo(prog(lt, 1.05, 1.6)); shadow(DX, GY, 190 * CS * 1.3 * k); if (lt < 1.55) { X.save(); X.globalAlpha = 1 - prog(lt, 1.05, 1.55); circ(DX, 780, 380 * k, 'rgba(255,255,255,0.9)'); X.restore(); }
     dragon(DX, GY, CS * (0.5 + 0.5 * k), 1, lt, { a: prog(lt, 1.05, 1.4), breathe: lt > 1.9 && lt < 3.3 ? 1 : 0, flap: 0.25 });
     if (lt > 1.9 && lt < 3.3) { const m = dragonMouth(DX, GY, CS, 1, 1); flameStream(m[0], m[1], m[0] + 250, m[1] - 90, lt, 0.7 * prog(lt, 1.9, 2.3)); }
     X.save(); X.globalAlpha = 0.7 * (1 - prog(lt, 1.1, 1.8)); for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * PI; line([DX + Math.cos(a) * 200 * k, 780 + Math.sin(a) * 200 * k, DX + Math.cos(a) * 520 * k, 780 + Math.sin(a) * 520 * k], '#fff', 8); } X.restore(); }
   X.restore(); X.setTransform(1, 0, 0, 1, 0, 0);
   partyBalls(60, 118, 1, 0.9); partyBalls(760, 118, 1, 0.9);
   hpBox(30 + 520 * (1 - eo(prog(lt, 1.6, 2.1))) * -1, 145, 'CHARIZARD', 50, 1, { a: prog(lt, 1.6, 1.9), c: '#ffb070', t: lt });
   return { tint: '#ff7a40', tintA: 0.12, flash: (prog(lt, 1.0, 1.1) - prog(lt, 1.1, 1.5)) * 0.7 }; },
 // 4 blue sends turtle
 (lt, d) => { const sh = prog(lt, 1.0, 1.4) * (1 - prog(lt, 1.4, 1.9)); X.save(); shake(lt, 14 * sh); cam(540, 960, 1.0 + 0.03 * prog(lt, 0, d)); splitBG(lt, { ground: true });
   redTrainer(150, 1330, 340, { pose: 'cross', ex: 'angry', ph: lt }); const tp = throwPose(lt, 0.7);
   blueTrainer(930, 1330, 340, { pose: lt < 0.8 ? 'stand' : 'point', p: lt < 0.8 ? tp : {}, ex: 'smile' });
   shadow(DX, GY, 190 * CS * 1.3); dragon(DX, GY, CS, 1, lt, { flap: 0.15 });
   if (lt > 0.25 && lt < 1.0) { const u = prog(lt, 0.25, 1.0); ball(lerp(850, TX, u), lerp(1100, 800, u) - 260 * Math.sin(u * PI), 26, -lt * 14); }
   if (lt > 1.0) { const k = eo(prog(lt, 1.0, 1.5)); shadow(TX, GY, 190 * CS * 1.3 * k); if (lt < 1.5) { X.save(); X.globalAlpha = 1 - prog(lt, 1.0, 1.5); circ(TX, 780, 380 * k, 'rgba(255,255,255,0.9)'); X.restore(); }
     turtle(TX, GY, CS * (0.5 + 0.5 * k), -1, lt, { a: prog(lt, 1.0, 1.35), open: lt > 1.5 && lt < 2.6 });
     X.save(); X.globalAlpha = 0.9 * (1 - prog(lt, 1.0, 2.2)); for (let i = 0; i < 26; i++) { const a = R(i) * PI + PI, v = 150 + R(i + 3) * 350, q = prog(lt, 1.0, 2.2); circ(TX + Math.cos(a) * v * q, 960 + Math.sin(a) * v * q * 1.2 + 200 * q * q, 6 + R(i + 5) * 10, '#cfeaff'); } X.restore(); }
   X.restore(); X.setTransform(1, 0, 0, 1, 0, 0);
   partyBalls(60, 118, 1, 0.9); partyBalls(760, 118, 1, 0.9);
   hpBox(30, 145, 'CHARIZARD', 50, 1, { c: '#ffb070', t: lt }); hpBox(590 + 520 * (1 - eo(prog(lt, 1.5, 2.0))), 145, 'BLASTOISE', 50, 1, { a: prog(lt, 1.5, 1.8), c: '#8fd0ff', t: lt });
   const q = prog(lt, 2.7, 3.1); if (q > 0) { X.save(); X.globalAlpha = q; X.translate(540, 1230); const k = 1 + 0.3 * (1 - eo(q)); X.scale(k, k); rect(-300, -90, 600, 180, 'rgba(8,10,20,0.85)'); X.strokeStyle = '#fff'; X.lineWidth = 5; X.strokeRect(-300, -90, 600, 180); iconDrop(-170, 0, 1.1); txt('>', 0, 0, 120, '#fff', { w: 900 }); iconFlame(170, 5, 1.1); txt('WATER BEATS FIRE', 0, 130, 38, CREAM, { w: 900, ls: 5, stroke: INK, sw: 10 }); X.restore(); }
   return { tint: '#6aa8d8', tintA: 0.12, flash: (prog(lt, 0.95, 1.05) - prog(lt, 1.05, 1.45)) * 0.7 }; },
 // 5 attacks collide
 (lt, d) => { const hit = prog(lt, 2.8, 3.0); const sh = hit * (1 - prog(lt, 3.9, 4.8)); X.save(); shake(lt, 22 * sh); cam(540, 880, 1.0 + 0.08 * prog(lt, 2.6, 3.2)); splitBG(lt, { ground: true });
   const fire = prog(lt, 0.15, 0.6) * (lt < 2.8 ? 1 : 1), cx = 590, cy = 610, water = prog(lt, 1.5, 1.9);
   const dm = dragonMouth(DX, GY, CS, 1, 1), tm = turtleMuzzle(TX, GY, CS, -1, 0), tm2 = turtleMuzzle(TX, GY, CS, -1, 1);
   shadow(DX, GY, 190 * CS * 1.3); shadow(TX, GY, 190 * CS * 1.3);
   dragon(DX, GY, CS, 1, lt, { breathe: 1, flap: 0.25, hurt: hit * (1 - prog(lt, 3.5, 3.8)) * 0.3 }); turtle(TX, GY, CS, -1, lt, { open: water > 0, hurt: hit * (1 - prog(lt, 3.5, 3.8)) * 0.3 });
   const fEnd = lt < 2.8 ? lerp(dm[0] + 20, cx, eo(fire)) : cx, wEnd = lt < 2.8 ? lerp(tm[0] - 20, cx, eo(water)) : cx;
   if (fire > 0) flameStream(dm[0], dm[1], lt < 2.8 ? lerp(dm[0] + 60, cx - 30, eo(fire)) : cx - 30, lt < 2.8 ? lerp(dm[1], cy, eo(fire)) : cy, lt, 1, { arc: 0.5 });
   if (water > 0) { waterStream(tm[0], tm[1], lt < 2.8 ? lerp(tm[0] - 60, cx + 30, eo(water)) : cx + 30, lt < 2.8 ? lerp(tm[1], cy, eo(water)) : cy, lt, 1, { arc: 0.5 }); waterStream(tm2[0], tm2[1], lt < 2.8 ? lerp(tm2[0] - 60, cx + 30, eo(water)) : cx + 30, lt < 2.8 ? lerp(tm2[1], cy + 20, eo(water)) : cy + 20, lt + 0.3, 1, { arc: 0.8, a: 0.9 }); }
   if (hit > 0) { const q = prog(lt, 2.8, 4.0); X.save(); X.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { X.globalAlpha = (1 - q) * 0.8; X.beginPath(); X.arc(cx, cy, 80 + 520 * eo(prog(lt, 2.8 + k * 0.15, 3.9)), 0, 2 * PI); X.strokeStyle = k ? '#9fdcff' : '#ffd890'; X.lineWidth = 26 - k * 7; X.stroke(); } glow(cx, cy, 420 * (1 - q * 0.6), 'rgba(255,245,220,0.9)'); X.restore();
     steam(cx, 900, lt, 1100, 0.9 * prog(lt, 3.0, 3.8) * (1 - prog(lt, 4.7, 5.3))); sparks(cx, cy, lt, 30, '#fff4c0', 2); }
   X.restore(); X.setTransform(1, 0, 0, 1, 0, 0);
   hpBox(30, 145, 'CHARIZARD', 50, 1, { c: '#ffb070', t: lt }); hpBox(590, 145, 'BLASTOISE', 50, 1, { c: '#8fd0ff', t: lt });
   if (lt < 1.45) bannerSlam('FLAMETHROWER!', 540, 390, 88, '#ff9a3c', prog(lt, 0.1, 0.5)); else if (lt < 2.8) bannerSlam('HYDRO PUMP!', 540, 390, 104, '#7cd0ff', prog(lt, 1.5, 1.9), 0.05); else bannerSlam('BOOM!', 540, 390, 190, '#fff', prog(lt, 2.8, 3.1), -0.08);
   return { tint: '#ff9a60', tintA: 0.1, flash: (prog(lt, 2.78, 2.86) - prog(lt, 2.86, 3.3)) * 0.9 }; },
 // 6 water wins
 (lt, d) => { const hp = lerp(1, 0.07, eo(prog(lt, 0.4, 1.9))), push = eo(prog(lt, 0.0, 0.7)), kb = eo(prog(lt, 0.3, 1.1)); const sh = prog(lt, 0.3, 0.5) * (1 - prog(lt, 1.1, 1.6)); X.save(); shake(lt, 18 * sh); cam(540, 900, 1.05); splitBG(lt, { ground: true });
   const dm = dragonMouth(DX, GY, CS, 1, 1), tm = turtleMuzzle(TX, GY, CS, -1, 0), tm2 = turtleMuzzle(TX, GY, CS, -1, 1);
   const dx = -90 * kb, drot = -0.35 * kb;
   shadow(DX + dx, GY, 190 * CS * 1.3); shadow(TX, GY, 190 * CS * 1.3);
   const hx = DX + dx + 100 * Math.cos(drot) + 60, hy = GY - 330;
   if (lt < 1.5) { waterStream(tm[0], tm[1], lerp(590, DX + 80, eo(prog(lt, 0.2, 0.7))), lerp(610, GY - 380, eo(prog(lt, 0.2, 0.7))), lt, 1, { arc: 0.6 }); waterStream(tm2[0], tm2[1], lerp(590, DX + 80, eo(prog(lt, 0.2, 0.7))), lerp(620, GY - 330, eo(prog(lt, 0.2, 0.7))), lt + 0.3, 1, { arc: 0.9, a: 0.9 }); }
   dragon(DX + dx, GY, CS, 1, lt, { hurt: sh * 1.3 + (lt > 1.3 ? 0.4 : 0), breathe: 0, rot: drot, flap: 0.05 }); turtle(TX, GY, CS, -1, lt, { open: lt < 1.5, arm: 0.5 });
   if (lt < 1.6) { X.save(); X.globalAlpha = 0.9 * (1 - prog(lt, 0.8, 1.6)); for (let i = 0; i < 30; i++) circ(DX + 120 + (R(i) - 0.3) * 320 * prog(lt, 0.3, 1.2), GY - 380 + R(i + 4) * 240 + 140 * prog(lt, 0.4, 1.3) * R(i), 5 + R(i + 6) * 10, '#d9f0ff'); X.restore(); }
   steam(DX + dx, GY, lt, 500, 0.5 * (1 - prog(lt, 0.5, 1.6)));
   X.restore(); X.setTransform(1, 0, 0, 1, 0, 0);
   hpBox(30, 145, 'CHARIZARD', 50, hp, { c: '#ffb070', t: lt }); hpBox(590, 145, 'BLASTOISE', 50, 1, { c: '#8fd0ff', t: lt });
   stamp('SUPER EFFECTIVE!', 540, 390, 74, '#8fd8ff', prog(lt, 0.5, 0.85), -0.05);
   redTrainer(150, 1330, 340, { pose: 'cower', ex: 'fear', ph: lt }); blueTrainer(930, 1330, 340, { pose: 'armsup', ex: 'smile', ph: lt * 4 });
   return { tint: '#6aa8d8', tintA: 0.12 }; },
 // 7 comeback + crit
 (lt, d) => { const slash = prog(lt, 1.55, 1.7), post = prog(lt, 1.7, 2.6); const sh = (prog(lt, 1.6, 1.7)) * (1 - prog(lt, 1.7, 2.4)); X.save(); shake(lt, 26 * sh); cam(540, 900, lerp(1.0, 1.1, eo(prog(lt, 0.3, 1.6)))); splitBG(lt, { ground: true, dim: 0.15 * (1 - slash) });
   const rise = eo(prog(lt, 0.2, 1.0)); const lunge = eo(prog(lt, 1.35, 1.65)) * (1 - prog(lt, 1.8, 2.5));
   shadow(DX + 200 * lunge, GY, 190 * CS * 1.3); shadow(TX, GY, 190 * CS * 1.3);
   dragon(DX + 220 * lunge, GY, CS, 1, lt, { rot: lerp(-0.35, 0, rise) + (-0.1 * lunge), arm: 0.9 * rise, glowClaw: rise > 0.5, flap: 0.3 * rise, breathe: 0 });
   turtle(TX + 60 * eo(prog(lt, 1.7, 2.2)) * (1 - prog(lt, 2.4, 3)), GY, CS, -1, lt, { hurt: slash * (1 - prog(lt, 2.0, 2.4)), open: lt > 1.7, rot: 0.12 * eo(prog(lt, 1.7, 2.3)) });
   if (lt > 1.55 && lt < 2.3) { const q = prog(lt, 1.55, 2.3); X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha = 1 - q; line([TX - 280, GY - 620, TX + 230, GY - 80], '#fff', 34 * (1 - q * 0.5)); line([TX + 220, GY - 640, TX - 240, GY - 120], '#fff', 22 * (1 - q * 0.5)); glow(TX, GY - 360, 420, 'rgba(255,255,255,0.9)'); X.restore(); sparks(TX, GY - 340, lt, 24, '#fff', 2); }
   X.restore(); X.setTransform(1, 0, 0, 1, 0, 0);
   const thp = lerp(1, 0.1, eo(prog(lt, 1.7, 2.6)));
   hpBox(30, 145, 'CHARIZARD', 50, 0.07, { c: '#ffb070', t: lt }); hpBox(590, 145, 'BLASTOISE', 50, thp, { c: '#8fd0ff', t: lt });
   redTrainer(150, 1330, 340, { pose: 'point', ex: 'shout', ph: lt * 5 }); blueTrainer(930, 1330, 340, { pose: lt > 1.7 ? 'cower' : 'cross', ex: lt > 1.7 ? 'fear' : 'smile' });
   if (lt < 1.5) txt('BUT RED ISN’T DONE', 540, 390, 64, '#ffcf9a', { w: 900, ls: 6, stroke: INK, sw: 14, a: prog(lt, 0.3, 0.7) });
   stamp('CRITICAL HIT!', 540, 390, 96, '#ffe04a', prog(lt, 1.75, 2.0), -0.07);
   return { tint: '#ffb070', tintA: 0.1, flash: (prog(lt, 1.52, 1.6) - prog(lt, 1.6, 1.9)) * 0.5 }; },
 // 8 hanging by a thread
 (lt, d) => { const p = lt / d; const beat = Math.pow(Math.max(0, Math.sin(lt * 8)), 8); cam(540, 900, lerp(1.0, 1.12, p)); splitBG(lt, { ground: true, dim: 0.25 });
   shadow(DX - 40, GY, 190 * CS * 1.3); shadow(TX + 30, GY, 190 * CS * 1.3);
   dragon(DX - 40, GY + 10 + Math.sin(lt * 7) * 4, CS, 1, lt, { rot: -0.18, flap: 0.04, hurt: 0.15 }); turtle(TX + 30, GY + 10 + Math.sin(lt * 7 + 1) * 4, CS, -1, lt, { rot: 0.1, hurt: 0.15 });
   X.setTransform(1, 0, 0, 1, 0, 0);
   hpBox(30, 145, 'CHARIZARD', 50, 0.07, { c: '#ffb070', t: lt }); hpBox(590, 145, 'BLASTOISE', 50, 0.1, { c: '#8fd0ff', t: lt });
   redTrainer(150, 1330, 340, { pose: 'stomach', ex: 'fear', ph: lt }); blueTrainer(930, 1330, 340, { pose: 'headdown', ex: 'fear' });
   X.save(); X.globalAlpha = 0.28 * beat; X.drawImage(vigC, 0, 0); rect(0, 0, W, H, 'rgba(255,0,0,0.25)'); X.restore();
   for (const [sx, sy] of [[245, 1000], [850, 1000]]) { const q = (lt * 1.2 + sx) % 1; X.save(); X.globalAlpha = 0.8 * (1 - q); iconDrop(sx, sy + q * 60, 0.3, '#9fd8ff'); X.restore(); }
   return { tint: '#ff4030', tintA: 0.12, desat: 0.2 }; },
 // 9 who wins
 (lt, d) => { const a = prog(lt, 0.1, 0.5); splitBG(lt, { dim: 0.1 });
   const sl = eo(prog(lt, 0.0, 0.6)); X.save(); X.translate(-500 * (1 - sl), 0); txt('RED', 270, 1010, 160, REDC, { w: 900, stroke: INK, sw: 30, glow: 'rgba(255,100,60,0.9)', gb: 50 }); X.restore(); X.save(); X.translate(500 * (1 - sl), 0); txt('BLUE', 815, 1010, 160, BLUEC, { w: 900, stroke: INK, sw: 30, glow: 'rgba(80,170,255,0.9)', gb: 50 }); X.restore();
   const pulse = 1 + 0.08 * Math.sin(lt * 8); txt('?', 540, 640, 440 * pulse, '#fff', { w: 900, stroke: INK, sw: 50, glow: '#fff', gb: 60, a: a });
   lightning(lt, 11, 560, 200, 520, 1400, '#fff4b0');
   dragonSil(); return { tint: '#ffb070', tintA: 0.1, flash: Math.sin(lt * 20) > 0.97 ? 0.3 : 0 }; },
 // 10 end card
 (lt, d) => { splitBG(lt, { dim: 0.2 }); const a = eo(prog(lt, 0.2, 0.9));
   X.save(); X.globalAlpha = 0.9; redTrainer(170, 1580, 340, { pose: 'point', ex: 'angry', ph: lt }); blueTrainer(910, 1580, 340, { pose: 'cross', ex: 'smile' }); X.restore();
   X.save(); X.translate(540, 330); const k = 0.85 + 0.15 * a; X.scale(k, k); txt('RG', 0, -150, 150, REDC, { w: 900, ls: 20, stroke: INK, sw: 30, glow: REDC, gb: 40, a }); txt('BRICK&', 0, 10, 130, CREAM, { w: 900, ls: 6, stroke: INK, sw: 28, glow: 'rgba(255,200,120,0.8)', gb: 36, a }); txt('STICKVERSE', 0, 150, 120, BLUEC, { w: 900, ls: 4, stroke: INK, sw: 28, glow: BLUEC, gb: 40, a }); X.restore();
   X.setTransform(1, 0, 0, 1, 0, 0); const b = prog(lt, 1.0, 1.6);
   X.save(); X.globalAlpha = b; X.translate(540, 800); rect(-440, -120, 880, 240, 'rgba(8,8,14,0.85)'); X.strokeStyle = CREAM; X.lineWidth = 5; X.strokeRect(-440, -120, 880, 240); txt('WHO WINS?', 0, -60, 70, CREAM, { w: 900, ls: 6 }); circ(-190, 35, 28, REDC, INK, 5); txt('RED', -110, 35, 66, REDC, { w: 900, stroke: INK, sw: 12 }); txt('or', 40, 35, 44, '#ddd', { w: 700 }); circ(120, 35, 28, BLUEC, INK, 5); txt('BLUE', 250, 35, 66, BLUEC, { w: 900, stroke: INK, sw: 12 }); X.restore();
   txt('COMMENT YOUR TEAM', 540, 1000, 50, '#fff', { w: 900, ls: 4, a: prog(lt, 1.8, 2.4), stroke: INK, sw: 12 }); txt('+ FOLLOW FOR ROUND 2', 540, 1070, 50, '#ffd24a', { w: 900, ls: 4, a: prog(lt, 2.4, 3.0), stroke: INK, sw: 12 });
   return { tint: '#ffb070', tintA: 0.1 }; },
];
function dragonSil() { X.save(); X.globalAlpha = 0.8; X.filter = 'brightness(0)'; dragon(300, 1400, 0.5, 1, 0, { flap: 0 }); turtle(800, 1400, 0.5, -1, 0, {}); X.restore(); X.filter = 'none'; X.save(); X.globalCompositeOperation = 'lighter'; glow(300 + 0.5 * 165, 1400 - 0.5 * 520, 70, 'rgba(255,90,60,0.9)'); glow(800 - 0.5 * 165, 1400 - 0.5 * 430, 70, 'rgba(80,170,255,0.9)'); X.restore(); }
function frame(t) {
  X = X0; X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over'; X.clearRect(0, 0, W, H);
  let k = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= (j === 0 ? 0 : A(j) - 0.15)) k = j;
  const st = k === 0 ? 0 : A(k) - 0.15, en = k + 1 < SHOTS.length ? A(k + 1) - 0.15 : TIM.dur;
  X.save(); const o = SHOTS[k](t - st, en - st) || {}; X.restore();
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over';
  const ls = t - st; if (k > 0 && ls < 0.14) { X.globalAlpha = 0.9 * (1 - ls / 0.14); rect(0, 0, W, H, '#000'); X.globalAlpha = 1; }
  post(t, o); poster(0.9); brandTag(k === 10 ? 0.5 : 1); captions(t);
  if (t > TIM.dur - 0.4) { X.globalAlpha = prog(t, TIM.dur - 0.4, TIM.dur); rect(0, 0, W, H, '#000'); X.globalAlpha = 1; }
}
window.frame = frame;
