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
    ((6, 5, 252, 758), (0.52, 0.45), ['candles1']),
    ((267, 5, 507, 758), (0.25, 0.42), []),
    ((521, 5, 762, 758), (0.45, 0.55), ['flashend']),
    ((776, 5, 1018, 758), (0.55, 0.72), ['pour', 'ground']),
    ((6, 775, 252, 1528), (0.6, 0.25), ['violet', 'flashend']),
    ((266, 775, 508, 1527), (0.55, 0.15), ['shakeend', 'blackend']),
    ((522, 775, 759, 1528), (0.35, 0.5), ['doorway']),
    ((773, 774, 1018, 1527), (0.6, 0.42), ['candles8']),
]
KEYS = {
    0: [(0.0, 0.25, 0.25, 0.85), (1.0, 0.52, 0.45, 0.62)],
    1: [(0.0, 0.45, 0.38, 1.0), (0.17, 0.45, 0.38, 1.0), (0.23, 0.38, 0.4, 0.86), (0.4, 0.38, 0.4, 0.86),
        (0.46, 0.31, 0.42, 0.72), (0.63, 0.31, 0.42, 0.72), (0.69, 0.24, 0.43, 0.6), (1.0, 0.24, 0.43, 0.6)],
    2: [(0.0, 0.5, 0.5, 1.0), (0.85, 0.45, 0.56, 0.62), (1.0, 0.45, 0.56, 0.55)],
    3: [(0.0, 0.5, 0.45, 0.9), (0.45, 0.58, 0.52, 0.75), (0.75, 0.5, 0.75, 0.72), (1.0, 0.5, 0.75, 0.7)],
    4: [(0.0, 0.6, 0.45, 0.85), (0.6, 0.62, 0.22, 0.7), (0.72, 0.62, 0.22, 0.7), (0.82, 0.35, 0.62, 0.6), (1.0, 0.35, 0.62, 0.58)],
    5: [(0.0, 0.5, 0.58, 0.9), (0.6, 0.5, 0.48, 0.8), (0.9, 0.55, 0.14, 0.5), (1.0, 0.55, 0.14, 0.5)],
    6: [(0.0, 0.5, 0.45, 0.95), (1.0, 0.38, 0.45, 0.75)],
    7: [(0.0, 0.6, 0.4, 0.36), (0.25, 0.6, 0.4, 0.36), (0.4, 0.6, 0.47, 0.4), (0.55, 0.6, 0.47, 0.4), (0.75, 0.5, 0.4, 1.0), (1.0, 0.5, 0.4, 1.0)],
}
TAPS = [0.05, 0.2, 0.43, 0.66]
LINES = [
    ("Imagine sitting down to Father's Day dinner with a family that killed Dad. At the Grantham house, they even tell the story over drinks.",
     "Imagine sitting down to Father's Day dinner with a family that killed Dad. At the Grantham house, they even tell the story over drinks."),
    ("Seven years earlier, Nathan Grantham had the man his daughter Beh-deel-ya loved killed. She still had to look after her father. Then one Father's Day, he started demanding his cake.",
     "Seven years earlier, Nathan Grantham had the man his daughter Bedelia loved killed. She still had to look after her father. Then one Father's Day, he started demanding his cake."),
    ('Beh-deel-ya picked up a marble ashtray and struck him dead. The family passed it off as an accident. They got the inheritance. She kept coming back to his grave.',
     'Bedelia picked up a marble ashtray and struck him dead. The family passed it off as an accident. They got the inheritance. She kept coming back to his grave.'),
    ('This year, Beh-deel-ya brings a bottle. She kneels down and tells Nathan exactly what she thinks of him. For the first time in seven years, he answers.',
     'This year, Bedelia brings a bottle. She kneels down and tells Nathan exactly what she thinks of him. For the first time in seven years, he answers.'),
    ("Nathan claws his way out and strangles her. He's been dead long enough for moss to grow on him, and he still wants that cake.",
     "Nathan claws his way out and strangles her. He's been dead long enough for moss to grow on him, and he still wants that cake."),
    ("Hank, the new husband in the family, goes looking for her. He falls into the open grave beside her body. Then Nathan's headstone tips forward and crushes him.",
     "Hank, the new husband in the family, goes looking for her. He falls into the open grave beside her body. Then Nathan's headstone tips forward and crushes him."),
    ("Inside, Aunt Sylvia finds the housekeeper dead in the kitchen. Nathan is already behind her. By the time the others come looking, he's finished preparing dessert.",
     "Inside, Aunt Sylvia finds the housekeeper dead in the kitchen. Nathan is already behind her. By the time the others come looking, he's finished preparing dessert."),
    ("Nathan serves Sylvia's head on a platter, decorated with icing and lit candles. That's the last joke. Beh-deel-ya killed him to stop him ordering her around. Seven years later, the family has finally served him his cake.",
     "Nathan serves Sylvia's head on a platter, decorated with icing and lit candles. That's the last joke. Bedelia killed him to stop him ordering her around. Seven years later, the family has finally served him his cake."),
]
RED = {'GRANTHAM', 'NATHAN', 'NATHANS', 'BEDELIA', 'KILLED', 'CAKE', 'MARBLE', 'DEAD', 'GRAVE', 'STRANGLES', 'CRUSHES',
       'HEAD', 'DESSERT', 'SEVEN', 'ANSWERS', 'SYLVIAS'}

# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
k = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [k.create(t, voice='am_michael', speed=1.18, lang='en-us')[0] for t, _ in LINES]

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
for i_ in (3, 4, 5):
    region(i_, wind, 0.3)
crack = white * (rng.random(N) > 0.9994)
crackle = sosfilt(butter(2, 3000, 'low', fs=SR, output='sos'), crack)
region(0, crackle, 1.0)
region(7, crackle, 1.0)
tick = np.sin(2 * np.pi * 2500 * tt[:int(.02 * SR)]) * env(int(.02 * SR), 0.0005, 0.004)
for x in np.arange(0.2, segs[0]['hold'], 0.8):
    place(tick, segs[0]['arrive'] + x, 0.25)
n = int(2.5 * SR)
boom = np.sin(2 * np.pi * 40 * tt[:n] * (1 - 0.12 * tt[:n])) * env(n, 0.005, 0.7) + 0.4 * white[:n] * env(n, 0.001, 0.04)
place(boom, INTRO_HOLD + INTRO_MOVE - 0.05, 0.45)
sw_n = int(0.5 * SR)
swoosh = sosfilt(butter(2, [400, 5000], 'band', fs=SR, output='sos'), white[:sw_n]) * np.sin(np.linspace(0, np.pi, sw_n)) ** 2
swoosh /= np.abs(swoosh).max()
place(swoosh, INTRO_HOLD, 0.22)
for s_ in segs[1:]:
    place(swoosh, s_['arrive'] - MOVE, 0.15)
place(swoosh, t_out, 0.22)
tap_n = int(0.25 * SR)
tap = (np.sin(2 * np.pi * 180 * tt[:tap_n]) * env(tap_n, 0.001, 0.04) + 0.6 * white[:tap_n] * env(tap_n, 0.0005, 0.006))
for x in TAPS:
    place(tap, segs[1]['arrive'] + x * segs[1]['hold'], 0.6)
place(swoosh, segs[2]['arrive'] + segs[2]['hold'] * 0.86, 0.6)
place(boom, segs[2]['arrive'] + segs[2]['hold'] * 0.94, 0.6)
pour_n = int(1.6 * SR)
pour = sosfilt(butter(2, [300, 1500], 'band', fs=SR, output='sos'), white[:pour_n]) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt[:pour_n])) * np.sin(np.linspace(0, np.pi, pour_n))
pour /= np.abs(pour).max()
place(pour, segs[3]['arrive'] + segs[3]['hold'] * 0.25, 0.2)
rum_n = int(3 * SR)
rum = sosfilt(butter(2, 120, 'low', fs=SR, output='sos'), brown[:rum_n]) * np.linspace(0, 1, rum_n) ** 2
rum /= np.abs(rum).max()
place(rum, segs[3]['arrive'] + segs[3]['hold'] * 0.62, 0.7)
growl_n = int(2.5 * SR)
growl = (np.sin(2 * np.pi * np.cumsum(np.linspace(60, 40, growl_n)) / SR + 3 * np.sin(2 * np.pi * 6 * tt[:growl_n])) *
         (0.6 + 0.4 * rng.random(growl_n))) * env(growl_n, 0.3, 1.2)
growl = sosfilt(butter(2, 450, 'low', fs=SR, output='sos'), growl)
growl /= np.abs(growl).max()
dirt = sosfilt(butter(2, 800, 'low', fs=SR, output='sos'), white[:SR]) * env(SR, 0.01, 0.25)
dirt /= np.abs(dirt).max()
place(dirt, segs[4]['arrive'], 0.5)
place(growl, segs[4]['arrive'] + 0.2, 0.55)
place(boom, segs[4]['arrive'] + segs[4]['hold'] * 0.73, 0.4)
grind_n = int(segs[5]['hold'] * 0.35 * SR)
grind = sosfilt(butter(2, [80, 600], 'band', fs=SR, output='sos'), white[:grind_n]) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * tt[:grind_n])) * np.linspace(0.2, 1, grind_n)
grind /= np.abs(grind).max()
place(grind, segs[5]['arrive'] + segs[5]['hold'] * 0.55, 0.35)
place(boom, segs[5]['arrive'] + segs[5]['hold'] * 0.9, 0.8)
place(dirt, segs[5]['arrive'] + segs[5]['hold'] * 0.9, 0.5)
cr_n = int(1.4 * SR)
creak = np.sin(2 * np.pi * np.cumsum(np.linspace(300, 180, cr_n) * (1 + 0.1 * np.sign(np.sin(2 * np.pi * 30 * tt[:cr_n])))) / SR) * np.sin(np.linspace(0, np.pi, cr_n)) ** 2
place(creak, segs[6]['arrive'] + segs[6]['hold'] * 0.2, 0.08)
hit_n = int(2.5 * SR)
sting = (np.sin(2 * np.pi * 70 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 466 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 494 * tt[:hit_n]) + 0.4 * np.sin(2 * np.pi * 740 * tt[:hit_n])) * env(hit_n, 0.002, 0.8)
place(sting, segs[6]['arrive'] + segs[6]['hold'] * 0.4, 0.22)
mb_n = int(0.7 * SR)
song = [(392, 0.35), (392, 0.15), (440, 0.5), (392, 0.5), (523, 0.5), (494, 1.0)]
t_mb = segs[7]['arrive'] + segs[7]['hold'] * 0.5
for f_, dur in song:
    note = (np.sin(2 * np.pi * f_ * 0.985 * tt[:mb_n]) + 0.3 * np.sin(2 * np.pi * f_ * 2.01 * tt[:mb_n])) * env(mb_n, 0.002, 0.3)
    place(note, t_mb, 0.09)
    t_mb += dur * 0.55
