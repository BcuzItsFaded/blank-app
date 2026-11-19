import React from "react";
import { H, W, lerp, pulse, rand, clamp, onTwos, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow } from "./celFx";
import { Profile, LOOKS } from "./characters";
import { wordFrame } from "../timing";

/* Mexico's history sounds made up — original cel illustrations (no real-person likeness). */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const INK = "#1a120a", GREEN = "#1f8a4c", RED = "#c8202e", GOLD = "#ffd15a";

const Pop: React.FC<{ f: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ f, at, x, y, children }) => {
  const p = clamp((f - at) / 8); if (p <= 0) return null;
  return <g transform={`translate(${x} ${y}) scale(${p < 1 ? 0.4 + 0.8 * Math.sin(p * Math.PI * 0.75) : 1})`}>{children}</g>;
};
const Big: React.FC<{ t: string; size?: number; color?: string; y?: number }> = ({ t, size = 100, color = "#fff", y = 0 }) =>
  <text y={y} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={size} fill={color} stroke={INK} strokeWidth={14} paintOrder="stroke">{t}</text>;

const PapelPicado: React.FC<{ f: number; y: number }> = ({ f, y }) => {
  const C = ["#e84a6a", "#f0b040", "#4ac0a8", "#8a5ad8", "#e86a3a", GREEN];
  return (
    <g>
      <path d={`M -200,${y} Q 540,${y + 110} 1300,${y - 10}`} stroke="#3a2416" strokeWidth={3} fill="none" />
      {Array.from({ length: 14 }, (_, i) => { const t = i / 13; const x = -200 + t * 1500; const yy = y + Math.sin(t * Math.PI) * 100 - t * 10;
        return <path key={i} d={`M ${x - 40},${yy} L ${x + 40},${yy} L ${x + 40},${yy + 80} L ${x + 20},${yy + 68} L ${x},${yy + 80} L ${x - 20},${yy + 68} L ${x - 40},${yy + 80} Z`} fill={C[i % C.length]} opacity={0.95} transform={`rotate(${Math.sin(f / 12 + i) * 5} ${x} ${yy})`} />; })}
    </g>
  );
};

const Stopwatch: React.FC<{ x: number; y: number; r: number; a: number }> = ({ x, y, r, a }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-22} y={-r - 54} width={44} height={40} rx={8} fill="#c8ccd4" stroke={INK} strokeWidth={5} />
    <circle r={r + 16} fill="#c8ccd4" stroke={INK} strokeWidth={6} />
    <circle r={r} fill="#fffaf0" stroke={INK} strokeWidth={5} />
    <path d={`M 0,0 L 0,${-r} A ${r},${r} 0 ${a > 180 ? 1 : 0},1 ${Math.sin((a * Math.PI) / 180) * r},${-Math.cos((a * Math.PI) / 180) * r} Z`} fill={RED} opacity={0.35} />
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1={0} y1={-r + 6} x2={0} y2={-r + 22} stroke={INK} strokeWidth={5} transform={`rotate(${i * 30})`} />)}
    <line x1={0} y1={0} x2={0} y2={-r + 26} stroke={RED} strokeWidth={8} strokeLinecap="round" transform={`rotate(${a})`} />
    <circle r={12} fill={INK} />
  </g>
);

const CacaoPod: React.FC<{ x: number; y: number; s: number; open: number }> = ({ x, y, s, open }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[-1, 1].map((sd) => (
      <g key={sd} transform={`translate(${sd * open * 70} 0) rotate(${sd * open * 18})`}>
        <path d={sd < 0 ? "M 0,-180 C -110,-170 -130,-40 -110,60 C -90,150 -40,190 0,196 Z" : "M 0,-180 C 110,-170 130,-40 110,60 C 90,150 40,190 0,196 Z"} fill="#d8682a" stroke={INK} strokeWidth={6} />
        {[-0.6, -0.3, 0.3, 0.6].map((t) => <path key={t} d={`M ${sd * 60 * Math.abs(t) + (sd < 0 ? -10 : 10) * 0},-160 C ${sd * 100 * Math.abs(t)},-40 ${sd * 90 * Math.abs(t)},80 ${sd * 30 * Math.abs(t)},180`} stroke="#a8421a" strokeWidth={4} fill="none" opacity={0.7} />)}
      </g>
    ))}
    {open > 0.2 && Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={(i % 3 - 1) * 34} cy={-90 + Math.floor(i / 3) * 70} rx={26} ry={36} fill="#5a2e16" stroke={INK} strokeWidth={4} opacity={clamp((open - 0.2) * 2)} />)}
  </g>
);

const Bean: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><ellipse rx={36} ry={24} fill="#6a3418" stroke={INK} strokeWidth={4} /><path d="M -26,0 Q 0,-8 26,0" stroke="#a8622a" strokeWidth={4} fill="none" /></g>
);

