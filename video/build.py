"""Build the Chucky storyboard video: camera tour of each panel + narration + synth score."""
import math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont

D = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else f"{D}/chucky_movie_breakdown.mp4"
FPS, OW, OH, SR = 30, 1920, 1080, 44100
rng = np.random.default_rng(7)

# ---------- canvas: board centered on a blurred 16:9 backdrop, upscaled 2x ----------
board = Image.open(f"{D}/board.png").convert("RGB")
BW, BH = board.size
CW, CH = round(BH * 16 / 9), BH
OX = (CW - BW) // 2
bg = board.resize((CW, round(BH * CW / BW))).crop((0, 0, CW, CH))
bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(28))).enhance(0.35)
bg.paste(board, (OX, 0))
S = 2
canvas = bg.resize((CW * S, CH * S), Image.LANCZOS)
# "Don't Spoil It with RG & AG" banner over the hosts' photo, drawn at full canvas resolution
bn = Image.open(f"{D}/banner.png")
bw = 400 * S; bn = bn.resize((bw, round(bn.height * bw / bn.width)), Image.LANCZOS)
canvas.paste(bn, (round((245 + OX) * S - bw / 2), round(214 * S - bn.height / 2)), bn)

def pbox(x0, y0, x1, y1, m=1.04):
    w = max(x1 - x0, (y1 - y0) * 16 / 9) * m
    return ((x0 + x1) / 2 + OX, (y0 + y1) / 2, w)

def push(b, k=0.86, fy=0.45):
    cx, cy, w = b
    h = w * 9 / 16
    return (cx, cy + (fy - 0.5) * h * (1 - k), w * k)

FULL = (CW / 2, CH / 2, CW)
TITLE = (715 + OX, 140, 780)
HOSTS = (275 + OX, 150, 600)
PANELS = [(9, 271, 478, 545), (484, 271, 961, 545), (965, 271, 1441, 545),
          (9, 550, 478, 810), (484, 550, 961, 810), (965, 550, 1441, 810),
          (9, 813, 478, 1083), (484, 813, 928, 1083), (935, 813, 1441, 1083)]

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", p]).strip())
vo = [f"{D}/vo/{i:02d}.mp3" for i in range(11)]
vlen = [dur(p) for p in vo]

# ---------- timeline: list of (start, end, kind, data) ----------
STATIC, MOVE = 0.6, 1.0
segs, vo_at, moves = [], [], []
t = STATIC
segs.append((t, t + vlen[0] + 1.6, FULL, TITLE, None)); vo_at.append(t + 0.5); t += vlen[0] + 1.6
prev = TITLE
for i, p in enumerate(PANELS):
    b = pbox(*p); e = push(b, 0.84 if i % 2 else 0.88)
    L = MOVE + vlen[i + 1] + 1.2
    segs.append((t, t + L, b, e, prev)); moves.append(t); vo_at.append(t + 0.9)
    t += L; prev = e
L = MOVE + vlen[10] + 1.0
segs.append((t, t + L, HOSTS, FULL, prev)); moves.append(t); vo_at.append(t + 0.9); t += L
OFF_START = t; t += 0.7
END = t + 0.5
NF = int(END * FPS)

def ease(x):  # easeInOutCubic
    x = min(max(x, 0), 1)
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2

def sine(x):
    x = min(max(x, 0), 1)
    return -(math.cos(math.pi * x) - 1) / 2

def lerpb(a, b, k):
    return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k,
            math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * k))

def box_at(tt):
    for (s, e, b0, b1, pv) in segs:
        if s <= tt < e or (e == segs[-1][1] and tt >= s):
            if pv is not None and tt < s + MOVE:
                return lerpb(pv, b0, ease((tt - s) / MOVE)), (tt - s) / MOVE
            s2 = s if pv is None else s + MOVE
            return lerpb(b0, b1, sine((tt - s2) / (e - s2))), None
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

try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 46)
except OSError:
    font = ImageFont.load_default()

def osd(img, tt):
    d = ImageDraw.Draw(img)
    for dx, dy, c in ((3, 3, (0, 0, 0)), (0, 0, (255, 255, 255))):
        d.text((70 + dx, 60 + dy), "PLAY ▶", font=font, fill=c)
        d.text((OW - 420 + dx, OH - 110 + dy), f"SP  0:00:{int(tt):02d}", font=font, fill=c)

