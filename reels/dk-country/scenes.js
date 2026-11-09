"use strict";
// Donkey Kong Country saga memory lane: brick-built Kongs, K. Rool, Rambi, jungle / galleon / lake / volcano / ice scenes (30 s).
function hdr(r, g, b) { return new THREE.Color(r, g, b); }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function letterTex(ch) {
  return canvasTex(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = 'bold 200px "DejaVu Sans", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.strokeStyle = '#7a1a08'; x.lineWidth = 34; x.strokeText(ch, w / 2, h / 2 + 8); x.strokeStyle = '#ffe14d'; x.lineWidth = 16; x.strokeText(ch, w / 2, h / 2 + 8);
    const g = x.createLinearGradient(0, 40, 0, 220); g.addColorStop(0, '#ff9a2a'); g.addColorStop(1, '#e8301a'); x.fillStyle = g; x.fillText(ch, w / 2, h / 2 + 8); });
}
function flagTex() { return canvasTex(256, 192, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2f2ee'; x.beginPath(); x.arc(128, 80, 40, 0, 7); x.fill(); x.fillRect(100, 100, 56, 22);
  x.fillStyle = '#111'; x.beginPath(); x.arc(112, 78, 9, 0, 7); x.arc(144, 78, 9, 0, 7); x.fill(); x.strokeStyle = '#f2f2ee'; x.lineWidth = 12; x.beginPath(); x.moveTo(60, 150); x.lineTo(196, 170); x.moveTo(196, 150); x.lineTo(60, 170); x.stroke(); }); }

// ---------- characters ----------
function makeApe(o) {
  o = Object.assign({ fur: 0x6a3a1e, belly: 0xe0a878, scale: 1, arm: 1, bulk: 1, ear: 1, snout: 1 }, o);
  const g = new THREE.Group(), F = plastic(o.fur, { roughness: 0.9 }), T = plastic(o.belly), D = plastic(new THREE.Color(o.fur).multiplyScalar(0.55).getHex()), W = plastic(0xffffff), K = plastic(0x0a0a0a), bw = o.bulk;
  const legs = [-1, 1].map(s => { const l = new THREE.Group(); l.position.set(s * 0.58 * bw, 1.15, 0); g.add(l); box(0.85 * bw, 1.15, 0.95, F, 0, -0.55, 0, l); box(1.0 * bw, 0.45, 1.35, T, 0, -1.0, 0.25, l); return l; });
  const torso = new THREE.Group(); torso.position.y = 1.15; g.add(torso);
  box(2.0 * bw, 1.5, 1.25, F, 0, 0.75, 0, torso); box(2.6 * bw, 1.5, 1.45, F, 0, 2.0, 0, torso); box(1.7 * bw, 1.5, 0.16, T, 0, 1.7, 0.76, torso);
  const head = new THREE.Group(); head.position.set(0, 3.8, 0.2); torso.add(head);
  box(1.6, 1.4, 1.4, F, 0, 0, 0, head); box(1.45, 0.3, 0.34, D, 0, 0.42, 0.62, head); box(1.3, 0.95, 0.16, T, 0, -0.05, 0.72, head); box(1.15 * o.snout, 0.8, 0.55, T, 0, -0.3, 0.95, head);
  for (const s of [-1, 1]) { box(0.4, 0.42, 0.08, W, s * 0.32, 0.15, 0.8, head); box(0.17, 0.24, 0.08, K, s * 0.3 - s * 0.03, 0.14, 0.86, head);
    box(0.38 * o.ear, 0.62 * o.ear, 0.26, F, s * 0.92, 0.1, 0, head); box(0.26 * o.ear, 0.44 * o.ear, 0.1, T, s * 0.96, 0.1, 0.1, head); box(0.1, 0.12, 0.06, D, s * 0.2, -0.12, 1.24, head); }
  box(0.86, 0.38, 0.12, plastic(0x5a1010), 0, -0.52, 1.25, head); box(0.5, 0.15, 0.1, plastic(0xe0607a), 0, -0.62, 1.27, head); box(0.7, 0.08, 0.06, W, 0, -0.35, 1.28, head);
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 1.55 * bw, 2.85, 0); torso.add(a); box(0.74, 1.8 * o.arm, 0.74, F, 0, -0.9 * o.arm, 0, a); box(0.98, 0.84, 0.98, F, 0, -2.0 * o.arm, 0.1, a); box(0.84, 0.34, 0.5, T, 0, -2.2 * o.arm, 0.5, a); return a; });
  g.scale.setScalar(o.scale); g.userData = { legs, torso, head, arms, F, T }; return g;
}
const RED = 0xe02a20, YEL = 0xffd830;
function makeDK() { const a = makeApe({ fur: 0x6a3a1e, belly: 0xe8b080, scale: 1.0, arm: 1.15, bulk: 1.12, snout: 1.1 }); const t = a.userData.torso;
  box(1.5, 0.3, 0.34, RED, 0, 2.7, 0.8, t); const tie = new THREE.Group(); tie.position.set(-0.12, 2.5, 0.92); tie.rotation.z = 0.28; t.add(tie); box(0.54, 1.7, 0.1, RED, 0, -0.75, 0, tie); box(0.5, 0.46, 0.06, YEL, 0, -1.0, 0.07, tie); box(0.3, 0.3, 0.1, 0xb81a14, 0, 0.0, 0.02, tie); return a; }
function makeDiddy() { const a = makeApe({ fur: 0x8a4a28, belly: 0xf0c088, scale: 0.6, arm: 0.95, bulk: 0.85, ear: 1.6, snout: 1.15 }); const t = a.userData.torso, h = a.userData.head;
  box(2.2, 1.5, 1.35, RED, 0, 1.95, 0.02, t); box(0.5, 0.5, 0.05, YEL, 0, 2.2, 0.76, t).rotation.z = Math.PI / 4;
  box(1.75, 0.5, 1.65, RED, 0, 0.8, 0, h); box(1.4, 0.16, 0.9, RED, 0, 0.6, 1.0, h); box(0.36, 0.36, 0.05, YEL, 0, 0.86, 0.84, h).rotation.z = Math.PI / 4; box(1.75, 0.2, 1.65, plastic(0xffffff), 0, 0.5, 0, h);
  const tail = new THREE.Group(); tail.position.set(0, 0.7, -0.7); t.add(tail); [[0, 0.3, -0.5], [0, 0.9, -0.8], [0, 1.5, -0.7], [0, 1.9, -0.3]].forEach(([x, y, z], i) => box(0.3, 0.5, 0.3, plastic(0x8a4a28), x, y, z, tail).rotation.x = 0.3 * i); return a; }
