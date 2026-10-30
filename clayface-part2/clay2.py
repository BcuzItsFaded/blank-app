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
    ((3, 3, 465, 371), (0.75, 0.32), ['mirror']),
    ((477, 3, 938, 371), (0.3, 0.55), ['nanites']),
    ((3, 383, 465, 792), (0.82, 0.55), ['rain', 'fog']),
    ((477, 383, 938, 792), (0.35, 0.35), ['facewarp']),
    ((3, 804, 465, 1188), (0.68, 0.72), ['alarm']),
    ((476, 803, 938, 1188), (0.5, 0.45), ['dissolve', 'pull']),
    ((3, 1200, 464, 1669), (0.47, 0.38), ['ripple', 'handdrips']),
    ((476, 1200, 938, 1669), (0.57, 0.3), ['tear', 'ripple8']),
]
LINES = [
    ("At the end of Clayface, Matt Hagen looks like he's been destroyed. But that's only the beginning of his transformation.",
     "At the end of Clayface, Matt Hagen looks like he's been destroyed. But that's only the beginning of his transformation."),
    ("The treatment that restored his face used microscopic A I machines called nanights. They helped hold his body together. But the changes came with a terrible cost.",
     "The treatment that restored his face used microscopic AI machines called nanites. They helped hold his body together. But the changes came with a terrible cost."),
    ("Consumed by revenge, Matt kills his enemies, including Detective John Borrelli, his romantic rival.",
     "Consumed by revenge, Matt kills his enemies, including Detective John Borrelli, his romantic rival."),
    ("Then Matt turns his attention to Doctor Caitlyn Corr. Faced with the man he's become, she makes a desperate decision.",
     "Then Matt turns his attention to Dr. Caitlyn Corr. Faced with the man he's become, she makes a desperate decision."),
    ("Caitlyn activates an emergency protocol that shuts down the nanights holding Matt's body together.",
     "Caitlyn activates an emergency protocol that shuts down the nanites holding Matt's body together."),
    ("Matt appears to melt away. For a moment, it seems like his story is over.",
     "Matt appears to melt away. For a moment, it seems like his story is over."),
    ("But the final scene takes us beneath Gotham, where Matt is still alive in the sewers.",
     "But the final scene takes us beneath Gotham, where Matt is still alive in the sewers."),
    ("Now he's become Clayface. A tear falls from his human-looking eye. A reminder that, even inside the monster, a piece of Matt remains.",
     "Now he's become Clayface. A tear falls from his human-looking eye. A reminder that, even inside the monster, a piece of Matt remains."),
]
RED = {'DESTROYED', 'NANITES', 'COST', 'REVENGE', 'KILLS', 'DESPERATE', 'EMERGENCY', 'MELT', 'ALIVE', 'CLAYFACE', 'TEAR', 'MONSTER', 'BEGINNING'}

# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
k = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [k.create(t, voice='am_michael', speed=1.1, lang='en-us')[0] for t, _ in LINES]

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
region(0, gurg, 0.18)
region(2, rain, 0.13)
region(4, hum, 0.03)
region(5, gurg, 0.4)
region(6, sosfilt(butter(2, 200, 'low', fs=SR, output='sos'), brown), 0.55)
region(7, sosfilt(butter(2, 200, 'low', fs=SR, output='sos'), brown), 0.4)
region(1, hum, 0.025)

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
# nanite chirps
blip_n = int(0.06 * SR)
r_b = np.random.default_rng(5)
for x in np.arange(0.2, segs[1]['hold'], 0.23):
    fq = r_b.uniform(2500, 5200)
    blip = np.sin(2 * np.pi * fq * tt[:blip_n] * (1 + 0.3 * tt[:blip_n] * 10)) * env(blip_n, 0.002, 0.015)
    place(blip, segs[1]['arrive'] + x, 0.12)
