import json, os, wave
import numpy as np
from kokoro_onnx import Kokoro
D = os.path.dirname(os.path.abspath(__file__)); SP = os.path.dirname(D)
KK = Kokoro(f"{SP}/voices/kokoro-v1.0.onnx", f"{SP}/voices/voices-v1.0.bin")
SR = 24000
LINES = [
 "Crystal version. The whole adventure, in one minute.",
 "It starts in New Bark Town. Professor Elm hands you your very first partner.",
 "Then a red haired rival steals one, and the chase begins.",
 "You battle through eight gyms across Johto, badge by badge.",
 "At the Lake of Rage, a red Gary-ah-dose rises. Then Team Rocket takes over the Radio Tower.",
 "All the while, Sweekoon keeps appearing, until you finally face it at the Tin Tower.",
 "Then the Elite Four, and Lance, the dragon master. You are the champion!",
 "But it's not over. A whole second region, and eight more badges.",
 "And at the top of Mount Silver, the final battle. Red.",
 "What was your favorite moment? Comment below, and follow R G Brick and Stick Verse.",
]
LEAD, GAP, TAIL = 0.5, 0.3, 1.6
audio = [np.zeros(int(LEAD * SR), np.float32)]; t = LEAD; sents = []
for s in LINES:
    a, _ = KK.create(s, voice="am_michael", speed=1.05, lang="en-us"); a = np.asarray(a, np.float32)
    nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, nz[0] - 200): nz[-1] + 800]
    d = len(a) / SR; sents.append({"text": s.replace("Sweekoon", "Suicune").replace("Gary-ah-dose", "Gyarados"), "start": round(t, 3), "end": round(t + d, 3)})
    audio += [a, np.zeros(int(GAP * SR), np.float32)]; t += d + GAP
audio.append(np.zeros(int(TAIL * SR), np.float32)); t += TAIL
full = np.concatenate(audio)
with wave.open(f"{D}/narration.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(full, -1, 1) * 32767).astype(np.int16).tobytes())
json.dump({"dur": round(t, 3), "sents": sents}, open(f"{D}/timings.json", "w"), indent=1)
for i, s in enumerate(sents): print(i, s["start"], s["end"], s["text"][:50])
print("total", round(t, 1))
