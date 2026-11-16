# narration + foley + a pipe-and-tabor dance that will not stop -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 62.2; N = int(DUR * SR); R = np.random.default_rng(1518); S.seed(15)
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
def H(t, inst, var, v=.8, g=.5, pan=0.0, d=None): put(FX, t, st(S.hit(inst, var, v, d), pan) * g)
def stomp(g=.5): n = int(.16 * SR); return norm(lp(nz(n), 260) * env(n, .002, .05) + np.sin(2 * np.pi * 62 * tt(.16)) * env(n, .001, .06) * .7) * g
def crowd(d, g): n = int(d * SR); t = np.arange(n) / SR; x = bp(pink(n), 250, 1800) * (.6 + .4 * np.sin(2 * np.pi * .7 * t) * np.sin(2 * np.pi * .23 * t)); return np.stack([norm(x, .5), norm(np.roll(x, 900), .5)], 1) * g
def crickets(d, g): n = int(d * SR); t = np.arange(n) / SR; ch = (np.sin(2 * np.pi * 28 * t) > .2) * (np.sin(2 * np.pi * .9 * t) > -.3); x = np.sin(2 * np.pi * 4300 * t) * lp(ch.astype(float), 200); return np.stack([x, np.roll(x, 3000)], 1) * g
def knock(): n = int(.2 * SR); t = np.arange(n) / SR; return norm(np.sin(2 * np.pi * 180 * t) * np.exp(-t * 30) + bp(nz(n), 900, 4000) * env(n, .001, .02) * .6)
def rattle(d=.5): out = np.zeros(int(d * SR)); [put_into(out, int(k / 14 * d * SR), norm(bp(nz(int(.03 * SR)), 1500, 6000) * env(int(.03 * SR), .001, .008)) * (.4 + R.random() * .6)) for k in range(12)]; return norm(out)
# beds: summer dusk crickets + town murmur; they thin out as the story darkens
put(FX, 0, crickets(31.5, .035)); put(FX, 0, crowd(31.5, .07)); put(FX, 38.9, wind(23.3, .08)); put(FX, 47.2, wind(15.0, .07))
for ts in [.5, 2.4, 11.6, 17.6, 25.0, 28.6, 40.6, 44.9, 48.0, 58.4, 59.2]: C(ts, swish(.5, .18), 1)
# stamping feet on the cobbles, locked to the dance (S1-S3), then dragging, exhausted
for k in range(int(20.4 / .51)): C(.6 + k * .51, stomp(.5 if (k % 2 == 0) else .35), .5, R.uniform(-.5, .5))
for k in range(int((24.0 - 20.6) / .8)): C(20.6 + k * .8, stomp(.25), .4, R.uniform(-.4, .4))
for k in range(10): C(17.2 + k * .23, stomp(.2), .35, R.uniform(-.7, .7))   # dozens more join
C(22.6, gasp(.5), .35, -.2); C(23.4, gasp(.45), .3, .3)
# S4: the flask held to the sun; then the stars wheel in
C(25.2, clink(.4), .35, -.2); C(27.6, shimmer(1.6, 1500), .3, 0); C(28.4, shimmer(1.4, 2000), .22, .2)
# S5: the edict nailed to the hall door; then the drums are struck out
for k in range(3): C(32.4 + k * .32, knock(), .6, 0)
C(32.0, paper(.6, .4), .5, 0); H(35.45, 'gran_cassa', 'hit', .9, .7, 0)
# S6: the danse macabre - bone rattles on the beat; she falls
for k in range(7): C(39.4 + k * .52 * 1.0, rattle(.32), .3, -.3)
C(42.9, thud(55, .6), .7, .2); C(43.0, paper(.4, .25), .4, .2)
# S7: pilgrims' steps up the hill; the shrine door glows
for k in range(16): C(47.6 + k * .4, step(.12) , .22, -.4 + k * .04)
# S8: her last steps slow down and stop; the shoes left behind
for k, dt in enumerate([.5, .55, .62, .7, .8, .95, 1.1]): C(54.6 + sum([.5, .55, .62, .7, .8, .95, 1.1][:k]), stomp(.4 - k * .04), .45, 0)
C(59.6, shimmer(2.2, 1200), .2, 0)
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g if x.ndim == 1 else x * g)

