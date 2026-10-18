"""The Twilight Saga, every book explained (plot, twist, ending, book vs film): cartoon explainer + Short.

Uses the shared cartoon engine in ../crystal_lake and helpers from ../green_mile.
usage: python tw.py long|short VO_DIR SCRIPT OUT
       python tw.py still long|short VO_DIR SCRIPT DIR
"""
import math, os, random, subprocess, sys
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "crystal_lake"))
sys.path.insert(0, os.path.join(HERE, "..", "green_mile"))

import cairo

import cartoon as C
from cartoon import Char, hx, ease, lerp, text, rrect, ell, fs, src, INK
from render import Para, wav_len, LEAD
from story import Rd, cam, grade, tint, flash, sepia_bubble, badge, stamp, make_grain, ap
import gm
from gm import shots, V, lower_third, dust, glow_title, ceiling_lamp

FPS = 30
PI = math.pi
BONE = hx("#f4ead2")
GOLD_EYE, RED_EYE, BROWN_EYE = hx("#c9952a"), hx("#c0141c"), hx("#5a3a20")
PALE = hx("#f4e6dc")
TW_RED = hx("#b3121c")

# ------------------------------------------------------------------ cast
def vamp(**k):
    k.setdefault("skin", PALE)
    k.setdefault("iris", GOLD_EYE)
    return Char(**k)


ROBE = hx("#141418")
TW = {
    "bella": Char(skin=hx("#f1d6c2"), hair=hx("#5a3a24"), hair_style="long", shirt=hx("#3d5a80"), top="shirt",
                  pants=hx("#3e4f6e"), head_r=66, lashes=True, iris=BROWN_EYE, bulk=0.86, lips=hx("#b0606a")),
    "bella_prom": Char(skin=hx("#f1d6c2"), hair=hx("#5a3a24"), hair_style="long", shirt=hx("#2f5a8a"), top="gown",
                       head_r=66, lashes=True, iris=BROWN_EYE, bulk=0.86, lips=hx("#b0606a")),
    "bella_bride": Char(skin=hx("#f1d6c2"), hair=hx("#5a3a24"), hair_style="pam", shirt=hx("#f6f2ea"), top="gown",
                        head_r=66, lashes=True, iris=BROWN_EYE, bulk=0.86, lips=hx("#b0606a")),
    "bella_preg": Char(skin=hx("#e8d4cc"), hair=hx("#5a3a24"), hair_style="long", shirt=hx("#8a8a94"), top="shirt",
                       pants=hx("#3e4f6e"), head_r=64, lashes=True, iris=BROWN_EYE, bulk=0.8),
    "bella_vamp": vamp(hair=hx("#5a3a24"), hair_style="long", shirt=hx("#2a2a3a"), top="shirt", pants=hx("#2b2e36"),
                       head_r=66, lashes=True, iris=RED_EYE, bulk=0.86, lips=hx("#b0404a")),
    "edward": vamp(hair=hx("#8a4a28"), hair_style="quiff", shirt=hx("#5f6670"), top="coat", pants=hx("#2b2e36"),
                   head_r=66, bulk=0.95, leg=300),
    "edward_suit": vamp(hair=hx("#8a4a28"), hair_style="quiff", shirt=hx("#1e1e24"), top="suit", pants=hx("#1e1e24"),
                        head_r=66, bulk=0.95, leg=300, tie=hx("#e8e8ec")),
    "jacob_long": Char(skin=hx("#b07a52"), hair=hx("#141010"), hair_style="long", shirt=hx("#8a3a2a"), top="shirt",
                       pants=hx("#4a4038"), head_r=68, bulk=1.08, iris=BROWN_EYE),
    "jacob": Char(skin=hx("#b07a52"), hair=hx("#141010"), hair_style="short", shirt=hx("#5a4a3a"), top="shirt",
                  pants=hx("#4a4038"), head_r=68, bulk=1.2, iris=BROWN_EYE, leg=300),
    "charlie": Char(skin=hx("#eec6a4"), hair=hx("#5a3a24"), hair_style="short", shirt=hx("#b39a6c"), top="uniform",
                    pants=hx("#4a3a28"), head_r=68, bulk=1.05, mustache=hx("#5a3a24"), iris=BROWN_EYE),
    "alice": vamp(hair=hx("#141014"), hair_style="pixie", shirt=hx("#6a4a8a"), top="dress", head_r=60, bulk=0.74,
                  leg=245, torso=168, lashes=True),
    "jasper": vamp(hair=hx("#c9a85a"), hair_style="curly", shirt=hx("#6a5a44"), top="coat", pants=hx("#3a3530"), head_r=64),
    "rosalie": vamp(hair=hx("#ead27a"), hair_style="long", shirt=hx("#a0202a"), top="dress", head_r=64, lashes=True,
                    lips=hx("#b0303a"), bulk=0.86),
    "emmett": vamp(hair=hx("#2a1e18"), hair_style="short", shirt=hx("#4a4a52"), top="shirt", pants=hx("#2b2e36"),
                   head_r=68, bulk=1.35, leg=300, torso=215),
    "carlisle": vamp(hair=hx("#e0c070"), hair_style="slick", shirt=hx("#e8e8e4"), top="coat", pants=hx("#3a3a44"), head_r=66),
    "esme": vamp(hair=hx("#a0703a"), hair_style="pam", shirt=hx("#3a7a5a"), top="dress", head_r=64, lashes=True, bulk=0.86),
    "james": vamp(hair=hx("#d8c080"), hair_style="ponytail", shirt=hx("#4a3020"), top="coat", pants=hx("#2a2420"),
                  head_r=64, iris=RED_EYE),
    "victoria": vamp(hair=hx("#d2541c"), hair_style="curly", shirt=hx("#2a4a3a"), top="coat", pants=hx("#2a2420"),
                     head_r=62, iris=RED_EYE, lashes=True, bulk=0.85),
    "laurent": vamp(skin=hx("#6a4430"), hair=hx("#1a1410"), hair_style="long", shirt=hx("#7a6a50"), top="coat",
                    pants=hx("#3a3020"), head_r=64, iris=RED_EYE),
    "aro": vamp(skin=hx("#f0ece6"), hair=hx("#141414"), hair_style="long", shirt=ROBE, top="robe", head_r=64, iris=RED_EYE),
    "caius": vamp(skin=hx("#f0ece6"), hair=hx("#efe8d8"), hair_style="long", shirt=ROBE, top="robe", head_r=64, iris=RED_EYE),
    "marcus": vamp(skin=hx("#f0ece6"), hair=hx("#3a2a20"), hair_style="long", shirt=ROBE, top="robe", head_r=64, iris=RED_EYE),
    "jane": vamp(hair=hx("#e8d6a0"), hair_style="bun", shirt=hx("#3a3a42"), top="robe", head_r=60, bulk=0.72, leg=240,
                 torso=160, iris=RED_EYE, lashes=True),
    "guard": vamp(hair=hx("#2a2a2a"), hair_style="short", shirt=hx("#3a3a42"), top="robe", head_r=64, iris=RED_EYE, bulk=1.1),
    "renesmee": Char(skin=hx("#f4dcc8"), hair=hx("#a0603a"), hair_style="curly", shirt=hx("#f0ece0"), top="dress",
                     leg=150, torso=110, head_r=66, arm=115, bulk=0.58, iris=BROWN_EYE, lashes=True),
    "riley": vamp(hair=hx("#c9a85a"), hair_style="short", shirt=hx("#3a4a6a"), top="shirt", pants=hx("#2b2e36"),
                  head_r=64, iris=RED_EYE),
    "bree": vamp(hair=hx("#2a1a14"), hair_style="long", shirt=hx("#6a3a4a"), top="shirt", pants=hx("#2b2e36"),
                 head_r=60, iris=RED_EYE, bulk=0.78, lashes=True),
    "nahuel": Char(skin=hx("#9a6a48"), hair=hx("#141010"), hair_style="long", shirt=hx("#e8e0d0"), top="shirt",
                   pants=hx("#5a4a3a"), head_r=64, iris=BROWN_EYE),
    "irina": vamp(hair=hx("#e8dcc0"), hair_style="long", shirt=hx("#8a9ab0"), top="dress", head_r=62, lashes=True, bulk=0.84),
    "mom": Char(skin=hx("#f0d0b8"), hair=hx("#7a5a3a"), hair_style="curly", shirt=hx("#e0a040"), top="dress", head_r=62,
                lashes=True, iris=BROWN_EYE),
    "kid_bella": Char(skin=hx("#f1d6c2"), hair=hx("#5a3a24"), hair_style="pigtails", shirt=hx("#f2a0b0"), top="dress",
                      leg=150, torso=110, head_r=64, arm=115, bulk=0.58, iris=BROWN_EYE, accent=hx("#f2f2f2")),
}
NEWBORN_SKINS = [PALE, hx("#e8d0c0"), hx("#d8b8a0"), hx("#f0dcd0")]


def newborn(i):
    rnd = random.Random(i)
    return vamp(skin=rnd.choice(NEWBORN_SKINS), hair=rnd.choice([hx("#2a1e18"), hx("#5a3a24"), hx("#c9a85a"), hx("#141010")]),
                hair_style=rnd.choice(["short", "long", "curly", "slick"]),
                shirt=rnd.choice([hx("#3a3a42"), hx("#5a3a3a"), hx("#3a4a5a"), hx("#4a4a3a")]), top="shirt",
                pants=hx("#2b2e36"), head_r=62, iris=RED_EYE, bulk=rnd.uniform(0.85, 1.1))


def witness(i):
    rnd = random.Random(100 + i)
    return vamp(skin=rnd.choice([PALE, hx("#c89a78"), hx("#8a5a3e"), hx("#e8d0c0")]),
                hair=rnd.choice([hx("#141010"), hx("#5a3a24"), hx("#c9a85a"), hx("#d2541c"), hx("#efe8d8")]),
                hair_style=rnd.choice(["long", "short", "curly", "slick", "pam"]),
                shirt=rnd.choice([hx("#3a5a3a"), hx("#5a3a5a"), hx("#6a5a3a"), hx("#3a4a6a"), hx("#7a2a2a")]),
                top=rnd.choice(["coat", "shirt", "dress"]), pants=hx("#2b2e36"), head_r=62,
                iris=rnd.choice([GOLD_EYE, RED_EYE]), bulk=rnd.uniform(0.85, 1.1))


# ------------------------------------------------------------------ props & effects
def wolf(ctx, x, y, s, t, color=hx("#8a4a28"), walk=None, facing=1, alpha=1.0):
    """Side-view giant wolf, feet at (x, y)."""
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * facing, s)
    if alpha < 1:
        ctx.push_group()
    ph = walk if walk is not None else 0
    bob = -abs(math.sin(ph)) * 10 if walk is not None else 2 * math.sin(t * 2)
    dark = C.mix(color, (0, 0, 0), 0.3)
    ell(ctx, 0, 0, 230, 22)
    ctx.set_source_rgba(0, 0, 0, 0.35)
    ctx.fill()
    for k, (lx, sgn, col) in enumerate(((-150, 1, dark), (120, -1, dark), (-120, -1, color), (150, 1, color))):
        a = (0.45 * math.sin(ph + k * PI / 2) if walk is not None else 0) * sgn
        ctx.save()
        ctx.translate(lx, -230 + bob)
        ctx.rotate(a)
        rrect(ctx, -24, 0, 48, 235, 22)
        C.fs(ctx, col)
        ell(ctx, 8, 232, 34, 14)
        C.fs(ctx, C.mix(col, (0, 0, 0), 0.2))
        ctx.restore()
    ctx.new_path()  # tail
    ctx.move_to(-230, -320 + bob)
    ctx.curve_to(-320, -330 + 20 * math.sin(t * 3), -360, -250, -330, -200)
    ctx.curve_to(-300, -260, -270, -280, -220, -280 + bob)
    ctx.close_path()
    C.fs(ctx, color)
    ell(ctx, 0, -320 + bob, 250, 110)  # body
    C.fs(ctx, color)
    C.shade(ctx, lambda: ell(ctx, 0, -320 + bob, 250, 110), -5000, 0.0)
    ctx.save()
    ell(ctx, 0, -320 + bob, 250, 110)
    ctx.clip()
    ctx.set_source_rgba(0, 0, 0, 0.18)
    ctx.rectangle(-300, -300 + bob, 600, 200)
    ctx.fill()
    ctx.set_source_rgba(1, 1, 1, 0.08)
    for i in range(10):
        ctx.move_to(-200 + i * 40, -420 + bob)
        ctx.line_to(-180 + i * 40, -360 + bob)
    ctx.set_line_width(3)
    ctx.stroke()
    ctx.restore()
    ctx.new_path()  # neck + head
    ctx.move_to(150, -400 + bob)
    ctx.curve_to(220, -470, 260, -500, 300, -500 + bob)
    ctx.line_to(330, -380 + bob)
    ctx.curve_to(260, -330, 200, -290, 160, -280 + bob)
    ctx.close_path()
    C.fs(ctx, color)
    ell(ctx, 310, -470 + bob, 80, 66)
    C.fs(ctx, color)
    ctx.new_path()  # snout
    ctx.move_to(350, -500 + bob)
    ctx.line_to(450, -470 + bob)
    ctx.curve_to(465, -455, 455, -430, 440, -428 + bob)
    ctx.line_to(350, -420 + bob)
    ctx.close_path()
    C.fs(ctx, C.mix(color, (1, 1, 1), 0.08))
    ell(ctx, 450, -462 + bob, 12, 10)
    src(ctx, INK)
    ctx.fill()
    for ex in (270, 310):  # ears
        ctx.new_path()
        ctx.move_to(ex - 22, -520 + bob)
        ctx.line_to(ex - 5, -590 + bob)
        ctx.line_to(ex + 18, -515 + bob)
        ctx.close_path()
        C.fs(ctx, dark)
    ell(ctx, 345, -485 + bob, 11, 9)
    ctx.set_source_rgb(0.95, 0.75, 0.2)
    ctx.fill()
    ell(ctx, 347, -485 + bob, 4, 7)
    src(ctx, INK)
    ctx.fill()
    if alpha < 1:
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(alpha)
    ctx.restore()


WOLF_COLORS = {"jacob": hx("#8a4a28"), "sam": hx("#1e1c1c"), "seth": hx("#c9a86a"), "leah": hx("#9a9a9a"),
               "paul": hx("#6a6a6a"), "embry": hx("#5a4a3a")}


def sparkle(ctx, x, y0, y1, w, t, k=1.0, n=34, seed=0):
    """Diamond-like glints on a vampire's skin in sunlight."""
    if k <= 0:
        return
    rnd = random.Random(seed)
    for i in range(n):
        px = x + rnd.uniform(-w / 2, w / 2)
        py = rnd.uniform(y0, y1)
        tw = max(0, math.sin(t * rnd.uniform(3, 7) + i))
        r = rnd.uniform(5, 13) * tw
        if r < 1:
            continue
        ctx.save()
        ctx.translate(px, py)
        ctx.new_path()
        for j in range(8):
            a = j * PI / 4
            rr = r if j % 2 == 0 else r * 0.25
            ctx.line_to(rr * math.cos(a), rr * math.sin(a))
        ctx.close_path()
        ctx.set_source_rgba(1, 1, 1, 0.95 * k)
        ctx.fill()
        ctx.restore()


def rain(ctx, t, a=0.35, seed=0):
    rnd = random.Random(seed)
    ctx.set_line_width(2)
    for i in range(160):
        x = (rnd.uniform(-200, 2200) + t * 120) % 2400 - 200
        y = (rnd.uniform(0, 1200) + t * 1400 * rnd.uniform(0.8, 1.2)) % 1300 - 100
        ctx.move_to(x, y)
        ctx.line_to(x + 8, y + 34)
        ctx.set_source_rgba(0.8, 0.85, 0.95, a)
        ctx.stroke()


def snowfall(ctx, t, a=0.8, n=120, seed=0):
    rnd = random.Random(seed)
    for i in range(n):
        x = (rnd.uniform(-200, 2200) + math.sin(t + i) * 30 + t * 20) % 2400 - 200
        y = (rnd.uniform(0, 1200) + t * 90 * rnd.uniform(0.6, 1.4)) % 1300 - 100
        r = rnd.uniform(2, 6)
        ell(ctx, x, y, r, r)
        ctx.set_source_rgba(1, 1, 1, a)
        ctx.fill()


def poof(ctx, x, y, t, k, color=(0.75, 0.75, 0.78)):
    """Cartoon dust cloud: used instead of showing anything graphic."""
    if k <= 0 or k >= 1.4:
        return
    rnd = random.Random(int(x))
    for i in range(12):
        a = i * 2 * PI / 12 + rnd.uniform(-0.2, 0.2)
        d = 30 + k * 160
        r = 50 * (1.2 - abs(k - 0.4))
        ell(ctx, x + d * math.cos(a), y + d * math.sin(a) * 0.7, r, r)
        ctx.set_source_rgba(*color, max(0, 0.85 * (1.4 - k)))
        ctx.fill()


