"""30s Dexter's Laboratory memory-lane soundtrack: original retro spy-jazz + sci-fi lab SFX matched to each card.
Usage: python3 audio.py out.wav [full|sfx] [level 0-1]"""
import sys, os, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *

DUR = 30
MUS, FX = Track(DUR, 1), Track(DUR, 2)
rs = np.random.default_rng(9)

def reverb(x, secs=1.8, wet=0.25):
    n = int(secs * SR); ir = rs.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / secs); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n; return x + np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)] * wet

def vibes(f, dur=1.2):
    n = int(dur * SR); t = t_axis(n)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 6)) * np.exp(-t * 3.2) * (1 + 0.25 * np.sin(2 * np.pi * 5.5 * t)) * np.minimum(1, t / 0.003)

def beep(f=1200, dur=0.09, shape=0):
    n = int(dur * SR); t = t_axis(n); s = np.sin(2 * np.pi * f * t) if shape == 0 else np.sign(np.sin(2 * np.pi * f * t)) * 0.6
    return s * np.minimum(1, t / 0.004) * np.clip((dur - t) / 0.01, 0, 1)

def servo(dur=0.8, f0=180, f1=420):
    n = int(dur * SR); t = t_axis(n); f = f0 + (f1 - f0) * (t / dur)
    return np.tanh(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + band(noise(n), lo=800, hi=3000) * 0.2) * np.sin(np.pi * t / dur) ** 0.6

def siren(dur=2.0, lo=700, hi=1200):
    n = int(dur * SR); t = t_axis(n); f = lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * t))
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 * np.minimum(1, t / 0.05) * np.clip((dur - t) / 0.15, 0, 1)

def laugh(t0, gain=0.14):   # "mwa-ha-ha-ha": descending pulses
    for k, (dt, f) in enumerate([(0.0, 190), (0.38, 170), (0.62, 155), (0.86, 140), (1.1, 128)]):
        FX.put(vowel(f, (720, 1150), 0.26 if k else 0.4, 0.08), t0 + dt, gain * (1 - 0.1 * k))

def pad(freqs, t, dur, g): MUS.put(saw_pad(freqs, dur, attack=0.5, release=0.8, bright=1200), t, g)

