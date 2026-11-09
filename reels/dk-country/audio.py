"""30s Donkey Kong Country memory-lane sound effects, quiet by default (leave room for your own song).
Usage: python3 audio.py out.wav [sfx|full] [level 0-1]   ('full' adds a light marimba bed)"""
import sys, os, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *

DUR = 30
MUS, FX = Track(DUR, 1), Track(DUR, 2)
rs = np.random.default_rng(13)

def reverb(x, secs=1.4, wet=0.2):
    n = int(secs * SR); ir = rs.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / secs); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n; return x + np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)] * wet

def whoosh(t, dur=0.5, gain=0.14): n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=400, hi=5500) * np.sin(np.pi * tt / dur) ** 2, t, gain)
def thud(t, g=0.4, f0=45): FX.put(boom(0.7, f0, 0.8), t, g)
def banana(t, g=0.08): FX.put(ding(1319, 0.5), t, g); FX.put(ding(1976, 0.5), t + 0.07, g * 0.8)
def birds(t0, t1, g=0.04):
    for s in np.arange(t0, t1, 0.35 + rs.random() * 0.3): FX.put(chirp(2800 + rs.random() * 900, 1800, 0.12), s, g, rs.random() * 1.6 - 0.8)
def wind(t0, dur, g): n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=200, hi=1000) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 4)) * np.clip(np.minimum(tt, dur - tt) / 0.5, 0, 1), t0, g)
def waves(t0, dur, g): n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=150, hi=2500) * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 3.0)) ** 2 * np.clip(np.minimum(tt, dur - tt) / 0.4, 0, 1), t0, g)
def grunt(t, f=110, g=0.12, dur=0.5): FX.put(vowel(f, (650, 1050), dur, 0.1), t, g)
def clack(t0, t1, every, g):
    for s in np.arange(t0, t1, every): FX.put(hit(0.04, 1500, 6000), s, g, rs.random() * 0.4 - 0.2); FX.put(hit(0.04, 1500, 6000), s + every * 0.5, g * 0.7, rs.random() * 0.4 - 0.2)

