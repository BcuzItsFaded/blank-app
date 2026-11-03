import React, { useMemo } from "react";
import { rand } from "./celLib";

/* Island of the Dolls props for the cel engine (original designs). */

/** A discarded doll hanging by a rope. Local origin = rope knot (top). */
export const Doll: React.FC<{
  x: number; y: number; scale?: number; sway?: number; dress?: string; hair?: string; crack?: number; hollow?: boolean; glint?: number; rope?: number; seed?: number; missingArm?: boolean;
}> = ({ x, y, scale = 1, sway = 0, dress = "#c86a8a", hair = "#c89a4a", crack = 0.5, hollow = true, glint = 0, rope = 90, seed = 1, missingArm }) => {
  const r = rand(seed);
  const cracks = useMemo(() => Array.from({ length: 4 }, () => {
    const a = r() * Math.PI * 2, l = 10 + r() * 20;
    return `M ${Math.cos(a) * 8},${-rope - 46 + Math.sin(a) * 8} l ${Math.cos(a) * l},${Math.sin(a) * l} l ${(r() - 0.5) * 10},${r() * 10}`;
  }), [seed, rope]);
  const hy = rope + 46; // head centre below the knot
  return (
    <g transform={`translate(${x} ${y}) rotate(${sway}) scale(${scale})`}>
      <line x1={0} y1={0} x2={0} y2={rope} stroke="#3a2a1a" strokeWidth={3} />
      {/* body / dress */}
      <path d={`M -16,${hy + 30} L -46,${hy + 120} Q 0,${hy + 134} 46,${hy + 120} L 16,${hy + 30} Z`} fill={dress} stroke="#140a0a" strokeWidth={3.5} />
      <path d={`M -40,${hy + 112} Q 0,${hy + 124} 40,${hy + 112}`} stroke="#fff" strokeWidth={3} opacity={0.4} fill="none" strokeDasharray="4 6" />
      {/* arms + legs (porcelain) */}
      <path d={`M -16,${hy + 40} L -40,${hy + 84}`} stroke="#e2cfb4" strokeWidth={12} strokeLinecap="round" />
      {!missingArm && <path d={`M 16,${hy + 40} L 38,${hy + 86}`} stroke="#e2cfb4" strokeWidth={12} strokeLinecap="round" />}
      <path d={`M -16,${hy + 124} L -18,${hy + 168} M 16,${hy + 124} L 20,${hy + 166}`} stroke="#e2cfb4" strokeWidth={13} strokeLinecap="round" />
      {/* head */}
      <circle cx={0} cy={hy} r={36} fill="#e8d8c0" stroke="#140a0a" strokeWidth={3.5} />
      <path d={`M -38,${hy - 6} C -40,${hy - 44} 40,${hy - 50} 38,${hy - 6} C 30,${hy - 26} -26,${hy - 30} -38,${hy - 6} Z`} fill={hair} stroke="#140a0a" strokeWidth={2.5} />
      <path d={`M -36,${hy - 4} C -48,${hy + 20} -44,${hy + 40} -36,${hy + 50} M 36,${hy - 4} C 48,${hy + 22} 46,${hy + 40} 38,${hy + 52}`} stroke={hair} strokeWidth={8} fill="none" />
      {hollow ? (
        <>
          <ellipse cx={-13} cy={hy + 2} rx={8} ry={10} fill="#0a0406" />
          <ellipse cx={13} cy={hy + 2} rx={8} ry={10} fill="#0a0406" />
        </>
      ) : (
        <>
          <circle cx={-13} cy={hy + 2} r={7} fill="#fff" /><circle cx={13} cy={hy + 2} r={7} fill="#fff" />
          <circle cx={-12} cy={hy + 3} r={4} fill="#2a1a3a" /><circle cx={14} cy={hy + 3} r={4} fill="#2a1a3a" />
        </>
      )}
      {glint > 0 && <><circle cx={-13} cy={hy + 2} r={9} fill="#ffe8f0" opacity={glint * 0.25} /><circle cx={13} cy={hy + 2} r={9} fill="#ffe8f0" opacity={glint * 0.25} /><circle cx={-12} cy={hy + 1} r={2.6} fill="#fff" opacity={glint} /><circle cx={14} cy={hy + 1} r={2.6} fill="#fff" opacity={glint} /></>}
      <path d={`M -7,${hy + 21} L 7,${hy + 20}`} stroke="#3a1a1a" strokeWidth={3} fill="none" />
      {/* grime + shadow side of the porcelain face */}
      <path d={`M 4,${hy - 35} A 36,36 0 0,1 4,${hy + 35} A 30,36 0 0,0 4,${hy - 35} Z`} fill="#6a5a50" opacity={0.35} />
      <g stroke="#3a2a20" strokeWidth={1.8} fill="none" opacity={crack}>{cracks.map((d, i) => <path key={i} d={d} />)}</g>
      {hollow && <path d={`M -13,${hy + 12} l -2,14 M 13,${hy + 12} l 3,10`} stroke="#2a1a1a" strokeWidth={2} opacity={0.7} />}
    </g>
  );
};

