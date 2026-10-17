"""The Green Mile ending explained: cartoon explainer (16:9) and Short (9:16).

Uses the shared cartoon engine in ../crystal_lake.
usage: python gm.py long|short VO_DIR SCRIPT OUT
       python gm.py still long|short VO_DIR SCRIPT DIR
"""
import math, os, random, subprocess, sys, wave
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "crystal_lake"))

import cairo
import numpy as np

import cartoon as C
from cartoon import Char, hx, ease, lerp, text, plaque, rrect, ell, fs, src, INK, SKIN_L, SKIN_D
from render import Para, wav_len, LEAD, TAIL
from story import Rd, cam, grade, tint, flash, sepia_bubble, badge, stamp, make_grain, ap

FPS = 30
BONE = hx("#f4ead2")
LIME = hx("#9fd36a")
GOLD = (1.0, 0.82, 0.4)
PI = math.pi

# ------------------------------------------------------------------ cast
UNI, UNI_P = hx("#56657a"), hx("#2e3644")
DENIM, DENIM_P = hx("#7d9cc0"), hx("#41587a")
GM = {
    "paul": Char(skin=SKIN_L, hair=hx("#6a4a30"), hair_style="short", shirt=UNI, top="uniform", pants=UNI_P,
                 hat="police", head_r=68),
    "brutal": Char(skin=hx("#eec6a4"), hair=hx("#8a6a48"), hair_style="short", shirt=UNI, top="uniform", pants=UNI_P,
                   hat="police", head_r=70, bulk=1.25, leg=300, torso=210),
    "percy": Char(skin=hx("#f3d0b4"), hair=hx("#1c1612"), hair_style="slick", shirt=UNI, top="uniform", pants=UNI_P,
                  head_r=64, bulk=0.82, leg=255, torso=175),
    "coffey": Char(skin=hx("#4a2c20"), hair_style="bald", hair=hx("#4a2c20"), shirt=DENIM, top="shirt", pants=DENIM_P,
                   head_r=74, bulk=1.6, leg=345, torso=255, arm=250, patch="E-12"),
    "del": Char(skin=hx("#ecc4a0"), hair=hx("#3a2a1e"), hair_style="short", shirt=DENIM, top="shirt", pants=DENIM_P,
                head_r=62, bulk=0.78, leg=240, torso=165, mustache=hx("#3a2a1e"), patch="E-3"),
    "bill": Char(skin=hx("#f0c8a6"), hair=hx("#d4b25e"), hair_style="curly", shirt=DENIM, top="shirt", pants=DENIM_P,
                 head_r=64, bulk=0.95, patch="E-9"),
    "warden": Char(skin=hx("#eec8aa"), hair=hx("#a8a8a8"), hair_style="slick", shirt=hx("#4a3a2c"), top="suit",
                   pants=hx("#4a3a2c"), tie=hx("#2a3a5a"), head_r=66, old=True),
    "melinda": Char(skin=hx("#e8d0c0"), hair=hx("#8a7a6a"), hair_style="pam", shirt=hx("#b8cde0"), top="gown", head_r=66),
    "old_paul": Char(skin=hx("#efd2bc"), hair_style="tufts", shirt=hx("#7a5a3c"), top="sweater", pants=hx("#5a5a60"),
                     head_r=68, old=True, glasses=True, bulk=0.92),
    "elaine": Char(skin=hx("#f0d6c4"), hair=hx("#e6e2da"), hair_style="pam", shirt=hx("#9a86b0"), top="dress", head_r=64,
                   old=True, lashes=True),
    "percy_jacket": Char(skin=hx("#f3d0b4"), hair=hx("#1c1612"), hair_style="slick", shirt=hx("#e6e0d0"), top="straitjacket",
                         pants=UNI_P, head_r=64, bulk=0.82, leg=255, torso=175),
    "posse": Char(skin=hx("#e8c2a2"), hair=hx("#3a2a1e"), hair_style="short", shirt=hx("#6a5a3a"), top="coat",
                  pants=hx("#3a3530"), head_r=64, hat="fedora"),
    "dancer_m": Char(skin=hx("#ececec"), hair=hx("#202020"), hair_style="slick", shirt=hx("#202020"), top="suit",
                     pants=hx("#202020"), tie=hx("#f0f0f0"), head_r=60),
    "dancer_f": Char(skin=hx("#ececec"), hair=hx("#c8c8c8"), hair_style="pam", shirt=hx("#f2f2f2"), top="gown", head_r=58),
}


# ------------------------------------------------------------------ effects
def insects(ctx, x, y, t, k, dx=0.0, dy=-1.0, n=60, seed=0, spread=1.0, inward=False):
    """Cloud of tiny black insects pouring from (x, y). k: 0..1 progress of the cloud."""
    if k <= 0:
        return
    rnd = random.Random(seed)
    for i in range(n):
        d0 = rnd.random()
        life = (k * 1.4 - d0 * 0.6)
        if life <= 0 or life > 1.3:
            continue
        L = life * 420 * spread
        if inward:
            L = (1 - min(1, life)) * 420 * spread
        wob = rnd.uniform(-1, 1)
        px = x + dx * L + math.sin(t * 9 + i) * 14 * min(1, life * 2) + wob * L * 0.45
        py = y + dy * L + math.cos(t * 11 + i * 1.7) * 12 + rnd.uniform(-1, 1) * L * 0.25
        a = max(0, min(1, (1.3 - life) * 2))
        ctx.set_source_rgba(0.04, 0.03, 0.03, 0.9 * a)
        ell(ctx, px, py, 3.2, 2.4)
        ctx.fill()
        wing = 0.5 + 0.5 * math.sin(t * 60 + i)
        ctx.set_source_rgba(0.8, 0.85, 0.9, 0.35 * a)
        ell(ctx, px - 2, py - 3, 3 * wing + 0.5, 1.6)
        ell(ctx, px + 2, py - 3, 3 * wing + 0.5, 1.6)
        ctx.fill()


def heal_glow(ctx, x, y, r, k, t):
    if k <= 0:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(t * 0.4)
    for i in range(12):  # light rays
        ctx.rotate(PI / 6)
        g = cairo.LinearGradient(0, 0, r * 2.4, 0)
        g.add_color_stop_rgba(0, *GOLD, 0.35 * k)
        g.add_color_stop_rgba(1, *GOLD, 0)
        ctx.set_source(g)
        ctx.move_to(0, 0)
        ctx.line_to(r * 2.4, -r * 0.12)
        ctx.line_to(r * 2.4, r * 0.12)
        ctx.close_path()
        ctx.fill()
    ctx.restore()
    g = cairo.RadialGradient(x, y, 0, x, y, r * (1 + 0.08 * math.sin(t * 6)))
    g.add_color_stop_rgba(0, 1, 0.97, 0.85, 0.95 * k)
    g.add_color_stop_rgba(0.35, *GOLD, 0.55 * k)
    g.add_color_stop_rgba(1, *GOLD, 0)
    ctx.set_source(g)
    ell(ctx, x, y, r * 1.1, r * 1.1)
    ctx.fill()


def arcs(ctx, x0, y0, x1, y1, t, n=3, a=1.0):
    rnd = random.Random(int(t * 24))
    for k in range(n):
        ctx.new_path()
        ctx.move_to(x0, y0)
        segs = 9
        for i in range(1, segs):
            f = i / segs
            ctx.line_to(lerp(x0, x1, f) + rnd.uniform(-40, 40), lerp(y0, y1, f) + rnd.uniform(-20, 20))
        ctx.line_to(x1, y1)
        ctx.set_line_width(10)
        ctx.set_source_rgba(0.5, 0.7, 1, 0.35 * a)
        ctx.stroke_preserve()
        ctx.set_line_width(3)
        ctx.set_source_rgba(0.95, 0.98, 1, 0.95 * a)
        ctx.stroke()


def smoke(ctx, x, y, t, k, seed=0):
    rnd = random.Random(seed)
    for i in range(14):
        ph = (t * 0.25 + rnd.random()) % 1
        px = x + rnd.uniform(-60, 60) + math.sin(t + i) * 30 * ph
        py = y - ph * 420
        r = 40 + ph * 120
        g = cairo.RadialGradient(px, py, 0, px, py, r)
        g.add_color_stop_rgba(0, 0.7, 0.7, 0.72, 0.28 * k * (1 - ph))
        g.add_color_stop_rgba(1, 0.7, 0.7, 0.72, 0)
        ctx.set_source(g)
        ell(ctx, px, py, r, r)
        ctx.fill()


def dust(ctx, t, x0, x1, y0, y1, n=40, seed=0):
    rnd = random.Random(seed)
    for i in range(n):
        px = rnd.uniform(x0, x1) + math.sin(t * 0.3 + i) * 20
        py = (rnd.uniform(y0, y1) - t * 8 * rnd.uniform(0.5, 1.5)) % (y1 - y0) + y0
        ctx.set_source_rgba(1, 0.95, 0.8, 0.35 * abs(math.sin(t + i)))
        ell(ctx, px, py, 2, 2)
        ctx.fill()


def mouse(ctx, x, y, s, t, facing=1, spool=False, alive=True, glow=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * facing, s)
    hop = abs(math.sin(t * 6)) * 6 if alive else 0
    ctx.translate(0, -hop)
    ctx.new_path()  # tail
    ctx.move_to(-38, -12)
    ctx.curve_to(-70, -10 + 10 * math.sin(t * 4), -90, -40, -110, -30 + 8 * math.sin(t * 3))
    ctx.set_line_width(4)
    src(ctx, hx("#d89a8a"))
    ctx.stroke()
    ell(ctx, 0, -22, 42, 24)
    fs(ctx, hx("#9a8f86"), 3.5)
    ell(ctx, 34, -34, 22, 18)
    fs(ctx, hx("#a59a90"), 3.5)
    ell(ctx, 26, -54, 12, 14)
    fs(ctx, hx("#e8b4ae"), 3)
    ell(ctx, 44, -36, 4, 4.5)
    src(ctx, INK)
    ctx.fill()
    ell(ctx, 56, -30, 4, 4)
    src(ctx, hx("#e88a8a"))
    ctx.fill()
    ctx.set_line_width(1.5)
    src(ctx, INK)
    for k in (-1, 1):
        ctx.move_to(54, -30)
        ctx.line_to(76, -30 + k * 8)
        ctx.stroke()
    if spool:
        ctx.save()
        ctx.translate(96, -14)
        ctx.rotate(t * 3)
        ctx.rectangle(-14, -14, 28, 28)
        fs(ctx, hx("#c7a46a"), 3)
        ell(ctx, 0, 0, 8, 8)
        fs(ctx, hx("#d23a3a"), 2)
        ctx.restore()
    ctx.restore()
    if glow > 0:
        heal_glow(ctx, x, y - 20 * s, 90 * s, glow, t)


