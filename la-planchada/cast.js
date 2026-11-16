// cast.js — La Planchada's world: people, props. Rubber-hose rigs built from the style's parts (pie eyes, gloves, shoes, hose limbs).
// Local coordinates: origin = ground between the feet, y down (a person is about 330 tall).
import * as T from './toon.js';
import { P, pieEye, brow, mouth, glove, shoe, hose, steam, ribbon, union } from './chars.js';
import { clamp, lerp, TAU, hash } from '/core/lib.js';
const { shape, stroke, ell, arc, spline, noodle, quad, push, pop, translate, rotate, scale, dot, S } = T;
const D2R = Math.PI / 180;

// draw something onto a temporary layer, then composite it with an alpha (ghosts)
let TMP = null, SCENE = null;
export function layered(alpha, fn) {
  if (alpha >= .999) return fn();
  const main = T.g; if (!TMP || TMP.width !== main.canvas.width) { TMP = document.createElement('canvas'); TMP.width = main.canvas.width; TMP.height = main.canvas.height; }
  const c2 = TMP.getContext('2d'); c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, TMP.width, TMP.height);
  T.init(TMP); fn(); T.init(main.canvas); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = alpha; main.drawImage(TMP, 0, 0); main.globalAlpha = 1;
}

// ——— heads ———
// kind: nurse | doc | pj | flapper | matron ; look = {eyes:{type,lx,ly,lid,heart}, mouth:{type,open}, brows, tilt}
export function head(kind, look = {}, hy = -258) {
  const e = look.eyes || {}, m = look.mouth || { type: 'smile' };
  push(); translate(0, hy); if (look.tilt) rotate(look.tilt);
  const HR = kind === 'pj' ? 52 : 50;
  // back hair
  if (kind === 'nurse') shape(spline([[-56, 6], [-58, -38], [-30, -62], [0, -66], [30, -62], [58, -38], [56, 6], [46, 30], [38, -4], [-38, -4], [-46, 30]], true, 6), { fill: P.ink, lw: S.lw * .8 });
  if (kind === 'flapper') shape(spline([[-54, 8], [-58, -34], [-30, -58], [30, -58], [58, -34], [54, 8], [38, 20], [-38, 20]], true, 6), { fill: P.ink, lw: S.lw * .8 });
  shape(ell(0, 0, HR, HR + 2), { fill: P.white, lw: S.lw, shade: () => { push(); const g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = P.pale; g.beginPath(); const a = T.tx(HR * .45, -HR), b = T.tx(HR * 1.2, -HR), c = T.tx(HR * 1.2, HR * 1.2), d = T.tx(HR * .55, HR * 1.1); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.fill(); pop(); } });
  // ears
  shape(ell(-HR + 3, 6, 8, 11), { fill: P.white, lw: S.lw * .8 }); shape(ell(HR - 3, 6, 8, 11), { fill: P.white, lw: S.lw * .8 });
  // hair front
  if (kind === 'nurse') shape(spline([[-52, -8], [-48, -40], [-20, -56], [0, -50], [20, -56], [48, -40], [52, -8], [34, -24], [10, -34], [-10, -34], [-34, -24]], true, 6), { fill: P.ink, lw: S.lw * .8 });
  if (kind === 'flapper') shape(spline([[-52, -10], [-48, -40], [0, -54], [48, -40], [52, -10], [30, -26], [0, -32], [-30, -26]], true, 6), { fill: P.ink, lw: S.lw * .8 });
  if (kind === 'doc') shape(spline([[-48, -10], [-44, -42], [-10, -56], [26, -52], [48, -30], [50, -8], [30, -30], [-8, -36], [-30, -26]], true, 6), { fill: P.ink, lw: S.lw * .8 });
  if (kind === 'matron') shape(spline([[-50, -6], [-46, -42], [0, -58], [46, -42], [50, -6], [30, -30], [-30, -30]], true, 6), { fill: P.dmid, lw: S.lw * .8 });
  // eyes
  const ex = 19, ey = -4, rx = 14, ry = 18;
  if (e.heart) { for (const s of [-1, 1]) heart(s * ex, ey, 16 + 3 * Math.sin((look.t || 0) * 12), P.ink, P.ink, true); }
  else { pieEye(-ex, ey, rx, ry, { type: e.type, lx: e.lx, ly: e.ly, lid: e.lid, lidCol: P.white }); pieEye(ex, ey, rx, ry, { type: e.type, lx: e.lx, ly: e.ly, lid: e.lid, lidCol: P.white }); }
  if (kind === 'nurse' || kind === 'flapper') for (const s of [-1, 1]) { stroke([[s * ex + s * 11, ey - 14], [s * ex + s * 18, ey - 20]], S.lw * .8); stroke([[s * ex + s * 13, ey - 8], [s * ex + s * 22, ey - 11]], S.lw * .8); }
  if (look.brows) { brow(-ex, ey - 28, 22, look.brows, -1); brow(ex, ey - 28, 22, look.brows, 1); }
  shape(ell(0, 12, 6, 4.5), { fill: P.white, lw: S.lw * .75, boil: .4 });
  if (kind === 'doc') shape(spline([[-24, 24], [-12, 18], [0, 22], [12, 18], [24, 24], [12, 30], [0, 26], [-12, 30]], true, 5), { fill: P.ink, lw: S.lw * .7 });
  mouth(0, 32, 26, m.type, { open: m.open });
  // headgear
  if (kind === 'nurse') { shape(spline([[-34, -50], [-30, -72], [30, -72], [34, -50], [0, -58]], true, 5), { fill: P.white, lw: S.lw * .95 }); stroke([[0, -66], [0, -54]], S.lw * .9); stroke([[-6, -60], [6, -60]], S.lw * .9); }
  if (kind === 'matron') { shape(spline([[-40, -48], [-34, -80], [34, -80], [40, -48], [0, -56]], true, 5), { fill: P.white, lw: S.lw * .95 }); }
  if (kind === 'flapper') { shape(spline([[-50, -34], [-46, -64], [-20, -78], [20, -78], [46, -64], [50, -34], [0, -42]], true, 6), { fill: P.dmid, lw: S.lw * .9 }); stroke([[-48, -42], [48, -42]], S.lw * .9); }
  if (kind === 'doc') { shape(ell(-4, -38, 15, 15), { fill: P.light, lw: S.lw * .9 }); shape(ell(-4, -38, 5, 5), { fill: P.ink, stroke: false, boil: 0 }); stroke([[-40, -30], [-14, -36]], S.lw * .6); }
  if (kind === 'pj') { // nightcap + bandage
    shape(spline([[-48, -34], [-30, -62], [10, -80], [50, -60], [70, -30], [60, -6], [46, -30], [0, -38]], true, 6), { fill: P.pale, lw: S.lw * .95 }); shape(ell(70, -24, 11, 11), { fill: P.white, lw: S.lw * .8 });
    shape(spline([[-52, -18], [0, -26], [52, -18], [52, -4], [0, -12], [-52, -4]], true, 6), { fill: P.white, lw: S.lw * .8 }); stroke([[-6, -22], [-2, -8]], S.lw * .6); stroke([[8, -22], [12, -9]], S.lw * .6);
  }
  pop();
}
export function heart(cx, cy, r, fill = P.white, line = P.ink, solid = false) {
  const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([cx + x * r / 16, cy + y * r / 16 + r * .1]); }
  return shape(pts, { fill, lw: S.lw * .9, line: solid ? P.ink : line });
}

