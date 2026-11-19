import React from "react";
import { H, W, lerp, onTwos, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow } from "./celFx";
import { Profile, LOOKS, Figure } from "./characters";
import { wordFrame } from "../timing";

/* DAY 1 #3 — the shrew's fiddle (Halsgeige). Original cel illustrations. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const WOOD = "#8a5a32", WOOD_D = "#4a2e18", IRON = "#3a3a40";

/** timber-framed town square backdrop */
const Square: React.FC<{ f: number; crowd?: number; laugh?: number }> = ({ f, crowd = 0, laugh = 0 }) => (
  <>
    <Layer depth={0.1}>
      <defs><linearGradient id="skyM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8ac8e8" /><stop offset="1" stopColor="#f4e8c8" /></linearGradient></defs>
      <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="url(#skyM)" />
    </Layer>
    <Layer depth={0.35}>
      {[[-200, 300], [110, 260], [380, 280], [660, 250], [920, 300]].map(([x, w], i) => {
        const h = 520 + (i % 2) * 80, y = 1150;
        return (
          <g key={i}>
            <rect x={x} y={y - h} width={w} height={h} fill="#efe2c4" stroke="#3a2416" strokeWidth={5} />
            {[0.25, 0.55, 0.85].map((t) => <line key={t} x1={x} y1={y - h * t} x2={x + w} y2={y - h * t} stroke="#4a2e18" strokeWidth={10} />)}
            {[0, 0.5, 1].map((t) => <line key={`v${t}`} x1={x + w * t} y1={y - h} x2={x + w * t} y2={y} stroke="#4a2e18" strokeWidth={10} />)}
            <path d={`M ${x},${y - h * 0.55} L ${x + w * 0.5},${y - h * 0.85} M ${x + w},${y - h * 0.55} L ${x + w * 0.5},${y - h * 0.85}`} stroke="#4a2e18" strokeWidth={8} />
            <rect x={x + w * 0.15} y={y - h * 0.48} width={w * 0.22} height={h * 0.16} fill="#3a4a5a" stroke="#3a2416" strokeWidth={4} />
            <rect x={x + w * 0.62} y={y - h * 0.48} width={w * 0.22} height={h * 0.16} fill="#3a4a5a" stroke="#3a2416" strokeWidth={4} />
            <path d={`M ${x - 20},${y - h} L ${x + w / 2},${y - h - 220} L ${x + w + 20},${y - h} Z`} fill={i % 2 ? "#9a3a2a" : "#7a4a3a"} stroke="#3a2416" strokeWidth={5} />
          </g>
        );
      })}
      <rect x={-400} y={1150} width={W + 800} height={1000} fill="#a8987a" />
      {Array.from({ length: 70 }, (_, i) => { const r = rand(i + 9); return <ellipse key={i} cx={r() * 1300 - 110} cy={1170 + r() * 900} rx={26 + r() * 20} ry={12} fill="#8a7a60" opacity={0.6} />; })}
      {crowd > 0 && Array.from({ length: 9 }, (_, i) => {
        const r = rand(i + 40); const bob = laugh * Math.abs(Math.sin(f / 4 + i)) * 10;
        return <Figure key={i} x={40 + i * 125 + r() * 30} y={1240 - bob} h={240 + r() * 60} color={["#3a2a2a", "#2a3a4a", "#4a3a2a"][i % 3]} flip={i % 2 === 0} />;
      })}
    </Layer>
  </>
);

