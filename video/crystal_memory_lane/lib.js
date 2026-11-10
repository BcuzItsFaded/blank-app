// Pixel-art engine: draw on a 180x320 canvas, upscale 6x with nearest-neighbour.
const C = document.getElementById('c'), X0 = C.getContext('2d');
const PW = 180, PH = 320, pc = document.createElement('canvas'); pc.width = PW; pc.height = PH; const P = pc.getContext('2d');
const R = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, eo = t => (t = clamp(t), 1 - Math.pow(1 - t, 3)), prog = (t, a, b) => clamp((t - a) / (b - a)), PI = Math.PI;
const DK = '#181830', WH = '#f8f8f8';
let TX = { ox: 0, oy: 0, k: 1, f: 1 };
function at(ox, oy, k, f, fn) { const o = TX; TX = { ox: Math.round(ox), oy: Math.round(oy), k, f }; fn(); TX = o; }
function r_(x, y, w, h, c) { P.fillStyle = c; let x1 = TX.ox + TX.f * x * TX.k; const w1 = w * TX.k; if (TX.f < 0) x1 -= w1; P.fillRect(Math.round(x1), Math.round(TX.oy + y * TX.k), Math.max(1, Math.round(w1)), Math.max(1, Math.round(h * TX.k))); }
function e_(cx, cy, rx, ry, c) { for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.3)))); r_(cx - w, cy + dy, 2 * w + 1, 1, c); } }
function eo_(cx, cy, rx, ry, c, o = DK) { e_(cx, cy, rx + 1, ry + 1, o); e_(cx, cy, rx, ry, c); }
function ro_(x, y, w, h, c, o = DK) { r_(x - 1, y - 1, w + 2, h + 2, o); r_(x, y, w, h, c); }
const GL = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010', ',': '000000000010100', "'": '010010000000000', '-': '000000111000000', ':': '000010000010000', '/': '001001010100100', '&': '010101010101011', '+': '000010111010000' };
function ptw(s, sc = 1) { return s.length * 4 * sc - sc; }
function pt(s, x, y, sc, c, o = {}) { s = String(s).toUpperCase(); let x0 = Math.round(o.al === 'c' ? x - ptw(s, sc) / 2 : o.al === 'r' ? x - ptw(s, sc) : x); y = Math.round(y);
  const draw = (dx, dy, col) => { P.fillStyle = col; for (let i = 0; i < s.length; i++) { const g = GL[s[i]]; if (!g) continue; for (let k = 0; k < 15; k++) if (g[k] === '1') P.fillRect(x0 + dx + i * 4 * sc + (k % 3) * sc, y + dy + Math.floor(k / 3) * sc, sc, sc); } };
  if (o.sh) { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) draw(dx * (o.shw || 1), dy * (o.shw || 1), o.sh); } draw(0, 0, c); }
function box(x, y, w, h) { P.fillStyle = DK; P.fillRect(x, y, w, h); P.fillStyle = WH; P.fillRect(x + 1, y + 1, w - 2, h - 2); P.fillStyle = '#5878c8'; P.fillRect(x + 2, y + 2, w - 4, h - 4); P.fillStyle = WH; P.fillRect(x + 3, y + 3, w - 6, h - 6); }
function fill(c) { P.fillStyle = c; P.fillRect(0, 0, PW, PH); }
function grad(y0, y1, cols) { const n = cols.length, hh = (y1 - y0) / n; for (let i = 0; i < n; i++) { P.fillStyle = cols[i]; P.fillRect(0, Math.round(y0 + i * hh), PW, Math.ceil(hh)); } }
function spark(x, y, s, c = WH) { P.fillStyle = c; x = Math.round(x); y = Math.round(y); P.fillRect(x - s, y, 2 * s + 1, 1); P.fillRect(x, y - s, 1, 2 * s + 1); if (s > 1) P.fillRect(x - 1, y - 1, 3, 3); }
// ---- sprites (origin = feet centre) ----
function girl(t, o = {}) { const w = o.walk ? Math.floor(t * 8) % 4 : 0, bob = o.walk && w % 2 ? -1 : 0, BL = '#4878d8', SK = '#f8d0a8', back = o.back;
  e_(0, 0, 6, 1, 'rgba(0,0,0,0.3)');
  r_(-9, -18 + bob, 3, 8, DK); r_(6, -18 + bob, 3, 8, DK); r_(-8, -17 + bob, 2, 6 + (Math.floor(t * 4) % 2), BL); r_(6, -17 + bob, 2, 6 + (Math.floor(t * 4 + 1) % 2), BL);
  r_(-6, -24 + bob, 12, 14, DK); r_(-5, -20 + bob, 10, 9, back ? BL : SK); r_(-5, -23 + bob, 10, 4, WH); r_(-5, -20 + bob, 10, 1, '#d83030'); if (!back) { r_(-5, -19 + bob, 2, 3, BL); r_(3, -19 + bob, 2, 3, BL); const bl = Math.floor(t * 0.7) % 5 === 4; r_(-3, -16 + bob, 1, bl ? 1 : 2, DK); r_(2, -16 + bob, 1, bl ? 1 : 2, DK); if (o.smile) r_(-1, -13 + bob, 2, 1, '#c03028'); } else r_(-2, -23 + bob, 4, 2, '#d83030');
  r_(-7, -11 + bob, 14, 7, DK); r_(-5, -11 + bob, 10, 6, '#d83030'); r_(-6, -11 + bob, 2, 5, WH); r_(4, -11 + bob, 2, 5, WH); const sw = o.walk ? (w === 1 ? 1 : w === 3 ? -1 : 0) : 0; r_(-7, -10 + bob + sw, 1, 4, SK); r_(6, -10 + bob - sw, 1, 4, SK); if (o.cheer) { r_(-8, -16, 2, 6, SK); r_(6, -16, 2, 6, SK); }
  r_(-4, -5 + bob, 8, 2, '#f8d030'); r_(-4, -3, 3, w === 1 ? 2 : 3, SK); r_(1, -3, 3, w === 3 ? 2 : 3, SK); r_(-4, w === 1 ? -2 : -1, 3, 1, DK); r_(1, w === 3 ? -2 : -1, 3, 1, DK); }
