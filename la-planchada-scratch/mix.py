# narration (radio chain) + foley + 1930s hot-band score + optical-soundtrack ageing -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 62.4; N = int(DUR * SR); R = np.random.default_rng(1942); S.seed(22)
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

def knifepaper(d=.4, g=.5, pan=0.0):   # knife through paper: a transient + band-passed fibre tearing
    n = int(d * SR); t = np.arange(n) / SR; tear = bp(nz(n), 1200, 5500) * (.5 + .5 * np.abs(np.sin(2 * np.pi * (6 + 10 * t / d) * t))) * np.minimum(1, t / .003) * np.exp(-t * 6)
    trans = hp(nz(n), 3000) * env(n, .001, .02) * .8; return norm(tear + trans, .6) * g
def sheet_tear(d=.7, g=.6):            # a sheet peeled away
    n = int(d * SR); t = np.arange(n) / SR; x = bp(nz(n), 800, 6000) * (t / d) ** .5 * np.minimum(1, (d - t) / .1); return norm(x, .6) * g
def paper_air(d=.5, g=.3): n = int(d * SR); p = np.arange(n) / n; return norm(bp(pink(n), 400, 3000) * np.sin(np.pi * p) ** 1.5, .5) * g
def bowstroke(f, d, g=.4): t = tt(d); x = np.sin(2 * np.pi * f * t) * (1 - .5 * np.exp(-t * 8)) * np.minimum(1, t / .08) * np.minimum(1, (d - t) / .3) + .3 * np.sin(4 * np.pi * f * t) * np.minimum(1, t / .12); return norm(x, .5) * g
cues = []
def C(t, x, g=.5, pan=0.0): cues.append((t, x, g, pan))
# the print sounds: the loudest events, only on the steam/peel transitions and the final verdict
C(14.85, sheet_tear(.8, .7), 1); C(14.9, knifepaper(.5, .6), .9)
C(21.25, sheet_tear(.8, .7), 1); C(21.3, knifepaper(.5, .6), .9)
C(48.95, sheet_tear(.7, .65), 1); C(49.0, knifepaper(.5, .6), .9)
# the world: rain (version A), a bell, wind, steps on the ground
C(21.7, paper_air(2.4, .3), 1)  # rain hiss onset
C(24.5, bell_ring(2.4), .2, .6)
for k in range(8): C(4.0 + k * .5, step(), .18, .3 - k * .08)
C(5.45, knifepaper(.25, .3), .3, -.5); C(6.35, thud(110, .3), .4, -.5)
for k in range(5): C(30.6 + k * .5, step(.1), .16, -.2 + .1 * k)
# her heart: the one red, a soft knife mark; the heartbreak split = one heavy low stroke after silence
for k in range(6): C(19.66 + k * .24, knifepaper(.12, .14), .2, (k - 2.5) * .12)
C(21.0, knifepaper(.5, .5), .6); C(21.05, thud(62, 1.0), .6)
C(28.0, bowstroke(180, .8, .3), .4); C(28.8, thud(55, .7), .6)
for k in range(5): C(44.5 + k * .5, step(.1), .14, -.3 + .15 * k)
C(55.7, knifepaper(.2, .3), .3)
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g)

# ---------------- music: a small chamber group; a slow three-beat that can stop ----------------
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def perc(t, name, v, pan=0, g=1): E.append(dict(t=t, inst=name, pitch=None, dur=.3, vel=v, pan=pan, gain=g))
MEL = ['D5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C#5', 'D5', 'A4', 'Bb4', 'A4']
def melody(t0, t1, inst, vel=.4, step=.9):
    t = t0; i = 0
    while t < t1: n(t, inst, MEL[i % len(MEL)], 1.4, vel * (1 if i % 3 == 0 else .72), -.15 + .08 * (i % 5)); t += step; i += 1
