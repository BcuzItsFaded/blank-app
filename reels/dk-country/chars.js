"use strict";
// Shared Donkey Kong Country kit: Kongs, K. Rool, Rambi, walrus, penguin, props, water, lighting. Used by memory-lane.html and ../dk-levels.
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