/** front view of the fiddle device. double = two-person version */
const FiddleFront: React.FC<{ x: number; y: number; s: number; double?: boolean; label?: string; open?: number }> = ({ x, y, s, double, label, open = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {!double ? (
      <g>
        <path d="M -60,-260 C -120,-250 -130,-180 -90,-140 C -130,-100 -120,-20 -60,0 L -40,180 C -60,220 -40,260 0,262 C 40,260 60,220 40,180 L 60,0 C 120,-20 130,-100 90,-140 C 130,-180 120,-250 60,-260 Z" fill={WOOD} stroke={WOOD_D} strokeWidth={8} />
        <circle cx={0} cy={-170} r={52} fill="#2a1a10" stroke={IRON} strokeWidth={8} />
        <circle cx={-18} cy={150} r={20} fill="#2a1a10" stroke={IRON} strokeWidth={6} />
        <circle cx={18} cy={150} r={20} fill="#2a1a10" stroke={IRON} strokeWidth={6} />
        <path d="M -40,-200 C -20,-120 -30,0 -16,120 M 40,-200 C 20,-120 30,0 16,120" stroke="#6a4224" strokeWidth={4} fill="none" />
        <rect x={-74} y={-176} width={148} height={14} fill={IRON} />
      </g>
    ) : (
      <g>
        <g transform={`translate(${-open * 120} 0)`}>
          <path d="M -520,-60 C -560,-60 -570,60 -520,60 L 0,40 L 0,-40 Z" fill={WOOD} stroke={WOOD_D} strokeWidth={8} />
          <circle cx={-420} cy={0} r={44} fill="#2a1a10" stroke={IRON} strokeWidth={7} />
          <circle cx={-250} cy={-10} r={16} fill="#2a1a10" stroke={IRON} strokeWidth={5} /><circle cx={-250} cy={22} r={16} fill="#2a1a10" stroke={IRON} strokeWidth={5} />
        </g>
        <g transform={`translate(${open * 120} 0)`}>
          <path d="M 520,-60 C 560,-60 570,60 520,60 L 0,40 L 0,-40 Z" fill={WOOD} stroke={WOOD_D} strokeWidth={8} />
          <circle cx={420} cy={0} r={44} fill="#2a1a10" stroke={IRON} strokeWidth={7} />
          <circle cx={250} cy={-10} r={16} fill="#2a1a10" stroke={IRON} strokeWidth={5} /><circle cx={250} cy={22} r={16} fill="#2a1a10" stroke={IRON} strokeWidth={5} />
        </g>
        <rect x={-14} y={-50} width={28} height={100} fill={IRON} opacity={1 - open} />
      </g>
    )}
    {label && <text y={double ? 140 : 340} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={70} fill="#fff" stroke="#1a0e06" strokeWidth={12} paintOrder="stroke">{label}</text>}
  </g>
);

const Bubble: React.FC<{ x: number; y: number; o: number; flip?: boolean; txt?: string }> = ({ x, y, o, flip, txt = "#@!%" }) => o <= 0 ? null : (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} opacity={o}>
    <path d="M -120,-70 L 120,-70 Q 150,-70 150,-40 L 150,30 Q 150,60 120,60 L -40,60 L -90,110 L -70,60 L -120,60 Q -150,60 -150,30 L -150,-40 Q -150,-70 -120,-70 Z" fill="#fff" stroke="#1a1a1a" strokeWidth={6} />
    <text x={0} y={22} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={64} fill="#c8282a" transform={`scale(${flip ? -1 : 1} 1)`}>{txt}</text>
  </g>
);

const Pop: React.FC<{ f: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ f, at, x, y, children }) => {
  const p = clamp((f - at) / 8); if (p <= 0) return null;
  return <g transform={`translate(${x} ${y}) scale(${p < 1 ? 0.4 + 0.8 * Math.sin(p * Math.PI * 0.75) : 1})`}>{children}</g>;
};

/* 1 — two women caught bickering → the shrew's fiddle */
export const F1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.0, 0, 60, 0], [8, 1.08, 0, 20, 0]]);
  const ft = onTwos(f);
  const slam = Math.round(4.6 * 30);
  return (
    <Stage cam={cameraAt(s, f, f >= slam && f < slam + 8 ? 10 : 0)} bg="#8ac8e8" defs={<Boil id="fb1" f={f} scale={2} />}>
      <Square f={f} crowd={1} />
      <Layer depth={0.85}>
        <g filter="url(#fb1)">
          <Profile id="gr1" look={LOOKS.greta} x={260} y={1040} scale={1.45} rim="#fff2d0" rimStrength={0.6} light={0.9} blink={(ft % 70) < 4} smile={-1} tilt={Math.sin(ft / 3) * 3} breathe={Math.sin(ft / 6)} />
          <Profile id="li1" look={LOOKS.liesl} x={820} y={1050} scale={1.45} flip rim="#fff2d0" rimStrength={0.6} light={0.9} blink={(ft % 82) < 4} smile={-1} tilt={Math.cos(ft / 3) * 3} breathe={Math.cos(ft / 6)} />
        </g>
        <Bubble x={300} y={700} o={f < slam ? (Math.floor(f / 18) % 2 ? 1 : 0) : 0} />
        <Bubble x={780} y={680} o={f < slam ? (Math.floor(f / 18) % 2 ? 0 : 1) : 0} flip txt="&%#!" />
        <Pop f={f} at={slam} x={540} y={560}><FiddleFront x={0} y={0} s={0.95} label="SHREW'S FIDDLE" /></Pop>
      </Layer>
    </Stage>
  );
};

