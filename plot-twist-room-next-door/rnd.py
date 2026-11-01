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
    ("What if the motel room beside yours was empty... But someone kept knocking from inside?",
     'am_michael', (1.02, 1.1, (0.5, 0.5), (0.5, 0.46)), ['studio'], None, 1560),
    ("At 11:40 p.m., Elena checked into a roadside motel and locked her door.",
     'af_heart', (0.0, 1.0, 1.0, 1.0), ['neon'], None, 1520),
    ("Minutes later, three slow knocks came through the wall. She called reception.",
     'am_michael', (0.2, 0.7, 1.0, 1.06), ['knocks'], None, 1520),
    ("The clerk said room 208 was vacant. Then a man whispered, 'Open up. Housekeeping.'",
     'af_heart', (0.0, 1.0, 1.0, 1.04), ['whisper'], None, 1520),
    ("Elena checked the peephole. Nobody was outside. She called police and hid in the bathroom.",
     'am_michael', (0.0, 1.0, 1.0, 1.0), ['fluor'], None, 1520),
    ("That's when she heard metal scraping... followed by a lock clicking somewhere inside her room.",
     'af_heart', (0.15, 0.6, 1.0, 1.12), ['curtain'], None, 1520),
    ("Police arrived and searched the room next door. Its door was open. Nobody was there.",
     'am_michael', (0.0, 1.0, 1.0, 1.0), ['police'], None, 1520),
    ("Then an officer pulled back Elena's curtain. The knocking hadn't come through the wall. It came from a hidden connecting door. Someone had broken the lock.",
     'af_heart', (0.0, 1.0, 1.0, 1.0), ['reveal'], None, 1520),
]
SPLIT1 = ("What if the motel room beside yours was empty...", "But someone kept knocking from inside?")
RED = {'EMPTY...', 'EMPTY', 'KNOCKING', 'KNOCKS', 'VACANT', 'WHISPERED', 'HOUSEKEEPING', 'NOBODY', 'POLICE', 'SCRAPING',
       'CLICKING', 'HIDDEN', 'BROKEN', 'LOCK', 'INSIDE', '208'}


def say(t):
    return t.replace("11:40 p.m.", "eleven forty p m").replace("208", "two oh eight")


# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
kk = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [kk.create(say(t), voice=v, speed=1.0, lang='en-us')[0] for t, v, *_ in SCENES[1:]]
_a = kk.create(SPLIT1[0], voice='am_michael', speed=1.0, lang='en-us')[0]
_b = kk.create(SPLIT1[1], voice='af_heart', speed=1.0, lang='en-us')[0]
vo = [np.concatenate([_a, np.zeros(int(0.25 * SR)), _b])] + vo
XF, TAIL = 0.35, 3.2
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
traffic = lp(300, brown) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * tt))
traffic /= np.abs(traffic).max()
for i_ in (1, 2, 3, 6):
    region(i_, traffic, 0.25)
buzz = (np.sign(np.sin(2 * np.pi * 120 * tt)) * 0.3 + np.sin(2 * np.pi * 60 * tt))
for i_ in (1, 4):
    region(i_, buzz, 0.02)
hit_n = int(2.5 * SR)
sting = (np.sin(2 * np.pi * 70 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 466 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 494 * tt[:hit_n])
         + 0.4 * np.sin(2 * np.pi * 740 * tt[:hit_n])) * env(hit_n, 0.002, 0.8)
kn_n = int(0.35 * SR)
knock = (np.sin(2 * np.pi * 90 * tt[:kn_n]) * env(kn_n, 0.001, 0.05) + 0.5 * lp(900, white[:kn_n]) / 3 * env(kn_n, 0.0005, 0.02))
knock /= np.abs(knock).max()
KNOCK_T = [0.08, 0.17, 0.26]
for x in KNOCK_T:
    place(knock, at(2, 0) + 0.15 + (x - 0.08) * 6, 0.9)
ring_n = int(0.9 * SR)
ring = (np.sin(2 * np.pi * 440 * tt[:ring_n]) + np.sin(2 * np.pi * 480 * tt[:ring_n])) * (np.sin(2 * np.pi * 20 * tt[:ring_n]) > 0) * 0.5
place(ring, at(2, 0.72), 0.06)
wh_n = int(1.6 * SR)
whisper = sosfilt(butter(2, [2000, 6000], 'band', fs=SR, output='sos'), white[:wh_n]) * (np.abs(np.sin(2 * np.pi * 2.5 * tt[:wh_n])) ** 2) * np.sin(np.linspace(0, np.pi, wh_n))
whisper /= np.abs(whisper).max()
place(whisper, at(3, 0.62), 0.1)
place(sting, at(3, 0.55), 0.15)
step = np.sin(2 * np.pi * 70 * tt[:int(.3 * SR)]) * env(int(.3 * SR), 0.002, 0.05)
for x in (0.55, 0.62, 0.69):
    place(step, at(4, x), 0.3)
