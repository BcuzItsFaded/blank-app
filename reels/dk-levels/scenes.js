"use strict";
// One side-scrolling level run per Donkey Kong Country game (original brick-built interpretations), then the crew + title. 30 s.
function makeKremling() {
  const g = new THREE.Group(), G = plastic(0x4a9a3a), G2 = plastic(0x2e7a2a), Y = plastic(0xe8d070), W = plastic(0xf4f0e0);
  box(1.5, 1.6, 1.1, G, 0, 1.5, 0, g); box(1.0, 1.2, 0.1, Y, 0, 1.4, 0.58, g); box(1.2, 0.5, 1.0, 0x8a5a2a, 0, 0.75, 0, g);
  const head = new THREE.Group(); head.position.set(0, 2.7, 0.15); g.add(head); box(1.2, 0.9, 1.1, G, 0, 0, 0, head); box(0.9, 0.5, 0.9, G, 0, -0.2, 0.85, head);
  for (let i = -2; i <= 2; i++) box(0.12, 0.2, 0.12, W, i * 0.17, -0.5, 1.28, head);
  for (const s of [-1, 1]) { box(0.3, 0.3, 0.08, W, s * 0.3, 0.3, 0.56, head); box(0.12, 0.16, 0.08, plastic(0xc81810), s * 0.3, 0.3, 0.6, head); box(0.4, 0.14, 0.14, G2, s * 0.3, 0.55, 0.56, head).rotation.z = -s * 0.4; }
  for (const s of [-1, 1]) { box(0.5, 0.9, 0.5, G2, s * 0.4, 0.35, 0, g); box(0.6, 0.2, 0.9, G, s * 0.4, 0.1, 0.2, g); box(0.4, 1.0, 0.4, G, s * 0.95, 1.6, 0, g); }
  box(0.5, 0.5, 1.6, G, 0, 0.9, -1.2, g).rotation.x = 0.3; g.userData = { head }; return g;
}
function makeZinger() {
  const g = new THREE.Group(), Y = plastic(0xf2c820), K = plastic(0x15151a);
  box(1.4, 1.2, 1.5, Y, 0, 0, 0, g); for (let i = -1; i <= 1; i++) box(1.44, 1.24, 0.28, K, 0, 0, i * 0.5, g); box(0.9, 0.9, 0.9, Y, 0, 0.1, 1.0, g);
  box(0.28, 0.3, 0.06, plastic(0xc81810), -0.25, 0.3, 1.46, g); box(0.28, 0.3, 0.06, plastic(0xc81810), 0.25, 0.3, 1.46, g); box(0.16, 0.16, 0.9, K, 0, -0.1, -1.1, g);
  const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); w.position.set(s * 0.9, 0.9, 0); w.rotation.x = Math.PI / 2; g.add(w); return w; });
  g.userData = { wings }; return g;
}
// ---------- level-run engine ----------
const SPEED = 8, X0 = -6;
function groundSegs(scene, segs, top, side, y = 0, depth = 14) { segs.forEach(([a, b]) => { box(b - a, 1.2, depth, side, (a + b) / 2, y - 0.6, 0, scene); box(b - a, 0.2, depth, top, (a + b) / 2, y + 0.1, 0, scene); }); }
function runLevel(scene, o) {
  const cast = o.cast, lead = cast[0], jumps = o.jumps || [], kr = [], zs = [], items = [];
  const jumpY = x => { let y = 0; for (const j of jumps) { const d = (x - j.x) / (j.len / 2); if (Math.abs(d) < 1) y += j.h * (1 - d * d); } return y; };
  (o.kremlings || []).forEach(x => { const k = makeKremling(); k.scale.setScalar(0.9); k.rotation.y = -Math.PI / 2; scene.add(k); kr.push([k, x]); });
  (o.zingers || []).forEach(([x, y]) => { const z = makeZinger(); z.scale.setScalar(0.9); z.rotation.y = -Math.PI / 2; scene.add(z); zs.push([z, x, y]); });
  (o.bananas || []).forEach(x => { const b = bananas(1.0); scene.add(b); items.push([b, x, 1.6 + jumpY(x) * 0.9]); });
  cast.forEach((f, i) => { f.rotation.y = Math.PI / 2; scene.add(f); });
  const cam = camera(52), cx = o.camX ?? 1.8, cy = o.camY ?? 5.4, cz = o.camZ ?? 25, ly = o.lookY ?? 3.4;
  return { cam, update(t, u, t0) {
    const lt = t - t0, X = X0 + SPEED * lt;
    cast.forEach((f, i) => { const x = X - (o.gap || 3.2) * i, y = jumpY(x), air = y > 0.15; f.position.set(x, y + (o.floor || 0) + (air ? 0 : Math.abs(Math.sin(t * 12 + i)) * 0.12), 0);
      const sw = Math.sin(t * 12 + i * 1.7), U = f.userData; U.legs.forEach((l, k) => l.rotation.x = air ? -0.7 : (k ? -sw : sw) * 0.8); U.arms.forEach((a, k) => a.rotation.x = air ? -2.7 : (k ? sw : -sw) * 0.9); U.torso.rotation.x = air ? -0.1 : 0.12;
      if (U.ponySegs) U.ponySegs.forEach((s, k) => s.rotation.x = Math.sin(t * 9 - k * 0.6) * 0.3); if (f.userData.head) f.userData.head.rotation.x = air ? -0.1 : 0.05; });
    kr.forEach(([k, x], i) => { const dd = X - x; k.position.set(x - Math.sin(t * 3 + i) * 0.5, o.floor || 0, 0); k.userData.head.rotation.y = Math.sin(t * 5 + i) * 0.2;
      k.scale.y = dd > 0.2 ? Math.max(0.1, 0.9 - (dd - 0.2) * 5) : 0.9; k.visible = dd < 1.4; });
    zs.forEach(([z, x, y], i) => { z.position.set(x - Math.sin(t * 1.5 + i) * 1.2, y + Math.sin(t * 4 + i) * 0.4, 0); z.userData.wings.forEach((w, k) => w.rotation.z = Math.sin(t * 40) * 0.5 * (k ? -1 : 1)); });
    items.forEach(([b, x, y]) => { b.visible = X < x - 0.6; b.position.set(x, y + Math.sin(t * 3 + x) * 0.15, 0); b.rotation.y = t * 2; });
    lookFrom(cam, V(X + cx, cy, cz), V(X + cx, ly, 0)); return X;
  } };
}
const sunnySky = [[0, '#2a8ae8'], [0.6, '#7ac0f4'], [1, '#d8f0ff']];

