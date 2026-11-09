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

// ----- 1 (0-5) 1994: mine cart ride through a lantern-lit mine -----
defScene(0, 5, () => {
  const scene = newScene(); scene.background = new THREE.Color(0x0e0a07); scene.fog = new THREE.Fog(0x140e0a, 20, 70);
  scene.add(new THREE.HemisphereLight(0x9a7a5a, 0x1a1008, 0.5)); const key = new THREE.DirectionalLight(0xffd8a0, 0.7); key.position.set(10, 20, 20); scene.add(key);
  const R = rng(7);
  for (let i = 0; i < 44; i++) box(4 + R() * 3, 8 + R() * 10, 3, [0x3a2a1e, 0x4a3424, 0x2e2218][i % 3], -30 + i * 2.4, 2 + R() * 4, -9 - R() * 3, scene);
  for (let i = 0; i < 34; i++) box(4, 3 + R() * 4, 12, [0x2e2218, 0x3a2a1e][i % 2], -30 + i * 3.0, 15 + R() * 2, -2, scene);
  box(150, 2, 24, 0x120c08, 20, -10, 0, scene);
  const segs = [[-30, 9], [15, 25], [31, 70]];
  segs.forEach(([a, b]) => { for (const dz of [-0.55, 0.55]) box(b - a, 0.16, 0.16, 0x9a9aa4, (a + b) / 2, 0.2, dz, scene); for (let x = a; x <= b; x += 1.2) box(0.3, 0.14, 1.7, 0x6a4a28, x, 0.06, 0, scene);
    for (let x = a + 1; x <= b; x += 4) { box(0.4, 9, 0.4, 0x5a3a20, x, -4.6, -0.8, scene); box(0.4, 9, 0.4, 0x5a3a20, x, -4.6, 0.8, scene); box(0.25, 0.25, 2.0, 0x5a3a20, x, -2.5, 0, scene).rotation.x = 0.6; } });
  for (let x = -28; x < 70; x += 8) { box(0.7, 14, 0.7, 0x6a4a28, x, 6, -4, scene); box(0.7, 0.7, 6, 0x6a4a28, x, 12.6, -1.5, scene); }
  const lanterns = []; for (let x = -24; x < 70; x += 10) { const g = new THREE.Group(); g.position.set(x, 9.6, -3.4); scene.add(g); box(0.06, 2.4, 0.06, 0x222222, 0, 1.2, 0, g);
    box(0.7, 0.9, 0.7, new THREE.MeshStandardMaterial({ color: 0xffb040, emissive: 0xff9020, emissiveIntensity: 2.2 }), 0, -0.2, 0, g); box(0.9, 0.16, 0.9, 0x2a2a2a, 0, 0.32, 0, g); lanterns.push(g); }
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffa040, 2.2, 22); l.position.set(-14 + i * 14, 8.5, -1); scene.add(l); }
  const c = cart(0x8a6a4a); c.scale.setScalar(1.25); scene.add(c); const dk = makeDK(), diddy = makeDiddy(); dk.scale.setScalar(0.5); diddy.scale.setScalar(0.38); c.add(dk, diddy);
  dk.position.set(-0.45, 1.0, 0); diddy.position.set(0.75, 1.0, 0.1); dk.rotation.y = diddy.rotation.y = Math.PI / 2;
  const ec = cart(0x5a5a64); ec.scale.setScalar(1.25); scene.add(ec); const krem = makeKremling(); krem.scale.setScalar(0.55); krem.position.y = 1.0; krem.rotation.y = Math.PI / 2; ec.add(krem);
  const jumps = [{ x: 12, len: 7.5, h: 3.4 }, { x: 22.0, len: 4.0, h: 2.6 }, { x: 28, len: 7.5, h: 3.4 }];
  const jumpY = x => { let y = 0; for (const j of jumps) { const d = (x - j.x) / (j.len / 2); if (Math.abs(d) < 1) y += j.h * (1 - d * d); } return y; };
  const items = []; [2, 4, 9, 11, 12, 13, 18, 27, 28, 29, 34].forEach(x => { const b = bananas(0.9); scene.add(b); items.push([b, x, 2.6 + jumpY(x)]); });
  const sparks = particleField(scene, 9, 60, { x0: -1, x1: 1, y0: 0, y1: 0.8, z0: -0.6, z1: 0.6 }, 0xffc060, 0.16, { vy: 2.5, drift: 0.6, additive: true, opacity: 0.9 });
  const sparkG = scene.children[scene.children.length - 1];
  const cam = camera(52);
  return { scene, cam, update(t, u) {
    sparks(t); const lt = t, X = X0 + SPEED * lt, y = jumpY(X), air = y > 0.15;
    c.position.set(X, y + (air ? 0 : Math.abs(Math.sin(t * 15)) * 0.06), 0); c.rotation.z = air ? (jumps.some(j => X < j.x) ? 0.12 : -0.12) * Math.min(1, y) : Math.sin(t * 15) * 0.02;
    sparkG.position.set(X - 1.2, y, 0); sparkG.visible = !air;
    [dk, diddy].forEach((f, i) => { const U = f.userData; U.arms.forEach((a, k) => a.rotation.set(air ? -2.8 : -1.2 + Math.sin(t * 9 + k) * 0.2, 0, (k ? -1 : 1) * 0.3)); U.legs.forEach(l => l.rotation.x = -1.3); });
    const EX = 15.5 + 2.6 * lt, hit = X > EX - 0.2; ec.position.set(EX, Math.abs(Math.sin(t * 14)) * 0.05, 0); krem.scale.y = hit ? 0.12 : 0.55; krem.visible = X < EX + 2.5;
    items.forEach(([b, x, yy]) => { b.visible = X < x - 0.6; b.position.set(x, yy + Math.sin(t * 3 + x) * 0.15, 0); b.rotation.y = t * 2; });
    lookFrom(cam, V(X + 2.2, 4.4, 21), V(X + 2.2, 2.2, 0));
  } };
});

