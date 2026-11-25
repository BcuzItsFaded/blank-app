// ================================================================ THE SCENE: Tenet, as a colored-pencil cutaway (see TREATMENT.md)
// Every drawn-in object gets a reveal time (its arev); the post pass draws its four pencil layers after that.
// Accents are the only colours that carry meaning: amber = the orange trinket; cobalt = inverted things; red = the Algorithm.
const scene = new THREE.Scene();
const add = (geo, m) => { const o = new THREE.Mesh(geo, m); o.frustumCulled = false; scene.add(o); return o; };
const REF0 = V(0, 0.4, 16.4);                     // the one reference camera: every anchor is projected through it
const AMBER = '#E8A21E', COBALT = '#2B5FB3', RED = '#C8302A';

// ---------------------------------------------------------------- timing: every visual is keyed to a narration line
let S = [], D = [];                                // start / duration of each narration line (film seconds)
const Lt = (i, f) => S[i - 1] + f * (D[i - 1] + 0.3);   // i = 1..15, f = 0..1 through that line
const LEND = i => S[i - 1] + D[i - 1] + 0.3;
const TITLE_T = [0.2, 3.6];

// ---------------------------------------------------------------- geometry helpers
function addGeo(b, geo, pos = V(0, 0, 0), rot = [0, 0, 0], sc = [1, 1, 1], cfn = () => [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...sc));
  append(b, geo, m, cfn, UP);
}
const box = (b, x0, x1, y0, y1, z0, z1) => addGeo(b, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
const cyl = (b, p, rt, rb, h, rot = [0, 0, 0]) => addGeo(b, new THREE.CylinderGeometry(rt, rb, h, 12), p, rot);
const sph = (b, p, r) => addGeo(b, new THREE.SphereGeometry(r, 14, 10), p);
function group(b, id, kind, color, rev = null, extra = {}) {
  return add(b.geo(), mat(Object.assign({ id, kind, color, disc: 1, rev }, extra)));
}
// a stand-in figure: a silhouette, no likeness. raise = 0..1 arm raised; lean = small tilt
function figure(b, x, z, s = 1, o = {}) {
  const raise = o.raise || 0, lean = o.lean || 0;
  const g = new THREE.Group();
  const p = (y, pos, rot, geo) => { const m = new THREE.Matrix4().compose(V(x + pos[0] * s, y + pos[1] * s, z + pos[2] * s), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(s, s, s)); append(b, geo, m, () => [1, 1, 1], UP); };
  p(0, [0, 0.16, 0], [0, lean, 0], new THREE.SphereGeometry(0.16, 14, 10));                         // head
  p(0, [0, 0.95, 0], [0, 0, lean * 0.6], new THREE.CylinderGeometry(0.2, 0.27, 0.9, 12));           // torso
  for (const sd of [-1, 1]) {
    p(0, [sd * 0.31, 0.95, 0], [0, 0, sd * (0.12 - raise * 0.5)], new THREE.CylinderGeometry(0.065, 0.065, 0.78, 8));  // arms
    if (raise > 0 && sd > 0) p(0, [0.31 + 0.2 * raise, 1.42 + 0.34 * raise, 0], [0, 0, -0.9 * raise], new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8));
    p(0, [sd * 0.13, 0.42, 0], [0, 0, sd * 0.04], new THREE.CylinderGeometry(0.09, 0.08, 0.88, 8)); // legs
  }
  return g;
}
// one stand-in figure as its own drawn object (id = its outline)
function drawFigure(id, x, z, s, t0, o = {}) { const b = new Builder(); b.rv = t0; figure(b, x, z, s, o); return group(b, id, 0, o.color || [0.07, 0.06, 0.06], null, { dir: 1 }); }
// a soil horizon: a slab between two wavy edges, seen from the front (cut face at z = 0); swept left to right
function slab(id, color, top, bot, t0, dur) {
  const NX = 90, b = new Builder(); b.rv = -100;
  for (let i = 0; i <= NX; i++) {
    const x = X0 + (X1 - X0) * i / NX;
    b.v(V(x, top(x), 0), V(0, 0, 1), [1, 1, 1], V(1, 0, 0), 1, t0 + dur * (x - X0) / (X1 - X0));
    b.v(V(x, bot(x), 0), V(0, 0, 1), [1, 1, 1], V(1, 0, 0), 1, t0 + dur * (x - X0) / (X1 - X0));
  }
  for (let i = 0; i < NX; i++) { const a = 2 * i, bb = a + 1, c = a + 2, d = a + 3; b.i.push(a, bb, c, bb, d, c); }
  return add(b.geo(), mat({ id, kind: 1, color, disc: 1, rev: [t0, dur] }));
}
const X0 = -10, X1 = 10;
const topsoil = x => 0.0 - 0.02 * (0.5 + 0.5 * Math.sin(x * 0.9));
const subsoil = x => -0.7 + 0.12 * Math.sin(x * 0.55 + 1.0);
const weathered = x => -2.5 + 0.18 * Math.sin(x * 0.4 + 2.0);
const bedrock = x => -3.7 + 0.14 * Math.sin(x * 0.3 + 0.5);
const BOTTOM = x => -4.6;

