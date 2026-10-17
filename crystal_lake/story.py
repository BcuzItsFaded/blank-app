"""Cartoon version of the Crystal Lake explainer and Short.

usage: python story.py long|short VO_DIR SCRIPT OUT        (render)
       python story.py still long|short VO_DIR SCRIPT DIR  (preview stills)
"""
import math, os, random, subprocess, sys
from contextlib import contextmanager
from multiprocessing import Pool

import cairo
import numpy as np

import cartoon as C
from cartoon import CAST, hx, ease, lerp, text, horror_title, plaque
from render import Para, wav_len, LEAD, TAIL

FPS = 30
RED = hx("#d81e1e")
BONE = hx("#f4ead2")


def ap(t, t0, d=0.5):
    return ease((t - t0) / d)


class Rd:
    def __init__(self, W, H, vertical):
        self.W, self.H, self.vertical = W, H, vertical
        self.u = min(W, H) / 1080


@contextmanager
def cam(ctx, R, fx=960, fy=540, zoom=1.0, vfx=None):
    """Stage camera. In vertical mode the 1920x1080 stage is scaled to full height and centred on vfx."""
    ctx.save()
    if R.vertical:
        s = R.H / 1080 * zoom
        fx = vfx if vfx is not None else fx
    else:
        s = zoom
    ctx.translate(R.W / 2, R.H / 2)
    ctx.scale(s, s)
    ctx.translate(-fx, -fy)
    yield
    ctx.restore()


def pick(t, cuts):
    """cuts: [(start, fn), ...] -> (fn, local_t) for the active one."""
    cur = cuts[0]
    for c in cuts:
        if t >= c[0]:
            cur = c
    return cur[1], t - cur[0], cur[0]


def grade(ctx, R, color=(0, 0, 0), strength=0.75):
    g = cairo.RadialGradient(R.W / 2, R.H / 2, min(R.W, R.H) * 0.35, R.W / 2, R.H / 2, max(R.W, R.H) * 0.75)
    g.add_color_stop_rgba(0, *color, 0)
    g.add_color_stop_rgba(1, *color, strength)
    ctx.set_source(g)
    ctx.paint()


def tint(ctx, R, rgb, a):
    ctx.set_source_rgba(*rgb, a)
    ctx.rectangle(0, 0, R.W, R.H)
    ctx.fill()


def flash(ctx, R, t, t0, d=0.18, rgb=(1, 1, 1)):
    if t0 <= t < t0 + d:
        tint(ctx, R, rgb, 0.8 * (1 - (t - t0) / d))


def sepia_bubble(ctx, cx, cy, r, fn, t):
    """Memory bubble: clip a circle, draw fn inside, sepia wash + soft edge."""
    ctx.save()
    C.ell(ctx, cx, cy, r * 1.25, r)
    ctx.clip()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(r / 420, r / 420)
    ctx.translate(-960, -620)
    fn(ctx, t)
    ctx.restore()
    ctx.set_source_rgba(0.55, 0.4, 0.2, 0.35)
    ctx.paint()
    g = cairo.RadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.25)
    g.add_color_stop_rgba(0, 1, 0.95, 0.85, 0)
    g.add_color_stop_rgba(1, 1, 0.95, 0.85, 0.85)
    ctx.set_source(g)
    ctx.paint()
    ctx.restore()
    C.ell(ctx, cx, cy, r * 1.25, r)
    ctx.set_line_width(6)
    ctx.set_source_rgba(1, 0.95, 0.85, 0.9)
    ctx.stroke()


def badge(ctx, x, y, s, size, fg=(1, 1, 1), bg=RED, pad=None):
    pad = pad or size * 0.45
    w = C.text_width(ctx, s, size) + pad * 2
    h = size * 1.5
    C.rrect(ctx, x - w / 2, y - h / 2, w, h, h * 0.3)
    C.fs(ctx, bg, size * 0.08)
    text(ctx, s, x, y - size * 0.02, size, fg, outline=size * 0.06)


def stamp(ctx, R, s, t, t0, x, y, size, rot=-0.12, color=(0.75, 0.08, 0.08)):
    if t < t0:
        return
    k = min(1, (t - t0) / 0.2)
    sc = 1.8 - 0.8 * k
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(sc, sc)
    w = C.text_width(ctx, s, size, "Liberation Mono") + size
    C.rrect(ctx, -w / 2, -size * 0.85, w, size * 1.7, 12)
    ctx.set_line_width(size * 0.12)
    ctx.set_source_rgba(*color, k)
    ctx.stroke()
    text(ctx, s, 0, 0, size, (*color, k), "Liberation Mono", outline=0)
    ctx.restore()


# ====================================================================== shots (stage space)
def s_lake_sign(ctx, t, title=True):
    C.bg_lake(ctx, t, dock=True, sign=True)


def s_dock_pam(ctx, t, expr="sad", hold=True):
    C.bg_lake(ctx, t, dock=True)
    CAST["pam"].draw(ctx, 960, 900, 0.95, t=t, expr=expr, look=0.4, armR=28 if hold else 6, elbowR=70 if hold else 12,
                     hold={"R": "photo"} if hold else None)


def s_underwater(ctx, t, heal=0.0, sink=True):
    C.bg_underwater(ctx, t)
    y = 640 + (min(t, 6) * 30 if sink else 0)
    ctx.save()
    ctx.translate(960, y - 200)
    ctx.rotate(0.25 * math.sin(t * 0.8))
    ctx.translate(-960, -(y - 200))
    if heal > 0:
        for k in range(3):
            r = 220 + 60 * k + 30 * math.sin(t * 4 + k)
            g = cairo.RadialGradient(960, y - 200, 20, 960, y - 200, r)
            g.add_color_stop_rgba(0, 0.4, 1, 0.5, 0.35 * heal)
            g.add_color_stop_rgba(1, 0.4, 1, 0.5, 0)
            ctx.set_source(g)
            ctx.arc(960, y - 200, r, 0, 2 * math.pi)
            ctx.fill()
    CAST["jason_kid"].draw(ctx, 960, y, 1.0, t=t, expr="scared" if heal < 0.5 else "neutral", blink=0 if heal < 0.5 else None,
                           armL=120 + 20 * math.sin(t * 3), armR=120 + 20 * math.cos(t * 3), elbowL=30, elbowR=30)
    ctx.restore()
    C.bubbles(ctx, t, 960, y - 300, 16, seed=1)
    if heal > 0:
        rnd = random.Random(2)
        for i in range(24):  # healing cells
            a = rnd.uniform(0, 2 * math.pi) + t * 0.6
            r = rnd.uniform(120, 300)
            x, yy = 960 + r * math.cos(a), y - 200 + r * math.sin(a) * 0.9
            C.ell(ctx, x, yy, 9, 9)
            ctx.set_source_rgba(0.5, 1, 0.6, heal * (0.5 + 0.5 * math.sin(t * 5 + i)))
            ctx.fill()