// ----- 2 (5-10) 1995: bramble flight on Squawks at dusk -----
function makeParrot() { const g = new THREE.Group(), G = plastic(0x3ab048), G2 = plastic(0x2a8a38), Y = plastic(0xf2c020);
  box(1.6, 1.4, 2.4, G, 0, 0, 0, g); box(1.2, 1.1, 0.2, plastic(0xf2e070), 0, -0.1, 1.2, g); const h = new THREE.Group(); h.position.set(0, 1.0, 1.0); g.add(h); box(1.3, 1.2, 1.3, G, 0, 0, 0, h);
  box(0.6, 0.5, 0.8, Y, 0, -0.15, 0.9, h); box(0.4, 0.3, 0.4, Y, 0, -0.45, 0.85, h); for (const s of [-1, 1]) { box(0.34, 0.36, 0.08, plastic(0xffffff), s * 0.38, 0.2, 0.66, h); box(0.14, 0.18, 0.08, plastic(0x0a0a0a), s * 0.38, 0.2, 0.7, h); }
  box(0.3, 0.6, 0.3, plastic(0xe8402a), 0, 0.8, -0.1, h); for (let i = 0; i < 3; i++) box(0.4, 0.14, 1.6 - i * 0.3, i % 2 ? G2 : G, (i - 1) * 0.3, -0.3, -1.9, g);
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(s * 0.8, 0.3, 0); g.add(w); box(2.2, 0.16, 1.4, G, s * 1.1, 0, 0, w); box(1.4, 0.14, 1.0, plastic(0x2a6ad8), s * 2.4, 0, -0.1, w); box(0.9, 0.12, 0.8, plastic(0xe8402a), s * 3.1, 0, -0.1, w); return w; });
  for (const s of [-1, 1]) box(0.24, 0.6, 0.24, Y, s * 0.4, -0.9, 0.2, g); g.userData = { wings, head: h }; return g; }
function vine(scene, x, y, z, len, rz, seed) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rz; scene.add(g); const R = rng(seed);
  box(0.7, len, 0.7, [0x3a4a1e, 0x4a3a1e, 0x2e3e18][seed % 3], 0, 0, 0, g); for (let k = -len / 2; k < len / 2; k += 0.55) { const th = box(0.12, 0.55, 0.12, 0x6a4a28, (R() < 0.5 ? -1 : 1) * 0.42, k, (R() - 0.5) * 0.6, g); th.rotation.z = (th.position.x > 0 ? -1 : 1) * 1.1; } return g; }
