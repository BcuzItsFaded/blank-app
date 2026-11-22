"""Captions, SFX master (narration + original procedural effects) and project.json."""
import json, re, os
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
b = json.load(open(os.path.join(HERE, "build-out.json")))
words = json.load(open(os.path.join(HERE, "words.json")))["words"]
LEAD, TAIL = 0.15, 0.35

# captions: walk the phrases over the aligned words
cues, i = [], 0
norm = lambda s: re.sub(r"[^a-z0-9']", "", s.lower())
for ph in b["phrases"]:
    toks = [t for t in ph.split() if norm(t)]
    first, last = i, i + len(toks) - 1
    for k, t in enumerate(toks):
        assert norm(t) == norm(words[i + k]["word"]), (ph, t, words[i + k])
    cues.append({"start": round(words[first]["start"] + LEAD, 3), "end": round(words[last]["end"] + LEAD + 0.3, 3), "text": ph})
    i = last + 1
assert i == len(words)
for a, c in zip(cues, cues[1:]):
    a["end"] = min(a["end"], round(c["start"] - 0.02, 3))

# SFX master
v, sr = sf.read(os.path.join(HERE, "narration.wav"))
out = v.astype(float).copy()
rng = np.random.default_rng(7)
def add(t, sig):
    s = int(t * sr)
    seg = out[s:s + len(sig)]
    seg += sig[:len(seg)]
def env(n, attack=0.004, rate=25):
    t = np.arange(n) / sr
    return np.minimum(1, t / attack) * np.exp(-t * rate)
def fx(kind, gain):
    n = int(sr * {"chime": 0.55, "paper": 0.22}.get(kind, 0.12))
    t = np.arange(n) / sr
    if kind == "paper": s = rng.uniform(-1, 1, n) * env(n, rate=18)
    elif kind == "tap": s = (rng.uniform(-1, 1, n) * 0.6 + np.sin(2 * np.pi * 170 * t) * 0.4) * env(n)
    elif kind == "pop": s = np.sin(2 * np.pi * (500 - 900 * t) * t) * env(n)
    elif kind == "chime": s = (np.sin(2 * np.pi * 880 * t) + 0.5 * np.sin(2 * np.pi * 1320 * t)) * env(n, rate=8) / 1.5
    return s * gain * 2.2
for t, kind, gain in b["sfx"]:
    add(t, fx(kind, gain))
for t0, t1, pitch, gain in b["buzz"]:
    n = int((t1 - t0) * sr)
    t = np.arange(n) / sr
    f = 118 * pitch
    s = sum(np.sign(np.sin(2 * np.pi * f * h * t)) / h for h in (1, 3)) * 0.5 + rng.normal(0, 0.25, n)
    s *= 1 + 0.15 * np.sin(2 * np.pi * 7 * t)
    ramp = np.minimum(1, np.minimum(t, t[-1] - t) / 0.03)
    add(t0, s * ramp * gain * 1.3)
peak = np.abs(out).max()
if peak > 0.98: out *= 0.98 / peak
sf.write(os.path.join(HERE, "master.wav"), out, sr)

proj = {
    "version": 1, "style": "B2", "width": 1080, "height": 1920, "fps": 30,
    "font": "fonts/PressStart2P-Regular.ttf", "captionSize": 50,
    "voice": {"path": "master.wav", "lead": LEAD, "tail": TAIL, "contains_sfx": True},
    "captions": cues, "shots": b["shots"],
}
json.dump(proj, open(os.path.join(HERE, "project.json"), "w"), indent=1)
print("cues", len(cues), "peak", round(float(peak), 3), "voice peak", round(float(np.abs(v).max()), 3))
