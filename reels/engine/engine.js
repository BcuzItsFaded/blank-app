// Brick Reel engine: shared 3D kit (bricks, figures, kaiju, smoke, fire, props, post FX) + reel runtime.
// Load after three@0.149.0 build/three.min.js. Pages define scenes with defScene() then call startReel(cfg).
"use strict";
THREE.ColorManagement.legacyMode = false;
const W = 720, H = 1280, FPS = 30;
let DURATION = 60;
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.LinearEncoding;
renderer.toneMapping = THREE.NoToneMapping;
stage.prepend(renderer.domElement);

// ---------- utilities ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIn = t => Math.pow(clamp(t, 0, 1), 3);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const matCache = {};
function plastic(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.42, metalness: 0.0 }, opts));
  return matCache[key];
}
let CUR = null;
function bevelBox(b) {
  const q = 0.5 - b, sh = new THREE.Shape();
  sh.moveTo(-q, -q); sh.lineTo(q, -q); sh.lineTo(q, q); sh.lineTo(-q, q); sh.lineTo(-q, -q);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1 - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 1 });
  g.translate(0, 0, -(1 - 2 * b) / 2); g.computeVertexNormals(); return g;
}
const boxGeo = bevelBox(0.05);
const studGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.18, 20);
function tick(fn) { (CUR.userData.ticks = CUR.userData.ticks || []).push(fn); }
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(boxGeo, typeof mat === 'number' ? plastic(mat) : mat);
  m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  (parent || CUR).add(m);
  return m;
}
// Stud collector: every brick-top gets studs, merged into one InstancedMesh per material.
class Studs {
  constructor() { this.byMat = new Map(); }
  add(mat, x, y, z, w, d, pitch = 1, scale = 1) {
    if (!this.byMat.has(mat)) this.byMat.set(mat, []);
    const arr = this.byMat.get(mat);
    const nx = Math.max(1, Math.floor(w / pitch)), nz = Math.max(1, Math.floor(d / pitch));
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++)
      arr.push([x - w / 2 + pitch * (i + 0.5) * (w / (nx * pitch)), y + 0.09 * scale, z - d / 2 + pitch * (k + 0.5) * (d / (nz * pitch)), scale]);
  }
  build(parent) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (const [mat, arr] of this.byMat) {
      const im = new THREE.InstancedMesh(studGeo, mat, arr.length);
      arr.forEach((p, i) => { m4.compose(V(p[0], p[1], p[2]), q, V(p[3], p[3], p[3])); im.setMatrixAt(i, m4); });
      im.castShadow = true; im.receiveShadow = true; parent.add(im);
    }
  }
}
// Brick building: stacked courses with slight jitter, broken tops for ruins.
function building(scene, studs, R, x, z, w, d, h, color, ruined) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const mat = plastic(color);
  const dark = plastic(new THREE.Color(color).multiplyScalar(0.55).getHex());
  const course = 0.6;
  const n = Math.max(1, Math.round(h / course));
  let topY = 0;
  for (let i = 0; i < n; i++) {
    const shrink = ruined ? (i / n) * R() * 0.5 : 0;
    const ww = w * (1 - shrink * R()), dd = d * (1 - shrink * R());
    if (ruined && i > n * 0.5 && R() < 0.25) break;
    box(ww, course * 0.98, dd, i % 4 === 3 ? dark : mat, (R() - 0.5) * shrink, course * (i + 0.5), (R() - 0.5) * shrink, g);
    topY = course * (i + 1);
  }
  // windows
  const win = plastic(ruined ? 0x16130f : 0x2b3440, { roughness: 0.2 });
  for (let y = 1.2; y < topY - 0.6; y += 1.8) {
    for (let k = -w / 2 + 0.8; k < w / 2 - 0.5; k += 1.4) {
      if (ruined && R() < 0.3) continue;
      box(0.6, 0.8, 0.05, win, k, y, d / 2 + 0.02, g);
    }
  }
  studs.add(mat, x, topY, z, w * 0.8, d * 0.8, 1.0, 1.0);
  return { g, topY };
}
function japaneseHouse(scene, studs, x, z, rot, wallColor, roofColor, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; g.scale.setScalar(scale); scene.add(g);
  box(6, 0.4, 5, 0x5a4a3a, 0, 0.2, 0, g);
  box(5.6, 2.6, 4.6, wallColor, 0, 1.7, 0, g);
  // timber frame
  for (const px of [-2.75, -0.9, 0.9, 2.75]) box(0.25, 2.7, 0.25, 0x3b2a1c, px, 1.75, 2.35, g);
  box(5.8, 0.25, 0.25, 0x3b2a1c, 0, 3.0, 2.35, g);
  // shoji panels
  for (const px of [-1.8, 0, 1.8]) box(1.5, 1.8, 0.05, 0xeee3c8, px, 1.6, 2.33, g);
  // stepped roof
  for (let i = 0; i < 5; i++) box(7.2 - i * 1.3, 0.35, 6.2 - i * 1.15, roofColor, 0, 3.2 + i * 0.35, 0, g);
  box(1.0, 0.35, 6.4, roofColor, 0, 3.2 + 5 * 0.35, 0, g);
  return g;
}