def shield(ctx, x, y, rx, ry, t, k):
    if k <= 0:
        return
    g = cairo.RadialGradient(x, y, rx * 0.5, x, y, rx)
    g.add_color_stop_rgba(0, 0.5, 0.8, 1, 0.05 * k)
    g.add_color_stop_rgba(0.9, 0.5, 0.8, 1, 0.22 * k)
    g.add_color_stop_rgba(1, 0.7, 0.9, 1, 0.5 * k)
    ctx.set_source(g)
    ell(ctx, x, y, rx, ry, PI, 2 * PI)
    ctx.close_path()
    ctx.fill()
    ctx.set_line_width(4)
    ctx.set_source_rgba(0.8, 0.95, 1, 0.7 * k * (0.7 + 0.3 * math.sin(t * 4)))
    ell(ctx, x, y, rx, ry, PI, 2 * PI)
    ctx.stroke()


def scent(ctx, x0, y0, x1, y1, t, k):
    if k <= 0:
        return
    for j in range(4):
        ctx.new_path()
        for i in range(30):
            f = i / 29
            x = lerp(x0, x1, f)
            y = lerp(y0, y1, f) + 30 * math.sin(f * 9 + t * 3 + j)
            ctx.line_to(x, y)
        ctx.set_line_width(5)
        ctx.set_source_rgba(0.85, 0.15, 0.25, 0.35 * k)
        ctx.stroke()


def car(ctx, x, y, s, color, t, kind="sedan", facing=1, dent=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * facing, s)
    if kind == "truck":
        ctx.new_path()
        ctx.move_to(-300, -40)
        ctx.line_to(-300, -150)
        ctx.line_to(20, -150)
        ctx.line_to(20, -270)
        ctx.curve_to(60, -290, 160, -290, 190, -260)
        ctx.line_to(220, -160)
        ctx.curve_to(300, -150, 320, -120, 320, -40)
        ctx.close_path()
        C.fs(ctx, color, 6)
        ctx.rectangle(50, -255, 120, 80)
        C.fs(ctx, hx("#a0b8c8"), 4)
        ctx.rectangle(-300, -60, 620, 18)
        C.fs(ctx, hx("#c8c8c8"), 3)
    elif kind == "van":
        rrect(ctx, -320, -330, 600, 300, 30)
        C.fs(ctx, color, 6)
        ctx.new_path()
        ctx.move_to(280, -320)
        ctx.line_to(330, -200)
        ctx.line_to(330, -40)
        ctx.line_to(280, -40)
        ctx.close_path()
        C.fs(ctx, color, 6)
        ctx.rectangle(160, -300, 140, 100)
        C.fs(ctx, hx("#a0b8c8"), 4)
        if dent > 0:
            ctx.new_path()
            ctx.move_to(-320, -230)
            ctx.curve_to(-300 + 60 * dent, -200, -300 + 60 * dent, -140, -320, -110)
            ctx.set_line_width(5)
            src(ctx, INK)
            ctx.stroke()
    else:
        ctx.new_path()
        ctx.move_to(-300, -40)
        ctx.line_to(-300, -120)
        ctx.curve_to(-250, -140, -170, -140, -130, -150)
        ctx.line_to(-70, -230)
        ctx.line_to(120, -230)
        ctx.line_to(190, -150)
        ctx.curve_to(260, -145, 300, -120, 310, -90)
        ctx.line_to(310, -40)
        ctx.close_path()
        C.fs(ctx, color, 6)
        ctx.new_path()
        ctx.move_to(-50, -215)
        ctx.line_to(105, -215)
        ctx.line_to(160, -152)
        ctx.line_to(-95, -152)
        ctx.close_path()
        C.fs(ctx, hx("#a0b8c8"), 4)
    for wx in (-180, 200):
        ell(ctx, wx, -30, 52, 52)
        C.fs(ctx, hx("#141414"), 5)
        ell(ctx, wx, -30, 22, 22)
        C.fs(ctx, hx("#9a9a9a"), 3)
    ctx.restore()


def moon_icon(ctx, x, y, r, kind):
    """Moon-phase symbol for each book (original art)."""
    ctx.save()
    ctx.translate(x, y)
    if kind == "twilight":  # crescent at dusk
        ell(ctx, 0, 0, r, r)
        ctx.set_source_rgb(0.98, 0.9, 0.7)
        ctx.fill()
        ell(ctx, r * 0.42, -r * 0.15, r * 0.88, r * 0.88)
        ctx.set_source_rgb(0.12, 0.06, 0.14)
        ctx.fill()
    elif kind == "newmoon":
        ell(ctx, 0, 0, r, r)
        ctx.set_source_rgb(0.08, 0.08, 0.1)
        ctx.fill_preserve()
        ctx.set_line_width(4)
        ctx.set_source_rgba(0.85, 0.85, 0.95, 0.8)
        ctx.stroke()
    elif kind == "eclipse":
        g = cairo.RadialGradient(0, 0, r * 0.8, 0, 0, r * 1.6)
        g.add_color_stop_rgba(0, 1, 0.75, 0.3, 0.9)
        g.add_color_stop_rgba(1, 1, 0.5, 0.2, 0)
        ctx.set_source(g)
        ell(ctx, 0, 0, r * 1.6, r * 1.6)
        ctx.fill()
        ell(ctx, 0, 0, r, r)
        ctx.set_source_rgb(0.05, 0.03, 0.03)
        ctx.fill()
    else:  # breaking dawn: sunrise over a horizon
        ell(ctx, 0, r * 0.3, r, r, PI, 2 * PI)
        ctx.close_path()
        ctx.set_source_rgb(1, 0.7, 0.35)
        ctx.fill()
        ctx.set_line_width(5)
        for i in range(7):
            a = PI + (i + 0.5) * PI / 7
            ctx.move_to(r * 1.2 * math.cos(a), r * 0.3 + r * 1.2 * math.sin(a))
            ctx.line_to(r * 1.6 * math.cos(a), r * 0.3 + r * 1.6 * math.sin(a))
        ctx.stroke()
        ctx.rectangle(-r * 1.8, r * 0.3, r * 3.6, 6)
        ctx.fill()
    ctx.restore()


BOOKS = {1: ("TWILIGHT", "2005", "twilight", hx("#8a2a4a")), 2: ("NEW MOON", "2006", "newmoon", hx("#3a3a5a")),
         3: ("ECLIPSE", "2007", "eclipse", hx("#7a3a14")), 4: ("BREAKING DAWN", "2008", "dawn", hx("#6a1a2a"))}


def chapter_card(ctx, R, t, n, hold=2.4):
    a = 1 - ap(t, hold, 0.5)
    if a <= 0:
        return
    title, year, icon, col = BOOKS[n]
    W, H, u = R.W, R.H, R.u
    ctx.push_group()
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgb(0, *C.mix(col, (0, 0, 0), 0.5))
    g.add_color_stop_rgb(1, 0.04, 0.03, 0.05)
    ctx.set_source(g)
    ctx.paint()
    k = ap(t, 0.1, 0.6)
    moon_icon(ctx, W / 2, H * V(R, 0.28, 0.26), 90 * u * (0.8 + 0.2 * k), icon)
    text(ctx, f"BOOK {n}", W / 2, H * V(R, 0.5, 0.4), 50 * u, BONE, outline=4 * u)
    text(ctx, title, W / 2, H * V(R, 0.63, 0.47), V(R, 130, 100) * u, BONE, "Liberation Serif", outline=6 * u)
    text(ctx, year, W / 2, H * V(R, 0.76, 0.535), 44 * u, hx("#e0a0a8"), outline=3 * u)
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(a * k)


# ------------------------------------------------------------------ sets
def bg_forest(ctx, t, rain_a=0.3, light=0.0):
    C.sky(ctx, C.mix(hx("#5a6a60"), hx("#c8d8a0"), light), C.mix(hx("#26332a"), hx("#6a8a4a"), light))
    rnd = random.Random(14)
    for layer, (col, n, wmin, wmax) in enumerate([(hx("#3a4a3c"), 26, 16, 34), (hx("#2a3a2a"), 18, 28, 54),
                                                  (hx("#1a261a"), 10, 50, 90)]):
        for i in range(n):
            x = rnd.uniform(-500, 2400)
            w = rnd.uniform(wmin, wmax)
            ctx.rectangle(x, -400, w, 2000)
            src(ctx, col)
            ctx.fill()
            ctx.set_source_rgba(0.35, 0.55, 0.25, 0.35)  # moss
            ctx.rectangle(x, rnd.uniform(200, 700), w * 0.5, rnd.uniform(100, 300))
            ctx.fill()
            for b in range(3):
                by = rnd.uniform(-50, 600)
                d = rnd.choice((-1, 1))
                ctx.new_path()
                ctx.move_to(x + w / 2, by)
                for k in range(6):
                    ctx.line_to(x + w / 2 + d * (40 + k * 30), by - 10 + k * 18)
                    ctx.line_to(x + w / 2 + d * (60 + k * 30), by + 30 + k * 18)
                ctx.close_path()
                src(ctx, C.mix(col, hx("#2a5a2a"), 0.5))
                ctx.fill()
        C.fog(ctx, t, 650 + layer * 140, 220, 0.16 + 0.04 * layer, color=(0.8, 0.85, 0.82), seed=layer + 3)
    g = cairo.LinearGradient(0, 860, 0, 1080)
    g.add_color_stop_rgb(0, *hx("#2a3a1e"))
    g.add_color_stop_rgb(1, *hx("#141c10"))
    ctx.set_source(g)
    ctx.rectangle(-1200, 860, 4400, 600)
    ctx.fill()
    for i in range(40):  # ferns
        x = rnd.uniform(-300, 2200)
        y = rnd.uniform(880, 1080)
        for k in range(7):
            a = -PI / 2 + (k - 3) * 0.32 + 0.05 * math.sin(t + i)
            ctx.move_to(x, y)
            ctx.line_to(x + 90 * math.cos(a), y + 90 * math.sin(a))
        ctx.set_line_width(6)
        src(ctx, hx("#3a6a2a"))
        ctx.stroke()
    if rain_a > 0:
        rain(ctx, t, rain_a)


def bg_school(ctx, t):
    C.sky(ctx, hx("#7a8a8a"), hx("#b8c0c0"), 700)
    C.treeline(ctx, 560, 140, 260, hx("#2a3a2a"), 7)
    ctx.rectangle(200, 300, 1500, 320)  # school building
    C.fs(ctx, hx("#8a4a3a"), 6)
    ctx.set_source_rgba(0, 0, 0, 0.12)
    for j in range(14):
        for i in range(40):
            ctx.rectangle(200 + i * 38 + (j % 2) * 19, 300 + j * 23, 36, 21)
    ctx.fill()
    ctx.rectangle(180, 280, 1540, 30)
    C.fs(ctx, hx("#4a4a4a"), 5)
    for i in range(8):
        ctx.rectangle(270 + i * 180, 380, 110, 120)
        C.fs(ctx, hx("#c8d8e0"), 4)
    rrect(ctx, 700, 210, 520, 80, 10)
    C.fs(ctx, hx("#e8e0c8"), 4)
    text(ctx, "FORKS HIGH SCHOOL", 960, 250, 38, hx("#2a3a2a"), "Liberation Serif", outline=0)
    ctx.rectangle(-800, 620, 3600, 600)  # wet parking lot
    src(ctx, hx("#3a3e44"))
    ctx.fill()
    ctx.set_source_rgba(1, 1, 1, 0.5)
    ctx.set_line_width(5)
    for i in range(10):
        ctx.move_to(100 + i * 200, 700)
        ctx.line_to(60 + i * 200, 820)
        ctx.stroke()
    ctx.set_source_rgba(0.8, 0.85, 0.9, 0.12)
    for i in range(8):
        ell(ctx, 200 + i * 240, 960, 120, 14)
        ctx.fill()
    rain(ctx, t, 0.35)


def bg_clearing(ctx, t, storm=False, snow=False, sun=False):
    if snow:
        C.sky(ctx, hx("#a8b4c4"), hx("#e8eef4"), 700)
    elif storm:
        C.sky(ctx, hx("#1a1e2a"), hx("#4a5260"), 700)
    elif sun:
        C.sky(ctx, hx("#6aa8e0"), hx("#d8eef8"), 700)
    else:
        C.sky(ctx, hx("#5a6470"), hx("#a8b0b4"), 700)
    for i, (x, h) in enumerate(((200, 260), (700, 360), (1250, 300), (1700, 380))):
        ctx.new_path()
        ctx.move_to(x - 500, 640)
        ctx.line_to(x, 640 - h)
        ctx.line_to(x + 500, 640)
        ctx.close_path()
        src(ctx, hx("#e8eef4") if snow else hx("#4a5a6a"))
        ctx.fill()
        if not snow:
            ctx.new_path()
            ctx.move_to(x - 90, 640 - h + 70)
            ctx.line_to(x, 640 - h)
            ctx.line_to(x + 90, 640 - h + 70)
            ctx.close_path()
            ctx.set_source_rgb(0.92, 0.94, 0.96)
            ctx.fill()
    C.treeline(ctx, 660, 120, 230, hx("#c8d4dc") if snow else hx("#1e2e22"), 3)
    g = cairo.LinearGradient(0, 660, 0, 1080)
    if snow:
        g.add_color_stop_rgb(0, *hx("#dde6ee"))
        g.add_color_stop_rgb(1, *hx("#f6f8fa"))
    else:
        g.add_color_stop_rgb(0, *hx("#4a6a34"))
        g.add_color_stop_rgb(1, *hx("#2a3e1e"))
    ctx.set_source(g)
    ctx.rectangle(-1200, 660, 4400, 600)
    ctx.fill()
    if storm:
        rnd = random.Random(int(t * 2))
        if rnd.random() < 0.35 and (t * 2) % 1 < 0.2:
            ctx.set_source_rgba(0.9, 0.92, 1, 0.35)
            ctx.paint()
            ctx.new_path()
            x = rnd.uniform(200, 1700)
            ctx.move_to(x, -50)
            for k in range(8):
                ctx.line_to(x + rnd.uniform(-60, 60), k * 70)
            ctx.set_line_width(5)
            ctx.set_source_rgba(1, 1, 1, 0.9)
            ctx.stroke()
    if snow:
        snowfall(ctx, t, 0.85)


def bg_phoenix(ctx, t):
    C.sky(ctx, hx("#f0a050"), hx("#f8d890"), 760)
    ell(ctx, 1500, 360, 110, 110)
    ctx.set_source_rgb(1, 0.95, 0.75)
    ctx.fill()
    for i, x in enumerate((100, 600, 1150, 1700)):
        ctx.new_path()
        ctx.move_to(x - 400, 760)
        ctx.curve_to(x - 200, 560 - (i % 2) * 60, x + 200, 560, x + 400, 760)
        src(ctx, hx("#c8784a"))
        ctx.fill()
    ctx.rectangle(-800, 760, 3600, 400)
    src(ctx, hx("#d8a868"))
    ctx.fill()
    for x in (300, 1650):  # saguaro
        rrect(ctx, x - 30, 520, 60, 340, 30)
        C.fs(ctx, hx("#4a7a3a"), 5)
        for sx, hy in ((-1, 640), (1, 600)):
            rrect(ctx, x + sx * 30 - (60 if sx < 0 else 0), hy, 60, 30, 14)
            C.fs(ctx, hx("#4a7a3a"), 5)
            rrect(ctx, x + sx * 75 - 15, hy - 110, 30, 140, 15)
            C.fs(ctx, hx("#4a7a3a"), 5)


def bg_studio(ctx, t, dark=0.0):
    C.sky(ctx, hx("#5a4a5a"), hx("#3a2e3a"))
    for i in range(5):  # mirrors
        x = 120 + i * 360
        ctx.rectangle(x, 160, 320, 520)
        C.fs(ctx, hx("#8a9aaa"), 5)
        g = cairo.LinearGradient(x, 160, x + 320, 680)
        g.add_color_stop_rgba(0, 1, 1, 1, 0.25)
        g.add_color_stop_rgba(0.5, 1, 1, 1, 0.0)
        g.add_color_stop_rgba(1, 1, 1, 1, 0.15)
        ctx.set_source(g)
        ctx.rectangle(x, 160, 320, 520)
        ctx.fill()
    ctx.rectangle(-800, 560, 3600, 18)  # barre
    C.fs(ctx, hx("#c8a060"), 3)
    ctx.rectangle(-800, 760, 3600, 600)  # wood floor
    src(ctx, hx("#a06a3a"))
    ctx.fill()
    ctx.set_line_width(2)
    ctx.set_source_rgba(0, 0, 0, 0.2)
    for i in range(-20, 40):
        ctx.move_to(960 + i * 60, 760)
        ctx.line_to(960 + i * 160, 1100)
        ctx.stroke()
    if dark > 0:
        ctx.set_source_rgba(0, 0, 0.05, 0.55 * dark)
        ctx.paint()


