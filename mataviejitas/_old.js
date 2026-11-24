const OLD = [];
// ======================================================= SCENES =======================================================
// 1 · MEXICO CITY — apartment blocks at night; an old woman at her window
OLD.push([0, 8.58, () => { const A = [[-60, 1320, 300, 760], [260, 1320, 260, 900], [540, 1320, 300, 700], [860, 1320, 280, 820]];
  const sky = darkSky('#0a0c1a', '#3a3450', [{ x: 540, y: 1100, r: 700, col: 'rgba(255,190,140,.3)' }]);
  const far = Ly(c => skylineFar(c, 1000, 71, 120, 320, false), '#161a2a', .2);
  const blocks = Ly(c => A.forEach(([x, b, w, h]) => aptBlock(c, x, b, w, h)), '#0e1018', .5, { rimA: .3, rim: '#c8c8e0' });
  blocks.back = (c, t) => A.forEach(([x, b, w, h], i) => aptBack(c, x, b, w, h, t, i + 3));
  const fg = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { c.save(); c.fillStyle = '#ffd890'; c.fillRect(366, 900, 66, 90); c.fillStyle = '#0a0a10'; c.beginPath(); c.ellipse(398, 930, 13, 15, 0, 0, TAU); c.fill(); c.fillRect(380, 944, 36, 46); c.restore(); } });
  return { layers: [sky, far, blocks, fg, frontBand('#06060c', 3)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 0, 8.58))) }),
    over: (c, t) => { strip(c, t, .1, .8, 'PLOT TWIST WITH A&R  ·  EPISODE 26', 540, 150, 30, { col: '#ffe2ec', font: 'Cormorant Garamond', t1: 8.4 }); strip(c, t, .4, 1.0, 'LA MATAVIEJITAS', 540, 290, 70, { col: '#fff0f4', t1: 8.4 }); strip(c, t, 1.4, .9, 'MEXICO CITY · 1998–2006', 540, 400, 38, { col: '#ffe2ec', t1: 8.4 }); strip(c, t, 2.4, .9, 'A DOCUMENTED TRUE STORY', 540, 490, 30, { col: '#ffe2ec', t1: 8.4 }); } };
}]);
// 2 · SHE OPENED THE DOOR — light spills into a dark hall
OLD.push([8.58, 11.19, () => {
  const sky = darkSky('#06060c', '#14141e');
  const wall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(360, 520, 360, 860)); }, '#12121a', .35, { rimA: .3, rim: '#e0d8c8' });
  wall.back = (c, t) => { const o = ss(seg(t, 8.8, 10.0)); c.fillStyle = rgba('#ffe6c0', .9 * o); c.fillRect(360, 520, 360 * o, 860); if (o > .3) { c.save(); c.globalAlpha = ss((o - .3) / .7); woman(c, 560, 1380, 1.75, { col: '#0a0a10' }); c.restore(); } };
  const door = Ly(c => { }, '#000', .7, { raw: true, front: (c, t) => { const o = ss(seg(t, 8.8, 10.0)); c.fillStyle = '#2a2420'; c.fillRect(360, 520, 360 * (1 - o) + 10, 860); c.fillStyle = '#c8a060'; c.beginPath(); c.arc(360 + 360 * (1 - o) - 30, 960, 10, 0, TAU); c.fill(); } });
  return { layers: [sky, wall, door, frontBand('#040408', 5)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 8.58, 11.19))) }), over: (c, t) => strip(c, t, 9.0, .7, 'THEY OPENED THE DOOR', 540, 230, 46, { col: '#fff4ec', t1: 11.0 }) };
}]);
// 3 · THE MANHUNT — police board: a sketch of a man, question marks, red string
OLD.push([11.19, 20.75, () => {
  const sky = darkSky('#0c0c12', '#2a2a36');
  const board = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); }, '#3a2c20', .3, { rimA: .2, rim: '#e8d8c0', front: (c, t) => {
    newspaper(c, 300, 560, 380, 300, -.06, 1, [{ t: '¿QUIÉN ES', s: 44, w: 600 }, { t: 'LA MATAVIEJITAS?', s: 40, w: 600 }, { rule: 4 }]); newspaper(c, 790, 640, 360, 280, .05, 1, [{ t: 'OTRA VÍCTIMA', s: 44, w: 600 }, { rule: 4 }]);
    c.save(); c.translate(540, 1080); c.rotate(.02); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 20; c.fillStyle = PAPERC; c.fillRect(-170, -230, 340, 460); c.shadowBlur = 0; c.fillStyle = '#2a2420'; c.font = '28px "IM Fell English SC"'; c.textAlign = 'center'; c.fillText('SE BUSCA', 0, -190); c.restore();
    c.save(); c.translate(540, 1240); villager(c, 0, 0, .95, 0, 0, 0, 0); c.restore(); c.save(); c.fillStyle = '#c8282a'; c.font = '600 90px "IM Fell English SC"'; c.textAlign = 'center'; c.fillText('?', 540, 1000); c.restore();
    c.save(); c.strokeStyle = '#c8282a'; c.lineWidth = 3; c.beginPath(); c.moveTo(300, 560); c.lineTo(540, 900); c.lineTo(790, 640); c.stroke(); for (const [x, y] of [[300, 560], [790, 640], [540, 900]]) { c.fillStyle = '#c8282a'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); } c.restore(); policeLights(c, t, .35); } });
  return { layers: [sky, board, frontBand('#080606', 7)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.1, ss(seg(t, 11.19, 20.75))) }),
    over: (c, t) => { strip(c, t, 11.6, .8, '"THE LITTLE OLD LADY KILLER"', 540, 210, 40, { col: '#fff0f0', t1: 15.6 }); strip(c, t, 15.8, .8, 'POLICE HUNTED A MAN', 540, 210, 46, { col: '#fff0f0', t1: 20.6 }); } };
}]);
// 4 · THEY WERE WRONG — the sketch of a man becomes the silhouette of a woman
OLD.push([20.75, 22.08, () => {
  const sky = darkSky('#0c0c12', '#2a2a36');
  const board = Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#3a2c20', .3, { front: (c, t) => { const m = t > 21.1 ? 1 : 0; c.save(); c.translate(540, 1080); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 20; c.fillStyle = PAPERC; c.fillRect(-170, -230, 340, 460); c.restore(); c.save(); c.translate(540, 1240); if (!m) villager(c, 0, 0, .95, 0, 0, 0, 0); else woman(c, 0, 0, .95, { col: '#0a0a10' }); c.restore();
    if (m) { c.save(); c.strokeStyle = '#c8282a'; c.lineWidth = 12; c.beginPath(); c.moveTo(380, 860); c.lineTo(700, 1300); c.stroke(); c.restore(); } } });
  return { layers: [sky, board, frontBand('#080606', 9)], cam: t => ({ x: 0, y: 0, z: 1.12 }), over: (c, t) => strip(c, t, 21.1, .4, 'THEY WERE WRONG', 540, 230, 54, { col: '#fff0f0', t1: 22.0 }) };
}]);
// 5 · JANUARY 25, 2006 — police lights; a woman caught fleeing a doorway
OLD.push([22.08, 29.42, () => {
  const sky = darkSky('#06060e', '#1a1a28');
  const st = Ly(c => { aptBlock(c, -40, 1300, 600, 900); aptBlock(c, 600, 1300, 520, 820); c.fillRect(-OFF, 1300, W + 2 * OFF, 700); hole(c, c2 => c2.fillRect(220, 1140, 110, 160)); }, '#0e0e16', .5, { rimA: .3, rim: '#c8c8e0' });
  st.back = (c, t) => { aptBack(c, -40, 1300, 600, 900, t, 11); aptBack(c, 600, 1300, 520, 820, t, 12); c.fillStyle = '#ffe0b0'; c.fillRect(220, 1140, 110, 160); };
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { const u = ss(seg(t, 22.3, 25.4)); woman(c, lerp(280, 620, u), 1460, 1.3, { col: '#06060a', lean: -.12 }); if (t > 25.0) { const v = ss(seg(t, 25.0, 26.4)); villager(c, lerp(1160, 760, v), 1460, 1.35, 0, 0, 0, 1); villager(c, lerp(1240, 880, v), 1460, 1.3, 0, 1, 0, 1); } policeLights(c, t, ss(seg(t, 24.6, 25.4))); } });
  return { layers: [sky, st, fg, frontBand('#04040a', 11)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 22.08, 29.42))) }),
    over: (c, t) => { strip(c, t, 22.5, .8, 'JANUARY 25, 2006', 540, 210, 52, { col: '#f4f6fa', t1: 29.3 }); strip(c, t, 26.6, .8, 'CAUGHT', 540, 320, 50, { col: '#f4f6fa', t1: 29.3 }); } };
}]);
// 6 · LA DAMA DEL SILENCIO — the ring, the spotlights, the pink butterfly mask
OLD.push([29.42, 38.13, () => {
  const sky = darkSky('#06040a', '#1a1020');
  const ring = Ly(c => { c.fillRect(120, 1180, 840, 300); for (const x of [140, 940]) c.fillRect(x - 10, 900, 20, 300); }, '#100a14', .5, { rimA: .35, rim: '#f0c8e0', front: (c, t) => { c.save(); c.strokeStyle = '#d83a8a'; c.lineWidth = 6; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(140, 960 + i * 70); c.lineTo(940, 960 + i * 70); c.stroke(); } c.restore(); spotlight(c, 540, -50, 1200, 600, .4); } });
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { dancer(c, 540, 1180, 1.6, t * .6, { col: '#0c0610', shoes: false, tired: .3, sp: .5 }); pinkMask(c, 540, 1180 - 236 * 1.6, .42, 1);
    for (let i = 0; i < 12; i++) { const x = 30 + i * 92; c.fillStyle = '#05030a'; c.beginPath(); c.ellipse(x, 1450 + (i % 2) * 20, 30, 36, 0, 0, TAU); c.fill(); c.fillRect(x - 40, 1480 + (i % 2) * 20, 80, 100); if (i % 3 === 0) { c.lineWidth = 10; c.strokeStyle = '#05030a'; c.beginPath(); c.moveTo(x + 20, 1480); c.lineTo(x + 40 + Math.sin(t * 6 + i) * 10, 1380); c.stroke(); } } } });
  return { layers: [sky, ring, fg, frontBand('#030206', 13)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 29.42, 38.13))) }),
    over: (c, t) => { strip(c, t, 29.8, .8, 'JUANA BARRAZA', 540, 200, 52, { col: '#ffe8f2', t1: 38.0 }); strip(c, t, 31.6, .8, '"LA DAMA DEL SILENCIO"', 540, 310, 40, { col: '#ffb8d8', t1: 38.0 }); } };
}]);
// 7 · 759 YEARS — the clipboard at the door; the sentence
OLD.push([38.13, 48.74, () => {
  const sky = darkSky('#0a0a10', '#262630');
  const wall = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(560, 560, 320, 820)); }, '#14141c', .35, { rimA: .3, rim: '#e0d8c8' });
  wall.back = c => { c.fillStyle = '#d8c8a8'; c.fillRect(560, 560, 320, 820); };
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { woman(c, 420, 1380, 1.35, { col: '#08080c' }); c.fillStyle = '#e8e0d0'; c.save(); c.translate(500, 1380 - 150 * 1.35); c.rotate(-.2); c.fillRect(-30, -44, 60, 84); c.fillStyle = '#08080c'; c.fillRect(-14, -50, 28, 10); c.restore(); woman(c, 740, 1380, 1.2, { col: '#08080c', flip: -1 }); } });
  return { layers: [sky, wall, fg, frontBand('#040408', 15)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 38.13, 48.74))) }),
    over: (c, t) => { strip(c, t, 38.6, .8, 'POSING AS A SOCIAL WORKER?', 540, 210, 40, { col: '#f4f4fa', t1: 42.6 }); strip(c, t, 43.0, .8, '16 MURDERS', 540, 210, 52, { col: '#f4f4fa', t1: 48.6 }); strip(c, t, 44.6, .8, '759 YEARS', 540, 320, 60, { col: '#ffffff', t1: 48.6 }); } };
}]);
// 8 · THE ONE NOBODY SUSPECTED — the pink mask under a lamp
OLD.push([48.74, 59.4, () => {
  const sky = darkSky('#06040a', '#1a1420');
  const table = Ly(c => { c.fillRect(-OFF, 1200, W + 2 * OFF, 800); }, '#1a1014', .5, { rimA: .3, rim: '#f0c8e0', front: (c, t) => { spotlight(c, 540, 200, 1300, 700, .35); c.save(); c.translate(540, 1150); c.rotate(-.12); pinkMask(c, 0, 0, 1.6, 1); c.restore(); } });
  return { layers: [sky, table, frontBand('#030206', 17)], cam: t => ({ x: 0, y: 0, z: lerp(1.04, 1.12, ss(seg(t, 48.74, 59.4))) }),
    over: (c, t) => { strip(c, t, 49.2, .8, 'AS MANY AS 40 DEATHS', 540, 210, 46, { col: '#ffe8f2', t1: 54.6 }); strip(c, t, 54.8, .9, 'THE ONE NOBODY SUSPECTED', 540, 210, 42, { col: '#ffe8f2', t1: 57.6 }); strip(c, t, 57.8, .9, 'PLOT TWIST WITH A&R', 540, 260, 46, { col: '#ffd0e6', font: 'Cormorant Garamond' }); } };
}]);
