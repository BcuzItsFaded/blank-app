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
    ((6, 8, 594, 322), (0.6, 0.5), ['map']),
    ((612, 9, 1189, 322), (0.5, 0.45), ['rain', 'lightning', 'seawarp', 'shiplights']),
    ((7, 342, 592, 619), (0.58, 0.5), ['lantern']),
    ((612, 342, 1192, 619), (0.6, 0.5), ['lens']),
    ((8, 640, 592, 902), (0.55, 0.45), ['rain', 'spray']),
    ((614, 640, 1190, 903), (0.6, 0.45), ['rain', 'lightning', 'seawarp']),
    ((8, 924, 592, 1296), (0.6, 0.4), ['check']),
    ((613, 925, 1189, 1295), (0.62, 0.4), ['portraits']),
]
KEYS = {i: [(0.0, 0.5, 0.5, 1.0), (1.0, 0.5 + (p[1][0] - 0.5) * 0.25, 0.5 + (p[1][1] - 0.5) * 0.25, 0.93)] for i, p in enumerate(PANELS)}
VOICES = ['am_michael', 'af_heart'] * 4
LABELS = {1: 'HISTORICAL REENACTMENT', 2: 'HISTORICAL REENACTMENT', 3: 'HISTORICAL REENACTMENT', 4: 'RECONSTRUCTION', 5: 'RECONSTRUCTION'}
LINES = [
    ("December fifteenth, nineteen hundred. A passing ship noticed something terrifying. A lighthouse off Scotland's coast had gone dark.",
     "December 15th, 1900. A passing ship noticed something terrifying. A lighthouse off Scotland's coast had gone dark."),
    ('Eleven days later, a relief ship arrived at the Flan-nan Isles. Its horn sounded... A signal rocket was fired... Nobody answered.',
     'Eleven days later, a relief ship arrived at the Flannan Isles. Its horn sounded... A signal rocket was fired... Nobody answered.'),
    ('Relief keeper Joseph Moore went ashore. Inside the lighthouse, he discovered that all three keepers had vanished.',
     'Relief keeper Joseph Moore went ashore. Inside the lighthouse, he discovered that all three keepers had vanished.'),
    ('The lamps were prepared. The machinery was clean. The kitchen was tidy. But two sets of outdoor clothing were missing.',
     'The lamps were prepared. The machinery was clean. The kitchen was tidy. But two sets of outdoor clothing were missing.'),
    ('Outside, investigators discovered twisted iron railings and evidence that enormous waves had struck the island.',
     'Outside, investigators discovered twisted iron railings and evidence that enormous waves had struck the island.'),
    ('Investigators believed the men had gone near the landing area and were swept into the ocean by a massive wave.',
     'Investigators believed the men had gone near the landing area and were swept into the ocean by a massive wave.'),
    ('The official investigation concluded that a massive wave was the most likely explanation.',
     'The official investigation concluded that a massive wave was the most likely explanation.'),
    ('But no bodies were ever found. More than a century later, nobody can say with certainty exactly how those three men died.',
     'But no bodies were ever found. More than a century later, nobody can say with certainty exactly how those three men died.'),
]
RED = {'DARK', 'TERRIFYING', 'NOBODY', 'ANSWERED', 'VANISHED', 'MISSING', 'TWISTED', 'ENORMOUS', 'WAVES', 'WAVE', 'MASSIVE',
       'BODIES', 'NEVER', 'CERTAINTY', 'DIED', '1900'}

# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
k = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [k.create(t, voice=VOICES[j], speed=1.12, lang='en-us')[0] for j, (t, _) in enumerate(LINES)]

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
rain = sosfilt(butter(2, [1500, 7000], 'band', fs=SR, output='sos'), white)
rain /= np.abs(rain).max()
waves = sosfilt(butter(2, 700, 'low', fs=SR, output='sos'), white) * (0.35 + 0.65 * np.sin(2 * np.pi * 0.16 * tt) ** 2)
waves /= np.abs(waves).max()
for i_ in (1, 4, 5):
    region(i_, rain, 0.13)
    region(i_, waves, 0.4)
    region(i_, wind, 0.3)
for i_ in (2, 3):
    region(i_, wind, 0.45)