function makeDixie() { const a = makeApe({ fur: 0x9a6238, belly: 0xf0c890, scale: 0.62, arm: 0.95, bulk: 0.8, ear: 1.3 }); const t = a.userData.torso, h = a.userData.head, P = 0xf06aa8;
  box(2.1, 1.0, 1.3, P, 0, 2.2, 0.03, t); box(2.0, 0.3, 1.7, P, 0.15, 0.82, 0, h).rotation.z = 0.12; box(1.1, 0.26, 1.1, P, 0.25, 1.05, 0, h).rotation.z = 0.15; for (const s of [-1, 1]) box(0.2, 0.28, 0.06, plastic(0x30a8b0), s * 0.3, 0.14, 0.9, h);
  const pony = new THREE.Group(); pony.position.set(-0.3, 0.55, -0.75); h.add(pony); const segs = []; let parent = pony; const W = [0.8, 0.95, 1.05, 0.95, 0.75];
  for (let i = 0; i < 5; i++) { const sg = new THREE.Group(); sg.position.set(0, i ? 0.25 : 0, i ? -0.55 : 0); parent.add(sg); const bend = new THREE.Group(); bend.rotation.x = i ? -0.32 : 0.1; sg.add(bend); box(W[i], 0.7, W[i], plastic(0xf6d03a), 0, 0.1, -0.1, bend); segs.push(sg); parent = bend; }
  a.userData.pony = pony; a.userData.ponySegs = segs; return a; }
function makeKiddy() { const a = makeApe({ fur: 0xb88858, belly: 0xf0d4a0, scale: 0.78, arm: 0.8, bulk: 1.25, ear: 1.2 }); a.userData.head.scale.setScalar(1.18); const t = a.userData.torso;
  box(2.9, 1.6, 1.6, 0x3a78d8, 0, 0.7, 0.0, t); box(0.5, 0.5, 0.08, YEL, 0, 1.0, 0.82, t); return a; }
function makeCranky() { const a = makeApe({ fur: 0x8a6a4a, belly: 0xc8a888, scale: 0.78, arm: 0.9, bulk: 0.95 }); const h = a.userData.head, WH = plastic(0xf6f6f2);
  box(1.6, 1.7, 0.6, WH, 0, -0.85, 0.85, h); for (const s of [-1, 1]) { box(0.36, 1.1, 0.7, WH, s * 0.85, -0.2, 0.5, h); box(0.44, 0.6, 0.5, WH, s * 0.95, 0.5, 0.0, h); }
  box(1.3, 0.34, 0.3, WH, 0, 0.45, 0.84, h); box(1.1, 0.3, 0.32, WH, 0, -0.2, 1.2, h); box(0.7, 0.26, 0.1, plastic(0x5a1010), 0, -0.55, 1.34, h);
  for (const ar of a.userData.arms) box(1.0, 0.4, 1.0, plastic(0x6a6e80), 0, -1.6, 0.05, ar);
  const cane = new THREE.Group(); cane.position.set(0.1, -2.1, 0.5); a.userData.arms[1].add(cane); box(0.14, 3.2, 0.14, 0x6a4020, 0, 0.6, 0, cane); box(0.5, 0.2, 0.2, 0x6a4020, 0.2, 2.2, 0, cane);
  a.userData.torso.rotation.x = 0.18; return a; }
function makeFunky() { const a = makeApe({ fur: 0xa86a3a, belly: 0xe8b880, scale: 0.9, arm: 1.0, bulk: 1.0 }); const h = a.userData.head, t = a.userData.torso;
  box(1.55, 0.42, 0.26, plastic(0x0a0a0e, { roughness: 0.1 }), 0, 0.2, 0.84, h); box(1.7, 0.36, 1.6, RED, 0, 0.62, 0, h); for (let i = -2; i <= 2; i++) box(0.14, 0.14, 0.06, plastic(0xffffff), i * 0.3, 0.64, 0.82, h); box(0.6, 0.18, 0.5, RED, -0.95, 0.5, -0.3, h);
  box(2.3, 1.25, 1.35, 0xf4f4f0, 0, 2.15, 0.02, t); box(2.2, 0.85, 1.3, 0x4ab8c8, 0, 0.45, 0, t); box(2.25, 0.14, 1.32, 0x6a4a2a, 0, 0.95, 0, t);
  const board = box(0.3, 4.4, 1.5, 0xf2f2ee, 0.2, 2.2, -0.95, t); box(0.32, 3.4, 0.5, 0xff6a2a, 0.2, 2.2, -0.95, t); board.rotation.z = 0.5; return a; }
