"""Spoiler review: Street Fighter (2026). Original figures in the film's roles; vertical 1080x1920.
Run from the project folder: python3 tools/gen.py"""
import json, math, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RIG = open(os.path.join(HERE, "rig.js")).read()
INK = "#1b1a18"
LEAD, TAIL = 0.2, 0.3
LINES = [l.strip() for l in open(os.path.join(HERE, "vo.txt"), encoding="utf-8") if l.strip()]

# original figures, cast by role (not the film's characters)
DIS = dict(skin="#c99a7a", hair="buzz", hairc="#1b1a18", suit="#1d2430", belt="#c9a227", brows="flat", mouth="flat")
RIV = dict(skin="#e8b898", hair="buzz", hairc="#d9a53a", suit="#e8862a", belt="#1b1a18", brows="flat", mouth="smile")
AGT = dict(skin="#d8a284", hair="long", hairc="#2a1e18", suit="#2f4a3a", chest="#c8262b", brows="flat", mouth="flat")
HAN = dict(skin="#b07c5a", hair="messy", suit="#8a6a3e", brows="flat", mouth="open", beard=True)
PRO = dict(skin="#e0c0a0", hair="buzz", hairc="#9aa3ab", suit="#2a2a3a", cape="#2a1420", belt="#e9c46a", brows="angry", mouth="smile")
MAS = dict(skin="#d0a880", hair="buzz", hairc="#e8e8e8", suit="#6a4a2a", beard=True, brows="flat", mouth="flat")


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


def ch(id_, kind, x, floor, W, opts=None):
    H = W * 380 / 260
    top = floor - 0.974 * H
    html = ('<div id="@%s" class="char" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;"></div>'
            % (id_, round(x - W / 2), round(top), round(W), round(H)))
    js = 'rig("@%s", "person", %s);' % (id_, json.dumps(opts or {}))
    return html, js


def box(css, id_=None):
    idp = ('id="@%s" ' % id_) if id_ else ""
    return '<div %sclass="abs" style="%s"></div>' % (idp, css)


def tbox(css, text, id_=None):
    idp = ('id="@%s" ' % id_) if id_ else ""
    return '<div %sclass="abs" style="%s">%s</div>' % (idp, css, text)


def bg(col, id_=None):
    return box("left:0;top:0;width:1080px;height:1920px;background:" + col, id_)


def svg(id_, x, y, w, h, vb, body, extra=""):
    idp = ('id="@%s" ' % id_) if id_ else ""
    return ('<svg %sclass="abs" viewBox="%s" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;overflow:visible;%s">%s</svg>'
            % (idp, vb, x, y, w, h, extra, body))


def burst(id_, x, y, s, cols=("#ffd36b", "#ff8a2a", "#fff6c8")):
    body = ""
    for k, (r, c) in enumerate(zip((1.0, 0.7, 0.4), cols)):
        pts = []
        for i in range(24):
            rr = (200 if i % 2 == 0 else 90) * r
            pts.append("%.0f,%.0f" % (math.cos(i * math.pi / 12) * rr, math.sin(i * math.pi / 12) * rr))
        body += '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%d" stroke-linejoin="round"/>' % (" ".join(pts), c, INK, 6 - k * 2)
    return svg(id_, x - 200 * s, y - 200 * s, 400 * s, 400 * s, "-200 -200 400 400", body, "opacity:0")


EMBER = svg("ember", 160, 200, 760, 1000, "0 0 760 1000",
            '<path d="M380 60 C560 60 640 260 620 520 C600 760 660 900 520 980 L240 980 C100 900 160 760 140 520 C120 260 200 60 380 60 Z" fill="#05040a"/>'
            '<ellipse cx="300" cy="330" rx="34" ry="14" fill="#ffb347"/><ellipse cx="460" cy="330" rx="34" ry="14" fill="#ffb347"/>', "opacity:0.9")
CROWD = svg("crowd", 0, 1300, 1080, 220, "0 0 1080 220",
            "".join('<rect x="%d" y="%d" width="90" height="220" rx="40" fill="#120c18"/>' % (x, 40 + (x * 13) % 40) for x in range(-20, 1100, 80)))
CHECK = svg("check", 390, 380, 300, 260, "0 0 300 260",
            '<path d="M30 140 L120 230 L270 40" fill="none" stroke="#4f9a3a" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>', "opacity:0")
