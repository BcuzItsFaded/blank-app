"use strict";
// Mega Man memory lane: brick-built Blue Bomber, Mets, Robot Masters and six eras (1987-2018). Original brick interpretation, 30 s.
const BLUE = 0x2a6ad8, BLUE2 = 0x1a4aa8, VISOR = 0x6ae8ff, WHITE = 0xf4f4f4;
const glowM = (c, k = 2) => plastic(c, { emissive: c, emissiveIntensity: k, roughness: 0.3 });
const SPEED = 8, X0 = -6;

// Blue Bomber: helmet + glowing visor, white buster cannon on the right arm (charging glow via muzMat).
function bomber(scale = 0.9, armor = BLUE, pants = BLUE2) {
  const f = figure({ shirt: armor, pants, skin: 0xf0d0a8, hair: armor, hairStyle: 'short', scale });
  const h = f.userData.head;
  box(1.0, 0.44, 1.0, armor, 0, 0.98, -0.02, h);      // helmet crown
  box(0.9, 0.5, 0.22, armor, 0, 0.78, -0.44, h);      // helmet back
  box(0.74, 0.2, 0.08, VISOR, 0, 0.54, 0.5, h);       // glowing visor
  box(0.5, 0.12, 0.1, WHITE, 0, 0.36, 0.5, h);        // chin trim
  box(0.44, 0.44, 0.95, WHITE, 0, -1.25, 0.48, f.userData.armR);   // buster cannon
  const mm = new THREE.MeshStandardMaterial({ color: VISOR, emissive: VISOR, emissiveIntensity: 1.5 });
  const muz = new THREE.Mesh(boxGeo, mm); muz.scale.set(0.3, 0.3, 0.12); muz.position.set(0, -1.25, 0.98); f.userData.armR.add(muz);
  f.userData.muzMat = mm; f.userData.muz = muz; return f;
}
function met() {                       // Met: yellow hard hat, peeking eye
  const g = new THREE.Group(), Y = plastic(0xf2c020, { roughness: 0.5 });
  box(1.1, 0.6, 1.1, Y, 0, 0.45, 0, g); box(1.5, 0.14, 1.5, Y, 0, 0.14, 0, g);
  box(0.62, 0.14, 0.08, 0x1a1a1a, 0, 0.36, 0.58, g); box(0.26, 0.2, 0.08, 0xffffff, 0.12, 0.36, 0.6, g); return g;
}
function bot(col = 0xc83a2a, eye = 0xffe040) {        // Robot Master: blocky boss bot with a glowing visor
  const g = new THREE.Group(), M = plastic(col, { metalness: 0.3, roughness: 0.4 });
  box(1.6, 1.9, 1.3, M, 0, 1.3, 0, g); box(1.2, 1.0, 1.1, M, 0, 3.1, 0, g); box(0.95, 0.26, 0.08, glowM(eye, 2), 0, 3.15, 0.58, g);
  box(0.5, 1.5, 0.5, M, -1.2, 1.4, 0, g); box(0.5, 1.5, 0.5, M, 1.2, 1.4, 0, g); box(1.7, 0.4, 1.4, 0x3a3a48, 0, 0.2, 0, g); return g;
}
function gear(scene, x, y, z, r, n, col) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.5, 20), plastic(col, { metalness: 0.4, roughness: 0.5 })); body.rotation.x = Math.PI / 2; g.add(body);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const t = box(0.45, 0.6, 0.36, col, Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, 0, g); t.rotation.z = a; }
  return g;
}
function ground2(scene, segs, top, side, depth = 12) {
  segs.forEach(([a, b]) => { box(b - a, 1.2, depth, side, (a + b) / 2, -0.6, 0, scene); box(b - a, 0.22, depth, top, (a + b) / 2, 0.11, 0, scene); });
}
// Side-scrolling run: the hero runs right, jumps the gaps, fires the buster every 0.5 s; foes fall when passed.
function runner(scene, o) {
  const hero = bomber(1.15, o.armor || BLUE, o.pants || BLUE2); scene.add(hero);
  const jumps = o.jumps || [];
  const jy = x => { let y = 0; for (const j of jumps) { const d = (x - j.x) / (j.len / 2); if (Math.abs(d) < 1) y += j.h * (1 - d * d); } return y; };
  const foes = (o.foes || []).map(([x, kind, col]) => { const g = kind === 'bot' ? bot(col || 0xc83a2a, o.eye || 0xffe040) : met(); g.position.set(x, 0.11, 0); g.rotation.y = -Math.PI / 2; scene.add(g); return { g, x, kind }; });
  const bm = glowM(VISOR, 3), bolts = [];
  for (let k = 0; k < 44; k++) { const m = new THREE.Mesh(boxGeo, bm); m.scale.set(0.9, 0.16, 0.16); m.visible = false; scene.add(m); bolts.push(m); }
  return { hero, update(t, lt) {
    const X = X0 + SPEED * lt, y = jy(X), air = y > 0.15, U = hero.userData;
    hero.position.set(X, 0.11 + y + (air ? 0 : Math.abs(Math.sin(t * 12)) * 0.1), 0); hero.rotation.y = Math.PI / 2;
    if (air) [U.legL, U.legR].forEach((l, k) => { l.rotation.x = k ? 0.5 : -0.9; }); else walkCycle(hero, t, 12, 0.8);
    U.armR.rotation.x = -1.45 + 0.04 * Math.sin(t * 20);
    U.armL.rotation.x = air ? -2.2 : -0.3;
    U.head.rotation.y = Math.sin(t * 1.3) * 0.1;
    foes.forEach(f => { const k = clamp((X - (f.x - 1.2)) / 0.8, 0, 1); f.g.rotation.z = -ease(k) * (f.kind === 'met' ? 1.5 : 0.35); });
    bolts.forEach((m, k) => {
      const tf = 0.25 + k * 0.5, age = lt - tf;
      if (age < 0 || age > 1.0) { m.visible = false; return; }
      const sx = X0 + SPEED * tf;
      m.visible = true; m.position.set(sx + 1.6 + age * 26, 0.11 + jy(sx) + 1.6, 0);
    });
    return X;
  } };
}
function levelScene(start, end, cfg) {
  return defScene(start, end, () => {
    const scene = newScene();
    scene.background = gradientSky(cfg.sky); scene.fog = new THREE.Fog(cfg.fog, 60, 240);
    scene.add(new THREE.HemisphereLight(cfg.hemi ?? 0xdde8ff, 0x303848, cfg.hemiI ?? 0.7));
    sun(scene, cfg.sun ?? 0xfff0d8, cfg.sunI ?? 1.8, V(-30, 60, 40), V(0, 0, 0), 60);
    ground2(scene, cfg.segs, cfg.top, cfg.side);
    if (cfg.setup) cfg.setup(scene);
    const r = runner(scene, cfg);
    const cam = camera(52);
    return { scene, cam, update(t) {
      const lt = t - start, X = X0 + SPEED * lt; r.update(t, lt);
      lookFrom(cam, V(X + 2, 4.2, 15), V(X + 2, 3.0, 0));
    } };
  });
}