/** Ahuejote / willow tree with drooping strands. Returns hang points via `hangs` seed. */
export const Willow: React.FC<{ x: number; y: number; h: number; f: number; seed?: number; trunk?: string; leaf?: string; leaf2?: string }> = ({
  x, y, h, f, seed = 3, trunk = "#2a1a14", leaf = "#2e4a2a", leaf2 = "#5a7a3a",
}) => {
  const p = useMemo(() => {
    const r = rand(seed);
    return {
      clumps: Array.from({ length: 9 }, () => ({ dx: (r() - 0.5) * h * 0.55, dy: -h * (0.55 + r() * 0.45), rx: h * (0.12 + r() * 0.12), ry: h * (0.08 + r() * 0.08) })),
      strands: Array.from({ length: 16 }, () => ({ dx: (r() - 0.5) * h * 0.7, top: -h * (0.6 + r() * 0.35), len: h * (0.25 + r() * 0.35), ph: r() * 10 })),
    };
  }, [seed, h]);
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M -${h * 0.04},0 C -${h * 0.03},-${h * 0.4} -${h * 0.02},-${h * 0.7} 0,-${h * 0.95} C ${h * 0.02},-${h * 0.7} ${h * 0.03},-${h * 0.4} ${h * 0.045},0 Z`} fill={trunk} stroke="#0a0606" strokeWidth={3} />
      {[[-0.6, -0.12], [0.55, 0.14], [-0.75, 0.1]].map(([t, a], i) => (
        <path key={i} d={`M 0,${-h * (0.5 + i * 0.1)} Q ${h * a},${-h * (0.65 + i * 0.08)} ${h * a * 2.2},${-h * (0.75 + i * 0.06)}`} stroke={trunk} strokeWidth={h * 0.012} fill="none" />
      ))}
      {p.clumps.map((c, i) => <ellipse key={i} cx={c.dx} cy={c.dy} rx={c.rx} ry={c.ry} fill={i % 3 ? leaf : leaf2} stroke="#0e1a0e" strokeWidth={3} />)}
      {p.strands.map((st, i) => {
        const sw = Math.sin(f / 40 + st.ph) * 10;
        return <path key={i} d={`M ${st.dx},${st.top} q ${sw},${st.len * 0.5} ${sw * 1.6},${st.len}`} stroke={i % 2 ? leaf2 : leaf} strokeWidth={5} fill="none" strokeDasharray="10 6" />;
      })}
    </g>
  );
};

/** small thatched wooden hut */
export const Hut: React.FC<{ x: number; y: number; w: number; h: number; lit?: number; door?: number }> = ({ x, y, w, h, lit = 1, door = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-w / 2} y={-h} width={w} height={h} fill="#5a3a28" stroke="#140a06" strokeWidth={4} />
    {Array.from({ length: Math.floor(w / 22) }, (_, i) => <line key={i} x1={-w / 2 + 11 + i * 22} y1={-h} x2={-w / 2 + 11 + i * 22} y2={0} stroke="#2a1a10" strokeWidth={2.5} />)}
    <rect x={w * 0.08} y={-h * 0.78} width={w * 0.26} height={h * 0.78} fill="#2a1a10" stroke="#140a06" strokeWidth={3} />
    {door > 0 && <rect x={w * 0.08} y={-h * 0.78} width={w * 0.26 * (1 - door)} height={h * 0.78} fill="#4a2e1c" stroke="#140a06" strokeWidth={3} />}
    <rect x={-w * 0.36} y={-h * 0.7} width={w * 0.26} height={h * 0.26} fill={lit > 0 ? "#ffc060" : "#120a06"} opacity={0.4 + 0.6 * lit} stroke="#140a06" strokeWidth={3} />
    <path d={`M ${-w * 0.66},${-h + 10} L 0,${-h - h * 0.75} L ${w * 0.66},${-h + 10} Z`} fill="#8a6a3a" stroke="#140a06" strokeWidth={4} />
    {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M ${-w * 0.62 + i * w * 0.095},${-h + 6} l ${8},${-26}`} stroke="#4a3418" strokeWidth={3} />)}
    <path d={`M ${-w * 0.66},${-h + 10} ${Array.from({ length: 12 }, (_, i) => `L ${-w * 0.66 + (i + 0.5) * w * 0.11},${-h + 22} L ${-w * 0.66 + (i + 1) * w * 0.11},${-h + 10}`).join(" ")}`} fill="#8a6a3a" stroke="#140a06" strokeWidth={3} />
  </g>
);

