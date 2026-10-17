"""Render the Crystal Lake explainer (16:9) and Short (9:16) from narration WAVs.

usage: python render.py long|short|thumb VO_DIR SCRIPT OUT
"""
import math, os, random, re, subprocess, sys, wave
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FPS = 30
LEAD, TAIL = 0.5, 0.7          # silence before / after each narration paragraph
FD = "/usr/share/fonts/truetype/"
SERIF = FD + "liberation/LiberationSerif-Bold.ttf"
SANS = FD + "dejavu/DejaVuSans-Bold.ttf"
SANS_R = FD + "dejavu/DejaVuSans.ttf"
MONO = FD + "liberation/LiberationMono-Bold.ttf"
RED, BLOOD, BONE, MIST = (214, 30, 30), (140, 10, 10), (236, 228, 210), (170, 190, 210)
_fonts = {}


def font(path, size):
    key = (path, int(size))
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(path, int(size))
    return _fonts[key]


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def appear(t, t0, d=0.5):
    return ease((t - t0) / d)


# ---------------------------------------------------------------- assets
def make_lake(W, H, horizon, moon):
    """Moonlit lake with a pine tree line, slightly larger than the frame for panning."""
    PW, PH = W + 160, H + 90
    y = np.linspace(0, 1, PH)[:, None]
    top, bot = np.array([4, 6, 16]), np.array([30, 34, 58])
    k = np.clip(y / horizon, 0, 1)
    sky = top + (bot - top) * k[..., None]
    sky = np.broadcast_to(sky, (PH, PW, 3)).copy()
    hy = int(PH * horizon)
    lk = np.linspace(0, 1, PH - hy)[:, None, None]
    sky[hy:] = np.array([16, 20, 36]) * (1 - lk) + np.array([3, 4, 9]) * lk
    img = Image.fromarray(sky.astype(np.uint8)).convert("RGBA")
    rnd = random.Random(7)
    d = ImageDraw.Draw(img)
    for _ in range(int(PW * hy / 6000)):
        x, yy = rnd.randrange(PW), rnd.randrange(int(hy * 0.9))
        b = rnd.randrange(90, 230)
        d.point((x, yy), fill=(b, b, b + 10))
    # moon + glow
    mx, my, mr = int(PW * moon[0]), int(hy * moon[1]), int(min(W, H) * 0.075)
    glow = Image.new("RGBA", img.size)
    ImageDraw.Draw(glow).ellipse([mx - mr * 3, my - mr * 3, mx + mr * 3, my + mr * 3], fill=(150, 170, 220, 90))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(mr * 1.2)))
    d = ImageDraw.Draw(img)
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=(232, 232, 220))
    d.ellipse([mx - mr * 0.5, my - mr * 0.4, mx - mr * 0.2, my - mr * 0.1], fill=(210, 210, 200))
    # far and near tree lines
    for layer, (col, hmin, hmax) in enumerate([((10, 13, 24), 0.05, 0.13), ((3, 4, 8), 0.08, 0.2)]):
        x = -20
        while x < PW + 20:
            th = rnd.uniform(hmin, hmax) * H
            tw = th * rnd.uniform(0.28, 0.4)
            base = hy + layer * 4
            d.polygon([(x - tw / 2, base), (x + tw / 2, base), (x, base - th)], fill=col)
            x += rnd.uniform(tw * 0.35, tw * 0.7)
        d.rectangle([0, hy - 2 + layer * 4, PW, hy + 6 + layer * 4], fill=col)
    # tree reflection, faint
    refl = img.crop((0, hy - int(0.22 * H), PW, hy)).transpose(Image.FLIP_TOP_BOTTOM)
    refl = refl.filter(ImageFilter.GaussianBlur(3))
    refl.putalpha(70)
    img.alpha_composite(refl, (0, hy + 8))
    return img, (mx, hy)