// accent helpers (coloured pencil, drawn over the picture on the overlay): project world points with the main camera
function scrPts(P) { return P.map(v => proj(v, camera)); }
function arcPts(c0, r, a0, a1, z = 0, n = 40) { const P = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; P.push(V(c0.x + Math.cos(a) * r, c0.y + Math.sin(a) * r, z)); } return P; }
function polyCurve(P, n = 30) { const out = []; for (let i = 0; i < n; i++) { const u = i / (n - 1) * (P.length - 1), k = Math.min(P.length - 2, Math.floor(u)), f = u - k; out.push(P[k].clone().lerp(P[k + 1], f)); } return out; }

// ---------------------------------------------------------------- the world: built once, every object drawn in at its time
let WORLD = {};
function buildWorld() {
  // soil horizons: topsoil, subsoil, weathered, bedrock (blue-grey)
  slab(7, [0.30, 0.19, 0.11], topsoil, subsoil, Lt(2, 0.00), 2.2);
  slab(8, [0.74, 0.46, 0.23], subsoil, weathered, Lt(2, 0.12), 2.2);
  slab(9, [0.70, 0.55, 0.36], weathered, bedrock, Lt(2, 0.24), 2.2);
  slab(10, [0.44, 0.49, 0.58], bedrock, BOTTOM, Lt(2, 0.34), 2.2);
  // ground surface strip along the top edge (grass)
  { const b = new Builder(); b.rv = Lt(2, 0.0); const NX = 90;
    for (let i = 0; i <= NX; i++) { const x = X0 + (X1 - X0) * i / NX; b.v(V(x, 0.0, 0), V(0, 0, 1), [1, 1, 1], V(1, 0, 0), 1, Lt(2, 0.0) + 2.2 * (x - X0) / (X1 - X0)); b.v(V(x, topsoil(x) - 0.02, 0), V(0, 0, 1), [1, 1, 1], V(1, 0, 0), 1, Lt(2, 0.0) + 2.2 * (x - X0) / (X1 - X0)); }
    for (let i = 0; i < NX; i++) { const a = 2 * i, bb = a + 1, c = a + 2, d = a + 3; b.i.push(a, bb, c, bb, d, c); }
    add(b.geo(), mat({ id: 2, kind: 4, color: [0.55, 0.67, 0.27], disc: 1, rev: [Lt(2, 0.0), 2.2] })); }
  // the opera house (fictional), above ground, behind the cut
  { const b = new Builder(); b.rv = Lt(2, 0.36);
    box(b, -4.5, 4.5, 0, 3.0, -9.5, -7.0); box(b, -5.2, 5.2, 3.0, 3.4, -9.9, -6.6);
    for (let i = 0; i < 8; i++) cyl(b, V(-3.9 + i * 1.1, 1.5, -6.6), 0.13, 0.13, 3.0);
    box(b, -2.4, 2.4, 3.4, 4.6, -8.6, -7.7); cyl(b, V(0, 5.0, -8.2), 0.04, 0.04, 1.0);
    group(b, 13, 5, [0.92, 0.88, 0.80], null); }
  // the masked stand-in soldier with the orange trinket
  WORLD.soldier = drawFigure(18, -1.8, -1.2, 1.0, Lt(2, 0.6), { raise: 1, color: [0.07, 0.06, 0.06] });
  // trinket: a small object in the figure's hand, in amber (accent 1)
  { const b = new Builder(); b.rv = Lt(2, 0.7); sph(b, V(-1.25, 1.55, -1.2), 0.1); WORLD.trinket = group(b, 19, 0, [0.95, 0.62, 0.15], null); }
  // the bullet: a grain on a thread (drawn, not glowing), moves backward into the gun barrel
  makeGrain(Lt(2, 0.72), Lt(2, 0.95), [V(-4.0, 1.1, -7.2), V(-0.9, 1.1, -1.2)]);   // the bullet flies backward: wall -> gun
  // loyalty test: a table with a lever, in a magnifier (inner view)
  { const b = new Builder(); b.rv = Lt(3, 0.15); const X = -4.3; box(b, X - 1.2, X + 1.2, -0.45, -0.35, -1.0, 1.0); cyl(b, V(X, -0.1, 0), 0.07, 0.07, 0.6); cyl(b, V(X + 0.42, 0.45, 0), 0.04, 0.04, 0.5, [0, 0, 0.6]); box(b, X - 0.9, X - 0.5, -0.45, -0.34, -0.9, -0.6);
    group(b, 13, 5, [0.78, 0.74, 0.70], null); }
  WORLD.loyalty = drawFigure(21, -4.3, -0.8, 1.0, Lt(3, 0.5), { raise: 0.3 });
  // inversion: the stone in the soil (its entropy arrow is the cobalt overlay)
  { const b = new Builder(); b.rv = Lt(4, 0.1); sph(b, V(-6.5, -2.2, 0.25), 0.55); sph(b, V(-5.6, -2.9, 0.25), 0.36); WORLD.stone = group(b, 14, 5, [0.62, 0.62, 0.66], null); }
  // Sator's vault below ground, with gold (ochre) and a figure inside (stand-in)
  { const b = new Builder(); b.rv = Lt(5, 0.12); box(b, 2.8, 7.8, -3.0, -1.4, 0.04, 0.6); group(b, 22, 1, [0.20, 0.16, 0.14], null, { dir: 1 });
    const g = new Builder(); g.rv = Lt(5, 0.2); for (let i = 0; i < 6; i++) box(g, 3.2 + (i % 3) * 1.3, 4.1 + (i % 3) * 1.3, -2.9 + Math.floor(i / 3) * 0.45, -2.6 + Math.floor(i / 3) * 0.45, 0.1, 0.45); group(g, 23, 5, [0.90, 0.72, 0.36], null); }
  WORLD.sator = drawFigure(21, 5.3, 0.2, 0.55, Lt(5, 0.3), { raise: 0 });
  // the Algorithm: nine rings around a core, drawn one at a time (red accent overlay)
  WORLD.rings = [];
  for (let i = 0; i < 9; i++) { const b = new Builder(); b.rv = Lt(6, 0.05 + i * 0.07); const r = 0.7 + i * 0.24; const P = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2; P.push(V(-1.2 + Math.cos(a) * r, -2.4 + Math.sin(a) * r, 0.25)); }
    const [pp, rr] = chaikin(P, P.map(() => 0.035), 1); tube(b, pp, rr, 6, () => [1, 1, 1], null, null, null); WORLD.rings.push(group(b, 17, 5, [0.55, 0.36, 0.30], null)); }
  { const b = new Builder(); b.rv = Lt(6, 0.0); sph(b, V(-1.2, -2.4, 0.25), 0.28); group(b, 17, 5, [0.32, 0.30, 0.34], null); }
  // Neil and Kat: two stand-in figures step in beside the agent
  WORLD.neil = drawFigure(24, -2.8, 0.6, 0.95, Lt(7, 0.1), { lean: 0.05 });
  WORLD.kat = drawFigure(26, 2.6, 0.7, 0.95, Lt(7, 0.3), { lean: -0.05 });
  // the freeport warehouse (cutaway) and the falling aircraft (stylised, no livery)
  { const b = new Builder(); b.rv = Lt(8, 0.0); box(b, 3.0, 7.5, 0.0, 2.6, -3.0, -1.0); box(b, 3.0, 7.5, 2.6, 2.75, -3.0, -1.0); group(b, 27, 5, [0.82, 0.78, 0.70], null); }
  WORLD.plane = (() => { const b = new Builder(); b.rv = Lt(8, 0.1); cyl(b, V(0, 0, 0), 0.22, 0.22, 3.2, [0, 0, Math.PI / 2]); box(b, -0.3, 0.3, -0.05, 0.05, -1.5, 1.5); box(b, -0.5, 0.5, -0.02, 0.02, -2.0, 2.0); return group(b, 28, 5, [0.92, 0.92, 0.94], null); })();
  // the highway (flat road cutaway) and the cars
  { const b = new Builder(); b.rv = Lt(9, 0.0); box(b, -10, 10, -0.06, 0.02, -6.5, -5.2); group(b, 25, 5, [0.36, 0.36, 0.40], null); }
  WORLD.cars = [0, 1, 2].map(i => { const b = new Builder(); b.rv = Lt(9, 0.05); box(b, -0.5, 0.5, 0.0, 0.25, -6.2, -5.6); return group(b, 25, 5, [0.20 + 0.1 * i, 0.22, 0.26], null); });
  WORLD.sator9 = drawFigure(21, -4.2, -5.0, 1.0, Lt(9, 0.0), {});
  makeGrain(Lt(9, 0.55), Lt(9, 0.8), [V(3.6, 1.0, -5.0), V(-4.2, 1.0, -5.0)]);   // the inverted bullet: Kat -> Sator
  WORLD.kat9 = drawFigure(26, 3.6, -5.0, 1.0, Lt(9, 0.0), {});
  // the turnstile (in the magnifier): a post, three arms
  { const b = new Builder(); b.rv = Lt(10, 0.0); cyl(b, V(-5, 0.8, -2), 0.12, 0.12, 1.6); for (let k = 0; k < 3; k++) { const a = k * 2.094; cyl(b, V(-5 + Math.cos(a) * 0.5, 0.8, -2 + Math.sin(a) * 0.5), 0.05, 0.05, 1.0, [Math.PI / 2, 0, a]); } group(b, 29, 5, [0.70, 0.72, 0.76], null); }
  WORLD.pass1 = drawFigure(21, -5.6, -2.0, 0.7, Lt(10, 0.1), {}); WORLD.pass2 = drawFigure(24, -4.4, -2.0, 0.7, Lt(10, 0.1), {});
  // the yacht (hull, floating on a blue-grey sea) and the sea
  { const b = new Builder(); b.rv = Lt(11, 0.05); box(b, 2.5, 6.5, 0.0, 0.5, -3.6, -2.4); box(b, 3.4, 5.6, 0.5, 1.0, -3.4, -2.6); box(b, 5.4, 5.7, 0.9, 2.6, -3.1, -2.9); group(b, 30, 5, [0.92, 0.90, 0.86], null); }
  WORLD.sator11 = drawFigure(21, 4.4, -3.0, 0.6, Lt(11, 0.15), { raise: 0.5 });
  // the Stalsk-12 dome (a concrete dome in section) on the ground, to the left
  { const b = new Builder(); b.rv = Lt(11, 0.3); const DG = new THREE.SphereGeometry(3.0, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2); addGeo(b, DG, V(-6, 0, -2.0), [0, 0, 0]); group(b, 32, 5, [0.78, 0.76, 0.70], null); }
  // the pincer's soldiers: forward (red accent) from the left, inverted (cobalt accent) from the right; all stand-ins
  WORLD.fwd = [0, 1, 2].map(i => drawFigure(33, -10 + i * 0.6, -1.2 + i * 0.35, 0.8, Lt(12, 0.1), {}));
  WORLD.inv = [0, 1, 2].map(i => drawFigure(34, 9 - i * 0.6, -1.2 + i * 0.35, 0.8, Lt(12, 0.1), {}));
  // the inverted soldier who takes the bullet, in front of the agent
  WORLD.saviour = drawFigure(34, 0.6, 0.5, 0.95, Lt(13, 0.4), { raise: 0 });
  // the algorithm is pulled out of the dome: its rings (WORLD.rings) lift on Lt(13, .2..0.5)
  // the trinket on Neil's bag
  { const b = new Builder(); b.rv = Lt(14, 0.0); box(b, -3.6, -2.2, 0.8, 1.6, 0.4, 0.9); WORLD.bag = group(b, 35, 5, [0.25, 0.20, 0.16], null); }
  { const b = new Builder(); b.rv = Lt(14, 0.0); sph(b, V(-2.9, 1.0, 0.95), 0.1); WORLD.trinket2 = group(b, 19, 0, [0.95, 0.62, 0.15], null); }
}

