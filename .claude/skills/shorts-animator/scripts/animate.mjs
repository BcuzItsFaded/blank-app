#!/usr/bin/env node
/*
 * Shorts Animator: a script and a look in, an animated short out.
 *
 *   SA new <dir> [--look oil] [--format 9:16]   a project: short.json, scenes.js
 *   SA looks                                     the looks that ship, one line each
 *   SA voice <dir>                               narrates every line (cached) and prints the timing
 *   SA frames <dir>                              one painted frame per shot → frames/sheet.jpg
 *   SA still <dir> <shot> [at]                   one shot, full size → frames/shot-NN.jpg
 *   SA render <dir>                              the MP4: voice, score, every drawing → <title>.mp4
 *   SA set <dir> key=value                       change short.json from the command line (JSON values)
 *
 * SA = node ~/.claude/skills/shorts-animator/scripts/animate.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openPage } from "./lib/chrome.mjs";
import { renderSoundtrack, PRESETS } from "./lib/audio.mjs";
import { PY, ready, modelFiles, setup as setupVoice } from "./lib/voice.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(here, "..");
const RUNTIME = path.join(here, "runtime");
const LOOKS = path.join(SKILL, "looks");
const FORMATS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };
const MOODS = ["tender", "hopeful", "night", "wonder", "playful"];

const readJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const writeJSON = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2) + "\n");
const hash = (...xs) => crypto.createHash("sha1").update(xs.map((x) => JSON.stringify(x)).join("|")).digest("hex").slice(0, 10);
const slug = (s) => String(s || "short").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "short";
const die = (m) => { console.error("✗ " + m); process.exit(1); };
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(" ")}… failed:\n${(r.stderr || r.stdout || "").slice(-1500)}`);
  return r.stdout;
}
const duration = (f) => parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", f]));

/* ------------------------------------------------------------------ project */

function load(dir) {
  const f = path.join(dir, "short.json");
  if (!fs.existsSync(f)) die(`no short.json in ${dir} (start one with: SA new ${dir})`);
  const s = readJSON(f);
  if (!Array.isArray(s.lines) || !s.lines.length) die("short.json has no lines");
  return s;
}

/** The look: a name from looks/, or an object with an optional `base` name and overrides. */
function resolveLook(look) {
  const named = (n) => {
    const f = path.join(LOOKS, `${n}.json`);
    if (!fs.existsSync(f)) die(`no look "${n}" (SA looks lists them)`);
    return readJSON(f);
  };
  if (!look) return named("oil");
  if (typeof look === "string") return named(look);
  const base = look.base ? named(look.base) : {};
  return { ...base, ...look, palette: { ...(base.palette || {}), ...(look.palette || {}) } };
}

/* ------------------------------------------------------------------ voice */

function words(s) {
  return String(s).replace(/\*|\|/g, "").split(/\s+/).filter(Boolean);
}