function beast(t, o = {}) { const run = o.run, ph = t * 12, a = run ? Math.round(Math.sin(ph) * 4) : 0, b2 = run ? Math.round(Math.cos(ph) * 4) : 0, hop = run ? -Math.abs(Math.round(Math.sin(ph) * 2)) : Math.round(Math.sin(t * 3) * 0.6), BL = '#58b8e8', B2 = '#3888c0', PU = '#9858c8';
  e_(0, 0, 14, 1, 'rgba(0,0,0,0.3)');
  for (let i = 0; i < 12; i++) { const y1 = -17 + hop + Math.round(Math.sin(t * 7 + i * 0.7) * (1 + i * 0.25)), y2 = -11 + hop + Math.round(Math.sin(t * 7 + i * 0.7 + 2) * (1 + i * 0.25)); r_(-14 - i * 3, y1 - 1, 4, 4, DK); r_(-14 - i * 3, y2 - 1, 4, 4, DK); }
  for (let i = 0; i < 12; i++) { const y1 = -17 + hop + Math.round(Math.sin(t * 7 + i * 0.7) * (1 + i * 0.25)), y2 = -11 + hop + Math.round(Math.sin(t * 7 + i * 0.7 + 2) * (1 + i * 0.25)); r_(-14 - i * 3, y1, 3, 2, WH); r_(-14 - i * 3, y2, 3, 2, WH); }
  for (let i = 6; i >= 0; i--) eo_(8 - i * 5, -27 + hop + Math.round(Math.sin(t * 6 + i * 0.8) * 2) + (i > 3 ? 2 : 0), 5, 4, i % 2 ? PU : '#b070e0');
  for (const [x, d] of [[-11, a], [-6, -a], [7, b2], [12, -b2]]) { ro_(x + Math.round(d * 0.8), -8 + hop, 3, 8 - hop - Math.abs(Math.round(d * 0.3)), B2); r_(x + Math.round(d * 0.8), -2 - Math.abs(Math.round(d * 0.3)), 3, 2, WH); }
  eo_(0, -14 + hop, 14, 7, BL); e_(1, -10 + hop, 10, 3, WH); for (const [x, y] of [[-7, -17], [-1, -19], [5, -16], [-4, -13]]) { r_(x, y + hop, 3, 1, WH); r_(x + 1, y - 1 + hop, 1, 3, WH); }
  eo_(15, -22 + hop, 6, 5, BL); ro_(18, -22 + hop, 6, 4, WH); r_(23, -22 + hop, 1, 1, DK); r_(15, -24 + hop, 2, 2, '#c03028'); r_(15, -25 + hop, 3, 1, DK);
  r_(9, -37 + hop, 9, 2, DK); r_(7, -35 + hop, 13, 6, DK); r_(10, -29 + hop, 7, 2, DK); r_(10, -36 + hop, 7, 1, '#b8f8f8'); r_(8, -34 + hop, 11, 4, '#70e0f8'); r_(11, -30 + hop, 5, 2, '#48b8e0'); r_(10, -34 + hop, 2, 2, WH); }
function firemon(t, o = {}) { const sq = o.sq || 0, hop = o.hop || 0; const fl = Math.floor(t * 10);
  e_(0, 0, 12, 2, 'rgba(0,0,0,0.25)');
  for (let i = 0; i < 6; i++) { const hh = 6 + ((fl + i * 3) % 5) * 2; r_(-12 + i * 3 - 1, -16 - hh - hop - 1, 5, hh + 2, DK); } for (let i = 0; i < 6; i++) { const hh = 6 + ((fl + i * 3) % 5) * 2; r_(-12 + i * 3, -16 - hh - hop, 3, hh, i % 2 ? '#f8a030' : '#e84020'); r_(-12 + i * 3 + 1, -16 - hh / 2 - hop, 1, hh / 2, '#f8e060'); }
  ro_(-6, -3, 4, 3, '#f0dc9a'); ro_(4, -3, 4, 3, '#f0dc9a');
  eo_(0, -11 - hop + sq, 10 + sq, 9 - sq, '#f0dc9a'); e_(-3, -14 - hop + sq, 8 + sq, 6 - sq, '#305878'); e_(-4, -16 - hop + sq, 6, 4, '#406890');
  eo_(11, -15 - hop + sq, 6, 4, '#f0dc9a'); ro_(15, -15 - hop + sq, 6, 3, '#f0dc9a'); e_(7, -19 - hop + sq, 5, 3, '#305878'); r_(10, -16 - hop + sq, 4, 1, DK); if (o.open) r_(16, -12 - hop + sq, 4, 2, '#c03028'); }
