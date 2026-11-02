import math, os, random, subprocess, sys
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.signal import lfilter, butter, sosfilt

D = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = sys.argv[1]
PREVIEW = '--preview' in sys.argv
W, H, FPS, SR = 1080, 1920, 30, 24000
F_BLACK = '/usr/share/fonts/opentype/inter/Inter-Black.otf'
FCAP = ImageFont.truetype(F_BLACK, 80)
FLAB = ImageFont.truetype(F_BLACK, 60)
FEND = ImageFont.truetype(F_BLACK, 96)
FSUB = ImageFont.truetype(F_BLACK, 56)

# (narration, voice, camera (z0, z1, (cx0, cy0), (cx1, cy1)), effects, label, caption y)
SCENES = [
    ("What if police discovered eight different names for one dead woman? And not one was hers?",
     'af_heart', (1.0, 1.04, (0.5, 0.5), (0.5, 0.5)), ['studio2'], None, 1700),
    ("November 29th, 1970. A family hiking near Bergen, Norway, discovered a woman's badly burned body.",
     'am_michael', (1.03, 1.08, (0.48, 0.5), (0.53, 0.5)), ['mist'], None, 1620),
    ("Her clothing labels had been removed. Identifying marks on her belongings were scraped away.",
     'af_heart', (1.03, 1.08, (0.5, 0.5), (0.5, 0.48)), ['flashlight'], None, 1420),
    ("Investigators found two mysterious suitcases at a railway station. Fingerprint evidence connected them to the dead woman.",
     'am_michael', (1.02, 1.1, (0.5, 0.48), (0.5, 0.55)), ['station'], None, 1700),
    ("Inside were wigs, foreign currency, and a notebook containing strange coded entries.",
     'af_heart', (1.03, 1.08, (0.45, 0.5), (0.55, 0.5)), ['belongings'], None, 820),
    ("Police deciphered the notes, tracing her travels. Hotel records revealed at least eight different identities.",
     'am_michael', (1.02, 1.08, (0.5, 0.42), (0.5, 0.55)), ['route'], None, 1050),
    ("Not one name could be confirmed as hers. Some suspected she was a spy, but that theory was never proven.",
     'af_heart', (1.03, 1.07, (0.5, 0.5), (0.52, 0.5)), ['lamp'], 'SPY THEORY: NEVER PROVEN', 1320),
    ("Investigators traced her movements across Europe. Yet more than fifty years later, nobody knows who she really was.",
     'am_michael', (1.02, 1.08, (0.5, 0.45), (0.5, 0.5)), ['platform'], None, 1040),
]
SPLIT1 = ("What if police discovered eight different names for one dead woman?", "And not one was hers?")
RED = {'EIGHT', 'DEAD', 'HERS?', 'BURNED', 'REMOVED.', 'SCRAPED', 'SUITCASES', 'FINGERPRINT', 'WIGS,',
       'CODED', 'IDENTITIES.', 'SPY,', 'NEVER', 'NOBODY', 'NAMES', 'MYSTERIOUS'}


def say(t):
    return t.replace("November 29th, 1970", "November twenty-ninth, nineteen seventy")


# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
kk = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [kk.create(say(t), voice=v, speed=1.0, lang='en-us')[0] for t, v, *_ in SCENES[1:]]
_a = kk.create(SPLIT1[0], voice='af_heart', speed=1.0, lang='en-us')[0]
_b = kk.create(SPLIT1[1], voice='am_michael', speed=1.0, lang='en-us')[0]
vo = [np.concatenate([_a, np.zeros(int(0.25 * SR)), _b])] + vo
XF, TAIL = 0.45, 3.0
segs, t = [], 0.0
for i, v in enumerate(vo):
    pre = 0.35 if i == 0 else 0.25
    dur = pre + len(v) / SR + 0.3 + (TAIL if i == 7 else 0)
    segs.append(dict(start=t, dur=dur, vo_start=t + pre, vo_dur=len(v) / SR))
    t += dur
