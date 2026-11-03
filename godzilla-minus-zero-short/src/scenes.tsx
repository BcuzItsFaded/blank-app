import React from "react";
import { H, W, SceneData, lerp, onTwos, pulse, wobble, clamp, rand } from "./lib";
import { Stage, Layer, cameraAt, Rain, Ash, Smoke, Bolt, flashAt, Boil } from "./fx";
import { Sky, Skyline, House, Pole, Rubble, Ocean, Boat } from "./env";
import { Profile, LOOKS, Figure, Godzilla, PLATE_COUNT, mix } from "./characters";
import timings from "./timings.json";

type P = { s: SceneData; f: number };

/** absolute-in-scene frame (local) at which word k of scene id is spoken */
export const wordFrame = (id: number, k: number) => {
  const sc = timings.scenes.find((x) => x.id === id)!;
  const w = sc.words[Math.min(k, sc.words.length - 1)];
  return Math.round((sc.start - (id - 1) * 5 + w.t0) * 30);
};

const ScreenFlash: React.FC<{ v: number; color?: string }> = ({ v, color = "#dfe9ff" }) =>
  v > 0.01 ? <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill={color} opacity={v * 0.75} style={{ mixBlendMode: "screen" }} /> : null;

/* 01 — Ash City: push-in + tilt down over rain-soaked 1949 Tokyo */
export const S01: React.FC<P> = ({ s, f }) => {
  const fl = flashAt(f, 46);
  return (
    <Stage cam={cameraAt(s, f)} defs={<Boil id="b1" f={f} />}>
      <Layer depth={0.1}>
        <Sky f={f} id="s1" top="#0b0f16" mid="#2c3440" bottom="#8a5a3a" clouds="#141821" />
        <Bolt x={260} y={-60} len={620} seed={3} opacity={fl} />
      </Layer>
      <Layer depth={0.3}>
        <rect x={-400} y={820} width={W + 800} height={300} fill="#e07a3a" opacity={0.35} filter="url(#blur30)" />
        <Skyline y={1030} color="#1c2028" seed={21} glow="#e08a42" height={1.3} />
        <Smoke f={f} x={240} y={960} scale={1.2} color="#0c0d10" seed={1} />
        <Smoke f={f + 60} x={880} y={990} scale={0.9} color="#121318" seed={2} />
      </Layer>
      <Layer depth={0.6}>
        {[[-140, 260], [140, 220], [380, 240], [640, 210], [880, 260]].map(([x, w], i) => (
          <House key={i} x={x} y={1330} w={w} h={150 + (i % 2) * 40} color="#2e2824" roof="#15171c" lit={i === 2 || i === 4 ? 0.85 * (0.85 + 0.15 * pulse(f, 9 + i)) : 0} seed={i + 3} />
        ))}
        <rect x={-400} y={1330} width={W + 800} height={900} fill="#15171b" />
        <rect x={-400} y={1330} width={W + 800} height={40} fill="#8a5a3a" opacity={0.25} filter="url(#blur6)" />
        {/* wet street reflections */}
        <rect x={380 + 40} y={1340} width={80} height={300} fill="#e0a04a" opacity={0.15} filter="url(#blur14)" />
        <Figure x={lerp(f, 160, 560)} y={1420} h={150} umbrella step={onTwos(f) * 0.22} />
      </Layer>
      <Layer depth={1.3}>
        <Pole x={900} y={2050} h={1700} wiresTo={-500} sway={wobble(f, 1, 0.03) * 10} />
        <Rubble y={1900} seed={8} />
      </Layer>
      <Layer depth={1}>
        <Ash f={f} n={60} color="#bdb6aa" size={3.5} seed={4} opacity={0.6} />
        <Rain f={f} n={180} opacity={0.38} />
      </Layer>
      <ScreenFlash v={fl * 0.5} />
    </Stage>
  );
};

