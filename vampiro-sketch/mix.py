# Spanish narration + pen/page foley + night ambience + an original solo nylon guitar in A minor -> out/mix.wav
import json, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__)); SR = 48000
LINES = json.load(open(f'{HERE}/lines.json')); DUR = json.load(open(f'{HERE}/voices/dur.json'))
R = np.random.default_rng(1874); GAP = .2
S_LINE, t = [], .3
for l in LINES: S_LINE.append(t); t += DUR[l['id']] + GAP
def Lt(i, f): return S_LINE[i - 1] + f * (DUR[LINES[i - 1]['id']] + GAP)
def LEND(i): return S_LINE[i - 1] + DUR[LINES[i - 1]['id']] + GAP
TOTAL = LEND(9) + 3.6; N = int(TOTAL * SR)
CUTS = [0] + [Lt(i, 0) for i in range(2, 10)] + [LEND(9) + .1]

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def nz(n): return R.standard_normal(n)
def pink(n): w = np.fft.rfft(nz(n)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.): return x / (np.abs(x).max() + 1e-9) * p
def tt(d): return np.arange(int(d * SR)) / SR
def st(x, pan=0.): l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4); return np.stack([x * l * 1.414, x * r * 1.414], 1)
def put(buf, t0, x):
    i = int(t0 * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf) and j > i: buf[i:j] += x[:j - i]
def compress(x, thr=-24, ratio=3.):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e); return x * 10 ** (np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0) / 20)

# narration
vo = np.zeros((N, 2)); duck = np.zeros(N)
for i, l in enumerate(LINES):
    x, vsr = sf.read(f'{HERE}/voices/{l["id"]}.wav')
    if x.ndim > 1: x = x.mean(1)
    x = compress(hp(resample_poly(x, SR, vsr), 80)); i0 = int(S_LINE[i] * SR); j = min(N, i0 + len(x))
    vo[i0:j] += st(x[:j - i0] * .95); duck[max(0, i0 - int(.2 * SR)):min(N, j + int(.4 * SR))] = 1
duck = 1 - .6 * np.clip(lp(np.convolve(duck, np.ones(int(.3 * SR)) / int(.3 * SR), 'same'), 5), 0, 1)

FX = np.zeros((N, 2))
def pen(d=.06, g=.1): n = int(d * SR); e = np.sin(np.pi * np.arange(n) / n) ** .7; return norm(bp(nz(n), 1600, 7500) * e * (.6 + .4 * (R.random(n) > .55)), g)
def page_turn(g=.3): n = int(.5 * SR); p = np.arange(n) / n; return norm(bp(pink(n), 500, 6000) * np.sin(np.pi * p) ** 1.4, g)
for k, c in enumerate(CUTS):
    nxt = CUTS[k + 1] if k + 1 < len(CUTS) else TOTAL; Td = min(2.2, (nxt - c) * .4)
    if k: put(FX, c - .08, st(page_turn(.26), .3 if k % 2 else -.3))
    tp = c + .05
    while tp < c + Td * .85: d = R.uniform(.03, .14); put(FX, tp, st(pen(d, R.uniform(.04, .09)), R.uniform(-.4, .4))); tp += d * R.uniform(.6, 1.3)
for i, c in enumerate(S_LINE):   # the handwritten subtitles
    for k in range(5): put(FX, c + k * .11, st(pen(.05, .03), -.5))
# night: crickets and wind, a far cemetery bell
def crickets(d, g=.05):
    n = int(d * SR); t_ = np.arange(n) / SR; car = np.sin(2 * np.pi * 4300 * t_); gate = (np.sin(2 * np.pi * 28 * t_) > .3) * (np.sin(2 * np.pi * .9 * t_ + R.random() * 6) > -.2)
    return norm(car * lp(gate.astype(float), 200), g)
