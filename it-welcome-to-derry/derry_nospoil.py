import json, math, random, subprocess, sys
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.signal import lfilter, butter, sosfilt

D = __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '/'
OUT = sys.argv[1]
PREVIEW = '--preview' in sys.argv
W, H, FPS, SR = 1080, 1920, 30, 24000
UP = 2.5
F_BLACK = '/usr/share/fonts/opentype/inter/Inter-Black.otf'

# panel rects on the page (x0, y0, x1, y1), focus point for the push-in, effect list
PANELS = [
    ((3, 3, 465, 409), (0.5, 0.4), ['clouds', 'fog', 'glide']),
    ((475, 3, 938, 409), (0.55, 0.35), ['mist']),
    ((3, 419, 465, 827), (0.55, 0.5), ['fog']),
    ((475, 419, 938, 827), (0.52, 0.35), ['shade']),
    ((3, 837, 465, 1234), (0.45, 0.25), ['fire']),
    ((475, 837, 938, 1234), (0.5, 0.45), ['blade', 'glide']),
    ((3, 1244, 465, 1669), (0.5, 0.4), ['stars', 'falls', 'pull']),
    ((475, 1244, 938, 1669), (0.5, 0.4), ['stars8', 'rise']),
]
LINES = [
    ('Before there was a town called Derry, something terrifying was already waiting in the woods.', 'Before there was a town called Derry, something terrifying was already waiting in the woods.'),
    ('This Halloween, A Story of Derry follows three youngsters into the Western Wood.', 'This Halloween, A Story of Derry follows three youngsters into the Western Wood.'),
    ("They know the stories. They've heard the warnings. They go in anyway.", "They know the stories. They've heard the warnings. They go in anyway."),
    ('This is a story from long before Pennywise wore the face of a clown.', 'This is a story from long before Pennywise wore the face of a clown.'),
    ('Every legend in Derry starts somewhere. This one starts around a fire.', 'Every legend in Derry starts somewhere. This one starts around a fire.'),
    ('Keep your eyes open. Some details matter more than you think.', 'Keep your eyes open. Some details matter more than you think.'),
    ("And longtime Stephen King fans... you'll want to watch very closely.", "And longtime Stephen King fans... you'll want to watch very closely."),
    ('No spoilers. Just watch it tonight. Then come back and tell me what you caught.', 'No spoilers. Just watch it tonight. Then come back and tell me what you caught.'),
]
RED = {'DERRY', 'TERRIFYING', 'WESTERN', 'WOOD', 'WARNINGS', 'ANYWAY', 'PENNYWISE', 'CLOWN', 'FIRE', 'EYES', 'CLOSELY', 'SPOILERS', 'TONIGHT'}

# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
k = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [k.create(t, voice='am_michael', speed=1.05, lang='en-us')[0] for t, _ in LINES]

INTRO_HOLD, INTRO_MOVE, MOVE, PAD, OUT_HOLD, OUT_MOVE, END_HOLD = 0.9, 0.8, 0.45, 0.3, 0.6, 0.8, 2.0
segs, t = [], INTRO_HOLD + INTRO_MOVE
for i, v in enumerate(vo):
    hold = 0.1 + len(v) / SR + PAD
    segs.append(dict(arrive=t, vo_start=t + 0.1, vo_dur=len(v) / SR, hold=hold))
    t += hold + (MOVE if i < 7 else 0)
t_out = t + OUT_HOLD
TOTAL = t_out + OUT_MOVE + END_HOLD

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


def span(i, extra=0.0):
    s = segs[i]
    return s['arrive'] - 0.3, s['arrive'] + s['hold'] + MOVE + extra


def region(i, sig, gain, fade=0.3):
    a, b = span(i)
    ia, ib = int(a * SR), min(N, int(b * SR))
    e = np.ones(ib - ia)
    f = int(fade * SR)
    e[:f] = np.linspace(0, 1, f)
    e[-f:] = np.linspace(1, 0, f)
    bed[ia:ib] += gain * sig[ia:ib] * e


