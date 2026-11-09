"use strict";
// Ed, Edd n Eddy: brick-built characters + Peach Creek cul-de-sac scenes (30s memory lane).
const pb = new THREE.BoxGeometry(1, 1, 1);
function hdr(r, g, b) { return new THREE.Color(r, g, b); }
function txtTex(text, bg, fg, w = 512, h = 192, font = 'bold 62px "DejaVu Sans", sans-serif') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 10; x.strokeRect(10, 10, w - 20, h - 20);
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = text.split('\n'); lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 76));
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
function signBoard(parent, text, bg, fg, x, y, z, w, h, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  box(w + 0.2, h + 0.2, 0.12, 0x5a3a20, 0, 0, -0.07, g);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: txtTex(text, bg, fg, 512, Math.round(512 * h / w)), roughness: 0.6 })); m.position.z = 0.01; g.add(m); return g;
}

// ---------- characters (same models in every scene) ----------
function eyesCover(f, col) { box(0.98, 0.34, 0.16, col, 0, 0.62, 0.38, f.userData.head); }
function legColors(f, sockCol, shoeCol) { for (const leg of [f.userData.legL, f.userData.legR]) { leg.children[1].material = plastic(shoeCol); if (sockCol) { leg.children[0].scale.y = 0.55; leg.children[0].position.y = -0.3; box(0.5, 0.62, 0.6, sockCol, 0, -0.84, 0, leg); } } }
function makeEd() {
  const OLIVE = 0x6e6630, SKIN = 0xf0d24e;
  const f = figure({ shirt: 0xf2ece2, pants: 0x7a58a8, skin: SKIN, hair: 0x15110d, hairStyle: 'short', scale: 1.28 });
  const h = f.userData.head, hip = 1.2;
  for (let i = 0; i < 5; i++) box(1.34, 0.16, 0.04, 0xa8302e, 0, hip + 0.35 + i * 0.28, 0.356, f);                  // red/white striped shirt
  box(0.45, 1.3, 0.8, OLIVE, -0.66, hip + 0.83, 0, f); box(0.45, 1.3, 0.8, OLIVE, 0.66, hip + 0.83, 0, f); box(1.5, 1.3, 0.2, OLIVE, 0, hip + 0.83, -0.32, f);   // open jacket
  box(1.5, 0.3, 0.8, OLIVE, 0, hip + 1.52, -0.05, f); box(0.08, 1.0, 0.04, 0xe8e4d8, -0.5, hip + 0.8, 0.42, f);        // collar + white sleeve stripe
  f.userData.armL.children[0].material = f.userData.armR.children[0].material = plastic(OLIVE);
  legColors(f, 0, 0x151515);
  for (const [x, r] of [[-0.36, 0.35], [-0.12, 0.1], [0.12, -0.1], [0.36, -0.35]]) { const sp = box(0.1, 0.42, 0.1, plastic(0x15110d), x, 1.05, 0.05, h); sp.rotation.z = r; }   // spiky hair
  box(0.62, 0.075, 0.05, plastic(0x15110d), 0, 0.7, 0.43, h);                      // unibrow
  box(0.5, 0.2, 0.04, plastic(0x7a2a2a), 0, 0.28, 0.425, h); box(0.4, 0.07, 0.03, plastic(0xffffff), 0, 0.34, 0.45, h);   // big grin
  return f;
}
function makeEdd() {
  const f = figure({ shirt: 0xd83a32, pants: 0x6a3a98, skin: 0xf2cba0, hair: 0x15110d, hairStyle: 'short', scale: 0.96 });
  const h = f.userData.head;
  box(1.02, 0.5, 1.0, plastic(0x141418), 0, 0.98, 0, h); box(1.04, 0.1, 1.02, plastic(0xf2f2f0), 0, 0.82, 0, h); box(1.0, 0.1, 1.0, plastic(0x141418), 0, 0.72, 0, h);   // sock hat + white stripe
  box(0.28, 0.5, 0.28, plastic(0x141418), 0.25, 1.42, -0.1, h).rotation.z = -0.5;
  box(0.12, 0.14, 0.04, plastic(0xe8b98a), 0.12, 0.6, 0.44, h);
  legColors(f, 0xc8302a, 0x4a78c8);                                                      // red socks, blue shoes
  const clip = new THREE.Group(); box(0.7, 0.95, 0.05, 0x8a6a40, 0, 0, 0, clip); box(0.58, 0.8, 0.03, 0xf2eee0, 0, -0.02, 0.04, clip); box(0.3, 0.1, 0.06, 0x555555, 0, 0.45, 0.02, clip);
  clip.position.set(0, -1.0, 0.4); clip.rotation.x = -1.1; f.userData.armL.add(clip);
  return f;
}
function makeEddy() {
  const f = figure({ shirt: 0xf2d02a, pants: 0x3a98b8, skin: 0xe8a0a8, hair: 0x15110d, hairStyle: 'bald', scale: 0.84 });
  const h = f.userData.head; h.children.forEach(c => { if (c.material && c.material.color && c.material.color.getHex() === 0x9a9a9a) c.visible = false; });
  for (const [x, r, l] of [[-0.2, 1.25, 0.8], [0.02, 1.5, 0.9], [0.24, 1.2, 0.7]]) { const st = box(0.05, l, 0.05, plastic(0x15110d), x + (x < 0 ? -0.35 : x > 0.1 ? 0.35 : 0), 1.05, 0, h); st.rotation.z = x < 0 ? r : -r; }   // long thin hair strands
  box(0.62, 0.1, 0.04, plastic(0x15110d), 0, 0.72, 0.43, h);
  box(0.58, 0.3, 0.04, plastic(0x8a2a2a), 0, 0.26, 0.43, h); box(0.46, 0.08, 0.03, plastic(0xffffff), 0, 0.33, 0.45, h);   // huge grin
  box(0.22, 1.28, 0.74, 0xd83a2a, 0.15, 2.03, 0, f);                                    // red stripe down the shirt
  box(1.0, 0.16, 0.76, 0x5a3a90, 0, 2.62, 0, f); box(0.4, 0.3, 0.46, 0x5a3a90, -0.9, 1.3 + 0.34, 0, f.userData.armL); f.userData.armL.children.pop().visible = false;   // purple collar
  for (const arm of [f.userData.armL, f.userData.armR]) box(0.4, 0.2, 0.44, 0x5a3a90, 0, -0.9, 0, arm);                // purple cuffs
  legColors(f, 0, 0xc83a2a);
  return f;
}
function makeKanker(hairCol, shirtCol) {
  const f = figure({ shirt: shirtCol, pants: 0x3a3a46, hair: hairCol, hairStyle: 'bob', dress: true, skin: 0xe8c09a, scale: 0.98 });
  eyesCover(f, plastic(hairCol));                                                      // bangs over the eyes
  box(0.1, 0.14, 0.04, plastic(0xc87a6a), 0, 0.34, 0.435, f.userData.head);
  return f;
}
function makeKid(shirt, hair) { return figure({ shirt, pants: 0x3a3a52, hair, hairStyle: 'short', scale: 0.7 }); }

