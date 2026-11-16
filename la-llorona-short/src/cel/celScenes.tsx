import React from "react";
import { staticFile } from "remotion";
import { H, W, lerp, onTwos, pulse, rand, clamp, SceneData } from "./celLib";
import { Stage, Layer, cameraAt, Rain, Ash, Boil, SoftGlow, flashAt } from "./celFx";
import { Sky, Ocean, House } from "./env";
import { Profile, LOOKS, Figure } from "./characters";
import { wordFrame } from "../timing";

/* La Llorona — code-drawn cel version (Plot Twist with A&R). Original folk-tale designs.
   The children's fate is never shown; the legend is told, not depicted. */

type P = { f: number };
const cam = (id: number, keys: number[][]): SceneData => ({ id, camera: { keys } });

const Reeds: React.FC<{ f: number; y: number; n?: number; seed?: number; color?: string; h?: number }> = ({ f, y, n = 30, seed = 1, color = "#0a120e", h = 260 }) => {
  const r = rand(seed);
  const rs = Array.from({ length: n }, () => ({ x: r() * 1400 - 160, hh: h * (0.6 + r() * 0.8), ph: r() * 9, w: 6 + r() * 6 }));
  return <g>{rs.map((q, i) => { const sw = Math.sin(f / 30 + q.ph) * 14; return (
    <g key={i}><path d={`M ${q.x},${y} Q ${q.x + sw * 0.5},${y - q.hh * 0.5} ${q.x + sw},${y - q.hh}`} stroke={color} strokeWidth={q.w} fill="none" strokeLinecap="round" />
      {i % 3 === 0 && <ellipse cx={q.x + sw} cy={y - q.hh - 20} rx={8} ry={28} fill={color} />}</g>); })}</g>;
};

/** full-body ghost in a white dress and veil (local origin at the hem) */
const Ghost: React.FC<{ x: number; y: number; s: number; f: number; o?: number; reach?: number }> = ({ x, y, s, f, o = 1, reach = 0 }) => {
  const sway = Math.sin(f / 18) * 8;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <SoftGlow cx={0} cy={-260} rx={220} ry={360} color="#cfe0ff" opacity={0.35} />
      <path d={`M -90,0 C -70,-120 -60,-260 -40,-380 L 40,-380 C 60,-260 70,-120 ${96 + sway},0 Q 50,-20 0,0 Q -50,-20 -90,0 Z`} fill="#eef2fa" opacity={0.85} stroke="#9aa2b8" strokeWidth={3} />
      <path d="M -40,-380 C -60,-440 -40,-500 0,-504 C 40,-500 60,-440 40,-380 Z" fill="#d6dbe6" stroke="#6a7088" strokeWidth={3} />
      <path d="M -10,-470 l 0,14 M 14,-470 l 0,14" stroke="#05070a" strokeWidth={8} strokeLinecap="round" />
      <path d="M -54,-430 C -70,-500 -20,-540 20,-530 C 70,-520 80,-460 60,-380 C 80,-300 90,-200 100,-120 L 70,-120 C 60,-220 50,-320 40,-380 Z" fill="#f4f6fc" opacity={0.6} />
      <g transform={`rotate(${-20 - reach * 50} 34 -330)`}><path d="M 34,-340 L 40,-200 L 26,-200 L 22,-336 Z" fill="#eef2fa" opacity={0.85} /></g>
    </g>
  );
};

