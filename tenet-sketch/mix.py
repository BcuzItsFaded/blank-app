# Narration + pen and paper foley + an original jazz waltz -> out/mix.wav (48 kHz stereo)
# Foley: a pen on cold-press paper while each page is drawn, a page turn at every cut, a wet brush when washes bloom,
# a reversed pen for every inverted moment. Score: a jazz waltz in 3/4 (walking bass, brushes, piano, clarinet),
# a bar of silence before Kat is hit, a last chord when the sketchbook closes.
import json, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
LINES = json.load(open(f'{HERE}/lines.json')); DUR = json.load(open(f'{HERE}/voices/dur.json'))
R = np.random.default_rng(1212)
S_LINE, t = [], 0.35
for l in LINES: S_LINE.append(t); t += DUR[l['id']] + 0.3
def Lt(i, f): return S_LINE[i - 1] + f * (DUR[LINES[i - 1]['id']] + 0.3)
def LEND(i): return S_LINE[i - 1] + DUR[LINES[i - 1]['id']] + 0.3
TOTAL = LEND(15) + 3.4; N = int(TOTAL * SR)
CUTS = [0] + [Lt(a, b) for a, b in [(2, 0), (2, .38), (2, .68), (3, 0), (3, .55), (4, 0), (5, 0), (6, 0), (6, .55), (7, 0), (8, 0), (8, .5), (9, 0), (10, 0), (11, 0), (11, .52), (12, 0), (13, 0), (13, .45), (14, 0), (15, 0), (15, .55)]]

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def nz(n): return R.standard_normal(n)
def pink(n): w = np.fft.rfft(nz(n)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
def tt(d): return np.arange(int(d * SR)) / SR
def st(x, pan=0.0): l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4); return np.stack([x * l * 1.414, x * r * 1.414], 1)
def put(buf, t0, x):
    i = int(t0 * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf) and j > i: buf[i:j] += x[:j - i]
def compress(x, thr=-24, ratio=3.0):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e); return x * 10 ** (np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0) / 20)

# ---------- narration ----------
vo = np.zeros((N, 2)); duck = np.zeros(N)
for i, l in enumerate(LINES):
    x, vsr = sf.read(f'{HERE}/out/voice/{l["id"]}.wav')
    if x.ndim > 1: x = x.mean(1)
    x = compress(hp(resample_poly(x, SR, vsr), 80)); i0 = int(S_LINE[i] * SR); j = min(N, i0 + len(x))
    vo[i0:j] += st(x[:j - i0] * .9); duck[max(0, i0 - int(.2 * SR)):min(N, j + int(.4 * SR))] = 1
duck = 1 - .55 * np.clip(lp(np.convolve(duck, np.ones(int(.3 * SR)) / int(.3 * SR), 'same'), 5), 0, 1)

# ---------- foley ----------
FX = np.zeros((N, 2))
def pen(d=.06, g=.1):   # one stroke of a fineliner on cold-press paper: band-passed noise with a fibre texture
    n = int(d * SR); e = np.sin(np.pi * np.arange(n) / n) ** .7; tex = .6 + .4 * (R.random(n) > .55)
    return norm(bp(nz(n), 1600, 7500) * e * tex, g)
def page_turn(g=.32):
    n = int(.55 * SR); p = np.arange(n) / n; x = bp(pink(n), 500, 6000) * np.sin(np.pi * p) ** 1.4 * (.7 + .3 * np.abs(np.sin(p * 40)))
    th = lp(nz(int(.12 * SR)), 300) * np.exp(-tt(.12) * 30) * .5; x[-len(th):] += th; return norm(x, g)
def brush(d=.7, g=.12): n = int(d * SR); p = np.arange(n) / n; return norm(bp(pink(n), 300, 3000) * np.sin(np.pi * p) ** 1.2, g)
for k, c in enumerate(CUTS):
    nxt = CUTS[k + 1] if k + 1 < len(CUTS) else TOTAL; Td = min(2.4, (nxt - c) * .45)
    if k: put(FX, c - .1, st(page_turn(.3), .3 if k % 2 else -.3))
    tp = c + .05
    while tp < c + Td * .85:   # the pen drawing the page: strokes of varying length
        d = R.uniform(.03, .16); put(FX, tp, st(pen(d, R.uniform(.05, .11)), R.uniform(-.4, .4))); tp += d * R.uniform(.6, 1.3)
    put(FX, c + Td * .45, st(brush(.9, .1), 0))
for tr in [Lt(2, .68) + 1.2, Lt(4, .45), Lt(8, .55), Lt(9, .42), Lt(10, .5), Lt(13, .55), Lt(15, .3)]:   # inverted moments: the pen running backward
    for k in range(5): put(FX, tr + k * .07, st(pen(.09, .12)[::-1].copy(), .2))
