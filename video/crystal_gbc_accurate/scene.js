const A = j => TIM.sents[j].start;
function wrap(s, n) { const out = []; let cur = ''; for (const w of s.toUpperCase().split(' ')) { if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }
function plate(t) { P.fillStyle = DK; P.fillRect(8, 198, 164, 44); P.fillStyle = '#e8e0f8'; P.fillRect(9, 199, 162, 42); for (const se of TIM.sents) { if (t < se.start - 0.05 || t > se.end + 0.4) continue; const lines = wrap(se.text, 19), pages = []; for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2)); const tot = pages.reduce((a, p) => a + p.join('').length, 0); let t0 = se.start; const d = se.end - se.start;
    for (let pi = 0; pi < pages.length; pi++) { const pg = pages[pi], len = pg.join('').length, pd = d * len / tot; if (t < t0 + pd || pi === pages.length - 1) { for (let li = 0; li < pg.length; li++) pt(pg[li], 90, 206 + li * 17, 2, DK, { al: 'c' }); return; } t0 += pd; } } }
function crystalBG(t) { grad(0, PH, ['#101040', '#181858', '#202070', '#283088', '#3040a0', '#283088']); for (let i = 0; i < 18; i++) { const x = Math.round(R(i) * PW), y = Math.round((R(i + 9) * PH + t * (6 + R(i + 3) * 14)) % PH), s = 2 + Math.floor(R(i + 5) * 3); P.fillStyle = ['#70e0f8', '#b8f8f8', '#9858c8', '#f8f8f8'][i % 4]; for (let d = -s; d <= s; d++) P.fillRect(x - ((s - Math.abs(d)) / 2 | 0), y + d, Math.max(1, s - Math.abs(d)), 1); } }
function wipe(lt) { if (lt < 0.45) { const q = 1 - lt / 0.45; P.fillStyle = DK; for (let i = 0; i < 9; i++) { const w = Math.round(PW * q); P.fillRect(i % 2 ? 0 : PW - w, i * 16, w, 16); } } }
function console_(t, st) { MP.fillStyle = '#0c0818'; MP.fillRect(0, 0, 180, 320); P.fillStyle = DK; P.fillRect(1, 12, 178, 306); P.fillStyle = '#8060d0'; P.fillRect(2, 13, 176, 304); P.fillStyle = '#9878e0'; P.fillRect(2, 13, 176, 3); P.fillRect(2, 13, 3, 304); P.fillStyle = '#6848b0'; P.fillRect(175, 13, 3, 304); P.fillRect(2, 314, 176, 3);
  P.fillStyle = DK; P.fillRect(5, 30, 170, 164); P.fillStyle = '#383848'; P.fillRect(6, 31, 168, 162); P.fillStyle = (Math.floor(t * 2) % 8) ? '#f83030' : '#901818'; P.fillRect(8, 110, 2, 3);
  pt('RG BRICK&STICKVERSE', 90, 19, 1, WH, { al: 'c' }); const cc = ['#f83058', '#f8a030', '#58d058', '#38a8f8', '#b868f8']; 'COLOR'.split('').forEach((ch, i) => pt(ch, 80 + i * 5, 186, 1, cc[i]));
  const dx = 40, dy = 278; P.fillStyle = DK; P.fillRect(dx - 6, dy - 16, 12, 32); P.fillRect(dx - 16, dy - 6, 32, 12); P.fillStyle = '#28283a'; P.fillRect(dx - 5, dy - 15, 10, 30); P.fillRect(dx - 15, dy - 5, 30, 10); P.fillStyle = '#f8d030'; if (st.dir === 'u') P.fillRect(dx - 5, dy - 15, 10, 9); if (st.dir === 'd') P.fillRect(dx - 5, dy + 6, 10, 9); if (st.dir === 'r') P.fillRect(dx + 6, dy - 5, 9, 10);
  for (const [bx, by, on, lab] of [[146, 268, st.a, 'A'], [122, 284, st.b, 'B']]) { at(bx, by, 1, 1, () => { eo_(0, on ? 1 : 0, 9, 9, on ? '#f86088' : '#c02858'); }); pt(lab, bx - 1, by - 2 + (on ? 1 : 0), 1, WH); }
  P.fillStyle = DK; P.fillRect(70, 304, 14, 5); P.fillRect(92, 304, 14, 5); P.fillStyle = '#585870'; P.fillRect(71, 305, 12, 3); P.fillRect(93, 305, 12, 3); }