// Minifig-style figure (generic block person)
function figure(opts) {
  const o = Object.assign({ shirt: 0x334455, pants: 0x222222, skin: 0xe8b98a, hair: 0x1a1410, hairStyle: 'short', scale: 1 }, opts);
  const root = new THREE.Group(); root.scale.setScalar(o.scale);
  const hipsY = 1.2;
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.32, hipsY, 0); legR.position.set(0.32, hipsY, 0);
  box(0.58, 1.15, 0.7, o.pants, 0, -0.6, 0, legL); box(0.58, 1.15, 0.7, o.pants, 0, -0.6, 0, legR);
  box(0.6, 0.15, 0.8, 0x1b1b1b, 0, -1.12, 0.04, legL); box(0.6, 0.15, 0.8, 0x1b1b1b, 0, -1.12, 0.04, legR);
  root.add(legL, legR);
  box(1.3, 0.25, 0.72, o.pants, 0, hipsY + 0.08, 0, root);
  const torso = box(1.3, 1.25, 0.7, o.shirt, 0, hipsY + 0.83, 0, root);
  if (o.dress) box(1.5, 0.9, 0.85, o.shirt, 0, hipsY - 0.15, 0, root);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.8, hipsY + 1.35, 0); armR.position.set(0.8, hipsY + 1.35, 0);
  box(0.36, 1.05, 0.42, o.shirt, 0, -0.45, 0, armL); box(0.36, 1.05, 0.42, o.shirt, 0, -0.45, 0, armR);
  const hand = new THREE.CylinderGeometry(0.15, 0.15, 0.25, 10);
  const hL = new THREE.Mesh(hand, plastic(o.skin)); hL.position.y = -1.05; armL.add(hL);
  const hR = new THREE.Mesh(hand, plastic(o.skin)); hR.position.y = -1.05; armR.add(hR);
  root.add(armL, armR);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 14), plastic(o.skin));
  neck.position.y = hipsY + 1.53; root.add(neck);
  const head = new THREE.Group(); head.position.y = hipsY + 1.62; root.add(head);
  const hm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.85, 20), plastic(o.skin));
  hm.position.y = 0.43; hm.castShadow = true; head.add(hm);
  const stud = new THREE.Mesh(studGeo, plastic(o.skin)); stud.position.y = 0.95; stud.scale.setScalar(0.85); head.add(stud);
  const eye = plastic(0x111111);
  box(0.08, 0.13, 0.04, eye, -0.15, 0.5, 0.41, head); box(0.08, 0.13, 0.04, eye, 0.15, 0.5, 0.41, head);
  box(0.24, 0.035, 0.04, eye, 0, 0.27, 0.41, head);
  box(0.2, 0.045, 0.04, plastic(o.hair), -0.15, 0.68, 0.41, head); box(0.2, 0.045, 0.04, plastic(o.hair), 0.15, 0.68, 0.41, head);
  box(0.035, 0.04, 0.02, plastic(0xffffff), -0.13, 0.53, 0.435, head); box(0.035, 0.04, 0.02, plastic(0xffffff), 0.17, 0.53, 0.435, head);
  box(0.1, 0.06, 0.02, plastic(0xd98a7a), -0.27, 0.36, 0.405, head); box(0.1, 0.06, 0.02, plastic(0xd98a7a), 0.27, 0.36, 0.405, head);
  const hairMat = plastic(o.hair);
  if (o.hairStyle === 'short') { box(0.92, 0.3, 0.92, hairMat, 0, 0.88, -0.02, head); box(0.92, 0.45, 0.25, hairMat, 0, 0.66, -0.36, head); }
  if (o.hairStyle === 'bob') { box(1.0, 0.32, 0.98, hairMat, 0, 0.9, -0.02, head); box(1.0, 0.8, 0.4, hairMat, 0, 0.5, -0.32, head);
    box(0.18, 0.75, 0.75, hairMat, -0.46, 0.52, -0.08, head); box(0.18, 0.75, 0.75, hairMat, 0.46, 0.52, -0.08, head); }
  if (o.hairStyle === 'pigtails') { box(0.94, 0.3, 0.94, hairMat, 0, 0.88, -0.02, head);
    box(0.25, 0.5, 0.25, hairMat, -0.55, 0.5, -0.2, head); box(0.25, 0.5, 0.25, hairMat, 0.55, 0.5, -0.2, head); }
  if (o.hairStyle === 'cap') { box(0.95, 0.3, 0.95, hairMat, 0, 0.92, 0, head); box(0.95, 0.06, 0.4, hairMat, 0, 0.8, 0.6, head); }
  if (o.hairStyle === 'bald') { box(0.9, 0.15, 0.6, 0x9a9a9a, 0, 0.75, -0.2, head); }
  if (o.glasses) { box(0.62, 0.05, 0.03, 0x111111, 0, 0.55, 0.44, head); }
  if (o.coat) box(1.4, 1.3, 0.76, o.coat, 0, hipsY + 0.8, -0.01, root);
  { const fz = o.coat ? 0.39 : 0.355, trim = plastic(new THREE.Color(o.coat || o.shirt).multiplyScalar(0.55).getHex());
    for (let i = 0; i < 3; i++) box(0.09, 0.09, 0.04, trim, 0, hipsY + 0.45 + i * 0.3, fz + 0.01, root);
    const l1 = box(0.12, 0.62, 0.04, trim, -0.2, hipsY + 1.15, fz, root); l1.rotation.z = -0.45;
    const l2 = box(0.12, 0.62, 0.04, trim, 0.2, hipsY + 1.15, fz, root); l2.rotation.z = 0.45;
    if (!o.dress) box(1.34, 0.13, 0.74, 0x2a1e14, 0, hipsY + 0.27, 0, root);
    if (o.dress) box(1.52, 0.08, 0.87, trim, 0, hipsY - 0.55, 0, root); }
  root.userData = { legL, legR, armL, armR, head, neck, torso };
  return root;
}
function walkCycle(f, t, speed = 6, amp = 0.55) {
  const s = Math.sin(t * speed);
  f.userData.legL.rotation.x = s * amp; f.userData.legR.rotation.x = -s * amp;
  f.userData.armL.rotation.x = -s * amp * 0.8; f.userData.armR.rotation.x = s * amp * 0.8;
}

