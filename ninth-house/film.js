// The Ninth House: a watercolor journal film. Everything is a pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
window.DUR = 73.5;

// ---------- narration table (id, start, duration, text); mix.py reads the rows in exactly this form ----------
const VO = [
  ['v01', 1.8, 4.467, 'Marta Voss painted Mill Lane every morning for 11 years.'],
  ['v02', 6.9, 4.309, 'Eight houses. One lamp. A pear tree that never bore a pear.'],
  ['v03', 11.8, 3.722, 'She painted only what she could see. That was the rule.'],
  ['v04', 16.5, 8.214, 'On a Wednesday, she found a ninth house in her journal. A red door, at the end of the lane. Her own brushwork. Not her memory.'],
  ['v05', 26.0, 4.531, 'She walked outside. Eight houses. She laughed, and felt foolish.'],
  ['v06', 32.6, 4.675, 'On Thursday there were nine. The neighbours said it had always been there.'],
  ['v07', 38.0, 9.005, 'Each morning, the page held something she had not painted. A light in the window. A table. A woman, bent over a sheet of paper.'],
  ['v08', 49.5, 2.324, 'On Monday, the woman looked up.'],
  ['v09', 53.2, 5.347, 'Marta crossed the lane. Behind her, her own house began to fade to paper.'],
  ['v10', 61.2, 4.625, 'In 11 years, she never once asked who was painting Marta Voss.'],
];

// ---------- palette ----------
const ACC = '#cf4f2c';
const WALLS = ['#dcc9a6', '#cdb9a2', '#d3d9cb', '#dbbba6', '#d6cfa8', '#c9cbbd', '#e0c8a8', '#cfc0b0'];
const ROOFS = ['#7d8d99', '#9c6a52', '#6f7f78', '#8a7384', '#7d8d99', '#a8785a', '#6f7f78', '#8a7384'];
const DOORS = ['#4e6a7a', '#6a5a3c', '#3f5f4f', '#5a4a6a', '#4e6a7a', '#6a5a3c', '#3f5f4f', '#5a4a6a'];

// ---------- world ----------
const GY = 700;                                   // ground line
const HX = [380, 690, 990, 1290, 1590, 1890, 2190, 2490];
const H9X = 2810, H9S = 1.25, LAMPX = 1440, TREEX = 840;
const WINX = H9X + 45 * H9S, WINY = GY - 95 * H9S;  // window centre of No. 9
const PAINT0 = [2.4, 3.35, 4.3, 5.25, 6.2, 7.15, 8.1, 9.05];

let PAPER_IMG, houses = [], H9, tree, lamp, strips = {}, martaBody, nbBody = [], easel;

// ---------- washes ----------
function washPoly(c, pts, fill, a, passes = 3, jit = 5) {
  for (let p = 0; p < passes; p++) {
    c.beginPath(); pts.forEach(([x, y], i) => { const yy = y + (i % 3 === 0 ? rnd(-jit, jit) : 0); i ? c.lineTo(x, yy) : c.moveTo(x, yy); });
    c.closePath(); c.globalAlpha = a / passes * 1.6; c.fillStyle = fill; c.fill();
  }
  c.globalAlpha = 1;
}
function ridge(x0, x1, base, amp, f, seed, step = 40) {
  const pts = []; for (let x = x0; x <= x1; x += step) pts.push([x, base - amp * fbm(x * f + seed)]); return pts;
}
function strip(w, h, ox, oy, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.translate(-ox, -oy); fn(g); return { cv: c, ox, oy };
}
function sprite2(L, rs = 2) {
  const [x0, y0, x1, y1] = bbox(L, 8), cv2 = document.createElement('canvas');
  cv2.width = Math.max(1, (x1 - x0) * rs); cv2.height = Math.max(1, (y1 - y0) * rs);
  const c = cv2.getContext('2d'); c.scale(rs, rs); c.translate(-x0, -y0); for (const s of L) drawS(c, s, 1);
  return { cv: cv2, x0, y0, x1, y1, rs };
}
function drawSprite(sp, am = 1) { ctx.globalAlpha = am; ctx.drawImage(sp.cv, sp.x0, sp.y0, (sp.x1 - sp.x0), (sp.y1 - sp.y0)); ctx.globalAlpha = 1; }

