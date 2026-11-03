// ===== core =====
const W = 1920, H = 1080;
let ctx, T = 0;                      // current global time
let COLLECT = false; const EVSET = new Set();
function ev(type, time) { if (COLLECT) EVSET.add(type + '|' + time.toFixed(3)); }

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const eOut = k => 1 - Math.pow(1 - clamp(k), 3);
const eIO = k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const spring = k => k <= 0 ? 0 : 1 - Math.exp(-7 * k) * Math.cos(13 * k);   // k in seconds
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function shade(hex, f) { // f<0 darker, f>0 lighter
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}
const P = {
  slate: '#7f93a6', slateD: '#6a7d90', teal: '#4f7a7d', tealD: '#3f6467', beige: '#e6d6ba', beigeD: '#cfbd9e',
  navy: '#2c3a56', navyD: '#222d44', purple: '#76699a', purpleD: '#61567f', ink: '#2b2d42', white: '#ffffff',
  red: '#d62828', orange: '#f4a261', skin: '#f2a28d', floor: '#5d6b7a', night: '#1f2a40', fire: '#f08a3c', fireL: '#ffc46b',
  green: '#66c28a', amber: '#f2b84b'
};

// ===== drawing primitives =====
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function rrect(x, y, w, h, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function circ(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); }
function ell(x, y, rx, ry, rot, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2); ctx.fill(); }
function poly(pts, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); }
function line(x1, y1, x2, y2, w, c, cap = 'round') { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = cap; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function tube(pts, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); }
function push(x, y, r = 0, s = 1, sy) { ctx.save(); ctx.translate(x, y); if (r) ctx.rotate(r); if (s !== 1 || (sy !== undefined && sy !== 1)) ctx.scale(s, sy === undefined ? s : sy); }
function pop() { ctx.restore(); }

// ===== camera (plate and everything on it share one transform, clamped to the plate) =====
function camera(lt, dur, o = {}) {
  const k = eIO(lt / Math.max(dur, 0.01));
  const z = lerp(o.z0 ?? 1.03, o.z1 ?? 1.065, k);
  let cx = lerp(o.x0 ?? W / 2, o.x1 ?? W / 2 + 30, k), cy = lerp(o.y0 ?? H / 2, o.y1 ?? H / 2, k);
  const hw = W / 2 / z, hh = H / 2 / z;
  cx = clamp(cx, hw, W - hw); cy = clamp(cy, hh, H - hh);
  ctx.setTransform(z, 0, 0, z, W / 2 - z * cx, H / 2 - z * cy);
}
function screenSpace() { ctx.setTransform(1, 0, 0, 1, 0, 0); }

