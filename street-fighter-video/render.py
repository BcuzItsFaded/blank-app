"""Render the 1080x1920 Short: original motion graphics synced to the narration.

  python render.py stills 2.5 9 33     # preview PNGs at those times
  python render.py                     # full render + audio mix
"""
import math
import os
import random
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from cues import BUILD, CUE, DURATION, SCENE_START, SCENES, caption_chunks, w

W, H, FPS = 1080, 1920, 30
OUT = os.path.join(os.path.dirname(BUILD), "street_fighter_2026_ending_explained.mp4")

INTER = "/usr/share/fonts/opentype/inter"
HEAD = f"{INTER}/InterDisplay-BlackItalic.otf"
CAPF = f"{INTER}/InterDisplay-Black.otf"
BODY = f"{INTER}/Inter-ExtraBold.otf"
MONO = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"
CJK = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"

WHITE, BLACK = (255, 255, 255), (0, 0, 0)
YELLOW, RED, ORANGE = (255, 214, 10), (235, 30, 45), (255, 120, 20)
PURPLE, GOLD, GREEN = (150, 60, 255), (255, 190, 40), (60, 200, 90)
FIRE_GRAD = ((255, 240, 150), (255, 120, 20))
GOLD_GRAD = ((255, 240, 160), (255, 160, 0))
RED_GRAD = ((255, 130, 110), (200, 0, 0))
PURPLE_GRAD = ((255, 150, 255), (140, 30, 220))

CAPTION_Y = 1340

PALETTES = {  # top, bottom, accent
    "hook": ((12, 16, 46), (0, 0, 0), (255, 140, 30)),
    "spoilers": ((80, 0, 10), (5, 0, 0), YELLOW),
    "flashback": ((74, 52, 30), (14, 9, 4), (255, 200, 120)),
    "akuma": ((70, 4, 4), (5, 0, 0), (255, 60, 40)),
    "trap": ((54, 10, 86), (5, 0, 12), (200, 80, 255)),
    "confession": ((6, 42, 74), (0, 5, 12), (60, 200, 255)),
    "final": ((74, 46, 4), (6, 3, 0), GOLD),
    "darkryu": ((34, 0, 52), (0, 0, 0), (180, 60, 255)),
    "twist": ((64, 0, 0), (0, 0, 0), (255, 40, 40)),
    "credits": ((8, 8, 12), (0, 0, 0), (140, 140, 150)),
    "sagat": ((96, 38, 0), (6, 2, 0), (255, 170, 40)),
    "cta": ((16, 16, 64), (0, 0, 0), YELLOW),
}


# ---------- math ----------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, t0, dur):
    return clamp((t - t0) / dur)


def lerp(a, b, p):
    return a + (b - a) * p


def ease_out(p):
    return 1 - (1 - p) ** 3


def ease_in_out(p):
    return 3 * p * p - 2 * p * p * p


def ease_back(p, s=1.9):
    p -= 1
    return 1 + (s + 1) * p ** 3 + s * p ** 2


def rgba(c, a=255):
    return tuple(c[:3]) + (a,)


# ---------- sprites ----------

@lru_cache(maxsize=None)
def font(path, size):
    return ImageFont.truetype(path, size)


@lru_cache(maxsize=None)
def vgrad(w, h, top, bot):
    k = np.linspace(0, 1, h)[:, None, None]
    col = np.array(top, float) * (1 - k) + np.array(bot, float) * k
    arr = np.ascontiguousarray(np.broadcast_to(col, (h, w, 3))).astype(np.uint8)
    return Image.fromarray(arr, "RGB").convert("RGBA")


