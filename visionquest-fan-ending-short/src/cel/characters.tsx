import React, { useMemo } from "react";
import { rand } from "./celLib";
import { SoftGlow } from "./celFx";

/* =====================================================================
   PROFILE CHARACTER RIG
   Realistic-proportioned side profile (facing right in local space),
   cel-shaded: base tone + hard shadow shape + rim-light edge.
   Local origin ≈ ear level, head height ≈ 300 units.
   ===================================================================== */

export type Look = {
  hair: "short" | "bob" | "parted" | "elder" | "shoulder" | "child" | "pinned" | "none";
  hairColor: string;
  skin: string;
  skinShadow: string;
  clothes: "jacket" | "blouse" | "suit" | "labcoat";
  clothColor: string;
  glasses?: boolean;
  hat?: "straw" | "cap" | "hood" | "crown";
  mustache?: boolean;
  mask?: boolean;
  seams?: boolean;
  eyeColor?: string;
  age?: number; // 0..1 wrinkles
};

export const LOOKS: Record<string, Look> = {
  // Fan-made designs for Don't Spoil It RG (original drawings, not actor likenesses)
  wanda: { hair: "shoulder", hairColor: "#6a1c14", skin: "#d2ae98", skinShadow: "#6a4646", clothes: "blouse", clothColor: "#7a121c", hat: "crown" },
  doom: { hair: "none", hairColor: "#000", skin: "#8e959e", skinShadow: "#3a4048", clothes: "jacket", clothColor: "#1e4a2a", hat: "hood", mask: true },
  vision: { hair: "none", hairColor: "#000", skin: "#d6dae2", skinShadow: "#7a808e", clothes: "suit", clothColor: "#3a3e4a", seams: true },
  // Julián Santana Barrera (illustrative design, not a likeness): weathered older man, straw sombrero, moustache, tan work shirt
  julian: { hair: "short", hairColor: "#2a2624", skin: "#b07a58", skinShadow: "#5a3a30", clothes: "jacket", clothColor: "#c8a878", age: 0.75, hat: "straw", mustache: true },
  // visitors (back/side views)
  photographer: { hair: "short", hairColor: "#1a1418", skin: "#b88a6a", skinShadow: "#5a4038", clothes: "blouse", clothColor: "#6a6a86", hat: "cap" },
  visitor: { hair: "shoulder", hairColor: "#140e10", skin: "#c49a7a", skinShadow: "#624a44", clothes: "blouse", clothColor: "#5a3a4a" },
  // Continuity bible (production-pack/VISUAL_CONTINUITY.md)
  // Koichi Shikishima — adult, neat 1940s dark hair, lean face, dark work jacket, protective
  koichi: { hair: "short", hairColor: "#0d0c0e", skin: "#b89a84", skinShadow: "#5b4a48", clothes: "jacket", clothColor: "#23262c" },
  // Noriko Shikishima — black shoulder-length 1940s hair, pale beige clothing, small dark neck mark (cause not asserted)
  noriko: { hair: "shoulder", hairColor: "#110e10", skin: "#c9ab95", skinShadow: "#665052", clothes: "blouse", clothColor: "#cdbf9f" },
  // Akiko — young girl, short dark hair, modest period dress
  akiko: { hair: "child", hairColor: "#141012", skin: "#d0b09a", skinShadow: "#6a5352", clothes: "blouse", clothColor: "#8a5a4a" },
  // Doctor Ogata — mature doctor, graying hair, brown period jacket over collared shirt
  ogata: { hair: "parted", hairColor: "#6f6b66", skin: "#ad8f7b", skinShadow: "#544442", clothes: "suit", clothColor: "#4a3a2a", age: 0.7 },
  // Kenji Noda — technical strategist, dark 1940s suit, battle-weary, round glasses
  noda: { hair: "parted", hairColor: "#1a1816", skin: "#b49580", skinShadow: "#574644", clothes: "suit", clothColor: "#23211f", glasses: true, age: 0.35 },
  // Kanji Murakami — elder biologist with war trauma (original look, not an actor likeness)
  murakami: { hair: "elder", hairColor: "#8d8a86", skin: "#a88c78", skinShadow: "#4f403d", clothes: "labcoat", clothColor: "#d6d2c8", age: 1 },
  // Makoto Aoyama — woman weather specialist, pinned 1940s hair, period blouse + cardigan
  aoyama: { hair: "pinned", hairColor: "#120e0f", skin: "#c4a58f", skinShadow: "#624c4c", clothes: "blouse", clothColor: "#3c4a52" },
};