def s_shore(ctx, t):
    C.bg_lake(ctx, t, dock=False, moon_xy=(500, 220))
    ctx.new_path()
    ctx.move_to(-800, 1100)
    ctx.line_to(-800, 800)
    ctx.curve_to(400, 760, 900, 820, 2800, 700)
    ctx.line_to(2800, 1100)
    ctx.close_path()
    C.src(ctx, hx("#141c12"))
    ctx.fill()
    for i in range(40):  # reeds
        x = 200 + i * 45
        ctx.move_to(x, 860 - i * 3)
        ctx.line_to(x + 8 * math.sin(t + i), 760 - i * 3 - (i % 3) * 20)
        ctx.set_line_width(4)
        C.src(ctx, hx("#22341e"))
        ctx.stroke()
    x = lerp(700, 1500, min(1, t / 7))
    wet = max(0, 1 - t / 3)
    CAST["jason_kid"].draw(ctx, x, 900 - (x - 700) * 0.12, 0.9, t=t, walk=t * 5, expr="sad", look=1)
    if wet > 0:
        for i in range(6):
            ph = (t * 1.5 + i / 6) % 1
            C.ell(ctx, x - 40 + i * 16, 700 + ph * 200, 4, 7)
            ctx.set_source_rgba(0.7, 0.9, 1, wet * (1 - ph))
            ctx.fill()


def s_growth(ctx, t, k):
    """Kid Jason grows into the huge sack-head Jason (k: 0..1)."""
    C.bg_woods(ctx, t)
    a = ease(k * 1.6)
    b = ease((k - 0.55) / 0.45)
    if b < 1:
        ctx.push_group()
        CAST["jason_kid"].draw(ctx, 960, 1020, 0.9 + 0.9 * a, t=t, expr="angry")
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(1 - b)
    if b > 0:
        ctx.push_group()
        CAST["jason"].draw(ctx, 960, 1060, 0.85, t=t)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(b)
    # height marks on a tree
    ctx.rectangle(1380, -100, 90, 1200)
    C.fs(ctx, hx("#2a2016"), 4)
    for i, (lbl, hgt) in enumerate((("5", 260), ("10", 480), ("??", 760))):
        y = 1020 - hgt
        ctx.move_to(1380, y)
        ctx.line_to(1440, y)
        ctx.set_line_width(5)
        ctx.set_source_rgba(0.9, 0.85, 0.7, 0.8)
        ctx.stroke()
        text(ctx, lbl, 1500, y, 30, BONE, outline=3, anchor="l")


def s_lineup(ctx, t, p, R=None):
    C.sky(ctx, hx("#3a3f4a"), hx("#23262e"))
    for i in range(10):
        y = 1000 - i * 90
        ctx.move_to(-800, y)
        ctx.line_to(2800, y)
        ctx.set_line_width(3)
        ctx.set_source_rgba(1, 1, 1, 0.25)
        ctx.stroke()
        text(ctx, f"{i}'", 40, y - 20, 26, (1, 1, 1, 0.45), outline=0)
    ctx.rectangle(-800, 1000, 3600, 200)
    C.src(ctx, hx("#16181d"))
    ctx.fill()
    order = [("pam", "Pam isn't", "Pamela Voorhees", "Linda Cardellini"),
             ("levon", "Levon Brooks", "Levon Brooks", "William Catlett"),
             ("dorf", "Dorf", "Dorf", "Cameron Scoggins"),
             ("briana", "Briana Brooks", "Briana Brooks", "Devin Kessler"),
             ("ralph", "Crazy Ralph", "Crazy Ralph", "Nick Cordileone"),
             ("grace", "And Grace", "Grace", "Gwendolyn Sundstrom")]
    for i, (key, cue, name, actor) in enumerate(order):
        t0 = p.cue(cue)
        a = ap(t, t0, 0.6)
        if a <= 0:
            continue
        x = 220 + i * 296
        xs = lerp(x - 350, x, a)
        kw = dict(t=t, expr={"pam": "sad", "ralph": "scared", "grace": "neutral", "levon": "neutral", "dorf": "neutral",
                             "briana": "neutral"}[key], look=-1 if a < 1 else 0)
        if a < 1:
            kw["walk"] = t * 7
        if key == "ralph":
            kw.update(hold={"R": "shotgun"}, armR=10, elbowR=60)
        if key == "briana":
            kw.update(hold={"R": "envelope"}, armR=20, elbowR=70)
        CAST[key].draw(ctx, xs, 1000, 0.82 if key != "grace" else 0.9, **kw)
        # name card held at chest height
        ap2 = ap(t, t0 + 0.5, 0.4)
        if ap2 > 0:
            ctx.save()
            ctx.translate(x, 1000 - (0.82 if key != "grace" else 0.9) * (560 if key not in ("grace",) else 420) - 70)
            ctx.scale(ap2, ap2)
            C.rrect(ctx, -140, -30, 280, 74, 10)
            C.fs(ctx, hx("#101114"), 4)
            text(ctx, name, 0, -6, 27, BONE, outline=0)
            text(ctx, actor, 0, 24, 21, hx("#e08a8a"), outline=0, bold=False)
            ctx.restore()


def s_grace_house(ctx, t, sinister=0.0):
    C.bg_house(ctx, t, window_on=sinister < 0.6 or (int(t * 14) % 3 == 0 and sinister < 0.95))
    # silhouettes in the left window: mother raising a hand over Grace
    wx = 1060
    ctx.save()
    ctx.rectangle(wx, 470, 150, 170)
    ctx.clip()
    C.src(ctx, hx("#2a1a10"))
    C.ell(ctx, wx + 50, 530, 22, 26)
    ctx.fill()
    ctx.rectangle(wx + 28, 555, 46, 100)
    ctx.fill()
    raise_ = 0.5 + 0.5 * math.sin(t * 2.5)
    ctx.move_to(wx + 66, 570)
    ctx.line_to(wx + 110, 520 - 30 * raise_)
    ctx.set_line_width(14)
    ctx.stroke()
    C.ell(ctx, wx + 118, 600, 15, 17)
    ctx.fill()
    ctx.rectangle(wx + 104, 615, 28, 40)
    ctx.fill()
    ctx.restore()
    # tree + Pam watching
    ctx.rectangle(470, -100, 110, 1000)
    C.fs(ctx, hx("#1a130e"), 5)
    CAST["pam"].draw(ctx, 680, 960, 0.75, t=t, expr="angry" if sinister < 0.1 else "cold", look=1, armL=40, elbowL=80)
    if sinister > 0:  # a big shadow crosses the house wall
        x = lerp(2100, 1000, sinister)
        ctx.save()
        ctx.rectangle(980, 380, 760, 420)
        ctx.clip()
        ctx.set_source_rgba(0, 0, 0, 0.75)
        C.ell(ctx, x, 470, 70, 80)
        ctx.fill()
        C.rrect(ctx, x - 120, 540, 240, 400, 80)
        ctx.fill()
        ctx.restore()


