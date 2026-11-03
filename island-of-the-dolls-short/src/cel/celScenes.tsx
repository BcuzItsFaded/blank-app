import React from "react";
import { staticFile } from "remotion";
import { H, W, lerp, onTwos, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Rain, Ash, Boil, SoftGlow, flashAt } from "./celFx";
import { Sky, Ocean } from "./env";
import { Profile, LOOKS } from "./characters";
import { Doll, Willow, Hut, Cross, Canoe, LilyPads, Lantern } from "./island";
import { wordFrame } from "../scenes";

/* Code-drawn cel-animation version of the Island of the Dolls (same engine as the Godzilla Short).
   Camera keys: [sec, zoom, x, y, rot]. Layer depth drives parallax. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const sway = (f: number, ph: number, amp = 6, per = 70) => Math.sin((f + ph) / per * Math.PI * 2) * amp;
const DRESSES = ["#c86a8a", "#e0c89a", "#8a9ac8", "#d8a0c0", "#b8c88a", "#e8b080", "#a07ab8"];

/** dolls hanging across the trees (deterministic layout) */
const DollField: React.FC<{ f: number; n: number; seed: number; y0: number; y1: number; scale: number; rain?: boolean }> = ({ f, n, seed, y0, y1, scale }) => {
  const r = rand(seed);
  const ds = Array.from({ length: n }, (_, i) => ({ x: r() * 1300 - 110, y: y0 + r() * (y1 - y0), s: scale * (0.7 + r() * 0.6), ph: r() * 200, d: DRESSES[i % DRESSES.length], hair: r() > 0.5 ? "#c89a4a" : "#6a4a2a", hollow: r() > 0.4, rope: 40 + r() * 90, arm: r() > 0.8 }));
  return <g>{ds.map((d, i) => <Doll key={i} x={d.x} y={d.y} scale={d.s} sway={sway(f, d.ph, 5, 60 + (i % 5) * 9)} dress={d.d} hair={d.hair} hollow={d.hollow} rope={d.rope} seed={seed + i} missingArm={d.arm} />)}</g>;
};

/** the island at dusk: water, trees full of dolls, hut, cross */
const IslandWide: React.FC<{ f: number; lit?: number }> = ({ f, lit = 1 }) => (
  <>
    <Layer depth={0.1}>
      <Sky f={f} id="isl" top="#160a28" mid="#5a2e6a" bottom="#e08a6a" clouds="#8a5a78" cloudOpacity={0.55} seed={12} />
    </Layer>
    <Layer depth={0.25}>
      <path d="M -400,1180 C -200,1120 0,1150 200,1120 C 400,1090 600,1140 800,1110 C 1000,1090 1200,1130 1500,1110 L 1500,1260 L -400,1260 Z" fill="#1e1a32" />
    </Layer>
    <Layer depth={0.5}>
      <Ocean f={f} y={1250} color="#2a1e4a" crest="#c8a0e0" layers={4} amp={8} speed={0.5} seed={4} />
      <SoftGlow cx={540} cy={1360} rx={120} ry={260} color="#ffb850" opacity={0.3 * lit} />
      <ellipse cx={540} cy={1240} rx={520} ry={70} fill="#1c2a1a" stroke="#0a120a" strokeWidth={4} />
      {[[150, 820, 3], [330, 760, 7], [760, 840, 9], [930, 740, 11], [470, 640, 13]].map(([x, h, sd]) => <Willow key={sd} x={x} y={1240} h={h} f={f} seed={sd} />)}
      <DollField f={f} n={26} seed={33} y0={520} y1={1000} scale={0.36} />
      <Hut x={540} y={1236} w={240} h={150} lit={lit * (0.85 + 0.15 * Math.sin(f * 0.9) * Math.sin(f * 0.31))} />
      <Cross x={820} y={1250} s={0.55} />
      {/* reflection of the cross */}
      {[0, 1, 2, 3].map((k) => <line key={k} x1={810 - 20 + Math.sin(f / 10 + k) * 8} y1={1290 + k * 18} x2={830 + 20 + Math.sin(f / 10 + k) * 8} y2={1290 + k * 18} stroke="#efe8f4" strokeWidth={4} opacity={0.35 - k * 0.07} />)}
    </Layer>
  </>
);