function makeKRool() {
  const g = new THREE.Group(), G = plastic(0x4a9a3a), G2 = plastic(0x2e7a2a), Y = plastic(0xe8d070), W = plastic(0xf4f0e0);
  box(3.4, 3.4, 2.8, G, 0, 2.8, 0, g); box(2.4, 2.6, 0.2, Y, 0, 2.6, 1.46, g); box(3.8, 2.0, 1.6, plastic(0xc8301e), 0, 3.4, -1.6, g);
  const head = new THREE.Group(); head.position.set(0, 5.2, 0.5); g.add(head); box(2.4, 1.6, 2.2, G, 0, 0, 0, head); box(2.0, 0.9, 1.6, G, 0, -0.5, 1.6, head); const jaw = box(1.9, 0.5, 1.6, G2, 0, -1.0, 1.5, head);
  for (let i = -3; i <= 3; i++) { box(0.2, 0.34, 0.2, W, i * 0.26, -0.56, 2.28, head); box(0.2, 0.34, 0.2, W, i * 0.26, -0.84, 2.18, head); }
  for (const s of [-1, 1]) { box(0.6, 0.56, 0.1, W, s * 0.62, 0.45, 1.12, head); box(0.2, 0.3, 0.1, plastic(0xc81810), s * 0.62, 0.45, 1.18, head); box(0.8, 0.2, 0.2, G2, s * 0.62, 0.85, 1.12, head).rotation.z = -s * 0.4; }
  box(2.6, 0.5, 2.3, plastic(0xf2c030, { metalness: 0.8, roughness: 0.3 }), 0, 1.0, 0, head); for (const x of [-0.9, 0, 0.9]) box(0.5, 0.7, 0.5, plastic(0xf2c030, { metalness: 0.8, roughness: 0.3 }), x, 1.5, 0, head);
  box(0.4, 0.4, 0.3, plastic(0xd02a2a, { emissive: 0x801010, emissiveIntensity: 0.6 }), 0, 1.45, 0.95, head);
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 2.2, 4.2, 0.3); g.add(a); box(1.0, 2.2, 1.0, G, 0, -1.0, 0, a); box(1.2, 1.0, 1.2, G2, 0, -2.4, 0.2, a); return a; });
  for (const s of [-1, 1]) { box(1.3, 1.8, 1.4, G2, s * 1.0, 0.9, 0, g); box(1.5, 0.5, 2.0, G, s * 1.0, 0.25, 0.3, g); }
  const tail = box(0.9, 0.9, 3.0, G, 0, 1.2, -2.8, g); g.userData = { head, jaw, arms, tail }; return g;
}
function makeRambi() {
  const g = new THREE.Group(), S = plastic(0x8e929e, { roughness: 0.7 }), D = plastic(0x6a6e7a), W = plastic(0xf4f0e0);
  box(3.6, 2.4, 2.4, S, 0, 2.6, 0, g); box(3.0, 0.5, 2.0, D, 0, 3.9, 0, g);
  const head = new THREE.Group(); head.position.set(0, 2.9, 1.9); g.add(head); box(1.9, 1.7, 2.0, S, 0, 0, 0.5, head); box(1.4, 0.9, 1.0, D, 0, -0.4, 1.3, head);
  const horn = box(0.4, 1.4, 0.4, W, 0, 0.9, 1.5, head); horn.rotation.x = 0.7; for (const s of [-1, 1]) { box(0.16, 0.18, 0.06, plastic(0x0a0a0a), s * 0.5, 0.35, 1.52, head); const ear = box(0.4, 0.6, 0.2, S, s * 0.8, 0.9, 0.2, head); ear.rotation.z = -s * 0.3; }
  const legs = [[-1, 0.9], [1, 0.9], [-1, -0.9], [1, -0.9]].map(([sx, z]) => { const l = new THREE.Group(); l.position.set(sx * 1.2, 1.5, z); g.add(l); box(0.9, 1.5, 0.9, S, 0, -0.75, 0, l); box(1.0, 0.3, 1.1, D, 0, -1.4, 0.1, l); return l; });
  box(0.3, 0.3, 1.2, D, 0, 3.0, -2.0, g).rotation.x = 0.5; g.userData = { legs, head }; return g;
}
function makeWalrus() {
  const g = new THREE.Group(), B = plastic(0x8a5a38), L = plastic(0xd8b890), W = plastic(0xf4f0e0), H = plastic(0x8a8e9a, { metalness: 0.5, roughness: 0.4 });
  box(3.4, 2.4, 3.6, B, 0, 1.4, 0, g); box(2.4, 2.4, 2.0, B, 0, 2.6, 1.4, g); box(1.8, 1.0, 0.5, L, 0, 2.2, 2.5, g);
  for (const s of [-1, 1]) { box(0.3, 1.2, 0.3, W, s * 0.5, 1.5, 2.8, g); box(0.22, 0.22, 0.08, plastic(0x0a0a0a), s * 0.6, 3.1, 2.42, g); const fl = box(0.5, 1.8, 1.3, B, s * 1.9, 1.0, 0.5, g); fl.rotation.z = s * 0.5; const hn = box(0.3, 1.1, 0.3, W, s * 1.3, 4.1, 1.4, g); hn.rotation.z = -s * 0.6; }
  box(2.6, 0.9, 2.3, H, 0, 3.8, 1.4, g); box(0.3, 0.5, 0.3, plastic(0xd8a030), 0, 4.4, 1.4, g); g.userData = {}; return g;
}
function makePenguin() { const g = new THREE.Group(); box(0.8, 1.2, 0.6, 0x15151c, 0, 0.8, 0, g); box(0.5, 0.9, 0.1, 0xf4f4f8, 0, 0.8, 0.32, g); box(0.2, 0.12, 0.3, 0xf08a1a, 0, 1.2, 0.42, g); box(0.1, 0.1, 0.04, 0xffffff, -0.15, 1.3, 0.32, g); box(0.1, 0.1, 0.04, 0xffffff, 0.15, 1.3, 0.32, g); for (const s of [-1, 1]) box(0.3, 0.12, 0.4, 0xf08a1a, s * 0.2, 0.08, 0.15, g); return g; }
function bananas(sc = 1) { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = new THREE.Group(); b.rotation.y = i * 0.5 - 1; g.add(b); box(0.3, 0.9, 0.3, 0xffd830, 0.0, 0.0, 0, b).rotation.z = 0.3; box(0.3, 0.7, 0.3, 0xf2c820, 0.25, 0.65, 0, b).rotation.z = 0.8; box(0.18, 0.18, 0.18, 0x6a4a1a, 0.5, 1.0, 0, b); }
  box(0.2, 0.5, 0.2, 0x5a3a14, 0, 0.7, 0, g); g.scale.setScalar(sc); return g; }
function barrel(g, x, y, z, ry = 0) { const b = new THREE.Group(); b.position.set(x, y, z); b.rotation.y = ry; g.add(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.8, 1.7, 16), plastic(0x8a5a2c)); c.position.y = 0.85; c.castShadow = true; b.add(c);
  for (const yy of [0.25, 1.45]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.93, 0.16, 16), plastic(0x3a3a40, { metalness: 0.5 })); r.position.y = yy; b.add(r); } return b; }
