# narration + cold wind foley + a sparse piano elegy -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 61.13; N = int(DUR * SR); R = np.random.default_rng(2010); S.seed(20)
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

WOLD = [0, 0.35, 6.48, 16.07, 24.71, 31.15, 40.39, 46.71, 53.68, 60.8]; WNEW = [0, 0.35, 6.362, 15.828, 24.353, 30.667, 39.786, 47.371, 54.218, 61.13]
def warp(t): return float(np.interp(t, WOLD, WNEW))   # scene-time -> film-time (inverse of film.js)

cues = []
def C(t, x, g=.5, pan=0.0): cues.append((warp(t), x, g, pan))
def knock(): n = int(.2 * SR); t = np.arange(n) / SR; return norm(np.sin(2 * np.pi * 180 * t) * np.exp(-t * 30) + bp(nz(n), 900, 4000) * env(n, .001, .02) * .6)
def chalk(d=.12): n = int(d * SR); t = np.arange(n) / SR; return norm(bp(nz(n), 1800, 7000) * np.sin(np.pi * t / d) ** .6 * (.6 + .4 * np.abs(np.sin(2 * np.pi * 70 * t))), .6)
def glass(): n = int(.25 * SR); t = np.arange(n) / SR; return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, tau in [(3800, .03), (5600, .02), (2600, .05)]) * (.5 + .5 * R.random()))
def howl(d, g, f0=320): n = int(d * SR); t = np.arange(n) / SR; f = f0 * (1 + .25 * np.sin(2 * np.pi * .21 * t) + .1 * np.sin(2 * np.pi * .53 * t)); x = bp(pink(n), 200, 1400) * .6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .08; x = bp(x, f0 * .7, f0 * 3) * (.5 + .5 * np.sin(np.pi * t / d)); return np.stack([norm(x, .5), norm(np.roll(x, 1200), .5)], 1) * g
def flap(d=.3): n = int(d * SR); return norm(bp(nz(n), 500, 3000) * env(n, .004, .07), .5)
def engine(d, g): n = int(d * SR); t = np.arange(n) / SR; x = lp(np.sign(np.sin(2 * np.pi * 28 * t)) * (.6 + .4 * np.sin(2 * np.pi * 3 * t)) + nz(n) * .3, 400) * np.minimum(1, t / .4) * np.minimum(1, (d - t) / .6); return norm(x, .5) * g
def clang(): n = int(1.4 * SR); t = np.arange(n) / SR; return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, tau in [(210, .5), (437, .35), (811, .22), (1290, .12)]) + lp(nz(n), 900) * env(n, .001, .05) * .8)
def buzz(d, g): n = int(d * SR); t = np.arange(n) / SR; x = np.sign(np.sin(2 * np.pi * 120 * t)) * .3 + np.sin(2 * np.pi * 240 * t) * .2; return norm(bp(x, 100, 2000), .5) * g
def match(): n = int(.5 * SR); t = np.arange(n) / SR; return norm(bp(nz(n), 1500, 8000) * env(n, .002, .05) * 1.2 + bp(nz(n), 300, 2000) * np.minimum(1, t / .05) * np.exp(-t * 6) * .5)
# beds: the cold front - wind and a howl through the broken panes; the sea at the Malecon
put(FX, 0, wind(61.13, .06)); put(FX, 0, howl(31.2, .035)); put(FX, warp(6.48), river(5.8, .1))
for k in range(5): C(7.0 + k * 1.1, splash(.9, .35), 1)      # waves breaking over the seawall
for ts in [.5, 1.0, 2.6, 6.9, 9.4, 12.6, 17.0, 19.6, 22.5, 25.2, 28.8, 32.6, 36.6, 40.8, 44.6, 48.4, 51.2, 55.4, 57.6, 59.0]: C(ts, swish(.5, .16), 1)
# the ward: glass ticking in the broken frames, curtains flapping, shivering breaths
for k in range(26): C(16.3 + k * .55 + R.random() * .2, glass(), .12, R.uniform(-.6, .6))
for k in range(10): C(16.5 + k * .85, flap(.3), .22, R.uniform(-.5, .5))
for k in range(5): C(18.0 + k * 1.4, gasp(.6), .12, R.uniform(-.4, .4))
# one after another: a chalk stroke for every death, 26 in all
for k in range(26): C(25.0 + (k + 1) / 26 * 4.6 - .05, chalk(.1 if k % 5 != 4 else .2), .45, -.2 + (k % 5) * .1)
C(29.2, bell_ring(1.0) * .3, .3, 0)
# negligence: the flashlight clicks on, footsteps; a truck idles in the yard, sacks thump
C(31.3, click2(), .5, 0)
for k in range(6): C(31.8 + k * .48, step(.12), .3, -.2)
put(FX, warp(34.4), st(engine(5.8, .22), .45))
for k in range(4): C(35.2 + k * 1.1, thud(80, .3), .3, .45)
C(34.3, creak(1.0), .3, .35)
# the trial: the gavel; then the cell bars slam down
C(41.7, knock() * 1.0, .9, 0); C(41.72, thud(90, .3), .5, 0); C(44.95, clang(), .8, 0); C(45.0, thud(55, .6), .6, 0)
# the corridor: a buzzing lamp; it flickers as the shadow changes
put(FX, warp(46.8), st(buzz(7.0, .05), .3))
for k in range(8): C(50.2 + k * .075, click2(), .35, .3)
C(50.5, fwoomp(.8), .5, 0)
# in memory: a match struck for each row of candles, wind settling
for k in range(13): C(54.2 + k * .13, match(), .08, -.6 + k * .1)
for k in range(13): C(55.9 + k * .13, match(), .08, -.6 + k * .1)
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g if x.ndim == 1 else x * g)
fw = np.ones(N); i0 = int(warp(54.0) * SR); fw[i0:] = np.linspace(1, .35, N - i0); FX *= fw[:, None]   # the wind dies down at the memorial

