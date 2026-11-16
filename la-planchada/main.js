// La Planchada: a 1930s rubber-hose horror short. Every frame is a pure function of t.
import * as T from './toon.js';
import { P, pieEye, glove, shoe, hose, steam } from './chars.js';
import { person, head, heart, ironObj, clockObj, bedObj, bottle, qmark, speedLines, layered } from './cast.js';
import { paintWard, paintHall, paintGarden, paintLobby } from './bgs.js';
import { makeFilm, post } from './film.js';
import { fatTitle } from './ui.js';
import { clamp, lerp, TAU, hash } from '/core/lib.js';
const { shape, stroke, ell, arc, spline, quad, push, pop, translate, rotate, scale, dot } = T;

const cv = document.getElementById('c'), W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
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
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const ei = t => clamp(t) * clamp(t);
const spring = (t, k = 7, z = 4) => 1 - Math.exp(-z * t) * Math.cos(k * t);
const tq = t => Math.floor(t * 12 + 1e-6) / 12;
const BEAT = .5;

let F, BG = {};
function setCam(cx, cy, z) { T.BASE.splice(0, 6, z, 0, 0, z, 540 - cx * z, 960 - cy * z); T.reset(); }
function showBG(bg, cx, cy, z) { const sg = F.sg; sg.setTransform(z, 0, 0, z, 540 - cx * z, 960 - cy * z); sg.drawImage(bg.cv, 0, 0, W, H); sg.setTransform(1, 0, 0, 1, 0, 0); }
const breath = (t, a = .045) => ({ sx: 1 - a * .5 * Math.cos(TAU * tq(t) / BEAT), sy: 1 + a * Math.cos(TAU * tq(t) / BEAT) });
const L = (o = {}) => o;
const SMILE = { eyes: { type: 'open' }, mouth: { type: 'smile' } };
// where a point of a person lands in world coordinates
const wp = (p, x, y) => [p.x + (p.flip ? -1 : 1) * (p.k || 1) * x, p.y + (p.k || 1) * y];

// ------------------------------------------------------------ scene 1: the midnight nurse (0 – 8.15)
function wallPt(side, u, v) { const A = { l: 395, r: 685, t: 610, b: 1020 }, x = lerp(side < 0 ? 0 : W, side < 0 ? A.l : A.r, u), top = lerp(-10, A.t, u), bot = lerp(1500, A.b, u); return [x, lerp(top, bot, v)]; }
function s1(t, tw) {
  showBG(BG.hall, 540, 960, 1); setCam(540, 960, 1);
  const spin = t < 3.4 ? t * 10 : 0;
  clockObj(540, 560, 54, spin / 12, spin, t > 3.4 && t < 4.4 ? 1 : 0);
  // the nurse glides down the corridor towards us
  if (t > 3.5) {
    const u = ss(seg(t, 3.5, 8.15)), k = lerp(.46, 1.45, u), y = lerp(1015, 1640, u), sway = Math.sin(tw * 2.2) * 36 * (1 - u * .6);
    person({ x: 540 + sway, y, k, kind: 'nurse', ghost: true, bob: Math.sin(TAU * tw / 1.0) * 7 * k, alpha: .9, t,
      look: { eyes: { type: t > 7.4 ? 'wide' : 'open', lx: t > 7.4 ? 0 : Math.sin(tw) * .5 }, mouth: { type: 'smile' } }, armL: { x: -50 - 8 * Math.sin(tw * 3), y: -120, hand: 'open' }, armR: { x: 50 + 8 * Math.sin(tw * 3), y: -120, hand: 'open' } });
  }
  // a patient peeks out of a ward door at "night", then the door slams
  if (t > 5.4 && t < 6.7) {
    const open = ss(seg(t, 5.4, 5.7)) * (1 - ss(seg(t, 6.35, 6.5))), q = [wallPt(-1, .42, .24), wallPt(-1, .56, .24), wallPt(-1, .56, 1), wallPt(-1, .42, 1)];
    shape(q.map(([x, y]) => [x, y]), { fill: P.ink, lw: 4, boil: .3, alpha: open > .01 ? 1 : 0 });
    if (open > .02) { push(); translate(lerp(q[0][0], q[1][0], .5) + 4, lerp(q[0][1], q[3][1], .5)); scale(.34 * open); head('pj', { eyes: { type: 'wide', lx: 1, ly: 0 }, mouth: { type: 'o', open: 1 }, brows: 'up', t }, 0); pop(); }
  }
}
function s1ui(t) {
  const g = F.sg;
  if (t < 3.45) {
    fatTitle(g, 'LA PLANCHADA', 540, 360, 118, { bounce: i => t < 3.1 ? Math.sin(TAU * (t / 1.0) - i * .55) * 9 * seg(t, .3, .8) : 0 });
    fatTitle(g, 'THE NURSE WHO NEVER LEFT', 540, 470, 44, { font: 'Limelight', track: 2 });
    plate(g, 'PLOT TWIST WITH A&R  ·  EPISODE 16', 540, 120, 28);
  }
}

