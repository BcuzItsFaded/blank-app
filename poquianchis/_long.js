// ======================================================= LONG-FORM TIMELINE (Episode 25, ~2:20) =======================================================
addReuse(0, 9.88, 0);
// 2 · the family: four girls in an old photograph; their father's shadow behind
addRel(9.88, 20.89, D => ({ layers: [darkSky('#2a1c14', '#7a5a3a'), Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => {
  const sh = ss(seg(t, 4.0, 7.0)); c.save(); c.globalAlpha = .75 * sh; c.translate(540, 1500); c.scale(3.4, 3.4); villager(c, 0, 0, 1, 0, 0, 0, 1); c.restore();
  frame(c, 540, 820, 760, 560, '#d8c4a0'); c.save(); c.beginPath(); c.rect(160, 540, 760, 560); c.clip(); const g = c.createLinearGradient(0, 540, 0, 1100); g.addColorStop(0, '#cdb48c'); g.addColorStop(1, '#8a6e4a'); c.fillStyle = g; c.fillRect(160, 540, 760, 560);
  [[300, .9], [440, .82], [600, .76], [750, .7]].forEach(([x, k], i) => woman(c, x, 1100, k, { col: '#3a2818', flip: i % 2 ? -1 : 1 })); c.restore();
  tag(c, 'DELFINA · CARMEN · MARÍA LUISA · MARÍA DE JESÚS', 540, 1180, 28, '#fff0dc', ss(seg(t, 1.0, 2.0))); } })], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, D))) }),
  over: (c, t) => { strip(c, t, .3, .8, 'THE GONZÁLEZ VALENZUELA SISTERS', 540, 220, 36, { col: '#fff0e0' }); strip(c, t, 5.0, .8, 'A VIOLENT, HARD-DRINKING FATHER', 540, 320, 32, { col: '#fff0e0' }); } }));
// 3 · the flight: a wagon on a night road; a signpost to Guanajuato
addRel(20.89, 26.91, D => ({ layers: [darkSky('#06081a', '#2a3050', [{ x: 760, y: 420, r: 500, col: 'rgba(220,226,240,.35)' }]), Ly(c => { skylineFar(c, 1100, 12, 30, 90, false); c.fillRect(-OFF, 1200, W + 2 * OFF, 800); }, '#0c0e1a', .4, { rimA: .3, rim: '#c8d0e0', front: (c, t) => {
  sunDisc(c, 760, 420, 60, '#eef2f8', .85); const x = lerp(1100, 360, ss(seg(t, 0, D))); c.save(); c.fillStyle = '#06070c'; c.fillRect(x - 120, 1330, 240, 70); c.beginPath(); c.arc(x - 80, 1410, 34, 0, TAU); c.arc(x + 80, 1410, 34, 0, TAU); c.fill(); c.restore();
  for (let i = 0; i < 3; i++) woman(c, x + 170 + i * 60, 1440, .7 - i * .05, { col: '#06070c' }); villager(c, x - 200, 1440, .9, 0, 0, 0, 1);
  c.fillStyle = '#06070c'; c.fillRect(180, 1150, 12, 290); c.save(); c.translate(186, 1170); c.rotate(-.06); c.fillRect(-10, -30, 230, 56); c.restore(); tag(c, 'GUANAJUATO →', 300, 1142, 28, '#e8ecf4'); } })], cam: t => ({ x: lerp(20, -20, ss(seg(t, 0, D))), y: 0, z: 1.04 }),
  over: (c, t) => { strip(c, t, .3, .8, 'THE FAMILY FLED', 540, 220, 46, { col: '#f4f6fa' }); strip(c, t, 2.6, .8, 'AND CHANGED ITS NAME', 540, 320, 40, { col: '#f4f6fa' }); } }));