const HEAD =
  "M -8,-150 C 40,-150 78,-120 86,-70 C 89,-56 90,-48 88,-40 C 86,-34 86,-30 90,-22 C 98,-6 108,10 114,22 " +
  "C 116,28 112,33 104,34 C 100,35 97,37 96,41 C 99,46 101,50 99,54 C 96,57 94,58 95,61 C 98,65 97,70 92,73 " +
  "C 88,76 86,80 88,86 C 92,96 90,106 80,112 C 66,120 44,120 26,114 C 14,110 8,112 6,122 L 8,210 L -66,210 " +
  "C -64,160 -66,120 -72,92 C -100,60 -112,10 -110,-40 C -106,-110 -60,-150 -8,-150 Z";
const PROFILE_EDGE =
  "M 40,-148 C 70,-135 84,-100 86,-70 C 89,-56 90,-48 88,-40 C 86,-34 86,-30 90,-22 C 98,-6 108,10 114,22 " +
  "C 116,28 112,33 104,34 C 100,35 97,37 96,41 C 99,46 101,50 99,54 C 96,57 94,58 95,61 C 98,65 97,70 92,73 " +
  "C 88,76 86,80 88,86 C 92,96 90,106 80,112";
const SHADOW = "M -130,-170 L 20,-170 C 0,-90 -6,-10 24,62 C 40,104 18,150 22,230 L -130,230 Z";

const HAIR: Record<Look["hair"], string> = {
  // hairline runs forehead → temple → sideburn → behind the ear → nape, leaving the face clear
  short:
    "M 80,-92 C 86,-136 46,-184 -16,-184 C -88,-182 -132,-128 -126,-46 C -122,6 -106,48 -80,78 C -72,52 -60,30 -50,12 " +
    "C -46,-10 -36,-30 -14,-40 L -8,-4 L 4,-4 C 4,-30 8,-56 24,-72 C 44,-84 66,-84 80,-92 Z " +
    "M 78,-96 C 88,-78 86,-62 74,-52 C 72,-68 66,-82 56,-90 Z",
  bob:
    "M 98,-54 C 106,-132 56,-192 -18,-192 C -108,-190 -150,-112 -146,-20 C -144,52 -122,106 -88,122 C -62,116 -52,94 -56,64 " +
    "C -58,32 -44,-8 -22,-34 C -10,-46 2,-56 14,-66 C 40,-76 70,-64 98,-54 Z",
  parted:
    "M 84,-96 C 88,-142 40,-178 -20,-178 C -92,-174 -130,-120 -124,-40 C -120,10 -104,50 -82,74 C -72,48 -62,26 -50,8 " +
    "C -44,-14 -32,-30 -14,-40 L -8,-6 L 4,-6 C 4,-36 10,-62 30,-80 C 50,-92 70,-96 84,-96 Z",
  shoulder:
    "M 98,-54 C 106,-132 56,-192 -18,-192 C -110,-190 -152,-112 -150,-20 C -150,70 -140,150 -110,196 C -90,206 -70,200 -62,186 " +
    "C -70,140 -66,90 -56,56 C -54,24 -42,-10 -22,-34 C -10,-46 2,-56 14,-66 C 40,-76 70,-64 98,-54 Z",
  child:
    "M 100,-66 C 104,-136 56,-188 -16,-188 C -104,-186 -146,-110 -142,-24 C -140,30 -126,70 -104,86 C -84,84 -66,70 -62,44 " +
    "C -56,14 -40,-16 -20,-36 C 10,-60 50,-70 100,-66 Z",
  pinned:
    "M 86,-90 C 92,-140 44,-184 -20,-184 C -96,-180 -134,-122 -128,-50 C -124,-6 -110,26 -92,44 C -80,30 -66,10 -54,-6 " +
    "C -44,-22 -30,-34 -14,-42 C 12,-74 50,-86 86,-90 Z M -150,-70 a 46,42 0 1,0 92,0 a 46,42 0 1,0 -92,0 Z",
  none: "M 0,0 Z",
  elder:
    "M 62,-118 C 30,-162 -62,-170 -106,-102 C -124,-62 -120,-10 -100,30 C -90,10 -80,-10 -62,-24 C -42,-32 -28,-36 -16,-40 " +
    "C 0,-72 22,-102 62,-118 Z",
};
const HAIR_STRANDS: Record<Look["hair"], string[]> = {
  short: ["M 60,-150 Q 0,-170 -70,-140", "M 50,-120 Q -20,-130 -100,-70", "M 20,-100 Q -50,-90 -110,-10", "M 70,-110 Q 40,-130 0,-140"],
  bob: ["M 70,-150 Q 0,-176 -80,-140", "M 60,-110 Q -20,-120 -120,-40", "M 0,-90 Q -80,-30 -110,90", "M -40,-60 Q -70,20 -80,100", "M 90,-70 Q 60,-90 20,-80"],
  parted: ["M 30,-176 Q 40,-130 84,-100", "M 20,-160 Q -40,-150 -100,-90", "M 0,-120 Q -60,-100 -112,-20"],
  shoulder: ["M 70,-150 Q 0,-176 -80,-140", "M 60,-110 Q -20,-120 -130,-30", "M -10,-90 Q -90,0 -110,180", "M -50,-50 Q -84,60 -84,180", "M 90,-70 Q 60,-90 20,-80"],
  child: ["M 70,-150 Q 0,-176 -80,-140", "M 40,-100 Q -40,-100 -120,0", "M 96,-80 L 70,-60 M 76,-90 L 50,-66"],
  pinned: ["M 60,-150 Q 0,-170 -70,-140", "M 40,-120 Q -30,-120 -100,-60", "M -140,-80 Q -104,-100 -66,-80"],
  none: [],
  elder: ["M 40,-130 Q -20,-150 -90,-100", "M 10,-100 Q -50,-100 -108,-20"],
};

