// ===== word clock =====
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function wd(text, near) { const k = norm(text); let best = null; for (const w of WORDS) if (norm(w.w) === k && (best === null || (near !== undefined && Math.abs(w.s - near) < Math.abs(best.s - near)))) best = w; if (!best) throw new Error('word not found: ' + text); if (near !== undefined && Math.abs(best.s - near) > 0.5) throw new Error('word too far: ' + text + ' ' + near); return best.s; }
const END = 91.5;
const WIPES = () => [wd('when'), wd('the', 39.76), wd('and', 55.32), wd('ripley', 70.02), wd('so', 83.32)];

// helpers
const wArms = (x, y, h, f, ph, amp = 0.1) => ({ armA: { x: x + f * amp * h * Math.sin(ph), y: y - 0.25 * h }, armB: { x: x - f * amp * h * Math.sin(ph), y: y - 0.25 * h } });
function walker(name, x0, y, lt, f = 1, speed = 1.1, extra = {}) {
  const c = CAST[name], h = extra.h || c.h || 459, ph = lt * Math.PI * 2 * speed, x = walkX(x0, ph, h, f);
  return person({ ...c, ...wArms(x, y, h, f, ph), ...extra, x, y, h, view: 'side', face: f, walk: ph });
}
function bed(x, y, w) { rrect(x, y, w, 40, 14, '#e9edf2'); rect(x, y + 34, w, 20, '#b9c3cf'); rect(x + 20, y + 54, 18, 90, '#5b5f6e'); rect(x + w - 38, y + 54, 18, 90, '#5b5f6e'); }
function desk(x, y, w) { rect(x, y, w, 30, '#8a7560'); rect(x, y + 30, w, 12, '#6f5d4b'); rect(x + 20, y + 42, 22, 200, '#6f5d4b'); rect(x + w - 42, y + 42, 22, 200, '#6f5d4b'); }
function chair(x, y, f = 1) { rect(x - 60, y, 120, 22, '#3f4a5c'); rect(x - f * 60 - 10, y - 160, 22, 180, '#3f4a5c'); rect(x - 8, y + 22, 16, 100, '#323b4a'); }
function window_(x, y, w, h) { rrect(x - 16, y - 16, w + 32, h + 32, 20, '#5b6b7d'); rrect(x, y, w, h, 12, P.night); ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.clip(); ctx.translate(x, y); ctx.scale(w / W, h / H); stars(80, 3); ctx.restore(); }
function earth(x, y, r) { circ(x, y, r, '#4f86a8'); ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ell(x - r * 0.3, y - r * 0.2, r * 0.4, r * 0.25, 0.4, '#8fb07a'); ell(x + r * 0.35, y + r * 0.3, r * 0.3, r * 0.2, -0.3, '#8fb07a'); circ(x + r * 0.5, y + r * 0.2, r * 0.9, 'rgba(20,30,60,0.25)'); ctx.restore(); }
function resinWall(c1 = '#4a5070', c2 = '#596084') { rect(0, 0, W, H, c1); for (let i = 0; i < 26; i++) { const x = hash(i) * W; tube([x, -20, x + 40 * Math.sin(i), 300, x - 30, 600, x + 20, 1100], 26 + hash(i + 4) * 30, c2); } for (let i = 0; i < 40; i++) ell(hash(i + 50) * W, hash(i + 70) * H, 30, 12, hash(i) * 3, '#22253b'); }
function fireBlob(x, y, s, seed) { const k = Math.sin(T * 12 + seed) * 0.12; ell(x, y, 70 * s * (1 + k), 90 * s * (1 - k), 0, P.fire); ell(x, y + 15 * s, 40 * s, 55 * s * (1 + k), 0, P.fireL); }

// ===== shots =====
const SHOTS = [];
const shot = (start, fn) => SHOTS.push({ start, fn });

