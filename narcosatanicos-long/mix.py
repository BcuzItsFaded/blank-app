# narration + surf, gulls, crabs, oars, the lighthouse, a steam whistle; a guitar waltz that sours, then resolves -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 146.5; N = int(DUR * SR); R = np.random.default_rng(1989); S.seed(49)
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
def H(t, inst, var, v=.8, g=.5, pan=0.0): put(FX, t, st(S.hit(inst, var, v), pan) * g)
def crunch(g=.5): n = int(.16 * SR); return norm(bp(nz(n), 900, 6000) * env(n, .003, .045) * (.5 + .5 * (R.random(n) > .7)) + lp(nz(n), 300) * env(n, .002, .05) * .4) * g
def crickets(d, g): n = int(d * SR); t = np.arange(n) / SR; ch = (np.sin(2 * np.pi * 26 * t) > .2) * (np.sin(2 * np.pi * .8 * t) > -.3); x = np.sin(2 * np.pi * 4500 * t) * lp(ch.astype(float), 200); return np.stack([x, np.roll(x, 3000)], 1) * g
def hum(d, g, f=55): n = int(d * SR); t = np.arange(n) / SR; x = lp(pink(n), 300) * .6 + np.sin(2 * np.pi * f * t) * .2; return np.stack([norm(x, .5), norm(np.roll(x, 900), .5)], 1) * g
def clank(): n = int(.9 * SR); t = np.arange(n) / SR; return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, tau in [(240, .35), (517, .22), (911, .14), (1630, .08)]) + lp(nz(n), 900) * env(n, .001, .04) * .8)
def siren(d, g): t = tt(d); f = 700 + 300 * np.sin(2 * np.pi * .5 * t); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / .5) * np.minimum(1, (d - t) / .8); return st(norm(bp(x, 400, 2500), .5) * g, .3)
def crowdroar(d, g):
    n = int(d * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for v in range(12):
        f0 = R.uniform(2.5, 5.5); ph = R.uniform(0, 6); en = np.maximum(0, np.sin(2 * np.pi * f0 * t + ph)) ** 2; out += bp(nz(n), R.uniform(300, 600), R.uniform(1800, 3500)) * lp(en, 30)
    return np.stack([norm(out, .5), norm(np.roll(out, 1500), .5)], 1) * g
def knock(): n = int(.2 * SR); t = np.arange(n) / SR; return norm(np.sin(2 * np.pi * 180 * t) * np.exp(-t * 30) + bp(nz(n), 900, 4000) * env(n, .001, .02) * .6)
def engine(d, g, rev=False): n = int(d * SR); t = np.arange(n) / SR; f = 30 + (40 * t / d if rev else 0); x = lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (.6 + .4 * np.sin(2 * np.pi * 3 * t)) + nz(n) * .3, 500) * np.minimum(1, t / .3) * np.minimum(1, (d - t) / .5); return norm(x, .5) * g
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def drone(t0, d, v=.14, p='D2'): n(t0, 'cellos', p, d, v); n(t0, 'contrabass', p[:-1] + str(int(p[-1]) - 1), d, v * .7)

# ---------------- long version: one score that moves through the 15 beats; foley per beat ----------------
src = open(HERE + '/film.js').read(); ST = [float(x) for x in re.findall(r"\['v\d\d', ([\d.]+),", src)]; ST[0] = 0.0; ED = ST[1:] + [DUR]
BEATS = [["drone", "D2", [["beat", 0.4, 0.06], ["crick", 0, 0.02]]], ["drone", "D2", [["crowd", 0, 0.035], ["beat", 0, 0.05]]], ["trem", "D2", [["click", 1.0, 0.15], ["click", 1.8, 0.15]]], ["pulse", "A1", [["engine", 1.7, 0.05], ["clank", 3.4, 0.06], ["siren", 3.2, 0.018]]], ["trem", "C2", [["engine", 0, 0.07], ["dig", 0.3, 0.08]]], ["drone", "D2", [["hum", 0, 0.02]]], ["trem", "D2", []], ["lament", "D2", [["crick", 0, 0.015]]], ["drone", "G1", [["card", 0.8, 0.1], ["card", 1.7, 0.1], ["card", 2.6, 0.1], ["card", 3.5, 0.1], ["card", 4.4, 0.1]]], ["drums", "D2", []], ["lament", "D2", []], ["pulse", "G1", [["siren", 0, 0.035], ["thud", 6.0, 0.12]]], ["drone", "D2", [["clank", 0.6, 0.14]]], ["harp", "D2", [["birds", 0, 0.08]]], ["harpend", "D2", [["bell", 0.4, 0.12]]]]
def put1(t, x, g, pan=0.0): put(FX, t, st(x, pan) * g if x.ndim == 1 else x * g)
def birds(): out = np.zeros(int(2.4 * SR)); [put_into(out, int((k * .4 + R.random() * .2) * SR), np.sin(2 * np.pi * np.cumsum(R.uniform(2800, 4600) * (1 + .3 * np.sin(2 * np.pi * 30 * tt(.09)))) / SR) * np.sin(np.pi * tt(.09) / .09) ** 2 * .5) for k in range(5)]; return out
def card(): n_ = int(.18 * SR); return norm(bp(nz(n_), 2000, 8000) * env(n_, .002, .03), .5)
def stamp(): n_ = int(.2 * SR); return norm(lp(nz(n_), 600) * env(n_, .001, .04) + bp(nz(n_), 1500, 5000) * env(n_, .001, .01) * .5)
def snuff(): n_ = int(.4 * SR); return norm(bp(nz(n_), 600, 3000) * env(n_, .01, .08), .5)
def scan(d): t = tt(d); return norm(np.sin(2 * np.pi * 1800 * t) * (.5 + .5 * np.sin(2 * np.pi * 3 * t)) * .3 + bp(nz(len(t)), 3000, 8000) * .2, .4)
FOL = {'bell': lambda: bell_ring(1.4) * .5, 'paper': lambda: paper(.6, .4), 'steps': None, 'knock': knock, 'clank': clank, 'run': None, 'gasp': lambda: gasp(.5), 'dig': None, 'snuff': snuff, 'proj': None, 'click': click2,
       'creak': lambda: creak(1.2), 'thud': lambda: thud(55, .5), 'card': card, 'stamp': stamp, 'birds': birds}