// 4 · the spread: a paper map of central Mexico; red lamps light town after town
addRel(26.91, 38.96, D => { const TOWNS = [[560, 820, 'SAN FRANCISCO DEL RINCÓN'], [640, 760, 'LEÓN'], [470, 700, 'LAGOS DE MORENO'], [300, 900, 'GUADALAJARA'], [760, 900, 'IRAPUATO'], [880, 860, 'QUERÉTARO']];
  return { layers: [darkSky('#1a1410', '#3a2a1e'), Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 30; c.fillStyle = PAPERC; c.fillRect(110, 420, 860, 760); c.restore();
    c.save(); c.strokeStyle = 'rgba(90,70,50,.55)'; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(150, 640); c.bezierCurveTo(330, 600, 420, 760, 520, 720); c.bezierCurveTo(620, 690, 700, 640, 940, 700); c.moveTo(380, 1150); c.bezierCurveTo(440, 960, 560, 940, 700, 1140); c.stroke(); c.restore();
    for (const [x, y, s] of [[260, 1040, 'JALISCO'], [620, 610, 'GUANAJUATO'], [860, 1040, 'QUERÉTARO']]) tag(c, s, x, y, 30, 'rgba(90,70,50,.7)');
    TOWNS.forEach(([x, y, n], i) => { const a = ss(seg(t, 1.0 + i * 1.3, 1.8 + i * 1.3)); if (a <= 0) return; redLamp(c, x, y, .6, t + i, a); tag(c, n, x, y + 36, 18, INKP, a); }); } })],
    cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'THE FIRST BAR', 540, 220, 46, { col: '#fff0e0', t1: 4.4 }); strip(c, t, 4.6, .8, 'JALISCO · GUANAJUATO · QUERÉTARO', 540, 220, 34, { col: '#fff0e0' }); } }; });
addReuse(38.96, 46.01, 1);
addReuse(46.01, 55.73, 2);
// 7 · the captain at the door; officials walk past and look away
addRel(55.73, 64.27, D => ({ layers: [darkSky('#0c0608', '#2a1214'), Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { archPath(c2, 540, 640, 260, 720); c2.fill(); }); }, '#180c0c', .4, { rimA: .3, rim: '#ff9a80' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.save(); c.globalCompositeOperation = 'destination-over'; c.restore(); redLamp(c, 540, 560, 1.1, t); villager(c, 540, 1380, 1.4, 0, 0, 0, 1); c.save(); c.strokeStyle = '#05050a'; c.lineWidth = 9; c.beginPath(); c.moveTo(500, 1380 - 280); c.lineTo(470, 1380 - 60); c.stroke(); c.restore();
    for (let i = 0; i < 2; i++) { const x = lerp(-120 - i * 140, 1200 - i * 140, ss(seg(t, 2.6, D - .4))); c.save(); c.translate(x, 1480); c.rotate(.04); villager(c, 0, 0, 1.25, 0, i, 0, 1); c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'A FORMER ARMY CAPTAIN', 540, 220, 44, { col: '#ffe2d8', t1: 3.6 }); strip(c, t, 3.8, .8, 'OFFICIALS LOOKED THE OTHER WAY', 540, 220, 36, { col: '#ffe2d8' }); } }));