/** Cholula: grassy hill, yellow church on top, volcano behind; xray 0..1 reveals the stepped pyramid inside */
const Cholula: React.FC<{ x: number; y: number; s: number; xray: number; f: number }> = ({ x, y, s, xray, f }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <defs><clipPath id="hillClip"><path d="M -520,0 C -420,-120 -260,-300 -120,-330 L 120,-330 C 260,-300 420,-120 520,0 Z" /></clipPath></defs>
    <path d="M -520,0 C -420,-120 -260,-300 -120,-330 L 120,-330 C 260,-300 420,-120 520,0 Z" fill="#6a9a42" stroke={INK} strokeWidth={6} />
    {Array.from({ length: 14 }, (_, i) => { const r = rand(i + 3); return <circle key={i} cx={-380 + r() * 760} cy={-40 - r() * 240} r={16 + r() * 18} fill="#4a7a32" opacity={0.7 * (1 - xray)} />; })}
    <g clipPath="url(#hillClip)" opacity={xray}>
      <rect x={-560} y={-360} width={1120} height={380} fill="#2a1e14" opacity={0.75} />
      {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={-440 + k * 80} y={-60 - k * 60} width={880 - k * 160} height={62} fill={k % 2 ? "#d8a060" : "#c88a4a"} stroke={INK} strokeWidth={4} />)}
      <path d="M -40,-360 L -40,-60 M 40,-360 L 40,-60" stroke="#e8c080" strokeWidth={6} strokeDasharray="12 8" />
    </g>
    {/* the church (yellow, twin bell towers, red dome) */}
    <g transform="translate(0 -330)">
      <rect x={-110} y={-120} width={220} height={120} fill="#f0c840" stroke={INK} strokeWidth={5} />
      <rect x={-150} y={-190} width={52} height={190} fill="#f0c840" stroke={INK} strokeWidth={5} />
      <rect x={98} y={-190} width={52} height={190} fill="#f0c840" stroke={INK} strokeWidth={5} />
      <path d="M -150,-190 Q -124,-240 -98,-190 Z M 98,-190 Q 124,-240 150,-190 Z" fill="#c84a2a" stroke={INK} strokeWidth={4} />
      <path d="M -60,-120 Q 0,-210 60,-120 Z" fill="#c84a2a" stroke={INK} strokeWidth={5} />
      <path d="M 0,-210 L 0,-250 M -14,-236 L 14,-236" stroke={INK} strokeWidth={5} />
      <path d="M -24,0 L -24,-56 Q 0,-80 24,-56 L 24,0 Z" fill="#6a3a1a" />
      <circle cx={-124} cy={-150} r={10} fill="#8a6a1a" transform={`rotate(${Math.sin(f / 6) * 20} -124 -170)`} />
    </g>
  </g>
);

/* 1 — Mexico's history sounds made up… but it's real */
export const X1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.05, 0, 0, 0], [3.5, 1.0, 0, 0, 0]]);
  return (
    <Stage cam={cameraAt(s, f)} bg="#fff6e0">
      <Layer depth={0.1}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#fff6e0" />
        <rect x={-400} y={-400} width={480} height={H + 800} fill={GREEN} opacity={0.85} />
        <rect x={1000} y={-400} width={480} height={H + 800} fill={RED} opacity={0.85} />
      </Layer>
      <Layer depth={0.5}><PapelPicado f={f} y={260} /><PapelPicado f={f + 30} y={420} /></Layer>
      <Layer depth={0.9}>
        <g transform="translate(540 0)"><Big t="MEXICO'S" size={120} y={820} color={GREEN} /><Big t="HISTORY" size={150} y={960} color={RED} /></g>
        <Pop f={f} at={wordFrame(1, 8)} x={540} y={1140}><g transform="rotate(-8)"><rect x={-230} y={-80} width={460} height={130} rx={14} fill="none" stroke={RED} strokeWidth={12} /><Big t="100% REAL" size={96} color={RED} y={22} /></g></Pop>
      </Layer>
    </Stage>
  );
};

