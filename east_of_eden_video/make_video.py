"""RG - East of Eden (Netflix, 2026) spoiler-free breakdown, fully animated.

Original animation drawn in code to match the show's look: a painterly Salinas
Valley with parallax hills, swaying wheat, drifting clouds, birds, an apple
tree, film grain and letterboxing; serif titles; a plucked-guitar score; and a
Kokoro TTS narrator. No footage, stills or art from the series are used.

  python3 make_video.py            # YouTube video + Short (needs kokoro-onnx + model files in ./kokoro,
                                   # from github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)
  python3 make_video.py --preview  # one still per scene into output/preview/
"""
import math, os, random, re, subprocess, sys, wave
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
TMP = os.path.join(OUT, "_build")
KOKORO_DIR = os.environ.get("KOKORO_DIR", os.path.join(HERE, "kokoro"))
FPS, SR = 30, 44100
F_PLAY = os.path.join(HERE, "fonts", "PlayfairDisplay[wght].ttf")
F_CORM = os.path.join(HERE, "fonts", "CormorantGaramond[wght].ttf")
F_SANS = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"

GOLD, CREAM, EMBER = (232, 184, 92), (246, 236, 214), (214, 112, 52)
SAGE, DUSK, INK = (150, 170, 120), (120, 86, 140), (20, 16, 14)
APPLE = (196, 44, 40)

VOICE, VOICE_SPEED, VO_START = "am_michael", 0.95, 0.5
PAUSE = {".": .34, "?": .42, "!": .34, ":": .22}
PHONEMES = {"Ciarán Hinds": "kˈiəɹɔːn hˈaɪndz", "Faist": "fˈaɪst", "Florence Pugh": "flˈɔːɹəns pjˈuː", "Pugh": "pjˈuː",
            "Elia Kazan": "ˈiːliə kəzˈæn", "Zoe Kazan": "zˈoʊi kəzˈæn", "Kazan": "kəzˈæn", "Tomatometer": "təmˈeɪɾoʊmˌiːɾɚ",
            "Salinas": "səlˈiːnəs"}

# (kicker, headline, bullets, accent, seconds, visual, mood, voiceover)
LONG = [
    ("RG BREAKDOWN", "East of Eden", ["Netflix limited series", "Critics ~87%  |  Fans ~85%", "No spoilers"], GOLD, 10, "title", "golden",
     "Netflix's East of Eden is here, and for once, critics and fans actually agree. Eighty-seven percent from critics. Eighty-five from audiences. Let's break it down, no spoilers."),
    ("THE BASICS", "What Is It?", ["7 episodes, all out Oct 1, 2026", "Steinbeck's 1952 novel", "Adapted by Zoe Kazan"], GOLD, 12, "book", "golden",
     "It's a seven-episode limited series, and every episode dropped October first, twenty twenty-six. It's based on John Steinbeck's 1952 novel, adapted by Zoe Kazan. Fun fact: her grandfather, Elia Kazan, directed the 1955 movie with James Dean."),
    ("THE CAST", "The Trasks & Co.", ["Florence Pugh - Cathy Ames", "Christopher Abbott - Adam Trask", "Mike Faist - Charles Trask", "Hoon Lee - Lee"], EMBER, 11, "portraits_a", "golden",
     "Florence Pugh leads as Cathy Ames. Christopher Abbott plays Adam Trask, Mike Faist is his brother Charles, and Hoon Lee plays Lee."),
    ("THE CAST", "The Next Generation", ["Ciaran Hinds - Samuel Hamilton", "Martha Plimpton & Tracy Letts", "Joseph Zada - Cal", "Joe Anders - Aron"], EMBER, 11, "brothers", "dusk",
     "Ciarán Hinds is Samuel Hamilton, with Martha Plimpton and Tracy Letts. And Joseph Zada and Joe Anders play the brothers, Cal and Aron."),
    ("THE CRITICS", "Tomatometer", ["Pugh: 'terrifying', 'captivating'", "Hoon Lee: the heart of the show", "Rich, nuanced adaptation"], GOLD, 12, "laurel", "golden",
     "Critics are loving it. The Tomatometer sits in the high eighties, and the biggest praise goes to Florence Pugh, who reviewers call terrifying and captivating, and to Hoon Lee, who many call the heart of the show."),
    ("THE CATCH", "Not Perfect", ["Adam & Charles underdeveloped", "Parts feel rushed", "Can't fit the whole novel"], DUSK, 11, "storm", "storm",
     "But it's not perfect. Some critics say Adam and Charles feel underdeveloped, parts of it feel rushed, and seven episodes can't hold the whole novel."),
    ("THE FANS", "Popcornmeter", ["Audiences agree: ~85%", "Shot in New Zealand", "Sweeping, gorgeous look"], SAGE, 10, "stars", "golden",
     "Audiences agree, with a Popcornmeter in the mid eighties. And it looks gorgeous. It was filmed across New Zealand, standing in for California's Salinas Valley."),
    ("THE NUMBERS", "A Global Hit", ["#1 English TV show, week one", "6.5M views in 4 days", "Top 10 in 86 countries"], GOLD, 12, "globe", "dusk",
     "It's a hit, too. It debuted at number one on Netflix's English TV chart, with six and a half million views in just four days, and it reached the top ten in eighty-six countries. It's even sending people back to buy the book."),
    ("1955 vs 2026", "Not the Movie", ["1955 film: ~86% on RT", "Film covers the last part", "Series goes much bigger"], EMBER, 11, "reel", "golden",
     "If you've seen the 1955 movie, this is different. That film, which sits at eighty-six percent, only adapts the last part of the novel. The series goes much bigger."),
    ("THE BIG IDEA", "Timshel", ["One word from the book", "'Thou mayest'", "We choose who we become"], GOLD, 11, "timshel", "dusk",
     "And without spoilers, the big theme comes down to one word from the book: timshel. Thou mayest. The idea that we choose who we become."),
    ("RG VERDICT", "Watch It?", ["Love slow-burn drama? YES.", "Need nonstop pace? Maybe not.", "No need to read the book first"], GOLD, 12, "seal", "golden",
     "My verdict: if you love slow-burn period drama and huge performances, watch it this weekend. If you need nonstop pace, it might feel slow. And you don't need to read the book first."),
    ("YOUR TURN", "Your Score?", ["Comment your rating", "Like + Subscribe"], EMBER, 9, "outro", "night",
     "Have you watched it? Tell me your score in the comments, and subscribe to RG for more breakdowns."),
]

SHORT = [
    ("RG", "East of Eden", ["Critics ~87%", "Fans ~85%"], GOLD, 6, "title", "golden",
     "Netflix's East of Eden: critics give it eighty-seven percent. Fans give it eighty-five."),
    ("THE STAR", "Florence Pugh", ["'Terrifying' - in the best way"], EMBER, 5, "portrait_pugh", "golden",
     "Florence Pugh is getting called terrifying, in the best way."),
    ("THE HEART", "Hoon Lee", ["The show's secret weapon"], SAGE, 5, "portrait_lee", "golden",
     "And Hoon Lee is being called the heart of the show."),
    ("THE NUMBERS", "Global Hit", ["#1 on Netflix, week one", "Top 10 in 86 countries"], GOLD, 6, "globe", "dusk",
     "It hit number one on Netflix in week one, and the top ten in eighty-six countries."),
    ("THE BINGE", "7 Episodes", ["One perfect weekend", "No book required"], GOLD, 5, "book", "golden",
     "Seven episodes. One perfect weekend binge. No book required."),
    ("RG", "Watched It?", ["Comment your score"], EMBER, 5, "outro", "night",
     "Have you watched it? Comment your score, and follow RG."),
]

# ---------------------------------------------------------------- helpers
clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
lerp = lambda a, b, t: a + (b - a) * t
eo = lambda x: 1 - (1 - clamp(x)) ** 3
eio = lambda x: (lambda u: 4 * u ** 3 if u < .5 else 1 - (-2 * u + 2) ** 3 / 2)(clamp(x))


def eback(x):
    x = clamp(x); c = 1.6
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


@lru_cache(None)
def font(path, size, weight=None):
    f = ImageFont.truetype(path, max(8, int(size)))
    if weight:
        f.set_variation_by_name(weight)
    return f


