import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops, ImageEnhance

W, H = 1080, 1920
BW, BH = 1296, 2304
F_BLACK = '/usr/share/fonts/opentype/inter/Inter-Black.otf'
F_XB = '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
F_SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
F_SERIF_I = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'


def font(p, s):
    return ImageFont.truetype(p, s)


def vgrad(top, bot, w=BW, h=BH, curve=1.0):
    a = np.linspace(0, 1, h) ** curve
    c = np.array(top, float)[None, :] * (1 - a[:, None]) + np.array(bot, float)[None, :] * a[:, None]
    return Image.fromarray(np.ascontiguousarray(np.broadcast_to(c[:, None, :], (h, w, 3))).astype('uint8'))


def add_glow(img, x, y, r, color, blur=None):
    L = Image.new('RGB', img.size, (0, 0, 0))
    ImageDraw.Draw(L).ellipse([x - r, y - r, x + r, y + r], fill=color)
    L = L.filter(ImageFilter.GaussianBlur(blur or r * 0.7))
    return ImageChops.add(img, L)


def overlay_rgba(img, layer):
    base = img.convert('RGBA')
    base.alpha_composite(layer)
    return base.convert('RGB')


def rot(pts, ang, c):
    ca, sa = math.cos(ang), math.sin(ang)
    return [(c[0] + (x - c[0]) * ca - (y - c[1]) * sa, c[1] + (x - c[0]) * sa + (y - c[1]) * ca) for x, y in pts]


def pines(d, ybase, color, seed, hmin=200, hmax=420, step=(40, 90), x0=-80, x1=BW + 80):
    r = random.Random(seed)
    x = x0
    while x < x1:
        h = r.uniform(hmin, hmax)
        w = h * r.uniform(0.32, 0.45)
        tiers = r.randint(4, 6)
        for k in range(tiers):
            ty = ybase - h + h * k / tiers * 0.95
            tw = w * (0.35 + 0.65 * (k + 1) / tiers) / 2
            d.polygon([(x, ty), (x - tw, ty + h / tiers * 1.6), (x + tw, ty + h / tiers * 1.6)], fill=color)
        d.rectangle([x - w * 0.05, ybase - h * 0.1, x + w * 0.05, ybase + 5], fill=color)
        x += r.uniform(*step)
    d.rectangle([x0, ybase, x1, ybase + 10], fill=color)


def reflect(img, y0, tint, mix=0.55, shimmer=None, seed=1):
    h = min(y0, BH - y0)
    ref = img.crop((0, y0 - h, BW, y0)).transpose(Image.FLIP_TOP_BOTTOM)
    ref = Image.blend(ref, Image.new('RGB', ref.size, tint), mix)
    img.paste(ref, (0, y0))
    if BH - y0 > h:
        img.paste(Image.new('RGB', (BW, BH - y0 - h), tint), (0, y0 + h))
    if shimmer:
        d = ImageDraw.Draw(img)
        r = random.Random(seed)
        for _ in range(140):
            yy = y0 + r.uniform(5, BH - y0)
            ww = r.uniform(20, 160) * (0.4 + (yy - y0) / (BH - y0))
            xx = r.uniform(0, BW)
            d.line([(xx, yy), (xx + ww, yy)], fill=shimmer, width=2)
    return img


def person(d, x, yf, h, color, hair=False, knife=False, sweater=False, head_color=None, sack=False):
    head = h * 0.13
    top = yf - h
    sh = top + head * 1.05
    sw = h * (0.15 if sweater else 0.13)
    hipy = yf - h * 0.47
    d.rectangle([x - head * 0.16, top + head * 0.85, x + head * 0.16, sh + h * 0.04], fill=color)
    d.polygon([(x - sw, sh + h * 0.03), (x + sw, sh + h * 0.03), (x + sw * 0.82, hipy), (x - sw * 0.82, hipy)], fill=color)
    for s in (-1, 1):
        d.ellipse([x + s * sw - h * 0.035, sh, x + s * sw + h * 0.035, sh + h * 0.07], fill=color)
        d.polygon([(x + s * sw, sh + h * 0.02), (x + s * (sw + h * 0.045), sh + h * 0.05),
                   (x + s * (sw + h * 0.035), hipy + h * 0.06), (x + s * (sw - h * 0.01), hipy + h * 0.06)], fill=color)
    d.polygon([(x - sw * 0.82, hipy), (x - 0.015 * h, hipy), (x - 0.025 * h, yf), (x - sw * 0.75, yf)], fill=color)
    d.polygon([(x + 0.015 * h, hipy), (x + sw * 0.82, hipy), (x + sw * 0.75, yf), (x + 0.025 * h, yf)], fill=color)
    if hair:
        d.ellipse([x - head * 0.62, top - head * 0.1, x + head * 0.62, top + head * 0.8], fill=color)
        d.ellipse([x - head * 0.66, top + head * 0.25, x + head * 0.66, top + head * 1.0], fill=color)
    hc = head_color or color
    if sack:
        d.ellipse([x - head * 0.6, top - head * 0.15, x + head * 0.6, top + head * 1.05], fill=hc)
        d.ellipse([x + head * 0.05, top + head * 0.3, x + head * 0.3, top + head * 0.5], fill=(5, 5, 5))
    else:
        d.ellipse([x - head * 0.42, top, x + head * 0.42, top + head], fill=hc)
    if knife:
        hx, hy = x + sw + h * 0.04, hipy + h * 0.06
        d.polygon([(hx - h * 0.01, hy), (hx + h * 0.012, hy), (hx + h * 0.006, hy + h * 0.18), (hx - h * 0.004, hy + h * 0.18)],
                  fill=(150, 155, 165))