// 1 (0-4.3) 1987: the original Mega Man, blue sky, clouds, Mets in the way
levelScene(0, 4.3, { sky: [[0, '#16205a'], [0.6, '#4a72c8'], [1, '#9ac0f0']], fog: 0x6a8ad8, hemi: 0xc8dcff,
  segs: [[-30, 10], [16, 28], [34, 70]], top: 0x4aa03a, side: 0x6a4a28,
  jumps: [{ x: 13, len: 6, h: 3.2 }, { x: 31, len: 6, h: 3.2 }], foes: [[5, 'met'], [22, 'met']],
  setup: sc => { for (let i = 0; i < 12; i++) box(5 + (i % 3) * 2, 1.6 + (i % 2), 2, 0xeef4ff, -26 + i * 6.2, 9 + (i % 3) * 1.2, -20, sc); } });

// 2 (4.3-8.6) 1988: Mega Man 2, the boss hall with Robot Masters on the far platforms
levelScene(4.3, 8.6, { sky: [[0, '#1a0a2a'], [0.6, '#4a2a6a'], [1, '#a06ab0']], fog: 0x4a2a6a, hemi: 0xb8a0e0,
  segs: [[-30, 9], [15, 27], [33, 70]], top: 0x6a5a8a, side: 0x3a2a4a,
  jumps: [{ x: 12, len: 6, h: 3.2 }, { x: 30, len: 6, h: 3.2 }], foes: [[20, 'bot', 0x6a2ad8], [38, 'bot', 0x2ab048]],
  setup: sc => { for (let i = 0; i < 9; i++) { box(2, 14 + (i % 3) * 2, 2, 0x2a1a3a, -22 + i * 6, 7 + (i % 3), -18, sc); box(1.2, 1.2, 1.2, glowM(0xc060ff, 1.2), -22 + i * 6, 15 + (i % 3) * 2, -18, sc); } } });