for i, (bed, root, fol) in enumerate(BEATS):
    a, b = ST[i], ED[i]; d = b - a
    for name, off, g in fol:
        t0 = a + off
        if name == 'crick': put(FX, a, crickets(d, g))
        elif name == 'hum': put(FX, a, hum(d, g))
        elif name == 'siren': put(FX, t0, siren(min(5.0, d - off), g * 2))
        elif name == 'crowd': put(FX, a, crowdroar(d, g))
        elif name == 'engine': put(FX, t0, st(engine(min(3.5, d - off), g), .2))
        elif name == 'beat':
            for k in range(int((d - off) / .5)): H(t0 + k * .5, 'bass_drum', None, .6, g, -.4)
        elif name == 'steps':
            for k in range(8): put1(t0 + k * .45, step(.12), g, -.3 + .08 * k)
        elif name == 'run':
            for k in range(14): put1(t0 + k * .32, step(.1), g, 0)
        elif name == 'dig':
            for k in range(int(d / .6)): put1(t0 + k * .6, crunch(.45), g, (-.4 if k % 2 else .4))
        elif name == 'scan': put1(t0, scan(min(4.0, d)), g, .2)
        elif name == 'proj':
            for k in range(int(d / .12)): put1(t0 + k * .12, click2(), g * .5, .4)
        else: put1(t0, FOL[name](), g, 0)
    # music bed
    if bed == 'waltz' or bed == 'waltzend':
        bt = .55 if bed == 'waltz' else .62; t = a + .2; ch = [('A2', ['E3', 'C4']), ('E2', ['B2', 'G#3']), ('D3', ['F3', 'A3']), ('E2', ['B2', 'G#3'])]; j = 0
        while t < b - 3 * bt:
            bs, up = ch[j % 4]; n(t, 'guitar_nylon', bs, bt * 2.5, .24, -.1)
            for q in (1, 2): n(t + q * bt, 'guitar_nylon', up[0], bt, .19, .1); n(t + q * bt, 'guitar_nylon', up[1], bt, .17, .1)
            t += 3 * bt; j += 1
        drone(a, d, .1, root)
        if bed == 'waltzend': n(b - 2.2, 'harp', 'A3', 1.6, .18); n(b - 2.2, 'harp', 'E4', 1.6, .16)
    elif bed in ('box', 'boxend'):
        BOX = ['E5', 'G5', 'B5', 'A5', 'G5', 'E5', 'F#5', 'D#5']; t = a + .5; j = 0
        while t < b - .8: n(t, 'glockenspiel', BOX[j % 8], 1.0, .18 * (1 if j % 4 == 0 else .7), -.2 + .1 * (j % 4)); t += .65; j += 1
        drone(a, d, .12, root)
    elif bed == 'drone': drone(a, d, .13, root); n(a + .2, 'violas', root[:-1] + str(int(root[-1]) + 1), d - .3, .07)
    elif bed == 'trem': drone(a, d, .14, root); n(a + .1, 'violins_trem', 'C5', d - .2, .055); n(a + .1, 'violins_trem', 'B4', d - .2, .045)
    elif bed == 'pulse':
        drone(a, d, .14, root)
        for k in range(int((d - .4) / .5)): n(a + .3 + k * .5, 'timpani', 'E3' if root.startswith('E') else 'D3', .4, .12 + .004 * k)
    elif bed == 'pizz':
        drone(a, d, .12, root)
        for k in range(int((d - .3) / .58)): n(a + .2 + k * .58, 'contrabass_pizz', ['E2', 'G2', 'B1', 'G2'][k % 4], .5, .18)
    elif bed == 'hit': n(a + .05, 'timpani', 'E3', 1.0, .3); n(a + .05, 'cellos', 'E2', 1.4, .22)
    elif bed == 'lament':
        drone(a, d, .11, root); L = ['A3', 'C4', 'E4', 'D4', 'C4', 'B3', 'A3'] if root.startswith('A') else (['E4', 'G4', 'F#4', 'E4', 'D#4', 'E4'] if root.startswith('E') else ['A3', 'D4', 'F4', 'E4', 'D4', 'C#4', 'D4'])
        stp = max(1.0, (d - 1) / len(L))
        for q, pp in enumerate(L): n(a + .4 + q * stp, 'cellos', pp, stp * 1.1, .17, .1)
    elif bed == 'arena': drone(a, d, .1, root); [n(a + .4 + k * 1.0, 'tubular_bells', 'E4' if k % 2 == 0 else 'B3', 1.6, .13, .2) for k in range(int(d - .8))]
    elif bed == 'drums': drone(a, d, .14, root); [H(a + .4 + k * .9, 'frame_drum', 'large', .6, .12, 0) for k in range(int((d - .6) / .9))]
    elif bed in ('harp', 'harpend'):
        drone(a, d, .1, root); HP = ['A4', 'D5', 'F#5', 'E5', 'D5'] if root.startswith('D') else ['A3', 'C4', 'E4', 'A4', 'E4']
        for q, pp in enumerate(HP): n(a + .5 + q * max(.9, (d - 1.5) / 5), 'harp', pp, 1.8, .15)
        if bed == 'harpend': n(b - 3.0, 'violins', 'D4', 2.8, .07); n(b - 3.0, 'violins', 'A4', 2.8, .06)

