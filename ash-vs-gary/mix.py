# narration + chalk foley + retro-anime score -> out/mix.wav (48k stereo)
# needs out/events.json (node core/render/events.mjs <this folder> --out out/events.json)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 60.6; N = int(DUR * SR); rng = np.random.default_rng(31); S.seed(9)
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
IRn = int(1.4 * SR); IR = np.stack([noise(IRn), noise(IRn)], 1) * np.exp(-np.arange(IRn) / SR * 3.6)[:, None]
IR = np.stack([lp(IR[:, 0], 5000), lp(IR[:, 1], 5000)], 1); IR /= np.sqrt((IR ** 2).sum(0))
def verb(x2, wet=.25):
    y = np.stack([fftconvolve(x2[:, 0], IR[:, 0])[:len(x2)], fftconvolve(x2[:, 1], IR[:, 1])[:len(x2)]], 1); return x2 * (1 - wet) + y * wet
sfx = np.zeros((N, 2))
def put(buf, t, x):
    i = int(t * SR); j = min(N, i + len(x))
    if 0 <= i < N and j > i: buf[i:j] += x[:j - i]

ev = json.load(open(HERE + '/out/events.json'))['ev']
# ---- chalk on slate ----
def chalk(d, lenpx, color, big, pan):
    d = max(.12, d); n = int(d * SR); t = np.arange(n) / SR
    gate = (np.sin(2 * np.pi * (11 + 6 * np.abs(np.sin(t * 3))) * t + 1.3) > -.35).astype(float); gate = lp(gate, 90)
    x = bp(noise(n), 1800, 7500) * gate + bp(pink(n), 400, 1500) * .35
    if color == 'accent': x = lp(x, 4200)
    if color == 'pale': x = x * .9
    x *= np.minimum(1, t / .01) * np.minimum(1, (d - t) / .03)
    g = (.16 + .08 * big) * min(1.6, .5 + lenpx / 500)
    return st(norm(x, .5) * g, pan)
for e in ev:
    if e['type'] == 'chalk':
        pan = float(np.clip((hash(round(e['t'] * 10)) % 100) / 100 * 1.2 - .6, -.7, .7))
        put(sfx, e['t'], chalk(e['d'], e['len'], e['color'], e.get('big', 0), pan))
    elif e['type'] == 'ko':
        n = int(.45 * SR); t = np.arange(n) / SR
        x = np.sin(2 * np.pi * np.cumsum(120 * (1 + .6 * np.exp(-t * 28))) / SR) * np.exp(-t * 11) + bp(noise(n), 800, 4000) * env(n, .001, .04) * .5
        put(sfx, e['t'], verb(st(norm(x, .8) * .5), .22))
    elif e['type'] == 'wipe':
        n = int(e['d'] * SR); p = np.arange(n) / n
        x = bp(pink(n), 500, 5000) * np.sin(np.pi * p) ** 1.2 + .4 * lp(pink(n), 300) * np.sin(np.pi * p)
        put(sfx, e['t'] - .05, st(norm(x, .5) * .55))
# ---- impacts ----
def whoosh(d, g, rev=False):
    n = int(d * SR); p = np.arange(n) / n; x = bp(pink(n), 300, 6000) * (p if rev else (1 - p)) ** 1.8; return st(norm(x, .5) * g)
def boom(g):
    n = int(1.2 * SR); t = np.arange(n) / SR; x = np.sin(2 * np.pi * np.cumsum(70 * (1 + 1.5 * np.exp(-t * 14))) / SR) * np.exp(-t * 4.5) + lp(noise(n), 1500) * env(n, .001, .12) * .5
    return verb(st(norm(x, .9) * g), .3)
put(sfx, 40.3, whoosh(.7, .45))                         # hydro pump
put(sfx, 46.3, whoosh(.5, .35, True))                   # scorch
put(sfx, 48.6, whoosh(.9, .3))                          # cooling hiss
n = int(3.4 * SR); hiss = hp(pink(n), 1500) * np.linspace(0, 1, n) ** 2 * np.minimum(1, np.linspace(1, 0, n) * 6); put(sfx, 49.3, st(norm(hiss, .5) * .35))  # steam
put(sfx, 55.9, whoosh(.9, .5, True))                    # the toss
put(sfx, 57.3, boom(.9))                                # the fall
put(sfx, 53.35, boom(.5))
put(sfx, 58.1, boom(.4))

