"use strict";
// Bedroom memory lane (1987): a kid on the carpet with an NES, a CRT TV running an 8-bit Mega Man stage,
// Mega Man / Dr. Wily / Robot Master posters, a boombox and magazines. Original brick interpretation, 30 s.
const BR_WALL = 0x8a5a34, BR_CARPET = 0xc8b48a, BR_WOOD = 0x6a4a2a;

function BRcanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; return { tex, ctx: x };
}
// the 8-bit stage on the TV: night sky, scrolling blocks, a Met walking in, Mega Man running and firing
function BRdrawGame(x, t) {
  x.fillStyle = '#0a1a48'; x.fillRect(0, 0, 128, 96);
  x.fillStyle = '#2a4aa8'; for (let i = 0; i < 6; i++) x.fillRect(8 + i * 20, 14 + (i % 2) * 6, 12, 4);
  const off = (t * 40) % 16;
  x.fillStyle = '#3a6ad8'; for (let i = -1; i < 12; i++) x.fillRect(i * 16 - off, 76, 15, 20);
  x.fillStyle = '#7ab0ff'; x.fillRect(0, 76, 128, 2);
  const mx = 96 - ((t * 25) % 80); x.fillStyle = '#f2c020'; x.fillRect(mx, 66, 10, 8); x.fillStyle = '#1a1a1a'; x.fillRect(mx + 2, 70, 6, 2);
  const hx = 30, bob = Math.floor(Math.abs(Math.sin(t * 14)) * 2);
  x.fillStyle = '#2a6ad8'; x.fillRect(hx, 56 - bob, 10, 10); x.fillRect(hx + 1, 46 - bob, 8, 10);
  x.fillStyle = '#6ae8ff'; x.fillRect(hx + 6, 50 - bob, 4, 2);
  x.fillStyle = '#ffffff'; x.fillRect(hx + 9, 52 - bob, 4, 3);
  x.fillStyle = '#1a4aa8'; x.fillRect(hx + 1, 66, 4, 10 - bob); x.fillRect(hx + 5, 66, 4, 10 - bob);
  x.fillStyle = '#6ae8ff'; x.fillRect(hx + 14 + (t * 80) % 60, 51 - bob, 4, 2);
  x.fillStyle = '#ffffff'; x.font = '8px monospace'; x.fillText('SCORE 001200', 4, 10);
}
function BRposter(scene, x, y, z, w, h, o) {
  const tex = BRcanvas(256, 320, (c, W, H) => {
    c.fillStyle = o.bg; c.fillRect(0, 0, W, H);
    c.fillStyle = o.fig; c.fillRect(W * 0.3, H * 0.4, W * 0.4, H * 0.42);
    c.fillStyle = o.skin; c.fillRect(W * 0.36, H * 0.2, W * 0.28, H * 0.2);
    c.fillStyle = o.accent; c.fillRect(0, H * 0.84, W, H * 0.16);
    c.fillStyle = '#fff'; c.font = 'bold 36px sans-serif'; c.textAlign = 'center'; c.fillText(o.title, W / 2, H * 0.12);
    c.font = 'bold 24px sans-serif'; c.fillText(o.sub || '', W / 2, H * 0.92);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex.tex, roughness: 0.8 }));
  m.position.set(x, y, z); scene.add(m); m.userData.y0 = y; return m;
}
function BRmag(scene, x, y, z, rz, title, col) {
  const tex = BRcanvas(256, 180, (c, W, H) => { c.fillStyle = col; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText(title, W / 2, H * 0.3); c.fillStyle = '#ffd84a'; c.fillRect(W * 0.2, H * 0.55, W * 0.6, H * 0.25); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.6), [0x9a9a9a, 0x9a9a9a, 0x9a9a9a, 0x9a9a9a, new THREE.MeshStandardMaterial({ map: tex.tex }), 0x9a9a9a].map(m => m instanceof THREE.Material ? m : plastic(m)));
  m.position.set(x, y, z); m.rotation.y = rz; scene.add(m);
}