def tv(ctx, x, y, s, t, dancers=True):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    rrect(ctx, -200, -170, 400, 300, 26)
    fs(ctx, hx("#6b4a2c"), 6)
    rrect(ctx, -170, -140, 280, 230, 30)
    fs(ctx, hx("#1a1c1e"), 5)
    ctx.save()
    rrect(ctx, -165, -135, 270, 220, 28)
    ctx.clip()
    g = cairo.RadialGradient(-30, -25, 10, -30, -25, 200)
    g.add_color_stop_rgb(0, 0.85, 0.87, 0.9)
    g.add_color_stop_rgb(1, 0.35, 0.37, 0.4)
    ctx.set_source(g)
    ctx.paint()
    if dancers:
        couple(ctx, -30, 70, 0.22, t)
    ctx.set_source_rgba(0, 0, 0, 0.12)
    for k in range(-140, 100, 6):
        ctx.rectangle(-170, k, 280, 2)
    ctx.fill()
    ctx.restore()
    for k in range(2):
        ell(ctx, 150, -90 + k * 60, 16, 16)
        fs(ctx, hx("#c9a46a"), 3)
    ctx.restore()


def couple(ctx, x, y, s, t):
    """Two black-and-white ballroom dancers (generic) twirling."""
    sway = math.sin(t * 2.2)
    GM["dancer_m"].draw(ctx, x - 70 * s * 2.6 + sway * 20 * s, y, s, t=t, armR=100 + 30 * sway, elbowR=20, armL=30,
                        walk=t * 4, expr="happy")
    GM["dancer_f"].draw(ctx, x + 70 * s * 2.6 + sway * 20 * s, y, s, t=t, facing=-1, armR=110 - 30 * sway, elbowR=20,
                        armL=60, expr="happy", lean=4 * sway)


# ------------------------------------------------------------------ sets
def floor_tiles(ctx, y0, y1, color=hx("#7fbf4f")):
    g = cairo.LinearGradient(0, y0, 0, y1)
    g.add_color_stop_rgb(0, *C.mix(color, (0, 0, 0), 0.25))
    g.add_color_stop_rgb(1, *color)
    ctx.set_source(g)
    ctx.rectangle(-1200, y0, 4400, y1 - y0 + 600)
    ctx.fill()
    ctx.set_line_width(2)
    ctx.set_source_rgba(0, 0, 0, 0.18)
    for i in range(-30, 60):
        ctx.move_to(960 + i * 40, y0)
        ctx.line_to(960 + i * 160, y1 + 400)
        ctx.stroke()
    yy, step = y0, 10
    while yy < y1 + 400:
        ctx.move_to(-1200, yy)
        ctx.line_to(3200, yy)
        ctx.stroke()
        yy += step
        step *= 1.25
    ctx.set_source_rgba(1, 1, 1, 0.08)  # polished shine
    ell(ctx, 960, y0 + (y1 - y0) * 0.5, 700, 60)
    ctx.fill()


def ceiling_lamp(ctx, x, y, t, flicker=0.0, cone=True, length=900):
    on = 1.0
    if flicker > 0:
        rnd = random.Random(int(t * 14) + int(x))
        on = 0.25 if rnd.random() < flicker else 1.0
    ctx.move_to(x, y - 400)
    ctx.line_to(x, y)
    ctx.set_line_width(3)
    src(ctx, INK)
    ctx.stroke()
    ctx.new_path()
    ctx.move_to(x - 40, y + 30)
    ctx.line_to(x - 16, y)
    ctx.line_to(x + 16, y)
    ctx.line_to(x + 40, y + 30)
    ctx.close_path()
    fs(ctx, hx("#3a4a3a"), 3)
    if cone:
        g = cairo.LinearGradient(x, y, x, y + length)
        g.add_color_stop_rgba(0, 1, 0.95, 0.75, 0.32 * on)
        g.add_color_stop_rgba(1, 1, 0.95, 0.75, 0)
        ctx.set_source(g)
        ctx.move_to(x - 36, y + 30)
        ctx.line_to(x + 36, y + 30)
        ctx.line_to(x + 300, y + length)
        ctx.line_to(x - 300, y + length)
        ctx.close_path()
        ctx.fill()
    ell(ctx, x, y + 32, 14, 8)
    ctx.set_source_rgba(1, 0.97, 0.85, on)
    ctx.fill()


def bg_mile_corridor(ctx, t, flicker=0.0):
    """One-point perspective down the Green Mile."""
    vx, vy = 960, 470
    ctx.set_source_rgb(*hx("#1c221c"))
    ctx.paint()
    # walls
    for side in (-1, 1):
        ctx.new_path()
        ctx.move_to(vx + side * 170, vy - 170)
        ctx.line_to(vx + side * 1800, -500)
        ctx.line_to(vx + side * 1800, 1600)
        ctx.line_to(vx + side * 170, vy + 120)
        ctx.close_path()
        src(ctx, hx("#2a3329") if side < 0 else hx("#232b22"))
        ctx.fill()
    # floor
    ctx.save()
    ctx.new_path()
    ctx.move_to(vx - 170, vy + 120)
    ctx.line_to(vx + 170, vy + 120)
    ctx.line_to(vx + 1800, 1600)
    ctx.line_to(vx - 1800, 1600)
    ctx.close_path()
    ctx.clip()
    floor_tiles(ctx, vy + 120, 1100)
    ctx.restore()
    # cells: bars receding along both walls
    for side in (-1, 1):
        for k in range(10):
            f0 = 0.92 ** (k * 3)
            f1 = 0.92 ** (k * 3 + 2)
            for f in np.linspace(f0, f1, 7):
                x = vx + side * lerp(170, 1800, f)
                ytop = lerp(vy - 170, -500, f) + 60 * f
                ybot = lerp(vy + 120, 1600, f) - 60 * f
                ctx.move_to(x, ytop)
                ctx.line_to(x, ybot)
                ctx.set_line_width(max(1.5, 10 * f))
                ctx.set_source_rgba(0.07, 0.08, 0.07, 1)
                ctx.stroke()
    # end door, lit
    ctx.rectangle(vx - 90, vy - 120, 180, 240)
    fs(ctx, hx("#3a2c1e"), 4)
    ctx.rectangle(vx - 40, vy - 90, 80, 60)
    ctx.set_source_rgba(1, 0.95, 0.7, 0.9)
    ctx.fill()
    for k, (yy, s) in enumerate(((60, 0.4), (150, 0.6), (300, 0.9))):
        ceiling_lamp(ctx, vx, yy - 60, t + k, flicker, length=700 * s)
    g = cairo.RadialGradient(vx, vy, 30, vx, vy, 1100)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.55)
    ctx.set_source(g)
    ctx.paint()


def bg_mile_side(ctx, t, cells=((150, 650), (850, 1350), (1550, 2050)), flicker=0.0):
    """Side view: a row of cells on the back wall, lime-green floor in front."""
    ctx.set_source_rgb(*hx("#3a4436"))
    ctx.paint()
    ctx.set_source_rgba(0, 0, 0, 0.15)
    for i in range(-10, 40):  # brick courses
        for j in range(0, 14):
            ctx.rectangle(i * 120 + (j % 2) * 60, j * 60, 116, 56)
    ctx.fill()
    for x0, x1 in cells:
        ctx.rectangle(x0, 150, x1 - x0, 720)
        src(ctx, hx("#141814"))
        ctx.fill()
        ctx.rectangle(x0 + 30, 560, 280, 60)  # bunk
        fs(ctx, hx("#4a4038"), 3)
        ctx.rectangle(x0 - 10, 140, x1 - x0 + 20, 22)
        fs(ctx, hx("#2a2e2a"), 4)
    floor_tiles(ctx, 860, 1080)
    for x in (500, 1200, 1900):
        ceiling_lamp(ctx, x, 40, t, flicker, length=900)


def bars(ctx, x0, x1, top=160, bot=870):
    for x in np.arange(x0 + 20, x1, 46):
        rrect(ctx, x - 6, top, 12, bot - top, 6)
        fs(ctx, hx("#2b302b"), 2.5)
        ctx.set_source_rgba(1, 1, 1, 0.12)
        ctx.rectangle(x - 4, top, 3, bot - top)
        ctx.fill()
    for y in (top + 40, bot - 60):
        ctx.rectangle(x0, y, x1 - x0, 14)
        fs(ctx, hx("#2b302b"), 2.5)


def bg_nursing(ctx, t):
    C.sky(ctx, hx("#d9c4a0"), hx("#b89c78"))
    ctx.set_source_rgba(1, 1, 1, 0.08)
    for i in range(-6, 30):
        ctx.rectangle(i * 80, -300, 30, 1200)
    ctx.fill()
    ctx.rectangle(1260, 120, 520, 460)  # window with daylight and a tree
    fs(ctx, hx("#bfe0f2"), 8)
    ell(ctx, 1600, 380, 200, 150)
    src(ctx, hx("#7fae5a"))
    ctx.fill()
    ctx.rectangle(1590, 420, 24, 160)
    src(ctx, hx("#6a4a30"))
    ctx.fill()
    ctx.move_to(1520, 120)
    ctx.line_to(1520, 580)
    ctx.move_to(1260, 350)
    ctx.line_to(1780, 350)
    ctx.set_line_width(10)
    src(ctx, hx("#f2ece0"))
    ctx.stroke()
    g = cairo.LinearGradient(1260, 120, 900, 1080)
    g.add_color_stop_rgba(0, 1, 0.98, 0.85, 0.3)
    g.add_color_stop_rgba(1, 1, 0.98, 0.85, 0)
    ctx.set_source(g)
    ctx.move_to(1260, 120)
    ctx.line_to(1780, 580)
    ctx.line_to(1300, 1100)
    ctx.line_to(700, 1100)
    ctx.close_path()
    ctx.fill()
    ctx.rectangle(-800, 860, 3600, 400)
    src(ctx, hx("#8a6a4a"))
    ctx.fill()
    dust(ctx, t, 900, 1700, 200, 1000, 30)


def armchair(ctx, x, y, s=1.0, col=hx("#7a3a2a")):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    rrect(ctx, -160, -420, 320, 360, 50)
    fs(ctx, col, 5)
    rrect(ctx, -190, -190, 380, 170, 40)
    fs(ctx, C.mix(col, (0, 0, 0), 0.1), 5)
    ctx.restore()