// ------------------------------------------------------------ scene 2: the perfect uniform (8.15 – 15.2)
function s2(t, tw) {
  showBG(BG.hall, 540, 1100, 1.35); setCam(540, 1100, 1.35);
  const bob = Math.sin(TAU * tw / 1.0) * 9;
  const curt = ss(seg(t, 9.3, 9.7)) * (1 - ss(seg(t, 9.9, 10.3)));
  const spinP = seg(t, 11.0, 12.1), sx = t > 11.0 && t < 12.1 ? Math.cos(spinP * TAU) : 1;
  const wrink = t > 13.9 && t < 14.7;
  const nurse = { x: 470, y: 1500, k: 2.0, kind: 'nurse', ghost: true, bob, alpha: .92, t, lean: -curt * .2, sx: Math.abs(sx) < .12 ? .12 * Math.sign(sx || 1) : sx, sy: 1 + .02 * Math.sin(tw * 5), wrinkle: wrink,
    look: { eyes: { type: curt > .5 ? 'happy' : 'open', lx: .2 }, mouth: { type: 'smile' } }, armL: { x: -64, y: -120, hand: 'open' }, armR: curt > .4 ? { x: 18, y: -170, hand: 'open', front: true } : { x: 64, y: -120, hand: 'open' } };
  person(nurse);
  // the flat-iron hops in and presses her skirt
  if (t > 12.1) {
    const inT = ss(seg(t, 12.1, 12.7)), press = seg(t, 12.9, 14.0), slap = seg(t, 14.5, 14.85);
    const ix = lerp(1050, 700, inT) - (press > 0 ? 0 : 0), py = press > 0 ? lerp(1340, 1180, Math.abs(Math.sin(press * Math.PI * 3))) : 1500;
    const sq = slap > 0 && slap < 1 ? 1 - .28 * Math.sin(slap * Math.PI) : 1;
    ironObj({ x: press > 0 && t < 14.5 ? 640 : ix, y: press > 0 ? lerp(1500, py, 1) - 0 : 1500, k: 1.45, flip: true, step: inT < 1, eye: 'open', mouth: slap > 0 ? 'beam' : 'smile', t, sx: 1 / sq, sy: sq });
  }
}