addReuse(64.27, 71.74, 3);
addReuse(71.74, 77.73, 4);
// 10 · arrests and the press frenzy
addRel(77.73, 87.63, D => ({ layers: [darkSky('#0c0c12', '#2a2a36'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { policeLights(c, t, ss(seg(t, 0, 1.0)) * (1 - ss(seg(t, 4.6, 5.4))));
  if (t < 5.4) { const a = 1 - ss(seg(t, 4.6, 5.4)); c.save(); c.globalAlpha = a; woman(c, 420, 1420, 1.3, { col: '#06060a' }); woman(c, 560, 1420, 1.25, { col: '#06060a' }); villager(c, 300, 1420, 1.35, 0, 0, 0, 1); villager(c, 700, 1420, 1.35, 0, 1, 0, 1); c.restore(); }
  [[0, 300, 720, -.08], [.8, 760, 900, .06], [1.6, 420, 1150, -.03]].forEach(([d, x, y, r], i) => newspaper(c, x, y, 520, 640, r, ss(seg(t, 5.0 + d, 5.6 + d)), [{ t: ['¡HORROR!', 'LAS POQUIANCHIS', '¡CAPTURADAS!'][i], s: 54, w: 600 }, { rule: 5 }, { t: 'EDICIÓN EXTRA', s: 26 }])); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'DELFINA & MARÍA DE JESÚS ARRESTED', 540, 200, 34, { col: '#f4f6fa', t1: 4.6 }); strip(c, t, 2.4, .8, 'MARÍA LUISA FLED', 540, 300, 40, { col: '#f4f6fa', t1: 4.6 }); } }));
addReuseX(87.63, 98.88, 5, (c, t) => strip(c, t, 8.0, .8, 'SOME SAY ONLY 8 CONFIRMED', 540, 450, 32, { col: '#ffe2d0' }));
addReuseX(98.88, 106.18, 6, (c, t) => strip(c, t, 4.2, .8, 'CARMEN HAD DIED YEARS BEFORE', 540, 310, 32, { col: '#f4f4fa' }));
// 13 · their fates: three candles in a cell window go out
addRel(106.18, 119.59, D => ({ layers: [darkSky('#06060c', '#1a1a26'), Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(180, 600, 720, 420)); }, '#121218', .35, { rimA: .3, rim: '#c8c8d8' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = '#05050a'; bars(c, 180, 600, 720, 420, 8, 12); c.fillRect(160, 1020, 760, 30);
    [[300, 'DELFINA', '† 1968', 3.6], [540, 'MARÍA LUISA', '† 1984', 7.4], [780, 'MARÍA DE JESÚS', 'RELEASED', 11.0]].forEach(([x, n, d, t0], i) => { const out = ss(seg(t, t0, t0 + .5)); c.fillStyle = '#e6dcc4'; c.fillRect(x - 8, 970, 16, 50); if (out < 1) { c.save(); c.globalAlpha = 1 - out; flame(c, x, 970, .7, t, i); c.restore(); }
      tag(c, n, x, 1110, 28, '#f4f0e8', ss(seg(t, t0 - 2.6, t0 - 2.0))); tag(c, d, x, 1150, 26, '#c8c0b0', ss(seg(t, t0 - 2.6, t0 - 2.0))); }); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'WHAT BECAME OF THEM', 540, 230, 44, { col: '#f4f4fa' }) }));
// 14 · the legacy: a projector beam, a book, a screen
addRel(119.59, 131.19, D => ({ layers: [darkSky('#06040a', '#1a1220'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => {
  c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(1000, 1100, 300, 600); g.addColorStop(0, 'rgba(255,240,210,.35)'); g.addColorStop(1, 'rgba(255,240,210,.05)'); c.fillStyle = g; c.beginPath(); c.moveTo(1000, 1100); c.lineTo(120, 420); c.lineTo(120, 880); c.closePath(); c.fill(); c.restore();
  c.fillStyle = '#e8e0d0'; c.globalAlpha = .9; c.fillRect(120, 420, 520, 460); c.globalAlpha = 1; for (let i = 0; i < 3; i++) woman(c, 270 + i * 120, 860, .9, { col: '#2a2420' }); tag(c, '1976 · FILM', 380, 940, 30, '#fff0e0', ss(seg(t, .6, 1.4)));
  c.save(); c.translate(820, 1240); c.rotate(.08); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 20; c.fillStyle = '#7a2a24'; c.fillRect(-120, -170, 240, 340); c.shadowBlur = 0; c.fillStyle = '#f4ead4'; c.font = '600 34px "IM Fell English SC"'; c.textAlign = 'center'; c.fillText('LAS', 0, -60); c.fillText('MUERTAS', 0, -16); c.restore(); tag(c, '1977 · NOVEL', 820, 1450, 30, '#fff0e0', ss(seg(t, 3.6, 4.4)));
  c.save(); c.fillStyle = '#0a0a10'; c.fillRect(170, 1140, 380, 250); c.fillStyle = rgba('#8ab0e0', .7 * ss(seg(t, 7.0, 7.8))); c.fillRect(190, 1160, 340, 210); c.restore(); tag(c, '2025 · SERIES', 360, 1450, 30, '#fff0e0', ss(seg(t, 7.0, 7.8))); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'MEXICO NEVER FORGOT', 540, 230, 44, { col: '#fff0e0' }) }));
addReuse(131.19, 140.4, 7);
