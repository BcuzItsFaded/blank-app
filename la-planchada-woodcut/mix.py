# narration (radio chain) + foley + 1930s hot-band score + optical-soundtrack ageing -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 62.4; N = int(DUR * SR); R = np.random.default_rng(1939); S.seed(19)
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

def carve(d, g=.4, pan=0.0):   # knife into wood: a rasp whose pitch follows the knife, with chips
    n = int(d * SR); t = np.arange(n) / SR; sp = .5 + .5 * np.abs(np.sin(2 * np.pi * (3.5 + 2 * np.sin(t * 1.3)) * t)); x = bp(nz(n), 700, 5200) * sp * (.55 + .45 * (nz(n) > .2)); x += hp(nz(n), 4000) * (R.random(n) < 60 / SR) * 2
    return norm(x * np.minimum(1, t / .05) * np.minimum(1, (d - t) / .15), .5) * g
def slap(): n = int(.3 * SR); return norm(lp(nz(n), 900) * env(n, .001, .05) + hp(nz(n), 2500) * env(n, .001, .015) * .4)
def pluck(f, d=.8): t = tt(d); return norm(sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (3 + k)) for k in (1, 2, 3, 4)))
def heartbeat(): return thud(48, .5) + np.pad(thud(44, .5), (int(.28 * SR), 0))[:int(.5 * SR)] * .7
def tamtam(d=3.0): t = tt(d); return norm(sum(np.sin(2 * np.pi * f * t + R.random() * 6) * np.exp(-t / tau) for f, tau in [(130, 1.4), (211, 1.0), (342, .8), (517, .6), (790, .4)]) + bp(nz(len(t)), 200, 3000) * env(len(t), .004, .3) * .4)
cues = []
def C(t, x, g=.5, pan=0.0): cues.append((t, x, g, pan))
PL = [(0, 3.4), (3.4, 8.15), (8.15, 11.5), (11.5, 15.2), (15.2, 18.5), (18.5, 20.9), (20.9, 21.6), (21.6, 24.45), (24.45, 27.0), (27.0, 29.75), (29.75, 32.5), (32.5, 35.3), (35.3, 36.7), (36.7, 40.4), (40.4, 43.0), (43.0, 46.8), (46.8, 49.1), (49.1, 50.3), (50.3, 53.5), (53.5, 56.0), (56.0, 59.0), (59.0, 62.4)]
for k, (a, b) in enumerate(PL):
    C(a - .02, slap(), .45, -.3 + (k % 3) * .3); C(a + .05, carve(min(1.8, (b - a) * .55), 1.0, (-.4, .4, 0)[k % 3]), .5)
# the title plate: the block is pulled and the print appears
C(.0, carve(1.0, 1.0), .3); C(.95, flap(.4) if 'flap' in globals() else slap(), .4)
# S1-S2
C(3.4, tamtam(2.5), .3); for_ = [C(4.0 + k * .45, step(), .2, .4 - k * .09) for k in range(7)]
C(12.0, hiss(.6), .35); C(13.0, hiss(.5), .35); C(14.4, hiss(.5), .3)
for k in range(6): C(19.66 + k * .24, pluck(660 + k * 80, .4), .22, (k - 2.5) * .15)
C(21.0, china(.8), .55); C(21.05, thud(70, .9), .5)
C(23.68, slidewhistle(700, 160, .9), .15); C(24.5, bell_ring(2.4), .22, .6); C(28.0, rubber_creak(.8), .25); C(28.8, thud(55, .7), .7)
for k in range(14): C(29.9 + k * .38, woodblock(2400 + 60 * (k % 3), .05), .08, .3)
C(34.25, clink(.6), .4, -.2)
for t0, f in [(41.0, 659), (41.4, 784), (42.0, 587)]: C(t0, pluck(f, 1.0), .3, .2)
C(40.65, woodblock(2300, .08), .45, -.3); C(40.8, woodblock(2000, .08), .45, .3)
C(48.5, pluck(1568, 2.0), .45, 0); C(49.1, thud(52, .7), .75)
for k in range(10): C(49.5 + k * .08, step(.08), .4, .1 + .08 * k)
C(55.7, pluck(1175, 1.4), .35); C(59.0, tamtam(3.0), .3); C(61.0, heartbeat(), .6); C(61.9, heartbeat(), .5)
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g)

