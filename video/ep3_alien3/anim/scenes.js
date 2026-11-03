// Scenes. Each shot: {s: sentence index where it starts, cut: hard cut?, fn(lt, d, A)} where A(j)=local time of sentence j start.
function bigHeadMouth(x, y, r, f, on) { line([x + 0.1 * r * f, y + r * 0.42, x + 0.35 * r * f, y + r * 0.42], CREAM, r * 0.03); if (on < 0.5) { line([x + 0.0 * r * f, y - r * 0.12, x + 0.18 * r * f, y - r * 0.12], '#555', r * 0.03); } }
const RIP = (o) => Object.assign({ hair: !o.baldR, bald: !!o.baldR, label: o.label }, o);
const GF = 0; // ground default
function corridorSide(cx, t, o = {}) {
  fillBG(o.top || '#0b0d0c', o.bot || '#151a17');
  const c1 = o.c1 || '#1c221f', c2 = o.c2 || '#262e2a';
  for (let i = -4; i < 30; i++) { const x = i * 260 - (cx % 260); rect(x, 180, 250, 700, i % 2 ? c1 : c2); for (let k = 0; k < 4; k++) circ(x + 20, 220 + k * 180, 4, '#0b0d0c'); }
  line([-200, 240, 2200, 240], o.pipe || '#2f3a34', 22); line([-200, 280, 2200, 280], '#1a201d', 10);
  for (let i = -2; i < 16; i++) { const x = i * 520 - ((cx * 1.4) % 520); rect(x, 150, 34, 760, '#0a0c0b'); }
  for (let i = -4; i < 30; i++) { const x = i * 260 - (cx % 260), n = Math.floor(cx / 260) + i;
    if (n % 3 === 0) wallSign(x + 125, 330, 'C-' + String(((n % 40) + 40) % 40).padStart(2, '0'), '#9fb0a0', '#0c100e', 18);
    if (n % 4 === 1) { rect(x + 60, 560, 130, 70, '#0a0d0c'); for (let k = 0; k < 5; k++) rect(x + 70, 568 + k * 13, 110, 5, '#1d2420'); }
    if (n % 5 === 2) valve(x + 125, 240, 22, '#55302a', cx * 0.002 + n);
    if (n % 3 === 1) blinker(x + 230, 420, t, n % 2 ? '#ff3b2f' : '#57ff8a', 0.8, n); }
  line([-200, 760, 2200, 760], '#151b18', 12); line([-200, 790, 2200, 790], '#101412', 6);
  rect(-200, 880, 2400, 300, o.floor || '#0e110f'); line([-200, 880, 2200, 880], '#3a443e', 4);
  X.save(); X.beginPath(); X.rect(-200, 880, 2400, 22); X.clip(); hazard(-200, 880, 2400, 22, 0.45); X.restore();
  for (let i = -4; i < 30; i++) { const x = i * 130 - ((cx * 1.15) % 130); line([x, 905, x - 60, 1080], 'rgba(90,110,100,0.18)', 3); }
  rect(-200, 0, 2400, 180, '#060707'); line([-200, 180, 2200, 180], '#2a322d', 4);
  if (o.lights) for (let i = -2; i < 10; i++) { const x = i * 640 - ((cx) % 640); const on = !o.flick || Math.sin(t * 13 + i * 3) > -0.3; if (on) { glow(x + 200, 200, 300, o.lights); rect(x + 160, 184, 80, 8, '#ffe8c0'); } }
}
function streaks(t, n, a = 0.4, dir = 1) { X.save(); X.globalAlpha = a; for (let i = 0; i < n; i++) { const y = R(i) * H, x = ((R(i + 3) * W * 2 - t * 3000 * dir) % (W * 2) + W * 2) % (W * 2) - W / 2; rect(x, y, 300 + R(i + 5) * 400, 2, '#fff'); } X.restore(); }
function bars(t, n, a, vert = false, off = 0) { X.save(); X.globalAlpha = a; for (let i = 0; i < n; i++) { if (vert) rect(i * W / n + off, 0, W / n * 0.45, H, '#000'); else rect(0, i * H / n + off, W, H / n * 0.45, '#000'); } X.restore(); }
function blueprintGrid(col = 'rgba(120,180,255,0.12)') { fillBG('#04101c', '#020810'); X.strokeStyle = col; X.lineWidth = 1; X.beginPath(); for (let i = 0; i < 40; i++) { X.moveTo(i * 50, 0); X.lineTo(i * 50, H); } for (let j = 0; j < 24; j++) { X.moveTo(0, j * 50); X.lineTo(W, j * 50); } X.stroke(); }
function pathPt(pts, u) { let total = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); total += l; } let d = clamp(u) * total; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const k = d / seg[i]; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } d -= seg[i]; } return pts[pts.length - 1]; }
function drawPath(pts, c, w, u = 1, dash) { X.save(); if (dash) X.setLineDash(dash); X.beginPath(); X.moveTo(pts[0][0], pts[0][1]); let total = 0; for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); let rem = total * u; for (let i = 0; i < pts.length - 1 && rem > 0; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); const k = Math.min(1, rem / l); X.lineTo(lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)); rem -= l; } X.strokeStyle = c; X.lineWidth = w; X.lineCap = 'round'; X.lineJoin = 'round'; X.shadowColor = c; X.shadowBlur = 14; X.stroke(); X.restore(); }
function cryo(lt, red) {
  const bc = red ? `rgb(${Math.floor(lerp(8, 40, red))},${Math.floor(lerp(20, 6, red))},${Math.floor(lerp(36, 6, red))})` : '#081424';
  fillBG(bc, '#020509');
  for (let i = 0; i < 12; i++) rect(i * 180 - 60, 120, 18, 900, red ? '#1d0b08' : '#0c1a2c');
  rect(-200, 820, 2400, 400, '#05080c');
  const col = red ? `rgb(255,${Math.floor(lerp(195, 60, red))},${Math.floor(lerp(255, 40, red))})` : BLUE;
  const names = [['RIPLEY', 'r'], ['NEWT', 'n'], ['HICKS', 'h'], ['BISHOP', 'b']];
  names.forEach(([nm, k], i) => {
    const x = 330 + i * 420, y = 640;
    glow(x, y, 320, red ? 'rgba(255,60,40,0.3)' : 'rgba(108,195,255,0.28)');
    line([x, 470, x, 590], '#1c2733', 6); ekg(x - 90, 400, 180, 70, lt + i * 0.37, red ? RED : GREEN, red && (k === 'n' || k === 'h') ? clamp(red * 1.4) : 0);
    rect(x - 150, 700, 300, 26, '#121a22'); for (let q = 0; q < 5; q++) circ(x - 110 + q * 55, 713, 5, Math.sin(lt * 3 + q + i) > 0 ? (red ? RED : BLUE) : '#0d1a26');
    pod(x, y, 1, col, { glass: 0 });
    X.save(); X.beginPath(); X.ellipse(x, y, 160, 46, 0, 0, 2 * PI); X.clip();
    stick({ x: x + (k === 'n' ? 80 : 115), y: y + 10, h: k === 'n' ? 150 : 220, rot: -PI / 2, col: CREAM, hair: k === 'r', pig: k === 'n', android: k === 'b', lw: 6, gb: 8, p: { ht: 0 }, ex: 'closed' });
    X.restore();
    X.save(); X.globalAlpha = 0.22; X.beginPath(); X.ellipse(x, y - 6, 140, 34, 0, 0, 2 * PI); X.fillStyle = col; X.fill(); X.restore();
  });
  return names;
}
function capsuleEEV(x, y, s, rot, fire) {
  X.save(); X.translate(x, y); X.rotate(rot); X.scale(s, s);
  if (fire) { X.save(); X.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { X.globalAlpha = 0.5 * (1 - i / 14); circ(-60 - i * 22, (R(i) - 0.5) * 20, 30 - i, i < 4 ? '#fff0a0' : '#ff7a30'); } X.restore(); }
  poly([-60, -26, 40, -30, 70, 0, 40, 30, -60, 26], '#4a4f57'); rect(10, -10, 30, 12, '#8fd0ff'); line([-60, -26, -60, 26], '#22252a', 6);
  X.restore();
}
function bishopPieces(x, y, s, a = 1) { X.save(); X.globalAlpha *= a; X.translate(x, y); X.scale(s, s); X.strokeStyle = CREAM; X.lineWidth = 8; X.lineCap = 'round';
  circ(-90, -20, 26, DARK, CREAM, 7); line([-60, -10, 20, 0], CREAM, 8); line([20, 0, 70, -30], CREAM, 8); line([40, 30, 110, 40], CREAM, 8);
  X.strokeStyle = 'rgba(200,240,255,0.9)'; X.lineWidth = 2; X.beginPath(); for (let i = 0; i < 5; i++) { X.moveTo(-64, -10); X.lineTo(-50 + i * 6, 10 + R(i) * 18); } X.stroke(); X.restore(); }