// ----- 1 (0-5) 1994: jungle run -----
defScene(0, 5, () => {
  const scene = newScene(); dayLight(scene, sunnySky); ground(scene, 0x3a7a30, 300).position.y = -1;
  groundSegs(scene, [[-30, 70]], 0x4aa03a, 0x6a4a28); box(110, 0.04, 3, 0x9a7a44, 20, 0.14, 0, scene);
  const R = rng(1); for (let i = 0; i < 34; i++) palm(scene, -24 + i * 3.4 + R() * 1.5, -8 - R() * 8, 1 + R() * 0.7, (R() - 0.5) * 0.2);
  for (let i = 0; i < 20; i++) bush(scene, -24 + i * 4 + R() * 2, -4 - R() * 3, 0.8 + R() * 0.7);
  for (const x of [8, 19.5, 31]) barrel(scene, x, 0.1, 0.3, x); for (const x of [10.5, 28]) { box(1.6, 1.0, 1.6, 0x6a4a2a, x, 0.6, 0.2, scene); box(1.8, 0.2, 1.8, 0x7a5a38, x, 1.2, 0.2, scene); }
  const kr = makeKRool(); kr.scale.setScalar(0.9); kr.position.set(36, 0.4, -4); kr.rotation.y = -1.2; scene.add(kr);
  const run = runLevel(scene, { cast: [makeDK(), makeDiddy()], jumps: [{ x: 7.8, len: 3.4, h: 2.4 }, { x: 13.0, len: 3.0, h: 2.6 }, { x: 19.4, len: 3.4, h: 2.4 }, { x: 25.8, len: 3.0, h: 2.6 }], kremlings: [13.2, 26.0], bananas: [1, 3, 5, 10, 16, 22, 30, 32], gap: 2.6 });
  return { scene, cam: run.cam, update(t, u) { kr.userData.jaw.position.y = -1.0 - 0.15 * Math.sin(t * 6); run.update(t, u, 0); } };
});

