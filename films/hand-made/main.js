// HAND MADE — a 10 s frame-by-frame / line-boil film.
// Every frame is a pure function of t: renderAt(t) -> frame f = round(t*24) -> exposure (on 1s/2s/3s) -> drawing.
// All randomness is seeded by integers (hash), so any frame can be drawn in any order.
'use strict';

const W = 1920, H = 1080, FPS = 24;
window.DEMO = { width: W, height: H, fps: FPS, duration: 10 };

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const fxc = document.createElement('canvas'); fxc.width = W; fxc.height = H;
const fx = fxc.getContext('2d');

// ---------------------------------------------------------------- palette (4 colours: ink, tomato, sunny, cream)
const INK = '#1e1a17', RED = '#e3432c', YEL = '#f7c236', PAPER = '#f4e8d0';
const INK_A = (a) => `rgba(30,26,23,${a})`;

// ---------------------------------------------------------------- maths
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const eOut = (u) => 1 - Math.pow(1 - u, 3);
const eIn = (u) => u * u * u;
const eIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eBack = (u, s = 1.9) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
const smooth = (u) => u * u * (3 - 2 * u);
const TAU = Math.PI * 2;

function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;          // [0,1)
}
const hs = (a, b, c) => hash(a, b, c) * 2 - 1;  // [-1,1)
function noise1(seed, x) {                      // smooth value noise, [-1,1]
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hs(seed, i), hs(seed, i + 1), u);
}

// ---------------------------------------------------------------- exposure (from cues.json, inlined at load)
let CUES = null;
let EXPO = [];
function exposure(f) {
  for (const [a, b, n] of EXPO) if (f >= a && f < b) return { fh: a + Math.floor((f - a) / n) * n, n, k: Math.floor((f - a) / n) + a * 13 };
  return { fh: f, n: 1, k: f };
}

// ---------------------------------------------------------------- brush renderer
// Centre line -> resample -> boil jitter (seeded per drawing) -> variable width (pressure, taper, light side) -> polygon.
let BV = 0;            // boil variant for the current frame (0..3) - every drawing re-jitters when it changes
let JIT = 1;           // global jitter multiplier
function resample(raw, step, closed) {
  const P = closed ? raw.concat([raw[0]]) : raw;
  const out = [{ x: P[0].x, y: P[0].y, s: 0, v: 0 }];
  let s = 0, carry = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    let d = step - carry;
    while (d <= L) { out.push({ x: a.x + dx * d / L, y: a.y + dy * d / L, s: s + d, v: -1 }); d += step; }
    carry = L - (d - step);
    s += L;
    out.push({ x: b.x, y: b.y, s, v: i });       // keep every vertex (for corner splits)
  }
  // drop near-duplicates
  const o2 = [out[0]];
  for (let i = 1; i < out.length; i++) { const p = o2[o2.length - 1]; if (Math.hypot(out[i].x - p.x, out[i].y - p.y) > 0.4 || out[i].v >= 0) o2.push(out[i]); }
  return { pts: o2, L: s };
}
function cornerSet(raw, closed, lim = 0.75) {
  const c = new Set();
  const n = raw.length;
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) continue;
    const a = raw[(i - 1 + n) % n], b = raw[i], d = raw[(i + 1) % n];
    const a1 = Math.atan2(b.y - a.y, b.x - a.x), a2 = Math.atan2(d.y - b.y, d.x - b.x);
    let da = Math.abs(a2 - a1); if (da > Math.PI) da = TAU - da;
    if (da > lim) c.add(i);
  }
  return c;
}
// opt: w, seed, jit, taper [a,b], wvar, color, prog, closed, light (0..1 thicker on lower-right), minw, cornerLim
function brush(g, raw, opt) {
  if (!raw || raw.length < 2) return null;
  const w = opt.w, seed = (opt.seed | 0) * 7 + BV * 1013, jit = (opt.jit ?? 1.6) * JIT;
  const closed = !!opt.closed;
  const R = resample(raw, opt.step || Math.max(2.2, Math.min(7, w * 0.5)), closed);
  let pts = R.pts, L = R.L;
  if (L < 0.5) return null;
  const prog = opt.prog ?? 1;
  if (prog < 1) {
    const cut = L * prog; const p2 = [];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].s <= cut) p2.push(pts[i]);
      else { const a = pts[i - 1], b = pts[i], u = (cut - a.s) / (b.s - a.s || 1); p2.push({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), s: cut, v: -1 }); break; }
    }
    pts = p2; if (pts.length < 2) return null;
  }
  const corners = cornerSet(raw, closed, opt.cornerLim ?? 0.75);
  if (closed) corners.add(raw.length);          // closure vertex
  // jitter + width per sample
  const ta = opt.taper ? opt.taper[0] : 0, tb = opt.taper ? opt.taper[1] : 0, wvar = opt.wvar ?? 0.18, minw = opt.minw ?? 0.18;
  const light = opt.light || 0;
  // provisional normals for jitter direction
  const n = pts.length;
  const tang = (i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l };
  };
  const J = pts.map((p, i) => {
    const t = tang(i);
    const s = p.s;
    const sw = closed ? Math.sin((s / L) * TAU) * 0.0 : 0;
    const o = noise1(seed, s / 95 + sw) * jit + noise1(seed + 5, s / 21) * jit * 0.45;
    const u = s / L;
    let pr = 1;
    if (ta > 0 && u < ta) pr = Math.min(pr, minw + (1 - minw) * Math.sin((u / ta) * Math.PI / 2));
    if (tb > 0 && u > 1 - tb) pr = Math.min(pr, minw + (1 - minw) * Math.sin(((1 - u) / tb) * Math.PI / 2));
    let ww = w * pr * (1 + wvar * noise1(seed + 9, s / 55));
    if (light) { const nx = -t.y, ny = t.x; const lit = clamp((nx * 0.55 + ny * 0.83) * (opt.orient || 1)); ww *= (1 - light * 0.45) + light * 0.9 * lit; }
    return { x: p.x - t.y * o, y: p.y + t.x * o, w: Math.max(0.6, ww), v: p.v };
  });
  // split at corners
  const pieces = []; let cur = [J[0]];
  for (let i = 1; i < J.length; i++) { cur.push(J[i]); if (J[i].v >= 0 && corners.has(J[i].v) && i < J.length - 1) { pieces.push(cur); cur = [J[i]]; } }
  pieces.push(cur);
  g.fillStyle = opt.color || INK;
  for (const P of pieces) {
    if (P.length < 2) continue;
    const m = P.length, Lf = [], Rt = [];
    for (let i = 0; i < m; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(m - 1, i + 1)];
      let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const h = P[i].w / 2;
      Lf.push([P[i].x - dy * h, P[i].y + dx * h]); Rt.push([P[i].x + dy * h, P[i].y - dx * h]);
    }
    g.beginPath();
    g.moveTo(Lf[0][0], Lf[0][1]);
    for (let i = 1; i < m; i++) g.lineTo(Lf[i][0], Lf[i][1]);
    for (let i = m - 1; i >= 0; i--) g.lineTo(Rt[i][0], Rt[i][1]);
    g.closePath(); g.fill();
    for (const q of [P[0], P[m - 1]]) { g.beginPath(); g.arc(q.x, q.y, q.w / 2, 0, TAU); g.fill(); }
  }
  const tip = J[J.length - 1];
  return { tip, L };
}
// filled shape with off-register offset and its own boil
function fillShape(g, raw, color, seed, opt = {}) {
  const off = opt.off ?? 5, jit = (opt.jit ?? 2.2) * JIT;
  const s2 = (seed | 0) * 11 + BV * 577;
  const ox = hs(s2, 1) * off, oy = hs(s2, 2) * off;
  const R = resample(raw, 8, true);
  g.fillStyle = color;
  g.beginPath();
  R.pts.forEach((p, i) => {
    const jx = noise1(s2 + 3, p.s / 60) * jit, jy = noise1(s2 + 4, p.s / 60) * jit;
    if (i === 0) g.moveTo(p.x + ox + jx, p.y + oy + jy); else g.lineTo(p.x + ox + jx, p.y + oy + jy);
  });
  g.closePath(); g.fill();
}
function circlePts(cx, cy, r, n = 40, a0 = 0) { const o = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; o.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); } return o; }
function ellipsePts(cx, cy, rx, ry, rot = 0, n = 40) {
  const o = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push({ x: cx + x * c - y * s, y: cy + x * s + y * c }); }
  return o;
}
function cubic(p0, p1, p2, p3, n) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), d = u ** 3;
    o.push({ x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y });
  }
  return o;
}
const P = (x, y) => ({ x, y });
function xf(pts, tx, ty, rot = 0, sx = 1, sy = sx) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map((p) => ({ x: tx + p.x * sx * c - p.y * sy * s, y: ty + p.x * sx * s + p.y * sy * c }));
}

// ---------------------------------------------------------------- flame shape
// base-centre (cx, by), width Wd, height Hd, lean = tip x offset, sw = S-bend, tongues = side licks (0..1)
function flamePts(cx, by, Wd, Hd, lean, sw, tongues, seed) {
  const R = Wd / 2, C = P(cx, by - R), T = P(cx + lean, by - Hd);
  const at = (deg) => P(C.x + Math.cos(deg * Math.PI / 180) * R, C.y + Math.sin(deg * Math.PI / 180) * R);
  const A = at(-28), B = at(208);
  const side = Hd - R;
  const right = cubic(A, P(A.x + 0.10 * Wd, A.y - 0.42 * side), P(T.x + (0.20 + sw * 0.16) * Wd, T.y + 0.52 * side), T, 22);
  const left = cubic(T, P(T.x + (-0.16 + sw * 0.16) * Wd, T.y + 0.45 * side), P(B.x - 0.12 * Wd, B.y - 0.40 * side), B, 22);
  const lick = (arr, u0, amp, dir) => {
    if (amp <= 0.5) return arr;
    const i0 = Math.floor(arr.length * (u0 - 0.09)), i1 = Math.floor(arr.length * (u0 + 0.06)), im = Math.floor(arr.length * u0);
    const m = arr[im], q = arr[Math.min(arr.length - 1, im + 1)];
    let dx = q.x - m.x, dy = q.y - m.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const tip = P(m.x + dir * (-dy) * amp * 0.75 * 0 + (dir > 0 ? amp * 0.62 : -amp * 0.62), m.y - amp * 0.95);
    return arr.slice(0, i0 + 1).concat([tip], arr.slice(i1));
  };
  const r2 = lick(right, 0.36 + 0.05 * noise1(seed, 1), tongues * Wd * 0.24, 1);
  const l2 = lick(left, 0.66 + 0.05 * noise1(seed, 2), tongues * Wd * 0.2, -1);
  const arc = [];
  for (let i = 1; i < 26; i++) { const d = 208 - (236 * i) / 26; arc.push(at(d)); }
  return r2.concat(l2.slice(1), arc);
}

