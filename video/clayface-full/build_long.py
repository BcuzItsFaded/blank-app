"""Clayface (2026) full breakdown: camera tour of the 12-panel storyboard + narration + score."""
import glob, math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont

D = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else f"{D}/clayface_full_breakdown.mp4"
FPS, OW, OH, SR = 30, 1920, 1080, 44100
rng = np.random.default_rng(11)

board = Image.open(f"{D}/board.png").convert("RGB").convert("RGBA")
BW, BH = board.size
# "Don't Spoil It with R & A" banner over both host panels (1 and 12)
bn0 = Image.open(f"{D}/banner.png")
for cx, cy, w in ((190, 372, 270), (1335, 978, 280)):
    bn = bn0.resize((w, round(bn0.height * w / bn0.width)), Image.LANCZOS)
    board.alpha_composite(bn, (cx - w // 2, cy - bn.height // 2))
board = board.convert("RGB")

CW, CH = round(BH * 16 / 9), BH
OX = (CW - BW) // 2
bg = board.resize((CW, round(BH * CW / BW))).crop((0, 0, CW, CH))
bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(28))).enhance(0.35)
bg.paste(board, (OX, 0))
S = 2
canvas = bg.resize((CW * S, CH * S), Image.LANCZOS)

def pbox(x0, y0, x1, y1, m=0.97):
    w = max(x1 - x0, (y1 - y0) * 16 / 9) * m
    return ((x0 + x1) / 2 + OX, (y0 + y1) / 2, w)

def box(cx, cy, w):
    return (cx + OX, cy, w)

def push(b, k=0.86, fy=0.45):
    cx, cy, w = b
    h = w * 9 / 16
    return (cx, cy + (fy - 0.5) * h * (1 - k), w * k)

FULL = (CW / 2, CH / 2, CW)
ROWS = [(145, 413), (417, 683), (687, 1024)]
COLS = [(0, 391), (395, 768), (772, 1154), (1157, 1536)]
P = [pbox(x0, y0, x1, y1) for (y0, y1) in ROWS for (x0, x1) in COLS]

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", p]).strip())
NSEG = 13
vo = [f"{D}/vo/{i:02d}.mp3" for i in range(NSEG)]
vlen = [dur(p) for p in vo]

def line_fracs(i):
    """Start of each narration line as a fraction of segment i's audio."""
    ls = sorted(glob.glob(f"{D}/vo/lines/{i:02d}_*.mp3"))
    t, out = 0.0, []
    for p in ls:
        out.append(t / vlen[i]); t += dur(p) + 0.45
    return out

# keyframes per segment: list of (fraction of the segment's hold phase, box)
KEYS = [[(0, FULL), (0.10, FULL), (0.28, P[0]), (1, push(P[0]))]]
for k in range(1, 11):
    KEYS.append([(0, P[k]), (1, push(P[k], 0.84 if k % 2 else 0.88))])
# Easter eggs: hop between the details each line mentions
lf = line_fracs(11)
spots = [box(768, 300, 1500),           # board overview: "hidden details"
         box(700, 250, 300),             # Imperial Pictures sign
         box(295, 222, 340),             # Gotham Cinema marquee / Gotham
         P[2],                           # One Bad Day -> the attack
         P[4],                           # Jitters / new DCU
         box(1050, 505, 340),            # Club Vesuvius (Aaron Paul cameo)
         box(1000, 110, 900)]            # Gotham skyline + Clayface header
eg = []
for j, s in enumerate(spots):
    a = lf[j]; b = lf[j + 1] if j + 1 < len(lf) else 1.0
    eg += [(a, s), (a + (b - a) * 0.85, push(s, 0.9))]
eg[0] = (0, spots[0])
KEYS.append(eg)
KEYS.append([(0, P[11]), (0.78, push(P[11])), (1, FULL)])

STATIC, MOVE = 0.6, 1.0
segs, vo_at, moves = [], [], []
t = STATIC
prev = None
for i in range(NSEG):
    has_move = i > 0
    hold_start = t + (MOVE if has_move else 0)
    L = (MOVE if has_move else 0) + 0.5 + vlen[i] + (1.2 if i < NSEG - 1 else 1.0)
    segs.append((t, t + L, hold_start, KEYS[i], prev))
    vo_at.append(hold_start + 0.5)
    if has_move: moves.append(t)
    t += L
    prev = KEYS[i][-1][1]