// ---------- generators (local coordinates, root at 0,0, y up is negative) ----------
function houseGen(i, sc = 1, o = {}) {
  return withSeed(100 + i * 17, () => {
    const S = [], wall = o.wall || WALLS[i], roof = o.roof || ROOFS[i], door = o.door || DOORS[i];
    const hw = 100 * sc, hh = 150 * sc, flip = i % 2 ? -1 : 1;
    // wall: overlapping vertical washes
    for (let k = 0; k < 6; k++) {
      const x = -hw + 14 * sc + k * (hw * 2 - 28 * sc) / 5 + rnd(-3, 3);
      S.push(mk(qcurve(x, 0, x + rnd(-3, 3), -hh, rnd(-3, 3), 6), 44 * sc, wall, { prof: 'even', nb: 4, a: .85, rough: .18 }));
    }
    S.push(edgeOf(S[5], 1, 2.4 * sc, INK2, .35)); S.push(edgeOf(S[0], -1, 2 * sc, INK2, .25));
    // roof: rows narrowing to the ridge
    for (let k = 0; k < 5; k++) {
      const y = -hh - 4 * sc - k * 17 * sc, inset = k * 17 * sc;
      S.push(mk(qcurve(-hw - 14 * sc + inset, y, hw + 14 * sc - inset, y + rnd(-1, 1), rnd(-2, 2), 8), 26 * sc, roof, { prof: 'even', nb: 3, a: .88, rough: .15 }));
    }
    S.push(mk(qcurve(-hw - 16 * sc, -hh + 6 * sc, hw + 16 * sc, -hh + 6 * sc, 0, 8), 4 * sc, INK2, { prof: 'even', nb: 0, a: .55 }));
    // chimney
    if (o.chimney ?? (i % 3 !== 1)) {
      const cx = flip * 52 * sc;
      S.push(mk(qcurve(cx, -hh - 52 * sc, cx, -hh - 94 * sc, 0, 4), 22 * sc, '#a5604a', { prof: 'even', nb: 2, a: .88 }));
      S.push(mk(qcurve(cx - 14 * sc, -hh - 95 * sc, cx + 14 * sc, -hh - 95 * sc, 0, 3), 5 * sc, INK2, { prof: 'even', nb: 0, a: .7 }));
    }
    // door + windows
    const dx = -flip * 46 * sc;
    S.push(mk(qcurve(dx, 0, dx, -78 * sc, 0, 5), 34 * sc, o.doorCol || door, { prof: 'even', nb: 2, a: .92 }));
    S.push(mk(qcurve(dx + 10 * sc, -38 * sc, dx + 12 * sc, -36 * sc, 0, 2), 4 * sc, '#e8d9a6', { prof: 'leaf', nb: 0, a: .9 }));
    S.push(mk(qcurve(dx - 21 * sc, 0, dx - 21 * sc, -80 * sc, 0, 5), 2.4 * sc, INK2, { prof: 'even', nb: 0, a: .6 }));
    const wx = flip * 44 * sc, wy = -92 * sc;
    S.push(mk(qcurve(wx, wy + 24 * sc, wx, wy - 24 * sc, 0, 4), 38 * sc, '#b9c6cc', { prof: 'even', nb: 2, a: .8 }));
    for (const [x0, y0, x1, y1] of [[-21, -26, 21, -26], [-21, 26, 21, 26], [-21, -26, -21, 26], [21, -26, 21, 26], [0, -26, 0, 26], [-21, 0, 21, 0]]) {
      S.push(mk(qcurve(wx + x0 * sc, wy + y0 * sc, wx + x1 * sc, wy + y1 * sc, 0, 4), 2.2 * sc, INK2, { prof: 'even', nb: 0, a: .75 }));
    }
    // ground shadow
    S.push(mk(qcurve(-hw - 10 * sc, 4 * sc, hw + 24 * sc, 4 * sc, 0, 8), 10 * sc, '#6d7f62', { prof: 'even', nb: 3, a: .5 }));
    return { S };
  });
}
// No. 9: same grammar, a touch taller, a red door, window left bare (content is drawn on top)
function house9Gen() {
  return withSeed(909, () => {
    const g = houseGen(0, H9S, { wall: '#c3ccd1', roof: '#5f6f7d', doorCol: ACC, chimney: true });
    return g;
  });
}
function pearTree() {
  return withSeed(33, () => {
    const S = [];
    S.push(mk(qcurve(0, 0, -8, -150, 10, 10), 20, INK2, { prof: 'trunk', nb: 3, a: .9 }));
    S.push(edgeOf(S[0], 1, 3, INK, .5));
    const br = [[-8, -120, -150, -230], [-6, -140, 20, -250], [-8, -100, 120, -200], [-10, -135, -60, -280], [-5, -155, 70, -300]];
    for (const [x0, y0, x1, y1] of br) S.push(mk(qcurve(x0, y0, x1, y1, rnd(-14, 14), 8), 8, INK2, { prof: 'tip', nb: 0 }));
    for (const [cx, cy] of [[-150, -240], [20, -270], [120, -210], [-60, -290], [70, -310], [-40, -220], [-110, -190]]) {
      clump(S, cx, cy, 52, 18, ['#8ea860', '#7f9a55', '#a2b46c', '#6e8c4e'], { l0: 14, l1: 28, w0: 7, w1: 12, sx: 1.2, sy: .85 });
    }
    return { S };
  });
}
function lampGen() {
  return withSeed(44, () => {
    const S = [];
    S.push(mk(qcurve(0, 0, 0, -190, 0, 6), 7, INK2, { prof: 'tip', nb: 0, a: .9 }));
    S.push(mk(qcurve(-12, -204, 12, -204, 0, 3), 5, INK2, { prof: 'even', nb: 0, a: .9 }));
    S.push(mk(qcurve(0, -196, 0, -222, 0, 3), 22, '#e9d69a', { prof: 'even', nb: 2, a: .85 }));
    S.push(mk(qcurve(-13, -226, 13, -226, 0, 3), 5, INK2, { prof: 'even', nb: 0, a: .9 }));
    return { S };
  });
}
// people: body built once, legs and arms per frame
function personBody(coat, hair, sc, o = {}) {
  return withSeed(o.seed || 5, () => {
    const S = [];
    S.push(mk(qcurve(0, -46 * sc, 0, -100 * sc, 0, 5), 28 * sc, coat, { prof: 'brush', nb: 3, a: .92 }));
    S.push(mk(qcurve(0, -110 * sc, 0, -118 * sc, 0, 3), 17 * sc, '#e6c9a8', { prof: 'leaf', nb: 0, a: .95 }));
    S.push(mk(qcurve(-8 * sc, -122 * sc, 8 * sc, -124 * sc, -3 * sc, 4), 13 * sc, hair, { prof: 'leaf', nb: 0, a: .95 }));
    if (o.hat) S.push(mk(qcurve(-14 * sc, -128 * sc, 14 * sc, -128 * sc, 0, 4), 6 * sc, o.hat, { prof: 'even', nb: 0, a: .95 }));
    return S;
  });
}
function drawPerson(body, x, y, sc, phase, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.k) ctx.scale(o.k, o.k);
  if (o.flip) ctx.scale(-1, 1);
  const w = o.walk ? Math.sin(phase) : 0;
  withSeed(61, () => {
    for (const s of [-1, 1]) drawS(ctx, mk(qcurve(0, -48 * sc, s * (3 + w * s * 9) * sc, 0, 0, 5), 9 * sc, INK2, { prof: 'tip', nb: 0, a: .85 }), 1);
    const arm = o.armUp ?? 0;
    drawS(ctx, mk(qcurve(5 * sc, -92 * sc, (10 + arm * 22) * sc, (-66 - arm * 70) * sc, 0, 5), 8 * sc, o.coat || INK2, { prof: 'tip', nb: 0, a: .9 }), 1);
    drawS(ctx, mk(qcurve(-5 * sc, -92 * sc, (-10 - w * 7) * sc, -64 * sc, 0, 5), 8 * sc, o.coat || INK2, { prof: 'tip', nb: 0, a: .9 }), 1);
  });
  const p = o.p ?? 1;
  if (p >= 1) for (const s of body) drawS(ctx, s, 1); else drawList(ctx, body, p);
  ctx.restore();
}

