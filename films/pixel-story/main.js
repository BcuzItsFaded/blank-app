// PIXEL STORY — the 12-panel autumn storyboard as a 25 s pixel-art film.
// Drawn into a 320x180 palette-indexed framebuffer, upscaled x6 with nearest neighbour.
// Every frame is a pure function of t (motion quantised to 12 fps, classic pixel-art timing).
'use strict';
const W = 320, H = 180, S = 6, FPS = 24, DUR = 25;
window.DEMO = { width: W * S, height: H * S, fps: FPS, duration: DUR };
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const lo = document.createElement('canvas'); lo.width = W; lo.height = H;
const lctx = lo.getContext('2d');
const img = lctx.createImageData(W, H);

// ---------------------------------------------------------------- palette (autumn noir)
const PAL_HEX = [
  '#120c0e', '#1e1418', '#2b1d20', '#3b2828', '#4e3530',            // 0-4  inks / dark wood
  '#6b4632', '#8a5a3c', '#a8754a', '#c79466',                       // 5-8  browns
  '#e8b46c', '#f6d79a', '#fff1c9',                                  // 9-11 lamplight
  '#4a1418', '#7a1f22', '#a8302a', '#d24f36', '#f08a5a',            // 12-16 reds / leaves
  '#f2c9a0', '#d9a27a', '#a87050',                                  // 17-19 skin
  '#d9b45a', '#f0d68a',                                             // 20-21 blonde
  '#151a2a', '#222a42', '#34405e', '#526080', '#8290b0', '#b4bed2', // 22-27 night blues
  '#2e1f34', '#4a2c48', '#74405c', '#a85a64',                       // 28-31 dusk
  '#26301f', '#3c4a2c', '#5a6a3c',                                  // 32-34 plants
  '#5e5a5c', '#8e8886', '#c8c0b8', '#ece6dc',                       // 35-38 greys / paper
  '#c4262e', '#ff5a5a',                                             // 39-40 screen red, heart
  '#7fb8c8', '#cfeaf0',                                             // 41-42 phone glow
];
const PAL = PAL_HEX.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const C = {
  ink: 0, d1: 1, d2: 2, d3: 3, d4: 4, b5: 5, b6: 6, b7: 7, b8: 8, l9: 9, l10: 10, l11: 11,
  r12: 12, r13: 13, r14: 14, r15: 15, r16: 16, sk: 17, sk2: 18, sk3: 19, bl: 20, bl2: 21,
  n22: 22, n23: 23, n24: 24, n25: 25, n26: 26, n27: 27, u28: 28, u29: 29, u30: 30, u31: 31,
  g32: 32, g33: 33, g34: 34, gr35: 35, gr36: 36, gr37: 37, pap: 38, tvr: 39, heart: 40, ph: 41, ph2: 42,
};

// ---------------------------------------------------------------- framebuffer + raster primitives
let FB = new Uint8Array(W * H);
let CLIP = null;                      // optional (x,y)=>bool
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16 + 1 / 32;
function px(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H || c < 0) return; if (CLIP && !CLIP(x, y)) return; FB[y * W + x] = c; }
function rect(x, y, w, h, c) { for (let j = Math.round(y); j < Math.round(y + h); j++) for (let i = Math.round(x); i < Math.round(x + w); i++) px(i, j, c); }
function dith(x, y, w, h, c1, c2, lv) { for (let j = Math.round(y); j < Math.round(y + h); j++) for (let i = Math.round(x); i < Math.round(x + w); i++) px(i, j, bay(i, j) < lv ? c2 : c1); }
function vgrad(x, y, w, h, cols) {   // vertical dithered gradient through a colour list
  for (let j = 0; j < h; j++) {
    const u = (j / Math.max(1, h - 1)) * (cols.length - 1), k = Math.min(cols.length - 2, Math.floor(u)), f = u - k;
    for (let i = 0; i < w; i++) px(x + i, y + j, bay(x + i, y + j) < f ? cols[k + 1] : cols[k]);
  }
}
function ellipse(cx, cy, rx, ry, c, lv = 1, c2 = -1) {
  for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
    const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) px(i, j, lv >= 1 || bay(i, j) < lv ? c : c2);
  }
}
const circ = (cx, cy, r, c, lv, c2) => ellipse(cx, cy, r, r, c, lv, c2);
function line(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function poly(pts, c, lv = 1, c2 = -1) {
  let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const xs = [], yy = y + 0.5;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) px(x, y, lv >= 1 || bay(x, y) < lv ? c : c2);
  }
}
function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const eOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const eIO = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const q12 = (t) => Math.floor(t * 12 + 1e-6) / 12;       // pixel-art timing: on 2s at 24 fps