@lru_cache(None)
def text_sprite(text, path, size, fill, weight=None, shadow=0, tracking=0):
    f = font(path, size, weight)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    if tracking:
        widths = [tmp.textlength(c, font=f) for c in text]
        tw = sum(widths) + tracking * (len(text) - 1)
        l, t, r, b = tmp.textbbox((0, 0), text, font=f); r = l + tw
    else:
        l, t, r, b = tmp.multiline_textbbox((0, 0), text, font=f)
    pad = int(size * .3) + shadow * 3
    im = Image.new("RGBA", (int(r - l + 2 * pad), int(b - t + 2 * pad)), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        _draw_text(ImageDraw.Draw(sh), pad - l, pad - t + shadow, text, f, (0, 0, 0, 200), tracking)
        im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(shadow)))
    _draw_text(ImageDraw.Draw(im), pad - l, pad - t, text, f, fill, tracking)
    return im


def _draw_text(d, x, y, text, f, fill, tracking):
    if not tracking:
        d.multiline_text((x, y), text, font=f, fill=fill)
        return
    for c in text:
        d.text((x, y), c, font=f, fill=fill)
        x += d.textlength(c, font=f) + tracking


def put(base, spr, x, y, anchor="lt", alpha=1.0, scale=1.0, angle=0):
    if alpha <= 0.01:
        return
    if scale != 1.0:
        spr = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.BILINEAR)
    if angle:
        spr = spr.rotate(angle, resample=Image.BILINEAR, expand=True)
    if alpha < 1:
        spr = spr.copy(); spr.putalpha(spr.getchannel("A").point(lambda v: int(v * alpha)))
    w, h = spr.size
    x -= {"l": 0, "m": w / 2, "r": w}[anchor[0]]
    y -= {"t": 0, "m": h / 2, "b": h}[anchor[1]]
    x, y = int(x), int(y)
    cx0, cy0 = max(0, -x), max(0, -y)
    cx1, cy1 = min(w, base.width - x), min(h, base.height - y)
    if cx1 <= cx0 or cy1 <= cy0:
        return
    if (cx0, cy0, cx1, cy1) != (0, 0, w, h):
        spr = spr.crop((cx0, cy0, cx1, cy1))
    base.paste(spr, (x + cx0, y + cy0), spr)


@lru_cache(None)
def glow(color, size):
    size = max(8, int(size) // 8 * 8)
    yy, xx = np.mgrid[-1:1:size * 1j, -1:1:size * 1j]
    a = np.clip(1 - np.sqrt(xx ** 2 + yy ** 2), 0, 1) ** 2 * 255
    arr = np.zeros((size, size, 4), np.uint8)
    arr[..., :3] = color; arr[..., 3] = a.astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def fit_size(text, path, size, max_w, weight=None):
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    while size > 24 and max(tmp.textlength(l, font=font(path, size, weight)) for l in text.split("\n")) > max_w:
        size -= 3
    return size


def ridge(n, seed, octaves=5, rough=.5):
    rnd = np.random.default_rng(seed)
    x = np.linspace(0, 1, n)
    y = np.zeros(n)
    amp, freq = 1.0, 2.0
    for _ in range(octaves):
        ph = rnd.uniform(0, 2 * np.pi, 3)
        y += amp * (np.sin(2 * np.pi * freq * x + ph[0]) * .6 + np.sin(2 * np.pi * freq * 1.7 * x + ph[1]) * .4)
        amp *= rough; freq *= 2.1
    return (y - y.min()) / (y.max() - y.min() + 1e-9)


# ---------------------------------------------------------------- landscape
MOODS = {  # sky top, sky horizon, sun, far hills, mid hills, field, foreground
    "golden": ((52, 64, 108), (250, 196, 120), (255, 226, 160), (150, 118, 140), (112, 92, 78), (196, 150, 76), (56, 42, 30)),
    "dusk": ((28, 30, 70), (226, 128, 96), (255, 190, 140), (98, 72, 108), (70, 54, 66), (150, 104, 66), (34, 24, 26)),
    "storm": ((34, 38, 48), (110, 112, 118), (190, 190, 190), (70, 74, 84), (56, 58, 60), (110, 100, 70), (26, 26, 26)),
    "night": ((8, 10, 28), (54, 50, 96), (230, 230, 250), (40, 40, 70), (28, 28, 44), (52, 46, 46), (12, 10, 14)),
}


def make_layers(L, mood, seed):
    """Sky (with sun) as RGB; hills as RGBA strips wider than the frame for parallax panning."""
    W, H = L["W"], L["H"]
    sky_top, sky_hor, sun, far, mid, field, fg = MOODS[mood]
    hz = L["horizon"]
    y = np.linspace(0, 1, H)[:, None, None]
    k = np.clip(y / (hz / H), 0, 1) ** 1.6
    sky = np.array(sky_top)[None, None] * (1 - k) + np.array(sky_hor)[None, None] * k
    sky = np.repeat(sky, W, axis=1).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    sx, sy = W * (.72 if not L["portrait"] else .62), hz - H * .05
    d = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2) / max(W, H)
    sky += (np.clip(1 - d * 2.5, 0, 1) ** 3 * 120)[..., None] * (np.array(sun) / 255)[None, None]
    if mood != "storm":
        disc = (d < .028 * (1 if mood != "night" else .8)).astype(np.float32)
        sky = sky * (1 - disc[..., None]) + np.array(sun)[None, None] * disc[..., None]
    if mood == "night":  # stars
        rnd = np.random.default_rng(seed)
        for _ in range(260):
            px, py = rnd.integers(0, W), rnd.integers(0, int(hz))
            sky[py, px] = 230
    sky_img = Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8), "RGB")
    layers = []
    for i, (col, base_y, amp, speed) in enumerate(((far, hz - H * .1, H * .12, 6), (mid, hz - H * .02, H * .07, 14),
                                                     (field, hz + H * .06, H * .05, 26), (fg, hz + H * .2, H * .06, 44))):
        LW = W + 600
        r = ridge(LW, seed + i * 7, rough=.45 if i == 0 else .35)
        top = (base_y - r * amp).astype(int)
        arr = np.zeros((H, LW, 4), np.uint8)
        rows = np.arange(H)[:, None]
        mask = rows >= top[None, :]
        shade = np.clip((rows - top[None, :]) / (H * .25), 0, 1)  # darker with depth
        for c in range(3):
            haze = col[c] * (1 - .25 * shade) + sky_hor[c] * (.25 if i == 0 else .08) * (1 - shade)
            arr[..., c] = np.where(mask, np.clip(haze, 0, 255), 0).astype(np.uint8)
        arr[..., 3] = np.where(mask, 255, 0)
        layers.append((Image.fromarray(arr, "RGBA"), speed, top))
    return sky_img, layers


@lru_cache(None)
def cloud_sprite(w, h, seed, tint):
    rnd = random.Random(seed)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for _ in range(14):
        cw, ch = rnd.uniform(.25, .5) * w, rnd.uniform(.35, .7) * h
        cx, cy = rnd.uniform(.2, .8) * w, rnd.uniform(.45, .65) * h
        d.ellipse([cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2], fill=tint + (150,))
    return im.filter(ImageFilter.GaussianBlur(h / 7))