def bg_prom(ctx, t):
    C.sky(ctx, hx("#0e1430"), hx("#2a2a50"), 800)
    C.stars(ctx, t, ymax=500, seed=7)
    ctx.rectangle(-800, 200, 3600, 30)  # balcony
    C.fs(ctx, hx("#3a3040"), 4)
    for i in range(-10, 40):
        ctx.rectangle(i * 60, 230, 10, 70)
        src(ctx, hx("#3a3040"))
        ctx.fill()
    ctx.rectangle(-800, 300, 3600, 16)
    C.fs(ctx, hx("#3a3040"), 3)
    ctx.new_path()  # gazebo
    ctx.move_to(560, 560)
    ctx.line_to(960, 380)
    ctx.line_to(1360, 560)
    ctx.close_path()
    C.fs(ctx, hx("#f0ece4"), 5)
    for x in (600, 960, 1320):
        ctx.rectangle(x - 14, 560, 28, 360)
        C.fs(ctx, hx("#f0ece4"), 4)
    for i in range(40):  # fairy lights
        f = i / 39
        x = lerp(0, 1920, f)
        y = 420 + 60 * math.sin(f * PI * 4)
        g = 0.6 + 0.4 * math.sin(t * 3 + i)
        ell(ctx, x, y, 7, 7)
        ctx.set_source_rgba(1, 0.9, 0.6, g)
        ctx.fill()
    ctx.rectangle(-800, 900, 3600, 400)
    src(ctx, hx("#2a2234"))
    ctx.fill()


def bg_house(ctx, t, party=False, red=0.0):
    """The Cullens' glass house interior."""
    C.sky(ctx, C.mix(hx("#e8e4dc"), hx("#6a1a1a"), red), C.mix(hx("#c8c0b4"), hx("#3a0a0a"), red))
    for i in range(4):  # floor-to-ceiling windows onto the forest
        x = 160 + i * 430
        ctx.rectangle(x, 120, 380, 640)
        C.fs(ctx, C.mix(hx("#9ab0a0"), hx("#3a1010"), red), 6)
        C.treeline(ctx, 760, 160, 380, C.mix(hx("#3a5a3a"), hx("#2a0a0a"), red), 20 + i, x0=x, x1=x + 380)
        ctx.rectangle(x, 120, 380, 640)
        ctx.set_line_width(8)
        src(ctx, hx("#e8e8e8"))
        ctx.stroke()
    ctx.rectangle(-800, 760, 3600, 600)
    src(ctx, C.mix(hx("#c8b8a0"), hx("#3a1a14"), red))
    ctx.fill()
    if party:
        rrect(ctx, 1260, 690, 380, 30, 8)  # table
        C.fs(ctx, hx("#e8e8e8"), 4)
        rrect(ctx, 1330, 600, 140, 90, 10)  # cake
        C.fs(ctx, hx("#f4d8e0"), 4)
        for i in range(5):
            ctx.rectangle(1345 + i * 25, 570, 6, 30)
            C.fs(ctx, hx("#f0f0f0"), 2)
            ell(ctx, 1348 + i * 25, 562, 5, 8 + 2 * math.sin(t * 10 + i))
            ctx.set_source_rgb(1, 0.8, 0.3)
            ctx.fill()
        for i, col in enumerate((hx("#c03040"), hx("#3060c0"), hx("#40a060"))):  # presents
            ctx.rectangle(1500 + i * 45, 640 - i * 10, 40, 50 + i * 10)
            C.fs(ctx, col, 3)
        for i in range(12):  # flowers & candles around the room
            x = 120 + i * 160
            ell(ctx, x, 740, 16, 16)
            ctx.set_source_rgba(1, 0.85, 0.5, 0.7 + 0.3 * math.sin(t * 5 + i))
            ctx.fill()


def bg_window_seasons(ctx, t, k):
    """Bella's bedroom window; the view outside cycles through the seasons (k: 0..1)."""
    C.sky(ctx, hx("#4a4058"), hx("#2a2434"))
    ctx.rectangle(560, 140, 800, 620)
    C.fs(ctx, hx("#f0ece4"), 10)
    seasons = [(hx("#c86a2a"), hx("#9ab0c0")), (hx("#8a5a3a"), hx("#8090a0")), (hx("#e8eef4"), hx("#b8c4d0")),
               (hx("#5a8a4a"), hx("#a8c0d0"))]
    idx = min(3, int(k * 4))
    f = (k * 4) % 1
    a_col, sky_col = seasons[idx]
    ctx.save()
    ctx.rectangle(570, 150, 780, 600)
    ctx.clip()
    C.sky(ctx, sky_col, C.mix(sky_col, (1, 1, 1), 0.3))
    C.treeline(ctx, 760, 200, 420, a_col, 51, x0=500, x1=1400)
    if idx == 2:
        snowfall(ctx, t, 0.9)
    else:
        rnd = random.Random(int(t * 3))
        for i in range(10):
            ell(ctx, rnd.uniform(570, 1350), (t * 160 + i * 70) % 600 + 150, 8, 5)
            src(ctx, a_col)
            ctx.fill()
    ctx.restore()
    ctx.move_to(960, 140)
    ctx.line_to(960, 760)
    ctx.move_to(560, 450)
    ctx.line_to(1360, 450)
    ctx.set_line_width(10)
    src(ctx, hx("#f0ece4"))
    ctx.stroke()
    ctx.rectangle(-800, 860, 3600, 400)
    src(ctx, hx("#3a2a24"))
    ctx.fill()
    return ["OCTOBER", "NOVEMBER", "DECEMBER", "JANUARY"][idx], f


def bg_garage(ctx, t):
    C.sky(ctx, hx("#6a5a4a"), hx("#3a3028"))
    for i in range(-6, 30):
        ctx.rectangle(i * 110, -300, 6, 1200)
        ctx.set_source_rgba(0, 0, 0, 0.18)
        ctx.fill()
    ctx.rectangle(1300, 160, 420, 260)
    C.fs(ctx, hx("#9ab0a0"), 6)
    ctx.rectangle(-800, 860, 3600, 400)
    src(ctx, hx("#4a4440"))
    ctx.fill()
    for i in range(6):  # tools on the wall
        ctx.rectangle(220 + i * 70, 260, 14, 120)
        C.fs(ctx, hx("#8a8a8a"), 2)
    g = cairo.RadialGradient(960, 200, 30, 960, 400, 900)
    g.add_color_stop_rgba(0, 1, 0.85, 0.55, 0.25)
    g.add_color_stop_rgba(1, 1, 0.85, 0.55, 0)
    ctx.set_source(g)
    ctx.paint()


def motorcycle(ctx, x, y, s, color):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    for wx in (-150, 150):
        ell(ctx, wx, -70, 70, 70)
        C.fs(ctx, hx("#141414"), 6)
        ell(ctx, wx, -70, 32, 32)
        C.fs(ctx, hx("#8a8a8a"), 3)
    ctx.new_path()
    ctx.move_to(-150, -70)
    ctx.line_to(-40, -180)
    ctx.line_to(90, -180)
    ctx.line_to(150, -70)
    ctx.set_line_width(14)
    src(ctx, INK)
    ctx.stroke()
    rrect(ctx, -70, -230, 150, 70, 30)
    C.fs(ctx, color, 5)
    ctx.move_to(100, -190)
    ctx.line_to(130, -260)
    ctx.line_to(170, -260)
    ctx.set_line_width(8)
    ctx.stroke()
    ctx.restore()


def bg_cliff(ctx, t):
    C.sky(ctx, hx("#4a5260"), hx("#8a96a4"), 640)
    g = cairo.LinearGradient(0, 640, 0, 1080)
    g.add_color_stop_rgb(0, *hx("#3a5a6a"))
    g.add_color_stop_rgb(1, *hx("#142a34"))
    ctx.set_source(g)
    ctx.rectangle(-1200, 640, 4400, 600)
    ctx.fill()
    ctx.set_line_width(4)
    for i in range(30):  # waves
        y = 660 + i * 16
        ctx.new_path()
        for x in range(-200, 2200, 40):
            ctx.line_to(x, y + 8 * math.sin(x * 0.02 + t * 2 + i))
        ctx.set_source_rgba(1, 1, 1, 0.15)
        ctx.stroke()
    ctx.new_path()  # cliff
    ctx.move_to(-800, 1200)
    ctx.line_to(-800, 470)
    ctx.line_to(500, 470)
    ctx.curve_to(620, 490, 640, 600, 600, 760)
    ctx.line_to(700, 1200)
    ctx.close_path()
    C.fs(ctx, hx("#3a342e"), 6)
    C.treeline(ctx, 475, 100, 200, hx("#1e2a1e"), 61, x0=-600, x1=420)


def bg_throne(ctx, t):
    C.sky(ctx, hx("#4a3a30"), hx("#1e1612"))
    for i in range(-4, 24):  # stone blocks
        for j in range(12):
            ctx.rectangle(i * 140 + (j % 2) * 70, j * 80, 136, 76)
    ctx.set_source_rgba(0, 0, 0, 0.18)
    ctx.fill()
    ell(ctx, 960, 120, 220, 220)  # round window light
    ctx.set_source_rgba(1, 0.9, 0.7, 0.35)
    ctx.fill()
    g = cairo.LinearGradient(960, 120, 960, 1000)
    g.add_color_stop_rgba(0, 1, 0.9, 0.7, 0.3)
    g.add_color_stop_rgba(1, 1, 0.9, 0.7, 0)
    ctx.set_source(g)
    ctx.move_to(800, 120)
    ctx.line_to(1120, 120)
    ctx.line_to(1300, 1000)
    ctx.line_to(620, 1000)
    ctx.close_path()
    ctx.fill()
    ctx.rectangle(-800, 880, 3600, 400)
    src(ctx, hx("#3a2e26"))
    ctx.fill()
    for x in (660, 960, 1260):  # thrones
        rrect(ctx, x - 110, 380, 220, 500, 30)
        C.fs(ctx, hx("#5a4636"), 6)
        rrect(ctx, x - 80, 410, 160, 300, 24)
        C.fs(ctx, hx("#7a1a1a"), 4)


def thrones_front(ctx):
    for x in (660, 960, 1260):
        for sx in (-1, 1):
            rrect(ctx, x + sx * 100 - 25, 690, 50, 190, 14)
            C.fs(ctx, hx("#5a4636"), 5)


def bg_volterra(ctx, t, noon=1.0):
    C.sky(ctx, hx("#6ab0e8"), hx("#e8f4f8"), 700)
    for i, (x, w, h, col) in enumerate(((-100, 420, 420, "#d8a878"), (300, 360, 520, "#c89060"), (1360, 380, 480, "#d0a070"),
                                        (1720, 400, 380, "#c08858"))):
        ctx.rectangle(x, 860 - h, w, h)
        C.fs(ctx, hx(col), 5)
        for k in range(3):
            for j in range(int(h / 130)):
                ctx.rectangle(x + 40 + k * (w - 80) / 3, 860 - h + 50 + j * 130, 50, 80)
                C.fs(ctx, hx("#4a3a2a"), 3)
        ctx.new_path()
        ctx.move_to(x - 10, 860 - h)
        ctx.line_to(x + w / 2, 860 - h - 50)
        ctx.line_to(x + w + 10, 860 - h)
        ctx.close_path()
        C.fs(ctx, hx("#a04a2a"), 4)
    ctx.rectangle(820, 120, 280, 740)  # clock tower
    C.fs(ctx, hx("#d8b088"), 6)
    ell(ctx, 960, 300, 90, 90)
    C.fs(ctx, hx("#f4ecd8"), 5)
    for k in range(12):
        a = k * PI / 6
        ctx.move_to(960 + 70 * math.cos(a), 300 + 70 * math.sin(a))
        ctx.line_to(960 + 80 * math.cos(a), 300 + 80 * math.sin(a))
    ctx.set_line_width(4)
    src(ctx, INK)
    ctx.stroke()
    mh = -PI / 2 - (1 - noon) * 0.5
    ctx.move_to(960, 300)
    ctx.line_to(960 + 66 * math.cos(mh), 300 + 66 * math.sin(mh))
    ctx.move_to(960, 300)
    ctx.line_to(960, 255)
    ctx.set_line_width(7)
    ctx.stroke()
    ctx.rectangle(-800, 860, 3600, 400)  # plaza stones
    src(ctx, hx("#c8b090"))
    ctx.fill()
    ctx.set_source_rgba(0, 0, 0, 0.12)
    for i in range(-10, 40):
        ctx.rectangle(i * 70, 880 + (i % 3) * 40, 66, 36)
    ctx.fill()
    ell(ctx, 960, 960, 220, 50)  # fountain
    C.fs(ctx, hx("#a8a090"), 5)
    ell(ctx, 960, 950, 190, 34)
    C.fs(ctx, hx("#6ab0d8"), 3)


def crowd(ctx, t, n=14, y=900, col=hx("#a01a1a"), seed=3):
    rnd = random.Random(seed)
    for i in range(n):
        x = rnd.uniform(-100, 2000)
        s = rnd.uniform(0.45, 0.6)
        ctx.save()
        ctx.translate(x + 10 * math.sin(t + i), y)
        ctx.scale(s, s)
        rrect(ctx, -70, -420, 140, 420, 60)
        C.fs(ctx, col, 5)
        ell(ctx, 0, -460, 56, 60)
        C.fs(ctx, C.mix(col, (0, 0, 0), 0.25), 5)
        ctx.restore()


def bg_city(ctx, t):
    C.sky(ctx, hx("#0a0e1e"), hx("#2a2440"), 700)
    rnd = random.Random(9)
    x = -300
    while x < 2300:
        w = rnd.uniform(120, 260)
        h = rnd.uniform(250, 650)
        ctx.rectangle(x, 860 - h, w, h)
        src(ctx, hx("#141826"))
        ctx.fill()
        for i in range(int(w / 40)):
            for j in range(int(h / 50)):
                if rnd.random() < 0.35:
                    ctx.rectangle(x + 12 + i * 40, 860 - h + 20 + j * 50, 18, 24)
                    ctx.set_source_rgba(1, 0.85, 0.5, 0.7)
                    ctx.fill()
        x += w + 10
    ctx.rectangle(1500, 160, 20, 700)  # space needle-style tower (generic)
    src(ctx, hx("#1e2236"))
    ctx.fill()
    ell(ctx, 1510, 200, 110, 26)
    C.fs(ctx, hx("#2a3050"), 4)
    ctx.rectangle(-800, 860, 3600, 400)
    src(ctx, hx("#1a1a20"))
    ctx.fill()
    ctx.set_source_rgba(0.9, 0.2, 0.2, 0.06 + 0.04 * math.sin(t * 6))
    ctx.paint()


def bg_mountain(ctx, t):
    C.sky(ctx, hx("#8a9ab0"), hx("#dde6ee"), 600)
    for x, h in ((300, 420), (900, 520), (1600, 460)):
        ctx.new_path()
        ctx.move_to(x - 600, 700)
        ctx.line_to(x, 700 - h)
        ctx.line_to(x + 600, 700)
        ctx.close_path()
        src(ctx, hx("#f0f4f8"))
        ctx.fill_preserve()
        ctx.set_line_width(4)
        src(ctx, hx("#a8b4c4"))
        ctx.stroke()
    C.treeline(ctx, 760, 140, 280, hx("#3a4a4a"), 71)
    ctx.rectangle(-800, 760, 3600, 500)
    src(ctx, hx("#eef2f6"))
    ctx.fill()
    snowfall(ctx, t, 0.9, 160)


def tent(ctx, x, y, t):
    ctx.new_path()
    ctx.move_to(x - 330, y)
    ctx.line_to(x, y - 380 + 6 * math.sin(t * 4))
    ctx.line_to(x + 330, y)
    ctx.close_path()
    C.fs(ctx, hx("#c86a2a"), 6)
    ctx.new_path()
    ctx.move_to(x - 70, y)
    ctx.line_to(x, y - 300)
    ctx.line_to(x + 70, y)
    ctx.close_path()
    C.fs(ctx, hx("#3a1e10"), 4)


