"""Original synthesized sound effects for the Alien 3 episode (no samples), mixed onto a timeline."""
import wave

import numpy as np
from scipy.signal import butter, lfilter

SR = 48000
RNG = np.random.default_rng(7)


def _t(d):
    return np.arange(int(d * SR)) / SR


def _noise(d):
    return RNG.uniform(-1, 1, int(d * SR))


def _filt(x, lo=None, hi=None, order=2):
    if lo and hi:
        b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    elif lo:
        b, a = butter(order, lo / (SR / 2), "high")
    else:
        b, a = butter(order, hi / (SR / 2), "low")
    return lfilter(b, a, x)


def _env(n, a=0.005, r=None, d=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if d is not None:
        e *= np.exp(-t / d)
    if r is not None:
        e *= np.clip((n / SR - t) / r, 0, 1)
    return e


def sparks(d=1.5):
    x = np.zeros(int(d * SR))
    for _ in range(int(d * 40)):
        i = RNG.integers(0, len(x) - 2000)
        L = RNG.integers(200, 1800)
        x[i:i + L] += _filt(RNG.uniform(-1, 1, L), lo=2500) * np.exp(-np.arange(L) / (L / 4)) * RNG.uniform(0.3, 1)
    return x * 0.6


def alarm(d=3.0):
    t = _t(d)
    f = np.where((t * 2.5) % 1 < 0.5, 880, 660)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25
    return _filt(x, hi=3000) * _env(len(t), 0.02, 0.2)


def impact(d=2.5):
    t = _t(d)
    body = np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 8)) * t) * np.exp(-t * 2.2)
    crunch = _filt(_noise(d), hi=2500) * np.exp(-t * 6)
    return (body * 1.0 + crunch * 0.7) * _env(len(t), 0.002)


def clang(d=1.8, base=1.0):
    t = _t(d)
    x = sum(a * np.sin(2 * np.pi * f * base * t) * np.exp(-t * k) for f, a, k in
            ((310, 0.5, 2.5), (523, 0.4, 3.0), (811, 0.3, 3.5), (1243, 0.2, 4.5), (1877, 0.12, 6)))
    x += _filt(_noise(d), lo=800) * np.exp(-t * 30) * 0.6
    return x * _env(len(t), 0.001)


def door(d=1.6):
    t = _t(d)
    thud = np.sin(2 * np.pi * 60 * t) * np.exp(-t * 6)
    return thud * 0.9 + clang(d, 0.7) * 0.6


def whoosh(d=2.0, rise=True):
    t = _t(d)
    x = _noise(d)
    out = np.zeros_like(x)
    for i, (lo, hi) in enumerate(((200, 600), (500, 1500), (1200, 3500))):
        out += _filt(x, lo, hi) * (0.6 - i * 0.15)
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** (0.6 if rise else 1.5)
    return out * shape * 1.2


def fire(d=4.0):
    base = _filt(_noise(d), hi=500) * 1.5
    return (base + sparks(d) * 0.5) * _env(int(d * SR), 0.3, 0.6)


def fireball(d=3.0):
    t = _t(d)
    roar = _filt(_noise(d), hi=900) * (1 - np.exp(-t * 4)) * np.exp(-t * 0.6) * 2.0
    return roar + impact(d) * 0.5


def fan(d=4.0):
    t = _t(d)
    hum = np.sin(2 * np.pi * 55 * t) * 0.3
    chop = _filt(_noise(d), 150, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t)) ** 2
    return (hum + chop) * _env(len(t), 0.4, 0.5)


def clippers(d=2.5):
    t = _t(d)
    x = np.sign(np.sin(2 * np.pi * 118 * t)) * 0.15 + np.sin(2 * np.pi * 236 * t) * 0.1
    return _filt(x, hi=2500) * _env(len(t), 0.05, 0.1)


def heartbeat(d=4.0, bpm=62):
    t = _t(d)
    x = np.zeros_like(t)
    beat = 60 / bpm
    for k in range(int(d / beat) + 1):
        for off, a in ((0, 1.0), (0.28, 0.7)):
            t0 = k * beat + off
            m = t >= t0
            tt = t[m] - t0
            x[m] += a * np.sin(2 * np.pi * 50 * tt) * np.exp(-tt * 18)
    return x


def buzz(d=4.0):
    t = _t(d)
    x = sum(np.sin(2 * np.pi * 120 * h * t) / h for h in (1, 2, 3, 5))
    return x * 0.08 * _env(len(t), 0.2, 0.3)


