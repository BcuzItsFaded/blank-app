// ===== word clock =====
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function wd(text, near) { const k = norm(text); let best = null; for (const w of WORDS) if (norm(w.w) === k && (best === null || (near !== undefined && Math.abs(w.s - near) < Math.abs(best.s - near)))) best = w; if (!best) throw new Error('word not found: ' + text); if (near !== undefined && Math.abs(best.s - near) > 0.5) throw new Error('word too far: ' + text + ' ' + near); return best.s; }
const END = 100.5;
const WIPES = () => [wd('while', 19.62), wd('off', 37.3), wd('the', 59.02), wd('koichi', 74.84), wd('and', 91.36)];

// cast
const gcells = (hx, hy, hr, on) => { const c = on ? GZ.glow : '#5d6f8a'; for (let i = 0; i < 3; i++) tube([hx + hr * 0.2 + i * hr * 0.12, hy + hr * 0.15, hx + hr * 0.32 + i * hr * 0.12, hy + hr * 0.32, hx + hr * 0.22 + i * hr * 0.12, hy + hr * 0.5], hr * 0.05, c); };
Object.assign(CAST, {
  koichi: { hair: 'short', hairC: '#2a2522', top: '#7a6248', pants: '#4f4a42', seed: 21 },
  pilot: { hair: 'helmet', hairC: '#6b4a30', top: '#6b5a40', pants: '#4f4a42', seed: 21 },
  noriko: { hair: 'bob', hairC: '#2a2220', top: '#a65d5d', pants: '#7a4a4a', h: 440, seed: 22 },
  akiko: { hair: 'bob', hairC: '#2a2220', top: '#e0c36a', pants: '#8a6f5a', h: 290, seed: 23 },
  noda: { hair: 'short', hairC: '#3a3330', top: '#6a6f7d', glasses: true, seed: 24 },
  murakami: { hair: 'short', hairC: '#d4d4d4', top: '#e6e6e0', pants: '#7a7a7a', glasses: true, seed: 25 },
  aoyama: { hair: 'bob', hairC: '#3a2a24', top: '#5b7a8a', h: 430, seed: 26 },
  gilbert: { hair: 'cap', hairC: '#6b7356', top: '#7d8463', seed: 27 },
  soldier: { hair: 'helmet', hairC: '#6b7356', top: '#7d8463', seed: 28 },
  worker: { hair: 'bandana', hairC: '#2a2522', bandC: '#e8e4dc', top: '#8a9aa8', seed: 29, sleeves: 'short' },
});
const wArms = (x, y, h, f, ph, amp = 0.1) => ({ armA: { x: x + f * amp * h * Math.sin(ph), y: y - 0.25 * h }, armB: { x: x - f * amp * h * Math.sin(ph), y: y - 0.25 * h } });
function walker(name, x0, y, lt, f = 1, speed = 1.1, extra = {}) {
  const c = CAST[name], h = extra.h || c.h || 459, ph = lt * Math.PI * 2 * speed, x = walkX(x0, ph, h, f);
  return person({ ...c, ...wArms(x, y, h, f, ph), ...extra, x, y, h, view: 'side', face: f, walk: ph });
}
const sky = (c) => rect(0, 0, W, H, c);
function chalk(x, y, w, h) { rrect(x - 16, y - 16, w + 32, h + 32, 12, '#7a5a3e'); rect(x, y, w, h, '#2f5446'); }
function photo(x, y, a, hairC = '#2a2220') { push(x, y, a); rrect(-110, -90, 220, 150, 8, P.white); rrect(-94, -74, 188, 118, 6, '#cbd3dc'); for (let i = 0; i < 3; i++) { const px = -50 + i * 50, r = 22; circ(px, -20, r, P.skin); ell(px, -36, r, 12, 0, hairC); circ(px - 7, -20, 3, P.ink); circ(px + 7, -20, 3, P.ink); rrect(px - 20, 4, 40, 36, 14, '#8a9aa8'); } pop(); }
function ship(x, y, s) { push(x, y, 0, s); poly([-300, 0, 300, 0, 260, 60, -260, 60], '#7d838d'); rect(-120, -60, 200, 60, '#8d939d'); rect(-40, -120, 60, 60, '#9aa1ab'); rect(110, -30, 110, 16, '#5d636d'); rect(-250, -26, 110, 16, '#5d636d'); rect(-10, -170, 12, 50, '#5d636d'); pop(); }
function train(x, y, w) { rrect(x, y - 260, w, 230, 30, '#3f5a4c'); rect(x, y - 140, w, 30, '#c9a45a'); for (let i = 0; i < w / 180 - 1; i++) rrect(x + 50 + i * 180, y - 230, 120, 80, 10, '#f2e2a8'); for (let i = 0; i < w / 300; i++) { circ(x + 120 + i * 300, y - 20, 30, '#2e3138'); } }
function rubble(x, y, k, seed) { for (let i = 0; i < 9; i++) { const g = Math.max(0, k - i * 0.04); const yy = lerp(y - 700 - hash(i + seed) * 200, y - 40 - (i % 3) * 70, eOut(g * 1.6)); push(x + (hash(i * 5 + seed) - 0.5) * 420, yy, hash(i) * 2 - 1); rrect(-80, -50, 160 + hash(i + 2) * 60, 100, 10, i % 2 ? '#7a7f8f' : '#6a6f7f'); pop(); } }
function stream(x1, y1, x2, y2, c, t0) { if (T < t0) return; const k = eOut((T - t0) / 0.35); for (let i = 0; i < 10; i++) { const u = (i / 10 + T * 2) % 1; if (u > k) continue; circ(lerp(x1, x2, u), lerp(y1, y2, u) - Math.sin(u * Math.PI) * 120, 16 + u * 22, c); } }
function fireBlob(x, y, s, seed) { const k = Math.sin(T * 12 + seed) * 0.12; ell(x, y, 70 * s * (1 + k), 90 * s * (1 - k), 0, P.fire); ell(x, y + 15 * s, 40 * s, 55 * s * (1 + k), 0, P.fireL); }

