import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, continueRender, delayRender } from "remotion";
import { SCENES, META, PAD, FPS, clamp, startF, durF, pulse } from "./lib";
import { Grain, Vignette } from "./fx";
import { CEL_SCENES } from "./cel/celScenes";
import timings from "./timings.json";

/* ------------------------------------------------------------------ fonts */
let fontsPromise: Promise<unknown> | null = null;
const useFonts = () => {
  const [handle] = React.useState(() => delayRender("fonts", { timeoutInMilliseconds: 60000 }));
  React.useEffect(() => {
    if (!fontsPromise) {
      const faces = [
        new FontFace("Oswald", `url(${staticFile("fonts/Oswald.ttf")})`, { weight: "200 700" }),
        new FontFace("Cinzel", `url(${staticFile("fonts/Cinzel.ttf")})`, { weight: "400 900" }),
      ];
      fontsPromise = Promise.all(faces.map((ff) => ff.load().then((x) => document.fonts.add(x))));
    }
    fontsPromise.then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
};

/* ------------------------------------------------------------------ scenes + transitions */
const DIS = 6;
const SceneShell: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame() - PAD;
  const s = SCENES[i];
  const prev = i > 0 ? SCENES[i - 1].transitionOut : undefined;
  let opacity = 1;
  if (prev === "dissolve") opacity = clamp((f + DIS) / (2 * DIS));
  else if (i > 0 && f < 0) opacity = 0;
  if (f > durF(s) + DIS && s.transitionOut !== "none") return null;
  const C = CEL_SCENES[i];
  return <AbsoluteFill style={{ opacity }}><C f={f} /></AbsoluteFill>;
};
const BoundaryFlash: React.FC = () => {
  const fr = useCurrentFrame();
  let v = 0;
  SCENES.forEach((s) => {
    if (s.transitionOut !== "flash") return;
    const b = startF(s) + durF(s);
    v = Math.max(v, interpolate(fr, [b - 3, b, b + 9], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  });
  return v > 0 ? <AbsoluteFill style={{ background: "#ffffff", opacity: v * 0.85 }} /> : null;
};

/* ------------------------------------------------------------------ brand: DON'T SPOIL IT RG (editable) */
export const BrandMark: React.FC<{ scale?: number; glow?: number }> = ({ scale = 1, glow = 0 }) => {
  const [main, tag] = [META.brand.replace(/\s*RG$/, ""), META.brand.match(/RG$/) ? "RG" : ""];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 * scale, fontFamily: "Oswald", lineHeight: 1, filter: `drop-shadow(0 2px 6px #000)${glow ? ` drop-shadow(0 0 ${14 * glow}px rgba(232,68,58,0.8))` : ""}` }}>
      <svg width={40 * scale} height={40 * scale} viewBox="0 0 40 40">
        <path d="M 3,20 Q 20,4 37,20 Q 20,36 3,20 Z" fill="#0b0b0e" stroke="#f2ede4" strokeWidth={2.5} />
        <circle cx={20} cy={20} r={6} fill="#e8443a" />
        <line x1={6} y1={34} x2={34} y2={6} stroke="#e8443a" strokeWidth={4} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 30 * scale, fontWeight: 700, letterSpacing: 1.5 * scale, color: "#f2ede4" }}>{main}</span>
      {tag && <span style={{ fontSize: 24 * scale, fontWeight: 700, color: "#0b0b0e", background: "#e8443a", padding: `${3 * scale}px ${7 * scale}px`, borderRadius: 4 * scale }}>{tag}</span>}
    </div>
  );
};

