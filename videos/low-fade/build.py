"""Low fade in 5 steps: pixel-art assets, SFX master and project.json for the Autopilot renderer.

All drawing happens on a 180 x 320 pixel grid and is upscaled 6x (nearest) to 1080 x 1920.
Times in the shot list are narration seconds; the renderer's voice lead is added when writing the manifest.
"""
import json, math, os, random
import numpy as np
from PIL import Image
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
os.makedirs(A, exist_ok=True)
GW, GH, S = 180, 320, 6
D = 1280 / GW                        # design units per grid pixel
LEAD, TAIL = 0.15, 0.35
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0

def hexc(h, a=255):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [a], dtype=np.uint8)

C = {k: hexc(v) for k, v in dict(
    ink="#1a0f0c", skin="#e3a679", skin_sh="#bf7e55", skin_dk="#93583a", lip="#b0604a",
    stub0="#a8775a", stub1="#6f4a33", stub2="#4a2f1f", hair3="#3a2416", hair4="#2a1910", hair_hi="#523421",
    cape="#262636", cape_hi="#3a3a52", collar="#f2efe6", frame="#c99a3e", frame_dk="#8a6524", glass="#a9cfdc",
    glass_hi="#d7eef4", red="#e23b30", red_dk="#8f1d1a", green="#4fc263", white="#fbf8f0", gold="#ffd24a",
    silver="#c9ced6", silver_dk="#7f8692", black="#1b1b22", black_hi="#3b3b48", orange="#ee7a2a", blue="#3f86e0",
).items()}

def canvas(w=GW, h=GH):
    return np.zeros((h, w, 4), dtype=np.uint8)

def save(img, name):
    im = Image.fromarray(img, "RGBA")
    im = im.resize((im.width * S, im.height * S), Image.NEAREST)
    im.save(os.path.join(A, name))
    return "assets/" + name

