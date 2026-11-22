#!/usr/bin/env python3
"""Generates compositions/*.html for The Year Without a Summer.
Edit beat text/timing here and re-run:  python3 build.py"""
import json, math, html, os

ROOT = os.path.dirname(os.path.abspath(__file__))
A = lambda p: os.path.join(ROOT, p)
WORDS = json.load(open(A("assets/words.json")))
LAND = json.load(open(A("assets/land.json")))
MAPD, MP = LAND["d"], LAND["P"]

SECS = {"hook": (0, 16.3), "p1": (16.3, 43.5), "p2": (43.5, 74.9), "p3": (74.9, 107.95),
        "p4": (107.95, 142.6), "close": (142.6, 160.5)}

INK, FROST, SKY, ASH, EMBER, SULF = "#10151A", "#EEF3F6", "#C9D4DA", "#4A4B4D", "#E2572B", "#E8C547"


def W(line, word, k=0):
    """start time of the k-th word in `line` that starts with `word` (case-insensitive)"""
    hits = [w for w in WORDS if w["line"] == line and w["text"].lower().strip(".,?:;'").startswith(word.lower())]
    return hits[k]["start"]


def rng(seed):
    s = seed
    while True:
        s = (s * 1103515245 + 12345) % 2147483648
        yield s / 2147483648


COMMON = f"""
.beat {{ position: absolute; inset: 0; overflow: hidden; }}
.full {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }}
.blk {{ position: absolute; left: 136px; right: 192px; top: 320px; color: {FROST}; }}
.blk.ink {{ color: {INK}; }}
.sm {{ font-family: "EB Garamond"; font-weight: 600; font-size: 44px; letter-spacing: 0.16em; text-transform: uppercase; line-height: 1.15; }}
.big {{ font-family: "Oswald"; font-weight: 700; font-size: 112px; line-height: 0.98; text-transform: uppercase; letter-spacing: 0.005em; }}
.huge {{ font-family: "Oswald"; font-weight: 700; font-size: 190px; line-height: 0.9; text-transform: uppercase; }}
.date {{ font-family: "EB Garamond"; font-weight: 600; font-size: 120px; letter-spacing: 0.04em; line-height: 1; text-transform: uppercase; }}
.sulf {{ color: {SULF}; }}
.shade {{ text-shadow: 0 2px 18px rgba(8,12,16,0.55); }}
.map {{ position: absolute; left: 0; top: 0; width: 3000px; height: 1500px; transform-origin: 0 0; }}
.lbl {{ position: absolute; font-family: "Oswald"; font-weight: 600; font-size: 40px; letter-spacing: 0.06em; color: {FROST}; text-transform: uppercase; text-shadow: 0 2px 10px rgba(0,0,0,0.7); }}
"""


class Sec:
    def __init__(self, name):
        self.name = name
        self.s0, self.s1 = SECS[name]
        self.html, self.js, self.css = [], [], []

    def t(self, a):  # absolute -> local
        return round(a - self.s0, 3)

    def beat(self, bid, a0, a1, inner, bg=None, extra=""):
        st = f' style="background:{bg}"' if bg else ""
        self.html.append(f'<div id="{bid}" class="beat clip" data-start="{self.t(a0)}" data-duration="{round(a1 - a0, 3)}"{st} {extra}>{inner}</div>')

    def add(self, s):
        self.html.append(s)

    def J(self, s):
        self.js.append(s)

    def enter(self, sel, a, frm="y:40", dur=0.32):
        k = frm.split(":")[0]
        self.J(f'tl.fromTo("{sel}",{{opacity:0,{frm}}},{{opacity:1,{k}:0,duration:{dur},ease:"power3.out"}},{self.t(a)});')

    def stamp(self, sel, a, s=1.25):
        self.J(f'tl.fromTo("{sel}",{{opacity:0,scale:{s}}},{{opacity:1,scale:1,duration:0.18,ease:"power4.out"}},{self.t(a)});')

    def tween(self, sel, a, frm, to, dur, ease="power2.inOut"):
        self.J(f'tl.fromTo("{sel}",{{{frm}}},{{{to},duration:{dur},ease:"{ease}"}},{self.t(a)});')

    def write(self):
        body = "\n".join(self.html)
        js = "\n    ".join(self.js)
        out = f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; background: {INK}; }}
    {COMMON}
    {"".join(self.css)}
  </style>
  <div id="root" data-composition-id="{self.name}" data-width="1080" data-height="1920">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {js}
    window.__timelines["{self.name}"] = tl;
  </script>
