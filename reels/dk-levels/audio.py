"""30s Donkey Kong Country level-run sound effects (quiet, leave room for your song). Synced to the runner timeline in scenes.js:
runner x = -6 + 8*(t - level_start); jumps / stomps / bananas are placed from the same x positions.
Usage: python3 audio.py out.wav [sfx|full] [level 0-1]"""
import sys, os, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *

DUR = 30
MUS, FX = Track(DUR, 1), Track(DUR, 2)
rs = np.random.default_rng(21)
SPEED, X0 = 8.0, -6.0
def when(level_start, x): return level_start + (x - X0) / SPEED

def reverb(x, secs=1.3, wet=0.18):
    n = int(secs * SR); ir = rs.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / secs); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n; return x + np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)] * wet

def step(t, g=0.07, lo=200, hi=2200): FX.put(hit(0.05, lo, hi), t, g, rs.random() * 0.4 - 0.2)
def run_steps(t0, t1, g=0.07, lo=200, hi=2200):
    for s in np.arange(t0, t1, 0.26): step(s, g, lo, hi); step(s + 0.13, g * 0.8, lo, hi)
def jump(t, g=0.09): FX.put(boing(380, 0.45), t, g); FX.put(slide(500, 1100, 0.3), t, g * 0.5)
def land(t, g=0.18): FX.put(boom(0.4, 70, 0.6), t, g)
def stomp(t): FX.put(boom(0.35, 90, 0.7), t, 0.22); FX.put(crunch(0.25), t, 0.12); FX.put(ding(880, 0.5), t + 0.05, 0.08); FX.put(vowel(260, (800, 1500), 0.25, 0.2), t + 0.05, 0.05)
def banana(t, g=0.07): FX.put(ding(1319, 0.5), t, g); FX.put(ding(1976, 0.5), t + 0.07, g * 0.8)
def whoosh(t, dur=0.5, gain=0.12): n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=400, hi=5500) * np.sin(np.pi * tt / dur) ** 2, t, gain)
def wind(t0, dur, g): n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=200, hi=1000) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 4)) * np.clip(np.minimum(tt, dur - tt) / 0.5, 0, 1), t0, g)
def waves(t0, dur, g): n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=150, hi=2500) * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 3.0)) ** 2 * np.clip(np.minimum(tt, dur - tt) / 0.4, 0, 1), t0, g)
def jumps(ls, xs, g=0.09):
    for x in xs: jump(when(ls, x) - 0.2, g); land(when(ls, x) + 0.28, g * 1.6)
def bananas_(ls, xs):
    for x in xs: banana(when(ls, x) - 0.1)

