// La Planchada as a paper pop-up book on a desk: cut-paper cards with white borders pop up from the page. Pure function of t.
const cv = document.getElementById('c'), W = 1080, H = 1920;
window.DUR = 62.4;
const VO = [
  ['v01', 0.35, 7.603, "In hospitals across Mexico, patients tell stories of a mysterious nurse who appears at night… but doesn't belong to the living."],
  ['v02', 8.25, 6.783, 'They call her La Planchada. She wears an old-fashioned white uniform, perfectly ironed, without a single wrinkle.'],
  ['v03', 15.34, 6.066, 'According to legend, she was once a dedicated nurse who fell deeply in love with a doctor who betrayed her.'],
  ['v04', 21.7, 7.85, 'Some versions say she died heartbroken. Others claim she neglected her patients before dying, leaving her spirit unable to rest.'],
  ['v05', 29.85, 6.556, 'Patients have claimed a strange nurse appeared beside their beds, checked their medicine, and comforted them through the night.'],
  ['v06', 36.71, 6.112, 'But when those patients thanked the hospital staff the next morning, nobody recognized the nurse they described.'],
  ['v07', 43.12, 7.036, 'According to the stories, some patients later discovered that the woman who cared for them had supposedly died years earlier.'],
  ['v08', 50.46, 8.165, "And here's the chilling legend: La Planchada doesn't haunt hospitals to hurt people. She returns because she never stopped caring for her patients."],
];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a)), ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3), back = t => { t = clamp(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const TAU = Math.PI * 2, INK = '#3b2418';
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const noise = x => { const i = Math.floor(x), f = x - i, h = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }; const u = f * f * (3 - 2 * f); return lerp(h(i), h(i + 1), u); };

// ---------------------------------------------------------------- cut-paper drawing
function ink(g, pathFn, fill, shade, lw = 5) {
  g.save(); g.beginPath(); pathFn(g); g.lineJoin = 'round'; g.lineCap = 'round';
  if (shade) { g.fillStyle = shade; g.fill(); g.save(); g.clip(); g.translate(-7, -5); g.fillStyle = fill; g.beginPath(); pathFn(g); g.fill(); g.restore(); } else { g.fillStyle = fill; g.fill(); }
  g.lineWidth = lw; g.strokeStyle = INK; g.beginPath(); pathFn(g); g.stroke(); g.restore();
}
const P = pts => g => { pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
const E = (x, y, rx, ry, r = 0) => g => { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, r, 0, TAU); };
const R = (x, y, w, h, r = 8) => g => { g.roundRect(x, y, w, h, r); };
function limb(g, x0, y0, x1, y1, w, col) { g.save(); g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = w + 7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.restore(); }
let GRAINP; function bakeGrain() { const t = mk(96, 96), g = t.getContext('2d'), r = mulberry(4); for (let i = 0; i < 360; i++) { g.fillStyle = `rgba(${r() > .5 ? '255,250,235' : '90,60,30'},${.05 + r() * .08})`; g.fillRect(r() * 96, r() * 96, 1 + r() * 2, 1 + r() * 2); } GRAINP = t; }
// bake a card: art drawn with its base-centre at the origin (x in [-w/2,w/2], y in [-h,0]); white border + grey cardboard edge + grain
function bakeCard(w, h, art, o = {}) {
  const pad = (o.border ?? 13) + 6, cw = w + pad * 2, ch = h + pad * 2, A = mk(cw, ch), a = A.getContext('2d'); a.translate(pad + w / 2, pad + h); art(a);
  const B = mk(cw, ch), b = B.getContext('2d'); for (const r of [(o.border ?? 13) * .45, o.border ?? 13]) for (let k = 0; k < 18; k++) b.drawImage(A, Math.cos(k / 18 * TAU) * r, Math.sin(k / 18 * TAU) * r); b.globalCompositeOperation = 'source-in'; b.fillStyle = '#f7f0de'; b.fillRect(0, 0, cw, ch);
  const Ed = mk(cw, ch), ed = Ed.getContext('2d'); ed.drawImage(B, 0, 4); ed.globalCompositeOperation = 'source-in'; ed.fillStyle = '#8f8a80'; ed.fillRect(0, 0, cw, ch);
  const out = mk(cw, ch), g = out.getContext('2d'); g.drawImage(Ed, 0, 0); g.drawImage(B, 0, 0); g.drawImage(A, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = g.createPattern(GRAINP, 'repeat'); g.fillRect(0, 0, cw, ch);
  return { cv: out, ox: pad + w / 2, oy: pad + h, w, h };
}
// ---------------------------------------------------------------- characters
const CH = {
  nurse: { dress: '#f4f0e6', shade: '#c9c4b6', hair: '#2b2018', cap: true, sleeve: '#7fb7a8' }, ghost: { dress: '#eef6f2', shade: '#bcd5cc', hair: '#2b2018', cap: true, sleeve: '#8fd0c0', ghost: true },
  doc: { dress: '#8fa6c9', shade: '#6a82a8', hair: '#2b2018', coat: true, sleeve: '#d8dfe9' }, woman: { dress: '#3f9d8a', shade: '#2b7868', hair: '#2b2018', hat: '#d9573a', sleeve: '#f2c15a' },
  pj: { dress: '#b9d0e6', shade: '#8aa9c8', hair: '#6a4a38', cap2: '#e4eef6', sleeve: '#b9d0e6' }, matron: { dress: '#9a7fc0', shade: '#7a60a0', hair: '#7a7a82', cap: true, sleeve: '#9a7fc0', wide: 1 },
};
function charArt(kind, pose, face) {
  const c = CH[kind];
  return g => {
    const { leg = 0, aL = .12, aR = .12, lean = 0 } = pose; g.save(); g.rotate(lean);
    if (!c.ghost) for (const s of [-1, 1]) { const sw = leg === 0 ? 0 : (leg === 1 ? s : -s) * 16; limb(g, s * 16, -112, s * 18 + sw, -14, 16, kind === 'pj' ? '#e4eef6' : '#8a6a58'); ink(g, E(s * 18 + sw + 8, -8, 24, 11), '#2b2018', null, 4); }
    const wd = c.wide ? 1.3 : 1;
    const body = c.ghost ? [[-44, -300], [44, -300], [34, -236], [78, -150], [52, -96], [24, -62], [0, -12], [-24, -66], [-56, -92], [-80, -150], [-34, -236]] : c.coat ? [[-50, -300], [50, -300], [58, -110], [-58, -110]] : kind === 'pj' ? [[-44, -300], [44, -300], [52, -120], [-52, -120]] : [[-44 * wd, -300], [44 * wd, -300], [34 * wd, -236], [84 * wd, -104], [-84 * wd, -104], [-34 * wd, -236]];
    for (const s of [-1, 1]) { const a = s < 0 ? aL : aR, sx = s * 42, sy = -286, ex = sx + s * Math.sin(a) * 104, ey = sy + Math.cos(a) * 104; limb(g, sx, sy, ex, ey, 22, c.sleeve); ink(g, E(ex, ey + 4, 14, 14), '#f1d2b8', null, 4); }
    ink(g, P(body), c.dress, c.shade, 5);
    if (kind === 'nurse' || kind === 'ghost') for (const dx of [-30, -15, 0, 15, 30]) { g.save(); g.strokeStyle = 'rgba(59,36,24,.55)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(dx * .6, -228); g.lineTo(dx * (c.ghost ? 1.3 : 2.2), c.ghost ? -90 : -112); g.stroke(); g.restore(); }
    if (c.coat) { g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -300); g.lineTo(0, -110); g.stroke(); ink(g, P([[-12, -300], [0, -270], [12, -300]]), '#22334d', null, 3); }
    ink(g, E(0, -344, 47, 49), '#f1d2b8', '#dcb99c', 5);
    // hair, headgear
    if (c.hair && !c.cap2) ink(g, P([[-50, -340], [-44, -388], [0, -402], [44, -388], [50, -340], [40, -318], [38, -366], [0, -376], [-38, -366], [-40, -318]]), c.hair, null, 4);
    if (c.cap) ink(g, P([[-38, -376], [-26, -418], [28, -418], [40, -376], [0, -386]]), '#ffffff', '#d8d8d8', 4), g.save(), g.strokeStyle = '#c0392b', g.lineWidth = 6, g.beginPath(), g.moveTo(0, -412), g.lineTo(0, -392), g.moveTo(-10, -402), g.lineTo(10, -402), g.stroke(), g.restore();
    if (c.hat) ink(g, P([[-52, -366], [-46, -408], [0, -420], [46, -408], [52, -366], [0, -378]]), c.hat, null, 4);
    if (c.cap2) { ink(g, P([[-50, -352], [-34, -408], [20, -420], [58, -392], [48, -356], [0, -370]]), c.cap2, '#b9cfe0', 4); ink(g, E(60, -396, 12, 12), '#ffffff', null, 3); ink(g, R(-50, -362, 100, 14, 6), '#fff', null, 3); }
    if (c.coat) { ink(g, E(-8, -394, 13, 13), '#c8d0d8', null, 3); ink(g, P([[-24, -322], [-8, -328], [0, -324], [8, -328], [24, -322], [10, -314], [0, -318], [-10, -314]]), '#2b2018', null, 3); }
    // face
    const f = face || 'smile'; g.save(); g.fillStyle = '#2b2018';
    if (f === 'shut') { g.strokeStyle = '#2b2018'; g.lineWidth = 4; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 17, -348, 8, .15 * Math.PI, .85 * Math.PI); g.stroke(); } }
    else if (f === 'wide') { for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * 17, -350, 11, 14, 0, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); g.fillStyle = '#2b2018'; g.beginPath(); g.arc(s * 17, -350, 5, 0, TAU); g.fill(); } }
    else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 17, -348, 6, 8, 0, 0, TAU); g.fill(); }
    g.strokeStyle = '#b5524a'; g.lineWidth = 4.5; g.lineCap = 'round'; g.beginPath();
    if (f === 'smile' || f === 'shut') g.arc(0, -332, 14, .2 * Math.PI, .8 * Math.PI); else if (f === 'sad') g.arc(0, -318, 12, 1.2 * Math.PI, 1.8 * Math.PI); else if (f === 'wide') { g.fillStyle = '#7a2a2a'; g.ellipse(0, -322, 8, 11, 0, 0, TAU); g.fill(); }
    g.stroke(); g.fillStyle = 'rgba(224,110,100,.4)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 30, -332, 9, 6, 0, 0, TAU); g.fill(); } g.restore(); g.restore();
  };
}
const SPR = {};
function chr(kind, pose = 'stand', face = 'smile') {
  const k = kind + '|' + pose + '|' + face; if (SPR[k]) return SPR[k];
  const PS = { stand: {}, walkA: { leg: 1 }, walkB: { leg: 2 }, up: { aL: 2.6, aR: 2.6 }, raiseR: { aR: 2.5 }, point: { aR: 1.55 }, hold: { aR: 2.1, aL: .3 }, reach: { aR: 1.2, aL: .5, lean: .06 }, wave: { aR: 2.2 }, arms: { aL: 1.3, aR: 1.3 } };
  return SPR[k] = bakeCard(260, 440, charArt(kind, PS[pose] || {}, face));
}
// ---------------------------------------------------------------- set pieces
const ART = {
  door: (w, h, col) => g => { ink(g, P([[-w / 2, 0], [-w / 2, -h + w / 2], [0, -h], [w / 2, -h + w / 2], [w / 2, 0]]), col, '#00000022'); ink(g, R(-w * .3, -h * .62, w * .6, h * .26, 6), '#f2c15a', null, 3); ink(g, R(-w * .3, -h * .3, w * .6, h * .26, 6), 'rgba(255,255,255,.2)', null, 3); ink(g, E(w * .32, -h * .35, 6, 6), '#f2c15a', null, 3); },
  doorLit: (w, h) => g => { ink(g, P([[-w / 2, 0], [-w / 2, -h + w / 2], [0, -h], [w / 2, -h + w / 2], [w / 2, 0]]), '#ffe9a0', '#f2c15a'); },
  clock: s => g => { ink(g, R(-s * .14, -s * .3, s * .28, s * .3, 5), '#7a4a32'); ink(g, E(0, -s * .72, s * .5, s * .5), '#f7f0de', '#d8cfb8'); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.save(); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(Math.cos(a) * s * .38, -s * .72 + Math.sin(a) * s * .38); g.lineTo(Math.cos(a) * s * .44, -s * .72 + Math.sin(a) * s * .44); g.stroke(); g.restore(); } limb(g, 0, -s * .72, 0, -s * .72 - s * .34, 5, INK); limb(g, 0, -s * .72, 0, -s * .72 - s * .24, 7, INK); },
  lamp: s => g => { limb(g, 0, 0, 0, -s, 8, '#7a4a32'); ink(g, E(0, -s - 30, 38, 42), '#ffe08a', '#f2a93a'); ink(g, R(-22, -s - 78, 44, 16, 5), '#7a4a32', null, 4); },
  window: (w, h, col) => g => { ink(g, P([[-w / 2, 0], [-w / 2, -h + w / 2], [0, -h], [w / 2, -h + w / 2], [w / 2, 0]]), '#f7f0de'); ink(g, P([[-w / 2 + 14, -14], [-w / 2 + 14, -h + w / 2 + 6], [0, -h + 16], [w / 2 - 14, -h + w / 2 + 6], [w / 2 - 14, -14]]), col, null, 4); g.save(); g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -h + 16); g.lineTo(0, -14); g.moveTo(-w / 2 + 14, -h * .5); g.lineTo(w / 2 - 14, -h * .5); g.stroke(); g.restore(); },
  tree: (s, col) => g => { ink(g, P([[-14, 0], [14, 0], [10, -s * .5], [-10, -s * .5]]), '#7a4a32'); ink(g, E(0, -s * .72, s * .42, s * .46), col, '#00000020'); for (const [x, y] of [[-20, -.8], [26, -.62], [4, -.9]]) { g.save(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x, -s * -(-y), 12, 0, TAU); g.fill(); g.restore(); } },
  arch: (w, h) => g => { ink(g, P([[-w / 2, 0], [-w / 2 + 40, 0], [-w / 2 + 40, -h + 70], [w / 2 - 40, -h + 70], [w / 2 - 40, 0], [w / 2, 0], [w / 2, -h + 50], [0, -h], [-w / 2, -h + 50]]), '#e8a24a', '#c07a2a'); for (let i = 0; i < 9; i++) { const x = lerp(-w / 2 + 50, w / 2 - 50, i / 8); ink(g, E(x, -h + 78 - Math.sin(i / 8 * Math.PI) * 14, 14, 14), '#5aa86a', null, 3); } },
  sun: r => g => { for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ink(g, P([[Math.cos(a - .11) * r, -r + Math.sin(a - .11) * r], [Math.cos(a) * r * 1.38, -r + Math.sin(a) * r * 1.38], [Math.cos(a + .11) * r, -r + Math.sin(a + .11) * r]]), '#f6b73c', null, 3); } ink(g, E(0, -r, r, r), '#ffd35a', '#f6b73c'); ink(g, E(-r * .3, -r * 1.1, 6, 8), INK, null, 1); ink(g, E(r * .3, -r * 1.1, 6, 8), INK, null, 1); },
  moon: r => g => { ink(g, E(0, -r, r, r), '#f7f0de', '#d8cfb8'); for (const [x, y, q] of [[-.3, -.4, .18], [.3, .1, .14]]) { g.save(); g.fillStyle = 'rgba(120,110,90,.3)'; g.beginPath(); g.arc(x * r, -r + y * r, q * r, 0, TAU); g.fill(); g.restore(); } },
  bed: g => { ink(g, R(-190, -150, 16, 150, 6), '#7a4a32'); ink(g, R(176, -110, 16, 110, 6), '#7a4a32'); ink(g, R(-190, -60, 382, 40, 8), '#f7f0de'); ink(g, P([[-110, -70], [-60, -118], [30, -112], [120, -122], [190, -92], [190, -20], [-110, -20]]), '#6f8fc9', '#4f6fa9'); ink(g, R(-186, -104, 74, 34, 12), '#ffffff', '#e0e0e0', 4); for (const x of [-160, 170]) ink(g, E(x, 0, 12, 12), '#3b2418', null, 2); },
  bell: g => { limb(g, 0, 0, 0, -140, 10, '#7a4a32'); ink(g, P([[-44, -140], [-34, -190], [0, -222], [34, -190], [44, -140]]), '#f2c15a', '#d49a2a'); ink(g, E(0, -134, 12, 12), '#7a4a32', null, 3); },
  frame: (w, h) => g => { ink(g, R(-w / 2, -h, w, h, 8), '#c98a3c', '#a06a24'); ink(g, R(-w / 2 + 14, -h + 14, w - 28, h - 28, 4), '#efe3c4', null, 4); },
  desk: g => { ink(g, R(-170, -190, 340, 190, 10), '#8f5a3a', '#6a3e26'); ink(g, R(-190, -216, 380, 34, 8), '#5f3a24'); for (const x of [-100, 0, 100]) ink(g, R(x - 34, -160, 68, 54, 6), '#a86e46', null, 3); },
  heart: s => g => { const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, x = 16 * Math.pow(Math.sin(a), 3) * s / 16, y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * s / 16; pts.push([x, y - s * 1.1]); } ink(g, P(pts), '#e0463a', '#b3281f'); g.save(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(-s * .4, -s * 1.5, 8, 5, -.6, 0, TAU); g.fill(); g.restore(); },
  heartHalf: (s, side) => g => { const pts = []; for (let i = 0; i <= 20; i++) { const a = side > 0 ? i / 20 * Math.PI : Math.PI + i / 20 * Math.PI, x = 16 * Math.pow(Math.sin(a), 3) * s / 16, y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * s / 16; pts.push([x, y - s * 1.1]); } pts.push([0, -s * 1.1 + 10], [side * 6, -s * 1.1 - 8], [0, -s * 1.9]); ink(g, P(pts), '#e0463a', '#b3281f'); },
  q: g => { ink(g, E(0, -60, 54, 54), '#ffffff', '#e0e0e0'); ink(g, P([[-14, -12], [14, -12], [0, 14]]), '#ffffff', null, 4); g.save(); g.fillStyle = INK; g.font = '82px "Lilita One"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, -56); g.restore(); },
  iron: g => { ink(g, P([[-80, 0], [80, 0], [60, -48], [8, -80], [-78, -58]]), '#b6bcc8', '#8a92a2'); ink(g, P([[-34, -78], [-24, -112], [28, -114], [46, -78], [32, -78], [22, -96], [-10, -94], [-18, -78]]), '#3b2418', null, 4); ink(g, E(-18, -42, 6, 8), INK, null, 1); ink(g, E(14, -42, 6, 8), INK, null, 1); g.save(); g.strokeStyle = '#b5524a'; g.lineWidth = 4; g.beginPath(); g.arc(-2, -30, 11, .2 * Math.PI, .8 * Math.PI); g.stroke(); g.restore(); },
  bottle: g => { ink(g, P([[-16, 0], [-20, -34], [-8, -58], [-6, -82], [6, -82], [8, -58], [20, -34], [16, 0]]), '#6bb890', '#3f8f68', 4); ink(g, R(-8, -92, 16, 12, 3), '#3b2418', null, 3); },
  bouquet: g => { limb(g, 0, 0, 0, -60, 6, '#3f8f68'); for (const [x, y, c] of [[-20, -70, '#f2c15a'], [18, -80, '#e0463a'], [0, -98, '#fff'], [-34, -96, '#e87aa0'], [30, -102, '#f2c15a']]) ink(g, E(x, y, 16, 16), c, null, 3); },
  rain: g => { for (let i = 0; i < 24; i++) { const x = (i * 71) % 520 - 260, y = -((i * 113) % 360) - 20; limb(g, x, y, x - 10, y + 34, 5, '#8a9bb0'); } },
  plant: g => { ink(g, P([[-30, 0], [30, 0], [24, -50], [-24, -50]]), '#c0603a'); for (let i = 0; i < 6; i++) ink(g, P([[0, -50], [(i - 2.5) * 34, -150 - (i % 2) * 40], [(i - 2.5) * 34 + 18, -60]]), '#5aa86a', null, 3); },
  checks: g => {},
  ribbon: g => { ink(g, P([[-50, 0], [50, 0], [0, -70]]), '#2b2018', null, 3); },
  chair: g => { ink(g, R(-56, -76, 112, 22, 5), '#a06a42'); ink(g, R(-56, -170, 18, 100, 5), '#a06a42'); for (const x of [-48, 48]) limb(g, x, -54, x, 0, 10, '#7a4a32'); },
};
const CARD = {};
function card(key, w, h, art, o) { return CARD[key] || (CARD[key] = bakeCard(w, h, art, o)); }