function build() {
  SHOTS.length = 0;
  // ---------- 1. FIFTY-SEVEN YEARS OF LOSS ----------
  shot(0, (lt, d) => {
    camera(lt, d, { z0: 1.0, z1: 1.08, x0: 900, x1: 1000 });
    rect(0, 0, W, H, P.night); stars(160, 1); earth(1600, 1150, 480);
    const sx = 760 + lt * 30, sy = 520 + Math.sin(lt) * 10;
    push(sx, sy, -0.06 + lt * 0.02);
    rrect(-330, -120, 660, 240, 110, '#dfe4ea'); rrect(-330, 30, 660, 90, 60, '#c3cbd5'); rect(320, -50, 60, 100, '#9aa5b3');
    circ(-170, -10, 78, '#2b3a56'); // window
    ctx.save(); ctx.beginPath(); ctx.arc(-170, -10, 72, 0, 7); ctx.clip();
    person({ ...CAST.ripley, x: -170, y: 250, h: 300, eyesClosed: true, noArms: true, nod: 0.5 }); ctx.restore();
    rrect(-40, -70, 300, 110, 14, P.white);
    counter(-40, -70, 220, 110, 0, 57, wd('after'), wd('years') + 0.4, '', { size: 72 });
    if (T > wd('years')) typeIn(150, -70, 110, 110, 'YRS', wd('years'), { size: 40, pad: 0.05 });
    pop();
    dateCard('2179', wd('wakes'), wd('earth') - 0.3);
  });
  shot(wd('earth'), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.09, x0: 900, x1: 960 });
    room(P.slate, P.floor); window_(1180, 150, 560, 380); push(1180, 150); ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, 560, 380, 12); ctx.clip(); earth(300, 220, 140 + lt * 8); ctx.restore(); pop();
    sign(140, 170, 560, 220, 'FIFTY-SEVEN YEARS OF LOSS', wd('earth') + 0.05, { size: 60 });
    bed(380, 760, 640);
    const k = eOut((T - wd('moved')) / 0.4);
    person({ ...CAST.ripley, x: 600, y: 770, sit: true, seatH: 0, noLegs: true, lookX: 2 * k, headR: 0.1 * k, mouth: 'o', armA: { x: 520, y: 760 }, armB: { x: 690, y: 760 } });
    rrect(380, 730, 640, 70, 30, '#a9b8c9');
  });
  shot(wd('and'), (lt, d) => {
    camera(lt, d, { z0: 1.12, z1: 1.2, x0: 960, x1: 960, y0: 520, y1: 560 });
    room(P.slateD, P.floor);
    const fr = [[260, wd('grew')], [1500, wd('old')], [1500, wd('died')]];
    sign(150, 190, 460, 170, 'HER DAUGHTER', wd('daughter') - 0.05, { size: 60 });
    // pictures pop onto the wall, one per word
    const icon = (x, y, t0, kind) => { if (T < t0) return; ev('pop', t0); push(x, y, 0, spring(T - t0)); rrect(-90, -90, 180, 180, 16, '#e6d6ba'); rrect(-74, -74, 148, 148, 10, P.white);
      if (kind === 0) { poly([-34, -50, 34, -50, 0, 0], P.orange); poly([-34, 50, 34, 50, 0, 0], P.orange); rect(-40, -58, 80, 10, P.ink); rect(-40, 48, 80, 10, P.ink); }
      else if (kind === 1) { circ(0, -22, 26, P.skin); ell(0, -30, 36, 22, 0, '#d8d4cc'); rrect(-36, 8, 72, 50, 20, '#9aa5b3'); }
      else { poly([0, 50, -52, -6, -30, -40, 0, -20], P.red); poly([0, 50, 52, -6, 30, -40, 4, -20], P.red); poly([0, -20, 10, 0, -6, 14, 4, 50], P.white); } pop(); };
    icon(1340, 240, wd('grew'), 0); icon(1600, 240, wd('old'), 1); icon(1470, 470, wd('died'), 2);
    const dk = eOut((T - wd('died')) / 0.5);
    const r = person({ ...CAST.ripley, x: 900, y: 980, h: 640, sit: true, seatH: 0, noLegs: true, lookY: 2 + dk, headR: 0, mouth: dk > 0.2 ? 'frown' : 'flat', tear: dk > 0.5, armA: { x: 820, y: 900 + dk * 30 }, armB: { x: 980, y: 900 + dk * 30 }, brow: 0.25 * dk });
    push(900, 910 + dk * 30, -0.05); rrect(-120, -100, 240, 160, 8, P.white); rrect(-104, -84, 208, 128, 6, '#cbd3dc');
    hair({ hair: 'long', hairC: '#7a4b34', view: 'front' }, 0, -30, 34, 'back'); circ(0, -30, 34, P.skin); hair({ hair: 'long', hairC: '#7a4b34', view: 'front' }, 0, -30, 34, 'front'); circ(-12, -30, 4, P.ink); circ(12, -30, 4, P.ink); pop();
  });
  // ---------- 2. WHO STARTED THE OUTBREAK? ----------
  shot(wd('meanwhile'), (lt, d) => {
    camera(lt, d, { x0: 1000, x1: 900 });
    room('#6f7f99', '#4f5a6a'); lightStrip(110);
    sign(120, 170, 640, 230, 'WHO STARTED THE OUTBREAK?', wd('meanwhile') + 0.05, { size: 58 });
    rrect(1430, 250, 300, 380, 12, '#5a6880'); rect(1460, 280, 240, 60, '#e6d6ba'); typeIn(1460, 280, 240, 60, 'COMPANY', wd('company'), { size: 34 });
    chair(860, 700, 1); desk(1000, 640, 480);
    screenBox(1110, 420, 280, 180, '#1e2a3a'); typeIn(1110, 420, 280, 180, 'SEND COLONY FAMILY\nTO GRID 46', wd('sends') - 0.2, { color: '#7cf0a2', size: 32 });
    const ty = Math.sin(T * 18) * 6;
    person({ ...CAST.burke, x: 860, y: 822, view: 'side', face: 1, sit: true, seatH: 122, mouth: 'smile', armA: { x: 1040, y: 630 + ty }, armB: { x: 1070, y: 632 - ty } });
  });
  shot(wd('one'), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.08, x0: 800, x1: 1100 });
    rect(0, 0, W, H, '#8d8fb0'); poly([0, 640, 300, 420, 520, 560, 820, 380, 1100, 560, 1400, 400, 1700, 520, 1920, 450, 1920, 700, 0, 700], '#6f7198');
    push(1450, 600); ctx.fillStyle = '#2e3048'; ctx.beginPath(); ctx.moveTo(-220, 40); ctx.quadraticCurveTo(-200, -230, -40, -260); ctx.lineTo(-20, 40); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(220, 40); ctx.quadraticCurveTo(200, -230, 40, -260); ctx.lineTo(20, 40); ctx.closePath(); ctx.fill(); pop();
    rect(0, 640, W, 440, '#b9ad98'); rect(0, 640, W, 30, '#a89c88');
    for (let i = 0; i < 5; i++) ell((hash(i) * W + T * 60 * (1 + i * 0.3)) % (W + 600) - 300, 650 + i * 30, 380, 40, 0, 'rgba(230,226,240,0.45)');
    sign(260, 440, 380, 150, 'DERELICT\n2 KM', wd('derelict'), { kind: 'post', post: 260, size: 48 });
    walker('father', 620, 960, lt, 1, 0.9, { h: 420, mouth: 'smile' }); walker('mother', 470, 965, lt, 1, 0.9, { h: 400 });
    walker('tim', 800, 975, lt, 1, 1.15, { h: 300 }); walker('newt', 340, 980, lt, 1, 1.2, { h: 280 });
  });
  shot(wd('the', 13.54), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.12, x0: 900, x1: 860, y0: 540, y1: 520 });
    room(P.teal, '#4b5d63'); lightStrip(110, '#dff0ee');
    rrect(500, 620, 640, 40, 14, '#e9edf2'); rect(560, 660, 20, 160, '#5b5f6e'); rect(1060, 660, 20, 160, '#5b5f6e');
    push(1120, 640, -Math.PI / 2); const r = person({ ...CAST.father, x: 0, y: 0, h: 420, eyesClosed: true, nod: 0, armA: { x: -80, y: -150 }, armB: { x: 80, y: -150 } }); pop();
    const fh = wd('something'); if (T > fh) { ev('pop', fh); const s = spring(T - fh); facehugger({ x: 1120 - 420 * 0.8, y: 640, s: 1.3 * s, rot: Math.PI / 2, grip: true }); puff(1120 - 336, 640, 90, fh); }
    const sh = T > fh ? eOut((T - fh) / 0.25) : 0;
    person({ ...CAST.mother, x: 1360, y: 900, h: 430, view: 'front', mouth: sh > 0.2 ? 'o' : 'flat', lookX: -2, armA: { x: 1250, y: 680 - sh * 90, hand: 'open' }, armB: { x: 1470, y: 680 - sh * 90, hand: 'open' }, lean: -0.08 * sh });
    person({ ...CAST.newt, x: 1600, y: 905 - Math.max(0, Math.sin(clamp((T - fh) / 0.4) * Math.PI)) * 50, view: 'front', mouth: sh > 0.2 ? 'o' : 'flat', lookX: -2, armA: { x: 1550, y: 680 - sh * 40 }, armB: { x: 1650, y: 680 - sh * 40 } });
    exclaim(1600, 470, fh + 0.05);
  });
  // ---------- 3. THE MARINES DON'T BELIEVE HER ----------
  shot(wd('when'), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.1 });
    room('#55657e', '#3e4858');
    screenBox(560, 160, 800, 360, '#cfe7f0');
    const off = T > wd('stops') + 0.3; if (off) rrect(560, 160, 800, 360, 8, '#1e2a3a');
    typeIn(560, 160, 800, 360, "HADLEY'S HOPE\nNO SIGNAL", wd('stops'), { color: off ? '#ff6b5b' : P.ink, size: 84 });
    circ(1500, 200, 30, Math.floor(T * 3) % 2 ? '#ff6b5b' : '#7a3030');
    desk(520, 700, 880);
    person({ ...CAST.gorman, x: 960, y: 1000, h: 459, view: 'back', armA: { x: 870, y: 700 }, armB: { x: 1050, y: 700 } });
  });
  shot(wd('the', 17.62), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.07, x0: 900, x1: 1060 });
    room('#6d7a6a', '#4e5649'); for (let x = 0; x < W; x += 320) rect(x, 82, 40, 738, '#5d6a5b');
    sign(620, 150, 680, 170, 'COLONIAL MARINES', wd('colonial'), { kind: 'hang', rope: 150, size: 66 });
    dropship(1500, 560, 0.9);
    const ck = T > wd('cocky');
    ['vasquez', 'hudson', 'hicks', 'apone'].forEach((n, i) => {
      const ph = lt * Math.PI * 2 * 1.0, f = 1, h = CAST[n].h || 459, x = walkX(160 + i * 230, ph, h, f);
      const flex = ck && n === 'hudson' ? { armA: { x: x - 60, y: 980 - h * 0.75, hand: 'fist' }, armB: { x: x + 70, y: 980 - h * 0.78, hand: 'fist' }, mouth: 'laugh' } : {};
      person({ ...CAST[n], ...wArms(x, 980, h, f, ph), x, y: 980, h, view: 'side', face: f, walk: ph, mouth: ck ? 'laugh' : 'smile', ...flex });
    });
  });
  shot(wd('ripley', 20.58), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.1, x0: 960, x1: 900 });
    room('#6d7a6a', '#4e5649');
    sign(900, 160, 840, 150, "THE MARINES DON'T BELIEVE HER", wd('ripley', 20.58) + 0.05, { size: 54 });
    sign(140, 160, 520, 260, 'EASY JOB', wd('tags'), { size: 90 });
    redX(400, 290, 230, wd("isn't"));
    const rx = 420;
    person({ ...CAST.ripley, x: rx, y: 1000, view: 'front', mouth: 'frown', brow: 0.3, lookX: 1.5, armA: { x: rx + 55, y: 760, hand: 'fist' }, armB: { x: rx - 55, y: 775, hand: 'fist' } });
    ['hudson', 'apone', 'vasquez'].forEach((n, i) => { const b = Math.abs(Math.sin(T * 9 + i)) * 0.06; person({ ...CAST[n], x: 1000 + i * 290, y: 1000, view: 'front', mouth: 'laugh', headR: b * (i % 2 ? 1 : -1), lookX: -1.5, armA: { x: 940 + i * 290, y: 830 - b * 400 }, armB: { x: 1060 + i * 290, y: 760 + b * 200, hand: 'fist' } }); });
  });
  // ---------- 4. THE CHILD WHO SURVIVED ----------
  shot(wd('inside'), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.07, x0: 860, x1: 1060 });
    room('#2f3a52', '#262f42'); for (let x = 100; x < W; x += 360) panelWall(x, 180, 260, 520, '#34405a');
    screenBox(1400, 230, 340, 170, '#16283a'); typeIn(1400, 230, 340, 170, 'LIFE SIGNS: 1', wd('one', 25.58), { color: '#7cf0a2', size: 46 });
    const ph = lt * Math.PI * 2 * 0.8, x = walkX(420, ph, 459, 1);
    ctx.fillStyle = 'rgba(255,248,214,0.22)'; ctx.beginPath(); ctx.moveTo(x + 120, 690); ctx.lineTo(x + 1100, 420 + Math.sin(T * 2) * 60); ctx.lineTo(x + 1100, 900 + Math.sin(T * 2) * 60); ctx.closePath(); ctx.fill();
    walker('hicks', 220, 960, lt, 1, 0.8);
    person({ ...CAST.ripley, ...wArms(x, 960, 459, 1, ph), x, y: 960, view: 'side', face: 1, walk: ph, armB: { x: x + 120, y: 690 }, holding: (hx, hy) => { rrect(hx - 10, hy - 18, 60, 30, 8, '#4b4f5e'); } });
  });
  shot(wd('a', 26.74), (lt, d) => {
    camera(lt, d, { z0: 1.08, z1: 1.14, x0: 960, x1: 980, y0: 560, y1: 540 });
    room('#34405a', '#262f42');
    rrect(640, 300, 640, 420, 20, '#1b2233');
    const t0 = wd('little'), k = eOut((T - t0) / 0.5);
    ctx.save(); ctx.beginPath(); ctx.rect(640, 300, 640, 420); ctx.clip();
    person({ ...CAST.newt, x: 960, y: 720 + 300 * (1 - k) + 120, h: 420, view: 'front', lookX: Math.sin(T * 1.5) * 1.5, mouth: 'flat', armA: { x: 880, y: 760 }, armB: { x: 1050, y: 700 }, holding: () => { } });
    push(1060, 700); circ(0, 0, 34, '#d9b98e'); rrect(-30, 20, 60, 70, 20, '#c08a74'); circ(-10, -4, 4, P.ink); circ(10, -4, 4, P.ink); pop();
    ctx.restore();
    if (T < t0) { for (let i = 0; i < 8; i++) rect(660, 320 + i * 50, 600, 24, '#8d99ab'); }
    else { ev('whoosh', t0); const g = T - t0; push(640 + 320 - g * 300, 720 + Math.min(240, g * g * 900), -g * 2.2); for (let i = 0; i < 8; i++) rect(-300, -400 + i * 50, 600, 24, '#8d99ab'); pop(); }
    exclaim(1340, 330, wd('girl'));
    sign(1380, 520, 380, 120, 'AIR VENT 7', wd('air') - 0.2, { size: 48 });
  });
  shot(wd('ripley', 29.28), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.1, x0: 940, x1: 980 });
    room('#3a4762', '#2b3447');
    sign(560, 150, 800, 170, 'THE CHILD WHO SURVIVED', wd('ripley', 29.28) + 0.05, { size: 62 });
    const rk = eOut((T - wd('swears')) / 0.5), nod = T > wd('safe') ? Math.sin((T - wd('safe')) * 10) * 0.12 * Math.exp(-(T - wd('safe')) * 2) : 0;
    person({ ...CAST.ripley, x: 720, y: 960, view: 'side', face: 1, sit: true, seatH: 60, mouth: 'smile', armB: { x: 820 + rk * 160, y: 760, hand: 'open' } });
    person({ ...CAST.newt, x: 1180, y: 960, h: 320, view: 'side', face: -1, mouth: rk > 0.8 ? 'smile' : 'flat', headR: nod, armB: { x: 1130 + 20 * Math.sin(T * 2), y: 840 }, armA: { x: 1150, y: 850 } });
  });
  // ---------- 5. THE REACTOR MISTAKE ----------
  shot(wd('the', 31.72), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.08 });
    room('#3e4a55', '#2e3640');
    screenBox(300, 120, 1320, 640, '#16283a');
    typeIn(300, 120, 1320, 110, 'COLONIST SIGNALS', wd('the', 31.72) + 0.1, { color: '#7cf0a2', size: 56 });
    for (const [x, y, w, h] of [[400, 300, 220, 140], [700, 260, 300, 200], [1100, 300, 200, 160], [450, 520, 260, 160], [1050, 520, 420, 200]]) rrect(x, y, w, h, 10, '#22405a');
    rrect(1120, 560, 280, 120, 10, '#37506b'); typeIn(1120, 560, 280, 120, 'REACTOR', wd('reactor'), { color: P.amber, size: 40 });
    for (let i = 0; i < 14; i++) { const k = eIO((T - wd('signals') - i * 0.05) / 1.4); circ(lerp(380 + hash(i) * 1150, 1220 + hash(i + 5) * 90, k), lerp(270 + hash(i + 2) * 440, 600 + hash(i + 8) * 50, k), 11, '#ff6b5b'); }
    person({ ...CAST.ripley, x: 500, y: 1180, h: 520, view: 'back', armA: { x: 420, y: 940 }, armB: { x: 590, y: 940 } });
    person({ ...CAST.gorman, x: 1400, y: 1180, h: 520, view: 'back', armA: { x: 1320, y: 940 }, armB: { x: 1470, y: 860, hand: 'point' } });
  });
  shot(wd('one', 34.1), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.1, x0: 1000, x1: 940 });
    room('#4a4f63', '#353a4a');
    rrect(1150, 100, 520, 720, 60, '#6f7891'); rrect(1260, 180, 300, 560, 40, '#3c435a'); rrect(1300, 220, 220, 480, 30, `hsl(190,70%,${55 + 10 * Math.sin(T * 6)}%)`);
    for (let y = 160; y < 800; y += 120) rect(1150, y, 520, 18, '#5b6379');
    screenBox(140, 160, 520, 220, P.white); typeIn(140, 160, 520, 220, 'DO NOT FIRE', wd('one', 34.1) + 0.1, { color: P.red, size: 80 });
    const up = eOut((T - wd('bullet')) / 0.3);
    person({ ...CAST.hudson, x: 820, y: 1000, view: 'side', face: 1, mouth: 'flat', armB: { x: 990, y: 660 - up * 40, hand: 'fist' }, armA: { x: 930, y: 700 - up * 40 }, holding: (hx, hy, a) => rifle(hx - 40, hy, -0.15 * up, 1) });
    exclaim(860, 420, wd('blow'));
  });
  shot(wd('so', 35.88), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.1, x0: 920, x1: 1000 });
    room('#565e48', '#3e4436');
    sign(560, 140, 800, 160, 'THE REACTOR MISTAKE', wd('so', 35.88) + 0.05, { size: 64 });
    rrect(820, 640, 300, 60, 10, '#3f4434');
    const g = wd('ammo'), k = eIO((T - g) / 0.5);
    person({ ...CAST.gorman, x: 1450, y: 980, view: 'front', mouth: 'flat', lookX: -1.5, armA: { x: 1350, y: 700, hand: 'point' }, armB: { x: 1520, y: 860 } });
    person({ ...CAST.apone, x: 1100, y: 990, view: 'side', face: -1, mouth: 'frown', brow: 0.2, armB: { x: 980, y: 760, hand: 'open' } });
    person({ ...CAST.hicks, x: 560, y: 1000, view: 'side', face: 1, mouth: 'frown', armB: { x: 660 + 200 * k, y: 760, hand: 'fist' }, holding: (hx, hy) => rrect(hx - 8, hy - 34, 18, 40, 4, '#3f4434') });
    if (T > wd('collected')) ev('ding', wd('collected'));
  });
  shot(wd('then'), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.12, x0: 960, x1: 960, y0: 520, y1: 480 });
    resinWall();
    const e = clamp((T - wd('moving')) / 0.6);
    xeno({ x: 980, y: 760 + 30 * (1 - e), s: 1.3, face: -1, mouth: e, crouch: 0.3, reach: e });
    ['hudson', 'vasquez'].forEach((n, i) => { const tk = eOut((T - wd('walls') - i * 0.12) / 0.3); person({ ...CAST[n], x: 400 + i * 1100, y: 1120, h: 520, view: tk > 0.5 ? 'front' : 'back', mouth: 'o', lookX: (i ? -1 : 1) * 1.5, armA: { x: 330 + i * 1100, y: 850 }, armB: { x: 480 + i * 1100, y: 850 } }); });
    exclaim(400, 540, wd('moving')); exclaim(1500, 540, wd('moving') + 0.12);
  });
  // ---------- 6. THE MARINES ARE DEFEATED ----------
  shot(wd('the', 39.76), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.09, x0: 1000, x1: 900 });
    room('#4a3c48', '#352c36');
    sign(120, 130, 760, 170, 'THE MARINES ARE DEFEATED', wd('the', 39.76) + 0.1, { size: 56 });
    for (let i = 0; i < 7; i++) fireBlob(1100 + i * 120, 760 - hash(i) * 120, 1.2 + hash(i + 3), i);
    ['hudson', 'apone', 'vasquez'].forEach((n, i) => { const back = lt * 60; const fl = Math.floor(T * 10 + i) % 2; person({ ...CAST[n], x: 400 + i * 220 - back, y: 1000, view: 'side', face: 1, lean: -0.12, mouth: 'o', armB: { x: 540 + i * 220 - back, y: 760, hand: 'fist' }, armA: { x: 500 + i * 220 - back, y: 790 }, holding: (hx, hy) => { rifle(hx - 30, hy, -0.1); if (fl) circ(hx + 110, hy - 4, 22, P.fireL); } }); });
  });
  shot(wd('ripley', 41.24), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 800, x1: 1100 });
    room('#4a4f63', '#353a4a');
    const dt = wd('in', 41.66); const doorK = T > dt ? eOut((T - dt) / 0.4) : 0;
    if (doorK < 1) { push(1250, 820, doorK * 1.4); rect(-30, -560, 140, 560, '#6f7891'); pop(); }
    puff(1290, 600, 200, dt);
    const ax = lerp(-500, 1000, eOut((T - wd('drives')) / 1.2));
    apc(ax, 900, 1.1);
    const rk = T > wd('drags');
    walker('hicks', 1500, 980, rk ? lt - 1 : 0, -1, 1.6, { mouth: 'o', walk: rk ? undefined : undefined });
    walker('hudson', 1700, 990, rk ? lt - 1 : 0, -1, 1.6, { mouth: 'o' });
  });
  shot(wd('then', 43.9), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08 });
    rect(0, 0, W, H, '#2b3350'); stars(60, 5); rect(0, 760, W, 320, '#3e4560'); for (let x = 0; x < W; x += 200) rect(x, 790, 120, 10, P.amber);
    const c = wd('crashes'), k = clamp((T - wd('dropship')) / (c - wd('dropship')));
    if (T < c) dropship(lerp(1700, 1300, k), lerp(150, 700, k * k), 0.8, 0.2 + k * 0.6);
    else { for (let i = 0; i < 6; i++) fireBlob(1200 + i * 80, 760 - hash(i) * 80, 1.6, i); }
    puff(1300, 700, 300, c, '#ffd9a0', 9); if (T > c) ev('hit', c);
    const j = T > c ? Math.max(0, Math.sin(clamp((T - c) / 0.45) * Math.PI)) * 60 : 0;
    person({ ...CAST.ripley, x: 300, y: 1000 - j, view: 'front', mouth: T > c ? 'o' : 'flat', lookX: 1.5, armA: { x: 220, y: 720 - j }, armB: { x: 380, y: 700 - j } });
    person({ ...CAST.newt, x: 520, y: 1000 - j, view: 'front', mouth: T > c ? 'o' : 'flat', lookX: 1.5 });
    person({ ...CAST.hicks, x: 720, y: 1000 - j * 0.8, view: 'front', mouth: T > c ? 'o' : 'flat', lookX: 1.5 });
    exclaim(520, 560, c + 0.05);
  });
  // ---------- 7. THEY CAME THROUGH THE CEILING ----------
  shot(wd('trapped'), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 900, x1: 1020 });
    room('#3e4558', '#2c3140');
    screenBox(130, 130, 520, 230, '#16283a'); typeIn(130, 130, 520, 90, 'SENTRY A — ROUNDS', wd('sentry') - 0.2, { color: '#7cf0a2', size: 36 });
    counter(130, 210, 520, 150, 500, 12, wd('chew'), wd('wave', 51.3) + 0.3, '', { color: '#7cf0a2', size: 96 });
    sentry(500, 980, T > wd('guns'), 1.2); sentry(780, 1010, T > wd('guns') + 0.1, 1.2);
    for (let i = 0; i < 5; i++) { const ph = (T * 0.5 + i * 0.37) % 1; xeno({ x: 1900 - ph * 700, y: 860 + i * 20, s: 0.7, face: -1, crouch: 0.4, mouth: 0.5, seed: i, rot: ph > 0.8 ? -(ph - 0.8) * 4 : 0 }); if (ph > 0.75) puff(1900 - ph * 700 + 40, 760, 60, T - (ph - 0.75) * 2, P.white, 3); }
  });
  shot(wd('but'), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.12, x0: 960, x1: 960, y0: 560, y1: 520 });
    room('#3e4558', '#2c3140');
    rect(0, 0, W, 250, '#556079'); sign(420, 120, 1080, 100, 'THEY CAME THROUGH THE CEILING', wd('inside', 54.04) - 0.4, { size: 50 });
    const up = eOut((T - wd('inside', 54.04)) / 0.3);
    person({ ...CAST.hudson, x: 960, y: 1200, h: 640, view: 'front', mouth: 'o', lookY: -2 * up, headR: 0, brow: -0.2, armA: { x: 820, y: 940 }, armB: { x: 1100, y: 940 } });
    const dots = []; for (let i = 0; i < 6; i++) { const k = clamp((T - wd('tracker') + i * 0.2) / 3); dots.push([(hash(i) - 0.5) * 220 * (1 - k), -60 + 120 * k + hash(i + 2) * 20]); }
    tracker(960, 1010, 1.0, dots);
    exclaim(1240, 520, wd('inside', 54.04));
  });
  // ---------- 8. BURKE IS THE REAL TRAITOR ----------
  shot(wd('and', 55.32), (lt, d) => headline('BURKE IS THE REAL TRAITOR', wd('and', 55.32) + 0.05, lt, d, 'puffs'));
  shot(wd('burke', 57.14), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.1, x0: 900, x1: 1000 });
    room('#6f7f99', '#4f5a6a');
    screenBox(700, 160, 900, 420, '#1e2a3a'); typeIn(700, 160, 900, 420, 'ORDER SENT BY:\nBURKE, C.', wd('burke', 57.14) + 0.05, { color: '#7cf0a2', size: 80 });
    const tk = eOut((T - wd('ship', 58.36)) / 0.3);
    person({ ...CAST.ripley, x: 420, y: 1000, view: tk > 0.5 ? 'front' : 'side', face: 1, mouth: tk > 0.5 ? 'frown' : 'flat', brow: 0.35 * tk, armB: { x: 560, y: 800 }, armA: { x: 480, y: 820 } });
  });
  shot(wd('and', 58.8), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 900, x1: 1000 });
    room('#5b7f80', '#43605f');
    sign(120, 150, 520, 220, 'TRUST THE\nCOMPANY', wd('and', 58.8) + 0.05, { size: 66 });
    redX(380, 260, 220, wd('newt', 62.14));
    for (const [x, i] of [[860, 0], [1120, 1]]) { rrect(x - 90, 300, 180, 460, 40, '#a9d7d6'); rrect(x - 90, 300, 180, 60, 20, '#7b8b9a'); rect(x - 100, 760, 200, 60, '#5b6379'); if (!(i === 0 && T > wd('smuggled'))) facehugger({ x, y: 520 + Math.sin(T * 2 + i) * 20, s: 0.9, seed: i }); typeIn(x - 100, 760, 200, 60, 'SPECIMEN', wd('specimen') + i * 0.1, { color: P.white, size: 30 }); }
    const lid = eOut((T - wd('wants', 59.04)) / 0.4);
    rrect(770 + lid * 150, 280, 180, 30, 10, '#5b6379');
    if (T > wd('smuggled')) { const k = eOut((T - wd('smuggled')) / 1.2); facehugger({ x: lerp(860, 1480, k), y: lerp(330, 860, k) - Math.sin(k * Math.PI) * 200, s: 0.8, rot: k * 6 }); }
    bed(1300, 780, 520);
    const wk = T > wd('ripley', 61.4);
    person({ ...CAST.ripley, x: 1450, y: 790, sit: true, seatH: 0, noLegs: true, eyesClosed: !wk, mouth: wk ? 'o' : 'flat', lookX: -1.5, armA: { x: 1380, y: 760 }, armB: { x: 1520, y: 760 } });
    person({ ...CAST.newt, x: 1680, y: 790, sit: true, seatH: 0, noLegs: true, eyesClosed: !wk, mouth: wk ? 'o' : 'flat', lookX: -1.5 });
    rrect(1300, 760, 520, 60, 26, '#a9b8c9');
    person({ ...CAST.burke, x: 620, y: 1000, view: 'side', face: 1, mouth: 'smile', armB: { x: 780 + lid * 120, y: 640, hand: 'open' } });
    exclaim(1450, 400, wd('ripley', 61.4));
  });
  // ---------- 9. THE COLONY COLLAPSES ----------
  shot(wd('then', 62.74), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.1, x0: 960, x1: 960, y0: 500, y1: 560 });
    room('#3e4558', '#2c3140'); rect(0, 0, W, 140, '#556079');
    const c = wd('ceiling');
    for (let i = 0; i < 6; i++) { const t0 = wd('pour') + i * 0.12, g = Math.max(0, T - t0); push(200 + i * 300, 70 + Math.min(900, g * g * 1800), g * (i % 2 ? 2 : -2)); rect(-110, -40, 220, 80, '#6b7590'); pop(); if (T > t0) rect(90 + i * 300, 30, 220, 80, '#1b2030'); }
    for (let i = 0; i < 3; i++) { const t0 = c - 0.3 + i * 0.15, k = clamp((T - t0) / 0.3); if (T > t0) { const sq = T > t0 + 0.3 ? 1 + 0.25 * Math.exp(-(T - t0 - 0.3) * 10) : 1; push(400 + i * 560, lerp(-200, 900, k), 0, 1, 1 / sq); xeno({ x: 0, y: 0, s: 1, face: i % 2 ? 1 : -1, mouth: 0.6, crouch: 0.6, seed: i }); pop(); if (k >= 1) puff(400 + i * 560, 880, 120, t0 + 0.3, P.white, 5); } }
  });
  shot(wd('marines', 64.68), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.09, x0: 1000, x1: 900 });
    room('#3e4558', '#2c3140');
    sign(1100, 140, 700, 170, 'THE COLONY COLLAPSES', wd('marines', 64.68), { size: 60 });
    xeno({ x: 1450, y: 940, s: 1.2, face: -1, mouth: 0.8, reach: 0.5 + 0.5 * Math.sin(T * 4) });
    const ac = wd('acid'), fl = T > ac ? eOut((T - ac) / 0.2) : 0;
    person({ ...CAST.hicks, x: 760, y: 1000, view: 'front', lean: -0.12 * fl, mouth: fl ? 'o' : 'frown', eyesClosed: fl > 0.5 && fl < 1 && (T - ac) < 0.6, armA: { x: 700, y: 640 - fl * 80, hand: 'open' }, armB: { x: 840, y: 650 - fl * 80, hand: 'open' } });
    if (T > ac) { for (let i = 0; i < 4; i++) puff(740 + i * 30, 720 + (i % 2) * 40, 40, ac + i * 0.12, '#d7f07a', 4); ev('hit', ac); }
    person({ ...CAST.vasquez, x: 330, y: 1060, view: 'side', face: 1, lean: -0.5 * eOut((T - wd('fall')) / 0.5), mouth: 'o', armB: { x: 460, y: 700 }, holding: (hx, hy) => rifle(hx - 30, hy, -0.4) });
  });
  shot(wd('and', 67.74), (lt, d) => {
    camera(lt, d, { z0: 1.06, z1: 1.12, x0: 960, x1: 960, y0: 520, y1: 600 });
    room('#2f3a52', '#232b3c');
    rect(560, 820, 800, 260, '#141a28'); for (let i = 0; i < 9; i++) rect(580 + i * 88, 820, 22, 260, '#4b566e');
    const k = eIO((T - wd('dragged')) / 0.8);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 820); ctx.clip();
    person({ ...CAST.newt, x: 1000, y: 900 + k * 500, view: 'front', mouth: 'o', lookY: -2, armA: { x: 930, y: 500 + k * 400, hand: 'open' }, armB: { x: 1080, y: 480 + k * 400, hand: 'open' } });
    ctx.restore();
    person({ ...CAST.ripley, x: 520, y: 1000, view: 'side', face: 1, lean: 0.2, mouth: 'o', armB: { x: 860 - k * 40, y: 700 + k * 100, hand: 'open' }, armA: { x: 800, y: 720 } });
    exclaim(1000, 300, wd('dragged'));
    sign(1450, 220, 360, 120, 'SUB-LEVEL 3', wd('down', 68.48) - 0.1, { size: 44 });
  });
  // ---------- 10. MOTHER AGAINST MOTHER ----------
  shot(wd('ripley', 70.02), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 800, x1: 1100 });
    resinWall('#54496e', '#655985');
    for (let i = 0; i < 8; i++) egg({ x: 900 + i * 140, y: 930 + (i % 2) * 40, s: 1.1, open: 0 });
    walker('ripley', 160, 1000, lt, 1, 0.7, { mouth: 'frown', brow: 0.3, armB: { x: 0, y: 0 }, holding: undefined });
    const ph = lt * Math.PI * 2 * 0.7, x = walkX(160, ph, 459, 1); flamer(x + 70, 760, 0, false);
  });
  shot(wd('and', 71.82), (lt, d) => {
    camera(lt, d, { z0: 1.02, z1: 1.08, x0: 1100, x1: 960, y0: 560, y1: 500 });
    resinWall('#54496e', '#655985');
    const q = wd('queen', 72.66), r = eOut((T - q + 0.4) / 0.8);
    tube([1150, 580 - r * 200, 1500, 560, 1900, 620], 160, '#c9bfa5'); for (let i = 0; i < 8; i++) ell(1250 + i * 85, 580 - r * 80 + Math.sin(i + T * 3) * 6, 30, 70, 0, '#b3a88c');
    xeno({ x: 1000, y: 1000 + (1 - r) * 200, s: 1.9, face: -1, queen: true, extraArms: true, mouth: clamp((T - q) / 0.3), seed: 9 });
    for (let i = 0; i < 6; i++) egg({ x: 160 + i * 150, y: 1010, s: 1.2, open: i === 2 ? 0.5 + 0.5 * Math.sin(T * 3) : 0 });
    if (T > q) ev('hit', q);
  });
  shot(wd('one', 73.36), (lt, d) => headline('MOTHER AGAINST MOTHER', wd('one', 73.36) + 0.05, lt, d, 'gears'));
  shot(wd('ripley', 74.8), (lt, d) => {
    camera(lt, d, { z0: 1.04, z1: 1.09, x0: 960, x1: 860 });
    resinWall('#54496e', '#655985');
    const b = wd('burns');
    for (let i = 0; i < 7; i++) { egg({ x: 900 + i * 140, y: 980, s: 1.1 }); if (T > b + i * 0.08) fireBlob(900 + i * 140, 880, 1.3, i); }
    const run = T > wd('runs') - 0.3, lt2 = run ? T - wd('runs') + 0.3 : 0;
    if (!run) { person({ ...CAST.ripley, x: 560, y: 1000, view: 'side', face: 1, mouth: 'frown', brow: 0.35, armB: { x: 680, y: 760 }, armA: { x: 640, y: 780 } }); flamer(640, 760, 0, T > b); }
    else { walker('ripley', 560, 1000, lt2, -1, 1.8, { mouth: 'o' }); walker('newt', 700, 1000, lt2, -1, 2.2, { mouth: 'o' }); }
    if (T > b) ev('whoosh', b);
  });
  // ---------- 11. THE QUEEN'S LAST TRICK ----------
  shot(wd('bishop'), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08 });
    rect(0, 0, W, H, '#5d5878'); rect(0, 760, W, 320, '#433f5a');
    rect(380, 380, 120, 380, '#3a3650'); rect(560, 480, 260, 280, '#3a3650'); rrect(860, 300, 160, 460, 30, '#3a3650');
    const e = wd('explodes');
    if (T > e) { ev('hit', e); const k = eOut((T - e) / 0.8); circ(640, 600, 900 * k, '#ffd9a0'); circ(640, 600, 620 * k, P.white); }
    const k = eIO((T - wd('flies')) / 2.4); dropship(lerp(900, 2100, k), lerp(700, 150, k), 0.8, -0.25);
  });
  shot(wd('but', 80.12), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.09, x0: 900, x1: 1000 });
    room('#7a8093', '#5b6070');
    screenBox(240, 140, 660, 200, '#1e2a3a'); typeIn(240, 140, 660, 200, "THE QUEEN'S LAST TRICK", wd('but', 80.12) + 0.05, { color: '#7cf0a2', size: 54 });
    const dp = (T * 0.9) % 1; ell(1200, 420 + dp * 380, 10, 14, 0, '#d7f07a');
    person({ ...CAST.bishop, x: 1200, y: 1000, view: 'front', mouth: 'smile', armA: { x: 1120, y: 860 }, armB: { x: 1280, y: 860 } });
    person({ ...CAST.ripley, x: 500, y: 1000, view: 'front', mouth: 'smile', armA: { x: 450, y: 800 }, armB: { x: 640, y: 760 } });
    person({ ...CAST.newt, x: 680, y: 1000, view: 'front', mouth: 'smile' });
  });
  shot(wd('she', 81.66), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.12, x0: 1100, x1: 1000 });
    room('#7a8093', '#5b6070');
    const h = wd('half'), k = T > h ? eOut((T - h) / 0.5) : 0;
    xeno({ x: 1500, y: 1000, s: 1.8, face: -1, queen: true, mouth: 0.7, reach: 0.6 + 0.3 * k, seed: 3 });
    // Bishop: legs stay, top half lifted (android, white fluid puffs)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 860, W, 300); ctx.clip(); person({ ...CAST.bishop, x: 1000, y: 1000, view: 'front', mouth: 'o', nod: 0 }); ctx.restore();
    ctx.save(); ctx.translate(k * 200, -k * 260); ctx.rotate(k * 0.3); ctx.beginPath(); ctx.rect(-500, 0, W + 500, 860); ctx.clip(); person({ ...CAST.bishop, x: 1000, y: 1000, view: 'front', mouth: 'o', nod: 0, lookX: 1.5, armA: { x: 900, y: 680 + k * 100, hand: 'open' }, armB: { x: 1100, y: 640 } }); ctx.restore();
    if (T > h) { puff(1000, 860, 110, h, P.white, 8); ev('hit', h); }
    exclaim(1000, 380, wd('tears'));
  });
  // ---------- 12. THE FINAL BATTLE ----------
  shot(wd('so', 83.32), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.08, x0: 900, x1: 1060 });
    room('#6a6f80', '#4b4f5e');
    const dk = eOut((T - wd('straps')) / 0.6); rect(160 - dk * 400, 120, 400, 700, '#8b7a3a'); rect(560 + dk * 400, 120, 400, 700, '#8b7a3a'); for (let i = 0; i < 6; i++) { poly([160 - dk * 400 + i * 66, 780, 200 - dk * 400 + i * 66, 780, 180 - dk * 400 + i * 66, 820, 140 - dk * 400 + i * 66, 820], P.ink); }
    sign(1240, 160, 600, 170, 'THE FINAL BATTLE', wd('so', 83.32) + 0.1, { size: 64 });
    const ph = Math.max(0, T - wd('power')) * Math.PI * 2 * 0.8; loader(560 + ph / (2 * Math.PI) * 160, 1000, 1.05, T, { walk: ph });
  });
  shot(wd('throws'), (lt, d) => {
    camera(lt, d, { z0: 1.03, z1: 1.07, x0: 900, x1: 1100 });
    room('#6a6f80', '#4b4f5e');
    const a = wd('airlock'), ok = eOut((T - a) / 0.4);
    rect(1300, 120, 620, 700, '#3a3f50'); push(1300, 120); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 620, 700); ctx.clip(); rect(0, 0, 620, 700, P.night); ctx.scale(620 / W, 700 / H); stars(60, 7); ctx.restore(); pop();
    rect(1300, 120 - ok * 700, 620, 700, '#8b7a3a');
    sign(820, 200, 420, 120, 'AIRLOCK', wd('the', 86.42) - 0.3, { size: 46 });
    const pk = eOut((T - wd('throws')) / 0.25) * (1 - eOut((T - wd('throws') - 0.4) / 0.4));
    const qk = T > a ? eIO((T - a) / 0.9) : 0;
    if (qk < 1) xeno({ x: lerp(1250, 2300, qk), y: lerp(1000, 400, qk), s: 1.6 * (1 - qk * 0.6), face: -1, queen: true, mouth: 0.9, rot: qk * 3, seed: 5 });
    loader(560, 1000, 1.05, T, { arm: pk });
    if (T > a) ev('whoosh', a);
  });
  shot(wd('and', 87.3), (lt, d) => {
    camera(lt, d, { z0: 1.05, z1: 1.1, x0: 960, x1: 960, y0: 580, y1: 560 });
    room('#7a8093', '#5b6070'); window_(1250, 170, 520, 360); push(1250, 170); ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, 520, 360, 12); ctx.clip(); earth(260, 330, 220); ctx.restore(); pop();
    sign(140, 150, 860, 260, 'THIS TIME, SHE\nKEPT HER CHILD.', wd('this', 87.42) + 0.02, { size: 74 });
    person({ ...CAST.ripley, x: 820, y: 1090, h: 560, view: 'front', sit: true, seatH: 0, noLegs: true, mouth: 'smile', lookX: 1, eyesClosed: T > wd('child') + 0.2 && T < wd('child') + 1.4, armA: { x: 760, y: 1000 } , armB: { x: 1010, y: 960 } });
    person({ ...CAST.newt, x: 1060, y: 1085, h: 380, view: 'front', mouth: 'smile', lookX: -1.5, armA: { x: 960, y: 900 }, armB: { x: 1120, y: 960 } });
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