// ---------- props ----------
function jawbreaker(r = 0.6) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), q = rng(5);
  x.fillStyle = '#f4f0e8'; x.fillRect(0, 0, 256, 128); const cols = ['#e8302a', '#f2d02a', '#3aa8e8', '#7ad048', '#e86ab8', '#f08a2a', '#7a4ac8'];
  for (let i = 0; i < 70; i++) { x.fillStyle = cols[i % 7]; x.beginPath(); x.ellipse(q() * 256, q() * 128, 10 + q() * 26, 8 + q() * 18, q() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), new THREE.MeshStandardMaterial({ map: t, roughness: 0.18 })); m.castShadow = true; return m;
}
function sunnyTree(scene, x, z, s = 1, leaf = [0x7a9a40, 0x8aaa48, 0x6a8a38]) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  box(0.9, 3.4, 0.9, 0x7a5030, 0, 1.7, 0, g); box(4, 1.6, 4, leaf[0], 0, 4.0, 0, g); box(3.2, 1.5, 3.2, leaf[1], 0.1, 5.2, 0, g); box(2, 1.2, 2, leaf[2], -0.1, 6.2, 0.1, g);
}
function peachHouse(scene, x, z, wall, roof, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); g.scale.setScalar(s); scene.add(g);
  box(8, 4.4, 6, wall, 0, 2.2, 0, g); box(1.5, 2.6, 0.12, 0x7a3a2a, -1.8, 1.3, 3.03, g);
  for (const wx of [1.2, 3.0]) { box(1.3, 1.3, 0.1, plastic(0xa8d8f8, { roughness: 0.1, emissive: 0x405870, emissiveIntensity: 0.25 }), wx, 2.6, 3.03, g); box(1.5, 0.14, 0.18, 0xffffff, wx, 1.9, 3.06, g); }
  for (let i = 0; i < 6; i++) box(8.8 - i * 1.3, 0.5, 6.8, roof, 0, 4.6 + i * 0.5, 0, g);
  box(0.9, 1.8, 0.9, 0x8a4a3a, 2.4, 6.4, -1, g); box(3.2, 0.3, 1.8, 0xe8e0d0, -1.8, 0.2, 3.9, g);
}
function peachCreek(scene, seed = 7, sunset = false) {
  const R = rng(seed);
  ground(scene, sunset ? 0x5a7a40 : 0x86a85a, 400);
  const road = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 0.12, 48), plastic(0x8a8aa0, { roughness: 0.9 })); road.position.y = 0.06; road.receiveShadow = true; scene.add(road);
  const curb = new THREE.Mesh(new THREE.RingGeometry(19, 23, 64), plastic(0xc8c8c2, { roughness: 0.95 })); curb.rotation.x = -Math.PI / 2; curb.position.y = 0.1; curb.receiveShadow = true; scene.add(curb);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(19.1, 0.2, 6, 64), plastic(0xa8a8a4)); edge.rotation.x = Math.PI / 2; edge.position.y = 0.16; scene.add(edge);
  const pal = [0xe8b4ac, 0xbfe0b4, 0xc8b8e0, 0xf0dcb0, 0xb4d4e8, 0xf0c0b8], roofs = [0x8a5a3a, 0x7a5a98, 0x6a4a3a, 0x7a6a50];
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, r = 31 + (i % 2) * 2; peachHouse(scene, Math.cos(a) * r, Math.sin(a) * r, pal[i % 6], roofs[i % 4], 0.95 + R() * 0.2); }
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, r = 25.5, cx = Math.cos(a) * r, cz = Math.sin(a) * r, ry = Math.atan2(-cx, -cz);    // picket fences
    for (let k = -4; k <= 4; k++) { const px = cx + Math.cos(ry) * k * 1.0, pz = cz - Math.sin(ry) * k * 1.0; const pk = box(0.5, 1.5 + (k % 2) * 0.12, 0.12, 0xc8a070, px, 0.75, pz); pk.rotation.y = ry; }
    const rl = box(9, 0.12, 0.1, 0xa88050, cx, 0.9, cz); rl.rotation.y = ry; }
  for (const [a, r] of [[0.9, 22.8], [2.4, 23.2], [4.1, 22.8], [5.5, 23.0]]) { const g = new THREE.Group(); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); scene.add(g);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.2, 14), plastic(0x8a8e94, { roughness: 0.5, metalness: 0.3 })); can.position.y = 0.6; can.castShadow = true; g.add(can); box(1.05, 0.12, 1.05, 0x6a6e74, 0, 1.25, 0, g).scale.set(1, 1, 1); }
  { const g = new THREE.Group(); g.position.set(Math.cos(3.3) * 24.5, 0, Math.sin(3.3) * 24.5); g.rotation.y = 1; scene.add(g); for (const x of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 20), plastic(0x2a2a2a)); w.position.set(x, 0.55, 0); g.add(w); } box(1.6, 0.08, 0.08, 0xd83a3a, 0, 0.95, 0, g).rotation.z = 0.2; box(0.08, 0.5, 0.08, 0x2a2a2a, 0.7, 1.15, 0, g); }
  for (let i = 0; i < 16; i++) { const a = R() * Math.PI * 2, r = 42 + R() * 28; sunnyTree(scene, Math.cos(a) * r, Math.sin(a) * r, 1 + R() * 0.8, sunset ? [0x5a7a38, 0x6a8a40, 0x4a6a32] : undefined); }
  for (let i = 0; i < 300; i++) { const a = R() * Math.PI * 2, r = 20 + R() * 12; box(0.16, 0.25 + R() * 0.2, 0.16, [0x4aa83a, 0x62c04a][i % 2], Math.cos(a) * r, 0.2, Math.sin(a) * r); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.7, p = [Math.cos(a) * 21, Math.sin(a) * 21]; box(0.2, 5, 0.2, 0x3a3a40, p[0], 2.5, p[1]); box(0.9, 0.3, 0.9, plastic(0xfff0b0, { emissive: 0xffe090, emissiveIntensity: sunset ? 1.5 : 0.3 }), p[0], 5.1, p[1]); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 1.1, x = Math.cos(a) * 20.4, z = Math.sin(a) * 20.4; box(0.2, 1.1, 0.2, 0x6a4a30, x, 0.55, z); box(0.7, 0.5, 0.9, 0xc83a3a, x, 1.3, z); }
}