// ---------- the woman in the window (window-local coords, window = 52 x 56) ----------
let WOMAN;
function buildWoman() {
  withSeed(77, () => {
    const IND = '#3b4f78', HAIR = '#4a3a33';
    const body = [mk(qcurve(0, 30, 0, -2, 0, 5), 24, IND, { prof: 'brush', nb: 3, a: .92 })];
    const down = [
      mk(qcurve(0, -4, 0, -10, 0, 3), 15, '#e6c9a8', { prof: 'leaf', nb: 0, a: .95 }),
      mk(qcurve(-9, -9, 9, -9, -3, 4), 16, HAIR, { prof: 'leaf', nb: 0, a: .95 }),
      mk(qcurve(-4, -3, 4, -3, 1, 3), 3, '#b0867a', { prof: 'even', nb: 0, a: .6 }),
    ];
    const up = [
      mk(qcurve(0, -8, 0, -17, 0, 3), 16, '#e6c9a8', { prof: 'leaf', nb: 0, a: .95 }),
      mk(qcurve(-8, -22, 8, -23, -2, 4), 12, HAIR, { prof: 'leaf', nb: 0, a: .95 }),
      mk(qcurve(-3.4, -14.4, -2.4, -14.4, 0, 2), 1.7, INK, { prof: 'even', nb: 0, a: .9 }),
      mk(qcurve(2.4, -14.4, 3.4, -14.4, 0, 2), 1.7, INK, { prof: 'even', nb: 0, a: .9 }),
      mk(qcurve(-2, -10.4, 2, -10.4, 1, 3), 1.4, '#9b5a4a', { prof: 'even', nb: 0, a: .8 }),
    ];
    const bun = [mk(qcurve(-1, -23.6, 1, -24.4, 0, 3), 7, HAIR, { prof: 'leaf', nb: 0, a: .95 })];
    WOMAN = { body, down, up, bun };
  });
}
function drawWindowContent(light, table, woman, look, t) {
  // local frame: window centre at (0,0), scale H9S
  if (light > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(-26, -28, 52, 56); ctx.clip();
    ctx.globalAlpha = .9 * light; ctx.fillStyle = '#f0cf7a'; ctx.fillRect(-26, -28, 52, 56);
    ctx.globalAlpha = .35 * light; ctx.fillStyle = '#f6e2a0'; ctx.fillRect(-26, -28, 52, 20);
    ctx.globalAlpha = 1;
    if (table > 0) {
      withSeed(78, () => {
        drawS(ctx, mk(qcurve(-30, 18, 30, 18, 0, 5), 10, '#7a5a3c', { prof: 'even', nb: 3, a: .92 }), table);
        drawS(ctx, mk(qcurve(-14, 13.5, 16, 12.5, 0, 5), 6, '#f0e7d2', { prof: 'even', nb: 0, a: .95 }), seg(table, .5, 1));
      });
    }
    if (woman > 0) {
      ctx.save(); ctx.translate(0, 4); ctx.rotate(-look * .12);
      drawList(ctx, WOMAN.body, woman);
      if (woman > .6) {
        const wf = seg(woman, .6, 1);
        ctx.save(); ctx.translate(0, -look * 2.5);
        for (const s of WOMAN.down) drawS(ctx, s, wf, null, 1 - look);
        for (const s of WOMAN.up) drawS(ctx, s, wf, null, look);
        for (const s of WOMAN.bun) drawS(ctx, s, wf, null, look);
        ctx.restore();
        // painting arm + brush
        withSeed(79, () => {
          const bob = (1 - look) * Math.sin(t * 5.2) * .9;
          drawS(ctx, mk(qcurve(8, 6, 13 + look * 1, 16 - look * 12 + bob, 1, 5), 5.5, '#4d5f7a', { prof: 'tip', nb: 0, a: .92 }), wf);
          drawS(ctx, mk(qcurve(13 + look * 1, 16 - look * 12 + bob, 16 + look * 2, 20 - look * 20 + bob, 0, 3), 1.6, INK2, { prof: 'even', nb: 0, a: .9 }), wf);
        });
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // frame + mullion on top
  withSeed(80, () => {
    for (const [x0, y0, x1, y1, w] of [[-26, -28, 26, -28, 3], [-26, 28, 26, 28, 3], [-26, -28, -26, 28, 3], [26, -28, 26, 28, 3]]) drawS(ctx, mk(qcurve(x0, y0, x1, y1, 0, 5), w, INK2, { prof: 'even', nb: 0, a: .8 }), 1);
    drawS(ctx, mk(qcurve(0, -28, 0, 28, 0, 5), 1.6, INK2, { prof: 'even', nb: 0, a: .55 }), 1);
  });
}

// ---------- state as functions of t ----------
function h9State(t) {
  if (t < 24.8) return seg(t, 17.2, 20.6);
  if (t < 32.0) return 0;
  return seg(t, 33.6, 34.9);
}
const lightP = t => t < 24.8 ? 0 : t < 32.0 ? 0 : seg(t, 38.6, 40.4);
const tableP = t => seg(t, 41.4, 43.2);
const womanP = t => seg(t, 44.4, 46.6);
const lookP = t => ss(seg(t, 49.9, 51.2));
const nbP = t => seg(t, 36.0, 37.3);

// Marta's position
function martaX(t) {
  if (t < 25.5) return 520;
  if (t < 30.4) return lerp(1560, 2680, eio(seg(t, 25.8, 30.0)));
  if (t < 53.8) return 2200;
  if (t < 58.3) return lerp(2200, 2700, eio(seg(t, 53.8, 58.3)));
  return 2700;
}
const martaWalking = t => (t > 25.8 && t < 30.2) || (t > 53.9 && t < 58.2);
const martaP = t => t > 63.4 ? 1 - seg(t, 63.4, 65.9) : 1;

// ---------- camera ----------
const cK = monotone;
const CAM = {
  s1: [cK([[0, 960], [2.2, 960], [9, 1720], [16, 1850]]), null, null],
};
function camera(t) {
  let cx, cy = 540, z = 1;
  const trk = (keys) => cK(keys.map(k => [k[0], k[1]]));
  if (t < 16) { cx = cK([[0, 960], [2.2, 960], [9, 1720], [16, 1850]])(t); cy = 600; z = 1.15; }
  else if (t < 24.8) {
    const k = [[16, 1850, 600, 1.15], [17.8, 1690, 570, .74], [19.2, 1690, 570, .74], [23.6, 2790, 612, 1.9], [24.8, 2800, 612, 1.9]];
    cx = cK(k.map(a => [a[0], a[1]]))(t); cy = cK(k.map(a => [a[0], a[2]]))(t); z = cK(k.map(a => [a[0], a[3]]))(t);
  } else if (t < 31.6) { cx = lerp(1900, 2300, ss(seg(t, 24.8, 31.6))); cy = 600; z = lerp(1.15, 1.2, seg(t, 24.8, 31.6)); }
  else if (t < 37.2) { cx = lerp(2250, 2110, ss(seg(t, 31.6, 37.2))); cy = lerp(600, 565, ss(seg(t, 31.6, 37.2))); z = lerp(1.2, .84, ss(seg(t, 31.6, 37.2))); }
  else if (t < 52) {
    const k = [[37.2, 2110, 565, .84], [39.0, 2790, 600, 1.6], [44.5, 2866, 592, 6.4], [48, 2866, 590, 7.4], [52, 2866, 590, 7.4]];
    cx = cK(k.map(a => [a[0], a[1]]))(t); cy = cK(k.map(a => [a[0], a[2]]))(t); z = cK(k.map(a => [a[0], a[3]]))(t);
  } else if (t < 58.6) {
    const k = [[52, 2866, 590, 7.4], [54.4, 2480, 600, 1.35], [58.6, 2640, 610, 1.55]];
    cx = cK(k.map(a => [a[0], a[1]]))(t); cy = cK(k.map(a => [a[0], a[2]]))(t); z = cK(k.map(a => [a[0], a[3]]))(t);
  } else {
    const k = [[58.6, 2640, 610, 1.55], [61.2, 2770, 625, 2.05], [67, 2800, 625, 2.0]];
    cx = cK(k.map(a => [a[0], a[1]]))(t); cy = cK(k.map(a => [a[0], a[2]]))(t); z = cK(k.map(a => [a[0], a[3]]))(t);
  }
  return { cx, cy, z };
}
function setLayer(cam, par = 1) { ctx.setTransform(cam.z, 0, 0, cam.z, 960 - cam.cx * par * cam.z, 540 - cam.cy * cam.z); }
function w2s(cam, x, y) { return [(x - cam.cx) * cam.z + 960, (y - cam.cy) * cam.z + 540]; }

// ---------- drawing the world ----------
function drawStrip(st, cam, par, clipX) {
  setLayer(cam, par); ctx.drawImage(st.cv, st.ox, st.oy);
}
function drawWorld(t, cam) {
  const rev = eio(seg(t, .9, 4.2));
  ctx.save();
  if (t < 4.4) { // brush-edge wipe revealing the sky, hills and ground
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); const xr = -200 + rev * 2500; ctx.moveTo(0, 0);
    for (let y = 0; y <= H; y += 10) ctx.lineTo(xr + (vnoise(y * .006) - .5) * 220 + Math.sin(y * .02) * 14 - y * .12, y);
    ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
  }
  drawStrip(strips.sky, cam, .15); drawStrip(strips.far, cam, .35); drawStrip(strips.mid, cam, .7);
  drawStrip(strips.ground, cam, 1);
  ctx.restore();
  setLayer(cam, 1);
  // pear tree (behind the houses)
  { const p = seg(t, 10.0, 12.6); ctx.save(); ctx.translate(TREEX, GY - 14); const sk = p >= 1 ? .006 * (Math.sin(1.15 * t) + .4 * Math.sin(2.7 * t + 2)) : 0; ctx.transform(1, 0, sk, 1, 0, 0);
    if (p >= 1) drawSprite(tree.spr); else if (p > 0) drawList(ctx, tree.S, p); ctx.restore(); }
  // houses
  for (let i = 0; i < 8; i++) {
    const p = seg(t, PAINT0[i], PAINT0[i] + 1.5);
    if (p <= 0) continue;
    ctx.save(); ctx.translate(HX[i], GY); if (p >= 1) drawSprite(houses[i].spr); else drawList(ctx, houses[i].S, p); ctx.restore();
  }
  // lamp
  { const p = seg(t, 9.4, 10.2); if (p > 0) { ctx.save(); ctx.translate(LAMPX, GY + 6); if (p >= 1) drawSprite(lamp.spr); else drawList(ctx, lamp.S, p); ctx.restore();
    if (p >= 1) { const g = ctx.createRadialGradient(LAMPX, GY - 220, 4, LAMPX, GY - 220, 70); g.addColorStop(0, 'rgba(240,210,120,.28)'); g.addColorStop(1, 'rgba(240,210,120,0)'); ctx.fillStyle = g; ctx.fillRect(LAMPX - 80, GY - 300, 160, 160); } } }
  // Marta painting in the first act (easel in front of the lane)
  if (t < 16.2) {
    const p = seg(t, 2.0, 2.9), fade = 1 - seg(t, 15.4, 16.1), mx = 560, my = GY + 120, k = 1.35;
    if (p > 0) {
      ctx.save(); ctx.globalAlpha = fade;
      ctx.save(); ctx.translate(mx, my); ctx.scale(k, k);
      withSeed(90, () => { for (const [x0, y0, x1, y1] of [[40, 4, 64, -92], [92, 4, 72, -92], [66, 4, 66, -70]]) drawS(ctx, mk(qcurve(x0, y0, x1, y1, 0, 4), 3.2, INK2, { prof: 'even', nb: 0, a: .8 }), p);
        drawS(ctx, mk(qcurve(42, -70, 92, -68, 0, 4), 38, '#efe6d2', { prof: 'even', nb: 0, a: .95 }), p);
        if (t > 3.4) { const q = seg(t, 3.4, 12); drawS(ctx, mk(qcurve(46, -70, 88, -69, 0, 4), 6, '#8fa6b8', { prof: 'even', nb: 0, a: .7 }), eo(q)); drawS(ctx, mk(qcurve(48, -60, 84, -60, 0, 4), 7, '#b6bf8c', { prof: 'even', nb: 0, a: .7 }), eo(seg(t, 5, 14))); } });
      ctx.restore();
      drawPerson(martaBody, mx, my, k, 0, { p, armUp: .55 + .12 * Math.sin(t * 4), coat: '#b8895a', flip: false });
      ctx.restore();
    }
  }
  // No. 9
  const h9 = h9State(t);
  if (h9 > 0) {
    ctx.save(); ctx.translate(H9X, GY);
    if (h9 < 1) drawList(ctx, H9.S, h9); else for (const s of H9.S) drawS(ctx, s, 1);
    // the red door is the accent: a vermilion stroke over the door area
    ctx.restore();
    if (h9 >= .55) {
      const wp = seg(h9, .5, 1);
      ctx.save(); ctx.translate(WINX, WINY); ctx.scale(H9S, H9S);
      drawWindowContent(lightP(t) * wp, tableP(t), womanP(t), lookP(t), t);
      ctx.restore();
      const lp = lightP(t);
      if (lp > 0) { const g = ctx.createRadialGradient(WINX, WINY, 10, WINX, WINY, 150); g.addColorStop(0, `rgba(244,208,110,${.30 * lp})`); g.addColorStop(1, 'rgba(244,208,110,0)'); ctx.fillStyle = g; ctx.fillRect(WINX - 160, WINY - 160, 320, 320); }
    }
  }
  // neighbours
  { const p = nbP(t); if (p > 0 && t < 66) {
    const xs = [2330, 2430, 2530], cols = [['#7d8d99', '#d9d0c2'], ['#a05a4a', '#4a3a33'], ['#6f7f78', '#8a8a8a']];
    for (let k = 0; k < 3; k++) drawPerson(nbBody[k], xs[k], GY + 70 + k * 6, 1, 0, { k: 1.4, p: seg(p, k * .15, .55 + k * .15), flip: false, coat: cols[k][0] });
  } }
  // Marta in the lane (after the journal scene)
  if (t >= 25.5 && t < 66) {
    const mx = martaX(t), mp = martaP(t);
    const knock = t > 58.4 && t < 61 ? Math.abs(Math.sin((t - 58.6) * 5)) * 0.9 + .1 : 0;
    const knock2 = t > 58.55 ? (t < 59.9 ? (Math.sin((t - 58.6) * 2 * Math.PI * 1.6) > .3 ? 1 : .2) : .4) : 0;
    ctx.save(); ctx.globalAlpha = mp;
    if (mp > 0) drawPerson(martaBody, mx, GY + 90, 1, mx * .06, { k: 1.4, walk: martaWalking(t), p: mp, armUp: t > 58.4 ? knock2 : 0, coat: '#b8895a', flip: false });
    ctx.restore();
  }
}

// ---------- overlays ----------
function wavyCover(y, t, seed) { // path along y with wavy edge
  ctx.moveTo(-10, y);
  for (let x = -10; x <= W + 40; x += 40) ctx.lineTo(x, y + (vnoise(x * .006 + seed) - .5) * 150 + Math.sin(x * .01 + t) * 12);
}
// two-edge mist: top edge climbs to cover, bottom edge climbs to uncover
function mist(t, a0, a1, a2, a3, seed) {
  if (t < a0 || t > a3) return;
  const top = 1250 - eio(seg(t, a0, a1)) * 1500, bot = 1250 - eio(seg(t, a2, a3)) * 1500;
  for (const [lift, al] of [[110, .55], [0, 1]]) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath();
    const T = top - lift, B = bot - lift;
    // region between top edge (above) and bottom edge (below): y in [T, B] ; when B < H the lower part is already uncovered
    ctx.moveTo(-10, T);
    for (let x = -10; x <= W + 40; x += 40) ctx.lineTo(x, T + (vnoise(x * .006 + seed) - .5) * 150 + Math.sin(x * .01 + t) * 12);
    ctx.lineTo(W + 40, B + 0);
    for (let x = W + 40; x >= -10; x -= 40) ctx.lineTo(x, B + (vnoise(x * .006 + seed + 9) - .5) * 150 + Math.sin(x * .01 + t * .8) * 12);
    ctx.closePath(); ctx.clip(); ctx.globalAlpha = al; ctx.drawImage(PAPER_IMG, 0, 0); ctx.restore();
  }
}
function erase(t, cam) {
  if (t < 54.6) return;
  const ex = lerp(1500, 2650, eio(seg(t, 54.9, 58.2)));
  const sx = (ex - cam.cx) * cam.z + 960;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.moveTo(-10, -10);
  for (let y = -10; y <= H + 20; y += 24) ctx.lineTo(sx + (vnoise(y * .012 + 3) - .5) * 120, y);
  ctx.lineTo(-10, H + 20); ctx.closePath(); ctx.clip(); ctx.drawImage(PAPER_IMG, 0, 0); ctx.restore();
}

// ---------- annotations ----------
function hand(txt, x, y, p, o = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = `${o.w || 500} ${o.size || 34}px ${o.font || 'Caveat'}`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(txt).width, x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  ctx.beginPath(); ctx.rect(x0 - 6, y - 44, (w + 12) * eo(p), 88); ctx.clip();
  ctx.shadowColor = rgba(PAPER, .95); ctx.shadowBlur = 12; ctx.fillStyle = rgba(o.col || INK, o.a ?? .9); ctx.fillText(txt, x, y); ctx.fillText(txt, x, y);
  ctx.restore();
}
function leader(x0, y0, x1, y1, p, bend = 20, col = INK, a = .75) {
  if (p <= 0) return;
  const pts = qcurve(x0, y0, x1, y1, bend, 16), m = Math.max(1, Math.round(16 * clamp(p)));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); for (let i = 0; i <= m; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke();
  if (p >= 1) { ctx.beginPath(); ctx.arc(x1, y1, 3, 0, 7); ctx.fillStyle = rgba(col, a); ctx.fill(); }
  ctx.restore();
}
function fadeIO(t, a, b, fi = .4, fo = .5) { return Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b)); }
const DATES = [[0.3, 'Tuesday'], [16.2, 'Wednesday'], [32.8, 'Thursday'], [38.3, 'Friday'], [41.3, 'Saturday'], [44.3, 'Sunday'], [49.6, 'Monday']];
const dateAt = t => { let d = null, t0 = 0; for (const [a, s] of DATES) if (t >= a) { d = s; t0 = a; } return [d, t0]; };

