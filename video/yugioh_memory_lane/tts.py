import json, os, wave
import numpy as np
from kokoro_onnx import Kokoro
D = os.path.dirname(os.path.abspath(__file__)); SP = os.path.dirname(D)
KK = Kokoro(f"{SP}/voices/kokoro-v1.0.onnx", f"{SP}/voices/voices-v1.0.bin")
SR = 24000
LINES = [
 "Yu-Gi-Oh! A quick trip down memory lane.",
 "Two thousand two. Every kid had a deck in their pocket.",
 "You traded at lunch, and pulling a shiny holo felt like winning the lottery.",
 "Everyone wanted the Blue-Eyes White Dragon. Three thousand attack points!",
 "And somebody always claimed they had all five pieces of Exodia.",
 "Eight thousand life points, one Pot of Greed, and it's time to duel!",
 "Two tributes, and a three thousand attack monster burst right out of the card!",
 "It attacked a twenty five hundred attack golem. Five hundred damage, straight to the life points!",
 "Who was your favorite duelist? Comment below, and follow R G Brick and Stick Verse for more memory lane.",
]
LEAD, GAP, TAIL = 0.5, 0.3, 1.6
audio = [np.zeros(int(LEAD * SR), np.float32)]; t = LEAD; sents = []
for s in LINES:
    a, _ = KK.create(s.replace("Yu-Gi-Oh", "You Gee Oh").replace("Exodia", "Ex-oh-dia"), voice="am_michael", speed=1.05, lang="en-us"); a = np.asarray(a, np.float32)
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
