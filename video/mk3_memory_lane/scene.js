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

function ninjaHead(cx, cy, r, col, a = 1) { X.save(); X.translate(cx, cy); X.globalAlpha *= a; circ(0, 0, r, '#14141c', CREAM, r * 0.1); X.beginPath(); X.arc(0, 0, r * 1.0, 0.05 * PI, 0.95 * PI); X.closePath(); X.fillStyle = col; X.fill(); X.strokeStyle = INK; X.lineWidth = r * 0.06; X.stroke(); X.strokeStyle = '#f4f4f4'; X.lineWidth = r * 0.28; X.beginPath(); X.moveTo(-r, -r * 0.6); X.lineTo(r, -r * 0.6); X.stroke(); circ(-r * 0.32, -r * 0.1, r * 0.1, '#fff'); circ(r * 0.32, -r * 0.1, r * 0.1, '#fff'); X.strokeStyle = '#fff'; X.lineWidth = r * 0.07; X.beginPath(); X.moveTo(-r * 0.55, -r * 0.3); X.lineTo(-r * 0.12, -r * 0.2); X.moveTo(r * 0.55, -r * 0.3); X.lineTo(r * 0.12, -r * 0.2); X.stroke(); X.restore(); }
const G = 1350, KO = [NIN.yel, NIN.blu, NIN.red, NIN.grn, NIN.pur, NIN.cya, NIN.ora, NIN.gry, NIN.wht];
const SHOTS = [
 // 0 title
 (lt, d) => { streetBG(lt); const a = prog(lt, 0.2, 0.8);
   liuKang(200, G, 440, { pose: 'stance', f: 1, ph: lt }); subZero(880, G, 440, { pose: 'stance', f: -1, ph: lt });
   const u = prog(lt, 0.5, 1.5); if (u > 0 && u < 1) { fireOrb(lerp(330, 520, u), 1060, 34, lt, 1); iceOrb(lerp(750, 560, u), 1060, 34, lt, -1); } else if (u >= 1) { burstFx(540, 1060, prog(lt, 1.5, 2.4), 0.6); }
   const k = 1 + 0.3 * (1 - eo(prog(lt, 0.2, 0.8)));
   X.save(); X.translate(540, 370); X.scale(k, k); txt('MORTAL', 0, 0, 125, '#ffcf40', { w: 900, ls: 6, stroke: INK, sw: 30, glow: 'rgba(255,60,40,0.9)', gb: 40, a }); txt('KOMBAT', 0, 120, 125, '#ffcf40', { w: 900, ls: 6, stroke: INK, sw: 30, glow: 'rgba(255,60,40,0.9)', gb: 40, a }); X.restore();
   const k3 = 1 + 0.5 * (1 - eo(prog(lt, 0.9, 1.4))); X.save(); X.translate(540, 700); X.scale(k3, k3); txt('3', 0, 0, 250, '#ff4a3a', { w: 900, stroke: INK, sw: 40, glow: 'rgba(255,90,60,0.9)', gb: 50, a: prog(lt, 0.9, 1.2) }); X.restore();
   X.save(); X.globalAlpha = prog(lt, 1.6, 2.1); rect(120, 850, 840, 96, 'rgba(20,6,10,0.88)'); X.strokeStyle = '#ffd24a'; X.lineWidth = 5; X.strokeRect(120, 850, 840, 96); txt('QUICK MEMORY LANE', 540, 899, 58, '#ffd24a', { w: 900, ls: 6 }); X.restore();
   return { tint: '#ff6a50', tintA: 0.12, flash: lt < 0.12 ? 0.7 : 0 }; },
 // 1 arcade
 (lt, d) => { arcadeBG(lt); const stt = lt < 2.2 ? 0 : lt < 3.4 ? 1 : 2; cabinet(580, 1450, 0.95, lt, stt);
   const u = prog(lt, 1.4, 2.15), out = lt > 3.2;
   stick({ x: 170, y: 1450, h: 400, f: 1, col: CREAM, cap: true, shirt: '#d84a3a', pants: '#4a5a8a', pose: out ? 'headdown' : (lt > 1.0 && lt < 2.2 ? 'reach' : 'stand'), ph: lt, ex: out ? 'sad' : 'smile', lw: 11 });
   if (lt < 1.4) coin(292, 1140, 22, lt * 10); else if (u < 1) coin(lerp(292, 580, u), lerp(1140, 1222, u) - 140 * Math.sin(u * PI), 22, lt * 16);
   if (lt > 2.1 && lt < 2.5) sparks(580, 1222, lt, 14, '#ffd24a', 1.5);
   X.setTransform(1, 0, 0, 1, 0, 0); stamp('1995', 175, 520, 88, '#ffd24a', prog(lt, 0.2, 0.6), -0.08);
   stamp('OUT OF QUARTERS', 540, 472, 58, '#ff6a50', prog(lt, 3.4, 3.7), -0.04);
   if (lt > 3.3) { X.save(); X.globalAlpha = prog(lt, 3.3, 3.6); coin(880, 1220, 30, 0); txt('x 0', 880, 1300, 54, '#fff', { w: 900, stroke: INK, sw: 12 }); X.restore(); }
   return { tint: '#c070ff', tintA: 0.14 }; },
 // 2 pick your fighter
 (lt, d) => { fillBG('#0a0c1c', '#1c0a2e'); X.save(); X.globalAlpha = 0.2; for (let i = 0; i < 12; i++) poly([i * 100 - 100, 0, i * 100 - 40, 0, i * 100 + 400, H, i * 100 + 300, H], i % 2 ? '#4a2a8a' : '#2a1a5a'); X.restore();
   const NM = ['LIU KANG', 'SUB-ZERO', 'SONYA', 'KANO', 'JAX', 'CYRAX', 'SEKTOR', 'KUNG LAO', 'SINDEL'];
   const s1 = [4, 5, 2, 1, 0], s2 = [8, 7, 4, 5, 1], i1 = Math.min(4, Math.floor(lt / 0.4)), i2 = Math.min(4, Math.floor((lt + 0.1) / 0.4)), lock = lt > 2.0;
   const cxs = [220, 540, 860], cys = [640, 940, 1240];
   for (let i = 0; i < 9; i++) { const cx = cxs[i % 3], cy = cys[Math.floor(i / 3)]; rect(cx - 140, cy - 140, 280, 280, '#101024'); X.strokeStyle = '#4a4a7a'; X.lineWidth = 4; X.strokeRect(cx - 140, cy - 140, 280, 280); portrait(cx, cy - 4, i, 0.82); rect(cx - 140, cy + 104, 280, 36, 'rgba(0,0,0,0.82)'); txt(NM[i], cx, cy + 123, 25, '#fff', { w: 900, ls: 2 }); }
   for (const [idx, col, tag] of [[s1[i1], '#ffd24a', 'P1'], [s2[i2], '#4a9aff', 'P2']]) { const cx = cxs[idx % 3] + (tag === 'P2' ? 6 : -6), cy = cys[Math.floor(idx / 3)]; X.save(); X.shadowColor = col; X.shadowBlur = 24; X.strokeStyle = col; X.lineWidth = lock ? 14 : 10; X.strokeRect(cx - 150, cy - 150, 300, 300); X.restore(); txt(tag, cx + (tag === 'P2' ? 100 : -100), cy - 118, 36, col, { w: 900, stroke: INK, sw: 10 }); }
   X.setTransform(1, 0, 0, 1, 0, 0); txt('CHOOSE YOUR FIGHTER', 540, 430, 58, '#ffd24a', { w: 900, ls: 5, stroke: INK, sw: 14, a: 1 - prog(lt, 1.2, 1.5) }); txt('EVERYONE HAD A MAIN', 540, 430, 58, '#fff', { w: 900, ls: 4, stroke: INK, sw: 14, a: prog(lt, 1.5, 1.8) });
   return { tint: '#a070ff', tintA: 0.1, flash: (prog(lt, 2.0, 2.05) - prog(lt, 2.05, 2.35)) * 0.5 }; },
 // 3 run button
 (lt, d) => { streetBG(lt); const run = prog(lt, 1.0, 2.4), ax = lerp(-160, 400, eo(run)), bx = lerp(1240, 680, eo(run)), clash = lt > 2.4;
   shadow(ax, G, 120, 0.5); shadow(bx, G, 120, 0.5);
   if (run > 0 && run < 1) for (let i = 0; i < 10; i++) { X.save(); X.globalAlpha = 0.35 * (1 - i / 10); line([ax - 80 - i * 34, 1060 + i * 26, ax - 240 - i * 34, 1060 + i * 26], '#fff', 5); line([bx + 80 + i * 34, 1060 + i * 26, bx + 240 + i * 34, 1060 + i * 26], '#fff', 5); X.restore(); }
   liuKang(ax, G, 440, { pose: clash ? 'punch' : 'run', ph: lt * 11, f: 1 }); subZero(bx, G, 440, { pose: clash ? 'block' : 'run', ph: lt * 11 + 1, f: -1 });
   if (clash) { burstFx(540, 1120, prog(lt, 2.4, 3.2)); sparks(540, 1120, lt, 22, '#fff4c0', 2); }
   X.setTransform(1, 0, 0, 1, 0, 0); const rm = lt < 1.0 ? 1 : 1 - 0.85 * run; fightHUD2(1, 1, lt, 99, 'LIU KANG', 'SUB-ZERO', rm, rm);
   const pp = prog(lt, 0, 0.3) * (1 - prog(lt, 1.0, 1.35)); if (pp > 0) { X.save(); X.globalAlpha = pp; X.translate(540, 840); const kk = 0.85 + 0.15 * eo(prog(lt, 0, 0.3)); X.scale(kk, kk); X.beginPath(); X.roundRect(-400, -200, 800, 400, 40); X.fillStyle = 'rgba(14,12,32,0.94)'; X.fill(); X.strokeStyle = '#d8c8a0'; X.lineWidth = 6; X.stroke();
     for (const [nm, bx2, by2, c] of [['HP', -250, -70, '#e8402e'], ['BLOCK', 0, -70, '#3aa0e8'], ['HK', 250, -70, '#f2c230'], ['LP', -250, 100, '#e8402e'], ['RUN', 0, 100, '#3aa860'], ['LK', 250, 100, '#f2c230']]) { const isRun = nm === 'RUN', pls = isRun ? 1 + 0.14 * Math.sin(lt * 16) : 1; X.save(); X.translate(bx2, by2); X.scale(pls, pls); if (isRun) glow(0, 0, 190, 'rgba(255,255,160,0.7)'); circ(0, 0, isRun ? 80 : 60, c, INK, 8); txt(nm, 0, 2, isRun ? 46 : 30, '#fff', { w: 900, stroke: INK, sw: 10 }); X.restore(); } X.restore(); }
   stamp('POW!', 540, 600, 130, '#ffe04a', prog(lt, 2.5, 2.8), -0.07);
   return { tint: '#ff6a50', tintA: 0.1, flash: (prog(lt, 2.38, 2.44) - prog(lt, 2.44, 2.8)) * 0.8 }; },
 // 4 combo
 (lt, d) => { streetBG(lt);
   const HT = [0.25, 0.6, 0.95, 1.35, 1.8, 2.25], n = HT.filter(h => lt >= h).length, last = HT[Math.max(0, n - 1)], since = lt - last;
   const apose = lt < 0.2 ? 'stance' : lt < 0.55 ? 'punch' : lt < 0.9 ? 'punch' : lt < 1.3 ? 'kick' : lt < 1.75 ? 'uppercut' : lt < 2.2 ? 'kick' : lt < 2.6 ? 'punch' : 'armsup';
   const jump = lt > 1.7 && lt < 2.3 ? Math.sin(prog(lt, 1.7, 2.3) * PI) * 220 : 0, ax = 380 + 50 * prog(lt, 0, 2.3);
   const jug = prog(lt, 1.35, 2.25), by0 = jug > 0 && jug < 1 ? -430 * Math.sin(jug * PI) : 0, lying = lt > 2.3, bx = 650 + 22 * Math.min(3, n) + (lt > 1.35 ? 40 : 0);
   shadow(ax, G, 120, 0.5); shadow(bx, G, 120, lying || by0 < -50 ? 0.25 : 0.5);
   liuKang(ax, G - jump, 440, { pose: apose, ph: lt * 6, f: 1 });
   if (lying) subZero(560, G - 40, 440, { pose: 'hit', f: -1, rot: PI / 2, shadow: false }); else subZero(bx, G + by0, 440, { pose: since < 0.25 || by0 < 0 ? 'hit' : 'stance', f: -1, rot: by0 < 0 ? -1.4 * jug : 0, ph: lt });
   for (const h of HT) if (lt >= h && lt < h + 0.35) { const q = (lt - h) / 0.35; sparks(bx - 60, G - 240 + (h > 1.3 ? by0 * 0.5 : 0), lt, 14, '#fff4c0', 2); X.save(); X.globalAlpha = 1 - q; X.beginPath(); X.arc(bx - 60, G - 240 + (h > 1.3 ? by0 * 0.5 : 0), 40 + 100 * q, 0, 2 * PI); X.strokeStyle = '#ffe8a0'; X.lineWidth = 12; X.stroke(); X.restore(); }
   X.setTransform(1, 0, 0, 1, 0, 0); fightHUD2(1, lerp(1, 0.35, eo(n / 6)), lt, 99, 'LIU KANG', 'SUB-ZERO', 0.55, 0.8);
   if (n > 0) { X.save(); X.translate(40, 480); const pk = 1 + 0.35 * (1 - eo(prog(since, 0, 0.15))); X.scale(pk, pk); txt(String(n), 0, 0, 150, '#ffd24a', { w: 900, al: 'left', stroke: INK, sw: 26 }); txt(n === 1 ? 'HIT' : 'HITS', 120 + (n > 9 ? 60 : 0), 28, 60, '#fff', { w: 900, al: 'left', stroke: INK, sw: 16, ls: 3 }); X.restore(); }
   stamp('COMBO!', 700, 640, 110, '#ff6a50', prog(lt, 2.3, 2.6), 0.07);
   return { tint: '#ff6a50', tintA: 0.08, flash: n > 0 ? (prog(since, 0, 0.03) - prog(since, 0.03, 0.14)) * 0.35 : 0 }; },
 // 5 finish him / babality
 (lt, d) => { streetBG(lt); X.save(); X.globalAlpha = 0.4 * prog(lt, 0.6, 1.0) * (1 - prog(lt, 2.6, 3.0)); rect(0, 0, W, H, '#600'); X.restore();
   const bt = Math.max(2.3, d - 1.15), baby = lt > bt; shadow(340, G, 120, 0.5); shadow(720, G, 110, 0.5);
   liuKang(340, G, 440, { pose: baby ? 'cross' : 'stance', f: 1, ph: lt, ex: baby ? 'smile' : 'angry' });
   if (!baby || lt < bt + 0.1) subZero(720, G, 380, { pose: 'cower', f: -1, ph: lt, ex: 'fear', a: 1 - prog(lt, bt - 0.02, bt + 0.1) });
   if (baby) { const k = eo(prog(lt, bt + 0.05, bt + 0.4)); babySZ(720, G, 1.25 * (0.4 + 0.6 * k) * (1 + 0.06 * Math.sin(lt * 10)), lt, { a: Math.min(1, k * 2) }); }
   poofFx(720, G - 150, prog(lt, bt, bt + 0.7));
   X.setTransform(1, 0, 0, 1, 0, 0); fightHUD2(0.4, 0.04, lt, 0, 'LIU KANG', 'SUB-ZERO', 0.4, 0.3);
   const fk = prog(lt, 0.9, 1.1) * (1 - prog(lt, bt - 0.2, bt)); X.save(); shake(lt, 6 * fk); finishText('FINISH HIM!', 540, 560, 118, fk); X.restore();
   if (baby) finishText('BABALITY!', 540, 560, 124, prog(lt, bt + 0.1, bt + 0.4), -0.04, ['#ffffff', '#ff9ad0', '#5a9aff'], '#ff9ad0');
   speech(880, 900, 'WAAH!', prog(lt, bt + 0.5, bt + 0.7), 50);
   return { tint: '#ff4a40', tintA: 0.12, flash: (prog(lt, bt - 0.02, bt + 0.03) - prog(lt, bt + 0.03, bt + 0.3)) * 0.8 }; },
 // 6 end card
 (lt, d) => { arcadeBG(lt); const q = eo(prog(lt, 0.2, 0.8));
   txt('WHO WAS', 540, 560, 100, '#fff', { w: 900, ls: 6, stroke: INK, sw: 20, a: q }); X.save(); X.translate(540, 720); const k = 1 + 0.2 * (1 - q); X.scale(k, k); txt('YOUR MAIN?', 0, 0, 138, '#ffcf40', { w: 900, ls: 3, stroke: INK, sw: 34, glow: 'rgba(255,90,60,0.9)', gb: 40, a: q }); X.restore();
   for (let i = 0; i < 9; i++) { const a = prog(lt, 1.0 + i * 0.12, 1.3 + i * 0.12); X.save(); X.globalAlpha = a; portrait(95 + i * 111, 910 + Math.sin(lt * 4 + i) * 8, i, 0.32); X.restore(); }
   const b = eo(prog(lt, 2.8, 3.4)); txt('COMMENT BELOW', 540, 1080, 70, '#fff', { w: 900, ls: 5, stroke: INK, sw: 16, a: b });
   const c = eo(prog(lt, 4.6, 5.2)); X.save(); X.translate(540, 1230); X.scale(0.9 + 0.1 * c, 0.9 + 0.1 * c); txt('RG BRICK&STICKVERSE', 0, 0, 62, '#ffd24a', { w: 900, ls: 3, stroke: INK, sw: 16, glow: 'rgba(255,200,80,0.8)', gb: 24, a: c }); txt('FOLLOW FOR MORE MEMORY LANE', 0, 72, 34, '#fff', { w: 800, ls: 3, stroke: INK, sw: 10, a: c }); X.restore();
   return { tint: '#c070ff', tintA: 0.12 }; },
];
const MEM = [null, 'OUT OF QUARTERS', 'PICK YOUR FIGHTER', 'THE RUN BUTTON', 'COMBO TIME', 'FINISH HIM!', null];
function frame(t) {
  X = X0; X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over'; X.clearRect(0, 0, W, H);
  let k = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= (j === 0 ? 0 : A(j) - 0.15)) k = j;
  const st = k === 0 ? 0 : A(k) - 0.15, en = k + 1 < SHOTS.length ? A(k + 1) - 0.15 : TIM.dur;
  X.save(); const o = SHOTS[k](t - st, en - st) || {}; X.restore();
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over';
  const ls = t - st; if (k > 0 && ls < 0.14) { X.globalAlpha = 0.9 * (1 - ls / 0.14); rect(0, 0, W, H, '#fff'); X.globalAlpha = 1; }
  post(t, o); poster(0.9); brandTag(1);
  if (MEM[k]) { trail(k, 5); memTag(k, MEM[k], prog(ls, 0.05, 0.3)); }
  captions(t);
  if (t > TIM.dur - 0.4) { X.globalAlpha = prog(t, TIM.dur - 0.4, TIM.dur); rect(0, 0, W, H, '#000'); X.globalAlpha = 1; }
}
window.frame = frame;