/* 02 — Shikishima at the window: dolly L→R, lightning on "peace" */
export const S02: React.FC<P> = ({ s, f }) => {
  const at = wordFrame(2, 9);
  const fl = flashAt(f, at);
  const ft = onTwos(f);
  const blink = (ft % 76) < 4;
  const clench = lerp(f, 0, 1, at - 6, at + 6);
  return (
    <Stage cam={cameraAt(s, f)} bg="#040506" defs={<Boil id="b2" f={f} scale={2.5} />}>
      <Layer depth={0.2}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#06080b" />
        {/* window frame + night city outside */}
        <rect x={420} y={240} width={720} height={1100} fill={mix("#0d1218", "#9fb4d8", fl)} />
        <Skyline y={1200} color="#05070a" seed={33} tower={false} />
        {[620, 900].map((x) => <rect key={x} x={x} y={240} width={16} height={1100} fill="#020203" />)}
        <rect x={420} y={760} width={720} height={16} fill="#020203" />
        <rect x={400} y={1340} width={760} height={50} fill="#16110e" />
      </Layer>
      <Layer depth={0.8}>
        <Profile id="shk2" look={LOOKS.shikishima} x={360} y={1050} scale={2.35} boil="b2" blink={blink}
          rim={mix("#6f8fb8", "#e8f0ff", fl)} rimStrength={0.6 + fl} light={0.35 + fl * 0.6}
          breathe={Math.sin(ft / 22)} tilt={-2 + Math.sin(ft / 40) * 1.5} />
        {/* hand on the sill, clenches */}
        {/* fist on the sill: knuckles tighten on "peace" */}
        <g transform={`translate(700 1352) scale(${1.5 - clench * 0.1})`}>
          <path d="M -150,40 L -40,10 C -20,-20 10,-34 40,-30 C 70,-34 100,-26 112,-6 C 122,14 116,36 96,44 L -150,80 Z" fill="#2a2320" stroke="#0a0708" strokeWidth={4} />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M ${-4 + i * 28},${-26 + clench * 4} q 14,${-10 + clench * 6} 28,0`} stroke={mix("#3a2e2a", "#cfe0ff", fl)} strokeWidth={4} fill="none" />
          ))}
          <path d="M -30,14 C 0,0 40,6 80,30" stroke="#0a0708" strokeWidth={3} fill="none" opacity={0.6 + clench * 0.4} />
          <path d="M -40,10 C -20,-20 10,-34 40,-30 C 70,-34 100,-26 112,-6" stroke={mix("#6f8fb8", "#e8f0ff", fl)} strokeWidth={3} fill="none" opacity={0.7} />
        </g>
      </Layer>
      <Layer depth={1.4}>
        {/* rain rivulets on the glass */}
        {Array.from({ length: 22 }, (_, i) => {
          const r = rand(i + 40); const x = 380 + r() * 820; const sp = 2 + r() * 6;
          const y = ((r() * 1300 + f * sp) % 1400) + 200;
          return <path key={i} d={`M ${x} ${y - 120 - r() * 80} Q ${x + 6} ${y - 50} ${x} ${y}`} stroke="#a9c2dc" strokeWidth={3 + r() * 3} opacity={0.35} fill="none" strokeLinecap="round" />;
        })}
      </Layer>
      <Layer depth={1}><Rain f={f} n={60} opacity={0.15} len={40} /></Layer>
      <ScreenFlash v={fl} />
    </Stage>
  );
};

/* 03 — Noriko: push-in to the neck; veins creep on "never faded" */
export const S03: React.FC<P> = ({ s, f }) => {
  const k = wordFrame(3, 9);
  const mark = lerp(f, 0.25, 1, k - 10, k + 30);
  const handUp = lerp(f, 0, 1, 20, 60);
  const ft = onTwos(f);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0b0806" defs={<Boil id="b3" f={f} scale={2.4} />}>
      <Layer depth={0.2}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#1a120c" />
        {/* shoji screen grid with lamp glow */}
        <rect x={-200} y={100} width={1500} height={1500} fill="#3a2a1a" />
        <circle cx={820} cy={520} r={380} fill="#e6a352" opacity={0.45 * (0.9 + 0.1 * pulse(ft, 14))} filter="url(#blur30)" />
        {Array.from({ length: 12 }, (_, i) => <rect key={`v${i}`} x={-200 + i * 130} y={100} width={10} height={1500} fill="#120c08" />)}
        {Array.from({ length: 12 }, (_, i) => <rect key={`h${i}`} x={-200} y={100 + i * 130} width={1500} height={10} fill="#120c08" />)}
      </Layer>
      <Layer depth={0.8}>
        <Profile id="nor3" look={LOOKS.noriko} x={500} y={980} scale={2.5} flip boil="b3" mark={mark}
          rim="#f0b46a" rimStrength={0.9} light={0.75} blink={(ft % 90) < 4} tilt={lerp(f, 0, -5)} breathe={Math.sin(ft / 24)} />
        {/* her hand rising to the neck */}
        <g transform={`translate(${lerp(handUp, 820, 640, 0, 1)} ${lerp(handUp, 1700, 1380, 0, 1)}) rotate(${-30 + handUp * 20})`}>
          <path d="M -40,60 C -50,0 -20,-60 20,-80 C 40,-90 60,-70 50,-50 C 70,-60 80,-40 66,-20 C 80,-20 80,0 60,10 C 60,40 30,70 -40,60 Z" fill="#b8987f" stroke="#0a0708" strokeWidth={4} />
        </g>
      </Layer>
      <Layer depth={1.4}><Ash f={f} n={26} color="#f4c98a" size={9} seed={13} speed={0.4} opacity={0.35} /></Layer>
    </Stage>
  );
};

/* 04 — Noda: tilt up from desk to face; telegram; glasses glint on "called back" */
export const S04: React.FC<P> = ({ s, f }) => {
  const glint = Math.max(0, 1 - Math.abs(f - wordFrame(4, 9)) / 8);
  const tele = lerp(f, -500, 0, 6, 34);
  const ft = onTwos(f);
  return (
    <Stage cam={cameraAt(s, f)} bg="#06070a" defs={<Boil id="b4" f={f} scale={2.4} />}>
      <Layer depth={0.3}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#0b0d10" />
        <rect x={-100} y={140} width={1280} height={760} fill="#18221d" stroke="#3a2c20" strokeWidth={24} />
        <g stroke="#bfc6bb" strokeWidth={4} fill="none" opacity={0.55}>
          <path d="M 60,260 l 80,0 m -60,40 l 120,0 M 60,380 q 60,-60 120,0 t 120,0" />
          <text x={60} y={520} fill="#bfc6bb" stroke="none" fontSize={44} fontFamily="Shippori">∂ρ/∂t = −∇·(ρv)</text>
          {/* chalk sketch of a dorsal-plated silhouette */}
          <path d="M 640,820 C 650,640 700,480 760,400 L 800,360 C 840,420 880,560 900,820" />
          <path d="M 790,380 l 30,-40 l 10,30 M 830,450 l 40,-40 l 6,40 M 860,540 l 44,-36 l 0,44 M 880,640 l 40,-30 l -4,40" />
          <circle cx={770} cy={380} r={70} strokeDasharray="10 8" />
        </g>
      </Layer>
      <Layer depth={0.8}>
        <Profile id="noda4" look={LOOKS.noda} x={430} y={1040} scale={2.3} boil="b4" rim="#f2c27a" rimStrength={0.9} light={0.7}
          blink={(ft % 80) < 4} tilt={lerp(f, 4, -3)} breathe={Math.sin(ft / 22)} />
        <circle cx={430 + 66 * 2.3} cy={1040 - 31 * 2.3} r={30} fill="#fff" opacity={glint} filter="url(#glowSoft)" />
      </Layer>
      <Layer depth={1.3}>
        <rect x={-300} y={1600} width={W + 600} height={700} fill="#1b130c" />
        <circle cx={880} cy={1560} r={320} fill="#ffc06a" opacity={0.35} filter="url(#blur30)" />
        <path d="M 760,1600 L 820,1420 L 980,1420 L 1040,1600 Z" fill="#2a3a24" stroke="#000" strokeWidth={4} />
        <rect x={890} y={1600} width={20} height={200} fill="#111" />
        <g transform={`translate(${tele + 120} 1720) rotate(-6)`}>
          <rect x={0} y={0} width={520} height={300} fill="#d9cfb4" stroke="#3a3020" strokeWidth={3} />
          <text x={30} y={70} fontFamily="Oswald" fontSize={44} fill="#2a2016">TELEGRAM — URGENT</text>
          <text x={30} y={140} fontFamily="Oswald" fontSize={34} fill="#2a2016">DR. NODA. RETURN AT ONCE.</text>
          <text x={30} y={190} fontFamily="Oswald" fontSize={28} fill="#5a4a36">— staged prop —</text>
        </g>
        {[0, 1, 2].map((i) => <rect key={i} x={-60 + i * 40} y={1650 + i * 30} width={420} height={260} fill="#c9bea2" stroke="#2a2016" strokeWidth={2} transform={`rotate(${8 - i * 7} 0 1700)`} />)}
      </Layer>
    </Stage>
  );
};

/* 05 — Murakami + specimen jar: lateral arc, rack focus FG→BG, tissue twitches on "left behind" */
export const S05: React.FC<P> = ({ s, f }) => {
  const tw = wordFrame(5, 9);
  const twitch = Math.max(0, 1 - Math.abs(f - tw) / 10);
  const rack = lerp(f, 0, 1, 70, 110); // 0 = FG sharp, 1 = BG sharp
  const ft = onTwos(f);
  const blue = 0.55 + 0.45 * pulse(f, 26) + twitch * 0.8;
  return (
    <Stage cam={cameraAt(s, f)} bg="#04060a" defs={<><Boil id="b5" f={f} scale={2.4} /><filter id="rk"><feGaussianBlur stdDeviation={6 * (1 - rack)} /></filter><filter id="rkf"><feGaussianBlur stdDeviation={10 * rack} /></filter></>}>
      <Layer depth={0.25} filter="url(#rk)">
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#070a0e" />
        {[300, 620, 940].map((y) => <rect key={y} x={-300} y={y} width={W + 600} height={14} fill="#1a1612" />)}
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x={-200 + i * 100} y={(i % 3) * 320 + 180} width={50} height={120} rx={10} fill="#18242a" opacity={0.8} />)}
        {/* Noda silhouette in the background */}
        <Profile id="noda5" look={LOOKS.noda} x={180} y={900} scale={1.2} rim="#5fa8ff" rimStrength={0.5} light={0.15} />
      </Layer>
      <Layer depth={0.8}>
        <Profile id="mur5" look={LOOKS.murakami} x={340} y={1150} scale={2.3} boil="b5" rim="#7fd4ff" rimStrength={0.6 + blue * 0.6}
          light={0.35} blink={(ft % 70) < 4} tilt={lerp(f, -2, 8)} breathe={Math.sin(ft / 26)} />
      </Layer>
      <Layer depth={1.3} filter="url(#rkf)">
        <circle cx={820} cy={1300} r={360} fill="#5fc8ff" opacity={0.25 * blue} filter="url(#blur30)" />
        <rect x={640} y={980} width={360} height={620} rx={50} fill="#8fd8ff" fillOpacity={0.12} stroke="#cfefff" strokeOpacity={0.5} strokeWidth={6} />
        <rect x={660} y={940} width={320} height={60} rx={12} fill="#2a2a2a" />
        <g transform={`translate(820 1320) scale(${1 + twitch * 0.12} ${1 - twitch * 0.08})`}>
          <path d="M -110,40 C -140,-60 -60,-140 10,-120 C 90,-110 140,-40 110,40 C 90,110 -70,130 -110,40 Z" fill="#2a0e14" stroke="#000" strokeWidth={4} />
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M ${-60 + i * 30},${-60 + (i % 2) * 30} q 20,30 ${-10 + i * 5},70`} stroke="#8fe0ff" strokeWidth={4} fill="none" opacity={blue} filter="url(#glowBlue)" />)}
        </g>
        {Array.from({ length: 10 }, (_, i) => { const r = rand(i + 3); return <circle key={i} cx={680 + r() * 280} cy={1580 - ((f * (2 + r() * 3) + r() * 600) % 600)} r={4 + r() * 8} fill="none" stroke="#cfefff" strokeOpacity={0.6} strokeWidth={2} />; })}
      </Layer>
    </Stage>
  );
};

