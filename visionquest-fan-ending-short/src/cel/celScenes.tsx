import React from "react";
import { H, W, lerp, onTwos, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Ash, Boil, SoftGlow, flashAt } from "./celFx";
import { Sky } from "./env";
import { Profile, LOOKS } from "./characters";
import { wordFrame, lineFrame } from "../timing";

/* FAN-MADE VisionQuest post-credits scene (Don't Spoil It RG). Original designs, cel engine.
   Camera keys: [sec, zoom, x, y, rot]. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const Snow: React.FC<{ f: number; n?: number; seed?: number; size?: number; speed?: number; o?: number }> = ({ f, n = 90, seed = 1, size = 4, speed = 1.3, o = 0.85 }) =>
  <Ash f={f} n={n} color="#eef4ff" size={size} seed={seed} speed={speed} opacity={o} />;

/** mountain + ruined temple of Wundagore (original layout) */
const Ruins: React.FC<{ f: number; tint?: string; crack?: number }> = ({ f, tint = "#1c2436", crack = 0 }) => {
  const r = rand(7);
  const pillars = [[-60, 1300, 90, 520, -4], [180, 1340, 80, 380, 6], [760, 1330, 90, 600, -2], [980, 1360, 80, 300, 10]];
  return (
    <g>
      <path d="M -400,1240 L 0,820 L 260,1020 L 520,640 L 760,960 L 980,760 L 1480,1240 Z" fill="#141a28" stroke="#0a0e16" strokeWidth={4} />
      <path d="M 520,640 L 470,720 L 560,700 L 600,760 L 640,720 L 520,640 Z M 0,820 L -40,880 L 50,860 Z" fill="#dfe8f6" opacity={0.6} />
      <rect x={-400} y={1240} width={W + 800} height={900} fill={tint} />
      {pillars.map(([x, y, w, h, a], i) => (
        <g key={i} transform={`rotate(${a} ${x + w / 2} ${y})`}>
          <rect x={x} y={y - h} width={w} height={h} fill="#3a4254" stroke="#0e121a" strokeWidth={4} />
          {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={x} y1={y - h * t} x2={x + w} y2={y - h * t} stroke="#1e2430" strokeWidth={3} />)}
          <path d={`M ${x},${y - h} L ${x + w * 0.3},${y - h - 30} L ${x + w * 0.6},${y - h - 8} L ${x + w},${y - h - 26} L ${x + w},${y - h} Z`} fill="#3a4254" stroke="#0e121a" strokeWidth={3} />
          <path d={`M ${x + 4},${y - h - 4} L ${x + w - 4},${y - h - 18}`} stroke="#e8f0fa" strokeWidth={6} opacity={0.7} />
        </g>
      ))}
      {/* broken stone throne */}
      <path d="M 400,1330 L 400,1050 L 460,1000 L 620,1000 L 680,1050 L 680,1330 Z M 360,1330 L 720,1330 L 740,1380 L 340,1380 Z" fill="#454c5e" stroke="#0e121a" strokeWidth={5} />
      <path d="M 430,1040 L 650,1040" stroke="#e8f0fa" strokeWidth={8} opacity={0.6} />
      {/* rubble mounds */}
      {Array.from({ length: 16 }, (_, i) => {
        const x = r() * 1300 - 110, y = 1330 + r() * 200, s = 40 + r() * 90;
        return <path key={i} d={`M ${x - s},${y} L ${x - s * 0.4},${y - s * 0.7} L ${x + s * 0.3},${y - s * 0.8} L ${x + s},${y} Z`} fill={i % 2 ? "#3a4254" : "#2e3446"} stroke="#0e121a" strokeWidth={3} />;
      })}
      {crack > 0 && <path d="M 480,1400 l 30,-40 l -20,-30 l 40,-50 M 560,1420 l -20,-60 l 30,-40" stroke="#ff2a3a" strokeWidth={5} opacity={crack} fill="none" />}
      {void f}
    </g>
  );
};