@lru_cache(None)
def overlays(W, H, letterbox):
    """8 film-grain + vignette overlays (and letterbox bars) to cycle through."""
    yy, xx = np.mgrid[0:H, 0:W]
    v = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
    vig = np.clip((v - .35) * 1.6, 0, 1) ** 1.5 * 210
    out = []
    rnd = np.random.default_rng(3)
    for _ in range(8):
        g = rnd.normal(0, 1, (H // 2, W // 2))
        g = np.kron(g, np.ones((2, 2)))[:H, :W]
        arr = np.zeros((H, W, 4), np.uint8)
        lum = (g > 0) * 255
        arr[..., 0] = arr[..., 1] = arr[..., 2] = lum.astype(np.uint8)
        alpha = np.abs(g) * 9
        arr[..., 3] = np.clip(alpha, 0, 40).astype(np.uint8)
        darkn = vig > alpha
        arr[darkn, :3] = 0
        arr[..., 3] = np.maximum(arr[..., 3], vig.astype(np.uint8))
        if letterbox:
            arr[:letterbox, :] = (0, 0, 0, 255); arr[H - letterbox:, :] = (0, 0, 0, 255)
        out.append(Image.fromarray(arr, "RGBA"))
    return out


def apple_tree(d, x, y, sc, t, col=(28, 22, 18), apples=True, sway_amt=1.0):
    sway = math.sin(t * 1.1) * 3 * sc * sway_amt
    d.polygon([(x - 14 * sc, y), (x + 14 * sc, y), (x + 8 * sc + sway * .3, y - 130 * sc), (x - 8 * sc + sway * .3, y - 130 * sc)], fill=col)
    for bx, by, ang in ((-1, -110, -.9), (1, -120, .8), (-.4, -150, -.3), (.5, -160, .4)):
        ex, ey = x + bx * 90 * sc + sway, y + (by - 50) * sc
        d.line([(x + sway * .3, y + by * sc), (ex, ey)], fill=col, width=int(10 * sc))
    rnd = random.Random(4)
    for i in range(26):  # canopy
        cx = x + rnd.uniform(-150, 150) * sc + sway * 1.4
        cy = y - rnd.uniform(150, 270) * sc
        r = rnd.uniform(40, 70) * sc
        d.ellipse([cx - r, cy - r * .85, cx + r, cy + r * .85], fill=col)
    if apples:
        rnd = random.Random(9)
        for i in range(12):
            cx = x + rnd.uniform(-130, 130) * sc + sway * 1.4
            cy = y - rnd.uniform(160, 260) * sc
            r = 9 * sc
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=APPLE)


def wheat(d, L, t, top_fn, col, n=140, seed=1):
    W, H, s = L["W"], L["H"], L["s"]
    rnd = random.Random(seed)
    for i in range(n):
        x = rnd.uniform(-20, W + 20)
        base = H + 10
        hgt = rnd.uniform(.07, .16) * H
        sway = math.sin(t * 1.6 + x * .01) * 18 * s + math.sin(t * 3.1 + i) * 4 * s
        tip = (x + sway, base - hgt)
        d.line([(x, base), tip], fill=col, width=int(3 * s))
        d.ellipse([tip[0] - 5 * s, tip[1] - 14 * s, tip[0] + 5 * s, tip[1] + 6 * s], fill=col)


def birds(d, L, t, seed=2, n=6, col=(30, 24, 22)):
    W, H, s = L["W"], L["H"], L["s"]
    rnd = random.Random(seed)
    for i in range(n):
        sp = rnd.uniform(40, 80) * s
        x = (rnd.uniform(0, W) + t * sp) % (W + 200) - 100
        y = L["horizon"] * rnd.uniform(.25, .65) + math.sin(t * .8 + i) * 12 * s
        flap = math.sin(t * 7 + i * 1.7) * 8 * s
        w = rnd.uniform(12, 20) * s
        d.line([(x - w, y - flap), (x, y), (x + w, y - flap)], fill=col, width=int(3 * s), joint="curve")


def landscape(L, t, scene_bg, mood):
    sky, layers, clouds, embers = scene_bg
    W, H, s = L["W"], L["H"], L["s"]
    img = sky.copy()
    d = ImageDraw.Draw(img, "RGBA")
    for (cx, cy, cw, ch, sp, seed) in clouds:
        tint = (255, 230, 200) if mood == "golden" else (230, 190, 200) if mood == "dusk" else (150, 150, 160) if mood == "storm" else (60, 60, 90)
        x = (cx + t * sp) % (W + cw) - cw
        put(img, cloud_sprite(int(cw), int(ch), seed, tint), x, cy, "lt", .9)
    birds(d, L, t, col=(30, 24, 22) if mood != "night" else (10, 10, 20))
    for idx, (lay, speed, top) in enumerate(layers):
        off = int((t * speed * s) % 600)
        img.paste(lay.crop((off, 0, off + W, H)), (0, 0), lay.crop((off, 0, off + W, H)))
        if idx == 1 and L.get("tree"):
            tx = L["tree"]
            ty = top[min(len(top) - 1, int(tx + off))] + 8 * s
            apple_tree(d, tx, ty, L["s"] * (1.1 if not L["portrait"] else 1.2), t, col=(36, 28, 24) if mood != "night" else (14, 12, 16))
    wheat(d, L, t, None, (90, 66, 36, 255) if mood in ("golden", "dusk") else (40, 36, 30, 255))
    for (x0, y0, sp, r, ph) in embers:  # dust motes in the light
        y = (y0 - t * sp) % H
        x = x0 + math.sin(t * .7 + ph) * 30 * s
        a = int(90 + 80 * math.sin(t * 2 + ph))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 230, 180, max(0, a)))
    return img, d


