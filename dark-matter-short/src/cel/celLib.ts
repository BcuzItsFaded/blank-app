// Shared helpers for the code-drawn (cel) engine ported from the Godzilla Short.
import { Easing, interpolate } from "remotion";
export { W, H, FPS, rand, clamp, pulse, wobble } from "../lib";
export const SCENE_FRAMES = 150;
export type SceneData = { id: number; camera: { keys: number[][] } };
export const ease = Easing.bezier(0.45, 0, 0.25, 1);
export const lerp = (f: number, a: number, b: number, from = 0, to = 150, e = ease) =>
  interpolate(f, [from, to], [a, b], { easing: e, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
export const onTwos = (f: number) => Math.floor(f / 2) * 2;