// ------------------------------------------------------------ scene 3: the betrayal, a flashback (15.2 – 21.6)
function heartHalf(cx, cy, r, side, ang, dx, dy) {
  const pts = [], a0 = side > 0 ? 0 : Math.PI, a1 = side > 0 ? Math.PI : TAU;
  for (let i = 0; i <= 18; i++) { const a = lerp(a0, a1, i / 18), x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([x * r / 16, y * r / 16 + r * .1]); }
  const zz = [[0, 17 * r / 16 + r * .1], [-side * 6, 11 * r / 16], [side * 5, 5 * r / 16], [-side * 6, -1 * r / 16], [0, -5 * r / 16 + r * .1]];
  push(); translate(cx + dx, cy + dy); rotate(ang); shape([...pts, ...zz], { fill: P.white, lw: T.S.lw * .9 }); pop();
}
function s3(t, tw) {
  showBG(BG.garden, 540, 960, 1); setCam(540, 960, 1);
  const cur = ss(seg(t, 17.5, 17.9)) * (1 - ss(seg(t, 18.2, 18.6)));
  const love = t > 19.5 && t < 21.0, bet = t > 20.9;
  const walkAway = ss(seg(t, 21.0, 21.6));
  const docX = lerp(760, 960, walkAway), flapX = lerp(1250, 1000, ss(seg(t, 20.4, 21.0))) + (bet ? walkAway * 160 : 0);
  person({ x: 330, y: 1500, k: 1.75, kind: 'nurse', legs: true, t, lean: -cur * .18 + (bet ? .06 : 0), ...breath(tw), walk: null,
    look: { eyes: { type: love ? 'open' : 'open', heart: love, lx: .5 }, mouth: { type: bet ? 'frown' : 'smile' }, brows: null },
    armL: { x: -64, y: -110, hand: 'open' }, armR: bet ? { x: 64, y: -90, hand: 'fist' } : { x: 70, y: -150, hand: 'open' } });
  person({ x: docX, y: 1500, k: 1.8, kind: 'doc', flip: true, t, ...breath(tw), walk: walkAway > 0 && walkAway < 1 ? tw * 8 : null,
    look: { eyes: { type: bet ? 'squeeze' : 'open', lx: bet ? .8 : -.5, side: 1 }, mouth: { type: bet ? 'grin' : 'smile' } }, armL: { x: -58, y: -110, hand: 'open' }, armR: bet ? { x: 70, y: -170, hand: 'open' } : { x: 66, y: -110, hand: 'point' } });
  if (t > 20.3) person({ x: flapX, y: 1500, k: 1.6, kind: 'flapper', flip: true, t, ...breath(tw), walk: walkAway > 0 && walkAway < 1 ? tw * 8 : null, look: { eyes: { type: 'happy' }, mouth: { type: 'beam' } }, armL: { x: -50, y: -110, hand: 'open' }, armR: { x: 60, y: -130, hand: 'wave' } });
  // hearts float up when she falls in love
  if (t > 19.6) for (let k = 0; k < 6; k++) { const t0 = 19.66 + k * .24, u = t - t0; if (u < 0 || u > 1.6) continue; push(); heart(330 + Math.sin(u * 4 + k) * 40 + (k - 2.5) * 22, 1050 - u * 190, 20 + 10 * (k % 3), P.white); pop(); }
  // her heart breaks
  if (t > 21.0) { const u = seg(t, 21.0, 21.6), ht = [330, 1020]; if (u < .35) heart(ht[0], ht[1], 64, P.white); else { const w = (u - .35) / .65; heartHalf(ht[0], ht[1], 64, -1, -w * 1.2, -w * 90, w * w * 260); heartHalf(ht[0], ht[1], 64, 1, w * 1.2, w * 90, w * w * 260); } if (u < .35) stroke([[ht[0], ht[1] - 40], [ht[0] - 8, ht[1] - 14], [ht[0] + 7, ht[1] + 6], [ht[0] - 4, ht[1] + 30]], 5, { boil: 0 }); }
}