# 1 (0-4.2) jungle: birds, insects, Rambi's gallop, barrel rattle, bananas
birds(0.2, 4.0); wind(0, 4.2, 0.02)
for s in np.arange(0.4, 4.2, 0.22): thud(s, 0.28, 55)
clack(0.2, 4.2, 0.18, 0.04); FX.put(slide(500, 1500, 0.8), 0.1, 0.05)
for s in (1.0, 2.0, 3.1): banana(s)
FX.put(vowel(180, (700, 1150), 0.7, 0.25), 3.0, 0.07, 0.6)                 # K. Rool's villain laugh, distant
# 2 (4.2-8.4) pirate galleon: sea, creaking wood, flag flap, cannon, splash for the leaping swordfish
waves(4.2, 4.2, 0.1); n = int(4.2 * SR); tt = t_axis(n); FX.put(band(noise(n), lo=80, hi=300) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 2.4)) * 0.4, 4.2, 0.04)   # hull creak
for s in (4.9, 6.2, 7.5): FX.put(slide(180, 110, 0.5), s, 0.05)
for s in np.arange(4.5, 8.3, 0.45): FX.put(hit(0.06, 600, 3000), s, 0.03, rs.random() - 0.5)                                                                 # flag flutter
FX.put(chirp(3200, 2500, 0.3), 5.0, 0.04, -0.6); FX.put(chirp(3000, 2300, 0.3), 5.8, 0.035, 0.6)                                                             # gulls
FX.put(boom(1.4, 60, 1.2), 6.4, 0.5); FX.put(hit(0.2, 200, 3000), 6.41, 0.25)                                                                                  # cannon
n = int(0.7 * SR); FX.put(band(noise(n), lo=500, hi=8000) * np.exp(-t_axis(n) * 5), 6.0, 0.12); whoosh(5.6, 0.5, 0.1)                                          # splash + swordfish leap
for k, s in enumerate((7.0, 7.4, 7.8)): banana(s, 0.06)
# 3 (8.4-12.6) lakeside mine cart: rail clacks, rattling cart, water spray, whoosh by
clack(8.5, 12.4, 0.16, 0.07); n = int(4.0 * SR); tt = t_axis(n); FX.put(band(noise(n), lo=600, hi=3500) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * tt)) * 0.5, 8.5, 0.05)     # cart rattle
waves(8.4, 4.2, 0.07); whoosh(10.6, 0.7, 0.12); FX.put(boing(300, 0.5), 10.0, 0.06)
for s in (9.4, 10.8, 11.6): banana(s, 0.07)
FX.put(vowel(420, (850, 1700), 0.35, 0.2), 9.0, 0.06); FX.put(vowel(300, (750, 1300), 0.4, 0.15), 11.2, 0.06)    # Dixie / Kiddy cheers
# 4 (12.6-16.8) volcano: low rumble, DK's chest-drum, tiki drums, ember crackle
n = int(4.2 * SR); tt = t_axis(n); FX.put(band(noise(n), hi=120) * (0.7 + 0.3 * np.sin(2 * np.pi * 2 * tt)) * 0.9, 12.6, 0.18)
for k, s in enumerate(np.arange(13.35, 16.6, 0.285)): thud(s, 0.45 if k % 2 == 0 else 0.35, 70 if k % 2 == 0 else 85)                                   # chest beating
for s in (12.8, 14.0, 15.2): FX.put(boom(1.6, 38, 1.2), s, 0.18)
for s in np.arange(12.7, 16.7, 0.09): FX.put(hit(0.02, 3000, 9000), s, 0.03, rs.random() - 0.5)
grunt(13.0, 100, 0.12, 0.6); FX.put(roar(1.3, 160, 70), 14.4, 0.12)
# 5 (16.8-21) ice: wind, crystal chimes, penguin squeaks, walrus bellow, ice crunch
wind(16.8, 4.2, 0.06)
for k, s in enumerate(np.arange(17.0, 20.8, 0.33)): FX.put(ding(hz(['E', 'G#', 'B', 'D#'][k % 4], 7), 0.9), s, 0.03, (k % 5 - 2) * 0.3)
for s in (17.5, 18.1, 19.6): FX.put(chirp(2200 + rs.random() * 500, 1100, 0.15), s, 0.06, rs.random() - 0.5)
for s in (18.4, 19.9): FX.put(vowel(75, (400, 800), 0.8, 0.12), s, 0.16)                                                                                  # walrus roar
for s in (17.2, 18.9, 20.3): FX.put(crunch(0.3), s, 0.08)
FX.put(slide(300, 1600, 0.6), 19.0, 0.06)                                                                                                                  # Dixie's helicopter spin
# 6 (21-30) finale: K-O-N-G letter pings, banana jingles, cheers, big end chime, title swell
for k, s in enumerate((21.7, 22.25, 22.8, 23.35)): FX.put(ding(hz(['C', 'E', 'G', 'C'][k], 6 + (k // 3)), 1.2), s, 0.14); FX.put(zap(0.2, 1800 + k * 200), s, 0.05); boom_ = FX.put(boom(0.4, 90, 0.4), s, 0.16)
for s in np.arange(24.0, 26.0, 0.31): banana(s, 0.05)
for k, f in enumerate((150, 130, 160, 120, 145)): grunt(21.6 + k * 0.45, f, 0.06, 0.4)
FX.put(crowd(2.4, 1.0), 23.8, 0.1)
nn = int(0.7 * SR); tt = t_axis(nn); FX.put(band(noise(nn), lo=300, hi=6000) * (tt / 0.7) ** 2, 25.7, 0.12)
FX.put(boom(2.8, 42, 0.7), 26.4, 0.5)
for k, f in enumerate([hz('C', 7), hz('G', 7), hz('E', 7), hz('C', 8)]): FX.put(ding(f, 1.4), 28.0 + k * 0.1, 0.05)
# optional light bed for 'full'
for i in range(14): MUS.put(marimba(hz(['C', 'E', 'G', 'A', 'G', 'E', 'D'][i % 7], 5), 0.5), 21.8 + i * 0.5, 0.14)
for s in np.arange(0.4, 29, 0.5): MUS.put(pluck(hz(['C', 'G', 'A', 'F'][int(s // 2) % 4], 2), 0.3, 0.3), s, 0.2)

mus = np.stack([reverb(MUS.L, 1.8, 0.25), reverb(MUS.R, 1.8, 0.25)], 1); fx = np.stack([reverb(FX.L, 1.0, 0.15), reverb(FX.R, 1.0, 0.15)], 1)
mode = sys.argv[2] if len(sys.argv) > 2 else 'sfx'; level = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3
out = fx if mode == 'sfx' else mus * 0.7 + fx
out[int(29.85 * SR):] = 0; k = int(0.25 * SR); out[:k] *= np.linspace(0, 1, k)[:, None]
out = np.tanh(out * 1.2); out *= 0.9 * level / np.abs(out).max()
with wave.open(sys.argv[1], 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
