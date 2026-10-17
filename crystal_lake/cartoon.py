"""2D cartoon toolkit (pycairo): ink-outlined, cel-shaded character rigs and painted backgrounds.

Stage coordinates are 1920x1080. Characters are drawn from their feet: draw(ctx, x, y, size, **pose).
"""
import math, random
import cairo

PI = math.pi


def hx(h, a=None):
    c = tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return c if a is None else c + (a,)


INK = hx("#1a1216")
LW = 5.0


def src(ctx, c):
    ctx.set_source_rgba(*c) if len(c) == 4 else ctx.set_source_rgb(*c)


def fs(ctx, color, lw=LW, ink=INK):
    """Fill current path with color, then ink outline."""
    src(ctx, color)
    ctx.fill_preserve()
    ctx.set_line_width(lw)
    src(ctx, ink)
    ctx.stroke()


def ell(ctx, x, y, rx, ry, a0=0, a1=2 * PI):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(max(rx, 0.01), max(ry, 0.01))
    ctx.new_sub_path()
    ctx.arc(0, 0, 1, a0, a1)
    ctx.restore()


def rrect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -PI / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, PI / 2)
    ctx.arc(x + r, y + h - r, r, PI / 2, PI)
    ctx.arc(x + r, y + r, r, PI, 1.5 * PI)
    ctx.close_path()


def shade(ctx, path_fn, x_from, alpha=0.2, color=(0, 0, 0)):
    """Cel shade: darken the part of a shape right of x_from."""
    ctx.save()
    path_fn()
    ctx.clip()
    ctx.set_source_rgba(*color, alpha)
    ctx.rectangle(x_from, -5000, 10000, 10000)
    ctx.fill()
    ctx.restore()


def lerp(a, b, k):
    return a + (b - a) * k


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def mix(c1, c2, k):
    return tuple(lerp(a, b, k) for a, b in zip(c1, c2))


# ------------------------------------------------------------------ characters
SKIN_L, SKIN_M, SKIN_D = hx("#f2c9a5"), hx("#c98d63"), hx("#7a4a2e")