// ------------------------------------------------------------ scene 4: two versions of her death (21.6 – 29.75)
function s4a(t, tw) {
  showBG(BG.garden, 540, 960, 1); setCam(540, 960, 1);
  const f = eo(seg(t, 23.68, 24.2)), a = -1.45 * f;
  person({ x: 520, y: 1500, k: 1.75, kind: 'nurse', t, lean: a, ...(f > 0 ? {} : breath(tw)), look: { eyes: { type: f > .1 ? 'shut' : 'open' }, mouth: { type: f > .1 ? 'wavy' : 'frown' } }, armL: { x: -64, y: -110, hand: 'open' }, armR: { x: 64, y: -110, hand: 'open' } });
  // tears spout out of her eyes in fat droplets
  if (t > 22.6) for (let i = 0; i < 12; i++) { const u = ((t - 22.6) * 1.1 + i / 12) % 1, s = i % 2 ? 1 : -1, hx = 520 - 258 * 1.75 * Math.sin(a) * -1 * -1, hy = 1500 - 258 * 1.75 * Math.cos(a); const x0 = hx + s * 34, y0 = hy + 6, x = x0 + s * u * 230, y = y0 - 190 * Math.sin(u * Math.PI * .9) * (1 - u * .2) + u * u * 330; shape(ell(x, y, 11, 15), { fill: P.white, lw: 4, boil: .3 }); }
  if (f > .6) { const u = seg(t, 24.0, 24.45); person({ x: 330 - 60 * u, y: 1500 - 240 * u, k: 1.75, kind: 'nurse', ghost: true, alpha: .8 * (1 - ss(seg(t, 24.3, 24.45))), t, look: { eyes: { type: 'open', lx: 0 }, mouth: { type: 'smile' } }, armL: { x: -50, y: -150, hand: 'wave' }, armR: { x: 50, y: -150, hand: 'wave' } }); }
}
function s4b(t, tw) {
  showBG(BG.ward, 540, 960, 1); setCam(540, 960, 1);
  const rip = Math.floor(t * 12) % 2;
  bedObj({ x: 720, y: 1600, k: 1.2, t, look: { eyes: { type: 'wide', lx: -.6 }, mouth: { type: 'wavy' } }, breath: Math.cos(TAU * tq(t) / BEAT) });
  // the alarm bell on the wall beside the bed, ringing
  push(); translate(rip * 3 - 1, 0); clockObj(960, 960, 56, 1, 2, 1); pop();
  const dead = t > 26.86, slump = ss(seg(t, 26.86, 27.2));
  const snore = Math.sin(TAU * tw / 1.0);
  person({ x: 270, y: 1520, k: 1.6, kind: 'nurse', t, lean: .12 * snore - slump * .18, sx: 1 + .02 * snore, sy: 1 - .02 * snore, look: { eyes: { type: 'shut' }, mouth: { type: dead ? 'flat' : 'o', open: .6 + .3 * snore } }, armL: { x: -60, y: -100, hand: 'open' }, armR: { x: 60, y: -100, hand: 'open' } });
  if (!dead) for (let i = 0; i < 3; i++) { const u = ((t * .8) + i / 3) % 1; push(); translate(300 + u * 80, 1130 - u * 150); scale(.5 + u * .6); T.text('Z', 0, 0, { font: '80px Shrikhand', fill: P.white, outlineW: 12 }); pop(); }
  if (dead) {
    // her ghost rises from the chair, tries to float off, and is snapped back like a rubber band
    const rise = ss(seg(t, 26.86, 27.8)), stretch = ss(seg(t, 28.0, 28.7)), snap = seg(t, 28.8, 29.45);
    const sy = 1 + stretch * 1.5 - (snap > 0 ? stretch * 1.5 * ss(snap * 3) : 0) + (snap > 0 && snap < 1 ? -.25 * Math.sin(snap * Math.PI) : 0);
    const gy = 1520 - rise * 230 - stretch * 120 * (1 - ss(snap * 3));
    if (stretch > 0.02 && snap < .35) hose([270, 1400], [270, gy - 30], 0, 10, P.ink);
    person({ x: 270, y: gy, k: 1.6, kind: 'nurse', ghost: true, alpha: .85, t, sy: Math.max(.5, sy), sx: 1 - (sy - 1) * .15, look: { eyes: { type: stretch > .1 && snap <= 0 ? 'wide' : 'open' }, mouth: { type: stretch > .1 && snap <= 0 ? 'wavy' : 'smile' } }, armL: { x: -50, y: stretch > 0 ? -250 : -130, hand: 'open' }, armR: { x: 50, y: stretch > 0 ? -250 : -130, hand: 'open' } });
  }
}

