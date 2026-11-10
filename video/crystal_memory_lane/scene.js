const A = j => TIM.sents[j].start;
function wrap(s, n) { const out = []; let cur = ''; for (const w of s.toUpperCase().split(' ')) { if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }
function dialog(t) { box(4, 262, 172, 50); for (const se of TIM.sents) { if (t < se.start - 0.05 || t > se.end + 0.4) continue; const lines = wrap(se.text, 20), pages = []; for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2)); const tot = pages.reduce((a, p) => a + p.join('').length, 0); let t0 = se.start; const d = se.end - se.start;
    for (let pi = 0; pi < pages.length; pi++) { const pg = pages[pi], len = pg.join('').length, pd = d * len / tot; if (t < t0 + pd || pi === pages.length - 1) { let n = Math.floor(clamp((t - t0) / (pd * 0.85)) * len); for (let li = 0; li < pg.length; li++) { pt(pg[li].slice(0, Math.max(0, n)), 11, 272 + li * 17, 2, DK); n -= pg[li].length; } if (Math.floor(t * 4) % 2) { P.fillStyle = '#d83030'; P.fillRect(164, 302, 5, 2); P.fillRect(165, 304, 3, 1); P.fillRect(166, 305, 1, 1); } return; } t0 += pd; } } }
function header(k, title) { pt('RG BRICK&STICKVERSE', 90, 6, 1, WH, { al: 'c', sh: DK }); if (title) { P.fillStyle = DK; P.fillRect(0, 16, PW, 15); P.fillStyle = '#f8d030'; P.fillRect(0, 16, PW, 1); P.fillRect(0, 30, PW, 1); pt('MEMORY ' + k + ' - ' + title, 90, 21, 1, '#f8d030', { al: 'c' }); } }
function crystalBG(t) { grad(0, PH, ['#101040', '#181858', '#202070', '#283088', '#3040a0', '#283088', '#202070', '#181858']); for (let i = 0; i < 26; i++) { const x = Math.round(R(i) * PW), y = Math.round((R(i + 9) * PH + t * (6 + R(i + 3) * 14)) % PH), s = 2 + Math.floor(R(i + 5) * 4), c = ['#70e0f8', '#b8f8f8', '#9858c8', '#f8f8f8'][i % 4]; P.fillStyle = c; for (let d = -s; d <= s; d++) P.fillRect(x - (s - Math.abs(d)) / 2 | 0, y + d, Math.max(1, s - Math.abs(d)), 1); if (Math.floor(t * 6 + i) % 9 === 0) spark(x, y, 2); } }
function wipe(lt) { if (lt < 0.5) { const q = 1 - lt / 0.5; P.fillStyle = DK; for (let i = 0; i < 10; i++) { const w = Math.round(PW * q); P.fillRect(i % 2 ? 0 : PW - w, 32 + i * 23, w, 23); } } }
const SHOTS = [
 // 0 title
 (lt, d) => { crystalBG(lt); const a = prog(lt, 0.2, 0.7), y0 = Math.round(lerp(-30, 60, eo(a))); pt('CRYSTAL', 90, y0, 6, '#70e0f8', { al: 'c', sh: DK, shw: 2 }); for (let i = 0; i < 5; i++) { const sx = 10 + ((lt * 60 + i * 37) % 160); if (lt > 0.8) spark(sx, y0 + 4 + (i * 7) % 28, 1 + i % 2); }
   pt('VERSION', 90, y0 + 40, 3, WH, { al: 'c', sh: DK }); if (lt > 1.2) { P.fillStyle = DK; P.fillRect(14, 132, 152, 19); P.fillStyle = '#f8d030'; P.fillRect(15, 133, 150, 17); P.fillStyle = DK; P.fillRect(16, 134, 148, 15); pt('QUICK MEMORY LANE', 90, 137, 2, '#f8d030', { al: 'c' }); }
   P.fillStyle = '#181848'; P.fillRect(0, 236, PW, 26); P.fillStyle = '#3040a0'; for (let i = 0; i < 12; i++) P.fillRect(((i * 20 - lt * 90) % 240 + 240) % 240 - 20, 240 + (i % 3) * 7, 10, 1);
   at(lerp(-60, 100, eo(prog(lt, 0.6, 2.2))), 240, 2, 1, () => beast(lt, { run: true })); header(); },
 // 1 play as a girl
 (lt, d) => { grad(0, PH, ['#f8d0e0', '#f8c0d8', '#f0b0d0', '#e8a0c8']); for (let i = 0; i < 12; i++) { P.fillStyle = 'rgba(255,255,255,0.35)'; P.fillRect(0, ((i * 30 + lt * 20) % 340) - 10, PW, 6); }
   const pick = lt > 1.7, sel = lt > 1.1 ? 1 : 0; box(100, 44, 70, 44); pt('BOY', 122, 54, 2, DK); pt('GIRL', 122, 70, 2, DK); if (!pick || Math.floor(lt * 8) % 2) { P.fillStyle = DK; const cy = 56 + sel * 16; P.fillRect(110, cy, 2, 6); P.fillRect(112, cy + 1, 2, 4); P.fillRect(114, cy + 2, 2, 2); }
   box(8, 44, 86, 44); pt('ARE YOU', 14, 54, 2, DK); pt('A BOY OR', 14, 66, 1, DK); pt('A GIRL?', 14, 76, 1, DK);
   const hop = pick ? -Math.abs(Math.round(Math.sin((lt - 1.7) * 9) * 10 * Math.max(0, 1 - (lt - 1.7) / 1.6))) : 0; if (pick) { for (let i = 0; i < 10; i++) { const a = i / 10 * 2 * PI + lt * 2, rr = 40 + 10 * Math.sin(lt * 5 + i); spark(90 + Math.cos(a) * rr, 185 + Math.sin(a) * rr * 0.8, 1 + i % 2, i % 2 ? '#f8d030' : WH); } }
   at(90, 232 + hop, 5, 1, () => girl(lt, { smile: pick, cheer: pick && lt < 3.2, walk: !pick })); if (!pick) { P.fillStyle = 'rgba(24,24,48,0.55)'; P.fillRect(40, 100, 100, 140); pt('?', 90, 150, 8, WH, { al: 'c', sh: DK }); }
   if (lt > 0.2) pt('2001', 90, 100, 3, '#d83030', { al: 'c', sh: WH }); if (pick) pt('NEW!', 150, 120 + Math.round(Math.sin(lt * 8) * 2), 3, '#f8d030', { al: 'c', sh: DK });
   header(1, 'PLAY AS A GIRL'); },
 // 2 animated sprites
 (lt, d) => { battleBG(lt); const intro = prog(lt, 0.6, 2.4), ph = intro * PI * 4, hop = lt > 0.6 && lt < 2.4 ? Math.abs(Math.round(Math.sin(ph) * 7)) : 0, sq = lt > 0.6 && lt < 2.4 ? Math.round(Math.cos(ph * 2) * 1.5) : 0, slide = Math.round(lerp(120, 0, eo(prog(lt, 0.2, 0.6))));
   at(128 + slide, 122, 2.5, -1, () => firemon(lt, { hop, sq, open: lt > 2.4 && lt < 3.2 })); at(48 - slide, 236, 3.5, 1, () => girl(lt, { back: true }));
   if (lt > 0.6 && lt < 2.4) for (let i = 0; i < 3; i++) { P.fillStyle = DK; const yy = 70 + i * 8; P.fillRect(84 - i * 4, yy, 8, 1); P.fillRect(166 + i * 3, yy + 4, 8, 1); }
   hpBar(6, 44, 'FIRE PAL', 5, 1); hpBar(90, 196, 'YOUR PAL', 5, 1);
   if (lt > 2.5) { const k = Math.floor(lt * 6) % 2; P.fillStyle = DK; P.fillRect(26, 146, 128, 22); P.fillStyle = k ? '#f8d030' : WH; P.fillRect(27, 147, 126, 20); pt('IT MOVES!', 90, 152, 3, DK, { al: 'c' }); }
   header(2, 'ANIMATED SPRITES'); wipe(lt); },
 // 3 chase across Johto
 (lt, d) => { const sy = lt * 70; tileGround(sy, lt); at(90, 120 + Math.round(Math.sin(lt * 2) * 8), 1.5, 1, () => beast(lt, { run: true })); for (let i = 0; i < 6; i++) { P.fillStyle = 'rgba(255,255,255,0.6)'; P.fillRect(70 + i * 9, 130 + ((lt * 200 + i * 23) % 60), 1, 6); }
   at(90, 226, 2, 1, () => girl(lt, { back: true, walk: true }));
   const names = ['ROUTE 36', 'CIANWOOD', 'ROUTE 42'], ni = Math.min(2, Math.floor(lt / 1.15)), q = (lt % 1.15) / 1.15, bx = q < 0.15 ? lerp(-90, 6, q / 0.15) : q > 0.85 ? lerp(6, -90, (q - 0.85) / 0.15) : 6; box(Math.round(bx), 38, 82, 18); pt(names[ni], Math.round(bx) + 41, 45, 1, DK, { al: 'c' });
   header(3, 'CHASING SUICUNE'); },
 // 4 it runs away
 (lt, d) => { const per = d / 3, k = Math.min(2, Math.floor(lt / per)), q = (lt - k * per) / per; tileGround(k * 300 + 40, lt);
   const gy = Math.round(lerp(236, 196, eo(prog(q, 0.0, 0.45)))), fled = q > 0.5, sx = fled ? lerp(90, 230, eo(prog(q, 0.5, 0.8))) : 90, syy = fled ? lerp(150, 80, eo(prog(q, 0.5, 0.8))) : 150;
   at(sx, syy, 1.5, 1, () => beast(lt, { run: fled })); if (fled) for (let i = 0; i < 7; i++) { P.fillStyle = WH; P.fillRect(Math.round(sx - 30 - i * 12), Math.round(syy - 10 - i * 2 + (i % 2) * 6), 9, 1); }
   if (q > 0.38 && q < 0.55) { box(96, 108, 14, 16); pt('!', 101, 113, 2, '#d83030'); }
   at(90, gy, 2, 1, () => girl(lt, { back: true, walk: q < 0.45 })); if (q > 0.7) { pt('...', 104, gy - 56, 2, DK, { sh: WH }); }
   if (q > 0.55) { box(30, 60, 120, 18); pt('SUICUNE FLED!', 90, 67, 1, DK, { al: 'c' }); }
   P.fillStyle = DK; P.fillRect(128, 36, 46, 15); pt('X' + (k + 1), 151, 39, 2, '#f8d030', { al: 'c' }); header(4, 'IT RAN AWAY'); },
 // 5 battle tower
 (lt, d) => { const pan = Math.round(lerp(0, 260, eo(prog(lt, 0.2, d - 0.6)))); grad(0, PH, ['#4878d8', '#5888e0', '#68a0e8', '#88b8f0', '#a8d0f8', '#c8e0f8']); for (let i = 0; i < 6; i++) { const x = ((i * 50 + lt * 8) % 240) - 30, y = 40 + i * 44 + pan * 0.3 - 60; P.fillStyle = WH; P.fillRect(Math.round(x), Math.round(y), 30, 6); P.fillRect(Math.round(x) + 6, Math.round(y) - 3, 16, 3); }
   const by = 250 + pan; P.fillStyle = '#58b040'; P.fillRect(0, by, PW, 80);
   for (let f = 0; f < 9; f++) { const y = by - 44 - f * 44, w = 96 - f * 4, x = 90 - w / 2; P.fillStyle = DK; P.fillRect(x - 1, y - 1, w + 2, 46); P.fillStyle = f % 2 ? '#c8c8d8' : '#d8d8e8'; P.fillRect(x, y, w, 44); P.fillStyle = '#9090a8'; P.fillRect(x, y + 40, w, 4); P.fillStyle = '#d83030'; P.fillRect(x - 4, y - 3, w + 8, 4); P.fillStyle = DK; P.fillRect(x - 4, y + 1, w + 8, 1);
     for (let k = 0; k < 4; k++) { const lit = Math.floor(lt * 3 + f + k) % 5 !== 0; P.fillStyle = DK; P.fillRect(x + 8 + k * (w - 16) / 4, y + 12, 12, 16); P.fillStyle = lit ? '#f8e888' : '#405078'; P.fillRect(x + 9 + k * (w - 16) / 4, y + 13, 10, 14); } }
   P.fillStyle = DK; P.fillRect(80, by - 22, 20, 22); P.fillStyle = '#785028'; P.fillRect(82, by - 20, 16, 20); const ty = by - 44 - 9 * 44; P.fillStyle = DK; P.fillRect(60, ty + 20, 60, 24); P.fillStyle = '#d83030'; P.fillRect(62, ty + 22, 56, 20); P.fillStyle = '#f8d030'; P.fillRect(88, ty, 4, 22);
   at(90, by + 14, 1.5, 1, () => girl(lt, { back: true, walk: lt < 0.6 }));
   const n = Math.min(7, 1 + Math.floor(prog(lt, 1.6, d - 0.8) * 7)); if (lt > 1.4) { box(40, 104, 100, 34); pt('BATTLE', 90, 110, 2, DK, { al: 'c' }); pt(n + '/7', 90, 124, 2, n === 7 ? '#d83030' : DK, { al: 'c' }); for (let i = 0; i < 7; i++) { P.fillStyle = i < n ? '#40c858' : '#b0b0c0'; P.fillRect(48 + i * 12, 140, 9, 4); } }
   if (lt > 2.6) { P.fillStyle = '#d83030'; P.fillRect(28, 160, 124, 18); P.fillStyle = WH; P.fillRect(29, 161, 122, 16); pt('NO ITEMS!', 90, 164, 2, '#d83030', { al: 'c' }); }
   header(5, 'THE BATTLE TOWER'); },
 // 6 the catch
 (lt, d) => { battleBG(lt); const thr = prog(lt, 0.3, 0.8), absorbed = lt > 0.8, sh0 = 1.0, caught = lt > 2.35;
   if (!absorbed) at(128, 122, 1.8, -1, () => beast(lt, {})); else if (lt < 1.0) { P.fillStyle = WH; const q = (lt - 0.8) / 0.2; at(128, 122, 1.8 * (1 - q), -1, () => { e_(0, -14, 16, 10, WH); }); }
   at(48, 236, 3.5, 1, () => girl(lt, { back: true, cheer: caught }));
   if (lt > 0.3) { let bx = lerp(60, 128, thr), byy = lerp(190, 110, thr) - Math.sin(thr * PI) * 60, tilt = 0; if (absorbed) { bx = 128; byy = Math.min(122, 110 + (lt - 0.8) * 60); const w = lt - sh0; if (w > 0 && !caught) { const ph = (w % 0.45) / 0.45; tilt = ph < 0.5 ? Math.round(Math.sin(ph * 2 * PI * 2) * 2) : 0; } }
     at(bx + tilt, byy, 1.6, 1, () => ballS(lt, { tilt })); if (caught) for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * PI, rr = (lt - 2.35) * 60; if (rr < 40) spark(128 + Math.cos(a) * rr, 112 + Math.sin(a) * rr, 2, i % 2 ? '#f8d030' : WH); } }
   hpBar(6, 44, 'SUICUNE', 40, 0.12); hpBar(90, 196, 'YOUR PAL', 42, 0.6);
   if (caught) { const k = Math.floor(lt * 6) % 2; P.fillStyle = DK; P.fillRect(26, 146, 128, 22); P.fillStyle = k ? '#70e0f8' : WH; P.fillRect(27, 147, 126, 20); pt('GOTCHA!', 90, 152, 3, DK, { al: 'c' }); for (let i = 0; i < 12; i++) spark((R(i) * PW), (R(i + 3) * 200 + lt * 40) % 230 + 30, 1 + i % 2, ['#70e0f8', WH, '#f8d030'][i % 3]); }
   header(6, 'GOTCHA!'); wipe(lt); },
 // 7 end card
 (lt, d) => { crystalBG(lt); pt('DID YOU PLAY', 90, 50, 3, WH, { al: 'c', sh: DK }); const k = 1; pt('CRYSTAL?', 90, 72, 5, Math.floor(lt * 6) % 5 === 0 ? WH : '#70e0f8', { al: 'c', sh: DK, shw: 2 });
   if (lt > 1.4) { P.fillStyle = DK; P.fillRect(20, 112, 140, 19); P.fillStyle = WH; P.fillRect(21, 113, 138, 17); pt('COMMENT BELOW', 90, 117, 2, DK, { al: 'c' }); }
   if (lt > 3.0) { pt('RG BRICK&', 90, 142, 3, '#f8d030', { al: 'c', sh: DK }); pt('STICKVERSE', 90, 160, 3, '#f8d030', { al: 'c', sh: DK }); pt('FOLLOW FOR MORE', 90, 182, 2, WH, { al: 'c', sh: DK }); }
   at(60, 250, 2.5, 1, () => girl(lt, { smile: true, cheer: Math.floor(lt * 2) % 2 === 0 })); at(125, 250, 1.6, -1, () => beast(lt, {})); header(); },
];
const TITLES = [];
function frame(t) {
  P.setTransform(1, 0, 0, 1, 0, 0); P.globalAlpha = 1; P.clearRect(0, 0, PW, PH);
  let k = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= (j === 0 ? 0 : A(j) - 0.15)) k = j;
  const st = k === 0 ? 0 : A(k) - 0.15, en = k + 1 < SHOTS.length ? A(k + 1) - 0.15 : TIM.dur; SHOTS[k](t - st, en - st); dialog(t);
  const ls = t - st; if (k > 0 && ls < 0.12) { P.fillStyle = WH; P.globalAlpha = 1 - ls / 0.12; P.fillRect(0, 0, PW, PH); P.globalAlpha = 1; }
  if (t > TIM.dur - 0.4) { P.globalAlpha = prog(t, TIM.dur - 0.4, TIM.dur); P.fillStyle = '#000'; P.fillRect(0, 0, PW, PH); P.globalAlpha = 1; }
  X0.imageSmoothingEnabled = false; X0.drawImage(pc, 0, 0, 1080, 1920);
}
window.frame = frame;
