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
const SHOTS = [
 // 0 title
 (lt, d) => { routeBG(lt, lt * 150); const walkU = eo(prog(lt, 0.2, 2.4)), rx = lerp(-220, 560, walkU), moving = lt < 2.4, px = rx - 200, a = prog(lt, 0.2, 0.9);
   txt('POKÉMON', 540, 330, 70, '#fff', { w: 900, ls: 12, stroke: INK, sw: 16, a });
   X.save(); X.translate(540, 490); const k = 1 + 0.25 * (1 - eo(prog(lt, 0.2, 0.8))); X.scale(k, k); txt('YELLOW', 0, 0, 230, '#ffd93a', { w: 900, ls: 4, stroke: INK, sw: 44, glow: 'rgba(255,230,100,0.9)', gb: 40, a }); X.restore();
   txt('SPECIAL PIKACHU EDITION', 540, 640, 40, '#fff', { w: 900, ls: 6, stroke: INK, sw: 12, a: prog(lt, 0.8, 1.3) });
   X.save(); X.globalAlpha = prog(lt, 1.4, 1.9); rect(130, 730, 820, 110, 'rgba(20,12,4,0.85)'); X.strokeStyle = '#ffd24a'; X.lineWidth = 5; X.strokeRect(130, 730, 820, 110); txt('QUICK MEMORY LANE', 540, 786, 62, '#ffd24a', { w: 900, ls: 6 }); X.restore();
   pikachu(px, 1290, 0.62, 1, lt, { walk: moving ? lt * 9 : 0, bob: moving ? 5 : 3, ex: 'happy' }); redTrainer(rx, 1290, 380, { pose: moving ? 'walk' : 'stand', ph: lt * 7, ex: 'smile' });
   return { tint: '#ffd070', tintA: 0.14 }; },
 // 1 pikachu refuses ball
 (lt, d) => { labBG(lt); const zT = 3.0, hop = eo(prog(lt, 0.9, 1.4)), px = lerp(1250, 770, hop), sur = lt > zT;
   prof(240, 1290, 430, { pose: sur ? 'armsup' : 'point', ph: lt * 2, ex: sur ? 'shout' : 'talk' });
   let bx = 432, by = 958 + Math.sin(lt * 3) * 8; if (lt > 3.3) { const u = prog(lt, 3.3, 4.3); bx = lerp(432, -140, u); by = 958 - 380 * Math.sin(u * PI * 0.85) + 260 * u * u; }
   if (lt < 4.5) ball(bx, by, 38, lt > 3.3 ? lt * 14 : 0);
   pikachu(px, 1290 - Math.sin(hop * PI) * 120, 0.95, -1, lt, { ex: lt < 1.6 ? 'happy' : 'angry', zap: lt > zT - 0.1 && lt < zT + 0.5, walk: hop < 1 ? lt * 12 : 0, bob: 3 });
   if (lt > zT - 0.1 && lt < zT + 0.5) zapArc(px - 62, 1105, bx, by, lt, 5, 16);
   speech(800, 880, 'PIKA!', prog(lt, 1.7, 1.9) * (1 - prog(lt, 2.7, 2.9)), 54);
   stamp('NOPE!', 540, 640, 120, '#ff4a3a', prog(lt, 3.7, 4.0), -0.07);
   return { tint: '#ffe9a0', tintA: 0.1, flash: (prog(lt, zT, zT + 0.05) - prog(lt, zT + 0.05, zT + 0.35)) * 0.7 }; },
 // 2 follows you
 (lt, d) => { const sc = lt * 320; cam(540, 900, 1.0 + 0.05 * prog(lt, 0, d)); routeBG(lt, sc); const ph = lt * 8.5;
   X.save(); for (let i = 0; i < 8; i++) { const q = (lt * 1.6 + i / 8) % 1; X.globalAlpha = 0.35 * (1 - q); circ(120 - q * 160 + (i % 2) * 40, 1310 - q * 18, 10 + q * 22, '#f0e0b0'); } X.restore();
   pikachu(300, 1290 - Math.abs(Math.sin(ph * 0.9)) * 12, 0.72, 1, lt, { walk: ph + 1, bob: 5, ex: 'happy' }); redTrainer(570, 1290, 400, { pose: 'walk', ph, ex: 'smile' });
   for (let i = 0; i < 4; i++) { const bx = (((i * 520 - sc * 1.6) % 2080) + 2080) % 2080 - 200; circ(bx, 1580, 90, '#2f7a32', INK, 5); circ(bx + 70, 1600, 70, '#3f8f3a', INK, 5); }
   return { tint: '#ffe0a0', tintA: 0.1 }; },
 // 3 his face
 (lt, d) => { fillBG('#f6c050', '#e08a30'); X.save(); X.translate(540, 900); X.rotate(lt * 0.15); X.globalAlpha = 0.22; for (let i = 0; i < 14; i++) { X.rotate(PI / 7); poly([0, 0, 1400, -90, 1400, 90], '#fff2b0'); } X.restore();
   const idx = Math.min(2, Math.floor(lt / 1.2)), loc = lt - idx * 1.2, pop = 1 + 0.12 * (1 - eo(prog(loc, 0, 0.18))), exs = ['heart', 'angry', 'sad'], names = ['HAPPY', 'ANNOYED', 'SAD'];
   X.save(); X.translate(540, 1230); X.scale(pop, pop); X.translate(-540, -1230); pikachu(540, 1230, 1.7, 1, lt, { ex: exs[idx], bob: 6, zap: idx === 1 && loc > 0.3 && loc < 0.9 }); X.restore();
   if (idx === 0) { heart(800, 560 + Math.sin(lt * 4) * 10, 1.8); heart(700, 470, 1.0, '#ff8fb0', prog(loc, 0.2, 0.5)); }
   if (idx === 1) veins(800, 560, 2.2, prog(loc, 0.05, 0.25));
   if (idx === 2) tear(503, 890 + ((loc * 1.2) % 1) * 70, 1.3, 0.9);
   X.setTransform(1, 0, 0, 1, 0, 0); stamp(names[idx], 540, 400, 84, '#fff', prog(loc, 0, 0.2), -0.04);
   return { tint: '#ffd070', tintA: 0.12 }; },
 // 4 onix immune
 (lt, d) => { gymBG(lt); const rise = eo(prog(lt, 0.7, 1.5)), zap = lt > 2.0 && lt < 2.7, hit = prog(lt, 2.2, 2.3) * (1 - prog(lt, 2.8, 3.2));
   shadow(790, 1110, 230, 0.5); shadow(230, 1110, 120, 0.5);
   onix(800, 1110, 0.95, -1, lt, { rise: Math.max(0.05, rise), shake: hit * 0.5 }); pikachu(230, 1110, 0.85, 1, lt, { ex: zap ? 'angry' : 'happy', zap, bob: 4 });
   brockT(890, 1480, 380, { label: 'BROCK', la: prog(lt, 0.2, 0.6) });
   if (zap) zapArc(300, 1010, 640, 790, lt, 9, 18);
   if (lt > 2.2 && lt < 3.4) { const q = prog(lt, 2.2, 3.4); sparks(640, 790, lt, 24, '#fff6a0', 2); X.save(); X.globalAlpha = 1 - q; for (let i = 0; i < 6; i++) { const a = PI + (i - 2.5) * 0.5; line([640, 790, 640 + Math.cos(a) * (120 + q * 160), 790 + Math.sin(a) * (120 + q * 160)], '#ffe04a', 8); } X.restore(); }
   X.setTransform(1, 0, 0, 1, 0, 0);
   hpBox(30, 260, 'PIKACHU', 12, 1, { c: '#ffe27a', t: lt }); hpBox(590, 260, 'ONIX', 12, 1, { c: '#c8ccd2', t: lt, a: prog(lt, 1.0, 1.4) });
   stamp('IMMUNE!', 540, 470, 96, '#c8ccd2', prog(lt, 2.5, 2.8), -0.06); stamp('ZERO DAMAGE', 400, 1290, 76, '#ff6a50', prog(lt, 3.3, 3.6), 0.05);
   return { tint: '#a0a0c0', tintA: 0.1, flash: (prog(lt, 2.18, 2.24) - prog(lt, 2.24, 2.6)) * 0.6 }; },
 // 5 jessie & james
 (lt, d) => { routeBG(lt, 40); const pop = Math.max(0.05, eo(prog(lt, 0.1, 0.5))), zT = 1.8, fly = eo(prog(lt, zT + 0.2, zT + 1.3));
   pikachu(540, 1290, 0.85, 1, lt, { ex: lt < zT ? 'angry' : 'happy', zap: lt > zT && lt < zT + 0.5, bob: 4 });
   if (fly < 1) { X.save(); X.translate(250 + fly * 500, 1300 - fly * 1050); X.rotate(fly * 6); X.scale(1 - 0.6 * fly, 1 - 0.6 * fly); jessieT(0, 0, 400 * pop, { label: fly > 0 ? undefined : 'JESSIE', la: prog(lt, 0.4, 0.8) }); X.restore();
     X.save(); X.translate(830 + fly * 130, 1300 - fly * 1150); X.rotate(-fly * 5); X.scale(1 - 0.6 * fly, 1 - 0.6 * fly); jamesT(0, 0, 400 * pop, { label: fly > 0 ? undefined : 'JAMES', la: prog(lt, 0.4, 0.8) }); X.restore(); }
   if (lt > 0.05 && lt < 0.7) { X.save(); X.globalAlpha = 1 - prog(lt, 0.05, 0.7); for (const cx of [250, 830]) for (let i = 0; i < 10; i++) { const a = i / 10 * 2 * PI, q = prog(lt, 0.05, 0.7); circ(cx + Math.cos(a) * 160 * q, 1120 + Math.sin(a) * 160 * q, 18, '#fff'); } X.restore(); }
   if (lt > zT && lt < zT + 0.5) { zapArc(480, 1115, 250, 1100, lt, 3, 14); zapArc(600, 1115, 830, 1100, lt, 4, 14); }
   if (lt > zT + 1.35) star4(900, 330, 90 * (1 + 0.25 * Math.sin(lt * 14)), prog(lt, zT + 1.35, zT + 1.6), lt);
   X.setTransform(1, 0, 0, 1, 0, 0); stamp('AGAIN?!', 540, 520, 110, '#ff4a3a', prog(lt, 0.9, 1.2) * (1 - prog(lt, 1.7, 1.9)), -0.06);
   return { tint: '#ffe0a0', tintA: 0.1, flash: (prog(lt, zT, zT + 0.05) - prog(lt, zT + 0.05, zT + 0.4)) * 0.8 }; },
 // 6 surfing pikachu
 (lt, d) => { beachBG(lt); const u = lt / d, px = lerp(160, 920, eo(u)), jump = prog(lt, 0.6, 1.5), py = 1190 + Math.sin(lt * 5) * 8 - 330 * Math.sin(jump * PI), rot = jump > 0 && jump < 1 ? jump * 2 * PI : 0;
   X.beginPath(); X.moveTo(px - 380, 1560); X.quadraticCurveTo(px - 250, 1260, px + 20, 1230); X.quadraticCurveTo(px + 210, 1210, px + 250, 1350); X.quadraticCurveTo(px + 80, 1300, px - 40, 1380); X.quadraticCurveTo(px + 120, 1420, px + 300, 1560); X.closePath(); inkFill('#2aa3d8', 7); line([px - 250, 1280, px + 20, 1235, px + 200, 1250], '#fff', 10);
   X.save(); X.translate(px, py); X.rotate(rot); X.beginPath(); X.ellipse(0, 12, 150, 20, 0, 0, 2 * PI); inkFill('#e8402e', 6); pikachu(0, 8, 0.6, 1, lt, { ex: 'happy', armUp: 1, bob: 3 }); X.restore();
   X.save(); for (let i = 0; i < 18; i++) { const q = (lt * 2 + i / 18) % 1; X.globalAlpha = 0.9 * (1 - q); circ(px - 100 - q * 220, 1330 - Math.sin(q * PI) * 60 + (R(i) - 0.5) * 40, 6 + R(i + 3) * 9, '#fff'); } X.restore();
   X.setTransform(1, 0, 0, 1, 0, 0); txt('SURFING PIKACHU', 540, 420, 76, '#fff', { w: 900, font: 'DejaVu Sans Mono', ls: 2, stroke: INK, sw: 18, glow: '#ffd24a', gb: 20 });
   txt('+1000', px, 760 - jump * 80, 64, '#ffe04a', { w: 900, stroke: INK, sw: 14, a: prog(lt, 1.2, 1.4) * (1 - prog(lt, 1.8, 2.1)) });
   return { tint: '#ffb070', tintA: 0.1 }; },
 // 7 never evolved / best friends
 (lt, d) => { sunsetHill(lt); const r = redTrainer(360, 1360, 420, { pose: 'stand', ex: 'smile', ph: lt }); pikachu(r.hx - 40, r.hy + 62, 0.38, 1, lt, { ex: 'happy', bob: 2 });
   const a = prog(lt, 0.2, 0.6) * (1 - prog(lt, 2.4, 2.8)); stone(760, 600, 1.5, a); X.save(); X.globalAlpha = a * prog(lt, 0.9, 1.2); line([690, 510, 830, 690], '#ff4a3a', 16); line([830, 510, 690, 690], '#ff4a3a', 16); X.restore();
   X.setTransform(1, 0, 0, 1, 0, 0); stamp('NO EVOLVING', 540, 860, 80, '#ffd93a', prog(lt, 1.0, 1.3) * (1 - prog(lt, 2.4, 2.8)), -0.05);
   if (lt > 2.8) for (let i = 0; i < 7; i++) { const q = (lt * 0.5 + i / 7) % 1; heart(300 + R(i) * 520, 1000 - q * 560, 0.8 + R(i + 2) * 0.5, '#ff6a9a', Math.sin(q * PI) * 0.9); }
   stamp('BEST FRIENDS', 540, 420, 88, '#ffffff', prog(lt, 3.0, 3.4), -0.04);
   return { tint: '#ff9a70', tintA: 0.15 }; },
 // 8 end card
 (lt, d) => { sunsetHill(lt); const q1 = eo(prog(lt, 0.2, 0.8));
   txt('DID YOU PLAY', 540, 340, 84, '#fff', { w: 900, ls: 6, stroke: INK, sw: 18, a: q1 }); X.save(); X.translate(540, 480); const k = 1 + 0.2 * (1 - q1); X.scale(k, k); txt('YELLOW?', 0, 0, 200, '#ffd93a', { w: 900, ls: 2, stroke: INK, sw: 40, glow: 'rgba(255,230,100,0.9)', gb: 40, a: q1 }); X.restore();
   const b = eo(prog(lt, 2.2, 2.8)); bolt(540, 760, 1.25 * (1 + 0.06 * Math.sin(lt * 8)) * b, '#ffd93a', 0.12 * Math.sin(lt * 3)); bolt(300, 780, 0.6 * b, '#ffe27a', -0.2); bolt(780, 780, 0.6 * b, '#ffe27a', 0.2);
   txt('COMMENT A BOLT', 540, 960, 64, '#fff', { w: 900, ls: 5, stroke: INK, sw: 14, a: prog(lt, 2.6, 3.1) });
   const c = eo(prog(lt, 4.6, 5.2)); X.save(); X.translate(540, 1085); X.scale(0.9 + 0.1 * c, 0.9 + 0.1 * c); txt('RG BRICK&STICKVERSE', 0, 0, 62, '#ffd24a', { w: 900, ls: 3, stroke: INK, sw: 16, glow: 'rgba(255,200,80,0.8)', gb: 24, a: c }); txt('FOLLOW FOR MORE MEMORY LANE', 0, 72, 34, '#fff', { w: 800, ls: 3, stroke: INK, sw: 10, a: c }); X.restore();
   pikachu(780, 1600, 0.62, -1, lt, { ex: 'happy', bob: 6 }); redTrainer(260, 1600, 340, { pose: 'point', ex: 'smile', ph: lt });
   return { tint: '#ff9a70', tintA: 0.12 }; },
];
const MEM = [null, 'NO BALL, THANKS', 'RIGHT BEHIND YOU', 'HIS FACE SAID IT ALL', 'ONIX VS PIKACHU', 'TEAM ROCKET AGAIN', 'SURFING PIKACHU', 'BEST FRIENDS FOREVER', null];
function frame(t) {
  X = X0; X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over'; X.clearRect(0, 0, W, H);
  let k = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= (j === 0 ? 0 : A(j) - 0.15)) k = j;
  const st = k === 0 ? 0 : A(k) - 0.15, en = k + 1 < SHOTS.length ? A(k + 1) - 0.15 : TIM.dur;
  X.save(); const o = SHOTS[k](t - st, en - st) || {}; X.restore();
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over';
  const ls = t - st; if (k > 0 && ls < 0.14) { X.globalAlpha = 0.9 * (1 - ls / 0.14); rect(0, 0, W, H, '#fff6d8'); X.globalAlpha = 1; }
  post(t, o); poster(0.9); brandTag(1);
  if (MEM[k]) { trail(k); memTag(k, MEM[k], prog(ls, 0.05, 0.3)); }
  captions(t);
  if (t > TIM.dur - 0.4) { X.globalAlpha = prog(t, TIM.dur - 0.4, TIM.dur); rect(0, 0, W, H, '#000'); X.globalAlpha = 1; }
}
window.frame = frame;