function palm(scene, x, z, s = 1, lean = 0.1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.z = lean; scene.add(g);
  for (let i = 0; i < 6; i++) box(0.9 - i * 0.05, 1.5, 0.9 - i * 0.05, 0x8a6a40, Math.sin(i * 0.6) * 0.3, 0.75 + i * 1.5, 0, g);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, f = new THREE.Group(); f.position.set(0, 9.2, 0); f.rotation.y = a; g.add(f); box(0.5, 0.14, 3.6, [0x2a8a2a, 0x3aa03a, 0x2e9030][i % 3], 0, -0.3, 1.8, f).rotation.x = 0.4; box(0.4, 0.12, 2.0, 0x4ab04a, 0, -1.1, 3.8, f).rotation.x = 0.9; }
  box(0.7, 0.7, 0.7, 0x6a4a28, 0.4, 9.0, 0.3, g); return g;
}
function bush(scene, x, z, s = 1, col = 0x2e8a30) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); box(2.4, 1.4, 2.2, col, 0, 0.7, 0, g); box(1.8, 1.2, 1.8, 0x3aa03a, 0.3, 1.6, 0.1, g); box(1.2, 1.0, 1.2, 0x4ab04a, -0.2, 2.3, 0, g); return g; }
function rails(scene, x0, x1, y, z, axis = 'x') { const L = Math.abs(x1 - x0), m = (x0 + x1) / 2;
  for (const dz of [-0.55, 0.55]) { if (axis === 'x') box(L, 0.16, 0.16, 0x9a9aa4, m, y + 0.2, z + dz, scene); else box(0.16, 0.16, L, 0x9a9aa4, z + dz, y + 0.2, m, scene); }
  for (let p = x0; p <= x1; p += 1.3) { if (axis === 'x') box(0.3, 0.14, 1.7, 0x6a4a28, p, y + 0.08, z, scene); else box(1.7, 0.14, 0.3, 0x6a4a28, z, y + 0.08, p, scene); } }
function cart(color = 0x9a7a4a) { const g = new THREE.Group(); box(2.6, 1.0, 1.9, color, 0, 0.95, 0, g); box(2.8, 0.16, 2.1, 0x6a5a3a, 0, 1.5, 0, g); for (const [x, z] of [[-0.9, -0.95], [0.9, -0.95], [-0.9, 0.95], [0.9, 0.95]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 14), plastic(0x2a2a30)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.4, z); g.add(w); } return g; }
function dayLight(scene, sky = [[0, '#2a8ae8'], [0.6, '#7ac0f4'], [1, '#d8f0ff']], fog = 0xbfe0f4) {
  scene.background = gradientSky(sky); scene.fog = new THREE.Fog(fog, 70, 260); scene.add(new THREE.HemisphereLight(0xdcefff, 0x4a7a38, 0.6)); return sun(scene, 0xfff0d0, 2.2, V(-30, 60, 40), V(0, 0, 0), 60); }
const waveTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#2a7ac8'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; for (let i = 0; i < 24; i++) { const yy = i * 11; x.beginPath(); for (let k = 0; k <= 256; k += 8) x.lineTo(k, yy + Math.sin(k * 0.08 + i) * 3); x.stroke(); } });
function water(scene, w, d, x, y, z, col = 0x2a8ad0) { const t = waveTex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 10, d / 10); t.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, color: col, roughness: 0.2, metalness: 0.2 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); tick((tt) => { t.offset.set(tt * 0.02, tt * 0.03); }); return m; }
const cam0 = () => camera(52);

// ================= SCENES =================
// 1 (0-4.2): 1994 jungle: Donkey Kong and Diddy ride Rambi along the mine track; K. Rool lurks
defScene(0, 4.2, () => {
  const scene = newScene(); dayLight(scene); ground(scene, 0x4a8a3a, 400);
  box(7, 0.06, 120, 0x8a6a3a, 0, 0.03, -20); rails(scene, -60, 30, 0.0, 0, 'z');
  const R = rng(11); for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1; palm(scene, s * (7 + R() * 14), 20 - i * 3.6, 0.9 + R() * 0.5, s * 0.1); }
  for (let i = 0; i < 18; i++) bush(scene, (R() < 0.5 ? -1 : 1) * (5 + R() * 8), 20 - i * 5, 0.8 + R() * 0.8, [0x2e8a30, 0x3a9a34][i % 2]);
  for (let i = 0; i < 6; i++) barrel(scene, (i % 2 ? 1 : -1) * 4.4, 0, 12 - i * 11, i); for (let i = 0; i < 8; i++) { const b = bananas(1.2); b.position.set((i % 2 ? 1 : -1) * 2.6, 0.4 + (i % 3) * 0.3, 14 - i * 9); scene.add(b); }
  const kr = makeKRool(); kr.scale.setScalar(1.15); kr.position.set(-13, 0, -14); kr.rotation.y = 0.7; scene.add(kr); box(5, 1.6, 5, 0x6a6a74, -13, 0.8, -14, scene).position.y = -0.4;
  const rambi = makeRambi(), dk = makeDK(), diddy = makeDiddy(); scene.add(rambi, dk, diddy);
  const dust = smokeField(scene, 5, 22, { x0: -2, x1: 2, z0: -6, z1: 6, y0: 0.2, y1: 1 }, 0xd8c8a0, { size: 2.4, rise: 0.8, opacity: 0.25, life: 2 });
  const cam = cam0();
  return { scene, cam, update(t, u) {
    dust(t); const z = -16 + t * 8; rambi.position.set(0, Math.abs(Math.sin(t * 9)) * 0.18, z); rambi.rotation.y = 0; const sw = Math.sin(t * 9);
    rambi.userData.legs.forEach((l, i) => l.rotation.x = (i % 2 ? -sw : sw) * 0.5);
    dk.position.set(0, 4.2 + Math.abs(Math.sin(t * 9)) * 0.2, z + 0.2); dk.scale.setScalar(0.9); dk.userData.arms.forEach((a, i) => a.rotation.set(-1.5 + Math.sin(t * 9 + i) * 0.1, 0, i ? -0.3 : 0.3)); dk.userData.legs.forEach(l => l.rotation.x = -1.3);
    diddy.position.set(1.0, 5.0 + Math.abs(Math.sin(t * 9 + 1)) * 0.3, z - 0.9); diddy.rotation.y = 0.2; diddy.userData.arms[0].rotation.set(-2.9, 0, 0.3); diddy.userData.arms[1].rotation.set(-0.4, 0, 0); diddy.userData.legs.forEach(l => l.rotation.x = -1.2);
    kr.userData.jaw.position.y = -1.0 - 0.15 * Math.sin(t * 6); kr.userData.arms[0].rotation.z = 0.6 + Math.sin(t * 5) * 0.3; kr.rotation.y = 0.7 + Math.sin(t * 1.5) * 0.1;
    lookFrom(cam, V(lerp(6, 2.5, ease(u)), lerp(2.6, 3.4, ease(u)), z + 18), V(0, 4.4, z));
  } };
});

