// ink.js — shared frame-by-frame ink toolkit (brush with line boil, off-register fills, blob character, cel FX).
// Extracted from 23-drawn-to-life. Call setCtx(ctx) once and setBoil(n) every frame.
export let X = null, BOIL = 0;
export const setCtx = c => { X = c; }, setBoil = b => { BOIL = b; };
export const INK = '#211b1a', RED = '#e2462e', YEL = '#f4bd2f', CREAM = '#f5e8cc', HI = '#fff6e2';
// ---------------------------------------------------------------- seeded noise
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sn = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (hash(seed, i) * (1 - u) + hash(seed, i + 1) * u) * 2 - 1; };
const rr = (seed, i, a = -1, b = 1) => a + (b - a) * hash(seed * 131 + 7, i);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eOut = u => 1 - Math.pow(1 - u, 3), eIn = u => u * u * u, eIO = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const eBack = u => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

// ---------------------------------------------------------------- brush renderer

function resample(pts, sp = 5) {
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const d = Math.hypot(x1 - x0, y1 - y0); if (!d) continue;
    let s = sp - acc;
    while (s <= d) { out.push([x0 + (x1 - x0) * s / d, y0 + (y1 - y0) * s / d]); s += sp; }
    acc = d - (s - sp);
  }
  const last = pts[pts.length - 1], pl = out[out.length - 1];
  if (Math.hypot(last[0] - pl[0], last[1] - pl[1]) > 0.5) out.push(last);
  return out;
}
// variable-width ink stroke: jitter (boil) + pressure + taper -> filled outline polygon
function brush(pts, w, o = {}) {
  if (pts.length < 2) return;
  const seed = (o.seed ?? 1) * 97 + BOIL * 13, amp = o.amp ?? 1.7, upto = o.upto ?? 1, taper = o.taper ?? [0.18, 0.22];
  let P = resample(pts, 5);
  const n0 = P.length; if (n0 < 2) return;
  const nn = Math.max(2, Math.round(n0 * clamp(upto)));
  if (upto < 1e-3) return;
  P = P.slice(0, nn);
  const L = [], R = [], N = P.length;
  for (let i = 0; i < N; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx, s = i / 9;
    const jx = sn(seed, s) * amp, jy = sn(seed + 5, s) * amp;
    const u = (i / (n0 - 1));
    let p = 1 + 0.2 * sn(seed + 9, s * 0.6);
    const tin = taper[0] > 0 ? clamp(u / taper[0]) : 1, tout = taper[1] > 0 ? clamp((1 - u) / taper[1]) : 1;
    p *= (0.28 + 0.72 * Math.sqrt(tin)) * (0.18 + 0.82 * Math.sqrt(upto < 1 && i > N - 4 ? 1 : tout));
    const hw = w * p / 2, x = P[i][0] + jx, y = P[i][1] + jy;
    L.push([x + nx * hw, y + ny * hw]); R.push([x - nx * hw, y - ny * hw]);
  }
  X.beginPath(); X.moveTo(L[0][0], L[0][1]);
  for (const q of L) X.lineTo(q[0], q[1]);
  for (let i = R.length - 1; i >= 0; i--) X.lineTo(R[i][0], R[i][1]);
  X.closePath(); X.fillStyle = o.color || INK; X.fill();
  // round caps
  X.beginPath(); X.arc(P[0][0], P[0][1], Math.max(0.5, w * 0.14), 0, 7); X.fill();
}
// closed shape fill, off-register like hand colouring
function fillShape(pts, color, seed = 1, off = 5) {
  const s = seed * 31 + BOIL * 7, ox = sn(s, 0.5) * off + off * 0.6, oy = sn(s + 3, 0.5) * off - off * 0.3;
  X.beginPath();
  pts.forEach((p, i) => { const k = i / 6; const x = p[0] + ox + sn(s + 11, k) * 1.6, y = p[1] + oy + sn(s + 17, k) * 1.6; i ? X.lineTo(x, y) : X.moveTo(x, y); });
  X.closePath(); X.fillStyle = color; X.fill();
}
const ell = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 48, rot = 0) => {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
};

