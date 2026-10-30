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
    ((3, 3, 464, 394), (0.6, 0.4), ['shadow']),
    ((479, 3, 938, 394), (0.55, 0.42), ['studio']),
    ((3, 410, 540, 788), (0.72, 0.55), ['spotlight']),
    ((555, 410, 938, 788), (0.5, 0.45), ['greenglow', 'glide']),
    ((3, 804, 464, 1207), (0.52, 0.62), ['tv']),
    ((480, 803, 938, 1207), (0.5, 0.5), ['smoke', 'glide']),
    ((3, 1222, 436, 1669), (0.42, 0.48), ['card']),
    ((452, 1222, 938, 1669), (0.45, 0.22), ['eye8']),
]
LINES = [
    ("Did you catch these hidden D C references in Clayface? The movie has some surprising connections to Batman's world.",
     "Did you catch these hidden DC references in Clayface? The movie has some surprising connections to Batman's world."),
    ("First, Matt visits Imperial Pictures. That studio also appeared in Batman: The Animated Series.",
     "First, Matt visits Imperial Pictures. That studio also appeared in Batman: The Animated Series."),
    ("Specifically, it comes from Feat of Clay, the two-part episode that helped inspire this movie's version of Matt Hagen.",
     "Specifically, it comes from \"Feat of Clay,\" the two-part episode that helped inspire this movie's version of Matt Hagen."),
    ("The movie's early scenes take place in Coast City. The city famous as Green Lantern Hal Jordan's home.",
     "The movie's early scenes take place in Coast City. The city famous as Green Lantern Hal Jordan's home."),
    ("Look closely during the awards broadcast. Two fictional movie titles are nods to famous Batman stories.",
     "Look closely during the awards broadcast. Two fictional movie titles are nods to famous Batman stories."),
    ("One is No Man's Land, named after the Batman storyline where Gotham is cut off from the outside world.",
     "One is No Man's Land, named after the Batman storyline where Gotham is cut off from the outside world."),
    ("Another is One Bad Day, a phrase connected to the Joker and The Killing Joke. It's also the name of a series of Batman villain comics.",
     "Another is One Bad Day, a phrase connected to the Joker and The Killing Joke. It's also the name of a series of Batman villain comics."),
    ("And Clayface's final form brings his comic-book look to life, while keeping a piece of Matt's humanity. Which Easter egg did you catch?",
     "And Clayface's final form brings his comic-book look to life, while keeping a piece of Matt's humanity. Which Easter egg did you catch?"),
]
RED = {'DC', 'IMPERIAL', 'PICTURES', 'FEAT', 'CLAY', 'COAST', 'GREEN', 'LANTERN', 'MANS', 'LAND', 'BAD', 'DAY',
       'JOKER', 'KILLING', 'JOKE', 'HUMANITY', 'EASTER', 'EGG'}

# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
k = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [k.create(t, voice='am_michael', speed=1.15, lang='en-us')[0] for t, _ in LINES]

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
region(0, wind, 0.35)
region(5, wind, 0.4)
waves = sosfilt(butter(2, 900, 'low', fs=SR, output='sos'), white) * (0.4 + 0.6 * np.sin(2 * np.pi * 0.18 * tt) ** 2)
waves /= np.abs(waves).max()
region(3, waves, 0.3)
proj = white * (np.sin(2 * np.pi * 24 * tt) > 0.85)
proj = sosfilt(butter(2, [800, 4000], 'band', fs=SR, output='sos'), proj)
proj /= np.abs(proj).max()
region(1, proj, 0.1)
region(2, hum, 0.035)
region(6, sosfilt(butter(2, 200, 'low', fs=SR, output='sos'), brown), 0.45)
region(7, sosfilt(butter(2, 200, 'low', fs=SR, output='sos'), brown), 0.45)

n = int(2.5 * SR)
boom = np.sin(2 * np.pi * 40 * tt[:n] * (1 - 0.12 * tt[:n])) * env(n, 0.005, 0.7) + 0.4 * white[:n] * env(n, 0.001, 0.04)
place(boom, INTRO_HOLD + INTRO_MOVE - 0.05, 0.5)
sw_n = int(0.5 * SR)
swoosh = sosfilt(butter(2, [400, 5000], 'band', fs=SR, output='sos'), white[:sw_n]) * np.sin(np.linspace(0, np.pi, sw_n)) ** 2
swoosh /= np.abs(swoosh).max()
place(swoosh, INTRO_HOLD, 0.25)
for s_ in segs[1:]:
    place(swoosh, s_['arrive'] - MOVE, 0.2)
