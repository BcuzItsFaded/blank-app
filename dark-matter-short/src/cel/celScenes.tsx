import React from "react";
import { H, W, lerp, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow } from "./celFx";
import { wordFrame, lineFrame } from "../timing";

/* DAY 1 #4 — dark matter. Original cel illustrations. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const PURPLE = "#b48aff";

const Stars: React.FC<{ f: number; n?: number; seed?: number }> = ({ f, n = 160, seed = 1 }) => {
  const r = rand(seed);
  const st = Array.from({ length: n }, () => ({ x: r() * 1500 - 210, y: r() * 2400 - 240, s: 1 + r() * 3, ph: r() * 40 }));
  return <g>{st.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r={q.s} fill="#fff" opacity={0.4 + 0.6 * pulse(f, 30 + (i % 7) * 6, q.ph)} />)}</g>;
};
const Space: React.FC<{ f: number; seed: number }> = ({ f, seed }) => (
  <Layer depth={0.1}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#05030e" /><SoftGlow cx={300} cy={500} rx={700} ry={500} color="#3a1a6a" opacity={0.35} /><Stars f={f} seed={seed} /></Layer>
);

/** spiral galaxy of dots (original), rotating */
const Galaxy: React.FC<{ x: number; y: number; r: number; f: number; tilt?: number; speed?: number }> = ({ x, y, r, f, tilt = 0.5, speed = 1 }) => {
  const pts = React.useMemo(() => {
    const q = rand(42);
    return Array.from({ length: 420 }, (_, i) => { const arm = i % 2; const d = Math.pow(q(), 0.7); return { d, a: arm * Math.PI + d * 5.2 + (q() - 0.5) * 0.7, s: 2 + q() * 4, c: q() }; });
  }, []);
  return (
    <g transform={`translate(${x} ${y}) scale(1 ${tilt})`}>
      <SoftGlow cx={0} cy={0} rx={r * 1.2} ry={r * 1.2} color="#8a6ad8" opacity={0.3} />
      <SoftGlow cx={0} cy={0} rx={r * 0.35} ry={r * 0.35} color="#fff0c8" opacity={0.9} />
      {pts.map((p, i) => { const a = p.a + (f / 60) * speed; return <circle key={i} cx={Math.cos(a) * p.d * r} cy={Math.sin(a) * p.d * r} r={p.s} fill={p.c > 0.7 ? "#9ad8ff" : p.c > 0.4 ? "#fff4d0" : "#ffb8e0"} opacity={0.85} />; })}
    </g>
  );
};

const Pop: React.FC<{ f: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ f, at, x, y, children }) => {
  const p = clamp((f - at) / 8); if (p <= 0) return null;
  return <g transform={`translate(${x} ${y}) scale(${p < 1 ? 0.4 + 0.8 * Math.sin(p * Math.PI * 0.75) : 1})`}>{children}</g>;
};
const Big: React.FC<{ t: string; size?: number; color?: string; y?: number }> = ({ t, size = 110, color = "#fff", y = 0 }) =>
  <text y={y} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={size} fill={color} stroke="#05030e" strokeWidth={14} paintOrder="stroke">{t}</text>;

/* 1 — hook: a galaxy and a giant question mark */
export const D1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.0, 0, 0, 0], [5, 1.1, 0, 0, 0]]);
  return (
    <Stage cam={cameraAt(s, f)} bg="#05030e">
      <Space f={f} seed={1} />
      <Layer depth={0.6}><Galaxy x={540} y={900} r={420} f={f} /></Layer>
      <Layer depth={0.9}><Pop f={f} at={wordFrame(1, 6)} x={540} y={760}><g opacity={0.9 + 0.1 * pulse(f, 12)}><Big t="?" size={460} color={PURPLE} /></g></Pop></Layer>
    </Stage>
  );
};

/* 2 — stars, planets, even YOU: ordinary matter */
export const D2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.05, 0, 0, 0], [8, 1.0, 0, 0, 0]]);
  const label = wordFrame(2, 9);
  return (
    <Stage cam={cameraAt(s, f)} bg="#05030e" defs={<Boil id="db2" f={f} scale={1.6} />}>
      <Space f={f} seed={2} />
      <Layer depth={0.8}>
        <Pop f={f} at={wordFrame(2, 2)} x={260} y={520}>
          <SoftGlow cx={0} cy={0} rx={200} ry={200} color="#ffd27a" opacity={0.6} /><circle r={110} fill="#ffcf5a" stroke="#8a4a10" strokeWidth={6} />
          <Big t="STAR" size={54} y={190} />
        </Pop>
        <Pop f={f} at={wordFrame(2, 3)} x={800} y={560}>
          <circle r={100} fill="#5a9ad8" stroke="#1a2a4a" strokeWidth={6} /><path d="M -60,-30 q 30,20 60,0 q 30,-20 50,10 M -80,30 q 40,20 90,-10" stroke="#3aaa6a" strokeWidth={22} fill="none" strokeLinecap="round" />
          <ellipse rx={170} ry={36} fill="none" stroke="#e8d8b0" strokeWidth={10} transform="rotate(-14)" />
          <Big t="PLANET" size={54} y={190} />
        </Pop>
        <Pop f={f} at={wordFrame(2, 5)} x={540} y={960}>
          <g filter="url(#db2)" transform={`rotate(${Math.sin(f / 20) * 6})`}>
            <rect x={-46} y={-20} width={92} height={110} rx={30} fill="#e8ecf4" stroke="#1a1e2a" strokeWidth={5} />
            <path d="M -46,10 L -92,-40 M 46,10 L 92,-40" stroke="#e8ecf4" strokeWidth={28} strokeLinecap="round" />
            <path d="M -24,86 L -30,150 M 24,86 L 32,150" stroke="#e8ecf4" strokeWidth={30} strokeLinecap="round" />
            <circle cx={0} cy={-62} r={56} fill="#e8ecf4" stroke="#1a1e2a" strokeWidth={5} />
            <ellipse cx={6} cy={-60} rx={40} ry={32} fill="#1a2a4a" /><circle cx={-6} cy={-62} r={5} fill="#fff" /><circle cx={18} cy={-62} r={5} fill="#fff" />
          </g>
          <Big t="YOU!" size={70} y={230} color="#ffd15a" />
        </Pop>
        <Pop f={f} at={label} x={540} y={300}>
          <g transform="translate(0 -40)">{[0, 60, 120].map((a) => <ellipse key={a} rx={90} ry={30} fill="none" stroke="#7ae8ff" strokeWidth={5} transform={`rotate(${a + f})`} />)}<circle r={16} fill="#ffd15a" /></g>
          <Big t="ORDINARY MATTER" size={78} y={110} color="#7ae8ff" />
        </Pop>
      </Layer>
    </Stage>
  );
};