# ---------------- music: a pipe-and-tabor jig in D dorian that will not stop ----------------
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
TUNE = ['D5', 'A4', 'D5', 'F5', 'E5', 'D5', 'C5', 'A4', 'C5', 'E5', 'D5', 'C5', 'D5', 'A4', 'F4', 'G4', 'A4', 'C5', 'D5', 'E5', 'F5', 'E5', 'D5', 'A4']
def jig(t0, t1, step=.17, inst='recorder', vel=.36, pan=-.15, drum=True, dv=.7, every=1, shift=0):
    t = t0; i = 0
    while t < t1:
        if i % every == 0:
            p = TUNE[i % len(TUNE)]
            if shift: p = p[:-1] + str(int(p[-1]) + shift)
            n(t, inst, p, step * 1.4, vel * (1 if i % 3 == 0 else .75), pan)
        if drum and i % 3 == 0: H(t, 'frame_drum', 'large' if i % 6 == 0 else 'small', dv, .32, .1)
        t += step; i += 1
def drone(t0, d, v=.24, p='D3'): n(t0, 'cellos', p, d, v); n(t0, 'contrabass', p[:-1] + str(int(p[-1]) - 1), d, v * .7)
# S1: the dance in full swing
drone(.2, 9.6, .2); jig(.4, 9.7, .17, 'recorder', .34); jig(.4, 9.7, .17, 'oboe_stac', .22, .25, drum=False, every=3, shift=-1)
# S2: one woman - the pipe alone, thinner
jig(9.8, 16.6, .17, 'recorder', .3, 0, dv=.5); drone(9.8, 6.9, .16, 'A2')
# S3: dozens join (fuller, faster) ... then the tune frays as they tire
jig(16.75, 20.4, .155, 'recorder', .36); jig(16.75, 20.4, .155, 'oboe_stac', .26, .3, drum=False, every=2, shift=-1); drone(16.75, 3.7, .22)
jig(20.4, 24.0, .26, 'recorder', .24, 0, dv=.4, every=2); drone(20.4, 3.7, .2, 'C3')
# S4: heat, then the heavens: cellos and a wheel of glinting stars
drone(24.1, 7.4, .22); n(24.2, 'violas', 'A3', 3.4, .14)
for k, p in enumerate(['D6', 'A5', 'F6', 'E6', 'C6', 'A5', 'D6', 'G5']): n(27.7 + k * .45, 'glockenspiel', p, 1.2, .24, -.4 + .1 * k)
for j, p in enumerate(['D4', 'A4', 'D5', 'F5', 'A5']): n(27.5 + j * .1, 'harp', p, 1.6, .22, .2)
# S5: one last stubborn bar of the jig ... the drum is banned: dead silence after the bass-drum stroke
jig(31.6, 35.4, .19, 'recorder', .26, 0, dv=.55); drone(31.6, 3.8, .18)
n(35.45, 'cellos', 'D2', 3.0, .3); n(35.45, 'contrabass', 'D1', 3.0, .26)
# S6: the danse macabre - the same tune, slow, in the organ, with a bell at her fall
for i, p in enumerate(TUNE[:16]): n(38.95 + i * .5, 'organ_soft', p[:-1] + str(int(p[-1]) - 1), .55, .22, -.1)
n(38.95, 'organ_soft', 'D3', 8.0, .14); n(42.9, 'tubular_bells', 'D4', 3.0, .4); n(45.0, 'tubular_bells', 'A3', 2.4, .28)
# S7: the shrine of Saint Vitus - an organ chord and church bells
n(47.2, 'organ_soft', 'D3', 6.8, .2); n(47.2, 'organ_soft', 'A3', 6.8, .16); n(47.2, 'organ_soft', 'F4', 6.8, .12)
for k in range(4): n(48.0 + k * 1.6, 'tubular_bells', ['D4', 'A3', 'F4', 'D4'][k], 2.4, .26, .2)
for k, p in enumerate(['A4', 'D5', 'F5', 'E5', 'D5']): n(49.8 + k * .8, 'hand_chimes', p, 1.4, .2, -.2)
# S8: the tune returns once, far away, slowing - and stops unresolved
tt0 = 54.3
for i, dt in enumerate([.2, .2, .21, .22, .24, .26, .28, .31, .34, .38, .42, .47, .53, .6, .7]): n(tt0, 'recorder', TUNE[i], dt * 1.5, .26, 0); tt0 += dt
drone(54.2, 7.6, .16); n(59.9, 'tubular_bells', 'D4', 2.2, .3); n(59.9, 'harp', 'E5', 2.2, .2)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.5, mix=.24); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
def gate(buf, a, b, fo=.05, fi=.14):
    e = np.ones(N); i, j = int(a * SR), int(b * SR); e[i:j] = 0; e[max(0, i - int(fo * SR)):i] = np.linspace(1, 0, min(int(fo * SR), i)); e[j:j + int(fi * SR)] = np.linspace(0, 1, int(fi * SR))[:max(0, min(int(fi * SR), N - j))]; return buf * e[:, None]
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
mus *= (1 - .4 * duck)[:, None]; FXg *= (1 - .25 * duck)[:, None]
mix = mus + verb(st(vo), .12) + FXg
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'fx', round(dbfs(FXg), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
