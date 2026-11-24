// ======================================================= LONG-FORM TIMELINE (Episode 26, ~2:05) =======================================================
addReuse(0, 8.96, 0);
addReuse(8.96, 11.7, 1);
addReuseX(11.7, 18.5, 2, (c, t) => strip(c, t, .4, .8, 'LATE 1990s – 2005', 540, 1300, 40, { col: '#fff0f0', t1: 4.0 }));
// 4 · the knock: an "official" with a clipboard and a welfare form at an old woman's door
addRel(24.04, 32.74, D => ({ layers: [darkSky('#0a0a10', '#262630'), Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(520, 520, 340, 860)); }, '#14141c', .35, { rimA: .3, rim: '#e0d8c8' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = '#e8d8b8'; c.fillRect(520, 520, 340, 860); woman(c, 700, 1380, 1.2, { col: '#2a2420' }); c.fillStyle = '#c8b890'; c.beginPath(); c.ellipse(700, 1380 - 262 * 1.2, 34, 14, 0, 0, TAU); c.fill();
    woman(c, 360, 1400, 1.45, { col: '#08080c' }); const fa = ss(seg(t, 1.6, 2.6)); newspaper(c, 470, 1050, 220, 290, -.12, fa, [{ t: 'PROGRAMA', s: 30, w: 600 }, { t: 'SOCIAL', s: 30, w: 600 }, { rule: 3 }, { t: 'PENSIÓN', s: 24 }]); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.07, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'A "GOVERNMENT WORKER"?', 540, 230, 46, { col: '#f4f4fa' }) }));