thunder = sosfilt(butter(2, 220, 'low', fs=SR, output='sos'), white[:3 * SR])
thunder = thunder / np.abs(thunder).max() * env(3 * SR, 0.05, 0.9)
LIGHT_T = [0.3]
place(thunder, segs[2]['arrive'] + LIGHT_T[0] * segs[2]['hold'], 0.6)
beat = np.sin(2 * np.pi * 55 * tt[:int(.25 * SR)]) * env(int(.25 * SR), 0.004, 0.06)
for x in np.arange(0.2, segs[3]['hold'], 0.85):
    place(beat, segs[3]['arrive'] + x, 0.55)
    place(beat, segs[3]['arrive'] + x + 0.22, 0.4)
beep = np.sign(np.sin(2 * np.pi * 880 * tt[:int(.18 * SR)])) * env(int(.18 * SR), 0.003, 0.5)
for x in np.arange(0.25, segs[4]['hold'] + MOVE, 0.4):
    place(beep, segs[4]['arrive'] + x, 0.06)
cl_n = int(0.05 * SR)
place(white[:cl_n] * env(cl_n, 0.0005, 0.01), segs[4]['arrive'] + 0.5, 0.5)
pd_n = int(2.0 * SR)
pdown = np.sin(2 * np.pi * np.cumsum(np.linspace(900, 60, pd_n)) / SR) * np.linspace(1, 0, pd_n) ** 1.5
place(pdown, segs[4]['arrive'] + 0.55, 0.12)
growl_n = int(2.5 * SR)
growl = (np.sin(2 * np.pi * np.cumsum(np.linspace(70, 35, growl_n)) / SR + 3 * np.sin(2 * np.pi * 7 * tt[:growl_n])) *
         (0.6 + 0.4 * rng.random(growl_n))) * env(growl_n, 0.3, 1.2)
growl = sosfilt(butter(2, 500, 'low', fs=SR, output='sos'), growl)
growl /= np.abs(growl).max()
place(growl, segs[5]['arrive'] + 0.3, 0.5)
slosh = sosfilt(butter(2, 500, 'low', fs=SR, output='sos'), white[:3 * SR]) * env(3 * SR, 0.4, 1.0)
slosh /= np.abs(slosh).max()
place(slosh, segs[6]['arrive'] + 0.2, 0.4)
drip = np.sin(2 * np.pi * 1300 * tt[:int(.25 * SR)] * (1 + 0.4 * np.exp(-tt[:int(.25 * SR)] * 30))) * env(int(.25 * SR), 0.001, 0.05)
for i_ in (6, 7):
    for x in (0.4, 1.2, 1.9, 2.7, 3.6, 4.4):
        place(drip, segs[i_]['arrive'] + x, 0.22)
        place(drip, segs[i_]['arrive'] + x + 0.21, 0.07)