// Kaiju (brick-built, consistent across all scenes)
const skinTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), r = rng(5);
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { const g = 60 + r() * 150 | 0; x.fillStyle = `rgba(${g},${g},${g},0.55)`; x.beginPath(); x.arc(r() * 256, r() * 256, 2 + r() * 11, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 1.5); return t;
})();
const KAIJU_SKIN = new THREE.MeshStandardMaterial({ color: 0x2e2f31, roughness: 0.72, bumpMap: skinTex, bumpScale: 0.9 });
const KAIJU_SKIN2 = new THREE.MeshStandardMaterial({ color: 0x212224, roughness: 0.82, bumpMap: skinTex, bumpScale: 0.9 });
const KAIJU_BUMP = new THREE.MeshStandardMaterial({ color: 0x3a3a39, roughness: 0.9, bumpMap: skinTex, bumpScale: 0.6 });
const KAIJU_CLAW = plastic(0xcfc8b4, { roughness: 0.35 });
function makeKaiju() {
  const root = new THREE.Group();
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xbfc6cc, roughness: 0.45, emissive: 0x58b4ff, emissiveIntensity: 0, bumpMap: skinTex, bumpScale: 0.4 });
  const R = rng(77);
  const add = (w, h, d, x, y, z, p = root, m = KAIJU_SKIN) => box(w, h, d, m, x, y, z, p);
  // legs
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 3.2, 11, 0); root.add(leg);
    add(4.2, 6, 5, 0, -2.5, 0, leg); add(3.4, 5, 3.8, 0, -7.5, 0.6, leg, KAIJU_SKIN2); add(4.4, 1.6, 6, 0, -10.2, 1.4, leg);
    for (const c of [-1.4, 0, 1.4]) add(0.7, 0.8, 1.4, c, -10.5, 4.6, leg, plastic(0x8d8a80));
    legs.push(leg);
  }
  // torso stack, leaning forward
  const torso = new THREE.Group(); torso.position.set(0, 12, 0); root.add(torso);
  const courses = [[9, 3, 7.5], [8.6, 3, 7.2], [8, 3, 6.6], [7.2, 3, 6], [6.4, 2.8, 5.4], [5.4, 2.6, 4.6]];
  let y = 0;
  courses.forEach(([w, h, d], i) => { add(w, h, d, 0, y + h / 2, i * 0.45, torso, i % 2 ? KAIJU_SKIN2 : KAIJU_SKIN); y += h; });
  add(5.6, 9, 0.6, 0, 8, 3.8, torso, plastic(0x3a3632, { roughness: 0.8 })); // belly
  // arms
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 4.4, 13, 2.2); torso.add(arm);
    add(1.8, 4, 1.8, 0, -1.8, 0.4, arm); add(1.4, 3, 1.4, 0, -4.5, 1.6, arm, KAIJU_SKIN2);
    for (const cx of [-0.45, 0, 0.45]) { const cl = add(0.28, 0.75, 0.3, cx, -6.2, 2.0, arm, KAIJU_CLAW); cl.rotation.x = 0.5; }
    arm.rotation.x = -0.6; arm.rotation.z = side * 0.18; arms.push(arm);
  }
  // neck & head
  const neck = new THREE.Group(); neck.position.set(0, y, 2.6); torso.add(neck);
  add(4.4, 3, 4.2, 0, 1.2, 0.4, neck); add(3.8, 2.4, 3.8, 0, 3.4, 1.0, neck, KAIJU_SKIN2);
  const head = new THREE.Group(); head.position.set(0, 4.6, 1.8); neck.add(head);
  add(4.2, 2.4, 4.4, 0, 0.6, 0.8, head); add(3.6, 1.0, 3.2, 0, 1.6, 0.4, head, KAIJU_SKIN2); // skull & brow
  add(3.4, 1.0, 2.6, 0, 0.9, 3.8, head); // upper snout
  const jaw = new THREE.Group(); jaw.position.set(0, -0.4, 1.2); head.add(jaw);
  add(3.2, 0.9, 4.2, 0, -0.2, 1.6, jaw, KAIJU_SKIN2);
  const teeth = plastic(0xd8d2c0);
  for (let i = -1.2; i <= 1.21; i += 0.6) { add(0.25, 0.4, 0.25, i, 0.3, 5.0, head, teeth); }
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffe3b0, emissiveIntensity: 0.25 });
  add(0.5, 0.3, 0.3, -1.6, 1.25, 2.6, head, eyeMat); add(0.5, 0.3, 0.3, 1.6, 1.25, 2.6, head, eyeMat);
  // tail
  const tail = []; let parent = root; let tw = 6, th = 5;
  const tail0 = new THREE.Group(); tail0.position.set(0, 12.5, -3.5); root.add(tail0); parent = tail0;
  for (let i = 0; i < 12; i++) {
    const seg = new THREE.Group(); seg.position.set(0, i === 0 ? 0 : -0.35, i === 0 ? 0 : -3.4);
    parent.add(seg); add(tw, th, 3.8, 0, 0, -1.7, seg, i % 2 ? KAIJU_SKIN2 : KAIJU_SKIN);
    seg.userData.w = tw; seg.userData.h = th; tail.push(seg); parent = seg; tw *= 0.86; th *= 0.86;
  }
  // dorsal plates: jagged stacked bricks along spine, neck and tail
  const plates = [];
  function plateCluster(p, scale, x, yy, z) {
    const c = new THREE.Group(); c.position.set(x, yy, z); p.add(c);
    const n = 3 + Math.floor(R() * 2);
    for (let i = 0; i < n; i++) {
      const w = (1.3 - i * 0.25) * scale;
      const m = new THREE.Mesh(boxGeo, plateMat); m.scale.set(0.5 * scale, 0.9 * scale, w * 1.4);
      m.position.set(0, (i + 0.5) * 0.85 * scale, (R() - 0.5) * 0.5 * scale); m.rotation.x = (R() - 0.5) * 0.4; m.castShadow = true; c.add(m);
    }
    plates.push(c); return c;
  }
  [[0, 18, -2.6, 1.8], [0, 15.5, -3.4, 2.1], [0, 13, -3.6, 2.2], [0, 10.5, -3.6, 2.0], [0, 8, -3.4, 1.7], [0, 5.5, -3.0, 1.4]].forEach(([x, yy, z, s]) => {
    plateCluster(torso, s, x, yy, z); plateCluster(torso, s * 0.75, -1.8, yy - 0.6, z + 0.3); plateCluster(torso, s * 0.75, 1.8, yy - 0.6, z + 0.3);
  });
  plateCluster(neck, 1.4, 0, 2.6, -1.4);
  tail.forEach((seg, i) => { if (i < 10) plateCluster(seg, 1.6 * Math.pow(0.86, i), 0, seg.userData.h / 2, -1.7); });
  // keloid bumps: hundreds of small bricks scattered over every skin surface (instanced per body part)
  const skinMeshes = []; root.traverse(o => { if (o.isMesh && (o.material === KAIJU_SKIN || o.material === KAIJU_SKIN2)) skinMeshes.push(o); });
  const byParent = new Map();
  skinMeshes.forEach(m => {
    const sc = m.scale, p = m.position, area = sc.x * sc.y + sc.y * sc.z + sc.x * sc.z;
    const n = Math.min(48, Math.max(5, Math.floor(area * 0.4)));
    if (!byParent.has(m.parent)) byParent.set(m.parent, []);
    const arr = byParent.get(m.parent), r = () => R() - 0.5;
    for (let i = 0; i < n; i++) {
      const pos = p.clone(), f = Math.floor(R() * 5);
      if (f < 2) { pos.x += (f ? -1 : 1) * sc.x / 2; pos.y += r() * sc.y * 0.9; pos.z += r() * sc.z * 0.9; }
      else if (f === 2) { pos.y += sc.y / 2; pos.x += r() * sc.x * 0.9; pos.z += r() * sc.z * 0.9; }
      else { pos.z += (f === 3 ? 1 : -1) * sc.z / 2; pos.x += r() * sc.x * 0.9; pos.y += r() * sc.y * 0.9; }
      const sz = Math.min(sc.x, sc.y, sc.z) * (0.1 + R() * 0.16);
      arr.push([pos, V(sz * (0.8 + R() * 0.7), sz * (0.5 + R() * 0.6), sz * (0.8 + R() * 0.7)), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 0.5, R() * 3, r() * 0.5))]);
    }
  });
  const m4 = new THREE.Matrix4();
  byParent.forEach((arr, par) => { const im = new THREE.InstancedMesh(boxGeo, KAIJU_BUMP, arr.length);
    arr.forEach((a, i) => { m4.compose(a[0], a[2], a[1]); im.setMatrixAt(i, m4); }); im.castShadow = true; im.receiveShadow = true; par.add(im); });
  torso.rotation.x = 0.28;
  root.userData = { legs, torso, neck, head, jaw, tail, arms, plateMat, eyeMat, plates };
  return root;
}
function animateKaiju(k, t, o = {}) {
  const u = k.userData;
  const breathe = Math.sin(t * 1.3) * 0.02;
  u.torso.scale.set(1 + breathe, 1, 1 + breathe);
  u.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 0.8 - i * 0.45) * 0.06; s.rotation.x = 0.03; });
  u.neck.rotation.x = (o.headLift || 0) * -0.5;
  u.head.rotation.x = (o.headLift || 0) * -0.35;
  u.jaw.rotation.x = (o.jaw || 0) * 0.55;
  if (o.walk) {
    const s = Math.sin(t * o.walk);
    u.legs[0].rotation.x = s * 0.25; u.legs[1].rotation.x = -s * 0.25;
    u.torso.rotation.z = s * 0.03;
  }
  u.plateMat.emissiveIntensity = o.glow || 0;
  u.plateMat.color.setHex(o.glow > 0.3 ? 0xd8f0ff : 0xbfc6cc);
}