export const Profile: React.FC<{
  look: Look;
  x: number; y: number; scale?: number; flip?: boolean;
  rim?: string; rimStrength?: number; light?: number;
  blink?: boolean; tilt?: number; breathe?: number;
  mark?: number; markGlow?: number; boil?: string; id: string; smile?: number;
}> = ({ look, x, y, scale = 1, flip = false, rim = "#9fc4ff", rimStrength = 1, light = 1, blink = false, tilt = 0, breathe = 0, mark = 0, markGlow = 0, boil, id, smile = 0 }) => {
  const a = look.age ?? 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} filter={boil ? `url(#${boil})` : undefined}>
      <defs>
        <clipPath id={`hc-${id}`}><path d={HEAD} /></clipPath>
      </defs>
      {/* torso */}
      <g transform={`translate(0 ${breathe * 4})`}>
        <Torso look={look} id={id} rim={rim} rimStrength={rimStrength} />
      </g>
      <g transform={`rotate(${tilt} -20 120)`}>
        {/* head base */}
        <path d={HEAD} fill={look.skin} opacity={0.35 + 0.65 * light} />
        <g clipPath={`url(#hc-${id})`}>
          <path d={HEAD} fill={look.skinShadow} opacity={1 - light} />
          <path d={SHADOW} fill={look.skinShadow} opacity={0.92} />
          {/* jaw / cheek shadows */}
          <path d="M -40,40 C 0,80 40,104 80,112 L 80,130 L -60,130 Z" fill={look.skinShadow} opacity={0.6} />
          <path d="M 40,-10 C 52,10 58,30 70,44 C 60,44 46,30 40,-10 Z" fill={look.skinShadow} opacity={0.35 + a * 0.3} />
          {/* neck mark (Noriko) */}
          {mark > 0 && <NeckMark amount={mark} glow={markGlow} />}
        </g>
        {/* ear */}
        <ellipse cx={-30} cy={2} rx={14} ry={27} fill={look.skinShadow} />
        <path d="M -24,-18 C -14,-10 -16,14 -26,22" stroke="#2a2022" strokeWidth={3} fill="none" />
        {/* features */}
        <path d="M 44,-52 Q 66,-62 88,-50" stroke={look.hair === "elder" ? "#6d6966" : "#120f10"} strokeWidth={7} strokeLinecap="round" fill="none" />
        {blink ? (
          <path d="M 52,-30 Q 64,-26 78,-30" stroke="#1a1214" strokeWidth={4} fill="none" strokeLinecap="round" />
        ) : (
          <>
            <path d="M 54,-28 Q 66,-40 80,-30 Q 70,-24 54,-28 Z" fill="#e8ddd0" />
            <ellipse cx={72} cy={-30} rx={4.5} ry={6} fill={look.eyeColor ?? "#120c0c"} />
            <circle cx={73.5} cy={-32} r={1.6} fill="#fff" opacity={0.9} />
            <path d="M 50,-34 Q 66,-44 82,-31" stroke="#120c0c" strokeWidth={4} fill="none" strokeLinecap="round" />
            <path d="M 58,-22 Q 68,-20 76,-25" stroke="#3a2a2a" strokeWidth={1.8} fill="none" />
          </>
        )}
        <path d="M 84,32 Q 76,48 84,68" stroke="#3a2a2a" strokeWidth={2} fill="none" opacity={0.5 + a * 0.4} />
        <path d={`M 95,61 Q 88,${62 + smile * 4} 80,${63 - smile * 5}`} stroke="#2a1a1a" strokeWidth={2.5} strokeLinecap="round" fill="none" />
        {a > 0.2 && (
          <g stroke="#3a2a28" strokeWidth={1.6} fill="none" opacity={a}>
            <path d="M 20,-110 Q 50,-116 76,-104" /><path d="M 26,-94 Q 52,-100 78,-90" />
            <path d="M 80,-26 l 10,-6 M 80,-20 l 10,0" /><path d="M 56,-14 Q 66,-6 78,-12" />
            <path d="M 30,40 Q 40,70 60,90" />
          </g>
        )}
        {/* hair */}
        <path d={HAIR[look.hair]} fill={look.hairColor} />
        {/* anime hair sheen band + strand lines */}
        {look.hair !== "none" && <path d={look.hair === "bob" || look.hair === "shoulder" || look.hair === "child" ? "M 70,-160 Q 0,-182 -90,-136" : "M 50,-162 Q -10,-176 -86,-134"} stroke={rim} strokeWidth={12} fill="none" opacity={0.22 * rimStrength} strokeLinecap="round" />}
        <g stroke={look.hair === "elder" ? "#c9c4bc" : "#3a3236"} strokeWidth={2.2} fill="none" opacity={0.75} strokeLinecap="round">
          {HAIR_STRANDS[look.hair].map((d, i) => <path key={i} d={d} />)}
        </g>
        {look.hair === "elder" && (
          <path d="M -100,10 C -112,-70 -62,-150 50,-124" stroke="#d8d3ca" strokeWidth={2} fill="none" opacity={0.6} strokeDasharray="2 6" />
        )}
        {look.mustache && <path d="M 102,40 C 96,52 82,54 68,48 C 74,40 88,36 102,40 Z" fill="#3a3230" stroke="#120c0a" strokeWidth={2} />}
        {look.glasses && (
          <g stroke="#1b1712" strokeWidth={3} fill="none">
            <circle cx={66} cy={-31} r={19} fill="#cfe2ff" fillOpacity={0.08} />
            <path d="M 85,-34 L 96,-30" /><path d="M 47,-34 L -18,-16" />
          </g>
        )}
        {/* rim light along the lit profile edge */}
        <path d={PROFILE_EDGE} stroke={rim} strokeWidth={5} fill="none" opacity={0.85 * rimStrength} />
        {/* ink contour */}
        <path d={HEAD} stroke="#0a0708" strokeWidth={3.2} fill="none" />
        <path d={HAIR[look.hair]} stroke="#050405" strokeWidth={2.4} fill="none" />
        {look.hat === "straw" && (
          <g>
            <path d="M -96,-122 C -98,-170 -80,-214 -12,-218 C 50,-220 74,-176 70,-122 Z" fill="#d6b474" stroke="#2a1a0a" strokeWidth={3.5} />
            {[-70, -40, -10, 20, 48].map((x) => <path key={x} d={`M ${x},-124 C ${x - 4},-160 ${x},-190 ${x + 6},-212`} stroke="#8a6a3a" strokeWidth={2} fill="none" />)}
            <path d="M -98,-140 C -40,-150 20,-150 72,-138 L 72,-122 C 20,-134 -40,-134 -98,-124 Z" fill="#6a3a20" />
            <ellipse cx={-14} cy={-122} rx={230} ry={34} fill="#dcbc7c" stroke="#2a1a0a" strokeWidth={3.5} transform="rotate(-4 -14 -122)" />
            {[-200, -150, -100, -50, 0, 50, 100, 150, 190].map((x) => <path key={x} d={`M ${x},${-126 + Math.abs(x) * 0.02} l 18,12`} stroke="#8a6a3a" strokeWidth={2} />)}
            <ellipse cx={-14} cy={-112} rx={200} ry={20} fill="#000" opacity={0.25} transform="rotate(-4 -14 -112)" />
          </g>
        )}
        {look.mask && (
          <g>
            <path d="M 46,-40 L 92,-36 L 92,-24 L 46,-26 Z" fill="#05070a" />
            <path d="M 70,52 L 98,52 M 72,62 L 96,62 M 74,72 L 92,72" stroke="#1a1e24" strokeWidth={3} />
            <path d="M 40,-110 C 70,-90 86,-60 88,-40 M 30,0 C 50,30 60,70 70,104" stroke="#5a626c" strokeWidth={3} fill="none" />
            {[[30, -80], [20, 40], [60, 90], [-20, -30]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={4} fill="#c8ccd2" stroke="#2a2e34" strokeWidth={1.5} />)}
          </g>
        )}
        {look.seams && (
          <g stroke="#8a90a0" strokeWidth={2.5} fill="none">
            <path d="M 10,-150 C 30,-120 50,-100 70,-96" /><path d="M -40,-140 C -10,-100 10,-80 40,-70" /><path d="M 20,30 C 40,60 50,80 60,100" />
          </g>
        )}
        {look.hat === "hood" && (
          <path d="M 70,-128 C 40,-190 -80,-200 -130,-120 C -170,-50 -160,60 -120,140 C -110,190 -90,220 -60,240 L -150,260 C -190,160 -200,20 -170,-90 C -140,-190 0,-230 90,-150 Z" fill="#1e4a2a" stroke="#06140a" strokeWidth={4} />
        )}
        {look.hat === "crown" && (
          <g>
            <path d="M 92,-70 L 70,-150 L 56,-96 L 30,-176 L 14,-104 L -14,-150 L -16,-96 C 20,-90 60,-82 92,-70 Z" fill="#8a141e" stroke="#2a0408" strokeWidth={3.5} />
            <path d="M 92,-70 C 60,-82 20,-90 -16,-96" stroke="#d24a5a" strokeWidth={3} fill="none" />
          </g>
        )}
        {look.hat === "cap" && (
          <g>
            <path d="M -116,-60 C -126,-150 -60,-186 10,-180 C 70,-176 96,-140 96,-96 L -116,-60 Z" fill="#3a3a54" stroke="#0a0a12" strokeWidth={3} />
            <path d="M 70,-100 C 120,-104 170,-96 186,-80 C 150,-74 110,-78 70,-84 Z" fill="#2a2a40" stroke="#0a0a12" strokeWidth={3} />
          </g>
        )}
      </g>
    </g>
  );
};

