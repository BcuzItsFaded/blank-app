import React from "react";
import { H, W, lerp, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow, flashAt } from "./celFx";
import { wordFrame, lineFrame } from "../timing";

/* T. rex lived closer to YOU than to Stegosaurus — original cel cartoons + timeline. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const INK = "#1a120a";

/** back-height of the Stegosaurus at x (highest over the hips) */
const stegoBack = (x: number) => -350 + 0.0011 * (x + 60) * (x + 60) * (x > -60 ? 1.35 : 1);

/** Stegosaurus (side view, facing right). Origin at the feet; ~900 wide, ~470 tall. */
const Stego: React.FC<{ x: number; y: number; s: number; f: number; walk?: number; flip?: boolean }> = ({ x, y, s, f, walk = 0, flip }) => {
  const st = Math.sin(f / 7) * walk;
  const BODY = "#5f8f5a", BODY_D = "#3f6a42", BELLY = "#c8c48a", PLATE = "#e0703a", PLATE_D = "#a8431e";
  const leg = (lx: number, top: number, w: number, ph: number, far: boolean) => (
    <g transform={`rotate(${st * ph * 9} ${lx} ${top})`}>
      <path d={`M ${lx - w / 2},${top} C ${lx - w / 2 - 6},${top + 80} ${lx - w * 0.42},-60 ${lx - w * 0.45},-14 L ${lx - w * 0.6},0 L ${lx + w * 0.62},0 L ${lx + w * 0.45},-14 C ${lx + w * 0.42},-60 ${lx + w / 2 + 6},${top + 80} ${lx + w / 2},${top} Z`}
        fill={far ? BODY_D : BODY} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {[-0.35, 0, 0.35].map((t) => <path key={t} d={`M ${lx + w * t - 8},0 q 8,-14 16,0`} stroke={INK} strokeWidth={4} fill="#e8e0c8" />)}
    </g>
  );
  const plates = [-430, -360, -290, -215, -140, -65, 10, 85, 155, 220];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      {/* far legs */}
      {leg(-120, -200, 96, -1, true)}{leg(190, -160, 66, 1, true)}
      {/* far row of plates (offset, darker) */}
      {plates.map((px, i) => { const h = 70 + 70 * Math.sin(((px + 470) / 720) * Math.PI); const by = stegoBack(px + 30) + 14;
        return <path key={`b${i}`} d={`M ${px + 30 - h * 0.42},${by} Q ${px + 30 - h * 0.5},${by - h * 0.7} ${px + 30 + h * 0.05},${by - h * 1.15} Q ${px + 30 + h * 0.5},${by - h * 0.6} ${px + 30 + h * 0.42},${by} Z`} fill={PLATE_D} stroke={INK} strokeWidth={5} />; })}
      {/* body + tail + neck */}
      <path d="M -640,-250 C -540,-265 -380,-330 -150,-350 C 40,-362 190,-300 280,-215 C 312,-188 336,-170 356,-158 L 342,-122 C 270,-128 210,-124 150,-104 C 20,-72 -190,-88 -330,-128 C -450,-160 -560,-210 -640,-235 Z" fill={BODY} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M -330,-130 C -190,-92 20,-76 150,-106 C 200,-118 250,-126 300,-128" stroke={BELLY} strokeWidth={22} fill="none" strokeLinecap="round" opacity={0.9} />
      {[-380, -250, -120, 10, 130].map((sx, i) => <path key={i} d={`M ${sx},${stegoBack(sx) + 34} q 18,40 4,86`} stroke={BODY_D} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.7} />)}
      {/* tail spikes (thagomizer) */}
      {[[-600, -246, -150], [-575, -252, -120], [-610, -240, 150], [-585, -244, 125]].map(([sx, sy, a], i) => {
        const r = (a * Math.PI) / 180, L = 92;
        return <path key={i} d={`M ${sx - 10},${sy} L ${sx + Math.cos(r) * L},${sy - Math.abs(Math.sin(r)) * L} L ${sx + 10},${sy} Z`} fill="#efe6cc" stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
      })}
      {/* near row of plates */}
      {plates.map((px, i) => { const h = 80 + 80 * Math.sin(((px + 470) / 720) * Math.PI); const by = stegoBack(px) + 20;
        return (
          <g key={`p${i}`}>
            <path d={`M ${px - h * 0.42},${by} Q ${px - h * 0.52},${by - h * 0.72} ${px + h * 0.05},${by - h * 1.18} Q ${px + h * 0.52},${by - h * 0.62} ${px + h * 0.42},${by} Z`} fill={PLATE} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
            <path d={`M ${px},${by - 6} L ${px + h * 0.04},${by - h * 0.95}`} stroke={PLATE_D} strokeWidth={4} />
          </g>);
      })}
      {/* head */}
      <path d="M 336,-176 C 372,-196 424,-190 452,-162 C 462,-150 456,-136 440,-132 C 410,-126 372,-124 342,-126 Z" fill={BODY} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <path d="M 452,-150 L 388,-142" stroke={INK} strokeWidth={4} />
      <circle cx={396} cy={-168} r={8} fill="#fff6e0" stroke={INK} strokeWidth={3} /><circle cx={398} cy={-168} r={4} fill={INK} />
      {/* near legs */}
      {leg(-110, -210, 104, 1, false)}{leg(205, -150, 70, -1, false)}
    </g>
  );
};

