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


def chiptune2(dur, bpm=112):
    out = np.zeros(int(dur * SR)); q = 60 / bpm; s8 = q / 2
    chords = [(48, [60, 64, 67], [79, 76, 72, 76]), (43, [59, 62, 67], [79, 74, 71, 74]), (45, [57, 60, 64], [76, 72, 69, 72]), (41, [60, 65, 69], [77, 72, 69, 72])]
    def put(t0, x, g):
        i = int(t0 * SR)
        if i < 0 or i >= len(out): return
        e = min(len(out), i + len(x)); out[i:e] += x[:e - i] * g
    for b in range(int(dur / (4 * q)) + 1):
        root, arp, lead = chords[b % 4]; t0 = b * 4 * q
        for k in range(8): put(t0 + k * s8, pulse_note(midi(arp[[0, 1, 2, 1][k % 4]]), s8 * 1.3, 0.25, 0.5, 7), 0.5)
        for k in range(4): put(t0 + k * q, tri_note(midi(root - (12 if k % 2 else 0)), q * 0.9, 0.9), 0.9)
        for k in range(4): put(t0 + k * q, pulse_note(midi(lead[k]), q * 0.9, 0.5, 0.5, 3.0), 0.4)
        for k in (0, 2): put(t0 + k * q, kick(), 0.7)
        for k in range(8): put(t0 + k * s8, hat(), 0.25)
    return norm(out, 0.9)
def pika(d=0.6):
    out = np.zeros(int(d * SR))
    for k, (f0, f1, dd) in enumerate([(900, 1500, 0.13), (1100, 2000, 0.17)]):
        t = T(dd); f = f0 + (f1 - f0) * (t / dd); ph = 2 * np.pi * np.cumsum(f * (1 + 0.02 * np.sin(2 * np.pi * 28 * t))) / SR
        x = (np.sign(np.sin(ph)) * 0.6 + np.sin(ph)) * env(len(t), 0.005, 0.05); i = int((k * 0.17) * SR); out[i:i + len(x)] += x[:len(out) - i]
    return norm(fft_filter(out, hi=5000), 0.7)
def zapbuzz(d=0.7):
    t = T(d); x = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.4 + fft_filter(rng2.standard_normal(len(t)), lo=1500, hi=9000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 45 * t)))
    return norm(x, 0.9) * env(len(t), 0.01, 0.15)
def sadnotes():
    out = np.zeros(int(1.2 * SR))
    for k, n in enumerate([64, 62, 60, 55]): b = tri_note(midi(n), 0.3, 0.8); i = int(k * 0.26 * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.6)
def boing():
    t = T(0.5); f = 300 + 500 * np.sin(2 * np.pi * 7 * t) * np.exp(-t * 5) + 250; ph = 2 * np.pi * np.cumsum(f) / SR; return np.sin(ph) * np.exp(-t * 5) * 0.8
def heartchime():
    out = np.zeros(int(0.8 * SR))
    for k, n in enumerate([76, 83]): b = pulse_note(midi(n), 0.3, 0.5, 0.5, 6); i = int(k * 0.12 * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.6)
def pitter(d, rate=7):
    out = np.zeros(int(d * SR))
    for k in range(int(d * rate)):
        b = pulse_note(900 + 300 * (k % 2), 0.04, 0.3, 0.5, 40); i = int(k / rate * SR); out[i:i + len(b)] += b[:len(out) - i]
    return norm(out, 0.25)

def sblip(fr=1200): return norm(pulse_note(fr, 0.07, 0.5, 0.6, 18), 0.5)
cues = []
add = lambda t, x, g, p=0: cues.append((t, x, g, p))
st = lambda j: (S[j] - 0.15 if j else 0.0)
D_ = lambda j: (S[j + 1] if j + 1 < len(S) else DUR) - S[j]
add(0, chiptune2(DUR + 1, 120), 0.30)
add(0.1, whoosh_s(0.6), 0.5); add(0.4, sparkle(), 0.6); add(1.0, chime(), 0.5)
add(st(1) + 0.2, impact(0.3), 0.4); add(st(1) + 0.2, chime(), 0.6); add(st(1) + 1.2, sparkle(), 0.5); add(st(1) + 0.8, steam_jet(2.5), 0.12)
d = D_(2); add(st(2) + 0.2, sadnotes(), 0.0); add(st(2) + 0.2, pitter(0.5 * d, 10), 0.5)
for i in range(int(d * 2)): add(st(2) + 0.3 + i * 0.5, sblip(1600), 0.15)
add(st(2) + 0.5 * d, whoosh_s(0.5), 0.6); add(st(2) + 0.62 * d, chime(), 0.8); add(st(2) + 0.62 * d, sparkle(), 0.8); add(st(2) + 0.72 * d, fire_loop(0.6), 0.7); add(st(2) + 0.78 * d, impact(0.5), 0.6); add(st(2) + 0.85 * d, heartchime(), 0.6)
for i in range(6): add(st(3) + 0.4 + i * 0.45, heartchime(), 0.45); add(st(3) + 0.4 + i * 0.45, boing(), 0.25)
add(st(4) + 0.2, impact(0.4), 0.5); add(st(4) + 1.2, whoosh_s(0.8), 0.6); add(st(4) + 1.2, steam_jet(0.8), 0.5); add(st(4) + 2.0, impact(0.8), 0.8); add(st(4) + 2.0, crack(), 0.5); add(st(4) + 2.2, blips(0.8, 1400, 400), 0.5)
d = D_(5); add(st(5), drone(d, 36, 300), 0.8); add(st(5) + 0.3, riser(1.7), 0.5); add(st(5) + 0.3, fire_loop(d - 0.3), 0.3); add(st(5) + 0.3, steam_jet(d - 0.3), 0.3); add(st(5) + 1.8, boom(), 0.9); add(st(5) + 2.4, crack(), 0.6)
d = D_(6); add(st(6), steam_jet(d), 0.25); t0 = 0.45 * d
for i in range(3): add(st(6) + t0 + i * 0.4, impact(0.3), 0.6); add(st(6) + t0 + i * 0.4, sblip(900 - i * 150), 0.5)
add(st(6) + t0 + 1.4, sadnotes(), 0.6)
add(st(7) + 0.2, sparkle(), 0.5); add(st(7) + 1.2, chime(), 0.5); add(st(7) + 3.0, chime(), 0.6); add(st(7) + 3.1, sparkle(), 0.5)

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
