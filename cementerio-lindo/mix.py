# narration + whispered ghost voices (noise-vocoded) + desert-night foley + an elegy -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 60.5; N = int(DUR * SR); R = np.random.default_rng(1890); S.seed(21)
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

cues = []
def C(t, x, g=.5, pan=0.0): cues.append((t, x, g, pan))
def crickets(d, g): n = int(d * SR); t = np.arange(n) / SR; ch = (np.sin(2 * np.pi * 26 * t) > .2) * (np.sin(2 * np.pi * .8 * t) > -.3); x = np.sin(2 * np.pi * 4500 * t) * lp(ch.astype(float), 200); return np.stack([x, np.roll(x, 3000)], 1) * g
def crunch(g=.5): n = int(.16 * SR); return norm(bp(nz(n), 900, 6000) * env(n, .003, .045) * (.5 + .5 * (R.random(n) > .7)) + lp(nz(n), 300) * env(n, .002, .05) * .4) * g
def match(): n = int(.5 * SR); t = np.arange(n) / SR; return norm(bp(nz(n), 1500, 8000) * env(n, .002, .05) * 1.2 + bp(nz(n), 300, 2000) * np.minimum(1, t / .05) * np.exp(-t * 6) * .5)
def coyote(): t = tt(1.6); f = 700 + 500 * np.sin(np.pi * np.minimum(1, t / 1.2)) * np.exp(-t * .6) + 20 * np.sin(2 * np.pi * 7 * t); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 1.6) ** 1.5; return norm(bp(x + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR), 400, 3000), .6)
def whisper(name):   # noise-vocode a spoken line into a breathy whisper
    x, vsr = sf.read(f'{HERE}/whispers/{name}.wav'); x = resample_poly(x, SR, vsr); x = x / (np.abs(x).max() + 1e-9); n = len(x) + int(.3 * SR); x = np.pad(x, (0, n - len(x))); y = np.zeros(n); nzz = nz(n)
    edges = np.geomspace(250, 7600, 17)
    for lo, hi in zip(edges[:-1], edges[1:]): e = lp(np.abs(bp(x, lo, hi)), 45); y += bp(nzz, lo, hi) * e
    y = hp(y, 400) * (1 + .3 * np.sin(2 * np.pi * 5 * np.arange(n) / SR)); return norm(y, .7)
def wh(t, name, g, pan, wet=.55): put(FX, t, verb(st(whisper(name), pan), wet) * g * 2.0)
# beds: desert night - crickets, a soft wind, dust
put(FX, 0, crickets(29.5, .03)); put(FX, 0, wind(60.5, .05)); put(FX, 50.2, crickets(10.3, .025))
for ts in [.4, 1.4, 5.4, 10.8, 14.0, 18.0, 20.2, 24.3, 31.0, 35.6, 41.0, 44.0, 46.8, 52.0, 56.8, 58.2]: C(ts, swish(.5, .14), 1)
C(6.8, coyote(), .12, .6); C(13.5, coyote(), .08, -.6)
C(5.2, creak(1.4), .18, 0)   # the old iron gate in the wind
# 4a: your steps on the gravel path... then a second set behind you, out of step
for k in range(8): C(23.7 + k * .46, crunch(.5), .8, (-.08 if k % 2 else .08))
for k in range(5): put(FX, 25.95 + k * .43, verb(st(crunch(.4), (-.35 if k % 2 else .35)), .45) * .85)
C(27.45, swish(.35, .5), .9, 0); C(27.5, fwoomp(.6), .5, 0)   # you turn
# 5: "Remember me..." - then many voices, names nobody remembers
wh(32.9, 'w01', .5, 0, .6); wh(34.3, 'w02', .32, -.5); wh(35.0, 'w03', .3, .55)
for i, (nm, tt0) in enumerate([('w04', 34.6), ('w05', 35.3), ('w06', 35.9), ('w07', 36.5), ('w08', 37.0), ('w09', 37.6), ('w10', 38.1), ('w11', 38.6), ('w12', 39.0)]): wh(tt0, nm, .22 + .03 * (i % 3), (-.8 + .2 * i) if i % 2 else (.8 - .2 * i))
# 6: the gate creaks open; the whisper follows
C(39.8, creak(1.2), .4, 0)
for k in range(7): C(39.7 + k * .26, crunch(.5), .5, 0)
wh(41.7, 'w13', .45, -.3, .5); wh(42.2, 'w14', .32, .4, .6); wh(42.8, 'w15', .28, -.6, .7)
# 7: silence returns - just wind; 8: matches for the candles, a distant bell
C(44.0, fwoomp(.9), .25, 0)
for k in range(9): C(52.0 + k * .25, match(), .06, -.6 + k * .15)
C(57.0, bell_ring(1.2) * .25, .25, .2)
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g if x.ndim == 1 else x * g)

