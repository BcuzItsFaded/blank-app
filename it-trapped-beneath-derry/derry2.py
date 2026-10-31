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
    ((3, 3, 208, 547), (0.6, 0.6), ['firelight', 'pull']),
    ((223, 3, 463, 547), (0.35, 0.35), ['moon2', 'mist']),
    ((478, 3, 719, 547), (0.5, 0.5), ['eyes3', 'fog', 'tiltup']),
    ((734, 3, 938, 547), (0.4, 0.4), ['blade4', 'retreat']),
    ((3, 561, 207, 1067), (0.68, 0.42), ['stone5']),
    ((223, 561, 463, 1067), (0.3, 0.2), ['rack', 'hold']),
    ((478, 561, 719, 1067), (0.4, 0.5), ['eyes7', 'tiltup']),
    ((734, 561, 938, 1067), (0.6, 0.3), ['ghost']),
    ((3, 1082, 208, 1669), (0.5, 0.5), ['tiltup', 'hold70']),
    ((224, 1082, 462, 1669), (0.72, 0.35), ['stars', 'cosmic', 'pull']),
    ((477, 1082, 719, 1669), (0.6, 0.5), ['shards', 'tiltdown']),
    ((734, 1082, 938, 1669), (0.5, 0.55), ['ring', 'pull']),
]
LINES = [
    ('Long before anyone called this place Derry, a girl named Neh-kah-nee had a reason to be more afraid of staying home than going into the woods. Her people were running out of food.',
     'Long before anyone called this place Derry, a girl named Necani had a reason to be more afraid of staying home than going into the woods. Her people were running out of food.'),
    ('Neh-kah-nee thinks the Western Wood could feed them. The elders have forbidden anyone to go there, so she slips out after dark. Two friends go with her.',
     'Necani thinks the Western Wood could feed them. The elders have forbidden anyone to go there, so she slips out after dark. Two friends go with her.'),
    ("Once they're inside, something starts hunting them. It changes shape, and the longer it keeps them terrified, the better. That's how this thing feeds.",
     "Once they're inside, something starts hunting them. It changes shape, and the longer it keeps them terrified, the better. That's how this thing feeds."),
    ("Then a stranger steps between them and the creature. All he has is a stone dagger. Whatever's out there takes one look at that blade and backs away.",
     "Then a stranger steps between them and the creature. All he has is a stone dagger. Whatever's out there takes one look at that blade and backs away."),
    ('Over dinner, the warrior explains where the dagger came from. Matt-urin, a cosmic turtle, once imprisoned the creature. That prison crashed to Earth and broke apart. Matt-urin showed him where to find a piece.',
     'Over dinner, the warrior explains where the dagger came from. Maturin, a cosmic turtle, once imprisoned the creature. That prison crashed to Earth and broke apart. Maturin showed him where to find a piece.'),
    ("Then one of the friends realizes what they've been eating. The meat is human. The man who just saved their lives worships the creature. He's been giving it people.",
     "Then one of the friends realizes what they've been eating. The meat is human. The man who just saved their lives worships the creature. He's been giving it people."),
    ("The three get out of camp with his dagger. That leaves the warrior alone with the thing he's been feeding. Without the blade to keep it back, it kills him.",
     "The three get out of camp with his dagger. That leaves the warrior alone with the thing he's been feeding. Without the blade to keep it back, it kills him."),
    ("Meanwhile, Neh-kah-nee's mother, Sess-kwee, is leading a search for the missing children. In the woods she sees her husband, who died years ago. He looks older now, as if he'd lived the years they lost.",
     "Meanwhile, Necani's mother, Sesqui, is leading a search for the missing children. In the woods she sees her husband, who died years ago. He looks older now, as if he'd lived the years they lost."),
    ("It's the creature. It changes into a baby and stabs her. When Neh-kah-nee arrives, the dagger makes it retreat. For a second, that feels like a rescue. Then Sess-kwee dies in her daughter's arms.",
     "It's the creature. It changes into a baby and stabs her. When Necani arrives, the dagger makes it retreat. For a second, that feels like a rescue. Then Sesqui dies in her daughter's arms."),
    ("After Sess-kwee's death, the council decides to leave. Neh-kah-nee remembers the warrior's story and calls out to Matt-urin herself. The Turtle answers. There are more pieces of the prison in the cave where it fell.",
     "After Sesqui's death, the council decides to leave. Necani remembers the warrior's story and calls out to Maturin herself. The Turtle answers. There are more pieces of the prison in the cave where it fell."),
    ('The dagger can drive the creature away from one person. Matt-urin shows Neh-kah-nee how to protect a whole stretch of land. The fragments go inside turtle shells, buried at thirteen points around the woods.',
     'The dagger can drive the creature away from one person. Maturin shows Necani how to protect a whole stretch of land. The fragments go inside turtle shells, buried at thirteen points around the woods.'),
    ("Those thirteen points close a boundary around It. The creature is still alive inside the land that becomes Derry. Centuries later, when the kids use the dagger to close a gap, they're finishing a repair Neh-kah-nee made possible.",
     "Those thirteen points close a boundary around IT. The creature is still alive inside the land that becomes Derry. Centuries later, when the kids use the dagger to close a gap, they're finishing a repair Necani made possible."),
]
RED = {'NECANI', 'NECANIS', 'SESQUI', 'SESQUIS', 'MATURIN', 'FOOD', 'FORBIDDEN', 'HUNTING', 'FEEDS', 'TERRIFIED', 'DAGGER',
       'HUMAN', 'WORSHIPS', 'PEOPLE', 'KILLS', 'BABY', 'DIES', 'TURTLE', 'THIRTEEN', 'BOUNDARY', 'DERRY', 'PRISON'}

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
bed += 0.1 * wind
crick = np.sin(2 * np.pi * 4100 * tt) * (np.sin(2 * np.pi * 28 * tt) > 0.2) * (np.sin(2 * np.pi * 0.9 * tt) > 0.4)
for i_ in (1, 7):
    region(i_, crick, 0.012)