// ---------------------------------------------------------------- the flame spirit
// s = { x, y (ground / feet), k scale, sq squash, lean, sw, limbs 0..1, arms: [[a1,a2],[a1,a2]], legs: [[a1,a2],[a1,a2]],
//       eye: open 0..1, look [x,y], mood 'n'|'squint'|'closed'|'happy'|'x', mouth 'smile'|'o'|'grin'|'flat'|'none', spinX -1..1,
//       smear {ang, amt}, tongues, seed, shadow }
function spirit(g, s) {
  const k = s.k, sq = s.sq ?? 1;
  const legL = 40 * k * (s.limbs ?? 0);
  const Wd = 150 * k / Math.sqrt(sq), Hd = 232 * k * sq;
  const bx = s.x, by = s.y - legL;                           // body base
  const sid = s.seed ?? 1;
  const lean = (s.lean ?? 0) * Hd, sw = s.sw ?? 0;
  const spinX = s.spinX ?? 1;
  const lw = Math.max(3, 7.5 * k);
  g.save();
  if (s.smear) {
    const c = P(bx, by - Hd * 0.45), a = s.smear.ang, amt = s.smear.amt;
    // trailing drybrush streaks (behind)
    for (let i = 0; i < 5; i++) {
      const off = (i - 2) * Wd * 0.17, len = Hd * (0.9 + amt * 0.9) * (0.6 + 0.4 * hash(sid, i, 77));
      const nx = -Math.sin(a), ny = Math.cos(a);
      const p0 = P(c.x + nx * off - Math.cos(a) * Hd * 0.25, c.y + ny * off - Math.sin(a) * Hd * 0.25);
      const p1 = P(p0.x - Math.cos(a) * len, p0.y - Math.sin(a) * len);
      brush(g, [p0, p1], { w: (i % 2 ? 10 : 16) * k, color: i === 2 ? YEL : (i % 2 ? INK : RED), taper: [0.05, 0.85], seed: sid * 40 + i, jit: 2 });
    }
    g.translate(c.x, c.y); g.rotate(a); g.scale(1 + amt, 1 / (1 + amt * 0.35)); g.rotate(-a); g.translate(-c.x, -c.y);
  }
  // ground shadow
  if (s.shadow) {
    const sh = s.shadow; // {y, r}
    fillShape(g, ellipsePts(s.x, sh.y, 95 * k * sh.r, 16 * k * sh.r), INK_A(0.13), sid * 3 + 1, { off: 0, jit: 2 });
  }
  // legs (behind body)
  if ((s.limbs ?? 0) > 0.01) {
    const legs = s.legs || [[0.15, 0], [-0.15, 0]];
    [-1, 1].forEach((sd, i) => {
      const hip = P(bx + sd * Wd * 0.2 * spinX, by - 6 * k);
      const [a1, a2] = legs[i];
      const knee = P(hip.x - Math.sin(a1) * legL * 0.55, hip.y + Math.cos(a1) * legL * 0.55);
      const foot = P(knee.x - Math.sin(a1 + a2) * legL * 0.55, knee.y + Math.cos(a1 + a2) * legL * 0.55);
      brush(g, [hip, knee, foot], { w: lw * 1.05, seed: sid * 20 + i, jit: 1.2, cornerLim: 2 });
      fillShape(g, ellipsePts(foot.x + sd * 7 * k, foot.y - 3 * k, 15 * k, 8 * k), INK, sid * 20 + i + 5, { off: 0, jit: 1 });
    });
  }
  // body
  const tongues = s.tongues ?? 1;
  const body = flamePts(bx, by, Wd, Hd, lean, sw, tongues, sid * 5 + BV);
  const bodyX = xf(body.map((p) => P(p.x - bx, p.y - by)), bx, by, 0, Math.max(0.25, Math.abs(spinX)), 1);
  fillShape(g, bodyX, RED, sid * 9 + 1, { off: 5 * k + 1 });
  const inner = flamePts(bx + lean * 0.08, by - 0.11 * Wd, Wd * 0.6, Hd * 0.62, lean * 0.72, sw * 0.8, 0, sid * 5 + 2);
  fillShape(g, xf(inner.map((p) => P(p.x - bx, p.y - by)), bx, by, 0, Math.max(0.25, Math.abs(spinX)), 1), YEL, sid * 9 + 2, { off: 4 * k + 1 });
  brush(g, bodyX, { w: lw, closed: true, seed: sid * 9 + 3, light: 0.9, jit: 1.7, cornerLim: 0.7 });
  // face
  if ((s.face ?? 1) > 0) {
    const fx0 = bx + lean * 0.12 + (s.faceX ?? 0) * Wd * 0.35 * (spinX < 0 ? -1 : 1) * (1 - Math.abs(spinX)) , fy = by - Wd * 0.62;
    const sxm = Math.abs(spinX);
    const ex = Wd * 0.17 * sxm, ery = 18 * k, erx = 11 * k * Math.max(0.4, sxm);
    const lk = s.look || [0, 0], mood = s.mood || 'n', open = s.eye ?? 1;
    [-1, 1].forEach((sd, i) => {
      const cx = fx0 + sd * ex, cy = fy;
      if (mood === 'closed' || open < 0.15) {
        brush(g, cubic(P(cx - erx, cy), P(cx - erx * 0.4, cy + ery * 0.5), P(cx + erx * 0.4, cy + ery * 0.5), P(cx + erx, cy), 8), { w: lw * 0.8, seed: sid * 30 + i, jit: 0.8 });
      } else if (mood === 'squint') {
        brush(g, [P(cx - erx * 1.1, cy - ery * 0.5 * sd * -1 - 2), P(cx + erx * 0.2 * sd, cy), P(cx - erx * 1.1, cy + ery * 0.5)].map((p) => P(cx + (p.x - cx) * sd * -1, p.y)), { w: lw * 0.85, seed: sid * 30 + i, jit: 0.8, cornerLim: 0.5 });
      } else if (mood === 'happy') {
        brush(g, cubic(P(cx - erx, cy + 4 * k), P(cx - erx * 0.4, cy - ery * 0.8), P(cx + erx * 0.4, cy - ery * 0.8), P(cx + erx, cy + 4 * k), 8), { w: lw * 0.85, seed: sid * 30 + i, jit: 0.8 });
      } else {
        const ry = ery * open;
        fillShape(g, ellipsePts(cx + lk[0] * 3 * k, cy + lk[1] * 3 * k, erx, ry, 0, 24), INK, sid * 30 + i, { off: 0, jit: 0.8 });
        if (open > 0.5) fillShape(g, ellipsePts(cx + lk[0] * 3 * k - erx * 0.3, cy + lk[1] * 3 * k - ry * 0.4, erx * 0.34, ry * 0.26, 0, 12), PAPER, sid * 30 + i + 3, { off: 0, jit: 0.4 });
      }
    });
    // mouth
    const mx = fx0 + lk[0] * 2 * k, my = fy + 30 * k, mw = 15 * k * Math.max(0.4, sxm);
    const m = s.mouth || 'smile';
    if (m === 'smile') brush(g, cubic(P(mx - mw, my - 2 * k), P(mx - mw * 0.4, my + 9 * k), P(mx + mw * 0.4, my + 9 * k), P(mx + mw, my - 2 * k), 8), { w: lw * 0.7, seed: sid * 31, jit: 0.6, taper: [0.2, 0.2] });
    else if (m === 'grin') {
      const gp = cubic(P(mx - mw * 1.3, my - 4 * k), P(mx - mw, my + 20 * k), P(mx + mw, my + 20 * k), P(mx + mw * 1.3, my - 4 * k), 14);
      fillShape(g, gp, INK, sid * 32, { off: 0, jit: 0.8 });
      fillShape(g, ellipsePts(mx, my + 9 * k, mw * 0.55, 4.5 * k), RED, sid * 33, { off: 0, jit: 0.5 });
    } else if (m === 'o') fillShape(g, ellipsePts(mx, my + 3 * k, 8 * k, 11 * k), INK, sid * 34, { off: 0, jit: 0.6 });
    else if (m === 'flat') brush(g, [P(mx - mw * 0.8, my + 2 * k), P(mx + mw * 0.8, my + 1 * k)], { w: lw * 0.7, seed: sid * 35, jit: 0.6 });
    else if (m === 'gasp') fillShape(g, ellipsePts(mx, my + 5 * k, 13 * k, 17 * k), INK, sid * 36, { off: 0, jit: 0.6 });
  }
  // arms (in front)
  if ((s.limbs ?? 0) > 0.01) {
    const arms = s.arms || [[2.4, 0.3], [-2.4, -0.3]];
    const la = 44 * k * (s.limbs ?? 0);
    [-1, 1].forEach((sd, i) => {
      const sh = P(bx + sd * Wd * 0.42 * spinX, by - Wd * 0.55);
      const [a1, a2] = arms[i];            // angle from straight-down, + = outward to the right
      const el = P(sh.x - Math.sin(a1) * la * 0.55, sh.y + Math.cos(a1) * la * 0.55);
      const hd = P(el.x - Math.sin(a1 + a2) * la * 0.5, el.y + Math.cos(a1 + a2) * la * 0.5);
      brush(g, [sh, el, hd], { w: lw * 0.95, seed: sid * 50 + i, jit: 1.1, cornerLim: 2 });
      fillShape(g, circlePts(hd.x, hd.y, 9 * k, 16), INK, sid * 50 + i + 3, { off: 0, jit: 1 });
    });
  }
  g.restore();
  return { headTop: P(bx + lean, by - Hd), centre: P(bx, by - Hd * 0.42), Wd, Hd, by };
}