TOTAL = t

# ------------------------------------------------------------------ audio
N = int(TOTAL * SR) + SR
tt = np.arange(N) / SR
rng = np.random.default_rng(0)
white = rng.normal(0, 1, N)
brown = lfilter([1], [1, -0.997], white)
brown /= np.abs(brown).max()
narr = np.zeros(N)
for s, v in zip(segs, vo):
    a = int(s['vo_start'] * SR)
    narr[a:a + len(v)] += v
narr *= 0.85 / np.abs(narr).max()
bed = np.zeros(N)


def env(n, atk, dec):
    e = np.arange(n) / SR
    return np.minimum(1, e / max(atk, 1e-4)) * np.exp(-e / dec)


def place(x, at, gain):
    a = int(at * SR)
    if a >= N:
        return
    x = x[:N - a]
    bed[a:a + len(x)] += gain * x


def region(i, sig, gain, fade=0.4):
    s = segs[i]
    ia, ib = int(max(0, s['start'] - 0.2) * SR), min(N, int((s['start'] + s['dur'] + XF) * SR))
    e = np.ones(ib - ia)
    f = int(fade * SR)
    e[:f] = np.linspace(0, 1, f)
    e[-f:] = np.linspace(1, 0, f)
    bed[ia:ib] += gain * sig[ia:ib] * e


def at(i, frac):
    return segs[i]['start'] + segs[i]['dur'] * frac


lp = lambda f, x: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
drone = (np.sin(2 * np.pi * 49 * tt) + 0.6 * np.sin(2 * np.pi * 73.4 * tt) + 0.3 * np.sin(2 * np.pi * 98 * tt + np.sin(0.7 * tt))) / 2
bed += 0.04 * drone * (0.7 + 0.3 * np.sin(2 * np.pi * 0.09 * tt))
wind = lp(400, brown)
wind /= np.abs(wind).max()
rain = sosfilt(butter(2, [1500, 7000], 'band', fs=SR, output='sos'), white)
rain /= np.abs(rain).max()
waves = lp(700, white) * (0.35 + 0.65 * np.sin(2 * np.pi * 0.16 * tt) ** 2)
waves /= np.abs(waves).max()
n = int(2.5 * SR)
boom = np.sin(2 * np.pi * 40 * tt[:n] * (1 - 0.12 * tt[:n])) * env(n, 0.005, 0.7) + 0.4 * white[:n] * env(n, 0.001, 0.04)
place(boom, 0.0, 0.4)
hit_n = int(2.5 * SR)
sting = (np.sin(2 * np.pi * 70 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 466 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 494 * tt[:hit_n])
         + 0.4 * np.sin(2 * np.pi * 740 * tt[:hit_n])) * env(hit_n, 0.002, 0.8)
region(1, wind, 0.45)
region(7, wind, 0.25)
place(sting, at(1, 0.55), 0.16)
cl_n = int(0.04 * SR)
click = white[:cl_n] * env(cl_n, 0.0005, 0.008)
place(click, at(2, 0.04), 0.5)
murmur = sosfilt(butter(2, [200, 700], 'band', fs=SR, output='sos'), white) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tt))
murmur /= np.abs(murmur).max()
region(3, murmur, 0.1)
wh_n = int(1.8 * SR)
whistle = (np.sin(2 * np.pi * 700 * tt[:wh_n]) + 0.6 * np.sin(2 * np.pi * 880 * tt[:wh_n])) * np.minimum(1, tt[:wh_n] / 0.15) * np.minimum(1, (1.8 - tt[:wh_n]) / 0.5)
place(lp(2000, whistle), at(3, 0.15), 0.06)
rus_n = int(0.45 * SR)
rustle = sosfilt(butter(2, 2500, 'high', fs=SR, output='sos'), white[:rus_n]) * env(rus_n, 0.02, 0.12)
rustle /= np.abs(rustle).max()
for i_, xs in ((2, (0.3, 0.7)), (4, (0.2, 0.5, 0.8)), (5, (0.1, 0.3, 0.5, 0.7))):
    for x in xs:
        place(rustle, at(i_, x), 0.2)
