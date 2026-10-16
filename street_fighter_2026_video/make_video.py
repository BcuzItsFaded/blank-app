"""RG - Street Fighter (2026) spoiler-free breakdown, fully animated.

Every frame is drawn in code (Pillow) and piped to ffmpeg: original fighter
characters that punch/kick/blast, impact sparks, camera shake, slam-in titles,
animated score bars and counters, word-by-word captions, plus a synthesized
beat and sound effects synced to every hit. No copyrighted footage or art.

  python3 make_video.py            # build YouTube video + Short
  python3 make_video.py --preview  # one still per scene into output/preview/
"""
import math, os, random, subprocess, sys, wave
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
TMP = os.path.join(OUT, "_build")
FPS = 30
SR = 44100
F_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
F_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
F_SEMI = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"

RED, GOLD, BLUE = (235, 45, 55), (255, 196, 0), (45, 145, 255)
GREEN, WHITE, PURPLE = (60, 215, 115), (240, 240, 240), (170, 90, 255)
INK = (12, 12, 18)

# (kicker, headline, bullets, accent, seconds, visual, voiceover/caption)
LONG = [
    ("RG BREAKDOWN", "STREET FIGHTER\n(2026)", ["Critics: ~45%", "Fans: ~84%", "Who's right?"], RED, 9, "faceoff",
     "Critics gave the new Street Fighter movie a rotten score. Fans are calling it a knockout. So who's right? Let's break it down, no spoilers."),
    ("THE BASICS", "WHAT IS IT?", ["Director: Kitao Sakurai", "In theaters Oct 16, 2026", "Runtime: about 2 hours"], GOLD, 10, "ticket",
     "Street Fighter is directed by Kitao Sakurai and hit theaters October sixteenth, twenty twenty-six. It runs about two hours."),
    ("THE ROSTER", "STACKED CAST", ["Andrew Koji - Ryu", "Noah Centineo - Ken", "Callina Liang - Chun-Li", "D. Dastmalchian - M. Bison"], BLUE, 11, "cast_a",
     "The cast is stacked. Andrew Koji is Ryu, Noah Centineo is Ken, Callina Liang is Chun-Li, and David Dastmalchian plays M. Bison."),
    ("THE ROSTER", "WILD CARDS", ["Jason Momoa - Blanka", "50 Cent - Balrog", "Cody Rhodes - Guile", "Eric Andre - Don Sauvage"], PURPLE, 11, "cast_b",
     "And the wild cards: Jason Momoa as Blanka, 50 Cent as Balrog, WWE's Cody Rhodes as Guile, and Eric Andre as Don Sauvage."),
    ("ROUND 1: CRITICS", "TOMATOMETER", ["Abrupt ending", "Lots of sequel setup", "Script & pacing issues", "Some fights felt flat"], RED, 12, "critics",
     "Round one: the critics. The Tomatometer sits in the mid forties. The big complaints? An abrupt ending, a lot of sequel setup, a messy script and pacing, and some fights that felt flat."),
    ("ROUND 2: FANS", "POPCORNMETER", ["Looks like the games", "Easter eggs everywhere", "Fun one-liners", "Animated flashbacks"], GREEN, 12, "fans",
     "Round two: the fans. The Popcornmeter is in the low-to-mid eighties. Fans love that it looks and feels like the games, it's packed with Easter eggs and one-liners, and the animated flashbacks are getting love."),
    ("THE GAP", "38-POINT SPLIT", ["Critics judged a film", "Fans judged Street Fighter", "Both can be right"], GOLD, 11, "bars",
     "That's roughly a thirty-eight point gap. Critics judged it as a movie. Fans judged it as Street Fighter. Honestly? Both can be right."),
    ("REALITY CHECK", "EARLY HYPE?", ["Opening night = superfans", "Score may drop", "CinemaScore pending"], WHITE, 11, "gauge",
     "Reality check: early audience scores come from opening-night superfans, so that number could dip. And the CinemaScore isn't out yet."),
    ("HISTORY LESSON", "FRANCHISE BEST?", ["1994 movie: ~12%", "Legend of Chun-Li: ~6%", "2026: ~45%"], GOLD, 11, "history",
     "For context, the 1994 movie sits around twelve percent, and Legend of Chun-Li around six. So by critic scores, this is the best Street Fighter movie yet."),
    ("BOX OFFICE", "TRACKING", ["$25M-$35M US opening", "~$70M global start", "Projections, not final"], GREEN, 10, "money",
     "Box office tracking had it opening between twenty-five and thirty-five million domestic, and around seventy million worldwide. Those are projections, so watch for the real numbers."),
    ("SPOILER-FREE", "CREDITS SCENE?", ["YES - there is ONE", "Stay when credits roll", "It teases what's next"], RED, 11, "credits",
     "Post-credits: yes, there is one extra scene. Stay in your seat when the credits roll. It teases what's next. That's all I'm saying."),
    ("RG VERDICT", "WORTH IT?", ["Game fan? GO.", "Want a tight story? Stream it.", "Bring friends. Turn it up."], GOLD, 12, "verdict",
     "My verdict: if you love the games, go see it. If you want a tight, serious story, maybe wait for streaming. Either way, bring friends."),
    ("YOUR TURN", "CRITICS OR FANS?", ["Comment your score", "Like + Subscribe"], RED, 9, "outro",
     "Are you team critics or team fans? Drop your score in the comments, and subscribe to RG for more breakdowns."),
]

SHORT = [
    ("RG", "CRITICS\nvs FANS", ["Critics ~45%", "Fans ~84%"], RED, 5, "faceoff",
     "Critics hate the new Street Fighter. Fans love it. Here's why."),
    ("CRITICS SAY", "ROTTEN", ["Abrupt ending", "Too much sequel setup"], RED, 7, "critics",
     "Critics say the ending's abrupt, there's too much sequel setup, and the script is shaky."),
    ("FANS SAY", "KNOCKOUT", ["Looks like the games", "Easter eggs everywhere"], GREEN, 7, "fans",
     "Fans say it looks like the games, it's full of Easter eggs, and Jason Momoa is Blanka."),
    ("FUN FACT", "FRANCHISE BEST", ["1994: ~12%  2009: ~6%"], GOLD, 7, "history",
     "And by critic scores, it's still the best Street Fighter movie ever made."),
    ("NO SPOILERS", "CREDITS SCENE?", ["YES - ONE scene. Stay seated."], BLUE, 6, "credits",
     "Credits scene? Yes, one. Stay seated."),
    ("RG", "TEAM CRITICS\nor TEAM FANS?", ["Comment below"], RED, 6, "outro",
     "Team critics or team fans? Comment below and follow RG."),
]

# ---------------------------------------------------------------- helpers
clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
lerp = lambda a, b, t: a + (b - a) * t
eo = lambda x: 1 - (1 - clamp(x)) ** 3
eio = lambda x: (lambda u: 4 * u ** 3 if u < .5 else 1 - (-2 * u + 2) ** 3 / 2)(clamp(x))