// ---------------------------------------------------------------- props
const BOX = { x: 500, y: 765, w: 430, h: 150, dx: 48, dy: -36 };
const FLOOR = 915;
function matchbox(g, ox, oy, rot, seed) {
  const b = BOX;
  g.save();
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  g.translate(cx + ox, cy + oy); g.rotate(rot); g.translate(-cx, -cy);
  const front = [P(b.x, b.y), P(b.x + b.w, b.y), P(b.x + b.w, b.y + b.h), P(b.x, b.y + b.h)];
  const top = [P(b.x, b.y), P(b.x + b.dx, b.y + b.dy), P(b.x + b.w + b.dx, b.y + b.dy), P(b.x + b.w, b.y)];
  const side = [P(b.x + b.w, b.y), P(b.x + b.w + b.dx, b.y + b.dy), P(b.x + b.w + b.dx, b.y + b.h + b.dy), P(b.x + b.w, b.y + b.h)];
  fillShape(g, top, RED, seed + 1, { off: 4 });
  fillShape(g, side, RED, seed + 2, { off: 4 });
  fillShape(g, front, RED, seed + 3, { off: 5 });
  // hatching on side + top (shadow)
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.5) / 7;
    const p0 = P(b.x + b.w + b.dx * u, b.y + b.dy * u + 10), p1 = P(b.x + b.w + b.dx * u, b.y + b.h + b.dy * u - 8);
    brush(g, [p0, p1], { w: 2.6, seed: seed + 40 + i, jit: 1, taper: [0.2, 0.3] });
  }
  for (let i = 0; i < 9; i++) {
    const x = b.x + 40 + i * 44;
    brush(g, [P(x + 6, b.y - 6), P(x + 26, b.y + b.dy + 8)], { w: 2.2, seed: seed + 60 + i, jit: 0.8, taper: [0.3, 0.3] });
  }
  // striker strip (along the top of the front face)
  const st = [P(b.x + 8, b.y + 8), P(b.x + b.w - 8, b.y + 8), P(b.x + b.w - 8, b.y + 36), P(b.x + 8, b.y + 36)];
  fillShape(g, st, INK, seed + 4, { off: 2, jit: 1.2 });
  for (let i = 0; i < 26; i++) {
    const x = b.x + 18 + hash(seed, i, 1) * (b.w - 36), y = b.y + 14 + hash(seed, i, 2) * 16;
    fillShape(g, circlePts(x, y, 1.2 + hash(seed, i, 3) * 1.6, 6), PAPER, seed + 100 + i, { off: 0, jit: 0.5 });
  }
  // label
  const lx = b.x + 92, ly = b.y + 52, lw2 = 246, lh = 82;
  const lab = [];
  for (let i = 0; i < 4; i++) { // rounded rectangle
    const cxr = i === 0 || i === 3 ? lx + 14 : lx + lw2 - 14, cyr = i < 2 ? ly + 14 : ly + lh - 14;
    const a0 = [Math.PI, -Math.PI / 2, 0, Math.PI / 2][i];
    for (let j = 0; j <= 6; j++) { const a = a0 + j / 6 * Math.PI / 2; lab.push(P(cxr + Math.cos(a) * 14, cyr + Math.sin(a) * 14)); }
  }
  fillShape(g, lab, YEL, seed + 5, { off: 4 });
  brush(g, lab, { w: 4.2, closed: true, seed: seed + 6, jit: 1 });
  // little flame logo on label + two "type" squiggles
  const lf = flamePts(lx + 46, ly + 68, 34, 54, 4, 0.3, 0.7, seed + 7);
  fillShape(g, lf, RED, seed + 8, { off: 2 });
  brush(g, lf, { w: 3.4, closed: true, seed: seed + 9, jit: 0.8 });
  brush(g, [P(lx + 84, ly + 32), P(lx + 222, ly + 30)], { w: 7, seed: seed + 10, jit: 1.2, taper: [0.1, 0.2] });
  brush(g, [P(lx + 84, ly + 54), P(lx + 180, ly + 55)], { w: 4, seed: seed + 11, jit: 1, taper: [0.1, 0.2] });
  // outlines
  brush(g, front, { w: 6.5, closed: true, seed: seed + 12, jit: 1.6, light: 0.8, cornerLim: 0.6 });
  brush(g, [top[0], top[1], top[2], top[3]], { w: 5.5, seed: seed + 13, jit: 1.5, cornerLim: 0.6 });
  brush(g, [side[1], side[2], side[3]], { w: 6, seed: seed + 14, jit: 1.5, cornerLim: 0.6 });
  g.restore();
}
// match: base point, angle (direction base->head), charred 0..1
const ML = 220;
function match(g, base, ang, charred, seed, opt = {}) {
  const dir = P(Math.cos(ang), Math.sin(ang));
  const head = P(base.x + dir.x * ML, base.y + dir.y * ML);
  const stickEnd = P(base.x + dir.x * (ML - 16), base.y + dir.y * (ML - 16));
  brush(g, [base, stickEnd], { w: 25, seed: seed + 1, jit: 1.2, wvar: 0.05 });
  brush(g, [P(base.x + dir.x * 4, base.y + dir.y * 4), P(stickEnd.x - dir.x * 2, stickEnd.y - dir.y * 2)], { w: 13, color: YEL, seed: seed + 2, jit: 1, wvar: 0.05 });
  if (charred > 0) brush(g, [P(head.x - dir.x * (40 + 30 * charred), head.y - dir.y * (40 + 30 * charred)), stickEnd], { w: 22, seed: seed + 3, jit: 1.5, taper: [0.6, 0] });
  const hr = 21 * (1 - 0.25 * charred);
  const hp = ellipsePts(head.x - dir.x * 6, head.y - dir.y * 6, hr * 1.3, hr, ang, 28);
  fillShape(g, hp, charred > 0.5 ? INK : RED, seed + 4, { off: 3 });
  brush(g, hp, { w: 5.5, closed: true, seed: seed + 5, jit: 1.1, light: 0.8 });
  return head;
}