n = int(2.5 * SR)
boom = np.sin(2 * np.pi * 40 * tt[:n] * (1 - 0.12 * tt[:n])) * env(n, 0.005, 0.7) + 0.4 * white[:n] * env(n, 0.001, 0.04)
place(boom, INTRO_HOLD + INTRO_MOVE - 0.05, 0.4)
sw_n = int(0.5 * SR)
swoosh = sosfilt(butter(2, [400, 5000], 'band', fs=SR, output='sos'), white[:sw_n]) * np.sin(np.linspace(0, np.pi, sw_n)) ** 2
swoosh /= np.abs(swoosh).max()
place(swoosh, INTRO_HOLD, 0.22)
for s_ in segs[1:]:
    place(swoosh, s_['arrive'] - MOVE, 0.15)
place(swoosh, t_out, 0.22)
horn_n = int(1.8 * SR)
horn = sosfilt(butter(2, 600, 'low', fs=SR, output='sos'), np.sign(np.sin(2 * np.pi * 98 * tt[:horn_n])) + np.sign(np.sin(2 * np.pi * 147 * tt[:horn_n]))) * np.minimum(1, tt[:horn_n] / 0.1) * np.minimum(1, (1.8 - tt[:horn_n]) / 0.3)
horn /= np.abs(horn).max()
place(horn, segs[1]['arrive'] + segs[1]['hold'] * 0.4, 0.3)
rk_n = int(0.9 * SR)
rocket = np.sin(2 * np.pi * np.cumsum(np.linspace(600, 2400, rk_n)) / SR) * np.linspace(0.2, 1, rk_n) * 0.5 + sosfilt(butter(2, 3000, 'high', fs=SR, output='sos'), white[:rk_n]) * 0.3
place(rocket, segs[1]['arrive'] + segs[1]['hold'] * 0.6, 0.12)
place(boom[:int(.6 * SR)], segs[1]['arrive'] + segs[1]['hold'] * 0.6 + 0.9, 0.25)
thunder = sosfilt(butter(2, 220, 'low', fs=SR, output='sos'), white[:3 * SR])
thunder = thunder / np.abs(thunder).max() * env(3 * SR, 0.05, 0.9)
LIGHT_T = [0.2]
for i_ in (1, 5):
    place(thunder, segs[i_]['arrive'] + LIGHT_T[0] * segs[i_]['hold'], 0.5)
cr_n = int(1.4 * SR)
creak = np.sin(2 * np.pi * np.cumsum(np.linspace(300, 180, cr_n) * (1 + 0.1 * np.sign(np.sin(2 * np.pi * 30 * tt[:cr_n])))) / SR) * np.sin(np.linspace(0, np.pi, cr_n)) ** 2
place(creak, segs[2]['arrive'] + 0.3, 0.08)
step = np.sin(2 * np.pi * 70 * tt[:int(.3 * SR)]) * env(int(.3 * SR), 0.002, 0.05)
for x in (1.4, 1.9, 2.4, 2.9):
    place(step, segs[2]['arrive'] + x, 0.35)
tick = np.sin(2 * np.pi * 2500 * tt[:int(.02 * SR)]) * env(int(.02 * SR), 0.0005, 0.004)
for x in np.arange(0.2, segs[3]['hold'], 0.8):
    place(tick, segs[3]['arrive'] + x, 0.25)
crash_n = int(3 * SR)
crash = sosfilt(butter(2, 1800, 'low', fs=SR, output='sos'), white[:crash_n]) * env(crash_n, 0.08, 0.8)
crash /= np.abs(crash).max()
for i_, xs in ((4, (0.25, 0.65)), (5, (0.45,))):
    for x in xs:
        place(crash, segs[i_]['arrive'] + segs[i_]['hold'] * x, 0.45)
rus_n = int(0.4 * SR)
rustle = sosfilt(butter(2, 2500, 'high', fs=SR, output='sos'), white[:rus_n]) * env(rus_n, 0.02, 0.1)
place(rustle, segs[6]['arrive'] + 0.2, 0.2)
place(rustle, segs[6]['arrive'] + segs[6]['hold'] * 0.5, 0.25)
pad_n = int((segs[6]['hold'] + segs[7]['hold'] + MOVE + OUT_HOLD + OUT_MOVE + END_HOLD) * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (196, 233.1, 293.7, 98)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[6]['arrive'], 0.06)
place(horn, segs[7]['arrive'] + segs[7]['hold'] + 0.5, 0.12)
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
MP = 600
_up = page.resize((int(PW * UP), int(PH * UP)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 70, 2))
base = Image.new('RGB', (int((PW + 2 * MP) * UP), int((PH + 2 * MP) * UP)), (8, 8, 10))
base.paste(_up, (int(MP * UP), int(MP * UP)))