def rect(img, x0, y0, x1, y1, col):
    img[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = col

def ellipse_mask(cx, cy, rx, ry, w=GW, h=GH):
    yy, xx = np.mgrid[0:h, 0:w]
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0

def poly_mask(pts, w=GW, h=GH):
    from PIL import ImageDraw
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon(pts, fill=1)
    return np.array(m).astype(bool)

def outline(img, col=None):
    col = C["ink"] if col is None else col
    a = img[..., 3] > 0
    edge = np.zeros_like(a)
    edge[1:] |= a[:-1]; edge[:-1] |= a[1:]; edge[:, 1:] |= a[:, :-1]; edge[:, :-1] |= a[:, 1:]
    img[edge & ~a] = col
    return img

def bayer(w=GW, h=GH):
    yy, xx = np.mgrid[0:h, 0:w]
    return BAYER[yy % 4, xx % 4]

BY = bayer()

# ---------------------------------------------------------------- backgrounds
def backdrop(wall, wall2):
    img = canvas()
    img[:] = hexc(wall)
    yy = np.mgrid[0:GH, 0:GW][0]
    band = (yy / GH + BY * 0.25) > 0.62
    img[band] = hexc(wall2)
    # mirror: gold frame and glass
    m_out = poly_mask([(20, 44), (160, 44), (160, 268), (20, 268)])
    m_in = poly_mask([(26, 50), (154, 50), (154, 262), (26, 262)])
    img[m_out] = C["frame"]
    img[m_out & ~poly_mask([(22, 46), (158, 46), (158, 266), (22, 266)])] = C["frame_dk"]
    img[m_in] = C["glass"]
    yy, xx = np.mgrid[0:GH, 0:GW]
    shine = m_in & (np.abs((xx + yy * 0.6) - 150) < 5)
    img[shine] = C["glass_hi"]
    shine2 = m_in & (np.abs((xx + yy * 0.6) - 168) < 2)
    img[shine2] = C["glass_hi"]
    return img

# ---------------------------------------------------------------- the client's head
def zone_for(h, state, d):
    """Hair zone for height h above the guide line. 4 bulk, 3 short top, 2/1/0 guard lengths. d = dither 0..1."""
    if state == "before":
        return 4
    if state == "bad":
        return 0 if h < 22 else 4
    if state == "guide":
        return 0 if h < 0 else 4
    if state == "s2":
        return 0 if h < -5 else 1 if h < 5 else 4
    if state == "s3":
        return 0 if h < -5 else 1 if h < 5 else 2 if h < 14 else 4
    if state in ("s4", "s5"):
        # blended: dithered transitions instead of hard steps
        j = (d - 0.5) * 7
        hh = h + j
        top = 3 if state == "s5" else 4
        if state == "s5" and hh >= 26:
            top = 4
        return 0 if hh < -5 else 1 if hh < 5 else 2 if hh < 14 else top
    raise ValueError(state)

ZCOL = {0: (C["stub0"], 0.22), 1: (C["stub1"], 0.5), 2: (C["stub2"], 0.78)}

def head_side(state, sweep=None, prev=None, flip=False):
    """Side profile facing left. sweep=(x0, x1): apply `state` only for x0 <= x < x1 and `prev` elsewhere."""
    img = canvas()
    skull = ellipse_mask(96, 140, 44, 50)
    bulk = ellipse_mask(95, 136, 49, 56)
    face = poly_mask([(58, 100), (50, 126), (49, 134), (41, 148), (48, 152), (46, 158), (44, 162), (48, 166),
                      (49, 178), (57, 187), (78, 191), (93, 182), (96, 160), (90, 110)])
    neck = poly_mask([(74, 184), (108, 168), (116, 236), (70, 236)])
    ear_c = (105, 150)
    ear = ellipse_mask(*ear_c, 6, 10)
    yy, xx = np.mgrid[0:GH, 0:GW]
    # cape
    cape = poly_mask([(22, 236), (156, 236), (180, 320), (0, 320)])
    img[cape] = C["cape"]
    img[cape & ((xx + yy) % 14 == 0)] = C["cape_hi"]
    collar = poly_mask([(66, 226), (118, 226), (122, 240), (62, 240)])
    img[neck] = C["skin_sh"]
    img[collar] = C["collar"]
    skin = skull | face
    img[skin] = C["skin"]
    # simple light: back and lower edges a step darker
    img[skin & ((xx > 124) | (yy > 176))] = C["skin_sh"]
    img[ear] = C["skin"]
    img[ear & ~ellipse_mask(ear_c[0] - 1, ear_c[1], 4, 7)] = C["skin_sh"]
    img[ellipse_mask(ear_c[0] - 1, ear_c[1] + 1, 2, 4)] = C["skin_dk"]
    # eye, brow, mouth, nostril
    rect(img, 56, 131, 59, 134, C["ink"]); rect(img, 57, 131, 58, 132, C["white"])
    rect(img, 53, 127, 63, 129, C["hair4"])
    rect(img, 45, 163, 50, 164, C["lip"])
    rect(img, 45, 150, 47, 151, C["skin_dk"])
    # hair
    front = np.where(yy < 100, 47, np.where(yy < 112, 56 + (yy - 100) * 1.4, 74 + (yy - 112) * 0.15))
    nape = np.where(xx < 98, 160, np.where(xx < 113, 150, 178 - (xx - 113) * 0.1))
    region = (xx >= front) & (yy < nape) & ~ellipse_mask(*ear_c, 8, 12)
    guide = np.interp(xx, [70, 104, 120, 142], [134, 131, 137, 150])
    h = guide - yy
    for y in range(40, 200):
        for x in range(40, 150):
            if not region[y, x]:
                continue
            st = state
            if sweep is not None and not (sweep[0] <= x < sweep[1]):
                st = prev
            z = zone_for(h[y, x], st, BY[y, x])
            if z == 4:
                if not bulk[y, x]:
                    continue
                c = C["hair_hi"] if ((x * 3 + y * 5) % 11 == 0 or (y < 100 and (x + y) % 7 == 0)) else C["hair4"]
            elif z == 3:
                if not ellipse_mask(96, 139, 46, 52)[y, x]:
                    continue
                c = C["hair_hi"] if (x + y * 2) % 9 == 0 else C["hair3"]
            else:
                if not skull[y, x]:
                    continue
                col, dens = ZCOL[z]
                c = col if BY[y, x] < dens else img[y, x]
            img[y, x] = c
    if state in ("s5",) and sweep is None:
        # crisp lined-up hairline: a clean darker edge along the front and around the ear
        hl = region & skull & ~np.roll(region, 1, axis=1)
        img[hl & (yy > 104) & (yy < 160)] = C["stub2"]
    outline(img)
    if flip:
        img = img[:, ::-1].copy()
    return img

def head_back(state, sweep=None, prev=None):
    img = canvas()
    yy, xx = np.mgrid[0:GH, 0:GW]
    cape = poly_mask([(22, 236), (156, 236), (180, 320), (0, 320)])
    img[cape] = C["cape"]
    img[cape & ((xx + yy) % 14 == 0)] = C["cape_hi"]
    neck = poly_mask([(70, 176), (110, 176), (114, 236), (66, 236)])
    img[neck] = C["skin_sh"]
    img[poly_mask([(62, 226), (118, 226), (122, 240), (58, 240)])] = C["collar"]
    skull = ellipse_mask(90, 140, 42, 50)
    bulk = ellipse_mask(90, 136, 47, 56)
    for ex in (46, 134):
        e = ellipse_mask(ex, 152, 6, 11)
        img[e] = C["skin_sh"]
    img[skull] = C["skin"]
    img[skull & (yy > 176)] = C["skin_sh"]
    guide = 136 + 12 * (1 - ((xx - 90) / 44.0) ** 2)
    h = guide - yy
    region = (yy < 180) & ~ellipse_mask(46, 152, 8, 13) & ~ellipse_mask(134, 152, 8, 13)
    for y in range(40, 200):
        for x in range(30, 150):
            if not region[y, x]:
                continue
            st = state
            if sweep is not None and not (sweep[0] <= x < sweep[1]):
                st = prev
            z = zone_for(h[y, x], st, BY[y, x])
            if z == 4:
                if not bulk[y, x]:
                    continue
                c = C["hair_hi"] if (x * 3 + y * 5) % 11 == 0 else C["hair4"]
            elif z == 3:
                if not ellipse_mask(90, 139, 44, 52)[y, x]:
                    continue
                c = C["hair3"]
            else:
                if not skull[y, x]:
                    continue
                col, dens = ZCOL[z]
                c = col if BY[y, x] < dens else img[y, x]
            img[y, x] = c
    outline(img)
    return img

def guide_overlay(view, x1, color="red"):
    """The guide line drawn up to x1, as a bright dashed cut line."""
    img = canvas()
    xs = range(70 if view == "side" else 46, int(x1))
    for x in xs:
        y = np.interp(x, [70, 104, 120, 142], [134, 131, 137, 150]) if view == "side" else 136 + 12 * (1 - ((x - 90) / 44.0) ** 2)
        if view == "side" and 98 <= x <= 112:
            y = min(y, 136)
        if x % 4 != 3:
            img[int(round(y)), x] = C[color]
            img[int(round(y)) - 1, x] = C[color] if color == "red" else C[color]
    return img

def compose(*layers):
    out = canvas()
    for l in layers:
        m = l[..., 3] > 0
        out[m] = l[m]
    return out

def crop_zoom(img, x0, y0, w):
    """A zoomed viewpoint: crop a 9:16 window and scale back up to the full grid."""
    h = int(round(w * GH / GW))
    sub = Image.fromarray(img[y0:y0 + h, x0:x0 + w], "RGBA").resize((GW, GH), Image.NEAREST)
    return np.array(sub)

# ---------------------------------------------------------------- sprites
def sprite_clipper(guard=None, lever_open=True):
    img = canvas(16, 36)
    rect(img, 3, 8, 13, 33, C["black"]); rect(img, 4, 9, 6, 32, C["black_hi"])
    rect(img, 2, 4, 14, 8, C["silver"]); rect(img, 2, 7, 14, 8, C["silver_dk"])
    for x in range(2, 14, 2):
        img[3, x] = C["silver"]
    rect(img, 6, 33, 10, 36, C["black"])
    if guard:
        rect(img, 1, 1, 15, 6, C[guard])
        for x in range(1, 15, 2):
            img[0, x] = C[guard]
    lever = C["gold"]
    if lever_open:
        rect(img, 13, 12, 16, 15, lever)
    else:
        rect(img, 13, 14, 15, 18, lever)
    return outline(img)

def sprite_lever_closeup(open_):
    img = canvas(48, 40)
    rect(img, 4, 8, 44, 36, C["black"]); rect(img, 4, 8, 44, 12, C["black_hi"])
    rect(img, 2, 2, 46, 8, C["silver"])
    for x in range(2, 46, 3):
        img[1, x] = C["silver"]
    # lever arm on a pivot
    if open_:
        for i in range(14):
            rect(img, 28 + i // 2, 18 - i, 32 + i // 2, 20 - i, C["gold"])
    else:
        rect(img, 28, 18, 44, 22, C["gold"])
    rect(img, 27, 17, 31, 23, C["silver_dk"])
    return outline(img)

def sprite_trimmer():
    img = canvas(10, 34)
    rect(img, 2, 6, 8, 32, C["silver"]); rect(img, 2, 6, 4, 31, C["white"]); rect(img, 6, 8, 8, 30, C["silver_dk"])
    rect(img, 1, 2, 9, 6, C["black"])
    for x in range(1, 9, 2):
        img[1, x] = C["black"]
    rect(img, 4, 14, 6, 18, C["green"])
    return outline(img)

def sprite_scissors(open_):
    img = canvas(30, 18)
    if open_:
        for i in range(18):
            rect(img, 10 + i, 6 - i // 4, 12 + i, 8 - i // 4, C["silver"])
            rect(img, 10 + i, 9 + i // 4, 12 + i, 11 + i // 4, C["silver"])
    else:
        rect(img, 10, 7, 30, 10, C["silver"]); rect(img, 10, 9, 30, 10, C["silver_dk"])
    for cy in (4, 13):
        ring = ellipse_mask(5, cy, 4, 3, 30, 18) & ~ellipse_mask(5, cy, 2, 1.4, 30, 18)
        img[ring] = C["red"]
    rect(img, 9, 7, 12, 11, C["silver_dk"])
    return outline(img)

def sprite_comb():
    img = canvas(34, 10)
    rect(img, 0, 0, 34, 4, C["black"])
    for x in range(1, 34, 2):
        rect(img, x, 4, x + 1, 10, C["black"])
    rect(img, 0, 0, 34, 1, C["black_hi"])
    return outline(img, C["white"])

def sprite_x():
    img = canvas(20, 20)
    for i in range(20):
        rect(img, i - 2, i, i + 2, i + 1, C["red"]); rect(img, 18 - i, i, 22 - i, i + 1, C["red"])
    return outline(img, C["white"])

def sprite_check():
    img = canvas(18, 14)
    pts = [(1, 7), (6, 12), (16, 2)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        for t in np.linspace(0, 1, 30):
            x, y = int(x0 + (x1 - x0) * t), int(y0 + (y1 - y0) * t)
            rect(img, x - 1, y - 1, x + 2, y + 1, C["green"])
    return outline(img, C["white"])

def sprite_arrow_up(col="red"):
    img = canvas(20, 34)
    img[poly_mask([(10, 0), (20, 12), (0, 12)], 20, 34)] = C[col]
    rect(img, 6, 12, 14, 34, C[col])
    return outline(img, C["white"])

def sprite_clippings(seed):
    rnd = random.Random(seed)
    img = canvas(30, 20)
    for _ in range(26):
        x, y = rnd.randrange(1, 29), rnd.randrange(1, 19)
        img[y, x] = C["hair4"] if rnd.random() < 0.7 else C["hair_hi"]
        if rnd.random() < 0.4 and x < 29:
            img[y, x + 1] = C["hair4"]
    return img

def sprite_sparkle():
    img = canvas(13, 13)
    rect(img, 6, 0, 7, 13, C["gold"]); rect(img, 0, 6, 13, 7, C["gold"])
    rect(img, 5, 4, 8, 9, C["gold"]); rect(img, 4, 5, 9, 8, C["gold"]); rect(img, 6, 5, 7, 8, C["white"])
    return img

def sprite_pip(col):
    img = canvas(18, 18)
    img[poly_mask([(2, 0), (15, 0), (17, 2), (17, 15), (15, 17), (2, 17), (0, 15), (0, 2)], 18, 18)] = C[col]
    return outline(img)

def sprite_bubble():
    img = canvas(40, 30)
    img[poly_mask([(3, 0), (36, 0), (39, 3), (39, 19), (36, 22), (14, 22), (6, 29), (8, 22), (3, 22), (0, 19), (0, 3)], 40, 30)] = C["white"]
    for x in (11, 19, 27):
        rect(img, x, 10, x + 3, 13, C["black"])
    return outline(img)

def sprite_magnifier():
    img = canvas(44, 44)
    ring = ellipse_mask(17, 17, 15, 15, 44, 44) & ~ellipse_mask(17, 17, 12, 12, 44, 44)
    img[ellipse_mask(17, 17, 12, 12, 44, 44)] = np.array([215, 238, 244, 70], np.uint8)
    img[ring] = C["silver"]
    for i in range(14):
        rect(img, 28 + i, 28 + i, 32 + i, 32 + i, C["frame_dk"])
    return outline(img)

def sprite_bracket():
    img = canvas(10, 16)
    rect(img, 4, 0, 6, 16, C["gold"]); rect(img, 0, 0, 10, 2, C["gold"]); rect(img, 0, 14, 10, 16, C["gold"])
    return outline(img)

def sprite_stairs(n):
    """A step chart: 0 -> 1 -> (2) guard lengths. Fewer, bigger steps = a visible jump."""
    img = canvas(60, 40)
    heights = [6, 18, 34] if n == 2 else [6, 12, 18, 26, 34]
    w = 60 // len(heights)
    for i, hh in enumerate(heights):
        rect(img, i * w, 40 - hh, i * w + w - 1, 40, C["gold"] if i % 2 == 0 else C["orange"])
    return outline(img)

def sprite_speedlines():
    img = canvas(30, 40)
    for i, x in enumerate((3, 11, 19, 27)):
        rect(img, x, 4 + (i % 2) * 8, x + 2, 30 + (i % 2) * 8, C["white"])
    return img

# ---------------------------------------------------------------- the shop plate
def shop_assets():
    src = Image.open(os.path.join(HERE, "barber-shop.png")).convert("RGBA")
    k = 1080 / src.width
    big = src.resize((1080, int(src.height * k)), Image.LANCZOS)
    big.save(os.path.join(A, "shop.png"))
    # his clipper hand, for a buzz jitter (crop in source pixels)
    box = (128, 640, 270, 840)
    src.crop(box).resize((int((box[2] - box[0]) * k), int((box[3] - box[1]) * k)), Image.LANCZOS).save(os.path.join(A, "shop-clipper.png"))
    # barber pole stripes rolling
    pole = (668, 292, 752, 556)
    stripes = np.array(src.crop(pole))
    frames = []
    for i in range(6):
        f = np.roll(stripes, i * 9, axis=0)
        name = f"pole{i}.png"
        Image.fromarray(f).resize((int((pole[2] - pole[0]) * k), int((pole[3] - pole[1]) * k)), Image.LANCZOS).save(os.path.join(A, name))
        frames.append("assets/" + name)
    return k, box, pole, frames

# ---------------------------------------------------------------- manifest helpers
def g(v):
    return round(v * D, 1)

def img_layer(path, gx=0, gy=0, gw=GW, keys=None, frm=None, to=None):
    l = {"type": "image", "path": path, "x": g(gx), "y": g(gy), "w": g(gw)}
    if keys:
        l["keys"] = [{k2: (g(v) if k2 in ("x", "y", "w") else v) for k2, v in k.items()} for k in keys]
    if frm is not None: l["from"] = round(frm, 3)
    if to is not None: l["to"] = round(to, 3)
    return l

def text(t, gx, gy, size=44, color="#fbf8f0", frm=None, to=None, keys=None, shadow=True, w=None):
    out = []
    for dx, col in ((5, "#1a0f0c"), (0, color)) if shadow else ((0, color),):
        l = {"type": "text", "text": t, "x": g(gx) + dx, "y": g(gy) + dx, "size": size, "color": col}
        if w: l["w"] = w
        if frm is not None: l["from"] = round(frm, 3)
        if to is not None: l["to"] = round(to, 3)
        if keys: l["keys"] = [{k2: (g(v) + dx if k2 in ("x", "y") else v) for k2, v in k.items()} for k in keys]
        out.append(l)
    return out

def sequence(frames, t0, t1):
    """Show frames one after another between shot-relative t0 and t1 (last frame stays)."""
    n = len(frames)
    out = []
    for i, path in enumerate(frames):
        a = t0 + (t1 - t0) * i / n
        b = t0 + (t1 - t0) * (i + 1) / n if i < n - 1 else None
        out.append(img_layer(path, frm=a, to=b))
    return out

def pop(path, gx, gy, gw, at, dur=0.18, to=None):
    """A sprite that pops in at `at` (grows from 60% with a fade)."""
    return img_layer(path, gx, gy, gw, keys=[
        {"t": max(0, at - 0.001), "alpha": 0, "w": gw * 0.6, "x": gx + gw * 0.2, "y": gy + gw * 0.2},
        {"t": at + dur, "alpha": 1, "w": gw * 1.08, "x": gx - gw * 0.04, "y": gy - gw * 0.04},
        {"t": at + dur + 0.1, "alpha": 1, "w": gw, "x": gx, "y": gy}], frm=max(0, at - 0.001), to=to)

# ---------------------------------------------------------------- build
def main(upto=None):
    words = json.load(open(os.path.join(HERE, "words.json")))["words"]
    dur = sf.info(os.path.join(HERE, "narration.wav")).duration
    W = lambda i: words[i]["start"]

    sp = {
        "clip": save(sprite_clipper(), "clipper.png"),
        "clip1": save(sprite_clipper("orange"), "clipper-g1.png"),
        "clip2": save(sprite_clipper("blue"), "clipper-g2.png"),
        "clipC": save(sprite_clipper(lever_open=False), "clipper-closed.png"),
        "lev_o": save(sprite_lever_closeup(True), "lever-open.png"),
        "lev_c": save(sprite_lever_closeup(False), "lever-closed.png"),
        "trim": save(sprite_trimmer(), "trimmer.png"),
        "sc_o": save(sprite_scissors(True), "scissors-open.png"),
        "sc_c": save(sprite_scissors(False), "scissors-closed.png"),
        "comb": save(sprite_comb(), "comb.png"),
        "x": save(sprite_x(), "x.png"),
        "check": save(sprite_check(), "check.png"),
        "up": save(sprite_arrow_up(), "arrow-up.png"),
        "spark": save(sprite_sparkle(), "sparkle.png"),
        "pip": save(sprite_pip("gold"), "pip.png"),
        "pip_q": save(sprite_pip("red"), "pip-red.png"),
        "bubble": save(sprite_bubble(), "bubble.png"),
        "mag": save(sprite_magnifier(), "magnifier.png"),
        "brk": save(sprite_bracket(), "bracket.png"),
        "st2": save(sprite_stairs(2), "stairs-2.png"),
        "st3": save(sprite_stairs(3), "stairs-3.png"),
        "speed": save(sprite_speedlines(), "speedlines.png"),
        "cl": [save(sprite_clippings(i), f"clippings{i}.png") for i in range(3)],
    }
    k, cbox, pbox, pole_frames = shop_assets()
    shop_w = 1280                                     # design width of the shop plate
    sk = shop_w / 768                                 # design units per source pixel

    bgs = {
        "red": backdrop("#3d1822", "#2c111a"), "teal": backdrop("#16353a", "#0f2629"),
        "navy": backdrop("#1a2444", "#121a33"), "plum": backdrop("#36203f", "#27172e"),
        "rust": backdrop("#3e2516", "#2d1a0f"), "green": backdrop("#183522", "#102619"),
        "night": backdrop("#1c1a2c", "#141322"),
    }
    def scene(bg, head, name):
        return save(compose(bgs[bg], head), name)

    shots = []          # (start, end, layers) in narration time
    sfx = []            # (time, kind, gain) in narration time
    buzz = []           # (t0, t1, pitch, gain)

    def shot(t0, t1, layers):
        shots.append([t0, t1, layers])

    def shop_layers(rel_buzz):
        L = [{"type": "image", "path": "assets/shop.png", "x": 0, "y": -10, "w": shop_w}]
        L += [{"type": "image", "path": f, "x": round(pbox[0] * sk, 1), "y": round(pbox[1] * sk - 10, 1), "w": round((pbox[2] - pbox[0]) * sk, 1),
               "from": round(i * 0.14, 3), "to": round((i + 1) * 0.14, 3)} for i, f in enumerate(pole_frames * 40)][:120]
        keys = []
        for i in range(0, 60):
            t = i * 0.05
            on = any(a <= t < b for a, b in rel_buzz)
            jx = (3 if i % 2 else -3) if on else 0
            keys.append({"t": round(t, 3), "x": round(cbox[0] * sk + jx, 1), "y": round(cbox[1] * sk - 10 + (jx * 0.5), 1)})
        L.append({"type": "image", "path": "assets/shop-clipper.png", "x": round(cbox[0] * sk, 1), "y": round(cbox[1] * sk - 10, 1),
                  "w": round((cbox[2] - cbox[0]) * sk, 1), "keys": keys})
        return L

    # ---- S1 hook: a messy, high fade (0 -> 2.45)
    t0, t1 = 0, 2.45
    bad = head_side("bad")
    s1 = scene("red", bad, "s1-bad.png")
    harsh = canvas()
    for x in range(56, 142):
        y = int(np.interp(x, [70, 104, 120, 142], [134, 131, 137, 150]) - 22)
        if x % 3: harsh[y, x] = C["red"]; harsh[y + 1, x] = C["red"]
    hp = save(harsh, "s1-harsh.png")
    L = [img_layer(s1, keys=[{"t": 0, "x": 40, "alpha": 0}, {"t": 0.35, "x": 0, "alpha": 1}])]
    L += text("MESSY", 14, 10, 64, "#ffd24a", frm=W(0) - t0)
    L += text("FADE?", 92, 10, 64, "#ffd24a", frm=W(2) - t0)
    for i in range(4):
        L.append(img_layer(hp, frm=W(2) - t0 + i * 0.22, to=W(2) - t0 + i * 0.22 + 0.13))
    L.append(img_layer(hp, frm=W(2) - t0 + 0.9))
    L.append(pop(sp["x"], 118, 150, 44, W(6) - t0))
    shot(t0, t1, L)
    sfx += [(W(2), "paper", 0.08), (W(6), "tap", 0.16)]

    # ---- S2 too high, too fast: zoomed on the side of the head
    t0, t1 = 2.45, 4.45
    z = save(crop_zoom(compose(bgs["red"], bad), 40, 70, 120), "s2-zoom.png")
    L = [img_layer(z)]
    L.append(img_layer(sp["clip"], 98, 250, 24, keys=[{"t": 0, "y": 250}, {"t": W(9) - t0, "y": 210}, {"t": W(9) - t0 + 0.25, "y": 70},
                                                    {"t": W(10) - t0, "y": 70}, {"t": W(11) - t0 + 0.2, "y": -40}]))
    L.append(img_layer(sp["speed"], 96, 120, 30, frm=W(10) - t0, to=W(11) - t0 + 0.4, keys=[{"t": W(10) - t0, "y": 150}, {"t": W(11) - t0 + 0.4, "y": 60}]))
    L.append(img_layer(sp["up"], 22, 120, 30, keys=[{"t": W(9) - t0 - 0.05, "alpha": 0, "y": 180}, {"t": W(9) - t0 + 0.2, "alpha": 1, "y": 110}], frm=W(9) - t0 - 0.05))
    L += text("TOO HIGH", 14, 14, 58, "#ff6a5a", frm=W(9) - t0)
    L += text("TOO FAST", 14, 32, 58, "#ff6a5a", frm=W(11) - t0)
    shot(t0, t1, L)
    buzz.append((W(9) - 0.05, W(11) + 0.45, 1.0, 0.05))

    # ---- S3 here's a clean low fade in five steps: the barber in his shop
    t0, t1 = 4.45, 6.93
    final = head_side("s5")
    card = compose(backdrop("#16353a", "#0f2629"), final)[40:272, 14:166]
    cp = save(card.copy(), "s3-final-card.png")
    L = shop_layers([(0.05, 0.6)])
    L.append(img_layer(cp, 8, 52, 60, keys=[{"t": W(14) - t0 - 0.05, "alpha": 0, "x": -30}, {"t": W(14) - t0 + 0.25, "alpha": 1, "x": 8}], frm=W(14) - t0 - 0.05))
    L.append(pop(sp["spark"], 54, 50, 14, W(15) - t0 + 0.1))
    L.append(pop(sp["spark"], 6, 110, 10, W(16) - t0 + 0.2))
    for i in range(5):
        at = W(18) - t0 + i * 0.09
        L.append(pop(sp["pip"], 14 + i * 22, 10, 18, at))
        L += text(str(i + 1), 18.2 + i * 22, 13.4, 48, "#1a0f0c", frm=at + 0.12, shadow=False)
    shot(t0, t1, L)
    buzz.append((t0 + 0.05, t0 + 0.6, 1.0, 0.05))
    sfx += [(W(14) + 0.2, "chime", 0.05)] + [(W(18) + i * 0.09, "pop", 0.05) for i in range(5)]

    # ---- S4 step one: set your guide, cut a line above the ear
    t0, t1 = 6.93, 12.12
    before = head_side("before")
    base = scene("teal", before, "s4-before.png")
    frames = []
    for i in range(1, 9):
        x1 = 70 + (142 - 70) * i / 8
        frames.append(save(compose(bgs["teal"], head_side("guide", (0, x1), "before"), guide_overlay("side", x1)), f"s4-cut{i}.png"))
    L = [img_layer(base)]
    cut0, cut1 = W(29) - t0, W(43) - t0 + 0.3          # "Cut" ... "back"
    L += sequence(frames, cut0, min(cut1, t1 - t0 - 0.05))
    L += text("STEP 1", 14, 10, 64, "#ffd24a", frm=W(20) - t0)
    L += text("GUIDE LINE", 14, 26, 44, "#fbf8f0", frm=W(24) - t0)
    path_x = [70, 104, 120, 142]; path_y = [134, 131, 137, 150]
    ck = [{"t": W(25) - t0 - 0.6, "x": 190, "y": 150, "angle": 0}, {"t": W(25) - t0, "x": 150, "y": 150, "angle": 0}]
    for i in range(9):
        f = i / 8
        x = 70 + 72 * f
        y = float(np.interp(x, path_x, path_y))
        ck.append({"t": round(cut0 + (min(cut1, t1 - t0 - 0.05) - cut0) * f, 3), "x": x - 8, "y": y - 4, "angle": 0})
    L.append(img_layer(sp["clip"], 150, 150, 16, keys=ck, frm=W(25) - t0 - 0.6))
    L += text("NO GUARD", 92, 216, 40, "#ff6a5a", frm=W(28) - t0, to=W(34) - t0 + 0.6)
    L += text("LEVER OPEN", 92, 230, 34, "#ffd24a", frm=W(26) - t0 - 0.1, to=W(34) - t0 + 0.6)
    # one inch above the ear
    L.append(pop(sp["brk"], 111, 128, 8, W(34) - t0))
    L += text("1 INCH", 122, 124, 36, "#ffd24a", frm=W(34) - t0)
    for j in range(3):
        L.append(img_layer(sp["cl"][j], 90 + j * 14, 140, 26, frm=cut0 + j * 0.5, to=cut0 + j * 0.5 + 0.9,
                           keys=[{"t": cut0 + j * 0.5, "y": 138, "alpha": 1}, {"t": cut0 + j * 0.5 + 0.9, "y": 200, "alpha": 0}]))
    shot(t0, t1, L)
    buzz += [(W(25) - 0.2, W(27) + 0.4, 1.0, 0.04), (W(34) - 0.6 + 0.6, W(43) + 0.35, 1.0, 0.045)]
    buzz[-1] = (t0 + cut0, t0 + cut1, 1.0, 0.045)
    sfx += [(W(20), "paper", 0.07), (W(26), "tap", 0.12)]

    # ---- S5 ...all the way around the back (back view)
    t0, t1 = 12.12, 13.5
    bframes = []
    for i in range(1, 6):
        x1 = 46 + (134 - 46) * i / 5
        bframes.append(save(compose(bgs["teal"], head_back("guide", (0, x1), "before"), guide_overlay("back", x1)), f"s5-back{i}.png"))
    L = [img_layer(scene("teal", head_back("before"), "s5-back0.png"))]
    L += sequence(bframes, 0.05, t1 - t0 - 0.2)
    ck = []
    for i in range(6):
        x = 46 + 88 * i / 5
        ck.append({"t": round(0.05 + (t1 - t0 - 0.25) * i / 5, 3), "x": x - 8, "y": 136 + 12 * (1 - ((x - 90) / 44.0) ** 2) - 4})
    L.append(img_layer(sp["clip"], 40, 140, 16, keys=ck))
    L += text("AROUND THE BACK", 14, 14, 40, "#fbf8f0")
    shot(t0, t1, L)
    buzz.append((t0 + 0.05, t1 - 0.15, 1.0, 0.045))

    # ---- S6 step two: number one guard, start below the line and flick out
    t0, t1 = 13.5, 18.62
    guide_full = head_side("guide")
    L = [img_layer(save(compose(bgs["navy"], guide_full, guide_overlay("side", 142, "gold")), "s6-base.png"))]
    flick_t = [W(54) - t0, W(57) - t0 - 0.1, W(61) - t0]      # "flick", "above", "scooping"
    spans = [(112, 146), (88, 112), (60, 88)]
    prev_state = None
    acc = (999, 999)
    for i, (ft, (xa, xb)) in enumerate(zip(flick_t, spans)):
        lo = min(xa, acc[0])
        acc = (lo, 146)
        img_f = compose(bgs["navy"], head_side("s2", (lo, 146), "guide"))
        L.append(img_layer(save(img_f, f"s6-flick{i}.png"), frm=ft + 0.25, to=(flick_t[i + 1] + 0.25) if i < 2 else None))
    L += text("STEP 2", 14, 10, 64, "#ffd24a", frm=W(44) - t0)
    L += text("#1 GUARD", 14, 26, 44, "#ee7a2a", frm=W(46) - t0)
    gk = [{"t": W(46) - t0 - 0.3, "x": 190, "y": 196, "angle": 0}, {"t": W(46) - t0 + 0.1, "x": 140, "y": 196, "angle": 0},
          {"t": W(49) - t0, "x": 128, "y": 150, "angle": 0}]
    for i, ft in enumerate(flick_t):
        xa, xb = spans[i]
        xm = (xa + xb) / 2
        ym = float(np.interp(xm, path_x, path_y))
        gk += [{"t": ft - 0.12, "x": xm - 8, "y": ym + 4, "angle": 0}, {"t": ft + 0.18, "x": xm - 8 + 6, "y": ym - 14, "angle": 0.55},
               {"t": ft + 0.4, "x": xm - 8 + 4, "y": ym - 6, "angle": 0.2}]
    L.append(img_layer(sp["clip1"], 190, 196, 16, keys=gk, frm=W(46) - t0 - 0.3))
    L += text("BELOW", 118, 178, 36, "#fbf8f0", frm=W(49) - t0, to=W(54) - t0)
    L.append(img_layer(sp["up"], 120, 160, 10, frm=W(49) - t0 + 0.2, to=W(54) - t0, keys=[{"t": W(49) - t0 + 0.2, "y": 170}, {"t": W(52) - t0, "y": 160}]))
    L += text("FLICK OUT", 14, 216, 48, "#ffd24a", frm=W(54) - t0)
    for j, ft in enumerate(flick_t):
        L.append(img_layer(sp["cl"][j % 3], spans[j][0] + 4, 130, 26, frm=ft + 0.1, to=ft + 1.0,
                           keys=[{"t": ft + 0.1, "y": 128, "alpha": 1}, {"t": ft + 1.0, "y": 190, "alpha": 0}]))
    shot(t0, t1, L)
    buzz += [(t0 + ft - 0.15, t0 + ft + 0.45, 1.05, 0.05) for ft in flick_t]
    sfx += [(W(44), "paper", 0.07), (W(46) + 0.12, "tap", 0.14)]

    # ---- S7 step three: number two guard, a little higher, soften the jump (closer viewpoint)
    t0, t1 = 18.62, 23.15
    zx, zy, zw = 34, 60, 130
    zs2 = crop_zoom(compose(bgs["plum"], head_side("s2")), zx, zy, zw)
    L = [img_layer(save(zs2, "s7-s2.png"))]
    s3f = []
    for i in range(1, 6):
        x1 = 146 - (146 - 56) * i / 5
        s3f.append(save(crop_zoom(compose(bgs["plum"], head_side("s3", (x1, 146), "s2")), zx, zy, zw), f"s7-s3-{i}.png"))
    sw0, sw1 = W(68) - t0, W(73) - t0 + 0.2         # "Go" ... "soften"
    L += sequence(s3f, sw0, sw1)
    L += text("STEP 3", 14, 10, 64, "#ffd24a", frm=W(63) - t0)
    L += text("#2 GUARD", 14, 26, 44, "#6fb0ff", frm=W(65) - t0)
    zk = lambda gx: (gx - zx) * GW / zw
    zky = lambda gy: (gy - zy) * GW / zw
    ck = [{"t": W(65) - t0 - 0.2, "x": 190, "y": 200}, {"t": W(66) - t0 + 0.2, "x": 150, "y": 190}]
    for i in range(6):
        x = 146 - 90 * i / 5
        y = float(np.interp(x, path_x, path_y)) - 10
        ck.append({"t": round(sw0 + (sw1 - sw0) * i / 5, 3), "x": zk(x) - 11, "y": zky(y) - 6})
    L.append(img_layer(sp["clip2"], 190, 200, 22, keys=ck, frm=W(65) - t0 - 0.2))
    L += text("HIGHER", 120, 170, 40, "#fbf8f0", frm=W(68) - t0, to=W(73) - t0)
    L.append(img_layer(sp["up"], 124, 186, 12, frm=W(68) - t0, to=W(73) - t0))
    # the jump: one big step becomes two small ones
    L.append(img_layer(sp["st2"], 104, 196, 60, frm=W(73) - t0 - 0.1, to=W(75) - t0 + 0.05))
    L.append(img_layer(sp["st3"], 104, 196, 60, frm=W(75) - t0 + 0.05))
    L += text("SOFTER JUMP", 64, 248, 40, "#ffd24a", frm=W(75) - t0 + 0.05)
    shot(t0, t1, L)
    buzz.append((t0 + sw0, t0 + sw1, 1.1, 0.05))
    sfx += [(W(63), "paper", 0.07), (W(75) + 0.05, "pop", 0.06)]

    # ---- S8 step four: hunt the lines, close the lever, blend in small strokes
    t0, t1 = 23.15, 29.92
    s3 = head_side("s3")
    L = [img_layer(save(compose(bgs["rust"], s3), "s8-s3.png"))]
    redl = canvas()
    for x in range(70, 142):
        for hh in (-5, 5, 14):
            y = int(round(np.interp(x, path_x, path_y) - hh))
            if 98 <= x <= 112 and hh < 6:
                continue
            if x % 2: redl[y, x] = C["red"]
    rp = save(redl, "s8-lines.png")
    bl0, bl1 = W(88) - t0, W(94) - t0 + 0.5           # "blend" ... "strokes"
    blend = []
    for i in range(1, 6):
        x1 = 146 - 90 * i / 5
        blend.append(save(compose(bgs["rust"], head_side("s4", (x1, 146), "s3")), f"s8-blend{i}.png"))
    L += sequence(blend, bl0, bl1)
    hunt = W(81) - t0
    for i in range(6):
        L.append(img_layer(rp, frm=hunt + 0.3 + i * 0.3, to=hunt + 0.45 + i * 0.3))
    L.append(img_layer(rp, frm=hunt + 2.1, to=bl0))
    L.append(img_layer(sp["mag"], 70, 100, 44, keys=[{"t": hunt - 0.2, "x": 190, "y": 100}, {"t": hunt + 0.4, "x": 96, "y": 98}, {"t": hunt + 1.4, "x": 66, "y": 104}],
                       frm=hunt - 0.2, to=W(84) - t0 + 0.4))
    L += text("STEP 4", 14, 10, 64, "#ffd24a", frm=W(79) - t0)
    L += text("HUNT THE LINES", 14, 26, 40, "#fbf8f0", frm=W(81) - t0)
    lv = W(84) - t0
    L.append(img_layer(sp["lev_o"], 116, 184, 52, frm=lv - 0.1, to=lv + 0.45, keys=[{"t": lv - 0.1, "x": 190}, {"t": lv + 0.15, "x": 116}]))
    L.append(img_layer(sp["lev_c"], 116, 184, 52, frm=lv + 0.45, to=bl0 + 0.4))
    L += text("LEVER CLOSED", 70, 236, 40, "#ffd24a", frm=lv + 0.45, to=bl0 + 0.4)
    ck = [{"t": bl0, "x": 132, "y": 120}]
    for i in range(1, 25):
        f = i / 24
        x = 146 - 90 * f
        y = float(np.interp(x, path_x, path_y)) - 6
        ck.append({"t": round(bl0 + (bl1 - bl0) * f, 3), "x": x - 8, "y": y + (-5 if i % 2 else 3)})
    L.append(img_layer(sp["clipC"], 132, 120, 16, keys=ck, frm=bl0))
    L += text("SMALL STROKES", 14, 216, 44, "#fbf8f0", frm=W(93) - t0)
    shot(t0, t1, L)
    buzz.append((t0 + bl0, t0 + bl1, 1.15, 0.035))
    sfx += [(W(79), "paper", 0.07), (W(81) + 0.3, "tap", 0.1), (lv + t0 + 0.45, "tap", 0.15)]

    # ---- S9 check the mirror from every angle: three mirrors
    t0, t1 = 29.92, 31.95
    s4 = head_side("s4")
    panel = canvas()
    panel[:] = hexc("#2b2236")
    views = [head_side("s4", flip=True), head_back("s4"), s4]
    for i, v in enumerate(views):
        small = np.array(Image.fromarray(compose(backdrop("#3e2516", "#2d1a0f"), v)[40:272, 14:166], "RGBA").resize((54, 82), Image.NEAREST))
        x0 = 5 + i * 58
        panel[90:172, x0:x0 + 54] = small
    L = [img_layer(save(panel, "s9-mirrors.png"))]
    L += text("EVERY ANGLE", 14, 40, 52, "#ffd24a", frm=0)
    for i, at in enumerate([W(97) - t0, W(99) - t0, W(100) - t0]):
        L.append(pop(sp["check"], 20 + i * 58, 180, 24, at))
    L.append(img_layer(sp["mag"], 0, 60, 30, keys=[{"t": 0, "x": -20}, {"t": 0.5, "x": 8}, {"t": 1.0, "x": 66}, {"t": 1.6, "x": 124}]))
    shot(t0, t1, L)
    sfx += [(W(i), "pop", 0.05) for i in (106, 108, 110)]

    # ---- S10 step five: clean it up, trimmer on the hairline, scissors over comb
    t0, t1 = 31.95, 38.95
    L = [img_layer(save(compose(bgs["green"], s4), "s10-s4.png"))]
    edge = compose(bgs["green"], head_side("s5", (0, 100), "s4"))
    tr0 = W(106) - t0
    L.append(img_layer(save(edge, "s10-edge.png"), frm=tr0 + 0.9))
    top0 = W(115) - t0
    L.append(img_layer(save(compose(bgs["green"], head_side("s5")), "s10-s5.png"), frm=top0 + 0.4))
    L += text("STEP 5", 14, 10, 64, "#ffd24a", frm=W(101) - t0)
    L += text("CLEAN IT UP", 14, 26, 44, "#fbf8f0", frm=W(103) - t0)
    hair_path = [(64, 104), (72, 112), (75, 126), (77, 140), (79, 152), (96, 138), (104, 136), (112, 140), (116, 156)]
    tk = [{"t": tr0 - 0.4, "x": 190, "y": 140}]
    for i, (x, y) in enumerate(hair_path):
        tk.append({"t": round(tr0 + 0.1 + i * (W(114) - W(106)) / len(hair_path), 3), "x": x - 5, "y": y - 2})
    tk.append({"t": top0, "x": 190, "y": 140})
    L.append(img_layer(sp["trim"], 190, 140, 10, keys=tk, frm=tr0 - 0.4, to=top0 + 0.1))
    L += text("TRIMMER", 110, 216, 40, "#4fc263", frm=tr0, to=top0)
    sc = W(119) - t0
    for i in range(6):
        L.append(img_layer(sp["sc_o"] if i % 2 == 0 else sp["sc_c"], 96, 66, 30, frm=sc + i * 0.16, to=sc + (i + 1) * 0.16 if i < 5 else None))
    L.append(img_layer(sp["comb"], 92, 86, 34, keys=[{"t": W(121) - t0 - 0.2, "x": 190}, {"t": W(121) - t0 + 0.1, "x": 92}], frm=W(121) - t0 - 0.2))
    L += text("SCISSORS", 104, 40, 36, "#fbf8f0", frm=sc)
    L += text("OVER COMB", 104, 52, 36, "#fbf8f0", frm=W(121) - t0)
    shot(t0, t1, L)
    buzz.append((t0 + tr0 + 0.1, W(114), 1.6, 0.035))
    sfx += [(W(101), "paper", 0.07)] + [(t0 + sc + i * 0.32, "tap", 0.08) for i in range(3)]

    # ---- S11 low, tight, and blended: the finished fade
    t0, t1 = 38.95, 40.98
    fz = save(crop_zoom(compose(bgs["night"], final), 26, 50, 140), "s11-final.png")
    L = [img_layer(fz, keys=[{"t": 0, "w": GW, "x": 0, "y": 0}, {"t": t1 - t0, "w": GW * 1.06, "x": -5, "y": -9}])]
    for word, i, x in (("LOW.", 122, 14), ("TIGHT.", 123, 62), ("BLENDED.", 125, 14)):
        L += text(word, x, 14 if i != 125 else 30, 60 if i != 125 else 64, "#ffd24a" if i != 125 else "#4fc263", frm=W(i) - t0)
    for i, (x, y) in enumerate([(130, 96), (40, 80), (140, 160), (60, 200)]):
        L.append(pop(sp["spark"], x, y, 12, 0.15 + i * 0.35))
    shot(t0, t1, L)
    sfx += [(W(122), "pop", 0.05), (W(123), "pop", 0.05), (W(125), "chime", 0.06)]

    # ---- S12 which step messes you up? comments (back in the shop)
    t0, t1 = 40.98, dur + TAIL
    L = shop_layers([(0.0, 0.5)])
    for i in range(5):
        at = W(126) - t0 + i * 0.08
        L.append(pop(sp["pip_q"] if i in (1, 3) else sp["pip"], 14 + i * 22, 10, 18, at))
        L += text(str(i + 1), 18.2 + i * 22, 13.4, 48, "#1a0f0c", frm=at + 0.12, shadow=False)
    L += text("?", 124, 30, 96, "#ff6a5a", frm=W(132) - t0)
    L.append(pop(sp["bubble"], 110, 196, 56, W(137) - t0))
    L.append(img_layer(sp["up"], 132, 254, 14, frm=W(137) - t0, keys=[{"t": W(137) - t0, "angle": 3.1416, "y": 240}, {"t": W(137) - t0 + 0.4, "angle": 3.1416, "y": 252}]))
    shot(t0, t1, L)
    sfx += [(W(126) + i * 0.08, "pop", 0.04) for i in range(5)] + [(W(137), "pop", 0.07)]
    buzz.append((t0, t0 + 0.5, 1.0, 0.04))

    # ---------------------------------------------------- manifest timing (video time = narration + lead)
    out_shots = []
    for i, (a, b, layers) in enumerate(shots):
        start = 0 if i == 0 else round(a + LEAD, 3)
        end = round(dur + LEAD + TAIL, 3) if i == len(shots) - 1 else round(shots[i + 1][0] + LEAD, 3)
        shift = (a + LEAD) - start      # first shot starts at 0, so its relative times shift by the lead
        if shift:
            for l in layers:
                for k2 in ("from", "to"):
                    if k2 in l: l[k2] = round(l[k2] + shift, 3)
                for kk in l.get("keys", []):
                    kk["t"] = round(kk["t"] + shift, 3)
        out_shots.append({"start": start, "end": end, "layers": layers})
    # keys must be strictly increasing and a layer's keys need t >= 0
    for s in out_shots:
        span = round(s["end"] - s["start"], 3)
        kept = []
        for l in s["layers"]:
            if l.get("from", 0) >= span:
                continue
            if "to" in l and l["to"] > span:
                del l["to"]
            if "keys" in l:
                ks = [q for q in l["keys"] if q["t"] <= span]
                l["keys"] = ks or [dict(l["keys"][0], t=0)]
            kept.append(l)
        s["layers"] = kept
        for l in s["layers"]:
            if "keys" in l:
                ks = sorted(l["keys"], key=lambda q: q["t"])
                fixed = []
                for q in ks:
                    q["t"] = max(0.0, q["t"])
                    if fixed and q["t"] <= fixed[-1]["t"]:
                        q["t"] = round(fixed[-1]["t"] + 0.001, 3)
                    fixed.append(q)
                l["keys"] = fixed
            if "from" in l and l["from"] < 0: l["from"] = 0

    # captions: natural phrases, each starting at its first spoken word
    groups = [(0, 7), (7, 12), (12, 20), (20, 25), (25, 29), (29, 39), (39, 44), (44, 49), (49, 53), (53, 59), (59, 62),
              (62, 67), (67, 71), (71, 78), (78, 83), (83, 86), (86, 94), (94, 100), (100, 102), (102, 106), (106, 112),
              (112, 118), (118, 126), (126, 131), (131, 138), (138, 143), (143, 148)]
    phrases = ["Most messy fades come from one mistake:", "going too high, too fast.", "Here's a clean low fade in five steps.",
               "Step one. Set your guide.", "Clippers open, no guard.", "Cut a line about an inch above the ear,",
               "all the way around the back.", "Step two. Number one guard.", "Start below the line", "and flick out just above it",
               "with a scooping motion.", "Step three. Number two guard.", "Go a little higher", "to soften the jump from the one.",
               "Step four. Hunt the lines.", "Close the lever", "and blend every hard edge", "in small strokes.",
               "Check the mirror", "from every angle.", "Step five. Clean it up.", "Trimmer on the hairline and around the ears,",
               "then connect the top", "with scissors over comb.", "Low, tight, and blended.", "Which step messes you up the most?",
               "Tell me in the comments."]
    return out_shots, groups, phrases, words, sfx, buzz, dur

if __name__ == "__main__":
    import sys
    shots, groups, phrases, words, sfx, buzz, dur = main()
    json.dump({"shots": shots, "groups": groups, "phrases": phrases, "sfx": sfx, "buzz": buzz, "dur": dur}, open(os.path.join(HERE, "build-out.json"), "w"))
    print("shots", len(shots), "dur", dur)
