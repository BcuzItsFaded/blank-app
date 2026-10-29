import json, soundfile as sf, numpy as np, sys
from kokoro_onnx import Kokoro
k = Kokoro("/tmp/claude-0/kokoro/kokoro-v1.0.onnx", "/tmp/claude-0/kokoro/voices-v1.0.bin")
voice = sys.argv[1] if len(sys.argv) > 1 else "am_michael"
lines = json.load(open("/tmp/claude-0/cl/lines.json"))
out = []
for i, (txt, speed) in enumerate(lines):
    s, sr = k.create(txt, voice=voice, speed=speed, lang="en-us")
    sf.write(f"/tmp/claude-0/cl/vo/{i:02d}.wav", s, sr)
    out.append(len(s) / sr)
json.dump(out, open("/tmp/claude-0/cl/vo/durs.json", "w"))
print([round(d, 2) for d in out], round(sum(out), 2))
