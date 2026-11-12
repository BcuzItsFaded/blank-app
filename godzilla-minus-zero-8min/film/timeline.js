const END = 480;
// one entry per narrated sentence: spec, [spec, {f, ...spec}], or null (= keep the previous shot)
const SEG = [
  /*0*/[{ s: 'ginza', gz: 1, sign: 'GINZA', date: '1947' }, { f: .55, s: 'ginza', pilot: 1, v: 1 }],
  /*1*/[{ s: 'kamikazeRun', hit: 1 }, { f: .45, s: 'hospital', v: 1 }, { f: .78, s: 'underwater', sink: 1 }],
  /*2*/{ s: 'happy', x: ['wrong', 13.24] }, null,
  /*4*/{ s: 'underwater', regrow: 1, v: 1 },
  /*5*/{ s: 'danger' }, { s: 'danger', sky: 1 },
  /*7*/{ s: 'head', text: 'GODZILLA MINUS ZERO\nEXPLAINED' }, null,
  /*9*/{ s: 'head', text: 'PREVIOUSLY:\nMINUS ONE', gears: 1 },
  /*10*/{ s: 'odo', date: '1945' }, { s: 'cockpit', sign: 'KAMIKAZE' }, { s: 'odo', sign: 'ODO ISLAND', v: 1 },
  /*13*/{ s: 'baseAttack' }, { s: 'cockpit', night: 1, freeze: 1 }, { s: 'survivors' },
  /*16*/{ s: 'tokyo', walk: 1, sign: 'TOKYO' },
  /*17*/[{ s: 'tokyo', family: 1, v: 1 }, { f: .5, s: 'tokyo', family: 1, sign: 'A FAMILY?', v: 2, seed: 9 }],
  /*18*/{ s: 'tokyo', family: 1, sign: 'FAMILY', x: ['one', 58.6], v: 3, seed: 11 },
  /*19*/{ s: 'alone' },
  /*20*/[{ s: 'ginza', gz: 1, glow: 1, v: 2 }, { f: .45, s: 'bikini', sign: 'BIKINI ATOLL' }],
  /*21*/{ s: 'ginza', gz: 1, sign: 'GINZA', v: 1 }, { s: 'blast' },
  /*23*/{ s: 'nodaPlan', text: "KENJI NODA'S\nPLAN", koichi: 1 }, { s: 'seaPlan', sign: 'SAGAMI BAY' }, { s: 'seaPlan', up: 1, v: 1, sign: 'PRESSURE' },
  /*26*/[{ s: 'nodaPlan', text: "FLY INTO\nGODZILLA'S\nMOUTH", v: 1 }, { f: .45, s: 'kamikazeRun' }],
  /*27*/null, { s: 'kamikazeRun', hit: 1, v: 1 },
  /*29*/[{ s: 'kamikazeRun', chute: 1, v: 2 }, { f: .55, s: 'odo', mech: 1, sign: 'EJECTION SEAT', v: 2 }],
  /*30*/{ s: 'head', text: 'THE MIRACLE' }, { s: 'hospital', sign: 'HOSPITAL' }, { s: 'hospital', mark: 1, v: 2 }, { s: 'underwater', regrow: 1, sign: 'SAGAMI BAY', v: 2 },
  /*34*/{ s: 'head', text: 'MINUS ZERO', gears: 1 }, { s: 'rebuild', date: '1949', sign: 'TWO YEARS LATER' }, { s: 'rebuild', family: 1, v: 1 },
  /*37*/[{ s: 'home' }, { f: .55, s: 'orphanage', family: 1 }],
  /*38*/{ s: 'home', v: 1, sign: 'A REAL LIFE' }, { s: 'home', close: 1 }, { s: 'home', close: 1, glow: 1, sign: 'G-CELLS', v: 1 },
  /*41*/{ s: 'hospital', mark: 1, v: 3 }, { s: 'home', close: 1, glow: 1, v: 2 },
  /*43*/{ s: 'bureau', sign: 'KENJI NODA' }, { s: 'bureau', v: 1 }, { s: 'bureau', crew: 1, sign: 'THE OLD CREW', v: 2 }, null,
  /*47*/{ s: 'danger', sky: 1, v: 1 }, { s: 'meteor', sign: 'MATSUMOTO' }, null,
  /*50*/{ s: 'blob', run: 1 }, { s: 'blob', big: 1, v: 1 }, { s: 'dragon' },
  /*53*/{ s: 'scientists', text: 'SPECIMEN:\nUNKNOWN', size: 80 },
  /*54*/[{ s: 'scientists', text: 'KANJI\nMURAKAMI', size: 90, v: 1 }, { f: .62, s: 'scientists', text: 'AKIRA\nHAGIWARA', size: 90, v: 2 }],
  /*55*/{ s: 'scientists', text: 'GHIDORAH', v: 3 },
  /*56*/{ s: 'stormMap', text: 'METEOROLOGIST: MAKOTO AOYAMA' }, { s: 'stormMap', v: 1 }, { s: 'storm', bolts: 1 }, null,
  /*60*/{ s: 'airfield', sign: 'NEW MISSION' }, { s: 'airfield', shrug: 1, walk: false, v: 1, sign: 'US SUPPORT' },
  /*62*/{ s: 'bomberRun' }, { s: 'bomberRun', hit: 1, v: 1 }, { s: 'smoke', sign: 'TARGET DESTROYED?', x: ['then', 197.0] }, { s: 'escorts' }, { s: 'cockpit', sign: 'SURVIVED', v: 1 },
  /*67*/{ s: 'harpoons' }, { s: 'storm', v: 1 },
  /*69*/[{ s: 'harpoons', v: 1 }, { f: .5, s: 'storm', v: 2 }],
  /*70*/{ s: 'storm', bolts: 1, v: 3 }, { s: 'storm', fall: 1 },
  /*72*/{ s: 'king', rise: 1 }, null, null,
  /*75*/{ s: 'king', three: ['three', 223.5], sign: 'THREE HEADS', v: 1 }, { s: 'king', full: 1, beam: 1, v: 2 }, { s: 'king', full: 1, sign: 'KING GHIDORAH', v: 3 },
  /*78*/{ s: 'kozu' }, { s: 'kozu', v: 1 }, { s: 'gzRise' },
  /*81*/{ s: 'versus', text: '2 MONSTERS' }, { s: 'versus', text: '2 MONSTERS', ts: -5, v: 1 }, { s: 'versus', v: 2 },
  /*84*/{ s: 'memorial' }, { s: 'memorial', date: '1945', v: 1 }, { s: 'memorial', angry: 1, v: 2 },
  /*87*/{ s: 'nymap' }, { s: 'amp' }, null, { s: 'amp', v: 1, sign: 'REQUIRES:\nG-CELLS' }, null, { s: 'amp', v: 2, sign: 'REQUIRES:\nNORIKO' },
  /*93*/{ s: 'home', v: 3 }, { s: 'flee', sign: 'RUN' }, null,
  /*96*/{ s: 'choice', sign: 'MATSUMOTO', look: 1 }, { s: 'choice', sign: "NORIKO'S CHOICE", v: 1 }, { s: 'choice', step: 1, sign: 'SHE VOLUNTEERS', v: 2 }, null,
  /*100*/{ s: 'talk' }, null, null, { s: 'talk', down: 1, x: ['revenge', 290.6], v: 1 },
  /*104*/{ s: 'head', text: 'THE NEW PLAN', gears: 1 }, { s: 'ginzaTrap' }, { s: 'ginzaTrap', v: 1, sign: 'GENERATORS + TRAPS' }, { s: 'ginza', gz: 1, sign: 'GINZA, 1947', v: 3 },
  /*108*/{ s: 'flyingBoat', sign: "MURAKAMI'S FLYING BOAT" }, { s: 'flyingBoat', sign: 'KAWANISHI H8K', v: 1 }, { s: 'flyingBoat', gz: 1, waves: 1, v: 2 }, null,
  /*112*/{ s: 'ashore' }, null, { s: 'tearHead', off: ['off', 322.4] }, { s: 'biteBury', bite: ['arm', 325.3] }, { s: 'biteBury', armGone: 1, bury: 1.6, v: 1 }, null,
  /*118*/{ s: 'head', text: 'FIRE AND ICE', gears: 1 }, { s: 'freeze' }, { s: 'freeze', fuel: 1, iced: 1 }, { s: 'freeze', iced: 1, sign: 'TEMPERATURE SHOCK', v: 1 }, null,
  /*123*/{ s: 'nodaCar', cut: 1 }, { s: 'nodaCar', v: 1 }, { s: 'nodaCar', wreck: 1, v: 2 }, { s: 'rocket' }, null, { s: 'inferno', boom: 1 }, { s: 'inferno', guilt: 1, v: 1 },
  /*130*/{ s: 'lie' }, null, { s: 'lie', speak: 1, sign: '"GHIDORAH\nKILLED NODA."', v: 1 }, { s: 'lie', speak: 1, v: 2, sign: 'A KIND LIE' },
  /*134*/{ s: 'revive', rise: 99 }, null, { s: 'revive', v: 1, rise: 2.6 },
  /*137*/{ s: 'mutantHead' }, { s: 'mutantHead', fly: 1 }, { s: 'heatRay' }, null,
  /*141*/{ s: 'beams' }, null, { s: 'beams', v: 1 }, { s: 'beams', wild: 1 }, { s: 'finish' },
  /*146*/{ s: 'head', text: 'ENDING EXPLAINED' }, { s: 'navy', fire: 1 }, { s: 'navy', sign: 'ORDER: KEEP\nHIM ALIVE', v: 1 }, { s: 'navy', sign: 'POTENTIAL\nWEAPON', v: 2 }, { s: 'navy', leave: 1, v: 3 },
  /*151*/[{ s: 'burnNotes' }, { f: .6, s: 'burnNotes', run: 1, v: 1 }],
  /*152*/{ s: 'arrest' }, { s: 'alone', v: 1, sign: 'THE TRUTH' },
  /*154*/[{ s: 'file', text: 'WEAPON:\nGODZILLA' }, { f: .55, s: 'home', close: 1, glow: 1, v: 3 }],
  /*155*/{ s: 'file', v: 1 },
  /*156*/{ s: 'leaveAkiko', sign: 'DISAPPEAR' }, { s: 'leaveAkiko', v: 1 }, { s: 'leaveAkiko', take: 1, v: 2 }, { s: 'station', sign: 'TOGETHER' },
  /*160*/{ s: 'head', text: 'ONE WAY TO READ IT', gears: 1 },
  /*161*/{ s: 'compare', a: 'MINUS ONE:\nA MAN WHO\nREFUSED TO LIVE', who: 'k' }, { s: 'compare', a: 'MINUS ONE:\nA MAN WHO\nREFUSED TO LIVE', ts: -5, b: 'MINUS ZERO:\nA FAMILY THAT\nREFUSES TO BE USED' },
  /*163*/{ s: 'trainRide', sign: "THE WAR\nIS OVER.\nTHEY STILL\nAREN'T FREE." }, null,
  /*165*/[{ s: 'head', text: 'BEHIND THE SCENES', gears: 1 }, { f: .3, s: 'marquee', text: '5-PAGE OUTLINE\nBEFORE MINUS ONE\nCAME OUT' }],
  /*166*/[{ s: 'marquee', text: 'MINUS ONE:\nOSCAR, BEST\nVISUAL EFFECTS', oscar: 1, v: 1 }, { f: .55, s: 'marquee', text: 'MINUS ONE BUDGET\n(REPORTED, USD)', count: 10, suffix: ' MILLION', v: 2 }],
  /*167*/{ s: 'marquee', text: 'MINUS ZERO BUDGET\nUP ROUGHLY', count: 30, suffix: '%', v: 3 },
  /*168*/{ s: 'marquee', text: 'SHOT ENTIRELY\nIN JAPAN' }, { s: 'marquee', text: 'FIRST JAPANESE\nPRODUCTION\nFILMED FOR IMAX', v: 1 },
  /*170*/{ s: 'head', text: "SO HERE'S\nTHE QUESTION" },
  /*171*/{ s: 'outro', text: 'SHOULD THEY HAVE\nTRUSTED ANYONE?' }, { s: 'outro', text: "WHO'S THE\nREAL MONSTER?", lk: 1, v: 1 }, { s: 'outro', text: "WHO'S THE\nREAL MONSTER?", ts: -5, v: 2 },
];
const WIPE_AT = [9, 34, 48, 60, 67, 78, 84, 93, 104, 118, 146, 160, 165, 170];