coin_n = int(0.5 * SR)
coin = np.sin(2 * np.pi * 3100 * tt[:coin_n]) * env(coin_n, 0.001, 0.12) + 0.5 * np.sin(2 * np.pi * 4700 * tt[:coin_n]) * env(coin_n, 0.001, 0.08)
place(coin, at(4, 0.35), 0.12)
tick = np.sin(2 * np.pi * 2500 * tt[:int(.02 * SR)]) * env(int(.02 * SR), 0.0005, 0.004)
for x in np.arange(segs[6]['start'] + 0.2, segs[6]['start'] + segs[6]['dur'], 0.8):
    place(tick, x, 0.22)
place(sting, at(6, 0.45), 0.14)
train_n = int(segs[7]['dur'] * SR)
train = lp(250, white[:train_n]) * (0.5 + 0.5 * (np.sin(2 * np.pi * 2.2 * tt[:train_n]) > 0.6)) * np.sin(np.linspace(0, np.pi, train_n))
train /= np.abs(train).max()
place(train, segs[7]['start'], 0.25)
place(lp(2000, whistle), at(7, 0.1), 0.04)
pad_n = int(segs[7]['dur'] * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (196, 233.1, 293.7, 98)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[7]['start'], 0.07)
place(sting, segs[7]['vo_start'] + segs[7]['vo_dur'] + 0.2, 0.2)
_sil = np.ones(N)
_s0, _s1 = int((segs[7]['start'] - 0.15) * SR), int((segs[7]['vo_start'] - 0.05) * SR)

# original eerie score: D minor i-VI-iv-V at 70 bpm
beat = 60 / 70
bar = beat * 4
chords = [(146.8, 174.6, 220.0), (116.5, 146.8, 174.6), (98.0, 116.5, 146.8), (110.0, 138.6, 164.8)]
music = np.zeros(N)
nb = int(TOTAL / bar) + 1
for b in range(nb):
    ch = chords[b % 4]
    a0 = int(b * bar * SR)
    ln = int(bar * SR * 1.15)
    seg_t = np.arange(ln) / SR
    pad_env = np.minimum(1, seg_t / 1.2) * np.minimum(1, np.maximum(0, (bar * 1.15 - seg_t)) / 0.6)
    padv = sum(np.sin(2 * np.pi * f_ * seg_t) + 0.5 * np.sin(2 * np.pi * f_ * 1.003 * seg_t) for f_ in ch) * pad_env / 6
    music[a0:a0 + ln] += padv[:max(0, min(ln, N - a0))]
    bass = np.sin(2 * np.pi * ch[0] / 2 * seg_t) * np.exp(-seg_t / 0.9)
    for k_ in (0, 2):
        a1 = a0 + int(k_ * beat * SR)
        m_ = max(0, min(ln, N - a1))
        music[a1:a1 + m_] += 0.6 * bass[:m_]
    arp = [ch[0] * 2, ch[1] * 2, ch[2] * 2, ch[1] * 2, ch[0] * 4, ch[2] * 2, ch[1] * 2, ch[2] * 2]
    for k_, f_ in enumerate(arp):
        a1 = a0 + int(k_ * beat / 2 * SR)
        nl = int(1.5 * SR)
        nt = np.arange(nl) / SR
        note = (np.sin(2 * np.pi * f_ * nt) + 0.3 * np.sin(2 * np.pi * f_ * 2 * nt)) * np.exp(-nt / 0.45) * np.minimum(1, nt / 0.004)
        m_ = max(0, min(nl, N - a1))
        music[a1:a1 + m_] += 0.35 * note[:m_]
wet = music.copy()
for dl, g in ((0.11, 0.35), (0.23, 0.25), (0.37, 0.18), (0.53, 0.12)):
    n_ = int(dl * SR)
    wet[n_:] += g * music[:-n_]