defScene(5, 10, () => {
  const scene = newScene(); scene.background = gradientSky([[0, '#140c34'], [0.45, '#5a2e6a'], [0.75, '#d8706a'], [1, '#ffc890']]); scene.fog = new THREE.Fog(0x4a2a5a, 25, 90);
  scene.add(new THREE.HemisphereLight(0xd8a0c8, 0x1a1a2a, 0.65)); const key = new THREE.DirectionalLight(0xffc0a0, 1.0); key.position.set(-10, 20, 25); scene.add(key);
  const stars = particleField(scene, 4, 300, { x0: -30, x1: 80, y0: 14, y1: 40, z0: -40, z1: -30 }, 0xffffff, 0.3, { additive: true, opacity: 0.9 }); tick(t => stars(t));
  let sd = 0; for (let x = -30; x < 70; x += 2.2) { sd++; vine(scene, x, 13.5 + Math.sin(x * 0.4) * 1.5, 0, 9, Math.sin(x) * 0.5, sd); vine(scene, x + 1.1, -2.5 + Math.sin(x * 0.3) * 1.2, 0, 8, Math.cos(x) * 0.5, sd + 1); }
  for (let x = -30; x < 70; x += 1.6) { sd++; vine(scene, x, 6 + Math.sin(x * 0.7) * 6, -5 - (sd % 3), 14, Math.sin(x * 1.3) * 0.9, sd); }
  for (const x of [14, 33]) { sd++; vine(scene, x, 11, 0, 5, 0.4, sd); } for (const x of [24, 42]) { sd++; vine(scene, x, 0.6, 0, 5, -0.4, sd); }
  const parrot = makeParrot(); parrot.rotation.y = Math.PI / 2; parrot.scale.setScalar(1.15); scene.add(parrot); const diddy = makeDiddy(); diddy.scale.setScalar(0.42); diddy.rotation.y = Math.PI / 2; scene.add(diddy);
  const zs = [[12, 3.0], [20, 8.4], [29, 3.4], [38, 8.0]].map(([x, y]) => { const z = makeZinger(); z.rotation.y = -Math.PI / 2; z.scale.setScalar(0.9); scene.add(z); return [z, x, y]; });
  const path = x => 5.6 + Math.sin((x + 6) * 0.42) * 2.2; const items = []; [0, 2, 4, 8, 10, 16, 18, 24, 26, 34, 36].forEach(x => { const b = bananas(0.9); scene.add(b); items.push([b, x, path(x) + 0.2]); });
  const cam = camera(52);
  return { scene, cam, update(t, u) {
    const lt = t - 5, X = X0 + SPEED * lt, y = path(X); parrot.position.set(X, y + 1.8, 0); parrot.rotation.z = Math.cos((X + 6) * 0.42) * 0.25; parrot.userData.wings.forEach((w, k) => w.rotation.z = (k ? -1 : 1) * Math.sin(t * 16) * 0.7);
    diddy.position.set(X + 0.1, y - 0.6, 0); diddy.userData.arms.forEach(a => a.rotation.set(-3.0, 0, 0)); diddy.userData.legs.forEach((l, k) => l.rotation.x = Math.sin(t * 6 + k * 3) * 0.4);
    zs.forEach(([z, x, yy], i) => { z.position.set(x + Math.sin(t * 1.4 + i) * 0.6, yy + Math.sin(t * 3 + i) * 0.5, 0); z.userData.wings.forEach((w, k) => w.rotation.z = Math.sin(t * 40) * 0.5 * (k ? -1 : 1)); });
    items.forEach(([b, x, yy]) => { b.visible = X < x - 0.6; b.position.set(x, yy + Math.sin(t * 3 + x) * 0.15, 0); b.rotation.y = t * 2; });
    lookFrom(cam, V(X + 2.0, 6.4, 24), V(X + 2.0, 5.6, 0));
  } };
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

// ----- 4 (15-20) 2010: sunset silhouette shore -----
const sunsetTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, '#6a1a2a'); g.addColorStop(0.3, '#e8501e'); g.addColorStop(0.55, '#ff9a2a'); g.addColorStop(0.72, '#ffd060'); g.addColorStop(1, '#ffb040'); x.fillStyle = g; x.fillRect(0, 0, 512, 1024);
  const sg = x.createRadialGradient(256, 420, 30, 256, 420, 260); sg.addColorStop(0, 'rgba(255,250,220,1)'); sg.addColorStop(0.42, 'rgba(255,240,170,1)'); sg.addColorStop(0.47, 'rgba(255,200,90,.6)'); sg.addColorStop(1, 'rgba(255,170,60,0)'); x.fillStyle = sg; x.fillRect(0, 100, 512, 700);
  x.fillStyle = 'rgba(140,40,30,.55)'; for (const [yy, h] of [[330, 10], [370, 6], [470, 8], [510, 5]]) x.fillRect(0, yy, 512, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
defScene(15, 20, () => {
  const scene = newScene(); scene.background = sunsetTex;
  const segs = [[-30, 12], [17, 30], [35, 70]]; groundSegs(scene, segs, 0, 0, 0, 10); box(160, 1, 30, 0, 20, -6, -8, scene);
  for (let i = 0; i < 9; i++) palm(scene, -26 + i * 11, -24 - (i % 2) * 4, 1.1 + (i % 2) * 0.3, (i % 2 ? -1 : 1) * 0.2); box(160, 1, 20, 0, 20, -4.5, 0, scene); box(160, 9, 1, 0, 20, -4.0, -6, scene);
  for (let i = 0; i < 9; i++) box(3 + (i % 3), 1.4 + (i % 2), 2, 0, -22 + i * 10, 0.6, -1.5, scene);
  for (const x of [-20, 6, 40]) { const h = box(30, 6 + (x % 3), 20, 0, x, -1, -30, scene); h.rotation.z = 0.08; }
  const crabs = [5, 24, 41].map(x => { const g = new THREE.Group(); box(1.4, 0.7, 1.0, 0, 0, 0.6, 0, g); for (const s of [-1, 1]) { box(0.5, 0.4, 0.4, 0, s * 1.0, 1.0, 0.2, g); box(0.1, 0.4, 0.1, 0, s * 0.3, 1.1, 0.2, g); } scene.add(g); return [g, x]; });
  const run = runLevel(scene, { cast: [makeDK(), makeDiddy()], jumps: [{ x: 14.5, len: 7, h: 3.6 }, { x: 32.5, len: 7, h: 3.6 }, { x: 5, len: 3.0, h: 2.2 }, { x: 24, len: 3.0, h: 2.2 }], kremlings: [], bananas: [1, 3, 9, 13, 14, 15, 20, 31, 32, 33, 38], gap: 2.8, camZ: 22, camY: 4.0, lookY: 4.3 });
  const black = new THREE.MeshBasicMaterial({ color: 0x080404 }); scene.traverse(o => { if (o.isMesh) o.material = black; });
  return { scene, cam: run.cam, update(t, u) { run.update(t, u, 15); crabs.forEach(([g, x], i) => { g.position.set(x + Math.sin(t * 2 + i) * 0.8, 0.0, 0); }); } };
});

function makePenguin() { const g = new THREE.Group(), K = plastic(0x15151c), W = plastic(0xf4f4f8), O = plastic(0xf08a1a);
  box(1.2, 1.5, 1.0, K, 0, 1.0, 0, g); box(0.85, 1.15, 0.12, W, 0, 0.95, 0.5, g); const h = box(0.95, 0.8, 0.9, K, 0, 2.1, 0.05, g);
  for (const sd of [-1, 1]) { box(0.28, 0.3, 0.06, W, sd * 0.22, 2.2, 0.5, g); box(0.12, 0.16, 0.06, K, sd * 0.22, 2.2, 0.53, g); const w = box(0.18, 1.0, 0.6, K, sd * 0.68, 1.1, 0, g); w.rotation.z = sd * 0.3; box(0.42, 0.14, 0.6, O, sd * 0.28, 0.08, 0.2, g); }
  box(0.36, 0.22, 0.44, O, 0, 2.0, 0.64, g); box(1.0, 0.24, 0.2, plastic(0x2a6ad8), 0, 1.65, 0.5, g); return g; }
// ----- 5 (20-25) 2014: frozen peaks with icy gaps -----
defScene(20, 25, () => {
  const scene = newScene(); scene.background = gradientSky([[0, '#3a7ac8'], [0.55, '#8ac0ec'], [1, '#d8eefc']]); scene.fog = new THREE.Fog(0xb8daf4, 70, 260);
  scene.add(new THREE.HemisphereLight(0xd8ecff, 0x6a8ab0, 0.4)); sun(scene, 0xfff0d8, 1.6, V(-20, 40, 40), V(0, 0, 0), 50); ground(scene, 0x1a5a98, 300).position.y = -4;
  groundSegs(scene, [[-30, 12], [16.4, 28], [32.4, 70]], 0xdfeaf4, 0x7ab8e0, 0, 10);
  const R = rng(5); const ice = plastic(0x8ac8ec, { roughness: 0.15, emissive: 0x2a6898, emissiveIntensity: 0.15 });
  for (let i = 0; i < 30; i++) { const h = 2 + R() * 6, b = box(1.5 + R() * 2, h, 1.5 + R() * 2, ice, -24 + i * 3.4 + R() * 2, h / 2 - 0.2, -9 - R() * 10, scene); b.rotation.y = R(); }
  for (let i = 0; i < 8; i++) { const m = box(36, 24 + i * 3, 26, 0xb8d4ec, -40 + i * 20, 12, -60, scene); m.rotation.y = 0.78; }
  for (let i = 0; i < 20; i++) { const p = new THREE.Group(); p.position.set(-24 + i * 3.5, 0, -8 - R() * 8); scene.add(p); box(0.5, 1.2, 0.5, 0x5a3a22, 0, 0.6, 0, p); for (let k = 0; k < 4; k++) { box(2.8 - k * 0.6, 0.9, 2.8 - k * 0.6, 0x1f6a44, 0, 1.4 + k * 0.85, 0, p); box(2.6 - k * 0.6, 0.2, 2.6 - k * 0.6, 0xf8fcff, 0, 1.86 + k * 0.85, 0, p); } p.scale.setScalar(1.4 + R()); }
  const water_ = new THREE.MeshStandardMaterial({ color: 0x2a8ad8, roughness: 0.1, emissive: 0x1a5aa0, emissiveIntensity: 0.5 }); [[12, 16.4], [28, 32.4]].forEach(([a, b]) => box(b - a, 0.3, 10, water_, (a + b) / 2, -1.4, 0, scene));
  const wal = [makeWalrus(), makeWalrus()]; wal.forEach((w, i) => { w.scale.setScalar(i ? 1.0 : 0.8); w.rotation.y = -Math.PI / 2; scene.add(w); });
  const pens = []; for (let i = 0; i < 4; i++) { const p = makePenguin(); p.position.set(2 + i * 9, 0, -3.5 - (i % 2) * 1.5); p.scale.setScalar(1.1); p.rotation.y = -0.4; scene.add(p); pens.push(p); }
  const snow = particleField(scene, 17, 900, { x0: -10, x1: 50, y0: 0, y1: 22, z0: -12, z1: 12 }, 0xffffff, 0.2, { vy: -2, drift: 2, vx: 1.5, opacity: 0.95 }); tick(t => snow(t));
  const run = runLevel(scene, { cast: [makeDK(), makeDiddy(), makeDixie()], jumps: [{ x: 14.2, len: 6.0, h: 3.4 }, { x: 30.2, len: 6.0, h: 3.4 }, { x: 5, len: 3.0, h: 2.0 }, { x: 22.4, len: 3.4, h: 3.0 }], kremlings: [], bananas: [2, 3, 8, 13, 14, 15, 20, 29, 30, 31, 36], gap: 2.8, camZ: 22, camY: 5.0, lookY: 3.6 });
  return { scene, cam: run.cam, update(t, u) { const X = run.update(t, u, 20); const lt = t - 20, wx = 27.0 - 1.2 * lt, hit = X > wx + 0.3; wal[0].position.set(wx, hit ? 0 : Math.abs(Math.sin(t * 5)) * 0.25, 0); wal[0].scale.y = hit ? Math.max(0.12, 0.8 - (X - wx - 0.3) * 4) : 0.8; wal[0].visible = X < wx + 2.0;
    wal[1].position.set(40.5, Math.abs(Math.sin(t * 3)) * 0.2, 0); wal[1].rotation.z = Math.sin(t * 6) * 0.06;
    pens.forEach((p, i) => { p.rotation.z = Math.sin(t * 8 + i) * 0.12; p.position.y = Math.abs(Math.sin(t * 6 + i)) * 0.2; }); } };
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
