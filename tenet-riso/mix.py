# Narration + riso machine foley + a score that enters one layer per plate -> out/mix.wav (48 kHz stereo)
# Foley: each plate's roller sweep is a "shhk" (feed), each ring a drum "ka-chunk", each lift a reversed swish.
# Score (as in the treatment): upright bass from the start, vibes-like plucks when the sunflower plate arrives,
# brushed kit from the inversion, toy piano / nylon guitar in the last section.
import json, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
LINES = json.load(open(f'{HERE}/lines.json'))
DUR = json.load(open(f'{HERE}/voices/dur.json'))
R = np.random.default_rng(1920)

S_LINE, t = [], 0.35
for l in LINES:
    S_LINE.append(t); t += DUR[l['id']] + 0.3
def Lt(i, f): return S_LINE[i - 1] + f * (DUR[LINES[i - 1]['id']] + 0.3)
def LEND(i): return S_LINE[i - 1] + DUR[LINES[i - 1]['id']] + 0.3
TOTAL = LEND(15) + 2.2
N = int(TOTAL * SR)

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def nz(n): return R.standard_normal(n)
def pink(n):
    w = np.fft.rfft(nz(n)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
def tt(d): return np.arange(int(d * SR)) / SR
def st(x, pan=0.0):
    x = np.asarray(x); l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)
def put(buf, t0, x):
    i = int(t0 * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf) and j > i: buf[i:j] += x[:j - i]
def compress(x, thr=-24, ratio=3.0):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e)
    return x * 10 ** (np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0) / 20)
IRn = int(.9 * SR); IR = np.stack([nz(IRn), nz(IRn)], 1) * np.exp(-np.arange(IRn) / SR * 6)[:, None]
IR = np.stack([lp(IR[:, 0], 4200), lp(IR[:, 1], 4200)], 1); IR /= np.sqrt((IR ** 2).sum(0))
def verb(x2, wet=.2):
    y = np.stack([fftconvolve(x2[:, 0], IR[:, 0])[:len(x2)], fftconvolve(x2[:, 1], IR[:, 1])[:len(x2)]], 1)
    return x2 * (1 - wet) + y * wet

# ---------- narration: radio chain, placed on the timeline; the score ducks under it ----------
vo = np.zeros((N, 2)); duck = np.zeros(N)
for i, l in enumerate(LINES):
    x, vsr = sf.read(f'{HERE}/out/voice/{l["id"]}.wav')
    if x.ndim > 1: x = x.mean(1)
    x = resample_poly(x, SR, vsr); x = hp(x, 80); x = compress(x)
    i0 = int(S_LINE[i] * SR); j = min(N, i0 + len(x))
    vo[i0:j] += st(x[:j - i0] * .9)
    duck[max(0, i0 - int(.2 * SR)):min(N, j + int(.4 * SR))] = 1
duck = lp(np.convolve(duck, np.ones(int(.3 * SR)) / int(.3 * SR), 'same'), 5)
duck = 1 - .6 * np.clip(duck, 0, 1)

FX = np.zeros((N, 2))
# ---------- riso foley ----------
def shhk(d=.9, g=.3):          # the feed: paper through the drum, a dry hiss with a rising edge
    n = int(d * SR); p = np.arange(n) / n
    return norm(hp(pink(n), 1800) * np.sin(np.pi * p) ** .6 * (.7 + .3 * np.abs(np.sin(np.arange(n) / SR * 30))), .5) * g
def kachunk(g=.5):             # the drum turning on one ring: low thump, then a wet click
    n = int(.22 * SR); t_ = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t_ * 9) + 55) / SR) * np.exp(-t_ * 22) + bp(nz(n), 1800, 5000) * np.exp(-t_ * 90) * .4, g)
def lift(d=.7, g=.3):          # a plate lifting off the drum: a reversed swish
    x = shhk(d, 1.0)[::-1].copy(); return norm(x, .5) * g
def tock(g=.4):                # the paper's knock as the magnifier comes in
    n = int(.12 * SR); t_ = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * 680 * t_) * np.exp(-t_ / .03) + bp(nz(n), 1500, 4000) * np.exp(-t_ / .01) * .5, g)
def whoosh_back(d=.9, g=.22):  # an inverted sound: a reversed whoosh
    n = int(d * SR); p = np.arange(n) / n
    return norm((bp(pink(n), 400, 4000) * np.sin(np.pi * p) ** 1.2)[::-1].copy(), g)

# roller sweeps: one shhk per plate, panned to where the roller starts
ARR = {'B': (0.0, 1.0), 'K': (Lt(2, .2), 1.1), 'S': (Lt(2, .6), .9)}
for p, (t0, d) in ARR.items():
    put(FX, t0, st(shhk(d, .22), {'B': -.3, 'K': .3, 'S': 0}[p]))