// ---------------------------------------------------------------- the body loop: one scribbled, overlapping circle
const R0 = 147;   // body radius of the drawn loop (= 92 * 1.6)
const LOOP_A0 = -1.95, LOOP_A1 = LOOP_A0 + Math.PI * 2 * 1.08;
function loopPts(cx, cy, r, sx = 1, sy = 1, rot = 0, n = 64) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) { const u = i / n, a = LOOP_A0 + (LOOP_A1 - LOOP_A0) * u; const rad = r * (1 + 0.035 * Math.sin(a * 3 + 1) - 0.05 * u * u);
    const x = Math.cos(a) * rad * sx, y = Math.sin(a) * rad * sy; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}

// ---------------------------------------------------------------- character
// base = point between the feet on the ground; legs 0..1 grown; sx/sy squash; rot lean; eyes 'open'|'closed'|'wink'|'none'
function blob(o) {
  const { x, ground, sx = 1, sy = 1, rot = 0, legs = 1, lift = 0, eyes = 'open', look = 0, mouth = 'smile', arms = 0, armPose = 'down', scale = 1.6, shadow = 1, seed = 40, smear = 0, body = RED, band = false, brow = 0 } = o;
  const R = 92 * scale, legLen = 46 * scale * legs;
  const hipY = ground - legLen - lift;
  const cx = x, cy = hipY - R * sy;
  const c = Math.cos(rot), s = Math.sin(rot);
  const M = (lx, ly) => [cx + (lx * sx) * c - (ly * sy) * s, cy + (lx * sx) * s + (ly * sy) * c];
  // ground shadow: hatched ellipse
  if (shadow > 0.02) {
    const sw = 74 * scale * shadow, shh = 11 * scale * shadow;
    for (let i = 0; i < 7; i++) { const u = (i - 3) / 3.3, hx = x + u * sw, hh = shh * Math.sqrt(1 - u * u * 0.85);
      brush([[hx - 7, ground + 6 + hh], [hx + 7, ground + 6 - hh]], 2.6 * scale, { seed: seed + 60 + i, taper: [0.3, 0.3] }); }
  }
  // legs + feet
  if (legs > 0.02) for (const sd of [-1, 1]) {
    const hx = cx + sd * 30 * scale * sx, hy = hipY + 4, fx = x + sd * 36 * scale, fy = ground - lift * 0.0 - (lift > 0 ? lift - 0 : 0);
    const footY = lift > 0 ? hipY + legLen : ground;
    const kx = (hx + fx) / 2 + sd * 6 * scale, ky = (hy + footY) / 2;
    brush([[hx, hy], [kx, ky], [fx, footY - 4]], 5.5 * scale, { seed: seed + (sd > 0 ? 1 : 2) });
    const fo = ell(fx + sd * 9 * scale, footY - 3, 15 * scale, 7 * scale, 0, Math.PI * 2, 18);
    fillShape(fo, INK, seed + 3 + sd, 0.6);
  }
  // body
  const bodyFill = ell(0, 0, 1, 1, 0, Math.PI * 2, 40).map(([a, b]) => M(a * R * 0.99, b * R * 0.99));
  fillShape(bodyFill, body, seed + 5, 6);
  // highlight + hatching
  brush([M(-R * 0.62, -R * 0.2), M(-R * 0.55, -R * 0.48), M(-R * 0.32, -R * 0.66)], 9 * scale, { seed: seed + 6, color: YEL, taper: [0.3, 0.4] });
  for (let i = 0; i < 4; i++) { const a = 0.35 + i * 0.22; const p0 = M(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62), p1 = M(Math.cos(a - 0.25) * R * 0.9, Math.sin(a - 0.25) * R * 0.9);
    brush([p0, p1], 2.6 * scale, { seed: seed + 70 + i, taper: [0.3, 0.4] }); }
  // body outline (the scribbled loop)
  const loop = loopPts(0, 0, R).map(([a, b]) => M(a, b));
  brush(loop, 7 * scale, { seed: seed + 7, taper: [0.08, 0.12] });
  // headband with fluttering tails (hero)
  if (band) {
    const hb = []; for (let i = 0; i <= 12; i++) { const u = i / 12, a = Math.PI + 0.35 + u * (Math.PI - 0.7); hb.push(M(Math.cos(a) * R * 0.99, Math.sin(a) * R * 0.62 - R * 0.12)); }
    brush(hb, 15 * scale, { seed: seed + 80, color: YEL, taper: [0, 0] });
    brush(hb.map(([a, b]) => [a, b - 7 * scale]), 3 * scale, { seed: seed + 81, taper: [0.1, 0.1] });
    brush(hb.map(([a, b]) => [a, b + 7 * scale]), 3 * scale, { seed: seed + 82, taper: [0.1, 0.1] });
    const k = hb[0], fl = sn(seed + BOIL, 0.5);
    for (const [dl, sd] of [[1, 83], [0.75, 84]]) brush([k, [k[0] - 30 * scale * dl, k[1] + (8 + fl * 10) * scale], [k[0] - 62 * scale * dl, k[1] + (2 - fl * 14 * dl) * scale]], 11 * scale, { seed: seed + sd, color: YEL, taper: [0.05, 0.6] });
  }
  // determined brows
  if (brow) for (const sd of [-1, 1]) { const e = M(sd * 30 * scale + look * 10 * scale, -R * 0.18); brush([[e[0] + sd * 20 * scale, e[1] - 38 * scale], [e[0] - sd * 12 * scale, e[1] - 27 * scale + brow * 5 * scale]], 5.5 * scale, { seed: seed + 85 + sd }); }
  // arms
  if (arms > 0.02) for (const sd of [-1, 1]) {
    const sh = M(sd * R * 0.93, R * 0.05);
    let hx, hy;
    if (armPose === 'up') { hx = sh[0] + sd * 50 * scale; hy = sh[1] - 70 * scale; }
    else if (armPose === 'wave' && sd > 0) { const w = Math.sin(o.wave || 0); hx = sh[0] + 46 * scale + w * 18 * scale; hy = sh[1] - 78 * scale; }
    else if (armPose === 'dance') { const ph = o.wave || 0; hx = sh[0] + sd * 52 * scale; hy = sh[1] + (sd * Math.sin(ph) * 46 - 8) * scale; }
    else { hx = sh[0] + sd * 34 * scale; hy = sh[1] + 52 * scale; }
    const mx = (sh[0] + hx) / 2 + sd * 10 * scale, my = (sh[1] + hy) / 2 + 6 * scale;
    brush([sh, [mx, my], [hx, hy]], 5 * scale * arms, { seed: seed + 20 + sd, taper: [0.1, 0.05] });
    const hand = ell(hx, hy, 9 * scale, 9 * scale, 0, Math.PI * 2, 14); fillShape(hand, HI, seed + 23 + sd, 0.5);
    brush(ell(hx, hy, 9 * scale, 9 * scale, 0.3, 0.3 + Math.PI * 2 * 0.95, 14), 3.2 * scale, { seed: seed + 25 + sd, taper: [0.1, 0.1] });
  }
  // face
  if (eyes !== 'none') for (const sd of [-1, 1]) {
    const e = M(sd * 30 * scale + look * 10 * scale, -R * 0.18);
    const closed = eyes === 'closed' || (eyes === 'wink' && sd > 0);
    if (closed) {
      const pts = sd > 0 && eyes === 'wink' ? [[e[0] - 15 * scale, e[1] + 2], [e[0], e[1] - 9 * scale], [e[0] + 15 * scale, e[1] + 2]] : [[e[0] - 15 * scale, e[1]], [e[0], e[1] + 6 * scale], [e[0] + 15 * scale, e[1]]];
      brush(pts, 5 * scale, { seed: seed + 30 + sd });
    } else {
      const er = ell(e[0], e[1], 17 * scale * sx, 23 * scale * sy, 0, Math.PI * 2, 24);
      fillShape(er, HI, seed + 31 + sd, 1.2);
      brush(ell(e[0], e[1], 17 * scale * sx, 23 * scale * sy, -1.2, -1.2 + Math.PI * 2 * 0.97, 24), 3.6 * scale, { seed: seed + 33 + sd, taper: [0.1, 0.1] });
      const px = e[0] + look * 7 * scale + 2 * scale, py = e[1] + 4 * scale;
      fillShape(ell(px, py, 8 * scale, 10.5 * scale, 0, Math.PI * 2, 16), INK, seed + 35 + sd, 0.3);
      fillShape(ell(px - 3 * scale, py - 4 * scale, 2.6 * scale, 2.6 * scale, 0, Math.PI * 2, 8), HI, seed + 37 + sd, 0);
    }
  }
  if (mouth === 'smile') brush([M(-20 * scale + look * 8 * scale, R * 0.22), M(look * 8 * scale, R * 0.36), M(20 * scale + look * 8 * scale, R * 0.22)], 5 * scale, { seed: seed + 40 });
  else if (mouth === 'grin') {
    const m = [M(-26 * scale, R * 0.18), M(0, R * 0.48), M(26 * scale, R * 0.18)];
    fillShape([...ell(0, 0, 1, 1, 0, Math.PI, 16).map(([a, b]) => M(a * 26 * scale, R * 0.18 + b * 30 * scale))], INK, seed + 41, 0.5);
    brush([m[0], M(-8 * scale, R * 0.22), M(8 * scale, R * 0.22), m[2]], 4 * scale, { seed: seed + 42 });
  } else if (mouth === 'o') {
    const mo = M(look * 6 * scale, R * 0.32);
    fillShape(ell(mo[0], mo[1], 9 * scale, 12 * scale, 0, Math.PI * 2, 16), INK, seed + 43, 0.3);
  }
}

