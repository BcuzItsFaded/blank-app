# narration (radio chain) + foley + 1930s hot-band score + optical-soundtrack ageing -> out/mix.wav (48k stereo)
import json, re, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
from scipy.ndimage import maximum_filter1d
from core.audio import sampler as S
SR = 48000; DUR = 62.4; N = int(DUR * SR); R = np.random.default_rng(1936); S.seed(16)
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

cues = []
def C(t, x, g=.5, pan=0.0): cues.append((t, x, g, pan))
# S1: midnight, the patient peeking, the slam
C(3.4, thud(60, 1.2), .7); C(3.45, clink(1.0), .25); C(5.5, slidewhistle(500, 1400, .3), .25, -.5); C(6.4, thud(110, .3), .7, -.5); C(6.4, woodblock(1500, .15), .5, -.5)
# S2: the iron
C(12.1, boing(260, .4), .4, .5); C(12.3, step(), .3, .4); C(12.5, step(), .3, .4)
for k in range(3): C(12.9 + k * .5, hiss(.45), .35, .4)
C(14.5, hiss(.5), .35); C(14.82, boing(400, .5, .5), .55); C(14.83, woodblock(1800, .12), .5)
# S3: love and the broken heart
C(17.6, slidewhistle(500, 1500, .35), .22)
for k in range(6): C(19.66 + k * .24, boing(520 + k * 40, .18, .2), .2, -.3)
C(21.3, china(.7), .55); C(21.0, thud(90, .5), .45)
# S4: swoon, ghost rises, bell, snore, rubber band
C(23.68, slidewhistle(900, 200, .7), .35); C(24.2, slidewhistle(300, 1200, .6, .03), .28)
C(24.5, bell_ring(4.5), .22, .5)
for k in range(5): C(24.9 + k * 1.0, gasp(.8) * .8, .15, -.5)
C(26.86, slidewhistle(1100, 220, .8), .3); C(27.2, slidewhistle(250, 1300, .8, .03), .3); C(28.0, rubber_creak(.8), .45); C(28.0, slidewhistle(400, 2300, .8), .25); C(28.8, boing(180, .8, .6), .7); C(28.82, china(.2), .25)
# S5: shiver, glide, medicine, tuck
for k in range(10): C(29.9 + k * .4, woodblock(2200 + 80 * (k % 3), .06), .12, .3)
C(31.0, slidewhistle(300, 700, 1.2, .02), .12, -.4); C(34.25, clink(.5), .45, -.2); C(35.4, swish(.6, .3)); C(35.4, slidewhistle(600, 1000, .5), .15)
C(36.05, ratchet(.7), .4, -.4); C(36.65, clink(.8), .35, -.4)
# S6: the staff glance
for t0, p in [(41.0, 600), (41.4, 700), (42.0, 520)]: C(t0, boing(p, .35, .4), .4)
C(40.65, woodblock(2300, .08), .5, -.3); C(40.8, woodblock(2000, .08), .5, .3)
# S7: the double take
for k in range(5): C(44.5 + k * .5, step(), .22, -.3 + k * .15)
C(48.5, gasp(.5), .5); C(48.5, boing(900, .5, .5), .45); C(48.6, slidewhistle(300, 2400, .45), .35)
C(49.1, thud(55, .6), .8)
for k in range(10): C(49.5 + k * .08, step(.08) * .9, .4, .1 + .08 * k)
C(49.5, slidewhistle(300, 2600, .7), .3); C(49.55, swish(.7, .5))
# S8: care
C(51.6, clink(.6), .2, -.3); C(53.4, swish(.4, .25, True)); C(55.7, boing(700, .3, .3), .4); C(55.72, clink(.6), .3)
# end card: the shade drops and the ring knocks
C(58.6, swish(.7, .5)); C(59.3, thud(100, .5), .6); C(59.35, clink(.5), .4)
for t0, x, g, pan in cues: put(FX, t0, st(x, pan) * g)