// ------------------------------------------------------------ scene 5: the night visit (29.85 – 36.7)
function s5(t, tw) {
  showBG(BG.ward, 540, 960, 1); setCam(540, 960, 1);
  const shiver = t < 35.35 ? Math.sin(t * 90) * 4 : 0, calm = ss(seg(t, 35.35, 35.8));
  const hold = Math.floor(t * 12) % 2;
  push(); translate(shiver * (1 - calm), 0);
  bedObj({ x: 740, y: 1600, k: 1.3, t, breath: Math.cos(TAU * tq(t) / BEAT) * (1 - calm * .5), look: calm > .5 ? { eyes: { type: 'shut' }, mouth: { type: 'smile' } } : { eyes: { type: 'wide', lx: 0 }, mouth: { type: hold ? 'o' : 'wavy', open: .5 } } });
  pop();
  const arrive = ss(seg(t, 30.4, 32.6)), x = lerp(-120, 330, arrive), bend = ss(seg(t, 33.0, 33.5));
  const med = ss(seg(t, 33.9, 34.3)) * (1 - ss(seg(t, 35.0, 35.3))), tuck = ss(seg(t, 35.35, 35.8));
  const nurse = { x, y: 1560, k: 1.8, kind: 'nurse', ghost: true, alpha: .88, bob: Math.sin(TAU * tw / 1.0) * 8, t, lean: bend * .12,
    look: { eyes: { type: med > .5 ? 'squeeze' : 'open', lx: .6, side: 1 }, mouth: { type: tuck > .3 ? 'beam' : 'smile' } },
    armL: tuck > 0.01 ? { x: 60 + tuck * 60, y: -80 + Math.sin(t * 9) * 10 * tuck, hand: 'open', front: true } : { x: -50, y: -110, hand: 'open' },
    armR: med > 0.01 ? { x: 70 + 20 * med, y: -110 - 170 * med, hand: 'grab', front: true } : { x: 64, y: -110, hand: 'open' } };
  person(nurse);
  if (med > .01) { const [hx, hy] = wp(nurse, nurse.armR.x + 24, nurse.armR.y - 10); bottle(hx, hy + 10, 1.0, -.2); }
  if (calm > .5) for (let i = 0; i < 3; i++) { const u = ((t - 35.8) * .9 + i / 3) % 1; if (t < 35.8) break; push(); translate(560 + u * 70, 1250 - u * 160); scale(.45 + u * .5); T.text('Z', 0, 0, { font: '80px Shrikhand', fill: P.white, outlineW: 12 }); pop(); }
  // night passes: the wall clock whirls to morning
  const spin = seg(t, 36.05, 36.7);
  clockObj(330, 380, 78, spin * 14, spin * 14 * 12, 0);
}

// ------------------------------------------------------------ scene 6: the discovery (36.7 – 43.0)
function bouquet(x, y, k) { push(); translate(x, y); scale(k); stroke([[0, 0], [0, 70]], 7, { boil: .3 }); for (const [dx, dy] of [[-22, -8], [18, -16], [0, -34], [-34, -30], [30, -34]]) { shape(ell(dx, dy, 15, 15), { fill: P.white, lw: 4 }); dot(dx, dy, 4); } pop(); }
function s6(t, tw) {
  showBG(BG.lobby, 540, 960, 1); setCam(540, 960, 1);
  const talk = t < 40.6 ? (Math.floor(t * 12) % 4 < 2 ? 'open' : 'grin') : 'o', gest = Math.sin(TAU * tw / 1.0);
  const pat = { x: 300, y: 1560, k: 1.85, kind: 'pj', t, ...breath(tw), look: { eyes: { type: 'open', lx: .5 }, mouth: { type: t < 40.6 ? talk : 'frown', open: .5 }, brows: t < 41.4 ? null : 'up' }, armL: { x: -62, y: -120, hand: 'open' }, armR: t < 39.9 ? { x: 70 + gest * 14, y: -180 + gest * 18, hand: 'open', front: true } : { x: 80, y: -80 + gest * 40, hand: 'open', front: true } };
  person(pat); const [bx, by] = wp(pat, -62, -150); bouquet(bx - 10, by - 40, 1.2);
  const glance = ss(seg(t, 40.65, 41.0));
  person({ x: 700, y: 1500, k: 1.6, kind: 'matron', flip: true, t, ...breath(tw), look: { eyes: { type: 'open', lx: -.9 * glance + .7 * (1 - glance), ly: 0 }, mouth: { type: glance > .5 ? 'flat' : 'smile' }, brows: glance > .5 ? 'up' : null }, armL: { x: -56, y: -110, hand: 'open' }, armR: { x: glance > .5 ? 70 : 56, y: glance > .5 ? -150 : -110, hand: glance > .5 ? 'wave' : 'open' } });
  person({ x: 920, y: 1500, k: 1.6, kind: 'doc', flip: true, t, ...breath(tw), look: { eyes: { type: 'open', lx: -.9 * glance + .7 * (1 - glance) }, mouth: { type: glance > .5 ? 'flat' : 'smile' }, brows: glance > .5 ? 'up' : null }, armL: { x: -58, y: -110, hand: 'open' }, armR: { x: 62, y: -110, hand: glance > .5 ? 'thumb' : 'open' } });
  for (const [t0, x, y] of [[41.0, 700, 1000], [41.4, 920, 1000], [42.0, 330, 1050]]) { const u = seg(t, t0, t0 + .35); if (u > 0) qmark(x, y - 20 * Math.sin(tw * 5), spring(u) * 1.0, Math.sin(tw * 4) * .12); }
}

