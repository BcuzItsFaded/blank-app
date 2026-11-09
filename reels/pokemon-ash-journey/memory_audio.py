"""30s Memory Lane soundtrack: re-cuts the 60s score/SFX with the same shots as memory-lane.html, adds a title chord.
Usage: python3 memory_audio.py score.wav out.wav"""
import sys, os, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *

SHOTS = [(1.0, 5.0), (8.2, 12.2), (17.0, 20.4), (22.6, 26.0), (28.0, 31.15), (34.3, 36.0), (39.2, 43.3), (44.4, 46.6), (52.0, 56.05)]
w = wave.open(sys.argv[1]); src = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2) / 32768
out = np.zeros((30 * SR, 2)); x = 3600  # 75 ms crossfade
pos = 0
for a, b in SHOTS:
    seg = src[int(a * SR):int(b * SR)].copy(); n = len(seg)
    seg[:x] *= np.linspace(0, 1, x)[:, None]; seg[-x:] *= np.linspace(1, 0, x)[:, None]
    end = min(pos + n, len(out)); out[pos:end] += seg[:end - pos]; pos += n - x // 2
T = Track(30)
for f in [hz('G', 3), hz('B', 3), hz('D', 4), hz('G', 4), hz('G', 2)]: T.put(brass(f, 3.4, 0.03), 26.4, 0.09)
T.put(boom(3.0, 40, 0.8), 26.4, 0.7); T.put(saw_pad([hz('G', 4), hz('B', 4), hz('D', 5)], 3.4, attack=0.05, release=2.5, bright=3000), 26.4, 0.5)
out += np.stack([T.L, T.R], 1) * 0.5
out[int(29.85 * SR):] = 0; out[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]
out *= 0.9 / np.abs(out).max()
with wave.open(sys.argv[2], 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