const NeckMark: React.FC<{ amount: number; glow: number }> = ({ amount, glow }) => {
  // dark blotch on the side of the neck with creeping veins (veins extend with `amount`)
  const veins = [
    "M -20,140 C -6,120 6,104 20,94", "M -20,140 C -40,124 -50,104 -54,84", "M -18,150 C 0,160 4,180 0,200",
    "M -24,146 C -44,156 -56,176 -60,196", "M -16,136 C 2,132 14,138 30,132",
  ];
  return (
    <g>
      <ellipse cx={-20} cy={142} rx={18 + 6 * amount} ry={13 + 4 * amount} fill="#140608" opacity={0.85} />
      {veins.map((d, i) => (
        <path key={i} d={d} stroke="#1a0608" strokeWidth={3.2 - i * 0.3} fill="none" strokeLinecap="round"
          pathLength={1} strokeDasharray={`${Math.min(1, amount)} 1`} />
      ))}
      {glow > 0 && (
        <ellipse cx={-20} cy={142} rx={10} ry={7} fill="#7fd4ff" opacity={glow} />
      )}
    </g>
  );
};

const Torso: React.FC<{ look: Look; id: string; rim: string; rimStrength: number }> = ({ look, rim, rimStrength }) => {
  const body = "M -66,186 C -150,196 -214,226 -244,280 L -280,620 L 250,620 L 214,300 C 196,240 130,206 10,190 Z";
  return (
    <g>
      <path d={body} fill={look.clothColor} />
      <path d="M -244,280 C -200,300 -150,330 -120,400 L -120,620 L -280,620 Z" fill="#000" opacity={0.45} />
      {look.clothes === "jacket" && (
        <g stroke="#0a0a0c" strokeWidth={3} fill="none">
          <path d="M 4,192 L 44,262 L 78,198" fill="#ddd8cc" />
          <path d="M 44,262 L 20,330 M 44,262 L 120,320" />
          <path d="M -60,200 C -40,260 -20,300 20,330" />
        </g>
      )}
      {look.clothes === "blouse" && (
        <g stroke="#6a655c" strokeWidth={2.5} fill="none">
          <path d="M 2,192 C 20,214 46,222 74,200" /><path d="M 38,220 L 38,380" strokeDasharray="2 22" strokeWidth={6} />
          <path d="M -150,260 C -120,330 -110,420 -116,520" />
        </g>
      )}
      {look.clothes === "suit" && (
        <g stroke="#0d0b09" strokeWidth={3}>
          <path d="M 4,192 L 40,250 L 74,198 Z" fill="#e0dbcf" />
          <path d="M 40,250 L 40,360" stroke="#3a1a1a" strokeWidth={10} />
          <path d="M -40,196 L 20,300 L 40,250" fill="none" /><path d="M 110,212 L 70,300 L 40,250" fill="none" />
        </g>
      )}
      {look.clothes === "labcoat" && (
        <g stroke="#7d786e" strokeWidth={2.5} fill="none">
          <path d="M 6,192 L 30,250 L 70,200" fill="#4a4640" />
          <path d="M 30,250 L 4,620" /><path d="M -50,200 C -20,240 0,260 30,250" /><path d="M 100,210 C 70,240 50,250 30,250" />
        </g>
      )}
      <path d="M 10,190 C 130,206 196,240 214,300 L 250,620" stroke={rim} strokeWidth={4} fill="none" opacity={0.6 * rimStrength} />
      <path d={body} stroke="#050405" strokeWidth={3} fill="none" />
    </g>
  );
};

