"""Long-form 16:9 renderer for Don't Spoil It RG.

Usage:
  python3 longform.py audio            # narration + soundtrack + timeline.json
  python3 longform.py preview          # preview.png (2 frames per scene + end card)
  python3 longform.py video OUT.mp4    # render scenes in parallel, concat, mux, loudnorm
"""
import json, math, os, random, re, subprocess, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

D = os.path.dirname(os.path.abspath(__file__)) + '/'
W, H, FPS, SR = 1920, 1080, 30, 24000
F_BLACK = '/usr/share/fonts/opentype/inter/Inter-Black.otf'
F_BOLD = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
SCRIPT = json.load(open(D + 'script.json'))
NS = len(SCRIPT)
FADE = 0.45          # fade-through-black at each scene edge
TAIL_END = 6.0       # end card length
VOICE, SPEED = 'am_michael', 1.0
# per scene: camera (z0, z1, (cx0, cy0), (cx1, cy1)), effects
CAM = {
    1: ((1.0, 1.1, (0.42, 0.45), (0.58, 0.45)), ['stars', 'planet']),
    2: ((1.02, 1.12, (0.45, 0.5), (0.62, 0.38)), ['lamps2', 'storm']),
    3: ((1.0, 1.14, (0.5, 0.45), (0.55, 0.42)), ['pulse', 'sting']),
    4: ((1.02, 1.1, (0.35, 0.45), (0.7, 0.42)), ['ceiling', 'redwarn']),
    5: ((1.0, 1.12, (0.45, 0.45), (0.48, 0.42)), ['burst']),
    6: ((1.0, 1.14, (0.4, 0.5), (0.62, 0.35)), ['drip', 'flicker']),
    7: ((1.02, 1.1, (0.4, 0.45), (0.6, 0.45)), ['flame', 'shake']),
    8: ((1.0, 1.1, (0.3, 0.45), (0.65, 0.42)), ['terminal']),
    9: ((1.0, 1.12, (0.45, 0.45), (0.62, 0.42)), ['sparks']),
    10: ((1.02, 1.1, (0.5, 0.45), (0.5, 0.42)), ['strobe']),
    11: ((1.0, 1.12, (0.45, 0.45), (0.62, 0.42)), ['blast']),
    12: ((1.0, 1.15, (0.4, 0.45), (0.55, 0.42)), ['breath', 'fadeout']),
}


def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def say(t):
    return (t.replace('LV-426', 'L V four two six').replace('937', 'nine three seven')
             .replace('Weyland-Yutani', 'Wayland Yutani').replace('Xenomorph', 'Zeeno-morph'))


def sentences(text):
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    out = []
    for p in parts:
        if len(p) > 95 and ', ' in p:
            mid = len(p) // 2
            cut = min((m.start() for m in re.finditer(', ', p)), key=lambda c: abs(c - mid))
            out += [p[:cut + 1], p[cut + 2:]]
        else:
            out.append(p)
    return [o for o in out if o]


