import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, continueRender, delayRender } from "remotion";
import { SCENES, SCENE_FRAMES, PAD, W, H, clamp, pulse } from "./lib";
import meta from "./scenes.json";
import { Grain, Vignette, FilmDamage, KeyframePlate, DBG } from "./fx";
import { SCENE_COMPONENTS, wordFrame } from "./scenes";
import timings from "./timings.json";

/* ------------------------------------------------------------------ fonts */
let fontsPromise: Promise<unknown> | null = null;
const loadFonts = () => {
  if (!fontsPromise) {
    const faces = [
      new FontFace("Oswald", `url(${staticFile("fonts/Oswald.ttf")})`, { weight: "200 700" }),
      new FontFace("Cinzel", `url(${staticFile("fonts/Cinzel.ttf")})`, { weight: "400 900" }),
      new FontFace("Shippori", `url(${staticFile("fonts/ShipporiMincho-Subset.ttf")})`),
    ];
    fontsPromise = Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))));
  }
  return fontsPromise;
};
const useFonts = () => {
  const [handle] = React.useState(() => delayRender("fonts", { timeoutInMilliseconds: 60000 }));
  React.useEffect(() => {
    loadFonts().then(() => continueRender(handle)).catch((e) => { console.error(e); continueRender(handle); });
  }, [handle]);
};

/* ------------------------------------------------------------------ transitions (pack spec) */
// cut = hard cut · match = 4-frame match dissolve · flash = lightning-flash cut
// flashWipe = white-blue flash wipe · none = end of film
const MATCH = 4;
const enterStyle = (t: string | undefined, f: number): React.CSSProperties => {
  if (!t || f >= PAD) return {};
  switch (t) {
    case "match": return { opacity: clamp((f + MATCH) / (2 * MATCH)) };
    case "flashWipe": {
      if (f < 0) return { opacity: 0 };
      const q = clamp(f / 8);
      return { clipPath: `inset(${(1 - q) * 100}% 0 0 0)` };
    }
    default: return f < 0 ? { opacity: 0 } : {};
  }
};
const SceneShell: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame() - PAD; // scene-local frame (0 = cut)
  const s = SCENES[i];
  const C = SCENE_COMPONENTS[i];
  // scenes after a hard cut don't need to draw before their cut (saves render time)
  const prevT = i > 0 ? SCENES[i - 1].transitionOut : undefined;
  if (f < 0 && prevT !== "match" && i > 0) return null;
  if (f >= SCENE_FRAMES + MATCH && s.transitionOut !== "flashWipe") return null;
  return (
    <AbsoluteFill style={{ ...enterStyle(prevT, f), overflow: "hidden" }}>
      <C s={s} f={f} />
      <KeyframePlate s={s} f={f} />
    </AbsoluteFill>
  );
};

/* lightning flash (scene 8 → 9) and white-blue flash wipe (scene 11 → 12) */
const BoundaryFlash: React.FC = () => {
  const fr = useCurrentFrame();
  let v = 0, color = "#e8f4ff";
  SCENES.forEach((s, i) => {
    const b = (i + 1) * SCENE_FRAMES;
    if (s.transitionOut === "flash") v = Math.max(v, interpolate(fr, [b - 3, b, b + 8], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    if (s.transitionOut === "flashWipe") {
      const w = interpolate(fr, [b - 30, b - 4, b + 2, b + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      if (w > v) { v = w; color = "#cfefff"; }
    }
  });
  return v > 0 ? <AbsoluteFill style={{ background: color, opacity: v, mixBlendMode: "screen" }} /> : null;
};

/* ------------------------------------------------------------------ brand: DON'T SPOIL IT RG (editable) */
export const BRAND = meta.meta.brand; // "DON'T SPOIL IT RG"
export const BrandMark: React.FC<{ scale?: number; glow?: number }> = ({ scale = 1, glow = 0 }) => {
  const [main, tag] = [BRAND.replace(/\s*RG$/, ""), BRAND.match(/RG$/) ? "RG" : ""];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 * scale, fontFamily: "Oswald", lineHeight: 1, filter: `drop-shadow(0 2px 6px #000)${glow ? ` drop-shadow(0 0 ${14 * glow}px rgba(232,68,58,0.8))` : ""}` }}>
      <svg width={40 * scale} height={40 * scale} viewBox="0 0 40 40">
        {/* eye with a slash: "don't spoil it" */}
        <path d="M 3,20 Q 20,4 37,20 Q 20,36 3,20 Z" fill="#0b0b0e" stroke="#f2ede4" strokeWidth={2.5} />
        <circle cx={20} cy={20} r={6} fill="#e8443a" />
        <line x1={6} y1={34} x2={34} y2={6} stroke="#e8443a" strokeWidth={4} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 30 * scale, fontWeight: 700, letterSpacing: 1.5 * scale, color: "#f2ede4" }}>{main}</span>
      {tag && <span style={{ fontSize: 24 * scale, fontWeight: 700, letterSpacing: 1 * scale, color: "#0b0b0e", background: "#e8443a", padding: `${3 * scale}px ${7 * scale}px`, borderRadius: 4 * scale }}>{tag}</span>}
    </div>
  );
};

/* ------------------------------------------------------------------ fact-status label (pack "Status") */
const statusColor = (st: string) =>
  /^CONFIRMED|^OFFICIAL/.test(st) ? "#6fd39a" : /^PRIOR FILM/.test(st) ? "#8fc8ff" : "#f0b04a";