sc_n = int(1.0 * SR)
scrape = sosfilt(butter(2, [1500, 5000], 'band', fs=SR, output='sos'), white[:sc_n]) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt[:sc_n])) * np.sin(np.linspace(0, np.pi, sc_n))
scrape /= np.abs(scrape).max()
place(scrape, at(5, 0.2), 0.3)
place(scrape, at(5, 0.4), 0.3)
cl_n = int(0.06 * SR)
click = (white[:cl_n] * env(cl_n, 0.0005, 0.006) + np.sin(2 * np.pi * 2200 * tt[:cl_n]) * env(cl_n, 0.0005, 0.01))
CLICK_T = 0.66
place(click, at(5, CLICK_T), 0.8)
place(sting, at(5, CLICK_T) + 0.05, 0.12)
for x in (0.1, 0.18, 0.26, 0.6, 0.7):
    place(step, at(6, x), 0.35)
rad_n = int(0.6 * SR)
radio = sosfilt(butter(2, [800, 3000], 'band', fs=SR, output='sos'), white[:rad_n]) * np.sin(np.linspace(0, np.pi, rad_n))
radio /= np.abs(radio).max()
place(radio, at(6, 0.4), 0.06)
rus_n = int(0.6 * SR)
curt = sosfilt(butter(2, 1500, 'high', fs=SR, output='sos'), white[:rus_n]) * env(rus_n, 0.03, 0.2)
curt /= np.abs(curt).max()
place(curt, at(7, 0.06), 0.3)
SILENCE_T = 0.42
place(sting, at(7, SILENCE_T), 0.3)
place(boom, segs[7]['vo_start'] + segs[7]['vo_dur'] + 0.4, 0.4)
_sil = np.ones(N)
_a0 = int(at(7, SILENCE_T) * SR)
_a1 = int((segs[7]['vo_start'] + segs[7]['vo_dur'] + 0.35) * SR)
_sil[_a0:_a1] = 0
_sil[_a0 - int(0.05 * SR):_a0] = np.linspace(1, 0, int(0.05 * SR))
_sil[_a1:_a1 + int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
_sil[:int(at(7, SILENCE_T) * SR)] = 1
duck = np.convolve(np.abs(narr) > 0.02, np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
mix = np.tanh((narr + bed * _sil[:N] * (1 - 0.4 * duck)) * 1.1) * 0.95
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
imgs = [Image.open(D + 's1.png').convert('RGB')] + [Image.open(D + f'p{i}.png').convert('RGB') for i in range(2, 9)]
HIDDEN = {}
PY0, PHD = 500, 840
BGS = {}
for _i in range(1, 8):
    _p = imgs[_i]
    _sc = max(W / _p.width, H / _p.height)
    _bg = _p.resize((int(_p.width * _sc) + 1, int(_p.height * _sc) + 1), Image.BICUBIC)
    _bx = (_bg.width - W) // 2
    _bg = _bg.crop((_bx, 0, _bx + W, H)).filter(ImageFilter.GaussianBlur(30))
    BGS[_i] = np.asarray(_bg, np.float32) * 0.32
    _pw = int(_p.width * PHD / _p.height)
    imgs[_i] = _p.resize((_pw, PHD), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
FHEAD = ImageFont.truetype(F_BLACK, 76)
FTAG = ImageFont.truetype(F_BLACK, 34)
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


def render_panel(i, T):
    s, sc = segs[i], SCENES[i]
    lt = min(1, max(0, (T - s['start']) / s['dur']))
    sec = T - s['start']
    p0, p1, z0, z1 = sc[2]
    fx = sc[3]
    pim = imgs[i]
    e = ease(lt)
    z = z0 + (z1 - z0) * e
    if 'reveal' in fx:
        zz = ease((lt - 0.55) / 0.35)
        z = 1.0 + 1.6 * zz
    vw, vh = W / z, PHD / z
    pan = p0 + (p1 - p0) * e
    fxn, fyn = pan, 0.5
    if 'reveal' in fx:
        fxn = 0.3 + 0.35 * ease(lt / 0.5)
        fyn = 0.5 + (0.45 - 0.5) * zz
    cxp = fxn * pim.width
    cyp = fyn * PHD
    cxp = min(max(cxp, vw / 2), pim.width - vw / 2)
    cyp = min(max(cyp, vh / 2), PHD - vh / 2)
    bx, by = cxp - vw / 2, cyp - vh / 2
    if 'knocks' in fx:
        for kt in KNOCK_T:
            dt = sec - (0.15 + (kt - 0.08) * 6)
            if 0 <= dt < 0.25:
                bx += math.sin(dt * 90) * 10 * (1 - dt / 0.25)
    if 'whisper' in fx and lt > 0.55:
        bx += math.sin(T * 37) * 2
        by += math.cos(T * 31) * 2
    bx = min(max(bx, 0), pim.width - vw)
    by = min(max(by, 0), PHD - vh)
    view = np.asarray(pim.resize((W, PHD), Image.BICUBIC, box=(bx, by, bx + vw, by + vh)), np.float32).copy()
    sx = W / vw

    def P(nx, ny):
        return (nx * pim.width - bx) * sx, (ny * PHD - by) * sx
    gyp, gxp = np.ogrid[0:PHD, 0:W]

    def pg(px, py, rad):
        return np.exp(-(((gxp - px) ** 2 + (gyp - py) ** 2) / (2 * rad * rad))).astype(np.float32)[..., None]

    def pglow(px, py, rad, col, amt):
        view[:] += pg(px, py, rad) * np.array(col, np.float32) * amt
    if 'neon' in fx:
        on = 1.0 if math.sin(T * 13) * math.sin(T * 3.1) > -0.45 else 0.35
        pglow(*P(0.13, 0.2), 90, (255, 40, 50), 0.6 * on)
        for px in (0.12, 0.25, 0.37):
            pglow(*P(px, 0.55), 30, (255, 200, 110), 0.35)
    if 'knocks' in fx:
        pglow(*P(0.08, 0.6), 80, (255, 190, 90), 0.4 * (0.85 + 0.15 * math.sin(T * 9)))
    if 'whisper' in fx:
        view *= 1 - 0.25 * ease((lt - 0.55) / 0.2) * pg(*P(0.8, 0.5), 300)
    if 'fluor' in fx:
        fl = 1.0 if (math.sin(T * 23) * math.sin(T * 6.7) > -0.3) else 0.55
        view *= 0.85 + 0.15 * fl
        pglow(*P(0.18, 0.35), 60, (255, 200, 110), 0.4 * fl)
        pglow(*P(0.7, 0.2), 200, (170, 220, 230), 0.15 * fl)
    if 'curtain' in fx:
        x1 = int(P(0.75, 0)[0])
        x1 = max(0, min(W, x1))
        amp = 3 + 4 * math.sin(T * 1.7)
        dx = (amp * np.sin(np.arange(PHD) / 25 + T * 2.2)).astype(np.int32)
        cols = np.clip(np.arange(W)[None, :] + dx[:, None], 0, W - 1)
        wv = view[np.arange(PHD)[:, None], cols]
        view[:, :x1] = wv[:, :x1]
        pglow(*P(0.93, 0.45), 90, (255, 190, 90), 0.45)
        dt = sec - CLICK_T * s['dur']
        if dt >= 0:
            pglow(*P(0.76, 0.52), 160, (255, 40, 40), 0.9 * math.exp(-dt / 0.3))
    if 'police' in fx:
        for j, (px, py) in enumerate(((0.33, 0.58), (0.62, 0.62))):
            sway = 0.04 * math.sin(T * 1.6 + j * 2)
            pglow(*P(px + sway, py), 70, (255, 245, 210), 0.55 + 0.15 * math.sin(T * 7 + j))
            pglow(*P(px + 0.08 + sway, py + 0.05), 180, (120, 110, 80), 0.25)
        pglow(*P(0.82, 0.37), 60, (255, 190, 90), 0.4)
    if 'reveal' in fx:
        pglow(*P(0.6, 0.45), 120, (200, 170, 120), 0.3 * ease((lt - 0.3) / 0.3))
    f = BGS[i].copy()
    f[PY0:PY0 + PHD] = view
    f[PY0 - 4:PY0] = [200, 30, 30]
    f[PY0 + PHD:PY0 + PHD + 4] = [200, 30, 30]
    if 'reveal' in fx:
        endf = ease((sec - (s['vo_start'] - s['start'] + s['vo_dur'] + 0.35)) / 0.12)
        f *= 1 - endf
    return f


def render_scene(i, T):
    if i > 0:
        return render_panel(i, T)
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
    if 'studio' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.3)
        glow(f, *P(0.05, 0.17), 60 * z, (255, 170, 80), 0.6 * fl)
        glow(f, *P(0.17, 0.82), 50 * z, (255, 190, 90), 0.7 * (0.75 + 0.25 * math.sin(T * 13) * math.sin(T * 5)))
        glow(f, *P(0.37, 0.23), 45 * z, (170, 185, 230), 0.4 + 0.1 * math.sin(T * 2))
        warp(f, Y(0.32), Y(0.4), 2, 6, 3, T)
    if 'harbor' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 10) * math.sin(T * 3.3)
        glow(f, *P(0.1, 0.36), 50 * z, (255, 190, 90), 0.6 * fl)
        glow(f, *P(0.3, 0.45), 200 * z, (255, 140, 60), 0.2 + 0.05 * math.sin(T * 1.2))
        warp(f, Y(0.47), Y(0.55), 2, 5, 2.5, T)
    if 'lookout' in fx:
        warp(f, Y(0.38), Y(0.6), 4, 9, 2.8, T)
        glow(f, *P(0.73, 0.25), 80 * z, (180, 195, 235), 0.35 + 0.1 * math.sin(T * 1.6))
        glow(f, *P(0.15, 0.77), 70 * z, (255, 190, 90), 0.55 * (0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4)))
        f *= 1 - 0.18 * gauss(*P(0.3 + 0.4 * lt, 0.2), 300 * z)
    if 'deck' in fx:
        glow(f, *P(0.6, 0.47), 70 * z, (255, 190, 90), 0.6 * (0.8 + 0.2 * math.sin(T * 9) * math.sin(T * 3.1)))
        glow(f, *P(0.63, 0.06), 70 * z, (180, 195, 235), 0.35)
        glow(f, *P(0.6, 0.38), 140 * z, (90, 70, 40), 0.2 + 0.1 * math.sin(T * 1.5))
    if 'quarters' in fx:
        glow(f, *P(0.17, 0.72), 70 * z, (255, 190, 90), 0.6 * (0.8 + 0.2 * math.sin(T * 10) * math.sin(T * 3.7)))
        glow(f, *P(0.77, 0.36), 60 * z, (255, 190, 90), 0.5 * (0.8 + 0.2 * math.sin(T * 8 + 1)))
        f *= 1 + 0.03 * math.sin(T * 0.9)
    if 'hold' in fx:
        warp(f, Y(0.74), Y(0.97), 4, 6, 3.2, T)
        glow(f, *P(0.48, 0.38), 120 * z, (255, 40, 40), 0.25 + 0.2 * math.sin(T * 3))
        glow(f, *P(0.85, 0.37), 50 * z, (255, 190, 90), 0.5)
        glow(f, *P(0.42, 0.3), 60 * z, (180, 195, 235), 0.3)
    if 'logbook' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.3)
        glow(f, *P(0.15, 0.38), 90 * z, (255, 190, 90), 0.6 * fl)
        glow(f, *P(0.5, 0.5), 300 * z, (90, 60, 20), 0.18 * fl)
    if 'gibraltar' in fx:
        glow(f, *P(0.5, 0.35), 300 * z, (110, 120, 170), 0.2 * ease((lt - 0.1) / 0.5))
        warp(f, Y(0.72), Y(0.8), 2, 5, 2.5, T)
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
    if i > 0 and not (i == 7 and T > segs[7]['vo_start'] + segs[7]['vo_dur'] + 0.35):
        hw = d.textlength('THE ROOM NEXT DOOR', font=FHEAD)
        d.text((W / 2 - hw / 2, 290), 'THE ROOM NEXT DOOR', font=FHEAD, fill=(225, 30, 30), stroke_width=8, stroke_fill=(0, 0, 0))
        tw2 = d.textlength('A FICTIONALIZED HORROR STORY', font=FTAG)
        d.text((W / 2 - tw2 / 2, 388), 'A FICTIONALIZED HORROR STORY', font=FTAG, fill=(220, 210, 190))
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
    if i == 7 and T > s['vo_start'] + s['vo_dur'] + 0.9:
        draw_words(d, [['THE', 'ROOM'], ['NEXT', 'DOOR']], H / 2 - 120, FEND, 118)
        tw3 = d.textlength('A FICTIONALIZED HORROR STORY', font=FTAG)
        d.text((W / 2 - tw3 / 2, H / 2 + 140), 'A FICTIONALIZED HORROR STORY', font=FTAG, fill=(220, 210, 190))
        tw = d.textlength('PLOT TWIST WITH R&A', font=FSUB)
        d.text((W / 2 - tw / 2, H / 2 + 230), 'PLOT TWIST WITH R&A', font=FSUB, fill=(235, 35, 35), stroke_width=8, stroke_fill=(0, 0, 0))
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