OFF_START = t; t += 0.7
END = t + 0.5
NF = int(END * FPS)

def ease(x):
    x = min(max(x, 0), 1)
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2

def sine(x):
    x = min(max(x, 0), 1)
    return -(math.cos(math.pi * x) - 1) / 2

def lerpb(a, b, k):
    return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k,
            math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * k))

def box_at(tt):
    for s, e, hs, keys, pv in segs:
        if s <= tt < e or (e == segs[-1][1] and tt >= s):
            if pv is not None and tt < hs:
                return lerpb(pv, keys[0][1], ease((tt - s) / MOVE)), (tt - s) / MOVE
            # map onto the voice span so keyframes line up with the narration lines
            v0 = hs + 0.5; vl = e - v0
            f = (tt - v0) / vl
            if f <= keys[0][0]:
                return keys[0][1], None
            for (fa, ba), (fb, bb) in zip(keys, keys[1:]):
                if f <= fb:
                    k = (f - fa) / (fb - fa) if fb > fa else 1
                    quick = fb - fa < 0.2
                    return lerpb(ba, bb, ease(k) if quick else sine(k)), None
            return keys[-1][1], None
    return FULL, None

def render(b):
    cx, cy, w = b
    w = min(w, CW); h = w * 9 / 16
    cx = min(max(cx, w / 2), CW - w / 2); cy = min(max(cy, h / 2), CH - h / 2)
    l, tp = (cx - w / 2) * S, (cy - h / 2) * S
    return canvas.transform((OW, OH), Image.EXTENT, (l, tp, l + w * S, tp + h * S), Image.BICUBIC)

def glitch(a, amt):
    k = int(4 + 22 * amt)
    a = a.copy()
    a[:, :, 0] = np.roll(a[:, :, 0], k, axis=1)
    a[:, :, 2] = np.roll(a[:, :, 2], -k, axis=1)
    for _ in range(int(3 + 6 * amt)):
        y = rng.integers(0, OH - 60); hgt = rng.integers(6, 60)
        a[y:y + hgt] = np.roll(a[y:y + hgt], rng.integers(-80, 80), axis=1)
    return a