class Char:
    def __init__(self, **k):
        self.skin = k.get("skin", SKIN_L)
        self.hair = k.get("hair", hx("#5b3a22"))
        self.hair_style = k.get("hair_style", "short")
        self.shirt = k.get("shirt", hx("#4a6fa5"))
        self.pants = k.get("pants", hx("#2d2f3a"))
        self.shoes = k.get("shoes", hx("#2a1d16"))
        self.leg = k.get("leg", 280)
        self.torso = k.get("torso", 190)
        self.head_r = k.get("head_r", 72)
        self.bulk = k.get("bulk", 1.0)
        self.arm = k.get("arm", 200)
        self.top = k.get("top", "shirt")          # shirt, sweater, suit, uniform, dress, flannel, coat, gown
        self.hat = k.get("hat")                   # campaign, police, cap, fedora
        self.face = k.get("face", "normal")       # normal, jason_kid, sack
        self.beard = k.get("beard", False)
        self.shades = k.get("shades", False)
        self.tie = k.get("tie")
        self.accent = k.get("accent", hx("#c9a227"))
        self.lips = k.get("lips")
        self.freckles = k.get("freckles", False)
        self.lashes = k.get("lashes", False)
        self.glasses = k.get("glasses", False)
        self.mustache = k.get("mustache")
        self.old = k.get("old", False)
        self.patch = k.get("patch")

    # pose: walk (phase or None), armL/armR degrees (0 = down, + = outward/up), tilt, look (-1..1),
    # expr, blink (0..1), kneel (0..1), facing (1/-1), hold {'L'|'R': item}, t, lean, glow
    def draw(self, ctx, x, y, size=1.0, **p):
        t = p.get("t", 0.0)
        walk = p.get("walk")
        facing = p.get("facing", 1)
        kneel = p.get("kneel", 0.0)
        armL, armR = p.get("armL", 6), p.get("armR", 6)
        legL = legR = 0.0
        bob = 1.5 * math.sin(t * 2.2)            # breathing
        if walk is not None:
            s = math.sin(walk)
            legL, legR = 24 * s, -24 * s
            armL += -16 * s
            armR += 16 * s
            bob = -abs(math.cos(walk)) * 7
        b = self.bulk
        sit = p.get("sit", False)
        leg = self.leg * (0.6 if sit else (1 - 0.45 * kneel))
        hip = -leg + bob
        sh = hip - self.torso
        neck_top = sh - 22
        R = self.head_r
        hc = neck_top - R * 0.82
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(size * facing, size)
        ctx.rotate(math.radians(p.get("lean", 0)))
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        # shadow on ground
        ctx.save()
        ell(ctx, 0, 0, 95 * b, 16)
        ctx.set_source_rgba(0, 0, 0, 0.35)
        ctx.fill()
        ctx.restore()
        tilt = p.get("tilt", 0) + 1.2 * math.sin(t * 1.3)
        if self.hair_style in ("pam", "curly", "pigtails", "long") and self.face != "sack":
            self._head_frame(ctx, hc, tilt, lambda: self._hair_back(ctx, R))
        self._legs(ctx, hip, leg, legL, legR, kneel)
        if sit:  # lap: thighs foreshortened toward the viewer
            w = 44 * b
            rrect(ctx, -34 * b - w / 2 - 6, hip - 24, 68 * b + w + 12, 64, 28)
            fs(ctx, self.pants)
            ctx.move_to(0, hip - 18)
            ctx.line_to(0, hip + 34)
            ctx.set_line_width(3)
            src(ctx, INK)
            ctx.stroke()
        self._neck(ctx, sh, neck_top)
        self._torso(ctx, hip, sh)
        sw = 74 * b
        hands = {}
        if self.patch:
            C_ = ctx
            rrect(C_, 18 * b, sh + 40, 52 * b, 30, 4)
            fs(C_, hx("#efe8d6"), 2.5)
            text(C_, self.patch, 44 * b, sh + 55, 15, INK, outline=0)
        if self.top == "straitjacket":
            ctx.new_path()
            rrect(ctx, -sw - 14, sh + 60, 2 * sw + 28, 70, 30)
            fs(ctx, self.shirt)
            for k in (-1, 0, 1):
                ctx.rectangle(k * 50 - 10, sh + 56, 20, 78)
                fs(ctx, hx("#7a6a50"), 3)
                ctx.rectangle(k * 50 - 7, sh + 86, 14, 14)
                fs(ctx, hx("#c9c9c9"), 2)
            hands = {"L": (-sw, sh + 90, 0), "R": (sw, sh + 90, 0)}
        else:
          for side, ang in (("L", armL), ("R", armR)):
            hands[side] = self._arm(ctx, -sw if side == "L" else sw, sh + 16, ang, side, p.get("elbow" + side, 12))
        self._head_frame(ctx, hc, tilt, lambda: self._head(ctx, R, p))
        for side, item in (p.get("hold") or {}).items():
            hx_, hy_, ang = hands[side]
            draw_item(ctx, item, hx_, hy_, ang, side, t)
        ctx.restore()
        # world-space hand positions (for interactions / effects)
        return {k: (x + v[0] * size * facing, y + v[1] * size) for k, v in hands.items()} | {
            "head": (x, y + hc * size)}

    def _head_frame(self, ctx, hc, tilt, fn):
        ctx.save()
        ctx.translate(0, hc + self.head_r * 0.8)
        ctx.rotate(math.radians(tilt))
        ctx.translate(0, -self.head_r * 0.8)
        fn()
        ctx.restore()

    def _legs(self, ctx, hip, leg, legL, legR, kneel):
        b = self.bulk
        w = 44 * b
        for sx, ang in ((-34 * b, legL), (34 * b, legR)):
            ctx.save()
            ctx.translate(sx, hip)
            ctx.rotate(math.radians(-ang))
            rrect(ctx, -w / 2, -10, w, leg - 8, w / 2.2)
            fs(ctx, self.pants)
            shade(ctx, lambda: rrect(ctx, -w / 2, -10, w, leg - 8, w / 2.2), w * 0.12, 0.18)
            ell(ctx, 10, leg - 10, w * 0.78, 16)
            fs(ctx, self.shoes)
            ctx.restore()

    def _neck(self, ctx, sh, neck_top):
        ctx.rectangle(-22 * self.bulk, neck_top - 10, 44 * self.bulk, sh - neck_top + 20)
        fs(ctx, mix(self.skin, (0, 0, 0), 0.15))

    def _torso_path(self, ctx, hip, sh):
        b = self.bulk
        sw, ww = 82 * b, 64 * b
        ctx.new_path()
        ctx.move_to(-sw + 10, sh)
        ctx.curve_to(-sw - 8, sh + 4, -sw - 4, sh + 40, -sw + 2, sh + 60)
        ctx.line_to(-ww, hip + 6)
        ctx.curve_to(-ww + 10, hip + 22, ww - 10, hip + 22, ww, hip + 6)
        ctx.line_to(sw - 2, sh + 60)
        ctx.curve_to(sw + 4, sh + 40, sw + 8, sh + 4, sw - 10, sh)
        ctx.curve_to(sw * 0.4, sh - 14, -sw * 0.4, sh - 14, -sw + 10, sh)
        ctx.close_path()

    def _torso(self, ctx, hip, sh):
        b = self.bulk
        top = self.top
        if top in ("dress", "gown"):
            # skirt flares over the legs
            hem = hip + (self.leg * (0.55 if top == "dress" else 0.95))
            ctx.new_path()
            ctx.move_to(-60 * b, hip - 10)
            ctx.curve_to(-80 * b, hip + 60, -105 * b, hem - 30, -110 * b, hem)
            ctx.curve_to(-40, hem + 14, 40, hem + 14, 110 * b, hem)
            ctx.curve_to(105 * b, hem - 30, 80 * b, hip + 60, 60 * b, hip - 10)
            ctx.close_path()
            fs(ctx, self.shirt)
            shade(ctx, lambda: (ctx.new_path(), ctx.rectangle(-110 * b, hip - 10, 220 * b, hem - hip + 20)), 25, 0.15)
        self._torso_path(ctx, hip, sh)
        fs(ctx, self.shirt)
        path = lambda: self._torso_path(ctx, hip, sh)
        ctx.save()
        path()
        ctx.clip()
        if top == "flannel":
            ctx.set_line_width(9)
            for i in range(-6, 7):
                ctx.set_source_rgba(0, 0, 0, 0.28)
                ctx.move_to(i * 26, sh - 30)
                ctx.line_to(i * 26, hip + 30)
                ctx.stroke()
            for j in range(0, 12):
                ctx.set_source_rgba(0, 0, 0, 0.22)
                ctx.move_to(-200, sh + j * 26)
                ctx.line_to(200, sh + j * 26)
                ctx.stroke()
            ctx.set_source_rgba(1, 1, 1, 0.08)
            ctx.set_line_width(3)
            for i in range(-6, 7):
                ctx.move_to(i * 26 + 11, sh - 30)
                ctx.line_to(i * 26 + 11, hip + 30)
                ctx.stroke()
        elif top == "sweater":
            ctx.set_line_width(4)
            ctx.set_source_rgba(0, 0, 0, 0.16)
            for i in (-40, -14, 14, 40):
                for j in range(12):
                    yy = sh + 30 + j * 16
                    ctx.move_to(i * b - 6, yy)
                    ctx.line_to(i * b, yy + 8)
                    ctx.line_to(i * b + 6, yy)
                    ctx.stroke()
            ctx.set_source_rgba(0, 0, 0, 0.12)
            ctx.rectangle(-200, hip - 14, 400, 30)
            ctx.fill()
        elif top in ("suit", "uniform", "coat"):
            ctx.set_source_rgba(0, 0, 0, 0.0)
        ctx.set_source_rgba(0, 0, 0, 0.2)
        ctx.rectangle(30 * b, -5000, 10000, 10000)
        ctx.fill()
        ctx.restore()
        ctx.set_line_width(LW)
        if top == "flannel":  # overall bib + straps
            ctx.new_path()
            rrect(ctx, -46 * b, sh + 70, 92 * b, hip - sh - 50, 10)
            fs(ctx, hx("#3e4f63"))
            for sx in (-1, 1):
                ctx.move_to(sx * 40 * b, sh + 72)
                ctx.line_to(sx * 60 * b, sh + 2)
                ctx.set_line_width(14)
                src(ctx, hx("#3e4f63"))
                ctx.stroke()
                ell(ctx, sx * 38 * b, sh + 80, 7, 7)
                fs(ctx, hx("#b8b090"), 2)
        if top == "suit":
            ctx.new_path()
            ctx.move_to(-26 * b, sh - 6)
            ctx.line_to(0, sh + 90)
            ctx.line_to(26 * b, sh - 6)
            ctx.close_path()
            fs(ctx, hx("#f1efe8"), 3)
            if self.tie:
                ctx.new_path()
                ctx.move_to(-8, sh + 6)
                ctx.line_to(8, sh + 6)
                ctx.line_to(11, sh + 70)
                ctx.line_to(0, sh + 84)
                ctx.line_to(-11, sh + 70)
                ctx.close_path()
                fs(ctx, self.tie, 3)
            for sx in (-1, 1):  # lapels
                ctx.move_to(sx * 26 * b, sh - 6)
                ctx.line_to(sx * 44 * b, sh + 40)
                ctx.line_to(sx * 4, sh + 100)
                ctx.set_line_width(3.5)
                src(ctx, INK)
                ctx.stroke()
        if top == "uniform":
            ctx.move_to(0, sh - 4)
            ctx.line_to(0, hip)
            ctx.set_line_width(3)
            ctx.stroke()
            for k in range(4):
                ell(ctx, 6, sh + 30 + k * 36, 4, 4)
                fs(ctx, hx("#d8c27a"), 2)
            # star badge
            cx, cy = -40 * b, sh + 52
            ctx.new_path()
            for i in range(10):
                r = 17 if i % 2 == 0 else 7
                a = -PI / 2 + i * PI / 5
                ctx.line_to(cx + r * math.cos(a), cy + r * math.sin(a))
            ctx.close_path()
            fs(ctx, hx("#e8c547"), 2.5)
            rrect(ctx, -70 * b, hip - 18, 140 * b, 22, 6)
            fs(ctx, hx("#3a2a1c"), 3)
            rrect(ctx, 46 * b, hip - 10, 26, 54, 6)  # holster
            fs(ctx, hx("#2a1d12"), 3)
        if top == "coat":
            ctx.move_to(-6, sh)
            ctx.line_to(4, hip + 10)
            ctx.set_line_width(3)
            src(ctx, INK)
            ctx.stroke()
            for k in range(3):
                ell(ctx, 14, sh + 50 + k * 50, 5, 5)
                fs(ctx, hx("#2b2118"), 2)
        if top == "sweater":
            ell(ctx, 0, sh + 2, 40 * b, 16, 0, PI)
            ctx.set_line_width(10)
            src(ctx, mix(self.shirt, (0, 0, 0), 0.2))
            ctx.stroke()
        if top in ("dress", "gown"):
            ctx.move_to(-62 * b, hip - 4)
            ctx.line_to(62 * b, hip - 4)
            ctx.set_line_width(8)
            src(ctx, mix(self.shirt, (0, 0, 0), 0.3))
            ctx.stroke()

    def _arm(self, ctx, sx, sy, ang, side, bend=12):
        b = self.bulk
        L, w = self.arm / 2, 40 * (b ** 0.8)
        sg = 1 if side == "L" else -1
        a1 = math.radians(ang) * sg
        a2 = a1 + math.radians(bend) * sg
        sleeve = {"dress": self.skin, "gown": self.skin}.get(self.top, self.shirt)
        if self.top == "gown" and self.hair_style == "pam" and self.shirt[2] > 0.6:
            sleeve = self.shirt
        ex, ey = sx - math.sin(a1) * L, sy + math.cos(a1) * L
        for (px, py, a, ln, last) in ((sx, sy, a1, L + 8, False), (ex, ey, a2, L, True)):
            ctx.save()
            ctx.translate(px, py)
            ctx.rotate(a)
            rrect(ctx, -w / 2, -14, w, ln + 14, w / 2)
            fs(ctx, sleeve)
            shade(ctx, lambda: rrect(ctx, -w / 2, -14, w, ln + 14, w / 2), w * 0.15, 0.18)
            if last:
                if self.top in ("suit", "uniform", "flannel", "coat", "sweater"):
                    ell(ctx, 0, ln - 4, w * 0.5, 8)
                    fs(ctx, mix(sleeve, (1, 1, 1), 0.25) if self.top == "suit" else mix(sleeve, (0, 0, 0), 0.25), 3)
                hr = 21 * (b ** 0.7)
                ell(ctx, 0, ln + 8, hr, hr * 1.05)
                fs(ctx, self.skin)
            ctx.restore()
        hxp = ex - math.sin(a2) * (L + 8)
        hyp = ey + math.cos(a2) * (L + 8)
        return hxp, hyp, a2

    # ---- head
    def _head_shape(self, ctx, R):
        ctx.new_path()
        if self.face == "jason_kid":  # lumpy, lopsided
            ctx.move_to(-R * 0.95, -R * 0.05)
            ctx.curve_to(-R * 1.0, -R * 0.9, -R * 0.2, -R * 1.15, R * 0.25, -R * 1.02)
            ctx.curve_to(R * 0.9, -R * 1.1, R * 1.1, -R * 0.4, R * 0.98, R * 0.1)
            ctx.curve_to(R * 0.95, R * 0.8, R * 0.4, R * 1.02, 0, R * 1.0)
            ctx.curve_to(-R * 0.5, R * 1.0, -R * 0.92, R * 0.7, -R * 0.95, -R * 0.05)
        else:
            ctx.move_to(-R, -R * 0.1)
            ctx.curve_to(-R, -R * 1.2, R, -R * 1.2, R, -R * 0.1)
            ctx.curve_to(R * 0.98, R * 0.6, R * 0.5, R * 1.05, 0, R * 1.05)
            ctx.curve_to(-R * 0.5, R * 1.05, -R * 0.98, R * 0.6, -R, -R * 0.1)
        ctx.close_path()

    def _hair_back(self, ctx, R):
        st = self.hair_style
        ctx.new_path()
        if st == "pam":
            ell(ctx, 0, -R * 0.15, R * 1.22, R * 1.12)
        elif st == "curly":
            for i in range(12):
                a = PI * 0.85 + i * PI * 1.3 / 11
                ell(ctx, R * 1.02 * math.cos(a), -R * 0.1 + R * 0.98 * math.sin(a), R * 0.42, R * 0.42)
        elif st == "pigtails":
            for sx in (-1, 1):
                ell(ctx, sx * R * 1.15, R * 0.15, R * 0.28, R * 0.55)
        elif st == "long":
            rrect(ctx, -R * 1.1, -R * 1.0, R * 2.2, R * 2.3, R * 0.9)
        fs(ctx, self.hair)

    def _head(self, ctx, R, p):
        if self.face == "sack":
            return self._sack(ctx, R, p)
        # ears
        for sx in (-1, 1):
            ell(ctx, sx * R * 0.98, R * 0.05, R * 0.17, R * 0.24)
            fs(ctx, self.skin)
        self._head_shape(ctx, R)
        fs(ctx, self.skin)
        shade(ctx, lambda: self._head_shape(ctx, R), R * 0.35, 0.16)
        # cheeks
        ctx.set_source_rgba(0.9, 0.35, 0.35, 0.18)
        for sx in (-1, 1):
            ell(ctx, sx * R * 0.55, R * 0.35, R * 0.18, R * 0.11)
            ctx.fill()
        if self.freckles:
            ctx.set_source_rgba(0.55, 0.3, 0.15, 0.6)
            for sx in (-1, 1):
                for k in range(4):
                    ell(ctx, sx * R * (0.42 + 0.09 * (k % 2)), R * (0.28 + 0.06 * k), 2.5, 2.5)
                    ctx.fill()
        self._face(ctx, R, p)
        if self.old:
            ctx.set_line_width(2.5)
            ctx.set_source_rgba(0.35, 0.2, 0.15, 0.45)
            for k in range(3):
                ctx.move_to(-R * 0.4, -R * (0.62 - k * 0.09))
                ctx.curve_to(-R * 0.1, -R * (0.66 - k * 0.09), R * 0.1, -R * (0.58 - k * 0.09), R * 0.4, -R * (0.62 - k * 0.09))
                ctx.stroke()
            for sx in (-1, 1):
                ctx.move_to(sx * R * 0.2, R * 0.16)
                ctx.curve_to(sx * R * 0.3, R * 0.22, sx * R * 0.45, R * 0.2, sx * R * 0.55, R * 0.12)
                ctx.stroke()
                ctx.move_to(sx * R * 0.3, R * 0.3)
                ctx.curve_to(sx * R * 0.34, R * 0.45, sx * R * 0.3, R * 0.55, sx * R * 0.26, R * 0.62)
                ctx.stroke()
        if self.mustache:
            ctx.new_path()
            ctx.move_to(-R * 0.3, R * 0.42)
            ctx.curve_to(-R * 0.25, R * 0.28, -R * 0.05, R * 0.3, 0, R * 0.36)
            ctx.curve_to(R * 0.05, R * 0.3, R * 0.25, R * 0.28, R * 0.3, R * 0.42)
            ctx.curve_to(R * 0.15, R * 0.4, R * 0.05, R * 0.4, 0, R * 0.42)
            ctx.curve_to(-R * 0.05, R * 0.4, -R * 0.15, R * 0.4, -R * 0.3, R * 0.42)
            ctx.close_path()
            fs(ctx, self.mustache, 2.5)
        if p.get("tears"):
            t_ = p.get("t", 0)
            for sx in (-1, 1):
                ph = (t_ * 0.45 + (0.5 if sx > 0 else 0)) % 1
                ctx.new_path()
                ex, ey = sx * R * 0.4, R * 0.15 + ph * R * 0.5
                ctx.move_to(ex, ey - R * 0.1)
                ctx.curve_to(ex + R * 0.07, ey, ex + R * 0.06, ey + R * 0.08, ex, ey + R * 0.08)
                ctx.curve_to(ex - R * 0.06, ey + R * 0.08, ex - R * 0.07, ey, ex, ey - R * 0.1)
                ctx.set_source_rgba(0.6, 0.85, 1, 0.9 * (1 - ph * 0.6))
                ctx.fill()
        self._hair_front(ctx, R)
        if self.glasses:
            ctx.set_line_width(4)
            src(ctx, hx("#2b2b2b"))
            for sx in (-1, 1):
                ell(ctx, sx * R * 0.36, -R * 0.06, R * 0.27, R * 0.24)
                ctx.set_source_rgba(0.85, 0.9, 1, 0.18)
                ctx.fill_preserve()
                src(ctx, hx("#2b2b2b"))
                ctx.stroke()
            ctx.move_to(-R * 0.1, -R * 0.08)
            ctx.line_to(R * 0.1, -R * 0.08)
            ctx.stroke()
        if self.beard:
            ctx.new_path()
            for i in range(9):
                a = PI * 0.08 + i * PI * 0.84 / 8
                ell(ctx, R * 0.78 * math.cos(a), R * 0.42 + R * 0.6 * math.sin(a), R * 0.3, R * 0.3)
            fs(ctx, hx("#e9e6df"), 3)
            ell(ctx, 0, R * 0.5, R * 0.22, R * 0.08)  # mouth gap
            src(ctx, hx("#3a2020"))
            ctx.fill()
        if self.hat:
            self._hat(ctx, R)
        if self.shades:
            for sx in (-1, 1):
                rrect(ctx, sx * R * 0.36 - R * 0.3, -R * 0.2, R * 0.6, R * 0.32, 8)
                fs(ctx, hx("#101014"), 3)
            ctx.move_to(-R * 0.06, -R * 0.08)
            ctx.line_to(R * 0.06, -R * 0.08)
            ctx.stroke()

    def _face(self, ctx, R, p):
        expr = p.get("expr", "neutral")
        t = p.get("t", 0)
        blink = p.get("blink")
        if blink is None:
            ph = (t + (hash(self.hair_style) % 7) * 0.37) % 4.1
            blink = 1.0 if ph < 0.12 else 0.0
        look = p.get("look", 0.0)
        kid = self.face == "jason_kid"
        eye_y = -R * 0.08
        for i, sx in enumerate((-1, 1)):
            ex = sx * R * 0.36
            ey = eye_y + (R * 0.1 if (kid and sx > 0) else 0)
            erx, ery = R * 0.2, R * 0.25
            if kid and sx > 0:
                erx, ery = R * 0.15, R * 0.18
            if expr in ("scared", "manic"):
                erx, ery = erx * 1.15, ery * 1.2
            open_ = 1 - blink
            if expr == "cold":
                open_ *= 0.55
            if expr == "sing" or open_ < 0.15:
                ctx.new_path()
                ctx.arc(ex, ey, erx * 0.9, PI * 0.15, PI * 0.85)
                ctx.set_line_width(4)
                src(ctx, INK)
                ctx.stroke()
                continue
            ell(ctx, ex, ey, erx, ery * open_)
            fs(ctx, hx("#fbfbf6"), 3.5)
            pr = erx * (0.42 if expr not in ("scared", "manic") else 0.3)
            ctx.save()
            ell(ctx, ex, ey, erx, ery * open_)
            ctx.clip()
            ell(ctx, ex + look * erx * 0.45, ey + ery * 0.1, pr, pr * 1.15)
            src(ctx, INK)
            ctx.fill()
            ell(ctx, ex + look * erx * 0.45 + pr * 0.35, ey - pr * 0.3 + ery * 0.1, pr * 0.3, pr * 0.3)
            ctx.set_source_rgb(1, 1, 1)
            ctx.fill()
            if expr == "cold":  # heavy lid
                ctx.rectangle(ex - erx, ey - ery, erx * 2, ery * 0.75)
                src(ctx, mix(self.skin, (0, 0, 0), 0.12))
                ctx.fill()
            ctx.restore()
            if self.lashes:
                ctx.set_line_width(3)
                src(ctx, INK)
                for k in range(3):
                    a = -PI * (0.7 - k * 0.2) if sx < 0 else -PI * (0.3 + k * 0.2)
                    ctx.move_to(ex + erx * math.cos(a), ey + ery * open_ * math.sin(a))
                    ctx.line_to(ex + erx * 1.35 * math.cos(a), ey + ery * open_ * 1.35 * math.sin(a))
                    ctx.stroke()
        # brows
        by = eye_y - R * 0.36
        tilt = {"neutral": 0, "sad": -14, "angry": 16, "scared": -18, "manic": 18, "cold": 6, "sing": -8,
                "happy": -4, "shock": -10}.get(expr, 0)
        lift = {"scared": -R * 0.08, "shock": -R * 0.1, "manic": -R * 0.04}.get(expr, 0)
        ctx.set_line_width(R * 0.09)
        src(ctx, mix(self.hair, INK, 0.4) if not self.beard else hx("#dcd8cf"))
        for sx in (-1, 1):
            bx = sx * R * 0.36
            a = math.radians(tilt) * sx
            ctx.move_to(bx - R * 0.17 * math.cos(a), by + lift + R * 0.17 * math.sin(a) * -1 * -1)
            ctx.line_to(bx + R * 0.17 * math.cos(a), by + lift - R * 0.17 * math.sin(a))
            ctx.stroke()
        # nose
        ctx.set_line_width(3.5)
        src(ctx, mix(self.skin, INK, 0.55))
        ctx.move_to(R * 0.02, R * 0.05)
        ctx.curve_to(R * 0.12, R * 0.22, R * 0.1, R * 0.27, -R * 0.04, R * 0.27)
        ctx.stroke()
        # mouth
        my = R * 0.52
        ctx.set_line_width(4)
        src(ctx, INK)
        if expr in ("scared", "shock", "sing"):
            o = 0.6 + 0.4 * abs(math.sin(t * 5)) if expr == "sing" else 1.0
            ell(ctx, 0, my, R * 0.15, R * 0.17 * o)
            fs(ctx, hx("#5a1c22"), 3.5)
        elif expr in ("manic", "happy"):
            w = R * (0.42 if expr == "manic" else 0.3)
            ctx.new_path()
            ctx.move_to(-w, my - R * 0.06)
            ctx.curve_to(-w * 0.5, my + R * 0.32, w * 0.5, my + R * 0.32, w, my - R * 0.06)
            ctx.close_path()
            fs(ctx, hx("#5a1c22"), 3.5)
            ctx.save()
            ctx.move_to(-w, my - R * 0.06)
            ctx.curve_to(-w * 0.5, my + R * 0.32, w * 0.5, my + R * 0.32, w, my - R * 0.06)
            ctx.close_path()
            ctx.clip()
            ctx.rectangle(-w, my - R * 0.08, w * 2, R * 0.1)
            ctx.set_source_rgb(0.97, 0.96, 0.9)
            ctx.fill()
            ctx.restore()
        else:
            curve = {"neutral": 0.04, "sad": -0.1, "angry": -0.06, "cold": 0.0}.get(expr, 0.03)
            w = R * 0.2
            ctx.move_to(-w, my)
            ctx.curve_to(-w * 0.4, my + R * curve * 2, w * 0.4, my + R * curve * 2, w, my)
            src(ctx, self.lips or INK)
            ctx.set_line_width(5 if self.lips else 4)
            ctx.stroke()

    def _hair_front(self, ctx, R):
        st = self.hair_style
        ctx.new_path()
        if st == "pam":
            for i in range(8):
                a = PI * 1.05 + i * PI * 0.9 / 7
                ell(ctx, R * 0.95 * math.cos(a), -R * 0.25 + R * 0.85 * math.sin(a), R * 0.3, R * 0.27)
            fs(ctx, self.hair, 4)
            ctx.set_source_rgba(1, 1, 1, 0.15)
            ell(ctx, -R * 0.3, -R * 0.95, R * 0.3, R * 0.1)
            ctx.fill()
        elif st == "slick":
            ctx.move_to(-R * 1.0, -R * 0.15)
            ctx.curve_to(-R * 1.05, -R * 1.25, R * 1.05, -R * 1.25, R * 1.0, -R * 0.15)
            ctx.curve_to(R * 0.9, -R * 0.55, R * 0.2, -R * 0.75, -R * 0.25, -R * 0.62)
            ctx.curve_to(-R * 0.7, -R * 0.5, -R * 0.9, -R * 0.4, -R * 1.0, -R * 0.15)
            fs(ctx, self.hair, 4)
            ctx.set_source_rgba(1, 1, 1, 0.22)
            ctx.set_line_width(5)
            ctx.move_to(-R * 0.1, -R * 0.95)
            ctx.curve_to(R * 0.3, -R * 0.98, R * 0.6, -R * 0.85, R * 0.75, -R * 0.65)
            ctx.stroke()
        elif st in ("short", "buzz"):
            ctx.move_to(-R * 1.0, -R * 0.2)
            ctx.curve_to(-R * 1.02, -R * 1.25, R * 1.02, -R * 1.25, R * 1.0, -R * 0.2)
            ctx.curve_to(R * 0.7, -R * 0.62, -R * 0.7, -R * 0.62, -R * 1.0, -R * 0.2)
            fs(ctx, self.hair, 4)
        elif st == "curly":
            for i in range(9):
                a = PI * 1.02 + i * PI * 0.96 / 8
                ell(ctx, R * 0.92 * math.cos(a), -R * 0.25 + R * 0.82 * math.sin(a), R * 0.3, R * 0.3)
            fs(ctx, self.hair, 4)
        elif st == "pigtails":
            ctx.move_to(-R * 1.0, -R * 0.1)
            ctx.curve_to(-R * 1.02, -R * 1.25, R * 1.02, -R * 1.25, R * 1.0, -R * 0.1)
            ctx.curve_to(R * 0.5, -R * 0.55, -R * 0.5, -R * 0.55, -R * 1.0, -R * 0.1)
            fs(ctx, self.hair, 4)
            for sx in (-1, 1):
                ell(ctx, sx * R * 1.0, -R * 0.15, R * 0.14, R * 0.1)
                fs(ctx, self.accent, 3)
        elif st == "kid_jason":
            ctx.set_line_width(5)
            src(ctx, self.hair)
            rnd = random.Random(5)
            for i in range(14):
                x0 = rnd.uniform(-0.8, 0.8) * R
                ctx.move_to(x0, -R * 0.75)
                ctx.curve_to(x0 + 10, -R * 1.05, x0 + rnd.uniform(-25, 25), -R * 1.1, x0 + rnd.uniform(-30, 30), -R * 1.18)
                ctx.stroke()
        elif st == "bald":
            ctx.set_source_rgba(1, 1, 1, 0.22)
            ell(ctx, -R * 0.3, -R * 0.78, R * 0.28, R * 0.12)
            ctx.fill()
        elif st == "tufts":  # old man under a cap
            for sx in (-1, 1):
                ell(ctx, sx * R * 0.92, -R * 0.15, R * 0.2, R * 0.3)
                fs(ctx, hx("#e2ded6"), 3)
            if not self.hat:  # thin combed-over top
                ctx.set_line_width(3)
                ctx.set_source_rgba(0.9, 0.88, 0.84, 0.9)
                for k in range(5):
                    ctx.move_to(-R * 0.6 + k * R * 0.25, -R * 0.8)
                    ctx.curve_to(-R * 0.4 + k * R * 0.25, -R * 1.0, -R * 0.2 + k * R * 0.25, -R * 1.02, R * 0.1 + k * R * 0.2, -R * 0.95)
                    ctx.stroke()

    def _hat(self, ctx, R):
        h = self.hat
        if h == "campaign":
            ell(ctx, 0, -R * 0.62, R * 1.55, R * 0.26)
            fs(ctx, hx("#7a5a32"))
            ctx.new_path()
            ctx.move_to(-R * 0.8, -R * 0.64)
            ctx.line_to(-R * 0.55, -R * 1.45)
            ctx.line_to(0, -R * 1.3)
            ctx.line_to(R * 0.55, -R * 1.45)
            ctx.line_to(R * 0.8, -R * 0.64)
            ctx.close_path()
            fs(ctx, hx("#8b6a3c"))
            ctx.rectangle(-R * 0.8, -R * 0.82, R * 1.6, R * 0.16)
            fs(ctx, hx("#3b2a18"), 3)
        elif h == "police":
            ctx.new_path()
            ctx.move_to(-R * 0.95, -R * 0.62)
            ctx.curve_to(-R * 1.15, -R * 1.45, R * 1.15, -R * 1.45, R * 0.95, -R * 0.62)
            ctx.close_path()
            fs(ctx, hx("#24324a"))
            ell(ctx, R * 0.2, -R * 0.58, R * 0.85, R * 0.16)
            fs(ctx, hx("#141a26"))
            ell(ctx, 0, -R * 1.0, R * 0.14, R * 0.14)
            fs(ctx, hx("#e8c547"), 3)
        elif h == "cap":
            ctx.new_path()
            ctx.move_to(-R * 0.98, -R * 0.45)
            ctx.curve_to(-R * 1.0, -R * 1.35, R * 1.0, -R * 1.35, R * 0.98, -R * 0.45)
            ctx.close_path()
            fs(ctx, hx("#5d4a36"))
            ctx.new_path()
            ctx.move_to(-R * 0.6, -R * 0.45)
            ctx.curve_to(-R * 0.2, -R * 0.2, R * 1.2, -R * 0.25, R * 1.45, -R * 0.42)
            ctx.line_to(R * 0.9, -R * 0.55)
            ctx.close_path()
            fs(ctx, hx("#4a3a2a"))
        elif h == "fedora":
            ell(ctx, 0, -R * 0.68, R * 1.4, R * 0.2)
            fs(ctx, hx("#2b2b30"))
            ctx.new_path()
            ctx.move_to(-R * 0.82, -R * 0.7)
            ctx.curve_to(-R * 0.9, -R * 1.5, R * 0.9, -R * 1.5, R * 0.82, -R * 0.7)
            ctx.close_path()
            fs(ctx, hx("#34343a"))
            ctx.rectangle(-R * 0.84, -R * 0.86, R * 1.68, R * 0.15)
            fs(ctx, hx("#151518"), 3)

    def _sack(self, ctx, R, p):
        """Burlap sack over the head: one ragged eye hole, rope tied at the neck."""
        t = p.get("t", 0)
        S = R * 1.25
        burlap = hx("#8c7a58")

        def path():
            ctx.new_path()
            ctx.move_to(-S * 0.85, S * 0.75)
            ctx.curve_to(-S * 1.1, S * 0.1, -S * 1.0, -S * 0.9, -S * 0.55, -S * 1.0)
            ctx.curve_to(-S * 0.2, -S * 1.15, S * 0.1, -S * 0.92, S * 0.35, -S * 1.12)
            ctx.curve_to(S * 0.8, -S * 1.05, S * 1.08, -S * 0.5, S * 0.95, S * 0.15)
            ctx.curve_to(S * 0.95, S * 0.5, S * 0.85, S * 0.7, S * 0.7, S * 0.8)
            ctx.curve_to(S * 0.3, S * 0.95, -S * 0.4, S * 0.95, -S * 0.85, S * 0.75)
            ctx.close_path()
        path()
        fs(ctx, burlap, 5.5)
        ctx.save()
        path()
        ctx.clip()
        ctx.set_line_width(1.2)
        ctx.set_source_rgba(0.2, 0.15, 0.08, 0.35)
        for i in range(-30, 30):
            ctx.move_to(i * 7, -S * 1.3)
            ctx.line_to(i * 7 + 6, S * 1.2)
            ctx.stroke()
        for j in range(-30, 30):
            ctx.move_to(-S * 1.3, j * 7)
            ctx.line_to(S * 1.3, j * 7 + 4)
            ctx.stroke()
        ctx.set_source_rgba(0, 0, 0, 0.25)  # folds + shading
        ctx.set_line_width(6)
        for x0, x1 in ((-S * 0.4, -S * 0.2), (S * 0.25, S * 0.45)):
            ctx.move_to(x0, S * 0.85)
            ctx.curve_to(x0 + 10, S * 0.3, x1 - 10, -S * 0.2, x1, -S * 0.5)
            ctx.stroke()
        ctx.rectangle(S * 0.35, -S * 2, S * 3, S * 4)
        ctx.fill()
        ctx.restore()
        # single ragged eye hole
        ex, ey = -S * 0.32, -S * 0.12
        ctx.new_path()
        rnd = random.Random(3)
        for i in range(14):
            a = i * 2 * PI / 14
            r = S * 0.17 * rnd.uniform(0.8, 1.15)
            ctx.line_to(ex + r * math.cos(a) * 1.15, ey + r * math.sin(a))
        ctx.close_path()
        fs(ctx, hx("#0b0708"), 3)
        look = p.get("look", 0)
        glow = p.get("eye_glow", 0.0)
        if glow > 0:
            g = cairo.RadialGradient(ex, ey, 0, ex, ey, S * 0.5)
            g.add_color_stop_rgba(0, 1, 0.15, 0.1, 0.55 * glow)
            g.add_color_stop_rgba(1, 1, 0.1, 0.1, 0)
            ctx.set_source(g)
            ell(ctx, ex, ey, S * 0.5, S * 0.5)
            ctx.fill()
        ell(ctx, ex + look * S * 0.05, ey + S * 0.02, S * 0.07, S * 0.06)
        ctx.set_source_rgb(0.92, 0.88, 0.8) if glow == 0 else ctx.set_source_rgb(1, 0.35, 0.25)
        ctx.fill()
        ell(ctx, ex + look * S * 0.06, ey + S * 0.025, S * 0.035, S * 0.035)
        ctx.set_source_rgb(0.05, 0.03, 0.03)
        ctx.fill()
        # stitched seam + rope
        ctx.set_line_width(2.5)
        src(ctx, hx("#3e3020"))
        for i in range(8):
            x = -S * 0.7 + i * S * 0.18
            ctx.move_to(x, -S * 0.93 + 3 * math.sin(i))
            ctx.line_to(x + 6, -S * 0.85)
            ctx.stroke()
        ctx.move_to(-S * 0.65, S * 0.6)
        ctx.curve_to(-S * 0.2, S * 0.72, S * 0.2, S * 0.72, S * 0.6, S * 0.58)
        ctx.set_line_width(11)
        src(ctx, hx("#5a4126"))
        ctx.stroke_preserve()
        ctx.set_line_width(2)
        src(ctx, INK)
        ctx.stroke()
        ell(ctx, S * 0.5, S * 0.66, 12, 10)
        fs(ctx, hx("#5a4126"), 3)
        ctx.move_to(S * 0.5, S * 0.7)
        ctx.line_to(S * 0.56, S * 0.98 + 4 * math.sin(t * 2))
        ctx.set_line_width(7)
        src(ctx, hx("#5a4126"))
        ctx.stroke()