# ---------------- music: 140 bpm, A minor -> C major lift ----------------
B = 60 / 140; E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def hit(t, name, v, pan=0, g=1): E.append(dict(t=t, inst='drum_kit', pitch=name, dur=.3, vel=v, pan=pan, gain=g))
CH = {'Am': ['A3', 'C4', 'E4'], 'F': ['F3', 'A3', 'C4'], 'C': ['C4', 'E4', 'G4'], 'G': ['G3', 'B3', 'D4'], 'Em': ['E3', 'G3', 'B3'], 'Dm': ['D3', 'F3', 'A3']}
ROOT = {'Am': 'A1', 'F': 'F1', 'C': 'C2', 'G': 'G1', 'Em': 'E1', 'Dm': 'D2'}
def bar(t0, chord, kind):
    r = ROOT[chord]
    if kind in ('groove', 'heavy', 'hero'):
        for beat in (0, 2.5): hit(t0 + beat * B, 'kick_drum_left', .85)
        if kind != 'heavy': hit(t0 + 1.0 * B * 3 - .0, 'kick_drum_right', .6)
        for beat in (1, 3): hit(t0 + beat * B, 'snare_1', .8)
        for k in range(8): hit(t0 + k * B / 2, 'hi_hat_closed', .45 if k % 2 else .6, .2)
        for k in range(8): n(t0 + k * B / 2, 'electric_bass', r, B * .45, .8 if k % 2 == 0 else .55)
        for p in CH[chord]: n(t0, 'organ', p, B * 1.9, .3, -.2); n(t0 + 2 * B, 'organ', p, B * 1.5, .26, .2)
    if kind == 'hero':
        for k, p in enumerate(CH[chord] + [CH[chord][1]]): n(t0 + k * B, 'electric_guitar', p, B * .9, .7, .1)
        n(t0 + 3 * B, 'electric_guitar', CH[chord][2], B * 1, .7, .1)
    if kind == 'tense':
        hit(t0, 'kick_drum_left', .8)
        for k in range(4): hit(t0 + k * B, 'hi_hat_closed', .35)
        for k in range(4): n(t0 + k * B, 'electric_bass', 'A1', B * .9, .8)
        n(t0, 'organ', 'A3', 4 * B, .3, -.2); n(t0, 'organ', 'Eb4', 4 * B, .22, .2)
    if kind == 'riser':
        sn = int(8 * (1 + (t0 - 45.35) / 3))
        for k in range(4 * 2): hit(t0 + k * B / 2, 'snare_1', .25 + .06 * (t0 - 45), .0)
        for k in range(4): n(t0 + k * B, 'electric_bass', 'A1', B * .9, .8)
def seq(t0, t1, chords, kind):
    t = t0; i = 0
    while t + 4 * B <= t1 + .01: bar(t, chords[i % len(chords)], kind); t += 4 * B; i += 1
