import React from "react";
import { H, W, SceneData, lerp, onTwos, pulse, wobble, clamp, rand } from "./lib";
import { Stage, Layer, cameraAt, Rain, Ash, Smoke, Bolt, flashAt, Boil, SoftGlow } from "./fx";
import { Sky, Skyline, House, Pole, Rubble, Ocean } from "./env";
import { Profile, LOOKS, Figure, Godzilla, PLATE_COUNT, mix } from "./characters";
import timings from "./timings.json";

/* Scene staging follows production-pack/scene_metadata.json (composition, action, camera, motion).
   All staging is creative visualization — each scene's status label says what is confirmed. */

type P = { s: SceneData; f: number };

/** scene-local frame at which word k of scene `id` is spoken */
export const wordFrame = (id: number, k: number) => {
  const sc = timings.scenes.find((x) => x.id === id)!;
  const w = sc.words[Math.min(k, sc.words.length - 1)];
  return Math.round((sc.start - (id - 1) * 5 + w.t0) * 30);
};
const sec = (t: number) => Math.round(t * 30);

const ScreenFlash: React.FC<{ v: number; color?: string }> = ({ v, color = "#dfe9ff" }) =>
  v > 0.01 ? <rect x={-600} y={-600} width={W + 1200} height={H + 1200} fill={color} opacity={v * 0.75} style={{ mixBlendMode: "screen" }} /> : null;
const Fill: React.FC<{ c: string; o?: number }> = ({ c, o = 1 }) => <rect x={-600} y={-600} width={W + 1200} height={H + 1200} fill={c} opacity={o} />;
const blurF = (id: string, v: number) => <filter id={id} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={Math.max(0, v)} /></filter>;

/** brick-and-plaster ruined facade (perspective side wall) */
const Facade: React.FC<{ side: "L" | "R"; color: string; lit: string; seed: number }> = ({ side, color, lit, seed }) => {
  const r = rand(seed);
  const L = side === "L";
  const outer = L ? -200 : 1280, inner = L ? 380 : 700;
  const top = (x: number) => 200 + Math.abs(x - 540) * 0.2;
  const d = `M ${outer} -300 L ${outer} 2300 L ${inner} 1330 L ${inner} ${740} L ${(outer + inner) / 2} ${380 + r() * 80} L ${(outer * 0.3 + inner * 0.7)} ${600 + r() * 60} Z`;
  return (
    <g>
      <path d={d} fill={color} />
      {Array.from({ length: 7 }, (_, i) => {
        const t = i / 7; const x = outer + (inner - outer) * (0.08 + t * 0.85);
        const h = 160 * (1 - t * 0.8), w = (inner - outer) * 0.06;
        const y = 820 + t * 260 - (1 - t) * 200;
        return <rect key={i} x={Math.min(x, x + w)} y={y} width={Math.abs(w)} height={h} fill={r() > 0.5 ? "#050404" : lit} opacity={0.85} />;
      })}
      {Array.from({ length: 18 }, (_, i) => {
        const x = outer + (inner - outer) * r(); const y = 600 + r() * 1200;
        return <path key={i} d={`M ${x} ${y} l ${(r() - 0.5) * 60} ${r() * 40} l ${(r() - 0.5) * 50} ${r() * 50}`} stroke="#000" strokeWidth={2} fill="none" opacity={0.6} />;
      })}
      {void top}
    </g>
  );
};

/* 01 — The nightmare returns: knee-height push, tilt up, silhouette at 4 s, hard cut on bass */
export const S01: React.FC<P> = ({ s, f }) => {
  const sil = lerp(f, 0, 0.9, sec(3.9), sec(4.6));
  const shadowX = lerp(f, -700, 900, sec(1.0), sec(4.2));
  return (
    <Stage cam={cameraAt(s, f)} bg="#120404" defs={<Boil id="b1" f={f} scale={2.5} />}>
      <Layer depth={0.1}>
        <Sky f={f} id="s1" top="#160505" mid="#6e1c0c" bottom="#d4642a" clouds="#2a0c08" seed={5} />
      </Layer>
      <Layer depth={0.25}>
        <g opacity={sil}>
          <Godzilla id="g1" x={600} y={1500} scale={0.72} bodyColor="#1a0806" rim="#ff8a4a" rimStrength={0.4} eye={0} />
        </g>
        <Smoke f={f} x={380} y={1300} scale={1.6} color="#2a0f0a" seed={11} opacity={0.9} />
        <Smoke f={f + 90} x={760} y={1320} scale={1.3} color="#1e0a08" seed={12} opacity={0.85} />
      </Layer>
      <Layer depth={0.5}>
        <Skyline y={1320} color="#1a0a08" seed={14} tower={false} height={1.1} />
        <Facade side="L" color="#261512" lit="#d46a2a" seed={3} />
        <Facade side="R" color="#1e100e" lit="#a04a1e" seed={4} />
        {/* the huge shadow crossing the shattered right facade */}
        <g opacity={0.75} transform={`translate(${shadowX} 0)`}>
          <path d="M 600,300 C 640,500 700,700 720,1000 L 900,1400 L 1400,1400 L 1400,300 C 1200,240 900,240 600,300 Z" fill="#000" opacity={0.85} />
        </g>
      </Layer>
      <Layer depth={0.85}>
        {/* street + converging tram rails */}
        <path d="M -400,1330 L 1480,1330 L 2200,2400 L -1200,2400 Z" fill="#140a08" />
        {[-0.18, -0.06, 0.06, 0.18].map((o, i) => <line key={i} x1={540 + o * 300} y1={1330} x2={540 + o * 9000} y2={2600} stroke="#5a2a18" strokeWidth={4} opacity={0.7} />)}
        {/* broken tram wires sagging from leaning poles */}
        <path d="M 120,600 L 140,1360" stroke="#050303" strokeWidth={16} />
        <path d="M 960,560 L 920,1360" stroke="#050303" strokeWidth={16} />
        <path d="M 130,640 Q 540,900 950,600" stroke="#050303" strokeWidth={4} fill="none" />
        <path d="M 130,700 Q 300,900 380,1180" stroke="#050303" strokeWidth={4} fill="none" />
        <path d={`M 950,660 Q 800,${880 + wobble(f, 2, 0.04) * 20} 720,1080`} stroke="#050303" strokeWidth={4} fill="none" />
      </Layer>
      <Layer depth={1.4}>
        <Rubble y={2020} seed={9} color="#080404" />
        {/* abandoned paper pinwheel — rotates ~15° in the gusts */}
        <g transform={`translate(260 1600)`}>
          <path d="M 0,0 L 18,520" stroke="#2a1a10" strokeWidth={10} />
          <g transform={`rotate(${lerp(f, 0, 15, sec(1.2), sec(4.5)) + Math.sin(f / 6) * 2})`} filter="url(#b1)">
            {[0, 90, 180, 270].map((a, i) => (
              <path key={a} transform={`rotate(${a})`} d="M 0,0 L 0,-120 Q 60,-110 90,-40 Z" fill={["#c84a3a", "#e0c89a", "#3a5a8a", "#e0c89a"][i]} stroke="#0a0505" strokeWidth={4} />
            ))}
            <circle r={12} fill="#0a0505" />
          </g>
        </g>
      </Layer>
      <Layer depth={1}><Ash f={f} n={80} color="#140808" size={4} seed={21} opacity={0.75} speed={1.0} /></Layer>
    </Stage>
  );
};