def static_frame():
    n = rng.integers(0, 255, (OH // 4, OW // 4), dtype=np.uint8)
    n = np.kron(n, np.ones((4, 4), dtype=np.uint8))
    n[::3] //= 2
    return np.stack([n] * 3, -1)

# ---------- audio ----------
def build_audio():
    n = int((END + 0.5) * SR)
    voice = np.zeros(n, np.float32)
    for p, at in zip(vo, vo_at):
        raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
        x = np.frombuffer(raw, np.float32); i0 = int(at * SR)
        voice[i0:i0 + len(x)] += x[:n - i0]
    voice /= max(1e-6, np.abs(voice).max()) / 0.85
    tt = np.arange(n) / SR
    # dark Gotham drone (D minor) with slow swell + ticking clock
    drone = sum(a * np.sin(2 * np.pi * f * tt + ph) for f, a, ph in
                ((36.7, .5, 0), (36.9, .3, 1), (55.0, .25, 2), (87.3, .12, 3), (146.8, .05, .5)))
    drone *= 0.55 + 0.45 * np.sin(2 * np.pi * tt / 11.0)
    tick = np.zeros(n, np.float32); tl = int(0.03 * SR)
    for ts in np.arange(STATIC, END - 1.5, 0.6):
        i0 = int(ts * SR); tick[i0:i0 + tl] += rng.normal(0, 1, tl) * np.exp(-np.arange(tl) / (0.004 * SR))
    # sparse low piano-like notes
    notes = [50, 53, 57, 52, 50, 48, 53, 45]
    keys = np.zeros(n, np.float32); bl = int(3 * SR); bt = np.arange(bl) / SR
    for k, ts in enumerate(np.arange(STATIC + 1, END - 3, 2.4)):
        f = 440 * 2 ** ((notes[k % 8] - 69) / 12)
        tone = (np.sin(2 * np.pi * f * bt) + .4 * np.sin(4 * np.pi * f * bt) + .15 * np.sin(6 * np.pi * f * bt)) * np.exp(-bt * 1.6)
        i0 = int(ts * SR); keys[i0:i0 + bl] += tone[:n - i0]
    env = np.convolve(np.abs(voice), np.ones(4410) / 4410, "same")
    duck = 1 - 0.55 * np.clip(env / (env.max() * 0.15), 0, 1)
    duck = np.convolve(duck, np.ones(8820) / 8820, "same")
    music = (0.10 * drone + 0.04 * tick + 0.05 * keys) * duck
    sfx = np.zeros(n, np.float32)
    ns = int(STATIC * SR); sfx[:ns] += rng.uniform(-.3, .3, ns) * np.linspace(1, .6, ns)
    def boom(at, amp=.6):
        bl2 = int(2 * SR); bt2 = np.arange(bl2) / SR
        b = np.sin(2 * np.pi * (70 * bt2 - 10 * bt2 ** 2)) * np.exp(-bt2 * 2.2) * amp
        i0 = int(at * SR); sfx[i0:i0 + bl2] += b[:n - i0]
    boom(STATIC)
    for k in (2, 5, 7, 9, 10):  # attack, monster, impostor, kill switch, final reveal
        boom(segs[k][2])
    lf10 = line_fracs(10)  # "But that reunion isn't real."
    boom(vo_at[10] + lf10[2] * vlen[10], .75)
    wl = int(0.9 * SR)
    for m in moves:
        w = np.convolve(rng.normal(0, 1, wl), np.ones(30) / 30, "same") * np.sin(np.pi * np.linspace(0, 1, wl)) ** 2 * 1.6
        i0 = int(m * SR); sfx[i0:i0 + wl] += w[:n - i0]
    zl = int(0.5 * SR); zt = np.arange(zl) / SR
    zap = np.sin(2 * np.pi * (1800 * zt - 1500 * zt ** 2)) * np.exp(-zt * 7) * .3
    i0 = int(OFF_START * SR); sfx[i0:i0 + zl] += zap[:n - i0]
    mix = voice + music + sfx
    mix /= np.abs(mix).max() / 0.92
    with wave.open(f"{D}/mix.wav", "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
        wv.writeframes((np.stack([mix, mix], 1) * 32767).astype(np.int16).tobytes())

build_audio()
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                       "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-", "-i", f"{D}/mix.wav",
                       "-vf", "noise=alls=4:allf=t,vignette=PI/5",
                       "-c:v", "libx264", "-preset", "faster", "-crf", "24", "-pix_fmt", "yuv420p",
                       "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", OUT],
                      stdin=subprocess.PIPE)
black = np.zeros((OH, OW, 3), np.uint8)
for f in range(NF):
    tt = f / FPS
    if tt < STATIC:
        a = static_frame()
    elif tt >= OFF_START + 0.7:
        a = black
    else:
        b, mv = box_at(min(tt, OFF_START))
        a = np.asarray(render(b))
        if tt < STATIC + 0.12:
            a = np.clip(a.astype(np.int16) + 160, 0, 255).astype(np.uint8)
        if mv is not None and 0.3 < mv < 0.7:
            a = glitch(a, 1 - abs(mv - 0.5) * 5)
        if tt >= OFF_START:  # CRT power-off
            p = (tt - OFF_START) / 0.7
            out = black.copy()
            if p < 0.6:
                h = max(4, int(OH * (1 - p / 0.6) ** 3))
                sq = np.asarray(Image.fromarray(a).resize((OW, h)))
                sq = np.clip(sq.astype(np.int16) + int(200 * p / 0.6), 0, 255).astype(np.uint8)
                y0 = (OH - h) // 2; out[y0:y0 + h] = sq
            else:
                w = max(4, int(OW * (1 - (p - 0.6) / 0.4) ** 2))
                out[OH // 2 - 2:OH // 2 + 2, (OW - w) // 2:(OW + w) // 2] = 255
            a = out
    ff.stdin.write(np.ascontiguousarray(a).tobytes())
    if f % 1800 == 0:
        print(f"frame {f}/{NF}", flush=True)
ff.stdin.close(); ff.wait()
print("done", OUT, f"{END:.1f}s")
print("chapters:", " ".join(f"{int(s[0] if i else 0) // 60}:{int(s[0] if i else 0) % 60:02d}" for i, s in enumerate(segs)))