async function narrate(dir, s, { quiet = false } = {}) {
  const v = s.voice ?? { id: "bm_george", speed: 0.92 };
  const vdir = path.join(dir, "voice");
  fs.mkdirSync(vdir, { recursive: true });
  const out = [];
  if (v === "none" || v.id === "none") {
    for (const ln of s.lines) out.push({ file: null, dur: Math.max(1.3, words(ln.say).length * 0.36) });
    return out;
  }
  if (v.file) {
    // their own recording: transcribe it, then find each line's words in order
    const src = path.resolve(dir, v.file);
    if (!fs.existsSync(src)) die(`voice.file ${v.file} not found`);
    const tj = path.join(vdir, `transcript-${hash(fs.statSync(src).mtimeMs, src)}.json`);
    if (!fs.existsSync(tj)) {
      if (!quiet) console.log("· transcribing your recording for the timing…");
      const res = run(npx, ["--yes", "hyperframes", "transcribe", src, "--json", "-d", vdir], { cwd: vdir });
      fs.writeFileSync(tj, res);
    }
    const W = extractWords(fs.readFileSync(tj, "utf8"), vdir);
    if (!W.length) die("couldn't read word timings from the transcript");
    let wi = 0;
    for (const ln of s.lines) {
      const n = words(ln.say).length;
      const a = W[Math.min(wi, W.length - 1)], b = W[Math.min(wi + n - 1, W.length - 1)];
      out.push({ file: src, from: a.start, dur: Math.max(0.6, b.end - a.start), slice: true });
      wi += n;
    }
    return out;
  }
  const voice = v.id || "bm_george", speed = v.speed ?? 0.92;
  const jobs = [];
  const files = s.lines.map((ln, i) => {
    const text = (ln.speak ?? String(ln.say)).replace(/\*|\|/g, "");
    const n = String(i + 1).padStart(2, "0");
    const f = path.join(vdir, `${n}-${hash(text, voice, speed)}.wav`);
    if (!fs.existsSync(f)) {
      for (const old of fs.readdirSync(vdir)) if (old.startsWith(n + "-")) fs.rmSync(path.join(vdir, old));
      jobs.push([text, f]);
    }
    return f;
  });
  if (jobs.length) {
    if (!ready()) {
      const why = await setupVoice();
      if (why) die(why);
    }
    if (!quiet) console.log(`· narrating ${jobs.length} line${jobs.length > 1 ? "s" : ""} with ${voice} (Kokoro, on this computer)…`);
    const [model, voices] = modelFiles();
    run(PY, [path.join(here, "lib", "tts.py"), model, voices, voice, String(speed)], { input: JSON.stringify(jobs) });
  }
  for (const f of files) out.push({ file: f, dur: duration(f) });
  return out;
}

function extractWords(raw, vdir) {
  let j;
  try { j = JSON.parse(raw.slice(raw.indexOf("{"))); } catch { j = null; }
  const pick = (o) => {
    if (!o) return [];
    if (Array.isArray(o)) return o.flatMap(pick);
    if (typeof o === "object") {
      if ((o.word || o.text) && typeof o.start === "number" && typeof o.end === "number" && !o.words) return [{ start: o.start, end: o.end }];
      return Object.values(o).flatMap(pick);
    }
    return [];
  };
  let W = pick(j);
  if (!W.length) {
    const tf = fs.readdirSync(vdir).find((f) => f.endsWith("transcript.json"));
    if (tf) W = pick(readJSON(path.join(vdir, tf)));
  }
  return W.sort((a, b) => a.start - b.start);
}

/* ------------------------------------------------------------------ timeline */

/**
 * Split a line into caption chunks of at most n words, balanced (7 words → 4 + 3, not 5 + 2),
 * breaking at punctuation when it's near. A "/" in the caption forces a break there.
 */
function chunks(text, n) {
  if (String(text).includes("/")) return String(text).split("/").map((x) => x.trim()).filter(Boolean);
  const w = words(text);
  if (w.length <= n) return [w.join(" ")];
  const parts = Math.ceil(w.length / n);
  const out = [];
  let i = 0;
  for (let p = parts; p > 1; p--) {
    const left = w.length - i;
    let size = Math.round(left / p);
    // a comma or stop one word either side wins
    for (const d of [0, 1, -1]) {
      const j = i + size + d - 1;
      if (size + d >= 2 && left - (size + d) >= 2 && size + d <= n && /[,.;:!?…—]$/.test(w[j])) { size += d; break; }
    }
    out.push(w.slice(i, i + size).join(" "));
    i += size;
  }
  out.push(w.slice(i).join(" "));
  return out;
}