/* 02 — A country rebuilding: truck right past scaffolding, push to the damaged wall, match cut */
export const S02: React.FC<P> = ({ s, f }) => {
  const ft = onTwos(f);
  const beam = lerp(f, 0, 1, 10, sec(4));
  const carryX = lerp(f, 1100, 700, 0, 150, (x) => x);
  return (
    <Stage cam={cameraAt(s, f)} bg="#2a2018" defs={<Boil id="b2" f={f} scale={2.2} />}>
      <Layer depth={0.1}>
        <Sky f={f} id="s2" top="#2c2c3c" mid="#c8845a" bottom="#f2c890" clouds="#8a5a48" cloudOpacity={0.5} seed={8} />
        <SoftGlow cx={760} cy={1040} rx={120} ry={120} color="#ffe2a8" opacity={0.85} />
      </Layer>
      <Layer depth={0.3}>
        <Skyline y={1180} color="#5a4038" seed={19} tower={false} height={0.7} />
        <SoftGlow cx={540} cy={1120} rx={900} ry={140} color="#f0c890" opacity={0.3} />
      </Layer>
      <Layer depth={0.6}>
        {[[-260, 240], [0, 220], [240, 200], [470, 0], [780, 240], [1040, 220]].map(([x, w], i) => w > 0 && (
          <House key={i} x={x} y={1330} w={w} h={190 + (i % 2) * 50} color="#5a4436" roof="#2a2426" seed={i + 30} />
        ))}
        {/* damaged plaster wall (target of the push) */}
        <g>
          <rect x={500} y={820} width={300} height={510} fill="#b8a184" />
          <path d="M 560,900 C 600,880 660,940 640,1010 C 690,1040 700,1110 650,1150 C 600,1180 540,1120 560,1060 C 520,1010 520,940 560,900 Z" fill="#2a1e18" />
          {[[560, 900, 40, -60], [650, 1150, 70, 90], [640, 1010, 90, -30], [560, 1060, -50, 60]].map(([x, y, dx, dy], i) => <path key={i} d={`M ${x},${y} l ${dx * 0.5},${dy * 0.4} l ${dx * 0.5},${dy * 0.6}`} stroke="#3a2a20" strokeWidth={3} fill="none" />)}
          <rect x={500} y={820} width={300} height={510} fill="none" stroke="#2a1e18" strokeWidth={4} />
        </g>
        <rect x={-400} y={1330} width={W + 800} height={900} fill="#4a3a30" />
        {/* passerby pausing before the wall */}
        <Figure x={720} y={1440} h={210} color="#1a1210" step={f < sec(2) ? ft * 0.25 : 0} />
        {/* workers raising a beam */}
        <g filter="url(#b2)">
          <Figure x={90} y={1430} h={200} color="#1a1210" />
          <Figure x={340} y={1430} h={200} color="#1a1210" flip />
          <rect x={60} y={1230 - beam * 160} width={320} height={22} fill="#6a4a30" stroke="#1a1008" strokeWidth={3} transform={`rotate(${-6 + beam * 6} 220 ${1240 - beam * 160})`} />
          <path d={`M 100,1290 L 120,${1240 - beam * 150} M 330,1290 L 320,${1240 - beam * 160}`} stroke="#1a1210" strokeWidth={9} />
          {/* worker carrying timber */}
          <g transform={`translate(${carryX} 0)`}>
            <Figure x={0} y={1460} h={200} color="#140e0c" step={ft * 0.3} flip />
            <rect x={-140} y={1290} width={260} height={18} fill="#7a5a3a" stroke="#1a1008" strokeWidth={3} transform="rotate(-8 0 1300)" />
          </g>
        </g>
      </Layer>
      <Layer depth={1.35}>
        {/* foreground timber scaffolding */}
        <g fill="#1a120c" stroke="#0a0604" strokeWidth={3}>
          {[-120, 300, 980].map((x) => <rect key={x} x={x} y={-200} width={34} height={2300} />)}
          {[300, 900, 1500].map((y) => <rect key={y} x={-300} y={y} width={1700} height={26} />)}
          <path d="M -100,300 L 320,900 L 330,880 L -90,280 Z" />
          {[300, 900].map((y) => [-120, 300, 980].map((x) => <rect key={`${x}-${y}`} x={x - 6} y={y - 10} width={46} height={46} fill="#2a1c12" />))}
        </g>
      </Layer>
      <Layer depth={1}><Ash f={f} n={50} color="#ffe0b0" size={3} seed={31} speed={0.4} opacity={0.5} /></Layer>
    </Stage>
  );
};

