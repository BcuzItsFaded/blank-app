"""Clayface 60-second YouTube Short (1080x1920): storyboard panels + narration + word-by-word captions."""
import json, math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

D = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else f"{D}/clayface_short.mp4"
FPS, OW, OH, SR = 30, 1080, 1920, 44100
rng = np.random.default_rng(3)
FONT = f"{D}/Bangers.ttf"
CREAM, GOLD = (245, 232, 205), (232, 170, 70)

board = Image.open(f"{D}/board.png").convert("RGB")
PANELS = [(26, 563, 567, 1037), (604, 563, 1145, 1037), (26, 1185, 567, 1659),
          (604, 1185, 1145, 1659), (26, 1806, 567, 2281), (604, 1806, 1145, 2281)]
LABELS = ["MOVIE NIGHT", "THE STAR", "THE EXPERIMENT", "THE BIG TWIST", "ENDING REVEAL", "OUR REACTION"]
# Ken Burns focal points (fraction of panel) for the slow push-in
FOCUS = [(0.45, 0.4), (0.45, 0.3), (0.5, 0.35), (0.7, 0.4), (0.55, 0.4), (0.5, 0.4)]

PW = 1000
arts = [board.crop(b).resize((PW * 2, round(PW * 2 * (b[3] - b[1]) / (b[2] - b[0]))), Image.LANCZOS)
        .filter(ImageFilter.UnsharpMask(3, 110, 2)) for b in PANELS]
