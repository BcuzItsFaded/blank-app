import React from "react";
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import data from "./data.json";

const GOLD = "#ebb946", RED = "#e01e26", CREAM = "#f5e8cd";
const fontFace = `@font-face{font-family:Bangers;src:url(${staticFile("Bangers.ttf")});}`;
const stroke = (w) => ({ WebkitTextStroke: `${w}px #000`, paintOrder: "stroke fill" });

// Kinetic captions: up to 3 words per chunk, each word springs in, spoken word turns yellow.
const chunkWords = (words) => {
  const out = []; let cur = [];
  words.forEach((w, k) => {
    cur.push(w);
    if (cur.length === 3 || /[.,!?:;]$/.test(w.w) || k === words.length - 1) { out.push(cur); cur = []; }
  });
  return out;
};

const Captions = ({ words, fps }) => {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const chunks = chunkWords(words);
  const idx = chunks.findIndex((c, k) => t >= c[0].t && (k === chunks.length - 1 || t < chunks[k + 1][0].t));
  if (idx < 0) return null;
  const c = chunks[idx];
  const last = c[c.length - 1];
  if (idx === chunks.length - 1 && t > last.t + 1.2) return null;
  return (
    <div style={{ position: "absolute", top: 1560, width: "100%", display: "flex", justifyContent: "center",
                  flexWrap: "wrap", gap: 26, padding: "0 50px" }}>
      {c.map((w, k) => {
        const s = spring({ frame: frame - Math.round(w.t * fps), fps, config: { damping: 12, stiffness: 220 } });
        const on = t >= w.t;
        return (
          <span key={k} style={{ fontFamily: "Bangers", fontSize: 108, color: on ? "#ffdd00" : "#fff",
                                  transform: `scale(${on ? 0.6 + 0.4 * s : 0.85})`, opacity: on ? 1 : 0.55,
                                  display: "inline-block", ...stroke(12) }}>{w.w}</span>
        );
      })}
    </div>
  );
};

const Scene = ({ seg, index, fps }) => {
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const out = interpolate(frame, [seg.dur - 10, seg.dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dir = index % 2 ? -1 : 1;
  const push = interpolate(frame, [0, seg.dur], [1, 1.07]);
  const labelIn = spring({ frame: frame - 6, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill>
      <Img src={staticFile(seg.panel)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover",
            filter: "blur(38px) brightness(0.35) saturate(1.2)", transform: "scale(1.2)" }} />
      <div style={{ position: "absolute", left: 60, top: 470, width: 960, height: 960,
                    transform: `translateX(${(1 - enter) * 900 * dir + out * -1100 * dir}px) rotate(${(1 - enter) * 8 * dir}deg) scale(${0.85 + 0.15 * enter})`,
                    border: `12px solid ${GOLD}`, boxShadow: "0 40px 90px rgba(0,0,0,.75)", overflow: "hidden", background: "#000" }}>
        <Img src={staticFile(seg.panel)} style={{ width: "100%", height: "100%", objectFit: "cover",
              transform: `scale(${push})`, transformOrigin: "50% 40%" }} />
      </div>
      <div style={{ position: "absolute", top: 1440, width: "100%", textAlign: "center" }}>
        <span style={{ fontFamily: "Bangers", fontSize: 70, color: "#111", background: GOLD, padding: "6px 30px",
                        display: "inline-block", transform: `translateY(${(1 - labelIn) * 60}px) rotate(-2deg)`,
                        opacity: labelIn, boxShadow: "6px 6px 0 #000" }}>{seg.label}</span>
      </div>
      <Captions words={seg.words.map((w) => ({ ...w, t: w.t + (seg.audioFrom - seg.start) / fps }))} fps={fps} />
    </AbsoluteFill>
  );
};

export const StoryboardShort = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const showHeader = frame >= data.bumper;
  const headerIn = spring({ frame: frame - data.bumper, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill style={{ background: "#120607" }}>
      <style>{fontFace}</style>
      {data.segs.map((s, i) => (
        <Sequence key={i} from={s.start} durationInFrames={s.dur}>
          <Scene seg={s} index={i} fps={fps} />
        </Sequence>
      ))}
      {data.segs.map((s, i) => (
        <Sequence key={"a" + i} from={s.audioFrom}><Audio src={staticFile(`audio/s${String(i).padStart(2, "0")}.mp3`)} /></Sequence>
      ))}
      <Sequence from={data.bumper}>
        <Audio src={staticFile("audio/music.wav")} volume={0.09} />
      </Sequence>
      {showHeader && (
        <div style={{ position: "absolute", top: 70, width: "100%", textAlign: "center",
                      transform: `translateY(${(1 - headerIn) * -250}px)` }}>
          <div style={{ fontFamily: "Bangers", fontSize: 130, color: CREAM, ...stroke(10) }}>{data.title}</div>
          <div style={{ fontFamily: "Bangers", fontSize: 64, color: RED, ...stroke(7), marginTop: -6 }}>{data.subtitle}</div>
        </div>
      )}
      <div style={{ position: "absolute", top: 0, left: 0, height: 12, background: GOLD,
                    width: `${(frame / data.total) * 100}%` }} />
    </AbsoluteFill>
  );
};
