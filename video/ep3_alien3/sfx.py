"""Procedural sound design + mix. Writes audio/segNN.wav (stereo 44.1k) matching video segment lengths."""
import json, os, wave
import numpy as np

D = os.path.dirname(os.path.abspath(__file__))
SR = 44100
TIM = json.load(open(f"{D}/timings.json"))
rng = np.random.default_rng(7)
os.makedirs(f"{D}/audio", exist_ok=True)

def T(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def fft_filter(x, lo=None, hi=None):
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); m = np.ones_like(f)
    if hi: m *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: m *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * m, n)
def env(n, a=0.01, r=0.3, d=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)); dur = n / SR
    return e * np.clip((dur - t) / max(r, 1e-4), 0, 1)
def norm(x, p=1.0): m = np.max(np.abs(x)) + 1e-9; return x / m * p

# ---------- sound library ----------
def drone(d, f0=55, bright=400):
    t = T(d); x = sum(np.sin(2 * np.pi * f0 * k * t * (1 + 0.002 * i)) / k for i, k in enumerate([1, 1.5, 2, 3]))
    x *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t)
    x += 0.5 * fft_filter(noise(d), hi=bright)
    return norm(x, 0.5) * env(len(t), 2, 2)
def pad(d, notes, att=3):
    t = T(d); x = np.zeros_like(t)
    for f in notes:
        for det in (-0.4, 0, 0.4):
            ph = 2 * np.pi * (f + det) * t
            x += np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    x = fft_filter(x, hi=1400) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * t))
    return norm(x, 0.5) * env(len(t), att, 3)
def choir(d, notes, att=3):
    t = T(d); x = np.zeros_like(t)
    for f in notes:
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * t + f)
        for det in (-1, 0, 1.2):
            ph = 2 * np.pi * np.cumsum((f + det) * vib) / SR
            x += np.sign(np.sin(ph)) * 0.3 + np.sin(ph)
    x = fft_filter(x, lo=200, hi=1800)  # vowel-ish band
    x += 0.4 * fft_filter(x, lo=500, hi=900)
    return norm(x, 0.45) * env(len(t), att, 3)
def lullaby(d):
    seq = [659, 587, 523, 587, 659, 659, 659, 0, 587, 587, 587, 0, 659, 784, 784, 0]
    out = np.zeros(int(d * SR)); step = 0.55
    for i in range(int(d / step)):
        f = seq[i % len(seq)]
        if not f: continue
        t = T(1.4); n = np.sin(2 * np.pi * f * t) * np.exp(-t * 3) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6)
        s = int(i * step * SR); e = min(len(out), s + len(n)); out[s:e] += n[:e - s]
    return norm(out, 0.35)
def heartbeat(d, bpm=60):
    out = np.zeros(int(d * SR)); per = 60 / bpm
    for k in range(int(d / per) + 1):
        for off, g in ((0, 1), (0.22, 0.7)):
            t = T(0.25); th = np.sin(2 * np.pi * (55 - 30 * t) * t) * np.exp(-t * 18) * g
            s = int((k * per + off) * SR); e = min(len(out), s + len(th))
            if s < len(out): out[s:e] += th[:e - s]
    return norm(out, 0.9)
def impact(big=1.0):
    t = T(3.0); boom = np.sin(2 * np.pi * (70 * np.exp(-t * 1.5) + 25) * t) * np.exp(-t * 1.6)
    crunch = fft_filter(noise(3.0), hi=3000) * np.exp(-t * 4)
    return norm(boom * 1.2 + crunch * 0.6 * big, 1)
def boom(): t = T(3.5); return norm(np.sin(2 * np.pi * (45 * np.exp(-t * 0.5) + 10) * t) * np.exp(-t * 1.2), 1)
def whoosh(d=1.5, up=True):
    n = noise(d); t = T(d); e = np.sin(np.pi * t / d) ** 2
    return norm(fft_filter(n, lo=150, hi=2500) * e, 0.9)