// ----- 2 (5-10) 1995: pirate galleon deck -----
defScene(5, 10, () => {
  const scene = newScene(); dayLight(scene, [[0, '#3a8ae0'], [0.6, '#8ac8f4'], [1, '#fff0d0']], 0xd0e8f4); water(scene, 400, 200, 20, -4, -10);
  box(110, 1.0, 12, 0x9a6a38, 20, -0.5, 0, scene); for (let x = -30; x < 70; x += 1.8) box(0.08, 0.04, 12, 0x6a4420, x, 0.02, 0, scene); box(110, 1.6, 12.6, 0x6a3e1c, 20, -1.8, 0, scene);
  box(110, 0.8, 0.3, 0x6a3e1c, 20, 0.8, 5.8, scene); box(110, 0.8, 0.3, 0x6a3e1c, 20, 0.8, -5.8, scene);
  for (const x of [6, 26]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 24, 10), plastic(0x5a3a18)); m.position.set(x, 12, -3); scene.add(m);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(11, 9, 5, 4), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, side: THREE.DoubleSide, roughness: 0.9 })); sail.position.set(x, 13, -2.4); scene.add(sail); box(12, 0.3, 0.3, 0x4a2a12, x, 18, -3, scene);
    for (const s of [-1, 1]) { const rp = box(0.06, 22, 0.06, 0x2a2a2a, x + s * 5, 9, -3, scene); rp.rotation.z = s * 0.2; } }
  const flagM = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.5), new THREE.MeshBasicMaterial({ map: flagTex(), side: THREE.DoubleSide })); flagM.position.set(28, 24, -3); scene.add(flagM);
  for (const x of [14, 30]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2.6, 12), plastic(0x2a2a30, { metalness: 0.6, roughness: 0.4 })); c.rotation.z = Math.PI / 2; c.position.set(x, 1.5, -3.5); scene.add(c); box(2.4, 0.3, 1.6, 0x4a2a12, x, 0.4, -3.5, scene); }
  for (const [x, z] of [[2, -3.5], [9, -2.5], [20, -3.8], [34, -3]]) { barrel(scene, x, 0.1, z, x); box(1.6, 1.6, 1.6, 0x8a5a2c, x + 1.5, 0.8, z, scene); }
  for (let i = 0; i < 4; i++) { const s = makeKRool(); }
  const sea = particleField(scene, 3, 140, { x0: -20, x1: 50, y0: -3, y1: 2, z0: 6, z1: 14 }, 0xe8f4ff, 0.2, { vy: 1, drift: 1, opacity: 0.7 }); tick(t => sea(t));
  const run = runLevel(scene, { cast: [makeDiddy(), makeDixie()], jumps: [{ x: 8.4, len: 3.2, h: 3.0 }, { x: 13.2, len: 3.0, h: 2.6 }, { x: 19.6, len: 3.6, h: 3.4 }, { x: 26.2, len: 3.0, h: 2.6 }, { x: 31.6, len: 3.4, h: 3.0 }], kremlings: [13.4, 26.4], zingers: [[8.8, 4.2], [19.8, 4.6], [31.8, 4.2]], bananas: [2, 4, 6, 10, 16, 22, 23, 24, 29], gap: 3.0 });
  return { scene, cam: run.cam, update(t, u) { flagM.rotation.y = Math.sin(t * 4) * 0.2; run.update(t, u, 5); } };
});