</template>
"""
        open(A(f"compositions/{self.name}.html"), "w").write(out)


def blk(inner, top=320, right=192, cls="", bid=""):
    i = f' id="{bid}"' if bid else ""
    return f'<div{i} class="blk {cls}" style="top:{top}px;right:{right}px">{inner}</div>'


# ------------------------------------------------------------------ art
def svg(inner, defs="", extra=""):
    return f'<svg class="full" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" data-layout-ignore {extra}><defs>{defs}</defs>{inner}</svg>'


def FIELD(p, warm=False):
    sky = f'<linearGradient id="{p}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FA3B0"/><stop offset="1" stop-color="#D9E1E6"/></linearGradient>'
    sun = ""
    if warm:
        sky += f'<radialGradient id="{p}-sunh" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F7DC93" stop-opacity="0.9"/><stop offset="1" stop-color="#F7DC93" stop-opacity="0"/></radialGradient>'
        rays = "".join(f'<line x1="700" y1="620" x2="{700 + 900 * math.cos(math.radians(a))}" y2="{620 + 900 * math.sin(math.radians(a))}" stroke="#F7E2A8" stroke-width="{26 - i * 2}" stroke-opacity="0.22"/>' for i, a in enumerate([100, 115, 130, 145, 160, 70, 55]))
        sun = f'<g id="{p}-sun"><g id="{p}-rays">{rays}</g><circle cx="700" cy="620" r="260" fill="url(#{p}-sunh)"/><circle cx="700" cy="620" r="84" fill="#FBE7B0"/></g>'
    furrows = "".join(f'<line x1="540" y1="905" x2="{x}" y2="1920" stroke="#C5CFD5" stroke-width="7"/>' for x in range(-1700, 2800, 200))
    posts = [(150, 1180, 20, 150), (300, 1075, 13, 100), (395, 1008, 9, 68), (458, 963, 6, 44), (497, 935, 4, 28)]
    post = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#3E3A36"/>' for x, y, w, h in posts)
    wire = " ".join(f"{x + w / 2},{y + 8 * w / 20}" for x, y, w, h in posts)
    stalks = ""
    r = rng(5)
    for i in range(22):
        x = 40 + i * 48 + next(r) * 30
        h = 260 + next(r) * 220
        lean = (next(r) - 0.5) * 60
        stalks += f'<path d="M{x:.0f} 1920 Q{x + lean / 2:.0f} {1920 - h / 2:.0f} {x + lean:.0f} {1920 - h:.0f}" stroke="#4E473F" stroke-width="7" fill="none"/>'
        stalks += f'<path d="M{x + lean * 0.6:.0f} {1920 - h * 0.62:.0f} q{30 + next(r) * 30:.0f} 20 {50 + next(r) * 40:.0f} 90" stroke="#5D554B" stroke-width="5" fill="none"/>'
    warmrect = f'<rect id="{p}-warm" width="1080" height="1920" fill="#F2C574" opacity="0"/>' if warm else ""
    inner = f'''<rect width="1080" height="1920" fill="url(#{p}-sky)"/>{sun}
<path d="M0 905 Q60 860 120 885 T260 870 T420 880 T560 866 T720 884 T880 868 T1080 882 V910 H0Z" fill="#66747C"/>
<rect y="900" width="1080" height="1020" fill="#E8EDF0"/>{furrows}
<polyline points="{wire}" fill="none" stroke="#3E3A36" stroke-width="2"/>{post}
<g id="{p}-stalks">{stalks}</g>{warmrect}'''
    return svg(inner, sky)


def SNOW(p, n, a0, a1, seed=3, color="#FFFFFF", speed=150, rmax=7):
    r = rng(seed)
    dots, js = [], []
    dur = a1 - a0
    for i in range(n):
        x = next(r) * 1080
        y0 = -speed * dur + next(r) * (1920 + speed * dur)
        rad = 2 + next(r) * rmax
        dots.append(f'<circle id="{p}-f{i}" cx="{x:.0f}" cy="{y0:.0f}" r="{rad:.1f}" fill="{color}" opacity="{0.55 + next(r) * 0.45:.2f}"/>')
        js.append((f"#{p}-f{i}", speed * (0.6 + rad / rmax * 0.6) * dur, (next(r) - 0.5) * 80))
    return svg("".join(dots)), js


def snow_js(sec, js, a0, a1):
    for sel, dy, dx in js:
        sec.tween(sel, a0, "y:0,x:0", f"y:{dy:.0f},x:{dx:.0f}", round(a1 - a0, 3), "none")


def VOLCANO(p, column=True, night=False):
    top, bot = ("#2A2422", "#5A4A40") if night else ("#3B3431", "#6B5D54")
    defs = f'<linearGradient id="{p}-vs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/></linearGradient>'
    col = ""
    if column:
        r = rng(11)
        puffs = ""
        for i in range(34):
            y = 940 - i * 24 - next(r) * 20
            spread = 40 + i * 9
            x = 540 + (next(r) - 0.5) * spread * 1.6
            rad = 60 + i * 4 + next(r) * 40
            shade = ["#8B847F", "#77706B", "#9C958F", "#6A6460"][i % 4]
            puffs += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rad:.0f}" fill="{shade}"/>'
        col = f'<g id="{p}-col">{puffs}</g>'
    lava = f'<path d="M505 965 L575 965 L600 1010 L560 990 L540 1060 L520 995 L478 1020 Z" fill="{EMBER}"/><path d="M520 990 Q470 1120 420 1240" stroke="{EMBER}" stroke-width="10" fill="none"/><path d="M565 995 Q620 1100 690 1200" stroke="{EMBER}" stroke-width="8" fill="none"/>' if column else ""
    inner = f'''<rect width="1080" height="1920" fill="url(#{p}-vs)"/>{col}
<path d="M-60 1520 L320 1160 L470 975 L610 975 L760 1150 L1140 1520 Z" fill="#231D1B"/>
<path d="M470 975 L540 1010 L610 975 L640 1015 L560 1040 L520 1040 L440 1015 Z" fill="#171312"/>{lava}
<rect y="1500" width="1080" height="420" fill="#1B242B"/>
<path d="M0 1560 H1080 M0 1640 H1080 M0 1740 H1080" stroke="#26323A" stroke-width="6"/>'''
    return svg(inner, defs)


def MAP(p, ocean="#1B2A35", land="#6D7C80", over=""):
    return f'<div id="{p}-m" class="map" data-layout-ignore><svg width="3000" height="1500" viewBox="0 0 3000 1500"><rect width="3000" height="1500" fill="{ocean}"/><path d="{MAPD}" fill="{land}"/>{over}</svg></div>'


def cam(s, pt, cx=504, cy=760):
    px, py = MP[pt] if isinstance(pt, str) else pt
    return f"x:{cx - px * s:.1f},y:{cy - py * s:.1f},scale:{s}"


def scr(s, pt, ref, cx=504, cy=760):
    """screen position of map point pt when camera centres ref at scale s"""
    px, py = MP[pt]
    rx, ry = MP[ref]
    return cx + (px - rx) * s, cy + (py - ry) * s


def ATMOS(p, droplets=False, rays=None, coldground=False):
    defs = f'<linearGradient id="{p}-as" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0C141C"/><stop offset="0.55" stop-color="#25404F"/><stop offset="1" stop-color="#7C98A8"/></linearGradient>'
    defs += f'<marker id="{p}-ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="{SULF}"/></marker>'
    ground = "#B9C6CC" if coldground else "#4F5D45"
    band = f'<rect x="0" y="690" width="1080" height="190" fill="#9FB4C0" opacity="0.10"/><line x1="0" y1="690" x2="1080" y2="690" stroke="#9FB4C0" stroke-width="2" stroke-dasharray="14 12" opacity="0.6"/><line x1="0" y1="880" x2="1080" y2="880" stroke="#9FB4C0" stroke-width="2" stroke-dasharray="14 12" opacity="0.6"/>'
    labels = f'<text x="1040" y="735" text-anchor="end" font-family="Oswald" font-weight="600" font-size="34" letter-spacing="3" fill="#B7C6CF">STRATOSPHERE</text><text x="1040" y="1260" text-anchor="end" font-family="Oswald" font-weight="600" font-size="34" letter-spacing="3" fill="#D0DBE1">TROPOSPHERE</text>'
    earth = f'<circle cx="540" cy="3500" r="2000" fill="{ground}"/><circle cx="540" cy="3500" r="2000" fill="none" stroke="#A9C3D2" stroke-width="18" opacity="0.35"/>'
    volc = f'<path d="M190 1505 L270 1420 L300 1420 L380 1508 Z" fill="#2A2422"/>'
    plume = f'<path id="{p}-plume" d="M285 1420 C 260 1250, 330 1100, 290 950 C 270 860, 300 800, 300 760" stroke="#8B847F" stroke-width="44" fill="none" stroke-linecap="round" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/>'
    drops = ""
    if droplets:
        r = rng(21)
        for i in range(70):
            x = 20 + next(r) * 1040
            y = 710 + next(r) * 150
            drops += f'<circle class="{p}-d" cx="{x:.0f}" cy="{y:.0f}" r="{4 + next(r) * 5:.1f}" fill="{SULF}"/>'
        drops = f'<g id="{p}-drops">{drops}</g>'
    rs = ""
    for i, (x, kind) in enumerate(rays or []):
        if kind == "bounce":
            d = f"M{x} 470 L{x + 60} 760 L{x + 120} 480"
        else:
            d = f"M{x} 470 L{x + 130} 1330"
        rs += f'<path id="{p}-r{i}" d="{d}" stroke="{SULF}" stroke-width="8" fill="none" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110" marker-end="url(#{p}-ah)"/>'
    inner = f'<rect width="1080" height="1920" fill="url(#{p}-as)"/><g transform="translate(0 130)">{band}{labels}{earth}{volc}{plume}{drops}{rs}</g>'
    return svg(inner, defs)


def CORN(p, dead=False):
    sky = "#9AA8B0" if not dead else "#8F8A80"
    stalk, leaf, frost = ("#5E6E66", "#6F8076", "#F4F8FA") if not dead else ("#5A4C3A", "#6D5B43", "#D9D2C4")
    r = rng(7 if not dead else 9)
    rows = ""
    for row in range(4):
        y0 = 1040 + row * 230
        sc = 0.6 + row * 0.35
        for i in range(-1, 9):
            x = i * 140 * sc + (row % 2) * 60 + next(r) * 30
            h = 420 * sc + next(r) * 80
            bend = (next(r) - 0.3) * 120 * (1.4 if dead else 0.5)
            g = f'<path d="M{x:.0f} {y0 + 200} Q{x + bend / 3:.0f} {y0 + 200 - h / 2:.0f} {x + bend:.0f} {y0 + 200 - h:.0f}" stroke="{stalk}" stroke-width="{9 * sc:.1f}" fill="none"/>'
            for k in range(3):
                ly = y0 + 200 - h * (0.3 + k * 0.2)
                dirn = 1 if k % 2 == 0 else -1
                g += f'<path d="M{x + bend * (0.3 + k * 0.2):.0f} {ly:.0f} q{dirn * 70 * sc:.0f} {-30 * sc:.0f} {dirn * 140 * sc:.0f} {(60 if dead else 20) * sc:.0f}" stroke="{leaf}" stroke-width="{7 * sc:.1f}" fill="none" stroke-linecap="round"/>'
                g += f'<circle cx="{x + bend * (0.3 + k * 0.2) + dirn * 140 * sc:.0f}" cy="{ly + (60 if dead else 20) * sc:.0f}" r="{5 * sc:.1f}" fill="{frost}"/>'
            rows += g
    inner = f'<rect width="1080" height="1920" fill="{sky}"/><rect y="1000" width="1080" height="920" fill="{"#D7DEE2" if not dead else "#7A6F5F"}"/>{rows}'
    if not dead:
        inner += '<rect width="1080" height="1920" fill="#DDE8EE" opacity="0.18"/>'
    return svg(inner)


def FARMHOUSE(p):
    trees = "".join(f'<path d="M{x} 1080 V{1080 - h} M{x} {1080 - h * 0.6} l-40 -50 M{x} {1080 - h * 0.45} l45 -60 M{x} {1080 - h * 0.8} l30 -40" stroke="#3B3632" stroke-width="7" fill="none"/>' for x, h in [(110, 300), (190, 230), (900, 340), (980, 260)])
    inner = f'''<rect width="1080" height="1920" fill="#A7B3BA"/>
<path d="M0 1000 Q300 960 600 990 T1080 975 V1920 H0 Z" fill="#EEF2F4"/>{trees}
<rect x="300" y="760" width="380" height="300" fill="#E9E4D8"/>
<path d="M270 770 L490 600 L710 770 Z" fill="#5A5048"/><path d="M262 775 L490 594 L718 775 L700 790 L490 625 L280 790 Z" fill="#FBFCFD"/>
<rect x="600" y="620" width="40" height="110" fill="#6B5A4E"/><rect x="594" y="612" width="52" height="16" fill="#FBFCFD"/>
<g fill="#3D4A55"><rect x="340" y="820" width="70" height="90"/><rect x="570" y="820" width="70" height="90"/><rect x="455" y="930" width="70" height="130"/></g>
<path d="M300 1055 H680 V1070 H300 Z" fill="#FBFCFD"/>
<rect x="720" y="860" width="230" height="200" fill="#8E3B2E"/><path d="M700 870 L835 770 L970 870 Z" fill="#FBFCFD"/><rect x="805" y="950" width="60" height="110" fill="#5E261E"/>
<path d="M0 1120 Q400 1090 1080 1130 V1920 H0 Z" fill="#F7F9FA"/>'''
    return svg(inner)


def BREAD(p):
    defs = f'<marker id="{p}-ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="{SULF}"/></marker>'
    inner = f'''<rect width="1080" height="1920" fill="#2B2420"/>
<g transform="translate(0 420)"><rect y="1060" width="1080" height="860" fill="#5B4636"/><path d="M0 1060 H1080" stroke="#3A2D24" stroke-width="10"/>
<g id="{p}-loaf"><ellipse cx="420" cy="1050" rx="250" ry="34" fill="#22190F" opacity="0.5"/>
<path d="M190 1040 C190 880, 650 880, 650 1040 Z" fill="#B07A3E"/><path d="M200 1040 C210 930, 640 930, 640 1040" fill="#C18B4C"/>
<path d="M300 940 q20 40 0 80 M380 925 q20 45 0 95 M460 925 q20 45 0 95 M540 940 q20 40 0 80" stroke="#8A5A2B" stroke-width="10" fill="none" stroke-linecap="round"/></g></g><g transform="translate(0 200)">
<g stroke="#8D8178" stroke-width="4"><line x1="140" y1="780" x2="860" y2="780"/><line x1="140" y1="780" x2="140" y2="420"/></g>
<path id="{p}-line" d="M150 760 L260 750 L360 735 L450 700 L540 640 L620 590 L700 500 L780 440 L850 380" stroke="{SULF}" stroke-width="12" fill="none" stroke-linejoin="round" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110" marker-end="url(#{p}-ah)"/>
<text x="140" y="830" font-family="Oswald" font-weight="600" font-size="34" letter-spacing="3" fill="#B9ADA2">1815</text><text x="860" y="830" text-anchor="end" font-family="Oswald" font-weight="600" font-size="34" letter-spacing="3" fill="#B9ADA2">1816–17</text></g>'''
    return svg(inner, defs)


def VILLAGE(p):
    houses = ""
    for i, (x, w, h) in enumerate([(-20, 220, 200), (210, 180, 240), (400, 240, 190), (650, 200, 230), (860, 240, 210)]):
        y = 1020 - h
        houses += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#3A3F44"/><path d="M{x - 15} {y + 5} L{x + w / 2} {y - 90} L{x + w + 15} {y + 5} Z" fill="#2B2F33"/><rect x="{x + w * 0.35}" y="{y + h * 0.4}" width="36" height="44" fill="#6C6A5E"/>'
    figs = ""
    for i, (x, s) in enumerate([(260, 1.0), (380, 0.92), (640, 1.08)]):
        figs += f'<g id="{p}-fig{i}" transform="translate({x} 1210) scale({s})"><circle cx="0" cy="-150" r="20" fill="#1E2226"/><path d="M-26 -126 L26 -126 L36 -30 L-36 -30 Z" fill="#1E2226"/><path d="M-16 -30 L-24 40 M16 -30 L26 40" stroke="#1E2226" stroke-width="14"/><path d="M30 -110 L44 -20" stroke="#1E2226" stroke-width="8"/></g>'
    inner = f'''<rect width="1080" height="1920" fill="#5E6A72"/><rect y="1010" width="1080" height="910" fill="#4A4A44"/>
{houses}<path d="M0 1120 Q540 1080 1080 1130 V1300 H0 Z" fill="#5C5A50"/><path d="M80 1200 Q300 1180 520 1210" stroke="#6E7378" stroke-width="12" fill="none" opacity="0.6"/>{figs}'''
    return svg(inner)


def RAIN(p, n, a0, a1, seed=4, angle=12):
    r = rng(seed)
    lines, js = [], []
    dur = a1 - a0
    sp = 1400
    for i in range(n):
        x = next(r) * 1200 - 60
        y0 = -sp * dur * 0.35 + next(r) * 1920 - 400
        L = 50 + next(r) * 70
        lines.append(f'<line id="{p}-r{i}" x1="{x:.0f}" y1="{y0:.0f}" x2="{x - L * math.tan(math.radians(angle)):.0f}" y2="{y0 + L:.0f}" stroke="#C9D6DE" stroke-width="3" opacity="{0.25 + next(r) * 0.35:.2f}"/>')
        js.append((f"#{p}-r{i}", sp * dur * (0.25 + next(r) * 0.15)))
    return svg("".join(lines)), js


def rain_js(sec, js, a0, a1, angle=12):
    for sel, dy in js:
        sec.tween(sel, a0, "y:0,x:0", f"y:{dy:.0f},x:{-dy * math.tan(math.radians(angle)):.0f}", round(a1 - a0, 3), "none")


def WINDOW(p):
    inner = f'''<rect width="1080" height="1920" fill="#2A211B"/>
<rect x="150" y="300" width="780" height="1060" fill="#2C3C47"/>
<path d="M150 1000 Q400 960 600 990 T930 970 V1360 H150 Z" fill="#22303A"/>
<g stroke="#4A3828" fill="none"><rect x="150" y="300" width="780" height="1060" stroke-width="40"/><line x1="540" y1="300" x2="540" y2="1360" stroke-width="22"/><line x1="150" y1="830" x2="930" y2="830" stroke-width="22"/></g>
<rect x="110" y="1360" width="860" height="50" fill="#5A4430"/>
<rect width="1080" height="1920" fill="#F0B86A" opacity="0.06"/>'''
    return svg(inner)


def VILLA(p):
    defs = f'<linearGradient id="{p}-vs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E3644"/><stop offset="0.6" stop-color="#6F6467"/><stop offset="1" stop-color="#A9846E"/></linearGradient>'
    win = "".join(f'<rect x="{x}" y="{y}" width="26" height="40" fill="#E8B55A"/>' for x in (430, 480, 560, 610) for y in (800, 870))
    cols = "".join(f'<rect x="{x}" y="930" width="12" height="70" fill="#C9BBA6"/>' for x in range(410, 680, 45))
    inner = f'''<rect width="1080" height="1920" fill="url(#{p}-vs)"/>
<path d="M0 860 L140 700 L260 790 L420 620 L560 760 L700 650 L860 780 L1080 690 V1000 H0 Z" fill="#3B4250"/>
<path d="M0 930 L200 840 L380 900 L600 820 L820 900 L1080 850 V1000 H0 Z" fill="#2C323D"/>
<rect x="380" y="760" width="320" height="240" fill="#D8CBB6"/><path d="M360 765 L540 690 L720 765 Z" fill="#5C4E46"/>{win}{cols}
<rect x="370" y="1000" width="340" height="16" fill="#B5A792"/>
<path d="M0 1000 H1080 V1920 H0 Z" fill="#3A4652"/>
<g id="{p}-refl" opacity="0.5"><rect x="430" y="1030" width="26" height="70" fill="#E8B55A" opacity="0.5"/><rect x="560" y="1040" width="26" height="60" fill="#E8B55A" opacity="0.45"/><rect x="610" y="1030" width="26" height="80" fill="#E8B55A" opacity="0.4"/></g>
<path d="M0 1080 H1080 M0 1150 H1080 M0 1260 H1080" stroke="#45525F" stroke-width="5"/>'''
    return svg(inner, defs)


def CANDLE(p, cx=440, base=1090, scale=1.0):
    inner = f'''<rect width="1080" height="1920" fill="#1B1510"/>
<g stroke="#241C15" stroke-width="6">{"".join(f'<line x1="{x}" y1="0" x2="{x}" y2="1100"/>' for x in range(60, 1080, 160))}</g>
<rect y="{base}" width="1080" height="{1920 - base}" fill="#3A281A"/><rect y="{base}" width="1080" height="14" fill="#4E3725"/>
<radialGradient id="{p}-cg" cx="{cx}" cy="{base - 240 * scale}" r="{520 * scale}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F2B65E" stop-opacity="0.38"/><stop offset="1" stop-color="#F2B65E" stop-opacity="0"/></radialGradient>
<rect width="1080" height="1920" fill="url(#{p}-cg)"/>
<g transform="translate({cx} {base}) scale({scale})">
<ellipse cx="0" cy="0" rx="90" ry="16" fill="#7A6A55"/><rect x="-26" y="-210" width="52" height="210" fill="#EFE6D2"/><path d="M-26 -210 q12 22 0 50" stroke="#D9CEB6" stroke-width="8" fill="none"/>
<line x1="0" y1="-210" x2="0" y2="-232" stroke="#2A221B" stroke-width="5"/>
<path id="{p}-flame" d="M0 -300 C 22 -262, 20 -240, 0 -228 C -20 -240, -22 -262, 0 -300 Z" fill="#F6C66B"/><path d="M0 -268 C 8 -252, 7 -242, 0 -236 C -7 -242, -8 -252, 0 -268 Z" fill="#FFF4D6"/></g>'''
    return svg(inner)


def flicker(sec, p, a0, a1):
    n = int((a1 - a0) / 0.4)
    sec.J(f'tl.fromTo("#{p}-flame",{{scaleY:1,scaleX:1,transformOrigin:"50% 100%"}},{{scaleY:1.12,scaleX:0.92,duration:0.2,ease:"sine.inOut",yoyo:true,repeat:{n * 2 - 1}}},{sec.t(a0)});')


def PAPER(p):
    lines = "".join(f'<path id="{p}-l{i}" d="M250 {640 + i * 70} q80 -14 160 0 t160 0 t160 0" stroke="#3A3127" stroke-width="5" fill="none" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/>' for i in range(5))
    inner = f'''<rect width="1080" height="1920" fill="#1B1510"/><rect y="1100" width="1080" height="820" fill="#3A281A"/>
<g transform="translate(0 150)"><g transform="rotate(-4 540 800)"><rect x="200" y="520" width="640" height="560" fill="#E9DFC8"/><rect x="200" y="520" width="640" height="560" fill="none" stroke="#C9BC9E" stroke-width="4"/>{lines}</g>
<g id="{p}-quill" transform="translate(760 560) rotate(30)"><path d="M0 0 C 40 -120, 120 -260, 200 -330 C 150 -220, 90 -110, 0 0 Z" fill="#F2EEE4"/><path d="M0 0 L190 -320" stroke="#B9AE98" stroke-width="4"/><path d="M0 0 L-14 30" stroke="#2A221B" stroke-width="6"/></g></g>
<rect width="1080" height="1920" fill="#F2B65E" opacity="0.07"/>'''
    return svg(inner)


def BOOK(p):
    t = lambda y, s, size, ls=6, w=600: f'<text x="540" y="{y}" text-anchor="middle" font-family="EB Garamond" font-weight="{w}" font-size="{size}" letter-spacing="{ls}" fill="#2A241D">{s}</text>'
    inner = f'''<rect width="1080" height="1920" fill="#1F1812"/><g transform="translate(0 175)">
<rect x="190" y="430" width="700" height="760" fill="#E6DAC0"/><rect x="215" y="455" width="650" height="710" fill="none" stroke="#8C7B60" stroke-width="3"/>
{t(560, "FRANKENSTEIN;", 62, 5, 700)}{t(620, "OR,", 30)}{t(690, "THE MODERN PROMETHEUS.", 42, 3)}
<line x1="380" y1="740" x2="700" y2="740" stroke="#5A4D3C" stroke-width="2"/>
{t(810, "IN THREE VOLUMES.", 30)}{t(860, "VOL. I.", 28)}
<line x1="420" y1="910" x2="660" y2="910" stroke="#5A4D3C" stroke-width="2"/>
{t(1020, "London:", 30, 4, 500)}{t(1070, "1818.", 34)}
<rect x="190" y="430" width="700" height="760" fill="#5A3E1E" opacity="0.08"/></g>'''
    return svg(inner)


def STORM(p):
    bolt = f'<polyline id="{p}-bolt" points="640,180 560,520 650,520 520,900 610,900 470,1250" fill="none" stroke="#F6F1D8" stroke-width="16" stroke-linejoin="miter" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/>'
    inner = f'''<rect width="1080" height="1920" fill="#141A20"/>
<path d="M0 0 H1080 V420 Q900 360 760 420 T480 400 T200 430 T0 400 Z" fill="#232C34"/>
<path d="M0 1320 L200 1200 L340 1260 L520 1150 L700 1250 L880 1180 L1080 1280 V1920 H0 Z" fill="#0C1014"/>{bolt}
<rect id="{p}-flash" width="1080" height="1920" fill="#F4F1E6" opacity="0"/>'''
    return svg(inner)


def THERMO(p):
    ticks = "".join(f'<line x1="610" y1="{y}" x2="{650 if i % 2 == 0 else 635}" y2="{y}" stroke="#9AA9B2" stroke-width="4"/>' for i, y in enumerate(range(420, 1000, 48)))
    inner = f'''<rect width="1080" height="1920" fill="#16212B"/><g transform="translate(240 0)">
<rect x="500" y="380" width="100" height="660" rx="50" fill="#E6EDF1"/><circle cx="550" cy="1080" r="95" fill="#E6EDF1"/>
<circle cx="550" cy="1080" r="72" fill="{EMBER}"/><rect id="{p}-merc" x="528" y="520" width="44" height="560" fill="{EMBER}"/>{ticks}</g>'''
    return svg(inner)


def GLOBE(p):
    s = 0.42
    w, h = 3000 * s, 1500 * s
    defs = f'<clipPath id="{p}-clip"><circle cx="504" cy="820" r="280"/></clipPath><radialGradient id="{p}-sh" cx="0.38" cy="0.35" r="0.75"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>'
    tile = lambda dx: f'<g transform="translate({dx} 0) scale({s})"><rect width="3000" height="1500" fill="#1B2A35"/><path d="{MAPD}" fill="#6D7C80"/></g>'
    tx, ty = MP["tambora"]
    inner = f'''<rect width="1080" height="1920" fill="#0E1318"/>
<g clip-path="url(#{p}-clip)"><g id="{p}-spin" transform="translate(0 {820 - 750 * s:.0f})">{tile(0)}{tile(w)}{tile(-w)}
<circle id="{p}-pin" cx="{tx * s:.1f}" cy="{ty * s:.1f}" r="12" fill="{SULF}"/></g></g>
<circle cx="504" cy="820" r="280" fill="url(#{p}-sh)"/><circle cx="504" cy="820" r="280" fill="none" stroke="#3B4A55" stroke-width="4"/>'''
    return svg(inner, defs), s


def CHAIN_ARROW(i):
    return f'<svg id="cl-ar{i}" width="60" height="70" viewBox="0 0 60 70" style="display:block;margin:6px 0 6px 18px"><path d="M30 0 V52 M12 36 L30 58 L48 36" stroke="{SULF}" stroke-width="8" fill="none"/></svg>'


# ================================================================== HOOK
S = Sec("hook")
a = S.s0
field = FIELD("hk-a")
snow, snowjs = SNOW("hk-sn", 70, 0, 5.4)
S.beat("hk-a", 0, 5.4, f'<div id="hk-a-cam" class="beat">{field}</div>{snow}<div id="hk-black" class="beat" style="background:#000"></div>'
       + blk(f'<div id="hk-date" class="date">June 1816.</div><div id="hk-snow" class="huge">Snow.</div>', top=330, cls="shade"))
S.tween("#hk-a-cam", 0, "scale:1.0", "scale:1.14", 5.4, "power1.inOut")
S.tween("#hk-black", 0.6, "opacity:1", "opacity:0", 1.0, "power2.inOut")
snow_js(S, snowjs, 0, 5.4)
S.stamp("#hk-snow", W(0, "snowed") - 0.05)
S.css.append("#hk-a-cam{transform-origin:50% 60%}")

S.beat("hk-b", 5.4, W(2, "The"), CORN("hk-b", dead=True) + '<div class="beat" style="background:#0B0E11;opacity:0.35"></div>' + blk(f'<div id="hk-b1" class="big">Crops failed</div><div id="hk-b2" class="big" style="color:#F2E6D0">People starved</div>', cls="shade"))
S.enter("#hk-b1", W(1, "Crops"), "x:-50")
S.enter("#hk-b2", W(1, "starved") - 0.1, "x:-50")

c0 = W(2, "The")
S.beat("hk-c", c0, W(2, "other") - 0.25, VOLCANO("hk-c", column=False, night=True) + blk(f'<div id="hk-c1" class="sm">The cause was</div><div id="hk-c2" class="huge">A mountain</div>', cls="shade"))
S.enter("#hk-c1", c0, "y:30")
S.enter("#hk-c2", W(2, "mountain") - 0.05, "y:50")
S.tween("#hk-c svg", c0, "scale:1.0", "scale:1.08", round(W(2, "other") - 0.25 - c0, 3), "none")

g, gs = GLOBE("hk-d")
d0 = W(2, "other") - 0.25
S.beat("hk-d", d0, 16.3, g + blk(f'<div id="hk-d1" class="sm">On the other side of</div><div id="hk-d2" class="big">The planet</div>', cls="shade"))
S.tween("#hk-d-spin", d0, f"x:{504 - MP['newengland'][0] * gs:.0f}", f"x:{504 - MP['tambora'][0] * gs:.0f}", 1.8, "power2.inOut")
S.enter("#hk-d1", d0 + 0.1, "y:30")
S.enter("#hk-d2", W(2, "planet") - 0.1, "y:40")
S.stamp("#hk-d-pin", d0 + 1.75, 2.2)
S.write()

# ================================================================== P1
S = Sec("p1")
S.beat("p1-a", 16.3, 20.42, VOLCANO("p1-a", column=False, night=True) + '<div class="beat" style="background:#0B0E11;opacity:0.72"></div>' + blk('<div id="p1-a1" class="date" style="font-size:150px">April</div><div id="p1-a2" class="huge">1815</div>', top=520))
S.enter("#p1-a1", W(3, "April") - 0.1, "y:30")
S.enter("#p1-a2", W(3, "1815") - 0.05, "y:50")

over = f'<circle id="p1-b-pin" cx="{MP["tambora"][0]}" cy="{MP["tambora"][1]}" r="6" fill="{SULF}"/><circle id="p1-b-ring" cx="{MP["tambora"][0]}" cy="{MP["tambora"][1]}" r="16" fill="none" stroke="{SULF}" stroke-width="3"/>'
S.beat("p1-b", 20.42, W(4, "Mount") - 0.3, MAP("p1-b", over=over) + blk('<div id="p1-b1" class="sm">The island of</div><div id="p1-b2" class="big">Sumbawa</div><div id="p1-b3" class="sm" style="margin-top:18px">Now Indonesia</div>', cls="shade"), bg="#1B2A35")
S.tween("#p1-b-m", 20.42, cam(4.0, "tambora"), cam(7.0, "tambora"), round(W(4, "Mount") - 0.3 - 20.42, 3), "power1.inOut")
S.enter("#p1-b1", 20.45, "y:30")
S.enter("#p1-b2", W(4, "Sumbawa") - 0.05, "y:40")
S.enter("#p1-b3", W(4, "Indonesia") - 0.05, "y:30")

c0 = W(4, "Mount") - 0.3
S.beat("p1-c", c0, 26.24, VOLCANO("p1-c") + blk('<div id="p1-c1" class="big">Mount Tambora</div><div id="p1-c2" class="sm">April 1815</div>', cls="shade"))
S.tween("#p1-c-col", c0 + 0.1, "scaleY:0.05,scaleX:0.4,transformOrigin:'50% 100%'", "scaleY:1,scaleX:1", 1.8, "power2.out")
S.enter("#p1-c1", W(4, "Mount") - 0.05, "y:40")
S.enter("#p1-c2", W(4, "Tambora") + 0.1, "y:30")

S.beat("p1-d", 26.24, 29.97, f'<div id="p1-d-cam" class="beat">{VOLCANO("p1-d")}</div>' + blk('<div id="p1-d1" class="sm">The largest eruption</div><div id="p1-d2" class="big">In recorded history</div>', cls="shade"))
S.tween("#p1-d-cam", 26.24, "scale:1.0,y:0", "scale:1.25,y:260", 3.73, "power1.inOut")
S.css.append("#p1-d-cam{transform-origin:50% 30%}")
S.enter("#p1-d1", W(5, "largest") - 0.1, "y:30")
S.enter("#p1-d2", W(5, "recorded") - 0.1, "y:40")

tx, ty = MP["tambora"]
rings = "".join(f'<circle id="p1-e-w{i}" cx="{tx}" cy="{ty}" r="121" fill="none" stroke="{SULF}" stroke-width="{3 - i * 0.6:.1f}" opacity="{0.9 - i * 0.25:.2f}"/>' for i in range(3))
S.beat("p1-e", 29.97, 34.6, MAP("p1-e", over=rings + f'<circle cx="{tx}" cy="{ty}" r="5" fill="{SULF}"/>') + blk('<div id="p1-e1" class="sm">The blast was heard</div><div id="p1-e2" class="big"><span class="sulf">1,000+</span> miles away</div>', cls="shade"), bg="#1B2A35")
S.tween("#p1-e-m", 29.97, cam(2.2, "tambora", cy=820), cam(2.0, "tambora", cy=820), 4.6, "none")
for i in range(3):
    S.J(f'tl.fromTo("#p1-e-w{i}",{{scale:0.02,svgOrigin:"{tx} {ty}"}},{{scale:1,duration:2.2,ease:"power2.out"}},{S.t(30.3 + i * 0.5)});')
S.enter("#p1-e1", 30.0, "y:30")
S.enter("#p1-e2", W(6, "thousand") - 0.15, "y:40")

f0 = 34.6
S.beat("p1-f", f0, W(8, "and") - 0.0, svg(f'<rect width="1080" height="1920" fill="#C9D4DA"/><circle cx="540" cy="620" r="90" fill="#F8E7B4"/><rect y="1100" width="1080" height="820" fill="#7C8A80"/>') +
       f'<div id="p1-f-ash" class="beat" style="background:linear-gradient(#0E0F10,#2E2B29 70%,#4A4542)"></div>' + blk('<div id="p1-f1" class="sm">Ash turned</div><div id="p1-f2" class="big">Day into night</div>', cls="shade"))
S.tween("#p1-f-ash", f0 + 0.2, "clipPath:'inset(0% 0% 100% 0%)'", "clipPath:'inset(0% 0% 0% 0%)'", 1.4, "power2.inOut")
S.enter("#p1-f1", f0 + 0.05, "y:30")
S.enter("#p1-f2", W(7, "day") - 0.05, "y:40")

g0 = W(8, "and")
S.beat("p1-g", g0, 41.0, f'<div id="p1-g-cam" class="beat">{VOLCANO("p1-g", night=True)}</div>' + '<div class="beat" style="background:#0B0E11;opacity:0.35"></div>' +
       blk('<div id="p1-g1" class="sm">Roughly</div><div class="huge"><span id="p1-g-n">0</span></div><div id="p1-g2" class="big" style="font-size:80px">cubic km of material</div>', cls="shade"))
S.tween("#p1-g-cam", g0, "scale:1.0", "scale:1.1", round(41.0 - g0, 3), "none")
S.enter("#p1-g1", W(8, "roughly") - 0.1, "y:30")
S.J(f'const p1n={{v:0}}; tl.fromTo(p1n,{{v:0}},{{v:150,duration:1.3,ease:"power2.out",onUpdate:()=>{{const e=document.querySelector("#p1-g-n"); if(e) e.textContent=Math.round(p1n.v);}}}},{S.t(W(8, "150") - 0.6)});')
S.J('tl.set("#p1-g-n",{textContent:"0"},0);')
S.enter("#p1-g2", W(8, "cubic") - 0.05, "y:30")

eu = f'<circle id="p1-h-eu" cx="{MP["europe"][0]}" cy="{MP["europe"][1]}" r="18" fill="none" stroke="{SULF}" stroke-width="6"/><circle cx="{tx}" cy="{ty}" r="14" fill="{SULF}"/>'
S.beat("p1-h", 41.0, 43.5, MAP("p1-h", over=eu) + blk('<div id="p1-h1" class="big">Into the sky</div>', cls="shade"), bg="#1B2A35")
S.tween("#p1-h-m", 41.0, cam(2.0, "tambora"), cam(0.36, (1500, 600), cy=780), 2.2, "power2.inOut")
S.enter("#p1-h1", W(8, "into") - 0.1, "y:40")
S.write()

# ================================================================== P2
S = Sec("p2")
ash, ashjs = SNOW("p2-ash", 60, 43.5, 48.63, seed=8, color="#8E8984", speed=90, rmax=5)
S.beat("p2-a", 43.5, 48.63, VOLCANO("p2-a", column=False) + ash + '<div class="beat" style="background:#0B0E11;opacity:0.35"></div>' +
       blk('<div id="p2-a0" class="sm">Thousands died in</div><div id="p2-a1" class="big">The blast</div><div id="p2-a2" class="big">The tsunamis</div><div id="p2-a3" class="big">The falling ash</div>', cls="shade"))
snow_js(S, ashjs, 43.5, 48.63)
S.enter("#p2-a0", W(9, "Thousands") - 0.05, "y:30")
S.enter("#p2-a1", W(9, "blast") - 0.1, "x:-40")
S.enter("#p2-a2", W(9, "tsunamis") - 0.1, "x:-40")
S.enter("#p2-a3", W(9, "falling") - 0.1, "x:-40")

bowl = svg('<rect width="1080" height="1920" fill="#2A2522"/><g transform="translate(0 420)"><rect y="1020" width="1080" height="900" fill="#4A3B30"/><ellipse cx="460" cy="1010" rx="230" ry="40" fill="#1E1814" opacity="0.5"/><path d="M240 900 Q250 1010 460 1010 Q670 1010 680 900 Z" fill="#9C8F7E"/><ellipse cx="460" cy="900" rx="220" ry="40" fill="#BDB2A2"/><ellipse cx="460" cy="902" rx="190" ry="28" fill="#7E7365"/><path d="M700 960 l140 -40" stroke="#8C8378" stroke-width="12" stroke-linecap="round"/></g>')
S.beat("p2-b", 48.63, 52.46, bowl + blk('<div id="p2-b1" class="big">Famine &amp; disease</div><div id="p2-b0" class="sm" style="margin-top:20px">killed an estimated</div><div id="p2-b2" class="big">Tens of thousands more</div>', cls="shade"))
S.enter("#p2-b1", W(10, "Famine") - 0.05, "y:40")
S.enter("#p2-b0", W(10, "killed") - 0.05, "y:30")
S.enter("#p2-b2", W(10, "tens") - 0.1, "y:40")

S.beat("p2-c", 52.46, 55.71, svg('<rect width="1080" height="1920" fill="#BFCBD2"/><ellipse cx="300" cy="1300" rx="420" ry="70" fill="#D3DCE1"/><ellipse cx="820" cy="1450" rx="380" ry="60" fill="#D3DCE1"/>') +
       blk('<div id="p2-c1" class="sm">But the most powerful damage was</div>' + '<div class="huge" style="font-size:150px;white-space:nowrap">' + "".join(f'<span class="p2-ch" style="display:inline-block">{c}</span>' for c in "INVISIBLE") + '</div>', cls="ink"))
S.enter("#p2-c1", 52.5, "y:30")
S.enter("#p2-c .huge", W(11, "invisible") - 0.05, "y:40")
S.J(f'tl.fromTo("#p2-c .p2-ch",{{opacity:1}},{{opacity:0.12,duration:0.5,stagger:0.08,ease:"power2.in"}},{S.t(W(11, "invisible") + 0.7)});')

S.beat("p2-d", 55.71, 60.12, ATMOS("p2-d") + blk('<div id="p2-d1" class="sm sulf">Sulfur dioxide</div><div id="p2-d2" class="big">Up into the stratosphere</div>', cls="shade"))
S.tween("#p2-d-plume", 55.9, "strokeDashoffset:110", "strokeDashoffset:0", 2.8, "power2.inOut")
S.enter("#p2-d1", W(12, "sulfur") - 0.1, "y:30")
S.enter("#p2-d2", W(12, "stratosphere") - 0.3, "y:40")

tx, ty = MP["tambora"]
haze = f'<defs><radialGradient id="p2-e-hz"><stop offset="0" stop-color="{SULF}" stop-opacity="0.75"/><stop offset="1" stop-color="{SULF}" stop-opacity="0"/></radialGradient></defs>' + "".join(
    f'<ellipse id="p2-e-h{i}" cx="{tx + dx}" cy="{ty}" rx="700" ry="300" fill="url(#p2-e-hz)"/>' for i, dx in enumerate([0, -3000])) + \
    f'<rect id="p2-e-band" x="0" y="{ty - 520}" width="3000" height="1040" fill="{SULF}" opacity="0"/><circle cx="{tx}" cy="{ty}" r="14" fill="{SULF}"/>'
S.beat("p2-e", 60.12, 64.97, MAP("p2-e", over=haze) + blk('<div id="p2-e1" class="big sulf">Sulfate droplets</div><div id="p2-e2" class="big" style="font-size:84px">= a shield over Earth</div>', cls="shade"), bg="#1B2A35")
S.J(f'tl.set("#p2-e-m",{{{cam(0.36, (1500, 750), cy=960)}}},0);')
S.J(f'tl.fromTo("#p2-e-h0, #p2-e-h1",{{scaleX:0.08,scaleY:0.15,transformOrigin:"50% 50%"}},{{scaleX:3.2,scaleY:1.5,duration:4.2,ease:"power1.inOut"}},{S.t(60.3)});')
S.tween("#p2-e-band", 61.8, "opacity:0", "opacity:0.22", 2.8, "power1.inOut")
S.enter("#p2-e1", W(13, "sulfate") - 0.15, "y:40")
S.enter("#p2-e2", W(13, "droplets") + 0.4, "y:30")

rays = [(80, "bounce"), (270, "bounce"), (460, "pass"), (650, "bounce"), (820, "bounce")]
S.beat("p2-f", 64.97, 69.31, ATMOS("p2-f", droplets=True, rays=rays) + blk('<div id="p2-f1" class="sm">A veil that reflected sunlight</div><div id="p2-f2" class="big">Back into space</div>', cls="shade"))
S.J('tl.set("#p2-f-plume",{strokeDashoffset:0},0);')
for i in range(len(rays)):
    S.tween(f"#p2-f-r{i}", 65.3 + i * 0.25, "strokeDashoffset:110", "strokeDashoffset:0", 1.4, "power1.inOut")
S.enter("#p2-f1", W(14, "formed") - 0.1, "y:30")
S.enter("#p2-f2", W(14, "back") - 0.1, "y:40")

sun = svg('<defs><radialGradient id="p2-g-h"><stop offset="0" stop-color="#FFF3C8" stop-opacity="0.8"/><stop offset="1" stop-color="#FFF3C8" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="#7E97A8"/><circle cx="504" cy="1000" r="380" fill="url(#p2-g-h)"/><circle id="p2-g-sun" cx="504" cy="1000" r="150" fill="#FCEBB8"/>')
S.beat("p2-g", 69.31, 71.59, sun + blk('<div id="p2-g1" class="big">The sun was still shining</div>', cls="ink"))
S.enter("#p2-g1", 69.35, "y:40")
S.tween("#p2-g-sun", 69.31, "scale:0.9,transformOrigin:'50% 50%'", "scale:1.05", 2.28, "none")

rays2 = [(120, "bounce"), (330, "bounce"), (520, "pass"), (720, "bounce")]
S.beat("p2-h", 71.59, 74.9, ATMOS("p2-h", droplets=True, rays=rays2, coldground=True) + blk('<div id="p2-h1" class="sm">But less of its heat</div><div id="p2-h2" class="big">Reached the ground</div>', cls="shade"))
S.J('tl.set("#p2-h-plume",{strokeDashoffset:0},0);')
for i in range(len(rays2)):
    S.J(f'tl.set("#p2-h-r{i}",{{strokeDashoffset:0}},0);')
S.J('tl.fromTo("#p2-h svg",{scale:1,transformOrigin:"50% 85%"},{scale:1.18,duration:3.3,ease:"power1.inOut"},0);')
S.enter("#p2-h1", W(16, "less") - 0.1, "y:30")
S.enter("#p2-h2", W(16, "reaching") - 0.1, "y:40")
S.write()

# ================================================================== P3
S = Sec("p3")
S.beat("p3-a", 74.9, 80.0, THERMO("p3-a") + blk('<div id="p3-a1" class="sm">Global temperatures</div><div id="p3-a2" class="huge" style="font-size:170px">&minus;0.5&deg;C</div><div id="p3-a3" class="sm">about, on average</div>', top=300, right=420, cls="shade"))
S.tween("#p3-a-merc", W(17, "dropped") - 0.1, "attr:{y:520,height:560}", "attr:{y:760,height:320}", 1.8, "power2.inOut")
S.enter("#p3-a1", 75.0, "y:30")
S.enter("#p3-a2", W(17, "half") - 0.15, "y:40")
S.enter("#p3-a3", W(17, "Celsius") - 0.1, "y:30")

cal = svg(f'''<rect width="1080" height="1920" fill="#33414B"/>
<g transform="translate(0 200)"><rect x="260" y="460" width="490" height="620" fill="#F2EFE8"/><rect x="260" y="460" width="490" height="130" fill="#8E3B2E"/>
<text x="505" y="555" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="78" fill="#F2EFE8" letter-spacing="6">JUNE</text>
<text x="505" y="640" text-anchor="middle" font-family="EB Garamond" font-weight="600" font-size="40" fill="#4A4038" letter-spacing="6">1816</text>
<g id="p3-b-sun"><circle cx="505" cy="850" r="90" fill="#E9B949"/>{"".join(f'<line x1="{505 + 120 * math.cos(math.radians(k * 45)):.0f}" y1="{850 + 120 * math.sin(math.radians(k * 45)):.0f}" x2="{505 + 165 * math.cos(math.radians(k * 45)):.0f}" y2="{850 + 165 * math.sin(math.radians(k * 45)):.0f}" stroke="#E9B949" stroke-width="16" stroke-linecap="round"/>' for k in range(8))}</g>
<g id="p3-b-flake" stroke="#5E87A3" stroke-width="16" stroke-linecap="round">{"".join(f'<line x1="505" y1="850" x2="{505 + 150 * math.cos(math.radians(k * 60)):.0f}" y2="{850 + 150 * math.sin(math.radians(k * 60)):.0f}"/>' for k in range(6))}</g></g>''')
S.beat("p3-b", 80.0, 82.58, cal + blk('<div id="p3-b1" class="sm">Enough to</div><div id="p3-b2" class="big">Wreck the seasons</div>', cls="shade"))
S.J('tl.set("#p3-b-flake",{opacity:0},0);')
S.tween("#p3-b-sun", W(18, "wreck") - 0.1, "opacity:1,scale:1,svgOrigin:'505 1050'", "opacity:0,scale:0.6", 0.35, "power2.in")
S.stamp("#p3-b-flake", W(18, "wreck") + 0.2, 0.6)
S.enter("#p3-b1", 80.05, "y:30")
S.enter("#p3-b2", W(18, "wreck") - 0.1, "y:40")

snow2, snow2js = SNOW("p3-sn", 80, 82.58, 85.98, seed=12)
S.beat("p3-c", 82.58, 85.98, FARMHOUSE("p3-c") + snow2 + blk('<div id="p3-c1" class="sm">June 1816:</div><div id="p3-c2" class="big">Snow in New England</div>', cls="ink"))
snow_js(S, snow2js, 82.58, 85.98)
S.enter("#p3-c1", 82.6, "y:30")
S.enter("#p3-c2", W(19, "snow") - 0.1, "y:40")

S.beat("p3-d", 85.98, 89.11, CORN("p3-d") + blk('<div id="p3-d1" class="big">Frost killed crops</div><div id="p3-d2" class="sm">in July and August</div>', cls="ink"))
S.tween("#p3-d svg", 85.98, "scale:1.0,transformOrigin:'50% 70%'", "scale:1.1", 3.13, "none")
S.enter("#p3-d1", W(20, "Frost") - 0.05, "y:40")
S.enter("#p3-d2", W(20, "July") - 0.1, "y:30")

bt = W(21, "bread") - 0.1
S.beat("p3-e", 89.11, 93.83, BREAD("p3-e") +
       f'<div id="p3-eA" class="clip" data-start="{S.t(89.11)}" data-duration="{round(bt - 89.11, 3)}" style="position:absolute;inset:0">' + blk('<div id="p3-e1" class="sm">In Europe, grain prices</div><div id="p3-e2" class="big sulf">Soared</div>', cls="shade") + '</div>' +
       f'<div id="p3-e3" class="clip" data-start="{S.t(bt)}" data-duration="{round(93.83 - bt, 3)}" style="position:absolute;inset:0">' + blk('<div class="sm">and bread became</div><div class="big">Unaffordable</div>', cls="shade") + '</div>')
S.tween("#p3-e-line", W(21, "grain") - 0.1, "strokeDashoffset:110", "strokeDashoffset:0", 2.0, "power2.in")
S.enter("#p3-e1", 89.15, "y:30")
S.enter("#p3-e2", W(21, "soared") - 0.1, "y:40")
S.enter("#p3-e3 .blk", bt, "y:30")
S.css.append("#p3-e svg{} ")

fr, sw = MP["france"], MP["switzerland"]
riot = "".join(f'<g id="p3-f-m{i}"><circle cx="{x}" cy="{y}" r="7" fill="{EMBER}"/><circle cx="{x}" cy="{y}" r="16" fill="none" stroke="{EMBER}" stroke-width="3"/></g>' for i, (x, y) in enumerate([fr, sw]))
s_f = 5.0
fx, fy = scr(s_f, "france", "geneva")
sx, sy = scr(s_f, "switzerland", "geneva")
S.beat("p3-f", 93.83, 98.12, MAP("p3-f", over=riot) + f'<div id="p3-f-l0" class="lbl" style="left:{fx + 20:.0f}px;top:{fy + 30:.0f}px">France</div><div id="p3-f-l1" class="lbl" style="left:{sx + 30:.0f}px;top:{sy - 70:.0f}px">Switzerland</div>' +
       blk('<div id="p3-f1" class="big">Food riots</div>', cls="shade"), bg="#1B2A35")
S.tween("#p3-f-m", 93.83, cam(4.4, "geneva"), cam(s_f, "geneva"), 4.29, "none")
S.enter("#p3-f1", W(22, "riots") - 0.15, "y:40")
S.stamp("#p3-f-m0", W(22, "France") - 0.05, 2.5)
S.stamp("#p3-f-m1", W(22, "Switzerland") - 0.05, 2.5)
S.enter("#p3-f-l0", W(22, "France") - 0.05, "y:20")
S.enter("#p3-f-l1", W(22, "Switzerland") - 0.05, "y:20")
S.J(f'tl.set("#p3-f-l0, #p3-f-l1",{{x:0}},0);')

ir = MP["ireland"]
S.beat("p3-g", 98.12, 101.0, MAP("p3-g", over=f'<g id="p3-g-pin"><circle cx="{ir[0]}" cy="{ir[1]}" r="6" fill="{EMBER}"/><circle cx="{ir[0]}" cy="{ir[1]}" r="14" fill="none" stroke="{EMBER}" stroke-width="3"/></g>') +
       blk('<div id="p3-g1" class="sm">In Ireland,</div><div id="p3-g2" class="huge">Typhus</div>', cls="shade"), bg="#1B2A35")
S.tween("#p3-g-m", 98.12, cam(5.0, "geneva"), cam(5.6, "ireland"), 1.4, "power2.inOut")
S.stamp("#p3-g-pin", 99.4, 2.4)
S.enter("#p3-g1", W(23, "Ireland") - 0.2, "y:30")
S.enter("#p3-g2", W(23, "typhus") - 0.1, "y:40")

rain1, rain1js = RAIN("p3-rn", 90, 101.0, 104.13, seed=6)
S.beat("p3-h", 101.0, 104.13, VILLAGE("p3-h") + rain1 + blk('<div id="p3-h1" class="sm">Starving people wandered</div><div id="p3-h2" class="big">looking for food</div>', cls="shade"))
rain_js(S, rain1js, 101.0, 104.13)
for i in range(3):
    S.tween(f"#p3-h-fig{i}", 101.0, "x:0", f"x:{60 + i * 15}", 3.13, "none")
S.enter("#p3-h1", 101.05, "y:30")
S.enter("#p3-h2", W(23, "looking") - 0.1, "y:40")

snow3, snow3js = SNOW("p3-sn2", 60, 104.13, 107.95, seed=14)
S.beat("p3-i", 104.13, 107.95, FIELD("p3-i") + snow3 + '<div class="beat" style="background:#0E1318;opacity:0.35"></div>' +
       blk('<div id="p3-i0" class="sm">Historians now call it</div><div id="p3-i1" class="huge" style="font-size:160px">The year</div><div id="p3-i2" class="huge sulf" style="font-size:160px">without a</div><div id="p3-i3" class="huge" style="font-size:160px">summer</div>', cls="shade"))
snow_js(S, snow3js, 104.13, 107.95)
S.enter("#p3-i0", 104.15, "y:30")
S.stamp("#p3-i1", W(24, "Year") - 0.1, 1.3)
S.stamp("#p3-i2", W(24, "Without") - 0.05, 1.3)
S.stamp("#p3-i3", W(24, "Summer") - 0.05, 1.3)
S.write()

# ================================================================== P4
S = Sec("p4")
rain2, rain2js = RAIN("p4-rn", 70, 107.95, 111.6, seed=9, angle=6)
S.beat("p4-a", 107.95, 111.6, WINDOW("p4-a") + f'<div class="beat" style="clip-path:inset(15.6% 13.9% 29.2% 13.9%)">{rain2}</div>' + blk('<div id="p4-a1" class="sm">Trapped indoors by</div><div id="p4-a2" class="big">Endless rain</div>', cls="shade"))
rain_js(S, rain2js, 107.95, 111.6, angle=6)
S.enter("#p4-a1", 108.0, "y:30")
S.enter("#p4-a2", W(25, "endless") - 0.1, "y:40")

rain3, rain3js = RAIN("p4-rn2", 60, 111.6, W(26, "There"), seed=10)
S.beat("p4-b", 111.6, W(26, "There"), VILLA("p4-b") + rain3 + blk('<div id="p4-b1" class="sm">A villa on</div><div id="p4-b2" class="big">Lake Geneva</div>', cls="shade"))
rain_js(S, rain3js, 111.6, W(26, "There"))
S.tween("#p4-b svg", 111.6, "scale:1.06,transformOrigin:'50% 50%'", "scale:1.0", round(W(26, "There") - 111.6, 3), "none")
S.enter("#p4-b1", 111.65, "y:30")
S.enter("#p4-b2", W(25, "Lake") - 0.1, "y:40")

c0 = W(26, "There")
names = [("Lord Byron", "poet", W(26, "Byron")), ("Percy Shelley", "poet", W(26, "Shelley")), ("Mary", "Percy's partner", W(26, "Mary")), ("John Polidori", "doctor", W(26, "Polidori"))]
nh = "".join(f'<div id="p4-c-n{i}" style="margin-bottom:22px"><div class="big" style="font-size:96px">{n}</div><div class="sm" style="font-size:36px;color:#E8C9A0">{r}</div></div>' for i, (n, r, _) in enumerate(names))
S.beat("p4-c", c0, 122.3, CANDLE("p4-c", cx=820, base=1100, scale=0.8) + blk(nh, cls="shade"))
flicker(S, "p4-c", c0, 122.3)
for i, (_, _, tt) in enumerate(names):
    S.enter(f"#p4-c-n{i}", tt - 0.1, "y:30")

S.beat("p4-d", 122.3, 127.89, PAPER("p4-d") + blk('<div id="p4-d1" class="sm">Byron\'s challenge:</div><div id="p4-d2" class="big">Write a ghost story</div>', cls="shade"))
for i in range(5):
    S.tween(f"#p4-d-l{i}", 123.0 + i * 0.85, "strokeDashoffset:110", "strokeDashoffset:0", 0.8, "none")
S.tween("#p4-d-quill", 123.0, "x:300,y:790,rotation:30", "x:720,y:1080,rotation:30", 4.6, "none")
S.enter("#p4-d1", W(27, "Byron") - 0.1, "y:30")
S.enter("#p4-d2", W(27, "write") - 0.1, "y:40")

S.beat("p4-e", 127.89, W(29, "From") - 0.05, CANDLE("p4-e", cx=780, base=1150, scale=0.7) + blk('<div id="p4-e1" class="sm">Mary was just</div><div id="p4-e2" class="huge" style="font-size:420px;line-height:0.85">18</div><div id="p4-e3" class="sm" style="margin-top:20px">and couldn\'t stop thinking</div>', cls="shade"))
flicker(S, "p4-e", 127.89, W(29, "From") - 0.05)
S.enter("#p4-e1", 127.92, "y:30")
S.stamp("#p4-e2", W(28, "eighteen") - 0.05, 1.3)
S.enter("#p4-e3", W(28, "She") - 0.1, "y:30")

f0 = W(29, "From") - 0.05
S.beat("p4-f", f0, W(30, "a") - 0.05, BOOK("p4-f") + blk('<div id="p4-f1" class="sm" style="color:#E8C9A0">The summer that gave us</div><div id="p4-f2" class="big">Frankenstein</div>', cls="shade"))
S.tween("#p4-f svg", f0, "scale:0.92,transformOrigin:'50% 40%'", "scale:1.0", round(W(30, "a") - 0.05 - f0, 3), "power1.out")
S.enter("#p4-f1", f0 + 0.1, "y:30")
S.stamp("#p4-f2", W(29, "Frankenstein") - 0.05, 1.2)

g0 = W(30, "a") - 0.05
life = W(30, "life")
S.beat("p4-g", g0, 139.22, STORM("p4-g") + blk('<div id="p4-g1" class="big">A creature</div><div id="p4-g2" class="huge sulf">brought to life</div>', top=1260 - 960, cls="shade"))
S.tween("#p4-g-bolt", life - 0.25, "strokeDashoffset:110", "strokeDashoffset:0", 0.2, "none")
S.J(f'tl.fromTo("#p4-g-flash",{{opacity:0}},{{opacity:0.85,duration:0.05,ease:"none"}},{S.t(life - 0.03)}); tl.to("#p4-g-flash",{{opacity:0,duration:0.5,ease:"power2.out"}},{S.t(life + 0.05)});')
S.enter("#p4-g1", W(30, "creature") - 0.1, "y:40")
S.stamp("#p4-g2", life - 0.02, 1.35)

S.beat("p4-h", 139.22, 142.6, STORM("p4-h") + blk('<div id="p4-h1" class="sm">by a science</div><div id="p4-h2" class="big">nobody yet understood</div>', cls="shade"))
S.J('tl.set("#p4-h-bolt",{strokeDashoffset:0,opacity:0.35},0);')
S.enter("#p4-h1", 139.25, "y:30")
S.enter("#p4-h2", W(31, "nobody") - 0.1, "y:40")
S.write()

# ================================================================== CLOSE
S = Sec("close")
words = [("A volcano", W(32, "volcano")), ("changed the weather", W(32, "weather")), ("the food", W(32, "food")), ("and the books", W(32, "books"))]
ch = ""
for i, (wd, tt) in enumerate(words):
    ch += f'<div id="cl-w{i}" class="big" style="font-size:84px">{wd}</div>'
    if i < 3:
        ch += CHAIN_ARROW(i)
paper = svg('<rect width="1080" height="1920" fill="#DCE3E7"/><rect width="1080" height="1920" fill="#C9D4DA" opacity="0.4"/>')
S.beat("cl-a", 142.6, 150.09, paper + blk(ch, cls="ink"))
for i, (wd, tt) in enumerate(words):
    S.enter(f"#cl-w{i}", tt - 0.15, "x:-40")
    if i > 0:
        S.enter(f"#cl-ar{i - 1}", tt - 0.35, "y:-20", 0.2)

S.beat("cl-b", 150.09, 160.5, FIELD("cl-b", warm=True))
S.J(f'tl.fromTo("#cl-b-sun",{{y:520,opacity:0}},{{y:0,opacity:1,duration:4.5,ease:"power2.out"}},{S.t(150.2)});')
S.tween("#cl-b-warm", 150.6, "opacity:0", "opacity:0.22", 5.0, "power1.inOut")
S.tween("#cl-b-rays", 152.0, "opacity:0", "opacity:1", 3.0, "power1.inOut")
S.beat("cl-c", 150.09, 154.25, blk('<div id="cl-c1" class="sm">Nature\'s biggest shocks</div><div id="cl-c2" class="big">rarely arrive where you expect them</div>', cls="ink"))
S.enter("#cl-c1", 150.12, "y:30")
S.enter("#cl-c2", W(33, "rarely") - 0.1, "y:40")
S.beat("cl-d", 154.25, 160.5, blk('<div id="cl-d1" class="huge" style="font-size:150px">Follow</div><div id="cl-d2" class="big">for more history</div><div id="cl-d3" class="big" style="color:#8E3B2E">+ science</div>', cls="ink"))
S.enter("#cl-d1", W(34, "Follow") - 0.1, "y:40")
S.enter("#cl-d2", W(34, "history") - 0.3, "y:40")
S.enter("#cl-d3", W(34, "science") - 0.1, "y:40")
S.write()

# ================================================================== CAPTIONS
import re
groups, cur = [], []
for w in WORDS:
    if cur and w["line"] != cur[-1]["line"]:
        groups.append(cur); cur = []
    cur.append(w)
    if re.search(r"[.,?:;]$", w["text"]) or len(cur) >= 4:
        groups.append(cur); cur = []
if cur:
    groups.append(cur)
rows, js = [], []
for gi, g in enumerate(groups):
    s = max(0.15, g[0]["start"] - 0.05)
    e = g[-1]["end"] + 0.15
    if gi + 1 < len(groups):
        e = min(e, groups[gi + 1][0]["start"] - 0.03)
    spans = " ".join(f'<span id="cw{w["id"][1:]}" class="cw">{html.escape(w["text"])}</span>' for w in g)
    rows.append(f'<div id="cg{gi}" class="cap"><span class="capin">{spans}</span></div>')
    js.append({"g": f"cg{gi}", "s": round(s, 3), "e": round(e, 3), "w": [[f'cw{w["id"][1:]}', w["start"]] for w in g]})
cap = f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; }}
    .cap {{ position: absolute; left: 120px; right: 300px; top: 1110px; text-align: center; opacity: 0; overflow: visible; }}
    .capin {{ display: inline-block; padding: 6px 16px 8px; background: rgba(10,14,18,0.58); border-radius: 4px; font-family: "Oswald"; font-weight: 600; font-size: 52px; line-height: 1.12; text-transform: uppercase; color: {FROST}; }}
    .cw {{ opacity: 0.62; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920">
    {chr(10).join(rows)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    const G = {json.dumps(js)};
    G.forEach(({{ g, s, e, w }}) => {{
      const el = "#" + g;
      tl.fromTo(el, {{ opacity: 0, y: 12 }}, {{ opacity: 1, y: 0, duration: 0.12, ease: "power2.out" }}, s);
      w.forEach(([id, t]) => tl.fromTo("#" + id, {{ opacity: 0.62 }}, {{ opacity: 1, duration: 0.08, ease: "none" }}, t));
      tl.to(el, {{ opacity: 0, duration: 0.1, ease: "power2.in" }}, e - 0.1);
      tl.set(el, {{ opacity: 0, visibility: "hidden" }}, e);
    }});
    window.__timelines["captions"] = tl;
  </script>
</template>
"""
open(A("compositions/captions.html"), "w").write(cap)
print("built", len(groups), "caption groups")