// 2 (4.2-8.4): 1995 pirate galleon: Diddy and Dixie at the bow
defScene(4.2, 8.4, () => {
  const scene = newScene(); dayLight(scene, [[0, '#3a8ae0'], [0.6, '#8ac8f4'], [1, '#fff0d0']], 0xd0e8f4); water(scene, 400, 400, 0, 0, 0);
  const ship = new THREE.Group(); scene.add(ship);
  box(9, 3.4, 24, 0x6a3e1c, 0, 1.0, 0, ship); box(7, 2.6, 6, 0x6a3e1c, 0, 1.4, 14, ship).rotation.x = -0.3; box(9.6, 0.3, 24.6, 0x4a2a12, 0, 2.7, 0, ship); box(8.4, 0.2, 23.4, 0x9a6a38, 0, 2.85, 0, ship);
  for (let i = -10; i <= 10; i += 2) { box(0.3, 1.2, 0.3, 0x4a2a12, 4.4, 3.4, i, ship); box(0.3, 1.2, 0.3, 0x4a2a12, -4.4, 3.4, i, ship); } box(0.3, 0.2, 21, 0x4a2a12, 4.4, 4.0, 0, ship); box(0.3, 0.2, 21, 0x4a2a12, -4.4, 4.0, 0, ship);
  for (const z of [-2, 6]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 20, 10), plastic(0x5a3a18)); m.position.set(0, 13, z); ship.add(m);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(9, 8, 6, 4), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, side: THREE.DoubleSide, roughness: 0.9 })); sail.position.set(0, 12.5, z + 0.6); ship.add(sail);
    box(10, 0.3, 0.3, 0x4a2a12, 0, 16.6, z, ship); box(10, 0.3, 0.3, 0x4a2a12, 0, 8.4, z, ship); }
  const nest = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 1.4, 12), plastic(0x6a4220)); nest.position.set(0, 22.5, -2); ship.add(nest);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.5, 6, 1), new THREE.MeshBasicMaterial({ map: flagTex(), side: THREE.DoubleSide })); flag.position.set(1.7, 24.5, -2); ship.add(flag);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 12), plastic(0x2a2a30, { metalness: 0.6, roughness: 0.4 })); c.rotation.z = Math.PI / 2; c.position.set(s * 4.2, 3.6, 4); ship.add(c); }
  box(3, 3.4, 7, 0x6a3e1c, 0, 4.5, -10, ship); for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8), plastic(0x222222)); }
  for (let i = 0; i < 4; i++) box(0.06, 14, 0.06, 0x2a2a2a, 0, 14, 2).rotation.set(0, 0, 0.0);
  const kr = makeKRool(); kr.scale.setScalar(0.9); kr.position.set(0, 3, -9); kr.rotation.y = 0.2; ship.add(kr);
  box(3.4, 0.6, 3.4, 0x2a2a30, 0, 6.6, -9.4, ship).visible = false;
  const diddy = makeDiddy(), dixie = makeDixie(); diddy.position.set(-1.2, 3.0, 12.0); dixie.position.set(1.4, 3.0, 12.2); ship.add(diddy, dixie); diddy.rotation.y = 0.35; dixie.rotation.y = -0.2;
  const fish = new THREE.Group(); box(0.9, 0.9, 3.4, 0x2a8ae8, 0, 0, 0, fish); box(0.4, 0.4, 2.6, 0xf2f2ee, 0, 0, 2.8, fish); box(0.2, 0.9, 0.9, 0x1a5ab8, 0, 0.7, -0.4, fish); box(0.3, 0.3, 0.06, 0xffffff, 0.2, 0.2, 1.62, fish); scene.add(fish);
  const spray = particleField(scene, 7, 160, { x0: -8, x1: 8, y0: 0.2, y1: 3, z0: 8, z1: 22 }, 0xe8f4ff, 0.2, { vy: 1, drift: 1, opacity: 0.8 }); tick(t => spray(t));
  const cam = cam0();
  return { scene, cam, update(t, u) {
    const lt = t - 4.2; ship.position.y = Math.sin(t * 1.3) * 0.25; ship.rotation.z = Math.sin(t * 1.1) * 0.03; ship.rotation.x = Math.sin(t * 0.9) * 0.02;
    flag.rotation.y = Math.sin(t * 4) * 0.2; kr.userData.arms[1].rotation.z = -0.5 + Math.sin(t * 6) * 0.3; kr.userData.jaw.position.y = -1.0 - 0.15 * Math.sin(t * 7);
    diddy.userData.arms[0].rotation.set(-1.4, 0, 0.4); diddy.userData.arms[1].rotation.set(-0.5, 0, 0); diddy.userData.head.rotation.y = 0.4; dixie.userData.arms[1].rotation.set(-0.5, 0, -0.3); dixie.userData.arms[0].rotation.set(-2.6 + Math.sin(t * 5) * 0.2, 0, 0.3);
    dixie.userData.ponySegs.forEach((s, i) => s.rotation.x = Math.sin(t * 4 - i * 0.5) * 0.25); diddy.position.y = 3.0 + Math.abs(Math.sin(t * 4)) * 0.15; dixie.position.y = 3.0 + Math.abs(Math.sin(t * 4 + 1.5)) * 0.2;
    const fk = clamp((lt - 1.4) / 1.4, 0, 1); fish.visible = fk > 0 && fk < 1; fish.position.set(-10 + fk * 18, Math.sin(fk * Math.PI) * 8 + 1.0, 2); fish.rotation.x = -Math.cos(fk * Math.PI) * 0.9; fish.rotation.y = Math.PI / 2;
    const d = ease(u); lookFrom(cam, V(lerp(-8.5, -4.5, d), lerp(5.2, 5.6, d), lerp(21.5, 19.5, d)), V(0, 5.2, 12));
  } };
});