place(swoosh, t_out, 0.25)
growl_n = int(2.5 * SR)
growl = (np.sin(2 * np.pi * np.cumsum(np.linspace(70, 40, growl_n)) / SR + 3 * np.sin(2 * np.pi * 7 * tt[:growl_n])) *
         (0.6 + 0.4 * rng.random(growl_n))) * env(growl_n, 0.3, 1.2)
growl = sosfilt(butter(2, 500, 'low', fs=SR, output='sos'), growl)
growl /= np.abs(growl).max()
place(growl, segs[0]['arrive'] + 0.8, 0.45)
place(growl, segs[2]['arrive'] + 0.6, 0.45)
place(growl, segs[7]['arrive'] + segs[7]['hold'] * 0.5, 0.35)
cl_n = int(0.04 * SR)
click = white[:cl_n] * env(cl_n, 0.0005, 0.008)
for x in (0.4, 0.55, 1.3, 2.1, 2.2, 3.4):
    place(click, segs[2]['arrive'] + x, 0.3)
sh_n = int(3.0 * SR)
shimmer = sum(np.sin(2 * np.pi * f_ * tt[:sh_n] * (1 + 0.002 * np.sin(2 * np.pi * 5 * tt[:sh_n]))) for f_ in (523, 784, 1046)) / 3
shimmer *= np.sin(np.linspace(0, np.pi, sh_n)) ** 2
place(shimmer, segs[3]['arrive'] + 0.4, 0.08)
st_n = int(0.6 * SR)
place(white[:st_n] * np.linspace(1, 0.3, st_n), segs[4]['arrive'], 0.15)
place(click, segs[4]['arrive'] + 0.6, 0.5)
app_n = int(4 * SR)
applause = sosfilt(butter(2, [1200, 4500], 'band', fs=SR, output='sos'), white[:app_n] * (rng.random(app_n) > 0.7))
applause = applause / np.abs(applause).max() * np.sin(np.linspace(0, np.pi, app_n))
place(applause, segs[4]['arrive'] + 0.8, 0.12)
crack = white * (rng.random(N) > 0.9993)
region(5, sosfilt(butter(2, 2500, 'low', fs=SR, output='sos'), crack), 1.5)
drip = np.sin(2 * np.pi * 1300 * tt[:int(.25 * SR)] * (1 + 0.4 * np.exp(-tt[:int(.25 * SR)] * 30))) * env(int(.25 * SR), 0.001, 0.05)
for i_ in (6, 7):
    for x in (0.3, 0.9, 1.5, 2.2, 2.8, 3.5, 4.3, 5.0):
        place(drip, segs[i_]['arrive'] + x, 0.2)
        place(drip, segs[i_]['arrive'] + x + 0.21, 0.06)
mb_n = int(0.6 * SR)
for j_, f_ in enumerate((1318, 1174, 1046, 987, 1046)):
    note = np.sin(2 * np.pi * f_ * tt[:mb_n]) * env(mb_n, 0.002, 0.25)
    place(note, segs[6]['arrive'] + 0.3 + j_ * 0.38, 0.1)