const FactTag: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const st = SCENES[i].status;
  const a = interpolate(f, [5, 12, 138, 147], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const [fact, creative] = st.split(" + ");
  const c = statusColor(st);
  return (
    <div style={{ position: "absolute", left: 48, top: 140, opacity: a, transform: `translateX(${(1 - a) * -30}px)`, fontFamily: "Oswald" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(5,6,8,0.72)", border: `2px solid ${c}`, borderRadius: 8, padding: "5px 14px" }}>
        <span style={{ color: c, fontWeight: 700, fontSize: 26, letterSpacing: 2 }}>{fact}</span>
        {creative && <span style={{ color: "#f0b04a", fontSize: 24, letterSpacing: 1.5 }}>+ {creative}</span>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ subtitles (captions.srt text, word-highlighted, ≤ 2 lines) */
const Subtitles: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const tm = timings.scenes[i];
  const t = f / 30 - (tm.start - i * 5); // seconds since narration start
  if (t < -0.15 || t > tm.duration + 0.4) return null;
  const lines: { w: string; k: number }[][] = [[]];
  let len = 0;
  tm.words.forEach((w, k) => {
    if (len + w.w.length > 22 && lines[lines.length - 1].length) { lines.push([]); len = 0; }
    lines[lines.length - 1].push({ w: w.w, k }); len += w.w.length + 1;
  });
  const active = tm.words.findIndex((w) => t >= w.t0 && t < w.t1 + 0.1);
  const spoken = tm.words.filter((w) => t >= w.t0).length - 1;
  const cur = Math.max(0, active >= 0 ? active : spoken);
  const li = lines.findIndex((l) => l.some((x) => x.k === cur));
  const start = Math.floor(Math.max(0, li) / 2) * 2;
  const shown = lines.slice(start, start + 2);
  const pop = interpolate(t, [-0.15, 0.05], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(t, [tm.duration + 0.15, tm.duration + 0.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 60, right: 140, top: 1290, textAlign: "center", opacity: out, transform: `scale(${pop})` }}>
      {shown.map((l, j) => (
        <div key={j} style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 74, lineHeight: 1.12, textTransform: "uppercase", letterSpacing: 1 }}>
          {l.map(({ w, k }) => {
            const on = k === cur && t <= tm.words[k].t1 + 0.1;
            const said = k <= cur;
            return (
              <span key={k} style={{
                color: on ? "#ffd15a" : said ? "#ffffff" : "rgba(255,255,255,0.6)",
                WebkitTextStroke: "10px #000", paintOrder: "stroke fill",
                textShadow: "0 6px 0 #000",
                display: "inline-block", margin: "0 9px", transform: on ? "translateY(-3px) scale(1.05)" : undefined,
              }}>{w}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ scene 12 final slate (editable text) */
const TitleCard: React.FC = () => {
  const f = useCurrentFrame();
  const R = 120; // 4.0 s: sharp title reveal then hold
  const a = interpolate(f, [R, R + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = interpolate(f, [R, R + 6], [1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fl = 0.85 + 0.15 * pulse(f, 7);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", transform: `scale(${s})` }}>
        <div style={{ fontFamily: "Shippori", fontSize: 70, color: "#9fdcff", letterSpacing: 28, textShadow: "0 0 26px #2a8ad0", opacity: 0.85 }}>ゴジラ</div>
        <div style={{ fontFamily: "Cinzel", fontWeight: 900, fontSize: 166, color: "#eef6fa", letterSpacing: 6, lineHeight: 1, textShadow: `0 0 ${36 * fl}px rgba(95,200,255,0.8), 0 8px 0 #000` }}>GODZILLA</div>
        <div style={{ fontFamily: "Cinzel", fontWeight: 700, fontSize: 92, color: "#bfe8ff", letterSpacing: 26, marginTop: 10, textShadow: "0 0 28px rgba(95,200,255,0.9)" }}>MINUS ZERO</div>
        <div style={{ margin: "26px auto 0", width: 520, height: 4, background: "linear-gradient(90deg, transparent, #8fdcff, transparent)" }} />
        <div style={{ fontFamily: "Oswald", fontSize: 34, letterSpacing: 8, color: "#9fb8c8", marginTop: 18 }}>(2026)</div>
      </div>
      <div style={{ position: "absolute", top: 1560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <BrandMark scale={1.5} glow={0.6} />
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ main */
export const Main: React.FC = () => {
  useFonts();
  const fr = useCurrentFrame();
  // small upper-left wordmark everywhere except the final slate (which carries its own)
  const showSmall = fr < 11 * SCENE_FRAMES + 120;
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
      {/* 90s anime-horror finishing: grade, aged cel grain, vignette, damage */}
      {!DBG.noPost && <>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,8,18,0.16), rgba(12,4,2,0.12))" }} />
      <Vignette />
      <Grain f={fr} />
      <FilmDamage f={fr} />
      </>}
      {SCENES.map((s, i) => (
        <Sequence key={`t${s.id}`} from={i * SCENE_FRAMES} durationInFrames={SCENE_FRAMES} layout="none" name={`text ${s.id}`}>
          <FactTag i={i} />
          {i === 11 && <TitleCard />}
          <Subtitles i={i} />
        </Sequence>
      ))}
      {showSmall && <div style={{ position: "absolute", left: 48, top: 70, opacity: 0.92 }}><BrandMark scale={0.85} /></div>}
      <Audio src={staticFile("audio/narration.wav")} volume={1} />
      <Audio src={staticFile("audio/score.wav")} volume={0.42} />
      <Audio src={staticFile("audio/sfx.wav")} volume={0.6} />
    </AbsoluteFill>
  );
};