/** Distant full-body silhouette for wide shots (figures in the city) */
export const Figure: React.FC<{ x: number; y: number; h?: number; umbrella?: boolean; color?: string; step?: number; flip?: boolean }> = ({
  x, y, h = 120, umbrella, color = "#07080a", step = 0, flip,
}) => {
  const s = h / 180;
  const sw = Math.sin(step) * 10;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} fill={color}>
      <ellipse cx={0} cy={-160} rx={11} ry={13} />
      <path d="M -16,-146 C -24,-120 -24,-90 -20,-70 L 20,-70 C 24,-90 24,-120 16,-146 Z" />
      <path d={`M -14,-72 L ${-14 + sw},0 L ${-6 + sw},0 L 0,-60 L ${6 - sw},0 L ${14 - sw},0 L 14,-72 Z`} />
      {umbrella && (
        <g>
          <path d="M 4,-150 L 4,-215" stroke={color} strokeWidth={3} />
          <path d="M -70,-200 Q 4,-260 78,-200 Q 60,-206 40,-200 Q 22,-208 4,-200 Q -14,-208 -32,-200 Q -50,-206 -70,-200 Z" />
        </g>
      )}
    </g>
  );
};

/* =====================================================================
   GODZILLA (original design for this Short; facing left in local space)
   Origin at waterline, body ≈ 1250 units tall. Keloid hide, three rows
   of flame-shaped dorsal plates that can raise + glow independently.
   ===================================================================== */