def eback(x):
    x = clamp(x); c = 1.9
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


@lru_cache(None)
def font(path, size):
    return ImageFont.truetype(path, max(8, int(size)))


@lru_cache(None)
def text_sprite(text, path, size, fill, shadow):
    f = font(path, size)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l, t, r, b = tmp.multiline_textbbox((0, 0), text, font=f, spacing=int(size * .08))
    pad = int(size * .12) + shadow
    im = Image.new("RGBA", (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shadow:
        d.multiline_text((pad - l + shadow, pad - t + shadow), text, font=f, fill=(0, 0, 0, 190), spacing=int(size * .08))
    d.multiline_text((pad - l, pad - t), text, font=f, fill=fill, spacing=int(size * .08))
    return im


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


def fit_size(text, path, size, max_w):
    while size > 30:
        f = font(path, size)
        tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        if max(tmp.textlength(l, font=f) for l in text.split("\n")) <= max_w:
            break
        size -= 4
    return size


# ---------------------------------------------------------------- fighters
POSES = {
    "idle": dict(head=(8, -168), neck=(4, -132), felb=(38, -100), fhand=(62, -128), belb=(-6, -92), bhand=(28, -118), fknee=(34, 46), ffoot=(52, 100), bknee=(-26, 50), bfoot=(-54, 100)),
    "punch": dict(head=(26, -162), neck=(18, -128), felb=(72, -122), fhand=(132, -126), belb=(-10, -96), bhand=(14, -112), fknee=(48, 42), ffoot=(80, 100), bknee=(-34, 52), bfoot=(-80, 100)),
    "kick": dict(head=(-30, -160), neck=(-20, -126), felb=(10, -100), fhand=(36, -126), belb=(-50, -100), bhand=(-30, -126), fknee=(62, -34), ffoot=(142, -58), bknee=(-6, 50), bfoot=(-12, 100)),
    "blast": dict(head=(20, -160), neck=(14, -126), felb=(64, -96), fhand=(114, -100), belb=(58, -88), bhand=(110, -88), fknee=(48, 42), ffoot=(84, 100), bknee=(-34, 52), bfoot=(-82, 100)),
    "charge": dict(head=(-6, -160), neck=(-6, -126), felb=(-30, -70), fhand=(-48, -50), belb=(-40, -76), bhand=(-54, -56), fknee=(40, 44), ffoot=(70, 100), bknee=(-30, 50), bfoot=(-70, 100)),
    "hit": dict(head=(-42, -150), neck=(-26, -122), felb=(-10, -128), fhand=(10, -160), belb=(-56, -104), bhand=(-86, -120), fknee=(22, 50), ffoot=(40, 100), bknee=(-36, 46), bfoot=(-60, 100)),
    "win": dict(head=(0, -170), neck=(0, -134), felb=(34, -172), fhand=(48, -216), belb=(-34, -172), bhand=(-48, -216), fknee=(24, 50), ffoot=(36, 100), bknee=(-24, 50), bfoot=(-36, 100)),
}


def pose_at(seq, t, cycle=None):
    """seq = [(time, pose_name), ...]; eased interpolation between keyframes."""
    if cycle:
        t = t % cycle
    if t <= seq[0][0]:
        return POSES[seq[0][1]]
    for (t0, p0), (t1, p1) in zip(seq, seq[1:]):
        if t0 <= t <= t1:
            k = eio((t - t0) / max(1e-6, t1 - t0))
            a, b = POSES[p0], POSES[p1]
            return {j: (lerp(a[j][0], b[j][0], k), lerp(a[j][1], b[j][1], k)) for j in a}
    return POSES[seq[-1][1]]


def fighter(d, x, y, sc, pose, face, col, t=0.0, bob=True):
    if bob:
        y += math.sin(t * 7) * 4 * sc
    P = {k: (x + face * v[0] * sc, y + v[1] * sc) for k, v in pose.items()}
    P["hip"] = (x, y)
    P["sh"] = (lerp(P["neck"][0], x, .1), lerp(P["neck"][1], y, .1))
    d.ellipse([x - 70 * sc, y + 92 * sc, x + 70 * sc, y + 110 * sc], fill=(0, 0, 0, 110))
    groups = [
        ([("sh", "belb", 19), ("belb", "bhand", 17), ("hip", "bknee", 25), ("bknee", "bfoot", 21)], (30, 30, 42)),
        ([("neck", "hip", 36)], INK),
        ([("hip", "fknee", 25), ("fknee", "ffoot", 21), ("sh", "felb", 19), ("felb", "fhand", 17)], INK),
    ]
    rim = 5 * sc
    for segs, fill in groups:
        for width, c in ((rim * 2, col), (0, fill)):
            for a, b, w in segs:
                ww = w * sc + width
                d.line([P[a], P[b]], fill=c, width=int(ww))
                for p in (P[a], P[b]):
                    d.ellipse([p[0] - ww / 2, p[1] - ww / 2, p[0] + ww / 2, p[1] + ww / 2], fill=c)
        if fill == INK and segs[0][0] == "neck":  # belt
            d.line([(x - 22 * sc, y - 8 * sc), (x + 22 * sc, y - 8 * sc)], fill=col, width=int(9 * sc))
    hx, hy = P["head"]; r = 25 * sc
    d.ellipse([hx - r - rim, hy - r - rim, hx + r + rim, hy + r + rim], fill=col)
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=INK)
    d.line([(hx - r, hy - 7 * sc), (hx + r, hy - 7 * sc)], fill=col, width=int(8 * sc))  # headband
    tail = (hx - face * r, hy - 7 * sc)
    for k in (0, 1):
        wav = math.sin(t * 14 + k) * 8 * sc
        d.line([tail, (tail[0] - face * (34 + 8 * k) * sc, tail[1] + (6 + 10 * k) * sc + wav)], fill=col, width=int(6 * sc))
    for h in ("fhand", "bhand"):  # gloves
        gx, gy = P[h]
        d.ellipse([gx - 15 * sc, gy - 15 * sc, gx + 15 * sc, gy + 15 * sc], fill=col)
    return P


def spark(d, x, y, age, sc, col=(255, 255, 255), big=1.0):
    if not 0 <= age < .4:
        return
    k = age / .4
    a = int(255 * (1 - k))
    for i in range(12):
        ang = i * math.pi / 6 + .3
        r0, r1 = (20 + 90 * eo(k)) * sc * big, (50 + 150 * eo(k)) * sc * big
        d.line([(x + math.cos(ang) * r0, y + math.sin(ang) * r0), (x + math.cos(ang) * r1, y + math.sin(ang) * r1)],
               fill=col + (a,), width=int(7 * sc * big * (1 - k) + 1))
    rr = (30 + 120 * eo(k)) * sc * big
    d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(255, 255, 255, a), width=int(6 * sc))


