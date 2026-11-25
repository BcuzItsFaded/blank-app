# narration + pencil foley (graphite, waxy hatching, reversed sounds for inversion) + acoustic score by section -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 125.6; N = int(DUR * SR); R = np.random.default_rng(2020); S.seed(20)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def nz(n): return R.standard_normal(n)
def pink(n):
    w = np.fft.rfft(nz(n)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
def st(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4); return np.stack([x * l * 1.414, x * r * 1.414], 1)
def tt(d): return np.arange(int(d * SR)) / SR
def env(n, a, r): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
def dbfs(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
IRn = int(.9 * SR); IR = np.stack([nz(IRn), nz(IRn)], 1) * np.exp(-np.arange(IRn) / SR * 6)[:, None]; IR = np.stack([lp(IR[:, 0], 4200), lp(IR[:, 1], 4200)], 1); IR /= np.sqrt((IR ** 2).sum(0))
def verb(x2, wet=.2):
    y = np.stack([fftconvolve(x2[:, 0], IR[:, 0])[:len(x2)], fftconvolve(x2[:, 1], IR[:, 1])[:len(x2)]], 1); return x2 * (1 - wet) + y * wet
FX = np.zeros((N, 2))
def put(buf, t, x):
    i = int(t * SR); j = min(N, i + len(x))
    if 0 <= i < N and j > i: buf[i:j] += x[:j - i]

# ---------------- foley ----------------
def sweep(f0, f1, d, curve=1.0): t = tt(d); f = f0 + (f1 - f0) * (t / d) ** curve; return np.sin(2 * np.pi * np.cumsum(f) / SR)
def slidewhistle(f0, f1, d, vib=0): t = tt(d); f = f0 * (f1 / f0) ** (t / d) * (1 + vib * np.sin(2 * np.pi * 6 * t)); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .15 * np.sin(4 * np.pi * np.cumsum(f) / SR); return norm(x * np.minimum(1, t / .03) * np.minimum(1, (d - t) / .06))
def boing(f=210, d=.6, depth=.35): t = tt(d); f_ = f * (1 + depth * np.sin(2 * np.pi * 13 * t) * np.exp(-t * 4)); ph = 2 * np.pi * np.cumsum(f_) / SR; return norm((np.sin(ph) + .4 * np.sin(2 * ph) + .2 * np.sin(3 * ph)) * np.exp(-t * 4.5))
def woodblock(f=2400, d=.09): t = tt(d); return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / .018) + .5 * np.sin(2 * np.pi * f * 1.52 * t) * np.exp(-t / .01) + hp(nz(len(t)), 2000) * env(len(t), .0015, .01) * .4)
def hiss(d, g=1.0): n = int(d * SR); t = np.arange(n) / SR; x = hp(nz(n), 2500) * np.minimum(1, t / .05) * np.minimum(1, (d - t) / .2) * (.7 + .3 * np.sin(2 * np.pi * 9 * t)); return norm(x, .5) * g
def bell_ring(d): out = np.zeros(int(d * SR) + int(.3 * SR)); [out.__setitem__(slice(int(k / 18 * SR), int(k / 18 * SR) + int(.3 * SR)), out[int(k / 18 * SR):int(k / 18 * SR) + int(.3 * SR)] + sum(np.sin(2 * np.pi * f * tt(.3) + R.random() * 6) * np.exp(-tt(.3) / tau) for f, tau in [(2100 + (k % 2) * 180, .06), (3350, .04), (5200, .025)])) for k in range(int(d * 18))]; return norm(out)
def china(d=.8): out = np.zeros(int(d * SR) + int(.3 * SR)); [put_into(out, int((k / 14) ** 1.3 * d * .8 * SR), norm(sum(np.sin(2 * np.pi * f * tt(.25) * (.8 + R.random() * .6)) * np.exp(-tt(.25) / tau) for f, tau in [(2750, .07), (4180, .05), (6320, .03)])) * (.4 + R.random() * .6)) for k in range(14)]; return norm(out)
def put_into(buf, i, x):
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i]
def rubber_creak(d, f0=90, f1=260): t = tt(d); f = f0 * (f1 / f0) ** (t / d); saw = 2 * ((np.cumsum(f) / SR) % 1) - 1; return norm(bp(saw, 300, 2500) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 17 * t))) * np.sin(np.pi * t / d) ** .5)
def thud(f=70, d=.5): t = tt(d); return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + .8 * np.exp(-t * 25))) / SR) * np.exp(-t * 9) + lp(nz(len(t)), 600) * env(len(t), .001, .05) * .4)
def clink(d=.4): t = tt(d); return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, tau in [(3100, .06), (4700, .04), (1900, .08)]))
def step(d=.12): n = int(d * SR); return norm(lp(nz(n), 600) * env(n, .002, .04) + hp(nz(n), 2500) * env(n, .001, .01) * .3)
def gasp(d=.4): n = int(d * SR); t = np.arange(n) / SR; return norm(bp(nz(n), 600, 3200) * np.sin(np.pi * t / d) ** 1.5)
def ratchet(d): n = int(d * SR); t = np.arange(n) / SR; clk = (np.sin(2 * np.pi * (14 + 30 * t / d) * t) > .6).astype(float); return norm(hp(nz(n), 1500) * lp(clk, 400) * .8 + np.sin(2 * np.pi * 900 * t) * lp(clk, 300) * .2)
def swish(d, g=.5, rev=False): n = int(d * SR); p = np.arange(n) / n; return norm(bp(pink(n), 300, 5000) * (p if rev else (1 - p)) ** 1.5, .5) * g


