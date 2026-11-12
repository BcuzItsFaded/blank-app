import json, os, wave
import numpy as np
from kokoro_onnx import Kokoro
D = os.path.dirname(os.path.abspath(__file__)); SP = os.path.dirname(D)
KK = Kokoro(f"{SP}/voices/kokoro-v1.0.onnx", f"{SP}/voices/voices-v1.0.bin")
SR = 24000
LINES = [
 "Stick versus Brick! The battle the whole verse has been waiting for.",
 "On one side, the Stick Army. Fast, flexible, and fearless.",
 "On the other, the Brick Army. Solid, strong, and built to last.",
 "The sticks charge! Flips, kicks, and fists everywhere!",
 "But the bricks hold the line, with cannons, shields, and a giant knight.",
 "Then every loose brick snaps together into a monster golem!",
 "So the sticks do what sticks do best. They draw a giant sword!",
 "One huge swing, and the golem comes crashing down!",
 "So who wins? Stick, or Brick? Comment below, and follow R G Brick and Stick Verse.",
]
LEAD, GAP, TAIL = 0.5, 0.3, 1.6
audio = [np.zeros(int(LEAD * SR), np.float32)]; t = LEAD; sents = []
GAPS = {0: 0.4}
for s in LINES:
    GAP = GAPS.get(LINES.index(s), 0.7)
    a, _ = KK.create(s, voice="am_michael", speed=1.05, lang="en-us"); a = np.asarray(a, np.float32)
    nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, nz[0] - 200): nz[-1] + 800]
    d = len(a) / SR; sents.append({"text": s, "start": round(t, 3), "end": round(t + d, 3)})
    audio += [a, np.zeros(int(GAP * SR), np.float32)]; t += d + GAP
audio.append(np.zeros(int(TAIL * SR), np.float32)); t += TAIL
full = np.concatenate(audio)
with wave.open(f"{D}/narration.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(full, -1, 1) * 32767).astype(np.int16).tobytes())
json.dump({"dur": round(t, 3), "sents": sents}, open(f"{D}/timings.json", "w"), indent=1)
for i, s in enumerate(sents): print(i, s["start"], s["end"], s["text"][:50])
print("total", round(t, 1))
