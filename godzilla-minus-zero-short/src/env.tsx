import React, { useMemo } from "react";
import { H, W, rand } from "./lib";
import { getInputProps, staticFile } from "remotion";
const DBG = getInputProps() as Record<string, boolean>;

/** gradient sky with drifting painted cloud masses */
export const Sky: React.FC<{ f: number; top: string; mid: string; bottom: string; clouds?: string; cloudOpacity?: number; id: string; seed?: number }> = ({
  f, top, mid, bottom, clouds = "#1a1c22", cloudOpacity = 0.85, id, seed = 9,
}) => {
  const cl = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: 14 }, () => ({ x: r() * 1600 - 260, y: r() * 900 - 100, rx: 200 + r() * 340, ry: 60 + r() * 120, v: 0.2 + r() * 0.5 }));
  }, [seed]);
  return (
    <g>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} /><stop offset="0.55" stopColor={mid} /><stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect x={-400} y={-400} width={W + 800} height={H + 800} fill={`url(#sky-${id})`} />
      {/* baked painterly cloud plates (public/clouds_*.png) drifting at two speeds */}
      {!DBG.noClouds && (() => {
        const tex = staticFile(warmClouds(clouds) ? "clouds_warm.png" : "clouds_dark.png");
        const r = rand(seed); const ox = -r() * 500, oy = -r() * 300;
        return (
          <g opacity={cloudOpacity}>
            <image href={tex} x={-500 + ox + f * 0.5} y={-300 + oy} width={2200} height={1540} preserveAspectRatio="none" />
            <image href={tex} x={-300 + ox * 0.5 - f * 0.25} y={-100 + oy * 0.6} width={2000} height={1100} preserveAspectRatio="none" opacity={0.7} transform={`scale(-1 1) translate(${-W} 0)`} />
          </g>
        );
      })()}
      {void cl}
    </g>
  );
};

const warmClouds = (c: string) => { const v = parseInt(c.slice(1, 3), 16); return v > 0x50; };