function drawHUD(t, cam) {
  // date + entry
  if (t < 67) {
    const [d, t0] = dateAt(t);
    if (d && !(t > 53.5 && t < 67.2)) {
      const p = seg(t, t0, t0 + .9);
      hand(d, 90, 96, p, { size: 50, w: 600 });
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = '400 17px "IBM Plex Mono"'; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(INK2, .65 * seg(t, t0 + .5, t0 + 1.2));
      ctx.fillText(t < 16.2 ? 'MILL LANE · ENTRY 4,017' : 'MILL LANE · ENTRY ' + (4017 + Math.round((t0 - 0.3) > 0 ? ({ 16.2: 1, 32.8: 2, 38.3: 3, 41.3: 4, 44.3: 5, 49.6: 6 }[t0] || 0) : 0)).toLocaleString('en-US'), 92, 140); ctx.restore();
    }
  }
  // rule
  hand('the rule: only what I can see', 1840, 860, fadeIO(t, 12.2, 15.8, .9, .6) > 0 ? seg(t, 12.2, 13.4) * (1 - seg(t, 15.2, 15.9)) : 0, { align: 'right', size: 40 });
  // No. 9 ?
  if (t > 18 && t < 24) { const [ax, ay] = w2s(cam, H9X - 57, GY - 90); const p = seg(t, 20.8, 21.8) * (1 - seg(t, 23.6, 24.0));
    hand('No. 9 ?', ax - 330, ay - 200, p, { size: 52, col: ACC, w: 600, a: .95 }); leader(ax - 190, ay - 190, ax - 30, ay - 10, seg(t, 21.2, 22.0) * (1 - seg(t, 23.6, 24.0)), 24, ACC, .85); }
  // eight
  if (t > 27 && t < 31) { hand('eight. only eight.', 1840, 150, seg(t, 28.6, 29.6) * (1 - seg(t, 30.0, 30.5)), { align: 'right', size: 40 }); }
  // always been there
  if (t > 35 && t < 38.2) { const [sx, sy] = w2s(cam, H9X, GY - 300); const p = seg(t, 35.6, 36.8) * (1 - seg(t, 37.4, 38.0));
    hand('"always been there," they said', sx - 560, sy - 40, p, { size: 38 }); leader(sx - 140, sy - 40, sx - 40, sy + 40, p, 14); }
  // window notes
  if (t > 38 && t < 49.4) {
    const items = [[39.4, 42.6, 'a light in the window'], [42.2, 45.4, 'a table'], [45.4, 49.0, 'a woman, painting']];
    items.forEach(([a, b, s], i) => { hand(s, 160, 260 + i * 62, seg(t, a, a + 1) * (1 - seg(t, b + (i === 2 ? 3 : 8), b + (i === 2 ? 3.5 : 8.5))) * 1, { size: 38, col: INK2 }); });
  }
}
function drawSubs(t) {
  for (const [id, t0, d, txt] of VO) {
    const a = t0 - .15, b = t0 + Math.max(d + .6, 1.8) + .1;
    if (t < a || t > b) continue;
    const al = Math.min(seg(t, a, a + .25), 1 - seg(t, b - .35, b));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = 'italic 500 36px "Cormorant Garamond"'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // balanced wrap at 1400 px
    const words = txt.split(' '); let lines = [], cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > 1400 && cur) { lines.push(cur); cur = w; } else cur = test; }
    lines.push(cur);
    if (lines.length === 2) { const m = Math.ceil(words.length / 2); const l1 = words.slice(0, m).join(' '), l2 = words.slice(m).join(' '); if (ctx.measureText(l1).width < 1400 && ctx.measureText(l2).width < 1400) lines = [l1, l2]; }
    const y0 = lines.length === 1 ? 1000 : 962;
    lines.forEach((ln, i) => { ctx.shadowColor = rgba(PAPER, .95); ctx.shadowBlur = 16; ctx.fillStyle = rgba(INK, .78 * al); ctx.fillText(ln, 960, y0 + i * 40); ctx.fillText(ln, 960, y0 + i * 40); });
    ctx.restore();
  }
}