// ------------------------------------------------------------ scene 7: the impossible truth (43.0 – 50.3)
function s7(t, tw) {
  const pan = ss(seg(t, 43.0, 45.6)), cx = lerp(540, 700, pan), z = lerp(1.0, 1.25, pan);
  showBG(BG.lobby, cx, lerp(960, 900, pan), z); setCam(cx, lerp(960, 900, pan), z);
  // the portrait of the nurse of old, with a black ribbon
  push(); translate(705, 402); scale(.62); head('nurse', { eyes: { type: 'open', lx: 0 }, mouth: { type: 'smile' }, t }, 0); pop();
  stroke([[630, 470], [690, 300]], 12, { boil: .3 }); shape([[630, 300], [700, 300], [630, 380]], { fill: P.ink, lw: 3 });
  const walkT = seg(t, 43.0, 45.6), react = ss(seg(t, 46.8, 47.2)), dbl = seg(t, 48.4, 49.0), stiff = t > 49.1 && t < 49.5, run = seg(t, 49.5, 50.3);
  const px = t < 45.6 ? lerp(330, 620, ss(walkT)) : t < 49.5 ? 620 : 620 + ei(run) * 900;
  const ph = t < 45.6 ? tw * 7 : t >= 49.5 ? tw * 26 : null;
  const shake = dbl > 0 && !stiff ? Math.sin(t * 80) * 5 : 0;
  push(); translate(shake, 0);
  const pj = { x: px, y: 1540, k: 1.85, kind: 'pj', walk: ph, t, lean: t >= 49.5 ? .22 : 0, sx: dbl > 0 ? 1 + .05 * Math.sin(t * 70) : 1, sy: 1 + .05 * Math.sin(t * 70 + 1) * (dbl > 0 ? 1 : 0), ...(react < .05 ? breath(tw) : {}),
    look: { eyes: { type: dbl > 0 || stiff ? 'wide' : 'open', lx: .3, ly: -.3 }, mouth: { type: dbl > .3 || stiff ? 'o' : (react > .5 ? 'o' : 'smile'), open: 1.4 }, brows: react > .5 ? 'up' : null },
    armL: { x: -58, y: dbl > 0 ? -250 : -100, hand: dbl > 0 ? 'open' : 'open' }, armR: { x: 62, y: dbl > 0 ? -250 : -100, hand: 'open' } };
  person(pj);
  if (dbl > 0 && t < 49.5) for (let i = 0; i < 5; i++) stroke([[px - 70 + i * 34, 1100 - 20 * Math.sin(t * 40 + i)], [px - 70 + i * 34, 1060 - 40 * Math.sin(t * 40 + i)]], 6, { boil: 0 });
  pop();
  if (run > 0) { speedLines(px - 120, 1380, 1, 5, 140); }
}

