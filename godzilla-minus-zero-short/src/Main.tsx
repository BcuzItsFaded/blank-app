import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, continueRender, delayRender } from "remotion";
import { SCENES, SCENE_FRAMES, PAD, W, H, clamp, lerp, pulse } from "./lib";
import { Grain, Vignette, FilmDamage, KeyframePlate } from "./fx";
import { SCENE_COMPONENTS, wordFrame } from "./scenes";
import timings from "./timings.json";

/* ------------------------------------------------------------------ fonts */
const fontHandle = delayRender("fonts", { timeoutInMilliseconds: 120000 });
const faces = [
  new FontFace("Oswald", `url(${staticFile("fonts/Oswald.ttf")})`, { weight: "200 700" }),
  new FontFace("Cinzel", `url(${staticFile("fonts/Cinzel.ttf")})`, { weight: "400 900" }),
  new FontFace("Shippori", `url(${staticFile("fonts/ShipporiMincho-Subset.ttf")})`),
];
Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))))
  .then(() => continueRender(fontHandle))
  .catch((e) => { console.error(e); continueRender(fontHandle); });

/* ------------------------------------------------------------------ transitions */
type Tr = string;
const enterStyle = (t: Tr | undefined, f: number): React.CSSProperties => {
  if (!t || f >= PAD) return {};
  const p = clamp((f + PAD) / (2 * PAD));
  const q = clamp(f / PAD);
  switch (t) {
    case "dissolve": return { opacity: p };
    case "flash": return { opacity: f >= 0 ? 1 : 0 };
    case "whip": return f < 0 ? { opacity: 0 } : { transform: `translateX(${(1 - q) ** 2 * W}px)`, filter: `blur(${(1 - q) * 24}px)` };
    case "zoomBlack": return f < 0 ? { opacity: 0 } : { opacity: q, transform: `scale(${1.15 - 0.15 * q})` };
    case "riseWipe": return { transform: `translateY(${(1 - p) ** 2 * H}px)`, opacity: p > 0 ? 1 : 0 };
    case "fadeBlack": return f < 0 ? { opacity: 0 } : { opacity: q };
    default: return f < 0 ? { opacity: 0 } : {};
  }
};
const exitStyle = (t: Tr, f: number): React.CSSProperties => {
  const g = f - SCENE_FRAMES; // -PAD .. +PAD
  if (g < -PAD) return {};
  const p = clamp((g + PAD) / PAD); // 0..1 over the last PAD frames
  switch (t) {
    case "whip": return { transform: `translateX(${-(p ** 2) * W}px)`, filter: `blur(${p * 24}px)` };
    case "zoomBlack": return { transform: `scale(${1 + 0.5 * p * p})`, filter: `brightness(${1 - p})` };
    case "fadeBlack": return { opacity: 1 - p };
    case "riseWipe": return { transform: `translateY(${-p * p * 400}px)` };
    default: return {};
  }
};
const merge = (a: React.CSSProperties, b: React.CSSProperties): React.CSSProperties => ({
  opacity: Number(a.opacity ?? 1) * Number(b.opacity ?? 1),
  transform: [a.transform, b.transform].filter(Boolean).join(" ") || undefined,
  filter: [a.filter, b.filter].filter(Boolean).join(" ") || undefined,
});

const SceneShell: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame() - PAD; // scene-local frame (0 = cut)
  const s = SCENES[i];
  const C = SCENE_COMPONENTS[i];
  const style = merge(enterStyle(i > 0 ? SCENES[i - 1].transitionOut : undefined, f), exitStyle(s.transitionOut, f));
  return (
    <AbsoluteFill style={{ ...style, overflow: "hidden" }}>
      <C s={s} f={f} />
      <KeyframePlate s={s} f={f} />
    </AbsoluteFill>
  );
};