def dock(d, xb0, xb1, yb, xt0, xt1, yt, color, gap=(10, 8, 7)):
    d.polygon([(xb0, yb), (xb1, yb), (xt1, yt), (xt0, yt)], fill=color)
    n = 9
    for i in range(1, n):
        a = i / n
        d.line([(xb0 + (xb1 - xb0) * a, yb), (xt0 + (xt1 - xt0) * a, yt)], fill=gap, width=4)
    d.rectangle([xt0, yt, xt1, yt + 14], fill=tuple(max(0, c - 12) for c in color))


def text_center(d, cx, y, s, f, fill, stroke=0, sfill=(0, 0, 0)):
    w = d.textlength(s, font=f)
    d.text((cx - w / 2, y), s, font=f, fill=fill, stroke_width=stroke, stroke_fill=sfill)


def sign(d, cx, cy, w, h, lines, board=(88, 58, 36), txt=(235, 225, 200), post=(60, 40, 26), fsize=None):
    d.rectangle([cx - w * 0.38, cy, cx - w * 0.33, cy + h * 2.2], fill=post)
    d.rectangle([cx + w * 0.33, cy, cx + w * 0.38, cy + h * 2.2], fill=post)
    d.rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], fill=board, outline=tuple(c - 25 for c in board), width=6)
    fs = fsize or int(h * 0.3)
    f = font(F_SERIF, fs)
    tot = len(lines) * fs * 1.15
    for i, s in enumerate(lines):
        text_center(d, cx, cy - tot / 2 + i * fs * 1.15, s, f, txt)


# ---------------------------------------------------------------- scenes

def s01_machete():
    img = vgrad((5, 7, 13), (16, 20, 30))
    d = ImageDraw.Draw(img)
    hz = int(BH * 0.36)
    pines(d, hz, (8, 10, 16), 3, 160, 330)
    img = reflect(img, hz, (8, 11, 18), 0.6, shimmer=(40, 46, 60), seed=2)
    img = add_glow(img, BW * 0.78, BH * 0.12, 70, (120, 130, 150), 160)
    d = ImageDraw.Draw(img)
    d.ellipse([BW * 0.78 - 55, BH * 0.12 - 55, BW * 0.78 + 55, BH * 0.12 + 55], fill=(215, 220, 225))
    dock(d, -200, BW + 200, BH, BW * 0.38, BW * 0.62, BH * 0.47, (44, 34, 28))
    img = add_glow(img, BW * 0.55, BH * 0.72, 380, (120, 10, 12), 260)
    d = ImageDraw.Draw(img)
    c = (BW * 0.5, BH * 0.73)
    L = 820
    blade = [(c[0] - L * 0.32, c[1] - 34), (c[0] + L * 0.55, c[1] - 46), (c[0] + L * 0.66, c[1] - 10),
             (c[0] + L * 0.6, c[1] + 40), (c[0] - L * 0.32, c[1] + 34)]
    ang = -0.42
    d.polygon(rot(blade, ang, c), fill=(125, 130, 138))
    d.line(rot([(c[0] - L * 0.32, c[1] - 30), (c[0] + L * 0.55, c[1] - 42)], ang, c), fill=(70, 72, 80), width=8)
    d.line(rot([(c[0] - L * 0.3, c[1] + 28), (c[0] + L * 0.58, c[1] + 34)], ang, c), fill=(225, 228, 235), width=5)
    r = random.Random(7)
    for _ in range(9):
        px = c[0] + r.uniform(0.0, 0.55) * L
        py = c[1] + r.uniform(-25, 25)
        rr = r.uniform(10, 34)
        d.ellipse(rot([(px - rr, py - rr * 0.6)], ang, c)[0] + rot([(px + rr, py + rr * 0.6)], ang, c)[0], fill=(95, 8, 10))
    handle = [(c[0] - L * 0.62, c[1] - 30), (c[0] - L * 0.3, c[1] - 30), (c[0] - L * 0.3, c[1] + 30), (c[0] - L * 0.62, c[1] + 30)]
    d.polygon(rot(handle, ang, c), fill=(52, 32, 22))
    for k in (0.36, 0.46, 0.56):
        p = rot([(c[0] - L * k, c[1])], ang, c)[0]
        d.ellipse([p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8], fill=(170, 160, 140))
    for _ in range(18):
        x0 = r.uniform(0, BW)
        y0 = r.uniform(BH * 0.55, BH)
        d.ellipse([x0, y0, x0 + r.uniform(4, 14), y0 + r.uniform(2, 6)], fill=(70, 75, 90))
    return dict(bases=[img], cam=(1.0, 1.35, (0.5, 0.62), (0.52, 0.7)), fog=0.55, fogc=(120, 128, 145), redpulse=True)


