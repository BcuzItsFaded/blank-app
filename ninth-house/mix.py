# score + narration + foley + ambience -> out/mix.wav (48k stereo)
# usage: LIB=/root/lemo-opuscar $LIB/.venv/bin/python mix.py
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar')
sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S

SR = 48000; DUR = 73.5; N = int(DUR * SR)
rng = np.random.default_rng(21); S.seed(5)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def noise(n): return rng.standard_normal(n)
def pink(n):
    w = np.fft.rfft(noise(n)); f = np.arange(len(w)); f[0] = 1
    return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
def st(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)
def env(n, a, r):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
def fade(x, fi, fo):
    n = len(x); e = np.ones(n); a = int(fi * SR); b = int(fo * SR)
    if a: e[:a] = np.linspace(0, 1, a) ** 1.5
    if b: e[-b:] = np.minimum(e[-b:], np.linspace(1, 0, b) ** 1.5)
    return x * (e[:, None] if x.ndim == 2 else e)
def dbfs(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
IRn = int(1.8 * SR); IR = np.stack([noise(IRn), noise(IRn)], 1) * np.exp(-np.arange(IRn) / SR * 3.2)[:, None]
IR = np.stack([lp(IR[:, 0], 5000), lp(IR[:, 1], 5000)], 1); IR /= np.sqrt((IR ** 2).sum(0))
def verb(x2, wet=.3):
    y = np.stack([fftconvolve(x2[:, 0], IR[:, 0])[:len(x2)], fftconvolve(x2[:, 1], IR[:, 1])[:len(x2)]], 1)
    return x2 * (1 - wet) + y * wet
sfx = np.zeros((N, 2))
def put(buf, t, x):
    i = int(t * SR); j = min(N, i + len(x))
    if 0 <= i < N and j > i: buf[i:j] += x[:j - i]

# ---------------- foley ----------------
def brush(d, g, pan0=-.5, pan1=.5):          # brush on paper
    n = int(d * SR); p = np.arange(n) / n
    x = bp(noise(n), 1500, 7000) * (.6 + .4 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 9))) + bp(pink(n), 300, 1500) * .5
    pan = pan0 + (pan1 - pan0) * p; y = norm(x * np.sin(np.pi * p) ** .8, .5) * g
    return np.stack([y * np.cos((pan + 1) * np.pi / 4) * 1.414, y * np.sin((pan + 1) * np.pi / 4) * 1.414], 1)
def scratch(d, g, pan=0.0):                   # pen scratch for a hand-written note
    n = int(d * SR); t = np.arange(n) / SR
    gate = (np.sin(2 * np.pi * (7 + 5 * vn(n)) * t) > -.2).astype(float); gate = lp(gate, 60)
    x = hp(noise(n), 3000) * gate * np.sin(np.pi * np.arange(n) / n) ** .5
    return st(norm(x, .5) * g, pan)
def vn(n): return np.cumsum(rng.standard_normal(n)) / np.sqrt(n) * .3
def thump(g, f=90, d=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(f * (1 + .5 * np.exp(-t * 30))) / SR) * np.exp(-t * 9) + lp(noise(n), 900) * env(n, .002, .05) * .6
    return verb(st(norm(x, .8) * g), .25)
def knock(g):
    n = int(.4 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 170 * t) * np.exp(-t * 22) + .5 * np.sin(2 * np.pi * 340 * t) * np.exp(-t * 30) + bp(noise(n), 500, 2500) * env(n, .001, .02) * .4
    return verb(st(norm(x, .8) * g, .1), .22)
def step(g, pan):
    n = int(.12 * SR); x = bp(noise(n), 400, 3000) * env(n, .003, .03) + lp(noise(n), 300) * env(n, .002, .05) * .5
    return st(norm(x, .5) * g, pan)
def airy(d, g, lo=300, hi=3000):
    n = int(d * SR); p = np.arange(n) / n
    return st(norm(bp(pink(n), lo, hi) * np.sin(np.pi * p) ** 2, .4) * g)
