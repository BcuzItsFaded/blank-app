/*
 * A headless Chrome, driven over the DevTools protocol with Node's own
 * WebSocket: no puppeteer, nothing to npm install. Uses the Chrome that
 * HyperFrames downloads, or the person's Chrome, or $CHROME.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function findChrome() {
  if (process.env.CHROME && fs.existsSync(process.env.CHROME)) return { bin: process.env.CHROME, shell: /headless-shell/.test(process.env.CHROME) };
  const cache = path.join(os.homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
  if (fs.existsSync(cache)) {
    for (const v of fs.readdirSync(cache).sort().reverse()) {
      for (const sub of fs.readdirSync(path.join(cache, v))) {
        const exe = path.join(cache, v, sub, process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell");
        if (fs.existsSync(exe)) return { bin: exe, shell: true };
      }
    }
  }
  const candidates = {
    darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
    linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
    win32: [
      `${process.env["PROGRAMFILES"]}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ],
  }[process.platform] || [];
  for (const c of candidates) if (c && fs.existsSync(c)) return { bin: c, shell: false };
  return null;
}

export async function openPage(url, { width, height, readyWhen = "window.ready === true" }) {
  const found = findChrome();
  if (!found) throw new Error("No Chrome found. Install Google Chrome, or run `npx hyperframes browser ensure`, or set CHROME=/path/to/chrome");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shorts-chrome-"));
  const args = [
    "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--no-default-browser-check",
    "--allow-file-access-from-files", "--hide-scrollbars", "--mute-audio", "--enable-webgl", "--ignore-gpu-blocklist",
    `--window-size=${width},${height}`,
  ];
  if (!found.shell) args.push("--headless=new");
  // the GPU through Metal on a Mac (~15× faster than the software fallback)
  const angle = process.env.SHORTS_GL || (process.platform === "darwin" ? "metal" : "");
  if (angle) args.push(`--use-angle=${angle}`);
  const proc = spawn(found.bin, [...args, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const to = setTimeout(() => reject(new Error("Chrome didn't start:\n" + buf.slice(-800))), 30000);
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(to); resolve(m[1]); }
    });
    proc.on("exit", (c) => { clearTimeout(to); reject(new Error(`Chrome exited (${c}):\n` + buf.slice(-800))); });
  });
  const port = new URL(wsUrl).port;
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const pageWs = list.find((t) => t.type === "page").webSocketDebuggerUrl;
  const ws = new WebSocket(pageWs);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method === "Runtime.consoleAPICalled") logs.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    else if (m.method === "Runtime.exceptionThrown") logs.push("ERROR " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: Math.min(width, 1600), height: Math.min(height, 1600), deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    if (r.error) throw new Error(r.error.message);
    return r.result.result.value;
  };
  const start = Date.now();
  for (;;) {
    let ok = false;
    try { ok = await evaluate(readyWhen); } catch {}
    if (ok) break;
    if (Date.now() - start > 30000) throw new Error("The page didn't load:\n" + logs.join("\n"));
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    evaluate,
    logs,
    send,
    async close() {
      try { ws.close(); } catch {}
      proc.kill("SIGKILL");
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    },
  };
}