function timeline(s, voices) {
  const [W, H] = FORMATS[s.format || "9:16"] || die(`format ${s.format}? (9:16, 16:9, 1:1, 4:5)`);
  const fps = s.fps || 24, twos = s.twos || 2;
  const lead = s.lead ?? 0.35, pause = s.pause ?? 0.3;
  const maxWords = s.captions?.words ?? 5;
  const beats = [], track = [], voiceAt = [];
  let t = 0;
  for (const [i, ln] of s.lines.entries()) {
    const v = voices[i];
    const start = t;
    const speak = start + (i === 0 ? lead : 0.05);
    voiceAt.push(speak);
    let end = speak + v.dur + pause + (ln.hold || 0);
    if (i === s.lines.length - 1) end += s.tail ?? 1.2;
    // captions: chunks timed by their length across the spoken part
    const cs = chunks(ln.caption ?? ln.say, maxWords);
    const total = cs.reduce((a, c) => a + c.length + 4, 0);
    let acc = 0;
    const times = cs.map((c) => { const at = speak + (v.dur * acc) / total; acc += c.length + 4; return at; });
    cs.forEach((c, j) => track.push({ at: j === 0 ? start : times[j], end: j === cs.length - 1 ? end : times[j + 1], text: c }));
    // shots: one scene, or a list that splits the line at its caption chunks
    const scenes = Array.isArray(ln.scene) ? ln.scene : [ln.scene];
    // as many scenes as chunks or fewer: cut on a chunk; more scenes than chunks: cut evenly through the line
    const cuts = scenes.map((_, j) =>
      j === 0 ? start : scenes.length <= cs.length ? times[Math.floor((j * cs.length) / scenes.length)] : speak + ((end - speak) * j) / scenes.length,
    );
    scenes.forEach((sc, j) => {
      const bs = cuts[j], be = j === scenes.length - 1 ? end : cuts[j + 1];
      const opt = typeof sc === "object" ? sc : { scene: sc };
      beats.push({
        line: i, scene: opt.scene, start: +bs.toFixed(4), dur: +(be - bs).toFixed(4),
        move: opt.move ?? ln.move ?? "push", moveAmount: opt.amount ?? ln.amount, seed: opt.seed ?? ln.seed,
        transition: j === 0 ? ln.transition ?? s.transition ?? "cut" : opt.transition ?? "cut", say: ln.say,
      });
    });
    t = end;
  }
  if (s.captions?.style === "none") track.length = 0;
  return { W, H, fps, twos, duration: +t.toFixed(3), beats, track, voiceAt };
}

/* ------------------------------------------------------------------ the page */