PH = round(PW * arts[0].height / arts[0].width)
bgs = []
for b in PANELS:
    c = board.crop(b)
    s = OH / c.height
    c = c.resize((round(c.width * s), OH), Image.LANCZOS)
    c = c.crop(((c.width - OW) // 2, 0, (c.width - OW) // 2 + OW, OH))
    bgs.append(ImageEnhance.Brightness(c.filter(ImageFilter.GaussianBlur(30))).enhance(0.32))

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", p]).strip())
vo = [f"{D}/vo/{i:02d}.mp3" for i in range(6)]
vlen = [dur(p) for p in vo]
words = [json.load(open(f"{D}/vo/{i:02d}.json")) for i in range(6)]
# word timings drop punctuation; take the words from the script so captions break on it
for ws, line in zip(words, open(f"{D}/narration.txt").read().splitlines()):
    toks = line.split()
    if len(toks) == len(ws):
        for w, tok in zip(ws, toks):
            w["w"] = tok

LEAD, TAIL = 0.35, 0.65
starts, t = [], 0.0
for L in vlen:
    starts.append(t); t += LEAD + L + TAIL
END = t + 0.6
NF = int(END * FPS)

# caption chunks: up to 3 words, breaking after punctuation
chunks = []  # (start, end, [(word, wstart)])
for i, ws in enumerate(words):
    base = starts[i] + LEAD
    cur = []
    for k, w in enumerate(ws):
        cur.append((w["w"], base + w["t"]))
        if len(cur) == 3 or w["w"][-1] in ".,!?" or k == len(ws) - 1:
            chunks.append([cur[0][1], None, cur]); cur = []
    last = base + ws[-1]["t"] + ws[-1]["d"] + 0.25
    seg_chunks = [c for c in chunks if c[1] is None]
    for a, b in zip(seg_chunks, seg_chunks[1:]):
        a[1] = b[0]
    seg_chunks[-1][1] = last

f_title = ImageFont.truetype(FONT, 150)
f_sub = ImageFont.truetype(FONT, 62)
f_label = ImageFont.truetype(FONT, 84)
f_cap = ImageFont.truetype(FONT, 104)
banner = Image.open(f"{D}/banner.png")
banner = banner.resize((560, round(banner.height * 560 / banner.width)), Image.LANCZOS)

def ease_out(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3

def panel_frame(i, p):
    a = arts[i]
    z = 1.0 + 0.10 * (0.5 - 0.5 * math.cos(math.pi * p))
    fx, fy = FOCUS[i]
    w, h = a.width / z, a.height / z
    l = (a.width - w) * fx; tp = (a.height - h) * fy
    return a.transform((PW, PH), Image.EXTENT, (l, tp, l + w, tp + h), Image.BICUBIC)

def caption(d, tt):
    for s, e, ws in chunks:
        if s <= tt < e:
            texts = [w for w, _ in ws]
            font, gap = f_cap, 26
            widths = [d.textlength(w, font=font) for w in texts]
            total = sum(widths) + gap * (len(texts) - 1)
            if total > 1010:  # shrink long chunks so they stay on screen
                font = ImageFont.truetype(FONT, int(104 * 1010 / total))
                widths = [d.textlength(w, font=font) for w in texts]
                total = sum(widths) + gap * (len(texts) - 1)
            x = (OW - total) / 2
            y = 1560
            pop = ease_out((tt - s) / 0.12)
            for (w, ws_t), wd in zip(ws, widths):
                col = (255, 221, 0) if ws_t <= tt else (255, 255, 255)
                d.text((x, y + (1 - pop) * 18), w, font=font, fill=col, stroke_width=11, stroke_fill=(0, 0, 0))
                x += wd + gap
            return

def frame(tt):
    i = max(k for k, s in enumerate(starts) if tt >= s)
    seg_end = starts[i + 1] if i + 1 < len(starts) else END
    p = (tt - starts[i]) / (seg_end - starts[i])
    img = bgs[i].copy().convert("RGBA")
    d = ImageDraw.Draw(img)
    # header
    d.text((OW / 2, 150), "CLAYFACE (2026)", font=f_title, fill=CREAM, anchor="mm", stroke_width=10, stroke_fill=(0, 0, 0))
    d.text((OW / 2, 255), "60-SECOND MOVIE BREAKDOWN", font=f_sub, fill=GOLD, anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
    img.alpha_composite(banner, ((OW - banner.width) // 2, 300))
    # panel with gold frame; pops in at each cut
    k = ease_out((tt - starts[i]) / 0.3)
    sc = 1.08 - 0.08 * k
    pf = panel_frame(i, p).convert("RGBA")
    framed = Image.new("RGBA", (PW + 20, PH + 20), GOLD + (255,))
    framed.paste(pf, (10, 10))
    if sc != 1:
        framed = framed.resize((round(framed.width * sc), round(framed.height * sc)), Image.BICUBIC)
    py = 490
    img.alpha_composite(framed, ((OW - framed.width) // 2, py + (PH + 20 - framed.height) // 2))
    # scene label
    d = ImageDraw.Draw(img)
    d.text((OW / 2, py + PH + 20 + 70), LABELS[i], font=f_label, fill=GOLD, anchor="mm", stroke_width=8, stroke_fill=(0, 0, 0))
    caption(d, tt)
    # progress bar
    d.rectangle((0, 0, OW * tt / END, 12), fill=GOLD)
    a = np.asarray(img.convert("RGB"))
    fl = 1 - (tt - starts[i]) / 0.18
    if fl > 0 and i > 0:
        a = np.clip(a.astype(np.int16) + int(170 * fl), 0, 255).astype(np.uint8)
    if tt > END - 0.6:
        a = (a * max(0, (END - tt) / 0.6)).astype(np.uint8)
    if tt < 0.25:
        a = (a * (tt / 0.25)).astype(np.uint8)
    return a

# ---------- audio ----------
n = int((END + 0.3) * SR)
voice = np.zeros(n, np.float32)
for p, s in zip(vo, starts):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    x = np.frombuffer(raw, np.float32); i0 = int((s + LEAD) * SR)
    voice[i0:i0 + len(x)] += x[:n - i0]
voice /= np.abs(voice).max() / 0.85
tt = np.arange(n) / SR
drone = sum(a * np.sin(2 * np.pi * f * tt + ph) for f, a, ph in
            ((49, .5, 0), (49.3, .3, 1), (73.4, .25, 2), (116.5, .1, 3)))
drone *= 0.6 + 0.4 * np.sin(2 * np.pi * tt / 7.0)
tick = np.zeros(n, np.float32); tl = int(0.03 * SR)
for ts in np.arange(0.5, END - 1, 0.5):
    i0 = int(ts * SR); tick[i0:i0 + tl] += rng.normal(0, 1, tl) * np.exp(-np.arange(tl) / (0.004 * SR))
env = np.convolve(np.abs(voice), np.ones(4410) / 4410, "same")
duck = np.convolve(1 - 0.5 * np.clip(env / (env.max() * 0.15), 0, 1), np.ones(8820) / 8820, "same")
music = (0.12 * drone + 0.05 * tick) * duck
sfx = np.zeros(n, np.float32)
wl = int(0.6 * SR)
for s in starts[1:]:
    w = np.convolve(rng.normal(0, 1, wl), np.ones(25) / 25, "same") * np.sin(np.pi * np.linspace(0, 1, wl)) ** 2 * 1.4
    i0 = int((s - 0.3) * SR); sfx[i0:i0 + wl] += w[:n - i0]
def boom(at, amp=.7):
    bl = int(1.8 * SR); bt = np.arange(bl) / SR
    b = np.sin(2 * np.pi * (65 * bt - 9 * bt ** 2)) * np.exp(-bt * 2.4) * amp
    i0 = int(at * SR); sfx[i0:i0 + bl] += b[:n - i0]
boom(starts[3]); boom(starts[4])
for w in words[4]:  # bass hit on "survives!"
    if w["w"].lower().startswith("survives"):
        boom(starts[4] + LEAD + w["t"], .8)
boom(starts[5] + LEAD, .5)
mix = voice + music + sfx
mix /= np.abs(mix).max() / 0.92
with wave.open(f"{D}/mix.wav", "wb") as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((np.stack([mix, mix], 1) * 32767).astype(np.int16).tobytes())

ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                       "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-", "-i", f"{D}/mix.wav",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                       "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", OUT],
                      stdin=subprocess.PIPE)
for f in range(NF):
    ff.stdin.write(np.ascontiguousarray(frame(f / FPS)).tobytes())
ff.stdin.close(); ff.wait()
print("done", OUT, f"{END:.1f}s")
