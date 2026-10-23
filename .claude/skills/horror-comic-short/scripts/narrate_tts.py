#!/usr/bin/env python3
"""Free narrator: synthesize the episode's script with Kokoro or Piper TTS (runs locally, no API), then hand the
take to prepare_voice.py, which places each section on its timestamp and applies the voice preset.

    python3 narrate_tts.py <episodeDir> [--engine kokoro|piper] [--voice am_michael] [--speed 1.1] [--creepy | --clown] [--fit]

--fit (recommended) hands the take to fit_narration.py: Whisper word timings, the panels re-timed to
the voice, word-exact subtitles. Without it, prepare_voice.py keeps the storyboard timing.

Setup once:  python3 -m venv ~/.piper && ~/.piper/bin/pip install kokoro-onnx piper-tts faster-whisper
             (run this script with ~/.piper/bin/python, or anywhere `piper` is importable)

Engines: --engine kokoro (default, most human-sounding; Kokoro-82M, Apache 2.0, ~350 MB download once,
         pip install kokoro-onnx) or --engine piper (lighter, more robotic).
Kokoro voices (Apache 2.0, commercial OK, no credit needed): am_michael (warm US storyteller, default),
  am_fenrir (deeper US), am_puck (lively US), bm_george / bm_fable (British). Female: af_heart, af_bella.
Piper voices (all commercial-safe):
  en_US-john-medium   natural audiobook storyteller (LibriVox, public domain): the default, no credit needed
  en_US-joe-medium    clear, neutral (CC0)        en_US-bryce-medium  slower, warm (public domain)
  en_GB-northern_english_male-medium  British (CC-BY-SA 4.0: credit "Piper TTS, northern_english_male, OpenSLR 83")
Avoid en_US-ryan-* and en_US-hfc_male-* for monetized channels (non-commercial licences).
"""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.request
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("episode")
ap.add_argument("--engine", choices=["kokoro", "piper"], default="kokoro")
ap.add_argument("--voice", default=None, help="kokoro: am_michael… / piper: en_US-john-medium…")
ap.add_argument("--speed", type=float, default=1.1, help="kokoro speaking speed (1 = normal)")
ap.add_argument("--pace", type=float, default=0.95, help="piper length scale (>1 = slower)")
ap.add_argument("--creepy", action="store_true")
ap.add_argument("--clown", action="store_true")
ap.add_argument("--fit", action="store_true", help="re-time the video to the voice with fit_narration.py")
a, passthrough = ap.parse_known_args()  # anything else (e.g. --length 60 --max-tempo 1.08) goes to the fitter
a.extra = passthrough

a.voice = a.voice or ("am_michael" if a.engine == "kokoro" else "en_US-john-medium")

# ---- voice model (cached)
cache = os.path.expanduser("~/.cache/piper-voices"); os.makedirs(cache, exist_ok=True)
model = os.path.join(cache, a.voice + ".onnx")
if a.engine == "piper" and not os.path.exists(model):
    lang, name, q = a.voice.split("-")[0], a.voice.split("-")[1], a.voice.split("-")[2]
    base = f"https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/{lang.split('_')[0]}/{lang}/{name}/{q}/{a.voice}"
    for ext in (".onnx", ".onnx.json"):
        print("downloading", base + ext); urllib.request.urlretrieve(base + ext, model if ext == ".onnx" else model + ".json")

# ---- sections from project.js
proj = open(os.path.join(a.episode, "assets", "project.js"), encoding="utf-8").read()
m = re.search(r'"?script"?\s*:\s*(`|")((?:\\.|(?!\1).)*)\1', proj, re.S)
script = json.loads('"' + m.group(2) + '"') if m.group(1) == '"' else m.group(2)
T = r"\d{1,2}:\d{2}(?:[.,]\d+)?"
texts = []
for line in script.splitlines():
    if re.search(T + r"\s*(?:-|–|—|to|→)\s*" + T, line): texts.append("")
    elif texts and line.strip(): texts[-1] += " " + re.sub(r"^[A-Z][A-Z .'()\-]{1,30}:\s*", "", line.strip())
texts = [re.sub(r"\*\*|__", "", t).strip() for t in texts]

# ---- synthesize each section; join with clear pauses so the fitter can split them
if a.engine == "kokoro":
    from kokoro_onnx import Kokoro
    kdir = os.path.expanduser("~/.cache/kokoro"); os.makedirs(kdir, exist_ok=True)
    rel = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
    for f in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
        if not os.path.exists(os.path.join(kdir, f)):
            print("downloading", f); urllib.request.urlretrieve(rel + f, os.path.join(kdir, f))
    kk = Kokoro(os.path.join(kdir, "kokoro-v1.0.onnx"), os.path.join(kdir, "voices-v1.0.bin"))
    lang = "en-gb" if a.voice.startswith("b") else "en-us"
    def speak(t):
        audio, rate = kk.create(t, voice=a.voice, speed=a.speed, lang=lang)
        return np.asarray(audio, np.float32), rate
else:
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(model)
    cfg = SynthesisConfig(length_scale=a.pace, noise_scale=0.6, noise_w_scale=0.7)
    def speak(t):
        return np.concatenate([c.audio_float_array for c in voice.synthesize(t, syn_config=cfg)]).astype(np.float32), voice.config.sample_rate
parts, sr = [], None
for i, t in enumerate(texts):
    audio, sr = speak(t)
    if not parts: parts.append(np.zeros(int(0.5 * sr), np.float32))
    parts += [audio, np.zeros(int(1.2 * sr), np.float32)]
    print(f"section {i + 1}: {len(audio) / sr:5.2f}s  {t[:60]}…")
take = os.path.join(tempfile.mkdtemp(), "tts-take.wav")
raw = take + ".f32"; np.concatenate(parts).tofile(raw)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", raw, take], check=True)

here = os.path.dirname(os.path.abspath(__file__))
style = (["--creepy"] if a.creepy else []) + (["--clown"] if a.clown else [])
if a.fit:
    args = [sys.executable, os.path.join(here, "fit_narration.py"), a.episode, take] + style + a.extra
else:
    args = [sys.executable, os.path.join(here, "prepare_voice.py"), a.episode, take, "--no-denoise"] + (["--creepy"] if a.creepy else []) + a.extra
sys.exit(subprocess.call(args))
