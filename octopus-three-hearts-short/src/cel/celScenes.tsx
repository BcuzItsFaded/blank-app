import React from "react";
import { H, W, lerp, onTwos, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Boil, SoftGlow } from "./celFx";
import { wordFrame } from "../timing";

/* DAY 1 — Octopuses have three hearts. Original cel octopus + x-ray anatomy diagram. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });
const BLUE = "#3ac8ff";

/** heart shape centred on (0,0), size ~2r */
const Heart: React.FC<{ x: number; y: number; r: number; beat: number; color?: string; glow?: number }> = ({ x, y, r, beat, color = "#ff4a6a", glow = 0 }) => {
  const s = 1 + 0.18 * beat;
  return (
    <g transform={`translate(${x} ${y}) scale(${(s * r) / 50})`}>
      {glow > 0 && <circle r={70} fill={color} opacity={0.25 * glow} />}
      <path d="M 0,40 C -60,0 -60,-45 -28,-48 C -12,-50 -2,-38 0,-28 C 2,-38 12,-50 28,-48 C 60,-45 60,0 0,40 Z" fill={color} stroke="#2a0810" strokeWidth={5} />
      <path d="M -30,-30 C -38,-22 -38,-10 -32,-4" stroke="#fff" strokeWidth={6} fill="none" opacity={0.6} strokeLinecap="round" />
    </g>
  );
};

/** one tentacle: tapered segments with suckers, waving */
const Tentacle: React.FC<{ x: number; y: number; ang: number; len: number; f: number; ph: number; color: string; dark: string; lift?: number }> = ({ x, y, ang, len, f, ph, color, dark, lift = 0 }) => {
  const N = 14;
  const pts: [number, number][] = [];
  let px = x, py = y, a = ang;
  for (let i = 0; i <= N; i++) {
    pts.push([px, py]);
    a += Math.sin(f / 14 + ph + i * 0.45) * 0.09 - lift * 0.11 * (i / N);
    px += Math.cos(a) * (len / N); py += Math.sin(a) * (len / N);
  }
  return (
    <g>
      {pts.slice(0, -1).map(([ax, ay], i) => {
        const [bx, by] = pts[i + 1]; const w = 52 * (1 - i / N) + 6;
        return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={i % 2 ? color : color} strokeWidth={w} strokeLinecap="round" />;
      })}
      {pts.slice(0, -1).map(([ax, ay], i) => {
        const [bx, by] = pts[i + 1]; const w = 52 * (1 - i / N) + 6;
        return <line key={`o${i}`} x1={ax} y1={ay} x2={bx} y2={by} stroke={dark} strokeWidth={w + 6} strokeLinecap="round" opacity={0} />;
      })}
      {pts.slice(1, -2).map(([sx, sy], i) => i % 2 === 0 && <circle key={`s${i}`} cx={sx + 4} cy={sy + 4} r={Math.max(3, 9 * (1 - i / N))} fill="#ffd6c0" stroke={dark} strokeWidth={2} />)}
    </g>
  );
};