drone = (np.sin(2 * np.pi * 49 * tt) + 0.6 * np.sin(2 * np.pi * 73.4 * tt) + 0.3 * np.sin(2 * np.pi * 98 * tt + np.sin(0.7 * tt)))
drone *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.09 * tt)
bed += 0.045 * drone / 2
rain = sosfilt(butter(2, [1500, 7000], 'band', fs=SR, output='sos'), white)
rain /= np.abs(rain).max()
crowd = sosfilt(butter(2, [250, 900], 'band', fs=SR, output='sos'), white) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.6 * tt))
crowd /= np.abs(crowd).max()
hum = np.sign(np.sin(2 * np.pi * 120 * tt)) * 0.3 + np.sin(2 * np.pi * 60 * tt)
gurg = sosfilt(butter(2, 300, 'low', fs=SR, output='sos'), white) * (np.abs(np.sin(2 * np.pi * 3.1 * tt + 2 * np.sin(1.3 * tt))) ** 3)
gurg /= np.abs(gurg).max()
wind = sosfilt(butter(2, 400, 'low', fs=SR, output='sos'), brown)
wind /= np.abs(wind).max()
bed += 0.12 * wind
crick = np.sin(2 * np.pi * 4100 * tt) * (np.sin(2 * np.pi * 28 * tt) > 0.2) * (np.sin(2 * np.pi * 0.9 * tt) > 0.4)
for i_ in (0, 1, 2, 7):
    region(i_, crick, 0.012)
crack = white * (rng.random(N) > 0.9992)
region(4, sosfilt(butter(2, 3000, 'low', fs=SR, output='sos'), crack), 1.6)
region(4, sosfilt(butter(2, 300, 'low', fs=SR, output='sos'), brown), 0.35)
region(3, sosfilt(butter(2, 150, 'low', fs=SR, output='sos'), brown), 0.8)

n = int(2.5 * SR)
boom = np.sin(2 * np.pi * 40 * tt[:n] * (1 - 0.12 * tt[:n])) * env(n, 0.005, 0.7) + 0.4 * white[:n] * env(n, 0.001, 0.04)
place(boom, INTRO_HOLD + INTRO_MOVE - 0.05, 0.45)
sw_n = int(0.5 * SR)
swoosh = sosfilt(butter(2, [400, 5000], 'band', fs=SR, output='sos'), white[:sw_n]) * np.sin(np.linspace(0, np.pi, sw_n)) ** 2
swoosh /= np.abs(swoosh).max()
place(swoosh, INTRO_HOLD, 0.22)
for s_ in segs[1:]:
    place(swoosh, s_['arrive'] - MOVE, 0.16)
place(swoosh, t_out, 0.22)
hoot_n = int(0.45 * SR)
hoot = np.sin(2 * np.pi * np.cumsum(np.linspace(430, 380, hoot_n)) / SR) * np.sin(np.linspace(0, np.pi, hoot_n)) ** 2
for x in (1.2, 1.75):
    place(hoot, segs[0]['arrive'] + x, 0.12)
place(hoot, segs[2]['arrive'] + 2.0, 0.08)
growl_n = int(3.0 * SR)
growl = (np.sin(2 * np.pi * np.cumsum(np.linspace(55, 38, growl_n)) / SR + 3 * np.sin(2 * np.pi * 6 * tt[:growl_n])) *
         (0.6 + 0.4 * rng.random(growl_n))) * env(growl_n, 0.6, 1.4)
growl = sosfilt(butter(2, 450, 'low', fs=SR, output='sos'), growl)
growl /= np.abs(growl).max()
place(growl, segs[3]['arrive'] + 0.3, 0.5)
wh_n = int(2.0 * SR)
whisper = sosfilt(butter(2, [2000, 6000], 'band', fs=SR, output='sos'), white[:wh_n]) * (np.abs(np.sin(2 * np.pi * 3 * tt[:wh_n])) ** 2) * np.sin(np.linspace(0, np.pi, wh_n))
whisper /= np.abs(whisper).max()
place(whisper, segs[3]['arrive'] + 0.8, 0.07)
ting_n = SR
ting = np.sin(2 * np.pi * 2650 * tt[:ting_n]) * env(ting_n, 0.001, 0.4) + 0.5 * np.sin(2 * np.pi * 3980 * tt[:ting_n]) * env(ting_n, 0.001, 0.25)
place(ting, segs[5]['arrive'] + segs[5]['hold'] * 0.45, 0.16)
sh_n = int(4.5 * SR)
shimmer = sum(np.sin(2 * np.pi * f_ * tt[:sh_n] * (1 + 0.002 * np.sin(2 * np.pi * 4 * tt[:sh_n]))) for f_ in (392, 587, 784, 1175)) / 4
shimmer *= np.sin(np.linspace(0, np.pi, sh_n)) ** 2
place(shimmer, segs[6]['arrive'] - 0.2, 0.09)
falls = sosfilt(butter(2, [300, 3000], 'band', fs=SR, output='sos'), white)
falls /= np.abs(falls).max()
region(6, falls, 0.05)
pad_n = int((segs[7]['hold'] + OUT_HOLD + OUT_MOVE + END_HOLD) * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (196, 233.1, 293.7, 98)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[7]['arrive'], 0.07)
place(boom, t_out + OUT_MOVE, 0.25)

