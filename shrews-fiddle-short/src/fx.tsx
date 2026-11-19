import React, { useMemo } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { H, W, rand } from "./lib";

/** Soft light pool: radial-gradient ellipse (cheap stand-in for a blurred shape) */
let glowSeq = 0;
export const SoftGlow: React.FC<{ cx: number; cy: number; rx: number; ry: number; color: string; opacity?: number }> = ({ cx, cy, rx, ry, color, opacity = 1 }) => {
  const id = useMemo(() => `sg${glowSeq++}`, []);
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={color} stopOpacity={1} />
          <stop offset="0.45" stopColor={color} stopOpacity={0.7} />
          <stop offset="0.75" stopColor={color} stopOpacity={0.22} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id})`} opacity={opacity} />
    </g>
  );
};

export const Rain: React.FC<{ f: number; n?: number; angle?: number; color?: string; speed?: number; len?: number; seed?: number; opacity?: number }> = ({
  f, n = 140, angle = 12, color = "#c8c0e0", speed = 70, len = 70, seed = 1, opacity = 0.5,
}) => {
  const drops = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: n }, () => ({ x: r() * (W + 600) - 300, y: r() * H, s: 0.6 + r() * 0.8, w: 1 + r() * 2 }));
  }, [n, seed]);
  const dx = Math.tan((angle * Math.PI) / 180);
  return (
    <g opacity={opacity} stroke={color} strokeLinecap="round">
      {drops.map((d, i) => {
        const y = ((d.y + f * speed * d.s) % (H + 300)) - 150;
        const x = d.x - y * dx * 0.3;
        return <line key={i} x1={x} y1={y} x2={x - len * d.s * dx} y2={y - len * d.s} strokeWidth={d.w} />;
      })}
    </g>
  );
};

/** drifting particles: fireflies (rise, glow) or falling leaves */
export const Particles: React.FC<{ f: number; n: number; seed: number; kind: "firefly" | "leaf" | "dust"; region?: [number, number, number, number] }> = ({ f, n, seed, kind, region = [0, 0, W, H] }) => {
  const p = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: n }, () => ({ x: r(), y: r(), s: 0.5 + r(), ph: r() * 100, a: 0.4 + r() * 0.6, c: r() }));
  }, [n, seed]);
  const [x0, y0, x1, y1] = region;
  return (
    <g>
      {p.map((q, i) => {
        if (kind === "firefly") {
          const x = x0 + (q.x * (x1 - x0) + Math.sin((f + q.ph) / 37) * 60 + f * 0.3 * (q.c - 0.5)) ;
          const y = y0 + (q.y * (y1 - y0) + Math.cos((f + q.ph * 2) / 29) * 40);
          const on = 0.3 + 0.7 * Math.max(0, Math.sin((f + q.ph * 3) / 14));
          return (
            <g key={i} opacity={on * q.a}>
              <circle cx={x} cy={y} r={14 * q.s} fill="#ffe27a" opacity={0.25} />
              <circle cx={x} cy={y} r={4 * q.s} fill="#fff6c0" />
            </g>
          );
        }
        if (kind === "leaf") {
          const y = ((q.y * H + f * 2.2 * q.s) % (H + 200)) - 100;
          const x = q.x * W + Math.sin((f + q.ph) / 18) * 70;
          return <path key={i} d="M 0,-14 C 10,-6 10,6 0,14 C -10,6 -10,-6 0,-14 Z" fill={q.c > 0.5 ? "#6a8a3a" : "#8a9a4a"} stroke="#1a1408" strokeWidth={2}
            transform={`translate(${x} ${y}) rotate(${(f * 4 * (q.c - 0.5) + q.ph * 20) % 360}) scale(${1.4 * q.s})`} opacity={0.85} />;
        }
        const y = (((q.y * H - f * 0.6 * q.s) % H) + H) % H;
        return <circle key={i} cx={q.x * W + Math.sin((f + q.ph) / 30) * 20} cy={y} r={2.5 * q.s} fill="#f0e0c0" opacity={q.a * 0.5} />;
      })}
    </g>
  );
};

/* ------------------------------------------------------------------ screen overlays (HTML) */
export const Grain: React.FC<{ f: number; opacity?: number }> = ({ f, opacity = 0.4 }) => {
  const r = rand(Math.floor(f / 2));
  const ox = Math.floor(r() * 768), oy = Math.floor(r() * 768);
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain_alpha.png")})`, backgroundPosition: `${ox}px ${oy}px`, opacity, pointerEvents: "none" }} />;
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 46%, rgba(0,0,0,0) 55%, rgba(10,0,20,0.8) 100%)", opacity: strength, pointerEvents: "none" }} />
);
