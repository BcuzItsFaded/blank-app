#!/usr/bin/env node
/*
 * Render an episode folder (a copy of player/ with assets/storyboard.* and assets/project.js) to MP4,
 * or to preview stills. Frame-exact: each frame is drawn at t = i / fps, and the soundtrack is
 * rendered offline, so a slow machine never drops frames.
 *
 *   node render_video.mjs <episodeDir> <out.mp4> [--fps 30] [--crf 23]
 *   node render_video.mjs <episodeDir> <outPrefix> --stills 1.5,20,44.6
 *   node render_video.mjs <episodeDir> <test.mp4> --duration 8        (quick partial render)
 *
 * Needs Playwright (Chromium) and ffmpeg. Serves the folder itself on a free local port.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { pathToFileURL } from "url";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const fps = +opt("--fps", 30), crf = opt("--crf", "23"), stills = opt("--stills", null), limit = opt("--duration", null);
const [dir, out] = args;
if (!dir || !out) { console.error("usage: render_video.mjs <episodeDir> <out.mp4|prefix> [--fps 30] [--crf 23] [--stills t1,t2]"); process.exit(1); }

async function loadPlaywright() {
  try { return await import("playwright"); } catch (e) { /* fall through to the global install */ }
  const root = execSync("npm root -g").toString().trim();
  return import(pathToFileURL(path.join(root, "playwright", "index.mjs")).href);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg" };
const root = path.resolve(dir);
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", e => console.error("page error:", e.message));
await page.goto(url);
await page.waitForFunction(() => window.WishPlayer && /loaded|placeholder/.test(document.getElementById("boardStatus").textContent), null, { timeout: 30000 });
await page.waitForTimeout(1200); // fonts
console.log(await page.textContent("#boardStatus"));
const duration = limit ? +limit : await page.evaluate(() => WishPlayer.project.duration);

const grab = (times) => page.evaluate(ts => {
  const r = WishPlayer.renderer, c = document.getElementById("stage"), D = WishPlayer.project.duration;
  return ts.map(t => { r.frame(Math.min(t, D - 0.001)); return c.toDataURL("image/jpeg", 0.93).split(",")[1]; });
}, times);

if (stills) {
  const ts = stills.split(",").map(Number);
  const imgs = await grab(ts);
  imgs.forEach((b, i) => { const f = `${out}-${ts[i]}.jpg`; fs.writeFileSync(f, Buffer.from(b, "base64")); console.log(f); });
} else {
  // soundtrack → 16-bit stereo WAV
  const wav = out.replace(/\.mp4$/i, "") + ".wav";
  const b64 = await page.evaluate(async seconds => {
    const P = WishPlayer, buf = await P.audio.renderOffline(P.project, P.project.settings, seconds);
    const n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)], ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
    const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 2, true); v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * 4, true); v.setUint16(32, 4, true);
    v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 4, true);
    for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < 2; c++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
    const bytes = new Uint8Array(ab); let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, duration);
  fs.writeFileSync(wav, Buffer.from(b64, "base64"));
  console.log("soundtrack:", wav);

  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-i", wav,
    "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-pix_fmt", "yuv420p", "-r", String(fps),
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(duration * fps);
  for (let i = 0; i < total; i += 10) {
    const ts = []; for (let f = i; f < Math.min(total, i + 10); f++) ts.push(f / fps);
    for (const b of await grab(ts)) if (!ff.stdin.write(Buffer.from(b, "base64"))) await new Promise(r => ff.stdin.once("drain", r));
    if (i % (fps * 10) === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  console.log("done:", out);
}
await browser.close();
server.close();