/** the octopus. xray 0..1 shows the organs; flow 0..1 animates blood flow; blue 0..1 turns blood blue */
export const Octopus: React.FC<{
  x: number; y: number; s: number; f: number; xray?: number; flowGill?: number; flowBody?: number; blue?: number;
  beatGill?: number; beatBody?: number; labels?: number; wave?: number; happy?: number;
}> = ({ x, y, s, f, xray = 0, flowGill = 0, flowBody = 0, blue = 0, beatGill = 0, beatBody = 0, labels = 0, wave = 0, happy = 0 }) => {
  const body = "#e8653f", dark = "#5a1a10";
  const MANTLE = "M -170,60 C -210,-140 -120,-350 0,-360 C 120,-350 210,-140 170,60 C 120,130 -120,130 -170,60 Z";
  const blood = blue > 0 ? `rgba(58,200,255,${0.4 + 0.6 * blue})` : "rgba(230,236,244,0.9)";
  const dash = (sp: number) => ({ strokeDasharray: "18 16", strokeDashoffset: -f * sp });
  const blink = (onTwos(f) % 96) < 4;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* tentacles behind */}
      {[-150, -105, -60, -20, 20, 60, 105, 150].map((tx, i) => (
        <Tentacle key={i} x={tx} y={80} ang={Math.PI / 2 + (tx / 150) * 0.9} len={430 + (i % 3) * 40} f={f} ph={i * 1.3} color={body} dark={dark} lift={i === 6 ? wave : 0} />
      ))}
      <path d={MANTLE} fill={body} stroke={dark} strokeWidth={6} />
      {[[-80, -200, 18], [60, -250, 14], [100, -120, 20], [-110, -60, 12], [10, -300, 10], [-30, -140, 9]].map(([sx, sy, r], i) => <circle key={i} cx={sx} cy={sy} r={r} fill="#b8432a" opacity={0.7 * (1 - xray)} />)}
      <path d="M -120,-260 C -90,-320 -30,-340 20,-334" stroke="#ffb090" strokeWidth={14} fill="none" opacity={0.6 * (1 - xray)} strokeLinecap="round" />
      {/* x-ray window */}
      {xray > 0 && (
        <g opacity={xray}>
          <defs><clipPath id="mantleClip"><path d={MANTLE} /></clipPath></defs>
          <g clipPath="url(#mantleClip)">
            <rect x={-260} y={-400} width={520} height={560} fill="#0e2a44" opacity={0.82} />
            {Array.from({ length: 12 }, (_, i) => <line key={i} x1={-260} y1={-380 + i * 46} x2={260} y2={-380 + i * 46} stroke="#5ad8ff" strokeWidth={1.5} opacity={0.25} />)}
            {/* gills (feathery) */}
            {[-1, 1].map((sd) => (
              <g key={sd}>
                {Array.from({ length: 7 }, (_, k) => <path key={k} d={`M ${sd * 120},${-40 + k * 14} q ${sd * 30},-8 ${sd * 46},6`} stroke="#ff9ab0" strokeWidth={6} fill="none" strokeLinecap="round" />)}
                <ellipse cx={sd * 140} cy={0} rx={44} ry={64} fill="none" stroke="#ff9ab0" strokeWidth={3} opacity={0.6} />
              </g>
            ))}
            {/* vessels: gill hearts ↔ gills, systemic heart → body */}
            {[-1, 1].map((sd) => <path key={`g${sd}`} d={`M ${sd * 82},-70 Q ${sd * 120},-60 ${sd * 140},-10`} stroke={blood} strokeWidth={10} fill="none" style={dash(1.6)} opacity={0.3 + 0.7 * flowGill} />)}
            {[-1, 1].map((sd) => <path key={`r${sd}`} d={`M ${sd * 140},40 Q ${sd * 80},-10 ${sd * 30},-130`} stroke={blood} strokeWidth={8} fill="none" style={dash(1.6)} opacity={0.2 + 0.6 * flowGill} />)}
            <path d="M 0,-110 L 0,120" stroke={blood} strokeWidth={14} fill="none" style={dash(2)} opacity={0.3 + 0.7 * flowBody} />
            <Heart x={0} y={-150} r={44} beat={beatBody} glow={beatBody} color={blue > 0.5 ? "#ff5a7a" : "#ff4a6a"} />
            <Heart x={-82} y={-80} r={28} beat={beatGill} glow={beatGill} />
            <Heart x={82} y={-80} r={28} beat={beatGill} glow={beatGill} />
          </g>
        </g>
      )}
      {/* body flow into tentacles (visible outside the mantle) */}
      {flowBody > 0 && [-150, -60, 60, 150].map((tx, i) => <path key={i} d={`M 0,110 Q ${tx * 0.7},160 ${tx * 1.4},${300 + (i % 2) * 60}`} stroke={blood} strokeWidth={9} fill="none" style={dash(2)} opacity={0.8 * flowBody} />)}
      {/* eyes */}
      {[-1, 1].map((sd) => (
        <g key={sd} transform={`translate(${sd * 78} 40)`}>
          <ellipse rx={44} ry={blink ? 5 : 40} fill="#fff6e8" stroke={dark} strokeWidth={5} />
          {!blink && <rect x={-20} y={-8 + happy * 4} width={40} height={16} rx={8} fill="#1a0a06" />}
          {!blink && <circle cx={10} cy={-12} r={6} fill="#fff" />}
          <path d={`M -44,-46 Q 0,${-60 - happy * 8} 44,-46`} stroke={dark} strokeWidth={6} fill="none" />
        </g>
      ))}
      {happy > 0 && <path d="M -30,98 Q 0,126 30,98" stroke={dark} strokeWidth={6} fill="none" opacity={happy} strokeLinecap="round" />}
      {/* labels */}
      {labels > 0 && (
        <g opacity={labels} fontFamily="Oswald" fontWeight={700} fontSize={34} fill="#fff" stroke="#06121e" strokeWidth={8} paintOrder="stroke">
          <text x={-200} y={-430} textAnchor="middle">GILL HEART</text>
          <text x={200} y={-430} textAnchor="middle">GILL HEART</text>
          <text x={0} y={-500} textAnchor="middle">BODY HEART</text>
          <path d="M -200,-420 L -90,-110 M 200,-420 L 90,-110 M 0,-490 L 0,-200" stroke="#fff" strokeWidth={4} />
        </g>
      )}
    </g>
  );
};