def make_mist(W, H):
    rnd = np.random.default_rng(3)
    small = rnd.random((max(4, H // 60), (W + 2600) // 60))
    m = Image.fromarray((small * 255).astype(np.uint8)).resize((W + 2600, H), Image.BICUBIC)
    m = m.filter(ImageFilter.GaussianBlur(40))
    a = np.asarray(m).astype(float) / 255
    a = np.clip((a - 0.35) * 2.2, 0, 1) * 75
    rgba = np.zeros((H, W + 2600, 4), np.uint8)
    rgba[..., :3] = MIST
    rgba[..., 3] = a.astype(np.uint8)
    return Image.fromarray(rgba)


def make_vignette(W, H):
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    a = np.clip((r - 0.55) * 1.6, 0, 1) * 220
    v = np.zeros((H, W, 4), np.uint8)
    v[..., 3] = a.astype(np.uint8)
    return Image.fromarray(v)


def make_sackhead(h):
    """Original silhouette: hulking figure with a sack over the head and one eye hole."""
    w = int(h * 0.9)
    s = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(s)
    dark = (6, 6, 8, 255)
    d.rounded_rectangle([w * 0.05, h * 0.52, w * 0.95, h * 1.2], radius=int(w * 0.25), fill=dark)   # shoulders
    d.rectangle([w * 0.38, h * 0.42, w * 0.62, h * 0.6], fill=dark)                               # neck
    d.ellipse([w * 0.24, h * 0.06, w * 0.76, h * 0.5], fill=(28, 24, 20, 255))                   # sack
    d.polygon([(w * 0.3, h * 0.12), (w * 0.5, h * 0.0), (w * 0.7, h * 0.12)], fill=(28, 24, 20, 255))
    d.line([(w * 0.33, h * 0.44), (w * 0.67, h * 0.44)], fill=(60, 50, 40, 255), width=max(2, h // 60))  # tie
    for i in range(6):  # stitching / creases
        x = w * (0.32 + i * 0.07)
        d.line([(x, h * 0.12), (x + w * 0.03, h * 0.4)], fill=(40, 34, 28, 255), width=1)
    return s, (int(w * 0.43), int(h * 0.24), int(h * 0.035))  # eye position for the glow


class Assets:
    def __init__(self, W, H, horizon, moon):
        self.W, self.H = W, H
        self.lake, (self.moon_x, self.hy) = make_lake(W, H, horizon, moon)
        self.lake_dim = self.lake.filter(ImageFilter.GaussianBlur(10))
        dark = Image.new("RGBA", self.lake.size, (0, 0, 0, 150))
        self.lake_dim.alpha_composite(dark)
        self.mist = make_mist(W, H)
        self.vig = make_vignette(W, H)
        self.sack, self.eye = make_sackhead(int(H * 0.62))


# ---------------------------------------------------------------- drawing helpers
def layer(base, alpha, fn):
    """Run fn(draw, img) on a transparent layer and composite it at the given opacity."""
    if alpha <= 0.01:
        return
    lay = Image.new("RGBA", base.size)
    fn(ImageDraw.Draw(lay), lay)
    if alpha < 0.99:
        lay.putalpha(lay.getchannel("A").point(lambda v: int(v * alpha)))
    base.alpha_composite(lay)


def text_c(d, xy, s, f, fill, stroke=0, sfill=(0, 0, 0), anchor="mm"):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=sfill)


def wrap(s, f, maxw):
    words, lines, cur = s.split(), [], ""
    for w in words:
        nxt = (cur + " " + w).strip()
        if f.getlength(nxt) <= maxw or not cur:
            cur = nxt
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def background(img, A, t, dim=False, seed=0):
    src = A.lake_dim if dim else A.lake
    ox = int(80 + 70 * math.sin(t * 0.05 + seed))
    oy = int(45 + 35 * math.sin(t * 0.04 + seed * 2))
    img.paste(src.crop((ox, oy, ox + A.W, oy + A.H)), (0, 0))
    if not dim:  # moon shimmer on the water
        d = ImageDraw.Draw(img)
        rnd = random.Random(int(t * 8))
        mx, hy = A.moon_x - ox, A.hy - oy
        for i in range(26):
            y = hy + 14 + i * (A.H - hy) / 30
            w = (14 + i * 4) * rnd.uniform(0.5, 1.4)
            b = int(200 * (1 - i / 30) * rnd.uniform(0.4, 1))
            d.line([(mx - w, y), (mx + w, y)], fill=(b, b, min(255, b + 20)), width=2)
    mx = int(t * 10) % 2600
    img.alpha_composite(A.mist.crop((mx, 0, mx + A.W, A.H)))


def badge(d, x, y, s, f, fg=(255, 255, 255), bg=RED, pad=18, anchor="mm"):
    w = f.getlength(s) + pad * 2
    h = f.size + pad
    x0 = x - w / 2 if anchor == "mm" else x
    d.rounded_rectangle([x0, y - h / 2, x0 + w, y + h / 2], radius=h // 4, fill=bg)
    d.text((x0 + w / 2, y), s, font=f, fill=fg, anchor="mm")


def card(d, box, title, sub=None, tag=None, s=1.0, accent=RED):
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=int(18 * s), fill=(14, 14, 20, 225), outline=accent, width=max(2, int(3 * s)))
    cx = (x0 + x1) / 2
    if sub:
        text_c(d, (cx, y0 + (y1 - y0) * 0.36), title, font(SANS, 40 * s), BONE)
        text_c(d, (cx, y0 + (y1 - y0) * 0.62), sub, font(SANS_R, 27 * s), (190, 190, 200))
    else:
        text_c(d, (cx, (y0 + y1) / 2), title, font(SANS, 40 * s), BONE)
    if tag:
        text_c(d, (cx, y0 + (y1 - y0) * 0.84), tag, font(SANS_R, 23 * s), (230, 90, 90))


def title_logo(img, cx, cy, size, t, t0=0.0):
    a = appear(t, t0, 0.8)
    flick = 0.85 + 0.15 * math.sin(t * 23) * math.sin(t * 7.3)
    f = font(SERIF, size)

    def fn(d, lay):
        text_c(d, (cx, cy), "CRYSTAL LAKE", f, RED + (255,))
    glow = Image.new("RGBA", img.size)
    text_c(ImageDraw.Draw(glow), (cx, cy), "CRYSTAL LAKE", f, (255, 0, 0, 200))
    glow = glow.filter(ImageFilter.GaussianBlur(size // 8))
    glow.putalpha(glow.getchannel("A").point(lambda v: int(v * a * flick)))
    img.alpha_composite(glow)
    layer(img, a, lambda d, l: text_c(d, (cx, cy + (1 - a) * 30), "CRYSTAL LAKE", f, (230, 40, 36, 255), 3, (40, 0, 0)))


def sack_figure(img, A, cx, base_y, t, t0, scale=1.0, eye=True):
    a = appear(t, t0, 1.6)
    if a <= 0:
        return
    spr = A.sack if scale == 1.0 else A.sack.resize((int(A.sack.width * scale), int(A.sack.height * scale)))
    rise = int((1 - a) * spr.height * 0.25)
    x, y = int(cx - spr.width / 2), int(base_y - spr.height + rise)
    s2 = spr.copy()
    s2.putalpha(s2.getchannel("A").point(lambda v: int(v * a)))
    img.alpha_composite(s2, (max(0, x), y) if x >= 0 else (0, y))
    if eye:
        ex, ey, er = A.eye
        ex, ey, er = x + ex * scale, y + ey * scale, er * scale
        pulse = 0.6 + 0.4 * math.sin(t * 3)
        g = Image.new("RGBA", img.size)
        ImageDraw.Draw(g).ellipse([ex - er * 3, ey - er * 3, ex + er * 3, ey + er * 3], fill=(255, 30, 20, int(160 * a * pulse)))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(er * 1.5)))
        ImageDraw.Draw(img).ellipse([ex - er, ey - er * 0.7, ex + er, ey + er * 0.7], fill=(255, 60, 40, int(255 * a)))


def campfire(img, cx, cy, s, t):
    d = ImageDraw.Draw(img)
    g = Image.new("RGBA", img.size)
    r = 260 * s * (0.95 + 0.05 * math.sin(t * 13))
    ImageDraw.Draw(g).ellipse([cx - r, cy - r * 0.7, cx + r, cy + r * 0.5], fill=(255, 120, 30, 110))
    img.alpha_composite(g.filter(ImageFilter.GaussianBlur(60 * s)))
    d = ImageDraw.Draw(img)
    d.line([(cx - 60 * s, cy + 20 * s), (cx + 60 * s, cy - 5 * s)], fill=(50, 30, 15), width=int(16 * s))
    d.line([(cx - 60 * s, cy - 5 * s), (cx + 60 * s, cy + 20 * s)], fill=(60, 35, 18), width=int(16 * s))
    rnd = random.Random(int(t * 15))
    for col, hh, ww in [((255, 90, 20), 150, 55), ((255, 170, 40), 105, 38), ((255, 235, 140), 60, 20)]:
        for k in range(3):
            dx = rnd.uniform(-18, 18) * s
            h2 = hh * s * rnd.uniform(0.75, 1.1)
            d.polygon([(cx - ww * s + dx, cy), (cx + ww * s + dx, cy), (cx + dx * 1.5, cy - h2)], fill=col)
    # teens around the fire
    for i, (ox, sz) in enumerate([(-330, 1.0), (-200, 0.9), (220, 0.95), (340, 1.05)]):
        x, y = cx + ox * s, cy + 10 * s
        d.ellipse([x - 26 * sz * s, y - 150 * sz * s, x + 26 * sz * s, y - 98 * sz * s], fill=(8, 6, 6))
        d.rounded_rectangle([x - 48 * sz * s, y - 100 * sz * s, x + 48 * sz * s, y + 30 * s], radius=int(30 * s), fill=(8, 6, 6))


def eyes_in_trees(img, x, y, s, t, t0):
    a = appear(t, t0, 1.0)
    blink = 0 if (t * 0.7) % 3 < 0.12 else 1
    if a * blink <= 0:
        return
    g = Image.new("RGBA", img.size)
    gd = ImageDraw.Draw(g)
    for dx in (-36 * s, 36 * s):
        gd.ellipse([x + dx - 16 * s, y - 8 * s, x + dx + 16 * s, y + 8 * s], fill=(255, 40, 30, int(255 * a)))
    img.alpha_composite(g.filter(ImageFilter.GaussianBlur(3 * s)))
    img.alpha_composite(g)


# ---------------------------------------------------------------- narration + captions
def wav_len(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


class Para:
    def __init__(self, text, audio_len, start):
        self.text, self.alen, self.start = text, audio_len, start
        self.dur = LEAD + audio_len + TAIL

    def cue(self, phrase, offset=0.0):
        """Scene-relative time at which the narrator reaches `phrase` (approximate, by characters)."""
        i = self.text.find(phrase)
        if i < 0:
            raise ValueError(f"cue {phrase!r} not in paragraph")
        return LEAD + self.alen * (i / len(self.text)) + offset

    def chunks(self, max_words):
        parts = re.findall(r"[^,.:;?!]+[,.:;?!\"]*", self.text)
        out = []
        for p in parts:
            words = p.split()
            while words:
                out.append(" ".join(words[:max_words]))
                words = words[max_words:]
        total = sum(len(c) + 1 for c in out)
        pos, res = 0, []
        for c in out:
            t0 = LEAD + self.alen * pos / total
            pos += len(c) + 1
            res.append((t0, LEAD + self.alen * pos / total, c))
        return res


def captions(img, para, t, W, H, vertical):
    for t0, t1, c in para.chunks(4 if vertical else 9):
        if t0 <= t < t1:
            if vertical:
                f = font(SANS, 74)
                lines = wrap(c.upper(), f, W - 140)
                y = H * 0.70
                d = ImageDraw.Draw(img)
                for i, ln in enumerate(lines):
                    text_c(d, (W / 2, y + i * 92), ln, f, (255, 225, 60) if i == 0 else (255, 255, 255), 7)
            else:
                f = font(SANS, 42)
                lines = wrap(c, f, W - 400)
                d = ImageDraw.Draw(img)
                h = len(lines) * 54 + 26
                y0 = H - 70 - h
                wmax = max(f.getlength(l) for l in lines)

                def box(dd, lay):
                    dd.rounded_rectangle([W / 2 - wmax / 2 - 26, y0, W / 2 + wmax / 2 + 26, y0 + h], radius=14, fill=(0, 0, 0, 170))
                layer(img, 1, box)
                d = ImageDraw.Draw(img)
                for i, ln in enumerate(lines):
                    text_c(d, (W / 2, y0 + 13 + 27 + i * 54), ln, f, (255, 255, 255), 2)
            return


# ---------------------------------------------------------------- long video scenes (1920x1080)
def L0_hook(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t)
    title_logo(img, W / 2, H * 0.30, 190, t, 0.3)
    layer(img, appear(t, 1.3), lambda d, l: text_c(d, (W / 2, H * 0.44), "ENDING EXPLAINED  ·  FULL BREAKDOWN", font(SANS, 46), BONE + (255,), 3))
    ts = p.cue("Full spoilers")
    a = appear(t, ts, 0.25)
    pop = 1 + 0.15 * max(0, 1 - (t - ts) / 0.3) if t > ts else 1
    layer(img, a, lambda d, l: badge(d, W / 2, H * 0.56, "!  FULL SPOILERS AHEAD  !", font(SANS, int(44 * pop))))
    layer(img, appear(t, 2), lambda d, l: text_c(d, (W - 30, 30), "Fan recap · not affiliated with Peacock", font(SANS_R, 22), (200, 200, 200, 200), anchor="ra"))


def L1_setup(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=1)
    layer(img, appear(t, 0.2), lambda d, l: text_c(d, (W / 2, 120), "WHAT IS CRYSTAL LAKE?", font(SERIF, 80), RED + (255,), 2))
    rows = [("A PREQUEL TO", "Friday the 13th (1980)", p.cue("prequel")),
            ("ALL 8 EPISODES", "Peacock · October 15, 2026", p.cue("All eight")),
            ("STARRING", "Linda Cardellini as Pamela Voorhees", p.cue("Linda")),
            ("THE SETUP", "Her son Jason drowned at camp ~1 year earlier", p.cue("grieving"))]
    for i, (k, v, t0) in enumerate(rows):
        a = appear(t, t0)
        y = 250 + i * 150
        def fn(d, l, k=k, v=v, y=y, a=a):
            x = 260 - (1 - a) * 80
            d.rounded_rectangle([x, y, x + 1400, y + 120], radius=16, fill=(14, 14, 20, 225), outline=(90, 20, 20), width=2)
            d.rectangle([x, y, x + 12, y + 120], fill=RED)
            d.text((x + 50, y + 22), k, font=font(SANS, 26), fill=(230, 90, 90))
            d.text((x + 50, y + 56), v, font=font(SANS, 42), fill=BONE)
        layer(img, a, fn)
    tb = p.cue("very first scene")
    a = appear(t, tb, 0.4) * (1 - appear(t, p.cue("So right away") + 2.5, 0.4))
    def blood(d, l):
        d.rectangle([0, 0, W, H], fill=(50, 0, 0, 242))
        text_c(d, (W / 2, H / 2 - 60), "SCENE ONE:", font(SANS, 44), BONE + (255,))
        text_c(d, (W / 2, H / 2 + 20), "Pam, drenched in blood,", font(SERIF, 80), (255, 255, 255, 255), 3)
        text_c(d, (W / 2, H / 2 + 110), "a human tooth in her knuckle.", font(SERIF, 80), (255, 255, 255, 255), 3)
    layer(img, a, blood)


CAST = [("Pamela Voorhees", "Linda Cardellini", "grieving mother · hiding", "Pam isn't"),
        ("Levon Brooks", "William Catlett", "local lawman", "Levon"),
        ("Dorf", "Cameron Scoggins", "police officer", "Dorf"),
        ("Briana Brooks", "Devin Kessler", "digging for the truth", "Briana"),
        ("Crazy Ralph", "Nick Cordileone", "the town's prophet of doom", "Crazy Ralph"),
        ("Grace", "Gwendolyn Sundstrom", "the girl Pam protects", "And Grace")]


def L2_cast(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=2)
    layer(img, appear(t, 0.2), lambda d, l: text_c(d, (W / 2, 110), "WHO'S WHO", font(SERIF, 80), RED + (255,), 2))
    for i, (name, actor, role, cue) in enumerate(CAST):
        a = appear(t, p.cue(cue), 0.45)
        cx = W / 2 + (i % 3 - 1) * 560
        cy = 360 + (i // 3) * 300
        layer(img, a, lambda d, l, name=name, actor=actor, role=role, cx=cx, cy=cy, a=a:
              card(d, [cx - 250, cy - 115 + (1 - a) * 40, cx + 250, cy + 115 + (1 - a) * 40], name, actor, role))


def L3_breakdown(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=3)
    layer(img, appear(t, 0.2), lambda d, l: text_c(d, (W / 2, 110), "HOW IT UNFOLDS", font(SERIF, 80), RED + (255,), 2))
    beats = [("EARLY EPISODES", ["Pam sees Grace hurt by her mother", "Something sinister takes revenge"], p.cue("Early on")),
             ("EPISODE 3", ["Town blames a bear, starts a hunt", "Camp Crystal Lake reopens anyway"], p.cue("As the bodies")),
             ('EP. 6: "KILL THEM, MOMMY"', ["Hippie Willow is killed", "Briana gets a mysterious envelope", "Pam agrees to tell Levon the truth"], p.cue("By episode six"))]
    lx0, lx1, ly = 220, W - 220, 300
    prog = appear(t, 0.4, max(1, p.cue("By episode six") + 1))
    layer(img, 1, lambda d, l: d.line([(lx0, ly), (lx0 + (lx1 - lx0) * prog, ly)], fill=RED + (255,), width=6))
    for i, (head, items, t0) in enumerate(beats):
        a = appear(t, t0)
        cx = lx0 + (lx1 - lx0) * (i + 0.5) / 3
        def fn(d, l, head=head, items=items, cx=cx, a=a):
            d.ellipse([cx - 18, ly - 18, cx + 18, ly + 18], fill=RED, outline=BONE, width=4)
            y0 = ly + 60 + (1 - a) * 40
            d.rounded_rectangle([cx - 235, y0, cx + 235, y0 + 90 + 80 * len(items)], radius=16, fill=(14, 14, 20, 225), outline=(110, 25, 25), width=2)
            text_c(d, (cx, y0 + 42), head, font(SANS, 32), (240, 100, 100))
            for j, it in enumerate(items):
                for k, ln in enumerate(wrap(it, font(SANS_R, 28), 410)):
                    d.text((cx - 210, y0 + 92 + j * 80 + k * 34), ("• " if k == 0 else "  ") + ln, font=font(SANS_R, 28), fill=BONE)
        layer(img, a, fn)


def L4_twist(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=4)
    a = appear(t, 0.2, 0.6)
    lines = [("FORMER LIFE:", "nightclub singer", p.cue("nightclub")),
             ("HUSBAND:", "Elias (Hamish Linklater)", p.cue("married")),
             ("INCIDENT:", "heavy bleeding while pregnant", p.cue("While she")),
             ("TREATMENT:", "experimental fertility program", p.cue("Desperate")),
             ("SUBJECT:", "Jason - radiation + drugs, pre-birth", p.cue("The experiments"))]

    def paper(d, l):
        x0, y0 = W / 2 - 620, 150 + (1 - a) * 60
        d.rounded_rectangle([x0, y0, x0 + 1240, y0 + 760], radius=10, fill=(214, 200, 168, 255), outline=(120, 100, 70, 255), width=3)
        d.rectangle([x0 + 40, y0 - 30, x0 + 360, y0 + 10], fill=(214, 200, 168, 255))
        d.text((x0 + 60, y0 + 40), "BELLFLOWER", font=font(MONO, 40), fill=(40, 30, 20))
        d.text((x0 + 60, y0 + 92), "SUBJECT FILE: VOORHEES, PAMELA", font=font(MONO, 34), fill=(40, 30, 20))
        d.line([(x0 + 60, y0 + 150), (x0 + 1180, y0 + 150)], fill=(90, 70, 50), width=3)
        for i, (k, v, t0) in enumerate(lines):
            if t >= t0:
                n = int(min(len(v), (t - t0) * 40))  # typewriter
                d.text((x0 + 60, y0 + 190 + i * 70), k, font=font(MONO, 32), fill=(110, 20, 20))
                d.text((x0 + 380, y0 + 190 + i * 70), v[:n], font=font(MONO, 32), fill=(30, 25, 20))
    layer(img, a, paper)
    ts = p.cue("Project Argonaut")
    if t >= ts:
        k = min(1, (t - ts) / 0.25)
        sc = 2.2 - 1.2 * k
        st = Image.new("RGBA", (900, 200))
        sd = ImageDraw.Draw(st)
        sd.rounded_rectangle([10, 10, 890, 190], radius=12, outline=(190, 20, 20, 230), width=10)
        text_c(sd, (450, 100), "PROJECT ARGONAUT", font(MONO, 78), (190, 20, 20, 230))
        st = st.rotate(-8, expand=True, resample=Image.BICUBIC).resize((int(980 * sc * 0.75), int(330 * sc * 0.75)))
        st.putalpha(st.getchannel("A").point(lambda v: int(v * k)))
        img.alpha_composite(st, (int(W / 2 - st.width / 2 + 120), int(H * 0.73 - st.height / 2)))


def L5_why(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=False, seed=5)
    layer(img, 1, lambda d, l: d.rectangle([0, 0, W, H], fill=(0, 0, 0, 120)))
    layer(img, appear(t, 0.2), lambda d, l: text_c(d, (W / 2, 120), "HOW DID JASON SURVIVE?", font(SERIF, 80), RED + (255,), 2))
    steps = [("DROWNS", "Camp Crystal Lake", p.cue("Jason never")),
             ("HEALS", "Argonaut regeneration", p.cue("Argonaut gave")),
             ("ESCAPES", "grows up in the woods", p.cue("He crawled")),
             ("GROWS", "huge, fast", p.cue("The treatment"))]
    for i, (a1, a2, t0) in enumerate(steps):
        a = appear(t, t0)
        cx = 300 + i * 440
        def fn(d, l, a1=a1, a2=a2, cx=cx, i=i, a=a):
            d.rounded_rectangle([cx - 180, 390, cx + 180, 610], radius=20, fill=(14, 14, 20, 230), outline=RED, width=4)
            text_c(d, (cx, 470), a1, font(SANS, 52), BONE)
            text_c(d, (cx, 545), a2, font(SANS_R, 28), (200, 200, 210))
            if i < 3:
                d.polygon([(cx + 200, 485), (cx + 245, 500), (cx + 200, 515)], fill=RED)
                d.line([(cx + 186, 500), (cx + 210, 500)], fill=RED, width=8)
        layer(img, a, fn)
    tq = p.cue("forty-year-old")
    layer(img, appear(t, tq) * (1 - appear(t, p.cue("Argonaut gave"), 0.3)),
          lambda d, l: text_c(d, (W / 2, 760), "A 40-year-old mystery from Friday the 13th Part 2", font(SANS, 38), (240, 110, 110, 255), 2))
    layer(img, appear(t, p.cue("while Pam")),
          lambda d, l: text_c(d, (W / 2, 760), "...while Pam believed her son was dead.", font(SERIF, 54), BONE + (255,), 3))


def L6_finale(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, seed=6)
    tj = p.cue("Then, he arrives")
    shots = p.cue("a shootout")
    if shots <= t < shots + 2.2 and int(t * 12) % 3 == 0:
        layer(img, 1, lambda d, l: d.rectangle([0, 0, W, H], fill=(255, 220, 180, 60)))
    beats = [("Elias and his men arrive", p.cue("In the finale")),
             ("Levon refuses to hand Pam over", p.cue("Levon refuses")),
             ("Shootout", p.cue("a shootout")),
             ("Pam surrenders", p.cue("Pam surrenders"))]
    fade = 1 - appear(t, tj, 0.4)
    for i, (s, t0) in enumerate(beats):
        a = appear(t, t0) * fade
        layer(img, a, lambda d, l, s=s, i=i: badge(d, 120, 240 + i * 120, s, font(SANS, 40), BONE, (20, 20, 28), anchor="l"))
    sack_figure(img, A, W * 0.5, H + 40, t, tj)
    layer(img, appear(t, tj + 1.2), lambda d, l: text_c(d, (W / 2, 110), "JASON RETURNS", font(SERIF, 96), RED + (255,), 4))
    tk = p.cue("Jason crushes")
    if t >= tk:
        layer(img, appear(t, tk, 0.15), lambda d, l: badge(d, W * 0.8, H * 0.5, "ELIAS: DEAD", font(SANS, 48), (255, 255, 255), BLOOD))


def L7_ending(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=7)
    beats = [("He starts to strangle Pam...", p.cue("Then Jason")),
             ("...remembers her love, and lets go", p.cue("But he remembers")),
             ("Crazy Ralph shoots him in the head", p.cue("Crazy Ralph")),
             ("Jason escapes into the woods", p.cue("Jason escapes"))]
    tq = p.cue("And Pam?")
    fade = 1 - appear(t, tq, 0.4)
    for i, (s, t0) in enumerate(beats):
        a = appear(t, t0) * fade
        layer(img, a, lambda d, l, s=s, i=i, a=a: badge(d, W / 2 - (1 - a) * 60, 250 + i * 150, s, font(SANS, 46), BONE, (20, 20, 28)))
    if t >= p.cue("Crazy Ralph", 1.2) and t < p.cue("Crazy Ralph", 1.4):
        layer(img, 1, lambda d, l: d.rectangle([0, 0, W, H], fill=(255, 255, 255, 140)))
    a = appear(t, tq + 0.3, 0.8)
    layer(img, a, lambda d, l: (text_c(d, (W / 2, H / 2 - 60), "“These woods belong to us.”", font(SERIF, 96), (240, 40, 36, 255), 3),
                                text_c(d, (W / 2, H / 2 + 60), "- Pam, laughing, proud of her son", font(SANS_R, 40), BONE + (255,), 2)))


def L8_final_shot(img, A, t, p):
    W, H = A.W, A.H
    img.paste((4, 4, 8, 255), (0, 0, W, H))
    d = ImageDraw.Draw(img)
    rnd = random.Random(11)
    for i in range(40):  # dark tree trunks
        x = rnd.uniform(0, W)
        w = rnd.uniform(14, 50)
        c = rnd.randrange(10, 22)
        d.rectangle([x, 0, x + w, H], fill=(c, c, c + 4))
    campfire(img, W / 2, H * 0.78, 1.0, t)
    img.alpha_composite(A.mist.crop((int(t * 10) % 2600, 0, int(t * 10) % 2600 + W, H)))
    eyes_in_trees(img, W * 0.86, H * 0.36, 1.0, t, p.cue("someone watching"))
    layer(img, appear(t, p.cue("The show never")) * (1 - appear(t, p.cue("Levon's fate"), 0.4)),
          lambda d, l: text_c(d, (W / 2, 140), "JASON... OR PAM?", font(SERIF, 96), RED + (255,), 3))
    fates = [("ELIAS", "DEAD", BLOOD), ("LEVON", "UNKNOWN", (90, 90, 40)), ("PAM", "ALIVE", (20, 90, 50)), ("JASON", "ALIVE", (20, 90, 50))]
    t0 = p.cue("Levon's fate")
    for i, (n, s, c) in enumerate(fates):
        a = appear(t, t0 + i * 0.35)
        x = W / 2 + (i - 1.5) * 380
        layer(img, a, lambda d, l, n=n, s=s, c=c, x=x: (d.rounded_rectangle([x - 165, 80, x + 165, 240], radius=16, fill=(14, 14, 20, 235), outline=c, width=4),
                                                        text_c(d, (x, 125), n, font(SANS, 40), BONE),
                                                        badge(d, x, 195, s, font(SANS, 32), (255, 255, 255), c)))


def L9_outro(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=9)
    layer(img, appear(t, 0.2), lambda d, l: text_c(d, (W / 2, 150), "SEASON 2?", font(SERIF, 110), RED + (255,), 3))
    layer(img, appear(t, 0.8), lambda d, l: badge(d, W / 2, 270, "NOT ANNOUNCED YET", font(SANS, 40), BONE, (40, 40, 50)))
    pieces = [("A mother hungry for revenge", p.cue("a mother")), ("A son who cannot die", p.cue("a son")), ("A camp full of counselors", p.cue("a camp"))]
    tp = p.cue("So, was")
    for i, (s, t0) in enumerate(pieces):
        layer(img, appear(t, t0) * (1 - appear(t, tp, 0.4)), lambda d, l, s=s, i=i: text_c(d, (W / 2, 420 + i * 100), s, font(SANS, 54), BONE + (255,), 2))
    a = appear(t, tp)
    layer(img, a, lambda d, l: (badge(d, W / 2 - 360, 500, "SMART FIX", font(SANS, 60), (255, 255, 255), (30, 110, 60)),
                                text_c(d, (W / 2, 500), "or", font(SANS_R, 50), BONE),
                                badge(d, W / 2 + 400, 500, "KEEP THE MYSTERY", font(SANS, 60), (255, 255, 255), BLOOD),
                                text_c(d, (W / 2, 630), "Tell me in the comments", font(SANS, 44), BONE, 2)))
    ts = p.cue("subscribe")
    if t >= ts:
        pulse = 1 + 0.06 * math.sin((t - ts) * 6)
        layer(img, appear(t, ts, 0.3), lambda d, l: badge(d, W / 2, 790, "SUBSCRIBE", font(SANS, int(60 * pulse)), (255, 255, 255), (220, 20, 20), pad=30))


LONG_SCENES = [L0_hook, L1_setup, L2_cast, L3_breakdown, L4_twist, L5_why, L6_finale, L7_ending, L8_final_shot, L9_outro]


# ---------------------------------------------------------------- short scenes (1080x1920)
def S0(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t)
    title_logo(img, W / 2, H * 0.12, 116, t, 0.0)
    layer(img, appear(t, 0.6), lambda d, l: text_c(d, (W / 2, H * 0.19), "HOW JASON SURVIVED", font(SANS, 64), BONE + (255,), 4))
    layer(img, appear(t, p.cue("Spoilers"), 0.2), lambda d, l: badge(d, W / 2, H * 0.25, "SPOILERS", font(SANS, 54)))


def S1(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=1)
    a = appear(t, 0.1)
    rows = [("WAS:", "nightclub singer", p.cue("Pam")), ("HUSBAND:", "Elias", p.cue("married")),
            ("WHY:", "save her pregnancy", p.cue("To save")), ("RESULT:", "Jason heals fast", p.cue("It gave"))]

    def paper(d, l):
        x0, y0 = 90, 260 + (1 - a) * 60
        d.rounded_rectangle([x0, y0, W - 90, y0 + 820], radius=10, fill=(214, 200, 168, 255), outline=(120, 100, 70, 255), width=3)
        d.text((x0 + 50, y0 + 40), "BELLFLOWER", font=font(MONO, 50), fill=(40, 30, 20))
        d.text((x0 + 50, y0 + 105), "FILE: VOORHEES", font=font(MONO, 40), fill=(40, 30, 20))
        d.line([(x0 + 50, y0 + 170), (W - 140, y0 + 170)], fill=(90, 70, 50), width=3)
        for i, (k, v, t0) in enumerate(rows):
            if t >= t0:
                n = int(min(len(v), (t - t0) * 30))
                d.text((x0 + 50, y0 + 210 + i * 140), k, font=font(MONO, 40), fill=(110, 20, 20))
                d.text((x0 + 50, y0 + 260 + i * 140), v[:n], font=font(MONO, 50), fill=(30, 25, 20))
    layer(img, a, paper)
    ts = p.cue("Project Argonaut")
    if t >= ts:
        k = min(1, (t - ts) / 0.25)
        st = Image.new("RGBA", (900, 200))
        sd = ImageDraw.Draw(st)
        sd.rounded_rectangle([10, 10, 890, 190], radius=12, outline=(190, 20, 20, 235), width=10)
        text_c(sd, (450, 100), "PROJECT ARGONAUT", font(MONO, 78), (190, 20, 20, 235))
        sc = 1.6 - 0.6 * k
        st = st.rotate(-8, expand=True, resample=Image.BICUBIC)
        st = st.resize((int(st.width * sc * 0.95), int(st.height * sc * 0.95)))
        st.putalpha(st.getchannel("A").point(lambda v: int(v * k)))
        img.alpha_composite(st, (int(W / 2 - st.width / 2), int(1180 - st.height / 2)))


def S2(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, seed=2)
    layer(img, appear(t, 0.1), lambda d, l: text_c(d, (W / 2, H * 0.14), "HE NEVER DIED", font(SERIF, 104), RED + (255,), 5))
    sack_figure(img, A, W / 2, H * 0.64, t, 0.4, scale=0.75)


def S3(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=3)
    beats = [("CRUSHES HIS FATHER", p.cue("crushes")), ("SPARES HIS MOTHER", p.cue("spares")),
             ("BULLET TO THE HEAD", p.cue("takes a bullet")), ("WALKS AWAY", p.cue("walks away"))]
    tq = p.cue("Pam just")
    fade = 1 - appear(t, tq, 0.3)
    sack_figure(img, A, W / 2, H * 0.62, t, 0.0, scale=0.55, eye=True)
    for i, (s, t0) in enumerate(beats):
        a = appear(t, t0, 0.3) * fade
        layer(img, a, lambda d, l, s=s, i=i: badge(d, W / 2, 230 + i * 120, s, font(SANS, 56), BONE, (20, 20, 28)))
    if p.cue("takes a bullet", 0.8) <= t < p.cue("takes a bullet", 1.0):
        layer(img, 1, lambda d, l: d.rectangle([0, 0, W, H], fill=(255, 255, 255, 150)))
    layer(img, appear(t, tq + 0.2), lambda d, l: (text_c(d, (W / 2, 330), "THE WOODS", font(SERIF, 130), RED + (255,), 5),
                                                text_c(d, (W / 2, 470), "ARE THEIRS", font(SERIF, 130), RED + (255,), 5)))


def S4(img, A, t, p):
    W, H = A.W, A.H
    background(img, A, t, dim=True, seed=4)
    layer(img, appear(t, 0.0, 0.3), lambda d, l: (badge(d, W / 2, 380, "SMART FIX?", font(SANS, 80), (255, 255, 255), (30, 110, 60)),
                                                  text_c(d, (W / 2, 520), "or", font(SANS_R, 60), BONE),
                                                  badge(d, W / 2, 660, "RUINED THE MYSTERY?", font(SANS, 72), (255, 255, 255), BLOOD)))


SHORT_SCENES = [S0, S1, S2, S3, S4]


# ---------------------------------------------------------------- pipeline
CFG = {"long": (1920, 1080, 0.58, LONG_SCENES, False, (0.88, 0.4)), "short": (1080, 1920, 0.42, SHORT_SCENES, True, (0.5, 0.6))}
G = {}


def render_scene(args):
    i, out = args
    W, H, _, scenes, vertical, _ = G["cfg"]
    A, p = G["assets"], G["paras"][i]
    n = int(round(p.dur * FPS))
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", out],
                          stdin=subprocess.PIPE)
    for f in range(n):
        t = f / FPS
        img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
        scenes[i](img, A, t, p)
        img.alpha_composite(A.vig)
        captions(img, p, t, W, H, vertical)
        # quick fade between scenes
        k = min(1, t / 0.25, (p.dur - t) / 0.25)
        if k < 1:
            img.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, int(255 * (1 - k)))))
        ff.stdin.write(img.convert("RGB").tobytes())
    ff.stdin.close()
    ff.wait()
    return out


def main():
    mode, vo_dir, script, out = sys.argv[1:5]
    G["cfg"] = CFG[mode]
    W, H, horizon, scenes, vertical, moon = G["cfg"]
    texts = [x.strip() for x in open(script).read().split("\n\n") if x.strip()]
    paras, start = [], 0.0
    for i, tx in enumerate(texts):
        p = Para(tx, wav_len(f"{vo_dir}/{i:02d}.wav"), start)
        paras.append(p)
        start += p.dur
    assert len(paras) == len(scenes), (len(paras), len(scenes))
    G["paras"] = paras
    G["assets"] = Assets(W, H, horizon, moon)
    work = out + "_parts"
    os.makedirs(work, exist_ok=True)
    only = os.environ.get("ONLY")
    idx = [int(x) for x in only.split(",")] if only else range(len(scenes))
    jobs = [(i, f"{work}/s{i:02d}.mp4") for i in idx]
    with Pool(4) as pool:
        for r in pool.imap_unordered(render_scene, jobs):
            print("done", r, flush=True)
    if only:
        return
    # narration track: LEAD silence + paragraph + TAIL silence, back to back
    parts = []
    for i, p in enumerate(paras):
        parts.append(f"[{i}:a]aresample=48000,adelay={int(LEAD * 1000)}:all=1,apad=whole_dur={p.dur:.3f}[a{i}]")
    inputs = sum([["-i", f"{vo_dir}/{i:02d}.wav"] for i in range(len(paras))], [])
    total = start
    fc = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(len(paras))) + f"concat=n={len(paras)}:v=0:a=1[vo]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "[vo]", f"{work}/vo.wav"], check=True)
    # ambient drone under the voice
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                    "-f", "lavfi", "-i", f"anoisesrc=color=brown:amplitude=0.5:d={total:.2f}:r=48000",
                    "-f", "lavfi", "-i", f"sine=f=55:d={total:.2f}:r=48000",
                    "-filter_complex", "[0]lowpass=f=180,volume=0.10[n];[1]volume=0.05,tremolo=f=0.2:d=0.6[s];[n][s]amix=inputs=2:normalize=0,afade=t=in:d=2,afade=t=out:st=" + f"{total - 3:.2f}:d=3[amb]",
                    "-map", "[amb]", f"{work}/amb.wav"], check=True)
    with open(f"{work}/list.txt", "w") as fh:
        for i in range(len(scenes)):
            fh.write(f"file 's{i:02d}.mp4'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{work}/list.txt",
                    "-i", f"{work}/vo.wav", "-i", f"{work}/amb.wav",
                    "-filter_complex", "[1]volume=1.0[v];[2]volume=0.8[b];[v][b]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out], check=True)
    print("wrote", out, round(total, 1), "s")


if __name__ == "__main__":
    main()