// sentences from the word clock
function sentences() { const out = []; let cur = [], prev = '.'; for (const w of WORDS) { if (/[.?!]$/.test(prev) && cur.length) { out.push(cur); cur = []; } cur.push(w); prev = w.w; } out.push(cur); return out; }
const SHOTS = []; let WIPET = [];
function build() {
  SHOTS.length = 0; const S = sentences(); if (S.length !== SEG.length) throw new Error('sentences ' + S.length + ' vs SEG ' + SEG.length);
  S.forEach((sw, i) => {
    let e = SEG[i]; if (!e) return; if (!Array.isArray(e)) e = [e];
    const s0 = sw[0].s, dur = sw[sw.length - 1].e - s0;
    e.forEach((spec, k) => {
      let start = s0; if (k > 0) { const tg = s0 + spec.f * dur; start = sw.reduce((b, w) => Math.abs(w.s - tg) < Math.abs(b - tg) ? w.s : b, sw[1] ? sw[1].s : s0); }
      const p = {}; for (const [key, v] of Object.entries(spec)) { if (Array.isArray(v) && typeof v[0] === 'string') { const a = wd(v[0], v[1]); p[key] = key === 'x' ? a : a - start; } else p[key] = v; }
      if (!SC[p.s]) throw new Error('no scene ' + p.s);
      SHOTS.push({ start, fn: (lt, d) => SC[p.s](lt, d, p, start), name: p.s, i });
    });
  });
  SHOTS.sort((a, b) => a.start - b.start); WIPET = WIPE_AT.map(i => S[i][0].s);
}
function frame(t) {
  T = t; screenSpace(); ctx.clearRect(0, 0, W, H);
  let i = SHOTS.length - 1; while (i > 0 && SHOTS[i].start > t) i--;
  const s = SHOTS[i], e = i + 1 < SHOTS.length ? SHOTS[i + 1].start : END;
  ctx.save(); s.fn(t - s.start, e - s.start); ctx.restore();
  screenSpace();
  WIPET.forEach((wt, k) => { ev('whoosh', wt - 0.2); if (t > wt - 0.2 && t < wt) splat((t - wt + 0.2) / 0.2, k + 1); else if (t >= wt && t < wt + 0.2) splat(1 - (t - wt) / 0.2, k + 1); });
}