def sweep_noise(d, g=.5, lo=300, hi=4500, rev=False): n = int(d * SR); p = np.arange(n) / n; return norm(bp(pink(n), lo, hi) * np.sin(np.pi * p) ** .8 * (.7 + .3 * np.abs(np.sin(np.arange(n) / SR * 25))), .5) * g
def wetdab(d=.12): n = int(d * SR); return norm(bp(nz(n), 400, 2500) * env(n, .003, .03) + lp(nz(n), 300) * env(n, .002, .05) * .4)
def pluck(f, d=.8): t = tt(d); return norm(sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (3 + k)) for k in (1, 2, 3, 4)))
def rain(d): n = int(d * SR); x = hp(nz(n), 1500) * .5 + bp(nz(n), 3000, 9000) * .3; return norm(x, .5) * np.minimum(1, np.minimum(np.arange(n) / (.6 * SR), (n - np.arange(n)) / (.6 * SR)))[:, None] if False else norm(x, .5)
def birds(): out = np.zeros(int(2.4 * SR)); [put_into(out, int((k * .4 + R.random() * .2) * SR), np.sin(2 * np.pi * np.cumsum(R.uniform(2800, 4600) * (1 + .3 * np.sin(2 * np.pi * 30 * tt(.09)))) / SR) * np.sin(np.pi * tt(.09) / .09) ** 2 * .5) for k in range(5)]; return out
def heartbeat(): return thud(48, .5) + np.pad(thud(44, .5), (int(.28 * SR), 0))[:int(.5 * SR)] * .7

def sweep_noise(d, g=.5, lo=300, hi=4500): n = int(d * SR); p = np.arange(n) / n; return norm(bp(pink(n), lo, hi) * np.sin(np.pi * p) ** .8, .5) * g
def pluck(f, d=.8): t = tt(d); return norm(sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (3 + k)) for k in (1, 2, 3, 4)))
def heartbeat(): return thud(48, .5) + np.pad(thud(44, .5), (int(.28 * SR), 0))[:int(.5 * SR)] * .7
def flap(d=.35): n = int(d * SR); return norm(bp(nz(n), 700, 3500) * env(n, .003, .06), .5)
def fwoomp(d=.6): n = int(d * SR); t = np.arange(n) / SR; return norm(lp(nz(n), 500) * env(n, .02, .2) + np.sin(2 * np.pi * 70 * t) * env(n, .01, .25) * .6)


def swish(d, g=.5, rev=False): n = int(d * SR); p = np.arange(n) / n; return norm(bp(pink(n), 300, 5000) * np.sin(np.pi * p) ** .9 * (.7 + .3 * np.abs(np.sin(np.arange(n) / SR * 22))), .5) * g
def snap(): n = int(.3 * SR); t = np.arange(n) / SR; f = 600 + 1400 * np.exp(-t * 20); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * .6 + hp(nz(n), 2500) * env(n, .001, .05) * .5; return norm(x)
def tap(): n = int(.1 * SR); return norm(bp(nz(n), 1500, 6000) * env(n, .001, .02) + lp(nz(n), 400) * env(n, .001, .03) * .3)
def pluck(f, d=.8): t = tt(d); return norm(sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (3 + k)) for k in (1, 2, 3, 4)))
def heartbeat(): return thud(48, .5) + np.pad(thud(44, .5), (int(.28 * SR), 0))[:int(.5 * SR)] * .7
def blip(f=520, d=.05): t = tt(d); return norm(np.sign(np.sin(2 * np.pi * f * t)) * .5 * np.minimum(1, (d - t) / .01))
def creak(d): n = int(d * SR); t = np.arange(n) / SR; f = 120 + 80 * np.sin(t * 9); return norm(bp(2 * ((np.cumsum(f) / SR) % 1) - 1, 200, 1800) * np.minimum(1, t / .1) * np.minimum(1, (d - t) / .2), .5)

