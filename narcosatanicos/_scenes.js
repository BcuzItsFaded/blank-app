// ======================================================= SCENES =======================================================
// 1 · MATAMOROS, 1989 — the border bridge and a neon bar sign; one of the students is gone
addScene(0, 10.82, () => {
  const sky = darkSky('#0a0618', '#3a2050', [{ x: 540, y: 1100, r: 700, col: 'rgba(255,120,200,.25)' }]);
  const far = Ly(c => { skylineFar(c, 980, 91, 60, 200, false); bridge(c, 1000); }, '#120c1e', .25, { rimA: .3, rim: '#e0c8f0' });
  const st = Ly(c => { facade(c, -40, 1320, 520, 520); c.fillRect(-OFF, 1320, W + 2 * OFF, 700); }, '#0e0a14', .5, { rimA: .3, rim: '#e0c8f0' });
  st.back = (c, t) => facadeBack(c, -40, 1320, 520, 520, '#ff7ac8', .35, t);
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { c.save(); c.font = '600 92px "IM Fell English SC"'; c.textAlign = 'center'; const on = (Math.sin(t * 9) > -.7) ? 1 : .3; c.shadowColor = '#ff4ab0'; c.shadowBlur = 30 * on; c.fillStyle = rgba('#ff7ad0', .95 * on); c.fillText('BAR', 230, 900); c.restore();
    for (let i = 0; i < 4; i++) { const gone = i === 2 ? 1 - ss(seg(t, 7.6, 9.2)) : 1; if (gone <= 0) continue; c.save(); c.globalAlpha = gone; villager(c, 560 + i * 120, 1460, 1.0, 0, i, 0, i % 2); c.restore(); } } });
  return { layers: [sky, far, st, fg, frontBand('#06040a', 3)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 0, 10.82))) }),
    over: (c, t) => { strip(c, t, .1, .8, 'PLOT TWIST WITH A&R  ·  EPISODE 27', 540, 150, 30, { col: '#f0e2ff', font: 'Cormorant Garamond', t1: 7.2 }); strip(c, t, .4, 1.0, 'THE NARCOSATANISTS', 540, 290, 64, { col: '#fff4ff', t1: 7.2 }); strip(c, t, 1.4, .9, 'MATAMOROS, MEXICO · 1989', 540, 400, 38, { col: '#f0e2ff', t1: 7.2 }); strip(c, t, 2.4, .9, 'A DOCUMENTED TRUE STORY', 540, 490, 30, { col: '#f0e2ff', t1: 7.2 }); strip(c, t, 7.6, .8, 'MARK KILROY · 21', 540, 290, 50, { col: '#fff4ff', t1: 10.6 }); } };
});
// 2 · MISSING — the poster on the wall; flashlights in the dark
addScene(10.82, 15.77, () => {
  const sky = darkSky('#06060c', '#16161e');
  const wall = Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#1a1814', .3, { front: (c, t) => { poster(c, 540, 820, 560, 760, -.03, 1, [{ t: 'MISSING', s: 96, w: 600 }, { rule: 6 }, { t: 'MARK KILROY', s: 54, w: 600 }, { t: 'AGE 21', s: 36 }, { t: '', s: 160 }, { t: 'LAST SEEN · MATAMOROS', s: 30 }, { t: 'MARCH 1989', s: 30 }]);
    c.save(); c.fillStyle = '#2a2420'; c.fillRect(360, 700, 360, 220); c.fillStyle = '#d8ccb4'; c.beginPath(); c.ellipse(540, 780, 50, 60, 0, 0, TAU); c.fill(); c.fillRect(470, 830, 140, 90); c.restore();
    for (const [ph, sp] of [[0, .8], [2, 1.1]]) { const bx = 540 + Math.sin(t * sp + ph) * 420, by = 900 + Math.cos(t * sp * .7 + ph) * 300; c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(bx, by, 10, bx, by, 220); g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(bx - 220, by - 220, 440, 440); c.restore(); } } });
  return { layers: [sky, wall, frontBand('#06060a', 5)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 10.82, 15.77))) }), over: (c, t) => strip(c, t, 12.6, .8, 'FOR WEEKS, NOTHING', 540, 1350, 46, { col: '#f4f4fa', t1: 15.6 }) };
});
// 3 · THE CHECKPOINT — April 1, 1989: a pickup runs the roadblock
addScene(15.77, 26.1, () => {
  const sky = darkSky('#05060e', '#1c2030');
  const road = Ly(c => { c.fillRect(-OFF, 1240, W + 2 * OFF, 800); c.fillRect(380, 1100, 18, 150); c.fillRect(680, 1100, 18, 150); }, '#0c0e16', .5, { rimA: .3, rim: '#c8d0e0', front: (c, t) => { const hit = t > 19.2; c.save(); c.translate(540, 1150); c.rotate(hit ? -.5 * ss(seg(t, 19.2, 19.6)) : 0); c.fillStyle = '#e8e0d0'; c.fillRect(-170, -12, 340, 24); c.fillStyle = '#c83030'; for (let i = 0; i < 4; i++) c.fillRect(-150 + i * 90, -12, 40, 24); c.restore();
    for (const x of [300, 780]) villager(c, x, 1440, 1.1, t, x, 0, 1);
    const u = clamp((t - 17.6) / 2.6); truck(c, lerp(1500, -500, u), 1330, 1.15, 1); policeLights(c, t, ss(seg(t, 19.0, 19.8))); } });
  return { layers: [sky, road, frontBand('#04050a', 7)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 15.77, 26.1))) }),
    over: (c, t) => { strip(c, t, 16.2, .8, 'APRIL 1, 1989', 540, 220, 52, { col: '#f4f6fa', t1: 21.0 }); strip(c, t, 21.4, .9, '"INVISIBLE"?', 540, 220, 52, { col: '#f4f6fa', t1: 25.9 }); } };
});
// 4 · RANCHO SANTA ELENA — the police follow him down a dirt road to the ranch
addScene(26.1, 30.53, () => {
  const sky = darkSky('#0a0a14', '#3a2a30', [{ x: 540, y: 1100, r: 600, col: 'rgba(255,170,120,.25)' }]);
  const ranch = Ly(c => { c.fillRect(560, 960, 360, 200); poly0(c, [[540, 964], [740, 880], [940, 964]]); c.fillRect(-OFF, 1120, W + 2 * OFF, 900); for (let x = -40; x < 520; x += 80) c.fillRect(x, 1060, 10, 70); c.fillRect(-OFF, 1080, 540, 8); }, '#120c0e', .4, { rimA: .3, rim: '#ffc8a0' });
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { truck(c, lerp(-200, 460, ss(seg(t, 26.2, 29.4))), 1300, .8, 1); policeLights(c, t, .6); } });
  return { layers: [sky, ranch, fg, frontBand('#06040a', 9)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 26.1, 30.53))) }), over: (c, t) => strip(c, t, 26.5, .8, 'RANCHO SANTA ELENA', 540, 220, 50, { col: '#fff0e4', t1: 30.4 }) };
});
// 5 · THE CAULDRON — candles, the iron pot; fifteen small markers outside
addScene(30.53, 35.46, () => {
  const sky = darkSky('#060408', '#1a0e10');
  const shed = Ly(c => { c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF); hole(c, c2 => c2.fillRect(160, 600, 760, 680)); }, '#100a0a', .35, { rimA: .25, rim: '#ffb080' });
  shed.back = (c, t) => { c.fillStyle = rgba('#3a1a10', .9); c.fillRect(160, 600, 760, 680); };
  const fg = Ly(c => { }, '#000', .9, { raw: true, front: (c, t) => { cauldron(c, 540, 1250, 1.3, t); candleRow(c, t, 7, 1270, 220, 860, 30.6, .08, .9); smallFlags(c, t, 15, 1380, 1480, 21, .9, 32.6, .1); } });
  return { layers: [sky, shed, fg, frontBand('#050304', 11)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 30.53, 35.46))) }), over: (c, t) => strip(c, t, 32.4, .8, '15 BODIES', 540, 220, 56, { col: '#fff0e4', t1: 35.3 }) };
});
// 6 · EL PADRINO — Constanzo among candles; followers kneel
addScene(35.46, 44.6, () => {
  const sky = darkSky('#060408', '#1e1014', [{ x: 540, y: 900, r: 600, col: 'rgba(255,120,60,.3)' }]);
  const room = Ly(c => c.fillRect(-OFF, -OFF, W + 2 * OFF, H + 2 * OFF), '#140a0a', .3, { glow: { x: 540, y: 900, r: 700, col: '#ff8a40', a: .25 } });
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { candleRow(c, t, 9, 1180, 140, 940, 35.5, .05, 1.0); c.save(); c.translate(540, 1150); c.scale(2.0, 2.0); villager(c, 0, 0, 1, 0, 0, 0, 0); c.restore();
    for (const [x, f] of [[160, 1], [330, 1], [750, -1], [920, -1]]) { c.save(); c.fillStyle = '#06040a'; c.translate(x, 1470); c.scale(f, 1); c.beginPath(); c.ellipse(0, -150, 26, 30, 0, 0, TAU); c.fill(); blob(c, [[-30, -124], [34, -124], [60, -30], [40, 0], [-50, 0], [-40, -60]]); c.restore(); } } });
  return { layers: [sky, room, fg, frontBand('#050304', 13)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 35.46, 44.6))) }),
    over: (c, t) => { strip(c, t, 35.9, .8, 'ADOLFO DE JESÚS CONSTANZO', 540, 210, 40, { col: '#fff0e4', t1: 44.4 }); strip(c, t, 37.0, .8, '"EL PADRINO"', 540, 320, 50, { col: '#ffc8a0', t1: 40.0 }); strip(c, t, 40.2, .8, '"PROTECTION FROM BULLETS"', 540, 320, 40, { col: '#ffc8a0', t1: 44.4 }); } };
});
// 7 · MAY 6, 1989 — police surround an apartment block in Mexico City; one window flashes
addScene(44.6, 52.14, () => {
  const sky = darkSky('#06060e', '#1e1e2e');
  const blocks = Ly(c => { aptBlock(c, 160, 1360, 760, 1000); c.fillRect(-OFF, 1360, W + 2 * OFF, 700); }, '#0e0e16', .45, { rimA: .3, rim: '#c8c8e0' });
  blocks.back = (c, t) => { aptBack(c, 160, 1360, 760, 1000, t, 31); const f = Math.max(0, 1 - Math.abs(t - 49.6) / .1); if (f > 0) { c.fillStyle = rgba('#fff6e0', f); c.fillRect(496, 1360 - 1000 + 24 + 4 * 70, 34, 40); } };
  const fg = Ly(c => { }, '#000', .95, { raw: true, front: (c, t) => { for (const [x, k] of [[120, 1.1], [300, 1.0], [800, 1.0], [980, 1.1]]) villager(c, x, 1470, k, 0, x, 0, 1); policeLights(c, t, .7); } });
  return { layers: [sky, blocks, fg, frontBand('#04040a', 15)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ss(seg(t, 44.6, 52.14))) }),
    over: (c, t) => { strip(c, t, 45.0, .8, 'MEXICO CITY', 540, 210, 50, { col: '#f4f6fa', t1: 52.0 }); strip(c, t, 46.4, .8, 'MAY 6, 1989', 540, 320, 50, { col: '#f4f6fa', t1: 52.0 }); } };
});
// 8 · NO TRIAL. NO ANSWERS. — the bridge at dawn; the poster still on the wall
addScene(52.14, 61.2, () => {
  const sky = darkSky('#3a3a58', '#e8b8a0', [{ x: 540, y: 1000, r: 700, col: 'rgba(255,220,190,.5)' }]);
  const far = Ly(c => { bridge(c, 1050); }, '#1a1a2a', .3, { rimA: .4, rim: '#fff0e0', front: c => sunDisc(c, 540, 1010, 80, '#fff0dc', .9) });
  const wall = Ly(c => { c.fillRect(-OFF, 1150, W + 2 * OFF, 800); }, '#1a1818', .55, { rimA: .3, rim: '#fff0e0', front: (c, t) => { poster(c, 760, 1320, 260, 340, .06, 1, [{ t: 'MISSING', s: 46, w: 600 }, { rule: 4 }, { t: 'MARK KILROY', s: 26, w: 600 }]); candleRow(c, t, 3, 1470, 200, 360, 52.4, .4, 1.0); } });
  return { layers: [sky, far, wall, frontBand('#0a0808', 17)], cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.06, ss(seg(t, 52.14, 61.2))) }),
    over: (c, t) => { strip(c, t, 52.5, .8, 'NO TRIAL · NO ANSWERS', 540, 210, 46, { col: '#1a1208', bg: '#f4ead4', t1: 56.0 }); strip(c, t, 56.2, .9, 'EXPOSED BY A FAMILY THAT KEPT LOOKING', 540, 210, 30, { col: '#1a1208', bg: '#f4ead4', t1: 59.0 }); strip(c, t, 59.1, .9, 'PLOT TWIST WITH A&R', 540, 290, 46, { col: '#1a1208', bg: '#f4ead4', font: 'Cormorant Garamond' }); } };
});
