import { interpolate, Easing } from "remotion";
import data from "./scenes.json";

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const SCENE_FRAMES = 150;
/** frames each scene is extended on both sides so transitions can overlap */
export const PAD = 9;

export type SceneData = (typeof data.scenes)[number];
export const SCENES = data.scenes;

/** deterministic PRNG so every render is identical */
export const rand = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** 0..1 progress through the scene's own five seconds */
export const prog = (f: number) => clamp(f / SCENE_FRAMES);

export const ease = Easing.bezier(0.45, 0, 0.25, 1);

export const lerp = (f: number, a: number, b: number, from = 0, to = SCENE_FRAMES, e = ease) =>
  interpolate(f, [from, to], [a, b], { easing: e, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** hand-drawn "on twos": step the clock to 15 fps for character animation */
export const onTwos = (f: number) => Math.floor(f / 2) * 2;

/** pulse 0..1 */
export const pulse = (f: number, period: number, phase = 0) =>
  0.5 + 0.5 * Math.sin(((f + phase) / period) * Math.PI * 2);

/** smooth pseudo-noise in -1..1 (for handheld / shake) */
export const wobble = (f: number, seed: number, speed = 0.05) => {
  const x = f * speed + seed * 13.7;
  return (
    Math.sin(x * 1.0) * 0.5 + Math.sin(x * 2.31 + 1.3) * 0.3 + Math.sin(x * 4.17 + 2.1) * 0.2
  );
};

export const fmtScene = (n: number) => String(n).padStart(2, "0");
