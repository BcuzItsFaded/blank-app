"""30s Ed, Edd n Eddy memory-lane soundtrack: original bouncy cartoon score + SFX matched to each title card.
Usage: python3 audio.py out.wav"""
import sys, os, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *

DUR = 30
MUS, FX = Track(DUR, 1), Track(DUR, 2)
rs = np.random.default_rng(5)

def reverb(x, secs=1.6, wet=0.22):
    n = int(secs * SR); ir = rs.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / secs); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n; return x + np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)] * wet

def whoosh(t, dur=0.45, gain=0.16):
    n = int(dur * SR); tt = t_axis(n); FX.put(band(noise(n), lo=400, hi=5500) * np.sin(np.pi * tt / dur) ** 2, t, gain)

def steps(t0, t1, every, gain):
    for s in np.arange(t0, t1, every): FX.put(hit(0.05, 200, 2500), s + rs.random() * 0.02, gain, rs.random() * 0.4 - 0.2)

# ---------------- MUSIC: a bouncy original marimba/pizzicato tune (C major, swung)
B = 60 / 128
def sw(i): return i * B / 2 + (B / 6 if i % 2 else 0)   # swung eighths
def mel(notes, t0, voice, gain):
    t = t0
    for name, o, l in notes:
        if name: MUS.put(voice(hz(name, o), l * B / 2 + 0.2), t, gain)
        t += l * B / 2
