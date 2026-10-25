"""Clayface 5 Batman Easter Eggs — vertical Short (1080x1920): wide strips panned + captions."""
import json, math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

D = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else f"{D}/clayface_easter_eggs_short.mp4"
FPS, OW, OH, SR = 30, 1080, 1920, 44100
rng = np.random.default_rng(5)
FONT = f"{D}/Bangers.ttf"
CREAM, GOLD = (245, 232, 205), (235, 185, 70)

board = Image.open(f"{D}/board.png").convert("RGB")
STRIPS = [(14, 233, 1156, 517), (14, 606, 1156, 812), (14, 840, 1156, 1106),
          (14, 1134, 1156, 1400), (14, 1428, 1156, 1694), (14, 1722, 1156, 1988),
          (14, 2016, 1156, 2279)]
LABELS = ["INTRO", "CLASSIC TITLE", "BLUE SWEATER", "THE SNAKE",
          "FIRST KILL RECREATED", "JASON'S ORIGINAL LOOK", "OUTRO"]
NSEG = 7

VP_W, VP_H = 1000, 770  # panel viewport (inside gold frame)
arts = []
for b in STRIPS:
    c = board.crop(b)
    sc = (VP_H + 96) / c.height
    a = c.resize((round(c.width * sc), VP_H + 96), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 110, 2))
    arts.append(a)
# blurred vertical backdrops per panel
bgs = []
for b in STRIPS:
    c = board.crop(b)
    s = OW / c.width
    c = c.resize((OW, round(c.height * s)), Image.LANCZOS)
    tile = Image.new("RGB", (OW, OH))
    for y in range(0, OH, c.height):
        tile.paste(c, (0, y))
    bg = ImageEnhance.Brightness(tile.filter(ImageFilter.GaussianBlur(34))).enhance(0.3)
    bgs.append(Image.blend(bg, Image.new("RGB", (OW, OH), (60, 10, 10)), 0.3))

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", p]).strip())
script = json.load(open(f"{D}/script.json"))

# per-panel audio: concat its lines with a gap, track word abs-times within the panel
GAP = 0.4
panel_audio = []   # path per panel
panel_len = []
panel_words = []   # list per panel of (word, start_within_panel)
for i, seg in enumerate(script):
    t = 0.0; words = []; parts = []
    for j, (who, text) in enumerate(seg):
        mp3 = f"{D}/vo/lines/{i:02d}_{j:02d}.mp3"
        wj = json.load(open(mp3.replace(".mp3", ".json")))
        toks = text.split()
        if len(toks) == len(wj):
            for w, tok in zip(wj, toks): w["w"] = tok
        for w in wj:
            words.append((w["w"], t + w["t"]))
        parts.append(mp3); t += dur(mp3) + (GAP if j < len(seg) - 1 else 0)
    lst = f"{D}/vo/panel{i:02d}.txt"
    gapf = f"{D}/vo/gap.mp3"
    if not parts[0]:
        pass
    # build concat list with silence between
    import os
    with open(lst, "w") as f:
        for k, p in enumerate(parts):
            f.write("file '%s'\n" % os.path.abspath(p))
            if k < len(parts) - 1:
                f.write("file '%s'\n" % os.path.abspath(gapf))
    panel_audio.append((lst, f"{D}/vo/panel{i:02d}.mp3"))
    panel_len.append(t); panel_words.append(words)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                "-t", str(GAP), f"{D}/vo/gap.mp3"], check=True)
for lst, out in panel_audio:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k", out], check=True)
panel_mp3 = [out for _, out in panel_audio]
vlen = [dur(p) for p in panel_mp3]

LEAD, TAIL = 0.28, 0.45
starts, t = [], 0.0
for L in vlen:
    starts.append(t); t += LEAD + L + TAIL
END = t + 0.6
NF = int(END * FPS)

# caption chunks (<=3 words, break on punctuation)
chunks = []
for i, words in enumerate(panel_words):
    base = starts[i] + LEAD
    cur = []
    seg_chunks = []
    for k, (w, wt) in enumerate(words):
        cur.append((w, base + wt))
        if len(cur) == 3 or w[-1] in ".,!?" or k == len(words) - 1:
            c = [cur[0][1], None, cur]; chunks.append(c); seg_chunks.append(c); cur = []
    for a, b in zip(seg_chunks, seg_chunks[1:]):
        a[1] = b[0]
    seg_chunks[-1][1] = base + words[-1][1] + 0.5

f_title = ImageFont.truetype(FONT, 118)
f_sub = ImageFont.truetype(FONT, 88)
f_label = ImageFont.truetype(FONT, 78)
f_num = ImageFont.truetype(FONT, 150)
banner = Image.open(f"{D}/banner.png")
banner = banner.resize((520, round(banner.height * 520 / banner.width)), Image.LANCZOS)