/* 03 — Koichi's fragile peace: slide to reveal three, push to Koichi, cut on his glance */
export const S03: React.FC<P> = ({ s, f }) => {
  const ft = onTwos(f);
  const glance = f >= sec(4.0);
  return (
    <Stage cam={cameraAt(s, f)} bg="#1e140c" defs={<Boil id="b3" f={f} scale={2.2} />}>
      <Layer depth={0.2}>
        <Fill c="#2a1c12" />
        {/* paper window (left) with curtain sway and warm side light */}
        <rect x={-260} y={260} width={520} height={760} fill="#f2c88a" />
        {[0, 1, 2].map((i) => <rect key={i} x={-260 + i * 173} y={260} width={8} height={760} fill="#3a2414" />)}
        <rect x={-260} y={630} width={520} height={8} fill="#3a2414" />
        <path d={`M 250,240 C ${230 + Math.sin(f / 20) * 14},500 ${260 + Math.sin(f / 17) * 18},800 240,1060 L 330,1060 C ${330 + Math.sin(f / 19) * 10},800 320,500 330,240 Z`} fill="#8a4a32" opacity={0.9} />
        <path d="M 260,260 L 1400,700 L 1400,1500 L 260,1040 Z" fill="#ffcf8a" opacity={0.1} />
        <rect x={-400} y={1300} width={W + 800} height={900} fill="#3a2a18" />
        {/* chabudai with tea */}
        <ellipse cx={600} cy={1430} rx={420} ry={70} fill="#4a2a18" stroke="#1a0e08" strokeWidth={4} />
        <rect x={470} y={1380} width={40} height={36} rx={6} fill="#d8cfb8" /><rect x={700} y={1384} width={40} height={34} rx={6} fill="#d8cfb8" />
      </Layer>
      <Layer depth={0.8}>
        <Profile id="nor3" look={LOOKS.noriko} x={800} y={1000} scale={1.3} flip boil="b3" mark={0.6} rim="#ffcf8a" rimStrength={0.8} light={0.8}
          blink={(ft % 84) < 4} smile={lerp(f, 0, 1, sec(1.0), sec(2.0))} tilt={-3} breathe={Math.sin(ft / 24)} />
        <Profile id="aki3" look={LOOKS.akiko} x={520} y={1130} scale={0.95} boil="b3" rim="#ffcf8a" rimStrength={0.8} light={0.85}
          blink={(ft % 70) < 4} smile={lerp(f, 0, 1, sec(1.0), sec(2.0))} tilt={4} breathe={Math.sin(ft / 18)} />
      </Layer>
      <Layer depth={0.95}>
        {/* Koichi in the foreground, watching — then glances toward the window (cut on glance) */}
        <Profile id="koi3" look={LOOKS.koichi} x={170} y={1180} scale={1.45} flip={glance} boil="b3" rim="#ffcf8a" rimStrength={0.9} light={0.55}
          blink={(ft % 96) < 4} smile={glance ? 0 : lerp(f, 0, 0.5, sec(1.4), sec(2.4))} tilt={glance ? 6 : 0} breathe={Math.sin(ft / 26)} />
      </Layer>
      <Layer depth={1.3}><Ash f={f} n={20} color="#ffd8a0" size={7} seed={41} speed={0.25} opacity={0.3} /></Layer>
    </Stage>
  );
};

/* 04 — The mystery of Noriko: macro dolly to the mirror, rack focus fingertips → mark. Mark never changes. */
export const S04: React.FC<P> = ({ s, f }) => {
  const ft = onTwos(f);
  const hand = lerp(f, 0, 1, sec(0.6), sec(2.4));
  const rack = lerp(f, 0, 1, sec(3.0), sec(4.6));
  return (
    <Stage cam={cameraAt(s, f)} bg="#04070c" defs={<><Boil id="b4" f={f} scale={2.2} />{blurF("rk4a", 5 * (1 - rack))}{blurF("rk4b", 9 * rack)}<clipPath id="mir4"><ellipse cx={800} cy={860} rx={300} ry={520} /></clipPath></>}>
      <Layer depth={0.2}>
        <Fill c="#070b12" />
        <path d="M 1000,-200 L 1400,-200 L 1400,1400 L 600,1900 Z" fill="#6a88b8" opacity={0.12} />
      </Layer>
      <Layer depth={0.6}>
        {/* the mirror and her reflection (dimmer, cooler) */}
        <ellipse cx={800} cy={860} rx={320} ry={540} fill="#1a1410" stroke="#3a2a1a" strokeWidth={20} />
        <g clipPath="url(#mir4)">
          <Fill c="#0e1622" />
          <g opacity={0.75}>
            <Profile id="nor4r" look={LOOKS.noriko} x={900} y={980} scale={1.7} flip mark={0.6} rim="#9fc0ff" rimStrength={0.5} light={0.45}
              blink={(ft % 90) < 4} breathe={Math.sin(ft / 24)} tilt={2} />
          </g>
          <rect x={460} y={300} width={200} height={1200} fill="#cfe0ff" opacity={0.06} transform="rotate(12 560 900)" />
        </g>
      </Layer>
      <Layer depth={0.85} filter={rack < 0.95 ? "url(#rk4a)" : undefined}>
        <Profile id="nor4" look={LOOKS.noriko} x={330} y={1020} scale={2.25} boil="b4" mark={0.6} rim="#9fc0ff" rimStrength={1} light={0.5}
          blink={(ft % 90) < 4} breathe={Math.sin(ft / 24)} tilt={-2} />
      </Layer>
      <Layer depth={1.25} filter={rack > 0.04 ? "url(#rk4b)" : undefined}>
        {/* one natural hand lift — fingertips stop just short of the mark */}
        <g transform={`translate(${lerp(hand, 520, 300, 0, 1)} ${lerp(hand, 1950, 1430, 0, 1)}) rotate(${-40 + hand * 22})`}>
          <path d="M -50,80 C -64,10 -36,-60 6,-90 C 22,-100 40,-90 36,-70 C 56,-84 74,-66 62,-46 C 80,-50 84,-28 66,-16 C 80,-6 70,14 54,18 C 54,50 26,90 -50,80 Z" fill="#9fa6b8" stroke="#05070a" strokeWidth={4} />
          <path d="M 6,-90 C 4,-70 6,-50 14,-34 M 36,-70 C 30,-50 32,-36 38,-24" stroke="#05070a" strokeWidth={2} fill="none" />
        </g>
      </Layer>
    </Stage>
  );
};

