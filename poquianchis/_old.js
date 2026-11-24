const OLD = [];
// ======================================================= SCENES =======================================================
// 1 · LAS POQUIANCHIS — a 1950s Guanajuato street at dusk; four sisters in a red-lit doorway
OLD.push([0, 10.02, () => { const F = [[-40, 1300, 300, 460], [260, 1300, 300, 520], [560, 1300, 280, 440], [840, 1300, 300, 500]];
  const sky = darkSky('#1a0e14', '#c87050', [{ x: 540, y: 1000, r: 700, col: 'rgba(255,170,110,.45)' }]);
  const far = Ly(c => { skylineFar(c, 1040, 33, 80, 180, false); facade(c, 420, 1040, 240, 260, { dome: 1 }); }, '#3a1e1e', .25, { rimA: .3, rim: '#ffc8a0' });
  const st = Ly(c => F.forEach(([x, b, w, h]) => facade(c, x, b, w, h, { door: x === 260 })), '#1a0e0e', .55, { rimA: .35, rim: '#ffc8a0' });
  st.back = (c, t) => F.forEach(([x, b, w, h]) => facadeBack(c, x, b, w, h, '#ffc070', .55, t, { door: x === 260, doorCol: '#ff4a3a' }));
  const fg = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { redLamp(c, 410, 1080, 1.1, t); for (let i = 0; i < 4; i++) woman(c, 360 + i * 34, 1300, .62, { col: '#0a0606', flip: i % 2 ? -1 : 1 }); dust(c, t, 30, 81, .3); } });
  return { layers: [sky, far, st, haze(1150, 1500, '#c86040', .3), fg, frontBand('#0a0606', 3)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, 10))) }),
    over: (c, t) => { strip(c, t, .1, .8, 'PLOT TWIST WITH A&R  ·  EPISODE 25', 540, 150, 30, { col: '#ffe2c8', font: 'Cormorant Garamond', t1: 7.0 }); strip(c, t, .4, 1.0, 'LAS POQUIANCHIS', 540, 290, 70, { col: '#fff0e0', t1: 7.0 }); strip(c, t, 1.4, .9, 'GUANAJUATO, MEXICO · 1950s', 540, 400, 38, { col: '#ffe2c8', t1: 7.0 }); strip(c, t, 2.4, .9, 'A DOCUMENTED TRUE STORY', 540, 490, 30, { col: '#ffe2c8', t1: 7.0 }); strip(c, t, 7.2, .8, 'FOUR SISTERS', 540, 290, 56, { col: '#fff0e0', t1: 9.9 }); } };
}]);
// 2 · THE AD — "housemaid wanted"; a young woman with a suitcase answers it
OLD.push([10.02, 17.1, () => {
  const sky = darkSky('#2a2420', '#7a6050');
  const fg = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { newspaper(c, 540, 760, 760, 940, -.04, ss(seg(t, 10.2, 11.0)), [{ t: 'AVISOS DE OCASIÓN', s: 56, w: 600 }, { rule: 6 }, { t: 'AVISOS · CLASIFICADOS', s: 30 }, { rule: 3, }, { t: '', s: 20 }, { t: 'SE SOLICITA', s: 70, w: 600, box: 220 }, { t: 'SIRVIENTA', s: 70, w: 600 }, { t: 'BUEN SUELDO · INFORMES AQUÍ', s: 30, gap: 30 }]);
    if (t > 13.6) { const u = ss(seg(t, 13.6, 16.8)); woman(c, lerp(-60, 420, u), 1460, 1.5, { col: '#0a0806' }); c.fillStyle = '#0a0806'; c.fillRect(lerp(-60, 420, u) + 40, 1340, 70, 54); }
    strip(c, t, 11.2, .8, 'HOUSEMAID WANTED', 540, 1310, 44, { col: '#fff0e0', t1: 16.9 }); } });
  return { layers: [sky, fg, frontBand('#0c0806', 5)], cam: t => ({ x: 0, y: 0, z: lerp(1.02, 1.1, ss(seg(t, 10.02, 17.1))) }) };
}]);
// 3 · LOCKED IN — barred windows under a red lamp
OLD.push([17.1, 24.44, () => {
  const sky = darkSky('#0c0608', '#2a1012');
  const wall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => { c2.fillRect(160, 520, 320, 460); c2.fillRect(600, 520, 320, 460); }); }, '#1c0e0e', .35, { rimA: .3, rim: '#ff9a80' });
  wall.back = (c, t) => { c.fillStyle = rgba('#ff5040', .5 * flick(t)); c.fillRect(160, 520, 320, 460); c.fillRect(600, 520, 320, 460); c.fillStyle = '#0a0404'; for (const [x, i] of [[300, 0], [760, 1], [820, 2]]) { c.beginPath(); c.ellipse(x, 800, 22, 26, 0, 0, TAU); c.fill(); c.fillRect(x - 36, 826, 72, 160); } };
  const grid = Ly(c => { bars(c, 160, 520, 320, 460, 6, 12); bars(c, 600, 520, 320, 460, 6, 12); c.fillRect(140, 500, 360, 24); c.fillRect(580, 500, 360, 24); c.fillRect(140, 978, 360, 24); c.fillRect(580, 978, 360, 24); }, '#0a0606', .6, { rimA: .3, rim: '#ff9a80', front: (c, t) => { redLamp(c, 540, 400, 1.2, t); c.fillStyle = '#0a0606'; c.fillRect(480, 1100, 120, 140); c.beginPath(); c.arc(540, 1100, 46, Math.PI, TAU); c.lineWidth = 14; c.strokeStyle = '#0a0606'; c.stroke(); } });
  return { layers: [sky, wall, grid, frontBand('#060303', 7)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.07, ss(seg(t, 17.1, 24.44))) }),
    over: (c, t) => { strip(c, t, 17.6, .8, 'LOCKED IN · FORCED TO WORK', 540, 220, 40, { col: '#ffe2d8', t1: 21.0 }); strip(c, t, 21.2, .8, 'THEN THEY DISAPPEARED', 540, 220, 42, { col: '#ffe2d8', t1: 24.3 }); } };
}]);
// 4 · THE ESCAPE — 1964: a woman runs through the night toward the lights of León
OLD.push([24.44, 31.84, () => {
  const sky = darkSky('#060814', '#1e2a44', [{ x: 760, y: 380, r: 500, col: 'rgba(220,228,240,.4)' }]);
  const city = Ly(c => skylineFar(c, 1120, 44, 30, 110, false), '#0c1020', .2, { front: (c, t) => { const R = mulberry(9); for (let i = 0; i < 80; i++) { c.fillStyle = rgba('#ffd890', .35 + .5 * R()); c.fillRect(R() * W, 1060 + R() * 60, 3, 3); } sunDisc(c, 760, 380, 60, '#eef2f8', .85); } });
  const road = Ly(c => { c.fillRect(-OFF, 1140, W + 2 * OFF, 800); hole(c, c2 => { poly0(c2, [[520, 1140], [560, 1140], [900, 1600], [180, 1600]]); c2.fill(); }); }, '#0a0c14', .5, { rimA: .3, rim: '#c8d0e0' });
  road.back = c => { c.fillStyle = '#3a4258'; c.fillRect(150, 1140, 780, 500); };
  const run = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const u = ss(seg(t, 24.6, 31.6)); dancer(c, lerp(560, 540, u), lerp(1500, 1200, u), lerp(1.6, .5, u), t * 1.6, { col: '#06070c', shoes: false, sp: 2.2, tired: .8, lean: -.18 }); } });
  return { layers: [sky, city, road, run, frontBand('#04050a', 9)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 24.44, 31.84))) }),
    over: (c, t) => { strip(c, t, 24.8, .8, '1964', 540, 200, 60, { col: '#f0f4fa', t1: 31.6 }); strip(c, t, 25.8, .8, 'CATALINA ORTEGA ESCAPED', 540, 300, 40, { col: '#f0f4fa', t1: 31.6 }); } };
}]);
// 5 · THE RANCH — police with lanterns and shovels start digging
OLD.push([31.84, 37.86, () => {
  const sky = darkSky('#1a1018', '#7a4a3a', [{ x: 300, y: 1000, r: 600, col: 'rgba(255,170,110,.35)' }]);
  const ranch = Ly(c => { c.fillRect(620, 880, 340, 220); poly0(c, [[600, 884], [790, 800], [980, 884]]); c.fill(); for (let x = -40; x < 600; x += 70) c.fillRect(x, 1010, 10, 90); c.fillRect(-OFF, 1030, 660, 8); c.fillRect(-OFF, 1100, W + 2 * OFF, 900); }, '#1a100c', .4, { rimA: .35, rim: '#ffc8a0' });
  const dig = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { for (const [x, ph] of [[220, 0], [420, 1.4], [680, 2.6], [880, .7]]) { const sw = Math.sin(t * 2.6 + ph); villager(c, x, 1440, 1.0, 0, ph, 0, 1); c.save(); c.strokeStyle = '#06050a'; c.lineWidth = 8; c.beginPath(); c.moveTo(x + 40, 1440 - 190); c.lineTo(x + 70 + sw * 30, 1440 - 20 + sw * 20); c.stroke(); c.restore(); flame(c, x - 50, 1350, .5, t, ph); }
    c.save(); c.fillStyle = '#2a1a12'; for (const x of [240, 700]) { c.beginPath(); c.ellipse(x, 1460, 130, 22, 0, 0, TAU); c.fill(); } c.restore(); } });
  return { layers: [sky, ranch, dig, frontBand('#0c0806', 11)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.07, ss(seg(t, 31.84, 37.86))) }),
    over: (c, t) => strip(c, t, 32.2, .8, 'RANCHO EL ÁNGEL', 540, 220, 48, { col: '#fff0e0', t1: 37.7 }) };
}]);
// 6 · THE NUMBER — small white flags fill the ground; the count is disputed
OLD.push([37.86, 46.1, () => {
  const sky = darkSky('#0c0a10', '#3a2a30');
  const ground = Ly(c => c.fillRect(-OFF, 960, W + 2 * OFF, 1000), '#1a1210', .5, { rimA: .3, rim: '#e8d8c8', front: (c, t) => smallFlags(c, t, 91, 990, 1480, 7, .95, 38.2, .05) });
  return { layers: [sky, ground, frontBand('#080604', 13)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 37.86, 46.1))) }),
    over: (c, t) => { strip(c, t, 38.4, .8, 'REPORTS CLAIMED 91 BODIES', 540, 230, 44, { col: '#fff4ec', t1: 46.0 }); strip(c, t, 42.4, .9, 'THE TRUE NUMBER IS STILL DISPUTED', 540, 340, 34, { col: '#ffe2d0', t1: 46.0 }); } };
}]);
// 7 · FORTY YEARS — prison bars come down
OLD.push([46.1, 50.55, () => {
  const sky = darkSky('#0a0a10', '#2a2a36');
  const cell = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(120, 300, 840, 1100)); }, '#14141c', .35, { rimA: .3, rim: '#d0d4e0' });
  cell.back = c => { const g = c.createLinearGradient(0, 300, 0, 1400); g.addColorStop(0, '#5a5e70'); g.addColorStop(1, '#2a2c38'); c.fillStyle = g; c.fillRect(120, 300, 840, 1100); };
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { for (let i = 0; i < 3; i++) woman(c, 330 + i * 210, 1380, 1.25, { col: '#08080c', flip: i === 1 ? -1 : 1 }); const b = ss(seg(t, 46.4, 47.2)); c.fillStyle = '#05050a'; c.save(); c.translate(0, lerp(-1200, 0, b)); bars(c, 120, 300, 840, 1100, 9, 16); c.restore(); } });
  return { layers: [sky, cell, fg, frontBand('#040408', 15)], cam: t => ({ x: 0, y: 0, z: 1.0 }), over: (c, t) => strip(c, t, 47.3, .8, '40 YEARS EACH', 540, 200, 54, { col: '#f4f4fa', t1: 50.4 }) };
}]);
// 8 · NOBODY ASKED — the street at night; the red lamp goes out
OLD.push([50.55, 59.4, () => { const F = [[-40, 1300, 300, 460], [260, 1300, 300, 520], [560, 1300, 280, 440], [840, 1300, 300, 500]];
  const sky = darkSky('#06060e', '#1e1a2a', [{ x: 800, y: 360, r: 500, col: 'rgba(220,220,236,.35)' }]);
  const st = Ly(c => F.forEach(([x, b, w, h]) => facade(c, x, b, w, h, { door: x === 260 })), '#0e0a0e', .5, { rimA: .3, rim: '#c8c0d0' });
  st.back = (c, t) => F.forEach(([x, b, w, h]) => facadeBack(c, x, b, w, h, '#ffc070', .45, t, { door: x === 260, doorCol: '#ff4a3a' }));
  const fg = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { const off = 1 - ss(seg(t, 56.4, 57.4)); redLamp(c, 410, 1080, 1.1, t, Math.max(.05, off)); sunDisc(c, 800, 360, 50, '#eef0f6', .8); } });
  return { layers: [sky, st, fg, frontBand('#06040a', 17)], cam: t => ({ x: 0, y: 0, z: lerp(1.08, 1.0, ss(seg(t, 50.55, 59.4))) }),
    over: (c, t) => { strip(c, t, 51.0, .8, 'EVERYONE KNEW', 540, 200, 50, { col: '#f4f0f0', t1: 55.6 }); strip(c, t, 53.6, .9, 'NOBODY ASKED WHERE THE GIRLS WENT', 540, 300, 34, { col: '#f4f0f0', t1: 57.6 }); strip(c, t, 57.8, .9, 'PLOT TWIST WITH A&R', 540, 250, 46, { col: '#ffe2c8', font: 'Cormorant Garamond' }); } };
}]);