// 3 (8.6-12.9) 1993: Mega Man X, white armour, dusk highway with towers
levelScene(8.6, 12.9, { sky: [[0, '#2a1030'], [0.45, '#e0603a'], [1, '#ffd090']], fog: 0xe08a5a, hemi: 0xffd8b0, sun: 0xffa050,
  segs: [[-30, 18], [22, 36], [40, 70]], top: 0x7a7a84, side: 0x3a3a44,
  jumps: [{ x: 20, len: 4, h: 3.4 }, { x: 38, len: 4, h: 3.4 }], foes: [[14, 'bot', 0xd8402a], [30, 'met']],
  armor: WHITE, pants: BLUE,
  setup: sc => { for (let i = 0; i < 8; i++) box(8, 26 + (i % 3) * 6, 8, 0x3a3048, -44 + i * 14, 13 + (i % 3) * 3, -30, sc); } });

// 4 (12.9-17.2) 1997: Legends, floating islands above the sky
levelScene(12.9, 17.2, { sky: [[0, '#4a9ae8'], [1, '#e8f8ff']], fog: 0xc8e8ff, hemi: 0xffffff,
  segs: [[-30, 12], [17, 29], [35, 70]], top: 0x6aa84a, side: 0x7a5a30,
  jumps: [{ x: 14.5, len: 5, h: 3.2 }, { x: 32, len: 6, h: 3.2 }], foes: [[16, 'met'], [27, 'met']],
  setup: sc => { for (const [x, y, z, s] of [[-6, 13, -30, 1], [12, 17, -34, 1.3], [30, 11, -28, 0.9]]) { box(10 * s, 1.4, 8 * s, 0x7aa040, x, y, z, sc); box(6 * s, 4 * s, 5 * s, 0x6a5030, x, y - 2.6 * s, z, sc); } } });

// 5 (17.2-21.5) 2001: Battle Network, a glowing cyber grid
levelScene(17.2, 21.5, { sky: [[0, '#040614'], [1, '#1a2c5a']], fog: 0x0a1430, hemi: 0x6a8ad8, hemiI: 0.8, sun: 0x8ad8ff, sunI: 0.8,
  segs: [[-30, 13], [18, 30], [36, 70]], top: 0x1a3a6a, side: 0x0a1a3a,
  jumps: [{ x: 15.5, len: 5, h: 3.2 }, { x: 33, len: 6, h: 3.2 }], foes: [[15, 'bot', 0x2a8ad8], [26, 'met']], eye: 0x2ad8ff,
  setup: sc => { for (let i = 0; i < 14; i++) box(0.06, 0.02, 50, glowM(0x2ad8ff, 1.2), -30 + i * 5, 0.13, -12, sc);
    for (let j = 0; j < 8; j++) box(80, 0.02, 0.06, glowM(0x2ad8ff, 1.2), 0, 0.13, -20 + j * 4, sc);
    for (let i = 0; i < 6; i++) box(3, 2, 0.2, glowM(0x2ad8ff, 0.8), -22 + i * 9, 6 + (i % 2) * 3, -26, sc); } });