@lru_cache(maxsize=4096)
def text_sprite(text, size, fill=WHITE, path=HEAD, stroke=0, grad=None, glow=None, shadow=0, maxw=960):
    f = font(path, size)
    while size > 24 and f.getbbox(text, stroke_width=stroke)[2] - f.getbbox(text, stroke_width=stroke)[0] > maxw:
        size -= 4
        f = font(path, size)
    gpad = glow[1] * 3 if glow else 0
    pad = stroke + gpad + shadow + size // 8 + 10
    bb = f.getbbox(text, stroke_width=stroke)
    w, h = bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad
    org = (pad - bb[0], pad - bb[1])
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    def mask(width, offset=(0, 0)):
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).text((org[0] + offset[0], org[1] + offset[1]), text, font=f,
                               fill=255, stroke_width=width, stroke_fill=255)
        return m

    if glow:
        g = Image.new("RGBA", (w, h), rgba(glow[0], 0))
        g.putalpha(mask(stroke + 6).filter(ImageFilter.GaussianBlur(glow[1])))
        img.alpha_composite(g)
        img.alpha_composite(g)
    if shadow:
        s = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        s.putalpha(mask(stroke, (shadow, shadow)).point(lambda v: v * 3 // 4))
        img.alpha_composite(s)
    if stroke:
        s = Image.new("RGBA", (w, h), rgba(BLACK))
        s.putalpha(mask(stroke))
        img.alpha_composite(s)
    fillimg = vgrad(w, h, grad[0], grad[1]).copy() if grad else Image.new("RGBA", (w, h), rgba(fill))
    fillimg.putalpha(mask(0))
    img.alpha_composite(fillimg)
    return img


@lru_cache(maxsize=512)
def pill(text, bg, fg=WHITE, size=44, path=BODY):
    f = font(path, size)
    bb = f.getbbox(text)
    padx, pady = int(size * 0.75), int(size * 0.38)
    w, h = bb[2] - bb[0] + 2 * padx, bb[3] - bb[1] + 2 * pady
    img = Image.new("RGBA", (w + 24, h + 30), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((12, 20, 12 + w, 20 + h), radius=h // 2, fill=(0, 0, 0, 140))
    d.rounded_rectangle((12, 12, 12 + w, 12 + h), radius=h // 2, fill=rgba(bg))
    d.text((12 + padx - bb[0], 12 + pady - bb[1]), text, font=f, fill=rgba(fg))
    return img


@lru_cache(maxsize=64)
def stamp(text, color, size=130, rot=-7):
    t = text_sprite(text, size, color, HEAD, stroke=4)
    f = font(HEAD, size)
    bb = f.getbbox(text)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    bw, bh = tw + 110, th + 90
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((8, 8, bw - 8, bh - 8), radius=22, fill=(0, 0, 0, 150), outline=rgba(color), width=14)
    img.alpha_composite(t, (bw // 2 - t.width // 2, bh // 2 - t.height // 2))
    return img.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)


@lru_cache(maxsize=4)
def orb(radius, palette, falloff=1.2):
    s = radius * 2
    yy, xx = np.mgrid[0:s, 0:s]
    r = np.sqrt((xx - radius + 0.5) ** 2 + (yy - radius + 0.5) ** 2) / radius
    a = np.clip(1 - r, 0, 1) ** falloff
    stops = np.array([p[0] for p in palette])
    cols = np.array([p[1] for p in palette], float)
    rgb = np.stack([np.interp(r, stops, cols[:, k]) for k in range(3)], -1)
    return Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA")


FIRE = ((0, (255, 255, 235)), (0.22, (255, 235, 130)), (0.5, (255, 140, 30)),
        (0.8, (220, 40, 10)), (1, (110, 0, 0)))
VOID = ((0, (255, 240, 255)), (0.25, (225, 160, 255)), (0.55, (140, 40, 240)),
        (0.85, (60, 0, 120)), (1, (20, 0, 40)))


@lru_cache(maxsize=48)
def bust(eyepatch=False, scar=0, rim=ORANGE, eye=None):
    """A bald fighter's silhouette. Scar is 0..10 (how much of it is drawn)."""
    bw, bh = 800, 920
    m = Image.new("L", (bw, bh), 0)
    d = ImageDraw.Draw(m)
    d.polygon([(30, bh), (45, 760), (80, 670), (150, 615), (265, 570), (335, 545), (340, 450),
               (460, 450), (465, 545), (535, 570), (650, 615), (720, 670), (755, 760), (770, bh)], fill=255)
    d.ellipse((60, 600, 250, 770), fill=255)
    d.ellipse((550, 600, 740, 770), fill=255)
    d.ellipse((278, 160, 522, 480), fill=255)
    d.ellipse((262, 290, 300, 372), fill=255)
    d.ellipse((500, 290, 538, 372), fill=255)
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    glow = Image.new("RGBA", (bw, bh), rgba(rim, 0))
    glow.putalpha(m.filter(ImageFilter.GaussianBlur(24)).point(lambda v: min(255, int(v * 1.5))))
    img.alpha_composite(glow)
    body = vgrad(bw, bh, (40, 34, 40), (8, 8, 10)).copy()
    body.putalpha(m)
    img.alpha_composite(body)
    edge = ImageChops.subtract(m, m.filter(ImageFilter.MinFilter(9)))
    e = Image.new("RGBA", (bw, bh), rgba(rim, 0))
    e.putalpha(edge.point(lambda v: int(v * 0.9)))
    img.alpha_composite(e)
    d = ImageDraw.Draw(img)
    if eyepatch:
        d.line((268, 318, 330, 322), fill=(84, 76, 84, 255), width=10)
        d.line((388, 312, 512, 236), fill=(84, 76, 84, 255), width=10)
        d.ellipse((322, 300, 394, 354), fill=(6, 6, 8, 255), outline=(110, 100, 110, 255), width=4)
    if eye:
        g = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse((428, 310, 472, 338), fill=rgba(eye))
        g = g.filter(ImageFilter.GaussianBlur(9))
        img.alpha_composite(g)
        img.alpha_composite(g)
        d.ellipse((442, 318, 458, 330), fill=(255, 255, 255, 255))
    if scar:
        p = scar / 10
        x0, y0, x1, y1 = 215, 600, 600, 905
        xe, ye = x0 + (x1 - x0) * p, y0 + (y1 - y0) * p
        g = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
        ImageDraw.Draw(g).line((x0, y0, xe, ye), fill=(255, 70, 30, 255), width=36)
        g = g.filter(ImageFilter.GaussianBlur(14))
        img.alpha_composite(g)
        img.alpha_composite(g)
        d.line((x0, y0, xe, ye), fill=(255, 200, 150, 255), width=10)
    return img


BUST_HEAD = (400 - 400, 320 - 460)   # head centre relative to the bust sprite centre
BUST_EYE = (450 - 400, 324 - 460)
BUST_PATCH = (358 - 400, 327 - 460)
BUST_SCAR = (420 - 400, 760 - 460)


@lru_cache(maxsize=2)
def ticket():
    tw, th = 760, 400
    img = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, tw - 1, th - 1), radius=26, fill=(250, 238, 210, 255))
    d.rounded_rectangle((16, 16, tw - 17, th - 17), radius=18, outline=(190, 20, 30, 255), width=6)
    lines = [("OFFICIAL INVITATION", BODY, 36, (190, 20, 30), 70),
             ("WORLD WARRIOR", HEAD, 78, (20, 20, 20), 150),
             ("TOURNAMENT  ·  1987", BODY, 36, (60, 50, 40), 225),
             ("KEN MASTERS", HEAD, 66, (150, 10, 20), 310)]
    for text, path, size, col, y in lines:
        f = font(path, size)
        bb = f.getbbox(text)
        d.text((tw / 2 - (bb[2] - bb[0]) / 2 - bb[0], y - (bb[3] - bb[1]) / 2 - bb[1]), text, font=f, fill=rgba(col))
    return img


@lru_cache(maxsize=2)
def ticket_halves():
    tk = ticket()
    m = Image.new("L", tk.size, 0)
    rng = random.Random(3)
    pts = [(0, 0), (tk.width // 2 + 10, 0)]
    for y in range(0, tk.height + 20, 20):
        pts.append((tk.width // 2 + rng.randint(-26, 26), y))
    pts += [(tk.width // 2, tk.height), (0, tk.height)]
    ImageDraw.Draw(m).polygon(pts, fill=255)
    a = tk.getchannel("A")
    left, right = tk.copy(), tk.copy()
    left.putalpha(ImageChops.multiply(a, m))
    right.putalpha(ImageChops.multiply(a, ImageChops.invert(m)))
    return left, right


@lru_cache(maxsize=2)
def hazard(w=1500, h=110):
    img = Image.new("RGBA", (w, h), rgba(YELLOW))
    d = ImageDraw.Draw(img)
    for x in range(-h, w + h, 90):
        d.polygon([(x, 0), (x + 45, 0), (x + 45 - h, h), (x - h, h)], fill=(15, 15, 15, 255))
    return img


@lru_cache(maxsize=200)
def hazard_band(off, angle):
    return hazard().crop((off, 0, off + 1300, 110)).rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)


CAST = [("DIRECTED BY", "KITAO SAKURAI"), ("KEN MASTERS", "NOAH CENTINEO"), ("RYU", "ANDREW KOJI"),
        ("CHUN-LI", "CALLINA LIANG"), ("AKUMA", "ROMAN REIGNS"), ("M. BISON", "DAVID DASTMALCHIAN"),
        ("GUILE", "CODY RHODES"), ("BLANKA", "JASON MOMOA"), ("DAN HIBIKI", "ANDREW SCHULZ"),
        ("DHALSIM", "VIDYUT JAMMWAL"), ("VEGA", "ORVILLE PECK"), ("BALROG", "50 CENT"),
        ("CAMMY", "MEL JARNSON"), ("JULI", "RAYNA VALLANDINGHAM"), ("JOE", "ALEXANDER VOLKANOVSKI"),
        ("E. HONDA", "HIROOKI GOTO"), ("ZANGIEF", "OLIVIER RICHTERS"), ("GOUKEN", "DON LEE")]


@lru_cache(maxsize=1)
def credits_sprite():
    cw, row = 900, 120
    img = Image.new("RGBA", (cw, row * len(CAST) + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, (role, name) in enumerate(CAST):
        for text, path, size, col, dy in ((role, BODY, 28, (150, 150, 160), 0), (name, BODY, 46, WHITE, 40)):
            f = font(path, size)
            bb = f.getbbox(text)
            d.text((cw / 2 - (bb[2] - bb[0]) / 2 - bb[0], i * row + dy), text, font=f, fill=rgba(col))
    return img


# ---------- compositing ----------

ALPHA_LUT = [[int(v * k / 40) for v in range(256)] for k in range(41)]


def put(frame, spr, cx, cy, scale=1.0, alpha=1.0, rot=0.0):
    if alpha <= 0.02 or scale <= 0.02:
        return
    s = spr
    if abs(scale - 1) > 0.005:
        s = s.resize((max(1, int(s.width * scale)), max(1, int(s.height * scale))), Image.Resampling.BILINEAR)
    if abs(rot) > 0.05:
        s = s.rotate(rot, resample=Image.Resampling.BILINEAR, expand=True)
    if alpha < 0.98:
        s = s.copy()
        s.putalpha(s.getchannel("A").point(ALPHA_LUT[int(alpha * 40)]))
    x0, y0 = int(cx - s.width / 2), int(cy - s.height / 2)
    sx, sy = max(0, -x0), max(0, -y0)
    ex, ey = min(s.width, W - x0), min(s.height, H - y0)
    if ex <= sx or ey <= sy:
        return
    if (sx, sy, ex, ey) != (0, 0, s.width, s.height):
        s = s.crop((sx, sy, ex, ey))
    frame.alpha_composite(s, dest=(x0 + sx, y0 + sy))


def show(f, spr, x, y, t, t0, until=None, style="pop", out=0.18):
    """Animate a sprite in at t0 and (optionally) out at `until`."""
    if t < t0 or (until is not None and t >= until + out):
        return
    dy = 0
    if style == "slam":
        p = ease_out(prog(t, t0, 0.2))
        s, a = lerp(2.0, 1, p), min(1, p * 1.6)
    elif style == "pop":
        p = prog(t, t0, 0.28)
        s, a = lerp(0.4, 1, ease_back(p)), min(1, p * 2.2)
    else:  # rise
        p = ease_out(prog(t, t0, 0.3))
        s, a, dy = 1, p, lerp(70, 0, p)
    if until is not None and t > until:
        q = (t - until) / out
        a *= 1 - q
        s *= 1 + 0.12 * q
    put(f, spr, x, y + dy, scale=s, alpha=a)


def glitch_put(f, spr, cx, cy, t, amount, scale=1.0):
    """Sprite cut into horizontal slices that jitter, plus an RGB split."""
    if scale != 1:
        spr = spr.resize((int(spr.width * scale), int(spr.height * scale)), Image.Resampling.BILINEAR)
    rng = random.Random(int(t * FPS))
    strips = 7
    sh = spr.height // strips
    for k in range(strips):
        piece = spr.crop((0, k * sh, spr.width, (k + 1) * sh if k < strips - 1 else spr.height))
        dx = rng.randint(-amount, amount) if rng.random() < 0.6 else 0
        put(f, piece, cx + dx, cy - spr.height / 2 + k * sh + piece.height / 2)


@lru_cache(maxsize=None)
def rays(k, steps=48, n=28):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    cx, cy, L = W / 2, 760, 2400
    base = (2 * math.pi / n) * (k / steps)
    for j in range(n):
        a = base + j * 2 * math.pi / n
        d.polygon([(cx, cy), (cx + L * math.cos(a - 0.045), cy + L * math.sin(a - 0.045)),
                   (cx + L * math.cos(a + 0.045), cy + L * math.sin(a + 0.045))], fill=26)
    return m


@lru_cache(maxsize=1)
def vignette():
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W * 0.72)) ** 2 + ((yy - H * 0.42) / (H * 0.62)) ** 2)
    return Image.fromarray((np.clip((r - 0.5) / 0.65, 0, 1) ** 1.6 * 215).astype(np.uint8), "L")


@lru_cache(maxsize=1)
def scanlines():
    a = np.zeros((H, W), np.uint8)
    a[::4] = 70
    a[1::4] = 70
    return Image.fromarray(a, "L")


_rng = random.Random(11)
PARTS = [(_rng.uniform(0, W), _rng.uniform(0, H), _rng.uniform(40, 160), _rng.uniform(10, 50),
          _rng.uniform(0, 6.28), _rng.uniform(1.5, 4.5), _rng.uniform(0.35, 1.0)) for _ in range(46)]


def background(name, t, i):
    top, bot, acc = PALETTES[name]
    f = vgrad(W, H, top, bot).copy()
    if name != "credits":
        f.paste(rgba(acc), mask=rays(i % 48))
    d = ImageDraw.Draw(f)
    for x0, y0, sp, amp, ph, r, b in PARTS:
        y = (y0 - sp * t) % (H + 40) - 20
        x = x0 + amp * math.sin(t * 1.3 + ph)
        c = tuple(int(lerp(bot[k], acc[k], b)) for k in range(3))
        d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(c))
    return f


def health(d, x0, y0, w, h, level, anchor_right=False):
    d.rectangle((x0 - 5, y0 - 5, x0 + w + 5, y0 + h + 5), fill=(0, 0, 0, 255))
    d.rectangle((x0, y0, x0 + w, y0 + h), fill=(160, 0, 0, 255))
    lw = int(w * clamp(level))
    if lw:
        box = (x0 + w - lw, y0, x0 + w, y0 + h) if anchor_right else (x0, y0, x0 + lw, y0 + h)
        d.rectangle(box, fill=rgba(YELLOW))


def lightning(d, x0, y0, x1, y1, seed, color):
    rng = random.Random(seed)
    pts = [(x0, y0)]
    for k in range(1, 10):
        q = k / 10
        pts.append((x0 + (x1 - x0) * q + rng.uniform(-70, 70), y0 + (y1 - y0) * q + rng.uniform(-20, 20)))
    pts.append((x1, y1))
    d.line(pts, fill=rgba(color), width=12, joint="curve")
    d.line(pts, fill=(255, 255, 255, 255), width=4, joint="curve")


def ring(d, cx, cy, r, width, color):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=rgba(color), width=max(1, int(width)))


def explosion(f, t, t0, cx, cy):
    dt = t - t0
    if dt < 0 or dt > 1.6:
        return
    p = dt / 1.6
    d = ImageDraw.Draw(f)
    ring(d, cx, cy, 80 + 700 * ease_out(p), 34 * (1 - p), (255, 170, 60))
    rng = random.Random(5)
    for k in range(30):
        ang = rng.uniform(0, 2 * math.pi)
        sp = rng.uniform(300, 900)
        x = cx + math.cos(ang) * sp * dt
        y = cy + math.sin(ang) * sp * dt + 500 * dt * dt
        r = rng.uniform(5, 13) * (1 - p)
        d.ellipse((x - r, y - r, x + r, y + r), fill=rgba((255, rng.randint(120, 220), 40)))
    put(f, orb(220, FIRE), cx, cy, scale=0.3 + 2.0 * ease_out(min(1, dt / 0.35)), alpha=1 - p ** 1.4)


def strike(f, spr, cx, cy, t, t0, color=RED):
    p = ease_out(prog(t, t0, 0.22))
    if p <= 0:
        return
    half = spr.width / 2 - 40
    ImageDraw.Draw(f).line((cx - half, cy, cx - half + 2 * half * p, cy), fill=rgba(color), width=14)


def bust_put(f, cx, cy, scale, alpha=1.0, **kw):
    put(f, bust(**kw), cx, cy, scale=scale, alpha=alpha)


def head_pos(cx, cy, scale, rel=BUST_HEAD):
    return cx + rel[0] * scale, cy + rel[1] * scale


# ---------- scenes ----------
C = CUE


def s_hook(f, t):
    out_t = C["mystery"] - 0.15
    for word, y, delay in (("STREET", 500, 0), ("FIGHTER", 700, 0.12)):
        spr = text_sprite(word, 210, YELLOW, HEAD, stroke=10, grad=FIRE_GRAD, glow=((255, 90, 0), 22))
        show(f, spr, W / 2, y, t, C["title"] + delay, until=out_t, style="slam")
    show(f, pill("THE 2026 MOVIE", RED, size=54), W / 2, 870, t, C["title"] + 0.35, until=out_t)
    show(f, text_sprite("ENDING + CREDITS SCENE", 70, WHITE, HEAD, stroke=7), W / 2, 990, t,
         C["title"] + 0.6, until=out_t, style="rise")
    if t >= C["mystery"] - 0.2:
        p = ease_out(prog(t, C["mystery"] - 0.2, 0.5))
        y, sc = lerp(1500, 850, p), 0.92
        bust_put(f, W / 2, y, sc, alpha=p)
        hx, hy = head_pos(W / 2, y, sc)
        show(f, text_sprite("?", 280, YELLOW, HEAD, stroke=10, glow=((255, 140, 0), 24)), hx, hy, t, C["mystery"] + 0.3)
        show(f, text_sprite("WHO IS HE?", 120, WHITE, HEAD, stroke=9, glow=((255, 120, 0), 18)), W / 2, 330, t,
             C["mystery"] + 0.2, style="slam")
    show(f, stamp("STAY FOR THE CREDITS", RED, 76, -6), W / 2, 1130, t, C["stay"], style="slam")


def s_spoilers(f, t):
    off = int(t * 300) % 90
    put(f, hazard_band(off, -5), W / 2, 560)
    put(f, hazard_band(89 - off, -5), W / 2, 1110)
    t0 = C["spoilers"]
    show(f, text_sprite("SPOILER", 210, YELLOW, HEAD, stroke=12, glow=((255, 50, 0), 22)), W / 2, 770, t, t0, style="slam")
    show(f, text_sprite("WARNING", 130, WHITE, HEAD, stroke=10), W / 2, 935, t, t0 + 0.12, style="slam")


def vhs_label(f, t):
    d = ImageDraw.Draw(f)
    d.polygon([(80, 205), (80, 245), (114, 225)], fill=(255, 255, 255, 230))
    d.text((128, 203), "PLAY", font=font(MONO, 44), fill=(255, 255, 255, 230))
    if int(t * 2) % 2 == 0:
        d.ellipse((842, 210, 870, 238), fill=rgba(RED))
    d.text((882, 203), "REC", font=font(MONO, 44), fill=(255, 255, 255, 230))


def s_flashback(f, t):
    akuma = C["akuma"] - 0.08
    if t < akuma:
        vhs_label(f, t)
        if t >= C["y1987"]:
            spr = text_sprite("1987", 330, WHITE, HEAD, stroke=12, grad=((255, 240, 210), (220, 140, 60)),
                              glow=((255, 170, 80), 20))
            p = ease_out(prog(t, C["ryu_wins"] - 0.15, 0.35))
            slam = lerp(1.8, 1, ease_out(prog(t, C["y1987"], 0.2)))
            jitter = int(22 * math.sin(t * 90)) if t < C["y1987"] + 0.4 else 0
            put(f, spr, W / 2 + jitter, lerp(720, 400, p), scale=lerp(1, 0.55, p) * slam)
        show(f, text_sprite("WORLD WARRIOR TOURNAMENT", 52, (255, 225, 180), BODY, stroke=4), W / 2, 575, t,
             C["ryu_wins"], until=akuma, style="rise")
        show(f, text_sprite("RYU WINS", 170, WHITE, HEAD, stroke=10, glow=((255, 180, 90), 18)), W / 2, 715, t,
             C["ryu_wins"] + 0.1, until=akuma, style="slam")
        if t >= C["dark_hadou"]:
            p = ease_back(prog(t, C["dark_hadou"], 0.35))
            put(f, orb(170, VOID, 0.7), W / 2, 935, scale=max(0.02, p * (1 + 0.06 * math.sin(t * 12))))
            show(f, text_sprite("DARK HADOU", 100, (230, 180, 255), HEAD, stroke=8, glow=((150, 40, 255), 22)),
                 W / 2, 1140, t, C["dark_hadou"] + 0.15, until=akuma)
    else:
        put(f, text_sprite("天", 760, (170, 0, 0), CJK), W / 2, 760, alpha=0.32 * ease_out(prog(t, akuma, 0.5)))
        show(f, text_sprite("AKUMA", 220, WHITE, HEAD, stroke=12, grad=RED_GRAD, glow=((255, 0, 0), 24)),
             W / 2, 590, t, akuma, style="slam")
        if t >= C["kills"]:
            p = ease_out(prog(t, C["kills"], 0.12))
            d = ImageDraw.Draw(f)
            x0, y0, x1, y1 = 90, 1010, 990, 720
            d.line((x0, y0, lerp(x0, x1, p), lerp(y0, y1, p)), fill=(255, 40, 40, 255), width=26)
            d.line((x0, y0, lerp(x0, x1, p), lerp(y0, y1, p)), fill=(255, 235, 235, 255), width=8)
            show(f, text_sprite("KILLS GOUKEN", 124, WHITE, HEAD, stroke=10), W / 2, 860, t, C["kills"] + 0.05,
                 style="slam")
            show(f, pill("RYU'S MASTER", (150, 0, 0), size=48), W / 2, 1010, t, C["kills"] + 0.4)


def meter(f, t, cx, cy, level, appear):
    dy = lerp(80, 0, ease_out(appear))
    if appear <= 0:
        return
    put(f, text_sprite("RYU'S POWER", 56, WHITE, HEAD, stroke=6), cx, cy - 90 + dy, alpha=appear)
    d = ImageDraw.Draw(f)
    bw, bh = 820, 76
    x0, y0 = cx - bw / 2, cy - bh / 2 + dy
    d.rounded_rectangle((x0 - 8, y0 - 8, x0 + bw + 8, y0 + bh + 8), radius=20, fill=(0, 0, 0, 255),
                        outline=(255, 255, 255, 255), width=5)
    lw = int((bw - 8) * level)
    if lw > 4:
        bar = vgrad(lw, bh - 8, (230, 150, 255), (110, 20, 200))
        f.alpha_composite(bar, dest=(int(x0 + 4), int(y0 + 4)))
    pct = text_sprite(f"{int(round(level * 100))}%", 52, WHITE, HEAD, stroke=6)
    put(f, pct, cx, cy + 100 + dy, alpha=appear)


def s_trap(f, t):
    bait = C["bait"] - 0.05
    if t < bait + 0.2:
        txt = "6 YEARS LATER"
        n = math.ceil(clamp((t - C["six_years"]) / 0.55) * len(txt))
        if n:
            full = text_sprite(txt, 110, WHITE, HEAD, stroke=8)
            part = text_sprite(txt[:n], 110, WHITE, HEAD, stroke=8)
            a = 1 - clamp((t - bait) / 0.2)
            put(f, part, W / 2 - full.width / 2 + part.width / 2, 520, alpha=a)
    show(f, text_sprite("M. BISON", 190, WHITE, HEAD, stroke=10, grad=PURPLE_GRAD, glow=((170, 40, 255), 24)),
         W / 2, 760, t, C["bison"], until=bait, style="slam")
    show(f, pill("DICTATOR OF SHADALOO", (110, 20, 160), size=46), W / 2, 915, t, C["bison"] + 0.3, until=bait)
    if t >= bait:
        p = ease_out(prog(t, C["machine"] - 0.15, 0.4))
        slam = lerp(2.0, 1, ease_out(prog(t, bait, 0.2)))
        put(f, stamp("IT'S A TRAP", RED, 150), W / 2, lerp(720, 470, p), scale=lerp(1, 0.8, p) * slam)
    if t >= C["machine"] - 0.15:
        level = 1 - 0.92 * ease_in_out(prog(t, C["drains"], 1.4))
        meter(f, t, W / 2, 1000, level, prog(t, C["machine"] - 0.15, 0.3))


def vs_screen(f, t, t0):
    p = ease_out(prog(t, t0, 0.25))
    off = (1 - p) * W
    d = ImageDraw.Draw(f)
    d.polygon([(-off, 430), (W * 0.64 - off, 430), (W * 0.36 - off, 1190), (-off, 1190)], fill=(20, 90, 210, 255))
    d.polygon([(W * 0.64 + off, 430), (W + off, 430), (W + off, 1190), (W * 0.36 + off, 1190)], fill=(205, 30, 40, 255))
    if p > 0.95:
        d.line((W * 0.64, 430, W * 0.36, 1190), fill=(255, 255, 255, 255), width=12)
    lose = prog(t, C["ken_loses"] - 0.25, 0.4)
    health(d, 60 - off, 470, 420, 40, 1.0)
    health(d, 600 + off, 470, 420, 40, 1 - lose, anchor_right=True)
    put(f, text_sprite("RYU", 170, WHITE, HEAD, stroke=10), 235 - off, 615)
    ken_col = tuple(int(lerp(255, 120, lose)) for _ in range(3))
    put(f, text_sprite("KEN", 170, ken_col, HEAD, stroke=10), 845 + off, 990)
    show(f, text_sprite("VS", 200, YELLOW, HEAD, stroke=12, grad=FIRE_GRAD, glow=((255, 80, 0), 26)), W / 2, 815, t,
         t0 + 0.15, style="slam")
    show(f, stamp("RYU WINS", YELLOW, 110, -5), W / 2, 1110, t, C["ken_loses"] + 0.1, style="slam")


def s_confession(f, t):
    vs = C["vs"] - 0.05
    if t < vs + 0.2:
        a = 1 - clamp((t - vs) / 0.2)
        show(f, text_sprite("THE CONFESSION", 116, WHITE, HEAD, stroke=8, glow=((40, 180, 255), 22)), W / 2, 400, t,
             C["confess"], until=vs, style="slam")
        t_show = C["confess"] + 0.5
        tear = ease_out(prog(t, C["tore"] + 0.1, 0.5))
        if t >= t_show and tear <= 0:
            show(f, ticket(), W / 2, 730, t, t_show)
        elif tear > 0:
            left, right = ticket_halves()
            put(f, left, W / 2 - 80 * tear, 730 + 40 * tear, rot=11 * tear, alpha=a)
            put(f, right, W / 2 + 80 * tear, 730 + 60 * tear, rot=-13 * tear, alpha=a)
        show(f, text_sprite("PURE JEALOUSY", 124, WHITE, HEAD, stroke=10, grad=((190, 255, 130), (40, 180, 60)),
                            glow=((40, 220, 80), 22)), W / 2, 1100, t, C["jealousy"], until=vs, style="slam")
    if t >= vs:
        vs_screen(f, t, vs)


def akuma_title(f, t, t0, y=520):
    put(f, text_sprite("天", 700, (170, 0, 0), CJK), W / 2, y + 180, alpha=0.3 * ease_out(prog(t, t0, 0.5)))
    show(f, text_sprite("AKUMA", 220, WHITE, HEAD, stroke=12, grad=RED_GRAD, glow=((255, 0, 0), 24)),
         W / 2, y, t, t0, style="slam")


def s_final(f, t):
    aw = C["akuma_walks"] - 0.06
    if t < aw:
        show(f, text_sprite("THE FINAL", 150, WHITE, HEAD, stroke=10, grad=GOLD_GRAD, glow=((255, 170, 0), 22)),
             W / 2, 400, t, C["final"], until=aw, style="slam")
        ken = text_sprite("KEN MASTERS", 96, WHITE, HEAD, stroke=8)
        shows = w(5, 0, "shows")
        show(f, ken, W / 2, 575, t, C["final"] + 0.2, until=aw, style="rise")
        if shows < t < aw:
            strike(f, ken, W / 2, 580, t, shows)
        show(f, pill("NO-SHOW", RED, size=50), W / 2, 690, t, shows + 0.15, until=aw)
        show(f, text_sprite("JOE", 230, WHITE, HEAD, stroke=12, grad=GOLD_GRAD, glow=((255, 170, 0), 26)),
             W / 2, 865, t, C["joe"], until=aw, style="slam")
        show(f, pill("PLAYED BY ALEXANDER VOLKANOVSKI", (40, 40, 50), size=36), W / 2, 1005, t,
             w(5, 0, "Alexander"), until=aw)
        show(f, pill("CHAMPION BY FORFEIT", (215, 150, 0), fg=BLACK, size=52), W / 2, 1115, t, C["forfeit"], until=aw)
    else:
        akuma_title(f, t, aw)
        d = ImageDraw.Draw(f)
        put(f, text_sprite("JOE", 64, WHITE, HEAD, stroke=6), 150, 800)
        level = 1 - ease_in_out(prog(t, aw + 0.6, C["seconds"] - aw - 0.6))
        health(d, 120, 850, 840, 56, level)
        show(f, text_sprite("K.O.", 320, YELLOW, HEAD, stroke=14, grad=((255, 245, 120), (235, 30, 20)),
                            glow=((255, 40, 0), 30)), W / 2, 1060, t, C["seconds"], style="slam")


def s_darkryu(f, t):
    hd = C["hadouken"] - 0.1
    d = ImageDraw.Draw(f)
    if t < hd:
        seed = int(t * 12)
        if seed % 3 != 2:
            lightning(d, 150 + seed * 37 % 300, 150, 300 + seed * 53 % 400, 1150, seed, (190, 90, 255))
            lightning(d, 930 - seed * 41 % 300, 150, 780 - seed * 29 % 400, 1150, seed + 99, (255, 60, 90))
        dr = text_sprite("DARK RYU", 200, WHITE, HEAD, stroke=12, grad=((235, 170, 255), (220, 20, 60)),
                         glow=((150, 30, 255), 28))
        if t >= C["dark_ryu"]:
            slam = lerp(2.0, 1, ease_out(prog(t, C["dark_ryu"], 0.2)))
            if int(t * 15) % 6 == 0 or t < C["dark_ryu"] + 0.35:
                glitch_put(f, dr, W / 2, 560, t, 40, scale=slam)
            else:
                put(f, dr, W / 2, 560, scale=slam)
        show(f, pill("BEATS AKUMA", (150, 0, 0), size=54), W / 2, 740, t, C["beats_akuma"])
        show(f, text_sprite("THEN TURNS ON HIS FRIENDS", 68, WHITE, HEAD, stroke=7), W / 2, 880, t, C["friends"] - 0.2,
             style="rise")
        for k, (name, x, col) in enumerate((("KEN", 290, (205, 30, 40)), ("CHUN-LI", 540, (30, 90, 200)),
                                            ("DAN", 790, (230, 110, 150)))):
            show(f, pill(name, col, size=48), x, 1010, t, C["friends"] + 0.1 + 0.15 * k)
    else:
        hit = C["hadouken_hit"]
        release = hit - 0.45
        show(f, text_sprite("FLAMING", 150, WHITE, HEAD, stroke=10, grad=FIRE_GRAD, glow=((255, 80, 0), 26)),
             W / 2, 430, t, C["hadouken"], style="slam")
        show(f, text_sprite("HADOUKEN", 170, WHITE, HEAD, stroke=12, grad=FIRE_GRAD, glow=((255, 80, 0), 26)),
             W / 2, 590, t, C["hadouken"] + 0.12, style="slam")
        show(f, pill("KEN'S FIRST EVER", (205, 30, 40), size=50), W / 2, 1120, t, w(6, 2, "never"))
        fb = orb(190, FIRE, 0.6)
        if t < release:
            p = prog(t, hd, release - hd)
            put(f, fb, 220, 850, scale=lerp(0.15, 0.9, ease_out(p)) * (1 + 0.08 * math.sin(t * 30)))
        elif t < hit:
            p = ease_in_out(prog(t, release, hit - release))
            x = lerp(220, 860, p)
            for k in range(6, 0, -1):
                put(f, fb, x - k * 46, 850 + 6 * math.sin(t * 40 + k), scale=0.9 * (1 - k * 0.12), alpha=0.5 - k * 0.06)
            put(f, fb, x, 850, scale=0.95)
        else:
            dt = t - hit
            ring(d, 860, 850, 60 + 900 * ease_out(min(1, dt / 0.6)), 30 * max(0, 1 - dt / 0.6), (255, 200, 120))
            put(f, fb, 860, 850, scale=0.95 + 3 * dt, alpha=max(0, 1 - dt / 0.5))
            show(f, pill("RYU IS BACK", (30, 90, 200), size=50), W / 2, 1000, t, hit + 0.25)


def s_twist(f, t):
    body = C["body"] - 0.06
    tw = text_sprite("THE TWIST", 210, WHITE, HEAD, stroke=12, grad=((255, 255, 255), (255, 60, 60)),
                     glow=((255, 0, 0), 26))
    if t < body:
        slam = lerp(2.2, 1, ease_out(prog(t, C["twist"], 0.2)))
        amt = 50 if (t < C["twist"] + 0.5 or int(t * 15) % 4 == 0) else 0
        if amt:
            glitch_put(f, tw, W / 2, 800, t, amt, scale=slam * (1 + 0.04 * (t - C["twist"])))
        else:
            put(f, tw, W / 2, 800, scale=slam * (1 + 0.04 * (t - C["twist"])))
        return
    p = ease_out(prog(t, body, 0.3))
    put(f, tw, W / 2, lerp(800, 330, p), scale=lerp(1.05, 0.55, p))
    plan = C["plan"] - 0.1
    if t < plan + 0.2:
        show(f, text_sprite("BISON TAKES", 106, WHITE, HEAD, stroke=9), W / 2, 560, t, body, until=plan)
        show(f, text_sprite("AKUMA'S BODY", 136, WHITE, HEAD, stroke=10, grad=PURPLE_GRAD, glow=((170, 40, 255), 24)),
             W / 2, 705, t, body + 0.15, until=plan, style="slam")
        explosion(f, t, C["blows"], W / 2, 1040)
        show(f, pill("CAMMY", GREEN, fg=BLACK, size=52), W / 2, 885, t, C["cammy"], until=plan)
        show(f, text_sprite("BLOWS UP CHUN-LI'S VAN", 74, WHITE, HEAD, stroke=8), W / 2, 1060, t, C["blows"] + 0.05,
             until=plan, style="slam")
    else:
        show(f, text_sprite("BISON'S NEW PLAN", 100, WHITE, HEAD, stroke=9), W / 2, 540, t, plan, style="rise")
        show(f, text_sprite("AKUMA'S POWER", 140, WHITE, HEAD, stroke=10, grad=RED_GRAD, glow=((255, 0, 0), 26)),
             W / 2, 730, t, w(7, 2, "Akuma"), style="slam")
        ryu = text_sprite("RYU'S POWER", 100, (170, 170, 180), HEAD, stroke=8)
        show(f, ryu, W / 2, 940, t, C["instead"], style="rise")
        strike(f, ryu, W / 2, 945, t, C["instead"] + 0.3)


def name_row(f, t, items, y):
    sprites = [pill(n, c, fg=fg, size=46) for n, c, fg, _ in items]
    total = sum(s.width for s in sprites) + 10 * (len(sprites) - 1)
    x = W / 2 - total / 2
    for spr, (_, _, _, t0) in zip(sprites, items):
        show(f, spr, x + spr.width / 2, y, t, t0)
        x += spr.width + 10


def s_credits(f, t):
    t0, man = C["credits"], C["man"] - 0.1
    dim = 1 - 0.85 * ease_out(prog(t, man, 0.6))
    cs = credits_sprite()
    top = 1150 - (t - t0) * 90
    # Scroll inside a window so the cast list never runs under the captions.
    lo, hi = max(top, 520), min(top + cs.height, 1240)
    if hi > lo:
        window = cs.crop((0, int(lo - top), cs.width, int(hi - top)))
        put(f, window, W / 2, (lo + hi) / 2, alpha=0.7 * dim)
    show(f, pill("MID-CREDITS SCENE", YELLOW, fg=BLACK, size=60, path=HEAD), W / 2, 330, t, t0, style="slam")
    show(f, pill("ANIMATED", ORANGE, fg=BLACK, size=46), W / 2, 445, t, C["animated"])
    if t >= man:
        p = ease_out(prog(t, man, 0.6))
        sc, cy = 0.8, lerp(1150, 880, p)
        scar = int(10 * ease_out(prog(t, C["scar"], 0.5)))
        patched = t >= C["eyepatch"]
        bust_put(f, W / 2, cy, sc, alpha=p, eyepatch=patched, scar=scar, rim=ORANGE,
                 eye=(255, 80, 40) if patched else None)
        d = ImageDraw.Draw(f)
        if patched:
            ex, ey = head_pos(W / 2, cy, sc, BUST_PATCH)
            q = ease_out(prog(t, C["eyepatch"], 0.25))
            d.line((210, 610, lerp(210, ex - 30, q), lerp(610, ey, q)), fill=(255, 255, 255, 255), width=5)
            show(f, pill("EYEPATCH", (30, 30, 36), size=40), 200, 600, t, C["eyepatch"])
        if scar:
            sx, sy = head_pos(W / 2, cy, sc, BUST_SCAR)
            show(f, pill("HUGE CHEST SCAR", RED, size=40), sx + 230, sy - 150, t, C["scar"] + 0.2)
    name_row(f, t, [("BISON", (110, 20, 160), WHITE, C["bison_walks"]), ("VEGA", (220, 90, 160), WHITE, C["vega"]),
                    ("CAMMY", GREEN, BLACK, C["cammy2"]), ("JULI", (200, 30, 50), WHITE, C["juli"])], 1215)


def s_sagat(f, t):
    t0 = C["sagat"]
    zoom = lerp(1.25, 1, ease_out(prog(t, t0, 0.35)))
    bust_put(f, W / 2, 900, 0.84 * zoom, eyepatch=True, scar=10, rim=GOLD, eye=(255, 80, 40))
    show(f, text_sprite("SAGAT", 270, WHITE, HEAD, stroke=14, grad=GOLD_GRAD, glow=((255, 120, 0), 30)),
         W / 2, 380, t, t0 + 0.05, style="slam")
    if t >= C["shoryuken"]:
        p = ease_out(prog(t, C["shoryuken"], 0.15))
        sx, sy = head_pos(W / 2, 900, 0.84, BUST_SCAR)
        d = ImageDraw.Draw(f)
        x0, y0, x1, y1 = sx - 190, sy - 150, sx + 190, sy + 150
        if t < C["shoryuken"] + 0.5:
            d.line((x0, y0, lerp(x0, x1, p), lerp(y0, y1, p)), fill=(255, 250, 220, 255), width=14)
    chips = [(C["beat1987"], "RYU BEAT HIM IN 1987", (30, 90, 200)),
             (C["bodyguard"], "IN THE GAMES: BISON'S BODYGUARD", (110, 20, 160)),
             (C["shoryuken"], "SCAR = RYU'S SHORYUKEN", RED)]
    for k, (ts, text, col) in enumerate(chips):
        until = chips[k + 1][0] - 0.1 if k + 1 < len(chips) else None
        show(f, pill(text, col, size=44), W / 2, 1215, t, ts, until=until)


def s_cta(f, t):
    t0 = C["cta"]
    sc, cy = 0.66, 950
    bust_put(f, W / 2, cy, sc, rim=YELLOW, alpha=ease_out(prog(t, t0, 0.4)))
    hx, hy = head_pos(W / 2, cy, sc)
    show(f, text_sprite("?", 220, YELLOW, HEAD, stroke=10, glow=((255, 140, 0), 24)), hx, hy, t, t0 + 0.3)
    show(f, text_sprite("WHY ANIMATED?", 120, WHITE, HEAD, stroke=9), W / 2, 420, t, t0, until=C["cast"] - 0.1,
         style="slam")
    show(f, pill("NO ACTOR CAST YET", RED, size=56), W / 2, 420, t, C["cast"], until=C["who"] - 0.1)
    show(f, text_sprite("WHO SHOULD", 116, WHITE, HEAD, stroke=9), W / 2, 360, t, C["who"], style="slam")
    show(f, text_sprite("PLAY SAGAT?", 156, WHITE, HEAD, stroke=11, grad=FIRE_GRAD, glow=((255, 90, 0), 26)),
         W / 2, 510, t, C["who"] + 0.12, style="slam")
    if t >= C["comments"]:
        pulse = 1 + 0.05 * math.sin((t - C["comments"]) * 9)
        spr = pill("COMMENT BELOW", RED, size=60, path=HEAD)
        show(f, spr, W / 2, 1200, t, C["comments"])
        if t > C["comments"] + 0.28:
            put(f, spr, W / 2, 1200, scale=pulse)
            d = ImageDraw.Draw(f)
            ay = 1270 + 10 * math.sin((t - C["comments"]) * 9)
            d.polygon([(W / 2 - 34, ay), (W / 2 + 34, ay), (W / 2, ay + 40)], fill=rgba(YELLOW))


SCENE_FN = {"hook": s_hook, "spoilers": s_spoilers, "flashback": s_flashback, "trap": s_trap,
            "confession": s_confession, "final": s_final, "darkryu": s_darkryu, "twist": s_twist,
            "credits": s_credits, "sagat": s_sagat, "cta": s_cta}


def scene_at(t):
    cur = SCENES[0]
    for name in SCENES:
        if t >= SCENE_START[name]:
            cur = name
    return cur


def palette_at(scene, t):
    if scene == "flashback" and t >= C["akuma"] - 0.08:
        return "akuma"
    if scene == "final" and t >= C["akuma_walks"] - 0.06:
        return "akuma"
    return scene


# ---------- captions, overlays ----------

CHUNKS = caption_chunks()


@lru_cache(maxsize=1024)
def caption_sprite(ci, active):
    words = [x["w"].upper() for x in CHUNKS[ci]["words"]]
    size = 88
    while True:
        f = font(CAPF, size)
        space = int(size * 0.3)
        widths = [f.getlength(wd) for wd in words]
        total = sum(widths) + space * (len(words) - 1)
        if total <= 960 or size <= 56:
            break
        size -= 4
    stroke, pad = 10, 30
    img = Image.new("RGBA", (int(total) + 2 * pad, size + 2 * pad + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = pad
    for k, (wd, wdt) in enumerate(zip(words, widths)):
        d.text((x + 6, pad + 8), wd, font=f, fill=(0, 0, 0, 170), stroke_width=stroke, stroke_fill=(0, 0, 0, 170))
        d.text((x, pad), wd, font=f, fill=rgba(YELLOW if k == active else WHITE), stroke_width=stroke,
               stroke_fill=(0, 0, 0, 255))
        x += wdt + space
    return img


def captions(f, t):
    for ci, ch in enumerate(CHUNKS):
        if ch["start"] <= t < ch["end"]:
            active = max(k for k, x in enumerate(ch["words"]) if x["start"] <= t)
            p = prog(t, ch["start"], 0.1)
            put(f, caption_sprite(ci, active), W / 2, CAPTION_Y, scale=0.8 + 0.2 * ease_back(p))
            return


IMPACTS = [(C[k], a) for k, a in (("title", 16), ("stay", 10), ("spoilers", 14), ("y1987", 8), ("akuma", 14),
                                 ("kills", 10), ("bison", 8), ("bait", 14), ("vs", 12), ("ken_loses", 12),
                                 ("akuma_walks", 14), ("seconds", 20), ("dark_ryu", 18), ("hadouken_hit", 22),
                                 ("twist", 10), ("body", 16), ("blows", 18), ("sagat", 22), ("shoryuken", 12),
                                 ("who", 10))]
FLASHES = [(C["title"], WHITE, 0.25, 0.55), (C["spoilers"], YELLOW, 0.2, 0.45), (C["kills"], RED, 0.3, 0.6),
           (C["seconds"], WHITE, 0.25, 0.75), (C["dark_ryu"], PURPLE, 0.3, 0.6),
           (C["hadouken_hit"], WHITE, 0.35, 0.9), (C["body"], RED, 0.25, 0.55), (C["blows"], ORANGE, 0.35, 0.7),
           (C["sagat"], WHITE, 0.35, 0.9), (C["shoryuken"], ORANGE, 0.2, 0.5)]


@lru_cache(maxsize=None)
def solid(color):
    return Image.new("RGBA", (W, H), rgba(color))


def post(f, t, scene):
    if scene == "flashback" and t < C["akuma"] - 0.08:
        f.paste((0, 0, 0, 255), mask=scanlines())
    f.paste((0, 0, 0, 255), mask=vignette())
    for t0, col, dur, k in FLASHES:
        if 0 <= t - t0 < dur:
            f = Image.blend(f, solid(col), k * (1 - (t - t0) / dur) ** 2)
    dx = dy = 0.0
    for t0, amp in IMPACTS:
        dt = t - t0
        if 0 <= dt < 0.4:
            e = amp * math.exp(-dt * 9)
            dx += e * math.sin(dt * 70)
            dy += e * math.cos(dt * 55)
    if abs(dx) + abs(dy) > 0.5:
        mx, my = W * 0.025, H * 0.025
        f = f.resize((W, H), Image.Resampling.BILINEAR, box=(mx + dx, my + dy, W - mx + dx, H - my + dy))
    d = ImageDraw.Draw(f)
    d.rectangle((0, 0, W, 9), fill=(40, 40, 40, 255))
    d.rectangle((0, 0, int(W * t / DURATION), 9), fill=rgba(YELLOW))
    return f


def render_frame(i):
    t = i / FPS
    scene = scene_at(t)
    f = background(palette_at(scene, t), t, i)
    SCENE_FN[scene](f, t)
    captions(f, t)
    return post(f, t, scene).convert("RGB")


def render_segment(args):
    k, f0, f1 = args
    out = os.path.join(BUILD, f"seg_{k:02d}.mp4")
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium",
                          "-crf", "18", "-pix_fmt", "yuv420p", "-threads", "2", out], stdin=subprocess.PIPE)
    for i in range(f0, f1):
        p.stdin.write(render_frame(i).tobytes())
    p.stdin.close()
    p.wait()
    return out


def mux(video):
    fc = ("[1:a]aresample=44100,pan=stereo|c0=c0|c1=c0,asplit=2[voice][key];"
          "[2:a]volume=0.32[mus];"
          "[mus][key]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=300[duck];"
          "[3:a]volume=0.55[fx];"
          "[voice][duck][fx]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", video,
                    "-i", os.path.join(BUILD, "narration.wav"), "-i", os.path.join(BUILD, "music.wav"),
                    "-i", os.path.join(BUILD, "sfx.wav"), "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT],
                   check=True)


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "stills":
        os.makedirs(os.path.join(BUILD, "stills"), exist_ok=True)
        for ts in sys.argv[2:]:
            img = render_frame(int(float(ts) * FPS))
            img.save(os.path.join(BUILD, "stills", f"t{float(ts):05.1f}.png"))
        return
    n = int(DURATION * FPS)
    segs = 12
    bounds = [(k, n * k // segs, n * (k + 1) // segs) for k in range(segs)]
    with Pool(4) as pool:
        outs = pool.map(render_segment, bounds, chunksize=1)
    listing = os.path.join(BUILD, "segments.txt")
    with open(listing, "w") as fh:
        fh.writelines(f"file '{o}'\n" for o in outs)
    video = os.path.join(BUILD, "video_only.mp4")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", listing,
                    "-c", "copy", video], check=True)
    mux(video)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