def wind(d, g):
    n = int(d * SR); t = np.arange(n) / SR
    gust = .55 + .45 * np.sin(2 * np.pi * .17 * t + 1) * np.sin(2 * np.pi * .07 * t)
    a = lp(pink(n), 500) * gust; b = lp(pink(n), 500) * gust
    return fade(np.stack([norm(a, .5), norm(b, .5)], 1) * g, 2.5, 2.5)
def room(d, g):
    n = int(d * SR); x = lp(pink(n), 250)
    return fade(st(norm(x, .3) * g), 1.5, 1.5)
def chirp(g, f0, k=1):
    n = int(.1 * SR); t = np.arange(n) / SR
    f = f0 * (1 + .3 * np.sin(2 * np.pi * 32 * t)) * (1 + 1.1 * t * k)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / t[-1]) ** 2 * g
def bird(t, g, pan):
    for k in range(rng.integers(2, 5)):
        put(sfx, t + k * rng.uniform(.13, .2), verb(st(chirp(g, rng.uniform(2800, 4600), rng.choice([-1, 1])), pan), .25))

# paper reveal wipe and ambience bed
put(sfx, 0.0, room(20, .5))
put(sfx, .9, brush(3.4, .55, -.9, .9))
put(sfx, 2.0, brush(.9, .18, -.5, -.2))              # Marta at the easel
PAINT0 = [2.4, 3.35, 4.3, 5.25, 6.2, 7.15, 8.1, 9.05]
for i, t0 in enumerate(PAINT0): put(sfx, t0, brush(1.45, .34, -.7 + i * .2, -.3 + i * .2))
put(sfx, 9.4, brush(.8, .2, .1, .3)); put(sfx, 10.0, brush(2.6, .3, -.8, -.2))
for tb in [1.2, 3.0, 4.4, 6.0, 8.5, 10.4, 12.0, 14.2, 16.0, 19.0]: bird(tb, rng.uniform(.04, .09), rng.uniform(-.8, .8))
# notes: date labels and hand notes
for t0, d in [(.3, .9), (16.2, .9), (32.8, .9), (38.3, .9), (41.3, .9), (44.3, .9), (49.6, .9)]: put(sfx, t0, scratch(d, .3))
for t0, d, pan in [(12.2, 1.2, .5), (20.8, 1.0, -.3), (21.2, .8, -.2), (28.6, 1.0, .5), (35.6, 1.2, .0), (39.4, 1.0, -.6), (42.2, .8, -.6), (45.4, 1.0, -.6), (67.4, 1.3, -.4)]:
    put(sfx, t0, scratch(d, .24, pan))
# No. 9 blooms
put(sfx, 17.0, brush(3.4, .4, .2, .9)); put(sfx, 20.6, thump(.5, 80))
# mist wipes (J-cut: the sound enters before the picture)
put(sfx, 23.2, airy(3.4, .5)); put(sfx, 30.0, airy(3.2, .5)); put(sfx, 65.0, airy(2.8, .5))
# Wednesday morning: outside, birds return, footsteps
put(sfx, 25.8, room(5, .25))
for tb in [26.4, 27.5, 28.9, 29.8]: bird(tb, rng.uniform(.04, .08), rng.uniform(-.8, .8))
for k in range(8): put(sfx, 26.2 + k * .53, step(.35, -.3 + k * .08))
# Thursday: nine; birds gone, wind
put(sfx, 31.5, wind(16.5, .26))
put(sfx, 33.6, brush(1.3, .5, .4, .9)); put(sfx, 33.6, thump(.4, 70))
put(sfx, 35.0, brush(1.0, .22, -.6, .6))
# Fri-Sun: light, table, woman painting
put(sfx, 38.5, airy(2.2, .28, 200, 1200)); put(sfx, 41.4, thump(.35, 130, .5)); put(sfx, 41.5, brush(1.6, .22, .0, .2))
put(sfx, 44.4, brush(2.2, .26, -.1, .1))
for k in range(5): put(sfx, 45.0 + k * .35, scratch(.18, .08, 0))
# silence 1: 47.0-49.5; only one paper rustle
put(sfx, 47.9, brush(.5, .1, -.2, .2))
put(sfx, 49.95, brush(.6, .16, 0, 0))
# Monday: she looks up
put(sfx, 50.0, thump(.25, 55, 1.2))
# the walk, the fade to paper
put(sfx, 52.0, wind(12, .22))
for k in range(9): put(sfx, 54.0 + k * .55, step(.35, -.5 + k * .1))
put(sfx, 54.9, airy(3.5, .38, 300, 4000))
# silence 2: 58.6-61.0 : three knocks
for tk, g in [(58.75, .8), (59.35, .85), (59.95, .9)]: put(sfx, tk, knock(g))
put(sfx, 63.4, airy(2.6, .3, 200, 2000))
put(sfx, 65.0 + .3, airy(2.8, .0))
# new sheet
put(sfx, 68.6, brush(2.0, .3, -.7, .7)); put(sfx, 70.4, brush(.75, .22, .0, .1))
bird(72.3, .05, .6)