def paper(d=.5, g=.3): n = int(d * SR); p = np.arange(n) / n; return norm(bp(nz(n), 1500, 8000) * np.sin(np.pi * p) ** .8 * (.6 + .4 * np.abs(np.sin(np.arange(n) / SR * 40))), .5) * g
def click2(): n = int(.12 * SR); t = np.arange(n) / SR; return norm(bp(nz(n), 2000, 9000) * env(n, .0005, .012) + np.sin(2 * np.pi * 900 * t) * env(n, .0005, .02) * .4)
def shimmer(d=1.2, f0=1200): n = int(d * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f0 * k * (1 + .002 * np.sin(5 * t)) * t) / k for k in (1, 2, 3.01, 4.02)) * np.minimum(1, t / .08) * np.exp(-t * 2.2); return norm(x, .5)
def fwoomp(d=.6): n = int(d * SR); t = np.arange(n) / SR; return norm(lp(nz(n), 500) * env(n, .02, .2) + np.sin(2 * np.pi * 70 * t) * env(n, .01, .25) * .6)

def river(d, g=.3): n = int(d * SR); x = hp(pink(n), 500) * .4 + bp(nz(n), 1200, 5000) * .25; imp = (R.random(n) < 40 / SR) * R.uniform(.2, 1, n); drops = bp(np.convolve(imp, np.exp(-np.arange(200) / 30), 'same'), 800, 4000) * .5; return np.stack([norm(x + drops, .5), norm(np.roll(x, 400) + drops, .5)], 1) * g
def drip(f=1400, g=.3, pan=0): n = int(.35 * SR); t = np.arange(n) / SR; fr = f * (1 + .7 * np.exp(-t * 55)); x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 20); return st(x * g, pan)
def splash(d=.6, g=.5): n = int(d * SR); x = lp(nz(n), 3500) * env(n, .03, .2); 
def splash(d=.6, g=.5):
    n = int(d * SR); x = lp(nz(n), 3500) * env(n, .03, .2)
    for _ in range(10): s = int(R.random() * d * .6 * SR); bd = .05 + R.random() * .06; b = np.sin(2 * np.pi * np.cumsum(np.linspace(300, 900, int(bd * SR))) / SR) * env(int(bd * SR), .005, .04); x[s:s + len(b)] += b[:len(x) - s] * .5
    return st(norm(x, .6) * g)
def wail(d=2.2, g=.3, f0=430, pan=0):   # a distant woman's cry
    n = int(d * SR); t = np.arange(n) / SR; vib = 1 + .03 * np.sin(2 * np.pi * 5.5 * t); gl = 1 + .18 * np.sin(np.pi * t / d); f = f0 * vib * gl
    x = (np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR) + .2 * np.sin(6 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * t / d) ** 1.4
    x = bp(x, 300, 2600) + bp(x, 1000, 3000) * .5   # a vowel-ish formant
    return verb(st(norm(x, .55) * g, pan), .5)
def wind(d, g): n = int(d * SR); t = np.arange(n) / SR; gust = .5 + .5 * np.sin(2 * np.pi * .13 * t + 1) * np.sin(2 * np.pi * .05 * t); a = lp(pink(n), 500) * gust; return np.stack([norm(a, .5), norm(np.roll(a, 500), .5)], 1) * g
def swish(d, g=.5): n = int(d * SR); p = np.arange(n) / n; return norm(bp(pink(n), 300, 5000) * np.sin(np.pi * p) ** .9, .5) * g

import json as _json
DURS = _json.load(open(HERE + '/out/voice/dur.json')); VOL = _json.load(open(HERE + '/voice/lines.json'))
S_LINE = []; t = 0.35
for l in VOL: S_LINE.append(t); t += DURS[l['id']] + 0.3
def Lt(i, f): return S_LINE[i - 1] + f * (DURS[VOL[i - 1]['id']] + 0.3)
# ---------- narration (radio chain) ----------
vo = np.zeros(N); duck = np.zeros(N)
def compress(x, thr=-24, ratio=3.0):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e); return x * 10 ** (np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0) / 20)
for i, l in enumerate(VOL):
    x, vsr = sf.read(f'{HERE}/out/voice/{l["id"]}.wav'); x = resample_poly(x, SR, vsr); x = hp(x, 80); x = compress(x)
    i0 = int(S_LINE[i] * SR); j = min(N, i0 + len(x)); vo[i0:j] += x[:j - i0]; duck[max(0, i0 - int(.2 * SR)):min(N, j + int(.4 * SR))] = 1
