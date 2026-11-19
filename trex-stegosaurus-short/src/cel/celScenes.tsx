import React from "react";
import { H, W, lerp, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow, flashAt } from "./celFx";
import { wordFrame, lineFrame } from "../timing";

/* T. rex lived closer to YOU than to Stegosaurus — original cel cartoons + timeline. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const INK = "#1a120a";

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

/** Stegosaurus stenops (side view, facing right). Origin at the feet; ~1000 wide, ~520 tall. */
const Stego: React.FC<{ x: number; y: number; s: number; f: number; walk?: number; flip?: boolean }> = ({ x, y, s, f, walk = 0, flip }) => {
  const id = useId("sg");
  const st = Math.sin(f / 8) * walk;
  const BODY = "M -660,-262 C -560,-276 -420,-330 -230,-372 C -100,-398 20,-392 120,-352 C 210,-316 268,-262 318,-212 C 342,-190 360,-178 378,-170 L 366,-132 C 318,-134 268,-128 222,-114 C 170,-90 120,-70 40,-66 C -80,-60 -200,-80 -300,-118 C -420,-162 -560,-222 -660,-246 Z";
  const back = (x0: number) => -386 + 0.00095 * (x0 + 120) * (x0 + 120) * (x0 > -120 ? 1.5 : 1);
  const plates = [-500, -430, -360, -288, -214, -140, -66, 8, 82, 152, 216];
  const plate = (px: number, far: boolean, i: number) => {
    const h = (far ? 72 : 84) + (far ? 72 : 88) * Math.sin(((px + 540) / 790) * Math.PI);
    const by = back(px) + (far ? 18 : 26);
    const d = `M ${px - h * 0.44},${by} Q ${px - h * 0.56},${by - h * 0.7} ${px + h * 0.02},${by - h * 1.2} Q ${px + h * 0.56},${by - h * 0.66} ${px + h * 0.44},${by} Z`;
    return (
      <g key={`${far ? "f" : "n"}${i}`}>
        <path d={d} fill={far ? `url(#${id}pf)` : `url(#${id}pl)`} stroke="#2a140a" strokeWidth={far ? 4 : 5} strokeLinejoin="round" />
        {!far && [-0.25, 0, 0.25].map((t) => <path key={t} d={`M ${px + h * t * 0.6},${by - 4} Q ${px + h * t},${by - h * 0.5} ${px + h * t * 0.2},${by - h * 0.95}`} stroke="#7a2a12" strokeWidth={2} fill="none" opacity={0.55} />)}
      </g>
    );
  };
  const leg = (lx: number, top: number, w: number, len: number, ph: number, far: boolean) => (
    <g transform={`rotate(${st * ph * 8} ${lx} ${top})`} opacity={far ? 0.85 : 1}>
      <Skin id={far ? `${id}f` : id} d={`M ${lx - w * 0.55},${top} C ${lx - w * 0.7},${top + len * 0.4} ${lx - w * 0.42},${-len * 0.25} ${lx - w * 0.46},-16 C ${lx - w * 0.62},-6 ${lx - w * 0.62},0 ${lx - w * 0.5},0 L ${lx + w * 0.58},0 C ${lx + w * 0.66},0 ${lx + w * 0.64},-8 ${lx + w * 0.46},-16 C ${lx + w * 0.42},${-len * 0.25} ${lx + w * 0.7},${top + len * 0.4} ${lx + w * 0.55},${top} Z`} sw={5} />
      {[-0.3, 0.05, 0.38].map((t) => <path key={t} d={`M ${lx + w * t - 9},0 q 9,-12 18,0`} fill="#5a5040" stroke="#1a120a" strokeWidth={3} />)}
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <SkinDefs id={id} top="#3e4a2c" mid="#6e7a46" belly="#c8bf8e" />
      <SkinDefs id={`${id}f`} top="#2e3820" mid="#525c34" belly="#8e8a62" />
      <defs>
        <linearGradient id={`${id}pl`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#8a6a3a" /><stop offset="0.5" stopColor="#c8582a" /><stop offset="1" stopColor="#e88a4a" /></linearGradient>
        <linearGradient id={`${id}pf`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#5a4428" /><stop offset="1" stopColor="#9a4220" /></linearGradient>
      </defs>
      <ellipse cx={-80} cy={6} rx={560} ry={34} fill={`url(#${id}sh)`} />
      {leg(-150, -250, 128, 250, -1, true)}{leg(200, -170, 84, 170, 1, true)}
      {plates.map((px, i) => plate(px + 34, true, i))}
      <Skin id={id} d={BODY} sw={6} />
      {/* muscle / skin folds */}
      <path d="M -150,-300 C -120,-240 -130,-170 -170,-120 M 160,-260 C 190,-220 196,-170 180,-130 M 270,-210 q 14,14 26,30 M 290,-200 q 12,14 22,28" stroke="#2a2a18" strokeWidth={4} fill="none" opacity={0.45} strokeLinecap="round" />
      {/* throat ossicles */}
      {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={300 + k * 14} cy={-140 + k * 2} r={5} fill="#d8cc9a" stroke="#1a120a" strokeWidth={2} />)}
      {/* thagomizer */}
      {[[-626, -262, -152], [-596, -268, -128], [-632, -250, 150], [-602, -254, 128]].map(([sx, sy, a], i) => {
        const r = (a * Math.PI) / 180, L = 108;
        const tx = sx + Math.cos(r) * L, ty = sy - Math.abs(Math.sin(r)) * L;
        return <g key={i}><path d={`M ${sx - 13},${sy} Q ${(sx + tx) / 2 - 6},${(sy + ty) / 2} ${tx},${ty} Q ${(sx + tx) / 2 + 8},${(sy + ty) / 2} ${sx + 13},${sy} Z`} fill="#d8ccaa" stroke="#1a120a" strokeWidth={4} /><path d={`M ${(sx * 2 + tx) / 3},${(sy * 2 + ty) / 3} L ${tx},${ty}`} stroke="#5a4a30" strokeWidth={4} /></g>;
      })}
      {plates.map((px, i) => plate(px, false, i))}
      {/* head with beak */}
      <Skin id={id} d="M 352,-188 C 384,-212 438,-212 470,-184 C 486,-170 488,-150 474,-142 C 450,-130 420,-126 392,-128 C 372,-130 356,-136 348,-146 Z" sw={5} />
      <path d="M 470,-184 C 488,-170 490,-152 474,-142 L 462,-150 C 472,-158 472,-172 464,-180 Z" fill="#4a3a28" />
      <path d="M 474,-150 C 440,-146 410,-146 384,-150" stroke="#1a120a" strokeWidth={3.5} fill="none" />
      <circle cx={418} cy={-178} r={8} fill="#2a1e0e" /><circle cx={420} cy={-180} r={2.5} fill="#fff" />
      <path d="M 404,-190 q 14,-8 28,0" stroke="#2a2a18" strokeWidth={4} fill="none" />
      {leg(-140, -262, 136, 262, 1, false)}{leg(214, -158, 88, 158, -1, false)}
    </g>
  );
};

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

/** cartoon kid for "YOU" (front view). Origin at the feet. */
const Kid: React.FC<{ x: number; y: number; s: number; f: number; wave?: number }> = ({ x, y, s, f, wave = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -24,0 L -20,-90 M 24,0 L 20,-90" stroke="#2a3a6a" strokeWidth={30} strokeLinecap="round" />
    <rect x={-50} y={-210} width={100} height={130} rx={30} fill="#e84a5a" stroke={INK} strokeWidth={5} />
    <path d="M -50,-180 L -86,-110" stroke="#e8b48a" strokeWidth={24} strokeLinecap="round" />
    <path d={`M 50,-180 L ${86 + wave * 10},${-260 + Math.sin(f / 4) * 20 * wave}`} stroke="#e8b48a" strokeWidth={24} strokeLinecap="round" />
    <circle cx={0} cy={-270} r={60} fill="#e8b48a" stroke={INK} strokeWidth={5} />
    <path d="M -60,-280 C -60,-340 60,-350 60,-280 C 40,-300 -40,-300 -60,-280 Z" fill="#3a2414" />
    <circle cx={-20} cy={-270} r={7} fill={INK} /><circle cx={20} cy={-270} r={7} fill={INK} />
    <path d="M -20,-240 Q 0,-224 20,-240" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
  </g>
);

const Pop: React.FC<{ f: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ f, at, x, y, children }) => {
  const p = clamp((f - at) / 8); if (p <= 0) return null;
  return <g transform={`translate(${x} ${y}) scale(${p < 1 ? 0.4 + 0.8 * Math.sin(p * Math.PI * 0.75) : 1})`}>{children}</g>;
};
const Big: React.FC<{ t: string; size?: number; color?: string; y?: number }> = ({ t, size = 100, color = "#fff", y = 0 }) =>
  <text y={y} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={size} fill={color} stroke={INK} strokeWidth={14} paintOrder="stroke">{t}</text>;

const Land: React.FC<{ f: number; era: "jurassic" | "cretaceous" | "today" | "plain" }> = ({ f, era }) => {
  const sky = era === "jurassic" ? ["#f4c87a", "#e8925a"] : era === "cretaceous" ? ["#9ad0e8", "#f0d8a8"] : ["#8ac8f0", "#e8f4ff"];
  return (
    <>
      <Layer depth={0.1}>
        <defs><linearGradient id={`sky-${era}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient></defs>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill={`url(#sky-${era})`} />
        {era === "jurassic" && <><path d="M 700,1100 L 880,700 L 960,700 L 1140,1100 Z" fill="#6a4a3a" stroke={INK} strokeWidth={5} />
          {Array.from({ length: 5 }, (_, i) => <circle key={i} cx={920 + Math.sin(f / 20 + i) * 30} cy={660 - ((f * 1.4 + i * 60) % 300)} r={40 + i * 8} fill="#8a7a70" opacity={0.5} />)}</>}
      </Layer>
      <Layer depth={0.4}>
        <path d="M -400,1180 C 0,1120 400,1160 1480,1120 L 1480,2400 L -400,2400 Z" fill={era === "jurassic" ? "#8a7a3a" : "#7aa04a"} stroke={INK} strokeWidth={5} />
        {Array.from({ length: 8 }, (_, i) => { const r = rand(i + (era === "jurassic" ? 5 : 15)); const x = r() * 1300 - 100;
          return <g key={i} transform={`translate(${x} 1180)`}>{[-50, -25, 0, 25, 50].map((a) => <path key={a} d={`M 0,0 Q ${a},-90 ${a * 2.4},${-140 - Math.abs(a)}`} stroke="#3a7a3a" strokeWidth={10} fill="none" strokeLinecap="round" transform={`rotate(${Math.sin(f / 30 + i) * 3})`} />)}</g>; })}
      </Layer>
    </>
  );
};

/** vertical timeline from 160 Mya (top) to today (bottom) */
const MYA_Y = (mya: number) => 420 + ((160 - mya) / 160) * 780;
const Timeline: React.FC<{ show: number }> = ({ show }) => (
  <g opacity={show}>
    <line x1={540} y1={MYA_Y(160)} x2={540} y2={MYA_Y(0)} stroke="#fff" strokeWidth={14} strokeLinecap="round" />
    {[150, 100, 66, 0].map((m) => <g key={m}><line x1={510} y1={MYA_Y(m)} x2={570} y2={MYA_Y(m)} stroke="#fff" strokeWidth={6} />
      <text x={490} y={MYA_Y(m) + 14} textAnchor="end" fontFamily="Oswald" fontWeight={700} fontSize={40} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">{m === 0 ? "TODAY" : `${m} MYA`}</text></g>)}
  </g>
);
const Bracket: React.FC<{ y0: number; y1: number; p: number; label: string; color: string; x?: number }> = ({ y0, y1, p, label, color, x = 640 }) => {
  const y = y0 + (y1 - y0) * p;
  return (
    <g>
      <path d={`M ${x},${y0} L ${x + 40},${y0} L ${x + 40},${y} L ${x},${y}`} stroke={color} strokeWidth={10} fill="none" strokeLinejoin="round" />
      {p > 0.9 && <text x={x + 70} y={(y0 + y1) / 2 + 16} textAnchor="start" fontFamily="Oswald" fontWeight={700} fontSize={48} fill={color} stroke={INK} strokeWidth={8} paintOrder="stroke">{label}</text>}
    </g>
  );
};

/* 1 — hook: T. rex, YOU, Stegosaurus */
export const T1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.0, 0, 0, 0], [7.4, 1.06, 0, 0, 0]]);
  const q = lineFrame(1, 1);
  return (
    <Stage cam={cameraAt(s, f)} bg="#9ad0e8" defs={<Boil id="tb1" f={f} scale={1.6} />}>
      <Land f={f} era="plain" />
      <Layer depth={0.85}>
        <g filter="url(#tb1)">
          <Pop f={f} at={wordFrame(1, 6)} x={0} y={0}><TRex x={330} y={1240} s={0.38} f={f} jaw={0.3 * pulse(f, 20)} /></Pop>
          <Pop f={f} at={wordFrame(1, 9)} x={0} y={0}><Kid x={590} y={1250} s={0.95} f={f} wave={1} /></Pop>
          <Pop f={f} at={wordFrame(1, 12)} x={0} y={0}><Stego x={850} y={1240} s={0.34} f={f} flip /></Pop>
        </g>
        <Pop f={f} at={q} x={540} y={520}><Big t="IMPOSSIBLE?" size={130} color="#ffd15a" /></Pop>
      </Layer>
    </Stage>
  );
};

/* 2 — Stegosaurus, ~150 million years ago */
export const T2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.05, -40, 0, 0], [5.7, 1.1, 40, 0, 0]]);
  return (
    <Stage cam={cameraAt(s, f)} bg="#f4c87a" defs={<Boil id="tb2" f={f} scale={1.6} />}>
      <Land f={f} era="jurassic" />
      <Layer depth={0.85}><g filter="url(#tb2)"><Stego x={lerp(f, 440, 600, 0, 170, (x) => x)} y={1250} s={0.72} f={f} walk={1} /></g>
        <Pop f={f} at={wordFrame(2, 4)} x={540} y={470}><Big t="150 MILLION" size={120} /><Big t="YEARS AGO" size={80} y={100} color="#ffd15a" /></Pop>
      </Layer>
    </Stage>
  );
};

