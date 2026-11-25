// Tenet, printed: a risograph film. Three plates (blue, sunflower, pink) drawn as densities, printed by riso.js.
// Overprint is the shader's multiply: where two plates meet, the inks mix. Knockouts are zero ink on a plate.
import { makeRiso } from './riso.js';

const W = 1920, H = 1080, FPS = 24;
const out = document.getElementById('c');
const print = makeRiso(out, W, H);
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const CB = mk(), CS = mk(), CK = mk(), SEP = mk();
const PL = { B: CB.getContext('2d', { willReadFrequently: true }), S: CS.getContext('2d', { willReadFrequently: true }), K: CK.getContext('2d', { willReadFrequently: true }) };
const SC = SEP.getContext('2d');
const CH = { B: 0, S: 1, K: 2 };                   // channels in riso.js: R = blue, G = sunflower, B = pink
const INKS = [[0, 120, 191], [255, 181, 17], [255, 72, 176]];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, d) => clamp((t - a) / Math.max(1e-6, d));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- the narration's timing (every shot is keyed to a line)
let S = [], D = [], LINES = [];
const Lt = (i, f) => S[i - 1] + f * (D[i - 1] + 0.3);
const LEND = i => S[i - 1] + D[i - 1] + 0.3;
// plate schedule: arrival (roller sweep) and lift (the plate leaves the machine)
const ARR = {};
const setArrivals = () => {
  ARR.B = { t0: 0, d: 1.0, off: LEND(15) + 0.1 };     // blue and pink lift after the last line: only the sunflower trinket remains
  ARR.K = { t0: Lt(2, 0.2), d: 1.1, off: LEND(15) + 0.1 };
  ARR.S = { t0: Lt(2, 0.6), d: 0.9, off: 1e9 };
};
const gate = p => { const a = ARR[p]; return (T >= a.t0 && T < a.off) ? 1 : 0; };
const sweep = p => { const a = ARR[p]; const u = (T - a.t0) / a.d; return u >= 1 ? 1e5 : -200 + (W + 400) * Math.max(0, u); };
let T = 0;   // the time being drawn

// ---------------------------------------------------------------- drawing on a plate: density = alpha
const fillD = (p, d) => `rgba(0,0,0,${clamp(d)})`;       // a tint: halftone by the shader
const K_OUT = 'destination-out';
function onPlate(p, fn, comp = 'source-over') { const c = PL[p]; c.save(); c.globalCompositeOperation = comp; fn(c); c.restore(); }
function everyPlate(fn, comp) { for (const p of ['B', 'S', 'K']) onPlate(p, c => fn(c, p), comp); }