music = lp(3500, wet)
music /= np.abs(music).max()
music *= np.minimum(1, tt / 2.0) * np.clip((TOTAL - tt) / 2.5, 0, 1)
bed += 0.16 * music
duck = np.convolve(np.abs(narr) > 0.02, np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
mix = np.tanh((narr + bed * _sil * (1 - 0.4 * duck)) * 1.1) * 0.95
sf.write(D + 'mix.wav', mix[:int(TOTAL * SR)], SR)

caps = []
for s, sc in zip(segs, SCENES):
    words = sc[0].split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) == 3 or w[-1] in '.,?!':
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    wts = [sum(len(w) + 2 for w in c) for c in chunks]
    t0 = s['vo_start']
    for c, wg in zip(chunks, wts):
        dd = s['vo_dur'] * wg / sum(wts)
        caps.append((t0, t0 + dd, c, sc[5]))
        t0 += dd

# ------------------------------------------------------------------ video
imgs = [Image.open(D + f's{i + 1}.png').convert('RGB') for i in range(8)]
HIDDEN = {}
rr = np.random.default_rng(1)
grains = [rr.normal(0, 5, (H, W, 1)).astype(np.float32) for _ in range(6)]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
vign = (1 - 0.45 * (np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / math.sqrt(2)) ** 2.2)[..., None]
rains = []
for k in range(4):
    L = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(L)
    r_ = random.Random(k)
    for _ in range(500):
        x, y = r_.uniform(-100, W), r_.uniform(-100, H)
        ln = r_.uniform(40, 120)
        dr.line([(x, y), (x + ln * 0.15, y + ln)], fill=int(r_.uniform(50, 130)), width=2)
    rains.append(np.asarray(L, np.float32)[..., None] / 255)
gy, gx = np.ogrid[0:H, 0:W]


def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def gauss(px, py, rad):
    return np.exp(-(((gx - px) ** 2 + (gy - py) ** 2) / (2 * rad * rad))).astype(np.float32)[..., None]


def glow(f, px, py, rad, col, amt):
    f += gauss(px, py, rad) * np.array(col, np.float32) * amt


def warp(f, y0, y1, amp, freq, speed, T):
    y0, y1 = max(0, int(y0)), min(H, int(y1))
    if y1 - y0 < 2:
        return
    dx = (amp * np.sin(np.arange(y0, y1) / freq + T * speed)).astype(np.int32)
    cols = np.clip(np.arange(W)[None, :] + dx[:, None], 0, W - 1)
    f[y0:y1] = f[y0:y1][np.arange(y1 - y0)[:, None], cols]