// Smoke / ash sprites
function radialTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
}
const smokeTex = radialTex('rgba(255,255,255,0.55)', 'rgba(255,255,255,0)');
function smokeField(scene, seed, n, area, color, opts = {}) {
  const R = rng(seed), list = [];
  for (let i = 0; i < n; i++) {
    const mat = new THREE.SpriteMaterial({ map: smokeTex, color, transparent: true, depthWrite: false, opacity: opts.opacity || 0.5, fog: true });
    const s = new THREE.Sprite(mat);
    s.userData = { x: area.x0 + R() * (area.x1 - area.x0), z: area.z0 + R() * (area.z1 - area.z0), y0: area.y0 + R() * (area.y1 - area.y0),
      rise: (opts.rise || 1.5) * (0.5 + R()), size: (opts.size || 10) * (0.6 + R() * 0.8), phase: R() * 10, life: opts.life || 12 };
    scene.add(s); list.push(s);
  }
  return t => list.forEach(s => {
    const d = s.userData, age = ((t + d.phase * d.life / 10) % d.life);
    s.position.set(d.x + Math.sin(age * 0.3 + d.phase) * 2, d.y0 + age * d.rise, d.z);
    const sz = d.size * (0.6 + age / d.life); s.scale.set(sz, sz, 1);
    s.material.opacity = (opts.opacity || 0.5) * Math.sin(Math.PI * age / d.life);
  });
}
function particleField(scene, seed, n, box3, color, size, opts = {}) {
  const R = rng(seed), pos = new Float32Array(n * 3), base = [];
  for (let i = 0; i < n; i++) base.push([box3.x0 + R() * (box3.x1 - box3.x0), box3.y0 + R() * (box3.y1 - box3.y0), box3.z0 + R() * (box3.z1 - box3.z0), R()]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: opts.opacity || 0.8, depthWrite: false, map: opts.map || null,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, mat); scene.add(pts);
  const hgt = box3.y1 - box3.y0;
  return t => { base.forEach((b, i) => {
    let yy = b[1] + (opts.vy || 0) * t; yy = box3.y0 + ((((yy - box3.y0) % hgt) + hgt) % hgt);
    pos[i * 3] = b[0] + Math.sin(t * 0.7 + b[3] * 20) * (opts.drift || 0) + (opts.vx || 0) * t;
    pos[i * 3 + 1] = yy; pos[i * 3 + 2] = b[2];
  }); geo.attributes.position.needsUpdate = true; };
}
function rain(scene, seed, n, b, color) {
  const R = rng(seed), pos = new Float32Array(n * 6), base = [];
  for (let i = 0; i < n; i++) base.push([b.x0 + R() * (b.x1 - b.x0), b.y0 + R() * (b.y1 - b.y0), b.z0 + R() * (b.z1 - b.z0)]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 })); scene.add(lines);
  const hgt = b.y1 - b.y0;
  return t => { base.forEach((p, i) => { const y = b.y0 + ((((p[1] - t * 38) - b.y0) % hgt) + hgt) % hgt;
    pos.set([p[0] - 0.3, y, p[2], p[0], y - 1.6, p[2]], i * 6); }); geo.attributes.position.needsUpdate = true; };
}
function gradientSky(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => g.addColorStop(p, col));
  x.fillStyle = g; x.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