/** back view of a person (for the canoe and the visitors) */
const BackPerson: React.FC<{ x: number; y: number; s: number; shirt: string; hat?: "straw" | "cap"; hair?: string; pony?: boolean; pack?: string; arm?: number }> = ({ x, y, s, shirt, hat, hair = "#1a1214", pony, pack }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -175,330 C -182,190 -150,96 -74,64 L 74,64 C 150,96 182,190 175,330 Z" fill={shirt} stroke="#120a0a" strokeWidth={4} />
    <path d="M -175,330 C -182,190 -150,96 -74,64 L -30,64 C -86,120 -104,220 -96,330 Z" fill="#000" opacity={0.3} />
    <path d="M -10,70 L -4,330 M -120,140 C -90,170 -60,180 -30,180 M 120,140 C 90,170 60,180 30,180" stroke="#000" strokeWidth={3} opacity={0.35} fill="none" />
    {pack && <path d="M -90,90 C -100,160 -96,250 -80,300 L 80,300 C 96,250 100,160 90,90 Z" fill={pack} stroke="#120a0a" strokeWidth={4} />}
    {pack && <path d="M -60,90 C -70,60 -50,40 -40,60 M 60,90 C 70,60 50,40 40,60" stroke="#120a0a" strokeWidth={8} fill="none" />}
    <rect x={-22} y={20} width={44} height={50} fill="#8a6048" />
    <ellipse cx={0} cy={-10} rx={52} ry={60} fill={hair} stroke="#120a0a" strokeWidth={4} />
    {pony && <path d="M 0,40 C 10,90 -6,150 6,200" stroke={hair} strokeWidth={22} strokeLinecap="round" fill="none" />}
    {hat === "straw" && (
      <g>
        <ellipse cx={0} cy={-30} rx={150} ry={34} fill="#dcbc7c" stroke="#2a1a0a" strokeWidth={4} />
        <path d="M -62,-34 C -64,-90 -40,-120 0,-122 C 40,-120 64,-90 62,-34 Z" fill="#d6b474" stroke="#2a1a0a" strokeWidth={4} />
        <path d="M -62,-48 C -20,-56 20,-56 62,-48 L 62,-34 C 20,-42 -20,-42 -62,-34 Z" fill="#6a3a20" />
      </g>
    )}
    {hat === "cap" && <path d="M -54,-10 C -60,-70 -20,-82 0,-80 C 30,-80 58,-60 54,-10 Z" fill="#3a3a54" stroke="#0a0a12" strokeWidth={4} />}
  </g>
);

/* 1 — Hosts: the island at dusk; hosts' logo opens the Short */
export const C1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.0, 0, 0, 0], [2.5, 1.02, 0, 0, 0], [7, 1.18, 0, 110, 0]]);
  const logo = lerp(f, 0, 1, 0, 12) * (1 - lerp(f, 0, 1, 190, 214));
  return (
    <Stage cam={cameraAt(s, f)} bg="#120820" defs={<Boil id="cb1" f={f} scale={2} />}>
      <IslandWide f={f} />
      <Layer depth={1.3}>
        <LilyPads y={1620} f={f} seed={7} n={10} />
      </Layer>
      <Layer depth={1}>
        <Ash f={f} n={14} color="#ffe27a" size={4} seed={3} rise speed={0.3} opacity={0.8} />
        <image href={staticFile("brand/logo.png")} x={300} y={150} width={480} height={449} opacity={logo} />
      </Layer>
    </Stage>
  );
};