BALANCE = (box("left:530px;top:700px;width:20px;height:820px;background:#5a4a3e")
           + box("left:430px;top:1500px;width:220px;height:30px;background:#5a4a3e"))
WALLET = svg("wallet", 0, 0, 1080, 1920, "0 0 1080 1920", '<rect x="120" y="1000" width="110" height="70" rx="10" fill="#6a4a2a" stroke="%s" stroke-width="6"/>' % INK, "opacity:1")

SC = []


def scene(title, hi, enter, parts, js, css=""):
    SC.append(dict(title=title, hi=hi, enter=enter, parts=parts, js=js, css=css))


# 1 — opening hook
pro, jpro = ch("pro", "person", 540, 1440, 400, PRO)
cards = "".join(tbox("left:%dpx;top:%dpx;padding:14px 26px;background:#f4ede0;border:6px solid %s;border-radius:14px;font-family:'Archivo Black';font-size:46px;color:%s;white-space:nowrap" % (x, y, INK, INK), t, "k%d" % i)
                for i, (t, x, y) in enumerate([("FIREBALLS", 120, 420), ("TOURNAMENT", 540, 620), ("DEMON", 140, 900), ("POWER SUPPLY", 470, 1100)]))
scene("THE OPENING", ["fireballs", "demonic", "power", "supply"], "dip",
      [bg("#1a1424"), EMBER, pro, cards],
      jpro + r'''
  tl.fromTo("#@ember", { opacity: 0.3 }, { opacity: 0.9, duration: 1.2, yoyo: true, repeat: Math.ceil(D / 1.2), ease: "sine.inOut" }, 0);
  [0, 1, 2, 3].forEach(function (i) { tl.fromTo("#@k" + i, { opacity: 0, y: 30, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2)" }, 1.0 + i * 1.6); });
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.06, duration: D, ease: "sine.inOut", transformOrigin: "50% 40%" }, 0);
''')