function ground(scene, color, size = 600) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), plastic(color, { roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m); return m;
}
function sun(scene, color, intensity, pos, target = V(0, 0, 0), span = 80) {
  const l = new THREE.DirectionalLight(color, intensity); l.position.copy(pos); l.target.position.copy(target);
  l.castShadow = true; l.shadow.mapSize.set(2048, 2048);
  Object.assign(l.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 600 }); l.shadow.bias = -0.0008;
  scene.add(l, l.target); return l;
}
function camera(fov = 50) { const c = new THREE.PerspectiveCamera(fov, W / H, 0.1, 2000); return c; }
function lookFrom(cam, p, target) { cam.position.copy(p); cam.lookAt(target); }

// ================= PROPS =================
const flameTex = radialTex('rgba(255,236,190,1)', 'rgba(255,90,10,0)');
function fireSpot(scene, x, y, z, size, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const R = rng(Math.floor(Math.abs(x * 13 + z * 7)) + 1000), fl = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: [0xff6a1a, 0xffa040, 0xffd080][i % 3], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.userData = { ox: (R() - 0.5) * size, oz: (R() - 0.5) * size, ph: R() * 6 }; g.add(s); fl.push(s);
  }
  for (let i = 0; i < 6; i++) { const b = box(size * 0.5 * (0.5 + R()), size * 0.12, size * 0.12, 0x1a120c, (R() - 0.5) * size, size * 0.08, (R() - 0.5) * size, g); b.rotation.y = R() * 3; }
  const coals = new THREE.Mesh(new THREE.CircleGeometry(size * 0.7, 16), new THREE.MeshBasicMaterial({ color: 0xff5010, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  coals.rotation.x = -Math.PI / 2; coals.position.y = 0.05; g.add(coals);
  const light = o.light ? new THREE.PointLight(0xff7a2a, 0, size * 16) : null; if (light) { light.position.y = size * 0.9; g.add(light); }
  tick((t, u) => {
    const on = o.appearAt == null ? 1 : clamp((u - o.appearAt) * 6, 0, 1); g.visible = on > 0;
    fl.forEach((s, i) => { const d = s.userData, f = 0.75 + 0.2 * Math.sin(t * (9 + i) + d.ph) + 0.1 * Math.sin(t * 23 + i), ph = (t * 1.1 + d.ph) % 1;
      s.position.set(d.ox * (1 - ph * 0.5), size * (0.25 + ph * 0.9), d.oz * (1 - ph * 0.5)); s.scale.set(size * f * on * (1 - ph * 0.6), size * 1.5 * f * on * (1 - ph * 0.4), 1); s.material.opacity = 0.9 * (1 - ph * 0.7); });
    if (light) light.intensity = (2.4 + 0.8 * Math.sin(t * 11) + 0.5 * Math.sin(t * 17.3)) * on * (o.li || 1);
  });
  return g;
}
function embers(scene, seed, n, b, color = 0xffa040) { const f = particleField(scene, seed, n, b, color, 0.22, { vy: 2.4, drift: 1.6, additive: true, opacity: 0.95 }); tick(t => f(t)); }
function utilityLine(scene, pts, h = 8) {
  const wireMat = new THREE.LineBasicMaterial({ color: 0x0b0b0b }), tops = [];
  pts.forEach((p, i) => {
    const nx = pts[Math.min(i + 1, pts.length - 1)], pv = pts[Math.max(i - 1, 0)];
    const g = new THREE.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = Math.atan2(nx[0] - pv[0], nx[1] - pv[1]); g.rotation.z = p[2] || 0; scene.add(g);
    box(0.32, h, 0.32, 0x3b2b1f, 0, h / 2, 0, g); box(2.6, 0.2, 0.22, 0x3b2b1f, 0, h - 0.5, 0, g); box(1.8, 0.18, 0.2, 0x3b2b1f, 0, h - 1.3, 0, g);
    box(0.6, 0.8, 0.5, 0x4a4a48, 0.3, h - 2.4, 0.3, g); // transformer
    const cups = [[-1.1, h - 0.28], [0, h - 0.28], [1.1, h - 0.28], [-0.7, h - 1.08], [0.7, h - 1.08]];
    cups.forEach(([cx, cy]) => box(0.14, 0.22, 0.14, 0xd8d4c8, cx, cy, 0, g));
    g.updateMatrixWorld(true); tops.push(cups.map(([cx, cy]) => g.localToWorld(V(cx, cy + 0.12, 0))));
  });
  for (let i = 0; i < tops.length - 1; i++) for (let k = 0; k < 5; k++) {
    const a = tops[i][k], b = tops[i + 1][k], P = [];
    for (let j = 0; j <= 20; j++) { const q = j / 20, p = a.clone().lerp(b, q); p.y -= Math.sin(Math.PI * q) * a.distanceTo(b) * 0.045; P.push(p); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(P), wireMat));
  }
}
function signTex(text, bg, fg) {
  const ch = [...text], c = document.createElement('canvas'); c.width = 128; c.height = 112 * ch.length + 32; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(9, 9, c.width - 18, c.height - 18);
  x.fillStyle = fg; x.font = 'bold 90px "WenQuanYi Zen Hei", "Noto Sans CJK JP", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  ch.forEach((k, i) => x.fillText(k, 64, 16 + 56 + 112 * i));
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return [t, c.height / c.width];
}
function sign(parent, text, bg, fg, x, y, z, ry = 0, w = 1.2, glow = 0) {
  const [t, a] = signTex(text, bg, fg), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  box(w + 0.16, w * a + 0.16, 0.14, 0x2a1e14, 0, 0, -0.08, g);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * a), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, emissive: glow ? 0xffffff : 0, emissiveMap: glow ? t : null, emissiveIntensity: glow }));
  m.position.z = 0.01; g.add(m); return g;
}
const shaftTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#000'); g.addColorStop(0.2, '#fff'); g.addColorStop(0.65, '#aaa'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(c); })();
function shaft(scene, from, to, r0, r1, color, op) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 32, 1, true), new THREE.MeshBasicMaterial({ color, alphaMap: shaftTex, transparent: true, opacity: op,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.position.copy(from).lerp(to, 0.5); m.scale.y = from.distanceTo(to); m.lookAt(to); m.rotateX(Math.PI / 2); scene.add(m); return m;
}
function truck(scene, x, z, ry, color) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  box(2.2, 1.2, 5.2, 0x1e1e1e, 0, 0.9, 0, g); box(2.3, 1.6, 1.9, color, 0, 2.0, 1.4, g); box(2.0, 0.7, 0.05, plastic(0x9ab0c0, { roughness: 0.1, metalness: 0.6 }), 0, 2.3, 2.37, g);
  box(2.4, 0.9, 1.5, color, 0, 1.3, 2.9, g); box(2.4, 1.0, 3.2, color, 0, 1.9, -1.2, g); box(2.2, 0.08, 3.0, 0x3a2a1a, 0, 2.42, -1.2, g);
  const wheel = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 16); [[-1.15, 2.4], [1.15, 2.4], [-1.15, -1.6], [1.15, -1.6]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(wheel, plastic(0x111111, { roughness: 0.9 })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.55, wz); w.castShadow = true; g.add(w); });
  box(0.3, 0.25, 0.05, plastic(0xfff0c0, { emissive: 0xffe0a0, emissiveIntensity: 0.6 }), -0.8, 1.45, 3.66, g); box(0.3, 0.25, 0.05, plastic(0xfff0c0, { emissive: 0xffe0a0, emissiveIntensity: 0.6 }), 0.8, 1.45, 3.66, g);
  return g;
}
function seaweed(scene, seed, n, area) {
  const R = rng(seed), strands = [];
  for (let i = 0; i < n; i++) {
    let par = new THREE.Group(); par.position.set(area.x0 + R() * (area.x1 - area.x0), 0, area.z0 + R() * (area.z1 - area.z0)); scene.add(par);
    const segs = []; const len = 5 + Math.floor(R() * 6), col = [0x1f3a2a, 0x2a4a2a, 0x23402f][i % 3];
    for (let k = 0; k < len; k++) { const sg = new THREE.Group(); sg.position.y = k ? 0.55 : 0; par.add(sg); box(0.22, 0.55, 0.08, col, 0, 0.27, 0, sg); segs.push(sg); par = sg; }
    strands.push([segs, R() * 6]);
  }
  tick(t => strands.forEach(([segs, ph]) => segs.forEach((sg, k) => { sg.rotation.z = Math.sin(t * 1.1 + ph + k * 0.4) * 0.12; sg.rotation.x = Math.cos(t * 0.8 + ph + k * 0.3) * 0.08; })));
}
const pmrem = new THREE.PMREMGenerator(renderer);
function envFor(scene, glint = 0.5) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const bg = scene.background;
  if (bg && bg.isTexture) x.drawImage(bg.image, 0, 0, 512, 256); else { x.fillStyle = '#' + (bg ? bg.getHexString() : '222222'); x.fillRect(0, 0, 512, 256); }
  x.fillStyle = `rgba(255,255,255,${glint})`; x.fillRect(150, 30, 120, 40); x.fillRect(360, 50, 60, 30);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
  return pmrem.fromEquirectangular(t).texture;
}
// ---- post: bloom + chromatic aberration + ACES + grade + vignette + grain
const post = (() => {
  const hf = { type: THREE.HalfFloatType };
  const main = new THREE.WebGLRenderTarget(W, H, Object.assign({ samples: 4 }, hf));
  const mk = d => new THREE.WebGLRenderTarget(W / d, H / d, hf);
  const a2 = mk(2), a4 = mk(4), b4 = mk(4), a8 = mk(8), b8 = mk(8);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); sc.add(quad);
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const bright = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, thr: { value: 0.85 } }, vertexShader: vs,
    fragmentShader: 'uniform sampler2D tex; uniform float thr; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(thr, thr + 0.7, l), 1.); }' });
  const blur = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: vs,
    fragmentShader: 'uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb * 0.2270; c += (texture2D(tex, vUv + dir * 1.3846).rgb + texture2D(tex, vUv - dir * 1.3846).rgb) * 0.3162; c += (texture2D(tex, vUv + dir * 3.2308).rgb + texture2D(tex, vUv - dir * 3.2308).rgb) * 0.0703; gl_FragColor = vec4(c, 1.); }' });
  const comp = new THREE.ShaderMaterial({ uniforms: { scn: { value: null }, b4: { value: null }, b8: { value: null }, strength: { value: 1 }, exposure: { value: 1 },
      tint: { value: new THREE.Vector3(1, 1, 1) }, lift: { value: new THREE.Vector3() }, sat: { value: 1 }, contrast: { value: 1 }, seed: { value: 0 }, ca: { value: 0.006 }, vig: { value: 0.55 } },
    vertexShader: vs, fragmentShader: `uniform sampler2D scn, b4, b8; uniform float strength, exposure, sat, contrast, seed, ca, vig; uniform vec3 tint, lift; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0., 1.); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - 0.5; float r = dot(d, d);
        vec3 c = vec3(texture2D(scn, vUv - d * ca * r * 4.).r, texture2D(scn, vUv).g, texture2D(scn, vUv + d * ca * r * 4.).b);
        c += (texture2D(b4, vUv).rgb * 0.7 + texture2D(b8, vUv).rgb * 1.0) * strength;
        c = aces(c * exposure * 1.15);
        c = pow(c, vec3(1. / 2.2));
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat);
        c = (c - 0.5) * contrast + 0.5; c = c * tint + lift;
        c *= 1. - vig * smoothstep(0.08, 0.55, r * 1.6);
        c += (hash(vUv * vec2(720., 1280.) + seed) - 0.5) * 0.055;
        gl_FragColor = vec4(c, 1.);
      }` });
  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(sc, cam); }
  return function (scene, camera, g, t) {
    renderer.setRenderTarget(main); renderer.render(scene, camera);
    bright.uniforms.tex.value = main.texture; bright.uniforms.thr.value = g.thr ?? 0.85; pass(bright, a2);
    blur.uniforms.tex.value = a2.texture; blur.uniforms.dir.value.set(1 / (W / 4), 0); pass(blur, a4);
    blur.uniforms.tex.value = a4.texture; blur.uniforms.dir.value.set(0, 1 / (H / 4)); pass(blur, b4);
    blur.uniforms.tex.value = b4.texture; blur.uniforms.dir.value.set(1 / (W / 8), 0); pass(blur, a8);
    blur.uniforms.tex.value = a8.texture; blur.uniforms.dir.value.set(0, 1 / (H / 8)); pass(blur, b8);
    const u = comp.uniforms; u.scn.value = main.texture; u.b4.value = b4.texture; u.b8.value = b8.texture;
    u.strength.value = g.bloom ?? 1; u.exposure.value = g.exposure ?? 1; u.sat.value = g.sat ?? 1; u.contrast.value = g.contrast ?? 1.05;
    u.tint.value.set(...(g.tint || [1, 1, 1])); u.lift.value.set(...(g.lift || [0, 0, 0])); u.seed.value = Math.floor(t * 30) % 97;
    pass(comp, null);
  };
})();


