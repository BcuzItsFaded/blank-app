import React from "react";
import { H, W, lerp, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow } from "./celFx";
import { wordFrame, lineFrame } from "../timing";

/* DAY 1 #2 — What if you fell into a black hole? Original cel illustrations. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });

const Stars: React.FC<{ f: number; n?: number; seed?: number }> = ({ f, n = 160, seed = 1 }) => {
  const r = rand(seed);
  const st = Array.from({ length: n }, () => ({ x: r() * 1500 - 210, y: r() * 2400 - 240, s: 1 + r() * 3, ph: r() * 40 }));
  return <g>{st.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r={q.s} fill="#fff" opacity={0.4 + 0.6 * pulse(f, 30 + (i % 7) * 6, q.ph)} />)}</g>;
};

/** black hole with accretion disk + lensed arc (generic, original) */
const BlackHole: React.FC<{ x: number; y: number; r: number; f: number; horizon?: number }> = ({ x, y, r, f, horizon = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <SoftGlow cx={0} cy={0} rx={r * 3.2} ry={r * 2.6} color="#ff8a2a" opacity={0.35} />
    {/* lensed back of the disk (arc over the top) */}
    <path d={`M ${-r * 1.6},0 A ${r * 1.6},${r * 1.25} 0 0,1 ${r * 1.6},0`} stroke="#ffb84a" strokeWidth={r * 0.28} fill="none" opacity={0.85} />
    <path d={`M ${-r * 1.6},0 A ${r * 1.6},${r * 1.25} 0 0,1 ${r * 1.6},0`} stroke="#fff4c8" strokeWidth={r * 0.08} fill="none" opacity={0.9} />
    {/* the hole */}
    <circle r={r} fill="#000" />
    <circle r={r * 1.04} fill="none" stroke="#ffe2a0" strokeWidth={4} opacity={0.9} />
    {/* front of the accretion disk, swirling */}
    <ellipse cx={0} cy={0} rx={r * 2.6} ry={r * 0.42} fill="none" stroke="#ff8a2a" strokeWidth={r * 0.34} opacity={0.75} />
    <ellipse cx={0} cy={0} rx={r * 2.45} ry={r * 0.38} fill="none" stroke="#ffd27a" strokeWidth={r * 0.06} opacity={0.7} strokeDasharray={`${r * 0.18} ${r * 0.22}`} strokeDashoffset={-f * 7} />
    <ellipse cx={0} cy={0} rx={r * 2.75} ry={r * 0.46} fill="none" stroke="#fff0b0" strokeWidth={r * 0.04} opacity={0.6} strokeDasharray={`${r * 0.12} ${r * 0.3}`} strokeDashoffset={-f * 10} />
    <path d={`M ${-r * 2.6},0 A ${r * 2.6},${r * 0.42} 0 0,0 ${r * 2.6},0`} stroke="#ffd27a" strokeWidth={r * 0.36} fill="none" opacity={0.9} />
    <circle r={r * 0.98} fill="#000" opacity={0.0} />
    {horizon > 0 && (
      <g opacity={horizon}>
        <circle r={r * 1.18} fill="none" stroke="#7ae8ff" strokeWidth={6} strokeDasharray="20 14" strokeDashoffset={f * 2} />
        <text x={0} y={-r * 1.6} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={54} fill="#7ae8ff" stroke="#020208" strokeWidth={8} paintOrder="stroke">EVENT HORIZON</text>
      </g>
    )}
  </g>
);

/** cartoon astronaut (original). stretch 0..1 = spaghettification */
const Astronaut: React.FC<{ x: number; y: number; s: number; rot?: number; stretch?: number; f: number; shock?: number }> = ({ x, y, s, rot = 0, stretch = 0, f, shock = 0 }) => {
  const sy = 1 + stretch * 3.2, sx = 1 - stretch * 0.62;
  const wig = stretch > 0.5 ? Math.sin(f / 4) * 6 * stretch : 0;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * sx} ${s * sy}) skewX(${wig})`}>
      <rect x={-46} y={-20} width={92} height={110} rx={30} fill="#e8ecf4" stroke="#1a1e2a" strokeWidth={5} />
      <rect x={-66} y={-10} width={24} height={80} rx={12} fill="#c8ccd6" stroke="#1a1e2a" strokeWidth={4} />
      <path d={`M -46,10 L -90,${-30 + Math.sin(f / 6) * 14}`} stroke="#e8ecf4" strokeWidth={28} strokeLinecap="round" />
      <path d={`M 46,10 L 92,${-26 - Math.sin(f / 6) * 14}`} stroke="#e8ecf4" strokeWidth={28} strokeLinecap="round" />
      <path d="M -24,86 L -30,150 M 24,86 L 32,150" stroke="#e8ecf4" strokeWidth={30} strokeLinecap="round" />
      <circle cx={0} cy={-62} r={56} fill="#e8ecf4" stroke="#1a1e2a" strokeWidth={5} />
      <ellipse cx={6} cy={-60} rx={40} ry={32} fill="#1a2a4a" stroke="#0a1020" strokeWidth={4} />
      <path d="M -14,-80 Q 0,-90 18,-84" stroke="#9ad8ff" strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* face behind the visor */}
      <circle cx={-6} cy={-60} r={5 + shock * 4} fill="#fff" /><circle cx={18} cy={-60} r={5 + shock * 4} fill="#fff" />
      <ellipse cx={6} cy={-40} rx={6 + shock * 6} ry={3 + shock * 8} fill="#ff9ab0" />
      <rect x={-14} y={6} width={28} height={20} rx={4} fill="#ff6a3a" stroke="#1a1e2a" strokeWidth={3} />
    </g>
  );
};

const Pop: React.FC<{ f: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ f, at, x, y, children }) => {
  const p = clamp((f - at) / 8); if (p <= 0) return null;
  return <g transform={`translate(${x} ${y}) scale(${p < 1 ? 0.4 + 0.8 * Math.sin(p * Math.PI * 0.75) : 1})`}>{children}</g>;
};
const Big: React.FC<{ t: string; size?: number; color?: string }> = ({ t, size = 110, color = "#fff" }) =>
  <text textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={size} fill={color} stroke="#020208" strokeWidth={14} paintOrder="stroke">{t}</text>;

/* 1 — falling in… record scratch on "WAIT RG… WHAT?!" */
export const B1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.0, 0, 0, 0], [5.2, 1.06, 0, 0, 0]]);
  const stop = lineFrame(1, 1);
  const frozen = f >= stop;
  const t = frozen ? stop : f;
  const fall = lerp(t, 0, 1, 0, 120, (x) => x);
  return (
    <Stage cam={cameraAt(s, f, frozen && f < stop + 6 ? 14 : 0)} bg="#020208" defs={<Boil id="bb1" f={f} scale={1.6} />}>
      <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#020208" /><Stars f={f} seed={1} /></Layer>
      <Layer depth={0.6}><BlackHole x={540} y={1260} r={170} f={f} /></Layer>
      <Layer depth={0.95}>
        <g filter="url(#bb1)"><Astronaut x={lerp(fall, 280, 520, 0, 1)} y={lerp(fall, 260, 820, 0, 1)} s={1.3} rot={t * 3} f={t} shock={frozen ? 1 : 0} /></g>
        <Pop f={f} at={stop + 2} x={760} y={620}><Big t="?!" size={170} color="#ff6ad5" /></Pop>
      </Layer>
      {frozen && <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#ff6ad5" opacity={Math.max(0, 0.25 - (f - stop) * 0.03)} />}
    </Stage>
  );
};

/* 2 — the event horizon: even light can't escape */
export const B2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.0, 0, 120, 0], [6.5, 1.2, 0, 160, 0]]);
  const hz = lerp(f, 0, 1, wordFrame(2, 10) - 6, wordFrame(2, 10) + 10);
  const lightAt = wordFrame(2, 14);
  return (
    <Stage cam={cameraAt(s, f)} bg="#020208">
      <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#020208" /><Stars f={f} seed={2} /></Layer>
      <Layer depth={0.7}>
        <BlackHole x={540} y={1080} r={230} f={f} horizon={hz} />
        {/* light rays bending in */}
        {[0, 1, 2, 3, 4].map((k) => {
          const p = ((f / 40 + k / 5) % 1);
          const sx = -200 + k * 40, sy = 500 + k * 160;
          return <path key={k} d={`M ${sx},${sy} Q ${300 + p * 100},${sy + 80} ${540 - 120 * (1 - p)},${1080 - 40 * (1 - p)}`} stroke="#fff4a0" strokeWidth={6} fill="none" opacity={0.7 * (1 - p)} strokeDasharray="30 18" strokeDashoffset={-f * 6} />;
        })}
        {/* one beam tries to escape and curls back */}
        {f > lightAt && (() => { const p = clamp((f - lightAt) / 40); return (
          <path d={`M 540,1080 Q ${540 + 80 * p},${1080 - 420 * p} ${540 + 160 * p},${1080 - 300 * p + 300 * p * p}`} stroke="#ffffff" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.9} />); })()}
      </Layer>
    </Stage>
  );
};

/* 3 — tidal forces stretch you */
export const B3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.0, 0, -60, 0], [6, 1.14, 0, -120, 0]]);
  const st = lerp(f, 0, 0.55, wordFrame(3, 7) - 4, wordFrame(3, 11) + 10);
  return (
    <Stage cam={cameraAt(s, f)} bg="#020208" defs={<Boil id="bb3" f={f} scale={1.6} />}>
      <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#020208" /><Stars f={f} seed={3} /></Layer>
      <Layer depth={0.6}><BlackHole x={540} y={1560} r={210} f={f} /></Layer>
      <Layer depth={0.95}>
        <g filter="url(#bb3)"><Astronaut x={540} y={860} s={1.4} rot={0} stretch={st} f={f} shock={st > 0.1 ? 1 : 0} /></g>
        {st > 0.05 && <g stroke="#7ae8ff" strokeWidth={10} strokeLinecap="round" opacity={clamp(st * 3)}>
          <path d="M 540,520 L 540,380 M 510,410 L 540,380 L 570,410" fill="none" />
          <path d="M 540,1240 L 540,1380 M 510,1350 L 540,1380 L 570,1350" fill="none" />
        </g>}
      </Layer>
    </Stage>
  );
};

/* 4 — "spaghettification" */
export const B4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.1, 0, -60, 0], [4, 1.04, 0, 0, 0]]);
  return (
    <Stage cam={cameraAt(s, f)} bg="#020208" defs={<Boil id="bb4" f={f} scale={1.8} />}>
      <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#020208" /><Stars f={f} seed={4} /></Layer>
      <Layer depth={0.6}><BlackHole x={540} y={1600} r={200} f={f} /></Layer>
      <Layer depth={0.95}>
        <g filter="url(#bb4)"><Astronaut x={540} y={940} s={1.3} stretch={0.75 + 0.05 * Math.sin(f / 5)} f={f} shock={1} /></g>
        <Pop f={f} at={wordFrame(4, 3) - 2} x={540} y={420}><Big t="SPAGHETTIFICATION" size={96} color="#ffb84a" /></Pop>
      </Layer>
    </Stage>
  );
};

/* 5 — no signal gets out */
export const B5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.0, 0, 0, 0], [6.3, 1.08, 40, 0, 0]]);
  const nosig = f >= wordFrame(5, 10);
  return (
    <Stage cam={cameraAt(s, f)} bg="#020208">
      <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#020208" /><Stars f={f} seed={5} /></Layer>
      <Layer depth={0.6}>
        <BlackHole x={360} y={1180} r={220} f={f} horizon={0.6} />
        {/* radio rings from inside the horizon collapse back in */}
        {[0, 1, 2].map((k) => { const p = ((f / 30 + k / 3) % 1); const rr = 40 + 160 * Math.sin(p * Math.PI); return <circle key={k} cx={360} cy={1180} r={rr} fill="none" stroke="#7ae8ff" strokeWidth={5} opacity={0.6 * (1 - p)} />; })}
      </Layer>
      <Layer depth={0.9}>
        {/* observer ship with a screen */}
        <g transform="translate(830 560)">
          <path d="M -170,40 L -120,-50 L 120,-50 L 170,40 L 120,90 L -120,90 Z" fill="#8a96aa" stroke="#1a1e2a" strokeWidth={5} />
          <rect x={-100} y={-36} width={200} height={110} rx={10} fill={nosig ? "#2a2a2a" : "#0a3a2a"} stroke="#1a1e2a" strokeWidth={4} />
          {nosig ? <>
            {Array.from({ length: 40 }, (_, i) => { const r = rand(f * 3 + i); return <rect key={i} x={-96 + r() * 186} y={-32 + r() * 100} width={6} height={3} fill="#ddd" opacity={0.7} />; })}
            <text x={0} y={30} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={34} fill="#ff4a4a" stroke="#000" strokeWidth={5} paintOrder="stroke">NO SIGNAL</text>
          </> : <path d={`M -90,20 ${Array.from({ length: 18 }, (_, i) => `L ${-90 + i * 10},${20 - Math.sin(f / 3 + i) * 24}`).join(" ")}`} stroke="#5aff9a" strokeWidth={4} fill="none" />}
          <path d="M 170,40 L 230,20 L 230,60 Z" fill="#ff8a2a" opacity={0.6 + 0.4 * pulse(f, 6)} />
        </g>
      </Layer>
    </Stage>
  );
};

/* 6 — "Space is terrifying!" */
export const B6: React.FC<P> = ({ f }) => {
  const s = cam(6, [[0, 1.0, 0, 0, 0], [2, 1.12, 0, 0, 0]]);
  return (
    <Stage cam={cameraAt(s, f, f < 8 ? 10 : 0)} bg="#020208">
      <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#020208" /><Stars f={f} seed={6} /></Layer>
      <Layer depth={0.6}><BlackHole x={540} y={1000} r={260 + 10 * pulse(f, 10)} f={f} /></Layer>
      <Layer depth={0.95}><Pop f={f} at={2} x={540} y={470}><Big t="SPACE IS" size={130} /><g transform="translate(0 140)"><Big t="TERRIFYING!" size={150} color="#ff6ad5" /></g></Pop></Layer>
    </Stage>
  );
};

export const CEL_SCENES = [B1, B2, B3, B4, B5, B6];
