"""DON'T SPOIL IT RG, Episode 3: Alien 3 (1992), 12-scene long-form cartoon explainer.

Follows the 12-scene storyboard (narration, shots, sound cues) in the shared cartoon engine.
usage: python a3.py long VO_DIR SCRIPT OUT
       python a3.py still long VO_DIR SCRIPT DIR
"""
import math, os, random, subprocess, sys
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
for d in ("crystal_lake", "green_mile", "twilight"):
    sys.path.insert(0, os.path.join(HERE, "..", d))

import cairo

import cartoon as C
from cartoon import Char, hx, ease, lerp, text, rrect, ell, fs, src, INK
from render import Para, wav_len, LEAD
from story import Rd, cam, grade, tint, flash, sepia_bubble, badge, make_grain, ap
import gm
from gm import shots, V, lower_third, glow_title, ceiling_lamp, heal_glow, smoke, dust
import tw
from tw import wolf, poof, wrap_lines

FPS = 30
PI = math.pi
BONE = hx("#f4ead2")
RUST = hx("#c8541c")
AMBER = (1.0, 0.62, 0.22)
WY_GREEN = hx("#7dff9a")
RIM = hx("#8a9ab8")  # cold rim light so the black creature reads on dark sets

# ------------------------------------------------------------------ cast (all original cartoon designs)
COAT_B, COAT_G = hx("#5a4a3a"), hx("#4a4a46")


def con(skin, coat=COAT_B, **k):
    k.setdefault("hair_style", "bald")
    k.setdefault("hair", skin)
    k.setdefault("head_r", 66)
    return Char(skin=skin, shirt=coat, top="coat", pants=hx("#2e2a26"), **k)


A3 = {
    "ripley": Char(skin=hx("#ecc8b0"), hair=hx("#3a2418"), hair_style="curly", shirt=hx("#5a5248"), top="coat",
                   pants=hx("#2e2a26"), head_r=64, lashes=True, iris=hx("#6a5a3a"), bulk=0.9),
    "ripley_bald": Char(skin=hx("#ecc8b0"), hair=hx("#ecc8b0"), hair_style="bald", shirt=hx("#5a5248"), top="coat",
                        pants=hx("#2e2a26"), head_r=64, lashes=True, iris=hx("#6a5a3a"), bulk=0.9),
    "newt": Char(skin=hx("#f2d6c0"), hair=hx("#d8b860"), hair_style="curly", shirt=hx("#8a9aa8"), top="shirt",
                 leg=150, torso=110, head_r=64, arm=115, bulk=0.58, lashes=True),
    "hicks": Char(skin=hx("#e8c2a2"), hair=hx("#2a1e14"), hair_style="short", shirt=hx("#5a6a44"), top="shirt",
                  pants=hx("#4a5038"), head_r=66),
    "bishop": Char(skin=hx("#ece6e0"), hair=hx("#6a6a6a"), hair_style="slick", shirt=hx("#d8d8d8"), top="shirt",
                   pants=hx("#5a5a5a"), head_r=64),
    "bishop2": Char(skin=hx("#ece0d6"), hair=hx("#6a6a6a"), hair_style="slick", shirt=hx("#2a2a30"), top="suit",
                    pants=hx("#2a2a30"), tie=hx("#5a5a64"), head_r=64),
    "clemens": Char(skin=hx("#eccab0"), hair=hx("#6a5a4a"), hair_style="slick", shirt=hx("#d8d4c8"), top="coat",
                    pants=hx("#3a3a3a"), head_r=64),
    "andrews": Char(skin=hx("#e8c0a0"), hair=hx("#9a9a9a"), hair_style="short", shirt=hx("#2e3440"), top="uniform",
                    pants=hx("#2e3440"), head_r=68, bulk=1.1, mustache=hx("#9a9a9a"), old=True),
    "dillon": con(hx("#5a3626"), coat=hx("#4a3a2c"), glasses=True, bulk=1.25, leg=300, torso=215, head_r=70),
    "aaron": Char(skin=hx("#ecc8aa"), hair=hx("#5a4a3a"), hair_style="short", shirt=hx("#3a4048"), top="uniform",
                  pants=hx("#2e3440"), head_r=64, glasses=True, bulk=0.85),
    "morse": con(hx("#e0b898"), coat=COAT_G, mustache=hx("#3a2a1e")),
    "golic": con(hx("#eac8b0"), coat=COAT_B, glasses=True, bulk=1.2),
    "murphy": con(hx("#d8a88a"), coat=COAT_G),
    "trooper": Char(skin=hx("#e8c2a2"), hair=hx("#2a2a2a"), hair_style="short", shirt=hx("#8a8e94"), top="uniform",
                    pants=hx("#5a5e64"), head_r=64, hat="police", bulk=1.1),
}
PRISONER_SKINS = [hx("#5a3626"), hx("#e8c2a2"), hx("#c8946a"), hx("#7a4a30"), hx("#f0d0b8"), hx("#a0704a")]


def prisoner(i):
    rnd = random.Random(300 + i)
    return con(rnd.choice(PRISONER_SKINS), coat=rnd.choice([COAT_B, COAT_G, hx("#3a3a34")]),
               bulk=rnd.uniform(0.95, 1.2), mustache=rnd.choice([None, None, hx("#2a1e14")]),
               glasses=rnd.random() < 0.15)


# ------------------------------------------------------------------ the creature
def xeno(ctx, x, y, s, t, walk=None, facing=1, crouch=0.0, jaw=0.0, glow=0.0, alpha=1.0, color=hx("#1c1c24"), rear=0.0):
    """Four-legged runner Xenomorph, side view (head to the right), feet at (x, y). rear: 0..1 rears up on hind legs."""
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * facing, s)
    if alpha < 1:
        ctx.push_group()
    ell(ctx, 0, 0, 280, 22)
    ctx.set_source_rgba(0, 0, 0, 0.35)
    ctx.fill()
    ctx.translate(-150, 0)
    ctx.rotate(-0.75 * rear)
    ctx.translate(150, 0)
    ph = walk if walk is not None else 0
    bob = -abs(math.sin(ph)) * 8 if walk is not None else 3 * math.sin(t * 1.6)
    by = -245 + 70 * crouch + bob
    sheen = (0.75, 0.82, 0.95)

    def stroke2(w):
        ctx.set_line_width(w + 7)
        src(ctx, RIM)
        ctx.stroke_preserve()
        ctx.set_line_width(w)
        src(ctx, color)
        ctx.stroke()

    # tail: thick at the base, sweeping back and down, ending in a blade
    sw = math.sin(t * 2.2) * 25
    for w, a0, a1 in ((30, 0.0, 0.35), (22, 0.3, 0.7), (14, 0.65, 1.0)):
        ctx.new_path()
        pts = [(-170, by + 10), (-330, by - 40 + sw), (-470, by + 60 - sw), (-600, by + 10 + sw)]

        def bez(f):
            p0, p1, p2, p3 = pts
            u = 1 - f
            return (u ** 3 * p0[0] + 3 * u * u * f * p1[0] + 3 * u * f * f * p2[0] + f ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * f * p1[1] + 3 * u * f * f * p2[1] + f ** 3 * p3[1])
        for k in range(12):
            ctx.line_to(*bez(lerp(a0, a1, k / 11)))
        stroke2(w)
    tx, ty = -600, by + 10 + sw
    ctx.new_path()
    ctx.move_to(tx + 10, ty - 8)
    ctx.line_to(tx - 70, ty - 40)
    ctx.line_to(tx - 30, ty + 12)
    ctx.close_path()
    fs(ctx, color, 4, ink=RIM)

    def leg(hx_, hy_, a, far):
        ctx.save()
        ctx.translate(hx_, hy_)
        ctx.rotate(a)
        col = C.mix(color, (0, 0, 0), 0.45) if far else color
        L = -hy_
        ctx.new_path()  # digitigrade: hip -> knee (forward) -> ankle (back) -> toe
        ctx.move_to(0, 0)
        ctx.line_to(45, L * 0.42)
        ctx.line_to(-25, L * 0.8)
        ctx.line_to(15, L)
        ctx.set_line_width(30)
        src(ctx, RIM if not far else C.mix(RIM, (0, 0, 0), 0.4))
        ctx.stroke_preserve()
        ctx.set_line_width(22)
        src(ctx, col)
        ctx.stroke()
        for cx in (-4, 14, 30):
            ctx.move_to(15, L)
            ctx.line_to(15 + cx, L + 14)
        ctx.set_line_width(5)
        src(ctx, RIM)
        ctx.stroke()
        ctx.restore()

    for k, (lx, far) in enumerate(((-150, True), (110, True))):
        leg(lx, by + 20, (0.45 * math.sin(ph + k * PI) if walk is not None else 0.04 * math.sin(t + k)), far)
    # torso with ridged ribcage
    ctx.new_path()
    ctx.move_to(-200, by + 10)
    ctx.curve_to(-180, by - 95, 120, by - 115, 200, by - 45)
    ctx.curve_to(230, by + 5, 180, by + 60, 100, by + 55)
    ctx.curve_to(0, by + 75, -170, by + 60, -200, by + 10)
    ctx.close_path()
    fs(ctx, color, 7, ink=RIM)
    ctx.set_line_width(4)
    ctx.set_source_rgba(*sheen, 0.55)
    for k in range(8):
        rx = -150 + k * 38
        ctx.move_to(rx, by - 75)
        ctx.curve_to(rx + 14, by - 35, rx + 10, by + 15, rx - 4, by + 45)
    ctx.stroke()
    for k, bx in enumerate((-30, 40)):  # two short dorsal tubes, swept back
        ctx.new_path()
        ctx.move_to(bx, by - 95)
        ctx.line_to(bx - 70, by - 150)
        stroke2(14)
    for k, (lx, far) in enumerate(((-120, False), (140, False))):
        leg(lx, by + 25, (0.45 * math.sin(ph + PI / 2 + k * PI) if walk is not None else 0.04 * math.sin(t + k + 2)), far)
    # neck and the long, smooth skull
    hy = by - 70
    ctx.new_path()
    ctx.move_to(150, by - 40)
    ctx.line_to(260, hy + 30)
    stroke2(40)
    ctx.new_path()
    ctx.move_to(90, hy - 90)
    ctx.curve_to(170, hy - 150, 400, hy - 110, 540, hy - 10)
    ctx.curve_to(560, hy + 10, 540, hy + 35, 500, hy + 40)
    ctx.curve_to(400, hy + 55, 280, hy + 60, 210, hy + 30)
    ctx.curve_to(150, hy, 100, hy - 50, 90, hy - 90)
    ctx.close_path()
    fs(ctx, color, 7, ink=RIM)
    ctx.set_source_rgba(*sheen, 0.75)  # glossy highlight along the dome
    ctx.set_line_width(7)
    ctx.move_to(150, hy - 100)
    ctx.curve_to(260, hy - 125, 400, hy - 95, 500, hy - 30)
    ctx.stroke()
    jd = 34 * jaw
    ctx.new_path()  # lower jaw
    ctx.move_to(360, hy + 45)
    ctx.curve_to(420, hy + 60 + jd, 480, hy + 60 + jd, 515, hy + 38 + jd)
    ctx.line_to(500, hy + 30)
    ctx.close_path()
    fs(ctx, C.mix(color, (0.3, 0.3, 0.35), 0.3), 4, ink=RIM)
    ctx.set_source_rgb(0.88, 0.9, 0.95)  # silver teeth
    for k in range(8):
        tx_ = 400 + k * 14
        ctx.move_to(tx_, hy + 36)
        ctx.line_to(tx_ + 5, hy + 52 + jd * 0.3)
        ctx.line_to(tx_ + 10, hy + 36)
        ctx.close_path()
        ctx.fill()
    if jaw > 0.5:  # inner jaw
        ctx.new_path()
        ctx.move_to(460, hy + 46)
        ctx.line_to(460 + 110 * (jaw - 0.5) * 2, hy + 46)
        stroke2(12)
    ctx.set_source_rgba(0.6, 0.9, 0.5, 0.6 * (0.5 + 0.5 * math.sin(t * 9)))  # drool
    ctx.set_line_width(3)
    ctx.move_to(490, hy + 55 + jd)
    ctx.line_to(492, hy + 100 + jd + 10 * math.sin(t * 3))
    ctx.stroke()
    if glow > 0:  # molten / overheated
        ctx.set_operator(cairo.OPERATOR_ADD)
        g = cairo.RadialGradient(100, by - 40, 20, 100, by - 40, 560)
        g.add_color_stop_rgba(0, 1, 0.55, 0.15, 0.85 * glow)
        g.add_color_stop_rgba(1, 1, 0.3, 0.05, 0)
        ctx.set_source(g)
        ctx.rectangle(-800, -800, 1500, 900)
        ctx.fill()
        ctx.set_operator(cairo.OPERATOR_OVER)
    if alpha < 1:
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(alpha)
    ctx.restore()