function build(dir, s, tl) {
  const b = path.join(dir, "build");
  fs.mkdirSync(b, { recursive: true });
  for (const f of ["kit.js", "paint.js", "stage.js"]) fs.copyFileSync(path.join(RUNTIME, f), path.join(b, f));
  const scenes = path.join(dir, "scenes.js");
  if (!fs.existsSync(scenes)) die("no scenes.js");
  fs.copyFileSync(scenes, path.join(b, "scenes.js"));
  const look = resolveLook(s.look);
  const SHORT = { ...tl, look: { ...look, ...(s.palette ? { palette: { ...look.palette, ...s.palette } } : {}) }, captions: { ...(look.captions || {}), ...(s.captions || {}) } };
  // assets (a logo, a reference drawing) are loaded as images the scenes can draw: k.img("name")
  const assets = path.join(dir, "assets");
  const imgs = fs.existsSync(assets) ? fs.readdirSync(assets).filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f)) : [];
  if (imgs.length) {
    fs.mkdirSync(path.join(b, "assets"), { recursive: true });
    for (const f of imgs) fs.copyFileSync(path.join(assets, f), path.join(b, "assets", f));
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style></head><body>
<canvas id="out"></canvas>
<script>window.SHORT=${JSON.stringify(SHORT)};window.IMAGES={};</script>
<script src="kit.js"></script><script src="paint.js"></script><script src="scenes.js"></script>
<script>
Promise.all(${JSON.stringify(imgs)}.map(f=>new Promise(r=>{const i=new Image();i.onload=()=>{IMAGES[f.replace(/\\.[^.]+$/,"")]=i;r()};i.onerror=r;i.src="assets/"+f}))).then(()=>{const s=document.createElement("script");s.src="stage.js";document.body.appendChild(s)});
</script></body></html>`;
  fs.writeFileSync(path.join(b, "index.html"), html);
  return path.join(b, "index.html");
}

async function page(dir, s, tl) {
  const html = build(dir, s, tl);
  const pg = await openPage(pathToFileURL(html).href, { width: tl.W, height: tl.H });
  const gl = await pg.evaluate("(()=>{const c=document.createElement('canvas').getContext('webgl2');const d=c&&c.getExtension('WEBGL_debug_renderer_info');return c?c.getParameter(d?d.UNMASKED_RENDERER_WEBGL:c.RENDERER):'none'})()");
  if (/swiftshader|llvmpipe/i.test(gl)) console.log("· no GPU in this browser, painting on the CPU (slower, same picture)");
  return pg;
}

const jpeg = (url) => Buffer.from(url.slice(url.indexOf(",") + 1), "base64");

/* ------------------------------------------------------------------ sound */

function pcm(file, from = 0, dur = null) {
  const args = ["-v", "error"];
  if (from) args.push("-ss", String(from));
  if (dur) args.push("-t", String(dur));
  args.push("-i", file, "-ac", "1", "-ar", "48000", "-f", "f32le", "-");
  const r = spawnSync("ffmpeg", args, { maxBuffer: 1 << 30 });
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, b.length / 4);
}
function wav(file, data) {
  const n = data.length, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(48000, 24);
  buf.writeUInt32LE(96000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(data[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, buf);
}

function soundtrack(dir, s, tl, voices) {
  const a = path.join(dir, "build", "audio");
  fs.mkdirSync(a, { recursive: true });
  // the voice, each line at its moment
  const vtrack = new Float32Array(Math.ceil((tl.duration + 0.5) * 48000));
  let hasVoice = false;
  voices.forEach((v, i) => {
    if (!v.file) return;
    const d = v.slice ? pcm(v.file, Math.max(0, v.from - 0.05), v.dur + 0.15) : pcm(v.file);
    const off = Math.round((tl.voiceAt[i] - (v.slice ? 0.05 : 0)) * 48000);
    for (let j = 0; j < d.length && off + j < vtrack.length; j++) vtrack[off + j] += d[j];
    hasVoice = true;
  });
  const vf = path.join(a, "voice.wav");
  wav(vf, vtrack);
  // the score
  const m = s.music ?? { mood: "tender" };
  const mood = typeof m === "string" ? m : m.mood ?? "tender";
  let mf = null;
  if (mood !== "none") {
    mf = path.join(a, "music.wav");
    const own = mood && !MOODS.includes(mood) && !PRESETS[mood];
    renderSoundtrack({ duration: tl.duration, preset: own ? "tender" : mood, music: own ? path.resolve(dir, mood) : "auto", cues: [], outroAt: tl.duration - 1.5, musicStart: m.start }, mf, { seed: m.seed ?? 11 });
  }
  const mixed = path.join(a, "mix.wav");
  const vol = typeof m === "object" && m.volume != null ? m.volume : hasVoice ? 0.42 : 0.9;
  if (mf && hasVoice) {
    run("ffmpeg", ["-v", "error", "-y", "-i", vf, "-i", mf, "-filter_complex",
      `[1:a]volume=${vol}[m];[0:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.04:ratio=3:attack=30:release=500[md];[v][md]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[o]`,
      "-map", "[o]", "-ar", "48000", "-t", String(tl.duration), mixed]);
  } else if (mf) run("ffmpeg", ["-v", "error", "-y", "-i", mf, "-af", `volume=${vol},loudnorm=I=-15:TP=-1.5`, "-t", String(tl.duration), mixed]);
  else run("ffmpeg", ["-v", "error", "-y", "-i", vf, "-af", "loudnorm=I=-14:TP=-1.5", "-t", String(tl.duration), mixed]);
  return mixed;
}

/* ------------------------------------------------------------------ commands */

const [cmd, dirArg, ...rest] = process.argv.slice(2);
const dir = dirArg ? path.resolve(dirArg) : null;

if (cmd === "looks") {
  for (const f of fs.readdirSync(LOOKS).filter((f) => f.endsWith(".json")).sort()) {
    const l = readJSON(path.join(LOOKS, f));
    console.log(`${f.replace(".json", "").padEnd(12)} ${l.about || ""}`);
  }
  console.log(`\nmusic moods: ${MOODS.join(", ")} (or "none", or a path to their own track)`);
  console.log("voices: bm_george (warm British man, default), am_michael, am_adam, af_heart, af_nova, bf_emma, bf_isabella");
  process.exit(0);
}

if (cmd === "new") {
  if (!dir) die("SA new <dir>");
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d; };
  if (!fs.existsSync(path.join(dir, "short.json"))) {
    writeJSON(path.join(dir, "short.json"), {
      title: "Untitled short",
      brief: "",
      format: opt("format", "9:16"),
      look: opt("look", "oil"),
      voice: { id: "bm_george", speed: 0.92 },
      music: { mood: "tender" },
      captions: { style: "box" },
      lines: [{ say: "Every story starts somewhere.", scene: "opening", move: "push" }],
    });
  }
  if (!fs.existsSync(path.join(dir, "scenes.js"))) {
    fs.writeFileSync(path.join(dir, "scenes.js"), `// One function per shot. k is the drawing kit (references/kit.md).\nwindow.SCENES = {\n  opening: (k) => {\n    k.sky({ stops: ["#f3ecd2", "#e9dfb7"] });\n    k.ridge({ y: 0.52, amp: 0.02, freq: 4, color: "#4f7a3a", shape: "bush" });\n    k.ground({ y: 0.52, color: "#8fbf3a", far: "#c3cf5a", stripes: 14 });\n    k.person({ x: 0.5, y: 0.82, h: 0.28, pose: "walk", facing: "front" });\n  },\n};\n`);
  }
  console.log(`✓ ${dir}\n  short.json  the script, look, voice, music\n  scenes.js   the drawings\n  assets/     anything they gave you`);
  process.exit(0);
}

