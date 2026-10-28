#!/usr/bin/env node
// Checks everything Shorts Animator needs, sets up the narrator, and makes a 3-second test short.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findChrome } from "./lib/chrome.mjs";
import { setup } from "./lib/voice.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
let bad = 0;
const ok = (m) => console.log("ok " + m);
const no = (m) => { console.log("!! " + m); bad++; };

const major = +process.versions.node.split(".")[0];
major >= 22 ? ok(`Node ${process.versions.node}`) : no(`Node ${process.versions.node} is too old: install Node 22+ from https://nodejs.org`);
const ff = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
ff.status === 0 ? ok("ffmpeg") : no(`ffmpeg is missing: ${process.platform === "darwin" ? "brew install ffmpeg" : process.platform === "win32" ? "winget install ffmpeg" : "sudo apt install ffmpeg"}`);
let chrome = findChrome();
if (!chrome) {
  console.log("· no Chrome found, fetching the headless one HyperFrames uses…");
  spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["--yes", "hyperframes", "browser", "ensure"], { stdio: "inherit" });
  chrome = findChrome();
}
chrome ? ok(`Chrome: ${chrome.bin}`) : no("no Chrome: install Google Chrome, or run npx hyperframes browser ensure");
if (bad) process.exit(1);

const why = await setup((m) => console.log(m));
why ? no(why) : ok("the narrator (Kokoro, runs on this computer)");

const work = fs.mkdtempSync(path.join(os.tmpdir(), "shorts-test-"));
fs.writeFileSync(path.join(work, "short.json"), JSON.stringify({
  title: "test", look: "oil", voice: why ? "none" : { id: "bm_george" }, music: { mood: "tender" },
  lines: [{ say: "It works.", scene: "test", move: "push" }], tail: 1,
}));
fs.writeFileSync(path.join(work, "scenes.js"), `window.SCENES = { test: (k) => { k.sky({ stops: ["#3f8ad6", "#e6eef2"] }); k.clouds({}); k.ground({ y: 0.6, color: "#58a531", stripes: 12 }); k.person({ x: 0.5, y: 0.82, h: 0.26, pose: "wave" }); } };`);
const r = spawnSync(process.execPath, [path.join(here, "animate.mjs"), "render", work], { stdio: "inherit" });
if (r.status === 0 && fs.existsSync(path.join(work, "test.mp4"))) ok(`test short: ${path.join(work, "test.mp4")}`);
else no("the test render failed (see above)");
process.exit(bad ? 1 : 0);