# a new sheet at every cut: the paper feed, then the drum
CUTS = [Lt(2, .86), Lt(5, .52), Lt(7, .43), Lt(7, .69), Lt(2, 0), Lt(2, .36), Lt(2, .66), Lt(3, 0), Lt(3, .55), Lt(4, 0), Lt(5, 0), Lt(6, 0), Lt(6, .55), Lt(7, 0), Lt(8, 0), Lt(8, .5), Lt(9, 0), Lt(10, 0), Lt(11, 0), Lt(11, .52), Lt(12, 0), Lt(13, 0), Lt(13, .45), Lt(14, 0), Lt(15, 0), Lt(15, .5)]
for k, c in enumerate(CUTS): put(FX, c - .05, st(shhk(.5, .16), -.4 + .8 * (k % 2))); put(FX, c + .12, st(kachunk(.18), 0))
# each ring of the Algorithm: a drum turn
for i in range(9): put(FX, Lt(6, .05 + i * .07), st(kachunk(.35), -.3 + .075 * i))
# the magnifier, the bullet, the inversion, the plates lifting off
put(FX, Lt(3, .3), st(tock(.4), 0)); put(FX, Lt(3, .85), st(tock(.25), 0))
put(FX, Lt(2, .72), st(whoosh_back(1.0, .22), 0))           # the bullet flies backward
put(FX, Lt(4, .75), st(whoosh_back(.8, .2), -.4))           # inversion
put(FX, Lt(9, .55), st(whoosh_back(.9, .2), 0))             # the inverted bullet at Kat
put(FX, Lt(10, .25), st(tock(.35), 0)); put(FX, Lt(10, .85), st(tock(.25), 0))
put(FX, Lt(13, .2), st(kachunk(.6), 0))                     # the Algorithm rising
put(FX, Lt(13, .75), st(whoosh_back(.8, .16), .2))
put(FX, Lt(15, .2), st(kachunk(.3), 0))
put(FX, LEND(15) + .1, st(lift(.7, .28), -.4)); put(FX, LEND(15) + .25, st(lift(.8, .26), .4))   # blue and pink lift

# ---------- score: one layer per plate, each entering with its plate ----------
SC = np.zeros((N, 2))
def bass(t0, t1, note=36.7):   # upright bass: D2 with a soft pluck per bar (120 bpm)
    for k, t_ in enumerate(np.arange(t0, t1, .5)):
        f = note * (2 ** (np.array([0, 0, 3, 0])[k % 4] / 12)); d = .45; n = int(d * SR); t2 = np.arange(n) / SR
        x = sum(np.sin(2 * np.pi * f * h * t2) / h * np.exp(-t2 * (4 + h)) for h in (1, 2, 3))
        put(SC, t_, st(norm(x, .18), -.1))
def vibes(t0, t1):             # the sunflower plate: a bell-like pluck on the offbeats
    for t_ in np.arange(t0, t1, 1.0):
        d = .9; n = int(d * SR); t2 = np.arange(n) / SR
        f = 880 * (2 ** (R.integers(0, 6) / 12))
        x = np.sin(2 * np.pi * f * t2) * np.exp(-t2 * 5) + .3 * np.sin(2 * np.pi * f * 3.9 * t2) * np.exp(-t2 * 9)
        put(SC, t_, st(norm(x, .10), R.uniform(-.5, .5)))
def brushes(t0, t1):           # brushed kit: a soft swish on each beat, a tap on the 2 and 4
    for k, t_ in enumerate(np.arange(t0, t1, .5)):
        put(SC, t_, st(swish_(.35, .05 if k % 2 == 0 else .03), .15))
        if k % 4 in (1, 3): put(SC, t_, st(hp(nz(int(.08 * SR)), 2000) * np.exp(-tt(.08) * 60) * .05, -.2))
def swish_(d, g):
    n = int(d * SR); p = np.arange(n) / n; return norm(bp(pink(n), 1200, 6000) * np.sin(np.pi * p) ** 1.5, .5) * g
def toypiano(t0, t1):          # a toy piano, sparse and bright, the last section
    for t_ in np.arange(t0, t1, .75):
        d = .6; n = int(d * SR); t2 = np.arange(n) / SR; f = 1046.5 * (2 ** (R.integers(0, 8) / 12))
        put(SC, t_, st(norm(np.sin(2 * np.pi * f * t2) * np.exp(-t2 * 8) + .15 * np.sin(2 * np.pi * f * 2 * t2) * np.exp(-t2 * 14), .1), R.uniform(-.4, .4)))

bass(Lt(1, .0), LEND(15) + .1)                              # the bass from the first line
vibes(ARR['S'][0], LEND(15) + .1)                           # the sunflower plate: the vibes
brushes(Lt(4, .0), LEND(15) + .1)                           # the brushed kit from the inversion
toypiano(Lt(14, .0), LEND(15) + .1)                         # toy piano in the last section

# score rides under the narration
SC = SC * (duck[:, None] * .9 + .1)
# a whisper of paper hum under everything
hum = st(norm(lp(pink(N), 600), .5) * .02, 0)[:N]
mix = vo + FX * .9 + SC * .7 + hum
mix = verb(mix, .08)
mix = mix / (np.abs(mix).max() + 1e-9) * .9
os.makedirs(f'{HERE}/out', exist_ok=True)
sf.write(f'{HERE}/out/mix.wav', mix.astype(np.float32), SR, subtype='PCM_16')
print('mix', round(TOTAL, 2), 's ->', f'{HERE}/out/mix.wav')