// 3 (8.4-12.6): 1996 lakeside mine cart: Dixie and Kiddy over the water
defScene(8.4, 12.6, () => {
  const scene = newScene(); dayLight(scene, [[0, '#3a98e4'], [0.55, '#9ad2f6'], [1, '#e8f6ff']]); water(scene, 400, 300, 0, 0, -40, 0x2a98d8); ground(scene, 0x4a8a3a, 80).position.set(0, -0.01, 60);
  rails(scene, -70, 70, 4.2, 0, 'x'); for (let x = -70; x <= 70; x += 6) { box(0.5, 4.2, 0.5, 0x6a4a28, x, 2.1, -0.7, scene); box(0.5, 4.2, 0.5, 0x6a4a28, x, 2.1, 0.7, scene); box(0.3, 0.3, 1.9, 0x6a4a28, x, 3.2, 0, scene); }
  const R = rng(31); for (let i = 0; i < 40; i++) { const p = new THREE.Group(); p.position.set(-80 + i * 4.2, 0, -26 - R() * 14); scene.add(p); box(0.7, 2, 0.7, 0x5a3a22, 0, 1, 0, p); for (let k = 0; k < 4; k++) box(4 - k * 0.9, 1.4, 4 - k * 0.9, 0x1f6a38, 0, 2.4 + k * 1.1, 0, p); p.scale.setScalar(1.2 + R() * 1.2); }
  const fac = new THREE.Group(); fac.position.set(20, 0, -22); scene.add(fac); box(10, 6, 6, 0x6a7078, 0, 3, 0, fac); box(2.2, 16, 2.2, 0x8a9098, 3, 11, 0, fac); box(6, 1, 1, 0x8a9098, 0, 18, 0, fac); box(1, 5, 1, 0xd88a2a, -2.5, 16, 0, fac); box(2.6, 2.6, 2.6, 0xd88a2a, -3, 12, 0, fac); for (const x of [-3, 0, 3]) box(0.9, 0.9, 0.3, plastic(0xffe090, { emissive: 0xffc040, emissiveIntensity: 0.8 }), x, 4, 3.1, fac);
  for (const [x, z] of [[-60, -30], [-20, -60], [40, -70], [70, -50]]) { const m = box(40, 24, 30, 0x7a8aa0, x, 12, z, scene); m.rotation.y = 0.78; }
  const c = cart(), dixie = makeDixie(), kiddy = makeKiddy(); scene.add(c); c.add(kiddy, dixie); kiddy.position.set(-0.4, 1.0, 0); kiddy.scale.setScalar(0.5); dixie.position.set(0.5, 1.0, 0); dixie.scale.setScalar(0.4); kiddy.rotation.y = dixie.rotation.y = 0.3;
  const spray = particleField(scene, 9, 100, { x0: -20, x1: 20, y0: 0.3, y1: 3, z0: -4, z1: 6 }, 0xe8f4ff, 0.2, { vy: 1.5, drift: 1, opacity: 0.8 }); tick(t => spray(t));
  const cam = cam0();
  return { scene, cam, update(t, u) {
    const lt = t - 8.4, x = -14 + lt * 7; c.position.set(x, 4.2 + Math.abs(Math.sin(t * 11)) * 0.1, 0); c.rotation.z = Math.sin(t * 11) * 0.03;
    kiddy.userData.arms[0].rotation.set(-2.7 + Math.sin(t * 6) * 0.2, 0, 0.3); kiddy.userData.arms[1].rotation.set(-2.7, 0, -0.3); dixie.userData.arms[0].rotation.set(-2.9, 0, 0.2); dixie.userData.arms[1].rotation.set(-0.8, 0, -0.5);
    dixie.userData.ponySegs.forEach((s, i) => s.rotation.x = -0.5 + Math.sin(t * 8 - i * 0.6) * 0.3); kiddy.position.y = 1.0 + Math.abs(Math.sin(t * 5)) * 0.2; dixie.position.y = 1.0 + Math.abs(Math.sin(t * 5 + 1)) * 0.25;
    lookFrom(cam, V(x + lerp(-3, 3, ease(u)), 6.4, 12.5), V(x + 1.2, 5.8, 0));
  } };
});