// ================= SCENES (30 s timeline) =================
// 1 (0-3.6): crane into the cul-de-sac as the Eds walk in
defScene(0, 3.6, () => {
  const scene = newScene();
  scene.background = gradientSky([[0, '#d8b068'], [0.4, '#eccb86'], [0.75, '#f6dca8'], [1, '#fbe8c4']]); scene.fog = new THREE.Fog(0xf0dcb0, 110, 420);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x6a8048, 0.55)); sun(scene, 0xfff0d0, 1.9, V(-40, 70, 40), V(0, 0, 0), 70);
  peachCreek(scene, 7);
  const ed = makeEd(), edd = makeEdd(), eddy = makeEddy(); scene.add(ed, edd, eddy);
  const birds = particleField(scene, 3, 30, { x0: -30, x1: 30, y0: 16, y1: 30, z0: -30, z1: 10 }, 0x222222, 0.5, { vx: 1, drift: 3, opacity: 0.7 });
  const cam = camera(48);
  return { scene, cam, update(t, u) {
    birds(t); const lt = t, z = -9 + lt * 3.3;
    ed.position.set(-2.2, 0.1, z - 0.3); edd.position.set(0.2, 0.1, z); eddy.position.set(2.2, 0.1, z - 0.2);
    [ed, edd, eddy].forEach((f, i) => { f.rotation.y = 0; walkCycle(f, t + i * 0.4, 7, 0.5); f.position.y = 0.1 + Math.abs(Math.sin(t * 7 + i)) * 0.06; });
    eddy.userData.armR.rotation.x = -0.4 + Math.sin(t * 7) * 0.6;
    const d = ease(u / 0.85);
    lookFrom(cam, V(lerp(20, 3, d), lerp(36, 3.2, d), lerp(46, 15, d)), V(0, lerp(2, 2.6, d), lerp(0, z, d)));
  } };
});

