# narration + surf, gulls, crabs, oars, the lighthouse, a steam whistle; a guitar waltz that sours, then resolves -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 61.3; N = int(DUR * SR); R = np.random.default_rng(1917); S.seed(24)
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
def surf(d, g):   # waves breaking on the reef: slow swells of filtered noise
    n = int(d * SR); t = np.arange(n) / SR; sw = (.5 + .5 * np.sin(2 * np.pi * t / 6.5)) ** 3 + .3 * (.5 + .5 * np.sin(2 * np.pi * t / 4.1 + 1)) ** 4
    x = lp(pink(n), 1400) * sw + bp(nz(n), 2000, 7000) * sw ** 2 * .3; return np.stack([norm(x, .5), norm(np.roll(x, 2000), .5)], 1) * g
def gull(): t = tt(.7); f = 1900 + 900 * np.sin(np.pi * t / .7) - 500 * t; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / .7) ** 2 * (1 + .5 * np.sin(2 * np.pi * 40 * t)); return norm(bp(x, 1200, 5000), .5)
def clicks(d, g): n = int(d * SR); imp = (R.random(n) < 110 / SR) * R.uniform(.2, 1, n); x = bp(np.convolve(imp, np.exp(-np.arange(60) / 6), 'same'), 2500, 9000); return np.stack([norm(x, .5), norm(np.roll(x, 777), .5)], 1) * g
def oar(): n = int(.6 * SR); t = np.arange(n) / SR; return norm(bp(nz(n), 300, 2500) * env(n, .05, .2) * .6 + bp(nz(n), 1500, 6000) * env(n, .02, .08) * .3)
def tick(): n = int(.06 * SR); return norm(bp(nz(n), 2500, 8000) * env(n, .0005, .006))
def whistle(d=2.2): t = tt(d); x = (np.sin(2 * np.pi * 330 * t) + .6 * np.sin(2 * np.pi * 495 * t) + .3 * np.sin(2 * np.pi * 660 * t)) * np.minimum(1, t / .15) * np.minimum(1, (d - t) / .4) + bp(nz(len(t)), 300, 2000) * .25; return norm(x, .6)
# beds: the sea never stops
put(FX, 0, surf(61.3, .06)); put(FX, 5.6, wind(10.7, .03)); put(FX, 16.3, wind(7.5, .045))
for ts in [.4, 1.4, 1.9, 2.8, 6.0, 8.4, 12.4, 16.8, 20.4, 27.8, 30.6, 31.4, 34.6, 38.4, 41.8, 44.3, 45.6, 49.6, 51.2, 53.8, 56.2, 59.0]: C(ts, swish(.5, .12), 1)
for t0, pn in [(1.2, .5), (7.4, -.4), (10.6, .6), (13.8, -.2), (51.0, .4), (54.6, -.5)]: C(t0, gull(), .12, pn)
# the colony: children's footsteps, the flag snapping
for k in range(6): C(7.0 + k * .7, step(.1), .18, -.3 + .1 * k)
# the ships stopped: the crabs come
put(FX, 19.6, clicks(4.0, .05))
# the boat: oars, then the swell takes it
for k in range(8): C(24.0 + k * .62, oar(), .12, .1)
C(27.2, splash(1.0, .5), .35); C(27.5, thud(50, .8), .18, 0)
# the lighthouse: its clockwork ticks; a slow heartbeat; heavy steps outside the huts
for k in range(int((44.0 - 29.8) / .5)): C(29.8 + k * .5, tick(), .12, .3)
for k in range(9): C(38.0 + k * .7, heartbeat(), .1, 0)
for k in range(6): C(39.3 + k * .55, step(.16), .12, .5 - k * .2)
# the light goes out
C(46.8, fwoomp(.8), .3, 0)
# the ship: a steam whistle across the water
C(50.6, whistle(2.4), .2, .3); C(55.0, whistle(1.4), .14, .3)
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g if x.ndim == 1 else x * g)

# ---------------- music: a guitar waltz for the colony that sours to minor; dread under the lighthouse; a major resolution at the rescue ----------------
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def waltz(t0, bars, chords, bt=.5, v=.24):
    t = t0
    for i in range(bars):
        bass, up = chords[i % len(chords)]; n(t, 'guitar_nylon', bass, bt * 2.5, v + .06, -.1); n(t + bt, 'guitar_nylon', up[0], bt, v, .1); n(t + bt, 'guitar_nylon', up[1], bt, v * .9, .1); n(t + 2 * bt, 'guitar_nylon', up[0], bt, v, .1); n(t + 2 * bt, 'guitar_nylon', up[1], bt, v * .9, .1); t += 3 * bt
MAJ = [('D3', ['F#3', 'A3']), ('A2', ['E3', 'C#4']), ('A2', ['E3', 'G3']), ('D3', ['F#3', 'A3'])]
MIN = [('D3', ['F3', 'A3']), ('A2', ['E3', 'C#4']), ('Bb2', ['F3', 'D4']), ('A2', ['E3', 'A3'])]
n(.2, 'cellos', 'D2', 5.4, .14)
for k, p in enumerate(['A4', 'F#4', 'E4', 'D4']): n(.6 + k * 1.1, 'harp', p, 1.8, .2)
waltz(5.7, 7, MAJ, .5, .24)
for k, p in enumerate(['F#5', 'A5', 'G5', 'F#5', 'E5', 'D5', 'E5', 'F#5']): n(6.2 + k * 1.2, 'flute', p, 1.0, .12, .2)
waltz(16.4, 5, MIN, .55, .2); n(16.4, 'cellos', 'D2', 7.2, .14)
n(23.8, 'cellos', 'A1', 5.9, .18); n(23.8, 'violins_trem', 'A4', 5.6, .07); n(26.0, 'violins_trem', 'Bb4', 3.4, .08); n(27.3, 'timpani', 'D3', 1.4, .3)
n(29.7, 'contrabass', 'D1', 8.0, .2); n(29.7, 'cellos', 'D2', 8.0, .16); n(30.0, 'violins_trem', 'C#5', 7.6, .06); n(30.0, 'violins_trem', 'D5', 7.6, .05)
n(37.8, 'contrabass', 'C#1', 6.2, .2); n(37.8, 'cellos', 'G2', 6.2, .14); n(38.0, 'violins_trem', 'G#4', 5.8, .07)
n(44.0, 'cellos', 'D3', 5.0, .16); n(44.0, 'violas', 'A3', 5.0, .1)
n(49.4, 'cellos', 'D2', 11.4, .16); n(49.4, 'contrabass', 'D1', 11.4, .12); n(50.6, 'violins', 'F#4', 9.6, .1, -.2); n(50.6, 'violins', 'A4', 9.6, .09, .2)
waltz(52.0, 5, MAJ, .58, .2); n(60.0, 'harp', 'D4', 1.4, .2); n(60.0, 'harp', 'A4', 1.4, .18)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.6, mix=.28); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
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