// ------------------------------------------------------------ scene 8: the final twist (50.3 – 62.4)
function s8(t, tw) {
  const z = lerp(1.0, 1.14, ss(seg(t, 50.3, 58.6))), cy = lerp(960, 1010, ss(seg(t, 50.3, 58.6)));
  showBG(BG.ward, 560, cy, z); setCam(560, cy, z);
  bedObj({ x: 740, y: 1600, k: 1.3, t, breath: Math.cos(TAU * tq(t) / BEAT) * .5, look: { eyes: { type: 'shut' }, mouth: { type: 'smile' } } });
  const look = ss(seg(t, 51.4, 51.9)) * (1 - ss(seg(t, 52.8, 53.2))) + ss(seg(t, 57.3, 57.7)), wag = t > 54.4 && t < 55.5 ? Math.sin(t * 22) : 0, tuck = t > 53.3 && t < 54.3;
  const nurse = { x: 330, y: 1560, k: 1.8, kind: 'nurse', ghost: true, alpha: .9, bob: Math.sin(TAU * tw / 1.0) * 8, t, lean: tuck ? .1 : 0,
    look: { eyes: { type: t > 57.3 ? 'happy' : 'open', lx: look > .5 ? 0 : .7 }, mouth: { type: 'smile' } },
    armL: { x: tuck ? 120 : -50, y: tuck ? -80 : -110, hand: 'open', front: tuck }, armR: t > 54.4 && t < 55.5 ? { x: 70, y: -190 + wag * 8, hand: 'point', front: true } : t > 56.3 && t < 57.2 ? { x: 150, y: -150, hand: 'open', front: true } : { x: 64, y: -110, hand: 'open' } };
  person(nurse);
  // a small heart leaves her chest and floats over the sleeping patient
  if (t > 55.7) { const u = seg(t, 55.7, 58.2), hx = lerp(360, 620, ss(u)), hy = 1330 - 220 * eo(u) + Math.sin(u * 14) * 10, k = spring(Math.min(1, seg(t, 55.7, 56.1))) * (1 + .12 * Math.sin(t * 9)); push(); heart(hx, hy, 40 * k, P.white); pop(); }
}

// ------------------------------------------------------------ ending screen and subtitles
function endCard(g, t) {
  const d = eo(seg(t, 58.6, 59.3)); if (d <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const y0 = -H + H * d + (d >= 1 ? 0 : 0);
  g.fillStyle = '#D9D6CC'; g.fillRect(0, y0, W, H + 40); g.fillStyle = '#B9B6AC'; g.fillRect(0, y0 + H - 6, W, 46);
  g.strokeStyle = P.ink; g.lineWidth = 8; g.strokeRect(46, y0 + 46, W - 92, H - 92); g.lineWidth = 2; g.strokeRect(62, y0 + 62, W - 124, H - 124);
  // pull cord with a ring
  g.lineWidth = 5; g.beginPath(); g.moveTo(540, y0 + H + 34); g.lineTo(540, y0 + H + 94); g.stroke(); g.beginPath(); g.arc(540, y0 + H + 114, 20, 0, 7); g.stroke();
  g.restore();
  if (d >= 1) {
    const b = i => Math.sin(TAU * (t - 59.4) / 1.0 - i * .5) * 6 * seg(t, 59.4, 60);
    fatTitle(g, 'THE NURSE', 540, 560, 124, { bounce: b, face: P.white }); fatTitle(g, 'IS A LEGEND.', 540, 700, 124, { bounce: b });
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = P.ink; g.lineWidth = 6; g.beginPath(); g.moveTo(200, 830); g.lineTo(880, 830); g.stroke(); g.restore();
    const a = ss(seg(t, 60.1, 60.4));
    g.save(); g.globalAlpha = a; fatTitle(g, 'HER STORY STILL', 540, 1000, 56, { font: 'Limelight', track: 2 }); fatTitle(g, 'HAUNTS MEXICO.', 540, 1090, 56, { font: 'Limelight', track: 2 }); g.restore();
    // a tiny ghost nurse waving goodbye in the corner
    push(); T.init(F.scene); T.reset(); T.frame(t); person({ x: 540, y: 1740, k: .62, kind: 'nurse', ghost: true, alpha: .9, bob: Math.sin(t * 6) * 6, t, look: { eyes: { type: 'open' }, mouth: { type: 'smile' } }, armL: { x: -50, y: -120, hand: 'open' }, armR: { x: 60 + 10 * Math.sin(t * 12), y: -190, hand: 'wave' } }); pop();
  }
}
function plate(g, text, cx, cy, size) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = `${size}px "IM Fell English SC"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + size * 2, h = size * 1.9, x0 = cx - w / 2, y0 = cy - h / 2;
  g.fillStyle = 'rgba(12,11,10,.92)'; g.beginPath(); g.roundRect(x0, y0, w, h, size * .22); g.fill();
  g.strokeStyle = P.paper; g.lineWidth = 2.2; g.beginPath(); g.roundRect(x0 + 7, y0 + 7, w - 14, h - 14, size * .16); g.stroke(); g.lineWidth = 1; g.beginPath(); g.roundRect(x0 + 12, y0 + 12, w - 24, h - 24, size * .12); g.stroke();
  g.fillStyle = P.paper; g.fillText(text, cx, cy + size * .06); g.restore();
}
function subCard(g, text, cy) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const size = 33; g.font = `${size}px "IM Fell English SC"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > 800 && cur) { lines.push(cur); cur = w; } else cur = tt; }
  lines.push(cur);
  const mw = Math.max(...lines.map(l => g.measureText(l).width)), w = mw + 110, h = lines.length * 46 + 52, x0 = 540 - w / 2, y0 = cy - h / 2;
  g.fillStyle = 'rgba(12,11,10,.93)'; g.beginPath(); g.roundRect(x0, y0, w, h, 14); g.fill();
  g.strokeStyle = P.paper; g.lineWidth = 2.2; g.beginPath(); g.roundRect(x0 + 7, y0 + 7, w - 14, h - 14, 10); g.stroke(); g.lineWidth = 1; g.beginPath(); g.roundRect(x0 + 12, y0 + 12, w - 24, h - 24, 8); g.stroke();
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const ax = sx > 0 ? x0 + 12 : x0 + w - 12, ay = sy > 0 ? y0 + 12 : y0 + h - 12; g.fillStyle = P.paper; g.beginPath(); g.arc(ax + sx * 7, ay + sy * 7, 3, 0, 7); g.fill(); }
  g.fillStyle = P.paper; lines.forEach((l, i) => g.fillText(l, 540, y0 + 26 + 23 + i * 46)); g.restore();
}