// 4 (12.6-16.8): 2010 volcano sunset: DK pounds his chest beside Diddy
defScene(12.6, 16.8, () => {
  const scene = newScene(); scene.background = gradientSky([[0, '#4a3a8a'], [0.4, '#e8705a'], [0.75, '#ffb060'], [1, '#ffe0a0']]); scene.fog = new THREE.Fog(0xf0a070, 60, 260);
  scene.add(new THREE.HemisphereLight(0xffd8b0, 0x6a5040, 0.7)); sun(scene, 0xffa860, 2.4, V(30, 24, 40), V(0, 0, 0), 60); ground(scene, 0x5a6a38, 300);
  const volc = new THREE.Mesh(new THREE.CylinderGeometry(5, 34, 40, 20, 1), plastic(0x3a2a24, { roughness: 1 })); volc.position.set(18, 20, -60); scene.add(volc);
  const lava = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5, 2.4, 20), new THREE.MeshStandardMaterial({ color: 0xff5010, emissive: 0xff5010, emissiveIntensity: 2.2 })); lava.position.set(18, 40.6, -60); scene.add(lava);
  for (let i = 0; i < 5; i++) { const l = box(1.4, 18, 1.4, new THREE.MeshStandardMaterial({ color: 0xff6010, emissive: 0xff6010, emissiveIntensity: 1.6 }), 18 + Math.sin(i * 1.7) * 3, 30, -52 + i * 0.4); l.rotation.z = 0.15 * Math.sin(i * 3); }
  const lavaL = new THREE.PointLight(0xff6a20, 3, 120); lavaL.position.set(18, 44, -56); scene.add(lavaL);
  const smoke = smokeField(scene, 12, 30, { x0: 14, x1: 22, z0: -62, z1: -58, y0: 42, y1: 46 }, 0x3a3030, { size: 16, rise: 3, opacity: 0.6, life: 8 }); const emb = particleField(scene, 13, 300, { x0: 6, x1: 30, y0: 40, y1: 80, z0: -66, z1: -52 }, 0xff9040, 0.5, { vy: 4, drift: 2, additive: true, opacity: 0.9 }); tick(t => { smoke(t); emb(t); });
  box(12, 1.4, 10, 0x6a5a4a, 0, 0.7, 0, scene); box(8, 0.8, 7, 0x7a6a58, 0, 1.6, 0.5, scene);
  function tiki(x, z, s) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); [0x7a3a1a, 0x9a4a22, 0x6a3014].forEach((c, i) => { box(2, 2.2, 2, c, 0, 1.1 + i * 2.2, 0, g); box(0.6, 0.4, 0.1, plastic(0xffd840, { emissive: 0xffa020, emissiveIntensity: 1.2 }), -0.4, 1.4 + i * 2.2, 1.05, g); box(0.6, 0.4, 0.1, plastic(0xffd840, { emissive: 0xffa020, emissiveIntensity: 1.2 }), 0.4, 1.4 + i * 2.2, 1.05, g); box(1.0, 0.3, 0.1, 0x2a1008, 0, 0.7 + i * 2.2, 1.05, g); }); box(2.6, 0.6, 2.6, 0xd83a2a, 0, 7.0, 0, g); return g; }
  tiki(-9, -4, 1.3); tiki(10, -6, 1.5); tiki(-16, -14, 1.8);
  for (let i = 0; i < 14; i++) palm(scene, (i % 2 ? 1 : -1) * (14 + i * 3), -4 - i * 3.5, 1.2, (i % 2 ? -1 : 1) * 0.12);
  const fill = new THREE.PointLight(0xffb070, 1.2, 60); fill.position.set(2, 8, 14); scene.add(fill); const rim4 = new THREE.PointLight(0xff7a30, 1.5, 40); rim4.position.set(0, 6, -8); scene.add(rim4);
  const dk = makeDK(), diddy = makeDiddy(); dk.position.set(-1.6, 1.6, 1); dk.scale.setScalar(1.2); diddy.position.set(3.4, 1.6, 1.4); scene.add(dk, diddy); dk.rotation.y = 0.15; diddy.rotation.y = -0.5;
  const cam = cam0();
  return { scene, cam, update(t, u) {
    const lt = t - 12.6, beat = lt > 0.7 ? Math.sin((lt - 0.7) * 11) : 0, hit = beat > 0;
    dk.userData.arms[0].rotation.set(hit ? -1.3 : -0.4, 0, hit ? 0.9 : 0.3); dk.userData.arms[1].rotation.set(hit ? -1.0 - beat * 0.6 : -0.4, 0, hit ? -0.95 : -0.3); dk.userData.torso.rotation.x = hit ? 0.12 * beat : 0; dk.userData.head.rotation.x = -0.25;
    dk.position.y = 1.6 + (hit ? Math.abs(beat) * 0.12 : 0); diddy.userData.arms[0].rotation.set(-2.8 + Math.sin(t * 8) * 0.3, 0, 0.2); diddy.userData.arms[1].rotation.set(-2.8 - Math.sin(t * 8) * 0.3, 0, -0.2); diddy.position.y = 1.6 + Math.abs(Math.sin(t * 7)) * 0.5;
    const a = -0.7 + u * 1.0; lookFrom(cam, V(Math.sin(a) * 20, lerp(3.4, 5.4, ease(u)), Math.cos(a) * 20), V(0.4, 5.4, 1));
  } };
});

// 5 (16.8-21): 2014 frozen islands: DK, Diddy and Dixie meet the walrus vikings
defScene(16.8, 21, () => {
  const scene = newScene(); scene.background = gradientSky([[0, '#8ac4f0'], [0.5, '#d4ecfc'], [1, '#ffffff']]); scene.fog = new THREE.Fog(0xe0f2fc, 50, 220);
  scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x9ab8d0, 0.45)); sun(scene, 0xfff4e0, 1.5, V(-20, 50, 30), V(0, 0, 0), 50); ground(scene, 0xdce8f4, 400);
  const R = rng(51); const ice = plastic(0xa8dcf4, { roughness: 0.1, emissive: 0x4a98c8, emissiveIntensity: 0.25 });
  for (let i = 0; i < 40; i++) { const h = 2 + R() * 6, b = box(1.5 + R() * 2, h, 1.5 + R() * 2, ice, (R() - 0.5) * 100, h / 2, -12 - R() * 50, scene); b.rotation.y = R(); }
  for (let i = 0; i < 6; i++) { const m = box(30, 20 + i * 4, 24, 0xd0e8f8, -50 + i * 20, 12, -80, scene); m.rotation.y = 0.78; }
  for (let i = 0; i < 18; i++) { const p = new THREE.Group(); p.position.set((R() - 0.5) * 70, 0, -8 - R() * 40); scene.add(p); box(0.5, 1.2, 0.5, 0x5a3a22, 0, 0.6, 0, p); for (let k = 0; k < 4; k++) { box(2.8 - k * 0.6, 0.9, 2.8 - k * 0.6, 0x1f6a44, 0, 1.4 + k * 0.85, 0, p); box(2.6 - k * 0.6, 0.2, 2.6 - k * 0.6, 0xf8fcff, 0, 1.86 + k * 0.85, 0, p); } p.scale.setScalar(1.2 + R()); }
  const dk = makeDK(), diddy = makeDiddy(), dixie = makeDixie(); dk.position.set(-3.2, 0, 2); diddy.position.set(0.6, 0, 3.6); dixie.position.set(3.6, 0, 3.2); scene.add(dk, diddy, dixie); dk.rotation.y = 0.5; diddy.rotation.y = 0.3; dixie.rotation.y = -0.2;
  const wal = [makeWalrus(), makeWalrus()]; wal[0].position.set(11, 0, -2); wal[0].rotation.y = -1.9; wal[1].position.set(7, 0, -9); wal[1].rotation.y = -2.2; wal.forEach(w => { w.scale.setScalar(1.3); scene.add(w); });
  const pens = []; for (let i = 0; i < 6; i++) { const p = makePenguin(); p.position.set(-14 + i * 2.2, 0, -6 - (i % 3) * 3); p.scale.setScalar(1.4); scene.add(p); pens.push(p); }
  const snow = particleField(scene, 17, 800, { x0: -20, x1: 20, y0: 0, y1: 20, z0: -20, z1: 14 }, 0xffffff, 0.2, { vy: -2, drift: 2, vx: 1.2, opacity: 0.95 }); tick(t => snow(t));
  const cam = cam0();
  return { scene, cam, update(t, u) {
    const lt = t - 16.8; dk.userData.arms[0].rotation.set(-0.5, 0, 0.9); dk.userData.arms[1].rotation.set(-0.8 + Math.sin(t * 5) * 0.2, 0, -0.6); dk.userData.head.rotation.y = -0.5; dk.position.y = Math.abs(Math.sin(t * 4)) * 0.15;
    diddy.userData.arms[0].rotation.set(-2.9, 0, 0.3); diddy.userData.arms[1].rotation.set(-2.9, 0, -0.3); diddy.position.y = Math.abs(Math.sin(t * 6)) * 0.5;
    dixie.userData.pony.rotation.y = t * 22; dixie.position.y = 0.6 + 0.5 * Math.abs(Math.sin(t * 3)) + Math.max(0, Math.sin((lt - 1.6) * 2)) * 0.8; dixie.userData.ponySegs.forEach((s, i) => s.rotation.x = -1.2);
    wal.forEach((w, i) => { const q = clamp(lt / 3.0 - i * 0.1, 0, 1); w.position.x = (i ? 7 : 11) - q * 5; w.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.3; });
    pens.forEach((p, i) => { p.position.x = -14 + i * 2.2 + Math.sin(t * 2 + i) * 0.3; p.rotation.z = Math.sin(t * 8 + i) * 0.15; p.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.15; });
    const d = ease(u); lookFrom(cam, V(lerp(-3, 5, d), lerp(3.4, 4.2, d), lerp(17, 15, d)), V(lerp(0, 2.5, d), 3.4, 0));
  } };
});