/* 2 — Julián paddles toward the island (back view), ripples, mist */
export const C2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.04, -60, 60, 0], [8, 1.3, 140, -160, 0]]);
  const stroke = (f % 51) / 51; // paddle cycle
  const pa = -22 + 44 * (stroke < 0.55 ? stroke / 0.55 : 1 - (stroke - 0.55) / 0.45);
  const rock = Math.sin(f / 22) * 1.2;
  return (
    <Stage cam={cameraAt(s, f)} bg="#120820" defs={<Boil id="cb2" f={f} scale={2.2} />}>
      <Layer depth={0.1}><Sky f={f} id="s2" top="#1a0e30" mid="#4a3a7a" bottom="#a88ab8" clouds="#6a5a88" cloudOpacity={0.5} seed={21} /></Layer>
      <Layer depth={0.35}>
        <Ocean f={f} y={980} color="#2e2a5a" crest="#c8b8f0" layers={4} amp={10} speed={0.6} seed={8} />
        <ellipse cx={800} cy={960} rx={300} ry={46} fill="#1c2a1a" />
        <Willow x={680} y={960} h={520} f={f} seed={41} /><Willow x={960} y={960} h={600} f={f} seed={43} />
        <Hut x={820} y={958} w={190} h={120} lit={0.4} />
        {Array.from({ length: 5 }, (_, k) => <SoftGlow key={k} cx={((k * 340 + f * 0.9) % 1700) - 300} cy={900 + (k % 2) * 40} rx={380} ry={60} color="#d8c8f0" opacity={0.22} />)}
      </Layer>
      <Layer depth={0.95}>
        <g filter="url(#cb2)">
          <Canoe x={520} y={1640} s={1.35} rock={rock} />
          <g transform={`rotate(${rock} 520 1700)`}>
            <BackPerson x={430} y={1250} s={1.05} shirt="#d8b890" hat="straw" hair="#2a2624" />
            {/* paddle */}
            <g transform={`rotate(${pa} 610 1380)`}>
              <line x1={590} y1={1240} x2={720} y2={1760} stroke="#8a6040" strokeWidth={18} strokeLinecap="round" />
              <path d="M 690,1690 L 760,1680 L 780,1840 L 720,1860 Z" fill="#a07a50" stroke="#140a06" strokeWidth={4} />
            </g>
            <path d="M 540,1400 Q 590,1360 620,1380" stroke="#b07a58" strokeWidth={34} strokeLinecap="round" fill="none" />
          </g>
        </g>
        {/* ripples from the paddle */}
        {[0, 1, 2].map((j) => { const p = ((f / 30 + j * 0.6) % 1.7) / 1.7; return <ellipse key={j} cx={760} cy={1790} rx={50 + p * 300} ry={12 + p * 60} fill="none" stroke="#e8e0ff" strokeWidth={6 * (1 - p)} opacity={0.6 * (1 - p)} />; })}
      </Layer>
    </Stage>
  );
};

/* 3 — Julián at the cross: profile, mist, the legend (no ghost shown — only a ripple) */
export const C3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.12, -230, -60, 0], [3.5, 1.12, -190, -40, 0], [8, 1.2, 230, 40, 0]]);
  const ft = onTwos(f);
  const hum = Math.round(3.4 * 30);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0e0a1e" defs={<Boil id="cb3" f={f} scale={2.2} />}>
      <Layer depth={0.15}><Sky f={f} id="s3" top="#120a24" mid="#2e2a52" bottom="#5a4a7a" clouds="#3a3260" cloudOpacity={0.5} seed={31} /></Layer>
      <Layer depth={0.45}>
        <Ocean f={f} y={1130} color="#1e2244" crest="#a8a0d8" layers={4} amp={7} speed={0.4} seed={9} />
        <Willow x={1000} y={1140} h={700} f={f} seed={51} />
        <Cross x={860} y={1180} s={1.0} />
        {[0, 1, 2, 3, 4].map((k) => <line key={k} x1={830 + Math.sin(f / 9 + k) * 10} y1={1240 + k * 26} x2={890 + Math.sin(f / 9 + k) * 10} y2={1240 + k * 26} stroke="#efe8f4" strokeWidth={5} opacity={0.32 - k * 0.05} />)}
        <SoftGlow cx={860} cy={1060} rx={200} ry={260} color="#f4f0ff" opacity={0.12 + 0.08 * pulse(f, 60)} />
        {/* the "presence" is only a ripple on still water (legend, not shown) */}
        {f > hum && (() => { const p = clamp((f - hum) / 70); return <ellipse cx={700} cy={1330} rx={20 + p * 260} ry={6 + p * 50} fill="none" stroke="#e8e0ff" strokeWidth={5 * (1 - p)} opacity={0.7 * (1 - p)} />; })()}
        {Array.from({ length: 5 }, (_, k) => <SoftGlow key={k} cx={((k * 330 + f * 0.7) % 1700) - 300} cy={1150 + (k % 2) * 60} rx={420} ry={70} color="#cfc0ee" opacity={0.2} />)}
      </Layer>
      <Layer depth={0.85}>
        <path d="M -400,1400 C 0,1340 300,1360 560,1420 L 600,2400 L -400,2400 Z" fill="#1a2418" stroke="#0a120a" strokeWidth={4} />
        <Profile id="jul3" look={LOOKS.julian} x={300} y={1080} scale={2.0} boil="cb3" rim="#b8a8ff" rimStrength={0.8} light={0.6}
          blink={(ft % 90) < 4} tilt={lerp(f, 6, 2, 0, 240)} breathe={Math.sin(ft / 26)} />
      </Layer>
      <Layer depth={1.3}><Ash f={f} n={10} color="#ffe27a" size={4} seed={13} rise speed={0.3} opacity={0.7} /></Layer>
    </Stage>
  );
};