/* 3 — T. rex arrives ~68 million years ago */
export const T3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.0, 0, 0, 0], [5.2, 1.08, 0, -40, 0]]);
  const roar = lerp(f, 0, 1, 44, 54) * (1 - lerp(f, 0, 1, 90, 110));
  return (
    <Stage cam={cameraAt(s, f, f < 12 ? 10 : 0)} bg="#9ad0e8" defs={<Boil id="tb3" f={f} scale={1.6} />}>
      <Land f={f} era="cretaceous" />
      <Layer depth={0.85}><g filter="url(#tb3)"><TRex x={lerp(f, 860, 600, 0, 40)} y={1250} s={0.6} f={f} jaw={roar} walk={f < 40 ? 1 : 0} /></g>
        <Pop f={f} at={wordFrame(3, 6)} x={540} y={440}><Big t="68 MILLION" size={120} /><Big t="YEARS AGO" size={80} y={100} color="#ffd15a" /></Pop>
      </Layer>
    </Stage>
  );
};

/* 4 — the 77-million-year gap */
export const T4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.0, 0, 0, 0], [6, 1.02, 0, 0, 0]]);
  const p = lerp(f, 0, 1, 20, 90);
  return (
    <Stage cam={cameraAt(s, f)} bg="#1a2a3a">
      <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#1a2a3a" /></Layer>
      <Layer depth={0.8}>
        <Timeline show={lerp(f, 0, 1, 0, 12)} />
        <Stego x={890} y={MYA_Y(150) + 40} s={0.18} f={f} flip />
        <TRex x={880} y={MYA_Y(68) + 70} s={0.17} f={f} />
        <Bracket y0={MYA_Y(145)} y1={MYA_Y(68)} p={p} label="≈77 MILLION YRS" color="#ffd15a" />
      </Layer>
    </Stage>
  );
};