/* 05 — A doctor's warning: dolly around shoulder (chart soft), close-up on his eyes. Patient never shown. */
export const S05: React.FC<P> = ({ s, f }) => {
  const ft = onTwos(f);
  const flicker = 0.85 + 0.15 * Math.sin(f * 1.7) * Math.sin(f * 0.37) + (f % 47 < 2 ? -0.35 : 0);
  const lower = lerp(f, 0, 1, sec(1.2), sec(2.8));
  return (
    <Stage cam={cameraAt(s, f)} bg="#0c0806" defs={<><Boil id="b5" f={f} scale={2.2} />{blurF("soft5", 7)}</>}>
      <Layer depth={0.2}>
        <Fill c="#140e0a" />
        {/* clinic wall, cabinet, dark doorway */}
        <rect x={760} y={300} width={360} height={1100} fill="#050304" />
        <rect x={-200} y={420} width={420} height={700} fill="#241a12" stroke="#0a0604" strokeWidth={6} />
        {[0, 1, 2].map((i) => <rect key={i} x={-180} y={450 + i * 220} width={380} height={190} fill="#18110c" />)}
        <SoftGlow cx={460} cy={240} rx={520} ry={420} color="#ffc06a" opacity={0.32 * flicker} />
        <path d="M 400,0 L 400,150 M 330,150 L 470,150 L 440,210 L 360,210 Z" stroke="#0a0604" strokeWidth={6} fill="#2a2218" />
      </Layer>
      <Layer depth={0.8}>
        <Profile id="oga5" look={LOOKS.ogata} x={420} y={1000} scale={2.2} boil="b5" rim="#ffc06a" rimStrength={0.9 * flicker} light={0.55 * flicker}
          blink={(ft % 74) < 4} tilt={lerp(f, -2, 6, sec(1.2), sec(3)) + lerp(f, 0, 3, sec(3), sec(5))} breathe={Math.sin(ft / 24)} />
      </Layer>
      <Layer depth={1.3} filter="url(#soft5)">
        {/* anonymous medical record — illegible scribbles, soft focus; corner lifts */}
        <g transform={`translate(${620} ${1500 + lower * 380}) rotate(${-8 + lower * 6})`}>
          <rect x={0} y={0} width={460} height={620} fill="#d8cfb4" stroke="#3a3020" strokeWidth={4} />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M 40,${70 + i * 42} q 40,-10 80,0 t 80,0 t 80,0 t ${40 + (i % 3) * 30},0`} stroke="#4a3e2e" strokeWidth={4} fill="none" opacity={0.7} />)}
          <path d={`M 460,0 L ${460 - 70 - Math.sin(f / 9) * 12},0 L 460,${70 + Math.sin(f / 9) * 12} Z`} fill="#bfb497" />
          <rect x={-30} y={-20} width={140} height={40} rx={6} fill="#3a3a3a" />
        </g>
      </Layer>
    </Stage>
  );
};

/* 06 — The ocean remembers: slow underwater dolly, faint pulse, backlight pulse, smash cut. No growth. */
export const S06: React.FC<P> = ({ s, f }) => {
  const beat = Math.pow(pulse(f, 42, 10), 6) * 0.7;
  const back = lerp(f, 0, 1, sec(3.0), sec(3.6)) * (1 - lerp(f, 0, 0.6, sec(3.8), sec(5)));
  return (
    <Stage cam={cameraAt(s, f)} bg="#010308" defs={<Boil id="b6" f={f} scale={2.6} />}>
      <Layer depth={0.2}>
        <defs><linearGradient id="sea6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1e30" /><stop offset="0.5" stopColor="#040c16" /><stop offset="1" stopColor="#010205" /></linearGradient></defs>
        <rect x={-600} y={-600} width={W + 1200} height={H + 1200} fill="url(#sea6)" />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M ${200 + i * 220 + Math.sin(f / 40 + i) * 30},-600 L ${100 + i * 260},1600 L ${220 + i * 260},1600 Z`} fill="#6fb8d8" opacity={0.045} />)}
        <SoftGlow cx={540} cy={1180} rx={520} ry={300} color="#3a7ab8" opacity={0.12 + back * 0.45} />
      </Layer>
      <Layer depth={0.7}>
        {/* dark rock and the obscure organic remnant */}
        <path d="M -400,1560 Q 120,1340 420,1400 Q 700,1330 1000,1420 L 1500,1500 L 1500,2400 L -400,2400 Z" fill="#05080a" stroke="#000" strokeWidth={4} />
        <g transform={`translate(540 1380) scale(${1 + beat * 0.03})`} filter="url(#b6)">
          <path d="M -230,30 C -260,-60 -170,-150 -40,-150 C 100,-160 220,-100 220,0 C 220,70 -200,100 -230,30 Z" fill="#160a0c" stroke="#000" strokeWidth={5} />
          <path d="M -170,-30 C -100,-90 0,-110 110,-70 M -140,20 C -50,-30 60,-40 170,0" stroke="#000" strokeWidth={6} fill="none" opacity={0.6} />
          {[[-140, -50], [-50, -100], [40, -95], [130, -50], [-80, 0], [60, -10]].map(([x, y], i) => (
            <path key={i} d={`M ${x},${y} q 18,-24 ${34 + i * 5},${-8 + i * 3} q 16,16 24,40`} stroke="#5fb8e8" strokeWidth={4} fill="none" opacity={0.3 + beat * 0.6 + back * 0.3} filter="url(#glowBlue)" />
          ))}
        </g>
        {/* caustics */}
        {Array.from({ length: 8 }, (_, i) => { const r = rand(i + 600); return <ellipse key={i} cx={(r() * 1200 + f * (0.6 + r())) % 1300 - 100} cy={1360 + r() * 200} rx={60 + r() * 60} ry={10} fill="#8fd0ff" opacity={0.05} />; })}
      </Layer>
      <Layer depth={1.3}><Ash f={f} n={90} color="#b8d6e6" size={3} seed={61} speed={0.35} opacity={0.45} /></Layer>
    </Stage>
  );
};