/* ------------------------------------------------------------------ canon / fan-made labels */
const tagColor = (t: string) => (t.startsWith("CANON") ? "#6fd39a" : "#f0b04a");
const FactTag: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const s = SCENES[i];
  const d = durF(s);
  const a = interpolate(f, [4, 10, d - 8, d - 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const c = tagColor(s.tag);
  return (
    <div style={{ position: "absolute", left: 44, right: 150, top: 200, opacity: a, transform: `translateX(${(1 - a) * -30}px)`, fontFamily: "Oswald" }}>
      <div style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "baseline", gap: 10, background: "rgba(6,8,12,0.74)", border: `2px solid ${c}`, borderRadius: 10, padding: "6px 14px" }}>
        <span style={{ color: c, fontWeight: 700, fontSize: 28, letterSpacing: 2 }}>{s.tag}</span>
        <span style={{ color: "#e6eaf2", fontSize: 24, letterSpacing: 0.4 }}>{s.note}</span>
      </div>
    </div>
  );
};
/* permanent disclaimer chip */
const FanMadeChip: React.FC = () => (
  <div style={{ position: "absolute", right: 150, top: 80, fontFamily: "Oswald", fontWeight: 700, fontSize: 22, letterSpacing: 2, color: "#0b0b0e", background: "#f0b04a", padding: "5px 12px", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
    {META.notice}
  </div>
);

/* ------------------------------------------------------------------ captions */
const Captions: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const sc = timings.scenes[i];
  const t = sc.start + f / FPS;
  const line = [...sc.lines].reverse().find((l) => t >= l.start - 0.12);
  if (!line || t > line.start + line.duration + 0.35) return null;
  const lt = t - line.start;
  const col = (META.speakers as Record<string, { color: string }>)[line.speaker].color;
  const quoted = line.speaker !== "narrator";
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
      {quoted && <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 30, letterSpacing: 4, color: col, textShadow: "0 3px 0 #000", marginBottom: 6 }}>{line.speaker === "doom" ? "DOCTOR DOOM" : "WANDA"}</div>}
      {rows.slice(st, st + 2).map((r, j) => (
        <div key={j} style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 72, lineHeight: 1.14, textTransform: "uppercase", letterSpacing: 1 }}>
          {r.map(({ w, k }) => {
            const on = k === cur && lt <= line.words[k].t1 + 0.1;
            return (
              <span key={k} style={{
                color: on ? col : k <= cur ? "#ffffff" : "rgba(255,255,255,0.62)",
                WebkitTextStroke: "10px #06080c", paintOrder: "stroke fill", textShadow: "0 6px 0 #06080c",
                display: "inline-block", margin: "0 9px", transform: on ? "translateY(-3px) scale(1.05)" : undefined,
              }}>{w}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ final slate (scene 12, from 2.4 s) */
const Slate: React.FC = () => {
  const f = useCurrentFrame();
  const a = interpolate(f, [72, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = interpolate(f, [72, 80], [1.1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fl = 0.85 + 0.15 * pulse(f, 8);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", transform: `scale(${s})` }}>
        <div style={{ fontFamily: "Cinzel", fontWeight: 900, fontSize: 118, color: "#eef2fa", letterSpacing: 4, textShadow: `0 0 ${30 * fl}px rgba(255,60,70,0.7), 0 6px 0 #000` }}>VISIONQUEST</div>
        <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 46, letterSpacing: 6, color: "#f0b04a", marginTop: 12 }}>OUR FAN-MADE POST-CREDITS SCENE</div>
        <div style={{ margin: "26px auto 0", width: 520, height: 3, background: "linear-gradient(90deg, transparent, #6aff9a, transparent)" }} />
        <div style={{ fontFamily: "Oswald", fontSize: 32, letterSpacing: 2, color: "#cfe0d8", marginTop: 20 }}>Doctor Doom arrives in <b>Avengers: Doomsday</b> · Dec 18, 2026</div>
      </div>
      <div style={{ position: "absolute", top: 1620, left: 0, right: 0, display: "flex", justifyContent: "center" }}><BrandMark scale={1.5} glow={0.6} /></div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ main */
export const Main: React.FC = () => {
  useFonts();
  const fr = useCurrentFrame();
  const last = SCENES[SCENES.length - 1];
  const showSmall = fr < startF(last) + 72;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map((s, i) => (
        <Sequence key={s.id} from={startF(s) - PAD} durationInFrames={durF(s) + PAD * 2} name={`${s.id} ${s.name}`}>
          <SceneShell i={i} />
        </Sequence>
      ))}
      <BoundaryFlash />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,10,20,0.16), rgba(10,4,6,0.1))" }} />
      <Vignette />
      <Grain f={fr} opacity={0.3} />
      {SCENES.map((s, i) => (
        <Sequence key={`t${s.id}`} from={startF(s)} durationInFrames={durF(s)} layout="none" name={`text ${s.id}`}>
          <FactTag i={i} />
          {i === SCENES.length - 1 && <Slate />}
          <Captions i={i} />
        </Sequence>
      ))}
      {showSmall && <div style={{ position: "absolute", left: 44, top: 74, opacity: 0.92 }}><BrandMark scale={0.8} /></div>}
      <FanMadeChip />
      <Audio src={staticFile("audio/mix.wav")} volume={1} />
    </AbsoluteFill>
  );
};