/* 5 — T. rex goes extinct ~66 million years ago */
export const T5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.0, 0, 0, 0], [6.5, 1.06, 0, 40, 0]]);
  const hit = Math.round(3.0 * 30);
  const ast = lerp(f, 0, 1, 48, hit, (x) => x);
  const fl = flashAt(f, hit);
  return (
    <Stage cam={cameraAt(s, f, f > hit && f < hit + 20 ? 16 : 0)} bg="#9ad0e8" defs={<Boil id="tb5" f={f} scale={1.6} />}>
      <Land f={f} era="cretaceous" />
      <Layer depth={0.5}>{f > 48 && f <= hit && <g><SoftGlow cx={1200 - ast * 700} cy={-100 + ast * 900} rx={120} ry={120} color="#ffb84a" opacity={0.9} /><line x1={1400 - ast * 700} y1={-300 + ast * 900} x2={1200 - ast * 700} y2={-100 + ast * 900} stroke="#ff8a2a" strokeWidth={30} strokeLinecap="round" opacity={0.7} /></g>}</Layer>
      <Layer depth={0.85}><g filter="url(#tb5)"><TRex x={600} y={1250} s={0.6} f={f} look={lerp(f, 0, 1, 30, 50)} jaw={0.4} /></g>
        <Pop f={f} at={wordFrame(5, 9)} x={540} y={440}><Big t="66 MILLION" size={120} /><Big t="YEARS AGO" size={80} y={100} color="#ff6a4a" /></Pop>
      </Layer>
      <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#fff4d0" opacity={fl * 0.85} />
    </Stage>
  );
};

