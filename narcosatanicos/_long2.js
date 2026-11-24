// ======================================================= LONG-FORM TIMELINE (Episode 27, ~2:26) =======================================================
addReuse(0, 11.47, 0);
// 2 · spring break: a packed street of neon and crowds; one figure by a car fades
addRel(11.47, 18.88, D => ({ layers: [darkSky('#0a0618', '#3a2050', [{ x: 540, y: 1100, r: 700, col: 'rgba(255,120,200,.3)' }]), Ly(c => { facade(c, -40, 1260, 380, 560); facade(c, 720, 1260, 400, 600); c.fillRect(-OFF, 1260, W + 2 * OFF, 800); }, '#0e0a14', .45, { rimA: .3, rim: '#e0c8f0' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { for (const [x, y, txt, col] of [[160, 780, 'CANTINA', '#ff7ad0'], [900, 760, 'DISCO', '#7ad8ff']]) { c.save(); c.font = '600 60px "IM Fell English SC"'; c.textAlign = 'center'; c.shadowColor = col; c.shadowBlur = 24; c.fillStyle = col; c.fillText(txt, x, y); c.restore(); }
    for (let i = 0; i < 16; i++) { const R = mulberry(i + 40), x = R() * 1080, k = .55 + R() * .35; villager(c, x, 1300 + R() * 160, k, t, i, 0, R() > .5 ? 1 : 0); }
    c.fillStyle = '#05040a'; c.fillRect(640, 1360, 300, 70); c.fillRect(700, 1310, 180, 56); c.beginPath(); c.arc(690, 1436, 26, 0, TAU); c.arc(890, 1436, 26, 0, TAU); c.fill(); const g = 1 - ss(seg(t, 4.6, 6.2)); if (g > 0) { c.save(); c.globalAlpha = g; villager(c, 620, 1460, 1.15, 0, 9, 0, 0); c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, '15,000 SPRING BREAKERS', 540, 220, 42, { col: '#fff4ff', t1: 3.6 }); strip(c, t, 3.8, .8, '2:00 A.M.', 540, 220, 54, { col: '#fff4ff' }); } }));
addReuseX(18.88, 25.0, 1, (c, t) => { strip(c, t, 2.4, .8, '20,000 FLYERS', 540, 200, 40, { col: '#f4f4fa', t1: 6.0 }); strip(c, t, 3.4, .8, '$15,000 REWARD', 540, 300, 40, { col: '#f4f4fa', t1: 6.0 }); });
addReuse(30.52, 42.24, 2);
addReuseX(42.24, 47.0, 3, (c, t) => strip(c, t, 2.6, .8, 'RITUAL OBJECTS · DRUGS', 540, 330, 36, { col: '#fff0e4' }));
// 6 · the confession: a bare bulb over a table
addRel(51.71, 62.73, D => ({ layers: [darkSky('#06060a', '#16141a'), Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); }, '#121014', .3, { glow: { x: 540, y: 700, r: 700, col: '#ffe0a0', a: .25 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const sw = Math.sin(t * 1.4) * .06; c.save(); c.translate(540, 300); c.rotate(sw); c.strokeStyle = '#05050a'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -300); c.lineTo(0, 300); c.stroke(); c.fillStyle = '#fff0c8'; c.shadowColor = '#ffe0a0'; c.shadowBlur = 40; c.beginPath(); c.arc(0, 320, 24, 0, TAU); c.fill(); c.restore();
    spotlight(c, 540, 330, 1300, 900, .3); c.fillStyle = '#06060a'; c.fillRect(260, 1160, 560, 30); c.fillRect(290, 1190, 20, 260); c.fillRect(770, 1190, 20, 260); villager(c, 290, 1450, 1.3, 0, 0, 0, 0); villager(c, 800, 1450, 1.3, 0, 2, 0, 1); newspaper(c, 540, 1140, 180, 60, .05, 1, [{ t: '', s: 10 }]); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, '5 ARRESTED', 540, 1360, 44, { col: '#fff4e0', t1: 4.0 }); strip(c, t, 4.2, .8, '"EL PADRINO"', 540, 1360, 50, { col: '#ffc8a0' }); } }));
addReuseX(62.73, 66.4, 4, (c, t) => strip(c, t, 2.0, .8, 'MOSTLY RIVAL TRAFFICKERS', 540, 330, 34, { col: '#fff0e4' }));
// 8 · Miami, 1962: palms, a neon skyline; a candlelit shrine
addRel(70.43, 81.36, D => ({ layers: [darkSky('#140820', '#ff8a6a', [{ x: 540, y: 1000, r: 700, col: 'rgba(255,150,120,.45)' }]), Ly(c => { skylineFar(c, 1060, 62, 160, 420, false); }, '#2a1030', .2, { front: (c, t) => { const R = mulberry(3); for (let i = 0; i < 70; i++) { c.fillStyle = rgba(R() > .5 ? '#ffd0f0' : '#a0f0ff', .5); c.fillRect(R() * W, 700 + R() * 340, 3, 4); } } }),
  Ly(c => { c.fillRect(-OFF, 1260, W + 2 * OFF, 800); }, '#120818', .5, { front: (c, t) => { c.fillStyle = c.strokeStyle = '#0a0410'; palm(c, 60, 1500, 620, t, 1.0, .4); palm(c, 1020, 1500, 560, t, .95, .4); candleRow(c, t, 7, 1420, 360, 720, .6, .15, .9); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'ADOLFO DE JESÚS CONSTANZO', 540, 210, 38, { col: '#fff0f4', t1: 5.4 }); strip(c, t, 1.2, .8, 'BORN MIAMI · 1962', 540, 320, 40, { col: '#fff0f4', t1: 5.4 }); strip(c, t, 5.6, .8, 'PALO MAYOMBE', 540, 210, 46, { col: '#fff0f4' }); } }));
// 9 · Mexico City: tarot cards turn over under a lamp
addRel(81.36, 89.19, D => ({ layers: [darkSky('#06040a', '#1e1014'), Ly(c => { c.fillRect(-OFF, 980, W + 2 * OFF, 1000); }, '#2a1410', .4, { glow: { x: 540, y: 1150, r: 600, col: '#ffb060', a: .35 }, front: (c, t) => { spotlight(c, 540, 200, 1300, 800, .25);
  for (let i = 0; i < 5; i++) { const x = 220 + i * 160, f = ss(seg(t, .8 + i * .9, 1.3 + i * .9)), sx = Math.abs(Math.cos(f * Math.PI)); c.save(); c.translate(x, 1180 + (i % 2) * 30); c.rotate((i - 2) * .06); c.scale(sx + .02, 1); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 14;
    if (f < .5) { c.fillStyle = '#3a1a2a'; c.fillRect(-60, -100, 120, 200); c.strokeStyle = '#d8b060'; c.lineWidth = 3; c.strokeRect(-48, -88, 96, 176); } else { c.fillStyle = '#efe4c8'; c.fillRect(-60, -100, 120, 200); c.shadowBlur = 0; c.fillStyle = '#7a2a24'; c.beginPath(); c.arc(0, -10, 30, 0, TAU); c.fill(); c.strokeStyle = '#2a1a10'; c.lineWidth = 2; c.strokeRect(-50, -90, 100, 180); }
    c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'TAROT FOR THE RICH', 540, 230, 44, { col: '#fff0e4', t1: 3.8 }); strip(c, t, 4.0, .8, 'AND, REPORTEDLY, POLICE', 540, 230, 40, { col: '#fff0e4' }); } }));
addReuse(89.19, 95.5, 5);
// 11 · Sara Aldrete: a student's books by day; candles by night
addRel(101.58, 109.77, D => ({ layers: [darkSky('#0a0610', '#2a1620'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const n = ss(seg(t, 3.0, 4.4));
  c.save(); c.globalAlpha = 1 - n; c.fillStyle = '#e8e0d0'; c.fillRect(0, 0, W, 1500); c.restore(); woman(c, 540, 1400, 1.7, { col: '#08060c' });
  c.save(); c.globalAlpha = 1 - n; c.fillStyle = '#3a4a7a'; c.fillRect(640, 1080, 120, 30); c.fillStyle = '#7a3a3a'; c.fillRect(646, 1050, 110, 30); c.fillStyle = '#3a6a4a'; c.fillRect(640, 1020, 116, 30); c.restore();
  if (n > 0) { c.save(); c.globalAlpha = n; candleRow(c, t, 6, 1440, 200, 880, 3.2, .1, 1.0); c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'SARA ALDRETE', 540, 220, 50, { col: '#1a1208', bg: '#f4ead4', t1: 3.4 }); strip(c, t, 3.6, .8, '"LA MADRINA"', 540, 220, 50, { col: '#ffd8e8' }); } }));
addReuse(109.77, 114.6, 6);
// 13 · the sentence: bars come down; "more than 60 years"
addRel(119.29, 128.54, D => ({ layers: [darkSky('#0a0a10', '#2a2a36'), Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(160, 360, 760, 1040)); }, '#14141c', .35, { rimA: .3, rim: '#d0d4e0' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const g = c.createLinearGradient(0, 360, 0, 1400); g.addColorStop(0, '#5a5e70'); g.addColorStop(1, '#2a2c38'); c.fillStyle = g; c.fillRect(160, 360, 760, 1040); woman(c, 540, 1380, 1.5, { col: '#08080c' }); const b = ss(seg(t, .4, 1.2)); c.fillStyle = '#05050a'; c.save(); c.translate(0, lerp(-1100, 0, b)); bars(c, 160, 360, 760, 1040, 8, 16); c.restore(); } })],
  cam: t => ({ x: 0, y: 0, z: 1.0 }), over: (c, t) => { strip(c, t, 1.2, .8, '1994 · 60+ YEARS', 540, 220, 48, { col: '#f4f4fa' }); strip(c, t, 4.6, .8, 'SHE INSISTS SHE IS INNOCENT', 540, 320, 36, { col: '#f4f4fa' }); } }));
// 14 · the foundation: sunrise, young people walking out into the light
addRel(128.54, 134.75, D => ({ layers: [darkSky('#4a5a7a', '#ffd8b0', [{ x: 540, y: 1100, r: 700, col: 'rgba(255,230,200,.6)' }]), Ly(c => { c.fillRect(-OFF, 1240, W + 2 * OFF, 800); }, '#3a3030', .5, { rimA: .4, rim: '#fff0e0', front: (c, t) => { sunDisc(c, 540, 1180, 110, '#fff4e0', .9);
  for (let i = 0; i < 7; i++) { const x = 150 + i * 130; dancer(c, x, 1460, .7 + (i % 3) * .08, t * .4, { shoes: false, col: '#1a1410', tired: .6, ph: i, sp: .5 }); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'THE MARK KILROY FOUNDATION', 540, 230, 40, { col: '#1a1208', bg: '#f4ead4' }) }));
addReuse(134.75, 146.5, 7);

// ---------- darker inserts ----------

// the search: flyers on every wall; a television in a dark room
addRel(25.0, 30.52, D => ({ layers: [darkSky('#0a0a10', '#1e1e28'), Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#2a2620', .3, { front: (c, t) => {
  for (let i = 0; i < 12; i++) { const x = 140 + (i % 4) * 260, y = 420 + Math.floor(i / 4) * 300, a = ss(seg(t, .1 + i * .15, .4 + i * .15)); newspaper(c, x, y, 200, 260, Math.sin(i * 2.3) * .08, a, [{ t: 'MISSING', s: 30, w: 600 }, { rule: 3 }, { t: 'MARK KILROY', s: 16 }]); }
  c.save(); c.fillStyle = '#0a0a0e'; c.fillRect(300, 1180, 480, 330); c.fillStyle = rgba('#8ab0e0', .55 + .15 * Math.sin(t * 9)); c.fillRect(326, 1204, 428, 270); c.fillStyle = '#1a2a40'; c.beginPath(); c.ellipse(540, 1310, 50, 60, 0, 0, TAU); c.fill(); c.fillRect(470, 1360, 140, 110); c.restore(); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, '20,000 FLYERS', 540, 200, 40, { col: '#f4f4fa' }); strip(c, t, 2.4, .8, 'NATIONAL TELEVISION', 540, 1100, 36, { col: '#f4f4fa' }); } }));
// inside the shed: the altar — skull, bones, candles, a machete against the wall
addRel(47.0, 51.71, D => ({ layers: [darkSky('#060304', '#1a0a0a'), Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#2a1410', .3, { glow: { x: 540, y: 1100, r: 600, col: '#ff7a3a', a: .4 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = '#0a0606'; c.fillRect(160, 1180, 760, 300); cauldron(c, 540, 1180, 1.0, t); skull(c, 540, 1000, 1.1, 1); bone(c, 420, 1090, 140, .5, .8); bone(c, 660, 1090, 140, -.5, .8);
    candleRow(c, t, 5, 1190, 220, 860, .1, .1, .8); c.save(); c.translate(900, 900); c.rotate(.18); c.fillStyle = '#b8bcc4'; poly0(c, [[-12, 0], [14, 0], [20, -300], [0, -330], [-16, -290]]); c.fill(); c.fillStyle = '#2a1a10'; c.fillRect(-10, 0, 20, 110); c.restore(); blood(c, 540, 1160, .8, t, 1.6, .9); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'THE ALTAR', 540, 220, 50, { col: '#fff0e4' }) }));
// the exhumation: masked diggers under floodlights; covered bodies in a row
addRel(66.4, 70.43, D => ({ layers: [darkSky('#06060a', '#1a1a22'), Ly(c => c.fillRect(-OFF, 1000, W + 2 * OFF, 1000), '#2a2420', .4, { glow: { x: 540, y: 1000, r: 800, col: '#f0f4ff', a: .3 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { spotlight(c, 200, -40, 1300, 700, .25); spotlight(c, 880, -40, 1300, 700, .25); for (let i = 0; i < 5; i++) { const a = ss(seg(t, .2 + i * .4, .6 + i * .4)); if (a <= 0) continue; c.save(); c.globalAlpha = a; covered(c, 160 + i * 190, 1440, 170, .9, String(i + 1)); c.restore(); }
    for (const [x, ph] of [[300, 0], [760, 1.3]]) { villager(c, x, 1250, .95, 0, ph, 0, 0); c.fillStyle = '#e8e8e8'; c.fillRect(x - 14, 1250 - 230 * .95, 28, 14); c.save(); c.strokeStyle = '#06060a'; c.lineWidth = 7; c.beginPath(); c.moveTo(x + 40, 1250 - 180); c.lineTo(x + 60 + Math.sin(t * 3 + ph) * 20, 1250); c.stroke(); c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .2, .6, 'THE EXHUMATION', 540, 220, 46, { col: '#f4f6fa' }) }));
// "protection": ritual beads and a blade on the altar; candles flare
addRel(95.5, 101.58, D => ({ layers: [darkSky('#060304', '#1e0c0a'), Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#2a120e', .3, { glow: { x: 540, y: 1000, r: 600, col: '#ff8a40', a: .35 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = '#0a0606'; c.fillRect(120, 1200, 840, 300); candleRow(c, t, 8, 1210, 170, 910, 0, .05, 1.0);
    c.save(); for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, x = 540 + Math.cos(a) * 180, y = 1060 + Math.sin(a) * 70; c.fillStyle = i % 4 === 0 ? '#c8302a' : (i % 2 ? '#f0e8d8' : '#1a1a1a'); c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); } c.restore(); skull(c, 540, 1060, .8, 1);
    for (let i = 0; i < 3; i++) shadowFig(c, 200 + i * 340, 1600, 2.2, .1, 'rgba(6,2,2,.75)'); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, '"PROTECTION FROM BULLETS"', 540, 220, 40, { col: '#ffc8a0' }) }));
// the standoff: muzzle flashes in a window, glass cracking, dollar bills fluttering down
addRel(114.6, 119.29, D => ({ layers: [darkSky('#06060e', '#1a1a28'), Ly(c => { aptBlock(c, 160, 1500, 760, 1300); }, '#0e0e16', .45, { rimA: .3, rim: '#c8c8e0' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const wx = 540, wy = 700; c.fillStyle = '#1a1e2a'; c.fillRect(wx - 140, wy - 120, 280, 240); [.4, .9, 1.3, 1.9, 2.6].forEach((t0, i) => muzzle(c, wx - 60 + (i % 3) * 60, wy - 20 + (i % 2) * 40, .7, Math.max(0, 1 - Math.abs(t - t0) / .08)));
    cracks(c, wx - 40, wy - 30, 1.2, ss(seg(t, .4, .6))); cracks(c, wx + 60, wy + 30, 1.0, ss(seg(t, 1.3, 1.5))); for (let i = 0; i < 18; i++) { const u = (t - 1.6 - i * .12); if (u < 0) continue; const R = mulberry(i + 7); bill(c, wx + (R() - .5) * 200 + Math.sin(u * 3 + i) * 60, wy + 120 + u * 260, 1.0, u * (R() - .5) * 4, clamp(1 - u / 3)); }
    policeLights(c, t, .7); } })],
  cam: t => ({ x: Math.sin(t * 40) * (Math.abs(t - .4) < .15 || Math.abs(t - 1.3) < .15 ? 5 : 0), y: 0, z: 1.06 }), over: (c, t) => strip(c, t, .2, .6, 'THE STANDOFF', 540, 200, 46, { col: '#f4f6fa' }) }));

SCENES.sort((a, b) => a.t0 - b.t0);