def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def panel_cam(i, lt):
    (x0, y0, x1, y1), (fx, fy), fxs = PANELS[i]
    pw, ph = x1 - x0, y1 - y0
    vw0 = max(pw * 1.06, ph * 1.04 * W / H)
    ks = KEYS[i]
    lt = min(1, max(0, lt))
    for a, b in zip(ks, ks[1:]):
        if a[0] <= lt <= b[0]:
            e = ease((lt - a[0]) / max(1e-6, b[0] - a[0]))
            nx, ny, z = (a[j] + (b[j] - a[j]) * e for j in (1, 2, 3))
            break
    else:
        nx, ny, z = ks[-1][1:]
    return x0 + nx * pw, y0 + ny * ph + ph * 0.12, vw0 * z


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
FLAB = ImageFont.truetype(F_BLACK, 44)


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
    sec = lt * segs[i]['hold']
    if 'map' in fx:
        glow(sub, *P(0.77, 0.66), rw * 0.03, (255, 220, 80), 0.6 + 0.4 * math.sin(T * 4))
        glow(sub, *P(0.3, 0.5), rw * 0.25, (90, 60, 20), 0.15 + 0.05 * math.sin(T * 1.3))
    if 'seawarp' in fx:
        warp(sub, R(0, 0.55, 1, 0.82), 3, 9, 3, T)
    if 'shiplights' in fx:
        fl = 0.75 + 0.25 * math.sin(T * 9)
        for px in (0.12, 0.2, 0.28):
            glow(sub, *P(px, 0.52), rw * 0.02, (255, 200, 100), 0.5 * fl)
    if 'rain' in fx:
        sub += rains[int(T * FPS) % 4][sy0:sy1, sx0:sx1] * 90
    if 'lightning' in fx:
        for lt0 in (LIGHT_T[0], 0.7):
            dt = sec - lt0 * segs[i]['hold']
            if dt >= 0:
                a = math.exp(-dt / 0.15) * (0.6 + 0.4 * (int(dt * 30) % 2 == 0))
                sub += a * np.array([130, 140, 180], np.float32) * (1 if lt0 == LIGHT_T[0] else 0.5)
    if 'lantern' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.3 + 1)
        glow(sub, *P(0.64, 0.8), rw * 0.06, (255, 190, 90), 0.7 * fl)
        glow(sub, *P(0.64, 0.75), rw * 0.2, (120, 70, 20), 0.3 * fl)
    if 'lens' in fx:
        glow(sub, *P(0.9, 0.3), rw * 0.12, (255, 200, 90), 0.35 + 0.2 * math.sin(T * 2))
    if 'spray' in fx:
        warp(sub, R(0.35, 0.0, 1, 1), 3, 8, 4, T)
        for x0_ in (0.25, 0.65):
            dt = lt - x0_
            if 0 <= dt < 0.2:
                a = math.exp(-dt * segs[i]['hold'] / 0.3)
                glow(sub, *P(0.65, 0.3), rw * 0.25, (200, 220, 240), 0.6 * a)
    if 'check' in fx:
        e = ease((lt - 0.45) / 0.15)
        glow(sub, *P(0.55, 0.42), rw * 0.04, (255, 60, 50), 0.7 * e * (0.8 + 0.2 * math.sin(T * 5)))
    if 'portraits' in fx:
        glow(sub, *P(0.78, 0.3), rw * 0.25, (90, 80, 60), 0.15 + 0.05 * math.sin(T * 1.5))


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
        draw_words(d, [['THE', 'FLANNAN', 'ISLES'], ['DISAPPEARANCE']], H / 2 - 60, FOUT, 120)
        draw_words(d, [['A', 'TRUE', 'STORY']], H / 2 + 140, FSP, 90)
    for i_, a_, _ in act:
        if a_ > 0.6 and i_ in LABELS:
            draw_words(d, [LABELS[i_].split()], 250, FLAB, 60)
    for t0, t1, c in caps:
        if t0 <= T < t1:
            draw_words(d, wrap(c, FCAP, d), 1500, FCAP, 100)
    if T > t_out + OUT_MOVE * 0.6:
        draw_words(d, [['THEIR', 'EXACT', 'FATE'], ['REMAINS', 'UNKNOWN']], H / 2, FOUT, 120)
    return out


if PREVIEW:
    times = [0.3] + [s['arrive'] + s['hold'] * q for s in segs for q in (0.1, 0.8)] + [TOTAL - 0.5]
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