// ----- 3 (10-15) 1996: lakeside boardwalk -----
defScene(10, 15, () => {
  const scene = newScene(); dayLight(scene, [[0, '#3a98e4'], [0.55, '#9ad2f6'], [1, '#e8f6ff']]); water(scene, 400, 300, 20, -2.5, -30, 0x2a98d8);
  box(110, 0.4, 7, 0x8a6a40, 20, -0.2, 0, scene); for (let x = -30; x < 70; x += 1.2) box(0.06, 0.05, 7, 0x5a3e20, x, 0.0, 0, scene); for (let x = -30; x < 70; x += 5) { box(0.5, 2.8, 0.5, 0x6a4a28, x, -1.6, 3.2, scene); box(0.5, 2.8, 0.5, 0x6a4a28, x, -1.6, -3.2, scene); box(0.3, 1.2, 0.3, 0x6a4a28, x, 0.6, 3.4, scene); }
  box(110, 0.14, 0.14, 0x6a4a28, 20, 1.2, 3.4, scene);
  const R = rng(3); for (let i = 0; i < 46; i++) { const p = new THREE.Group(); p.position.set(-30 + i * 2.8, -2, -22 - R() * 12); scene.add(p); box(0.7, 2, 0.7, 0x5a3a22, 0, 1, 0, p); for (let k = 0; k < 4; k++) box(4 - k * 0.9, 1.4, 4 - k * 0.9, 0x1f6a38, 0, 2.4 + k * 1.1, 0, p); p.scale.setScalar(1.3 + R() * 1.2); }
  for (const x of [14, 36]) { const fac = new THREE.Group(); fac.position.set(x, -2, -16); scene.add(fac); box(10, 8, 6, 0x6a7078, 0, 4, 0, fac); box(2.2, 20, 2.2, 0x8a9098, 3.5, 14, 0, fac); box(1.6, 1.4, 1.6, 0xd88a2a, 3.5, 24.4, 0, fac); box(7, 1, 1, 0x8a9098, -1, 21, 0, fac); box(1, 6, 1, 0xd88a2a, -3.5, 18, 0, fac); for (const xx of [-3, 0, 3]) box(0.9, 0.9, 0.3, plastic(0xffe090, { emissive: 0xffc040, emissiveIntensity: 0.8 }), xx, 5, 3.1, fac); }
  const smk = smokeField(scene, 6, 18, { x0: 15, x1: 18, z0: -16, z1: -14, y0: 22, y1: 24 }, 0xd8d8d8, { size: 7, rise: 2, opacity: 0.5, life: 7 }); tick(t => smk(t));
  for (const x of [6, 17, 28]) { barrel(scene, x, 0.2, 0.2, x); } for (const [x, w] of [[11, 2.5], [24, 2.2]]) box(w, 1.2, 2.2, 0x9a7a4a, x, 0.8, 0, scene);
  const run = runLevel(scene, { cast: [makeDixie(), makeKiddy()], jumps: [{ x: 6, len: 3.2, h: 2.4 }, { x: 11, len: 3.6, h: 3.0 }, { x: 17, len: 3.2, h: 2.4 }, { x: 24, len: 3.4, h: 3.0 }, { x: 28, len: 3.2, h: 2.4 }], kremlings: [], bananas: [1, 3, 8, 9, 14, 20, 21, 22, 31, 33], gap: 3.0, floor: 0.2 });
  return { scene, cam: run.cam, update(t, u) { run.update(t, u, 10); } };
});

