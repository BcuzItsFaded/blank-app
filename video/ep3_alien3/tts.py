import json, re, subprocess, wave, os, sys
import numpy as np
from kokoro_onnx import Kokoro
KK = Kokoro(os.path.dirname(os.path.abspath(__file__)) + "/voices/kokoro-v1.0.onnx", os.path.dirname(os.path.abspath(__file__)) + "/voices/voices-v1.0.bin")
VOICE = os.environ.get("VOICE", "am_michael")

D = os.path.dirname(os.path.abspath(__file__))
MODEL = f"{D}/voices/en_US-ryan-high.onnx"
SR = 24000
LS = sys.argv[1] if len(sys.argv) > 1 else "1.08"
script = json.load(open(f"{D}/script.json"))
os.makedirs(f"{D}/tts", exist_ok=True)

FIX = [("Alien 3", "Alien Three"), ("LV-426", "L V four twenty-six"), ("Fiorina 161", "Fiorina one sixty-one"),
       ("Weyland-Yutani", "Weyland Yutani"), ("Xenomorph", "Zeenomorph")]

def speak(text, path):
    for a, b in FIX: text = text.replace(a, b)
    a, sr = KK.create(text, voice=VOICE, speed=float(LS), lang="en-gb" if VOICE.startswith("b") else "en-us")
    return np.asarray(a, dtype=np.float32)

def split(vo):
    return [s.strip() for s in re.split(r'(?<=[.?!])\s+(?=[A-Z])', vo) if s.strip()]

LEAD, GAP, TAIL = 0.8, 0.5, 2.2
timings = []
for i, sc in enumerate(script):
    sents = split(sc["vo"])
    audio = [np.zeros(int(LEAD * SR), np.float32)]
    t = LEAD; segs = []
    for j, s in enumerate(sents):
        a = speak(s, f"{D}/tts/tmp.wav")
        # trim leading/trailing near-silence
        nz = np.where(np.abs(a) > 0.01)[0]
        a = a[max(0, nz[0] - 200): nz[-1] + 800] if len(nz) else a
        d = len(a) / SR
        segs.append({"text": s, "start": round(t, 3), "end": round(t + d, 3)})
        audio.append(a); t += d
        g = GAP + (0.25 if s.endswith("?") else 0)
        audio.append(np.zeros(int(g * SR), np.float32)); t += g
    audio.append(np.zeros(int(TAIL * SR), np.float32)); t += TAIL
    full = np.concatenate(audio)
    with wave.open(f"{D}/tts/scene{i+1:02d}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(full, -1, 1) * 32767).astype(np.int16).tobytes())
    timings.append({"title": sc["title"], "dur": round(len(full) / SR, 3), "sents": segs})
    print(i + 1, round(len(full) / SR, 1), "s", len(sents), "sentences")
json.dump(timings, open(f"{D}/timings.json", "w"), indent=1)
print("total", round(sum(x["dur"] for x in timings), 1))