const SHOTS = [
 // 0 title screen
 (lt, d) => { crystalBG(lt); const y0 = Math.round(lerp(-30, 14, eo(prog(lt, 0.2, 0.7)))); pt('CRYSTAL', 80, y0, 5, '#70e0f8', { al: 'c', sh: DK, shw: 2 }); if (Math.floor(lt * 8) % 6 === 0) pt('CRYSTAL', 80, y0, 5, WH, { al: 'c' }); pt('VERSION', 80, y0 + 32, 2, WH, { al: 'c', sh: DK });
   P.fillStyle = '#101040'; P.fillRect(0, 116, PW, 28); P.fillStyle = '#3040a0'; for (let i = 0; i < 10; i++) P.fillRect(((i * 20 - lt * 110) % 200 + 200) % 200 - 20, 120 + (i % 3) * 7, 10, 1);
   at(lerp(-50, 80, eo(prog(lt, 0.5, 1.8))), 122, 1.5, 1, () => beast(lt, { run: true })); if (lt > 1.6 && Math.floor(lt * 3) % 2) pt('PRESS START', 80, 132, 1, WH, { al: 'c' }); return { a: lt > 2.9 }; },
 // 1 boy or girl
 (lt, d) => { fill('#f8f8f8'); const pick = lt > 2.3, sel = lt > 1.7 ? 1 : 0;
   if (!pick) { at(52, 88, 3, 1, () => girl(0, {})); P.fillStyle = 'rgba(248,248,248,0.82)'; P.fillRect(20, 14, 64, 78); pt('?', 52, 40, 5, DK, { al: 'c' }); } else { const hop = -Math.abs(Math.round(Math.sin((lt - 2.3) * 9) * 6 * Math.max(0, 1 - (lt - 2.3) / 1.4))); at(52, 88 + hop, 3, 1, () => girl(lt, { smile: true, cheer: lt < 3.6 })); for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * PI + lt * 2; spark(52 + Math.cos(a) * 34, 52 + Math.sin(a) * 34, 1 + i % 2, i % 2 ? '#f8d030' : '#70e0f8'); } }
   if (lt > 1.0) { gbox(100, 40, 56, 44); pt('BOY', 116, 50, 2, DK); pt('GIRL', 116, 66, 2, DK); if (!pick || Math.floor(lt * 8) % 2) { P.fillStyle = DK; const cy = 52 + sel * 16; P.fillRect(108, cy, 2, 6); P.fillRect(110, cy + 1, 2, 4); P.fillRect(112, cy + 2, 1, 2); } }
   gtext(pick ? ['YOU ARE A GIRL!'] : ['ARE YOU A BOY?', 'OR ARE YOU A GIRL?'], lt, pick ? 2.3 : 0.1); return { dir: lt > 1.6 && lt < 1.9 ? 'd' : null, a: lt > 2.2 && lt < 2.6 }; },
 // 2 animated battle intro
 (lt, d) => { fill('#f8f8f8'); const sl = Math.round(lerp(110, 0, eo(prog(lt, 0.3, 0.8)))), an = lt > 0.9 && lt < 2.5, ph = (lt - 0.9) * 8, hop = an ? Math.abs(Math.round(Math.sin(ph) * 5)) : 0, sq = an ? Math.round(Math.cos(ph * 2) * 1.4) : 0;
   at(120 + sl, 52, 1.5, -1, () => critter(lt, { hop, sq })); at(30 - sl, 95, 1.7, 1, () => firemon(lt, {}));
   if (lt > 0.8) ehud('SENTRET', 3, 1); if (lt > 0.8) phud('CYNDAQUIL', 5, 1, 20, 0.35);
   if (lt < 2.9) gtext(['WILD SENTRET', 'APPEARED!'], lt, 0.8); else { gtext([], lt); menu(lt > 4.0 ? 0 : 0, lt); } wipe(lt); return { a: lt > 2.7 && lt < 3.0 }; },
 // 3 overworld chase + location signs
 (lt, d) => { tileGround(lt * 64, lt); at(72, 36 + Math.round(Math.sin(lt * 2) * 5), 1, 1, () => beast(lt, { run: true })); at(72, 88, 1, 1, () => girl(lt, { back: true, walk: true }));
   const names = ['ROUTE 36', 'CIANWOOD CITY', 'ROUTE 42'], per = d / 3, ni = Math.min(2, Math.floor(lt / per)), q = (lt % per) / per, yy = q < 0.15 ? lerp(-22, 2, q / 0.15) : q > 0.8 ? lerp(2, -22, (q - 0.8) / 0.2) : 2; P.fillStyle = DK; P.fillRect(24, Math.round(yy), 112, 20); P.fillStyle = '#c8a868'; P.fillRect(25, Math.round(yy) + 1, 110, 18); P.fillStyle = '#f8e8b8'; P.fillRect(27, Math.round(yy) + 3, 106, 14); pt(names[ni], 80, Math.round(yy) + 6, 2, DK, { al: 'c' }); return { dir: 'u' }; },
 // 4 wild Suicune fled
 (lt, d) => { fill('#f8f8f8'); const fl = 2.0, fled = lt > fl, q = prog(lt, fl, fl + 0.5), sl = Math.round(lerp(110, 0, eo(prog(lt, 0.3, 0.8))));
   if (q < 1) { at(118 + sl + q * 90, 56 - q * 20, 1.4, -1, () => beast(lt, { run: fled })); if (fled) for (let i = 0; i < 6; i++) { P.fillStyle = DK; P.fillRect(Math.round(90 + q * 60 - i * 10), 30 + i * 5, 8, 1); } }
   at(30 - sl, 95, 1.7, 1, () => firemon(lt, {})); if (lt > 0.8) { if (!fled) ehud('SUICUNE', 40, 1); phud('QUILAVA', 22, 1, 61, 0.6); }
   gtext(fled ? ['WILD SUICUNE', 'FLED!'] : ['WILD SUICUNE', 'APPEARED!'], lt, fled ? fl + 0.3 : 0.8); if (fled && lt > fl + 1.6) { pt('...', 34, 56, 2, DK); } wipe(lt); return { a: lt > 1.7 && lt < 2.0 }; },
 // 5 battle tower
 (lt, d) => { const pan = Math.round(lerp(0, 230, eo(prog(lt, 0.2, d - 1.2)))); grad(0, 96, ['#68a0e8', '#88b8f0', '#a8d0f8', '#c8e0f8']); for (let i = 0; i < 4; i++) { const x = ((i * 50 + lt * 8) % 220) - 30, y = 10 + i * 22; P.fillStyle = WH; P.fillRect(Math.round(x), y, 26, 5); P.fillRect(Math.round(x) + 5, y - 3, 14, 3); }
   const by = 84 + pan; P.fillStyle = '#58b040'; P.fillRect(0, by, PW, 60);
   for (let f = 0; f < 9; f++) { const y = by - 36 - f * 36, w = 88 - f * 4, x = 80 - w / 2; if (y > 100 || y < -40) continue; P.fillStyle = DK; P.fillRect(x - 1, y - 1, w + 2, 38); P.fillStyle = f % 2 ? '#c8c8d8' : '#d8d8e8'; P.fillRect(x, y, w, 36); P.fillStyle = '#d83030'; P.fillRect(x - 4, y - 3, w + 8, 4); P.fillStyle = DK; P.fillRect(x - 4, y + 1, w + 8, 1); for (let k = 0; k < 4; k++) { const lit = Math.floor(lt * 3 + f + k) % 5 !== 0, wx = Math.round(x + 7 + k * (w - 14) / 4); P.fillStyle = DK; P.fillRect(wx, y + 10, 11, 14); P.fillStyle = lit ? '#f8e888' : '#405078'; P.fillRect(wx + 1, y + 11, 9, 12); } }
   if (by - 20 < 96) { P.fillStyle = DK; P.fillRect(71, by - 20, 18, 20); P.fillStyle = '#785028'; P.fillRect(73, by - 18, 14, 18); at(80, by + 10, 1, 1, () => girl(lt, { back: true, walk: lt < 0.6 })); }
   const n = Math.min(7, 1 + Math.floor(prog(lt, 1.4, d - 1.4) * 7)); gtext(lt > d - 1.3 ? ['NO ITEMS ALLOWED!'] : lt > 1.2 ? ['BATTLE TOWER', 'ROOM ' + n + ' OF 7'] : ['BATTLE TOWER'], lt, lt > d - 1.3 ? d - 1.3 : 0.1, 40); return { dir: lt < 0.6 ? 'u' : null, a: lt > 1.4 && Math.floor(lt * 3) % 2 === 0 }; },
 // 6 gotcha
 (lt, d) => { fill('#f8f8f8'); const thr = prog(lt, 0.2, 0.6), absorbed = lt > 0.6, caught = lt > 1.95;
   if (!absorbed) at(118, 56, 1.4, -1, () => beast(lt, {})); else if (lt < 0.8) { const q = (lt - 0.6) / 0.2; at(118, 50, 1.4 * (1 - q), 1, () => e_(0, -10, 16, 10, '#f85888')); }
   at(30, 95, 1.7, 1, () => firemon(lt, {})); if (lt > 0.2) { let bx = lerp(50, 118, thr), byy = lerp(80, 44, thr) - Math.sin(thr * PI) * 34, tilt = 0; if (absorbed) { bx = 118; byy = Math.min(56, 44 + (lt - 0.6) * 60); const w = lt - 0.85; if (w > 0 && !caught) { const ph = (w % 0.36) / 0.36; tilt = ph < 0.5 ? Math.round(Math.sin(ph * 4 * PI) * 2) : 0; } } at(bx + tilt, byy, 1.2, 1, () => ballS(lt, {})); if (caught) for (let i = 0; i < 3; i++) { const q = (lt - 1.95) * 2; if (q < 1) spark(108 + i * 10, 40 - q * 10 - (i % 2) * 4, 2, DK); } }
   if (!absorbed) ehud('SUICUNE', 40, 0.1); phud('QUILAVA', 34, 0.55, 88, 0.6);
   gtext(caught ? ['GOTCHA! SUICUNE', 'WAS CAUGHT!'] : absorbed ? ['...'] : ['YOU USED', 'ULTRA BALL!'], lt, caught ? 1.95 : absorbed ? 0.85 : 0.0, caught ? 30 : absorbed ? 3 : 40); wipe(lt); return { a: lt < 0.3 || (lt > 1.9 && lt < 2.2) }; },
 // 7 end
 (lt, d) => { crystalBG(lt); pt('DID YOU PLAY', 80, 10, 2, WH, { al: 'c', sh: DK }); pt('CRYSTAL?', 80, 26, 4, Math.floor(lt * 6) % 5 === 0 ? WH : '#70e0f8', { al: 'c', sh: DK, shw: 2 }); at(52, 92, 1.5, 1, () => girl(lt, { smile: true, cheer: Math.floor(lt * 2) % 2 === 0 })); at(112, 92, 1.2, -1, () => beast(lt, {}));
   gtext(lt > 3.0 ? ['FOLLOW RG BRICK&', 'STICKVERSE!'] : ['COMMENT BELOW!'], lt, lt > 3.0 ? 3.0 : 1.2); return { a: Math.floor(lt * 2) % 4 === 0 }; },
];
function frame(t) {
  let k = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= (j === 0 ? 0 : A(j) - 0.15)) k = j;
  const st = k === 0 ? 0 : A(k) - 0.15, en = k + 1 < SHOTS.length ? A(k + 1) - 0.15 : TIM.dur, ls = t - st;
  P = GP; PW = 160; PH = 144; P.setTransform(1, 0, 0, 1, 0, 0); P.globalAlpha = 1; P.clearRect(0, 0, 160, 144); const state = SHOTS[k](ls, en - st) || {};
  if (k > 0 && ls < 0.12) { P.fillStyle = WH; P.globalAlpha = 1 - ls / 0.12; P.fillRect(0, 0, 160, 144); P.globalAlpha = 1; }
  if (t < 0.5) { P.fillStyle = '#000'; P.globalAlpha = 1 - t / 0.5; P.fillRect(0, 0, 160, 144); P.globalAlpha = 1; }
  P = MP; PW = 180; PH = 320; P.setTransform(1, 0, 0, 1, 0, 0); P.globalAlpha = 1; console_(t, state); MP.drawImage(gc, 10, 38); plate(t);
  if (t > TIM.dur - 0.4) { P.globalAlpha = prog(t, TIM.dur - 0.4, TIM.dur); P.fillStyle = '#000'; P.fillRect(0, 0, 180, 320); P.globalAlpha = 1; }
  X0.imageSmoothingEnabled = false; X0.drawImage(pc, 0, 0, 1080, 1920);
}
window.frame = frame;