// 2 (3.6-7.2): the crew hatches a plan
defScene(3.6, 7.2, () => {
  const scene = newScene();
  scene.background = gradientSky([[0, '#d8b068'], [0.45, '#eccb86'], [1, '#fbe8c4']]); scene.fog = new THREE.Fog(0xf0dcb0, 110, 420);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x6a8048, 0.5)); sun(scene, 0xfff0d0, 1.8, V(-20, 40, 30), V(0, 0, 0), 30);
  peachCreek(scene, 7);
  const crate = box(2.6, 1.4, 1.8, 0x9a6a3a, 0, 0.7, 0); box(2.2, 0.06, 1.5, 0xe8f0f8, 0, 1.43, 0);
  const plan = [[-0.8, 0.5], [-0.2, -0.3], [0.5, 0.4], [0.9, -0.2]]; plan.forEach(([x, z], i) => box(0.5, 0.02, 0.06, 0x2a4ac8, x, 1.47, z * 0.6).rotation.y = i * 0.7);
  const ed = makeEd(), edd = makeEdd(), eddy = makeEddy(); scene.add(ed, edd, eddy);
  ed.position.set(-3.0, 0, -0.6); ed.rotation.y = 0.6; edd.position.set(3.0, 0, -0.4); edd.rotation.y = -0.6; eddy.position.set(0, 0, 2.3); eddy.rotation.y = Math.PI * 0.08;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), new THREE.MeshBasicMaterial({ color: hdr(3, 2.6, 1.2) })); scene.add(bulb);
  box(0.26, 0.26, 0.26, 0x8a8a8a, 0, 0, 0).visible = false;
  const bl = new THREE.PointLight(0xffe890, 0, 18); scene.add(bl);
  const cam = camera(46);
  return { scene, cam, update(t, u) {
    const on = u > 0.3 ? 1 : 0; bulb.visible = !!on; bulb.position.set(0, 5.2 + Math.sin(t * 4) * 0.08, 2.3); bl.position.copy(bulb.position); bl.intensity = on * (3 + Math.sin(t * 20));
    eddy.userData.armL.rotation.set(-1.2 + Math.sin(t * 6) * 0.3, 0, 0.7); eddy.userData.armR.rotation.set(-1.2 - Math.sin(t * 6) * 0.3, 0, -0.7);
    eddy.userData.head.rotation.x = -0.15 + 0.06 * Math.sin(t * 8);
    ed.userData.head.rotation.z = Math.sin(t * 2) * 0.12; ed.userData.armR.rotation.x = -0.5; edd.userData.armR.rotation.x = -1.2; edd.userData.head.rotation.y = Math.sin(t * 1.5) * 0.3;
    const a = -0.5 + u * 1.0;
    lookFrom(cam, V(Math.sin(a) * 9.5, 3.4 - u * 0.4, Math.cos(a) * 9.5 + 0.6), V(0, 2.6, 0.6));
  } };
});