# ---------------- MUSIC: retro spy-jazz in A minor, swung
B = 60 / 112
Am, Dm, E7, F, C_ = ['A', 'C', 'E'], ['D', 'F', 'A'], ['E', 'G#', 'B'], ['F', 'A', 'C'], ['C', 'E', 'G']
PROG = [Am, Am, Dm, E7]
def walk(t0, t1, gain=0.34):
    t, i = t0, 0
    while t < t1:
        ch = PROG[(i // 4) % 4]; n = [ch[0], ch[1], ch[2], ch[1]][i % 4]
        MUS.put(pluck(hz(n, 2), 0.32, 0.35), t, gain); t += B; i += 1
def brush(t0, t1, g=0.12):
    t, i = t0, 0
    while t < t1:
        MUS.put(hit(0.05, 5000, 12000), t, g * 0.5); MUS.put(hit(0.05, 5000, 12000), t + B * 0.667, g * 0.35)
        if i % 2: MUS.put(snare(0.14), t, g * 0.7)
        t += B; i += 1
SPY = [('A', 4, 2), ('C', 5, 1), ('E', 5, 1), ('D', 5, 2), ('C', 5, 2), ('B', 4, 2), ('A', 4, 1), ('G#', 4, 1), ('A', 4, 4)]
def melody(notes, t0, voice, g, step=B / 2):
    t = t0
    for n, o, l in notes: MUS.put(voice(hz(n, o), l * step + 0.5), t, g); t += l * step
walk(0.2, 29.6); brush(0.2, 25.8)
melody(SPY, 0.4, vibes, 0.2)                       # intro: vibes statement (S1)
for i in range(6): pad([hz(n, 3) for n in PROG[i % 4]], 0.3 + i * 2 * B * 2, 4 * B, 0.12)
melody(SPY, 4.6, lambda f, d: pluck(f, 0.4, 0.4), 0.16); melody(SPY, 4.6 + 9 * B / 2 + 0.2, vibes, 0.15)             # S2 Dexter at desk
for s in np.arange(8.1, 11.6, B / 2): MUS.put(brass(hz(['A', 'C', 'E', 'G'][int((s * 4) % 4)], 4), 0.12, 0.01), s, 0.12)  # S3 frantic stabs
for s in np.arange(12.0, 15.3, 0.66): MUS.put(kick(), s, 0.45); MUS.put(brass(hz('A', 2), 0.45, 0.02), s, 0.28); MUS.put(brass(hz('A', 3), 0.45, 0.02), s, 0.1)    # S4 stomping low brass
melody([('A', 4, 1), ('C', 5, 1), ('E', 5, 2), ('D#', 5, 2), ('E', 5, 4)], 15.6, brass, 0.14)                           # S5 villain motif
for k in range(8): MUS.put(vibes(hz(['A', 'C', 'E', 'G#'][k % 4], 5), 0.8), 15.6 + k * 0.4, 0.07)
melody([('C', 5, 2), ('E', 5, 2), ('G', 5, 2), ('C', 6, 2), ('B', 5, 2), ('G', 5, 2), ('E', 5, 4)], 19.3, lambda f, d: marimba(f, d), 0.22)    # S6 cheerful
for i, ch in enumerate([Am, F, C_, E7, Am, F, Dm, E7]): pad([hz(n, 3) for n in ch], 22.9 + i * 0.9, 1.6, 0.28)       # S7 warm pad
melody([('E', 5, 2), ('A', 5, 2), ('C', 6, 4), ('B', 5, 2), ('G#', 5, 2), ('A', 5, 6)], 23.2, lambda f, d: piano(f, 2.4), 0.14, B / 2 * 1.2)
for k in range(5): MUS.put(vibes(hz(['A', 'C', 'E', 'A', 'C'][k], 6 if k > 2 else 5), 1.4), 25.2 + k * 0.08, 0.06, (k - 2) * 0.3)
for f in [hz('A', 2), hz('A', 3), hz('C', 4), hz('E', 4), hz('A', 4)]: MUS.put(brass(f, 3.3, 0.03), 26.4, 0.08)
MUS.put(saw_pad([hz('A', 3), hz('C', 4), hz('E', 4)], 3.4, attack=0.05, release=2.4, bright=2800), 26.4, 0.4)

# ---------------- SFX per card
# 1 sign: neon buzz + flicker, door-whoosh, footsteps, power-on hum
n = int(4.2 * SR); tt = t_axis(n); FX.put(np.sin(2 * np.pi * 120 * tt) * 0.4 * (1 + 0.5 * (np.sin(2 * np.pi * 47 * tt) > 0.7)), 0.0, 0.04)
for s in (0.2, 0.32, 0.9): FX.put(zap(0.15, 1800), s, 0.1)
FX.put(slide(300, 1400, 0.9), 0.1, 0.08); FX.put(servo(1.0, 120, 260), 1.8, 0.08, 0.5)
for s in np.arange(2.0, 4.2, 0.3): FX.put(hit(0.05, 250, 2500), s, 0.06, rs.random() * 0.4 - 0.2)
# 2 desk: computer beeps, keyboard clacks, glints
for k, s in enumerate(np.arange(4.8, 7.6, 0.16)): FX.put(beep(900 + (k * 173) % 900, 0.06, k % 2), s, 0.07, rs.random() - 0.5)
for s in np.arange(4.7, 7.6, 0.11): FX.put(hit(0.02, 2500, 9000), s, 0.05, rs.random() - 0.5)
FX.put(ding(2093, 1.2), 6.3, 0.1)
# 3 button: wind-up, ballet twirl, BIG press, alarm, sparks, "Dee Dee!" yelp
FX.put(slide(700, 1500, 1.2), 8.1, 0.06); FX.put(hit(0.1, 300, 3000), 9.5, 0.4); FX.put(boom(0.6, 90, 0.6), 9.5, 0.4)
FX.put(siren(2.1, 700, 1200), 9.6, 0.22)
for s in (9.6, 9.9, 10.4, 10.9): FX.put(zap(0.5, 1100), s, 0.2, rs.random() - 0.5)
FX.put(vowel(330, (900, 1700), 0.55, 0.3), 9.7, 0.14)           # Dexter's outburst
FX.put(vowel(420, (800, 2000), 0.4, 0.25), 8.9, 0.1)            # Dee Dee giggle
# 4 robot: servo, stomps, eyes powering up
FX.put(servo(1.3, 100, 400), 12.0, 0.18); FX.put(ding(440, 0.8), 12.4, 0.06)
for s in np.arange(12.5, 15.2, 0.66): FX.put(boom(1.0, 38, 1.0), s, 0.45); FX.put(hit(0.1, 200, 1500), s + 0.02, 0.2)
FX.put(servo(0.9, 420, 160), 14.2, 0.14)
# 5 Mandark: spooky theremin, evil laugh, lightning crackle
n = int(3.0 * SR); tt = t_axis(n); f = 420 + 60 * np.sin(2 * np.pi * 5 * tt) + 80 * tt
FX.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 3.0) ** 2, 15.6, 0.07)
laugh(16.0, 0.16); laugh(17.5, 0.14)
FX.put(zap(0.6, 700), 15.4, 0.2); FX.put(zap(0.5, 900), 18.2, 0.15)
FX.put(vowel(260, (700, 1250), 0.6, 0.35), 17.0, 0.1)           # Dexter's "grr"
# 6 omelette: machine whir, ding, pop, sizzle, happy chime
FX.put(servo(1.0, 160, 300), 19.1, 0.12); FX.put(ding(1568, 0.9), 20.0, 0.12); n = int(0.4 * SR); tt = t_axis(n); FX.put(np.sin(2 * np.pi * (300 + 1400 * tt) * tt) * np.exp(-tt * 7), 20.15, 0.2)
n = int(1.8 * SR); FX.put(band(noise(n), lo=3000, hi=11000) * np.exp(-t_axis(n) * 1.2) * 0.5, 20.2, 0.08)
for k, f in enumerate([1047, 1319, 1568, 2093]): FX.put(ding(f, 0.7), 20.7 + k * 0.1, 0.07)
FX.put(vowel(150, (550, 950), 0.5, 0.06), 21.2, 0.1)            # content "mmm"
# 7 memories: glass-bubble chimes, hum, catwalk steps, title swell
n = int(7.2 * SR); tt = t_axis(n); FX.put(np.sin(2 * np.pi * 60 * tt) * 0.3 + band(noise(n), hi=300) * 0.2, 22.8, 0.06)
for k, s in enumerate(np.arange(23.0, 26.0, 0.37)): FX.put(ding(hz(['E', 'G#', 'B', 'E', 'A', 'C'][k % 6], 6 + (k % 2)), 1.3), s, 0.05, (k % 5 - 2) * 0.3)
for s in np.arange(23.2, 26.2, 0.55): FX.put(hit(0.06, 300, 2200), s, 0.07)
nn = int(0.6 * SR); tt = t_axis(nn); FX.put(band(noise(nn), lo=300, hi=6000) * (tt / 0.6) ** 2, 25.8, 0.14)
FX.put(boom(2.8, 42, 0.7), 26.4, 0.5); FX.put(servo(1.4, 90, 700), 26.2, 0.05)
for k, f in enumerate([hz('A', 7), hz('E', 7), hz('C', 8)]): FX.put(ding(f, 1.3), 28.0 + k * 0.1, 0.05)

mus = np.stack([reverb(MUS.L, 2.0, 0.3), reverb(MUS.R, 2.0, 0.3)], 1); fx = np.stack([reverb(FX.L, 1.0, 0.15), reverb(FX.R, 1.0, 0.15)], 1)
mode = sys.argv[2] if len(sys.argv) > 2 else 'full'      # 'full' = score + SFX, 'sfx' = quiet SFX only (leave room for your own song)
level = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
out = mus * 0.85 + fx * 1.0 if mode == 'full' else fx
out[int(29.85 * SR):] = 0; k = int(0.25 * SR); out[:k] *= np.linspace(0, 1, k)[:, None]
out = np.tanh(out * 1.2); out *= 0.9 * level / np.abs(out).max()
with wave.open(sys.argv[1], 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
