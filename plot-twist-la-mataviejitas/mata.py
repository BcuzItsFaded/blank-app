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
    ("Someone was murdering elderly women in Mexico City. And the victims were letting the killer inside.",
     'af_heart', (1.0, 1.06, (0.5, 0.5), (0.5, 0.47)), ['intro'], None, 520),
    ("In the early 2000s, elderly women were being found dead inside their homes. Fear spread across the capital.",
     'am_michael', (1.08, 1.08, (0.42, 0.5), (0.58, 0.5)), ['sirens'], None, 1640),
    ("The killer sometimes pretended to be a nurse or social worker, offering assistance to women living alone.",
     'af_heart', (1.0, 1.12, (0.5, 0.5), (0.62, 0.42)), ['doorway'], None, 1640),
    ("Once inside, the visitor attacked. Police desperately searched for someone the newspapers called La Mataviejitas.",
     'am_michael', (1.08, 1.1, (0.35, 0.5), (0.62, 0.48)), ['room'], None, 1180),
    ("Investigators collected fingerprints, but their early assumptions about the killer's identity led them astray.",
     'af_heart', (1.02, 1.1, (0.5, 0.5), (0.55, 0.55)), ['flashlight'], None, 1680),
    ("On January 25th, 2006, a witness saw a woman leaving the home of an 82-year-old victim.",
     'am_michael', (1.0, 1.12, (0.5, 0.55), (0.56, 0.4)), ['street'], None, 1640),
    ("Police arrested Juana Barraza. Investigators connected her fingerprints to multiple murders.",
     'af_heart', (1.0, 1.12, (0.5, 0.45), (0.55, 0.62)), ['arrest'], None, 1280),
    ("The terrifying twist? The killer was also a masked wrestler called The Lady of Silence. She was convicted of sixteen murders.",
     'am_michael', (1.0, 1.1, (0.5, 0.55), (0.5, 0.35)), ['ring'], None, 1180),
]
SPLIT1 = ("Someone was murdering elderly women in Mexico City.", "And the victims were letting the killer inside.")
RED = {'MURDERING', 'KILLER', 'INSIDE.', 'DEAD', 'FEAR', 'NURSE', 'ALONE.', 'ATTACKED.', 'MATAVIEJITAS.', 'FINGERPRINTS,',
       'ASTRAY.', 'WITNESS', 'BARRAZA.', 'FINGERPRINTS', 'MURDERS.', 'TWIST?', 'MASKED', 'WRESTLER', 'SILENCE.', 'SIXTEEN'}


def say(t):
    return (t.replace("January 25th, 2006", "January twenty-fifth, two thousand six")
             .replace("82-year-old", "eighty-two year old").replace("2000s", "two thousands")
             .replace("Mataviejitas", "Mah-tah-vee-eh-hee-tahs").replace("Juana Barraza", "Hwana Bah-rrah-sah"))


# ------------------------------------------------------------------ narration + timeline
from kokoro_onnx import Kokoro
kk = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
vo = [kk.create(say(t), voice=v, speed=1.06, lang='en-us')[0] for t, v, *_ in SCENES[1:]]
_a = kk.create(SPLIT1[0], voice='af_heart', speed=1.06, lang='en-us')[0]
_b = kk.create(SPLIT1[1], voice='am_michael', speed=1.06, lang='en-us')[0]
vo = [np.concatenate([_a, np.zeros(int(0.25 * SR)), _b])] + vo
XF, TAIL = 0.45, 3.0
segs, t = [], 0.0
for i, v in enumerate(vo):
    pre = 0.35 if i == 0 else (1.2 if i == 7 else 0.25)
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
narr *= 1.0 / np.abs(narr).max()
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
traffic = lp(300, brown) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * tt))
traffic /= np.abs(traffic).max()
for i_ in (0, 1, 5):
    region(i_, traffic, 0.35)
horn_n = int(0.5 * SR)
carhorn = lp(1500, np.sign(np.sin(2 * np.pi * 420 * tt[:horn_n])) + np.sign(np.sin(2 * np.pi * 530 * tt[:horn_n]))) * np.minimum(1, tt[:horn_n] / 0.02) * np.minimum(1, (0.5 - tt[:horn_n]) / 0.1)
place(carhorn, at(0, 0.6), 0.03)
place(carhorn, at(5, 0.3), 0.025)
sir_n = int(segs[1]['dur'] * SR)
_ph = np.cumsum(np.where((tt[:sir_n] % 1.2) < 0.6, 650, 850)) / SR
siren = lp(2500, np.sin(2 * np.pi * _ph)) * np.sin(np.linspace(0, np.pi, sir_n)) ** 0.5
place(siren, segs[1]['start'], 0.06)
place(siren[:int(3 * SR)] * np.linspace(1, 0, int(3 * SR)), segs[0]['start'] + 1.0, 0.03)
kn_n = int(0.35 * SR)
knock = np.sin(2 * np.pi * 90 * tt[:kn_n]) * env(kn_n, 0.001, 0.05) + 0.2 * lp(900, white[:kn_n]) * env(kn_n, 0.0005, 0.02)
knock /= np.abs(knock).max()
for k_ in range(3):
    place(knock, segs[2]['start'] + 0.1 + k_ * 0.45, 0.9)
