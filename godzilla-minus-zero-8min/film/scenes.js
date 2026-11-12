// ===== shared helpers =====
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function wd(text, near) { const k = norm(text); let best = null; for (const w of WORDS) if (norm(w.w) === k && (best === null || (near !== undefined && Math.abs(w.s - near) < Math.abs(best.s - near)))) best = w; if (!best) throw new Error('word not found: ' + text); if (near !== undefined && Math.abs(best.s - near) > 1.5) throw new Error('word too far: ' + text + ' ' + near); return best.s; }
const gcells = (hx, hy, hr, on) => { const c = on ? GZ.glow : '#5d6f8a'; for (let i = 0; i < 3; i++) tube([hx + hr * 0.2 + i * hr * 0.12, hy + hr * 0.15, hx + hr * 0.32 + i * hr * 0.12, hy + hr * 0.32, hx + hr * 0.22 + i * hr * 0.12, hy + hr * 0.5], hr * 0.05, c); };
const neckMark = (hx, hy, hr) => ell(hx + hr * 0.35, hy + hr * 1.02, hr * 0.2, hr * 0.1, 0.3, '#3b3f55');
Object.assign(CAST, {
  koichi: { hair: 'short', hairC: '#2a2522', top: '#7a6248', pants: '#4f4a42', seed: 21 },
  pilot: { hair: 'helmet', hairC: '#6b4a30', top: '#6b5a40', pants: '#4f4a42', seed: 21 },
  noriko: { hair: 'bob', hairC: '#2a2220', top: '#a65d5d', pants: '#7a4a4a', h: 440, seed: 22 },
  akiko: { hair: 'bob', hairC: '#2a2220', top: '#e0c36a', pants: '#8a6f5a', h: 290, seed: 23 },
  noda: { hair: 'short', hairC: '#3a3330', top: '#6a6f7d', glasses: true, seed: 24 },
  murakami: { hair: 'short', hairC: '#d4d4d4', top: '#e6e6e0', pants: '#7a7a7a', glasses: true, seed: 25 },
  hagiwara: { hair: 'short', hairC: '#2a2522', top: '#d8dde0', pants: '#5b5f6e', seed: 30 },
  aoyama: { hair: 'bob', hairC: '#3a2a24', top: '#5b7a8a', h: 430, seed: 26 },
  sumiko: { hair: 'bob', hairC: '#5a5048', top: '#7a8a6a', h: 420, seed: 31 },
  mizushima: { hair: 'short', hairC: '#2a2522', top: '#5b6f8a', h: 430, seed: 32 },
  akitsu: { hair: 'cap', hairC: '#2f3a52', top: '#3f4a5c', seed: 33 },
  hotta: { hair: 'short', hairC: '#8a8a8a', top: '#4f5a6a', glasses: true, seed: 34 },
  tachibana: { hair: 'cap', hairC: '#6b5a40', top: '#8a7a5a', seed: 35 },
  gilbert: { hair: 'cap', hairC: '#6b7356', top: '#7d8463', seed: 27 },
  soldier: { hair: 'helmet', hairC: '#6b7356', top: '#7d8463', seed: 28 },
  worker: { hair: 'bandana', hairC: '#2a2522', bandC: '#e8e4dc', top: '#8a9aa8', seed: 29, sleeves: 'short' },
});
const wArms = (x, y, h, f, ph, amp = 0.1) => ({ armA: { x: x + f * amp * h * Math.sin(ph), y: y - 0.25 * h }, armB: { x: x - f * amp * h * Math.sin(ph), y: y - 0.25 * h } });
function walker(name, x0, y, lt, f = 1, speed = 1.1, extra = {}) { const c = CAST[name], h = extra.h || c.h || 459, ph = lt * Math.PI * 2 * speed, x = walkX(x0, ph, h, f); return person({ ...c, ...wArms(x, y, h, f, ph), ...extra, x, y, h, view: 'side', face: f, walk: ph }); }
const sky = c => rect(0, 0, W, H, c);
function chalk(x, y, w, h) { rrect(x - 16, y - 16, w + 32, h + 32, 12, '#7a5a3e'); rect(x, y, w, h, '#2f5446'); }
function photo(x, y, a) { push(x, y, a); rrect(-110, -90, 220, 150, 8, P.white); rrect(-94, -74, 188, 118, 6, '#cbd3dc'); for (let i = 0; i < 3; i++) { const px = -50 + i * 50, r = 22; circ(px, -20, r, P.skin); ell(px, -36, r, 12, 0, '#3a3330'); circ(px - 7, -20, 3, P.ink); circ(px + 7, -20, 3, P.ink); rrect(px - 20, 4, 40, 36, 14, '#8a9aa8'); } pop(); }
function ship(x, y, s, fire) { push(x, y, 0, s); poly([-300, 0, 300, 0, 260, 60, -260, 60], '#7d838d'); rect(-120, -60, 200, 60, '#8d939d'); rect(-40, -120, 60, 60, '#9aa1ab'); rect(110, -30, 110, 16, '#5d636d'); rect(-250, -26, 110, 16, '#5d636d'); rect(-10, -170, 12, 50, '#5d636d'); if (fire && Math.floor(T * 6) % 2) { circ(240, -22, 26, P.fireL); circ(-270, -18, 22, P.fireL); } pop(); }
function train(x, y, w) { rrect(x, y - 260, w, 230, 30, '#3f5a4c'); rect(x, y - 140, w, 30, '#c9a45a'); for (let i = 0; i < w / 180 - 1; i++) rrect(x + 50 + i * 180, y - 230, 120, 80, 10, '#f2e2a8'); for (let i = 0; i < w / 300; i++) circ(x + 120 + i * 300, y - 20, 30, '#2e3138'); }
function rubble(x, y, k, seed) { for (let i = 0; i < 9; i++) { const g = Math.max(0, k - i * 0.04); const yy = lerp(y - 700 - hash(i + seed) * 200, y - 40 - (i % 3) * 70, eOut(g * 1.6)); push(x + (hash(i * 5 + seed) - 0.5) * 420, yy, hash(i) * 2 - 1); rrect(-80, -50, 160 + hash(i + 2) * 60, 100, 10, i % 2 ? '#7a7f8f' : '#6a6f7f'); pop(); } }
function stream(x1, y1, x2, y2, c, t0) { if (T < t0) return; const k = eOut((T - t0) / 0.35); for (let i = 0; i < 10; i++) { const u = (i / 10 + T * 2) % 1; if (u > k) continue; circ(lerp(x1, x2, u), lerp(y1, y2, u) - Math.sin(u * Math.PI) * 120, 16 + u * 22, c); } }
function fireBlob(x, y, s, seed) { const k = Math.sin(T * 12 + seed) * 0.12; ell(x, y, 70 * s * (1 + k), 90 * s * (1 - k), 0, P.fire); ell(x, y + 15 * s, 40 * s, 55 * s * (1 + k), 0, P.fireL); }
function baby(x, y) { ell(x, y, 46, 30, 0.3, '#e8e0d0'); circ(x + 30, y - 14, 20, P.skin); circ(x + 36, y - 16, 3, P.ink); }
function shinden(x, y, s, a = 0, f = 1) { push(x, y, a, s * f, s); rrect(-140, -18, 280, 36, 18, '#6f7a62'); poly([60, -10, 110, -10, 80, -100, 40, -100], '#5d6852'); poly([60, 10, 110, 10, 80, 80, 40, 80], '#4f5a46'); poly([-140, -10, -170, -70, -120, -10], '#5d6852'); ell(-20, -18, 34, 16, 0, '#cfe7f0'); circ(-150, 0, 16, '#3a3d4c'); pop(); }
function blink2(x, y, c) { if (Math.floor(T * 3) % 2) circ(x, y, 14, c); }
function cam(lt, d, v = 0, z = 1) { const k = v % 4; const pans = [[880, 1040], [1040, 880], [960, 960], [920, 1000]]; camera(lt, d, { z0: 1.03 * z, z1: 1.075 * z, x0: pans[k][0], x1: pans[k][1], y0: k === 2 ? 560 : 540, y1: k === 2 ? 520 : 540 }); }
const at = (p, s0, def = 0.15) => s0 + (p.ts ?? def);