def facehugger(ctx, x, y, s, t):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    col = hx("#d8c8a0")
    for k in range(8):
        a = PI + (k + 0.5) * PI / 8
        ctx.new_path()
        ctx.move_to(0, 0)
        mx, my = 60 * math.cos(a), 40 * math.sin(a) - 10
        ctx.curve_to(mx, my - 20, mx * 1.6, my, mx * 1.5, my + 40 + 6 * math.sin(t * 8 + k))
        ctx.set_line_width(9)
        src(ctx, INK)
        ctx.stroke_preserve()
        ctx.set_line_width(5)
        src(ctx, col)
        ctx.stroke()
    ell(ctx, 0, -10, 44, 28)
    fs(ctx, col, 4)
    ctx.new_path()
    ctx.move_to(-40, -10)
    ctx.curve_to(-110, -40 + 10 * math.sin(t * 4), -150, 20, -190, -10)
    ctx.set_line_width(10)
    src(ctx, INK)
    ctx.stroke_preserve()
    ctx.set_line_width(6)
    src(ctx, col)
    ctx.stroke()
    ctx.restore()


# ------------------------------------------------------------------ sets
def bg_space(ctx, t):
    C.sky(ctx, hx("#02030a"), hx("#0a1024"))
    C.stars(ctx, t, n=260, ymax=1200, seed=5)
    g = cairo.RadialGradient(1600, 300, 10, 1600, 300, 700)
    g.add_color_stop_rgba(0, 0.3, 0.4, 0.8, 0.18)
    g.add_color_stop_rgba(1, 0.3, 0.4, 0.8, 0)
    ctx.set_source(g)
    ctx.paint()