def pulse(t0, t1, v=.3, root='D2'):   # a slow three-beat: pizz bass + horn pad
    t = t0; k = 0
    while t < t1: n(t, 'contrabass_pizz', [root, 'A1', 'F2'][k % 3], .5, v); t += .9; k += 1
# S1 night: low horn drone + harp; the vibraphone theme enters with her
n(.3, 'cellos', 'D2', 7.8, .3); n(.3, 'horn', 'D3', 7.8, .18, 0); melody(3.6, 8.0, 'vibraphone', .4)
# S2 uniform
n(8.2, 'cellos', 'D2', 7.0, .28); pulse(8.4, 15.1, .28); melody(9.0, 15.0, 'harp', .34, .8)
# S3 memory: warmer, horn + harp
n(15.4, 'horn', 'F3', 5.6, .2); melody(15.6, 20.9, 'vibraphone', .4, .8); n(15.4, 'cellos', 'F2', 5.4, .25)
# the heartbreak: silence 21.0-21.5 (gated), then one heavy low stroke
n(21.6, 'cellos', 'D2', 2.8, .35); n(21.6, 'contrabass', 'D2', 2.8, .3)
# S4 rain/versions: sparse, bowed low strings
n(24.5, 'contrabass', 'A1' if False else 'A2', 5.0, .3); n(24.6, 'cellos', 'Eb3', 4.5, .2)
for k, p in enumerate(['A5', 'G5', 'F5', 'E5']): n(25.0 + k * 1.1, 'glockenspiel', p, 1.0, .28)
# S5 night visit: tender vibraphone + harp
n(29.9, 'cellos', 'D2', 6.4, .25); pulse(29.9, 35.3, .24); melody(30.6, 35.3, 'vibraphone', .36, 1.0)
n(35.4, 'glockenspiel', 'A5', 1.6, .34)
# S6 morning: the sky carved open — xylophone + harp rising, horn
n(36.8, 'horn', 'D3', 3.6, .22); melody(37.0, 40.5, 'xylophone', .34, .75); melody(38.0, 42.5, 'harp', .3, .9)
# S7 truth: pizz tiptoe, then silence 46.7-49.1
for k in range(int((46.7 - 43.2) / .5)): n(43.2 + k * .5, 'contrabass_pizz', ['D2', 'A2', 'F2', 'A2'][k % 4], .4, .3)
n(48.5, 'glockenspiel', 'A5', 2.4, .4)
# the verdict after the silence: one timpani stroke, then the reprise
n(49.5, 'timpani', 'D3', .4, .7); n(49.5, 'cellos', 'D2', 1.0, .5)
# S8 reprise: the vibraphone theme over harp + horn, resolving
n(50.6, 'cellos', 'D2', 7.0, .26); n(50.6, 'horn', 'D3', 7.0, .18); pulse(50.6, 58.0, .22); melody(51.6, 58.4, 'vibraphone', .4, 1.0)
n(58.6, 'vibraphone', 'D5', 2.4, .4); n(58.6, 'harp', 'A5', 2.4, .3); n(58.6, 'cellos', 'D3', 3.0, .25)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.55, mix=.26); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
def gate(buf, a, b, fo=.05, fi=.1):
    e = np.ones(N); i, j = int(a * SR), int(b * SR); e[i:j] = 0; e[max(0, i - int(fo * SR)):i] = np.linspace(1, 0, min(int(fo * SR), i)); e[j:j + int(fi * SR)] = np.linspace(0, 1, int(fi * SR))[:max(0, min(int(fi * SR), N - j))]; return buf * e[:, None]
mus = gate(mus, 21.0, 21.55); mus = gate(mus, 46.7, 49.1)
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
vo = limit(vo, vr * 10 ** (11 / 20)); mus_db = dbfs(mus[act]); vo = vo * 10 ** ((mus_db + 11 - dbfs(vo[act])) / 20)
mus *= (1 - .4 * duck)[:, None]; FXg *= (1 - .25 * duck)[:, None]
mix = mus + verb(st(vo), .12) + FXg
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'fx', round(dbfs(FXg), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
