# narration + paper/light foley + dark music-box score -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 60.4; N = int(DUR * SR); rng = np.random.default_rng(15); S.seed(15)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def noise(n): return rng.standard_normal(n)
def pink(n):
    w = np.fft.rfft(noise(n)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
def st(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4); return np.stack([x * l * 1.414, x * r * 1.414], 1)
def env(n, a, r): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
def dbfs(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
IRn = int(2.2 * SR); IR = np.stack([noise(IRn), noise(IRn)], 1) * np.exp(-np.arange(IRn) / SR * 2.6)[:, None]
IR = np.stack([lp(IR[:, 0], 4500), lp(IR[:, 1], 4500)], 1); IR /= np.sqrt((IR ** 2).sum(0))
def verb(x2, wet=.3):
    y = np.stack([fftconvolve(x2[:, 0], IR[:, 0])[:len(x2)], fftconvolve(x2[:, 1], IR[:, 1])[:len(x2)]], 1); return x2 * (1 - wet) + y * wet
sfx = np.zeros((N, 2)); bed = np.zeros((N, 2))
def put(buf, t, x):
    i = int(t * SR); j = min(N, i + len(x))
    if 0 <= i < N and j > i: buf[i:j] += x[:j - i]

# ---------------- foley ----------------
def paper(d=.5, g=.3, pan=0): n = int(d * SR); p = np.arange(n) / n; x = bp(noise(n), 1500, 8000) * np.sin(np.pi * p) ** .8 * (.6 + .4 * np.abs(np.sin(np.arange(n) / SR * 40))); return st(norm(x, .5) * g, pan)
def click(g=.4, pan=0): n = int(.12 * SR); t = np.arange(n) / SR; x = (bp(noise(n), 2000, 9000) * env(n, .0005, .012) + np.sin(2 * np.pi * 900 * t) * env(n, .0005, .02) * .4); return st(norm(x, .6) * g, pan)
def shimmer(d=1.2, g=.18, f0=1200): n = int(d * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f0 * k * (1 + .002 * np.sin(5 * t)) * t) / k for k in (1, 2, 3.01, 4.02)) * np.minimum(1, t / .08) * np.exp(-t * 2.2); return verb(st(norm(x, .5) * g), .35)
def thump(g=.7, f=62, d=1.4): n = int(d * SR); t = np.arange(n) / SR; x = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.4 * np.exp(-t * 16)) ) / SR) * np.exp(-t * 3.6) + lp(noise(n), 700) * env(n, .001, .1) * .5; return verb(st(norm(x, .9) * g), .3)
def clank(g=.4, pan=0): n = int(1.2 * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in [(380, 5), (910, 6), (1530, 9), (2300, 12)]) + bp(noise(n), 2000, 8000) * env(n, .001, .02); return verb(st(norm(x, .6) * g, pan), .3)
def ping(f, g=.2, pan=0): n = int(.9 * SR); t = np.arange(n) / SR; x = (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 7); return st(norm(x, .6) * g, pan)
def squawk(g=.25, f0=1250, pan=0):
    n = int(.34 * SR); t = np.arange(n) / SR; f = f0 * (1 + .7 * np.exp(-t * 7)) * (1 + .05 * np.sin(2 * np.pi * 38 * t))
    x = (np.sin(2 * np.pi * np.cumsum(f) / SR) + .5 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.minimum(1, t / .01) * np.exp(-t * 6); return verb(st(norm(bp(x, 500, 5000), .6) * g, pan), .35)
def wail(d=2.4, g=.22, f0=520, pan=0):
    n = int(d * SR); t = np.arange(n) / SR; f = f0 * (1 + .25 * np.sin(2 * np.pi * 4.5 * t) * .05 + .5 * t / d)
    x = (np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * t / d) ** 1.6; x = bp(x + .2 * pink(n) * np.sin(np.pi * t / d), 300, 3000); return verb(st(norm(x, .6) * g, pan), .55)
def step(g=.3, pan=0): n = int(.18 * SR); x = lp(noise(n), 500) * env(n, .003, .05) + np.sin(2 * np.pi * 70 * np.arange(n) / SR) * env(n, .002, .06); return st(norm(x, .6) * g, pan)
def whoosh(d, g, rev=False): n = int(d * SR); p = np.arange(n) / n; x = bp(pink(n), 250, 3500) * (p if rev else (1 - p)) ** 1.6; return st(norm(x, .5) * g)
def wind(d, g): n = int(d * SR); t = np.arange(n) / SR; gust = .5 + .5 * np.sin(2 * np.pi * .13 * t + 1) * np.sin(2 * np.pi * .05 * t); a = lp(pink(n), 420) * gust; b = lp(pink(n), 420) * gust; return np.stack([norm(a, .5), norm(b, .5)], 1) * g
def fadeb(x, fi, fo):
    n = len(x); e = np.ones(n); a = int(fi * SR); b = int(fo * SR)
    if a: e[:a] = np.linspace(0, 1, a) ** 1.5
    if b: e[-b:] = np.minimum(e[-b:], np.linspace(1, 0, b) ** 1.5)
    return x * e[:, None]

# room tone / wind beds (they drop out for the silences)
put(bed, 0, fadeb(wind(20, .18), 1, 2)); put(bed, 20, fadeb(wind(30, .15), 2, 2)); put(bed, 44, fadeb(wind(14, .24), 2, 1)); put(bed, 52, fadeb(wind(7.9, .12), 1, .2))
# cricket-ish night ticks in the first scenes and again at the end
for t0 in np.arange(.5, 6.9, .9): put(sfx, t0, st(norm(bp(noise(int(.05 * SR)), 4200, 5200), .5) * .03 * env(int(.05 * SR), .002, .02), rng.uniform(-.7, .7)))
# paper strips (titles)
for ts in [.1, .5, 2.5, 7.7, 10.3, 12.3, 17.9, 20.5, 24.2, 26.2, 29.9, 35.0, 36.9, 42.4, 44.9, 53.6, 55.4, 57.4]:
    put(sfx, ts, paper(.6, .22, rng.uniform(-.4, .4))); put(sfx, ts + .1, shimmer(1.0, .08, 900 + rng.uniform(-100, 300)))
# scene dissolves
for ts in [6.9, 15.9, 22.3, 29.4, 36.4, 40.0, 41.9, 44.5, 51.4]: put(sfx, ts - .1, whoosh(.7, .22))
# S1: windows light, the red one
put(sfx, 1.5, click(.3, -.3)); put(sfx, 1.55, shimmer(1.2, .14)); put(sfx, 4.5, click(.35, .0)); put(sfx, 4.55, wail(2.2, .2, 480, .1)); put(sfx, 5.2, thump(.5, 52, 1.6))
# S2: morning, windows warm, figures appear
for t0 in [7.2, 7.5, 7.8, 8.1]: put(sfx, t0, click(.22, rng.uniform(-.5, .5)))
put(sfx, 7.4, shimmer(1.6, .16, 1500)); put(sfx, 9.6, paper(.5, .12, -.3)); put(sfx, 11.5, paper(.5, .12, .3))
for tb in [8.4, 9.2, 10.6, 12.9, 14.0]:
    for k in range(rng.integers(3, 6)): put(sfx, tb + k * .11, st(norm(bp(noise(int(.09 * SR)), 2800, 5200), .5) * .05 * env(int(.09 * SR), .004, .03), rng.uniform(-.7, .7)))
# S3: the hit, lights out, city wakes (no graphic sound; a low strike and silence)
put(sfx, 16.75, thump(.95, 48, 2.4)); put(sfx, 16.75, clank(.35)); put(sfx, 17.3, thump(.6, 44, 1.8))
for t0 in [17.4, 17.9, 18.4, 18.9]: put(sfx, t0, click(.3, rng.uniform(-.5, .5)))
for i in range(26): put(sfx, 20.2 + i * .06, ping(rng.choice([1568, 1760, 2093, 2349]), .05, rng.uniform(-.8, .8)))
# S4: gold
put(sfx, 24.6, shimmer(2.0, .22, 700)); put(sfx, 24.55, paper(.8, .2))
for i in range(70): put(sfx, 25.2 + i * .045 + .03, ping(rng.uniform(2400, 3900), rng.uniform(.04, .09), rng.uniform(-.5, .5)))
put(sfx, 26.7, whoosh(1.4, .28)); put(sfx, 26.7, st(norm(lp(noise(int(1.6 * SR)), 300), .4) * .2 * np.linspace(0, 1, int(1.6 * SR))))
# S5: the parrot
for k, tt in enumerate([33.0, 33.38, 33.76, 34.5, 34.9]): put(sfx, tt, squawk(.3 - .02 * k, 1250 + 80 * (k % 2), .0))
put(sfx, 32.0, shimmer(1.0, .08, 600))
# S6: bars, stamp, thread
put(sfx, 36.5, clank(.5, -.3)); put(sfx, 38.0, clank(.3, .3))
put(sfx, 40.45, thump(1.0, 70, 1.2)); put(sfx, 40.45, paper(.25, .5)); put(sfx, 40.45, clank(.3))
for i in range(11): put(sfx, 42.2 + i * .17, paper(.14, .08, rng.uniform(-.5, .5)))
put(sfx, 41.9, click(.25));
# S7: ghosts, footsteps
for t0, p in [(46.3, -.3), (47.8, .4), (49.0, .3)]: put(sfx, t0, wail(2.8, .26, rng.uniform(420, 620), p))
for i in range(9): put(sfx, 47.0 + i * .38, step(.28, -.15 + .04 * i))
# S8: the truth, then the lamp goes off
put(sfx, 53.6, thump(.6, 55, 2.0)); put(sfx, 55.4, thump(.4, 50, 1.6))
put(sfx, 57.0, whoosh(2.3, .3, True))
put(sfx, 59.78, click(.7, 0)); put(sfx, 59.8, st(norm(bp(noise(int(.4 * SR)), 100, 800), .5) * .2 * env(int(.4 * SR), .001, .08)))

# ---------------- music: a music-box lullaby in D minor, dark strings ----------------
B = 60 / 66; E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
MEL = ['D5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C#5', 'D5', 'A4', 'Bb4', 'A4']
def lullaby(t0, t1, vel=.5, octave=0, step=1.0):
    t = t0; i = 0
    while t < t1: p = MEL[i % len(MEL)]; n(t, 'glockenspiel', p[:-1] + str(int(p[-1]) + octave), 1.4, vel * (1 if i % 3 == 0 else .75), -.25 + .1 * (i % 5)); t += B * step; i += 1
# S1 night
lullaby(.9, 6.9, .5); n(.3, 'cellos', 'D2', 6.6, .3, 0); n(.3, 'contrabass', 'D2', 6.6, .25, 0)
# S2 morning: warm, harp arpeggio + music box
for k in range(int(8.8 / B)): n(7.1 + k * B, 'harp', ['D4', 'A4', 'F4', 'A4'][k % 4] if k % 8 < 6 else ['G4', 'D5', 'Bb4', 'D5'][k % 4], 1.4, .4, .15)
lullaby(7.3, 15.8, .38, 0, 2); n(7.0, 'violas', 'D3', 8.6, .22, 0); n(7.0, 'cellos', 'D2', 8.6, .22, 0)
# S3: dread: tremolo cluster, no melody; gated hole at 19.0-20.1
n(15.9, 'violins_trem', 'D4', 3.2, .32, -.2); n(15.9, 'violins_trem', 'Eb4', 3.2, .3, .2); n(15.9, 'cellos', 'D2', 3.4, .4, 0); n(15.9, 'contrabass', 'D1' if False else 'D2', 3.4, .4, 0)
n(20.1, 'glockenspiel', 'A5', 2.2, .35, .3); n(20.4, 'glockenspiel', 'Bb5', 2.2, .3, -.3); n(20.7, 'violins_trem', 'A4', 2.0, .3, 0); n(20.1, 'cellos', 'D2', 2.2, .35, 0)
# S4: gold, low pulse + chimes
for k in range(int(7 / B)): n(22.4 + k * B, 'contrabass', 'D2' if k % 4 < 2 else 'Bb1' if False else 'D2', B * .9, .35, 0)
n(22.4, 'hang', 'D3', 6.8, .3, .2); n(25.0, 'glockenspiel', 'F6', 2.0, .3, .3)
for k in range(10): n(24.7 + k * .28, 'glockenspiel', ['A5', 'D6', 'F6', 'A5', 'C6'][k % 5], .9, .2, rng.uniform(-.5, .5))
# S5: parrot: eerie held strings
n(29.4, 'violas', 'D3', 3.5, .3, -.3); n(29.4, 'violas', 'Eb3', 3.5, .22, .3); n(33.0, 'violins_trem', 'A4', 3.4, .34, 0); n(33.0, 'cellos', 'D2', 3.4, .4, 0)
lullaby(29.8, 32.8, .3, 1, 1.5)
# S6: slow music box, stamp silence 40.0-40.45
lullaby(36.6, 39.9, .42, 0, 1.5); n(36.4, 'cellos', 'D2', 3.5, .3, 0)
n(40.5, 'tubular_bells', 'D4', 3, .5, 0); n(41.9, 'violas', 'D3', 2.6, .26, 0); lullaby(42.0, 44.4, .32, 0, 1.4)
# S7: haunting: hang, high violins, detuned music box
n(44.5, 'hang', 'D3', 7, .34, 0); n(44.5, 'violins_trem', 'A5', 7, .2, .2); n(44.5, 'cellos', 'D2', 7, .34, 0)
for k, p in enumerate(['A5', 'Bb5', 'A5', 'G#5', 'A5', 'D6']): n(45.3 + k * B * 1.2, 'glockenspiel', p, 1.6, .26, rng.uniform(-.4, .4))
# S8: truth: the lullaby returns slowly, ends on an open fifth; silence after 59.8
n(51.4, 'cellos', 'D2', 8, .32, 0); n(51.4, 'violas', 'A3', 8, .2, .2); lullaby(52.2, 58.4, .4, 0, 1.5)
n(58.6, 'glockenspiel', 'D5', 1.6, .4, 0); n(58.6, 'glockenspiel', 'A5', 1.6, .34, 0)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.7, mix=.34)
mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
def gate(buf, a, b, fo=.08, fi=.15):
    e = np.ones(N); i, j = int(a * SR), int(b * SR); e[i:j] = 0; e[max(0, i - int(fo * SR)):i] = np.linspace(1, 0, min(int(fo * SR), i)); e[j:j + int(fi * SR)] = np.linspace(0, 1, int(fi * SR))[:max(0, min(int(fi * SR), N - j))]; return buf * e[:, None]
