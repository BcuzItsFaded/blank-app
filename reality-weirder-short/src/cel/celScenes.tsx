import React from "react";
import { H, W, lerp, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow } from "./celFx";
import { wordFrame } from "../timing";

/* Reality is weirder than science fiction — original cel illustrations. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const INK = "#1a120a", CYAN = "#7ae8ff", GOLD = "#ffd15a";

const Pop: React.FC<{ f: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ f, at, x, y, children }) => {
  const p = clamp((f - at) / 8); if (p <= 0) return null;
  return <g transform={`translate(${x} ${y}) scale(${p < 1 ? 0.4 + 0.8 * Math.sin(p * Math.PI * 0.75) : 1})`}>{children}</g>;
};
const Big: React.FC<{ t: string; size?: number; color?: string; y?: number }> = ({ t, size = 100, color = "#fff", y = 0 }) =>
  <text y={y} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={size} fill={color} stroke={INK} strokeWidth={14} paintOrder="stroke">{t}</text>;
const Stars: React.FC<{ f: number; seed?: number }> = ({ f, seed = 1 }) => {
  const r = rand(seed);
  const st = Array.from({ length: 150 }, () => ({ x: r() * 1500 - 210, y: r() * 2400 - 240, s: 1 + r() * 3, ph: r() * 40 }));
  return <g>{st.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r={q.s} fill="#fff" opacity={0.4 + 0.6 * pulse(f, 30 + (i % 7) * 6, q.ph)} />)}</g>;
};
const Space: React.FC<{ f: number; seed: number }> = ({ f, seed }) => (
  <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#04060e" /><SoftGlow cx={700} cy={500} rx={700} ry={500} color="#1a3a6a" opacity={0.35} /><Stars f={f} seed={seed} /></Layer>
);
const Clock: React.FC<{ x: number; y: number; r: number; a: number; color?: string }> = ({ x, y, r, a, color = "#fffaf0" }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r + 12} fill="#c8ccd4" stroke={INK} strokeWidth={5} /><circle r={r} fill={color} stroke={INK} strokeWidth={4} />
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1={0} y1={-r + 6} x2={0} y2={-r + 18} stroke={INK} strokeWidth={4} transform={`rotate(${i * 30})`} />)}
    <line x1={0} y1={0} x2={0} y2={-r + 20} stroke="#c8202e" strokeWidth={6} strokeLinecap="round" transform={`rotate(${a})`} />
    <circle r={9} fill={INK} />
  </g>
);
const Earth: React.FC<{ x: number; y: number; r: number; f: number }> = ({ x, y, r, f }) => (
  <g transform={`translate(${x} ${y})`}>
    <defs><clipPath id="earthC"><circle r={r} /></clipPath><radialGradient id="earthG" cx="35%" cy="35%"><stop offset="0" stopColor="#6ab8f0" /><stop offset="1" stopColor="#1a4a8a" /></radialGradient></defs>
    <SoftGlow cx={0} cy={0} rx={r * 1.25} ry={r * 1.25} color="#5ab0ff" opacity={0.4} />
    <circle r={r} fill="url(#earthG)" />
    <g clipPath="url(#earthC)"><g transform={`translate(${((f * 1.2) % (r * 4)) - r * 2} 0)`}>
      {[-1, 0, 1].map((k) => <g key={k} transform={`translate(${k * r * 2} 0)`}>
        <path d={`M ${-r * 0.6},${-r * 0.3} q ${r * 0.3},${-r * 0.4} ${r * 0.6},${-r * 0.1} q ${r * 0.1},${r * 0.4} ${-r * 0.2},${r * 0.6} q ${-r * 0.4},${r * 0.1} ${-r * 0.4},${-r * 0.5} Z`} fill="#4a9a4a" />
        <path d={`M ${r * 0.2},${r * 0.1} q ${r * 0.3},${-r * 0.2} ${r * 0.5},${r * 0.1} q ${-r * 0.1},${r * 0.5} ${-r * 0.4},${r * 0.4} Z`} fill="#5aaa52" /></g>)}
    </g></g>
    <circle r={r} fill="none" stroke={INK} strokeWidth={5} />
  </g>
);
const Satellite: React.FC<{ x: number; y: number; s: number; rot?: number }> = ({ x, y, s, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
    <rect x={-160} y={-36} width={110} height={72} fill="#2a4a8a" stroke={INK} strokeWidth={4} />
    <rect x={50} y={-36} width={110} height={72} fill="#2a4a8a" stroke={INK} strokeWidth={4} />
    {[-130, -100, -75, 75, 100, 130].map((lx) => <line key={lx} x1={lx} y1={-36} x2={lx} y2={36} stroke="#7ab0e8" strokeWidth={2} />)}
    <rect x={-50} y={-50} width={100} height={100} rx={10} fill="#d8c070" stroke={INK} strokeWidth={5} />
    <path d="M 0,50 L 0,80 M -20,92 Q 0,70 20,92" stroke={INK} strokeWidth={5} fill="none" />
  </g>
);
const Pigeon: React.FC<{ x: number; y: number; s: number; f: number; peck?: number; flip?: boolean }> = ({ x, y, s, f, peck = 0, flip }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    <path d="M -10,-20 L -20,0 M 20,-20 L 10,0" stroke="#d8705a" strokeWidth={8} strokeLinecap="round" />
    <path d="M 120,-110 C 160,-120 200,-100 210,-80 C 170,-80 140,-70 120,-60 Z" fill="#4a5060" stroke={INK} strokeWidth={4} />
    <ellipse cx={30} cy={-80} rx={110} ry={62} fill="#8a92a8" stroke={INK} strokeWidth={5} />
    <path d="M -20,-110 C 40,-130 110,-110 140,-80 C 90,-90 30,-80 -10,-70 Z" fill="#6a7288" stroke={INK} strokeWidth={4} />
    <path d="M 100,-90 l 50,-6 M 96,-74 l 54,-2" stroke="#3a4050" strokeWidth={6} strokeLinecap="round" />
    <g transform={`rotate(${peck * 30} -40 -110)`}>
      <path d="M -40,-110 C -60,-150 -40,-190 -70,-200" stroke="#5aa898" strokeWidth={30} strokeLinecap="round" fill="none" />
      <circle cx={-80} cy={-206} r={36} fill="#8a92a8" stroke={INK} strokeWidth={5} />
      <circle cx={-92} cy={-214} r={8} fill="#ff8a3a" stroke={INK} strokeWidth={3} /><circle cx={-93} cy={-214} r={3} fill={INK} />
      <path d="M -112,-206 L -140,-198 L -112,-192 Z" fill="#3a3a3a" />
      {peck > 0.5 && <rect x={-170} y={-206} width={50} height={12} rx={4} fill="#f0c040" stroke={INK} strokeWidth={2} transform="rotate(-20 -145 -200)" />}
    </g>
  </g>
);
const Fries: React.FC<{ x: number; y: number; s: number; taken?: number }> = ({ x, y, s, taken = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {Array.from({ length: 9 }, (_, i) => i === 4 && taken > 0.5 ? null : <rect key={i} x={-80 + i * 18} y={-150 - (i % 3) * 20} width={16} height={120} rx={4} fill="#f0c040" stroke={INK} strokeWidth={3} transform={`rotate(${(i - 4) * 4} ${-72 + i * 18} -30)`} />)}
    <path d="M -100,-60 L 100,-60 L 80,60 L -80,60 Z" fill="#d8202e" stroke={INK} strokeWidth={6} />
    <path d="M -40,-10 q 40,30 80,0" stroke={GOLD} strokeWidth={10} fill="none" strokeLinecap="round" />
  </g>
);

let dinoSeq = 0;
const useId = (k: string) => React.useMemo(() => `${k}${dinoSeq++}`, [k]);

/** scaly skin + countershading: body gradient (dark back → pale belly) and a scale pattern */
const SkinDefs: React.FC<{ id: string; top: string; mid: string; belly: string; scale?: number }> = ({ id, top, mid, belly, scale = 1 }) => (
  <defs>
    <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={top} /><stop offset="0.55" stopColor={mid} /><stop offset="1" stopColor={belly} />
    </linearGradient>
    <pattern id={`${id}p`} width={22 * scale} height={18 * scale} patternUnits="userSpaceOnUse">
      <path d={`M 0,${9 * scale} q ${5.5 * scale},${-8 * scale} ${11 * scale},0 q ${5.5 * scale},${-8 * scale} ${11 * scale},0 M ${-5.5 * scale},${18 * scale} q ${5.5 * scale},${-8 * scale} ${11 * scale},0 q ${5.5 * scale},${-8 * scale} ${11 * scale},0 q ${5.5 * scale},${-8 * scale} ${11 * scale},0`} stroke="#000" strokeWidth={1.6} fill="none" opacity={0.28} />
    </pattern>
    <radialGradient id={`${id}sh`}><stop offset="0" stopColor="#000" stopOpacity={0.45} /><stop offset="1" stopColor="#000" stopOpacity={0} /></radialGradient>
  </defs>
);
/** fill a shape with gradient, then scales, then a crisp outline */
const Skin: React.FC<{ d: string; id: string; stroke?: string; sw?: number }> = ({ d, id, stroke = "#1a120a", sw = 5 }) => (
  <g><path d={d} fill={`url(#${id}g)`} /><path d={d} fill={`url(#${id}p)`} /><path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /></g>
);