def hiss(d=1.6):
    t = _t(d)
    return _filt(_noise(d), 2500, 7000) * np.sin(np.pi * t / d) ** 0.7 * 1.3


def shriek(d=1.4):
    t = _t(d)
    f0 = 520 + 380 * np.sin(np.pi * t / d) + 25 * np.sin(2 * np.pi * 11 * t)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    x = sum(np.sin(ph * h) / h for h in range(1, 9))
    x = _filt(x, 600, 4500) * 0.6 + hiss(d) * 0.5
    return x * np.sin(np.pi * t / d) ** 0.5


def growl(d=2.0):
    t = _t(d)
    f0 = 70 + 10 * np.sin(2 * np.pi * 3 * t)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    x = sum(np.sin(ph * h) * (1 / h) for h in range(1, 12))
    x *= 1 + 0.6 * np.sin(2 * np.pi * 17 * t)
    return _filt(x, hi=1200) * 0.5 * np.sin(np.pi * t / d)


def gunshot(d=1.0):
    t = _t(d)
    crack = _filt(_noise(d), lo=1500) * np.exp(-t * 60)
    boom = np.sin(2 * np.pi * 80 * t) * np.exp(-t * 14)
    return (crack * 1.2 + boom) * _env(len(t), 0.0005)


def steam(d=3.0):
    return _filt(_noise(d), 1500, 9000) * _env(int(d * SR), 0.05, 0.8) * 1.2


def static(d=2.0):
    x = _filt(_noise(d), 400, 6000)
    gate = (RNG.random(int(d * 30)) > 0.3).repeat(int(SR / 30) + 1)[: len(x)]
    return x * (0.35 + 0.65 * gate) * 0.5


def beeps(d=1.5):
    t = _t(d)
    x = np.zeros_like(t)
    for k in range(int(d * 4)):
        t0 = k * 0.25
        m = (t >= t0) & (t < t0 + 0.08)
        x[m] = np.sin(2 * np.pi * (1200 if k % 2 else 1600) * t[m]) * 0.3
    return x


def crack(d=2.5):
    t = _t(d)
    x = _filt(_noise(d), lo=600) * np.exp(-t * 20) * 1.6 + impact(d) * 0.6
    for _ in range(25):  # falling debris
        i = RNG.integers(int(0.1 * SR), len(x) - 3000)
        c = clang(2000 / SR, RNG.uniform(1.5, 3)) * 0.15
        x[i:i + len(c)] += c
    return x


def footsteps(d=3.0, rate=4.0):
    x = np.zeros(int(d * SR))
    for k in range(int(d * rate)):
        i = int(k / rate * SR)
        s = clang(0.25, 1.8) * 0.25 + np.sin(2 * np.pi * 70 * _t(0.25)) * np.exp(-_t(0.25) * 30) * 0.5
        x[i:i + len(s)] += s[: len(x) - i]
    return x


def chant(d=6.0):
    """Low, wordless male-voice drone (vowel formants over a hummed fifth)."""
    t = _t(d)
    x = np.zeros_like(t)
    for f in (98, 147, 196):
        ph = 2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 4.5 * t)
        x += sum(np.sin(ph * h) / h for h in range(1, 10))
    x = _filt(x, 300, 900) * 0.6 + _filt(x, 2200, 2800) * 0.2
    return x * 0.25 * _env(len(t), 1.2, 1.5)


def pour(d=3.0):
    return _filt(_noise(d), hi=700) * 1.4 * _env(int(d * SR), 0.2, 0.6) + sparks(d) * 0.3


def drip(d=0.6):
    t = _t(d)
    return np.sin(2 * np.pi * (1800 - 900 * t / d) * t) * np.exp(-t * 18) * 0.4


BANK = {name: fn for name, fn in globals().items() if callable(fn) and not name.startswith("_") and name not in
        ("butter", "lfilter")}


def render_track(events, total, path):
    """events: [(abs_time, name, gain, dur or None)]."""
    out = np.zeros(int((total + 3) * SR))
    for t0, name, gain, dur in events:
        fn = BANK[name]
        x = fn(dur) if dur else fn()
        i = int(max(0, t0) * SR)
        n = min(len(x), len(out) - i)
        if n > 0:
            out[i:i + n] += x[:n] * gain
    out = out[: int(total * SR)]
    peak = np.abs(out).max() + 1e-9
    if peak > 0.98:
        out *= 0.98 / peak
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
