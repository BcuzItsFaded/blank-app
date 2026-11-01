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
    ("On December 15, 1900, a passing ship noticed something strange.",
     'am_michael', (1.0, 1.08, (0.5, 0.5), (0.5, 0.45)), ['studio'], None, 1720),
    ("A lighthouse off the coast of Scotland had gone dark. Eleven days later, a relief ship arrived.",
     'af_heart', (1.1, 1.3, (0.5, 0.55), (0.62, 0.42)), ['darklamp2', 'shiplights', 'sea2', 'rain', 'moon'], 'ILLUSTRATED REENACTMENT', 1420),
    ("Its horn sounded. A signal rocket was fired. Nobody answered.",
     'am_michael', (1.15, 1.3, (0.5, 0.6), (0.62, 0.45)), ['rocket', 'darklamp3'], 'ILLUSTRATED REENACTMENT', 1420),
    ("Lighthouse keeper Joseph Moore went ashore to investigate.",
     'af_heart', (1.1, 1.3, (0.45, 0.6), (0.65, 0.55)), ['lantern'], 'ILLUSTRATED REENACTMENT', 1420),
    ("Inside, the station was completely deserted. The lamps were prepared. The machinery was clean. The kitchen was tidy. But two sets of outdoor clothing were missing.",
     'am_michael', (1.25, 1.35, (0.35, 0.6), (0.75, 0.45)), ['lamps'], 'ILLUSTRATED REENACTMENT', 1420),
    ("Outside, iron railings were twisted. A massive stone had been dislodged near the landing.",
     'af_heart', (1.1, 1.3, (0.5, 0.45), (0.45, 0.6)), ['sea6', 'rain'], 'ILLUSTRATED REENACTMENT', 1420),
    ("Investigators believed the three keepers had gone outside to secure equipment when an enormous wave swept them into the ocean.",
     'am_michael', (1.1, 1.35, (0.5, 0.55), (0.5, 0.42)), ['wave7', 'rain'], 'RECONSTRUCTION · THEORY ONLY', 1420),
    ("Their names were James Ducat, Thomas Marshall, and Donald McArthur. No trace of the three men was ever found. More than a century later, nobody knows exactly what happened during their final moments.",
     'af_heart', (1.08, 1.3, (0.5, 0.5), (0.5, 0.66)), ['darklamp8'], 'ILLUSTRATIVE PORTRAITS', 1420),
]
RED = {'STRANGE', 'DARK', 'NOBODY', 'ANSWERED', 'DESERTED', 'MISSING', 'TWISTED', 'MASSIVE', 'ENORMOUS', 'WAVE', 'OCEAN',
       'TRACE', 'NEVER', 'FOUND', 'KNOWS', '1900,'}


def say(t):
    return t.replace("December 15, 1900", "December fifteenth, nineteen hundred")


# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
kk = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [kk.create(say(t), voice=v, speed=1.08, lang='en-us')[0] for t, v, *_ in SCENES]
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
for i_ in (1, 2, 5, 6):
    region(i_, rain, 0.12)
    region(i_, waves, 0.4)
    region(i_, wind, 0.3)
for i_ in (3, 4, 7):
    region(i_, wind, 0.35)
n = int(2.5 * SR)
boom = np.sin(2 * np.pi * 40 * tt[:n] * (1 - 0.12 * tt[:n])) * env(n, 0.005, 0.7) + 0.4 * white[:n] * env(n, 0.001, 0.04)
place(boom, 0.0, 0.45)
sw_n = int(0.5 * SR)
swoosh = sosfilt(butter(2, [400, 5000], 'band', fs=SR, output='sos'), white[:sw_n]) * np.sin(np.linspace(0, np.pi, sw_n)) ** 2
swoosh /= np.abs(swoosh).max()
for s_ in segs[1:]:
    place(swoosh, s_['start'] - 0.3, 0.15)
horn_n = int(1.8 * SR)
horn = lp(600, np.sign(np.sin(2 * np.pi * 98 * tt[:horn_n])) + np.sign(np.sin(2 * np.pi * 147 * tt[:horn_n])))
horn *= np.minimum(1, tt[:horn_n] / 0.1) * np.minimum(1, (1.8 - tt[:horn_n]) / 0.3)
horn /= np.abs(horn).max()
place(horn, at(2, 0.02), 0.3)
rk_n = int(0.9 * SR)
rocket = np.sin(2 * np.pi * np.cumsum(np.linspace(600, 2400, rk_n)) / SR) * np.linspace(0.2, 1, rk_n) * 0.5
place(rocket, at(2, 0.3), 0.1)
place(boom[:int(.6 * SR)], at(2, 0.3) + 0.9, 0.3)
thunder = lp(220, white[:3 * SR])
thunder = thunder / np.abs(thunder).max() * env(3 * SR, 0.05, 0.9)
LIGHT = {1: [0.55], 6: [0.2, 0.75]}
for i_, lts in LIGHT.items():
    for lt in lts:
        place(thunder, at(i_, lt), 0.5)
cr_n = int(1.4 * SR)
creak = np.sin(2 * np.pi * np.cumsum(np.linspace(300, 180, cr_n) * (1 + 0.1 * np.sign(np.sin(2 * np.pi * 30 * tt[:cr_n])))) / SR) * np.sin(np.linspace(0, np.pi, cr_n)) ** 2
place(creak, at(3, 0.65), 0.08)
step = np.sin(2 * np.pi * 70 * tt[:int(.3 * SR)]) * env(int(.3 * SR), 0.002, 0.05)
for x in (0.15, 0.3, 0.45, 0.6):
    place(step, at(3, x), 0.35)