function ballS(t, o = {}) { const rot = o.tilt || 0; eo_(rot, -5, 5, 5, WH); for (let dy = -5; dy <= -1; dy++) { const w = Math.round(5 * Math.sqrt(1 - (dy * dy) / 25.3)); r_(rot - w, -5 + dy, 2 * w + 1, 1, '#e83030'); } r_(rot - 5, -5, 11, 1, DK); ro_(rot - 1, -6, 2, 2, WH); }
function tree(x, y) { at(x, y, 1, 1, () => { ro_(-2, -6, 4, 6, '#785028'); eo_(0, -14, 8, 7, '#287838'); e_(-2, -16, 5, 4, '#38a048'); e_(3, -12, 3, 2, '#1c5828'); }); }
function tileGround(sy, t, o = {}) { // top-down tiles scrolling by sy
  P.fillStyle = '#78c850'; P.fillRect(0, 0, PW, PH); const off = ((sy % 16) + 16) % 16, row0 = Math.floor(sy / 16);
  for (let r = -1; r < 22; r++) { const wr = r - row0, y = r * 16 + off; for (let c = 0; c < 12; c++) { const x = c * 16 - 6, h = R(wr * 31 + c * 7);
      if (c >= 4 && c <= 6) { P.fillStyle = '#e8d098'; P.fillRect(x, y, 16, 16); if (h > 0.7) { P.fillStyle = '#c8a868'; P.fillRect(x + 4 + Math.floor(h * 8), y + 6, 2, 1); } }
      else if ((c === 3 || c === 7) && R(wr * 3 + c) > 0.25 || (c === 2 || c === 8) && R(wr * 5 + c) > 0.55) { const s = Math.floor(t * 4 + c + wr) % 2; P.fillStyle = '#48a038'; P.fillRect(x, y, 16, 16); P.fillStyle = '#287828'; for (let k = 0; k < 4; k++) { P.fillRect(x + 1 + k * 4 + s, y + 2, 2, 5); P.fillRect(x + 3 + k * 4 - s, y + 9, 2, 5); } }
      else { P.fillStyle = '#58b040'; if (h > 0.5) P.fillRect(x + 3, y + 4, 2, 1); if (h > 0.75) P.fillRect(x + 10, y + 11, 2, 1); if (h > 0.9) { const f2 = Math.floor(t * 3 + c) % 2; P.fillStyle = '#f85888'; P.fillRect(x + 6, y + 6 + f2, 3, 3); P.fillStyle = '#f8e060'; P.fillRect(x + 7, y + 7 + f2, 1, 1); } } } }
  for (let r = -2; r < 22; r++) { const wr = r - row0, y = r * 16 + off; if (((wr % 2) + 2) % 2 === 0) { tree(8, y + 16); tree(172, y + 16); } else { tree(22, y + 16); tree(158, y + 16); } } }
function battleBG(t) { grad(0, 150, ['#b8e0f8', '#c8e8f8', '#d8f0f8', '#e8f8f8']); grad(150, 262, ['#a8e088', '#98d878', '#88d068', '#78c858']); for (let i = 0; i < 4; i++) { const x = ((i * 60 + t * 6) % 240) - 30; P.fillStyle = WH; P.fillRect(Math.round(x), 60 + i * 9, 26, 5); P.fillRect(Math.round(x) + 5, 57 + i * 9, 14, 3); }
  at(128, 124, 1, 1, () => { e_(0, 0, 34, 6, '#68a850'); e_(0, -1, 32, 5, '#b8e890'); }); at(48, 232, 1, 1, () => { e_(0, 0, 40, 7, '#68a850'); e_(0, -1, 38, 6, '#b8e890'); }); }
function hpBar(x, y, name, lv, hp) { box(x, y, 84, 26); pt(name, x + 6, y + 5, 1, DK); pt(':L' + lv, x + 78, y + 5, 1, DK, { al: 'r' }); pt('HP', x + 6, y + 15, 1, '#e8a020'); P.fillStyle = DK; P.fillRect(x + 16, y + 14, 62, 6); P.fillStyle = '#404858'; P.fillRect(x + 17, y + 15, 60, 4); P.fillStyle = hp > 0.5 ? '#40c858' : hp > 0.2 ? '#f0c030' : '#e83830'; P.fillRect(x + 17, y + 15, Math.max(1, Math.round(60 * hp)), 4); }
