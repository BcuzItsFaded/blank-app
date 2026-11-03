// TIM injected as window.TIM
const INTRO = 5, OUTRO = 7;
function chunks(sent) {
  const words = sent.text.split(' '), out = []; let cur = [];
  for (const w of words) { cur.push(w); if (cur.length >= 9 || (cur.length >= 5 && /[,;:]$/.test(w))) { out.push(cur.join(' ')); cur = []; } }
  if (cur.length) { if (cur.length <= 2 && out.length) out[out.length - 1] += ' ' + cur.join(' '); else out.push(cur.join(' ')); }
  const tot = out.reduce((a, s) => a + s.length, 0); let t = sent.start; const dur = sent.end - sent.start;
  return out.map(s => { const st = t; t += dur * s.length / tot; return { s, st, en: t }; });
}
function captions(sc, t) {
  for (const se of TIM[sc].sents) { if (t < se.start - 0.05 || t > se.end + 0.35) continue;
    for (const c of chunks(se)) if (t >= c.st - 0.05 && t < c.en + (c.en >= se.end - 0.01 ? 0.35 : 0)) {
      X.save(); X.font = '700 46px Inter'; const w = X.measureText(c.s).width;
      X.globalAlpha = 0.55; rect(960 - w / 2 - 26, 1000 - 36, w + 52, 72, '#000'); X.globalAlpha = 1; X.restore();
      txt(c.s, 960, 1000, 46, '#fff', { w: 700, stroke: 'rgba(0,0,0,0.9)', sw: 6 }); return; } }
}
function sceneTitle(sc, t) {
  const a = prog(t, 0.2, 0.8) * (1 - prog(t, 4.6, 5.3)); if (a <= 0) return;
  const sl = (1 - eo(prog(t, 0.2, 1.0))) * -80;
  X.save(); X.globalAlpha = a; X.translate(sl, 0);
  rect(70, 70, 6, 110, RED);
  txt(`SCENE ${String(sc + 1).padStart(2, '0')}`, 100, 92, 26, RED, { al: 'left', ls: 8, w: 800 });
  txt(TIM[sc].title.toUpperCase(), 100, 145, 50, CREAM, { al: 'left', ls: 3, w: 900, stroke: 'rgba(0,0,0,0.8)', sw: 8 });
  X.restore();
}
function brand(t, a = 1) { txt("DON'T SPOIL IT", 960, 430, 120, CREAM, { w: 900, ls: 14, glow: 'rgba(255,90,40,0.9)', gb: 40, a }); txt('RG', 960, 560, 90, RED, { w: 900, ls: 30, glow: RED, gb: 30, a }); }
function intro(t) {
  fillBG('#080302', '#000'); glow(960, 1100, 1100, 'rgba(255,90,30,0.35)'); particles(t, { n: 80, c: '#ffb050', a: 0.8, up: true, sp: 60, add: true });
  const a = prog(t, 0.3, 1.2) * (1 - prog(t, INTRO - 0.6, INTRO));
  X.save(); X.translate(960, 540); const s = 1 + 0.05 * t / INTRO; X.scale(s, s); X.translate(-960, -540); brand(t, a); X.restore();
  txt('EPISODE 3 · ALIEN 3 (1992)', 960, 700, 44, '#ffcf9a', { ls: 10, a: prog(t, 1.2, 1.9) * a, w: 700 });
  txt("The Prison Planet, the Hidden Queen & Ripley's Final Sacrifice", 960, 780, 34, CREAM, { a: prog(t, 1.8, 2.6) * a * 0.85, w: 500 });
  post(t, {});
}
function outro(t) {
  fillBG('#000', '#000'); glow(960, 540, 900, `rgba(255,90,30,${0.2 * prog(t, 0.5, 2)})`);
  const a = prog(t, 0.6, 1.8) * (1 - prog(t, OUTRO - 0.8, OUTRO)); brand(t, a);
  txt('EPISODE 3 · ALIEN 3 (1992)', 960, 700, 40, '#ffcf9a', { ls: 10, a: prog(t, 2, 2.6) * a, w: 700 });
  txt('LIKE · SUBSCRIBE · NO SPOILERS (EXCEPT THESE)', 960, 800, 30, CREAM, { ls: 6, a: prog(t, 3, 3.6) * a * 0.8, w: 600 });
  post(t, {});
}
function drawShot(ctx, sc, k, t) {
  const shots = SCENES[sc], sh = shots[k], st = shotStart(sc, k), en = k + 1 < shots.length ? shotStart(sc, k + 1) : TIM[sc].dur;
  X = ctx; X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over';
  X.save(); const o = sh.fn(t - st, en - st, j => TIM[sc].sents[j].start - st) || {}; X.restore();
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.globalCompositeOperation = 'source-over';
  return o;
}
function shotStart(sc, k) { return k === 0 ? 0 : Math.max(0, TIM[sc].sents[SCENES[sc][k].s].start - 0.35); }
function frame(seg, t) {
  X = X0; X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.clearRect(0, 0, W, H);
  if (seg === 0) return intro(t);
  if (seg === 13) return outro(t);
  const sc = seg - 1, shots = SCENES[sc];
  let k = 0; for (let i = 0; i < shots.length; i++) if (t >= shotStart(sc, i)) k = i;
  let o = drawShot(X0, sc, k, t);
  const since = t - shotStart(sc, k), XF = 0.6;
  if (k > 0 && !shots[k].cut && since < XF) {
    OX.setTransform(1, 0, 0, 1, 0, 0); OX.clearRect(0, 0, W, H); drawShot(OX, sc, k - 1, t);
    X = X0; X.globalAlpha = 1 - since / XF; X.drawImage(off, 0, 0); X.globalAlpha = 1;
  }
  X = X0; post(t, o);
  // scene fade in/out
  const fin = 1 - prog(t, 0, 0.5), fout = prog(t, TIM[sc].dur - 0.5, TIM[sc].dur);
  if (fin > 0 || fout > 0) { X.globalAlpha = Math.max(fin, fout); rect(0, 0, W, H, '#000'); X.globalAlpha = 1; }
  sceneTitle(sc, t);
  captions(sc, t);
}
window.frame = frame;
window.segDur = seg => seg === 0 ? INTRO : seg === 13 ? OUTRO : TIM[seg - 1].dur;