def bg_meadow(ctx, t, sun=1.0):
    C.sky(ctx, C.mix(hx("#7a8aa0"), hx("#7ab8ec"), sun), C.mix(hx("#c8ccd0"), hx("#f0f8f0"), sun), 640)
    C.treeline(ctx, 640, 180, 330, hx("#2a4a2a"), 81)
    g = cairo.LinearGradient(0, 640, 0, 1080)
    g.add_color_stop_rgb(0, *hx("#6a9a3a"))
    g.add_color_stop_rgb(1, *hx("#3a6a24"))
    ctx.set_source(g)
    ctx.rectangle(-1200, 640, 4400, 600)
    ctx.fill()
    rnd = random.Random(5)
    for i in range(220):  # wildflowers
        x = rnd.uniform(-300, 2200)
        y = rnd.uniform(660, 1080)
        r = 4 + (y - 640) / 60
        ell(ctx, x + 2 * math.sin(t * 2 + i), y, r, r)
        src(ctx, rnd.choice([hx("#f2f2f2"), hx("#e8d040"), hx("#c890e0"), hx("#f0a0c0")]))
        ctx.fill()
    if sun > 0:
        g = cairo.RadialGradient(1500, 100, 30, 1500, 100, 900)
        g.add_color_stop_rgba(0, 1, 0.98, 0.85, 0.45 * sun)
        g.add_color_stop_rgba(1, 1, 0.98, 0.85, 0)
        ctx.set_source(g)
        ctx.paint()


def bg_wedding(ctx, t):
    bg_forest(ctx, t, rain_a=0, light=0.6)
    ctx.new_path()  # flower arch
    ctx.arc(960, 620, 360, PI, 2 * PI)
    ctx.set_line_width(40)
    src(ctx, hx("#f4f0e8"))
    ctx.stroke()
    rnd = random.Random(2)
    for i in range(60):
        a = PI + rnd.random() * PI
        x, y = 960 + 360 * math.cos(a), 620 + 360 * math.sin(a)
        ell(ctx, x + rnd.uniform(-20, 20), y + rnd.uniform(-20, 20), 16, 16)
        src(ctx, rnd.choice([hx("#ffffff"), hx("#f4e0e8"), hx("#e8f0e0")]))
        ctx.fill()
    for x in (600, 1320):
        ctx.rectangle(x - 18, 620, 36, 400)
        C.fs(ctx, hx("#f4f0e8"), 4)
    for i in range(30):  # falling petals
        ph = (t * 0.2 + i / 30) % 1
        x = (i * 97 + math.sin(t + i) * 40) % 1920
        ell(ctx, x, ph * 1080, 7, 4)
        ctx.set_source_rgba(1, 0.92, 0.95, 0.9)
        ctx.fill()


def bg_island(ctx, t):
    C.sky(ctx, hx("#0e1a3a"), hx("#3a4a7a"), 640)
    C.stars(ctx, t, ymax=500, seed=12)
    C.moon(ctx, 1450, 220, 60)
    C.water(ctx, t, 640, 1450, top=hx("#1e3a5a"), bottom=hx("#0a1626"))
    ctx.new_path()
    ctx.move_to(-800, 1200)
    ctx.line_to(-800, 860)
    ctx.curve_to(400, 820, 1200, 860, 2800, 900)
    ctx.line_to(2800, 1200)
    ctx.close_path()
    src(ctx, hx("#e8d4a8"))
    ctx.fill()
    for x, lean in ((260, -0.2), (1700, 0.15)):  # palm trees
        ctx.save()
        ctx.translate(x, 900)
        ctx.rotate(lean)
        rrect(ctx, -18, -520, 36, 520, 16)
        C.fs(ctx, hx("#6a4a2a"), 4)
        for k in range(6):
            ctx.save()
            ctx.translate(0, -520)
            ctx.rotate(k * PI / 3 + 0.05 * math.sin(t + k))
            ell(ctx, 120, 0, 130, 26)
            C.fs(ctx, hx("#2a6a3a"), 4)
            ctx.restore()
        ctx.restore()
    ctx.rectangle(900, 600, 420, 220)  # villa
    C.fs(ctx, hx("#f0ece4"), 5)
    for i in range(3):
        ctx.rectangle(940 + i * 130, 650, 90, 100)
        C.fs(ctx, hx("#f2c45a"), 3)


def bg_jungle(ctx, t):
    C.sky(ctx, hx("#3a6a3a"), hx("#1a3a1a"))
    rnd = random.Random(22)
    for i in range(60):
        x = rnd.uniform(-200, 2100)
        y = rnd.uniform(0, 900)
        ell(ctx, x, y, rnd.uniform(60, 140), rnd.uniform(30, 60))
        src(ctx, rnd.choice([hx("#2a5a2a"), hx("#3a7a3a"), hx("#1e4a1e")]))
        ctx.fill()
    ctx.rectangle(-800, 900, 3600, 400)
    src(ctx, hx("#2a3a1a"))
    ctx.fill()


def baby(ctx, x, y, s, t):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ell(ctx, 0, 0, 70, 42)
    C.fs(ctx, hx("#f4f0f4"), 4)
    ell(ctx, -46, -6, 30, 30)
    C.fs(ctx, hx("#f4dcc8"), 4)
    ell(ctx, -50, -24, 26, 14)
    C.fs(ctx, hx("#a0603a"), 3)
    ctx.restore()


def ring(ctx, x, y, s, t):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ell(ctx, 0, 0, 30, 30)
    ctx.set_line_width(10)
    ctx.set_source_rgb(0.85, 0.7, 0.3)
    ctx.stroke()
    ell(ctx, 0, -36, 14, 12)
    ctx.set_source_rgb(0.9, 0.95, 1)
    ctx.fill()
    ctx.restore()
    sparkle(ctx, x, y - 50 * s, y - 20 * s, 60 * s, t, 1, 6, seed=5)


def phone(ctx, x, y, t, k=1.0):
    rrect(ctx, x - 22, y - 40, 44, 80, 8)
    C.fs(ctx, hx("#2a2a30"), 3)
    for i in range(3):
        r = 40 + i * 30 + (t * 60) % 30
        ctx.new_path()
        ctx.arc(x, y, r, -PI * 0.8, -PI * 0.2)
        ctx.set_line_width(4)
        ctx.set_source_rgba(1, 1, 1, 0.6 * k * (1 - i / 3))
        ctx.stroke()


def tv_video(ctx, x, y, s, t):
    """Old TV playing a home video of little Bella and her mom."""
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    rrect(ctx, -200, -170, 400, 300, 20)
    C.fs(ctx, hx("#3a3a3e"), 6)
    ctx.save()
    rrect(ctx, -170, -140, 340, 230, 16)
    ctx.clip()
    C.sky(ctx, hx("#d8e0c8"), hx("#a8b898"))
    TW["mom"].draw(ctx, -60, 80, 0.26, t=t, expr="happy", armR=60)
    TW["kid_bella"].draw(ctx, 60, 80, 0.3, t=t, expr="happy", armL=120 + 20 * math.sin(t * 4), armR=120)
    ctx.set_source_rgba(0, 0, 0, 0.12)
    for k in range(-140, 100, 6):
        ctx.rectangle(-170, k, 340, 2)
    ctx.fill()
    ctx.restore()
    ell(ctx, -150, -120, 8, 8)
    ctx.set_source_rgba(1, 0.2, 0.2, 0.5 + 0.5 * math.sin(t * 6))
    ctx.fill()
    ctx.restore()


def throne_room(ctx, t, guards=True, extra=None):
    bg_throne(ctx, t)
    TW["marcus"].draw(ctx, 660, 880, 0.75, t=t, expr="cold", sit=True)
    TW["aro"].draw(ctx, 960, 880, 0.75, t=t, expr="happy", sit=True, look=0.3)
    TW["caius"].draw(ctx, 1260, 880, 0.75, t=t, expr="angry", sit=True, look=-0.3)
    thrones_front(ctx)
    if guards:
        TW["jane"].draw(ctx, 1500, 1000, 0.8, t=t, expr="cold", look=-0.5)
        TW["guard"].draw(ctx, 400, 1000, 0.85, t=t, expr="cold", look=0.5)


# ------------------------------------------------------------------ comparison template
def compare(ctx, R, t, p, header, items, mini):
    """Book vs film split screen. items: [(cue, book_text|None, film_text, mini_key)]."""
    W, H, u = R.W, R.H, R.u
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgb(0, *hx("#2a1424"))
    g.add_color_stop_rgb(1, *hx("#0c0810"))
    ctx.set_source(g)
    ctx.paint()
    idx = 0
    for i, it in enumerate(items):
        if t >= p.cue(it[0]) - 0.3:
            idx = i
    cue, book, film, mk = items[idx]
    k = ap(t, p.cue(cue) - 0.3 if idx > 0 else 0, 0.4)
    text(ctx, header, W / 2, H * V(R, 0.08, 0.05), V(R, 54, 46) * u, BONE, "Liberation Serif", outline=4 * u)
    if R.vertical:
        bx, by, bw, bh = 60, H * 0.09, W - 120, H * 0.19
        fx, fy, fw, fh = 60, H * 0.31, W - 120, (W - 120) * 9 / 16
    else:
        bx, by, bw, bh = 70, 170, 800, 560
        fx, fy, fw, fh = 1000, 210, 850, 478
    # book page
    rrect(ctx, bx, by, bw, bh, 14)
    C.fs(ctx, hx("#efe4cc"), 5)
    ctx.set_source_rgba(0.5, 0.4, 0.3, 0.25)
    for j in range(1, 14):
        yy = by + 70 * u + j * (bh - 90 * u) / 14
        ctx.rectangle(bx + 40, yy, bw - 80, 2)
    ctx.fill()
    text(ctx, "THE BOOK", bx + bw / 2, by + 40 * u, 40 * u, hx("#6a1a2a"), outline=0)
    # film frame with sprocket holes
    rrect(ctx, fx - 30, fy - 50 * u, fw + 60, fh + 100 * u, 14)
    C.fs(ctx, hx("#141418"), 5)
    for j in range(int(fw / 50)):
        for yy in (fy - 34 * u, fy + fh + 18 * u):
            rrect(ctx, fx + j * 50 + 10, yy, 26, 16 * u, 4)
            ctx.set_source_rgb(0.85, 0.85, 0.85)
            ctx.fill()
    ctx.save()
    ctx.rectangle(fx, fy, fw, fh)
    ctx.clip()
    ctx.translate(fx, fy)
    ctx.scale(fw / 1920, fh / 1080)
    mini[mk](ctx, t)
    ctx.restore()
    text(ctx, "THE FILM", fx + fw / 2, fy - 72 * u if not R.vertical else fy - 72 * u, 40 * u, hx("#ffe14a"), outline=3 * u)
    ctx.push_group()
    size = V(R, 46, 44) * u
    tw_ = bw - 80
    if book:
        lines = wrap_lines(ctx, book, size, tw_)
        y0 = by + bh / 2 - (len(lines) - 1) * size * 0.65 + 20 * u
        for j, ln in enumerate(lines):
            text(ctx, ln, bx + bw / 2, y0 + j * size * 1.3, size, hx("#2a1a14"), "Liberation Serif", outline=0)
    else:
        text(ctx, "(not in the book)", bx + bw / 2, by + bh / 2, size * 0.8, hx("#8a7a6a"), "Liberation Serif", outline=0, italic=True)
    lines = wrap_lines(ctx, film, size * 0.9, fw)
    y0 = fy + fh + V(R, 90, 80) * u
    for j, ln in enumerate(lines):
        text(ctx, ln, fx + fw / 2, y0 + j * size * 1.15, size * 0.9, BONE, outline=4 * u)
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(k)
    text(ctx, f"{idx + 1} / {len(items)}", W - 60 * u, H * V(R, 0.08, 0.05), 30 * u, hx("#c8a0b0"), outline=0, anchor="r")


def wrap_lines(ctx, s, size, maxw):
    words, lines, cur = s.split(), [], ""
    for w in words:
        nxt = (cur + " " + w).strip()
        if C.text_width(ctx, nxt, size) > maxw and cur:
            lines.append(cur)
            cur = w
        else:
            cur = nxt
    lines.append(cur)
    return lines


# ------------------------------------------------------------------ mini scenes (stage space, no overlays)
def m_woods_reveal(ctx, t):
    bg_forest(ctx, t, rain_a=0.2)
    TW["edward"].draw(ctx, 1150, 1000, 0.9, t=t, facing=-1, expr="cold", look=-1)
    TW["bella"].draw(ctx, 760, 1000, 0.9, t=t, expr="shock", look=1)


def m_nomads(ctx, t):
    bg_forest(ctx, t, rain_a=0.15)
    for i, k in enumerate(("laurent", "james", "victoria")):
        TW[k].draw(ctx, lerp(2100, 700 + i * 300, min(1, t / 3)), 1000, 0.85, t=t + i, walk=t * 5 if t < 3 else None,
                   facing=-1, expr="cold", look=-1)


def m_prom_victoria(ctx, t):
    bg_prom(ctx, t)
    TW["victoria"].draw(ctx, 1500, 230, 0.4, t=t, expr="angry", look=-1)
    TW["edward_suit"].draw(ctx, 860, 1040, 0.75, t=t, armR=40, elbowR=40, expr="happy")
    TW["bella_prom"].draw(ctx, 1060, 1040, 0.75, t=t, facing=-1, armL=40, expr="happy")


def m_seasons(ctx, t):
    month, f = bg_window_seasons(ctx, t, (t / 3) % 1)
    TW["bella"].draw(ctx, 960, 1000, 0.95, t=t, sit=True, expr="sad", look=0)


def m_ghost(ctx, t):
    bg_forest(ctx, t, rain_a=0.2)
    motorcycle(ctx, 700, 1000, 1.0, hx("#c03030"))
    TW["bella"].draw(ctx, 700, 960, 0.85, t=t, expr="shock", sit=True, look=1)
    ctx.push_group()
    TW["edward"].draw(ctx, 1300, 1000, 0.9, t=t, facing=-1, expr="sad", look=-1)
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(0.4 + 0.15 * math.sin(t * 3))


def m_marry(ctx, t):
    bg_house(ctx, t)
    TW["edward"].draw(ctx, 1080, 1000, 0.9, t=t, facing=-1, expr="happy", look=-1, kneel=0.6, armR=60, elbowR=30)
    TW["bella"].draw(ctx, 800, 1000, 0.9, t=t, expr="shock", look=1)
    ring(ctx, 940, 640, 1.0, t)


def m_seattle(ctx, t):
    bg_city(ctx, t)
    TW["riley"].draw(ctx, lerp(500, 900, min(1, t / 3)), 1000, 0.85, t=t, walk=t * 7 if t < 3 else None, expr="scared", look=-1)
    TW["victoria"].draw(ctx, 1400, 1000, 0.85, t=t, facing=-1, expr="angry", look=-1)


def m_rosalie(ctx, t):
    bg_house(ctx, t)
    TW["rosalie"].draw(ctx, 960, 1000, 0.95, t=t, expr="sad", look=-0.5)


def m_meadow(ctx, t):
    bg_meadow(ctx, t, sun=0.3)
    TW["bella"].draw(ctx, 820, 1000, 0.9, t=t, expr="happy", look=1, armR=40, elbowR=40)
    TW["edward"].draw(ctx, 1100, 1000, 0.9, t=t, facing=-1, expr="happy", look=-1)


MINI = {"woods": m_woods_reveal, "nomads": m_nomads, "prom": m_prom_victoria, "seasons": m_seasons, "ghost": m_ghost,
        "marry": m_marry, "seattle": m_seattle, "rosalie": m_rosalie, "meadow": m_meadow}


# ====================================================================== LONG scenes
def stage_shot(bg, actors, fx=960, fy=540, zoom=1.0, vfx=None, after=None, before=None):
    """Return a shot fn drawing bg + actors [(key, x, y, s, kw-fn(lt)->dict)] under a camera."""
    def fn(ctx, R, lt):
        with cam(ctx, R, fx, fy, zoom if not callable(zoom) else zoom(lt), vfx=(vfx(lt) if callable(vfx) else (vfx or fx))):
            bg(ctx, lt)
            if before:
                before(ctx, lt)
            hands = {}
            for key, x, y, s, kw in actors:
                kk = kw(lt) if callable(kw) else dict(kw)
                xx = x(lt) if callable(x) else x
                if key.startswith("wolf:"):
                    wolf(ctx, xx, y, s, lt, WOLF_COLORS[key[5:]], **kk)
                else:
                    kk.setdefault("t", lt)
                    hands[key] = TW[key].draw(ctx, xx, y, s, **kk)
            if after:
                after(ctx, lt, hands)
        grade(ctx, R, strength=0.55)
    return fn