/* 4 — He hangs the first doll from a branch */
export const C4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.08, -150, 40, 0], [7, 1.22, 120, -110, 0]]);
  const ft = onTwos(f);
  const tie = Math.sin(f / 6) * (f < 120 ? 6 : 0);
  return (
    <Stage cam={cameraAt(s, f)} bg="#16101e" defs={<Boil id="cb4" f={f} scale={2.2} />}>
      <Layer depth={0.2}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#3a4a6a" />
        <SoftGlow cx={700} cy={400} rx={700} ry={600} color="#a8b8d8" opacity={0.5} />
        <Willow x={200} y={1500} h={1300} f={f} seed={61} leaf="#2a4a2a" />
        <Willow x={1000} y={1600} h={1500} f={f} seed={63} leaf="#2e522e" />
      </Layer>
      <Layer depth={0.6}><path d="M -300,360 C 200,300 600,340 1400,280 L 1400,320 C 600,380 200,340 -300,400 Z" fill="#3a2a1a" stroke="#120a06" strokeWidth={4} /></Layer>
      <Layer depth={0.9}>
        <g filter="url(#cb4)">
          <Doll x={720} y={350} scale={1.9} sway={f < 120 ? tie * 0.4 : sway(f, 0, 7, 80)} dress="#e0c89a" hair="#c89a4a" hollow={false} rope={40} seed={4} />
          {/* far arm behind his head: sleeve to the elbow, then bare forearm */}
          <path d={`M 400,1480 L 560,860 L ${770},${380 - tie}`} stroke="#140a06" strokeWidth={62} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d={`M 400,1480 L 560,860`} stroke="#a8865c" strokeWidth={54} strokeLinecap="round" fill="none" />
          <path d={`M 560,860 L ${770},${380 - tie}`} stroke="#8a5a3a" strokeWidth={40} strokeLinecap="round" fill="none" />
          <circle cx={770} cy={362 - tie} r={30} fill="#8a5a3a" stroke="#140a06" strokeWidth={4} />
          <Profile id="jul4" look={LOOKS.julian} x={220} y={1160} scale={2.0} rim="#b8c8f0" rimStrength={0.7} light={0.7} blink={(ft % 84) < 4} tilt={-14} breathe={Math.sin(ft / 22)} />
          {/* near arm */}
          <path d={`M 600,1600 L 860,1060 L ${700},${380 + tie}`} stroke="#140a06" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d={`M 600,1600 L 860,1060`} stroke="#c8a878" strokeWidth={62} strokeLinecap="round" fill="none" />
          <path d="M 600,1600 L 860,1060" stroke="#000" strokeWidth={20} opacity={0.18} transform="translate(14 8)" />
          <path d={`M 860,1060 L ${700},${380 + tie}`} stroke="#b07a58" strokeWidth={46} strokeLinecap="round" fill="none" />
          <circle cx={700} cy={366 + tie} r={34} fill="#b07a58" stroke="#140a06" strokeWidth={4} />
        </g>
      </Layer>
      <Layer depth={1.4}>
        {Array.from({ length: 10 }, (_, i) => { const r = rand(i + 400); const y = ((r() * H + f * 2.4) % (H + 200)) - 100; const x = r() * W + Math.sin((f + r() * 90) / 18) * 70; return <path key={i} d="M 0,-14 C 10,-6 10,6 0,14 C -10,6 -10,-6 0,-14 Z" fill="#6a8a3a" stroke="#1a1408" strokeWidth={2} transform={`translate(${x} ${y}) rotate(${f * 3 + i * 40}) scale(1.6)`} />; })}
      </Layer>
    </Stage>
  );
};

