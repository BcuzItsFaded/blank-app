import React from "react";
import { H, W, lerp, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow, flashAt } from "./celFx";
import { wordFrame, lineFrame } from "../timing";

/* T. rex lived closer to YOU than to Stegosaurus — original cel cartoons + timeline. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const INK = "#1a120a";

/** Stegosaurus (side view, facing right). Origin at the feet. */
const Stego: React.FC<{ x: number; y: number; s: number; f: number; walk?: number; flip?: boolean }> = ({ x, y, s, f, walk = 0, flip }) => {
  const st = Math.sin(f / 6) * walk;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      {[[-120, 1], [-40, -1], [70, 1], [140, -1]].map(([lx, ph], i) => <rect key={i} x={lx - 22} y={-120} width={44} height={120} rx={18} fill={i % 2 ? "#5a7a3a" : "#6a8a42"} stroke={INK} strokeWidth={5} transform={`rotate(${st * ph * 10} ${lx} -110)`} />)}
      {/* plates */}
      {[-150, -95, -40, 15, 70, 120].map((px, i) => (
        <path key={i} d={`M ${px - 32},${-230 - Math.sin((i / 5) * Math.PI) * 60} L ${px},${-330 - Math.sin((i / 5) * Math.PI) * 90} L ${px + 32},${-230 - Math.sin((i / 5) * Math.PI) * 60} Z`} fill={i % 2 ? "#e8823a" : "#d8622a"} stroke={INK} strokeWidth={5} />
      ))}
      <path d="M -260,-140 C -240,-300 120,-320 200,-170 C 230,-120 220,-100 200,-90 L -200,-90 C -260,-90 -280,-110 -260,-140 Z" fill="#7a9a4a" stroke={INK} strokeWidth={6} />
      <path d="M -250,-130 C -320,-130 -400,-150 -440,-200" stroke="#7a9a4a" strokeWidth={56} strokeLinecap="round" fill="none" />
      <path d="M -250,-130 C -320,-130 -400,-150 -440,-200" stroke={INK} strokeWidth={62} strokeLinecap="round" fill="none" opacity={0.0} />
      {[[-400, -190, -40], [-430, -205, -60], [-380, -175, 30], [-410, -185, 50]].map(([sx, sy, a], i) => <path key={i} d={`M ${sx},${sy} l ${Math.cos((a * Math.PI) / 180) * 70},${-Math.sin(((a + 90) * Math.PI) / 180) * 70 - 10}`} stroke="#e8d8b0" strokeWidth={14} strokeLinecap="round" />)}
      <path d="M 190,-150 C 250,-140 300,-110 320,-80 C 300,-60 250,-70 210,-90 Z" fill="#7a9a4a" stroke={INK} strokeWidth={5} />
      <circle cx={292} cy={-96} r={6} fill={INK} />
    </g>
  );
};

/** T. rex (side view, facing left). Origin at the feet. jaw 0..1 */
const TRex: React.FC<{ x: number; y: number; s: number; f: number; jaw?: number; walk?: number; look?: number }> = ({ x, y, s, f, jaw = 0, walk = 0, look = 0 }) => {
  const st = Math.sin(f / 7) * walk;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 60,-300 C 200,-300 340,-320 460,-380" stroke="#a8502a" strokeWidth={90} strokeLinecap="round" fill="none" />
      <rect x={20} y={-260} width={70} height={260} rx={30} fill="#8a3a20" stroke={INK} strokeWidth={6} transform={`rotate(${-st * 12} 55 -250)`} />
      <rect x={110} y={-260} width={70} height={260} rx={30} fill="#9a4224" stroke={INK} strokeWidth={6} transform={`rotate(${st * 12} 145 -250)`} />
      <path d="M -60,-420 C -40,-520 160,-500 220,-380 C 250,-300 200,-230 120,-220 C 40,-215 -40,-260 -60,-330 Z" fill="#b8582e" stroke={INK} strokeWidth={6} />
      <path d="M -10,-340 l -40,30 M -20,-320 l -30,26" stroke="#b8582e" strokeWidth={16} strokeLinecap="round" />
      {/* head */}
      <g transform={`rotate(${look * -20} -40 -480)`}>
        <path d="M -40,-430 C -60,-560 -160,-600 -300,-560 C -330,-540 -330,-500 -300,-490 L -60,-470 Z" fill="#b8582e" stroke={INK} strokeWidth={6} />
        <g transform={`rotate(${jaw * 22} -60 -470)`}>
          <path d="M -60,-470 L -300,-490 C -300,-460 -280,-440 -240,-440 L -60,-430 Z" fill="#9a4224" stroke={INK} strokeWidth={6} />
          {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M ${-270 + i * 36},-488 l 8,-16 l 8,16 Z`} fill="#fff6e0" />)}
        </g>
        {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M ${-280 + i * 36},-490 l 8,16 l 8,-16 Z`} fill="#fff6e0" />)}
        <circle cx={-170} cy={-536} r={14} fill="#fff6e0" stroke={INK} strokeWidth={4} /><circle cx={-174} cy={-536} r={7} fill={INK} />
        <path d="M -200,-560 L -140,-552" stroke={INK} strokeWidth={8} strokeLinecap="round" />
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
          <Pop f={f} at={wordFrame(1, 6)} x={0} y={0}><TRex x={330} y={1240} s={0.62} f={f} jaw={0.3 * pulse(f, 20)} /></Pop>
          <Pop f={f} at={wordFrame(1, 9)} x={0} y={0}><Kid x={560} y={1260} s={1.1} f={f} wave={1} /></Pop>
          <Pop f={f} at={wordFrame(1, 12)} x={0} y={0}><Stego x={860} y={1240} s={0.5} f={f} flip /></Pop>
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
      <Layer depth={0.85}><g filter="url(#tb2)"><Stego x={lerp(f, 380, 640, 0, 170, (x) => x)} y={1330} s={1.0} f={f} walk={1} /></g>
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
      <Layer depth={0.85}><g filter="url(#tb3)"><TRex x={lerp(f, 900, 640, 0, 40)} y={1400} s={1.05} f={f} jaw={roar} walk={f < 40 ? 1 : 0} /></g>
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
        <Stego x={860} y={MYA_Y(150) - 10} s={0.22} f={f} flip />
        <TRex x={930} y={MYA_Y(68) + 110} s={0.24} f={f} />
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
      <Layer depth={0.85}><g filter="url(#tb5)"><TRex x={640} y={1400} s={1.0} f={f} look={lerp(f, 0, 1, 30, 50)} jaw={0.4} /></g>
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
        <Stego x={860} y={MYA_Y(150) - 10} s={0.22} f={f} flip />
        <TRex x={930} y={MYA_Y(66) + 110} s={0.24} f={f} />
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
        <g filter="url(#tb7)"><Stego x={300} y={1260} s={0.5} f={t} /><TRex x={800} y={1260} s={0.6} f={t} /></g>
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
