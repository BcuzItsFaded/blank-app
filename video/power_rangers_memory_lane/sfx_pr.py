"""Original chiptune battle beat + synced SFX + narration mix -> audio.wav (stereo 44.1k)."""
import json, os, wave
import numpy as np

D = os.path.dirname(os.path.abspath(__file__)); SP = os.path.dirname(D)
# reuse the procedural sound library from the Alien 3 project (everything above the scene cues)
src = open(f"{SP}/sfx.py").read().split("# ---------- scene cues ----------")[0]
exec(src, globals())
TIMP = json.load(open(f"{D}/timings.json")); DUR = TIMP["dur"]; S = [s["start"] for s in TIMP["sents"]]
rng2 = np.random.default_rng(11)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def pulse_note(f, d, duty=0.5, vol=1.0, dec=6.0):
    t = T(d); ph = (t * f) % 1.0; x = np.where(ph < duty, 1.0, -1.0) * vol
    return x * np.minimum(1, t / 0.004) * np.exp(-t * dec)
def tri_note(f, d, vol=1.0):
    t = T(d); x = 2 * np.abs(2 * ((t * f) % 1.0) - 1) - 1
    return x * vol * np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.02)
def kick(): t = T(0.25); return np.sin(2 * np.pi * (140 * np.exp(-t * 22) + 45) * t) * np.exp(-t * 14)
def snare(): t = T(0.2); return (rng2.standard_normal(len(t)) * 0.7 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 22)
def hat(): t = T(0.06); return fft_filter(rng2.standard_normal(len(t)), lo=6000) * np.exp(-t * 60) * 0.5

def chiptune(dur, bpm=152):
    out = np.zeros(int(dur * SR)); q = 60 / bpm; s16 = q / 4
    chords = [(45, [57, 60, 64], [76, 72, 69, 72]), (41, [53, 57, 60], [72, 69, 65, 69]),
              (48, [60, 64, 67], [76, 79, 76, 72]), (43, [55, 59, 62], [74, 71, 67, 71])]
    def put(t0, x, g):
        i = int(t0 * SR)
        if i < 0 or i >= len(out): return
        e = min(len(out), i + len(x)); out[i:e] += x[:e - i] * g
    bars = int(dur / (4 * q)) + 1
    for b in range(bars):
        root, arp, lead = chords[b % 4]; t0 = b * 4 * q
        for k in range(16):  # arpeggio 16ths
            put(t0 + k * s16, pulse_note(midi(arp[[0, 1, 2, 1][k % 4]]), s16 * 1.2, 0.25, 0.5, 9), 0.55)
        for k in range(8):   # bass eighths
            put(t0 + k * q / 2, tri_note(midi(root - (12 if k % 2 else 0)), q / 2 * 0.9, 0.9), 0.9)
        for k in range(4):   # lead
            put(t0 + k * q, pulse_note(midi(lead[k] + (12 if b % 8 >= 4 and k == 3 else 0)), q * 0.95, 0.5, 0.55, 3.5), 0.45)
        for k in range(4):   # drums
            put(t0 + k * q, kick() if k % 2 == 0 else snare(), 0.9 if k % 2 == 0 else 0.5)
            put(t0 + k * q + q / 2, hat(), 0.5)
    return norm(out, 0.9)

def roar(d=1.2, f0=95):
    t = T(d); am = 0.55 + 0.45 * np.sin(2 * np.pi * 26 * t)
    x = fft_filter(rng2.standard_normal(len(t)), lo=120, hi=900) * am + 0.6 * np.sign(np.sin(2 * np.pi * (f0 + 30 * np.sin(t * 9)) * t))
    return norm(fft_filter(x, hi=1800), 0.95) * env(len(t), 0.05, 0.5)
def blips(d, f_hi=1400, f_lo=500, n=None):
    n = n or int(d * 14); out = np.zeros(int(d * SR))
    for k in range(n):
        f = lerp_(f_hi, f_lo, k / max(1, n - 1)); b = pulse_note(f, 0.06, 0.5, 0.6, 14); i = int(k / n * d * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.5)
