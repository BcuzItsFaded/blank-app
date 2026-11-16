// Ash vs Gary: a chalkboard recap, 1080x1920. Everything is a pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920;
window.DUR = 60.6;

// ---------- small utilities ----------
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const vnoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };

// ---------- narration table ----------
const VO = [
  ['v01', .35, 4.773, 'Years of rivalry led to this moment! Ash versus Gary at the Johto League!'],
  ['v02', 7.35, 5.257, "Gary's Nidoqueen defeats Tauros, but Ash's Heracross strikes back against Magmar!"],
  ['v03', 14.35, 5.406, 'Then Blastoise enters! Its overwhelming power takes down both Heracross and Bayleef!'],
  ['v04', 21.35, 5.478, "Snorlax defeats Arcanine and Nidoqueen, but Gary's Scizor turns the battle around!"],
  ['v05', 29.35, 6.876, "Ash's final Pokémon is Charizard! It defeats Scizor and Golem, leaving Gary one last challenger!"],
  ['v06', 37.35, 5.397, 'Blastoise returns! Its powerful Hydro Pump gives Gary a massive type advantage!'],
  ['v07', 45.35, 5.981, 'Charizard scorches the battlefield! Blastoise cools the rocks, filling the arena with thick steam!'],
  ['v08', 53.35, 6.333, 'Out of the steam, Charizard unleashes Seismic Toss! Blastoise falls! Ash finally defeats Gary!'],
];

// ---------- chalks ----------
const WHITE = '#f1efe6', ORANGE = '#f08a3c', BLUE = '#a9d4ee';   // structure, the tracked chalk (Charizard), the second hand (Gary)
const BOARD_TOP = 640, BOARD_BOT = 1455;

// ---------- geometry helpers (all return [[x,y],...]) ----------
let R = mulberry(7);
const rr = (a, b) => a + (b - a) * R();
function cr(pts, n = 8) {                  // Catmull-Rom smoothing
  const out = [], P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < n; k++) {
    const t = k / n, t2 = t * t, t3 = t2 * t, a = P[i - 1], b = P[i], c = P[i + 1], d = P[i + 2];
    out.push([0.5 * ((2 * b[0]) + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3),
      0.5 * ((2 * b[1]) + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3)]);
  }
  out.push(pts[pts.length - 1]); return out;
}
const circ = (cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 28) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
const ell = (cx, cy, rx, ry, n = 28) => { const o = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
const ln = (x0, y0, x1, y1, bend = 0) => { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1; return cr([[x0, y0], [mx - dy / L * bend, my + dx / L * bend], [x1, y1]], 6); };
function arrowHead(x0, y0, x1, y1, s = 26) { const a = Math.atan2(y1 - y0, x1 - x0); return [[[x1 - Math.cos(a - .5) * s, y1 - Math.sin(a - .5) * s], [x1, y1], [x1 - Math.cos(a + .5) * s, y1 - Math.sin(a + .5) * s]]]; }

// ---------- chalk items ----------
const ITEMS = [];            // {grp, kind, t0, d, ...}
const EV = [];
let UID = 0;
function dense(pts, wob) {
  const out = [], seed = UID * 13.7;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L / 5));
    for (let k = 0; k < n; k++) { const t = k / n; out.push([lerp(x0, x1, t), lerp(y0, y1, t)]); }
  }
  out.push(pts[pts.length - 1]);
  return out.map((p, i) => [p[0] + (vnoise(seed + i * .31) - .5) * 2 * wob, p[1] + (vnoise(seed + 100 + i * .29) - .5) * 2 * wob]);
}
function P(grp, t0, d, pts, col = WHITE, w = 7, o = {}) {
  const id = ++UID, sm = o.raw ? pts : pts, dn = dense(sm, o.wob ?? 1.1);
  let len = 0; const L = [0]; for (let i = 1; i < dn.length; i++) { len += Math.hypot(dn[i][0] - dn[i - 1][0], dn[i][1] - dn[i - 1][1]); L.push(len); }
  ITEMS.push({ id, grp, kind: 'path', t0, d, pts: dn, L, len, col, w, a: o.a ?? .93 });
  EV.push({ t: t0, type: 'chalk', d, len, color: col === ORANGE ? 'accent' : col === BLUE ? 'pale' : 'white', big: w > 12 ? 1 : 0 });
  return id;
}
function T(grp, t0, d, str, x, y, size, col = WHITE, o = {}) {
  const id = ++UID;
  ITEMS.push({ id, grp, kind: 'text', t0, d, str, x, y, size, col, align: o.align || 'center', font: o.font || 'Gloria Hallelujah', a: o.a ?? .95 });
  EV.push({ t: t0, type: 'chalk', d, len: str.length * size * .45, color: col === ORANGE ? 'accent' : col === BLUE ? 'pale' : 'white', big: size > 120 ? 1 : 0 });
}
function X(grp, t0, cx, cy, s, col = WHITE, w = 11) {
  P(grp, t0, .16, ln(cx - s, cy - s, cx + s, cy + s, 3), col, w);
  P(grp, t0 + .17, .16, ln(cx + s, cy - s, cx - s, cy + s, -3), col, w);
  EV.push({ t: t0 + .1, type: 'ko' });
}
function arrow(grp, t0, d, x0, y0, x1, y1, col = WHITE, w = 7, bend = 0) {
  P(grp, t0, d, ln(x0, y0, x1, y1, bend), col, w);
  for (const h of arrowHead(x0, y0, x1, y1)) P(grp, t0 + d * .9, .12, h, col, w);
}
function under(grp, t0, d, cx, y, wd, col = WHITE, w = 7) { P(grp, t0, d, cr([[cx - wd / 2, y], [cx - wd / 6, y + 7], [cx + wd / 6, y - 4], [cx + wd / 2, y + 3]], 8), col, w); }