# ---------------- band: 120 bpm, D minor foxtrot ----------------
B = .5; E = []
def n(t, inst, pitch, d, v, pan=0, g=1): E.append((t, inst, pitch, d, v, pan, g))
def hit(t, name, v, pan=0, g=1): E.append(dict(t=t, inst='drum_kit', pitch=name, dur=.2, vel=v, pan=pan, gain=g))
CH = {'Dm': ['D4', 'F4', 'A4'], 'Gm': ['G3', 'Bb3', 'D4'], 'A7': ['A3', 'C#4', 'E4'], 'F': ['F3', 'A3', 'C4'], 'C': ['C4', 'E4', 'G4'], 'Bb': ['Bb3', 'D4', 'F4'], 'D': ['D4', 'F#4', 'A4']}
ROOT = {'Dm': 'D2', 'Gm': 'G2', 'A7': 'A2', 'F': 'F2', 'C': 'C2', 'Bb': 'Bb1', 'D': 'D2'}
PROG = ['Dm', 'Dm', 'Gm', 'A7']
def oompah(t0, t1, prog=PROG, v=.7, drums=True, uke=True, tubaI='tuba_stac'):
    t = t0; i = 0
    while t + B * 4 <= t1 + .01:
        c = prog[i % len(prog)]
        for beat in (0, 2): n(t + beat * B, tubaI, ROOT[c], B * .6, v)
        for beat in (1, 3):
            for p in CH[c]: n(t + beat * B, 'upright', p, B * .45, v * .6, .2);
            if uke: n(t + beat * B + B / 2, 'ukulele', CH[c][1], B * .4, v * .5, -.3)
        if drums:
            for k in range(8): hit(t + k * B / 2, 'hi_hat_closed', .28 if k % 2 else .4, .2)
            for beat in (1, 3): hit(t + beat * B, 'snare_rest_1', .4)
        t += B * 4; i += 1
THEME = [('D5', 1), ('F5', 1), ('A5', 1), ('G5', 1), ('F5', 1), ('E5', 1), ('D5', 1), (None, 1)]
def theme(t0, inst, v=.55, tr=0, step=B):
    t = t0
    for p, d in THEME:
        if p: n(t, inst, p, step * .9, v, -.1)
        t += step * d
    return t
# S1 midnight: stinger, sparse oom-pah, theme enters with the ghost
n(.2, 'trumpet_mute', 'D4', 1.0, .6); n(.2, 'trombone', 'A2', 1.0, .6); hit(.2, 'crash_left', .7)
oompah(1.0, 8.1, v=.55, drums=False); theme(3.6, 'clarinet', .55); theme(7.6, 'clarinet', .5)
# S2 the uniform: playful xylophone + trombone smears
oompah(8.25, 15.1, v=.7); t = 8.4
for k in range(3): theme(t + k * 4, 'xylophone', .5)
for t0 in (9.5, 11.5, 13.5): n(t0, 'trombone', 'D3', .9, .5)
hit(14.8, 'crash_right', .6)
# S3 love: sweeter, then the turn
oompah(15.3, 20.9, prog=['F', 'Bb', 'C', 'F'], v=.55, drums=False); theme(15.4, 'clarinet', .5); theme(19.4, 'clarinet', .5)
n(20.94, 'trumpet_mute', 'F4', .5, .6); n(21.2, 'trumpet_mute', 'E4', .5, .6); n(21.4, 'trumpet_mute', 'Eb4', .8, .6); n(21.3, 'trombone', 'A2', 1.0, .6)
# S4 two versions: slow, sad; then the ward, tuba snores, the whistle gag
oompah(21.7, 24.4, prog=['Dm', 'Gm'], v=.5, drums=False)
for k, p in enumerate(['D4', 'C4', 'Bb3', 'A3']): n(22.0 + k * .9, 'trombone', p, .85, .5)
for k in range(10): n(24.5 + k * B * 2, 'tuba', 'D2' if k % 2 == 0 else 'A1', B * 1.5, .5)
for k, p in enumerate(['D5', 'F5', 'E5', 'D5']): n(25.0 + k * 1.0, 'clarinet', p, .9, .45)
hit(28.8, 'crash_left', .6)
# S5 tender lullaby
oompah(29.9, 35.3, prog=['Dm', 'Gm', 'A7', 'Dm'], v=.4, drums=False, uke=False); theme(31.0, 'clarinet', .45, step=B * 1.4)
for k in range(8): n(29.9 + k * .4, 'ukulele', 'D4', .15, .3, .3)
n(35.35, 'xylophone', 'F5', .8, .4); n(35.7, 'xylophone', 'A5', .8, .4); n(36.0, 'xylophone', 'D6', 1.2, .4)
# S6 chatter; band stops on the stare
oompah(36.8, 40.55, prog=['F', 'C', 'Dm', 'A7'], v=.6)
theme(37.0, 'clarinet', .5); hit(41.0, 'crash_left', .4)
# S7 tiptoe, double take, panic
for k in range(int((48.4 - 43.2) / B)): n(43.2 + k * B, 'contrabass_pizz', ['D2', 'A2', 'F2', 'A2'][k % 4], B * .6, .6)
for k, p in enumerate(['D5', 'F5', 'Ab5', 'D6']): n(44.5 + k * 1.0, 'xylophone', p, .6, .4)
n(48.5, 'trumpet', 'D5', 1.0, .75); n(48.5, 'trumpet', 'Ab5', 1.0, .7); hit(48.5, 'crash_right', .8)
oompah(49.5, 50.4, prog=['Dm'], v=.8)
for k in range(8): hit(49.5 + k * .1, 'snare_rest_1', .5 + k * .05)
# S8 care: D major reprise, slow
oompah(50.46, 58.4, prog=['D', 'Gm', 'A7', 'D'], v=.4, drums=False, uke=False)
theme(51.6, 'clarinet', .5, step=B * 1.5); n(55.7, 'xylophone', 'A5', .9, .4)
for p in ['D3', 'A3', 'D4', 'F#4', 'A4']: n(58.5, 'upright', p, 3.5, .6)
n(58.5, 'clarinet', 'F#5', 3.4, .5); n(58.5, 'tuba', 'D2', 3.0, .6); hit(58.5, 'crash_left', .7)
mus = S.render(E, dur=DUR); mus = S.room(mus, size=.3, mix=.12); mus = mus[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
def gate(buf, a, b, fo=.03, fi=.03):
    e = np.ones(N); i, j = int(a * SR), int(b * SR); e[i:j] = 0; e[max(0, i - int(fo * SR)):i] = np.linspace(1, 0, min(int(fo * SR), i)); e[j:j + int(fi * SR)] = np.linspace(0, 1, int(fi * SR))[:max(0, min(int(fi * SR), N - j))]; return buf * e[:, None]
mus = gate(mus, 40.55, 41.0); mus = gate(mus, 49.1, 49.5); mus = gate(mus, 21.3, 21.5)
fd = np.ones(N); fd[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)) ** 1.5; mus *= fd[:, None]

