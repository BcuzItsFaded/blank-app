import timings from "./timings.json";
import { FPS } from "./lib";

/** scene-local frame where word k of the scene's narration (all lines joined) is spoken */
export const wordFrame = (id: number, k: number) => {
  const sc = timings.scenes.find((x) => x.id === id)!;
  const words = sc.lines.flatMap((l) => l.words.map((w) => l.start + w.t0));
  return Math.round((words[Math.min(k, words.length - 1)] - sc.start) * FPS);
};
/** scene-local frame where line n starts */
export const lineFrame = (id: number, n: number) => {
  const sc = timings.scenes.find((x) => x.id === id)!;
  return Math.round((sc.lines[Math.min(n, sc.lines.length - 1)].start - sc.start) * FPS);
};