/* 2 — a president for about 45 minutes */
export const X2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.0, 0, 0, 0], [7.2, 1.06, 0, -20, 0]]);
  const ft = onTwos(f);
  const run = lerp(f, 0, 1, wordFrame(2, 7) - 4, wordFrame(2, 10) + 14);
  const lunch = wordFrame(2, 17);
  return (
    <Stage cam={cameraAt(s, f)} bg="#e8dcc4" defs={<Boil id="xb2" f={f} scale={1.6} />}>
      <Layer depth={0.2}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#e8dcc4" />
        {/* palace hall: columns + flag */}
        {[-80, 260, 600, 940].map((x) => <rect key={x} x={x} y={300} width={70} height={1000} fill="#d8c8a8" stroke="#8a7a5a" strokeWidth={4} />)}
        <g transform="translate(820 420)"><rect x={0} y={0} width={60} height={160} fill={GREEN} /><rect x={60} y={0} width={60} height={160} fill="#fff" /><rect x={120} y={0} width={60} height={160} fill={RED} /><line x1={0} y1={-40} x2={0} y2={300} stroke={INK} strokeWidth={6} /></g>
      </Layer>
      <Layer depth={0.85}>
        <g filter="url(#xb2)">
          <Profile id="pl2" look={LOOKS.husband} x={300} y={1060} scale={1.5} rim="#fff2d0" rimStrength={0.5} light={0.9} blink={(ft % 70) < 4} smile={run > 0.9 ? -0.6 : 0.4} tilt={-2} breathe={Math.sin(ft / 14)} />
          {/* presidential sash (green-white-red) */}
          <g transform="translate(300 1060) scale(1.5)">
            <path d="M -60,200 L -40,196 L 160,520 L 130,530 Z" fill={GREEN} /><path d="M -40,196 L -20,194 L 186,510 L 160,520 Z" fill="#fff" /><path d="M -20,194 L 0,192 L 210,500 L 186,510 Z" fill={RED} />
          </g>
        </g>
        <Stopwatch x={780} y={760} r={150} a={run * 270} />
        <Pop f={f} at={wordFrame(2, 9)} x={780} y={1010}><Big t="~45 MIN" size={96} color={RED} /></Pop>
        <Pop f={f} at={wordFrame(2, 12)} x={780} y={500}><Big t="1913" size={90} /></Pop>
        <Pop f={f} at={lunch} x={540} y={300}>
          <path d="M -120,0 Q 0,-70 120,0 Z" fill="#e8a84a" stroke={INK} strokeWidth={5} /><rect x={-124} y={0} width={248} height={22} fill="#6aaa3a" /><rect x={-120} y={22} width={240} height={26} fill="#8a3a1a" /><path d="M -120,48 L 120,48 Q 110,80 0,80 Q -110,80 -120,48 Z" fill="#e8a84a" stroke={INK} strokeWidth={5} />
          <Big t="LUNCH BREAK > PRESIDENCY" size={50} y={140} color={GOLD} />
        </Pop>
      </Layer>
    </Stage>
  );
};

