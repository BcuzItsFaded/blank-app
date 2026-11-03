// Render the full Short with the Node API (same settings as remotion.config.ts).
// usage: node scripts/render.mjs [out.mp4]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";

const out = process.argv[2] ?? "out/godzilla-minus-zero-short.mp4";
const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browserExecutable = fs.existsSync(shell) ? shell : undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "GodzillaMinusZero", browserExecutable, timeoutInMilliseconds: 120000 });
let last = -1;
await renderMedia({
  composition, serveUrl, codec: "h264", crf: 18, pixelFormat: "yuv420p", outputLocation: out,
  imageFormat: "jpeg", jpegQuality: 92, concurrency: 4, browserExecutable, timeoutInMilliseconds: 120000,
  chromiumOptions: { gl: "swangle" }, audioCodec: "aac", audioBitrate: "256k",
  onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; console.log(`${p * 5}%`); } },
});
console.log("wrote", out);
