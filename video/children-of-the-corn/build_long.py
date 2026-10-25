"""Children of the Corn full book breakdown: 12-panel tour with page-turn transitions,
sunset->dark-red grade, R&A host voices + narrator, corn-rustle after the black."""
import math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont

D = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else f"{D}/children_of_the_corn_breakdown.mp4"
FPS, OW, OH, SR = 30, 1920, 1080, 44100
rng = np.random.default_rng(13)
FONT = f"{D}/Bangers.ttf"

board = Image.open(f"{D}/board.png").convert("RGB").convert("RGBA")
BW, BH = board.size
# banner on host panels (1: top-left couple, 12: bottom-right couple)
bn0 = Image.open(f"{D}/banner.png")
for cx, cy, w in ((318, 342, 170), (1578, 832, 150)):  # clear of the faces and captions
    bn = bn0.resize((w, round(bn0.height * w / bn0.width)), Image.LANCZOS)
    board.alpha_composite(bn, (cx - w // 2, cy - bn.height // 2))
board = board.convert("RGB")

CW, CH = round(BH * 16 / 9), BH
OX = (CW - BW) // 2
bgfull = board.resize((CW, round(BH * CW / BW))).crop((0, 0, CW, CH))
bgfull = ImageEnhance.Brightness(bgfull.filter(ImageFilter.GaussianBlur(26))).enhance(0.35)
bgfull.paste(board, (OX, 0))
S = 2
canvas = bgfull.resize((CW * S, CH * S), Image.LANCZOS)

COLS = [(12, 400), (435, 808), (855, 1216), (1268, 1644)]
ROWS = [(164, 437), (431, 685), (684, 938)]
PANELS = [(c0, r0, c1, r1) for (r0, r1) in ROWS for (c0, c1) in COLS]
FULL = (CW / 2, CH / 2, CW)

def pbox(x0, y0, x1, y1, m=0.99):
    w = max(x1 - x0, (y1 - y0) * 16 / 9) * m
    return ((x0 + x1) / 2 + OX, (y0 + y1) / 2, w)

def push(b, k=0.9, fy=0.42):
    cx, cy, w = b
    h = w * 9 / 16
    return (cx, cy + (fy - 0.5) * h * (1 - k), w * k)

PB = [pbox(*p) for p in PANELS]

# each panel shown whole and centered, on a soft blurred backdrop of itself
PH_BASE = 990  # panel height on screen at the start of a scene (zooms to ~1035)
PANEL_HI, BACKS = [], []
for p in PANELS:
    c = board.crop(p)
    hi_h = round(PH_BASE * 1.05)
    PANEL_HI.append(c.resize((round(c.width * hi_h / c.height), hi_h), Image.LANCZOS)
                    .filter(ImageFilter.UnsharpMask(2, 90, 2)))
    s = max(OW / c.width, OH / c.height)
    bk = c.resize((round(c.width * s) + 2, round(c.height * s) + 2), Image.LANCZOS)
    bk = bk.crop(((bk.width - OW) // 2, (bk.height - OH) // 2, (bk.width - OW) // 2 + OW, (bk.height - OH) // 2 + OH))
    BACKS.append(np.asarray(ImageEnhance.Brightness(bk.filter(ImageFilter.GaussianBlur(32))).enhance(0.5)))

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", p]).strip())
vo = [f"{D}/vo/{i:02d}.mp3" for i in range(12)]
vlen = [dur(p) for p in vo]
import os
if os.environ.get("CORN_TEST"): vlen=[1.4]*12

LEAD, TAIL, PT, INTRO = 0.4, 0.9, 1.1, 2.6
scene_start, audio_at, t = [], [], INTRO
for i in range(12):
    scene_start.append(t)
    audio_at.append(t + LEAD)
    t += LEAD + vlen[i] + TAIL
    if i < 11:
        t += PT
scene_dur = [(scene_start[i + 1] - PT if i < 11 else t) - scene_start[i] for i in range(12)]
OFF_START = t
END = t + 2.6  # fade + corn-rustle over black
NF = int(END * FPS)

def ease(x):
    x = min(max(x, 0), 1)
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2

def lerpb(a, b, k):
    return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k,
            math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * k))

def render(b):
    cx, cy, w = b
    w = min(w, CW); h = w * 9 / 16
    cx = min(max(cx, w / 2), CW - w / 2); cy = min(max(cy, h / 2), CH - h / 2)
    l, tp = (cx - w / 2) * S, (cy - h / 2) * S
    return canvas.transform((OW, OH), Image.EXTENT, (l, tp, l + w * S, tp + h * S), Image.BICUBIC)

def grade(a, i, p, k=1.0):
    # sunset -> dark red: strength ramps up through the story, eases back for the cozy outro (scene 12).
    # k scales it: full on the backdrop, light on the panel itself so the art stays clear.
    gi = (i + p) / 12
    strength = min(1.0, gi / 0.92) * k
    if i == 11:
        strength = 0.35 * k
    red = np.array([150, 20, 18], np.float32)
    a = a.astype(np.float32)
    a = a * (1 - 0.35 * strength) + red * (0.35 * strength) * (a.mean(2, keepdims=True) / 255)
    a = a * (1 - 0.15 * strength)
    return np.clip(a, 0, 255).astype(np.uint8)

def scene_frame(i, p):
    """Whole panel i centered on its blurred backdrop, slow gentle zoom; never cropped."""
    s = 0.5 - 0.5 * math.cos(math.pi * min(max(p, 0), 1))
    ph = round(PH_BASE * (1 + 0.045 * s))
    src = PANEL_HI[i]
    pw = round(src.width * ph / src.height)
    pan = np.asarray(src.resize((pw, ph), Image.BICUBIC) if ph != src.height else src)
    out = grade(BACKS[i], i, p, 1.0).copy()
    x0, y0 = (OW - pw) // 2, (OH - ph) // 2
    # soft drop shadow + thin dark border around the panel
    out[y0 + 8:y0 + ph + 14, x0 + 8:x0 + pw + 14] = (out[y0 + 8:y0 + ph + 14, x0 + 8:x0 + pw + 14] * 0.45).astype(np.uint8)
    out[y0 - 4:y0 + ph + 4, x0 - 4:x0 + pw + 4] = 18
    out[y0:y0 + ph, x0:x0 + pw] = grade(pan, i, p, 0.3)
    return out

def page_turn(fr_from, fr_to, q):
    """Old page peels off to the left revealing the new page, with a fold shadow + edge highlight."""
    q = ease(q)
    xf = int((1 - q) * OW)
    out = fr_to.copy()
    if xf > 2:
        # squeeze old page into [0, xf] (page lifting/curling toward the fold)
        old = Image.fromarray(fr_from).resize((xf, OH), Image.BICUBIC)
        oa = np.asarray(old).copy().astype(np.float32)
        # curl shading on the old page near its right (fold) edge
        grad = np.linspace(1.0, 0.45, xf).astype(np.float32)[None, :, None]
        oa = (oa * grad).astype(np.uint8)
        out[:, :xf] = oa
        # cast shadow from the lifting page onto the new page just right of the fold
        sw = min(90, OW - xf)
        if sw > 0:
            sh = np.linspace(0.35, 1.0, sw).astype(np.float32)[None, :, None]
            out[:, xf:xf + sw] = (out[:, xf:xf + sw].astype(np.float32) * sh).astype(np.uint8)
        # bright page edge
        out[:, max(0, xf - 3):xf + 2] = 235
    return out

f_end1 = ImageFont.truetype(FONT, 150)
f_end2 = ImageFont.truetype(FONT, 90)

def static_frame():
    n = rng.integers(0, 255, (OH // 4, OW // 4), dtype=np.uint8)
    n = np.kron(n, np.ones((4, 4), dtype=np.uint8)); n[::3] //= 2
    return np.stack([n] * 3, -1)

# ---------- audio ----------
def build_audio():
    n = int((END + 0.5) * SR)
    voice = np.zeros(n, np.float32)
    for p, at in zip(vo, audio_at):
        raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
        x = np.frombuffer(raw, np.float32); i0 = int(at * SR)
        voice[i0:i0 + len(x)] += x[:n - i0]
    voice /= max(1e-6, np.abs(voice).max()) / 0.85
    tt = np.arange(n) / SR
    # slow mysterious piano-ish drone in A minor, swelling
    drone = sum(a * np.sin(2 * np.pi * f * tt + ph) for f, a, ph in
                ((55, .5, 0), (55.3, .3, 1), (82.4, .22, 2), (110, .12, 3), (164.8, .05, .5)))
    drone *= 0.5 + 0.5 * np.sin(2 * np.pi * tt / 13.0)
    notes = [57, 60, 64, 62, 60, 55, 59, 62]
    keys = np.zeros(n, np.float32); bl = int(3.4 * SR); bt = np.arange(bl) / SR
    for k, ts in enumerate(np.arange(INTRO, OFF_START - 3, 3.0)):
        f = 440 * 2 ** ((notes[k % 8] - 69) / 12)
        tone = (np.sin(2 * np.pi * f * bt) + .4 * np.sin(4 * np.pi * f * bt)) * np.exp(-bt * 1.5)
        i0 = int(ts * SR); keys[i0:i0 + bl] += tone[:n - i0]
    env = np.convolve(np.abs(voice), np.ones(4410) / 4410, "same")
    duck = np.convolve(1 - 0.5 * np.clip(env / (env.max() * 0.15), 0, 1), np.ones(8820) / 8820, "same")
    music = (0.10 * drone + 0.05 * keys) * duck
    sfx = np.zeros(n, np.float32)
    # soft paper page-flip at each transition
    for i in range(11):
        ts = scene_start[i] + LEAD + vlen[i] + TAIL
        fl = int(0.5 * SR); ft = np.arange(fl) / SR
        flip = np.convolve(rng.normal(0, 1, fl), np.ones(40) / 40, "same")
        flip *= (np.sin(np.pi * np.linspace(0, 1, fl)) ** 2) * np.exp(ft * 1.2) * 0.1
        i0 = int(ts * SR); sfx[i0:i0 + fl] += flip[:n - i0]
    # corn-rustle after the screen goes black
    rs = int((OFF_START + 0.9) * SR); rl = int(1.6 * SR)
    r = rng.normal(0, 1, rl)
    # bandpass-ish rustle: emphasize mid-highs, flutter the amplitude
    r = np.convolve(r, np.array([1, -1]), "same")  # high-pass
    r = np.convolve(r, np.ones(6) / 6, "same")
    flutter = 0.6 + 0.4 * np.sin(2 * np.pi * 7 * np.arange(rl) / SR) * rng.uniform(0.5, 1, rl)
    r *= flutter * np.sin(np.pi * np.linspace(0, 1, rl)) * 0.5
    sfx[rs:rs + rl] += r[:n - rs]
    mix = voice + music + sfx
    mix /= np.abs(mix).max() / 0.92
    with wave.open(f"{D}/mix.wav", "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
        wv.writeframes((np.stack([mix, mix], 1) * 32767).astype(np.int16).tobytes())

black = np.zeros((OH, OW, 3), np.uint8)

def board_frame():
    return grade(np.asarray(render(FULL)), 0, 0, 0.3)

def frame_at(f):
    tt = f / FPS
    if tt < INTRO:
        if tt < 0.4:
            return static_frame()
        if tt < INTRO - PT:  # the whole storyboard, briefly
            a = board_frame()
            if tt < 0.52:
                a = np.clip(a.astype(np.int16) + 150, 0, 255).astype(np.uint8)
            return a
        return page_turn(board_frame(), scene_frame(0, 0.0), (tt - (INTRO - PT)) / PT)
    if tt >= OFF_START:
        q = (tt - OFF_START) / 0.9
        a = (scene_frame(11, 1.0).astype(np.float32) * max(0, 1 - q)).astype(np.uint8) if q < 1 else black.copy()
        img = Image.fromarray(a); d = ImageDraw.Draw(img)
        tq = tt - OFF_START - 0.5
        if tq > 0:
            al = min(1, tq / 0.6)
            d.text((OW / 2, OH / 2 - 70), "R & A BOOK BREAKDOWN", font=f_end2, anchor="mm",
                   fill=tuple(int(235 * al) for _ in range(3)), stroke_width=5, stroke_fill=(0, 0, 0))
            d.text((OW / 2, OH / 2 + 60), "THE END... OR IS IT?", font=f_end1, anchor="mm",
                   fill=(int(220 * al), int(30 * al), int(25 * al)), stroke_width=8, stroke_fill=(0, 0, 0))
        return np.asarray(img)
    i = max(k for k in range(12) if tt >= scene_start[k])
    local = tt - scene_start[i]
    content = LEAD + vlen[i] + TAIL
    if local <= content or i == 11:
        return scene_frame(i, (local - LEAD) / max(0.1, vlen[i]))
    return page_turn(scene_frame(i, 1.0), scene_frame(i + 1, 0.0), (local - content) / PT)

def render_range(args):
    k, f0, f1 = args
    seg = f"{D}/seg{k}.mp4"
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "faster", "-crf", "23", "-pix_fmt", "yuv420p",
                           "-threads", "2", "-an", seg], stdin=subprocess.PIPE)
    for f in range(f0, f1):
        ff.stdin.write(np.ascontiguousarray(frame_at(f)).tobytes())
        if (f - f0) % 1800 == 0:
            print(f"worker {k}: {f - f0}/{f1 - f0}", flush=True)
    ff.stdin.close(); ff.wait()
    return seg

if __name__ == "__main__":
    import multiprocessing as mp
    build_audio()
    W = 4
    bounds = [round(NF * j / W) for j in range(W + 1)]
    with mp.get_context("fork").Pool(W) as pool:
        segs = pool.map(render_range, [(j, bounds[j], bounds[j + 1]) for j in range(W)])
    with open(f"{D}/segs.txt", "w") as fh:
        fh.write("".join(f"file '{os.path.abspath(sg)}'\n" for sg in segs))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{D}/segs.txt",
                    "-i", f"{D}/mix.wav", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", OUT], check=True)
    for sg in segs:
        os.remove(sg)
    print("done", OUT, f"{END:.1f}s")
    print("chapters:", " ".join(f"{int(s)//60}:{int(s)%60:02d}" for s in scene_start))