// 6 (21.5-25.8) 2018: Mega Man 11, factory gears; the gears slow down when Double Gear charges
levelScene(21.5, 25.8, { sky: [[0, '#ff7a3a'], [0.6, '#ffb060'], [1, '#ffe0a0']], fog: 0xffa060, hemi: 0xffd0a0, hemiI: 0.8, sun: 0xffb070,
  segs: [[-30, 15], [21, 34], [38, 70]], top: 0x6a6a74, side: 0x3a3a44,
  jumps: [{ x: 18, len: 6, h: 3.2 }, { x: 36, len: 4, h: 3.2 }], foes: [[12, 'met'], [24, 'bot', 0xd8a020], [30, 'met']],
  setup: sc => { const gs = [gear(sc, -10, 9, -20, 3.4, 12, 0x5a6070), gear(sc, 10, 12, -22, 4.2, 14, 0x6a7080), gear(sc, 1, 5, -26, 2.6, 9, 0x4a5060)];
    tick(t => { const slow = 1 - 0.75 * Math.exp(-((t - 23.2) ** 2) / 0.5); gs.forEach((g, i) => { g.rotation.z = t * (i % 2 ? -0.6 : 0.6) * slow; }); }); } });

// 7 (25.8-30) finale: the Blue Bomber charges the Buster, confetti, title
defScene(25.8, 30, () => {
  const scene = newScene();
  scene.background = gradientSky([[0, '#1a2a6a'], [0.6, '#4a7ae0'], [1, '#ffd8a0']]); scene.fog = new THREE.Fog(0x5a7ad0, 50, 220);
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x303848, 0.7)); sun(scene, 0xfff0d8, 1.8, V(-30, 60, 40), V(0, 0, 0), 60);
  ground2(scene, [[-60, 60]], 0x4aa03a, 0x6a4a28, 30);
  const hero = bomber(1.25); hero.rotation.y = Math.PI / 2; scene.add(hero);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), glowM(VISOR, 3)); scene.add(orb);
  const conf = particleField(scene, 77, 260, { x0: -8, x1: 8, y0: 2, y1: 14, z0: -3, z1: 3 }, 0xffe870, 0.25, { vy: -1.8, drift: 1.4, additive: true, opacity: 0.95 });
  const sparks = particleField(scene, 78, 220, { x0: 2.0, x1: 3.2, y0: 2.4, y1: 3.6, z0: -1, z1: 1 }, 0x8af0ff, 0.14, { vy: 2.5, drift: 0.8, additive: true, opacity: 0.9 });
  tick(t => { conf(t); sparks(t); });
  const cam = camera(50);
  return { scene, cam, update(t, u) {
    const lt = t - 25.8, charge = clamp(lt / 2.2, 0, 1), pulse = 0.5 + 0.5 * Math.sin(t * 14), U = hero.userData;
    U.armR.rotation.x = -1.45 + 0.03 * Math.sin(t * 8); U.armL.rotation.x = -0.2; U.head.rotation.y = Math.sin(t * 0.8) * 0.2;
    hero.position.y = 0.11 + Math.abs(Math.sin(t * 3)) * 0.05; [U.legL, U.legR].forEach((l, k) => { l.rotation.x = k ? 0.05 : -0.05; });
    U.muzMat.emissiveIntensity = 1.5 + charge * 4 * pulse;
    orb.scale.setScalar(0.35 + charge * 1.2 * (0.85 + 0.15 * pulse)); orb.position.set(2.5, 3.0, 0);
    const a = -0.9 + u * 1.2;
    lookFrom(cam, V(Math.sin(a) * 9 + 1.5, 3.4 + u * 1.5, Math.cos(a) * 9 + 3), V(1.0, 2.8, 0));
  } };
});

const G = { tint: [1.0, 1.0, 1.02], sat: 1.2, contrast: 1.1, bloom: 0.6, thr: 1.3, exposure: 0.7 };