# ---------------------------------------------------------------- visuals
def v_title(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    put(img, glow(GOLD, 700 * sc), cx, cy, "mm", .35 + .1 * math.sin(t * 1.5))
    word = "EAST OF EDEN"
    k = clamp((t - .4) / 1.6)
    shown = word[: int(len(word) * k + .999)]
    maxw = (L["W"] - 120 * L["s"]) if L["portrait"] else .5 * L["W"]
    size = int(96 * sc)
    while size > 30 and text_sprite(word, F_PLAY, size, CREAM + (255,), "Bold", 6, int(size * .14)).width > maxw:
        size -= 4
    spr = text_sprite(word, F_PLAY, size, CREAM + (255,), "Bold", 6, int(size * .14))
    if shown:
        part = text_sprite(shown, F_PLAY, size, CREAM + (255,), "Bold", 6, int(size * .14))
        put(img, part, cx - spr.width / 2, cy, "lm", eo((t - .4) / .6))
    rule = 260 * sc * eo((t - 1.6) / .8)
    d.line([(cx - rule, cy + 70 * sc), (cx + rule, cy + 70 * sc)], fill=GOLD + (230,), width=int(3 * sc))
    put(img, text_sprite("A NETFLIX LIMITED SERIES", F_CORM, int(36 * sc), GOLD + (255,), "Bold", 5, int(6 * sc)), cx, cy + 110 * sc, "mm", eo((t - 1.9) / .6))
    put(img, text_sprite("based on the novel by John Steinbeck", F_CORM, int(32 * sc), CREAM + (240,), "SemiBold", 5), cx, cy + 155 * sc, "mm", eo((t - 2.4) / .6))


def e_title(dur):
    return [(.4, "swell"), (1.6, "chime")]


def v_book(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    w, h = 300 * sc, 380 * sc
    put(img, glow((255, 220, 160), 900 * sc), cx, cy, "mm", .5)
    d.polygon([(cx - w - 14 * sc, cy - h / 2 + 10 * sc), (cx + w + 14 * sc, cy - h / 2 + 10 * sc), (cx + w + 14 * sc, cy + h / 2 + 18 * sc), (cx - w - 14 * sc, cy + h / 2 + 18 * sc)], fill=(70, 34, 24, 255))
    for side in (-1, 1):  # open pages
        x0, x1 = cx, cx + side * w
        d.polygon([(x0, cy - h / 2), (x1, cy - h / 2 + 8 * sc), (x1, cy + h / 2 + 8 * sc), (x0, cy + h / 2)], fill=(238, 226, 198, 255))
        for i in range(12):
            yy = cy - h / 2 + 50 * sc + i * 26 * sc
            a, b = (x0 + side * 30 * sc, x1 - side * 30 * sc)
            ln = abs(b - a) * (.6 + .4 * ((i * 37) % 10) / 10)
            d.line([(min(a, a + side * ln), yy), (max(a, a + side * ln), yy)], fill=(120, 100, 80, 160), width=int(4 * sc))
    page = (t * .55) % 1  # page flipping right to left
    ang = eio(page) * math.pi
    px = cx + math.cos(ang) * w
    lift = math.sin(ang) * 40 * sc
    shade = int(230 - 40 * math.sin(ang))
    d.polygon([(cx, cy - h / 2), (px, cy - h / 2 - lift + 8 * sc), (px, cy + h / 2 - lift + 8 * sc), (cx, cy + h / 2)], fill=(shade, shade - 12, shade - 36, 255))
    d.line([(cx, cy - h / 2), (cx, cy + h / 2)], fill=(90, 70, 50, 255), width=int(4 * sc))
    put(img, text_sprite("1952", F_PLAY, int(80 * sc), GOLD + (255,), "Black", 5), cx, cy - h / 2 - 70 * sc, "mm", eo((t - .6) / .5))
    if L.get("short_book"):
        put(img, text_sprite("7 EPISODES", F_PLAY, int(56 * sc), CREAM + (255,), "Bold", 5), cx, cy + h / 2 + 80 * sc, "mm", eo((t - .9) / .5))


def e_book(dur):
    return [(.6, "chime")] + [(1.0 + i / .55, "page") for i in range(int(dur * .55)) if 1.0 + i / .55 < dur - .5]


def silhouette(d, x, y, sc, kind, col, t=0.0):
    """Period bust silhouettes. kind: 'woman', 'man_hat', 'man', 'elder'."""
    sway = math.sin(t * 1.2) * 2 * sc
    d.ellipse([x - 120 * sc, y + 40 * sc, x + 120 * sc, y + 260 * sc], fill=col)  # shoulders
    d.rectangle([x - 26 * sc, y - 10 * sc, x + 26 * sc, y + 70 * sc], fill=col)  # neck
    d.ellipse([x - 52 * sc + sway, y - 120 * sc, x + 52 * sc + sway, y + 10 * sc], fill=col)  # head
    if kind == "woman":
        d.ellipse([x - 70 * sc + sway, y - 150 * sc, x + 40 * sc + sway, y - 60 * sc], fill=col)  # swept hair
        d.ellipse([x + 20 * sc + sway, y - 150 * sc, x + 80 * sc + sway, y - 100 * sc], fill=col)  # bun
    elif kind == "man_hat":
        d.ellipse([x - 95 * sc + sway, y - 112 * sc, x + 95 * sc + sway, y - 84 * sc], fill=col)
        d.rounded_rectangle([x - 52 * sc + sway, y - 170 * sc, x + 52 * sc + sway, y - 95 * sc], radius=int(18 * sc), fill=col)
    elif kind == "elder":
        d.polygon([(x - 40 * sc + sway, y - 20 * sc), (x + 40 * sc + sway, y - 20 * sc), (x + sway, y + 60 * sc)], fill=col)  # beard
    d.polygon([(x - 18 * sc, y + 60 * sc), (x, y + 120 * sc), (x + 18 * sc, y + 60 * sc)], fill=(col[0] + 40, col[1] + 34, col[2] + 30, 255))  # collar


def portrait(img, d, x, y, sc, kind, name, t, t0):
    k = eback((t - t0) / .6)
    if t < t0:
        return
    swing = math.sin((t - t0) * 2.2) * math.exp(-(t - t0) * .6) * 6 + math.sin(t * .9) * 1
    w, h = 210 * sc, 270 * sc
    fr = Image.new("RGBA", (int(w + 40 * sc), int(h + 110 * sc)), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fr)
    ox, oy = 20 * sc, 10 * sc
    fd.ellipse([ox, oy, ox + w, oy + h], fill=(120, 86, 40), outline=GOLD, width=int(10 * sc))
    fd.ellipse([ox + 16 * sc, oy + 16 * sc, ox + w - 16 * sc, oy + h - 16 * sc], fill=(214, 186, 140))
    inner = Image.new("RGBA", fr.size, (0, 0, 0, 0))
    silhouette(ImageDraw.Draw(inner), ox + w / 2, oy + h * .52, sc * .62, kind, (40, 28, 22, 255), t)
    mask = Image.new("L", fr.size, 0)
    ImageDraw.Draw(mask).ellipse([ox + 16 * sc, oy + 16 * sc, ox + w - 16 * sc, oy + h - 16 * sc], fill=255)
    fr.paste(inner, (0, 0), Image.composite(inner.getchannel("A"), Image.new("L", fr.size, 0), mask))
    fd.rounded_rectangle([ox + 10 * sc, oy + h + 18 * sc, ox + w - 10 * sc, oy + h + 78 * sc], radius=int(8 * sc), fill=(60, 40, 22), outline=GOLD, width=int(3 * sc))
    nf = font(F_CORM, int(28 * sc), "Bold")
    fd.text((ox + w / 2, oy + h + 48 * sc), name, font=nf, fill=CREAM, anchor="mm")
    d.line([(x, y - h / 2 - 50 * sc), (x - 50 * sc, y - h / 2 + 10 * sc)], fill=(60, 50, 40, 200), width=int(3 * sc))
    d.line([(x, y - h / 2 - 50 * sc), (x + 50 * sc, y - h / 2 + 10 * sc)], fill=(60, 50, 40, 200), width=int(3 * sc))
    d.ellipse([x - 7 * sc, y - h / 2 - 57 * sc, x + 7 * sc, y - h / 2 - 43 * sc], fill=GOLD)
    put(img, fr, x, y + 30 * sc, "mm", clamp((t - t0) / .3), max(.01, k), angle=swing)


def v_portraits_a(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"] * .78
    for i, (kind, name) in enumerate((("woman", "CATHY"), ("man", "ADAM"), ("man_hat", "CHARLES"), ("man", "LEE"))):
        col = i % 2; row = i // 2
        x = cx + (col - .5) * 290 * sc
        y = cy - 150 * sc + row * 400 * sc
        portrait(img, d, x, y, sc, kind, name, t, .5 + i * .45)


def e_portraits(dur):
    return [(.5 + i * .45, "tick") for i in range(4)]


def one_portrait(kind, name):
    def draw(img, d, t, L):
        portrait(img, d, L["vx"], L["vy"] - 40 * L["vs"], L["vs"] * 1.15, kind, name, t, .4)
    return draw


def figure(d, x, y, sc, col, t, hat=True, phase=0.0):
    """Full-length standing figure in a long coat, coat tail moving in the wind."""
    wind = math.sin(t * 1.8 + phase) * 8 * sc
    d.polygon([(x - 28 * sc, y - 200 * sc), (x + 28 * sc, y - 200 * sc), (x + 46 * sc + wind, y - 30 * sc), (x - 40 * sc + wind * .6, y - 30 * sc)], fill=col)
    d.rectangle([x - 22 * sc, y - 40 * sc, x - 6 * sc, y], fill=col)
    d.rectangle([x + 6 * sc, y - 40 * sc, x + 22 * sc, y], fill=col)
    d.ellipse([x - 22 * sc, y - 250 * sc, x + 22 * sc, y - 200 * sc], fill=col)
    if hat:
        d.ellipse([x - 40 * sc, y - 246 * sc, x + 40 * sc, y - 232 * sc], fill=col)
        d.rounded_rectangle([x - 22 * sc, y - 276 * sc, x + 22 * sc, y - 238 * sc], radius=int(8 * sc), fill=col)


def v_brothers(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] + 140 * L["vs"], L["vs"] * 1.2
    put(img, glow((255, 200, 150), 900 * sc), cx, cy - 200 * sc, "mm", .45)
    for i in range(7):  # god rays
        a = -math.pi / 2 + (i - 3) * .18 + math.sin(t * .3) * .03
        L0 = 900 * sc
        d.polygon([(cx, cy - 330 * sc), (cx + math.cos(a - .04) * L0, cy - 330 * sc + math.sin(a - .04) * -L0 * -1),
                   (cx + math.cos(a + .04) * L0, cy - 330 * sc + math.sin(a + .04) * -L0 * -1)], fill=(255, 220, 170, 18))
    k = eo((t - .3) / 1.0)
    figure(d, cx - lerp(260, 120, k) * sc, cy, sc, (26, 20, 20, 255), t, True, 0)
    figure(d, cx + lerp(260, 120, k) * sc, cy, sc, (26, 20, 20, 255), t, False, 1.3)
    for x, name in ((cx - 120 * sc, "CAL"), (cx + 120 * sc, "ARON")):
        put(img, text_sprite(name, F_PLAY, int(40 * sc), CREAM + (255,), "Bold", 4, int(6 * sc)), x, cy + 50 * sc, "mt", eo((t - 1.3) / .5))


def e_brothers(dur):
    return [(.3, "swell")]


def laurel(d, cx, cy, R, sc, k, col):
    for side in (-1, 1):
        n = int(14 * k)
        for i in range(n):
            a = math.pi / 2 + side * (.35 + i * .17)
            x, y = cx + math.cos(a) * R, cy + math.sin(a) * R
            tang = a + side * math.pi / 2
            lx, ly = math.cos(tang) * 34 * sc, math.sin(tang) * 34 * sc
            nx, ny = math.cos(a) * 14 * sc, math.sin(a) * 14 * sc
            d.polygon([(x, y), (x + lx * .5 + nx, y + ly * .5 + ny), (x + lx, y + ly), (x + lx * .5 - nx, y + ly * .5 - ny)], fill=col)


def counter(img, L, t, value, x, y, col, t0=.6, t1=2.2, fmt="{}%", size=130, sc=1):
    v = int(round(value * eo((t - t0) / (t1 - t0)))) if t > t0 else 0
    pop = 1 + .1 * max(0, 1 - abs(t - t1) / .2)
    put(img, text_sprite(fmt.format(v), F_PLAY, int(size * sc), col + (255,), "Black", 6), x, y, "mm", eo((t - t0 + .2) / .4), pop)


def v_laurel(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 30 * L["vs"], L["vs"]
    put(img, glow(GOLD, 800 * sc), cx, cy, "mm", .35 + .1 * math.sin(t * 2))
    laurel(d, cx, cy, 190 * sc, sc, eo((t - .3) / 1.6), GOLD + (255,))
    counter(img, L, t, 87, cx, cy - 10 * sc, CREAM, sc=sc, size=150)
    put(img, text_sprite("CRITICS", F_CORM, int(40 * sc), GOLD + (255,), "Bold", 5, int(8 * sc)), cx, cy + 90 * sc, "mm", eo((t - 1.0) / .5))


def e_laurel(dur):
    return [(.6, "swell"), (2.2, "chime")]


def v_storm(img, d, t, L):
    W, H = L["W"], L["H"]
    rnd = random.Random(int(t * FPS) // 2)
    for i in range(160):  # rain
        x = rnd.uniform(0, W); y = rnd.uniform(0, H)
        d.line([(x, y), (x - 14 * L["s"], y + 40 * L["s"])], fill=(200, 210, 230, 70), width=int(2 * L["s"]))
    for st in (1.4, 6.2):  # lightning
        age = t - st
        if 0 <= age < .35:
            a = int(200 * (1 - age / .35) * (1 if int(age * 30) % 3 else .5))
            d.rectangle([0, 0, W, H], fill=(230, 235, 255, a // 2))
            rb = random.Random(int(st * 10))
            x, y = W * (.7 if not L["portrait"] else .5), 0
            pts = [(x, y)]
            while y < L["horizon"]:
                x += rb.uniform(-60, 60) * L["s"]; y += rb.uniform(40, 90) * L["s"]
                pts.append((x, y))
            d.line(pts, fill=(255, 255, 255, a), width=int(5 * L["s"]))


def e_storm(dur):
    return [(1.4, "thunder"), (6.2, "thunder")]


def star(d, x, y, r, fill):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * .45
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    d.polygon(pts, fill=fill)


def v_stars(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 40 * L["vs"], L["vs"]
    counter(img, L, t, 85, cx, cy - 120 * sc, CREAM, sc=sc, size=150)
    for i in range(5):
        x = cx + (i - 2) * 110 * sc
        k = eback((t - .8 - i * .25) / .4)
        star(d, x, cy + 70 * sc, 44 * sc, (80, 70, 60, 200))
        if t > .8 + i * .25:
            fill_frac = 1 if i < 4 else .25
            r = 44 * sc * max(.01, k)
            star(d, x, cy + 70 * sc, r, GOLD + (255,)) if fill_frac == 1 else star(d, x, cy + 70 * sc, r * .6, GOLD + (255,))
    put(img, text_sprite("AUDIENCES", F_CORM, int(40 * sc), GOLD + (255,), "Bold", 5, int(8 * sc)), cx, cy + 170 * sc, "mm", eo((t - 1.2) / .5))


def e_stars(dur):
    return [(.6, "swell")] + [(.8 + i * .25, "tick") for i in range(5)]


def v_globe(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 40 * L["vs"], L["vs"]
    R = 210 * sc
    put(img, glow(GOLD, R * 3.4), cx, cy, "mm", .4)
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(24, 30, 52, 235), outline=GOLD + (255,), width=int(4 * sc))
    rot = t * .35
    for j in range(-2, 3):  # latitude
        yy = cy + j * R * .38
        rx = math.sqrt(max(0, R ** 2 - (yy - cy) ** 2))
        d.arc([cx - rx, yy - rx * .12, cx + rx, yy + rx * .12], 0, 360, fill=GOLD + (90,), width=int(2 * sc))
    for i in range(8):  # longitude
        a = rot + i * math.pi / 8
        w = abs(math.cos(a)) * R
        if math.cos(a) > 0 or True:
            d.ellipse([cx - w, cy - R, cx + w, cy + R], outline=GOLD + (70,), width=int(2 * sc))
    rnd = random.Random(8)
    lit = clamp((t - .6) / 2.4)
    for i in range(86):  # 86 countries light up
        lon, lat = rnd.uniform(0, 2 * math.pi), rnd.uniform(-1.1, 1.1)
        a = lon + rot
        if math.cos(a) < 0:
            continue
        x = cx + math.sin(a) * math.cos(lat) * R
        y = cy - math.sin(lat) * R
        if i / 86 < lit:
            r = (4 + 2 * math.sin(t * 4 + i)) * sc
            d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 220, 140, 230))
    put(img, text_sprite("#1", F_PLAY, int(110 * sc), CREAM + (255,), "Black", 6), cx, cy - R - 60 * sc, "mm", eo((t - .4) / .5), 1 + .05 * math.sin(t * 3))
    counter(img, L, t, 86, cx, cy + R + 60 * sc, GOLD, .6, 3.0, "{} COUNTRIES", 54, sc)


def e_globe(dur):
    return [(.4, "chime"), (.6, "swell"), (3.0, "chime")]


def v_reel(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 60 * L["vs"], L["vs"]
    R = 150 * sc
    rx, ry = cx - 120 * sc, cy - 40 * sc
    rot = t * 2.2
    d.ellipse([rx - R, ry - R, rx + R, ry + R], fill=(60, 60, 64, 255), outline=(150, 150, 150, 255), width=int(6 * sc))
    for i in range(6):
        a = rot + i * math.pi / 3
        hx, hy = rx + math.cos(a) * R * .55, ry + math.sin(a) * R * .55
        d.ellipse([hx - 30 * sc, hy - 30 * sc, hx + 30 * sc, hy + 30 * sc], fill=(20, 20, 22, 255))
    d.ellipse([rx - 20 * sc, ry - 20 * sc, rx + 20 * sc, ry + 20 * sc], fill=(150, 150, 150, 255))
    # film strip scrolling to the right
    sy = cy + 150 * sc
    fh = 130 * sc
    d.rectangle([cx - 420 * sc, sy - fh / 2, cx + 420 * sc, sy + fh / 2], fill=(18, 16, 16, 255))
    off = (t * 120 * sc) % (170 * sc)
    for i in range(-1, 6):
        fx = cx - 420 * sc + i * 170 * sc + off
        d.rectangle([fx + 15 * sc, sy - fh / 2 + 22 * sc, fx + 155 * sc, sy + fh / 2 - 22 * sc], fill=(200, 170, 120, 255) if i % 2 else (150, 130, 110, 255))
        for hy in (sy - fh / 2 + 8 * sc, sy + fh / 2 - 14 * sc):
            for hx in range(4):
                d.rectangle([fx + 20 * sc + hx * 38 * sc, hy, fx + 34 * sc + hx * 38 * sc, hy + 7 * sc], fill=(230, 220, 200, 255))
    put(img, text_sprite("1955", F_PLAY, int(70 * sc), CREAM + (255,), "Black", 5), cx + 170 * sc, cy - 110 * sc, "mm", eo((t - .5) / .4))
    put(img, text_sprite("vs", F_CORM, int(46 * sc), GOLD + (255,), "Bold", 4), cx + 170 * sc, cy - 40 * sc, "mm", eo((t - .9) / .4))
    put(img, text_sprite("2026", F_PLAY, int(70 * sc), GOLD + (255,), "Black", 5), cx + 170 * sc, cy + 30 * sc, "mm", eo((t - 1.3) / .4), 1 + .06 * max(0, 1 - abs(t - 1.5) / .3))


def e_reel(dur):
    return [(.5, "tick"), (1.3, "chime")]


def v_timshel(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 50 * L["vs"], L["vs"]
    word = "TIMSHEL"
    spr = text_sprite(word, F_PLAY, int(120 * sc), CREAM + (255,), "Black", 8, int(10 * sc))
    put(img, glow(GOLD, 900 * sc), cx, cy, "mm", .3 + .25 * eo((t - .6) / 1.5))
    k = eo((t - .5) / 1.8)  # reveal left to right
    if k > 0:
        part = spr.crop((0, 0, max(1, int(spr.width * k)), spr.height))
        put(img, part, cx - spr.width / 2, cy, "lm")
    sx = cx - spr.width / 2 + ((t - .5) * 260 * sc) % (spr.width + 300 * sc) - 150 * sc  # light sweep
    if t > 2.3:
        d.polygon([(sx, cy - 80 * sc), (sx + 40 * sc, cy - 80 * sc), (sx + 10 * sc, cy + 80 * sc), (sx - 30 * sc, cy + 80 * sc)], fill=(255, 245, 220, 40))
    put(img, text_sprite("“thou mayest”", F_CORM, int(58 * sc), GOLD + (255,), "Bold", 5), cx, cy + 120 * sc, "mm", eo((t - 2.2) / .6))
    # apple falling and bouncing in the grass
    at = (t - 3.2) % 6
    if t > 3.2 and at < 2.2:
        ax = cx + 230 * sc
        y0, y1 = cy - 300 * sc, cy + 300 * sc
        u = clamp(at / .9)
        ay = lerp(y0, y1, u * u) if at < .9 else y1 - abs(math.sin((at - .9) * 6)) * 40 * sc * math.exp(-(at - .9) * 3)
        r = 20 * sc
        d.ellipse([ax - r, ay - r, ax + r, ay + r], fill=APPLE + (255,))
        d.line([(ax, ay - r), (ax + 4 * sc, ay - r - 14 * sc)], fill=(60, 40, 20, 255), width=int(4 * sc))
        d.ellipse([ax + 2 * sc, ay - r - 16 * sc, ax + 20 * sc, ay - r - 6 * sc], fill=(90, 140, 60, 255))


def e_timshel(dur):
    return [(.5, "swell"), (2.2, "chime")] + [(3.2 + .9 + 6 * i, "thud") for i in range(3) if 3.2 + .9 + 6 * i < dur - .5]


def v_seal(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 40 * L["vs"], L["vs"]
    pw, ph = 420 * sc, 300 * sc
    paper = Image.new("RGBA", (int(pw), int(ph)), (0, 0, 0, 0))
    pd = ImageDraw.Draw(paper)
    pd.rectangle([0, 0, pw - 1, ph - 1], fill=(234, 218, 186), outline=(160, 130, 90), width=int(4 * sc))
    for i in range(7):
        pd.line([(30 * sc, 40 * sc + i * 34 * sc), (pw - 30 * sc - (i * 23 % 70) * sc, 40 * sc + i * 34 * sc)], fill=(130, 110, 90), width=int(3 * sc))
    put(img, paper, cx, cy, "mm", eo((t - .2) / .5), 1, angle=-3 + math.sin(t) * .5)
    if t > 1.2:
        k = eback((t - 1.2) / .35)
        seal = Image.new("RGBA", (int(230 * sc), int(230 * sc)), (0, 0, 0, 0))
        sd = ImageDraw.Draw(seal)
        rnd = random.Random(1)
        pts = [(115 * sc + math.cos(a) * (100 + rnd.uniform(-8, 8)) * sc, 115 * sc + math.sin(a) * (100 + rnd.uniform(-8, 8)) * sc) for a in np.linspace(0, 2 * math.pi, 30)]
        sd.polygon(pts, fill=(150, 26, 30))
        sd.ellipse([35 * sc, 35 * sc, 195 * sc, 195 * sc], outline=(110, 16, 20), width=int(6 * sc))
        sd.text((115 * sc, 100 * sc), "WATCH", font=font(F_PLAY, int(40 * sc), "Black"), fill=(240, 200, 180), anchor="mm")
        sd.text((115 * sc, 145 * sc), "IT", font=font(F_PLAY, int(40 * sc), "Black"), fill=(240, 200, 180), anchor="mm")
        put(img, seal, cx + 130 * sc, cy + 70 * sc, "mm", clamp((t - 1.2) / .1), max(.01, 1.8 - .8 * k), angle=12)


def e_seal(dur):
    return [(.2, "page"), (1.45, "thud")]


def v_outro(img, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 30 * L["vs"], L["vs"]
    put(img, text_sprite("RG", F_PLAY, int(130 * sc), GOLD + (255,), "Black", 8), cx, cy - 200 * sc, "mm", eo((t - .2) / .5))
    k = eback((t - .5) / .4)
    clicked = t > 2.2
    btn = Image.new("RGBA", (int(470 * sc), int(120 * sc)), (0, 0, 0, 0))
    bd = ImageDraw.Draw(btn)
    bd.rounded_rectangle([0, 0, btn.width - 1, btn.height - 1], radius=int(60 * sc), fill=(90, 84, 80) if clicked else (200, 40, 40), outline=GOLD, width=int(3 * sc))
    bd.text((btn.width / 2, btn.height / 2), "SUBSCRIBED" if clicked else "SUBSCRIBE", font=font(F_SANS, int(46 * sc)), fill=CREAM, anchor="mm")
    put(img, btn, cx, cy, "mm", clamp((t - .5) / .2), max(.01, k) * (.93 if 2.2 <= t < 2.32 else 1))
    u = eio((t - 1.1) / 1.0)
    mx, my = lerp(cx + 400 * sc, cx + 60 * sc, u), lerp(cy + 300 * sc, cy + 30 * sc, u)
    if t > 1.0:
        pts = [(0, 0), (0, 60), (16, 46), (28, 72), (38, 67), (26, 42), (46, 42)]
        d.polygon([(mx + x * sc * 1.2, my + y * sc * 1.2) for x, y in pts], fill=CREAM, outline=INK, width=int(3 * sc))
    if clicked and t - 2.2 < .6:
        rr = (80 + 300 * eo((t - 2.2) / .6)) * sc
        d.ellipse([cx - rr, cy - rr * .4, cx + rr, cy + rr * .4], outline=(255, 240, 210, int(255 * (1 - (t - 2.2) / .6))), width=int(5 * sc))


def e_outro(dur):
    return [(.5, "swell"), (2.2, "click"), (2.35, "chime")]


VISUALS = {
    "title": (v_title, e_title), "book": (v_book, e_book), "portraits_a": (v_portraits_a, e_portraits),
    "brothers": (v_brothers, e_brothers), "laurel": (v_laurel, e_laurel), "storm": (v_storm, e_storm),
    "stars": (v_stars, e_stars), "globe": (v_globe, e_globe), "reel": (v_reel, e_reel),
    "timshel": (v_timshel, e_timshel), "seal": (v_seal, e_seal), "outro": (v_outro, e_outro),
    "portrait_pugh": (one_portrait("woman", "FLORENCE PUGH"), lambda dur: [(.4, "tick")]),
    "portrait_lee": (one_portrait("man", "HOON LEE"), lambda dur: [(.4, "tick")]),
}
NO_TREE = {"storm", "globe", "outro"}

# ---------------------------------------------------------------- frame


def layout(W, H):
    if H > W:
        s = W / 1080
        return dict(W=W, H=H, s=s, portrait=True, m=70 * s, ky=.07 * H, tw=W - 140 * s, horizon=.6 * H,
                    vx=W / 2, vy=.56 * H, vs=1.3 * s, cy=.85 * H, csize=56 * s, cwords=4, letterbox=0, tree=.1 * W, short_book=True)
    s = W / 1920
    return dict(W=W, H=H, s=s, portrait=False, m=110 * s, ky=.15 * H, tw=.44 * W, horizon=.6 * H,
                vx=.71 * W, vy=.5 * H, vs=1.2 * s, cy=H - 52 * s, csize=38 * s, cwords=8, letterbox=int(96 * s), tree=.985 * W)


def draw_text_block(img, d, L, kicker, head, bullets, accent, t):
    s, m = L["s"], L["m"]
    y = L["ky"] + (L["letterbox"] if not L["portrait"] else 0) * .2
    a = eo((t - .3) / .6)
    ks = text_sprite(kicker, F_CORM, int(36 * s), accent + (255,), "Bold", 0, int(7 * s))
    put(img, ks, m - 8 * s, y, "lt", a)
    d.line([(m, y + ks.height - 4 * s), (m + 70 * s * a, y + ks.height - 4 * s)], fill=accent + (255,), width=int(3 * s))
    y += ks.height + 6 * s
    hs = fit_size(head, F_PLAY, int((104 if not L["portrait"] else 110) * s), L["tw"], "Black")
    hspr = text_sprite(head, F_PLAY, hs, CREAM + (255,), "Black", int(6 * s))
    ha = eo((t - .55) / .7)
    put(img, hspr, m - hs * .3, y + (1 - ha) * 30 * s, "lt", ha)
    y += hspr.height - 6 * s
    bs = int((54 if not L["portrait"] else 58) * s)
    for i, b in enumerate(bullets):
        bt = (t - 1.1 - i * .45) / .6
        if bt <= 0:
            continue
        ba = eo(bt)
        size = fit_size(b, F_CORM, bs, L["tw"] - 50 * s, "Bold")
        spr = text_sprite(b, F_CORM, size, (250, 244, 232, 255), "Bold", int(4 * s))
        d.ellipse([m + 4 * s, y + bs * .62, m + 16 * s, y + bs * .62 + 12 * s], fill=accent + (int(255 * ba),))
        put(img, spr, m + 26 * s + (1 - ba) * 20 * s, y, "lt", ba)
        y += bs * 1.3


def draw_caption(img, d, L, vo, t, vo_len):
    words = vo.split()
    n = len(words)
    w8 = [len(w) + 3 for w in words]
    cum = np.cumsum(w8) / sum(w8)
    idx = min(n - 1, int(np.searchsorted(cum, clamp((t - VO_START) / vo_len, 0, .9999), side="right")))
    if t < VO_START - .1:
        return
    cw = L["cwords"]
    chunk = words[idx // cw * cw: idx // cw * cw + cw]
    cur = idx % cw
    f = font(F_SANS, L["csize"])
    space = d.textlength(" ", font=f)
    widths = [d.textlength(w, font=f) for w in chunk]
    total = sum(widths) + space * (len(chunk) - 1)
    x = L["W"] / 2 - total / 2
    y = L["cy"]
    if L["portrait"]:
        pad = 22 * L["s"]
        d.rounded_rectangle([x - pad, y - L["csize"] * .75, x + total + pad, y + L["csize"] * .75], radius=int(16 * L["s"]), fill=(0, 0, 0, 150))
    for i, (w, ww) in enumerate(zip(chunk, widths)):
        col = GOLD if i == cur else CREAM
        d.text((x, y), w, font=f, fill=col, anchor="lm", stroke_width=int(2 * L["s"]), stroke_fill=(0, 0, 0))
        x += ww + space


def scene_setup(scene, L, idx):
    mood = scene[6]
    sky, layers = make_layers(L, mood, 11 + idx)
    rnd = random.Random(idx * 13 + 2)
    W, H, s = L["W"], L["H"], L["s"]
    clouds = [(rnd.uniform(0, W), rnd.uniform(.05, .3) * H, rnd.uniform(300, 520) * s, rnd.uniform(90, 150) * s, rnd.uniform(8, 20) * s, rnd.randint(0, 99)) for _ in range(5)]
    embers = [(rnd.uniform(0, W), rnd.uniform(0, H), rnd.uniform(8, 25) * s, rnd.uniform(1.5, 3.5) * s, rnd.uniform(0, 6)) for _ in range(50)]
    return sky, layers, clouds, embers


def scene_frame(scene, L, bg, t, vo_len, fidx=0):
    kicker, head, bullets, accent, dur, visual, mood, vo = scene
    LL = dict(L)
    if visual in NO_TREE:
        LL["tree"] = None
    img, d = landscape(LL, t, bg, mood)
    W, H, s = L["W"], L["H"], L["s"]
    # soft dark panel behind the text for legibility
    if not L["portrait"]:
        put(img, panel(W, H), 0, 0)
    else:
        put(img, panel_p(W, H), 0, 0)
    d = ImageDraw.Draw(img, "RGBA")
    LV = dict(LL, vx=L["vx"] + math.sin(t * .5) * 6 * s, vy=L["vy"] + math.sin(t * .8) * 6 * s)
    VISUALS[visual][0](img, d, t, LV)
    draw_text_block(img, d, L, kicker, head, bullets, accent, t)
    put(img, overlays(W, H, L["letterbox"])[fidx % 8], 0, 0)
    d = ImageDraw.Draw(img, "RGBA")
    draw_caption(img, d, L, vo, t, vo_len)
    put(img, text_sprite("RG", F_PLAY, int(46 * s), GOLD + (220,), "Black", 3), W - L["m"], (L["letterbox"] + 18 * s) if not L["portrait"] else 40 * s, "rt")
    if t < .45:  # dip from black
        d.rectangle([0, 0, W, H], fill=(0, 0, 0, int(255 * (1 - eo(t / .45)))))
    if t > dur - .35:
        d.rectangle([0, 0, W, H], fill=(0, 0, 0, int(255 * eio((t - (dur - .35)) / .35))))
    return img


@lru_cache(None)
def panel(W, H):
    x = np.linspace(0, 1, W)[None, :]
    a = np.clip(1 - x / .55, 0, 1) ** 1.3 * 165
    arr = np.zeros((H, W, 4), np.uint8); arr[..., 3] = np.repeat(a, H, 0).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


@lru_cache(None)
def panel_p(W, H):
    y = np.linspace(0, 1, H)[:, None]
    a = np.clip(1 - y / .38, 0, 1) ** 1.2 * 170 + np.clip((y - .78) / .22, 0, 1) * 120
    arr = np.zeros((H, W, 4), np.uint8); arr[..., 3] = np.repeat(a, W, 1).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def render_scene(job):
    scene, W, H, path, idx, vo_len = job
    L = layout(W, H)
    bg = scene_setup(scene, L, idx)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "21",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for f in range(int(round(scene[4] * FPS))):
        p.stdin.write(scene_frame(scene, L, bg, f / FPS, vo_len, f // 2).tobytes())
    p.stdin.close(); p.wait()
    return path


# ---------------------------------------------------------------- audio
def pluck(freq, dur, rng, bright=.5):
    """Karplus-Strong plucked string (nylon/steel guitar feel)."""
    n = int(dur * SR)
    period = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, period).astype(np.float32)
    out = np.empty(n, np.float32)
    decay = .996
    for i in range(0, n, period):  # vectorized per period
        seg = buf.copy()
        m = min(period, n - i)
        out[i:i + m] = seg[:m]
        buf = decay * (bright * buf + (1 - bright) * .5 * (buf + np.roll(buf, 1)))
        buf = .5 * (buf + np.roll(buf, 1))
    env = np.minimum(1, np.arange(n) / (SR * .004))
    return out * env * np.exp(-np.arange(n) / SR * 1.2)


def synth_audio(scenes, path, vo_wavs):
    total = sum(sc[4] for sc in scenes)
    n = int(total * SR) + SR
    music = np.zeros(n, np.float32)
    rng = np.random.default_rng(5)
    bpm = 72; beat = 60 / bpm
    # Am - F - C - G folk progression, fingerpicked
    chords = [(110, 164.8, 220, 261.6, 329.6), (87.3, 130.8, 174.6, 220, 261.6), (130.8, 196, 261.6, 329.6, 392), (98, 146.8, 196, 246.9, 293.7)]
    pattern = [0, 2, 3, 4, 3, 2, 1, 3]
    cache = {}
    t, bar = 0.0, 0
    while t < total:
        ch = chords[bar % 4]
        for k, p in enumerate(pattern):
            f = ch[p]
            key = (f, k == 0)
            if key not in cache:
                cache[key] = pluck(f, 2.6, rng, .55) * (.9 if k == 0 else .55)
            sig = cache[key]
            i = int((t + k * beat / 2) * SR); j = min(n, i + len(sig))
            if i < n:
                music[i:j] += sig[: j - i]
        x = np.arange(int(beat * 4 * SR)) / SR  # soft pad under each bar
        pad = sum(np.sin(2 * np.pi * f * x) for f in ch[1:4]) * np.sin(np.pi * x / x[-1]) * .05
        i = int(t * SR); j = min(n, i + len(pad))
        music[i:j] += pad[: j - i].astype(np.float32)
        t += beat * 4; bar += 1
    wind = np.convolve(rng.uniform(-1, 1, n), np.ones(60) / 60, "same").astype(np.float32) * 4
    wind *= (.6 + .4 * np.sin(np.arange(n) / SR * .4)).astype(np.float32)
    music = music / (np.abs(music).max() + 1e-9) + wind * .06

    def tt(dsec):
        return np.arange(int(dsec * SR)) / SR

    def nz(dsec, smooth):
        z = rng.uniform(-1, 1, int(dsec * SR))
        return np.convolve(z, np.ones(smooth) / smooth, "same") * math.sqrt(smooth)

    sfx = {
        "swell": (nz(1.6, 40) * np.sin(np.pi * tt(1.6) / 1.6) ** 2 * .2).astype(np.float32),
        "chime": ((np.sin(2 * np.pi * 880 * tt(1.6)) + .5 * np.sin(2 * np.pi * 1320 * tt(1.6)) + .25 * np.sin(2 * np.pi * 1760 * tt(1.6))) * np.exp(-3 * tt(1.6)) * .14).astype(np.float32),
        "tick": ((np.sin(2 * np.pi * 1200 * tt(.15))) * np.exp(-40 * tt(.15)) * .25).astype(np.float32),
        "page": (nz(.35, 6) * np.exp(-8 * tt(.35)) * np.sin(np.pi * tt(.35) / .35) * .25).astype(np.float32),
        "thud": (np.sin(2 * np.pi * 70 * tt(.4)) * np.exp(-12 * tt(.4)) * .6 + nz(.4, 8) * np.exp(-25 * tt(.4)) * .2).astype(np.float32),
        "thunder": (nz(3.0, 400) * np.exp(-1.2 * tt(3.0)) * np.minimum(1, tt(3.0) * 8) * 1.4).astype(np.float32),
        "click": (nz(.02, 1) * np.exp(-300 * tt(.02)) * .4).astype(np.float32),
    }
    fx = np.zeros(n, np.float32)
    voice = np.zeros(n, np.float32)
    duck = np.ones(n, np.float32)
    t0 = 0.0
    for sc, vw in zip(scenes, vo_wavs):
        for et, e in sorted(VISUALS[sc[5]][1](sc[4])):
            s = sfx[e]; i = int((t0 + et) * SR); j = min(n, i + len(s))
            if i < n: fx[i:j] += s[: j - i]
        i = int((t0 + VO_START) * SR); j = min(n, i + len(vw))
        voice[i:j] += vw[: j - i]
        duck[max(0, i - SR // 5): min(n, j + SR // 3)] = .4
        t0 += sc[4]
    duck = np.convolve(duck, np.ones(6615) / 6615, "same").astype(np.float32)
    ramp = np.minimum(1, np.minimum(np.arange(n) / SR / 1.5, (n - np.arange(n)) / SR / 2.5)).astype(np.float32)
    voice /= np.abs(voice).max() + 1e-9
    mix = music * .3 * duck * ramp + fx * .6 + voice * .9
    mix /= np.abs(mix).max() / .9
    pcm = (mix[: int(total * SR)] * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def voiceover(scenes, name):
    import soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(KOKORO_DIR, "kokoro-v1.0.onnx"), os.path.join(KOKORO_DIR, "voices-v1.0.bin"))
    vdir = os.path.join(OUT, "voiceover"); os.makedirs(vdir, exist_ok=True)
    names = re.compile("(" + "|".join(re.escape(n) for n in sorted(PHONEMES, key=len, reverse=True)) + ")")

    def to_ph(text):
        return "".join(PHONEMES[p] if p in PHONEMES else k.tokenizer.phonemize(p, "en-us") if p.strip() else p for p in names.split(text))

    def trim(x):
        z = np.where(np.abs(x) > .01)[0]
        return x[max(0, z[0] - 600): z[-1] + 1800] if len(z) else x

    wavs = []
    for i, sc in enumerate(scenes):
        text = sc[7].replace("RG", "R G")
        chunks = []
        for snt in [m.strip() for m in re.findall(r"[^.?!:]+[.?!:]?", text) if m.strip()]:
            audio, sr = k.create(to_ph(snt), voice=VOICE, speed=VOICE_SPEED, lang="en-us", is_phonemes=True)
            chunks += [trim(np.asarray(audio, np.float32)), np.zeros(int(PAUSE.get(snt[-1], .22) * sr), np.float32)]
        x = np.concatenate(chunks[:-1])
        if sr != SR:
            x = np.interp(np.linspace(0, 1, int(len(x) * SR / sr)), np.linspace(0, 1, len(x)), x).astype(np.float32)
        sf.write(os.path.join(vdir, f"{name}_{i:02d}.wav"), x, SR)
        wavs.append(x)
    return wavs


def ts(x, ms=True):
    b = f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d}"
    return b + f",{int(round(x * 1000)) % 1000:03d}" if ms else b[3:]


def build(scenes, W, H, name, pool):
    os.makedirs(TMP, exist_ok=True)
    wavs = voiceover(scenes, name)
    lens = [len(v) / SR for v in wavs]
    scenes = [sc[:4] + (round(max(sc[4], VO_START + vl + 1.1) * FPS) / FPS,) + sc[5:] for sc, vl in zip(scenes, lens)]
    jobs = [(sc, W, H, os.path.join(TMP, f"{name}_{i:02d}.mp4"), i, vl) for i, (sc, vl) in enumerate(zip(scenes, lens))]
    parts = pool.map(render_scene, jobs, chunksize=1)
    lst = os.path.join(TMP, f"{name}.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    wav = os.path.join(TMP, f"{name}.wav")
    synth_audio(scenes, wav, wavs)
    final = os.path.join(OUT, f"{name}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p",  # grain needs a higher CRF to stay small
                   
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-ac", "2",
                    "-shortest", "-movflags", "+faststart", final], check=True)
    t, srt, script = 0.0, [], []
    for i, sc in enumerate(scenes):
        srt.append(f"{i + 1}\n{ts(t + VO_START)} --> {ts(t + VO_START + lens[i])}\n{sc[7]}\n")
        script.append(f"[{ts(t, False)}] {sc[0]} - {sc[1]}\n{sc[7]}\n")
        t += sc[4]
    open(os.path.join(OUT, f"{name}.srt"), "w").write("\n".join(srt))
    open(os.path.join(OUT, f"{name}_voiceover_script.txt"), "w").write("\n".join(script))
    print(f"{final}  ({t:.1f}s)")


def preview():
    pdir = os.path.join(OUT, "preview"); os.makedirs(pdir, exist_ok=True)
    for name, scenes, W, H in (("long", LONG, 1920, 1080), ("short", SHORT, 1080, 1920)):
        L = layout(W, H)
        for i, sc in enumerate(scenes):
            bg = scene_setup(sc, L, i)
            scene_frame(sc, L, bg, min(sc[4] - .5, 4.0), sc[4] - 2).convert("RGB").save(os.path.join(pdir, f"{name}_{i:02d}.png"))
    print(pdir)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        preview()
    else:
        with Pool(os.cpu_count()) as pool:
            build(LONG, 1920, 1080, "east_of_eden_youtube", pool)
            build(SHORT, 1080, 1920, "east_of_eden_short", pool)