// ---------- the new sheet ----------
let NEWG;
function drawEnding(t) {
  if (t < 67.0) return;
  const hw = seg(t, 67.4, 68.7), g = NEWG;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  hand('Entry 1.', 220, 160, hw, { size: 64, font: 'Reenie Beanie', w: 400, col: INK, a: .92 });
  ctx.font = '400 17px "IBM Plex Mono"'; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(INK2, .6 * seg(t, 68.2, 69)); ctx.fillText('MILL LANE', 224, 205); ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawS(ctx, g.ground, ss(seg(t, 68.6, 70.6)));
  drawS(ctx, g.door, .62 * ss(seg(t, 70.4, 71.1)));   // the brush lifts before the stroke is finished
}

// ---------- build ----------
function build() {
  RNG = mulberry(20260924);
  // strips (world coords; sky 0.15, far 0.35, mid 0.7, ground 1.0 parallax)
  strips.sky = withSeed(1, () => strip(4600, 1500, -800, -700, g => {
    washPoly(g, [[-800, -700], [3800, -700], [3800, 330], ...ridge(3800, -800, 340, 30, .002, 3, -120).map(p => p)], '#efd9b8', .34, 3, 6);
    washPoly(g, [[-800, -700], [3800, -700], [3800, 40], ...ridge(3800, -800, 60, 40, .002, 9, -120)], '#d9d5c8', .26, 3, 6);
  }));
  strips.far = withSeed(2, () => strip(4600, 900, -800, 100, g => {
    washPoly(g, [[-800, 1000], ...ridge(-800, 3800, 560, 190, .0018, 5), [3800, 1000]], '#9fb4c4', .55, 3, 5);
    washPoly(g, [[-800, 1000], ...ridge(-800, 3800, 600, 130, .0026, 21), [3800, 1000]], '#8fa6a8', .45, 3, 5);
    washPoly(g, [[-800, 1000], ...ridge(-800, 3800, 640, 80, .004, 41), [3800, 1000]], '#a9b9a3', .5, 3, 4);
  }));
  strips.mid = withSeed(3, () => strip(4600, 900, -800, 300, g => {
    washPoly(g, [[-800, 1200], ...ridge(-800, 3800, 650, 70, .003, 7), [3800, 1200]], '#b6bf8c', .6, 3, 4);
    washPoly(g, [[-800, 1200], ...ridge(-800, 3800, 690, 36, .005, 31), [3800, 1200]], '#9eae7a', .5, 3, 4);
    // a scatter of far tufts and hedges
    for (let i = 0; i < 40; i++) { const x = rnd(-700, 3700), y = 668 + rnd(-6, 20); const S = []; clump(S, x, y, 20, 8, ['#7f9a62', '#8ea66f', '#6e8c58'], { l0: 8, l1: 16, w0: 5, w1: 8, sx: 1.6, sy: .5 }); for (const s of S) drawS(g, s, 1); }
  }));
  strips.ground = withSeed(4, () => strip(4600, 1400, -800, 560, g => {
    washPoly(g, [[-800, GY - 4], ...ridge(-800, 3800, GY - 4, 6, .01, 2).map(p => p), [3800, 1900], [-800, 1900]], '#c8c08a', .55, 3, 3);
    washPoly(g, [[-800, GY + 16], [3800, GY + 12], [3800, 1900], [-800, 1900]], '#b9b27c', .5, 3, 3);
    // the lane: a pale track with wheel ruts, running off to the right
    washPoly(g, [[-800, GY + 40], [3800, GY + 34], [3800, GY + 120], [-800, GY + 132]], '#e0cfa6', .62, 3, 5);
    for (let k = 0; k < 2; k++) drawS(g, mk(qcurve(-780, GY + 70 + k * 30, 3780, GY + 66 + k * 30, 4, 60), 6, '#9a8660', { prof: 'even', nb: 3, a: .5, rough: .4 }), 1);
    washPoly(g, [[-800, GY + 160], [3800, GY + 150], [3800, 1900], [-800, 1900]], '#a9b383', .45, 3, 6);
    for (let i = 0; i < 90; i++) { const x = rnd(-780, 3780), y = GY + 160 + rnd(0, 380); const S = []; clump(S, x, y, 24, 7, ['#7f9a62', '#8ea66f', '#6e8c58', '#a2b46c'], { l0: 10, l1: 22, w0: 4, w1: 8, sx: 1.4, sy: .5, dir: -Math.PI / 2, spread: .7 }); for (const s of S) drawS(g, s, .9); }
  }));
  for (let i = 0; i < 8; i++) { const h = houseGen(i, 1); h.spr = sprite2(h.S, 2); houses.push(h); }
  H9 = house9Gen();
  tree = pearTree(); tree.spr = sprite2(tree.S, 2);
  lamp = lampGen(); lamp.spr = sprite2(lamp.S, 2);
  martaBody = personBody('#b8895a', '#8a8580', 1, { seed: 5 });
  nbBody = [personBody('#7d8d99', '#d9d0c2', 1, { seed: 6 }), personBody('#a05a4a', '#4a3a33', 1.03, { seed: 7, hat: '#6a5a3c' }), personBody('#6f7f78', '#5a4a3a', .95, { seed: 8 })];
  buildWoman();
  NEWG = withSeed(555, () => ({
    ground: mk(qcurve(180, 700, 1740, 690, 8, 40), 7, INK2, { prof: 'even', nb: 5, a: .85, rough: .3 }),
    door: mk(qcurve(1130, 696, 1130, 560, 0, 8), 30, ACC, { prof: 'even', nb: 3, a: .95, rough: .2 }),
  }));
}