def fire_loop(d):
    t = T(d); x = fft_filter(noise(d), hi=900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t))
    pops = np.zeros(len(t)); idx = rng.integers(0, len(t), int(d * 14)); pops[idx] = rng.uniform(0.3, 1, len(idx))
    pops = fft_filter(pops, lo=800, hi=5000)
    return norm(norm(x, 0.7) + norm(pops, 0.5), 0.8) * env(len(t), 0.5, 0.8)
def crackle(d):
    t = T(d); c = np.zeros(len(t)); idx = rng.integers(0, len(t), int(d * 60)); c[idx] = rng.uniform(-1, 1, len(idx))
    c = fft_filter(c, lo=1500, hi=9000); bz = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.15 * (rng.random(len(t)) > 0.3)
    return norm(c + fft_filter(bz, hi=3000), 0.8) * env(len(t), 0.02, 0.2)
def alarm(d):
    t = T(d); f = np.where((t % 1.0) < 0.5, 740, 560); ph = 2 * np.pi * np.cumsum(f) / SR
    return norm(fft_filter(np.sign(np.sin(ph)), hi=2500), 0.45) * env(len(t), 0.05, 0.3)
def hiss(d): return norm(fft_filter(noise(d), lo=3000, hi=12000), 0.6) * env(int(d * SR), 0.1, 0.6)
def steam_jet(d): return norm(fft_filter(noise(d), lo=1200, hi=9000), 0.8) * env(int(d * SR), 0.05, 1.2)
def breath(d):
    t = T(d); e = np.maximum(0, np.sin(2 * np.pi * 0.45 * t)) ** 2
    return norm(fft_filter(noise(d), lo=200, hi=1600) * e, 0.7) * env(len(t), 0.3, 0.5)
def screech(d=1.2):
    t = T(d); f = 1800 + 900 * np.sin(2 * np.pi * 3 * t) - 700 * t / d; ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph + 3 * np.sin(2 * np.pi * 230 * t)) + 0.5 * fft_filter(noise(d), lo=2000, hi=7000)
    return norm(x, 0.6) * env(len(t), 0.03, 0.5)
def slam():
    t = T(2.0); x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dcy) for f, dcy in ((97, 3), (213, 5), (377, 6), (612, 9), (1043, 12)))
    x += fft_filter(noise(2.0), hi=2000) * np.exp(-t * 25) * 3
    return norm(x, 1)
def clank(): t = T(0.8); return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 9) for f in (523, 1187, 1873, 2531)) + fft_filter(noise(0.8), lo=1000) * np.exp(-t * 40), 0.7)
def clipper(d): t = T(d); x = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.4 + 0.3 * fft_filter(noise(d), lo=2000, hi=6000); return norm(fft_filter(x, hi=4000), 0.5) * env(len(t), 0.05, 0.1)
def fluoro(d): t = T(d); x = np.sin(2 * np.pi * 120 * t) + 0.4 * np.sin(2 * np.pi * 240 * t) + 0.2 * np.sin(2 * np.pi * 360 * t); return norm(x, 0.25) * env(len(t), 0.5, 0.5)
def fan_loop(d, rate=7): t = T(d); return norm(fft_filter(noise(d), lo=80, hi=900) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t) ** 2), 0.7) * env(len(t), 0.5, 0.5)
def steps(d, rate=2.2, metal=True):
    out = np.zeros(int(d * SR))
    for k in range(int(d * rate)):
        t = T(0.3); s = fft_filter(noise(0.3), lo=150, hi=2500) * np.exp(-t * 30)
        if metal: s += 0.3 * np.sin(2 * np.pi * 900 * t) * np.exp(-t * 20)
        i = int((k / rate + rng.uniform(0, 0.03)) * SR); e = min(len(out), i + len(s)); out[i:e] += s[:e - i] * rng.uniform(0.6, 1)
    return norm(out, 0.6)
def scrape(d): t = T(d); return norm(fft_filter(noise(d), lo=1500, hi=6000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 9 * t))), 0.5) * env(len(t), 0.05, 0.2)
def beeps(d, rate=6):
    out = np.zeros(int(d * SR))
    for k in range(int(d * rate)):
        f = rng.choice([880, 1320, 1760, 990]); t = T(0.07); b = np.sin(2 * np.pi * f * t) * env(len(t), 0.003, 0.02)
        i = int(k / rate * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.3)