def render_scene(i, T):
    s, sc = segs[i], SCENES[i]
    lt = min(1, max(0, (T - s['start']) / s['dur']))
    z0, z1, c0, c1 = sc[2]
    e = ease(lt)
    z = z0 + (z1 - z0) * e
    cx = (c0[0] + (c1[0] - c0[0]) * e) * W
    cy = (c0[1] + (c1[1] - c0[1]) * e) * H
    fx = sc[3]
    if 'wave7' in fx:
        cx += math.sin(T * 31) * 4 * lt
        cy += math.cos(T * 27) * 4 * lt
    cw, ch = W / z, H / z
    cx = min(max(cx, cw / 2), W - cw / 2)
    cy = min(max(cy, ch / 2), H - ch / 2)
    bx, by = cx - cw / 2, cy - ch / 2
    f = np.asarray(imgs[i].resize((W, H), Image.BICUBIC, box=(bx, by, bx + cw, by + ch)), np.float32).copy()
    if i in HIDDEN:
        hv = np.asarray(HIDDEN[i].resize((W, H), Image.BICUBIC, box=(bx, by, bx + cw, by + ch)), np.float32)
        a_ = ease((lt - 0.12) / 0.45)
        f = hv * (1 - a_) + f * a_

    def P(nx, ny):
        return (nx * W - bx) * z, (ny * H - by) * z

    def Y(ny):
        return (ny * H - by) * z
    sec = T - s['start']
    if 'studio2' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.3)
        glow(f, *P(0.035, 0.295), 60 * z, (255, 170, 80), 0.7 * fl)
        glow(f, *P(0.86, 0.247), 50 * z, (170, 185, 230), 0.35 + 0.1 * math.sin(T * 2))
    if 'mist' in fx:
        g = gauss(*P(0.2 + 0.6 * lt, 0.3), 380 * z)
        f[:] = f * (1 - 0.15 * g) + g * 35
        glow(f, *P(0.7, 0.2), 200 * z, (120, 140, 190), 0.12)
    if 'flashlight' in fx:
        ph = ease(lt)
        sp = gauss(*P(0.25 + 0.5 * math.sin(ph * 2.6), 0.3 + 0.35 * ph), 260 * z)
        f[:] = f * (0.55 + 0.6 * sp) + sp * np.array([60, 55, 40], np.float32)
    if 'station' in fx:
        glow(f, *P(0.42, 0.09), 80 * z, (255, 190, 90), 0.55 * (0.8 + 0.2 * math.sin(T * 9) * math.sin(T * 3)))
        for j, px in enumerate((0.7, 0.8, 0.9)):
            glow(f, *P(px, 0.2), 40 * z, (255, 200, 110), 0.25 + 0.12 * math.sin(T * 5 + j))
    if 'belongings' in fx:
        glow(f, *P(0.63, 0.24), 90 * z, (255, 190, 90), 0.55 * (0.8 + 0.2 * math.sin(T * 7) * math.sin(T * 2.3)))
        for j, (px, py) in enumerate(((0.08, 0.6), (0.12, 0.66), (0.06, 0.7))):
            g_ = max(0, math.sin(T * 2.4 - j * 1.5)) ** 8
            glow(f, *P(px, py), 22 * z, (255, 245, 210), 0.8 * g_)
    if 'route' in fx:
        glow(f, *P(0.19, 0.06), 70 * z, (255, 170, 80), 0.6 * (0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4)))
        for j, (px, py) in enumerate(((0.58, 0.19), (0.53, 0.24), (0.67, 0.25), (0.72, 0.28), (0.61, 0.28), (0.52, 0.31), (0.75, 0.34))):
            on = ease((lt - j * 0.1) / 0.08)
            glow(f, *P(px, py), 22 * z, (255, 40, 40), 0.9 * on * (0.75 + 0.25 * math.sin(T * 5 + j)))
    if 'lamp' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.3)
        f *= 0.92 + 0.08 * fl
        glow(f, *P(0.9, 0.54), 90 * z, (255, 190, 90), 0.55 * fl)
    if 'platform' in fx:
        for j, (px, py) in enumerate(((0.3, 0.05), (0.18, 0.2), (0.88, 0.33))):
            glow(f, *P(px, py), 45 * z, (255, 190, 90), 0.4 * (0.8 + 0.2 * math.sin(T * 6 + j)))
        g = gauss(*P(0.7 - 0.3 * lt, 0.3), 400 * z)
        f[:] = f * (1 - 0.15 * g) + g * 25
    if i == 7:
        endf = ease((sec - (s['vo_start'] - s['start'] + s['vo_dur'] + 1.0)) / 1.2)
        f *= 1 - endf
    return f


def draw_words(d, lines_words, cy, f, line_h):
    tot = len(lines_words) * line_h
    for li, ws in enumerate(lines_words):
        gap = f.size * 0.3
        widths = [d.textlength(w.upper(), font=f) + gap for w in ws]
        x = W / 2 - (sum(widths) - gap) / 2
        y = cy - tot / 2 + li * line_h
        for w, wd in zip(ws, widths):
            key = ''.join(c for c in w.upper() if c.isalnum() or c == ',')
            key2 = ''.join(c for c in w.upper() if c.isalpha())
            col = (235, 35, 35) if (key in RED or key2 in RED) else (255, 255, 255)
            d.text((x, y), w.upper(), font=f, fill=col, stroke_width=10, stroke_fill=(0, 0, 0))
            x += wd