crack = white * (rng.random(N) > 0.9992)
crackle = sosfilt(butter(2, 3000, 'low', fs=SR, output='sos'), crack)
murmur = sosfilt(butter(2, [200, 700], 'band', fs=SR, output='sos'), white) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tt))
murmur /= np.abs(murmur).max()
for i_ in (0, 4, 5):
    region(i_, crackle, 1.5)
region(0, murmur, 0.1)
for i_ in (2, 3, 6):
    region(i_, sosfilt(butter(2, 150, 'low', fs=SR, output='sos'), brown), 0.7)

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
growl_n = int(3.0 * SR)
growl = (np.sin(2 * np.pi * np.cumsum(np.linspace(55, 38, growl_n)) / SR + 3 * np.sin(2 * np.pi * 6 * tt[:growl_n])) *
         (0.6 + 0.4 * rng.random(growl_n))) * env(growl_n, 0.6, 1.4)
growl = sosfilt(butter(2, 450, 'low', fs=SR, output='sos'), growl)
growl /= np.abs(growl).max()
place(growl, segs[2]['arrive'] + 1.0, 0.5)
place(growl[::-1] * np.linspace(1, 0, len(growl)), segs[3]['arrive'] + 2.5, 0.4)
place(growl, segs[6]['arrive'] + segs[6]['hold'] * 0.65, 0.65)
place(growl, segs[8]['arrive'] + 0.2, 0.4)
wh_n = int(2.5 * SR)
whisper = sosfilt(butter(2, [2000, 6000], 'band', fs=SR, output='sos'), white[:wh_n]) * (np.abs(np.sin(2 * np.pi * 3 * tt[:wh_n])) ** 2) * np.sin(np.linspace(0, np.pi, wh_n))
whisper /= np.abs(whisper).max()
place(whisper, segs[2]['arrive'] + 2.5, 0.07)
place(whisper, segs[7]['arrive'] + 3.0, 0.06)
ting_n = SR
ting = np.sin(2 * np.pi * 2650 * tt[:ting_n]) * env(ting_n, 0.001, 0.4) + 0.5 * np.sin(2 * np.pi * 3980 * tt[:ting_n]) * env(ting_n, 0.001, 0.25)
place(ting, segs[3]['arrive'] + 0.5, 0.18)
for x in (0.6, 1.3, 2.0):
    place(ting, segs[4]['arrive'] + x + 2.0, 0.08)
