import React, { createContext, useContext, useMemo } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { H, W, SceneData, lerp, rand, wobble, SCENE_FRAMES } from "./lib";

/* ------------------------------------------------------------------ camera */
type Cam = { x: number; y: number; zoom: number; rot: number };
const CamCtx = createContext<Cam>({ x: 0, y: 0, zoom: 1, rot: 0 });

/** Camera from the scene's timed phases: keys = [[sec, zoom, x, y, rot], …], eased per phase. */
export const cameraAt = (s: SceneData, f: number, shake = 0): Cam => {
  const k = s.camera.keys;
  const t = f / 30;
  let i = 0;
  while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const [t0, z0, x0, y0, r0] = k[i];
  const [t1, z1, x1, y1, r1] = k[Math.min(i + 1, k.length - 1)];
  const p = t1 > t0 ? Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) : 1;
  const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease in-out per phase
  const L = (a: number, b: number) => a + (b - a) * e;
  return {
    x: L(x0, x1) + wobble(f, s.id, 0.9) * shake,
    y: L(y0, y1) + wobble(f, s.id + 5, 1.1) * shake,
    zoom: L(z0, z1),
    rot: L(r0, r1),
  };
};

/** One SVG stage per scene; children are <Layer depth=…> planes. */
export const Stage: React.FC<{ cam: Cam; bg?: string; children: React.ReactNode; defs?: React.ReactNode }> = ({
  cam, bg = "#05070a", children, defs,
}) => (
  <CamCtx.Provider value={cam}>
    <AbsoluteFill style={{ background: bg }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <SharedDefs />
          {defs}
        </defs>
        <g transform={`rotate(${cam.rot} ${W / 2} ${H / 2})`}>{children}</g>
      </svg>
    </AbsoluteFill>
  </CamCtx.Provider>
);

/** Parallax plane: depth 0 = infinitely far, 1 = subject plane, >1 = foreground. */
export const Layer: React.FC<{ depth: number; children: React.ReactNode; filter?: string; opacity?: number }> = ({
  depth, children, filter, opacity,
}) => {
  const c = useContext(CamCtx);
  const z = 1 + (c.zoom - 1) * depth;
  const tx = -c.x * depth, ty = -c.y * depth;
  return (
    <g
      opacity={opacity}
      filter={filter}
      transform={`translate(${W / 2 + tx} ${H / 2 + ty}) scale(${z}) translate(${-W / 2} ${-H / 2})`}
    >
      {children}
    </g>
  );
};

/* ------------------------------------------------------------------ shared filters */
export const SharedDefs: React.FC = () => (
  <>
    <filter id="blur2"><feGaussianBlur stdDeviation="2" /></filter>
    <filter id="blur6"><feGaussianBlur stdDeviation="6" /></filter>
    <filter id="blur14"><feGaussianBlur stdDeviation="14" /></filter>
    <filter id="blur30"><feGaussianBlur stdDeviation="30" /></filter>
    <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="glowSoft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="22" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <radialGradient id="vign" cx="50%" cy="48%" r="75%">
      <stop offset="55%" stopColor="#000" stopOpacity="0" />
      <stop offset="100%" stopColor="#000" stopOpacity="0.85" />
    </radialGradient>
    <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#000" stopOpacity="0" />
      <stop offset="1" stopColor="#000" stopOpacity="0.9" />
    </linearGradient>
  </>
);

/** "Boiling line" — hand-drawn 90s cel wobble. Seed steps every 3 frames. */
export const Boil: React.FC<{ id: string; f: number; scale?: number }> = ({ id, f, scale = 3 }) => (
  <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={Math.floor(f / 3) % 9} result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
  </filter>
);

/** Painted-cloud texture filter for skies/smoke */
export const Painterly: React.FC<{ id: string; freq?: number; scale?: number; seed?: number }> = ({
  id, freq = 0.012, scale = 60, seed = 3,
}) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="4" seed={seed} result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" result="d" />
    <feGaussianBlur in="d" stdDeviation="3" />
  </filter>
);

/* ------------------------------------------------------------------ particles */
export const Rain: React.FC<{ f: number; n?: number; angle?: number; color?: string; speed?: number; len?: number; seed?: number; opacity?: number }> = ({
  f, n = 140, angle = 12, color = "#9fb6c8", speed = 70, len = 70, seed = 1, opacity = 0.5,
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

export const Ash: React.FC<{ f: number; n?: number; color?: string; seed?: number; size?: number; rise?: boolean; speed?: number; opacity?: number; glow?: boolean }> = ({
  f, n = 70, color = "#c9c2b8", seed = 2, size = 4, rise = false, speed = 1.4, opacity = 0.8, glow = false,
}) => {
  const p = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, s: 0.4 + r(), ph: r() * 100, a: 0.4 + r() * 0.6 }));
  }, [n, seed]);
  return (
    <g filter={glow ? "url(#glowBlue)" : undefined}>
      {p.map((q, i) => {
        const dy = (rise ? -1 : 1) * f * speed * q.s;
        const y = (((q.y + dy) % H) + H) % H;
        const x = q.x + Math.sin((f + q.ph) / 22) * 30 * q.s;
        return (
          <ellipse key={i} cx={x} cy={y} rx={size * q.s} ry={size * q.s * 0.6}
            transform={`rotate(${(f * 3 + q.ph * 7) % 360} ${x} ${y})`} fill={color} opacity={q.a * opacity} />
        );
      })}
    </g>
  );
};