def _camp_painting(w, h, seed=1):
    img = vgrad((246, 160, 110), (255, 222, 170), w, h)
    hz = int(h * 0.5)
    img = add_glow(img, w * 0.3, hz - 40, 90, (255, 240, 200), 120)
    d = ImageDraw.Draw(img)
    d.ellipse([w * 0.3 - 60, hz - 100, w * 0.3 + 60, hz + 20], fill=(255, 245, 215))
    old = (BW, BH)
    pines(d, hz, (90, 110, 95), seed, 80, 180, (25, 55), -40, w + 40)
    pines(d, hz + 6, (40, 70, 52), seed + 1, 120, 250, (45, 90), -40, w + 40)
    for i, cx in enumerate((w * 0.62, w * 0.8)):
        d.rectangle([cx - 60, hz - 70, cx + 60, hz + 4], fill=(120, 72, 44))
        d.polygon([(cx - 75, hz - 70), (cx, hz - 125), (cx + 75, hz - 70)], fill=(84, 48, 30))
        d.rectangle([cx - 18, hz - 50, cx + 18, hz - 20], fill=(255, 220, 140))
    ref = img.crop((0, 0, w, hz)).transpose(Image.FLIP_TOP_BOTTOM)
    ref = Image.blend(ref, Image.new('RGB', ref.size, (90, 150, 165)), 0.55)
    img.paste(ref, (0, hz))
    d = ImageDraw.Draw(img)
    r = random.Random(4)
    for _ in range(60):
        yy = r.uniform(hz + 5, h)
        xx = r.uniform(0, w)
        d.line([(xx, yy), (xx + r.uniform(20, 90), yy)], fill=(230, 235, 225), width=2)
    dock(d, w * 0.05, w * 0.45, h, w * 0.22, w * 0.32, hz + 40, (150, 108, 70), (110, 75, 48))
    sign(d, w * 0.7, h * 0.72, w * 0.5, h * 0.11, ["CAMP", "CRYSTAL LAKE"], fsize=int(h * 0.04))
    return img


def s02_postcard():
    img = vgrad((40, 28, 20), (24, 16, 11))
    d = ImageDraw.Draw(img)
    r = random.Random(9)
    for _ in range(120):
        y = r.uniform(0, BH)
        d.line([(0, y), (BW, y + r.uniform(-20, 20))], fill=(52, 37, 27) if r.random() < .5 else (30, 21, 15), width=r.randint(1, 4))
    pw, ph = 960, 1500
    card = Image.new('RGB', (pw, ph), (240, 232, 212))
    paint = _camp_painting(pw - 70, ph - 260)
    paint = ImageEnhance.Color(paint).enhance(0.75)
    card.paste(paint, (35, 35))
    cd = ImageDraw.Draw(card)
    text_center(cd, pw / 2, ph - 205, "Greetings from", font(F_SERIF_I, 52), (120, 60, 40))
    text_center(cd, pw / 2, ph - 140, "CAMP CRYSTAL LAKE", font(F_SERIF, 70), (150, 40, 30))
    text_center(cd, pw / 2, ph - 58, "SUMMER  ·  1957", font(F_SERIF, 34), (110, 90, 70))
    noise = np.random.default_rng(3).normal(0, 9, (ph, pw, 1))
    card = Image.fromarray(np.clip(np.asarray(card, float) + noise, 0, 255).astype('uint8'))
    card = card.convert('RGBA').rotate(-3, expand=True, resample=Image.BICUBIC)
    sh = Image.new('RGBA', card.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 170), mask=card.split()[3])
    sh = sh.filter(ImageFilter.GaussianBlur(30))
    base = img.convert('RGBA')
    ox, oy = (BW - card.width) // 2, (BH - card.height) // 2 - 40
    base.alpha_composite(sh, (ox + 30, oy + 40))
    base.alpha_composite(card, (ox, oy))
    return dict(bases=[base.convert('RGB')], cam=(1.25, 1.05, (0.5, 0.48), (0.5, 0.47)), fog=0.0)


def s03_boy_dock():
    img = vgrad((250, 175, 110), (240, 120, 80), curve=0.8)
    hz = int(BH * 0.5)
    img = add_glow(img, BW * 0.5, hz - 30, 160, (255, 230, 170), 220)
    d = ImageDraw.Draw(img)
    d.ellipse([BW * 0.5 - 85, hz - 120, BW * 0.5 + 85, hz + 50], fill=(255, 238, 200))
    pines(d, hz, (120, 70, 70), 11, 90, 200, (30, 60))
    pines(d, hz + 4, (80, 45, 50), 12, 140, 260, (50, 100))
    img = reflect(img, hz, (200, 100, 70), 0.35)
    d = ImageDraw.Draw(img)
    r = random.Random(3)
    for _ in range(90):
        yy = r.uniform(hz + 5, BH)
        spread = 40 + (yy - hz) * 0.35
        xx = BW * 0.5 + r.uniform(-spread, spread)
        d.line([(xx - 40, yy), (xx + 40, yy)], fill=(255, 220, 160), width=3)
    dock(d, BW * 0.18, BW * 0.82, BH, BW * 0.42, BW * 0.58, BH * 0.62, (55, 32, 30), (35, 20, 20))
    person(d, BW * 0.5, BH * 0.635, 330, (28, 16, 20))
    return dict(bases=[img], cam=(1.0, 1.4, (0.5, 0.58), (0.5, 0.56)), fog=0.12, fogc=(255, 200, 160))