// ================= REEL RUNTIME =================
const scenes = [];
function defScene(start, end, build) { const s = { start, end }; Object.assign(s, build()); scenes.push(s); return s; }
function newScene() { const s = new THREE.Scene(); CUR = s; return s; }
// cfg: { duration, grades[], captions[[t0,t1,html]], fade(t), flash(t), title:{in,out}, endlogo:{in,out}, brandOut, captionTop(t), shake(t) }
function startReel(cfg) {
  DURATION = cfg.duration || 60;
  scenes.forEach((s, i) => { s.grade = s.grade || (cfg.grades || [])[i] || {}; });
  const $ = id => document.getElementById(id);
  const capEl = $('caption'), fadeEl = $('fade'), flashEl = $('flash'), titleEl = $('title'), endEl = $('endlogo'), brandEl = $('brand');
  let lastCap = null;
  function overlay(t) {
    const c = (cfg.captions || []).find(c => t >= c[0] && t < c[1]);
    const html = c ? '<span>' + c[2] + '</span>' : '';
    if (html !== lastCap) { capEl.innerHTML = html; lastCap = html; }
    capEl.style.top = cfg.captionTop ? cfg.captionTop(t) : '66%';
    fadeEl.style.opacity = cfg.fade ? cfg.fade(t) : 0;
    flashEl.style.opacity = cfg.flash ? cfg.flash(t) : 0;
    if (titleEl && cfg.title) { const ti = clamp((t - cfg.title.in) / 0.8, 0, 1) * (t < cfg.title.out ? 1 : 0);
      titleEl.style.opacity = ti; titleEl.style.transform = 'scale(' + (0.94 + 0.08 * ease((t - cfg.title.in) / 3.6)) + ')'; }
    if (endEl && cfg.endlogo) endEl.style.opacity = clamp((t - cfg.endlogo.in) / 0.6, 0, 1) * (t < cfg.endlogo.out ? 1 : 0);
    if (brandEl) brandEl.style.opacity = cfg.brandOut && t > cfg.brandOut ? 0 : 1;
  }
  function renderAt(t) {
    t = clamp(t, 0, DURATION - 0.0001);
    const s = scenes.find(s => t >= s.start && t < s.end) || scenes[scenes.length - 1];
    const u = (t - s.start) / (s.end - s.start);
    s.scene.updateMatrixWorld(true);
    s.update(t, u);
    (s.scene.userData.ticks || []).forEach(f => f(t, u));
    const a = cfg.shake ? cfg.shake(t) : 0;
    if (a) { const R = rng(Math.floor(t * 60)); s.cam.position.x += (R() - 0.5) * a; s.cam.position.y += (R() - 0.5) * a; }
    post(s.scene, s.cam, s.grade || {}, t);
    overlay(t);
  }
  window.renderAt = renderAt; window.DURATION = DURATION; window.FPS = FPS;
  scenes.forEach(s => { if (!s.scene.environment) s.scene.environment = envFor(s.scene, s.glint ?? 0.5); s.update(s.start, 0); renderer.compile(s.scene, s.cam); });
  window.READY = true;
  if (location.search.includes('render')) { document.body.classList.add('render'); return; }
  const btn = $('play'), scrub = $('scrub'), tc = $('tc'); scrub.max = DURATION;
  let playing = false, t0 = 0, base = 0;
  function fit() { const k = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = 'scale(' + k + ')'; stage.style.transformOrigin = 'top center'; }
  addEventListener('resize', fit); fit();
  function frame(now) { if (playing) { const t = base + (now - t0) / 1000; if (t >= DURATION) { playing = false; btn.textContent = 'Play'; } scrub.value = t; tc.textContent = t.toFixed(2); renderAt(t); } requestAnimationFrame(frame); }
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? 'Pause' : 'Play'; base = +scrub.value; if (base >= DURATION - 0.1) base = 0; t0 = performance.now(); };
  scrub.oninput = () => { playing = false; btn.textContent = 'Play'; tc.textContent = (+scrub.value).toFixed(2); renderAt(+scrub.value); };
  renderAt(0.8); requestAnimationFrame(frame);
}