# ---------- audio (built first so ffmpeg can read it) ----------
def build_audio():
    n = int((END + 0.5) * SR)
    voice = np.zeros(n, np.float32)
    for p, at in zip(vo, vo_at):
        raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
        x = np.frombuffer(raw, np.float32); i0 = int(at * SR)
        voice[i0:i0 + len(x)] += x[:n - i0]
    voice /= max(1e-6, np.abs(voice).max()) / 0.85
    tt = np.arange(n) / SR
    # drone: A minor cluster with slow swell
    drone = sum(a * np.sin(2 * np.pi * f * tt + ph) for f, a, ph in
                ((55, .5, 0), (55.4, .3, 1), (82.41, .25, 2), (130.81, .12, 3), (164.8, .05, .5)))
    drone *= 0.55 + 0.45 * np.sin(2 * np.pi * tt / 9.0)
    # creepy music box (A harmonic minor)
    notes = [81, 76, 81, 84, 83, 76, 80, 83, 81, 76, 81, 84, 86, 84, 83, 80]
    box = np.zeros(n, np.float32); step = 0.46; bl = int(1.6 * SR); bt = np.arange(bl) / SR
    for k, ts in enumerate(np.arange(STATIC, END - 1.5, step)):
        f = 440 * 2 ** ((notes[k % 16] - 69) / 12)
        tone = (np.sin(2 * np.pi * f * bt) + .35 * np.sin(2 * np.pi * f * 2.76 * bt) * np.exp(-bt * 6)) * np.exp(-bt * 3.2)
        i0 = int(ts * SR); box[i0:i0 + bl] += tone[:n - i0]
    # duck music under narration
    env = np.convolve(np.abs(voice), np.ones(4410) / 4410, "same")
    duck = 1 - 0.55 * np.clip(env / (env.max() * 0.15), 0, 1)
    duck = np.convolve(duck, np.ones(8820) / 8820, "same")
    music = (0.10 * drone + 0.07 * box) * duck
    sfx = np.zeros(n, np.float32)
    # VHS static burst + boom at start
    ns = int(STATIC * SR); sfx[:ns] += rng.uniform(-.35, .35, ns) * np.linspace(1, .6, ns)
    bl2 = int(2 * SR); bt2 = np.arange(bl2) / SR
    boom = np.sin(2 * np.pi * (70 * bt2 - 10 * bt2 ** 2)) * np.exp(-bt2 * 2.2) * .6
    sfx[ns:ns + bl2] += boom
    # whoosh on each panel transition
    wl = int(0.9 * SR)
    for m in moves:
        w = rng.normal(0, 1, wl); w = np.convolve(w, np.ones(30) / 30, "same")
        w *= np.sin(np.pi * np.linspace(0, 1, wl)) ** 2 * 1.6
        i0 = int(m * SR); sfx[i0:i0 + wl] += w[:n - i0]
    # TV power-off zap
    zl = int(0.5 * SR); zt = np.arange(zl) / SR
    zap = np.sin(2 * np.pi * (1800 * zt - 1500 * zt ** 2)) * np.exp(-zt * 7) * .3
    i0 = int(OFF_START * SR); sfx[i0:i0 + zl] += zap[:n - i0]
    mix = voice + music + sfx
    mix /= np.abs(mix).max() / 0.92
    st = np.stack([mix, mix], 1)
    with wave.open(f"{D}/mix.wav", "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
        wv.writeframes((st * 32767).astype(np.int16).tobytes())

build_audio()
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                       "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-", "-i", f"{D}/mix.wav",
                       "-vf", "noise=alls=4:allf=t,vignette=PI/5,eq=saturation=1.08",
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
        tc = min(tt, OFF_START)
        b, mv = box_at(tc)
        img = render(b)
        if tt < STATIC + 4:
            osd(img, tt)
        a = np.asarray(img)
        if tt < STATIC + 0.12:  # flash in from static
            a = np.clip(a.astype(np.int16) + 160, 0, 255).astype(np.uint8)
        if mv is not None and 0.3 < mv < 0.7:
            a = glitch(a, 1 - abs(mv - 0.5) * 5)
        if tt >= OFF_START:  # CRT power-off: collapse to a line, then a dot
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
    if f % 600 == 0:
        print(f"frame {f}/{NF}", flush=True)
ff.stdin.close(); ff.wait()
print("done", OUT, f"{END:.1f}s")
