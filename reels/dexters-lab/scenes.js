"use strict";
// Dexter's Laboratory memory lane: brick-built lab hall (neon sign, glowing path), characters, 7 scenes on a 30 s timeline.
function hdr(r, g, b) { return new THREE.Color(r, g, b); }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function neonTex(text) {
  return canvasTex(1024, 256, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.font = 'bold 150px "DejaVu Sans", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const [lw, col, blur] of [[20, '#0a6a8a', 40], [10, '#40d8ff', 20], [4, '#d8fbff', 4]]) { x.shadowColor = '#30c8ff'; x.shadowBlur = blur; x.strokeStyle = col; x.lineWidth = lw; x.strokeText(text, w / 2, h / 2); } });
}
function textPlate(text, bg, fg, w = 512, h = 192, size = 64) {
  return canvasTex(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16); x.fillStyle = fg; x.font = `bold ${size}px "DejaVu Sans", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const L = text.split('\n'); L.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (L.length - 1) / 2) * (size + 8))); });
}
function blueprintTex(seed) {
  return canvasTex(512, 384, (x, w, h) => { const q = rng(seed); x.fillStyle = '#0c3a6a'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(140,210,255,.35)'; x.lineWidth = 1;
    for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let j = 0; j < h; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
    x.strokeStyle = '#bfe8ff'; x.lineWidth = 3; x.strokeRect(150, 90, 120, 160); x.strokeRect(170, 40, 80, 50); x.beginPath(); x.arc(210, 160, 30, 0, 7); x.stroke();
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(150 + q() * 40, 100 + q() * 140); x.lineTo(60 + q() * 380, 40 + q() * 300); x.stroke(); } });
}
function glowMat(map, k = 1) { return new THREE.MeshBasicMaterial({ map, color: hdr(k, k, k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); }
function hidePatch(f) { f.userData.head.children.forEach(c => { if (c.material && c.material.color && c.material.color.getHex() === 0x9a9a9a) c.visible = false; }); }
function glasses(h, x0 = 0, big = 1) {
  for (const s of [-1, 1]) { box(0.46 * big, 0.38 * big, 0.06, plastic(0x0a0a0e), s * 0.24 * big + x0, 0.55, 0.43, h); box(0.34 * big, 0.26 * big, 0.07, plastic(0xa8e0f4, { emissive: 0x4a98c8, emissiveIntensity: 0.5, roughness: 0.1 }), s * 0.24 * big + x0, 0.55, 0.44, h);
    box(0.08, 0.09, 0.04, plastic(0x0a0a0e), s * 0.22 * big + x0, 0.55, 0.47, h); }
  box(0.14, 0.07, 0.06, plastic(0x0a0a0e), x0, 0.58, 0.43, h);
}

// ---------- characters ----------
function makeDexter() {
  const f = figure({ shirt: 0xf8f8fc, coat: 0xf8f8fc, pants: 0x181820, skin: 0xf6e4dc, hair: 0xd8602a, hairStyle: 'bald', scale: 0.82 });
  const h = f.userData.head; hidePatch(f); h.scale.setScalar(1.28);
  box(0.96, 0.14, 0.96, plastic(0xe0642a), 0, 0.94, 0, h); box(0.5, 0.22, 0.5, plastic(0xe0642a), -0.12, 1.1, 0.14, h).rotation.z = 0.25; box(0.3, 0.18, 0.4, plastic(0xe0642a), -0.38, 1.08, 0.2, h).rotation.z = 0.7;
  glasses(h); box(0.34, 0.06, 0.04, plastic(0x7a4a3a), 0, 0.24, 0.43, h);
  box(0.12, 0.1, 0.06, plastic(0xf0c8b8), 0, 0.4, 0.46, h);
  for (const a of [f.userData.armL, f.userData.armR]) { a.children[1].material = plastic(0x8a3ab8); a.children[1].scale.set(1.9, 1.3, 1.9); }
  for (const leg of [f.userData.legL, f.userData.legR]) { leg.children[1].material = plastic(0x0e0e12); leg.children[1].scale.set(1.15, 1.8, 1.3); }
  box(1.46, 0.2, 0.84, 0xf0f0f6, 0, 2.12, 0, f);
  return f;
}
function makeDeeDee() {
  const f = figure({ shirt: 0xf48ac0, pants: 0xfae6f0, skin: 0xf8d6c6, hair: 0xf2c230, hairStyle: 'bald', dress: true, scale: 1 });
  f.scale.set(0.9, 1.18, 0.9); const h = f.userData.head; hidePatch(f);
  box(0.98, 0.26, 0.98, plastic(0xf2c230), 0, 0.92, -0.02, h); box(0.9, 0.2, 0.2, plastic(0xf2c230), 0, 0.74, 0.4, h);
  for (const s of [-1, 1]) { const t1 = box(0.34, 0.8, 0.34, plastic(0xf2c230), s * 0.72, 0.78, 0, h); t1.rotation.z = -s * 0.5; const t2 = box(0.3, 0.55, 0.3, plastic(0xf2c230), s * 1.0, 1.28, 0, h); t2.rotation.z = -s * 0.8;
    box(0.22, 0.32, 0.03, plastic(0x4ab0f0), s * 0.17, 0.5, 0.425, h); box(0.09, 0.12, 0.03, plastic(0x0a0a0e), s * 0.17, 0.5, 0.45, h); box(0.1, 0.06, 0.02, plastic(0xf08090), s * 0.31, 0.32, 0.43, h); }
  box(0.36, 0.14, 0.04, plastic(0xc83a4a), 0, 0.25, 0.43, h);
  box(1.95, 0.14, 1.2, plastic(0xf8aad2), 0, 1.0, 0, f); for (const leg of [f.userData.legL, f.userData.legR]) { leg.children[1].material = plastic(0xf070a8); leg.children[1].scale.set(1, 1, 1.3); }
  return f;
}
function makeMandark() {
  const f = figure({ shirt: 0xf8f8fc, coat: 0xf4f4f8, pants: 0x181820, skin: 0xf0d2be, hair: 0x15110d, hairStyle: 'bald', scale: 1 });
  f.scale.set(0.92, 1.08, 0.92); const h = f.userData.head; hidePatch(f);
  box(0.96, 0.2, 0.96, plastic(0x15110d), 0, 0.94, 0, h); for (const [x, r] of [[-0.3, 0.5], [-0.08, 0.2], [0.14, -0.1], [0.34, -0.45]]) box(0.14, 0.5, 0.14, plastic(0x15110d), x, 1.18, 0.05, h).rotation.z = r;
  box(0.12, 0.34, 0.15, plastic(0xf4f4f4), -0.06, 1.2, 0.08, h).rotation.z = 0.2;
  glasses(h, 0, 0.9); box(0.6, 0.16, 0.04, plastic(0x7a2a2a), 0, 0.26, 0.43, h); box(0.5, 0.07, 0.03, plastic(0xffffff), 0, 0.31, 0.45, h);
  for (const a of [f.userData.armL, f.userData.armR]) { a.children[1].material = plastic(0x8a3ab8); a.children[1].scale.set(1.8, 1.3, 1.8); }
  for (const leg of [f.userData.legL, f.userData.legR]) leg.children[1].material = plastic(0x0e0e12);
  return f;
}
function makeParent(mom) {
  const f = figure({ shirt: mom ? 0xf2d040 : 0xd8a868, pants: mom ? 0xf2d040 : 0x4a5a78, skin: 0xf0cfb8, hair: mom ? 0xe86a2a : 0xe8c04a, hairStyle: mom ? 'bob' : 'short', dress: mom, scale: 1 });
  if (!mom) glasses(f.userData.head, 0, 0.8); return f;
}
function makeMonkey() {
  const g = new THREE.Group(), B = plastic(0x8a5a30), T = plastic(0xe8b890);
  box(0.9, 1.2, 0.7, B, 0, 1.0, 0, g); box(0.62, 0.8, 0.08, T, 0, 1.0, 0.36, g);
  const hd = new THREE.Group(); hd.position.y = 1.9; g.add(hd); box(0.9, 0.8, 0.8, B, 0, 0, 0, hd); box(0.6, 0.5, 0.06, T, 0, -0.06, 0.4, hd); box(0.2, 0.2, 0.08, B, -0.5, 0.1, 0, hd); box(0.2, 0.2, 0.08, B, 0.5, 0.1, 0, hd);
  box(0.12, 0.14, 0.04, plastic(0x111111), -0.16, 0.08, 0.44, hd); box(0.12, 0.14, 0.04, plastic(0x111111), 0.16, 0.08, 0.44, hd);
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 0.58, 1.5, 0); g.add(a); box(0.22, 1.5, 0.22, B, 0, -0.65, 0, a); a.rotation.z = s * 0.2; return a; });
  for (const s of [-1, 1]) box(0.3, 0.9, 0.3, B, s * 0.3, 0.3, 0, g);
  const tail = box(0.14, 0.14, 1.3, B, 0, 0.7, -0.9, g); tail.rotation.x = 0.7; g.userData = { arms, head: hd }; return g;
}
function makeRobot() {
  const g = new THREE.Group(), M = plastic(0x80869a, { metalness: 0.5, roughness: 0.45 }), D = plastic(0x5a5f72, { metalness: 0.5, roughness: 0.5 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x103a18, emissive: 0x40ff70, emissiveIntensity: 2 });
  const legs = [-1, 1].map(s => { const l = new THREE.Group(); l.position.set(s * 2.0, 6.0, 0); g.add(l); box(2.3, 5.4, 2.4, M, 0, -2.8, 0, l); box(2.0, 1.0, 2.2, D, 0, -1.2, 0.1, l); box(2.9, 1.0, 3.6, D, 0, -5.6, 0.5, l); return l; });
  box(7, 2.2, 3.8, D, 0, 6.4, 0, g); const torso = new THREE.Group(); torso.position.y = 7.5; g.add(torso);
  box(8.4, 6.6, 4.6, M, 0, 3.3, 0, torso); box(6.2, 4.4, 0.4, D, 0, 3.4, 2.4, torso); box(1.3, 1.3, 0.35, plastic(0xd8302a, { emissive: 0x801810, emissiveIntensity: 0.6 }), 0, 3.6, 2.7, torso).rotation.z = Math.PI / 4;
  for (let i = 0; i < 4; i++) box(5.4, 0.12, 0.15, plastic(0x30343e), 0, 1.4 + i * 0.5, 2.66, torso);
  box(2.2, 1.0, 2.2, D, 0, 6.9, 0, torso); box(3.6, 2.6, 3.0, M, 0, 8.5, 0.1, torso); box(3.0, 0.6, 0.3, plastic(0x1a1d26), 0, 8.7, 1.65, torso);
  box(0.7, 0.45, 0.4, eye, -0.8, 8.7, 1.72, torso); box(0.7, 0.45, 0.4, eye, 0.8, 8.7, 1.72, torso); box(0.16, 1.2, 0.16, D, 0.9, 10.4, 0, torso); box(0.4, 0.4, 0.4, plastic(0xd8302a, { emissive: 0xd8302a, emissiveIntensity: 1 }), 0.9, 11.1, 0, torso);
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 5.2, 6.0, 0); torso.add(a); box(2.0, 3.0, 2.0, D, 0, 0, 0, a); box(2.2, 3.8, 2.2, M, s * 0.2, -3.4, 0, a); box(2.6, 1.8, 2.4, D, s * 0.2, -6.0, 0.2, a); return a; });
  g.userData = { legs, torso, arms, eye }; return g;
}
function glowBubble(parent, r, tint = 0xaad8ff, op = 0.22) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: op, roughness: 0.05, metalness: 0.1, emissive: tint, emissiveIntensity: 0.25, depthWrite: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: tint, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 })); halo.scale.set(r * 3.4, r * 3.4, 1);
  parent.add(b, halo); return b;
}

// ---------- the lab hall (shared by shots 1-6) ----------
const HALL = (() => {
  const scene = newScene();
  scene.background = new THREE.Color(0x120a22); scene.fog = new THREE.Fog(0x1a0f30, 28, 110);
  scene.add(new THREE.HemisphereLight(0x8a78c8, 0x20143a, 0.7));
  const key = new THREE.SpotLight(0xe0e8ff, 3.2, 90, 0.55, 0.7); key.position.set(0, 22, 14); key.target.position.set(0, 0, -8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key, key.target);
  ground(scene, 0x261a3a, 300);
  for (let i = 0; i < 22; i++) box(4.8, 0.07, 2.3, plastic(0x2a2440, { roughness: 0.25, emissive: i % 2 ? 0x60b0d8 : 0xf8f0d4, emissiveIntensity: i % 2 ? 0.45 : 0.85 }), 0, 0.05, 16 - i * 2.5);
  for (let i = 0; i < 22; i++) for (const s of [-1, 1]) box(2.2, 0.05, 2.3, plastic(0x30284a, { roughness: 0.3, emissive: 0x2a3a6a, emissiveIntensity: 0.25 }), s * (4.4 + (i % 2) * 2.4), 0.04, 16 - i * 2.5);
  box(1, 24, 80, 0x2c2048, -12, 12, -20); box(1, 24, 80, 0x2c2048, 12, 12, -20); box(34, 26, 1, 0x241a3a, 0, 13, -60);
  for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { const z = 8 - k * 11; box(0.8, 9.5, 4.2, 0x14102a, s * 11.4, 4.75, z); box(0.9, 1.0, 5.0, 0x4a3a6a, s * 11.3, 9.9, z); box(0.9, 12, 0.9, 0x3a2e58, s * 11.3, 6, z + 3.4);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 20, 12), plastic(0x5a5a74, { metalness: 0.6, roughness: 0.4 })); p.position.set(s * 10.4, 10, z - 3); scene.add(p); }
  for (const [x, y] of [[-8, 16], [8, 15], [0, 19]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 70, 12), plastic(0x4a4a64, { metalness: 0.6, roughness: 0.4 })); p.rotation.x = Math.PI / 2; p.position.set(x, y, -22); scene.add(p); }
  // computer face on the back gantry
  box(18, 0.6, 5, 0x3a3a4e, 0, 13, -34); for (const x of [-9, 9]) box(0.2, 1.3, 5, 0x5a5a72, x, 13.9, -34); box(18, 0.2, 0.2, 0x5a5a72, 0, 14.5, -31.6);
  const face = new THREE.Group(); face.position.set(0, 17.2, -36); scene.add(face);
  box(8.4, 6.6, 1.2, 0x2a2e3e, 0, 0, 0, face); const scr = box(7.6, 5.8, 0.3, new THREE.MeshStandardMaterial({ color: 0x0a2a3a, emissive: 0x30c8f0, emissiveIntensity: 1.4 }), 0, 0, 0.7, face);
  const dark = plastic(0x06202c); for (const s of [-1, 1]) { const e = box(1.8, 0.8, 0.2, dark, s * 1.6, 0.9, 0.9, face); e.rotation.z = -s * 0.25; }
  box(5, 0.28, 0.2, dark, 0, -1.3, 0.9, face); for (let i = -2; i <= 2; i++) box(0.3, 0.7, 0.2, dark, i * 0.9, -1.0, 0.9, face).rotation.z = i * 0.06; box(5.3, 0.18, 0.2, dark, 0, -0.62, 0.9, face);
  const faceL = new THREE.PointLight(0x30c8f0, 2.2, 40); faceL.position.set(0, 16, -32); scene.add(faceL);
  // neon MEMORY LANE sign
  box(22, 1.1, 1.0, 0x8a4a2a, 0, 12.4, 4, scene); for (const s of [-1, 1]) { box(1.0, 8, 1.0, 0x7a3e24, s * 10.6, 8.4, 4, scene); const d = box(1.0, 5, 1.0, 0x7a3e24, s * 9.4, 11.4, 4, scene); d.rotation.z = s * 0.7; }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), glowMat(neonTex('MEMORY LANE'), 1.4)); sign.position.set(0, 10.9, 4.55); scene.add(sign);
  const signL = new THREE.PointLight(0x40d0ff, 3, 30); signL.position.set(0, 10, 7); scene.add(signL);
  // props: desk with blueprint monitor (left), omelette machine (right), button console, side machines
  const desk = new THREE.Group(); desk.position.set(-7.6, 0, 1.4); scene.add(desk); box(4.2, 1.8, 2.6, 0x5a4636, 0, 0.9, 0, desk); box(4.4, 0.18, 2.8, 0x7a6048, 0, 1.85, 0, desk);
  box(2.8, 2.0, 0.3, plastic(0x14203a), -0.2, 3.0, -0.8, desk); const bp = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.7), new THREE.MeshBasicMaterial({ map: blueprintTex(3), fog: false })); bp.position.set(-0.2, 3.0, -0.63); desk.add(bp);
  for (let i = 0; i < 4; i++) box(0.5, 0.3, 0.5, [0xd8302a, 0x40d870, 0xf2d02a, 0x40a0f0][i], 1.1 + (i % 2) * 0.6, 2.1, 0.2 + Math.floor(i / 2) * 0.6, desk);
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.5), glowMat(blueprintTex(7), 1.1)); holo.position.set(-5.2, 5.4, 1.4); holo.rotation.y = 0.5; scene.add(holo);
  const omel = new THREE.Group(); omel.position.set(8.0, 0, 3.0); omel.rotation.y = -Math.PI / 2; scene.add(omel);
  box(4.4, 3.4, 3.2, 0xb8bcc4, 0, 1.7 + 1.6, 0, omel).castShadow = true; box(4.6, 0.3, 3.4, 0x8a8e98, 0, 5.0, 0, omel); box(5.4, 3, 3, 0x5a4a3a, 0, 1.5, 0, omel);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.7), new THREE.MeshStandardMaterial({ map: textPlate('OMELETTE\nDU FROMAGE', '#d8d4c8', '#2a2a30', 512, 256, 62), roughness: 0.6 })); plate.position.set(0, 4.5, 1.61); omel.add(plate);
  box(2.0, 1.0, 0.3, plastic(0x2a2a34), 0, 3.2, 1.62, omel); box(1.6, 0.5, 0.2, plastic(0xffd860, { emissive: 0xffa020, emissiveIntensity: 1.2 }), 0, 3.1, 1.7, omel);
  const console_ = new THREE.Group(); console_.position.set(-2.6, 0, -4.2); scene.add(console_); box(3.6, 1.5, 1.6, 0x5a5a6e, 0, 0.75, 0, console_); box(3.8, 0.15, 1.8, 0x7a7a90, 0, 1.55, 0, console_);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0xd02020, emissive: 0xff2010, emissiveIntensity: 0.6, roughness: 0.3 })); btn.position.set(0, 1.78, 0.1); console_.add(btn);
  for (let i = 0; i < 5; i++) box(0.3, 0.2, 0.3, [0x40d870, 0xf2d02a, 0x40a0f0, 0x40d870, 0xe840a0][i], -1.4 + i * 0.35, 1.68, 0.5, console_);
  box(0.5, 3, 0.5, 0x4a4a5a, 1.4, 2.5, -0.4, console_); const alarmB = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshStandardMaterial({ color: 0x501010, emissive: 0xff2010, emissiveIntensity: 0 })); alarmB.position.set(1.4, 4.3, -0.4); console_.add(alarmB);
  const alarmL = new THREE.PointLight(0xff2a1a, 0, 35); alarmL.position.set(-1.2, 5.6, -3.6); scene.add(alarmL);
  for (const [z, s] of [[-4, 1], [-12, -1], [-12, 1], [-22, -1], [-22, 1], [-32, -1], [-32, 1]]) { const m = new THREE.Group(); m.position.set(s * 8.6, 0, z); scene.add(m); box(3.4, 1.2, 3.4, 0x4a3e62, 0, 0.6, 0, m);
    const dm = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), plastic(0x8a7a9a, { metalness: 0.6, roughness: 0.35 })); dm.position.y = 1.2; m.add(dm);
    box(1.0, 0.8, 0.2, plastic(0x40e0a0, { emissive: 0x40e0a0, emissiveIntensity: 0.9 }), 0, 1.9, 1.35, m); }
  const robot = makeRobot(); robot.position.set(8.6, 0, -9); robot.rotation.y = -0.35; scene.add(robot);
  const dust = particleField(scene, 77, 360, { x0: -10, x1: 10, y0: 0.5, y1: 16, z0: -40, z1: 14 }, 0xbfa8ff, 0.12, { vy: 0.15, drift: 1, additive: true, opacity: 0.8 }); tick(t => dust(t));
  // Mandark's memory bubble
  const mb = new THREE.Group(); mb.position.set(0, 5.4, -13); scene.add(mb); glowBubble(mb, 5.2, 0xd890ff, 0.2);
  const mandark = makeMandark(); mandark.scale.multiplyScalar(2.1); mandark.position.set(0, -4.6, 0); mb.add(mandark); const mbL = new THREE.PointLight(0xc060ff, 0, 40); mbL.position.set(0, 5.4, -9); scene.add(mbL);
  // omelette that pops out
  const omelette = new THREE.Group(); scene.add(omelette); box(1.4, 0.18, 1.0, 0xf2cf40, 0, 0, 0, omelette); box(0.9, 0.12, 0.7, 0xf8e070, 0, 0.14, 0, omelette); for (let i = 0; i < 4; i++) box(0.3, 0.14, 0.3, 0xf0a020, -0.3 + i * 0.2, 0.22, 0.1 * (i % 2), omelette);
  const steam = smokeField(scene, 41, 12, { x0: 5.4, x1: 5.9, z0: 2.6, z1: 3.4, y0: 3.2, y1: 3.6 }, 0xf0f0f0, { size: 1.2, rise: 1.2, opacity: 0.3, life: 2 });
  const dexter = makeDexter(), deedee = makeDeeDee(); scene.add(dexter, deedee);
  const sparksB = particleField(scene, 79, 160, { x0: -4, x1: -1, y0: 1.5, y1: 5, z0: -5, z1: -3 }, 0xffe070, 0.18, { vy: 3, drift: 1.2, additive: true, opacity: 0.0 });
  // flicker + glow
  tick((t) => { const fl = 1 + 0.12 * Math.sin(t * 47) * (Math.sin(t * 3.1) > 0.7 ? 1 : 0.15); sign.material.color.setScalar(1.4 * fl); signL.intensity = 3 * fl; faceL.intensity = 2.2 + 0.4 * Math.sin(t * 3); scr.material.emissiveIntensity = 1.3 + 0.25 * Math.sin(t * 2.3); });
  return { scene, dexter, deedee, robot, mandark, mb, mbL, omelette, omel, btn, alarmB, alarmL, desk, console_, steam, face };
})();
const away = (f) => { f.position.set(0, -60, 0); };
const cam0 = () => camera(52);

// shot 1 (0-4.2): sign reveal, Dexter & Dee Dee walk in
defScene(0, 4.2, () => { const cam = cam0(); return { scene: HALL.scene, cam, update(t, u) {
  const { dexter, deedee, robot, mb, omelette } = HALL; away(HALL.mandark.parent === mb ? omelette : omelette); omelette.position.set(0, -60, 0); mb.visible = false; HALL.mbL.intensity = 0; HALL.alarmL.intensity = 0;
  const z = -7 + t * 3.0; dexter.position.set(-1.5, 0, z); deedee.position.set(1.7, 0, z + 0.4); dexter.rotation.y = 0.15; deedee.rotation.y = -0.15;
  walkCycle(dexter, t, 7, 0.45); walkCycle(deedee, t + 0.5, 7, 0.55); dexter.userData.armR.rotation.x = 0.2; deedee.position.y = Math.abs(Math.sin(t * 7)) * 0.1; deedee.userData.armR.rotation.set(-0.4 + Math.sin(t * 7) * 0.5, 0, -0.9);
  robot.rotation.y = -0.35; robot.position.set(8.6, 0, -9); HALL.robot.userData.eye.emissiveIntensity = 2;
  const d = ease(u / 0.9), look = V(0, lerp(9.2, 2.6, d), lerp(4, z, d));
  lookFrom(cam, V(lerp(0, 0.5, d), lerp(4.5, 3.6, d), lerp(46, 16, d)), look);
} }; });

// shot 2 (4.2-8): Dexter at his desk, glasses glint
defScene(4.2, 8.0, () => { const cam = cam0(); return { scene: HALL.scene, cam, update(t, u) {
  const { dexter, deedee, mb, omelette } = HALL; mb.visible = false; omelette.position.set(0, -60, 0); HALL.mbL.intensity = 0; HALL.alarmL.intensity = 0; away(deedee);
  dexter.position.set(-4.5, 0, 1.4); dexter.rotation.y = -Math.PI / 2 - 0.1; walkCycle(dexter, 0, 0, 0);
  dexter.userData.armR.rotation.set(-1.5 + Math.sin(t * 9) * 0.25, 0, -0.2); dexter.userData.armL.rotation.set(-1.2, 0, 0.1); dexter.userData.head.rotation.x = 0.15; dexter.userData.head.rotation.y = Math.sin(t * 1.6) * 0.12;
  const d = ease(u); lookFrom(cam, V(lerp(3.2, 0.6, d), lerp(3.4, 3.0, d), lerp(12, 8.4, d)), V(lerp(-4.2, -4.6, d), lerp(2.2, 2.5, d), 1.4));
} }; });

// shot 3 (8-11.8): Dee Dee and the big red button
defScene(8.0, 11.8, () => { const cam = cam0(); return { scene: HALL.scene, cam, update(t, u) {
  const { dexter, deedee, btn, alarmB, alarmL, mb, omelette } = HALL; mb.visible = false; omelette.position.set(0, -60, 0); HALL.mbL.intensity = 0;
  const lt = t - 8.0, press = lt > 1.5; dexter.position.set(-5.2, 0, -2.4); dexter.rotation.y = 0.9;
  walkCycle(dexter, 0, 0, 0); dexter.userData.armR.rotation.x = press ? -2.8 + Math.sin(t * 25) * 0.3 : -1.2; dexter.userData.armL.rotation.x = press ? -2.8 : 0; dexter.userData.head.rotation.x = press ? -0.2 : 0;
  const tw = lt < 1.5 ? t * 3 : 0; deedee.position.set(lerp(1.2, -1.0, ease(lt / 1.4)), 0, -2.2); deedee.rotation.y = lt < 1.5 ? tw : -1.9; if (lt >= 1.5) { deedee.userData.armR.rotation.set(-1.3, 0, 0); deedee.userData.armL.rotation.set(-0.3, 0, 0.8); } else { deedee.userData.armR.rotation.set(-0.3, 0, -1.3); deedee.userData.armL.rotation.set(-0.3, 0, 1.3); }
  deedee.position.y = lt < 1.5 ? Math.abs(Math.sin(t * 6)) * 0.4 : 0; btn.position.y = press ? 1.65 : 1.78;
  const al = press ? (Math.sin((lt - 1.5) * 14) > -0.2 ? 1 : 0.1) : 0; alarmL.intensity = al * 12; alarmB.material.emissiveIntensity = al * 3; btn.material.emissiveIntensity = press ? 2 : 0.6;
  const d = ease(u); lookFrom(cam, V(lerp(5.5, 3.2, d), lerp(4.0, 3.4, d), lerp(10.5, 8.0, d)), V(-3.0, 2.5, -3.2));
} }; });

// shot 4 (11.8-15.4): the giant robot
defScene(11.8, 15.4, () => { const cam = cam0(); return { scene: HALL.scene, cam, update(t, u) {
  const { dexter, deedee, robot, mb, omelette } = HALL; mb.visible = false; omelette.position.set(0, -60, 0); HALL.mbL.intensity = 0; HALL.alarmL.intensity = 0;
  dexter.position.set(-0.8, 0, 4.2); dexter.rotation.y = 0.55; dexter.userData.armR.rotation.set(-2.5, 0, -0.3); dexter.userData.head.rotation.x = -0.35; walkCycle(dexter, 0, 0, 0); dexter.userData.armL.rotation.x = 0;
  deedee.position.set(2.6, 0, 4.6); deedee.rotation.y = -0.4; deedee.userData.armR.rotation.set(-2.9, 0, -0.2); deedee.userData.armL.rotation.set(-2.9, 0, 0.2); deedee.position.y = Math.abs(Math.sin(t * 5)) * 0.25;
  const lt = t - 11.8, step = lt * 1.3; robot.position.set(9.0 - step * 1.5, Math.abs(Math.sin(lt * 2.2 * Math.PI / 1.0)) * 0.06, -10 + step * 3.2); robot.rotation.y = -0.35 - step * 0.1;
  robot.userData.legs[0].rotation.x = Math.sin(lt * 4.2) * 0.35; robot.userData.legs[1].rotation.x = -Math.sin(lt * 4.2) * 0.35; robot.userData.arms[0].rotation.x = -Math.sin(lt * 4.2) * 0.3; robot.userData.arms[1].rotation.x = Math.sin(lt * 4.2) * 0.3;
  robot.userData.eye.emissiveIntensity = 2 + Math.sin(t * 8);
  const d = ease(u); lookFrom(cam, V(lerp(-3.6, -0.6, d), lerp(1.2, 2.2, d), lerp(21, 18, d)), V(robot.position.x * 0.75, lerp(8.5, 11, d), robot.position.z));
} }; });

// shot 5 (15.4-19): Mandark in a memory bubble
defScene(15.4, 19.0, () => { const cam = cam0(); return { scene: HALL.scene, cam, update(t, u) {
  const { dexter, deedee, mandark, mb, mbL, omelette } = HALL; away(deedee); omelette.position.set(0, -60, 0); HALL.alarmL.intensity = 0; mb.visible = true; mbL.intensity = 4 + Math.sin(t * 9);
  mb.position.set(0, 5.4 + Math.sin(t * 1.4) * 0.25, -11); mandark.position.set(0, -4.6, 0); mandark.rotation.y = Math.sin(t * 1.5) * 0.3;
  const lt = t - 15.4, laugh = Math.sin(lt * 14) > 0; mandark.userData.armL.rotation.set(-2.6 + (laugh ? 0.3 : 0), 0, 0.4); mandark.userData.armR.rotation.set(-2.6 + (laugh ? 0 : 0.3), 0, -0.4); mandark.userData.head.rotation.x = -0.25 + (laugh ? 0.12 : 0); mandark.userData.torso.rotation.x = laugh ? 0.12 : -0.05;
  dexter.position.set(-2.2, 0, 1.6); dexter.rotation.y = Math.PI + 0.25; walkCycle(dexter, 0, 0, 0); dexter.userData.armR.rotation.set(-2.9, 0, -0.1); dexter.userData.armR.position.y = 1.2 + 1.35; dexter.userData.head.rotation.x = -0.1 + Math.sin(t * 18) * 0.03;
  const d = ease(u); lookFrom(cam, V(lerp(1.5, 0.4, d), lerp(3.2, 4.0, d), lerp(18, 12, d)), V(0, lerp(3.6, 5.0, d), -10));
} }; });

// shot 6 (19-22.8): the omelette du fromage machine
defScene(19.0, 22.8, () => { const cam = cam0(); return { scene: HALL.scene, cam, update(t, u) {
  const { dexter, deedee, omelette, mb, steam } = HALL; mb.visible = false; HALL.mbL.intensity = 0; HALL.alarmL.intensity = 0; away(deedee);
  dexter.position.set(4.6, 0, 3.2); dexter.rotation.y = Math.PI / 2 - 0.15; walkCycle(dexter, 0, 0, 0);
  const lt = t - 19.0, pop = clamp((lt - 1.0) / 0.5, 0, 1);
  dexter.userData.armR.rotation.set(lt < 1.0 ? -1.6 + Math.sin(t * 20) * 0.2 : -0.3, 0, lt < 1.0 ? 0 : -0.5); dexter.userData.head.rotation.x = lt < 1.0 ? 0.1 : 0.2;
  dexter.userData.armL.rotation.set(0, 0, 0.1);
  omelette.position.set(5.6 + pop * 0.9, 3.15 - (lt > 1.5 ? Math.min(1.0, (lt - 1.5) * 0.8) : 0) + Math.sin(pop * Math.PI) * 0.5, 3.0); omelette.rotation.y = -0.3; omelette.visible = pop > 0;
  steam(t);
  const d = ease(u); lookFrom(cam, V(lerp(-2.2, 0.4, d), lerp(2.8, 3.0, d), lerp(13, 11.5, d)), V(lerp(5.4, 5.8, d), 2.6, 3.1));
} }; });

// ---------- shot 7 (22.8-30): the catwalk of memories ----------
defScene(22.8, 30, () => {
  const scene = newScene();
  scene.background = new THREE.Color(0x0a1830); scene.fog = new THREE.Fog(0x0e2038, 14, 70);
  scene.add(new THREE.HemisphereLight(0x6aa0d8, 0x101a30, 0.8)); const key = new THREE.SpotLight(0xcfe4ff, 4, 60, 0.7, 0.6); key.position.set(-2, 18, 12); key.target.position.set(0, 0, 0); key.castShadow = true; scene.add(key, key.target);
  const rim = new THREE.PointLight(0x40c0e0, 2, 40); rim.position.set(0, 8, -10); scene.add(rim);
  const floor = box(60, 0.4, 40, 0x1a2a40, 0, -9, -8); floor.receiveShadow = true;
  box(26, 0.25, 3.4, plastic(0x4a5a74, { metalness: 0.4, roughness: 0.4 }), 0, -0.13, 0); for (let i = -12; i <= 12; i += 2) box(0.08, 0.28, 3.4, 0x2a3a52, i, -0.1, 0);
  for (const z of [-1.6, 1.6]) { box(26, 0.12, 0.12, 0xa8b4c8, 0, 1.5, z); box(26, 0.12, 0.12, 0xa8b4c8, 0, 0.8, z); for (let i = -12; i <= 12; i += 2) box(0.12, 1.5, 0.12, 0xa8b4c8, i, 0.75, z); }
  const R = rng(5);
  for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, g = new THREE.Group(); g.position.set(-18 + i * 4.5, -4, -9 - R() * 4); scene.add(g); box(3.4, 14 + R() * 8, 3.4, [0x2a3c58, 0x344a68, 0x24344e][i % 3], 0, 7, 0, g);
    box(1.0, 1.0, 0.1, plastic(0x40e0a0, { emissive: 0x40e0a0, emissiveIntensity: 1 }), 0.8, 6 + R() * 8, 1.75, g); box(3.8, 1.0, 3.8, 0x4a5c7a, 0, 4, 0, g); }
  const gears = []; function gear(x, y, z, r, n, col, sp) { const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g); box(r * 1.8, r * 1.8, 0.8, col, 0, 0, 0, g); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const b = box(0.7, r * 0.55, 0.8, col, Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, 0, g); b.rotation.z = a; } g.userData.sp = sp; gears.push(g); }
  gear(-12, -2, -7, 3.2, 12, 0x4a5a70, 0.3); gear(11, 2, -6, 3.8, 14, 0x52627a, -0.25); gear(-5, 10, -14, 4.5, 16, 0x3a4a62, 0.2);
  for (const [x, c] of [[-9, 0x40ff80], [7.8, 0xff60c0], [12, 0x60c0ff]]) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 2.6, 14), new THREE.MeshStandardMaterial({ color: 0xdfeaf4, transparent: true, opacity: 0.3 })); gl.position.set(x, 1.3, -3.2); scene.add(gl);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, 1.5, 14), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1 })); liq.position.set(x, 0.9, -3.2); scene.add(liq); }
  const dexter = makeDexter(); scene.add(dexter);
  dexter.userData.armL.rotation.set(0.5, 0, 0.5); dexter.userData.armR.rotation.set(0.5, 0, -0.5); dexter.rotation.y = Math.PI / 2;
  const mems = []; function memory(mini, x, y, z, r, tint) { const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g); glowBubble(g, r, tint, 0.2); mini.position.y = -r * 0.62; mini.scale.multiplyScalar(r * 0.34); g.add(mini); mems.push([g, y, Math.random() * 6]); }
  memory(makeDeeDee(), -7.5, 5.4, -4.5, 2.1, 0xffc0e8); memory(makeMandark(), 6.5, 6.6, -5, 2.0, 0xd8a8ff); memory((() => { const g = new THREE.Group(); const m = makeParent(true), d = makeParent(false); m.position.x = -0.8; d.position.x = 0.8; g.add(m, d); return g; })(), 0.5, 8.6, -7, 1.9, 0xfff0b0);
  memory(makeMonkey(), 11.5, 4.2, -3.5, 1.7, 0xb8e8ff); memory((() => { const g = makeDexter(); g.userData.armR.rotation.x = -1.4; return g; })(), -2.6, 4.6, -3.0, 1.5, 0xaad8ff); { const rb = makeRobot(); memory(rb, -12, 9, -8, 3.2, 0xb8d0ff); rb.scale.multiplyScalar(0.55); }
  for (const [x, y, z, ry, s] of [[-5, 8.4, -6, 0.35, 1], [3.6, 10.5, -8, -0.3, 1.2], [9, 8.6, -7, -0.4, 0.9]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(4 * s, 3 * s), glowMat(blueprintTex(Math.floor(x * 3 + 20)), 1.2)); p.position.set(x, y, z); p.rotation.y = ry; scene.add(p); mems.push([p, y, x]); }
  const motes = particleField(scene, 83, 300, { x0: -14, x1: 14, y0: -1, y1: 14, z0: -10, z1: 6 }, 0x9ad8ff, 0.1, { vy: 0.3, drift: 1.2, additive: true, opacity: 0.8 }); tick(t => motes(t));
  const cam = camera(52);
  return { scene, cam, update(t, u) {
    gears.forEach(g => g.rotation.z = t * g.userData.sp); mems.forEach(([g, y, ph]) => g.position.y = y + Math.sin(t * 0.9 + ph) * 0.35);
    const lt = t - 22.8, x = -6 + lt * 1.1; dexter.position.set(x, 0, 0); walkCycle(dexter, t, 5.2, 0.38); dexter.userData.armL.rotation.set(0.6, 0, 0.45); dexter.userData.armR.rotation.set(0.6, 0, -0.45);
    dexter.userData.head.rotation.x = 0.08; dexter.userData.head.rotation.y = Math.sin(t * 0.5) * 0.25 - 0.1;
    const d = ease(lt / 7.2); lookFrom(cam, V(lerp(x - 1.5, x + 1.5, d), lerp(3.4, 8.0, d), lerp(15, 30, d)), V(lerp(x + 1.2, x + 2.5, d), lerp(2.4, 5.8, d), -2));
  } };
});