/** distant burnt-out skyline (rubble, chimneys, a surviving clock-tower block) */
export const Skyline: React.FC<{ y: number; color: string; seed?: number; tower?: boolean; glow?: string; height?: number }> = ({
  y, color, seed = 11, tower = true, glow, height = 1,
}) => {
  const d = useMemo(() => {
    const r = rand(seed);
    let x = -300, s = `M -300 ${y + 400} L -300 ${y}`;
    while (x < W + 300) {
      const w = 30 + r() * 90, h = (20 + r() * 140) * height;
      const broken = r() > 0.6;
      s += ` L ${x} ${y - h}`;
      if (broken) s += ` L ${x + w * 0.3} ${y - h + 25} L ${x + w * 0.5} ${y - h - 12} L ${x + w * 0.8} ${y - h + 18}`;
      s += ` L ${x + w} ${y - h} L ${x + w} ${y - h * 0.3}`;
      if (r() > 0.8) s += ` L ${x + w + 6} ${y - h - 120 * height} L ${x + w + 16} ${y - h - 120 * height} L ${x + w + 18} ${y - h * 0.3}`; // chimney
      x += w + r() * 20;
    }
    s += ` L ${W + 300} ${y + 400} Z`;
    return s;
  }, [y, seed, height]);
  return (
    <g>
      {glow && (
        <g>
          <defs><linearGradient id={`skg-${seed}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={glow} stopOpacity={0} /><stop offset="0.7" stopColor={glow} stopOpacity={0.5} /><stop offset="1" stopColor={glow} stopOpacity={0.15} /></linearGradient></defs>
          <rect x={-300} y={y - 320} width={W + 600} height={360} fill={`url(#skg-${seed})`} />
        </g>
      )}
      <path d={d} fill={color} />
      {tower && (
        <g fill={color}>
          {/* rounded-corner department store with clock tower, a 1949 Ginza-style landmark (generic) */}
          <path d={`M 600 ${y} L 600 ${y - 230 * height} Q 690 ${y - 270 * height} 780 ${y - 230 * height} L 780 ${y} Z`} />
          <rect x={655} y={y - 330 * height} width={70} height={100 * height} />
          <path d={`M 650 ${y - 330 * height} Q 690 ${y - 390 * height} 730 ${y - 330 * height} Z`} />
          <circle cx={690} cy={y - 290 * height} r={18 * height} fill="#c8b891" opacity={0.25} />
        </g>
      )}
    </g>
  );
};

/** wooden house with curved tiled roof (rebuilt barracks / machiya style) */
export const House: React.FC<{ x: number; y: number; w: number; h: number; color: string; roof: string; lit?: number; seed?: number }> = ({
  x, y, w, h, color, roof, lit = 0, seed = 1,
}) => {
  const r = rand(seed);
  const win = r() > 0.4;
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill={color} />
      {/* vertical board lines */}
      {Array.from({ length: Math.floor(w / 18) }, (_, i) => (
        <line key={i} x1={x + 9 + i * 18} y1={y - h} x2={x + 9 + i * 18} y2={y} stroke="#000" strokeOpacity={0.35} strokeWidth={2} />
      ))}
      {win && <rect x={x + w * 0.3} y={y - h * 0.7} width={w * 0.35} height={h * 0.3} fill={lit ? "#e0a04a" : "#0a0a0a"} opacity={lit ? lit : 0.8} />}
      {win && lit > 0 && <rect x={x + w * 0.3 - 10} y={y - h * 0.7 - 10} width={w * 0.35 + 20} height={h * 0.3 + 20} rx={14} fill="#ffb560" opacity={lit * 0.25} />}
      <path d={`M ${x - 26} ${y - h + 6} Q ${x + w / 2} ${y - h - 10} ${x + w + 26} ${y - h + 6} L ${x + w - 8} ${y - h - 50} Q ${x + w / 2} ${y - h - 40} ${x + 8} ${y - h - 50} Z`} fill={roof} />
      {Array.from({ length: Math.floor(w / 14) + 3 }, (_, i) => (
        <line key={i} x1={x - 16 + i * 14} y1={y - h + 2} x2={x + 2 + i * 13} y2={y - h - 46} stroke="#000" strokeOpacity={0.45} strokeWidth={2} />
      ))}
      <path d={`M ${x - 26} ${y - h + 6} Q ${x + w / 2} ${y - h - 10} ${x + w + 26} ${y - h + 6}`} stroke="#000" strokeWidth={4} fill="none" />
    </g>
  );
};

/** wooden utility pole with cross-arms and sagging wires */
export const Pole: React.FC<{ x: number; y: number; h: number; color?: string; wiresTo?: number; sway?: number }> = ({
  x, y, h, color = "#050506", wiresTo = -400, sway = 0,
}) => (
  <g>
    <path d={`M ${x - 14} ${y} L ${x - 9} ${y - h} L ${x + 9} ${y - h} L ${x + 14} ${y} Z`} fill={color} />
    {[0, 70].map((o) => (
      <rect key={o} x={x - 90} y={y - h + 40 + o} width={180} height={12} fill={color} />
    ))}
    {[-80, -30, 30, 80].map((o, i) => (
      <path key={i} d={`M ${x + o} ${y - h + 40} Q ${(x + wiresTo) / 2} ${y - h + 200 + i * 20 + sway} ${wiresTo} ${y - h + 70 + i * 16}`} stroke={color} strokeWidth={3} fill="none" />
    ))}
    {[-80, 30].map((o, i) => (
      <path key={i} d={`M ${x + o} ${y - h + 110} Q ${x + 600} ${y - h + 260 + sway} ${x + 1400} ${y - h + 120}`} stroke={color} strokeWidth={3} fill="none" />
    ))}
  </g>
);

/** pile of rubble / charred beams (foreground) */
export const Rubble: React.FC<{ y: number; color?: string; seed?: number }> = ({ y, color = "#060607", seed = 5 }) => {
  const d = useMemo(() => {
    const r = rand(seed);
    let s = `M -300 ${H + 300} L -300 ${y}`;
    for (let x = -300; x < W + 300; x += 40 + r() * 60) s += ` L ${x} ${y - r() * 120}`;
    s += ` L ${W + 300} ${y} L ${W + 300} ${H + 300} Z`;
    const beams = Array.from({ length: 6 }, () => ({ x: r() * W, a: -40 + r() * 80, l: 160 + r() * 240 }));
    return { s, beams };
  }, [y, seed]);
  return (
    <g fill={color}>
      {d.beams.map((b, i) => <rect key={i} x={b.x} y={y - 140} width={b.l} height={22} transform={`rotate(${b.a} ${b.x} ${y - 140})`} />)}
      <path d={d.s} />
    </g>
  );
};

/** layered ocean with animated swells */
export const Ocean: React.FC<{ f: number; y: number; layers?: number; color: string; crest?: string; amp?: number; speed?: number; seed?: number }> = ({
  f, y, layers = 5, color, crest = "#8aa4b8", amp = 26, speed = 1, seed = 3,
}) => {
  const r = rand(seed);
  const ph = Array.from({ length: layers }, () => r() * 10);
  return (
    <g>
      {ph.map((p, li) => {
        const yy = y + li * (140 + li * 30);
        const A = amp * (1 + li * 0.6);
        let d = `M -400 ${H + 400} L -400 ${yy}`;
        for (let x = -400; x <= W + 400; x += 30) {
          const v = Math.sin(x / (160 + li * 40) + f * 0.05 * speed * (1 + li * 0.25) + p) * A + Math.sin(x / 57 + f * 0.09 + p * 2) * A * 0.25;
          d += ` L ${x} ${(yy + v).toFixed(1)}`;
        }
        d += ` L ${W + 400} ${H + 400} Z`;
        return (
          <g key={li}>
            <path d={d} fill={color} opacity={0.65 + li * 0.08} />
            <path d={d} stroke={crest} strokeWidth={2 + li} fill="none" opacity={0.25 + li * 0.08} />
          </g>
        );
      })}
    </g>
  );
};

/** 1940s wooden fishing boat with cabin, mast and lantern; fishermen silhouettes */
export const Boat: React.FC<{ x: number; y: number; scale?: number; rock?: number; lantern?: number; recoil?: number }> = ({
  x, y, scale = 1, rock = 0, lantern = 1, recoil = 0,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rock}) scale(${scale})`}>
    <path d="M -300,0 Q -280,70 -200,90 L 220,90 Q 300,60 330,-20 L 300,-10 L -300,0 Z" fill="#0d0b0a" stroke="#000" strokeWidth={3} />
    <path d="M -300,0 L 300,-10" stroke="#3b2f25" strokeWidth={6} />
    <rect x={-120} y={-120} width={150} height={120} fill="#161210" stroke="#000" strokeWidth={3} />
    <rect x={-96} y={-96} width={44} height={36} fill="#e4a55a" opacity={0.75 * lantern} />
    <line x1={110} y1={-10} x2={110} y2={-380} stroke="#0d0b0a" strokeWidth={10} />
    <line x1={110} y1={-360} x2={290} y2={-20} stroke="#0d0b0a" strokeWidth={2} />
    <line x1={110} y1={-360} x2={-260} y2={0} stroke="#0d0b0a" strokeWidth={2} />
    <circle cx={110} cy={-250} r={14} fill="#ffcf7a" opacity={lantern} />
    <circle cx={110} cy={-250} r={50} fill="#ffb24a" opacity={0.25 * lantern} />
    {/* fishermen leaning over the rail */}
    <g fill="#060505">
      <g transform={`translate(${170 - recoil * 30} -10) rotate(${-25 + recoil * 35})`}>
        <ellipse cx={0} cy={-120} rx={14} ry={16} /><path d="M -18,-104 L 18,-104 L 22,0 L -22,0 Z" />
        <path d="M 10,-90 L 70,-60 L 66,-50 L 6,-78 Z" />
        <path d="M -30,-128 Q 0,-150 30,-128 Z" />
      </g>
      <g transform={`translate(${230 - recoil * 20} -6) rotate(${-15 + recoil * 25})`}>
        <ellipse cx={0} cy={-110} rx={13} ry={15} /><path d="M -16,-96 L 16,-96 L 20,0 L -20,0 Z" />
      </g>
    </g>
  </g>
);