/** Tyrannosaurus rex (side view, facing left), horizontal posture. Origin at the feet; ~1430 long, ~560 tall. jaw 0..1 */
const TRex: React.FC<{ x: number; y: number; s: number; f: number; jaw?: number; walk?: number; look?: number }> = ({ x, y, s, f, jaw = 0, walk = 0, look = 0 }) => {
  const id = useId("tr");
  const st = Math.sin(f / 8) * walk;
  const BODY = "M -300,-470 C -230,-500 -150,-506 -60,-500 C 40,-496 120,-492 180,-480 C 360,-452 600,-402 820,-372 C 600,-352 380,-350 220,-345 C 160,-330 120,-300 80,-285 C 0,-262 -110,-262 -190,-300 C -240,-330 -280,-380 -300,-410 C -320,-430 -320,-455 -300,-470 Z";
  const leg = (ph: number, far: boolean) => {
    const k = far ? `${id}f` : id;
    return (
      <g transform={`rotate(${st * ph * 13} 80 -400)`} opacity={far ? 0.9 : 1}>
        <Skin id={k} d="M 10,-448 C 150,-470 236,-388 214,-292 C 200,-232 146,-202 96,-206 C 34,-214 -8,-282 0,-356 C 2,-404 -6,-436 10,-448 Z" sw={6} />
        <path d="M 40,-420 C 110,-400 160,-350 180,-290 M 30,-330 C 70,-300 110,-270 150,-262" stroke="#1a0e06" strokeWidth={4} fill="none" opacity={0.4} />
        <Skin id={k} d="M 104,-228 C 124,-180 116,-132 96,-90 L 152,-80 C 168,-130 178,-190 172,-244 Z" sw={6} />
        <Skin id={k} d="M 98,-94 L 62,-20 L -40,-10 C -64,-6 -62,10 -40,10 L 124,10 C 146,8 154,-4 152,-22 L 152,-84 Z" sw={6} />
        {[-44, -6, 32].map((tx) => <path key={tx} d={`M ${tx},8 q -18,2 -26,12 q 14,-2 26,-4 Z`} fill="#2a2016" />)}
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <SkinDefs id={id} top="#2e2418" mid="#5e4a30" belly="#c8aa80" />
      <SkinDefs id={`${id}f`} top="#221a10" mid="#463622" belly="#8e7656" />
      <ellipse cx={120} cy={8} rx={520} ry={34} fill={`url(#${id}sh)`} />
      {leg(-1, true)}
      <Skin id={id} d={BODY} sw={7} />
      {/* dorsal banding + muscle lines */}
      {[-180, -80, 30, 150, 280, 420, 560].map((sx, i) => <path key={i} d={`M ${sx},${-498 + i * 12} q 18,32 4,70`} stroke="#1a120a" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.28} />)}
      <path d="M -250,-440 C -210,-400 -200,-360 -210,-320 M -120,-470 C -80,-420 -70,-360 -90,-300" stroke="#1a120a" strokeWidth={4} fill="none" opacity={0.35} />
      {/* small two-fingered forelimb */}
      <Skin id={id} d="M -208,-332 C -238,-312 -260,-292 -266,-272 L -256,-266 L -250,-280 L -244,-264 L -234,-268 C -230,-294 -208,-310 -194,-318 Z" sw={4} />
      {leg(1, false)}
      {/* skull */}
      <g transform={`rotate(${look * -16} -300 -440)`}>
        <g transform={`rotate(${-jaw * 18} -300 -418)`}>
          <Skin id={id} d="M -300,-418 L -608,-440 C -606,-414 -584,-398 -540,-394 C -450,-390 -360,-394 -300,-404 Z" sw={5} />
          {jaw > 0.15 && Array.from({ length: 8 }, (_, i) => <path key={i} d={`M ${-590 + i * 34},-436 l 7,-14 l 7,14 Z`} fill="#efe4c4" stroke="#1a120a" strokeWidth={1.5} />)}
        </g>
        {jaw > 0.15 && <path d="M -320,-418 L -590,-436 L -570,-412 L -330,-404 Z" fill="#5a1a14" />}
        <Skin id={id} d="M -290,-480 C -320,-522 -420,-538 -520,-522 C -580,-512 -612,-490 -614,-466 L -612,-440 C -560,-436 -420,-430 -300,-418 C -276,-426 -270,-456 -290,-480 Z" sw={6} />
        {/* lips over the teeth (only tips show), fenestra, nostril, brow boss, eye */}
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M ${-600 + i * 32},-442 l 6,${jaw > 0.15 ? 16 : 7} l 6,${jaw > 0.15 ? -16 : -7} Z`} fill="#efe4c4" stroke="#1a120a" strokeWidth={1.5} />)}
        <path d="M -612,-444 C -520,-438 -420,-432 -302,-420" stroke="#3a2416" strokeWidth={5} fill="none" />
        <ellipse cx={-472} cy={-482} rx={44} ry={18} fill="#1e160c" opacity={0.55} />
        <ellipse cx={-588} cy={-490} rx={10} ry={6} fill="#0e0a06" />
        <path d="M -404,-512 C -380,-526 -346,-524 -330,-506" stroke="#1a120a" strokeWidth={10} strokeLinecap="round" fill="none" />
        <circle cx={-370} cy={-494} r={11} fill="#d8a83a" stroke="#1a120a" strokeWidth={3} /><ellipse cx={-370} cy={-494} rx={3} ry={9} fill="#0e0a06" />
        <path d="M -330,-470 C -320,-450 -320,-436 -330,-424 M -350,-462 q -6,18 -4,34" stroke="#1a120a" strokeWidth={3} fill="none" opacity={0.5} />
        {[-560, -520, -480, -440].map((sx) => <circle key={sx} cx={sx} cy={-506 + (sx + 560) * 0.04} r={3.5} fill="#1a120a" opacity={0.4} />)}
      </g>
    </g>
  );
};


/* 1 — reality is weirder than sci-fi */
export const R1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.0, 0, 0, 0], [3.8, 1.08, 0, 0, 0]]);
  return (
    <Stage cam={cameraAt(s, f)} bg="#04060e">
      <Space f={f} seed={1} />
      <Layer depth={0.6}>
        {/* retro UFO */}
        <g transform={`translate(${790 + Math.sin(f / 14) * 40} ${820 + Math.sin(f / 9) * 20})`}>
          <SoftGlow cx={0} cy={60} rx={120} ry={220} color="#9aff8a" opacity={0.25} />
          <ellipse cx={0} cy={0} rx={160} ry={46} fill="#9aa4b8" stroke={INK} strokeWidth={5} />
          <path d="M -70,-14 Q 0,-110 70,-14 Z" fill="#9ad8ff" stroke={INK} strokeWidth={5} opacity={0.9} />
          {[-110, -55, 0, 55, 110].map((lx, i) => <circle key={lx} cx={lx} cy={10} r={10} fill={i % 2 ? GOLD : "#ff6a6a"} opacity={0.6 + 0.4 * pulse(f, 8, i * 3)} />)}
        </g>
        <Earth x={300} y={1000} r={200} f={f} />
      </Layer>
      <Layer depth={0.9}>
        <Pop f={f} at={wordFrame(1, 2)} x={540} y={470}><Big t="REALITY" size={140} color={CYAN} /><Big t="> SCI-FI" size={110} y={120} color={GOLD} /></Pop>
      </Layer>
    </Stage>
  );
};

/* 2 — time runs at different speeds: GPS clocks need relativity corrections */
export const R2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.0, 0, 0, 0], [9, 1.05, 0, -20, 0]]);
  const grav = wordFrame(2, 9), gps = wordFrame(2, 12);
  const orbitA = f / 50;
  return (
    <Stage cam={cameraAt(s, f)} bg="#04060e">
      <Space f={f} seed={2} />
      <Layer depth={0.7}>
        <Earth x={540} y={1120} r={230} f={f} />
        <ellipse cx={540} cy={1120} rx={440} ry={180} fill="none" stroke={CYAN} strokeWidth={3} strokeDasharray="14 12" opacity={0.6} />
        <Satellite x={540 + Math.cos(orbitA) * 440} y={1120 + Math.sin(orbitA) * 180} s={0.55} rot={Math.sin(orbitA) * 10} />
        {/* clocks: ground vs orbit (orbit ticks faster) */}
        <Clock x={260} y={520} r={110} a={f * 4} />
        <text x={260} y={690} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={44} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">GROUND</text>
        <Clock x={820} y={520} r={110} a={f * 4 * (1 + clamp((f - grav) / 30) * 0.6)} color="#e8f6ff" />
        <text x={820} y={690} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={44} fill={CYAN} stroke={INK} strokeWidth={8} paintOrder="stroke">ORBIT</text>
        <Pop f={f} at={grav} x={540} y={830}><Big t="+38 µs / DAY" size={70} color={GOLD} /></Pop>
        <Pop f={f} at={gps} x={540} y={360}>
          <g><path d="M -280,40 C -180,-40 -60,60 40,0 C 120,-50 200,20 280,-20" stroke={GOLD} strokeWidth={10} fill="none" strokeDasharray="20 12" strokeDashoffset={-f * 3} />
            <path d="M 280,-80 C 250,-80 240,-50 280,10 C 320,-50 310,-80 280,-80 Z" fill="#e8443a" stroke={INK} strokeWidth={4} /><circle cx={280} cy={-58} r={10} fill="#fff" /></g>
          <Big t="GPS CORRECTED" size={60} y={110} color={CYAN} />
        </Pop>
      </Layer>
    </Stage>
  );
};

/* 3 — on Venus, a year ends before one full spin */
export const R3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.0, 0, 0, 0], [4.3, 1.04, 0, 0, 0]]);
  const p = lerp(f, 0, 1, 10, 115, (x) => x);          // orbit progress (one Venus year)
  const spin = p * (224.7 / 243.0) * 360;               // rotation in that time: < 1 turn (retrograde)
  const ox = 540 + Math.cos(p * Math.PI * 2 - Math.PI / 2) * 300, oy = 960 + Math.sin(p * Math.PI * 2 - Math.PI / 2) * 300;
  return (
    <Stage cam={cameraAt(s, f)} bg="#04060e">
      <Space f={f} seed={3} />
      <Layer depth={0.7}>
        <SoftGlow cx={540} cy={960} rx={200} ry={200} color="#ffd27a" opacity={0.8} />
        <circle cx={540} cy={960} r={90} fill="#ffcf5a" stroke="#c88a1a" strokeWidth={6} />
        <circle cx={540} cy={960} r={300} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="10 10" opacity={0.5} />
        <path d={`M 540,660 A 300,300 0 ${p > 0.5 ? 1 : 0},1 ${ox},${oy}`} stroke={GOLD} strokeWidth={8} fill="none" />
        <g transform={`translate(${ox} ${oy}) rotate(${-spin})`}>
          <circle r={70} fill="#e8c88a" stroke="#8a6a3a" strokeWidth={5} />
          <path d="M -60,-20 Q 0,-40 60,-14 M -66,14 Q 0,-4 66,20" stroke="#c8a060" strokeWidth={8} fill="none" />
          <line x1={0} y1={0} x2={0} y2={-70} stroke="#c8202e" strokeWidth={8} strokeLinecap="round" />
        </g>
        <text x={540} y={1300 - 680} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={50} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke" opacity={p > 0.05 ? 1 : 0}>{`YEAR ${Math.round(p * 225)} / 225 days · SPIN ${Math.round(spin)}°`}</text>
        <Pop f={f} at={wordFrame(3, 5)} x={540} y={430}><Big t="YEAR < DAY" size={130} color={GOLD} /><Big t="ON VENUS" size={70} y={90} color={CYAN} /></Pop>
      </Layer>
    </Stage>
  );
};

/* 4 — birds are living dinosaurs: the pigeon stealing your fries */
export const R4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.0, 0, 0, 0], [10.3, 1.06, 0, 0, 0]]);
  const birds = wordFrame(4, 6), pigeon = wordFrame(4, 13);
  const morph = lerp(f, 0, 1, birds - 6, birds + 18);
  const peck = Math.max(0, Math.sin((f - pigeon) / 5)) * (f > pigeon ? 1 : 0);
  return (
    <Stage cam={cameraAt(s, f)} bg="#9ad0f0" defs={<Boil id="rb4" f={f} scale={1.4} />}>
      <Layer depth={0.1}>
        <defs><linearGradient id="skyR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ac0f0" /><stop offset="1" stopColor="#e8f4ff" /></linearGradient></defs>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="url(#skyR)" />
        {[-120, 200, 520, 860].map((bx, i) => <rect key={bx} x={bx} y={500 + (i % 2) * 120} width={260} height={800} fill={["#b8c4d0", "#a8b4c4", "#c4ccd8", "#9aa8b8"][i]} stroke={INK} strokeWidth={4} />)}
      </Layer>
      <Layer depth={0.5}><rect x={-400} y={1180} width={W + 800} height={900} fill="#8a8a8a" /><rect x={-400} y={1180} width={W + 800} height={20} fill="#6a6a6a" /></Layer>
      <Layer depth={0.9}>
        <g opacity={1 - morph}><TRex x={640} y={1180} s={0.55} f={f} jaw={0.3 * pulse(f, 16)} /></g>
        <g opacity={morph} filter="url(#rb4)">
          <Fries x={260} y={1220} s={1.1} taken={peck > 0.5 || f > pigeon + 20 ? 1 : 0} />
          <Pigeon x={560} y={1200} s={1.5} f={f} peck={peck} />
        </g>
        <Pop f={f} at={birds} x={540} y={430}><Big t="BIRDS =" size={120} color={GOLD} /><Big t="LIVING DINOSAURS" size={84} y={100} /></Pop>
        <Pop f={f} at={pigeon + 24} x={540} y={760}><Big t="DINOSAUR ENCOUNTER!" size={64} color="#ff6a4a" /></Pop>
      </Layer>
    </Stage>
  );
};

/* 5 — "Sounds fake. That's just reality." */
export const R5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.0, 0, 0, 0], [2.6, 1.08, 0, 0, 0]]);
  return (
    <Stage cam={cameraAt(s, f, f < 6 ? 10 : 0)} bg="#04060e">
      <Space f={f} seed={5} />
      <Layer depth={0.9}>
        <Pop f={f} at={2} x={540} y={600}><Big t="SOUNDS FAKE." size={120} color="#ff6a4a" /></Pop>
        <Pop f={f} at={wordFrame(5, 2)} x={540} y={800}><Big t="IT'S REALITY." size={140} color={CYAN} /></Pop>
      </Layer>
    </Stage>
  );
};

export const CEL_SCENES = [R1, R2, R3, R4, R5];
void H;
