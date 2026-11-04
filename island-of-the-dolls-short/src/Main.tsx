import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate, continueRender, delayRender } from "remotion";
import { SCENES, META, PAD, FPS, clamp, startF, durF } from "./lib";
import { Grain, Vignette } from "./fx";
import { PlateScene } from "./scenes";
import { CEL_SCENES } from "./cel/celScenes";
import timings from "./timings.json";

/* ------------------------------------------------------------------ fonts */
let fontsPromise: Promise<unknown> | null = null;
const useFonts = () => {
  const [handle] = React.useState(() => delayRender("fonts", { timeoutInMilliseconds: 60000 }));
  React.useEffect(() => {
    if (!fontsPromise) {
      const ff = new FontFace("Oswald", `url(${staticFile("fonts/Oswald.ttf")})`, { weight: "200 700" });
      fontsPromise = ff.load().then((x) => document.fonts.add(x));
    }
    fontsPromise.then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
};

/* ------------------------------------------------------------------ scene shell + transitions */
const DIS = 7; // half-length of a cross dissolve, frames
const SceneShell: React.FC<{ i: number; cel?: boolean }> = ({ i, cel }) => {
  const f = useCurrentFrame() - PAD; // scene-local frame (0 = start)
  const s = SCENES[i];
  const prev = i > 0 ? SCENES[i - 1].transitionOut : undefined;
  let opacity = 1, extraZoom = 1, shake = 0;
  if (prev === "dissolve") opacity = clamp((f + DIS) / (2 * DIS));
  if (prev === "twist") {
    if (f < 0) opacity = 0;
    extraZoom = 1 + 0.14 * Math.max(0, 1 - f / 10); // punch-in
    shake = 22 * Math.max(0, 1 - f / 18);
  }
  if (f > durF(s) + DIS && s.transitionOut !== "none") return null;
  return (
    <AbsoluteFill style={{ opacity }}>
      {cel ? (() => { const C = CEL_SCENES[i]; return <AbsoluteFill style={{ transform: `scale(${extraZoom}) translate(${Math.sin(f * 1.9) * shake}px, ${Math.cos(f * 2.3) * shake}px)` }}><C f={f} /></AbsoluteFill>; })()
        : <PlateScene s={s} f={f} extraZoom={extraZoom} shake={shake} />}
    </AbsoluteFill>
  );
};

/* twist hit (scene 7 → 8): white flash + RGB-split flicker */
const TwistFlash: React.FC = () => {
  const fr = useCurrentFrame();
  const s = SCENES.find((x, i) => i > 0 && SCENES[i - 1].transitionOut === "twist");
  if (!s) return null;
  const b = startF(s);
  const v = interpolate(fr, [b - 3, b, b + 12], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (v <= 0) return null;
  return (
    <>
      <AbsoluteFill style={{ background: "#fff", opacity: v * 0.9 }} />
      <AbsoluteFill style={{ boxShadow: `inset ${18 * v}px 0 0 rgba(255,0,120,${0.5 * v}), inset ${-18 * v}px 0 0 rgba(0,220,255,${0.5 * v})` }} />
    </>
  );
};

/* ------------------------------------------------------------------ brand: Plot Twist with A&R */
const BrandMark: React.FC<{ size?: number }> = ({ size = 170 }) => (
  <Img src={staticFile("brand/logo.png")} style={{ width: size, height: size * (400 / 428), filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.7))" }} />
);

/* ------------------------------------------------------------------ story-status tag */
const TAG_COLOR: Record<string, string> = {
  "REAL PLACE": "#7ee0a6", DOCUMENTED: "#7ee0a6", "LOCAL LEGEND": "#ffc35a", "CLAIMS ONLY": "#ffc35a", "THE TWIST": "#ff6ad5",
};
const FactTag: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const s = SCENES[i];
  const d = durF(s);
  const a = interpolate(f, [6, 14, d - 10, d - 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const c = TAG_COLOR[s.tag] ?? "#fff";
  return (
    <div style={{ position: "absolute", left: 44, right: 160, top: i === 0 ? 800 : 250, opacity: a, transform: `translateX(${(1 - a) * -30}px)`, fontFamily: "Oswald" }}>
      <div style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "baseline", gap: 10, background: "rgba(14,6,24,0.74)", border: `2px solid ${c}`, borderRadius: 10, padding: "6px 14px" }}>
        <span style={{ color: c, fontWeight: 700, fontSize: 28, letterSpacing: 2 }}>{s.tag}</span>
        <span style={{ color: "#eee6f6", fontSize: 25, letterSpacing: 0.4 }}>{s.note}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ captions: word-highlighted, ≤ 2 lines, speaker colour */
const Captions: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const sc = timings.scenes[i];
  const t = sc.start + f / FPS; // absolute seconds
  const line = [...sc.lines].reverse().find((l) => t >= l.start - 0.12);
  if (!line || t > line.start + line.duration + 0.35) return null;
  const lt = t - line.start;
  const col = (META.speakers as Record<string, { color: string }>)[line.speaker].color;
  const rows: { w: string; k: number }[][] = [[]];
  let len = 0;
  line.words.forEach((w, k) => {
    if (len + w.w.length > 21 && rows[rows.length - 1].length) { rows.push([]); len = 0; }
    rows[rows.length - 1].push({ w: w.w, k }); len += w.w.length + 1;
  });
  const active = line.words.findIndex((w) => lt >= w.t0 && lt < w.t1 + 0.1);
  const cur = Math.max(0, active >= 0 ? active : line.words.filter((w) => lt >= w.t0).length - 1);
  const ri = rows.findIndex((r) => r.some((x) => x.k === cur));
  const st = Math.floor(Math.max(0, ri) / 2) * 2;
  const pop = interpolate(lt, [-0.12, 0.06], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(lt, [line.duration + 0.1, line.duration + 0.35], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 56, right: 140, top: 1300, textAlign: "center", opacity: out, transform: `scale(${pop})` }}>
      {rows.slice(st, st + 2).map((r, j) => (
        <div key={j} style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 72, lineHeight: 1.14, textTransform: "uppercase", letterSpacing: 1 }}>
          {r.map(({ w, k }) => {
            const on = k === cur && lt <= line.words[k].t1 + 0.1;
            return (
              <span key={k} style={{
                color: on ? col : k <= cur ? "#ffffff" : "rgba(255,255,255,0.62)",
                WebkitTextStroke: "10px #12061e", paintOrder: "stroke fill", textShadow: "0 6px 0 #12061e",
                display: "inline-block", margin: "0 9px", transform: on ? "translateY(-3px) scale(1.05)" : undefined,
              }}>{w}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ main */
export const Main: React.FC<{ cel?: boolean }> = ({ cel = false }) => {
  useFonts();
  const fr = useCurrentFrame();
  const inScene1 = fr < startF(SCENES[1]); // scene 1 already carries the hosts' logo (painting / cel intro)
  const logoIn = interpolate(fr, [startF(SCENES[1]) - 6, startF(SCENES[1]) + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#0a0610" }}>
      {SCENES.map((s, i) => (
        <Sequence key={s.id} from={startF(s) - PAD} durationInFrames={durF(s) + PAD * 2} name={`${s.id} ${s.name}`}>
          <SceneShell i={i} cel={cel} />
        </Sequence>
      ))}
      <TwistFlash />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(30,10,50,0.14), rgba(10,0,20,0.1))" }} />
      <Vignette />
      <Grain f={fr} opacity={0.3} />
      {SCENES.map((s, i) => (
        <Sequence key={`t${s.id}`} from={startF(s)} durationInFrames={durF(s)} layout="none" name={`text ${s.id}`}>
          <FactTag i={i} />
          <Captions i={i} />
        </Sequence>
      ))}
      {!inScene1 && <div style={{ position: "absolute", left: 40, top: 56, opacity: logoIn }}><BrandMark /></div>}
      {/* mastered mix (voices + score + SFX, −14 LUFS, −1.5 dBTP) built by scripts/make_audio.py;
          stems narration/score/sfx.wav are kept alongside for re-balancing */}
      <Audio src={staticFile("audio/mix.wav")} volume={1} />
    </AbsoluteFill>
  );
};
