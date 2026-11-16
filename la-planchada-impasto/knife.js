// knife.js — palette-knife impasto in Canvas 2D: shapes are filled with slanted knife planes (ridge, lip, drag colour), clipped to the shape so silhouettes stay crisp.
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const MODE = { grey: 0 };
export const setGrey = g => { MODE.grey = g; };
const toGrey = c => { const y = .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; return [y * .94 + 2, y * .99 + 4, y * 1.06 + 8]; };
export const col = c => { let a = typeof c === 'string' ? hx(c) : c; return MODE.grey ? toGrey(a) : a; };
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scl = (a, k) => [clamp(a[0] * k, 0, 255), clamp(a[1] * k, 0, 255), clamp(a[2] * k, 0, 255)];
export const css = (a, al = 1) => `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`;

// ---- shapes: { path(g), bb } ----
export function poly(pts) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], path(g) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); } }; }
export function blob(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return { bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], path(g) { g.beginPath(); const m0 = mid(pts[n - 1], pts[0]); g.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); } g.closePath(); } };
}
export const ell = (cx, cy, rx, ry, rot = 0) => ({ bb: [cx - Math.max(rx, ry), cy - Math.max(rx, ry), cx + Math.max(rx, ry), cy + Math.max(rx, ry)], path(g) { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, TAU); } });
export const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);

// ---- one knife-painted shape. o: c, c2, r (stroke radius), dir (rad), seed, dens (0..1), fine (bool), ridge (bool) ----
// gr: optional second context that receives only the lit ridges (for raking light)
export function knife(g, shape, o, gr = null) {
  const R = mulberry((o.seed ?? 1) * 7919 + 13), c1 = col(o.c), c2 = col(o.c2 || o.c), r0 = (o.r ?? 14) * ((o.r ?? 14) >= 20 ? 1.6 : 1.12), dir = o.dir ?? -.35;
  g.save(); shape.path(g); g.clip();
  g.fillStyle = css(scl(mix(c1, c2, .4), .86)); g.fillRect(shape.bb[0] - 4, shape.bb[1] - 4, shape.bb[2] - shape.bb[0] + 8, shape.bb[3] - shape.bb[1] + 8);
  if (gr) { gr.save(); shape.path(gr); gr.clip(); }
  const passes = o.fine === false ? [[r0, 1]] : [[r0, 1], [r0 * .55, .85], [r0 * .3, .5]];
  for (const [r, dens] of passes) {
    if (r < 1.6) continue;
    const step = r * 1.05;
    for (let y = shape.bb[1] - r; y < shape.bb[3] + r; y += step) for (let x = shape.bb[0] - r; x < shape.bb[2] + r; x += step) {
      if (R() > dens * (o.dens ?? 1)) continue;
      const cx = x + (R() - .5) * step, cy = y + (R() - .5) * step, ang = dir + (R() - .5) * .46, L = r * (1.7 + R() * 1.4), Wd = r * (.95 + R() * .5), sk = Wd * (.18 + R() * .25);
      const t = R(), cc = scl(mix(c1, c2, t * .8), 1 + (R() - .5) * .13);
      g.save(); g.translate(cx, cy); g.rotate(ang);
      g.fillStyle = css(cc); g.beginPath(); g.moveTo(-L / 2, -Wd / 2 + sk); g.lineTo(L / 2, -Wd / 2 - sk); g.lineTo(L / 2 + Wd * .12, Wd / 2 - sk * .4); g.lineTo(-L / 2 - Wd * .08, Wd / 2 + sk * .6); g.closePath(); g.fill();
      if (o.ridge !== false && Wd > 3) {
        g.lineCap = 'round'; g.lineWidth = Math.max(1, Wd * .12); g.strokeStyle = css(scl(cc, 1.28), .62); g.beginPath(); g.moveTo(-L / 2 + 2, -Wd / 2 + sk + 1); g.lineTo(L / 2 - 2, -Wd / 2 - sk + 1); g.stroke();
        g.strokeStyle = css(scl(cc, .66), .55); g.beginPath(); g.moveTo(-L / 2 - 1, Wd / 2 + sk * .6 - 1); g.lineTo(L / 2 + 1, Wd / 2 - sk * .4 - 1); g.stroke();
        if (R() < .5) { g.lineWidth = Math.max(.8, Wd * .06); g.strokeStyle = css(scl(cc, R() < .5 ? 1.2 : .8), .3); const yy = (R() - .5) * Wd * .5; g.beginPath(); g.moveTo(-L * .4, yy); g.lineTo(L * .35, yy + sk * .3); g.stroke(); }
        if (gr) { gr.save(); gr.translate(cx, cy); gr.rotate(ang); gr.lineCap = 'round'; gr.lineWidth = Math.max(1, Wd * .14); gr.strokeStyle = 'rgba(255,248,235,.85)'; gr.beginPath(); gr.moveTo(-L / 2 + 2, -Wd / 2 + sk + 1); gr.lineTo(L / 2 - 2, -Wd / 2 - sk + 1); gr.stroke(); gr.restore(); }
      }
      g.restore();
    }
  }
  if (gr) gr.restore();
  g.restore();
}
// a thin knife line (creases, hair strands, lashes)
export function line(g, pts, w, c, a = 1) { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w; g.strokeStyle = css(col(c), a); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore(); }
export function dab(g, x, y, rx, ry, c, a = 1, rot = 0) { g.save(); g.fillStyle = css(col(c), a); g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); g.restore(); }