# ---------------- music: a sparse piano elegy in D minor over a cold cello drone ----------------
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((warp(t), inst, pitch, d, v, pan, g))
MOT = ['A4', 'G4', 'F4', 'E4', 'D4']
def motif(t0, step=.8, v=.34, oct=0, pan=-.1):
    for i, p in enumerate(MOT): n(t0 + i * step, 'piano', p[:-1] + str(int(p[-1]) + oct), step * 2, v * (1 if i == 0 else .8), pan)
def drone(t0, d, v=.2, p='D2'): n(t0, 'cellos', p, d, v); n(t0, 'contrabass', p[:-1] + str(int(p[-1]) - 1), d, v * .7)
drone(.2, 6.3, .2); motif(.6, .9, .32)
drone(6.48, 9.6, .18, 'A1'); n(6.5, 'violins_trem', 'D5', 9.4, .1, .2); n(6.5, 'violins_trem', 'A5', 9.4, .07, -.2); motif(12.4, .75, .28, 0)
drone(16.07, 8.6, .2); n(16.1, 'violins_trem', 'E5', 8.4, .1, .2); n(16.1, 'violins_trem', 'F5', 8.4, .07, -.2)   # a cold minor second
for k, p in enumerate(['D5', 'F5', 'E5', 'D5', 'C5', 'A4']): n(17.0 + k * 1.3, 'piano', p, 2.0, .24, .1)
drone(24.71, 6.4, .22)
for k in range(7): n(25.0 + k * .9, 'piano', ['D3', 'D3', 'C3', 'C3', 'Bb2', 'Bb2', 'A2'][k], 1.4, .3, -.1)
n(29.2, 'piano', 'D3', 2.4, .34); n(29.2, 'piano', 'A3', 2.4, .26); n(29.2, 'piano', 'F4', 2.4, .22)
drone(31.15, 9.2, .2, 'G1')
for k in range(9): n(31.6 + k * 1.0, 'cellos_pizz', ['G2', 'D3', 'Bb2', 'D3'][k % 4], .6, .26)
n(36.6, 'violins_trem', 'Bb4', 3.6, .1); n(36.6, 'violins_trem', 'C5', 3.6, .08)
drone(40.39, 6.3, .22); n(41.7, 'timpani', 'D3', 1.2, .4); n(44.95, 'timpani', 'D3', 1.6, .46); n(44.95, 'cellos', 'D2', 1.8, .3)
drone(46.71, 6.9, .16, 'C2'); n(47.0, 'violins_trem', 'C#5', 3.4, .09); n(47.0, 'violins_trem', 'D5', 3.4, .08)
n(50.5, 'piano', 'D2', 3.0, .4); n(50.5, 'piano', 'A2', 3.0, .3)
drone(53.68, 7.1, .18); motif(54.0, 1.0, .3, 0); n(58.6, 'violins', 'D4', 2.2, .12); n(58.6, 'violins', 'A4', 2.2, .1); n(59.0, 'piano', 'D4', 1.8, .26); n(59.0, 'piano', 'A4', 1.8, .2)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.7, mix=.32); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
FXg = FX
fd = np.ones(N); fd[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)) ** 1.5; mus *= fd[:, None]

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
mus *= (1 - .4 * duck)[:, None]; FXg *= (.55 * (1 - .35 * duck))[:, None]
mix = mus + verb(st(vo), .12) + FXg
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'fx', round(dbfs(FXg), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