/* 07 — Another plan: overhead pan on the map, tilt up to Noda, rack focus to Murakami, match cut */
export const S07: React.FC<P> = ({ s, f }) => {
  const ft = onTwos(f);
  const rack = lerp(f, 0, 1, sec(4.0), sec(4.6));
  const tap = Math.max(0, Math.sin(f / 2.2)) * (f < sec(1.6) ? 1 : 0);
  return (
    <Stage cam={cameraAt(s, f)} bg="#0c0a08" defs={<><Boil id="b7" f={f} scale={2.2} />{blurF("rk7a", 7 * rack)}{blurF("rk7b", 7 * (1 - rack))}</>}>
      <Layer depth={0.4} filter={rack < 0.95 ? "url(#rk7b)" : undefined}>
        <Fill c="#16120e" />
        <SoftGlow cx={540} cy={420} rx={700} ry={360} color="#ffb860" opacity={0.25} />
        <Smoke f={f} x={900} y={900} scale={0.6} color="#3a3026" seed={71} opacity={0.35} />
        {/* Murakami (background) studying biological sketches */}
        <Profile id="mur7" look={LOOKS.murakami} x={860} y={980} scale={1.25} flip rim="#ffb860" rimStrength={0.7} light={0.55} blink={(ft % 66) < 4} tilt={8} breathe={Math.sin(ft / 26)} />
        <g transform="translate(690 1180) rotate(-14)">
          <rect x={0} y={0} width={220} height={160} fill="#d6cdb0" stroke="#3a3020" strokeWidth={3} />
          <path d="M 30,110 C 50,40 110,30 150,70 C 170,90 180,110 190,120 M 60,80 l 20,-30 M 100,60 l 14,-34 M 140,66 l 16,-30" stroke="#4a3e2e" strokeWidth={3} fill="none" />
        </g>
      </Layer>
      <Layer depth={0.85} filter={rack > 0.04 ? "url(#rk7a)" : undefined}>
        <Profile id="noda7" look={LOOKS.noda} x={330} y={960} scale={1.7} boil="b7" rim="#ffb860" rimStrength={0.9} light={0.6} blink={(ft % 80) < 4} tilt={lerp(f, 14, 4, sec(1.8), sec(3.5))} breathe={Math.sin(ft / 22)} />
        {/* his arm reaching down to the map */}
        <path d={`M 470,1260 Q 560,1420 ${600 + tap * 6},${1560 - tap * 10}`} stroke="#23211f" strokeWidth={46} fill="none" strokeLinecap="round" />
      </Layer>
      <Layer depth={1.0}>
        {/* paper coastal map, top-down (no readable text) — markers stay fixed */}
        <g transform="translate(0 1480)">
          <rect x={-100} y={0} width={1280} height={900} fill="#cfc4a2" stroke="#3a3020" strokeWidth={6} />
          {Array.from({ length: 12 }, (_, i) => <line key={`v${i}`} x1={-100 + i * 110} y1={0} x2={-100 + i * 110} y2={900} stroke="#8a7a5a" strokeWidth={1.5} opacity={0.5} />)}
          {Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} x1={-100} y1={i * 110} x2={1180} y2={i * 110} stroke="#8a7a5a" strokeWidth={1.5} opacity={0.5} />)}
          <path d="M -100,120 C 120,160 220,300 300,260 C 380,220 420,360 520,380 C 640,410 600,560 720,600 C 820,630 900,560 1000,640 L 1180,700 L 1180,900 L -100,900 Z" fill="#9fb0a8" opacity={0.55} stroke="#3a3020" strokeWidth={4} />
          <path d="M 420,420 C 520,470 640,520 700,640" stroke="#a03020" strokeWidth={5} strokeDasharray="14 10" fill="none" />
          {[[430, 420], [560, 500], [700, 640]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={14} fill="#b02a1a" stroke="#1a0a06" strokeWidth={3} /><line x1={x} y1={y} x2={x + 10} y2={y - 40} stroke="#1a0a06" strokeWidth={3} /></g>)}
          {/* Noda's hand: pointing / tapping the pencil */}
          <g transform={`translate(${600 + tap * 6} ${80 - tap * 10})`}>
            <path d="M -40,-20 C -30,-60 20,-70 50,-40 L 90,40 C 96,52 84,60 74,52 L 30,0 Z" fill="#a88870" stroke="#0a0604" strokeWidth={4} />
            <line x1={60} y1={30} x2={120} y2={130} stroke="#c8a040" strokeWidth={9} />
          </g>
        </g>
      </Layer>
      <Layer depth={1.4}><rect x={-300} y={-300} width={300} height={2600} fill="#0a0806" opacity={0.7} /></Layer>
    </Stage>
  );
};