def energy_ball(base, d, x, y, sc, col, t):
    r = (32 + 4 * math.sin(t * 30)) * sc
    put(base, glow(col, r * 6), x, y, "mm")
    for i in range(1, 5):
        rr = r * (1 - i * .15)
        d.ellipse([x - i * 26 * sc - rr, y - rr, x - i * 26 * sc + rr, y + rr], fill=col + (int(150 / i),))
    d.ellipse([x - r, y - r, x + r, y + r], fill=col + (255,))
    d.ellipse([x - r * .55, y - r * .55, x + r * .55, y + r * .55], fill=(255, 255, 255, 255))


# ---------------------------------------------------------------- visuals
# Each visual: draw(base, d, t, L) and events(dur) -> [(time, sfx)]. Timings shared by both.
FACE_CYCLE = 4.5
RED_SEQ = [(0, "idle"), (.6, "idle"), (.9, "punch"), (1.3, "idle"), (1.95, "idle"), (2.1, "hit"), (2.5, "idle"), (2.9, "charge"), (3.3, "blast"), (3.9, "blast"), (4.3, "idle")]
BLU_SEQ = [(0, "idle"), (.85, "idle"), (.95, "hit"), (1.4, "idle"), (1.8, "idle"), (2.1, "kick"), (2.5, "idle"), (2.9, "charge"), (3.3, "blast"), (3.9, "blast"), (4.3, "idle")]


def cyc_events(dur, cycle, evs, start=.6):
    out, c = [], 0.0
    while c < dur:
        out += [(c + t, s) for t, s in evs if start <= c + t < dur - .4]
        c += cycle
    return out


