"""Unfu*ck Yourself, Don't Spoil It RG book episode 01: 12-scene vertical cartoon (1080x1920).
Run from the project folder: python3 tools/gen.py"""
import json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RIG = open(os.path.join(HERE, "rig.js")).read()
INK = "#1b1a18"
LEAD, TAIL = 0.2, 0.3
SLOTS = [13, 14, 13, 14, 14, 14, 14, 14, 14, 14, 15, 14]  # the brief's timestamps
LINES = [l.strip() for l in open(os.path.join(HERE, "vo.txt"), encoding="utf-8") if l.strip()]
PROT = dict(skin="#9a6a4a", hair="messy", hood="#1f2d44", suit="#2b3a55", brows="sad", mouth="flat")


def prot(**kw):
    d = dict(PROT)
    d.update(kw)
    return d


def dur(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode())


def word_times(text, f):
    out = subprocess.run(["ffmpeg", "-i", f, "-af", "silencedetect=n=-38dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    D = dur(f)
    st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    on = en[0] if st and st[0] < 0.02 and en else 0.0
    off = st[-1] if st and st[-1] > D - 0.6 else D
    pauses = [(a, b) for a, b in zip(st, en) if a > on + 0.05 and b < off - 0.05]
    words = text.replace("...", "… ").split()
    w = [max(2, len(re.sub(r"[^\w']", "", x))) + 1 for x in words]
    brk = [i for i, x in enumerate(words) if re.search(r"[,.…?!—]$", x)][: len(pauses)]
    segs, pi, pt = [], 0, on
    for i, (ps, pe) in zip(brk, pauses):
        segs.append((pi, i + 1, pt, ps))
        pi, pt = i + 1, pe
    segs.append((pi, len(words), pt, off))
    times = [0.0] * len(words)
    for a, b, t0, t1 in segs:
        tot = sum(w[a:b]) or 1
        t = t0
        for k in range(a, b):
            times[k] = round(t, 3)
            t += (t1 - t0) * w[k] / tot
    return words, times, D


def chunks(words, maxw=5):
    out, cur = [], []
    for i, x in enumerate(words):
        cur.append(i)
        if len(cur) >= maxw or (re.search(r"[.?!…—]$", x) and len(cur) >= 3) or (x.endswith(",") and len(cur) >= 3):
            out.append(cur)
            cur = []
    if cur:
        if out and len(cur) < 3:
            out[-1] += cur
        else:
            out.append(cur)
    return out


def ch(id_, kind, x, floor, W, opts=None, z=None, flip=False):
    if kind == "person":
        H = W * 380 / 260
        top = floor - 0.974 * H
    else:
        H = W
        top = floor - H
    zs = ("z-index:%d;" % z) if z is not None else ""
    cls = "char flip" if flip else "char"
    html = ('<div id="@%s" class="%s" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;%s"></div>'
            % (id_, cls, round(x - W / 2), round(top), round(W), round(H), zs))
    js = 'rig("@%s", "%s", %s);' % (id_, kind, json.dumps(opts or {}))
    return html, js


def box(css, id_=None, cls="abs"):
    idp = ('id="@%s" ' % id_) if id_ else ""
    return '<div %sclass="%s" style="%s"></div>' % (idp, cls, css)


def bg(col, id_=None):
    return box("left:0;top:0;width:1080px;height:1920px;background:" + col, id_)


def svg(id_, x, y, w, h, vb, body, extra=""):
    idp = ('id="@%s" ' % id_) if id_ else ""
    return ('<svg %sclass="abs" viewBox="%s" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;overflow:visible;%s">%s</svg>'
            % (idp, vb, x, y, w, h, extra, body))


def rain(id_, n, seed, op=0.35):
    body = ""
    for i in range(n):
        x = (i * 137 + seed * 53) % 1080
        y = (i * 263 + seed * 97) % 1920
        body += '<path d="M%d %d l-26 80" stroke="#9fb4d0" stroke-width="5" stroke-linecap="round"/>' % (x, y)
    return svg(id_, 0, 0, 1080, 1920, "0 0 1080 1920", body, "opacity:%s" % op)


def bridge_svg():
    body = '<polygon points="120,1920 960,1920 640,1140 440,1140" fill="#5a4a3e" stroke="%s" stroke-width="6"/>' % INK
    for i in range(1, 10):
        f = (i / 9.0) ** 1.5
        y = 1920 - (1920 - 1140) * f
        xl = 120 + (440 - 120) * f
        xr = 960 + (640 - 960) * f
        body += '<line x1="%.0f" y1="%.0f" x2="%.0f" y2="%.0f" stroke="%s" stroke-width="5"/>' % (xl, y, xr, y, INK)
    return svg("bridge", 0, 0, 1080, 1920, "0 0 1080 1920", body)


def fog_svg(id_):
    body = "".join('<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#c8cde0"/>' % e
                   for e in [(150, 1080, 260, 70), (520, 1160, 300, 80), (900, 1060, 260, 70), (300, 1260, 320, 90), (800, 1240, 300, 80)])
    return svg(id_, 0, 0, 1080, 1920, "0 0 1080 1920", body, "opacity:0.45")


MOON = svg("moon", 0, 0, 1080, 1920, "0 0 1080 1920",
           '<circle cx="820" cy="360" r="220" fill="#f0eedc" opacity="0.18"/><circle cx="820" cy="360" r="120" fill="#f0eedc"/>'
           '<ellipse cx="260" cy="260" rx="300" ry="90" fill="#4a5170"/><ellipse cx="620" cy="520" rx="320" ry="80" fill="#4a5170"/>')

SC = []


def scene(title, hi, enter, parts, js, css=""):
    SC.append(dict(title=title, hi=hi, enter=enter, parts=parts, js=js, css=css))


# 1 — the voice holding you back
shadows = svg("sh", 0, 0, 1080, 1920, "0 0 1080 1920",
              '<ellipse cx="170" cy="760" rx="170" ry="230" fill="#05070c" opacity="0.7"/>'
              '<ellipse cx="910" cy="640" rx="200" ry="260" fill="#05070c" opacity="0.65"/>'
              '<ellipse cx="120" cy="1180" rx="120" ry="170" fill="#05070c" opacity="0.6"/>'
              '<ellipse cx="960" cy="1200" rx="150" ry="190" fill="#05070c" opacity="0.6"/>')
hp, jp = ch("p", "person", 540, 1440, 400, prot())
scene("THE VOICE HOLDING YOU BACK", ["standing", "own", "way", "awakening"], "dip",
      [bg("#141b2b"),
       box("left:600px;top:300px;width:380px;height:440px;background:#2a3d62;border:14px solid #0b0f18;border-radius:6px"),
       rain("rain1", 70, 1, 0.3),
       box("left:0;top:1440px;width:1080px;height:480px;background:#1c2436"),
       box("left:120px;top:1380px;width:840px;height:120px;background:#2b3550;border:6px solid #0b0f18;border-radius:14px"),
       shadows, hp],
      jp + r'''
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.12, duration: D, ease: "sine.inOut", transformOrigin: "50% 40%" }, 0);
  tl.fromTo("#@sh", { y: 0 }, { y: -30, duration: 2.6, yoyo: true, repeat: 4, ease: "sine.inOut" }, 0);
  tl.fromTo("#@rain1", { y: -70 }, { y: 0, duration: 0.5, repeat: 30, ease: "none" }, 0);
  blink(tl, "@p", 4.0);
''')

# 2 — lesson 1: are you willing?
hp, jp = ch("p", "person", 540, 1440, 380, prot())
rays = svg("rays", 0, 0, 1080, 1920, "0 0 1080 1920", '<polygon points="680,1380 980,1380 1200,1920 460,1920" fill="#f6d48a"/>', "opacity:0.2")
scene("LESSON 1: ARE YOU WILLING?", ["willing", "uncomfortable", "difference"], "cut",
      [bg("#1a2236"),
       box("left:0;top:1380px;width:1080px;height:540px;background:#24293a"),
       box("left:100px;top:560px;width:300px;height:820px;background:#0c1220;border:12px solid #05070c;border-radius:10px"),
       box("left:680px;top:560px;width:300px;height:820px;background:linear-gradient(#fff3c4,#f6c744);border:12px solid #05070c;border-radius:10px"),
       rays, hp],
      jp + r'''
  tl.fromTo("#@world", { x: 40 }, { x: -40, duration: D, ease: "sine.inOut" }, 0);
  tl.fromTo("#@rays", { opacity: 0.08 }, { opacity: 0.35, duration: 3.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.5);
  tl.to("#@p .head", { rotation: -7, duration: 1.2, ease: "sine.inOut" }, 2.0);
  tl.to("#@p .head", { rotation: 4, duration: 1.2, ease: "sine.inOut" }, 4.0);
  blink(tl, "@p", 7.0);
''')

# 3 — the first decision
hp, jp = ch("p", "person", 930, 1440, 380, prot(mouth="flat"))
shaft = svg("shaft", 0, 0, 1080, 1920, "0 0 1080 1920", '<polygon points="120,580 420,580 900,1180 260,1180" fill="#f6d48a"/>', "opacity:0.25")
ring = svg("ring", 740, 1000, 90, 90, "-45 -45 90 90", '<circle r="32" fill="none" stroke="#f6c744" stroke-width="7"/>', "opacity:0")
scene("THE FIRST DECISION", ["apply", "begin", "ready"], "cut",
      [bg("#2a3248"),
       box("left:120px;top:220px;width:300px;height:360px;background:#2a3d62;border:14px solid #0b0f18;border-radius:6px"),
       shaft,
       box("left:300px;top:1160px;width:560px;height:50px;background:#5a4030;border:6px solid #1b1a18;border-radius:6px"),
       box("left:330px;top:1210px;width:30px;height:230px;background:#3e2c22"),
       box("left:800px;top:1210px;width:30px;height:230px;background:#3e2c22"),
       box("left:330px;top:1120px;width:150px;height:40px;background:#f4ede0;border:4px solid #1b1a18;transform:rotate(-6deg)"),
       box("left:360px;top:1100px;width:150px;height:40px;background:#f4ede0;border:4px solid #1b1a18;transform:rotate(4deg)"),
       box("left:560px;top:1040px;width:260px;height:120px;background:#111828;border:8px solid #1b1a18;border-radius:10px"),
       box("left:580px;top:1056px;width:220px;height:90px;background:#7fb2d6;opacity:0.7"),
       box("left:520px;top:1158px;width:340px;height:14px;background:#2a2e38;border-radius:6px"),
       ring, hp],
      jp + r'''
  tl.fromTo("#@shaft", { opacity: 0.1 }, { opacity: 0.4, duration: 4, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
  tl.to("#@p .armR", { rotation: -35, duration: 0.6, ease: "power2.out" }, 1.6);
  tl.fromTo("#@ring", { opacity: 1, scale: 0.4 }, { opacity: 0, scale: 2, duration: 0.5, ease: "power2.out" }, 3.2);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.06, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 4 — lesson 2: you're wired to win
clocks = ""
for r in range(6):
    for c in range(4):
        x, y = 150 + c * 260, 170 + r * 230
        clocks += ('<g transform="translate(%d %d)"><circle r="60" fill="#3a4050" stroke="%s" stroke-width="8"/>'
                   '<g class="hand"><path d="M0 0 L0 -44" stroke="#e9e0c8" stroke-width="7" stroke-linecap="round"/></g>'
                   '<g class="hand"><path d="M0 0 L34 0" stroke="#e9e0c8" stroke-width="6" stroke-linecap="round"/></g></g>' % (x, y, INK))
clock_svg = svg("clocks", 0, 0, 1080, 1380, "0 0 1080 1380", clocks)
stripes = "".join('<rect x="%d" y="0" width="30" height="94" fill="#2a2f3c"/>' % x for x in range(-80, 1000, 80))
belt = ('<div class="abs" style="left:148px;top:1428px;width:784px;height:94px;overflow:hidden">'
        '<svg id="@belt" viewBox="0 0 1000 94" style="position:absolute;left:0;top:0;width:1000px;height:94px;overflow:visible">' + stripes + '</svg></div>')
hp, jp = ch("p", "person", 540, 1430, 400, prot(brows="flat"))
scene("LESSON 2: YOU'RE WIRED TO WIN", ["wired", "win", "wrong", "stuck"], "cut",
      [bg("#262a36"), box("left:0;top:0;width:1080px;height:1380px;background:#2c3040"), clock_svg,
       box("left:140px;top:1420px;width:800px;height:110px;background:#1b1f29;border:8px solid #05070c;border-radius:14px"),
       belt, hp],
      jp + r'''
  gsap.set("#@root .hand", { svgOrigin: "0 0" });
  tl.to("#@clocks .hand", { rotation: 360, duration: 6, ease: "none", repeat: 3 }, 0);
  walk(tl, "@p", 0.2, D - 0.8, 0.14);
  tl.fromTo("#@belt", { x: 0 }, { x: -80, duration: 0.3, ease: "none", repeat: Math.ceil(D / 0.3) }, 0.2);
  tl.fromTo("#@world", { scale: 1.3, transformOrigin: "50% 60%" }, { scale: 1.0, duration: D, ease: "power2.inOut" }, 0);
''')

# 5 — breaking the pattern
hp, jp = ch("p", "person", 240, 1440, 380, prot(brows="flat"))
scene("BREAKING THE PATTERN", ["rejection", "practicing", "learning", "trying"], "cut",
      [bg("#2a2a36"),
       box("left:620px;top:520px;width:380px;height:920px;background:#f6b36b"),
       svg("sun5", 0, 0, 1080, 1920, "0 0 1080 1920",
           '<circle cx="800" cy="760" r="110" fill="#ffe08a"/><rect x="620" y="1040" width="90" height="340" fill="#5a4a3e"/>'
           '<rect x="730" y="980" width="110" height="400" fill="#4e3f36"/><rect x="860" y="1080" width="120" height="300" fill="#5a4a3e"/>'),
       box("left:600px;top:500px;width:400px;height:960px;background:#4a4f5c;border:10px solid #1b1f29;border-radius:6px", "door"),
       box("left:0;top:1380px;width:1080px;height:540px;background:#33343f"),
       hp],
      jp + r'''
  walk(tl, "@p", 0.3, 3.6, 0.16);
  tl.fromTo("#@p", { x: 0 }, { x: 260, duration: 3.6, ease: "power1.inOut" }, 0.3);
  tl.fromTo("#@door", { x: 0 }, { x: 460, duration: 0.8, ease: "power2.in" }, 2.4);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.1, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 6 — lesson 3: embrace uncertainty
hp, jp = ch("p", "person", 540, 1440, 380, prot())
scene("LESSON 3: EMBRACE UNCERTAINTY", ["guarantee", "uncertainty", "risk"], "flash",
      [bg("#3a3f5c"), MOON, bridge_svg(), fog_svg("fog"), hp],
      jp + r'''
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.12, duration: D, ease: "sine.inOut", transformOrigin: "50% 55%" }, 0);
  tl.fromTo("#@fog", { x: -60 }, { x: 60, duration: D, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
  tl.fromTo("#@moon", { opacity: 0.7 }, { opacity: 1, duration: 3, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
''')

# 7 — the first step
path = svg("path", 0, 0, 1080, 1920, "0 0 1080 1920", '<polygon points="500,1140 580,1140 740,1920 340,1920" fill="#f6c744"/>', "opacity:0")
foot = svg("foot", 480, 1400, 120, 60, "-60 -30 120 60", '<ellipse rx="54" ry="22" fill="#f6c744"/>', "opacity:0")
hp, jp = ch("p", "person", 540, 1440, 380, prot(mouth="flat", brows="flat"))
scene("THE FIRST STEP", ["first", "step", "courage"], "cut",
      [bg("#3a3f5c"), MOON, bridge_svg(), fog_svg("fog"), path, foot, hp],
      jp + r'''
  walk(tl, "@p", 0.4, 1.8, 0.2);
  tl.to("#@p", { y: -70, duration: 1.8, ease: "power1.inOut" }, 0.4);
  tl.fromTo("#@foot", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 2.1);
  tl.fromTo("#@path", { opacity: 0 }, { opacity: 0.6, duration: 1.2, ease: "power2.out" }, 2.1);
  tl.fromTo("#@world", { y: 0 }, { y: 90, duration: D - 2.2, ease: "sine.inOut" }, 2.0);
  tl.fromTo("#@fog", { x: 40 }, { x: -40, duration: D, ease: "sine.inOut" }, 0);
''')

# 8 — lesson 4: you are not your thoughts
mirror = box("left:250px;top:330px;width:580px;height:860px;background:#1c2534;border:16px solid #6a6a78;border-radius:18px")
cracks = svg("cracks", 0, 0, 1080, 1920, "0 0 1080 1920",
             '<path d="M520 420 L600 620 L560 760 L680 900" stroke="#c9d3e0" stroke-width="4" fill="none"/>'
             '<path d="M600 620 L720 660" stroke="#c9d3e0" stroke-width="4" fill="none"/>', "opacity:0")
shadow = svg("shadow", 0, 0, 1080, 1920, "0 0 1080 1920",
             '<circle cx="540" cy="620" r="150" fill="#05070c"/><path d="M330 1000 C330 760 750 760 750 1000 L750 1180 L330 1180 Z" fill="#05070c"/>', "opacity:0.95")
hp, jp = ch("p", "person", 540, 1440, 400, prot(brows="flat", mouth="flat"))
scene("LESSON 4: YOU ARE NOT YOUR THOUGHTS", ["thoughts", "order", "enough", "calm"], "dip",
      [bg("#2e2a3a"), mirror, cracks, shadow, hp],
      jp + r'''
  tl.fromTo("#@cracks", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.8);
  tl.fromTo("#@shadow", { opacity: 0.95, scale: 1 }, { opacity: 0, scale: 0.7, duration: 3.6, ease: "power2.inOut", transformOrigin: "50% 75%" }, 2.0);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.1, duration: D, ease: "sine.inOut", transformOrigin: "50% 30%" }, 0);
''')

# 9 — action creates evidence
pages = "".join(box("left:640px;top:%dpx;width:220px;height:16px;background:#f4ede0;border:3px solid #1b1a18" % (1126 - i * 16), "pg%d" % i) for i in range(5))
sun9 = svg("sun9", 0, 0, 1080, 1920, "0 0 1080 1920",
           '<circle cx="820" cy="380" r="170" fill="#ffd36b"/><circle cx="820" cy="380" r="260" fill="#ffd36b" opacity="0.25"/>', "opacity:0")
hp, jp = ch("p", "person", 420, 1440, 380, prot(brows="flat", mouth="smile"))
scene("ACTION CREATES EVIDENCE", ["page", "proof", "forward", "evidence"], "flash",
      [bg("#3a3240", "bgs"), sun9,
       box("left:260px;top:1180px;width:520px;height:50px;background:#5a4030;border:6px solid #1b1a18;border-radius:6px"),
       box("left:290px;top:1230px;width:30px;height:210px;background:#3e2c22"),
       box("left:740px;top:1230px;width:30px;height:210px;background:#3e2c22"),
       pages, hp],
      jp + r'''
  tl.to("#@bgs", { backgroundColor: "#f2b25c", duration: D, ease: "power1.inOut" }, 0);
  tl.fromTo("#@sun9", { opacity: 0 }, { opacity: 1, duration: 5, ease: "sine.inOut" }, 0.5);
  for (var i = 0; i < 5; i++) {
    tl.fromTo("#@pg" + i, { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.25, ease: "back.out(2)" }, 1.5 + i * 1.4);
  }
  tl.to("#@p .armR", { rotation: -28, duration: 0.3, yoyo: true, repeat: 22, ease: "sine.inOut" }, 0.5);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.06, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 10 — lesson 5: accept reality
rain2 = rain("rain2", 120, 2, 0.45)
shutter = svg("shutter", 0, 0, 1080, 1920, "0 0 1080 1920",
              "".join('<line x1="160" y1="%d" x2="920" y2="%d" stroke="#2a2a32" stroke-width="10"/>' % (y, y) for y in range(740, 1400, 40)), "opacity:0.9")
sign = ('<div class="abs" style="left:330px;top:700px;width:420px;height:90px;background:#c8262b;border:6px solid #1b1a18;'
        'color:#fff;font-family:Archivo Black;font-size:58px;text-align:center;line-height:78px">CLOSED</div>')
puddle = svg("puddle", 0, 0, 1080, 1920, "0 0 1080 1920", '<ellipse cx="540" cy="1470" rx="380" ry="40" fill="#7fa0c0"/>', "opacity:0.4")
folder = svg("folder", 0, 0, 1080, 1920, "0 0 1080 1920",
             '<rect x="610" y="1180" width="120" height="150" rx="6" fill="#e9e0c8" stroke="%s" stroke-width="6"/>' % INK)
hp, jp = ch("p", "person", 540, 1440, 360, prot(brows="sad"))
scene("LESSON 5: ACCEPT REALITY", ["expect", "nothing", "accept", "reality"], "cut",
      [bg("#2f3a48"),
       box("left:150px;top:640px;width:780px;height:800px;background:#3b3a44;border:10px solid #1b1a18"),
       shutter, sign, puddle, hp, folder, rain2],
      jp + r'''
  tl.fromTo("#@rain2", { y: -80 }, { y: 0, duration: 0.4, repeat: Math.ceil(D / 0.4), ease: "none" }, 0);
  tl.fromTo("#@world", { scale: 1.06 }, { scale: 1.0, duration: D, ease: "sine.inOut", transformOrigin: "50% 40%" }, 0);
  tl.fromTo("#@puddle", { scale: 0.7, opacity: 0.2 }, { scale: 1.1, opacity: 0.6, duration: 1.6, repeat: 7, yoyo: true, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0.5);
  tl.to("#@p .head", { rotation: 8, duration: 1.2, ease: "sine.inOut" }, 4.5);
''')

# 11 — try again, differently
sky11 = box("left:0;top:0;width:1080px;height:1920px;background:linear-gradient(#e89a58,#f6c76a)")
sun11 = svg("sun11", 0, 0, 1080, 1920, "0 0 1080 1920", '<circle cx="540" cy="760" r="260" fill="#ffe08a" opacity="0.85"/>')
skyline11 = svg("sky11", 0, 0, 1080, 1920, "0 0 1080 1920",
                "".join('<rect x="%d" y="%d" width="%d" height="%d" fill="#4a3a40"/>' % (x, 1380 - h, w, h)
                        for x, w, h in [(0, 120, 380), (130, 90, 520), (230, 140, 300), (380, 80, 450), (560, 110, 340), (680, 130, 520), (830, 100, 400), (940, 140, 300)]))
street11 = box("left:0;top:1380px;width:1080px;height:540px;background:#5a4a40")
shadow11 = svg("shadow11", 0, 0, 1080, 1920, "0 0 1080 1920", '<polygon points="330,1440 380,1440 110,1560 60,1545" fill="#2a1e1e"/>', "opacity:0.45")
hp, jp = ch("p", "person", 440, 1440, 380, prot(brows="flat", mouth="smile"))
scene("TRY AGAIN, DIFFERENTLY", ["fails", "try", "again", "relentless"], "cut",
      [sky11, sun11, skyline11, street11, shadow11, hp],
      jp + r'''
  walk(tl, "@p", 0.2, D - 0.6, 0.2);
  tl.fromTo("#@p", { x: 0 }, { x: 240, duration: D - 0.4, ease: "power1.inOut" }, 0.2);
  tl.fromTo("#@shadow11", { x: 0 }, { x: 240, duration: D - 0.4, ease: "power1.inOut" }, 0.2);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.06, duration: D, ease: "sine.inOut", transformOrigin: "50% 60%" }, 0);
''')

# 12 — the final message
sky12 = box("left:0;top:0;width:1080px;height:1920px;background:linear-gradient(#f4b860,#fbe3a0)")
sun12 = svg("sun12", 0, 0, 1080, 1920, "0 0 1080 1920", '<circle cx="540" cy="640" r="300" fill="#fff0b0" opacity="0.9"/>')
city12 = svg("city12", 0, 0, 1080, 1920, "0 0 1080 1920",
             "".join('<rect x="%d" y="%d" width="%d" height="%d" fill="#7a4a3a"/>' % (x, 1400 - h, w, h)
                     for x, w, h in [(-10, 140, 300), (120, 100, 420), (210, 160, 260), (380, 110, 380), (500, 120, 300), (640, 130, 400), (790, 120, 280), (930, 160, 340)]))
roof12 = box("left:0;top:1400px;width:1080px;height:520px;background:#5a3a30")
ledge12 = box("left:0;top:1400px;width:1080px;height:16px;background:#1b1a18")
logo12 = ('<div class="abs" style="left:300px;top:250px;width:480px;height:64px;line-height:64px;text-align:center;'
          'background:#1b1a18;color:#f6c744;font-family:Archivo Black;font-size:30px;border-radius:12px">DON\'T SPOIL IT RG</div>')
hp, jp = ch("p", "person", 540, 1440, 400, prot(brows="flat", mouth="smile"))
scene("THE FINAL MESSAGE", ["step", "today", "hardest", "spoil"], "flash",
      [sky12, sun12, city12, roof12, ledge12, logo12, hp],
      jp + r'''
  tl.fromTo("#@world", { scale: 1.15 }, { scale: 1.0, duration: D - 0.8, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
  tl.fromTo("#@p .head", { rotation: -3 }, { rotation: 3, duration: 1.4, yoyo: true, repeat: 5, ease: "sine.inOut" }, 0.5);
  tl.fromTo("#@dip", { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.in", immediateRender: false }, D - 0.9);
''')

ENTER = {
    "dip": 'tl.fromTo(P + "dip", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power2.out" }, 0);',
    "flash": 'tl.fromTo(P + "flash", { opacity: 0.9 }, { opacity: 0, duration: 0.4, ease: "power2.out" }, 0);',
    "cut": "",
}

TPL = r'''<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; background: #05070c; }
    #@world { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; }
    #@root .abs { position: absolute; }
    #@root .char { position: absolute; }
    #@root .char svg { width: 100%; height: 100%; overflow: visible; }
    #@card { position: absolute; left: 50%; top: 110px; width: max-content; max-width: 920px; padding: 16px 28px; background: #f4ede0; border: 5px solid #1b1a18; border-radius: 20px; z-index: 20; text-align: center; }
    #@chip { display: inline-block; font-family: "Archivo Black", sans-serif; font-size: 26px; line-height: 1; color: #fff; background: #c8262b; padding: 8px 12px 6px; border-radius: 10px; margin-right: 12px; vertical-align: 6px; }
    #@ttl { display: inline; font-family: "Archivo Black", sans-serif; font-size: 38px; line-height: 1.15; color: #1b1a18; }
    #@cap { position: absolute; left: 0; top: 1500px; width: 1080px; height: 300px; z-index: 20; }
    #@cap .chunk { position: absolute; left: 50%; top: 0; width: max-content; max-width: 960px; padding: 16px 34px 20px; background: #f4ede0; border: 5px solid #1b1a18; border-radius: 22px; text-align: center; font-family: "Inter", sans-serif; font-weight: 800; font-size: 58px; line-height: 1.12; color: #1b1a18; opacity: 0; }
    #@cap .w { display: inline-block; margin: 0 0.12em; opacity: 0.3; }
    #@cap .hl { color: #c9653f; }
    #@flash { position: absolute; inset: 0; background: #fff7ea; opacity: 0; z-index: 30; }
    #@dip { position: absolute; inset: 0; background: #05070c; opacity: 0; z-index: 30; }
    __EXTRA_CSS__
  </style>
  <div id="root" data-composition-id="__SID__" data-width="1080" data-height="1920" data-layout-allow-overflow data-layout-allow-overlap>
    <span id="@root" style="display:contents">
    <div id="@world">
      __BODY__
    </div>
    <div id="@card"><span id="@chip">SCENE __N__</span><span id="@ttl">__TITLE__</span></div>
    <div id="@cap">__CHUNKS__</div>
    <div id="@flash"></div>
    <div id="@dip"></div>
    </span>
  </div>
  <script>
    (function () {
__RIG__
      var P = "#@", D = __D__;
      var CH = __CH__;
      var tl = gsap.timeline({ paused: true });
      gsap.set(P + "cap .chunk", { xPercent: -50 });
      gsap.set(P + "card", { xPercent: -50 });
      __ENTER__
      tl.fromTo(P + "card", { opacity: 0, y: -30, rotation: -3, xPercent: -50 }, { opacity: 1, y: 0, rotation: 0, duration: 0.4, ease: "back.out(1.8)" }, 0.08);
      CH.forEach(function (c) {
        var el = document.getElementById("@c" + c.i), ws = el.querySelectorAll(".w");
        tl.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.16, ease: "power3.out" }, Math.max(0, c.t0 + 0.02));
        c.words.forEach(function (tt, k) { tl.fromTo(ws[k], { opacity: 0.3 }, { opacity: 1, duration: 0.08 }, tt); });
        tl.to(el, { opacity: 0, duration: 0.06 }, c.t1 - 0.06);
      });
__JS__
      window.__timelines["__SID__"] = tl;
    })();
  </script>
</template>
'''


def dur_or(n, vd):
    return round(max(SLOTS[n - 1], LEAD + vd + TAIL + 0.3), 2)


hosts, auds, starts, Ds, t = [], [], [], [], 0.0
for n, s in enumerate(SC, 1):
    sid = "s%d" % n
    words, times, vd = word_times(LINES[n - 1], os.path.join(ROOT, "assets", "vo", "l%d.wav" % n))
    D = dur_or(n, vd)
    hi = [re.sub(r"[^a-z]", "", h.lower()) for h in s["hi"]]
    groups = chunks(words)
    hc, cc = [], []
    for ci, idx in enumerate(groups):
        spans = "".join('<span class="w%s">%s</span>' % (" hl" if re.sub(r"[^a-z]", "", words[i].lower()) in hi else "", words[i]) for i in idx)
        hc.append('<div class="chunk" id="@c%d">%s</div>' % (ci, spans))
        nxt = groups[ci + 1][0] if ci + 1 < len(groups) else None
        cc.append(dict(i=ci, t0=round(LEAD + times[idx[0]] - 0.08, 3),
                       t1=round(LEAD + times[nxt] - 0.08, 3) if nxt is not None else round(D - 0.2, 3),
                       words=[round(LEAD + times[i], 3) for i in idx]))
    html = (TPL.replace("__SID__", sid).replace("__EXTRA_CSS__", s["css"]).replace("__BODY__", "\n      ".join(s["parts"]))
            .replace("__N__", str(n)).replace("__TITLE__", s["title"]).replace("__CHUNKS__", "".join(hc))
            .replace("__RIG__", RIG).replace("__D__", str(D)).replace("__CH__", json.dumps(cc))
            .replace("__ENTER__", ENTER[s["enter"]]).replace("__JS__", s["js"]).replace("@", sid + "-"))
    open(os.path.join(ROOT, "compositions", sid + ".html"), "w", encoding="utf-8").write(html)
    hosts.append('      <div id="%s" data-composition-id="%s" data-composition-src="compositions/%s.html" data-start="%.2f" data-duration="%s" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>' % (sid, sid, sid, t, D))
    auds.append('      <audio id="vo-%d" class="clip" src="assets/vo/l%d.wav" data-start="%.2f" data-duration="%.2f" data-volume="1" data-track-index="%d"></audio>' % (n, n, t + LEAD, vd, 30 + n % 2))
    print("scene %2d start %6.2f  D %5.2f  voice %5.2f" % (n, t, D, vd))
    starts.append(t)
    Ds.append(D)
    t += D

TOTAL = round(t, 2)


def S(n, o=0.0):
    return round(starts[n - 1] + o, 3)


sfx = [
    ("a1", "impact-bass-1", S(1, 0.2), 2.0, 0.3), ("a2", "whoosh", S(2, 0.1), 0.6, 0.3),
    ("a3", "typing", S(3, 0.5), 1.4, 0.25), ("a3c", "click", S(3, 3.2), 0.4, 0.35),
    ("a4", "whoosh-short", S(4, 0.2), 0.5, 0.2), ("a5", "impact-bass-2", S(5, 2.4 - 1.986), 2.55, 0.35),
    ("a6", "whoosh", S(6, 0.2), 0.6, 0.3), ("a7", "impact-bass-1", S(7, 2.1), 2.0, 0.3),
    ("a8", "ping", S(8, 1.4), 1.3, 0.25), ("a9", "pop", S(9, 1.5), 0.6, 0.25), ("a9b", "pop", S(9, 4.5), 0.6, 0.2),
    ("a10", "glitch-3", S(10, 4.6), 1.2, 0.2), ("a11r", "riser", S(11, 0.5), 10.0, 0.2),
    ("a11", "impact-bass-1", S(11, 10.5), 2.0, 0.3), ("a12", "whoosh-short", S(12, Ds[11] - 1.0), 0.55, 0.3),
]
auds += ['      <audio id="%s" class="clip" src="assets/sfx/%s.mp3" data-start="%.2f" data-duration="%s" data-volume="%s" data-track-index="%d"></audio>'
         % (a, f, max(0, s_), d, v, 40 + k) for k, (a, f, s_, d, v) in enumerate(sfx)]

open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write("""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #05070c; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #05070c; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="__TOTAL__" data-width="1080" data-height="1920">
__HOSTS__
__AUDS__
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
""".replace("__TOTAL__", str(TOTAL)).replace("__HOSTS__", "\n".join(hosts)).replace("__AUDS__", "\n".join(auds)))
print("total", TOTAL, "starts", [round(x, 2) for x in starts])