// ===== typed text =====
let FONT = 'Montserrat';
function setFont(sz) { ctx.font = `800 ${sz}px ${FONT}`; }
function wrap(text, sz, maxW) {
  setFont(sz); const out = [];
  for (const para of text.split('\n')) {
    let cur = '';
    for (const w of para.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    out.push(cur);
  }
  return out;
}
// type text centered in a rect. returns time when typing finished
function typeIn(rx, ry, rw, rh, text, t0, o = {}) {
  const color = o.color || P.ink, rate = o.rate || 30, pad = o.pad ?? 0.12;
  let sz = o.size || 64; let lines;
  for (; ; sz -= 2) { lines = wrap(text, sz, rw * (1 - 2 * pad)); if ((lines.length * sz * 1.12 <= rh * (1 - pad)) || sz < 12) break; }
  setFont(sz); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const lh = sz * 1.12, total = lines.length * lh;
  let y = ry + rh / 2 - total / 2 + sz * 0.86, idx = 0;
  ctx.fillStyle = color;
  for (const ln of lines) {
    const lw = ctx.measureText(ln).width; let x = o.left ? rx + rw * pad : rx + rw / 2 - lw / 2;
    for (let i = 0; i < ln.length; i++) {
      const ch = ln[i], ti = t0 + idx / rate; const adv = ctx.measureText(ln.slice(0, i + 1)).width - ctx.measureText(ln.slice(0, i)).width;
      if (ch !== ' ' && idx % 2 === 0) ev('type', ti);
      if (T >= ti && ch !== ' ') {
        const e = eOut((T - ti) / 0.18), s = 1.45 - 0.45 * e, dx = 0.7 * sz * (1 - e);
        push(x + adv / 2 + dx, y - sz * 0.35, 0, s); ctx.fillText(ch, -adv / 2, sz * 0.35); pop();
      }
      x += adv; if (ch !== ' ') idx++;
    }
    y += lh;
  }
  return t0 + idx / rate;
}
// static board in the world. kind: 'post' | 'hang' | 'wall'
function board(x, y, w, h, kind = 'wall', o = {}) {
  const c = o.color || P.white, d = shade(c, -0.12);
  if (kind === 'post') { rect(x + w / 2 - 9, y + h, 18, o.post || 220, '#5b5f6e'); rect(x + w / 2, y + h, 9, o.post || 220, '#4b4f5e'); }
  if (kind === 'hang') { line(x + w * 0.2, y, x + w * 0.2, y - (o.rope || 140), 5, '#4b4f5e'); line(x + w * 0.8, y, x + w * 0.8, y - (o.rope || 140), 5, '#4b4f5e'); }
  rrect(x, y + 8, w, h, 10, d); rrect(x, y, w, h, 10, c);
}
// sign that pops onto the world with a spring, then gets typed
function sign(x, y, w, h, text, t0, o = {}) {
  if (T < t0) return; const s = spring(T - t0);
  ev('pop', t0);
  push(x + w / 2, y + h / 2, (1 - s) * 0.08, Math.max(0, s)); board(-w / 2, -h / 2, w, h, o.kind || 'wall', o); pop();
  typeIn(x, y, w, h, text, t0 + 0.18, o);
}
function redX(cx, cy, sz, t0) {
  if (T < t0) return; ev('hit', t0);
  const a = clamp((T - t0) / 0.11), b = clamp((T - t0 - 0.11) / 0.11), r = sz / 2;
  line(cx - r, cy - r, cx - r + 2 * r * a, cy - r + 2 * r * a, 26, P.red);
  if (b > 0) line(cx + r, cy - r, cx + r - 2 * r * b, cy - r + 2 * r * b, 26, P.red);
}
function dateCard(text, t0, t1) {
  if (T < t0 || T > t1 + 0.25) return; screenSpace(); ev('pop', t0);
  const s = T > t1 ? 1 - eOut((T - t1) / 0.2) : spring(T - t0);
  push(40 + 165, 40 + 60, 0, s);
  rrect(-165, -60 + 6, 330, 120, 16, '#d8dbe2'); rrect(-165, -60, 330, 120, 16, P.white);
  rrect(-145, -42, 84, 84, 10, P.orange); rect(-145, -42, 84, 24, '#e07f3a');
  rect(-131, -50, 8, 18, '#5b5f6e'); rect(-91, -50, 8, 18, '#5b5f6e');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) rect(-135 + i * 24, -10 + j * 22, 14, 12, P.white);
  pop();
  typeIn(40 + 110, 40, 210, 120, text, t0 + 0.15, { size: 58, pad: 0.04 });
}
function exclaim(x, y, t0, c = P.red) {
  if (T < t0 || T > t0 + 1.6) return; ev('pop', t0); const s = spring(T - t0) * (T > t0 + 1.4 ? 1 - (T - t0 - 1.4) / 0.2 : 1);
  push(x, y, Math.sin((T - t0) * 9) * 0.08 * Math.exp(-(T - t0) * 2), s);
  circ(0, 0, 46, P.white); rrect(-9, -32, 18, 42, 8, c); circ(0, 22, 9, c); pop();
}
function puff(x, y, r, t0, c = P.white, n = 7) {
  const k = (T - t0) / 0.45; if (k < 0 || k > 1) return; if (n > 3) ev('whoosh', t0);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + hash(i + x) * 0.6, d = r * (0.3 + 0.9 * eOut(k));
    circ(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, r * 0.42 * Math.sin(Math.PI * Math.min(1, k * 1.15 + 0.05)), c);
  }
}
function counter(rx, ry, rw, rh, from, to, t0, t1, suffix = '', o = {}) {
  const v = Math.round(lerp(from, to, eOut((T - t0) / (t1 - t0))));
  if (T < t0) return;
  if (Math.floor(v / 5) !== Math.floor(lerp(from, to, eOut((T - 1 / 60 - t0) / (t1 - t0))) / 5)) { }
  setFont(o.size || 80); ctx.fillStyle = o.color || P.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const s = 1 + 0.06 * Math.sin(clamp((T - t0) / (t1 - t0)) * Math.PI * 8) * (T < t1 ? 1 : 0);
  push(rx + rw / 2, ry + rh / 2, 0, s); ctx.fillText(v + suffix, 0, 0); pop();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (let k = t0; k < t1; k += 0.12) ev('tick', k);
}
// ===== headline on a flat colour =====
function headline(text, t0, lt, dur, kind) {
  screenSpace();
  const bg = kind === 'gears' ? '#5b3fa6' : '#e2552f';
  rect(0, 0, W, H, bg);
  if (kind === 'gears') {
    const g = (x, y, r, sp) => { push(x, y, T * sp); const c = '#6a4cb6'; circ(0, 0, r, c); for (let i = 0; i < 10; i++) { push(0, 0, i * Math.PI / 5); rect(-r * 0.13, -r * 1.22, r * 0.26, r * 0.3, c); pop(); } circ(0, 0, r * 0.35, bg); pop(); };
    g(260, 220, 170, 0.25); g(1700, 860, 220, -0.2); g(1560, 170, 110, 0.35); g(330, 930, 120, -0.3);
  } else {
    for (let i = 0; i < 9; i++) { const x = (hash(i) * W + T * 40 * (0.5 + hash(i + 3))) % (W + 400) - 200, y = hash(i + 9) * H; circ(x, y, 90 + hash(i + 2) * 120, '#ea6d49'); circ(x + 70, y + 20, 60 + hash(i + 5) * 70, '#ea6d49'); }
  }
  const z = 1 + 0.03 * lt / dur; ctx.setTransform(z, 0, 0, z, W / 2 * (1 - z), H / 2 * (1 - z));
  typeIn(140, 300, W - 280, 480, text, t0, { color: P.white, size: 94, pad: 0.02, rate: 30 });
}
// ===== splat wipe =====
function splat(k, seed) { // k 0..1 coverage
  if (k <= 0) return; screenSpace(); ctx.fillStyle = P.white; ctx.beginPath();
  const R = 1250 * eOut(k), n = 14;
  for (let i = 0; i <= n * 4; i++) { const a = i / (n * 4) * Math.PI * 2, bump = 1 + 0.18 * Math.sin(a * n + seed) + 0.1 * Math.sin(a * 5 + seed * 2); const x = W / 2 + Math.cos(a) * R * bump, y = H / 2 + Math.sin(a) * R * bump; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.fill();
  for (let i = 0; i < 8; i++) { const a = hash(seed + i) * 6.28, d = R * (1.15 + 0.3 * hash(i + seed * 3)); circ(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d, R * 0.07, P.white); }
}

// ===== characters =====
const blink = (seed) => { let t = 0, i = 0; while (t < T) { const p = 2.7 + 1.5 * hash(seed * 13 + i); if (T < t + p && T > t + p - 0.14) return true; t += p; i++; } return false; };
function ik(sx, sy, tx, ty, l1, l2, bend) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const md = (l1 + l2) * 0.995;
  if (d > md) { dx *= md / d; dy *= md / d; d = md; } d = Math.max(d, Math.abs(l1 - l2) + 1);
  const a = Math.atan2(dy, dx), c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), b = Math.acos(c) * bend;
  const ex = sx + Math.cos(a + b) * l1, ey = sy + Math.sin(a + b) * l1;
  return [ex, ey, sx + dx, sy + dy];
}
function hand(x, y, ang, kind, s, skin) {
  push(x, y, ang); const r = 11 * s, d = shade(skin, -0.12);
  if (kind === 'fist') { circ(0, 0, r * 0.95, skin); circ(-r * 0.2, r * 0.3, r * 0.5, d); }
  else if (kind === 'point') { circ(0, 0, r * 0.9, skin); rrect(r * 0.3, -r * 0.3, r * 1.9, r * 0.6, r * 0.3, skin); }
  else { ell(r * 0.25, 0, r * 1.25, r * 0.95, 0, skin); ell(r * 0.1, -r * 0.95, r * 0.4, r * 0.65, -0.6, skin); }
  pop();
}
function arm(sx, sy, tx, ty, o, bend, back) {
  const h = o.h, l1 = 0.1285 * h, l2 = 0.122 * h, th = 0.039 * h * (o.armT || 1);
  const [ex, ey, hx, hy] = ik(sx, sy, tx, ty, l1, l2, bend);
  const sl = back ? shade(o.top, -0.15) : o.top, sk = back ? shade(o.skin, -0.1) : o.skin;
  tube([sx, sy, ex, ey], th, sl); tube([ex, ey, hx, hy], th * 0.92, o.sleeves === 'short' ? sk : sl);
  circ(sx, sy, th * 0.62, sl);
  hand(hx, hy, Math.atan2(hy - ey, hx - ex), o.handKind || 'open', h / 459 * 1.25, sk);
  if (o.holding && !back) o.holding(hx, hy, Math.atan2(hy - ey, hx - ex));
}
function hair(o, x, y, r, layer) {
  const c = o.hairC || '#5a3b2e', st = o.hair, f = o.face || 1, back = o.view === 'back';
  if (st === 'curly') {
    if (layer === 'back') { for (let i = 0; i < 16; i++) { const a = Math.PI * (0.95 + i / 15 * 1.1); circ(x + Math.cos(a) * r * 1.0 - f * r * 0.15, y + Math.sin(a) * r * 0.95, r * 0.36, c); } circ(x - f * r * 0.3, y + r * 0.35, r * 0.55, c); circ(x + f * r * 0.1, y + r * 0.6, r * 0.45, c); if (o.view !== 'side') circ(x + r * 0.65, y + r * 0.45, r * 0.42, c), circ(x - r * 0.65, y + r * 0.45, r * 0.42, c); }
    else if (!back) { for (let i = 0; i < 6; i++) circ(x + (i - 2.5) * r * 0.3 + (o.view === 'side' ? -f * r * 0.25 : 0), y - r * 0.78 + Math.abs(i - 2.5) * r * 0.06, r * 0.27, c); }
    else circ(x, y, r * 1.02, c);
  } else if (st === 'long') {
    if (layer === 'back') { ell(x - f * (o.view === 'side' ? r * 0.25 : 0), y + r * 0.45, r * 1.12, r * 1.15, 0, c); }
    else if (!back) { ell(x + (o.view === 'side' ? -f * r * 0.2 : 0), y - r * 0.62, r * 0.98, r * 0.45, 0, c); if (o.view !== 'side') { ell(x - r * 0.8, y, r * 0.28, r * 0.75, 0.1, c); ell(x + r * 0.8, y, r * 0.28, r * 0.75, -0.1, c); } }
    else ell(x, y + r * 0.2, r * 1.08, r * 1.2, 0, c);
  } else if (st === 'helmet') {
    if (layer === 'front') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 1.08, Math.PI, 0); ctx.fill(); rect(x - r * 1.12, y - r * 0.18, r * 2.24, r * 0.2, shade(c, -0.2)); }
  } else if (st === 'cap') {
    if (layer === 'front') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - r * 0.35, r * 0.98, Math.PI, 0); ctx.fill(); rect(x - r * (o.view === 'side' ? 0.2 : 1.05) + (o.view === 'side' ? f * r * 0.4 : 0), y - r * 0.42, r * (o.view === 'side' ? 1 : 2.1), r * 0.16, shade(c, -0.25)); }
  } else if (st === 'bandana') {
    if (layer === 'back') circ(x - f * r * 0.1, y - r * 0.1, r * 1.04, c);
    else { ctx.fillStyle = o.bandC || '#c0504d'; ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 1.02, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); }
  } else { // short / slick
    if (layer === 'front' && !back) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - r * 0.12, r * 1.03, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ell(x + (st === 'slick' ? r * 0.3 : 0) - (o.view === 'side' ? f * r * 0.3 : 0), y - r * 0.72, r * 0.8, r * 0.36, st === 'slick' ? 0.15 : 0, c); }
    if (back && layer === 'front') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r * 1.03, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); }
  }
}
// person: feet at (x,y). view front|side|back
function person(o) {
  const h = o.h || 459, f = o.face || 1, view = o.view || 'front', skin = o.skin || P.skin;
  o.skin = skin; o.h = h; o.top = o.top || P.slate;
  const seed = o.seed || 1, nod = (o.nod ?? 1) * 0.035 * Math.sin(T * 2.3 + seed * 1.7) + (o.headR || 0);
  const pants = o.pants || shade(o.top, -0.2), shoes = o.shoes || '#3a3d4c';
  const bob = o.walk !== undefined ? 0 : Math.sin(T * 1.9 + seed) * h * 0.004; // breathing
  const L1 = 0.155 * h, L2 = 0.15 * h, legW = 0.075 * h;
  let hipY = o.y - (L1 + L2), hipX = o.x;
  push(0, 0); if (o.lean) { ctx.translate(o.x, o.y); ctx.rotate(o.lean); ctx.translate(-o.x, -o.y); }
  // legs
  let feet = [];
  if (o.sit) {
    hipY = o.y - (o.seatH ?? L2);
    if (view === 'side') { for (const k of [1, 0]) { const c = k ? shade(pants, -0.15) : pants; tube([hipX, hipY, hipX + f * L1, hipY, hipX + f * L1, hipY + (o.seatH ?? L2)], legW, c); ell(hipX + f * (L1 + legW * 0.4), o.y - legW * 0.3, legW * 0.85, legW * 0.42, 0, shoes); } }
    else if (!o.noLegs) { for (const s of [-1, 1]) { tube([hipX + s * 0.055 * h, hipY, hipX + s * 0.06 * h, hipY + L2 * 0.5], legW, pants); } }
  } else if (o.walk !== undefined && view !== 'front') {
    const ph = o.walk; let maxd = 0; const fk = [];
    for (const k of [0, 1]) {
      const p = ph + k * Math.PI, a = 0.42 * Math.sin(p), sw = Math.cos(p) > 0, kb = sw ? 0.75 * Math.cos(p) ** 2 : 0.04;
      const kx = Math.sin(a) * L1, ky = Math.cos(a) * L1, fx = kx + Math.sin(a - kb) * L2, fy = ky + Math.cos(a - kb) * L2;
      fk.push([kx, ky, fx, fy]); maxd = Math.max(maxd, fy);
    }
    hipY = o.y - maxd;
    [1, 0].forEach(k => { const [kx, ky, fx, fy] = fk[k]; const c = k ? shade(pants, -0.15) : pants; tube([hipX, hipY, hipX + f * kx, hipY + ky, hipX + f * fx, hipY + fy], legW, c); ell(hipX + f * (fx + legW * 0.35), hipY + fy - legW * 0.25, legW * 0.8, legW * 0.42, 0, shoes); });
  } else if (!o.noLegs) {
    const sp = view === 'side' ? 0.02 : 0.055;
    for (const s of [-1, 1]) { tube([hipX + s * sp * h, hipY, hipX + s * sp * h * 1.1, o.y - legW * 0.4], legW, s < 0 && view === 'side' ? shade(pants, -0.15) : pants); ell(hipX + s * sp * h * 1.1 + (view === 'side' ? f * legW * 0.35 : 0), o.y - legW * 0.3, legW * 0.75, legW * 0.42, 0, shoes); }
  }
  // torso
  const tw = view === 'side' ? 0.19 * h : 0.27 * h, tTop = hipY - 0.33 * h + bob, tx = hipX - tw / 2;
  const shX = view === 'side' ? 0 : 0.125 * h, shY = tTop + 0.05 * h;
  const armA = o.armA || { x: hipX - (view === 'side' ? -f * 0.05 * h : 0.15 * h), y: hipY + 0.04 * h };
  const armB = o.armB || { x: hipX + (view === 'side' ? f * 0.06 * h : 0.15 * h), y: hipY + 0.05 * h };
  if (view === 'side' && !o.noArms) arm(hipX, shY, armA.x, armA.y, { ...o, handKind: armA.hand }, f > 0 ? 1 : -1, true);
  rrect(tx, tTop, tw, hipY - tTop + 0.03 * h, 0.07 * h, o.top);
  rrect(tx + tw * (view === 'side' ? (f > 0 ? 0 : 0.6) : 0.68), tTop + 0.02 * h, tw * 0.32, hipY - tTop, 0.06 * h, shade(o.top, -0.1));
  if (o.detail) o.detail(tx, tTop, tw, hipY - tTop, h, view, f);
  // head
  const hr = 0.17 * h, hx = hipX + (view === 'side' ? f * 0.01 * h : 0), hy = tTop - 0.125 * h;
  push(hx, tTop, nod * f); ctx.translate(-hx, -tTop);
  rect(hx - 0.035 * h, tTop - 0.05 * h, 0.07 * h, 0.07 * h, shade(skin, -0.1));
  hair(o, hx, hy, hr, 'back');
  if (view !== 'back') {
    circ(hx, hy, hr, skin); ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.clip(); circ(hx + hr * 0.55 * (view === 'side' ? -f : 1), hy + hr * 0.3, hr * 0.75, shade(skin, -0.07)); ctx.restore();
    const ex = view === 'side' ? [hx + f * hr * 0.5] : [hx - hr * 0.36, hx + hr * 0.36], ey = hy + hr * 0.02 + (o.lookY || 0) * hr * 0.1, lx = (o.lookX || 0) * hr * 0.08;
    const closed = o.eyesClosed || blink(seed);
    for (const e of ex) { if (closed) rrect(e + lx - hr * 0.11, ey - hr * 0.025, hr * 0.22, hr * 0.06, 3, P.ink); else circ(e + lx, ey, hr * 0.085, P.ink); }
    if (o.brow) for (const e of ex) { push(e + lx, ey - hr * 0.24, o.brow * (e < hx ? 1 : -1)); rrect(-hr * 0.14, -hr * 0.03, hr * 0.28, hr * 0.06, 3, shade(o.hairC || P.ink, -0.2)); pop(); }
    const mx = view === 'side' ? hx + f * hr * 0.55 : hx, my = hy + hr * 0.45, m = o.mouth || 'flat';
    ctx.fillStyle = shade(skin, -0.45);
    if (m === 'o') ell(mx, my, hr * 0.1, hr * 0.13, 0, ctx.fillStyle);
    else if (m === 'smile' || m === 'laugh') { ctx.beginPath(); ctx.arc(mx, my - hr * 0.06, hr * (m === 'laugh' ? 0.2 : 0.15), 0.15 * Math.PI, 0.85 * Math.PI); ctx.fill(); }
    else if (m === 'frown') { ctx.beginPath(); ctx.arc(mx, my + hr * 0.12, hr * 0.13, 1.2 * Math.PI, 1.8 * Math.PI); ctx.lineWidth = hr * 0.05; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); }
    else rrect(mx - hr * 0.1, my, hr * 0.2, hr * 0.045, 2, ctx.fillStyle);
    if (o.glasses) { for (const e of ex) { ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e + lx, ey, hr * 0.16, 0, 7); ctx.stroke(); } }
    if (o.tear) { const k = (T * 0.8) % 1; ell(ex[ex.length - 1] + hr * 0.05, ey + hr * 0.15 + k * hr * 0.4, hr * 0.045, hr * 0.07, 0, '#9fd3f0'); }
    if (o.faceExtra) o.faceExtra(hx, hy, hr);
  } else circ(hx, hy, hr, skin);
  hair(o, hx, hy, hr, 'front');
  pop();
  // near arms
  if (!o.noArms) {
    if (view === 'side') arm(hipX, shY, armB.x, armB.y, { ...o, handKind: armB.hand }, f > 0 ? 1 : -1, false);
    else { arm(hipX - shX, shY, armA.x, armA.y, { ...o, handKind: armA.hand }, -1, view === 'back'); arm(hipX + shX, shY, armB.x, armB.y, { ...o, handKind: armB.hand }, 1, view === 'back'); }
  }
  pop();
  return { headX: hx, headY: hy, hr, shY, hipY, shL: hipX - shX, shR: hipX + shX };
}
const walkX = (x0, ph, h, f) => x0 + f * ph / (Math.PI * 2) * 1.5 * (0.305 * h);

