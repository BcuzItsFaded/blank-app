// Render review stills (or keyframes) for chosen frames with one bundle.
// usage: node scripts/stills.mjs [outDir] [scale] [frame ...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";

const [outDir = "out/stills", scale = "0.5", ...frames] = process.argv.slice(2);
const list = frames.length ? frames.map(Number) : Array.from({ length: 12 }, (_, i) => i * 150 + 95);
const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browserExecutable = fs.existsSync(shell) ? shell : undefined;
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "VisionQuestFanEnding", browserExecutable });
for (const frame of list) {
  const output = path.join(outDir, `frame-${String(frame).padStart(4, "0")}.png`);
  await renderStill({ composition, serveUrl, frame, output, scale: Number(scale), browserExecutable, chromiumOptions: { gl: "swangle" } });
  console.log(output);
}