// ----- 4 (15-20) 2010: volcano ruins with lava gaps -----
defScene(15, 20, () => {
  const scene = newScene(); scene.background = gradientSky([[0, '#4a3a8a'], [0.4, '#e8705a'], [0.75, '#ffb060'], [1, '#ffe0a0']]); scene.fog = new THREE.Fog(0xf0a070, 60, 260);
  scene.add(new THREE.HemisphereLight(0xffd8b0, 0x6a5040, 0.8)); sun(scene, 0xffa860, 2.2, V(30, 24, 40), V(0, 0, 0), 60); ground(scene, 0x3a2a24, 300).position.y = -4;
  const segs = [[-30, 14], [18.2, 30], [34.2, 70]]; groundSegs(scene, segs, 0x6a5a48, 0x4a3a30, 0, 10);
  const lm = new THREE.MeshStandardMaterial({ color: 0xff5010, emissive: 0xff5010, emissiveIntensity: 2.0 }); [[14, 18.2], [30, 34.2]].forEach(([a, b]) => { const l = box(b - a, 0.4, 10, lm, (a + b) / 2, -1.6, 0, scene); });
  const lava = new THREE.PointLight(0xff6a20, 3, 40); lava.position.set(16, 0.5, 4); scene.add(lava); const lava2 = lava.clone(); lava2.position.set(32, 0.5, 4); scene.add(lava2);
  const volc = new THREE.Mesh(new THREE.CylinderGeometry(6, 40, 50, 20), plastic(0x3a2a24, { roughness: 1 })); volc.position.set(28, 22, -50); scene.add(volc); const crater = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6, 2.4, 20), lm); crater.position.set(28, 47.6, -50); scene.add(crater);
  for (let i = 0; i < 5; i++) { const l = box(1.6, 22, 1.6, lm, 28 + Math.sin(i * 1.7) * 4, 36, -43 + i * 0.3, scene); l.rotation.z = 0.15 * Math.sin(i * 3); }
  const sm = smokeField(scene, 12, 24, { x0: 24, x1: 32, z0: -52, z1: -48, y0: 48, y1: 52 }, 0x3a3030, { size: 18, rise: 3, opacity: 0.55, life: 8 }); const emb = particleField(scene, 13, 280, { x0: -10, x1: 50, y0: 0, y1: 30, z0: -20, z1: 6 }, 0xff9040, 0.4, { vy: 3, drift: 2, additive: true, opacity: 0.9 }); tick(t => { sm(t); emb(t); });
  function tiki(x, z, s) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); [0x7a3a1a, 0x9a4a22, 0x6a3014].forEach((c, i) => { box(2, 2.2, 2, c, 0, 1.1 + i * 2.2, 0, g); for (const sx of [-0.4, 0.4]) box(0.6, 0.4, 0.1, plastic(0xffd840, { emissive: 0xffa020, emissiveIntensity: 1.2 }), sx, 1.4 + i * 2.2, 1.05, g); box(1.0, 0.3, 0.1, 0x2a1008, 0, 0.7 + i * 2.2, 1.05, g); }); box(2.6, 0.6, 2.6, 0xd83a2a, 0, 7.0, 0, g); }
  tiki(6, -3, 1.2); tiki(22, -4, 1.4); tiki(40, -3, 1.2); for (let i = 0; i < 14; i++) { const r = box(2.4, 1.2 + (i % 3) * 0.5, 2, 0x5a4a3a, -26 + i * 6, 0.6, -6 - (i % 3) * 2, scene); r.rotation.y = i; }
  for (const x of [10, 26, 44]) palm(scene, x, -7, 1.2, 0.1);
  const run = runLevel(scene, { cast: [makeDK(), makeDiddy()], jumps: [{ x: 16.1, len: 6.2, h: 3.4 }, { x: 32.1, len: 6.2, h: 3.4 }, { x: 5.5, len: 3.0, h: 2.0 }, { x: 25, len: 2.8, h: 2.0 }], kremlings: [], bananas: [2, 4, 9, 15, 16, 17, 22, 31, 32, 33, 38], gap: 2.6 });
  return { scene, cam: run.cam, update(t, u) { run.update(t, u, 15); } };
});