// ---------------------------------------------------------------- cel FX
// smoke puff: lumpy union of circles, ink outline, cream fill, a curl, then eaten away by outlined holes
function puff(g, p, t) {
  const a = (t - p.t0) / p.life;
  if (a < 0 || a >= 1) return;
  const e = eOut(Math.min(1, a * 1.4));
  const x = p.x + p.vx * e + (p.drift || 0) * a, y = p.y + p.vy * e - (p.rise || 0) * a;
  const r = p.r * (0.35 + 0.65 * eBack(Math.min(1, a * 2.4), 1.4));
  const n = p.n || 5;
  const lobes = [{ x: 0, y: 0, r: r * 0.78 }];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + hs(p.seed, i, 1) * 0.5 + (p.spin || 0) * a;
    const rr = r * (0.42 + 0.22 * hash(p.seed, i, 2));
    const d = r * (0.55 + 0.1 * hash(p.seed, i, 3));
    lobes.push({ x: Math.cos(ang) * d, y: Math.sin(ang) * d * 0.85, r: rr });
  }
  const bx0 = x - r * 1.9, by0 = y - r * 1.9, bw = r * 3.8;
  fx.save();
  fx.clearRect(bx0 - 8, by0 - 8, bw + 16, bw + 16);
  const lw = Math.max(3.5, Math.min(7, r * 0.09));
  const sj = p.seed * 3 + BV;
  // ink union, then cream union
  fx.fillStyle = INK;
  lobes.forEach((l, i) => { fx.beginPath(); fx.arc(x + l.x + hs(sj, i, 4) * 1.8, y + l.y + hs(sj, i, 5) * 1.8, l.r + lw, 0, TAU); fx.fill(); });
  fx.fillStyle = p.fill || PAPER;
  lobes.forEach((l, i) => { fx.beginPath(); fx.arc(x + l.x + hs(sj, i, 4) * 1.8, y + l.y + hs(sj, i, 5) * 1.8, l.r, 0, TAU); fx.fill(); });
  // shading: hatched crescents on the lower-right of lobes
  fx.globalCompositeOperation = 'source-atop';
  lobes.forEach((l, i) => {
    if (i === 0 || hash(p.seed, i, 9) < 0.35) return;
    const cx = x + l.x, cy = y + l.y;
    brush(fx, cubic(P(cx + l.r * 0.15, cy + l.r * 0.85), P(cx + l.r * 0.75, cy + l.r * 0.65), P(cx + l.r * 0.95, cy + l.r * 0.2), P(cx + l.r * 0.85, cy - l.r * 0.2), 8), { w: lw * 0.6, seed: p.seed * 7 + i, jit: 0.8, taper: [0.3, 0.4] });
  });
  // curl
  if (p.curl && a < 0.7) {
    const cp = [];
    for (let i = 0; i <= 18; i++) { const u = i / 18, ang = (p.curl > 0 ? 1 : -1) * (u * 4.2) + 0.8, rr = r * 0.5 * (1 - u * 0.75); cp.push(P(x + Math.cos(ang) * rr - r * 0.05, y + Math.sin(ang) * rr * 0.85)); }
    brush(fx, cp, { w: lw * 0.7, seed: p.seed * 13, jit: 0.8, taper: [0.1, 0.6] });
  }
  // dissolve: outlined holes eat the puff
  const da = p.eat ?? 0.5;
  if (a > da) {
    const u = (a - da) / (1 - da);
    for (let i = 0; i < 3; i++) {
      const ha = hash(p.seed, i, 20) * TAU, hd = r * (0.35 + 0.5 * hash(p.seed, i, 21));
      const hr = r * (0.2 + 1.5 * eIn(clamp(u * 1.15 - i * 0.12)));
      if (hr <= 0) continue;
      const hx = x + Math.cos(ha) * hd, hy = y + Math.sin(ha) * hd;
      fx.globalCompositeOperation = 'source-atop'; fx.fillStyle = INK; fx.beginPath(); fx.arc(hx, hy, hr + lw, 0, TAU); fx.fill();
      fx.globalCompositeOperation = 'destination-out'; fx.beginPath(); fx.arc(hx, hy, hr, 0, TAU); fx.fill();
    }
  }
  fx.restore();
  g.drawImage(fxc, bx0 - 8, by0 - 8, bw + 16, bw + 16, bx0 - 8, by0 - 8, bw + 16, bw + 16);
}
// ballistic spark (teardrop stretched along velocity)
function spark(g, s, t) {
  const tau = t - s.t0; if (tau < 0 || tau > s.life) return;
  const a = tau / s.life;
  const drag = s.drag ?? 2.2;
  const ed = (1 - Math.exp(-drag * tau)) / drag;
  const x = s.x + s.vx * ed, y = s.y + s.vy * ed + 0.5 * (s.g ?? 900) * tau * tau;
  const vx = s.vx * Math.exp(-drag * tau), vy = s.vy * Math.exp(-drag * tau) + (s.g ?? 900) * tau;
  const sp = Math.hypot(vx, vy), ang = Math.atan2(vy, vx);
  const sz = s.size * (1 - eIn(a));
  if (sz < 1.5) return;
  const len = sz * (1.2 + Math.min(4, sp / 260));
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const u = i / 16 * TAU, cx = Math.cos(u), sy = Math.sin(u);
    const xx = cx > 0 ? cx * sz * 0.6 : cx * len, yy = sy * sz * 0.48 * (cx > 0 ? 1 : (1 + cx * 0.85));
    pts.push(P(xx, yy));
  }
  const pp = xf(pts, x, y, ang);
  fillShape(g, pp, s.col || YEL, s.seed, { off: 0, jit: 0.6 });
  brush(g, pp, { w: Math.max(2.5, sz * 0.22), closed: true, seed: s.seed + 1, jit: 0.6 });
}
function starPts(cx, cy, R, rot, n = 4, inner = 0.3) {
  const o = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i / (n * 2) * TAU, r = i % 2 ? R * inner : R;
    o.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  // concave sides: add curve points between
  const o2 = [];
  for (let i = 0; i < o.length; i++) { o2.push(o[i]); }
  return o2;
}
function twinkle(g, x, y, R, rot, seed, col = YEL) {
  if (R < 3) return;
  const sp = starPts(x, y, R, rot, 4, 0.26);
  fillShape(g, sp, col, seed, { off: R * 0.08, jit: 0.8 });
  brush(g, sp, { w: Math.max(2.8, R * 0.11), closed: true, seed: seed + 1, jit: 0.9, cornerLim: 0.5 });
}
function starburst(g, cx, cy, R, seed, n = 14, inner = 0.56, col = YEL, outline = true) {
  const o = [];
  for (let i = 0; i < n * 2; i++) {
    const a = i / (n * 2) * TAU + hs(seed, i, 1) * 0.06;
    const r = i % 2 ? R * inner * (0.9 + 0.2 * hash(seed, i, 2)) : R * (0.78 + 0.32 * hash(seed, i, 3));
    o.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  fillShape(g, o, col, seed + 3, { off: R * 0.012 + 3, jit: 2 });
  if (outline) brush(g, o, { w: Math.max(5, R * 0.016), closed: true, seed: seed + 4, jit: 2, cornerLim: 0.5 });
  return o;
}
function speedLine(g, p0, p1, w, seed, col = INK) { brush(g, [p0, p1], { w, seed, jit: 1.2, taper: [0.15, 0.7], color: col }); }

// ---------------------------------------------------------------- lettering: HAND / MADE + 手作 seal
const GLYPH = {
  H: { w: 0.74, s: [[[0, 0], [0, 1]], [[0.74, 0], [0.74, 1]], [[0, 0.52], [0.74, 0.5]]] },
  A: { w: 0.82, s: [[[0, 1], [0.41, 0], [0.82, 1]], [[0.17, 0.66], [0.65, 0.64]]] },
  N: { w: 0.74, s: [[[0, 1], [0, 0], [0.74, 1], [0.74, 0]]] },
  D: { w: 0.76, s: [[[0, 1], [0, 0]], 'D'] },
  M: { w: 0.94, s: [[[0, 1], [0.05, 0], [0.47, 0.64], [0.89, 0], [0.94, 1]]] },
  E: { w: 0.62, s: [[[0.62, 0], [0, 0], [0, 1], [0.64, 1]], [[0, 0.5], [0.5, 0.5]]] },
};
function glyphStrokes(ch) {
  const gdef = GLYPH[ch];
  return gdef.s.map((s) => {
    if (s === 'D') { const o = [[0, 0]]; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI; o.push([0.3 + 0.46 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]); } o.push([0, 1]); return o; }
    return s;
  });
}
const CAP = 224, SWD = 42, GAP = 58;
const SEAL = { w: 122, h: 240 };
let LETTERS = null;   // [{ch, strokes:[[P...]], x0,y0, rot}]  absolute coords
function layoutTitle() {
  const lines = [['H', 'A', 'N', 'D'], ['M', 'A', 'D', 'E']];
  const widths = lines.map((l) => l.reduce((s, c) => s + GLYPH[c].w * CAP, 0) + GAP * (l.length - 1));
  const blockW = Math.max(...widths) + 52 + SEAL.w;
  const x0 = Math.round(960 - blockW / 2 + 6);
  const base = [568, 850];
  const out = []; let si = 0;
  lines.forEach((l, li) => {
    let x = x0 + (li === 0 ? 10 : 0);
    l.forEach((c, ci) => {
      const id = li * 4 + ci;
      const rot = hs(91, id) * 0.05, dy = hs(92, id) * 8, sc = 1 + hs(93, id) * 0.03;
      const gw = GLYPH[c].w * CAP;
      const strokes = glyphStrokes(c).map((s) => {
        const pts = s.map(([u, v]) => P(u * CAP * sc, (v - 1) * CAP * sc));
        return xf(pts.map((p) => P(p.x - gw / 2, p.y)), x + gw / 2, base[li] + dy, rot);
      });
      out.push({ ch: c, strokes, x, base: base[li] + dy, gw, rot, li, ci, sc });
      x += gw + GAP;
    });
  });
  // stroke order and times
  const order = [];
  out.forEach((L) => L.strokes.forEach((s, j) => order.push({ L, s, j })));
  order.forEach((o, i) => { o.t0 = CUES.hits.write_start + i * CUES.hits.stroke_step; o.dur = 0.25; o.i = i; });
  const sealX = x0 + widths[1] + 52, sealY = base[1] - SEAL.h + 4;
  return { letters: out, order, sealX, sealY, x0, widths };
}
function drawTitle(g, t) {
  const T = LETTERS;
  const prog = (o) => (t < o.t0 ? 0 : eOut(clamp((t - o.t0) / o.dur)));
  const live = T.order.filter((o) => prog(o) > 0);
  if (!live.length) return [];
  const tips = [];
  // pass 1: yellow off-register shadow, pass 2: ink outline, pass 3: red fill, pass 4: cream highlight
  for (const o of live) brush(g, xf(o.s, 9, 10), { w: SWD + 12, color: YEL, seed: 300 + o.i, jit: 2.2, taper: [0.03, 0.03], minw: 0.7, prog: prog(o), wvar: 0.12 });
  for (const o of live) brush(g, o.s, { w: SWD + 13, color: INK, seed: 400 + o.i, jit: 1.8, taper: [0.03, 0.03], minw: 0.72, prog: prog(o), wvar: 0.1 });
  for (const o of live) {
    const r = brush(g, xf(o.s, hs(500 + BV, o.i) * 2.5, hs(501 + BV, o.i) * 2.5), { w: SWD, color: RED, seed: 500 + o.i, jit: 1.6, taper: [0.03, 0.03], minw: 0.7, prog: prog(o), wvar: 0.14 });
    if (r && prog(o) < 1) tips.push({ p: r.tip, o });
  }
  for (const o of live) {
    const pr = prog(o); if (pr < 0.6) continue;
    const s = o.s, a = s[0], b = s[1];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 60) continue;
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    const nx = -uy, ny = ux, side = (nx * -0.6 + ny * -0.8) > 0 ? 1 : -1;
    const q0 = P(a.x + ux * 22 + nx * side * 8, a.y + uy * 22 + ny * side * 8), q1 = P(a.x + ux * Math.min(L * 0.32, 70) + nx * side * 8, a.y + uy * Math.min(L * 0.32, 70) + ny * side * 8);
    brush(g, [q0, q1], { w: 6, color: PAPER, seed: 600 + o.i, jit: 0.8, taper: [0.3, 0.5] });
  }
  return tips;
}
// 手 (4 strokes) and 作 (7 strokes), unit box, in stroke order
const HAN = {
  '手': [
    [[0.70, 0.07], [0.52, 0.15], [0.26, 0.20]],
    [[0.20, 0.38], [0.80, 0.355]],
    [[0.08, 0.60], [0.92, 0.575]],
    [[0.50, 0.21], [0.50, 0.90], [0.36, 0.82]],
  ],
  '作': [
    [[0.32, 0.04], [0.22, 0.24], [0.06, 0.44]],
    [[0.20, 0.28], [0.20, 0.97]],
    [[0.53, 0.04], [0.47, 0.18], [0.36, 0.34]],
    [[0.46, 0.21], [0.93, 0.21]],
    [[0.57, 0.21], [0.57, 0.97]],
    [[0.57, 0.48], [0.88, 0.48]],
    [[0.57, 0.73], [0.90, 0.73]],
  ],
};
function drawSeal(g, t, f) {
  const T = LETTERS, st = CUES.hits.stamp;
  if (t < st - 0.09) return;
  let sc = 1, rot = -0.04, lift = 0, shadow = 0;
  const df = f - Math.round(st * FPS);
  if (df < 0) { sc = 1.55; rot = -0.2; lift = -40; shadow = 1; }
  else if (df === 0) { sc = 0.9; rot = -0.05; }
  else if (df === 1) { sc = 1.06; rot = -0.035; }
  else if (df === 2) { sc = 0.98; rot = -0.042; }
  const cx = T.sealX + SEAL.w / 2, cy = T.sealY + SEAL.h / 2;
  g.save();
  if (shadow) fillShape(g, xf([P(-SEAL.w / 2, -SEAL.h / 2), P(SEAL.w / 2, -SEAL.h / 2), P(SEAL.w / 2, SEAL.h / 2), P(-SEAL.w / 2, SEAL.h / 2)], cx + 10, cy + 14, -0.08, 1.1), INK_A(0.12), 700, { off: 0 });
  g.translate(cx, cy + lift); g.rotate(rot); g.scale(sc, df === 0 ? sc * 0.93 : sc);
  const w2 = SEAL.w / 2, h2 = SEAL.h / 2;
  const rect = [];
  const edge = (a, b, n, sd) => { for (let i = 0; i < n; i++) { const u = i / n; rect.push(P(lerp(a.x, b.x, u) + hs(sd, i, 1) * 1.8, lerp(a.y, b.y, u) + hs(sd, i, 2) * 1.8)); } };
  edge(P(-w2, -h2), P(w2, -h2), 8, 701); edge(P(w2, -h2), P(w2, h2), 14, 702); edge(P(w2, h2), P(-w2, h2), 8, 703); edge(P(-w2, h2), P(-w2, -h2), 14, 704);
  fillShape(g, rect, RED, 705, { off: 2, jit: 1.4 });
  brush(g, xf([P(-w2 + 8, -h2 + 8), P(w2 - 8, -h2 + 8), P(w2 - 8, h2 - 8), P(-w2 + 8, h2 - 8)], 0, 0), { w: 4, closed: true, color: PAPER, seed: 706, jit: 0.9, cornerLim: 0.6 });
  const box = (ch, oy) => {
    HAN[ch].forEach((s, i) => {
      const pts = s.map(([u, v]) => P(-w2 + 15 + u * (SEAL.w - 30), oy + v * (SEAL.w - 30)));
      brush(g, pts, { w: 11.5, color: PAPER, seed: 720 + i + (ch === '作' ? 20 : 0), jit: 0.7, taper: [0.08, 0.25], minw: 0.45, cornerLim: 0.9 });
    });
  };
  box('手', -h2 + 16); box('作', -h2 + 16 + SEAL.w - 18);
  // stamp texture: paper pockmarks
  for (let i = 0; i < 18; i++) {
    const x = -w2 + 6 + hash(707, i) * (SEAL.w - 12), y = -h2 + 6 + hash(708, i) * (SEAL.h - 12);
    fillShape(g, circlePts(x, y, 0.8 + hash(709, i) * 2.0, 6), PAPER, 710 + i, { off: 0, jit: 0.4 });
  }
  g.restore();
  // impact marks
  if (df >= 0 && df < 4) {
    const u = (df + 1) / 4;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * (0.15 + 0.7 * i / 6) + (i > 3 ? 0 : 0);
      const side = i % 2 ? 1 : -1;
      const ang = side > 0 ? a : Math.PI - a;
      const r0 = 120 + u * 50, r1 = r0 + 46 * (1 - u * 0.6);
      const ca = Math.cos(-0.25 - i * 0.5), sa = Math.sin(-0.25 - i * 0.5);
      const dirx = i < 4 ? -1 : 1;
      const px = cx + dirx * (SEAL.w * 0.5 + 18 + u * 22), py = cy + SEAL.h * 0.5 - 6 - (i % 4) * 22;
      speedLine(g, P(px, py), P(px + dirx * (34 - u * 14), py + 4 - (i % 4) * 5), 5, 800 + i + df * 10);
    }
  }
}

