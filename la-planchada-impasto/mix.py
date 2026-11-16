# narration (radio chain) + foley + 1930s hot-band score + optical-soundtrack ageing -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 62.4; N = int(DUR * SR); R = np.random.default_rng(1937); S.seed(17)
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
cues = []
def C(t, x, g=.5, pan=0.0): cues.append((t, x, g, pan))
# sweeps: the next plate is laid over the last with a knife
for ts in [8.15, 15.2, 29.75, 36.7, 43.0, 50.3]: C(ts - .05, sweep_noise(.6, 1.0), .5, 0)
# S1
for k in range(12): C(.4 + k * .17, wetdab(), .22, -.6 + k * .1)
C(3.4, thud(50, 1.6), .6); C(3.45, clink(1.2), .2); C(5.45, swish(.5, .3), 1, -.6); C(6.35, thud(110, .3), .6, -.6)
# S2
for k in range(6): C(8.6 + k * 1.1, swish(.9, .25), 1, -.5)
# S3: colour re-laid; hearts; the break
C(15.4, swish(1.6, .35, True), 1); C(15.5, pluck(880, 1.2), .15, -.2)
for k in range(6): C(19.66 + k * .24, pluck(660 + k * 80, .4), .2, rng_pan := (k - 2.5) * .15)
C(21.0, china(.8), .55); C(21.05, thud(70, .9), .5)
# S4: rain, the swoon, the bell, the rubber-band
C(21.65, rain(2.8), .22); C(23.68, slidewhistle(700, 160, .9), .18); C(24.0, swish(.9, .2, True), 1)
C(24.5, bell_ring(2.4), .22, .6); C(28.9, bell_ring(.8), .15, .6)
for k in range(4): C(24.9 + k * 1.2, gasp(.9), .1, -.5)
C(26.86, swish(1.1, .25, True), 1); C(28.0, rubber_creak(.8), .3); C(28.8, thud(55, .7), .7); C(28.82, swish(.5, .3), 1)
# S5
for k in range(14): C(29.9 + k * .38, woodblock(2400 + 60 * (k % 3), .05), .08, .3)
C(34.25, clink(.6), .4, -.2); C(35.4, swish(.7, .3), 1)
# S6: morning
for t0 in (36.9, 38.4, 39.6): C(t0, birds(), .18, (-.6, .5, 0)[int(t0) % 3])
C(40.65, woodblock(2300, .08), .45, -.3); C(40.8, woodblock(2000, .08), .45, .3)
for t0, f in [(41.0, 659), (41.4, 784), (42.0, 587)]: C(t0, pluck(f, 1.0), .3, .2)
# S7: footsteps, silence, the recognition, the flight
for k in range(5): C(44.5 + k * .5, step(), .2, -.3 + k * .15)
C(48.5, pluck(1568, 2.0), .45, 0); C(49.1, thud(52, .7), .75)
for k in range(10): C(49.5 + k * .08, step(.08), .4, .1 + .08 * k)
# S8: care, the heart, the light goes out, the card is laid
C(55.7, pluck(1175, 1.4), .35); C(55.72, clink(.8), .2)
C(59.3, sweep_noise(1.0, 1.0), .4); C(59.7, sweep_noise(.9, 1.0), .4); C(60.3, sweep_noise(.8, 1.0), .35); C(60.6, sweep_noise(.8, 1.0), .35); C(61.0, heartbeat(), .6); C(61.9, heartbeat(), .5)
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g)

# ---------------- music: acoustic, hand-made grain; a lone violin and a cello, harp, piano, glockenspiel ----------------
B = 1.0; E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def arp(t0, t1, prog, inst='harp', v=.4):
    t = t0; i = 0
    while t < t1: c = prog[i % len(prog)]; [n(t + j * .33, inst, p, 1.4, v, -.3 + .3 * j) for j, p in enumerate(c)]; t += 1.0; i += 1