def wrap(words, f, d, maxw=W - 160):
    lines, cur = [], []
    for w in words:
        if cur and d.textlength(' '.join(cur + [w]).upper(), font=f) > maxw:
            lines.append(cur)
            cur = []
        cur.append(w)
    lines.append(cur)
    return lines


def frame(T):
    i = max(j for j, s in enumerate(segs) if s['start'] <= T + 1e-6)
    f = render_scene(i, T)
    xf = T - segs[i]['start']
    if i > 0 and xf < XF:
        a = ease(xf / XF)
        prev = render_scene(i - 1, T)
        f = prev * (1 - a) + f * a
        if i in (2, 6):
            f += 160 * (1 - abs(a - 0.5) * 2)
    f *= vign
    f += grains[int(T * FPS) % 6]
    if T < 0.15:
        f *= T / 0.15
    out = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    lab = SCENES[i][4]
    if lab and xf > 0.2:
        lines = lab.split(' · ')
        lh = FLAB.size + 14
        tw = max(d.textlength(l_, font=FLAB) for l_ in lines)
        y0 = 150
        d.rounded_rectangle([W / 2 - tw / 2 - 30, y0, W / 2 + tw / 2 + 30, y0 + lh * len(lines) + 24], 16, fill=(0, 0, 0),
                            outline=(240, 220, 170), width=3)
        for li, l_ in enumerate(lines):
            lw = d.textlength(l_, font=FLAB)
            d.text((W / 2 - lw / 2, y0 + 14 + li * lh), l_, font=FLAB, fill=(240, 220, 170))
    for t0, t1, c, cy in caps:
        if t0 <= T < t1:
            draw_words(d, wrap(c, FCAP, d), cy, FCAP, 98)
    s = segs[7]
    if i == 7 and T > s['vo_start'] + s['vo_dur'] + 1.9:
        draw_words(d, [['NOBODY', 'KNOWS'], ['WHO', 'SHE', 'WAS']], H / 2 - 110, FEND, 118)
        _t = 'THE ISDAL WOMAN · UNIDENTIFIED SINCE 1970'
        _F = ImageFont.truetype(F_BLACK, 40)
        _w = d.textlength(_t, font=_F)
        d.text((W / 2 - _w / 2, H / 2 + 120), _t, font=_F, fill=(240, 230, 215), stroke_width=5, stroke_fill=(0, 0, 0))
        tw = d.textlength('PLOT TWIST WITH A&R', font=FSUB)
        d.text((W / 2 - tw / 2, H / 2 + 230), 'PLOT TWIST WITH A&R', font=FSUB, fill=(235, 35, 35), stroke_width=8, stroke_fill=(0, 0, 0))
    return out


if PREVIEW:
    times = [s['start'] + s['dur'] * q for s in segs for q in (0.15, 0.7)] + [TOTAL - 0.5]
    tw, th = 216, 384
    sheet = Image.new('RGB', (9 * tw, 2 * th))
    for j, T in enumerate(times):
        sheet.paste(frame(T).resize((tw, th)), ((j % 9) * tw, (j // 9) * th))
    sheet.save(D + 'preview.png')
    print('total', round(TOTAL, 2))
    sys.exit()

nfr = int(TOTAL * FPS)
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                      '-i', '-', '-i', D + 'mix.wav', '-c:v', 'libx264', '-preset', 'medium', '-b:v', '9M', '-maxrate', '12M',
                      '-bufsize', '18M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest',
                      '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
for n_ in range(nfr):
    p.stdin.write(frame(n_ / FPS).tobytes())
    if n_ % 300 == 0:
        print(n_, '/', nfr, flush=True)
p.stdin.close()
p.wait()
print('done', OUT, round(TOTAL, 2))