if (cmd === "set") {
  const s = load(dir);
  for (const kv of rest) {
    const i = kv.indexOf("=");
    const keys = kv.slice(0, i).split(".");
    let val = kv.slice(i + 1);
    try { val = JSON.parse(val); } catch {}
    let o = s;
    for (const k of keys.slice(0, -1)) o = o[k] ??= /^\d+$/.test(k) ? [] : {};
    o[keys.at(-1)] = val;
  }
  writeJSON(path.join(dir, "short.json"), s);
  console.log("✓ short.json updated");
  process.exit(0);
}

if (cmd === "voice") {
  const s = load(dir);
  const v = await narrate(dir, s);
  const tl = timeline(s, v);
  tl.beats.forEach((b, i) => console.log(`${String(i + 1).padStart(2)}  ${b.start.toFixed(2).padStart(6)}s  ${b.dur.toFixed(2)}s  ${String(b.scene).padEnd(16)} ${b.say}`));
  console.log(`total ${tl.duration.toFixed(1)}s, ${tl.beats.length} shots`);
  process.exit(0);
}

if (cmd === "frames" || cmd === "still") {
  const s = load(dir);
  const v = await narrate(dir, s, { quiet: true });
  const tl = timeline(s, v);
  const fdir = path.join(dir, "frames");
  fs.mkdirSync(fdir, { recursive: true });
  const pg = await page(dir, s, tl);
  try {
    if (cmd === "still") {
      const i = Math.max(0, parseInt(rest[0] || "1", 10) - 1), at = parseFloat(rest[1] || "0.6");
      const f = path.join(fdir, `shot-${String(i + 1).padStart(2, "0")}.jpg`);
      fs.writeFileSync(f, jpeg(await pg.evaluate(`window.still(${i}, ${at})`)));
      console.log(`✓ ${f}`);
    } else {
      for (const f of fs.readdirSync(fdir)) if (/^s\d+\.jpg$/.test(f)) fs.rmSync(path.join(fdir, f));
      for (let i = 0; i < tl.beats.length; i++) fs.writeFileSync(path.join(fdir, `s${String(i).padStart(3, "0")}.jpg`), jpeg(await pg.evaluate(`window.still(${i}, 0.6)`)));
      const cols = Math.min(6, tl.beats.length), rows = Math.ceil(tl.beats.length / cols);
      const w = tl.W > tl.H ? 480 : 300;
      run("ffmpeg", ["-v", "error", "-y", "-framerate", "1", "-i", path.join(fdir, "s%03d.jpg"), "-vf", `scale=${w}:-2,tile=${cols}x${rows}:padding=6:color=white`, "-frames:v", "1", path.join(fdir, "sheet.jpg")]);
      console.log(`✓ ${path.join(fdir, "sheet.jpg")}  (${tl.beats.length} shots, ${tl.duration.toFixed(1)}s)`);
    }
    const errs = pg.logs.filter((l) => /error/i.test(l));
    if (errs.length) console.log("⚠ the page said:\n  " + errs.slice(0, 8).join("\n  "));
  } finally {
    await pg.close();
  }
  process.exit(0);
}