pad_n = int((segs[7]['hold'] + OUT_HOLD + OUT_MOVE + END_HOLD) * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (220, 261.6, 329.6, 110)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[7]['arrive'], 0.07)
place(boom, t_out + OUT_MOVE, 0.3)

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
RINGS = [(r_q.uniform(0.0, 1.0), r_q.uniform(0.0, 1.0), r_q.uniform(0, 1)) for _ in range(14)]
FIRES = [(0.38, 0.3), (0.52, 0.12), (0.82, 0.72), (0.62, 0.48), (0.2, 0.55)]


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
    if 'shadow' in fx:
        cxs = rect[0] - sx0 + (-0.4 + 1.6 * lt) * rw
        band = np.exp(-((gx - cxs) / (rw * 0.25)) ** 2).astype(np.float32)
        sub *= (1 - 0.6 * band)[..., None]
        glow(sub, *P(0.82, 0.25), rw * 0.1, (150, 160, 190), 0.3 + 0.1 * math.sin(T * 2))
        warp(sub, R(0, 0.85, 1, 1), 2, 6, 3, T)
    if 'studio' in fx:
        glow(sub, *P(0.12, 0.5), rw * 0.06, (255, 230, 170), 0.5 + 0.2 * math.sin(T * 13))
        sub *= 1 + 0.03 * math.sin(T * 2)
    if 'spotlight' in fx:
        fl = 1.0 if (math.sin(T * 17) * math.sin(T * 5.3) > -0.35) else 0.45
        glow(sub, *P(0.87, 0.15), rw * 0.07, (255, 235, 180), 0.9 * fl)
        glow(sub, *P(0.72, 0.4), rw * 0.2, (90, 80, 55), 0.5 * fl)
        sub *= 0.88 + 0.12 * fl
        warp(sub, R(0, 0, 0.62, 1), 1 + 3 * ease(lt), 14, 2, T)
    if 'greenglow' in fx:
        px = -0.1 + 1.2 * lt
        glow(sub, *P(px, 0.22 + 0.04 * math.sin(lt * 6)), rw * 0.12, (60, 255, 110), 0.75)
        glow(sub, *P(px - 0.12, 0.23), rw * 0.2, (20, 120, 50), 0.35)
        warp(sub, R(0, 0.66, 1, 1), 2, 7, 2.5, T)
    if 'tv' in fx:
        x0s, y0s, x1s, y1s = [int(v) for v in R(0.3, 0.4, 0.77, 0.92)]
        x0s, y0s = max(0, x0s), max(0, y0s)
        scr = sub[y0s:y1s, x0s:x1s]
        if scr.size:
            if lt < 0.12:
                scr[:] = np.random.default_rng(int(T * 100)).random(scr.shape[:2])[..., None] * 200
            else:
                fl = 0.85 + 0.15 * math.sin(T * 40) * math.sin(T * 7)
                scr *= fl
                scr[::4] *= 0.75
                glow(sub, *P(0.53, 0.66), rw * 0.25, (90, 100, 120), 0.25 * fl)
    if 'smoke' in fx:
        off = int((T * 35) % W)
        a = fogmap[sy0:sy1, off + sx0:off + sx1, None] * 0.4
        if a.shape[:2] == sub.shape[:2]:
            sub[:] = sub * (1 - a) + 35 * a
        for j, (px, py) in enumerate(FIRES):
            glow(sub, *P(px, py), rw * 0.04, (255, 120, 30), 0.45 + 0.25 * math.sin(T * 9 + j * 2))
    if 'card' in fx:
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for px, py, ph in RINGS:
            if 0.25 < px < 0.75 and 0.1 < py < 0.9:
                continue
            prog = (ph + T * 0.5) % 1
            x, y = P(px, py)
            rr_ = 6 + prog * rw * 0.12
            dr.ellipse([x - rr_, y - rr_ * 0.45, x + rr_, y + rr_ * 0.45], outline=(150, 175, 205), width=2)
        sub[:] = np.asarray(img, np.float32) * 1.0
        e = ease(lt)
        cxs, cys = P(0.42, 0.48)
        dist = np.sqrt((gx - cxs) ** 2 + (gy - cys) ** 2) / rw
        sub *= (1 - 0.35 * e * np.clip(dist * 1.5, 0, 1))[..., None]
    if 'eye8' in fx:
        glow(sub, *P(0.45, 0.19), rw * 0.025, (255, 225, 150), 0.6 * (0.8 + 0.2 * math.sin(T * 3)))
        glow(sub, *P(0.8, 0.05), rw * 0.15, (120, 140, 170), 0.3 + 0.1 * math.sin(T * 1.7))
        warp(sub, R(0, 0.88, 1, 1), 3, 7, 3, T)
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for j, xn in enumerate((0.74, 0.79, 0.84, 0.88)):
            ph = (T * 0.9 + j * 0.27) % 1
            x, y = P(xn, 0.1 + ph * 0.55)
            dr.ellipse([x - 3, y - 6, x + 3, y + 6], fill=(205, 215, 230))
        sub[:] = np.asarray(img, np.float32)


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
        draw_words(d, [['CLAYFACE'], ['EASTER', 'EGGS'], ['YOU', 'MISSED']], H / 2 - 40, FBIG, 135)
        draw_words(d, [['PART', '3']], H / 2 + 220, FSP, 90)
    for t0, t1, c in caps:
        if t0 <= T < t1:
            draw_words(d, wrap(c, FCAP, d), 1500, FCAP, 100)
    if T > t_out + OUT_MOVE * 0.6:
        draw_words(d, [['WHICH', 'ONE'], ['DID', 'YOU', 'CATCH?'], ['COMMENT', 'BELOW']], H / 2, FOUT, 120)
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