def ease_out(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3

def panel_frame(i, p):
    a = arts[i]
    max_pan = a.width - VP_W
    if i in (0, 6):          # host panels: linger on the couple, drift only partway
        frac = 0.55 * ease_out(p)
    else:
        frac = ease_out(p)
    x = max_pan * frac if max_pan > 0 else 0
    x = min(max(x, 0), max(0, max_pan))
    vo = 40  # drop top (and bottom) bleed from neighboring strips
    return a.crop((round(x), vo, round(x) + VP_W, vo + VP_H))

def caption(d, tt):
    for s, e, ws in chunks:
        if s <= tt < e:
            texts = [w for w, _ in ws]
            font, gap = ImageFont.truetype(FONT, 100), 24
            widths = [d.textlength(w, font=font) for w in texts]
            total = sum(widths) + gap * (len(texts) - 1)
            if total > 1000:
                font = ImageFont.truetype(FONT, int(100 * 1000 / total))
                widths = [d.textlength(w, font=font) for w in texts]
                total = sum(widths) + gap * (len(texts) - 1)
            x = (OW - total) / 2; y = 1610
            pop = ease_out((tt - s) / 0.12)
            for (w, wt), wd in zip(ws, widths):
                col = (255, 221, 0) if wt <= tt else (255, 255, 255)
                d.text((x, y + (1 - pop) * 16), w, font=font, fill=col, stroke_width=11, stroke_fill=(0, 0, 0))
                x += wd + gap
            return

def frame(tt):
    i = max(k for k, s in enumerate(starts) if tt >= s)
    seg_end = starts[i + 1] if i + 1 < len(starts) else END
    hs = starts[i] + LEAD
    p = min(max((tt - hs) / max(0.1, vlen[i]), 0), 1)
    img = bgs[i].copy().convert("RGBA")
    d = ImageDraw.Draw(img)
    d.text((OW / 2, 130), "CRYSTAL LAKE (2026)", font=f_title, fill=CREAM, anchor="mm", stroke_width=9, stroke_fill=(0, 0, 0))
    d.text((OW / 2, 240), "6 EASTER EGGS YOU MISSED!", font=f_sub, fill=(235, 30, 40), anchor="mm", stroke_width=8, stroke_fill=(0, 0, 0))
    img.alpha_composite(banner, ((OW - banner.width) // 2, 300))
    # panel with gold frame, pops in at each cut
    k = ease_out((tt - starts[i]) / 0.3)
    sc = 1.06 - 0.06 * k
    pf = panel_frame(i, p).convert("RGBA")
    framed = Image.new("RGBA", (VP_W + 20, VP_H + 20), GOLD + (255,))
    framed.paste(pf, (10, 10))
    if sc != 1:
        framed = framed.resize((round(framed.width * sc), round(framed.height * sc)), Image.BICUBIC)
    py = 500
    img.alpha_composite(framed, ((OW - framed.width) // 2, py + (VP_H + 20 - framed.height) // 2))
    d = ImageDraw.Draw(img)
    # big number badge (except intro/outro)
    if 0 < i < 5:
        pass
    d.text((OW / 2, py + VP_H + 20 + 66), LABELS[i], font=f_label, fill=GOLD, anchor="mm", stroke_width=7, stroke_fill=(0, 0, 0))
    caption(d, tt)
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
for p, s in zip(panel_mp3, starts):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    x = np.frombuffer(raw, np.float32); i0 = int((s + LEAD) * SR)
    voice[i0:i0 + len(x)] += x[:n - i0]
voice /= np.abs(voice).max() / 0.85
tt = np.arange(n) / SR
drone = sum(a * np.sin(2 * np.pi * f * tt + ph) for f, a, ph in ((49, .5, 0), (49.3, .3, 1), (73.4, .25, 2), (98, .1, 3)))
drone *= 0.6 + 0.4 * np.sin(2 * np.pi * tt / 6.0)
tick = np.zeros(n, np.float32); tl = int(0.03 * SR)
for ts in np.arange(0.4, END - 1, 0.4):
    i0 = int(ts * SR); tick[i0:i0 + tl] += rng.normal(0, 1, tl) * np.exp(-np.arange(tl) / (0.004 * SR))
env = np.convolve(np.abs(voice), np.ones(4410) / 4410, "same")
duck = np.convolve(1 - 0.5 * np.clip(env / (env.max() * 0.15), 0, 1), np.ones(8820) / 8820, "same")
music = (0.12 * drone + 0.06 * tick) * duck
sfx = np.zeros(n, np.float32)
# "ding" + whoosh on each new number panel (panels 1..5)
wl = int(0.5 * SR)
for i in range(1, 6):
    s = starts[i]
    w = np.convolve(rng.normal(0, 1, wl), np.ones(25) / 25, "same") * np.sin(np.pi * np.linspace(0, 1, wl)) ** 2 * 1.3
    i0 = int((s - 0.25) * SR); sfx[i0:i0 + wl] += w[:n - i0]
    dl = int(0.4 * SR); dt = np.arange(dl) / SR
    ding = (np.sin(2 * np.pi * 1320 * dt) + 0.5 * np.sin(2 * np.pi * 1980 * dt)) * np.exp(-dt * 7) * 0.25
    i1 = int(s * SR); sfx[i1:i1 + dl] += ding[:n - i1]
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