// 6 (21-30): the whole crew, K-O-N-G, then the title
defScene(21, 30, () => {
  const scene = newScene(); dayLight(scene, [[0, '#2a8ae8'], [0.5, '#7ac8f6'], [1, '#e8f8ff']]); ground(scene, 0x4a9a3a, 300);
  const R = rng(61); for (let i = 0; i < 16; i++) palm(scene, (i % 2 ? 1 : -1) * (14 + R() * 20), -8 - i * 4, 1.2 + R() * 0.6, (i % 2 ? -1 : 1) * 0.1);
  for (let i = 0; i < 14; i++) bush(scene, (R() - 0.5) * 60, -4 - R() * 40, 1 + R(), [0x2e8a30, 0x3a9a34][i % 2]);
  box(14, 1.0, 12, 0x6a8a3a, 0, 0.5, 2, scene);
  const crew = { dk: makeDK(), diddy: makeDiddy(), dixie: makeDixie(), cranky: makeCranky(), funky: makeFunky() };
  const place = { dk: [0, 2.2, 4, 1.25, 0], diddy: [-4.2, 1.6, 4.6, 1, 0.2], dixie: [4.4, 1.6, 4.4, 1, -0.2], cranky: [-5.8, 1.1, 0.8, 1, 0.5], funky: [6.0, 1.1, 0.8, 1, -0.5] };
  Object.entries(crew).forEach(([k, a]) => { a.position.set(place[k][0], place[k][1], place[k][2]); a.rotation.y = place[k][4]; scene.add(a); });
  crew.dk.scale.multiplyScalar(1.0); const letters = []; ['K', 'O', 'N', 'G'].forEach((ch, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: letterTex(ch), transparent: true, depthWrite: false, fog: false })); m.userData.i = i; scene.add(m); letters.push(m); });
  const bun = []; for (let i = 0; i < 10; i++) { const b = bananas(1.8); scene.add(b); b.userData = [(R() - 0.5) * 22, 4 + R() * 5.5, 0 + R() * 6, R() * 6]; bun.push(b); }
  const sparkle = particleField(scene, 19, 200, { x0: -12, x1: 12, y0: 1, y1: 16, z0: 0, z1: 10 }, 0xffe890, 0.3, { vy: 0.6, drift: 1.5, additive: true, opacity: 0.9 }); tick(t => sparkle(t));
  const cam = cam0();
  return { scene, cam, update(t, u) {
    const lt = t - 21;
    Object.values(crew).forEach((a, i) => { const j = Math.abs(Math.sin(t * 3.2 + i * 0.9)); const base = Object.keys(crew)[i]; a.position.y = place[base][1] + j * 1.4; a.userData.arms.forEach((m, k) => m.rotation.set(-2.8 + Math.sin(t * 6 + k + i) * 0.25, 0, (k ? -1 : 1) * 0.6)); a.userData.legs.forEach((l, k) => l.rotation.x = -0.4 * j * (k ? 1 : -1)); });
    crew.dixie.userData.ponySegs.forEach((s, i) => s.rotation.x = Math.sin(t * 6 - i * 0.6) * 0.4);
    bun.forEach((b, i) => { const q = b.userData; b.position.set(q[0], q[1] + Math.sin(t * 1.2 + q[3]) * 0.6, q[2]); b.rotation.y = t * 1.2 + q[3]; });
    letters.forEach((m, i) => { const at = 0.7 + i * 0.55, k = ease((lt - at) / 0.5), pop = 1 + 0.25 * Math.max(0, 1 - (lt - at - 0.5) * 3); const out = 1 - ease((lt - 4.2) / 0.9); m.visible = k > 0 && out > 0; m.scale.setScalar(Math.max(0.01, k * out) * pop); m.position.set((i - 1.5) * 3.0, 12.5 + Math.sin(t * 2 + i) * 0.35, 1.5); m.lookAt(cam.position); });
    const d = ease(lt / 9); lookFrom(cam, V(lerp(1, 0, d), lerp(5.6, 10, d), lerp(26, 38, d)), V(0, lerp(6.2, 8.2, d), 2));
  } };
});