// ——— whole person ———
// o: x,y,k,flip,kind,ghost, bob, lean, sx,sy, look, armL/armR {x,y,hand,bend}, walk (phase) | null, alpha
export function person(o) {
  const kind = o.kind || 'nurse', ghost = !!o.ghost, ph = o.walk;
  const draw = () => {
    push(); translate(o.x, o.y + (o.bob || 0)); if (o.flip) scale(-1, 1); scale(o.k || 1); scale(o.sx || 1, o.sy || 1); if (o.lean) rotate(o.lean);
    const legs = !ghost && o.legs !== false, hy = kind === 'pj' ? -96 : -94;
    // legs
    if (legs) for (const s of [-1, 1]) {
      const lift = ph != null ? Math.max(0, Math.sin(ph + (s > 0 ? 0 : Math.PI))) * 18 : 0, fx = s * 20 + (ph != null ? Math.cos(ph + (s > 0 ? 0 : Math.PI)) * 24 : 0);
      hose([s * 14, hy + 4], [fx, -14 - lift], s * -5, 12); shoe(fx - 8, -4 - lift, 1, .85);
    }
    // arms behind
    const arm = (key, s) => { const A = o[key]; if (!A || A.front) return; const sh = [s * 33, -188]; hose(sh, [A.x, A.y], A.bend ?? s * -14, 13); glove(A.x, A.y, A.rot ?? Math.atan2(A.y - sh[1], A.x - sh[0]), A.hand || 'open', A.hk ?? .85, { flip: s > 0 }); };
    arm('armL', -1); arm('armR', 1);
    // torso
    if (kind === 'nurse' || kind === 'matron') {
      const hem = ghost ? spline([[-30, -194], [30, -194], [26, -140], [50, -92], [34, -56], [14, -22], [-4, -50], [-24, -16], [-44, -58], [-52, -96], [-26, -140]], true, 6)
        : spline([[-30, -194], [30, -194], [26, -140], [66, -96], [40, -86], [0, -84], [-40, -86], [-66, -96], [-26, -140]], true, 6);
      shape(hem, { fill: P.white, lw: S.lw, shade: () => { const g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = P.pale; g.beginPath(); const q = [[14, -200], [80, -200], [80, 0], [34, 0], [28, -140]].map(p => T.tx(p[0], p[1])); g.moveTo(...q[0]); for (const p of q) g.lineTo(...p); g.fill(); } });
      // knife-sharp ironed creases: perfectly straight
      if (!o.wrinkle) for (const dx of [-30, -15, 0, 15, 30]) stroke([[dx * .55, -130], [dx * (ghost ? 1.0 : 1.7), ghost ? -64 : -90]], S.lw * .55, { boil: 0 });
      stroke([[-26, -140], [26, -140]], S.lw * .8, { boil: .5 }); shape([[-8, -192], [0, -176], [8, -192]], { fill: P.white, lw: S.lw * .8 }); dot(0, -160, 3);
      if (kind === 'matron') shape(ell(0, -132, 46, 14), { fill: P.light, lw: S.lw * .7 });
    } else if (kind === 'doc') {
      shape(spline([[-38, -194], [38, -194], [44, -90], [30, -80], [0, -84], [-30, -80], [-44, -90]], true, 6), { fill: P.white, lw: S.lw, shade: () => { const g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = P.pale; g.beginPath(); const q = [[12, -200], [70, -200], [70, -70], [26, -70]].map(p => T.tx(p[0], p[1])); g.moveTo(...q[0]); for (const p of q) g.lineTo(...p); g.fill(); } });
      stroke([[0, -192], [0, -84]], S.lw * .8, { boil: .4 }); shape([[-10, -192], [0, -170], [10, -192]], { fill: P.ink, lw: S.lw * .7 }); dot(-12, -146, 2.6); dot(-12, -120, 2.6);
      // stethoscope
      stroke(spline([[-26, -192], [-30, -150], [-12, -130], [8, -152], [26, -192]], false, 6), S.lw * .8, { boil: .4 }); shape(ell(-12, -126, 7, 7), { fill: P.mid, lw: S.lw * .7 });
    } else if (kind === 'flapper') {
      shape(spline([[-26, -194], [26, -194], [22, -140], [48, -92], [0, -84], [-48, -92], [-22, -140]], true, 6), { fill: P.light, lw: S.lw }); stroke([[-22, -140], [22, -140]], S.lw * .8);
      shape(spline([[-40, -96], [-34, -78], [0, -74], [34, -78], [40, -96]], true, 6), { fill: P.dmid, lw: S.lw * .7, boil: .5 });
    } else { // pj
      shape(ell(0, -138, 48, 70), { fill: P.white, lw: S.lw, shade: () => { const g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = P.light; for (let i = -3; i <= 3; i++) { const a = T.tx(i * 14, -220), b = T.tx(i * 14 + 6, -60); g.fillRect(a[0] - 3, a[1], 6, b[1] - a[1]); } } });
    }
    // head
    head(kind === 'matron' ? 'matron' : kind, { ...(o.look || {}), t: o.t }, -258);
    // arms in front
    const armF = (key, s) => { const A = o[key]; if (!A || !A.front) return; const sh = [s * 33, -188]; hose(sh, [A.x, A.y], A.bend ?? s * -14, 13); glove(A.x, A.y, A.rot ?? Math.atan2(A.y - sh[1], A.x - sh[0]), A.hand || 'open', A.hk ?? .85, { flip: s > 0 }); };
    armF('armL', -1); armF('armR', 1);
    pop();
  };
  if (ghost && (o.alpha ?? 1) < 1) layered(o.alpha, draw); else draw();
}

