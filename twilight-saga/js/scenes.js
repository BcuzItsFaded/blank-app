/*
 * Scene choreography. Each scene draws on its own plate; S.cue("word") gives the local time the
 * narrator says that word, so actions land on the narration. Positions use panel coordinates
 * (S.X(u), S.Y(v)) measured from the storyboard art, so characters stand where they were drawn.
 */
(function () {
  const R = Rig, C = Rig.CAST;
  const PI = Math.PI;
  const mix = (a, b, k) => a + (b - a) * k;
  const pmix = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k)];

  // walk from x0 to x1 between t0 and t1; returns x and a pose patch with the walk cycle applied
  function stroll(S, x0, x1, t0, t1, H, cadence = 1) {
    const k = S.clamp((S.lt - t0) / (t1 - t0));
    const x = mix(x0, x1, S.ease(k));
    const moving = S.lt > t0 && S.lt < t1;
    const amt = moving ? Math.min(1, Math.sin(PI * k) * 2.2) : 0;
    const dist = Math.abs(x1 - x0) * S.ease(k);
    const p = { x, face: x1 >= x0 ? 0.7 : -0.7 };
    R.walk(p, dist / (H * 0.23) * PI * cadence, amt);
    return p;
  }
  const breathe = (S, seed = 0) => Math.sin(S.t * 1.7 + seed) * 0.012;
  const blink = (S, seed) => R.blinkAt(S.t, seed);
  const bellaEd = (o) => Object.assign({}, C.edward, o);
  const bellaV = (o) => Object.assign({}, C.bella, o);

  const SC = {};

  // 1 ───────────────────────────────────────── Bella arrives in Forks
  SC["1"] = {
    plate: "1", caption: ["Scene 1:", "Bella arrives in Forks."],
    cam: S => ({ x: mix(-60, 40, S.k(0, S.dur)), y: 0, z: 1.06 }),
    draw(S) {
      const H = 720, gy = S.Y(1.0);
      const tStop = S.cue("forks") - 0.3;
      // cars drive away into the rain
      S.sprite("cars", { dx: -S.lt * 6, dy: -S.lt * 3, scale: 1 - S.lt * 0.012 });
      S.fx.glow(S.X(0.43), S.Y(0.66), 70, "rgba(255,90,70,A)", 0.35 + 0.1 * Math.sin(S.t * 9));
      const p = stroll(S, S.X(-0.12), S.X(0.27), 0.0, tStop, H);
      Object.assign(p, { y: gy, H, wind: 0.6, blink: blink(S, 1) });
      if (S.lt > tStop) {        // stops, looks up at the sign, then turns to us, uneasy
        const look = S.k(tStop, tStop + 0.8), back = S.k(S.cue("idea") - 0.4, S.cue("idea") + 0.4);
        p.face = mix(0.9, 0.35, back); p.look = mix(0.4, 0.0, back); p.tilt = -0.12 * look * (1 - back);
        p.brows = -1 * back; p.mouth = back > 0.5 ? "sad" : "line";
        p.armL = [-0.25, 0.4]; p.armR = [0.25 + 0.05 * Math.sin(S.t * 2), 0.3];
      }
      // she pulls a rolling suitcase with her back hand
      S.char("bella", p);
      S.fx.suitcase(p.x - (p.face < 0 ? -1 : 1) * 150, gy + 8, 230, [p.x - (p.face < 0 ? -1 : 1) * 70, p.y - 0.36 * H]);
      S.fx.rain(300, 0.22, 0.42, 2400, gy);
    },
  };

  // 2 ───────────────────────────────────────── Bella meets Edward
  SC["2"] = {
    plate: "2", caption: ["Scene 2:", "Bella meets Edward."],
    cam: S => ({ x: mix(-40, 60, S.k(0, S.dur)), y: -10, z: 1.05 }),
    draw(S) {
      const tE = S.cue("edward"), tAv = S.cue("avoid"), tHide = S.cue("hiding"), tTer = S.cue("terrifying");
      // Bella at her desk: looks ahead, then turns to Edward
      const turn = S.k(tE - 0.3, tE + 0.5);
      S.char("bella", { x: S.X(0.20), y: S.Y(1.05), H: 860, face: mix(-0.2, 0.9, turn), look: mix(-0.2, 0.6, turn), blink: blink(S, 2),
        armL: [0.25, 1.35], armR: [0.35, 1.25], tilt: 0.04 * Math.sin(S.t * 0.8), mouth: S.lt > tAv ? "line" : "line", brows: S.lt > tAv ? -0.6 : 0 });
      // Edward: glances, stiffens, turns away and covers his nose
      const away = S.k(tAv - 0.2, tAv + 0.5), cover = S.k(tAv + 0.2, tAv + 0.9);
      const tense = S.lt > tHide ? 1 : 0;
      S.char("edward", { x: S.X(0.77), y: S.Y(1.06), H: 900, face: mix(-0.9, 0.6, away), look: mix(-0.6, 0.5, away),
        armR: cover > 0 ? [mix(0.35, 2.6, cover), mix(1.2, 2.2, cover)] : [0.35, 1.2], armL: [0.3, 1.3],
        brows: mix(0, 1, away), blink: blink(S, 3), lean: 0.05 * away + Math.sin(S.t * 30) * 0.004 * tense,
        eyeGlow: S.lt > tTer ? S.k(tTer, tTer + 0.4) * 0.6 : 0 });
      S.occluder("desks");
      // surprise ticks pop on the look, like the storyboard
      const pop = S.k(tE - 0.1, tE + 0.2) * (1 - S.k(tE + 2.2, tE + 2.6));
      S.fx.ticks(S.X(0.30), S.Y(0.34), 52 * pop, pop, 1);
      S.fx.ticks(S.X(0.69), S.Y(0.28), 52 * pop, pop, -1);
    },
  };

  // 3 ───────────────────────────────────────── Edward saves Bella from the van
  SC["3"] = {
    plate: "3", caption: ["Scene 3:", "Edward saves Bella from the van."],
    cam: S => { const hit = S.cue("stops"); const sh = S.lt > hit ? 14 * Math.exp(-(S.lt - hit) * 4) : 0; return { x: 0, y: 0, z: 1.04 + 0.03 * S.k(hit, hit + 2), shake: sh }; },
    draw(S) {
      const tVan = S.cue("van"), tStop = S.cue("stops"), tApp = S.cue("suddenly"), tFast = S.cue("fast");
      const gy = S.Y(0.99);
      // van skids in from the right, swerving, and slams to a stop at Edward's hands
      const k = S.clamp((S.lt - tVan + 0.4) / (tStop - tVan + 0.4));
      const dx = mix(1500, 0, S.easeOut(k)), rot = Math.sin(k * 9) * 0.05 * (1 - k);
      if (S.lt > tVan - 0.4) S.sprite("van", { dx, rot, dy: Math.sin(S.t * 30) * 3 * (1 - k) });
      if (S.lt > tVan - 0.4) S.fx.glow(S.X(0.84) + dx, S.Y(0.55), 120, "rgba(255,230,160,A)", 0.5);
      // Bella frozen in shock
      const fear = S.k(tVan, tVan + 0.6);
      S.char("bella", { x: S.X(0.13), y: gy, H: 600, face: 0.8, look: 0.6, wind: 0.4, blink: fear > 0.5 ? 0 : blink(S, 4),
        armL: [mix(-0.2, 1.6, fear), mix(0.3, 1.9, fear)], armR: [mix(0.2, 1.9, fear), mix(0.3, 1.6, fear)],
        lean: -0.12 * fear, mouth: fear > 0.4 ? "o" : "line", legL: [0.25, 0.3], legR: [-0.15, 0.1] });
      if (fear > 0) S.fx.exclaim(S.X(0.23), S.Y(0.40), 60, Math.min(1, fear * 2) * (1 - S.k(tFast, tFast + 0.5)), 0.15);
      // Edward appears in a blur and braces the van
      if (S.lt > tApp - 0.15) {
        const a = S.k(tApp - 0.15, tApp + 0.25);
        const ex = mix(S.X(0.22), S.X(0.42), a);
        const ed = () => S.char("edward", { x: ex, y: gy, H: 640, face: 0.9, look: 0.5, lean: 0.25, top: null,
          legL: [0.9, 0.1], legR: [-0.7, 0.05], armR: [1.55, 0.05], armL: [1.35, 0.25], brows: 1, blink: 0,
          wind: 0.8 });
        if (a < 1) S.fx.streak(ed, 6, 40, 1);
        ed();
        if (S.lt > tStop) {
          const im = Math.exp(-(S.lt - tStop) * 3);
          S.fx.impact(S.X(0.565), S.Y(0.66), 160, im);
        }
        // he glances back at Bella
        if (S.lt > tFast - 0.6) S.fx.ticks(S.X(0.4), S.Y(0.30), 40 * S.k(tFast - 0.6, tFast - 0.3), 1, 1);
      }
      S.fx.rain(280, 0.18, 0.4, 2400, gy);
    },
  };

  // 4 ───────────────────────────────────────── Bella learns his secret
  SC["4"] = {
    plate: "4", caption: ["Scene 4:", "Bella learns his secret."],
    cam: S => ({ x: mix(30, -30, S.k(0, S.dur)), y: -20, z: 1.05 + 0.03 * S.k(0, S.dur) }),
    draw(S) {
      const tV = S.cue("vampire"), tFam = S.cue("family"), tRead = S.cue("read"), tExc = S.cue("except");
      // moonlight brightens on the reveal
      S.fx.glow(S.X(0.93), S.Y(0.06), 300, "rgba(200,220,255,A)", 0.25 + 0.25 * S.k(tV - 0.3, tV + 0.6));
      const gy = S.Y(0.93);
      // Bella kneeling, reacting
      const shock = S.k(tV - 0.2, tV + 0.3), smile = S.k(tExc + 0.3, tExc + 1);
      S.char("bella", { x: S.X(0.34), y: gy, H: 760, face: 0.85, look: 0.7, blink: blink(S, 5),
        legL: [1.35, 2.5], legR: [1.1, 2.6], armL: [0.55, 0.6], armR: [mix(0.6, 1.4, shock), mix(0.6, 2.2, shock)],
        mouth: smile > 0.5 ? "smile" : shock > 0.5 ? "o" : "line", lean: -0.08 * shock + 0.05 });
      // Edward crouching; skin sparkles when the truth comes out; touches his temple for mind-reading
      const sp = S.k(tV - 0.2, tV + 0.4) * (1 - 0.6 * S.k(tFam, tFam + 1));
      const temple = S.k(tRead - 0.4, tRead + 0.2) * (1 - S.k(S.dur - 1.6, S.dur - 0.8));
      S.char("edward", { x: S.X(0.63), y: gy + 5, H: 830, face: -0.85, look: -0.6, blink: blink(S, 6), sparkle: sp,
        legL: [1.2, 2.4], legR: [0.5, 1.5], armR: [mix(0.6, 2.75, temple), mix(0.8, 2.4, temple)], armL: [0.7, 0.9],
        brows: temple > 0.5 ? 0.6 : 0, tilt: -0.05 * temple });
      if (sp > 0) S.fx.glow(S.X(0.62), S.Y(0.3), 260, "rgba(220,235,255,A)", 0.35 * sp);
      // his mind-reading waves reach Bella… and bounce off: the first hint of her shield
      if (S.lt > tRead) {
        const reach = S.k(tRead, tExc);
        S.fx.waves(S.X(0.55), S.Y(0.31), -1, 4, 0.8 * (1 - S.k(tExc + 1.5, tExc + 2.4)), tRead, mix(10, 46, reach));
        if (S.lt > tExc - 0.2) S.fx.shield(S.X(0.33), S.Y(0.36), 140, 160, S.k(tExc - 0.2, tExc + 0.3) * (1 - S.k(tExc + 1.8, tExc + 2.6)), Math.sin(S.t * 10));
      }
      S.fx.sparks(S.X(0.5), S.Y(0.9), 500, 18, "rgba(200,255,170,A)", 0, 120);  // fireflies
    },
  };

  // 5 ───────────────────────────────────────── James hunts Bella
  SC["5"] = {
    plate: "5", caption: ["Scene 5:", "James hunts Bella."],
    cam: S => ({ x: mix(-50, 30, S.k(0, S.dur)), y: 0, z: 1.06 }),
    draw(S) {
      const tJ = S.cue("james"), tHunt = S.cue("hunting"), tSave = S.cue("saves"), tCost = S.cue("cost");
      const gy = S.Y(1.12);
      // James stalks in from the left, eyes glowing
      const p = stroll(S, S.X(-0.25), S.X(0.17), Math.max(0, tJ - 1.2), tSave - 0.2, 1200, 0.6);
      Object.assign(p, { y: gy, H: 1200, look: 0.6, brows: 1.2, eyeGlow: S.k(tHunt - 0.3, tHunt + 0.4), blink: blink(S, 7), wind: 0.5,
        armL: [-0.1 + p.armL[0] * 0.4, 0.9], armR: [0.1 + p.armR[0] * 0.4, 0.9], mouth: S.lt > tSave + 0.4 ? "o" : "line" });
      if (S.lt > tSave + 0.3) { p.lean = -0.08; p.face = 0.7; }
      S.char("james", p);
      // Bella on the ground, scooting back
      const scoot = S.k(tHunt - 0.5, tHunt + 0.8);
      S.char("bella", { x: S.X(0.80) + scoot * 60, y: S.Y(0.93), H: 700, face: -0.85, look: -0.7, blink: blink(S, 8),
        hip: 6, legL: [1.45, 0.25], legR: [1.35, 0.5], armL: [-0.6, -0.2], armR: [mix(0.4, 1.3, scoot), mix(0.5, 1.0, scoot)],
        lean: -0.25 - 0.1 * scoot, mouth: scoot > 0.4 ? "o" : "line", brows: S.lt > tCost ? -1 : 0,
        look2: 0 });
      // Edward lands between them, arm out to protect her
      if (S.lt > tSave - 0.25) {
        const a = S.k(tSave - 0.25, tSave + 0.2);
        const ed = () => S.char("edward", { x: mix(S.X(1.1), S.X(0.53), a), y: S.Y(0.97), H: 800, face: -0.9, look: -0.6, brows: 1.3,
          legL: [0.7, 0.9], legR: [-0.5, 0.6], armR: [1.5, 0.1], armL: [0.9, 0.6], lean: 0.18, wind: 0.6, blink: blink(S, 9) });
        if (a < 1) S.fx.streak(ed, 5, -45, 1);
        ed();
      }
      if (S.lt > tCost - 0.3) S.fx.shade("#061020", 0.25 * S.k(tCost - 0.3, tCost + 1));
    },
  };

  // 6 ───────────────────────────────────────── Edward leaves (New Moon)
  SC["6"] = {
    plate: "6", caption: ["Scene 6:", "Edward leaves in New Moon."],
    cam: S => ({ x: mix(20, -20, S.k(0, S.dur)), y: 0, z: 1.04 + 0.04 * S.k(0, S.dur) }),
    draw(S) {
      const tLeave = S.cue("leaves"), tHeart = S.cue("heartbroken"), tAnother = S.cue("another"), tChange = S.cue("change");
      // Edward walks away into the trees, fading
      const go = S.lin(tLeave - 0.3, tHeart);
      if (go < 1) {
        const x = mix(S.X(0.62), S.X(0.95), go), sc = mix(1, 0.62, go);
        const p = R.walk({ x, y: mix(S.Y(0.96), S.Y(0.70), go), H: 760 * sc, back: true, face: 0.6 }, go * 14, go > 0 ? 1 : 0);
        p.alpha = 1 - S.k(tHeart - 1.2, tHeart);
        S.char("edward", p);
      }
      // Bella hugs her knees in the rain, rocking and shivering
      const rock = Math.sin(S.t * 1.4) * 0.05, shiver = Math.sin(S.t * 38) * 0.006;
      const lookUp = S.k(tAnother, tAnother + 0.7);
      S.char("bella", { x: S.X(0.46), y: S.Y(0.93), H: 720, face: 0.7, hip: 5, lean: 0.38 + rock + shiver - 0.2 * lookUp,
        tilt: mix(0.45, 0.05, lookUp), legL: [2.25, 2.6], legR: [2.15, 2.55], armL: [1.15, 0.55], armR: [1.25, 0.6],
        eyesClosed: lookUp < 0.5, mouth: "sad", brows: -1, tear: lookUp < 0.5, look: mix(0, 0.6, lookUp), wind: 0.4 });
      // a secret stirs in the forest: glowing eyes blink in the dark
      if (S.lt > tAnother) {
        const a = S.k(tAnother + 0.3, tAnother + 1) * (1 - S.k(S.dur - 1, S.dur - 0.3));
        for (const dx of [0, 34]) S.fx.glow(S.X(0.13) + dx, S.Y(0.42), 22, "rgba(255,200,60,A)", a * (R.blinkAt(S.t, 30) > 0.5 ? 0.1 : 1));
      }
      // lightning flashes on "Heartbroken" and "change"
      const flash = Math.max(0, 1 - Math.abs(S.lt - tHeart) * 4) + Math.max(0, 1 - Math.abs(S.lt - tChange) * 5);
      if (flash > 0) S.fx.shade("#dfe8ff", 0.35 * Math.min(1, flash));
      S.fx.rain(360, 0.15, 0.5, 2600, S.Y(0.97));
    },
  };

  // 7 ───────────────────────────────────────── Bella grows close to Jacob
  SC["7"] = {
    plate: "7", caption: ["Scene 7:", "Bella grows close to Jacob."],
    cam: S => ({ x: mix(-30, 30, S.k(0, S.dur)), y: -10, z: 1.05 }),
    draw(S) {
      const tJ = S.cue("jacob"), tHelp = S.cue("helps"), tFr = S.cue("friendship"), tDan = S.cue("dangerous");
      // sunset shimmer on the lake
      for (let i = 0; i < 22; i++) {
        const x = S.X(0.05 + S.hash(i) * 0.9), y = S.Y(0.6 + S.hash(i + 3) * 0.13), a = 0.5 + 0.5 * Math.sin(S.t * 3 + i * 2);
        S.fx.glow(x, y, 22, "rgba(255,210,150,A)", 0.35 * a);
      }
      const seat = 26;   // hip height (u) on the log
      const laugh = S.lt > tHelp && S.lt < tDan ? Math.max(0, Math.sin((S.lt - tHelp) * 2.5)) : 0;
      const lean = S.k(tFr - 0.5, tFr + 0.6) * (1 - S.k(tDan, tDan + 0.6));
      S.char("bella", { x: S.X(0.27) + lean * 25, y: S.Y(0.985), H: 800, face: 0.8, look: 0.6, hip: seat, blink: blink(S, 10),
        legL: [1.45, 1.45], legR: [1.35, 1.35], armL: [0.6, 1.3], armR: [0.7, 1.2], lean: 0.08 * lean - 0.02 + laugh * 0.03,
        mouth: laugh > 0.3 ? "smile" : "line", wind: 0.3, blush: lean > 0.5 });
      // Jacob talks and gestures, then looks away at the end: he has a secret
      const talk = S.lt > tJ && S.lt < tFr + 1;
      const away = S.k(tDan - 0.3, tDan + 0.5);
      S.char("jacob", { x: S.X(0.54), y: S.Y(0.985), H: 800, face: mix(-0.8, 0.5, away), look: mix(-0.6, 0.4, away), hip: seat, blink: blink(S, 11),
        legL: [1.4, 1.5], legR: [1.3, 1.3], armL: [0.6, 1.2], armR: talk ? [1.0 + 0.35 * Math.sin(S.t * 3), 1.4 + 0.3 * Math.sin(S.t * 5)] : [0.7, 1.1],
        mouth: talk ? (Math.sin(S.t * 2) > -0.3 ? "talk" : "smile") : "line", brows: away > 0.5 ? 0.5 : 0, eyeGlow: away > 0.6 ? 0.3 : 0 });
    },
  };

  // 8 ───────────────────────────────────────── Jacob becomes a werewolf
  SC["8"] = {
    plate: "8", caption: ["Scene 8:", "Jacob becomes a werewolf."],
    cam: S => { const tw = S.cue("wolf"); return { x: 0, y: 0, z: 1.03 + 0.03 * S.k(tw, tw + 3), shake: S.lt > tw - 0.6 && S.lt < tw + 0.6 ? 10 : 0 }; },
    draw(S) {
      const tT = S.cue("transforms"), tW = S.cue("wolf"), tPack = S.cue("pack"), tCaught = S.cue("caught");
      S.fx.glow(S.X(0.86), S.Y(0.2), 340, "rgba(220,230,255,A)", 0.25 + 0.1 * Math.sin(S.t * 1.5));
      const gy = S.Y(0.96);
      // Jacob crouched, shaking harder as the glow builds, then bursts into the wolf
      const build = S.k(0.3, tW), burst = S.k(tW - 0.15, tW + 0.25);
      if (burst < 1) {
        const shake = build * build * 10;
        S.fx.glow(S.X(0.32), S.Y(0.62), 300 + 200 * build, "rgba(255,160,50,A)", 0.25 + 0.6 * build);
        S.fx.sparks(S.X(0.32), S.Y(0.75), 160, 30, "rgba(255,190,90,A)", 0, 300);
        S.char(Object.assign({}, C.jacob, { top: { style: "none", c: C.jacob.skin }, legs: { style: "jeans", c: "#3a3330" } }),
          { x: S.X(0.32) + Math.sin(S.t * 50) * shake, y: gy, H: 760, face: 0.8, lean: 0.35 + build * 0.1, tilt: 0.3, brows: 1.3, blink: 0,
            legL: [1.3, 2.4], legR: [0.9, 2.5], armL: [0.9, 0.4], armR: [1.2, 0.3], mouth: build > 0.6 ? "o" : "line", alpha: 1 - burst,
            eyeGlow: build });
      }
      if (S.lt > tW - 0.15) {
        // the wolf grows out of the light and howls at the moon
        const grow = S.easeOut(S.k(tW - 0.15, tW + 0.5));
        const howl = S.lt > tW + 0.6 ? Math.sin((S.lt - tW - 0.6) * 1.2) : 0;
        S.sprite("wolf8", { scale: mix(0.35, 1, grow), dx: mix(-420, 0, grow), rot: -0.03 * Math.max(0, howl),
          warp: { t: S.t, f: 2.2, k: 6, a: 6 }, alpha: Math.min(1, grow * 2) });
        if (S.lt > tW + 0.6) for (let i = 0; i < 3; i++) {   // howl rings from the muzzle
          const ph = ((S.lt - tW) * 0.7 + i / 3) % 1;
          S.g.save(); S.g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; S.g.lineWidth = 5;
          S.g.beginPath(); S.g.arc(S.X(0.86), S.Y(0.1), 40 + ph * 240, Math.PI * 1.05, Math.PI * 1.75); S.g.stroke(); S.g.restore();
        }
        S.fx.shade("#fff3d6", 0.9 * Math.max(0, 1 - Math.abs(S.lt - tW) * 3));
      }
      // Bella arrives, caught between two worlds
      if (S.lt > tCaught - 1.2) {
        const p = stroll(S, S.X(-0.08), S.X(0.12), tCaught - 1.2, tCaught + 0.6, 560);
        Object.assign(p, { y: S.Y(1.0), H: 560, look: 0.7, mouth: "o", blink: blink(S, 12), wind: 0.4 });
        if (S.lt > tCaught + 0.6) { p.armL = [0.4, 1.8]; p.armR = [0.5, 2.0]; }
        S.char("bella", p);
      }
    },
  };

  // 9 ───────────────────────────────────────── Edward thinks Bella is dead
  SC["9"] = {
    plate: "9", caption: ["Scene 9:", "Edward thinks Bella is dead."],
    cam: S => ({ x: mix(-30, 30, S.k(0, S.dur)), y: 0, z: 1.05 }),
    draw(S) {
      const tDied = S.cue("died"), tUn = S.cue("unable"), tTrav = S.cue("travels"), tVol = S.cue("volturi");
      const gy = S.Y(0.92);
      // the thought bubble pops up, with its little trail of circles
      const pop = S.easeOut(S.k(tDied - 0.6, tDied)) * (1 - S.k(tTrav, tTrav + 0.6));
      if (pop > 0) {
        const bob = Math.sin(S.t * 1.6) * 6;
        S.sprite("bubble", { scale: 0.6 + 0.4 * pop, alpha: pop, dy: bob });
        S.g.save(); S.g.globalAlpha = pop; S.g.fillStyle = "#fff"; S.g.strokeStyle = "#111"; S.g.lineWidth = 4;
        for (const [u, v, r] of [[0.495, 0.52, 9], [0.52, 0.47, 14]]) { S.g.beginPath(); S.g.arc(S.X(u), S.Y(v) + bob * 0.5, r, 0, 7); S.g.fill(); S.g.stroke(); }
        S.g.restore();
      }
      // Edward kneels, hand to his head, shaking; then rises and walks off toward Italy
      const rise = S.k(tTrav - 0.2, tTrav + 0.8);
      const walkK = S.lin(tTrav + 0.8, S.dur - 0.2);
      const base = { y: gy, H: 760, face: 0.6, blink: blink(S, 13), brows: -1.2, mouth: "sad", wind: 0.3 };
      if (rise < 1) {
        Object.assign(base, { x: S.X(0.22), lean: mix(0.45, 0.05, rise) + Math.sin(S.t * 30) * 0.006 * (1 - rise), tilt: mix(0.35, 0, rise),
          legL: [mix(1.35, 0.1, rise), mix(2.5, 0.1, rise)], legR: [mix(0.4, -0.1, rise), mix(1.7, 0.1, rise)],
          armR: [mix(2.5, 0.2, rise), mix(2.6, 0.3, rise)], armL: [mix(0.9, -0.1, rise), mix(1.4, 0.3, rise)], eyesClosed: S.lt < tUn + 1.5 });
        S.char("edward", base);
      } else {
        const p = stroll(S, S.X(0.22), S.X(-0.25), tTrav + 0.8, S.dur + 0.5, 760);
        S.char("edward", Object.assign(base, p, { y: gy }));
      }
      if (S.lt > tVol) S.fx.shade("#2a0008", 0.18 * S.k(tVol, tVol + 1));
      S.fx.snow(150, 0.85, -20);
    },
  };

  window.SCENES = Object.assign(window.SCENES || {}, SC);
  window.SceneKit = { stroll, breathe, mix, pmix };
})();
