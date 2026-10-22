/*
 * Offline renderer: plays the player frame by frame in headless Chromium and muxes an MP4.
 * Every frame is exact (no dropped frames), and the soundtrack is rendered sample-accurately.
 *
 *   npx http-server the-wish -p 8765 &
 *   node the-wish/tools/render-video.mjs http://localhost:8765/index.html out.mp4 [fps]
 *
 * Needs: playwright (Chromium) and ffmpeg on PATH.
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";

const [url = "http://localhost:8765/index.html", out = "the-wish-short.mp4", fpsArg = "30"] = process.argv.slice(2);
const fps = +fpsArg;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", e => console.error("page error:", e.message));
await page.goto(url);
await page.waitForFunction(() => window.WishPlayer && /loaded|placeholder/.test(document.getElementById("boardStatus").textContent), null, { timeout: 30000 });
await page.waitForTimeout(1000);
console.log(await page.textContent("#boardStatus"));
const duration = await page.evaluate(() => WishPlayer.project.duration);

// ---- soundtrack → 16-bit stereo WAV
const wavPath = out.replace(/\.mp4$/, "") + ".wav";
const b64 = await page.evaluate(async seconds => {
  const P = WishPlayer;
  const buf = await P.audio.renderOffline(P.project, P.project.settings, seconds);
  const n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)];
  const ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < 2; c++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
  const bytes = new Uint8Array(ab); let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}, duration);
fs.writeFileSync(wavPath, Buffer.from(b64, "base64"));
console.log("audio rendered:", wavPath);

// ---- frames → ffmpeg
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-i", wavPath, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(fps),
  "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
const total = Math.round(duration * fps);
for (let i = 0; i < total; i += 10) {
  const frames = await page.evaluate(([from, to, fps]) => {
    const r = WishPlayer.renderer, c = document.getElementById("stage"), res = [];
    for (let f = from; f < to; f++) { r.frame(Math.min(f / fps, WishPlayer.project.duration - 0.001)); res.push(c.toDataURL("image/jpeg", 0.93).split(",")[1]); }
    return res;
  }, [i, Math.min(total, i + 10), fps]);
  for (const f of frames) if (!ff.stdin.write(Buffer.from(f, "base64"))) await new Promise(r => ff.stdin.once("drain", r));
  if (i % 300 === 0) console.log(`frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise(r => ff.on("close", r));
await browser.close();
console.log("done:", out);