// ---------------------------------------------------------------- precomputed FX lists
function seededSparks(seed, n, x, y, t0, opts) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = (opts.a0 ?? 0) + (opts.spread ?? TAU) * (hash(seed, i, 1) - (opts.spread ? 0.5 : 0));
    const v = opts.v * (0.45 + 0.75 * hash(seed, i, 2));
    o.push({ x: x + hs(seed, i, 7) * (opts.jx || 0), y: y + hs(seed, i, 8) * (opts.jy || 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: t0 + hash(seed, i, 3) * (opts.stagger || 0), life: opts.life * (0.6 + 0.6 * hash(seed, i, 4)), size: opts.size * (0.6 + 0.7 * hash(seed, i, 5)), col: hash(seed, i, 6) < (opts.red ?? 0.3) ? RED : YEL, seed: seed * 100 + i, g: opts.g ?? 900, drag: opts.drag ?? 2.2 });
  }
  return o;
}
let FXL = null;
function buildFX() {
  const BC = P(960, 690);   // burst centre
  const S = {};
  S.strike = seededSparks(11, 16, 760, 780, 0.5417, { v: 1300, a0: -0.5, spread: 2.2, life: 0.45, size: 15, red: 0.35, g: 1400, stagger: 0.06 });
  S.ignite = seededSparks(12, 12, 1010, 742, 0.5833, { v: 900, life: 0.5, size: 13, red: 0.3, g: 900 });
  S.land = seededSparks(13, 8, 1230, FLOOR - 10, 2.5, { v: 700, a0: -Math.PI / 2, spread: 2.6, life: 0.4, size: 11, g: 1600 });
  S.hops = [3.0, 3.5, 4.0].map((t, i) => seededSparks(20 + i, 5 + i * 2, [1140, 1320, 1210][i], FLOOR - 12, t, { v: 560 + i * 140, a0: -Math.PI / 2, spread: 2.4, life: 0.35, size: 9 + i * 2, g: 1500 }));
  S.twirl = seededSparks(30, 14, 1300, 760, 4.5, { v: 900, life: 0.5, size: 11, red: 0.4, stagger: 0.4, g: 600, jx: 30, jy: 60 });
  S.charge = seededSparks(31, 14, 1170, 800, 5.75, { v: 500, a0: -Math.PI / 2, spread: 2.0, life: 0.35, size: 9, stagger: 0.7, g: 1200, jx: 50 });
  S.burst = seededSparks(40, 46, BC.x, BC.y, 6.5417, { v: 2300, life: 1.3, size: 22, red: 0.38, g: 520, drag: 2.4, jx: 40, jy: 40 });
  S.puffs = [];
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU + hs(50, i) * 0.3;
    const d = 330 + 70 * hash(51, i);
    S.puffs.push({ x: BC.x + Math.cos(a) * 60, y: BC.y + Math.sin(a) * 50, vx: Math.cos(a) * d, vy: Math.sin(a) * d * 0.62, t0: 6.5417 + hash(52, i) * 0.06, life: 1.15 + 0.35 * hash(53, i), r: 70 + 38 * hash(54, i), seed: 60 + i, n: 5, rise: 90, curl: i % 3 === 0 ? (i % 2 ? 1 : -1) : 0, spin: hs(55, i) * 0.8, eat: 0.42 });
  }
  S.land_puffs = [-1, 1].map((sd, i) => ({ x: 1230 + sd * 60, y: FLOOR - 24, vx: sd * 120, vy: -10, t0: 2.5, life: 0.62, r: 34, seed: 90 + i, n: 4, rise: 30, curl: sd, eat: 0.45 }));
  S.hop_puffs = [3.0, 3.5, 4.0].flatMap((t, j) => [-1, 1].map((sd, i) => ({ x: [1140, 1320, 1210][j] + sd * 46, y: FLOOR - 20, vx: sd * 90, vy: -6, t0: t, life: 0.5, r: 24 + j * 5, seed: 100 + j * 2 + i, n: 4, rise: 22, eat: 0.4 })));
  S.ignite_puff = [{ x: 1000, y: 735, vx: 60, vy: -40, t0: 0.5833, life: 0.6, r: 62, seed: 120, n: 5, rise: 60, curl: 1, eat: 0.4 }];
  S.wisp = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 880 + hs(130, i) * 6, y: MATCH_HEAD.y - 6, vx: hs(131, i) * 20, vy: -30, t0: 2.05 + i * 0.34, life: 1.1, r: 16 + i % 2 * 4, seed: 132 + i, n: 4, rise: 120, drift: (i % 2 ? 1 : -1) * 18, curl: i % 2 ? 1 : -1, eat: 0.35 }));
  S.box_puff = [{ x: 430, y: 850, vx: -260, vy: -60, t0: 6.5417, life: 0.8, r: 80, seed: 140, n: 6, rise: 40, curl: 1, eat: 0.4 }];
  S.stamp_puffs = [-1, 1].map((sd, i) => ({ x: 0, y: 0, vx: sd * 80, vy: -4, t0: 8.5, life: 0.55, r: 34, seed: 150 + i, n: 4, rise: 12, eat: 0.4, sd }));
  S.embers = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ i, t0: 8.6 + i * 0.19, x: hs(160, i) * 34, vx: hs(161, i) * 40 }));
  S.bc = BC;
  FXL = S;
}