// ---------- creatures (local coords ~ -200..200) ----------
const xf = (pts, cx, cy, s, rot = 0, fx = 1) => { const c = Math.cos(rot), sn = Math.sin(rot); return pts.map(([x, y]) => { x *= fx * s; y *= s; return [cx + x * c - y * sn, cy + x * sn + y * c]; }); };
const CHAR = [  // Charizard
  ['head', [[-10, -150], [20, -175], [60, -165], [85, -140], [105, -120], [100, -100], [70, -95], [40, -92], [5, -100], [-12, -125], [-10, -150]]],
  ['horn', [[-5, -160], [-32, -190], [-26, -150]]], ['horn', [[18, -172], [6, -204], [34, -178]]],
  ['eye', circ(55, -135, 5, 0, 6.28, 10)], ['eye', [[42, -150], [68, -143]]], ['eye', [[96, -112], [99, -108]]],
  ['body', [[0, -95], [-35, -60], [-50, 0], [-45, 60], [-20, 100], [20, 105], [55, 70], [60, 10], [45, -50], [40, -92]]],
  ['belly', [[-25, -40], [15, -35], [35, -45]]], ['belly', [[-30, -5], [18, 0], [40, -8]]], ['belly', [[-30, 30], [15, 36], [40, 28]]], ['belly', [[-22, 65], [15, 70], [38, 62]]],
  ['wing', [[-40, -55], [-110, -130], [-180, -185], [-165, -130], [-190, -100], [-150, -75], [-165, -30], [-110, -40], [-45, -10]]],
  ['wing', [[-45, -50], [-170, -175]]], ['wing', [[-45, -40], [-185, -100]]], ['wing', [[-45, -25], [-160, -30]]],
  ['wing', [[50, -60], [125, -140], [190, -195], [175, -135], [200, -105], [160, -80], [175, -35], [120, -45], [55, -15]]],
  ['wing', [[55, -55], [180, -185]]], ['wing', [[55, -45], [195, -105]]], ['wing', [[55, -30], [170, -35]]],
  ['arm', [[-40, -30], [-70, 0], [-62, 28]]], ['arm', [[50, -30], [82, 0], [75, 28]]],
  ['leg', [[-30, 95], [-45, 130], [-60, 170], [-20, 172], [-10, 135]]], ['leg', [[25, 98], [40, 130], [55, 170], [95, 170], [60, 128]]],
  ['tail', [[30, 100], [90, 130], [150, 125], [185, 90], [180, 40]]],
  ['flame', [[180, 40], [165, 0], [185, -25], [190, 10], [205, -35], [215, 15], [195, 40]]], ['flame', [[190, 25], [190, 0], [200, -10]]],
];
const BLAS = [  // Blastoise
  ['head', ell(0, -125, 42, 36)], ['eye', circ(-16, -130, 5, 0, 6.28, 10)], ['eye', circ(16, -130, 5, 0, 6.28, 10)], ['eye', [[-14, -110], [0, -104], [14, -110]]],
  ['body', ell(0, 10, 92, 108)], ['belly', ell(0, 28, 56, 78)], ['belly', [[-50, 0], [0, 8], [50, 0]]], ['belly', [[-52, 38], [0, 46], [52, 38]]], ['belly', [[-34, 74], [0, 80], [34, 74]]],
  ['shell', [[-92, 0], [-124, -34], [-108, -84]]], ['shell', [[92, 0], [124, -34], [108, -84]]],
  ['cannon', [[55, -95], [130, -150], [150, -125], [75, -60], [55, -95]]], ['cannon', [[128, -156], [153, -118]]],
  ['cannon', [[-55, -95], [-130, -150], [-150, -125], [-75, -60], [-55, -95]]], ['cannon', [[-128, -156], [-153, -118]]],
  ['arm', [[-88, -20], [-114, 20], [-96, 52]]], ['arm', [[88, -20], [114, 20], [96, 52]]],
  ['leg', [[-55, 110], [-72, 160], [-24, 166], [-20, 115]]], ['leg', [[55, 110], [72, 160], [24, 166], [20, 115]]],
  ['tail', [[80, 95], [130, 112], [152, 84]]],
];
function creature(grp, t0, total, parts, cx, cy, s, col, rot = 0, fx = 1, w = 6.5) {
  const n = parts.length, per = total / n;
  parts.forEach(([nm, pts], i) => {
    const sm = pts.length > 8 ? pts : cr(pts, 6), q = xf(sm, cx, cy, s, rot, fx);
    P(grp, t0 + i * per * .9, per * 1.1, q, col, nm === 'belly' || nm === 'eye' ? w * .7 : w, { wob: 1.4 });
  });
}