// 3 (7.2-11.0): the scam goes boom, giant jawbreaker rolls out
defScene(7.2, 11.0, () => {
  const scene = newScene();
  scene.background = gradientSky([[0, '#d8b068'], [0.45, '#eccb86'], [1, '#fbe8c4']]); scene.fog = new THREE.Fog(0xf0dcb0, 110, 420);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x6a8048, 0.5)); sun(scene, 0xfff0d0, 1.8, V(-20, 40, 30), V(0, 0, 0), 30);
  const flashL = new THREE.PointLight(0xffa040, 0, 40); flashL.position.set(0, 3, -1); scene.add(flashL);
  peachCreek(scene, 7);
  const booth = new THREE.Group(); scene.add(booth); const planks = [];
  const add = (w, h, d, c, x, y, z) => { const m = box(w, h, d, c, x, y, z, booth); m.userData.p0 = m.position.clone(); m.userData.v = V((Math.random() - 0.5) * 0, 0, 0); return m; };
  const R = rng(33);
  planks.push(add(4.2, 1.7, 1.8, 0xb8905a, 0, 0.85, 0), add(4.4, 0.14, 2.0, 0xa07848, 0, 1.75, 0), add(0.2, 3.6, 0.2, 0x7a5a38, -1.9, 3.4, -0.5), add(0.2, 3.6, 0.2, 0x7a5a38, 1.9, 3.4, -0.5));
  planks.push(signBoard(booth, 'SCHEME', '#a88050', '#3a2410', 0, 4.4, -0.45, 3.9, 1.0), signBoard(booth, 'JAWBREAKERS\n25¢', '#c8a06a', '#4a3018', 0, 0.95, 0.92, 3.5, 1.05));
  for (let i = 0; i < 8; i++) planks.push(add(0.6, 0.12, 0.5, [0xb8905a, 0xa07848, 0xd8b078][i % 3], -1.6 + (i % 4) * 1.0, 1.95 + Math.floor(i / 4) * 0.5, 0.2));
  planks.forEach((m, i) => { m.userData.v = V((R() - 0.5) * 14, 7 + R() * 9, 3 + R() * 9); m.userData.s = V(R() * 9, R() * 9, R() * 9); m.userData.p0 = m.position.clone(); });
  const eddy = makeEddy(), ed = makeEd(), edd = makeEdd(); scene.add(eddy, ed, edd);
  eddy.position.set(0, 0, -0.9); ed.position.set(-3.6, 0, -0.2); ed.rotation.y = 0.5; edd.position.set(3.4, 0, -0.1); edd.rotation.y = -0.5;
  const kids = [makeKid(0xe85a8a, 0xf2d060), makeKid(0x4a8ad8, 0x6a3a1a), makeKid(0x4ab86a, 0x2a1a0a)]; kids.forEach((k, i) => { k.position.set(-2 + i * 2.1, 0, 4.5 + i * 0.7); k.rotation.y = Math.PI + (i - 1) * 0.3; scene.add(k); });
  const jb = jawbreaker(1.3); scene.add(jb); jb.visible = false;
  const boom1 = smokeField(scene, 9, 36, { x0: -3, x1: 3, z0: -2, z1: 2, y0: 1, y1: 3 }, 0xd8d0c0, { size: 3.2, rise: 2.2, opacity: 0.6, life: 4 });
  const fl = []; for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: [0xff7a1a, 0xffc040, 0xffe890][i % 3], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(s); fl.push(s); }
  const cam = camera(46);
  return { scene, cam, update(t, u) {
    const BT = 0.52, k = Math.max(0, (u - BT) * 3.8), bang = u > BT;
    planks.forEach(m => { const v = m.userData.v, s = m.userData.s, p0 = m.userData.p0; if (!bang) { m.position.copy(p0); m.rotation.set(0, 0, 0); return; }
      m.position.set(p0.x + v.x * k, Math.max(0.1, p0.y + v.y * k - 14 * k * k), p0.z + v.z * k); m.rotation.set(s.x * k, s.y * k, s.z * k); });
    smokeFn = null; boom1(bang ? t : 0); 
    fl.forEach((s, i) => { const R2 = rng(i * 7 + 2); const a = R2() * 6.28; s.visible = bang && k < 0.7; const sz = (1.6 + R2() * 1.6) * Math.sin(Math.PI * Math.min(1, k / 0.7)); s.position.set(Math.cos(a) * k * 5, 1.5 + R2() * 2 + k * 2, Math.sin(a) * k * 3); s.scale.set(sz, sz, 1); });
    flashL.intensity = bang && k < 0.4 ? 5 * (1 - k / 0.4) : 0;
    jb.visible = u > BT + 0.04; const jk = Math.max(0, u - BT - 0.04) * 3.8; jb.position.set(0, 1.3 + Math.abs(Math.sin(jk * 5)) * Math.max(0, 1.2 - jk) * 0.9, -1 + jk * 12); jb.rotation.x = jk * 11;
    eddy.userData.armL.rotation.set(-2.4 + Math.sin(t * 22) * 0.4, 0, 0.5); eddy.userData.armR.rotation.set(-2.4 - Math.sin(t * 22) * 0.4, 0, -0.5);
    eddy.position.y = bang ? Math.max(0, 1.2 - k * 6) : Math.abs(Math.sin(t * 7)) * 0.2; eddy.userData.head.rotation.x = bang ? -0.6 : 0;
    ed.userData.head.rotation.x = bang ? -0.5 : 0; edd.userData.armL.rotation.x = bang ? -2.6 : 0; edd.userData.armR.rotation.x = bang ? -2.6 : 0;
    kids.forEach((kd, i) => { kd.rotation.y = Math.PI + (bang ? Math.sin(k * 20 + i) * 0.3 : (i - 1) * 0.3); kd.userData.armR.rotation.x = bang ? -2.5 : 0; });
    const d = ease(u);
    lookFrom(cam, V(lerp(-7, 5, d), lerp(4.2, 4.8, d), lerp(17, 14, d)), V(0, 2.4, 1));
  } };
});
var smokeFn;