/** Rising smoke column built from blurred puffs (painted look via filter id) */
export const Smoke: React.FC<{ f: number; x: number; y: number; scale?: number; color?: string; seed?: number; opacity?: number; filter?: string }> = ({
  f, x, y, scale = 1, color = "#2a2826", seed = 4, opacity = 0.85, filter = "url(#blur14)",
}) => {
  const puffs = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: 16 }, (_, i) => ({ t: i / 16, ph: r() * 6, s: 0.7 + r() * 0.6 }));
  }, [seed]);
  return (
    <g filter={filter} opacity={opacity}>
      {puffs.map((p, i) => {
        const t = (p.t + f / 220) % 1;
        const py = y - t * 900 * scale;
        const px = x + Math.sin(t * 5 + p.ph) * 40 * scale + t * 140 * scale;
        const rr = (40 + t * 170) * scale * p.s;
        return <circle key={i} cx={px} cy={py} r={rr} fill={color} opacity={Math.sin(t * Math.PI) * 0.9} />;
      })}
    </g>
  );
};

/** lightning bolt path generator */
export const Bolt: React.FC<{ x: number; y: number; len: number; seed: number; opacity: number; color?: string }> = ({
  x, y, len, seed, opacity, color = "#dfe9ff",
}) => {
  const d = useMemo(() => {
    const r = rand(seed);
    let px = x, py = y, s = `M${px} ${py}`;
    const branches: string[] = [];
    for (let i = 0; i < 14; i++) {
      px += (r() - 0.5) * 70; py += len / 14;
      s += ` L${px.toFixed(1)} ${py.toFixed(1)}`;
      if (r() > 0.75) {
        let bx = px, by = py, b = `M${bx} ${by}`;
        for (let k = 0; k < 4; k++) { bx += (r() - 0.3) * 60; by += len / 22; b += ` L${bx} ${by}`; }
        branches.push(b);
      }
    }
    return { s, branches };
  }, [x, y, len, seed]);
  if (opacity <= 0.01) return null;
  return (
    <g opacity={opacity} filter="url(#glowBlue)" stroke={color} fill="none" strokeLinejoin="round">
      <path d={d.s} strokeWidth={5} />
      {d.branches.map((b, i) => <path key={i} d={b} strokeWidth={2} />)}
    </g>
  );
};

/** flash envelope for lightning: short double-strike */
export const flashAt = (f: number, at: number) => {
  const t = f - at;
  if (t < 0 || t > 14) return 0;
  return t < 2 ? 1 : t < 4 ? 0.3 : t < 6 ? 0.85 : Math.max(0, 1 - (t - 6) / 8) * 0.5;
};

/* ------------------------------------------------------------------ screen overlays (HTML) */
export const Grain: React.FC<{ f: number; opacity?: number }> = ({ f, opacity = 0.16 }) => {
  const r = rand(Math.floor(f / 2));
  const ox = Math.floor(r() * 1024), oy = Math.floor(r() * 1024);
  return (
    <AbsoluteFill style={{
      backgroundImage: `url(${staticFile("grain.png")})`, backgroundPosition: `${ox}px ${oy}px`,
      mixBlendMode: "overlay", opacity, pointerEvents: "none",
    }} />
  );
};

/** dust specks + occasional scratch: aged cel / film print */
export const FilmDamage: React.FC<{ f: number }> = ({ f }) => {
  const r = rand(f * 7 + 3);
  const specks = Array.from({ length: 5 }, () => ({ x: r() * W, y: r() * H, s: 1 + r() * 4, on: r() > 0.45 }));
  const scratch = r() > 0.82 ? r() * W : -10;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H}>
        {specks.filter((s) => s.on).map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#000" opacity={0.5} />)}
        <line x1={scratch} y1={0} x2={scratch + 6} y2={H} stroke="#d8d2c4" strokeWidth={1.2} opacity={0.18} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <AbsoluteFill style={{
    background: "radial-gradient(ellipse 80% 70% at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.88) 100%)",
    opacity: strength, pointerEvents: "none",
  }} />
);

/** optional painted keyframe plate: if scene.keyframe is set, show it as the BG plate */
export const KeyframePlate: React.FC<{ s: SceneData; f: number }> = ({ s, f }) => {
  if (!s.keyframe) return null; // set "keyframe": "keyframes/scene_XX.png" in scenes.json
  const c = cameraAt(s, f);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile(s.keyframe as string)} style={{
        width: W, height: H, objectFit: "cover",
        transform: `translate(${-c.x * 0.6}px, ${-c.y * 0.6}px) scale(${c.zoom}) rotate(${c.rot}deg)`,
      }} />
    </AbsoluteFill>
  );
};

export const sceneT = (f: number) => Math.max(0, Math.min(SCENE_FRAMES, f));