beat = np.sin(2 * np.pi * 55 * tt[:int(.25 * SR)]) * env(int(.25 * SR), 0.004, 0.06)
for x in np.arange(0.3, segs[5]['hold'] * 0.75, 0.8):
    place(beat, segs[5]['arrive'] + x, 0.55)
    place(beat, segs[5]['arrive'] + x + 0.22, 0.4)
step = np.sin(2 * np.pi * 50 * tt[:int(.3 * SR)]) * env(int(.3 * SR), 0.002, 0.06)
for x in np.arange(0.2, segs[6]['hold'] * 0.5, 0.32):
    place(step, segs[6]['arrive'] + x, 0.4)
gh_n = int((segs[7]['hold'] + 0.5) * SR)
ghost = sum(np.sin(2 * np.pi * f_ * tt[:gh_n] * (1 + 0.003 * np.sin(2 * np.pi * 0.5 * tt[:gh_n] + f_))) for f_ in (660, 698, 990)) / 3
ghost *= np.sin(np.linspace(0, np.pi, gh_n)) ** 2
place(ghost, segs[7]['arrive'], 0.05)
hit_n = int(2 * SR)
hit = (np.sin(2 * np.pi * 70 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 466 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 494 * tt[:hit_n])) * env(hit_n, 0.002, 0.6)
place(hit, segs[8]['arrive'] + 0.15, 0.3)
sad_n = int((segs[8]['hold']) * SR)
sad = sum(np.sin(2 * np.pi * f_ * tt[:sad_n]) for f_ in (220, 261.6, 329.6)) / 3
sad *= np.minimum(1, tt[:sad_n] / 2.0) * np.minimum(1, (sad_n / SR - tt[:sad_n]) / 1.0)
place(sad, segs[8]['arrive'] + 2.0, 0.07)
sh_n = int((segs[9]['hold'] + 0.5) * SR)
shimmer = sum(np.sin(2 * np.pi * f_ * tt[:sh_n] * (1 + 0.002 * np.sin(2 * np.pi * 4 * tt[:sh_n]))) for f_ in (392, 587, 784, 1175)) / 4
shimmer *= np.sin(np.linspace(0, np.pi, sh_n)) ** 2
place(shimmer, segs[9]['arrive'], 0.08)
dig = sosfilt(butter(2, 300, 'low', fs=SR, output='sos'), white[:int(.25 * SR)]) * env(int(.25 * SR), 0.003, 0.05)
dig /= np.abs(dig).max()
for x in np.arange(0.4, segs[10]['hold'], 0.9):
    place(dig, segs[10]['arrive'] + x, 0.45)
    place(ting, segs[10]['arrive'] + x + 0.2, 0.04)
pad_n = int((segs[11]['hold'] + OUT_HOLD + OUT_MOVE + END_HOLD) * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (196, 233.1, 293.7, 98)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[11]['arrive'], 0.07)
thump = np.sin(2 * np.pi * 60 * tt[:int(.4 * SR)]) * env(int(.4 * SR), 0.003, 0.1)
for k_ in range(13):
    place(thump, segs[11]['arrive'] + segs[11]['hold'] * (0.4 + 0.5 * k_ / 12), 0.25)
place(boom, segs[11]['arrive'] + segs[11]['hold'] * 0.93, 0.5)
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
    (x0, y0, x1, y1), (fx, fy), fxs = PANELS[i]
    pw, ph = x1 - x0, y1 - y0
    vw0 = max(pw * 1.06, ph * 1.04 * W / H)
    cx0, cy0 = (x0 + x1) / 2, (y0 + y1) / 2
    fxp, fyp = x0 + fx * pw, y0 + fy * ph
    if 'tiltup' in fxs or 'tiltdown' in fxs:
        e = ease(min(1, lt / 0.7)) if 'hold70' in fxs else ease(lt)
        vw = vw0 * 0.72
        vh = vw * H / W
        ya, yb = y1 - vh / 2, y0 + vh / 2
        if 'tiltdown' in fxs:
            ya, yb = yb, ya
        return cx0, ya + (yb - ya) * e, vw
    e = ease(min(1, lt / 0.45)) if 'hold' in fxs else ease(lt)
    if 'pull' in fxs:
        vw, pe = vw0 * (0.55 + 0.45 * e), 1 - e
    else:
        vw, pe = vw0 * (1 - 0.2 * e), e
    return cx0 + (fxp - cx0) * 0.7 * pe, cy0 + (fyp - cy0) * 0.7 * pe, vw


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
STARS = [(r_q.uniform(0, 1), r_q.uniform(0, 1), r_q.uniform(0, 6.28), r_q.uniform(1.5, 4)) for _ in range(40)]
EMBERS = [(r_q.uniform(0.3, 0.8), r_q.uniform(0, 1), r_q.uniform(0.6, 1.4)) for _ in range(25)]
MARKERS = [(0.04, 0.48), (0.1, 0.6), (0.18, 0.41), (0.28, 0.4), (0.34, 0.64), (0.39, 0.38), (0.52, 0.37), (0.66, 0.64),
           (0.71, 0.38), (0.75, 0.62), (0.9, 0.43), (0.92, 0.59), (0.96, 0.49)]