def sulaco(ctx, x, y, s, t, fire=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.new_path()
    ctx.move_to(-520, -40)
    ctx.line_to(-380, -110)
    ctx.line_to(300, -110)
    ctx.line_to(520, -30)
    ctx.line_to(300, 60)
    ctx.line_to(-380, 60)
    ctx.close_path()
    fs(ctx, hx("#3a4048"), 5)
    for k in range(6):  # hull plates
        ctx.rectangle(-340 + k * 110, -90, 90, 40)
        fs(ctx, hx("#2a3038"), 2)
    ctx.rectangle(-480, -160, 80, 260)
    fs(ctx, hx("#2a3038"), 4)
    for k in range(10):  # windows
        ell(ctx, -300 + k * 60, 20, 8, 6)
        ctx.set_source_rgba(0.5, 0.75, 1, 0.8 + 0.2 * math.sin(t * 2 + k))
        ctx.fill()
    for k in range(3):  # engines
        ell(ctx, -520, -60 + k * 50, 16, 16)
        ctx.set_source_rgba(0.6, 0.8, 1, 0.9)
        ctx.fill()
    if fire > 0:
        rnd = random.Random(int(t * 12))
        for k in range(6):
            ell(ctx, rnd.uniform(-200, 200), rnd.uniform(-60, 40), 30 * fire, 30 * fire)
            ctx.set_source_rgba(1, rnd.uniform(0.3, 0.7), 0.1, 0.8)
            ctx.fill()
    ctx.restore()


def eev(ctx, x, y, s, rot, fire=0.0, t=0):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(s, s)
    if fire > 0:
        g = cairo.LinearGradient(-60, 0, -500, 0)
        g.add_color_stop_rgba(0, 1, 0.8, 0.3, 0.9 * fire)
        g.add_color_stop_rgba(1, 1, 0.3, 0.05, 0)
        ctx.set_source(g)
        ctx.move_to(-60, -40)
        ctx.line_to(-500, -120 + 20 * math.sin(t * 20))
        ctx.line_to(-500, 120)
        ctx.line_to(-60, 40)
        ctx.close_path()
        ctx.fill()
    ctx.new_path()
    ctx.move_to(-80, -50)
    ctx.line_to(60, -50)
    ctx.line_to(110, 0)
    ctx.line_to(60, 50)
    ctx.line_to(-80, 50)
    ctx.close_path()
    fs(ctx, hx("#8a8e94"), 5)
    ctx.rectangle(10, -30, 50, 24)
    fs(ctx, hx("#a0c0d8"), 3)
    ctx.restore()


def bg_planet(ctx, t, prison=True, storm=True):
    C.sky(ctx, hx("#1a1410"), hx("#5a3a24"), 700)
    for i in range(5):  # rust-colored clouds
        x = (i * 520 + t * 25) % 2600 - 400
        ell(ctx, x, 180 + i * 50, 380, 60)
        ctx.set_source_rgba(0.45, 0.25, 0.15, 0.4)
        ctx.fill()
    if prison:
        ctx.rectangle(500, 360, 1100, 360)
        fs(ctx, hx("#2a2420"), 6)
        for k, (sx, sh) in enumerate(((620, 300), (820, 380), (1380, 340))):  # smokestacks
            ctx.rectangle(sx, 360 - sh, 70, sh)
            fs(ctx, hx("#221c18"), 5)
            smoke(ctx, sx + 35, 360 - sh, t + k, 0.8, seed=k)
        for k in range(14):
            ell(ctx, 560 + k * 75, 460 + (k % 2) * 80, 8, 8)
            ctx.set_source_rgba(1, 0.6, 0.2, 0.7 + 0.3 * math.sin(t * 2 + k))
            ctx.fill()
    ctx.new_path()  # rocky shore
    ctx.move_to(-800, 1200)
    ctx.line_to(-800, 720)
    for i in range(30):
        ctx.line_to(-800 + i * 130, 720 - 40 * abs(math.sin(i * 1.7)))
    ctx.line_to(3000, 720)
    ctx.line_to(3000, 1200)
    ctx.close_path()
    src(ctx, hx("#1a1612"))
    ctx.fill()
    if storm:
        tw.rain(ctx, t, 0.25)
        C.fog(ctx, t, 760, 200, 0.25, color=(0.5, 0.4, 0.35), seed=2)


def bg_foundry(ctx, t, heat=1.0, red=0.0):
    """The rusting industrial interior: catwalks, pipes, amber shafts of light."""
    C.sky(ctx, C.mix(hx("#2a1e16"), hx("#3a0a0a"), red), C.mix(hx("#120c08"), hx("#1a0404"), red))
    rnd = random.Random(31)
    for i in range(14):  # columns
        x = -300 + i * 180
        ctx.rectangle(x, -300, 50, 1500)
        src(ctx, hx("#1e1610"))
        ctx.fill()
        for j in range(6):
            ell(ctx, x + 25, j * 180 + 40, 7, 7)
            src(ctx, hx("#3a2a1c"))
            ctx.fill()
    for y in (230, 520):  # catwalks
        ctx.rectangle(-800, y, 3600, 18)
        fs(ctx, hx("#3a2a1e"), 3)
        for i in range(-20, 60):
            ctx.rectangle(i * 50, y + 18, 4, 60)
        src(ctx, hx("#2a1e14"))
        ctx.fill()
        ctx.rectangle(-800, y + 76, 3600, 8)
        ctx.fill()
    ctx.set_line_width(26)  # pipes
    for k in range(3):
        ctx.move_to(-800, 120 + k * 40)
        ctx.line_to(2800, 140 + k * 40)
        src(ctx, hx("#3a2c22"))
        ctx.stroke()
    for i in range(5):  # amber light shafts
        x = 150 + i * 420 + 30 * math.sin(t * 0.3 + i)
        g = cairo.LinearGradient(x, 0, x + 240, 1080)
        col = (1, 0.15, 0.1) if red > 0.5 else AMBER
        g.add_color_stop_rgba(0, *col, 0.2 * heat)
        g.add_color_stop_rgba(1, *col, 0)
        ctx.set_source(g)
        ctx.move_to(x, -50)
        ctx.line_to(x + 80, -50)
        ctx.line_to(x + 330, 1100)
        ctx.line_to(x + 170, 1100)
        ctx.close_path()
        ctx.fill()
    g = cairo.LinearGradient(0, 880, 0, 1080)
    g.add_color_stop_rgb(0, *hx("#2a2018"))
    g.add_color_stop_rgb(1, *hx("#120c08"))
    ctx.set_source(g)
    ctx.rectangle(-1200, 880, 4400, 600)
    ctx.fill()
    embers(ctx, t, 0.6 * heat)


def embers(ctx, t, a=0.6, n=40, seed=0):
    if a <= 0:
        return
    rnd = random.Random(seed)
    for i in range(n):
        ph = (t * rnd.uniform(0.08, 0.2) + rnd.random()) % 1
        x = rnd.uniform(-200, 2100) + 40 * math.sin(t + i)
        y = 1100 - ph * 1200
        ell(ctx, x, y, 3, 3)
        ctx.set_source_rgba(1, rnd.uniform(0.4, 0.7), 0.15, a * (1 - ph))
        ctx.fill()


def bg_medical(ctx, t, flick=0.0):
    C.sky(ctx, hx("#3a4446"), hx("#1e2426"))
    ctx.set_source_rgba(0, 0, 0, 0.15)
    for i in range(-10, 40):
        ctx.rectangle(i * 70, -300, 2, 1300)
        ctx.rectangle(-800, i * 70, 3600, 2)
    ctx.fill()
    for x in (500, 1400):
        on = 1.0 if random.Random(int(t * 10) + x).random() > flick else 0.3
        ctx.rectangle(x - 160, 40, 320, 24)
        ctx.set_source_rgba(0.9, 1, 1, on)
        ctx.fill()
        g = cairo.LinearGradient(x, 64, x, 900)
        g.add_color_stop_rgba(0, 0.85, 1, 1, 0.22 * on)
        g.add_color_stop_rgba(1, 0.85, 1, 1, 0)
        ctx.set_source(g)
        ctx.move_to(x - 160, 64)
        ctx.line_to(x + 160, 64)
        ctx.line_to(x + 400, 900)
        ctx.line_to(x - 400, 900)
        ctx.close_path()
        ctx.fill()
    ctx.rectangle(-800, 880, 3600, 400)
    src(ctx, hx("#2a3032"))
    ctx.fill()


def exam_table(ctx, x, y, covered=True, w=520):
    ctx.rectangle(x - w / 2, y - 30, w, 30)
    fs(ctx, hx("#8a9294"), 4)
    for sx in (-1, 1):
        ctx.rectangle(x + sx * (w / 2 - 40) - 10, y, 20, 120)
        fs(ctx, hx("#6a7274"), 3)
    if covered:  # small figure under a sheet
        ctx.new_path()
        ctx.move_to(x - w / 2 + 40, y - 30)
        ctx.curve_to(x - w / 2 + 60, y - 90, x - w / 2 + 140, y - 100, x - w / 2 + 170, y - 70)
        ctx.curve_to(x, y - 80, x + 120, y - 70, x + w / 2 - 60, y - 60)
        ctx.line_to(x + w / 2 - 40, y - 30)
        ctx.close_path()
        fs(ctx, hx("#e8ecec"), 4)


def cryo_pod(ctx, x, y, s, t, who=None, light=1.0, red=0.0, burn=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    rrect(ctx, -130, -440, 260, 440, 40)
    fs(ctx, hx("#5a646a"), 5)
    rrect(ctx, -105, -415, 210, 390, 34)
    col = C.mix((0.45, 0.75, 1.0), (1.0, 0.3, 0.2), red)
    ctx.set_source_rgba(*col, 0.35 * light)
    ctx.fill_preserve()
    ctx.restore()
    if who:
        ctx.save()
        rrect(ctx, x - 105 * s, y - 415 * s, 210 * s, 390 * s, 34 * s)
        ctx.clip()
        A3[who].draw(ctx, x, y - 30 * s, s * (0.62 if who != "newt" else 0.95), t=t, blink=1, expr="neutral")
        ctx.restore()
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    g = cairo.LinearGradient(-105, -415, 105, -25)
    g.add_color_stop_rgba(0, 1, 1, 1, 0.3)
    g.add_color_stop_rgba(0.5, 1, 1, 1, 0.0)
    g.add_color_stop_rgba(1, 1, 1, 1, 0.12)
    ctx.set_source(g)
    rrect(ctx, -105, -415, 210, 390, 34)
    ctx.fill()
    if burn > 0:  # acid burn mark
        ell(ctx, 40, -260, 40 * burn, 30 * burn)
        ctx.set_source_rgba(0.15, 0.12, 0.08, 0.9)
        ctx.fill()
        ell(ctx, 40, -260, 26 * burn, 18 * burn)
        ctx.set_source_rgba(0.7, 0.9, 0.2, 0.5 + 0.3 * math.sin(t * 6))
        ctx.fill()
    ctx.restore()


def furnace(ctx, x, y, s, t, k=1.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    rrect(ctx, -320, -520, 640, 520, 20)
    fs(ctx, hx("#2a2018"), 6)
    ctx.rectangle(-220, -360, 440, 360)
    fs(ctx, hx("#140a06"), 5)
    g = cairo.RadialGradient(0, -120, 20, 0, -150, 360)
    g.add_color_stop_rgba(0, 1, 0.9, 0.5, k)
    g.add_color_stop_rgba(0.5, 1, 0.45, 0.1, k * 0.9)
    g.add_color_stop_rgba(1, 0.6, 0.1, 0.0, k * 0.3)
    ctx.set_source(g)
    ctx.rectangle(-210, -350, 420, 350)
    ctx.fill()
    rnd = random.Random(int(t * 12))
    for i in range(10):
        fx = rnd.uniform(-190, 190)
        h = rnd.uniform(80, 260) * k
        ctx.move_to(fx - 30, 0)
        ctx.line_to(fx, -h)
        ctx.line_to(fx + 30, 0)
        ctx.close_path()
        ctx.set_source_rgba(1, rnd.uniform(0.4, 0.8), 0.1, 0.8)
        ctx.fill()
    ctx.restore()
    if k > 0:
        g = cairo.RadialGradient(x, y - 150 * s, 50, x, y - 150 * s, 900 * s)
        g.add_color_stop_rgba(0, 1, 0.5, 0.15, 0.35 * k)
        g.add_color_stop_rgba(1, 1, 0.5, 0.15, 0)
        ctx.set_source(g)
        ctx.paint()


def molten_pit(ctx, x, y, w, t, k=1.0):
    g = cairo.LinearGradient(0, y, 0, y + 200)
    g.add_color_stop_rgb(0, 1, 0.85 * k + 0.1, 0.4 * k)
    g.add_color_stop_rgb(1, 0.6, 0.12, 0.02)
    ctx.set_source(g)
    ctx.rectangle(x - w / 2, y, w, 600)
    ctx.fill()
    ctx.set_line_width(4)
    for i in range(12):
        ctx.new_path()
        for xx in range(int(x - w / 2), int(x + w / 2), 30):
            ctx.line_to(xx, y + 20 + i * 18 + 6 * math.sin(xx * 0.02 + t * 2 + i))
        ctx.set_source_rgba(1, 0.95, 0.6, 0.25)
        ctx.stroke()
    g = cairo.RadialGradient(x, y, 20, x, y, w)
    g.add_color_stop_rgba(0, 1, 0.6, 0.2, 0.45)
    g.add_color_stop_rgba(1, 1, 0.6, 0.2, 0)
    ctx.set_source(g)
    ctx.paint()
    embers(ctx, t, 0.8, 50, seed=7)


def big_fan(ctx, x, y, r, t, speed=6.0):
    ell(ctx, x, y, r * 1.08, r * 1.08)
    fs(ctx, hx("#2a2420"), 8)
    ell(ctx, x, y, r, r)
    src(ctx, hx("#0c0a08"))
    ctx.fill()
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(t * speed)
    for k in range(4):
        ctx.rotate(PI / 2)
        ctx.new_path()
        ctx.move_to(0, 0)
        ctx.curve_to(r * 0.4, -r * 0.2, r * 0.9, -r * 0.15, r * 0.95, r * 0.12)
        ctx.curve_to(r * 0.6, r * 0.15, r * 0.3, r * 0.1, 0, 0)
        fs(ctx, hx("#5a4a3a"), 4)
    ctx.restore()
    ell(ctx, x, y, r * 0.12, r * 0.12)
    fs(ctx, hx("#3a3028"), 4)


def tunnel(ctx, t, flick=0.0, red=0.0):
    """Claustrophobic maintenance tunnel in one-point perspective."""
    vx, vy = 960, 500
    C.sky(ctx, C.mix(hx("#1a1612"), hx("#2a0606"), red), hx("#060504"))
    for k in range(14):
        f = 0.82 ** k
        w, h = 1400 * f, 1000 * f
        rrect(ctx, vx - w / 2, vy - h / 2, w, h, 60 * f)
        ctx.set_line_width(max(1.5, 34 * f))
        c = 0.18 + 0.08 * (k % 2)
        ctx.set_source_rgba(c, c * 0.8, c * 0.6, 1)
        ctx.stroke()
    on = 1.0 if random.Random(int(t * 8)).random() > flick else 0.2
    g = cairo.RadialGradient(vx, vy - 60, 10, vx, vy, 700)
    col = (1, 0.2, 0.1) if red > 0.5 else AMBER
    g.add_color_stop_rgba(0, *col, 0.35 * on)
    g.add_color_stop_rgba(1, *col, 0)
    ctx.set_source(g)
    ctx.paint()
    ctx.set_source_rgba(0.6, 0.7, 0.8, 0.4)  # dripping condensation
    for i in range(10):
        ph = (t * 0.7 + i * 0.13) % 1
        ell(ctx, 300 + i * 150, ph * 900, 3, 7)
        ctx.fill()


def scrapyard(ctx, t):
    bg_foundry(ctx, t, heat=0.5)
    rnd = random.Random(44)
    for i in range(22):
        x = rnd.uniform(-200, 2100)
        y = rnd.uniform(800, 1000)
        w, h = rnd.uniform(100, 260), rnd.uniform(60, 180)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rnd.uniform(-0.4, 0.4))
        rrect(ctx, -w / 2, -h, w, h, 10)
        fs(ctx, rnd.choice([hx("#4a3a2c"), hx("#3a3a3a"), hx("#5a4a3a"), hx("#2e2a26")]), 4)
        ctx.restore()
    ctx.set_line_width(5)  # hanging chains
    for x in (300, 900, 1500):
        for j in range(12):
            ell(ctx, x + 4 * math.sin(t + x), j * 30, 8, 14)
            src(ctx, hx("#5a4a3a"))
            ctx.stroke()


def bishop_head(ctx, x, y, s, t, talk=0.0, glitch=0.0):
    """Damaged android head on a table, wires trailing (white synthetic fluid, not blood)."""
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    for k in range(6):
        ctx.new_path()
        ctx.move_to(-30 + k * 12, 80)
        ctx.curve_to(-60 + k * 30, 160, -200 + k * 40, 140, -260 + k * 60, 200)
        ctx.set_line_width(6)
        src(ctx, [hx("#c03030"), hx("#3060c0"), hx("#e8c040"), hx("#40a060"), hx("#a0a0a0"), hx("#e8e8e8")][k])
        ctx.stroke()
    A3["bishop"]._head(ctx, 64, dict(t=t, expr="sad" if talk < 0.5 else "shock", blink=0))
    ctx.set_source_rgba(0.95, 0.95, 0.9, 0.9)
    ell(ctx, 10, 70, 60, 14)
    ctx.fill()
    ctx.set_line_width(3)  # damage seam
    src(ctx, INK)
    ctx.move_to(-50, -40)
    ctx.line_to(-20, -10)
    ctx.line_to(-40, 20)
    ctx.stroke()
    ctx.restore()


def monitor(ctx, x, y, w, h, t, lines, color=WY_GREEN, scan=None, k=1.0):
    rrect(ctx, x - 20, y - 20, w + 40, h + 40, 16)
    fs(ctx, hx("#2a2c2e"), 6)
    ctx.rectangle(x, y, w, h)
    src(ctx, hx("#041008"))
    ctx.fill()
    ctx.save()
    ctx.rectangle(x, y, w, h)
    ctx.clip()
    if scan:
        scan(ctx, x, y, w, h, t)
    for i, ln in enumerate(lines):
        n = int(min(len(ln), max(0, (k * 1.5 - i * 0.3)) * 40))
        if n > 0:
            text(ctx, ln[:n], x + w / 2, y + 60 + i * 60, 40, color, "Liberation Mono", outline=0)
    ctx.set_source_rgba(0, 0, 0, 0.25)
    for yy in range(int(y), int(y + h), 6):
        ctx.rectangle(x, yy, w, 2)
    ctx.fill()
    ctx.restore()


def embryo_scan(k):
    """Green anatomical scan revealing a curled Queen embryo in stages (k: 0..1)."""
    def fn(ctx, x, y, w, h, t):
        cx, cy = x + w / 2, y + h / 2 + 20
        ctx.set_line_width(4)
        ctx.set_source_rgba(0.4, 1, 0.55, 0.55)
        ell(ctx, cx, cy - h * 0.38, 70, 80)  # head outline
        ctx.stroke()
        ctx.move_to(cx - 200, cy - h * 0.2)
        ctx.curve_to(cx - 220, cy + h * 0.2, cx - 160, cy + h * 0.45, cx - 120, cy + h * 0.5)
        ctx.move_to(cx + 200, cy - h * 0.2)
        ctx.curve_to(cx + 220, cy + h * 0.2, cx + 160, cy + h * 0.45, cx + 120, cy + h * 0.5)
        ctx.stroke()
        for i in range(7):  # ribs
            yy = cy - h * 0.15 + i * 32
            ctx.move_to(cx - 10, yy)
            ctx.curve_to(cx - 80, yy - 20, cx - 160, yy, cx - 170, yy + 20)
            ctx.move_to(cx + 10, yy)
            ctx.curve_to(cx + 80, yy - 20, cx + 160, yy, cx + 170, yy + 20)
        ctx.stroke()
        ctx.move_to(cx, cy - h * 0.25)
        ctx.line_to(cx, cy + h * 0.45)
        ctx.stroke()
        if k > 0:  # the embryo: curled body, ridged head, tail
            a = min(1, k * 1.4)
            ctx.save()
            ctx.translate(cx + 10, cy + 40)
            ctx.set_source_rgba(0.6, 1, 0.65, 0.95 * a)
            ctx.set_line_width(7)
            ctx.new_path()
            ctx.arc(0, 0, 70, PI * 0.2, PI * (0.2 + 1.6 * a))
            ctx.stroke()
            if k > 0.4:
                ctx.new_path()
                ctx.move_to(30, -70)
                ctx.curve_to(80, -110, 140, -90, 130, -40)
                ctx.curve_to(110, -40, 80, -50, 60, -40)
                ctx.close_path()
                ctx.fill()
                for i in range(5):  # crest ridges
                    ctx.move_to(60 + i * 14, -80)
                    ctx.line_to(70 + i * 16, -110)
                ctx.stroke()
            ctx.restore()
            g = cairo.RadialGradient(cx, cy + 40, 10, cx, cy + 40, 200)
            g.add_color_stop_rgba(0, 0.5, 1, 0.6, 0.25 * a * (0.6 + 0.4 * math.sin(t * 3)))
            g.add_color_stop_rgba(1, 0.5, 1, 0.6, 0)
            ctx.set_source(g)
            ctx.paint()
    return fn


def vents_schematic(ctx, R, k, red=0.0):
    """Overhead plan of the ventilation route (amber), turning red when the plan fails."""
    W, H, u = R.W, R.H, R.u
    x0, y0, w, h = W * 0.12, H * 0.2, W * 0.76, H * 0.55
    rrect(ctx, x0, y0, w, h, 12)
    fs(ctx, hx("#0c1a24"), 4)
    ctx.set_line_width(1)
    ctx.set_source_rgba(0.4, 0.7, 0.9, 0.25)
    for i in range(30):
        ctx.move_to(x0 + i * w / 30, y0)
        ctx.line_to(x0 + i * w / 30, y0 + h)
    for j in range(16):
        ctx.move_to(x0, y0 + j * h / 16)
        ctx.line_to(x0 + w, y0 + j * h / 16)
    ctx.stroke()
    pts = [(0.05, 0.2), (0.35, 0.2), (0.35, 0.7), (0.65, 0.7), (0.65, 0.35), (0.92, 0.35)]
    ctx.set_line_width(26 * u)
    ctx.set_source_rgba(0.5, 0.6, 0.7, 0.6)
    ctx.new_path()
    for px, py in pts:
        ctx.line_to(x0 + px * w, y0 + py * h)
    ctx.stroke()
    col = C.mix(AMBER, (1, 0.1, 0.05), red)
    total = len(pts) - 1
    ctx.set_line_width(12 * u)
    ctx.set_source_rgba(*col, 1)
    ctx.new_path()
    prog = k * total
    for i in range(total):
        if prog <= 0:
            break
        f = min(1, prog)
        a, b = pts[i], pts[i + 1]
        ctx.move_to(x0 + a[0] * w, y0 + a[1] * h)
        ctx.line_to(x0 + lerp(a[0], b[0], f) * w, y0 + lerp(a[1], b[1], f) * h)
        prog -= 1
    ctx.stroke()
    ctx.rectangle(x0 + 0.9 * w, y0 + 0.25 * h, 0.08 * w, 0.2 * h)
    ctx.set_line_width(4)
    ctx.set_source_rgba(0.9, 0.9, 0.9, 0.8)
    ctx.stroke()
    text(ctx, "CONTAINMENT", x0 + 0.94 * w, y0 + 0.5 * h, 20 * u, (0.9, 0.9, 0.9), outline=0)


def maze_plan(ctx, R, k):
    W, H, u = R.W, R.H, R.u
    x0, y0, w, h = W * 0.1, H * 0.18, W * 0.8, H * 0.6
    rrect(ctx, x0, y0, w, h, 12)
    fs(ctx, hx("#141a22"), 4)
    rnd = random.Random(3)
    ctx.set_line_width(6)
    ctx.set_source_rgba(0.6, 0.65, 0.7, 0.7)
    for i in range(1, 8):
        ctx.move_to(x0 + i * w / 8, y0 + (0.1 if i % 2 else 0.4) * h)
        ctx.line_to(x0 + i * w / 8, y0 + (0.6 if i % 2 else 0.95) * h)
    ctx.stroke()
    path = [(0.03, 0.85), (0.19, 0.85), (0.19, 0.25), (0.44, 0.25), (0.44, 0.8), (0.69, 0.8), (0.69, 0.3), (0.93, 0.3)]
    total = len(path) - 1
    prog = k * total
    ctx.set_line_width(10 * u)
    ctx.set_source_rgb(1, 0.3, 0.25)
    ctx.new_path()
    for i in range(total):
        if prog <= 0:
            break
        f = min(1, prog)
        a, b = path[i], path[i + 1]
        ctx.move_to(x0 + a[0] * w, y0 + a[1] * h)
        ctx.line_to(x0 + lerp(a[0], b[0], f) * w, y0 + lerp(a[1], b[1], f) * h)
        prog -= 1
    ctx.stroke()
    for i, (px, py) in enumerate(path[1:-1]):  # doors
        closed = k * total > i + 1.3
        ctx.rectangle(x0 + px * w - 14, y0 + py * h - 14, 28, 28)
        ctx.set_source_rgb(*(hx("#c03030") if closed else hx("#e8e8e8")))
        ctx.fill()
    ell(ctx, x0 + 0.95 * w, y0 + 0.3 * h, 50 * u, 50 * u)
    ctx.set_source_rgb(1, 0.6, 0.15)
    ctx.fill()
    text(ctx, "LEAD MOLD", x0 + 0.95 * w, y0 + 0.3 * h + 80 * u, 22 * u, (1, 0.8, 0.5), outline=0)


# ------------------------------------------------------------------ branding & titles
TITLES = ["THE HAPPY ENDING WAS A LIE", "WHY RIPLEY DEMANDS NEWT'S AUTOPSY", "THE PRISONERS AND THEIR RELIGIOUS CODE",
          "A DIFFERENT KIND OF XENOMORPH", "BISHOP KNOWS WHAT REALLY HAPPENED", "THE MONSTER THAT REFUSED TO KILL RIPLEY",
          "A PRISON WITH NO WEAPONS", "THE QUEEN INSIDE HER BODY", "THE COMPANY WANTS HER ALIVE", "DILLON'S FINAL PLAN",
          "DILLON'S SACRIFICE AND THE MOLTEN LEAD", "THE LAST THING WEYLAND-YUTANI WILL EVER GET"]


def brand(ctx, x, y, size, a=1.0):
    ctx.push_group()
    text(ctx, "DON'T SPOIL IT", x, y, size, BONE, "Liberation Serif", outline=size * 0.06)
    w = C.text_width(ctx, "DON'T SPOIL IT", size, "Liberation Serif")
    rrect(ctx, x + w / 2 + size * 0.15, y - size * 0.55, size * 1.2, size * 1.05, size * 0.18)
    C.fs(ctx, RUST, size * 0.05)
    text(ctx, "RG", x + w / 2 + size * 0.75, y - size * 0.02, size * 0.7, (1, 1, 1), outline=size * 0.04)
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(a)


def scene_header(ctx, R, n, t):
    W, H, u = R.W, R.H, R.u
    a = ap(t, 0.2, 0.5)
    if a <= 0:
        return
    ctx.push_group()
    ctx.rectangle(0, 0, W, 64 * u)
    ctx.set_source_rgba(0, 0, 0, 0.55)
    ctx.fill()
    text(ctx, f"{n}. {TITLES[n - 1]}", 30 * u, 33 * u, 30 * u, hx("#ffe14a"), outline=3 * u, anchor="l")
    text(ctx, "DON'T SPOIL IT RG", W - 30 * u, 33 * u, 20 * u, (1, 1, 1, 0.7), outline=0, anchor="r")
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(a)


def warm(ctx, R, a=0.18):
    ctx.set_source_rgba(0.55, 0.28, 0.08, a)
    ctx.set_operator(cairo.OPERATOR_SOFT_LIGHT)
    ctx.paint()
    ctx.set_operator(cairo.OPERATOR_OVER)


def vhs(ctx, R, t, k):
    if k <= 0:
        return
    rnd = random.Random(int(t * 24))
    for i in range(int(6 * k)):
        y = rnd.uniform(0, R.H)
        ctx.rectangle(0, y, R.W, rnd.uniform(2, 12))
        ctx.set_source_rgba(rnd.random(), 1, rnd.random(), 0.12 * k)
        ctx.fill()


def black_frame(ctx, R, t, t0, d=0.25):
    if t0 <= t < t0 + d:
        tint(ctx, R, (0, 0, 0), 1.0)


# ====================================================================== scenes
def S1(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_fire, t_launch, t_crash, t_surv, t_gone = (p.cue("an electrical fire"), p.cue("Their escape vehicle"), p.cue("crashes onto"),
                                                 p.cue("Ripley survives"), p.cue("Everything she fought"))

    def space(ctx, R, lt):
        with cam(ctx, R, 960, 540, 1.0 + 0.04 * lt / 10, vfx=V(R, 960, 1000)):
            bg_space(ctx, t)
            sulaco(ctx, 960 + 20 * math.sin(t * 0.1), 560, 1.4, t)
        grade(ctx, R, strength=0.6)
        if t < 5:
            a = ap(t, 0.2, 0.8) * (1 - ap(t, 4.2, 0.6))
            brand(ctx, W / 2, H * 0.3, V(R, 110, 80) * u, a)
            ctx.push_group()
            text(ctx, "EPISODE 3", W / 2, H * V(R, 0.46, 0.38), 40 * u, hx("#e0a080"), outline=3 * u)
            text(ctx, "ALIEN 3 (1992)", W / 2, H * V(R, 0.57, 0.45), V(R, 90, 70) * u, BONE, "Liberation Serif", outline=6 * u)
            text(ctx, "FULL SPOILERS · FAN RECAP · NOT AFFILIATED WITH 20TH CENTURY STUDIOS", W / 2, H * V(R, 0.67, 0.52),
                 22 * u, (1, 1, 1, 0.75), outline=0, bold=False)
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(a)

    def pods(ctx, R, lt):
        fire = ap(t, t_fire, 0.6)
        with cam(ctx, R, 960, 560, 1.0 + 0.05 * lt / 8, vfx=V(R, 960, 820)):
            C.sky(ctx, C.mix(hx("#1a2a3a"), hx("#3a0a0a"), fire), hx("#0a1018"))
            for i, who in enumerate(("ripley", "newt", "hicks", "bishop")):
                cryo_pod(ctx, 380 + i * 390, 960, 1.0, t, who, light=1, red=fire)
            if fire > 0:
                rnd = random.Random(int(t * 15))
                for i in range(8):  # sparks from a burning cable
                    sx, sy = 1500 + rnd.uniform(-40, 40), 160 + rnd.uniform(-20, 20)
                    ctx.move_to(sx, sy)
                    ctx.line_to(sx + rnd.uniform(-80, 80), sy + rnd.uniform(20, 140))
                    ctx.set_line_width(3)
                    ctx.set_source_rgba(1, 0.85, 0.3, 0.9)
                    ctx.stroke()
                ctx.set_line_width(10)
                src(ctx, INK)
                ctx.move_to(1100, 150)
                ctx.curve_to(1300, 220, 1450, 120, 1700, 170)
                ctx.stroke()
                ell(ctx, 1500, 165, 50 * fire, 40 * fire)
                ctx.set_source_rgba(1, 0.45, 0.1, 0.85)
                ctx.fill()
        if fire > 0 and int(t * 3) % 2 == 0:
            tint(ctx, R, (0.8, 0.0, 0.0), 0.18 * fire)
        grade(ctx, R, strength=0.6)

    def launch(ctx, R, lt):
        with cam(ctx, R, 960, 540, 1.0, vfx=V(R, 960, lerp(900, 1400, min(1, lt / 2)))):
            bg_space(ctx, t)
            sulaco(ctx, 700, 500, 1.1, t, fire=0.6)
            eev(ctx, lerp(900, 2200, min(1, lt / 3)), lerp(560, 760, min(1, lt / 3)), 1.0, 0.15, fire=0.8, t=t)
        grade(ctx, R, strength=0.6)

    def crash(ctx, R, lt):
        k = min(1, lt / 3)
        with cam(ctx, R, 960, 540, 1.0 + 0.03 * math.sin(lt * 30) * k, vfx=V(R, 960, lerp(400, 1300, k))):
            bg_planet(ctx, t, prison=True)
            eev(ctx, lerp(200, 1400, k), lerp(-100, 760, k ** 1.5), 0.9, 0.6 + lt * 2, fire=1.0, t=t)
        grade(ctx, R, strength=0.6)
        flash(ctx, R, lt, 3.0, 0.4, (1, 0.8, 0.5))
        badge(ctx, W / 2, H * 0.14, "FIORINA 161", 44 * u, BONE, hx("#5a2a14"))

    def found(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 900)):
            bg_planet(ctx, t, prison=False)
            eev(ctx, 1400, 860, 1.6, 0.4, t=t)
            smoke(ctx, 1400, 830, t, 0.9, seed=4)
            ctx.save()
            ctx.translate(900, 990)
            ctx.rotate(-PI / 2)
            A3["ripley"].draw(ctx, 0, 0, 0.7, t=t, blink=1, expr="neutral")
            ctx.restore()
            for i in range(3):
                prisoner(i).draw(ctx, 300 + i * 200, 1000, 0.75, t=t + i, expr="shock", look=1, hold={"R": "flashlight"},
                                 armR=75, elbowR=10)
        ctx.set_source_rgba(0.5, 0.5, 0.5, 0.35 * ap(lt, 0, 3))
        ctx.set_operator(cairo.OPERATOR_HSL_SATURATION)
        ctx.paint()
        ctx.set_operator(cairo.OPERATOR_OVER)
        grade(ctx, R, strength=0.7)

    def gone(ctx, R, lt):
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            C.sky(ctx, hx("#06080c"), hx("#141820"))
            for i, who in enumerate(("newt", "hicks", "bishop")):
                cryo_pod(ctx, 560 + i * 400, 960, 0.95, t, who, light=1 - ap(lt, 0.5 + i * 0.6, 1.0))
        grade(ctx, R, strength=0.8)
        if lt > 1.5:
            text(ctx, "EVERYTHING... GONE", W / 2, H * V(R, 0.16, 0.14), V(R, 96, 70) * u, BONE, "Liberation Serif", outline=6 * u)

    shots(ctx, R, t, [(0, space), (p.cue("While everyone"), pods), (t_launch, launch), (t_crash, crash), (t_surv, found), (t_gone, gone)])
    if t > 5:
        scene_header(ctx, R, 1, t - 5)


def S2(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_notice, t_aut, t_none, t_crem = p.cue("But Ripley notices"), p.cue("That's why"), p.cue("No embryo"), p.cue("but Ripley still insists")

    def morgue(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.03 * lt / 10, vfx=V(R, 960, 760)):
            bg_medical(ctx, t, flick=0.05)
            exam_table(ctx, 960, 880)
            A3["ripley"].draw(ctx, 620, 1010, 0.9, t=t, expr="sad", look=1, tears=True)
            A3["clemens"].draw(ctx, 1350, 1010, 0.9, t=t, facing=-1, expr="sad", look=-1)
        grade(ctx, R, strength=0.6)
        lower_third(ctx, R, lt, 0.8, "CLEMENS", "the prison doctor", 3.5)

    def damage(ctx, R, lt):
        with cam(ctx, R, 1000, 640, 1.6 + 0.1 * lt / 6, vfx=1000):
            C.sky(ctx, hx("#141c22"), hx("#0a0e12"))
            cryo_pod(ctx, 1000, 1080, 1.4, t, None, light=0.6, burn=ap(lt, 0.5, 1.5))
        grade(ctx, R, strength=0.7)
        badge(ctx, W / 2, H * 0.14, "SUSPICIOUS DAMAGE", 44 * u, BONE, hx("#5a4a14"))

    def autopsy(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.1, vfx=960):
            bg_medical(ctx, t)
            exam_table(ctx, 960, 880)
            A3["clemens"].draw(ctx, 1200, 1010, 0.9, t=t, facing=-1, expr="neutral", look=-1, armR=60, elbowR=60)
            A3["ripley"].draw(ctx, 650, 1010, 0.9, t=t, expr="angry", look=1)
        grade(ctx, R, strength=0.6)
        text(ctx, "AUTOPSY" if t < t_none else "NO EMBRYO FOUND", W / 2, H * V(R, 0.2, 0.16), V(R, 90, 66) * u,
             BONE if t < t_none else WY_GREEN, "Liberation Serif", outline=6 * u)

    def cremate(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.02 * lt, vfx=V(R, 960, 960)):
            bg_foundry(ctx, t, heat=1.0)
            furnace(ctx, 960, 900, 1.2, t, k=ap(lt, 0.3, 1.0))
            A3["ripley"].draw(ctx, 520, 1010, 0.85, t=t, expr="sad", look=1, tears=True)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.14, "SHE REFUSES TO TAKE ANOTHER CHANCE", 40 * u, BONE, RUST)

    shots(ctx, R, t, [(0, morgue), (t_notice, damage), (t_aut, autopsy), (t_crem, cremate)])
    scene_header(ctx, R, 2, t)


def S3(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_hall, t_code, t_arr, t_guns, t_dillon = (p.cue("It's an aging"), p.cue("These men"), p.cue("Ripley's arrival"),
                                               p.cue("Even more dangerous"), p.cue("And although Dillon"))

    def exterior(ctx, R, lt):
        with cam(ctx, R, 960, lerp(380, 560, min(1, lt / 4)), 1.0 + 0.1 * min(1, lt / 4), vfx=960):
            bg_planet(ctx, t, prison=True)
        grade(ctx, R, strength=0.6)
        glow_title(ctx, "FIORINA 161", W / 2, H * V(R, 0.2, 0.16), V(R, 110, 80) * u, t, color=hx("#ffb070"))

    def hall(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(300, 1600, min(1, lt / 6)))):
            bg_foundry(ctx, t)
            for i in range(7):
                prisoner(i).draw(ctx, 200 + i * 250, 1010 + (i % 2) * 20, 0.78, t=t + i, expr="cold", look=0)
            A3["andrews"].draw(ctx, 1780, 1000, 0.85, t=t, facing=-1, expr="angry", look=-1)
        warm(ctx, R)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.14, "A FOUNDRY RUN FOR WEYLAND-YUTANI", 40 * u, BONE, hx("#3a2a1a"))

    def dillon(ctx, R, lt):
        with cam(ctx, R, 960, lerp(560, 430, min(1, lt / 4)), 1.5, vfx=960):
            bg_foundry(ctx, t)
            A3["dillon"].draw(ctx, 960, 1060, 1.0, t=t, expr="cold", look=0)
        warm(ctx, R, 0.25)
        grade(ctx, R, strength=0.7)
        lower_third(ctx, R, lt, 0.5, "DILLON", "leader of the prisoners' faith", 4)

    def shave(ctx, R, lt):
        k = ap(lt, 0.6, 2.4)
        with cam(ctx, R, 960, 470, 1.6, vfx=960):
            bg_medical(ctx, t)
            key = "ripley" if k < 0.5 else "ripley_bald"
            h = A3[key].draw(ctx, 960, 1060, 1.0, t=t, expr="sad", look=0.3)
            if k < 1:
                hx_, hy_ = h["head"]
                cx = hx_ + lerp(-60, 60, (math.sin(lt * 3) + 1) / 2)
                rrect(ctx, cx - 24, hy_ - 120, 48, 90, 10)  # clippers
                C.fs(ctx, hx("#2a2a2e"), 3)
                for i in range(8):
                    ph = (t * 1.2 + i / 8) % 1
                    ell(ctx, cx + 30 * math.sin(i), hy_ - 60 + ph * 400, 6, 3)
                    ctx.set_source_rgba(0.23, 0.14, 0.09, 1 - ph)
                    ctx.fill()
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.14, "SHE THREATENS THEIR ROUTINE", 40 * u, BONE, hx("#3a2a1a"))

    def no_guns(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_foundry(ctx, t, heat=0.6)
            ctx.rectangle(560, 300, 800, 520)  # empty weapons rack
            C.fs(ctx, hx("#2a2420"), 6)
            for i in range(6):
                ctx.rectangle(620 + i * 120, 360, 20, 400)
                C.fs(ctx, hx("#3a3028"), 3)
        grade(ctx, R, strength=0.6)
        k = ap(lt, 0.4, 0.3)
        ctx.set_line_width(22 * u)
        ctx.set_source_rgba(0.9, 0.1, 0.1, 0.85 * k)
        ell(ctx, W / 2, H * 0.52, 260 * u, 260 * u)
        ctx.stroke()
        ctx.move_to(W / 2 - 180 * u, H * 0.52 - 180 * u)
        ctx.line_to(W / 2 + 180 * u, H * 0.52 + 180 * u)
        ctx.stroke()
        text(ctx, "NO GUNS", W / 2, H * V(R, 0.16, 0.14), 100 * u, BONE, "Liberation Serif", outline=7 * u)

    def stand(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            bg_foundry(ctx, t)
            A3["ripley_bald"].draw(ctx, 760, 1010, 0.9, t=t, expr="angry", look=1)
            A3["dillon"].draw(ctx, 1180, 1030, 0.95, t=t, facing=-1, expr="cold", look=-1)
        warm(ctx, R)
        grade(ctx, R, strength=0.65)

    shots(ctx, R, t, [(0, exterior), (t_hall, hall), (t_code, dillon), (t_arr, shave), (t_guns, no_guns), (t_dillon, stand)])
    scene_header(ctx, R, 3, t)


def S4(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_dog, t_new, t_first, t_murphy, t_still = (p.cue("A facehugger"), p.cue("The resulting alien"), p.cue("Its first attacks"),
                                                p.cue("One maintenance worker"), p.cue("And the prison still"))

    def funeral(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1250)):
            bg_foundry(ctx, t)
            furnace(ctx, 640, 900, 1.0, t)
            A3["dillon"].draw(ctx, 1250, 1020, 0.9, t=t, expr="sad", look=-0.5, armL=60, armR=60, elbowL=60, elbowR=60)
            for i in range(3):
                prisoner(i + 7).draw(ctx, 1500 + i * 160, 1020, 0.75, t=t + i, expr="sad", look=-1)
        warm(ctx, R)
        grade(ctx, R, strength=0.65)

    def dog(ctx, R, lt):
        with cam(ctx, R, 960, 640, 1.5, vfx=960):
            bg_foundry(ctx, t, heat=0.7)
            wolf(ctx, 860, 1000, 0.6, t, hx("#5a3a24"))
            facehugger(ctx, 860 + 0.6 * 360, 1000 - 0.6 * 470, 0.6, t)
        grade(ctx, R, strength=0.75)
        badge(ctx, W / 2, H * 0.14, "A FACEHUGGER FOUND A HOST: A DOG", 40 * u, BONE, hx("#3a2a1a"))

    def reveal(ctx, R, lt):
        with cam(ctx, R, 960, 600, 1.0, vfx=V(R, 960, lerp(300, 1500, min(1, lt / 7)))):
            bg_foundry(ctx, t, heat=0.7)
            xeno(ctx, lerp(100, 1700, min(1, lt / 7)), 1000, 0.85, t, walk=t * 7, jaw=0.3)
        grade(ctx, R, strength=0.7)
        if lt > 1:
            text(ctx, "IT RUNS ON FOUR LEGS", W / 2, H * V(R, 0.2, 0.16), V(R, 80, 60) * u, BONE, "Liberation Serif", outline=6 * u)

    def ceiling(ctx, R, lt):
        with cam(ctx, R, 960, 500, 1.0, vfx=960):
            tunnel(ctx, t, flick=0.3)
            ctx.save()
            ctx.translate(960, 300)
            ctx.scale(1, -1)
            xeno(ctx, lerp(1500, 700, min(1, lt / 5)) - 960, 0, 0.8, t, walk=t * 6, facing=-1)
            ctx.restore()
        grade(ctx, R, strength=0.8)

    def murphy(ctx, R, lt):
        hit = ap(lt, 2.6, 0.15)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 800)):
            tunnel(ctx, t, flick=0.2)
            big_fan(ctx, 1250, 520, 330, t, speed=8)
            if hit < 1:
                A3["murphy"].draw(ctx, 760, 1010, 0.85, t=t, expr="scared" if lt > 1.5 else "neutral", look=1,
                                  hold={"R": "flashlight"}, armR=75, elbowR=10)
            if 1.2 < lt < 2.7:
                ctx.set_source_rgba(0, 0, 0, 0.7)  # creature's shadow on the wall
                ell(ctx, 1500, 520, 260, 90)
                ctx.fill()
            poof(ctx, 760, 760, t, ap(lt, 2.6, 1.4) * 1.3, (0.3, 0.25, 0.22))
        grade(ctx, R, strength=0.75)
        black_frame(ctx, R, lt, 2.6)
        lower_third(ctx, R, lt, 0.3, "MURPHY", "maintenance worker", 2.2)

    def quiet(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_foundry(ctx, t, heat=0.5)
            for i in range(4):
                prisoner(i + 10).draw(ctx, 350 + i * 420, 1010, 0.75, t=t + i, expr="neutral", look=0)
        grade(ctx, R, strength=0.75)
        badge(ctx, W / 2, H * 0.14, "NO ONE KNOWS WHAT'S HUNTING THEM", 40 * u, BONE, hx("#3a1a14"))

    shots(ctx, R, t, [(0, funeral), (t_dog, dog), (t_new, reveal), (t_first, ceiling), (t_murphy, murphy), (t_still, quiet)])
    scene_header(ctx, R, 4, t)


def S5(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_corner, t_rec, t_conf, t_dist, t_why = (p.cue("But several prisoners"), p.cue("After recovering"), p.cue("His findings"),
                                              p.cue("Even more disturbing"), p.cue("Ripley is beginning"))

    def search(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(500, 1100, min(1, lt / 5)))):
            scrapyard(ctx, t)
            A3["ripley_bald"].draw(ctx, lerp(400, 1000, min(1, lt / 5)), 1010, 0.85, t=t, walk=t * 4, expr="neutral", look=1)
            bishop_head(ctx, 1450, 940, 0.7, t)
        grade(ctx, R, strength=0.7)

    def corner(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.05, vfx=V(R, 960, 960)):
            scrapyard(ctx, t)
            A3["ripley_bald"].draw(ctx, 960, 1010, 0.85, t=t, expr="scared", look=-1)
            for i, x in enumerate((640, 1260, 1460)):
                prisoner(i + 20).draw(ctx, x, 1015, 0.85, t=t + i, facing=1 if x < 960 else -1, expr="angry",
                                      look=1 if x < 960 else -1)
            if lt > 2:
                A3["dillon"].draw(ctx, lerp(-200, 400, ap(lt, 2, 1.0)), 1020, 0.95, t=t, expr="angry", look=1,
                                  walk=t * 5 if lt < 3 else None)
        grade(ctx, R, strength=0.75)
        if lt > 2.5:
            badge(ctx, W / 2, H * 0.14, "DILLON STEPS IN", 44 * u, BONE, hx("#3a2a1a"))

    def bishop(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.25, vfx=960):
            bg_medical(ctx, t)
            ctx.rectangle(500, 720, 920, 40)
            C.fs(ctx, hx("#5a5a5a"), 4)
            g = cairo.RadialGradient(960, 300, 20, 960, 600, 700)  # green examination lamp
            g.add_color_stop_rgba(0, 0.4, 1, 0.5, 0.35)
            g.add_color_stop_rgba(1, 0.4, 1, 0.5, 0)
            ctx.set_source(g)
            ctx.paint()
            bishop_head(ctx, 960, 640, 1.2, t, talk=1 if lt > 1.5 else 0)
            A3["ripley_bald"].draw(ctx, 560, 1080, 0.85, t=t, expr="neutral", look=1)
        grade(ctx, R, strength=0.65)
        vhs(ctx, R, t, 0.6 + 0.4 * math.sin(t * 3))

    def recorder(ctx, R, lt, lines):
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            C.sky(ctx, hx("#06100a"), hx("#020604"))
            monitor(ctx, 360, 180, 1200, 680, t, lines, k=ap(lt, 0.2, 2.0),
                    scan=(lambda c, x, y, w, h, tt: xeno(c, x + w * 0.55, y + h * 0.9, 0.45, tt, alpha=0.35,
                                                         color=hx("#2a6a3a"))) if "ALIEN" in lines[0] else None)
        grade(ctx, R, strength=0.6)
        vhs(ctx, R, t, 0.7)

    shots(ctx, R, t, [(0, search), (t_corner, corner), (t_rec, bishop),
                      (t_conf, lambda c, r, lt: recorder(c, r, lt, ["FLIGHT RECORDER: SULACO", "BIO-SIGNATURE ON BOARD",
                                                                    "STATUS: ALIEN ABOARD EEV"])),
                      (t_dist, lambda c, r, lt: recorder(c, r, lt, ["DATA TRANSMITTED TO:", "WEYLAND-YUTANI", "", "THEY WANT IT."])),
                      (t_why, bishop)])
    scene_header(ctx, R, 5, t)


def S6(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_and, t_inf, t_next, t_leave, t_mom = (p.cue("But Superintendent"), p.cue("Then the creature"), p.cue("What happens next"),
                                            p.cue("and simply leaves"), p.cue("Moments later"))

    def tunnels(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            tunnel(ctx, t, flick=0.4)
            if lt < 3:
                for i in range(2):
                    prisoner(i + 30).draw(ctx, 700 + i * 380, 1010, 0.8, t=t + i, expr="scared" if lt > 2 else "neutral",
                                          hold={"R": "flashlight"}, armR=75, elbowR=10, look=1)
            else:
                A3["golic"].draw(ctx, 960, 1010, 0.9, t=t, expr="scared", look=0, blink=0)
        grade(ctx, R, strength=0.8)
        black_frame(ctx, R, lt, 2.6, 0.4)
        if lt > 3.2:
            lower_third(ctx, R, lt, 3.2, "GOLIC", "the traumatized survivor", 3)

    def andrews(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1100)):
            bg_medical(ctx, t)
            A3["andrews"].draw(ctx, 1100, 1010, 0.92, t=t, facing=-1, expr="angry", look=-1, armR=70, elbowR=40)
            A3["ripley_bald"].draw(ctx, 700, 1010, 0.86, t=t, expr="angry", look=1)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.14, "ANDREWS: \"THERE IS NO MONSTER\"", 40 * u, BONE, hx("#2e3440"))

    def infirmary(ctx, R, lt):
        drop = ap(lt, 1.6, 0.35)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1100)):
            bg_medical(ctx, t, flick=0.2)
            ctx.rectangle(1000, 0, 260, 60)  # vent
            C.fs(ctx, hx("#1a1a1a"), 4)
            if drop < 1:
                A3["clemens"].draw(ctx, 1100, 1010, 0.9, t=t, expr="scared" if lt > 1.2 else "neutral", look=-0.3)
            if drop > 0:
                xeno(ctx, 1150, lerp(200, 1010, drop), 0.7, t, facing=-1, jaw=1)
            poof(ctx, 1100, 760, t, ap(lt, 1.95, 1.4) * 1.3, (0.3, 0.3, 0.3))
        grade(ctx, R, strength=0.7)
        black_frame(ctx, R, lt, 1.95, 0.3)

    def close(ctx, R, lt):
        k = ap(lt, 0, 8.0)
        with cam(ctx, R, 900, 470, 1.4 + 0.25 * k, vfx=900):
            bg_medical(ctx, t, flick=0.1)
            A3["ripley_bald"].draw(ctx, 760, 1010, 0.95, t=t, expr="scared", look=1, tears=True, lean=-5)
            xeno(ctx, lerp(1650, 1380, k), 1010, 0.75, t, facing=-1, jaw=0.6 + 0.2 * math.sin(t * 2), rear=0.7)
        ctx.set_source_rgba(0, 0, 0, 0.35)
        ctx.paint()
        grade(ctx, R, strength=0.85)

    def leaves(ctx, R, lt):
        with cam(ctx, R, 900, 500, 1.4, vfx=900):
            bg_medical(ctx, t, flick=0.1)
            A3["ripley_bald"].draw(ctx, 760, 1010, 0.95, t=t, expr="shock", look=1)
            xeno(ctx, lerp(1250, 2400, min(1, lt / 2.5)), 1010, 0.65, t, facing=1, walk=t * 6)
        grade(ctx, R, strength=0.8)
        if lt > 1:
            text(ctx, "IT LET HER LIVE.", W / 2, H * V(R, 0.2, 0.16), V(R, 90, 68) * u, BONE, "Liberation Serif", outline=6 * u)

    def andrews_dies(ctx, R, lt):
        pull = ap(lt, 2.4, 0.3)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1000)):
            bg_foundry(ctx, t, heat=0.6)
            ctx.rectangle(900, 0, 220, 70)
            C.fs(ctx, hx("#1a1a1a"), 4)
            A3["ripley_bald"].draw(ctx, 560, 1010, 0.85, t=t, expr="angry", look=1, armR=70, elbowR=20)
            A3["andrews"].draw(ctx, 1000, lerp(1010, 300, pull), 0.9, t=t, expr="scared" if pull > 0 else "angry", look=-0.5,
                               armL=150 * pull, armR=150 * pull)
            for i in range(3):
                prisoner(i + 40).draw(ctx, 1350 + i * 180, 1020, 0.78, t=t + i, facing=-1, expr="shock" if pull else "neutral", look=-1)
        grade(ctx, R, strength=0.7)
        black_frame(ctx, R, lt, 2.7, 0.35)

    shots(ctx, R, t, [(0, tunnels), (t_and, andrews), (t_inf, infirmary), (t_next, close), (t_leave, leaves), (t_mom, andrews_dies)])
    scene_header(ctx, R, 6, t)


