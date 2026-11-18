import json, os, wave
import numpy as np
from kokoro_onnx import Kokoro
D = os.path.dirname(os.path.abspath(__file__)); SP = os.path.dirname(D)
KK = Kokoro(f"{SP}/voices/kokoro-v1.0.onnx", f"{SP}/voices/voices-v1.0.bin")
SR = 24000
LINES = [
 "Pokémon Ruby and Sapphire. A quick trip down memory lane.",
 "Two thousand three. You rode into Littleroot Town in the back of a moving truck. Welcome to Hoenn.",
 "On Route 101, Professor Birch was being chased by a wild Poochyena. You grabbed a ball from his bag, and picked Treecko, Torchic, or Mudkip.",
 "Then Secret Power let you build your own secret base, and fill it with mats and dolls.",
 "Double battles arrived. Two against two, for the very first time.",
 "Then Groudon and Kyogre woke up, and the weather went wild.",
 "And who could forget the water? So. Much. Water.",
 "Ruby or Sapphire? Comment your version, and follow R G Brick and Stick Verse for more memory lane.",
]
FIX = [("Pokémon", "Pokay-mon"), ("Route 101", "Route one oh one"), ("Poochyena", "Pooch-ee-ena"), ("Treecko", "Tree-ko"), ("Torchic", "Tor-chick"), ("Groudon", "Grow-don"), ("Kyogre", "Kai-oh-gur"), ("Hoenn", "Hoe-en")]
def say(s):
    for x, y in FIX: s = s.replace(x, y)
    return s
LEAD, GAP, TAIL = 0.5, 0.3, 1.6
audio = [np.zeros(int(LEAD * SR), np.float32)]; t = LEAD; sents = []
for s in LINES:
    a, _ = KK.create(say(s), voice="am_michael", speed=1.05, lang="en-us"); a = np.asarray(a, np.float32)
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