duck = np.convolve(np.abs(narr) > 0.02, np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
mix = np.tanh((narr + bed * (1 - 0.4 * duck)) * 1.1) * 0.95
sf.write(D + 'mix.wav', mix[:int(TOTAL * SR)], SR)

caps = []
for s, (_, disp) in zip(segs, LINES):
    words = disp.split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) == 3 or w[-1] in '.,?!':
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    wts = [sum(len(w) + 2 for w in c) + (6 if c[-1].endswith('...') else 0) for c in chunks]
    t0 = s['vo_start']
    for c, wg in zip(chunks, wts):
        dd = s['vo_dur'] * wg / sum(wts)
        caps.append((t0, t0 + dd, c))
        t0 += dd

# ------------------------------------------------------------------ video
page = Image.open(D + 'page.png').convert('RGB')
PW, PH = page.size
MP = 400
_up = page.resize((int(PW * UP), int(PH * UP)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 70, 2))
base = Image.new('RGB', (int((PW + 2 * MP) * UP), int((PH + 2 * MP) * UP)), (8, 8, 10))
base.paste(_up, (int(MP * UP), int(MP * UP)))


def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def panel_cam(i, lt):
    (x0, y0, x1, y1), (fx, fy), _ = PANELS[i]
    pw = x1 - x0
    e = ease(lt)
    if 'rise' in PANELS[i][2]:
        return (x0 + x1) / 2, y0 + (y1 - y0) * (0.62 - 0.4 * e), pw * (1.0 - 0.1 * e)
    if 'glide' in PANELS[i][2]:
        return x0 + pw * (0.38 + 0.24 * e), (y0 + y1) / 2 + (y1 - y0) * 0.12, pw * 0.82
    vw = pw * ((0.84 + 0.22 * e) if 'pull' in PANELS[i][2] else (1.06 - 0.2 * e))
    pe = (1 - e) if 'pull' in PANELS[i][2] else e
    cx = (x0 + x1) / 2 + ((x0 + fx * pw) - (x0 + x1) / 2) * 0.6 * pe
    cy = (y0 + y1) / 2 + ((y0 + fy * (y1 - y0)) - (y0 + y1) / 2) * 0.6 * pe + (y1 - y0) * 0.12
    return cx, cy, vw


FULL = (PW / 2, PH / 2, PW)


def lerp_cam(a, b, e):
    return tuple(a[j] + (b[j] - a[j]) * e for j in range(3))


def state(T):
    """camera, list of (panel index, highlight alpha, panel-local time)"""
    if T < INTRO_HOLD:
        return FULL, [], 0
    if T < INTRO_HOLD + INTRO_MOVE:
        e = ease((T - INTRO_HOLD) / INTRO_MOVE)
        return lerp_cam(FULL, panel_cam(0, 0), e), [(0, e, 0)], 0
    for i, s in enumerate(segs):
        lt = (T - s['arrive']) / s['hold']
        if T < s['arrive'] + s['hold']:
            return panel_cam(i, lt), [(i, 1, lt)], 0
        if i < 7 and T < s['arrive'] + s['hold'] + MOVE:
            e = ease((T - s['arrive'] - s['hold']) / MOVE)
            return lerp_cam(panel_cam(i, 1), panel_cam(i + 1, 0), e), [(i, 1 - e, lt), (i + 1, e, 0)], 0
    s = segs[7]
    lt = (T - s['arrive']) / s['hold']
    if T < t_out:
        return panel_cam(7, min(1, lt)), [(7, 1, lt)], 0
    e = ease((T - t_out) / OUT_MOVE)
    return lerp_cam(panel_cam(7, 1), FULL, e), [(7, 1 - e, lt)], e