if (cmd === "render") {
  const s = load(dir);
  const t0 = Date.now();
  const v = await narrate(dir, s);
  const tl = timeline(s, v);
  console.log(`· ${tl.beats.length} shots, ${tl.duration.toFixed(1)}s at ${tl.fps} fps, drawn on ${tl.twos === 1 ? "ones" : tl.twos === 2 ? "twos" : tl.twos + "s"}`);
  const audio = soundtrack(dir, s, tl, v);
  const pg = await page(dir, s, tl);
  const rdir = path.join(dir, "renders");
  fs.mkdirSync(rdir, { recursive: true });
  const n = fs.readdirSync(rdir).filter((f) => /^v\d+\.mp4$/.test(f)).length + 1;
  const outV = path.join(rdir, `v${n}.mp4`);
  const drawings = Math.ceil((tl.duration * tl.fps) / tl.twos);
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(tl.fps / tl.twos), "-i", "-", "-i", audio,
    "-map", "0:v", "-map", "1:a", "-r", String(tl.fps), "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "192k", "-shortest", outV], { stdio: ["pipe", "inherit", "inherit"] });
  const write = (buf) => new Promise((r) => (ff.stdin.write(buf) ? r() : ff.stdin.once("drain", r)));
  try {
    for (let d = 0; d < drawings; d++) {
      await write(jpeg(await pg.evaluate(`window.drawing(${d})`)));
      if (d % 60 === 0) process.stdout.write(`\r· painting ${d}/${drawings} drawings`);
    }
    process.stdout.write(`\r· painted ${drawings} drawings          \n`);
    const errs = pg.logs.filter((l) => /error/i.test(l));
    if (errs.length) console.log("⚠ the page said:\n  " + errs.slice(0, 8).join("\n  "));
  } finally {
    await pg.close();
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  const final = path.join(dir, `${slug(s.title)}.mp4`);
  fs.copyFileSync(outV, final);
  writeJSON(path.join(rdir, `v${n}.json`), s);
  // the check: every shot from the real file
  fs.mkdirSync(path.join(dir, "qa"), { recursive: true });
  const sel = tl.beats.map((b) => `between(t\\,${(b.start + b.dur * 0.6).toFixed(2)}\\,${(b.start + b.dur * 0.6 + 0.04).toFixed(2)})`).join("+");
  const cols = Math.min(6, tl.beats.length);
  run("ffmpeg", ["-v", "error", "-y", "-i", final, "-vf", `select='${sel}',scale=${tl.W > tl.H ? 480 : 300}:-2,tile=${cols}x${Math.ceil(tl.beats.length / cols)}:padding=6:color=white`, "-frames:v", "1", "-fps_mode", "vfr", path.join(dir, "qa", "sheet.jpg")]);
  console.log(`✓ ${final}\n  ${tl.duration.toFixed(1)}s · ${tl.W}×${tl.H} · ${((Date.now() - t0) / 1000).toFixed(0)}s to make · check: ${path.join(dir, "qa", "sheet.jpg")}`);
  process.exit(0);
}

console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(2, 15).join("\n").replace(/^ \* ?/gm, ""));