// ---------- frame ----------
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(PAPER_IMG, 0, 0);
  const cam = camera(t);
  if (t < 67.1) {
    drawWorld(t, cam);
    erase(t, cam);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .55; ctx.drawImage(PAPER_IMG, 0, 0); ctx.restore();
    mist(t, 23.7, 24.9, 25.1, 26.3, 1.7);
    mist(t, 30.5, 31.6, 31.8, 33.0, 4.1);
    mist(t, 65.4, 66.8, 66.8, 66.81, 7.3);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t < 66.8) drawHUD(t, cam);
  }
  drawEnding(t);
  drawSubs(t);
}
window.render = render;

window.TEXTS = t => {
  const out = [];
  const [d, t0] = dateAt(t);
  if (d && t < 66.8 && !(t > 53.5)) out.push({ id: 'date' + t0, text: d, x0: 90, y0: 60, x1: 400, y1: 130, pass: false });
  if (t >= 68.5 && t <= 72) out.push({ id: 'entry1', text: 'Entry 1.', x0: 220, y0: 120, x1: 480, y1: 200 });
  return out;
};

(async () => {
  PAPER_IMG = new Image(); PAPER_IMG.src = 'paper.jpg'; await PAPER_IMG.decode();
  for (const f of ['italic 500 36px "Cormorant Garamond"', '500 40px Caveat', '600 40px Caveat', '400 17px "IBM Plex Mono"', '400 60px "Reenie Beanie"']) await document.fonts.load(f);
  build();
  window.READY = true;
})();