rr = np.random.default_rng(1)
grains = [rr.normal(0, 6, (H, W, 1)).astype(np.float32) for _ in range(6)]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
vign = (1 - 0.45 * (np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / math.sqrt(2)) ** 2.2)[..., None]
rains = []
for kk in range(4):
    L = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(L)
    r_ = random.Random(kk)
    for _ in range(500):
        x, y = r_.uniform(-100, W), r_.uniform(-100, H)
        ln = r_.uniform(40, 120)
        dr.line([(x, y), (x + ln * 0.15, y + ln)], fill=int(r_.uniform(50, 130)), width=2)
    rains.append(np.asarray(L, np.float32)[..., None] / 255)
fsmall = Image.fromarray((rr.random((H // 16, W * 2 // 16)) * 255).astype('uint8')).resize((W * 2, H), Image.BICUBIC)
fogmap = np.asarray(fsmall.filter(ImageFilter.GaussianBlur(40)), np.float32) / 255
fogmap = np.clip((fogmap - 0.3) * 1.8, 0, 1)
FLASH_PTS = [(0.08, 0.15), (0.2, 0.3), (0.05, 0.35), (0.3, 0.12), (0.15, 0.22), (0.25, 0.4)]
FCAP = font = ImageFont.truetype(F_BLACK, 84)
FBIG = ImageFont.truetype(F_BLACK, 112)
FOUT = ImageFont.truetype(F_BLACK, 96)
FSP = ImageFont.truetype(F_BLACK, 70)


def glow(sub, px, py, rad, col, amt):
    h, w = sub.shape[:2]
    gy, gx = np.ogrid[0:h, 0:w]
    g = np.exp(-(((gx - px) ** 2 + (gy - py) ** 2) / (2 * rad * rad))).astype(np.float32)
    sub += g[..., None] * np.array(col, np.float32) * amt


NANO = [(0.27, 0.58), (0.37, 0.45), (0.63, 0.38), (0.74, 0.43), (0.77, 0.22), (0.49, 0.86)]
r_p = random.Random(3)
PARTS = [(r_p.uniform(0.3, 0.8), r_p.uniform(0.2, 0.9), r_p.uniform(3, 9), r_p.uniform(0, 1)) for _ in range(60)]


def warp(sub, region, amp, freq, speed, T, axis_rows=True):
    x0p, y0p, x1p, y1p = region
    hh, ww = sub.shape[:2]
    x0p, x1p = max(0, int(x0p)), min(ww, int(x1p))
    y0p, y1p = max(0, int(y0p)), min(hh, int(y1p))
    if x1p - x0p < 2 or y1p - y0p < 2:
        return
    dx = (amp * np.sin(np.arange(hh) / freq + T * speed)).astype(np.int32)
    cols = np.clip(np.arange(ww)[None, :] + dx[:, None], 0, ww - 1)
    warped = sub[np.arange(hh)[:, None], cols]
    sub[y0p:y1p, x0p:x1p] = warped[y0p:y1p, x0p:x1p]


r_q = random.Random(11)
STARS = [(r_q.uniform(0, 1), r_q.uniform(0, 0.55), r_q.uniform(0, 6.28), r_q.uniform(1.5, 4)) for _ in range(40)]
EMBERS = [(r_q.uniform(0.55, 0.95), r_q.uniform(0, 1), r_q.uniform(0.6, 1.4)) for _ in range(30)]
CLOUDS = []
for _k in range(3):
    cl = Image.new('L', (300, 120), 0)
    ImageDraw.Draw(cl).ellipse([20, 20, 280, 100], fill=255)
    CLOUDS.append(np.asarray(cl.filter(ImageFilter.GaussianBlur(18)), np.float32) / 255)


def effects(f, i, lt, T, rect):
    sx0, sy0, sx1, sy1 = [int(round(v)) for v in rect]
    sx0, sy0 = max(sx0, 0), max(sy0, 0)
    sx1, sy1 = min(sx1, W), min(sy1, H)
    if sx1 - sx0 < 4 or sy1 - sy0 < 4:
        return
    sub = f[sy0:sy1, sx0:sx1]
    rw, rh = rect[2] - rect[0], rect[3] - rect[1]

    def P(nx, ny):
        return rect[0] + nx * rw - sx0, rect[1] + ny * rh - sy0

    def R(a, b, c, d):
        return (*P(a, b), *P(c, d))
    fx = PANELS[i][2]
    hh, ww = sub.shape[:2]
    gy, gx = np.ogrid[0:hh, 0:ww]
    if 'clouds' in fx:
        glow(sub, *P(0.66, 0.06), rw * 0.08, (150, 165, 190), 0.35)
        for k_, (spd, yn, dark) in enumerate(((0.9, 0.05, 0.75), (0.6, 0.1, 0.6), (1.2, 0.02, 0.7))):
            cx_ = (-0.4 + ((lt * spd + k_ * 0.45) % 1.6))
            cl = CLOUDS[k_]
            cw_, ch_ = int(rw * 0.5), int(rw * 0.2)
            m = np.asarray(Image.fromarray((cl * 255).astype(np.uint8)).resize((max(cw_, 2), max(ch_, 2))), np.float32) / 255
            px, py = P(cx_, yn)
            px, py = int(px), int(py)
            ax0, ay0 = max(0, px), max(0, py)
            ax1, ay1 = min(ww, px + m.shape[1]), min(hh, py + m.shape[0])
            if ax1 > ax0 and ay1 > ay0:
                mm = m[ay0 - py:ay1 - py, ax0 - px:ax1 - px][..., None] * dark
                sub[ay0:ay1, ax0:ax1] = sub[ay0:ay1, ax0:ax1] * (1 - mm) + 28 * mm
    if 'fog' in fx or 'mist' in fx:
        off = int((T * 45) % W)
        a = fogmap[sy0:sy1, off + sx0:off + sx1, None] * (0.18 if 'mist' in fx else 0.4)
        if a.shape[:2] == sub.shape[:2]:
            sub[:] = sub * (1 - a) + 140 * a
    if 'shade' in fx:
        warp(sub, R(0.2, 0.0, 0.85, 0.7), 2 + 3 * math.sin(T * 1.3), 18, 1.6, T)
        breathe = 0.85 + 0.15 * math.sin(T * 1.8)
        cxs, cys = P(0.52, 0.25)
        g = np.exp(-(((gx - cxs) / (rw * 0.3)) ** 2 + ((gy - cys) / (rh * 0.35)) ** 2)).astype(np.float32)
        sub *= (1 - 0.35 * g * breathe * ease(lt * 2))[..., None]
    if 'fire' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.7 + 1)
        glow(sub, *P(0.75, 0.68), rw * 0.18, (255, 130, 40), 0.55 * fl)
        sub *= 0.9 + 0.12 * fl
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for ex, ph, sp in EMBERS:
            prog = (ph + T * 0.35 * sp) % 1
            x, y = P(ex + 0.05 * math.sin(T * 2 + ph * 9), 0.75 - prog * 0.75)
            r_ = 2.5 * (1 - prog) + 1
            dr.ellipse([x - r_, y - r_, x + r_, y + r_], fill=(255, int(170 * (1 - prog)) + 60, 40))
        sub[:] = np.asarray(img, np.float32)
    if 'blade' in fx:
        px, py = 0.15 + 0.6 * lt, 0.62 - 0.22 * lt
        glow(sub, *P(px, py), rw * 0.06, (200, 220, 255), 0.85)
        glow(sub, *P(px, py), rw * 0.16, (90, 110, 150), 0.3)
        glow(sub, *P(0.55, 0.0), rw * 0.2, (60, 70, 90), 0.25 + 0.08 * math.sin(T * 1.5))
    if 'stars' in fx or 'stars8' in fx:
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for sxn, syn, ph, sz in STARS:
            if 'stars8' in fx and 0.2 < sxn < 0.8 and syn > 0.45:
                continue
            a = 0.5 + 0.5 * math.sin(T * 3 + ph)
            if a > 0.55:
                x, y = P(sxn, syn * (0.6 if 'stars8' in fx else 1.0))
                r_ = sz * a
                dr.line([(x - r_ * 2, y), (x + r_ * 2, y)], fill=(220, 230, 255), width=1)
                dr.line([(x, y - r_ * 2), (x, y + r_ * 2)], fill=(220, 230, 255), width=1)
                dr.ellipse([x - r_ * 0.6, y - r_ * 0.6, x + r_ * 0.6, y + r_ * 0.6], fill=(240, 245, 255))
        sub[:] = np.asarray(img, np.float32)
        if 'stars' in fx:
            glow(sub, *P(0.68, 0.12), rw * 0.06, (170, 190, 230), 0.3 + 0.1 * math.sin(T * 2))
    if 'falls' in fx:
        warp(sub, R(0.6, 0.45, 0.8, 0.68), 2, 3, 9, T)


def draw_words(d, lines_words, cy, f, line_h):
    tot = len(lines_words) * line_h
    for li, ws in enumerate(lines_words):
        gap = f.size * 0.3
        widths = [d.textlength(w.upper(), font=f) + gap for w in ws]
        x = W / 2 - (sum(widths) - gap) / 2
        y = cy - tot / 2 + li * line_h
        for w, wd in zip(ws, widths):
            key = ''.join(c for c in w.upper() if c.isalpha())
            d.text((x, y), w.upper(), font=f, fill=(235, 35, 35) if key in RED else (255, 255, 255),
                   stroke_width=10, stroke_fill=(0, 0, 0))
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
    (cx, cy, vw), act, outro = state(T)
    if any(PANELS[i][2].count('shake') for i, a, _ in act if a > 0.5):
        cx += math.sin(T * 31) * 1.2
        cy += math.cos(T * 27) * 1.2
    vh = vw * H / W
    box = ((cx + MP - vw / 2) * UP, (cy + MP - vh / 2) * UP, (cx + MP + vw / 2) * UP, (cy + MP + vh / 2) * UP)
    im = base.resize((W, H), Image.BILINEAR, box=box)
    f = np.asarray(im, np.float32).copy()
    sc = W / (vw * UP)

    def to_screen(r):
        return [((r[0] + MP) * UP - box[0]) * sc, ((r[1] + MP) * UP - box[1]) * sc, ((r[2] + MP) * UP - box[0]) * sc, ((r[3] + MP) * UP - box[1]) * sc]
    dim = np.full((H, W, 1), 0.3 + 0.7 * (1 - max([a for _, a, _ in act], default=0)) if act else 1.0, np.float32)
    for i, a, lt in act:
        rect = to_screen(PANELS[i][0])
        effects(f, i, max(0, lt), T, rect)
        x0, y0, x1, y1 = [int(round(v)) for v in rect]
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
        if x1 > x0 and y1 > y0:
            dim[y0:y1, x0:x1] = np.maximum(dim[y0:y1, x0:x1], 0.3 + 0.7 * a)
    f *= dim
    f *= vign
    f += grains[int(T * FPS) % 6]
    out = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    if T < INTRO_HOLD + 0.3:
        draw_words(d, [['IT:', 'WELCOME'], ['TO', 'DERRY']], H / 2 - 80, FBIG, 135)
        draw_words(d, [['A', 'STORY', 'OF', 'DERRY']], H / 2 + 110, FSP, 90)
        draw_words(d, [['NO', 'SPOILERS']], H / 2 + 200, FSP, 90)
    for t0, t1, c in caps:
        if t0 <= T < t1:
            draw_words(d, wrap(c, FCAP, d), 1500, FCAP, 100)
    if T > t_out + OUT_MOVE * 0.6:
        draw_words(d, [['WATCH', 'IT'], ['TONIGHT'], ['THEN', 'COMMENT']], H / 2, FOUT, 120)
    return out


if PREVIEW:
    times = [0.3] + [s['arrive'] + s['hold'] * 0.6 for s in segs] + [TOTAL - 0.5]
    tw, th = 270, 480
    sheet = Image.new('RGB', (5 * tw, 2 * th))
    for j, T in enumerate(times):
        sheet.paste(frame(T).resize((tw, th)), ((j % 5) * tw, (j // 5) * th))
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