// a stand-in figure (no likeness): feet at (x, y), about 1.8 units tall at s = 1 (420 px)
function figPath(c, x, y, s, o = {}) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = c.strokeStyle = '#000'; c.lineCap = 'round';
  const st = o.step || 0, r = o.raise || 0;
  c.lineWidth = 36; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 22, -150); c.lineTo(sd * 22 + st * sd * 40, -30); c.stroke(); }
  c.beginPath(); c.moveTo(-58, -330); c.lineTo(58, -330); c.lineTo(44, -150); c.lineTo(-44, -150); c.closePath(); c.fill();
  c.beginPath(); c.arc(0, -388, 38, 0, Math.PI * 2); c.fill();
  c.lineWidth = 28; c.beginPath(); c.moveTo(-50, -310); c.lineTo(-74, -190); c.stroke();
  c.beginPath(); c.moveTo(50, -310); c.lineTo(50 + r * 60, -310 - r * 150 + (1 - r) * 120); c.stroke();
  c.restore();
}
// draw a figure on one plate, with a paper-white halo (zero ink) on the other plates: the knockout that prints a fringe
function fig(p, x, y, s, o = {}) {
  for (const q of ['B', 'S', 'K']) if (q !== p && o.halo !== false) onPlate(q, c => figPath(c, x, y, s * 1.06, o), K_OUT);
  onPlate(p, c => figPath(c, x, y, s, o));
}
function figOut(p, x, y, s, o = {}) { onPlate(p, c => figPath(c, x, y, s, o), K_OUT); }   // knock a figure out of a plate: a paper outline
const rectOn = (p, x, y, w, h, d = 1) => onPlate(p, c => { c.fillStyle = fillD(p, d); c.fillRect(x, y, w, h); });
const polyOn = (p, pts, d = 1) => onPlate(p, c => { c.fillStyle = fillD(p, d); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); });
const ellOn = (p, x, y, rx, ry, d = 1, comp = 'source-over') => onPlate(p, c => { c.fillStyle = fillD(p, d); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }, comp);
const lineOn = (p, pts, w, d = 1, dash = null) => onPlate(p, c => { c.strokeStyle = fillD(p, d); c.lineWidth = w; c.lineCap = 'round'; if (dash) c.setLineDash(dash); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); });
function text(p, s, x, y, font, align = 'center', d = 1, comp = 'source-over') { onPlate(p, c => { c.font = font; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = fillD(p, d); c.fillText(s, x, y); }, comp); }
// subtitles: a paper-white knockout strip on every plate, text on the blue plate (it lifts after the last line)
function subtitle(s) {
  const lines = wrap(s, 58), lh = 56, h = lines.length * lh + 36, x = 60, y = H - 70 - h;
  for (const p of ['B', 'S', 'K']) onPlate(p, c => c.clearRect(x, y, 1180, h));
  lines.forEach((ln, i) => text('B', ln, x + 26, y + 30 + lh * 0.75 + i * lh, '500 42px Jost', 'left', 1));
}
function wrap(s, n) { const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }

// ---------------------------------------------------------------- the film, shot by shot (see TREATMENT.md)
const GROUND = 880;
function paint() {
  // section 1: opening knockout: a full blue field, the opera house cut out of it; the pink plate fills it later
  if (T < 4.8) {
    rectOn('B', 0, 0, W, H, 1);
    const op = c => { c.fillStyle = '#000'; c.fillRect(470, 260, 980, 180); c.fillRect(540, 180, 840, 100); c.fillRect(420, 440, 1080, 60);
      for (let i = 0; i < 9; i++) c.fillRect(470 + i * 115, 500, 46, 380); c.fillRect(420, 878, 1080, 22); c.fillRect(860, 60, 200, 130); };
    onPlate('B', op, K_OUT);
    text('B', 'WHAT IF TIME ITSELF', 960, 120, '800 98px Bricolage', 'center', 1);
    text('B', 'WAS THE WEAPON?', 960, 232, '800 98px Bricolage', 'center', 1, K_OUT);
  }
  if (T < 4.8 && T >= Lt(2, 0.2)) {   // the pink plate's double hit on the title, a few pixels off
    text('K', 'WHAT IF TIME ITSELF', 968, 126, '800 98px Bricolage', 'center', 1);
  }
  if (T >= 4.8 && T < Lt(2, 0.5)) { text('B', 'WHAT IF TIME ITSELF WAS THE WEAPON?', 960, 150, '800 74px Bricolage', 'center', 1); }
  // the opera house: the pink plate fills the knockout (roller sweep); the masked soldier and his trinket
  if (T >= 4.8) polyOn('B', [[0, GROUND], [W, GROUND], [W, H], [0, H]], .42);   // the ground, a 42 % halftone band
  if (T >= Lt(2, 0.1)) {   // the pink plate fills the opera-house knockout
    const op = c => { c.fillStyle = '#000'; c.fillRect(470, 260, 980, 180); c.fillRect(540, 180, 840, 100); c.fillRect(420, 440, 1080, 60); for (let i = 0; i < 9; i++) c.fillRect(470 + i * 115, 500, 46, 380); c.fillRect(420, 878, 1080, 22); c.fillRect(860, 60, 200, 130); };
    onPlate('K', op, 'source-over');
  }
  // the masked soldier, the trinket and the backward bullet
  if (T >= Lt(2, 0.2)) fig('B', 1110, GROUND, 0.95, { raise: 1 });
  if (T >= Lt(2, 0.6)) ellOn('S', 1110 + 100 * .95, GROUND - 430, 16, 16, 1);       // the orange trinket: sunflower
  if (T >= Lt(2, 0.72) && T < Lt(2, 0.97)) { const u = ss(seg(T, Lt(2, 0.72), Lt(2, 0.25))); const x = lerp(760, 1040, u); ellOn('K', x, 660, 26, 9, 1); }   // the bullet, flying backward
  // section 1 (cont.): the loyalty test (a lever) and the agent steps out of the blank field
  if (T >= Lt(3, 0.15)) { rectOn('B', 380, GROUND - 40, 260, 40, 1); lineOn('B', [[600, GROUND - 40], [600, GROUND - 170]], 16, 1); lineOn('B', [[600, GROUND - 170], [660, GROUND - 230]], 14, 1); }
  if (T >= Lt(3, 0.5)) fig('B', 720, GROUND, 0.95, { step: .25 });
  if (T >= Lt(3, 0.2) && T < Lt(3, 0.8)) text('B', 'LOYALTY TEST', 510, GROUND + 90, '600 40px Jost', 'center', 1);
  // section 2: inversion: a stone in halftone whose dots shrink; the vault of inverted gold; the nine rings of the Algorithm
  if (T >= Lt(4, 0.1)) { const d = 0.9 * (1 - ss(seg(T, Lt(4, 0.1), Lt(4, 0.9)))); ellOn('K', 380, 720, 150, 150, d); }
  if (T >= Lt(4, 0.5)) text('B', 'ENTROPY, REVERSED', 380, 930, '600 40px Jost', 'center', 1);
  if (T >= Lt(5, 0.1)) { rectOn('K', 1200, 920, 500, 110, .45); rectOn('K', 1290, 960, 110, 60, 1); rectOn('K', 1450, 960, 110, 60, 1); rectOn('K', 1610, 960, 80, 60, 1); }
  if (T >= Lt(5, 0.2)) { for (let i = 0; i < 5; i++) if (T >= Lt(5, 0.45) + i * .12) lineOn('B', [[1260 + i * 80, 1080], [1260 + i * 80, 1030]], 10, 1); }
  if (T >= Lt(5, 0.1)) fig('B', 1450, GROUND, 0.7, { step: .1 });
  if (T >= Lt(6, 0.0)) rectOn('K', 500, 420, 920, 660, .3);   // the field behind the rings: pink tint, so the sunflower overprints it
  for (let i = 0; i < 9 && T < Lt(13, 0.2); i++) {
    const t0 = Lt(6, 0.05 + i * 0.07);
    if (T < t0) break;
    const r = 60 + i * 44, k = ss(seg(T, t0, 0.5));
    ellOn('S', 960, 560, r * k, r * k, 1, 'source-over');
    onPlate('S', c => { c.globalCompositeOperation = K_OUT; c.beginPath(); c.arc(960, 560, r * k - 16, 0, Math.PI * 2); c.fill(); });
  }
  if (T >= Lt(6, 0.3) && T < Lt(6, 0.98)) text('B', 'THE ALGORITHM · 9 PARTS', 960, 1070, '600 40px Jost', 'center', 1);
  if (T >= Lt(7, 0.1)) fig('B', 420, GROUND, 0.92, { step: .2 });
  if (T >= Lt(7, 0.3)) fig('B', 1640, GROUND, 0.9, { step: -.1 });
  // section 3: the freeport and the falling aircraft; the highway in halftone; the inverted bullet at Kat; the turnstile; the yacht
  if (T >= Lt(8, 0.0)) rectOn('K', 1280, 560, 520, 320, 1);
  if (T >= Lt(8, 0.1)) { const u = ss(seg(T, Lt(8, 0.1), Lt(8, 0.8))); const x = lerp(1960, 1500, u), y = lerp(180, 600, u); onPlate('B', c => { c.fillStyle = '#000'; c.save(); c.translate(x, y); c.beginPath(); c.ellipse(0, 0, 150, 30, 0, 0, Math.PI * 2); c.fill(); c.fillRect(-30, -90, 60, 180); c.restore(); }); }
  if (T >= Lt(9, 0.0)) { rectOn('B', 0, 900, W, 80, .2); rectOn('B', 0, 980, W, 40, .4); rectOn('B', 0, 1020, W, 60, .6); }
  if (T >= Lt(9, 0.05)) { for (let i = 0; i < 3; i++) { const x = ((T - Lt(9, 0.05)) * 110 + i * 620) % (W + 300) - 150; rectOn('B', x, 910, 130, 58, 1); } }
  if (T >= Lt(9, 0.05)) { const x = W - (((T - Lt(9, 0.05)) * 100 + 300) % (W + 300)) + 150; rectOn('K', x, 960, 130, 58, 1); }   // the reversed car
  if (T >= Lt(9, 0.0)) { fig('B', 300, GROUND, 0.9, { raise: .4 }); fig('B', 900, GROUND, 0.9); }
  if (T >= Lt(9, 0.55) && T < Lt(9, 0.9)) { const u = ss(seg(T, Lt(9, 0.55), Lt(9, 0.35))); const x = lerp(860, 380, u); ellOn('K', x, 620, 24, 9, 1); }   // the inverted bullet, from Kat back toward Sator
  if (T >= Lt(9, 0.82)) figOut('B', 900, GROUND, 0.9, {});                                      // Kat: her blue plate lifts; a paper outline
  if (T >= Lt(10, 0.0)) { lineOn('B', [[1300, GROUND], [1300, GROUND - 180]], 14, 1); for (let k = 0; k < 3; k++) { const a = k * 2.094; lineOn('B', [[1300, GROUND - 130], [1300 + Math.cos(a) * 60, GROUND - 130 + Math.sin(a) * 60]], 9, 1); } }
  if (T >= Lt(10, 0.1)) { const u = ss(seg(T, Lt(10, 0.1), Lt(10, 0.75))); const x = lerp(1120, 1500, u); fig('B', x, GROUND, .7, { step: .1 }); fig('B', x - 110, GROUND, .7, { step: -.1 }); }
  if (T >= Lt(10, 0.5)) { const u = ss(seg(T, Lt(10, 0.5), Lt(10, 0.5))); const x = lerp(1400, 1460, u); fig('K', x, GROUND, .7, { step: .1 }); }   // inverted, once past the gate
  if (T >= Lt(11, 0.05)) { polyOn('B', [[1500, GROUND - 40], [1820, GROUND - 40], [1780, GROUND + 10], [1550, GROUND + 10]], 1); rectOn('B', 1640, GROUND - 200, 60, 150, 1); }
  // section 4: the Stalsk-12 dome in a pink-and-blue ground; the pincer from both sides; the Algorithm lifted out; the trinket
  if (T >= Lt(11, 0.3)) { onPlate('B', c => { c.fillStyle = '#000'; c.beginPath(); c.arc(300, GROUND, 280, Math.PI, 0); c.fill(); }); }
  if (T >= Lt(11, 0.2)) polyOn('K', [[0, GROUND], [W, GROUND], [W, H], [0, H]], .28);
  if (T >= Lt(11, 0.4)) lineOn('S', [[1640, 760], [340, 640]], 6, 1, [16, 12]);       // the dead-man's switch
  if (T >= Lt(12, 0.1)) {
    const u = ss(seg(T, Lt(12, 0.1), Lt(12, 0.85)));
    for (let i = 0; i < 3; i++) fig('B', lerp(-160, 660, u) - i * 80, GROUND, .8, { step: .3 });
    for (let i = 0; i < 3; i++) fig('K', lerp(2080, 760, u) + i * 80, GROUND, .8, { step: -.3 });
  }
  if (T >= Lt(13, 0.2) && T < Lt(13, 0.5)) {                                              // the Algorithm pulled from the dome, rising
    const u = ss(seg(T, Lt(13, 0.2), Lt(13, 0.3)));
    for (let i = 0; i < 9; i++) { const r = 60 + i * 44; onPlate('S', c => { c.globalCompositeOperation = 'source-over'; c.strokeStyle = fillD('S', 1); c.lineWidth = 14; c.beginPath(); c.arc(960, 560 - u * 380, r, 0, Math.PI * 2); c.stroke(); }); }
  }
  if (T >= Lt(13, 0.3) && T < Lt(14, 0)) { for (let i = 0; i < 9; i++) { const r = 60 + i * 44, yy = 180; onPlate('S', c => { c.strokeStyle = fillD('S', 1); c.lineWidth = 14; c.beginPath(); c.arc(960, yy, r, 0, Math.PI * 2); c.stroke(); }); } }
  if (T >= Lt(13, 0.2)) figOut('B', 1640, GROUND, .9, {});                                 // Sator's yacht: the blue plate lifts (implied, no violence)
  if (T >= Lt(13, 0.75) && T < Lt(13, 0.9)) { const u = ss(seg(T, Lt(13, 0.75), Lt(13, 0.15))); fig('K', 800, GROUND + 60 * u, .9, { raise: 0, step: 0 }); }
  if (T >= Lt(13, 0.9)) figOut('K', 800, GROUND + 60, .9, {});                              // the inverted soldier: a paper outline
  // the trinket on Neil's bag (sunflower), then the plates lift: only the trinket is left
  if (T >= Lt(14, 0.0)) rectOn('B', 380, GROUND - 130, 150, 130, 1);
  if (T >= Lt(14, 0.2)) ellOn('S', 455, GROUND - 146, 18, 18, 1);
  if (T >= Lt(15, 0.2)) text('S', 'THE FOUNDER', 960, 230, '800 110px Bricolage', 'center', 1);
}