MK_ORDER = [6, 8, 10, 12, 11, 9, 7, 4, 1, 0, 2, 3, 5]


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
    if 'firelight' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.7 + 1)
        glow(sub, *P(0.6, 0.72), rw * 0.3, (255, 140, 50), 0.4 * fl)
        sub *= 0.9 + 0.12 * fl
    if 'moon2' in fx:
        glow(sub, *P(0.68, 0.11), rw * 0.12, (160, 175, 210), 0.3 + 0.08 * math.sin(T * 2))
    if 'fog' in fx or 'mist' in fx:
        off = int((T * 45) % W)
        a = fogmap[sy0:sy1, off + sx0:off + sx1, None] * (0.18 if 'mist' in fx else 0.35)
        if a.shape[:2] == sub.shape[:2]:
            sub[:] = sub * (1 - a) + 140 * a
    if 'eyes3' in fx:
        warp(sub, R(0.05, 0.0, 0.95, 0.55), 2 + 2 * math.sin(T * 1.2), 20, 1.4, T)
        a = 0.6 + 0.4 * math.sin(T * 2.5)
        for ex in (0.43, 0.6):
            glow(sub, *P(ex, 0.22), rw * 0.025, (200, 230, 255), 0.9 * a)
    if 'blade4' in fx:
        glow(sub, *P(0.32, 0.41), rw * 0.05, (230, 240, 255), 0.7 + 0.3 * math.sin(T * 6))
    if 'retreat' in fx:
        e = ease(lt)
        glow(sub, *P(0.68, 0.22), rw * 0.03, (200, 230, 255), 0.9 * (1 - e))
        gy, gx = np.ogrid[0:hh, 0:ww]
        cxs, cys = P(0.75, 0.2)
        g = np.exp(-(((gx - cxs) / (rw * 0.45)) ** 2 + ((gy - cys) / (rh * 0.3)) ** 2)).astype(np.float32)[..., None]
        sub[:] = sub * (1 - 0.6 * e * g) + 105 * 0.6 * e * g
    if 'stone5' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.7 + 1)
        glow(sub, *P(0.55, 0.66), rw * 0.25, (255, 140, 50), 0.35 * fl)
        glow(sub, *P(0.68, 0.4), rw * 0.12, (120, 160, 255), 0.45 + 0.35 * math.sin(T * 3))
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for ex, ph, sp in EMBERS:
            prog = (ph + T * 0.35 * sp) % 1
            x, y = P(ex + 0.05 * math.sin(T * 2 + ph * 9), 0.7 - prog * 0.5)
            r_ = 2.5 * (1 - prog) + 1
            dr.ellipse([x - r_, y - r_, x + r_, y + r_], fill=(255, int(170 * (1 - prog)) + 60, 40))
        sub[:] = np.asarray(img, np.float32)
    if 'rack' in fx:
        er = ease(min(1, lt / 0.4))
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        bl = np.asarray(img.filter(ImageFilter.GaussianBlur(7)), np.float32)
        yy_ = np.linspace(0, 1, hh, dtype=np.float32)[:, None, None]
        top = (yy_ < (rect[1] + 0.55 * rh - sy0) / hh).astype(np.float32)
        wb = top * (1 - er) + (1 - top) * er
        sub[:] = sub * (1 - wb) + bl * wb
    if 'eyes7' in fx:
        a = 0.6 + 0.4 * math.sin(T * 2.5)
        for ex, ey in ((0.46, 0.11), (0.61, 0.14)):
            glow(sub, *P(ex, ey), rw * 0.025, (200, 230, 255), 0.9 * a)
        e = ease((lt - 0.6) / 0.4)
        sub *= 1 - 0.45 * e
        glow(sub, *P(0.34, 0.5), rw * 0.03, (230, 240, 255), 0.6 * (1 - e))
    if 'ghost' in fx:
        warp(sub, R(0.4, 0.0, 1.0, 0.8), 2, 9, 2.5, T)
        glow(sub, *P(0.7, 0.25), rw * 0.3, (90, 130, 200), 0.25 + 0.15 * math.sin(T * 2.2))
    if 'stars' in fx:
        img = Image.fromarray(np.clip(sub, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for sxn, syn, ph, sz in STARS:
            a = 0.5 + 0.5 * math.sin(T * 3 + ph)
            if a > 0.55:
                x, y = P(sxn, syn * 0.7)
                r_ = sz * a
                dr.line([(x - r_ * 2, y), (x + r_ * 2, y)], fill=(220, 230, 255), width=1)
                dr.line([(x, y - r_ * 2), (x, y + r_ * 2)], fill=(220, 230, 255), width=1)
                dr.ellipse([x - r_ * 0.6, y - r_ * 0.6, x + r_ * 0.6, y + r_ * 0.6], fill=(240, 245, 255))
        sub[:] = np.asarray(img, np.float32)
    if 'cosmic' in fx:
        glow(sub, *P(0.55, 0.4), rw * 0.4, (90, 80, 30), 0.3 + 0.2 * math.sin(T * 1.8))
    if 'shards' in fx:
        for j, (px, py) in enumerate(((0.49, 0.52), (0.63, 0.78), (0.81, 0.32))):
            glow(sub, *P(px, py), rw * 0.07, (140, 170, 255), 0.5 + 0.4 * math.sin(T * 3 - j * 1.3))
    if 'ring' in fx:
        glow(sub, *P(0.84, 0.05), rw * 0.1, (170, 185, 220), 0.3)
        warp(sub, R(0.3, 0.12, 1.0, 0.3), 2, 5, 2, T)
        for k_, mi in enumerate(MK_ORDER):
            mx, my = MARKERS[mi]
            on = 1 - ease((lt - (0.4 + 0.5 * k_ / 12)) / 0.06)
            if on > 0.01:
                glow(sub, *P(mx, my), rw * 0.035, (255, 170, 70), 0.6 * on * (0.8 + 0.2 * math.sin(T * 4 + k_)))
            else:
                gy, gx = np.ogrid[0:hh, 0:ww]
                cxs, cys = P(mx, my)
                g = np.exp(-(((gx - cxs) ** 2 + (gy - cys) ** 2) / (2 * (rw * 0.03) ** 2))).astype(np.float32)[..., None]
                sub *= 1 - 0.75 * g
        if lt > 0.92:
            sub *= 1 - 0.3 * ease((lt - 0.92) / 0.08)


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
        draw_words(d, [['HOW', 'IT', 'WAS'], ['TRAPPED'], ['BENEATH', 'DERRY']], H / 2 - 80, FBIG, 135)
        draw_words(d, [['FULL', 'SPOILERS']], H / 2 + 200, FSP, 90)
    for t0, t1, c in caps:
        if t0 <= T < t1:
            draw_words(d, wrap(c, FCAP, d), 1500, FCAP, 100)
    if T > t_out + OUT_MOVE * 0.6:
        draw_words(d, [['DID', 'YOU', 'KNOW'], ['THIS', 'ORIGIN?'], ['COMMENT', 'BELOW']], H / 2, FOUT, 120)
    return out


if PREVIEW:
    times = [0.3] + [s['arrive'] + s['hold'] * 0.75 for s in segs] + [TOTAL - 0.5]
    tw, th = 216, 384
    sheet = Image.new('RGB', (7 * tw, 2 * th))
    for j, T in enumerate(times):
        sheet.paste(frame(T).resize((tw, th)), ((j % 7) * tw, (j // 7) * th))
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