/** T. rex (side view, facing left), horizontal theropod posture. Origin at the feet; ~1350 long, ~560 tall. jaw 0..1 */
const TRex: React.FC<{ x: number; y: number; s: number; f: number; jaw?: number; walk?: number; look?: number }> = ({ x, y, s, f, jaw = 0, walk = 0, look = 0 }) => {
  const st = Math.sin(f / 7) * walk;
  const BODY = "#9a5a30", BODY_D = "#6a3a1e", BELLY = "#e0c090", STRIPE = "#5a2e16";
  const leg = (ph: number, far: boolean) => (
    <g transform={`rotate(${st * ph * 14} 70 -330)`}>
      <path d="M -20,-400 C 40,-430 170,-410 180,-320 C 186,-250 150,-200 110,-190 C 60,-180 10,-210 -10,-260 C -30,-310 -50,-370 -20,-400 Z" fill={far ? BODY_D : BODY} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <path d="M 10,-360 C 50,-330 90,-300 140,-300" stroke={INK} strokeWidth={4} fill="none" opacity={0.4} />
      <path d="M 30,-190 C 40,-140 70,-110 80,-70 L 100,-62 C 96,-110 110,-170 120,-210 Z" fill={far ? BODY_D : BODY} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <path d="M 70,-80 L 40,-20 L -60,-6 C -80,-2 -80,10 -60,10 L 80,10 C 100,10 110,0 104,-14 L 104,-70 Z" fill={far ? BODY_D : BODY} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {[-60, -24, 12].map((tx) => <path key={tx} d={`M ${tx},10 l -18,6 l 4,-14 Z`} fill="#efe6cc" stroke={INK} strokeWidth={3} />)}
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {leg(-1, true)}
      {/* body: neck → back → long tail → belly */}
      <path d="M -250,-430 C -190,-480 -60,-496 80,-484 C 260,-470 430,-436 640,-398 C 740,-380 800,-370 830,-362 C 800,-350 730,-344 640,-344 C 450,-336 280,-306 170,-262 C 70,-222 -60,-222 -150,-262 C -210,-288 -250,-330 -270,-372 Z" fill={BODY} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M -150,-262 C -60,-226 70,-226 170,-264" stroke={BELLY} strokeWidth={26} fill="none" strokeLinecap="round" />
      {[-120, -20, 90, 210, 340, 480].map((sx, i) => <path key={i} d={`M ${sx},${-486 + i * 9} q 14,34 2,66`} stroke={STRIPE} strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.8} />)}
      {/* tiny two-fingered arm */}
      <path d="M -210,-320 C -240,-300 -262,-280 -268,-262 L -258,-256 L -252,-270 L -246,-254 L -236,-258 C -232,-284 -210,-300 -196,-308 Z" fill={BODY} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      {leg(1, false)}
      {/* head */}
      <g transform={`rotate(${look * -18} -250 -430)`}>
        <g transform={`rotate(${-jaw * 20} -290 -412)`}>
          <path d="M -290,-412 L -560,-428 C -560,-400 -540,-384 -500,-382 C -420,-378 -340,-382 -296,-392 Z" fill={BODY_D} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M ${-540 + i * 34},-424 l 8,-16 l 8,16 Z`} fill="#fff6e0" stroke={INK} strokeWidth={2} />)}
        </g>
        <path d="M -236,-452 C -266,-506 -360,-530 -480,-512 C -538,-504 -566,-482 -566,-456 L -566,-428 C -520,-426 -400,-420 -280,-408 C -250,-412 -230,-426 -236,-452 Z" fill={BODY} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M ${-556 + i * 34},-428 l 8,16 l 8,-16 Z`} fill="#fff6e0" stroke={INK} strokeWidth={2} />)}
        <path d="M -380,-498 C -350,-510 -320,-508 -296,-494" stroke={INK} strokeWidth={10} strokeLinecap="round" fill="none" />
        <circle cx={-334} cy={-478} r={13} fill="#ffd84a" stroke={INK} strokeWidth={4} /><ellipse cx={-334} cy={-478} rx={4} ry={10} fill={INK} />
        <circle cx={-536} cy={-470} r={6} fill={INK} />
        <path d="M -470,-500 q 30,-14 60,-4" stroke={STRIPE} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7} />
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
