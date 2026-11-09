"""30s Memory Lane soundtrack, designed shot-by-shot on the cut's own timeline (matches memory-lane.html cards).
Nostalgic music bed + reverb + SFX per card. Usage: python3 memory_audio.py out.wav"""
import sys, os, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *

DUR = 30
MUS, FX = Track(DUR, 1), Track(DUR, 2)   # music and effects, reverbed separately
rs = np.random.default_rng(11)

def reverb(x, secs=2.2, wet=0.3):
    n = int(secs * SR); ir = rs.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / secs); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n; F = np.fft.rfft(x, m) * np.fft.rfft(ir, m); return x + np.fft.irfft(F, m)[:len(x)] * wet

def shimmer(t, gain=0.05):  # card-in sparkle
    for k, f in enumerate([hz('D', 6), hz('G', 6), hz('B', 6), hz('D', 7)]): FX.put(piano(f, 1.6), t + k * 0.05, gain, (k - 1.5) * 0.4)

def whoosh(t, dur=0.5, gain=0.2, up=True):
    n = int(dur * SR); tt = t_axis(n); e = np.sin(np.pi * tt / dur) ** 2
    s = band(noise(n), lo=400, hi=5000) * e * (tt / dur if up else 1 - tt / dur + 0.2); FX.put(s, t, gain)

def steps(t0, t1, every, gain, lo=200, hi=2500):
    for s in np.arange(t0, t1, every): FX.put(hit(0.05, lo, hi), s + rs.random() * 0.02, gain, rs.random() * 0.4 - 0.2)

def waves(t, dur, gain):
    n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=150, hi=2500) * (0.55 + 0.45 * np.sin(2 * np.pi * tt / 3.2)) ** 2, t, gain)

def wind(t, dur, gain):
    n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=200, hi=900) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 4)) * np.clip(np.minimum(tt, dur - tt) / 0.5, 0, 1), t, gain)