// ---------- layout ----------
const ASH = ['Tauros', 'Heracross', 'Bayleef', 'Snorlax', 'Charizard', '???'];
const GARY = ['Nidoqueen', 'Magmar', 'Blastoise', 'Arcanine', 'Scizor', 'Golem'];
const CX = [[110, 270, 430], [650, 810, 970]], CY = [345, 535];
const chip = (side, i) => [CX[side][i % 3], CY[Math.floor(i / 3)]];
const NAME = (side, nm) => (side ? GARY : ASH).indexOf(nm);
const CUE = { tauros: 9.47, magmar: 12.47, heracross: 18.8, bayleef: 19.5, arcanine: 23.0, nido: 23.9, scizor: 25.4, snorlax: 26.1, charizard: 31.6, scizorX: 33.2, golemX: 33.6, hydro: 40.3, scorch: 46.3, cools: 48.6, steam: 51.05, toss: 55.9, falls: 57.3 };

function build() {
  R = mulberry(7);
  // ---- header (never wiped) ----
  T('hdr', .2, .9, 'PLOT TWIST WITH A&R  ·  EP 1', 540, 78, 34, BLUE, { font: 'Patrick Hand' });
  T('hdr', .8, 1.6, 'ASH vs GARY', 540, 205, 128, WHITE);
  T('hdr', 2.3, .9, 'JOHTO LEAGUE  ·  6 v 6', 540, 272, 44, WHITE, { font: 'Patrick Hand' });
  under('hdr', 2.9, .5, 540, 291, 560, WHITE, 5);
  // ---- roster ----
  let k = 0;
  for (let i = 0; i < 6; i++) for (const side of [0, 1]) {
    const [cx, cy] = chip(side, i), t0 = 3.2 + k * .27, col = side ? BLUE : WHITE; k++;
    P('ros', t0, .22, circ(cx, cy, 40, -1.4, 4.9, 20), col, 6);
    P('ros', t0 + .1, .12, ln(cx - 40, cy, cx + 40, cy, 0), col, 5);
    P('ros', t0 + .15, .1, circ(cx, cy, 11, 0, 6.28, 12), col, 5);
    T('ros', t0 + .12, .22, (side ? GARY : ASH)[i], cx, cy + 82, 30, col, { font: 'Patrick Hand' });
  }
  P('ros', 6.4, .5, circ(...chip(0, 4), 54, -1.4, 4.9, 28), ORANGE, 7);   // the tracked chalk
  // ---- S1 mid ----
  T('m1', 3.6, 1.2, 'VS', 540, 1040, 330, WHITE, { a: .9 });
  P('m1', 4.3, .5, cr([[560, 740], [500, 900], [570, 930], [490, 1120]], 6), WHITE, 9);
  T('m1', 4.1, 1.1, 'THE ULTIMATE RIVALRY', 540, 1290, 66, WHITE);
  under('m1', 5.3, .5, 540, 1318, 820, WHITE, 6);
  // ---- S2 mid ----
  const row = (g, tA, y, a, ac, d, dc, tX, xs, xsz = 120) => {
    T(g, tA, .55, a, 260, y, 70, ac); arrow(g, tA + .6, .45, 470, y - 22, 640, y - 22, ac, 7);
    T(g, tA + 1.1, .5, d, 830, y, 70, dc);
    if (xs) X(g, tX, 830, y - 22, xsz, dc, 12);
  };
  row('m2', 7.9, 860, 'Nidoqueen', BLUE, 'Tauros', WHITE, CUE.tauros, 1);
  row('m2', 10.55, 1130, 'Heracross', WHITE, 'Magmar', BLUE, CUE.magmar, 1);
  // ---- S3 mid ----
  T('m3', 14.95, .8, 'BLASTOISE', 540, 745, 100, BLUE);
  creature('m3', 15.1, 2.3, BLAS, 540, 1090, 1.3, BLUE, 0, 1, 7);
  for (let i = 0; i < 8; i++) { const a = -Math.PI * .96 + i * Math.PI * .131, r0 = 330, r1 = 390; P('m3', 17.5 + i * .04, .2, ln(540 + Math.cos(a) * r0, 1090 + Math.sin(a) * r0 * .85, 540 + Math.cos(a) * r1, 1090 + Math.sin(a) * r1 * .85), WHITE, 6); }
  T('m3', 18.95, .6, '2 KOs', 540, 1420, 84, WHITE);
  // ---- S4 mid ----
  row('m4', 21.95, 820, 'Snorlax', WHITE, 'Arcanine', BLUE, CUE.arcanine, 1, 70);
  row('m4', 22.5, 1000, 'Snorlax', WHITE, 'Nidoqueen', BLUE, CUE.nido, 1, 70);
  row('m4', 24.7, 1200, 'Scizor', BLUE, 'Snorlax', WHITE, CUE.snorlax, 1, 70);
  P('m4', 26.4, .9, cr([[820, 1290], [900, 1340], [780, 1400], [540, 1410], [330, 1390], [250, 1330]], 8), WHITE, 7);
  P('m4', 27.2, .15, arrowHead(330, 1390, 250, 1330)[0], WHITE, 7);
  // ---- S5 mid ----
  T('m5', 30.1, .9, 'CHARIZARD', 540, 745, 100, ORANGE);
  creature('m5', 31.0, 2.4, CHAR, 540, 1090, 1.3, ORANGE, 0, 1, 7);
  T('m5', 34.5, .9, '1 LEFT', 540, 1425, 84, BLUE);
  P('ros', 35.1, .5, circ(...chip(1, 2), 54, -1.4, 4.9, 28), BLUE, 7);
  // ---- S6 mid ----
  creature('m67', 37.9, 1.9, BLAS, 330, 1120, 1.0, BLUE, 0, 1, 6.5);
  creature('m67', 39.1, 1.2, CHAR, 800, 1170, .75, ORANGE, 0, -1, 6);
  for (let j = 0; j < 3; j++) {
    const y0 = 990 + j * 14, y1 = 1070 + j * 34, pts = [[480, y0], [540, y0 - 12], [600, y1 - 30], [660, y1 - 10], [715, y1]];
    P('m6j', CUE.hydro + j * .1, .5, cr(pts, 6), BLUE, 9 - j * 2);
  }
  for (let i = 0; i < 7; i++) P('m6j', CUE.hydro + .5 + i * .05, .15, ln(700 + rr(-10, 30), 1060 + rr(-30, 40), 745 + rr(0, 45), 1030 + rr(-50, 70)), BLUE, 5);
  T('m6j', 40.9, .6, 'WATER', 300, 760, 92, BLUE); P('m6j', 41.5, .3, [[470, 735], [560, 765], [470, 800]], WHITE, 8); T('m6j', 41.8, .6, 'FIRE', 770, 760, 92, ORANGE);
  // ---- S7 ----
  for (let i = 0; i < 7; i++) { const a = -Math.PI * 1.0 + i * .5; P('m67', CUE.scorch + i * .05, .3, cr([[800 + Math.cos(a) * 130, 1130 + Math.sin(a) * 150], [800 + Math.cos(a) * 175, 1130 + Math.sin(a) * 195], [800 + Math.cos(a + .25) * 215, 1130 + Math.sin(a + .25) * 235]], 6), ORANGE, 8); }
  const rocks = [[170, 1380], [330, 1395], [490, 1385], [650, 1395], [810, 1385], [940, 1390]];
  rocks.forEach(([x, y], i) => { const s = 60 + (i % 3) * 8; P('m67', 46.0 + i * .12, .4, cr([[x - s, y + 8], [x - s * .6, y - s * .5], [x, y - s * .65], [x + s * .6, y - s * .45], [x + s, y + 8]], 6), WHITE, 7); });
  rocks.forEach(([x, y], i) => { for (let h = 0; h < 4; h++) P('m67', 46.9 + i * .08 + h * .03, .18, ln(x - 40 + h * 22, y - 8, x - 22 + h * 22, y - 36), ORANGE, 5); });
  rocks.forEach(([x, y], i) => { for (let h = 0; h < 3; h++) P('m67', CUE.cools + i * .09 + h * .04, .3, ln(x - 28 + h * 28, y - 70 - h * 10, x - 28 + h * 28, y - 20), BLUE, 6); });
  for (let i = 0; i < 16; i++) {
    const x0 = 80 + i * 60 + rr(-20, 20), t0 = 49.3 + i * .16, y0 = 1330 - (i % 4) * 60, pts = [];
    for (let s = 0; s < 6; s++) pts.push([x0 + Math.sin(s * 1.3 + i) * 70, y0 - s * 85 - 20]);
    P('steam', t0, .55, cr(pts, 6), WHITE, 34, { a: .38, wob: 3 });
  }
  // ---- S8 ----
  creature('m8', 53.9, 1.3, CHAR, 330, 1130, .95, ORANGE, 0, 1, 7);
  T('m8', 54.9, .9, 'SEISMIC TOSS!', 540, 718, 96, ORANGE);
  creature('m8', 55.2, 1.0, BLAS, 690, 925, .78, BLUE, 2.8, 1, 6);
  const arc = [[470, 1010], [540, 880], [640, 800], [770, 790], [870, 850], [920, 970], [905, 1130]];
  P('m8', 55.5, .8, cr(arc, 8), ORANGE, 8); P('m8', 56.25, .15, arrowHead(920, 970, 905, 1130)[0], ORANGE, 8);
  for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; P('m8', CUE.falls - .15 + i * .03, .2, ln(905 + Math.cos(a) * 40, 1215 + Math.sin(a) * 30, 905 + Math.cos(a) * 95, 1215 + Math.sin(a) * 70), WHITE, 7); }
  T('m8', 58.1, 1.0, 'ASH WINS!', 540, 1405, 150, WHITE);
  under('m8', 59.0, .6, 540, 1432, 760, ORANGE, 9);
  // ---- roster knock-outs ----
  const KO = [[1, 'Nidoqueen', null], [0, 'Tauros', CUE.tauros], [1, 'Magmar', CUE.magmar], [0, 'Heracross', CUE.heracross], [0, 'Bayleef', CUE.bayleef], [1, 'Arcanine', CUE.arcanine], [1, 'Nidoqueen', CUE.nido], [0, 'Snorlax', CUE.snorlax], [1, 'Scizor', CUE.scizorX], [1, 'Golem', CUE.golemX], [1, 'Blastoise', CUE.falls + .1]];
  for (const [side, nm, tt] of KO) if (tt) { const [cx, cy] = chip(side, NAME(side, nm)); X('ros', tt, cx, cy, 36, side ? BLUE : WHITE, 9); }
}
// groups: draw order and the wipes that remove them (a downward pass over the board area)
const GROUPS = ['hdr', 'ros', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6j', 'm67', 'steam', 'm8'];
const WIPE = { m1: [6.9, 7.7], m2: [13.9, 14.7], m3: [20.9, 21.7], m4: [28.9, 29.7], m5: [36.9, 37.7], m6j: [44.9, 45.7], m67: [52.9, 53.7], steam: [52.9, 53.7] };
for (const g of Object.values(WIPE)) EV.push({ t: g[0], type: 'wipe', d: g[1] - g[0] });

// ---------- drawing ----------
let BG, LAYER, TMP, GRAIN;
function chalkPath(c, it, p) {
  const n = it.pts.length, target = it.len * p; let i = 1;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(it.pts[0][0], it.pts[0][1]);
  while (i < n && it.L[i] <= target) { c.lineTo(it.pts[i][0], it.pts[i][1]); i++; }
  let tip = it.pts[Math.min(i - 1, n - 1)];
  if (i < n) { const f = (target - it.L[i - 1]) / Math.max(1e-6, it.L[i] - it.L[i - 1]); tip = [lerp(it.pts[i - 1][0], it.pts[i][0], f), lerp(it.pts[i - 1][1], it.pts[i][1], f)]; c.lineTo(tip[0], tip[1]); }
  c.strokeStyle = it.col; c.globalAlpha = it.a; c.lineWidth = it.w; c.stroke();
  c.globalAlpha = it.a * .55; c.lineWidth = it.w * .5; c.translate(.9, .7); c.stroke(); c.translate(-.9, -.7);
  if (p < 1 && p > 0) { c.fillStyle = it.col; for (let k = 0; k < 3; k++) { c.globalAlpha = .55; c.fillRect(tip[0] + (hash(it.id + k + Math.floor(p * 40)) - .5) * 14, tip[1] + (hash(it.id * 3 + k + Math.floor(p * 40)) - .5) * 14, 2, 2); } }
  c.globalAlpha = 1;
}
function chalkText(c, it, p) {
  c.font = `${it.size}px "${it.font}"`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const w = c.measureText(it.str).width, x0 = it.align === 'center' ? it.x - w / 2 : it.x;
  c.save(); c.beginPath(); c.rect(x0 - 8, it.y - it.size * 1.1, (w + 16) * eo(p), it.size * 1.5); c.clip();
  c.fillStyle = it.col; c.globalAlpha = it.a; c.fillText(it.str, x0, it.y); c.globalAlpha = it.a * .5; c.fillText(it.str, x0 + .8, it.y + .6);
  c.restore(); c.globalAlpha = 1;
}
function drawGroup(c, g, t) {
  for (const it of ITEMS) {
    if (it.grp !== g || t < it.t0) continue;
    const p = clamp((t - it.t0) / it.d); if (it.kind === 'path') chalkPath(c, it, p); else chalkText(c, it, p);
  }
}
function wipeBand(c, t, w) {
  const y = lerp(BOARD_TOP - 40, BOARD_BOT + 120, ss(seg(t, w[0], w[1])));
  c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(-10, BOARD_TOP - 60);
  for (let x = -10; x <= W + 10; x += 30) c.lineTo(x, y + (vnoise(x * .01 + 3) - .5) * 70 + Math.sin(x * .02 + t * 3) * 8);
  c.lineTo(W + 10, BOARD_TOP - 60); c.closePath(); c.fillStyle = '#000'; c.fill(); c.restore();
}
function bakeBG() {
  BG = document.createElement('canvas'); BG.width = W; BG.height = H; const g = BG.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#244238'); gr.addColorStop(.5, '#21403a'); gr.addColorStop(1, '#1c3830'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const rn = mulberry(11); const id = g.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rn() - .5) * 14; d[i] += n; d[i + 1] += n * 1.1; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
  // slow mottling
  for (let i = 0; i < 40; i++) { const x = rn() * W, y = rn() * H, r = 160 + rn() * 260; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(255,255,255,${.012 + rn() * .012})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // wood frame
  const wood = (x, y, w, h, vert) => { const lg = vert ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h); lg.addColorStop(0, '#8a6038'); lg.addColorStop(.5, '#6e4a2b'); lg.addColorStop(1, '#4f351f'); g.fillStyle = lg; g.fillRect(x, y, w, h); };
  wood(0, 0, W, 26, 0); wood(0, 0, 26, H, 1); wood(W - 26, 0, 26, H, 1);
  // chalk tray
  wood(0, 1790, W, 130, 0); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(26, 1790, W - 52, 14);
  g.fillStyle = '#5b3d24'; g.fillRect(26, 1804, W - 52, 20);
  const stick = (x, y, w, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, 15, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 8, y + 3, w - 16, 3); };
  stick(120, 1796, 120, WHITE); stick(300, 1798, 96, ORANGE); stick(470, 1796, 110, BLUE); stick(660, 1799, 40, WHITE);
  // a duster
  g.fillStyle = '#2d2a28'; g.beginPath(); g.roundRect(820, 1788, 150, 28, 5); g.fill(); g.fillStyle = '#b9a98a'; g.fillRect(820, 1812, 150, 8);
  // grain tile for chalk
  GRAIN = document.createElement('canvas'); GRAIN.width = W; GRAIN.height = H; const gg = GRAIN.getContext('2d'); const gi = gg.createImageData(W, H), gd = gi.data;
  for (let i = 0; i < gd.length; i += 4) { const v = rn(); gd[i + 3] = v < .26 ? Math.pow(rn(), 1.6) * 255 : 0; }
  gg.putImageData(gi, 0, 0);
  LAYER = document.createElement('canvas'); LAYER.width = W; LAYER.height = H; TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H;
}
function sceneCam(t) {
  const S = [0, 7, 14, 21, 29, 37, 45, 53, 60.6];
  let i = 0; while (i < 7 && t >= S[i + 1]) i++;
  const p = seg(t, S[i], S[i + 1]);
  return { s: 1 + (i === 7 ? .06 : .028) * ss(p), fx: 540 + (i % 2 ? 10 : -10) * p, fy: 980 };
}
function drawSubs(t) {
  for (const [id, t0, d, txt] of VO) {
    const a = t0 - .1, b = t0 + Math.max(d + .5, 1.8);
    if (t < a || t > b) continue;
    const al = Math.min(seg(t, a, a + .2), 1 - seg(t, b - .3, b));
    ctx.save(); ctx.font = '50px "Patrick Hand"'; ctx.textAlign = 'center';
    const words = txt.split(' '), lines = []; let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > 900 && cur) { lines.push(cur); cur = w; } else cur = test; }
    lines.push(cur);
    lines.forEach((ln, i) => { const y = 1488 + (lines.length === 3 ? 0 : 26) + i * 58; ctx.lineWidth = 9; ctx.strokeStyle = `rgba(20,38,32,${.9 * al})`; ctx.lineJoin = 'round'; ctx.strokeText(ln, 540, y); ctx.fillStyle = `rgba(241,239,230,${.97 * al})`; ctx.fillText(ln, 540, y); });
    ctx.restore();
  }
}
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const L = LAYER.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, W, H);
  for (const g of GROUPS) {
    const w = WIPE[g];
    if (w && t > w[1]) continue;
    if (w && t >= w[0]) {
      const T2 = TMP.getContext('2d'); T2.setTransform(1, 0, 0, 1, 0, 0); T2.clearRect(0, 0, W, H); drawGroup(T2, g, t); wipeBand(T2, t, w); L.drawImage(TMP, 0, 0);
    } else drawGroup(L, g, t);
  }
  L.globalCompositeOperation = 'destination-out'; L.drawImage(GRAIN, 0, 0); L.globalCompositeOperation = 'source-over';
  const cam = sceneCam(t);
  ctx.save(); ctx.translate(540, 960); ctx.scale(cam.s, cam.s); ctx.translate(-cam.fx, -cam.fy);
  ctx.drawImage(BG, 0, 0); ctx.drawImage(LAYER, 0, 0); ctx.restore();
  // soft vignette
  const vg = ctx.createRadialGradient(540, 960, 500, 540, 960, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  drawSubs(t);
}
window.render = render; window.EV = EV;
window.TEXTS = t => {
  const out = [];
  for (const it of ITEMS) if (it.kind === 'text' && t >= it.t0 && it.size >= 60) { const ws = WIPE[it.grp]; if (ws && t > ws[0]) continue; out.push({ id: 't' + it.id, text: it.str, x0: 0, y0: 0, x1: W, y1: 200, pass: false }); }
  return out;
};
(async () => {
  for (const f of ['50px "Patrick Hand"', '30px "Patrick Hand"', '100px "Gloria Hallelujah"']) await document.fonts.load(f);
  bakeBG(); build();
  window.READY = true;
})();