def wind(d, g=.06): n = int(d * SR); t_ = np.arange(n) / SR; a = lp(pink(n), 500) * (.5 + .5 * np.sin(2 * np.pi * .11 * t_)); return norm(a, g)
def bell(f=220, d=4, g=.12): t_ = tt(d); x = sum(np.sin(2 * np.pi * f * m * t_) * np.exp(-t_ * dk) * a for m, dk, a in [(1, .9, 1), (2.4, 1.6, .5), (3.9, 2.4, .3), (5.4, 3.1, .2)]); return norm(x, g)
night = [(0, Lt(3, 0)), (Lt(4, 0), Lt(6, 0)), (Lt(6, 0), Lt(8, 0))]
for a, b in night: put(FX, a, st(crickets(b - a, .035), .5)); put(FX, a, st(crickets(b - a, .03), -.5)); put(FX, a, st(wind(b - a, .05), 0))
put(FX, .6, st(bell(196, 5, .12), .3)); put(FX, Lt(6, .1), st(bell(196, 5, .1), -.3)); put(FX, LEND(9) + .2, st(bell(196, 3.4, .1), 0))
# dawn: a rooster far away? no — morning birds, thin
for k in range(8): put(FX, Lt(3, .1) + k * .7 + R.random() * .3, st(norm(np.sin(2 * np.pi * np.cumsum(R.uniform(2800, 4200) * (1 + .3 * np.sin(2 * np.pi * 30 * tt(.09)))) / SR) * np.sin(np.pi * tt(.09) / .09) ** 2, .025), R.uniform(-.6, .6)))
# the chase: running steps, a murmuring crowd, torches crackling
def step(g=.12): n = int(.09 * SR); return norm(lp(nz(n), 700) * np.exp(-np.arange(n) / SR * 45), g)
tp = Lt(4, 0)
while tp < Lt(5, 0): put(FX, tp, st(step(R.uniform(.06, .12)), R.uniform(-.6, .6))); tp += R.uniform(.09, .2)
n = int((Lt(5, 0) - Lt(4, 0)) * SR); crowd = bp(pink(n), 250, 1600) * (.6 + .4 * np.abs(np.sin(np.arange(n) / SR * 3.1))); put(FX, Lt(4, 0), st(norm(crowd, .08), 0))
crk = (R.random(n) < 60 / SR) * R.uniform(.3, 1, n); put(FX, Lt(4, 0), st(norm(bp(np.convolve(crk, np.exp(-np.arange(200) / 25), 'same'), 1500, 6000), .06), .2))
# the stake: a dull wooden knock off-screen, then the curse as a low breath
def thud(g=.4): t_ = tt(.6); return norm(np.sin(2 * np.pi * np.cumsum(60 * (1 + .8 * np.exp(-t_ * 25))) / SR) * np.exp(-t_ * 8) + lp(nz(len(t_)), 400) * np.exp(-t_ * 30) * .5, g)
put(FX, Lt(5, .36), st(thud(.4), 0))
n = int(2.5 * SR); p = np.arange(n) / n; put(FX, Lt(5, .5), st(norm(bp(pink(n), 150, 900) * np.sin(np.pi * p) ** 1.2, .1), 0))
# the tree: wood creaking as it grows; roots grinding under the tomb
def creak(d, g=.08): n = int(d * SR); t_ = np.arange(n) / SR; f = 90 + 60 * np.sin(t_ * 2.3); return norm(bp(2 * ((np.cumsum(f) / SR) % 1) - 1, 200, 1500) * np.minimum(1, t_ / .2) * np.minimum(1, (d - t_) / .3), g)
put(FX, Lt(6, .25), st(creak(3.2, .07), .2)); put(FX, Lt(7, .1), st(creak(3, .06), -.2)); put(FX, Lt(9, .1), st(creak(2.8, .07), 0))
n = int(2 * SR); put(FX, Lt(7, .45), st(norm(lp(nz(n), 260) * np.sin(np.pi * np.arange(n) / n), .12), 0))   # the slab cracking
# the eyes: two slow low heartbeats
def beat(g=.3): t_ = tt(.5); x = np.sin(2 * np.pi * 48 * t_) * np.exp(-t_ * 12); x2 = np.pad(np.sin(2 * np.pi * 44 * t_[:int(.4 * SR)]) * np.exp(-t_[:int(.4 * SR)] * 14), (int(.22 * SR), 0))[:len(t_)] * .7; return norm(x + x2, g)
for k in range(4): put(FX, Lt(9, .72) + k * .95, st(beat(.32), 0))

# score: an original solo nylon guitar, A minor, arpeggios in 3/4 at 72 bpm, a low drone under it
SC = np.zeros((N, 2)); BEAT = 60 / 72 / 2
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def pluck(f, d=1.6, g=.12):   # Karplus-Strong style nylon string
    n = int(d * SR); L = max(2, int(SR / f)); buf = R.uniform(-1, 1, L); out = np.zeros(n)
    for i in range(n): out[i] = buf[i % L]; buf[i % L] = .5 * (buf[i % L] + buf[(i + 1) % L]) * .996
    return norm(lp(out, 3000) * np.minimum(1, np.arange(n) / 80), g)
CH = [(45, [0, 7, 12, 15, 19, 15]), (41, [0, 7, 12, 16, 19, 16]), (43, [0, 7, 12, 16, 19, 16]), (40, [0, 7, 12, 14, 19, 14])]   # Am F G E (sus feel)
cache = {}
def pl(m, g): k = (m, round(g, 3)); cache.setdefault(k, pluck(mtof(m), 1.6, g)); return cache[k]
SIL0, SIL1 = LEND(8) - .35, S_LINE[8] + .9
bar, tm = 0, .2
while tm < LEND(9):
    root, arp = CH[bar % 4]
    for k, iv in enumerate(arp):
        tb = tm + k * BEAT
        if SIL0 < tb < SIL1 or tb > LEND(9): continue
        put(SC, tb, st(pl(root + iv + (12 if k else 0), .1 if k else .14), -.2 + .08 * k))
    tm += 6 * BEAT; bar += 1
dr = np.sin(2 * np.pi * mtof(33) * tt(TOTAL)) * .5 + np.sin(2 * np.pi * mtof(40) * tt(TOTAL)) * .25
dr = norm(lp(dr, 200), .05); dr[int(SIL0 * SR):int(SIL1 * SR)] *= .05; SC += st(dr[:N], 0)
for m in [45, 52, 57, 60, 64]: put(SC, LEND(9) + .15, st(pluck(mtof(m), 3.3, .1), 0))   # a last open A minor chord on the end card
SC = SC * (duck[:, None] * .9 + .1)
room = st(norm(lp(pink(N), 700), .5) * .016, 0)[:N]; room[int(SIL0 * SR):int(SIL1 * SR)] *= .1
mix = vo + FX * .9 + SC * .85 + room
mix = mix / (np.abs(mix).max() + 1e-9) * .9
os.makedirs(f'{HERE}/out', exist_ok=True); sf.write(f'{HERE}/out/mix.wav', mix.astype(np.float32), SR, subtype='PCM_16')
print('mix', round(TOTAL, 2), 's')