// ---------------------------------------------------------------- props
function leaf(x, y, c, f) {            // 5px maple-ish leaf, 2 frames of flutter
  x = Math.round(x); y = Math.round(y);
  if (f % 2) { px(x, y - 1, c); px(x - 1, y, c); px(x, y, c); px(x + 1, y, c); px(x, y + 1, c - 1 >= 12 ? c - 1 : c); }
  else { px(x - 1, y - 1, c); px(x + 1, y - 1, c); px(x, y, c); px(x - 1, y + 1, c); px(x + 1, y + 1, c); }
}
function fallingLeaves(t, seed, n, x0, x1, y0, y1, cols = [C.r14, C.r15, C.r16, C.r13]) {
  const tq = q12(t);
  for (let i = 0; i < n; i++) {
    const sp = 14 + 16 * hash(seed, i, 1), ph = hash(seed, i, 2) * (y1 - y0);
    const y = y0 + ((ph + tq * sp) % (y1 - y0));
    const x = x0 + hash(seed, i, 3) * (x1 - x0) + Math.sin(tq * 3 + i) * 4;
    leaf(x, y, cols[i % cols.length], Math.floor(tq * 6 + i));
  }
}
function foliage(cx, cy, r, seed, cols = [C.r13, C.r14, C.r15, C.r16]) {   // clumpy red tree crown
  for (let i = 0; i < r * 2.2; i++) {
    const a = hash(seed, i, 1) * 6.283, d = Math.sqrt(hash(seed, i, 2)) * r;
    circ(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, 2 + hash(seed, i, 3) * r * 0.22, cols[i % cols.length]);
  }
}
function shelves(x, y, w, h, seed, dark = false) {
  rect(x, y, w, h, dark ? C.d1 : C.d2);
  const rowH = 16;
  for (let ry = y + 2; ry + rowH <= y + h; ry += rowH) {
    let bx = x + 2;
    let k = 0;
    while (bx < x + w - 3) {
      const bw = 2 + Math.floor(hash(seed, ry, k) * 3), bh = 9 + Math.floor(hash(seed, ry, k + 50) * 5);
      const cols = dark ? [C.d3, C.d4, C.r12, C.n23, C.b5] : [C.r13, C.b5, C.b6, C.n24, C.u29, C.g33, C.b7, C.r12];
      const c = cols[Math.floor(hash(seed, ry, k + 99) * cols.length)];
      rect(bx, ry + rowH - 2 - bh, bw, bh, c);
      if (bh > 10 && !dark) px(bx, ry + rowH - 2 - bh + 2, C.l9);
      bx += bw + (hash(seed, ry, k + 7) < 0.15 ? 2 : 0); k++;
    }
    rect(x, ry + rowH - 2, w, 2, dark ? C.d3 : C.b5);
  }
  rect(x, y, 2, h, C.d3); rect(x + w - 2, y, 2, h, C.d3);
}
function lampGlow(cx, cy, r, lv = 0.5) {   // dithered warm halo (only lightens dark pixels)
  for (let j = Math.floor(cy - r); j <= cy + r; j++) for (let i = Math.floor(cx - r); i <= cx + r; i++) {
    const d = Math.hypot(i - cx, j - cy) / r; if (d > 1 || i < 0 || j < 0 || i >= W || j >= H) continue;
    if (CLIP && !CLIP(i, j)) continue;
    const k = j * W + i, c = FB[k];
    if (bay(i, j) < (1 - d) * lv) FB[k] = LIGHTER[c];
  }
}
const LIGHTER = PAL.map((_, i) => i);   // filled after palette ramps defined
[[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [15, 16],
 [22, 23], [23, 24], [24, 25], [25, 26], [26, 27], [28, 29], [29, 30], [30, 31], [35, 36], [36, 37], [37, 38], [32, 33], [33, 34], [19, 18], [18, 17]]
  .forEach(([a, b]) => (LIGHTER[a] = b));
const DARKER = PAL.map((_, i) => i);
LIGHTER.forEach((b, a) => { if (b !== a && DARKER[b] === b) DARKER[b] = a; });
function shadeRegion(x0, y0, x1, y1, lv, pred) {   // dithered darken (shadows / reflections)
  for (let j = Math.max(0, y0); j < Math.min(H, y1); j++) for (let i = Math.max(0, x0); i < Math.min(W, x1); i++) {
    if (pred && !pred(i, j)) continue;
    if (bay(i, j) < lv) FB[j * W + i] = DARKER[DARKER[FB[j * W + i]]];
  }
}

// ---------------------------------------------------------------- characters
const CAST = {
  joe: { hair: 'curly', hc: C.ink, hh: C.d3, skin: C.sk2, skd: C.sk3, coat: C.d2, coat2: C.d3, collar: C.d4 },
  beck: { hair: 'long', hc: C.b5, hh: C.b6, skin: C.sk, skd: C.sk2, coat: C.r13, coat2: C.r12, collar: C.pap },
  peach: { hair: 'long', hc: C.bl, hh: C.bl2, skin: C.sk, skd: C.sk2, coat: C.d3, coat2: C.d2, collar: C.sk2, hoops: true },
  ana: { hair: 'long', hc: C.d1, hh: C.d3, skin: C.sk2, skd: C.sk3, coat: C.r13, coat2: C.r12, collar: C.r13, hoops: true },
  benji: { hair: 'curly', hc: C.d1, hh: C.d3, skin: C.sk2, skd: C.sk3, coat: C.d3, coat2: C.d2, collar: C.gr36, glasses: true },
  cap: { hair: 'short', hc: C.d2, hh: C.d3, skin: C.sk2, skd: C.sk3, coat: C.r12, coat2: C.d3, collar: C.b5, cap: C.gr35, beard: true },
  crew: { hair: 'short', hc: C.d2, hh: C.d3, skin: C.sk, skd: C.sk2, coat: C.d4, coat2: C.d3, collar: C.gr35, cap: C.gr36, phones: true },
};
// head: cx centre, top = top of skull, hw = head width. o.face: 'F' front, 'R'/'L' three-quarter, 'PR'/'PL' profile, 'B' back
function bust(cx, y, w, h, ch, lean = 0) {
  poly([[cx - w * 0.36 + lean, y], [cx + w * 0.36 + lean, y], [cx + w * 0.52, y + h], [cx - w * 0.52, y + h]], ch.coat);
  poly([[cx + w * 0.1 + lean, y], [cx + w * 0.36 + lean, y], [cx + w * 0.52, y + h], [cx + w * 0.2, y + h]], ch.coat2);
  poly([[cx - w * 0.1 + lean, y - 1], [cx + w * 0.1 + lean, y - 1], [cx + lean * 0.5, y + h * 0.28]], ch.collar);
}
function head(cx, top, hw, ch, o = {}) {
  const f = o.face || 'F', hh = hw * 1.18, cy = top + hh * 0.5, rx = hw / 2, ry = hh / 2;
  const dir = f === 'R' || f === 'PR' ? 1 : f === 'L' || f === 'PL' ? -1 : 0;
  const seed = o.seed ?? 7;
  // back hair (long)
  if (ch.hair === 'long') {
    const lx = cx - dir * hw * 0.12;
    poly([[lx - hw * 0.62, cy - ry * 0.2], [lx + hw * 0.62, cy - ry * 0.2], [lx + hw * 0.78, cy + hh * 1.05], [lx - hw * 0.78, cy + hh * 1.05]], ch.hc);
    for (let i = 0; i < 5; i++) { const xx = lx - hw * 0.7 + i * hw * 0.35; for (let j = 0; j < hh * 0.9; j++) px(xx + Math.round(Math.sin(j * 0.35 + i) * 1.5), cy + j, ch.hh); }
    ellipse(lx, cy + hh * 1.05, hw * 0.78, hw * 0.14, ch.hc);
  }
  // neck
  if (!o.noNeck) rect(cx - hw * 0.16 + dir * hw * 0.04, cy + ry * 0.7, hw * 0.32, hw * 0.4, ch.skd);
  // skull / face
  if (f !== 'B') {
    ellipse(cx, cy, rx, ry, ch.skin);
    // shadow side
    const sd = dir === 0 ? 1 : -dir;
    for (let j = Math.floor(cy - ry); j <= cy + ry; j++) for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
      const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && dx * sd > 0.45 && bay(i, j) < (dx * sd - 0.45) * 2.4) px(i, j, ch.skd);
    }
    if (o.chinShade !== false) for (let i = Math.floor(cx - rx * 0.6); i < cx + rx * 0.6; i++) px(i, Math.round(cy + ry * 0.98), ch.skd);
  } else ellipse(cx, cy, rx, ry, ch.hc);
  // facial features
  const es = Math.max(1, Math.round(hw / 22)), eh = Math.max(2, Math.round(hw / 12));
  const ey = Math.round(cy + ry * 0.12 + (o.lookDown ? 2 : 0));
  const eyeAt = (x) => {
    if (o.closed) { rect(x - es, ey + eh - 1, es * 2 + 1, 1, C.ink); return; }
    rect(x, ey, es, eh, C.ink);
    if (hw >= 40 && !o.noShine) px(x, ey, C.gr36);
  };
  if (f === 'F') { eyeAt(Math.round(cx - hw * 0.2)); eyeAt(Math.round(cx + hw * 0.2) - es + 1); }
  if (f === 'R' || f === 'L') { eyeAt(Math.round(cx + dir * hw * 0.06)); eyeAt(Math.round(cx + dir * hw * 0.34)); px(Math.round(cx + dir * hw * 0.44), ey + eh + 2, ch.skd); }
  if (f === 'PR' || f === 'PL') { eyeAt(Math.round(cx + dir * hw * 0.28)); px(Math.round(cx + dir * (rx + 0.5)), ey + eh + 1, ch.skin); px(Math.round(cx + dir * (rx + 0.5)), ey + eh + 2, ch.skin); }
  if (f !== 'B' && hw >= 24) {
    const mx = Math.round(cx + dir * hw * 0.2), my = Math.round(cy + ry * 0.55);
    const mw = Math.max(2, Math.round(hw / 10));
    if (o.smile) { rect(mx - mw, my, mw * 2, 1, C.sk3); px(mx - mw - 1, my - 1, C.sk3); px(mx + mw, my - 1, C.sk3); }
    else if (o.frown) { rect(mx - mw, my, mw * 2, 1, C.sk3); px(mx - mw - 1, my + 1, C.sk3); px(mx + mw, my + 1, C.sk3); }
    else rect(mx - mw + (f === 'F' ? 0 : 0), my, mw * 2 - (f === 'PR' || f === 'PL' ? mw : 0), 1, C.sk3);
    if (o.brow) { const by = ey - 2; rect(Math.round(cx + dir * hw * 0.06) - 1, by, es + 2, 1, ch.hc); rect(Math.round(cx + dir * hw * 0.34) - 1 + (dir < 0 ? 0 : 0), by, es + 2, 1, ch.hc); }
  }
  // beard
  if (ch.beard) for (let j = Math.floor(cy + ry * 0.5); j <= cy + ry; j++) for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
    const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1 && (bay(i, j) < 0.85 || dy > 0.8)) px(i, j, DARKER[ch.skd]);
  }
  // hair (front)
  if (ch.hair === 'curly') {
    const r = Math.max(2, hw * 0.15);
    const n = Math.round(hw * 0.75);
    for (let i = 0; i < n; i++) {
      let a;
      if (f === 'B') a = hash(seed, i) * 6.283;
      else a = Math.PI * (0.92 + 1.16 * (i / n)) + (hash(seed, i) - 0.5) * 0.3 - dir * 0.35;
      const d = (f === 'B' ? Math.sqrt(hash(seed, i, 5)) * 0.85 : 0.82) * 1;
      const x = cx + Math.cos(a) * rx * d * 1.05 - dir * hw * 0.06, y = cy + Math.sin(a) * ry * d * 0.95 - hw * 0.04;
      circ(x, y, r * (0.8 + 0.5 * hash(seed, i, 2)), ch.hc);
    }
    for (let i = 0; i < n * 0.55; i++) {
      const a = Math.PI * (1.0 + 0.9 * hash(seed, i, 7)) - dir * 0.35;
      const x = cx + Math.cos(a) * rx * 0.75 - dir * hw * 0.06, y = cy + Math.sin(a) * ry * 0.8 - hw * 0.06;
      if (f === 'B' || y < cy - ry * 0.35) { circ(x, y, r * 0.6, ch.hc); px(x - 1, y - 1, ch.hh); }
    }
    // a curl falling on the forehead
    if (f !== 'B') { circ(cx + dir * hw * 0.12, cy - ry * 0.48, r * 0.75, ch.hc); px(cx + dir * hw * 0.12, cy - ry * 0.48 + r * 0.6, ch.hc); }
  } else if (ch.hair === 'long') {
    // crown + side curtains
    for (let j = Math.floor(cy - ry - 2); j <= cy; j++) for (let i = Math.floor(cx - rx - 2); i <= cx + rx + 2; i++) {
      const dx = (i + 0.5 - cx) / (rx + 2), dy = (j + 0.5 - cy) / (ry + 2);
      const fore = (j - (cy - ry * 0.45)) - Math.abs(i - (cx + dir * hw * 0.15 + hw * 0.1)) * 0.25;
      if (dx * dx + dy * dy <= 1 && (fore < 0 || f === 'B')) px(i, j, ch.hc);
    }
    const sideW = hw * 0.2;
    [-1, 1].forEach((sd) => {
      if (f !== 'F' && sd === dir) return;
      const x0 = cx + sd * (rx - sideW * 0.4);
      for (let j = 0; j < hh * 1.25; j++) {
        const wv = Math.round(Math.sin(j * 0.28 + sd) * 1.6);
        rect(x0 - sideW / 2 + wv + sd * j * 0.06, cy - ry * 0.4 + j, sideW, 1, ch.hc);
        if (j % 3 === 0) px(x0 + wv + sd * j * 0.06, cy - ry * 0.4 + j, ch.hh);
      }
    });
    for (let i = 0; i < 4; i++) px(cx - hw * 0.2 + i * 3, cy - ry * 0.85 + (i % 2), ch.hh);
  } else if (ch.hair === 'short') {
    for (let j = Math.floor(cy - ry - 1); j <= cy - ry * 0.35; j++) for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++) {
      const dx = (i + 0.5 - cx) / (rx + 1), dy = (j + 0.5 - cy) / (ry + 1);
      if (dx * dx + dy * dy <= 1) px(i, j, ch.hc);
    }
  }
  if (ch.cap) {
    ellipse(cx, cy - ry * 0.62, rx * 1.06, ry * 0.42, ch.cap);
    rect(cx - rx * 1.06, cy - ry * 0.62, rx * 2.12, ry * 0.18, ch.cap);
    rect(cx + dir * rx * 0.35 - rx * 0.6, cy - ry * 0.46, rx * 1.2, Math.max(2, ry * 0.1), DARKER[ch.cap]);
  }
  if (ch.phones && f !== 'B') { rect(cx - rx - 2, cy - 3, 3, 7, C.ink); rect(cx - rx - 1, cy - ry * 0.6, 1, ry * 0.6, C.ink); rect(cx + rx - 1, cy + ry * 0.2, 4, 9, C.d3); }
  if (ch.glasses && f !== 'B') {
    const gy = ey - 2, gw = Math.max(4, Math.round(hw * 0.2)), gh = Math.max(3, Math.round(hw * 0.14));
    const gx = [Math.round(cx - hw * 0.2) - gw / 2, Math.round(cx + hw * 0.2) - gw / 2];
    gx.forEach((x) => { line(x, gy, x + gw, gy, C.ink); line(x, gy + gh, x + gw, gy + gh, C.ink); line(x, gy, x, gy + gh, C.ink); line(x + gw, gy, x + gw, gy + gh, C.ink); });
    line(gx[0] + gw, gy + 1, gx[1], gy + 1, C.ink);
  }
  if (ch.hoops && f !== 'B') {
    [-1, 1].forEach((sd) => { if (f !== 'F' && sd === dir) return; const x = cx + sd * rx * 0.98, y = cy + ry * 0.45; circ(x, y + 3, 3, C.bl); circ(x, y + 3, 2, -1); for (let a = 0; a < 8; a++) px(x + Math.round(Math.cos(a * 0.785) * 3), y + 3 + Math.round(Math.sin(a * 0.785) * 3), C.bl2); });
  }
}
function person(cx, top, hw, ch, o = {}) {      // head + bust
  const hh = hw * 1.18;
  const by = top + hh * 0.92;
  if (ch.hair === 'long') {
    // draw hair behind first via head() order: head draws back hair -> but bust must sit between; emulate
  }
  bust(cx + (o.bodyX || 0), by, hw * (o.bw || 1.7), o.bh || hw * 1.2, ch, o.lean || 0);
  head(cx, top, hw, ch, o);
}
// small full-body walker (Beck with tote), feet at (x, yFeet), hw = head width
function walker(x, yf, hw, ch, t, o = {}) {
  const tq = q12(t), ph = Math.floor(tq * 8) % 4;
  const H2 = hw * 3.3;
  const top = yf - H2 - hw * 1.18;
  const legs = [[-2, 2], [0, 0], [2, -2], [0, 0]][ph];
  rect(x - 3 + legs[0], yf - hw * 1.2, 3, hw * 1.2, C.d2); rect(x + 1 + legs[1], yf - hw * 1.2, 3, hw * 1.2, C.d2);
  rect(x - 4 + legs[0], yf - 1, 5, 2, C.ink); rect(x + legs[1], yf - 1, 5, 2, C.ink);
  poly([[x - hw * 0.45, top + hw * 1.12], [x + hw * 0.45, top + hw * 1.12], [x + hw * 0.75, yf - hw * 1.0], [x - hw * 0.75, yf - hw * 1.0]], ch.coat);
  poly([[x + hw * 0.1, top + hw * 1.12], [x + hw * 0.45, top + hw * 1.12], [x + hw * 0.75, yf - hw * 1.0], [x + hw * 0.25, yf - hw * 1.0]], ch.coat2);
  if (o.tote) { const sw = ph % 2; rect(x + hw * 0.5, top + hw * 1.3, 1, hw * 0.9, C.gr37); rect(x + hw * 0.35, top + hw * 2.1 + sw, hw * 0.75, hw * 0.85, C.pap); rect(x + hw * 0.35, top + hw * 2.1 + sw + hw * 0.7, hw * 0.75, 1, C.gr37); }
  head(x, top + (ph % 2 ? 1 : 0), hw, ch, { face: o.face || 'L', seed: 3, lookDown: false, chinShade: false });
}