def lerp_(a, b, u): return a + (b - a) * u
def riser(d):
    t = T(d); f = 200 + 1800 * (t / d) ** 2; ph = 2 * np.pi * np.cumsum(f) / SR
    return norm(np.sign(np.sin(ph)) * 0.5 + fft_filter(rng2.standard_normal(len(t)), lo=2000) * (t / d) * 0.5, 0.8) * (t / d) ** 1.5
def sparkle(d=1.0):
    out = np.zeros(int(d * SR))
    for k, n in enumerate([84, 88, 91, 96]): b = pulse_note(midi(n), 0.25, 0.5, 0.5, 8); i = int(k * 0.07 * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.7)
def whoosh_s(d=0.5): return whoosh(d)


def smack():
    t = T(0.25); return norm(fft_filter(rng2.standard_normal(len(t)), lo=300, hi=4000) * np.exp(-t * 30) + np.sin(2 * np.pi * (110 * np.exp(-t * 20) + 40) * t) * np.exp(-t * 14) * 1.2, 1.0)
def crowdn(d):
    t = T(d); am = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t + 1))
    return norm(fft_filter(rng2.standard_normal(len(t)), lo=350, hi=2600) * am, 0.8) * env(len(t), 0.2, 0.4)
def sadnotes():
    out = np.zeros(int(1.2 * SR))
    for k, n in enumerate([64, 62, 60, 55]): b = tri_note(midi(n), 0.3, 0.8); i = int(k * 0.26 * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.6)
def heartchime():
    out = np.zeros(int(0.8 * SR))
    for k, n in enumerate([76, 83]): b = pulse_note(midi(n), 0.3, 0.5, 0.5, 6); i = int(k * 0.12 * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.6)
def sblip(f=1200): return norm(pulse_note(f, 0.07, 0.5, 0.6, 18), 0.5)
def jingle():
    out = np.zeros(int(1.4 * SR))
    for k, n in enumerate([72, 76, 79, 84, 83, 88]): b = pulse_note(midi(n), 0.22, 0.5, 0.5, 6); i = int(k * 0.14 * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.7)
def fast_steps(d, rate=7):
    out = np.zeros(int(d * SR))
    for k in range(int(d * rate)): b = smack() * 0.25; i = int(k / rate * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.5)
def musicbox():
    out = np.zeros(int(1.6 * SR))
    for k, n in enumerate([84, 88, 91, 88, 84, 79, 84]): b = tri_note(midi(n), 0.4, 0.8) * np.exp(-T(0.4) * 5); i = int(k * 0.2 * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.7)
def babycry(d=1.2):
    t = T(d); f = 650 + 220 * np.sin(2 * np.pi * 2.2 * t) + 140 * np.sin(2 * np.pi * 9 * t) * 0.3 - 120 * t; ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sign(np.sin(ph))) * (0.6 + 0.4 * np.sin(2 * np.pi * 4.4 * t) ** 2)
    return norm(fft_filter(x, lo=250, hi=3200), 0.7) * env(len(t), 0.05, 0.4)