def s04_counselors():
    bg = vgrad((235, 175, 120), (250, 210, 160))
    hz = int(BH * 0.42)
    d = ImageDraw.Draw(bg)
    pines(d, hz, (95, 90, 80), 21, 80, 170, (30, 60))
    pines(d, hz + 4, (60, 70, 60), 22, 120, 220, (45, 90))
    bg = reflect(bg, hz, (70, 120, 140), 0.62, shimmer=(235, 225, 200), seed=5)
    d = ImageDraw.Draw(bg)
    bx, by = BW * 0.7, BH * 0.5
    for rr in (70, 110, 150):
        d.ellipse([bx - rr, by - rr * 0.18, bx + rr, by + rr * 0.18], outline=(240, 235, 220), width=3)
    d.ellipse([bx - 16, by - 30, bx + 16, by + 2], fill=(30, 25, 25))
    d.rectangle([0, BH * 0.68, BW, BH], fill=(70, 80, 50))
    fg = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
    f = ImageDraw.Draw(fg)
    c = (22, 20, 22, 255)
    f.polygon([(BW * 0.02, BH * 0.78), (BW * 0.62, BH * 0.78), (BW * 0.68, BH * 0.82), (BW * 0.06, BH * 0.82)], fill=c)
    for x in (0.08, 0.6):
        f.rectangle([BW * x, BH * 0.82, BW * x + 22, BH * 0.95], fill=c)
    f.rectangle([0, BH * 0.86, BW * 0.7, BH * 0.875], fill=c)
    for x, hh in ((0.12, 620), (0.3, 560), (0.47, 600)):
        person(f, BW * x, BH * 0.98, hh, c, hair=(x == 0.3))
    f.ellipse([BW * 0.36, BH * 0.735, BW * 0.4, BH * 0.765], fill=c)
    base0 = bg.filter(ImageFilter.GaussianBlur(7)).convert('RGBA')
    base0.alpha_composite(fg)
    base1 = bg.convert('RGBA')
    base1.alpha_composite(fg.filter(ImageFilter.GaussianBlur(14)))
    return dict(bases=[base0.convert('RGB'), base1.convert('RGB')], mode='fade', fade=(0.25, 0.75),
                cam=(1.05, 1.25, (0.4, 0.62), (0.62, 0.52)), fog=0.0)


def s05_underwater():
    img = vgrad((150, 215, 215), (3, 18, 26), curve=0.55)
    rays = Image.new('RGB', (BW, BH), 0)
    d = ImageDraw.Draw(rays)
    r = random.Random(5)
    for _ in range(9):
        x = r.uniform(0, BW)
        w1 = r.uniform(30, 90)
        d.polygon([(x - w1, 0), (x + w1, 0), (x + w1 * 3 + r.uniform(-200, 200), BH * 0.9), (x - w1 * 3 + r.uniform(-200, 200), BH * 0.9)],
                  fill=(40, 60, 60))
    img = ImageChops.add(img, rays.filter(ImageFilter.GaussianBlur(40)))
    d = ImageDraw.Draw(img)
    for i in range(14):
        y = 60 + i * 9
        d.line([(x, y + 14 * math.sin(x / 70 + i)) for x in range(0, BW + 20, 20)], fill=(220, 250, 245), width=3)
    c = (6, 22, 28)
    cx, wy = BW * 0.52, BH * 0.6
    d.polygon([(cx - 60, BH), (cx + 50, BH), (cx + 45, wy), (cx - 40, wy)], fill=c)
    d.ellipse([cx - 80, wy - 150, cx + 75, wy + 30], fill=c)
    for ang, ln in ((-0.5, 150), (-0.18, 190), (0.05, 200), (0.28, 180), (-1.0, 120)):
        bx, by = cx + 60 * math.sin(ang), wy - 110
        ex, ey = bx + ln * math.sin(ang), by - ln * math.cos(ang)
        d.line([(bx, by), (ex, ey)], fill=c, width=34)
        d.ellipse([ex - 17, ey - 17, ex + 17, ey + 17], fill=c)
    return dict(bases=[img], cam=(1.25, 1.1, (0.5, 0.55), (0.5, 0.45)), fog=0.0, ripple=7, bubbles=True)