def walk_bass(t0, t1, prog, gain=0.3, voice=lambda f: pluck(f, 0.3, 0.3)):
    t, i = t0, 0
    while t < t1:
        ch = prog[(i // 4) % len(prog)]; root = hz(ch[0], 2); fifth = hz(ch[1], 2)
        MUS.put(voice(root if i % 2 == 0 else fifth), t, gain); t += B / 1.0; i += 1
def oompah(t0, t1, prog, gain=0.2):
    t, i = t0, 0
    while t < t1:
        ch = prog[(i // 4) % len(prog)]
        MUS.put(brass(hz(ch[0], 2), 0.22, 0.01), t, gain) if i % 2 == 0 else [MUS.put(brass(hz(n, 3), 0.18, 0.01), t, gain * 0.5) for n in ch]; t += B; i += 1
C_, F_, G_, A_ = ['C', 'G'], ['F', 'C'], ['G', 'D'], ['A', 'E']
HOOK = [('E', 5, 1), ('G', 5, 1), ('C', 6, 2), ('B', 5, 1), ('G', 5, 1), ('A', 5, 2), ('G', 5, 1), ('E', 5, 1), ('F', 5, 1), ('A', 5, 1), ('G', 5, 4)]
# S1 sunny arrival (0-3.6)
walk_bass(0.2, 3.6, [C_, F_, G_, C_]); mel(HOOK, 0.2, lambda f, d: marimba(f, d), 0.2)
for s in np.arange(0.2, 3.6, B): FX.put(kick(), s, 0.12)
# S2 sneaky plan (3.6-7.2): staccato tiptoe, then a "bing!" idea
for i, n in enumerate(['C', 'D#', 'F', 'G', 'F', 'D#', 'C', 'A#'] * 2): MUS.put(pluck(hz(n, 3), 0.15, 0.25), 3.8 + i * 0.2, 0.2)
walk_bass(3.7, 5.5, [['C', 'G']], 0.2)
# S3 scam rush (7.2-11): busy, ends in a slide whistle fall
mel(HOOK, 7.3, lambda f, d: marimba(f, d), 0.2); walk_bass(7.3, 9.1, [C_, F_, G_, C_])
# S4 Ed oom-pah (11-14.4): tuba and chords
oompah(11.0, 14.2, [C_, F_, G_, C_], 0.22)
mel([('G', 5, 1), ('E', 5, 1), ('C', 5, 2), ('G', 5, 1), ('E', 5, 1), ('D', 5, 2), ('E', 5, 1), ('G', 5, 1), ('C', 6, 3)], 11.2, lambda f, d: marimba(f, d), 0.17)
# S5 mad-science sparkle (14.4-17.8): arpeggios + low pulse
for i in range(24): MUS.put(marimba(hz(['C', 'E', 'G', 'B', 'D', 'F#'][i % 6], 5 + (i // 6) % 2), 0.3), 14.5 + i * 0.12, 0.13, (i % 5 - 2) * 0.3)
for s in np.arange(14.4, 17.8, 0.34): MUS.put(kick(), s, 0.22); MUS.put(pluck(hz('C', 2), 0.25, 0.4), s, 0.22)
# S6 chase (17.8-21.2): frantic, fast snares + brass stabs
for s in np.arange(17.8, 21.2, 0.17): FX.put(snare(0.12), s, 0.09, rs.random() * 0.4 - 0.2)
for s in np.arange(17.8, 21.2, 0.34): MUS.put(kick(), s, 0.3)
for i, s in enumerate(np.arange(17.9, 21.0, 0.34)): MUS.put(brass(hz(['C', 'D#', 'G', 'F'][i % 4], 4), 0.18, 0.01), s, 0.18); MUS.put(pluck(hz(['C', 'D#', 'G', 'F'][i % 4], 2), 0.2, 0.3), s, 0.25)
# S7 golden hour (21.2-30): warm piano + pad, gentle theme, swell, title chord
for i, ch in enumerate([['C', 'E', 'G'], ['A', 'C', 'E'], ['F', 'A', 'C'], ['G', 'B', 'D']] * 2):
    MUS.put(saw_pad([hz(n, 3) for n in ch], 3.0, attack=0.7, release=0.9, bright=1300), 21.4 + i * 2.2, 0.26)
mel([('E', 5, 2), ('G', 5, 2), ('A', 5, 4), ('G', 5, 2), ('E', 5, 2), ('D', 5, 4), ('E', 5, 2), ('G', 5, 2), ('C', 6, 6), ('B', 5, 2), ('A', 5, 4), ('G', 5, 6)], 21.6, lambda f, d: piano(f, 2.2), 0.14)
for k in range(5): MUS.put(piano(hz(['C', 'E', 'G', 'B', 'C'][k], 6), 1.2), 25.3 + k * 0.07, 0.04, (k - 2) * 0.3)
for f in [hz('C', 2), hz('C', 3), hz('E', 3), hz('G', 3), hz('C', 4), hz('E', 4)]: MUS.put(brass(f, 3.2, 0.03), 26.2, 0.08)
MUS.put(saw_pad([hz('C', 4), hz('E', 4), hz('G', 4)], 3.4, attack=0.05, release=2.4, bright=3000), 26.2, 0.38)
for k, f in enumerate([hz('C', 7), hz('G', 7), hz('E', 7)]): FX.put(ding(f, 1.3), 27.8 + k * 0.1, 0.06)

# ---------------- SFX per card
# 1 Peach Creek: birds, breeze, footsteps, "pop-in" sparkle
for s in (0.6, 1.5, 2.4): FX.put(chirp(3300, 2700, 0.1), s, 0.05, 0.6); FX.put(chirp(3500, 3000, 0.08), s + 0.14, 0.04, 0.6)
steps(0.4, 3.5, 0.28, 0.07)
# 2 The crew: sneaky giggle motifs, then the idea bulb (ding + boing)
for k in range(3): FX.put(vowel(190 + k * 15, (800, 1300), 0.18, 0.1), 4.6 + k * 0.5, 0.1)
FX.put(boing(480, 0.6), 5.6, 0.18); FX.put(ding(1976, 1.1), 5.65, 0.16); FX.put(ding(2637, 0.9), 5.72, 0.1, 0.4)
FX.put(vowel(260, (900, 1500), 0.5, 0.15), 6.2, 0.12)                 # Eddy's schemer cackle
# 3 The scam: crowd murmur, coin dings, wobble, BOOM, debris, slide-whistle fall, jawbreaker roll
FX.put(crowd(2.0, 0.5), 7.4, 0.07)
for s in (7.6, 8.1, 8.55): FX.put(ding(2300, 0.5), s, 0.1, 0.4)
FX.put(boing(250, 0.7), 8.6, 0.15)
BT = 7.2 + 0.52 * 3.8
FX.put(cartoon_boom(1.8), BT, 0.9)
for k in range(8): FX.put(hit(0.07, 300, 4000), BT + 0.15 + k * 0.1 + rs.random() * 0.05, 0.14, rs.random() * 2 - 1)   # planks clatter
FX.put(slide(1800, 200, 1.0), BT + 0.2, 0.2); FX.put(vowel(300, (800, 1400), 0.7, 0.3), BT + 0.3, 0.14)                 # Eddy's yelp
n = int(1.6 * SR); tt = t_axis(n); FX.put(band(noise(n), hi=400) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt)) * np.minimum(1, tt / 0.1), BT + 0.3, 0.3)   # rolling rumble
# 4 Ed: crunch, happy grunts, gravy glug, toast-stack wobble
for s in (11.5, 12.2, 12.9, 13.5): FX.put(crunch(0.3), s, 0.18, rs.random() - 0.5)
FX.put(vowel(95, (650, 1100), 0.5, 0.1), 11.4, 0.28); FX.put(vowel(90, (600, 1000), 0.6, 0.12), 12.6, 0.28)           # Ed "mmm!"
for k in range(5): n = int(0.12 * SR); tt = t_axis(n); FX.put(np.sin(2 * np.pi * (200 + 60 * k) * tt) * np.exp(-tt * 25), 13.0 + k * 0.09, 0.07)   # glug
for s in (11.3, 12.6): FX.put(boing(180, 0.7), s, 0.14)
# 5 Double D: gears, bubbling, tesla zaps, final soot "poof"
for s in np.arange(14.5, 17.4, 0.11): FX.put(hit(0.03, 1500, 5000), s, 0.045, rs.random() - 0.5)   # gear ticking
n = int(3.2 * SR); FX.put(band(noise(n), lo=300, hi=2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * t_axis(n))) * 0.5, 14.5, 0.04)   # bubbling
FX.put(zap(2.4, 900), 14.4 + 3.4 * 0.35, 0.5); FX.put(zap(1.4, 1300), 16.3, 0.25, 0.3)
FX.put(boom(0.9, 90, 0.5), 17.2, 0.5); FX.put(slide(300, 900, 0.5), 17.15, 0.1); FX.put(vowel(210, (700, 1300), 0.5, 0.25), 17.3, 0.1)   # "poof" + Edd coughs
# 6 The Kankers: stampede, panicked screams, whoosh bys, shout
whoosh(17.65, 0.5, 0.18)
steps(17.9, 21.0, 0.14, 0.09)
for s, f in ((18.3, 330), (19.1, 380), (19.9, 310)): FX.put(vowel(f, (900, 1700), 0.55, 0.3), s, 0.14, rs.random() - 0.5)       # Eds scream
for s, f in ((18.7, 240), (19.5, 270), (20.3, 230)): FX.put(vowel(f, (700, 1200), 0.4, 0.2), s, 0.11, rs.random() - 0.5)       # Kankers shout
for s in (19.0, 20.0, 20.8): FX.put(boing(420, 0.5), s, 0.1)
# 7 The days: cicadas/crickets, breeze, shared-jawbreaker crunch, sigh, title swell + chime
n = int(8.8 * SR); tt = t_axis(n); FX.put(band(noise(n), lo=4200, hi=7000) * (np.sin(2 * np.pi * 14 * tt) > 0.2) * 0.5 * np.clip(tt / 1.5, 0, 1), 21.2, 0.035)   # crickets
FX.put(band(noise(n), lo=200, hi=900) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 4)) * 0.4, 21.2, 0.03)
FX.put(crunch(0.35), 22.9, 0.1); FX.put(crunch(0.3), 23.9, 0.08); FX.put(vowel(120, (500, 900), 0.8, 0.06), 24.6, 0.12)       # contented sigh
nn = int(0.55 * SR); tt = t_axis(nn); FX.put(band(noise(nn), lo=300, hi=6000) * (tt / 0.55) ** 2, 25.6, 0.13)                  # reverse swell into title
FX.put(boom(2.8, 42, 0.7), 26.2, 0.5)

# ---------------- mix
mus = np.stack([reverb(MUS.L, 2.0, 0.28), reverb(MUS.R, 2.0, 0.28)], 1)
fx = np.stack([reverb(FX.L, 1.0, 0.14), reverb(FX.R, 1.0, 0.14)], 1)
out = mus * 0.85 + fx * 1.0
out[int(29.85 * SR):] = 0; k = int(0.25 * SR); out[:k] *= np.linspace(0, 1, k)[:, None]
out = np.tanh(out * 1.2); out *= 0.9 / np.abs(out).max()
with wave.open(sys.argv[1], 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