def s_bear_hunt(ctx, t):
    C.bg_woods(ctx, t, beams=False)
    for i, (key, x0) in enumerate((("dorf", 300), ("ralph", 700), ("levon", 1150))):
        x = x0 + t * 60
        kw = dict(t=t + i, walk=t * 6 + i, look=1, hold={"R": "flashlight"}, armR=75, elbowR=10)
        if key == "ralph":
            kw.update(hold={"R": "shotgun"}, armR=10, elbowR=60, expr="scared")
        CAST[key].draw(ctx, x, 1000 + i * 10, 0.75, **kw)
    for i in range(5):  # paw prints
        x, y = 200 + i * 340, 1050 - (i % 2) * 30
        ctx.set_source_rgba(0, 0, 0, 0.55)
        C.ell(ctx, x, y, 26, 20)
        ctx.fill()
        for k in range(4):
            C.ell(ctx, x - 24 + k * 16, y - 26, 7, 8)
            ctx.fill()


def s_camp_open(ctx, t):
    C.bg_lake(ctx, t, dock=False, sign=False)
    C.camp_sign(ctx, 960, 980, t)
    k = ap(t, 0.6, 0.4)
    ctx.save()
    ctx.translate(960, 820)
    ctx.rotate(0.06 + 0.04 * math.sin(t * 3))
    ctx.scale(1, max(0.05, k))
    C.rrect(ctx, -190, -40, 380, 80, 10)
    C.fs(ctx, hx("#c0392b"), 5)
    text(ctx, "NOW OPEN!", 0, 0, 50, BONE, outline=4)
    ctx.restore()
    for i in range(3):  # cabins with warm windows
        x = 300 + i * 600 if i != 1 else 1600
        if i == 1:
            continue
        ctx.rectangle(x - 120, 560, 240, 120)
        C.fs(ctx, hx("#3a2818"), 4)
        ctx.new_path()
        ctx.move_to(x - 140, 565)
        ctx.line_to(x, 480)
        ctx.line_to(x + 140, 565)
        ctx.close_path()
        C.fs(ctx, hx("#2a1c12"), 4)
        ctx.rectangle(x - 30, 595, 60, 45)
        C.fs(ctx, hx("#f2c45a"), 3)


def s_envelope(ctx, t):
    C.bg_interior(ctx, t)
    CAST["briana"].draw(ctx, 820, 1000, 1.0, t=t, expr="shock", hold={"R": "envelope"}, armR=40, elbowR=80, look=0.6)
    # shadowy figure in the doorway
    ctx.rectangle(1240, 200, 300, 820)
    C.fs(ctx, hx("#0a0806"), 6)
    ctx.set_source_rgba(0.1, 0.1, 0.12, 1)
    C.ell(ctx, 1390, 420, 60, 70)
    ctx.fill()
    C.rrect(ctx, 1300, 480, 180, 540, 60)
    ctx.fill()
    C.ell(ctx, 1370, 420, 8, 5)
    ctx.set_source_rgba(1, 1, 1, 0.6 + 0.4 * math.sin(t * 3))
    ctx.fill()
    C.ell(ctx, 1410, 420, 8, 5)
    ctx.fill()


def s_confess(ctx, t):
    C.bg_interior(ctx, t)
    CAST["levon"].draw(ctx, 1380, 1060, 0.95, t=t, expr="neutral", look=-1, facing=-1)
    CAST["pam"].draw(ctx, 560, 1060, 0.95, t=t, expr="sad", look=1, armL=30, armR=30, elbowL=60, elbowR=60)
    C.table(ctx, t)


def s_club(ctx, t, red=0.0):
    C.bg_nightclub(ctx, t, red=red)
    hurt = ease(red * 1.4)
    CAST["pam_glam"].draw(ctx, 960, 830, 1.0, t=t, expr="scared" if red > 0.2 else "sing", kneel=hurt * 0.8,
                          armR=lerp(60, 25, hurt), elbowR=lerp(15, 95, hurt), armL=lerp(8, 25, hurt), elbowL=lerp(10, 95, hurt),
                          hold={"R": "mic"} if red < 0.2 else None)
    if red > 0.2:
        ctx.save()  # mic dropped on the floor
        ctx.translate(1180, 880)
        ctx.rotate(1.3)
        C.rrect(ctx, -6, -10, 12, 60, 5)
        C.fs(ctx, hx("#222226"), 3)
        C.ell(ctx, 0, -18, 16, 18)
        C.fs(ctx, hx("#a9adb5"), 3)
        ctx.restore()
    CAST["elias"].draw(ctx, 1650, 1080, 0.85, t=t, expr="shock" if red > 0.2 else "cold", look=-1, facing=-1)
    C.club_tables(ctx, t)


def s_lab(ctx, t, glow=0.0):
    C.bg_lab(ctx, t)
    CAST["pam"].draw(ctx, 650, 1010, 0.95, t=t, expr="scared", look=1, armL=25, armR=25, elbowL=90, elbowR=90)
    if glow > 0:
        x, y = 650, 1010 - 0.95 * 360
        for k in range(3):
            r = 60 + k * 40 + 10 * math.sin(t * 5)
            g = cairo.RadialGradient(x, y, 0, x, y, r)
            g.add_color_stop_rgba(0, 0.5, 1, 0.5, 0.55 * glow)
            g.add_color_stop_rgba(1, 0.5, 1, 0.5, 0)
            ctx.set_source(g)
            ctx.arc(x, y, r, 0, 2 * math.pi)
            ctx.fill()
    CAST["elias"].draw(ctx, 1200, 1010, 0.95, t=t, expr="cold", look=-1, facing=-1, hold={"R": "syringe"}, armR=50, elbowR=70)