# subtitles are written on: a light pen as each caption appears
CUE_TIMES = []
for i, l in enumerate(LINES): CUE_TIMES.append(S_LINE[i])
for c in CUE_TIMES:
    for k in range(6): put(FX, c + k * .11, st(pen(.05, .04), -.5))

# ---------- score: an original jazz waltz in 3/4, 138 bpm ----------
SC = np.zeros((N, 2)); BEAT = 60 / 138; BAR = 3 * BEAT
PROG = [(50, [0, 3, 7, 10]), (55, [0, 4, 7, 10]), (48, [0, 4, 7, 11]), (57, [0, 4, 7, 10]), (50, [0, 3, 7, 10]), (55, [0, 4, 7, 10]), (52, [0, 3, 7, 10]), (57, [0, 4, 7, 10])]   # Dm7 G7 Cmaj7 A7 Dm7 G7 Em7 A7
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def bass_note(f, d=.42, g=.22):
    t_ = tt(d); x = sum(np.sin(2 * np.pi * f * h * t_) / h ** 1.3 for h in (1, 2, 3)) * np.exp(-t_ * 5) * np.minimum(1, t_ / .006); return norm(lp(x, 900), g)
def piano(fs, d=.5, g=.08):
    t_ = tt(d); x = sum(sum(np.sin(2 * np.pi * f * h * t_) / h ** 2 for h in (1, 2, 3)) for f in fs) * np.exp(-t_ * 6) * np.minimum(1, t_ / .004); return norm(x, g)
def brush_hit(d, g): n = int(d * SR); return norm(bp(nz(n), 2000, 9000) * np.exp(-np.arange(n) / SR * (8 / d)), g)
def clarinet(f, d, g=.09):
    t_ = tt(d); vib = 1 + .006 * np.sin(2 * np.pi * 5.2 * t_) * np.minimum(1, t_ / .3); ph = 2 * np.pi * f * np.cumsum(vib) / SR
    x = np.sin(ph) + .35 * np.sin(3 * ph) + .15 * np.sin(5 * ph); env = np.minimum(1, t_ / .05) * np.minimum(1, (d - t_) / .12); return norm(lp(x * env, 3500), g)
SIL0, SIL1 = Lt(9, .33), Lt(9, .33) + BAR          # a bar of true silence before the inverted bullet
END = LEND(15) + .1
clar_on = lambda tm: (Lt(2, 0) < tm < Lt(6, 0)) or (Lt(10, 0) < tm < Lt(12, 0)) or (Lt(14, 0) < tm < END)
mel_r = np.random.default_rng(77)
bar = 0; tm = .2
while tm < END:
    root, ch = PROG[bar % len(PROG)]
    if not (SIL0 - .05 < tm < SIL1):
        walk = [root - 12, root - 12 + ch[1 + (bar % 2)], root - 12 + ch[2]]
        for b in range(3):
            tb = tm + b * BEAT
            if SIL0 - .05 < tb < SIL1: continue
            put(SC, tb, st(bass_note(mtof(walk[b])), -.2))
            put(SC, tb, st(brush_hit(.32 if b == 0 else .12, .05 if b == 0 else .03), .3))
            if b: put(SC, tb + .02, st(piano([mtof(root + 12 + c) for c in ch[1:]], .45, .05), .1))
        if clar_on(tm) and bar % 2 == 0:   # a short phrase on chord tones every other bar
            notes = [root + 24 + ch[mel_r.integers(0, 4)] for _ in range(3)]
            for k, m in enumerate(notes): put(SC, tm + k * BEAT, st(clarinet(mtof(m), BEAT * (1.9 if k == 2 else .95)), .35))
    tm += BAR; bar += 1
# the last chord: the sketchbook closes
put(SC, END + .1, st(piano([mtof(48 + c) for c in [0, 4, 7, 11, 14]], 3.0, .14), 0)); put(SC, END + .1, st(bass_note(mtof(36), 2.5, .24), -.2))
SC = SC * (duck[:, None] * .9 + .1)
# room tone of the page, muted in the silent bar
room = st(norm(lp(pink(N), 700), .5) * .018, 0)[:N]; i0, i1 = int(SIL0 * SR), int(SIL1 * SR); room[i0:i1] *= .1
mix = vo + FX * .9 + SC * .8 + room
mix = mix / (np.abs(mix).max() + 1e-9) * .9
os.makedirs(f'{HERE}/out', exist_ok=True); sf.write(f'{HERE}/out/mix.wav', mix.astype(np.float32), SR, subtype='PCM_16')
print('mix', round(TOTAL, 2), 's')