# 2 — backstory: master, two students part ways
mas, jmas = ch("mas", "person", 540, 1440, 320, MAS)
dis, jdis = ch("dis", "person", 320, 1440, 340, DIS)
riv, jriv = ch("riv", "person", 760, 1440, 340, RIV)
scene("BACKSTORY", ["gouken", "brothers", "spotlight", "celebrity"], "cut",
      [bg("#2a3248"), mas,
       svg("spot", 0, 0, 1080, 1920, "0 0 1080 1920", '<polygon points="700,900 1000,900 1080,1440 660,1440" fill="#f6d48a"/>', "opacity:0.05"),
       dis, riv],
      jmas + jdis + jriv + r'''
  tl.fromTo("#@dis", { x: 0 }, { x: -170, duration: 3.0, ease: "power1.inOut" }, 2.0);
  walk(tl, "@dis", 2.0, 3.0, 0.2);
  tl.fromTo("#@riv", { x: 0 }, { x: 120, duration: 3.0, ease: "power1.inOut" }, 2.0);
  walk(tl, "@riv", 2.0, 3.0, 0.2);
  tl.fromTo("#@spot", { opacity: 0.05 }, { opacity: 0.35, duration: 3.0 }, 2.0);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.05, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 3 — fame versus talent
crowd_shadow = box("left:0;top:0;width:480px;height:1920px;background:#000;opacity:0.55")
dis3, jdis3 = ch("dis", "person", 240, 1440, 340, DIS)
riv3, jriv3 = ch("riv", "person", 640, 1440, 340, RIV)
scene("FAME VERSUS TALENT", ["fame", "talent", "measuring"], "cut",
      [bg("#2a1f36"),
       svg("spot3", 0, 0, 1080, 1920, "0 0 1080 1920", '<polygon points="560,500 1000,500 1100,1440 520,1440" fill="#f6d48a"/>', "opacity:0.22"),
       CROWD, riv3, crowd_shadow, dis3],
      jdis3 + jriv3 + r'''
  tl.fromTo("#@riv .armR", { rotation: 0 }, { rotation: -150, duration: 0.6, ease: "back.out(2)" }, 1.0);
  tl.fromTo("#@root .abs", { y: 0 }, { y: 0 }, 0);
  tl.fromTo("#@world", { scale: 1.04 }, { scale: 1.0, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 4 — the darker power
dis4, jdis4 = ch("dis", "person", 540, 1440, 380, DIS)
scene("THE DARKER POWER", ["akuma", "darker", "power", "refusal"], "flash",
      [bg("#1b1420"), EMBER, dis4],
      jdis4 + r'''
  tl.fromTo("#@ember", { opacity: 0.4 }, { opacity: 1, duration: 0.9, yoyo: true, repeat: Math.ceil(D / 0.9), ease: "sine.inOut" }, 0);
  tl.to("#@dis .head", { rotation: -22, duration: 0.8, ease: "power2.inOut" }, 1.0);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.1, duration: D, ease: "sine.inOut", transformOrigin: "50% 30%" }, 0);
''')

# 5 — the tournament: the energy drain
pro5, jpro5 = ch("pro", "person", 540, 980, 300, PRO)
bars = ""
for i, (lab, col) in enumerate([("THE DISCIPLE", "#c9a227"), ("THE RIVAL", "#e8862a"), ("THE AGENT", "#4f9a3a")]):
    y = 1480 + i * 110
    bars += tbox("left:120px;top:%dpx;font-family:'Archivo Black';font-size:34px;color:#f4ede0" % (y - 46), lab)
    bars += box("left:120px;top:%dpx;width:640px;height:34px;background:#3a3044;border:4px solid %s" % (y, INK))
    bars += box("left:124px;top:%dpx;width:632px;height:26px;background:%s;transform-origin:0 50%%" % (y + 4, col), "fill%d" % i)
scene("THE TOURNAMENT", ["tournament", "energy", "supernatural", "drain"], "cut",
      [bg("#241a2c"), box("left:260px;top:980px;width:560px;height:60px;background:#4a3a5a;border:6px solid %s" % INK), pro5, bars],
      jpro5 + r'''
  tl.fromTo("#@pro .armR", { rotation: 0 }, { rotation: -120, duration: 0.6, ease: "back.out(2)" }, 0.5);
  for (var i = 0; i < 3; i++) { tl.to("#@fill" + i, { scaleX: 0.2, duration: 2.2, ease: "power1.inOut" }, 1.5 + i * 1.2); }
  tl.fromTo("#@world", { scale: 1.05 }, { scale: 1.0, duration: D, ease: "sine.inOut", transformOrigin: "50% 40%" }, 0);
''')

# 6 — the undercover agent card flips
agt, jagt = ch("agt", "person", 540, 1440, 400, AGT)
cardA = tbox("left:110px;top:300px;width:860px;padding:18px;text-align:center;font-family:'Archivo Black';font-size:62px;background:#f4ede0;border:6px solid %s;border-radius:16px" % INK, "HOST'S ASSISTANT", "cardA")
cardB = tbox("left:110px;top:300px;width:860px;padding:18px;text-align:center;font-family:'Archivo Black';font-size:62px;background:#c8262b;color:#fff;border:6px solid %s;border-radius:16px;opacity:0" % INK, "UNDERCOVER AGENT", "cardB")
scene("THE HIDDEN AGENDA", ["undercover", "interpol", "revenge", "agendas"], "cut",
      [bg("#1e2a2a"), agt, cardA, cardB],
      jagt + r'''
  tl.fromTo("#@cardB", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 3.5);
  tl.to("#@cardA", { opacity: 0, duration: 0.2 }, 3.4);
  tl.to("#@agt .armR", { rotation: -60, duration: 0.4, ease: "back.out(2)" }, 3.0);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.06, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 7 — what works: the rivalry clash
dis7, jdis7 = ch("dis", "person", 360, 1440, 340, DIS)
riv7, jriv7 = ch("riv", "person", 720, 1440, 340, RIV)
scene("WHAT WORKS: THE RIVALRY", ["rivalry", "clash", "comedy", "relationship"], "cut",
      [bg("#2b2330"), burst("pop7", 540, 900, 1.1), dis7, riv7],
      jdis7 + jriv7 + r'''
  tl.to("#@dis", { x: 120, duration: 0.2, ease: "power3.in" }, 1.0);
  tl.to("#@riv", { x: -120, duration: 0.2, ease: "power3.in" }, 1.0);
  tl.fromTo("#@pop7", { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2.4)" }, 1.15);
  tl.to("#@pop7", { opacity: 0, duration: 0.3 }, 1.7);
  tl.to(["#@dis", "#@riv"], { x: 0, duration: 0.5, ease: "power2.out" }, 1.7);
  tl.fromTo("#@dis", { x: 0 }, { x: 120, duration: 0.2, yoyo: true, repeat: 3, ease: "power3.in", immediateRender: false }, 3.5);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.05, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 8 — that's the kind of scene: a check mark
dis8, jdis8 = ch("dis", "person", 360, 1440, 340, DIS)
riv8, jriv8 = ch("riv", "person", 720, 1440, 340, RIV)
scene("WHAT WORKS: CHEMISTRY", ["recognizable", "personalities", "relationship", "scene"], "cut",
      [bg("#2b2330"), CHECK, dis8, riv8],
      jdis8 + jriv8 + r'''
  tl.fromTo("#@check", { opacity: 0, scale: 2.2, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2)" }, 1.2);
  tl.to("#@riv .armR", { rotation: -110, duration: 0.3, ease: "back.out(2)" }, 1.4);
  tl.fromTo("#@world", { scale: 1.04 }, { scale: 1.0, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 9 — Dan: the surprise
han, jhan = ch("han", "person", 200, 1440, 320, HAN)
riv9, jriv9 = ch("riv", "person", 760, 1440, 340, RIV)
scene("A WELCOME SURPRISE", ["dan", "loyalty", "surprise", "matter"], "cut",
      [bg("#3a3a2a"), WALLET, han, riv9, tbox("left:360px;top:420px;font-family:'Archivo Black';font-size:110px;color:#f6c744;-webkit-text-stroke:8px #1b1a18;paint-order:stroke fill;opacity:0", "LOYAL", "loyal")],
      jhan + jriv9 + r'''
  walk(tl, "@han", 0.8, 2.6, 0.18);
  tl.fromTo("#@han", { x: 0 }, { x: 330, duration: 2.6, ease: "power1.inOut" }, 0.8);
  tl.fromTo("#@loyal", { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 4.0);
  tl.fromTo("#@world", { scale: 1.04 }, { scale: 1.0, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 10 — tournament loses momentum: bracket with forfeits
board = box("left:140px;top:360px;width:800px;height:760px;background:#f4ede0;border:8px solid %s;border-radius:12px" % INK)
brackets = svg("brk", 0, 0, 1080, 1920, "0 0 1080 1920",
               "".join('<path d="M220 %d L860 %d" stroke="%s" stroke-width="6"/>' % (y, y, INK) for y in range(460, 1080, 110)))
stamps = "".join(tbox("left:%dpx;top:%dpx;padding:8px 24px;border:8px solid #c8262b;color:#c8262b;font-family:'Archivo Black';font-size:58px;background:rgba(244,237,224,0.95);border-radius:12px;transform:rotate(%ddeg);opacity:0" % (x, y, r), "FORFEIT", "st%d" % i)
                 for i, (x, y, r) in enumerate([(300, 500, -8), (330, 780, 6), (300, 1000, -4)]))
scene("LOSES MOMENTUM", ["forfeits", "offscreen", "arcade", "unplugged"], "cut",
      [bg("#2a2a33"), board, brackets, box("left:0;top:1380px;width:1080px;height:540px;background:#3a3a44"), stamps],
      r'''
  [0, 1, 2].forEach(function (i) { tl.fromTo("#@st" + i, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, 1.2 + i * 2.6); });
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.05, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 11 — Ken-style motive: three thought bubbles
riv11, jriv11 = ch("riv", "person", 540, 1440, 380, RIV)
bubbles = "".join(tbox("left:%dpx;top:%dpx;padding:14px 26px;background:#f4ede0;border:6px solid %s;border-radius:22px;font-family:'Archivo Black';font-size:50px;color:%s;white-space:nowrap;opacity:0" % (x, y, INK, INK), t, "b%d" % i)
                  for i, (t, x, y) in enumerate([("BEAT HIM?", 120, 340), ("HONOR HIM?", 500, 520), ("FEEL ENOUGH?", 200, 720)]))
scene("THE RIVAL'S MOTIVE", ["beat", "honor", "enough", "motives"], "cut",
      [bg("#2b2a40"), riv11, bubbles],
      jriv11 + r'''
  [0, 1, 2].forEach(function (i) { tl.fromTo("#@b" + i, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, 1.5 + i * 2.2); });
  tl.to("#@riv .head", { rotation: -10, duration: 1.0, ease: "sine.inOut" }, 2.0);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.05, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 12 — repeated flashbacks: a filmstrip
dis12, jdis12 = ch("dis", "person", 540, 1440, 380, DIS)
def _panel(i, c):
    x = 60 + i * 250
    inner = ('<div class="abs" style="left:85px;top:28px;width:50px;height:50px;border-radius:50%%;background:#c99a7a"></div>'
             '<div class="abs" style="left:62px;top:84px;width:96px;height:72px;border-radius:22px;background:#1d2430"></div>')
    return ('<div id="@f%d" class="abs" style="left:%dpx;top:260px;width:220px;height:170px;background:%s;border:6px solid #0b0b12">%s</div>'
            % (i, x, c, inner))
strip = "".join(_panel(i, c) for i, c in enumerate(["#3a3a5a", "#5a3a4a", "#3a5a4a", "#5a4a3a"]))
scene("REPEATED FLASHBACKS", ["flashbacks", "animated", "interrupts", "momentum"], "flash",
      [bg("#1a1a2a"), strip, dis12],
      jdis12 + r'''
  [0, 1, 2, 3].forEach(function (i) { tl.fromTo("#@f" + i, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(2)" }, 0.8 + i * 1.8); });
  tl.fromTo("#@dis .armR", { rotation: 0 }, { rotation: -70, duration: 0.5, ease: "back.out(2)" }, 2.0);
  blink(tl, "@dis", 5.0);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.05, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 13 — effects compete with the martial arts
dis13, jdis13 = ch("dis", "person", 380, 1440, 300, DIS)
riv13, jriv13 = ch("riv", "person", 700, 1440, 300, RIV)
scene("SPECTACLE OVER SKILL", ["effects", "compete", "spectacle", "matter"], "flash",
      [bg("#2e1e1e"), burst("boom13", 540, 760, 1.6), dis13, riv13],
      jdis13 + jriv13 + r'''
  tl.fromTo("#@boom13", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 1.0);
  tl.fromTo("#@boom13", { opacity: 1 }, { opacity: 0.3, duration: 0.15, yoyo: true, repeat: 8, ease: "steps(1)", immediateRender: false }, 1.3);
  shake(tl, "#@world", 1.0, 18, 8);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.06, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 14 — the verdict: the scale tips toward the roster
scene("FINAL VERDICT", ["strongest", "ridiculous", "weakest", "enthusiasm", "storytelling"], "dip",
      [bg("#2a2430"), BALANCE,
       svg("bal", 0, 0, 1080, 1920, "0 0 1080 1920",
           '<g id="@beamg">'
           '<rect x="200" y="692" width="680" height="16" fill="#c9a227" stroke="%s" stroke-width="4"/>'
           '<path d="M200 700 L150 748 M200 700 L250 748 M880 700 L830 748 M880 700 L930 748" stroke="%s" stroke-width="5"/>'
           '<rect x="110" y="748" width="180" height="110" rx="10" fill="#f4ede0" stroke="%s" stroke-width="6"/>'
           '<rect x="790" y="748" width="180" height="110" rx="10" fill="#f4ede0" stroke="%s" stroke-width="6"/>'
           '<text x="200" y="816" text-anchor="middle" font-family="Archivo Black" font-size="22" fill="%s">CHARACTERS</text>'
           '<text x="880" y="816" text-anchor="middle" font-family="Archivo Black" font-size="26" fill="%s">STORY</text>'
           '<circle cx="540" cy="700" r="18" fill="#c9a227" stroke="%s" stroke-width="5"/></g>'
           % (INK, INK, INK, INK, INK, INK, INK)),
      ],
      r'''
  gsap.set("#@beamg", { svgOrigin: "540 700" });
  tl.fromTo("#@beamg", { rotation: 0 }, { rotation: -9, duration: 1.4, ease: "back.out(1.2)" }, 0.6);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.05, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 15 — the score
scene("THE SCORE", ["ign", "score", "middle", "ground"], "flash",
      [bg("#2a2430"),
       tbox("left:140px;top:640px;width:800px;padding:20px 0;text-align:center;font-family:'Archivo Black';font-size:300px;line-height:1;color:#f6c744;background:#c8262b;border:16px solid %s;border-radius:24px" % INK, "6/10", "score"),
       tbox("left:140px;top:1000px;width:800px;text-align:center;font-family:'Archivo Black';font-size:52px;color:#f4ede0", "IGN", "src")],
      r'''
  tl.fromTo("#@score", { opacity: 0, scale: 2.4, rotation: -10 }, { opacity: 1, scale: 1, rotation: -4, duration: 0.35, ease: "back.out(2)" }, 0.6);
  tl.fromTo("#@src", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.2);
  tl.fromTo("#@world", { scale: 1.04 }, { scale: 1.0, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
''')

# 16 — closing
dis16, jdis16 = ch("dis", "person", 400, 1440, 340, DIS)
riv16, jriv16 = ch("riv", "person", 700, 1440, 340, RIV)
scene("THE CLOSE", ["roster", "hits", "another", "round"], "dip",
      [box("left:0;top:0;width:1080px;height:1920px;background:linear-gradient(#f4b860,#fbe3a0)"),
       box("left:0;top:1400px;width:1080px;height:520px;background:#5a3a30"), dis16, riv16,
       tbox("left:150px;top:420px;font-family:'Archivo Black';font-size:120px;color:#1b1a18;text-align:center;width:780px;opacity:0", "ROUND TWO?", "rt")],
      jdis16 + jriv16 + r'''
  tl.fromTo("#@rt", { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 3.6);
  tl.fromTo("#@dip", { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.in", immediateRender: false }, D - 0.9);
  tl.fromTo("#@world", { scale: 1.05 }, { scale: 1.0, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
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

hosts, auds, starts, Ds, t = [], [], [], [], 0.0
assert len(SC) == len(LINES) == 16, (len(SC), len(LINES))
for n, s in enumerate(SC, 1):
    sid = "s%d" % n
    words, times, vd = word_times(LINES[n - 1], os.path.join(ROOT, "assets", "vo", "l%d.wav" % n))
    D = round(max(6.0, LEAD + vd + TAIL + 0.5), 2)
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
    html = (TPL.replace("__SID__", sid).replace("__BODY__", "\n      ".join(s["parts"]))
            .replace("__N__", str(n)).replace("__TITLE__", s["title"]).replace("__CHUNKS__", "".join(hc))
            .replace("__RIG__", RIG).replace("__D__", str(D)).replace("__CH__", json.dumps(cc))
            .replace("__ENTER__", ENTER[s["enter"]]).replace("__JS__", s["js"]).replace("@", sid + "-"))
    open(os.path.join(ROOT, "compositions", sid + ".html"), "w", encoding="utf-8").write(html)
    hosts.append('      <div id="%s" data-composition-id="%s" data-composition-src="compositions/%s.html" data-start="%.2f" data-duration="%s" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>' % (sid, sid, sid, t, D))
    auds.append('      <audio id="vo-%d" class="clip" src="assets/vo/l%d.wav" data-start="%.2f" data-duration="%.2f" data-volume="1" data-track-index="%d"></audio>' % (n, n, t + LEAD, vd, 30 + n % 2))
    print("scene %2d start %6.2f  D %5.2f  voice %5.2f  %s" % (n, t, D, vd, s["title"]))
    starts.append(t)
    Ds.append(D)
    t += D

TOTAL = round(t, 2)


def S(n, o=0.0):
    return round(starts[n - 1] + o, 3)


sfx = [
    ("a1", "impact-bass-1", S(1, 0.2), 2.0, 0.3), ("a2", "whoosh", S(2, 0.1), 0.6, 0.3),
    ("a3", "typing", S(3, 0.5), 1.4, 0.2), ("a4", "impact-bass-1", S(4, 0.2), 2.0, 0.3),
    ("a6", "whoosh", S(6, 0.2), 0.6, 0.3), ("a7", "click", S(7, 1.0), 0.4, 0.35),
    ("a8", "pop", S(8, 1.2), 0.6, 0.3), ("a9", "whoosh-short", S(9, 0.8), 0.5, 0.25),
    ("a10", "glitch-3", S(10, 1.2), 1.2, 0.2), ("a13", "impact-bass-2", S(13, 1.0 - 1.986 + 0.5), 2.55, 0.35),
    ("a14", "riser", S(14, 1.0), 10.0, 0.18), ("a15", "pop", S(15, 0.6), 0.6, 0.3),
    ("a16", "impact-bass-1", S(16, 3.6), 2.0, 0.3),
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
print("total", TOTAL)