def static(d): return norm(fft_filter(noise(d), lo=800, hi=5000) * (0.6 + 0.4 * (rng.random(int(d * SR)) > 0.97)), 0.35) * env(int(d * SR), 0.05, 0.3)
def chime(): t = T(1.5); return norm((np.sin(2 * np.pi * 1046 * t) + np.sin(2 * np.pi * 1568 * t * (t > 0.18))) * np.exp(-t * 3), 0.4)
def pulse(d, bpm=100):
    out = np.zeros(int(d * SR)); per = 60 / bpm
    for k in range(int(d / per)):
        t = T(0.4); s = np.sin(2 * np.pi * (60 * np.exp(-t * 6) + 40) * t) * np.exp(-t * 9)
        if k % 2: s += 0.3 * fft_filter(noise(0.4), lo=3000) * np.exp(-t * 30)
        i = int(k * per * SR); e = min(len(out), i + len(s)); out[i:e] += s[:e - i]
    return norm(out, 0.7) * env(len(out), 1, 1)
def ultrasound(d): t = T(d); return norm(np.sin(2 * np.pi * 2200 * t) * (np.sin(2 * np.pi * 1.2 * t) > 0.97), 0.2)
def pour(d): t = T(d); return norm(fft_filter(noise(d), lo=60, hi=700) + 0.5 * np.sin(2 * np.pi * 50 * t), 0.8) * env(len(t), 0.4, 1)
def gun(): t = T(0.6); return norm(fft_filter(noise(0.6), hi=5000) * np.exp(-t * 18) + np.sin(2 * np.pi * 80 * t) * np.exp(-t * 12), 1)
def crack(): t = T(2.5); return norm(fft_filter(noise(2.5), lo=500) * np.exp(-t * 6) + np.sin(2 * np.pi * (60 * np.exp(-t * 2) + 20) * t) * np.exp(-t * 1.5), 1)
def sting(d=1.2): t = T(d); return norm(fft_filter(noise(d), lo=300, hi=6000) * (t / d) ** 3, 0.8)  # reverse swell
def drips(d):
    out = np.zeros(int(d * SR))
    for k in range(int(d * 1.3)):
        f = rng.uniform(900, 1800); t = T(0.2); s = np.sin(2 * np.pi * f * (1 + 2 * t) * t) * np.exp(-t * 30)
        i = int(rng.uniform(0, d - 0.3) * SR); out[i:i + len(s)] += s
    return norm(out, 0.4)
def chains_s(d):
    out = np.zeros(int(d * SR))
    for k in range(int(d * 3)):
        s = clank() * rng.uniform(0.2, 0.6); i = int(rng.uniform(0, d - 0.9) * SR); out[i:i + len(s)] += s
    return norm(out, 0.5)