const SCENES = [
// ================= SCENE 1 =================
[
 { s: 0, fn(lt, d) { fillBG('#010205', '#04060c'); camL([960, 540, 1], [990, 545, 1.12], lt / d); stars(lt * 25, 0, 500, 0.3, lt); glow(1500, 300, 900, 'rgba(60,40,120,0.12)'); ship(1000 - lt * 14, 560, 1.15, lt); X.setTransform(1, 0, 0, 1, 0, 0); txt('USS SULACO', 960, 860, 34, CREAM, { ls: 10, a: prog(lt, 0.6, 1.6) * 0.8, w: 700 }); return {}; } },
 { s: 1, fn(lt, d, A) { camL([900, 560, 1.05], [1060, 560, 1.12], lt / d); const nm = cryo(lt, 0);
   const times = [A(1) + 0.3, A(1) + 2.0, A(1) + 3.6, A(1) + 4.6]; nm.forEach(([n], i) => label(n, 330 + i * 420, 570, prog(lt, times[i], times[i] + 0.4), BLUE));
   if (lt > A(2)) txt('A FAMILY AGAIN?', 960, 300, 54, CREAM, { a: prog(lt, A(2) + 0.4, A(2) + 1.2) * 0.9, ls: 8, glow: BLUE });
   return { tint: '#3a78c0', tintA: 0.25 }; } },
 { s: 3, fn(lt, d) { const red = prog(lt, 0.3, 2.5); camL([960, 560, 1.12], [960, 600, 1.2], lt / d); cryo(lt, red);
   if (red > 0.5 && Math.sin(lt * 9) > 0) { X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 0.18; rect(0, 0, W, H, RED); X.globalAlpha = 1; }
   return { tint: red > 0.5 ? '#ff3020' : '#3a78c0', tintA: 0.3 }; } },
 { s: 4, cut: true, fn(lt, d) { fillBG('#120403', '#050101'); camL([960, 540, 1], [980, 540, 1.6], lt / d);
   for (let i = 0; i < 3; i++) { const y = 420 + i * 120; X.beginPath(); X.moveTo(-200, y); X.bezierCurveTo(600, y - 80, 1200, y + 120, 2200, y - 30); X.strokeStyle = ['#2b2b30', '#3a2420', '#25252a'][i]; X.lineWidth = 70; X.stroke(); X.strokeStyle = 'rgba(255,255,255,0.08)'; X.lineWidth = 6; X.stroke(); }
   circ(980, 540, 55, '#1a0503'); flames(980, 560, 260, 360, lt, 30, 1); sparks(980, 520, lt, 26); sparks(1000, 520, lt + 0.37, 16);
   glow(980, 520, 500, 'rgba(255,80,30,0.5)');
   X.setTransform(1, 0, 0, 1, 0, 0); if (Math.sin(lt * 8) > 0.2) { X.globalAlpha = 0.25; rect(0, 0, W, H, RED); X.globalAlpha = 1; }
   txt('⚠ EMERGENCY — EEV LAUNCH', 960, 160, 44, RED, { a: prog(lt, d * 0.45, d * 0.5) * (Math.sin(lt * 8) > -0.3 ? 1 : 0.3), ls: 6, glow: RED, font: 'DejaVu Sans Mono' });
   return { flash: lt < 0.15 ? 0.6 : 0 }; } },
 { s: 5, cut: true, fn(lt, d) { fillBG('#010205', '#070308'); const p = lt / d; X.save(); shake(lt, 4 + 16 * prog(lt, d * 0.6, d)); camL([960, 540, 1], [1000, 600, 1.15], p);
   stars(lt * 30, 0, 300, 0.4, lt); planet(1250, 1550, 1050, lt); ship(380 - lt * 20, 160, 0.4, lt, 1);
   const u = eo(p * 1.05); const x = lerp(470, 1250, u), y = lerp(200, 680, u * u);
   capsuleEEV(x, y, 1.1 - 0.4 * u, lt * 3.2, true);
   X.restore(); txt('FIORINA 161', 1400, 860, 40, '#ffb27a', { ls: 10, a: prog(lt, 1, 2) * 0.85 });
   const fl = prog(lt, d - 0.7, d - 0.35) - prog(lt, d - 0.35, d);
   return { flash: fl, flashc: '#fff2e0' }; } },
 { s: 6, cut: true, fn(lt, d, A) { fillBG('#1c0a06', '#4a1e10'); camL([960, 600, 1.15], [960, 620, 1.05], lt / d);
   glow(1400, 500, 900, 'rgba(255,120,50,0.25)');
   rect(-500, 690, 3000, 110, '#2a1009'); for (let i = 0; i < 14; i++) { const wy = 700 + i * 8; X.globalAlpha = 0.25; line([-500, wy + 3 * Math.sin(lt * 1.2 + i), 2500, wy + 3 * Math.sin(lt * 1.2 + i + 1)], '#ff9a5c', 2); X.globalAlpha = 1; }
   for (let i = 0; i < 3; i++) { const rx = lerp(-80, 260, eo(prog(lt, 1.5, 6))) + i * 90; stick({ x: rx, y: 790, h: 170, bald: true, prisoner: true, col: '#1a0d08', glowc: 'rgba(255,200,120,0.7)', pose: 'walk', ph: lt * 4 + i, headFill: '#0d0705', face: false }); glow(rx + 40, 700, 70, 'rgba(255,230,160,0.6)'); }
   rect(-500, 800, 3000, 600, '#0f0705');
   for (let i = 0; i < 9; i++) { X.save(); X.translate(700 + i * 110 + R(i) * 40, 860 + R(i + 2) * 40); X.rotate(R(i + 5) * 3); poly([-18, -6, 22, -10, 14, 12, -16, 8], '#2b2e33'); X.restore(); }
   for (let i = 0; i < 20; i++) poly([i * 120 - 200, 800, i * 120 - 120, 760 - R(i) * 40, i * 120 - 40, 800], '#160a06');
   X.save(); X.translate(1500, 790); X.rotate(-0.3); poly([-260, 0, -200, -150, 180, -160, 250, 0], '#2b2e33'); rect(-120, -110, 90, 40, '#120d0a'); X.restore();
   flames(1500, 770, 320, 260, lt, 20, 0.8); steam(1500, 700, lt, 300, 0.22);
   const a0 = A(6);
   stick(RIP({ x: 560, y: 820, h: 240, rot: -PI / 2, ex: 'closed', label: 'RIPLEY · ALIVE', la: prog(lt, 0.5, 1), ly: 150, lx: -120 }));
   stick({ x: 1000, y: 830, h: 240, rot: PI / 2 + 0.1, col: GREY, ex: 'closed', label: 'HICKS · KILLED', la: prog(lt, 2.3, 2.7), lc: '#d77', ly: 150, lx: 120 });
   stick({ x: 880, y: 860, h: 140, rot: -PI / 2, col: GREY, pig: true, ex: 'closed', label: 'NEWT · KILLED', la: prog(lt, 2.8, 3.2), lc: '#d77', ly: 10, lx: -60 });
   bishopPieces(1200, 850, 1, 1); label('BISHOP · IN PIECES', 1260, 760, prog(lt, 3.6, 4), BLUE);
   particles(lt, { n: 60, c: '#ffb070', a: 0.6, up: true, sp: 50, r: 3, add: true });
   return { tint: '#ff7030', tintA: 0.2 }; } },
 { s: 7, cut: true, fn(lt, d) { fillBG('#0c1013', '#030405'); camL([960, 600, 1], [960, 640, 1.3], lt / d);
   lamp(960, 180, 460, 800, 'rgb(200,230,255)', lt, 0.3); rect(-200, 840, 2400, 400, '#06080a');
   rect(700, 720, 520, 18, '#3b4048'); line([730, 738, 730, 840], '#3b4048', 10); line([1190, 738, 1190, 840], '#3b4048', 10);
   ekg(1300, 520, 200, 80, lt, GREEN); line([1400, 600, 1400, 840], '#2a3036', 8); line([600, 380, 600, 840], '#3a4048', 5); rect(570, 380, 60, 90, 'rgba(160,210,255,0.25)'); line([600, 470, 900, 690], 'rgba(200,220,240,0.4)', 2);
   stick(RIP({ x: 1100, y: 716, h: 300, rot: -PI / 2, gb: 4, ex: 'closed' }));
   X.setTransform(1, 0, 0, 1, 0, 0); txt('EVERYTHING SHE FOUGHT TO SAVE — GONE', 960, 200, 40, CREAM, { a: prog(lt, 1.5, 2.5) * 0.85, ls: 6, w: 600 });
   return { desat: 0.35 + 0.5 * prog(lt, 0, d), flash: 0 }; } },
],
// ================= SCENE 2 =================
[
 { s: 0, fn(lt, d) { fillBG('#0d1316', '#05080a'); camL([960, 560, 1], [860, 600, 1.35], lt / d);
   for (let i = 0; i < 10; i++) rect(i * 220 - 40, 120, 200, 700, i % 2 ? '#0f171b' : '#111b20'); rect(-200, 820, 2400, 400, '#070a0c');
   for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const dx = 1480 + c * 110, dy = 380 + r * 120; rect(dx, dy, 100, 105, '#1a2328'); rect(dx + 30, dy + 45, 40, 8, '#55646c'); txt(String(r * 4 + c + 1).padStart(2, '0'), dx + 50, dy + 22, 16, '#7d8d95', { w: 600, font: 'DejaVu Sans Mono' }); }
   rect(120, 330, 220, 160, '#0a1218'); X.save(); X.globalAlpha = 0.55; rect(130, 340, 200, 140, '#a8c8dc'); X.restore(); X.save(); X.globalAlpha = 0.6; X.strokeStyle = '#123'; X.lineWidth = 4; for (let k = 0; k < 5; k++) { X.beginPath(); X.arc(230, 420 + k * 6, 40 + k * 8, PI * 1.15, PI * 1.85); X.stroke(); } X.restore();
   wallSign(1700, 320, 'INFIRMARY · MORGUE', '#9fb8c8', '#0b1216', 18);
   lamp(1060, 170, 380, 700, 'rgb(205,235,255)', lt, 0.25); sheetBody(1080, 720, 0.85);
   stick(RIP({ x: 760, y: 830, h: 320, f: 1, pose: 'headdown', ph: lt }));
   return { tint: '#5a8fb0', tintA: 0.25, desat: 0.3 }; } },
 { s: 2, fn(lt, d, A) { fillBG('#0d1316', '#05080a'); camL([960, 560, 1.05], [960, 560, 1.12], lt / d);
   for (let i = 0; i < 10; i++) rect(i * 220 - 40, 120, 200, 700, i % 2 ? '#0f171b' : '#111b20'); rect(-200, 820, 2400, 400, '#070a0c');
   for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const dx = 1480 + c * 110, dy = 380 + r * 120; rect(dx, dy, 100, 105, '#1a2328'); rect(dx + 30, dy + 45, 40, 8, '#55646c'); txt(String(r * 4 + c + 1).padStart(2, '0'), dx + 50, dy + 22, 16, '#7d8d95', { w: 600, font: 'DejaVu Sans Mono' }); }
   rect(120, 330, 220, 160, '#0a1218'); X.save(); X.globalAlpha = 0.55; rect(130, 340, 200, 140, '#a8c8dc'); X.restore(); X.save(); X.globalAlpha = 0.6; X.strokeStyle = '#123'; X.lineWidth = 4; for (let k = 0; k < 5; k++) { X.beginPath(); X.arc(230, 420 + k * 6, 40 + k * 8, PI * 1.15, PI * 1.85); X.stroke(); } X.restore();
   wallSign(1700, 320, 'INFIRMARY · MORGUE', '#9fb8c8', '#0b1216', 18);
   lamp(960, 170, 380, 700, 'rgb(205,235,255)', lt, 0.25); sheetBody(960, 720, 0.85);
   stick(RIP({ x: 600, y: 830, h: 320, f: 1 }));
   stick({ x: 1330, y: 830, h: 330, f: -1, coat: true, pose: 'talk', ph: lt * 3, label: 'CLEMENS · DOCTOR', la: prog(lt, 0.3, 0.8) });
   stamp('NEWT — DROWNED', 960, 250, 40, CREAM, prog(lt, 1.6, 2.0));
   stamp('HICKS — FATAL INJURIES', 960, 350, 40, CREAM, prog(lt, 3.6, 4.0));
   return { tint: '#5a8fb0', tintA: 0.25, desat: 0.3 }; } },
 { s: 3, cut: true, fn(lt, d, A) { fillBG('#0a0f12', '#030506'); camL([1000, 540, 1], [1080, 520, 1.25], lt / d);
   const bl = 14 * (1 - prog(lt, 0.5, 1.8));
   X.filter = `blur(${bl.toFixed(1)}px)`; pod(1000, 520, 3.2, BLUE, { glass: 0.15 });
   X.save(); X.translate(1180, 470); circ(0, 0, 70, '#050505'); for (let i = 0; i < 9; i++) { const a = i / 9 * 2 * PI; line([0, 0, Math.cos(a) * (90 + R(i) * 80), Math.sin(a) * (60 + R(i + 1) * 50)], '#120806', 8); }
   glow(0, 0, 120, 'rgba(255,120,40,0.35)'); X.restore(); X.filter = 'none';
   if (lt > A(4) - 0.3) { X.save(); X.globalAlpha = 0.35 * prog(lt, A(4), A(4) + 1) * (0.7 + 0.3 * Math.sin(lt * 3)); facehugger(1180, 470, 220, lt); X.restore(); }
   X.setTransform(1, 0, 0, 1, 0, 0); stick(RIP({ x: 260, y: 1180, h: 900, col: '#1c1c1c', pose: 'point', glow: false, headFill: '#0a0a0a' }));
   const hb = Math.pow(Math.max(0, Math.sin(lt * 7.2)), 12); X.globalAlpha = 0.18 * hb; X.drawImage(vigC, 0, 0); X.globalCompositeOperation = 'source-over'; X.globalAlpha = 1;
   return { tint: '#4b7fa6', tintA: 0.2 }; } },
 { s: 5, cut: true, fn(lt, d, A) { fillBG('#0b1214', '#030506'); camL([960, 600, 1.1], [960, 600, 1.0], lt / d);
   rect(-200, 840, 2400, 400, '#06090a'); lamp(960, 200, 420, 700, 'rgb(190,255,210)', lt, 0.1); sheetBody(960, 740, 1.1);
   stick({ x: 1340, y: 850, h: 330, f: -1, coat: true, pose: 'hold', label: 'AUTOPSY', la: prog(lt, 0.3, 0.8) });
   const sx = 760 + 400 * (0.5 + 0.5 * Math.sin(lt * 1.6)); X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha = 0.5; rect(sx - 4, 600, 8, 140, GREEN); glow(sx, 680, 140, 'rgba(80,255,140,0.4)'); X.restore();
   stamp('NO EMBRYO FOUND', 960, 340, 58, GREEN, prog(lt, A(6) - 0.1, A(6) + 0.4));
   return { tint: '#5aa080', tintA: 0.2, desat: 0.2 }; } },
 { s: 7, cut: false, fn(lt, d) { fillBG('#120604', '#050201'); camL([960, 560, 1], [1060, 520, 1.3], lt / d);
   furnace(960, 820, 760, 600, lt, 1); rect(-200, 820, 2400, 400, '#0b0504');
   rect(640, 760, 260, 16, '#2a1a12'); X.globalAlpha = 0.9; sheetBody(770, 760, 0.6); X.globalAlpha = 1;
   stick(RIP({ x: 1400, y: 830, h: 380, f: -1, col: '#111', glowc: 'rgba(255,140,60,0.8)', gb: 22, pose: 'headdown', headFill: '#080404' }));
   particles(lt, { n: 90, c: '#d9d2c8', a: 0.5, up: true, sp: 30, r: 3, dx: 0.3 });
   particles(lt + 3, { n: 40, c: '#ffb050', a: 0.8, up: true, sp: 60, r: 3, add: true });
   return { tint: '#ff7a30', tintA: 0.25 }; } },
],
// ================= SCENE 3 =================
[
 { s: 0, fn(lt, d, A) { fillBG('#4a1a0a', '#b0521f'); camL([960, 380, 0.85], [960, 620, 1.15], lt / d);
   glow(960, 900, 1300, 'rgba(255,140,60,0.35)');
   const blocks = [[-300, 360, 600], [250, 200, 760], [900, 120, 840], [1500, 260, 700], [2000, 380, 560]];
   for (const [x, y, w] of blocks) { rect(x, y, w, 1400, '#120705'); for (let i = 0; i < 18; i++) if (R(x + i) > 0.55) rect(x + 30 + (i % 6) * (w / 6), y + 60 + Math.floor(i / 6) * 120, 20, 30, 'rgba(255,170,80,0.7)'); }
   for (let i = 0; i < 4; i++) { const x = 400 + i * 420; rect(x, -300, 70, 520, '#0c0504'); steam(x + 35, -260, lt + i, 80, 0.35); }
   rect(-600, 1000, 3200, 600, '#090403');
   X.setTransform(1, 0, 0, 1, 0, 0);
   txt('FIORINA 161', 960, 480, 90, CREAM, { ls: 22, glow: 'rgba(255,120,50,0.8)', gb: 30, a: prog(lt, 0.8, 1.8) * (1 - prog(lt, A(1) - 0.5, A(1))) });
   txt('FOUNDRY · PRISON · OPERATED FOR WEYLAND-YUTANI', 960, 200, 38, '#ffb07a', { ls: 6, a: prog(lt, A(1), A(1) + 0.6), w: 700 });
   return { tint: '#ff7a30', tintA: 0.2 }; } },
 { s: 2, fn(lt, d, A) { const p = lt / d; industrial(lt, { cx: p * 300 }); camL([780, 560, 1], [1000, 520, 1.25], p);
   rect(-500, 860, 3200, 500, '#0d0604');
   for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { const s = 0.45 + r * 0.1, x = 330 + i * 160 + (r % 2) * 80, y = 600 + r * 70; stick({ x, y, h: 300 * s, col: lerp(0, 1, 1) && ['#5a5550', '#76706a', '#8f897f'][r], bald: true, ph: lt * 1.5 + i, glow: false, p: { ht: 0.04 * Math.sin(lt * 1.2 + i) } }); }
   brazier(220, 900, lt, 1.2); brazier(1780, 900, lt + 1, 1.2); glow(1000, 760, 380, 'rgba(255,200,140,0.25)'); stick({ x: 1000, y: 960, h: 470, f: -1, pose: 'preach', ph: lt, bald: true, glasses: true, lw: 13, label: 'DILLON', la: prog(lt, 0.8, 1.3) });
   bars(lt, 9, 0.35, false, (lt * 10) % 120); X.setTransform(1, 0, 0, 1, 0, 0);
   txt('STRICT RELIGIOUS CODE · VOWS OF CELIBACY', 960, 250, 36, '#ffcf9a', { ls: 5, a: prog(lt, 1.6, 2.4) * 0.9, w: 700 });
   return { tint: '#ff8a40', tintA: 0.22 }; } },
 { s: 3, cut: true, fn(lt, d) { const half = d * 0.5;
   if (lt < half) { industrial(lt, { cx: 0 }); camL([960, 560, 1], [900, 560, 1.1], lt / half); rect(-500, 860, 3200, 500, '#0d0604');
     for (let i = 0; i < 7; i++) stick({ x: 1000 + i * 140, y: 860, h: 280, f: -1, col: '#8f897f', bald: true, glow: false, p: { ht: -0.15 } });
     stick(RIP({ x: lerp(160, 620, eo(lt / half)), y: 870, h: 320, pose: lt < half * 0.9 ? 'walk' : 'stand', ph: lt * 6, label: 'RIPLEY', la: 1 }));
     return { tint: '#ff8a40', tintA: 0.22 }; }
   const q = (lt - half) / (d - half); fillBG('#150906', '#050201'); camL([960, 540, 1.1], [960, 540, 1.2], q);
   bigHead(960, 460, 230, { bald: q > 0.65, f: 1, ex: 'sad' });
   if (q < 0.8) { X.save(); X.globalAlpha = 1 - prog(q, 0.4, 0.8); X.strokeStyle = CREAM; X.lineWidth = 22; X.beginPath(); X.arc(950, 450, 270, PI * 0.75, PI * 1.95); X.stroke(); X.restore(); }
   particles(lt * 2, { n: 70, c: CREAM, a: 0.7 * (1 - prog(q, 0.7, 1)), sp: 120, r: 4 });
   X.save(); X.translate(lerp(1300, 1100, q), lerp(200, 380, q)); X.rotate(0.6); rect(-30, -90, 60, 180, '#3a3a3a'); rect(-30, -100, 60, 16, '#888'); X.restore();
   return { tint: '#ff8a40', tintA: 0.15, desat: 0.2 }; } },
 { s: 4, cut: true, fn(lt, d, A) { industrial(lt, { cx: lt * 20, glowc: 'rgba(255,70,30,0.25)' }); X.globalAlpha = 0.55; rect(-500, -500, 3000, 2200, '#000'); X.globalAlpha = 1;
   camL([960, 540, 1], [960, 540, 1.06], lt / d);
   if (lt < A(5) - 0.2) { rifleIcon(960, 470, 2.2, '#cfc8bc'); slash(960, 470, 300, prog(lt, 0.8, 1.2)); stamp('NO FIREARMS', 960, 860, 64, RED, prog(lt, 1.2, 1.6)); }
   else { const q = lt - A(5);
     for (let i = 0; i < 3; i++) stick({ x: 300 + i * 150, y: 820, h: 280, pose: 'gun', gunHeld: true, col: '#9fd49f', a: prog(q, 0, 0.5) });
     txt('COLONIAL MARINES', 450, 900, 34, '#9fd49f', { a: prog(q, 0, 0.5), ls: 4 });
     line([960, 300, 960, 900], '#555', 4);
     for (let i = 0; i < 3; i++) stick({ x: 1320 + i * 150, y: 820, h: 280, col: GREY, bald: true, p: { la: -0.4, ra: 0.4 }, a: prog(q, 0.6, 1.1) });
     txt('PRISONERS', 1470, 900, 34, GREY, { a: prog(q, 0.6, 1.1), ls: 4 });
     slash(1470, 640, 120, prog(q, 1.6, 2)); rifleIcon(1470, 640, 0.6, '#666'); }
   return { tint: '#ff5a30', tintA: 0.2 }; } },
 { s: 6, cut: true, fn(lt, d) { fillBG('#0d0503', '#030101'); camL([960, 560, 1.15], [960, 560, 1.0], lt / d);
   glow(560, 500, 600, 'rgba(255,130,50,0.35)'); glow(1360, 500, 600, 'rgba(255,130,50,0.35)');
   rect(-200, 860, 2400, 400, '#080302');
   stick({ x: 560, y: 880, h: 380, f: 1, bald: true, glasses: true, lw: 13, pose: lt > d * 0.5 ? 'cross' : 'stand', label: 'DILLON' });
   stick(RIP({ x: 1360, y: 880, h: 340, f: -1, baldR: true, label: 'RIPLEY' }));
   rect(860, -200, 200, 1600, '#000'); bars(lt, 8, 0.25, true, 0);
   txt('FIGHT — OR SURRENDER?', 960, 150, 46, '#ffcf9a', { ls: 8, a: prog(lt, d * 0.55, d * 0.7), w: 800 });
   return { tint: '#ff7a30', tintA: 0.2 }; } },
],
// ================= SCENE 4 =================
[
 { s: 0, fn(lt, d) { camL([960, 540, 1], [960, 540, 1.05], lt / d);
   X.save(); X.beginPath(); X.rect(0, 0, 955, H); X.clip(); fillBG('#120604', '#050201'); furnace(480, 840, 520, 460, lt, 0.9); rect(-200, 840, 1400, 400, '#0b0504');
   stick({ x: 230, y: 860, h: 300, bald: true, glasses: true, pose: 'preach', ph: lt, lw: 11, col: '#1a1a1a', glowc: 'rgba(255,140,60,0.9)', headFill: '#070303' });
   for (let i = 0; i < 3; i++) stick({ x: 700 + i * 90, y: 860, h: 240, f: -1, bald: true, col: '#1a1a1a', glowc: 'rgba(255,140,60,0.7)', headFill: '#070303', pose: 'headdown' });
   txt('THE FUNERAL', 480, 260, 34, '#ffcf9a', { ls: 6 }); X.restore();
   X.save(); X.beginPath(); X.rect(965, 0, 955, H); X.clip(); fillBG('#0a0c0b', '#030404'); for (let i = 0; i < 5; i++) rect(1000 + i * 190, 200, 160, 640, '#121614');
   rect(900, 840, 1100, 400, '#060707'); lamp(1440, 200, 180, 600, 'rgb(200,220,180)', lt, 0.5); dog(1440, 860, 140, { lying: true, f: -1 });
   facehugger(1330, 810, 60, lt, prog(lt, 1.5, 2.5) * 0.6);
   txt('MEANWHILE…', 1440, 260, 34, '#cfd8c8', { ls: 6 }); X.restore();
   rect(955, 0, 10, H, '#000'); return { tint: '#ff7a30', tintA: 0.12 }; } },
 { s: 1, cut: true, fn(lt, d) { fillBG('#0a0c0b', '#020303'); const p = lt / d; X.save(); shake(lt, p > 0.6 ? 3 : 0); camL([960, 600, 1.4], [960, 640, 1.05], p);
   rect(-200, 860, 2400, 400, '#050606'); lamp(960, 260, 220, 600, 'rgb(200,220,180)', lt, 0.6);
   dog(1000, 880, 260, { lying: true, f: -1, a: 1 - prog(p, 0.75, 0.95) });
   facehugger(780, 760, 120, lt, 1 - prog(p, 0.45, 0.6)); label('FACEHUGGER', 780, 690, prog(lt, 0.4, 0.9) * (1 - prog(p, 0.45, 0.6)), '#e6c99a');
   if (p > 0.62) alien({ x: lerp(950, 1350, eo(prog(p, 0.62, 1))), y: 880, s: lerp(40, 110, prog(p, 0.62, 1)), f: 1, mode: 'crouch', ph: lt * 3, jaw: 0.4 });
   X.restore(); const fl = p > 0.6 && p < 0.65 ? 0.5 : 0;
   return { tint: '#7a9070', tintA: 0.15, flash: fl, flashc: '#000' }; } },
 { s: 2, cut: true, fn(lt, d, A) { const ceil = lt > A(3) + 0.8; const cx = lt * 1400;
   corridorSide(cx, lt, { lights: 'rgba(255,190,110,0.25)', flick: true });
   const ph = lt * 9;
   if (!ceil) alien({ x: 900 + Math.sin(lt * 0.8) * 60, y: 880, s: 150, f: 1, mode: 'run', ph, jaw: 0.15 });
   else alien({ x: 1000 + Math.sin(lt * 0.8) * 60, y: 182, s: 150, f: 1, mode: 'run', ph, flipY: true });
   X.setTransform(1, 0, 0, 1, 0, 0); streaks(lt, 18, 0.25);
   if (lt < A(3)) { txt('FOUR LEGS · INCREDIBLE SPEED', 960, 150 - 0, 34, AMBER, { a: prog(lt, A(2) + 1.2, A(2) + 1.6), ls: 6 }); txt('INCREDIBLE SPEED', 960, 980 - 0, 34, AMBER, { a: prog(lt, A(2) + 2.4, A(2) + 2.8) * 0, ls: 6 }); }
   return { tint: '#6a8060', tintA: 0.15 }; } },
 { s: 4, cut: true, fn(lt, d) { corridorSide(0, lt, { lights: 'rgba(255,190,110,0.18)', flick: true }); camL([960, 560, 1.05], [960, 560, 1.15], lt / d);
   stick({ x: 520, y: 880, h: 330, f: 1, bald: true, prisoner: true, col: GREY, pose: lt > d * 0.5 ? 'cower' : 'hold', qmark: prog(lt, d * 0.55, d * 0.7) });
   glow(640, 690, 260, 'rgba(255,240,180,0.25)');
   const u = prog(lt, d * 0.35, d * 0.5); if (u > 0 && u < 1) { alien({ x: lerp(2200, -400, u), y: 880, s: 160, f: -1, mode: 'run', ph: lt * 12, a: 0.95 }); }
   return { tint: '#6a8060', tintA: 0.15 }; } },
 { s: 5, cut: true, fn(lt, d) { fillBG('#0d0b09', '#030202'); const p = lt / d; camL([960, 520, 1.0], [960, 560, 1.18], p);
   fan(1050, 470, 390, lt, 1.4); rect(-200, 880, 2400, 400, '#050404');
   stick({ x: 980, y: 885, h: 300, f: -1, col: '#0e0e0e', glowc: 'rgba(255,230,180,0.9)', gb: 18, headFill: '#050505', pose: 'hold', label: 'MURPHY', la: prog(lt, 0.4, 0.9), lc: '#ffe9c0' });
   alien({ x: lerp(200, 640, eo(prog(p, 0.3, 0.8))), y: 885, s: 130, f: 1, mode: 'crouch', ph: lt * 2, rimA: 0.7, jaw: 0.5 * prog(p, 0.6, 0.8) });
   return { tint: '#c09060', tintA: 0.15, flash: prog(p, 0.86, 0.9), flashc: '#000' }; } },
 { s: 6, cut: true, fn(lt, d) { industrial(lt, { cx: lt * 40 }); camL([960, 560, 1.05], [960, 540, 1.0], lt / d); rect(-500, 860, 3200, 500, '#0d0604');
   for (let i = 0; i < 6; i++) stick({ x: 300 + i * 260 + Math.sin(lt * 0.3 + i) * 30, y: 870, h: 250, bald: true, prisoner: true, col: GREY, glow: false, pose: i % 2 ? 'walk' : 'stand', ph: lt * 4 + i });
   alien({ x: lerp(-300, 2300, prog(lt, d * 0.3, d * 0.9)), y: 300, s: 70, f: 1, mode: 'run', ph: lt * 8, rimA: 0.35 });
   return { tint: '#ff7a30', tintA: 0.2 }; } },
],
// ================= SCENE 5 =================
[
 { s: 0, fn(lt, d) { const p = lt / d; fillBG('#120806', '#2a140c'); glow(1300, 500, 900, 'rgba(255,120,60,0.2)'); camL([900, 560, 1], [1100, 560, 1.1], p);
   chains(lt, p * 300, '#2a1a12'); junk(lt, p * 200, 10, 760, '#1a0e09'); rect(-500, 860, 3200, 500, '#0c0705'); junk(lt, p * 500, 40, 900, '#0a0604');
   stick(RIP({ x: lerp(600, 1150, p), y: 880, h: 300, baldR: true, pose: p < 0.8 ? 'walk' : 'stand', ph: lt * 5 }));
   bishopPieces(1420, 870, 1.2, prog(p, 0.4, 0.6)); fgPipe(p * 600, lt); label('BISHOP', 1320, 840, prog(p, 0.7, 0.85), BLUE);
   steam(1000, 1000, lt, 1800, 0.1);
   return { tint: '#ff7a30', tintA: 0.2 }; } },
 { s: 1, cut: true, fn(lt, d) { const p = lt / d; fillBG('#100705', '#050201'); camL([960, 600, 1.25], [960, 600, 1.35], p);
   junk(lt, 0, 70, 800, '#1a0e09'); rect(-500, 860, 3200, 500, '#0c0705');
   const cl = eo(prog(p, 0, 0.45)), rec = eo(prog(p, 0.6, 0.85));
   stick(RIP({ x: 960, y: 880, h: 300, baldR: true, pose: p > 0.3 ? 'cower' : 'stand' }));
   [[-1, 520, 0], [-1, 660, 1], [1, 1300, 2]].forEach(([sd, x0, i]) => stick({ x: lerp(x0, 960 + sd * (170 + i * 50), cl) + sd * -rec * -0 + (rec * 300 * (sd < 0 ? -1 : 1)) * 1, y: 880, h: 320, f: sd < 0 ? 1 : -1, col: GREY, bald: true, pose: rec > 0 ? 'walk' : 'push', ph: lt * 4, a: 1 - rec * 0.7 }));
   if (p > 0.45) stick({ x: lerp(2100, 1250, eo(prog(p, 0.45, 0.62))), y: 880, h: 380, f: -1, bald: true, glasses: true, lw: 13, pose: p < 0.7 ? 'push' : 'stand', label: 'DILLON', la: prog(p, 0.55, 0.65) });
   X.setTransform(1, 0, 0, 1, 0, 0); X.save(); X.globalAlpha = 0.9; poly([0, 0, 380, 0, 220, H, 0, H], '#050302'); poly([W, 0, W - 300, 0, W - 180, H, W, H], '#050302'); X.restore();
   return { tint: '#ff5a30', tintA: 0.2 }; } },
 { s: 2, cut: true, fn(lt, d) { fillBG('#050a07', '#010302'); camL([960, 540, 1.0], [960, 500, 1.25], lt / d);
   lamp(960, 120, 300, 700, 'rgb(140,255,170)', lt, 0.15);
   const on = prog(lt, d * 0.45, d * 0.6);
   bigHead(960, 470, 170, { eyec: on > 0.5 ? BLUE : '#333', f: -1, eyes: on > 0.5 }); X.save(); X.strokeStyle = 'rgba(160,220,255,0.7)'; X.lineWidth = 3; X.beginPath(); X.moveTo(840, 560); X.lineTo(880, 560); X.lineTo(880, 590); X.moveTo(860, 610); X.lineTo(910, 610); X.lineTo(910, 625); X.stroke(); circ(880, 590, 5, 'rgba(160,220,255,0.8)'); circ(910, 625, 5, 'rgba(160,220,255,0.8)'); line([835, 380, 860, 400, 860, 430], 'rgba(160,220,255,0.5)', 3); X.restore(); bigHeadMouth(960, 470, 170, -1, on);
   for (let i = 0; i < 5; i++) { X.beginPath(); X.moveTo(940 + i * 10, 840); X.bezierCurveTo(940 + i * 10, 960, 1300 + i * 30, 900, 1500 + i * 20, 1000); X.strokeStyle = ['#2a6', '#a22', '#444', '#26a', '#aa2'][i]; X.lineWidth = 8; X.stroke(); }
   rect(1440, 860, 260, 160, '#1c2220'); for (let i = 0; i < 4; i++) circ(1480 + i * 55, 900, 10, Math.sin(lt * 5 + i) > 0 ? GREEN : '#133');
   if (lt > d * 0.3 && lt < d * 0.55) sparks(950, 850, lt * 2, 12, '#bfffd0');
   label('BISHOP · REACTIVATED', 960, 260, on, BLUE);
   return { tint: '#40c070', tintA: 0.25 }; } },
 { s: 3, cut: true, fn(lt, d, A) { fillBG('#000', '#000'); monitor(960, 540, 1700, 920, ['> SULACO FLIGHT RECORDER // ACCESS', '> CRYO BAY: ELECTRICAL FIRE', '> EEV LAUNCHED  →  FIORINA 161', '!> ORGANISM ON BOARD', '!> CONFIRMED: TRAVELED WITH SURVIVORS'], lt, GREEN, { cps: 22 });
   X.save(); X.translate(1450, 760); X.globalAlpha = prog(lt, A(4) - 0.5, A(4)); X.strokeStyle = GREEN; X.lineWidth = 3; X.shadowColor = GREEN; X.shadowBlur = 10; X.beginPath(); X.ellipse(0, 0, 220, 70, 0, 0, 2 * PI); X.stroke(); X.restore();
   if (lt > A(4)) { X.save(); X.globalAlpha = 0.9 * (0.6 + 0.4 * Math.sin(lt * 6)); alien({ x: 1460, y: 790, s: 45, f: 1, mode: 'crouch', rim: RED, ph: lt }); X.restore(); }
   vhs(lt, 0.6); return { tint: '#30ff80', tintA: 0.1 }; } },
 { s: 5, cut: true, fn(lt, d) { fillBG('#000', '#000'); monitor(960, 420, 1700, 640, ['> FLIGHT DATA TRANSMITTED TO: WEYLAND-YUTANI', '> STATUS: RECEIVED', '!> THEY KNOW', '!> THEY WANT THE CREATURE'], lt, GREEN, { cps: 24 });
   X.save(); X.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const r = ((lt * 220 + i * 120) % 720); X.globalAlpha = 0.5 * (1 - r / 720); X.beginPath(); X.arc(260, 820, r, -PI / 2.2, -PI / 8); X.strokeStyle = GREEN; X.lineWidth = 5; X.stroke(); } X.restore();
   circ(260, 820, 30, '#2a1408', '#ff9a3c', 4); txt('FIORINA 161', 260, 880, 24, '#ffb07a', { ls: 3 }); txt('→ COMPANY', 1660, 860, 30, GREEN, { ls: 4 });
   vhs(lt, 0.4); return { tint: '#30ff80', tintA: 0.1 }; } },
 { s: 7, cut: true, fn(lt, d) { fillBG('#08100b', '#020403'); camL([960, 540, 1], [900, 520, 1.25], lt / d);
   glow(900, 450, 700, 'rgba(120,255,160,0.12)');
   bigHead(820, 470, 230, { bald: true, f: 1, ex: 'firm' });
   X.save(); X.globalAlpha = 1 - prog(lt, 1.5, 4); bigHead(1450, 760, 90, { eyec: BLUE, f: -1 }); X.restore();
   txt('WHY IS RESCUE SO IMPORTANT?', 960, 150, 44, CREAM, { ls: 6, a: prog(lt, 1.5, 2.5) * 0.85, w: 700 });
   return { tint: '#40c070', tintA: 0.2, desat: 0.2 }; } },
],
// ================= SCENE 6 =================
[
 { s: 0, fn(lt, d) { const p = lt / d; corridorSide(p * 500, lt, { lights: 'rgba(160,255,190,0.15)', top: '#050807', c1: '#0e1511', c2: '#121a15' }); camL([960, 560, 1.0], [1000, 560, 1.1], p);
   const atk = prog(p, 0.55, 0.62);
   if (p < 0.75) { stick({ x: 760 + p * 300, y: 880, h: 300, bald: true, prisoner: true, col: GREY, pose: 'hold', ph: lt * 5, label: 'BOGGS', la: prog(lt, 0.3, 0.8) }); stick({ x: 1060 + p * 300, y: 880, h: 300, bald: true, prisoner: true, col: GREY, pose: 'walk', ph: lt * 5, label: 'RAINS', la: prog(lt, 0.5, 1) }); glow(1000 + p * 300, 700, 240, 'rgba(255,240,180,0.3)'); }
   alien({ x: 1720, y: lerp(-200, 182, eo(prog(p, 0.4, 0.58))), s: 140, f: -1, mode: 'crouch', flipY: true, ph: lt * 3, jaw: 0.8 * atk });
   const strobe = p > 0.6 && p < 0.8 && Math.sin(lt * 40) > 0 ? 0.85 : 0;
   return { tint: '#50a070', tintA: 0.2, flash: strobe, flashc: '#000' }; } },
 { s: 1, cut: true, fn(lt, d) { fillBG('#050807', '#010202'); camL([960, 600, 1.2], [960, 620, 1.4], lt / d); rect(-200, 880, 2400, 400, '#030404'); for (let i = 0; i < 3; i++) rect(1100 + i * 200, 100, 30, 800, '#0c120f');
   glow(900, 760, 360, 'rgba(150,255,190,0.12)');
   stick({ x: 900 + Math.sin(lt * 60) * 3, y: 885, h: 330, bald: true, prisoner: true, col: GREY, pose: 'cower', label: 'GOLIC · THE WITNESS', la: prog(lt, 0.4, 0.9), lc: '#d9e6dc' });
   return { tint: '#50a070', tintA: 0.2, desat: 0.3 }; } },
 { s: 2, cut: true, fn(lt, d) { fillBG('#160b07', '#060302'); camL([960, 560, 1], [1060, 560, 1.12], lt / d); for (let i = 0; i < 8; i++) rect(i * 260, 150, 240, 700, '#1a0f0a'); rect(-200, 860, 2400, 400, '#090504'); lamp(960, 160, 260, 720, 'rgb(255,200,140)', lt);
   stick(RIP({ x: 640, y: 880, h: 320, baldR: true, pose: 'point' }));
   stick({ x: 1300, y: 880, h: 340, f: -1, cap: true, pose: 'cross', p: { ht: 0.12 * Math.sin(lt * 3) }, label: 'SUPT. ANDREWS', la: prog(lt, 0.3, 0.8) });
   stamp('"NO MONSTER."', 1300, 330, 46, '#ffcf9a', prog(lt, 1.4, 1.8));
   return { tint: '#ff8a40', tintA: 0.2 }; } },
 { s: 3, cut: true, fn(lt, d) { const p = lt / d; fillBG('#0c1214', '#030506'); camL([960, 560, 1], [960, 520, 1.12], p); for (let i = 0; i < 9; i++) rect(i * 230 - 50, 150, 210, 700, '#0f171a'); rect(-200, 860, 2400, 400, '#06080a');
   rect(720, 140, 260, 50, '#020202'); line([720, 190, 980, 190], '#333', 4);
   lamp(1350, 180, 260, 700, 'rgb(205,235,255)', lt, 0.4);
   rect(1180, 700, 380, 16, '#3b4048'); stick(RIP({ x: 1520, y: 696, h: 280, baldR: true, rot: -PI / 2 + 0.3, gb: 5 }));
   const yk = eo(prog(p, 0.62, 0.75));
   stick({ x: 860, y: lerp(880, 150, yk), h: 330, coat: true, pose: yk > 0 ? 'fall' : 'talk', ph: lt * 2, label: 'CLEMENS', la: prog(lt, 0.3, 0.7) * (1 - yk), a: 1 - prog(p, 0.74, 0.76) });
   alien({ x: 850, y: lerp(-120, 190, eo(prog(p, 0.35, 0.6))), s: 120, f: 1, mode: 'crouch', flipY: true, ph: lt * 2, jaw: prog(p, 0.5, 0.62) });
   return { tint: '#6aa0c0', tintA: 0.2, flash: prog(p, 0.74, 0.76) - prog(p, 0.82, 0.9), flashc: '#000' }; } },
 { s: 4, cut: true, fn(lt, d, A) { const p = lt / d; fillBG('#020202', '#000'); camL([960, 520, 1.0], [880, 500, 1.18], prog(lt, 0, A(5) + 1.5));
   const approach = eo(prog(lt, 0, A(5) - 0.5)), leave = eo(prog(lt, A(5) + 0.8, d - 0.3));
   bigHead(560, 520, 210, { bald: true, f: 1, eyes: lt < A(5) + 0.2 || lt > A(5) + 1.2, ex: 'fear', tear: lt > A(5) ? lt * 0.4 : 0 });
   glow(560, 520, 400, 'rgba(255,150,70,0.08)');
   alien({ x: lerp(2700, 1600, approach) + leave * 1300, y: 950, s: 380, f: -1, mode: 'stand', ph: lt, jaw: 0.3 + 0.5 * prog(lt, A(5) - 1, A(5)) * (1 - leave), rimA: 0.9, ha: 0.1 });
   if (lt > A(5) - 0.6 && lt < A(5) + 1.6) { X.save(); X.globalAlpha = 0.8; const dy = ((lt * 120) % 140); line([620 + 160, 470 + dy * 0.2, 620 + 160, 520 + dy], 'rgba(220,220,200,0.6)', 3); X.restore(); }
   txt('INCHES FROM HER FACE…', 960, 120, 40, AMBER, { ls: 6, a: prog(lt, A(5) - 0.6, A(5)) * (1 - prog(lt, A(5) + 2, A(5) + 2.6)), w: 700 });
   txt('…AND IT LEAVES.', 960, 120, 40, AMBER, { ls: 6, a: prog(lt, A(5) + 2.6, A(5) + 3.2), w: 700 });
   return { tint: '#ff8a40', tintA: 0.12 }; } },
 { s: 6, cut: true, fn(lt, d) { fillBG('#050505', '#000'); camL([960, 600, 1.1], [960, 600, 1.2], lt / d); glow(960, 700, 400, 'rgba(255,230,190,0.12)'); rect(-200, 880, 2400, 400, '#030303');
   stick(RIP({ x: 960, y: 880, h: 320, baldR: true, qmark: prog(lt, 0.3, 0.8) }));
   return { desat: 0.4 }; } },
 { s: 7, cut: true, fn(lt, d, A) { const p = lt / d; industrial(lt, { glowc: 'rgba(255,110,40,0.3)' }); camL([960, 560, 1], [1060, 480, 1.15], p); rect(-500, 860, 3200, 500, '#0d0604');
   rect(1150, 100, 300, 60, '#000'); line([1150, 160, 1450, 160], '#552', 4);
   for (let i = 0; i < 7; i++) stick({ x: 200 + i * 120, y: 880, h: 240, bald: true, prisoner: true, col: GREY, glow: false, f: 1 });
   const run = eo(prog(p, 0, 0.35)); stick(RIP({ x: lerp(-100, 900, run), y: 880, h: 300, baldR: true, pose: run < 1 ? 'run' : 'point', ph: lt * 9 }));
   const yk = eo(prog(p, 0.6, 0.72));
   stick({ x: 1300, y: lerp(880, 120, yk), h: 340, f: -1, cap: true, pose: yk > 0 ? 'fall' : 'talk', ph: lt * 2, a: 1 - prog(p, 0.71, 0.73), label: 'ANDREWS', la: (1 - yk) * prog(lt, 0.3, 0.7) });
   return { tint: '#ff7a30', tintA: 0.2, flash: prog(p, 0.72, 0.74) - prog(p, 0.84, 0.95), flashc: '#000' }; } },
],
// ================= SCENE 7 =================
[
 { s: 0, fn(lt, d) { const p = lt / d; fillBG('#140a06', '#050201'); camL([960, 560, 1.05, -0.03], [960, 560, 1.15, 0.03], p);
   for (let i = 0; i < 4; i++) { X.save(); X.translate(260 + i * 470, 330); X.strokeStyle = 'rgba(240,220,190,0.35)'; X.lineWidth = 3; X.strokeRect(-180, -120, 360, 240); for (let k = 0; k < 5; k++) { X.beginPath(); X.moveTo(-160, -90 + k * 45); X.lineTo(-160 + R(i * 9 + k) * 300, -90 + k * 45 + (R(k) - 0.5) * 30); X.stroke(); } X.restore(); }
   lamp(960, 120, 300, 700, 'rgb(255,190,120)', lt); rect(-200, 880, 2400, 400, '#080402');
   rect(620, 740, 680, 20, '#3a2418'); line([660, 760, 660, 880], '#3a2418', 12); line([1260, 760, 1260, 880], '#3a2418', 12);
   stick(RIP({ x: 520, y: 885, h: 320, baldR: true, pose: 'point', label: 'RIPLEY', la: prog(lt, 0.3, 0.8) }));
   stick({ x: 1420, y: 885, h: 360, f: -1, bald: true, glasses: true, lw: 12, pose: 'talk', ph: lt * 2, label: 'DILLON', la: prog(lt, 0.5, 1) });
   for (let i = 0; i < 4; i++) stick({ x: 760 + i * 130, y: 885, h: 220, bald: true, col: '#5c5650', glow: false });
   return { tint: '#ff8a40', tintA: 0.2 }; } },
 { s: 2, cut: true, fn(lt, d, A) { industrial(lt, { cx: lt * 30 }); X.globalAlpha = lt < A(3) ? 0.7 : 0.25; rect(-500, -500, 3000, 2200, '#000'); X.globalAlpha = 1; camL([960, 540, 1], [960, 540, 1.05], lt / d);
   if (lt < A(3)) { rifleIcon(420, 480, 1.2, '#cfc8bc'); flamerIcon(960, 480, 1.1, '#cfc8bc'); rect(1360, 400, 260, 160, '#4a5040'); txt('MILITARY', 1490, 480, 30, '#cfc8bc', { ls: 3 });
     [420, 960, 1490].forEach((x, i) => slash(x, 480, 170, prog(lt, 0.4 + i * 0.9, 0.7 + i * 0.9)));
     ['PULSE RIFLES', 'FLAMETHROWERS', 'EQUIPMENT'].forEach((s, i) => txt(s, [420, 960, 1490][i], 720, 32, CREAM, { a: prog(lt, 0.4 + i * 0.9, 0.7 + i * 0.9), ls: 4 })); }
   else txt('ONLY ADVANTAGE: THE FOUNDRY ITSELF', 960, 520, 54, '#ffcf9a', { ls: 6, a: prog(lt, A(3) + 0.2, A(3) + 0.8), glow: '#ff7a30', w: 800 });
   return { tint: '#ff7a30', tintA: 0.2 }; } },
 { s: 4, cut: true, fn(lt, d) { blueprintGrid('rgba(255,160,80,0.08)'); const pts = [[180, 820], [520, 820], [520, 420], [980, 420], [980, 640], [1420, 640], [1420, 300], [1700, 300]];
   drawPath([[180, 820], [520, 820], [520, 420], [980, 420], [980, 640], [1420, 640], [1420, 300], [1760, 300]], 'rgba(255,160,80,0.25)', 60);
   for (const pp of [[300, 600, 520, 600], [980, 200, 980, 420], [1200, 640, 1200, 900]]) line(pp, 'rgba(255,160,80,0.2)', 60);
   const u = prog(lt, 0.8, d - 1); drawPath(pts, AMBER, 6, u, [20, 14]);
   const [ax, ay] = pathPt(pts, u); circ(ax, ay, 16, RED); glow(ax, ay, 60, 'rgba(255,60,40,0.6)');
   X.strokeStyle = AMBER; X.lineWidth = 4; X.strokeRect(1640, 200, 220, 200); txt('CONTAINMENT', 1750, 440, 28, AMBER, { ls: 4 });
   txt('VENTILATION SYSTEM — FIRE ROUTE', 960, 100, 40, '#ffcf9a', { ls: 6, font: 'DejaVu Sans Mono', w: 600 });
   return { tint: '#ff8a40', tintA: 0.1 }; } },
 { s: 5, cut: true, fn(lt, d) { const p = lt / d; corridorSide(p * 300, lt, { lights: 'rgba(255,190,110,0.2)' }); camL([960, 560, 1.05], [1000, 560, 1.12], p);
   X.save(); X.globalAlpha = 0.5; X.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) rect(300 + i * 260 - p * 300, 360 + R(i) * 120, 200 * prog(lt, i * 0.6, i * 0.6 + 2), 200, 'rgba(255,170,60,0.3)'); X.restore();
   for (let i = 0; i < 4; i++) { const x = 400 + i * 360 - p * 300; stick({ x, y: 880, h: 300, bald: true, prisoner: true, col: GREY, pose: 'paint', ph: lt * 3 + i, glow: false }); rect(x - 80, 830, 50, 50, '#3a2a1a'); }
   return { tint: '#ff8a40', tintA: 0.15 }; } },
 { s: 6, cut: true, fn(lt, d) { const p = lt / d;
   if (p < 0.6) { const q = p / 0.6; fillBG('#090504', '#020101'); camL([960, 540, 1.1], [960, 700, 1.2], q);
     X.save(); X.translate(960, lerp(160, 900, q * q)); X.rotate(lt * 3); rect(-14, -70, 28, 140, '#7a1a10'); X.restore(); const fy = lerp(160, 900, q * q);
     glow(960, fy, 360, 'rgba(255,50,30,0.6)'); sparks(960, fy, lt * 1.5, 20, '#ff6040', 2); stick({ x: 760, y: 600, h: 500, col: '#111', glowc: 'rgba(255,60,40,0.7)', p: { ra: 1.6, re: 0 }, headFill: '#070303' });
     return { tint: '#ff3020', tintA: 0.25 }; }
   blueprintGrid('rgba(255,60,40,0.12)'); const pts = [[180, 820], [520, 820], [520, 420], [980, 420], [980, 640], [1420, 640], [1420, 300], [1700, 300]];
   drawPath(pts, Math.sin(lt * 14) > 0 ? RED : '#ff9a3c', 22, 1); txt('IGNITION', 960, 540, 90, RED, { ls: 20, glow: RED, gb: 40 });
   return { tint: '#ff3020', tintA: 0.3 }; } },
 { s: 7, cut: true, fn(lt, d) { const p = lt / d; X.save(); shake(lt, 6); tunnel(lt, 1.5, { rc: '150,90,50', top: '#0a0503', bot: '#140805' });
   const fr = eo(prog(p, 0, 0.7)); const rr = 120 + 1100 * fr;
   X.save(); X.globalCompositeOperation = 'lighter'; const fg = X.createRadialGradient(960, 520, 0, 960, 520, rr); fg.addColorStop(0, 'rgba(255,250,210,1)'); fg.addColorStop(0.25, 'rgba(255,190,80,0.9)'); fg.addColorStop(0.6, 'rgba(230,80,20,0.6)'); fg.addColorStop(1, 'rgba(120,20,0,0)'); X.fillStyle = fg; X.fillRect(0, 0, W, H);
   for (let i = 0; i < 90; i++) { const ang = R(i + 2) * 2 * PI, life = (lt * 1.3 + R(i)) % 1, d0 = rr * (0.35 + 0.6 * life); const x = 960 + Math.cos(ang) * d0 * 1.4, y = 520 + Math.sin(ang) * d0, sz = (30 + 70 * R(i + 9)) * (1 - life) * (0.4 + fr);
     X.save(); X.translate(x, y); X.rotate(ang + PI / 2); X.globalAlpha = 0.5 * (1 - life); X.fillStyle = life < 0.4 ? '#ffe08a' : '#ff7a2a'; X.beginPath(); X.moveTo(-sz * 0.4, 0); X.quadraticCurveTo(-sz * 0.4, -sz, 0, -sz * 2); X.quadraticCurveTo(sz * 0.4, -sz, sz * 0.4, 0); X.closePath(); X.fill(); X.restore(); }
   X.restore(); sparks(960, 600, lt, 30, '#ffd27a', 2); flames(960, 1080, 1900, 300 * fr + 60, lt, 40, 1);
   for (let i = 0; i < 3; i++) { const u = prog(p, 0.1 + i * 0.15, 0.6 + i * 0.1); if (u > 0 && u < 1) stick({ x: 760 + i * 200 + (i - 1) * u * 500, y: 640 + u * 600, h: 120 + u * 700, col: '#0a0a0a', glowc: 'rgba(255,150,60,1)', gb: 25, pose: 'run', ph: lt * 10 + i, headFill: '#050505' }); }
   X.restore(); return { tint: '#ff6020', tintA: 0.3 }; } },
],
// ================= SCENE 8 =================
[
 { s: 0, fn(lt, d) { fillBG('#0a1012', '#030405'); camL([960, 560, 1], [900, 560, 1.12], lt / d); for (let i = 0; i < 9; i++) rect(i * 230 - 50, 150, 210, 700, '#0d1416'); rect(-200, 860, 2400, 400, '#05080a');
   X.save(); X.strokeStyle = '#4a5560'; X.lineWidth = 30; X.beginPath(); X.arc(1250, 880, 300, PI, 2 * PI); X.stroke(); X.restore(); glow(1250, 700, 300, 'rgba(120,255,170,0.15)');
   stick(RIP({ x: 1250, y: 885, h: 320, baldR: true, pose: 'stomach', ph: lt, f: -1 }));
   stick({ x: 600, y: 885, h: 330, glasses: true, bald: true, pose: 'hold', label: 'AARON · "85"', la: prog(lt, 0.4, 0.9) });
   rect(640, 720, 160, 110, '#1a2022'); rect(655, 732, 130, 70, Math.sin(lt * 4) > 0 ? '#0a3a1c' : '#0a2a16');
   return { tint: '#60b090', tintA: 0.2, desat: 0.2 }; } },
 { s: 1, cut: true, fn(lt, d) { blueprintGrid('rgba(80,255,140,0.08)'); fillBG('rgba(0,10,4,0.6)', 'rgba(0,10,4,0.6)'); camL([960, 540, 1], [960, 470, 1.35], prog(lt, 0, d));
   stick({ x: 960, y: 960, h: 760, col: GREEN, glowc: 'rgba(80,255,140,0.8)', gb: 20, bald: true, lw: 10, headFill: '#02140a' });
   const st = Math.floor(prog(lt, 0.6, 2.6) * 4) / 4;
   X.save(); X.globalAlpha = st; alien({ x: 985, y: 470, s: 40, f: -1, mode: 'crouch', rim: GREEN, ph: lt, rot: 0.6, jaw: 0.2 }); X.restore();
   glow(960, 480, 160, `rgba(255,60,40,${0.3 * st})`);
   stamp('QUEEN EMBRYO', 960, 160, 60, RED, prog(lt, 2.6, 3.0));
   for (let i = 0; i < H; i += 8) { X.globalAlpha = 0.08; rect(-200, i, 2400, 3, '#000'); } X.globalAlpha = 1;
   return { tint: '#30ff80', tintA: 0.1, flash: (prog(lt, 2.55, 2.6) - prog(lt, 2.6, 3.0)) * 0.5, flashc: '#ff2010' }; } },
 { s: 2, cut: true, fn(lt, d, A) { fillBG('#020202', '#000'); camL([960, 520, 1.05], [960, 520, 1.12], lt / d);
   bigHead(560, 520, 200, { bald: true, f: 1, ex: 'fear' }); alien({ x: 1610, y: 950, s: 380, f: -1, mode: 'stand', ph: lt, jaw: 0.4, ha: 0.1 });
   X.setTransform(1, 0, 0, 1, 0, 0); txt('NOT MERCY.', 1300, 160, 54, CREAM, { ls: 8, a: prog(lt, A(3) - 0.2, A(3) + 0.4), w: 800 });
   txt('PROTECTING ITS FUTURE QUEEN.', 1250, 240, 40, RED, { ls: 6, a: prog(lt, A(4), A(4) + 0.6), w: 700, glow: RED });
   return { tint: '#ff8a40', tintA: 0.1 }; } },
 { s: 5, cut: true, fn(lt, d, A) { fillBG('#071012', '#020405'); camL([960, 600, 1.2], [960, 600, 0.78], prog(lt, A(6) - 0.5, d));
   const n = lt < A(6) ? 1 : lt < A(7) - 0.4 ? 3 : 21; const cols = n === 1 ? 1 : n === 3 ? 3 : 7;
   for (let k = 0; k < n; k++) { const c = k % cols, r = Math.floor(k / cols); const x = 960 + (c - (cols - 1) / 2) * 230, y = 600 + (r - (Math.ceil(n / cols) - 1) / 2) * 300;
     X.save(); X.globalAlpha = prog(lt, (n === 21 ? A(7) - 0.4 : 0) + k * 0.05, (n === 21 ? A(7) : 0.5) + k * 0.05);
     rect(x - 70, y - 130, 140, 260, 'rgba(120,255,200,0.12)'); X.strokeStyle = 'rgba(160,255,210,0.5)'; X.lineWidth = 4; X.strokeRect(x - 70, y - 130, 140, 260); rect(x - 80, y + 130, 160, 24, '#2a3436');
     alien({ x: x + 10, y: y + 40, s: 26, f: -1, mode: 'crouch', ph: lt + k, rim: GREEN, rot: 0.5 }); X.restore(); }
   X.setTransform(1, 0, 0, 1, 0, 0); txt('IF THE COMPANY GETS THE EMBRYO…', 960, 100, 44, '#a8ffd0', { ls: 6, a: prog(lt, 0.4, 1.0), w: 700 });
   return { tint: '#40c090', tintA: 0.2 }; } },
 { s: 8, cut: true, fn(lt, d) { fillBG('#000', '#000'); camL([960, 600, 1.0], [960, 560, 1.25], lt / d); glow(960, 700, 330 - 120 * prog(lt, 0, d), 'rgba(230,240,255,0.22)'); rect(-200, 880, 2400, 400, '#000');
   stick(RIP({ x: 960, y: 880, h: 330, baldR: true, pose: 'headdown', gb: 6, ex: 'sad' }));
   X.save(); X.globalAlpha = 0.5 * prog(lt, 1, 2.5); alien({ x: 1500, y: 880, s: 90, f: -1, mode: 'crouch', ph: lt, rimA: 0.25 }); X.restore();
   return { desat: 0.6 }; } },
],
// ================= SCENE 9 =================
[
 { s: 0, fn(lt, d) { fillBG('#000', '#000'); camL([960, 540, 1], [960, 520, 1.08], lt / d); monitor(960, 600, 1500, 560, ['INCOMING TRANSMISSION', '> SOURCE: WEYLAND-YUTANI', '!> RECOVERY TEAM EN ROUTE', '> ARRIVAL: IMMINENT'], lt, '#ffb070', { cps: 22, bg: '#120802', alert: RED });
   X.setTransform(1, 0, 0, 1, 0, 0); stick({ x: 230, y: 1300, h: 600, col: '#111', glasses: true, bald: true, glowc: 'rgba(255,170,100,0.8)', gb: 20, headFill: '#080503', f: 1, p: { ht: 0.1 } });
   vhs(lt, 0.3); return { tint: '#ff9a50', tintA: 0.15 }; } },
 { s: 1, cut: true, fn(lt, d, A) { if (lt < A(2) - 0.3) { fillBG('#010205', '#04060c'); camL([960, 540, 1], [960, 540, 1.1], lt / (A(2))); stars(lt * 20, 0, 400, 0.3, lt); planet(1500, 900, 400, lt); ship(lerp(200, 700, lt / A(2)), 400, 0.55, lt);
     X.setTransform(1, 0, 0, 1, 0, 0); txt('LIVES SACRIFICED  →  FOR A LIVING ALIEN', 960, 160, 36, '#ffb07a', { ls: 5, a: prog(lt, 0.5, 1.2), w: 700 }); return {}; }
   const q = lt - A(2); fillBG('#070707', '#000'); camL([960, 520, 1.05], [960, 500, 1.2], q / (d - A(2))); bigHead(960, 470, 220, { bald: true, ex: 'firm' });
   X.setTransform(1, 0, 0, 1, 0, 0); ['SPECIMEN', 'HOST', 'PRIORITY ONE', 'PROPERTY'].forEach((s, i) => txt(s, 960 + (i % 2 ? 1 : -1) * (lerp(800, 480, prog(q, i * 0.6, i * 0.6 + 1.5))), 260 + i * 160, 48, RED, { a: prog(q, i * 0.6, i * 0.6 + 0.4) * 0.75, ls: 10, font: 'DejaVu Sans Mono', w: 600 }));
   return { tint: '#ff3020', tintA: 0.12 }; } },
 { s: 3, cut: true, fn(lt, d) { const p = lt / d; industrial(lt, { cx: p * 200 }); camL([800, 560, 1], [1000, 560, 1.12], p); rect(-500, 860, 3200, 500, '#0d0604');
   stick(RIP({ x: lerp(400, 1100, p), y: 880, h: 320, baldR: true, pose: 'walk', ph: lt * 5 }));
   stamp('THE EMBRYO MUST DIE', 960, 220, 56, '#ffcf9a', prog(lt, 1.0, 1.4)); return { tint: '#ff7a30', tintA: 0.2 }; } },
 { s: 4, cut: true, fn(lt, d) { fillBG('#120604', '#050201'); camL([960, 560, 1.05], [960, 540, 1.15], lt / d); furnace(960, 860, 1400, 800, lt, 0.5);
   for (let i = 0; i < 6; i++) rect(100 + i * 340, -100, 40, 1000, '#0a0403'); line([0, 160, 1920, 160], '#0a0403', 40);
   rect(-200, 860, 2400, 400, '#080302');
   stick(RIP({ x: 760, y: 885, h: 330, baldR: true, pose: 'talk', ph: lt * 2, col: '#151515', glowc: 'rgba(255,150,60,0.9)', headFill: '#080404', label: 'RIPLEY', la: 1, lc: CREAM }));
   stick({ x: 1180, y: 885, h: 380, f: -1, bald: true, glasses: true, lw: 13, col: '#151515', glowc: 'rgba(255,150,60,0.9)', headFill: '#080404', label: 'DILLON', la: 1, lc: CREAM });
   rect(930, -200, 100, 1600, 'rgba(0,0,0,0.85)');
   stamp('"KILL ME."', 960, 260, 56, CREAM, prog(lt, 0.8, 1.2)); return { tint: '#ff7a30', tintA: 0.2 }; } },
 { s: 5, fn(lt, d, A) { fillBG('#120604', '#050201'); camL([960, 560, 1.15], [1060, 540, 1.25], lt / d); furnace(960, 860, 1400, 800, lt, 0.5);
   for (let i = 0; i < 6; i++) rect(100 + i * 340, -100, 40, 1000, '#0a0403'); rect(-200, 860, 2400, 400, '#080302');
   stick(RIP({ x: 760, y: 885, h: 330, baldR: true, col: '#151515', glowc: 'rgba(255,150,60,0.9)', headFill: '#080404' }));
   stick({ x: 1180, y: 885, h: 380, f: -1, bald: true, glasses: true, lw: 13, col: '#151515', glowc: 'rgba(255,150,60,0.9)', headFill: '#080404', pose: lt > A(6) - 0.3 ? 'point' : 'stand', p: lt > A(6) - 0.3 ? {} : { ht: 0.15 * Math.sin(lt * 4) } });
   rect(930, -200, 100, 1600, 'rgba(0,0,0,0.85)');
   txt('NOT YET.', 1180, 260, 56, CREAM, { ls: 10, a: prog(lt, 0.4, 0.9) * (1 - prog(lt, A(6) - 0.5, A(6))), w: 800 });
   txt('FIRST — THE CREATURE.', 960, 260, 50, AMBER, { ls: 8, a: prog(lt, A(6), A(6) + 0.5), w: 800, glow: '#ff5a20' });
   return { tint: '#ff7a30', tintA: 0.2 }; } },
],
// ================= SCENE 10 =================
[
 { s: 0, fn(lt, d) { industrial(lt, {}); camL([960, 760, 1.1], [960, 440, 1.15], lt / d); rect(-500, 940, 3200, 500, '#0d0604');
   rect(860, 760, 200, 180, '#2a1810'); X.strokeStyle = '#3d2418'; X.lineWidth = 6; X.strokeRect(860, 760, 200, 180);
   stick({ x: 960, y: 760, h: 380, bald: true, glasses: true, lw: 13, pose: 'preach', ph: lt, label: 'DILLON', la: prog(lt, 5.0, 5.5) });
   for (let i = 0; i < 9; i++) if (i !== 4) stick({ x: 200 + i * 190, y: 960, h: 250, bald: true, prisoner: true, col: GREY, glow: false, f: i < 4 ? 1 : -1, p: { ht: -0.15 } });
   return { tint: '#ff8a40', tintA: 0.2 }; } },
 { s: 1, cut: true, fn(lt, d, A) { blueprintGrid(); const pts = [[150, 900], [150, 600], [500, 600], [500, 250], [900, 250], [900, 700], [1300, 700], [1300, 400], [1640, 400]];
   for (const pp of [[150, 600, 150, 150], [500, 600, 500, 1000], [900, 700, 900, 1000], [1300, 400, 1300, 120], [500, 250, 120, 250]]) line(pp, 'rgba(120,180,255,0.25)', 70);
   drawPath(pts, 'rgba(120,180,255,0.3)', 70); X.strokeStyle = AMBER; X.lineWidth = 5; X.strokeRect(1600, 300, 260, 200); glow(1730, 400, 200, 'rgba(255,130,40,0.4)'); txt('LEAD MOLD', 1730, 540, 30, AMBER, { ls: 5 });
   const u = prog(lt, A(2), d - 0.5), ua = Math.max(0, u - 0.12);
   const doors = [0.18, 0.38, 0.58, 0.78];
   doors.forEach((dv, i) => { const [x, y] = pathPt(pts, dv); const closed = u > dv + 0.05; X.save(); X.translate(x, y); rect(-40, -40, 80, 80, closed ? 'rgba(255,90,60,0.9)' : 'rgba(255,255,255,0.15)'); X.restore(); });
   drawPath(pts, CREAM, 4, u, [10, 10]);
   if (u > 0) { const [rx, ry] = pathPt(pts, u); circ(rx, ry, 18, CREAM); glow(rx, ry, 60, 'rgba(255,255,255,0.5)'); const [axx, ayy] = pathPt(pts, ua); if (ua > 0) { circ(axx, ayy, 18, RED); glow(axx, ayy, 70, 'rgba(255,50,30,0.6)'); } }
   txt('THE PLAN', 960, 80, 46, '#bcd8ff', { ls: 14, font: 'DejaVu Sans Mono', w: 700 });
   [['● RUNNER (BAIT)', CREAM], ['● ALIEN', RED], ['■ CLOSE THE DOOR BEHIND', 'rgba(255,90,60,1)']].forEach(([s, c], i) => txt(s, 1440, 760 + i * 46, 26, c, { al: 'left', ls: 3, a: prog(lt, A(2) + i * 0.5, A(2) + i * 0.5 + 0.5) }));
   return {}; } },
 { s: 4, cut: true, fn(lt, d, A) { const p = lt / d; const cx = lt * 700; corridorSide(cx, lt, { lights: 'rgba(255,90,60,0.2)', flick: true });
   stick({ x: 1100, y: 880, h: 320, bald: true, prisoner: true, col: GREY, pose: 'run', ph: lt * 10 }); fgPipe(lt * 900, lt, '#040505');
   const dx = 1800 - ((lt * 700) % 2400); const dc = clamp((900 - dx) / 300); rect(dx - 60, 180, 120, 700 * dc, '#3a3f44'); X.strokeStyle = '#222'; X.lineWidth = 6; X.strokeRect(dx - 60, 180, 120, 700 * dc);
   alien({ x: 300 + Math.sin(lt) * 60, y: 880, s: 130, f: 1, mode: 'run', ph: lt * 10, a: 0.9 });
   X.setTransform(1, 0, 0, 1, 0, 0); streaks(lt, 12, 0.18);
   txt('ONE WRONG DOOR…', 960, 120, 50, RED, { ls: 10, a: prog(lt, A(5), A(5) + 0.5), glow: RED, w: 800 });
   return { tint: '#ff4030', tintA: 0.18 }; } },
 { s: 6, cut: true, fn(lt, d) { fillBG('#0d0503', '#030101'); const p = lt / d; camL([960, 560, 1], [960, 560, 1.12], p);
   for (let i = 0; i < 3; i++) { const x = 480 + i * 480; rect(x - 120, 300, 240, 580, '#000'); X.strokeStyle = '#3a1e12'; X.lineWidth = 14; X.strokeRect(x - 120, 300, 240, 580); glow(x, 600, 200, 'rgba(255,90,40,0.15)'); }
   rect(-200, 880, 2400, 400, '#080302');
   for (let i = 0; i < 6; i++) { const tgt = 480 + (i % 3) * 480; const u = eo(prog(p, i * 0.08, 0.6 + i * 0.05)); stick({ x: lerp(960 + (i - 2.5) * 60, tgt, u), y: lerp(1000, 880, u), h: lerp(320, 220, u), bald: true, col: CREAM, pose: 'run', ph: lt * 9 + i, a: 1 - prog(u, 0.9, 1) }); }
   X.setTransform(1, 0, 0, 1, 0, 0); monitor(1660, 150, 380, 130, ['COMPANY ETA'], lt * 3, '#ffb070', { fs: 28, bg: '#120802' });
   return { tint: '#ff7a30', tintA: 0.2 }; } },
],
// ================= SCENE 11 =================
[
 { s: 0, fn(lt, d) { const p = lt / d; X.save(); shake(lt, 3); corridorSide(lt * 900, lt, { lights: 'rgba(255,40,30,0.35)', flick: true, top: '#120303', c1: '#200807', c2: '#2a0b09', floor: '#100303' });
   for (let i = 0; i < 3; i++) stick({ x: 1100 + i * 220, y: 880, h: 300, bald: true, prisoner: true, col: GREY, pose: 'run', ph: lt * 11 + i * 2, a: i === 0 ? 1 - prog(p, 0.55, 0.58) : 1 });
   alien({ x: 700 + p * 300, y: 880, s: 140, f: 1, mode: 'run', ph: lt * 11, jaw: 0.6 });
   const dx = 1600; rect(dx - 60, 180, 120, 360 + 30 * Math.sin(lt * 20), '#3a3f44'); sparks(dx, 540, lt, 16);
   X.restore(); txt('DOORS JAM', 1600, 150, 34, AMBER, { ls: 6, a: prog(lt, 1, 1.5) });
   return { tint: '#ff2010', tintA: 0.25, flash: (prog(p, 0.55, 0.57) - prog(p, 0.6, 0.66)) * 0.9, flashc: '#000' }; } },
 { s: 2, cut: true, fn(lt, d, A) { fillBG('#140804', '#050201'); camL([960, 560, 1], [960, 560, 1.08], lt / d); glow(960, 700, 900, 'rgba(255,120,40,0.2)');
   X.strokeStyle = '#2c160c'; X.lineWidth = 40; X.strokeRect(260, 140, 1400, 760); rect(-200, 880, 2400, 400, '#0a0503');
   rect(1480, 120, 360, 30, '#3a2418'); stick({ x: 1700, y: 120, h: 220, bald: true, band: true, pose: 'lever', ph: lt * 2, label: 'MORSE', la: prog(lt, A(3) - 0.3, A(3)) });
   stick(RIP({ x: 900, y: 880, h: 300, baldR: true, label: 'RIPLEY', la: prog(lt, 0.8, 1.2) })); stick({ x: 1200, y: 880, h: 360, f: -1, bald: true, glasses: true, lw: 12, label: 'DILLON', la: prog(lt, 1.0, 1.4) });
   alien({ x: lerp(-200, 520, eo(prog(lt, 0.5, 2.5))), y: 880, s: 140, f: 1, mode: lt < 2.5 ? 'run' : 'crouch', ph: lt * 6, jaw: 0.5 });
   txt('THE LEAD-MOLD CHAMBER', 960, 90, 40, '#ffcf9a', { ls: 8, a: prog(lt, 0.3, 0.9), w: 700 });
   return { tint: '#ff7a30', tintA: 0.2 }; } },
 { s: 4, cut: true, fn(lt, d) { const p = lt / d; fillBG('#1a0904', '#060201'); camL([960, 700, 1.25], [960, 600, 1.0], p);
   const lev = eo(prog(p, 0.35, 1)) * 360; const pour = prog(p, 0.25, 0.35);
   if (pour > 0) { X.save(); X.globalCompositeOperation = 'lighter'; rect(1100 - 60 * pour, -100, 120 * pour, 1000, '#ff8a20'); rect(1100 - 30 * pour, -100, 60 * pour, 1000, '#fff0a0'); X.restore(); glow(1100, 500, 700, `rgba(255,140,40,${0.6 * pour})`); }
   stick({ x: 740, y: 880, h: 400, f: 1, bald: true, glasses: true, lw: 14, pose: 'armsup', ph: lt, col: '#121212', glowc: 'rgba(255,170,60,1)', gb: 24, headFill: '#060302', a: 1 - prog(p, 0.65, 0.85) });
   alien({ x: 1250, y: 880, s: 150, f: -1, mode: 'rear', ph: lt * 2, jaw: 0.8, rim: '#ffb060', a: 1 - prog(p, 0.6, 0.8) * 0.6 });
   X.save(); X.globalCompositeOperation = 'lighter'; const g = X.createLinearGradient(0, 880 - lev, 0, 1100); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.2, '#ff8a20'); g.addColorStop(1, '#a02a08'); X.fillStyle = g; X.fillRect(-400, 900 - lev + Math.sin(lt * 4) * 4, 2800, 800); X.restore();
   flames(960, 900 - lev, 1800, 120, lt, 30, pour);
   X.setTransform(1, 0, 0, 1, 0, 0); txt("DILLON'S SACRIFICE", 960, 120, 48, '#ffe0b0', { ls: 10, a: prog(p, 0.4, 0.55), w: 800 });
   return { tint: '#ff7a30', tintA: 0.3 }; } },
 { s: 5, cut: true, fn(lt, d, A) { const p = lt / d; X.save(); shake(lt, lt > A(6) - 0.5 ? 5 : 2); fillBG('#1a0904', '#060201'); camL([960, 600, 1], [1100, 600, 1.1], p);
   X.save(); X.globalCompositeOperation = 'lighter'; const g = X.createLinearGradient(0, 820, 0, 1100); g.addColorStop(0, '#ffcf60'); g.addColorStop(1, '#a02a08'); X.fillStyle = g; X.fillRect(-400, 860, 3000, 400); X.restore();
   const up = eo(prog(lt, A(6) - 0.5, A(6) + 0.6)); const run = prog(lt, A(6) + 0.6, d);
   alien({ x: 700 + run * 900, y: lerp(1150, 870, up), s: 150, f: 1, mode: run > 0 ? 'run' : 'rear', ph: lt * 9, jaw: 0.9, rim: '#fff0a0', rimA: 1 });
   glow(700 + run * 900, 760, 300, 'rgba(255,170,60,0.6)'); if (up > 0 && up < 1) sparks(700, 860, lt, 30, '#ffcf60', 1.5);
   stick(RIP({ x: 1500 + run * 500, y: 870, h: 300, baldR: true, f: 1, pose: run > 0 ? 'run' : 'stand', ph: lt * 10, col: '#111', glowc: 'rgba(255,170,60,1)', headFill: '#050302' }));
   X.restore(); txt('EVEN THAT ISN’T ENOUGH.', 960, 120, 46, '#ffe0b0', { ls: 8, a: prog(lt, 0.3, 0.9) * (1 - prog(lt, A(6) - 0.6, A(6) - 0.2)), w: 800 });
   return { tint: '#ff7a30', tintA: 0.3, flash: (prog(lt, A(6) - 0.5, A(6) - 0.4) - prog(lt, A(6) - 0.4, A(6))) * 0.7, flashc: '#fff0c0' }; } },
 { s: 7, cut: true, fn(lt, d, A) { fillBG('#100806', '#040202'); const p = lt / d; X.save(); shake(lt, lt > A(8) - 0.3 && lt < A(8) + 0.6 ? 14 : 2); camL([960, 560, 1.1], [960, 560, 1.0], p);
   line([200, 140, 1720, 140], '#3a3f44', 26); for (let i = 0; i < 6; i++) { const x = 400 + i * 230; rect(x - 12, 140, 24, 30, '#555'); if (lt > 0.6) { X.save(); X.globalAlpha = 0.6; for (let k = 0; k < 8; k++) { const yy = 170 + ((lt * 900 + k * 90) % 700); line([x + (k - 4) * 6, yy, x + (k - 4) * 14, yy + 40], '#cfe8ff', 3); } X.restore(); } }
   const shattered = lt > A(8);
   if (!shattered) { alien({ x: 980, y: 880, s: 160, f: -1, mode: 'rear', ph: lt * 3, jaw: 1, rim: '#ffcf60', rimA: 1 - prog(lt, 0.5, A(8)) * 0.5 }); glow(980, 760, 360, `rgba(255,150,60,${0.6 * (1 - prog(lt, 0.5, A(8)))})`); }
   else { const q = lt - A(8); for (let i = 0; i < 26; i++) { const a = R(i) * 2 * PI, v = 200 + R(i + 1) * 900; const x = 980 + Math.cos(a) * v * eo(q), y = 700 + Math.sin(a) * v * eo(q) + 300 * q * q; X.save(); X.translate(x, y); X.rotate(q * 6 + i); poly([-24, -10, 30, -16, 12, 22], '#050505'); X.restore(); } }
   steam(980, 1000, lt, 1400, 0.7 * prog(lt, 0.8, 2.5));
   if (shattered) stick(RIP({ x: 1500, y: 880, h: 300, baldR: true, f: -1, a: prog(lt, A(8) + 1.2, A(8) + 2.2) }));
   X.restore(); txt('THERMAL SHOCK', 960, 120, 54, '#e8f6ff', { ls: 14, a: prog(lt, A(8) + 0.4, A(8) + 1.0), w: 800, glow: '#9fd8ff' });
   return { tint: '#8fb8d0', tintA: 0.2, flash: (prog(lt, A(8) - 0.15, A(8)) - prog(lt, A(8), A(8) + 1.0)) * 0.8, flashc: '#f2f6f8' }; } },
],
// ================= SCENE 12 =================
[
 { s: 0, fn(lt, d) { fillBG('#0c0806', '#030202'); const p = lt / d; camL([960, 560, 1], [900, 560, 1.12], p);
   X.save(); X.globalCompositeOperation = 'lighter'; rect(260, 220, 520, 660, 'rgba(230,240,255,0.55)'); glow(520, 560, 700, 'rgba(220,235,255,0.4)'); X.restore();
   rect(-200, 880, 2400, 400, '#050302');
   for (let i = 0; i < 4; i++) stick({ x: lerp(-500, 120, eo(p)) + i * 210, y: 880, h: 300, col: '#1a1c20', glowc: 'rgba(220,235,255,0.9)', gb: 18, pose: 'gun', gunHeld: true, headFill: '#0c0d10', glow: true });
   stick({ x: lerp(560, 900, eo(p)), y: 880, h: 340, pose: 'walk', ph: lt * 4 * (1 - eo(p)), android: false, label: 'THE MAN WHO LOOKS LIKE BISHOP', la: prog(lt, 1.5, 2), lc: BLUE });
   stick(RIP({ x: 1500, y: 880, h: 320, baldR: true, f: -1 }));
   return { tint: '#a0b8d0', tintA: 0.15 }; } },
 { s: 2, cut: true, fn(lt, d, A) { fillBG('#140804', '#050201'); camL([1000, 560, 1.0], [1260, 520, 1.35], lt / d); glow(1300, 900, 800, 'rgba(255,120,40,0.3)'); rect(-200, 880, 2400, 400, '#080302');
   stick({ x: 760, y: 880, h: 340, pose: 'reach', ph: lt, lc: BLUE });
   stick(RIP({ x: 1300, y: 880, h: 320, baldR: true, f: -1, p: lt > A(3) ? { ht: 0.12 * Math.sin(lt * 4) } : {} }));
   txt('"LET US REMOVE IT."', 760, 380, 40, BLUE, { ls: 4, a: prog(lt, 0.4, 0.9) * (1 - prog(lt, A(3), A(3) + 0.4)), w: 700 });
   txt('NO MORE PROMISES.', 1300, 360, 44, CREAM, { ls: 8, a: prog(lt, A(3) + 0.5, A(3) + 1.0), w: 800 });
   return { tint: '#ff7a30', tintA: 0.2 }; } },
 { s: 4, cut: true, fn(lt, d) { fillBG('#120604', '#050201'); const p = lt / d; X.save(); shake(lt, 5); camL([960, 560, 1.1], [960, 560, 1.0], p); rect(-200, 880, 2400, 400, '#080302');
   const hit = eo(prog(p, 0.2, 0.35)); stick({ x: lerp(500, 860, hit), y: 880, h: 330, bald: true, glasses: true, pose: 'push', label: 'AARON', la: 1 - prog(p, 0.5, 0.6), rot: prog(p, 0.55, 0.7) * -PI / 2 });
   stick({ x: 1000, y: 880, h: 340, f: -1, pose: hit > 0.9 ? 'fall' : 'stand', rot: hit * 0.25 });
   for (let i = 0; i < 3; i++) stick({ x: 1350 + i * 220, y: 880, h: 300, f: -1, col: '#1a1c20', glowc: 'rgba(255,170,90,0.8)', pose: 'gun', gunHeld: true, headFill: '#0c0d10' });
   X.restore(); const fl = [0.5, 0.56, 0.62].reduce((m, t0) => Math.max(m, p > t0 && p < t0 + 0.02 ? 0.8 : 0), 0);
   return { tint: '#ff7a30', tintA: 0.2, flash: fl }; } },
 { s: 5, cut: true, fn(lt, d) { fillBG('#0a0302', '#000'); camL([960, 380, 1.0], [960, 440, 1.25], lt / d);
   X.save(); X.globalCompositeOperation = 'lighter'; X.beginPath(); X.ellipse(960, 800, 760, 300, 0, 0, 2 * PI); const g = X.createRadialGradient(960, 800, 50, 960, 800, 760); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.4, '#ff8a20'); g.addColorStop(1, 'rgba(120,20,0,0.3)'); X.fillStyle = g; X.fill(); X.restore();
   flames(960, 880, 1300, 400, lt, 40, 0.8); X.beginPath(); X.ellipse(960, 800, 760, 300, 0, 0, 2 * PI); X.strokeStyle = '#1a0a04'; X.lineWidth = 40; X.stroke();
   poly([960 - 50, -200, 960 + 50, -200, 960 + 60, 380, 960 - 60, 380], '#120604');
   stick(RIP({ x: 960, y: 380, h: 180, baldR: true, col: '#111', glowc: 'rgba(255,170,60,1)', gb: 18, headFill: '#050302' }));
   particles(lt, { n: 60, c: '#ffb050', a: 0.9, up: true, sp: 70, add: true });
   return { tint: '#ff7a30', tintA: 0.3 }; } },
 { s: 6, cut: true, fn(lt, d, A) { const p = lt / d; fillBG('#2a0a03', '#ff8a2a'); glow(960, 1300, 1300, 'rgba(255,200,90,0.8)');
   for (let i = 0; i < 6; i++) { const x = 80 + i * 360 + Math.sin(i) * 40; rect(x, -200, 46, 1600, 'rgba(20,6,2,0.55)'); }
   X.save(); X.globalCompositeOperation = 'lighter'; for (let i = 0; i < 70; i++) { const y = ((R(i) * 1500 - lt * (700 + R(i + 1) * 500)) % 1500 + 1500) % 1500 - 200; X.globalAlpha = 0.5; line([R(i + 3) * W, y, R(i + 3) * W, y + 40 + R(i + 4) * 60], '#ffd890', 2 + R(i) * 2); } X.restore();
   flames(960, 1100, 2200, 380 + 300 * p, lt, 50, 1);
   camL([960, 520, 1.0], [960, 560, 1.15], p);
   const em = prog(lt, A(7) * 0.0 + d * 0.35, d * 0.5);
   X.save(); X.translate(960, 560); X.rotate(-0.5 - p * 0.5);
   stick(RIP({ x: 0, y: 200, h: 380, baldR: true, col: '#050505', glow: false, shadow: false, pose: em > 0.5 ? 'hold' : 'fall', headFill: '#050505', lw: 16 }));
   if (em > 0) alien({ x: 50, y: -20, s: 28 * em, f: 1, mode: 'crouch', ph: lt, jaw: 1, rim: '#ffcf60', rot: -0.5 });
   X.restore();
   return { tint: '#ff7a30', tintA: 0.2, flash: prog(p, 0.85, 1), flashc: '#000' }; } },
 { s: 7, cut: true, fn(lt, d) { const p = lt / d; fillBG('#0c0604', '#020101'); camL([960, 560, 1], [960, 560, 1.08], p);
   const open = 1 - eo(prog(p, 0.45, 0.9)); glow(960, 560, 600 * open + 50, 'rgba(255,230,200,0.4)'); rect(960 - 400 * open, 200, 800 * open, 680, 'rgba(255,230,200,0.5)');
   rect(560 - 400 * (1 - open) * 0, 200, 400 * (1 - open), 680, '#1a1d22'); rect(1360 - 400 * (1 - open), 200, 400 * (1 - open), 680, '#1a1d22');
   rect(-200, 880, 2400, 400, '#050302');
   stick({ x: lerp(960, 960, p), y: 880, h: lerp(330, 260, p), bald: true, pose: 'walk', ph: lt * 4, col: '#111', glowc: 'rgba(255,230,200,0.9)', headFill: '#050505', label: 'MORSE · SURVIVES', la: prog(lt, 0.5, 1) * (1 - prog(p, 0.5, 0.6)), lc: '#ffe0c0' });
   txt('FIORINA 161 — CLOSED', 960, 140, 40, '#ffe0c0', { ls: 12, a: prog(p, 0.5, 0.7), w: 700 });
   return { flash: prog(p, 0.85, 1), flashc: '#000', desat: 0.3 }; } },
],
];