// 5 · the wrong suspects: a composite sketch; police lights sweep the street
addRel(32.74, 43.01, D => ({ layers: [darkSky('#06060e', '#1a1a28'), Ly(c => { aptBlock(c, -40, 1300, 560, 820); aptBlock(c, 620, 1300, 500, 760); c.fillRect(-OFF, 1300, W + 2 * OFF, 700); }, '#0e0e16', .45, { rimA: .3, rim: '#c8c8e0' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const a = 1 - ss(seg(t, 4.6, 5.4)); if (a > 0) { c.save(); c.globalAlpha = a; c.translate(540, 900); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 20; c.fillStyle = PAPERC; c.fillRect(-200, -280, 400, 560); c.shadowBlur = 0; c.fillStyle = '#2a2420'; c.font = '28px "IM Fell English SC"'; c.textAlign = 'center'; c.fillText('RETRATO HABLADO', 0, -236); c.restore(); c.save(); c.globalAlpha = a; woman(c, 540, 1130, 1.25, { col: '#2a2420' }); c.restore(); }
    policeLights(c, t, ss(seg(t, 4.8, 5.8))); if (t > 5.0) for (let i = 0; i < 5; i++) { const x = 160 + i * 190; villager(c, x, 1460, 1.05, 0, i, 0, 0); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, '"A MASCULINE-LOOKING WOMAN"', 540, 220, 38, { col: '#f4f6fa', t1: 4.8 }); strip(c, t, 5.0, .8, 'POLICE HUNTED A MAN IN DISGUISE', 540, 220, 34, { col: '#f4f6fa' }); } }));
// 6 · "media sensationalism": headlines pile up; the count keeps rising
addRel(43.01, 47.5, D => ({ layers: [darkSky('#0c0c12', '#2a2a36'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => {
  [[0, 330, 640, -.06, '¿ASESINO SERIAL?'], [1.4, 760, 760, .05, 'SENSACIONALISMO'], [3.0, 400, 1000, .03, 'OTRA VÍCTIMA'], [4.4, 720, 1180, -.05, 'Y OTRA MÁS']].forEach(([d, x, y, r, h]) => newspaper(c, x, y, 520, 520, r, ss(seg(t, d, d + .6)), [{ t: h, s: 44, w: 600 }, { rule: 4 }, { t: 'CIUDAD DE MÉXICO', s: 22 }])); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, '"MEDIA SENSATIONALISM"', 540, 200, 42, { col: '#f4f4fa', t1: 3.4 }); strip(c, t, 3.6, .8, 'THE DEATHS KEPT COMING', 540, 200, 42, { col: '#f4f4fa' }); } }));
// 7 · a strange lead: the same painting of a boy in a red waistcoat in three homes
addRel(51.06, 61.06, D => ({ layers: [darkSky('#100c0c', '#2a2020'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => {
  [[270, 640], [810, 780], [430, 1180]].forEach(([x, y], i) => { const a = ss(seg(t, .4 + i * 1.6, 1.0 + i * 1.6)); if (a <= 0) return; c.save(); c.globalAlpha = a; frame(c, x, y, 260, 330, '#3a3024'); c.fillStyle = '#c8302a'; c.shadowColor = '#c8302a'; c.shadowBlur = 16; c.fillRect(x - 54, y - 20, 108, 130); c.shadowBlur = 0; c.fillStyle = '#e6c8a8'; c.beginPath(); c.ellipse(x, y - 62, 34, 40, 0, 0, TAU); c.fill(); c.fillStyle = '#4a3020'; c.beginPath(); c.ellipse(x, y - 86, 36, 20, 0, Math.PI, TAU); c.fill(); c.restore(); }); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'THE BOY IN THE RED WAISTCOAT', 540, 220, 38, { col: '#ffe8e4', t1: 6.4 }); strip(c, t, 6.6, .8, 'ONLY A COINCIDENCE', 540, 220, 44, { col: '#ffe8e4' }); } }));
addReuse(61.06, 64.07, 3);
addReuseX(64.07, 70.0, 4, (c, t) => strip(c, t, 3.6, .8, 'ANA MARÍA DE LOS REYES ALFARO, 82', 540, 430, 30, { col: '#f4f6fa' }));
// 10 · Hidalgo, 1957: a little girl alone on a doorstep at dusk
addRel(74.62, 84.43, D => ({ layers: [darkSky('#2a1a24', '#b87860', [{ x: 300, y: 1000, r: 600, col: 'rgba(255,190,140,.4)' }]), Ly(c => { skylineFar(c, 1080, 5, 30, 80, false); }, '#3a2228', .2), Ly(c => { c.fillRect(380, 900, 420, 420); poly0(c, [[360, 904], [590, 760], [820, 904]]); c.fill(); hole(c, c2 => c2.fillRect(540, 1100, 100, 220)); c.fillRect(-OFF, 1310, W + 2 * OFF, 700); }, '#1a1014', .5, { rimA: .35, rim: '#ffc8b0' }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = 'rgba(255,200,150,.6)'; c.fillRect(540, 1100, 100, 220); dancer(c, 590, 1330, .55, 0, { tired: 1, shoes: false, col: '#08060a' }); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'JUANA BARRAZA', 540, 220, 50, { col: '#fff0f0' }); strip(c, t, 1.4, .8, 'HIDALGO · 1957', 540, 330, 40, { col: '#fff0f0' }); } }));
addReuse(84.43, 91.28, 5);
// 12 · the evidence: a fingerprint card glows; ten crime scenes
addRel(91.28, 96.0, D => ({ layers: [darkSky('#06080e', '#16202a'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 24; c.fillStyle = PAPERC; c.fillRect(190, 520, 700, 860); c.restore();
  tag(c, 'HUELLAS DACTILARES', 540, 590, 36, INKP); for (let i = 0; i < 10; i++) { const x = 300 + (i % 5) * 120, y = 760 + Math.floor(i / 5) * 260, a = ss(seg(t, .6 + i * .3, 1.0 + i * .3)); c.save(); c.globalAlpha = a; c.strokeStyle = '#2a3a5a'; c.lineWidth = 2.2; for (let r = 0; r < 9; r++) { c.beginPath(); c.ellipse(x, y, 10 + r * 5, 16 + r * 6.5, .1 * Math.sin(i + r), Math.PI * (.1 + .05 * (r % 3)), Math.PI * (2.0 - .1 * (r % 2))); c.stroke(); } c.restore(); }
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(120,200,255,${.12 + .08 * Math.sin(t * 4)})`; c.fillRect(190, 520 + ((t * 260) % 860), 700, 6); c.restore(); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'LINKED TO 10+ SCENES', 540, 230, 44, { col: '#f0f6ff', t1: 2.6 }); strip(c, t, 2.8, .8, 'SHE ADMITTED TO FOUR', 540, 230, 44, { col: '#f0f6ff' }); } }));
addReuseX(100.65, 108.36, 6, (c, t) => strip(c, t, .3, .8, '2008', 540, 1340, 50, { col: '#f4f4fa' }));
// 14 · cases closed: folders stamped CERRADO stack up
addRel(108.36, 117.18, D => ({ layers: [darkSky('#0c0a0a', '#2a2420'), Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { for (let i = 0; i < 18; i++) { const a = ss(seg(t, .2 + i * .22, .6 + i * .22)); if (a <= 0) continue; const x = 300 + (i % 3) * 240 + Math.sin(i * 3.7) * 20, y = 1380 - Math.floor(i / 3) * 110;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(Math.sin(i * 2.1) * .06); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 12; c.fillStyle = '#c8a870'; c.fillRect(-110, -44, 220, 88); c.fillRect(-110, -56, 80, 16); c.shadowBlur = 0; c.strokeStyle = '#b8302a'; c.lineWidth = 4; c.strokeRect(-70, -20, 140, 40); c.fillStyle = '#b8302a'; c.font = '600 24px "IM Fell English SC"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CERRADO', 0, 1); c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.05, ss(seg(t, 0, D))) }), over: (c, t) => { strip(c, t, .3, .8, 'AS MANY AS 40 DEATHS', 540, 220, 46, { col: '#fff4ec', t1: 4.2 }); strip(c, t, 4.4, .8, 'CASES CLOSED · SOME NEVER SOLVED', 540, 220, 34, { col: '#fff4ec' }); } }));
addReuse(117.18, 125.5, 7);

// ---------- darker inserts ----------

// a crime scene: tape across the door, a chalk outline, an overturned chair
addRel(18.5, 24.04, D => ({ layers: [darkSky('#0a0a10', '#22222c'), Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#2a2622', .3, { glow: { x: 540, y: 1100, r: 700, col: '#e8e0d0', a: .3 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.fillStyle = '#3a3430'; c.fillRect(-OFF, 1000, W + 2 * OFF, 1000); chalkOutline(c, 560, 1240, 1.6, ss(seg(t, .3, 1.3))); c.save(); c.translate(860, 1180); c.rotate(1.3); c.fillStyle = '#0a0808'; c.fillRect(-60, -10, 120, 16); c.fillRect(-56, 0, 10, 90); c.fillRect(44, 0, 10, 90); c.fillRect(-60, -100, 12, 100); c.restore();
    evMarker(c, 380, 1330, 1.2, 1); evMarker(c, 760, 1360, 1.2, 2); blood(c, 470, 1280, .8, t, .6, .8); crimeTape(c, 760, -.12, ss(seg(t, 1.0, 1.6))); crimeTape(c, 860, .08, ss(seg(t, 1.3, 1.9))); policeLights(c, t, .35); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.1, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'ANOTHER VICTIM', 540, 220, 46, { col: '#f4f4fa' }) }));
// the evidence board: a red X for every victim
addRel(47.5, 51.06, D => ({ layers: [darkSky('#100c0a', '#2a221c'), Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#4a3424', .3, { front: (c, t) => {
  for (let i = 0; i < 20; i++) { const x = 190 + (i % 5) * 175, y = 520 + Math.floor(i / 5) * 230; c.save(); c.translate(x, y); c.rotate(Math.sin(i * 3.1) * .05); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 8; c.fillStyle = PAPERC; c.fillRect(-62, -80, 124, 160); c.shadowBlur = 0; c.fillStyle = '#8a7a64'; c.beginPath(); c.ellipse(0, -18, 26, 30, 0, 0, TAU); c.fill(); c.fillRect(-36, 14, 72, 50); c.restore();
    const xa = ss(seg(t, .2 + i * .14, .4 + i * .14)); if (xa > 0) { c.save(); c.strokeStyle = '#c8202a'; c.lineWidth = 9; c.globalAlpha = xa; c.beginPath(); c.moveTo(x - 50, y - 64); c.lineTo(x + 50, y + 64); c.moveTo(x + 50, y - 64); c.lineTo(x - 50, y + 64); c.stroke(); c.restore(); } } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'THE COUNT KEPT RISING', 540, 200, 44, { col: '#fff0f0' }) }));
// the last scene: a stethoscope on the floor under a flashlight; evidence marker
addRel(70.0, 74.62, D => ({ layers: [darkSky('#06060a', '#12121a'), Ly(c => c.fillRect(-OFF, 900, W + 2 * OFF, 1100), '#2a2622', .4),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const bx = 540 + Math.sin(t * .9) * 120, by = 1200; c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(bx, by, 10, bx, by, 380); g.addColorStop(0, 'rgba(255,245,220,.45)'); g.addColorStop(1, 'rgba(255,245,220,0)'); c.fillStyle = g; c.fillRect(bx - 380, by - 380, 760, 760); c.restore();
    c.save(); c.strokeStyle = '#1a1a20'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(380, 1180); c.bezierCurveTo(420, 1300, 560, 1320, 620, 1240); c.bezierCurveTo(660, 1180, 720, 1180, 760, 1230); c.stroke(); c.fillStyle = '#b8bcc8'; c.beginPath(); c.arc(780, 1250, 30, 0, TAU); c.fill(); c.lineWidth = 8; c.beginPath(); c.moveTo(380, 1180); c.lineTo(340, 1120); c.moveTo(380, 1180); c.lineTo(420, 1110); c.stroke(); c.restore();
    evMarker(c, 300, 1330, 1.3, 3); crimeTape(c, 900, -.06, 1); } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.12, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, 'EVIDENCE', 540, 230, 52, { col: '#f4f4fa' }) }));
// resentment: on the wall, a shadow with a cord approaches another shadow; cut before contact
addRel(96.0, 100.65, D => ({ layers: [darkSky('#0a0606', '#1e1010'), Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#5a3a2a', .3, { glow: { x: 900, y: 1000, r: 700, col: '#ffb070', a: .45 } }),
  Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const u = ss(seg(t, .4, 3.4)); shadowFig(c, lerp(200, 520, u), 1460, 2.6, .55, 'rgba(8,4,4,.88)', 2); c.save(); c.translate(820, 1460); c.scale(-1, 1); woman(c, 0, 0, 2.2, { col: 'rgba(8,4,4,.88)' }); c.restore(); flame(c, 980, 1280, .9, t, 4);
    if (t > 3.6) { c.save(); c.fillStyle = `rgba(160,10,20,${.55 * ss(seg(t, 3.6, 3.9))})`; c.fillRect(0, 0, W, H); c.restore(); } } })],
  cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 0, D))) }), over: (c, t) => strip(c, t, .3, .8, '"RESENTMENT"', 540, 220, 50, { col: '#ffe2d8' }) }));

SCENES.sort((a, b) => a.t0 - b.t0);
