#!/usr/bin/env python3
"""Free narrator: synthesize the episode's script with Piper TTS (runs locally, no API), then hand the
take to prepare_voice.py, which places each section on its timestamp and applies the voice preset.

    python3 narrate_tts.py <episodeDir> [--voice en_US-john-medium] [--pace 0.95] [--creepy | --clown] [--fit]

--fit (recommended) hands the take to fit_narration.py: Whisper word timings, the panels re-timed to
the voice, word-exact subtitles. Without it, prepare_voice.py keeps the storyboard timing.

Setup once:  python3 -m venv ~/.piper && ~/.piper/bin/pip install piper-tts
             (run this script with ~/.piper/bin/python, or anywhere `piper` is importable)

Voices (all commercial-safe):
  en_US-john-medium   natural audiobook storyteller (LibriVox, public domain): the default, no credit needed
  en_US-joe-medium    clear, neutral (CC0)        en_US-bryce-medium  slower, warm (public domain)
  en_GB-northern_english_male-medium  British (CC-BY-SA 4.0: credit "Piper TTS, northern_english_male, OpenSLR 83")
Avoid en_US-ryan-* and en_US-hfc_male-* for monetized channels (non-commercial licences).
"""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.request
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("episode")
ap.add_argument("--voice", default="en_US-john-medium")
ap.add_argument("--pace", type=float, default=0.95, help=">1 = slower, more ominous delivery")
ap.add_argument("--creepy", action="store_true")
ap.add_argument("--clown", action="store_true")
ap.add_argument("--fit", action="store_true", help="re-time the video to the voice with fit_narration.py")
a, passthrough = ap.parse_known_args()  # anything else (e.g. --length 60 --max-tempo 1.08) goes to the fitter
a.extra = passthrough

# ---- voice model (cached)
cache = os.path.expanduser("~/.cache/piper-voices"); os.makedirs(cache, exist_ok=True)
model = os.path.join(cache, a.voice + ".onnx")
if not os.path.exists(model):
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

# ---- synthesize each section; join with clear pauses so prepare_voice can split them
from piper import PiperVoice, SynthesisConfig
voice = PiperVoice.load(model)
cfg = SynthesisConfig(length_scale=a.pace, noise_scale=0.6, noise_w_scale=0.7)
sr = voice.config.sample_rate
parts = [np.zeros(int(0.5 * sr), np.float32)]
for i, t in enumerate(texts):
    audio = np.concatenate([c.audio_float_array for c in voice.synthesize(t, syn_config=cfg)])
    parts += [audio.astype(np.float32), np.zeros(int(1.2 * sr), np.float32)]
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
