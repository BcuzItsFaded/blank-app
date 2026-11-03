// Resumable "on twos" render: 15 unique drawings per second (each held 2 frames),
// the classic limited-animation cadence of 1990s TV anime, assembled to 30 fps.
//
//   node scripts/render_twos.mjs            # render missing frames, then assemble
//   node scripts/render_twos.mjs --ones     # render every frame (full 30 unique fps; ~2x slower)
//
// Frames go to out/frames/f0000.jpeg …; re-running skips chunks already rendered,
// so a long render can be resumed after an interruption.
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const ONES = process.argv.includes("--ones");
const STEP = ONES ? 1 : 2;
const CHUNK = 60;
const OUT = "out/godzilla-minus-zero-short.mp4";
const DIR = path.resolve("out/frames");
fs.mkdirSync(DIR, { recursive: true });

const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browserExecutable = fs.existsSync(shell) ? shell : undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "GodzillaMinusZero", browserExecutable, timeoutInMilliseconds: 120000 });
const total = composition.durationInFrames;
const name = (fr) => path.join(DIR, `f${String(fr).padStart(4, "0")}.jpeg`);
const t0 = Date.now();

for (let start = 0; start < total; start += CHUNK) {
  const end = Math.min(total - 1, start + CHUNK - 1);
  const want = [];
  for (let fr = start; fr <= end; fr += STEP) want.push(fr);
  if (want.every((fr) => fs.existsSync(name(fr)))) continue;
  const tmp = path.join(DIR, `tmp-${start}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp);
  await renderFrames({
    composition, serveUrl, outputDir: tmp, frameRange: [start, end], everyNthFrame: STEP,
    imageFormat: "jpeg", jpegQuality: 92, concurrency: Number(process.env.CONCURRENCY || 4),
    browserExecutable, timeoutInMilliseconds: 120000, chromiumOptions: { gl: "swangle" },
    onStart: () => {}, onFrameUpdate: () => {},
  });
  const files = fs.readdirSync(tmp).filter((f) => f.endsWith(".jpeg")).sort();
  if (files.length !== want.length) throw new Error(`chunk ${start}: expected ${want.length} frames, got ${files.length}`);
  files.forEach((f, i) => fs.renameSync(path.join(tmp, f), name(want[i])));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`frames ${start}-${end} done · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

// ---- assemble: hold each drawing for STEP frames, mix the three stems, encode H.264/AAC
const list = path.join(DIR, "list.txt");
let txt = "";
for (let fr = 0; fr < total; fr += STEP) txt += `file '${name(fr)}'\nduration ${(STEP / 30).toFixed(6)}\n`;
txt += `file '${name(total - STEP)}'\n`;
fs.writeFileSync(list, txt);
const A = (f) => path.resolve("public/audio", f);
execFileSync("ffmpeg", [
  "-y", "-v", "error",
  "-f", "concat", "-safe", "0", "-i", list,
  "-i", A("narration.wav"), "-i", A("score.wav"), "-i", A("sfx.wav"),
  "-filter_complex",
  // same stem levels as the Remotion <Audio> tracks, then a true-peak limiter at -1.5 dBTP
  "[1:a]volume=1.0[n];[2:a]volume=0.42[m];[3:a]volume=0.6[s];[n][m][s]amix=inputs=3:normalize=0,alimiter=limit=0.84:level=false[a]",
  "-map", "0:v", "-map", "[a]",
  "-vf", "fps=30,format=yuv420p", "-r", "30", "-frames:v", String(total),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-t", "60",
  OUT,
], { stdio: "inherit" });
console.log("wrote", OUT, `· ${((Date.now() - t0) / 60000).toFixed(1)} min total`);
