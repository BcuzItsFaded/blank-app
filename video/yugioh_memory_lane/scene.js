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


const SHOTS = [
 // 0 title
 (lt, d) => { fillBG('#1a0c2e', '#3a1650'); glow(540, 1000, 800, 'rgba(255,200,90,0.3)'); particles(lt, { n: 60, c: '#ffd88a', a: 0.8, up: true, sp: 50, r: 3, add: true });
   for (let i = 0; i < 6; i++) { const a = eo(prog(lt, 0.1 + i * 0.06, 0.6 + i * 0.06)), rot = (i - 2.5) * 0.18 * a; card(540 + (i - 2.5) * 70 * a, 1150 - 40 * a + Math.abs(i - 2.5) * 12, 230, rot, { back: true }); }
   const fl = prog(lt, 1.1, 1.5); card(540, lerp(1150, 980, eo(prog(lt, 0.9, 1.4))), 270, 0, fl < 0.5 ? { back: true, sx: 1 - 2 * fl } : { sx: 2 * fl - 1, holo: true, t: lt, frame: '#d8843a', artA: '#ffe8a0', artB: '#ff8a3a', art: (x, y, s) => lightArt(x, y, s), stats: 'ATK/????' });
   if (lt > 1.4) glow(540, 980, 400, `rgba(255,240,200,${0.5 * (1 - prog(lt, 1.4, 2.2))})`);
   const a = eo(prog(lt, 0.2, 0.7)); X.save(); X.translate(540, 410); const k = 1 + 0.3 * (1 - a); X.scale(k, k); txt('YU-GI-OH!', 0, 0, 150, '#ffd24a', { w: 900, ls: 4, stroke: INK, sw: 34, glow: 'rgba(255,170,60,0.9)', gb: 40, a }); X.restore();
   X.save(); X.globalAlpha = prog(lt, 0.8, 1.2); rect(140, 540, 800, 96, 'rgba(20,8,30,0.85)'); X.strokeStyle = '#ffd24a'; X.lineWidth = 5; X.strokeRect(140, 540, 800, 96); txt('QUICK MEMORY LANE', 540, 589, 58, '#ffd24a', { w: 900, ls: 6 }); X.restore();
   return { tint: '#c080ff', tintA: 0.1 }; },
 // 1 every kid had a deck
 (lt, d) => { const sc = lt * 160; hallBG(lt, sc); const ph = lt * 7;
   const k1 = kid(330, 1320, 400, { pose: 'walk', ph, shirt: '#d8402a', cap: true, capc: '#2a9a5a' }); const k2 = kid(700, 1320, 400, { pose: 'walk', ph: ph + 2, shirt: '#3a8ad8', hair: '#5a3a1a', glasses: true, f: 1 });
   deckBox(345, 1110, 1.1, Math.sin(lt * 6) > 0); deckBox(715, 1110, 1.1, Math.sin(lt * 6 + 2) > 0);
   for (let i = 0; i < 6; i++) { const q = prog(lt, 0.6 + i * 0.18, 1.0 + i * 0.18); if (q > 0) { X.save(); X.globalAlpha = q; deckBox(120 + i * 168, 820 + Math.sin(lt * 3 + i) * 10, 1.4, true); X.restore(); } }
   X.setTransform(1, 0, 0, 1, 0, 0); stamp('2002', 540, 360, 120, '#ffd24a', prog(lt, 0.15, 0.5), -0.06);
   return { tint: '#ffd090', tintA: 0.1 }; },
 // 2 trading at lunch + holo pull
 (lt, d) => { cafeBG(lt); const sw = eo(prog(lt, 0.4, 1.4)), opn = lt > 1.8;
   kid(200, 1330, 400, { pose: opn && lt > 3.0 ? 'armsup' : 'hold', ph: lt * 3, shirt: '#d8402a', cap: true, capc: '#2a9a5a', f: 1, ex: lt > 3.0 ? 'shout' : 'smile' });
   kid(880, 1330, 400, { pose: 'hold', ph: lt * 3, shirt: '#3a8ad8', hair: '#5a3a1a', glasses: true, f: -1, ex: lt > 3.0 ? 'fear' : 'smile' });
   if (!opn) { card(lerp(330, 750, sw), 940 - 140 * Math.sin(sw * PI), 150, sw * 0.6, { frame: '#3aa860', artA: '#8ae8a0', artB: '#2a7a40', art: (x, y, s) => jarArt(x, y, s * 0.8) }); card(lerp(750, 330, sw), 940 - 90 * Math.sin(sw * PI), 150, -sw * 0.6, { frame: '#d8843a', artA: '#8ab8ff', artB: '#2a3a7a' }); txt('TRADE?', 540, 640, 64, '#fff', { w: 900, stroke: INK, sw: 14, a: prog(lt, 0.2, 0.4) * (1 - prog(lt, 1.5, 1.7)) }); }
   else { const tr = prog(lt, 1.9, 2.4); if (lt < 2.6) packFoil(540, 900, 240, tr, lt); const up = eo(prog(lt, 2.4, 3.1));
     if (lt > 2.4) { for (let i = 0; i < 4; i++) card(540 + (i - 1.5) * 90 * up, 940 + Math.abs(i - 1.5) * 20 * up, 170, (i - 1.5) * 0.15 * up, { back: true, a: 1 - prog(lt, 3.0, 3.4) }); card(540, lerp(940, 760, up), lerp(170, 300, up), 0, { holo: true, t: lt * 1.5, frame: '#d8843a', artA: '#ffe8a0', artB: '#d84a8a', art: (x, y, s) => lightArt(x, y, s), stats: 'ATK/????' }); for (let i = 0; i < 6; i++) star4(540 + Math.cos(lt * 2 + i) * 230, 760 + Math.sin(lt * 2 + i) * 260, 30, prog(lt, 2.6, 2.9), lt * 3 + i); } }
   X.setTransform(1, 0, 0, 1, 0, 0); stamp('JACKPOT!', 540, 380, 110, '#ffd24a', prog(lt, 3.2, 3.5), -0.06);
   return { tint: '#ffe0a0', tintA: 0.08, flash: (prog(lt, 2.38, 2.45) - prog(lt, 2.45, 2.8)) * 0.6 }; },
 // 3 the 3000 ATK dragon card
 (lt, d) => { fillBG('#0a0c1c', '#040408'); const fl = prog(lt, 0.6, 1.1), rev = fl >= 0.5;
   X.save(); X.translate(540, 820); X.rotate(lt * 0.2); X.globalAlpha = rev ? 0.25 + 0.1 * Math.sin(lt * 6) : 0.06; for (let i = 0; i < 16; i++) { X.rotate(PI / 8); poly([0, 0, 1500, -80, 1500, 80], '#cfe8ff'); } X.restore();
   glow(540, 820, rev ? 700 : 300, rev ? 'rgba(200,230,255,0.6)' : 'rgba(120,120,200,0.25)');
   card(540, 820, 360, 0, fl < 0.5 ? { back: true, sx: 1 - 2 * fl } : { sx: 2 * fl - 1, holo: true, t: lt, frame: '#e8e2c8', name: 'LEGENDARY DRAGON', artA: '#ffffff', artB: '#6a9ae8', art: (x, y, s) => lightArt(x, y, s), stats: 'ATK/3000' });
   if (rev) { const v = Math.round(3000 * eo(prog(lt, 1.6, 2.8))); X.save(); X.translate(540, 1300); const k = 1 + 0.2 * Math.sin(prog(lt, 2.8, 3.1) * PI); X.scale(k, k); txt('ATK ' + v, 0, 0, 130, '#ffe9a0', { w: 900, font: 'DejaVu Sans Mono', stroke: INK, sw: 26, glow: '#8fd0ff', gb: 30 }); X.restore(); }
   kid(150, 1720, 380, { pose: 'armsup', ph: lt * 6, shirt: '#d8402a', cap: true, capc: '#2a9a5a', f: 1, ex: 'shock', a: prog(lt, 1.2, 1.5) }); kid(930, 1720, 380, { pose: 'armsup', ph: lt * 6 + 2, shirt: '#3a8ad8', hair: '#5a3a1a', glasses: true, f: -1, ex: 'shock', a: prog(lt, 1.2, 1.5) });
   X.setTransform(1, 0, 0, 1, 0, 0); txt('EVERYONE WANTED IT', 540, 340, 58, '#fff', { w: 900, ls: 4, stroke: INK, sw: 14, a: prog(lt, 1.0, 1.4) });
   return { tint: '#9fd0ff', tintA: 0.1, flash: (prog(lt, 0.83, 0.88) - prog(lt, 0.88, 1.3)) * 0.85 }; },
 // 4 "all five pieces"
 (lt, d) => { cafeBG(lt); X.save(); X.globalAlpha = 0.78; rect(0, 0, W, H, '#1a1028'); X.restore();
   const slots = [[540, 560], [330, 820], [750, 820], [420, 1080], [660, 1080]];
   slots.forEach(([x, y], i) => { X.save(); X.setLineDash([16, 10]); X.strokeStyle = 'rgba(255,255,255,0.5)'; X.lineWidth = 5; X.strokeRect(x - 90, y - 131, 180, 262); X.restore();
     if (i < 4) { const q = prog(lt, 0.3 + i * 0.4, 0.6 + i * 0.4); if (q > 0) card(x, y - 80 * (1 - eo(q)), 180, 0, { back: true, a: Math.min(1, q * 2) }); txt((i + 1) + '/5', x, y + 165, 34, '#ffd24a', { w: 900, stroke: INK, sw: 8, a: q }); }
     else { const p = 0.6 + 0.4 * Math.sin(lt * 8); txt('?', x, y, 150, '#fff', { w: 900, stroke: INK, sw: 24, a: prog(lt, 1.9, 2.2) * p }); txt('?/5', x, y + 165, 34, '#ff6a50', { w: 900, stroke: INK, sw: 8, a: prog(lt, 1.9, 2.2) }); } });
   kid(170, 1700, 380, { pose: 'point', ph: lt, shirt: '#d8402a', cap: true, capc: '#2a9a5a', f: 1, ex: 'smile' }); kid(910, 1700, 380, { pose: 'cross', ph: lt, shirt: '#3a8ad8', hair: '#5a3a1a', glasses: true, f: -1, ex: 'firm' });
   speech(260, 1270, 'I HAVE ALL 5!', prog(lt, 0.4, 0.6) * (1 - prog(lt, 2.2, 2.4)), 40); speech(820, 1270, 'SURE YOU DO...', prog(lt, 2.5, 2.7), 40);
   X.setTransform(1, 0, 0, 1, 0, 0); txt('ALL FIVE PIECES?', 540, 330, 64, '#ffd24a', { w: 900, ls: 4, stroke: INK, sw: 16, a: prog(lt, 0.1, 0.4) });
   return { tint: '#c080ff', tintA: 0.1 }; },
 // 5 8000 LP, pot of greed, time to duel
 (lt, d) => { courtBG(lt); const lp = 8000 * eo(prog(lt, 0.1, 1.3));
   kid(230, 1500, 440, { pose: 'hold', ph: lt, shirt: '#d8402a', cap: true, capc: '#2a9a5a', f: 1, ex: 'firm' }); duelPlate(330, 1180, 1.0, '#c8a040');
   kid(850, 1500, 440, { pose: 'hold', ph: lt, shirt: '#3a8ad8', hair: '#5a3a1a', glasses: true, f: -1, ex: 'firm' }); duelPlate(750, 1180, -1.0, '#4a7ad8');
   const pg = prog(lt, 1.5, 1.9) * (1 - prog(lt, 2.9, 3.1)); if (pg > 0) { card(540, 860, 260, 0, { frame: '#2a9a6a', name: 'DRAW SPELL', artA: '#c8f0d0', artB: '#3a8a5a', art: (x, y, s) => jarArt(x, y, s), stats: 'DRAW 2', a: pg }); for (let i = 0; i < 2; i++) { const q = prog(lt, 2.2 + i * 0.2, 2.7 + i * 0.2); if (q > 0 && q < 1) card(lerp(540, 300, eo(q)), lerp(860, 1120, eo(q)), 110, -0.4 * q, { back: true }); } }
   X.setTransform(1, 0, 0, 1, 0, 0); lpCounter(270, 400, lp, '#ff8a4a', lt); lpCounter(810, 400, lp, '#6ab0ff', lt);
   finishText("IT'S TIME TO DUEL!", 540, 640, 88, prog(lt, 3.0, 3.3), -0.04, ['#ffffff', '#ffd24a', '#c86a10'], '#ffb030');
   return { tint: '#ffb090', tintA: 0.08, flash: (prog(lt, 2.98, 3.02) - prog(lt, 3.02, 3.4)) * 0.7 }; },
 // 6 end card
 (lt, d) => { fillBG('#1a0c2e', '#3a1650'); particles(lt, { n: 50, c: '#ffd88a', a: 0.7, up: true, sp: 40, r: 3, add: true });
   for (let i = 0; i < 7; i++) card(540 + (i - 3) * 120, 1260 + Math.abs(i - 3) * 22, 200, (i - 3) * 0.16, i === 3 ? { holo: true, t: lt, frame: '#d8843a', artA: '#ffe8a0', artB: '#ff8a3a', art: (x, y, s) => lightArt(x, y, s), stats: 'ATK/????' } : { back: true });
   const q = eo(prog(lt, 0.2, 0.7)); txt('WHO WAS YOUR', 540, 380, 84, '#fff', { w: 900, ls: 4, stroke: INK, sw: 18, a: q }); X.save(); X.translate(540, 510); const k = 1 + 0.2 * (1 - q); X.scale(k, k); txt('FAVORITE DUELIST?', 0, 0, 92, '#ffd24a', { w: 900, ls: 2, stroke: INK, sw: 24, glow: 'rgba(255,170,60,0.9)', gb: 34, a: q }); X.restore();
   txt('COMMENT BELOW', 540, 680, 66, '#fff', { w: 900, ls: 5, stroke: INK, sw: 14, a: eo(prog(lt, 1.6, 2.2)) });
   const c = eo(prog(lt, 3.6, 4.2)); X.save(); X.translate(540, 830); X.scale(0.9 + 0.1 * c, 0.9 + 0.1 * c); txt('RG BRICK&STICKVERSE', 0, 0, 62, '#ffd24a', { w: 900, ls: 3, stroke: INK, sw: 16, glow: 'rgba(255,200,80,0.8)', gb: 24, a: c }); txt('FOLLOW FOR MORE MEMORY LANE', 0, 72, 34, '#fff', { w: 800, ls: 3, stroke: INK, sw: 10, a: c }); X.restore();
   return { tint: '#c080ff', tintA: 0.08 }; },
];
function frame(t) {
  X = X0; X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over'; X.clearRect(0, 0, W, H);
  let k = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= (j === 0 ? 0 : A(j) - 0.15)) k = j;
  const st = k === 0 ? 0 : A(k) - 0.15, en = k + 1 < SHOTS.length ? A(k + 1) - 0.15 : TIM.dur;
  X.save(); const o = SHOTS[k](t - st, en - st) || {}; X.restore();
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over';
  const ls = t - st; if (k > 0 && ls < 0.14) { X.globalAlpha = 0.9 * (1 - ls / 0.14); rect(0, 0, W, H, '#fff'); X.globalAlpha = 1; }
  post(t, o); poster(0.9); brandTag(1); captions(t);
  if (t > TIM.dur - 0.4) { X.globalAlpha = prog(t, TIM.dur - 0.4, TIM.dur); rect(0, 0, W, H, '#000'); X.globalAlpha = 1; }
}
window.frame = frame;