/* 08 — Storm calculations: slide past instruments, push to chart, lightning flash match cut */
export const S08: React.FC<P> = ({ s, f }) => {
  const ft = onTwos(f);
  const draw = lerp(f, 0, 1, sec(1.2), sec(3.8));
  const fl = flashAt(f, sec(4.15));
  const soft = flashAt(f, sec(3.6)) * 0.4;
  return (
    <Stage cam={cameraAt(s, f)} bg="#060a10" defs={<Boil id="b8" f={f} scale={2.2} />}>
      <Layer depth={0.2}>
        <Fill c="#0a0f16" />
        {/* rain-streaked window (right) */}
        <rect x={660} y={200} width={560} height={1100} fill={mix("#18283a", "#dfe9ff", Math.max(fl, soft))} />
        <Bolt x={980} y={180} len={620} seed={18} opacity={fl} />
        {[840, 1020].map((x) => <rect key={x} x={x} y={200} width={14} height={1100} fill="#020304" />)}
        <rect x={660} y={700} width={560} height={14} fill="#020304" />
        <g clipPath="none">{Array.from({ length: 18 }, (_, i) => { const r = rand(i + 800); const x = 680 + r() * 520; const y = ((r() * 1100 + f * (2 + r() * 5)) % 1100) + 200; return <path key={i} d={`M ${x} ${y - 90} Q ${x + 5} ${y - 40} ${x} ${y}`} stroke="#a9c2dc" strokeWidth={3 + r() * 2} opacity={0.4} fill="none" />; })}</g>
        <SoftGlow cx={300} cy={700} rx={420} ry={320} color="#ffb860" opacity={0.25} />
      </Layer>
      <Layer depth={0.55}>
        {/* analog barometers and gauges (no readable text) */}
        {[[-140, 520], [80, 380], [80, 680]].map(([x, y], i) => {
          const a = -40 + i * 30 + Math.sin(f / 30 + i) * 6 - draw * 20;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle r={92} fill="#d8cfb4" stroke="#3a2a1a" strokeWidth={14} />
              {Array.from({ length: 12 }, (_, k) => <line key={k} x1={0} y1={-70} x2={0} y2={-80} stroke="#3a2a1a" strokeWidth={3} transform={`rotate(${k * 30 - 150})`} />)}
              <line x1={0} y1={0} x2={0} y2={-66} stroke="#8a1a10" strokeWidth={5} transform={`rotate(${a})`} />
              <circle r={8} fill="#3a2a1a" />
            </g>
          );
        })}
      </Layer>
      <Layer depth={0.85}>
        <Profile id="aoy8" look={LOOKS.aoyama} x={360} y={930} scale={1.9} boil="b8" rim={mix("#7f9fd0", "#e8f0ff", fl)} rimStrength={0.8 + fl} light={0.6}
          blink={(ft % 82) < 4} tilt={10} breathe={Math.sin(ft / 22)} />
      </Layer>
      <Layer depth={1.0}>
        {/* hand-marked weather chart: isobars + the line she draws */}
        <g transform="translate(240 1110) rotate(-4)">
          <rect x={0} y={0} width={720} height={520} fill="#d6cdb2" stroke="#3a3020" strokeWidth={5} />
          {[60, 120, 180, 240].map((r, i) => <ellipse key={i} cx={470} cy={260} rx={r * 1.3} ry={r} stroke="#5a6a7a" strokeWidth={2.5} fill="none" />)}
          <path d="M 40,440 C 120,380 160,300 120,220" stroke="#5a6a7a" strokeWidth={2.5} fill="none" />
          <path d="M 80,120 C 220,160 330,220 470,260" stroke="#a02818" strokeWidth={6} fill="none" pathLength={1} strokeDasharray={`${draw} 1`} strokeLinecap="round" />
          <g transform={`translate(${80 + draw * 390} ${120 + draw * 140})`}>
            <path d="M -10,-10 L 60,-90 L 76,-76 L 6,4 Z" fill="#c8a040" stroke="#0a0604" strokeWidth={3} />
            <path d="M 50,-70 C 70,-110 130,-110 150,-80 C 160,-50 120,-30 90,-40 Z" fill="#b89a84" stroke="#0a0604" strokeWidth={4} />
          </g>
        </g>
      </Layer>
      <ScreenFlash v={fl} />
    </Stage>
  );
};