const Lantern: React.FC<{ x: number; y: number; s?: number; on?: number }> = ({ x, y, s = 1, on = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx={0} cy={10} r={150} fill="#ffb850" opacity={0.16 * on} />
    <circle cx={0} cy={10} r={60} fill="#ffd27a" opacity={0.3 * on} />
    <path d="M -24,-34 L 24,-34 L 30,40 L -30,40 Z" fill="#ffcf6a" stroke="#1a1008" strokeWidth={4} opacity={0.5 + 0.5 * on} />
    <path d="M -30,-34 L 30,-34 L 22,-50 L -22,-50 Z M -32,40 L 32,40 L 26,52 L -26,52 Z" fill="#2a1a0a" />
  </g>
);

const NightRiver: React.FC<{ f: number; id: string; storm?: boolean }> = ({ f, id, storm }) => (
  <>
    <Layer depth={0.1}>
      <Sky f={f} id={id} top="#05040e" mid={storm ? "#141a28" : "#1a1838"} bottom={storm ? "#2a3040" : "#3a2e5a"} clouds={storm ? "#0a0c14" : "#2a2448"} cloudOpacity={0.6} seed={id.length * 7} />
      {!storm && <><circle cx={760} cy={420} r={90} fill="#f4f0e0" /><SoftGlow cx={760} cy={420} rx={320} ry={320} color="#d8d0f0" opacity={0.4} /></>}
    </Layer>
    <Layer depth={0.3}><path d="M -400,1060 C -100,980 200,1040 500,990 C 800,950 1100,1010 1480,980 L 1480,1120 L -400,1120 Z" fill="#0e1218" /></Layer>
    <Layer depth={0.55}>
      <Ocean f={f} y={1110} color="#141a34" crest="#b8b0e0" layers={4} amp={7} speed={storm ? 1.4 : 0.6} seed={5} />
      {!storm && <SoftGlow cx={760} cy={1260} rx={90} ry={260} color="#f4f0e0" opacity={0.3} />}
    </Layer>
  </>
);

/* 1 — Hosts: the river at night; a white figure on the far bank */
export const L1: React.FC<P> = ({ f }) => {
  const s = cam(1, [[0, 1.0, 0, 0, 0], [2.5, 1.02, 0, 0, 0], [7, 1.16, 0, 90, 0]]);
  const logo = lerp(f, 0, 1, 0, 12) * (1 - lerp(f, 0, 1, 190, 212));
  const flick = 0.35 + 0.35 * Math.max(0, Math.sin(f / 9)) * (f % 53 < 40 ? 1 : 0);
  return (
    <Stage cam={cameraAt(s, f)} bg="#05040e" defs={<Boil id="lb1" f={f} scale={2} />}>
      <NightRiver f={f} id="l1" />
      <Layer depth={0.4}><Ghost x={300} y={1080} s={0.32} f={f} o={flick} /></Layer>
      <Layer depth={1.3}><Reeds f={f} y={1960} n={34} seed={3} h={420} />
        {Array.from({ length: 5 }, (_, k) => <SoftGlow key={k} cx={((k * 330 + f * 0.8) % 1700) - 300} cy={1180 + (k % 2) * 80} rx={420} ry={70} color="#cfc0ee" opacity={0.18} />)}
      </Layer>
      <Layer depth={1}><image href={staticFile("brand/logo.png")} x={300} y={150} width={480} height={449} opacity={logo} /></Layer>
    </Stage>
  );
};

/* 2 — María in her village at dusk */
export const L2: React.FC<P> = ({ f }) => {
  const s = cam(2, [[0, 1.05, -120, 0, 0], [8, 1.15, 80, -40, 0]]);
  const ft = onTwos(f);
  const COLORS = ["#e84a6a", "#f0b040", "#4ac0a8", "#8a5ad8", "#e86a3a"];
  return (
    <Stage cam={cameraAt(s, f)} bg="#2a1a2a" defs={<Boil id="lb2" f={f} scale={2.2} />}>
      <Layer depth={0.1}><Sky f={f} id="l2" top="#2a1e48" mid="#c86a6a" bottom="#f4b07a" clouds="#8a5a78" cloudOpacity={0.5} seed={22} /></Layer>
      <Layer depth={0.4}>
        {/* church with bell tower */}
        <rect x={760} y={760} width={200} height={480} fill="#d8b890" stroke="#3a2416" strokeWidth={5} />
        <rect x={810} y={560} width={100} height={220} fill="#e0c09a" stroke="#3a2416" strokeWidth={5} />
        <path d="M 800,560 Q 860,470 920,560 Z" fill="#c88a5a" stroke="#3a2416" strokeWidth={5} />
        <path d="M 860,470 L 860,420 M 845,440 L 875,440" stroke="#3a2416" strokeWidth={6} />
        <path d="M 835,640 Q 860,600 885,640 L 885,690 L 835,690 Z" fill="#2a1a10" />
        <circle cx={860} cy={672} r={14} fill="#c8a040" transform={`rotate(${Math.sin(f / 8) * 14} 860 650)`} />
        {[[-200, 250, 1], [60, 230, 2], [300, 260, 3], [1000, 240, 4]].map(([x, w, sd]) => <House key={sd} x={x} y={1240} w={w} h={170 + (sd % 2) * 30} color="#d4a070" roof="#9a4a2a" seed={sd} lit={0.6} />)}
        <rect x={-400} y={1240} width={W + 800} height={900} fill="#8a6040" />
        {/* papel picado */}
        {[0, 1].map((row) => (
          <g key={row}>
            <path d={`M -200,${360 + row * 160} Q 540,${460 + row * 160} 1300,${340 + row * 160}`} stroke="#3a2416" strokeWidth={3} fill="none" />
            {Array.from({ length: 14 }, (_, i) => { const t = i / 13; const x = -200 + t * 1500; const y = 360 + row * 160 + Math.sin(t * Math.PI) * 90 - t * 20;
              return <path key={i} d={`M ${x - 36},${y} L ${x + 36},${y} L ${x + 36},${y + 70} L ${x + 18},${y + 60} L ${x},${y + 70} L ${x - 18},${y + 60} L ${x - 36},${y + 70} Z`} fill={COLORS[(i + row) % 5]} opacity={0.9} transform={`rotate(${Math.sin(f / 12 + i) * 5} ${x} ${y})`} />; })}
          </g>
        ))}
      </Layer>
      <Layer depth={0.9}>
        <g filter="url(#lb2)"><Profile id="mar2" look={LOOKS.maria} x={360} y={1180} scale={2.1} rim="#ffd0a0" rimStrength={0.8} light={0.85} blink={(ft % 84) < 4} smile={1} breathe={Math.sin(ft / 22)} tilt={-2} /></g>
      </Layer>
    </Stage>
  );
};

/* 3 — married, two children; he leaves for someone else */
export const L3: React.FC<P> = ({ f }) => {
  const s = cam(3, [[0, 1.05, -60, 0, 0], [8, 1.12, 80, -20, 0]]);
  const ft = onTwos(f);
  const leave = lerp(f, 0, 1, 120, 230);
  const sad = lerp(f, 0, 1, 130, 170);
  return (
    <Stage cam={cameraAt(s, f)} bg="#1a1420" defs={<Boil id="lb3" f={f} scale={2.2} />}>
      <Layer depth={0.1}><Sky f={f} id="l3" top="#1a1430" mid="#6a3a5a" bottom="#c8806a" clouds="#4a2a48" cloudOpacity={0.5} seed={33} /></Layer>
      <Layer depth={0.45}>
        {[[-260, 260, 5], [10, 240, 6], [700, 250, 7], [960, 230, 8]].map(([x, w, sd]) => <House key={sd} x={x} y={1240} w={w} h={180} color="#a87a58" roof="#6a3220" seed={sd} lit={0.8} />)}
        <rect x={-400} y={1240} width={W + 800} height={900} fill="#5a4030" />
        {/* he walks away with another woman, toward a lantern */}
        <g transform={`translate(${lerp(leave, 640, 980, 0, 1)} 0)`} opacity={1 - leave * 0.6}>
          <Figure x={0} y={1300} h={230} color="#120a08" step={f > 120 ? ft * 0.25 : 0} />
          <Figure x={70} y={1300} h={210} color="#2a0a14" step={f > 120 ? ft * 0.25 + 1 : 0} />
        </g>
        <Lantern x={1010} y={1080} s={0.8} />
      </Layer>
      <Layer depth={0.9}>
        <g filter="url(#lb3)">
          <Profile id="mar3" look={LOOKS.maria} x={250} y={1080} scale={1.8} rim="#ffc890" rimStrength={0.7} light={0.7} blink={(ft % 90) < 4} smile={1 - sad * 1.6} tilt={sad * 8} breathe={Math.sin(ft / 22)} />
          <Profile id="kid3a" look={LOOKS.boy} x={420} y={1500} scale={0.9} rim="#ffc890" rimStrength={0.6} light={0.8} blink={(ft % 70) < 4} smile={1 - sad} />
          <Profile id="kid3b" look={LOOKS.akiko} x={560} y={1560} scale={0.82} rim="#ffc890" rimStrength={0.6} light={0.8} blink={(ft % 76) < 4} smile={1 - sad} />
        </g>
      </Layer>
    </Stage>
  );
};

/* 4 — the storm and the river (told, not shown); fades to black */
export const L4: React.FC<P> = ({ f }) => {
  const s = cam(4, [[0, 1.0, 0, 0, 0], [7, 1.12, 0, 60, 0]]);
  const fl = flashAt(f, 60);
  const walk = lerp(f, 0, 1, 0, 150, (x) => x);
  const surge = lerp(f, 0, 1, 160, 190);
  const black = lerp(f, 0, 1, 180, 210);
  return (
    <Stage cam={cameraAt(s, f, 4 + surge * 14)} bg="#05060a" defs={<Boil id="lb4" f={f} scale={2.4} />}>
      <NightRiver f={f} id="l4" storm />
      <Layer depth={0.8}>
        <path d="M -400,1400 C 0,1360 300,1380 640,1420 L 700,2400 L -400,2400 Z" fill="#0e140e" />
        {/* silhouettes from behind: mother and two small children walking toward the water */}
        <g transform={`translate(${lerp(walk, 160, 420, 0, 1)} ${lerp(walk, 0, -60, 0, 1)})`} opacity={1 - surge}>
          <Figure x={0} y={1460} h={330} color="#05070a" step={onTwos(f) * 0.2} />
          <Figure x={-90} y={1470} h={150} color="#05070a" step={onTwos(f) * 0.25 + 1} />
          <Figure x={80} y={1470} h={160} color="#05070a" step={onTwos(f) * 0.25 + 2} />
        </g>
        {surge > 0 && <path d={`M -400,${1500 - surge * 500} C 0,${1380 - surge * 600} 500,${1460 - surge * 520} 1480,${1400 - surge * 560} L 1480,2400 L -400,2400 Z`} fill="#141a34" stroke="#b8b0e0" strokeWidth={8} opacity={0.95} />}
      </Layer>
      <Layer depth={1.2}><Rain f={f} n={200} opacity={0.45} angle={14} /></Layer>
      <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#dfe9ff" opacity={fl * 0.6} />
      <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="#000" opacity={black} />
    </Stage>
  );
};

/* 5 — she realizes; follows them into the water; she cannot rest */
export const L5: React.FC<P> = ({ f }) => {
  const s = cam(5, [[0, 1.15, -120, -60, 0], [3, 1.1, -60, -20, 0], [8, 1.0, 0, 40, 0]]);
  const ft = onTwos(f);
  const enter = lerp(f, 0, 1, 80, 150);
  const rise = lerp(f, 0, 1, 168, 220);
  const open = lerp(f, 0, 1, 0, 10);
  return (
    <Stage cam={cameraAt(s, f)} bg="#05040e" defs={<Boil id="lb5" f={f} scale={2.2} />}>
      <NightRiver f={f} id="l5" />
      <Layer depth={0.85}>
        <g opacity={(1 - enter) * open} filter="url(#lb5)">
          <Profile id="mar5" look={LOOKS.maria} x={340} y={1060} scale={2.0} rim="#b8b0e0" rimStrength={0.8} light={0.5} blink={f > 30 && f < 60} smile={-0.6} tilt={lerp(f, 0, 14, 20, 70)} breathe={Math.sin(ft / 10) * 1.5} />
        </g>
        {enter > 0 && enter < 1 && <Figure x={lerp(enter, 420, 620, 0, 1)} y={lerp(enter, 1260, 1330, 0, 1)} h={lerp(enter, 300, 120, 0, 1)} color="#e8e0d0" />}
        {enter > 0.6 && [0, 1, 2].map((j) => { const p = clamp((f - 140 - j * 12) / 50); return p > 0 && p < 1 ? <ellipse key={j} cx={620} cy={1330} rx={30 + p * 260} ry={8 + p * 50} fill="none" stroke="#e8e0ff" strokeWidth={5 * (1 - p)} opacity={0.7 * (1 - p)} /> : null; })}
        {rise > 0 && <Ghost x={620} y={1340 - rise * 120} s={0.7 + rise * 0.3} f={f} o={rise * 0.9} />}
      </Layer>
      <Layer depth={1.3}><Reeds f={f} y={2000} n={26} seed={8} h={460} /></Layer>
    </Stage>
  );
};

/* 6 — La Llorona: white dress, veil, "¡Ay, mis hijos!" */
export const L6: React.FC<P> = ({ f }) => {
  const s = cam(6, [[0, 1.0, 0, 40, 0], [7, 1.2, 60, -80, 0]]);
  const ft = onTwos(f);
  const cry = lerp(f, 0, 1, wordFrame(6, 10) - 4, wordFrame(6, 10) + 10);
  return (
    <Stage cam={cameraAt(s, f, cry * 4)} bg="#05040e" defs={<Boil id="lb6" f={f} scale={2.6} />}>
      <NightRiver f={f} id="l6" />
      <Layer depth={0.85}>
        <SoftGlow cx={420} cy={900} rx={480} ry={620} color="#cfe0ff" opacity={0.25 + 0.15 * pulse(f, 30)} />
        <g filter="url(#lb6)" opacity={0.92}>
          <Profile id="gh6" look={LOOKS.ghost} x={380} y={1000} scale={2.3} rim="#e8f0ff" rimStrength={1.2} light={0.85} blink={false} smile={-0.8} tilt={-6 - cry * 10} breathe={Math.sin(ft / 12) * (1 + cry)} />
        </g>
        {/* reaching hand */}
        <path d={`M 520,1720 Q 760,${1560 - cry * 60} ${900 + cry * 40},${1420 - cry * 100}`} stroke="#d6dbe6" strokeWidth={46} strokeLinecap="round" fill="none" opacity={0.85} />
      </Layer>
      <Layer depth={1.3}>
        {Array.from({ length: 5 }, (_, k) => <SoftGlow key={k} cx={((k * 330 + f * 1.1) % 1700) - 300} cy={1350 + (k % 2) * 110} rx={460} ry={90} color="#d8d0f0" opacity={0.22} />)}
        <Reeds f={f} y={2000} n={20} seed={9} h={380} />
      </Layer>
    </Stage>
  );
};

/* 7 — "if her cry sounds far, she is close…" — the boy with the lantern */
export const L7: React.FC<P> = ({ f }) => {
  const s = cam(7, [[0, 1.05, 0, 0, 0], [7, 1.12, -40, -20, 0]]);
  const closeAt = wordFrame(7, 10), farAt = wordFrame(7, 18);
  const near = f >= closeAt && f < farAt ? lerp(f, 0, 1, closeAt, closeAt + 4) : 0;
  const far = f >= farAt ? lerp(f, 0, 1, farAt, farAt + 6) : 0;
  const ft = onTwos(f);
  return (
    <Stage cam={cameraAt(s, f, near * 8)} bg="#05040e" defs={<Boil id="lb7" f={f} scale={2.4} />}>
      <NightRiver f={f} id="l7" />
      <Layer depth={0.45}>{far > 0 && <Ghost x={860} y={1070} s={0.22} f={f} o={far * (0.5 + 0.3 * pulse(f, 12))} />}</Layer>
      <Layer depth={0.85}>
        <path d="M -400,1300 C 100,1260 500,1300 1480,1260 L 1480,2400 L -400,2400 Z" fill="#141810" />
        <path d="M 300,2400 C 420,1900 560,1500 620,1300 L 700,1300 C 680,1500 640,1900 700,2400 Z" fill="#2a2a20" />
        {near > 0 && <g opacity={near}><Ghost x={300} y={1900} s={1.35} f={f} o={0.85} reach={1} /></g>}
        <g filter="url(#lb7)">
          <Profile id="boy7" look={LOOKS.boy} x={640} y={1230} scale={1.6} flip={f < closeAt || f >= farAt} rim="#ffcf8a" rimStrength={0.9} light={0.75} blink={(ft % 60) < 4} smile={-0.5} tilt={near * -6} breathe={Math.sin(ft / 8)} />
        </g>
        <Lantern x={820} y={1600} s={1.3} on={0.85 + 0.15 * Math.sin(f * 1.3)} />
      </Layer>
      <Layer depth={1.3}><Reeds f={f} y={2000} n={24} seed={11} h={420} /></Layer>
    </Stage>
  );
};

/* 8 — the twist: an Aztec-codex-style panel (original illustration in that style) */
export const L8: React.FC<P> = ({ f }) => {
  const s = cam(8, [[0, 1.0, 0, 0, 0], [8, 1.14, 0, -40, 0]]);
  const ink = "#1a0e0a", red = "#b8301e", turq = "#2a9a8a", ochre = "#d89a3a";
  const glyph = lerp(f, 0, 1, 60, 110);
  return (
    <Stage cam={cameraAt(s, f)} bg="#e8d6aa" defs={<Boil id="lb8" f={f} scale={1.6} />}>
      <Layer depth={0.3}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#e8d6aa" />
        {Array.from({ length: 40 }, (_, i) => { const r = rand(i + 800); return <circle key={i} cx={r() * 1200 - 60} cy={r() * 2000} r={20 + r() * 80} fill="#c8a870" opacity={0.12} />; })}
        <rect x={60} y={300} width={960} height={960} fill="none" stroke={red} strokeWidth={12} />
        <rect x={84} y={324} width={912} height={912} fill="none" stroke={ink} strokeWidth={4} />
      </Layer>
      <Layer depth={0.6}>
        <g filter="url(#lb8)" stroke={ink} strokeWidth={6} strokeLinejoin="round" transform="translate(540 330) scale(0.72) translate(-540 -330)">
          {/* night sky: moon + stars as codex eyes */}
          <path d="M 760,420 a 70,70 0 1,0 0.1,0 Z" fill="#f4ecd0" />
          {[[220, 440], [380, 400], [560, 470], [880, 560]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={16} fill="#f4ecd0" /><circle cx={x} cy={y} r={6} fill={ink} /></g>)}
          {/* stepped temple */}
          {[0, 1, 2, 3].map((k) => <rect key={k} x={540 - 300 + k * 60} y={1100 - k * 90} width={600 - k * 120} height={90} fill={k % 2 ? ochre : "#e8c070"} />)}
          <rect x={470} y={660} width={140} height={110} fill={red} /><path d="M 460,660 L 540,600 L 620,660 Z" fill={turq} />
          {/* lake water, codex spirals */}
          <rect x={84} y={1190} width={912} height={200} fill={turq} />
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M ${120 + i * 100},1300 c 30,-40 70,-10 50,20 c -15,20 -40,5 -30,-12`} fill="none" stroke="#e8f4f0" strokeWidth={5} />)}
          {/* the weeping woman, in white, flat profile style */}
          <g transform="translate(300 1580)">
            <path d="M -70,0 L -50,-200 L 60,-200 L 90,0 Z" fill="#f8f4ea" />
            <circle cx={10} cy={-250} r={50} fill="#c8946a" />
            <path d="M -40,-300 C -20,-320 40,-320 60,-280 L 60,-230 L -40,-230 Z" fill={ink} />
            <circle cx={40} cy={-258} r={7} fill={ink} />
            <path d="M 40,-246 q 4,20 -2,40" stroke={turq} strokeWidth={5} fill="none" />
            <path d="M 50,-150 L 130,-210" stroke="#c8946a" strokeWidth={22} strokeLinecap="round" />
          </g>
          {/* speech / weeping volutes */}
          {[0, 1, 2].map((k) => <path key={k} d={`M ${380 + k * 70},${1330 - k * 40} c 40,-40 90,-20 70,20 c -12,24 -44,14 -36,-6`} fill="none" stroke={red} strokeWidth={8} opacity={clamp(glyph * 3 - k)} />)}
        </g>
      </Layer>
      <Layer depth={1.2}><Ash f={f} n={20} color="#b89a6a" size={3} seed={8} speed={0.3} opacity={0.4} /></Layer>
    </Stage>
  );
};

export const CEL_SCENES = [L1, L2, L3, L4, L5, L6, L7, L8];
