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
    ((5, 5, 462, 384), (0.42, 0.32), ['flashes']),
    ((479, 5, 936, 384), (0.5, 0.35), ['rain', 'lightning']),
    ((5, 401, 462, 739), (0.55, 0.3), ['bulbs']),
    ((479, 401, 936, 739), (0.48, 0.55), ['vial']),
    ((5, 755, 462, 1162), (0.62, 0.45), ['melt']),
    ((479, 755, 936, 1162), (0.42, 0.5), ['rain', 'fog', 'shake']),
    ((5, 1177, 462, 1667), (0.7, 0.62), ['alarm']),
    ((479, 1177, 936, 1667), (0.52, 0.5), ['ripple', 'drips', 'eye']),
]
LINES = [
    ("He had the most famous face in the city.", "He had the most famous face in the city."),
    ("But this city always takes something back.", "But this city always takes something back."),
    ("The roles dried up. And the mirror stopped being kind.", "The roles dried up. And the mirror stopped being kind."),
    ("Then she offered him a miracle. One dose... and he'd be young forever.", "Then she offered him a miracle. One dose... and he'd be young forever."),
    ("But the serum didn't fix his face. It melted it.", "But the serum didn't fix his face. It MELTED it."),
    ("Now he can become anyone. Anything.", "Now he can become anyone. Anything."),
    ("She tried to lock away what she'd created.", "She tried to lock away what she'd created."),
    ("She failed. And he's still down there... waiting.", "She failed. And he's still down there... waiting."),
]
RED = {'FACE', 'MIRACLE', 'MELTED', 'ANYTHING', 'CREATED', 'FAILED', 'WAITING', 'FOREVER', 'SERUM'}

# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
k = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [k.create(t, voice='am_michael', speed=0.92, lang='en-us')[0] for t, _ in LINES]

INTRO_HOLD, INTRO_MOVE, MOVE, PAD, OUT_HOLD, OUT_MOVE, END_HOLD = 0.7, 0.9, 0.55, 0.4, 0.8, 0.9, 2.2
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
region(0, crowd, 0.12)
region(1, rain, 0.12)
region(5, rain, 0.14)
region(2, hum, 0.02)
region(3, hum, 0.03)
region(4, gurg, 0.35)
region(7, gurg, 0.2)
region(7, sosfilt(butter(2, 200, 'low', fs=SR, output='sos'), brown), 0.6)

n = int(2.5 * SR)
boom = np.sin(2 * np.pi * 40 * tt[:n] * (1 - 0.12 * tt[:n])) * env(n, 0.005, 0.7) + 0.4 * white[:n] * env(n, 0.001, 0.04)
place(boom, INTRO_HOLD + INTRO_MOVE - 0.05, 0.5)
sw_n = int(0.5 * SR)
swoosh = sosfilt(butter(2, [400, 5000], 'band', fs=SR, output='sos'), white[:sw_n]) * np.sin(np.linspace(0, np.pi, sw_n)) ** 2
swoosh /= np.abs(swoosh).max()
place(swoosh, INTRO_HOLD, 0.25)
for s in segs[1:]:
    place(swoosh, s['arrive'] - MOVE, 0.2)
place(swoosh, t_out, 0.25)
shutter = white[:int(0.04 * SR)] * env(int(0.04 * SR), 0.0005, 0.008)
FLASH_T = [0.12, 0.3, 0.38, 0.55, 0.7, 0.86]
for ft in FLASH_T:
    place(shutter, segs[0]['arrive'] + ft * segs[0]['hold'], 0.45)
thunder = sosfilt(butter(2, 220, 'low', fs=SR, output='sos'), white[:3 * SR])
thunder = thunder / np.abs(thunder).max() * env(3 * SR, 0.05, 0.9)
LIGHT_T = [0.25]
place(thunder, segs[1]['arrive'] + LIGHT_T[0] * segs[1]['hold'], 0.6)
ting = np.sin(2 * np.pi * 2650 * tt[:SR]) * env(SR, 0.001, 0.25) + 0.5 * np.sin(2 * np.pi * 3980 * tt[:SR]) * env(SR, 0.001, 0.15)
place(ting, segs[3]['arrive'] + 0.4, 0.22)
growl_n = int(2.2 * SR)
growl = (np.sin(2 * np.pi * 52 * tt[:growl_n] + 3 * np.sin(2 * np.pi * 7 * tt[:growl_n])) *
         (0.6 + 0.4 * rng.random(growl_n))) * env(growl_n, 0.3, 1.0)
growl = sosfilt(butter(2, 500, 'low', fs=SR, output='sos'), growl)
growl /= np.abs(growl).max()
place(growl, segs[5]['arrive'] + 0.2, 0.5)
place(growl, segs[7]['arrive'] + segs[7]['hold'] * 0.75, 0.55)
step = np.sin(2 * np.pi * 45 * tt[:int(.4 * SR)]) * env(int(.4 * SR), 0.003, 0.09)
for x in np.arange(0.3, segs[5]['hold'], 0.75):
    place(step, segs[5]['arrive'] + x, 0.6)
beep = np.sign(np.sin(2 * np.pi * 880 * tt[:int(.18 * SR)])) * env(int(.18 * SR), 0.003, 0.5)
for x in np.arange(0.25, segs[6]['hold'] + MOVE, 0.4):
    place(beep, segs[6]['arrive'] + x, 0.07)