/* 3 — 85% of matter is dark matter */
export const D3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.0, 0, 0, 0], [9, 1.06, 0, 0, 0]]);
  const fill = lerp(f, 0, 0.85, wordFrame(3, 2) - 4, wordFrame(3, 2) + 40);
  const dark = wordFrame(3, 10);
  const R = 300, C = 2 * Math.PI * R;
  return (
    <Stage cam={cameraAt(s, f, f >= dark && f < dark + 8 ? 10 : 0)} bg="#05030e">
      <Space f={f} seed={3} />
      <Layer depth={0.8}>
        <g transform="translate(540 820) rotate(-90)">
          <circle r={R} fill="none" stroke="#ffd15a" strokeWidth={130} />
          <circle r={R} fill="none" stroke="#3a1a6a" strokeWidth={130} strokeDasharray={`${C * fill} ${C}`} />
          <circle r={R} fill="none" stroke={PURPLE} strokeWidth={130} strokeDasharray={`${C * fill} ${C}`} opacity={0.6 + 0.4 * pulse(f, 14)} />
        </g>
        <text x={540} y={860} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={150} fill="#fff" stroke="#05030e" strokeWidth={12} paintOrder="stroke">{Math.round(fill * 100)}%</text>
        {fill > 0.8 && <text x={840} y={430} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={54} fill="#ffd15a" stroke="#05030e" strokeWidth={8} paintOrder="stroke">15% ordinary</text>}
        <Pop f={f} at={dark} x={540} y={1260}><Big t="DARK MATTER" size={120} color={PURPLE} /></Pop>
      </Layer>
    </Stage>
  );
};

/* 4 — we see it through its gravity on galaxies */
export const D4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.0, 0, 0, 0], [5, 1.08, 0, -30, 0]]);
  const halo = lerp(f, 0, 1, wordFrame(4, 12) - 6, wordFrame(4, 12) + 16);
  return (
    <Stage cam={cameraAt(s, f)} bg="#05030e">
      <Space f={f} seed={4} />
      <Layer depth={0.7}>
        <g opacity={halo}>
          <SoftGlow cx={540} cy={860} rx={620} ry={620} color={PURPLE} opacity={0.4} />
          {Array.from({ length: 80 }, (_, i) => { const r = rand(i + 70); const a = r() * Math.PI * 2, d = 380 + r() * 220; return <circle key={i} cx={540 + Math.cos(a + f / 200) * d} cy={860 + Math.sin(a + f / 200) * d} r={3} fill={PURPLE} opacity={0.6} />; })}
          <text x={540} y={260} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={56} fill={PURPLE} stroke="#05030e" strokeWidth={8} paintOrder="stroke">INVISIBLE HALO (GRAVITY)</text>
        </g>
        <Galaxy x={540} y={860} r={360} f={f} tilt={0.55} speed={2.2} />
        {halo > 0.3 && [0, 1, 2, 3].map((k) => { const a = (k * Math.PI) / 2 + f / 40; return <path key={k} d={`M ${540 + Math.cos(a) * 560},${860 + Math.sin(a) * 560 * 0.55} L ${540 + Math.cos(a) * 430},${860 + Math.sin(a) * 430 * 0.55}`} stroke={PURPLE} strokeWidth={8} markerEnd="" opacity={0.8} />; })}
      </Layer>
    </Stage>
  );
};

/* 5 — "Nobody knows!" … WAIT RG… WHAT?! */
export const D5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.0, 0, 0, 0], [3, 1.1, 0, 0, 0]]);
  const react = lineFrame(5, 1);
  const frozen = f >= react;
  return (
    <Stage cam={cameraAt(s, f, frozen && f < react + 6 ? 14 : 0)} bg="#05030e">
      <Space f={f} seed={5} />
      <Layer depth={0.7}><Galaxy x={540} y={980} r={330} f={frozen ? react : f} tilt={0.6} /></Layer>
      <Layer depth={0.9}>
        <Pop f={f} at={wordFrame(5, 4)} x={540} y={520}><Big t="NOBODY KNOWS!" size={120} color={PURPLE} /></Pop>
        <Pop f={f} at={react + 2} x={780} y={760}><Big t="?!" size={180} color="#ff6ad5" /></Pop>
      </Layer>
      {frozen && <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#ff6ad5" opacity={Math.max(0, 0.25 - (f - react) * 0.03)} />}
    </Stage>
  );
};

export const CEL_SCENES = [D1, D2, D3, D4, D5];
