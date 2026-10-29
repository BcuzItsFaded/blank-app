import json, numpy as np, soundfile as sf
from scipy.signal import lfilter, butter, sosfilt
from kokoro_onnx import Kokoro
D = '/tmp/claude-0/cl/'
SR = 24000
k = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
rng = np.random.default_rng(0)

def echo(x, delays=((0.17, .45), (0.34, .25), (0.55, .12))):
    out = np.concatenate([x, np.zeros(int(SR * 0.8))])
    for dl, g in delays:
        n = int(dl * SR)
        out[n:n + len(x)] += g * x
    return out

def pitch(x, f):  # resample: f>1 = higher + shorter
    idx = np.arange(0, len(x) - 1, f)
    return np.interp(idx, np.arange(len(x)), x)

vo = [sf.read(f'{D}vo/{i:02d}.wav')[0] for i in range(14)]
child, _ = k.create("Kill her, Mommy.", voice='af_nicole', speed=0.8, lang='en-us')
vo[8] = echo(pitch(child, 1.15) * 1.3)
sig, _ = k.create("kee... kee... kee... mah... mah... mah...", voice='af_nicole', speed=1.0, lang='en-us')
sig = echo(pitch(sig, 0.88), ((0.12, .6), (0.25, .45), (0.4, .3), (0.6, .18)))

LEAD, PRE, POST, TAIL = 0.45, 0.12, 0.3, 2.8
scenes, t = [], 0.0
for i, v in enumerate(vo):
    pre = LEAD if i == 0 else PRE
    dur = pre + len(v) / SR + POST + (TAIL if i == 13 else 0)
    scenes.append(dict(start=t, dur=dur, vo_start=t + pre, vo_dur=len(v) / SR))
    t += dur
total = t
N = int(total * SR) + SR
tt = np.arange(N) / SR

def sc_mask(ids, fade=0.4):
    m = np.zeros(N)
    for i in ids:
        s = scenes[i]
        a, b = int(s['start'] * SR), int((s['start'] + s['dur']) * SR)
        m[a:b] = 1
    k_ = int(fade * SR)
    return np.convolve(m, np.ones(k_) / k_, 'same')

narr = np.zeros(N)
for s, v in zip(scenes, vo):
    a = int(s['vo_start'] * SR)
    narr[a:a + len(v)] += v
narr *= 0.85 / np.abs(narr).max()

white = rng.normal(0, 1, N)
brown = lfilter([1], [1, -0.997], white)
brown /= np.abs(brown).max()
lp = butter(2, 400, 'low', fs=SR, output='sos')
wind = sosfilt(lp, brown) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * tt))
wind /= np.abs(wind).max()
drone = (np.sin(2 * np.pi * 55 * tt) + 0.6 * np.sin(2 * np.pi * 82.4 * tt) + 0.35 * np.sin(2 * np.pi * 110.3 * tt + np.sin(tt))) / 2
drone *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * tt)

night = 1 - sc_mask([1, 2, 3, 4])
under = sc_mask([4])
summer = sc_mask([1, 2, 3])
crick = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 30 * tt) > 0.2) * (np.sin(2 * np.pi * 1.3 * tt) > 0.3)
bed = 0.05 * drone * (0.4 + 0.6 * night) + 0.07 * wind * (1 - under) + 0.02 * crick * summer
rum = sosfilt(butter(2, 150, 'low', fs=SR, output='sos'), brown)
bed += 0.25 * rum / np.abs(rum).max() * under

def place(x, at, gain):
    a = int(at * SR)
    x = x[:N - a]
    bed[a:a + len(x)] += gain * x

def env(n, atk, dec):
    e = np.arange(n) / SR
    return np.minimum(1, e / max(atk, 1e-4)) * np.exp(-e / dec)

n = int(2.5 * SR)
boom = np.sin(2 * np.pi * 42 * tt[:n] * (1 - 0.15 * tt[:n])) * env(n, 0.005, 0.6) + 0.4 * white[:n] * env(n, 0.001, 0.04)
place(boom, 0.0, 0.55)
thunder = sosfilt(butter(2, 220, 'low', fs=SR, output='sos'), white[:int(3 * SR)])
thunder = thunder / np.abs(thunder).max() * env(len(thunder), 0.06, 0.9)
for lt in (0.1, 0.55):
    s = scenes[11]
    place(thunder, s['start'] + lt * s['dur'], 0.55)
place(thunder, scenes[5]['start'] + 0.5, 0.18)
click = white[:int(0.03 * SR)] * env(int(0.03 * SR), 0.0005, 0.006)
thud = np.sin(2 * np.pi * 70 * tt[:int(.3 * SR)]) * env(int(.3 * SR), 0.002, 0.07)
for st in (0.22, 0.42, 0.62, 0.82):
    s = scenes[10]
    place(click, s['start'] + st * s['dur'], 0.5)
    place(thud, s['start'] + st * s['dur'], 0.35)
tick = np.sin(2 * np.pi * 2500 * tt[:int(.02 * SR)]) * env(int(.02 * SR), 0.0005, 0.004)
s = scenes[7]
for x in np.arange(s['start'] + 0.1, s['start'] + s['dur'], 0.42):
    place(tick, x, 0.35)
sw_n = int(0.35 * SR)
swoosh = np.diff(white[:sw_n + 1]) * (np.linspace(0, 1, sw_n) ** 3)
for s in scenes[1:]:
    place(swoosh, s['start'] - 0.35, 0.05)
place(sig, scenes[13]['vo_start'] + scenes[13]['vo_dur'] + 0.15, 0.55)
place(sig * 0.5, scenes[8]['start'] - 0.2, 0.25)

duck = np.convolve(np.abs(narr) > 0.02, np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
mix = narr + bed * (1 - 0.45 * duck)
mix = np.tanh(mix * 1.1) * 0.95
sf.write(D + 'mix.wav', mix[:int(total * SR)], SR)

DISP = [None, "Summer, 1957. Camp Crystal Lake.", "A quiet boy named Jason goes into the water.",
        "The counselors who should be watching him... aren't.", "He never comes back up.",
        "His mother, Pamela, loses everything that day.", "The camp moves on. The town forgets. She doesn't.",
        "For years she carries it. The grief. The blame. And a voice in her head that sounds like her son.",
        '"Kill her, Mommy."', "So when the camp tries to reopen... Pamela comes back.",
        "And one by one... the counselors disappear.", "That's the twist of the original film. The first killer... was a mother.",
        "Jason didn't pick up the machete until the sequels.",
        "Peacock's Crystal Lake tells her story. How a mom becomes a monster. So... who's really to blame?"]
caps = []
for s, line in zip(scenes, DISP):
    if not line:
        continue
    words = line.split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) == 3 or w[-1] in '.,?!"' :
            chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    weights = [sum(len(w) + 2 for w in c) + (6 if c[-1].endswith('...') else 0) for c in chunks]
    t0 = s['vo_start']
    for c, wgt in zip(chunks, weights):
        d = s['vo_dur'] * wgt / sum(weights)
        caps.append(dict(t0=t0, t1=t0 + d, words=c))
        t0 += d
json.dump(dict(scenes=scenes, total=total, caps=caps), open(D + 'timeline.json', 'w'), indent=1)
print('total', round(total, 2), 'caps', len(caps))