# 1 (0-5) jungle: birds, insects, steps, hops over barrels, two Kremling stomps
for s in np.arange(0.3, 4.8, 0.5): FX.put(chirp(2800 + rs.random() * 900, 1800, 0.12), s + rs.random() * 0.3, 0.035, rs.random() * 1.6 - 0.8)
run_steps(0.2, 5.0); wind(0, 5, 0.02); jumps(0, [7.8, 19.4], 0.08); stomp(when(0, 13.2) + 0.1); stomp(when(0, 26.0) + 0.1); jump(when(0, 13.0) - 0.2); land(when(0, 13.0) + 0.1, 0.1); jump(when(0, 25.8) - 0.2)
bananas_(0, [1, 3, 5, 10, 16, 22, 30, 32]); FX.put(vowel(180, (700, 1150), 0.7, 0.25), 4.2, 0.05, 0.6)
# 2 (5-10) galleon: sea, creak, wasp buzz, cannon, steps on planks
waves(5, 5, 0.1); n = int(5 * SR); tt = t_axis(n); FX.put(band(noise(n), lo=80, hi=300) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 2.4)) * 0.4, 5, 0.04)
run_steps(5.2, 10.0, 0.08, 400, 3000)
for x in (8.8, 19.8, 31.8): t0 = when(5, x); n = int(1.4 * SR); tt = t_axis(n); FX.put(np.sin(2 * np.pi * (220 + 20 * np.sin(2 * np.pi * 30 * tt)) * tt) * 0.4 * np.sin(np.pi * tt / 1.4), t0 - 0.7, 0.05, 0.4)   # Zinger buzz
jumps(5, [8.4, 13.2, 19.6, 26.2, 31.6]); stomp(when(5, 13.4) + 0.1); stomp(when(5, 26.4) + 0.1); FX.put(boom(1.4, 60, 1.2), 7.4, 0.3); FX.put(chirp(3200, 2500, 0.3), 6.2, 0.035, -0.6)
bananas_(5, [2, 4, 6, 10, 16, 22, 23, 24, 29])
# 3 (10-15) boardwalk: planks, water lap, factory clank, barrel hops
waves(10, 5, 0.09); run_steps(10.2, 15.0, 0.08, 600, 3500)
for s in np.arange(10.5, 15, 0.8): FX.put(hit(0.1, 300, 1800), s, 0.025, 0.5)                                                              # factory clank
jumps(10, [6, 11, 17, 24, 28]); bananas_(10, [1, 3, 8, 9, 14, 20, 21, 22, 31, 33]); FX.put(chirp(3000, 2300, 0.3), 12.0, 0.035, -0.6)
# 4 (15-20) volcano: rumble, lava bubbling, jumps across lava gaps with a flare whoosh
n = int(5 * SR); tt = t_axis(n); FX.put(band(noise(n), hi=120) * (0.7 + 0.3 * np.sin(2 * np.pi * 2 * tt)) * 0.9, 15, 0.16)
FX.put(band(noise(n), lo=300, hi=1500) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt)) * 0.4, 15, 0.025)
run_steps(15.2, 20.0, 0.08, 150, 1800); jumps(15, [16.1, 32.1, 5.5, 25], 0.1); whoosh(when(15, 16.1) - 0.3, 0.6, 0.1); whoosh(when(15, 32.1) - 0.3, 0.6, 0.1)
for s in (15.8, 17.4, 19.0): FX.put(boom(1.6, 38, 1.2), s, 0.14)
bananas_(15, [2, 4, 9, 15, 16, 17, 22, 31, 32, 33, 38])
# 5 (20-25) ice: wind, crunchy steps, crevasse leaps, walrus bellow, penguin squeaks
wind(20, 5, 0.06); run_steps(20.2, 25.0, 0.07, 800, 5000); jumps(20, [14.2, 30.2, 5, 22.6], 0.1)
for k, s in enumerate(np.arange(20.4, 24.8, 0.45)): FX.put(ding(hz(['E', 'G#', 'B', 'D#'][k % 4], 7), 0.9), s, 0.025, (k % 5 - 2) * 0.3)
for s in (21.5, 22.8, 24.0): FX.put(chirp(2200 + rs.random() * 500, 1100, 0.15), s, 0.05, rs.random() - 0.5)
for s in (22.0, 24.0): FX.put(vowel(75, (400, 800), 0.8, 0.12), s, 0.15)
bananas_(20, [2, 3, 8, 13, 14, 15, 20, 29, 30, 31, 36])
# 6 (25-30) crew: K-O-N-G pings, cheers, banana jingles, swell, end chime
for k, s in enumerate((25.2, 25.5, 25.8, 26.1)): FX.put(ding(hz(['C', 'E', 'G', 'C'][k], 6 + (k // 3)), 1.2), s, 0.14); FX.put(zap(0.2, 1800 + k * 200), s, 0.05); FX.put(boom(0.4, 90, 0.4), s, 0.14)
for s in np.arange(26.2, 29.0, 0.37): banana(s, 0.05)
for k, f in enumerate((150, 130, 160, 120)): FX.put(vowel(f, (650, 1050), 0.4, 0.1), 25.1 + k * 0.4, 0.06)
FX.put(crowd(2.0, 1.0), 25.8, 0.09); nn = int(0.7 * SR); tt = t_axis(nn); FX.put(band(noise(nn), lo=300, hi=6000) * (tt / 0.7) ** 2, 25.9, 0.12)
FX.put(boom(2.8, 42, 0.7), 26.6, 0.5)
for k, f in enumerate([hz('C', 7), hz('G', 7), hz('E', 7), hz('C', 8)]): FX.put(ding(f, 1.4), 28.2 + k * 0.1, 0.05)
# optional light bed
for s in np.arange(0.4, 29, 0.5): MUS.put(pluck(hz(['C', 'G', 'A', 'F'][int(s // 2) % 4], 2), 0.3, 0.3), s, 0.2)
for i in range(30): MUS.put(marimba(hz(['C', 'E', 'G', 'A', 'G', 'E', 'D'][i % 7], 5), 0.5), 1.0 + i * 0.5, 0.12)

mus = np.stack([reverb(MUS.L, 1.8, 0.25), reverb(MUS.R, 1.8, 0.25)], 1); fx = np.stack([reverb(FX.L, 1.0, 0.15), reverb(FX.R, 1.0, 0.15)], 1)
mode = sys.argv[2] if len(sys.argv) > 2 else 'sfx'; level = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3
out = fx if mode == 'sfx' else mus * 0.7 + fx
out[int(29.85 * SR):] = 0; k = int(0.25 * SR); out[:k] *= np.linspace(0, 1, k)[:, None]
out = np.tanh(out * 1.2); out *= 0.9 * level / np.abs(out).max()
with wave.open(sys.argv[1], 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