// ---- text laid with the knife: strokes whose centres fall inside the lettering, revealed left to right ----
export function knifeText(text, cx, cy, size, font, color, seed = 3) {
  const w = 1200, h = Math.ceil(size * 1.6), m = document.createElement('canvas'); m.width = w; m.height = h; const g = m.getContext('2d');
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(text, w / 2, h / 2);
  const d = g.getImageData(0, 0, w, h).data, inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[((y | 0) * w + (x | 0)) * 4 + 3] > 128;
  const R = mulberry(seed * 31 + 5), strokes = [], r = Math.max(4, size / 14), c1 = hx(color);
  let x0 = w, x1 = 0; for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) if (inside(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  for (const [rr, st] of [[r * 1.3, r * 1.0], [r * .7, r * .7]]) for (let y = 0; y < h; y += st) for (let x = 0; x < w; x += st) {
    const px = x + (R() - .5) * st, py = y + (R() - .5) * st; if (!inside(px, py)) continue;
    strokes.push({ x: px - w / 2 + cx, y: py - h / 2 + cy, ang: -.3 + (R() - .5) * .5, L: rr * (1.6 + R() * 1.2), Wd: rr * (.9 + R() * .5), k: 1 + (R() - .5) * .12, u: (px - x0) / Math.max(1, x1 - x0), fine: rr < r });
  }
  strokes.sort((a, b) => a.u - b.u);
  return { strokes, color: c1, draw(g, p, alpha = 1) {
    for (const s of this.strokes) { if (s.u > p) break; g.save(); g.translate(s.x, s.y); g.rotate(s.ang); const cc = scl(this.color, s.k);
      g.fillStyle = css(cc, alpha); g.beginPath(); g.moveTo(-s.L / 2, -s.Wd / 2 + 1.5); g.lineTo(s.L / 2, -s.Wd / 2 - 1.5); g.lineTo(s.L / 2, s.Wd / 2 - 1); g.lineTo(-s.L / 2, s.Wd / 2 + 1); g.closePath(); g.fill();
      g.lineWidth = Math.max(1, s.Wd * .12); g.lineCap = 'round'; g.strokeStyle = css(scl(cc, 1.25), .6 * alpha); g.beginPath(); g.moveTo(-s.L / 2 + 1, -s.Wd / 2 + 2); g.lineTo(s.L / 2 - 1, -s.Wd / 2 - 1); g.stroke(); g.strokeStyle = css(scl(cc, .62), .5 * alpha); g.beginPath(); g.moveTo(-s.L / 2, s.Wd / 2); g.lineTo(s.L / 2, s.Wd / 2 - 1); g.stroke(); g.restore(); }
  } };
}
export function bake(w, h, ox, oy, fn, withRidge = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.translate(ox, oy);
  let rv = null, gr = null; if (withRidge) { rv = document.createElement('canvas'); rv.width = w; rv.height = h; gr = rv.getContext('2d'); gr.translate(ox, oy); }
  fn(g, gr); return { cv, rv, ox, oy, w, h };
}