// ------------------------------------------------------------ the film
const SCENES = [[0, 8.15, s1], [8.15, 15.2, s2], [15.2, 21.6, s3], [21.6, 24.45, s4a], [24.45, 29.75, s4b], [29.75, 36.7, s5], [36.7, 43.0, s6], [43.0, 50.3, s7], [50.3, 62.4, s8]];
window.render = t => {
  t = Math.min(t, window.DUR - 1e-4);
  const sg = F.sg, tw = tq(t); sg.setTransform(1, 0, 0, 1, 0, 0); sg.fillStyle = '#000'; sg.fillRect(0, 0, W, H);
  T.init(F.scene); T.frame(t);
  const sc = SCENES.find(s => t >= s[0] && t < s[1]) || SCENES[SCENES.length - 1];
  sc[2](t, tw);
  sg.setTransform(1, 0, 0, 1, 0, 0);
  // flashback iris
  if (t >= 15.2 && t < 16.2) { const r = ss(seg(t, 15.2, 16.1)) * 1400; sg.fillStyle = '#000'; sg.beginPath(); sg.rect(0, 0, W, H); sg.arc(540, 960, r, 0, TAU, true); sg.fill('evenodd'); }
  if (t >= 21.3 && t < 21.7) { }
  if (sc[2] === s1) s1ui(t);
  if (t >= 21.7 && t < 24.45) plate(sg, 'VERSION A', 540, 130, 40);
  if (t >= 24.45 && t < 29.75) plate(sg, 'VERSION B', 540, 130, 40);
  // title-card subtitles (not over the end card)
  for (const [id, t0, d, txt] of VO) { const a = t0 - .1, b = t0 + Math.max(d + .6, 1.8); if (t >= a && t < b && !(t >= 58.7)) subCard(sg, txt, 1735); }
  if (t >= 58.6) endCard(sg, t);
  post(F, t, { jump: [8.15, 15.2, 21.6, 24.45, 29.75, 36.7, 43.0, 50.3].some(c => t >= c && t < c + .05) ? 5 : 0 });
};
window.TEXTS = () => [];
(async () => {
  cv.width = W; cv.height = H; T.init(cv);
  await document.fonts.ready; for (const f of ['40px Shrikhand', '40px Limelight', '30px "IM Fell English SC"']) await document.fonts.load(f);
  F = makeFilm(cv); T.init(F.scene);
  BG.ward = paintWard(); BG.hall = paintHall(); BG.garden = paintGarden(); BG.lobby = paintLobby();
  T.init(F.scene); window.READY = true;
})();