def pika_voice(t, f0=1500, f1=2300, dur=0.3, gain=0.12):
    n = int(dur * SR); tt = t_axis(n); f = f0 + (f1 - f0) * np.sin(np.pi * tt / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR; s = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.sin(np.pi * tt / dur) ** 0.7
    FX.put(s, t, gain)

# ---------------- MUSIC: one nostalgic theme (G major, 96 bpm), building to the title
B = 60 / 96
G, D, Em, C, Am = ['G', 'B', 'D'], ['D', 'F#', 'A'], ['E', 'G', 'B'], ['C', 'E', 'G'], ['A', 'C', 'E']
prog = [G, D, Em, C]
bar = 4 * B
for i in range(int(DUR / bar) + 1):
    t = 0.2 + i * bar; ch = prog[i % 4]
    if t > 29.6: break
    MUS.put(saw_pad([hz(n, 3) for n in ch] + [hz(ch[0], 2)], bar + 0.4, attack=0.6, release=0.6, bright=1400 if t < 19 else 2200), t, 0.22 if t < 11 else 0.3)
    for k in range(8):  # gentle arpeggio
        n = (ch + [ch[0]])[k % 4]; MUS.put(piano(hz(n, 4 if k < 4 else 5), 1.4), t + k * B / 2, 0.06)
theme = [('B', 5, 2), ('A', 5, 1), ('G', 5, 1), ('A', 5, 2), ('D', 5, 2), ('E', 5, 2), ('G', 5, 1), ('A', 5, 1), ('B', 5, 4),
         ('D', 6, 2), ('C', 6, 1), ('B', 5, 1), ('A', 5, 2), ('G', 5, 2), ('A', 5, 3), ('B', 5, 1), ('G', 5, 4)]
def play(notes, t0, voice, gain, step):
    t = t0
    for name, o, l in notes: MUS.put(voice(hz(name, o), l * step + 0.3), t, gain); t += l * step
play(theme, 0.2, lambda f, d: piano(f, 2.2), 0.13, B / 2)            # 0-? soft piano statement
play(theme, 11.4, lambda f, d: piano(f, 2.4), 0.12, B / 2)           # rainbow: piano again, under shimmer
# march energy for regions + championship
for s in np.arange(14.8, 23.7, B):
    i = round((s - 14.8) / B); MUS.put(kick(), s, 0.35 if i % 2 == 0 else 0.0); MUS.put(snare(0.18), s, 0.16 if i % 2 else 0.0)
    MUS.put(hit(0.04, 6000, 12000), s + B / 2, 0.04, 0.3)
play(theme[:9], 14.8, brass, 0.11, B / 2)
play(theme[9:], 19.65, brass, 0.13, B / 2)

# ---------------- EFFECTS per card
# 1 Pallet Town (0-4): morning birds, breeze, running footsteps, card shimmer
for s in (0.5, 1.4, 2.3, 3.1): FX.put(chirp(3300, 2700, 0.1), s, 0.05, 0.6); FX.put(chirp(3600, 3100, 0.08), s + 0.14, 0.04, 0.6)
FX.put(chirp(2600, 2900, 0.16), 2.0, 0.04, -0.6)
wind(0, 4, 0.02); steps(0.3, 4.0, 0.23, 0.07); shimmer(0.6)
# 2 The partner who said no (4-8): ball click + pop, curious "pika?", huff, zap
whoosh(3.85, 0.3, 0.12); FX.put(hit(0.05, 2000, 8000), 4.05, 0.2)
n = int(0.45 * SR); tt = t_axis(n); FX.put(np.sin(2 * np.pi * (500 + 1500 * tt) * tt) * np.exp(-tt * 7), 4.15, 0.22)   # pop
for k in range(5): FX.put(piano(hz(['G', 'B', 'D', 'G', 'B'][k], 6), 0.8), 4.2 + k * 0.04, 0.04)          # sparkle out of the ball
pika_voice(4.6, 1700, 2500, 0.28); pika_voice(5.3, 2200, 1400, 0.35, 0.1)                                # "pika?" then huff
shimmer(4.4, 0.035)
FX.put(chirp(2000, 3200, 0.2), 6.75, 0.06)
FX.put(zap(1.3, 800), 7.0, 0.55); FX.put(zap(0.9, 1200), 7.35, 0.35, 0.3); FX.put(boom(0.7, 80, 0.4), 7.0, 0.3)
# 3 The storm (8-11.4): rain, thunder, Spearow screeches, thunderbolt
n = int(3.6 * SR); FX.put(band(noise(n), lo=1500, hi=9000) * np.clip(np.minimum(t_axis(n), 3.6 - t_axis(n)) / 0.3, 0, 1), 7.9, 0.09)
FX.put(thunder(2.6), 8.9, 0.5)
for s in np.arange(8.1, 10.1, 0.22): FX.put(chirp(2500 + rs.random() * 800, 1300, 0.22), s + rs.random() * 0.08, 0.08, rs.random() * 2 - 1)
FX.put(zap(0.4, 1400), 9.6, 0.25)
FX.put(zap(1.4, 600), 10.1, 0.8); FX.put(thunder(1.6), 10.15, 0.7); FX.put(boom(1.4, 34, 1.4), 10.1, 0.7)
# 4 Under the rainbow (11.4-14.8): calm after the storm, dripping, majestic cry, shimmer trail
for s in np.arange(11.6, 14.4, 0.37): FX.put(piano(hz('E', 7) * (1 + rs.random() * 0.3), 0.3), s, 0.02, rs.random() - 0.5)  # drips
FX.put(chirp(1500, 900, 1.0), 12.2, 0.09, -0.3); FX.put(chirp(1700, 1100, 0.8), 13.6, 0.07, 0.3)
for k in range(18): FX.put(piano(hz(['D', 'G', 'B', 'E'][k % 4], 7), 1.0), 11.8 + k * 0.15, 0.025, (k % 5 - 2) * 0.3)
shimmer(11.6, 0.05); wind(11.4, 3.4, 0.015)
# 5 Region after region (14.8-17.95): whoosh on each cut + biome ambience (forest birds / waves / snow wind)
for c in (14.8, 15.85, 16.9): whoosh(c - 0.25, 0.45, 0.16)
FX.put(chirp(3000, 2500, 0.12), 15.1, 0.04, 0.5); FX.put(chirp(2800, 3200, 0.1), 15.4, 0.04, -0.5)
waves(15.85, 1.05, 0.08); wind(16.9, 1.1, 0.06)
steps(14.8, 17.9, 0.32, 0.05); shimmer(15.0, 0.03)
# 6 Alola Champion (17.95-19.65): waves, crowd cheer, fanfare, confetti pops
waves(17.95, 1.7, 0.06); FX.put(crowd(1.7, 1.0), 17.95, 0.14)
for k, f in enumerate([hz('G', 4), hz('B', 4), hz('D', 5), hz('G', 5)]): MUS.put(brass(f, 1.5, 0.03), 17.95 + k * 0.04, 0.09)
for s in np.arange(18.0, 19.5, 0.12): FX.put(hit(0.03, 1500, 7000), s + rs.random() * 0.05, 0.05, rs.random() * 2 - 1)
pika_voice(18.4, 1800, 2700, 0.35, 0.1)
# 7 World Champion (19.65-23.75): stadium crowd, Charizard roar, charge, final thunderbolt, cheer
FX.put(crowd(4.1, 0.6), 19.65, 0.09)
FX.put(roar(1.6, 240, 120), 19.7, 0.3)
n = int(1.75 * SR); tt = t_axis(n); FX.put(np.sin(2 * np.pi * np.cumsum(140 * 12 ** (tt / 1.75)) / SR) * (tt / 1.75) ** 1.5, 19.65, 0.16)  # charge riser
FX.put(zap(1.7, 1000), 19.7, 0.2, -0.3)
FX.put(zap(2.0, 500), 21.4, 0.9); FX.put(thunder(1.8), 21.45, 0.55); FX.put(boom(2.2, 30, 1.6), 21.4, 0.9)
FX.put(roar(1.2, 200, 70), 22.4, 0.25); FX.put(boom(1.2, 45, 1.0), 22.6, 0.6)    # Charizard falls
FX.put(crowd(1.0, 2.2), 23.0, 0.25)
for k, f in enumerate([hz('G', 4), hz('B', 4), hz('D', 5)]): MUS.put(brass(f, 0.9), 23.1, 0.1)
# 8 Old friends (23.75-25.95): footsteps on dirt, birds, warm piano answer
steps(23.8, 25.9, 0.34, 0.06); FX.put(chirp(3000, 2600, 0.12), 24.3, 0.035, 0.5); FX.put(chirp(3200, 2900, 0.1), 25.1, 0.03, -0.5)
for k, nn in enumerate(['G', 'B', 'D', 'G']): MUS.put(piano(hz(nn, 5), 2.0), 23.9 + k * 0.35, 0.1)
shimmer(24.1, 0.035)
# 9 The road never ends + title (25.95-30): evening wind, swell, big chord at the title, end-card chime, silence
wind(25.95, 3.6, 0.03)
n = int(0.6 * SR); tt = t_axis(n); FX.put(band(noise(n), lo=300, hi=6000) * (tt / 0.6) ** 2, 25.8, 0.15)   # reverse swell into title
for f in [hz('G', 2), hz('G', 3), hz('B', 3), hz('D', 4), hz('G', 4), hz('B', 4)]: MUS.put(brass(f, 3.3, 0.03), 26.4, 0.08)
MUS.put(saw_pad([hz('G', 4), hz('B', 4), hz('D', 5)], 3.3, attack=0.05, release=2.4, bright=3000), 26.4, 0.4)
FX.put(boom(3.0, 40, 0.8), 26.4, 0.55)
for k, f in enumerate([hz('G', 6), hz('D', 7), hz('G', 7)]): FX.put(piano(f, 2.0), 27.6 + k * 0.08, 0.06)    # end card

# ---------------- mix: reverb, balance, master
mus = np.stack([reverb(MUS.L, 2.6, 0.35), reverb(MUS.R, 2.6, 0.35)], 1)
fx = np.stack([reverb(FX.L, 1.4, 0.18), reverb(FX.R, 1.4, 0.18)], 1)
out = mus * 0.8 + fx * 1.0
out[int(29.85 * SR):] = 0; k = int(0.25 * SR); out[:k] *= np.linspace(0, 1, k)[:, None]
out = np.tanh(out * 1.2); out *= 0.9 / np.abs(out).max()
with wave.open(sys.argv[1], 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