def L0(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 560, 1.0 + 0.04 * ease(t / 17), vfx=960):
        bg_forest(ctx, t, rain_a=0.25)
        wolf(ctx, 420, 1010, 0.6, t, WOLF_COLORS["jacob"])
        TW["bella"].draw(ctx, 960, 1010, 0.9, t=t, expr="neutral", look=0.3 * math.sin(t))
        TW["edward"].draw(ctx, 1380, 1010, 0.9, t=t, facing=-1, expr="cold", look=-1)
    grade(ctx, R, strength=0.75)
    a = ap(t, 0.3, 1.0)
    ctx.push_group()
    text(ctx, "THE TWILIGHT SAGA", W / 2, H * V(R, 0.16, 0.12), V(R, 120, 86) * u, BONE, "Liberation Serif", outline=7 * u)
    text(ctx, "EVERY BOOK EXPLAINED  ·  BOOK vs FILM", W / 2, H * V(R, 0.27, 0.18), V(R, 40, 34) * u, hx("#e0a0a8"), outline=4 * u)
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(a)
    ti = p.cue("breaking down every")
    for i, kind in enumerate(("twilight", "newmoon", "eclipse", "dawn")):
        k = ap(t, ti + i * 0.35, 0.4)
        if k > 0:
            moon_icon(ctx, W / 2 + (i - 1.5) * V(R, 170, 220) * u, H * V(R, 0.42, 0.29), 46 * u * k, kind)
    ts = p.cue("Full spoilers")
    if t > ts:
        badge(ctx, W / 2, H * V(R, 0.55, 0.36), "SPOILERS FOR ALL 4 BOOKS", 42 * u * (1 + 0.2 * max(0, 1 - (t - ts) / 0.25)))
    text(ctx, "Fan recap · not affiliated with Summit or Lionsgate", W - 24, 30 * u, 20 * u, (1, 1, 1, 0.7), outline=0,
         anchor="r", bold=False)


def L1(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_school, t_van, t_vamp, t_fam, t_scent = (p.cue("At school"), p.cue("Then he stops"), p.cue("Bella pieces"),
                                               p.cue("His family"), p.cue("And Bella's scent"))

    def forks(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(500, 1000, min(1, t / 8)))):
            bg_school(ctx, t)
            car(ctx, 380, 1000, 0.9, hx("#b0281e"), t, "truck")
            TW["bella"].draw(ctx, lerp(500, 1000, min(1, t / 8)), 1000, 0.85, t=t, walk=t * 5, expr="neutral", look=1)
            TW["charlie"].draw(ctx, 1500, 1000, 0.85, t=t, facing=-1, expr="happy", look=-1)
        grade(ctx, R, strength=0.55)
        lower_third(ctx, R, t, p.cue("Bella Swan"), "BELLA SWAN", "17, from Phoenix to Forks", 3.5)

    def school(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1300)):
            bg_school(ctx, t)
            car(ctx, 1500, 1000, 0.85, hx("#b8bcc4"), t, "sedan", facing=-1)
            TW["bella"].draw(ctx, 700, 1000, 0.85, t=t, expr="shock", look=1)
            TW["edward"].draw(ctx, 1300, 1000, 0.88, t=t, facing=-1, expr="angry", look=-1)
        grade(ctx, R, strength=0.55)
        lower_third(ctx, R, lt, 0.4, "EDWARD CULLEN", "acts like he can't stand her", 3.5)

    def van(ctx, R, lt):
        k = ap(lt, 0.2, 1.3)
        hit = ap(lt, 1.5, 0.2)
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_school(ctx, t)
            car(ctx, lerp(2300, 1400, k), 1000, 1.0, hx("#3a5a9a"), t, "van", facing=1, dent=hit)
            TW["bella"].draw(ctx, 820, 1000, 0.85, t=t, expr="scared", look=1, lean=-8 * k)
            TW["edward"].draw(ctx, lerp(500, 1050, ap(lt, 1.0, 0.3)), 1000, 0.88, t=t, expr="angry", look=1,
                              armR=lerp(10, 85, ap(lt, 1.0, 0.3)), elbowR=0)
        grade(ctx, R, strength=0.55)
        flash(ctx, R, lt, 1.5, 0.2)
        if lt > 1.5:
            text(ctx, "BARE HANDS!", W / 2, H * 0.2, 110 * u, hx("#ffe14a"), outline=8 * u)

    def reveal(ctx, R, lt):
        sun = ap(lt, 0.3, 1.2)
        with cam(ctx, R, 960, 520, 1.1, vfx=1160):
            bg_forest(ctx, t, rain_a=0, light=sun)
            TW["bella"].draw(ctx, 760, 1000, 0.9, t=t, expr="shock", look=1)
            TW["edward"].draw(ctx, 1160, 1000, 0.9, t=t, facing=-1, expr="sad", look=-1)
            sparkle(ctx, 1160, 1000 - 0.9 * 720, 1000 - 0.9 * 300, 180, t, sun)
        grade(ctx, R, strength=0.45)
        glow_title(ctx, "VAMPIRE", W / 2, H * V(R, 0.16, 0.14), 130 * u, t, color=hx("#ffe0e0"))

    def family(ctx, R, lt):
        keys = ["carlisle", "esme", "emmett", "rosalie", "alice", "jasper"]
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(300, 1650, min(1, lt / 5)))):
            bg_forest(ctx, t, rain_a=0.15)
            for i, k in enumerate(keys):
                a = ap(lt, i * 0.3, 0.4)
                if a > 0:
                    TW[k].draw(ctx, 260 + i * 280, 1000 + (1 - a) * 60, 0.8, t=t + i, expr="happy" if i != 3 else "cold")
        grade(ctx, R, strength=0.55)
        badge(ctx, W / 2, H * 0.12, "THE CULLENS: ANIMAL BLOOD ONLY", 42 * u, BONE, hx("#5a1a2a"))

    def scent_shot(ctx, R, lt):
        with cam(ctx, R, 960, 480, 1.25, vfx=1000):
            bg_forest(ctx, t, rain_a=0.2)
            h1 = TW["bella"].draw(ctx, 760, 1000, 0.9, t=t, expr="neutral", look=1)
            h2 = TW["edward"].draw(ctx, 1200, 1000, 0.9, t=t, facing=-1, expr="angry", look=-1, tilt=-6)
            scent(ctx, h1["head"][0] + 40, h1["head"][1] + 40, h2["head"][0] - 30, h2["head"][1] + 30, t, ap(lt, 0.2, 0.6))
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.12, "THE MOST TEMPTING SCENT", 44 * u, BONE, TW_RED)

    shots(ctx, R, t, [(0, forks), (t_school, school), (t_van - 0.2, van), (t_vamp, reveal), (t_fam, family), (t_scent, scent_shot)])
    chapter_card(ctx, R, t, 1)


def L2(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_nom, t_james, t_hide, t_call, t_lure, t_never = (p.cue("Three nomad"), p.cue("James, a tracker"), p.cue("The Cullens hide"),
                                                       p.cue("but James calls"), p.cue("lures her"), p.cue("Her mom was never"))

    def ball(ctx, R, lt):
        swing = ap(lt % 3, 1.0, 0.25)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 900)):
            bg_clearing(ctx, t, storm=True)
            TW["emmett"].draw(ctx, 900, 1000, 0.85, t=t, armR=lerp(150, 60, swing), elbowR=20, expr="happy")
            TW["alice"].draw(ctx, 1500, 1000, 0.8, t=t, facing=-1, armR=110, expr="happy")
            TW["bella"].draw(ctx, 400, 1000, 0.8, t=t, expr="happy", look=1)
            if swing > 0.5:
                ctx.move_to(950, 560)
                ctx.line_to(2000, 200)
                ctx.set_line_width(6)
                ctx.set_source_rgba(1, 1, 1, 0.7)
                ctx.stroke()
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.12, "VAMPIRE BASEBALL", 44 * u, BONE, hx("#2a3a5a"))

    def nomads(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(1500, 960, min(1, lt / 3)))):
            bg_clearing(ctx, t, storm=True)
            C.fog(ctx, t, 900, 200, 0.4, seed=4)
            for i, k in enumerate(("laurent", "james", "victoria")):
                x = lerp(2100 + i * 200, 700 + i * 320, min(1, lt / 3))
                TW[k].draw(ctx, x, 1000, 0.85, t=t + i, walk=lt * 5 if lt < 3 else None, facing=-1, expr="cold", look=-1)
        grade(ctx, R, strength=0.65)
        for i, n in enumerate(("LAURENT", "JAMES", "VICTORIA")):
            if lt > 3:
                x = (700 + i * 320) if not R.vertical else W / 2
                if R.vertical and i != 1:
                    continue
                text(ctx, n, x * (1 if R.vertical else W / 1920), H * 0.4, 34 * u, hx("#ff6a6a"), outline=3 * u)

    def tracker(ctx, R, lt):
        with cam(ctx, R, 960, 460, 1.5, vfx=1000):
            bg_clearing(ctx, t, storm=True)
            TW["james"].draw(ctx, 1000, 1000, 0.9, t=t, expr="manic", look=-0.6)
        grade(ctx, R, strength=0.75)
        badge(ctx, W / 2, H * 0.12, "JAMES: THE TRACKER", 46 * u, BONE, TW_RED)

    def phoenix(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            bg_phoenix(ctx, t)
            TW["alice"].draw(ctx, 600, 1000, 0.8, t=t, expr="neutral", look=1)
            h = TW["bella"].draw(ctx, 960, 1000, 0.85, t=t, expr="scared" if t > t_call else "sad", armR=60 if t > t_call else 8,
                                 elbowR=110 if t > t_call else 12)
            TW["jasper"].draw(ctx, 1320, 1000, 0.85, t=t, facing=-1, expr="neutral", look=-1)
            if t > t_call:
                phone(ctx, h["R"][0], h["R"][1] - 20, t)
        grade(ctx, R, strength=0.45)
        badge(ctx, W / 2, H * 0.12, "HIDING IN PHOENIX" if t < t_call else "A CALL... IN HER MOM'S VOICE", 42 * u, BONE, hx("#7a3a14"))

    def studio(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 760 if t < t_never else 1250)):
            bg_studio(ctx, t, dark=0.5)
            tv_video(ctx, 1250, 760, 1.0, t)
            TW["bella"].draw(ctx, lerp(300, 760, min(1, lt / 2.5)), 1000, 0.85, t=t, walk=lt * 4 if lt < 2.5 else None,
                             expr="scared" if t < t_never else "shock", look=1)
            if t > t_never:
                ctx.push_group()
                TW["james"].draw(ctx, 1650, 1000, 0.9, t=t, facing=-1, expr="manic", look=-1)
                ctx.pop_group_to_source()
                ctx.paint_with_alpha(ap(t, t_never + 0.5, 1.0))
        grade(ctx, R, strength=0.7)
        if t > t_never:
            badge(ctx, W / 2, H * 0.12, "IT WAS AN OLD HOME VIDEO", 44 * u, BONE, TW_RED)

    shots(ctx, R, t, [(0, ball), (t_nom, nomads), (t_james, tracker), (t_hide, phoenix), (t_lure, studio)])


def L3(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_arr, t_suck, t_prom, t_ref = p.cue("Edward and his family"), p.cue("Then Edward has to"), p.cue("The book ends"), p.cue("He refuses")

    def attack(ctx, R, lt):
        k = ap(lt, 0.3, 0.5)
        with cam(ctx, R, 960, 560, 1.05, vfx=960):
            bg_studio(ctx, t, dark=0.6)
            TW["bella"].draw(ctx, 820, 1000, 0.85, t=t, expr="scared", look=1, lean=-12 * k, kneel=0.5 * k)
            h = TW["james"].draw(ctx, lerp(1400, 1060, k), 1000, 0.9, t=t, facing=-1, expr="manic", look=-1, armR=lerp(10, 70, k))
            if lt > 1.2:
                ctx.set_source_rgba(1, 0.1, 0.1, 0.5 * (0.5 + 0.5 * math.sin(t * 8)))
                ell(ctx, 700, 840, 30, 30)
                ctx.fill()
            ctx.set_line_width(3)  # cracked mirror
            ctx.set_source_rgba(1, 1, 1, 0.6 * k)
            for i in range(8):
                a = i * PI / 4
                ctx.move_to(1300, 400)
                ctx.line_to(1300 + 160 * math.cos(a), 400 + 160 * math.sin(a))
            ctx.stroke()
        grade(ctx, R, strength=0.75)
        flash(ctx, R, lt, 0.8, 0.2, (1, 0.3, 0.3))

    def rescue(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1300)):
            bg_studio(ctx, t, dark=0.4)
            for i, k in enumerate(("emmett", "jasper", "alice", "carlisle")):
                TW[k].draw(ctx, 300 + i * 220, 1000, 0.8, t=t + i, expr="angry", look=1)
            g = cairo.RadialGradient(1450, 900, 20, 1450, 800, 400)
            g.add_color_stop_rgba(0, 0.8, 0.4, 1, 0.6)
            g.add_color_stop_rgba(1, 0.8, 0.4, 1, 0)
            ctx.set_source(g)
            ctx.paint()
            gm.smoke(ctx, 1450, 940, t, 1.0)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.12, "JAMES IS DESTROYED", 44 * u, BONE, hx("#4a2a6a"))

    def venom(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.2, vfx=960):
            bg_studio(ctx, t, dark=0.4)
            TW["bella"].draw(ctx, 860, 1000, 0.85, t=t, expr="sad", kneel=0.6, look=1, armR=60, elbowR=10, blink=1)
            TW["edward"].draw(ctx, 1080, 1000, 0.88, t=t, facing=-1, expr="angry", kneel=0.6, look=-1, armR=50, elbowR=40)
            fade = 1 - ap(lt, 2.5, 1.5)
            for i in range(6):
                ctx.move_to(1000, 760)
                ctx.line_to(1000 - 40 - i * 20, 760 + math.sin(i) * 40)
            ctx.set_line_width(4)
            ctx.set_source_rgba(0.9, 0.1, 0.2, 0.7 * fade)
            ctx.stroke()
        grade(ctx, R, strength=0.7)
        if lt > 2.5:
            badge(ctx, W / 2, H * 0.12, "...AND HE STOPS", 46 * u, BONE, hx("#2a5a3a"))

    def prom(ctx, R, lt):
        with cam(ctx, R, 960, 600, 1.0, vfx=960):
            bg_prom(ctx, t)
            sway = 10 * math.sin(t * 1.5)
            TW["edward_suit"].draw(ctx, 870 + sway, 1040, 0.85, t=t, armR=50, elbowR=40, expr="sad" if t > t_ref else "happy",
                                   tilt=(12 * math.sin(t * 6)) if t > t_ref else 0)
            TW["bella_prom"].draw(ctx, 1060 + sway, 1040, 0.85, t=t, facing=-1, armL=40, expr="happy" if t < t_ref else "sad")
        grade(ctx, R, strength=0.55)
        badge(ctx, W / 2, H * 0.12, "PROM: \"MAKE ME A VAMPIRE\"", 42 * u, BONE, hx("#2a2a5a"))
        if t > t_ref:
            text(ctx, "HE REFUSES.", W / 2, H * V(R, 0.3, 0.24), 100 * u, hx("#ff6a6a"), outline=7 * u)

    shots(ctx, R, t, [(0, attack), (t_arr, rescue), (t_suck, venom), (t_prom, prom)])


def L4(ctx, R, t, p):
    compare(ctx, R, t, p, "BOOK vs FILM: TWILIGHT (2008)",
            [("The famous", "Bella confronts him in his car", "\"Say it. Out loud.\" happens in the woods", "woods"),
             ("The movie shows", "Bella first meets the nomads at the game", "The nomads hunt people near Forks from the start", "nomads"),
             ("And the final shot", "Ends at prom", "Victoria watches the prom, planning revenge", "prom")], MINI)