# ---------- scene cues ----------
A_MIN = [55, 65.4, 82.4]; D_MIN = [73.4, 87.3, 110]; E_MIN = [82.4, 98, 123.5]; C_MIN = [65.4, 77.8, 98]
def cues(i, S, dur):
    c = []  # (time, sound array, gain, pan)
    add = lambda t, x, g, p=0: c.append((t, x, g, p))
    if i == 0:
        add(0, drone(dur, 41, 300), 0.35); add(0.3, lullaby(S[3] - 0.5), 0.35)
        add(S[3] - 0.4, pad(dur - S[3], [55, 58.3, 82.4]), 0.25)
        add(S[3] + 0.5, alarm(S[6] - S[3] - 1.5), 0.25, -0.3); add(S[4] - 0.35, crackle(S[5] - S[4]), 0.5, 0.2); add(S[4] - 0.35, fire_loop(S[5] - S[4]), 0.35)
        imp = S[6] - 0.35 - 0.6; add(S[5] - 0.35, whoosh(imp - S[5] + 0.35), 0.5); add(S[5] - 0.35, drone(imp - S[5] + 0.35, 30, 200), 0.5)
        add(imp, impact(), 0.9); add(S[6] + 1.5, fire_loop(S[7] - S[6]), 0.25); add(S[7] - 0.35, heartbeat(dur - S[7], 52), 0.35)
    if i == 1:
        add(0, fluoro(S[5]), 0.4); add(0, pad(dur, D_MIN), 0.2); add(S[3] - 0.35, heartbeat(S[5] - S[3], 72), 0.45)
        add(S[4] - 0.4, sting(0.8), 0.3); add(S[5], beeps(S[7] - S[5] - 0.6), 0.3); add(S[6] - 0.1, chime(), 0.4)
        add(S[7] - 0.6, whoosh(1.4), 0.6); add(S[7] - 0.2, fire_loop(dur - S[7]), 0.45); add(S[7], choir(dur - S[7], [146.8, 174.6, 220]), 0.25)
    if i == 2:
        add(0, drone(dur, 36.7, 500), 0.4); add(0.5, slam(), 0.5, -0.4); add(S[2] - 0.35, choir(S[3] - S[2] + 0.5, [110, 130.8, 164.8]), 0.3)
        add(S[2] - 0.3, slam(), 0.35, 0.4); mid = S[3] - 0.35 + (S[4] - S[3]) * 0.5; add(mid, clipper(S[4] - 0.35 - mid), 0.5)
        add(S[3] - 0.35, steps(2.5, 2), 0.35); add(S[4] - 0.35 + 1.2, slam(), 0.7); add(S[5], pad(dur - S[5], E_MIN), 0.25)
    if i == 3:
        add(0, choir(S[1] + 0.5, [110, 138.6, 164.8]), 0.3); add(0, fire_loop(S[1]), 0.2); add(S[1] - 0.35, drone(dur - S[1], 32, 250), 0.45)
        add(S[1] - 0.35 + 0.62 * (S[2] - S[1]), screech(0.9), 0.45); add(S[2] - 0.35, scrape(S[4] - S[2]), 0.35); add(S[2] - 0.35, pulse(S[4] - S[2], 120), 0.35)
        add(S[3] + 0.6, screech(1.2), 0.35, 0.3); add(S[4] - 0.35 + 0.4 * (S[5] - S[4]), whoosh(0.7), 0.6); add(S[4], breath(S[5] - S[4]), 0.35, -0.4)
        add(S[5] - 0.35, fan_loop(S[6] - S[5]), 0.5); add(S[5] - 0.35 + 0.82 * (S[6] - S[5]), sting(0.5), 0.6); add(S[5] - 0.35 + 0.86 * (S[6] - S[5]), screech(1.0), 0.6)
        add(S[6], breath(dur - S[6]), 0.3, 0.5)
    if i == 4:
        add(0, drone(dur, 41, 400), 0.35); add(0, steps(S[1], 1.6), 0.35); add(0.3, chains_s(S[1]), 0.4, 0.3)
        add(S[1] - 0.35, pulse(S[2] - S[1], 130), 0.35); add(S[1] + 2.5, slam(), 0.35); add(S[2] - 0.35, crackle(1.0), 0.4); add(S[2] + 1.5, crackle(0.6), 0.4)
        add(S[3] - 0.35, beeps(S[5] - S[3]), 0.4); add(S[3] - 0.35, static(S[7] - S[3]), 0.12); add(S[4], sting(0.9), 0.3); add(S[5] - 0.2, chime(), 0.4)
        add(S[5], pad(dur - S[5], A_MIN), 0.25)
    if i == 5:
        add(0, drone(dur, 36.7, 300), 0.4); add(0, drips(S[2]), 0.4); s0 = S[1] - 0.35
        add(0.55 * s0, screech(1.3), 0.6); add(0.6 * s0, impact(0.4), 0.45); add(S[1] - 0.35, breath(S[2] - S[1]), 0.25)
        add(S[2] - 0.35, pad(S[3] - S[2], D_MIN), 0.2); sh3 = S[3] - 0.35; d3 = S[4] - S[3]
        add(sh3, fluoro(d3), 0.3); add(sh3 + 0.4 * d3, breath(0.25 * d3), 0.4); add(sh3 + 0.62 * d3, screech(0.8), 0.55); add(sh3 + 0.66 * d3, clank(), 0.6); add(sh3 + 0.7 * d3, slam(), 0.4)
        add(S[4] - 0.35, heartbeat(S[6] - S[4], 66), 0.5); add(S[4] - 0.35, breath(S[6] - S[4]), 0.45, 0.4)
        sh7 = S[7] - 0.35; d7 = dur - sh7; add(sh7, steps(d7 * 0.35, 4), 0.4); add(sh7 + 0.6 * d7, crack(), 0.5); add(sh7 + 0.6 * d7, screech(0.9), 0.45)
    if i == 6:
        add(0, drone(dur, 41, 400), 0.35); add(0, pad(S[4], C_MIN), 0.2); add(S[5] - 0.35, scrape(S[6] - S[5]), 0.18); add(S[5] - 0.35, fan_loop(S[6] - S[5], 0.5), 0.25)
        add(S[6] - 0.35, crackle(1.5), 0.4); add(S[6] - 0.35 + 0.6 * (S[7] - S[6]) - 0.3, sting(0.6), 0.4)
        add(S[7] - 0.6, whoosh(2.0), 0.9); add(S[7] - 0.35, impact(0.6), 0.6); add(S[7] - 0.35, fire_loop(dur - S[7]), 0.7)
    if i == 7:
        add(0, heartbeat(dur, 58), 0.35); add(0, pad(dur, [55, 65.4, 77.8]), 0.18); add(S[1] - 0.35, ultrasound(S[2] - S[1]), 0.3)
        add(S[1] - 0.35 + 2.6, boom(), 0.9); add(S[2] - 0.35, breath(S[5] - S[2]), 0.2); add(S[5] - 0.35, beeps(S[8] - S[5], 2), 0.25)
    if i == 8:
        add(0, static(S[1]), 0.4); add(0.3, chime(), 0.5); add(0, drone(dur, 32.7, 300), 0.4)
        add(S[1] - 0.35, pad(S[3] - S[1], E_MIN), 0.2); add(S[3] - 0.35, steps(S[4] - S[3], 2), 0.3)
        add(S[4] - 0.35, choir(dur - S[4], [98, 116.5, 146.8]), 0.3); add(S[4] - 0.35, fire_loop(dur - S[4]), 0.2)
    if i == 9:
        add(0, drone(dur, 36.7, 500), 0.35); add(0.5, slam(), 0.3); add(1.8, clank(), 0.35, 0.4)
        add(S[1] - 0.35, pulse(dur - S[1], 110), 0.35); d1 = S[4] - S[1]; u0 = S[2] - S[1]
        for dv in (0.18, 0.38, 0.58, 0.78): add(S[1] - 0.35 + u0 + (d1 - u0 - 0.5) * (dv + 0.05), slam(), 0.3)
        add(S[4] - 0.35, steps(S[6] - S[4], 6), 0.4); add(S[4] - 0.35 + 1.0, slam(), 0.5); add(S[6] - 0.35, steps(dur - S[6], 5), 0.35)
    if i == 10:
        add(0, pulse(S[4], 140), 0.4); add(0, steps(S[2], 7), 0.4); add(0, alarm(S[2] - 0.35), 0.15); add(0.5, crackle(1.5), 0.3); s0 = S[2] - 0.35
        add(0.56 * s0, screech(1.0), 0.6); add(1.2, screech(0.8), 0.3, 0.4)
        add(S[2] - 0.35, drone(S[4] - S[2], 41, 400), 0.35); add(S[4] - 0.35, pour(S[5] - S[4] + 1), 0.6); add(S[4] - 0.35, fire_loop(S[7] - S[4]), 0.35)
        add(S[4] - 0.35, choir(S[5] - S[4] + 1, [110, 130.8, 164.8, 220]), 0.3)
        add(S[6] - 0.85, impact(0.5), 0.7); add(S[6] - 0.5, screech(1.4), 0.6); add(S[6] + 0.6, steps(S[7] - S[6], 6), 0.35)
        add(S[7] - 0.35, steam_jet(S[8] - S[7] + 1.5), 0.45); add(S[7] + 1.0, screech(1.2), 0.4); add(S[8] - 0.1, crack(), 1.0); add(S[8] + 0.5, hiss(dur - S[8]), 0.25)
    if i == 11:
        add(0, pad(dur - 2.5, [55, 65.4, 82.4, 110]), 0.25); add(0, steps(S[2], 3), 0.35); s4 = S[4] - 0.35; d4 = S[5] - S[4]
        for p in (0.5, 0.56, 0.62): add(s4 + p * d4, gun(), 0.7)
        add(S[5] - 0.35, heartbeat(S[7] - S[5], 50), 0.45); add(S[5] - 0.35, fire_loop(S[7] - S[5]), 0.45)
        add(S[6] - 0.35, choir(S[7] - S[6] + 1.5, [110, 138.6, 164.8, 220]), 0.45); add(S[7] - 0.6, whoosh(1.2), 0.5)
    return c