// ---------------------------------------------------------------- world: desk, book, pages
let DESK, LAMP;
function bakeDesk() {
  DESK = mk(W, H); const g = DESK.getContext('2d'), r = mulberry(8);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6b4126'); gr.addColorStop(1, '#3e2414'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(30,15,8,.22)'; for (let i = 0; i < 90; i++) { g.lineWidth = .6 + r() * 1.4; g.beginPath(); const y = r() * H; g.moveTo(0, y); g.bezierCurveTo(300, y + (r() - .5) * 30, 700, y + (r() - .5) * 30, W, y + (r() - .5) * 20); g.stroke(); }
  g.save(); g.filter = 'blur(16px)'; ink(g, E(140, 150, 90, 78), '#e8e0cf', '#b9ae98'); ink(g, R(214, 120, 54, 56, 20), '#e8e0cf', null, 8); g.fillStyle = '#3b2418'; g.beginPath(); g.ellipse(140, 120, 70, 22, 0, 0, TAU); g.fill(); for (let i = 0; i < 4; i++) { g.strokeStyle = ['#d9573a', '#f2c15a', '#3f9d8a', '#6f8fc9'][i]; g.lineWidth = 18; g.beginPath(); g.moveTo(830 + i * 40, 90); g.lineTo(880 + i * 34, 260); g.stroke(); } g.restore();
  LAMP = mk(W, H); const l = LAMP.getContext('2d'); const lg = l.createRadialGradient(900, 100, 40, 900, 100, 1300); lg.addColorStop(0, 'rgba(255,214,140,.5)'); lg.addColorStop(.5, 'rgba(255,190,110,.12)'); lg.addColorStop(1, 'rgba(0,0,0,.45)'); l.fillStyle = lg; l.fillRect(0, 0, W, H);
}
const BX = 60, BY = 300, BW = 960, BH = 1330;                                    // the book on the desk
const BASE_Y = 1010, FLOOR_Y1 = 1600;                                            // backboard base / front of the page
function bookFrame(g) {
  g.save(); g.fillStyle = 'rgba(0,0,0,.35)'; g.filter = 'blur(18px)'; g.fillRect(BX + 20, BY + 40, BW, BH); g.filter = 'none';
  g.fillStyle = '#7d2820'; g.beginPath(); g.roundRect(BX - 30, BY - 30, BW + 60, BH + 70, 22); g.fill(); g.strokeStyle = '#d6a64a'; g.lineWidth = 3; g.beginPath(); g.roundRect(BX - 16, BY - 16, BW + 32, BH + 40, 16); g.stroke();
  g.fillStyle = '#efe3c8'; for (let i = 0; i < 6; i++) g.fillRect(BX - 20 + i * 2, BY + BH + 24 - i * 2, BW + 40 - i * 4, 3); g.restore();
}
const FAM = { night: ['#2f3b78', '#46549a', '#5a68ae', '#9aa5d8'], teal: ['#2f8f8a', '#e8d5a8', '#4fb0a8', '#bde3d8'], meadow: ['#8fd1e8', '#7cc46a', '#a6dc8c', '#ffe9a0'], graphite: ['#cfc9bc', '#b8b2a4', '#d9d3c6', '#8d887c'], ward: ['#2f3b78', '#3a4a8a', '#46549a', '#8f9ad0'], morning: ['#f2c773', '#e0a64a', '#f6d68a', '#c78a38'] };
function page(g, fam, floorTone) {
  const f = FAM[fam]; g.save(); g.beginPath(); g.roundRect(BX, BY, BW, BH, 6); g.clip();
  g.fillStyle = f[0]; g.fillRect(BX, BY, BW, BASE_Y - BY); const bg = g.createLinearGradient(0, BY, 0, BASE_Y); bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(1, 'rgba(255,255,255,.18)'); g.fillStyle = bg; g.fillRect(BX, BY, BW, BASE_Y - BY);
  g.fillStyle = f[1]; g.beginPath(); g.moveTo(BX, BASE_Y); g.lineTo(BX + BW, BASE_Y); g.lineTo(BX + BW, BY + BH); g.lineTo(BX, BY + BH); g.fill();
  if (floorTone) { for (let r = 0; r < 9; r++) for (let c = -2; c < 12; c++) if ((r + c) % 2) { const y0 = BASE_Y + Math.pow(r / 9, 1.4) * (BY + BH - BASE_Y), y1 = BASE_Y + Math.pow((r + 1) / 9, 1.4) * (BY + BH - BASE_Y), k0 = lerp(.55, 1.15, (y0 - BASE_Y) / 320), k1 = lerp(.55, 1.15, (y1 - BASE_Y) / 320), x = c * 96; g.fillStyle = f[2]; g.beginPath(); g.moveTo(540 + (x - 480) * k0, y0); g.lineTo(540 + (x + 96 - 480) * k0, y0); g.lineTo(540 + (x + 96 - 480) * k1, y1); g.lineTo(540 + (x - 480) * k1, y1); g.fill(); } }
  g.strokeStyle = 'rgba(59,36,24,.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(BX, BASE_Y); g.lineTo(BX + BW, BASE_Y); g.stroke(); const vg = g.createLinearGradient(0, BASE_Y, 0, BASE_Y + 36); vg.addColorStop(0, 'rgba(0,0,0,.28)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(BX, BASE_Y, BW, 36);
  g.restore();
}
// a card standing on the page: pop-up (rises about its base, back-overshoot) with a cut-out shadow
function stand(g, c, x, y, o = {}) {
  const h = o.h ?? 1, sx = (o.sx ?? 1) * (o.flip || 1), k = o.k ?? 1, r = o.rot || 0, a = o.alpha ?? 1;
  if (h <= .01 && !o.flat) return;
  g.save(); g.globalAlpha = a; g.translate(x, y);
  if (o.shadow !== false) { g.save(); g.globalAlpha = a * .28; g.fillStyle = '#000'; g.beginPath(); g.ellipse(14 * h, 4, c.w * .42 * k * Math.abs(sx), 9 + c.h * .03 * k * h, 0, 0, TAU); g.fill(); g.restore(); }
  g.rotate(r); g.scale(sx * k, Math.max(.02, h) * k * (o.sy ?? 1)); g.drawImage(c.cv, -c.ox, -c.oy); g.restore();
}
const persp = y => lerp(.68, 1.28, clamp((y - BASE_Y) / (FLOOR_Y1 - BASE_Y)));
function person(g, kind, x, y, o = {}) { const k = (o.k ?? 1) * persp(y) * .92, c = chr(kind, o.pose || 'stand', o.face || 'smile'); stand(g, c, x, y, { ...o, k, sx: o.sx ?? 1 }); }