def L5(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_jas, t_leave, t_months, t_jake, t_dis = (p.cue("and Jasper lunges"), p.cue("Terrified"), p.cue("She falls apart"),
                                               p.cue("Slowly"), p.cue("until Jacob"))

    def party(ctx, R, lt):
        lunge = ap(t, t_jas, 0.4)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1100)):
            bg_house(ctx, t, party=True, red=0.35 * lunge)
            TW["alice"].draw(ctx, 300, 1000, 0.8, t=t, expr="scared" if lunge else "happy", look=1)
            h = TW["bella"].draw(ctx, 900, 1000, 0.85, t=t, expr="shock" if t > p.cue("paper cut") else "happy", look=1,
                                 armR=50, elbowR=60)
            if t > p.cue("paper cut"):
                ell(ctx, h["R"][0], h["R"][1] - 10, 6, 9)
                ctx.set_source_rgb(0.85, 0.05, 0.1)
                ctx.fill()
            TW["jasper"].draw(ctx, lerp(1500, 1180, lunge), 1000, 0.85, t=t, facing=-1, expr="manic" if lunge else "neutral",
                              look=-1, lean=-14 * lunge, armR=lerp(10, 80, lunge))
            if lunge > 0:
                TW["edward"].draw(ctx, 1040, 1000, 0.88, t=t, facing=-1, expr="angry", armL=70, armR=70)
        grade(ctx, R, strength=0.5)
        if t < t_jas:
            badge(ctx, W / 2, H * 0.12, "HAPPY 18TH BIRTHDAY", 44 * u, BONE, hx("#7a3a5a"))

    def leave(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(900, 1400, min(1, lt / 5)))):
            bg_forest(ctx, t, rain_a=0.2)
            TW["bella"].draw(ctx, 760, 1000, 0.85, t=t, expr="sad", look=1, armR=70, elbowR=10, tears=True)
            TW["edward"].draw(ctx, lerp(1150, 2100, ap(lt, 1.5, 4)), 1000, 0.88, t=t, walk=t * 4 if lt > 1.5 else None,
                              facing=1 if lt > 1.5 else -1, expr="cold", look=-1)
        grade(ctx, R, strength=0.7)
        badge(ctx, W / 2, H * 0.12, "\"I DON'T WANT YOU\" (A LIE)", 42 * u, BONE, hx("#3a3a5a"))

    def months(ctx, R, lt):
        k = min(1, lt / 4.5)
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            month, f = bg_window_seasons(ctx, t, k)
            TW["bella"].draw(ctx, 960, 1000, 0.95, t=t, sit=True, expr="sad", look=0)
        grade(ctx, R, strength=0.6)
        text(ctx, month, W / 2, H * V(R, 0.12, 0.1), 80 * u, BONE, "Liberation Serif", outline=5 * u)

    def jacob(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            bg_garage(ctx, t)
            motorcycle(ctx, 960, 1000, 1.1, hx("#c03030"))
            TW["bella"].draw(ctx, 650, 1000, 0.85, t=t, expr="happy", look=1)
            TW["jacob_long"].draw(ctx, 1300, 1000, 0.88, t=t, facing=-1, expr="happy", look=-1, armR=60, elbowR=60)
        grade(ctx, R, strength=0.45)
        lower_third(ctx, R, lt, 0.4, "JACOB BLACK", "her best friend", 3.0)

    def gone(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            bg_garage(ctx, t)
            motorcycle(ctx, 960, 1000, 1.1, hx("#c03030"))
            TW["bella"].draw(ctx, 650, 1000, 0.85, t=t, expr="sad", look=1)
            ctx.push_group()
            TW["jacob_long"].draw(ctx, 1300, 1000, 0.88, t=t, facing=-1, expr="neutral", look=-1)
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(1 - ap(lt, 0.2, 1.5))
        grade(ctx, R, strength=0.55)

    shots(ctx, R, t, [(0, party), (t_leave, leave), (t_months, months), (t_jake, jacob), (t_dis, gone)])
    chapter_card(ctx, R, t, 2)


def L6(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_pack, t_vic, t_mean, t_cliff = p.cue("The Quileute"), p.cue("including Victoria"), p.cue("Meanwhile"), p.cue("So she goes")

    def transform(ctx, R, lt):
        k = ap(lt, 1.0, 0.6)
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_forest(ctx, t, rain_a=0.2)
            if k < 1:
                ctx.push_group()
                TW["jacob"].draw(ctx, 960, 1000, 0.9, t=t, expr="angry", lean=8 * math.sin(t * 20) * k)
                ctx.pop_group_to_source()
                ctx.paint_with_alpha(1 - k)
            if k > 0:
                wolf(ctx, 960, 1010, 0.8 * (0.6 + 0.4 * k), t, WOLF_COLORS["jacob"], alpha=k)
            if 0 < k < 1:
                ctx.set_line_width(6)
                ctx.set_source_rgba(1, 0.9, 0.6, 1 - k)
                for i in range(16):
                    a = i * PI / 8
                    ctx.move_to(960 + 120 * math.cos(a), 700 + 120 * math.sin(a))
                    ctx.line_to(960 + 320 * math.cos(a), 700 + 320 * math.sin(a))
                ctx.stroke()
        grade(ctx, R, strength=0.55)
        if lt > 1.2:
            glow_title(ctx, "WEREWOLF", W / 2, H * V(R, 0.16, 0.14), 130 * u, t, color=hx("#ffd8a0"))

    def pack(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(500, 1400, min(1, lt / 4)))):
            bg_forest(ctx, t, rain_a=0.2)
            for i, n in enumerate(("sam", "paul", "jacob", "embry")):
                wolf(ctx, lerp(-600 + i * 380, 300 + i * 420, min(1, lt / 3)), 1010 + (i % 2) * 20, 0.55, t + i,
                     WOLF_COLORS[n], walk=lt * 6 if lt < 3 else None)
        grade(ctx, R, strength=0.55)
        badge(ctx, W / 2, H * 0.12, "THE QUILEUTE PACK", 44 * u, BONE, hx("#5a3a1a"))

    def victoria(ctx, R, lt):
        with cam(ctx, R, 960, 470, 1.4, vfx=1000):
            bg_forest(ctx, t, rain_a=0.3)
            TW["victoria"].draw(ctx, 1000, 1000, 0.9, t=t, expr="angry", look=-0.5)
        grade(ctx, R, strength=0.75)
        badge(ctx, W / 2, H * 0.12, "VICTORIA WANTS REVENGE", 44 * u, BONE, TW_RED)

    def reckless(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1000)):
            m_ghost(ctx, t)
        grade(ctx, R, strength=0.55)
        badge(ctx, W / 2, H * 0.12, "DANGER = EDWARD'S VOICE", 44 * u, BONE, hx("#3a3a5a"))

    def cliff(ctx, R, lt):
        jump = ap(lt, 1.2, 0.2)
        fall = max(0, lt - 1.4)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 600)):
            bg_cliff(ctx, t)
            x = 480 + 220 * min(1, fall / 0.8)
            y = 470 + (fall ** 2) * 500
            if y < 760:
                TW["bella"].draw(ctx, x if jump else 450, min(y, 760), 0.6, t=t, expr="scared" if jump else "neutral",
                                 armL=150 if jump else 10, armR=150 if jump else 10, lean=10 * jump)
            elif y < 1000:
                for i in range(10):
                    a = -PI / 2 + (i - 4.5) * 0.25
                    ctx.move_to(700, 760)
                    ctx.line_to(700 + 160 * math.cos(a), 760 + 160 * math.sin(a))
                ctx.set_line_width(8)
                ctx.set_source_rgba(1, 1, 1, 0.8)
                ctx.stroke()
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.12, "CLIFF DIVING", 46 * u, BONE, hx("#2a4a5a"))

    shots(ctx, R, t, [(0, transform), (t_pack, pack), (t_vic, victoria), (t_mean, reckless), (t_cliff, cliff)])


def L7(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_volt, t_race, t_lied, t_cond, t_must = (p.cue("Heartbroken"), p.cue("Bella races"), p.cue("Edward admits"),
                                              p.cue("The Volturi let"), p.cue("Bella must"))

    def vision(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_house(ctx, t)
            TW["alice"].draw(ctx, V(R, 560, 960), 1000, 0.9, t=t, expr="shock", blink=0, look=1 if not R.vertical else 0)
        grade(ctx, R, strength=0.6)

        def fall_scene(c, tt):
            bg_cliff(c, tt + 3)
            TW["bella"].draw(c, 700, 720, 0.6, t=tt, armL=150, armR=150, expr="scared")
        ctx.push_group()
        sepia_bubble(ctx, W * V(R, 0.62, 0.5), H * V(R, 0.4, 0.2), V(R, 270, 200) * u, fall_scene, lt)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(ap(lt, 0.3, 0.5))
        badge(ctx, W * V(R, 0.62, 0.5), H * V(R, 0.72, 0.33), "ALICE'S VISION", 40 * u, BONE, hx("#4a2a6a"))

    def volturi(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            throne_room(ctx, t, guards=False)
            TW["edward"].draw(ctx, 960, 1060, 0.85, t=t, kneel=0.6, expr="sad", look=0)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.1, "THE VOLTURI", 46 * u, BONE, hx("#3a1010"))

    def race(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(400, 1300, min(1, lt / 5)))):
            bg_volterra(ctx, t, noon=min(1, lt / 5))
            crowd(ctx, t)
            TW["bella"].draw(ctx, lerp(200, 1300, min(1, lt / 5)), 1010, 0.8, t=t, walk=t * 9, expr="scared", look=1, lean=6)
        grade(ctx, R, strength=0.4)
        badge(ctx, W / 2, H * 0.1, "VOLTERRA, ITALY: NOON", 42 * u, BONE, hx("#a04a1a"))

    def lied(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.15, vfx=960):
            bg_volterra(ctx, t)
            ctx.set_source_rgba(0, 0, 0.05, 0.4)
            ctx.rectangle(-500, -500, 1700, 2000)
            ctx.fill()
            TW["edward"].draw(ctx, 1020, 1010, 0.88, t=t, facing=-1, expr="sad", look=-1, armR=60, elbowR=50, armL=60, elbowL=50)
            TW["bella"].draw(ctx, 900, 1010, 0.82, t=t, expr="sad", look=1, armR=60, elbowR=50, tears=True)
            sparkle(ctx, 1150, 400, 900, 120, t, 0.6)
        grade(ctx, R, strength=0.55)
        badge(ctx, W / 2, H * 0.1, "HE LEFT TO PROTECT HER", 44 * u, BONE, hx("#7a2a3a"))

    def condition(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            throne_room(ctx, t)
            TW["edward"].draw(ctx, 860, 1060, 0.8, t=t, expr="angry", look=0.5)
            TW["bella"].draw(ctx, 1060, 1060, 0.78, t=t, facing=-1, expr="scared", look=-0.5)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.1, "ON ONE CONDITION", 46 * u, BONE, hx("#3a1010"))
        if t > t_must:
            text(ctx, "BELLA MUST BE TURNED", W / 2, H * V(R, 0.3, 0.24), V(R, 84, 60) * u, hx("#ff5a5a"), outline=6 * u)

    shots(ctx, R, t, [(0, vision), (t_volt, volturi), (t_race, race), (t_lied, lied), (t_cond, condition)])


def L8(ctx, R, t, p):
    compare(ctx, R, t, p, "BOOK vs FILM: NEW MOON (2009)",
            [("The book uses", "Almost blank pages: OCTOBER... NOVEMBER...", "The camera spins around Bella as the seasons change", "seasons"),
             ("In the movie", "Bella hears Edward's voice", "She sees him, too", "ghost"),
             ("And it ends", None, "Cliffhanger: \"Marry me.\"", "marry")], MINI)


def L9(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_new, t_tri, t_team = p.cue("The cause"), p.cue("At the same time"), p.cue("When the danger")

    def seattle(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_city(ctx, t)
        grade(ctx, R, strength=0.6)
        ctx.save()
        k = max(0.01, ap(lt, 2.6, 0.5))  # a zero scale makes the cairo matrix non-invertible
        ctx.translate(W / 2, H * 0.4)
        ctx.rotate((1 - k) * 5 - 0.05)
        ctx.scale(k, k)
        rrect(ctx, -330 * u, -110 * u, 660 * u, 220 * u, 6)
        C.fs(ctx, hx("#efe6cf"), 4)
        text(ctx, "THE SEATTLE TIMES (FAN-MADE)", 0, -70 * u, 22 * u, INK, "Liberation Serif", outline=0)
        text(ctx, "KILLINGS CONTINUE", 0, -10 * u, 56 * u, INK, "Liberation Serif", outline=0)
        text(ctx, "police baffled", 0, 50 * u, 30 * u, INK, "Liberation Serif", outline=0, bold=False)
        ctx.restore()

    def newborns(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            bg_city(ctx, t)
            for i in range(7):
                newborn(i).draw(ctx, 200 + i * 260, 1000 + (i % 2) * 20, 0.75, t=t + i, expr="manic" if i % 2 else "angry",
                                walk=t * 3 + i, look=0)
        grade(ctx, R, strength=0.7)
        badge(ctx, W / 2, H * 0.1, "NEWBORN VAMPIRES", 46 * u, BONE, TW_RED)

    def triangle(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_forest(ctx, t, rain_a=0.2)
            TW["edward"].draw(ctx, 600, 1000, 0.9, t=t, expr="angry", look=1)
            TW["bella"].draw(ctx, 960, 1000, 0.85, t=t, expr="sad", look=math.sin(t * 1.5))
            TW["jacob"].draw(ctx, 1320, 1000, 0.92, t=t, facing=-1, expr="angry", look=-1)
        grade(ctx, R, strength=0.55)
        badge(ctx, W / 2, H * 0.1, "TEAM EDWARD vs TEAM JACOB", 42 * u, BONE, hx("#5a2a4a"))

    def team(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            bg_clearing(ctx, t)
            for i, k in enumerate(("carlisle", "emmett", "jasper", "alice")):
                TW[k].draw(ctx, 200 + i * 190, 1000, 0.72, t=t + i, expr="neutral", look=1)
            for i, n in enumerate(("sam", "jacob", "seth")):
                wolf(ctx, 1250 + i * 260, 1010, 0.45, t + i, WOLF_COLORS[n], facing=-1)
        grade(ctx, R, strength=0.5)
        badge(ctx, W / 2, H * 0.1, "VAMPIRES + WOLVES TEAM UP", 42 * u, BONE, hx("#2a4a3a"))

    shots(ctx, R, t, [(0, seattle), (t_new, newborns), (t_tri, triangle), (t_team, team)])
    chapter_card(ctx, R, t, 3)


def L10(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_riley, t_sent, t_target, t_second = p.cue("She turned"), p.cue("and sent him"), p.cue("all with one target"), p.cue("And there's a second")

    def built(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.2, vfx=960):
            bg_city(ctx, t)
            TW["victoria"].draw(ctx, 960, 1000, 0.95, t=t, expr="manic", look=0)
        grade(ctx, R, strength=0.7)
        glow_title(ctx, "VICTORIA'S ARMY", W / 2, H * V(R, 0.16, 0.14), V(R, 110, 80) * u, t, color=hx("#ff8a6a"))

    def riley(ctx, R, lt):
        turned = ap(lt, 2.0, 0.6)
        with cam(ctx, R, 960, 540, 1.05, vfx=V(R, 960, 1000)):
            bg_city(ctx, t)
            TW["victoria"].draw(ctx, 760, 1000, 0.85, t=t, expr="happy", look=1, armR=60, elbowR=40)
            TW["riley"].draw(ctx, 1150, 1000, 0.88, t=t, facing=-1, expr="scared" if turned < 0.5 else "happy", look=-1)
            for i in range(3):  # fake hearts
                ph = (t * 0.6 + i / 3) % 1
                x, y = 960 + 40 * math.sin(i + t), 500 - ph * 200
                ctx.save()
                ctx.translate(x, y)
                ctx.scale(1 + ph, 1 + ph)
                ctx.move_to(0, 10)
                ctx.curve_to(-30, -15, -15, -35, 0, -18)
                ctx.curve_to(15, -35, 30, -15, 0, 10)
                ctx.set_source_rgba(0.95, 0.3, 0.4, 0.8 * (1 - ph))
                ctx.fill()
                ctx.restore()
        grade(ctx, R, strength=0.6)
        lower_third(ctx, R, lt, 0.4, "RILEY", "thinks Victoria loves him", 3.5)

    def army(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            bg_city(ctx, t)
            TW["riley"].draw(ctx, 400, 1000, 0.85, t=t, expr="angry", look=1, armR=100, elbowR=10)
            for i in range(6):
                newborn(i + 10).draw(ctx, 700 + i * 220, 1000, 0.72, t=t + i, walk=t * 4 + i, expr="manic", look=-1, facing=-1)
        grade(ctx, R, strength=0.65)

    def target(ctx, R, lt):
        with cam(ctx, R, 960, 480, 1.3, vfx=960):
            bg_forest(ctx, t, rain_a=0.2)
            TW["bella"].draw(ctx, 960, 1000, 0.9, t=t, expr="scared", look=0)
        grade(ctx, R, strength=0.6)
        k = ap(lt, 0, 0.5)
        cx, cy = W / 2, H * V(R, 0.45, 0.4)
        r = (420 - 200 * k) * u
        ctx.set_line_width(6 * u)
        ctx.set_source_rgba(1, 0.2, 0.2, 0.85)
        ell(ctx, cx, cy, r, r)
        ctx.stroke()
        for a in range(4):
            ang = a * PI / 2
            ctx.move_to(cx + r * 0.7 * math.cos(ang), cy + r * 0.7 * math.sin(ang))
            ctx.line_to(cx + r * 1.2 * math.cos(ang), cy + r * 1.2 * math.sin(ang))
        ctx.stroke()
        text(ctx, "TARGET: BELLA", W / 2, H * 0.12, 70 * u, hx("#ff4a4a"), outline=6 * u)

    def waited(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            throne_room(ctx, t)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.1, "THE VOLTURI KNEW... AND WAITED", 42 * u, BONE, hx("#3a1010"))

    shots(ctx, R, t, [(0, built), (t_riley, riley), (t_sent, army), (t_target, target), (t_second, waited)])


def L11(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_mtn, t_volt, t_choice, t_jake = p.cue("On the mountain"), p.cue("When the Volturi"), p.cue("And in the end"), p.cue("and a heartbroken")

    def battle(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.03 * math.sin(t * 7), vfx=V(R, 960, 960 + 300 * math.sin(lt))):
            bg_clearing(ctx, t, snow=False)
            for i in range(5):
                x = 300 + i * 340 + 40 * math.sin(t * 3 + i)
                newborn(i + 20).draw(ctx, x, 1000, 0.65, t=t + i, expr="manic", lean=15 * math.sin(t * 5 + i), look=1,
                                     armL=90, armR=90)
            for i, n in enumerate(("sam", "jacob", "paul")):
                wolf(ctx, 200 + i * 600 + 120 * math.sin(t * 2 + i), 1040, 0.45, t, WOLF_COLORS[n], walk=t * 8, facing=1)
            TW["emmett"].draw(ctx, 1500, 1040, 0.75, t=t, expr="manic", armL=100, armR=100)
            for i in range(3):
                poof(ctx, 400 + i * 500, 700, t, ((lt + i * 0.7) % 2.1) / 1.5)
        grade(ctx, R, strength=0.55)
        badge(ctx, W / 2, H * 0.1, "THE BATTLE", 46 * u, BONE, TW_RED)

    def mountain(ctx, R, lt):
        k = ap(lt, 2.2, 0.3)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 900 if lt < 3 else 1500)):
            bg_mountain(ctx, t)
            tent(ctx, 300, 900, t)
            if k < 1:
                TW["victoria"].draw(ctx, lerp(1300, 1000, ap(lt, 0.5, 0.8)), 1000, 0.85, t=t, facing=-1, expr="manic",
                                    lean=-10, armR=80, look=-1)
            TW["edward"].draw(ctx, 760, 1000, 0.88, t=t, expr="angry", look=1, armR=60 + 30 * k, elbowR=10)
            poof(ctx, 1000, 700, t, ap(lt, 2.2, 1.4) * 1.3, (0.8, 0.5, 0.4))
            wolf(ctx, 1550, 1010, 0.45, t, WOLF_COLORS["seth"], facing=-1)
            TW["riley"].draw(ctx, 1800, 1000, 0.75, t=t, facing=-1, expr="scared", look=-1)
        grade(ctx, R, strength=0.5)
        if lt > 2.3:
            badge(ctx, W / 2, H * 0.1, "VICTORIA: DESTROYED", 44 * u, BONE, TW_RED)

    def bree(ctx, R, lt):
        k = ap(t, p.cue("they execute"), 0.2)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1000)):
            bg_clearing(ctx, t)
            for i, key in enumerate(("guard", "jane", "guard")):
                TW[key].draw(ctx, 1300 + i * 200, 1000, 0.8, t=t + i, facing=-1, expr="cold", look=-1)
            if k < 1:
                TW["bree"].draw(ctx, 950, 1000, 0.8, t=t, kneel=0.6, expr="scared", look=1)
            poof(ctx, 950, 760, t, ap(t, p.cue("they execute"), 1.4) * 1.3, (0.6, 0.5, 0.6))
            TW["carlisle"].draw(ctx, 500, 1000, 0.82, t=t, expr="sad", look=1)
        grade(ctx, R, strength=0.6)
        lower_third(ctx, R, lt, 0.3, "BREE TANNER", "a newborn who surrendered", 3.0)
        if k > 0:
            badge(ctx, W / 2, H * 0.1, "THE VOLTURI SHOW NO MERCY", 42 * u, BONE, hx("#3a1010"))

    def yes(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.1, vfx=960):
            bg_meadow(ctx, t, sun=0.5)
            TW["edward"].draw(ctx, 1080, 1000, 0.9, t=t, facing=-1, expr="happy", look=-1, kneel=0.6, armR=60, elbowR=30)
            TW["bella"].draw(ctx, 800, 1000, 0.9, t=t, expr="happy", look=1, armR=40, elbowR=60)
            ring(ctx, 940, 640, 1.1, t)
        grade(ctx, R, strength=0.4)
        badge(ctx, W / 2, H * 0.1, "SHE SAYS YES", 46 * u, BONE, hx("#7a3a5a"))

    def runs(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(700, 1600, min(1, lt / 4)))):
            bg_forest(ctx, t, rain_a=0.4)
            wolf(ctx, lerp(500, 2300, min(1, lt / 4)), 1010, 0.6, t, WOLF_COLORS["jacob"], walk=t * 9)
        grade(ctx, R, strength=0.7)
        badge(ctx, W / 2, H * 0.1, "JACOB RUNS AWAY", 44 * u, BONE, hx("#5a3a1a"))

    shots(ctx, R, t, [(0, battle), (t_mtn, mountain), (t_volt, bree), (t_choice, yes), (t_jake, runs)])


def L12(ctx, R, t, p):
    compare(ctx, R, t, p, "BOOK vs FILM: ECLIPSE (2010)",
            [("The book is told", "Only Bella's point of view: we just hear about the killings",
              "Opens in Seattle: Riley hunted by Victoria", "seattle"),
             ("It also cuts", "Rosalie tells her tragic story at a sleepover", "The sleepover is cut", "rosalie"),
             ("and it adds", None, "A new meadow speech: she's choosing who she really is", "meadow")], MINI)


def L13(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_isl, t_preg, t_grow, t_pov = p.cue("and honeymoon"), p.cue("Then, the impossible"), p.cue("The half-vampire"), p.cue("And for a whole")

    def wedding(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.02 * lt, vfx=960):
            bg_wedding(ctx, t)
            TW["edward_suit"].draw(ctx, 1080, 1000, 0.88, t=t, facing=-1, expr="happy", look=-1, armR=40, elbowR=40)
            TW["bella_bride"].draw(ctx, 860, 1000, 0.85, t=t, expr="happy", look=1, armL=40, elbowL=80)
        grade(ctx, R, strength=0.4)
        badge(ctx, W / 2, H * 0.1, "THE WEDDING", 46 * u, hx("#3a2a2a"), hx("#f4ead2"))

    def island(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1100)):
            bg_island(ctx, t)
            TW["bella"].draw(ctx, 1000, 1000, 0.7, t=t, expr="happy", look=1)
            TW["edward"].draw(ctx, 1200, 1000, 0.72, t=t, facing=-1, expr="happy", look=-1)
        grade(ctx, R, strength=0.5)
        badge(ctx, W / 2, H * 0.1, "A PRIVATE ISLAND", 44 * u, BONE, hx("#2a4a6a"))

    def pregnant(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.15, vfx=960):
            bg_island(ctx, t)
            h = TW["bella"].draw(ctx, 960, 1000, 0.9, t=t, expr="shock", look=0, armL=20, armR=20, elbowL=100, elbowR=100)
            g = cairo.RadialGradient(960, 760, 10, 960, 760, 120)
            g.add_color_stop_rgba(0, 1, 0.8, 0.85, 0.6)
            g.add_color_stop_rgba(1, 1, 0.8, 0.85, 0)
            ctx.set_source(g)
            ell(ctx, 960, 760, 120, 120)
            ctx.fill()
        grade(ctx, R, strength=0.5)
        text(ctx, "PREGNANT?!", W / 2, H * V(R, 0.16, 0.14), 120 * u, hx("#ffb0c0"), outline=8 * u)

    def danger(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 900)):
            bg_house(ctx, t)
            TW["bella_preg"].draw(ctx, 900, 1000, 0.85, t=t, sit=True, expr="sad", look=0.5)
            ell(ctx, 900, 805, 58, 46)  # bump
            C.fs(ctx, hx("#8a8a94"), 4)
            TW["rosalie"].draw(ctx, 1200, 1000, 0.85, t=t, facing=-1, expr="angry", look=-1)
            TW["edward"].draw(ctx, 560, 1000, 0.88, t=t, expr="sad", look=1)
            ctx.set_line_width(3)  # cracks
            ctx.set_source_rgba(1, 1, 1, 0.7 * (0.5 + 0.5 * math.sin(t * 6)))
            for i in range(5):
                ctx.move_to(900, 800)
                ctx.line_to(900 + 70 * math.cos(i * 1.3), 800 + 70 * math.sin(i * 1.3))
            ctx.stroke()
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.1, "THE BABY GROWS TOO FAST", 44 * u, BONE, TW_RED)

    def pov(ctx, R, lt):
        split = ap(lt, 1.0, 1.5)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(960, 1400, split))):
            bg_forest(ctx, t, rain_a=0.2)
            for i, n in enumerate(("sam", "paul", "embry")):
                wolf(ctx, 300 + i * 260, 1010 + (i % 2) * 20, 0.45, t + i, WOLF_COLORS[n])
            wolf(ctx, lerp(1100, 1500, split), 1010, 0.55, t, WOLF_COLORS["jacob"], walk=t * 5 if 0 < split < 1 else None,
                 facing=1)
        grade(ctx, R, strength=0.55)
        badge(ctx, W / 2, H * 0.1, "JACOB'S POINT OF VIEW", 44 * u, BONE, hx("#5a3a1a"))

    shots(ctx, R, t, [(0, wedding), (t_isl, island), (t_preg, pregnant), (t_grow, danger), (t_pov, pov)])
    chapter_card(ctx, R, t, 4)