/* 6 — you're closer to T. rex than T. rex was to Stegosaurus */
export const T6: React.FC<P> = ({ f }) => {
  const s = cam(6, [[0, 1.0, 0, 0, 0], [6.4, 1.02, 0, 0, 0]]);
  const a = lerp(f, 0, 1, 10, 50), b = lerp(f, 0, 1, 60, 100);
  return (
    <Stage cam={cameraAt(s, f)} bg="#1a2a3a">
      <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#1a2a3a" /></Layer>
      <Layer depth={0.8}>
        <Timeline show={1} />
        <Stego x={890} y={MYA_Y(150) + 40} s={0.18} f={f} flip />
        <TRex x={880} y={MYA_Y(66) + 70} s={0.17} f={f} />
        <Kid x={900} y={MYA_Y(0) + 60} s={0.42} f={f} wave={1} />
        <Bracket y0={MYA_Y(145)} y1={MYA_Y(68)} p={a} label="77+ MILLION" color="#ffd15a" />
        <Bracket y0={MYA_Y(66)} y1={MYA_Y(0)} p={b} label="66 MILLION" color="#7ae8ff" />
        <Pop f={f} at={120} x={540} y={350}><Big t="YOU'RE CLOSER!" size={100} color="#7ae8ff" /></Pop>
      </Layer>
    </Stage>
  );
};