// ---------------------------------------------------------------- camera (translations only, fixed pitch: the strokes stay anchored)
const KF = [];                                       // [t, x, y, z] keys for the main camera
function camAt(t) {
  const K = [
    [0, 0, 0.4, 16.4],
    [Lt(4, 0.0), 0, 0.4, 16.4], [Lt(4, 0.9), 0, -1.6, 15.2],
    [Lt(5, 0.0), -1, -1.6, 15.0], [Lt(5, 0.9), 2, -1.0, 14.2],
    [Lt(6, 0.0), 0, -0.8, 14.8], [Lt(6, 0.9), 0, -0.4, 17.0],
    [Lt(7, 0.0), 0, -0.2, 17.0], [Lt(7, 0.9), 0, 0.2, 16.4],
    [Lt(8, 0.0), 2, 0.4, 16.4], [Lt(8, 0.9), -3, 0.4, 16.4],
    [Lt(9, 0.0), -4, 0.4, 16.4], [Lt(9, 0.9), 4, 0.4, 16.4],
    [Lt(11, 0.0), 0, 0.4, 16.4], [Lt(11, 0.9), 1, -1.2, 15.6],
    [Lt(12, 0.0), 0, -0.4, 16.0], [Lt(12, 0.9), 0, -0.4, 16.2],
    [Lt(13, 0.0), 0, -0.4, 16.2], [Lt(13, 0.9), 0, -0.4, 16.4],
    [Lt(15, 0.0), 0, -0.4, 16.4], [Lt(15, 0.7), 0, 0.2, 20.5], [1e9, 0, 0.2, 20.5]];
  if (t <= K[0][0]) return V(K[0][1], K[0][2], K[0][3]);
  for (let i = 0; i < K.length - 1; i++) {
    const [t0, x0, y0, z0] = K[i], [t1, x1, y1, z1] = K[i + 1];
    if (t >= t0 && t <= t1) { const u = ss(seg(t, t0, Math.max(1e-3, t1 - t0))); return V(lerp(x0, x1, u), lerp(y0, y1, u), lerp(z0, z1, u)); }
  }
  const L = K[K.length - 1]; return V(L[1], L[2], L[3]);
}
const camPosAt = t => { const p = camAt(t); return V(p.x, p.y - 0.4, p.z); };   // composition: ground line at mid-frame
// magnifiers (iris): a pencilled circle grows around a detail; inside it the inset view (closer, anchored at its own scale)
const IRIS_DEF = () => [
  { t0: Lt(3, 0.3), t1: Lt(3, 0.85), cx: 960, cy: 520, r: 380, pos: V(-4.3, 0.8, 4.2) },
  { t0: Lt(10, 0.2), t1: Lt(10, 0.85), cx: 620, cy: 560, r: 420, pos: V(-5, 1.2, 4.2) },
  { t0: Lt(14, 0.2), t1: Lt(14, 0.9), cx: 900, cy: 600, r: 380, pos: V(-2.9, 1.6, 4.6) },
];
function irisAt(t) {
  for (const I of IRIS_DEF()) if (t >= I.t0 && t <= I.t1 + 0.2) { const k = ss(seg(t, I.t0, 0.4)) * (1 - ss(seg(t, I.t1, 0.2))); return { ...I, rad: I.r * k }; }
  return null;
}
// the wash and the un-drawing: a thing that is undone (inverted and lost) loses its focus, becoming a light pale outline
const FOCUS_DEF = () => [   // [id, t0, t1, from, to]  (focus 1 = fully drawn)
  [14, Lt(4, 0.8), Lt(4, 1.0), 1, 0.25],
  [26, Lt(9, 0.8), Lt(9, 1.0), 1, 0.2],
  [34, Lt(13, 0.75), Lt(13, 0.95), 1, 0.2],
];
function focusAt(t) {
  const f = {};
  for (const [id, t0, t1, a, b] of FOCUS_DEF()) if (t >= t0) f[id] = lerp(a, b, ss(seg(t, t0, t1 - t0)));
  return f;
}
function views(t) {
  const main = { pos: camPosAt(t), ref: REF0, focus: focusAt(t), hide: [] };
  const I = irisAt(t);
  let inset = null, iris = null;
  if (I) { inset = { pos: I.pos, ref: I.pos, focus: main.focus, hide: [] }; iris = { cx: I.cx, cy: I.cy, r: I.rad, inner: 1 }; }
  return { main, inset, iris };
}