cr_n = int(1.6 * SR)
creak = np.sin(2 * np.pi * np.cumsum(np.linspace(320, 170, cr_n) * (1 + 0.12 * np.sign(np.sin(2 * np.pi * 26 * tt[:cr_n])))) / SR) * np.sin(np.linspace(0, np.pi, cr_n)) ** 2
place(creak, at(2, 0.35), 0.1)
place(sting, at(3, 0.08), 0.22)
tick = np.sin(2 * np.pi * 2500 * tt[:int(.02 * SR)]) * env(int(.02 * SR), 0.0005, 0.004)
for x in np.arange(segs[3]['start'] + 0.3, segs[3]['start'] + segs[3]['dur'], 0.8):
    place(tick, x, 0.3)
ring_n = int(0.9 * SR)
phone = (np.sin(2 * np.pi * 440 * tt[:ring_n]) + np.sin(2 * np.pi * 480 * tt[:ring_n])) * (np.sin(2 * np.pi * 20 * tt[:ring_n]) > 0) * 0.5
place(phone, at(3, 0.6), 0.04)
cl_n = int(0.04 * SR)
click = white[:cl_n] * env(cl_n, 0.0005, 0.008)
place(click, at(4, 0.03), 0.5)
r_t = np.random.default_rng(9)
for x in np.arange(0.35, 0.95, 0.09):
    place(click * 0.6, at(4, x) + r_t.uniform(-0.02, 0.02), 0.25)
rus_n = int(0.45 * SR)
rustle = sosfilt(butter(2, 2500, 'high', fs=SR, output='sos'), white[:rus_n]) * env(rus_n, 0.02, 0.12)
rustle /= np.abs(rustle).max()
place(rustle, at(4, 0.2), 0.2)
step = np.sin(2 * np.pi * 70 * tt[:int(.3 * SR)]) * env(int(.3 * SR), 0.002, 0.05)
for x in np.arange(0.1, 0.9, 0.06):
    place(step, at(5, x), 0.3)
cuff_n = int(0.25 * SR)
cuff = (sosfilt(butter(2, 3000, 'high', fs=SR, output='sos'), white[:cuff_n]) * env(cuff_n, 0.0005, 0.02) +
        0.6 * np.sin(2 * np.pi * 2900 * tt[:cuff_n]) * env(cuff_n, 0.001, 0.06))
cuff /= np.abs(cuff).max()
CUFF_T = 0.35
place(cuff, at(6, CUFF_T), 0.5)
place(cuff, at(6, CUFF_T) + 0.12, 0.4)
flash_n = int(0.3 * SR)
flashpop = sosfilt(butter(2, 1500, 'high', fs=SR, output='sos'), white[:flash_n]) * env(flash_n, 0.001, 0.05)
FLASH_T = [0.55, 0.68, 0.8]
for x in FLASH_T:
    place(flashpop, at(6, x), 0.3)