def wood_chair(ctx, x, y, s=1.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    rrect(ctx, -110, -470, 220, 300, 14)
    fs(ctx, hx("#5a3a22"), 5)
    ctx.rectangle(-140, -200, 280, 40)
    fs(ctx, hx("#6b4526"), 5)
    for sx in (-1, 1):
        ctx.rectangle(sx * 120 - 12, -160, 24, 160)
        fs(ctx, hx("#3e2814"), 4)
    ctx.restore()


def armchair_front(ctx, x, y, s=1.0, col=hx("#7a3a2a")):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    for sx in (-1, 1):
        rrect(ctx, sx * 175 - 40, -280, 80, 270, 36)
        fs(ctx, C.mix(col, (1, 1, 1), 0.08), 5)
    ctx.restore()


def bg_bedroom(ctx, t, glow=0.0):
    C.sky(ctx, hx("#3a2e3e"), hx("#1e1820"))
    for i in range(-6, 30):
        ctx.rectangle(i * 90, -300, 40, 1100)
        ctx.set_source_rgba(1, 0.9, 0.95, 0.05)
        ctx.fill()
    ctx.rectangle(1380, 140, 300, 380)
    fs(ctx, hx("#0c1426"), 8)
    C.moon(ctx, 1560, 240, 26)
    ctx.rectangle(-800, 860, 3600, 400)
    src(ctx, hx("#3a2a20"))
    ctx.fill()
    g = cairo.RadialGradient(300, 480, 20, 300, 520, 700)  # lamp
    g.add_color_stop_rgba(0, 1, 0.8, 0.5, 0.3)
    g.add_color_stop_rgba(1, 1, 0.8, 0.5, 0)
    ctx.set_source(g)
    ctx.paint()
    ctx.new_path()
    ctx.move_to(240, 470)
    ctx.line_to(360, 470)
    ctx.line_to(330, 400)
    ctx.line_to(270, 400)
    ctx.close_path()
    fs(ctx, hx("#e8d0a0"), 4)
    ctx.rectangle(290, 470, 20, 120)
    fs(ctx, hx("#6a4a2a"), 3)
    ctx.rectangle(220, 590, 160, 270)
    fs(ctx, hx("#5a3a24"), 4)
    if glow > 0:
        tint(ctx, Rd(1920, 1080, False), (1, 0.85, 0.5), 0.0)


def bed(ctx, x, y, w=820):
    rrect(ctx, x - 40, y - 330, 70, 420, 20)  # headboard
    fs(ctx, hx("#4a2e1c"), 5)
    ctx.rectangle(x, y - 80, w, 110)
    fs(ctx, hx("#5a3a24"), 5)
    rrect(ctx, x + 20, y - 150, w - 40, 90, 30)
    fs(ctx, hx("#efe8dc"), 4)


def blanket(ctx, x, y, w, h):
    ctx.new_path()
    ctx.move_to(x, y)
    ctx.curve_to(x + w * 0.3, y - h * 0.15, x + w * 0.7, y - h * 0.1, x + w, y)
    ctx.line_to(x + w + 10, y + h)
    ctx.line_to(x - 10, y + h)
    ctx.close_path()
    fs(ctx, hx("#8a5a7a"), 5)
    ctx.set_source_rgba(1, 1, 1, 0.12)
    ctx.rectangle(x, y + 10, w, 16)
    ctx.fill()


def electric_chair(ctx, x, y, s=1.0, front=False):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    wood, dark = hx("#6b4526"), hx("#3e2814")
    if not front:
        rrect(ctx, -170, -40, 340, 50, 8)  # platform
        fs(ctx, hx("#4a4a4a"), 5)
        rrect(ctx, -110, -720, 220, 560, 14)  # tall back
        fs(ctx, wood, 6)
        ctx.set_line_width(3)
        ctx.set_source_rgba(0, 0, 0, 0.3)
        for k in range(4):
            ctx.move_to(-80 + k * 53, -700)
            ctx.line_to(-80 + k * 53, -180)
            ctx.stroke()
        ctx.rectangle(-150, -260, 300, 60)  # seat
        fs(ctx, wood, 5)
        for sx in (-1, 1):
            ctx.rectangle(sx * 130 - 15, -200, 30, 160)
            fs(ctx, dark, 4)
    else:
        for sx in (-1, 1):
            rrect(ctx, sx * 150 - 26, -300, 52, 30, 8)  # arm rests
            fs(ctx, wood, 5)
            ctx.rectangle(sx * 150 - 14, -270, 28, 230)
            fs(ctx, dark, 4)
            ctx.rectangle(sx * 150 - 30, -295, 60, 14)  # straps
            fs(ctx, hx("#2a1a10"), 3)
    ctx.restore()


def bg_exec_room(ctx, t, power=0.0, lights=1.0):
    C.sky(ctx, hx("#2a2c2e"), hx("#141516"))
    ctx.rectangle(1300, 160, 380, 200)  # control window
    fs(ctx, hx("#3a4a50"), 6)
    ctx.set_source_rgba(1, 1, 0.85, 0.15)
    ctx.rectangle(1306, 166, 368, 188)
    ctx.fill()
    ctx.rectangle(-800, 860, 3600, 400)
    src(ctx, hx("#2a2a28"))
    ctx.fill()
    on = lights
    if power > 0:
        rnd = random.Random(int(t * 20))
        on = lights * (0.3 + 0.7 * rnd.random())
    ceiling_lamp(ctx, 960, 30, t, 0, length=900 * on + 1)
    tint(ctx, Rd(1920, 1080, False), (0, 0, 0), 0.0)


def witnesses(ctx, t, horror=0.0):
    rnd = random.Random(3)
    ctx.rectangle(-800, 1010, 3600, 120)
    fs(ctx, hx("#3a2818"), 5)
    for i in range(9):
        x = 60 + i * 225
        ch = GM["posse"] if i % 3 == 0 else Char(skin=rnd.choice([SKIN_L, SKIN_D, hx("#e8c2a2")]), hair=hx("#3a2a1e"),
                                                  hair_style=rnd.choice(["short", "slick", "pam"]),
                                                  shirt=rnd.choice([hx("#3a3a42"), hx("#4a3a2c"), hx("#2e3a4a")]),
                                                  top="suit", head_r=60)
        ch.draw(ctx, x, 1330, 0.7, t=t + i, expr="scared" if horror > 0.5 else "neutral", look=0.3 * (1 if x < 960 else -1))


def bg_padded(ctx, t):
    C.sky(ctx, hx("#e6e0d0"), hx("#c8c0ae"))
    ctx.set_line_width(3)
    ctx.set_source_rgba(0, 0, 0, 0.12)
    for i in range(-6, 30):
        for j in range(-2, 12):
            ctx.move_to(i * 110, j * 110)
            ctx.line_to(i * 110 + 55, j * 110 + 55)
            ctx.line_to(i * 110 + 110, j * 110)
            ctx.stroke()
            ell(ctx, i * 110 + 55, j * 110 + 55, 5, 5)
            ctx.fill()
    ctx.rectangle(-800, 900, 3600, 300)
    src(ctx, hx("#b8b09e"))
    ctx.fill()


def truck(ctx, x, y, s, t):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    g = cairo.LinearGradient(330, 0, 1200, 0)
    g.add_color_stop_rgba(0, 1, 0.95, 0.75, 0.45)
    g.add_color_stop_rgba(1, 1, 0.95, 0.75, 0)
    ctx.set_source(g)
    ctx.move_to(320, -80)
    ctx.line_to(1200, -280)
    ctx.line_to(1200, 120)
    ctx.line_to(320, -50)
    ctx.close_path()
    ctx.fill()
    rrect(ctx, -330, -300, 430, 280, 10)  # box
    fs(ctx, hx("#5a5a4a"), 6)
    text(ctx, "COLD MOUNTAIN", -115, -170, 30, hx("#e8e0c8"), outline=0)
    ctx.new_path()  # cab
    ctx.move_to(100, -20)
    ctx.line_to(100, -230)
    ctx.line_to(220, -230)
    ctx.line_to(300, -130)
    ctx.line_to(330, -120)
    ctx.line_to(330, -20)
    ctx.close_path()
    fs(ctx, hx("#3a4a3a"), 6)
    ctx.rectangle(125, -210, 85, 70)
    fs(ctx, hx("#8aa0b0"), 4)
    for wx in (-220, 230):
        ctx.save()
        ctx.translate(wx, -15)
        ctx.rotate(t * 8)
        ell(ctx, 0, 0, 55, 55)
        fs(ctx, hx("#141414"), 5)
        ell(ctx, 0, 0, 22, 22)
        fs(ctx, hx("#8a8f99"), 3)
        ctx.move_to(-22, 0)
        ctx.line_to(22, 0)
        ctx.set_line_width(4)
        src(ctx, INK)
        ctx.stroke()
        ctx.restore()
    ctx.restore()


def bg_road(ctx, t):
    C.bg_woods(ctx, t, beams=False)
    ctx.rectangle(-800, 900, 3600, 300)
    src(ctx, hx("#2a2620"))
    ctx.fill()
    ctx.set_line_width(8)
    ctx.set_source_rgba(0.8, 0.75, 0.5, 0.5)
    for i in range(-10, 30):
        x = (i * 240 - t * 900) % 4000 - 1000
        ctx.move_to(x, 1000)
        ctx.line_to(x + 120, 1000)
        ctx.stroke()


def bg_vision(ctx, t):
    """Sepia memory: riverbank at dawn."""
    C.sky(ctx, hx("#f2d8a8"), hx("#d8a868"), 600)
    C.moon(ctx, 1500, 260, 70)
    C.treeline(ctx, 600, 120, 220, hx("#8a6a44"), 31)
    ctx.rectangle(-800, 600, 3600, 200)
    src(ctx, hx("#c9a878"))
    ctx.fill()
    rnd = random.Random(int(t * 5))
    ctx.set_line_width(3)
    for i in range(30):
        ctx.set_source_rgba(1, 0.95, 0.85, rnd.uniform(0.2, 0.6))
        x = rnd.uniform(-300, 2200)
        y = 610 + i * 6
        ctx.move_to(x, y)
        ctx.line_to(x + 80, y)
        ctx.stroke()
    ctx.rectangle(-800, 800, 3600, 400)
    src(ctx, hx("#9a7a4a"))
    ctx.fill()
    for i in range(80):
        x = -300 + i * 30
        ctx.move_to(x, 820)
        ctx.line_to(x + 8 * math.sin(t + i), 760 - (i % 4) * 15)
        src(ctx, hx("#7a6234"))
        ctx.stroke()


def dog(ctx, x, y, s, t):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    run = math.sin(t * 10)
    for k, dx in enumerate((-50, 50)):
        ctx.save()
        ctx.translate(dx, -40)
        ctx.rotate(0.4 * run * (1 if k else -1))
        rrect(ctx, -9, 0, 18, 60, 8)
        fs(ctx, hx("#4a3424"), 3)
        ctx.restore()
    ell(ctx, 0, -60, 80, 34)
    fs(ctx, hx("#6a4a30"), 4)
    ell(ctx, 80, -96, 34, 26)
    fs(ctx, hx("#6a4a30"), 4)
    ell(ctx, 66, -116, 12, 22)
    fs(ctx, hx("#3a2818"), 3)
    ell(ctx, 92, -100, 4, 4)
    src(ctx, INK)
    ctx.fill()
    ctx.move_to(-78, -66)
    ctx.line_to(-110, -90 + 6 * run)
    ctx.set_line_width(8)
    src(ctx, hx("#6a4a30"))
    ctx.stroke()
    ctx.restore()


def bg_barn(ctx, t):
    C.sky(ctx, hx("#f0c890"), hx("#c88a4a"), 700)
    ctx.rectangle(-800, 760, 3600, 400)
    src(ctx, hx("#a8844e"))
    ctx.fill()
    ctx.new_path()
    ctx.move_to(1150, 760)
    ctx.line_to(1150, 380)
    ctx.line_to(1400, 220)
    ctx.line_to(1650, 380)
    ctx.line_to(1650, 760)
    ctx.close_path()
    fs(ctx, hx("#8a3a2a"), 6)
    ctx.rectangle(1300, 520, 200, 240)
    fs(ctx, hx("#3a1a12"), 5)
    for i in range(14):  # fence
        x = -200 + i * 90
        ctx.rectangle(x, 700, 14, 90)
        fs(ctx, hx("#6a5232"), 3)
    ctx.rectangle(-200, 720, 1300, 12)
    fs(ctx, hx("#6a5232"), 3)


def bg_theater(ctx, t):
    ctx.set_source_rgb(*hx("#141210"))
    ctx.paint()
    ctx.rectangle(1080, 130, 760, 470)  # screen
    fs(ctx, hx("#3a3a3a"), 8)
    ctx.save()
    ctx.rectangle(1090, 140, 740, 450)
    ctx.clip()
    g = cairo.RadialGradient(1460, 360, 20, 1460, 360, 500)
    g.add_color_stop_rgb(0, 0.92, 0.92, 0.92)
    g.add_color_stop_rgb(1, 0.45, 0.45, 0.45)
    ctx.set_source(g)
    ctx.paint()
    couple(ctx, 1460, 580, 0.42, t)
    ctx.set_source_rgba(0, 0, 0, 0.08 + 0.05 * random.Random(int(t * 24)).random())
    ctx.paint()
    ctx.restore()
    g = cairo.LinearGradient(160, 420, 1100, 360)  # projector beam
    g.add_color_stop_rgba(0, 1, 1, 0.95, 0.4)
    g.add_color_stop_rgba(1, 1, 1, 0.95, 0.05)
    ctx.set_source(g)
    ctx.move_to(170, 420)
    ctx.line_to(1090, 140)
    ctx.line_to(1090, 590)
    ctx.close_path()
    ctx.fill()
    dust(ctx, t, 200, 1080, 160, 560, 50, seed=3)
    ctx.rectangle(-800, 880, 3600, 300)
    src(ctx, hx("#221c16"))
    ctx.fill()
    rrect(ctx, 60, 380, 160, 100, 12)  # projector
    fs(ctx, hx("#2a2a2e"), 5)
    for k, dx in enumerate((90, 190)):
        ctx.save()
        ctx.translate(dx, 350)
        ctx.rotate(t * 2 * (1 if k else -1))
        ell(ctx, 0, 0, 46, 46)
        fs(ctx, hx("#3a3a40"), 4)
        for a in range(3):
            ctx.rotate(2 * PI / 3)
            ell(ctx, 22, 0, 9, 9)
            src(ctx, hx("#141414"))
            ctx.fill()
        ctx.restore()
    ctx.rectangle(120, 480, 40, 400)
    fs(ctx, hx("#3a3a40"), 4)


def bg_cemetery(ctx, t, n_stones=0.0):
    C.sky(ctx, hx("#9aa6b0"), hx("#d8dcdc"), 700)
    C.treeline(ctx, 700, 80, 160, hx("#5a6a5a"), 41)
    ctx.rectangle(-800, 700, 3600, 500)
    src(ctx, hx("#6a8a5a"))
    ctx.fill()
    spots = [(260, 860), (560, 800), (860, 880), (1160, 810), (1460, 870), (1760, 800), (420, 990), (1300, 1000)]
    for i, (x, y) in enumerate(spots):
        k = ease(n_stones * len(spots) - i)
        if k <= 0:
            continue
        h = 170 * k
        ctx.new_path()
        ctx.move_to(x - 60, y)
        ctx.line_to(x - 60, y - h + 50)
        ctx.arc(x, y - h + 50, 60, PI, 2 * PI)
        ctx.line_to(x + 60, y)
        ctx.close_path()
        fs(ctx, hx("#a8a8a4"), 4)
        ctx.set_source_rgba(0, 0, 0, 0.15)
        ctx.rectangle(x - 30, y - h + 60, 60, 6)
        ctx.rectangle(x - 30, y - h + 80, 60, 6)
        ctx.fill()
        for f in range(3):
            ell(ctx, x - 20 + f * 20, y + 4, 8, 8)
            src(ctx, (hx("#d84a4a"), hx("#f2e2a2"), hx("#d88ad0"))[f])
            ctx.fill()


def bg_shed(ctx, t):
    C.bg_woods(ctx, t)
    ctx.rectangle(1150, 520, 520, 380)
    fs(ctx, hx("#5a4030"), 6)
    ctx.new_path()
    ctx.move_to(1110, 530)
    ctx.line_to(1410, 380)
    ctx.line_to(1710, 530)
    ctx.close_path()
    fs(ctx, hx("#3a2a20"), 6)
    ctx.rectangle(1340, 650, 140, 250)
    fs(ctx, hx("#f2c45a"), 5)
    ctx.set_line_width(2)
    ctx.set_source_rgba(0, 0, 0, 0.25)
    for k in range(10):
        ctx.move_to(1150, 540 + k * 36)
        ctx.line_to(1670, 540 + k * 36)
        ctx.stroke()


def glow_title(ctx, s, x, y, size, t, color=LIME, sub=None):
    for k in range(3):
        text(ctx, s, x, y, size, (*color, 0.12), "Liberation Serif", outline=size * (0.12 + 0.06 * k), ink=(*color, 0.1))
    text(ctx, s, x, y, size, color, "Liberation Serif", outline=size * 0.05, ink=hx("#0a1408"))
    if sub:
        text(ctx, sub, x, y + size * 0.85, size * 0.3, BONE, outline=size * 0.025)


# ------------------------------------------------------------------ shot helpers
def shots(ctx, R, t, cuts, fade=0.45):
    """cuts: [(t0, fn(ctx, R, lt))]. Cross-dissolves from the previous shot."""
    idx = 0
    for i, c in enumerate(cuts):
        if t >= c[0]:
            idx = i
    t0, fn = cuts[idx]
    lt = t - t0
    if idx > 0 and lt < fade:
        pt0, pfn = cuts[idx - 1]
        pfn(ctx, R, t - pt0)
        ctx.push_group()
        fn(ctx, R, lt)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(ease(lt / fade))
    else:
        fn(ctx, R, lt)


def V(R, v_long, v_vert):
    return v_vert if R.vertical else v_long


def lower_third(ctx, R, lt, t0, title, sub, dur=4.0):
    a = ap(lt, t0, 0.4) * (1 - ap(lt, t0 + dur, 0.4))
    if a <= 0:
        return
    u = R.u
    w, h = max(620 * u, C.text_width(ctx, sub, 40 * u) + 90 * u), 116 * u
    x = 40 * u if not R.vertical else R.W / 2 - w / 2
    y = (R.H - 300 * u) if not R.vertical else R.H * 0.06
    ctx.push_group()
    plaque(ctx, x - (1 - a) * 60, y, w, h, title, sub, u)
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(a)


# ====================================================================== LONG scenes
def L0(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 470, 1.0 + 0.25 * ease(t / 18), vfx=960):
        bg_mile_corridor(ctx, t, flicker=0.08)
        depth = min(1, t / 16)
        s = lerp(0.18, 0.62, depth)
        GM["coffey"].draw(ctx, 960, lerp(600, 1010, depth), s, t=t, walk=t * 3, expr="sad")
    grade(ctx, R, strength=0.8)
    if t > 0.4:
        a = ap(t, 0.4, 1.2)
        ctx.push_group()
        glow_title(ctx, "THE GREEN MILE", W / 2, H * V(R, 0.2, 0.14), V(R, 150, 104) * u, t, sub="ENDING EXPLAINED")
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(a)
    ts = p.cue("Full spoilers")
    if t > ts:
        pop = 1 + 0.2 * max(0, 1 - (t - ts) / 0.25)
        badge(ctx, W / 2, H * V(R, 0.4, 0.27), "SPOILER WARNING", 44 * u * pop)
    text(ctx, "Fan recap · not affiliated with Warner Bros.", W - 24, 30 * u, 20 * u, (1, 1, 1, 0.7), outline=0, anchor="r", bold=False)


def L1(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_open, t_back = p.cue("It opens in a nursing home"), p.cue("and the story takes us back")

    def credits(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.0, vfx=960):
            bg_mile_corridor(ctx, t)
        grade(ctx, R, strength=0.85)
        glow_title(ctx, "THE GREEN MILE", W / 2, H * V(R, 0.2, 0.14), V(R, 120, 96) * u, t)
        lower_third(ctx, R, lt, p.cue("directed by"), "DIRECTED BY", "Frank Darabont", 3.0)
        lower_third(ctx, R, lt, p.cue("based on"), "BASED ON THE 1996 NOVEL BY", "Stephen King", 3.0)

    def nursing(ctx, R, lt):
        tt = t
        with cam(ctx, R, 960, 560, 1.0 + 0.01 * lt, vfx=V(R, 960, 700)):
            bg_nursing(ctx, tt)
            tv(ctx, 1400, 860, 0.9, tt)
            armchair(ctx, 640, 980, 1.0)
            GM["old_paul"].draw(ctx, 640, 980, 0.95, t=tt, sit=True, expr="sad", tears=lt > 2.5, look=1,
                                armL=20, armR=20, elbowL=50, elbowR=50)
            armchair_front(ctx, 640, 980, 1.0)
            GM["elaine"].draw(ctx, 300, 1010, 0.9, t=tt, expr="sad", look=1, facing=1)
        grade(ctx, R, strength=0.45)
        lower_third(ctx, R, lt, p.cue("Paul Edgecomb") - t_open, "OLD PAUL EDGECOMB", "watching Top Hat", 3.5)

    def back(ctx, R, lt):
        with cam(ctx, R, 960, 470, 1.0, vfx=960):
            bg_mile_corridor(ctx, t)
        tint(ctx, R, (0.45, 0.35, 0.2), 0.35)
        grade(ctx, R, strength=0.8)
        k = ap(lt, 0.2, 0.8)
        yr = int(lerp(1999, 1935, ease(lt / 1.6)))
        ctx.push_group()
        text(ctx, str(yr), W / 2, H * 0.45, 220 * u, BONE, "Liberation Serif", outline=10 * u)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(k)

    shots(ctx, R, t, [(0, credits), (t_open, nursing), (t_back, back)])


def mile_scene(ctx, R, t, people, flicker=0.0, vfx=960, zoom=1.0, fy=560, inside=()):
    """Side-view block with people [(key, x, kwargs)], drawn in front of the cells; `inside` drawn behind bars."""
    with cam(ctx, R, 960, fy, zoom, vfx=vfx):
        bg_mile_side(ctx, t, flicker=flicker)
        for key, x, kw in inside:
            GM[key].draw(ctx, x, 860, 0.78, **kw)
        for x0, x1 in ((150, 650), (850, 1350), (1550, 2050)):
            bars(ctx, x0, x1)
        out = {}
        for key, x, kw in people:
            out[key] = GM[key].draw(ctx, x, kw.pop("y", 1000), kw.pop("s", 0.85), **kw)
        return out


def L2(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_b, t_p = p.cue("His team includes"), p.cue("the cruel")
    t_floor = p.cue("lime-green floor")
    bx = lerp(-300, 980, ap(t, t_b, 2.0))
    px = lerp(2300, 1500, ap(t, t_p, 2.0))
    people = [("paul", 560, dict(t=t, expr="neutral", look=1 if t > t_b else 0, hold={"R": "keys"}, armR=10))]
    if t > t_b:
        people.append(("brutal", bx, dict(t=t, walk=t * 5 if bx < 980 else None, expr="happy", look=-1, facing=-1 if bx >= 980 else 1)))
    if t > t_p:
        people.append(("percy", px, dict(t=t, walk=t * 6 if px > 1500 else None, expr="cold", facing=-1,
                                         hold={"R": "baton"}, armR=30, elbowR=40, look=-1)))
    vfx = 560 if t < t_b else (980 if t < t_p else 1500)
    mile_scene(ctx, R, t, people, vfx=vfx)
    grade(ctx, R, strength=0.55)
    if t_floor - 0.5 < t < t_b:
        a = ap(t, t_floor - 0.5, 0.4)
        ctx.push_group()
        badge(ctx, W / 2, H * V(R, 0.86, 0.6), "THE GREEN MILE = THE LIME-GREEN FLOOR", 36 * u, hx("#0e1a08"), LIME)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(a)
    lower_third(ctx, R, t, 0.8, "TOM HANKS", "as Paul Edgecomb", 4.5)
    lower_third(ctx, R, t, t_b + 1.2, "DAVID MORSE", "as Brutus \"Brutal\" Howell", 4.0)
    lower_third(ctx, R, t, t_p + 0.6, "PERCY WETMORE", "protected by the governor's wife", 5.0)


def L3(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_conv, t_gentle = p.cue("convicted"), p.cue("But Coffey is gentle")
    t_grab, t_bugs = p.cue("One day"), p.cue("Then he breathes out")

    def arrive(ctx, R, lt):
        cx = lerp(-400, 1000, ap(t, 0.2, 4.5))
        people = [("paul", 1500, dict(t=t, expr="shock", facing=-1, look=-1, tilt=-8)),
                  ("coffey", cx, dict(t=t, walk=t * 3.5 if cx < 1000 else None, expr="neutral", y=1020, s=0.82))]
        mile_scene(ctx, R, t, people, vfx=V(R, 960, lerp(400, 1250, ap(t, 0.2, 4.5))))
        grade(ctx, R, strength=0.55)
        lower_third(ctx, R, lt, p.cue("played by"), "MICHAEL CLARKE DUNCAN", "as John Coffey", 3.5)
        if t > t_conv:
            ctx.save()
            k = ap(t, t_conv, 0.5)
            ctx.translate(W / 2, H * V(R, 0.3, 0.25))
            ctx.rotate((1 - k) * 6 - 0.05)
            ctx.scale(k, k)
            rrect(ctx, -330 * u, -110 * u, 660 * u, 220 * u, 6)
            fs(ctx, hx("#efe6cf"), 4)
            text(ctx, "THE DAILY CHRONICLE", 0, -70 * u, 26 * u, INK, "Liberation Serif", outline=0)
            text(ctx, "GIANT CONVICTED", 0, -10 * u, 54 * u, INK, "Liberation Serif", outline=0)
            text(ctx, "in Detterick twins case", 0, 50 * u, 30 * u, INK, "Liberation Serif", outline=0, bold=False)
            ctx.restore()

    def dark(ctx, R, lt):
        flick = 0.6 if (int(t * 6) % 5 == 0) else 0.0
        mile_scene(ctx, R, t, [], inside=[("coffey", 1100, dict(t=t, expr="scared", sit=True, look=0.5))],
                   flicker=0.0, vfx=1100, zoom=1.15, fy=520)
        tint(ctx, R, (0, 0, 0.05), 0.35 + flick * 0.3)
        grade(ctx, R, strength=0.8)
        badge(ctx, W / 2, H * 0.12, "GENTLE... AND AFRAID OF THE DARK", 40 * u, BONE, (0.1, 0.12, 0.2))

    def heal(ctx, R, lt):
        g = ap(lt, 0.8, 0.8)
        bugs = ap(t, t_bugs, 3.0)
        with cam(ctx, R, 960, 520, 1.15, vfx=960):
            bg_mile_side(ctx, t, flicker=0.6 * g * (1 - bugs))
            hands = GM["coffey"].draw(ctx, 780, 960, 0.8, t=t, expr="sad" if bugs > 0 else "neutral", armR=lerp(10, 82, ap(lt, 0, 0.6)),
                                      elbowR=0, look=1, blink=1 if 0.2 < g < 1 and bugs == 0 else None)
            bars(ctx, 150, 1000)
            GM["paul"].draw(ctx, lerp(1300, 1240, ap(lt, 0, 0.6)), 1010, 0.82, t=t, facing=-1, expr="shock" if g > 0 else "angry",
                            lean=lerp(10, -6, g), look=-1)
            hx_, hy_ = hands["R"]
            heal_glow(ctx, hx_ + 40, hy_, 120, g * (1 - bugs * 0.8), t)
            hd = hands["head"]
            insects(ctx, hd[0] + 30, hd[1] + 40, t, bugs, dx=0.3, dy=-1, n=90, seed=2)
        grade(ctx, R, strength=0.6)
        if t > t_bugs + 1.2:
            badge(ctx, W / 2, H * 0.1, "HE TAKES THE SICKNESS IN... AND LETS IT OUT", 34 * u, BONE, (0.05, 0.05, 0.05))

    shots(ctx, R, t, [(0, arrive), (t_gentle, dark), (t_grab, heal)])


def L4(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_stomp, t_back, t_rev, t_exec = p.cue("Out of pure spite"), p.cue("Coffey brings"), p.cue("But Percy gets"), p.cue("At Del's execution")
    t_dry, t_dies = p.cue("he leaves the sponge dry"), p.cue("and Del dies")

    def jingles(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.1, vfx=V(R, 960, 900)):
            bg_mile_side(ctx, t)
            GM["del"].draw(ctx, 760, 960, 0.85, t=t, expr="happy", look=1, kneel=0.3)
            mouse(ctx, lerp(900, 1200, (math.sin(t * 1.2) + 1) / 2), 990, 0.9, t, facing=1 if math.cos(t * 1.2) > 0 else -1, spool=True)
            bars(ctx, 150, 1350)
        grade(ctx, R, strength=0.55)
        lower_third(ctx, R, lt, 0.5, "EDUARD DELACROIX", "and Mr. Jingles", 4)

    def stomp(ctx, R, lt):
        boot = ap(lt, 0.8, 0.25)
        with cam(ctx, R, 960, 640, 1.25, vfx=1000):
            bg_mile_side(ctx, t)
            if boot < 1:
                mouse(ctx, 1000, 1000, 1.0, t, facing=-1)
            GM["percy"].draw(ctx, 1250, 1030, 0.95, t=t, facing=-1, expr="angry", look=-1, lean=-6)
            ctx.save()  # boot coming down
            ctx.translate(1000, lerp(600, 960, boot))
            rrect(ctx, -60, -260, 80, 260, 20)
            fs(ctx, UNI_P, 5)
            ell(ctx, -10, 0, 90, 34)
            fs(ctx, hx("#1a1410"), 5)
            ctx.restore()
        grade(ctx, R, strength=0.6)
        if lt > 1.05:
            tint(ctx, R, (0.4, 0, 0), 0.25 * (1 - ap(lt, 1.05, 1)))
            text(ctx, "STOMP!", W / 2, H * 0.3, 140 * u, hx("#ffe14a"), outline=10 * u)

    def revive(ctx, R, lt):
        g = ap(lt, 0.3, 0.6)
        with cam(ctx, R, 960, 560, 1.2, vfx=960):
            bg_mile_side(ctx, t, flicker=0.5 * g)
            hands = GM["coffey"].draw(ctx, 960, 1000, 0.8, t=t, expr="sad", armL=40, armR=40, elbowL=80, elbowR=80, look=0.2)
            mx = (hands["L"][0] + hands["R"][0]) / 2
            my = (hands["L"][1] + hands["R"][1]) / 2
            heal_glow(ctx, mx, my, 110, g, t)
            if lt > 1.6:
                mouse(ctx, mx, my + 10, 0.6, t, glow=0)
            insects(ctx, hands["head"][0] + 20, hands["head"][1] + 40, t, ap(lt, 1.8, 2.2), n=60, seed=5)
            bars(ctx, 150, 650)
            bars(ctx, 1550, 2050)
        grade(ctx, R, strength=0.55)
        if lt > 1.6:
            badge(ctx, W / 2, H * 0.12, "MR. JINGLES LIVES", 44 * u, BONE, (0.35, 0.25, 0.05))

    def execution(ctx, R, lt):
        power = ap(t, t_dies, 0.2)
        with cam(ctx, R, 960, 560, 1.0 + 0.04 * lt, vfx=V(R, 960, 1300 if t < t_dies else 960)):
            bg_exec_room(ctx, t, power=power)
            electric_chair(ctx, 960, 900, 1.0)
            ctx.set_source_rgba(0.05, 0.05, 0.06, 1)  # hooded figure, kept as a silhouette
            ell(ctx, 960, 440, 70, 80)
            ctx.fill()
            rrect(ctx, 870, 500, 180, 230, 50)
            ctx.fill()
            electric_chair(ctx, 960, 900, 1.0, front=True)
            if power > 0:
                arcs(ctx, 960, 380, 960, -100, t, 3, power)
                arcs(ctx, 820, 500, 1100, 480, t + 0.5, 2, power)
                smoke(ctx, 960, 420, t, power, seed=1)
            hands = GM["percy"].draw(ctx, 1450, 1000, 0.8, t=t, facing=-1, expr="cold" if power == 0 else "happy",
                                     hold={"R": "sponge"} if t < t_dies else None, armR=40, elbowR=70, look=-1)
            GM["paul"].draw(ctx, 470, 1000, 0.8, t=t, expr="shock" if power > 0 else "neutral", look=1)
            GM["brutal"].draw(ctx, 260, 1010, 0.8, t=t, expr="shock" if power > 0 else "neutral", look=1)
            witnesses(ctx, t, power)
        if power > 0 and int(t * 10) % 2 == 0:
            tint(ctx, R, (0.8, 0.9, 1), 0.12)
        grade(ctx, R, strength=0.7)
        if t_dry <= t < t_dies + 0.3:
            badge(ctx, W / 2, H * 0.12, "THE SPONGE IS DRY", 46 * u, BONE, (0.5, 0.35, 0.05))

    shots(ctx, R, t, [(0, jingles), (t_stomp, stomp), (t_back, revive), (t_rev, execution)])


def L5(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_plan, t_jacket, t_sneak, t_heal, t_but = (p.cue("Paul and his men"), p.cue("lock Percy"), p.cue("sneak Coffey"),
                                                p.cue("Coffey heals Melinda"), p.cue("But this time"))

    def melinda(ctx, R, lt, glow=0.0, coffey=False, sick=0.0):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 760)):
            bg_bedroom(ctx, t)
            bed(ctx, 420, 900, 900)
            ctx.save()
            ctx.translate(1300, 820)
            ctx.rotate(-PI / 2)
            GM["melinda"].draw(ctx, 0, 0, 0.82, t=t, expr="sad" if glow < 0.6 else "happy", blink=1 if glow < 0.6 else None)
            ctx.restore()
            blanket(ctx, 690, 790, 640, 130)
            if coffey:
                hands = GM["coffey"].draw(ctx, 1250, 1060, 0.78, t=t, facing=-1, expr="sad", armR=lerp(10, 50, ap(lt, 0, 0.8)),
                                          elbowR=50, look=-1)
                heal_glow(ctx, hands["R"][0] - 20, hands["R"][1] - 20, 200, glow, t)
                if sick > 0:
                    insects(ctx, hands["head"][0], hands["head"][1] + 40, t, 0.6, dx=0, dy=0, n=40, seed=8, spread=0.15)
            else:
                GM["warden"].draw(ctx, 1600, 1060, 0.85, t=t, facing=-1, expr="sad", look=-1)
        if glow > 0:
            tint(ctx, R, (1, 0.85, 0.5), 0.35 * glow)
        grade(ctx, R, strength=0.6)

    def sick(ctx, R, lt):
        melinda(ctx, R, lt)
        badge(ctx, W / 2, H * 0.12, "THE WARDEN'S WIFE: A BRAIN TUMOR", 40 * u, BONE, (0.25, 0.1, 0.2))

    def drug(ctx, R, lt):
        sleep = ap(lt, 1.0, 1.2)
        mile_scene(ctx, R, t, [], inside=[("bill", 1100, dict(t=t, expr="manic" if sleep < 0.5 else "neutral",
                                                              blink=1 if sleep > 0.5 else None, lean=-8 * sleep, kneel=0.4 * sleep))],
                   vfx=1100, zoom=1.2, fy=520)
        if sleep > 0.5:
            for i in range(3):
                ph = (t * 0.6 + i / 3) % 1
                text(ctx, "z", W * V(R, 0.62, 0.65) + ph * 80 * u, H * 0.32 - ph * 160 * u, (30 + 30 * ph) * u, BONE, outline=3 * u)
        grade(ctx, R, strength=0.6)
        lower_third(ctx, R, lt, 0.3, "\"WILD BILL\" WHARTON", "a violent new inmate, drugged", 3)

    def jacket(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.1, vfx=960):
            bg_padded(ctx, t)
            GM["percy_jacket"].draw(ctx, 960 + 20 * math.sin(t * 5), 960, 0.95, t=t, expr="angry", lean=6 * math.sin(t * 5))
        grade(ctx, R, strength=0.5)
        badge(ctx, W / 2, H * 0.12, "PERCY: STRAITJACKET", 44 * u, BONE, (0.3, 0.3, 0.3))

    def sneak(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 900)):
            bg_road(ctx, t)
            truck(ctx, lerp(400, 1100, ap(lt, 0, 3)), 980, 1.0, t)
        grade(ctx, R, strength=0.7)

    def healing(ctx, R, lt):
        melinda(ctx, R, lt, glow=ap(lt, 0.4, 1.0) * (1 - ap(t, t_but, 0.8) * 0.7), coffey=True, sick=ap(t, t_but, 0.5))

    shots(ctx, R, t, [(0, sick), (t_plan, drug), (t_jacket, jacket), (t_sneak, sneak), (t_heal, healing)])


def L6(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_trance, t_why, t_hand, t_found = p.cue("In a trance"), p.cue("Why Wild Bill?"), p.cue("Coffey takes Paul's hand"), p.cue("Coffey found the girls")
    t_killed = p.cue("Wild Bill Wharton killed")
    t_innocent = p.cue("He was innocent")

    def grab(ctx, R, lt):
        k = ap(lt, 0.3, 0.6)
        with cam(ctx, R, 960, 520, 1.15, vfx=960):
            bg_mile_side(ctx, t, flicker=0.3)
            hands = GM["coffey"].draw(ctx, 760, 960, 0.8, t=t, expr="angry", armR=lerp(10, 82, k), elbowR=0, look=1)
            bars(ctx, 150, 1000)
            GM["percy"].draw(ctx, lerp(1300, 1150, k), 1010, 0.82, t=t, facing=-1, expr="scared", look=-1, lean=-10 * k)
            hd = hands["head"]
            insects(ctx, hd[0] + 330, hd[1] + 80, t, ap(lt, 0.9, 2.5), dx=-1, dy=-0.2, n=90, seed=4, inward=False, spread=0.7)
        grade(ctx, R, strength=0.6)

    def trance(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(1400, 800, ap(lt, 0.5, 1.5)))):
            bg_mile_side(ctx, t)
            fall = ap(lt, 2.4, 0.8)
            GM["bill"].draw(ctx, 1150, 860, 0.78, t=t, expr="shock" if lt > 1 else "manic", kneel=0.9 * fall, lean=25 * fall,
                            blink=1 if fall > 0.9 else None, look=1)
            bars(ctx, 850, 1350)
            hands = GM["percy"].draw(ctx, 600, 1000, 0.85, t=t, expr="cold", blink=0, hold={"R": "pistol"}, armR=88, elbowR=0, look=1)
            rnd = random.Random(int(t * 8))
            if 1.0 < lt < 2.6 and rnd.random() < 0.45:
                C.muzzle(ctx, hands["R"][0] + 70, hands["R"][1] - 5, 0.9, t)
        grade(ctx, R, strength=0.65)
        if 1.0 < lt < 2.6 and int(t * 8) % 2 == 0:
            tint(ctx, R, (1, 0.9, 0.7), 0.15)
        if lt > 3:
            badge(ctx, W / 2, H * 0.12, "PERCY: CATATONIC, SENT TO AN ASYLUM", 36 * u, BONE, (0.2, 0.2, 0.25))

    def hand(ctx, R, lt):
        g = ap(lt, 0.3, 0.6)
        with cam(ctx, R, 960, 520, 1.15, vfx=960):
            bg_mile_side(ctx, t, flicker=0.7 * g)
            h1 = GM["coffey"].draw(ctx, 760, 960, 0.8, t=t, expr="sad", armR=78, elbowR=4, look=1, tears=True)
            bars(ctx, 150, 1000)
            GM["paul"].draw(ctx, 1220, 1010, 0.82, t=t, facing=-1, expr="shock", armR=72, elbowR=6, look=-1, tilt=-6 * g)
            heal_glow(ctx, h1["R"][0] + 30, h1["R"][1], 140, g, t)
        grade(ctx, R, strength=0.6)

    def vision_bill(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.05, vfx=1150):
            bg_barn(ctx, t)
            GM["bill"].draw(ctx, 1150, 1000, 0.9, t=t, expr="manic", look=-1, tilt=8 * math.sin(t * 3))
        tint(ctx, R, (0.55, 0.38, 0.15), 0.35)
        grade(ctx, R, (0.25, 0.12, 0.02), 0.8)
        if t > t_killed:
            text(ctx, "THE REAL KILLER", W / 2, H * 0.12, 80 * u, hx("#ff3b30"), "Liberation Serif", outline=6 * u)

    def vision_river(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 760)):
            bg_vision(ctx, t)
            GM["coffey"].draw(ctx, 760, 1000, 0.82, t=t, expr="sad", kneel=0.85, tears=True, armL=40, armR=40, elbowL=70, elbowR=70)
            px = lerp(2300, 1500, ap(lt, 0.3, 3))
            for i in range(3):
                GM["posse"].draw(ctx, px + i * 180, 1000 + i * 8, 0.75, t=t + i, walk=t * 5, facing=-1, expr="angry",
                                 hold={"R": "lantern"}, armR=30, elbowR=40, look=-1)
            dog(ctx, px - 200, 1010, 0.9, t)
        tint(ctx, R, (0.55, 0.38, 0.15), 0.3)
        grade(ctx, R, (0.25, 0.12, 0.02), 0.8)
        if t > t_innocent:
            glow_title(ctx, "INNOCENT", W / 2, H * V(R, 0.16, 0.14), 120 * u, t, color=hx("#fff2c8"))

    shots(ctx, R, t, [(0, grab), (t_trance, trance), (t_hand, hand), (t_killed - 0.6, vision_bill), (t_found, vision_river)])


def L7(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_ref, t_wish, t_ang, t_exec, t_shake, t_tears = (p.cue("Coffey refuses"), p.cue("His last wish"), p.cue("They's angels"),
                                                      p.cue("At his execution"), p.cue("Paul shakes"), p.cue("And the guards"))

    def offer(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.05, vfx=V(R, 960, 900 if t < t_ref else 1100)):
            bg_mile_side(ctx, t)
            GM["coffey"].draw(ctx, 1100, 860, 0.8, t=t, expr="sad", sit=True, look=-0.5, tears=t > t_ref)
            ctx.save()  # open cell door swung outward
            ctx.translate(850, 0)
            ctx.scale(0.35, 1)
            bars(ctx, 0, 500)
            ctx.restore()
            bars(ctx, 150, 650)
            GM["paul"].draw(ctx, 650, 1000, 0.85, t=t, expr="sad", look=1, armR=60, elbowR=20, hold={"R": "keys"})
        grade(ctx, R, strength=0.6)
        if t > p.cue("He says he's tired"):
            text(ctx, "“I'm tired, boss.”", W / 2, H * V(R, 0.14, 0.12), V(R, 72, 60) * u, BONE, "Liberation Serif",
                 outline=5 * u, italic=True)

    def movie(ctx, R, lt):
        with cam(ctx, R, 960, 540, 1.0, vfx=V(R, 960, 1300 if lt < 2.5 else 620)):
            bg_theater(ctx, t)
            wood_chair(ctx, 620, 1060)
            GM["coffey"].draw(ctx, 620, 1060, 0.85, t=t, expr="happy" if t > t_ang else "shock", sit=True, look=1,
                              tears=t > t_ang - 0.5)
            GM["paul"].draw(ctx, 260, 1080, 0.8, t=t, expr="sad", look=1)
        grade(ctx, R, strength=0.55)
        if t > t_ang:
            text(ctx, "“They's angels...”", W / 2, H * V(R, 0.86, 0.6), V(R, 70, 64) * u, hx("#fff2c8"), "Liberation Serif",
                 outline=5 * u, italic=True)

    def final(ctx, R, lt):
        fade = ap(t, t_tears + 2.2, 1.2)
        flare = ap(t, t_tears + 1.2, 0.3) * (1 - fade)
        with cam(ctx, R, 960, 540, 1.0 + 0.05 * lt, vfx=900):
            bg_exec_room(ctx, t, lights=1 + flare)
            electric_chair(ctx, 960, 900, 1.0)
            hands = GM["coffey"].draw(ctx, 960, 900, 0.82, t=t, sit=True, expr="sad", tears=True, armL=14, armR=14, look=-0.3)
            electric_chair(ctx, 960, 900, 1.0, front=True)
            GM["paul"].draw(ctx, 640, 1000, 0.85, t=t, expr="sad", tears=t > t_shake, armR=lerp(8, 50, ap(t, t_shake, 0.6)),
                            elbowR=30, look=1)
            GM["brutal"].draw(ctx, 1300, 1000, 0.85, t=t, facing=-1, expr="sad", tears=t > t_tears, look=-1)
            witnesses(ctx, t, 0)
        if flare > 0:
            tint(ctx, R, (1, 0.97, 0.85), 0.7 * flare)
        grade(ctx, R, strength=0.75)
        if t < t_shake:
            badge(ctx, W / 2, H * 0.12, "NO HOOD: \"I'M AFRAID OF THE DARK\"", 38 * u, BONE, (0.1, 0.1, 0.12))
        if fade > 0:
            tint(ctx, R, (0, 0, 0), fade)

    shots(ctx, R, t, [(0, offer), (t_wish, movie), (t_exec, final)])


def L8(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_age, t_power, t_mouse, t_out, t_pun = (p.cue("one hundred and eight"), p.cue("When Coffey took"), p.cue("Mr. Jingles got"),
                                             p.cue("Paul has outlived"), p.cue("He believes"))

    def age(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.05, vfx=V(R, 960, 640)):
            bg_nursing(ctx, t)
            armchair(ctx, 640, 980, 1.0)
            GM["old_paul"].draw(ctx, 640, 980, 0.95, t=t, sit=True, expr="sad", look=1)
            armchair_front(ctx, 640, 980, 1.0)
            GM["elaine"].draw(ctx, 1150, 1010, 0.9, t=t, facing=-1, expr="shock" if t > t_age else "neutral", look=-1)
        grade(ctx, R, strength=0.45)
        if t > t_age:
            k = ap(t, t_age, 0.4)
            n = int(lerp(1, 108, ease((t - t_age) / 1.2)))
            ctx.push_group()
            text(ctx, str(n), W * V(R, 0.47, 0.5), H * V(R, 0.2, 0.2), 200 * u, hx("#ffe14a"), outline=12 * u)
            text(ctx, "YEARS OLD", W * V(R, 0.47, 0.5), H * V(R, 0.33, 0.27), 50 * u, BONE, outline=5 * u)
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(k)

    def gift(ctx, R, lt):
        g = ap(lt, 0.2, 0.6)
        with cam(ctx, R, 960, 520, 1.15, vfx=960):
            bg_mile_side(ctx, t)
            h1 = GM["coffey"].draw(ctx, 760, 960, 0.8, t=t, expr="happy", armR=78, elbowR=4, look=1)
            bars(ctx, 150, 1000)
            GM["paul"].draw(ctx, 1220, 1010, 0.82, t=t, facing=-1, expr="shock", armR=72, elbowR=6, look=-1)
            heal_glow(ctx, h1["R"][0] + 30, h1["R"][1], 150, g, t)
            for i in range(26):  # life flowing into Paul
                ph = (t * 0.7 + i / 26) % 1
                x = lerp(h1["R"][0], 1220, ph)
                y = h1["R"][1] - math.sin(ph * PI) * 120 + 15 * math.sin(i)
                ell(ctx, x, y, 6, 6)
                ctx.set_source_rgba(*GOLD, g * (1 - ph))
                ctx.fill()
        tint(ctx, R, (0.55, 0.38, 0.15), 0.25)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.12, "A PIECE OF COFFEY'S POWER", 42 * u, hx("#1a1206"), GOLD)

    def jingles(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1250)):
            bg_shed(ctx, t)
            GM["old_paul"].draw(ctx, 900, 1000, 0.85, t=t, expr="happy", look=1, hold={"L": "cane"}, armL=8, elbowL=10)
            mouse(ctx, 1240, 1000, 0.7, t, facing=-1)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.12, "MR. JINGLES: STILL ALIVE", 44 * u, BONE, (0.35, 0.25, 0.05))

    def graves(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 760)):
            bg_cemetery(ctx, t, n_stones=min(1, lt / 4))
            GM["old_paul"].draw(ctx, 960, 1060, 0.9, t=t, expr="sad", tears=True, hold={"L": "cane"}, armL=8, elbowL=10)
        tint(ctx, R, (0.3, 0.35, 0.45), 0.2)
        grade(ctx, R, strength=0.55)
        if t > t_pun:
            text(ctx, "His punishment?", W / 2, H * 0.12, 72 * u, BONE, "Liberation Serif", outline=5 * u, italic=True)

    shots(ctx, R, t, [(0, age), (t_power, gift), (t_mouse, jingles), (t_out, graves)])