// ---------------------------------------------------------------- moving grains: the backward bullet, the inverted bullet
const GRAIN = [];
function grainPath(t, t0, t1, P) {              // u: 0..1 along P; a backward grain runs P reversed
  const u = clamp((t - t0) / (t1 - t0), 0, 1); return P.length ? polyCurve(P, 40)[Math.round(u * 39)] : V(0, 0, 0);
}
function placeGrains(t) {
  // each grain: [mesh, t0, t1, P] (P is the path in the order it travels in film time)
  for (const G of GRAIN) { const p = grainPath(t, G.t0, G.t1, G.P); G.mesh.position.copy(p); G.mesh.visible = t >= G.t0 && t <= G.t1 + 0.05; }
}
function makeGrain(t0, t1, P) { const b = new Builder(); b.rv = t0 - 1; sph(b, V(0, 0, 0), 0.075); const m = group(b, 16, 0, [0.20, 0.18, 0.16], null); m.userData.grain = true; GRAIN.push({ mesh: m, t0, t1, P }); return m; }
// the grain's pencil trail and the accents are drawn on the overlay (see drawOverlay)
const TRAILS = [];   // [t0, t1, pts (world), colour, width, reverse]

// ---------------------------------------------------------------- text & overlay: labels, title, subtitles, accents
const LABELS = [];   // [text, x, y, t0, t1, size]
const TITLE = { en: 'WHAT IF TIME ITSELF WAS THE WEAPON?', t0: TITLE_T[0], t1: TITLE_T[1] };
let SUBS = [], EVEN = [];
function drawTag(text, x, y, t0, t1, size, prog) {
  const T = textLayout(text, size, 40 + text.length);
  const pad = size * 0.45, w = T.tot + pad * 2, h = size * 1.7;
  const a = ss(seg(prog, 0, 0.25));
  tg.save(); tg.globalAlpha = a; tg.fillStyle = '#f7f1e2'; tg.strokeStyle = 'rgba(40,30,20,.35)'; tg.lineWidth = 2;
  tg.fillRect(x - w / 2, y - h / 2, w, h); tg.strokeRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2); tg.restore();
  textDraw(T, x - T.tot / 2, y + size * 0.36, ss(seg(prog, 0.2, 0.7)), 1);
}
function drawOverlay(t, ir) {
  for (const c of [tg, ik, cl]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); }
  setCamera(views(t).main);
  // title: pencilled in the sky, stroke by stroke, then underlined
  if (t >= TITLE.t0 && t < TITLE.t1 + 1.6) { const T = textLayout(TITLE.en, 58, 3); const pr = ss(seg(t, TITLE.t0, TITLE.t1 - TITLE.t0)); const fade = 1 - ss(seg(t, TITLE.t1, 1.4));
    textDraw(T, W / 2 - T.tot / 2, 150, pr, fade); pline(ik, [[W / 2 - T.tot / 2, 176], [W / 2 + T.tot / 2, 182]], ss(seg(t, TITLE.t0 + 1.8, 1.2)) * fade, 3, 5, 0.8 * fade, '#33241C'); }
  // subtitles: a cream slip, bottom left, wiped on (read, not drawn)
  for (const s of SUBS) if (t >= s.t0 && t < s.t1) {
    const lines = wrapText(s.en, 62), lh = 50, h = lines.length * lh + 34;
    tg.fillStyle = '#f5efdf'; tg.fillRect(40, H - 60 - h, 1180, h);
    ik.save(); ik.font = `40px ${FONT}`; ik.fillStyle = '#2a1e16'; ik.textBaseline = 'middle';
    lines.forEach((ln, i) => ik.fillText(ln, 62, H - 60 - h + 17 + lh / 2 + i * lh)); ik.restore();
  }
  // labels: one per shot, paper tags with handwriting
  for (const L of LABELS) if (t >= L[3] && t <= L[4]) drawTag(L[0], L[1], L[2], L[3], L[4], L[5], seg(t, L[3], 0.9));
  // accents (coloured pencil on the overlay): amber trinket ring; cobalt inversion arrows; red Algorithm rings
  const trinketScr = proj(V(-1.25, 1.55, -1.2), camera);
  if (t >= Lt(2, 0.85)) pline(cl, arcPts(V(trinketScr[0], trinketScr[1], 0), 26, 0, Math.PI * 2, 0, 40).map(p => [p.x, p.y]), ss(seg(t, Lt(2, 0.85), 0.6)), 6, 11, 0.9, AMBER);
  if (t >= Lt(14, 0.35)) { const p2 = proj(V(-2.9, 1.0, 0.95), camera); pline(cl, arcPts(V(p2[0], p2[1], 0), 24, 0, Math.PI * 2, 0, 40).map(p => [p.x, p.y]), ss(seg(t, Lt(14, 0.35), 0.6)), 6, 12, 0.9, AMBER); }
  // the inversion arrow on the stone (cobalt), drawn then undrawn
  if (t >= Lt(4, 0.35) && t < Lt(4, 0.75)) { const a = [proj(V(-7.8, -1.6, 0.3), camera), proj(V(-5.2, -2.2, 0.3), camera)]; pline(cl, [a[1], a[0]], ss(seg(t, Lt(4, 0.35), 0.6)), 6, 13, 0.9, COBALT); }
  if (t >= Lt(4, 0.75) && t < Lt(4, 1.0)) { const a = [proj(V(-7.8, -1.6, 0.3), camera), proj(V(-5.2, -2.2, 0.3), camera)]; pline(cl, [a[1], a[0]], 1 - ss(seg(t, Lt(4, 0.75), 0.25)), 6, 13, 0.9 * (1 - ss(seg(t, Lt(4, 0.75), 0.25))), COBALT); }
  // the cobalt arrows from the future into the vault (Lt 5)
  if (t >= Lt(5, 0.4)) for (let i = 0; i < 4; i++) { const x = 3.5 + i * 1.1; const p0 = proj(V(x, -4.2, 0.3), camera), p1 = proj(V(x, -2.9, 0.3), camera); pline(cl, [p0, p1], ss(seg(t, Lt(5, 0.4) + i * 0.12, 0.5)), 6, 20 + i, 0.9, COBALT); }
  // the Algorithm's rings: red, drawn with each ring
  for (let i = 0; i < 9; i++) { const t0 = Lt(6, 0.05 + i * 0.07); if (t < t0) break; const r = 0.7 + i * 0.24; const P = arcPts(V(-1.2, -2.4, 0.25), r, 0, Math.PI * 2, 0, 56).map(p => { const q = proj(p, camera); return [q[0], q[1]]; }); pline(cl, P, ss(seg(t, t0, 0.8)), 4.5, 30 + i, 0.85, RED); }
  // pincer fronts: red (forward) from the left, cobalt (inverted) from the right
  if (t >= Lt(12, 0.1)) { const pa = proj(V(-6.0, -1.0, 0.3), camera), pb = proj(V(-2.0, -1.0, 0.3), camera); pline(cl, [pa, pb], ss(seg(t, Lt(12, 0.1), 0.8)), 6, 40, 0.9, RED); const qa = proj(V(8, -1.0, 0.3), camera), qb = proj(V(-1.5, -1.0, 0.3), camera); pline(cl, [qa, qb], ss(seg(t, Lt(12, 0.1), 0.8)), 6, 41, 0.9, COBALT); }
  // the dead man's switch: a cobalt dashed path from the yacht to the dome
  if (t >= Lt(11, 0.4)) { const a = proj(V(4.5, -0.2, -3.5), camera), b = proj(V(-6, 2.4, -2.0), camera); pline(cl, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 80], b], ss(seg(t, Lt(11, 0.4), 1.0)), 4, 50, 0.9, COBALT, [14, 10]); }
  // the trinket's last layer: the amber on the bag, with its tag
  // iris: a pencilled circle around the magnifier
  if (ir) { const pts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; pts.push([ir.cx + Math.cos(a) * ir.r, ir.cy + Math.sin(a) * ir.r]); } pline(ik, pts, 1, 4, 77, 0.9, '#33241C'); }
  tagT.needsUpdate = true; inkT.needsUpdate = true; colT.needsUpdate = true;
}
function wrapText(s, n) { const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }
// labels and subtitles are set up from the narration (see boot)
function setupLabels() {
  LABELS.push(['NEIL', 380, 760, Lt(7, 0.45), Lt(7, 0.95), 34]);
  LABELS.push(['KAT', 1380, 760, Lt(7, 0.5), Lt(7, 0.95), 34]);
  LABELS.push(['THE TRINKET', 980, 240, Lt(2, 0.9), Lt(2, 1.0) + 2.0, 34]);
  LABELS.push(['THE ALGORITHM · 9 PARTS', 780, 330, Lt(6, 0.3), Lt(6, 0.98), 32]);
  LABELS.push(['THE FOUNDER', 960, 230, Lt(15, 0.5), 1e9, 40]);
}