/** white wooden cross on stones */
export const Cross: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[[-50, 0, 46], [10, 6, 50], [56, -4, 36], [-16, 18, 40]].map(([sx, sy, r], i) => <ellipse key={i} cx={sx} cy={sy} rx={r} ry={r * 0.55} fill="#6a6260" stroke="#141010" strokeWidth={3} />)}
    <rect x={-9} y={-210} width={18} height={210} fill="#efe8f4" stroke="#141010" strokeWidth={3} />
    <rect x={-56} y={-160} width={112} height={18} fill="#efe8f4" stroke="#141010" strokeWidth={3} />
  </g>
);

/** wooden canoe seen from behind/side */
export const Canoe: React.FC<{ x: number; y: number; s?: number; rock?: number }> = ({ x, y, s = 1, rock = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rock}) scale(${s})`}>
    <path d="M -420,-20 Q -200,90 260,40 Q 380,10 420,-60 Q 100,-10 -420,-20 Z" fill="#6a4a30" stroke="#140a06" strokeWidth={5} />
    <path d="M -400,-14 Q 0,-4 410,-54" stroke="#a07a50" strokeWidth={6} fill="none" />
    {[-200, 0, 180].map((x2) => <line key={x2} x1={x2} y1={-8} x2={x2 + 10} y2={40} stroke="#2a1a10" strokeWidth={3} />)}
  </g>
);

export const LilyPads: React.FC<{ y: number; f: number; seed?: number; n?: number; W?: number }> = ({ y, f, seed = 5, n = 9, W = 1080 }) => {
  const p = useMemo(() => { const r = rand(seed); return Array.from({ length: n }, () => ({ x: r() * (W + 200) - 100, dy: r() * 240, rx: 50 + r() * 50, ph: r() * 9, fl: r() > 0.7 })); }, [seed, n, W]);
  return (
    <g>
      {p.map((q, i) => {
        const bob = Math.sin(f / 30 + q.ph) * 3;
        return (
          <g key={i} transform={`translate(${q.x} ${y + q.dy + bob})`}>
            <path d={`M 0,0 m -${q.rx},0 a ${q.rx},${q.rx * 0.38} 0 1,0 ${q.rx * 2},0 a ${q.rx},${q.rx * 0.38} 0 1,0 -${q.rx * 2},0 M 0,0 L ${q.rx * 0.9},-${q.rx * 0.1}`} fill="#4a7a3a" stroke="#0e1a0e" strokeWidth={3} />
            {q.fl && <circle cx={-q.rx * 0.3} cy={-8} r={9} fill="#f0b0d8" stroke="#2a0e1a" strokeWidth={2} />}
          </g>
        );
      })}
    </g>
  );
};

/** small hanging lantern with glow */
export const Lantern: React.FC<{ x: number; y: number; s?: number; on?: number }> = ({ x, y, s = 1, on = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <line x1={0} y1={-80} x2={0} y2={-34} stroke="#1a1008" strokeWidth={4} />
    <circle cx={0} cy={10} r={120} fill="#ffb850" opacity={0.18 * on} />
    <circle cx={0} cy={10} r={60} fill="#ffd27a" opacity={0.28 * on} />
    <path d="M -24,-34 L 24,-34 L 30,40 L -30,40 Z" fill={on > 0.05 ? "#ffcf6a" : "#3a2a14"} stroke="#1a1008" strokeWidth={4} opacity={0.4 + 0.6 * on} />
    <path d="M -30,-34 L 30,-34 L 22,-50 L -22,-50 Z M -32,40 L 32,40 L 26,52 L -26,52 Z" fill="#2a1a0a" />
    <path d="M -8,-34 L -10,40 M 8,-34 L 10,40" stroke="#1a1008" strokeWidth={3} />
  </g>
);