def s_standoff(ctx, t, p0, shots, surrender):
    C.bg_woods(ctx, t, beams=False)
    C.car(ctx, 120, 1000, 1.0, t, lights=True)
    shoot = shots <= t < shots + 2.4
    for i, x in enumerate((420, 720)):
        CAST["goon"].draw(ctx, x, 1010, 0.8, t=t + i, expr="angry", hold={"R": "pistol"}, armR=88, elbowR=0, look=1)
    CAST["elias"].draw(ctx, 580, 990, 0.8, t=t, expr="cold", look=1)
    CAST["levon"].draw(ctx, 1350, 1010, 0.85, t=t, expr="angry", facing=-1, hold={"R": "pistol"}, armR=88, elbowR=0, look=-1)
    sk = ap(t, surrender, 0.6)
    CAST["pam"].draw(ctx, lerp(1620, 1180, sk), 1000, 0.85, t=t, expr="scared" if sk < 1 else "sad", facing=-1, look=-1,
                     armL=lerp(10, 165, sk), armR=lerp(10, 165, sk), elbowL=lerp(10, -10, sk), elbowR=lerp(10, -10, sk),
                     walk=t * 6 if 0 < sk < 1 else None)
    if shoot:
        rnd = random.Random(int(t * 7))
        if rnd.random() < 0.6:
            C.muzzle(ctx, 640 + rnd.choice((-300, 0)), 1010 - 0.8 * 520, 1.0, t)
        if rnd.random() < 0.5:
            C.muzzle(ctx, 1080, 1010 - 0.85 * 520, 1.0, t)


def s_jason_walk(ctx, t):
    C.bg_woods(ctx, t)
    x = lerp(1500, 960, min(1, t / 4))
    CAST["jason"].draw(ctx, x, 1060, 1.0, t=t, walk=t * 4 if t < 4 else None, eye_glow=min(1, t / 2), look=-0.5)
    C.fog(ctx, t, 1000, 120, 0.35, seed=9)


def s_jason_elias(ctx, t, crush):
    C.bg_woods(ctx, t, beams=False)
    reach = ap(t, crush - 1.5, 1.2)
    CAST["elias"].draw(ctx, 760, 1010, 0.9, t=t, expr="scared", look=1, armL=30, armR=70, elbowR=40, lean=-6 * reach)
    CAST["jason"].draw(ctx, lerp(1450, 1150, reach), 1050, 0.95, t=t, facing=-1, armR=lerp(5, 105, reach), elbowR=10,
                       walk=t * 4 if reach < 1 else None, eye_glow=1)


def s_strangle(ctx, t, let_go):
    C.bg_lake(ctx, t, dock=False)
    r = 1 - ap(t, let_go, 1.0)
    grab = ap(t, 0.3, 0.8) * r
    CAST["pam"].draw(ctx, 760, 1000, 0.95, t=t, expr="scared" if grab > 0.2 else "shock", look=1, lean=-10 * grab,
                     armL=30, armR=lerp(10, 70, grab), elbowR=50)
    CAST["jason"].draw(ctx, lerp(1250, 1060, grab), 1050, 0.95, t=t, facing=-1, armR=lerp(8, 92, grab),
                       armL=lerp(8, 92, grab), elbowL=10, elbowR=10, eye_glow=0.6 + 0.4 * r)


def s_hug_memory(ctx, t):
    C.sky(ctx, hx("#f4d79a"), hx("#c98e4a"))
    ctx.rectangle(-800, 900, 3600, 400)
    C.src(ctx, hx("#7a8a3a"))
    ctx.fill()
    CAST["pam"].draw(ctx, 900, 980, 1.0, t=t, expr="happy", armL=60, armR=60, elbowL=80, elbowR=80)
    CAST["jason_kid"].draw(ctx, 1040, 990, 1.0, t=t, expr="happy", facing=-1, armL=60, armR=70)


def s_ralph_shot(ctx, t, bang):
    C.bg_woods(ctx, t)
    hit = ap(t, bang, 0.15)
    walk = ap(t, bang + 1.2, 0.5)
    CAST["ralph"].draw(ctx, 420, 1010, 0.9, t=t, expr="angry" if t < bang else "shock", hold={"R": "shotgun"},
                       armR=88, elbowR=0, look=1)
    jx = 1300 + max(0, t - bang - 1.2) * 160
    CAST["jason"].draw(ctx, jx, 1050, 0.95, t=t, facing=1 if walk > 0.5 else -1, tilt=-18 * hit * (1 - walk),
                       walk=(t - bang) * 4 if walk > 0 else None, eye_glow=1)
    if bang <= t < bang + 0.25:
        C.muzzle(ctx, 420 + 0.9 * 270, 1010 - 0.9 * 470, 1.4, t)


def s_pam_laugh(ctx, t):
    C.bg_lake(ctx, t, dock=False, moon_xy=(960, 250))
    shake = 4 * math.sin(t * 30)
    CAST["pam"].draw(ctx, 960 + shake, 1240, 1.6, t=t, expr="manic", armL=30, armR=30, elbowL=40, elbowR=40, tilt=6 * math.sin(t * 9))


def s_campfire(ctx, t, eyes_t):
    C.bg_woods(ctx, t, beams=False)
    C.campfire(ctx, 760, 960, t)
    for i, (x, fac) in enumerate(((430, 1), (580, 1), (950, -1), (1100, -1))):
        C.teen(i).draw(ctx, x, 1000, 0.7, t=t + i, facing=fac, look=fac, expr="happy" if i % 2 else "neutral")
    ctx.set_source_rgba(1, 0.55, 0.2, 0.12)
    ctx.paint()
    if t > eyes_t:
        a = ap(t, eyes_t, 1.0) * (0 if (t * 0.7) % 3 < 0.12 else 1)
        for dx in (-26, 26):
            C.ell(ctx, 1640 + dx, 560, 14, 8)
            ctx.set_source_rgba(1, 0.2, 0.15, a)
            ctx.fill()


def s_outro(ctx, t):
    C.bg_lake(ctx, t, dock=False, moon_xy=(960, 260))
    ctx.push_group()
    CAST["pam"].draw(ctx, 840, 1080, 0.68, t=t, expr="cold", armR=30, elbowR=20)
    CAST["jason"].draw(ctx, 1080, 1100, 0.68, t=t, eye_glow=1, armL=20)
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(0.92)


# ====================================================================== scenes (with overlays)
def L0(ctx, R, t, p):
    z = 1 + 0.06 * min(t, 16) / 16
    with cam(ctx, R, 960 - 300 * (1 - ap(t, 0, 10)), 540, z, vfx=460):
        s_lake_sign(ctx, t)
    grade(ctx, R)
    W, H, u = R.W, R.H, R.u
    if t > 0.3:
        horror_title(ctx, "CRYSTAL LAKE", W / 2, H * (0.2 if not R.vertical else 0.14), 150 * u * (0.75 if R.vertical else 1), t - 0.3, seed=1)
    if t > 1.4:
        text(ctx, "ENDING EXPLAINED  ·  FULL BREAKDOWN", W / 2, H * 0.32 if not R.vertical else H * 0.2, 40 * u, BONE, outline=4 * u)
    ts = p.cue("Full spoilers")
    if t > ts:
        pop = 1 + 0.2 * max(0, 1 - (t - ts) / 0.25)
        badge(ctx, W / 2, H * 0.42 if not R.vertical else H * 0.26, "SPOILER WARNING", 46 * u * pop)
    text(ctx, "Fan recap · not affiliated with Peacock", W - 24, 30 * u, 20 * u, (1, 1, 1, 0.7), outline=0, anchor="r", bold=False)