// 4 (11.0-14.4): Ed, butter toast and gravy
defScene(11.0, 14.4, () => {
  const scene = newScene();
  scene.background = gradientSky([[0, '#d8b068'], [0.45, '#eccb86'], [1, '#fbe8c4']]); scene.fog = new THREE.Fog(0xf0dcb0, 110, 420);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x6a8048, 0.55)); sun(scene, 0xfff0d0, 1.9, V(-20, 40, 30), V(0, 0, 0), 30);
  peachCreek(scene, 7);
  const ed = makeEd(); scene.add(ed); ed.position.set(0, 0, 0);
  const stack = new THREE.Group(); scene.add(stack);
  for (let i = 0; i < 7; i++) { box(1.5, 0.22, 1.5, i % 2 ? 0xd8a460 : 0xe8bc78, 0, i * 0.24, 0, stack); box(1.2, 0.07, 1.2, 0xf8e068, 0, i * 0.24 + 0.14, 0, stack); }
  const boat = new THREE.Group(); scene.add(boat); box(0.8, 0.5, 0.5, 0x8a5a2a, 0, 0, 0, boat); box(0.5, 0.3, 0.3, 0x5a3a1a, 0.5, 0.1, 0, boat); box(0.8, 0.06, 0.52, 0x6a4020, 0, 0.27, 0, boat);
  const eddy = makeEddy(), edd = makeEdd(); scene.add(eddy, edd); eddy.position.set(-3.0, 0, 2); eddy.rotation.y = 0.5; edd.position.set(3.0, 0, 2); edd.rotation.y = -0.5;
  const crumbs = particleField(scene, 21, 140, { x0: -3, x1: 3, y0: 0, y1: 9, z0: -2, z1: 3 }, 0xe8c078, 0.18, { vy: -1.4, drift: 1, opacity: 0.95 });
  const cam = camera(50);
  return { scene, cam, update(t, u) {
    crumbs(t);
    ed.userData.armL.rotation.set(-3.0, 0, 0.25); ed.userData.armR.rotation.set(-2.2 + Math.sin(t * 5) * 0.2, 0, -0.2);
    const sway = Math.sin(t * 4) * 0.05; ed.userData.head.rotation.x = -0.5 - 0.1 * Math.sin(t * 9); ed.userData.head.rotation.z = Math.sin(t * 3) * 0.1; ed.rotation.y = Math.sin(t * 1.2) * 0.2;
    ed.updateMatrixWorld(true); const hp = V(-1.0, 4.8, 0.3); ed.localToWorld(hp); stack.position.set(hp.x, hp.y + 0.7, hp.z); stack.rotation.z = sway * 3; stack.rotation.y = t * 0.8;
    const bp = V(1.0, 3.6, 0.9); ed.localToWorld(bp); boat.position.copy(bp); boat.rotation.z = -0.4 + Math.sin(t * 5) * 0.15;
    eddy.userData.armR.rotation.x = -2.8; eddy.userData.head.rotation.x = -0.5; edd.userData.head.rotation.x = -0.4; edd.userData.armL.rotation.x = -0.4;
    ed.position.y = Math.abs(Math.sin(t * 5)) * 0.15;
    const d = ease(u);
    lookFrom(cam, V(lerp(5, -2.5, d), lerp(1.4, 2.0, d), lerp(9, 7.5, d)), V(0, lerp(5, 5.6, d), 0));
  } };
});

