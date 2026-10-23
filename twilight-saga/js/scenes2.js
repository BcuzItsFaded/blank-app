/* Scenes 10–18 (see scenes.js for conventions). */
(function () {
  const R = Rig, C = Rig.CAST, { stroll, mix } = SceneKit;
  const blink = (S, seed) => R.blinkAt(S.t, seed);
  const SC = {};
  const cloak = (hair = "#151515") => R.VOLTURI(hair);
  const newborn = (hairC, top = "#232327", skin = R.PALE) => R.extra({ skin, hair: { style: "short", c: hairC, c2: "#00000055" }, top: { style: "coat", c: top, c2: "#3c3c44", shirt: "#8d8d96" }, eyes: "#c40f1a" });

  // 10 ──────────────────────────────────────── The Volturi appear in Italy
  SC["10"] = {
    plate: "10", caption: ["Scene 10:", "The Volturi appear in Italy."],
    cam: S => ({ x: 0, y: mix(20, -20, S.k(0, S.dur)), z: 1.03 + 0.06 * S.k(S.cue("future") - 0.5, S.dur) }),
    draw(S) {
      const tR = S.cue("rushes"), tV = S.cue("volturi"), tDisc = S.cue("discover"), tFut = S.cue("future");
      S.sprite("bannerL", { warp: { t: S.t, f: 1.3, k: 3, a: 7, fromTop: false } });
      S.sprite("bannerR", { warp: { t: S.t + 1, f: 1.2, k: 3, a: 7, fromTop: false } });
      const glow = S.k(tV - 0.2, tV + 0.6);
      // the guard behind, then the elders, then Aro in the middle
      const guards = [[0.035, 0.74, 380], [0.11, 0.735, 360], [0.19, 0.73, 330], [0.815, 0.735, 340], [0.885, 0.74, 360], [0.965, 0.74, 380]];
      guards.forEach(([u, v, h], i) => S.char(cloak(i % 2 ? "#5a3a24" : "#1a1a1a"), { x: S.X(u), y: S.Y(v), H: h, face: u < 0.5 ? 0.3 : -0.3, look: 0, blink: blink(S, 20 + i), eyeGlow: glow, wind: 0.2, t: S.t + i }));
      [[0.335, 0.80, 600, 0.3], [0.665, 0.80, 600, -0.3]].forEach(([u, v, h, f], i) => S.char(cloak(), { x: S.X(u), y: S.Y(v), H: h, face: f, blink: blink(S, 30 + i), eyeGlow: glow, wind: 0.3 }));
      // Aro steps forward and points at Bella when they discover she knows
      const step = S.k(tDisc - 0.6, tDisc + 0.4), point = S.k(tDisc - 0.2, tDisc + 0.4);
      S.char(Object.assign(cloak(), { top: { style: "cloak", c: "#0e0e10", c2: "#a3161a", clasp: "#d6ae3f" } }),
        { x: S.X(0.505), y: S.Y(0.80) + 30 * step, H: 820 + 40 * step, face: 0.2, blink: blink(S, 33), eyeGlow: glow, wind: 0.4,
          showHands: true, armR: [mix(0.1, 1.45, point), mix(0.2, 0.1, point)], armL: [-0.1, 0.2], brows: glow > 0.5 ? 1 : 0 });
      // foreground: Bella rushes in and saves Edward
      const run = S.k(tR - 0.6, S.cue("saves") + 0.3);
      S.char("edward", { x: S.X(0.73), y: S.Y(1.2), H: 760, face: -0.6, look: mix(-0.4, 0.5, run), blink: blink(S, 34), mouth: run > 0.8 ? "o" : "sad",
        armL: run > 0.9 ? [1.4, 0.7] : [0.1, 0.3], armR: run > 0.9 ? [1.3, 0.8] : [-0.1, 0.3], brows: -0.5 });
      const bp = stroll(S, S.X(1.12), S.X(0.83), tR - 0.6, S.cue("saves") + 0.2, 720, 1.4);
      Object.assign(bp, { y: S.Y(1.2), H: 720, look: -0.5, wind: 0.6, blink: blink(S, 35) });
      if (run > 0.9) Object.assign(bp, { armL: [1.4, 0.6], armR: [1.5, 0.5], lean: -0.15, mouth: "smile" });
      if (S.lt > tDisc) { bp.face = 0.4; bp.look = 0.2; bp.mouth = "o"; bp.tilt = -0.1; }
      S.char("bella", bp);
      if (S.lt > tFut) S.fx.glow(S.X(0.5), S.Y(0.4), 700, "rgba(140,0,10,A)", 0.25 * (0.6 + 0.4 * Math.sin(S.t * 6)));
    },
  };

  // 11 ──────────────────────────────────────── Victoria builds a newborn army
  SC["11"] = {
    plate: "11", caption: ["Scene 11:", "Victoria builds a newborn army."],
    cam: S => ({ x: mix(-40, 40, S.k(0, S.dur)), y: 0, z: 1.05 }),
    draw(S) {
      const tArmy = S.cue("army"), tNew = S.cue("newborn"), tCul = S.cue("cullens"), tTog = S.cue("together");
      // the army forms out of the snow and marches toward us
      const army = [[0.285, "#d9b46a", 600], [0.355, "#e6c47a", 600], [0.465, "#151515", 640], [0.565, "#d8b25a", 640], [0.665, "#9a9aa0", 640],
                    [0.765, "#8a4a2a", 660], [0.86, "#2a1f1a", 650], [0.945, "#8f8f96", 650]];
      const appear = S.k(tArmy - 0.8, tArmy + 0.6), march = S.lin(tArmy, S.dur);
      army.forEach(([u, hair, h], i) => {
        const a = S.clamp(appear * 2 - i * 0.12);
        if (a <= 0) return;
        const ph = S.t * 3.2 + i * 0.8, walking = march > 0 ? 0.55 : 0;
        const p = R.walk({ x: S.X(u) - march * 40, y: S.Y(0.975) + march * 22, H: h * (1 + march * 0.05), face: -0.2 - (i % 3) * 0.1, look: -0.3 }, ph, walking, 0.3);
        Object.assign(p, { alpha: a, eyeGlow: S.k(tNew - 0.2, tNew + 0.5), brows: 1, blink: blink(S, 40 + i), mouth: i % 2 ? "line" : "o" });
        S.char(newborn(hair), p);
      });
      // Victoria in front, hair whipping in the wind, gesturing her army on
      const cmd = S.k(tNew - 0.5, tNew + 0.3) * (1 - S.k(tCul - 0.3, tCul + 0.5));
      S.char("victoria", { x: S.X(0.13), y: S.Y(1.12), H: 1180, face: 0.8, look: 0.5, wind: 1.1, blink: blink(S, 50),
        armR: [mix(0.25, 1.7, cmd), mix(0.4, 0.15, cmd)], armL: [-0.15, 0.4], brows: 1, mouth: cmd > 0.5 ? "o" : "smile", eyeGlow: 0.6 });
      // the Cullens and the wolves answer: a howl and a cold blue flash on "together"
      if (S.lt > tCul) {
        S.fx.glow(S.X(1.0), S.Y(0.5), 600, "rgba(150,200,255,A)", 0.3 * S.k(tCul, tTog));
        S.fx.shade("#ffffff", 0.5 * Math.max(0, 1 - Math.abs(S.lt - tTog) * 3));
      }
      S.fx.snow(180, 0.9, -40);
    },
  };

  // 12 ──────────────────────────────────────── Bella chooses Edward
  SC["12"] = {
    plate: "12", caption: ["Scene 12:", "Bella chooses Edward."],
    cam: S => ({ x: mix(-30, 50, S.k(0, S.dur)), y: 0, z: 1.05 }),
    draw(S) {
      const tCh = S.cue("chooses"), tEt = S.cue("eternity"), tLeave = S.cue("leaving");
      // Jacob (from behind) hangs his head and walks away
      const jGo = S.lin(tLeave - 0.6, S.dur + 1.2);
      const jp = jGo > 0 ? stroll(S, S.X(0.15), S.X(-0.25), tLeave - 0.6, S.dur + 1.2, 1000) : { x: S.X(0.15), face: 0.6 };
      Object.assign(jp, { y: S.Y(1.08), H: 1000, back: true, tilt: S.lt > tCh ? 0.18 : 0, t: S.t, wind: 0.3 });
      S.char("jacob", jp);
      // Bella turns toward Edward, walks to him and takes his hand
      const go = S.k(tCh + 0.6, tEt - 0.2);
      const bp = go > 0 && go < 1 ? stroll(S, S.X(0.46), S.X(0.63), tCh + 0.6, tEt - 0.2, 850) : { x: go >= 1 ? S.X(0.63) : S.X(0.46), face: 0.6 };
      Object.assign(bp, { y: S.Y(1.08), H: 850, back: true, wind: 0.5 });
      if (go >= 1) bp.armR = [1.25, 0.15];
      S.char("bella", bp);
      // Edward reaches for her; sparkles on "eternity"
      const reach = S.k(tCh + 0.8, tEt);
      S.char("edward", { x: S.X(0.84), y: S.Y(1.07), H: 1050, face: -0.85, look: -0.6, blink: blink(S, 60), mouth: reach > 0.5 ? "smile" : "line",
        armR: [mix(0.1, 0.72, reach), mix(0.3, 0.15, reach)], armL: [-0.1, 0.3], sparkle: S.k(tEt - 0.2, tEt + 0.5) * 0.8, wind: 0.3 });
      // the heart from the storyboard pops and beats
      const hp = S.easeOut(S.k(tCh - 0.2, tCh + 0.3));
      if (hp > 0) S.fx.heart(S.X(0.60), S.Y(0.27) - 20 * S.k(tCh, S.dur), 46 * hp * (1 + 0.12 * Math.max(0, Math.sin(S.t * 7))), hp);
      S.fx.snow(120, 0.85, 15);
    },
  };

  // 13 ──────────────────────────────────────── Bella and Edward get married
  SC["13"] = {
    plate: "13", caption: ["Scene 13:", "Bella and Edward get married."],
    cam: S => ({ x: 0, y: mix(-10, 10, S.k(0, S.dur)), z: 1.04 + 0.04 * S.k(0, S.cue("happiness")) }),
    draw(S) {
      const tMarry = S.cue("marry"), tHap = S.cue("happiness"), tPreg = S.cue("pregnant"), tThr = S.cue("threatens");
      // officiant behind them
      S.char(R.extra({ skin: R.SKIN, hair: { style: "short", c: "#5b3b25", c2: "#3a2618" }, top: { style: "coat", c: "#55585e", c2: "#6b6e75", shirt: "#e8e8e8", tie: "#333" } }),
        { x: S.X(0.52), y: S.Y(0.92), H: 640, face: 0.1, blink: blink(S, 70), mouth: S.lt < tMarry ? "talk" : "smile" });
      const kiss = S.k(tMarry - 0.3, tMarry + 0.5) * (1 - S.k(tHap - 0.2, tHap + 0.4));
      const worry = S.k(tPreg - 0.4, tPreg + 0.4);
      const bride = Object.assign({}, C.bella, { top: { style: "dress", c: "#f8f4ee" }, veil: true });
      S.char(bride, { x: S.X(0.36) + 30 * kiss, y: S.Y(0.985), H: 860, face: 0.85, look: 0.6, blink: blink(S, 71), lean: 0.08 * kiss, tilt: -0.1 * kiss,
        armR: worry > 0 ? [mix(1.2, 0.35, worry), mix(0.3, 1.55, worry)] : [1.2, 0.3], armL: [mix(0.4, 0.3, worry), mix(0.5, 1.4, worry)],
        mouth: worry > 0.5 ? "sad" : "smile", brows: -worry, eyesClosed: kiss > 0.7, wind: 0.3 });
      const groom = Object.assign({}, C.edward, { top: { style: "coat", c: "#151518", c2: "#2c2c32", shirt: "#f4f4f4", tie: "#111" } });
      S.char(groom, { x: S.X(0.61) - 30 * kiss, y: S.Y(0.975), H: 1010, face: -0.85, look: -0.6 + 0.3 * worry, blink: blink(S, 72),
        lean: 0.08 * kiss, tilt: -0.08 * kiss, armR: worry > 0.5 ? [0.55, 0.4] : [1.25, 0.25], armL: [-0.1, 0.3],
        mouth: worry > 0.5 ? "line" : "smile", brows: worry > 0.5 ? -0.8 : 0, eyesClosed: kiss > 0.7 });
      if (kiss > 0.6) S.fx.heart(S.X(0.49), S.Y(0.15) - 40 * kiss, 38, kiss);
      S.fx.petals(46, 1 - 0.7 * worry);
      if (worry > 0) {
        S.fx.shade("#120714", 0.3 * worry);
        if (S.lt > tThr) S.fx.glow(S.X(0.37), S.Y(0.6), 220, "rgba(255,40,60,A)", 0.4 * (0.5 + 0.5 * Math.sin(S.t * 7)));
      }
    },
  };

  // 14 ──────────────────────────────────────── Renesmee is born
  SC["14"] = {
    plate: "14", caption: ["Scene 14:", "Renesmee is born."],
    cam: S => ({ x: mix(-20, 20, S.k(0, S.dur)), y: 0, z: 1.04 }),
    draw(S) {
      const tNear = S.cue("nearly"), tTr = S.cue("transforms"), tTw = S.cue("twist"), tSh = S.cue("shield");
      const fade = S.k(tNear - 0.3, tNear + 0.6), turn = S.k(tTr, tTr + 0.8), wake = S.k(tTr + 1.2, tTr + 2);
      const skin = fade > 0 && wake < 1 ? (wake > 0 ? "#f6ece4" : "#d9d0c8") : (wake >= 1 ? "#f6ece4" : R.SKIN);
      const bella = Object.assign({}, C.bella, { skin, top: { style: "tee", c: "#efe8e0", c2: "#ddd4cb" } });
      S.char(bella, { x: S.X(0.22), y: S.Y(1.1), H: 1040, face: 0.75, look: 0.5, lean: -0.08 + 0.05 * fade * (1 - wake), tilt: 0.12 * fade * (1 - wake),
        armR: [0.85, 1.45], armL: [0.6, 1.7], blink: blink(S, 80), eyesClosed: fade > 0.5 && wake < 0.5, mouth: wake > 0.5 ? "smile" : fade > 0.5 ? "line" : "smile",
        eyeGlow: wake > 0 ? 0.35 * (1 - S.k(tTr + 2.2, tTw)) : 0, sparkle: wake * 0.7 });
      // Edward leans in, alarmed, and saves her
      const lean = S.k(tNear, tNear + 0.6) * (1 - S.k(tTw, tTw + 0.8));
      S.char(Object.assign({}, C.edward, { top: { style: "coat", c: "#16161a", c2: "#2b2b31", shirt: "#f0f0f0", tie: "#111" } }),
        { x: S.X(0.68) - 50 * lean, y: S.Y(0.87), H: 920, face: -0.85, look: -0.6, lean: 0.22 * lean, tilt: -0.1 * lean, blink: blink(S, 81),
          brows: lean > 0.5 ? -1 : 0, mouth: wake > 0.5 ? "smile" : lean > 0.5 ? "o" : "smile", armR: [mix(0.3, 0.75, lean), 0.5], armL: [0.1, 0.4] });
      S.occluder("blanket");
      S.fx.baby(S.X(0.315), S.Y(0.545), 130, S.t);
      if (turn > 0 && wake < 1) S.fx.glow(S.X(0.22), S.Y(0.32), 420, "rgba(200,20,40,A)", 0.55 * Math.sin(Math.PI * S.k(tTr, tTr + 2)));
      S.fx.shade("#fff", 0.8 * Math.max(0, 1 - Math.abs(S.lt - (tTr + 1.2)) * 3));
      // her mental shield appears for the first time
      if (S.lt > tSh - 0.3) {
        const a = S.easeOut(S.k(tSh - 0.3, tSh + 0.6));
        S.fx.shield(S.X(0.22), S.Y(0.34), 200 * a + 20, 230 * a + 20, a, Math.sin(S.t * 8));
      }
      if (S.lt > tTw - 0.2) S.fx.sparks(S.X(0.22), S.Y(0.3), 160, 22, "rgba(190,225,255,A)", tTw, 180);
      if (fade > 0 && wake < 1) S.fx.shade("#1a1820", 0.25 * fade * (1 - wake));
    },
  };

  // 15 ──────────────────────────────────────── The Volturi confront the Cullens
  SC["15"] = {
    plate: "15", caption: ["Scene 15:", "The Volturi confront the Cullens."],
    cam: S => ({ x: mix(-60, 60, S.k(0, S.dur)), y: 0, z: 1.06 }),
    draw(S) {
      const tArr = S.cue("arrive"), tDes = S.cue("destroy"), tAl = S.cue("alice"), tProof = S.cue("proof");
      const adv = S.lin(0.3, tDes + 0.5);
      // the Volturi line advances from the left (big near us, small far away)
      const vol = [[0.025, 0.63, 420], [0.075, 0.615, 380], [0.12, 0.6, 340], [0.165, 0.59, 300], [0.205, 0.575, 260], [0.24, 0.565, 220], [0.275, 0.555, 190], [0.305, 0.545, 160], [0.33, 0.54, 140]];
      vol.forEach(([u, v, h], i) => {
        const p = R.walk({ x: S.X(u) + adv * 70 * (h / 300), y: S.Y(v), H: h, face: 0.4 }, S.t * 3 + i, adv > 0 && adv < 1 ? 0.5 : 0, 0.25);
        S.char(cloak(i % 3 === 1 ? "#4a2e1c" : "#141414"), Object.assign(p, { eyeGlow: S.k(tDes - 0.3, tDes + 0.4), blink: blink(S, 90 + i), wind: 0.4 }));
      });
      // the Cullens and their witnesses hold their line
      const cul = [[0.475, 0.61, 270, "#2a2a2a"], [0.505, 0.62, 290, "#6b4a2a"], [0.545, 0.635, 320, "#b77a3c"], [0.585, 0.645, 345, "#c79a50"],
                   [0.63, 0.66, 375, "#8b5a34"], [0.675, 0.67, 400, "#c69b5d"], [0.73, 0.68, 420, "#3a2a20"], [0.78, 0.69, 440, "#d6c08a"]];
      const brace = S.k(tDes - 0.3, tDes + 0.4) * (1 - S.k(tProof, tProof + 0.8));
      cul.forEach(([u, v, h, hair], i) => S.char(newborn(hair, i % 2 ? "#2b2b31" : "#3c3f46"),
        { x: S.X(u), y: S.Y(v), H: h, face: -0.5, look: -0.5, blink: blink(S, 100 + i), brows: brace, lean: 0.06 * brace, eyeGlow: 0, wind: 0.3,
          armL: [0.1 + 0.4 * brace, 0.4], armR: [0.1 + 0.6 * brace, 0.5] }));
      // Alice arrives with Nahuel, the human-vampire hybrid
      if (S.lt > tAl - 0.4) {
        const k = S.k(tAl - 0.4, tProof - 0.2);
        const alice = R.extra({ skin: R.PALE, hair: { style: "spiky", c: "#141414", c2: "#333" }, top: { style: "coat", c: "#5a5d66", c2: "#777a83", shirt: "#ddd" } });
        const nahuel = R.extra({ skin: R.TAN, hair: { style: "messy", c: "#1a1410", c2: "#33281f" }, top: { style: "tee", c: "#7a5a3a", c2: "#5c4430" }, legs: { style: "jeans", c: "#4a3a2a" } });
        const run = (spec, u0, u1, v0, v1, h0, h1, seed) => {
          const p = R.walk({ x: S.X(mix(u0, u1, k)), y: S.Y(mix(v0, v1, k)), H: mix(h0, h1, k), face: -0.7 }, S.t * 9 + seed, k < 1 ? 1 : 0);
          if (k >= 1) Object.assign(p, { face: -0.4, armR: [1.3, 0.2] });
          S.char(spec, Object.assign(p, { blink: blink(S, 110 + seed), mouth: k >= 1 ? "talk" : "line" }));
        };
        run(nahuel, 0.62, 0.43, 0.56, 0.69, 150, 300, 1);
        run(alice, 0.66, 0.39, 0.55, 0.685, 140, 280, 2);
      }
      S.fx.shade("#0a0f1e", 0.12 * S.k(tArr, tDes));
      S.fx.snow(140, 0.85, 20);
    },
  };

  // 16 ──────────────────────────────────────── Bella's shield saves everyone
  SC["16"] = {
    plate: "16", caption: ["Scene 16:", "Bella's shield saves everyone."],
    cam: S => ({ x: 0, y: 0, z: 1.03 + 0.04 * S.k(0, S.cue("shield") + 1), shake: Math.abs(S.lt - S.cue("biggest")) < 0.3 ? 8 : 0 }),
    draw(S) {
      const tSh = S.cue("shield"), tMent = S.cue("mental"), tBig = S.cue("biggest"), tNev = S.cue("never"), tRet = S.cue("retreat");
      // the Volturi's mental attacks stream in from the left and break on the shield
      const attack = S.k(tMent - 1.2, tMent) * (1 - S.k(tRet - 0.2, tRet + 0.6));
      const ex = S.X(0.505), ey = S.Y(0.47);
      const grow = S.easeOut(S.k(tSh - 0.6, tSh + 0.9));
      const rx = 0.39 * 1489 * grow, ry = 0.53 * 1080 * grow;
      if (attack > 0) {
        for (let i = 0; i < 5; i++) {
          const ph = (S.t * 0.7 + i / 5) % 1, x = mix(-80, ex - rx + 10, ph), y = S.Y(0.32 + 0.08 * Math.sin(i * 2.3));
          S.g.save(); S.g.globalAlpha = attack * (0.4 + 0.6 * (1 - ph)); S.g.strokeStyle = i % 2 ? "#b14cff" : "#ff3b5c"; S.g.lineWidth = 9; S.g.lineCap = "round";
          S.g.beginPath(); for (let k = 0; k < 6; k++) S.g.lineTo(x - k * 34, y + Math.sin(S.t * 14 + k + i) * 16); S.g.stroke(); S.g.restore();
          if (ph > 0.9) S.fx.impact(ex - rx + 10, y, 90, attack);
        }
      }
      const calm = S.k(tRet, tRet + 1);
      // Jacob and Edward brace behind her
      S.char("jacob", { x: S.X(0.24), y: S.Y(0.76), H: 560, back: true, face: -0.5, wind: 0.3, armL: [0.2, 0.4], armR: [0.2, 0.4], tilt: -0.05 });
      S.char("edward", { x: S.X(0.69), y: S.Y(0.78), H: 620, face: -0.7, look: -0.5, blink: blink(S, 120), brows: attack * 1.2, mouth: calm > 0.5 ? "smile" : "line",
        armR: [0.3 + attack * 0.6, 0.5], armL: [0.1, 0.4], wind: 0.3 });
      // Bella throws her arms wide and the shield grows from her
      const open = S.k(tSh - 0.8, tSh);
      S.char("bella", { x: S.X(0.52), y: S.Y(0.97), H: 730, back: true, face: 0.6, wind: 0.8 + attack * 0.5,
        armL: [mix(-0.15, -1.55, open) * (1 - 0.6 * calm), mix(0.3, 0.05, open)], armR: [mix(0.15, 1.55, open) * (1 - 0.6 * calm), mix(0.3, 0.05, open)],
        legL: [0.22, 0.05], legR: [-0.22, 0.05], tilt: -0.05 * Math.sin(S.t) });
      S.fx.shield(ex, ey, rx, ry, grow * (0.85 + 0.15 * Math.sin(S.t * 3)), attack * Math.abs(Math.sin(S.t * 9)));
      if (S.lt > tBig - 0.2) S.fx.shade("#ffffff", 0.45 * Math.max(0, 1 - Math.abs(S.lt - tBig) * 3));
      if (S.lt > tNev) S.fx.sparks(ex, ey + 200, 600, 28, "rgba(200,230,255,A)", tNev, 300);
      S.fx.snow(130, 0.8, 10);
    },
  };

  // 17 ──────────────────────────────────────── The final clue: she lets him in
  SC["17"] = {
    plate: "4", caption: ["The final clue:", "Bella lets Edward in."],
    cam: S => ({ x: 0, y: -20, z: 1.05 + 0.05 * S.k(0, S.dur) }),
    draw(S) {
      const tRem = S.cue("remember"), tClue = S.cue("clue"), tLets = S.cue("lets"), tIns = S.cue("inside");
      S.fx.glow(S.X(0.93), S.Y(0.06), 320, "rgba(200,220,255,A)", 0.4);
      const gy = S.Y(0.95);
      const touch = S.k(tLets - 0.3, tLets + 0.5);
      S.char("bella", { x: S.X(0.40) + 40 * touch, y: gy, H: 760, face: 0.85, look: 0.6, blink: blink(S, 130), mouth: touch > 0.5 ? "smile" : "line",
        armR: [mix(0.2, 1.9, touch), mix(0.3, 0.9, touch)], armL: [-0.1, 0.3], wind: 0.3, blush: touch > 0.6 });
      const wow = S.k(tIns - 0.2, tIns + 0.5);
      S.char("edward", { x: S.X(0.63), y: gy, H: 830, face: -0.85, look: -0.6, blink: blink(S, 131), mouth: wow > 0.5 ? "smile" : "line",
        brows: S.lt < tLets ? 0.6 * S.k(tRem, tRem + 1) : 0, armR: [0.2, 0.3], armL: [0.1, 0.3] });
      // his thoughts bounce off her shield… until she opens it
      const open = S.k(tLets - 0.2, tLets + 0.8);
      S.fx.waves(S.X(0.56), S.Y(0.31), -1, 4, 0.75 * (1 - open), 0, 40);
      S.fx.shield(S.X(0.40) + 40 * touch, S.Y(0.33), 150 + 140 * open, 170 + 140 * open, (0.4 + 0.5 * S.k(tClue - 0.3, tClue + 0.4)) * (1 - open));
      if (open > 0) {    // her memories drift into his mind as golden light
        for (let i = 0; i < 26; i++) {
          const ph = ((S.lt - tLets) * 0.6 + i / 26) % 1, x = mix(S.X(0.42), S.X(0.62), ph), y = S.Y(0.30) - Math.sin(ph * Math.PI) * 120 + Math.sin(i * 3) * 30;
          S.fx.glow(x, y, 26, "rgba(255,220,140,A)", 0.7 * open * Math.sin(ph * Math.PI));
        }
        if (wow > 0.5) S.fx.heart(S.X(0.52), S.Y(0.12) - 30 * wow, 40, wow);
      }
      S.fx.sparks(S.X(0.5), S.Y(0.9), 500, 16, "rgba(200,255,170,A)", 0, 120);
    },
  };

  // 18 ──────────────────────────────────────── Outro
  SC["18"] = {
    plate: "7",
    cam: S => ({ x: 0, y: 0, z: 1.03 }),
    draw(S) {
      const tSub = S.cue("subscribe");
      const wave = arm => [2.6 + 0.3 * Math.sin(S.t * 6 + arm), 0.5];
      S.char("jacob", { x: S.X(0.24), y: S.Y(0.99), H: 620, face: 0.5, look: 0.2, blink: blink(S, 140), mouth: "smile", armR: S.lt > tSub ? wave(1) : [0.2, 0.3], armL: [-0.1, 0.3] });
      S.char("bella", { x: S.X(0.47), y: S.Y(0.99), H: 600, face: 0.2, look: 0, blink: blink(S, 141), mouth: "smile", armR: S.lt > tSub ? wave(2) : [0.3, 0.6], armL: [-0.3, 0.6], wind: 0.3, sparkle: 0.3 });
      S.char("edward", { x: S.X(0.69), y: S.Y(0.99), H: 650, face: -0.5, look: -0.2, blink: blink(S, 142), mouth: "smile", armR: S.lt > tSub ? wave(3) : [0.2, 0.3], armL: [-0.1, 0.3] });
    },
    overlay(S) {
      const g = S.g, tQ = S.cue("which"), tSub = S.cue("subscribe");
      const a = S.easeOut(S.k(0.2, 1.0));
      g.save(); g.globalAlpha = a; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      g.font = "800 112px 'Baloo 2', sans-serif"; g.lineWidth = 18; g.strokeStyle = "#111";
      const y = 140 - 30 * (1 - a);
      g.strokeText("PLOT TWIST", 960, y); g.fillStyle = "#ffd53d"; g.fillText("PLOT TWIST", 960, y);
      g.font = "800 70px 'Baloo 2', sans-serif"; g.lineWidth = 14;
      g.strokeText("with RG", 960, y + 92); g.fillStyle = "#fff"; g.fillText("with RG", 960, y + 92);
      g.restore();
      if (S.lt > tQ - 0.2) {
        const b = S.easeOut(S.k(tQ - 0.2, tQ + 0.4));
        g.save(); g.globalAlpha = b; g.textAlign = "center"; g.font = "700 54px 'Patrick Hand', cursive";
        const msg = "Which plot twist surprised you most? 👇";
        const w = g.measureText(msg).width + 60;
        g.fillStyle = "#fff"; g.fillRect(960 - w / 2, 300, w, 80); g.lineWidth = 5; g.strokeStyle = "#111"; g.strokeRect(960 - w / 2, 300, w, 80);
        g.fillStyle = "#111"; g.textBaseline = "middle"; g.fillText(msg, 960, 342); g.restore();
      }
      if (S.lt > tSub - 0.4) {    // subscribe button with a click
        const c = S.easeOut(S.k(tSub - 0.4, tSub + 0.2)), click = S.k(tSub + 0.6, tSub + 0.8) * (1 - S.k(tSub + 0.9, tSub + 1.1));
        const done = S.lt > tSub + 0.8;
        g.save(); g.translate(1540, 470); g.scale(c * (1 - 0.08 * click), c * (1 - 0.08 * click));
        g.fillStyle = done ? "#606060" : "#e62117"; g.beginPath(); g.roundRect ? g.roundRect(-190, -50, 380, 100, 50) : g.rect(-190, -50, 380, 100); g.fill();
        g.lineWidth = 5; g.strokeStyle = "#111"; g.stroke();
        g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "800 52px 'Baloo 2', sans-serif"; g.fillText(done ? "SUBSCRIBED" : "SUBSCRIBE", 0, 4);
        // cursor
        const cx = mix(260, 40, S.k(tSub, tSub + 0.6)), cy = mix(160, 20, S.k(tSub, tSub + 0.6));
        g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 4;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 56); g.lineTo(cx + 14, cy + 42); g.lineTo(cx + 26, cy + 66); g.lineTo(cx + 36, cy + 60); g.lineTo(cx + 24, cy + 38); g.lineTo(cx + 42, cy + 38); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
    },
  };

  window.SCENES = Object.assign(window.SCENES || {}, SC);
})();