// ---------------------------------------------------------------- spreads (each a function of t)
const pop = (t, t0, d = .5) => back(seg(t, t0, t0 + d));
function s1(g, t, L) {
  page(g, 'night', true);
  const t0 = L.t0; for (const [x, c, d] of [[170, '#b3402e', 0], [330, '#7a4a32', .12], [750, '#7a4a32', .12], [910, '#b3402e', 0]]) stand(g, card('door' + c, 140, 300, ART.door(140, 300, c)), x, BASE_Y, { h: pop(t, t0 + d) });
  stand(g, card('doorLit', 100, 190, ART.doorLit(100, 190)), 540, BASE_Y, { h: pop(t, t0 + .2) }); stand(g, card('clock', 150, 190, ART.clock(150)), 540, BASE_Y - 20, { h: pop(t, t0 + .3), k: 1.2 });
  for (const [x, d] of [[270, .1], [810, .1]]) stand(g, card('lamp1', 100, 250, ART.lamp(180)), x, BASE_Y + 40, { h: pop(t, t0 + d + .1), k: 1.1 });
  if (t > 3.6) { const u = ss(seg(t, 3.6, 8.1)), x = lerp(150, 620, u), y = lerp(1180, 1440, u); person(g, 'ghost', x, y + Math.sin(t * 6) * 5, { pose: 'stand', h: 1, alpha: .94, face: t > 7.3 ? 'wide' : 'smile' }); }
  const op = ss(seg(t, 5.4, 5.7)) * (1 - ss(seg(t, 6.3, 6.45))); if (op > .01) person(g, 'pj', 330, BASE_Y + 40, { h: op, face: 'wide', k: .9 });
}
function s2(g, t, L) {
  page(g, 'teal', false); const t0 = L.t0;
  stand(g, card('win2', 220, 400, ART.window(220, 400, '#8fd0e8')), 250, BASE_Y, { h: pop(t, t0 + .1), k: 1.2 }); stand(g, card('plant', 120, 210, ART.plant), 850, BASE_Y + 10, { h: pop(t, t0 + .3), k: 1.3 });
  const cur = ss(seg(t, 9.3, 9.7)) * (1 - ss(seg(t, 9.9, 10.3)));
  person(g, 'ghost', 520, 1470 + Math.sin(t * 5) * 6, { k: 1.55, pose: cur > .4 ? 'raiseR' : 'stand', rot: -cur * .06, face: 'smile' });
  if (t > 12.1) { const press = seg(t, 12.9, 14.4), x = lerp(960, 760, ss(seg(t, 12.1, 12.8))) - (press > 0 ? 40 * Math.sin(press * Math.PI * 2) : 0), y = 1470 - (press > 0 ? 60 * Math.abs(Math.sin(press * Math.PI * 3)) : 0); stand(g, card('iron', 180, 130, ART.iron), x, y, { k: 1.5, flip: -1, h: 1 }); for (let i = 0; i < 4; i++) { const u = (t * 2 + i / 4) % 1; g.save(); g.globalAlpha = .5 * (1 - u); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 20 + Math.sin(u * 7 + i) * 18, y - 180 - u * 140, 14 + u * 22, 0, TAU); g.fill(); g.restore(); } }
}
function s3(g, t, L) {
  page(g, 'meadow', false); const t0 = L.t0;
  stand(g, card('sun', 200, 280, ART.sun(100)), 540, BASE_Y - 40, { h: pop(t, t0 + .1), k: 1.5 }); stand(g, card('arch', 520, 520, ART.arch(520, 520)), 540, BASE_Y + 10, { h: pop(t, t0 + .3) });
  for (const [x, d] of [[120, .2], [960, .25]]) stand(g, card('tree', 260, 360, ART.tree(340, '#4f9d58')), x, BASE_Y + 20, { h: pop(t, t0 + d), k: 1 });
  const bet = t > 20.9, away = ss(seg(t, 21.0, 21.6)); person(g, 'nurse', 320, 1460, { k: 1.35, pose: bet ? 'stand' : (t > 17.5 && t < 18.5 ? 'raiseR' : 'stand'), face: bet ? 'sad' : 'smile', rot: bet ? .05 : 0 });
  person(g, 'doc', lerp(740, 1000, away), 1460, { k: 1.4, flip: bet ? 1 : -1, pose: away > 0 && away < 1 ? (Math.floor(t * 8) % 2 ? 'walkA' : 'walkB') : 'stand' });
  if (t > 20.3) person(g, 'woman', lerp(1180, 900, ss(seg(t, 20.4, 21.0))) + away * 150, 1470, { k: 1.3, flip: -1, pose: away > 0 && away < 1 ? (Math.floor(t * 8) % 2 ? 'walkB' : 'walkA') : 'stand' });
  if (t > 19.6) for (let k = 0; k < 6; k++) { const u = t - (19.66 + k * .24); if (u < 0 || u > 1.6) continue; stand(g, card('h' + k % 3, 100, 100, ART.heart(46)), 320 + Math.sin(u * 4 + k) * 40 + (k - 2.5) * 22, 1010 - u * 150, { h: back(seg(u, 0, .3)) * (1 - seg(u, 1.1, 1.6)), k: .7 + .2 * (k % 3), shadow: false }); }
  if (t > 21.0) { const u = seg(t, 21.0, 21.7), w = Math.max(0, (u - .35) / .65); if (u < .35) stand(g, card('hh', 120, 120, ART.heart(52)), 320, 1030, { shadow: false, k: 1.2 }); else { stand(g, card('hl', 120, 120, ART.heartHalf(52, -1)), 320 - w * 80, 1030 + w * w * 360, { shadow: false, k: 1.2, rot: -w * 1.2 }); stand(g, card('hr', 120, 120, ART.heartHalf(52, 1)), 320 + w * 80, 1030 + w * w * 360, { shadow: false, k: 1.2, rot: w * 1.2 }); } }
}
function s4a(g, t, L) {
  page(g, 'graphite', false); const f = eo(seg(t, 23.68, 24.2));
  person(g, 'nurse', 540, 1500, { k: 1.4, rot: -1.45 * f, face: f > .1 ? 'shut' : 'sad', shadow: f < .5 });
  for (let i = 0; i < 3; i++) stand(g, card('rain', 520, 400, ART.rain), 300 + i * 260, 1000 + ((t * 420 + i * 200) % 700) - 300, { shadow: false, alpha: .8 });
  if (f > .5) { const u = seg(t, 24.0, 24.45); person(g, 'ghost', 420 - 40 * u, 1450 - 380 * u, { k: 1.4 + u * .5, alpha: .8 * (1 - u * .85), face: 'smile', pose: 'up', shadow: false }); }
}
function wardBack(g, t, t0) { stand(g, card('win', 230, 380, ART.window(230, 380, '#232f66')), 730, BASE_Y, { h: pop(t, t0 + .1), k: 1.25 }); stand(g, card('moon', 150, 170, ART.moon(60)), 730, BASE_Y - 160, { h: pop(t, t0 + .35), k: 1 }); }
function s4b(g, t, L) {
  page(g, 'ward', true); wardBack(g, t, L.t0); stand(g, card('bed', 420, 190, ART.bed), 740, 1430, { h: pop(t, L.t0 + .2), k: 1.1 });
  person(g, 'pj', 600, 1330, { pose: 'stand', face: 'wide', k: .55, rot: 1.5, shadow: false, h: 1 });
  const ring = t < 26.86 || t > 28.9; stand(g, card('bell', 140, 240, ART.bell), 960 + (ring ? Math.sin(t * 80) * 4 : 0), 1250, { h: pop(t, L.t0 + .4), k: 1.1 });
  stand(g, card('chair', 140, 190, ART.chair), 230, 1480, { h: pop(t, L.t0 + .3), k: 1.3 });
  const dead = t > 26.86; person(g, 'nurse', 230, 1440, { k: 1.25, face: 'shut', rot: dead ? .25 : .1 * Math.sin(t * 6), pose: 'stand' });
  if (dead) { const lift = ss(seg(t, 26.86, 27.8)), pull = ss(seg(t, 28.0, 28.7)), snap = ss(seg(t, 28.8, 29.4)), y = lerp(1440, 900, Math.min(1, lift * .55 + pull * .45) * (1 - snap)); g.save(); g.strokeStyle = 'rgba(247,240,222,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(230, 1400); g.quadraticCurveTo(230 + 40 * Math.sin(t * 7), (1400 + y) / 2, 230, y - 80); g.stroke(); g.restore(); person(g, 'ghost', 230, y, { k: 1.25, alpha: .88, pose: pull > 0 && snap < 1 ? 'up' : 'stand', face: pull > 0 && snap < 1 ? 'wide' : 'smile', sy: 1 + pull * .3 * (1 - snap), shadow: false }); }
}
function s5(g, t, L) {
  page(g, 'ward', true); wardBack(g, t, 0); const calm = ss(seg(t, 35.35, 35.8)), sh = t < 35.35 ? Math.sin(t * 90) * 3 : 0;
  stand(g, card('bed', 420, 190, ART.bed), 740 + sh * (1 - calm), 1430, { k: 1.1 }); person(g, 'pj', 600 + sh, 1330, { pose: 'stand', face: calm > .5 ? 'shut' : 'wide', k: .55, rot: 1.5, shadow: false });
  const arrive = ss(seg(t, 30.4, 32.6)), x = lerp(-100, 330, arrive), med = ss(seg(t, 33.9, 34.3)) * (1 - ss(seg(t, 35.0, 35.3))), tuck = ss(seg(t, 35.35, 35.8));
  person(g, 'ghost', x, 1480 + Math.sin(t * 5) * 5, { k: 1.55, alpha: .92, rot: ss(seg(t, 33, 33.5)) * .08, pose: med > .3 ? 'raiseR' : (tuck > .2 ? 'reach' : 'stand'), face: 'smile' });
  if (med > .01) stand(g, card('bottle', 80, 130, ART.bottle), x + 100, 1480 - 480 * (0.6 + .1 * med), { shadow: false, alpha: med, k: 1.2 });
}
function lobbyBack(g, t, t0) { stand(g, card('winM', 240, 420, ART.window(240, 420, '#ffe9a0')), 230, BASE_Y, { h: pop(t, t0 + .1), k: 1.2 }); stand(g, card('deskM', 380, 230, ART.desk), 760, BASE_Y + 30, { h: pop(t, t0 + .3), k: 1.2 }); for (const [x, d] of [[500, .2], [620, .25]]) stand(g, card('fr' + x, 120, 150, ART.frame(120, 150)), x, BASE_Y - 160, { h: pop(t, t0 + d), shadow: false }); }
function s6(g, t, L) {
  page(g, 'morning', true); lobbyBack(g, t, L.t0); const tk = t < 40.6 ? Math.sin(t * 9) * .03 : 0, gl = ss(seg(t, 40.65, 41.0));
  person(g, 'pj', 300, 1470, { k: 1.4, rot: tk, pose: t < 39.9 ? 'wave' : 'hold', face: t < 41.4 ? 'smile' : 'wide' }); stand(g, card('bq', 100, 130, ART.bouquet), 380, 1440, { k: 1.2, shadow: false });
  person(g, 'matron', 700, 1420, { k: 1.25, flip: -1, face: gl > .5 ? 'wide' : 'smile', pose: gl > .5 ? 'raiseR' : 'stand' }); person(g, 'doc', 910, 1420, { k: 1.3, flip: -1, face: gl > .5 ? 'wide' : 'smile' });
  for (const [t0, x, y] of [[41.0, 700, 880], [41.4, 910, 880], [42.0, 330, 940]]) { const u = seg(t, t0, t0 + .4); if (u > 0) stand(g, card('q', 120, 130, ART.q), x, y, { h: back(u), shadow: false, rot: .08 * Math.sin(t * 5) }); }
}
function s7(g, t, L) {
  page(g, 'morning', true); lobbyBack(g, t, -9); stand(g, card('pf', 230, 300, ART.frame(230, 300)), 540, BASE_Y - 60, { h: pop(t, 43.3), k: 1.2, shadow: false });
  const sx = 0; g.save(); g.translate(540, BASE_Y - 200); g.scale(.55, .55); g.drawImage(chr('nurse', 'stand', 'smile').cv, -chr('nurse', 'stand', 'smile').ox, -chr('nurse', 'stand', 'smile').oy - 150); g.restore(); stand(g, card('rib', 120, 80, ART.ribbon), 470, BASE_Y - 270, { shadow: false, k: .9, rot: .3 });
  const dbl = seg(t, 48.4, 49.0), stiff = t > 49.1 && t < 49.5, run = seg(t, 49.5, 50.3), walk = ss(seg(t, 43.0, 45.6));
  const px = t < 45.6 ? lerp(220, 520, walk) : t < 49.5 ? 520 : 520 + run * run * 800, jump = dbl > 0 && dbl < .4 ? 70 * Math.sin(dbl / .4 * Math.PI) : 0;
  person(g, 'pj', px, 1470 - jump, { k: 1.4, pose: t >= 49.5 ? (Math.floor(t * 12) % 2 ? 'walkA' : 'walkB') : (t < 45.6 ? (Math.floor(t * 6) % 2 ? 'walkA' : 'walkB') : (dbl > 0 ? 'up' : 'stand')), face: dbl > 0 ? 'wide' : 'smile', rot: t >= 49.5 ? .2 : 0, sy: dbl > 0 && dbl < .1 ? .88 : 1, shadow: true });
}
function s8(g, t, L) {
  page(g, 'ward', true); wardBack(g, t, -9); stand(g, card('bed', 420, 190, ART.bed), 740, 1430, { k: 1.1 }); person(g, 'pj', 600, 1330, { pose: 'stand', face: 'shut', k: .55, rot: 1.5, shadow: false });
  const tuck = t > 53.3 && t < 54.3, wag = t > 54.4 && t < 55.5; person(g, 'ghost', 340, 1480 + Math.sin(t * 5) * 5, { k: 1.55, alpha: .94, rot: tuck ? .08 : 0, pose: wag ? 'point' : (tuck ? 'reach' : (t > 56.3 && t < 57.2 ? 'reach' : 'stand')), face: 'smile' });
  if (t > 55.7) { const u = seg(t, 55.7, 58.2); stand(g, card('hh2', 120, 120, ART.heart(52)), lerp(430, 700, ss(u)), 1250 - 330 * eo(u), { h: back(seg(t, 55.7, 56.2)), k: 1.1 + .1 * Math.sin(t * 9), shadow: false }); }
}
const SP = [[3.4, 8.15, s1, 'night'], [8.15, 15.2, s2], [15.2, 21.6, s3], [21.6, 24.45, s4a], [24.45, 29.75, s4b], [29.75, 36.7, s5], [36.7, 43.0, s6], [43.0, 50.3, s7], [50.3, 58.6, s8]];
// ---------------------------------------------------------------- the cover, subtitles, frame of time
function cover(g, t, a) {  // the closed book; a = 0 closed .. 1 fully opened (flips up about its top edge)
  const hf = Math.cos(a * Math.PI); if (hf <= 0 && a < 1) { } const x0 = BX - 30, y0 = BY - 30, w = BW + 60, h = BH + 70;
  g.save(); g.translate(0, y0); g.scale(1, Math.abs(hf)); g.translate(0, -y0); const front = hf > 0;
  g.fillStyle = front ? '#8a2c24' : '#efe3c8'; g.beginPath(); g.roundRect(x0, y0, w, h, 22); g.fill();
  if (front) { g.strokeStyle = '#d6a64a'; g.lineWidth = 4; g.beginPath(); g.roundRect(x0 + 24, y0 + 24, w - 48, h - 48, 14); g.stroke(); g.fillStyle = '#d6a64a'; g.font = '116px "Lilita One"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LA', 540, 640); g.font = '112px "Lilita One"'; g.fillText('PLANCHADA', 540, 790); g.font = '600 40px Fredoka'; g.fillText('THE NURSE WHO NEVER LEFT', 540, 940); g.font = '500 30px Fredoka'; g.globalAlpha = .8; g.fillText('PLOT TWIST WITH A&R  ·  EPISODE 16', 540, 1470); g.globalAlpha = 1; g.beginPath(); g.arc(540, 1130, 90, 0, TAU); g.strokeStyle = '#d6a64a'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#e0463a'; g.font = '110px "Lilita One"'; g.fillText('♥', 540, 1136); }
  g.restore();
}
function endCover(g, t) {
  const a = ss(seg(t, 58.4, 59.2)); if (a <= 0) return; const x0 = BX - 30, y0 = BY - 30, w = BW + 60, h = BH + 70; g.save(); g.translate(0, y0); g.scale(1, a); g.translate(0, -y0); g.fillStyle = '#8a2c24'; g.beginPath(); g.roundRect(x0, y0, w, h, 22); g.fill(); g.strokeStyle = '#d6a64a'; g.lineWidth = 4; g.beginPath(); g.roundRect(x0 + 24, y0 + 24, w - 48, h - 48, 14); g.stroke();
  const tx = ss(seg(t, 59.4, 60.2)); g.globalAlpha = tx; g.fillStyle = '#d6a64a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '110px "Lilita One"'; g.fillText('THE NURSE', 540, 600); g.fillText('IS A LEGEND.', 540, 740); g.fillRect(240, 830, 600, 5); g.font = '600 52px Fredoka'; g.globalAlpha = ss(seg(t, 60.0, 60.8)); g.fillText('HER STORY STILL', 540, 960); g.fillText('HAUNTS MEXICO.', 540, 1030);
  g.globalAlpha = ss(seg(t, 60.8, 61.4)); const k = 1 + .05 * Math.sin(t * 6); g.fillStyle = '#e0463a'; g.font = `${130 * k}px "Lilita One"`; g.fillText('♥', 540, 1260); g.restore();
}
function subs(g, t) {
  for (const [id, t0, d, txt] of VO) {
    const a = t0 - .1, b = t0 + Math.max(d + .6, 1.8); if (t < a || t >= b || t >= 58.6) continue; const al = Math.min(seg(t, a, a + .2), 1 - seg(t, b - .3, b));
    g.save(); g.font = '600 40px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; const words = txt.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > 900 && cur) { lines.push(cur); cur = w; } else cur = tt; } lines.push(cur);
    g.globalAlpha = al; g.lineJoin = 'round'; lines.forEach((l, i) => { const y = 1745 - (lines.length - 1) * 25 + i * 50; g.lineWidth = 11; g.strokeStyle = '#3b2418'; g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 8; g.strokeText(l, 540, y); g.shadowBlur = 0; g.fillStyle = '#fff3d6'; g.fillText(l, 540, y); }); g.restore();
  }
}
function render(t) {
  t = Math.min(t, window.DUR - 1e-4); const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);
  const z = 1 + .05 * ss(seg(t, 0, 62)) + (t < 3.4 ? .12 * (1 - ss(seg(t, 0, 3.4))) : 0);   // a slow descending dolly towards the book
  g.drawImage(DESK, 0, 0); g.save(); g.translate(540, 1000); g.scale(z, z); g.translate(-540, -1000);
  bookFrame(g);
  let i = SP.findIndex(s => t >= s[0] && t < s[1]); if (i < 0) i = t < 3.4 ? -1 : SP.length - 1;
  if (i >= 0) {
    const draw = (idx, tt, tt0) => { g.save(); g.beginPath(); g.roundRect(BX, BY, BW, BH, 6); g.clip(); SP[idx][2](g, tt, { t0: tt0 }); g.restore(); };
    const tb = SP[i][0], pt = t - tb;
    if (i > 0 && pt < .75) { const p = ss(pt / .75), edge = lerp(BX + BW + 40, BX - 40, p); draw(i, t, tb); g.save(); g.beginPath(); g.rect(BX - 40, BY - 40, edge - BX + 40, BH + 100); g.clip(); draw(i - 1, SP[i - 1][1] + .5, SP[i - 1][0]); const cg = g.createLinearGradient(edge - 90, 0, edge + 6, 0); cg.addColorStop(0, 'rgba(60,35,15,0)'); cg.addColorStop(.85, 'rgba(60,35,15,.45)'); cg.addColorStop(1, 'rgba(255,248,225,.8)'); g.fillStyle = cg; g.fillRect(edge - 90, BY, 96, BH); g.restore(); }
    else draw(i, t, tb);
  }
  if (t < 3.6) cover(g, t, ss(seg(t, 2.6, 3.5)));
  endCover(g, t);
  g.restore(); g.fillStyle = LAMP_PAT; g.drawImage(LAMP, 0, 0); subs(g, t);
}
let LAMP_PAT;
window.render = render; window.TEXTS = () => [];
(async () => {
  cv.width = W; cv.height = H; await document.fonts.ready; for (const f of ['600 40px Fredoka', '500 30px Fredoka', '110px "Lilita One"']) await document.fonts.load(f);
  bakeGrain(); bakeDesk(); window.READY = true;
})();