def v_faceoff(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    tt = t % FACE_CYCLE
    gap = 125 * sc
    fighter(d, cx - gap, cy, sc, pose_at(RED_SEQ, tt), 1, RED, t)
    fighter(d, cx + gap, cy, sc, pose_at(BLU_SEQ, tt), -1, BLUE, t + 1)
    spark(d, cx + 10 * sc, cy - 126 * sc, tt - .9, sc)
    spark(d, cx - 10 * sc, cy - 60 * sc, tt - 2.1, sc, GOLD)
    if 3.3 <= tt < 3.62:
        k = eo((tt - 3.3) / .32)
        energy_ball(base, d, lerp(cx - gap + 114 * sc, cx - 20 * sc, k), cy - 100 * sc, sc * .8, RED, t)
        energy_ball(base, d, lerp(cx + gap - 114 * sc, cx + 20 * sc, k), cy - 100 * sc, sc * .8, BLUE, t)
    if 3.62 <= tt < 4.1:
        put(base, glow((255, 255, 255), 500 * sc * (1 - (tt - 3.62) / .5)), cx, cy - 100 * sc, "mm")
    spark(d, cx, cy - 100 * sc, tt - 3.62, sc, GOLD, 1.6)
    for x, txt, col in ((cx - gap, "CRITICS", RED), (cx + gap, "FANS", BLUE)):
        put(base, text_sprite(txt, F_BLACK, int(40 * L["s"]), col + (255,), 3), x, cy - 240 * sc, "mb", eo((t - .3) / .4))
    vs = text_sprite("VS", F_BLACK, int(90 * L["s"]), (255, 255, 255, 255), 6)
    put(base, vs, cx, cy - 330 * sc, "mm", eo((t - .5) / .3), 1 + .08 * math.sin(t * 5))


def e_faceoff(dur):
    return cyc_events(dur, FACE_CYCLE, [(.9, "hit"), (2.1, "hit"), (3.3, "whoosh"), (3.62, "boom")])


COMBO = [(0, "idle"), (.35, "idle"), (.5, "punch"), (.8, "idle"), (1.15, "idle"), (1.3, "kick"), (1.6, "idle"), (1.85, "idle"), (2.0, "punch"), (2.25, "idle")]


def counter(base, L, t, value, x, y, col, t0=.5, t1=2.0, fmt="{}%", size=150):
    v = int(round(value * eo((t - t0) / (t1 - t0)))) if t > t0 else 0
    pop = 1 + .15 * max(0, 1 - abs(t - t1) / .15)
    put(base, text_sprite(fmt.format(v), F_BLACK, int(size * L["s"]), col + (255,), 8), x, y, "mm", eo((t - t0 + .2) / .3), pop)


def v_critics(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    tt = t % 2.4
    fx = cx - 90 * sc
    fighter(d, fx, cy, sc, pose_at(COMBO, tt), 1, RED, t)
    last = max([h for h in (.5, 1.3, 2.0) if h <= tt] or [-9])
    swing = math.sin((tt - last) * 9) * math.exp(-(tt - last) * 3) * 22 if last > 0 else math.sin(t * 2) * 2
    bx, by = fx + 175 * sc, cy - 260 * sc
    ang = math.radians(swing)
    ex, ey = bx + math.sin(ang) * 120 * sc, by + math.cos(ang) * 120 * sc
    d.line([(bx, by - 60 * sc), (ex, ey)], fill=(120, 120, 130), width=int(5 * sc))
    bag = Image.new("RGBA", (int(110 * sc), int(250 * sc)), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bag)
    bd.rounded_rectangle([0, 0, bag.width - 1, bag.height - 1], radius=int(40 * sc), fill=(70, 22, 28), outline=GOLD, width=int(5 * sc))
    for i, ch in enumerate("MOVIE"):
        bd.text((bag.width / 2, 40 * sc + i * 38 * sc), ch, font=font(F_BLACK, 34 * sc), fill=GOLD, anchor="mm")
    put(base, bag, ex, ey + 115 * sc, "mm", angle=-swing)
    for h, ty in ((.5, -126), (1.3, -58), (2.0, -126)):
        spark(d, fx + 150 * sc, cy + ty * sc, tt - h, sc, GOLD)
    counter(base, L, t, 45, cx, cy - 330 * sc, RED)
    put(base, text_sprite("CRITICS", F_BLACK, int(34 * L["s"]), (255, 255, 255, 230), 3), cx, cy - 235 * sc, "mm", eo((t - .7) / .3))


def e_critics(dur):
    return [(2.0, "ding")] + cyc_events(dur, 2.4, [(.5, "hit"), (1.3, "hit"), (2.0, "hit")])


BLAST = [(0, "idle"), (.2, "charge"), (.6, "blast"), (1.2, "blast"), (1.5, "idle")]


def v_fans(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    tt = t % 2.0
    fx = cx - 150 * sc
    if .2 <= tt < .6:
        put(base, glow(GREEN, 220 * sc * eo((tt - .2) / .4)), fx - 50 * sc, cy - 55 * sc, "mm")
    fighter(d, fx, cy, sc, pose_at(BLAST, tt), 1, GREEN, t)
    for k in range(3):  # ball currently flying (and the previous one leaving)
        age = tt - .6 + k * 2.0
        if 0 <= age < 1.0:
            energy_ball(base, d, fx + 125 * sc + age * 900 * sc, cy - 95 * sc, sc, GREEN, t)
    rnd = random.Random(7)
    if t > 2.0:  # confetti once the score lands
        for i in range(40):
            x0, sp, ph = rnd.uniform(-1, 1), rnd.uniform(.5, 1.2), rnd.uniform(0, 6)
            age = t - 2.0 + ph
            px = cx + x0 * 330 * sc + math.sin(age * 3 + i) * 20 * sc
            py = cy - 450 * sc + (age * 160 * sp % 520) * sc
            c = (GOLD, GREEN, BLUE, WHITE)[i % 4]
            d.rectangle([px, py, px + 12 * sc, py + 7 * sc], fill=c + (220,))
    counter(base, L, t, 84, cx, cy - 330 * sc, GREEN)
    put(base, text_sprite("FANS", F_BLACK, int(34 * L["s"]), (255, 255, 255, 230), 3), cx, cy - 235 * sc, "mm", eo((t - .7) / .3))


def e_fans(dur):
    return [(2.0, "ding")] + cyc_events(dur, 2.0, [(.6, "whoosh")])


def bar(d, x, y, w, h, frac, col, sc):
    d.rounded_rectangle([x, y, x + w, y + h], radius=int(h / 2), fill=(255, 255, 255, 30))
    if frac > .01:
        d.rounded_rectangle([x, y, x + max(h, w * frac), y + h], radius=int(h / 2), fill=col + (255,))


def v_bars(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    w, h = 560 * sc, 70 * sc
    x0 = cx - w / 2
    for i, (lab, val, col) in enumerate((("CRITICS", 45, RED), ("FANS", 84, GREEN))):
        y = cy - 230 * sc + i * 190 * sc
        k = eo((t - .5 - i * .3) / 1.4)
        put(base, text_sprite(lab, F_BLACK, int(36 * L["s"]), (255, 255, 255, 255), 3), x0, y - 12 * sc, "lb", eo((t - .3) / .3))
        bar(d, x0, y, w, h, val / 100 * k, col, sc)
        put(base, text_sprite(f"{int(val * k)}%", F_BLACK, int(46 * L["s"]), (255, 255, 255, 255), 3), x0 + w * val / 100 * k + 14 * sc, y + h / 2, "lm", k)
    if t > 2.3:  # bracket + slam
        k = eback((t - 2.3) / .35)
        xa, xb = x0 + w * .45, x0 + w * .84
        yb = cy + 110 * sc
        d.line([(xa, yb), (xa, yb + 30 * sc), (xb, yb + 30 * sc), (xb, yb)], fill=GOLD, width=int(6 * sc))
        put(base, text_sprite("38 PTS", F_BLACK, int(70 * L["s"]), GOLD + (255,), 6), (xa + xb) / 2, yb + 90 * sc, "mm", clamp((t - 2.3) / .15), max(.01, k))


def e_bars(dur):
    return [(.5, "riser"), (2.0, "ding"), (2.3, "slam")]


def v_gauge(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 40 * L["vs"], L["vs"]
    R = 260 * sc
    for i in range(60):  # colored arc
        a0 = math.pi + i / 60 * math.pi
        c = RED if i < 30 else GOLD if i < 42 else GREEN
        d.arc([cx - R, cy - R, cx + R, cy + R], math.degrees(a0), math.degrees(a0 + math.pi / 60) + .5, fill=c, width=int(40 * sc))
    target = 84 * eback((t - .4) / 1.2) if t < 2.2 else 84 - 6 * eo((t - 2.2) / 3) + math.sin(t * 9) * 1.2
    a = math.pi + clamp(target / 100, 0, 1.05) * math.pi
    d.line([(cx, cy), (cx + math.cos(a) * R * .85, cy + math.sin(a) * R * .85)], fill=WHITE, width=int(12 * sc))
    d.ellipse([cx - 24 * sc, cy - 24 * sc, cx + 24 * sc, cy + 24 * sc], fill=WHITE)
    put(base, text_sprite(f"{int(target)}%", F_BLACK, int(90 * L["s"]), (255, 255, 255, 255), 6), cx, cy + 90 * sc, "mm", eo((t - .4) / .3))
    if t > 2.2:
        put(base, text_sprite("?", F_BLACK, int(110 * L["s"]), GOLD + (255,), 6), cx + 190 * sc, cy + 80 * sc, "mm", 1, 1 + .12 * math.sin(t * 6))


def e_gauge(dur):
    return [(.4, "riser"), (1.5, "ding"), (2.2, "whoosh")]


def v_history(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    base_y, maxh, bw = cy + 120 * sc, 420 * sc, 130 * sc
    for i, (lab, val, col) in enumerate((("1994", 12, RED), ("2009", 6, RED), ("2026", 45, GOLD))):
        x = cx + (i - 1) * 190 * sc
        k = eback((t - .5 - i * .45) / .6)
        h = maxh * val / 50 * k
        d.rounded_rectangle([x - bw / 2, base_y - max(6, h), x + bw / 2, base_y], radius=int(14 * sc), fill=col + (255,))
        put(base, text_sprite(lab, F_BLACK, int(38 * L["s"]), (255, 255, 255, 255), 3), x, base_y + 40 * sc, "mm")
        put(base, text_sprite(f"{val}%", F_BLACK, int(46 * L["s"]), (255, 255, 255, 255), 4), x, base_y - h - 40 * sc, "mm", clamp(k))
    if t > 2.1:
        x = cx + 190 * sc
        k = eback((t - 2.1) / .4)
        badge = Image.new("RGBA", (int(200 * sc), int(70 * sc)), (0, 0, 0, 0))
        bd = ImageDraw.Draw(badge)
        bd.rounded_rectangle([0, 0, badge.width - 1, badge.height - 1], radius=int(20 * sc), fill=GOLD)
        bd.text((badge.width / 2, badge.height / 2), "BEST YET", font=font(F_BLACK, 34 * sc), fill=INK, anchor="mm")
        put(base, badge, x, base_y - maxh * .9 - 100 * sc, "mm", 1, max(.01, k), angle=8 * math.sin(t * 3))
    d.line([(cx - 330 * sc, base_y), (cx + 330 * sc, base_y)], fill=(255, 255, 255, 120), width=int(4 * sc))


def e_history(dur):
    return [(.5, "hit"), (.95, "hit"), (1.4, "hit"), (2.1, "slam")]


def v_money(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    x0, y0, w, h = cx - 300 * sc, cy + 120 * sc, 600 * sc, 380 * sc
    d.line([(x0, y0), (x0 + w, y0)], fill=(255, 255, 255, 110), width=int(4 * sc))
    d.line([(x0, y0), (x0, y0 - h)], fill=(255, 255, 255, 110), width=int(4 * sc))
    k = eo((t - .4) / 2.0)
    pts = []
    for i in range(41):
        u = i / 40
        if u > k:
            break
        pts.append((x0 + u * w, y0 - h * (u ** 1.6) * .9 - math.sin(u * 18) * 14 * sc * u))
    if len(pts) > 1:
        d.line(pts, fill=GREEN, width=int(10 * sc), joint="curve")
        px, py = pts[-1]
        put(base, glow(GREEN, 140 * sc), px, py, "mm")
        d.ellipse([px - 14 * sc, py - 14 * sc, px + 14 * sc, py + 14 * sc], fill=WHITE)
    counter(base, L, t, 35, cx - 60 * sc, cy - 330 * sc, GREEN, .4, 2.4, "${}M", 120)
    if t > 2.6:
        put(base, text_sprite("~$70M WORLDWIDE", F_BLACK, int(46 * L["s"]), GOLD + (255,), 4), cx, cy + 190 * sc, "mm", 1, max(.01, eback((t - 2.6) / .35)))
    rnd = random.Random(3)
    for i in range(14):  # rising coins
        ph = rnd.uniform(0, 3)
        age = (t + ph) % 3
        x = x0 + rnd.uniform(.1, .95) * w
        y = y0 - age * 170 * sc
        a = int(255 * (1 - age / 3))
        rr = 16 * sc
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=GOLD + (a,), outline=(180, 130, 0, a), width=int(3 * sc))
        d.text((x, y), "$", font=font(F_BLACK, 20 * sc), fill=(120, 80, 0, a), anchor="mm")


def e_money(dur):
    return [(.4, "riser"), (2.4, "ding"), (2.6, "slam")]


def v_credits(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 50 * L["vs"], L["vs"]
    w, h = 560 * sc, 400 * sc
    x0, y0 = cx - w / 2, cy - h / 2 - 60 * sc
    put(base, glow((200, 200, 255), 900 * sc * (0.9 + .1 * math.sin(t * 20))), cx, cy - 60 * sc, "mm", .25)
    d.rectangle([x0 - 10 * sc, y0 - 10 * sc, x0 + w + 10 * sc, y0 + h + 10 * sc], fill=(40, 40, 52))
    d.rectangle([x0, y0, x0 + w, y0 + h], fill=(4, 4, 8))
    rnd = random.Random(11)
    rows = [(rnd.uniform(.25, .5), rnd.uniform(.3, .6)) for _ in range(60)]
    for i, (a, b) in enumerate(rows):
        y = y0 + h + 20 * sc + i * 34 * sc - (t * 90 * sc) % (60 * 34 * sc)
        if y0 + 10 * sc < y < y0 + h - 16 * sc:
            d.rectangle([cx - a * w * .8, y, cx - 10 * sc, y + 10 * sc], fill=(150, 150, 160))
            d.rectangle([cx + 10 * sc, y, cx + b * w * .8, y + 10 * sc], fill=(210, 210, 220))
    for i in range(7):  # seats
        sx = cx + (i - 3) * 85 * sc
        d.rounded_rectangle([sx - 34 * sc, cy + 235 * sc, sx + 34 * sc, cy + 290 * sc], radius=int(16 * sc), fill=(120, 25, 35))
    if t > 1.0:
        badge = Image.new("RGBA", (int(330 * sc), int(110 * sc)), (0, 0, 0, 0))
        bd = ImageDraw.Draw(badge)
        bd.rounded_rectangle([0, 0, badge.width - 1, badge.height - 1], radius=int(26 * sc), fill=RED, outline=WHITE, width=int(5 * sc))
        bd.text((badge.width / 2, badge.height / 2), "1 SCENE", font=font(F_BLACK, 56 * sc), fill=WHITE, anchor="mm")
        put(base, badge, cx, y0 + h / 2, "mm", 1, max(.01, eback((t - 1.0) / .35)), angle=-6)
    if t > 1.8:
        put(base, text_sprite("STAY SEATED", F_BLACK, int(52 * L["s"]), GOLD + (255,), 4), cx, cy + 190 * sc, "mm", .6 + .4 * math.sin(t * 6))


def e_credits(dur):
    return [(1.0, "slam"), (1.8, "ding")]


CAST_COLORS = {"cast_a": (RED, BLUE, GOLD, PURPLE), "cast_b": (GREEN, GOLD, BLUE, RED)}


def v_cast(name):
    def draw(base, d, t, L):
        cx, cy, sc = L["vx"], L["vy"] + 30 * L["vs"], L["vs"] * .72
        for i, col in enumerate(CAST_COLORS[name]):
            t0 = .5 + i * .45
            if t < t0:
                continue
            k = clamp((t - t0) / .35)
            drop = (1 - k) ** 2 * -600 * sc
            x = cx + (i - 1.5) * 190 * sc
            p = "win" if (t - t0) % 3.2 < .45 and t - t0 > 1 else "idle"
            fighter(d, x, cy + drop, sc, POSES[p], 1 if i < 2 else -1, col, t + i)
            if t - t0 - .35 >= 0:
                spark(d, x, cy + 100 * sc, t - t0 - .35, sc * .7, col)
    return draw


def e_cast(dur):
    return [(.5 + i * .45 + .35, "hit") for i in range(4)]


WIN = [(0, "idle"), (.6, "charge"), (.9, "win"), (1.6, "win"), (2.1, "idle")]


def v_verdict(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    tt = t % 3.0
    jump = -abs(math.sin(clamp((tt - .9) / .5) * math.pi)) * 80 * sc
    fighter(d, cx - 120 * sc, cy + jump, sc, pose_at(WIN, tt), 1, GOLD, t)
    if t > 1.5:
        k = eback((t - 1.5) / .35)
        stamp = Image.new("RGBA", (int(300 * sc), int(300 * sc)), (0, 0, 0, 0))
        sd = ImageDraw.Draw(stamp)
        sd.ellipse([8 * sc, 8 * sc, stamp.width - 8 * sc, stamp.height - 8 * sc], outline=GREEN, width=int(14 * sc))
        sd.text((stamp.width / 2, stamp.height / 2 - 30 * sc), "GO", font=font(F_BLACK, 120 * sc), fill=GREEN, anchor="mm")
        sd.text((stamp.width / 2, stamp.height / 2 + 60 * sc), "SEE IT", font=font(F_BLACK, 40 * sc), fill=GREEN, anchor="mm")
        put(base, stamp, cx + 150 * sc, cy - 140 * sc, "mm", clamp((t - 1.5) / .1), max(.01, 2.2 - 1.2 * k), angle=-14)
    rnd = random.Random(5)
    for i in range(16):  # sparkles around the winner
        ph = rnd.uniform(0, 2)
        age = (t + ph) % 2
        a = int(255 * math.sin(age / 2 * math.pi))
        x = cx - 120 * sc + rnd.uniform(-170, 170) * sc
        y = cy - 140 * sc + rnd.uniform(-160, 120) * sc
        r = 6 * sc * math.sin(age / 2 * math.pi)
        d.polygon([(x, y - 3 * r), (x + r, y), (x, y + 3 * r), (x - r, y)], fill=GOLD + (a,))


def e_verdict(dur):
    return [(1.5, "slam")] + cyc_events(dur, 3.0, [(.9, "whoosh")])


def v_outro(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"] - 40 * L["vs"], L["vs"]
    k = eback((t - .3) / .4)
    clicked = t > 2.0
    btn = Image.new("RGBA", (int(460 * sc), int(130 * sc)), (0, 0, 0, 0))
    bd = ImageDraw.Draw(btn)
    bd.rounded_rectangle([0, 0, btn.width - 1, btn.height - 1], radius=int(65 * sc), fill=(90, 90, 100) if clicked else (230, 30, 40))
    bd.text((btn.width / 2, btn.height / 2), "SUBSCRIBED" if clicked else "SUBSCRIBE", font=font(F_BLACK, 52 * sc), fill=WHITE, anchor="mm")
    press = .92 if 2.0 <= t < 2.12 else 1
    put(base, btn, cx, cy, "mm", clamp((t - .3) / .2), max(.01, k) * press)
    if clicked:
        age = t - 2.0
        if age < .6:
            rr = (80 + 300 * eo(age / .6)) * sc
            d.ellipse([cx - rr, cy - rr * .4, cx + rr, cy + rr * .4], outline=(255, 255, 255, int(255 * (1 - age / .6))), width=int(6 * sc))
        bx, by = cx + 300 * sc, cy
        wob = math.sin(age * 25) * math.exp(-age * 2) * 25
        bell = Image.new("RGBA", (int(100 * sc), int(110 * sc)), (0, 0, 0, 0))
        bb = ImageDraw.Draw(bell)
        bb.pieslice([10 * sc, 10 * sc, 90 * sc, 150 * sc], 180, 360, fill=GOLD)
        bb.rectangle([10 * sc, 78 * sc, 90 * sc, 88 * sc], fill=GOLD)
        bb.ellipse([40 * sc, 86 * sc, 60 * sc, 106 * sc], fill=GOLD)
        put(base, bell, bx, by, "mm", 1, max(.01, eback(age / .3)), angle=wob)
    # cursor
    u = eio((t - .9) / 1.0)
    mx, my = lerp(cx + 420 * sc, cx + 60 * sc, u), lerp(cy + 320 * sc, cy + 30 * sc, u)
    if t > .8:
        pts = [(0, 0), (0, 60), (16, 46), (28, 72), (38, 67), (26, 42), (46, 42)]
        d.polygon([(mx + x * sc * 1.2, my + y * sc * 1.2) for x, y in pts], fill=WHITE, outline=INK, width=int(3 * sc))
    put(base, text_sprite("RG", F_BLACK, int(120 * L["s"]), RED + (255,), 8), cx, cy - 210 * sc, "mm", eo((t - .2) / .4), 1 + .05 * math.sin(t * 4))


def e_outro(dur):
    return [(.3, "whoosh"), (2.0, "click"), (2.15, "ding")]


def v_ticket(base, d, t, L):
    cx, cy, sc = L["vx"], L["vy"], L["vs"]
    fl = .5 + .5 * abs(math.sin(t * 13) * math.sin(t * 7.3))
    d.polygon([(cx - 420 * sc, cy - 380 * sc), (cx + 380 * sc, cy - 260 * sc), (cx + 380 * sc, cy + 220 * sc)], fill=(255, 240, 200, int(18 + 22 * fl)))
    tk = Image.new("RGBA", (int(560 * sc), int(260 * sc)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tk)
    td.rounded_rectangle([0, 0, tk.width - 1, tk.height - 1], radius=int(24 * sc), fill=GOLD)
    for i in range(9):
        y = 20 * sc + i * 27 * sc
        td.ellipse([400 * sc, y, 412 * sc, y + 12 * sc], fill=INK)
    td.text((30 * sc, 30 * sc), "ADMIT ONE", font=font(F_BLACK, 34 * sc), fill=INK)
    td.text((30 * sc, 90 * sc), "OCT 16", font=font(F_BLACK, 84 * sc), fill=INK)
    td.text((30 * sc, 190 * sc), "2026  |  ~2 HRS", font=font(F_BOLD, 34 * sc), fill=INK)
    td.text((480 * sc, 130 * sc), "RG", font=font(F_BLACK, 52 * sc), fill=RED, anchor="mm")
    k = eback((t - .4) / .6)
    put(base, tk, lerp(cx + 700 * sc, cx, k), cy - 40 * sc + math.sin(t * 2) * 8 * sc, "mm", 1, 1, angle=lerp(-30, 6, k) + math.sin(t * 1.6) * 2)
    rnd = random.Random(2)
    for i in range(20):  # popcorn falling
        ph = rnd.uniform(0, 3)
        age = (t + ph) % 3
        x = cx + rnd.uniform(-320, 320) * sc
        y = cy - 360 * sc + age * 240 * sc
        r = rnd.uniform(9, 15) * sc
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 248, 225, 230))


def e_ticket(dur):
    return [(.4, "whoosh")]


VISUALS = {
    "faceoff": (v_faceoff, e_faceoff), "critics": (v_critics, e_critics), "fans": (v_fans, e_fans),
    "bars": (v_bars, e_bars), "gauge": (v_gauge, e_gauge), "history": (v_history, e_history),
    "money": (v_money, e_money), "credits": (v_credits, e_credits), "verdict": (v_verdict, e_verdict),
    "outro": (v_outro, e_outro), "ticket": (v_ticket, e_ticket),
    "cast_a": (v_cast("cast_a"), e_cast), "cast_b": (v_cast("cast_b"), e_cast),
}

# ---------------------------------------------------------------- scene frame


def layout(W, H):
    portrait = H > W
    s = (W / 1080) if portrait else (W / 1920)
    if portrait:
        return dict(W=W, H=H, s=s, portrait=True, m=70 * s, ky=.075 * H, tw=W - 140 * s,
                    vx=W / 2, vy=.635 * H, vs=1.15 * s, cy=.835 * H, csize=56 * s, cwords=4)
    return dict(W=W, H=H, s=s, portrait=False, m=100 * s, ky=.15 * H, tw=.47 * W,
                vx=.75 * W, vy=.6 * H, vs=1.25 * s, cy=H - 100 * s, csize=42 * s, cwords=8)


def make_bg(L, accent):
    W, H = L["W"], L["H"]
    y = np.linspace(0, 1, H)[:, None]
    arr = np.zeros((H, W, 3), np.float32)
    arr[..., 0] = 12 + 18 * y; arr[..., 1] = 10 + 6 * y; arr[..., 2] = 22 + 12 * y
    yy, xx = np.mgrid[0:H, 0:W]
    gx, gy = L["vx"], L["vy"] - 120 * L["vs"]
    dist = np.sqrt((xx - gx) ** 2 + (yy - gy) ** 2) / (max(W, H) * .55)
    g = np.clip(1 - dist, 0, 1) ** 2 * .55
    for c in range(3):
        arr[..., c] += g * accent[c]
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    return img


def draw_text_block(base, d, L, kicker, head, bullets, accent, t):
    s, m = L["s"], L["m"]
    # kicker box slides in
    k = eo((t - .15) / .35)
    kf = font(F_BLACK, 40 * s)
    kw = d.textlength(kicker, font=kf) + 40 * s
    x = m - (1 - k) * (kw + m)
    y = L["ky"]
    d.rectangle([x, y, x + kw, y + 66 * s], fill=accent + (255,))
    d.text((x + 20 * s, y + 33 * s), kicker, font=kf, fill=INK, anchor="lm")
    y += 96 * s
    # headline slams in
    hs = fit_size(head, F_BLACK, int((118 if not L["portrait"] else 112) * s), L["tw"])
    spr = text_sprite(head, F_BLACK, hs, (255, 255, 255, 255), int(7 * s))
    sk = (t - .3) / .25
    scale = 1.6 - .6 * eo(sk) if sk < 1 else 1.0
    if sk > 0:
        put(base, spr, m - 10 * s + spr.width / 2, y + spr.height / 2, "mm", clamp(sk * 2), scale)
    y += spr.height + 4 * s
    uw = 230 * s * eo((t - .55) / .4)
    d.rectangle([m, y, m + uw, y + 10 * s], fill=accent + (255,))
    y += 46 * s
    bs = int((52 if not L["portrait"] else 54) * s)
    for i, b in enumerate(bullets):
        bt = (t - .9 - i * .4) / .35
        if bt <= 0:
            continue
        a = eo(bt)
        size = fit_size(b, F_BOLD, bs, L["tw"] - 60 * s)
        bx = m + (1 - a) * -80 * s
        d.rectangle([bx, y + 18 * s, bx + 22 * s, y + 40 * s], fill=accent + (int(255 * a),))
        d.text((bx + 46 * s, y), b, font=font(F_BOLD, size), fill=(245, 245, 245, int(255 * a)))
        y += bs * 1.55


def text_events(bullets):
    return [(.15, "whoosh"), (.42, "slam")] + [(.9 + i * .4, "swish") for i in range(len(bullets))]


def draw_caption(base, d, L, vo, t, dur):
    words = vo.split()
    n = len(words)
    span = dur - .8
    idx = int(clamp((t - .3) / span, 0, .9999) * n)
    cw = L["cwords"]
    chunk = words[idx // cw * cw: idx // cw * cw + cw]
    cur = idx % cw
    f = font(F_BLACK, L["csize"])
    space = d.textlength(" ", font=f)
    widths = [d.textlength(w, font=f) for w in chunk]
    total = sum(widths) + space * (len(chunk) - 1)
    x = L["W"] / 2 - total / 2
    y = L["cy"]
    pad = 22 * L["s"]
    d.rounded_rectangle([x - pad, y - L["csize"] * .75, x + total + pad, y + L["csize"] * .75], radius=int(18 * L["s"]), fill=(0, 0, 0, 170))
    for i, (w, ww) in enumerate(zip(chunk, widths)):
        col = GOLD if i == cur else (255, 255, 255)
        yy = y - (6 * L["s"] if i == cur else 0)
        d.text((x, yy), w, font=f, fill=col, anchor="lm", stroke_width=int(3 * L["s"]), stroke_fill=(0, 0, 0))
        x += ww + space


def scene_frame(scene, L, bg, t, embers, shakes):
    kicker, head, bullets, accent, dur, visual, vo = scene
    W, H, s = L["W"], L["H"], L["s"]
    img = bg.copy()
    d = ImageDraw.Draw(img, "RGBA")
    step = 150 * s  # moving speed lines
    off = (t * 520 * s) % step
    for i in range(-2, int((W + H) / step) + 2):
        x = i * step + off - H * .6
        d.line([(x, H), (x + H * .6, 0)], fill=(255, 255, 255, 14), width=int(2 * s))
    for (x0, y0, sp, r, ph) in embers:  # floating embers
        y = (y0 - t * sp) % (H + 40) - 20
        x = x0 + math.sin(t * 1.3 + ph) * 18 * s
        a = int(120 + 100 * math.sin(t * 4 + ph))
        d.ellipse([x - r, y - r, x + r, y + r], fill=accent + (max(0, a),))
    VISUALS[visual][0](img, d, t, L)
    draw_text_block(img, d, L, kicker, head, bullets, accent, t)
    draw_caption(img, d, L, vo, t, dur)
    put(img, text_sprite("RG", F_BLACK, int(54 * s), accent + (255,), 4), W - L["m"], 45 * s, "rt", 1, 1 + .04 * math.sin(t * 3))
    # transitions: white flash in, accent wipe out
    if t < .22:
        d.rectangle([0, 0, W, H], fill=(255, 255, 255, int(255 * (1 - t / .22))))
    if t > dur - .3:
        k = eio((t - (dur - .3)) / .3)
        xe = -H * .5 + k * (W + H * .6)
        d.polygon([(-10, -10), (xe + H * .5, -10), (xe, H + 10), (-10, H + 10)], fill=accent + (255,))
    # camera shake on impacts
    amp = 0.0
    for st, strength in shakes:
        if 0 <= t - st < .25:
            amp = max(amp, strength * (1 - (t - st) / .25))
    if amp > 0:
        rnd = random.Random(int(t * 1000))
        img = ImageChops.offset(img, int(rnd.uniform(-1, 1) * amp * s), int(rnd.uniform(-1, 1) * amp * s))
    return img


def scene_setup(scene, L, idx):
    rnd = random.Random(idx * 17 + 1)
    embers = [(rnd.uniform(0, L["W"]), rnd.uniform(0, L["H"]), rnd.uniform(30, 90) * L["s"], rnd.uniform(2, 5) * L["s"], rnd.uniform(0, 6)) for _ in range(45)]
    evs = scene_events(scene)
    shakes = [(t, {"slam": 14, "boom": 26, "hit": 9}.get(e, 0)) for t, e in evs if e in ("slam", "boom", "hit")]
    return make_bg(L, scene[3]), embers, shakes


def scene_events(scene):
    kicker, head, bullets, accent, dur, visual, vo = scene
    return sorted(text_events(bullets) + VISUALS[visual][1](dur))


def render_scene(job):
    scene, W, H, path, idx = job
    L = layout(W, H)
    bg, embers, shakes = scene_setup(scene, L, idx)
    dur = scene[4]
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "21",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for f in range(int(dur * FPS)):
        p.stdin.write(scene_frame(scene, L, bg, f / FPS, embers, shakes).tobytes())
    p.stdin.close(); p.wait()
    return path


# ---------------------------------------------------------------- audio
def synth_audio(scenes, path):
    total = sum(sc[4] for sc in scenes)
    n = int(total * SR)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(1)
    bpm = 128; beat = 60 / bpm

    def add(sig, t):
        i = int(t * SR)
        if i >= n:
            return
        j = min(n, i + len(sig))
        out[i:j] += sig[: j - i]

    def tt(d):
        return np.arange(int(d * SR)) / SR

    x = tt(.45); kick = (np.sin(2 * np.pi * (45 * x + 90 * (1 - np.exp(-30 * x)) / 30)) * np.exp(-7 * x)).astype(np.float32)
    x = tt(.25); snare = (rng.uniform(-1, 1, len(x)) * np.exp(-18 * x) * .5 + np.sin(2 * np.pi * 190 * x) * np.exp(-25 * x) * .4).astype(np.float32)
    x = tt(.06); hat = (np.diff(rng.uniform(-1, 1, len(x) + 1)) * np.exp(-60 * x) * .18).astype(np.float32)
    notes = [55, 55, 65.4, 55, 73.4, 55, 82.4, 49]
    music = np.zeros(n, np.float32)
    k = 0; t = 0.0
    while t < total:
        for sig, cond in ((kick, True), (snare, k % 2 == 1)):
            if cond:
                i = int(t * SR); j = min(n, i + len(sig)); music[i:j] += sig[: j - i] * (.8 if sig is kick else .5)
        for h in (0, .5):
            i = int((t + h * beat) * SR); j = min(n, i + len(hat))
            if i < n: music[i:j] += hat[: j - i]
        for h in (0, .5):  # bass eighth notes
            f = notes[(k * 2 + int(h * 2)) % 8]
            x = tt(beat / 2)
            bs = (np.sin(2 * np.pi * f * x) + .35 * np.sin(4 * np.pi * f * x)) * np.exp(-3 * x) * .35
            i = int((t + h * beat) * SR); j = min(n, i + len(bs))
            if i < n: music[i:j] += bs[: j - i].astype(np.float32)
        k += 1; t += beat
    fade = np.minimum(1, np.minimum(np.arange(n) / SR / 1.0, (n - np.arange(n)) / SR / 2.0)).astype(np.float32)
    out += music * .32 * fade

    def noise_env(d, a, decay, smooth):
        x = tt(d); nz = rng.uniform(-1, 1, len(x))
        if smooth > 1:
            nz = np.convolve(nz, np.ones(smooth) / smooth, "same") * math.sqrt(smooth)
        return (nz * a(x) * decay).astype(np.float32)

    x = tt(.4)
    sfx = {
        "whoosh": noise_env(.4, lambda x: np.sin(np.pi * x / .4) ** 2, .35, 18),
        "swish": noise_env(.22, lambda x: np.sin(np.pi * x / .22) ** 2, .18, 8),
        "hit": (np.sin(2 * np.pi * (70 * tt(.3) + 120 * (1 - np.exp(-40 * tt(.3))) / 40)) * np.exp(-12 * tt(.3)) * .9).astype(np.float32)
               + noise_env(.3, lambda x: np.exp(-35 * x), .6, 3),
        "slam": (np.sin(2 * np.pi * (48 * tt(.6) + 140 * (1 - np.exp(-25 * tt(.6))) / 25)) * np.exp(-6 * tt(.6))).astype(np.float32)
                + noise_env(.6, lambda x: np.exp(-14 * x), .55, 4),
        "boom": (np.sin(2 * np.pi * (38 * tt(1.0) + 160 * (1 - np.exp(-18 * tt(1.0))) / 18)) * np.exp(-3.5 * tt(1.0)) * 1.1).astype(np.float32)
                + noise_env(1.0, lambda x: np.exp(-5 * x), .7, 6),
        "ding": ((np.sin(2 * np.pi * 1320 * tt(.7)) + .5 * np.sin(2 * np.pi * 1980 * tt(.7))) * np.exp(-6 * tt(.7)) * .22).astype(np.float32),
        "click": noise_env(.02, lambda x: np.exp(-300 * x), .6, 1),
        "riser": noise_env(1.4, lambda x: (x / 1.4) ** 2, .25, 30),
    }
    t0 = 0.0
    for sc in scenes:
        for t, e in scene_events(sc):
            add(sfx[e], t0 + t)
        t0 += sc[4]
    out /= max(1e-6, np.abs(out).max()) / .9
    pcm = (out * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


# ---------------------------------------------------------------- build
def ts(x, ms=True):
    base = f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d}"
    return base + f",{int(round(x * 1000)) % 1000:03d}" if ms else base[3:]


def build(scenes, W, H, name, pool):
    os.makedirs(TMP, exist_ok=True)
    jobs = [(sc, W, H, os.path.join(TMP, f"{name}_{i:02d}.mp4"), i) for i, sc in enumerate(scenes)]
    parts = pool.map(render_scene, jobs, chunksize=1)
    lst = os.path.join(TMP, f"{name}.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    wav = os.path.join(TMP, f"{name}.wav")
    synth_audio(scenes, wav)
    final = os.path.join(OUT, f"{name}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav,
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest", "-movflags", "+faststart", final], check=True)
    t, srt, script = 0.0, [], []
    for i, sc in enumerate(scenes):
        kicker, head, _, _, dur, _, vo = sc
        srt.append(f"{i + 1}\n{ts(t)} --> {ts(t + dur)}\n{vo}\n")
        script.append(f"[{ts(t, False)}] {kicker} - {head.replace(chr(10), ' ')}\n{vo}\n")
        t += dur
    open(os.path.join(OUT, f"{name}.srt"), "w").write("\n".join(srt))
    open(os.path.join(OUT, f"{name}_voiceover_script.txt"), "w").write("\n".join(script))
    print(f"{final}  ({t:.1f}s)")


def preview():
    pdir = os.path.join(OUT, "preview")
    os.makedirs(pdir, exist_ok=True)
    for name, scenes, W, H in (("long", LONG, 1920, 1080), ("short", SHORT, 1080, 1920)):
        L = layout(W, H)
        for i, sc in enumerate(scenes):
            bg, embers, shakes = scene_setup(sc, L, i)
            scene_frame(sc, L, bg, min(sc[4] - .5, 4.0), embers, []).save(os.path.join(pdir, f"{name}_{i:02d}.png"))
    print(pdir)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        preview()
    else:
        with Pool(os.cpu_count()) as pool:
            build(LONG, 1920, 1080, "street_fighter_2026_youtube", pool)
            build(SHORT, 1080, 1920, "street_fighter_2026_short", pool)