/* 06 — Sagami Bay seabed: descending tilt; mass throbs; plate tip grows on "growing" */
export const S06: React.FC<P> = ({ s, f }) => {
  const g = wordFrame(6, 8);
  const grow = lerp(f, 0, 1, g - 8, g + 30);
  const beat = Math.pow(pulse(f, 45), 6);
  return (
    <Stage cam={cameraAt(s, f)} bg="#010308" defs={<Boil id="b6" f={f} scale={3} />}>
      <Layer depth={0.2}>
        <rect x={-400} y={-600} width={W + 800} height={H + 1200} fill="url(#sea6)" />
        <defs><linearGradient id="sea6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d2a3a" /><stop offset="0.5" stopColor="#04101a" /><stop offset="1" stopColor="#010205" /></linearGradient></defs>
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M ${200 + i * 220 + Math.sin(f / 40 + i) * 30},-600 L ${100 + i * 260},1600 L ${220 + i * 260},1600 Z`} fill="#6fb8d8" opacity={0.08} filter="url(#blur14)" />)}
      </Layer>
      <Layer depth={0.7}>
        <path d="M -400,1500 Q 200,1380 540,1460 T 1500,1420 L 1500,2400 L -400,2400 Z" fill="#05080a" />
        {/* sunken debris: a wrecked ship hull from the operation */}
        <path d="M 760,1450 L 1100,1380 L 1160,1440 L 820,1520 Z" fill="#0a0f12" stroke="#000" strokeWidth={3} />
        <g transform={`translate(520 1420) scale(${1 + beat * 0.06})`} filter="url(#b6)">
          <path d="M -260,40 C -300,-80 -180,-200 -40,-190 C 120,-200 260,-120 250,20 C 240,100 -220,120 -260,40 Z" fill="#1c0a0e" stroke="#000" strokeWidth={5} />
          <path d="M -200,-40 C -120,-120 0,-140 120,-90 M -160,20 C -60,-40 60,-50 180,0" stroke="#000" strokeWidth={6} fill="none" opacity={0.6} />
          {[[-150, -60], [-60, -120], [40, -110], [140, -60], [-90, 0], [60, -20]].map(([x, y], i) => (
            <path key={i} d={`M ${x},${y} q 20,-30 ${40 + i * 6},${-10 + i * 4} q 20,20 30,50`} stroke="#7fd4ff" strokeWidth={5} fill="none" opacity={0.25 + beat * 0.75} filter="url(#glowBlue)" />
          ))}
          {/* plate tip pushing out */}
          <g transform={`translate(-20 -175) scale(${0.2 + grow * 0.9})`}>
            <path d="M -40,0 L -50,-40 L -80,-50 L -40,-70 L -46,-100 L -16,-86 L 0,-130 L 16,-86 L 46,-100 L 40,-70 L 80,-50 L 50,-40 L 40,0 Z" fill={mix("#1c1d22", "#9fe0ff", grow * (0.5 + beat * 0.5))} stroke="#000" strokeWidth={4} filter="url(#glowBlue)" />
          </g>
        </g>
      </Layer>
      <Layer depth={1.3}><Ash f={f} n={90} color="#b8d6e6" size={3} seed={61} speed={0.6} opacity={0.5} /></Layer>
    </Stage>
  );
};

/* 07 — Blue light under the boat: handheld sway + pull-back */
export const S07: React.FC<P> = ({ s, f }) => {
  const pw = wordFrame(7, 6);
  const glow = 0.25 + 0.3 * Math.pow(pulse(f, 34), 3) + lerp(f, 0, 0.6, pw - 4, pw + 20);
  const rock = Math.sin(f / 18) * 4;
  return (
    <Stage cam={cameraAt(s, f, 14)} bg="#03050a" defs={<Boil id="b7" f={f} scale={2.5} />}>
      <Layer depth={0.2}>
        <Sky f={f} id="s7" top="#020306" mid="#0b1420" bottom="#1a2a38" clouds="#05080d" seed={17} />
      </Layer>
      <Layer depth={0.6}>
        <ellipse cx={540} cy={1400} rx={520} ry={180} fill="#5fd0ff" opacity={glow * 0.8} filter="url(#blur30)" />
        <Ocean f={f} y={1060} color="#06111b" crest="#5f86a0" layers={3} amp={18} />
        <ellipse cx={540} cy={1420} rx={360} ry={90} fill="#9fe6ff" opacity={glow * 0.5} filter="url(#blur30)" style={{ mixBlendMode: "screen" }} />
      </Layer>
      <Layer depth={0.9}>
        <g filter="url(#b7)"><Boat x={540} y={1180 + Math.sin(f / 18) * 12} scale={1.25} rock={rock} lantern={0.8 + 0.2 * pulse(onTwos(f), 7)} recoil={lerp(f, 0, 1, pw, pw + 18)} /></g>
      </Layer>
      <Layer depth={1.4}>
        <Ocean f={f + 40} y={1560} color="#030a12" crest="#8fb8d0" layers={2} amp={40} speed={1.4} seed={9} />
        <Rain f={f} n={120} opacity={0.3} angle={20} />
      </Layer>
    </Stage>
  );
};

/* 08 — The sea tears open: low angle tilt-up, Godzilla rises, roar on "returned" */
export const S08: React.FC<P> = ({ s, f }) => {
  const open = wordFrame(8, 3);
  const ret = wordFrame(8, 6);
  const rise = lerp(f, 0, 1, open - 10, ret + 10);
  const jaw = lerp(f, 0, 1, ret - 4, ret + 10) * (1 - lerp(f, 0, 0.6, ret + 50, ret + 80));
  const shake = 6 + 26 * Math.max(0, 1 - Math.abs(f - ret - 6) / 30) + 14 * Math.max(0, 1 - Math.abs(f - open) / 20);
  const fl = flashAt(f, 22);
  return (
    <Stage cam={cameraAt(s, f, shake)} bg="#020305" defs={<Boil id="b8" f={f} scale={3} />}>
      <Layer depth={0.15}>
        <Sky f={f} id="s8" top="#05060a" mid="#121a26" bottom="#2a3644" clouds="#07090e" seed={23} />
        <Bolt x={820} y={-80} len={760} seed={8} opacity={fl} />
      </Layer>
      <Layer depth={0.6}>
        <Godzilla id="g8" x={600} y={lerp(rise, 1950, 1500, 0, 1)} scale={1.12} jaw={jaw} boil="b8"
          rim={mix("#6f8fb8", "#e8f0ff", fl)} rimStrength={0.8 + fl} eye={0.7} />
        {/* water cascading off the body */}
        {Array.from({ length: 14 }, (_, i) => { const r = rand(i + 90); const x = 300 + r() * 600; const y0 = lerp(rise, 1700, 600 + r() * 600, 0, 1); return <path key={i} d={`M ${x},${y0} q ${10 - r() * 20},200 ${-6 + r() * 12},${400 + r() * 300}`} stroke="#c4d8e6" strokeWidth={4 + r() * 8} opacity={0.35 * rise} fill="none" filter="url(#blur2)" />; })}
      </Layer>
      <Layer depth={1.5}>
        <Ocean f={f * 2} y={1480} color="#050b12" crest="#d2e4f0" layers={3} amp={40 + rise * 50} speed={1.6} seed={4} />
        <Ash f={f} n={60} color="#e8f2fa" size={10} seed={88} speed={-6} rise opacity={0.4 * rise} />
      </Layer>
      <Layer depth={1}><Rain f={f} n={150} opacity={0.35} angle={18} /></Layer>
      <ScreenFlash v={fl * 0.6} />
    </Stage>
  );
};

/* 09 — Spines ignite: track up the spine; plates click up one by one on "one by one" */
export const S09: React.FC<P> = ({ s, f }) => {
  const beats = [wordFrame(9, 3), wordFrame(9, 4) + 4, wordFrame(9, 5), wordFrame(9, 6) + 4, wordFrame(9, 7), wordFrame(9, 8)];
  // plates indexed head(0)→tail(n-1); raise from the tail toward the head
  const plates = Array.from({ length: PLATE_COUNT }, (_, i) => {
    const order = PLATE_COUNT - 1 - i; // tail first
    const beat = beats[Math.min(beats.length - 1, Math.floor((order / PLATE_COUNT) * beats.length))] + (order % 2) * 2;
    return lerp(f, 0.25, 1, beat, beat + 4);
  });
  const glow = plates.map((p) => clamp((p - 0.6) / 0.4) * (0.75 + 0.25 * pulse(f, 6)));
  const charge = lerp(f, 0, 1, beats[0], 150);
  return (
    <Stage cam={cameraAt(s, f, 4 + charge * 8)} bg="#06040a" defs={<Boil id="b9" f={f} scale={3} />}>
      <Layer depth={0.2}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#120a0a" />
        <rect x={-400} y={900} width={W + 800} height={700} fill="#d26a2a" opacity={0.35} filter="url(#blur30)" />
        <Skyline y={1500} color="#0a0607" seed={44} tower={false} height={1.5} />
        <Smoke f={f} x={200} y={1400} scale={1.4} color="#1a0e0c" seed={6} />
        <Smoke f={f + 80} x={760} y={1450} scale={1.2} color="#120a0a" seed={7} />
      </Layer>
      <Layer depth={0.8}>
        <Godzilla id="g9" x={420} y={2350} scale={1.75} plates={plates} glow={glow} boil="b9" rim={mix("#e08a4a", "#9fe0ff", charge)} rimStrength={1} eye={0.9} jaw={charge * 0.25} mouthGlow={charge * 0.6} />
      </Layer>
      <Layer depth={1.3}>
        <Ash f={f} n={70} color="#ffb070" size={4} seed={19} rise speed={2.2} opacity={0.7} />
        <Ash f={f} n={40} color="#9fe6ff" size={3} seed={29} rise speed={3.5} opacity={charge} glow />
      </Layer>
      <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#7fd4ff" opacity={charge * 0.12} style={{ mixBlendMode: "screen" }} />
    </Stage>
  );
};

/* 10 — PLOT TWIST: heat ray + blast over Tokyo, shockwave shake, black rain */
export const S10: React.FC<P> = ({ s, f }) => {
  const beam = lerp(f, 0, 1, 2, 14);
  const blast = lerp(f, 0, 1, 28, 70, (x) => 1 - Math.pow(1 - x, 3));
  const white = Math.max(0, 1 - Math.abs(f - 32) / 12);
  const nothing = wordFrame(10, 10);
  const blackRain = lerp(f, 0, 1, nothing - 10, nothing + 20);
  const shake = 30 * Math.max(0, 1 - Math.abs(f - 34) / 40);
  return (
    <Stage cam={cameraAt(s, f, shake)} bg="#000" defs={<Boil id="b10" f={f} scale={3} />}>
      <Layer depth={0.2}>
        <Sky f={f} id="s10" top="#02040a" mid={mix("#0a1222", "#3a5a7a", blast)} bottom={mix("#1a1414", "#9fd8ff", blast * 0.6)} clouds="#04060a" seed={31} />
        {/* blue-white mushroom cloud */}
        <g transform={`translate(560 1180) scale(${0.2 + blast * 1.1})`} opacity={clamp(blast * 2)} filter="url(#glowSoft)">
          <rect x={-70} y={-700} width={140} height={700} fill="#9fd8ff" opacity={0.75} filter="url(#blur14)" />
          <ellipse cx={0} cy={-760} rx={420} ry={220} fill="#cfefff" opacity={0.9} filter="url(#blur30)" />
          <ellipse cx={0} cy={-780} rx={300} ry={140} fill="#ffffff" opacity={0.8} filter="url(#blur14)" />
          <ellipse cx={0} cy={0} rx={600} ry={80} fill="#bfefff" opacity={0.7} filter="url(#blur30)" />
        </g>
      </Layer>
      <Layer depth={0.7}>
        <g transform={`translate(0 ${blast * 40})`}><Skyline y={1340} color="#05060a" seed={55} height={1.4} glow={blast > 0 ? "#7fd4ff" : undefined} /></g>
        {/* shockwave ring */}
        {blast > 0 && blast < 1 && <ellipse cx={560} cy={1300} rx={blast * 1400} ry={blast * 260} fill="none" stroke="#e6f8ff" strokeWidth={20 * (1 - blast)} opacity={1 - blast} filter="url(#blur6)" />}
        {/* heat ray from off-screen right */}
        {f < 40 && <path d={`M 1300,${700} L ${1300 - beam * 760},${1280}`} stroke="#e8fbff" strokeWidth={26} filter="url(#glowSoft)" opacity={Math.min(1, beam * 2) * (f < 32 ? 1 : 0.3)} strokeLinecap="round" />}
        {f < 40 && <path d={`M 1300,${700} L ${1300 - beam * 760},${1280}`} stroke="#5fc8ff" strokeWidth={70} opacity={0.45 * beam} filter="url(#blur14)" />}
      </Layer>
      <Layer depth={1.4}>
        {Array.from({ length: 26 }, (_, i) => { const r = rand(i + 300); const d = blast * (400 + r() * 1200); const a = -Math.PI * (0.05 + r() * 0.9); return <rect key={i} x={560 + Math.cos(a) * d} y={1300 + Math.sin(a) * d * 0.7 + blast * blast * 600} width={14 + r() * 30} height={8 + r() * 16} fill="#030305" transform={`rotate(${f * (r() * 20 - 10)} ${560 + Math.cos(a) * d} ${1300 + Math.sin(a) * d * 0.7})`} />; })}
        <Rain f={f} n={200} color="#0a0a0c" opacity={0.75 * blackRain} angle={8} len={90} />
      </Layer>
      <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#f2fbff" opacity={white * 0.9} />
    </Stage>
  );
};

/* 11 — Face the nightmare: over-shoulder push-in; he takes her hand on "everyone he loves" */
export const S11: React.FC<P> = ({ s, f }) => {
  const love = wordFrame(11, 8);
  const hand = lerp(f, 0, 1, love - 6, love + 14);
  const turn = lerp(f, 18, 0, 40, 120);
  return (
    <Stage cam={cameraAt(s, f)} bg="#060406" defs={<Boil id="b11" f={f} scale={2.6} />}>
      <Layer depth={0.25}>
        <Sky f={f} id="s11" top="#06070c" mid="#2a1a1a" bottom="#8a3a1a" clouds="#120c0c" seed={41} />
        <Skyline y={1260} color="#0b0708" seed={66} height={1.2} glow="#ff7a2a" />
        <Godzilla id="g11" x={700} y={1320} scale={0.62} headTurn={turn} rim="#7fd4ff" rimStrength={1.2} eye={1} boil="b11"
          glow={Array(PLATE_COUNT).fill(0.35 + 0.25 * pulse(f, 30))} plates={Array(PLATE_COUNT).fill(0.7)} />
        <Smoke f={f} x={150} y={1300} scale={1.2} color="#140a0a" seed={8} />
      </Layer>
      <Layer depth={0.8}>
        <rect x={-400} y={1500} width={W + 800} height={900} fill="#0a0708" />
        {/* the couple from behind, full figure silhouettes with rim light */}
        <g filter="url(#b11)">
          <g transform="translate(330 1880) scale(3.1)">
            <ellipse cx={0} cy={-160} rx={13} ry={15} fill="#060405" />
            <path d="M -26,-146 C -40,-120 -38,-60 -30,0 L 30,0 C 38,-60 40,-120 26,-146 Z" fill="#0a0708" />
            <path d="M -14,-174 C -6,-180 8,-180 14,-172" stroke="#7fd4ff" strokeWidth={1.5} fill="none" />
            <path d="M 26,-146 C 40,-120 38,-60 30,0" stroke="#ff9a4a" strokeWidth={1.4} fill="none" opacity={0.8} />
          </g>
          <g transform="translate(720 1890) scale(2.8)">
            <path d="M -16,-172 C -24,-182 20,-186 18,-160 L 20,-140 L -20,-140 Z" fill="#060405" />
            <ellipse cx={0} cy={-158} rx={12} ry={14} fill="#060405" />
            <path d="M -22,-140 C -34,-110 -34,-50 -36,0 L 36,0 C 34,-50 34,-110 22,-140 Z" fill="#0c0809" />
            <path d="M -22,-140 C -34,-110 -34,-50 -36,0" stroke="#ff9a4a" strokeWidth={1.4} fill="none" opacity={0.8} />
            {/* invented staging: her mark answering Godzilla's glow */}
            <circle cx={-8} cy={-146} r={2.4} fill="#9fe6ff" opacity={0.4 + 0.5 * pulse(f, 30)} filter="url(#glowBlue)" />
          </g>
          {/* reaching arms → joined hands */}
          <path d={`M 400,1500 Q ${480 + hand * 40},${1600 - hand * 40} ${520 + hand * 60},${1640 - hand * 60}`} stroke="#0a0708" strokeWidth={30} fill="none" strokeLinecap="round" />
          <path d={`M 650,1520 Q ${620 - hand * 20},${1620 - hand * 20} ${600 - hand * 20},${1650 - hand * 70}`} stroke="#0c0809" strokeWidth={26} fill="none" strokeLinecap="round" />
        </g>
      </Layer>
      <Layer depth={1.3}>
        <Ash f={f} n={80} color="#ff9a4a" size={4} seed={71} rise speed={1.8} opacity={0.8} />
        <Ash f={f} n={60} color="#9a9088" size={6} seed={72} speed={1.2} opacity={0.6} />
      </Layer>
    </Stage>
  );
};

/* 12 — Title: backlit Godzilla, title burns in */
export const S12: React.FC<P> = ({ s, f }) => (
  <Stage cam={cameraAt(s, f)} bg="#010204" defs={<Boil id="b12" f={f} scale={2} />}>
    <Layer depth={0.2}>
      <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#020308" />
      <ellipse cx={540} cy={820} rx={700} ry={900} fill="#2a6a9a" opacity={0.35 + 0.1 * pulse(f, 40)} filter="url(#blur30)" />
      <Godzilla id="g12" x={560} y={1750} scale={1.15} rim="#bfe8ff" rimStrength={1.6} bodyColor="#050507" eye={lerp(f, 0, 1, 20, 40)}
        glow={Array(PLATE_COUNT).fill(lerp(f, 0.1, 0.55, 0, 60))} plates={Array(PLATE_COUNT).fill(0.9)} boil="b12" />
      <rect x={-400} y={1200} width={W + 800} height={1200} fill="url(#fadeDown)" />
      <ellipse cx={540} cy={620} rx={620} ry={420} fill="#000" opacity={0.55} filter="url(#blur30)" />
    </Layer>
    <Layer depth={1.3}><Ash f={f} n={70} color="#c8d8e4" size={3.5} seed={91} speed={0.9} opacity={0.6} /></Layer>
  </Stage>
);

export const SCENE_COMPONENTS = [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12];