# ---------------- narration: a radio announcer ----------------
src = open(HERE + '/main.js').read()
vo_times = [(m[0], float(m[1])) for m in re.findall(r"\['(v\d\d)', ([\d.]+),", src)]
vo = np.zeros(N); duck = np.zeros(N)
def compress(x, thr=-24, ratio=3.0):
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-10); lv = 20 * np.log10(e); return x * 10 ** (np.where(lv > thr, (thr - lv) * (1 - 1 / ratio), 0) / 20)
for vid, t0 in vo_times:
    x, vsr = sf.read(f'{HERE}/voices/{vid}.wav'); x = resample_poly(x, SR, vsr); x = hp(x, 260); x = lp(x, 4600); x = np.tanh(x * 2.2) / np.tanh(2.2); x = compress(x)
    i = int(t0 * SR); j = min(N, i + len(x)); vo[i:j] += x[:j - i]; duck[max(0, i - int(.2 * SR)):min(N, j + int(.35 * SR))] = 1
duck = lp(np.convolve(duck, np.ones(int(.25 * SR)) / int(.25 * SR), 'same'), 5); act = duck > .5
def limit(x, ceil):
    pk = maximum_filter1d(np.abs(x), int(.005 * SR)); g = np.minimum(1, ceil / (pk + 1e-9)); g = np.minimum.reduce([g, np.roll(g, int(.0025 * SR))]); return x * np.clip(lp(g, 200), 0, 1)
speech = np.abs(vo) > 10 ** (-40 / 20) * np.abs(vo).max(); vr = np.sqrt(np.mean(vo[np.convolve(speech, np.ones(2400), 'same') > 0] ** 2))
vo = limit(vo, vr * 10 ** (11 / 20)); mus_db = dbfs(mus[act]); vo = vo * 10 ** ((mus_db + 6.5 - dbfs(vo[act])) / 20)
mus *= (1 - .55 * duck)[:, None]; FX *= (1 - .3 * duck)[:, None]
body = mus + FX
# optical soundtrack ageing over music + foley: band-limit, wow and flutter, soft saturation
def wowflut(x2):
    n_ = len(x2); t = np.arange(n_) / SR; idx = t + .0008 * np.sin(2 * np.pi * .6 * t) + .0002 * np.sin(2 * np.pi * 7 * t); idx = np.clip(idx * SR, 0, n_ - 1)
    return np.stack([np.interp(idx, np.arange(n_), x2[:, 0]), np.interp(idx, np.arange(n_), x2[:, 1])], 1)
body = np.stack([bp(body[:, 0], 110, 6200, 2), bp(body[:, 1], 110, 6200, 2)], 1); body = wowflut(body); body = np.tanh(body * 1.4) / 1.4
# the only sound inside a silence: hiss, crackle and a 24 Hz projector gate clatter
tn = np.arange(N) / SR
bed = hp(nz(N), 3000) * .012 + (R.random(N) < 18 / SR) * R.uniform(-1, 1, N) * .05; bed = bed + lp((np.sin(2 * np.pi * 24 * tn) > .9).astype(float) * nz(N), 900) * .006
mix = body + verb(st(vo), .06) + np.stack([bed, np.roll(bed, 300)], 1)
print('music', round(dbfs(mus), 1), 'vo', round(dbfs(vo[act]), 1), 'fx', round(dbfs(FX), 1), 'peak', round(20 * np.log10(np.abs(mix).max()), 1))
mix = mix / np.abs(mix).max() * .89
os.makedirs(HERE + '/out', exist_ok=True); sf.write(HERE + '/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT'); print('wrote out/mix.wav')