# intro 0.35-7: pad + sparse
n(.4, 'organ', 'A3', 6.5, .24, -.2); n(.4, 'organ', 'E4', 6.5, .2, .2); n(.4, 'organ', 'C4', 6.5, .18, 0)
for k in range(int(6 / B)): n(.4 + k * B * 1, 'electric_bass', 'A1', B * .9, .65) if k * B > 3 else None
for k in range(8, int(6.8 / (B / 2))): hit(k * B / 2 + .4 - 1.2, 'hi_hat_closed', .35, .2)
hit(.4, 'crash_left', .6)
seq(7.0 + 0.0, 14.35 - 0.1, ['Am', 'F', 'C', 'G'], 'groove')
hit(14.35, 'crash_left', .8); seq(14.35, 21.0, ['Am', 'Am', 'F', 'G'], 'heavy')
for k in range(4): hit(20.1 + k * B / 2, 'tom_%d' % (k % 3 + 1), .7)
seq(21.35, 25.2, ['Em', 'F'], 'groove')
# the turn: 25.4 everything drops, half-time tension
n(25.4, 'organ', 'A2', 4, .35, 0); hit(25.4, 'crash_right', .7); n(25.4, 'electric_bass', 'F1', 3, .9)
seq(26.0, 29.1, ['Dm'], 'tense')
# heroic lift
hit(29.35, 'crash_left', .85); hit(31.6, 'crash_right', .85)
seq(29.35, 37.1, ['C', 'G', 'Am', 'F'], 'hero')
# type disadvantage: tense
hit(37.35, 'crash_left', .6); seq(37.35, 45.1, ['Am'], 'tense')
# steam build and silence
seq(45.35, 52.6, ['Am'], 'riser')
for k in range(8): hit(51.2 + k * B / 4, 'snare_1', .35 + k * .06)
# drop 52.75-53.35, then big finish
hit(53.35, 'kick_drum_left', 1.0); hit(53.35, 'crash_left', 1.0, 0, 1.2)
for p in CH['Am'] + ['A2']: n(53.35, 'organ', p, 1.4, .4)
seq(53.9, 57.9, ['Am', 'F'], 'groove')
for k in range(4): hit(55.5 + k * B / 2, 'tom_%d' % (k % 3 + 1), .85)
# ASH WINS: major resolve
hit(58.1, 'crash_left', 1.0, 0, 1.3)
for p in ['C3', 'G3', 'C4', 'E4', 'G4', 'C5']: n(58.1, 'organ', p, 2.4, .42)
for p in ['C3', 'G3', 'C4']: n(58.1, 'electric_guitar', p, 2.4, .85)
n(58.1, 'electric_bass', 'C2', 2.4, 1.0)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.35, mix=.15)
mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
def gate(buf, a, b, fo=.06, fi=.04):
    e = np.ones(N); i, j = int(a * SR), int(b * SR); e[i:j] = 0; e[max(0, i - int(fo * SR)):i] = np.linspace(1, 0, min(int(fo * SR), i)); e[j:j + int(fi * SR)] = np.linspace(0, 1, int(fi * SR))[:max(0, min(int(fi * SR), N - j))]; return buf * e[:, None]
mus = gate(mus, 52.75, 53.33)
fd = np.ones(N); fd[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR)) ** 1.5; mus *= fd[:, None]

# ---------------- narration ----------------
src = open(HERE + '/film.js').read()
vo_times = [(m[0], float(m[1])) for m in re.findall(r"\['(v\d\d)', ([\d.]+),", src)]
vo = np.zeros(N); duck = np.zeros(N)
def compress(x, thr=-24, ratio=3.0):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e); return x * 10 ** (np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0) / 20)
for vid, t0 in vo_times:
    x, vsr = sf.read(f'{HERE}/voices/{vid}.wav'); x = hp(compress(hp(resample_poly(x, SR, vsr), 90)), 60)
    i = int(t0 * SR); j = min(N, i + len(x)); vo[i:j] += x[:j - i]
    duck[max(0, i - int(.2 * SR)):min(N, j + int(.35 * SR))] = 1
duck = lp(np.convolve(duck, np.ones(int(.25 * SR)) / int(.25 * SR), 'same'), 5); act = duck > .5
def limit(x, ceil):
    pk = maximum_filter1d(np.abs(x), int(.005 * SR)); g = np.minimum(1, ceil / (pk + 1e-9)); g = np.minimum.reduce([g, np.roll(g, int(.0025 * SR))]); return x * np.clip(lp(g, 200), 0, 1)
speech = np.abs(vo) > 10 ** (-40 / 20) * np.abs(vo).max(); vr = np.sqrt(np.mean(vo[np.convolve(speech, np.ones(2400), 'same') > 0] ** 2))
vo = limit(vo, vr * 10 ** (11 / 20)); mus_db = dbfs(mus[act]); vo = vo * 10 ** ((mus_db + 5.5 - dbfs(vo[act])) / 20)
mus *= (1 - .3 * duck)[:, None]
mix = mus + verb(st(vo), .05) + sfx
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'sfx', round(dbfs(sfx), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