duck = lp(np.convolve(duck, np.ones(int(.3 * SR)) / int(.3 * SR), 'same'), 5)
# ---------- pencil foley, each driven by what is being drawn ----------
def graphite(d=.12, g=.3):     # graphite writing: high, fine, scratchy
    n_ = int(d * SR); return norm(bp(nz(n_), 2800, 7000) * env(n_, .002, .03) * (.6 + .4 * (R.random(n_) > .5)), g)
def waxy(d=.5, g=.2):          # coloured pencil hatching back and forth: lower, soft
    n_ = int(d * SR); t_ = np.arange(n_) / SR; return norm(bp(nz(n_), 900, 3500) * (np.abs(np.sin(2 * np.pi * 9 * t_)) ** .6) * np.sin(np.pi * t_ / d) ** .5, g)
def stroke_long(d=1.4, g=.2):  # a long soft stroke for a horizon sweep or growth
    n_ = int(d * SR); p_ = np.arange(n_) / n_; return norm(bp(pink(n_), 500, 2500) * np.sin(np.pi * p_) ** .8, .5) * g
def tock(g=.5):                # the wooden tock of the magnifier
    n_ = int(.12 * SR); t_ = np.arange(n_) / SR; return norm(np.sin(2 * np.pi * 680 * t_) * env(n_, .001, .03) + bp(nz(n_), 1500, 4000) * env(n_, .001, .01) * .5, g)
def tag_tap(g=.3):
    n_ = int(.1 * SR); return norm(bp(nz(n_), 1800, 5000) * env(n_, .001, .02), g)
def crackle(d=.5, g=.2):       # a dry crackle for spreading fine lines and the rings
    n_ = int(d * SR); imp = (R.random(n_) < 120 / SR) * R.uniform(.2, 1, n_); return np.stack([norm(bp(np.convolve(imp, np.exp(-np.arange(80) / 8), 'same'), 1500, 7000), g)] * 2, 1)
def reverse(x): return x[::-1].copy()
def whoosh_back(d=.9, g=.3):   # an inverted sound: a reversed whoosh
    n_ = int(d * SR); p_ = np.arange(n_) / n_; return norm(reverse(bp(pink(n_), 400, 4000) * np.sin(np.pi * p_) ** 1.2), g)
def ambience(d, g=.05):        # room tone of paper and a distant breeze
    n_ = int(d * SR); return np.stack([norm(lp(pink(n_), 800), .5) * g] * 2, 1)