/* boundary flashes for "flash" transitions */
const BoundaryFlash: React.FC = () => {
  const fr = useCurrentFrame();
  let v = 0;
  SCENES.forEach((s, i) => {
    if (s.transitionOut !== "flash") return;
    const b = (i + 1) * SCENE_FRAMES;
    v = Math.max(v, interpolate(fr, [b - 4, b, b + 10], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  });
  return v > 0 ? <AbsoluteFill style={{ background: "#e8f4ff", opacity: v, mixBlendMode: "screen" }} /> : null;
};

/* ------------------------------------------------------------------ brand mark */
export const BrandMark: React.FC<{ scale?: number; glow?: number }> = ({ scale = 1, glow = 0 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 * scale, transformOrigin: "left center" }}>
    <svg width={64 * scale} height={64 * scale} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={30} fill="#0b0b0e" stroke="#e8443a" strokeWidth={3} />
      {/* twisted arrow */}
      <path d="M 16,40 C 20,18 40,16 44,30 C 47,40 36,46 30,38" stroke="#f2ede4" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M 40,20 L 47,30 L 36,32" fill="#e8443a" />
    </svg>
    <div style={{ lineHeight: 1, fontFamily: "Oswald", color: "#f2ede4", textShadow: `0 2px 8px #000${glow ? `, 0 0 ${20 * glow}px #e8443a` : ""}` }}>
      <div style={{ fontSize: 30 * scale, fontWeight: 700, letterSpacing: 2 * scale }}>PLOT TWIST</div>
      <div style={{ fontSize: 20 * scale, fontWeight: 400, letterSpacing: 5 * scale, color: "#e8443a" }}>with A&amp;R</div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ fact tag */
const TAG_COLORS: Record<string, string> = { CONFIRMED: "#6fd39a", "STAGED VISUAL": "#f0b04a", THEORY: "#ff5a4a" };
const FactTag: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const s = SCENES[i];
  const a = interpolate(f, [6, 14, 136, 146], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const c = TAG_COLORS[s.factTag] ?? "#fff";
  return (
    <div style={{ position: "absolute", left: 48, top: 170, opacity: a, transform: `translateX(${(1 - a) * -30}px)`, fontFamily: "Oswald", maxWidth: 860 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(5,6,8,0.72)", border: `2px solid ${c}`, borderRadius: 8, padding: "6px 14px" }}>
        <span style={{ color: c, fontWeight: 700, fontSize: 30, letterSpacing: 3 }}>{s.factTag}</span>
        <span style={{ color: "#e4e0d8", fontSize: 28, letterSpacing: 0.5 }}>{s.factNote}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ subtitles */
const Subtitles: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const tm = timings.scenes[i];
  const t = f / 30 - (tm.start - i * 5); // seconds since narration start
  if (t < -0.15 || t > tm.duration + 0.35) return null;
  // break into lines of ≈ 20 chars
  const lines: { w: string; k: number }[][] = [[]];
  let len = 0;
  tm.words.forEach((w, k) => {
    if (len + w.w.length > 20 && lines[lines.length - 1].length) { lines.push([]); len = 0; }
    lines[lines.length - 1].push({ w: w.w, k }); len += w.w.length + 1;
  });
  // show at most two lines: the pair containing the active word
  const active = tm.words.findIndex((w) => t >= w.t0 && t < w.t1 + 0.12);
  const spoken = tm.words.filter((w) => t >= w.t0).length - 1;
  const cur = Math.max(0, active >= 0 ? active : spoken);
  const li = lines.findIndex((l) => l.some((x) => x.k === cur));
  const start = Math.floor(Math.max(0, li) / 2) * 2;
  const shown = lines.slice(start, start + 2);
  const pop = interpolate(t, [-0.15, 0.05], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(t, [tm.duration + 0.1, tm.duration + 0.35], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 70, right: 150, top: 1180, textAlign: "center", opacity: out, transform: `scale(${pop})` }}>
      {shown.map((l, j) => (
        <div key={j} style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 78, lineHeight: 1.12, textTransform: "uppercase", letterSpacing: 1 }}>
          {l.map(({ w, k }) => {
            const on = k === cur && t <= tm.words[k].t1 + 0.12;
            const said = k <= cur;
            return (
              <span key={k} style={{
                color: on ? "#8fdcff" : said ? "#ffffff" : "rgba(255,255,255,0.55)",
                WebkitTextStroke: "10px #000", paintOrder: "stroke fill",
                textShadow: on ? "0 0 24px rgba(95,200,255,0.8), 0 6px 0 #000" : "0 6px 0 #000",
                display: "inline-block", margin: "0 10px", transform: on ? "translateY(-4px) scale(1.06)" : undefined,
              }}>{w}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ scene 10 plot-twist card */
const PlotTwistCard: React.FC = () => {
  const f = useCurrentFrame();
  const slam = interpolate(f, [wordFrame(10, 0) - 2, wordFrame(10, 0) + 6], [2.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const a = interpolate(f, [wordFrame(10, 0) - 2, wordFrame(10, 0) + 3, 140, 150], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const jitter = f < 50 ? (Math.sin(f * 3.1) * 4) : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 420, display: "flex", flexDirection: "column", alignItems: "center", opacity: a, transform: `translateX(${jitter}px) scale(${slam})` }}>
      <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 150, color: "#fff", letterSpacing: 6, WebkitTextStroke: "12px #000", paintOrder: "stroke fill", textShadow: "0 0 40px rgba(232,68,58,0.9), 0 10px 0 #000", transform: "rotate(-4deg)" }}>PLOT TWIST</div>
      <div style={{ marginTop: 10 }}><BrandMark scale={1.5} glow={1} /></div>
    </div>
  );
};

/* ------------------------------------------------------------------ scene 12 title */
const TitleCard: React.FC = () => {
  const f = useCurrentFrame();
  const burn = interpolate(f, [4, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rel = interpolate(f, [wordFrame(12, 3) - 4, wordFrame(12, 3) + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const brand = interpolate(f, [wordFrame(12, 6) - 4, wordFrame(12, 6) + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fl = 0.85 + 0.15 * pulse(f, 7);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", filter: `blur(${(1 - burn) * 18}px)`, opacity: burn, transform: `scale(${1.25 - 0.25 * burn})` }}>
        <div style={{ fontFamily: "Shippori", fontSize: 80, color: "#9fdcff", letterSpacing: 30, textShadow: "0 0 30px #2a8ad0", opacity: 0.9 }}>ゴジラ</div>
        <div style={{ fontFamily: "Cinzel", fontWeight: 900, fontSize: 168, color: "#eef6fa", letterSpacing: 6, lineHeight: 1, textShadow: `0 0 ${40 * fl}px rgba(95,200,255,0.85), 0 8px 0 #000` }}>GODZILLA</div>
        <div style={{ fontFamily: "Cinzel", fontWeight: 700, fontSize: 92, color: "#bfe8ff", letterSpacing: 26, marginTop: 10, textShadow: "0 0 30px rgba(95,200,255,0.9)" }}>MINUS ZERO</div>
        <div style={{ margin: "26px auto 0", width: 520 * burn, height: 4, background: "linear-gradient(90deg, transparent, #8fdcff, transparent)" }} />
      </div>
      <div style={{ position: "absolute", top: 820, left: 0, right: 0, textAlign: "center", opacity: rel, transform: `translateY(${(1 - rel) * 20}px)`, fontFamily: "Oswald", color: "#e8eef2", textShadow: "0 3px 8px #000" }}>
        <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: 8 }}>IN THEATERS NOVEMBER 2026</div>
        <div style={{ fontSize: 30, letterSpacing: 6, color: "#9fb8c8", marginTop: 8 }}>JAPAN NOV 3 · US NOV 6</div>
      </div>
      <div style={{ position: "absolute", top: 1560, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: brand, transform: `scale(${0.7 + 0.3 * brand})` }}>
        <BrandMark scale={1.6} glow={brand} />
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ main */
export const Main: React.FC = () => {
  const fr = useCurrentFrame();
  const si = Math.min(11, Math.floor(fr / SCENE_FRAMES));
  // small persistent brand mark (hidden while the big versions are on screen)
  const showSmall = !(si === 9 && fr % SCENE_FRAMES > 8) && !(si === 11 && fr % SCENE_FRAMES > wordFrame(12, 6) - 6);
  const weave = { transform: `translate(${Math.sin(fr * 1.7) * 1.2}px, ${Math.cos(fr * 2.3) * 1.5}px)` };
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={weave}>
        {SCENES.map((s, i) => (
          <Sequence key={s.id} from={i * SCENE_FRAMES - PAD} durationInFrames={SCENE_FRAMES + PAD * 2} name={`${String(s.id).padStart(2, "0")} ${s.name}`}>
            <SceneShell i={i} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <BoundaryFlash />
      {/* 90s anime-horror finishing: grade, grain, vignette, damage */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,20,40,0.18), rgba(30,10,5,0.12))", mixBlendMode: "multiply" }} />
      <Vignette />
      <Grain f={fr} />
      <FilmDamage f={fr} />
      {/* text layers */}
      {SCENES.map((s, i) => (
        <Sequence key={`t${s.id}`} from={i * SCENE_FRAMES} durationInFrames={SCENE_FRAMES} layout="none">
          <FactTag i={i} />
          {i === 9 && <PlotTwistCard />}
          {i === 11 && <TitleCard />}
          <Subtitles i={i} />
        </Sequence>
      ))}
      {showSmall && <div style={{ position: "absolute", left: 48, top: 72, opacity: 0.92 }}><BrandMark /></div>}
      <Audio src={staticFile("audio/narration.wav")} volume={1} />
      <Audio src={staticFile("audio/score.wav")} volume={0.42} />
      <Audio src={staticFile("audio/sfx.wav")} volume={0.6} />
    </AbsoluteFill>
  );
};