# ---------------- score ----------------
BPM = 66; B = 60 / BPM; E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
KAL = ['A4', 'E5', 'C5', 'E5']; KAL_W = ['A4', 'E5', 'Bb4', 'E5']
# intro 0-15.5: kalimba ostinato, cello drone, hang
for k in range(int(15.5 / B)):
    t = k * B + .9
    if t < 15.5: n(t, 'kalimba', KAL[k % 4], 1.2, .38 + .1 * (k % 4 == 0), -.2 + .1 * (k % 4))
for t, p in [(1.0, 'A2'), (8.0, 'E3')]: n(t, 'cellos', p, 8, .22, 0)
n(6.0, 'hang', 'A3', 6, .25, .3)
# crack 15.5-33: piano arpeggio, wrong notes, glockenspiel at the blooms
for k in range(int((33 - 15.5) / (2 * B))):
    t = 15.5 + k * 2 * B
    for j, p in enumerate(['A3', 'C4', 'E4']): n(t + j * .3, 'upright', p, 1.6, .3 - .02 * j, -.1 + .1 * j)
    if k % 3 == 2: n(t + 1.0, 'upright', 'Bb4', 1.6, .32, .2)       # the wrong note
for t in [17.1, 20.6, 24.9, 33.6]: n(t, 'glockenspiel', 'E6', 3.0, .38, .3)
n(20.6, 'glockenspiel', 'Bb5', 3.0, .3, -.2)
for k in range(int((23.5 - 16.5) / B)):
    t = 16.5 + k * B; n(t, 'kalimba', KAL_W[k % 4], 1.2, .32, -.2 + .1 * (k % 4))