/* 5 — Decades of dolls: rain, crowded trees, the big doll's staring eyes */
export const C5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.04, 40, 80, 0], [4.5, 1.1, 0, 0, 0], [8, 1.45, -400, -360, 0]]);
  const eyes = lerp(f, 0, 1, wordFrame(5, 15) - 4, wordFrame(5, 15) + 6);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0e0c18" defs={<Boil id="cb5" f={f} scale={2.4} />}>
      <Layer depth={0.15}><Sky f={f} id="s5" top="#0e0c1a" mid="#2a2a44" bottom="#4a4a66" clouds="#2a2a3a" seed={53} /></Layer>
      <Layer depth={0.4}>
        {[[100, 1500, 71], [420, 1450, 73], [760, 1500, 75], [1020, 1420, 77]].map(([x, h, sd]) => <Willow key={sd} x={x} y={1700} h={h} f={f} seed={sd} leaf="#243c24" leaf2="#3e5a30" />)}
        <Hut x={600} y={1560} w={360} h={240} lit={0.6} />
        <DollField f={f} n={34} seed={91} y0={200} y1={1300} scale={0.7} />
        <rect x={-400} y={1560} width={W + 800} height={900} fill="#1a1a14" />
      </Layer>
      <Layer depth={1.0}>
        <g filter="url(#cb5)">
          <Doll x={260} y={100} scale={4.6} sway={sway(f, 30, 2.5, 110)} dress="#d8a0c0" hair="#b8823a" hollow glint={eyes} crack={1} rope={30} seed={9} missingArm />
        </g>
      </Layer>
      <Layer depth={1.3}><Rain f={f} n={190} opacity={0.4} angle={8} color="#c8c8e8" /></Layer>
    </Stage>
  );
};

