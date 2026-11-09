"""Original score + SFX for the Ash & Pikachu reel. Usage: python3 audio.py out.wav"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *

T = Track(60)
BEAT = 0.5  # 120 bpm
def chord(names, oct=3): return [hz(n, oct) for n in names]
G, D, Em, C, Am = ['G', 'B', 'D'], ['D', 'F#', 'A'], ['E', 'G', 'B'], ['C', 'E', 'G'], ['A', 'C', 'E']

def drums(t0, t1, gain=1.0, eighths=True):
    t = t0; i = 0
    while t < t1:
        if i % 4 in (0, 2): T.put(kick(), t, 0.5 * gain)
        if i % 4 in (1, 3): T.put(snare(), t, 0.28 * gain)
        if eighths: T.put(hit(0.05, 6000, 12000), t + BEAT / 2, 0.06 * gain, 0.3)
        t += BEAT; i += 1

def melody(notes, t0, voice, gain, step=BEAT / 2):
    t = t0
    for n in notes:
        if n:
            name, octv, length = n
            T.put(voice(hz(name, octv), length * step), t, gain)
            t += length * step
        else:
            t += step

# ---- S1 (0-7): bright chiptune march, birds, running steps
prog = [G, D, Em, C]
for b in range(14):
    ch = prog[(b // 2) % 4]
    T.put(pluck(hz(ch[0], 2), 0.45, 0.5), 0.3 + b * BEAT, 0.35)
    for k, n in enumerate(ch): T.put(pluck(hz(n, 4), 0.25, 0.25), 0.3 + b * BEAT + BEAT / 2, 0.08, (k - 1) * 0.3)
drums(0.3, 7.0, 0.8)
mel1 = [('G', 5, 2), ('B', 5, 1), ('D', 6, 1), ('B', 5, 2), ('A', 5, 2), ('G', 5, 1), ('A', 5, 1), ('B', 5, 2), ('D', 5, 4),
        ('E', 5, 2), ('G', 5, 1), ('A', 5, 1), ('B', 5, 2), ('C', 6, 2), ('B', 5, 2), ('A', 5, 2), ('G', 5, 4)]
melody(mel1, 0.3, lambda f, d: pluck(f, d + 0.1, 0.5), 0.14)
for s in np.arange(0.4, 7, 0.23): T.put(hit(0.04, 300, 2500), s, 0.05, -0.2)
for s in (1.0, 2.6, 4.1, 5.5): T.put(chirp(3200, 2600, 0.12), s, 0.05, 0.6); T.put(chirp(3400, 3000, 0.1), s + 0.18, 0.04, 0.6)

# ---- S2 (7-14): playful pizzicato, ball pop, refusal, zap
for b in range(13):
    ch = [C, G, Am, D][(b // 2) % 4]
    T.put(pluck(hz(ch[0], 2), 0.3, 0.3), 7.1 + b * BEAT, 0.3); T.put(pluck(hz(ch[2], 3), 0.2, 0.3), 7.1 + b * BEAT + BEAT / 2, 0.15)
T.put(hit(0.12, 300, 3000) + 0, 7.7, 0.3)
n = int(0.5 * SR); tt = t_axis(n); T.put(np.sin(2 * np.pi * (400 + 1400 * tt) * tt) * np.exp(-tt * 6), 7.9, 0.25)  # pop
T.put(chirp(1800, 2400, 0.25), 8.3, 0.12)   # "pika?"
T.put(chirp(2200, 1500, 0.3), 9.6, 0.12)    # turns away, huff
T.put(zap(1.8, 700), 11.2, 0.6); T.put(zap(1.2, 1100), 11.9, 0.4, 0.3); T.put(boom(0.8, 70, 0.5), 11.2, 0.4)

# ---- S3 (14-21): storm, Spearow flock, thunderbolt
T.put(band(T.noise(int(7.2 * SR)), lo=1500, hi=9000) * 0.25, 14, 0.4)
T.put(saw_pad(chord(['E', 'G', 'B'], 2), 5.2, attack=1.5, release=0.5, bright=500), 14, 0.5)
for s in (15.2, 17.9): T.put(thunder(3.0), s, 0.55)
R = np.random.default_rng(9)
for s in np.arange(14.3, 19.0, 0.28): T.put(chirp(2400 + R.random() * 900, 1300, 0.2 + R.random() * 0.1), s + R.random() * 0.1, 0.1, R.random() * 2 - 1)
T.put(zap(0.5, 1300), 18.5, 0.3)
T.put(zap(2.0, 600), 19.1, 0.9); T.put(thunder(3.5), 19.15, 0.8); T.put(boom(2.5, 36, 1.5), 19.1, 0.8)

# ---- S4 (21-28): rainbow, warm pad, sparkles, great bird cry
for i, ch in enumerate([G, D, Em, C]):
    T.put(saw_pad(chord(ch, 3) + [hz(ch[0], 2)], 2.2, attack=0.6, release=0.8, bright=1800), 21 + i * 1.75, 0.4)
for k in range(24): T.put(piano(hz(['G', 'B', 'D', 'E'][k % 4], 6), 1.2), 21.3 + k * 0.27, 0.05, (k % 3 - 1) * 0.5)
T.put(chirp(1400, 900, 0.9), 22.5, 0.12); T.put(chirp(1600, 1000, 1.0), 24.8, 0.1)

# ---- S5 (28-36): driving journey march, whooshes on cuts, Alola fanfare
drums(28.0, 36.0, 1.0)
for b in range(16):
    ch = [G, C, D, G, Em, C, D, D][(b // 2) % 8]
    T.put(pluck(hz(ch[0], 2), 0.45, 0.5), 28 + b * BEAT, 0.35)
mel5 = [('D', 5, 2), ('G', 5, 2), ('A', 5, 1), ('B', 5, 1), ('A', 5, 2), ('G', 5, 2), ('E', 5, 2), ('D', 5, 4),
        ('G', 5, 2), ('B', 5, 2), ('C', 6, 1), ('B', 5, 1), ('A', 5, 4), ('A', 5, 2), ('B', 5, 2)]
melody(mel5, 28, brass, 0.16)
for c in range(6):
    n = int(0.35 * SR); tt = t_axis(n); T.put(band(T.noise(n), lo=500, hi=6000) * np.sin(np.pi * tt / 0.35) ** 2, 28 + c * 1.05 - 0.15, 0.18)
for k, f in enumerate(chord(G, 4) + [hz('G', 5)]): T.put(brass(f, 1.6), 34.3, 0.12)
T.put(crowd(1.8), 34.3, 0.15); T.put(kick(), 34.3, 0.6)

# ---- S6 (36-44): championship final
T.put(crowd(8.0, 0.7), 36, 0.12)
for i, f in enumerate([hz('E', 2), hz('C', 2), hz('D', 2), hz('B', 1)]): T.put(brass(f, 1.9, 0.2), 36 + i * 1.25, 0.3); T.put(brass(f * 2, 1.9, 0.2), 36 + i * 1.25, 0.12)
T.put(roar(2.6, 260, 110), 36.2, 0.5); T.put(boom(2.0, 40), 36.2, 0.4)
for k in range(8): T.put(kick(), 39 + k * 0.25, 0.4)
T.put(zap(1.9, 900), 39.05, 0.35); T.put(zap(1.6, 1200), 39.8, 0.3, -0.4)
T.put(zap(2.2, 500), 40.96, 1.0); T.put(thunder(3.0), 41.0, 0.6); T.put(boom(2.8, 32, 1.6), 41.0, 0.9)
T.put(roar(1.4, 200, 80), 42.1, 0.3)
T.put(crowd(1.2, 2.0), 42.9, 0.4)
for k, f in enumerate(chord(G, 4)): T.put(brass(f, 1.1), 42.9, 0.12)

# ---- S7 (44-52): gentle piano, strings
mel7 = [('B', 4, 2), ('D', 5, 2), ('G', 5, 4), ('F#', 5, 2), ('E', 5, 2), ('D', 5, 4), ('C', 5, 2), ('E', 5, 2), ('D', 5, 2), ('B', 4, 2), ('A', 4, 4), ('G', 4, 4)]
melody(mel7, 44.3, lambda f, d: piano(f, 2.0), 0.16, step=0.25)
for i, ch in enumerate([G, Em, C, D]): T.put(saw_pad(chord(ch, 3), 2.2, attack=0.8, release=0.8, bright=1200), 44.1 + i * 2.0, 0.3)
for s in (45.2, 47.6, 50.1): T.put(chirp(3000, 2400, 0.14), s, 0.04, 0.5)

# ---- S8 (52-60): swelling finale, big chord at the title, silence at the cut
for i, ch in enumerate([C, D, Em, C]): T.put(saw_pad(chord(ch, 3) + [hz(ch[0], 2)], 1.3, attack=0.4, release=0.4, bright=2200), 52.1 + i * 1.1, 0.4)
melody([('G', 5, 2), ('A', 5, 2), ('B', 5, 4), ('D', 6, 4), ('C', 6, 2), ('B', 5, 2), ('A', 5, 4)], 52.2, brass, 0.13)
for f in chord(G, 3) + chord(G, 4) + [hz('G', 2)]: T.put(brass(f, 3.4, 0.03), 56.4, 0.09)
T.put(boom(3.0, 40, 0.8), 56.4, 0.7); T.put(saw_pad(chord(G, 4), 3.4, attack=0.05, release=2.5, bright=3000), 56.4, 0.5)
T.save(sys.argv[1] if len(sys.argv) > 1 else 'score.wav', silence_after=59.85)
print('ok')