# ---------- sounds for the darker inserts ----------
def gunshot(): n_ = int(.7 * SR); t = np.arange(n_) / SR; return norm(lp(nz(n_), 2500) * env(n_, .0005, .05) * 1.2 + np.sin(2 * np.pi * 70 * t) * env(n_, .001, .12) * .8 + hp(nz(n_), 3000) * env(n_, .0002, .01) * .8)
def shatter(): n_ = int(1.0 * SR); imp = (R.random(n_) < 900 / SR) * R.uniform(.2, 1, n_) * np.exp(-np.arange(n_) / SR * 4); return norm(bp(np.convolve(imp, np.exp(-np.arange(80) / 8), 'same'), 2500, 9000) + hp(nz(n_), 4000) * env(n_, .001, .03) * .6)
def slap(): n_ = int(.3 * SR); return norm(bp(nz(n_), 400, 4000) * env(n_, .0008, .03) + lp(nz(n_), 300) * env(n_, .001, .06) * .6)
def sting(d=1.4): t = tt(d); x = sum(np.sin(2 * np.pi * f * t) for f in (311, 329.6, 349.2)) * np.exp(-t * 2.5) + bp(nz(len(t)), 500, 3000) * env(len(t), .005, .2) * .5; return norm(x, .6)
def tapeR(): n_ = int(.6 * SR); return norm(bp(nz(n_), 1500, 7000) * np.sin(np.pi * np.arange(n_) / n_) * (.6 + .4 * np.abs(np.sin(np.arange(n_) / SR * 70))), .5)

for k in range(8): put1(25.0 + .2 + k * .6, paper(.3, .25), .1, (-.4 if k % 2 else .4))
put1(47.0 + .3, sting(1.6), .12, 0)
for k in range(6): put1(66.4 + .3 + k * .5, crunch(.4), .1, (-.3 if k % 2 else .3))
put1(95.5 + .3, sting(1.4), .1, 0)
for t0 in [.4, .9, 1.3, 1.9, 2.6]: put1(114.6 + t0, gunshot(), .2, (t0 * 7 % 2) - .5)
put1(114.6 + .42, shatter(), .16, -.1); put1(114.6 + 1.32, shatter(), .14, .2)

mus = S.render(E, dur=DUR); mus = S.room(mus, size=.6, mix=.28); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
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
mus *= (1 - .4 * duck)[:, None]; FXg *= (1 - .3 * duck)[:, None]
mix = mus + verb(st(vo), .12) + FXg
if os.environ.get("STEMS"): sf.write(HERE + "/out/fx.wav", FXg.astype(np.float32), SR); sf.write(HERE + "/out/vo.wav", verb(st(vo), .12).astype(np.float32), SR)
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'fx', round(dbfs(FXg), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