// cast
const marineDetail = (x, y, w, h2, h, view, f) => { rrect(x - 3, y + 0.02 * h, w + 6, h2 * 0.55, 0.04 * h, '#7d8463'); rect(x + w * 0.1, y + h2 * 0.62, w * 0.8, 0.03 * h, '#4a4f3a'); };
const CAST = {
  ripley: { hair: 'curly', hairC: '#5b3a2c', top: '#8c909e', pants: '#767a88', seed: 1 },
  ripleyTank: { hair: 'curly', hairC: '#5b3a2c', top: '#c9c3b6', pants: '#6f6a5e', seed: 1, sleeves: 'short' },
  newt: { hair: 'long', hairC: '#d8ae64', top: '#d98da2', pants: '#7a6a9a', h: 300, seed: 2 },
  burke: { hair: 'slick', hairC: '#4a3a30', top: '#4f5d6e', seed: 3, detail: (x, y, w, h2, h, v, f) => { if (v === 'front') { poly([x + w / 2 - 0.05 * h, y, x + w / 2 + 0.05 * h, y, x + w / 2, y + 0.12 * h], '#eee8dc'); rect(x + w / 2 - 0.012 * h, y + 0.03 * h, 0.024 * h, 0.14 * h, '#8a4a5a'); } else rect(x + w / 2 + f * 0.05 * h - 0.01 * h, y, 0.03 * h, 0.1 * h, '#eee8dc'); } },
  hicks: { hair: 'helmet', hairC: '#6b7356', top: '#5f6b4e', seed: 4, detail: marineDetail },
  hudson: { hair: 'helmet', hairC: '#6b7356', top: '#5f6b4e', seed: 5, detail: marineDetail, skin: '#f0a690' },
  apone: { hair: 'cap', hairC: '#4f5a45', top: '#5f6b4e', seed: 6, detail: marineDetail, skin: '#9a6650' },
  vasquez: { hair: 'bandana', hairC: '#2f2622', top: '#5f6b4e', seed: 7, detail: marineDetail, skin: '#d99a7c', sleeves: 'short', h: 430 },
  gorman: { hair: 'cap', hairC: '#57604c', top: '#6a7259', seed: 8, glasses: true },
  bishop: { hair: 'short', hairC: '#6b5a48', top: '#e3dfd6', seed: 9 },
  father: { hair: 'short', hairC: '#6e4e38', top: '#8a6f5a', seed: 10 },
  mother: { hair: 'long', hairC: '#7a4b34', top: '#5b7a8a', seed: 11, h: 430 },
  tim: { hair: 'short', hairC: '#c99a55', top: '#7f9a6a', h: 330, seed: 12 },
};
const who = (name, extra) => ({ ...CAST[name], ...extra });