/* 3 — cacao beans as money */
export const X3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.0, 0, 0, 0], [5, 1.06, 0, 0, 0]]);
  const open = lerp(f, 0, 1, wordFrame(3, 3) - 4, wordFrame(3, 4) + 8);
  const money = wordFrame(3, 6);
  const drink = wordFrame(3, 9);
  return (
    <Stage cam={cameraAt(s, f)} bg="#f4e2c0">
      <Layer depth={0.2}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#f4e2c0" />
        <path d="M -400,1180 L 1480,1180 L 1480,2400 L -400,2400 Z" fill="#c8a070" />
        {/* market awning */}
        <path d="M -100,260 L 1180,260 L 1120,380 L -40,380 Z" fill={GREEN} stroke={INK} strokeWidth={5} />
        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M ${-40 + i * 118},380 q 59,60 118,0`} fill={i % 2 ? RED : "#fff"} stroke={INK} strokeWidth={4} />)}
      </Layer>
      <Layer depth={0.85}>
        <CacaoPod x={300} y={840} s={1.1} open={open} />
        {/* bean coins stacking up */}
        {f > money && Array.from({ length: 6 }, (_, i) => { const p = clamp((f - money - i * 4) / 8); return p > 0 ? <Bean key={i} x={760} y={1060 - i * 44 - (1 - p) * 120} s={1.3} /> : null; })}
        <Pop f={f} at={money} x={760} y={620}><Big t="$" size={170} color={GREEN} /><Big t="CACAO = MONEY" size={60} y={90} /></Pop>
        {/* hot chocolate swallows the savings */}
        {f > drink && <g>
          <path d="M 180,1110 L 420,1110 L 390,1260 L 210,1260 Z" fill="#8a4a20" stroke={INK} strokeWidth={6} />
          <ellipse cx={300} cy={1110} rx={120} ry={22} fill="#e8c8a0" stroke={INK} strokeWidth={5} />
          {[0, 1, 2].map((k) => { const p = clamp((f - drink - k * 6) / 12); return p < 1 ? <Bean key={k} x={240 + k * 60} y={900 + p * 200} s={0.8} /> : null; })}
          {[0, 1, 2].map((k) => <path key={`st${k}`} d={`M ${260 + k * 40},1080 q -14,-40 0,-80`} stroke="#fff" strokeWidth={6} fill="none" opacity={0.5 + 0.3 * pulse(f, 20, k * 5)} />)}
        </g>}
      </Layer>
    </Stage>
  );
};

/* 4 — the world's largest pyramid by volume is in Cholula */
export const X4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.0, 0, 0, 0], [7.4, 1.04, 0, 0, 0]]);
  const egypt = wordFrame(4, 9), cholula = wordFrame(4, 12), church = wordFrame(4, 16);
  const xray = lerp(f, 0, 1, cholula, cholula + 14) * (1 - lerp(f, 0, 0.75, church, church + 12));
  return (
    <Stage cam={cameraAt(s, f)} bg="#9ad0f0">
      <Layer depth={0.1}>
        <defs><linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ac0f0" /><stop offset="1" stopColor="#e8f4ff" /></linearGradient></defs>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="url(#skyC)" />
        {/* Popocatépetl */}
        <path d="M 520,1100 L 820,560 L 900,560 L 1260,1100 Z" fill="#8a8a9a" stroke={INK} strokeWidth={5} />
        <path d="M 760,670 L 820,560 L 900,560 L 960,670 L 900,640 L 860,680 L 810,640 Z" fill="#fff" />
        {Array.from({ length: 4 }, (_, i) => <circle key={i} cx={860 + Math.sin(f / 20 + i) * 20} cy={520 - ((f * 1.2 + i * 50) % 200)} r={30 + i * 6} fill="#c8c8d0" opacity={0.5} />)}
      </Layer>
      <Layer depth={0.5}>
        <path d="M -400,1180 C 0,1140 600,1160 1480,1140 L 1480,2400 L -400,2400 Z" fill="#8aaa52" stroke={INK} strokeWidth={5} />
        <Cholula x={540} y={1190} s={0.95} xray={xray} f={f} />
      </Layer>
      <Layer depth={0.9}>
        {/* an Egyptian pyramid for comparison, then crossed out */}
        {f > 4 && f < cholula + 6 && <g opacity={clamp((cholula + 6 - f) / 6)}>
          <g transform="translate(540 760)"><path d="M -220,180 L 0,-180 L 220,180 Z" fill="#e8c87a" stroke={INK} strokeWidth={6} /><path d="M 0,-180 L 60,180 L 220,180 Z" fill="#c8a058" />
            {f > egypt && <path d="M -260,-200 L 260,220 M 260,-200 L -260,220" stroke={RED} strokeWidth={22} strokeLinecap="round" />}</g>
          <g transform="translate(540 0)"><Big t="NOT IN EGYPT" size={80} y={1040} color={f > egypt ? RED : "#fff"} /></g>
        </g>}
        <Pop f={f} at={cholula} x={540} y={330}><Big t="CHOLULA, MEXICO" size={96} color={GREEN} /><Big t="LARGEST BY VOLUME" size={56} y={80} color={GOLD} /></Pop>
      </Layer>
    </Stage>
  );
};

/* 5 — recap */
export const X5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.0, 0, 0, 0], [6.9, 1.05, 0, 0, 0]]);
  const end = wordFrame(5, 14);
  return (
    <Stage cam={cameraAt(s, f)} bg="#fff6e0">
      <Layer depth={0.1}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#fff6e0" />
        <rect x={-400} y={-400} width={480} height={H + 800} fill={GREEN} opacity={0.85} />
        <rect x={1000} y={-400} width={480} height={H + 800} fill={RED} opacity={0.85} />
      </Layer>
      <Layer depth={0.5}><PapelPicado f={f} y={180} /></Layer>
      <Layer depth={0.9}>
        <Pop f={f} at={wordFrame(5, 1)} x={300} y={620}><Stopwatch x={0} y={0} r={90} a={270} /><Big t="45 MIN" size={56} y={170} color={RED} /></Pop>
        <Pop f={f} at={wordFrame(5, 3)} x={780} y={620}><Bean x={0} y={0} s={2.4} /><Big t="$ CACAO" size={56} y={170} color={GREEN} /></Pop>
        <Pop f={f} at={wordFrame(5, 7)} x={540} y={1060}><Cholula x={0} y={0} s={0.45} xray={0.6} f={f} /><Big t="PYRAMID + CHURCH" size={56} y={80} color="#c84a2a" /></Pop>
        {f > end && Array.from({ length: 40 }, (_, i) => { const r = rand(i + 500); const p = (f - end) / 40;
          return <rect key={i} x={r() * W} y={-40 + p * (500 + r() * 900)} width={14} height={22} fill={[GREEN, RED, GOLD, "#4ac0a8"][i % 4]} transform={`rotate(${f * 8 + i * 30} ${r() * W} ${p * 800})`} opacity={clamp(2 - p)} />; })}
      </Layer>
    </Stage>
  );
};

export const CEL_SCENES = [X1, X2, X3, X4, X5];
void H;
