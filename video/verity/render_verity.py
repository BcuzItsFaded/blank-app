"""Render the Verity breakdown video (16:9) from narration clips + procedural ink-style scenes.

usage: python render_verity.py <style.jpg> <vo_dir> <work_dir> <out.mp4>

If <work_dir>/scenes/NN.png exists (a real illustration for scene NN), it is used
instead of the procedural scene, with the same rain/flicker/camera treatment.
"""
import os, sys, re, glob, wave, subprocess
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

STYLE, VO_DIR, WORK, OUT = sys.argv[1:5]
W, H, FPS = 1920, 1080, 30
CW, CH = 2112, 1188
XF = 0.6                     # crossfade seconds
SR = 48000
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_I = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
os.makedirs(WORK, exist_ok=True)

NAVY = (0.035, 0.06, 0.10)
SLATE = (0.16, 0.25, 0.33)
AMBER = np.array([1.0, 0.68, 0.30], np.float32)
COOL = np.array([0.72, 0.84, 1.0], np.float32)
INK = (0.015, 0.02, 0.03)


# ---------- drawing helpers ----------
def grad(w, h, top, bot):
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    return np.broadcast_to(np.array(top, np.float32) * (1 - t) + np.array(bot, np.float32) * t, (h, w, 3)).copy()