// ===== creatures =====
const XC = { b: '#3a4066', d: '#2a2e4b', l: '#4f578a', sh: '#8790c8', t: '#ece8dc', in: '#7a3550' };
function xeno(o) { // chunky cartoon xenomorph, side view, feet at x,y facing f
  const s = o.s || 1, f = o.face || 1, t = T + (o.seed || 0), m = clamp(o.mouth || 0), cr = o.crouch || 0, ph = o.walk, rc = o.reach || 0, Q = !!o.queen;
  push(o.x, o.y, o.rot || 0, s * f, s);
  const br = Math.sin(t * 2.2) * 4, hx = -20, hy = -205 + cr * 55;
  const chx = 55, chy = -305 + cr * 70 + br * 0.5;
  // tail
  const tp = []; for (let i = 0; i <= 14; i++) tp.push(hx - 30 - i * 25, hy + 25 + i * 9 + Math.sin(i * 0.42 - t * 2.4) * (3 + i * 2.4));
  for (let i = 0; i < 14; i++) tube([tp[i * 2], tp[i * 2 + 1], tp[i * 2 + 2], tp[i * 2 + 3]], 36 - i * 2.1, i % 2 ? XC.d : shade(XC.d, 0.06));
  push(tp[28], tp[29], Math.atan2(tp[29] - tp[27], tp[28] - tp[26])); poly([0, -4, 26, -22, 58, 0, 26, 22, 0, 4], XC.d); pop();
  // legs (digitigrade): thigh forward, shin back, foot forward
  const leg = (k, col) => {
    const p = ph === undefined ? 0 : ph + k * Math.PI;
    const sw = ph === undefined ? (k ? 0.14 : -0.06) : 0.42 * Math.sin(p), lift = ph === undefined ? 0 : Math.max(0, Math.cos(p)) * 26;
    const a = 0.55 + sw, kx = hx + Math.sin(a) * 95, ky = hy + Math.cos(a) * 95 * (1 - cr * 0.35);
    const ax = kx - 62 + sw * 30, ay = -34 - lift;
    tube([hx, hy, kx, ky], 44, col); tube([kx, ky, ax, ay], 30, col); tube([ax, ay, ax + 52, -6 - lift * 0.4], 20, col);
    for (let i = 0; i < 2; i++) line(ax + 52, -6 - lift * 0.4, ax + 66, -2 - lift * 0.4 + i * 6, 7, col);
  };
  leg(1, XC.d);
  // far arm
  tube([chx + 5, chy + 22, chx + 30, chy + 95, chx + 75 + rc * 70, chy + 70 - rc * 40], 22, XC.d);
  // dorsal tubes
  const nt = Q ? 6 : 4; for (let i = 0; i < nt; i++) { push(chx - 18 - i * 17, chy - 10 + i * 13, -1.05 - i * 0.1); rrect(-11, -(Q ? 90 : 72), 22, Q ? 90 : 72, 11, i % 2 ? XC.l : XC.b); pop(); }
  // torso
  tube([hx, hy, chx, chy], 104, XC.b); ell(chx, chy + 8, 64, 58, 0.3, XC.b);
  ctx.strokeStyle = XC.l; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.lineWidth = 8; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(chx - 6, chy - 4 + i * 19, 48, -0.15, 0.55); ctx.stroke(); }
  if (Q && o.extraArms) tube([chx + 20, chy + 50, chx + 60, chy + 92, chx + 92, chy + 70 + Math.sin(t * 3) * 10], 16, XC.l);
  leg(0, XC.b);
  // head
  push(chx + 30, chy - 15, (o.headR || 0) + Math.sin(t * 1.6) * 0.04);
  if (Q) { // crown: a wide solid fan behind the head
    const qp = (k, A, B, C) => (1 - k) * (1 - k) * A + 2 * (1 - k) * k * B + k * k * C;
    ctx.fillStyle = XC.d; ctx.beginPath(); ctx.moveTo(40, -40); ctx.quadraticCurveTo(-10, -330, -380, -270); ctx.quadraticCurveTo(-350, -170, -300, -120); ctx.quadraticCurveTo(-170, -40, -40, -14); ctx.closePath(); ctx.fill();
    for (let i = 1; i < 7; i++) { const k = i / 7, ex = qp(k, 40, -10, -380), ey = qp(k, -40, -330, -270); tube([-10, -40, lerp(-10, ex, 0.55), lerp(-40, ey, 0.55) + 10, ex * 0.94, ey * 0.94], 11, XC.l); }
    for (let i = 1; i < 9; i++) { const k = i / 9, x = qp(k, 40, -10, -380), y = qp(k, -40, -330, -270); poly([x - 13, y + 10, x - 4, y - 26, x + 13, y + 6], XC.d); }
  }
  ctx.fillStyle = XC.b; ctx.beginPath(); ctx.moveTo(80, 18); ctx.quadraticCurveTo(108, -34, 45, -66);
  ctx.bezierCurveTo(-20, -104, -135, -112, -210, -78); ctx.bezierCurveTo(-140, -38, -50, -4, 10, 16); ctx.closePath(); ctx.fill();
  tube([50, -62, -20, -92, -100, -102, -170, -88], 16, XC.l); tube([30, -76, -30, -96, -100, -100], 6, XC.sh);
  ell(62, 6, 44, 26, 0.15, XC.b);
  // mouth: dark interior, silver teeth, hinged jaw, inner jaw
  if (m > 0.04) poly([28, 12, 98, 10, 92, 14 + m * 30, 30, 20 + m * 6], XC.in);
  for (let i = 0; i < 8; i++) poly([30 + i * 8.5, 10, 37 + i * 8.5, 10, 33.5 + i * 8.5, 22], XC.t);
  push(30, 16, m * 0.42); rrect(-6, -2, 78, 22, 10, XC.b); for (let i = 0; i < 7; i++) poly([2 + i * 9, 0, 9 + i * 9, 0, 5.5 + i * 9, -11], XC.t); pop();
  if (m > 0.6) { const k = (m - 0.6) / 0.4, ix = 30 + k * 95; tube([30, 18, ix, 20 + m * 8], 13, XC.d); rrect(ix - 6, 12 + m * 8, 22, 16, 6, XC.d); for (let i = 0; i < 3; i++) poly([ix + i * 6 - 4, 14 + m * 8, ix + i * 6 + 1, 14 + m * 8, ix + i * 6 - 1.5, 22 + m * 8], XC.t); }
  pop();
  // near arm
  const sx = chx + 18, sy = chy + 18, ex = sx + 36, ey = sy + 72 + Math.sin(t * 2.6) * 6, wx = ex + 50 + rc * 85, wy = ey - 10 - rc * 70;
  tube([sx, sy, ex, ey], 28, XC.b); tube([ex, ey, wx, wy], 24, XC.b);
  for (let i = 0; i < 3; i++) { const a = -0.5 + i * 0.5 + rc * -0.4; tube([wx, wy, wx + Math.cos(a) * 34, wy + Math.sin(a) * 34 + 10, wx + Math.cos(a) * 48 + 4, wy + Math.sin(a) * 48 + 24], 8, XC.d); }
  pop();
}
function facehugger(o) {
  const s = o.s || 1, t = T + (o.seed || 0); push(o.x, o.y, o.rot || 0, s);
  const c = '#e5c79c', d = '#c6a27a';
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const a = (o.grip ? 0.3 : 0.15 * Math.sin(t * 9 + i * 1.3)); const bx = sd * (14 + i * 7), by = -8 + i * 8; tube([bx, by, bx + sd * (38 + i * 5), by - 20 + i * 12 + a * 30, bx + sd * (58 + i * 4) * (o.grip ? 0.75 : 1), by + 22 + i * 4], 8, i % 2 ? d : c); }
  const tl = []; for (let i = 0; i <= 10; i++) tl.push(Math.sin(i * 0.7 + t * 4) * 18, 20 + i * 14); tube(tl, 10, d);
  ell(0, 0, 32, 24, 0, c); ell(0, 6, 26, 14, 0, d); pop();
}
function egg(o) {
  const s = o.s || 1, op = o.open || 0; push(o.x, o.y, 0, s);
  const c = '#9c8566', d = '#7f6a50';
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -55, 42, 58, 0, 0, Math.PI * 2); ctx.fill();
  ell(-12, -50, 14, 40, 0.1, d);
  for (let i = 0; i < 4; i++) { push(0, -105, (i - 1.5) * 0.5); ell(0, -8 - op * 10, 14, 18 + op * 8, 0, i % 2 ? c : d); pop(); }
  if (op > 0.3) circ(0, -104, 8 * op, '#d8d0a0');
  ell(0, 0, 40, 9, 0, d); pop();
}