def s06_kneel():
    img = vgrad((40, 30, 70), (200, 110, 115), curve=1.2)
    hz = int(BH * 0.47)
    d = ImageDraw.Draw(img)
    pines(d, hz, (35, 25, 45), 31, 130, 260, (40, 80))
    img = reflect(img, hz, (45, 35, 60), 0.5, shimmer=(150, 100, 120), seed=8)
    d = ImageDraw.Draw(img)
    dock(d, -100, BW * 0.75, BH, BW * 0.25, BW * 0.62, BH * 0.62, (40, 28, 34), (22, 15, 20))
    c = (14, 10, 16)
    x, g = BW * 0.45, BH * 0.64
    h = 520
    d.polygon([(x - 120, g), (x + 110, g), (x + 70, g - 120), (x - 60, g - 150)], fill=c)
    d.polygon([(x - 70, g - 140), (x + 60, g - 130), (x + 85, g - 330), (x - 20, g - 360)], fill=c)
    d.ellipse([x - 10, g - 470, x + 95, g - 345], fill=c)
    d.ellipse([x - 30, g - 485, x + 105, g - 380], fill=c)
    d.polygon([(x + 60, g - 320), (x + 140, g - 250), (x + 120, g - 230), (x + 50, g - 280)], fill=c)
    d.polygon([(x + 110, g - 265), (x + 200, g - 240), (x + 190, g - 160), (x + 105, g - 190)], fill=(150, 140, 125))
    return dict(bases=[img], cam=(1.45, 1.05, (0.5, 0.52), (0.5, 0.5)), fog=0.2, fogc=(170, 130, 150))