// ---------------------------------------------------------------- the frame: plates -> separation -> print
function frame(t) {
  T = t;
  for (const p of ['B', 'S', 'K']) PL[p].clearRect(0, 0, W, H);
  paint();
  // subtitles: the line being spoken
  for (let i = 0; i < LINES.length; i++) if (t >= S[i] - 0.1 && t < S[i] + D[i] + 0.25) { subtitle(LINES[i].text0 || LINES[i].text); break; }
  // merge the three plates into one RGB separation: R = blue density, G = sunflower, B = pink
  const bB = PL.B.getImageData(0, 0, W, H).data, bS = PL.S.getImageData(0, 0, W, H).data, bK = PL.K.getImageData(0, 0, W, H).data;
  const sep = SC.createImageData(W, H), d = sep.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = bB[i + 3]; d[i + 1] = bS[i + 3]; d[i + 2] = bK[i + 3]; d[i + 3] = 255; }
  SC.putImageData(sep, 0, 0);
  const f = Math.round(t * FPS);
  print(SEP, {
    gate: [gate('B'), gate('S'), gate('K')],
    sweep: [sweep('B'), sweep('S'), sweep('K')],
    off: [[0, 0], [3, -2], [-3, 2]], rot: [0, 0, 0],
    seed: Math.floor(t * 12), sheet: 7, boil: .35, grain: 1, period: 7,
    inks: INKS,
  });
}
window.DUR = 0; window.READY = false;
(async () => {
  await Promise.all(['400 40px Jost', '500 40px Jost', '600 40px Jost', '700 40px Jost', '800 40px Bricolage', '600 40px Bricolage'].map(f => document.fonts.load(f)));
  LINES = await (await fetch('lines.json')).json();
  const dur = await (await fetch('voices/dur.json')).json();
  let t = 0.35; for (const l of LINES) { S.push(t); D.push(dur[l.id]); t += dur[l.id] + 0.3; }
  window.DUR = LEND(15) + 2.2;     // the sunflower-only hold
  setArrivals();
  window.render = t => frame(t);
  window.READY = true;
})();
