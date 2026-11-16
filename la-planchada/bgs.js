// bgs.js — painted greyscale backgrounds (cached, never boil): night ward, corridor, garden (flashback), morning lobby
import * as T from './toon.js';
import { P } from './chars.js';
import { wash, withCanvas, makeBG } from './bgbase.js';
import { bedObj } from './cast.js';
import { mulberry } from '/core/lib.js';
const { stroke, ell, arc, rect, spline, shape, quad } = T;
const PS = 1.25, W = 1080, H = 1920;
function checker(g, raw, pts, cols, n) { raw(); }
function floorChecks(g, raw, y0, y1, dark) { raw(); const s = 90; for (let r = 0; r * s * .5 + y0 < y1; r++) for (let c = -1; c < W / s + 1; c++) if ((r + c) % 2) { g.fillStyle = dark; g.fillRect(c * s - (r % 2) * 0, y0 + r * s * .5, s, s * .5); } }

export function paintWard() {
  const bg = makeBG(0, 0, W, H, PS);
  withCanvas(bg, (g, raw) => {
    wash(rect(-10, -10, W + 20, 1560), '#5E5C57', { seed: 3, edge: 0, line: false });
    wash(rect(-10, 1040, W + 20, 520), '#44423D', { seed: 4, edge: .1 });
    wash(rect(-10, 1030, W + 20, 26), '#2E2D2A', { seed: 5, edge: 0 });
    // window with the moon and curtains
    wash(rect(600, 230, 330, 560), '#D6D3CB', { seed: 6, edge: 0 });
    wash(rect(618, 248, 294, 524), '#242422', { seed: 7, edge: .3 });
    raw(); g.fillStyle = '#EEEBE0'; g.beginPath(); g.arc(790, 420, 72, 0, 7); g.fill(); g.fillStyle = 'rgba(120,118,110,.35)'; for (const [x, y, r] of [[770, 400, 16], [815, 440, 12], [796, 392, 8]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    wash(rect(762, 248, 12, 524), '#D6D3CB', { seed: 8, edge: 0, lw: 2 }); wash(rect(618, 500, 294, 12), '#D6D3CB', { seed: 9, edge: 0, lw: 2 });
    wash(spline([[560, 220], [660, 230], [650, 420], [610, 560], [560, 700]], true, 6), '#8A8780', { seed: 10 }); wash(spline([[970, 220], [880, 230], [890, 420], [930, 560], [970, 700]], true, 6), '#8A8780', { seed: 11 });
    // shield plaque with a cross
    wash(rect(150, 300, 190, 240), '#3A3935', { seed: 12 }); raw(); g.fillStyle = '#C8C5BC'; g.fillRect(228, 340, 34, 150); g.fillRect(190, 392, 110, 34);
    // floor
    wash(rect(-10, 1540, W + 20, 400), '#807D76', { seed: 13, edge: 0 });
    raw(); for (let r = 0; r < 8; r++) for (let c = -1; c < 13; c++) if ((r + c) % 2) { g.fillStyle = 'rgba(30,28,24,.28)'; g.beginPath(); g.moveTo(c * 90 + 45 - r * 4, 1540 + r * 52); g.lineTo(c * 90 + 90, 1540 + r * 52 + 26); g.lineTo(c * 90 + 45 + r * 4, 1540 + r * 52 + 52); g.lineTo(c * 90, 1540 + r * 52 + 26); g.fill(); }
    // a far row of empty beds along the back wall
    // IV stand
    stroke([[1000, 1500], [1000, 1060]], 7, { boil: 0 }); wash(rect(960, 1060, 80, 14), '#2E2D2A', { seed: 14 }); wash(rect(975, 1080, 50, 90), '#B8B5AC', { seed: 15 });
  });
  return bg;
}
export function paintHall() {
  const bg = makeBG(0, 0, W, H, PS), vx = 540, vy = 840;
  withCanvas(bg, (g, raw) => {
    const A = { l: 395, r: 685, t: 610, b: 1020 };
    wash(rect(-10, -10, W + 20, H + 20), '#3C3B37', { seed: 21, edge: 0, line: false });
    wash([[0, -10], [A.l, A.t], [A.l, A.b], [0, 1500]], '#6B6963', { seed: 22, edge: .12 });
    wash([[W, -10], [A.r, A.t], [A.r, A.b], [W, 1500]], '#5C5A55', { seed: 23, edge: .12 });
    wash([[0, -10], [W, -10], [A.r, A.t], [A.l, A.t]], '#2E2D2A', { seed: 24, edge: .1 });
    wash(rect(A.l, A.t, A.r - A.l, A.b - A.t), '#8E8B84', { seed: 25, edge: .1 });
    wash([[0, 1500], [A.l, A.b], [A.r, A.b], [W, 1500], [W, H + 10], [0, H + 10]], '#85827B', { seed: 26, edge: 0 });
    // floor checks in perspective
    raw(); for (let i = 0; i < 14; i++) { const u0 = Math.pow(i / 14, 1.6), u1 = Math.pow((i + 1) / 14, 1.6); const y0 = lerp(A.b, H + 10, u0), y1 = lerp(A.b, H + 10, u1); for (let c = -8; c < 8; c++) if ((i + c) % 2) { const xl = (u) => vx + (c * 70) * (.15 + 2.2 * u); g.fillStyle = 'rgba(25,23,20,.3)'; g.beginPath(); g.moveTo(xl(u0), y0); g.lineTo(vx + ((c + 1) * 70) * (.15 + 2.2 * u0), y0); g.lineTo(vx + ((c + 1) * 70) * (.15 + 2.2 * u1), y1); g.lineTo(xl(u1), y1); g.fill(); } }
    // doors on both walls (perspective quads)
    const wallPt = (side, u, v) => { const tx0 = side < 0 ? 0 : W, tx1 = side < 0 ? A.l : A.r, ty0 = -10, ty1 = A.t, by0 = 1500, by1 = A.b; const x = lerp(tx0, tx1, u), top = lerp(ty0, ty1, u), bot = lerp(by0, by1, u); return [x, lerp(top, bot, v)]; };
    for (const side of [-1, 1]) for (const [u0, u1] of [[.08, .3], [.42, .56], [.7, .8]]) {
      const q = [wallPt(side, u0, .24), wallPt(side, u1, .24), wallPt(side, u1, 1), wallPt(side, u0, 1)];
      wash(q, '#2C2B28', { seed: 30 + u0 * 10, edge: .1 }); const q2 = [wallPt(side, u0 + .01, .3), wallPt(side, u1 - .01, .3), wallPt(side, u1 - .01, .52), wallPt(side, u0 + .01, .52)]; wash(q2, '#555350', { seed: 40 + u0 * 10, edge: 0, lw: 2 });
    }
    // ceiling lamps
    for (const u of [.12, .4, .66, .86]) { const p = [vx, lerp(-10, A.t, u) + 60]; raw(); g.fillStyle = '#E8E4D6'; g.beginPath(); g.ellipse(p[0], p[1], 60 * (1 - u * .8), 14 * (1 - u * .8), 0, 0, 7); g.fill(); g.strokeStyle = '#2A2927'; g.lineWidth = 3; g.stroke(); }
    // the far door at the end of the hall, a little light under it
    wash(rect(480, 760, 120, 260), '#2E2D2A', { seed: 50 }); raw(); g.fillStyle = 'rgba(235,232,220,.8)'; g.fillRect(486, 1010, 108, 8);
  });
  return bg;
}
const lerp = (a, b, t) => a + (b - a) * t;
export function paintGarden() {
  const bg = makeBG(0, 0, W, H, PS), R = mulberry(77);
  withCanvas(bg, (g, raw) => {
    wash(rect(-10, -10, W + 20, 1500), '#B9B6AE', { seed: 61, edge: 0, line: false });
    wash(rect(-10, 1180, W + 20, 760), '#9C9990', { seed: 62, edge: .05 });
    // arch with vines
    wash(spline([[190, 1300], [190, 560], [330, 330], [540, 270], [750, 330], [890, 560], [890, 1300], [830, 1300], [830, 580], [720, 400], [540, 340], [360, 400], [250, 580], [250, 1300]], true, 8), '#6F6D67', { seed: 63 });
    for (let i = 0; i < 40; i++) { const a = R() * Math.PI, x = 540 + Math.cos(a) * 330 * (R() > .5 ? 1 : -1) * (.82 + R() * .2), y = 560 - Math.sin(a) * 280 + R() * 40; raw(); g.fillStyle = `rgba(70,70,64,${.25 + R() * .3})`; g.beginPath(); g.ellipse(x, y, 16 + R() * 14, 9 + R() * 8, R() * 3, 0, 7); g.fill(); }
    // a tree each side
    for (const [x, s] of [[80, 1], [1010, 1.1]]) { wash(rect(x - 22, 880, 44, 420), '#4E4C47', { seed: 64 + x }); wash(spline([[x - 150 * s, 880], [x - 120 * s, 660], [x, 600], [x + 120 * s, 660], [x + 150 * s, 880], [x, 940]], true, 8), '#7F7D76', { seed: 66 + x }); }
    // path + a bench
    wash([[330, 1300], [750, 1300], [1080, 1920], [0, 1920]], '#C9C6BD', { seed: 70, edge: .05 });
    wash(rect(650, 1290, 330, 24), '#4A4844', { seed: 71 }); wash(rect(660, 1230, 310, 56), '#5B5954', { seed: 72 }); for (const x of [680, 940]) wash(rect(x, 1310, 18, 70), '#3A3935', { seed: 73 + x });
    for (let i = 0; i < 26; i++) { raw(); const x = R() * W, y = 1330 + R() * 500; g.fillStyle = `rgba(250,248,240,${.5 + R() * .4})`; g.beginPath(); g.arc(x, y, 5 + R() * 4, 0, 7); g.fill(); g.fillStyle = 'rgba(30,28,24,.5)'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  });
  return bg;
}
export function paintLobby() {
  const bg = makeBG(0, 0, W, H, PS);
  withCanvas(bg, (g, raw) => {
    wash(rect(-10, -10, W + 20, 1500), '#A9A69E', { seed: 81, edge: 0, line: false });
    raw(); for (let x = 0; x < W; x += 60) { g.fillStyle = 'rgba(255,253,245,.08)'; g.fillRect(x, 0, 20, 1500); }
    wash(rect(-10, 1050, W + 20, 460), '#7C7A73', { seed: 82, edge: .1 }); wash(rect(-10, 1040, W + 20, 22), '#4A4844', { seed: 83, edge: 0 });
    // a big morning window on the left with sun rays
    wash(rect(60, 260, 330, 620), '#EDEAE0', { seed: 84, edge: 0 }); wash(rect(76, 276, 298, 588), '#F7F5EE', { seed: 85, edge: .1 }); wash(rect(214, 276, 12, 588), '#6A6862', { seed: 86, edge: 0, lw: 2 }); wash(rect(76, 540, 298, 12), '#6A6862', { seed: 87, edge: 0, lw: 2 });
    raw(); g.fillStyle = 'rgba(255,253,240,.16)'; g.beginPath(); g.moveTo(90, 330); g.lineTo(420, 560); g.lineTo(430, 1400); g.lineTo(60, 880); g.fill();
    // wall of framed photographs (the nurses of old)
    for (const [x, y, w, h] of [[470, 320, 130, 170], [630, 300, 150, 190], [820, 330, 120, 160], [470, 540, 130, 150], [820, 540, 130, 160]]) { wash(rect(x, y, w, h), '#3B3A37', { seed: 90 + x }); wash(rect(x + 12, y + 12, w - 24, h - 24), '#B5B2A9', { seed: 91 + y, edge: 0, lw: 2 }); }
    // reception desk
    wash(rect(520, 1090, 540, 350), '#4A4844', { seed: 92 }); wash(rect(500, 1060, 580, 40), '#2E2D2A', { seed: 93 }); raw(); g.fillStyle = 'rgba(255,253,245,.12)'; for (let x = 540; x < 1050; x += 90) g.fillRect(x, 1120, 6, 300);
    // plant
    wash(rect(60, 1230, 90, 120), '#3B3A37', { seed: 94 }); for (let i = 0; i < 6; i++) wash(spline([[105, 1230], [105 + (i - 2.5) * 40, 1090 - (i % 2) * 40], [105 + (i - 2.5) * 70, 1170]], true, 6), '#6C6A64', { seed: 95 + i });
    // floor
    wash(rect(-10, 1500, W + 20, 430), '#8E8B84', { seed: 100, edge: 0 });
    raw(); for (let r = 0; r < 8; r++) for (let c = -1; c < 13; c++) if ((r + c) % 2) { g.fillStyle = 'rgba(30,28,24,.22)'; g.beginPath(); g.moveTo(c * 90 + 45 - r * 4, 1500 + r * 54); g.lineTo(c * 90 + 90, 1500 + r * 54 + 27); g.lineTo(c * 90 + 45 + r * 4, 1500 + r * 54 + 54); g.lineTo(c * 90, 1500 + r * 54 + 27); g.fill(); }
    // wall sign
    wash(rect(300, 130, 480, 90), '#2E2D2A', { seed: 101 }); T.text('HOSPITAL', 540, 176, { font: '56px Limelight', fill: '#E8E5DB' });
  });
  return bg;
}