// 5 (14.4-17.8): Double D's garage lab
defScene(14.4, 17.8, () => {
  const scene = newScene();
  scene.background = new THREE.Color(0x2a3040);
  scene.add(new THREE.HemisphereLight(0xc8d8f0, 0x2a2a30, 0.6));
  const lamp = new THREE.SpotLight(0xfff0d0, 5, 30, 0.8, 0.5); lamp.position.set(0, 10, 5); lamp.target.position.set(0, 2, 0); lamp.castShadow = true; scene.add(lamp, lamp.target);
  ground(scene, 0x6a6a70, 60); box(30, 12, 0.4, 0x8a96a8, 0, 6, -4); box(0.4, 12, 20, 0x7a869a, -9, 6, 4);
  box(10, 0.3, 3, 0x7a5a38, 0, 2.2, -1.5); for (const x of [-4.6, 4.6]) box(0.4, 2.2, 2.6, 0x5a4028, x, 1.1, -1.5);
  const gears = []; function gear(x, y, z, r, n, col, sp) { const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g); box(r * 1.7, r * 1.7, 0.3, col, 0, 0, 0, g); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const b = box(0.3, r * 0.5, 0.32, col, Math.cos(a) * r, Math.sin(a) * r, 0, g); b.rotation.z = a + Math.PI / 2 + Math.PI / 2; } g.userData.sp = sp; gears.push(g); }
  gear(-3, 4.2, -3.2, 1.2, 10, 0xc8a040, 1.4); gear(-0.7, 4.8, -3.2, 0.9, 8, 0x9aa8b8, -1.9); gear(1.4, 4.2, -3.2, 1.3, 11, 0xc87a40, 1.3); gear(4, 5.0, -3.2, 0.8, 7, 0x7ab0d0, -2.4);
  const flasks = []; [[-3.8, 0x40ff80], [-2.4, 0xff60c0], [3.0, 0x60c0ff], [4.0, 0xffe040]].forEach(([x, c]) => { const g = new THREE.Group(); g.position.set(x, 2.35, -1.5); scene.add(g);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 1.2, 14), new THREE.MeshStandardMaterial({ color: 0xdfeaf4, transparent: true, opacity: 0.35, roughness: 0.1 })); gl.position.y = 0.6; g.add(gl);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 0.7, 14), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.3 })); liq.position.y = 0.4; g.add(liq); flasks.push(liq); });
  const coil = new THREE.Group(); coil.position.set(0, 2.4, -2.4); scene.add(coil); box(0.5, 1.6, 0.5, 0x6a6a74, 0, 0.8, 0, coil); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), plastic(0xb0b8c8, { metalness: 0.9, roughness: 0.2 })); ball.position.y = 1.9; coil.add(ball);
  const zapMat = new THREE.MeshBasicMaterial({ color: hdr(2.4, 3.2, 6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); const zaps = []; for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(pb, zapMat); m.visible = false; scene.add(m); zaps.push(m); }
  const edd = makeEdd(); scene.add(edd); edd.position.set(-0.4, 0, 0.5); edd.rotation.y = 0.2;
  const wrench = new THREE.Group(); box(0.14, 0.9, 0.14, 0x8a8a96, 0, -0.4, 0, wrench); box(0.4, 0.2, 0.16, 0x8a8a96, 0, -0.9, 0, wrench); wrench.position.y = -1.05; edd.userData.armR.add(wrench);
  const puff = smokeField(scene, 22, 22, { x0: -1, x1: 1, z0: -1, z1: 1, y0: 3, y1: 4 }, 0x1a1a1e, { size: 5, rise: 3, opacity: 0.9, life: 3 });
  const bub = particleField(scene, 23, 160, { x0: -4.4, x1: 4.4, y0: 2.8, y1: 6, z0: -1.9, z1: -1.1 }, 0xc8f8e0, 0.12, { vy: 1.2, drift: 0.3, additive: true, opacity: 0.9 });
  const cam = camera(40);
  return { scene, cam, update(t, u) {
    bub(t); gears.forEach(g => g.rotation.z = t * g.userData.sp); flasks.forEach((l, i) => l.material.emissiveIntensity = 0.7 + 0.5 * Math.sin(t * 6 + i * 1.7));
    zaps.forEach(m => m.visible = false); const fr = Math.floor(t * 24); if (u > 0.35 && u < 0.78) { const R2 = rng(fr); let k = 0; for (let b = 0; b < 3; b++) { let p = V(0, 4.3, -2.4); const tg = V((R2() - 0.5) * 7, 2.6 + R2() * 3, -2 + R2() * 2); for (let i = 0; i < 8 && k < 28; i++) { const q = p.clone().lerp(tg, 1 / (8 - i)); q.x += (R2() - 0.5) * 0.5; q.y += (R2() - 0.5) * 0.5; const m = zaps[k++]; m.visible = true; m.position.copy(p).lerp(q, 0.5); m.scale.set(0.06, 0.06, p.distanceTo(q)); m.lookAt(q); p = q; } } }
    puff(u > 0.8 ? t : 0);
    const turn = Math.sin(t * 5); edd.userData.armR.rotation.x = -1.8 + turn * 0.5; edd.userData.armL.rotation.x = -1.1; edd.userData.head.rotation.y = Math.sin(t * 1.4) * 0.35; edd.userData.head.rotation.x = 0.15;
    if (u > 0.8) { edd.position.y = 0; edd.userData.head.rotation.z = Math.sin(t * 40) * 0.06; }
    const d = ease(u);
    lookFrom(cam, V(lerp(4.5, 1.6, d), lerp(4.2, 3.4, d), lerp(11, 6.6, d)), V(lerp(0, -0.3, d), 3.2, -0.5));
  } };
});