const Sea: React.FC<{ f: number; deep?: number }> = ({ f, deep = 0 }) => (
  <>
    <Layer depth={0.1}>
      <defs><linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={deep ? "#0a4a6a" : "#1a9ab8"} /><stop offset="0.6" stopColor="#0a4a7a" /><stop offset="1" stopColor="#06203a" /></linearGradient></defs>
      <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="url(#seaG)" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M ${120 + i * 220 + Math.sin(f / 50 + i) * 40},-400 L ${40 + i * 240},1700 L ${170 + i * 240},1700 Z`} fill="#bff4ff" opacity={0.07} />)}
    </Layer>
    <Layer depth={0.4}>
      <path d="M -400,1800 C -100,1650 200,1720 500,1660 C 800,1600 1100,1700 1480,1640 L 1480,2400 L -400,2400 Z" fill="#0e3a40" stroke="#06181c" strokeWidth={4} />
      {[[60, 1720, 1], [930, 1680, 2], [300, 1760, 3]].map(([x, y, sd]) => Array.from({ length: 4 }, (_, k) => {
        const sw = Math.sin(f / 26 + k + sd) * 20;
        return <path key={`${sd}-${k}`} d={`M ${x + k * 22},${y} q ${sw},-120 ${sw * 0.4},-240 q ${-sw},-90 ${sw * 0.8},-180`} stroke={k % 2 ? "#2a8a5a" : "#3aaa6a"} strokeWidth={14} fill="none" strokeLinecap="round" />;
      }))}
    </Layer>
  </>
);

const Bubbles: React.FC<{ f: number; n?: number; seed?: number }> = ({ f, n = 26, seed = 1 }) => {
  const r = rand(seed);
  const b = Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, s: 4 + r() * 14, v: 1 + r() * 2.5, ph: r() * 9 }));
  return <g>{b.map((q, i) => { const y = (((q.y - f * q.v * 3) % (H + 100)) + H + 100) % (H + 100) - 50; return <circle key={i} cx={q.x + Math.sin(f / 20 + q.ph) * 14} cy={y} r={q.s} fill="none" stroke="#dff8ff" strokeWidth={2.5} opacity={0.6} />; })}</g>;
};

const Pop: React.FC<{ f: number; at: number; children: React.ReactNode; x: number; y: number }> = ({ f, at, children, x, y }) => {
  const p = clamp((f - at) / 8);
  if (p <= 0) return null;
  const sc = p < 1 ? 0.4 + 0.8 * Math.sin(p * Math.PI * 0.75) : 1;
  return <g transform={`translate(${x} ${y}) scale(${sc})`}>{children}</g>;
};

/* 1 — Hook: the octopus rises into view; three hearts pop on "THREE" */
export const O1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.0, 0, 0, 0], [6, 1.06, 0, -40, 0]]);
  const rise = lerp(f, 0, 1, 0, 40);
  const three = wordFrame(1, 3);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0a4a7a" defs={<Boil id="ob1" f={f} scale={2} />}>
      <Sea f={f} />
      <Layer depth={0.85}>
        <g filter="url(#ob1)"><Octopus x={540} y={lerp(rise, 2300, 1060, 0, 1)} s={1.15} f={f} happy={0.4} /></g>
        {[-1, 0, 1].map((k) => <Pop key={k} f={f} at={three + (k + 1) * 4} x={540 + k * 170} y={480 - (k === 0 ? 40 : 0)}><Heart x={0} y={0} r={62} beat={pulse(f, 14, k * 5)} glow={0.6} /></Pop>)}
      </Layer>
      <Layer depth={1.2}><Bubbles f={f} seed={2} /></Layer>
    </Stage>
  );
};

/* 2 — x-ray scan reveals the three hearts */
export const O2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.06, 0, -40, 0], [4, 1.18, 0, -120, 0]]);
  const scan = lerp(f, 0, 1, 6, 44);
  const beats = [48, 58, 68].map((t) => Math.max(0, 1 - Math.abs(f - t) / 6));
  const beat = Math.max(...beats, 0.2 * pulse(f, 20));
  return (
    <Stage cam={cameraAt(s, f)} bg="#0a4a7a" defs={<Boil id="ob2" f={f} scale={2} />}>
      <Sea f={f} />
      <Layer depth={0.85}>
        <g filter="url(#ob2)"><Octopus x={540} y={1060} s={1.15} f={f} xray={scan} beatGill={beat} beatBody={beat} /></g>
        {scan > 0 && scan < 1 && <g><rect x={-300} y={1060 + (-360 + scan * 500) * 1.15 - 4} width={W + 600} height={8} fill="#7ae8ff" /><SoftGlow cx={540} cy={1060 + (-360 + scan * 500) * 1.15} rx={600} ry={40} color="#7ae8ff" opacity={0.6} /></g>}
        <Pop f={f} at={50} x={540} y={420}><text textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={120} fill="#fff" stroke="#06121e" strokeWidth={14} paintOrder="stroke">3 HEARTS</text></Pop>
      </Layer>
      <Layer depth={1.2}><Bubbles f={f} seed={3} n={16} /></Layer>
    </Stage>
  );
};

/* 3 — two hearts pump to the gills, one pumps to the body */
export const O3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.3, 0, -330, 0], [8, 1.36, 0, -300, 0]]);
  const gillAt = wordFrame(3, 0), bodyAt = wordFrame(3, 9);
  const gill = lerp(f, 0, 1, gillAt, gillAt + 10);
  const body = lerp(f, 0, 1, bodyAt, bodyAt + 10);
  const bg = Math.pow(pulse(f, 18), 3) * (0.3 + 0.7 * gill);
  const bb = Math.pow(pulse(f, 18, 9), 3) * (0.3 + 0.7 * body);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0a4a7a" defs={<Boil id="ob3" f={f} scale={1.6} />}>
      <Sea f={f} deep={1} />
      <Layer depth={0.85}>
        <Octopus x={540} y={1060} s={1.15} f={f} xray={1} flowGill={gill} flowBody={body} beatGill={bg} beatBody={bb} labels={lerp(f, 0, 1, 6, 20)} />
      </Layer>
      <Layer depth={1.2}><Bubbles f={f} seed={4} n={12} /></Layer>
    </Stage>
  );
};

/* 4 — the blood turns blue */
export const O4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.3, 0, -300, 0], [3, 1.12, 0, -120, 0], [6, 1.1, 0, -100, 0]]);
  const blueAt = wordFrame(4, 4);
  const blue = lerp(f, 0, 1, blueAt - 4, blueAt + 10);
  return (
    <Stage cam={cameraAt(s, f, blue > 0 && blue < 1 ? 8 : 0)} bg="#0a4a7a" defs={<Boil id="ob4" f={f} scale={1.8} />}>
      <Sea f={f} deep={1} />
      <Layer depth={0.85}>
        <SoftGlow cx={540} cy={900} rx={700} ry={700} color={BLUE} opacity={0.35 * blue} />
        <Octopus x={540} y={1060} s={1.15} f={f} xray={1 - 0.3 * blue} flowGill={1} flowBody={1} blue={blue} beatGill={Math.pow(pulse(f, 16), 3)} beatBody={Math.pow(pulse(f, 16, 8), 3)} />
        <Pop f={f} at={blueAt} x={540} y={400}>
          <text textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={130} fill={BLUE} stroke="#06121e" strokeWidth={14} paintOrder="stroke">BLUE BLOOD!</text>
          <text y={70} textAnchor="middle" fontFamily="Oswald" fontWeight={400} fontSize={42} fill="#e8f8ff" stroke="#06121e" strokeWidth={8} paintOrder="stroke">copper-based hemocyanin</text>
        </Pop>
      </Layer>
      <Layer depth={1.2}><Bubbles f={f} seed={5} n={20} /></Layer>
    </Stage>
  );
};

/* 5 — "Would you want three hearts?" — the octopus waves */
export const O5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.1, 0, -100, 0], [6, 1.0, 0, 0, 0]]);
  const wave = 0.5 + 0.5 * Math.sin(f / 7);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0a4a7a" defs={<Boil id="ob5" f={f} scale={2} />}>
      <Sea f={f} />
      <Layer depth={0.85}>
        <g filter="url(#ob5)"><Octopus x={540} y={1060} s={1.15} f={f} happy={1} wave={wave} /></g>
        {[0, 1, 2].map((k) => <Heart key={k} x={300 + k * 240} y={460 - Math.sin(f / 20 + k) * 30} r={44} beat={pulse(f, 16, k * 5)} glow={0.5} />)}
      </Layer>
      <Layer depth={1.2}><Bubbles f={f} seed={6} /></Layer>
    </Stage>
  );
};

export const CEL_SCENES = [O1, O2, O3, O4, O5];