# ------------------------------------------------------------------ audio
def build_audio():
    import soundfile as sf
    from scipy.signal import lfilter, butter, sosfilt
    from kokoro_onnx import Kokoro
    kk = Kokoro('/tmp/claude-0/kokoro/kokoro-v1.0.onnx', '/tmp/claude-0/kokoro/voices-v1.0.bin')
    lp = lambda f, x: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
    bp = lambda a, b, x: sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)
    hp = lambda f, x: sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)

    tl, clips, t = [], [], 0.0
    for sc in SCRIPT:
        start = t
        t += 0.9
        subs = []
        for snt in sentences(sc['text']):
            a = kk.create(say(snt), voice=VOICE, speed=SPEED, lang='en-us')[0]
            clips.append((t, a))
            subs.append(dict(t0=t, t1=t + len(a) / SR, text=snt))
            t += len(a) / SR + 0.28
        t += 0.8
        tl.append(dict(n=sc['n'], title=sc['title'], start=start, dur=t - start, subs=subs))
        print('scene', sc['n'], round(t - start, 1), 's', flush=True)
    end_start = t
    t += TAIL_END
    TOTAL = t
    N = int(TOTAL * SR) + SR
    tt = np.arange(N) / SR
    rng = np.random.default_rng(0)
    white = rng.normal(0, 1, N)
    brown = lfilter([1], [1, -0.997], white)
    brown /= np.abs(brown).max()
    narr = np.zeros(N)
    for t0, a in clips:
        i = int(t0 * SR)
        narr[i:i + len(a)] += a
    narr /= np.abs(narr).max()
    bed = np.zeros(N)

    def env(n, atk, dec):
        e = np.arange(n) / SR
        return np.minimum(1, e / max(atk, 1e-4)) * np.exp(-e / dec)

    def place(x, at, g):
        i = int(at * SR)
        if 0 <= i < N:
            x = x[:N - i]
            bed[i:i + len(x)] += g * x

    def region(k, sig, g, fade=1.0):
        s = tl[k - 1]
        a, b = int(s['start'] * SR), min(N, int((s['start'] + s['dur']) * SR))
        e = np.ones(b - a)
        f = int(fade * SR)
        e[:f] = np.linspace(0, 1, f)
        e[-f:] = np.linspace(1, 0, f)
        bed[a:b] += g * sig[a:b] * e

    def at(k, frac):
        s = tl[k - 1]
        return s['start'] + s['dur'] * frac

    def norm(x):
        return x / (np.abs(x).max() + 1e-9)

    # ---- score: slow, cold synth drone + sparse metallic pings (original)
    drone = norm(lp(220, np.sin(2 * np.pi * 41.2 * tt) + 0.7 * np.sin(2 * np.pi * 61.7 * tt + np.sin(0.3 * tt))
                     + 0.4 * np.sin(2 * np.pi * 82.4 * tt * (1 + 0.002 * np.sin(0.2 * tt)))))
    drone *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.05 * tt)
    bed += 0.12 * drone
    pad = sum(np.sin(2 * np.pi * f * tt * (1 + 0.003 * np.sin(0.4 * tt + f))) for f in (146.8, 174.6, 220.0, 207.7))
    pad = norm(lp(1200, pad)) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.03 * tt) ** 2)
    bed += 0.05 * pad
    r_p = np.random.default_rng(5)
    x = 2.0
    while x < TOTAL - 4:
        n = int(2.5 * SR)
        f = r_p.choice([880, 1046.5, 1174.7, 1318.5, 1567.98])
        ping = np.sin(2 * np.pi * f * tt[:n]) * env(n, 0.002, 0.9) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt[:n]) * env(n, 0.002, 0.4)
        place(ping, x, 0.025)
        x += r_p.uniform(4, 9)

    # ---- per-scene SFX (from the production notes)
    engine = norm(lp(120, brown) + 0.3 * np.sin(2 * np.pi * 33 * tt))
    for k in (1, 4, 8, 11, 12):
        region(k, engine, 0.25)
    hiss_n = int(1.2 * SR)
    hiss = norm(hp(2500, white[:hiss_n])) * env(hiss_n, 0.05, 0.4)
    for x in (0.35, 0.5):
        place(hiss, at(1, x), 0.12)
    for x in np.arange(0.6, 0.95, 0.07):
        blip_n = int(0.07 * SR)
        place(np.sin(2 * np.pi * 2200 * tt[:blip_n]) * env(blip_n, 0.002, 0.02), at(1, x), 0.08)
    wind = norm(lp(500, brown))
    region(2, wind, 0.5)
    static = norm(bp(700, 3500, white))
    region(2, static * (np.sin(2 * np.pi * 0.4 * tt) > 0.5), 0.06)
    groan_n = int(3 * SR)
    groan = norm(lp(300, np.sin(2 * np.pi * np.cumsum(np.linspace(55, 38, groan_n)) / SR) * (0.6 + 0.4 * rng.random(groan_n)))) * np.sin(np.linspace(0, np.pi, groan_n))
    place(groan, at(2, 0.45), 0.3)
    place(groan, at(6, 0.4), 0.35)
    wet_n = int(1.2 * SR)
    wet = norm(lp(700, white[:wet_n]) * np.abs(np.sin(2 * np.pi * 7 * tt[:wet_n])) ** 3) * env(wet_n, 0.05, 0.4)
    place(wet, at(3, 0.25), 0.4)
    hit_n = int(2.5 * SR)
    sting = norm((np.sin(2 * np.pi * 70 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 466 * tt[:hit_n]) + 0.5 * np.sin(2 * np.pi * 494 * tt[:hit_n])
                  + 0.4 * np.sin(2 * np.pi * 740 * tt[:hit_n])) * env(hit_n, 0.002, 0.8))
    boom = norm(np.sin(2 * np.pi * 40 * tt[:hit_n] * (1 - 0.12 * tt[:hit_n])) * env(hit_n, 0.005, 0.7) + 0.4 * white[:hit_n] * env(hit_n, 0.001, 0.04))
    place(sting, at(3, 0.33), 0.35)
    place(boom, at(3, 0.33), 0.4)
    beep_n = int(0.25 * SR)
    beep = np.sign(np.sin(2 * np.pi * 740 * tt[:beep_n])) * env(beep_n, 0.003, 0.3)
    for x in np.arange(0.05, 0.4, 0.04):
        place(beep, at(4, x), 0.04)
    hyd_n = int(1.5 * SR)
    hyd = norm(bp(200, 1500, white[:hyd_n])) * np.sin(np.linspace(0, np.pi, hyd_n))
    place(hyd, at(4, 0.55), 0.3)
    strings = norm(sum(np.sin(2 * np.pi * f * tt * (1 + 0.004 * np.sin(5 * tt))) for f in (110, 116.5)))
    region(4, strings, 0.05)
    murmur = norm(bp(200, 700, white) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tt)))
    s5 = tl[4]
    a5, b5 = int(s5['start'] * SR), int(at(5, 0.55) * SR)
    bed[a5:b5] += 0.08 * murmur[a5:b5]
    crash_n = int(1.5 * SR)
    crash = norm(hp(1500, white[:crash_n]) * (rng.random(crash_n) > 0.6)) * env(crash_n, 0.001, 0.25)
    place(crash, at(5, 0.58), 0.5)
    place(boom, at(5, 0.58), 0.6)
    place(sting, at(5, 0.6), 0.3)
    scream_n = int(1.5 * SR)
    scream = norm(bp(600, 2500, np.sin(2 * np.pi * np.cumsum(900 + 120 * np.sin(2 * np.pi * 7 * tt[:scream_n])) / SR) + 0.3 * white[:scream_n])) * env(scream_n, 0.05, 0.5)
    place(scream, at(5, 0.6), 0.08)
    chain_n = int(0.4 * SR)
    chain = norm(hp(3000, white[:chain_n]) * (rng.random(chain_n) > 0.9)) * env(chain_n, 0.001, 0.12)
    for x in np.arange(0.35, 0.7, 0.11):
        place(chain, at(6, x), 0.2)
    drip = np.sin(2 * np.pi * 1300 * tt[:int(.25 * SR)] * (1 + 0.4 * np.exp(-tt[:int(.25 * SR)] * 30))) * env(int(.25 * SR), 0.001, 0.05)
    for x in np.arange(0.1, 0.95, 0.06):
        place(drip, at(6, x), 0.12)
    hiss2 = norm(hp(3000, white[:hiss_n])) * env(hiss_n, 0.02, 0.5)
    place(hiss2, at(6, 0.62), 0.25)
    place(sting, at(6, 0.62), 0.3)
    tick = np.sin(2 * np.pi * 1800 * tt[:int(.04 * SR)]) * env(int(.04 * SR), 0.001, 0.01)
    for k, a, b in ((7, 0.1, 0.75), (10, 0.05, 0.3)):
        x = a
        while x < b:
            place(tick, at(k, x), 0.2)
            x += 0.012 * (1 - 0.6 * (x - a) / (b - a))
    flame_n = int(1.5 * SR)
    flame = norm(lp(1500, white[:flame_n])) * env(flame_n, 0.05, 0.6)
    place(flame, at(7, 0.55), 0.4)
    place(scream, at(7, 0.68), 0.12)
    place(boom, at(7, 0.68), 0.4)
    region(8, norm(np.sign(np.sin(2 * np.pi * 120 * tt)) * 0.3 + np.sin(2 * np.pi * 60 * tt)), 0.03)
    key_n = int(0.05 * SR)
    key = hp(2000, white[:key_n]) * env(key_n, 0.0005, 0.01)
    r_k = np.random.default_rng(7)
    for x in np.arange(0.05, 0.3, 0.012):
        place(key, at(8, x) + r_k.uniform(-0.1, 0.1), 0.2)
    pulse = np.sin(2 * np.pi * 45 * tt[:int(.6 * SR)]) * env(int(.6 * SR), 0.01, 0.2)
    for x in np.arange(0.35, 0.95, 0.04):
        place(pulse, at(8, x), 0.35)
    zap_n = int(0.5 * SR)
    zap = norm(hp(2000, white[:zap_n]) * (rng.random(zap_n) > 0.85)) * env(zap_n, 0.001, 0.12)
    for x in np.arange(0.1, 0.9, 0.05):
        place(zap, at(9, x) + r_k.uniform(0, 0.4), 0.12)
    dist = norm(np.sign(np.sin(2 * np.pi * 180 * tt)) * (np.sin(2 * np.pi * 3 * tt) > 0.3))
    a9, b9 = int(at(9, 0.5) * SR), int(at(9, 0.75) * SR)
    bed[a9:b9] += 0.03 * dist[a9:b9]
    siren = norm(np.sin(2 * np.pi * np.cumsum(600 + 250 * np.sin(2 * np.pi * 0.5 * tt)) / SR))
    region(10, siren, 0.04)
    region(11, siren, 0.06)
    region(10, static, 0.03)
    place(scream, at(10, 0.4), 0.1)
    place(boom, at(10, 0.42), 0.4)
    for x in np.arange(0.05, 0.6, 0.033):
        place(beep, at(11, x), 0.05)
    eng_n = int(4 * SR)
    eng = norm(lp(400, white[:eng_n])) * np.linspace(0.2, 1, eng_n) * np.minimum(1, (4 - tt[:eng_n]) / 0.5)
    place(eng, at(11, 0.62), 0.4)
    big_n = int(5 * SR)
    big = norm(lp(300, brown[:big_n]) + 0.5 * lp(1500, white[:big_n])) * env(big_n, 0.01, 1.8)
    place(big, at(11, 0.82), 0.8)
    place(boom, at(11, 0.82), 0.8)
    dec_n = int(2.5 * SR)
    dec = norm(hp(400, white[:dec_n])) * env(dec_n, 0.02, 0.8)
    place(dec, at(12, 0.55), 0.5)
    place(sting, at(12, 0.4), 0.3)
    place(eng, at(12, 0.66), 0.4)
    place(boom, at(12, 0.68), 0.5)

    # sudden silence right before the hidden-alien reveal (scene 12, first 6%)
    sil = np.ones(N)
    a12 = int(tl[11]['start'] * SR)
    sil[a12:a12 + int(0.9 * SR)] = np.linspace(1, 0.15, int(0.9 * SR))
    fade_out = np.clip((TOTAL - tt) / 4.0, 0, 1)
    duck = np.convolve(np.abs(narr) > 0.02, np.ones(int(0.3 * SR)) / int(0.3 * SR), 'same')
    mix = np.tanh((1.15 * narr + bed * sil * fade_out * (1 - 0.55 * duck)) * 1.1) * 0.97
    sf.write(D + 'mix.wav', mix[:int(TOTAL * SR)], SR)
    json.dump(dict(scenes=tl, end_start=end_start, total=TOTAL), open(D + 'timeline.json', 'w'), indent=1)
    print('total', round(TOTAL, 1), 's =', int(TOTAL // 60), 'min', int(TOTAL % 60), 's')


# ------------------------------------------------------------------ video
FSUB = None


def init_fonts():
    global FSUB, FEND, FEND2, FEND3
    FSUB = ImageFont.truetype(F_BLACK, 46)
    FEND = ImageFont.truetype(F_BLACK, 110)
    FEND2 = ImageFont.truetype(F_BLACK, 52)
    FEND3 = ImageFont.truetype(F_BOLD, 40)


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
GY, GX = np.ogrid[0:H, 0:W]
VIGN = (1 - 0.2 * (np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / math.sqrt(2)) ** 2.2)[..., None]
del yy, xx
BAN_Y = 922
GRAIN = [np.random.default_rng(k).normal(0, 2.5, (H, W, 1)).astype(np.float32) for k in range(4)]
STARS = [(random.Random(i).uniform(0, 1), random.Random(i + 50).uniform(0, 0.8), random.Random(i + 9).uniform(0, 6.28)) for i in range(70)]


def gauss(px, py, rad):
    return np.exp(-(((GX - px) ** 2 + (GY - py) ** 2) / (2 * rad * rad))).astype(np.float32)[..., None]


def glow(f, px, py, rad, col, amt):
    f += gauss(px, py, rad) * np.array(col, np.float32) * amt


def wrap(text, f, d, maxw=W - 360):
    words, lines, cur = text.split(), [], []
    for w in words:
        if cur and d.textlength(' '.join(cur + [w]), font=f) > maxw:
            lines.append(' '.join(cur))
            cur = []
        cur.append(w)
    lines.append(' '.join(cur))
    return lines


def scene_frame(k, img, s, T):
    (z0, z1, c0, c1), fx = CAM[k]
    ls = T - s['start']
    lt = min(1, max(0, ls / s['dur']))
    e = ease(lt)
    z = z0 + (z1 - z0) * e
    cx = (c0[0] + (c1[0] - c0[0]) * e) * W + math.sin(T * 0.6 + k) * 10
    cy = (c0[1] + (c1[1] - c0[1]) * e) * H + math.cos(T * 0.45 + k) * 7
    shake = 0
    if 'shake' in fx and 0.66 < lt < 0.72:
        shake = 14
    if 'burst' in fx and 0.57 < lt < 0.63:
        shake = 18
    if 'blast' in fx and 0.81 < lt < 0.9:
        shake = 20
    if 'sting' in fx and 0.32 < lt < 0.36:
        shake = 12
    cx += math.sin(T * 63) * shake
    cy += math.cos(T * 57) * shake
    if 'pulse' in fx:
        z *= 1 + 0.012 * max(0, math.sin(T * 7.5)) ** 8
    cw, ch = W / z, H / z
    cx = min(max(cx, cw / 2), W - cw / 2)
    cy = min(max(cy, ch / 2), H - ch / 2)
    bx, by = cx - cw / 2, cy - ch / 2
    f = np.asarray(img.resize((W, H), Image.BICUBIC, box=(bx, by, bx + cw, by + ch)), np.float32).copy()

    def P(nx, ny):
        return (nx * W - bx) * z, (ny * H - by) * z
    if 'stars' in fx:
        im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(im)
        for sx, sy, ph in STARS:
            a = 0.5 + 0.5 * math.sin(T * 2.5 + ph)
            if a > 0.7:
                x, y = P(sx, sy)
                r = 3 * a
                dr.line([(x - r * 2, y), (x + r * 2, y)], fill=(220, 230, 255))
                dr.line([(x, y - r * 2), (x, y + r * 2)], fill=(220, 230, 255))
        f = np.asarray(im, np.float32).copy()
    if 'planet' in fx:
        glow(f, *P(0.8, 0.9), 300 * z, (70, 110, 170), 0.25 + 0.05 * math.sin(T))
        for j, (px, py) in enumerate(((0.2, 0.42), (0.47, 0.35), (0.72, 0.38))):
            glow(f, *P(px, py), 25 * z, (255, 210, 140), 0.4 * max(0, math.sin(T * 1.7 + j * 2)))
    if 'lamps2' in fx:
        for j, (px, py) in enumerate(((0.12, 0.52), (0.24, 0.58), (0.37, 0.6), (0.5, 0.6))):
            fl = 0.75 + 0.25 * math.sin(T * 9 + j * 1.7) * math.sin(T * 3.1 + j)
            glow(f, *P(px, py), 45 * z, (255, 230, 170), 0.55 * fl)
    if 'storm' in fx:
        dt = (ls % 9.0)
        if dt < 0.25:
            f += 120 * math.exp(-dt / 0.06)
    if 'sting' in fx:
        d0 = lt - 0.33
        if 0 <= d0 < 0.04:
            f += 200 * math.exp(-d0 * s['dur'] / 0.1)
    if 'ceiling' in fx:
        fl = 1.0 if math.sin(T * 17) * math.sin(T * 4.3) > -0.4 else 0.6
        glow(f, *P(0.6, 0.05), 140 * z, (230, 240, 255), 0.4 * fl)
    if 'redwarn' in fx:
        a = max(0, math.sin(T * 3.2)) ** 2
        f[..., 0] *= 1 + 0.15 * a
        f[..., 1:] *= 1 - 0.06 * a
    if 'burst' in fx:
        d0 = lt - 0.58
        if d0 >= 0:
            f += np.array([180, 40, 30], np.float32) * math.exp(-d0 * s['dur'] / 0.25)
    if 'drip' in fx:
        im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(im)
        for j, (px, py) in enumerate(((0.62, 0.4), (0.68, 0.45), (0.73, 0.42))):
            ph = (T * 0.7 + j * 0.37) % 1
            x, y = P(px, py + ph * 0.3)
            dr.ellipse([x - 4, y - 7, x + 4, y + 7], fill=(200, 210, 220))
        f = np.asarray(im, np.float32).copy()
    if 'flicker' in fx:
        f *= 0.95 + 0.05 * (1 if math.sin(T * 21) * math.sin(T * 5) > -0.3 else -1)
    if 'flame' in fx:
        fl = 0.7 + 0.3 * math.sin(T * 23) * math.sin(T * 7.1)
        glow(f, *P(0.87, 0.7), 240 * z, (255, 140, 40), 0.55 * fl)
    if 'terminal' in fx:
        a = 0.7 + 0.3 * math.sin(T * 2.4)
        glow(f, *P(0.8, 0.45), 380 * z, (40, 255, 90), 0.18 * a)
        x0 = int(max(0, P(0.6, 0)[0]))
        f[::3, x0:] *= 0.94
    if 'sparks' in fx:
        on = 1.0 if math.sin(T * 37) * math.sin(T * 11) > 0.2 else 0.2
        glow(f, *P(0.66, 0.5), 60 * z, (180, 220, 255), 0.9 * on)
    if 'strobe' in fx:
        a = 1.0 if math.sin(T * 6) > 0 else 0.0
        f[..., 0] *= 1 + 0.18 * a
        f *= 0.95 + 0.05 * a
    if 'blast' in fx:
        fl = 0.7 + 0.3 * math.sin(T * 13) * math.sin(T * 4)
        glow(f, *P(0.75, 0.35), 320 * z, (255, 170, 60), 0.35 * fl)
        d0 = lt - 0.82
        if d0 >= 0:
            f += 230 * math.exp(-d0 * s['dur'] / 0.35)
    if 'breath' in fx:
        b = 0.5 + 0.5 * math.sin(T * 1.6)
        glow(f, *P(0.88, 0.45), 260 * z, (20, 30, 50), -0.25 * b)
    ban = np.asarray(img, np.float32)[BAN_Y:]
    f[BAN_Y + 12:] = ban[12:]
    blend = np.linspace(0, 1, 12, dtype=np.float32)[:, None, None]
    f[BAN_Y:BAN_Y + 12] = f[BAN_Y:BAN_Y + 12] * (1 - blend) + ban[:12] * blend
    # grade: light vignette, brighter, slightly more saturated
    f *= VIGN
    f = 255.0 * np.power(np.clip(f, 0, 255) / 255.0, 0.88) * 1.04
    l = f.mean(axis=2, keepdims=True)
    f = l + (f - l) * 1.06
    f += GRAIN[int(T * FPS) % 4]
    # fades at scene edges
    edge = min(ls / FADE, (s['dur'] - ls) / FADE, 1.0)
    if 'fadeout' in fx:
        edge = min(edge, max(0, (s['dur'] - ls - 0.2) / 2.5))
    f *= max(0, edge)
    out = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    for sub in s['subs']:
        if sub['t0'] <= T < sub['t1'] + 0.15:
            lines = wrap(sub['text'], FSUB, d)
            lh = 58
            y0 = 905 - len(lines) * lh
            for j, ln in enumerate(lines):
                w = d.textlength(ln, font=FSUB)
                d.text(((W - w) / 2, y0 + j * lh), ln, font=FSUB, fill=(255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0))
    return out


def end_frame(T, TL):
    ls = T - TL['end_start']
    a = ease(ls / 0.8)
    out = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(out)
    c = lambda col: tuple(int(v * a) for v in col)
    for txt, f, y, col in (("DON'T SPOIL IT RG", FEND, 330, (230, 40, 40)), ('ALIEN (1979) · FULL STORY EXPLAINED', FEND2, 480, (240, 235, 225)),
                           ('LIKE  ·  SUBSCRIBE  ·  TELL US WHICH MOVIE IS NEXT', FEND3, 600, (200, 195, 185))):
        w = d.textlength(txt, font=f)
        d.text(((W - w) / 2, y), txt, font=f, fill=c(col))
    return out


def render_segment(args):
    k, path = args
    init_fonts()
    TL = json.load(open(D + 'timeline.json'))
    if k == 0:
        t0, t1 = TL['end_start'], TL['total']
        fn = lambda T: end_frame(T, TL)
    else:
        s = TL['scenes'][k - 1]
        img = Image.open(D + f's{k:02d}.jpg').convert('RGB').resize((W, H), Image.LANCZOS)
        t0, t1 = s['start'], s['start'] + s['dur']
        fn = lambda T: scene_frame(k, img, s, T)
    n0, n1 = round(t0 * FPS), round(t1 * FPS)
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                          '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    for n in range(n0, n1):
        p.stdin.write(fn(n / FPS).tobytes())
    p.stdin.close()
    p.wait()
    return k, n1 - n0


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'audio':
        build_audio()
    elif mode == 'preview':
        init_fonts()
        TL = json.load(open(D + 'timeline.json'))
        tw, th = 384, 216
        sheet = Image.new('RGB', (5 * tw, 5 * th))
        j = 0
        for k, s in enumerate(TL['scenes'], 1):
            img = Image.open(D + f's{k:02d}.jpg').convert('RGB')
            for q in (0.3, 0.7):
                sheet.paste(scene_frame(k, img, s, s['start'] + s['dur'] * q).resize((tw, th)), ((j % 5) * tw, (j // 5) * th))
                j += 1
        sheet.paste(end_frame(TL['total'] - 1, TL).resize((tw, th)), ((j % 5) * tw, (j // 5) * th))
        sheet.save(D + 'preview.png')
    elif mode == 'video':
        out = sys.argv[2]
        os.makedirs(D + 'seg', exist_ok=True)
        jobs = [(k, D + f'seg/{k:02d}.mp4') for k in range(1, NS + 1)] + [(0, D + 'seg/99.mp4')]
        with Pool(4) as pool:
            for k, n in pool.imap_unordered(render_segment, jobs):
                print('segment', k, n, 'frames', flush=True)
        with open(D + 'seg/list.txt', 'w') as fl:
            for k in list(range(1, NS + 1)) + [99]:
                fl.write(f"file '{D}seg/{k:02d}.mp4'\n")
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', D + 'seg/list.txt', '-i', D + 'mix.wav',
                        '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                        '-shortest', '-movflags', '+faststart', out], check=True)
        print('done', out)