// ----- 5 (20-25) 2014: frozen peaks with icy gaps -----
defScene(20, 25, () => {
  const scene = newScene(); scene.background = gradientSky([[0, '#8ac4f0'], [0.5, '#d4ecfc'], [1, '#ffffff']]); scene.fog = new THREE.Fog(0xe0f2fc, 50, 220);
  scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x9ab8d0, 0.45)); sun(scene, 0xfff4e0, 1.5, V(-20, 50, 30), V(0, 0, 0), 50); ground(scene, 0x2a6aa8, 300).position.y = -4;
  groundSegs(scene, [[-30, 12], [16.4, 28], [32.4, 70]], 0xf4f8fc, 0xa8dcf4, 0, 10);
  const R = rng(5); const ice = plastic(0xa8dcf4, { roughness: 0.1, emissive: 0x4a98c8, emissiveIntensity: 0.25 });
  for (let i = 0; i < 30; i++) { const h = 2 + R() * 6, b = box(1.5 + R() * 2, h, 1.5 + R() * 2, ice, -24 + i * 3.4 + R() * 2, h / 2 - 0.2, -5 - R() * 10, scene); b.rotation.y = R(); }
  for (let i = 0; i < 8; i++) { const m = box(36, 24 + i * 3, 26, 0xd0e8f8, -40 + i * 20, 12, -60, scene); m.rotation.y = 0.78; }
  for (let i = 0; i < 20; i++) { const p = new THREE.Group(); p.position.set(-24 + i * 3.5, 0, -8 - R() * 8); scene.add(p); box(0.5, 1.2, 0.5, 0x5a3a22, 0, 0.6, 0, p); for (let k = 0; k < 4; k++) { box(2.8 - k * 0.6, 0.9, 2.8 - k * 0.6, 0x1f6a44, 0, 1.4 + k * 0.85, 0, p); box(2.6 - k * 0.6, 0.2, 2.6 - k * 0.6, 0xf8fcff, 0, 1.86 + k * 0.85, 0, p); } p.scale.setScalar(1.4 + R()); }
  const water_ = new THREE.MeshStandardMaterial({ color: 0x2a8ad8, roughness: 0.1, emissive: 0x1a5aa0, emissiveIntensity: 0.5 }); [[12, 16.4], [28, 32.4]].forEach(([a, b]) => box(b - a, 0.3, 10, water_, (a + b) / 2, -1.4, 0, scene));
  const wal = [makeWalrus(), makeWalrus()]; wal.forEach((w, i) => { w.scale.setScalar(0.9); w.rotation.y = -Math.PI / 2; w.position.set(i ? 36 : 22, 0, 0); scene.add(w); });
  const pens = []; for (let i = 0; i < 5; i++) { const p = makePenguin(); p.position.set(4 + i * 7, 0, -3 - (i % 2) * 2); p.scale.setScalar(1.3); scene.add(p); pens.push(p); }
  const snow = particleField(scene, 17, 900, { x0: -10, x1: 50, y0: 0, y1: 22, z0: -12, z1: 12 }, 0xffffff, 0.2, { vy: -2, drift: 2, vx: 1.5, opacity: 0.95 }); tick(t => snow(t));
  const run = runLevel(scene, { cast: [makeDK(), makeDiddy(), makeDixie()], jumps: [{ x: 14.2, len: 6.0, h: 3.4 }, { x: 30.2, len: 6.0, h: 3.4 }, { x: 5, len: 3.0, h: 2.0 }, { x: 22.6, len: 3.2, h: 2.4 }], kremlings: [], bananas: [2, 3, 8, 13, 14, 15, 20, 29, 30, 31, 36], gap: 2.8 });
  return { scene, cam: run.cam, update(t, u) { const X = run.update(t, u, 20); wal.forEach((w, i) => { w.position.x = (i ? 36 : 22) - Math.max(0, t - 20) * 1.2; w.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.25; }); pens.forEach((p, i) => { p.rotation.z = Math.sin(t * 8 + i) * 0.15; }); } };
});

