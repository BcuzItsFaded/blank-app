/*
 * Where the narrator lives: a private Python (~/.cache/shorts-animator/venv)
 * with kokoro-onnx, and the Kokoro model files (reused from HyperFrames'
 * cache when it has them, else downloaded once, ~340 MB).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const HOME = path.join(os.homedir(), ".cache", "shorts-animator");
export const VENV = path.join(HOME, "venv");
export const PY = path.join(VENV, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0";

export function modelFiles() {
  const hf = path.join(os.homedir(), ".cache", "hyperframes", "tts");
  const pairs = [
    [path.join(hf, "models", "kokoro-v1.0.onnx"), path.join(hf, "voices", "voices-v1.0.bin")],
    [path.join(HOME, "kokoro", "kokoro-v1.0.onnx"), path.join(HOME, "kokoro", "voices-v1.0.bin")],
  ];
  return pairs.find(([m, v]) => fs.existsSync(m) && fs.existsSync(v)) || null;
}

export function ready() {
  return fs.existsSync(PY) && spawnSync(PY, ["-c", "import kokoro_onnx, soundfile"]).status === 0 && !!modelFiles();
}

/** Sets the narrator up. Returns null when done, or a message saying what is missing. */
export async function setup(log = console.log) {
  if (!(fs.existsSync(PY) && spawnSync(PY, ["-c", "import kokoro_onnx, soundfile"]).status === 0)) {
    fs.mkdirSync(HOME, { recursive: true });
    const has = (b, a = ["--version"]) => spawnSync(b, a, { encoding: "utf8" }).status === 0;
    if (has("uv")) {
      log("· setting up the narrator's Python (uv)…");
      spawnSync("uv", ["venv", "-q", "--allow-existing", "-p", "3.12", VENV], { stdio: "inherit" });
      spawnSync("uv", ["pip", "install", "-q", "-p", PY, "kokoro-onnx", "soundfile"], { stdio: "inherit" });
    } else {
      const py = ["python3.13", "python3.12", "python3.11", "python3.10", "python3", "python", "py"].find((b) => {
        const r = spawnSync(b, ["-c", "import sys; print(sys.version_info >= (3, 10))"], { encoding: "utf8" });
        return r.status === 0 && r.stdout.trim() === "True";
      });
      if (!py) return "the narrator needs Python 3.10+ or uv. Install uv (https://docs.astral.sh/uv/, one command) and run this again — or set voice to \"none\" or use your own recording";
      log(`· setting up the narrator's Python (${py})…`);
      spawnSync(py, ["-m", "venv", VENV], { stdio: "inherit" });
      spawnSync(PY, ["-m", "pip", "install", "-q", "--upgrade", "pip"], { stdio: "inherit" });
      spawnSync(PY, ["-m", "pip", "install", "-q", "kokoro-onnx", "soundfile"], { stdio: "inherit" });
    }
    if (spawnSync(PY, ["-c", "import kokoro_onnx, soundfile"]).status !== 0) return "couldn't install kokoro-onnx into " + VENV;
  }
  if (!modelFiles()) {
    const dir = path.join(HOME, "kokoro");
    fs.mkdirSync(dir, { recursive: true });
    for (const f of ["voices-v1.0.bin", "kokoro-v1.0.onnx"]) {
      log(`· downloading the voice model: ${f}…`);
      const res = await fetch(`${RELEASE}/${f}`);
      if (!res.ok) return `couldn't download ${f} (${res.status})`;
      fs.writeFileSync(path.join(dir, f + ".part"), Buffer.from(await res.arrayBuffer()));
      fs.renameSync(path.join(dir, f + ".part"), path.join(dir, f));
    }
  }
  return null;
}