def L14(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_vamp, t_twist, t_imprint, t_power = (p.cue("and Bella finally"), p.cue("Then comes"), p.cue("Jacob imprints"),
                                           p.cue("And Bella discovers"))

    def birth(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.05, vfx=960):
            bg_house(ctx, t, red=0.5)
            gm.bed(ctx, 420, 900, 900)
            ctx.save()
            ctx.translate(1300, 820)
            ctx.rotate(-PI / 2)
            TW["bella_preg"].draw(ctx, 0, 0, 0.82, t=t, expr="sad", blink=1)
            ctx.restore()
            gm.blanket(ctx, 690, 790, 640, 130)
            TW["edward"].draw(ctx, 1250, 1060, 0.85, t=t, facing=-1, expr="scared", look=-1, hold={"R": "syringe"}, armR=60, elbowR=60)
        grade(ctx, R, strength=0.7)
        badge(ctx, W / 2, H * 0.1, "VENOM, STRAIGHT TO THE HEART", 42 * u, BONE, TW_RED)

    def eyes(ctx, R, lt):
        with cam(ctx, R, 960, 330, 2.6, vfx=960):
            bg_house(ctx, t)
            TW["bella_vamp"].draw(ctx, 960, 1000, 0.9, t=t, expr="shock", blink=1 if lt < 0.8 else 0, look=0)
            sparkle(ctx, 960, 200, 460, 200, t, 0.5)
        grade(ctx, R, strength=0.7)
        if lt > 0.9:
            glow_title(ctx, "A VAMPIRE", W / 2, H * V(R, 0.86, 0.6), V(R, 100, 90) * u, t, color=hx("#ff8a8a"))

    def imprint(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.1, vfx=960):
            bg_house(ctx, t)
            h = TW["rosalie"].draw(ctx, 1150, 1000, 0.88, t=t, facing=-1, expr="happy", look=-1, armL=40, armR=40, elbowL=90, elbowR=90)
            baby(ctx, 1110, 690, 1.0, t)
            hj = TW["jacob"].draw(ctx, 700, 1000, 0.92, t=t, expr="shock", look=1)
            k = ap(lt, 0.5, 1.0)
            for i in range(5):  # golden threads
                ctx.new_path()
                x0, y0 = hj["head"][0] + 40, hj["head"][1] + 20
                x1, y1 = 1080, 680
                ctx.move_to(x0, y0)
                ctx.curve_to(lerp(x0, x1, 0.3), y0 - 80 + i * 30, lerp(x0, x1, 0.7), y1 - 80 + i * 30, x1, y1)
                ctx.set_line_width(4)
                ctx.set_source_rgba(1, 0.85, 0.4, 0.7 * k * (0.6 + 0.4 * math.sin(t * 4 + i)))
                ctx.stroke()
        grade(ctx, R, strength=0.5)
        glow_title(ctx, "IMPRINTING", W / 2, H * V(R, 0.14, 0.12), V(R, 100, 80) * u, t, color=hx("#ffd890"))
        lower_third(ctx, R, lt, 1.0, "RENESMEE", "half human, half vampire", 3.5)

    def power(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_clearing(ctx, t, snow=True)
            for i, k in enumerate(("edward", "bella_vamp", "renesmee", "alice")):
                TW[k].draw(ctx, 600 + i * 240, 1000, 0.8, t=t + i, expr="neutral" if i != 1 else "angry", look=0)
            shield(ctx, 960, 1010, lerp(100, 620, ap(lt, 0.3, 1.2)), lerp(60, 640, ap(lt, 0.3, 1.2)), t, ap(lt, 0.2, 0.5))
        grade(ctx, R, strength=0.5)
        badge(ctx, W / 2, H * 0.1, "BELLA'S POWER: A MIND SHIELD", 42 * u, BONE, hx("#2a4a7a"))

    shots(ctx, R, t, [(0, birth), (t_vamp, eyes), (t_twist, imprint), (t_power, power)])


def L15(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_march, t_wit, t_ab, t_proof, t_field, t_leave = (p.cue("The Volturi march"), p.cue("The Cullens gather"), p.cue("and Alice and Jasper"),
                                                      p.cue("but they're really"), p.cue("In a snowy field"), p.cue("and the Volturi simply"))

    def irina(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1100)):
            bg_clearing(ctx, t, snow=True)
            TW["renesmee"].draw(ctx, 820, 1000, 0.95, t=t, expr="happy", armL=110 + 20 * math.sin(t * 5), armR=110)
            TW["irina"].draw(ctx, 1450, 1000, 0.85, t=t, facing=-1, expr="shock", look=-1)
        grade(ctx, R, strength=0.45)
        badge(ctx, W / 2, H * 0.1, "IRINA: \"AN IMMORTAL CHILD!\"", 42 * u, BONE, TW_RED)

    def march(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_clearing(ctx, t, snow=True)
            for i in range(7):
                key = ["guard", "jane", "caius", "aro", "marcus", "guard", "guard"][i]
                TW[key].draw(ctx, 250 + i * 240, lerp(820, 1000, min(1, lt / 4)), lerp(0.4, 0.75, min(1, lt / 4)),
                             t=t + i, walk=t * 3, expr="cold", look=0)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.1, "THE VOLTURI ARE COMING", 44 * u, BONE, hx("#3a1010"))

    def witnesses(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(400, 1500, min(1, lt / 4)))):
            bg_forest(ctx, t, rain_a=0, light=0.3)
            for i in range(8):
                a = ap(lt, i * 0.25, 0.4)
                if a > 0:
                    witness(i).draw(ctx, 180 + i * 220, 1000 + (1 - a) * 60, 0.72, t=t + i, expr="neutral", look=0)
        grade(ctx, R, strength=0.5)
        badge(ctx, W / 2, H * 0.1, "WITNESSES FROM AROUND THE WORLD", 40 * u, BONE, hx("#2a4a3a"))

    def abandon(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(900, 1700, min(1, lt / 3)))):
            bg_forest(ctx, t, rain_a=0.2)
            TW["alice"].draw(ctx, lerp(900, 2200, min(1, lt / 3)), 1000, 0.8, t=t, walk=t * 8, expr="cold")
            TW["jasper"].draw(ctx, lerp(700, 2000, min(1, lt / 3)), 1000, 0.85, t=t, walk=t * 8, expr="cold")
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.1, "ALICE AND JASPER LEAVE?!", 44 * u, BONE, hx("#4a2a6a"))

    def nahuel(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1100)):
            bg_jungle(ctx, t)
            TW["alice"].draw(ctx, 760, 1000, 0.8, t=t, expr="happy", look=1)
            TW["nahuel"].draw(ctx, 1150, 1000, 0.9, t=t, facing=-1, expr="neutral", look=-1)
        grade(ctx, R, strength=0.5)
        lower_third(ctx, R, lt, 0.3, "NAHUEL", "another half-vampire: the proof", 3.5)

    def standoff(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 600)):
            bg_clearing(ctx, t, snow=True)
            for i in range(4):
                TW[["carlisle", "edward", "bella_vamp", "jacob"][i]].draw(ctx, 200 + i * 180, 1000, 0.7, t=t + i,
                                                                            expr="angry" if i else "neutral", look=1)
            shield(ctx, 470, 1010, 420, 560, t, ap(lt, 0.3, 0.6))
            for i in range(4):
                TW[["aro", "caius", "jane", "guard"][i]].draw(ctx, 1250 + i * 180, 1000, 0.7, t=t + i, facing=-1, expr="cold", look=-1)
        grade(ctx, R, strength=0.55)

    def leave(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1500)):
            bg_clearing(ctx, t, snow=True)
            for i in range(4):
                TW[["carlisle", "edward", "bella_vamp", "alice"][i]].draw(ctx, 200 + i * 180, 1000, 0.7, t=t + i, expr="happy", look=1)
            for i in range(4):
                TW[["aro", "caius", "jane", "guard"][i]].draw(ctx, 1250 + i * 180 + lt * 120, 1000, 0.7, t=t + i,
                                                              facing=1, walk=t * 4, expr="cold")
        grade(ctx, R, strength=0.5)
        text(ctx, "NO BATTLE AT ALL", W / 2, H * V(R, 0.14, 0.12), V(R, 96, 72) * u, BONE, "Liberation Serif", outline=6 * u)

    shots(ctx, R, t, [(0, irina), (t_march, march), (t_wit, witnesses), (t_ab, abandon), (t_proof, nahuel),
                      (t_field, standoff), (t_leave, leave)])