pad_n = int((segs[7]['hold'] + OUT_HOLD + OUT_MOVE + END_HOLD) * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (220, 261.6, 329.6, 110)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[7]['arrive'], 0.08)
TEAR_T = 0.42
place(drip, segs[7]['arrive'] + TEAR_T * segs[7]['hold'] + 0.9, 0.35)
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
    if 'mirror' in fx:
        warp(sub, R(0.57, 0.0, 0.97, 0.97), 2 + 7 * ease(lt), 16, 3.5, T)
    if 'nanites' in fx:
        for j, (px, py) in enumerate(NANO):
            a = 0.5 + 0.5 * math.sin(T * 5 - j * 1.1)
            glow(sub, *P(px, py), rw * 0.035, (255, 200, 90), 0.9 * a)
            glow(sub, *P(px, py), rw * 0.1, (160, 110, 30), 0.3 * a)
        sub *= 0.95 + 0.05 * math.sin(T * 9)
    if 'rain' in fx:
        sub += rains[int(T * FPS) % 4][sy0:sy1, sx0:sx1] * 90
        dt = sec - LIGHT_T[0] * segs[i]['hold']
        if dt >= 0:
            a = math.exp(-dt / 0.15) * (0.6 + 0.4 * (int(dt * 30) % 2 == 0))
            sub += a * np.array([110, 120, 160], np.float32)
    if 'fog' in fx:
        off = int((T * 50) % W)
        a = fogmap[sy0:sy1, off + sx0:off + sx1, None] * 0.3
        if a.shape[:2] == sub.shape[:2]:
            sub[:] = sub * (1 - a) + 150 * a
    if 'facewarp' in fx:
        warp(sub, R(0.6, 0.0, 1.0, 1.0), 1 + 4 * ease(lt), 11, 2.5, T)
    if 'alarm' in fx:
        a = 0.5 + 0.5 * math.sin(T * 2 * math.pi * 1.25)
        sub[..., 0] *= 1 + 0.25 * a
        sub[..., 1:] *= 1 - 0.2 * a
        glow(sub, *P(0.68, 0.75), rw * 0.09, (255, 40, 30), 0.9 * a)
        glow(sub, *P(0.78, 0.45), rw * 0.15, (200, 20, 20), 0.35 * a)
    if 'dissolve' in fx:
        e = ease(lt)
        warp(sub, R(0.0, 0.0, 1.0, 1.0), 2 + 10 * e, 13, 3, T)
        sub *= 1 - 0.55 * e
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for px, py, sz, ph in PARTS:
            prog = (ph + lt * 0.9) % 1
            if prog < e + 0.1:
                x, y = P(px + prog * 0.35, py - prog * 0.3)
                rr_ = sz * (1 - prog) * 2.2
                dr.ellipse([x - rr_, y - rr_, x + rr_, y + rr_], fill=(28, 20, 16))
        sub[:] = np.asarray(img, np.float32)
    if 'ripple' in fx:
        warp(sub, R(0.0, 0.66, 1.0, 1.0), 3, 8, 3, T)
    if 'handdrips' in fx:
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for j, (xn, yn) in enumerate(((0.36, 0.52), (0.55, 0.45), (0.66, 0.5), (0.45, 0.6))):
            ph = (T * 0.8 + j * 0.31) % 1
            x, y = P(xn, yn + ph * 0.2)
            dr.ellipse([x - 3, y - 6, x + 3, y + 6], fill=(220, 225, 235))
        sub[:] = np.asarray(img, np.float32)
    if 'ripple8' in fx:
        warp(sub, R(0.0, 0.8, 1.0, 1.0), 3, 8, 3, T)
    if 'tear' in fx:
        glow(sub, *P(0.57, 0.27), rw * 0.025, (200, 220, 255), 0.5 * (0.7 + 0.3 * math.sin(T * 3)))
        tp = (lt - TEAR_T) / 0.35
        if tp > 0:
            img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
            dr = ImageDraw.Draw(img)
            p0 = P(0.575, 0.3)
            p1 = P(0.585, 0.3 + 0.2 * ease(min(1, tp)))
            dr.line([p0, p1], fill=(200, 215, 235), width=3)
            dr.ellipse([p1[0] - 5, p1[1] - 4, p1[0] + 5, p1[1] + 9], fill=(235, 242, 255))
            sub[:] = np.asarray(img, np.float32)
            glow(sub, *p1, rw * 0.02, (180, 200, 255), 0.45)


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
        draw_words(d, [['CLAYFACE:'], ['THE', 'ENDING'], ['EXPLAINED']], H / 2 - 40, FBIG, 135)
        draw_words(d, [['MAJOR', 'SPOILERS', 'AHEAD']], H / 2 + 220, FSP, 90)
    for t0, t1, c in caps:
        if t0 <= T < t1:
            draw_words(d, wrap(c, FCAP, d), 1500, FCAP, 100)
    if T > t_out + OUT_MOVE * 0.6:
        draw_words(d, [['WAS', 'MATT'], ['THE', 'MONSTER?'], ['COMMENT', 'BELOW']], H / 2, FOUT, 120)
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