# beds: the open air, then the vault room tone
put(FX, 0, ambience(124.0, .05))
for i in range(1, 16): put(FX, S_LINE[i - 1] + 0.05, swish(.45, .10) if i > 1 else swish(.5, .12))
# section 1: the title, the soil, the opera
for k in range(18): put(FX, 0.6 + k * .14, st(graphite(.12, .18), (-.2 + .02 * k)))
put(FX, Lt(2, 0.00), st(stroke_long(2.2, .12), -.4)); put(FX, Lt(2, 0.12), st(stroke_long(2.2, .12), -.2)); put(FX, Lt(2, 0.24), st(stroke_long(2.2, .10), .2)); put(FX, Lt(2, 0.34), st(stroke_long(2.2, .10), .4))
put(FX, Lt(2, 0.36), st(waxy(2.0, .05), 0)); put(FX, Lt(2, 0.72), st(whoosh_back(1.0, .22), .0))          # the bullet flies backward
put(FX, Lt(2, 0.85), st(tag_tap(.3), .3))
put(FX, Lt(3, 0.3), st(tock(.5), 0.0)); put(FX, Lt(3, 0.85), st(tock(.3), 0.0))     # the magnifier in, out
put(FX, Lt(3, 0.5), st(waxy(1.0, .05), -.2))
# section 2: inversion (reversed), the vault, the rings drawn one by one
put(FX, Lt(4, 0.35), st(stroke_long(1.2, .12), -.4)); put(FX, Lt(4, 0.75), st(whoosh_back(.8, .22), -.4))   # inversion
put(FX, Lt(5, 0.2), st(graphite(.5, .12), .3)); put(FX, Lt(5, 0.45), st(waxy(1.2, .06), .3))
for i in range(9): put(FX, Lt(6, 0.05 + i * 0.07), st(crackle(.25, .10), -.3 + .08 * i))
for i, n_ in enumerate([7, 8]): put(FX, Lt(7, .1 + .2 * i), st(graphite(.3, .12), (-.3, .3)[i]))
# section 3: the freeport, the highway, the turnstile
put(FX, Lt(8, 0.2), st(stroke_long(1.3, .14), .0)); put(FX, Lt(8, 0.8), st(crackle(.6, .08), .0))
put(FX, Lt(9, 0.0), st(stroke_long(1.4, .08), 0.0))
put(FX, Lt(9, 0.55), st(whoosh_back(.9, .22), .0)); put(FX, Lt(9, 0.8), st(graphite(.12, .2), .0))
put(FX, Lt(10, 0.25), st(tock(.5), 0)); put(FX, Lt(10, 0.85), st(tock(.3), 0))
# section 4: yacht, dome, pincer, the algorithm lifted, the trinket
put(FX, Lt(11, 0.4), st(graphite(.4, .10), -.2))
put(FX, Lt(12, 0.1), st(waxy(1.2, .06), -.3)); put(FX, Lt(12, 0.1), st(waxy(1.2, .06), .3))
put(FX, Lt(13, 0.2), st(crackle(1.0, .08), 0)); put(FX, Lt(13, 0.75), st(whoosh_back(.8, .16), .2))
put(FX, Lt(14, 0.2), st(tag_tap(.3), .2)); put(FX, Lt(14, 0.2), st(tock(.3), .2))
put(FX, Lt(15, 0.5), st(graphite(.4, .14), 0)); put(FX, Lt(15, 0.7), st(stroke_long(2.0, .12), 0))
for i, (t0, x_) in enumerate([]): pass
# ---------- score: acoustic colours; a section per part of the film ----------
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def drone(t0, d, v=.14, p='D2'): n(t0, 'cellos', p, d, v); n(t0, 'contrabass', p[:-1] + str(int(p[-1]) - 1), d, v * .7)
# section 1 (hook and setup): nylon guitar and a soft drone
drone(.3, Lt(3, 0), .12, 'A1')
for k, p in enumerate(['A3', 'C4', 'E4', 'D4', 'C4', 'A3']): n(Lt(1, 0.3) + k * 1.1, 'guitar_nylon', p, 1.8, .2, -.1)
# section 2 (inversion, the villain): bowed vibraphone and low strings
drone(Lt(4, 0), Lt(7, 0.9) - Lt(4, 0), .12, 'D2')
for k, p in enumerate(['D4', 'F4', 'A4', 'G4', 'F4', 'E4']): n(Lt(4, 0.2) + k * 1.4, 'vibraphone_bowed', p, 2.2, .16, -.2 + .08 * k)
# section 3 (heist): pizzicato bass and flute, a driving tempo
for k in range(int((Lt(10, 0.9) - Lt(8, 0.0)) / .52)): n(Lt(8, 0.0) + k * .52, 'contrabass_pizz', ['D2', 'A1', 'D2', 'F2'][k % 4], .45, .18, -.2)
for k, p in enumerate(['A4', 'D5', 'C5', 'A4', 'G4', 'F4']): n(Lt(8, 0.4) + k * 1.4, 'flute', p, 1.0, .12, .2)
# section 4 (climax and twist): low cello drone, a pulse, harp; the trinket motif
drone(Lt(11, 0.0), Lt(15, 0.5) - Lt(11, 0.0), .14, 'A1')
for k in range(int((Lt(13, 0.8) - Lt(12, 0.1)) / .48)): n(Lt(12, 0.1) + k * .48, 'timpani', 'D3', .4, .12 + .004 * k)
for k, p in enumerate(['A4', 'E5', 'D5', 'C5']): n(Lt(14, 0.4) + k * .8, 'harp', p, 1.6, .17, 0)   # the trinket motif (kalimba-like on harp)
# the last line: a single nylon note, the plate complete
n(Lt(15, 0.6), 'guitar_nylon', 'A3', 3.6, .2, .1); n(Lt(15, 0.6), 'guitar_nylon', 'E4', 3.6, .15, .1)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.55, mix=.28); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
mus *= (1 - .4 * duck)[:, None]
fd = np.ones(N); fd[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)) ** 1.5; mus *= fd[:, None]
FXg = FX * (1 - .25 * duck)[:, None]
vo2 = limit(vo, np.sqrt(np.mean(vo[vo != 0] ** 2)) * 10 ** (11 / 20)) if False else vo
act = duck > .5
mus_db = dbfs(mus[act]) if act.any() else -30
vo2 = vo2 * 10 ** ((mus_db + 9 - dbfs(vo2[act])) / 20) if act.any() else vo2
mix = mus + verb(st(vo2), .12) + FXg
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo2[act]), 1), 'fx', round(dbfs(FXg), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