def L9(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_jc, t_tell = p.cue("John Coffey's initials"), p.cue("Did this ending")

    def quote(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.02 * lt, vfx=V(R, 960, 640)):
            bg_nursing(ctx, t)
            GM["old_paul"].draw(ctx, 1240, 1010, 0.9, t=t, facing=-1, expr="sad", look=1, hold={"L": "cane"}, armL=8, elbowL=10)
        tint(ctx, R, (0.1, 0.08, 0.05), 0.55)
        grade(ctx, R, strength=0.7)
        lines = [("“We each owe a death.", p.cue("We each")), ("There are no exceptions.", p.cue("There are no")),
                 ("But, oh God, sometimes", p.cue("But, oh God")), ("the Green Mile seems so long.”", p.cue("the Green Mile seems"))]
        for i, (s, t0) in enumerate(lines):
            a = ap(t, t0, 0.5)
            if a > 0:
                ctx.push_group()
                text(ctx, s, W / 2, H * (0.22 + i * V(R, 0.11, 0.06)), V(R, 64, 50) * u, BONE, "Liberation Serif", outline=5 * u, italic=True)
                ctx.pop_group_to_source()
                ctx.paint_with_alpha(a)

    def jc(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.0, vfx=960):
            C.sky(ctx, hx("#1a1608"), hx("#3a2c10"))
            heal_glow(ctx, 960, 420, 320, 0.9, t)
            GM["coffey"].draw(ctx, 960, 1080, 0.95, t=t, expr="happy", armL=30, armR=30, elbowL=10, elbowR=10)
        grade(ctx, R, strength=0.7)
        glow_title(ctx, "J.C.", W / 2, H * V(R, 0.16, 0.14), 140 * u, t, color=hx("#fff2c8"))
        if t > p.cue("an innocent man"):
            text(ctx, "Takes on the world's pain... and dies for it", W / 2, H * V(R, 0.8, 0.62), V(R, 46, 40) * u, BONE,
                 outline=4 * u)

    def outro(ctx, R, lt):
        with cam(ctx, R, 960, 470, 1.0, vfx=960):
            bg_mile_corridor(ctx, t)
            GM["coffey"].draw(ctx, 960, lerp(1010, 640, min(1, lt / 8)), lerp(0.62, 0.2, min(1, lt / 8)), t=t, walk=t * 3,
                              expr="happy")
        grade(ctx, R, strength=0.8)
        glow_title(ctx, "DID IT WRECK YOU?", W / 2, H * V(R, 0.2, 0.16), V(R, 100, 72) * u, t, color=BONE)
        text(ctx, "Tell me in the comments", W / 2, H * V(R, 0.33, 0.24), 44 * u, BONE, outline=4 * u)
        ts = p.cue("subscribe")
        if t > ts:
            pulse = 1 + 0.06 * math.sin((t - ts) * 6)
            badge(ctx, W / 2, H * V(R, 0.45, 0.32), "SUBSCRIBE", 64 * u * pulse, (1, 1, 1), (0.85, 0.08, 0.08))

    shots(ctx, R, t, [(0, quote), (t_jc, jc), (t_tell, outro)])


LONG = [L0, L1, L2, L3, L4, L5, L6, L7, L8, L9]


# ====================================================================== SHORT scenes
def S0(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 470, 1.0 + 0.2 * ease(t / 4), vfx=960):
        bg_mile_corridor(ctx, t, flicker=0.1)
        GM["coffey"].draw(ctx, 960, lerp(700, 900, min(1, t / 4)), lerp(0.3, 0.48, min(1, t / 4)), t=t, walk=t * 3, expr="sad")
    grade(ctx, R, strength=0.8)
    glow_title(ctx, "THE GREEN MILE", W / 2, H * 0.12, 104 * u, t)
    text(ctx, "THE DARK ENDING", W / 2, H * 0.19, 56 * u, BONE, outline=5 * u)
    if t > p.cue("Spoilers"):
        badge(ctx, W / 2, H * 0.25, "SPOILERS", 50 * u)


def S1(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_hand = p.cue("When he took")

    def heal(ctx, R, lt):
        g = ap(lt, 0.4, 0.6)
        with cam(ctx, R, 960, 520, 1.0, vfx=960):
            bg_mile_side(ctx, t, flicker=0.5 * g)
            hands = GM["coffey"].draw(ctx, 960, 1000, 0.8, t=t, expr="sad", armL=40, armR=40, elbowL=80, elbowR=80)
            mx = (hands["L"][0] + hands["R"][0]) / 2
            heal_glow(ctx, mx, hands["R"][1], 110, g, t)
            insects(ctx, hands["head"][0] + 20, hands["head"][1] + 40, t, ap(lt, 1.5, 2), n=60, seed=5)
        grade(ctx, R, strength=0.55)

    def hand(ctx, R, lt):
        g = ap(lt, 0.3, 0.6)
        with cam(ctx, R, 960, 520, 1.0, vfx=990):
            bg_mile_side(ctx, t, flicker=0.6 * g)
            h1 = GM["coffey"].draw(ctx, 760, 960, 0.8, t=t, expr="sad", armR=78, elbowR=4, look=1)
            bars(ctx, 150, 1000)
            GM["paul"].draw(ctx, 1220, 1010, 0.82, t=t, facing=-1, expr="shock", armR=72, elbowR=6, look=-1)
            heal_glow(ctx, h1["R"][0] + 30, h1["R"][1], 150, g, t)
        grade(ctx, R, strength=0.6)

    shots(ctx, R, t, [(0, heal), (t_hand, hand)])


def S2(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_age = p.cue("one hundred and eight")
    with cam(ctx, R, 960, 560, 1.05, vfx=640):
        bg_nursing(ctx, t)
        armchair(ctx, 640, 980, 1.0)
        GM["old_paul"].draw(ctx, 640, 980, 0.95, t=t, sit=True, expr="sad", look=0.3, tears=t > t_age)
        armchair_front(ctx, 640, 980, 1.0)
    grade(ctx, R, strength=0.45)
    if t > t_age:
        n = int(lerp(1, 108, ease((t - t_age) / 1.2)))
        text(ctx, str(n), W / 2, H * 0.14, 230 * u, hx("#ffe14a"), outline=12 * u)
        text(ctx, "YEARS OLD", W / 2, H * 0.22, 56 * u, BONE, outline=5 * u)


def S3(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_mouse = p.cue("And the mouse")

    def graves(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_cemetery(ctx, t, n_stones=min(1, lt / 3) * 0.9)
            GM["old_paul"].draw(ctx, 960, 1060, 0.9, t=t, expr="sad", tears=True, hold={"L": "cane"}, armL=8, elbowL=10)
        grade(ctx, R, strength=0.55)
        text(ctx, "His punishment?", W / 2, H * 0.13, 80 * u, BONE, "Liberation Serif", outline=6 * u, italic=True)

    def jingles(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=1130):
            bg_shed(ctx, t)
            GM["old_paul"].draw(ctx, 1000, 1000, 0.85, t=t, expr="happy", look=1, hold={"L": "cane"}, armL=8, elbowL=10)
            mouse(ctx, 1260, 1000, 0.95, t, facing=-1)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.12, "MR. JINGLES: STILL ALIVE", 46 * u, BONE, (0.35, 0.25, 0.05))

    shots(ctx, R, t, [(0, graves), (t_mouse, jingles)])


def S4(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 470, 1.0, vfx=960):
        bg_mile_corridor(ctx, t)
    grade(ctx, R, strength=0.8)
    badge(ctx, W / 2, H * 0.14, "BLESSING?", 76 * u, (0.1, 0.08, 0.02), GOLD)
    text(ctx, "or", W / 2, H * 0.21, 54 * u, BONE, outline=4 * u)
    badge(ctx, W / 2, H * 0.28, "CURSE?", 76 * u, (1, 1, 1), (0.55, 0.05, 0.05))


SHORT = [S0, S1, S2, S3, S4]


# ---------------------------------------------------------------- captions (word-highlight), music, pipeline
def captions(ctx, R, p, t):
    for t0, t1, c in p.chunks(4 if R.vertical else 8):
        if not (t0 <= t < t1):
            continue
        u = R.u
        words = c.split()
        total = sum(len(w) + 1 for w in words)
        acc, cur = 0, len(words) - 1
        for i, w in enumerate(words):
            acc += len(w) + 1
            if t < t0 + (t1 - t0) * acc / total:
                cur = i
                break
        if R.vertical:
            words = [w.upper() for w in words]
            size = 74 * u
        else:
            size = 42 * u
        space = C.text_width(ctx, "M", size) * (0.5 if R.vertical else 0.38)
        widths = [C.text_width(ctx, w, size) for w in words]
        lines, line, lw = [], [], 0
        maxw = R.W - (120 if R.vertical else 360) * u
        for i, w in enumerate(widths):
            if line and lw + w + space > maxw:
                lines.append(line)
                line, lw = [], 0
            line.append(i)
            lw += w + space
        lines.append(line)
        y0 = R.H * 0.73 if R.vertical else R.H - 92 * u - (len(lines) - 1) * size * 1.25
        if not R.vertical:
            boxw = max(sum(widths[i] + space for i in ln) for ln in lines) + 40 * u
            rrect(ctx, R.W / 2 - boxw / 2, y0 - size * 0.85, boxw, len(lines) * size * 1.25 + size * 0.45, 14)
            ctx.set_source_rgba(0, 0, 0, 0.55)
            ctx.fill()
        for li, ln in enumerate(lines):
            lw = sum(widths[i] for i in ln) + space * (len(ln) - 1)
            x = R.W / 2 - lw / 2
            y = y0 + li * size * 1.25
            for i in ln:
                col = hx("#ffe14a") if i == cur else ((1, 1, 1) if i < cur else (1, 1, 1, 0.85))
                sz = size
                text(ctx, words[i], x, y, sz, col, outline=(7 if R.vertical else 3) * u, anchor="l")
                x += widths[i] + space
        return


def music(path, dur, sr=48000):
    """Original soft piano score: slow A-minor progression, arpeggios + pad, simple reverb."""
    bpm = 66
    beat = 60 / bpm
    prog = [("A", [57, 60, 64]), ("F", [53, 57, 60]), ("C", [48, 55, 60, 64]), ("G", [55, 59, 62]),
            ("A", [57, 60, 64]), ("D", [50, 57, 62, 65]), ("F", [53, 57, 60]), ("E", [52, 56, 59, 64])]
    n = int(dur * sr) + sr * 3
    out = np.zeros(n)

    def note(midi, t0, length, vel, kind="piano"):
        f = 440 * 2 ** ((midi - 69) / 12)
        i0 = int(t0 * sr)
        L = int(length * sr)
        if i0 >= n:
            return
        L = min(L, n - i0)
        tt = np.arange(L) / sr
        if kind == "piano":
            env = np.exp(-tt * 2.2) * np.minimum(1, tt / 0.004)
            w = sum(a * np.sin(2 * np.pi * f * h * tt) for h, a in ((1, 1), (2, 0.42), (3, 0.18), (4, 0.08)))
        else:
            env = np.minimum(1, tt / 1.2) * np.minimum(1, (length - tt) / 1.2)
            w = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.001 * tt)
        out[i0:i0 + L] += vel * env * w

    t, bar = 1.0, 0
    while t < dur:
        name, ch = prog[bar % len(prog)]
        for c in ch[:3]:
            note(c - 12, t, beat * 4, 0.05, "pad")
        pattern = [ch[0], ch[1], ch[2], ch[-1] + 12 if len(ch) > 3 else ch[0] + 12, ch[2], ch[1], ch[2], ch[1]]
        for k, m in enumerate(pattern):
            note(m, t + k * beat / 2, beat * 3, 0.16 if k == 0 else 0.11)
        if bar % 2 == 1:  # a simple melody note on top every other bar
            note(ch[-1] + 12, t + beat * 2, beat * 2.5, 0.09)
        t += beat * 4
        bar += 1
    wet = out.copy()  # cheap reverb
    for d, g in ((0.031, 0.5), (0.053, 0.42), (0.089, 0.35), (0.137, 0.28), (0.211, 0.2), (0.307, 0.14)):
        k = int(d * sr)
        wet[k:] += out[:-k] * g
    wet = wet[: int(dur * sr)]
    fade = np.ones_like(wet)
    fl = int(3 * sr)
    fade[-fl:] = np.linspace(1, 0, fl)
    fade[: sr] = np.linspace(0, 1, sr)
    wet *= fade
    wet = wet / (np.abs(wet).max() + 1e-9) * 0.6
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((wet * 32767).astype(np.int16).tobytes())


CFG = {"long": (1920, 1080, False, LONG), "short": (1080, 1920, True, SHORT)}
G = {}


def frame(ctx, R, scenes, i, p, t, grain):
    ctx.set_source_rgb(0, 0, 0)
    ctx.paint()
    ctx.save()
    scenes[i](ctx, R, t, p)
    ctx.restore()
    g = grain[int(t * FPS) % len(grain)]
    ctx.save()
    ctx.scale(2, 2)
    ctx.set_source_surface(g, 0, 0)
    ctx.paint()
    ctx.restore()
    captions(ctx, R, p, t)
    k = min(1, t / 0.3, (p.dur - t) / 0.3)
    if k < 1:
        ctx.set_source_rgba(0, 0, 0, 1 - k)
        ctx.paint()


def render_scene(args):
    i, out = args
    W, H, vertical, scenes = G["cfg"]
    R = Rd(W, H, vertical)
    p = G["paras"][i]
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    grain = make_grain(W, H)
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "21",
                           "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for f in range(int(round(p.dur * FPS))):
        frame(ctx, R, scenes, i, p, f / FPS, grain)
        surf.flush()
        ff.stdin.write(surf.get_data())
    ff.stdin.close()
    ff.wait()
    return out


def load(mode, vo_dir, script):
    G["cfg"] = CFG[mode]
    texts = [x.strip() for x in open(script).read().split("\n\n") if x.strip()]
    paras, start = [], 0.0
    for i, tx in enumerate(texts):
        pp = Para(tx, wav_len(f"{vo_dir}/{i:02d}.wav"), start)
        paras.append(pp)
        start += pp.dur
    assert len(paras) == len(G["cfg"][3]), (len(paras), len(G["cfg"][3]))
    G["paras"] = paras
    return paras, start


def stills(mode, vo_dir, script, outdir, fracs=(0.15, 0.45, 0.75, 0.95)):
    paras, _ = load(mode, vo_dir, script)
    W, H, vertical, scenes = G["cfg"]
    R = Rd(W, H, vertical)
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    grain = make_grain(W, H, 1)
    only = os.environ.get("ONLY")
    for i, p in enumerate(paras):
        if only and str(i) not in only.split(","):
            continue
        for fr in fracs:
            frame(ctx, R, scenes, i, p, p.dur * fr, grain)
            surf.write_to_png(f"{outdir}/{mode}_{i:02d}_{int(fr * 100):02d}.png")


def main():
    if sys.argv[1] == "still":
        return stills(*sys.argv[2:6])
    mode, vo_dir, script, out = sys.argv[1:5]
    paras, total = load(mode, vo_dir, script)
    work = out + "_parts"
    os.makedirs(work, exist_ok=True)
    jobs = sorted([(i, f"{work}/s{i:02d}.mp4") for i in range(len(paras))], key=lambda j: -paras[j[0]].dur)
    with Pool(4) as pool:
        for r in pool.imap_unordered(render_scene, jobs):
            print("done", r, flush=True)
    parts = [f"[{i}:a]aresample=48000,adelay={int(LEAD * 1000)}:all=1,apad=whole_dur={p.dur:.3f}[a{i}]" for i, p in enumerate(paras)]
    inputs = sum([["-i", f"{vo_dir}/{i:02d}.wav"] for i in range(len(paras))], [])
    fc = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(len(paras))) + f"concat=n={len(paras)}:v=0:a=1[vo]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "[vo]", f"{work}/vo.wav"], check=True)
    music(f"{work}/music.wav", total)
    with open(f"{work}/list.txt", "w") as fh:
        for i in range(len(paras)):
            fh.write(f"file 's{i:02d}.mp4'\n")
    # music ducks under the narration (sidechain compression)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{work}/list.txt",
                    "-i", f"{work}/vo.wav", "-i", f"{work}/music.wav",
                    "-filter_complex", "[1]aresample=48000,asplit=2[v][sc];[2]aresample=48000,volume=0.55[m];"
                    "[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];"
                    "[v][md]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                    "-shortest", out], check=True)
    print("wrote", out, round(total, 1), "s")


if __name__ == "__main__":
    main()