// ===== props =====
function rifle(x, y, a, s = 1) { push(x, y, a, s); rrect(-20, -9, 120, 18, 5, '#3f4434'); rect(-50, -6, 40, 14, '#4b5240'); rect(30, 9, 14, 24, '#3f4434'); rect(100, -4, 22, 8, '#2f3327'); pop(); }
function flamer(x, y, a, on) { push(x, y, a); rrect(-30, -10, 130, 22, 6, '#565a63'); rect(100, -6, 26, 12, '#3b3e46'); rrect(-10, 12, 50, 18, 6, '#c86a3a'); if (on) { const L = 260 + 30 * Math.sin(T * 30); for (let i = 0; i < 9; i++) circ(126 + L * i / 9, Math.sin(T * 20 + i) * 6 * i / 3, 12 + i * 5, i > 5 ? P.fire : P.fireL); } pop(); }
function apc(x, y, s = 1, f = 1) { push(x, y, 0, s * f, s); rrect(-260, -230, 460, 170, 18, '#6f7656'); poly([200, -230, 270, -160, 270, -60, 200, -60], '#5d6448'); rect(-260, -120, 530, 40, '#5d6448'); rrect(-120, -280, 160, 60, 10, '#5d6448'); rect(30, -268, 90, 16, '#4a503a'); rect(120, -210, 70, 34, '#cfe7f0'); for (const wx of [-170, -20, 130]) { circ(wx, -50, 58, '#2e3138'); circ(wx, -50, 24, '#565a63'); } circ(258, -110, 12, P.fireL); pop(); }
function dropship(x, y, s = 1, r = 0) { push(x, y, r, s); poly([-300, -30, 180, -50, 300, -10, 180, 30, -300, 40], '#7d828c'); poly([-300, 10, 180, 0, 300, -10, 180, 30, -300, 40], '#6a6f79'); poly([120, -40, 230, -30, 200, -14, 120, -14], '#cfe7f0'); rrect(-240, -80, 160, 40, 14, '#5d626c'); rrect(-240, 40, 160, 36, 14, '#5d626c'); poly([-300, -30, -360, -110, -300, -110, -230, -40], '#6a6f79'); circ(-245, -60, 16, P.fireL); circ(-245, 58, 14, P.fireL); pop(); }
function sentry(x, y, firing, s = 1) { push(x, y, 0, s); for (const a of [-0.5, 0, 0.5]) line(0, -120, Math.sin(a) * 110, 0, 10, '#4b4f5e'); rrect(-70, -190, 160, 80, 12, '#6f7656'); rect(90, -165, 70, 22, '#4a503a'); rrect(-60, -180, 60, 40, 6, '#1e2a24'); if (firing) { const k = (T * 14) % 1; if (k < 0.5) { poly([160, -154, 230, -175, 215, -154, 230, -133], P.fireL); circ(170, -154, 16, P.white); } } pop(); }
function tracker(x, y, s, dots) { push(x, y, 0, s); rrect(-170, -120, 340, 250, 30, '#4f5442'); rrect(-140, -95, 280, 180, 18, '#122019'); ctx.save(); ctx.beginPath(); ctx.roundRect(-140, -95, 280, 180, 18); ctx.clip(); ctx.strokeStyle = '#2f6b47'; ctx.lineWidth = 3; for (let r = 40; r < 200; r += 40) { ctx.beginPath(); ctx.arc(0, 80, r, Math.PI, 0); ctx.stroke(); } for (const d of dots) circ(d[0], d[1], 9, '#7cf0a2'); ctx.restore(); pop(); }
function loader(x, y, s, t, o = {}) { // Ripley inside power loader, side view facing f
  const f = o.face || 1, ph = o.walk || 0; push(x, y, 0, s * f, s);
  const Y = '#f2b632', Yd = '#d39a1e';
  const step = Math.sin(ph) * 40, lift = Math.max(0, Math.sin(ph)) * 18;
  rrect(-70 + step, -200, 50, 200 - lift, 10, Yd); rrect(-90 + step, -30 - lift, 100, 30, 8, '#3a3d4c');
  rrect(20 - step, -200, 50, 200, 10, Y); rrect(0 - step, -30, 100, 30, 8, '#3a3d4c');
  rrect(-110, -460, 220, 270, 20, Y); rrect(-90, -440, 180, 230, 14, '#46506a');
  for (let i = 0; i < 6; i++) poly([-110 + i * 40, -190, -90 + i * 40, -190, -110 + i * 40 + 20, -170, -130 + i * 40 + 20, -170], i % 2 ? P.ink : Y);
  person({ ...CAST.ripleyTank, x: 0, y: -215, h: 300, view: 'side', face: 1, noLegs: true, armA: { x: 40, y: -360 }, armB: { x: 60, y: -340 }, mouth: o.mouth || 'frown', brow: 0.3 });
  const a = o.arm || 0; // punch amount
  for (const k of [0, 1]) { const ax = 80 + a * 120 * (k ? 1 : 0.6), ay = -380 + k * 40; tube([80, -400 + k * 40, ax + 80, ay - 10, ax + 170, ay], 38, k ? Y : Yd); poly([ax + 170, ay - 30, ax + 240, ay - 40, ax + 220, ay - 10, ax + 240, ay + 30, ax + 170, ay + 25], '#5b5f6e'); }
  pop();
}
// plate pieces
function stars(n, seed, c = '#c9d6e8') { for (let i = 0; i < n; i++) { const tw = 0.6 + 0.4 * Math.sin(T * 2 + i); circ(hash(i + seed) * W, hash(i * 3 + seed) * H, (1 + hash(i * 7) * 2.4) * tw, c); } }
function room(wall, floor, fy = 820) { rect(0, 0, W, fy, wall); rect(0, fy, W, H - fy, floor); rect(0, fy, W, 14, shade(floor, -0.15)); for (let x = 0; x < W; x += 240) rect(x, 0, 10, fy, shade(wall, -0.06)); rect(0, 60, W, 22, shade(wall, -0.08)); }
function panelWall(x, y, w, h, c) { rrect(x, y, w, h, 14, shade(c, -0.08)); rrect(x + 12, y + 12, w - 24, h - 24, 10, c); }
function lightStrip(y, c = '#eef3f7') { for (let x = 120; x < W; x += 420) rrect(x, y, 200, 18, 9, c); }
function screenBox(x, y, w, h, c = '#cfe7f0') { rrect(x - 14, y - 14, w + 28, h + 28, 16, '#3f4a5c'); rrect(x, y, w, h, 8, c); }
