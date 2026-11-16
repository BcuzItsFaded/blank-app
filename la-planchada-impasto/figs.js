// figs.js — knife-painted figures and props, baked once into sprites (so the paint never boils), drawn with jointed transforms.
import { knife, poly, blob, ell, rect, line, dab, bake, hx, col, css, TAU, lerp, clamp } from './knife.js';
const SS = 1.5;                                       // sprite resolution
function part(w, h, ox, oy, fn) { const b = bake(Math.ceil(w * SS), Math.ceil(h * SS), ox * SS, oy * SS, (g, gr) => { g.scale(SS, SS); gr.scale(SS, SS); fn(g, gr); }, true); b.s = SS; return b; }
export function drawPart(g, p, x, y, rot = 0, sx = 1, sy = 1, alpha = 1, rake = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx / p.s, sy / p.s); g.globalAlpha = alpha; g.drawImage(p.cv, -p.ox, -p.oy);
  if (rake > 0 && p.rv) { g.globalAlpha = alpha * rake; g.globalCompositeOperation = 'screen'; g.drawImage(p.rv, -p.ox, -p.oy); }
  g.restore();
}
const clip = (g, shape, fn) => { g.save(); shape.path(g); g.clip(); fn(); g.restore(); };

// spec: kind nurse|doc|pj|woman|matron ; ghost ; colours
const KINDS = {
  nurse: { dress: [[-32, -198], [32, -198], [27, -142], [70, -92], [46, -84], [0, -82], [-46, -84], [-70, -92], [-27, -142]], shade: [[8, -202], [80, -202], [80, -80], [26, -80], [22, -142]] },
  matron: { dress: [[-44, -198], [44, -198], [50, -142], [86, -92], [56, -82], [0, -80], [-56, -82], [-86, -92], [-50, -142]], shade: [[10, -202], [96, -202], [96, -78], [30, -78], [26, -142]] },
  doc: { dress: [[-40, -198], [40, -198], [46, -92], [32, -78], [0, -84], [-32, -78], [-46, -92]], shade: [[10, -202], [60, -202], [60, -76], [24, -76]] },
  woman: { dress: [[-28, -198], [28, -198], [22, -140], [52, -88], [0, -80], [-52, -88], [-22, -140]], shade: [[8, -202], [64, -202], [64, -78], [24, -80]] },
  pj: { dress: [[-36, -194], [36, -194], [46, -150], [44, -100], [30, -84], [-30, -84], [-44, -100], [-46, -150]], shade: [[8, -198], [60, -198], [60, -80], [24, -80]] },
};
export function buildFigure(sp) {
  const K = KINDS[sp.kind], F = { sp, parts: {} };
  const ghostDress = [[-32, -198], [32, -198], [27, -142], [52, -92], [38, -54], [16, -24], [-2, -52], [-22, -14], [-44, -58], [-54, -98], [-27, -142]];
  // body
  F.parts.body = part(220, 240, 110, 214, (g, gr) => {
    const d = sp.ghost ? blob(ghostDress) : blob(K.dress);
    knife(g, d, { c: sp.dress, c2: sp.dress2, r: 11, dir: -Math.PI / 2 + .12, seed: sp.seed + 1 }, gr);
    clip(g, d, () => knife(g, poly(K.shade), { c: sp.shade, c2: sp.shade2 || sp.shade, r: 9, dir: -Math.PI / 2, seed: sp.seed + 2, dens: .9 }, gr));
    if (sp.kind === 'nurse' || sp.kind === 'matron') {
      for (const dx of [-30, -15, 0, 15, 30]) { line(g, [[dx * .5, -134], [dx * (sp.ghost ? 1.0 : 1.7), sp.ghost ? -64 : -90]], 2.4, sp.crease, .75); line(g, [[dx * .5 + 2.6, -134], [dx * (sp.ghost ? 1.0 : 1.7) + 2.6, sp.ghost ? -64 : -90]], 1.6, '#ffffff', .5); }
      knife(g, poly([[-26, -144], [26, -144], [26, -136], [-26, -136]]), { c: sp.belt || '#3a4656', r: 4, dir: 0, seed: sp.seed + 3, fine: false });
      knife(g, poly([[-9, -198], [0, -178], [9, -198]]), { c: '#f4f6f8', r: 4, dir: 0, seed: sp.seed + 4, fine: false });
    }
    if (sp.kind === 'doc') { knife(g, poly([[-6, -196], [6, -196], [4, -140], [-4, -140]]), { c: sp.tie || '#25303f', r: 4, dir: -Math.PI / 2, seed: sp.seed + 5, fine: false }); line(g, [[0, -196], [0, -84]], 2.2, sp.crease, .5); line(g, [[-26, -196], [-30, -150], [-12, -130], [8, -152], [26, -196]], 3, '#2b3340', .8); }
    if (sp.kind === 'pj') for (let i = -3; i <= 3; i++) line(g, [[i * 12, -190], [i * 12 + 2, -88]], 3.2, sp.stripe || '#8aa2bd', .55);
  });
  // legs (alive figures)
  if (!sp.ghost) {
    const mk = (s) => part(60, 130, 30, 6, (g, gr) => { knife(g, poly([[-10, -92], [10, -92], [9, -10], [-9, -10]]), { c: sp.hose || '#2b2f3a', c2: '#3a3f4c', r: 6, dir: -Math.PI / 2, seed: sp.seed + 20 + s, fine: false }, gr); knife(g, ell(s * 5, -6, 17, 8), { c: sp.shoe || '#14161c', c2: '#2b2f3a', r: 5, dir: 0, seed: sp.seed + 22 + s, fine: false }, gr); });
    F.parts.legL = mk(-1); F.parts.legR = mk(1);
  }
  // arms: pivot at the shoulder, hanging straight down (rotation 0)
  F.parts.arm = part(60, 140, 30, 12, (g, gr) => {
    knife(g, poly([[-10, -4], [10, -4], [9, 68], [-9, 68]]), { c: sp.sleeve || sp.dress, c2: sp.sleeve2 || sp.dress2, r: 5, dir: -Math.PI / 2, seed: sp.seed + 30, fine: false }, gr);
    knife(g, poly([[-8, 62], [8, 62], [7, 102], [-7, 102]]), { c: sp.skin, c2: sp.skin2, r: 4, dir: -Math.PI / 2, seed: sp.seed + 31, fine: false }, gr);
    knife(g, ell(0, 108, 9, 11), { c: sp.skin, c2: sp.skin2, r: 4, dir: -Math.PI / 2, seed: sp.seed + 32, fine: false }, gr);
  });
  // head: pivot at the neck base, face centre at (0,-52)
  F.parts.head = part(220, 220, 110, 130, (g, gr) => {
    if (sp.hair && sp.kind !== 'doc') knife(g, blob([[-52, -50], [-50, -92], [0, -108], [50, -92], [52, -50], [44, -14], [34, -48], [-34, -48], [-44, -14]]), { c: sp.hair, c2: sp.hair2 || sp.hair, r: 7, dir: -Math.PI / 2, seed: sp.seed + 40, fine: false }, gr);
    knife(g, poly([[-9, 0], [9, 0], [8, -22], [-8, -22]]), { c: sp.skin, c2: sp.skin2, r: 5, dir: -Math.PI / 2, seed: sp.seed + 41, fine: false });
    const face = ell(0, -52, 42, 48);
    knife(g, face, { c: sp.skin, c2: sp.skin2, r: 8, dir: -.5, seed: sp.seed + 42 }, gr);
    clip(g, face, () => knife(g, poly([[16, -110], [60, -110], [60, -2], [28, -4]]), { c: sp.skinShade || '#bda392', r: 6, dir: -Math.PI / 2, seed: sp.seed + 43, dens: .8 }, gr));
    knife(g, ell(-42, -50, 6, 10), { c: sp.skin, r: 3, dir: 0, seed: sp.seed + 44, fine: false }); knife(g, ell(42, -50, 6, 10), { c: sp.skin, r: 3, dir: 0, seed: sp.seed + 45, fine: false });
    if (sp.kind === 'doc') { knife(g, blob([[-44, -62], [-38, -98], [0, -104], [34, -96], [46, -70], [30, -84], [0, -86], [-30, -78]]), { c: sp.hair, r: 6, dir: -.3, seed: sp.seed + 46, fine: false }, gr); knife(g, poly([[-22, -28], [-8, -32], [0, -29], [8, -32], [22, -28], [10, -22], [0, -25], [-10, -22]]), { c: sp.hair, r: 3, dir: 0, seed: sp.seed + 47, fine: false }); knife(g, ell(-6, -90, 12, 12), { c: '#aab4bd', r: 4, dir: 0, seed: sp.seed + 48, fine: false }); }
    else if (sp.kind === 'pj') { knife(g, blob([[-46, -80], [-28, -108], [10, -126], [50, -106], [66, -78], [56, -56], [42, -80], [0, -88]]), { c: '#d7dde6', c2: '#b9c4d2', r: 6, dir: -.5, seed: sp.seed + 49, fine: false }, gr); knife(g, ell(66, -70, 10, 10), { c: '#e8edf2', r: 4, dir: 0, seed: sp.seed + 50, fine: false }); knife(g, poly([[-47, -62], [0, -70], [47, -62], [47, -50], [0, -58], [-47, -50]]), { c: '#e9eaea', r: 4, dir: 0, seed: sp.seed + 51, fine: false }); line(g, [[-4, -68], [0, -54]], 2, '#8a8f98', .6); line(g, [[10, -68], [14, -55]], 2, '#8a8f98', .6); }
    else { knife(g, blob([[-50, -64], [-46, -94], [-14, -106], [0, -102], [14, -106], [46, -94], [50, -64], [32, -78], [10, -86], [-10, -86], [-32, -78]]), { c: sp.hair || '#1b1e26', c2: sp.hair2 || '#2b303c', r: 6, dir: -.4, seed: sp.seed + 52, fine: false }, gr); }
    if (sp.hat === 'nurse') { knife(g, poly([[-36, -88], [-30, -118], [30, -118], [36, -88], [0, -96]]), { c: '#f1f4f6', c2: '#cfd8e0', r: 6, dir: 0, seed: sp.seed + 53, fine: false }, gr); line(g, [[0, -112], [0, -98]], 3, sp.cross || '#7a3b4a', .9); line(g, [[-7, -105], [7, -105]], 3, sp.cross || '#7a3b4a', .9); }
    if (sp.hat === 'matron') knife(g, poly([[-42, -86], [-36, -122], [36, -122], [42, -86], [0, -94]]), { c: '#eef1f3', c2: '#cdd5dc', r: 6, dir: 0, seed: sp.seed + 54, fine: false }, gr);
    if (sp.hat === 'cloche') knife(g, blob([[-52, -66], [-50, -106], [-16, -122], [16, -122], [50, -106], [52, -66], [0, -76]]), { c: sp.hatCol || '#2f6f78', c2: '#235a62', r: 7, dir: -.4, seed: sp.seed + 55, fine: false }, gr);
  });
  return F;
}
// where each feature sits on the head (head space)
export function face(g, look = {}, hair = '#1b1e26', lips = '#9a5a58') {
  const e = look.eyes || 'open', m = look.mouth || 'smile', lx = (look.lx || 0) * 3, ly = (look.ly || 0) * 3, brows = look.brows;
  for (const s of [-1, 1]) {
    const x = s * 17 + lx, y = -57 + ly;
    if (e === 'open') { dab(g, x, y, 6.2, 8.2, '#14171d'); dab(g, x - 1.8, y - 3, 1.8, 2.2, '#f4f1ea', .9); }
    else if (e === 'wide') { dab(g, x, y, 8.4, 11.5, '#f3f0e8'); dab(g, x + lx * .6, y, 5.4, 7.4, '#14171d'); dab(g, x - 1.4 + lx * .6, y - 2.6, 1.6, 2, '#fff', .9); }
    else if (e === 'shut') line(g, [[x - 8, y + 1], [x, y + 4], [x + 8, y + 1]], 2.6, hair);
    else if (e === 'happy') line(g, [[x - 8, y + 3], [x, y - 3], [x + 8, y + 3]], 2.8, hair);
    else if (e === 'squint') { dab(g, x, y + 1, 6, 3, '#14171d'); }
    if (look.lash) { line(g, [[x + s * 6, y - 5], [x + s * 11, y - 9]], 1.8, hair, .9); line(g, [[x + s * 7, y - 2], [x + s * 13, y - 4]], 1.8, hair, .9); }
    if (brows === 'up') line(g, [[x - 8, y - 15], [x, y - 19], [x + 8, y - 15]], 2.2, hair, .85);
    if (brows === 'worry') line(g, [[x - s * 8, y - 12], [x + s * 8, y - 19]], 2.2, hair, .85);
  }
  line(g, [[-2, -46], [0, -42], [4, -43]], 1.8, '#9a7b6a', .8);
  const my = -27;
  if (m === 'smile') { line(g, [[-11, my - 1], [0, my + 5], [11, my - 1]], 3, lips); }
  else if (m === 'grin') { g.save(); g.fillStyle = '#4a2a2e'; g.beginPath(); g.moveTo(-12, my - 2); g.quadraticCurveTo(0, my + 12, 12, my - 2); g.closePath(); g.fill(); g.restore(); line(g, [[-12, my - 2], [12, my - 2]], 2.4, '#f2eee8'); }
  else if (m === 'o') dab(g, 0, my + 3, 5.5 * (look.open || 1), 7.5 * (look.open || 1), '#3a2024');
  else if (m === 'frown') line(g, [[-10, my + 3], [0, my - 3], [10, my + 3]], 3, lips);
  else if (m === 'flat') line(g, [[-9, my], [9, my + 1]], 3, lips);
  else if (m === 'wavy') line(g, [[-11, my + 1], [-5, my - 3], [0, my + 2], [5, my - 3], [11, my + 1]], 2.8, lips);
}
// draw a whole figure. o: x,y (ground), k, flip, bob, lean, ghost alpha, look, armL/armR {a (rotation, 0=hanging), front}, walk(phase)|null, tilt (head), rake
export function drawFigure(g, F, o) {
  const k = o.k || 1, P = F.parts, alpha = o.alpha ?? 1, rake = o.rake || 0, hasLegs = !!P.legL;
  g.save(); g.translate(o.x, o.y + (o.bob || 0)); if (o.flip) g.scale(-1, 1); g.scale(k * (o.sx || 1), k * (o.sy || 1)); if (o.lean) g.rotate(o.lean);
  if (hasLegs) for (const s of [-1, 1]) { const ph = o.walk != null ? Math.sin(o.walk + (s > 0 ? 0 : Math.PI)) : 0; drawPart(g, s < 0 ? P.legL : P.legR, s * 14 + s * 0, -92, ph * .5, 1, 1, alpha, rake); }
  const arm = (s, a, behind) => { const A = a; if (!A || !!A.back !== behind) return; drawPart(g, P.arm, s * 32, -188, (A.a ?? 0) * s, 1, 1, alpha, rake); };
  arm(-1, o.armL, true); arm(1, o.armR, true);
  drawPart(g, P.body, 0, 0, 0, 1, 1, alpha, rake);
  g.save(); g.translate(0, -204); if (o.tilt) g.rotate(o.tilt); drawPart(g, P.head, 0, 0, 0, 1, 1, alpha, rake);
  g.globalAlpha = alpha; face(g, o.look, F.sp.hair || '#1b1e26', F.sp.lips); g.restore();
  arm(-1, o.armL, false); arm(1, o.armR, false);
  g.restore();
}
export const SPECS = {
  nurse: { kind: 'nurse', seed: 10, dress: '#e8edf1', dress2: '#cdd8e2', shade: '#9fb2c6', crease: '#7f93a8', skin: '#dbc8ba', skin2: '#ecdfd3', hair: '#1a1d26', hair2: '#2a303c', hat: 'nurse', lips: '#a05a5c', cross: '#7a3b4a' },
  ghost: { kind: 'nurse', ghost: true, seed: 11, dress: '#eef3f7', dress2: '#cfe0ee', shade: '#a6bfd6', crease: '#8aa4bd', skin: '#e1d4cb', skin2: '#f0e6de', hair: '#1a1d26', hair2: '#2a303c', hat: 'nurse', lips: '#a05a5c', cross: '#7a3b4a' },
  doc: { kind: 'doc', seed: 12, dress: '#d6dde3', dress2: '#bcc7d1', shade: '#8d9eae', crease: '#7a8c9e', skin: '#d6bfae', skin2: '#e6d4c6', hair: '#20242c', hair2: '#2c313b', tie: '#25303f', hose: '#23262e' },
  woman: { kind: 'woman', seed: 13, dress: '#2f7f88', dress2: '#3f95a0', shade: '#1f5961', crease: '#1f5961', skin: '#dcc4b2', skin2: '#ecdccd', hair: '#1c1b22', hair2: '#2c2b34', hat: 'cloche', hatCol: '#a3532e', lips: '#a84a4c', hose: '#2b2f3a' },
  pj: { kind: 'pj', seed: 14, dress: '#e6ebf0', dress2: '#cdd7e2', shade: '#9fb0c3', crease: '#8aa0b8', skin: '#dcc6b6', skin2: '#ecdccf', hair: '#5a4a40', hair2: '#6a5a4e', stripe: '#8aa2bd', hose: '#e6ebf0', shoe: '#6a727e', sleeve: '#e6ebf0' },
  matron: { kind: 'matron', seed: 15, dress: '#7f93a8', dress2: '#9bb0c4', shade: '#566a80', crease: '#566a80', skin: '#d9c1b0', skin2: '#e9d9cb', hair: '#6c7078', hair2: '#8a8f98', hat: 'matron', lips: '#9c5a5a', sleeve: '#7f93a8' },
};
// ---- props ----
export function buildBed() { return part(520, 260, 260, 244, (g, gr) => {
  for (const x of [-196, 196]) knife(g, poly([[x - 8, 0], [x - 8, -160], [x + 8, -160], [x + 8, 0]]), { c: '#2c3440', c2: '#46515f', r: 5, dir: -Math.PI / 2, seed: 71 + x, fine: false }, gr);
  knife(g, poly([[-196, -140], [196, -140], [196, -128], [-196, -128]]), { c: '#2c3440', r: 5, dir: 0, seed: 73, fine: false }, gr);
  knife(g, poly([[-190, -92], [190, -92], [190, -122], [-190, -122]]), { c: '#d6dde5', c2: '#b8c4d0', r: 8, dir: 0, seed: 74 }, gr);
  knife(g, blob([[-180, -122], [-110, -150], [-70, -136], [-84, -108], [-176, -104]]), { c: '#f0f2f4', c2: '#cfd8e0', r: 7, dir: -.3, seed: 75 }, gr);
  knife(g, blob([[-84, -122], [-40, -156], [40, -150], [120, -158], [190, -132], [194, -66], [-84, -66]]), { c: '#6f8aa6', c2: '#8fa6bf', r: 10, dir: -.5, seed: 76 }, gr);
  knife(g, poly([[-84, -122], [194, -134], [194, -106], [-82, -96]]), { c: '#e8edf2', c2: '#c9d4de', r: 6, dir: -.1, seed: 77, fine: false }, gr);
  for (const x of [-176, 176]) knife(g, ell(x, 8, 15, 15), { c: '#1c2128', r: 5, dir: 0, seed: 78 + x, fine: false }, gr);
}); }
export function buildHeart(half = 0) { return part(140, 140, 70, 74, (g, gr) => {
  const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([x * 3.6, y * 3.6 + 6]); }
  const sh = blob(pts);
  if (half) { g.save(); g.beginPath(); if (half < 0) { g.moveTo(-90, -90); g.lineTo(0, -90); g.lineTo(-6, -50); g.lineTo(8, -20); g.lineTo(-6, 20); g.lineTo(2, 74); g.lineTo(-90, 74); } else { g.moveTo(90, -90); g.lineTo(0, -90); g.lineTo(-6, -50); g.lineTo(8, -20); g.lineTo(-6, 20); g.lineTo(2, 74); g.lineTo(90, 74); } g.closePath(); g.clip(); }
  knife(g, sh, { c: '#d4302a', c2: '#ef5a3c', r: 8, dir: -.6, seed: 91 }, gr); if (half) g.restore();
}); }
export function buildBottle() { return part(80, 120, 40, 112, (g, gr) => {
  knife(g, blob([[-18, 0], [-22, -34], [-10, -56], [-8, -78], [8, -78], [10, -56], [22, -34], [18, 0]]), { c: '#7ea08f', c2: '#a6c4b2', r: 5, dir: -Math.PI / 2, seed: 95, fine: false }, gr);
  knife(g, poly([[-9, -78], [9, -78], [8, -90], [-8, -90]]), { c: '#2c3440', r: 3, dir: 0, seed: 96, fine: false }); knife(g, poly([[-14, -34], [14, -34], [14, -14], [-14, -14]]), { c: '#efe8d8', r: 3, dir: 0, seed: 97, fine: false });
}); }
export function buildBouquet() { return part(120, 130, 60, 120, (g, gr) => {
  line(g, [[0, 0], [0, -70]], 5, '#3f6a4a'); const cs = ['#e8a23c', '#d4552a', '#f2d15a', '#c9406a', '#f0eee0'];
  [[-22, -78], [18, -86], [0, -104], [-34, -100], [30, -102]].forEach(([x, y], i) => knife(g, ell(x, y, 15, 15), { c: cs[i], c2: '#fff1c0', r: 5, dir: 0, seed: 100 + i, fine: false }, gr));
}); }