// ---------------------------------------------------------------- choreography
const MATCH_BASE = P(880, BOX.y - 22), MATCH_HEAD = P(880, BOX.y - 22 - ML);
function matchState(t, f) {
  // returns {base, ang, charred}
  if (f < 12) {
    const u = eOut(clamp(t / 0.46));
    const head = P(lerp(655, 575, u), lerp(783, 772, u));
    const ang = lerp(-0.1, -0.2, u);
    return { base: P(head.x - Math.cos(ang) * ML, head.y - Math.sin(ang) * ML), ang, head };
  }
  if (f === 12) { const head = P(600, 784), ang = -0.07; return { base: P(head.x - Math.cos(ang) * ML, head.y - Math.sin(ang) * ML), ang, head }; }
  if (f === 13) { const head = P(905, 780), ang = -0.1; return { base: P(head.x - Math.cos(ang) * ML, head.y - Math.sin(ang) * ML), ang, head, smear: [600, 905] }; }
  if (f < 20) {
    // 14..19: flip up and plant
    const u = (f - 14) / 6;
    const h0 = P(1012, 744), a0 = -0.55;
    const b0 = P(h0.x - Math.cos(a0) * ML, h0.y - Math.sin(a0) * ML);
    const ue = eOut(u);
    const ang = lerp(a0, -Math.PI / 2 - 0.22, ue);
    const base = P(lerp(b0.x, MATCH_BASE.x, ue) + Math.sin(u * Math.PI) * 30, lerp(b0.y, MATCH_BASE.y, ue) - Math.sin(u * Math.PI) * 150);
    return { base, ang, head: P(base.x + Math.cos(ang) * ML, base.y + Math.sin(ang) * ML) };
  }
  // planted: wobble then settle
  const tt = t - 20 / FPS;
  const ang = -Math.PI / 2 + 0.2 * Math.exp(-tt * 6) * Math.cos(tt * 26 + 2.2) * -1;
  const base = MATCH_BASE;
  return { base, ang, head: P(base.x + Math.cos(ang) * ML, base.y + Math.sin(ang) * ML), charred: t > 2.04 ? 1 : 0 };
}
// spirit state for t in [0.58, 6.5)
function hopArc(t, t0, t1, x0, x1, hgt) {
  const u = clamp((t - t0) / (t1 - t0));
  return { x: lerp(x0, x1, eIO(u) * 0.7 + u * 0.3), y: FLOOR - 4 * hgt * u * (1 - u), u };
}
function spiritState(t, f) {
  const base = { k: 1, sq: 1, lean: 0, sw: 0, limbs: 1, eye: 1, mood: 'n', mouth: 'smile', look: [0, 0], tongues: 1, seed: 3, shadow: null };
  const sh = (y, x) => ({ y: FLOOR - 2, r: clamp(1 - (FLOOR - y) / 420, 0.35, 1) });
  // --- on the match
  if (f < 48) {
    const m = matchState(t, f);
    const hd = m.head;
    let k, sq = 1, lean = 0, eye = 0, mood = 'closed', mouth = 'none', tongues = 0;
    if (f < 14) return null;
    if (f < 24) { // ignite: flash to big, then settle
      const u = (f - 14) / 10;
      k = f === 14 ? 0.95 : f === 15 ? 0.72 : lerp(0.5, 0.56, u);
      sq = f === 14 ? 1.45 : f === 15 ? 1.2 : 1 + 0.12 * Math.sin(f * 2.1);
      lean = f < 20 ? -0.25 * Math.sin((f - 14) / 6 * Math.PI) : 0.08 * Math.sin(f);
      tongues = f < 17 ? 1.3 : 0;
    } else if (f < 36) {
      const u = inv(1.0, 1.42, t);
      k = lerp(0.56, 0.84, eOut(u));
      sq = 1 + 0.06 * Math.sin(f * 1.3);
      lean = 0.07 * Math.sin(f * 0.9);
      if (f >= 30) { eye = f === 30 ? 1.25 : 1; mood = 'n'; mouth = f >= 32 ? 'smile' : 'o'; }
    } else {
      const u = inv(1.5, 1.92, t);
      k = 0.84; sq = lerp(1, 0.7, eOut(u)); lean = -0.06 * u; eye = 1; mood = u > 0.4 ? 'squint' : 'n'; mouth = 'flat';
    }
    return { ...base, x: hd.x, y: hd.y + 14, k, sq, lean, eye, mood, mouth, limbs: 0, tongues, look: [0.6, 0], sw: 0.3 * Math.sin(f * 0.7) };
  }
  // --- jump (on 1s)
  if (f < 60) {
    const st = P(880, MATCH_HEAD.y + 14), land = P(1230, FLOOR);
    if (f === 48) return { ...base, x: st.x, y: st.y - 18, k: 0.86, sq: 1.38, limbs: 0.8, arms: [[2.7, 0.3], [-2.7, -0.3]], legs: [[0.1, 0], [-0.1, 0]], mouth: 'o', mood: 'n', look: [0.7, -0.6], lean: 0.08 };
    if (f === 49) return { ...base, x: st.x + 30, y: st.y - 30, k: 0.9, sq: 1.25, limbs: 1, arms: [[2.9, 0.2], [-2.9, -0.2]], legs: [[0.25, 0.3], [-0.2, 0.3]], mouth: 'grin', look: [0.8, -0.5], lean: 0.15 };
    const u = (f - 50) / 10;
    const p0 = P(st.x + 60, st.y - 60), p1 = P(1120, 440), p2 = P(land.x, land.y - 30);
    const bz = (u) => P((1 - u) ** 2 * p0.x + 2 * u * (1 - u) * p1.x + u * u * p2.x, (1 - u) ** 2 * p0.y + 2 * u * (1 - u) * p1.y + u * u * p2.y);
    const q = bz(u), q2 = bz(Math.min(1, u + 0.1));
    const ang = Math.atan2(q2.y - q.y, q2.x - q.x);
    const out = { ...base, x: q.x, y: q.y, k: 1, sq: 1, limbs: 1, mouth: 'grin', look: [0.6, u > 0.5 ? 0.8 : -0.4], shadow: sh(q.y), lean: 0.12 };
    if (f === 50) return { ...out, x: lerp(st.x, q.x, 0.5), y: lerp(st.y - 60, q.y, 0.5), smear: { ang: Math.atan2(q.y - st.y, q.x - st.x), amt: 1.5 }, arms: [[3.0, 0], [-3.0, 0]], legs: [[0.3, 0.4], [-0.3, 0.4]], mouth: 'o', shadow: null };
    out.arms = u < 0.5 ? [[2.5, 0.6], [-2.4, -0.7]] : [[1.9, 0.9], [-1.9, -0.9]];
    out.legs = u < 0.6 ? [[0.6, -1.0], [-0.4, -0.9]] : [[0.25, 0], [-0.25, 0]];
    out.sq = u > 0.75 ? 1.18 : 1.05;
    out.lean = Math.sin(ang) * 0.1 + 0.08;
    return out;
  }
  // --- land, dance, twirl, ta-da, hop to centre, charge, inhale
  const hits = CUES.hits;
  if (t < hits.hops[0]) {   // landing settle 2.5..3.0 then take off
    const u = (t - 2.5) / 0.5;
    const sqs = [0.62, 0.62, 1.12, 1.12, 0.96, 0.96, 1, 1, 1, 1, 0.86, 0.86];
    const i = f - 60;
    const sq = i < 12 ? sqs[i] : 1;
    // take-off anticipation at the end is part of hop 1 below
    return { ...base, x: 1230, y: FLOOR, sq, k: 1, arms: i < 2 ? [[1.3, 0.6], [-1.3, -0.6]] : [[2.3, -0.9], [-0.8, -1.4]], legs: i < 2 ? [[0.7, -0.9], [-0.7, 0.9]] : [[0.2, 0], [-0.2, 0]], mouth: i < 4 ? 'o' : 'grin', mood: i >= 4 ? 'happy' : 'n', look: [-0.4, 0], shadow: sh(FLOOR), lean: i < 2 ? 0 : -0.05 };
  }
  const hopsX = [1230, 1140, 1320, 1210], hopH = [70, 95, 130];
  for (let j = 0; j < 3; j++) {
    const t0 = j === 0 ? 2.5 + 0.0 : hits.hops[j - 1], t1 = hits.hops[j];
    if (j === 0 && t < 3.0) break;
  }
  if (t < 4.5) {
    // hop j: from hops[j] at time T_j to hops[j+1] at T_{j+1}; T = [3.0, 3.5, 4.0, 4.5] contacts at T
    const T = [3.0, 3.5, 4.0, 4.5];
    let j = Math.floor((t - 3.0) / 0.5); j = clamp(j, 0, 2);
    const t0 = T[j], t1 = T[j + 1];
    const x0 = hopsX[j + 1], x1 = j < 2 ? hopsX[j + 2] : 1300;
    const fr = Math.round((t - t0) * FPS);         // 0..11 within the beat (on 2s -> even only)
    const A = hopArc(t, t0 + 0.083, t1 - 0.04, x0, x1, hopH[j]);
    let sq = 1, y = A.y, x = A.x;
    if (fr < 2) { sq = 0.78; y = FLOOR; x = x0; }
    else if (fr < 4) { sq = 1.22; }
    else if (fr < 8) { sq = 1.04; }
    else { sq = 1.14; }
    const mir = j % 2 ? -1 : 1;
    const arms = fr < 2 ? [[1.2 * mir, 0.5], [-1.2 * mir, -0.5]] : j === 2 ? [[2.8, 0.4], [-2.8, -0.4]] : (mir > 0 ? [[2.9, 0.2], [-1.0, -1.2]] : [[1.0, 1.2], [-2.9, -0.2]]);
    const legs = fr < 2 ? [[0.6, -0.9], [-0.6, 0.9]] : (fr < 8 ? [[0.9 * mir, -1.4], [-0.3 * mir, 0.2]] : [[0.2, 0], [-0.2, 0]]);
    return { ...base, x, y, sq, arms, legs, mouth: fr < 2 ? 'o' : 'grin', mood: fr >= 4 && fr < 8 ? 'happy' : 'n', look: [(x1 - x0) > 0 ? 0.8 : -0.8, 0], lean: ((x1 - x0) > 0 ? 0.1 : -0.1) + (fr < 2 ? 0 : 0), sw: mir * 0.5, shadow: sh(y), tongues: 1 + j * 0.15 };
  }
  if (t < 5.0) {
    // twirl in place (on 1s): two turns, rising slightly
    const u = (t - 4.5) / 0.5;
    const spin = Math.cos(u * TAU * 2);
    const y = FLOOR - Math.sin(u * Math.PI) * 60;
    return { ...base, x: 1300, y, spinX: spin, faceX: Math.sin(u * TAU * 2), sq: 1.08, arms: [[2.2, 0.4], [-2.2, -0.4]], legs: [[0.1, 0], [-0.1, 0]], mouth: 'grin', mood: 'happy', shadow: sh(y), tongues: 1.4, lean: 0.06 * Math.sin(u * TAU * 2), spinU: u };
  }
  if (t < 5.5) {
    // TA-DA
    const i = f - 120;
    const sq = i < 2 ? 0.86 : i < 4 ? 1.12 : 1.04;
    return { ...base, x: 1300, y: FLOOR, sq, arms: [[2.55, 0.25], [-2.55, -0.25]], legs: [[0.35, 0], [-0.35, 0]], mouth: 'grin', mood: 'happy', shadow: sh(FLOOR), tongues: 1.2, lean: 0.02 * Math.sin(i) };
  }
  if (t < 5.75) {
    const A = hopArc(t, 5.5, 5.75, 1300, 1170, 90);
    return { ...base, x: A.x, y: A.y, sq: A.u < 0.15 ? 0.82 : 1.12, arms: [[2.0, 0.8], [-2.0, -0.8]], legs: [[0.5, -0.8], [-0.4, -0.7]], mouth: 'o', look: [-0.8, 0], lean: -0.1, shadow: sh(A.y) };
  }
  if (f < 150) {
    // charge: crouch, squeeze, shake
    const u = inv(5.75, 6.2, t);
    const shake = (f % 2 ? 1 : -1) * 4 * u + hs(170, f) * 2;
    return { ...base, x: 1170 + shake, y: FLOOR, sq: lerp(0.86, 0.66, eOut(u)), k: lerp(1, 1.06, u), arms: [[1.0, 1.3], [-1.0, -1.3]], legs: [[0.9, -1.6], [-0.9, 1.6]], mood: 'squint', mouth: 'flat', shadow: sh(FLOOR), tongues: 1.2 + u * 0.6, lean: 0, sw: 0.4 * Math.sin(f * 2.3) };
  }
  // inhale (on 1s): stretch up, puff up
  const u = (f - 150) / 5;
  return { ...base, x: 1170, y: FLOOR, sq: lerp(0.8, 1.5, eOut(u)), k: lerp(1.04, 1.2, u), arms: [[2.9, 0.2], [-2.9, -0.2]], legs: [[0.15, 0], [-0.15, 0]], mood: 'n', mouth: 'gasp', eye: 1.15, look: [0, -0.6], shadow: sh(FLOOR), tongues: 1.6, lean: 0 };
}
function spiritEnd(t, f) {
  // small spirit perched on the apex of the first A of HAND
  const A = LETTERS.letters[1];
  const apex = A.strokes[0][1];
  const ap = P(apex.x, apex.y - 30);
  const t0 = CUES.hits.spirit_return;
  if (t < t0) return null;
  const i = f - Math.round(t0 * FPS);
  let sq = 1, k = 0.62;
  if (i < 2) { sq = 0.55; k = 0.68; }
  else if (i < 4) { sq = 1.22; }
  else if (i < 6) { sq = 0.94; }
  const wave = t >= CUES.hits.wave && t < CUES.hits.wave + 0.75;
  const wu = (t - CUES.hits.wave) / 0.75;
  const blink = Math.abs(t - CUES.hits.blink) < 0.07;
  const armR = wave ? [-2.6 - 0.45 * Math.sin(wu * TAU * 2), -0.5] : [-1.2, -0.9];
  return { x: ap.x, y: ap.y, k, sq, limbs: 1, arms: [[1.1, 0.9], armR], legs: [[0.9, -1.3], [-0.9, 1.3]], eye: blink ? 0 : 1, mood: blink ? 'closed' : (wave ? 'happy' : 'n'), mouth: wave ? 'grin' : 'smile', look: [0.5, 0.3], seed: 9, tongues: 0.9, lean: 0.06 * Math.sin(t * 3), sw: 0.3 * Math.sin(t * 2.2), shadow: null };
}