# ---------------- music: bowed vibraphone + glass over low strings; a nylon-guitar elegy for the remembrance ----------------
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def drone(t0, d, v=.18, p='A1'): n(t0, 'cellos', p[:-1] + str(int(p[-1]) + 1), d, v); n(t0, 'contrabass', p, d, v * .7)
drone(.2, 4.6, .18)
for k, p in enumerate(['E5', 'C5', 'A4']): n(.6 + k * 1.2, 'vibraphone_bowed', p, 2.2, .24, -.2 + .2 * k)
drone(4.82, 12.5, .16); n(5.0, 'violas', 'E3', 12.0, .1)
for k, p in enumerate(['A4', 'C5', 'E5', 'D5', 'C5', 'B4', 'A4', 'E4']): n(6.0 + k * 1.4, 'glass', p, 2.0, .2, -.3 + .08 * k)
drone(17.38, 6.0, .18)
for k, p in enumerate(['C5', 'B4', 'A4', 'G#4']): n(17.8 + k * 1.4, 'vibraphone_bowed', p, 2.0, .2)
drone(23.49, 4.0, .16); n(23.6, 'violins_trem', 'A4', 3.9, .07); n(25.9, 'violins_trem', 'A#4', 1.6, .08)
n(27.45, 'timpani', 'D3', 1.2, .3); n(27.45, 'cellos', 'A2', 2.0, .24)
drone(29.89, 9.8, .18); n(30.0, 'violins_trem', 'E5', 9.5, .07, .3); n(30.0, 'violins_trem', 'F5', 9.5, .05, -.3)
for k, p in enumerate(['A5', 'E5', 'C6', 'B5', 'F5', 'E5']): n(33.0 + k * 1.0, 'glass', p, 1.8, .18, -.5 + .2 * k)
drone(39.67, 3.8, .2); n(39.7, 'violins_trem', 'A4', 3.6, .1); n(39.7, 'violins_trem', 'C5', 3.6, .08)
drone(43.46, 6.7, .14); n(44.0, 'vibraphone_bowed', 'A4', 3.0, .2); n(46.8, 'vibraphone_bowed', 'C5', 3.0, .2)
# the remembrance: a gentle nylon-guitar arpeggio, A minor -> C -> F -> E -> A minor
drone(50.15, 10.0, .14)
prog = [('A2', ['A3', 'C4', 'E4', 'A4']), ('C3', ['G3', 'C4', 'E4', 'G4']), ('F2', ['F3', 'A3', 'C4', 'F4']), ('E2', ['E3', 'G#3', 'B3', 'E4']), ('A2', ['A3', 'C4', 'E4', 'A4'])]
tt0 = 50.4
for bass, up in prog:
    n(tt0, 'guitar_nylon', bass, 2.0, .34, -.1)
    for j, p in enumerate(up + up[2:0:-1]): n(tt0 + .3 * (j + 1), 'guitar_nylon', p, 1.6, .26, .1)
    tt0 += 1.95
n(tt0, 'guitar_nylon', 'A2', 2.5, .32); n(tt0, 'guitar_nylon', 'E3', 2.5, .26); n(tt0 + .02, 'guitar_nylon', 'A3', 2.5, .24)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.7, mix=.3); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
FXg = FX
fd = np.ones(N); fd[-int(1.0 * SR):] = np.linspace(1, 0, int(1.0 * SR)) ** 1.5; mus *= fd[:, None]

# ---------------- narration ----------------
src = open(HERE + '/film.js').read()
vo_times = [(m[0], float(m[1])) for m in re.findall(r"\['(v\d\d)', ([\d.]+),", src)]
vo = np.zeros(N); duck = np.zeros(N)
def compress(x, thr=-24, ratio=3.0):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e); return x * 10 ** (np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0) / 20)
for vid, t0 in vo_times:
    x, vsr = sf.read(f'{HERE}/voices/{vid}.wav'); x = resample_poly(x, SR, vsr); x = hp(x, 80); x = compress(x)
    i = int(t0 * SR); j = min(N, i + len(x)); vo[i:j] += x[:j - i]; duck[max(0, i - int(.2 * SR)):min(N, j + int(.4 * SR))] = 1
duck = lp(np.convolve(duck, np.ones(int(.3 * SR)) / int(.3 * SR), 'same'), 5); act = duck > .5
def limit(x, ceil):
    pk = maximum_filter1d(np.abs(x), int(.005 * SR)); g = np.minimum(1, ceil / (pk + 1e-9)); g = np.minimum.reduce([g, np.roll(g, int(.0025 * SR))]); return x * np.clip(lp(g, 200), 0, 1)
speech = np.abs(vo) > 10 ** (-40 / 20) * np.abs(vo).max(); vr = np.sqrt(np.mean(vo[np.convolve(speech, np.ones(2400), 'same') > 0] ** 2))
vo = limit(vo, vr * 10 ** (11 / 20)); mus_db = dbfs(mus[act]); vo = vo * 10 ** ((mus_db + 9 - dbfs(vo[act])) / 20)
mus *= (1 - .4 * duck)[:, None]; FXg *= (1 - .3 * duck)[:, None]
mix = mus + verb(st(vo), .12) + FXg
if os.environ.get("STEMS"): sf.write(HERE + "/out/fx.wav", FXg.astype(np.float32), SR); sf.write(HERE + "/out/vo.wav", verb(st(vo), .12).astype(np.float32), SR)
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'fx', round(dbfs(FXg), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
