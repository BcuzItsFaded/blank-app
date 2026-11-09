"""Procedural audio kit (numpy only) shared by every reel's audio.py."""
import wave
import numpy as np

SR = 48000


class Track:
    def __init__(self, dur, seed=7):
        self.n = int(SR * dur); self.L = np.zeros(self.n); self.R = np.zeros(self.n); self.rs = np.random.default_rng(seed)

    def put(self, sig, start, gain=1.0, pan=0.0):
        i = int(start * SR)
        if i >= self.n: return
        sig = sig[: self.n - i]
        self.L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
        self.R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))

    def noise(self, n): return self.rs.standard_normal(n)

    def save(self, path, silence_after=None, fade_in=0.3):
        mix = np.stack([self.L, self.R], 1)
        if silence_after: mix[int(silence_after * SR):] = 0
        k = int(fade_in * SR); mix[:k] *= np.linspace(0, 1, k)[:, None]
        mix = np.tanh(mix * 1.1); mix *= 0.89 / np.max(np.abs(mix))
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())


def t_axis(n): return np.arange(n) / SR


def band(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a, d):
    t = t_axis(n); return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


_rs = np.random.default_rng(3)
def noise(n): return _rs.standard_normal(n)


def boom(dur=2.2, f0=48, punch=1.0):
    n = int(dur * SR); t = t_axis(n); f = f0 * (1 + 1.5 * np.exp(-t * 18))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) + band(noise(n), hi=180) * np.exp(-t * 6) * 0.6 * punch
    return np.tanh(s * 1.6)


def saw_pad(freqs, dur, attack=1.5, release=1.5, bright=900):
    n = int(dur * SR); t = t_axis(n); s = np.zeros(n)
    for f in freqs:
        for det in (-0.25, 0, 0.3):
            ff = f * 2 ** (det / 12) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + f)); ph = 2 * np.pi * np.cumsum(ff) / SR
            s += 2 * ((ph / (2 * np.pi)) % 1) - 1
    return band(s, lo=60, hi=bright) * np.minimum(1, t / attack) * np.clip((dur - t) / release, 0, 1) / (len(freqs) * 3)


def piano(f, dur=2.5):
    n = int(dur * SR); t = t_axis(n)
    return sum(np.sin(2 * np.pi * f * k * t) * (0.6 ** (k - 1)) * np.exp(-t * (1.6 + k)) for k in range(1, 6)) * np.minimum(1, t / 0.004)


def pluck(f, dur=0.5, bright=0.5):
    """square-ish chiptune pluck"""
    n = int(dur * SR); t = t_axis(n); ph = (f * t) % 1
    return np.where(ph < bright, 1.0, -1.0) * np.exp(-t * 7) * np.minimum(1, t / 0.003) * 0.5


def brass(f, dur, attack=0.06):
    n = int(dur * SR); t = t_axis(n); ff = f * (1 + 0.004 * np.sin(2 * np.pi * 5 * t)); ph = 2 * np.pi * np.cumsum(ff) / SR
    s = sum(np.sin(ph * k) * (0.75 ** k) for k in range(1, 9))
    return band(s, hi=3500) * np.minimum(1, t / attack) * np.clip((dur - t) / 0.08, 0, 1) * 0.4


def hit(dur=0.08, lo=1500, hi=6000):
    n = int(dur * SR); return band(noise(n), lo=lo, hi=hi) * np.exp(-t_axis(n) * 60)


def snare(dur=0.25):
    n = int(dur * SR); t = t_axis(n)
    return band(noise(n), lo=1200, hi=8000) * np.exp(-t * 18) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5


def kick(dur=0.4):
    n = int(dur * SR); t = t_axis(n); f = 50 * (1 + 3 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def zap(dur=0.9, f0=900):
    """electric crackle / thunderbolt"""
    n = int(dur * SR); t = t_axis(n)
    buzz = np.sign(np.sin(2 * np.pi * (f0 * (1 - 0.5 * t / dur)) * t)) * (noise(n) > 0.6)
    crack = band(noise(n), lo=2000, hi=12000) * (np.abs(np.sin(2 * np.pi * 37 * t)) > 0.7)
    return np.tanh((buzz * 0.6 + crack) * 1.5) * np.exp(-t * 2.5) * np.minimum(1, t / 0.01)


def thunder(dur=4.0):
    n = int(dur * SR); t = t_axis(n)
    return np.tanh(band(noise(n), hi=260) * np.exp(-t * 1.1) * (1 + 0.7 * np.sin(2 * np.pi * 3 * t)) * 2.5 + band(noise(n), lo=1500, hi=7000) * np.exp(-t * 18))


def chirp(f0=2600, f1=1500, dur=0.22):
    """bird screech"""
    n = int(dur * SR); t = t_axis(n); f = f0 + (f1 - f0) * t / dur + 200 * np.sin(2 * np.pi * 30 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * band(noise(n), lo=1500, hi=5000)
    return s * np.sin(np.pi * t / dur) ** 0.6


def crowd(dur, swell=1.0):
    n = int(dur * SR); t = t_axis(n)
    return band(noise(n), lo=250, hi=3000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t)) * swell


def roar(dur=2.6, f_hi=210, f_lo=85):
    n = int(dur * SR); t = t_axis(n)
    f = f_hi * (f_lo / f_hi) ** (t / dur) * (1 + 0.04 * np.sin(2 * np.pi * 7 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(ph * k + k) / k for k in range(1, 12)); grit = band(noise(n), lo=300, hi=3500) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    return band(np.tanh((tone * 0.8 + grit * 0.7) * 2.5), lo=70, hi=4200) * np.minimum(1, t / 0.25) * np.clip((dur - t) / 0.9, 0, 1)


NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
def hz(name, octave=4): return NOTE[name] * 2 ** (octave - 4)