// ===== scene library: fn(lt, d, p, s0) =====
const SC = {
  head: (lt, d, p, s0) => headline(p.text, s0 + 0.05, lt, d, p.gears ? 'gears' : 'puffs'),
  ginza: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#c9603a'); ruinCity(37, '#7a4a3a'); rect(0, 820, W, 260, '#5a3a30'); for (let i = 0; i < 8; i++) fireBlob(150 + i * 240, 800 - hash(i) * 120, 1.4, i);
    if (p.gz) godzilla({ x: 1350, y: 960, s: 0.95, face: -1, mouth: 0.6, glow: p.glow ? 1 : 0, walk: lt * 3 });
    if (p.pilot) person({ ...CAST.pilot, x: 480, y: 1060, h: 560, view: 'front', mouth: 'flat', brow: 0.3, lookX: 1.5 });
    if (p.sign) sign(140, 150, 500, 150, p.sign, at(p, s0), { size: 60 }); if (p.date) dateCard(p.date, s0 + 0.1, s0 + d); },
  underwater: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#1f3a52'); for (let i = 0; i < 5; i++) ell(hash(i) * W, 120 + i * 60, 400, 30, 0, '#2a4a66'); rect(0, 960, W, 120, '#2a3440');
    godzilla({ x: 1000, y: 760 + (p.sink ? lt * 60 : 0), s: 0.8, face: 1, rot: p.sink ? -0.6 : -0.35, mouth: 0, glow: p.regrow ? 0.4 + 0.4 * Math.sin(T * 5) : 0 });
    for (let i = 0; i < 10; i++) { const u = (T * 0.5 + i / 10) % 1; circ(800 + hash(i) * 500, lerp(800, 0, u), 6 + u * 10, '#8fb0c8'); }
    if (p.regrow) for (let i = 0; i < 6; i++) circ(1000 + Math.cos(i + T * 2) * 160, 600 + Math.sin(i * 1.7 + T * 2) * 120, 14 + 6 * Math.sin(T * 6 + i), GZ.glow);
    if (p.sign) sign(140, 150, 480, 150, p.sign, at(p, s0), { size: 56 }); },
  happy: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#f2c48a'); circ(1500, 400, 120, '#fbe3a6'); houses(820, 2); rect(0, 820, W, 260, '#a8916e');
    sign(1150, 150, 600, 220, 'HAPPY\nENDING?', at(p, s0), { size: 80 }); if (p.x) redX(1450, 260, 260, p.x);
    person({ ...CAST.koichi, x: 600, y: 1000, view: 'front', mouth: 'smile', armB: { x: 760, y: 760 } }); person({ ...CAST.noriko, x: 820, y: 1000, view: 'front', mouth: 'smile', armA: { x: 700, y: 780 } }); },
  danger: (lt, d, p, s0) => { cam(lt, d, p.v); if (p.sky) { sky('#2b3350'); stars(60, 2); houses(820, 4); rect(0, 820, W, 260, '#3e3a36'); push(960 + Math.sin(T * 0.8) * 300, 300, 0, 1); ghidorah({ x: 0, y: 300, s: 0.6, face: 1, heads: 1, fly: true, frozen: false }); pop(); rrect(1150, 600, 120, 100, 8, '#f2e2a8'); }
    else { sky('#6f86a0'); ocean(560, '#3f5a72', '#4d6b86'); ell(960, 820, 360, 80, 0, '#2a3e52'); for (let i = 0; i < 8; i++) circ(800 + hash(i) * 320, 760 + hash(i + 2) * 80, 10 + 8 * Math.sin(T * 6 + i), '#b9c8dd'); } },
  odo: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#d9a383'); rect(0, 760, W, 320, '#8a7a5a'); rect(0, 860, W, 100, '#6f6a5a'); for (let x = 0; x < W; x += 240) rect(x, 905, 120, 10, '#e6d6ba'); ocean(700, '#5d6f8f', '#6f82a3'); rect(0, 760, W, 320, '#8a7a5a'); rect(0, 860, W, 100, '#6f6a5a');
    const k = clamp(lt / 2.2); shinden(lerp(1800, 900, eOut(k)), lerp(500, 860, eOut(k)), 0.9, 0.12 * (1 - k), -1);
    if (p.sign) sign(160, 230, 420, 140, p.sign, at(p, s0), { kind: 'post', post: 380, size: 56 }); if (p.date) dateCard(p.date, s0 + 0.1, s0 + d);
    if (p.mech) person({ ...CAST.tachibana, x: 1550, y: 1000, view: 'front', mouth: 'frown', brow: 0.35, lookX: -1.5, armA: { x: 1470, y: 760 }, armB: { x: 1640, y: 900 } }); },
  cockpit: (lt, d, p, s0) => { cam(lt, d, p.v, 1.04); sky(p.night ? '#2b3350' : '#9fb3c8'); if (p.night) { stars(50, 3); for (let i = 0; i < 5; i++) fireBlob(200 + i * 400, 900, 1.2, i); }
    rrect(260, 360, 1400, 760, 200, '#cfe7f0'); rect(260, 820, 1400, 300, '#5d6852');
    const sh = p.freeze ? Math.sin(T * 40) * 4 : 0; person({ ...CAST.pilot, x: 960 + sh, y: 1250, h: 720, view: 'front', sit: true, seatH: 0, noLegs: true, mouth: p.freeze ? 'o' : 'flat', brow: p.freeze ? -0.3 : 0.2, armA: { x: 840, y: 1020, hand: 'fist' }, armB: { x: 1080, y: 1020, hand: 'fist' } });
    rect(260, 940, 1400, 180, '#4f5a46'); if (p.freeze) exclaim(1300, 420, s0 + 0.4); if (p.sign) sign(1250, 420, 360, 140, p.sign, at(p, s0), { size: 56 }); if (p.x) redX(1430, 490, 200, p.x); },
  baseAttack: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#2b3350'); stars(60, 5); rect(0, 820, W, 260, '#4a4a40'); for (let i = 0; i < 4; i++) { rect(200 + i * 420, 640, 260, 180, '#6a6a5a'); } for (let i = 0; i < 6; i++) fireBlob(160 + i * 320, 800, 1.3, i);
    godzilla({ x: 1250, y: 960, s: 0.7, face: -1, mouth: 0.8, walk: lt * 4 }); walker('worker', 700, 1000, lt, -1, 2, { mouth: 'o' }); },
  survivors: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#d9a383'); rect(0, 820, W, 260, '#6f6a5a'); for (let i = 0; i < 5; i++) fireBlob(200 + i * 380, 820, 0.6, i);
    sign(1150, 160, 600, 180, p.sign || 'SURVIVORS: 2', at(p, s0), { size: 64 });
    person({ ...CAST.pilot, x: 520, y: 1000, view: 'front', mouth: 'frown', lookY: 2, armA: { x: 470, y: 860 }, armB: { x: 580, y: 860 } }); person({ ...CAST.tachibana, x: 900, y: 1000, view: 'side', face: -1, mouth: 'frown', brow: 0.4, armB: { x: 700, y: 760, hand: 'point' } }); },
  tokyo: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#b9a48a'); ruinCity(p.seed || 5, '#8a7a6a'); rect(0, 820, W, 260, '#6f6252');
    if (p.walk) walker('koichi', 300, 1000, lt, 1, 0.8, { mouth: 'frown' });
    if (p.family) { person({ ...CAST.koichi, x: 760, y: 1000, view: 'front', mouth: 'flat', lookX: 1 }); person({ ...CAST.noriko, x: 1080, y: 1000, view: 'front', mouth: 'smile', lookX: -1, armA: { x: 1000, y: 820 }, armB: { x: 1160, y: 820 } }); baby(1080, 820); }
    if (p.sign) sign(1200, 160, 560, 160, p.sign, at(p, s0), { size: 60 }); if (p.x) redX(1480, 240, 220, p.x); },
  alone: (lt, d, p, s0) => { cam(lt, d, p.v, 1.05); sky('#2b3350'); stars(80, 6); rect(0, 820, W, 260, '#3a3a40'); circ(1500, 260, 80, '#e6e2c8');
    person({ ...CAST.koichi, x: 960, y: 1000, view: 'front', sit: true, seatH: 80, mouth: 'frown', lookY: 2, armA: { x: 900, y: 880 }, armB: { x: 1020, y: 880 } }); if (p.sign) sign(140, 180, 600, 180, p.sign, at(p, s0), { size: 56 }); },
  bikini: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#c9d6e0'); ocean(640, '#4d7189', '#5c84a0'); const k = eOut((lt - 0.2) / 1.5);
    if (lt > 0.2) { rect(1300 - 30, 640 - 320 * k, 60, 320 * k, '#f2ead8'); ell(1300, 640 - 340 * k, 220 * k, 110 * k, 0, '#f6efe0'); ell(1300, 640 - 360 * k, 150 * k, 70 * k, 0, '#fff8ea'); ev('hit', s0 + 0.2); }
    ell(700, 800, 200, 40, 0, '#3f5a72'); spikeRow([620, 790, 0, 700, 780, 0, 780, 790, 0], [50, 70, 50], GZ.glow);
    if (p.sign) sign(160, 170, 520, 150, p.sign, at(p, s0), { size: 58 }); },
  blast: (lt, d, p, s0) => { cam(lt, d, p.v, 1.04); sky('#c9603a'); ruinCity(41, '#7a4a3a'); rect(0, 820, W, 260, '#5a3a30'); const k = eOut((lt - 0.8) / 0.6);
    person({ ...CAST.koichi, x: 600 - k * 200, y: 1000, view: 'side', face: -1, lean: -0.3 * k, mouth: 'o' }); person({ ...CAST.noriko, x: 800, y: 1000, view: 'side', face: -1, mouth: 'flat', armB: { x: 650 - k * 100, y: 780, hand: 'open' } });
    if (lt > 0.8) { ev('hit', s0 + 0.8); circ(1600, 600, 1400 * k, '#ffe2b0'); circ(1600, 600, 900 * k, P.white); } },
  nodaPlan: (lt, d, p, s0) => { cam(lt, d, p.v); room('#7b8a8c', '#5a6466'); chalk(560, 150, 1000, 480); typeIn(560, 150, 1000, 480, p.text, at(p, s0), { color: P.white, size: 70 });
    const sc = Math.sin(T * 22) * 8; person({ ...CAST.noda, x: 360, y: 1000, view: 'side', face: 1, mouth: 'smile', armB: { x: 590 + sc, y: 640, hand: 'fist' } }); if (p.koichi) person({ ...CAST.koichi, x: 1700, y: 1000, view: 'front', mouth: 'flat', lookX: -1.5 }); },
  seaPlan: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#9cb2c4'); ocean(560, '#3f5a72', '#4d6b86'); ship(400, 600, 0.6); ship(1500, 620, 0.6);
    const up = p.up ? eIO(lt / 2) : 0; push(960, 900 - up * 260); for (let i = 0; i < 8; i++) circ(Math.cos(i) * 180, Math.sin(i * 2) * 60 - 80, 30, '#c9dde8'); pop();
    ell(960, 900 - up * 260, 220, 70, 0, '#2a3e52'); for (let i = 0; i < 12; i++) { const u = (T * 0.8 + i / 12) % 1; circ(860 + hash(i) * 200, lerp(900, 600, u), 6 + u * 8, '#d8e6ef'); }
    if (p.sign) sign(1180, 150, 600, 150, p.sign, at(p, s0), { size: 54 }); },
  kamikazeRun: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#9cb2c4'); ocean(760, '#3f5a72', '#4d6b86'); godzilla({ x: 1450, y: 1150, s: 1.0, face: -1, mouth: 1, glow: 0.8 });
    const k = clamp(lt / (p.hit ? 0.9 : 3)); shinden(lerp(200, 1180, k), lerp(320, 650, k), 0.7, 0.2);
    if (p.hit && lt > 0.9) { ev('hit', s0 + 0.9); puff(1240, 680, 260, s0 + 0.9, '#ffd9a0', 9); circ(1240, 680, 200 * eOut((lt - 0.9) / 0.4), P.fireL); }
    if (p.chute) { const g = clamp((lt - 1.2) / 2); push(lerp(1100, 700, g), lerp(300, 500, g)); ell(0, -80, 90, 50, 0, P.white); line(-80, -60, 0, 40, 3, '#5b5f6e'); line(80, -60, 0, 40, 3, '#5b5f6e'); circ(0, 50, 24, P.skin); pop(); } },
  hospital: (lt, d, p, s0) => { cam(lt, d, p.v, 1.05); room('#cfd8dc', '#9aa8ae'); window_g(1300, 160, 460, 320, '#9cb2c4');
    rrect(380, 760, 700, 40, 14, '#e9edf2'); rect(400, 800, 18, 140, '#5b5f6e'); rect(1040, 800, 18, 140, '#5b5f6e');
    const r = person({ ...CAST.noriko, x: 700, y: 770, sit: true, seatH: 0, noLegs: true, mouth: 'smile', lookX: 1.5, armA: { x: 620, y: 760 }, armB: { x: 780, y: 760 }, faceExtra: (hx, hy, hr) => { if (p.mark) neckMark(hx, hy, hr); } });
    rrect(380, 730, 700, 70, 30, '#a9b8c9'); person({ ...CAST.koichi, x: 1250, y: 1000, view: 'front', mouth: p.mark ? 'flat' : 'smile', tear: !p.mark, lookX: -1.5, armA: { x: 1150, y: 800 } });
    if (p.mark) { exclaim(560, 360, s0 + 0.6); } if (p.sign) sign(140, 160, 480, 150, p.sign, at(p, s0), { size: 56 }); },
  rebuild: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#a9b8c9'); houses(820, 2); rect(0, 820, W, 260, '#8b7d6a'); scaffold(1380, 380, 360, 440);
    const hm = Math.sin(T * 10); person({ ...CAST.worker, x: 1560, y: 600, h: 300, view: 'side', face: -1, armB: { x: 1470, y: 470 + hm * 40, hand: 'fist' } });
    if (p.family) { walker('koichi', 260, 990, lt, 1, 0.9, { mouth: 'smile' }); walker('noriko', 110, 995, lt, 1, 0.9, { mouth: 'smile' }); walker('akiko', 430, 1000, lt, 1, 1.15, { mouth: 'smile' }); }
    if (p.sign) sign(160, 170, 520, 170, p.sign, at(p, s0), { kind: 'hang', rope: 120, size: 58 }); if (p.date) dateCard(p.date, s0 + 0.1, s0 + d); },
  orphanage: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#b9cad6'); rect(300, 300, 1300, 520, '#c9b48f'); poly([240, 300, 950, 120, 1660, 300], '#6b5446'); rect(820, 560, 220, 260, '#8a6f4c'); rect(0, 820, W, 260, '#8b7d6a');
    sign(720, 360, 420, 130, 'ORPHANAGE', at(p, s0), { size: 50 });
    person({ ...CAST.sumiko, x: 520, y: 1000, view: 'front', mouth: 'smile', armB: { x: 640, y: 860 } }); for (let i = 0; i < 3; i++) person({ ...CAST.akiko, x: 1240 + i * 160, y: 1000, h: 250 + i * 20, view: 'front', mouth: 'smile', seed: 40 + i, top: ['#e0c36a', '#8fb0c8', '#c98a8a'][i], headR: Math.sin(T * 6 + i) * 0.06 });
    if (p.family) { person({ ...CAST.koichi, x: 790, y: 1010, h: 430, view: 'front', mouth: 'smile' }); person({ ...CAST.noriko, x: 1000, y: 1010, h: 410, view: 'front', mouth: 'smile' }); } },
  home: (lt, d, p, s0) => { cam(lt, d, p.v, 1.06); room('#c9b48f', '#a88d6a'); rrect(1240, 120, 580, 700, 6, '#efe5cc'); for (let x = 1240; x < 1820; x += 145) rect(x, 120, 10, 700, '#8a6f4c'); for (let y = 120; y < 820; y += 140) rect(1240, y, 580, 10, '#8a6f4c');
    const on = p.glow && Math.floor(T * 6) % 2;
    if (p.close) person({ ...CAST.noriko, x: 860, y: 1180, h: 680, view: 'front', mouth: p.glow ? 'frown' : 'flat', lookX: -1.5, brow: p.glow ? 0.25 : 0, armB: { x: 1120, y: 860, hand: 'open' }, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, on) });
    else { person({ ...CAST.koichi, x: 600, y: 1000, view: 'front', mouth: 'smile', lookX: 1 }); person({ ...CAST.noriko, x: 900, y: 1000, view: 'front', mouth: 'smile', lookX: -1 }); person({ ...CAST.akiko, x: 1100, y: 1005, view: 'front', mouth: 'laugh', headR: Math.sin(T * 5) * 0.06 }); }
    if (p.sign) sign(150, 170, 440, 200, p.sign, at(p, s0), { size: 60 }); if (p.glow) exclaim(1130, 330, s0 + 0.3); },
  bureau: (lt, d, p, s0) => { cam(lt, d, p.v); room('#6f7f99', '#4f5a6a'); lightStrip(110);
    sign(560, 150, 800, 200, p.sign || 'LARGE-SCALE DISASTER RESPONSE BUREAU', at(p, s0), { size: 46 });
    person({ ...CAST.noda, x: 960, y: 1000, view: 'front', mouth: 'smile', armA: { x: 880, y: 820 }, armB: { x: 1060, y: 700, hand: 'point' } });
    if (p.crew) { const names = ['mizushima', 'akitsu', 'hotta']; names.forEach((n, i) => { const ti = s0 + 0.4 + i * 0.8; if (T > ti) { ev('pop', ti); const s = spring(T - ti); push(300 + i * 520 + (i ? 300 : 0), 1000, 0, 1, s); person({ ...CAST[n], x: 0, y: 0, view: 'front', mouth: 'smile' }); pop(); } }); } },
  meteor: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#2b3350'); stars(120, 4); poly([0, 760, 300, 520, 560, 700, 900, 460, 1240, 690, 1560, 500, 1920, 680, 1920, 1080, 0, 1080], '#3e4a66'); rect(0, 820, W, 260, '#2f3a52');
    const L = s0 + (p.land ?? 0.9), k = clamp((T - (L - 0.7)) / 0.7);
    if (T < L) { const x = lerp(1900, 1150, k), y = lerp(-50, 780, k); tube([x, y, x + 260, y - 280], 30, '#ffb070'); circ(x, y, 34, P.fireL); } else { ev('hit', L); ell(1150, 800, 180, 40, 0, '#1f2840'); circ(1150, 780, 40, '#ff9a5a'); }
    puff(1150, 760, 220, L, '#ffd9a0', 9); if (p.sign) sign(220, 430, 420, 140, p.sign, at(p, s0, 1.0), { kind: 'post', post: 260, size: 56 }); },
  blob: (lt, d, p, s0) => { cam(lt, d, p.v, 1.02); sky('#3a4566'); rect(0, 760, W, 320, '#5a4a3e'); ell(960, 880, 420, 90, 0, '#3f342c');
    const e = s0 + 0.5, g = eOut(lt / d) * (p.big ? 1.6 : 1);
    for (let i = 0; i < 5; i++) { const tx = 300 + i * 330, k = T > e + i * 0.15 ? eIO((T - e - i * 0.15) / 0.6) : 0; if (k < 1) { push(lerp(tx, 960, k), lerp(760, 860, k), 0, 1 - k); poly([0, -220, -80, 0, 80, 0], '#4f6a4a'); rect(-12, 0, 24, 40, '#5b4a3e'); pop(); } }
    blob(960, 860, 60 + g * 120, T); if (p.run) { walker('worker', 520, 980, lt, -1, 2.2, { mouth: 'o' }); exclaim(470, 520, s0 + 0.5); } },
  dragon: (lt, d, p, s0) => { cam(lt, d, p.v, 1.0); sky('#3a4566'); stars(40, 9); rect(0, 820, W, 260, '#5a4a3e');
    const w = eOut(lt / 0.8), sp = s0 + 0.9; ghidorah({ x: 860, y: 900, s: 0.9, face: 1, heads: 1, wings: 0.25 + 0.75 * w, mouth: T > sp ? 0.8 : 0.2, beamAt: () => clamp((T - sp) / 0.25), beamL: 900 }); if (T > sp) { ev('hit', sp); puff(1750, 520, 120, sp + 0.25); } },
  scientists: (lt, d, p, s0) => { cam(lt, d, p.v); room('#7b8a8c', '#5a6466'); chalk(560, 160, 800, 380); typeIn(560, 160, 800, 380, p.text || 'GHIDORAH', at(p, s0, 0.3), { color: P.white, size: p.size || 110 });
    person({ ...CAST.murakami, x: 360, y: 1000, view: 'front', mouth: 'flat', lookX: 1.5, brow: 0.2, armB: { x: 520, y: 640, hand: 'point' } }); person({ ...CAST.hagiwara, x: 1560, y: 1000, view: 'front', mouth: 'o', lookX: -1.5, armA: { x: 1490, y: 820 }, armB: { x: 1620, y: 820 }, holding: (hx, hy) => rrect(hx - 40, hy - 50, 80, 60, 6, P.white) });
    if (p.date) dateCard(p.date, s0 + 0.2, s0 + d); },
  stormMap: (lt, d, p, s0) => { cam(lt, d, p.v); room('#55657e', '#3e4858'); screenBox(360, 140, 1200, 560, '#16283a'); typeIn(360, 140, 1200, 100, p.text || 'LIGHTNING STORMS', at(p, s0), { color: '#7cf0a2', size: 50 });
    ell(900, 450, 250, 200, 0.3, '#22405a'); for (let i = 0; i < 6; i++) { const x = 600 + i * 150, y = 330 + hash(i) * 280; poly([x, y - 30, x - 14, y + 4, x, y + 4, x - 8, y + 34, x + 16, y - 6, x + 2, y - 6], P.amber); if (lt > 0.4 + i * 0.25) circ(x + 30, y, 12, '#ff6b5b'); }
    person({ ...CAST.aoyama, x: 1720, y: 1000, view: 'front', mouth: 'o', lookX: -1.5, armA: { x: 1600, y: 600, hand: 'point' } }); },
  airfield: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#9fb3c8'); rect(0, 760, W, 320, '#6f7a6a'); rect(0, 880, W, 120, '#5b6158'); for (let x = 0; x < W; x += 220) rect(x, 935, 110, 12, '#e6d6ba');
    rect(1250, 260, 600, 500, '#7a8070'); poly([1220, 260, 1550, 130, 1880, 260], '#6a7060'); if (p.sign) sign(1350, 300, 420, 150, p.sign, at(p, s0), { size: 52 });
    fighter(900, 840, 1.1, 0, 1); if (p.walk !== false) walker('pilot', 200, 1000, lt, 1, 0.9, { mouth: 'flat', brow: 0.2 });
    person({ ...CAST.gilbert, x: 1500, y: 1010, view: 'front', mouth: p.shrug ? 'frown' : 'smile', lookX: -1.5, armA: p.shrug ? { x: 1400, y: 740, hand: 'open' } : { x: 1440, y: 700, hand: 'fist' }, armB: p.shrug ? { x: 1600, y: 740, hand: 'open' } : { x: 1560, y: 860 } }); },
  bomberRun: (lt, d, p, s0) => { cam(lt, d, p.v, 0.99); sky('#7e8fae'); poly([0, 700, 400, 520, 960, 760, 1500, 520, 1920, 700, 1920, 1080, 0, 1080], '#5d6a58');
    ghidorah({ x: 960, y: 960, s: 0.7, face: 1, heads: 1, wings: 0.5, mouth: 0 }); const k = clamp(lt / Math.max(d, 2.5)); bomber(lerp(-200, 2100, k), 180, 0.7, 0.02); for (let i = 0; i < 2; i++) fighter(lerp(-400, 1900, k) + i * 180, 330 + i * 60, 0.4, 0.02);
    if (p.hit) { const h = s0 + 0.3; ev('hit', h); const e = eOut((T - h) / 0.5); if (T > h) { circ(960, 720, 420 * e, P.fire); circ(960, 720, 300 * e, P.fireL); circ(960, 720, 160 * e, P.white); } } },
  smoke: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#7e8fae'); for (let i = 0; i < 7; i++) circ(200 + i * 260, 820 - Math.sin(T + i) * 20, 220, '#8a8f98'); rect(0, 900, W, 180, '#5d6a58'); if (p.sign) sign(1250, 160, 560, 160, p.sign, at(p, s0), { size: 60 }); if (p.x) redX(1530, 240, 220, p.x); },
  escorts: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#7e8fae'); for (let i = 0; i < 6; i++) circ(200 + i * 300, 900, 200, '#8a8f98'); rect(0, 900, W, 180, '#5d6a58');
    const wp = s0 + 0.9, up = eOut(lt / 0.6); ghidorah({ x: 600, y: 1000 - up * 200, s: 0.8, face: 1, heads: 1, fly: true, mouth: T > wp ? 0.8 : 0.3, beamAt: () => clamp((T - wp) / 0.2), beamL: 1100, headA: -0.15 });
    for (let i = 0; i < 3; i++) { const hit = T > wp + 0.2 + i * 0.12, g = hit ? T - wp - 0.2 - i * 0.12 : 0; fighter(1300 + i * 200 - lt * 80, 300 + i * 90 + g * g * 600, 0.5, hit ? g * 3 : 0.05, -1); if (hit) puff(1300 + i * 200 - lt * 80, 300 + i * 90, 70, wp + 0.2 + i * 0.12, '#ffd9a0', 5); } },
  harpoons: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#56607a'); rect(0, 820, W, 260, '#4f5a4a'); for (let i = 0; i < 2; i++) { truck(380 + i * 560, 960, 1.1); push(330 + i * 560, 760, -0.5); rrect(-20, -30, 220, 60, 20, '#4b4f5e'); pop(); }
    const hp = s0 + 0.6; for (let i = 0; i < 2; i++) if (T > hp + i * 0.1) { const g = (T - hp - i * 0.1) * 1.6; push(500 + i * 560 + g * 700, 680 - g * 500 + g * g * 120, -0.55); rect(0, -5, 160, 10, '#9aa5b3'); rect(150, -24, 8, 48, '#d0d8e0'); pop(); ev('whoosh', hp + i * 0.1); }
    sign(1250, 200, 560, 160, 'NARUKAMI RODS', at(p, s0, 0.2), { size: 58 }); },
  storm: (lt, d, p, s0) => { cam(lt, d, p.v, 1.01); sky('#2f3550'); for (let i = 0; i < 6; i++) ell(200 + i * 320, 120, 260, 90, 0, '#3d4462'); rect(0, 860, W, 220, '#3f4a3c');
    const hb = s0 + 0.3, fall = p.fall ? eOut(lt / 0.5) : 0; ghidorah({ x: 960, y: 960, s: 0.8, face: 1, heads: 1, rot: -0.5 * fall, mouth: !fall ? 0.9 : 0, headA: fall * 0.6 });
    for (let i = 0; i < 3; i++) rect(880 + i * 90, 600 + i * 20 + fall * 120, 8, 150, '#d0d8e0');
    if (p.bolts && T > hb) { const n = Math.floor((T - hb) / 0.5); if ((T - hb) % 0.5 < 0.3) { ev('hit', hb + n * 0.5); for (let i = 0; i < 3; i++) bolt(800 + i * 200, 0, 884 + i * 90, 600 + i * 20, i + n * 7, 16); } if (T - hb < 0.08) rect(0, 0, W, H, 'rgba(255,255,240,0.35)'); }
    if (p.fall) puff(1000, 900, 200, s0 + 0.4, P.white, 7); },
  king: (lt, d, p, s0) => { cam(lt, d, p.v, 0.99); sky('#4d5470'); ruinCity(7, '#6a6f80'); rect(0, 820, W, 260, '#4b4f5e');
    const up = p.rise ? eOut(lt / 0.8) : 1, three = p.three ? s0 + p.three : -1; const heads = T > three && three > 0 || p.full ? 3 : 1; if (three > 0 && T > three) puff(1180, 330, 150, three, '#ffe9a8', 7);
    ghidorah({ x: 1100, y: 920 + (1 - up) * 250, s: 1.0, face: -1, heads, tails: heads === 3 ? 2 : 1, mouth: 0.6, beamAt: i => p.beam && i === 1 ? clamp((lt - 0.3) / 0.2) : 0, beamL: 420, headA: 0.2 });
    if (p.beam) { const lift = eOut((lt - 0.4) / 1.2); push(420, 820 - lift * 320, lift * 0.3); rect(-120, -300, 240, 300, '#7a7f8f'); for (let r = 0; r < 4; r++) rect(-80, -260 + r * 66, 160, 30, '#5d6272'); pop(); if (lt > 0.4) { ev('whoosh', s0 + 0.4); bolt(760, 520, 450, 620 - lift * 320, Math.floor(T * 18), 12); } }
    if (p.sign) sign(720, 90, 480, 150, p.sign, at(p, s0), { size: 58 }); },
  kozu: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#9cb2c4'); shore(1200, 1920, 600, '#6f8a6a'); ocean(600, '#4d7189', '#5c84a0');
    const bo = clamp(lt / d * 1.5); for (let i = 0; i < 16; i++) { const u = (T * 2 + hash(i)) % 1; if (hash(i + 3) < bo) circ(700 + hash(i) * 600, 760 + hash(i + 5) * 160 - u * 20, 10 + u * 22 * bo, '#cfe2ee'); }
    sign(1450, 330, 360, 130, 'KOZU-SHIMA', at(p, s0, 0.3), { kind: 'post', post: 140, size: 50 }); push(300, 760); poly([-150, 0, 150, 0, 120, 50, -120, 50], '#8a6f4c'); pop(); person({ ...CAST.worker, x: 300, y: 765, h: 280, view: 'front', mouth: bo > 0.5 ? 'o' : 'flat', lookX: 1.5 }); },
  gzRise: (lt, d, p, s0) => { cam(lt, d, p.v, 0.98); sky('#9cb2c4'); const up = eOut(lt / 1.2); godzilla({ x: 1050, y: 1500 - up * 520, s: 1.25, face: -1, mouth: up > 0.8 ? 0.7 : 0.2, glow: lt > 1 ? 1 : 0 });
    ocean(820, '#4d7189', '#5c84a0'); puff(1000, 820, 300, s0 + 0.2, '#e6f2f8', 9); push(300, 860); poly([-150, 0, 150, 0, 120, 50, -120, 50], '#8a6f4c'); pop();
    person({ ...CAST.worker, x: 300, y: 865, h: 280, view: 'front', mouth: 'o', lookX: 1.5, armA: { x: 250, y: 680, hand: 'open' }, armB: { x: 350, y: 680, hand: 'open' } }); exclaim(300, 480, s0 + 0.3); },
  versus: (lt, d, p, s0) => { cam(lt, d, p.v); room('#7b8a8c', '#5a6466'); chalk(640, 240, 980, 520); typeIn(640, 240, 980, 520, p.text || 'GODZILLA\nVS\nGHIDORAH', at(p, s0), { color: P.white, size: 96 });
    const sc = Math.sin(T * 22) * 8; person({ ...CAST.murakami, x: 470, y: 1000, view: 'side', face: 1, mouth: 'smile', armB: { x: 680 + sc, y: 720 + Math.cos(T * 17) * 8, hand: 'fist' } }); },
  memorial: (lt, d, p, s0) => { cam(lt, d, p.v, 1.06); room('#7d7466', '#5e564b'); rrect(1180, 150, 560, 400, 14, '#5b6b7d'); rrect(1200, 170, 520, 360, 8, '#d9a383');
    push(1460, 530); ctx.fillStyle = '#6b5a50'; ctx.beginPath(); ctx.arc(0, -150, 90, Math.PI, 0); ctx.fill(); rect(-150, -150, 300, 150, '#6b5a50'); for (let i = 0; i < 4; i++) rect(-120 + i * 70, -120, 30, 120, '#d9a383'); pop();
    person({ ...CAST.murakami, x: 700, y: 1060, h: 640, view: 'front', mouth: 'frown', lookY: 2, tear: lt > 0.6, brow: p.angry ? 0.4 : 0, armA: { x: 620, y: 880 }, armB: { x: 780, y: 880 } }); photo(700, 890, -0.05); if (p.date) dateCard(p.date, s0 + 0.2, s0 + d); },
  nymap: (lt, d, p, s0) => { cam(lt, d, p.v); room('#6f7f99', '#4f5a6a'); rrect(260, 140, 1400, 600, 16, '#e6d6ba'); ell(560, 420, 60, 140, 0.4, '#a7b88a'); ell(1350, 400, 220, 150, 0, '#a7b88a'); circ(1460, 360, 14, P.red);
    const k = eIO((lt - 0.3) / 1.2); ctx.setLineDash([24, 18]); ctx.strokeStyle = P.red; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(600, 400); ctx.quadraticCurveTo(1000, 120, lerp(600, 1450, k), lerp(400, 360, k)); ctx.stroke(); ctx.setLineDash([]);
    sign(980, 560, 560, 140, 'TARGET: NEW YORK', at(p, s0, 1.2), { size: 52 }); person({ ...CAST.murakami, x: 300, y: 1060, view: 'front', mouth: 'flat', brow: 0.3, lookX: 1.5, armB: { x: 520, y: 520, hand: 'point' } }); },
  amp: (lt, d, p, s0) => { cam(lt, d, p.v); room('#4a4f63', '#353a4a'); amplifier(1040, 900, 1.6, true); typeIn(1040 - 192, 900 - 304, 384, 144, 'RESONANCE WAVE AMPLIFIER', at(p, s0), { size: 40, color: P.ink });
    if (p.sign) sign(180, 200, 460, 170, p.sign, at(p, s0, 0.3), { size: 52, color: P.red }); },
  flee: (lt, d, p, s0) => { cam(lt, d, 1); sky('#2b3350'); stars(40, 11); houses(820, 5); rect(0, 820, W, 260, '#4a4238');
    walker('akiko', 760, 1005, lt, -1, 2.1, { mouth: 'o' }); walker('noriko', 1150, 995, lt, -1, 1.7, { mouth: 'o' }); walker('koichi', 1000, 990, lt, -1, 1.7, { mouth: 'frown', brow: 0.3 }); if (p.sign) sign(1250, 160, 520, 150, p.sign, at(p, s0), { size: 60 }); },
  choice: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#5c6280'); ruinCity(13, '#6a6f80'); rect(0, 820, W, 260, '#4b4f5e'); for (let i = 0; i < 4; i++) fireBlob(1200 + i * 180, 820, 0.5, i);
    if (p.sign) sign(1200, 160, 600, 170, p.sign, at(p, s0), { size: 60 }); const st = p.step ? eOut((lt - 0.3) / 0.5) : 0;
    person({ ...CAST.noriko, x: 900 + st * 80, y: 1000, view: 'front', mouth: 'flat', brow: -0.1, lookX: p.look ? 1.5 : 0, armA: { x: 840 + st * 80, y: 820 }, armB: { x: 900 + st * 80, y: 760 - st * 20, hand: 'open' }, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, false) });
    person({ ...CAST.koichi, x: 520, y: 1000, view: 'side', face: 1, mouth: 'o', armB: { x: 700 + st * 60, y: 760, hand: 'open' } }); },
  talk: (lt, d, p, s0) => { cam(lt, d, p.v); room('#6f7f99', '#4f5a6a'); sign(1180, 180, 560, 220, 'REVENGE', at(p, s0), { size: 96 }); if (p.x) redX(1460, 290, 240, p.x);
    const dn = p.down ? eOut(lt / 0.6) : 0; person({ ...CAST.murakami, x: 820, y: 1000, view: 'front', mouth: 'frown', lookY: 2 * dn, lookX: -1, armA: { x: 760, y: 860 }, armB: { x: 880, y: 860 } }); person({ ...CAST.noda, x: 420, y: 1000, view: 'side', face: 1, mouth: 'flat', armB: { x: 700, y: 700 + Math.sin(T * 3) * 20, hand: 'open' } }); },
  ginzaTrap: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#8b8ba6'); ruinCity(17, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    for (let i = 0; i < 4; i++) { const ti = s0 + 0.3 + i * 0.3; if (T > ti) { ev('pop', ti); push(400 + i * 380, 960, 0, 1, spring(T - ti)); rrect(-90, -160, 180, 160, 14, '#5b6379'); for (let k = 0; k < 3; k++) rect(-60 + k * 50, -200, 20, 40, '#b0b8c8'); blink2(0, -100, GZ.glow); pop(); } }
    sign(760, 300, 400, 140, p.sign || 'GINZA', at(p, s0), { kind: 'post', post: 220, size: 64 }); },
  flyingBoat: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#c9d6e0'); ocean(700, '#4d7189', '#5c84a0'); seaplane(900 + lt * 60, 380 + Math.sin(T * 1.5) * 20, 0.9, 0.03);
    if (p.gz) { push(300 + lt * 90, 760); spikeRow([-80, 0, 0, 0, -10, 0, 70, -5, 0], [80, 110, 80], GZ.glow); ell(0, 20, 260, 40, 0, GZ.b); pop(); }
    if (p.waves) for (let k = 0; k < 3; k++) { const r = ((T * 1.2 + k / 3) % 1) * 500; ctx.strokeStyle = GZ.glow; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(900 + lt * 60, 420, r, 1.2, 2.6); ctx.stroke(); }
    if (p.sign) sign(1300, 120, 520, 150, p.sign, at(p, s0), { size: 52 }); },
  ashore: (lt, d, p, s0) => { cam(lt, d, p.v, 0.99); sky('#8b8ba6'); ruinCity(19, '#6f7385'); rect(0, 820, W, 260, '#4f5262');
    godzilla({ x: walkX(1900, lt * Math.PI * 2 * 0.5, 600, -1), y: 960, s: 0.95, face: -1, walk: lt * Math.PI * 2 * 0.5, mouth: 0.3 }); const k = eOut(lt / 1.6); ghidorah({ x: lerp(-200, 380, k), y: lerp(500, 960, k), s: 0.75, face: 1, heads: 3, fly: k < 1, mouth: 0.5 }); },
  tearHead: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#8b8ba6'); ruinCity(19, '#6f7385'); rect(0, 820, W, 260, '#4f5262'); const off = s0 + (p.off ?? 1.0), torn = T > off;
    ghidorah({ x: 620, y: 960, s: 0.85, face: 1, heads: 3, lost: torn ? 0 : undefined, mouth: 0.7, reach: 0.3 }); godzilla({ x: 1380, y: 960, s: 0.95, face: -1, mouth: 0.8, headR: torn ? -0.2 : 0 });
    if (torn) { ev('hit', off); const g = T - off; ghHead(lerp(880, 1400, clamp(g)), 300 - Math.sin(clamp(g) * Math.PI) * 200, g * 6, { mouth: 0.8 }, 0); puff(900, 380, 130, off, P.white, 7); } },
  biteBury: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#8b8ba6'); ruinCity(23, '#6f7385'); rect(0, 820, W, 260, '#4f5262'); const a = s0 + (p.bite ?? 0.5), bu = p.bury !== undefined ? s0 + p.bury : 1e9, fall = T > bu ? eOut((T - bu) / 0.6) : 0;
    godzilla({ x: 1250, y: 960 + fall * 120, s: 0.95, face: -1, mouth: 0.9, noArm: T > a || p.armGone, rot: fall * 0.35 }); ghidorah({ x: 560, y: 960, s: 0.85, face: 1, heads: 3, lost: 0, mouth: 0.8, reach: T < a ? 0.6 : 0.2, beamAt: i => p.bury !== undefined && i === 1 ? clamp((T - bu + 0.4) / 0.2) : 0, beamL: 500 });
    if (T > a && !p.armGone) { ev('hit', a); puff(1090, 640, 90, a, P.white, 6); } if (T > bu) { ev('hit', bu); rubble(1250, 960, (T - bu) / 0.8, 3); } },
  freeze: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#8b8ba6'); ruinCity(29, '#6f7385'); rect(0, 820, W, 260, '#4f5262'); const iced = p.iced || lt > 1.5;
    ghidorah({ x: 620, y: 960, s: 0.85, face: 1, heads: 3, lost: 0, frozen: iced, mouth: iced ? 0.2 : 0.6 });
    if (p.fuel) { truck(1600, 1000, 0.9, '#7a5a3e', { f: -1, tank: '#d6a03a' }); stream(1440, 830, 760, 640, '#c98b2a', s0 + 0.2); typeIn(1528, 829, 252, 99, 'FUEL', s0 + 0.2, { size: 40 }); }
    else { for (let i = 0; i < 2; i++) { truck(1350 + i * 400, 1000, 0.9, '#5b6379', { f: -1, tank: '#c9dde8' }); stream(1190 + i * 400, 830, 760, 600 + i * 80, '#e6f6fd', s0 + 0.2 + i * 0.1); } typeIn(1278, 829, 252, 99, 'LIQUID NITROGEN', s0 + 0.3, { size: 30 }); ev('whoosh', s0 + 0.2); }
    if (p.sign) sign(140, 140, 600, 160, p.sign, at(p, s0), { size: 58 }); },
  nodaCar: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#8b8ba6'); ruinCity(29, '#6f7385'); rect(0, 820, W, 260, '#4f5262'); ghidorah({ x: 520, y: 960, s: 0.75, face: 1, heads: 3, lost: 0, frozen: true, mouthAt: i => p.wreck && i === 2 ? 0.9 : 0.1, beamAt: i => p.wreck && i === 2 ? clamp((lt - 0.4) / 0.2) : 0, beamL: 800 });
    const cx = p.wreck ? 1400 : lerp(2100, 1400, eOut(lt / 1.2)); push(cx, 1000, p.wreck && lt > 0.6 ? 0.4 : 0); rrect(-160, -120, 320, 90, 30, '#3f4a5c'); rrect(-90, -170, 180, 70, 24, '#4f5a6a'); rrect(-70, -160, 140, 46, 10, '#cfe7f0'); circ(-90, -26, 30, '#2e3138'); circ(90, -26, 30, '#2e3138'); pop();
    if (!p.wreck || lt < 0.6) person({ ...CAST.noda, x: cx, y: 900, h: 220, view: 'front', noLegs: true, noArms: true, mouth: 'frown' });
    if (p.wreck && lt > 0.6) { ev('hit', s0 + 0.6); puff(1400, 920, 160, s0 + 0.6, '#ffd9a0', 8); } if (p.cut) { line(1700, 840, 1900, 860, 14, '#c98b2a'); line(1600, 850, 1660, 845, 14, '#c98b2a'); puff(1680, 845, 50, s0 + 0.4, '#c98b2a', 4); exclaim(1680, 650, s0 + 0.4); } },
  rocket: (lt, d, p, s0) => { cam(lt, d, 1); sky('#8b8ba6'); ruinCity(31, '#6f7385'); rect(0, 640, 760, 440, '#5d6272'); const r = s0 + 0.3, li = s0 + 0.75;
    person({ ...CAST.koichi, x: 420, y: 650, view: 'side', face: 1, mouth: 'frown', brow: 0.3, armB: { x: 560, y: 470, hand: 'fist' }, armA: { x: 520, y: 500 } }); rrect(380, 400, 280, 44, 20, '#4b5240');
    if (T > r) { ev('whoosh', r); const g = clamp((T - r) / (li - r)); tube([660, 420, lerp(660, 1700, g), lerp(420, 700, g)], 10, '#e6e6e0'); circ(lerp(660, 1700, g), lerp(420, 700, g), 18, P.fireL); } if (T > li) { ev('hit', li); for (let i = 0; i < 6; i++) fireBlob(1500 + i * 70, 760 - hash(i) * 100, 1.6, i); } },
  inferno: (lt, d, p, s0) => { cam(lt, d, p.v, 1.04); sky('#c9603a'); ruinCity(37, '#7a4a3a'); rect(0, 820, W, 260, '#5a3a30'); for (let i = 0; i < 12; i++) fireBlob(200 + i * 140, 760 - hash(i) * 200, 2 + hash(i + 2), i);
    if (p.boom) { puff(960, 600, 500, s0 + 0.1, '#ffd9a0', 11); ev('hit', s0 + 0.1); } const tk = eOut((lt - 0.5) / 0.3);
    person({ ...CAST.koichi, x: 600, y: 1100, h: 560, view: tk > 0.5 ? 'front' : 'back', mouth: 'o', brow: -0.2, tear: p.guilt, lookY: p.guilt ? 2 : 0, armA: { x: 520, y: 820 }, armB: { x: 680, y: 820 } }); push(1300, 980, 0.3); for (let i = 0; i < 2; i++) { ctx.strokeStyle = P.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-24 + i * 48, 0, 20, 0, 7); ctx.stroke(); } pop(); },
  lie: (lt, d, p, s0) => { cam(lt, d, p.v, 1.05); sky('#7a5a5a'); ruinCity(43, '#6a5a5a'); rect(0, 820, W, 260, '#4f4242');
    person({ ...CAST.aoyama, x: 720, y: 1000, view: 'front', mouth: p.speak ? 'o' : 'frown', brow: 0.15, lookX: 1.5, armB: { x: 900, y: 760, hand: 'open' } }); person({ ...CAST.koichi, x: 1150, y: 1000, view: 'front', mouth: 'frown', lookY: p.speak ? 0 : 2, lookX: -1.2, tear: true });
    if (p.sign) sign(1150, 150, 620, 170, p.sign, at(p, s0, 0.3), { size: 54 }); },
  revive: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#8b8ba6'); ruinCity(41, '#6f7385'); rect(0, 700, 900, 380, '#5d6272'); const on = lt > 0.5, gz = s0 + (p.rise ?? 1.4), up = T > gz ? eOut((T - gz) / 0.7) : 0;
    godzilla({ x: 1450, y: 1300 - up * 330, s: 0.9, face: -1, mouth: up * 0.8, glow: on ? 1 : 0, noArm: true }); for (let i = 0; i < 7; i++) { const g = T > gz ? (T - gz) : 0; push(1300 + i * 70 + (hash(i) - 0.5) * 60 * g * 6, 900 - g * 600 * hash(i + 4) + g * g * 900, g * 4 * (hash(i) - 0.5)); rrect(-60, -40, 120, 80, 10, '#7a7f8f'); pop(); }
    if (T > gz) puff(1450, 820, 220, gz, P.white, 8); amplifier(560, 720, 1.0, on);
    person({ ...CAST.noriko, x: 380, y: 720, h: 400, view: 'side', face: 1, mouth: 'flat', eyesClosed: on, armB: { x: 520, y: 560, hand: 'open' }, armA: { x: 500, y: 590, hand: 'open' }, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, on) }); person({ ...CAST.koichi, x: 200, y: 720, h: 420, view: 'side', face: 1, mouth: 'o' }); },
  mutantHead: (lt, d, p, s0) => { cam(lt, d, 2, 1.04); sky('#8b8ba6'); ruinCity(43, '#6f7385'); rect(0, 820, W, 260, '#4f5262'); const sp = lt > 0.9;
    for (let i = 0; i < 6; i++) { const u = (T * 1.4 + i / 6) % 1; circ(900 + hash(i) * 120, lerp(200, 800, u), 14, GZ.glow); }
    const fly = p.fly ? eIO((lt - 0.6) / 0.8) : 0; push(960, 820 - fly * 900, 0, 2.2); ghHead(0, 0, -0.2 - fly, { mouth: 0.6, mutant: sp || p.fly ? 0 : undefined }, 0); pop(); if (!p.fly) puff(960, 760, 140, s0 + 0.9, GZ.glow, 6); },
  heatRay: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#8b8ba6'); ruinCity(47, '#6f7385'); rect(0, 820, W, 260, '#4f5262'); const ht = s0 + 0.4;
    ghidorah({ x: 620, y: 960, s: 0.9, face: 1, heads: 3, mutant: 0, mouthAt: i => i === 0 && T > ht ? 0.9 : 0.4, beamAt: i => i === 0 ? clamp((T - ht) / 0.25) : 0, beamL: 1200 }); if (T > ht) { ev('hit', ht); puff(1800, 380, 120, ht + 0.25, '#ffb070', 6); } },
  beams: (lt, d, p, s0) => { cam(lt, d, 2, 0.98); sky('#4d4a66'); ruinCity(53, '#5f5c78'); rect(0, 820, W, 260, '#3f3d52'); const wob = p.wild ? Math.sin(lt * 18) * 0.5 * clamp(lt / 0.6) : 0;
    godzilla({ x: 320, y: 960, s: 0.85, face: 1, mouth: 0.8, glow: 1, noArm: true, breath: clamp(lt / 0.3), breathL: 620 }); ghidorah({ x: 1640, y: 960, s: 0.8, face: -1, heads: 3, mutant: 0, mouthAt: () => 0.9, beamAt: i => i === 0 ? clamp(lt / 0.3) : 0, beamL: 560, headA: wob });
    if (lt > 0.3) circ(960, 470 + wob * 100, 60 + Math.sin(T * 30) * 10, P.white); if (p.rise) godzilla; },
  finish: (lt, d, p, s0) => { cam(lt, d, 2, 1.0); sky('#4d4a66'); ruinCity(53, '#5f5c78'); rect(0, 820, W, 260, '#3f3d52'); const fi = s0 + 0.4;
    godzilla({ x: 320, y: 960, s: 0.85, face: 1, mouth: 0.9, glow: 1, noArm: true, breath: 1, breathL: 1300 }); if (T < fi + 0.25) ghidorah({ x: 1640, y: 960, s: 0.8, face: -1, heads: 3, mutant: 0, mouth: 0.9 });
    if (T > fi) { ev('hit', fi); const e = eOut((T - fi) / 0.6); circ(1600, 600, 500 * e, '#bff1ff'); circ(1600, 600, 340 * e, P.white); } },
  navy: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#9cb2c4'); ocean(620, '#4d7189', '#5c84a0'); const gx = p.leave ? 1300 + lt * 140 : 1300;
    push(gx, 700); spikeRow([-80, 0, 0, 0, -10, 0, 70, -5, 0], [80, 110, 80], GZ.sp); ell(0, 20, 260, 40, 0, GZ.b); pop(); if (p.fire) for (let i = 0; i < 4; i++) puff(1200 + hash(i + Math.floor(T * 3)) * 300, 680, 50, s0 + 0.2 + i * 0.4, '#ffd9a0', 4);
    ship(500, 800, 1.1, p.fire); person({ ...CAST.gilbert, x: 420, y: 740, h: 300, view: 'front', mouth: p.fire ? 'o' : 'smile', lookX: 1.5 }); if (p.sign) sign(140, 200, 640, 200, p.sign, at(p, s0), { size: 54 }); },
  burnNotes: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#5c6280'); ocean(760, '#3f5a72', '#4d6b86'); seaplane(1300, 720, 0.8, 0); for (let i = 0; i < 6; i++) fireBlob(1100 + i * 80, 650, 1.0, i);
    for (let i = 0; i < 5; i++) { const u = (T * 0.7 + i / 5) % 1; push(700 + i * 40, 800 - u * 500, u * 5); rect(-30, -20, 60, 40, u > 0.6 ? P.fire : P.white); pop(); }
    person({ ...CAST.murakami, x: 520, y: 1000, view: 'side', face: 1, mouth: 'frown', armB: { x: 680, y: 780, hand: 'open' } }); if (p.run) walker('hagiwara', 300, 1000, lt, -1, 1.8, { mouth: 'o' }); },
  arrest: (lt, d, p, s0) => { cam(lt, d, p.v); room('#55657e', '#3e4858'); sign(560, 150, 800, 180, 'CLASSIFIED', at(p, s0), { size: 80, color: P.red });
    person({ ...CAST.murakami, x: 820, y: 1000, view: 'front', mouth: 'frown', lookY: 2, armA: { x: 840, y: 860 }, armB: { x: 800, y: 870 } }); person({ ...CAST.hagiwara, x: 1080, y: 1000, view: 'front', mouth: 'o', armA: { x: 1100, y: 860 }, armB: { x: 1060, y: 870 } });
    person({ ...CAST.soldier, x: 480, y: 1000, view: 'side', face: 1, mouth: 'flat', armB: { x: 760, y: 760, hand: 'fist' } }); person({ ...CAST.soldier, x: 1440, y: 1000, view: 'side', face: -1, seed: 51, mouth: 'flat', armB: { x: 1160, y: 760, hand: 'fist' } }); },
  file: (lt, d, p, s0) => { cam(lt, d, p.v); room('#6f7a6a', '#4e5649'); desk(400, 760, 1100); rrect(700, 220, 620, 500, 10, '#e2cfa0'); rect(700, 220, 620, 70, '#cdb882');
    typeIn(700, 220, 620, 70, 'CLASSIFIED', s0 + 0.1, { size: 40, color: P.red }); typeIn(900, 320, 400, 300, p.text || 'SUBJECT:\nNORIKO\nSHIKISHIMA', at(p, s0, 0.4), { size: 46 });
    push(800, 430); rrect(-80, -100, 160, 200, 6, P.white); circ(0, -20, 48, P.skin); ell(0, -50, 52, 26, 0, '#2a2220'); circ(-14, -20, 5, P.ink); circ(14, -20, 5, P.ink); rrect(-50, 40, 100, 50, 18, '#a65d5d'); gcells(0, -20, 48, true); pop();
    person({ ...CAST[p.who || 'soldier'], x: 1600, y: 1000, view: 'front', mouth: 'flat', lookX: -1.5, armA: { x: 1500, y: 760, hand: 'point' } }); },
  leaveAkiko: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#2b3350'); stars(40, 21); rect(300, 300, 1300, 520, '#8a7a62'); poly([240, 300, 950, 120, 1660, 300], '#4f4038'); rect(820, 560, 220, 260, '#f2e2a8'); rect(0, 820, W, 260, '#4a4238');
    const take = p.take ? eOut((lt - 0.3) / 0.6) : 0; person({ ...CAST.akiko, x: 930, y: 1000, view: 'front', mouth: take ? 'smile' : 'frown', tear: !take, lookX: 1.5 * (1 - take) });
    person({ ...CAST.koichi, x: 1350 - take * 250, y: 1000, view: 'front', mouth: take ? 'smile' : 'frown', lookX: -1.5 }); person({ ...CAST.noriko, x: 1560 - take * 300, y: 1000, view: 'front', mouth: take ? 'smile' : 'frown', lookX: -1.5, armA: { x: 1440 - take * 400, y: 840, hand: 'open' } }); if (p.sign) sign(140, 150, 520, 150, p.sign, at(p, s0), { size: 56 }); },
  station: (lt, d, p, s0) => { cam(lt, d, 0); sky('#2b3350'); stars(40, 13); rect(0, 820, W, 260, '#4b4f5e'); rect(0, 820, W, 20, P.amber); train(900, 820, 1100); sign(160, 190, 420, 150, p.sign || 'LAST TRAIN', at(p, s0), { kind: 'hang', rope: 140, size: 58 });
    const bag = (hx, hy) => rrect(hx - 30, hy, 60, 50, 8, '#7a5a3e'); walker('koichi', 200, 1000, lt, 1, 1.1, { mouth: 'flat', holding: bag }); walker('noriko', 60, 1000, lt, 1, 1.1, { mouth: 'flat' }); walker('akiko', 330, 1005, lt, 1, 1.4, { mouth: 'flat' }); },
  trainRide: (lt, d, p, s0) => { cam(lt, d, 2); rect(0, 0, W, H, '#3f5a4c'); rrect(560, 140, 1300, 520, 20, '#2b3350'); ctx.save(); ctx.beginPath(); ctx.roundRect(560, 140, 1300, 520, 20); ctx.clip(); for (let i = 0; i < 8; i++) { const x = 1900 - ((T * 600 + i * 260) % 1700); circ(x, 380 + (i % 3) * 50, 10, P.amber); rect(x - 100, 520, 160, 140, '#1f2a40'); } ctx.restore(); rect(0, 820, W, 260, '#2f4438');
    if (p.sign) sign(120, 180, 400, 420, p.sign, at(p, s0), { size: 56 }); person({ ...CAST.koichi, x: 900, y: 1000, view: 'front', sit: true, seatH: 120, mouth: 'flat', lookX: 1, armB: { x: 1020, y: 820 } }); person({ ...CAST.akiko, x: 1110, y: 1000, h: 300, view: 'front', sit: true, seatH: 100, mouth: 'smile', eyesClosed: true, nod: 0.3 }); person({ ...CAST.noriko, x: 1320, y: 1000, view: 'front', sit: true, seatH: 120, mouth: 'flat', lookX: -1, armA: { x: 1200, y: 830 }, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, false) }); },
  compare: (lt, d, p, s0) => { cam(lt, d, 2); room('#6a6f80', '#4b4f5e'); sign(160, 180, 760, 300, p.a, at(p, s0), { size: 56 }); if (p.b) sign(1000, 180, 760, 300, p.b, s0 + (p.tb ?? 0.15), { size: 56 });
    if (p.who === 'k') person({ ...CAST.pilot, x: 540, y: 1000, view: 'front', mouth: 'frown', lookY: 2 }); else { person({ ...CAST.koichi, x: 1200, y: 1000, view: 'front', mouth: 'flat' }); person({ ...CAST.noriko, x: 1420, y: 1000, view: 'front', mouth: 'flat' }); person({ ...CAST.akiko, x: 1600, y: 1005, view: 'front', mouth: 'flat' }); } },
  marquee: (lt, d, p, s0) => { cam(lt, d, p.v); sky('#2b3350'); stars(50, 31); rect(260, 240, 1400, 640, '#7a3a3a'); rect(300, 280, 1320, 340, '#f2e2a8'); for (let i = 0; i < 24; i++) circ(300 + i * 57, 262, 9, Math.floor(T * 4 + i) % 2 ? P.amber : '#8a6a3a'); rect(0, 880, W, 200, '#3a3a48');
    typeIn(300, 280, 1320, 340, p.text, at(p, s0), { size: 64, color: '#7a3a3a' });
    if (p.oscar) { push(1700, 880); rect(-50, -40, 100, 40, '#5b4a3e'); rrect(-18, -300, 36, 260, 16, '#e3b84a'); circ(0, -320, 30, '#e3b84a'); pop(); }
    if (p.count) counter(560, 640, 800, 200, 0, p.count, s0 + 0.3, s0 + 1.6, p.suffix || '', { color: P.white, size: 110 });
    walker('koichi', 100, 1000, lt, 1, 0.7, { mouth: 'smile', h: 380 }); },
  outro: (lt, d, p, s0) => { cam(lt, d, 2); sky('#4d4a66'); ruinCity(61, '#5f5c78'); rect(0, 820, W, 260, '#3f3d52'); godzilla({ x: 1600, y: 960, s: 0.6, face: -1, mouth: 0.3, glow: 0.5 }); ghidorah({ x: 300, y: 960, s: 0.45, face: 1, heads: 3, mouth: 0.4 });
    sign(560, 140, 800, 240, p.text, at(p, s0), { size: 60 }); person({ ...CAST.koichi, x: 820, y: 1000, view: 'front', mouth: 'flat', lookX: p.lk || 0 }); person({ ...CAST.noriko, x: 1060, y: 1000, view: 'front', mouth: 'flat', lookX: p.lk ? -p.lk : 0, faceExtra: (hx, hy, hr) => gcells(hx, hy, hr, false) }); },
};
function window_g(x, y, w, h, c) { rrect(x - 16, y - 16, w + 32, h + 32, 20, '#5b6b7d'); rrect(x, y, w, h, 12, c); }