// ---------------------------------------------------------------- cel FX
function puff(cx, cy, r, seed, grow = 1, fade = 0) {
  // union of circles: fill, outline, refill smaller to erase inner lines; dissipate by shrinking each lobe
  if (r * grow < 2) return;
  const lobes = [];
  const n = 6;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rr(seed, i, -0.3, 0.3); const d = r * 0.55 * rr(seed, i + 10, 0.8, 1.1);
    const kill = clamp((fade - i / n * 0.6) / 0.4); const lr = r * rr(seed, i + 20, 0.42, 0.6) * grow * (1 - eIn(kill));
    if (lr > 1.5) lobes.push([cx + Math.cos(a) * d * grow, cy + Math.sin(a) * d * grow * 0.85, lr]); }
  const cr = r * 0.55 * grow * (1 - eIn(clamp(fade * 1.3))); if (cr > 1.5) lobes.push([cx, cy, cr]);
  for (const [x, y, q] of lobes) fillShape(ell(x, y, q, q, 0, 6.29, 20), HI, seed + 3, 0);
  lobes.forEach(([x, y, q], i) => brush(ell(x, y, q, q, i, i + Math.PI * 2, 22), Math.max(2.2, 5.2 * Math.min(1, q / 40)), { seed: seed + i * 3, taper: [0.05, 0.05], amp: 1.3 }));
  for (const [x, y, q] of lobes) if (q > 6) fillShape(ell(x, y, q - 4.5, q - 4.5, 0, 6.29, 20), HI, seed + 4, 0);
  // curl inside the biggest lobe
  if (lobes.length) { const [x, y, q] = lobes[lobes.length - 1]; if (q > 18) brush(ell(x - q * 0.1, y - q * 0.05, q * 0.4, q * 0.35, 3.6, 5.8, 10), 3, { seed: seed + 50 }); }
}
function star(cx, cy, r, n, seed, rot = 0, fill = YEL, inner = 0.5, w = 6) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2; const q = (i % 2 ? inner : 1) * r * (i % 2 ? 1 : rr(seed, i, 0.82, 1.12)); pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
  fillShape(pts, fill, seed, 3);
  brush([...pts, pts[0], pts[1]], w, { seed: seed + 1, taper: [0.02, 0.02] });
}
function spark(x, y, ang, len, seed, col = YEL) {
  const c = Math.cos(ang), s = Math.sin(ang), wd = len * 0.32;
  const pts = [[x + c * len * 0.6, y + s * len * 0.6], [x - s * wd, y + c * wd], [x - c * len * 0.4, y - s * len * 0.4], [x + s * wd, y - c * wd]];
  fillShape(pts, col, seed, 1.5);
  brush([...pts, pts[0], pts[1]], 3.2, { seed: seed + 1, taper: [0.02, 0.02] });
}
function twinkle(x, y, r, seed) {
  brush([[x - r, y], [x + r, y]], 4, { seed, taper: [0.4, 0.4] });
  brush([[x, y - r], [x, y + r]], 4, { seed: seed + 1, taper: [0.4, 0.4] });
}

export { hash, sn, rr, clamp, lerp, seg, eOut, eIn, eIO, eBack, resample, brush, fillShape, ell, R0, loopPts, blob, puff, star, spark, twinkle };