// ===== shots =====
const SHOTS = []; const shot = (start, fn) => SHOTS.push({ start, fn });
function build() {
  SHOTS.length = 0;
  // ---------- 1. TWO YEARS LATER ----------
  shot(0, (lt, d) => {
    camera(lt, d, { z0: 1.02, z1: 1.08, x0: 900, x1: 1020 });
    sky('#dfa98a'); circ(1450, 470, 110, '#f6d28e'); shore(1500, 2000, 560, '#a07a6a');
    ocean(560, '#5d6f8f', '#6f82a3');
    ell(1100, 880 + lt * 50, 260, 70, 0, '#47566f'); for (let i = 0; i < 6; i++) { const u = (T * 0.6 + i / 6) % 1; circ(1000 + hash(i) * 200, lerp(880, 600, u), 8 + u * 6, '#b9c8dd'); }
    rect(120, 560, 360, 40, '#7a5a3e'); for (let i = 0; i < 4; i++) rect(140 + i * 100, 600, 20, 200, '#6a4e36');
    sign(150, 330, 320, 130, 'SAGAMI BAY', wd('sagami', 1.98) - 0.2, { kind: 'post', post: 110, size: 50 });
    dateCard('1949', wd('two', 0) + 0.15, wd('japan', 3.08) - 0.3);
  });
  shot(wd('japan', 3.08), (lt, d) => {
    camera(lt, d, { x0: 880, x1: 1040 });
    sky('#a9b8c9'); houses(820, 2); rect(0, 820, W, 260, '#8b7d6a');
    scaffold(1380, 380, 360, 440);
    const hm = Math.sin(T * 10); person({ ...CAST.worker, x: 1560, y: 600, h: 300, view: 'side', face: -1, armB: { x: 1470, y: 470 + hm * 40, hand: 'fist' }, holding: (hx, hy, a) => { push(hx, hy, a); rect(0, -6, 50, 12, '#6a4e36'); rect(40, -20, 20, 40, '#5b5f6e'); pop(); } });
    sign(160, 170, 520, 170, 'TWO YEARS LATER', wd('japan', 3.08) + 0.05, { kind: 'hang', rope: 120, size: 58 });
    walker('koichi', 260, 990, lt, 1, 0.9, { mouth: 'smile' }); walker('noriko', 110, 995, lt, 1, 0.9, { mouth: 'smile' }); walker('akiko', 430, 1000, lt, 1, 1.15, { mouth: 'smile' });
  });
  shot(wd('but', 6.5), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.14, x0: 960, x1: 1000, y0: 540, y1: 560 });
    room('#c9b48f', '#a88d6a'); for (let x = 1240; x < 1820; x += 145) rect(x, 120, 12, 700, '#f4ecd8'); rect(1240, 120, 580, 700, 'rgba(0,0,0,0)'); rrect(1240, 120, 580, 700, 6, '#efe5cc'); for (let x = 1240; x < 1820; x += 145) rect(x, 120, 10, 700, '#8a6f4c'); for (let y = 120; y < 820; y += 140) rect(1240, y, 580, 10, '#8a6f4c');
    sign(150, 170, 440, 200, 'HER SECRET', wd('secret', 7.84) - 0.1, { size: 64 });
    const c = wd('cells', 8.98), on = T > c;
    person({ ...CAST.koichi, x: 1500, y: 960, h: 420, view: 'side', face: 1, sit: true, seatH: 60, mouth: 'smile', armB: { x: 1640, y: 780 } });
    person({ ...CAST.noriko, x: 860, y: 1180, h: 680, view: 'front', mouth: on ? 'frown' : 'flat', lookX: -1.5, brow: on ? 0.25 : 0, armB: { x: 1120, y: 860, hand: 'open' }, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, on && Math.floor(T * 6) % 2) });
    exclaim(1130, 330, c);
  });
  // ---------- 2. A DRAGON FROM SPACE ----------
  shot(wd('then', 10.72), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08 });
    sky('#2b3350'); stars(120, 4); poly([0, 760, 300, 520, 560, 700, 900, 460, 1240, 690, 1560, 500, 1920, 680, 1920, 1080, 0, 1080], '#3e4a66'); rect(0, 820, W, 260, '#2f3a52');
    const L = wd('lands', 11.38), k = clamp((T - (L - 0.7)) / 0.7);
    if (T < L) { const x = lerp(1900, 1150, k), y = lerp(-50, 780, k); tube([x, y, x + 260, y - 280], 30, '#ffb070'); circ(x, y, 34, P.fireL); }
    else { ev('hit', L); ell(1150, 800, 180, 40, 0, '#1f2840'); circ(1150, 780, 40, '#ff9a5a'); }
    puff(1150, 760, 220, L, '#ffd9a0', 9);
    sign(220, 430, 420, 140, 'MATSUMOTO', wd('matsumoto', 12) - 0.1, { kind: 'post', post: 260, size: 56 });
  });
  shot(wd('outcrawls', 13.04), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.1, x0: 960, x1: 960, y0: 560, y1: 540 });
    sky('#3a4566'); rect(0, 760, W, 320, '#5a4a3e'); ell(960, 880, 420, 90, 0, '#3f342c');
    const e = wd('eats', 14.86), g = eOut((T - wd('outcrawls', 13.04)) / 2.8);
    for (let i = 0; i < 5; i++) { const tx = 300 + i * 330, k = T > e + i * 0.15 ? eIO((T - e - i * 0.15) / 0.6) : 0; if (k < 1) { push(lerp(tx, 960, k), lerp(760, 860, k), 0, 1 - k); poly([0, -220, -80, 0, 80, 0], '#4f6a4a'); rect(-12, 0, 24, 40, '#5b4a3e'); pop(); } }
    blob(960, 860, 60 + g * 130, T);
    walker('worker', 520, 980, T > e ? T - e : 0, -1, 2.2, { mouth: 'o' }); exclaim(470, 520, e + 0.1);
  });
  shot(wd('until', 16.22), (lt, d) => {
    camera(lt, d, { z0: 1.02, z1: 1.08, x0: 960, x1: 960, y0: 580, y1: 520 });
    sky('#3a4566'); stars(40, 9); rect(0, 820, W, 260, '#5a4a3e');
    const w = eOut((T - wd('grows', 16.58)) / 0.7), sp = wd('spits', 17.54);
    ghidorah({ x: 860, y: 900, s: 0.9, face: 1, heads: 1, wings: 0.25 + 0.75 * w, mouth: T > sp ? 0.8 : 0.2, beamAt: () => clamp((T - sp) / 0.25), beamL: 900 });
    if (T > sp) { ev('hit', sp); puff(1750, 520, 120, sp + 0.25); }
  });
  shot(wd('they', 18.52), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.1 });
    room('#7b8a8c', '#5a6466'); chalk(560, 160, 800, 380);
    typeIn(560, 160, 800, 380, 'GHIDORAH', wd('ghidorah', 18.98) - 0.15, { color: P.white, size: 120 });
    person({ ...CAST.aoyama, x: 420, y: 1000, view: 'front', mouth: 'o', lookX: 1.5, armB: { x: 560, y: 600, hand: 'point' } });
    person({ ...CAST.murakami, x: 1560, y: 1000, view: 'front', mouth: 'flat', lookX: -1.5, brow: 0.2, armA: { x: 1500, y: 800 }, armB: { x: 1600, y: 780 } });
  });
  // ---------- 3. THE FIRST STRIKE ----------
  shot(wd('while', 19.62), (lt, d) => {
    camera(lt, d, { x0: 900, x1: 1040 });
    sky('#9fb3c8'); rect(0, 760, W, 320, '#6f7a6a'); rect(0, 880, W, 120, '#5b6158'); for (let x = 0; x < W; x += 220) rect(x, 935, 110, 12, '#e6d6ba');
    rect(1250, 260, 600, 500, '#7a8070'); poly([1220, 260, 1550, 130, 1880, 260], '#6a7060');
    sign(1350, 300, 420, 150, 'THE FIRST STRIKE', wd('while', 19.62) + 0.2, { size: 52 });
    fighter(900, 840, 1.1, 0, 1);
    walker('pilot', 200, 1000, lt, 1, 0.9, { mouth: 'flat', brow: 0.2 });
    person({ ...CAST.gilbert, x: 1500, y: 1010, view: 'front', mouth: 'smile', lookX: -1.5, armA: { x: 1440, y: 700, hand: 'fist' }, armB: { x: 1560, y: 860 } });
  });
  shot(wd('a', 22.72), (lt, d) => {
    camera(lt, d, { z0: 1.02, z1: 1.06 });
    sky('#7e8fae'); poly([0, 700, 400, 520, 960, 760, 1500, 520, 1920, 700, 1920, 1080, 0, 1080], '#5d6a58');
    ghidorah({ x: 960, y: 960, s: 0.7, face: 1, heads: 1, wings: 0.5, rot: 0, mouth: 0 });
    const k = clamp((T - wd('a', 22.72)) / 2.5); bomber(lerp(-200, 2100, k), 180, 0.7, 0.02);
    const b = wd('bomb', 23.82), h = wd('hits', 24.02);
    if (T > b && T < h + 0.05) { const g = (T - b) / (h - b); push(lerp(lerp(-200, 2100, (b - wd('a', 22.72)) / 2.5), 960, g), lerp(220, 760, g * g)); rrect(-14, -30, 28, 60, 12, '#3a3d4c'); pop(); ev('whoosh', b); }
    if (T > h) { ev('hit', h); const e = eOut((T - h) / 0.5); circ(960, 720, 420 * e, P.fire); circ(960, 720, 300 * e, P.fireL); circ(960, 720, 160 * e, P.white); }
  });
  shot(wd('ghidorah', 25.28), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 900, x1: 1000 });
    sky('#7e8fae'); for (let i = 0; i < 6; i++) circ(200 + i * 300, 900, 200, '#8a8f98'); rect(0, 900, W, 180, '#5d6a58');
    const wp = wd('wipes', 26.38), up = eOut((T - wd('survives', 25.52)) / 0.6);
    ghidorah({ x: 600, y: 1000 - up * 200, s: 0.8, face: 1, heads: 1, fly: true, mouth: T > wp ? 0.8 : 0.3, beamAt: () => clamp((T - wp) / 0.2), beamL: 1100, headA: -0.15 });
    for (let i = 0; i < 3; i++) { const hit = T > wp + 0.2 + i * 0.12, g = hit ? T - wp - 0.2 - i * 0.12 : 0; fighter(1300 + i * 200 - lt * 80, 300 + i * 90 + g * g * 600, 0.5, hit ? g * 3 : 0.05, -1); if (hit) puff(1300 + i * 200 - lt * 80, 300 + i * 90, 70, wp + 0.2 + i * 0.12, '#ffd9a0', 5); }
  });
  // ---------- 4. LIGHTNING MAKES IT STRONGER ----------
  shot(wd('so', 28.18), (lt, d) => {
    camera(lt, d, { x0: 880, x1: 1020 });
    sky('#56607a'); rect(0, 820, W, 260, '#4f5a4a');
    for (let i = 0; i < 2; i++) { truck(380 + i * 560, 960, 1.1); push(330 + i * 560, 760, -0.5); rrect(-20, -30, 220, 60, 20, '#4b4f5e'); pop(); }
    const hp = wd('harpoons', 28.6); for (let i = 0; i < 2; i++) if (T > hp + i * 0.1) { const g = (T - hp - i * 0.1) * 1.6; push(500 + i * 560 + g * 700, 680 - g * 500 + g * g * 120, -0.55); rect(0, -5, 160, 10, '#9aa5b3'); rect(150, -24, 8, 48, '#d0d8e0'); pop(); ev('whoosh', hp + i * 0.1); }
    sign(1250, 200, 560, 160, 'LIGHTNING RODS', wd('lightning', 29.46) - 0.4, { size: 58 });
  });
  shot(wd('the', 29.98), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.1 });
    sky('#2f3550'); for (let i = 0; i < 6; i++) ell(200 + i * 320, 120, 260, 90, 0, '#3d4462'); rect(0, 860, W, 220, '#3f4a3c');
    const hb = wd('hits', 30.84), dr = wd('drops', 31.74), fall = T > dr ? eOut((T - dr) / 0.4) : 0;
    ghidorah({ x: 960, y: 960, s: 0.8, face: 1, heads: 1, rot: -0.5 * fall, mouth: T > hb && !fall ? 0.9 : 0, headA: fall * 0.6, frozen: false });
    for (let i = 0; i < 3; i++) { rect(880 + i * 90, 600 + i * 20 + (T > wd('drops', 31.74) ? eOut((T - wd('drops', 31.74)) / 0.4) * 120 : 0), 8, 150, '#d0d8e0'); }
    if (T > hb && T < hb + 0.5) { ev('hit', hb); for (let i = 0; i < 3; i++) bolt(800 + i * 200, 0, 884 + i * 90, 600 + i * 20, i + Math.floor(T * 20), 16); if (T - hb < 0.08) rect(0, 0, W, H, 'rgba(255,255,240,0.35)'); }
    if (T > dr) puff(1000, 900, 200, dr, P.white, 7);
  });
  shot(wd('then', 32.54), (lt, d) => {
    camera(lt, d, { z0: 1.02, z1: 1.07, x0: 960, x1: 960, y0: 600, y1: 520 });
    sky('#4d5470'); ruinCity(7, '#6a6f80'); rect(0, 820, W, 260, '#4b4f5e');
    const th = wd('three', 33.88), tw = wd('two', 34.78), bm = wd('beam', 35.64), up = eOut((T - wd('rises', 32.76)) / 0.8);
    const heads = T > th ? 3 : 1; if (T > th) puff(1180, 330, 150, th, '#ffe9a8', 7);
    ghidorah({ x: 1100, y: 920 + (1 - up) * 250, s: 0.9 + 0.15 * up, face: -1, heads, tails: T > tw ? 2 : 1, mouth: 0.6, beamAt: i => i === 1 ? clamp((T - bm) / 0.2) : 0, beamL: 420, headA: 0.2 });
    if (T > tw) puff(1500, 800, 90, tw, P.white, 5);
    sign(720, 90, 480, 150, 'KING GHIDORAH', th - 0.05, { size: 58 });
    const lift = T > bm ? eOut((T - bm) / 1) : 0; push(420, 820 - lift * 320, lift * 0.3); rect(-120, -300, 240, 300, '#7a7f8f'); for (let r = 0; r < 4; r++) rect(-80, -260 + r * 66, 160, 30, '#5d6272'); pop();
    if (T > bm) { ev('whoosh', bm); bolt(760, 520, 450, 620 - lift * 320, Math.floor(T * 18), 12); }
  });
  // ---------- 5. GODZILLA IS BACK ----------
  shot(wd('off', 37.3), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.09, x0: 900, x1: 1020 });
    sky('#9cb2c4'); shore(1200, 1920, 600, '#6f8a6a'); ocean(600, '#4d7189', '#5c84a0');
    const bo = clamp((T - wd('boil', 39.88) + 1.4) / 1.4); for (let i = 0; i < 16; i++) { const u = (T * 2 + hash(i)) % 1; if (hash(i + 3) < bo) circ(700 + hash(i) * 600, 760 + hash(i + 5) * 160 - u * 20, 10 + u * 22 * bo, '#cfe2ee'); }
    sign(1450, 330, 360, 130, 'KOZUSHIMA', wd('island', 37.64) - 0.1, { kind: 'post', post: 140, size: 50 });
    push(300, 760); poly([-150, 0, 150, 0, 120, 50, -120, 50], '#8a6f4c'); pop(); person({ ...CAST.worker, x: 300, y: 765, h: 280, view: 'front', mouth: bo > 0.5 ? 'o' : 'flat', lookX: 1.5 });
  });
  shot(wd('godzilla', 40.42), (lt, d) => {
    camera(lt, d, { z0: 1.0, z1: 1.06, x0: 960, x1: 960, y0: 600, y1: 500 });
    sky('#9cb2c4');
    const up = eOut((T - wd('godzilla', 40.42)) / 1.2); godzilla({ x: 1050, y: 1500 - up * 520, s: 1.25, face: -1, mouth: up > 0.8 ? 0.7 : 0.2, glow: T > wd('regenerated', 41.1) ? 1 : 0 });
    ocean(820, '#4d7189', '#5c84a0'); puff(1000, 820, 300, wd('godzilla', 40.42) + 0.2, '#e6f2f8', 9);
    push(300, 860); poly([-150, 0, 150, 0, 120, 50, -120, 50], '#8a6f4c'); pop(); person({ ...CAST.worker, x: 300, y: 865, h: 280, view: 'front', mouth: 'o', lookX: 1.5, armA: { x: 250, y: 680, hand: 'open' }, armB: { x: 350, y: 680, hand: 'open' } });
    exclaim(300, 480, wd('has', 40.62));
  });
  shot(wd('scientist', 42.04), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.1, x0: 940, x1: 1000 });
    room('#7b8a8c', '#5a6466'); chalk(640, 240, 980, 520);
    typeIn(640, 240, 980, 520, 'GODZILLA\nVS\nGHIDORAH', wd('murakami', 43.04) - 0.2, { color: P.white, size: 96 });
    const sc = Math.sin(T * 22) * 8;
    person({ ...CAST.murakami, x: 470, y: 1000, view: 'side', face: 1, mouth: 'smile', armB: { x: 680 + sc, y: 720 + Math.cos(T * 17) * 8, hand: 'fist' }, holding: (hx, hy) => rect(hx, hy - 4, 26, 8, P.white) });
  });
  // ---------- 6. THE SECRET PLAN ----------
  shot(wd('but', 45.44), (lt, d) => {
    camera(lt, d, { z0: 1.08, z1: 1.14, x0: 960, x1: 960, y0: 540, y1: 570 });
    room('#7d7466', '#5e564b'); rrect(1180, 150, 560, 400, 14, '#5b6b7d'); rrect(1200, 170, 520, 360, 8, '#d9a383');
    push(1460, 530); ctx.fillStyle = '#6b5a50'; ctx.beginPath(); ctx.arc(0, -150, 90, Math.PI, 0); ctx.fill(); rect(-150, -150, 300, 150, '#6b5a50'); for (let i = 0; i < 4; i++) rect(-120 + i * 70, -120, 30, 120, '#d9a383'); pop();
    const r = person({ ...CAST.murakami, x: 700, y: 1060, h: 640, view: 'front', mouth: 'frown', lookY: 2, tear: T > wd('family', 46.6), armA: { x: 620, y: 880 }, armB: { x: 780, y: 880 } });
    photo(700, 890, -0.05, '#3a3330');
    dateCard('1945', wd('hiroshima', 47.22) - 0.1, 99);
  });
  shot(wd('his', 47.98), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.08 });
    room('#6f7f99', '#4f5a6a'); rrect(260, 140, 1400, 600, 16, '#e6d6ba');
    ell(560, 420, 60, 140, 0.4, '#a7b88a'); ell(1350, 400, 220, 150, 0, '#a7b88a'); circ(1460, 360, 14, P.red);
    const k = eIO((T - wd('steer', 49.16)) / 0.9); ctx.setLineDash([24, 18]); ctx.strokeStyle = P.red; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(600, 400); ctx.quadraticCurveTo(1000, 120, lerp(600, 1450, k), lerp(400, 360, k)); ctx.stroke(); ctx.setLineDash([]);
    sign(980, 560, 560, 140, 'TARGET: NEW YORK', wd('new', 50) - 0.15, { size: 52 });
    person({ ...CAST.murakami, x: 300, y: 1060, view: 'front', mouth: 'flat', brow: 0.3, lookX: 1.5, armB: { x: 520, y: 520, hand: 'point' } });
  });
  shot(wd('with', 50.64), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.1, x0: 1000, x1: 940 });
    room('#4a4f63', '#353a4a');
    amplifier(1040, 900, 1.6, true);
    typeIn(1040 - 192, 900 - 304, 384, 144, 'RESONANCE WAVE AMPLIFIER', wd('machine', 50.88), { size: 40, color: P.ink });
    sign(180, 200, 460, 170, 'REQUIRES:\nNORIKO', wd('noriko', 52.38) - 0.2, { size: 56, color: P.red });
  });
  // ---------- 7. NORIKO'S CHOICE ----------
  shot(wd('koichi', 53.1), (lt, d) => {
    camera(lt, d, { x0: 1060, x1: 860 });
    sky('#2b3350'); stars(40, 11); houses(820, 5); rect(0, 820, W, 260, '#4a4238');
    walker('akiko', 760, 1005, lt, -1, 2.1, { mouth: 'o' }); walker('noriko', 1150, 995, lt, -1, 1.7, { mouth: 'o' }); walker('koichi', 1000, 990, lt, -1, 1.7, { mouth: 'frown', brow: 0.3 });
  });
  shot(wd('but', 54.64), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.1 });
    sky('#5c6280'); ruinCity(13, '#6a6f80'); rect(0, 820, W, 260, '#4b4f5e');
    sign(1200, 160, 600, 170, "NORIKO'S CHOICE", wd('volunteers', 55.06) - 0.3, { size: 60 });
    const st = eOut((T - wd('volunteers', 55.06)) / 0.5);
    person({ ...CAST.noriko, x: 900 + st * 80, y: 1000, view: 'front', mouth: 'flat', brow: -0.1, armA: { x: 840 + st * 80, y: 820 }, armB: { x: 900 + st * 80, y: 760 - st * 20, hand: 'open' }, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, false) });
    person({ ...CAST.koichi, x: 520, y: 1000, view: 'side', face: 1, mouth: 'o', armB: { x: 700 + st * 60, y: 760, hand: 'open' } });
    walker('akiko', 400, 1000, 0, 1, 1, { mouth: 'frown' });
  });
  shot(wd('and', 56.56), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.09, x0: 920, x1: 1000 });
    room('#6f7f99', '#4f5a6a');
    sign(1180, 180, 560, 220, 'REVENGE', wd('talks', 56.9) - 0.1, { size: 96 });
    redX(1460, 290, 240, wd('revenge', 58.32));
    const dn = eOut((T - wd('out', 57.9)) / 0.6);
    person({ ...CAST.murakami, x: 820, y: 1000, view: 'front', mouth: 'frown', lookY: 2 * dn, lookX: -1, armA: { x: 760, y: 860 }, armB: { x: 880, y: 860 } });
    person({ ...CAST.noda, x: 420, y: 1000, view: 'side', face: 1, mouth: 'flat', armB: { x: 700, y: 700, hand: 'open' } });
  });
  // ---------- 8. THE GINZA BATTLE ----------
  shot(wd('the', 59.02), (lt, d) => {
    camera(lt, d, { z0: 1.02, z1: 1.07, x0: 960, x1: 960, y0: 560, y1: 520 });
    sky('#8b8ba6'); ruinCity(17, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    sign(760, 380, 400, 140, 'GINZA', wd('ruins', 60.18) - 0.1, { kind: 'post', post: 300, size: 70 });
    godzilla({ x: walkX(1900, lt * Math.PI * 2 * 0.5, 600, -1), y: 960, s: 0.95, face: -1, walk: lt * Math.PI * 2 * 0.5, mouth: 0.3 });
    const k = eOut(lt / 1.6); ghidorah({ x: lerp(-200, 380, k), y: lerp(500, 960, k), s: 0.75, face: 1, heads: 3, fly: k < 1, mouth: 0.5 });
  });
  shot(wd('godzilla', 61.36), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08 });
    sky('#8b8ba6'); ruinCity(19, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    const off = wd('off', 62.02), torn = T > off;
    ghidorah({ x: 620, y: 960, s: 0.85, face: 1, heads: 3, lost: torn ? 0 : undefined, mouth: 0.7, reach: 0.3 });
    godzilla({ x: 1380, y: 960, s: 0.95, face: -1, mouth: 0.8, headR: torn ? -0.2 : 0 });
    if (torn) { ev('hit', off); const g = T - off; ghHead(lerp(880, 1400, clamp(g)), 300 - Math.sin(clamp(g) * Math.PI) * 200 + Math.max(0, g - 1) * 0, g * 6, { mouth: 0.8 }, 0); puff(900, 380, 130, off, P.white, 7); }
  });
  shot(wd('ghidorah', 63.68), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.09, x0: 1000, x1: 940 });
    sky('#8b8ba6'); ruinCity(23, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    const a = wd('arm', 64.64), bu = wd('buries', 65.08), fall = T > bu ? eOut((T - bu) / 0.6) : 0;
    godzilla({ x: 1250, y: 960 + fall * 120, s: 0.95, face: -1, mouth: 0.9, noArm: T > a, rot: fall * 0.35 });
    ghidorah({ x: 560, y: 960, s: 0.85, face: 1, heads: 3, lost: 0, mouth: 0.8, reach: T < a ? 0.6 : 0.2 });
    if (T > a) { ev('hit', a); puff(1090, 640, 90, a, P.white, 6); }
    if (T > bu) { ev('hit', bu); rubble(1250, 960, (T - bu) / 0.8, 3); }
  });
  // ---------- 9. FIRE AND ICE ----------
  shot(wd('the', 66.34), (lt, d) => {
    camera(lt, d, { z0: 1.02, z1: 1.07, x0: 900, x1: 1000 });
    sky('#8b8ba6'); ruinCity(29, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    const fz = wd('freezes', 66.62), iced = T > wd('nitrogen', 67.86);
    ghidorah({ x: 620, y: 960, s: 0.85, face: 1, heads: 3, lost: 0, frozen: iced, mouth: iced ? 0.2 : 0.6 });
    for (let i = 0; i < 2; i++) { truck(1350 + i * 400, 1000, 0.9, '#5b6379', { f: -1, tank: '#c9dde8' }); stream(1190 + i * 400, 830, 760, 600 + i * 80, '#e6f6fd', fz + i * 0.1); }
    typeIn(1350 - 72, 1000 - 171, 252, 100, 'LIQUID NITROGEN', wd('liquid', 67.66) - 0.2, { size: 30 });
    if (T > fz) ev('whoosh', fz);
  });
  shot(wd('soaks', 68.74), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08 });
    sky('#8b8ba6'); ruinCity(29, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    ghidorah({ x: 620, y: 960, s: 0.85, face: 1, heads: 3, lost: 0, frozen: true });
    truck(1600, 1000, 0.9, '#7a5a3e', { f: -1, tank: '#d6a03a' }); stream(1440, 830, 760, 640, '#c98b2a', wd('soaks', 68.74));
    sign(1150, 160, 520, 160, 'FIRE AND ICE', wd('soaks', 68.74) + 0.1, { size: 64 });
    const tr = wd('triggers', 70.12), pull = eOut((T - tr) / 0.3);
    rect(1240, 860, 30, 140, '#5b5f6e'); push(1255, 870, -0.6 + pull * 1.2); rrect(-8, -110, 16, 110, 8, P.red); pop();
    person({ ...CAST.noda, x: 1120, y: 1000, view: 'side', face: 1, mouth: 'frown', brow: 0.3, armB: { x: 1255 + Math.sin(-0.6 + pull * 1.2) * 100, y: 870 - Math.cos(-0.6 + pull * 1.2) * 100, hand: 'fist' } });
    exclaim(1120, 470, wd('hand', 71.12));
  });
  shot(wd('and', 71.72), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 800, x1: 1000 });
    sky('#8b8ba6'); ruinCity(31, '#6f7385'); rect(0, 640, 760, 440, '#5d6272');
    const r = wd('rocket', 72.32), li = wd('lights', 72.46) + 0.35;
    person({ ...CAST.koichi, x: 420, y: 650, view: 'side', face: 1, mouth: 'frown', brow: 0.3, armB: { x: 560, y: 470, hand: 'fist' }, armA: { x: 520, y: 500 } });
    rrect(380, 400, 280, 44, 20, '#4b5240');
    if (T > r) { ev('whoosh', r); const g = clamp((T - r) / (li - r)); tube([660, 420, lerp(660, 1700, g), lerp(420, 700, g)], 10, '#e6e6e0'); circ(lerp(660, 1700, g), lerp(420, 700, g), 18, P.fireL); }
    if (T > li) { ev('hit', li); for (let i = 0; i < 6; i++) fireBlob(1500 + i * 70, 760 - hash(i) * 100, 1.6, i); }
  });
  shot(wd('but', 73.3), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.12 });
    sky('#c9603a'); ruinCity(37, '#7a4a3a'); rect(0, 820, W, 260, '#5a3a30');
    for (let i = 0; i < 12; i++) fireBlob(200 + i * 140, 760 - hash(i) * 200, 2 + hash(i + 2), i);
    puff(960, 600, 500, wd('blast', 73.44), '#ffd9a0', 11); ev('hit', wd('blast', 73.44));
    const tk = eOut((T - wd('kills', 73.68)) / 0.3);
    person({ ...CAST.koichi, x: 600, y: 1100, h: 560, view: tk > 0.5 ? 'front' : 'back', mouth: 'o', brow: -0.2, armA: { x: 520, y: 820 }, armB: { x: 680, y: 820 } });
    push(1300, 980, 0.3); for (let i = 0; i < 2; i++) { ctx.strokeStyle = P.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-24 + i * 48, 0, 20, 0, 7); ctx.stroke(); } pop();
  });
  // ---------- 10. GODZILLA RISES ----------
  shot(wd('koichi', 74.84), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 900, x1: 1000 });
    sky('#8b8ba6'); ruinCity(41, '#6f7385'); rect(0, 700, 900, 380, '#5d6272');
    const on = T > wd('machine', 76.22), gz = wd('godzilla', 76.88), up = T > gz ? eOut((T - gz) / 0.7) : 0;
    godzilla({ x: 1450, y: 1300 - up * 330, s: 0.9, face: -1, mouth: up * 0.8, glow: on ? 1 : 0, noArm: true });
    for (let i = 0; i < 7; i++) { const g = T > gz ? (T - gz) : 0; push(1300 + i * 70 + (hash(i) - 0.5) * 60 * g * 6, 900 - g * 600 * hash(i + 4) + g * g * 900, g * 4 * (hash(i) - 0.5)); rrect(-60, -40, 120, 80, 10, '#7a7f8f'); pop(); }
    if (T > gz) puff(1450, 820, 220, gz, P.white, 8);
    amplifier(560, 720, 1.0, on);
    person({ ...CAST.noriko, x: 380, y: 720, h: 400, view: 'side', face: 1, mouth: 'flat', eyesClosed: on, armB: { x: 520, y: 560, hand: 'open' }, armA: { x: 500, y: 590, hand: 'open' }, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, on) });
    person({ ...CAST.koichi, x: 200, y: 720, h: 420, view: 'side', face: 1, mouth: 'o' });
    sign(980, 140, 560, 160, 'GODZILLA RISES', wd('koichi', 74.84) + 0.1, { size: 60 });
  });
  shot(wd('but', 77.6), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.12, x0: 960, x1: 960, y0: 560, y1: 520 });
    sky('#8b8ba6'); ruinCity(43, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    const sw = wd('swallowed', 78.9), sp = T > sw + 0.4;
    for (let i = 0; i < 6; i++) { const u = (T * 1.4 + i / 6) % 1; if (T > sw - 0.4) circ(900 + hash(i) * 120, lerp(200, 800, u), 14, GZ.glow); }
    const fly = T > wd('cells', 80.04) - 0.2 ? eIO((T - wd('cells', 80.04) + 0.2) / 0.7) : 0;
    push(960, 820 - fly * 900, 0, 2.2); ghHead(0, 0, -0.2 - fly, { mouth: 0.6, mutant: sp ? 0 : undefined }, 0); pop();
    if (T > sw + 0.4) puff(960, 760, 140, sw + 0.4, GZ.glow, 6);
  });
  shot(wd('now', 80.62), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 900, x1: 1000 });
    sky('#8b8ba6'); ruinCity(47, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    const ht = wd('heat', 82.16);
    ghidorah({ x: 620, y: 960, s: 0.9, face: 1, heads: 3, mutant: 0, mouthAt: i => i === 0 && T > ht ? 0.9 : 0.4, beamAt: i => i === 0 ? clamp((T - ht) / 0.25) : 0, beamL: 1200 });
    if (T > ht) { ev('hit', ht); puff(1800, 380, 120, ht + 0.25, '#ffb070', 6); }
  });
  // ---------- 11. THE LAST BEAM ----------
  shot(wd('beam', 83.44), (lt, d) => {
    camera(lt, d, { z0: 1.0, z1: 1.05 });
    sky('#4d4a66'); ruinCity(53, '#5f5c78'); rect(0, 820, W, 260, '#3f3d52');
    const ls = wd('loses', 84.86), wob = T > ls ? Math.sin((T - ls) * 18) * 0.5 * clamp((T - ls) / 0.6) : 0;
    godzilla({ x: 320, y: 960, s: 0.85, face: 1, mouth: 0.8, glow: 1, noArm: true, breath: clamp(lt / 0.3), breathL: 620 });
    ghidorah({ x: 1640, y: 960, s: 0.8, face: -1, heads: 3, mutant: 0, mouthAt: () => 0.9, beamAt: i => i === 0 ? clamp(lt / 0.3) : 0, beamL: 560, headA: wob });
    if (lt > 0.3) { circ(960, 470 + wob * 100, 60 + Math.sin(T * 30) * 10, P.white); }
  });
  shot(wd('and', 86.74), (lt, d) => {
    camera(lt, d, { z0: 1.02, z1: 1.08 });
    sky('#4d4a66'); ruinCity(53, '#5f5c78'); rect(0, 820, W, 260, '#3f3d52');
    const fi = wd('finishes', 87.32);
    godzilla({ x: 320, y: 960, s: 0.85, face: 1, mouth: 0.9, glow: 1, noArm: true, breath: 1, breathL: 1300 });
    if (T < fi + 0.25) ghidorah({ x: 1640, y: 960, s: 0.8, face: -1, heads: 3, mutant: 0, mouth: 0.9, rot: (T > fi ? 0.4 : 0) });
    if (T > fi) { ev('hit', fi); const e = eOut((T - fi) / 0.6); circ(1600, 600, 500 * e, '#bff1ff'); circ(1600, 600, 340 * e, P.white); }
  });
  shot(wd('the', 88.32), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 900, x1: 1040 });
    sky('#9cb2c4'); ocean(620, '#4d7189', '#5c84a0');
    push(1300 + lt * 120, 700); spikeRow([-80, 0, 0, 0, -10, 0, 70, -5, 0], [80, 110, 80], GZ.sp); ell(0, 20, 260, 40, 0, GZ.b); pop();
    ship(500, 800, 1.1);
    person({ ...CAST.gilbert, x: 420, y: 740, h: 300, view: 'front', mouth: 'smile', lookX: 1.5 });
    sign(140, 200, 640, 200, 'ORDER: KEEP HIM\nAS A WEAPON', wd('let', 88.6) - 0.1, { size: 54 });
  });
  // ---------- 12. ON THE RUN ----------
  shot(wd('and', 91.36), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.1 });
    room('#6f7a6a', '#4e5649'); desk(400, 760, 1100);
    rrect(700, 220, 620, 500, 10, '#e2cfa0'); rect(700, 220, 620, 70, '#cdb882');
    typeIn(700, 220, 620, 70, 'CLASSIFIED', wd('and', 91.36) + 0.1, { size: 40, color: P.red });
    typeIn(900, 320, 400, 300, 'SUBJECT:\nNORIKO\nSHIKISHIMA', wd('noriko', 93.08) - 0.3, { size: 46 });
    push(800, 430); rrect(-80, -100, 160, 200, 6, P.white); circ(0, -20, 48, P.skin); ell(0, -50, 52, 26, 0, '#2a2220'); circ(-14, -20, 5, P.ink); circ(14, -20, 5, P.ink); rrect(-50, 40, 100, 50, 18, '#a65d5d'); gcells(0, -20, 48, true); pop();
    person({ ...CAST.soldier, x: 1600, y: 1000, view: 'front', mouth: 'flat', lookX: -1.5, armA: { x: 1500, y: 760, hand: 'point' } });
  });
  shot(wd('so', 94.18), (lt, d) => {
    camera(lt, d, { x0: 860, x1: 1060 });
    sky('#2b3350'); stars(40, 13); rect(0, 820, W, 260, '#4b4f5e'); rect(0, 820, W, 20, P.amber);
    train(900, 820, 1100);
    sign(160, 190, 420, 150, 'LAST TRAIN', wd('family', 94.94) - 0.2, { kind: 'hang', rope: 140, size: 58 });
    const bag = (hx, hy) => rrect(hx - 30, hy, 60, 50, 8, '#7a5a3e');
    walker('koichi', 200, 1000, lt, 1, 1.1, { mouth: 'flat', holding: bag }); walker('noriko', 60, 1000, lt, 1, 1.1, { mouth: 'flat' }); walker('akiko', 330, 1005, lt, 1, 1.4, { mouth: 'flat' });
  });
  shot(wd('the', 96.44), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.09, x0: 960, x1: 960, y0: 560, y1: 540 });
    rect(0, 0, W, H, '#3f5a4c'); rrect(560, 140, 1300, 520, 20, '#2b3350');
    ctx.save(); ctx.beginPath(); ctx.roundRect(560, 140, 1300, 520, 20); ctx.clip(); for (let i = 0; i < 8; i++) { const x = 1900 - ((T * 600 + i * 260) % 1700); circ(x, 380 + (i % 3) * 50, 10, P.amber); rect(x - 100, 520, 160, 140, '#1f2a40'); } ctx.restore();
    rect(0, 820, W, 260, '#2f4438');
    sign(120, 180, 400, 420, "THE WAR\nIS OVER.\nTHEY STILL\nAREN'T FREE.", wd('war', 96.48) - 0.15, { size: 56 });
    person({ ...CAST.koichi, x: 900, y: 1000, view: 'front', sit: true, seatH: 120, mouth: 'flat', lookX: 1, armB: { x: 1020, y: 820 } });
    person({ ...CAST.akiko, x: 1110, y: 1000, h: 300, view: 'front', sit: true, seatH: 100, mouth: 'smile', eyesClosed: true, nod: 0.3 });
    person({ ...CAST.noriko, x: 1320, y: 1000, view: 'front', sit: true, seatH: 120, mouth: 'flat', lookX: -1, armA: { x: 1200, y: 830 }, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, false) });
  });
}

// ===== frame =====
function frame(t) {
  T = t; screenSpace(); ctx.clearRect(0, 0, W, H);
  let i = SHOTS.length - 1; while (i > 0 && SHOTS[i].start > t) i--;
  const s = SHOTS[i], e = i + 1 < SHOTS.length ? SHOTS[i + 1].start : END;
  ctx.save(); s.fn(t - s.start, e - s.start); ctx.restore();
  screenSpace();
  for (const [k, wt] of WIPES().entries()) { ev('whoosh', wt - 0.2); if (t > wt - 0.2 && t < wt) splat((t - wt + 0.2) / 0.2, k + 1); else if (t >= wt && t < wt + 0.2) splat(1 - (t - wt) / 0.2, k + 1); }
}