/* 09 — The return: camera tracks back with the crowd, tilts up to Godzilla, shakes on the footfall */
export const S09: React.FC<P> = ({ s, f }) => {
  const foot = sec(3.0);
  const shake = 4 + 34 * Math.max(0, 1 - Math.abs(f - foot - 3) / 22);
  const rise = lerp(f, 0, 1, 0, sec(3.2));
  const crack = lerp(f, 0, 1, sec(4.3), sec(4.9));
  const ft = onTwos(f);
  return (
    <Stage cam={cameraAt(s, f, shake)} bg="#04060a" defs={<Boil id="b9" f={f} scale={2.6} />}>
      <Layer depth={0.12}>
        <Sky f={f} id="s9" top="#04060a" mid="#1a2432" bottom="#3a4a5a" clouds="#080b10" seed={29} />
        <Bolt x={240} y={-60} len={600} seed={29} opacity={flashAt(f, 18)} />
      </Layer>
      <Layer depth={0.32}>
        <Godzilla id="g9" x={600} y={lerp(rise, 1560, 1360, 0, 1)} scale={0.95} boil="b9" rim="#8fb8e0" rimStrength={0.9} eye={0.8}
          headTurn={lerp(f, -4, 4)} jaw={lerp(f, 0, 0.5, 0, sec(1.5)) * (1 - lerp(f, 0, 1, sec(2.2), sec(3)))} />
        <Ocean f={f * 1.6} y={1340} color="#0a141e" crest="#c8dcea" layers={2} amp={30} speed={1.8} seed={6} />
        {/* spray against the docks */}
        {Array.from({ length: 10 }, (_, i) => { const r = rand(i + 900); return <ellipse key={i} cx={100 + r() * 900} cy={1330 - pulse(f + r() * 40, 30) * 80} rx={60 + r() * 80} ry={30 + r() * 40} fill="#c8dcea" opacity={0.2} />; })}
      </Layer>
      <Layer depth={0.6}>
        {[[-260, 230], [0, 200], [230, 240], [500, 210], [740, 230], [990, 220]].map(([x, w], i) => (
          <House key={i} x={x} y={1500} w={w} h={200 + (i % 3) * 40} color="#151a20" roof="#0a0d10" lit={i % 2 ? 0.5 : 0} seed={i + 50} />
        ))}
        {/* masonry crack + falling debris at 44.3 s */}
        {crack > 0 && Array.from({ length: 12 }, (_, i) => { const r = rand(i + 950); return <rect key={i} x={760 + r() * 200} y={1280 + crack * crack * (300 + r() * 300)} width={10 + r() * 22} height={8 + r() * 14} fill="#0a0d10" />; })}
        <rect x={-400} y={1500} width={W + 800} height={900} fill="#0c1016" />
        {/* water surging through the street */}
        {Array.from({ length: 16 }, (_, i) => { const r = rand(i + 970); const y = 1520 + r() * 300; const x = ((r() * 1400 + f * (10 + r() * 10)) % 1600) - 300; return <path key={i} d={`M ${x} ${y} q 60,-14 120,0`} stroke="#9fb8cc" strokeWidth={3} opacity={0.4} fill="none" />; })}
      </Layer>
      <Layer depth={1.0}>
        {/* tiny civilians running toward camera (limited cel animation) */}
        {Array.from({ length: 9 }, (_, i) => {
          const r = rand(i + 1000); const p = clamp((f + r() * 60) / 160);
          const hgt = 70 + p * 360; const x = 160 + r() * 760 + (r() - 0.5) * p * 300;
          return <Figure key={i} x={x} y={1560 + p * 420} h={hgt} color="#050608" step={ft * 0.5 + i} flip={r() > 0.5} />;
        })}
      </Layer>
      <Layer depth={1.4}><Rain f={f} n={170} opacity={0.38} angle={16} /></Layer>
    </Stage>
  );
};

/* 10 — Akiko's prayer: slow push, focus shift to smoke, hard cut on the sound vacuum */
export const S10: React.FC<P> = ({ s, f }) => {
  const ft = onTwos(f);
  const close = wordFrame(10, 4);
  const shut = f >= close || (f > sec(1.2) && f < sec(1.2) + 4); // single blink, then closes her eyes
  const rack = lerp(f, 0, 1, sec(3.0), sec(4.6));
  const koichiX = lerp(f, -200, 1300, sec(0.6), sec(3.0));
  return (
    <Stage cam={cameraAt(s, f)} bg="#100604" defs={<><Boil id="b10" f={f} scale={2.2} />{blurF("rk10a", 8 * (1 - rack))}{blurF("rk10b", 6 * rack)}{blurF("kb10", 10)}</>}>
      <Layer depth={0.2} filter={rack < 0.95 ? "url(#rk10a)" : undefined}>
        <Sky f={f} id="s10" top="#0a0608" mid="#4a1a10" bottom="#d0582a" clouds="#1a0a08" seed={33} />
        <Skyline y={1200} color="#0c0606" seed={77} tower={false} height={1.2} glow="#ff7a2a" />
        <Smoke f={f} x={300} y={1180} scale={1.5} color="#1a0c0a" seed={14} />
        <Smoke f={f + 70} x={760} y={1200} scale={1.3} color="#140a08" seed={15} />
      </Layer>
      <Layer depth={0.45}>
        {/* Koichi passing in the blurred background, searching toward the street */}
        <g filter="url(#kb10)"><Figure x={koichiX} y={1500} h={420} color="#0a0606" step={ft * 0.35} /></g>
      </Layer>
      <Layer depth={0.85} filter={rack > 0.04 ? "url(#rk10b)" : undefined}>
        <Profile id="aki10" look={LOOKS.akiko} x={420} y={860} scale={2.1} boil="b10" rim="#ff9a5a" rimStrength={1} light={0.55}
          blink={shut} tilt={lerp(f, 0, 8, close - 6, close + 12)} breathe={Math.sin(ft / 14) * 1.4} />
        {/* clasped hands at her chin */}
        <g transform={`translate(${420 + 92 * 2.1} ${860 + 118 * 2.1})`}>
          <path d="M -70,60 C -80,0 -50,-70 0,-90 C 50,-70 80,0 70,60 C 40,80 -40,80 -70,60 Z" fill="#b8907a" stroke="#0a0606" strokeWidth={5} />
          <path d="M 0,-88 L 0,60 M -30,-50 L -34,40 M 30,-50 L 34,40" stroke="#0a0606" strokeWidth={3} fill="none" />
        </g>
      </Layer>
      <Layer depth={1.3}>
        {/* rain-soaked wooden shelter: roof beam and dripping edge */}
        <rect x={-300} y={-300} width={W + 600} height={420} fill="#120a06" />
        <rect x={-300} y={100} width={W + 600} height={40} fill="#2a1a10" stroke="#000" strokeWidth={4} />
        <rect x={-60} y={-300} width={80} height={2600} fill="#0e0806" />
        {Array.from({ length: 22 }, (_, i) => { const r = rand(i + 1100); const x = r() * W; const y = 150 + ((f * (14 + r() * 8) + r() * 1600) % 1800); return <line key={i} x1={x} y1={y} x2={x} y2={y + 40} stroke="#ffb88a" strokeWidth={3} opacity={0.4} />; })}
      </Layer>
      <Layer depth={1}><Rain f={f} n={90} opacity={0.22} angle={8} color="#ffc8a0" /></Layer>
    </Stage>
  );
};