/* 6 — Visitors photograph the collection: flashes + phone glow (claims are unverified) */
export const C6: React.FC<P> = ({ f }) => {
  const s = cam(6, [[0, 1.06, 0, 40, 0], [7, 1.18, 40, -140, 0]]);
  const fl = Math.max(flashAt(f, 33), flashAt(f, 129));
  return (
    <Stage cam={cameraAt(s, f)} bg="#140e1e" defs={<Boil id="cb6" f={f} scale={2.2} />}>
      <Layer depth={0.15}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#2a2a48" />
        <SoftGlow cx={540} cy={500} rx={800} ry={600} color="#8a8ac0" opacity={0.4} />
      </Layer>
      <Layer depth={0.45}>
        {[[60, 1500, 81], [380, 1600, 83], [720, 1500, 85], [1040, 1600, 87]].map(([x, h, sd]) => <Willow key={sd} x={x} y={1800} h={h} f={f} seed={sd} />)}
        <DollField f={f} n={36} seed={121} y0={160} y1={1200} scale={0.62} />
        <SoftGlow cx={420} cy={700} rx={700} ry={700} color="#ffffff" opacity={fl * 0.8} />
      </Layer>
      <Layer depth={1.0}>
        <g filter="url(#cb6)">
          <BackPerson x={330} y={1120} s={1.4} shirt="#6a6a86" hat="cap" pack="#3a4a5a" />
          {/* camera raised */}
          <rect x={360} y={1000} width={150} height={96} rx={14} fill="#1a1a22" stroke="#000" strokeWidth={4} />
          <circle cx={436} cy={1048} r={34} fill="#2a2a3a" stroke="#000" strokeWidth={4} />
          <path d="M 270,1220 Q 330,1080 380,1050 M 560,1220 Q 520,1110 500,1060" stroke="#6a6a86" strokeWidth={44} strokeLinecap="round" fill="none" />
          <BackPerson x={790} y={1240} s={1.25} shirt="#3a2a3a" hair="#140e10" pony pack="#7a3a6a" />
          <rect x={840} y={990} width={70} height={130} rx={12} fill="#0a0a12" stroke="#000" strokeWidth={4} />
          <rect x={848} y={1000} width={54} height={108} rx={6} fill="#cfe8ff" opacity={0.6 + 0.2 * pulse(f, 25)} />
          <path d="M 900,1300 Q 900,1170 880,1120" stroke="#c49a7a" strokeWidth={30} strokeLinecap="round" fill="none" />
        </g>
        <SoftGlow cx={875} cy={1050} rx={150} ry={190} color="#cfe8ff" opacity={0.3} />
      </Layer>
      {fl > 0 && <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#fff" opacity={fl * 0.35} />}
    </Stage>
  );
};

/* 7 — The hut: lantern dims after "Julián died"; a doll sits on the stump */
export const C7: React.FC<P> = ({ f }) => {
  const s = cam(7, [[0, 1.3, 100, -300, 0], [3.5, 1.2, 40, -60, 0], [7, 1.1, -40, 120, 0]]);
  const died = wordFrame(7, 3);
  const on = 1 - lerp(f, 0, 0.8, died, died + 70);
  const fl = on * (0.82 + 0.18 * Math.sin(f * 1.3) * Math.sin(f * 0.47));
  return (
    <Stage cam={cameraAt(s, f)} bg="#0e0a10" defs={<Boil id="cb7" f={f} scale={2.2} />}>
      <Layer depth={0.3}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#1a1418" />
        <rect x={-200} y={200} width={1500} height={1500} fill="#5a3a28" />
        {Array.from({ length: 20 }, (_, i) => <line key={i} x1={-200 + i * 80} y1={200} x2={-200 + i * 80} y2={1700} stroke="#2a1a10" strokeWidth={5} />)}
        <rect x={560} y={560} width={420} height={1140} fill="#3a2414" stroke="#140a06" strokeWidth={6} />
        {[0, 1, 2].map((i) => <rect key={i} x={590} y={600 + i * 360} width={360} height={300} fill="none" stroke="#1a0e06" strokeWidth={5} />)}
        <path d="M -300,240 L 1400,120 L 1400,0 L -300,0 Z" fill="#8a6a3a" stroke="#140a06" strokeWidth={5} />
        <DollField f={f} n={12} seed={151} y0={240} y1={900} scale={0.8} />
        <SoftGlow cx={400} cy={640} rx={520} ry={520} color="#ffb850" opacity={0.6 * fl} />
        <Lantern x={400} y={620} s={2.2} on={fl} />
      </Layer>
      <Layer depth={0.95}>
        <rect x={-300} y={1700} width={W + 600} height={600} fill="#2a1e14" />
        <path d="M 60,1500 L 60,1900 L 420,1900 L 420,1500 Z" fill="#5a4030" stroke="#140a06" strokeWidth={5} />
        <ellipse cx={240} cy={1500} rx={180} ry={40} fill="#8a6a4a" stroke="#140a06" strokeWidth={5} />
        <g filter="url(#cb7)"><Doll x={240} y={950} scale={2.2} sway={0} dress="#8a9ac8" hair="#c89a4a" hollow={false} crack={0.8} rope={0} seed={17} /></g>
      </Layer>
      <Layer depth={1.3}>
        {Array.from({ length: 5 }, (_, k) => <SoftGlow key={k} cx={((k * 330 + f * 0.8) % 1700) - 300} cy={1500 + (k % 2) * 120} rx={420} ry={80} color="#cfc0ee" opacity={0.16} />)}
        <Ash f={f} n={8} color="#ffe27a" size={4} seed={23} rise speed={0.3} opacity={0.6 * on} />
      </Layer>
    </Stage>
  );
};

/* 8 — The real twist: back to the island; a hung doll swings in the foreground */
export const C8: React.FC<P> = ({ f }) => {
  const s = cam(8, [[0, 1.04, 0, 40, 0], [3.8, 1.08, 0, 0, 0], [8, 1.5, 280, -560, 0]]);
  const settle = 1 - lerp(f, 0, 1, 200, 240);
  return (
    <Stage cam={cameraAt(s, f)} bg="#120820" defs={<Boil id="cb8" f={f} scale={2.2} />}>
      <IslandWide f={f} lit={0.8} />
      <Layer depth={1.25}>
        <LilyPads y={1640} f={f} seed={17} n={9} />
        <path d="M 600,-300 C 800,40 1000,80 1400,40" stroke="#2a1a10" strokeWidth={40} fill="none" />
        <g filter="url(#cb8)"><Doll x={900} y={70} scale={2.4} sway={sway(f, 10, 9 * settle + 1, 100)} dress="#c86a8a" hair="#8a6a3a" hollow crack={1} rope={70} seed={23} /></g>
      </Layer>
    </Stage>
  );
};

export const CEL_SCENES = [C1, C2, C3, C4, C5, C6, C7, C8];