Dm = ['D3', 'A3', 'F4']; Gm = ['G3', 'D4', 'Bb4'] ; Bb = ['Bb2', 'F3', 'D4']; A7 = ['A2', 'E3', 'C#4']; F = ['F3', 'C4', 'A4']; C_ = ['C3', 'G3', 'E4']
MEL = [('D5', 2), ('F5', 1), ('A5', 2), ('G5', 1), ('F5', 1.5), ('E5', 1.5), ('D5', 3)]
def melody(t0, inst, v=.5, st_=1.0):
    t = t0
    for p, d in MEL: n(t, inst, p, d * st_ * .95, v, -.1); t += d * st_
    return t
# S1: cello drone, the violin theme enters with the nurse
n(.3, 'cellos', 'D2', 7.8, .4, 0); arp(1.0, 7.9, [Dm, Dm, Gm, A7], 'harp', .3); melody(3.6, 'violin', .55)
# S2
n(8.2, 'cellos', 'D2', 7.0, .35, 0); arp(8.3, 15.1, [Dm, Gm, A7, Dm], 'harp', .35); melody(9.0, 'flute', .4, 1.0)
# S3: warm, in the memory
arp(15.3, 20.9, [F, Bb, C_, F], 'harp', .4); n(15.3, 'upright', 'F3', 5.5, .35); melody(15.5, 'violin', .5, .9)
n(21.0, 'violin', 'F5', 1.2, .5); n(21.3, 'violin', 'E5', 1.0, .5); n(21.55, 'violin', 'Eb5', 2.0, .55)
# S4: grey, slow
n(21.7, 'cellos', 'D2', 2.6, .45); n(24.5, 'cellos', 'A1', 5.0, .4); n(24.6, 'violas', 'D3', 4.5, .22)
for k, p in enumerate(['A4', 'G4', 'F4', 'E4']): n(25.0 + k * 1.2, 'violin', p, 1.1, .4)
n(28.8, 'upright', 'D2', 1.5, .6)
# S5: tender; the silence at the push-in
arp(29.9, 35.3, [Dm, Gm, Bb, A7], 'upright', .3); melody(30.6, 'violin', .45, 1.1)
n(35.4, 'violin', 'A5', 1.4, .45); n(35.4, 'cellos', 'D2', 1.4, .4)
# S6: morning, light
arp(36.8, 40.5, [F, C_, Dm, A7], 'harp', .4); melody(37.0, 'flute', .45, .8)
# S7: tiptoe pizzicato, silence 46.8-49.1
for k in range(int((46.7 - 43.2) / .5)): n(43.2 + k * .5, 'contrabass_pizz', ['D2', 'A2', 'F2', 'A2'][k % 4], .4, .55)
n(48.5, 'harp', 'A6', 2.4, .5)
n(49.5, 'cellos', 'D2', .8, .8); [n(49.5 + k * .1, 'upright', ['D3', 'F3', 'A3', 'D4'][k % 4], .1, .6) for k in range(8)]
# S8: the reprise in D major; the light sinks, one long harmonic
arp(50.5, 58.0, [Dm, Gm, Bb, A7, ['D3', 'A3', 'F#4']], 'harp', .32); melody(51.6, 'violin', .45, 1.2)
n(58.0, 'violin', 'D6', 3.5, .35); n(58.0, 'cellos', 'D2', 3.5, .3); n(61.0, 'harp', 'F#5', 2.0, .3)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.55, mix=.24); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
def gate(buf, a, b, fo=.06, fi=.08):
    e = np.ones(N); i, j = int(a * SR), int(b * SR); e[i:j] = 0; e[max(0, i - int(fo * SR)):i] = np.linspace(1, 0, min(int(fo * SR), i)); e[j:j + int(fi * SR)] = np.linspace(0, 1, int(fi * SR))[:max(0, min(int(fi * SR), N - j))]; return buf * e[:, None]
mus = gate(mus, 21.0, 21.5); mus = gate(mus, 46.7, 49.1)       # hard silences: music and beds to digital zero
FXg = gate(FX, 46.7, 49.1, .02, .02)
for t0, x, g, pan in [(48.5, pluck(1568, 2.0), .45, 0), (48.5, thud(0, .01), 0, 0)]: put(FXg, t0, st(x, pan) * g * (1 - .3 * 0))
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