/* 11 — Pale blue judgment: track along the plates, ECU head, beam at 54.0 s, white-blue flash wipe */
export const S11: React.FC<P> = ({ s, f }) => {
  const beamT = sec(4.0);
  // sequential glow tail → neck over 0–3.6 s (plate 0 = neck)
  const glow = Array.from({ length: PLATE_COUNT }, (_, i) => {
    const order = PLATE_COUNT - 1 - i;
    const t0 = sec(0.3) + order * 9;
    return lerp(f, 0, 1, t0, t0 + 12) * (0.8 + 0.2 * pulse(f, 5, i * 3));
  });
  const plates = glow.map((g) => 0.55 + 0.45 * g);
  const beam = lerp(f, 0, 1, beamT, beamT + 5);
  const neck = lerp(f, 0, -5, sec(3.0), sec(3.9));
  return (
    <Stage cam={cameraAt(s, f, 3 + beam * 16)} bg="#04060a" defs={<Boil id="b11" f={f} scale={2.6} />}>
      <Layer depth={0.2}>
        <Sky f={f} id="s11" top="#03050a" mid="#141c2a" bottom="#2a3444" clouds="#06080c" seed={37} />
        <Rain f={f} n={120} opacity={0.3} angle={14} />
      </Layer>
      <Layer depth={0.8}>
        <Godzilla id="g11" x={700} y={2350} scale={1.75} plates={plates} glow={glow} boil="b11" rim={mix("#6f8fb8", "#cfefff", glow[0])} rimStrength={1.1}
          eye={0.95} headTurn={neck} jaw={lerp(f, 0, 0.55, sec(3.6), beamT)} mouthGlow={lerp(f, 0, 1, sec(3.4), beamT)} />
        {/* the atomic heat ray — one beam, off frame left */}
        {beam > 0 && (
          <g>
            <path d={`M 140,590 L ${140 - beam * 1400},${590 - beam * 160}`} stroke="#5fc8ff" strokeWidth={150} opacity={0.5} filter="url(#blur30)" strokeLinecap="round" />
            <path d={`M 140,590 L ${140 - beam * 1400},${590 - beam * 160}`} stroke="#eafaff" strokeWidth={50} filter="url(#glowSoft)" strokeLinecap="round" />
          </g>
        )}
      </Layer>
      <Layer depth={1.3}>
        <Ash f={f} n={60} color="#9fe6ff" size={3} seed={39} rise speed={3} opacity={clamp(glow[PLATE_COUNT - 1])} glow />
      </Layer>
      <Fill c="#9fe0ff" o={glow[0] * 0.1 + beam * 0.25} />
    </Stage>
  );
};

/* 12 — No third miracle: pullback as smoke clears, dissolve to black, sharp title reveal (Main.tsx) */
export const S12: React.FC<P> = ({ s, f }) => {
  const black = lerp(f, 0, 1, sec(2.5), sec(4.0));
  return (
    <Stage cam={cameraAt(s, f)} bg="#000" defs={<Boil id="b12" f={f} scale={2} />}>
      <Layer depth={0.15}>
        <Sky f={f} id="s12" top="#0a0204" mid="#4a0a0e" bottom="#8a2a1a" clouds="#1a0406" seed={43} />
      </Layer>
      <Layer depth={0.3}>
        <SoftGlow cx={600} cy={900} rx={420} ry={600} color="#5fb8e8" opacity={0.25} />
        <g opacity={0.9}>
          <Godzilla id="g12" x={lerp(f, 620, 700)} y={lerp(f, 1450, 1400)} scale={lerp(f, 0.82, 0.74)} rim="#9fd8ff" rimStrength={1.2} bodyColor="#0a0406" eye={0.4}
            glow={Array(PLATE_COUNT).fill(0.25)} plates={Array(PLATE_COUNT).fill(0.6)} boil="b12" />
        </g>
        <Smoke f={f} x={260} y={1400} scale={1.6} color="#1a0808" seed={16} opacity={lerp(f, 0.95, 0.5, 0, sec(2.5))} />
        <Smoke f={f + 80} x={820} y={1420} scale={1.4} color="#140606" seed={17} opacity={lerp(f, 0.95, 0.5, 0, sec(2.5))} />
      </Layer>
      <Layer depth={0.6}>
        <Skyline y={1460} color="#060203" seed={88} height={1.3} glow="#ff5a2a" />
        <rect x={-400} y={1460} width={W + 800} height={900} fill="#050203" />
      </Layer>
      <Layer depth={1.2}>
        <Ash f={f} n={80} color="#a8a098" size={4} seed={93} speed={1.0} opacity={0.65} />
        <Rain f={f} n={80} opacity={0.2} angle={10} />
      </Layer>
      <Fill c="#000" o={black} />
    </Stage>
  );
};

export const SCENE_COMPONENTS = [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12];
// keep unused imports referenced for tree-shake-free builds
void Pole; void Ocean;