// ---------------------------------------------------------------- scenes (local time t in seconds)
function city(y0, seed, n, cols, lit, t, tw = true) {
  let x = -4;
  for (let i = 0; i < n && x < W; i++) {
    const w = 14 + Math.floor(hash(seed, i) * 22), h = 20 + Math.floor(hash(seed, i, 1) * 55);
    rect(x, y0 - h, w, h + 40, cols[i % cols.length]);
    for (let wy = y0 - h + 4; wy < y0 + 30; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) {
      const on = hash(seed, wx, wy) < 0.34 + (tw ? 0.1 * Math.sin(q12(t) * 2 + wx * 0.3 + wy) : 0);
      if (on) rect(wx, wy, 2, 2, lit);
    }
    x += w + (hash(seed, i, 3) < 0.3 ? 2 : 0);
  }
}
// 1 — bookstore: he watches her walk in
function scene1(t) {
  const tq = q12(t);
  rect(0, 0, W, H, C.d2);
  shelves(0, 6, 150, 174, 11);
  // window/door to the street
  CLIP = (x, y) => x >= 168 && x < 312 && y >= 14 && y < 160;
  vgrad(168, 14, 144, 70, [C.n26, C.n25, C.n24]);
  city(84, 21, 12, [C.n23, C.n24, C.n22], C.l9, t);
  rect(168, 120, 144, 40, C.n24); dith(168, 120, 144, 40, C.n24, C.n25, 0.2);
  foliage(290, 20, 26, 5); foliage(178, 14, 16, 6);
  for (let i = 0; i < 4; i++) { const xx = 200 + i * 30 + Math.round(tq * 6) % 30; rect(xx, 98, 5, 22, C.n22); circ(xx + 2, 96, 3, C.n22); }
  walker(268 - tq * 22, 150, 12, CAST.beck, t, { tote: true, face: 'L' });
  fallingLeaves(t, 31, 10, 168, 312, 10, 160);
  CLIP = null;
  // window frame
  rect(164, 10, 4, 154, C.b5); rect(312, 10, 4, 154, C.b5); rect(164, 10, 152, 4, C.b5); rect(238, 10, 3, 154, C.b5); rect(164, 82, 152, 3, C.b5); rect(164, 160, 152, 6, C.d4);
  // hanging lamp
  line(122, 0, 122, 14, C.ink);
  poly([[112, 24], [132, 24], [126, 14], [118, 14]], C.d3);
  rect(114, 24, 16, 2, C.l10);
  lampGlow(122, 34, 46, 0.55 + 0.05 * Math.sin(tq * 9));
  // foreground books
  for (let i = 0; i < 9; i++) rect(210 + i * 11, 164 - (i % 3) * 2, 10, 20, [C.r13, C.b6, C.n24, C.r12, C.b5][i % 5]);
  rect(205, 162, 115, 3, C.b5);
  // Joe, profile right, in the foreground
  person(58, 36, 62, CAST.joe, { face: 'R', bw: 2.0, bh: 90, seed: 1, brow: true });
}
// 2 — the street: she walks, he hides; the daydream bubble
function scene2(t) {
  const tq = q12(t);
  vgrad(0, 0, W, 120, [C.n25, C.n24, C.u29]);
  // brownstones
  rect(70, 10, 120, 150, C.b5); dith(70, 10, 120, 150, C.b5, C.d4, 0.3);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { rect(84 + i * 26, 22 + j * 34, 14, 22, C.d2); rect(85 + i * 26, 23 + j * 34, 12, 9, C.n24); }
  rect(190, 0, 130, 160, C.d4); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) rect(200 + i * 36, 10 + j * 30, 16, 20, hash(9, i, j) < 0.4 ? C.l9 : C.d2);
  // stoop + railings
  for (let i = 0; i < 6; i++) rect(88 + i * 6, 120 + i * 6, 70 - i * 6, 6, C.d4);
  for (let i = 0; i < 14; i++) rect(70 + i * 7, 128, 1, 26, C.ink); rect(70, 128, 98, 1, C.ink);
  // tree
  rect(276, 40, 6, 120, C.d1); foliage(280, 34, 40, 12);
  // wet sidewalk with reflections
  rect(0, 150, W, 30, C.n23); dith(0, 150, W, 30, C.n23, C.n24, 0.25);
  for (let i = 0; i < 40; i++) px(hash(4, i) * W, 152 + hash(5, i) * 26, C.r14);
  const bx = 232 - tq * 14;
  walker(bx, 158, 12, CAST.beck, t, { tote: true, face: 'L' });
  shadeRegion(Math.round(bx) - 10, 159, Math.round(bx) + 12, 178, 0.5);
  fallingLeaves(t, 41, 14, 0, W, 0, 170);
  // Joe behind the brick pillar
  rect(0, 40, 54, 140, C.r12); for (let j = 44; j < 180; j += 6) for (let i = (j / 6) % 2 ? 0 : 6; i < 54; i += 12) rect(i, j, 11, 5, C.r13);
  rect(0, 40, 54, 4, C.d3);
  head(64, 92, 54, CAST.joe, { face: 'B', seed: 2 }); bust(64, 152, 90, 40, CAST.joe);
  // thought bubble (pops in), her dreamy face inside
  const u = eOut(clamp((tq - 0.15) / 0.3));
  if (u > 0) {
    const cx = 150, cy = 44, rw = 52 * u, rh = 30 * u;
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; circ(cx + Math.cos(a) * rw, cy + Math.sin(a) * rh, 12 * u, C.pap); }
    ellipse(cx, cy, rw + 4, rh + 2, C.pap);
    circ(116, 84, 4 * u, C.pap); circ(104, 96, 2.5 * u, C.pap);
    if (u > 0.9) {
      CLIP = (x, y) => ((x - cx) / (rw + 2)) ** 2 + ((y - cy) / (rh)) ** 2 < 1;
      person(cx, cy - 24, 30, CAST.beck, { face: 'F', closed: true, smile: true, bw: 1.7 });
      leaf(cx - 34, cy - 6, C.r15, Math.floor(tq * 6)); leaf(cx + 32, cy + 8, C.r14, Math.floor(tq * 6) + 1); leaf(cx + 26, cy - 18, C.r16, 0);
      CLIP = null;
    }
  }
}
// 3 — the phone and her lit window
function scene3(t) {
  const tq = q12(t);
  rect(0, 0, W, H, C.r12); for (let j = 0; j < H; j += 6) for (let i = (j / 6) % 2 ? 0 : 8; i < W; i += 16) rect(i, j, 15, 5, C.r13);
  dith(0, 0, W, H, C.r12, C.d3, 0.35);
  // window with her at the desk
  rect(176, 26, 112, 96, C.d3); rect(180, 30, 104, 88, C.l9); vgrad(180, 30, 104, 88, [C.l10, C.l9, C.b8]);
  rect(180, 92, 104, 26, C.b6);
  person(226, 56, 22, CAST.beck, { face: 'R', lookDown: true, bw: 1.9, bh: 22 });
  line(262, 60, 268, 70, C.ink); poly([[262, 70], [276, 70], [272, 64], [266, 64]], C.d2); lampGlow(268, 76, 18, 0.5);
  rect(230, 30, 3, 88, C.b5); rect(180, 72, 104, 3, C.b5); rect(176, 118, 112, 6, C.d4);
  foliage(300, 14, 26, 21); foliage(190, 8, 18, 22); fallingLeaves(t, 51, 6, 160, W, 0, 180);
  // hand + phone
  const sy = Math.round(lerp(30, 0, eOut(tq / 0.5)));
  poly([[18, 180], [50, 120], [92, 116], [130, 150], [140, 180]], C.sk2);
  rect(26, 18, 100, 150, C.ink); rect(30, 26, 92, 134, C.n22);
  CLIP = (x, y) => x >= 30 && x < 122 && y >= 26 && y < 160;
  rect(30, 26 + sy, 92, 10, C.n23); circ(38, 31 + sy, 3, C.gr36); rect(44, 30 + sy, 30, 2, C.gr36);
  rect(34, 40 + sy, 84, 84, C.g33); vgrad(34, 40 + sy, 84, 84, [C.g34, C.g33, C.b6]);
  person(70, 60 + sy, 26, CAST.beck, { face: 'L', lookDown: true, bw: 1.9 });
  rect(76, 102 + sy, 30, 14, C.pap); line(91, 102 + sy, 91, 116 + sy, C.gr36);
  foliage(110, 44 + sy, 12, 23, [C.g34, C.b7, C.l9]);
  const liked = tq >= 1.0;
  const hp = liked ? (tq < 1.17 ? 2 : 1) : 0;
  const heart = (x, y, s, c) => { circ(x - s, y, s, c); circ(x + s, y, s, c); poly([[x - 2 * s, y + 1], [x + 2 * s, y + 1], [x, y + 2.4 * s]], c); };
  heart(44, 136 + sy, 3 + hp, liked ? C.heart : C.gr35); heart(64, 136 + sy, 3, C.gr35);
  rect(100, 135 + sy, 3, 3, C.gr35); rect(106, 135 + sy, 3, 3, C.gr35);
  CLIP = null;
  // thumb (taps at 1.0 s)
  const tap = tq >= 0.83 && tq < 1.08 ? -6 : 0;
  ellipse(64 + tap * 0.3, 166 + tap, 18, 10, C.sk2); ellipse(62 + tap * 0.3, 160 + tap, 8, 6, C.sk);
  poly([[100, 120], [126, 116], [140, 140], [134, 180], [110, 180]], C.sk2);
}
// 4 — split: the romantic and the hidden box
function scene4(t) {
  const tq = q12(t);
  const tear = (y) => 150 - y * 0.24 + (hash(77, Math.floor(y / 3)) - 0.5) * 6;
  const rev = eOut(tq / 0.35);
  CLIP = (x, y) => x < tear(y);
  rect(0, 0, W, H, C.b8); dith(0, 0, W, H, C.b8, C.sk2, 0.35);
  for (let i = 0; i < 14; i++) leaf(hash(80, i) * 150, hash(81, i) * 100, [C.r14, C.r15, C.r13][i % 3], i);
  person(72, 40, 50, CAST.joe, { face: 'R', bw: 2.1, bh: 80, seed: 4, smile: tq > 1.0 });
  for (let i = 0; i < 12; i++) {
    const x = 6 + hash(82, i) * 120, y = 140 + hash(83, i) * 36 + Math.round(Math.sin(tq * 4 + i));
    circ(x, y, 7, C.r13); circ(x, y, 5, C.r14); circ(x - 1, y - 1, 2, C.r15); rect(x - 1, y + 7, 2, 6, C.g33);
  }
  CLIP = (x, y) => x >= tear(y);
  rect(0, 0, W, H, C.d1); shelves(150, 0, 170, 120, 90, true);
  rect(150, 120, 170, 60, C.d2);
  // metal box on a table, lid open, a faint glow from inside
  rect(176, 122, 120, 6, C.d4); rect(196, 104, 64, 20, C.gr35); rect(196, 104, 64, 3, C.gr36); poly([[196, 104], [260, 104], [254, 92], [202, 92]], C.d4);
  for (let i = 0; i < 5; i++) rect(202 + i * 11, 100, 8, 6, [C.pap, C.r13, C.gr37, C.pap, C.n25][i]);
  lampGlow(228, 102, 30, 0.35);
  head(248, 46, 44, CAST.joe, { face: 'PL', lookDown: true, seed: 8 }); bust(250, 96, 80, 60, CAST.joe, -10);
  rect(220, 100, 14, 6, CAST.joe.skin);
  CLIP = null;
  // torn paper edge
  for (let y = 0; y < H; y++) { const x = tear(y); px(x, y, C.pap); px(x + 1, y, C.gr37); }
  if (rev < 1) for (let y = 0; y < H; y++) for (let x = Math.round(tear(y)); x < W; x++) if (x > tear(y) + W * rev) px(x, y, C.b8);
}
// 5 — her friends, the looming shadows, him from behind
function scene5(t) {
  const tq = q12(t);
  vgrad(0, 0, W, H, [C.gr35, C.d4, C.d2]);
  const sh = Math.round(tq * 3);
  for (let i = 0; i < 7; i++) { const x = 20 + i * 46, y = 10 + (i % 2) * 8 + sh; ellipse(x, y + 10, 14, 16, C.d3); poly([[x - 22, y + 24], [x + 22, y + 24], [x + 28, y + 120], [x - 28, y + 120]], C.d3); }
  const blink = Math.abs(tq - 1.25) < 0.05;
  person(44, 72, 34, CAST.ana, { face: 'R', bw: 2, closed: blink });
  person(102, 52, 36, CAST.benji, { face: 'R', bw: 2, seed: 5 });
  person(276, 70, 34, CAST.ana, { face: 'L', bw: 2, seed: 6 });
  person(236, 50, 36, { ...CAST.benji, glasses: false, hair: 'short' }, { face: 'L', bw: 2 });
  person(164, 30, 50, CAST.peach, { face: 'F', bw: 2.2, bh: 100, lookDown: true, closed: blink });
  head(160, 136, 58, CAST.joe, { face: 'B', seed: 9 }); bust(160, 196, 110, 30, CAST.joe);
}
// 6 — her desk: writing late
function scene6(t) {
  const tq = q12(t);
  rect(0, 0, W, H, C.d3); dith(0, 0, W, 130, C.d3, C.d4, 0.3);
  rect(140, 6, 170, 90, C.b5); dith(140, 6, 170, 90, C.b5, C.b6, 0.3);
  for (let i = 0; i < 10; i++) { const x = 146 + (i % 5) * 32 + hash(60, i) * 6, y = 10 + Math.floor(i / 5) * 40 + hash(61, i) * 6; rect(x, y, 22, 26, i % 3 ? C.pap : C.gr37); rect(x + 10, y + 1, 2, 2, C.r14); if (i % 3 === 0) { rect(x + 4, y + 6, 14, 14, C.gr35); circ(x + 11, y + 10, 3, C.d3); } }
  for (let i = 0; i < 16; i++) { const a = -0.3 + i * 0.22, r = 14 + (i % 4) * 8; const lx = 18 + Math.cos(a) * r, ly = 8 + Math.sin(a) * r * 0.8; line(18, 0, lx, ly, C.g32); ellipse(lx, ly, 6, 3, i % 3 ? C.g33 : C.g34); }
  // lamp
  line(292, 40, 280, 90, C.ink); line(292, 40, 266, 30, C.ink); poly([[248, 30], [276, 24], [282, 40], [256, 44]], C.ink); lampGlow(262, 60, 70, 0.6);
  // desk
  rect(0, 130, W, 50, C.b6); rect(0, 130, W, 3, C.b7);
  for (let i = 0; i < 4; i++) rect(14, 104 + i * 7, 50 - i * 4, 7, [C.r13, C.b5, C.n24, C.u29][i]);
  rect(250, 92, 56, 40, C.d1); rect(254, 96, 48, 30, C.n23); rect(244, 128, 70, 4, C.gr35);
  // Beck, chin on hand, writing
  person(160, 34, 54, CAST.beck, { face: 'L', lookDown: true, bw: 2.2, bh: 70 });
  ellipse(128, 104, 9, 14, CAST.beck.skin);
  rect(100, 134, 92, 30, C.pap); line(146, 134, 146, 164, C.gr36);
  const u = tq / 2;
  for (let r = 0; r < 4; r++) { const len = clamp(u * 4 - r) * 34; if (len > 0) for (let i = 0; i < len; i++) if (hash(62, r, i) < 0.8) px(152 + i, 140 + r * 5 + (i % 3 === 0 ? 1 : 0), C.d3); }
  const pr = Math.min(3, Math.floor(u * 4)), pl = clamp(u * 4 - pr) * 34;
  const pxp = 152 + pl, pyp = 140 + pr * 5;
  line(pxp, pyp, pxp + 6, pyp - 12, C.ink); ellipse(pxp + 8, pyp - 6, 7, 5, CAST.beck.skin);
  // mug with steam
  rect(212, 118, 16, 16, C.pap); rect(228, 122, 4, 8, C.pap); circ(216, 124, 2, C.r14); circ(223, 128, 2, C.r14);
  for (let i = 0; i < 6; i++) px(218 + Math.round(Math.sin(tq * 6 + i) * 2), 114 - i * 2 - Math.floor(tq * 6) % 2, C.gr37);
}
// 7 — triptych: phone, store, window
function scene7(t) {
  const tq = q12(t);
  CLIP = (x) => x < 104;
  rect(0, 0, 104, H, C.b5); for (let j = 0; j < H; j += 9) rect(0, j, 104, 1, C.b6);
  leaf(20, 20, C.b8, 0); leaf(80, 150, C.b7, 1); leaf(70, 30, C.r14, 0);
  const bz = tq > 0.5 && tq < 0.8 ? (Math.floor(tq * 12) % 2 ? 1 : -1) : 0;
  poly([[22 + bz, 60], [86 + bz, 44], [100 + bz, 140], [36 + bz, 156]], C.ink); poly([[26 + bz, 64], [83 + bz, 50], [96 + bz, 137], [39 + bz, 151]], C.n23);
  const msgs = Math.floor(clamp((tq - 0.3) / 1.2) * 4);
  for (let i = 0; i < msgs; i++) { const y = 70 + i * 18, x = 34 + (i % 2) * 12; poly([[x + bz, y], [x + 36 + bz, y - 8], [x + 39 + bz, y + 4], [x + 3 + bz, y + 12]], i % 2 ? C.gr36 : C.gr37); }
  CLIP = (x) => x >= 108 && x < 212;
  rect(108, 0, 104, H, C.d2); shelves(108, 0, 30, 180, 71); shelves(182, 0, 30, 180, 72);
  rect(138, 0, 44, 180, C.d1); line(160, 0, 160, 22, C.ink); poly([[152, 30], [168, 30], [164, 22], [156, 22]], C.d3);
  lampGlow(160, 50, 50, 0.55 + (Math.floor(tq * 12) % 7 === 0 ? -0.2 : 0));
  rect(140, 138, 40, 4, C.b6); rect(144, 142, 3, 20, C.b5); rect(174, 142, 3, 20, C.b5); rect(148, 132, 18, 6, C.r13);
  CLIP = (x) => x >= 216;
  rect(216, 0, 104, H, C.d3); for (let j = 0; j < H; j += 6) for (let i = 216 + ((j / 6) % 2 ? 0 : 6); i < W; i += 12) rect(i, j, 11, 5, C.d4);
  rect(238, 60, 60, 60, C.d1); rect(242, 64, 52, 52, C.l9); vgrad(242, 64, 52, 52, [C.l10, C.l9, C.b7]);
  person(268 + Math.round(Math.sin(tq * 2) * 3), 80, 16, { ...CAST.beck, skin: C.d3, skd: C.d3, hc: C.d2, hh: C.d2, coat: C.d3, coat2: C.d2, collar: C.d3 }, { face: 'B' });
  rect(266, 64, 2, 52, C.b5); rect(242, 88, 52, 2, C.b5);
  rect(230, 0, 2, 180, C.d1); foliage(300, 16, 22, 73); fallingLeaves(t, 74, 5, 216, W, 0, 180);
  CLIP = null;
  rect(104, 0, 4, H, C.ink); rect(212, 0, 4, H, C.ink);
}
// 8 — the ensemble against the skyline
function scene8(t) {
  const tq = q12(t);
  vgrad(0, 0, W, 120, [C.u28, C.u29, C.u30, C.u31]);
  city(120, 81, 16, [C.u28, C.n22, C.u29], C.l9, t);
  rect(152, 14, 16, 110, C.n22); rect(156, 4, 8, 12, C.n22); rect(159, -4, 2, 10, C.n22); for (let j = 20; j < 120; j += 5) rect(155, j, 2, 2, hash(82, j) < 0.5 ? C.l9 : C.n23);
  foliage(10, 4, 30, 83); foliage(310, 2, 26, 84);
  const bob = (i) => Math.round(Math.sin(tq * 3 + i) * 0.6);
  person(64, 52 + bob(0), 42, CAST.cap, { face: 'R', bw: 2.1, bh: 80 });
  person(140, 40 + bob(1), 38, CAST.benji, { face: 'F', bw: 2.1, bh: 80, seed: 11 });
  person(252, 36 + bob(2), 44, CAST.ana, { face: 'L', bw: 2.1, bh: 80, seed: 12 });
  person(112, 106 + bob(3), 46, CAST.peach, { face: 'R', bw: 2.2, bh: 60 });
  person(206, 98 + bob(4), 50, CAST.beck, { face: 'L', bw: 2.2, bh: 60 });
  fallingLeaves(t, 85, 8, 0, W, 0, 120);
}
// 9 — on set: camera rolling
function scene9(t) {
  const tq = q12(t);
  vgrad(0, 0, W, H, [C.d4, C.d3, C.d2]);
  for (let i = 0; i < 4; i++) { const x = 30 + i * 70; ellipse(x, 70, 9, 11, C.d2); rect(x - 12, 80, 24, 60, C.d2); }
  poly([[232, 12], [268, 4], [276, 36], [240, 44]], C.pap); lampGlow(254, 24, 50, 0.45); rect(266, 36, 2, 70, C.ink); rect(290, 10, 30, 6, C.ink); rect(300, 16, 2, 60, C.ink);
  person(92, 30, 56, CAST.joe, { face: 'R', bw: 2.2, bh: 100, seed: 13, brow: true });
  // crew member with script
  person(252, 70, 42, CAST.crew, { face: 'L', bw: 2.1, bh: 70, lookDown: true });
  const flip = tq > 1.1 && tq < 1.3;
  poly([[206, 128], [246, 122], [252, 172], [212, 178]], C.pap); for (let i = 0; i < 5; i++) line(212, 136 + i * 7, 242, 132 + i * 7, C.gr36);
  if (flip) poly([[228, 125], [256, 114], [260, 164], [232, 176]], C.gr37);
  ellipse(212, 164, 6, 5, CAST.crew.skin); ellipse(250, 156, 6, 5, CAST.crew.skin);
  // camera + monitor
  rect(140, 150, 70, 30, C.d1); rect(146, 130, 60, 30, C.ink); rect(150, 134, 52, 22, C.gr35);
  CLIP = (x, y) => x >= 150 && x < 202 && y >= 134 && y < 156;
  person(172, 136, 14, { ...CAST.joe, skin: C.gr37, skd: C.gr36, coat: C.d3 }, { face: 'R', bw: 2 });
  CLIP = null;
  if (Math.floor(tq * 2) % 2 === 0) circ(198, 138, 2, C.tvr);
  rect(110, 156, 34, 18, C.ink); circ(112, 165, 9, C.d2); circ(112, 165, 6, C.n23); px(110, 162, C.n26);
}
// 10 — from the old set to the red screen
function scene10(t) {
  const tq = q12(t);
  const cut = (y) => 162 - y * 0.22;
  CLIP = (x, y) => x < cut(y);
  rect(0, 0, W, H, C.d2); dith(0, 0, W, H, C.d2, C.d3, 0.3);
  rect(10, 112, 130, 68, C.b5); rect(10, 112, 130, 3, C.b6);
  rect(20, 40, 104, 74, C.gr35); rect(24, 44, 96, 66, C.d1); rect(28, 48, 74, 58, C.n24);
  CLIP = (x, y) => x >= 28 && x < 102 && y >= 48 && y < 106 && x < cut(y);
  vgrad(28, 48, 74, 58, [C.n25, C.n24]); city(106, 101, 6, [C.n22, C.n23], C.n26, 0, false);
  const fr = Math.floor(tq * 12);
  for (let y = 48; y < 106; y++) for (let x = 28; x < 102; x++) if (hash(fr, x, y) < 0.18) px(x, y, hash(fr, y, x) < 0.5 ? C.gr37 : C.gr35);
  CLIP = (x, y) => x < cut(y);
  rect(106, 54, 10, 4, C.gr36); rect(106, 64, 10, 4, C.gr36); rect(50, 114, 4, 6, C.ink); rect(92, 114, 4, 6, C.ink);
  CLIP = (x, y) => x >= cut(y);
  rect(0, 0, W, H, C.r13); dith(0, 0, W, H, C.r13, C.r12, 0.4);
  const on = clamp((tq - 0.8) / 0.25);
  rect(174, 34, 132, 84, C.ink);
  if (on > 0) {
    const hh = Math.max(1, Math.round(76 * on));
    CLIP = (x, y) => x >= 178 && x < 302 && y >= 76 - hh / 2 && y < 76 + hh / 2;
    rect(178, 38, 124, 76, C.tvr); dith(178, 38, 124, 76, C.tvr, C.r13, 0.3);
    person(240, 46, 30, { ...CAST.joe, skin: C.r12, skd: C.r12, hc: C.r12, hh: C.r12, coat: C.r12, coat2: C.r12, collar: C.r12 }, { face: 'B', seed: 3 });
    for (let i = 0; i < 5; i++) rect(184 + i * 24, 100, 20, 10, [C.gr37, C.u31, C.u30, C.u29, C.gr36][i]);
    CLIP = null;
  }
  CLIP = (x, y) => x >= cut(y);
  rect(230, 118, 20, 6, C.ink); rect(180, 124, 130, 56, C.d2);
  CLIP = null;
  for (let y = 0; y < H; y++) { px(cut(y), y, C.pap); }
  // arrow
  const a = clamp((tq - 0.3) / 0.5);
  const n = Math.floor(a * 30);
  for (let i = 0; i <= n; i++) { const u = i / 30, x = lerp(124, 170, u), y = 110 - Math.sin(u * Math.PI) * 18 - u * 6; rect(x, y, 3, 3, C.pap); }
  if (a >= 1) { poly([[170, 96], [178, 104], [168, 110]], C.pap); }
}
// 11 — her empty desk / him alone in the dark
function scene11(t) {
  const tq = q12(t);
  const sp = (x) => 104 + x * 0.08;
  CLIP = (x, y) => y < sp(x);
  rect(0, 0, W, H, C.d3); dith(0, 0, W, 90, C.d3, C.d4, 0.3);
  for (let i = 0; i < 5; i++) rect(70 + i * 30, 6 + (i % 2) * 6, 20, 24, C.pap);
  rect(250, 8, 50, 60, C.n23); rect(274, 8, 2, 60, C.d2); rect(250, 36, 50, 2, C.d2);
  rect(0, 80, W, 40, C.b6); rect(0, 80, W, 2, C.b7);
  rect(30, 58, 14, 22, C.n26); for (let i = 0; i < 7; i++) { line(37, 58, 26 + i * 4, 40 + (i % 2) * 4, C.g33); circ(26 + i * 4, 40 + (i % 2) * 4, 2, i % 2 ? C.l10 : C.pap); }
  for (let i = 0; i < 3; i++) rect(70, 74 - i * 5, 40, 5, [C.r13, C.b5, C.n24][i]);
  rect(130, 72, 50, 8, C.pap); line(155, 72, 155, 80, C.gr36);
  rect(196, 66, 12, 14, C.pap); circ(200, 72, 2, C.r14);
  const flick = Math.floor(tq * 12) % 9 === 0 ? 0.2 : 0.55;
  line(250, 80, 236, 40, C.ink); poly([[220, 34], [244, 30], [248, 44], [226, 48]], C.ink); lampGlow(232, 56, 50, flick);
  rect(262, 50, 34, 40, C.d1); poly([[264, 50], [294, 50], [298, 90], [262, 96]], C.gr35); dith(262, 50, 36, 46, C.gr35, C.r13, 0.3);
  CLIP = (x, y) => y >= sp(x) + 2;
  rect(0, 0, W, H, C.n22); shelves(0, 100, 90, 80, 111, true); shelves(230, 100, 90, 80, 112, true);
  rect(130, 160, 64, 4, C.d2); rect(134, 164, 3, 16, C.d2); rect(188, 164, 3, 16, C.d2);
  const br = Math.floor(tq * 1.5) % 2;
  head(160, 118 + br, 30, CAST.joe, { face: 'B', seed: 14 });
  poly([[140, 146 + br], [180, 146 + br], [190, 172], [130, 172]], C.d2);
  ellipse(160, 168, 18, 5, C.d3);
  for (let i = 0; i < 12; i++) { const y = 108 + ((hash(115, i) * 70 + tq * 6) % 70); px(60 + hash(116, i) * 200, y, C.n25); }
  CLIP = null;
  for (let x = 0; x < W; x++) { px(x, sp(x), C.ink); px(x, sp(x) + 1, C.ink); }
}
// 12 — at the window, the reflection
function scene12(t) {
  const tq = q12(t);
  rect(0, 0, W, H, C.n22);
  // city bokeh behind glass
  for (let i = 0; i < 40; i++) { const x = 150 + hash(120, i) * 170, y = 40 + hash(121, i) * 140; circ(x, y, 3 + hash(122, i) * 5, [C.l9, C.r14, C.n25, C.l10, C.r15][i % 5], 0.45, -1); }
  // reflection: large, darker, looking down
  shadeRegion(150, 10, W, H, 0, null);
  const refl = { ...CAST.joe, skin: C.n24, skd: C.n23, hc: C.n22, hh: C.n23, coat: C.n23, coat2: C.n22, collar: C.n23 };
  CLIP = (x, y) => x >= 152 && bay(x, y) < 0.6;
  head(236, 18, 92, refl, { face: 'L', lookDown: true, seed: 17, frown: true, noShine: true }); bust(236, 120, 170, 60, refl);
  CLIP = null;
  // rain on the glass
  for (let i = 0; i < 46; i++) {
    const x = 152 + hash(125, i) * 168, sp = 40 + hash(126, i) * 60, len = 3 + Math.floor(hash(127, i) * 6);
    const y = (hash(128, i) * 200 + tq * sp) % 200 - 10;
    for (let k = 0; k < len; k++) px(x, y + k, k === len - 1 ? C.n27 : C.n26);
  }
  // window frame
  rect(144, 0, 8, H, C.d3); rect(144, 0, 8, H, C.d2); rect(146, 0, 2, H, C.d4); rect(300, 0, 6, H, C.d2);
  foliage(18, 8, 30, 130); fallingLeaves(t, 131, 5, 0, 150, 0, 180);
  // Joe, three-quarter right, the faintest smile
  person(96, 44, 70, CAST.joe, { face: 'R', bw: 2.2, bh: 100, seed: 18, smile: tq > 1.4, brow: true });
}
const SCENES = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9, scene10, scene11, scene12];
const CUTS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25];

