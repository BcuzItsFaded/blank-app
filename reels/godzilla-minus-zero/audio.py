"""Procedural score + SFX for the 60s reel (numpy only). Usage: python3 audio.py out.wav"""
import sys, wave
import numpy as np

SR = 48000
DUR = 60.0
N = int(SR * DUR)
L = np.zeros(N)
Rch = np.zeros(N)
rs = np.random.default_rng(7)


def t_axis(n):
    return np.arange(n) / SR


def band(x, lo=None, hi=None):
    """Zero-phase FFT band filter with soft edges."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def put(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    Rch[i:i + len(sig)] += sig * gain * (1 + min(0, pan))


def env(n, a, d, sustain=1.0, release=None):
    t = t_axis(n)
    e = np.minimum(1, t / max(a, 1e-4))
    if release is None:
        e *= np.exp(-np.maximum(0, t - a) / d)
    else:
        e *= sustain
        e *= np.clip((t[-1] - t) / release, 0, 1)
    return e


def noise(n):
    return rs.standard_normal(n)


def boom(dur=2.2, f0=48, punch=1.0):
    n = int(dur * SR); t = t_axis(n)
    f = f0 * (1 + 1.5 * np.exp(-t * 18))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 2.2)
    s += band(noise(n), hi=180) * np.exp(-t * 6) * 0.6 * punch
    return np.tanh(s * 1.6)


def strings(freqs, dur, attack=1.5, release=1.5, bright=900):
    n = int(dur * SR); t = t_axis(n); s = np.zeros(n)
    for f in freqs:
        for det in (-0.25, 0, 0.3):
            ff = f * 2 ** (det / 12) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + f))
            ph = 2 * np.pi * np.cumsum(ff) / SR
            s += 2 * ((ph / (2 * np.pi)) % 1) - 1  # saw
    s = band(s, lo=60, hi=bright)
    e = np.minimum(1, t / attack) * np.clip((dur - t) / release, 0, 1)
    return s * e / (len(freqs) * 3)


def piano(f, dur=2.5):
    n = int(dur * SR); t = t_axis(n)
    s = sum(np.sin(2 * np.pi * f * k * t) * (0.6 ** (k - 1)) * np.exp(-t * (1.6 + k)) for k in range(1, 6))
    return s * np.minimum(1, t / 0.004)


def roar(dur=2.6, f_hi=210, f_lo=85):
    n = int(dur * SR); t = t_axis(n)
    f = f_hi * (f_lo / f_hi) ** (t / dur) * (1 + 0.04 * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(ph * k + k) / k for k in range(1, 12))
    grit = band(noise(n), lo=300, hi=3500) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    s = np.tanh((tone * 0.8 + grit * 0.7) * 2.5)
    s = band(s, lo=70, hi=4200)
    e = np.minimum(1, t / 0.25) * np.clip((dur - t) / 0.9, 0, 1)
    return s * e


def hit(dur=0.08, lo=1500, hi=6000):
    n = int(dur * SR); t = t_axis(n)
    return band(noise(n), lo=lo, hi=hi) * np.exp(-t * 60)


# ---------------- Scene 1 (0-7): siren, low strings, distant footsteps
n = int(7 * SR); t = t_axis(n)
sf = 520 + 160 * np.sin(2 * np.pi * t / 3.2 - np.pi / 2)
siren = np.sin(2 * np.pi * np.cumsum(sf) / SR) * np.minimum(1, t / 1.0) * np.clip((7 - t) / 1.5, 0, 1)
put(band(siren, lo=300, hi=1400), 0, 0.10, 0.3)
put(strings([55, 110, 130.8, 164.8], 8.0, attack=2.5, release=1.5, bright=600), 0, 0.5)
for s in (1.6, 3.5, 5.4):
    put(boom(2.0, 38, 0.6), s, 0.45)
put(band(noise(int(7 * SR)), hi=200) * 0.08, 0)  # rumble bed

# ---------------- Scene 2 (7-14): gentle piano, hammering, wind
melody = [(7.3, 440), (7.9, 523.3), (8.5, 587.3), (9.3, 659.3), (10.4, 587.3), (11.0, 523.3), (11.6, 440), (12.4, 392), (13.0, 440)]
for st, f in melody:
    put(piano(f, 3.0), st, 0.16, -0.1)
    put(piano(f / 2, 3.0), st, 0.06, 0.1)
for chord_t, ch in ((7.2, [220, 261.6, 329.6]), (10.3, [196, 246.9, 293.7])):
    for f in ch:
        put(piano(f, 3.5), chord_t, 0.05)
k = 0
while True:  # hammer hits when the worker's swing peaks: sin(t*7)=1
    ht = (np.pi / 2 + 2 * np.pi * k) / 7
    k += 1
    if ht > 7.2:
        break
    if ht < 0.1:
        continue
    put(hit(0.12, 800, 4000), 7 + ht - (7 % (2 * np.pi / 7)), 0.13, 0.5)
n = int(7 * SR)
wind = band(noise(n), lo=200, hi=900) * (0.5 + 0.5 * np.sin(2 * np.pi * t_axis(n) / 5))
put(wind * np.clip((7 - t_axis(n)) / 1, 0, 1), 7, 0.035)

# ---------------- Scene 3 (14-21): underwater, wet pulses, smash bass
n = int(7 * SR); t = t_axis(n)
uw = band(noise(n), hi=160) * 0.5 + np.sin(2 * np.pi * 36 * t) * 0.25
put(uw * np.minimum(1, t / 0.8), 14, 0.35)
put(strings([73.4, 77.8], 7.0, attack=3, release=0.2, bright=300), 14, 0.35)
for k in range(40):  # pulses at sin(t*5.2)^8 peaks
    pt = (np.pi / 2 + np.pi * k) / 5.2
    if 14 <= pt < 20.9:
        m = int(0.35 * SR); tt = t_axis(m)
        wet = band(noise(m), lo=80, hi=700) * np.exp(-tt * 14) + np.sin(2 * np.pi * (70 - 40 * tt) * tt) * np.exp(-tt * 10)
        put(wet, pt, 0.18 + 0.25 * (pt - 14) / 7)
put(boom(2.5, 34, 1.2), 20.98, 0.9)

# ---------------- Scene 4 (21-29): ticking clock, heartbeat, violin swell
for s in np.arange(21.3, 29, 1.0):
    put(hit(0.03, 2500, 8000), s, 0.12, 0.4)
for s in np.arange(21.4, 29, 0.86):
    put(boom(0.35, 55, 0.2), s, 0.35)
    put(boom(0.3, 50, 0.2), s + 0.22, 0.25)
n = int(8 * SR); t = t_axis(n)
vf = 659.3 * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t))
vio = sum(np.sin(2 * np.pi * np.cumsum(vf * k) / SR) / k ** 1.3 for k in range(1, 8))
put(band(vio, hi=3000) * (t / 8) ** 2.2 * np.clip((8 - t) / 0.3, 0, 1), 21, 0.12, -0.2)
put(strings([82.4, 87.3], 8, attack=4, release=0.4, bright=400), 21, 0.25)

# ---------------- Scene 5 (29-36): radio chatter, paper, alarm bell, building percussion
n = int(7 * SR); t = t_axis(n)
chat = band(noise(n), lo=500, hi=2600) * (np.sin(2 * np.pi * 3.1 * t) > 0.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
put(chat, 29, 0.05, 0.5)
put(band(noise(int(0.5 * SR)), lo=2000, hi=9000) * env(int(0.5 * SR), 0.05, 0.12), 29.6, 0.05, -0.4)
n = int(2.7 * SR); t = t_axis(n)
bell = (np.sin(2 * np.pi * 880 * t) + 0.7 * np.sin(2 * np.pi * 1320 * t)) * (np.sin(2 * np.pi * 18 * t) > 0) * (np.sin(2 * np.pi * 9 / 2 * t) > -0.2)
put(band(bell, hi=4000) * np.clip((2.7 - t) / 0.3, 0, 1), 33.35, 0.12, 0.3)
beats = np.cumsum(np.linspace(0.62, 0.18, 20)) + 29.5
for b in beats[beats < 36]:
    put(boom(0.6, 70, 0.5), b, 0.35 + 0.3 * (b - 29.5) / 6.5)
put(strings([98, 116.5, 146.8], 7, attack=2, release=0.3, bright=1200), 29, 0.4)

# ---------------- Scene 6 (36-44): rain, footsteps, masonry, roar
put(band(noise(int(16 * SR)), lo=1500, hi=9000) * 0.25, 36, 0.12)
for k in range(6):
    put(boom(2.6, 32, 1.4), 36 + (0.5 + k) / 0.75, 0.9)
for s in np.arange(37.4, 43.5, 0.37):
    m = int(0.25 * SR)
    put(band(noise(m), lo=200, hi=2500) * env(m, 0.005, 0.05), s + rs.random() * 0.2, 0.18, rs.random() - 0.5)
put(roar(2.4), 41.7, 0.55)
put(strings([55, 65.4, 82.4], 8, attack=1, release=0.2, bright=900), 36, 0.45)

# ---------------- Scene 7 (44-52): charge, blast, muffled silence, breaths
n = int(2.8 * SR); t = t_axis(n)
cf = 120 * (16 ** (t / 2.8))
charge = np.sin(2 * np.pi * np.cumsum(cf) / SR) * (t / 2.8) ** 1.5
charge += band(noise(n), lo=3000, hi=9000) * (np.sin(2 * np.pi * 40 * t) > 0.6) * (t / 2.8) * 0.4
put(charge, 44.0, 0.22)
n = int(2.2 * SR); t = t_axis(n)
beam = np.tanh(band(noise(n), lo=200, hi=5000) * 2 + np.sin(2 * np.pi * 95 * t)) * np.clip((2.2 - t) / 0.2, 0, 1)
put(beam, 46.8, 0.35)
put(boom(3.0, 28, 2.0), 46.85, 1.0)
put(roar(1.6, 260, 140), 46.6, 0.35)
n = int(2.4 * SR); t = t_axis(n)
for s in (49.7, 50.6, 51.3):  # trembling breaths
    m = int(0.6 * SR); tt = t_axis(m)
    put(band(noise(m), lo=400, hi=2200) * np.sin(np.pi * tt / 0.6) ** 2 * (1 + 0.3 * np.sin(2 * np.pi * 14 * tt)), s, 0.08)
put(band(noise(int(3 * SR)), hi=120) * 0.3, 49.3, 0.5)  # muffled rumble

# ---------------- Scene 8 (52-60): distant roar, final impact, silence at cut
put(strings([41.2, 61.7, 82.4, 98], 5, attack=1.5, release=1.2, bright=700), 52, 0.5)
put(band(roar(3.2, 180, 70), hi=900), 53.4, 0.45)
put(boom(3.4, 30, 1.6), 56.4, 1.0)
put(strings([55, 82.4, 110, 130.8, 164.8], 3.4, attack=0.02, release=2.6, bright=1600), 56.4, 0.8)

# ---------------- duck + master
mix = np.stack([L, Rch], 1)
mix[int(59.85 * SR):] = 0  # complete silence at the cut
fade = np.ones(N); fade[: int(0.3 * SR)] = np.linspace(0, 1, int(0.3 * SR)); mix *= fade[:, None]
mix[int(49.0 * SR):int(49.4 * SR)] *= 0.08  # brief muffled silence
mix = np.tanh(mix * 1.1)
mix *= 0.89 / np.max(np.abs(mix))
pcm = (mix * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', len(pcm) / SR, 's')