// ----- 6 (25-30) the whole crew + K-O-N-G, then the title -----
defScene(25, 30, () => {
  const scene = newScene(); dayLight(scene, sunnySky); ground(scene, 0x4a9a3a, 300);
  const R = rng(61); for (let i = 0; i < 16; i++) palm(scene, (i % 2 ? 1 : -1) * (14 + R() * 20), -8 - i * 4, 1.2 + R() * 0.6, (i % 2 ? -1 : 1) * 0.1);
  for (let i = 0; i < 14; i++) bush(scene, (R() - 0.5) * 60, -4 - R() * 40, 1 + R(), [0x2e8a30, 0x3a9a34][i % 2]); box(14, 1.0, 12, 0x6a8a3a, 0, 0.5, 2, scene);
  const crew = { dk: makeDK(), diddy: makeDiddy(), dixie: makeDixie(), cranky: makeCranky(), funky: makeFunky() };
  const place = { dk: [0, 2.2, 4, 0], diddy: [-4.2, 1.6, 4.6, 0.2], dixie: [4.4, 1.6, 4.4, -0.2], cranky: [-5.8, 1.1, 0.8, 0.5], funky: [6.0, 1.1, 0.8, -0.5] };
  Object.entries(crew).forEach(([k, a]) => { a.position.set(place[k][0], place[k][1], place[k][2]); a.rotation.y = place[k][3]; scene.add(a); });
  const letters = []; ['K', 'O', 'N', 'G'].forEach((ch, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: letterTex(ch), transparent: true, depthWrite: false, fog: false })); scene.add(m); letters.push(m); });
  const bun = []; for (let i = 0; i < 10; i++) { const b = bananas(1.8); scene.add(b); b.userData = [(R() - 0.5) * 22, 4 + R() * 5.5, R() * 6, R() * 6]; bun.push(b); }
  const sparkle = particleField(scene, 19, 200, { x0: -12, x1: 12, y0: 1, y1: 16, z0: 0, z1: 10 }, 0xffe890, 0.3, { vy: 0.6, drift: 1.5, additive: true, opacity: 0.9 }); tick(t => sparkle(t));
  const cam = camera(52);
  return { scene, cam, update(t, u) {
    const lt = t - 25; Object.values(crew).forEach((a, i) => { const j = Math.abs(Math.sin(t * 3.2 + i * 0.9)), base = Object.keys(crew)[i]; a.position.y = place[base][1] + j * 1.4; a.userData.arms.forEach((m, k) => m.rotation.set(-2.8 + Math.sin(t * 6 + k + i) * 0.25, 0, (k ? -1 : 1) * 0.6)); a.userData.legs.forEach((l, k) => l.rotation.x = -0.4 * j * (k ? 1 : -1)); });
    crew.dixie.userData.ponySegs.forEach((s, i) => s.rotation.x = Math.sin(t * 6 - i * 0.6) * 0.4);
    bun.forEach(b => { const q = b.userData; b.position.set(q[0], q[1] + Math.sin(t * 1.2 + q[3]) * 0.6, q[2]); b.rotation.y = t * 1.2 + q[3]; });
    letters.forEach((m, i) => { const at = 0.15 + i * 0.3, k = ease((lt - at) / 0.35), out = 1 - ease((lt - 1.35) / 0.4), pop = 1 + 0.25 * Math.max(0, 1 - (lt - at - 0.35) * 3); m.visible = k > 0 && out > 0; m.scale.setScalar(Math.max(0.01, k * out) * pop); m.position.set((i - 1.5) * 3.0, 12.5 + Math.sin(t * 2 + i) * 0.35, 1.5); m.lookAt(cam.position); });
    const d = ease(lt / 5); lookFrom(cam, V(lerp(1, 0, d), lerp(5.6, 10, d), lerp(26, 38, d)), V(0, lerp(6.2, 8.2, d), 2));
  } };
});