/* 2 — the double fiddle locks two people face to face */
export const F2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.05, 0, 40, 0], [8, 1.12, 0, 0, 0]]);
  const ft = onTwos(f);
  const lock = lerp(f, 0, 1, 10, 22);
  const laugh = lerp(f, 0, 1, 70, 90) * (1 - lerp(f, 0, 1, 150, 200));
  return (
    <Stage cam={cameraAt(s, f, f > 18 && f < 26 ? 8 : 0)} bg="#8ac8e8" defs={<Boil id="fb2" f={f} scale={2} />}>
      <Square f={f} crowd={1} laugh={laugh} />
      <Layer depth={0.85}>
        <g filter="url(#fb2)">
          <Profile id="gr2" look={LOOKS.greta} x={lerp(lock, 230, 330, 0, 1)} y={1080} scale={1.35} rim="#fff2d0" rimStrength={0.6} light={0.9} blink={(ft % 70) < 4} smile={-0.8} tilt={-4} breathe={Math.sin(ft / 10)} />
          <Profile id="li2" look={LOOKS.liesl} x={lerp(lock, 850, 750, 0, 1)} y={1085} scale={1.35} flip rim="#fff2d0" rimStrength={0.6} light={0.9} blink={(ft % 82) < 4} smile={-0.8} tilt={-4} breathe={Math.cos(ft / 10)} />
          {/* the plank between their necks (side view) */}
          <g opacity={lock}>
            <rect x={300} y={1270} width={480} height={56} rx={14} fill={WOOD} stroke={WOOD_D} strokeWidth={6} />
            <rect x={520} y={1260} width={40} height={76} fill={IRON} />
          </g>
        </g>
        <Pop f={f} at={14} x={540} y={540}><FiddleFront x={0} y={0} s={0.85} double label="DOUBLE FIDDLE" /></Pop>
      </Layer>
    </Stage>
  );
};

/* 3 — not released until they make up */
export const F3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.12, 0, 0, 0], [8, 1.2, 0, -20, 0]]);
  const ft = onTwos(f);
  const calm = lerp(f, 0, 1, 40, 110);
  const heartAt = Math.round(3.8 * 30), openAt = Math.round(5.2 * 30);
  const open = lerp(f, 0, 1, openAt, openAt + 20);
  return (
    <Stage cam={cameraAt(s, f)} bg="#8ac8e8" defs={<Boil id="fb3" f={f} scale={2} />}>
      <Square f={f} crowd={1} />
      <Layer depth={0.85}>
        <g filter="url(#fb3)">
          <Profile id="gr3" look={LOOKS.greta} x={330 - open * 60} y={1080} scale={1.35} rim="#fff2d0" rimStrength={0.6} light={0.9} blink={(ft % 70) < 4} smile={-1 + 2 * calm} tilt={-4 + calm * 4} breathe={Math.sin(ft / 14)} />
          <Profile id="li3" look={LOOKS.liesl} x={750 + open * 60} y={1085} scale={1.35} flip rim="#fff2d0" rimStrength={0.6} light={0.9} blink={(ft % 82) < 4} smile={-1 + 2 * calm} tilt={-4 + calm * 4} breathe={Math.cos(ft / 14)} />
          <g transform={`translate(${-open * 90} ${open * 30})`}><rect x={300} y={1270} width={240} height={56} rx={14} fill={WOOD} stroke={WOOD_D} strokeWidth={6} /></g>
          <g transform={`translate(${open * 90} ${open * 30})`}><rect x={540} y={1270} width={240} height={56} rx={14} fill={WOOD} stroke={WOOD_D} strokeWidth={6} /></g>
        </g>
        <Pop f={f} at={heartAt} x={540} y={800}>
          <path d="M 0,60 C -90,0 -90,-68 -42,-72 C -18,-75 -3,-57 0,-42 C 3,-57 18,-75 42,-72 C 90,-68 90,0 0,60 Z" fill="#ff4a6a" stroke="#4a0a14" strokeWidth={6} transform={`scale(${1 + 0.1 * pulse(f, 10)})`} />
        </Pop>
        <Pop f={f} at={openAt} x={540} y={560}><FiddleFront x={0} y={0} s={0.85} double open={open} label="RESOLVED!" /></Pop>
        {f > openAt && <SoftGlow cx={540} cy={1290} rx={300} ry={120} color="#fff4c0" opacity={0.6 * (1 - clamp((f - openAt) / 30))} />}
      </Layer>
    </Stage>
  );
};

/* 4 — end card: the fiddle on a museum wall */
export const F4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.0, 0, 0, 0], [6, 1.06, 0, 0, 0]]);
  return (
    <Stage cam={cameraAt(s, f)} bg="#2a2018">
      <Layer depth={0.3}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#3a2a1e" />
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1={-400} y1={i * 190} x2={W + 400} y2={i * 190} stroke="#2a1e14" strokeWidth={6} />)}
        <SoftGlow cx={540} cy={800} rx={520} ry={620} color="#ffd890" opacity={0.35} />
      </Layer>
      <Layer depth={0.8}>
        <line x1={540} y1={380} x2={540} y2={470} stroke="#1a1a1a" strokeWidth={6} />
        <g transform={`rotate(${Math.sin(f / 30) * 2} 540 470)`}><FiddleFront x={540} y={760} s={1.0} /></g>
        <rect x={360} y={1090} width={360} height={90} rx={8} fill="#c8a860" stroke="#5a4020" strokeWidth={5} />
        <text x={540} y={1150} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={46} fill="#3a2410">HALSGEIGE</text>
      </Layer>
    </Stage>
  );
};

export const CEL_SCENES = [F1, F2, F3, F4];
void W; void H; void wordFrame;