// ---------------------------------------------------------------- render (the film's frame)
function renderFilm(t) {
  const f = Math.round(t * FPS); BOIL = Math.floor(f / 2) % 3;
  postMat.uniforms.uBoil.value = BOIL;
  const tt = t;
  SHARED.uTime.value = tt;
  SHARED.uWindT.value = Math.floor(t * 12) / 12;
  placeGrains(t);
  const vs = views(t);
  renderView(vs.main, rtP1);
  if (vs.inset) renderView(vs.inset, rtP2);
  const ir = vs.iris;
  compMat.uniforms.uIris.value.set(ir ? ir.cx : 0, ir ? ir.cy : 0, ir ? ir.r : 0, ir && ir.inner && vs.inset ? 1 : 0);
  drawOverlay(tt, ir);
  labelTooth(ir && ir.inner ? vs.inset : vs.main);
  quad.material = compMat; renderer.setRenderTarget(rtC); renderer.render(qScene, qCam);
  quad.material = downMat; downMat.uniforms.tP.value = rtC.texture; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  setCamera(vs.main);
}
window.DUR = FILM;
window.render = (t) => renderFilm(t);
window.TEXTS = () => [];
(async () => {
  try { await document.fonts.load(`40px ${FONT}`, 'Tenet'); } catch (e) { }
  GLY = await (await fetch('glyphs.json')).json();
  const VOL = await (await fetch('voice/lines.json')).json(); const DURS = await (await fetch('out/voice/dur.json')).json();
  let t = 0.35; for (const l of VOL) { S.push(t); D.push(DURS[l.id]); t += DURS[l.id] + 0.3; }
  SUBS = VOL.map((l, i) => ({ t0: S[i] - 0.1, t1: S[i] + D[i] + 0.25, en: l.text0 || l.text }));
  buildWorld();
  setupLabels();
  window.FILMEV = [];
  renderFilm(0);
  window.READY = true;
})();
