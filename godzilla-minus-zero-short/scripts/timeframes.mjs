// Profile render time per frame: node scripts/timeframes.mjs 75 225 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "fs";
import os from "os";
import path from "path";

const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browserExecutable = fs.existsSync(shell) ? shell : undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = JSON.parse(process.env.PROPS || "{}");
const composition = await selectComposition({ serveUrl, id: "GodzillaMinusZero", browserExecutable, inputProps });
const output = path.join(os.tmpdir(), "gmz-timing.png");
for (const frame of process.argv.slice(2).map(Number)) {
  const t = Date.now();
  await renderStill({ composition, serveUrl, frame, output, inputProps, browserExecutable, chromiumOptions: { gl: "swangle" } });
  console.log(`frame ${frame}: ${Date.now() - t} ms`);
}