n(15.5, 'cellos', 'A2', 9, .26, 0); n(24.0, 'cellos', 'A2', 9, .24, 0)
# after the first mist (26-30): sparse, hopeful
for k, p in enumerate(['A4', 'E5', 'C5', 'E5', 'D5', 'E5']): n(26.5 + k * B * 1.5, 'kalimba', p, 1.5, .3, .1)
# thursday 32-38: low strings enter
n(32.5, 'cellos', 'A2', 7, .3, 0); n(32.5, 'violas', 'A3', 7, .2, -.3); n(32.5, 'violas', 'Bb3', 7, .13, .3)
# escalation 38-46.8: tremolo violins under, kalimba slowing
n(38.0, 'violins_trem', 'E4', 9, .2, .3); n(38.0, 'cellos', 'A1' if False else 'A2', 9, .34, 0)
for k, t in enumerate([38.4, 40.4, 42.8, 45.6]): n(t, 'kalimba', ['A4', 'Bb4', 'A4', 'Bb4'][k], 2.0, .3, .2)
# silence 46.9-49.5 (nothing)  ·  Monday look 50.0: one low piano note
n(50.0, 'piano', 'A2', 6, .5, 0); n(50.0, 'piano', 'Eb3', 6, .22, 0)
n(50.4, 'violas', 'A3', 8, .18, -.2); n(50.4, 'violas', 'Bb3', 8, .15, .2)
n(53.2, 'hang', 'A3', 5, .24, .2)
# 58.6-61.0 silence (knocks only)
n(61.2, 'cellos', 'A2', 6, .26, 0); n(61.2, 'violas', 'Bb3', 6, .14, .3)
# close 67-: kalimba alone, last note unresolved
for k, p in enumerate(['A4', 'E5', 'C5', 'E5', 'A4', 'E5', 'Bb4']): n(67.6 + k * B * 1.05, 'kalimba', p, 1.6, .32, 0)
mus = S.render(E, dur=DUR)
mus = S.room(mus, size=.5, mix=.22)
mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
# hard silences
def gate(buf, a, b, fi=.25, fo=.3):
    e = np.ones(N); i, j = int(a * SR), int(b * SR)
    e[i:j] = 0
    fo_n = int(fo * SR); e[max(0, i - fo_n):i] = np.linspace(1, 0, min(fo_n, i))
    fi_n = int(fi * SR); e[j:j + fi_n] = np.linspace(0, 1, fi_n)[:max(0, min(fi_n, N - j))]
    return buf * e[:, None]
mus = gate(mus, 46.9, 49.6); mus = gate(mus, 58.5, 61.0)
mus = fade(mus, .6, 1.5)

# ---------------- narration ----------------
dur = json.load(open(HERE + '/voices/dur.json'))
src = open(HERE + '/film.js').read()
vo_times = [(m[0], float(m[1])) for m in re.findall(r"\['(v\d\d)', ([\d.]+),", src)]
vo = np.zeros(N); duck = np.zeros(N)
def compress(x, thr=-24, ratio=3.0):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e)
    gdb = np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0); return x * 10 ** (gdb / 20)
for vid, t0 in vo_times:
    x, vsr = sf.read(f'{HERE}/voices/{vid}.wav')
    x = resample_poly(x, SR, vsr); x = hp(x, 90); x = compress(x)
    i = int(t0 * SR); j = min(N, i + len(x)); vo[i:j] += x[:j - i]
    a = max(0, i - int(.25 * SR)); b = min(N, j + int(.4 * SR)); duck[a:b] = 1
duck = lp(np.convolve(duck, np.ones(int(.3 * SR)) / int(.3 * SR), 'same'), 5)
act = duck > .5
def limit(x, ceil):
    pk = maximum_filter1d(np.abs(x), int(.005 * SR)); g = np.minimum(1, ceil / (pk + 1e-9))
    g = np.minimum.reduce([g, np.roll(g, int(.0025 * SR))]); g = lp(g, 200); return x * np.clip(g, 0, 1)
speech = np.abs(vo) > 10 ** (-40 / 20) * np.abs(vo).max()
vr = np.sqrt(np.mean(vo[np.convolve(speech, np.ones(2400), 'same') > 0] ** 2))
vo = limit(vo, vr * 10 ** (11 / 20))
mus_db = dbfs(mus[act]); vo_db = dbfs(vo[act])
vo *= 10 ** ((mus_db + 10 - vo_db) / 20)
mus *= (1 - .38 * duck)[:, None]
vo2 = verb(st(vo), .06)
mix = mus + vo2 + sfx * 1.0
pk = lambda x: round(20 * np.log10(np.abs(x).max() + 1e-12), 1)
print('peaks mus', pk(mus), 'vo', pk(vo2), 'sfx', pk(sfx)); print('music', round(dbfs(mus), 1), 'vo(active)', round(dbfs(vo2[act]), 1), 'sfx', round(dbfs(sfx), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True)
sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT')
print('wrote out/mix.wav')