const BRROOM = (() => {
  const scene = newScene();
  scene.background = new THREE.Color(0x2a1c14); scene.fog = new THREE.Fog(0x2a1c14, 25, 60);
  scene.add(new THREE.HemisphereLight(0xffe0b0, 0x3a2a20, 0.6));
  const lamp = new THREE.PointLight(0xffc070, 3, 30); lamp.position.set(0, 8, 0); scene.add(lamp);
  const tvL = new THREE.PointLight(0x6ab8ff, 1.5, 12); tvL.position.set(-6, 2.6, -1); scene.add(tvL);

  // room shell
  box(20, 0.2, 14, BR_CARPET, 0, -0.1, 0, scene);
  box(20, 12, 0.2, BR_WALL, 0, 6, -6.1, scene);
  box(0.2, 12, 14, BR_WALL, -10, 6, 0, scene);
  box(20, 0.4, 0.25, 0x3a2418, 0, 0.2, -5.95, scene);
  for (let i = 0; i < 14; i++) box(0.08, 12, 0.05, 0x5a3418, -9.5 + i * 1.5, 6, -6.0, scene);

  // TV on a wooden stand, its screen runs the 8-bit stage
  box(4.6, 1.2, 2.2, BR_WOOD, -6, 0.6, -4.2, scene);
  box(3.6, 2.8, 2.4, 0x3a3a40, -6, 2.6, -4.2, scene);
  const TV = BRcanvas(128, 96, () => {});
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), new THREE.MeshBasicMaterial({ map: TV.tex }));
  screen.position.set(-6, 2.6, -2.98); scene.add(screen);

  // NES, cables, cartridges
  box(2.8, 0.7, 2.0, 0xd8d8d8, -2.2, 0.35, 0.6, scene);
  box(1.6, 0.12, 0.3, 0x222222, -2.2, 0.72, -0.2, scene);
  for (let i = 0; i < 3; i++) box(1.8, 0.18, 1.0, [0x3a5ab8, 0xb83a2a, 0x3ab05a][i], -5.5 + i * 0.1, 0.11 + i * 0.18, 1.2 + i * 0.2, scene);
  box(0.08, 0.08, 3.4, 0x1a1a1a, -3.8, 0.1, 1.8, scene);

  // bed, pillows, blanket
  box(5.4, 1.0, 3.2, BR_WOOD, 4.4, 0.5, -4.4, scene);
  box(5.2, 0.5, 3.0, 0xdfe6f0, 4.4, 1.2, -4.4, scene);
  box(3.6, 0.25, 3.1, 0x3a5a9a, 5.4, 1.5, -4.4, scene);
  box(1.4, 0.4, 2.0, 0xf4f4f0, 2.8, 1.6, -4.4, scene);

  // nightstand with the boombox
  box(1.6, 1.2, 1.4, BR_WOOD, 8.0, 0.6, -4.3, scene);
  box(2.6, 1.0, 1.0, 0x505058, 8.0, 1.7, -4.3, scene);
  const speakers = [7.2, 8.8].map(x => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 18), plastic(0x1a1a1a)); s.rotation.x = Math.PI / 2; s.position.set(x, 1.7, -3.75); scene.add(s); return s; });
  box(0.9, 0.5, 0.2, 0x8a8a94, 8.0, 2.4, -4.3, scene);

  // posters on the back wall
  const posters = [
    BRposter(scene, -4.4, 5.8, -5.9, 2.6, 3.4, { bg: '#4a9ad8', fig: '#2a6ad8', skin: '#f0c8a0', accent: '#d83a2a', title: 'MEGA MAN', sub: 'BLUE BOMBER' }),
    BRposter(scene, -0.8, 5.8, -5.9, 2.6, 3.4, { bg: '#7a5ab8', fig: '#e8e0d0', skin: '#e8c0a0', accent: '#3a2a4a', title: 'DR. WILY', sub: 'WHY?!' }),
    BRposter(scene, 2.8, 5.8, -5.9, 2.6, 3.4, { bg: '#c84a2a', fig: '#d8d8e8', skin: '#f0c8a0', accent: '#2a2a40', title: 'ROBOT MASTERS', sub: 'BOSS RUSH' }),
    BRposter(scene, 6.2, 6.4, -5.9, 1.4, 1.8, { bg: '#f2c020', fig: '#f2c020', skin: '#f2c020', accent: '#1a1a1a', title: 'MET', sub: '' }),
  ];

  // magazines and game box on the carpet
  BRmag(scene, 0.5, 0.1, 4.8, 0.2, 'NINTENDO POWER', '#3a6ab8');
  BRmag(scene, 5.0, 0.1, 4.2, -0.4, 'NINTENDO POWER', '#b83a2a');
  box(1.6, 0.3, 1.3, 0x2a4a9a, -6.5, 0.25, 4.4, scene);
  [[-7.5, 0.25, 3.6], [-6.0, 0.3, 5.2], [-3.4, 0.25, 4.6], [6.5, 0.25, 5.8]].forEach(([x, y, z]) => box(1.0, 0.2, 0.6, 0x1a1a1a, x, y, z, scene));
  const paper = []; for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), plastic(0xf4f4f0)); p.position.set(-8 + (i * 2.3) % 15, 0.2, 2 + (i * 1.7) % 5); p.castShadow = true; scene.add(p); paper.push(p); }

  // the kid on the carpet, facing the TV, controller in both hands
  const kidFig = figure({ shirt: 0x1a1a1a, pants: 0x2a2a30, skin: 0xf0c8a0, hair: 0xd8c8a0, hairStyle: 'cap', scale: 1.0 });
  const KH = kidFig.userData.head;
  box(0.96, 0.08, 0.42, 0xd83a2a, 0, 0.9, 0.66, KH);     // red cap brim
  box(0.9, 0.32, 0.26, 0x3a2a1a, 0, 0.16, 0.46, KH);     // beard
  kidFig.position.set(-1.4, -0.9, 2.2); kidFig.rotation.y = -2.5; scene.add(kidFig);
  kidFig.userData.legL.rotation.x = -1.5; kidFig.userData.legR.rotation.x = -1.5;
  box(0.5, 0.12, 0.9, 0x404048, 0, 1.6, 1.3, kidFig);     // controller

  // ambience: TV flicker, speakers and posters pulse on the beat (120 bpm)
  tick(t => {
    drawGameTick(TV, t);
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 4)), 8);
    speakers.forEach(s => s.scale.setScalar(1 + 0.12 * beat));
    posters.forEach(p => { p.position.y = p.userData.y0 + 0.03 * beat; });
    tvL.intensity = 1.5 + 0.5 * Math.sin(t * 37);
    lamp.intensity = 3 + 0.15 * Math.sin(t * 2.1);
    kidFig.userData.armL.rotation.x = -1.4 + Math.sin(t * 18) * 0.12;
    kidFig.userData.armR.rotation.x = -1.4 + Math.sin(t * 18 + 1.3) * 0.12;
    kidFig.userData.head.rotation.x = 0.15 + beat * 0.08;
    kidFig.userData.head.rotation.y = Math.sin(t * 0.7) * 0.1;
    paper.forEach((p, i) => { p.rotation.set(i, t * 0.1 + i, 0); });
  });
  return { scene, kidFig, cam: null };
})();
function drawGameTick(tv, t) { BRdrawGame(tv.ctx, t); tv.tex.needsUpdate = true; }