// ——— props ———
export function ironObj(p) { // the flat-iron: the whole object is the body
  push(); translate(p.x, p.y); if (p.flip) scale(-1, 1); scale(p.k || 1); scale(p.sx || 1, p.sy || 1); if (p.lean) rotate(p.lean);
  for (const s of [-1, 1]) { hose([s * 26, -34], [s * 34 + (p.step ? s * 10 : 0), -10], s * 4, 11); shoe(s * 34 - 8 + (p.step ? s * 10 : 0), -3, 1, .8); }
  // handle
  shape(spline([[-34, -92], [-22, -128], [26, -134], [50, -96], [34, -92], [20, -112], [-14, -110], [-18, -92]], true, 6), { fill: P.dark, lw: S.lw });
  shape(spline([[-76, -34], [78, -34], [62, -70], [8, -100], [-74, -86]], true, 6), { fill: P.pale, lw: S.lw, shade: () => { const g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = P.light; g.fillRect(...T.tx(-80, -48), 170 * T.zoom(), 20 * T.zoom()); } });
  shape(spline([[-76, -34], [78, -34], [74, -22], [-70, -22]], true, 5), { fill: P.dmid, lw: S.lw });
  pieEye(-18, -64, 12, 15, { type: p.eye || 'open', lx: p.lx ?? .3 }); pieEye(14, -64, 12, 15, { type: p.eye || 'open', lx: p.lx ?? .3 });
  mouth(-2, -46, 22, p.mouth || 'smile');
  for (let i = 0; i < 3; i++) stroke([[-40 + i * 40, -30], [-40 + i * 40, -26]], S.lw * .9);
  if (p.arm) { hose([54, -64], [p.arm.x, p.arm.y], 8, 10); glove(p.arm.x, p.arm.y, Math.atan2(p.arm.y + 64, p.arm.x - 54), p.arm.hand || 'wave', .6); }
  pop();
  if (p.steam !== false) steam(p.x + (p.flip ? 40 : -40) * (p.k || 1), p.y - 110 * (p.k || 1), 'lazy', p.t || 0, (p.k || 1) * .9);
}
export function clockObj(x, y, r, hAng, mAng, alarm = 0) {
  shape(ell(x, y, r, r), { fill: P.white, lw: S.lw * 1.1 }); shape(ell(x, y, r * .86, r * .86), { fill: P.paper, lw: S.lw * .5, boil: .3 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - Math.PI / 2; stroke([[x + Math.cos(a) * r * .72, y + Math.sin(a) * r * .72], [x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8]], S.lw * .8, { boil: 0 }); }
  stroke([[x, y], [x + Math.cos(hAng - Math.PI / 2) * r * .45, y + Math.sin(hAng - Math.PI / 2) * r * .45]], S.lw * 1.3, { boil: .3 });
  stroke([[x, y], [x + Math.cos(mAng - Math.PI / 2) * r * .7, y + Math.sin(mAng - Math.PI / 2) * r * .7]], S.lw * .9, { boil: .3 });
  dot(x, y, 4);
  if (alarm) for (const s of [-1, 1]) stroke([[x + s * (r + 6), y - r * .6], [x + s * (r + 24), y - r * .8]], S.lw * .9, { boil: 0 });
}
export function bedObj(p) { // iron hospital bed, side-on; patient shows head + hands over the blanket
  push(); translate(p.x, p.y); if (p.flip) scale(-1, 1); scale(p.k || 1);
  const br = p.breath || 0;
  for (const x of [-190, 190]) { shape(spline([[x - 7, 0], [x - 7, -150], [x + 7, -150], [x + 7, 0]], true, 3), { fill: P.dark, lw: S.lw * .7, boil: .3 }); }
  hose([-190, -128], [190, -128], 0, 8, P.dark);
  shape(spline([[-186, -90], [186, -90], [186, -118], [-186, -118]], true, 3), { fill: P.pale, lw: S.lw * .9 });
  // pillow
  shape(spline([[-176, -118], [-110, -140], [-70, -126], [-84, -104], [-170, -100]], true, 6), { fill: P.white, lw: S.lw * .9 });
  // patient head
  if (p.patient !== false) { push(); translate(-120, -150); scale(.9); head('pj', { ...(p.look || {}), t: p.t }, -26 + 10); pop(); }
  // blanket
  shape(spline([[-80, -118 - 4 * br], [-40, -148 - 6 * br], [40, -144 - 6 * br], [120, -150 - 6 * br], [186, -128 - 3 * br], [190, -66], [-80, -66]], true, 6), { fill: P.light, lw: S.lw, shade: () => { const g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = P.mid; for (let i = 0; i < 4; i++) { const a = T.tx(-60 + i * 62, -150), b = T.tx(-46 + i * 62, -70); g.fillRect(a[0], a[1], 10 * T.zoom(), b[1] - a[1]); } } });
  stroke([[-70, -108], [190, -108]], S.lw * .7, { boil: .5 });
  shape(spline([[-80, -118], [190, -128], [190, -100], [-78, -96]], true, 4), { fill: P.white, lw: S.lw * .8 });
  for (const x of [-170, 170]) shape(ell(x, 6, 16, 16), { fill: P.dark, lw: S.lw * .7 });
  pop();
}
export function bottle(x, y, k = 1, ang = 0) { push(); translate(x, y); rotate(ang); scale(k); shape(spline([[-18, 0], [-22, -30], [-10, -48], [-8, -66], [8, -66], [10, -48], [22, -30], [18, 0]], true, 5), { fill: P.light, lw: S.lw * .9 }); shape([[-9, -68], [9, -68], [8, -78], [-8, -78]], { fill: P.dark, lw: S.lw * .8 }); shape([[-14, -30], [14, -30], [14, -12], [-14, -12]], { fill: P.white, lw: S.lw * .6 }); stroke([[-8, -22], [8, -22]], S.lw * .5); pop(); }
export function qmark(x, y, k, rot = 0) { push(); translate(x, y); rotate(rot); scale(k); T.text('?', 0, 0, { font: '120px Shrikhand', fill: P.white, outlineW: 18 }); pop(); }
export function bubbleHeart(x, y, k) { heart(x, y, 46 * k, P.white); }
export function speedLines(x, y, dir, n, len) { for (let i = 0; i < n; i++) stroke([[x - dir * (20 + hash(i) * 20), y + (i - n / 2) * 24], [x - dir * (20 + len + hash(i + 3) * 30), y + (i - n / 2) * 24]], S.lw * .9, { boil: 0 }); }