def s07_split():
    left = vgrad((120, 180, 230), (220, 235, 240), BW // 2, BH)
    d = ImageDraw.Draw(left)
    hz = int(BH * 0.55)
    pines(d, hz, (50, 100, 70), 41, 120, 260, (40, 80), -40, BW // 2 + 40)
    d.rectangle([0, hz, BW // 2, BH], fill=(90, 140, 70))
    sign(d, BW * 0.25, BH * 0.5, BW * 0.42, BH * 0.1, ["CAMP", "CRYSTAL LAKE"], board=(150, 40, 35), txt=(255, 255, 255), fsize=56)
    d.rectangle([BW * 0.08, BH * 0.68, BW * 0.16, BH * 0.74], fill=(200, 200, 205))
    d.ellipse([BW * 0.08, BH * 0.665, BW * 0.16, BH * 0.69], fill=(150, 40, 35))
    text_center(d, BW * 0.25, BH * 0.36, "NOW OPEN!", font(F_BLACK, 60), (255, 255, 255), 6, (150, 40, 35))
    right = vgrad((14, 12, 14), (30, 24, 22), BW // 2, BH)
    rr = ImageDraw.Draw(right)
    rr.rectangle([BW * 0.12, BH * 0.18, BW * 0.38, BH * 0.38], fill=(20, 26, 40), outline=(40, 34, 30), width=10)
    rr.line([(BW * 0.25, BH * 0.18), (BW * 0.25, BH * 0.38)], fill=(40, 34, 30), width=8)
    right = add_glow(right, BW * 0.25, BH * 0.44, 90, (110, 80, 40), 180)
    rr = ImageDraw.Draw(right)
    rr.line([(BW * 0.25, 0), (BW * 0.25, BH * 0.42)], fill=(10, 8, 8), width=4)
    rr.polygon([(BW * 0.2, BH * 0.44), (BW * 0.3, BH * 0.44), (BW * 0.27, BH * 0.42), (BW * 0.23, BH * 0.42)], fill=(60, 45, 25))
    person(rr, BW * 0.3, BH * 0.95, 760, (8, 6, 8), hair=True, sweater=True)
    rr.rectangle([0, BH * 0.7, BW // 2, BH * 0.73], fill=(45, 32, 24))
    rr.rectangle([0, BH * 0.73, BW // 2, BH], fill=(18, 14, 12))
    rr.rectangle([BW * 0.07, BH * 0.6, BW * 0.17, BH * 0.7], fill=(150, 125, 90), outline=(70, 50, 30), width=8)
    person(rr, BW * 0.12, BH * 0.695, 120, (60, 45, 35))
    img = Image.new('RGB', (BW, BH))
    img.paste(left, (0, 0))
    img.paste(right, (BW // 2, 0))
    ImageDraw.Draw(img).line([(BW // 2, 0), (BW // 2, BH)], fill=(240, 240, 240), width=8)
    b1 = img.copy()
    b1.paste(ImageEnhance.Brightness(left).enhance(1.25), (0, 0))
    b1.paste(ImageEnhance.Brightness(right).enhance(0.5), (BW // 2, 0))
    ImageDraw.Draw(b1).line([(BW // 2, 0), (BW // 2, BH)], fill=(240, 240, 240), width=8)
    return dict(bases=[img, b1], mode='fade', fade=(0.2, 0.9), cam=(1.08, 1.0, (0.5, 0.5), (0.5, 0.5)), fog=0.0)


def s08_calendar():
    bases = []
    years = [1957, 1960, 1963, 1966, 1969, 1972, 1975, 1977, 1979]
    for i, yr in enumerate(years):
        a = i / (len(years) - 1)
        wall = tuple(int(v * (1 - 0.45 * a)) for v in (70, 85, 70))
        img = vgrad(wall, tuple(int(v * 0.6) for v in wall))
        d = ImageDraw.Draw(img)
        for x in range(0, BW, 90):
            d.rectangle([x, 0, x + 36, BH], fill=tuple(int(v * 0.85) for v in wall))
        r = random.Random(50)
        for k in range(int(2 + a * 7)):
            px, py = r.uniform(0, BW), r.uniform(0, BH)
            s = r.uniform(80, 220)
            d.polygon([(px, py), (px + s, py + r.uniform(-30, 30)), (px + r.uniform(0, s), py + s)], fill=(150, 140, 110))
        d.ellipse([BW * 0.1, BH * 0.08, BW * 0.4, BH * 0.27], fill=(90, 60, 30))
        d.ellipse([BW * 0.12, BH * 0.09, BW * 0.38, BH * 0.26], fill=(180, 155, 115))
        pw_, ph_ = int(BW * 0.26), int(BH * 0.17)
        por = Image.new('RGB', (pw_, ph_), (180, 155, 115))
        person(ImageDraw.Draw(por), pw_ / 2, ph_ * 2.75, ph_ * 2.6, (70, 50, 35))
        pm = Image.new('L', (pw_, ph_), 0)
        ImageDraw.Draw(pm).ellipse([0, 0, pw_, ph_], fill=255)
        img.paste(por, (int(BW * 0.12), int(BH * 0.09)), pm)
        d = ImageDraw.Draw(img)
        cx0, cy0, cw, ch = BW * 0.2, BH * 0.36, BW * 0.6, BH * 0.42
        d.rectangle([cx0 + 14, cy0 + 18, cx0 + cw + 14, cy0 + ch + 18], fill=(15, 12, 10))
        d.rectangle([cx0, cy0, cx0 + cw, cy0 + ch], fill=(235, 228, 210))
        d.rectangle([cx0, cy0, cx0 + cw, cy0 + ch * 0.14], fill=(160, 30, 30))
        text_center(d, cx0 + cw / 2, cy0 + 22, "JUNE", font(F_BLACK, 90), (255, 255, 255))
        text_center(d, cx0 + cw / 2, cy0 + ch * 0.17, str(yr), font(F_BLACK, 230), (30, 25, 25))
        gx, gy = cx0 + 40, cy0 + ch * 0.55
        cwid = (cw - 80) / 7
        for row in range(5):
            for col in range(7):
                d.rectangle([gx + col * cwid, gy + row * 70, gx + (col + 1) * cwid - 6, gy + row * 70 + 62], outline=(150, 140, 125), width=2)
        d.line([(gx + 2, gy + 72), (gx + cwid * 7, gy + 70 * 4)], fill=(160, 30, 30), width=8)
        bases.append(img)
    return dict(bases=bases, mode='step', cam=(1.0, 1.12, (0.5, 0.45), (0.5, 0.48)), fog=0.0, tick=True)


def s09_eye():
    img = vgrad((30, 20, 18), (12, 8, 8))
    img = add_glow(img, BW * 0.5, BH * 0.45, 600, (40, 28, 22), 300)
    d = ImageDraw.Draw(img)
    cx, cy = BW * 0.5, BH * 0.46
    ew, eh = 520, 250
    top = [(cx - ew + 2 * ew * t / 40, cy - eh * math.sin(math.pi * t / 40)) for t in range(41)]
    bot = [(cx + ew - 2 * ew * t / 40, cy + eh * 0.75 * math.sin(math.pi * t / 40)) for t in range(41)]
    d.polygon(top + bot, fill=(200, 190, 180))
    d.arc([cx - 260, cy - 260, cx + 260, cy + 260], 0, 360, fill=(0, 0, 0))
    iris = Image.new('RGB', (520, 520))
    ig = vgrad((20, 40, 60), (60, 110, 120), 520, 520)
    idr = ImageDraw.Draw(ig)
    idr.ellipse([300, 120, 360, 180], fill=(230, 235, 240))
    pines(idr, 300, (8, 14, 22), 61, 40, 90, (12, 26), -10, 530)
    idr.rectangle([0, 304, 520, 520], fill=(12, 26, 38))
    idr.line([(320, 320), (340, 320)], fill=(200, 210, 220), width=3)
    idr.ellipse([200, 200, 320, 320], fill=(4, 4, 6))
    m = Image.new('L', (520, 520), 0)
    ImageDraw.Draw(m).ellipse([0, 0, 520, 520], fill=255)
    lidmask = Image.new('L', (BW, BH), 0)
    ImageDraw.Draw(lidmask).polygon(top + bot, fill=255)
    tmp = img.copy()
    tmp.paste(ig, (int(cx - 260), int(cy - 280)), m)
    img = Image.composite(tmp, img, lidmask)
    d = ImageDraw.Draw(img)
    d.line(top, fill=(10, 6, 6), width=26)
    d.line(bot, fill=(40, 25, 22), width=10)
    for t in range(4, 38, 3):
        x, y = top[t]
        d.line([(x, y), (x + (t - 20) * 3, y - 70)], fill=(8, 5, 5), width=8)
    d.polygon([(cx - ew - 40, cy - eh - 170), (cx, cy - eh - 260), (cx + ew + 20, cy - eh - 160), (cx, cy - eh - 210)], fill=(18, 12, 10))
    shadow = vgrad((0, 0, 0), (0, 0, 0))
    m2 = Image.linear_gradient('L').resize((BW, BH)).point(lambda v: int(150 * (1 - v / 255)))
    img = Image.composite(shadow, img, m2)
    red = Image.blend(img, Image.new('RGB', img.size, (150, 0, 0)), 0.0)
    red = Image.fromarray(np.clip(np.asarray(img, float) * np.array([1.5, 0.35, 0.35]), 0, 255).astype('uint8'))
    return dict(bases=[img, red], mode='fade', fade=(0.3, 0.75), cam=(1.0, 1.25, (0.5, 0.46), (0.5, 0.46)), fog=0.0, shake=True)


def s10_road():
    img = vgrad((6, 8, 14), (14, 16, 24))
    d = ImageDraw.Draw(img)
    vp = (BW * 0.5, BH * 0.42)
    d.polygon([(BW * 0.1, BH), (BW * 0.9, BH), (vp[0] + 30, vp[1]), (vp[0] - 30, vp[1])], fill=(45, 40, 34))
    for side in (-1, 1):
        for k in range(14):
            a = k / 13
            x = vp[0] + side * (60 + 900 * a ** 1.6)
            y = vp[1] + 700 * a ** 1.6
            hh = 200 + 1200 * a ** 1.6
            d.polygon([(x, y - hh), (x - hh * 0.22, y), (x + hh * 0.22, y)], fill=(5, 7, 10))
    for x in (vp[0] - 40, vp[0] + 10):
        d.rectangle([x, vp[1] - 12, x + 14, vp[1]], fill=(220, 180, 90))
    img = add_glow(img, vp[0], vp[1] - 6, 50, (110, 80, 30), 60)
    beams = Image.new('RGB', (BW, BH), 0)
    bd = ImageDraw.Draw(beams)
    for bx in (BW * 0.28, BW * 0.72):
        bd.polygon([(bx - 80, BH), (bx + 80, BH), (vp[0] + (bx - vp[0]) * 0.2 + 140, vp[1] + 220), (vp[0] + (bx - vp[0]) * 0.2 - 140, vp[1] + 220)],
                   fill=(70, 68, 55))
    img = ImageChops.add(img, beams.filter(ImageFilter.GaussianBlur(50)))
    d = ImageDraw.Draw(img)
    sign(d, BW * 0.72, BH * 0.5, BW * 0.36, BH * 0.08, ["CAMP", "CRYSTAL LAKE"], fsize=44)
    d.rectangle([BW * 0.55, BH * 0.535, BW * 0.89, BH * 0.565], fill=(150, 30, 28))
    text_center(d, BW * 0.72, BH * 0.537, "REOPENING", font(F_BLACK, 50), (255, 240, 230))
    person(d, BW * 0.49, BH * 0.62, 330, (4, 4, 6), hair=True, sweater=True)
    return dict(bases=[img], cam=(1.0, 1.3, (0.5, 0.55), (0.5, 0.5)), fog=0.6, fogc=(110, 110, 120))


def s11_cabins():
    bases = []
    for out in range(5):
        img = vgrad((8, 10, 16), (16, 18, 26))
        d = ImageDraw.Draw(img)
        hz = int(BH * 0.4)
        pines(d, hz, (6, 8, 12), 71, 200, 380)
        d.rectangle([0, hz, BW, BH], fill=(14, 16, 18))
        cabs = [(0.18, 0.5, 0.55), (0.5, 0.56, 0.72), (0.82, 0.5, 0.55), (0.32, 0.72, 1.0)]
        for i, (x, y, s) in enumerate(cabs):
            cx, cy = BW * x, BH * y
            w, h = 360 * s, 220 * s
            d.rectangle([cx - w / 2, cy - h, cx + w / 2, cy], fill=(32, 26, 22))
            d.polygon([(cx - w / 2 - 30 * s, cy - h), (cx, cy - h - 150 * s), (cx + w / 2 + 30 * s, cy - h)], fill=(20, 16, 14))
            lit = i >= out
            col = (255, 205, 110) if lit else (10, 10, 14)
            d.rectangle([cx - 40 * s, cy - h * 0.7, cx + 40 * s, cy - h * 0.35], fill=col)
            d.text((cx + w / 2 - 70 * s, cy - h - 50 * s), str(i + 1), font=font(F_BLACK, int(46 * s)), fill=(60, 50, 40))
            if lit:
                img = add_glow(img, cx, cy - h * 0.52, 70 * s, (120, 85, 30), 90 * s)
                d = ImageDraw.Draw(img)
        bases.append(img)
    return dict(bases=bases, mode='step', steps=[0.0, 0.22, 0.42, 0.62, 0.82], cam=(1.0, 1.15, (0.5, 0.55), (0.5, 0.58)),
                fog=0.3, fogc=(90, 95, 110), rain=True, clicks=True)


def s12_doorway():
    img = vgrad((14, 12, 14), (6, 5, 6))
    d = ImageDraw.Draw(img)
    dx0, dx1, dy0, dy1 = BW * 0.3, BW * 0.7, BH * 0.22, BH * 0.72
    door = vgrad((150, 170, 205), (60, 75, 100), int(dx1 - dx0), int(dy1 - dy0))
    dd = ImageDraw.Draw(door)
    pines(dd, int((dy1 - dy0) * 0.65), (30, 40, 60), 81, 150, 300, (40, 80), -20, int(dx1 - dx0) + 20)
    img.paste(door, (int(dx0), int(dy0)))
    img = add_glow(img, BW * 0.5, BH * 0.47, 380, (60, 70, 100), 200)
    d = ImageDraw.Draw(img)
    d.rectangle([dx0 - 40, dy0 - 40, dx1 + 40, dy0], fill=(30, 24, 20))
    d.rectangle([dx0 - 40, dy0, dx0, dy1], fill=(30, 24, 20))
    d.rectangle([dx1, dy0, dx1 + 40, dy1], fill=(30, 24, 20))
    d.polygon([(dx0, dy1), (dx1, dy1), (BW * 1.1, BH), (-BW * 0.1, BH)], fill=(40, 46, 60))
    d.polygon([(BW * 0.45, dy1), (BW * 0.56, dy1), (BW * 0.7, BH), (BW * 0.3, BH)], fill=(6, 6, 8))
    person(d, BW * 0.5, dy1, 820, (3, 3, 5), hair=True, sweater=True, knife=True)
    return dict(bases=[img], cam=(1.0, 1.2, (0.5, 0.48), (0.5, 0.45)), fog=0.0, lightning=[0.1, 0.55, 0.62])


def s13_forest():
    img = vgrad((10, 14, 18), (18, 22, 26))
    img = add_glow(img, BW * 0.5, BH * 0.35, 300, (40, 48, 60), 300)
    layers = [((28, 34, 40), 0.48, 300, 520, 91), ((18, 22, 28), 0.56, 450, 800, 92), ((9, 11, 14), 0.72, 700, 1300, 93)]
    for i, (col, yb, hmin, hmax, seed) in enumerate(layers):
        d = ImageDraw.Draw(img)
        if i == 2:
            pines(d, BH * yb, col, seed, hmin, hmax, (60, 120), -80, BW * 0.3)
            pines(d, BH * yb, col, seed + 5, hmin, hmax, (60, 120), BW * 0.72, BW + 80)
        else:
            pines(d, BH * yb, col, seed, hmin, hmax, (70 + i * 40, 150 + i * 80))
        if i == 1:
            person(d, BW * 0.5, BH * 0.6, 430, (6, 6, 8), head_color=(92, 78, 56), sack=True)
        fog = Image.new('RGB', (BW, BH), 0)
        ImageDraw.Draw(fog).rectangle([0, BH * yb - 200, BW, BH * yb + 120], fill=(26, 30, 36))
        img = ImageChops.add(img, fog.filter(ImageFilter.GaussianBlur(90)))
    d = ImageDraw.Draw(img)
    d.rectangle([0, BH * 0.72, BW, BH], fill=(7, 8, 10))
    return dict(bases=[img], cam=(1.0, 1.7, (0.5, 0.5), (0.5, 0.44)), fog=0.45, fogc=(95, 100, 110))


def s14_title():
    img = vgrad((3, 4, 7), (8, 10, 16))
    d = ImageDraw.Draw(img)
    r = random.Random(14)
    for _ in range(160):
        y = r.uniform(BH * 0.45, BH)
        spread = 30 + (y - BH * 0.45) * 0.4
        x = BW * 0.5 + r.uniform(-spread, spread)
        d.line([(x - 50, y), (x + 50, y)], fill=(70, 80, 100), width=2)
    txt = Image.new('L', (BW, BH), 0)
    td = ImageDraw.Draw(txt)
    text_center(td, BW / 2, BH * 0.3, "CRYSTAL", font(F_BLACK, 220), 255)
    text_center(td, BW / 2, BH * 0.3 + 230, "LAKE", font(F_BLACK, 220), 255)
    noise = np.random.default_rng(1).random((BH, BW))
    blot = Image.fromarray((noise * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(3))
    wear = np.asarray(blot) > 112
    t = (np.asarray(txt) * wear).astype('uint8')
    img.paste((235, 232, 225), mask=Image.fromarray(t))
    d = ImageDraw.Draw(img)
    text_center(d, BW / 2, BH * 0.3 + 490, "HOW A MOM BECAME A MONSTER", font(F_XB, 52), (190, 30, 30))
    return dict(bases=[img], cam=(1.15, 1.0, (0.5, 0.42), (0.5, 0.42)), fog=0.25, fogc=(80, 85, 100), ripple=3)


SCENES = [s01_machete, s02_postcard, s03_boy_dock, s04_counselors, s05_underwater, s06_kneel, s07_split,
          s08_calendar, s09_eye, s10_road, s11_cabins, s12_doorway, s13_forest, s14_title]