const G_BODY =
  "M -330,250 C -340,60 -300,-200 -250,-430 C -225,-560 -205,-700 -190,-820 C -185,-880 -190,-930 -205,-960 " +
  "L -60,-1030 C -20,-960 30,-880 80,-760 C 160,-560 260,-300 330,-60 C 360,40 380,150 390,250 Z";
const G_HEAD =
  "M -150,-985 C -190,-975 -260,-985 -330,-1000 C -360,-1006 -372,-1022 -368,-1040 C -364,-1062 -345,-1080 -310,-1090 " +
  "C -280,-1098 -250,-1112 -225,-1130 C -200,-1146 -170,-1150 -130,-1148 C -80,-1140 -50,-1110 -45,-1060 C -45,-1020 -80,-990 -150,-985 Z";
const G_JAW =
  "M -140,-985 C -200,-978 -270,-985 -330,-996 C -340,-990 -338,-975 -320,-965 C -270,-948 -210,-940 -170,-945 C -150,-950 -136,-965 -140,-985 Z";
const G_ARM =
  "M -240,-520 C -300,-480 -330,-420 -340,-360 L -362,-326 L -344,-334 L -350,-306 L -332,-328 L -328,-300 L -316,-334 C -300,-400 -262,-450 -222,-472 Z";