mus = gate(mus, 19.0, 20.05); mus = gate(mus, 40.0, 40.45, .05, .1); mus = gate(mus, 59.75, 60.4, .04, .1)
bed = gate(bed, 40.0, 40.45, .05, .1); bed = gate(bed, 59.75, 60.4, .04, .1)

# ---------------- narration ----------------
src = open(HERE + '/film.js').read()
vo_times = [(m[0], float(m[1])) for m in re.findall(r"\['(v\d\d)', ([\d.]+),", src)]
vo = np.zeros(N); duck = np.zeros(N)
def compress(x, thr=-24, ratio=3.0):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e); return x * 10 ** (np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0) / 20)
for vid, t0 in vo_times:
    x, vsr = sf.read(f'{HERE}/voices/{vid}.wav'); x = hp(compress(hp(resample_poly(x, SR, vsr), 80)), 60)
    i = int(t0 * SR); j = min(N, i + len(x)); vo[i:j] += x[:j - i]
    duck[max(0, i - int(.2 * SR)):min(N, j + int(.4 * SR))] = 1
duck = lp(np.convolve(duck, np.ones(int(.3 * SR)) / int(.3 * SR), 'same'), 5); act = duck > .5
def limit(x, ceil):
    pk = maximum_filter1d(np.abs(x), int(.005 * SR)); g = np.minimum(1, ceil / (pk + 1e-9)); g = np.minimum.reduce([g, np.roll(g, int(.0025 * SR))]); return x * np.clip(lp(g, 200), 0, 1)
speech = np.abs(vo) > 10 ** (-40 / 20) * np.abs(vo).max(); vr = np.sqrt(np.mean(vo[np.convolve(speech, np.ones(2400), 'same') > 0] ** 2))
vo = limit(vo, vr * 10 ** (11 / 20)); mus_db = dbfs(mus[act]); vo = vo * 10 ** ((mus_db + 5.5 - dbfs(vo[act])) / 20)
mus *= (1 - .38 * duck)[:, None]; sfx_g = 1 - .35 * duck[:, None]
mix = mus + verb(st(vo), .1) + bed * (1 - .5 * duck[:, None]) + sfx * sfx_g
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'sfx', round(dbfs(sfx), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