def L1(ctx, R, t, p):
    tb = p.cue("The very first scene")
    td = p.cue("drowned")
    W, H, u = R.W, R.H, R.u
    if t < tb:
        with cam(ctx, R, 960, 540 + 40 * math.sin(t * 0.1), 1.0 + 0.02 * t, vfx=960):
            s_dock_pam(ctx, t)
        grade(ctx, R)
        if td <= t < tb:
            a = ap(t, td, 0.6)
            ctx.save()
            ctx.push_group()
            sepia_bubble(ctx, W * 0.74 if not R.vertical else W / 2, H * 0.32 if not R.vertical else H * 0.24,
                         230 * u, lambda c, tt: s_underwater(c, tt), t - td)
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(a)
            ctx.restore()
        rows = [("A PREQUEL TO", "Friday the 13th (1980)", p.cue("Crystal Lake is")),
                ("PEACOCK · OCT 15", "All 8 episodes", p.cue("All eight")),
                ("STARRING", "Linda Cardellini as Pam", p.cue("Linda"))]
        for i, (a1, a2, t0) in enumerate(rows):
            if t0 <= t < td + (99 if i == 2 else 0) and t < td:
                a = ap(t, t0, 0.4)
                pw = 640 * u
                x = 40 * u if not R.vertical else W / 2 - pw / 2
                y = (H - 300 * u) if not R.vertical else H * 0.08
                ctx.push_group()
                plaque(ctx, x - (1 - a) * 80, y, pw, 120 * u, a1, a2, u)
                ctx.pop_group_to_source()
                ctx.paint_with_alpha(a * (1 - ap(t, (rows[i + 1][2] if i < 2 else td) - 0.3, 0.3)))
    else:
        lt = t - tb
        with cam(ctx, R, 960, 420, 2.1 + 0.05 * lt, vfx=960):
            C.bg_lake(ctx, t, dock=True)
            hands = CAST["pam"].draw(ctx, 960, 900, 0.95, t=t, expr="manic", look=0, armR=100, elbowR=55)
            rnd = random.Random(4)
            ctx.set_source_rgba(0.55, 0.0, 0.02, 0.9)
            for i in range(40):  # blood spatter
                x, y = 960 + rnd.gauss(0, 70), 420 + rnd.gauss(0, 110)
                r = rnd.uniform(3, 12)
                C.ell(ctx, x, y, r, r * rnd.uniform(0.7, 1.3))
                ctx.fill()
            hx_, hy_ = hands["R"]
            C.ell(ctx, hx_ - 4, hy_ - 14, 6, 8)  # the tooth
            C.fs(ctx, hx("#f6f2e6"), 2.5)
        tint(ctx, R, (0.6, 0, 0), 0.25)
        grade(ctx, R, (0.15, 0, 0), 0.85)
        flash(ctx, R, t, tb, 0.25, (1, 0.2, 0.2))
        badge(ctx, W / 2, H * 0.12, "SCENE ONE", 40 * u, BONE, (0.1, 0.02, 0.02))


def L2(ctx, R, t, p):
    if R.vertical:
        # pan along the lineup
        idx = sum(1 for cue in ("Levon Brooks", "Dorf", "Briana Brooks", "Crazy Ralph", "And Grace") if t >= p.cue(cue))
        fx = 220 + idx * 296
        with cam(ctx, R, 960, 640, 1.0, vfx=fx):
            s_lineup(ctx, t, p)
    else:
        with cam(ctx, R, 960, 560, 1.0):
            s_lineup(ctx, t, p)
    grade(ctx, R, strength=0.6)
    text(ctx, "WHO'S WHO", R.W / 2, 70 * R.u, 64 * R.u, RED, "Liberation Serif", outline=5 * R.u)