cues = []
add = lambda t, x, g, p=0: cues.append((t, x, g, p))
st = lambda j: (S[j] - 0.15 if j else 0.0)
D_ = lambda j: (S[j + 1] if j + 1 < len(S) else DUR) - S[j]
def hit(t, g=1.0): add(t - 0.06, whoosh_s(0.2), 0.4); add(t, smack(), g)
add(0, chiptune(DUR + 1, 164), 0.30)
add(0.2, fast_steps(1.4, 7), 0.6); add(1.2, whoosh_s(0.6), 0.4); add(2.2, slam(), 0.4); add(3.2, crackle(0.3), 0.5); add(3.2, chime(), 0.6); add(3.3, jingle(), 0.6)
for i, fr in enumerate([0.52, 0.62, 0.71, 0.8, 0.92]): add(st(1) + D_(1) * fr, sblip(int(midi(64 + 2 * i) * 2)), 0.6); add(st(1) + D_(1) * fr, impact(0.25), 0.35)
mT = D_(2) - 1.5
add(st(2) + 0.3, riser(mT - 0.3), 0.5); add(st(2) + mT, boom(), 1.0); add(st(2) + mT, crack(), 0.8); add(st(2) + mT + 0.05, sparkle(), 0.8); add(st(2) + mT + 0.2, crackle(1.0), 0.4)
per = D_(3) / 3
hit(st(3) + per * 0.5); add(st(3), whoosh_s(0.4), 0.6); add(st(3) + per, whoosh_s(0.5), 0.6); hit(st(3) + per * 1.75)
for i in range(3): hit(st(3) + per * 2 + per * (0.3 + i * 0.12), 0.9)
add(st(4) + 0.8, crack(), 0.8); add(st(4) + 1.2, boom(), 1.0); add(st(4) + 1.2, riser(1.5), 0.6); add(st(4) + 1.2, drone(1.8, 36, 300), 0.8); add(st(4) + 2.6, impact(1.0), 0.8)
slT = D_(5) - 1.1
for i in range(6): add(st(5) + 0.3 + i * 0.2, clank(), 0.5); add(st(5) + 0.3 + i * 0.2, whoosh_s(0.25), 0.35)
add(st(5) + 1.45, boom(), 0.9); add(st(5) + 1.45, slam(), 0.7); add(st(5) + 1.9, riser(slT - 1.9), 0.4); add(st(5) + slT, whoosh_s(0.25), 1.0); add(st(5) + slT + 0.18, crack(), 1.0); add(st(5) + slT + 0.2, boom(), 1.0); add(st(5) + slT + 0.2, impact(1.0), 0.9); add(st(5) + slT + 0.3, fire_loop(0.8), 0.6)
flute = np.zeros(int(3.0 * SR))
for k, n in enumerate([76, 79, 81, 79, 76, 74, 76]): b_ = tri_note(midi(n), 0.38, 0.8); i_ = int(k * 0.36 * SR); flute[i_:i_ + len(b_)] += b_[:len(flute) - i_]
add(st(6) + 0.3, norm(flute, 0.7), 0.8); add(st(6), drone(D_(6), 41, 250), 0.5); add(st(6) + 1.2, steam_jet(1.4), 0.4); add(st(6) + 0.2, crack(), 0.4)
add(st(7), crowdn(D_(7)), 0.35); add(st(7) + 0.3, sblip(1200), 0.5); add(st(7) + 0.9, sblip(1500), 0.5); add(st(7) + 1.6, sblip(1800), 0.4); add(st(7) + 2.3, sadnotes(), 0.6)
add(st(8), boom(), 1.0); add(st(8), impact(1.0), 0.8); add(st(8) + 0.2, fire_loop(1.5), 0.5); add(st(8) + 0.3, jingle(), 0.7); add(st(8) + 1.8, chime(), 0.5); add(st(8) + 3.8, chime(), 0.6); add(st(8) + 3.9, sparkle(), 0.5)

def place(buf, t, x, g, pan=0):
    i = int(max(0, t) * SR); x = x[: max(0, buf.shape[1] - i)]; l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[0, i:i + len(x)] += x * g * l * 1.414; buf[1, i:i + len(x)] += x * g * r * 1.414
bed = np.zeros((2, int(DUR * SR)))
for t, x, g, p in cues: place(bed, t, x, g, p)
with wave.open(f"{D}/narration.wav") as w: a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768; sr = w.getframerate()
vo = np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a); vo = vo / (np.max(np.abs(vo)) + 1e-9) * 0.85
vo = np.pad(vo[: bed.shape[1]], (0, max(0, bed.shape[1] - len(vo))))
c = np.cumsum(np.concatenate([[0], np.abs(vo)])); win = int(0.25 * SR); idx = np.arange(len(vo)); sm = (c[np.clip(idx + win // 2, 0, len(vo))] - c[np.clip(idx - win // 2, 0, len(vo))]) / win
duck = 1 - 0.5 * np.clip(sm * 9, 0, 1)
mix = bed * duck * 0.6 + vo[None, :]
fade = np.clip(np.minimum(np.arange(mix.shape[1]), mix.shape[1] - np.arange(mix.shape[1])) / (0.4 * SR), 0, 1); mix *= fade
mix = mix / max(1.0, np.max(np.abs(mix)) / 0.95)
with wave.open(f"{D}/audio.wav", "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1).T * 32767).astype(np.int16).tobytes())
print("audio ok", round(mix.shape[1] / SR, 2), "s")