def S7(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_no, t_prop, t_prep, t_flare, t_tears = (p.cue("Fiorina 161 has no"), p.cue("Ripley proposes"), p.cue("The prisoners begin"),
                                              p.cue("During an attack"), p.cue("Fire tears through"))

    def planning(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.02 * math.sin(lt * 0.5), vfx=V(R, 960, 960)):
            bg_foundry(ctx, t, heat=0.7)
            ctx.rectangle(560, 300, 800, 420)  # wall of diagrams
            C.fs(ctx, hx("#d8ccb0"), 5)
            ctx.set_line_width(4)
            src(ctx, hx("#3a3a3a"))
            for i in range(6):
                ctx.move_to(600 + i * 120, 340)
                ctx.line_to(640 + i * 110, 680)
            ctx.stroke()
            A3["ripley_bald"].draw(ctx, 400, 1010, 0.85, t=t, expr="angry", look=1, armR=80, elbowR=20)
            A3["dillon"].draw(ctx, 1500, 1030, 0.92, t=t, facing=-1, expr="cold", look=-1)
            A3["aaron"].draw(ctx, 1750, 1010, 0.82, t=t, facing=-1, expr="scared", look=-1)
        warm(ctx, R)
        grade(ctx, R, strength=0.6)

    def no_weapons(ctx, R, lt):
        g = cairo.LinearGradient(0, 0, 0, H)
        g.add_color_stop_rgb(0, *hx("#1e140c"))
        g.add_color_stop_rgb(1, *hx("#080402"))
        ctx.set_source(g)
        ctx.paint()
        items = ["PULSE RIFLES", "FLAMETHROWERS", "MILITARY GEAR"]
        for i, s in enumerate(items):
            a = ap(lt, 0.3 + i * 0.5, 0.3)
            if a <= 0:
                continue
            y = H * (V(R, 0.3, 0.25) + i * V(R, 0.17, 0.1))
            text(ctx, s, W / 2, y, V(R, 70, 54) * u, BONE, outline=5 * u)
            ctx.set_line_width(10 * u)
            ctx.set_source_rgba(0.9, 0.1, 0.1, a)
            w = C.text_width(ctx, s, V(R, 70, 54) * u)
            ctx.move_to(W / 2 - w / 2 - 20, y)
            ctx.line_to(W / 2 - w / 2 - 20 + (w + 40) * a, y)
            ctx.stroke()

    def plan(ctx, R, lt):
        ctx.set_source_rgb(0.02, 0.04, 0.06)
        ctx.paint()
        vents_schematic(ctx, R, ap(lt, 0.3, 4.0))
        text(ctx, "THE TRAP: DRIVE IT INTO CONTAINMENT", W / 2, H * 0.12, V(R, 50, 38) * u, BONE, outline=4 * u)

    def prep(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            tunnel(ctx, t)
            for i in range(3):
                prisoner(i + 50).draw(ctx, 520 + i * 450, 1010, 0.8, t=t + i, expr="neutral", look=0.3, armR=60, elbowR=70)
            ctx.set_source_rgba(0.6, 0.8, 0.3, 0.25)  # flammable residue on the walls
            for i in range(8):
                ell(ctx, 200 + i * 220, 760 + 30 * math.sin(i), 90, 30)
                ctx.fill()
        warm(ctx, R)
        grade(ctx, R, strength=0.7)

    def flare(ctx, R, lt):
        if lt < 1.6:
            with cam(ctx, R, 960, 560, 1.2, vfx=960):
                tunnel(ctx, t, flick=0.3)
                fy = lerp(300, 950, ease(lt / 1.4))
                ctx.save()
                ctx.translate(960, fy)
                ctx.rotate(lt * 6)
                rrect(ctx, -12, -50, 24, 100, 8)
                C.fs(ctx, hx("#c03030"), 3)
                ctx.restore()
                g = cairo.RadialGradient(960, fy - 50, 5, 960, fy - 50, 200)
                g.add_color_stop_rgba(0, 1, 0.4, 0.3, 0.9)
                g.add_color_stop_rgba(1, 1, 0.2, 0.1, 0)
                ctx.set_source(g)
                ctx.paint()
            grade(ctx, R, strength=0.8)
        else:
            ctx.set_source_rgb(0.02, 0.04, 0.06)
            ctx.paint()
            vents_schematic(ctx, R, 1.0, red=ap(lt, 1.6, 0.4))
            text(ctx, "THE FLARE IGNITES THE CHEMICALS", W / 2, H * 0.12, V(R, 50, 36) * u, hx("#ff5a3a"), outline=4 * u)

    def inferno(ctx, R, lt):
        with cam(ctx, R, 960, 540, 1.0 + 0.02 * math.sin(lt * 25), vfx=960):
            tunnel(ctx, t, red=1)
            k = min(1, lt / 1.5)
            for i in range(30):
                rnd = random.Random(i * 7 + int(t * 10))
                r = rnd.uniform(80, 260) * k
                ell(ctx, 960 + rnd.uniform(-800, 800) * k, 540 + rnd.uniform(-400, 400) * k, r, r)
                ctx.set_source_rgba(1, rnd.uniform(0.3, 0.8), 0.05, 0.55)
                ctx.fill()
            embers(ctx, t, 1.0, 80)
        grade(ctx, R, (0.2, 0.02, 0), 0.8)
        badge(ctx, W / 2, H * 0.14, "MANY PRISONERS DIE", 44 * u, BONE, hx("#5a0a0a"))

    shots(ctx, R, t, [(0, planning), (t_no, no_weapons), (t_prop, plan), (t_prep, prep), (t_flare, flare), (t_tears, inferno)])
    scene_header(ctx, R, 7, t)


def S8(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_scan, t_queen, t_sense, t_poss, t_real = (p.cue("and a medical scan"), p.cue("An Alien Queen"), p.cue("Suddenly"),
                                                p.cue("But this discovery"), p.cue("Ripley realizes"))

    def ill(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.2, vfx=900):
            bg_medical(ctx, t, flick=0.15)
            A3["ripley_bald"].draw(ctx, 900, 1010, 0.92, t=t, expr="sad", look=0, lean=4 * math.sin(t * 0.8), sit=True)
            A3["aaron"].draw(ctx, 1350, 1010, 0.85, t=t, facing=-1, expr="neutral", look=-1)
        grade(ctx, R, strength=0.7)
        lower_third(ctx, R, lt, 1.0, "AARON (\"85\")", "runs the scan", 3)

    def scan(ctx, R, lt):
        k = ap(lt, 0.8, 4.0)
        with cam(ctx, R, 960, 540, 1.0 + 0.05 * k, vfx=960):
            C.sky(ctx, hx("#020604"), hx("#000000"))
            monitor(ctx, V(R, 360, 560), 120, V(R, 1200, 800), 820, t, [], scan=embryo_scan(k))
        grade(ctx, R, strength=0.5)
        if t > t_queen:
            glow_title(ctx, "AN ALIEN QUEEN", W / 2, H * V(R, 0.9, 0.62), V(R, 84, 66) * u, t, color=WY_GREEN)

    def memory(ctx, R, lt):
        def fn(c, tt):
            bg_medical(c, tt)
            A3["ripley_bald"].draw(c, 760, 1010, 0.95, t=tt, expr="scared", look=1)
            xeno(c, 1380, 1010, 0.75, tt, facing=-1, jaw=0.6, rear=0.7)
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            C.sky(ctx, hx("#0a0806"), hx("#020100"))
        sepia_bubble(ctx, W / 2, H * 0.45, V(R, 360, 260) * u, fn, t)
        text(ctx, "NOT MERCY: PROTECTING ITS QUEEN", W / 2, H * V(R, 0.86, 0.64), V(R, 50, 38) * u, BONE, outline=4 * u)

    def breed(ctx, R, lt):
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            C.sky(ctx, hx("#0a1410"), hx("#020604"))
            for i in range(5):  # specimen tanks
                x = 260 + i * 350
                rrect(ctx, x - 110, 260, 220, 620, 40)
                C.fs(ctx, hx("#2a3a34"), 5)
                ctx.set_source_rgba(0.3, 0.9, 0.5, 0.25 + 0.1 * math.sin(t * 2 + i))
                rrect(ctx, x - 90, 280, 180, 580, 30)
                ctx.fill()
                xeno(ctx, x, 820, 0.2, t + i, alpha=0.7, color=hx("#0a1a10"))
        grade(ctx, R, strength=0.6)
        text(ctx, "COUNTLESS MORE", W / 2, H * V(R, 0.16, 0.14), V(R, 90, 66) * u, hx("#ff6a4a"), "Liberation Serif", outline=6 * u)

    def realize(ctx, R, lt):
        with cam(ctx, R, 960, 440, 1.7 + 0.05 * lt, vfx=960):
            bg_medical(ctx, t)
            A3["ripley_bald"].draw(ctx, 960, 1060, 1.0, t=t, expr="sad", look=0, tears=True)
        ctx.set_source_rgba(0, 0, 0, 0.4 * ap(lt, 0.5, 2))
        ctx.paint()
        grade(ctx, R, strength=0.8)

    shots(ctx, R, t, [(0, ill), (t_scan, scan), (t_sense, memory), (t_poss, breed), (t_real, realize)])
    scene_header(ctx, R, 8, t)


def S9(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_years, t_dec, t_asks, t_ref = p.cue("For years"), p.cue("Ripley decides"), p.cue("She approaches"), p.cue("But Dillon refuses")

    def message(ctx, R, lt):
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            C.sky(ctx, hx("#06100a"), hx("#020604"))
            monitor(ctx, 360, 180, 1200, 680, t, ["WEYLAND-YUTANI", "", "RECOVERY TEAM INBOUND", "PRIORITY: RIPLEY"], k=ap(lt, 0.2, 2.5))
        grade(ctx, R, strength=0.6)
        vhs(ctx, R, t, 0.4)

    def history(ctx, R, lt):
        with cam(ctx, R, 960, 440, 1.6, vfx=960):
            bg_foundry(ctx, t)
            A3["ripley_bald"].draw(ctx, 960, 1060, 1.0, t=t, expr="angry", look=0)
        grade(ctx, R, strength=0.7)
        for i, s in enumerate(("SPECIMEN", "PRIORITY ONE", "CREW EXPENDABLE")):  # corporate words drift over her face
            a = ap(lt, 0.4 + i * 0.6, 0.4) * 0.7
            ctx.push_group()
            text(ctx, s, W * (0.3 + 0.2 * i), H * (0.3 + 0.18 * i), 46 * u, WY_GREEN, "Liberation Mono", outline=0)
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(a)

    def asks(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.02 * lt, vfx=V(R, 960, 960)):
            bg_foundry(ctx, t)
            furnace(ctx, 960, 760, 0.8, t, 0.7)
            A3["ripley_bald"].draw(ctx, 720, 1010, 0.88, t=t, expr="sad", look=1, armR=40, elbowR=60)
            A3["dillon"].draw(ctx, 1220, 1030, 0.95, t=t, facing=-1, expr="sad" if t < t_ref else "angry", look=-1,
                              tilt=8 * math.sin(t * 5) if t > t_ref else 0)
        warm(ctx, R, 0.25)
        grade(ctx, R, strength=0.7)
        if t < t_ref and t > t_asks:
            badge(ctx, W / 2, H * 0.14, "\"KILL ME.\"", 50 * u, BONE, hx("#3a1a14"))
        elif t > t_ref:
            badge(ctx, W / 2, H * 0.14, "\"NOT UNTIL WE KILL IT.\"", 46 * u, BONE, hx("#3a2a1a"))

    shots(ctx, R, t, [(0, message), (t_years, history), (t_dec, asks)])
    scene_header(ctx, R, 9, t)


def S10(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_maze, t_bait, t_mis, t_wait = p.cue("The foundry contains"), p.cue("By using themselves"), p.cue("One mistake"), p.cue("But waiting")

    def rally(ctx, R, lt):
        with cam(ctx, R, 960, lerp(700, 520, min(1, lt / 6)), 1.2, vfx=V(R, 960, 960)):
            bg_foundry(ctx, t)
            A3["dillon"].draw(ctx, 960, 1060, 1.05, t=t, expr="angry", look=0, armR=110 + 15 * math.sin(t * 2), elbowR=20)
            for i in range(4):
                prisoner(i + 60).draw(ctx, 300 + i * 440 if i < 2 else 1100 + (i - 2) * 440, 1080, 0.85, t=t + i, expr="neutral",
                                      look=0)
        warm(ctx, R, 0.25)
        grade(ctx, R, strength=0.65)

    def blueprint(ctx, R, lt):
        ctx.set_source_rgb(0.03, 0.04, 0.06)
        ctx.paint()
        maze_plan(ctx, R, ap(lt, 0.3, 6.0))
        text(ctx, "THE PLAN: LURE IT, SEAL IT, POUR THE LEAD", W / 2, H * 0.11, V(R, 46, 34) * u, BONE, outline=4 * u)

    def runners(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(400, 1500, min(1, lt / 5)))):
            bg_foundry(ctx, t, red=1)
            for i in range(3):
                prisoner(i + 70).draw(ctx, lerp(-200, 2200, ((lt / 5) + i * 0.25) % 1), 1010, 0.8, t=t + i, walk=t * 9,
                                      expr="scared", look=1)
            dk = ap(lt % 2.5, 1.8, 0.3)
            ctx.rectangle(1500, lerp(-400, 360, dk), 260, 640)  # slamming door
            C.fs(ctx, hx("#3a3a3e"), 6)
        grade(ctx, R, strength=0.65)

    def mistake(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=960):
            bg_foundry(ctx, t, red=1)
            ctx.rectangle(780, 200, 360, 700)
            C.fs(ctx, hx("#3a3a3e"), 6)
            ctx.set_line_width(14)
            ctx.set_source_rgba(1, 0.85, 0.1, 0.8)
            for i in range(6):
                ctx.move_to(780 + i * 70, 200)
                ctx.line_to(780 + i * 70 + 60, 900)
            ctx.stroke()
        if int(t * 4) % 2 == 0:
            tint(ctx, R, (0.8, 0, 0), 0.2)
        grade(ctx, R, strength=0.7)
        badge(ctx, W / 2, H * 0.14, "ONE WRONG DOOR = DEATH", 44 * u, BONE, hx("#5a0a0a"))

    def ship(ctx, R, lt):
        with cam(ctx, R, 960, 540, 1.0, vfx=V(R, 960, lerp(400, 1200, min(1, lt / 4)))):
            bg_space(ctx, t)
            eev(ctx, lerp(200, 1300, min(1, lt / 4)), 540, 2.2, 0.0, fire=0.6, t=t)
        grade(ctx, R, strength=0.6)
        badge(ctx, W / 2, H * 0.14, "THE COMPANY IS COMING", 44 * u, BONE, hx("#2a3a2a"))

    shots(ctx, R, t, [(0, rally), (t_maze, blueprint), (t_bait, runners), (t_mis, mistake), (t_wait, ship)])
    scene_header(ctx, R, 10, t)


def S11(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_some, t_sac, t_even, t_water, t_shock = (p.cue("Somehow"), p.cue("Dillon makes"), p.cue("Even that"), p.cue("She activates"),
                                               p.cue("The resulting"))

    def chase(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.02 * math.sin(lt * 20), vfx=V(R, 960, lerp(300, 1600, min(1, lt / 6)))):
            bg_foundry(ctx, t, red=1)
            k = min(1, lt / 6)
            prisoner(80).draw(ctx, lerp(200, 2300, k), 1010, 0.8, t=t, walk=t * 10, expr="scared", look=1)
            xeno(ctx, lerp(-200, 1700, k), 1000, 0.8, t, walk=t * 10, jaw=0.4)
            for i in range(2):
                poof(ctx, 600 + i * 800, 760, t, ((lt + i) % 3) / 2, (0.3, 0.1, 0.08))
        grade(ctx, R, strength=0.65)
        badge(ctx, W / 2, H * 0.14, "THE CHASE BECOMES A MASSACRE", 42 * u, BONE, hx("#5a0a0a"))

    def mold(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 960)):
            bg_foundry(ctx, t, heat=1.2)
            ctx.rectangle(500, 860, 920, 220)  # the mold
            C.fs(ctx, hx("#3a2a20"), 6)
            xeno(ctx, 1100, 900, 0.6, t, facing=-1, jaw=0.6)
            A3["dillon"].draw(ctx, 760, 900, 0.9, t=t, expr="angry", look=1, armL=60, armR=60)
            A3["ripley_bald"].draw(ctx, 300, 350, 0.55, t=t, expr="scared", look=1)
            A3["morse"].draw(ctx, 1600, 350, 0.55, t=t, facing=-1, expr="scared", look=-1)
        warm(ctx, R, 0.25)
        grade(ctx, R, strength=0.6)
        lower_third(ctx, R, lt, 0.5, "MORSE", "at the lead controls", 3)

    def pour(ctx, R, lt):
        k = ap(lt, 0.5, 1.5)
        with cam(ctx, R, 960, lerp(400, 600, k), 1.0, vfx=V(R, 960, 960)):
            bg_foundry(ctx, t, heat=1.3)
            ctx.rectangle(500, 860, 920, 220)
            C.fs(ctx, hx("#3a2a20"), 6)
            ctx.push_group()
            A3["dillon"].draw(ctx, 760, 900, 0.9, t=t, expr="angry", look=0, armL=150, armR=150)
            xeno(ctx, 1100, 900, 0.6, t, facing=-1, jaw=1)
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(1 - ap(lt, 2.0, 1.0))
            ctx.rectangle(860, -100, 200 * k, 1000 * k)  # molten stream
            g = cairo.LinearGradient(0, -100, 0, 900)
            g.add_color_stop_rgb(0, 1, 0.9, 0.5)
            g.add_color_stop_rgb(1, 1, 0.45, 0.1)
            ctx.set_source(g)
            ctx.fill()
            if k > 0.5:
                molten_pit(ctx, 960, 870, 900, t, k)
        grade(ctx, R, (0.2, 0.04, 0), 0.7)
        badge(ctx, W / 2, H * 0.14, "DILLON'S SACRIFICE", 46 * u, BONE, RUST)

    def erupts(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.03 * math.sin(lt * 20), vfx=V(R, 960, 1100)):
            bg_foundry(ctx, t, heat=1.3)
            molten_pit(ctx, 960, 900, 1400, t)
            xeno(ctx, lerp(900, 1300, min(1, lt / 2)), lerp(1200, 900, min(1, lt / 1)), 0.75, t, facing=1, jaw=1, glow=1.0,
                 color=hx("#3a1a0c"))
            A3["ripley_bald"].draw(ctx, 1750, 1000, 0.8, t=t, facing=-1, expr="scared", look=-1)
        grade(ctx, R, (0.2, 0.04, 0), 0.7)
        text(ctx, "IT'S STILL ALIVE", W / 2, H * V(R, 0.2, 0.16), V(R, 90, 66) * u, hx("#ffb040"), "Liberation Serif", outline=6 * u)

    def water(ctx, R, lt):
        k = ap(lt, 0.4, 0.6)
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1000)):
            bg_foundry(ctx, t, heat=1.0)
            xeno(ctx, 1100, 1000, 0.75, t, facing=-1, jaw=1, glow=1 - k * 0.8, color=hx("#3a1a0c"))
            A3["ripley_bald"].draw(ctx, 500, 1000, 0.85, t=t, expr="angry", look=1, armR=150, elbowR=10)
            ctx.set_line_width(6)
            for i in range(40):  # sprinkler water
                x = 700 + (i % 20) * 50
                y = (t * 900 + i * 53) % 900
                ctx.move_to(x, y)
                ctx.line_to(x - 6, y + 40)
            ctx.set_source_rgba(0.7, 0.85, 1, 0.6 * k)
            ctx.stroke()
        if lt > 1.5:
            tint(ctx, R, (1, 1, 1), min(0.95, (lt - 1.5) * 0.8))
        grade(ctx, R, strength=0.5)

    def shatter(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1100)):
            bg_foundry(ctx, t, heat=0.6)
            if lt < 0.6:
                xeno(ctx, 1100, 1000, 0.75, t, facing=-1, jaw=1, color=hx("#5a5a5a"))
            rnd = random.Random(3)
            for i in range(40):  # cracked exoskeleton fragments
                a = rnd.uniform(0, 2 * PI)
                d = (lt - 0.6) * rnd.uniform(200, 700) if lt > 0.6 else 0
                x, y = 1150 + d * math.cos(a), 760 + d * math.sin(a) + 300 * max(0, lt - 0.6) ** 2
                ctx.save()
                ctx.translate(x, y)
                ctx.rotate(lt * rnd.uniform(-6, 6))
                ctx.new_path()
                ctx.move_to(-20, -10)
                ctx.line_to(25, -14)
                ctx.line_to(10, 20)
                ctx.close_path()
                C.fs(ctx, hx("#1a1a1e"), 3)
                ctx.restore()
            smoke(ctx, 1100, 900, t, 1.0)
        tint(ctx, R, (1, 1, 1), max(0, 0.9 - lt * 0.6))
        grade(ctx, R, strength=0.6)
        if lt > 1.2:
            text(ctx, "THERMAL SHOCK", W / 2, H * V(R, 0.2, 0.16), V(R, 96, 70) * u, BONE, "Liberation Serif", outline=6 * u)

    shots(ctx, R, t, [(0, chase), (t_some, mold), (t_sac, pour), (t_even, erupts), (t_water, water), (t_shock, shatter)])
    scene_header(ctx, R, 11, t)


def S12(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_claims, t_knows, t_viol, t_plat, t_falls, t_morse = (p.cue("He claims"), p.cue("Ripley knows"), p.cue("As the confrontation"),
                                                          p.cue("she reaches"), p.cue("Ripley falls"), p.cue("Morse survives"))

    def arrive(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, 1300)):
            bg_foundry(ctx, t, heat=1.2)
            for i in range(3):
                A3["trooper"].draw(ctx, lerp(2300, 1300 + i * 200, min(1, lt / 3)), 1010, 0.8, t=t + i,
                                   walk=t * 6 if lt < 3 else None, facing=-1, expr="cold", look=-1, hold={"R": "pistol"}, armR=60, elbowR=20)
            A3["bishop2"].draw(ctx, lerp(2100, 1100, min(1, lt / 3)), 1010, 0.85, t=t, walk=t * 6 if lt < 3 else None,
                               facing=-1, expr="neutral", look=-1)
        warm(ctx, R, 0.2)
        grade(ctx, R, strength=0.65)
        if lt > 2:
            badge(ctx, W / 2, H * 0.14, "A MAN WHO LOOKS EXACTLY LIKE BISHOP", 40 * u, BONE, hx("#2a2a30"))

    def offer(ctx, R, lt):
        with cam(ctx, R, 960, 520, 1.15, vfx=V(R, 960, 960)):
            bg_foundry(ctx, t, heat=1.2)
            A3["bishop2"].draw(ctx, 1150, 1010, 0.9, t=t, facing=-1, expr="happy", look=-1, armR=70, elbowR=10)
            A3["ripley_bald"].draw(ctx, 740, 1010, 0.88, t=t, expr="cold" if t > t_knows else "sad", look=1)
        warm(ctx, R, 0.2)
        grade(ctx, R, strength=0.65)
        badge(ctx, W / 2, H * 0.14, "\"WE CAN REMOVE IT.\"" if t < t_knows else "SHE DOESN'T TRUST HIM", 44 * u, BONE, hx("#2a2a30"))

    def violent(ctx, R, lt):
        hit = ap(lt, 1.0, 0.2)
        with cam(ctx, R, 960, 560, 1.0 + 0.02 * math.sin(lt * 25), vfx=V(R, 960, 960)):
            bg_foundry(ctx, t, heat=1.2)
            A3["bishop2"].draw(ctx, 1100, 1010, 0.88, t=t, facing=-1, expr="shock" if hit else "angry", look=-1, tilt=20 * hit)
            if lt < 1.8:
                A3["aaron"].draw(ctx, 820, 1010, 0.85, t=t, expr="angry", look=1, armR=lerp(150, 70, hit), elbowR=10,
                                 hold={"R": "baton"})
            A3["trooper"].draw(ctx, 1500, 1010, 0.82, t=t, facing=-1, expr="angry", look=-1, hold={"R": "pistol"}, armR=88, elbowR=0)
            A3["morse"].draw(ctx, 400, 1010, 0.82, t=t, expr="scared" if lt > 1.8 else "angry", look=1, kneel=0.4 * ap(lt, 2.2, 0.3))
            if 1.6 < lt < 2.4 and int(lt * 10) % 2 == 0:
                C.muzzle(ctx, 1290, 610, 1.0, t)
        grade(ctx, R, strength=0.65)
        badge(ctx, W / 2, H * 0.14, "AARON FIGHTS BACK", 44 * u, BONE, hx("#5a0a0a"))

    def platform(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0 + 0.03 * lt, vfx=V(R, 960, 960)):
            bg_foundry(ctx, t, heat=1.4)
            molten_pit(ctx, 960, 900, 1600, t)
            ctx.rectangle(760, 520, 420, 26)  # raised platform
            C.fs(ctx, hx("#3a3028"), 5)
            for x in (790, 1150):
                ctx.rectangle(x - 8, 546, 16, 400)
                C.fs(ctx, hx("#2a2018"), 3)
            A3["ripley_bald"].draw(ctx, 960, 520, 0.6, t=t, expr="cold", look=0)
        grade(ctx, R, (0.2, 0.04, 0), 0.7)

    def fall(ctx, R, lt):
        k = ease(min(1, lt / 4.0))
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            C.sky(ctx, hx("#5a1a06"), hx("#ffb040"))
            g = cairo.RadialGradient(960, 900, 50, 960, 900, 1100)
            g.add_color_stop_rgba(0, 1, 0.85, 0.5, 0.8)
            g.add_color_stop_rgba(1, 1, 0.5, 0.1, 0)
            ctx.set_source(g)
            ctx.paint()
            molten_pit(ctx, 960, 980, 2400, t)
            ctx.save()  # Ripley as a dark silhouette, arms out, falling backwards
            ctx.translate(960, lerp(760, 1180, k))
            ctx.rotate(-0.2 * k)
            ctx.push_group()
            A3["ripley_bald"].draw(ctx, 0, 0, 0.95, t=t, armL=95, armR=95, elbowL=0, elbowR=0, expr="neutral", blink=1)
            ctx.set_operator(cairo.OPERATOR_ATOP)
            ctx.set_source_rgba(0.05, 0.02, 0.02, 0.92)
            ctx.paint()
            ctx.set_operator(cairo.OPERATOR_OVER)
            ctx.pop_group_to_source()
            ctx.paint()
            ctx.restore()
            embers(ctx, t, 1.0, 80, seed=2)
        grade(ctx, R, (0.2, 0.04, 0), 0.7)
        if lt > 4:
            tint(ctx, R, (1, 0.6, 0.2), min(0.9, (lt - 4) * 0.6))

    def ending(ctx, R, lt):
        with cam(ctx, R, 960, 560, 1.0, vfx=V(R, 960, lerp(700, 1300, min(1, lt / 4)))):
            bg_planet(ctx, t, prison=True)
            A3["morse"].draw(ctx, lerp(700, 1300, min(1, lt / 4)), 1000, 0.75, t=t, walk=t * 3, expr="sad", look=1)
        grade(ctx, R, strength=0.75)
        badge(ctx, W / 2, H * 0.14, "MORSE SURVIVES · THE PRISON CLOSES", 40 * u, BONE, hx("#2a2a2a"))
        a = ap(lt, 5.0, 1.0)
        if a > 0:
            tint(ctx, R, (0, 0, 0), a)
            brand(ctx, W / 2, H * 0.42, V(R, 110, 80) * u, ap(lt, 5.5, 1.0))
            ctx.push_group()
            text(ctx, "Did Alien 3 give Ripley the right ending? Comment below.", W / 2, H * V(R, 0.58, 0.5), V(R, 38, 32) * u, BONE,
                 outline=3 * u)
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(ap(lt, 6.0, 1.0))

    shots(ctx, R, t, [(0, arrive), (t_claims, offer), (t_viol, violent), (t_plat, platform), (t_falls, fall), (t_morse, ending)])
    scene_header(ctx, R, 12, t)


LONG = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12]