def fog(w, h, seed, scale=24, blur=3):
    r = np.random.default_rng(seed)
    a = Image.fromarray((r.random((h // scale + 2, w // scale + 2)) * 255).astype(np.uint8))
    a = a.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur * 8))
    return np.asarray(a).astype(np.float32) / 255

def radial(w, h, cx, cy, rx, ry, p=2.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    return np.clip(1 - d, 0, 1) ** p

def layer(w, h):
    im = Image.new("L", (w, h), 0)
    return im, ImageDraw.Draw(im)

def m(im, blur=0):
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(np.float32) / 255

def paint(img, mask, color, a=1.0):
    img *= 1 - (mask * a)[..., None]
    img += (mask * a)[..., None] * np.array(color, np.float32)

def glow(img, mask, color, a=1.0):
    img += (mask * a)[..., None] * np.array(color, np.float32)

def inkify(img, seed=0):
    """Cross-hatching in the shadows + outline darkening for an inked comic look."""
    h, w = img.shape[:2]
    lum = img.mean(2)
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.random.default_rng(seed).random((h, w)) < 0.85
    h1 = ((xx + yy) % 11 == 0) & r
    h2 = ((xx - yy) % 11 == 0) & r
    shade = np.clip((0.22 - lum) / 0.22, 0, 1)
    dark = h1 * np.clip(shade * 1.6, 0, 1) * 0.35 + h2 * np.clip(shade * 2.5 - 1, 0, 1) * 0.35
    img *= (1 - dark)[..., None]
    e = Image.fromarray((np.clip(lum, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES)
    e = np.asarray(e.filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    img *= (1 - np.clip(e * 3, 0, 0.6))[..., None]
    return img

def person(d, x, y, s, hair=False, hood=False, fill=255):
    """Back/side silhouette: head at (x,y), s = head radius."""
    d.ellipse([x - s, y - s * 1.15, x + s, y + s * 1.05], fill=fill)
    if hair:
        d.polygon([(x - s * 1.25, y - s * 0.2), (x + s * 1.25, y - s * 0.2), (x + s * 1.45, y + s * 2.4), (x - s * 1.45, y + s * 2.4)], fill=fill)
    if hood:
        d.ellipse([x - s * 1.35, y - s * 1.3, x + s * 1.35, y + s * 1.3], fill=fill)
    d.rectangle([x - s * 0.45, y + s * 0.8, x + s * 0.45, y + s * 1.6], fill=fill)
    d.polygon([(x - s * 2.6, y + s * 2.0), (x + s * 2.6, y + s * 2.0), (x + s * 3.1, y + s * 9), (x - s * 3.1, y + s * 9)], fill=fill)
    d.ellipse([x - s * 2.7, y + s * 1.4, x + s * 2.7, y + s * 2.8], fill=fill)

def house(d, x, base, s, fill=255):
    """Gothic manor silhouette; returns window rects (x0,y0,x1,y1)."""
    P = lambda pts: [(x + px * s, base - py * s) for px, py in pts]
    d.polygon(P([(-3, 0), (-3, 2.2), (-1.9, 3.9), (-0.8, 2.2), (-0.8, 2.6), (0.6, 4.6), (1.9, 2.6), (1.9, 2.3), (3.2, 2.3), (3.2, 0)]), fill=fill)
    d.polygon(P([(2.2, 2.2), (2.2, 4.2), (2.55, 5.8), (2.9, 4.2), (2.9, 2.2)]), fill=fill)  # tower + spire
    d.rectangle([x - 1.3 * s, base - 4.2 * s, x - 1.05 * s, base - 3.0 * s], fill=fill)     # chimney
    d.rectangle([x + 1.2 * s, base - 4.0 * s, x + 1.45 * s, base - 3.2 * s], fill=fill)
    wins = []
    for wx, wy in [(-2.4, 0.6), (-1.6, 0.6), (-2.0, 1.7), (0.0, 0.6), (0.9, 0.6), (0.45, 1.9), (2.4, 2.9), (2.75, 0.6)]:
        wins.append((x + wx * s, base - (wy + 0.65) * s, x + (wx + 0.32) * s, base - wy * s))
    return wins

def scribble_page(d, box, rng, fill=70, lines=14, hand=False):
    x0, y0, x1, y1 = box
    for i in range(lines):
        y = y0 + (y1 - y0) * (0.1 + 0.8 * i / lines)
        xe = x0 + (x1 - x0) * rng.uniform(0.65, 0.92)
        x = x0 + (x1 - x0) * 0.08
        pts = []
        while x < xe:
            pts.append((x, y + (rng.uniform(-2.5, 2.5) if hand else rng.uniform(-0.6, 0.6))))
            x += rng.uniform(5, 11)
        if len(pts) > 1: d.line(pts, fill=fill, width=2)

def rot_quad(cx, cy, w, h, ang):
    c, s = np.cos(ang), np.sin(ang)
    return [(cx + px * c - py * s, cy + px * s + py * c) for px, py in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]]


# ---------- scenes ----------
def sc_manor(seed, close=False, dawn=False):
    rng = np.random.default_rng(seed)
    img = grad(CW, CH, (0.10, 0.16, 0.24) if not dawn else (0.36, 0.42, 0.48), (0.03, 0.05, 0.08) if not dawn else (0.18, 0.22, 0.27))
    img += radial(CW, CH, 1500, 260, 520, 420, 2.2)[..., None] * (0.18 if not dawn else 0.25)
    img += (fog(CW, CH, seed, 30) - 0.5)[..., None] * 0.08
    horizon = 760
    tl, td = layer(CW, CH)
    xs = np.arange(0, CW + 40, 34)
    td.polygon([(0, horizon)] + [(x, horizon - 30 - rng.uniform(0, 90)) for x in xs] + [(CW, horizon)], fill=255)
    paint(img, m(tl, 1.5), (0.05, 0.08, 0.11) if not dawn else (0.14, 0.17, 0.2), 0.95)
    hl, hd = layer(CW, CH)
    s = 120 if not close else 300
    hx = 1180 if not close else 1050
    base = horizon + 4 if not close else CH + 200
    wins = house(hd, hx, base, s if not dawn else 40)
    if dawn: wins = []
    paint(img, m(hl, 1), INK, 1.0)
    wl, wd = layer(CW, CH)
    lit = wins[5] if wins and not close else None
    for i, wb in enumerate(wins):
        if wb[1] < 0 or wb[3] > CH: continue
        wd.rectangle(wb, fill=255 if wb is lit else 40)
    if close:   # open doorway with a figure in it, Lowen in foreground
        dl, dd = layer(CW, CH)
        dd.rectangle([960, 640, 1150, 1000], fill=255)
        dd.polygon([(960, 640), (1055, 560), (1150, 640)], fill=255)
        dm = m(dl, 2)
        glow(img, dm, AMBER * 0.9)
        glow(img, radial(CW, CH, 1055, 820, 420, 380, 2) * 0.6, AMBER * 0.4)
        pl, pd = layer(CW, CH)
        person(pd, 1055, 700, 26)
        paint(img, m(pl, 1), INK, 1.0)
        fl, fd = layer(CW, CH)
        person(fd, 420, 760, 62, hair=True, hood=False)
        paint(img, m(fl, 2), INK, 1.0)
        amber = dm + radial(CW, CH, 1055, 820, 420, 380, 2) * 0.6
    else:
        amber = m(wl, 2)
        glow(img, amber, AMBER * 0.9)
        glow(img, m(wl, 18), AMBER * 0.5)
    if not close:  # lake reflection
        top = img[horizon - (CH - horizon):horizon][::-1].copy()
        top = top * np.array([0.55, 0.62, 0.7], np.float32)
        ripple = (np.sin(np.arange(top.shape[0])[:, None] * 0.9) * 3).astype(int)
        for r in range(top.shape[0]):
            top[r] = np.roll(top[r], ripple[r, 0], axis=0)
        img[horizon:] = top[:CH - horizon]
        img[horizon:] *= 0.85
        amber = np.maximum(amber, np.vstack([amber[:horizon], amber[horizon - (CH - horizon):horizon][::-1][:CH - horizon] * 0.5]))
        if dawn:   # drifting canoe
            cl, cd = layer(CW, CH)
            cd.chord([780, 880, 1180, 960], 0, 180, fill=255)
            paint(img, m(cl, 1.5), INK, 0.9)
            img += (fog(CW, CH, seed + 3, 60) * radial(CW, CH, CW / 2, 760, 1400, 160, 1))[..., None] * 0.35
    sky = np.zeros((CH, CW), np.float32); sky[:horizon - 60] = 1
    return dict(img=img, rain=np.ones((CH, CW), np.float32), amber=amber, flash=sky * 0.5 + 0.2)

def sc_bedroom(seed, figure=False, man=False):
    rng = np.random.default_rng(seed)
    img = grad(CW, CH, (0.05, 0.07, 0.10), (0.02, 0.025, 0.035))
    img += (fog(CW, CH, seed, 18) - 0.5)[..., None] * 0.05
    wl, wd = layer(CW, CH)
    for x0 in (620, 900):
        wd.rectangle([x0, 260, x0 + 220, 780], fill=255)
        wd.ellipse([x0, 150, x0 + 220, 370], fill=255)
    win = m(wl, 1)
    pane = grad(CW, CH, (0.30, 0.42, 0.55), (0.14, 0.22, 0.32)) + (fog(CW, CH, seed + 1, 20) - 0.5)[..., None] * 0.12
    img = img * (1 - win[..., None]) + pane * win[..., None]
    ml, md = layer(CW, CH)   # mullions
    for x0 in (620, 900):
        md.line([(x0 + 110, 150), (x0 + 110, 780)], fill=255, width=10)
        for y in (420, 600): md.line([(x0, y), (x0 + 220, y)], fill=255, width=8)
        md.rectangle([x0 - 14, 150, x0 + 234, 790], outline=255, width=16)
    paint(img, m(ml, 1), INK)
    # moonlight on floor
    fl, fd = layer(CW, CH)
    fd.polygon([(640, 1188), (1120, 1188), (1300, 900), (900, 900)], fill=110)
    glow(img, m(fl, 30), COOL * 0.18)
    bl, bd = layer(CW, CH)   # bed
    bd.rectangle([1150, 520, 1180, 1000], fill=255)
    bd.rounded_rectangle([1150, 520, 1900, 640], 40, fill=255)
    bd.rectangle([1150, 780, 2112, 1060], fill=255)
    paint(img, m(bl, 1), (0.03, 0.035, 0.045))
    lamp = radial(CW, CH, 1980, 560, 380, 300, 1.8)
    ll, ld = layer(CW, CH)
    ld.polygon([(1930, 540), (2030, 540), (2005, 480), (1955, 480)], fill=255)
    glow(img, m(ll, 2), AMBER * 0.9)
    glow(img, lamp, AMBER * 0.35)
    if not man:   # Verity lying still, pale hair on the pillow
        pl, pd = layer(CW, CH)
        pd.ellipse([1200, 650, 1420, 790], fill=255)   # pale hair fanned on the pillow
        paint(img, m(pl, 6), (0.62, 0.58, 0.48), 0.45)
        hl, hd = layer(CW, CH)
        hd.ellipse([1270, 690, 1360, 770], fill=255)
        paint(img, m(hl, 2), (0.30, 0.30, 0.30), 0.8)
        bl2, bd2 = layer(CW, CH)
        bd2.chord([1330, 700, 2112, 900], 180, 360, fill=255)
        bd2.rectangle([1330, 800, 2112, 840], fill=255)
        paint(img, m(bl2, 3), (0.13, 0.16, 0.20), 1.0)
    else:          # tall man standing over the bed, seen from the doorway
        pl, pd = layer(CW, CH)
        person(pd, 980, 470, 48)
        pd.rectangle([900, 900, 1060, 1188], fill=255)
        paint(img, m(pl, 1), INK)
        dl, dd = layer(CW, CH)   # doorframe
        dd.rectangle([0, 0, 260, CH], fill=255); dd.rectangle([1860, 0, CW, CH], fill=255); dd.rectangle([0, 0, CW, 90], fill=255)
        paint(img, m(dl, 4), INK)
    return dict(img=img, rain=win, amber=lamp, flash=win * 1.0 + radial(CW, CH, 880, 900, 600, 300) * 0.4)

def sc_desk(seed, two_docs=False, book=False):
    rng = np.random.default_rng(seed)
    img = grad(CW, CH, (0.12, 0.08, 0.05), (0.05, 0.035, 0.025))
    for i in range(0, CH, 6):   # wood grain
        img[i:i + 2] *= 0.93 + 0.05 * np.sin(i * 0.05)
    img += (fog(CW, CH, seed, 10) - 0.5)[..., None] * 0.05
    lamp = radial(CW, CH, 1700 if not two_docs else 1500, 150, 1200, 900, 1.5)
    pl, pd = layer(CW, CH); inkl, ikd = layer(CW, CH)
    if two_docs:
        q1 = rot_quad(660, 640, 640, 840, -0.08); q2 = rot_quad(1450, 640, 620, 820, 0.06)
        pd.polygon(q1, fill=255); pd.polygon(q2, fill=255)
        xs = [p[0] for p in q1]; ys = [p[1] for p in q1]
        scribble_page(ikd, (min(xs) + 30, min(ys) + 40, max(xs) - 30, max(ys) - 40), rng, 200, 26)
        xs = [p[0] for p in q2]; ys = [p[1] for p in q2]
        scribble_page(ikd, (min(xs) + 30, min(ys) + 60, max(xs) - 30, max(ys) - 60), rng, 200, 15, hand=True)
        half = np.zeros((CH, CW), np.float32); half[:, CW // 2:] = 1
        half = np.asarray(Image.fromarray((half * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(120))).astype(np.float32) / 255
        paper = m(pl, 1)
        pc = (0.62, 0.66, 0.70) * (1 - half[..., None]) + np.array([0.90, 0.80, 0.62]) * half[..., None]
        img = img * (1 - paper[..., None]) + pc.astype(np.float32) * paper[..., None]
        img *= (0.75 + 0.25 * half)[..., None]
        glow(img, (1 - half) * 0.25, COOL * 0.25)
        lamp = lamp * half
    elif book:
        pd.polygon([(520, 820), (980, 760), (1000, 1020), (540, 1080)], fill=255)
        pd.polygon([(1000, 760), (1460, 820), (1440, 1080), (1000, 1020)], fill=255)
        paper = m(pl, 1)
        img = img * (1 - paper[..., None]) + np.array([0.86, 0.78, 0.62], np.float32) * paper[..., None]
        scribble_page(ikd, (560, 800, 960, 1040), rng, 180, 10); scribble_page(ikd, (1040, 800, 1420, 1040), rng, 180, 10)
        rl, rd = layer(CW, CH)
        rd.ellipse([1500, 300, 1900, 700], fill=255)
        rl2, rd2 = layer(CW, CH)
        for k in range(6):
            a = k * np.pi / 3
            rd2.ellipse([1700 + np.cos(a) * 110 - 50, 500 + np.sin(a) * 110 - 50, 1700 + np.cos(a) * 110 + 50, 500 + np.sin(a) * 110 + 50], fill=255)
        rd2.ellipse([1680, 480, 1720, 520], fill=255)
        paint(img, np.clip(m(rl, 1) - m(rl2, 1), 0, 1), INK)
        cl, cd = layer(CW, CH)
        cd.polygon(rot_quad(330, 520, 420, 300, -0.1), fill=255)
        paint(img, m(cl, 1), INK)
        sl, sd = layer(CW, CH)
        for k in range(5):
            sd.polygon(rot_quad(180 + k * 90, 380, 40, 70, -0.6), fill=255)
        paint(img, m(sl, 1), (0.8, 0.8, 0.8), 0.8)
    else:
        for k in range(7):
            q = rot_quad(rng.uniform(500, 1600), rng.uniform(350, 950), 520, 680, rng.uniform(-0.5, 0.5))
            sub, sdr = layer(CW, CH); sdr.polygon(q, fill=255)
            paint(img, m(sub, 1), np.array([0.82, 0.76, 0.62]) * rng.uniform(0.85, 1.0))
            paint(img, m(sub, 10) - m(sub, 1) * 0, INK, 0.25)
            img_lines, ild = layer(CW, CH)
            xs = [p[0] for p in q]; ys = [p[1] for p in q]
            scribble_page(ild, (min(xs) + 60, min(ys) + 60, max(xs) - 60, max(ys) - 60), rng, 150, 12, hand=k % 2 == 0)
            paint(img, m(img_lines, 0) * m(sub, 0), INK, 0.6)
        bl, bd = layer(CW, CH)
        bd.ellipse([1720, 760, 1860, 900], fill=255)   # ink bottle
        paint(img, m(bl, 1), INK)
    paint(img, m(inkl, 0.6), (0.08, 0.07, 0.07), 0.8)
    glow(img, lamp, AMBER * 0.25)
    img *= (0.55 + 0.6 * lamp)[..., None]
    return dict(img=img, rain=None, amber=lamp, flash=None)

def sc_stairs(seed):
    img = grad(CW, CH, (0.04, 0.06, 0.09), (0.02, 0.03, 0.04))
    img += (fog(CW, CH, seed, 16) - 0.5)[..., None] * 0.05
    sl, sd = layer(CW, CH)
    for k in range(14):   # steps rising toward the landing
        y = 1188 - k * 52; x0 = 560 + k * 30; x1 = 1560 - k * 30
        sd.rectangle([x0, y - 52, x1, y], fill=255 if k % 2 else 210)
    steps = m(sl, 1)
    paint(img, steps, (0.06, 0.08, 0.11))
    shaft = m(Image.fromarray(np.zeros((CH, CW), np.uint8)))
    al, ad = layer(CW, CH)
    ad.polygon([(1700, 0), (2000, 0), (1400, 1188), (950, 1188)], fill=90)
    shaft = m(al, 40)
    glow(img, shaft, COOL * 0.22)
    dl, dd = layer(CW, CH)
    dd.rectangle([900, 120, 1220, 470], fill=255)
    paint(img, m(dl, 2), (0.0, 0.0, 0.0))
    gl, gd = layer(CW, CH)   # the pale figure in the doorway
    gd.ellipse([1035, 175, 1085, 235], fill=255)
    gd.polygon([(1010, 230), (1110, 230), (1120, 470), (1000, 470)], fill=200)
    gd.polygon([(1030, 190), (1090, 190), (1105, 300), (1015, 300)], fill=230)
    ghost = m(gl, 6)
    pl, pd = layer(CW, CH)
    person(pd, 1060, 860, 44, hair=True)
    paint(img, m(pl, 2), INK)
    return dict(img=img, rain=None, amber=None, flash=shaft * 0.8, ghost=ghost)

def sc_fire(seed):
    rng = np.random.default_rng(seed)
    img = grad(CW, CH, (0.05, 0.04, 0.04), (0.02, 0.02, 0.025))
    fl, fd = layer(CW, CH)
    fd.rectangle([180, 380, 760, 900], fill=255)
    fire = m(fl, 2)
    fire_glow = radial(CW, CH, 470, 760, 1300, 700, 1.4)
    glow(img, fire_glow, np.array([1.0, 0.45, 0.15]) * 0.45)
    paint(img, fire, (0.10, 0.04, 0.02), 1.0)
    tl, td = layer(CW, CH)
    for k in range(9):
        x = 260 + k * 55
        td.polygon([(x, 900), (x + 50, 900), (x + 25 + rng.uniform(-20, 20), 900 - rng.uniform(120, 300))], fill=255)
    flame = m(tl, 14)
    glow(img, flame, (1.0, 0.45, 0.10), 1.0)
    glow(img, m(tl, 4) * 0.6, (1.0, 0.85, 0.5), 1.0)
    fire = flame
    ml, md = layer(CW, CH)
    md.rectangle([120, 330, 820, 380], fill=255); md.rectangle([120, 330, 180, 1000], fill=255); md.rectangle([760, 330, 820, 1000], fill=255)
    paint(img, m(ml, 1), INK)
    pl, pd = layer(CW, CH)
    pd.rounded_rectangle([1150, 560, 1650, 1100], 60, fill=255)   # armchair
    person(pd, 1330, 600, 46)
    paint(img, m(pl, 1), INK)
    for k in range(9):   # pages on the floor
        q = rot_quad(rng.uniform(800, 1500), rng.uniform(1030, 1150), 150, 110, rng.uniform(-1, 1))
        sl, sd = layer(CW, CH); sd.polygon(q, fill=255)
        paint(img, m(sl, 1), (0.85, 0.6, 0.38), 0.9)
    return dict(img=img, rain=None, amber=fire_glow + fire, flash=None, fire=True)

def sc_window_woman(seed):
    img = grad(CW, CH, (0.04, 0.06, 0.09), (0.02, 0.03, 0.04))
    wl, wd = layer(CW, CH)
    wd.rectangle([300, 120, 1500, 1000], fill=255)
    win = m(wl, 1)
    pane = grad(CW, CH, (0.26, 0.36, 0.48), (0.10, 0.15, 0.22)) + (fog(CW, CH, seed, 22) - 0.5)[..., None] * 0.15
    hl, hd = layer(CW, CH)
    house(hd, 900, 900, 60)
    pane *= (1 - m(hl, 2) * 0.6)[..., None]
    img = img * (1 - win[..., None]) + pane * win[..., None]
    ml, md = layer(CW, CH)
    md.rectangle([284, 104, 1516, 1016], outline=255, width=30)
    md.line([(900, 120), (900, 1000)], fill=255, width=16); md.line([(300, 560), (1500, 560)], fill=255, width=14)
    paint(img, m(ml, 1), INK)
    pl, pd = layer(CW, CH)
    person(pd, 1600, 520, 90, hair=True)
    paint(img, m(pl, 2), INK)
    letter = layer(CW, CH)
    letter[1].polygon(rot_quad(1480, 980, 150, 200, -0.3), fill=255)
    lm = m(letter[0], 1)
    paint(img, lm, (0.85, 0.75, 0.55))
    glow(img, radial(CW, CH, 1480, 980, 260, 220), AMBER * 0.2)
    return dict(img=img, rain=win, amber=lm, flash=win)

def sc_style(seed, cam):
    """Your illustration, pillarboxed over a blurred copy, with a tall canvas for tilts."""
    src = Image.open(STYLE).convert("RGB")
    fw = 1150
    fh = int(src.height * fw / src.width)
    ch = max(CH, fh)
    bg = src.resize((CW, int(src.height * CW / src.width))).crop((0, 0, CW, ch)) if int(src.height * CW / src.width) >= ch else src.resize((CW, ch))
    bg = np.asarray(bg.filter(ImageFilter.GaussianBlur(40))).astype(np.float32) / 255 * 0.35
    fg = np.asarray(src.resize((fw, fh), Image.LANCZOS)).astype(np.float32) / 255
    x0 = (CW - fw) // 2; y0 = (ch - fh) // 2
    img = bg.copy()
    edge = np.ones((fh, fw), np.float32)
    ramp = np.linspace(0, 1, 60)
    edge[:, :60] *= ramp; edge[:, -60:] *= ramp[::-1]
    img[y0:y0 + fh, x0:x0 + fw] = img[y0:y0 + fh, x0:x0 + fw] * (1 - edge[..., None]) + fg * edge[..., None]
    k = fw / src.width
    B = fg
    blue = np.clip((B[..., 2] - B[..., 0]) * 6, 0, 1) * (np.arange(fw)[None, :] < 440 * k) * (np.arange(fh)[:, None] > 60 * k) * (np.arange(fh)[:, None] < 1000 * k)
    rain = np.zeros((ch, CW), np.float32); rain[y0:y0 + fh, x0:x0 + fw] = blue
    amber = np.zeros((ch, CW), np.float32)
    amber += radial(CW, ch, x0 + 565 * k, y0 + 541 * k, 240 * k, 210 * k, 1.6)
    beam = radial(CW, ch, x0 + 512 * k, y0 + 775 * k, 210 * k, 90 * k, 1.3)
    return dict(img=img, rain=rain, amber=amber, flash=rain, beam=beam, cam=cam(x0, y0, k, ch))


# camera paths: (cx, cy, crop width) at start -> end
def cam_pt(x0, y0, k, x, y): return (x0 + x * k, y0 + y * k)
SCENES = {
    1: dict(fn=lambda: sc_manor(1), lightning=[3.2, 13.0], title=("VERITY", "THE STORY  •  THE TWIST  •  THE ENDING"), z=(1.0, 0.88)),
    2: dict(fn=lambda: sc_style(2, lambda x0, y0, k, ch: [(cam_pt(x0, y0, k, 380, 420) + (1500,)), (cam_pt(x0, y0, k, 400, 900) + (1250,))]), chapter="I.  THE GHOSTWRITER"),
    3: dict(fn=lambda: sc_manor(3, close=True), lightning=[8.5], z=(1.0, 0.9)),
    4: dict(fn=lambda: sc_bedroom(4), z=(0.95, 0.82)),
    5: dict(fn=lambda: sc_style(5, lambda x0, y0, k, ch: [(cam_pt(x0, y0, k, 520, 700) + (1400,)), (cam_pt(x0, y0, k, 560, 760) + (980,))]), chapter="II.  THE MANUSCRIPT"),
    6: dict(fn=lambda: sc_desk(6), z=(1.0, 0.86), dust=True),
    7: dict(fn=lambda: sc_manor(7, dawn=True), z=(0.9, 0.98), drizzle=True),
    8: dict(fn=lambda: sc_stairs(8), lightning=[6.5], z=(1.0, 0.8)),
    9: dict(fn=lambda: sc_fire(9), z=(1.0, 0.88), chapter="III.  THE TWIST"),
    10: dict(fn=lambda: sc_bedroom(10, man=True), lightning=[1.6, 7.5, 11.5], z=(0.95, 0.85)),
    11: dict(fn=lambda: sc_style(11, lambda x0, y0, k, ch: [(cam_pt(x0, y0, k, 384, 690) + (2112,)), (cam_pt(x0, y0, k, 470, 760) + (900,))]), chapter="IV.  THE LETTER"),
    12: dict(fn=lambda: sc_desk(12, two_docs=True), z=(1.0, 0.85), dust=True),
    13: dict(fn=lambda: sc_window_woman(13), lightning=[13.0], z=(1.0, 0.88), chapter="V.  WHICH VERITY IS REAL?"),
    14: dict(fn=lambda: sc_desk(14, book=True), z=(1.0, 0.86), dust=True, chapter="VI.  BOOK VS. MOVIE"),
    15: dict(fn=lambda: sc_manor(15), lightning=[5.0], z=(0.86, 1.0), end=True),
}


# ---------- timeline ----------
def wav_len(p):
    with wave.open(p) as w: return w.getnframes() / w.getframerate()

vo_files = sorted(glob.glob(os.path.join(VO_DIR, "*.wav")))
assert len(vo_files) == len(SCENES), (len(vo_files), len(SCENES))
LEAD = {1: 3.0}
TAIL = {15: 4.0}
timeline, t = [], 0.0
for i, f in enumerate(vo_files, 1):
    lead, tail = LEAD.get(i, 0.9), TAIL.get(i, 0.8)
    dur = lead + wav_len(f) + tail
    timeline.append(dict(i=i, start=t, dur=dur, vo=f, vo_at=t + lead))
    t += dur - XF
TOTAL = t + XF


def render_scene(i):
    spec = SCENES[i]; tl = timeline[i - 1]
    out = os.path.join(WORK, f"clip_{i:02d}.mp4")
    custom = os.path.join(WORK, "scenes", f"{i:02d}.png")
    if os.path.exists(custom):
        im = np.asarray(Image.open(custom).convert("RGB").resize((CW, CH), Image.LANCZOS)).astype(np.float32) / 255
        S = dict(img=im, rain=None, amber=None, flash=None)
    else:
        S = spec["fn"]()
        if "cam" not in S: S["img"] = inkify(S["img"], i)
    img = S["img"]; ch, cw = img.shape[:2]
    rng = np.random.default_rng(100 + i)
    n = int(round(tl["dur"] * FPS))
    if "cam" in S:
        (ax, ay, aw), (bx, by, bw) = S["cam"]
    else:
        z0, z1 = spec.get("z", (1.0, 0.9))
        ax, ay, aw = cw / 2, ch / 2, CW * z0
        bx, by, bw = cw / 2 + rng.uniform(-60, 60), ch / 2 + rng.uniform(-30, 30), CW * z1
    yy, xx = np.mgrid[0:ch, 0:cw]
    vign_full = np.clip(1 - 0.5 * (((xx - cw / 2) / (cw * 0.7)) ** 2 + ((yy - ch / 2) / (ch * 0.65)) ** 2), 0.35, 1).astype(np.float32)
    del yy, xx
    drops = np.column_stack([rng.uniform(0, cw, 500), rng.uniform(0, ch, 500), rng.uniform(1600, 2600, 500), rng.uniform(20, 55, 500)])
    if spec.get("drizzle"): drops = drops[:120]
    motes = np.column_stack([rng.uniform(0, cw, 90), rng.uniform(0, ch, 90), rng.uniform(-10, 10, 90), rng.uniform(-14, 6, 90), rng.uniform(0, 6.28, 90)])
    flick = np.convolve(rng.normal(0, 1, n + 8), np.ones(4) / 4, "same")
    grain = [rng.normal(0, 6, (H, W, 1)).astype(np.int16) for _ in range(6)]
    tfont = ImageFont.truetype(FONT_B, 150); sfont = ImageFont.truetype(FONT_I, 44); cfont = ImageFont.truetype(FONT_B, 64)
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    dt = 1 / FPS
    for f in range(n):
        tt = f * dt; p = tt / tl["dur"]; e = p * p * (3 - 2 * p)
        cx, cy, w_ = ax + (bx - ax) * e, ay + (by - ay) * e, aw + (bw - aw) * e
        h_ = w_ * 9 / 16
        cx += np.sin(tt * 0.8) * 3; cy += np.cos(tt * 0.6) * 3
        x0 = float(np.clip(cx - w_ / 2, 0, cw - w_)); y0 = float(np.clip(cy - h_ / 2, 0, ch - h_))
        X0, Y0 = int(x0), int(y0); X1, Y1 = min(cw, int(np.ceil(x0 + w_)) + 1), min(ch, int(np.ceil(y0 + h_)) + 1)
        F = img[Y0:Y1, X0:X1].copy(); rw, rh = X1 - X0, Y1 - Y0
        if S.get("rain") is not None:
            lay = Image.new("L", (rw, rh), 0); d = ImageDraw.Draw(lay)
            drops[:, 1] += drops[:, 2] * dt; drops[:, 0] += drops[:, 2] * dt * 0.1
            wr = drops[:, 1] > ch; drops[wr, 1] = rng.uniform(-60, 0, wr.sum()); drops[wr, 0] = rng.uniform(-100, cw, wr.sum())
            for x, y, v, L in drops:
                if X0 - 20 < x < X1 + 20 and Y0 - 60 < y < Y1 + 60:
                    d.line([(x - X0, y - Y0), (x - X0 - L * 0.1, y - Y0 - L)], fill=int(70 + v / 25), width=2)
            R = np.asarray(lay).astype(np.float32) / 255
            F += (R * S["rain"][Y0:Y1, X0:X1])[..., None] * COOL * 0.3
        if S.get("amber") is not None:
            amp = 0.08 if S.get("fire") else 0.05
            fl = amp * flick[f] + (0.04 * np.sin(tt * 9) if S.get("fire") else 0)
            F *= (1 + S["amber"][Y0:Y1, X0:X1] * fl * 2.5)[..., None]
        if S.get("beam") is not None:
            F += (S["beam"][Y0:Y1, X0:X1] * (0.05 * np.sin(tt * 2.3) + 0.03 * np.sin(tt * 7.1)))[..., None] * AMBER
        if S.get("ghost") is not None:
            a = 0.10 + 0.08 * np.sin(tt * 0.9) ** 2
            F += (S["ghost"][Y0:Y1, X0:X1] * a)[..., None] * np.array([0.8, 0.85, 0.9], np.float32)
        if spec.get("dust"):
            ml = Image.new("L", (rw, rh), 0); md = ImageDraw.Draw(ml)
            motes[:, 0] += motes[:, 2] * dt; motes[:, 1] += motes[:, 3] * dt
            for x, y, *_, ph in motes:
                md.ellipse([x - X0 - 2, y - Y0 - 2, x - X0 + 2, y - Y0 + 2], fill=int(120 + 100 * np.sin(tt * 1.5 + ph)))
            F += (np.asarray(ml).astype(np.float32) / 255 * 0.35)[..., None] * AMBER
        Lg = 0.0
        for lt in spec.get("lightning", []):
            for off, a in ((0, 1.0), (0.12, 0.6), (0.3, 0.35)):
                dd = tt - (lt + off)
                if dd >= 0: Lg += a * np.exp(-dd * 14)
        if Lg > 0.01:
            fm = S.get("flash")
            if fm is not None: F += (fm[Y0:Y1, X0:X1] * min(Lg, 1.3) * 0.8)[..., None] * COOL
            F = F * (1 + 0.3 * min(Lg, 1.3))
        F *= vign_full[Y0:Y1, X0:X1, None]
        fr = Image.fromarray((np.clip(F, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC, box=(x0 - X0, y0 - Y0, x0 - X0 + w_, y0 - Y0 + h_))
        # titles
        if "title" in spec or "chapter" in spec:
            a = np.clip(min((tt - 0.4) / 0.8, (3.6 - tt) / 0.8), 0, 1) if "chapter" in spec else np.clip(min((tt - 0.3) / 1.0, (6.5 - tt) / 1.0), 0, 1)
            if a > 0:
                tx = Image.new("RGBA", (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(tx)
                if "title" in spec:
                    t1, t2 = spec["title"]
                    td.text((W / 2, H * 0.42), t1, font=tfont, anchor="mm", fill=(235, 225, 205, int(255 * a)), stroke_width=4, stroke_fill=(5, 8, 12, int(230 * a)))
                    td.text((W / 2, H * 0.55), t2, font=sfont, anchor="mm", fill=(225, 190, 130, int(255 * a)))
                else:
                    td.text((110, H - 150), spec["chapter"], font=cfont, anchor="ls", fill=(235, 225, 205, int(255 * a)), stroke_width=3, stroke_fill=(5, 8, 12, int(200 * a)))
                    td.line([(112, H - 128), (112 + 420 * a, H - 128)], fill=(225, 170, 90, int(255 * a)), width=4)
                fr = Image.alpha_composite(fr.convert("RGBA"), tx).convert("RGB")
        o = np.asarray(fr).astype(np.int16) + grain[f % 6]
        ff.stdin.write(np.clip(o, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    return i


# ---------- audio ----------
def lowpass(x, hz):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (fr / hz) ** 4)
    return np.fft.irfft(X, len(x))

def build_audio():
    n = int(TOTAL * SR); tt = np.arange(n) / SR
    rng = np.random.default_rng(5)
    vo = np.zeros(n)
    for tl in timeline:
        rs = os.path.join(WORK, f"vo48_{tl['i']:02d}.raw")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tl["vo"], "-ac", "1", "-ar", str(SR), "-f", "f32le", rs], check=True)
        a = np.fromfile(rs, np.float32).astype(np.float64)
        s = int(tl["vo_at"] * SR); vo[s:s + len(a)] += a[:n - s]
    vo = vo / np.max(np.abs(vo)) * 0.9
    # dark ambient pad: A minor drone with slow swells
    pad = np.zeros(n)
    for f0, a in ((55, 0.5), (82.41, 0.3), (110, 0.25), (130.81, 0.18), (164.81, 0.1)):
        lfo = 0.6 + 0.4 * np.sin(2 * np.pi * tt / rng.uniform(9, 17) + rng.uniform(0, 6))
        pad += a * lfo * np.sin(2 * np.pi * f0 * tt + 0.3 * np.sin(2 * np.pi * 0.1 * tt))
    pad = pad / np.max(np.abs(pad)) * 0.16
    rain = lowpass(rng.normal(0, 1, n), 3500) * 0.05
    thunder = np.zeros(n)
    for tl in timeline:
        for lt in SCENES[tl["i"]].get("lightning", []):
            s = int((tl["start"] + lt + 0.7) * SR); L = min(int(4.5 * SR), n - s)
            if L <= 0: continue
            b = lowpass(rng.normal(0, 1, L), 90)
            env = (1 - np.exp(-np.arange(L) / (0.08 * SR))) * np.exp(-np.arange(L) / (1.3 * SR))
            thunder[s:s + L] += b / np.max(np.abs(b)) * env * 0.45
    # duck the bed under the voice
    k = SR // 5
    c = np.concatenate([[0], np.cumsum(np.abs(vo))])
    env = np.empty(n); env[:] = (c[np.minimum(np.arange(n) + k // 2, n)] - c[np.maximum(np.arange(n) - k // 2, 0)]) / k
    duck = 1 - 0.55 * np.clip(env / (env.max() * 0.25), 0, 1)
    mix = vo + (pad + rain + thunder) * duck
    fade = np.minimum(1, np.minimum(tt / 2.0, (TOTAL - tt) / 3.0))
    mix = mix * fade / np.max(np.abs(mix)) * 0.92
    st = np.stack([mix, mix], 1)
    with wave.open(os.path.join(WORK, "mix.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())

def write_srt():
    def ts(x):
        ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); mi, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
        return f"{h:02d}:{mi:02d}:{s:02d},{ms:03d}"
    md = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "script_and_shots.md")).read()
    vos = re.findall(r"\*\*VO:\*\* (.+)", md)
    out, k = [], 1
    for tl, text in zip(timeline, vos):
        parts = [p.strip() for p in re.split(r"(?<=[.?!:])\s+", text) if p.strip()]
        total = sum(len(p) for p in parts); t0 = tl["vo_at"]; d = wav_len(tl["vo"])
        for p in parts:
            t1 = t0 + d * len(p) / total
            out.append(f"{k}\n{ts(t0)} --> {ts(t1)}\n{p}\n"); k += 1; t0 = t1
    open(os.path.splitext(OUT)[0] + ".srt", "w").write("\n".join(out))


if __name__ == "__main__":
    print(f"total {TOTAL:.1f}s", flush=True)
    only = [int(a) for a in os.environ.get("ONLY", "").split(",") if a]
    if not os.environ.get("SKIP_RENDER"):
        with Pool(4) as pool:
            for i in pool.imap_unordered(render_scene, only or list(SCENES)):
                print("scene", i, "done", flush=True)
    if only: sys.exit()
    build_audio(); write_srt()
    inputs, filt, last, off = [], [], "0:v", 0.0
    for tl in timeline:
        inputs += ["-i", os.path.join(WORK, f"clip_{tl['i']:02d}.mp4")]
    for k, tl in enumerate(timeline[1:], 1):
        off = tl["start"]
        filt.append(f"[{last}][{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}[v{k}]"); last = f"v{k}"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-i", os.path.join(WORK, "mix.wav"),
                    "-filter_complex", ";".join(filt) + f";[{last}]fade=in:0:20[vout]", "-map", "[vout]", "-map", f"{len(timeline)}:a",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", "-shortest", OUT], check=True)
    print("done", OUT)