def battle_shot(phase):
    """Breaking Dawn Part 2 film battle (kept cartoonish: dust poofs, no gore)."""
    def fn(ctx, R, lt):
        W, H, u = R.W, R.H, R.u
        vfx = {"clash": lerp(700, 1150, min(1, lt / 2)), "carlisle": 980, "fall": lerp(500, 1500, min(1, max(0, lt - 0.2) / 1.8)),
               "aro": 970}[phase]
        vzoom = 0.85 if (R.vertical and phase in ("aro", "carlisle")) else 1.0
        with cam(ctx, R, 960, 560, (1.03 + 0.02 * math.sin(lt * 9)) * vzoom, vfx=V(R, 960, vfx)):
            bg_clearing(ctx, lt + 10, snow=True)
            if phase == "clash":
                for i in range(4):
                    TW[["edward", "emmett", "jasper", "bella_vamp"][i]].draw(ctx, lerp(200, 700, min(1, lt / 1.5)) + i * 150, 1000,
                                                                             0.7, t=lt + i, walk=lt * 9, expr="manic", look=1, lean=10)
                for i in range(4):
                    TW[["guard", "jane", "guard", "caius"][i]].draw(ctx, lerp(1750, 1250, min(1, lt / 1.5)) + i * 150, 1000,
                                                                    0.7, t=lt + i, walk=lt * 9, facing=-1, expr="manic", look=-1, lean=10)
                wolf(ctx, lerp(-300, 900, min(1, lt / 2)), 1040, 0.5, lt, WOLF_COLORS["jacob"], walk=lt * 10)
            elif phase == "carlisle":
                k = ap(lt, 0.8, 0.15)
                if k < 1:
                    TW["carlisle"].draw(ctx, 860, 1000, 0.85, t=lt, expr="scared", look=1)
                TW["aro"].draw(ctx, 1100, 1000, 0.85, t=lt, facing=-1, expr="manic", look=-1, armR=lerp(10, 90, k))
                poof(ctx, 860, 640, lt, ap(lt, 0.8, 1.4) * 1.3)
                TW["edward"].draw(ctx, 400, 1000, 0.8, t=lt, expr="shock" if k else "angry", look=1)
            elif phase == "fall":
                for i, (kind, x) in enumerate((("jasper", 500), ("wolf:seth", 1000), ("wolf:leah", 1500))):
                    k = ap(lt, 0.4 + i * 0.6, 0.15)
                    if k < 1:
                        if kind.startswith("wolf:"):
                            wolf(ctx, x, 1040, 0.45, lt, WOLF_COLORS[kind[5:]], walk=lt * 8)
                        else:
                            TW[kind].draw(ctx, x, 1000, 0.8, t=lt, expr="angry", look=1, armL=90)
                    poof(ctx, x, 820, lt, ap(lt, 0.4 + i * 0.6, 1.4) * 1.3)
            elif phase == "aro":
                k = ap(lt, 1.2, 0.15)
                TW["edward"].draw(ctx, 760, 1000, 0.85, t=lt, expr="angry", look=1, armR=80, elbowR=10)
                TW["bella_vamp"].draw(ctx, 1180, 1000, 0.82, t=lt, facing=-1, expr="angry", look=-1, armR=80, elbowR=10)
                if k < 1:
                    TW["aro"].draw(ctx, 970, 1000, 0.85, t=lt, expr="scared", look=0)
                poof(ctx, 970, 640, lt, ap(lt, 1.2, 1.4) * 1.3)
        tint(ctx, R, (0.6, 0.75, 1.0), 0.08)
        grade(ctx, R, strength=0.6)
        label = {"clash": "THE FILM'S BATTLE", "carlisle": "CARLISLE!", "fall": "JASPER, SETH, LEAH...", "aro": "ARO IS DEFEATED"}[phase]
        badge(ctx, W / 2, H * 0.1, label, 44 * u, BONE, TW_RED)
    return fn


def vision_reveal(ctx, R, lt):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 520, 1.15, vfx=960):
        bg_clearing(ctx, lt + 20, snow=True)
        TW["alice"].draw(ctx, 860, 1000, 0.82, t=lt, expr="cold", look=1, armR=70, elbowR=10)
        TW["aro"].draw(ctx, 1080, 1000, 0.85, t=lt, facing=-1, expr="shock", look=-1, armR=70, elbowR=10)
        gm.heal_glow(ctx, 970, 760, 80, ap(lt, 0.2, 0.4), lt)
    grade(ctx, R, strength=0.6)
    text(ctx, "IT WAS A VISION", W / 2, H * V(R, 0.14, 0.12), V(R, 100, 76) * u, hx("#c8e0ff"), "Liberation Serif", outline=6 * u)


def walk_away(ctx, R, lt):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1500)):
        bg_clearing(ctx, lt + 30, snow=True)
        for i in range(4):
            TW[["aro", "caius", "jane", "guard"][i]].draw(ctx, 1250 + i * 180 + lt * 120, 1000, 0.7, t=lt + i, walk=lt * 4, expr="cold")
        for i in range(3):
            TW[["carlisle", "edward", "bella_vamp"][i]].draw(ctx, 300 + i * 200, 1000, 0.7, t=lt + i, expr="happy", look=1)
    grade(ctx, R, strength=0.5)
    badge(ctx, W / 2, H * 0.1, "THE VOLTURI WALK AWAY", 44 * u, BONE, hx("#2a4a3a"))


def L16(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u

    def intro(ctx, R, lt):
        g = cairo.LinearGradient(0, 0, 0, H)
        g.add_color_stop_rgb(0, *hx("#2a1424"))
        g.add_color_stop_rgb(1, *hx("#0c0810"))
        ctx.set_source(g)
        ctx.paint()
        text(ctx, "THE BIGGEST CHANGE", W / 2, H * V(R, 0.22, 0.16), V(R, 90, 70) * u, BONE, "Liberation Serif", outline=6 * u)
        badge(ctx, W * V(R, 0.3, 0.5), H * V(R, 0.5, 0.3), "BOOK: NO BATTLE", 54 * u, hx("#2a1a14"), hx("#efe4cc"))
        if lt > 2.5:
            badge(ctx, W * V(R, 0.7, 0.5), H * V(R, 0.5, 0.4), "FILM: A WAR", 54 * u, (1, 1, 1), TW_RED)
        if lt > 4:
            text(ctx, "Breaking Dawn: Part 1 (2011) & Part 2 (2012)", W / 2, H * V(R, 0.68, 0.5), 38 * u, hx("#e0a0a8"), outline=3 * u)

    shots(ctx, R, t, [(0, intro), (p.cue("Part Two gives"), battle_shot("clash")), (p.cue("Carlisle loses"), battle_shot("carlisle")),
                      (p.cue("Jasper, Seth"), battle_shot("fall")), (p.cue("And Bella and Edward"), battle_shot("aro")),
                      (p.cue("Then, the reveal"), vision_reveal), (p.cue("Aro sees"), walk_away)])


def L17(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_ms, t_q = p.cue("And if you want"), p.cue("So which twist")

    def forever(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.0 + 0.02 * lt, vfx=960):
            bg_meadow(ctx, t, sun=1.0)
            h1 = TW["bella_vamp"].draw(ctx, 840, 1000, 0.9, t=t, expr="happy", look=1)
            h2 = TW["edward"].draw(ctx, 1080, 1000, 0.9, t=t, facing=-1, expr="happy", look=-1)
            sparkle(ctx, 840, 300, 900, 160, t, 0.8, seed=1)
            sparkle(ctx, 1080, 300, 900, 160, t, 0.8, seed=2)
            k = ap(lt, 1.0, 1.0)
            for i in range(14):
                ph = (t * 0.5 + i / 14) % 1
                x = lerp(h1["head"][0], h2["head"][0], ph)
                y = h1["head"][1] - 60 - math.sin(ph * PI) * 120
                ell(ctx, x, y, 7, 7)
                ctx.set_source_rgba(1, 0.9, 0.95, k * (1 - abs(ph - 0.5)))
                ctx.fill()
        grade(ctx, R, strength=0.35)
        if lt > 2:
            text(ctx, "...forever.", W / 2, H * V(R, 0.16, 0.14), 100 * u, hx("#fff4f0"), "Liberation Serif", outline=6 * u, italic=True)

    def midnight(ctx, R, lt):
        g = cairo.LinearGradient(0, 0, 0, H)
        g.add_color_stop_rgb(0, *hx("#14101e"))
        g.add_color_stop_rgb(1, *hx("#050408"))
        ctx.set_source(g)
        ctx.paint()
        bx, by, bw, bh = W / 2 - 230 * u, H * V(R, 0.12, 0.1), 460 * u, 620 * u
        rrect(ctx, bx, by, bw, bh, 12)
        C.fs(ctx, hx("#1a1420"), 6)
        rrect(ctx, bx, by, 40 * u, bh, 6)
        C.fs(ctx, hx("#3a1a2a"), 3)
        moon_icon(ctx, W / 2 + 20 * u, by + bh * 0.4, 80 * u, "newmoon")
        text(ctx, "MIDNIGHT", W / 2 + 20 * u, by + bh * 0.68, 56 * u, BONE, "Liberation Serif", outline=0)
        text(ctx, "SUN", W / 2 + 20 * u, by + bh * 0.8, 56 * u, BONE, "Liberation Serif", outline=0)
        text(ctx, "2020 · Twilight, told by Edward", W / 2, by + bh + 60 * u, 40 * u, hx("#e0a0a8"), outline=3 * u)

    def poll(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_forest(ctx, t, rain_a=0.2)
        grade(ctx, R, strength=0.8)
        opts = [("THE WEREWOLF", p.cue("the werewolf"), hx("#8a4a28")), ("THE ARMY", p.cue("the army"), TW_RED),
                ("THE BATTLE THAT NEVER HAPPENED", p.cue("or the battle"), hx("#2a4a7a"))]
        for i, (s, t0, col) in enumerate(opts):
            if t > t0:
                badge(ctx, W / 2, H * (V(R, 0.2, 0.14) + i * V(R, 0.13, 0.07)), s, V(R, 52, 40) * u, (1, 1, 1), col)
        ts = p.cue("subscribe")
        if t > ts:
            badge(ctx, W / 2, H * V(R, 0.66, 0.4), "SUBSCRIBE", 64 * u * (1 + 0.06 * math.sin((t - ts) * 6)), (1, 1, 1), (0.85, 0.08, 0.08))

    shots(ctx, R, t, [(0, forever), (t_ms, midnight), (t_q, poll)])


LONG = [L0, L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12, L13, L14, L15, L16, L17]


# ====================================================================== SHORT
def S0(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 560, 1.0, vfx=960):
        bg_clearing(ctx, t, snow=True)
        TW["edward"].draw(ctx, 820, 1000, 0.8, t=t, expr="angry", look=1)
        TW["aro"].draw(ctx, 1100, 1000, 0.8, t=t, facing=-1, expr="manic", look=-1)
    grade(ctx, R, strength=0.7)
    text(ctx, "TWILIGHT'S", W / 2, H * 0.1, 90 * u, BONE, "Liberation Serif", outline=6 * u)
    text(ctx, "FAKE BATTLE", W / 2, H * 0.17, 110 * u, hx("#ff5a5a"), "Liberation Serif", outline=7 * u)
    if t > p.cue("Spoilers"):
        badge(ctx, W / 2, H * 0.25, "SPOILERS", 52 * u)


def S1(ctx, R, t, p):
    shots(ctx, R, t, [(0, battle_shot("clash")), (p.cue("Carlisle loses"), battle_shot("carlisle")),
                      (p.cue("Jasper, Seth"), battle_shot("fall")), (p.cue("Bella and Edward take"), battle_shot("aro"))])


def S2(ctx, R, t, p):
    shots(ctx, R, t, [(0, vision_reveal), (p.cue("so he walked"), walk_away)])


def S3(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 560, 1.0, vfx=600):
        bg_clearing(ctx, t, snow=True)
        for i in range(4):
            TW[["carlisle", "edward", "bella_vamp", "jacob"][i]].draw(ctx, 200 + i * 180, 1000, 0.7, t=t + i, expr="neutral", look=1)
        shield(ctx, 470, 1010, 420, 560, t, ap(t, 1.0, 0.6))
    grade(ctx, R, strength=0.55)
    badge(ctx, W / 2, H * 0.12, "THE BOOK: NO BATTLE", 54 * u, hx("#2a1a14"), hx("#efe4cc"))


def S4(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 560, 1.0, vfx=960):
        bg_clearing(ctx, t, snow=True)
    grade(ctx, R, strength=0.8)
    badge(ctx, W / 2, H * 0.14, "FIXED IT?", 76 * u, (1, 1, 1), hx("#2a6a3a"))
    text(ctx, "or", W / 2, H * 0.21, 54 * u, BONE, outline=4 * u)
    badge(ctx, W / 2, H * 0.28, "CHEATED?", 76 * u, (1, 1, 1), TW_RED)


SHORT = [S0, S1, S2, S3, S4]

# ---------------------------------------------------------------- pipeline (same as the Green Mile one)
TW_PROG = [("E", [52, 55, 59]), ("C", [48, 55, 60]), ("G", [55, 59, 62]), ("D", [50, 54, 57]),
           ("E", [52, 55, 59, 64]), ("A", [57, 60, 64]), ("C", [48, 55, 60, 64]), ("B", [47, 51, 54, 59])]
CFG = {"long": (1920, 1080, False, LONG), "short": (1080, 1920, True, SHORT)}
G = {}


def render_scene(args):
    i, out = args
    W, H, vertical, scenes = G["cfg"]
    R = Rd(W, H, vertical)
    p = G["paras"][i]
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    grain = make_grain(W, H)
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "22",
                           "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for f in range(int(round(p.dur * FPS))):
        gm.frame(ctx, R, scenes, i, p, f / FPS, grain)
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
            gm.frame(ctx, R, scenes, i, p, p.dur * fr, grain)
            surf.write_to_png(f"{outdir}/{mode}_{i:02d}_{int(fr * 100):02d}.png")


def main():
    if sys.argv[1] == "still":
        return stills(*sys.argv[2:6])
    mode, vo_dir, script, out = sys.argv[1:5]
    paras, total = load(mode, vo_dir, script)
    work = out + "_parts"
    os.makedirs(work, exist_ok=True)
    jobs = sorted([(i, f"{work}/s{i:02d}.mp4") for i in range(len(paras))], key=lambda j: -paras[j[0]].dur)
    redo = os.environ.get("ONLY")  # re-render only these scenes, reuse the other parts
    if redo:
        jobs = [j for j in jobs if str(j[0]) in redo.split(",") or not os.path.exists(j[1])]
    with Pool(4) as pool:
        for r in pool.imap_unordered(render_scene, jobs):
            print("done", r, flush=True)
    parts = [f"[{i}:a]aresample=48000,adelay={int(LEAD * 1000)}:all=1,apad=whole_dur={p.dur:.3f}[a{i}]" for i, p in enumerate(paras)]
    inputs = sum([["-i", f"{vo_dir}/{i:02d}.wav"] for i in range(len(paras))], [])
    fc = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(len(paras))) + f"concat=n={len(paras)}:v=0:a=1[vo]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "[vo]", f"{work}/vo.wav"], check=True)
    gm.music(f"{work}/music.wav", total, prog=TW_PROG, bpm=72)
    with open(f"{work}/list.txt", "w") as fh:
        for i in range(len(paras)):
            fh.write(f"file 's{i:02d}.mp4'\n")
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