# ---------------------------------------------------------------- pipeline
A3_PROG = [("D", [50, 53, 57]), ("Bb", [46, 50, 53]), ("G", [43, 46, 50]), ("A", [45, 49, 52]),
           ("D", [50, 53, 57, 62]), ("F", [41, 45, 48]), ("G", [43, 46, 50, 55]), ("A", [45, 49, 52, 57])]
CFG = {"long": (1920, 1080, False, LONG)}
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
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "24",
                           "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for f in range(int(round(p.dur * FPS))):
        gm.frame(ctx, R, scenes, i, p, f / FPS, grain)
        surf.flush()
        ff.stdin.write(surf.get_data())
    ff.stdin.close()
    if ff.wait() != 0:
        raise RuntimeError(f"ffmpeg failed for scene {i}")
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
    step = os.environ.get("CHECK")  # CHECK=n renders every n-th frame (crash test), saves nothing
    for i, p in enumerate(paras):
        if only and str(i) not in only.split(","):
            continue
        if step:
            for f in range(0, int(p.dur * FPS), int(step)):
                gm.frame(ctx, R, scenes, i, p, f / FPS, grain)
            print("checked", i, flush=True)
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
    redo = os.environ.get("ONLY")
    if redo:
        jobs = [j for j in jobs if str(j[0]) in redo.split(",") or not os.path.exists(j[1])]
    with Pool(4) as pool:
        for r in pool.imap_unordered(render_scene, jobs):
            print("done", r, flush=True)
    parts = [f"[{i}:a]aresample=48000,adelay={int(LEAD * 1000)}:all=1,apad=whole_dur={p.dur:.3f}[a{i}]" for i, p in enumerate(paras)]
    inputs = sum([["-i", f"{vo_dir}/{i:02d}.wav"] for i in range(len(paras))], [])
    fc = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(len(paras))) + f"concat=n={len(paras)}:v=0:a=1[vo]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "[vo]", f"{work}/vo.wav"], check=True)
    gm.music(f"{work}/music.wav", total, prog=A3_PROG, bpm=58)
    # industrial drone bed under the score
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                    "-f", "lavfi", "-i", f"anoisesrc=color=brown:amplitude=0.5:d={total:.2f}:r=48000",
                    "-f", "lavfi", "-i", f"sine=f=41:d={total:.2f}:r=48000",
                    "-filter_complex", "[0]lowpass=f=160,volume=0.12[n];[1]volume=0.06,tremolo=f=0.15:d=0.7[s];"
                    f"[n][s]amix=inputs=2:normalize=0,afade=t=in:d=2,afade=t=out:st={total - 3:.2f}:d=3[amb]",
                    "-map", "[amb]", f"{work}/amb.wav"], check=True)
    with open(f"{work}/list.txt", "w") as fh:
        for i in range(len(paras)):
            fh.write(f"file 's{i:02d}.mp4'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{work}/list.txt",
                    "-i", f"{work}/vo.wav", "-i", f"{work}/music.wav", "-i", f"{work}/amb.wav",
                    "-filter_complex", "[1]aresample=48000,asplit=2[v][sc];[2]aresample=48000,volume=0.5[m];[3]volume=0.7[b];"
                    "[m][b]amix=inputs=2:normalize=0[bed];"
                    "[bed][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];"
                    "[v][md]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                    "-shortest", out], check=True)
    print("wrote", out, round(total, 1), "s")


if __name__ == "__main__":
    main()
