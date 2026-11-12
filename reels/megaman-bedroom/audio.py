"""Bedroom memory-lane sound effects (quiet, leave room for your own song). Synced to the picture:
room tone, TV boot, paper rustle, 8-bit game blips + buster shots, controller clicks, boombox beat, final chime.
Usage: python3 audio.py out.wav [sfx|full] [level 0-1]   ('full' adds a light blip melody bed)"""
import sys, os, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *

DUR = 30
MUS, FX = Track(DUR, 1), Track(DUR, 2)
rs = np.random.default_rng(41)

def reverb(x, secs=1.2, wet=0.15):
    n = int(secs * SR); ir = rs.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / secs); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n; return x + np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)] * wet

# 0-5: room tone, TV boot, paper rustle
n = int(5 * SR); tt = t_axis(n)
FX.put(band(noise(n), lo=80, hi=300) * 0.6 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * tt)), 0, 0.025)
FX.put(slide(200, 2400, 0.7), 0.6, 0.07); FX.put(ding(1200, 0.5), 1.2, 0.05)
FX.put(band(noise(int(0.5 * SR)), lo=1500, hi=6000) * np.exp(-t_axis(int(0.5 * SR)) * 8), 2.5, 0.05)
# 5-10: 8-bit stage: square-wave blips and buster chirps, a Met hit
for k, s in enumerate(np.arange(5.2, 9.8, 0.25)):
    FX.put(pluck(hz(['C', 'E', 'G', 'C'][k % 4], 5 + (k // 4) % 2), 0.12, 0.5), s, 0.06)
for s in np.arange(5.3, 9.8, 0.5): FX.put(chirp(2400, 1600, 0.08), s, 0.035, 0.5)
FX.put(boom(0.3, 120, 0.4), 7.5, 0.1); FX.put(zap(0.2, 1500), 7.5, 0.05)
# 10-15: controller button clicks, a jingle on the high score
for s in np.arange(10.4, 14.5, 0.22): FX.put(hit(0.02, 2000, 8000), s + rs.random() * 0.03, 0.07, rs.random() * 0.4 - 0.2)
for k, f in enumerate([hz('C', 6), hz('E', 6), hz('G', 6)]): FX.put(ding(f, 0.6), 12.6 + k * 0.1, 0.05)
# 15-20: posters, soft shimmer hits on the wall
for s in (15.8, 17.3, 18.9): FX.put(ding(hz('A', 6), 1.0), s, 0.03, 0.3); FX.put(ding(hz('C', 7), 1.0), s + 0.1, 0.02, -0.3)
FX.put(band(noise(int(4 * SR)), lo=100, hi=400) * 0.5, 15.5, 0.015)
# 20-25: boombox beat (120 bpm), a bass riff on the off-beats
for i, s in enumerate(np.arange(20.0, 25.0, 0.5)):
    FX.put(kick(0.35), s, 0.22)
    if i % 2: FX.put(snare(0.18), s, 0.1)
    FX.put(pluck(hz(['A', 'A', 'D', 'G'][(i // 4) % 4], 2), 0.22, 0.3), s + 0.25, 0.05)
# 25-30: pull back, final chime, silence before the end card
FX.put(boom(2.8, 42, 0.7), 26.4, 0.35); FX.put(slide(300, 900, 0.8), 25.8, 0.04)
for k, f in enumerate([hz('C', 6), hz('E', 6), hz('G', 6), hz('C', 7)]): FX.put(ding(f, 1.3), 26.6 + k * 0.1, 0.05)

# optional 'full' bed: a light blip melody under everything
if len(sys.argv) > 2 and sys.argv[2] == 'full':
    for k, s in enumerate(np.arange(0.5, 29, 0.5)): MUS.put(pluck(hz(['C', 'E', 'G', 'A'][k % 4], 5), 0.2, 0.4), s, 0.07)

mus = np.stack([reverb(MUS.L), reverb(MUS.R)], 1); fx = np.stack([reverb(FX.L), reverb(FX.R)], 1)
mode = sys.argv[2] if len(sys.argv) > 2 else 'sfx'; level = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3
out = fx if mode != 'full' else mus * 0.7 + fx
out[int(29.85 * SR):] = 0; k = int(0.25 * SR); out[:k] *= np.linspace(0, 1, k)[:, None]
out = np.tanh(out * 1.2); out *= 0.9 * level / (np.abs(out).max() + 1e-9)
with wave.open(sys.argv[1], 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