hiss = sosfilt(butter(2, 3000, 'high', fs=SR, output='sos'), white[:3 * SR]) * np.linspace(0, 1, 3 * SR) ** 2
place(hiss, segs[6]['arrive'] + 0.5, 0.06)
drip = np.sin(2 * np.pi * 1300 * tt[:int(.25 * SR)] * (1 + 0.4 * np.exp(-tt[:int(.25 * SR)] * 30))) * env(int(.25 * SR), 0.001, 0.05)
for x in (0.3, 1.1, 1.6, 2.4, 3.3, 3.8):
    place(drip, segs[7]['arrive'] + x, 0.25)
    place(drip, segs[7]['arrive'] + x + 0.21, 0.08)
place(boom, t_out + OUT_MOVE, 0.35)

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
    vw = pw * (1.06 - 0.2 * e)
    cx = (x0 + x1) / 2 + ((x0 + fx * pw) - (x0 + x1) / 2) * 0.6 * e
    cy = (y0 + y1) / 2 + ((y0 + fy * (y1 - y0)) - (y0 + y1) / 2) * 0.6 * e + (y1 - y0) * 0.12
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


def glow(sub, px, py, rad, col, amt):
    h, w = sub.shape[:2]
    gy, gx = np.ogrid[0:h, 0:w]
    g = np.exp(-(((gx - px) ** 2 + (gy - py) ** 2) / (2 * rad * rad))).astype(np.float32)
    sub += g[..., None] * np.array(col, np.float32) * amt


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
    fx = PANELS[i][2]
    sec = lt * segs[i]['hold']
    if 'flashes' in fx:
        for (px, py), ft in zip(FLASH_PTS, FLASH_T):
            dt = lt - ft
            if 0 <= dt * segs[i]['hold'] < 0.25:
                a = math.exp(-dt * segs[i]['hold'] / 0.06)
                glow(sub, *P(px, py), rw * 0.09, (255, 255, 255), a * 1.0)
                sub *= 1 + 0.12 * a
    if 'rain' in fx:
        sub += rains[int(T * FPS) % 4][sy0:sy1, sx0:sx1] * 90
    if 'lightning' in fx:
        dt = sec - LIGHT_T[0] * segs[i]['hold']
        if dt >= 0:
            a = math.exp(-dt / 0.15) * (0.6 + 0.4 * (int(dt * 30) % 2 == 0))
            sub += a * np.array([140, 150, 190], np.float32)
        glow(sub, *P(0.85, 0.15), rw * 0.12, (120, 130, 150), 0.25 + 0.1 * math.sin(T * 2))
    if 'bulbs' in fx:
        fl = 0.85 + 0.15 * (math.sin(T * 23) * math.sin(T * 7.3) > -0.2)
        for py in (0.05, 0.2, 0.35, 0.5):
            glow(sub, *P(0.07, py), rw * 0.05, (255, 210, 140), 0.35 * fl)
        sub *= 0.93 + 0.07 * fl
    if 'vial' in fx:
        a = 0.55 + 0.45 * math.sin(T * 4.5)
        glow(sub, *P(0.47, 0.54), rw * 0.07, (60, 170, 255), 0.9 * a)
        glow(sub, *P(0.47, 0.54), rw * 0.2, (30, 90, 160), 0.35 * a)
    if 'melt' in fx:
        x0p = int(max(0, rect[0] + 0.3 * rw - sx0))
        hh = sub.shape[0]
        amp = 4 + 10 * lt
        dx = (amp * np.sin(np.arange(hh) / 22 + T * 4)).astype(np.int32)
        cols = np.clip(np.arange(sub.shape[1])[None, :] + dx[:, None], 0, sub.shape[1] - 1)
        warped = sub[np.arange(hh)[:, None], cols]
        sub[:, x0p:] = warped[:, x0p:]
    if 'fog' in fx:
        off = int((T * 50) % W)
        a = fogmap[sy0:sy1, off + sx0:off + sx1, None] * 0.35
        if a.shape[:2] == sub.shape[:2]:
            sub[:] = sub * (1 - a) + 170 * a
    if 'alarm' in fx:
        a = 0.5 + 0.5 * math.sin(T * 2 * math.pi * 1.25)
        sub[..., 0] *= 1 + 0.3 * a
        sub[..., 1:] *= 1 - 0.25 * a
        glow(sub, *P(0.9, 0.68), rw * 0.08, (255, 40, 30), 0.8 * a)
    if 'ripple' in fx:
        y0p = int(max(0, rect[1] + 0.82 * rh - sy0))
        hh = sub.shape[0]
        dx = (3 * np.sin(np.arange(hh) / 9 + T * 3)).astype(np.int32)
        cols = np.clip(np.arange(sub.shape[1])[None, :] + dx[:, None], 0, sub.shape[1] - 1)
        warped = sub[np.arange(hh)[:, None], cols]
        sub[y0p:] = warped[y0p:]
    if 'drips' in fx:
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for j, xn in enumerate((0.35, 0.62, 0.8, 0.9)):
            ph = ((T * 0.9 + j * 0.37) % 1)
            x, y = P(xn, 0.05 + ph * 0.8)
            dr.ellipse([x - 4, y - 7, x + 4, y + 7], fill=(200, 210, 220))
        sub[:] = np.asarray(img, np.float32)
    if 'eye' in fx:
        a = ease((lt - 0.55) / 0.3)
        glow(sub, *P(0.535, 0.5), rw * 0.03, (255, 220, 120), 0.9 * a * (0.8 + 0.2 * math.sin(T * 9)))


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
        draw_words(d, [['HE', 'TRADED', 'HIS'], ['FACE', 'FOR', 'FAME']], H / 2, FBIG, 135)
    for t0, t1, c in caps:
        if t0 <= T < t1:
            draw_words(d, wrap(c, FCAP, d), 1500, FCAP, 100)
    if T > t_out + OUT_MOVE * 0.6:
        draw_words(d, [['PART', '2?'], ['FOLLOW', 'FOR', 'MORE']], H / 2, FOUT, 120)
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