def L3(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_sin, t_hunt, t_open = p.cue("something sinister"), p.cue("As the bodies"), p.cue("Even so")
    t_ep6, t_env, t_conf = p.cue("By episode six"), p.cue("Briana receives"), p.cue("and Pam finally")
    fn, lt, t0 = pick(t, [(0, "house"), (t_hunt, "hunt"), (t_open, "open"), (t_ep6, "ep6"), (t_env, "env"), (t_conf, "conf")])
    if fn == "house":
        with cam(ctx, R, 1100, 560, 1.05, vfx=900 if t < t_sin else 1250):
            s_grace_house(ctx, t, sinister=ap(t, t_sin, 2.5))
        grade(ctx, R)
        if t > t_sin:
            text(ctx, "Something takes revenge for Grace...", W / 2, H * 0.12, 44 * u, BONE, "Liberation Serif", outline=4 * u, italic=True)
    elif fn == "hunt":
        with cam(ctx, R, 960 + lt * 30, 600, 1.05, vfx=800 + lt * 60):
            s_bear_hunt(ctx, lt)
        grade(ctx, R)
        badge(ctx, W / 2, H * 0.12, "THE TOWN BLAMES A BEAR", 42 * u, BONE, (0.15, 0.1, 0.05))
    elif fn == "open":
        with cam(ctx, R, 960, 640, 1.0, vfx=960):
            s_camp_open(ctx, lt)
        grade(ctx, R)
    elif fn == "ep6":
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            C.bg_woods(ctx, t)
        grade(ctx, R, strength=0.9)
        text(ctx, "EPISODE 6", W / 2, H * 0.38, 48 * u, BONE, outline=4 * u)
        horror_title(ctx, "“KILL THEM, MOMMY”", W / 2, H * 0.5, (110 if not R.vertical else 76) * u, lt, seed=6)
        if t > p.cue("a young hippie"):
            badge(ctx, W / 2, H * 0.68, "WILLOW IS KILLED", 40 * u, BONE, (0.4, 0.02, 0.02))
    elif fn == "env":
        with cam(ctx, R, 1000, 540, 1.0, vfx=1000):
            s_envelope(ctx, lt)
        grade(ctx, R)
        badge(ctx, W / 2, H * 0.1, "BRIANA GETS A MYSTERIOUS ENVELOPE", 36 * u, BONE, (0.1, 0.25, 0.25))
    else:
        with cam(ctx, R, 960, 600, 1.0 + 0.01 * lt, vfx=760):
            s_confess(ctx, lt)
        grade(ctx, R)
        badge(ctx, W / 2, H * 0.1, "PAM TELLS LEVON THE TRUTH", 40 * u, BONE, (0.25, 0.15, 0.08))


def L4(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_bleed, t_lab = p.cue("While she was pregnant"), p.cue("Desperate")
    t_code, t_exp = p.cue("Its code name"), p.cue("The experiments")
    if t < t_lab:
        with cam(ctx, R, 960 + 120 * ap(t, p.cue("married"), 1.5), 540, 1.0 + 0.012 * t, vfx=960 if t < p.cue("married") else 1500):
            s_club(ctx, t, red=ap(t, t_bleed, 1.2))
        grade(ctx, R)
        flash(ctx, R, t, t_bleed, 0.3, (1, 0, 0))
        if t < 3.5:
            badge(ctx, W / 2, H * 0.1, "FLASHBACK", 40 * u, BONE, (0.2, 0.05, 0.1))
        if t > p.cue("married"):
            text(ctx, "ELIAS", W * (0.86 if not R.vertical else 0.5), H * (0.36 if not R.vertical else 0.3), 44 * u, BONE, outline=4 * u)
    else:
        with cam(ctx, R, 930, 560, 1.0, vfx=650 if t < t_code else 900):
            s_lab(ctx, t, glow=ap(t, t_exp, 1.0))
        grade(ctx, R, strength=0.55)
        if t > t_exp:
            for i in range(3):
                C.radiation(ctx, W * (0.15 + 0.35 * i) if not R.vertical else W * (0.2 + 0.3 * i), H * (0.2 if not R.vertical else 0.16),
                            50 * u, ap(t, t_exp + i * 0.3), t * 0.6 + i)
        stamp(ctx, R, "PROJECT ARGONAUT", t, t_code, W / 2, H * (0.66 if not R.vertical else 0.6), (64 if not R.vertical else 50) * u)


def L5(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_heal, t_never, t_crawl = p.cue("Argonaut gave him"), p.cue("Jason never died"), p.cue("He crawled out")
    t_pam, t_grow = p.cue("while Pam believed"), p.cue("The treatment even")
    if t < t_crawl:
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            s_underwater(ctx, t, heal=ap(t, t_heal, 1.0))
        grade(ctx, R)
        if t < t_heal:
            text(ctx, "HOW DID JASON SURVIVE?", W / 2, H * 0.12, 64 * u, BONE, "Liberation Serif", outline=5 * u)
        elif t > t_never:
            text(ctx, "HE NEVER DIED", W / 2, H * 0.12, 72 * u, hx("#7dff9a"), "Liberation Serif", outline=6 * u)
        else:
            badge(ctx, W / 2, H * 0.12, "ACCELERATED HEALING", 44 * u, (0.05, 0.1, 0.05), hx("#7dff9a"))
    elif t < t_pam:
        lt = t - t_crawl
        with cam(ctx, R, 960 + lt * 40, 560, 1.0, vfx=lerp(700, 1400, min(1, lt / 7))):
            s_shore(ctx, lt)
        grade(ctx, R)
    elif t < t_grow:
        lt = t - t_pam
        with cam(ctx, R, 960, 520, 1.05, vfx=960):
            s_dock_pam(ctx, t, expr="sad", hold=True)
        tint(ctx, R, (0.1, 0.15, 0.3), 0.3)
        grade(ctx, R)
        text(ctx, "...while Pam thought he was dead", W / 2, H * 0.12, 48 * u, BONE, "Liberation Serif", outline=4 * u, italic=True)
    else:
        lt = t - t_grow
        with cam(ctx, R, 960, 520, 1.0, vfx=960):
            s_growth(ctx, t, min(1, lt / 4))
        grade(ctx, R)
        badge(ctx, W / 2, H * 0.1, "SO BIG, SO FAST", 46 * u, BONE, (0.1, 0.25, 0.1))


def L6(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_shots, t_surr = p.cue("a shootout"), p.cue("and Pam surrenders")
    t_arr, t_app, t_crush = p.cue("Then, he arrives."), p.cue("Elias appeals"), p.cue("Jason crushes")
    if t < t_arr:
        vfx = 580 if t < p.cue("Levon refuses") else (1300 if t < t_shots else (900 if t < t_surr else 1250))
        with cam(ctx, R, 900, 560, 1.0, vfx=vfx):
            s_standoff(ctx, t, 0, t_shots, t_surr)
        grade(ctx, R)
        if t < 3:
            badge(ctx, W / 2, H * 0.1, "THE FINALE", 46 * u, BONE)
        if t_shots <= t < t_shots + 2.4 and int(t * 10) % 3 == 0:
            tint(ctx, R, (1, 0.9, 0.7), 0.18)
    elif t < t_app:
        lt = t - t_arr
        with cam(ctx, R, 960, 520 - 60 * min(1, lt / 4), 1.0 + 0.15 * min(1, lt / 4), vfx=lerp(1500, 960, min(1, lt / 4))):
            s_jason_walk(ctx, lt)
        grade(ctx, R, strength=0.85)
        if lt > 1.3:
            horror_title(ctx, "JASON RETURNS", W / 2, H * 0.12, (96 if not R.vertical else 80) * u, lt - 1.3, seed=3)
    else:
        lt = t - t_app
        with cam(ctx, R, 960, 560, 1.0, vfx=980):
            s_jason_elias(ctx, lt, t_crush - t_app)
        grade(ctx, R)
        if t >= t_crush:
            k = ap(t, t_crush, 0.12)
            tint(ctx, R, (0.35, 0, 0), 0.75 * k)
            ctx.save()
            ctx.translate(W / 2, H * 0.45)
            ctx.rotate(-0.12)
            sc = 1 + 0.4 * max(0, 1 - (t - t_crush) / 0.2)
            ctx.scale(sc, sc)
            text(ctx, "CRUNCH!", 0, 0, 150 * u, hx("#ffe14a"), outline=10 * u)
            ctx.restore()
            if t > t_crush + 0.6:
                badge(ctx, W / 2, H * 0.68, "ELIAS: DEAD", 50 * u, BONE, (0.45, 0.02, 0.02))


def L7(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_rem, t_go = p.cue("But he remembers"), p.cue("and he lets her go")
    t_ralph, t_esc, t_pam = p.cue("Crazy Ralph shoots"), p.cue("Jason escapes"), p.cue("And Pam?")
    if t < t_ralph:
        with cam(ctx, R, 960, 560, 1.0 + 0.01 * t, vfx=880):
            s_strangle(ctx, t, t_go)
        grade(ctx, R)
        if t_rem <= t < t_ralph:
            a = ap(t, t_rem, 0.5) * (1 - ap(t, t_ralph - 0.4, 0.3))
            ctx.push_group()
            sepia_bubble(ctx, W * 0.5, H * (0.22 if not R.vertical else 0.2), 200 * u, s_hug_memory, t - t_rem)
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(a)
    elif t < t_pam:
        lt = t - t_ralph
        bang = 1.1
        with cam(ctx, R, 960, 560, 1.0, vfx=420 if lt < bang - 0.1 else lerp(1300, 1700, min(1, max(0, lt - 2) / 3))):
            s_ralph_shot(ctx, lt, bang)
        grade(ctx, R)
        flash(ctx, R, lt, bang, 0.2)
        if t > p.cue("It doesn't stop him"):
            badge(ctx, W / 2, H * 0.12, "IT DOESN'T STOP HIM", 46 * u, BONE)
    else:
        lt = t - t_pam
        with cam(ctx, R, 960, 520, 1.0, vfx=960):
            s_pam_laugh(ctx, lt)
        grade(ctx, R, (0.1, 0, 0.05), 0.85)
        if t > p.cue("and declares"):
            text(ctx, "“These woods belong to us.”", W / 2, H * (0.14 if not R.vertical else 0.12),
                 (76 if not R.vertical else 54) * u, hx("#ff3b30"), "Liberation Serif", outline=6 * u, italic=True)


def L8(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_eyes, t_q, t_fate = p.cue("with someone watching"), p.cue("The show never"), p.cue("Levon's fate")
    with cam(ctx, R, 960 + 200 * ap(t, t_eyes - 1, 3), 560, 1.0, vfx=lerp(760, 1640, ap(t, t_eyes - 1, 3))):
        s_campfire(ctx, t, t_eyes)
    grade(ctx, R, strength=0.85)
    if t_q <= t < t_fate:
        text(ctx, "JASON... OR PAM?", W / 2, H * 0.14, 80 * u, RED, "Liberation Serif", outline=6 * u)
    fates = [("ELIAS", "DEAD", (0.5, 0.03, 0.03)), ("LEVON", "UNKNOWN", (0.45, 0.4, 0.1)),
             ("PAM", "ALIVE", (0.1, 0.4, 0.2)), ("JASON", "ALIVE", (0.1, 0.4, 0.2))]
    for i, (n, s, c) in enumerate(fates):
        a = ap(t, t_fate + i * 0.35, 0.3)
        if a <= 0:
            continue
        if R.vertical:
            x, y = W / 2 + (i % 2 - 0.5) * 460, H * 0.1 + (i // 2) * 200
        else:
            x, y = W / 2 + (i - 1.5) * 380, H * 0.14
        ctx.push_group()
        plaque(ctx, x - 170, y - 70, 340, 150, n, s, 1.0 * u)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(a)


def L9(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 560, 1.0 + 0.01 * t, vfx=960):
        s_outro(ctx, t)
    grade(ctx, R)
    tp = p.cue("So, was")
    if t < tp:
        text(ctx, "SEASON 2?", W / 2, H * 0.12, 96 * u, RED, "Liberation Serif", outline=7 * u)
        if t > 1:
            badge(ctx, W / 2, H * 0.24, "NOT ANNOUNCED YET", 38 * u, BONE, (0.15, 0.15, 0.2))
        for i, cue in enumerate(("a mother hungry", "a son who cannot", "and a camp full")):
            if t > p.cue(cue):
                lbl = ["A mother hungry for revenge", "A son who cannot die", "A camp full of counselors"][i]
                text(ctx, lbl, W / 2, H * (0.33 + i * 0.07), 44 * u, BONE, outline=5 * u)
    else:
        a = ap(t, tp, 0.3)
        ctx.push_group()
        badge(ctx, W / 2, H * 0.16, "SMART FIX?", 64 * u, (1, 1, 1), (0.12, 0.45, 0.25))
        text(ctx, "or", W / 2, H * 0.27, 46 * u, BONE, outline=4 * u)
        badge(ctx, W / 2, H * 0.38, "KEEP THE MYSTERY?", 64 * u, (1, 1, 1), (0.55, 0.05, 0.05))
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(a)
        ts = p.cue("and subscribe")
        if t > ts:
            pulse = 1 + 0.06 * math.sin((t - ts) * 6)
            badge(ctx, W / 2, H * 0.55, "SUBSCRIBE", 64 * u * pulse, (1, 1, 1), (0.85, 0.08, 0.08))


LONG = [L0, L1, L2, L3, L4, L5, L6, L7, L8, L9]


# ---------------------------------------------------------------- Short (vertical)
def S0(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 520, 1.15, vfx=1050):
        s_jason_walk(ctx, 2.5 + t)
    grade(ctx, R, strength=0.85)
    horror_title(ctx, "CRYSTAL LAKE", W / 2, H * 0.1, 110 * u, t, seed=1)
    text(ctx, "HOW JASON SURVIVED", W / 2, H * 0.18, 58 * u, BONE, outline=5 * u)
    if t > p.cue("Spoilers"):
        badge(ctx, W / 2, H * 0.25, "SPOILERS", 52 * u)


def S1(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_save, t_code = p.cue("To save"), p.cue("Project Argonaut")
    if t < t_save:
        with cam(ctx, R, 960, 540, 1.0, vfx=960 if t < p.cue("married") else 1550):
            s_club(ctx, t, 0)
        grade(ctx, R)
        badge(ctx, W / 2, H * 0.1, "FLASHBACK", 44 * u, BONE, (0.2, 0.05, 0.1))
    else:
        with cam(ctx, R, 930, 560, 1.0, vfx=650 if t < t_code else 1150):
            s_lab(ctx, t, glow=ap(t, p.cue("It gave"), 1))
        grade(ctx, R, strength=0.55)
        stamp(ctx, R, "PROJECT ARGONAUT", t, t_code, W / 2, H * 0.6, 52 * u)


def S2(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_crawl = p.cue("He crawled out")
    if t < t_crawl:
        with cam(ctx, R, 960, 540, 1.0, vfx=960):
            s_underwater(ctx, t + 3, heal=1.0)
        grade(ctx, R)
        text(ctx, "HE NEVER DIED", W / 2, H * 0.12, 88 * u, hx("#7dff9a"), "Liberation Serif", outline=6 * u)
    else:
        lt = t - t_crawl
        with cam(ctx, R, 960, 560, 1.0, vfx=lerp(800, 1100, min(1, lt / 5))):
            s_shore(ctx, lt + 1)
        grade(ctx, R)


def S3(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    t_sp, t_bul, t_walk, t_laugh = p.cue("spares his mother"), p.cue("takes a bullet"), p.cue("and walks away"), p.cue("Pam just laughs")
    t_crush = p.cue("crushes")
    if t < t_sp:
        with cam(ctx, R, 960, 560, 1.0, vfx=980):
            s_jason_elias(ctx, t, t_crush)
        grade(ctx, R)
        if t >= t_crush:
            tint(ctx, R, (0.35, 0, 0), 0.7 * ap(t, t_crush, 0.12))
            text(ctx, "CRUNCH!", W / 2, H * 0.4, 150 * u, hx("#ffe14a"), outline=10 * u)
    elif t < t_bul:
        with cam(ctx, R, 960, 560, 1.0, vfx=880):
            s_strangle(ctx, 2 + t - t_sp, 2.3)
        grade(ctx, R)
        badge(ctx, W / 2, H * 0.12, "HE SPARES HIS MOTHER", 46 * u, BONE, (0.25, 0.1, 0.1))
    elif t < t_laugh:
        lt = t - t_bul
        with cam(ctx, R, 960, 560, 1.0, vfx=420 if lt < 1.0 else lerp(1300, 1700, min(1, max(0, lt - 2) / 3))):
            s_ralph_shot(ctx, lt, 1.1)
        grade(ctx, R)
        flash(ctx, R, lt, 1.1, 0.2)
    else:
        with cam(ctx, R, 960, 520, 1.0, vfx=960):
            s_pam_laugh(ctx, t - t_laugh)
        grade(ctx, R, (0.1, 0, 0.05), 0.85)
        if t > p.cue("The woods are"):
            text(ctx, "THE WOODS", W / 2, H * 0.12, 110 * u, hx("#ff3b30"), "Liberation Serif", outline=7 * u)
            text(ctx, "ARE THEIRS", W / 2, H * 0.19, 110 * u, hx("#ff3b30"), "Liberation Serif", outline=7 * u)


def S4(ctx, R, t, p):
    W, H, u = R.W, R.H, R.u
    with cam(ctx, R, 960, 560, 1.0, vfx=960):
        s_outro(ctx, t)
    grade(ctx, R)
    badge(ctx, W / 2, H * 0.12, "SMART FIX?", 70 * u, (1, 1, 1), (0.12, 0.45, 0.25))
    text(ctx, "or", W / 2, H * 0.19, 50 * u, BONE, outline=4 * u)
    badge(ctx, W / 2, H * 0.26, "RUINED THE MYSTERY?", 60 * u, (1, 1, 1), (0.55, 0.05, 0.05))


SHORT = [S0, S1, S2, S3, S4]

# ---------------------------------------------------------------- captions, grain, pipeline
CFG = {"long": (1920, 1080, False, LONG), "short": (1080, 1920, True, SHORT)}
G = {}


def captions(ctx, R, p, t):
    for t0, t1, c in p.chunks(4 if R.vertical else 9):
        if t0 <= t < t1:
            u = R.u
            if R.vertical:
                size = 72 * u
                words, lines, cur = c.upper().split(), [], ""
                for w in words:
                    nxt = (cur + " " + w).strip()
                    if C.text_width(ctx, nxt, size) > R.W - 120 and cur:
                        lines.append(cur)
                        cur = w
                    else:
                        cur = nxt
                lines.append(cur)
                for i, ln in enumerate(lines):
                    text(ctx, ln, R.W / 2, R.H * 0.73 + i * size * 1.2, size, hx("#ffe14a") if i == 0 else (1, 1, 1), outline=8 * u)
            else:
                size = 40 * u
                w = C.text_width(ctx, c, size)
                C.rrect(ctx, R.W / 2 - w / 2 - 24, R.H - 118 * u, w + 48, 68 * u, 14)
                ctx.set_source_rgba(0, 0, 0, 0.6)
                ctx.fill()
                text(ctx, c, R.W / 2, R.H - 84 * u, size, (1, 1, 1), outline=3 * u)
            return


def make_grain(W, H, n=6):
    out = []
    rnd = np.random.default_rng(1)
    for _ in range(n):
        a = (rnd.random((H // 2, W // 2)) * 26).astype(np.uint8)
        arr = np.zeros((H // 2, W // 2, 4), np.uint8)
        arr[..., 3] = a  # premultiplied black with alpha
        surf = cairo.ImageSurface.create_for_data(bytearray(arr.tobytes()), cairo.FORMAT_ARGB32, W // 2, H // 2)
        out.append(surf)
    return out


def frame(ctx, R, scenes, i, p, t, grain):
    ctx.set_source_rgb(0, 0, 0)
    ctx.paint()
    scenes[i](ctx, R, t, p)
    g = grain[int(t * FPS) % len(grain)]
    ctx.save()
    ctx.scale(2, 2)
    ctx.set_source_surface(g, 0, 0)
    ctx.paint()
    ctx.restore()
    captions(ctx, R, p, t)
    k = min(1, t / 0.25, (p.dur - t) / 0.25)
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
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
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
    assert len(paras) == len(G["cfg"][3])
    G["paras"] = paras
    return paras, start


def stills(mode, vo_dir, script, outdir, fracs=(0.2, 0.5, 0.8)):
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
    jobs = [(i, f"{work}/s{i:02d}.mp4") for i in range(len(paras))]
    jobs.sort(key=lambda j: -paras[j[0]].dur)
    with Pool(4) as pool:
        for r in pool.imap_unordered(render_scene, jobs):
            print("done", r, flush=True)
    parts = [f"[{i}:a]aresample=48000,adelay={int(LEAD * 1000)}:all=1,apad=whole_dur={p.dur:.3f}[a{i}]" for i, p in enumerate(paras)]
    inputs = sum([["-i", f"{vo_dir}/{i:02d}.wav"] for i in range(len(paras))], [])
    fc = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(len(paras))) + f"concat=n={len(paras)}:v=0:a=1[vo]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "[vo]", f"{work}/vo.wav"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                    "-f", "lavfi", "-i", f"anoisesrc=color=brown:amplitude=0.5:d={total:.2f}:r=48000",
                    "-f", "lavfi", "-i", f"sine=f=55:d={total:.2f}:r=48000",
                    "-filter_complex", "[0]lowpass=f=180,volume=0.10[n];[1]volume=0.05,tremolo=f=0.2:d=0.6[s];"
                    f"[n][s]amix=inputs=2:normalize=0,afade=t=in:d=2,afade=t=out:st={total - 3:.2f}:d=3[amb]",
                    "-map", "[amb]", f"{work}/amb.wav"], check=True)
    with open(f"{work}/list.txt", "w") as fh:
        for i in range(len(paras)):
            fh.write(f"file 's{i:02d}.mp4'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{work}/list.txt",
                    "-i", f"{work}/vo.wav", "-i", f"{work}/amb.wav",
                    "-filter_complex", "[1]volume=1.0[v];[2]volume=0.8[b];[v][b]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                    "-shortest", out], check=True)
    print("wrote", out, round(total, 1), "s")


if __name__ == "__main__":
    main()
