// Render the Short (or a frame range) with the Node API.
// usage: node scripts/render.mjs [out.mp4] [startFrame endFrame]
//   env PROPS='{"noBoil":true}'  -> debug switches (see DBG in src/fx.tsx)
//   env CONCURRENCY=4
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";

const [out = "out/visionquest-fan-ending-short.mp4", a, b] = process.argv.slice(2);
const frameRange = a !== undefined ? [Number(a), Number(b)] : null;
const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browserExecutable = fs.existsSync(shell) ? shell : undefined;
const inputProps = JSON.parse(process.env.PROPS || "{}");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "VisionQuestFanEnding", browserExecutable, inputProps, timeoutInMilliseconds: 120000 });
const t0 = Date.now();
let last = -1;
await renderMedia({
  composition, serveUrl, inputProps, frameRange,
  codec: "h264", crf: 18, pixelFormat: "yuv420p", outputLocation: out,
  imageFormat: "jpeg", jpegQuality: 92,
  concurrency: Number(process.env.CONCURRENCY || 4),
  browserExecutable, timeoutInMilliseconds: 120000,
  chromiumOptions: { gl: "swangle" }, audioCodec: "aac", audioBitrate: "256k",
  onProgress: ({ renderedFrames }) => {
    const p = Math.floor(renderedFrames / 30);
    if (p !== last) { last = p; console.log(`${renderedFrames} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
  },
});
console.log("wrote", out, `${((Date.now() - t0) / 1000).toFixed(0)} s`);