const PLATE = (s: number, raise: number) => {
  // asymmetric flame/maple plate that leans back toward the tail (local +x = tailward)
  const h = s * (0.62 + 0.38 * raise);
  const w = s * 0.62;
  const p = [[-0.45, 0], [-0.5, -0.3], [-0.74, -0.5], [-0.42, -0.52], [-0.44, -0.78], [-0.17, -0.7], [-0.04, -1.05], [0.13, -0.72], [0.38, -0.82], [0.31, -0.5], [0.58, -0.42], [0.4, -0.25], [0.5, 0]];
  return "M " + p.map(([x, y]) => `${((x - y * 0.32) * w).toFixed(1)},${(y * h).toFixed(1)}`).join(" L ") + " Z";
};
const SPINE_PTS: [number, number][] = [[-70, -1040], [-20, -975], [40, -880], [95, -760], [150, -630], [205, -490], [258, -340], [305, -180], [345, -10], [372, 150]];

export const Godzilla: React.FC<{
  x: number; y: number; scale?: number; flip?: boolean;
  jaw?: number; // 0..1 open
  plates?: number[]; // per plate raise 0..1 (length = SPINE_PTS-ish)
  glow?: number[]; // per plate glow 0..1
  eye?: number; rim?: string; rimStrength?: number; headTurn?: number; boil?: string; mouthGlow?: number; id: string;
  bodyColor?: string;
}> = ({ x, y, scale = 1, flip = false, jaw = 0, plates, glow, eye = 0.6, rim = "#7fb8ff", rimStrength = 1, headTurn = 0, boil, mouthGlow = 0, id, bodyColor = "#141416" }) => {
  const tex = useMemo(() => {
    const r = rand(77);
    return Array.from({ length: 240 }, () => {
      const px = -330 + r() * 700, py = -1000 + r() * 1250;
      const l = 14 + r() * 40, a = r() * Math.PI;
      return `M ${px.toFixed(0)},${py.toFixed(0)} q ${(Math.cos(a) * l / 2).toFixed(0)},${(-8 - r() * 10).toFixed(0)} ${(Math.cos(a) * l).toFixed(0)},${(Math.sin(a) * l * 0.4).toFixed(0)}`;
    });
  }, []);
  const n = SPINE_PTS.length;
  const pr = plates ?? Array(n).fill(0.4);
  const gl = glow ?? Array(n).fill(0);
  const sizes = [70, 110, 150, 185, 205, 210, 195, 165, 130, 95];
  const anyGlow = Math.max(0, ...gl);
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} filter={boil ? `url(#${boil})` : undefined}>
      <defs>
        <clipPath id={`gb-${id}`}><path d={G_BODY} /></clipPath>
        <linearGradient id={`gg-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a2b30" /><stop offset="0.5" stopColor={bodyColor} /><stop offset="1" stopColor="#060607" />
        </linearGradient>
      </defs>
      {/* dorsal plates — drawn behind the body: back rows first */}
      {[0.82, 1].map((rowScale, row) =>
        SPINE_PTS.map(([px, py], i) => {
          const [qx, qy] = SPINE_PTS[Math.min(n - 1, i + 1)];
          const [ox, oy] = SPINE_PTS[Math.max(0, i - 1)];
          const dx = qx - ox, dy = qy - oy; const L = Math.hypot(dx, dy) || 1;
          const nx = dy / L, ny = -dx / L;
          const ang = (Math.atan2(ny, nx) * 180) / Math.PI + 90;
          const g = gl[i] ?? 0; const off = row === 0 ? -18 : 6;
          const s = sizes[i] * rowScale;
          return (
            <g key={`${row}-${i}`} transform={`translate(${px + nx * off + (row === 0 ? 14 : 0)} ${py + ny * off}) rotate(${ang})`}>
              <path d={PLATE(s, pr[i] ?? 0.4)} fill={g > 0.05 ? mix("#1c1d22", "#9fe0ff", g) : row === 0 ? "#0b0b0d" : "#1d1e22"}
                stroke="#030304" strokeWidth={3}  />
              {/* central ridge + side veins */}
              <path d={`M 0,0 L ${(0.3 * s * 0.62).toFixed(1)},${(-0.95 * s * (0.62 + 0.38 * (pr[i] ?? 0.4))).toFixed(1)} M ${(0.08 * s).toFixed(1)},${(-0.3 * s).toFixed(1)} l ${(-0.3 * s).toFixed(1)},${(-0.12 * s).toFixed(1)} M ${(0.12 * s).toFixed(1)},${(-0.4 * s).toFixed(1)} l ${(0.26 * s).toFixed(1)},${(-0.06 * s).toFixed(1)}`}
                stroke={g > 0.3 ? "#5fb8e8" : "#000"} strokeWidth={3} fill="none" opacity={0.55} />
              {g > 0.05 && <path d={PLATE(s * 0.6, pr[i] ?? 0.4)} fill="#e8f8ff" opacity={g * 0.8} transform={`translate(0 ${-s * 0.08})`} />}
            </g>
          );
        })
      )}
      {anyGlow > 0.05 && SPINE_PTS.map(([px, py], i) => (gl[i] ?? 0) > 0.05 && <SoftGlow key={`h${i}`} cx={px + 40} cy={py - 60} rx={sizes[i] * 0.9} ry={sizes[i] * 0.9} color="#7fd4ff" opacity={(gl[i] ?? 0) * 0.55} />)}
      {/* body */}
      <path d={G_BODY} fill={`url(#gg-${id})`} />
      <g clipPath={`url(#gb-${id})`}>
        <g stroke="#000" strokeWidth={4} fill="none" opacity={0.55}>{tex.map((d, i) => <path key={i} d={d} />)}</g>
        <g stroke="#3a3c44" strokeWidth={2} fill="none" opacity={0.35} transform="translate(3 -4)">{tex.slice(0, 120).map((d, i) => <path key={i} d={d} />)}</g>
        {/* chest plates / folds */}
        <path d="M -300,-300 C -250,-280 -200,-280 -160,-300 M -310,-200 C -250,-180 -190,-180 -150,-200 M -320,-100 C -250,-80 -180,-80 -140,-100" stroke="#000" strokeWidth={6} fill="none" opacity={0.6} />
        {anyGlow > 0 && <path d="M 80,-760 C 160,-560 260,-300 330,-60" stroke="#8fd8ff" strokeWidth={40} fill="none" opacity={anyGlow * 0.2} />}
      </g>
      <path d={G_ARM} fill="#101012" stroke="#000" strokeWidth={3} />
      {/* head */}
      <g transform={`rotate(${headTurn} -150 -990)`}>
        {mouthGlow > 0 && <SoftGlow cx={-280} cy={-985} rx={90} ry={30 + jaw * 30} color="#bfefff" opacity={mouthGlow} />}
        <ellipse cx={-240} cy={-982} rx={95} ry={6 + jaw * 34} fill="#2a0a0c" />
        <g transform={`rotate(${-jaw * 26} -140 -985)`}>
          <path d={G_JAW} fill="#151517" stroke="#000" strokeWidth={3} />
          <g fill="#d8d0c0">{[-310, -285, -260, -235, -210, -185].map((tx) => <path key={tx} d={`M ${tx},-990 l 7,-16 l 7,16 Z`} />)}</g>
        </g>
        <path d={G_HEAD} fill="#1a1b1f" stroke="#000" strokeWidth={3} />
        <g fill="#d8d0c0">{[-318, -294, -270, -246, -222, -198, -176].map((tx) => <path key={tx} d={`M ${tx},-996 l 7,${10 + jaw * 8} l 7,${-10 - jaw * 8} Z`} />)}</g>
        <path d="M -300,-1086 C -270,-1104 -244,-1122 -214,-1134" stroke="#000" strokeWidth={10} fill="none" />
        <path d="M -330,-1030 C -300,-1040 -260,-1046 -220,-1040" stroke="#000" strokeWidth={3} fill="none" opacity={0.6} />
        <ellipse cx={-236} cy={-1104} rx={9} ry={6} fill="#f2f0e6" opacity={eye} />
        <circle cx={-238} cy={-1104} r={3.5} fill="#000" />
        <path d={G_HEAD} stroke={rim} strokeWidth={4} fill="none" opacity={0.5 * rimStrength} />
      </g>
      <path d="M -60,-1030 C -20,-960 30,-880 80,-760 C 160,-560 260,-300 330,-60" stroke={rim} strokeWidth={5} fill="none" opacity={0.55 * rimStrength} />
      <path d={G_BODY} stroke="#000" strokeWidth={4} fill="none" />
    </g>
  );
};

export const PLATE_COUNT = SPINE_PTS.length;

/** hex color mix */
export const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, "0")).join("");
};
