# Spanish narration + pen/page foley + night sea and crickets + a bell + a solo nylon guitar in D minor -> out/mix.wav
import json, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 48000
LINES = json.load(open(f'{HERE}/lines.json')); DUR = json.load(open(f'{HERE}/voices/dur.json'))
R = np.random.default_rng(1600); GAP = .2
S_LINE, t = [], .3
for l in LINES: S_LINE.append(t); t += DUR[l['id']] + GAP
def Lt(i, f): return S_LINE[i - 1] + f * (DUR[LINES[i - 1]['id']] + GAP)
def LEND(i): return S_LINE[i - 1] + DUR[LINES[i - 1]['id']] + GAP
TOTAL = LEND(10) + 3.4; N = int(TOTAL * SR)
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
vo = np.zeros((N, 2)); duck = np.zeros(N)
for i, l in enumerate(LINES):
    x, vsr = sf.read(f'{HERE}/voices/{l["id"]}.wav')
    if x.ndim > 1: x = x.mean(1)
    x = compress(hp(resample_poly(x, SR, vsr), 80)); i0 = int(S_LINE[i] * SR); j = min(N, i0 + len(x))
    vo[i0:j] += st(x[:j - i0] * .95); duck[max(0, i0 - int(.2 * SR)):min(N, j + int(.4 * SR))] = 1
duck = 1 - .6 * np.clip(lp(np.convolve(duck, np.ones(int(.3 * SR)) / int(.3 * SR), 'same'), 5), 0, 1)
FX = np.zeros((N, 2))
def pen(d=.06, g=.1): n = int(d * SR); e = np.sin(np.pi * np.arange(n) / n) ** .7; return norm(bp(nz(n), 1600, 7500) * e, g)
def page_turn(g=.28): n = int(.5 * SR); p = np.arange(n) / n; return norm(bp(pink(n), 500, 6000) * np.sin(np.pi * p) ** 1.4, g)
CUTS = [0] + [Lt(i, 0) for i in range(2, 11)] + [LEND(10) + .1]
for k, c in enumerate(CUTS[:-1]):
    if k: put(FX, c - .08, st(page_turn(.25), .3 if k % 2 else -.3))
    tp = c + .05
    while tp < c + .9: d = R.uniform(.03, .12); put(FX, tp, st(pen(d, R.uniform(.04, .08)), R.uniform(-.4, .4))); tp += d * R.uniform(.7, 1.3)
def crickets(d, g=.035):
    n = int(d * SR); t_ = np.arange(n) / SR; car = np.sin(2 * np.pi * 4300 * t_); gate = ((np.sin(2 * np.pi * 28 * t_) > .3) & (np.sin(2 * np.pi * .9 * t_) > -.2)).astype(float)
    return norm(car * lp(gate, 200), g)
def sea(d, g=.05): n = int(d * SR); t_ = np.arange(n) / SR; return norm(lp(pink(n), 500) * (.55 + .45 * np.sin(2 * np.pi * .09 * t_)), g)
put(FX, 0, st(crickets(LEND(10), .03), .4)); put(FX, 0, st(sea(LEND(10), .05), -.2))
def bell(f=220, d=4, g=.12): t_ = tt(d); x = sum(np.sin(2 * np.pi * f * m * t_) * np.exp(-t_ * dk) * a for m, dk, a in [(1, .9, 1), (2.4, 1.6, .5), (3.9, 2.4, .3)]); return norm(x, g)
put(FX, Lt(6, 0), st(bell(246, 4, .1), .3)); put(FX, LEND(10) + .2, st(bell(196, 4, .1), 0))
def thud(g=.35): t_ = tt(.6); return norm(np.sin(2 * np.pi * np.cumsum(60 * (1 + .8 * np.exp(-t_ * 25))) / SR) * np.exp(-t_ * 8), g)
put(FX, Lt(7, 0) + .1, st(thud(.3), 0))
# the ship drawn in one stroke and the wall creaks as it starts to move
def creak(d, g=.07): n = int(d * SR); t_ = np.arange(n) / SR; f = 90 + 60 * np.sin(t_ * 2.3); return norm(bp(2 * ((np.cumsum(f) / SR) % 1) - 1, 200, 1500) * np.minimum(1, t_ / .2) * np.minimum(1, (d - t_) / .3), g)
put(FX, Lt(8, .1), st(creak(2.5, .06), .2))
SC = np.zeros((N, 2))
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def pluck(f, d=1.6, g=.12):
    n = int(d * SR); L = max(2, int(SR / f)); buf = R.uniform(-1, 1, L); out_ = np.zeros(n)
    for i in range(n): out_[i] = buf[i % L]; buf[i % L] = .5 * (buf[i % L] + buf[(i + 1) % L]) * .996
    return norm(lp(out_, 3000) * np.minimum(1, np.arange(n) / 80), g)
ARP = [50, 53, 57, 62, 57, 53]   # D minor figure (D F A D A F)
BEAT = 60 / 66 / 2
cache = {}
tm = .4
while tm < LEND(10):
    for k, m in enumerate(ARP):
        tb = tm + k * BEAT
        if tb > LEND(10): break
        if not (LEND(9) < tb < LEND(10) + .9): cache.setdefault(m, pluck(mtof(m), 1.6, .09)); put(SC, tb, st(cache[m], -.2 + .08 * k))
    tm += 6 * BEAT
SC = SC * (duck[:, None] * .9 + .1)
room = st(norm(lp(pink(N), 700), .5) * .015, 0)[:N]
mix = vo + FX * .9 + SC * .8 + room
mix = mix / (np.abs(mix).max() + 1e-9) * .9
os.makedirs(f'{HERE}/out', exist_ok=True); sf.write(f'{HERE}/out/mix.wav', mix.astype(np.float32), SR, subtype='PCM_16')
print('mix', round(TOTAL, 2), 's')