crowd = sosfilt(butter(2, [300, 2500], 'band', fs=SR, output='sos'), white) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.8 * tt))
crowd /= np.abs(crowd).max()
a8 = int((segs[7]['vo_start'] - 0.05) * SR)
b8 = int((segs[7]['start'] + segs[7]['dur']) * SR)
rise = np.minimum(1, np.arange(b8 - a8) / (0.4 * SR)) * np.clip(1 - (np.arange(b8 - a8) / SR - (segs[7]['vo_dur'] + 0.5)) / 1.0, 0, 1)
bed[a8:b8] += 0.3 * crowd[a8:b8] * rise
bell_n = int(1.5 * SR)
bell = (np.sin(2 * np.pi * 1200 * tt[:bell_n]) + 0.6 * np.sin(2 * np.pi * 2760 * tt[:bell_n])) * env(bell_n, 0.001, 0.5)
place(bell, segs[7]['vo_start'] - 0.05, 0.25)
place(boom, segs[7]['vo_start'] - 0.05, 0.5)
pad_n = int(segs[7]['dur'] * SR)
pad = sum(np.sin(2 * np.pi * f_ * tt[:pad_n]) for f_ in (196, 233.1, 293.7, 98)) / 4
pad *= np.minimum(1, tt[:pad_n] / 1.5) * np.minimum(1, (pad_n / SR - tt[:pad_n]) / 1.0)
place(pad, segs[7]['start'], 0.07)
place(sting, segs[7]['vo_start'] + segs[7]['vo_dur'] + 0.2, 0.2)
_sil = np.ones(N)
_s0, _s1 = int((segs[7]['start'] - 0.1) * SR), int((segs[7]['vo_start'] - 0.05) * SR)
_sil[_s0:_s1] = 0.0
_q0, _q1 = int((segs[3]['start'] + 0.6) * SR), int((segs[3]['start'] + segs[3]['dur']) * SR)
_sil[_q0:_q1] = 0.25

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
bed += 0.13 * music
duck = np.convolve(np.abs(narr) > 0.02, np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
mix = np.tanh((1.15 * narr + bed * _sil * (1 - 0.55 * duck)) * 1.15) * 0.97
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
    cx += math.sin(T * 0.7 + i) * 8
    cy += math.cos(T * 0.55 + i) * 6
    if 'arrest' in fx:
        for x in FLASH_T:
            dc = (T - s['start']) - x * s['dur']
            if 0 <= dc < 0.2:
                cx += math.sin(dc * 70) * 6 * (1 - dc / 0.2)
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
    if 'intro' in fx:
        glow(f, *P(0.88, 0.06), 70 * z, (170, 185, 230), 0.35 + 0.1 * math.sin(T * 2))
        red = 1.0 if math.sin(T * 9) > 0 else 0.0
        glow(f, *P(0.05, 0.9), 110 * z, (255, 30, 30), 0.7 * red)
        glow(f, *P(0.22, 0.9), 110 * z, (40, 80, 255), 0.7 * (1 - red))
        glow(f, *P(0.85, 0.66), 60 * z, (255, 190, 90), 0.6 * (0.8 + 0.2 * math.sin(T * 13) * math.sin(T * 4)))
        for j, (px, py) in enumerate(((0.62, 0.17), (0.75, 0.2), (0.82, 0.12), (0.7, 0.28))):
            glow(f, *P(px, py), 18 * z, (255, 170, 80), 0.4 * max(0, math.sin(T * 1.3 + j * 2)))
    if 'sirens' in fx:
        red = 1.0 if math.sin(T * 9) > 0 else 0.0
        glow(f, *P(0.65, 0.43), 150 * z, (255, 30, 30), 0.55 * red)
        glow(f, *P(0.8, 0.43), 150 * z, (40, 80, 255), 0.55 * (1 - red))
        f[..., 0] *= 1 + 0.06 * red
        f[..., 2] *= 1 + 0.06 * (1 - red)
    if 'doorway' in fx:
        f *= 1 - 0.3 * ease(lt)
        glow(f, *P(0.65, 0.2), 200 * z, (255, 210, 180), 0.12 * (1 - ease(lt)))
    if 'room' in fx:
        fl = 0.8 + 0.2 * math.sin(T * 9) * math.sin(T * 3.3)
        glow(f, *P(0.17, 0.13), 110 * z, (255, 190, 90), 0.55 * fl)
        f *= 0.93 + 0.07 * fl
    if 'flashlight' in fx:
        ph = ease(lt)
        sp = gauss(*P(0.25 + 0.5 * math.sin(ph * 2.6), 0.3 + 0.4 * ph), 280 * z)
        f[:] = f * (0.5 + 0.7 * sp) + sp * np.array([60, 55, 40], np.float32)
    if 'street' in fx:
        glow(f, *P(0.5, 0.05), 250 * z, (255, 220, 160), 0.18 + 0.05 * math.sin(T * 1.5))
        sh = (gx - P(0.3 + 0.4 * lt, 0)[0]) / (90 * z)
        f *= 1 - 0.12 * np.exp(-sh ** 2).astype(np.float32)[..., None]
    if 'arrest' in fx:
        red = 1.0 if math.sin(T * 8) > 0 else 0.0
        glow(f, *P(0.05, 0.3), 220 * z, (255, 30, 30), 0.35 * red)
        glow(f, *P(0.05, 0.3), 220 * z, (40, 80, 255), 0.35 * (1 - red))
        for x in FLASH_T:
            dc = (T - s['start']) - x * s['dur']
            if dc >= 0:
                f += 220 * math.exp(-dc / 0.08)
        glow(f, *P(0.55, 0.85), 70 * z, (230, 235, 255), 0.4 * ease((lt - 0.3) / 0.1) * (0.7 + 0.3 * math.sin(T * 6)))
    if 'ring' in fx:
        pre8 = s['vo_start'] - s['start']
        dk = 1 - ease((sec - pre8 + 0.15) / 0.3)
        f *= 1 - 0.85 * dk
        for j, px in enumerate((0.15, 0.27, 0.39)):
            on = 0.6 + 0.4 * max(0, math.sin(T * 7 + j * 2.1))
            glow(f, *P(px, 0.03), 70 * z, (255, 245, 210), 0.8 * on * (1 - dk))
        if sec > pre8:
            f += 200 * math.exp(-(sec - pre8) / 0.12)
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
        draw_words(d, [['THE', 'LADY'], ['OF', 'SILENCE']], H / 2 - 110, FEND, 118)
        _t = 'JUANA BARRAZA · CONVICTED OF 16 MURDERS (2008)'
        _F = ImageFont.truetype(F_BLACK, 38)
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
