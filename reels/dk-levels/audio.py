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

# 1 (0-5) mine cart: rail clatter, wheel squeal, cave drips, gap jumps with landing clank, cart stomp
def clack(t0, t1, every, g):
    for s_ in np.arange(t0, t1, every): FX.put(hit(0.04, 1500, 6000), s_, g, rs.random() * 0.4 - 0.2); FX.put(hit(0.04, 1500, 6000), s_ + every * 0.5, g * 0.7, rs.random() * 0.4 - 0.2)
air = [(when(0, 12) - 0.47, when(0, 12) + 0.47), (when(0, 28) - 0.47, when(0, 28) + 0.47)]
for a_, b_ in [(0.1, air[0][0]), (air[0][1], air[1][0]), (air[1][1], 5.0)]: clack(a_, b_, 0.16, 0.07)
n = int(5 * SR); tt = t_axis(n); FX.put(band(noise(n), lo=600, hi=3500) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * tt)) * 0.5, 0, 0.04)
FX.put(band(noise(n), hi=150) * 0.6, 0, 0.06)
for s_ in (0.6, 1.7, 3.3, 4.4): FX.put(ding(2600 + rs.random() * 600, 0.4), s_, 0.025, rs.random() - 0.5)
for a_, b_ in air: jump(a_ - 0.05, 0.09); FX.put(slide(1700, 900, 0.5), b_ - 0.1, 0.04); FX.put(boom(0.5, 60, 0.8), b_, 0.22); FX.put(hit(0.12, 800, 5000), b_, 0.12)
stomp(when(0, 22.0) + 0.25); jump(when(0, 22.0) - 0.25, 0.07)
bananas_(0, [2, 4, 9, 11, 12, 13, 18, 27, 28, 29, 34])
# 2 (5-10) bramble flight: dusk wind, parrot wing flaps, sparkle, Zinger buzzes, bananas
wind(5, 5, 0.04)
for s_ in np.arange(5.1, 10.0, 0.39): n = int(0.12 * SR); FX.put(band(noise(n), lo=300, hi=2500) * np.sin(np.pi * t_axis(n) / 0.12), s_, 0.06)
for k, s_ in enumerate(np.arange(5.3, 9.8, 0.55)): FX.put(ding(hz(['E', 'G', 'B', 'D'][k % 4], 6 + (k % 2)), 1.0), s_, 0.02, (k % 5 - 2) * 0.3)
for x in (12, 20, 29, 38): t0 = when(5, x); n = int(1.2 * SR); tt = t_axis(n); FX.put(np.sin(2 * np.pi * (220 + 20 * np.sin(2 * np.pi * 30 * tt)) * tt) * 0.4 * np.sin(np.pi * tt / 1.2), t0 - 0.6, 0.06, 0.4)
FX.put(vowel(520, (900, 2200), 0.3, 0.3), 6.0, 0.05); FX.put(vowel(560, (900, 2200), 0.25, 0.3), 8.4, 0.05)
bananas_(5, [0, 2, 4, 8, 10, 16, 18, 24, 26, 34, 36])
# 3 (10-15) boardwalk: planks, water lap, factory clank, barrel hops
waves(10, 5, 0.09); run_steps(10.2, 15.0, 0.08, 600, 3500)
for s in np.arange(10.5, 15, 0.8): FX.put(hit(0.1, 300, 1800), s, 0.025, 0.5)                                                              # factory clank
jumps(10, [6, 11, 17, 24, 28]); bananas_(10, [1, 3, 8, 9, 14, 20, 21, 22, 31, 33]); FX.put(chirp(3000, 2300, 0.3), 12.0, 0.035, -0.6)
# 4 (15-20) sunset shore: surf, gulls, soft steps in sand, gap leaps, crab clicks
waves(15, 5, 0.12); run_steps(15.2, 20.0, 0.06, 150, 1500); jumps(15, [14.5, 32.5, 5, 24], 0.09)
for s_ in (15.6, 17.2, 18.9): FX.put(chirp(3000, 2300, 0.35), s_, 0.04, rs.random() - 0.5)
for x in (5, 24, 41): t0 = when(15, x); [FX.put(hit(0.03, 2500, 7000), t0 - 0.3 + k * 0.08, 0.04) for k in range(4)]
bananas_(15, [1, 3, 9, 13, 14, 15, 20, 31, 32, 33, 38])
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
