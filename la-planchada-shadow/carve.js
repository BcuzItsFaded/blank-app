// carve.js — translucent dyed-hide pieces: shape + carved holes + hide texture + dark carved outline, baked once
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let HIDE = null;
function hideTex() {
  if (HIDE) return HIDE; const s = 256, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), R = mulberry(7);
  g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) { const x = R() * s, y = R() * s, r = 14 + R() * 40, gr = g.createRadialGradient(x, y, 0, x, y, r); const dk = R() > .5; gr.addColorStop(0, dk ? 'rgba(120,80,40,.16)' : 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; for (const [ox, oy] of [[0, 0], [-s, 0], [s, 0], [0, -s], [0, s]]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); } }
  g.strokeStyle = 'rgba(110,70,35,.22)'; g.lineWidth = 1; for (let i = 0; i < 160; i++) { const x = R() * s, y = R() * s, a = R() * TAU, l = 6 + R() * 18; g.beginPath(); g.moveTo(x, y); g.lineTo((x + Math.cos(a) * l + s) % s, (y + Math.sin(a) * l + s) % s); g.stroke(); }
  g.fillStyle = 'rgba(70,40,20,.25)'; for (let i = 0; i < 90; i++) g.fillRect(R() * s, R() * s, 1.5, 1.5);
  HIDE = g.createPattern(c, 'repeat'); return HIDE;
}
// pieces are drawn at SS× resolution
export const SS = 1.5;
// spec: path(g) builds the outline; holes: array of path builders; dye; ink (outline colour); w,h,ox,oy
export function piece(w, h, ox, oy, spec) {
  const cw = Math.ceil(w * SS), ch = Math.ceil(h * SS), M = document.createElement('canvas'); M.width = cw; M.height = ch; const m = M.getContext('2d'); m.scale(SS, SS); m.translate(ox, oy);
  m.fillStyle = '#000'; m.beginPath(); spec.path(m); m.fill();
  const holes = spec.holes || []; m.save(); m.beginPath(); spec.path(m); m.clip(); m.globalCompositeOperation = 'destination-out'; m.fillStyle = '#000'; for (const hb of holes) { m.beginPath(); hb(m); m.fill(); } m.restore();
  if (spec.cutText) { const c = spec.cutText; m.save(); m.globalCompositeOperation = 'destination-out'; m.fillStyle = '#000'; m.font = c.font; m.textAlign = 'center'; m.textBaseline = 'middle'; (c.lines || [c.str]).forEach((l, i) => m.fillText(l, c.x, c.y + i * (c.lh || 0))); m.restore(); }
  const P = document.createElement('canvas'); P.width = cw; P.height = ch; const p = P.getContext('2d'); p.scale(SS, SS); p.translate(ox, oy);
  p.fillStyle = spec.dye; p.fillRect(-ox, -oy, w, h);
  if (spec.dye2) { const gr = p.createLinearGradient(0, -oy, 0, h - oy); gr.addColorStop(0, spec.dye); gr.addColorStop(1, spec.dye2); p.fillStyle = gr; p.fillRect(-ox, -oy, w, h); }
  p.save(); p.globalCompositeOperation = 'multiply'; p.globalAlpha = .9; p.fillStyle = hideTex(); p.fillRect(-ox, -oy, w, h); p.restore();
  p.lineJoin = 'round'; p.strokeStyle = spec.ink || 'rgba(40,20,10,.85)'; p.lineWidth = spec.lw ?? 2.2; p.beginPath(); spec.path(p); p.stroke();
  p.lineWidth = 1.5; p.save(); p.beginPath(); spec.path(p); p.clip(); for (const hb of holes) { p.beginPath(); hb(p); p.stroke(); } p.restore();
  if (spec.detail) spec.detail(p);
  p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'destination-in'; p.drawImage(M, 0, 0);
  return { cv: P, ox: ox * SS, oy: oy * SS, s: SS };
}
// ---- path helpers (each returns a builder that adds subpaths) ----
export const poly = pts => g => { pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
export const blob = pts => g => { const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = mid(pts[n - 1], pts[0]); g.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); } g.closePath(); };
export const circ = (x, y, r) => g => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); };
export const ellp = (x, y, rx, ry, rot = 0) => g => { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, rot, 0, TAU); };
export const rectp = (x, y, w, h) => g => { g.rect(x, y, w, h); };
export const all = (...bs) => g => { for (const b of bs) b(g); };
// cut vocabulary
export function diamonds(x0, y0, x1, y1, s) { const out = []; for (let y = y0; y < y1; y += s) for (let x = x0 + ((Math.round((y - y0) / s) % 2) * s / 2); x < x1; x += s) out.push(poly([[x, y - s * .32], [x + s * .3, y], [x, y + s * .32], [x - s * .3, y]])); return out; }
export function coins(x0, y0, x1, y1, s) { const out = []; for (let y = y0; y < y1; y += s) for (let x = x0; x < x1; x += s) out.push(circ(x, y, s * .26)); return out; }
export function crescents(x0, y0, x1, y1, s) { const out = []; for (let y = y0; y < y1; y += s * .8) for (let x = x0 + ((Math.round((y - y0) / (s * .8)) % 2) * s / 2); x < x1; x += s) out.push(g => { g.moveTo(x - s * .32, y); g.quadraticCurveTo(x, y + s * .44, x + s * .32, y); g.quadraticCurveTo(x, y + s * .16, x - s * .32, y); }); return out; }
export const slit = (x, y0, y1, w) => poly([[x - w / 2, y0], [x + w / 2, y0], [x + w * .12, y1], [x - w * .12, y1]]);
export function lattice(x0, y0, x1, y1, s) { const out = []; for (let y = y0; y < y1; y += s) for (let x = x0; x < x1; x += s) out.push(rectp(x + s * .12, y + s * .12, s * .76, s * .76)); return out; }
export function scrollRow(x0, x1, y, s) { const out = []; for (let x = x0; x < x1; x += s) out.push(ellp(x + s / 2, y, s * .3, s * .22)); return out; }