function BRshot(start, end, fn) {
  const cam = camera(50);
  return defScene(start, end, () => ({ scene: BRROOM.scene, cam, update(t, u) { fn(cam, ease(u), t, u); } }));
}
// 1 (0-5): the room, the camera drifts in from the corner
BRshot(0, 5, (cam, d) => lookFrom(cam, V(lerp(9, 2, d), lerp(7, 3.6, d), lerp(15, 9.5, d)), V(-2, 2.6, -2)));
// 2 (5-10): push into the TV while the Mega Man stage runs
BRshot(5, 10, (cam, d) => lookFrom(cam, V(lerp(-1, -4.2, d), lerp(3.6, 3.0, d), lerp(7.5, 4.2, d)), V(-6, 2.6, -3)));
// 3 (10-15): the kid at the controller, camera tracks past him
BRshot(10, 15, (cam, d) => lookFrom(cam, V(lerp(-7, -1.5, d), 3.6, lerp(12, 10, d)), V(-1.4, 1.4, 2.2)));
// 4 (15-20): the posters, camera sweeps in front of the wall
BRshot(15, 20, (cam, d, t) => { const a = -0.5 + d * 1.0; lookFrom(cam, V(0.5 + Math.sin(a) * 7, 5.2, 2.5 + Math.cos(a) * 1.0), V(0.5, 5.6, -5.9)); });
// 5 (20-25): the boombox, close, speakers pulsing
BRshot(20, 25, (cam, d) => lookFrom(cam, V(lerp(3, 7.0, d), lerp(3.4, 3.0, d), lerp(4.5, 2.4, d)), V(8, 1.8, -4.3)));
// 6 (25-30): pull back to the whole room
BRshot(25, 30, (cam, d) => lookFrom(cam, V(lerp(2, 9, d), lerp(3.5, 9, d), lerp(6, 18, d)), V(-1, 3.5, -2)));