def draw_item(ctx, item, x, y, ang, side, t):
    ctx.save()
    ctx.translate(x, y)
    along = math.atan2(math.cos(ang), -math.sin(ang))  # direction the forearm points
    if item == "mic":
        ctx.rotate(ang * 0.3 + (0.5 if side == "R" else -0.5))
        rrect(ctx, -6, -10, 12, 60, 5)
        fs(ctx, hx("#222226"), 3)
        ell(ctx, 0, -18, 16, 18)
        fs(ctx, hx("#a9adb5"), 3)
    elif item == "shotgun":
        ctx.rotate(along)
        rrect(ctx, -30, -12, 70, 26, 8)
        fs(ctx, hx("#6b4423"), 3)
        rrect(ctx, 30, -9, 230, 14, 4)
        fs(ctx, hx("#3a3a40"), 3)
        rrect(ctx, 34, 4, 170, 9, 4)
        fs(ctx, hx("#2a2a2e"), 3)
    elif item == "pistol":
        ctx.rotate(along)
        rrect(ctx, -8, -8, 70, 18, 4)
        fs(ctx, hx("#2b2b30"), 3)
        rrect(ctx, -8, -2, 18, 36, 4)
        fs(ctx, hx("#3a2a20"), 3)
    elif item == "flashlight":
        ctx.rotate(along)
        g = cairo.LinearGradient(40, 0, 560, 0)
        g.add_color_stop_rgba(0, 1, 0.96, 0.75, 0.55)
        g.add_color_stop_rgba(1, 1, 0.96, 0.75, 0)
        ctx.move_to(40, -10)
        ctx.line_to(560, -120)
        ctx.line_to(560, 120)
        ctx.line_to(40, 10)
        ctx.close_path()
        ctx.set_source(g)
        ctx.fill()
        rrect(ctx, -10, -9, 54, 18, 5)
        fs(ctx, hx("#3d3d44"), 3)
    elif item == "envelope":
        ctx.rotate(-0.2)
        ctx.rectangle(-38, -26, 76, 50)
        fs(ctx, hx("#e6dcc0"), 3)
        ctx.move_to(-38, -26)
        ctx.line_to(0, 4)
        ctx.line_to(38, -26)
        ctx.set_line_width(3)
        src(ctx, INK)
        ctx.stroke()
    elif item == "syringe":
        ctx.rotate(-0.6)
        rrect(ctx, -8, -50, 16, 70, 4)
        fs(ctx, hx("#d8f5e0"), 3)
        g = 0.6 + 0.4 * math.sin(t * 6)
        ctx.rectangle(-5, -30, 10, 46)
        ctx.set_source_rgba(0.3, 1, 0.45, g)
        ctx.fill()
        ctx.move_to(0, -50)
        ctx.line_to(0, -80)
        ctx.set_line_width(2)
        src(ctx, INK)
        ctx.stroke()
    elif item == "photo":
        ctx.rotate(0.1)
        ctx.rectangle(-36, -46, 72, 88)
        fs(ctx, hx("#6b4b2d"), 3)
        ctx.rectangle(-28, -38, 56, 72)
        src(ctx, hx("#c9b89a"))
        ctx.fill()
        ell(ctx, 0, -8, 12, 14)
        src(ctx, hx("#6d5a44"))
        ctx.fill()
        ell(ctx, 0, 22, 20, 14, PI, 2 * PI)
        ctx.fill()
    elif item == "cane":
        ctx.rotate(-0.08)
        rrect(ctx, -5, -10, 10, 260, 4)
        fs(ctx, hx("#5a3a22"), 3)
        ctx.new_path()
        ctx.arc(-14, -10, 14, PI, 2 * PI)
        ctx.set_line_width(10)
        src(ctx, hx("#5a3a22"))
        ctx.stroke()
    elif item == "baton":
        ctx.rotate(along)
        rrect(ctx, -10, -7, 150, 14, 6)
        fs(ctx, hx("#2a1d14"), 3)
    elif item == "sponge":
        rrect(ctx, -30, -22, 60, 40, 10)
        fs(ctx, hx("#e8cf5a"), 3)
        ctx.set_source_rgba(0.6, 0.45, 0.1, 0.6)
        for k in range(6):
            ell(ctx, -18 + (k % 3) * 18, -10 + (k // 3) * 16, 4, 4)
            ctx.fill()
    elif item == "lantern":
        g = cairo.RadialGradient(0, 40, 5, 0, 40, 160)
        g.add_color_stop_rgba(0, 1, 0.8, 0.4, 0.45)
        g.add_color_stop_rgba(1, 1, 0.8, 0.4, 0)
        ctx.set_source(g)
        ell(ctx, 0, 40, 160, 160)
        ctx.fill()
        ctx.move_to(0, -10)
        ctx.line_to(0, 10)
        ctx.set_line_width(3)
        src(ctx, INK)
        ctx.stroke()
        rrect(ctx, -18, 10, 36, 56, 8)
        fs(ctx, hx("#ffd27a"), 3)
    elif item == "keys":
        for k in range(3):
            ctx.save()
            ctx.rotate(0.3 * k - 0.3)
            rrect(ctx, -3, 0, 6, 34, 2)
            fs(ctx, hx("#c9b26a"), 2)
            ctx.restore()
        ell(ctx, 0, 0, 10, 10)
        ctx.set_line_width(3)
        src(ctx, hx("#c9b26a"))
        ctx.stroke()
    elif item == "clipboard":
        rrect(ctx, -36, -50, 72, 96, 6)
        fs(ctx, hx("#8a6b45"), 3)
        ctx.rectangle(-28, -36, 56, 74)
        src(ctx, hx("#f0ece0"))
        ctx.fill()
        for k in range(5):
            ctx.move_to(-22, -26 + k * 14)
            ctx.line_to(20, -26 + k * 14)
            ctx.set_line_width(2)
            ctx.set_source_rgba(0.2, 0.2, 0.2, 0.6)
            ctx.stroke()
    ctx.restore()


# ------------------------------------------------------------------ cast
CAST = {
    "pam": Char(skin=SKIN_L, hair=hx("#6e4a2c"), hair_style="pam", shirt=hx("#d9cfb8"), top="sweater",
                pants=hx("#3b4258"), head_r=70, lips=hx("#a8323a"), lashes=True),
    "pam_glam": Char(skin=SKIN_L, hair=hx("#6e4a2c"), hair_style="pam", shirt=hx("#9e1b2c"), top="gown",
                     head_r=70, lips=hx("#b0202e"), lashes=True, shoes=hx("#2a0d12")),
    "jason_kid": Char(skin=hx("#eac4a2"), hair=hx("#3b2a1c"), hair_style="kid_jason", shirt=hx("#5d7f9a"),
                      pants=hx("#5a4a38"), leg=170, torso=130, head_r=74, arm=130, bulk=0.66, face="jason_kid"),
    "jason": Char(skin=hx("#d8b292"), shirt=hx("#7b3b2e"), top="flannel", pants=hx("#3e4f63"),
                  leg=330, torso=230, head_r=74, bulk=1.45, arm=240, face="sack", shoes=hx("#2a2018")),
    "elias": Char(skin=hx("#ecc8aa"), hair=hx("#1e1a18"), hair_style="slick", shirt=hx("#2b2d36"), top="suit",
                  pants=hx("#2b2d36"), leg=300, torso=200, head_r=66, bulk=0.92, tie=hx("#7a1420"), shoes=hx("#121214")),
    "levon": Char(skin=SKIN_D, hair=hx("#14100e"), hair_style="buzz", shirt=hx("#b39a6c"), top="uniform",
                  pants=hx("#4a3a28"), head_r=70, hat="campaign", bulk=1.08),
    "dorf": Char(skin=hx("#f0c9a8"), hair=hx("#a0703a"), hair_style="short", shirt=hx("#b39a6c"), top="uniform",
                 pants=hx("#4a3a28"), head_r=68, hat="police"),
    "briana": Char(skin=SKIN_M, hair=hx("#24160f"), hair_style="curly", shirt=hx("#2f7f7a"), top="shirt",
                   pants=hx("#5a3e2a"), head_r=66, lips=hx("#8a3a3a"), lashes=True, bulk=0.9),
    "ralph": Char(skin=hx("#e3b896"), hair=hx("#d9d4ca"), hair_style="tufts", shirt=hx("#6b5a3c"), top="coat",
                  pants=hx("#4b4236"), head_r=68, hat="cap", beard=True, lean=0),
    "grace": Char(skin=SKIN_L, hair=hx("#c98a3a"), hair_style="pigtails", shirt=hx("#e3c14b"), top="dress",
                  leg=165, torso=120, head_r=70, arm=125, bulk=0.62, freckles=True, accent=hx("#c0392b"), lashes=True),
    "goon": Char(skin=hx("#e8c2a2"), hair=hx("#222222"), hair_style="short", shirt=hx("#3a3a42"), top="suit",
                 pants=hx("#3a3a42"), head_r=64, hat="fedora", shades=True, tie=hx("#222226"), bulk=1.05),
    "mom": Char(skin=hx("#e6bf9e"), hair=hx("#4a3426"), hair_style="long", shirt=hx("#7d6b8f"), top="dress",
                head_r=66),
}

TEEN_COLORS = [hx("#c0392b"), hx("#2e86c1"), hx("#27ae60"), hx("#d68910")]


def teen(i):
    hairs = ["long", "short", "curly", "short"]
    skins = [SKIN_L, SKIN_M, SKIN_D, hx("#f0c9a8")]
    return Char(skin=skins[i % 4], hair=[hx("#5b3a22"), hx("#1c1410"), hx("#2a1a10"), hx("#c49a50")][i % 4],
                hair_style=hairs[i % 4], shirt=TEEN_COLORS[i % 4], pants=hx("#2f3d5c"), head_r=64, bulk=0.9)


# ------------------------------------------------------------------ backgrounds
def sky(ctx, top, bottom, y1=1080):
    g = cairo.LinearGradient(0, 0, 0, y1)
    g.add_color_stop_rgb(0, *top)
    g.add_color_stop_rgb(1, *bottom)
    ctx.set_source(g)
    ctx.rectangle(-1200, -800, 4400, 2800)
    ctx.fill()


def stars(ctx, t, n=160, ymax=600, seed=1):
    rnd = random.Random(seed)
    for i in range(n):
        x, y = rnd.uniform(-300, 2200), rnd.uniform(-200, ymax)
        a = 0.4 + 0.6 * abs(math.sin(t * rnd.uniform(0.5, 2) + i))
        ctx.set_source_rgba(1, 1, 0.95, a * 0.8)
        ell(ctx, x, y, 1.6, 1.6)
        ctx.fill()


def moon(ctx, x, y, r):
    g = cairo.RadialGradient(x, y, r * 0.8, x, y, r * 5)
    g.add_color_stop_rgba(0, 0.75, 0.82, 1, 0.45)
    g.add_color_stop_rgba(1, 0.75, 0.82, 1, 0)
    ctx.set_source(g)
    ell(ctx, x, y, r * 5, r * 5)
    ctx.fill()
    ell(ctx, x, y, r, r)
    g2 = cairo.RadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
    g2.add_color_stop_rgb(0, 1, 1, 0.95)
    g2.add_color_stop_rgb(1, 0.85, 0.86, 0.8)
    ctx.set_source(g2)
    ctx.fill()
    ctx.set_source_rgba(0.6, 0.6, 0.58, 0.35)
    for dx, dy, rr in ((-0.3, -0.2, 0.18), (0.25, 0.15, 0.24), (-0.1, 0.4, 0.12)):
        ell(ctx, x + dx * r, y + dy * r, rr * r, rr * r)
        ctx.fill()


def pine(ctx, x, base, h, col, ink=True):
    w = h * 0.36
    ctx.new_path()
    ctx.move_to(x, base - h)
    for k in range(5):
        yy = base - h + h * (k + 1) / 5.4
        ww = w * (k + 1) / 5
        ctx.line_to(x + ww, yy)
        ctx.line_to(x + ww * 0.55, yy - h * 0.02)
    ctx.line_to(x + w * 0.12, base)
    ctx.line_to(x - w * 0.12, base)
    for k in reversed(range(5)):
        yy = base - h + h * (k + 1) / 5.4
        ww = w * (k + 1) / 5
        ctx.line_to(x - ww * 0.55, yy - h * 0.02)
        ctx.line_to(x - ww, yy)
    ctx.close_path()
    src(ctx, col)
    ctx.fill_preserve() if ink else ctx.fill()
    if ink:
        ctx.set_line_width(2.5)
        src(ctx, INK)
        ctx.stroke()


def treeline(ctx, base, hmin, hmax, col, seed, x0=-600, x1=2600, ink=False):
    rnd = random.Random(seed)
    x = x0
    while x < x1:
        h = rnd.uniform(hmin, hmax)
        pine(ctx, x, base, h, col, ink)
        x += h * rnd.uniform(0.18, 0.32)
    ctx.rectangle(x0, base - 4, x1 - x0, 4000)
    src(ctx, col)
    ctx.fill()


def fog(ctx, t, y, h, alpha=0.25, color=(0.7, 0.75, 0.85), speed=12, seed=0):
    rnd = random.Random(seed)
    for i in range(14):
        x = (rnd.uniform(-600, 2600) + t * speed * rnd.uniform(0.6, 1.4)) % 3200 - 600
        yy = y + rnd.uniform(-h / 2, h / 2)
        rw, rh = rnd.uniform(260, 520), rnd.uniform(40, 90)
        g = cairo.RadialGradient(x, yy, 0, x, yy, rw)
        g.add_color_stop_rgba(0, *color, alpha)
        g.add_color_stop_rgba(1, *color, 0)
        ctx.save()
        ctx.translate(x, yy)
        ctx.scale(1, rh / rw)
        ctx.translate(-x, -yy)
        ctx.set_source(g)
        ctx.arc(x, yy, rw, 0, 2 * PI)
        ctx.fill()
        ctx.restore()


def water(ctx, t, y0, moon_x, top=hx("#1b2a4a"), bottom=hx("#070b16")):
    g = cairo.LinearGradient(0, y0, 0, 1300)
    g.add_color_stop_rgb(0, *top)
    g.add_color_stop_rgb(1, *bottom)
    ctx.set_source(g)
    ctx.rectangle(-1200, y0, 4400, 2000)
    ctx.fill()
    rnd = random.Random(int(t * 6))
    for i in range(34):
        yy = y0 + 8 + i * i * 0.55
        w = (20 + i * 5) * rnd.uniform(0.5, 1.3)
        a = max(0, 0.7 - i * 0.02) * rnd.uniform(0.4, 1)
        ctx.set_source_rgba(0.85, 0.9, 1, a)
        ctx.set_line_width(2 + i * 0.08)
        ctx.move_to(moon_x - w + rnd.uniform(-8, 8), yy)
        ctx.line_to(moon_x + w + rnd.uniform(-8, 8), yy)
        ctx.stroke()
    ctx.set_source_rgba(1, 1, 1, 0.06)
    ctx.set_line_width(2)
    rnd = random.Random(9)
    for i in range(40):
        x = rnd.uniform(-400, 2300)
        yy = y0 + rnd.uniform(10, 500)
        dx = math.sin(t * 0.8 + i) * 10
        ctx.move_to(x + dx, yy)
        ctx.line_to(x + dx + rnd.uniform(40, 120), yy)
        ctx.stroke()


def bg_lake(ctx, t, horizon=620, dock=True, sign=False, moon_xy=(1620, 300)):
    sky(ctx, hx("#060a1a"), hx("#26304f"), horizon)
    stars(ctx, t, ymax=horizon - 80)
    moon(ctx, *moon_xy, 62)
    # far hills + tree lines
    ctx.new_path()
    ctx.move_to(-1200, horizon)
    for i in range(30):
        ctx.line_to(-1200 + i * 160, horizon - 60 - 40 * math.sin(i * 1.7) - 30 * math.sin(i * 0.6))
    ctx.line_to(3200, horizon)
    ctx.close_path()
    src(ctx, hx("#141b31"))
    ctx.fill()
    treeline(ctx, horizon + 2, 70, 150, hx("#0d1324"), 2, ink=False)
    water(ctx, t, horizon, moon_xy[0])
    fog(ctx, t, horizon + 10, 60, 0.22, seed=1)
    if dock:
        # wooden dock in perspective
        ctx.new_path()
        ctx.move_to(700, 1100)
        ctx.line_to(1220, 1100)
        ctx.line_to(1060, 760)
        ctx.line_to(860, 760)
        ctx.close_path()
        fs(ctx, hx("#4a3424"), 4)
        ctx.set_line_width(2.5)
        src(ctx, hx("#22160e"))
        for k in range(12):
            f = k / 12
            yy = 760 + (1100 - 760) * f ** 1.4
            xl = lerp(860, 700, (yy - 760) / 340)
            xr = lerp(1060, 1220, (yy - 760) / 340)
            ctx.move_to(xl, yy)
            ctx.line_to(xr, yy)
            ctx.stroke()
        for px in (870, 1050):
            ctx.rectangle(px - 9, 735, 18, 40)
            fs(ctx, hx("#3a281a"), 3)
    if sign:
        camp_sign(ctx, 330, 900, t)
    # foreground framing pines
    treeline(ctx, 1200, 520, 760, hx("#04060c"), 11, x0=-700, x1=-80, ink=False)
    treeline(ctx, 1200, 520, 760, hx("#04060c"), 12, x0=2000, x1=2700, ink=False)


def camp_sign(ctx, x, y, t, text1="CAMP", text2="CRYSTAL LAKE"):
    for px in (x - 190, x + 190):
        rrect(ctx, px - 13, y - 300, 26, 310, 6)
        fs(ctx, hx("#3b2717"))
    ctx.save()
    ctx.translate(x, y - 250)
    ctx.rotate(-0.03 + 0.01 * math.sin(t * 1.5))
    rrect(ctx, -250, -70, 500, 150, 14)
    fs(ctx, hx("#6b4a2c"), 6)
    ctx.set_line_width(2)
    ctx.set_source_rgba(0, 0, 0, 0.25)
    for k in range(5):
        ctx.move_to(-240, -40 + k * 28)
        ctx.curve_to(-80, -44 + k * 28, 80, -36 + k * 28, 240, -40 + k * 28)
        ctx.stroke()
    text(ctx, text1, 0, -22, 44, hx("#efe2c0"), "Liberation Serif", outline=4)
    text(ctx, text2, 0, 40, 60, hx("#efe2c0"), "Liberation Serif", outline=5)
    ctx.restore()


def bg_woods(ctx, t, tint=hx("#0b1220"), beams=True):
    sky(ctx, hx("#05070f"), hx("#141c30"))
    rnd = random.Random(4)
    for layer, (col, n, wmin, wmax) in enumerate([(hx("#141b2c"), 30, 18, 40), (hx("#0c111d"), 22, 30, 60),
                                                  (hx("#06080f"), 12, 50, 100)]):
        for i in range(n):
            x = rnd.uniform(-500, 2400)
            w = rnd.uniform(wmin, wmax)
            ctx.rectangle(x, -400, w, 2000)
            src(ctx, col)
            ctx.fill()
            for b in range(3):
                by = rnd.uniform(0, 700)
                ctx.move_to(x + w / 2, by)
                ctx.line_to(x + w / 2 + rnd.choice((-1, 1)) * rnd.uniform(60, 160), by - rnd.uniform(40, 120))
                ctx.set_line_width(w * 0.25)
                ctx.stroke()
        fog(ctx, t, 700 + layer * 120, 200, 0.12 + 0.05 * layer, seed=layer + 3)
    if beams:
        for i, bx in enumerate((300, 900, 1500)):
            g = cairo.LinearGradient(bx, 0, bx + 300, 1080)
            g.add_color_stop_rgba(0, 0.7, 0.8, 1, 0.13 + 0.03 * math.sin(t + i))
            g.add_color_stop_rgba(1, 0.7, 0.8, 1, 0)
            ctx.set_source(g)
            ctx.move_to(bx, -50)
            ctx.line_to(bx + 120, -50)
            ctx.line_to(bx + 520, 1100)
            ctx.line_to(bx + 220, 1100)
            ctx.close_path()
            ctx.fill()
    g = cairo.LinearGradient(0, 850, 0, 1080)
    g.add_color_stop_rgb(0, *hx("#121a14"))
    g.add_color_stop_rgb(1, *hx("#070a07"))
    ctx.set_source(g)
    ctx.rectangle(-1200, 850, 4400, 600)
    ctx.fill()
    rnd = random.Random(8)
    ctx.set_line_width(3)
    for i in range(160):  # grass tufts
        x = rnd.uniform(-400, 2300)
        yy = rnd.uniform(860, 1080)
        src(ctx, hx("#1a2a1a"))
        for k in (-1, 0, 1):
            ctx.move_to(x, yy)
            ctx.line_to(x + k * 8 + math.sin(t * 1.5 + i) * 3, yy - rnd.uniform(14, 30))
            ctx.stroke()


def bg_nightclub(ctx, t, red=0.0):
    sky(ctx, mix(hx("#2a0c14"), hx("#3a0408"), red), mix(hx("#120408"), hx("#200000"), red))
    for i in range(16):  # curtain folds
        x = -200 + i * 150
        g = cairo.LinearGradient(x, 0, x + 150, 0)
        base = mix(hx("#7a1424"), hx("#9a0a0a"), red)
        g.add_color_stop_rgb(0, *mix(base, (0, 0, 0), 0.5))
        g.add_color_stop_rgb(0.5, *base)
        g.add_color_stop_rgb(1, *mix(base, (0, 0, 0), 0.5))
        ctx.set_source(g)
        ctx.rectangle(x, -300, 150, 1100)
        ctx.fill()
    ctx.rectangle(-500, -300, 3000, 140)
    fs(ctx, hx("#5a0c18"), 5)
    for i in range(24):  # scalloped valance
        ell(ctx, -500 + i * 130, -160, 70, 50, 0, PI)
        fs(ctx, hx("#5a0c18"), 4)
    ctx.rectangle(-500, 800, 3000, 400)  # stage
    g = cairo.LinearGradient(0, 800, 0, 1080)
    g.add_color_stop_rgb(0, *hx("#4a2a1a"))
    g.add_color_stop_rgb(1, *hx("#1a0d08"))
    ctx.set_source(g)
    ctx.fill()
    ctx.rectangle(-500, 795, 3000, 16)
    fs(ctx, hx("#c9a24a"), 3)
    # spotlight cone
    g = cairo.LinearGradient(960, -100, 960, 900)
    col = (1, 0.92, 0.7) if red < 0.5 else (1, 0.2, 0.15)
    g.add_color_stop_rgba(0, *col, 0.4)
    g.add_color_stop_rgba(1, *col, 0.1)
    ctx.set_source(g)
    ctx.move_to(900, -100)
    ctx.line_to(1020, -100)
    ctx.line_to(1250, 860)
    ctx.line_to(670, 860)
    ctx.close_path()
    ctx.fill()
    ell(ctx, 960, 850, 300, 40)
    ctx.set_source_rgba(*col, 0.25)
    ctx.fill()
    rnd = random.Random(2)
    for i in range(30):  # bokeh lights
        x, yy = rnd.uniform(-200, 2100), rnd.uniform(40, 500)
        r = rnd.uniform(6, 18)
        ctx.set_source_rgba(1, 0.8, 0.4, 0.15 + 0.1 * math.sin(t * 2 + i))
        ell(ctx, x, yy, r, r)
        ctx.fill()


def club_tables(ctx, t):
    for x in (250, 1650):
        ell(ctx, x, 1020, 160, 34)
        fs(ctx, hx("#1a0a0a"), 4)
        ell(ctx, x, 1012, 150, 26)
        src(ctx, hx("#f0e6d0"))
        ctx.fill()
        ell(ctx, x + 30, 992, 12, 26)  # candle glass
        fs(ctx, hx("#e8a040", 0.8), 2)


def bg_lab(ctx, t):
    sky(ctx, hx("#a9c7c2"), hx("#6e9590"))
    ctx.set_line_width(2)
    ctx.set_source_rgba(0.2, 0.35, 0.35, 0.35)
    for i in range(-10, 40):
        ctx.move_to(i * 70, -300)
        ctx.line_to(i * 70, 760)
        ctx.stroke()
    for j in range(-5, 16):
        ctx.move_to(-800, j * 70)
        ctx.line_to(2800, j * 70)
        ctx.stroke()
    # logo sign
    rrect(ctx, 1240, 90, 560, 140, 16)
    fs(ctx, hx("#f4f1e8"), 5)
    ctx.save()
    ctx.translate(1320, 160)
    for i in range(5):  # bell flower icon
        ctx.save()
        ctx.rotate(i * 2 * PI / 5)
        ell(ctx, 0, -22, 13, 22)
        fs(ctx, hx("#6b4fa0"), 3)
        ctx.restore()
    ell(ctx, 0, 0, 9, 9)
    fs(ctx, hx("#e8c547"), 2)
    ctx.restore()
    text(ctx, "BELLFLOWER", 1550, 145, 54, hx("#3a2d5c"), "DejaVu Sans", outline=0)
    text(ctx, "CHEMICAL", 1550, 198, 30, hx("#6b4fa0"), "DejaVu Sans", outline=0)
    # counter
    ctx.rectangle(-800, 760, 3600, 60)
    fs(ctx, hx("#d9dde0"), 5)
    ctx.rectangle(-800, 820, 3600, 400)
    fs(ctx, hx("#4b5a63"), 5)
    for i in range(10):
        ctx.rectangle(-700 + i * 330, 850, 300, 200)
        fs(ctx, hx("#56656e"), 3)
    # glowing vials
    for i, x in enumerate((180, 240, 300, 1500, 1560, 1620, 1680)):
        g = 0.6 + 0.4 * math.sin(t * 3 + i)
        glow = cairo.RadialGradient(x, 700, 0, x, 700, 90)
        glow.add_color_stop_rgba(0, 0.4, 1, 0.5, 0.35 * g)
        glow.add_color_stop_rgba(1, 0.4, 1, 0.5, 0)
        ctx.set_source(glow)
        ell(ctx, x, 700, 90, 90)
        ctx.fill()
        rrect(ctx, x - 16, 640, 32, 120, 12)
        fs(ctx, hx("#d8f2e8", 0.6), 3)
        rrect(ctx, x - 12, 690, 24, 66, 10)
        ctx.set_source_rgba(0.3, 1, 0.45, 0.85)
        ctx.fill()
    # heart monitor
    rrect(ctx, 380, 300, 300, 200, 14)
    fs(ctx, hx("#2b3238"), 5)
    ctx.rectangle(400, 320, 260, 160)
    src(ctx, hx("#06140c"))
    ctx.fill()
    ctx.set_source_rgb(0.3, 1, 0.45)
    ctx.set_line_width(3)
    ph = (t * 120) % 260
    for k in range(0, 260, 4):
        x = 400 + k
        v = 0
        d = (k - ph) % 260
        if 0 < d < 30:
            v = [0, -50, 40, -10][min(3, int(d / 8))]
        ctx.line_to(x, 400 + v)
    ctx.stroke()


def radiation(ctx, x, y, r, a, rot):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ell(ctx, 0, 0, r, r)
    ctx.set_source_rgba(0.95, 0.8, 0.1, a)
    ctx.fill_preserve()
    ctx.set_line_width(5)
    ctx.set_source_rgba(0.1, 0.08, 0.05, a)
    ctx.stroke()
    ctx.set_source_rgba(0.1, 0.08, 0.05, a)
    for i in range(3):
        ctx.new_path()
        a0 = i * 2 * PI / 3 - PI / 6 - PI / 2
        ctx.arc(0, 0, r * 0.85, a0, a0 + PI / 3)
        ctx.arc_negative(0, 0, r * 0.22, a0 + PI / 3, a0)
        ctx.close_path()
        ctx.fill()
    ell(ctx, 0, 0, r * 0.14, r * 0.14)
    ctx.fill()
    ctx.restore()


def bg_underwater(ctx, t):
    sky(ctx, hx("#1d5a78"), hx("#03101c"))
    for i in range(7):  # god rays
        x = 200 + i * 260 + 40 * math.sin(t * 0.4 + i)
        g = cairo.LinearGradient(x, 0, x + 200, 900)
        g.add_color_stop_rgba(0, 0.7, 0.95, 1, 0.16)
        g.add_color_stop_rgba(1, 0.7, 0.95, 1, 0)
        ctx.set_source(g)
        ctx.move_to(x, -50)
        ctx.line_to(x + 80, -50)
        ctx.line_to(x + 300, 1000)
        ctx.line_to(x + 140, 1000)
        ctx.close_path()
        ctx.fill()
    ctx.set_line_width(2)
    ctx.set_source_rgba(0.8, 0.95, 1, 0.35)  # surface shimmer
    for i in range(40):
        x = (i * 61 + t * 20) % 2200 - 100
        ctx.move_to(x, 14 + 6 * math.sin(i))
        ctx.line_to(x + 40, 14 + 6 * math.sin(i))
        ctx.stroke()
    ctx.new_path()  # lake bottom
    ctx.move_to(-800, 1080)
    for i in range(30):
        ctx.line_to(-800 + i * 130, 980 - 40 * math.sin(i * 1.3))
    ctx.line_to(3000, 1300)
    ctx.line_to(-800, 1300)
    ctx.close_path()
    src(ctx, hx("#0a1a14"))
    ctx.fill()
    rnd = random.Random(6)
    for i in range(26):  # weeds
        x = rnd.uniform(-200, 2100)
        h = rnd.uniform(120, 320)
        ctx.move_to(x, 1000)
        sway = 25 * math.sin(t * 1.2 + i)
        ctx.curve_to(x + sway, 1000 - h * 0.4, x - sway, 1000 - h * 0.7, x + sway, 1000 - h)
        ctx.set_line_width(rnd.uniform(6, 12))
        src(ctx, hx("#163828"))
        ctx.stroke()


def bubbles(ctx, t, x, y, n=12, seed=0, spread=60):
    rnd = random.Random(seed)
    for i in range(n):
        ph = (t * rnd.uniform(0.25, 0.5) + rnd.random()) % 1
        bx = x + rnd.uniform(-spread, spread) + 12 * math.sin(t * 3 + i)
        by = y - ph * 700
        r = rnd.uniform(4, 14)
        ell(ctx, bx, by, r, r)
        ctx.set_source_rgba(0.8, 0.95, 1, 0.5 * (1 - ph))
        ctx.set_line_width(2)
        ctx.stroke()


def bg_house(ctx, t, window_on=True):
    sky(ctx, hx("#0a0f22"), hx("#2a3050"), 800)
    stars(ctx, t, ymax=400, seed=4)
    moon(ctx, 300, 180, 50)
    treeline(ctx, 760, 160, 280, hx("#0a0f1c"), 21)
    ctx.rectangle(-800, 760, 3600, 600)
    src(ctx, hx("#101a12"))
    ctx.fill()
    # house
    ctx.rectangle(980, 380, 760, 420)
    fs(ctx, hx("#3d3a4a"), 6)
    ctx.set_line_width(2)
    ctx.set_source_rgba(0, 0, 0, 0.25)
    for k in range(14):
        ctx.move_to(980, 400 + k * 28)
        ctx.line_to(1740, 400 + k * 28)
        ctx.stroke()
    ctx.new_path()
    ctx.move_to(940, 390)
    ctx.line_to(1360, 170)
    ctx.line_to(1780, 390)
    ctx.close_path()
    fs(ctx, hx("#2a1f24"), 6)
    for wx in (1060, 1520):
        ctx.rectangle(wx, 470, 150, 170)
        on = window_on
        fs(ctx, hx("#f2c45a") if on else hx("#151820"), 6)
        ctx.move_to(wx + 75, 470)
        ctx.line_to(wx + 75, 640)
        ctx.move_to(wx, 555)
        ctx.line_to(wx + 150, 555)
        ctx.set_line_width(5)
        src(ctx, INK)
        ctx.stroke()
        if on:
            g = cairo.RadialGradient(wx + 75, 555, 20, wx + 75, 600, 400)
            g.add_color_stop_rgba(0, 1, 0.8, 0.4, 0.25)
            g.add_color_stop_rgba(1, 1, 0.8, 0.4, 0)
            ctx.set_source(g)
            ctx.rectangle(wx - 400, 300, 950, 800)
            ctx.fill()
    ctx.rectangle(1300, 560, 120, 240)
    fs(ctx, hx("#4a2c1c"), 6)
    ctx.rectangle(950, 790, 820, 30)
    fs(ctx, hx("#2b2430"), 5)


def bg_interior(ctx, t):
    sky(ctx, hx("#4a3426"), hx("#22160f"))
    for i in range(-6, 30):  # wallpaper stripes
        ctx.rectangle(i * 90, -300, 40, 1100)
        ctx.set_source_rgba(1, 0.9, 0.7, 0.05)
        ctx.fill()
    ctx.rectangle(1300, 160, 300, 380)  # night window
    fs(ctx, hx("#0c1426"), 8)
    moon(ctx, 1500, 260, 26)
    ctx.move_to(1450, 160)
    ctx.line_to(1450, 540)
    ctx.move_to(1300, 350)
    ctx.line_to(1600, 350)
    ctx.set_line_width(8)
    src(ctx, INK)
    ctx.stroke()
    # lamp glow
    g = cairo.RadialGradient(960, 500, 30, 960, 520, 900)
    g.add_color_stop_rgba(0, 1, 0.82, 0.5, 0.35)
    g.add_color_stop_rgba(1, 1, 0.82, 0.5, 0)
    ctx.set_source(g)
    ctx.rectangle(-500, -300, 3000, 1600)
    ctx.fill()


def table(ctx, t):
    ctx.rectangle(560, 780, 800, 40)
    fs(ctx, hx("#6b4428"), 5)
    for x in (600, 1300):
        ctx.rectangle(x, 820, 24, 260)
        fs(ctx, hx("#4a2e1a"), 4)
    ell(ctx, 1200, 770, 40, 14)  # mug
    rrect(ctx, 1170, 700, 60, 72, 8)
    fs(ctx, hx("#d8d2c0"), 4)
    for i in range(3):  # steam
        ctx.move_to(1185 + i * 15, 690)
        ctx.curve_to(1175 + i * 15, 660, 1200 + i * 15, 640, 1188 + i * 15, 600 - 10 * math.sin(t * 2 + i))
        ctx.set_source_rgba(1, 1, 1, 0.25)
        ctx.set_line_width(4)
        ctx.stroke()


def car(ctx, x, y, s, t, lights=True, facing=1):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * facing, s)
    if lights:
        g = cairo.LinearGradient(260, 0, 1100, 0)
        g.add_color_stop_rgba(0, 1, 0.95, 0.75, 0.5)
        g.add_color_stop_rgba(1, 1, 0.95, 0.75, 0)
        ctx.set_source(g)
        ctx.move_to(250, -70)
        ctx.line_to(1100, -260)
        ctx.line_to(1100, 120)
        ctx.line_to(250, -40)
        ctx.close_path()
        ctx.fill()
    ctx.new_path()
    ctx.move_to(-280, -20)
    ctx.line_to(-280, -90)
    ctx.curve_to(-250, -110, -150, -110, -110, -120)
    ctx.line_to(-60, -200)
    ctx.line_to(110, -200)
    ctx.line_to(170, -120)
    ctx.curve_to(230, -115, 270, -100, 280, -80)
    ctx.line_to(280, -20)
    ctx.close_path()
    fs(ctx, hx("#16171c"), 6)
    ctx.new_path()
    ctx.move_to(-40, -185)
    ctx.line_to(95, -185)
    ctx.line_to(140, -125)
    ctx.line_to(-80, -125)
    ctx.close_path()
    fs(ctx, hx("#5d6f86", 0.9), 4)
    ctx.rectangle(-280, -60, 560, 10)
    src(ctx, hx("#8a8f99"))
    ctx.fill()
    for wx in (-170, 170):
        ell(ctx, wx, -15, 52, 52)
        fs(ctx, hx("#0a0a0c"), 5)
        ell(ctx, wx, -15, 24, 24)
        fs(ctx, hx("#8a8f99"), 3)
    ell(ctx, 268, -78, 14, 16)
    fs(ctx, hx("#fff4c8"), 3)
    ctx.restore()


def muzzle(ctx, x, y, s, t):
    ctx.save()
    ctx.translate(x, y)
    rnd = random.Random(int(t * 30))
    ctx.new_path()
    for i in range(16):
        a = i * 2 * PI / 16
        r = (60 if i % 2 == 0 else 22) * s * rnd.uniform(0.7, 1.2)
        ctx.line_to(r * math.cos(a), r * math.sin(a))
    ctx.close_path()
    ctx.set_source_rgba(1, 0.85, 0.3, 0.95)
    ctx.fill_preserve()
    ctx.set_source_rgba(1, 0.5, 0.1, 0.9)
    ctx.set_line_width(4)
    ctx.stroke()
    ell(ctx, 0, 0, 16 * s, 16 * s)
    ctx.set_source_rgb(1, 1, 0.9)
    ctx.fill()
    ctx.restore()


def campfire(ctx, x, y, t, s=1.0):
    g = cairo.RadialGradient(x, y - 60, 10, x, y - 40, 700 * s)
    fl = 0.9 + 0.1 * math.sin(t * 13) * math.sin(t * 7)
    g.add_color_stop_rgba(0, 1, 0.6, 0.2, 0.5 * fl)
    g.add_color_stop_rgba(1, 1, 0.5, 0.1, 0)
    ctx.set_source(g)
    ctx.rectangle(x - 1000, y - 900, 2000, 1400)
    ctx.fill()
    for a in (-0.4, 0.4, 0):
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(a)
        rrect(ctx, -90 * s, -12 * s, 180 * s, 24 * s, 10)
        fs(ctx, hx("#4a2c18"), 4)
        ctx.restore()
    rnd = random.Random(int(t * 12))
    for col, hgt, w in ((hx("#e0461c"), 230, 80), (hx("#f79a1e"), 165, 58), (hx("#ffe27a"), 95, 32)):
        ctx.new_path()
        ctx.move_to(x - w * s, y)
        n = 5
        for i in range(n + 1):
            px = x - w * s + i * 2 * w * s / n
            tip = hgt * s * rnd.uniform(0.55, 1.0) * (1 - abs(i - n / 2) / (n / 2 + 1))
            ctx.line_to(px - 8, y - tip)
            ctx.line_to(px + 8, y - tip * 0.6)
        ctx.line_to(x + w * s, y)
        ctx.close_path()
        src(ctx, col)
        ctx.fill()
    for i in range(10):  # embers
        ph = (t * 0.6 + i * 0.13) % 1
        ex = x + 60 * math.sin(i * 3 + t) * ph
        ey = y - 120 - ph * 500
        ctx.set_source_rgba(1, 0.7, 0.2, 1 - ph)
        ell(ctx, ex, ey, 3, 3)
        ctx.fill()


# ------------------------------------------------------------------ text
def text(ctx, s, x, y, size, color, family="DejaVu Sans", outline=6, bold=True, ink=INK, anchor="c", italic=False):
    ctx.save()
    ctx.select_font_face(family, cairo.FONT_SLANT_ITALIC if italic else cairo.FONT_SLANT_NORMAL,
                         cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)
    xb, yb, w, h, xa, ya = ctx.text_extents(s)
    if anchor == "c":
        px = x - w / 2 - xb
    elif anchor == "l":
        px = x - xb
    else:
        px = x - w - xb
    py = y + size * 0.35
    ctx.new_path()
    ctx.move_to(px, py)
    ctx.text_path(s)
    if outline:
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.set_line_width(outline * 2)
        src(ctx, ink)
        ctx.stroke_preserve()
    src(ctx, color)
    ctx.fill()
    ctx.restore()
    return w


def text_width(ctx, s, size, family="DejaVu Sans", bold=True):
    ctx.save()
    ctx.select_font_face(family, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)
    w = ctx.text_extents(s)[2]
    ctx.restore()
    return w


def horror_title(ctx, s, x, y, size, t, seed=0, color=hx("#d81e1e")):
    """Dripping horror-style title."""
    w = text(ctx, s, x, y, size, color, "Liberation Serif", outline=size * 0.05, ink=hx("#1a0000"))
    rnd = random.Random(seed)
    src(ctx, color)
    for i in range(int(len(s) * 1.4)):
        dx = rnd.uniform(-w / 2, w / 2)
        L = rnd.uniform(0.1, 0.5) * size * min(1, t * 0.6 + rnd.uniform(0, 0.3))
        top = y + size * 0.3
        rrect(ctx, x + dx - size * 0.025, top, size * 0.05, L, size * 0.025)
        ctx.fill()
        ell(ctx, x + dx, top + L, size * 0.04, size * 0.045)
        ctx.fill()
    return w


def plaque(ctx, x, y, w, h, title, sub=None, s=1.0):
    """Wooden plaque lower-third."""
    rrect(ctx, x, y, w, h, 14 * s)
    fs(ctx, hx("#5b3d24"), 5 * s)
    ctx.set_line_width(2)
    ctx.set_source_rgba(0, 0, 0, 0.25)
    for k in range(4):
        yy = y + h * (k + 1) / 5
        ctx.move_to(x + 10, yy)
        ctx.curve_to(x + w * 0.3, yy - 4, x + w * 0.7, yy + 4, x + w - 10, yy)
        ctx.stroke()
    for nx in (x + 18 * s, x + w - 18 * s):
        ell(ctx, nx, y + h / 2, 6 * s, 6 * s)
        fs(ctx, hx("#a9a9a9"), 2)
    if sub:
        text(ctx, title, x + w / 2, y + h * 0.34, 26 * s, hx("#f0c070"), outline=3 * s)
        text(ctx, sub, x + w / 2, y + h * 0.7, 40 * s, hx("#f4ead2"), outline=4 * s)
    else:
        text(ctx, title, x + w / 2, y + h / 2, 42 * s, hx("#f4ead2"), outline=4 * s)
