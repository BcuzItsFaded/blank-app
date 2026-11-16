# narration (radio chain) + foley + 1930s hot-band score + optical-soundtrack ageing -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 60.6; N = int(DUR * SR); R = np.random.default_rng(1814); S.seed(18)
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
def scritch(d=.14, g=.5, lo=1800, hi=7000):   # a fingernail scrape / scratch on wood
    n = int(d * SR); t = np.arange(n) / SR; x = bp(nz(n), lo, hi) * env(n, .003, .05) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 55 * t))); return norm(x, .6) * g
def crawl(t0, steps, span, pan0, pan1, g=.5):   # a sequence of scratch-taps dragging across the pan field
    for k in range(steps): C(t0 + k / steps * span, (scritch(.1 + R.random() * .06, 1) if k % 2 else tap()), g * (.7 + .5 * R.random()), pan0 + (pan1 - pan0) * k / steps)
cues = []
def C(t, x, g=.5, pan=0.0): cues.append((t, x, g, pan))
# a continuous dark room-tone: low draft + a faint high hiss of silence
put(FX, 0, wind(60.7, .09)); put(FX, 0, st(hiss(60.7, .05), 0))
# title strips
for ts in [.5, 2.6]: C(ts, swish(.5, .18), 1)
# S1 hook: the house settles; at ~3.0s something stirs under the bed
C(3.0, creak(.9) * .5, .5, -.2); C(3.3, thud(60, .5) * .5, .55, 0); C(5.4, scritch(.18, .5), .5, -.15)
# S2 the hand crawls across the floor, left -> right (8.2 -> 15.0)
crawl(8.2, 11, 6.6, -.5, .5, .5); C(9.0, thud(66, .45) * .4, .4, -.3); C(14.6, scritch(.2, .6), .6, .4)
# S3 the grave: earth scrapes as it claws up; a chink of gold
for k in range(7): C(16.4 + k * .72, scritch(.16 + R.random() * .08, .6, 900, 4200), .55, R.uniform(-.3, .3))
C(16.8, fwoomp(.7) * .5, .5, 0); C(19.2, clink(.4), .45, .1); C(19.5, clink(.45), .4, -.1)
# S4 the Inquisition: a brazier crackle, a tolling bell, the severing snap
C(24.7, hiss(5.5, .22), 1, -.35)                       # fire crackle under the brazier
for k in range(5): C(25.0 + k * 1.3, scritch(.05, .4, 2500, 8000), .3, -.35)  # spit of embers
C(25.2, bell_ring(1.2) * .4, .4, .2); C(28.6, bell_ring(1.0) * .3, .3, .2)
C(27.1, snap() * .9, .8, 0); C(27.25, thud(70, .5) * .6, .6, 0)              # the hand severed
# S5 the night visit: the bedframe creaks as it climbs, then the grip
C(32.4, creak(1.1) * .5, .5, .2); C(34.0, creak(1.0) * .5, .5, .1); C(35.6, creak(.9) * .55, .55, 0)
crawl(32.8, 8, 4.6, .3, -.05, .45)
C(37.6, snap() * 1.0, .9, -.05); C(37.7, thud(58, .55), .7, 0); C(37.95, gasp(.5), .5, 0)   # it closes on the ankle
# S6 the elders' warning: quiet; a soft page/cloth, a child's small shift
C(39.4, paper(.5, .25), .5, 0); C(43.6, scritch(.14, .35), .3, .45)
# S7 sleep paralysis: a rising heartbeat, a low weight, breaths, faint many-hand scratches
for k in range(11): C(45.6 + k * .62, heartbeat() * (.3 + .035 * k), .45 + .03 * k, 0)   # heart quickening
C(47.0, fwoomp(.8) * .7, .7, 0)                                         # the weight lands on the chest
for t0, pn in [(46.6, .4), (47.4, -.45), (48.2, .55), (49.0, -.3)]: C(t0, scritch(.18, .45, 1200, 5000), .4, pn)
C(48.6, gasp(.45), .4, 0); C(50.6, gasp(.5), .4, 0)
# S8 the final twist: the blanket pulled tight, the hand retreats, a last little scratch
C(53.6, paper(.55, .4), .55, 0); C(54.0, paper(.4, .3), .4, .1)        # feet tucked under the blanket
for k in range(5): C(55.2 + k * .5, scritch(.14 + R.random() * .05, .45, 900, 4000), .4, .25 - k * .1)  # it sinks away
C(59.4, scritch(.16, .5), .5, -.2)                                     # ...just in case
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g if x.ndim == 1 else x * g)