/* 7 — not all living together … WAIT RG… WHAT?! FACTS! */
export const T7: React.FC<P> = ({ f }) => {
  const s = cam(7, [[0, 1.0, 0, 0, 0], [6.2, 1.06, 0, 0, 0]]);
  const react = lineFrame(7, 1);
  const frozen = f >= react;
  const t = frozen ? react : f;
  return (
    <Stage cam={cameraAt(s, f, frozen && f < react + 6 ? 14 : 0)} bg="#9ad0e8" defs={<Boil id="tb7" f={f} scale={1.6} />}>
      <Land f={t} era="plain" />
      <Layer depth={0.85}>
        <g filter="url(#tb7)"><Stego x={270} y={1250} s={0.3} f={t} /><TRex x={820} y={1250} s={0.34} f={t} /></g>
        <Pop f={f} at={8} x={540} y={1000}><Big t="≠" size={260} color="#ff6a4a" /></Pop>
        <Pop f={f} at={20} x={540} y={470}><Big t="NOT TOGETHER!" size={110} /></Pop>
        {frozen && <Pop f={f} at={react + 30} x={540} y={760}><g transform="rotate(-10)"><rect x={-260} y={-90} width={520} height={150} rx={16} fill="none" stroke="#ff3a4a" strokeWidth={14} /><Big t="FACTS!" size={130} color="#ff3a4a" y={30} /></g></Pop>}
      </Layer>
      {frozen && <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#ff6ad5" opacity={Math.max(0, 0.25 - (f - react) * 0.03)} />}
    </Stage>
  );
};

export const CEL_SCENES = [T1, T2, T3, T4, T5, T6, T7];
void H;