// ---------------------------------------------------------------- textures
let PAPERTEX = null, GRAIN = null;
function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
async function prepTextures() {
  const pim = await loadImg('/assets/textures/paper/Paper001_4K_color.jpg');
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const s = Math.max(W / pim.width, H / pim.height) * 1.15;
  g.drawImage(pim, (W - pim.width * s) / 2, (H - pim.height * s) / 2, pim.width * s, pim.height * s);
  const id = g.getImageData(0, 0, W, H), d = id.data;
  let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i + 1];
  const mean = sum / (d.length / 4);
  for (let i = 0; i < d.length; i += 4) {
    const v = clamp(200 + (d[i + 1] - mean) * 16, 0, 255);
    d[i] = v; d[i + 1] = v * 0.96; d[i + 2] = v * 0.9; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  PAPERTEX = c;
  GRAIN = await loadImg('/assets/textures/grain/grain_fine_2048.png');
}
function finish(g, f, e) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.14;
  g.drawImage(PAPERTEX, 0, 0);
  // grain boils with the drawing (moves on the exposure)
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.16;
  const gx = Math.floor(hash(900, e.k) * 900), gy = Math.floor(hash(901, e.k) * 900);
  g.drawImage(GRAIN, gx, gy, W / 1.6, H / 1.6, 0, 0, W, H);
  // warm vignette
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 1;
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(196,160,120,0.38)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
}