# ---------------- music: low strings, wood and skin ----------------
E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def perc(t, name, v, pan=0, g=1): E.append(dict(t=t, inst=name, pitch=None, dur=.3, vel=v, pan=pan, gain=g))
def pulse(t0, t1, v=.5):
    t = t0
    while t < t1: n(t, 'contrabass_pizz', 'D2' if int((t - t0) / 1) % 2 == 0 else 'A1', .5, v); perc(t + .5, 'frame_drum', v * .5, .2); t += 1.0
def bowed(t0, d, notes, v=.4, inst='cellos'):
    for k, p in enumerate(notes): n(t0 + k * d, inst, p, d * 1.1, v)
pulse(1.0, 8.1, .35); n(.3, 'contrabass', 'D1' if False else 'D2', 7.5, .4); bowed(3.6, 1.1, ['D3', 'F3', 'A3', 'G3'], .35)
perc(.3, 'gran_cassa', .8); perc(3.4, 'gong', .7)
pulse(8.3, 15.1, .4); bowed(9.0, 1.2, ['A3', 'D4', 'C4', 'A3'], .38); perc(12.0, 'woodblock', .5)
bowed(15.4, 1.3, ['F3', 'A3', 'C4', 'A3'], .4, 'cellos'); n(15.4, 'violas', 'A3', 5.0, .25); pulse(15.4, 20.9, .25)
perc(21.0, 'gong', .9); n(21.0, 'cellos', 'Eb3', 1.0, .5)
n(21.7, 'cellos', 'D3', 2.6, .45); n(24.5, 'contrabass', 'A1', 5.0, .5); [perc(24.5 + k * 1.2, 'frame_drum', .5) for k in range(4)]
perc(28.8, 'gran_cassa', .9); pulse(29.9, 35.3, .25); bowed(30.6, 1.2, ['D4', 'F4', 'A4', 'G4'], .35, 'violas'); n(35.4, 'cellos', 'A3', 1.4, .45)
pulse(36.8, 40.5, .4); bowed(37.0, 1.1, ['D3', 'F3', 'A3'], .35); perc(40.7, 'woodblock', .5)
for k in range(int((46.7 - 43.2) / .5)): n(43.2 + k * .5, 'contrabass_pizz', ['D2', 'A2', 'F2', 'A2'][k % 4], .4, .55)
perc(49.5, 'gran_cassa', .9); [perc(49.5 + k * .1, 'woodblock', .5, .2) for k in range(8)]
pulse(50.5, 57.2, .3); bowed(51.6, 1.2, ['D3', 'F3', 'A3', 'D4', 'C4'], .38); n(58.0, 'cellos', 'D3', 3.5, .35); perc(59.0, 'gong', .5)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.35, mix=.15); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
def gate(buf, a, b, fo=.03, fi=.05):
    e = np.ones(N); i, j = int(a * SR), int(b * SR); e[i:j] = 0; e[max(0, i - int(fo * SR)):i] = np.linspace(1, 0, min(int(fo * SR), i)); e[j:j + int(fi * SR)] = np.linspace(0, 1, int(fi * SR))[:max(0, min(int(fi * SR), N - j))]; return buf * e[:, None]
mus = gate(mus, 21.05, 21.5); mus = gate(mus, 46.7, 49.1)
FXg = gate(FX, 46.7, 49.1, .02, .02); put(FXg, 48.5, st(pluck(1568, 2.0), 0) * .45)
fd = np.ones(N); fd[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR)) ** 1.5; mus *= fd[:, None]

# ---------------- narration ----------------
src = open(HERE + '/main.js').read()
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
vo = limit(vo, vr * 10 ** (11 / 20)); mus_db = dbfs(mus[act]); vo = vo * 10 ** ((mus_db + 7.5 - dbfs(vo[act])) / 20)
mus *= (1 - .4 * duck)[:, None]; FXg *= (1 - .25 * duck)[:, None]
mix = mus + verb(st(vo), .12) + FXg
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'fx', round(dbfs(FXg), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