/** Doom full-figure silhouette (green cloak, hood, iron mask) — local origin at feet */
const DoomFigure: React.FC<{ x: number; y: number; s: number; arm?: number; glow?: number; f: number }> = ({ x, y, s, arm = 0, glow = 0, f }) => {
  const flap = Math.sin(f / 9) * 10;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M -150,0 C -140,-200 -120,-420 -70,-560 L 70,-560 C 120,-420 140,-200 ${170 + flap},0 Z`} fill="#16391f" stroke="#04100a" strokeWidth={5} />
      <path d="M -60,-560 L 60,-560 L 70,-200 L -70,-200 Z" fill="#4a5260" stroke="#0a0e14" strokeWidth={4} />
      <path d="M -60,-200 L 60,-200 L 70,0 L 20,0 L 0,-120 L -20,0 L -70,0 Z" fill="#3a404c" stroke="#0a0e14" strokeWidth={4} />
      {/* hood + mask */}
      <path d="M -66,-560 C -90,-640 -60,-720 0,-726 C 60,-720 90,-640 66,-560 Z" fill="#1e4a2a" stroke="#04100a" strokeWidth={4} />
      <path d="M -38,-570 C -46,-620 -30,-680 0,-682 C 30,-680 46,-620 38,-570 Z" fill="#9aa1aa" stroke="#20262e" strokeWidth={3} />
      <path d="M -26,-640 L -6,-636 M 6,-636 L 26,-640" stroke="#05070a" strokeWidth={6} />
      <path d="M -14,-596 L 14,-596 M -12,-586 L 12,-586" stroke="#2a3038" strokeWidth={3} />
      {/* arm (raises with `arm`) */}
      <g transform={`rotate(${-arm * 150} 60 -500)`}>
        <path d="M 60,-500 L 90,-330 L 70,-320 L 40,-490 Z" fill="#16391f" stroke="#04100a" strokeWidth={4} />
        <path d="M 86,-340 L 96,-280 L 74,-276 L 66,-330 Z" fill="#8e959e" stroke="#20262e" strokeWidth={3} />
        {glow > 0 && <SoftGlow cx={86} cy={-280} rx={140} ry={140} color="#5aff8a" opacity={glow} />}
      </g>
    </g>
  );
};

/** green rune ring */
const Rune: React.FC<{ x: number; y: number; r: number; a: number; o: number }> = ({ x, y, r, a, o }) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`} opacity={o}>
    <circle r={r} fill="none" stroke="#6aff9a" strokeWidth={4} />
    <circle r={r * 0.72} fill="none" stroke="#6aff9a" strokeWidth={2} strokeDasharray="10 8" />
    {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M 0,${-r * 0.92} l ${r * 0.08},${r * 0.12} l ${-r * 0.16},0 Z`} fill="#b8ffd0" transform={`rotate(${i * 45})`} />)}
  </g>
);

/* 1 — end credits roll, then a scarlet spark */
export const V1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1, 0, 0, 0], [5, 1.04, 0, 0, 0]]);
  const fade = 1 - lerp(f, 0, 1, 95, 130);
  const spark = lerp(f, 0, 1, 110, 140);
  return (
    <Stage cam={cameraAt(s, f)} bg="#000">
      <Layer depth={0.5}>
        <g opacity={fade} transform={`translate(0 ${-f * 5})`}>
          <text x={540} y={760} textAnchor="middle" fontFamily="Cinzel" fontWeight={900} fontSize={84} fill="#e8eef6">VISIONQUEST</text>
          {Array.from({ length: 34 }, (_, i) => { const r = rand(i + 5); return (
            <g key={i}>
              <rect x={540 - 30 - r() * 220} y={900 + i * 64} width={120 + r() * 120} height={16} rx={6} fill="#9aa4b2" opacity={0.55} />
              <rect x={560} y={900 + i * 64} width={140 + r() * 160} height={16} rx={6} fill="#e8eef6" opacity={0.7} />
            </g>); })}
        </g>
        <SoftGlow cx={540} cy={960} rx={160 * spark + 1} ry={160 * spark + 1} color="#ff2a3a" opacity={spark * (0.6 + 0.4 * pulse(f, 9))} />
        <circle cx={540} cy={960} r={10 * spark} fill="#ffd0d4" opacity={spark} />
      </Layer>
    </Stage>
  );
};

/* 2 — Wundagore in the snow (canon setting) */
export const V2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.08, 0, -260, 0], [5, 1.12, 0, 80, 0]]);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0a0e18" defs={<Boil id="vb2" f={f} scale={2} />}>
      <Layer depth={0.1}><Sky f={f} id="v2" top="#04060e" mid="#141c32" bottom="#2a3a5a" clouds="#1a2236" cloudOpacity={0.6} seed={9} />
        <circle cx={800} cy={360} r={70} fill="#e8eef8" /><SoftGlow cx={800} cy={360} rx={260} ry={260} color="#bcd0f0" opacity={0.4} /></Layer>
      <Layer depth={0.6}><Ruins f={f} /></Layer>
      <Layer depth={1.0}><Snow f={f} n={110} seed={2} /></Layer>
      <Layer depth={1.4}><Snow f={f} n={30} seed={3} size={9} speed={2.4} o={0.7} /></Layer>
    </Stage>
  );
};

/* 3 — flashback: the mountain falls (canon, Multiverse of Madness) */
export const V3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.06, 0, 0, 0], [5, 1.14, 0, -40, 0]]);
  const burst = 0.6 + 0.4 * pulse(f, 7);
  return (
    <Stage cam={cameraAt(s, f, 10 + 14 * pulse(f, 11))} bg="#1a0606" defs={<Boil id="vb3" f={f} scale={2.4} />}>
      <Layer depth={0.2}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#2a0a0a" /><SoftGlow cx={540} cy={1000} rx={700} ry={700} color="#c8202a" opacity={0.5 * burst} /></Layer>
      <Layer depth={0.6}><g opacity={0.9}><Ruins f={f} tint="#2a1212" /></g></Layer>
      <Layer depth={0.75}>
        {/* Wanda silhouette, arms raised, inside red energy */}
        <SoftGlow cx={540} cy={1060} rx={300} ry={380} color="#ff3a3a" opacity={0.8 * burst} />
        <g transform="translate(540 1330)" fill="#120406">
          <path d="M -40,0 L -30,-240 L 30,-240 L 40,0 Z" /><circle cx={0} cy={-280} r={36} />
          <path d="M -26,-300 L -14,-350 L 0,-310 L 14,-350 L 26,-300 Z" />
          <path d="M -28,-230 L -120,-400 L -100,-410 L -14,-250 Z M 28,-230 L 120,-400 L 100,-410 L 14,-250 Z" />
          <path d="M -40,-60 L -120,0 L 120,0 L 40,-60 Z" />
        </g>
      </Layer>
      <Layer depth={1.1}>
        {Array.from({ length: 14 }, (_, i) => { const r = rand(i + 30); const t0 = r() * 120; const p = clamp((f - t0) / 50); if (p <= 0) return null;
          const x = r() * W, y = -200 + p * p * 1900, sz = 40 + r() * 90;
          return <path key={i} d={`M ${x - sz},${y} L ${x - sz * 0.3},${y - sz} L ${x + sz},${y - sz * 0.6} L ${x + sz * 0.6},${y + sz * 0.5} Z`} fill="#2a1414" stroke="#000" strokeWidth={4} transform={`rotate(${f * (r() * 6 - 3)} ${x} ${y})`} />; })}
        <Ash f={f} n={60} color="#3a1a1a" size={6} seed={31} speed={4} opacity={0.8} />
      </Layer>
      <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#5a1010" opacity={0.18} />
      <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#fff" opacity={flashAt(f, 138) * 0.8} />
    </Stage>
  );
};

/* 4 — the scarlet glow under the rubble */
export const V4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.05, 0, 0, 0], [5, 1.4, 0, 120, 0]]);
  const beat = Math.pow(pulse(f, 34), 4);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0a0e18" defs={<Boil id="vb4" f={f} scale={2.4} />}>
      <Layer depth={0.2}><Sky f={f} id="v4" top="#04060e" mid="#101828" bottom="#1e2a44" clouds="#141c2e" seed={19} /></Layer>
      <Layer depth={0.8}>
        <path d="M -400,1200 L 100,980 L 300,1060 L 540,900 L 800,1040 L 1000,960 L 1500,1200 L 1500,2400 L -400,2400 Z" fill="#2e3446" stroke="#0e121a" strokeWidth={5} />
        {Array.from({ length: 12 }, (_, i) => { const r = rand(i + 60); const x = r() * 1200 - 60, y = 1000 + r() * 500, sz = 60 + r() * 120;
          return <path key={i} d={`M ${x - sz},${y} L ${x - sz * 0.4},${y - sz * 0.7} L ${x + sz * 0.3},${y - sz * 0.8} L ${x + sz},${y} Z`} fill={i % 2 ? "#3a4254" : "#262c3c"} stroke="#0e121a" strokeWidth={3} />; })}
        <SoftGlow cx={540} cy={1160} rx={260} ry={120} color="#ff2a3a" opacity={0.35 + beat * 0.5} />
        <g stroke="#ff4a5a" strokeWidth={6} fill="none" opacity={0.5 + beat * 0.5}>
          <path d="M 470,1180 l 30,-40 l -20,-30 l 40,-50" /><path d="M 560,1200 l -20,-60 l 30,-40 l -10,-40" /><path d="M 600,1170 l 50,-20 l 20,-40" />
        </g>
        {Array.from({ length: 6 }, (_, i) => { const r = rand(i + 80); const p = ((f + r() * 60) % 80) / 80;
          return <path key={i} d={`M ${500 + r() * 80},${1150 - p * 300} q 20,-30 0,-60`} stroke="#ff5a6a" strokeWidth={4} opacity={(1 - p) * 0.7} fill="none" />; })}
      </Layer>
      <Layer depth={1.2}><Snow f={f} n={80} seed={4} /></Layer>
    </Stage>
  );
};

/* 5 — armoured footsteps, then tilt up to the green cloak and iron mask */
export const V5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.3, 0, 420, 0], [2.8, 1.3, 0, 400, 0], [5, 1.0, 0, -60, 0]]);
  const walk = lerp(f, -300, 420, 0, 100, (x) => x);
  const stepPh = (f % 24) / 24;
  return (
    <Stage cam={cameraAt(s, f, f < 90 && stepPh < 0.1 ? 6 : 0)} bg="#0a0e18" defs={<Boil id="vb5" f={f} scale={2.2} />}>
      <Layer depth={0.1}><Sky f={f} id="v5" top="#04060e" mid="#141c32" bottom="#2a3a5a" clouds="#1a2236" seed={29} />
        <circle cx={540} cy={560} r={120} fill="#e8eef8" /><SoftGlow cx={540} cy={560} rx={360} ry={360} color="#bcd0f0" opacity={0.45} /></Layer>
      <Layer depth={0.85}>
        <rect x={-400} y={1500} width={W + 800} height={900} fill="#d8e2f0" />
        <path d="M -400,1500 C 0,1470 400,1520 1480,1480 L 1480,1540 L -400,1540 Z" fill="#b8c4d8" />
        {/* footprints */}
        {Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx={-200 + i * 120} cy={1620 + (i % 2) * 40} rx={36} ry={14} fill="#8a98b0" opacity={walk > -200 + i * 120 ? 0.7 : 0} />)}
        <g transform={`translate(${walk} 0)`}>
          <DoomFigure x={0} y={1640} s={1.5} f={f} />
        </g>
      </Layer>
      <Layer depth={1.3}><Snow f={f} n={70} seed={5} size={6} speed={2} /></Layer>
    </Stage>
  );
};

/* 6 — Doom in profile, moonlit */
export const V6: React.FC<P> = ({ f }) => {
  const s = cam(6, [[0, 1.0, 0, 0, 0], [5, 1.16, -40, -60, 0]]);
  const ft = onTwos(f);
  return (
    <Stage cam={cameraAt(s, f)} bg="#060a12" defs={<Boil id="vb6" f={f} scale={2.2} />}>
      <Layer depth={0.15}><Sky f={f} id="v6" top="#04060e" mid="#101828" bottom="#22304a" clouds="#141c2e" seed={39} /><SoftGlow cx={240} cy={500} rx={420} ry={420} color="#bcd0f0" opacity={0.35} /></Layer>
      <Layer depth={0.5}><g opacity={0.6}><Ruins f={f} /></g></Layer>
      <Layer depth={0.9}>
        <g filter="url(#vb6)">
          <Profile id="doom6" look={LOOKS.doom} x={660} y={1000} scale={2.3} flip rim="#cfe0ff" rimStrength={1.1} light={0.55} breathe={Math.sin(ft / 30)} tilt={2} />
        </g>
      </Layer>
      <Layer depth={1.3}><Snow f={f} n={70} seed={6} size={6} speed={1.6} /></Layer>
    </Stage>
  );
};

/* 7 — one raised hand: the stones lift */
export const V7: React.FC<P> = ({ f }) => {
  const s = cam(7, [[0, 1.04, 0, 120, 0], [5, 1.0, 0, -160, 0]]);
  const arm = lerp(f, 0, 1, 10, 40);
  const lift = lerp(f, 0, 1, 40, 150);
  const glow = 0.4 + 0.5 * arm * (0.8 + 0.2 * Math.sin(f * 0.7));
  return (
    <Stage cam={cameraAt(s, f, 4 + 8 * lift)} bg="#060a12" defs={<Boil id="vb7" f={f} scale={2.4} />}>
      <Layer depth={0.15}><Sky f={f} id="v7" top="#04060e" mid="#101828" bottom="#22304a" clouds="#141c2e" seed={49} /></Layer>
      <Layer depth={0.6}>
        <path d="M -400,1450 L 1480,1450 L 1480,2400 L -400,2400 Z" fill="#2e3446" />
        {Array.from({ length: 9 }, (_, i) => { const r = rand(i + 90); const x = 200 + r() * 760, y0 = 1420 - r() * 60, sz = 70 + r() * 110;
          const y = y0 - lift * (380 + r() * 520) + Math.sin(f / 14 + i) * 10 * lift;
          return (
            <g key={i} transform={`rotate(${lift * (r() * 30 - 15)} ${x} ${y})`}>
              <path d={`M ${x - sz},${y} L ${x - sz * 0.4},${y - sz * 0.8} L ${x + sz * 0.5},${y - sz * 0.7} L ${x + sz},${y + sz * 0.2} L ${x + sz * 0.2},${y + sz * 0.5} Z`} fill="#3a4254" stroke="#6aff9a" strokeOpacity={0.35 + 0.5 * lift} strokeWidth={5} />
              <SoftGlow cx={x} cy={y} rx={sz * 1.3} ry={sz} color="#5aff8a" opacity={0.18 * lift} />
              {lift > 0.1 && <path d={`M ${x},${y + sz * 0.5} l -8,${60 * lift} M ${x + 30},${y + sz * 0.4} l 6,${80 * lift}`} stroke="#8a90a0" strokeWidth={3} opacity={0.5} />}
            </g>);
        })}
      </Layer>
      <Layer depth={0.95}><g filter="url(#vb7)"><DoomFigure x={200} y={1900} s={1.45} arm={arm} glow={glow} f={f} /></g></Layer>
      <Layer depth={1.3}><Snow f={f} n={60} seed={7} size={6} speed={1.6} /><Ash f={f} n={40} color="#7a808e" size={4} seed={71} speed={3} opacity={0.7 * lift} /></Layer>
    </Stage>
  );
};

/* 8 — Wanda beneath the stones */
export const V8: React.FC<P> = ({ f }) => {
  const s = cam(8, [[0, 1.0, 0, -60, 0], [5, 1.18, 40, 40, 0]]);
  const ft = onTwos(f);
  const wisps = 0.4 + 0.6 * Math.max(0, Math.sin(f / 6)) * (f % 47 < 30 ? 1 : 0.2);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0e1018" defs={<Boil id="vb8" f={f} scale={2.2} />}>
      <Layer depth={0.3}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#2a3040" />
        {Array.from({ length: 22 }, (_, i) => { const r = rand(i + 100); const x = r() * 1300 - 110, y = r() * 1900, sz = 60 + r() * 120;
          return <path key={i} d={`M ${x - sz},${y} L ${x - sz * 0.4},${y - sz * 0.7} L ${x + sz * 0.3},${y - sz * 0.8} L ${x + sz},${y} L ${x + sz * 0.3},${y + sz * 0.5} Z`} fill={i % 2 ? "#3a4254" : "#262c3c"} stroke="#0e121a" strokeWidth={3} />; })}
        <rect x={-400} y={700} width={W + 800} height={700} fill="#1a1e28" opacity={0.6} />
      </Layer>
      <Layer depth={0.8}>
        <g transform="rotate(-90 560 1000)">
          <g filter="url(#vb8)"><Profile id="wan8" look={LOOKS.wanda} x={560} y={1000} scale={1.9} rim="#ff6a7a" rimStrength={0.5 + 0.4 * wisps} light={0.45} blink breathe={Math.sin(ft / 40) * 0.5} /></g>
        </g>
        {Array.from({ length: 7 }, (_, i) => { const r = rand(i + 120); const p = ((f + r() * 70) % 90) / 90;
          return <path key={i} d={`M ${380 + r() * 360},${900 - p * 300} q 24,-30 0,-60 q -24,-30 0,-60`} stroke="#ff4a5a" strokeWidth={5} opacity={(1 - p) * 0.6 * wisps} fill="none" />; })}
      </Layer>
      <Layer depth={1.2}><Snow f={f} n={60} seed={8} size={5} speed={1} /></Layer>
    </Stage>
  );
};

/* 9 — Doom kneels; gauntlet to her forehead; green runes pour in */
export const V9: React.FC<P> = ({ f }) => {
  const s = cam(9, [[0, 1.04, 0, 0, 0], [5, 1.16, 60, 40, 0]]);
  const reach = lerp(f, 0, 1, 20, 60);
  const rune = lerp(f, 0, 1, wordFrame(9, 9) - 6, wordFrame(9, 9) + 20);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0a0e16" defs={<Boil id="vb9" f={f} scale={2.2} />}>
      <Layer depth={0.2}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#161c2a" /><SoftGlow cx={540} cy={800} rx={700} ry={500} color="#3a8a5a" opacity={0.25 + 0.35 * rune} /></Layer>
      <Layer depth={0.8}>
        <rect x={-400} y={1380} width={W + 800} height={900} fill="#2a3040" />
        <g transform="rotate(-90 760 1420)"><Profile id="wan9" look={LOOKS.wanda} x={760} y={1420} scale={1.3} rim="#ff6a7a" rimStrength={0.5} light={0.45} blink /></g>
        <g filter="url(#vb9)">
          <Profile id="doom9" look={LOOKS.doom} x={300} y={880} scale={1.7} rim="#9affc0" rimStrength={0.4 + 0.8 * rune} light={0.5} tilt={18} />
          <path d={`M 440,1220 Q ${560 + reach * 60},${1200 + reach * 60} ${560 + reach * 160},${1260 + reach * 120}`} stroke="#16391f" strokeWidth={60} strokeLinecap="round" fill="none" />
          <circle cx={560 + reach * 160} cy={1260 + reach * 120} r={36} fill="#8e959e" stroke="#20262e" strokeWidth={4} />
        </g>
        {rune > 0 && <>
          <SoftGlow cx={720} cy={1380} rx={200} ry={200} color="#5aff8a" opacity={0.7 * rune} />
          <Rune x={720} y={1380} r={110} a={f * 3} o={rune} />
          {[0, 1, 2].map((k) => { const p = ((f / 20 + k / 3) % 1); return <Rune key={k} x={460 + p * 260} y={1220 + p * 160} r={34} a={-f * 6} o={rune * (1 - p)} />; })}
        </>}
      </Layer>
      <Layer depth={1.2}><Snow f={f} n={50} seed={9} size={5} speed={1} /></Layer>
      <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#b8ffd0" opacity={flashAt(f, 142) * 0.6} />
    </Stage>
  );
};

/* 10 — her eyes snap open, glowing red: "Why save me?" */
export const V10: React.FC<P> = ({ f }) => {
  const s = cam(10, [[0, 1.0, 0, 0, 0], [5, 1.12, -30, -50, 0]]);
  const open = f >= 6;
  const red = lerp(f, 0, 1, 4, 14);
  const ask = lineFrame(10, 1);
  return (
    <Stage cam={cameraAt(s, f, f < 12 ? 10 : 0)} bg="#100608" defs={<Boil id="vb10" f={f} scale={2.2} />}>
      <Layer depth={0.2}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#1a0e14" /><SoftGlow cx={540} cy={900} rx={700} ry={700} color="#a01a24" opacity={0.35 * red} /></Layer>
      <Layer depth={0.85}>
        <g filter="url(#vb10)">
          <Profile id="wan10" look={{ ...LOOKS.wanda, eyeColor: open ? "#ff3a3a" : "#120c0c" }} x={380} y={1000} scale={2.4} rim="#ff6a7a" rimStrength={0.6 + 0.6 * red} light={0.55}
            blink={!open} tilt={lerp(f, 8, -4, 0, 20) + (f > ask ? lerp(f, 0, 3, ask, ask + 20) : 0)} breathe={Math.sin(onTwos(f) / 18)} />
        </g>
        {open && <><SoftGlow cx={380 + 72 * 2.4} cy={1000 - 30 * 2.4} rx={90} ry={60} color="#ff3a3a" opacity={0.85 * red} /><circle cx={380 + 72 * 2.4} cy={1000 - 30 * 2.4} r={9} fill="#ffd0d4" opacity={red} /></>}
        {Array.from({ length: 8 }, (_, i) => { const r = rand(i + 140); const p = ((f + r() * 70) % 70) / 70;
          return <path key={i} d={`M ${300 + r() * 500},${1100 - p * 500} q 26,-34 0,-68 q -26,-34 0,-68`} stroke="#ff4a5a" strokeWidth={5} opacity={(1 - p) * 0.7 * red} fill="none" />; })}
      </Layer>
      <Layer depth={1.2}><Snow f={f} n={40} seed={10} size={5} speed={1} o={0.6} /></Layer>
    </Stage>
  );
};

/* 11 — Doom: "Because the multiverse is ending, and I need the Scarlet Witch." */
export const V11: React.FC<P> = ({ f }) => {
  const s = cam(11, [[0, 1.0, 0, 0, 0], [5, 1.22, 60, -80, 0]]);
  const g = 0.5 + 0.3 * pulse(f, 20);
  return (
    <Stage cam={cameraAt(s, f)} bg="#04080a" defs={<Boil id="vb11" f={f} scale={2.2} />}>
      <Layer depth={0.2}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#0a1410" /><SoftGlow cx={700} cy={800} rx={700} ry={700} color="#2a8a4a" opacity={0.3 * g} /></Layer>
      <Layer depth={0.5}>{[0, 1].map((k) => <Rune key={k} x={k ? 860 : 220} y={k ? 520 : 1300} r={k ? 160 : 110} a={f * (k ? 1.5 : -2)} o={0.25} />)}</Layer>
      <Layer depth={0.9}>
        <g filter="url(#vb11)">
          <Profile id="doom11" look={LOOKS.doom} x={680} y={980} scale={2.5} flip rim="#9affc0" rimStrength={0.9 * g + 0.3} light={0.5} breathe={Math.sin(onTwos(f) / 30)} tilt={-2} />
        </g>
        <path d={`M ${680 - 46 * 2.5},${980 - 33 * 2.5} L ${680 - 92 * 2.5},${980 - 30 * 2.5}`} stroke="#5aff8a" strokeWidth={6} opacity={0.4 + 0.4 * g} />
      </Layer>
      <Layer depth={1.3}><Snow f={f} n={50} seed={11} size={6} speed={1.5} o={0.7} /></Layer>
    </Stage>
  );
};

/* 12 — far away, Vision opens his eyes (title slate in Main.tsx) */
export const V12: React.FC<P> = ({ f }) => {
  const s = cam(12, [[0, 1.12, 0, 60, 0], [5, 1.0, 0, 0, 0]]);
  const open = f >= wordFrame(12, 3);
  return (
    <Stage cam={cameraAt(s, f)} bg="#080a10" defs={<Boil id="vb12" f={f} scale={2} />}>
      <Layer depth={0.2}><rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#10141e" /><SoftGlow cx={300} cy={1300} rx={600} ry={500} color="#6a8ac0" opacity={0.25} /></Layer>
      <Layer depth={0.85}>
        <g filter="url(#vb12)">
          <Profile id="vis12" look={{ ...LOOKS.vision, eyeColor: open ? "#9fd8ff" : "#120c0c" }} x={330} y={1420} scale={1.8} rim="#cfe0ff" rimStrength={0.9} light={0.7} blink={!open} tilt={open ? -4 : 2} breathe={Math.sin(onTwos(f) / 30)} />
        </g>
        {open && <SoftGlow cx={330 + 72 * 1.8} cy={1420 - 30 * 1.8} rx={50} ry={34} color="#9fd8ff" opacity={0.6} />}
        {/* a single red spark drifting in the dark: she is alive */}
        <SoftGlow cx={800 + Math.sin(f / 20) * 30} cy={1260 - f * 1.2} rx={60} ry={60} color="#ff2a3a" opacity={0.6 * pulse(f, 14)} />
      </Layer>
      <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#000" opacity={lerp(f, 0, 0.55, 66, 90)} />
    </Stage>
  );
};

export const CEL_SCENES = [V1, V2, V3, V4, V5, V6, V7, V8, V9, V10, V11, V12];