// ---------------------------------------------------------------- compositing
function renderScene(i, t) { CLIP = null; FB.fill(0); SCENES[i](t); return FB.slice(); }
function blit(buf) {
  const d = img.data;
  for (let k = 0; k < W * H; k++) { const c = PAL[buf[k]]; d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255; }
  lctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lo, 0, 0, W * S, H * S);
}
window.renderAt = async (t) => {
  const f = Math.round(t * FPS), tt = f / FPS;
  let i = 0; while (i < 11 && tt >= CUTS[i + 1]) i++;
  const lt = tt - CUTS[i];
  let out = renderScene(i, lt);
  // Bayer dither wipe into the next panel over the last 0.25 s (diagonal sweep)
  const tw = 0.25;
  if (i < 11 && CUTS[i + 1] - tt <= tw) {
    const u = 1 - (CUTS[i + 1] - tt) / tw;
    const nx = renderScene(i + 1, 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = (x / W) * 0.6 + (y / H) * 0.4; if (bay(x, y) * 0.5 + d * 0.5 < u * 1.02) out[y * W + x] = nx[y * W + x]; }
  }
  // opening dither-in and ending dither-out to ink
  const inU = clamp(tt / 0.25), outU = clamp((tt - (DUR - 0.6)) / 0.5);
  for (let k = 0; k < W * H; k++) { const x = k % W, y = (k / W) | 0; if (bay(x, y) > inU || bay(x, y) < outU) out[k] = 0; }
  blit(out);
};
(async () => { await window.renderAt(0); window.__ready = true; })();