def place(buf, t, x, g, pan):
    i = int(max(0, t) * SR); x = x[: max(0, buf.shape[1] - i)]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[0, i:i + len(x)] += x * g * l * 1.414; buf[1, i:i + len(x)] += x * g * r * 1.414

def read_wav(p):
    with wave.open(p) as w: a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768; sr = w.getframerate()
    return np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a)

def write(p, buf):
    buf = np.clip(buf, -1, 1)
    with wave.open(p, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((buf.T * 32767).astype(np.int16).tobytes())

def smooth(x, win):
    c = np.cumsum(np.concatenate([[0], x])); h = win // 2
    i = np.arange(len(x)); lo = np.clip(i - h, 0, len(x)); hi = np.clip(i + h, 0, len(x))
    return (c[hi] - c[lo]) / np.maximum(hi - lo, 1)

INTRO, OUTRO = 5, 7
for seg in range(14):
    if seg == 0:
        dur = INTRO; buf = np.zeros((2, int(dur * SR)))
        place(buf, 0, drone(dur, 41, 300), 0.4, 0); place(buf, 0.2, sting(1.0), 0.5, 0); place(buf, 1.2, boom(), 0.8, 0); place(buf, 1.2, choir(dur - 1.2, [110, 130.8, 164.8]), 0.25, 0)
    elif seg == 13:
        dur = OUTRO; buf = np.zeros((2, int(dur * SR)))
        place(buf, 0.6, boom(), 0.7, 0); place(buf, 0.6, choir(dur - 0.6, [110, 138.6, 164.8, 220]), 0.3, 0); place(buf, 0.6, pad(dur - 0.6, [55, 82.4]), 0.25, 0)
    else:
        sc = seg - 1; dur = TIM[sc]['dur']; S = [s['start'] for s in TIM[sc]['sents']]
        bed = np.zeros((2, int(dur * SR)))
        for t, x, g, p in cues(sc, S, dur): place(bed, t, x, g, p)
        vo = read_wav(f"{D}/tts/scene{sc+1:02d}.wav"); vo = vo / (np.max(np.abs(vo)) + 1e-9) * 0.82
        vo = vo[: bed.shape[1]]; vo = np.pad(vo, (0, bed.shape[1] - len(vo)))
        duck = 1 - 0.45 * np.clip(smooth(np.abs(vo), int(0.3 * SR)) * 8, 0, 1)
        bed *= duck * 0.55
        buf = bed + vo[None, :]
        fade = np.clip(np.minimum(np.arange(buf.shape[1]), buf.shape[1] - np.arange(buf.shape[1])) / (0.4 * SR), 0, 1); buf *= fade
    pk = np.max(np.abs(buf)); buf = buf / pk * 0.95 if pk > 0.95 else buf
    write(f"{D}/audio/seg{seg:02d}.wav", buf); print(seg, round(buf.shape[1] / SR, 2), round(float(pk), 2), flush=True)