// 6 (17.8-21.2): the Kankers give chase
defScene(17.8, 21.2, () => {
  const scene = newScene();
  scene.background = gradientSky([[0, '#d8b068'], [0.45, '#eccb86'], [1, '#fbe8c4']]); scene.fog = new THREE.Fog(0xf0dcb0, 110, 420);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x6a8048, 0.55)); sun(scene, 0xfff0d0, 1.8, V(-30, 50, 20), V(0, 0, 0), 50);
  peachCreek(scene, 7);
  const eds = [makeEd(), makeEdd(), makeEddy()], kank = [makeKanker(0xd8502a, 0x6a4a8a), makeKanker(0x2a5ad8, 0x2a8a8a), makeKanker(0xf2d02a, 0xd86aa8)];
  [...eds, ...kank].forEach(f => scene.add(f));
  const dust = smokeField(scene, 24, 40, { x0: -5, x1: 5, z0: -20, z1: 14, y0: 0.2, y1: 1 }, 0xd8c8a0, { size: 2.2, rise: 0.8, opacity: 0.2, life: 2.5 });
  const lines = particleField(scene, 25, 60, { x0: -8, x1: 8, y0: 0.5, y1: 5, z0: -10, z1: 12 }, 0xffffff, 0.12, { vy: 0, vx: 0, opacity: 0.0 });
  const cam = camera(52);
  return { scene, cam, update(t, u) {
    dust(t); const lt = t - 17.8, z = -8 + lt * 7.5; const sx = (i) => (i - 1) * 2.6;
    eds.forEach((f, i) => { f.position.set(sx(i) + Math.sin(t * 3 + i) * 0.4, Math.abs(Math.sin(t * 11 + i)) * 0.25, z + (i === 1 ? 0.6 : i === 2 ? -0.3 : 0)); f.rotation.y = 0; walkCycle(f, t * 1.7 + i, 12, 1.0); f.userData.armL.rotation.x = -2.8 + Math.sin(t * 12 + i) * 0.5; f.userData.armR.rotation.x = -2.8 - Math.sin(t * 12 + i) * 0.5; f.userData.head.rotation.x = -0.3; });
    kank.forEach((f, i) => { f.position.set(sx(i) * 0.9 + Math.sin(t * 2.5 + i) * 0.5, Math.abs(Math.sin(t * 10.5 + i)) * 0.25, z - 6.5 - i * 0.3 + Math.sin(t * 4 + i) * 0.4); f.rotation.y = 0; walkCycle(f, t * 1.7 + i + 2, 12, 1.0); f.userData.armL.rotation.x = -1.5; f.userData.armR.rotation.x = -1.5; });
    const sh = Math.sin(t * 40) * 0.06; lookFrom(cam, V(1.2 + sh, 2.3, z + 8.2), V(0, 1.9, z - 1));
  } };
});

// 7 (21.2-30): golden hour on the curb; pull back into the title
defScene(21.2, 30, () => {
  const scene = newScene();
  scene.background = gradientSky([[0, '#3a4a9a'], [0.45, '#e88a7a'], [0.78, '#ffb870'], [1, '#ffe0a0']]); scene.fog = new THREE.Fog(0xf0a878, 50, 260);
  scene.add(new THREE.HemisphereLight(0xffc890, 0x403a30, 0.7)); sun(scene, 0xff9a50, 3.0, V(-60, 14, -40), V(0, 0, 0), 40);
  peachCreek(scene, 7, true);
  const ed = makeEd(), edd = makeEdd(), eddy = makeEddy(); [ed, edd, eddy].forEach(f => scene.add(f));
  const px = [-2.4, 0, 2.0];
  [ed, edd, eddy].forEach((f, i) => { f.position.set(px[i], 0.45 - 1.2 * f.scale.y, 20.4); f.userData.legL.rotation.x = -1.5; f.userData.legR.rotation.x = -1.5; f.userData.armL.rotation.x = -0.4; f.userData.armR.rotation.x = -0.4; f.rotation.y = 0; });
  const jb = jawbreaker(0.5); scene.add(jb);
  const glow = new THREE.PointLight(0xffb060, 2.5, 30); glow.position.set(0, 4, 25); scene.add(glow);
  const fly = particleField(scene, 26, 140, { x0: -14, x1: 14, y0: 0.5, y1: 9, z0: 8, z1: 30 }, 0xffe890, 0.2, { vy: 0.1, drift: 2, additive: true, opacity: 0.95 });
  const sh = shaft(scene, V(-60, 22, -30), V(0, 0, 20), 3, 11, 0xffd0a0, 0.05);
  const cam = camera(46);
  return { scene, cam, update(t, u) {
    fly(t); const lt = t - 21.2;
    // the jawbreaker is passed along: Eddy -> Ed -> Edd, then all three look at the sky
    const holder = lt < 2.3 ? eddy : lt < 3.8 ? ed : edd; const hp = V(0, 0.2, 0.9); holder.localToWorld(hp); jb.position.copy(hp).add(V(0, 1.6 * holder.scale.y, 0)); jb.rotation.y = t;
    eddy.userData.head.rotation.y = lt < 3.8 ? -0.3 : 0; ed.userData.head.rotation.y = lt > 2.3 ? 0.2 : 0; eddy.userData.armR.rotation.x = -0.9 - 0.2 * Math.sin(t * 2);
    const look = ease((lt - 5.2) / 1.2); [ed, edd, eddy].forEach((f, i) => { f.userData.head.rotation.x = -0.35 * look; });
    const d = ease(lt / 8.8);
    lookFrom(cam, V(lerp(3.6, 6, d), lerp(2.0, 6.5, d), lerp(24.4, 40, d)), V(0, lerp(1.8, 3.4, d), 20.4));
  } };
});