# ---------------- music: a sinister music-box over low drones; tremolo dread; heartbeat timpani ----------------
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
BOX = ['A4', 'C5', 'E5', 'F5', 'E5', 'C5', 'B4', 'G#4']                 # A harmonic-minor music box, unsettled
def box(t0, t1, vel=.32, step=.52, inst='glockenspiel'):
    t = t0; i = 0
    while t < t1: n(t, inst, BOX[i % len(BOX)], 1.1, vel * (1 if i % 4 == 0 else .68), -.2 + .12 * (i % 4)); t += step; i += 1
def drone(t0, d, v=.28): n(t0, 'cellos', 'A2', d, v); n(t0, 'contrabass', 'A1', d, v * .8)
# S1 hook: a lone music box over a low drone; a tremolo swell as something stirs
drone(.3, 7.0, .26); box(.9, 6.6, .3, .56)
n(3.0, 'violins_trem', 'A4', 3.4, .16, .1); n(3.0, 'violins_trem', 'C5', 3.4, .12, -.1)
# S2 the crawl: tension rises; pizz steps mirror the hand, trem drone swells
drone(7.64, 8.6, .28); n(7.7, 'violins_trem', 'E4', 8.0, .17, .2)
for k in range(12): n(8.2 + k * .55, 'contrabass_pizz', ['A1', 'A1', 'C2', 'E2'][k % 4], .5, .26, -.3 + .05 * k)
# S3 the grave: deeper; low timpani hits as it claws, a harp glint for the gold
drone(16.06, 8.5, .3); n(16.1, 'violins_trem', 'F4', 8.0, .16, -.2)
for k in range(6): n(16.5 + k * .74, 'timpani', 'A1', .6, .34, 0)
for j, p in enumerate(['A4', 'E5', 'A5']): n(19.0 + j * .16, 'harp', p, 1.4, .26, .2)
# S4 the Inquisition: ominous tolling, a dissonant minor-second, a timpani strike at the severing
drone(24.58, 7.3, .3); n(24.6, 'violins_trem', 'A4', 7.0, .16, .1); n(24.6, 'violins_trem', 'A#4', 7.0, .10, -.1)
for k, p in enumerate(['A3', 'A3', 'E3']): n(24.9 + k * 1.9, 'glockenspiel', p, 1.6, .3, .2)   # a slow toll
n(27.1, 'timpani', 'D2', 1.4, .42, 0); n(27.1, 'cellos', 'A2', 2.2, .34)
# S5 the night visit: an accelerating pulse climbing to a sting at the grip (37.6), then a hard cut
drone(31.88, 6.0, .28)
for k in range(10): n(32.4 + k * .52 / (1 + .05 * k), 'timpani', 'A1', .4, .3 + .02 * k, 0)   # quickening steps
n(33.0, 'violins_trem', 'C5', 4.6, .14, .2); n(33.0, 'violins_trem', 'E5', 4.6, .12, -.2)     # rising dread
n(37.55, 'timpani', 'D2', 1.0, .5, 0); n(37.55, 'violins_trem', 'F5', 1.0, .34, 0)            # the grip — sting
# S6 the elders' warning: the music box alone, warm and slow — a bedtime tune
box(39.5, 44.9, .3, .62); n(39.3, 'violas', 'A3', 6.0, .14, 0)
# S7 sleep paralysis: a drone and an unresolved high cluster; the heartbeat carries it
drone(45.39, 7.2, .26); n(45.5, 'violins_trem', 'B4', 7.0, .14, .2); n(45.5, 'violins_trem', 'F5', 7.0, .12, -.2)
# S8 the final twist: the music box returns once, then hush; a low stroke and a last unresolved note
drone(52.56, 7.4, .26); box(52.9, 55.0, .28, .64)
n(56.7, 'cellos', 'A2', 3.6, .32); n(56.7, 'contrabass', 'A1', 3.6, .28)
n(58.8, 'glockenspiel', 'A4', 2.4, .32, .1); n(58.8, 'glockenspiel', 'B4', 2.4, .20, -.1)      # unresolved
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.6, mix=.32); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
def gate(buf, a, b, fo=.05, fi=.14):
    e = np.ones(N); i, j = int(a * SR), int(b * SR); e[i:j] = 0; e[max(0, i - int(fo * SR)):i] = np.linspace(1, 0, min(int(fo * SR), i)); e[j:j + int(fi * SR)] = np.linspace(0, 1, int(fi * SR))[:max(0, min(int(fi * SR), N - j))]; return buf * e[:, None]
mus = gate(mus, 37.75, 39.3)   # hard cut after the grip -> into the quiet warning scene
mus = gate(mus, 55.1, 56.6)    # hush before the final line
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
mus *= (1 - .4 * duck)[:, None]; FXg *= (1 - .25 * duck)[:, None]
mix = mus + verb(st(vo), .12) + FXg
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'fx', round(dbfs(FXg), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