// ---------------------------------------------------------------- frame
function drawScene(t, f, e) {
  const g = ctx;
  const hits = CUES.hits;
  const burstF = Math.round(hits.burst * FPS);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);

  // BURST flash frame (1 frame, on 1s): red field, yellow starburst silhouette, ink rim
  if (f === burstF) {
    g.fillStyle = RED; g.fillRect(0, 0, W, H);
    const BC = FXL.bc;
    starburst(g, BC.x, BC.y - 40, 760, 1201, 16, 0.5, YEL, false);
    starburst(g, BC.x, BC.y - 40, 330, 1202, 12, 0.5, PAPER, false);
    return;
  }

  // act camera (world -> screen): 1.35x framing, pans to the spirit before the charge, small push while charging
  const ax = lerp(880, 1170, eIO(inv(5.45, 5.85, t)));
  const z = 1.35 * (t >= 5.75 ? 1 + 0.045 * eIO(inv(5.75, 6.46, t)) : 1);
  let cx = 0, cy = 0;
  if (f > burstF && f < burstF + 7) { const d = 1 - (f - burstF) / 7; cx = hs(1300, f) * 14 * d; cy = hs(1301, f) * 10 * d; }
  g.setTransform(z, 0, 0, z, 960 - ax * z + cx, 690 - 720 * z + cy);

  // ---- act 1-2: floor, box, match (until the burst)
  if (f < burstF) {
    brush(g, [P(330, FLOOR + 2), P(980, FLOOR + 3), P(1600, FLOOR + 1)], { w: 4.5, seed: 1500, jit: 1.4, taper: [0.12, 0.12], cornerLim: 2 });
    brush(g, [P(1630, FLOOR + 1), P(1680, FLOOR + 2)], { w: 3.5, seed: 1501, jit: 1, taper: [0.3, 0.3] });
    brush(g, [P(260, FLOOR + 3), P(300, FLOOR + 2)], { w: 3.5, seed: 1502, jit: 1, taper: [0.3, 0.3] });
    fillShape(g, [P(BOX.x - 10, FLOOR + 3), P(BOX.x + BOX.w + BOX.dx + 30, FLOOR + 3), P(BOX.x + BOX.w + BOX.dx + 10, FLOOR - 4), P(BOX.x, FLOOR - 1)], INK_A(0.14), 1503, { off: 0 });
  }
  const m = matchState(t, f);
  const boxGone = f > burstF + 4;
  // match behind the box when planted on the top face
  const drawMatch = () => {
    if (f > burstF) {
      const u = (f - burstF) / 4;
      if (u <= 1) { g.save(); g.translate(-700 * eIn(u) - 60, -260 * u); g.rotate(-0.4 * u); match(g, MATCH_BASE, -Math.PI / 2, 1, 1600); g.restore(); }
      return;
    }
    if (m.smear) {
      // SMEAR frame: the head is a long tapered streak along the striker
      const [x0, x1] = m.smear;
      brush(g, [P(x0 - 30, 786), P(x1, 780)], { w: 40, color: RED, seed: 1700, jit: 3, taper: [0.9, 0.02], minw: 0.05 });
      brush(g, [P(x0 + 40, 772), P(x1 - 20, 770)], { w: 6, seed: 1701, jit: 2, taper: [0.9, 0.1] });
      brush(g, [P(x0 + 80, 800), P(x1 - 10, 796)], { w: 6, seed: 1702, jit: 2, taper: [0.9, 0.1] });
      for (let i = 0; i < 4; i++) speedLine(g, P(x0 + 60 + i * 40, 735 - i * 14), P(x1 - 40 - i * 30, 738 - i * 14), 5, 1710 + i);
    }
    match(g, m.base, m.ang, m.charred ? 1 : 0, 1600);
  };
  const planted = f >= 17 && f <= burstF;
  if (planted) drawMatch();
  if (!boxGone) {
    if (f > burstF) {
      const u = (f - burstF) / 4;
      if (f === burstF + 1) {
        for (let i = 0; i < 6; i++) speedLine(g, P(BOX.x + 520, BOX.y + 10 + i * 26), P(BOX.x - 40, BOX.y + 16 + i * 26), 7, 1800 + i);
      }
      matchbox(g, -900 * eIn(u) - 120 * u, -140 * u, -0.5 * u, 1900);
    } else matchbox(g, 0, 0, 0, 1900);
  }
  if (!planted) drawMatch();

  // ---- strike FX
  if (f >= 13 && t < 1.1) {
    if (f === 13 || f === 14) starburst(g, 905 + (f - 13) * 90, 772 - (f - 13) * 25, f === 13 ? 70 : 105, 2000 + f, 9, 0.45, YEL, true);
    FXL.strike.forEach((s) => spark(g, s, t));
  }
  if (f >= 14 && t < 1.25) { FXL.ignite_puff.forEach((p) => puff(g, p, t)); FXL.ignite.forEach((s) => spark(g, s, t)); }
  if (f >= 49 && f < burstF) FXL.wisp.forEach((p) => puff(g, p, t));

  // ---- spirit
  if (f < burstF) {
    const s = spiritState(t, f);
    if (s) {
      // speed lines for jump smear, twirl, inhale
      if (f === 49 || f === 50) for (let i = 0; i < 4; i++) speedLine(g, P(880 + hs(2100, i) * 40, MATCH_HEAD.y + 30 - i * 20), P(880 + hs(2101, i) * 30 - 40, MATCH_HEAD.y + 200 + i * 10), 5, 2100 + i + f);
      if (t >= 4.5 && t < 5.0) {
        const u = s.spinU;
        for (let i = 0; i < 3; i++) {
          const pts = []; const a0 = u * TAU * 2 + i * 2.1;
          for (let j = 0; j <= 14; j++) { const a = a0 + j / 14 * 1.7; pts.push(P(1300 + Math.cos(a) * (120 + i * 18), FLOOR - 120 - Math.sin(u * Math.PI) * 60 + Math.sin(a) * 40 + (i - 1) * 55)); }
          brush(g, pts, { w: 6, seed: 2200 + i + f, jit: 1.2, taper: [0.6, 0.1] });
        }
      }
      if (f >= 150) {
        const u = (f - 150) / 5;
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU + 0.13;
          const r1 = lerp(560, 260, eIn(u)), r0 = r1 + 110 * (1 - u * 0.5);
          speedLine(g, P(1170 + Math.cos(a) * r0, 770 + Math.sin(a) * r0 * 0.75), P(1170 + Math.cos(a) * r1, 770 + Math.sin(a) * r1 * 0.75), 6, 2300 + i + f);
        }
      }
      if (t >= 5.75 && f < 150) {
        // heat squiggles around the crouching spirit
        for (let i = 0; i < 4; i++) {
          const sd = i % 2 ? 1 : -1, xb = 1170 + sd * (120 + (i > 1 ? 40 : 0)), yb = FLOOR - 120 - (i > 1 ? 60 : 0);
          const pts = []; for (let j = 0; j <= 10; j++) pts.push(P(xb + Math.sin(j * 1.3 + f) * 7, yb - j * 7));
          brush(g, pts, { w: 4.5, seed: 2400 + i + f, jit: 1, taper: [0.3, 0.3] });
        }
      }
      spirit(g, s);
    }
  }
  // dance FX
  if (t >= 2.5 && t < 3.2) { FXL.land_puffs.forEach((p) => puff(g, p, t)); FXL.land.forEach((s) => spark(g, s, t)); }
  if (t >= 3.0 && t < 4.6) { FXL.hop_puffs.forEach((p) => puff(g, p, t)); FXL.hops.flat().forEach((s) => spark(g, s, t)); }
  if (t >= 4.5 && t < 5.2) FXL.twirl.forEach((s) => spark(g, s, t));
  if (t >= 5.0 && t < 5.5) {
    const i = f - 120;
    [[1180, 600, 30], [1420, 620, 24], [1350, 500, 18]].forEach(([x, y, R], j) => {
      const u = clamp((i - j * 2) / 10);
      const sc = u < 0.3 ? eBack(u / 0.3) : 1 - eIn((u - 0.3) / 0.7) * 0.9;
      if (u > 0 && u < 1) twinkle(g, x, y, R * sc * 1.3, j * 0.4 + u, 2500 + j);
    });
  }
  if (t >= 5.75 && f < burstF) FXL.charge.forEach((s) => spark(g, s, t));

  g.setTransform(1, 0, 0, 1, cx, cy);
  // pencil construction guides for the lettering (appear before the writing, stay faintly)
  if (t >= 6.75) {
    const u = eOut(inv(6.75, 7.0, t));
    const x0 = LETTERS.x0 - 40, x1 = LETTERS.x0 + Math.max(...LETTERS.widths) + 190;
    [568, 568 - CAP, 850, 850 - CAP].forEach((y, i) => {
      brush(g, [P(x0 + (i % 2) * 20, y + 2), P(lerp(x0, x1, u) - (i % 2) * 30, y + hs(1400, i) * 3)], { w: 1.8, color: INK_A(0.2), seed: 1400 + i, jit: 0.8, taper: [0.05, 0.1] });
    });
  }

  // ---- BURST aftermath
  if (f > burstF && t < 8.3) {
    const BC = FXL.bc;
    const df = f - burstF;
    if (df <= 6) {
      const R = [560, 520, 430, 330, 220, 120][df - 1] || 0;
      if (R) {
        starburst(g, BC.x, BC.y - 40, R, 2600 + df, 14, 0.55, YEL, true);
        starburst(g, BC.x, BC.y - 40, R * 0.5, 2610 + df, 10, 0.5, RED, true);
      }
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + hs(2700, i) * 0.12;
        const r0 = 300 + df * 120, r1 = r0 + 220 - df * 22;
        speedLine(g, P(BC.x + Math.cos(a) * r0, BC.y - 40 + Math.sin(a) * r0 * 0.8), P(BC.x + Math.cos(a) * r1, BC.y - 40 + Math.sin(a) * r1 * 0.8), 9 - df, 2700 + i + df * 30);
      }
    }
    FXL.box_puff.forEach((p) => puff(g, p, t));
    FXL.puffs.forEach((p) => puff(g, p, t));
    FXL.burst.forEach((s) => spark(g, s, t));
    // twinkle stars scattered
    for (let j = 0; j < 7; j++) {
      const a = hash(2800, j) * TAU, d = 260 + 260 * hash(2801, j);
      const tt = (t - 6.6 - j * 0.06) / 0.6;
      if (tt > 0 && tt < 1) twinkle(g, BC.x + Math.cos(a) * d, BC.y - 60 + Math.sin(a) * d * 0.7, (22 + 14 * hash(2802, j)) * (tt < 0.3 ? eBack(tt / 0.3) : 1 - eIn((tt - 0.3) / 0.7)), tt * 2, 2810 + j);
    }
  }

  // ---- lettering: converging sparks, write-on, seal, end spirit
  if (t >= 6.7) {
    // sparks fly from the burst cloud to the start of each stroke just before it is written
    for (const o of LETTERS.order) {
      const fl = 0.32, ts = o.t0 - fl;
      if (t < ts || t >= o.t0 + 0.02) continue;
      const u = clamp((t - ts) / fl);
      const BC = FXL.bc;
      const a = hash(3000, o.i) * TAU, d = 120 + 140 * hash(3001, o.i);
      const p0 = P(BC.x + Math.cos(a) * d, BC.y - 60 + Math.sin(a) * d * 0.6), p2 = o.s[0];
      const p1 = P((p0.x + p2.x) / 2 + hs(3002, o.i) * 260, Math.min(p0.y, p2.y) - 180);
      const bz = (u) => P((1 - u) ** 2 * p0.x + 2 * u * (1 - u) * p1.x + u * u * p2.x, (1 - u) ** 2 * p0.y + 2 * u * (1 - u) * p1.y + u * u * p2.y);
      const ue = eIO(u), q = bz(ue), q0 = bz(Math.max(0, ue - 0.18));
      brush(g, [q0, q], { w: 7, color: RED, seed: 3010 + o.i, jit: 1.2, taper: [0.9, 0.05] });
      twinkle(g, q.x, q.y, 18, ue * 3, 3020 + o.i);
    }
    const tips = drawTitle(g, t);
    tips.forEach((tp, i) => twinkle(g, tp.p.x, tp.p.y, 24, tp.o.i * 0.7 + t * 2, 3100 + tp.o.i));
    drawSeal(g, t, f);
    // stamp dust
    if (t >= 8.5 && t < 9.1) FXL.stamp_puffs.forEach((p) => puff(g, { ...p, x: LETTERS.sealX + SEAL.w / 2 + p.sd * 64, y: LETTERS.sealY + SEAL.h - 12 }, t));
    // end spirit + embers
    const se = spiritEnd(t, f);
    if (se) {
      if (f - Math.round(hits.spirit_return * FPS) < 4) {
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; speedLine(g, P(se.x + Math.cos(a) * 70, se.y - 50 + Math.sin(a) * 70), P(se.x + Math.cos(a) * 110, se.y - 50 + Math.sin(a) * 110), 5, 3200 + i + f); }
      }
      spirit(g, se);
      for (const em of FXL.embers) {
        const a = (t - em.t0) / 1.4; if (a < 0) continue;
        const aa = a % 1;
        const x = se.x + em.x + em.vx * aa + Math.sin(aa * 5 + em.i) * 10, y = se.y - 150 - aa * 150;
        const sz = 11 * (1 - aa) * (aa < 0.15 ? aa / 0.15 : 1);
        if (sz > 2) fillShape(g, starPts(x, y, sz, aa * 2, 4, 0.35), em.i % 3 ? YEL : RED, 3300 + em.i, { off: 0, jit: 0.4 });
      }
    }
  }
}

window.renderAt = async (t) => {
  const f = Math.min(239, Math.max(0, Math.round(t * FPS)));
  const e = exposure(f);
  const te = e.fh / FPS;
  BV = e.k % 4;            // 4 boil drawings, cycled every exposure
  JIT = 1;
  drawScene(te, e.fh, e);
  finish(ctx, f, e);
};

(async () => {
  CUES = await (await fetch('cues.json')).json();
  EXPO = CUES.exposure.map(([a, b, n]) => [a, b, n]);
  await prepTextures();
  LETTERS = layoutTitle();
  buildFX();
  await window.renderAt(0);
  window.__ready = true;
})();