place(sting, segs[7]['arrive'] + segs[7]['hold'] * 0.75, 0.25)
pad_n = int((segs[7]['hold'] + OUT_HOLD + OUT_MOVE + END_HOLD) * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (196, 233.1, 293.7, 98)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[7]['arrive'], 0.06)
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
    return x0 + nx * pw, y0 + ny * ph, vw0 * z


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


FLAMES1 = [(0.2, 0.18), (0.26, 0.18), (0.31, 0.18), (0.38, 0.19), (0.18, 0.45), (0.27, 0.45), (0.9, 0.48)]
FLAMES8 = [(0.48, 0.27), (0.55, 0.26), (0.61, 0.27), (0.68, 0.28), (0.74, 0.29), (0.95, 0.22)]


def flames(sub, P, rw, pts, T):
    for j, (px, py) in enumerate(pts):
        fl = 0.7 + 0.3 * math.sin(T * 13 + j * 2.1) * math.sin(T * 5.3 + j)
        glow(sub, *P(px, py), rw * 0.035, (255, 200, 110), 0.55 * fl)
        glow(sub, *P(px, py), rw * 0.12, (120, 70, 20), 0.25 * fl)


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
    if 'candles1' in fx:
        flames(sub, P, rw, FLAMES1, T)
    if 'candles8' in fx:
        flames(sub, P, rw, FLAMES8, T)
    if 'pour' in fx and 0.2 < lt < 0.55:
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for j in range(5):
            ph = (T * 1.6 + j * 0.2) % 1
            x, y = P(0.63, 0.56 + ph * 0.14)
            dr.ellipse([x - 3, y - 5, x + 3, y + 5], fill=(190, 120, 40))
        sub[:] = np.asarray(img, np.float32)
    if 'ground' in fx:
        e = ease((lt - 0.6) / 0.35)
        if e > 0:
            warp(sub, R(0, 0.6, 1, 1), 1 + 7 * e, 6, 7, T)
    if 'violet' in fx:
        glow(sub, *P(0.6, 0.08), rw * 0.35, (110, 60, 170), 0.3 + 0.12 * math.sin(T * 2))
    if 'doorway' in fx:
        e = ease((lt - 0.12) / 0.45)
        gy, gx = np.ogrid[0:hh, 0:ww]
        cxs, cys = P(0.66, 0.25)
        g = np.exp(-(((gx - cxs) / (rw * 0.28)) ** 2 + ((gy - cys) / (rh * 0.22)) ** 2)).astype(np.float32)[..., None]
        sub *= 1 - 0.85 * (1 - e) * g
    if 'shakeend' in fx and lt > 0.6:
        warp(sub, R(0, 0, 1, 1), 3 * ease((lt - 0.6) / 0.3), 40, 30, T)
    if 'flashend' in fx and lt > 0.9:
        sub += 230 * math.exp(-(lt - 0.9) * segs[i]['hold'] / 0.12)
    if 'blackend' in fx and lt > 0.88:
        sub *= 1 - ease((lt - 0.88) / 0.08)


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
        draw_words(d, [['HE', 'CAME', 'BACK'], ['FOR', 'HIS'], ['CAKE']], H / 2 - 80, FBIG, 135)
        draw_words(d, [['FATHER\'S', 'DAY']], H / 2 + 200, FSP, 90)
    for t0, t1, c in caps:
        if t0 <= T < t1:
            draw_words(d, wrap(c, FCAP, d), 1500, FCAP, 100)
    if T > t_out + OUT_MOVE * 0.6:
        draw_words(d, [['HAPPY'], ['FATHER\'S', 'DAY'], ['COMMENT', 'BELOW']], H / 2, FOUT, 120)
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