tick = np.sin(2 * np.pi * 2500 * tt[:int(.02 * SR)]) * env(int(.02 * SR), 0.0005, 0.004)
for x in np.arange(segs[4]['start'] + 0.2, segs[4]['start'] + segs[4]['dur'], 0.8):
    place(tick, x, 0.25)
crash_n = int(3 * SR)
crash = lp(1800, white[:crash_n]) * env(crash_n, 0.08, 0.8)
crash /= np.abs(crash).max()
for i_, xs in ((5, (0.2, 0.65)), (6, (0.55,))):
    for x in xs:
        place(crash, at(i_, x), 0.45)
pad_n = int(segs[7]['dur'] * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (196, 233.1, 293.7, 98)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[7]['start'], 0.07)
place(horn, segs[7]['vo_start'] + segs[7]['vo_dur'] + 0.3, 0.12)
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
mix = np.tanh((narr + bed * (1 - 0.4 * duck)) * 1.1) * 0.95
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
    e = ease(min(1, lt / 0.6)) if i == 7 else ease(lt)
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

    def P(nx, ny):
        return (nx * W - bx) * z, (ny * H - by) * z

    def Y(ny):
        return (ny * H - by) * z
    sec = T - s['start']
    if 'studio' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.3)
        glow(f, *P(0.97, 0.97), 90 * z, (255, 170, 80), 0.6 * fl)
        glow(f, *P(0.3, 0.55), 400, (60, 10, 40), 0.25 + 0.1 * math.sin(T * 1.5))
    if 'darklamp2' in fx:
        for px, py, r in ((0.77, 0.09, 40), (0.78, 0.14, 25), (0.62, 0.27, 60)):
            f *= 1 - 0.8 * gauss(*P(px, py), r * z)
    if 'darklamp3' in fx:
        f *= 1 - 0.85 * gauss(*P(0.79, 0.375), 35 * z)
    if 'darklamp8' in fx:
        f *= 1 - 0.8 * gauss(*P(0.66, 0.645), 30 * z)
    if 'shiplights' in fx:
        fl = 0.7 + 0.3 * math.sin(T * 9)
        for px in (0.3, 0.45, 0.6, 0.72):
            glow(f, *P(px, 0.67), 30 * z, (255, 190, 90), 0.35 * fl)
    if 'moon' in fx:
        glow(f, *P(0.95, 0.06), 150 * z, (120, 140, 180), 0.25 + 0.08 * math.sin(T * 2))
    if 'sea2' in fx:
        warp(f, Y(0.75), H, 4, 10, 3, T)
    if 'rocket' in fx:
        b = ease((lt - 0.25) / 0.08)
        pul = 0.75 + 0.25 * math.sin(T * 17)
        glow(f, *P(0.94, 0.095), 70 * z, (255, 240, 220), 1.2 * b * pul)
        glow(f, *P(0.9, 0.15), 380 * z, (180, 20, 20), 0.45 * b * pul)
        f *= 0.8 + 0.2 * b
    if 'lantern' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 11) * math.sin(T * 4.3 + 1)
        glow(f, *P(0.7, 0.86), 70 * z, (255, 190, 90), 0.7 * fl)
        glow(f, *P(0.94, 0.47), 120 * z, (200, 120, 40), 0.3 * fl)
    if 'lamps' in fx:
        for j, (px, py) in enumerate(((0.09, 0.52), (0.27, 0.79), (0.445, 0.775))):
            fl = 0.75 + 0.25 * math.sin(T * 12 + j * 2) * math.sin(T * 4 + j)
            glow(f, *P(px, py), 45 * z, (255, 200, 110), 0.6 * fl)
            glow(f, *P(px, py), 160 * z, (120, 70, 20), 0.25 * fl)
    if 'sea6' in fx:
        warp(f, Y(0.2), Y(0.62), 4, 9, 3, T)
        for x0_ in (0.2, 0.65):
            dt = sec - x0_ * s['dur']
            if 0 <= dt < 1.2:
                glow(f, *P(0.7, 0.35), 350 * z, (180, 200, 225), 0.55 * math.exp(-dt / 0.35))
    if 'wave7' in fx:
        warp(f, 0, Y(0.55), 3 + 6 * lt, 8, 4, T)
        dt = sec - 0.55 * s['dur']
        if dt >= 0:
            glow(f, *P(0.6, 0.25), 600 * z, (200, 215, 235), 0.7 * math.exp(-dt / 0.4))
    if 'rain' in fx:
        f += rains[int(T * FPS) % 4] * 85
    for lt0 in LIGHT.get(i, []):
        dt = sec - lt0 * s['dur']
        if dt >= 0:
            f += math.exp(-dt / 0.15) * (0.6 + 0.4 * (int(dt * 30) % 2 == 0)) * np.array([120, 130, 170], np.float32)
    if i == 7:
        endf = ease((sec - (s['vo_start'] - s['start'] + s['vo_dur'] + 0.2)) / 0.8)
        f *= 1 - 0.75 * endf
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
    if i == 7 and T > s['vo_start'] + s['vo_dur'] + 0.6:
        draw_words(d, [['THEIR', 'EXACT', 'FATE'], ['REMAINS', 'UNKNOWN']], H / 2 - 40, FEND, 118)
        tw = d.textlength('PLOT TWIST WITH R&A', font=FSUB)
        d.text((W / 2 - tw / 2, H / 2 + 120), 'PLOT TWIST WITH R&A', font=FSUB, fill=(235, 35, 35), stroke_width=8, stroke_fill=(0, 0, 0))
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
