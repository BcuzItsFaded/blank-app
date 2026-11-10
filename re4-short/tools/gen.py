"""RESIDENT EVIL 4 recap, flat-cartoon VERTICAL SHORT (1080x1920). Run: python3 tools/gen.py"""
import json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RIG = open(os.path.join(HERE, "rig.js")).read()
INK, CREAM, OR = "#1b1a18", "#f4ede0", "#d97757"
LEAD, TAIL, LAST_HOLD = 0.2, 0.25, 1.5
LINES = [l.strip() for l in open(os.path.join(HERE, "vo.txt")) if l.strip()]

# ---------- timing from the voice ----------
def dur(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode())
def word_times(text, f):
    out = subprocess.run(["ffmpeg", "-i", f, "-af", "silencedetect=n=-38dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    D = dur(f)
    st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]; en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    on = en[0] if st and st[0] < 0.02 and en else 0.0
    off = st[-1] if st and st[-1] > D - 0.6 else D
    pauses = [(a, b) for a, b in zip(st, en) if a > on + 0.05 and b < off - 0.05]
    words = text.replace("...", "… ").split()
    w = [max(2, len(re.sub(r"[^\w']", "", x))) + 1 for x in words]
    brk = [i for i, x in enumerate(words) if re.search(r"[,.…?!—]$", x)][: len(pauses)]
    segs, pi, pt = [], 0, on
    for i, (ps, pe) in zip(brk, pauses): segs.append((pi, i + 1, pt, ps)); pi, pt = i + 1, pe
    segs.append((pi, len(words), pt, off))
    times = [0.0] * len(words)
    for a, b, t0, t1 in segs:
        tot = sum(w[a:b]) or 1; t = t0
        for k in range(a, b): times[k] = round(t, 3); t += (t1 - t0) * w[k] / tot
    return words, times, D
def chunks(words, maxw=5):
    out, cur = [], []
    for i, x in enumerate(words):
        cur.append(i)
        if len(cur) >= maxw or (re.search(r"[.?!…—]$", x) and len(cur) >= 3) or (x.endswith(",") and len(cur) >= 3):
            out.append(cur); cur = []
    if cur:
        if out and len(cur) < 3: out[-1] += cur
        else: out.append(cur)
    return out

# ---------- drawing helpers ----------
def ch(id_, kind, x, floor, W, opts=None, z=None, flip=False):
    if kind == "person": H = W * 380 / 260; top = floor - 0.974 * H
    else: H = W; top = floor - H
    zs = f"z-index:{z};" if z is not None else ""
    cls = "char flip" if flip else "char"
    return (f'<div id="@{id_}" class="{cls}" style="left:{x - W/2:.0f}px;top:{top:.0f}px;width:{W:.0f}px;height:{H:.0f}px;{zs}"></div>',
            f'rig("@{id_}", "{kind}", {json.dumps(opts or {})});')
def box(css, id_=None, cls="abs"): return f'<div {"id=\"@" + id_ + "\" " if id_ else ""}class="{cls}" style="{css}"></div>'
def svg(id_, x, y, w, h, vb, body, extra=""):
    return f'<svg {"id=\"@" + id_ + "\" " if id_ else ""}class="abs" viewBox="{vb}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;overflow:visible;{extra}">{body}</svg>'
def house(x, y, w, h, col="#3a4256", lit=True):
    win = "".join(f'<rect x="{wx}" y="{h*0.45:.0f}" width="{w*0.16:.0f}" height="{h*0.22:.0f}" fill="{"#e9b35a" if lit else "#232a38"}"/>' for wx in (w * 0.18, w * 0.62))
    return svg(None, x, y, w, h * 1.5, f"0 {-h*0.5:.0f} {w} {h*1.5:.0f}",
               f'<path d="M-8 0 L{w/2} {-h*0.5:.0f} L{w+8} 0 Z" fill="#2a3042"/><rect x="0" y="0" width="{w}" height="{h}" fill="{col}"/>{win}<rect x="{w*0.42:.0f}" y="{h*0.6:.0f}" width="{w*0.16:.0f}" height="{h*0.4:.0f}" fill="#232a38"/>')
def tree(x, y, s=1, col="#1f2a33"):
    return svg(None, x, y, 120 * s, 260 * s, "0 0 120 260", f'<path d="M60 0 L110 120 L80 120 L120 210 L0 210 L40 120 L10 120 Z" fill="{col}"/><rect x="52" y="210" width="16" height="50" fill="{col}"/>')
def bolt(id_, x, y, s=1):
    return svg(id_, x, y, 200 * s, 520 * s, "0 0 200 520", '<path d="M120 0 L40 230 L110 230 L20 520 L180 190 L105 190 L170 0 Z" fill="#f4f0d0" stroke="#1b1a18" stroke-width="6"/>', "opacity:0")

SC = []
FOCUS = []
def scene(title, hi, enter, bg, parts, js, css=""):
    SC.append(dict(title=title, hi=hi, enter=enter, bg=bg, parts=parts, js=js, css=css))

LEON = dict(skin="#efc4a2", hair="leon", jacket=True, suit="#7a5236", brows="angry")
ASH = dict(skin="#f2c6a6", hair="bob", suit="#e08a3a", brows="sad", lashes=True)
ADA = dict(skin="#f0c8a8", hair="blackbob", suit="#c4262b", dress="#c4262b", brows="flat", lashes=True)
GAN = dict(suit="#6b5038", brows="angry", pupil="#e0402a", mouth="open")
def burst(id_, x, y, s, cols=("#ffd36b", "#ff8a2a", "#fff6c8")):
    import math
    body = ""
    for k, (r, c) in enumerate(zip((1.0, 0.7, 0.4), cols)):
        pts = []
        for i in range(24):
            a = i * math.pi / 12; rr = (200 if i % 2 == 0 else 90) * r
            pts.append(f"{math.cos(a)*rr:.0f},{math.sin(a)*rr:.0f}")
        body += f'<polygon class="bl{k}" points="{" ".join(pts)}" fill="{c}" stroke="#1b1a18" stroke-width="{6 - k*2}" stroke-linejoin="round"/>'
    return svg(id_, x - 200 * s, y - 200 * s, 400 * s, 400 * s, "-200 -200 400 400", body, "opacity:0")
BOOM_JS = lambda sel, t: f'''
  tl.set("{sel}", {{ opacity: 1 }}, {t});
  tl.fromTo("{sel}", {{ scale: 0.1, rotation: 0 }}, {{ scale: 1.1, rotation: 20, duration: 0.35, ease: "expo.out" }}, {t});
  tl.to("{sel}", {{ scale: 1.3, opacity: 0, duration: 0.5, ease: "power2.in" }}, {t} + 0.6);'''

# 1 THE MISSION — the missing poster, Leon arrives
poster = ('<div class="abs" style="left:770px;top:150px;width:380px;height:330px;background:#f4ede0;border:6px solid #1b1a18;border-radius:10px">'
          '<div style="position:absolute;left:0;top:14px;width:100%;text-align:center;font-family:Archivo Black;font-size:46px;color:#c8262b">MISSING</div>'
          '<div id="@ashmini" class="char" style="position:absolute;left:110px;top:70px;width:160px;height:234px;overflow:hidden"></div>'
          '<div style="position:absolute;left:0;bottom:10px;width:100%;text-align:center;font-family:Archivo Black;font-size:30px;color:#1b1a18;background:#f4ede0">ASHLEY GRAHAM</div></div>')
hl, jl = ch("leon", "person", 960, 1090, 330, dict(LEON))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#3a3346"),
         tree(560, 300, 1.6, "#241f2c"), tree(1210, 280, 1.7, "#241f2c"), tree(1340, 360, 1.3, "#2b2534"),
         box("left:600px;top:560px;width:720px;height:520px;background:#4a4238;clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)"),
         box("left:0;top:520px;width:1920px;height:90px;background:#6a6478;opacity:0.5", "fog"),
         '<div id="@poster" class="abs" style="left:0;top:0;width:1920px;height:1080px">' + poster + "</div>", hl]
scene("THE MISSION", ["president's", "daughter", "leon", "kennedy"], "cut", "#3a3346", parts, jl + '\n  rig("@ashmini", "person", ' + json.dumps(dict(ASH, brows="flat", mouth="smile")) + ''');
  tl.fromTo("#@poster", { y: -500, rotation: -6 }, { y: 0, rotation: 2, duration: 0.6, ease: "back.out(1.4)", transformOrigin: "50% 15%" }, 0.15);
  tl.to("#@poster", { rotation: -1.5, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: 3, transformOrigin: "50% 15%" }, 0.75);
  tl.fromTo("#@leon", { scale: 0.72, y: -60 }, { scale: 1, y: 0, duration: 2.6, ease: "power1.out", transformOrigin: "50% 100%" }, 0.3);
  walk(tl, "@leon", 0.3, 2.6, 0.16);
  tl.fromTo("#@fog", { x: -200 }, { x: 200, duration: D, ease: "none" }, 0);
  tl.to("#@leon .armR", { rotation: -82, duration: 0.3, ease: "back.out(2)" }, 3.6);
  blink(tl, "@leon", 2.4);
''')
FOCUS.append([(0, 960)])

# 2 THE VILLAGE — infected villagers, a plaga bursts from a head
plaga = '<path d="M0 120 C-30 60 40 40 10 -10 C-10 -40 30 -60 20 -90" stroke="#6a8f3a" stroke-width="22" fill="none" stroke-linecap="round"/><circle cx="20" cy="-96" r="22" fill="#8fbf4a" stroke="#1b1a18" stroke-width="5"/><path d="M6 -112 L-14 -136 M34 -112 L52 -136" stroke="#1b1a18" stroke-width="5"/>'
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#7a6a5a"),
         house(560, 330, 260, 170, "#5a4a3e", False), house(1120, 300, 300, 190, "#5a4a3e", False),
         box("left:0;top:640px;width:1920px;height:440px;background:#5a4a38")]
js = ""
for k, (x, sk) in enumerate([(790, "#c99a7a"), (960, "#b88462"), (1130, "#d9a581")]):
    hh, jj = ch(f"g{k}", "person", x, 900, 240, dict(GAN, skin=sk, fork=(k == 0), torch=(k == 2)))
    parts.append(hh); js += jj
parts.append(svg("plaga", 920, 330, 120, 240, "-60 -140 120 260", plaga, "opacity:0"))
scene("THE VILLAGE", ["las", "plagas", "infected"], "whip", "#7a6a5a", parts, js + r'''
  for (var k = 0; k < 3; k++) {
    tl.fromTo("#@g" + k, { y: 0 }, { y: -10, duration: 0.3 + k * 0.05, yoyo: true, repeat: 9, ease: "sine.inOut" }, k * 0.1);
    tl.fromTo("#@g" + k + " .head", { rotation: -8 }, { rotation: 8, duration: 0.6 + k * 0.1, yoyo: true, repeat: 4, ease: "sine.inOut" }, 0.2 + k * 0.15);
  }
  tl.set("#@plaga", { opacity: 1 }, 3.4);
  tl.fromTo("#@plaga", { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.35, ease: "back.out(2.4)" }, 3.4);
  tl.fromTo("#@plaga", { rotation: -8 }, { rotation: 8, duration: 0.25, yoyo: true, repeat: 9, ease: "sine.inOut", transformOrigin: "50% 100%", immediateRender: false }, 3.8);
  shake(tl, "#@world", 3.45, 12, 8);
''')
FOCUS.append([(0, 960)])

# 3 THE CHAINSAW
hl, jl = ch("leon", "person", 830, 930, 280, dict(LEON, look=6, brows="sad", mouth="open", gun=True))
hc, jc = ch("saw", "person", 1080, 940, 360, dict(skin="#b88462", suit="#4a3a2e", sack=True, chainsaw=True))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#5a3e30"),
         house(620, 380, 240, 150, "#3e2c22", True), house(1160, 360, 260, 160, "#3e2c22", True),
         box("left:0;top:660px;width:1920px;height:420px;background:#3e2c22")]
js = ""
for k, (x, opt) in enumerate([(700, dict(torch=True)), (1250, dict(fork=True))]):
    hh, jj = ch(f"v{k}", "person", x, 720, 160, dict(GAN, skin="#c99a7a", **opt)); parts.append(hh); js += jj
parts += [hl, hc]
scene("THE CHAINSAW", ["chainsaw", "wants", "leon", "dead"], "cut", "#5a3e30", parts, jl + jc + js + r'''
  tl.fromTo("#@saw .blade", { x: 0 }, { x: 4, duration: 0.04, yoyo: true, repeat: Math.round(D / 0.04) - 1, ease: "none" }, 0);
  tl.to("#@saw .armR", { rotation: -40, duration: 0.3, ease: "power2.out" }, 0.6);
  tl.fromTo("#@saw", { x: 120 }, { x: 0, duration: 1.6, ease: "power2.out" }, 0.3);
  tl.fromTo("#@leon", { x: 0 }, { x: -50, duration: 1.2, ease: "power2.out" }, 0.8);
  tl.to("#@leon .armR", { rotation: -80, duration: 0.25, ease: "back.out(2)" }, 1.0);
  tl.to("#@saw .armR", { rotation: -70, duration: 0.2, ease: "power3.in" }, 2.6);
  shake(tl, "#@world", 2.8, 18, 10);
  tl.fromTo(["#@v0", "#@v1"], { y: 0 }, { y: -14, duration: 0.2, yoyo: true, repeat: 7, stagger: 0.1 }, 1.4);
''')
FOCUS.append([(0, 960)])

# 4 ASHLEY — the church, both infected
glass = "".join(f'<path d="M0 0 L{150*__import__("math").cos(a):.0f} {150*__import__("math").sin(a):.0f} A150 150 0 0 1 {150*__import__("math").cos(a+0.785):.0f} {150*__import__("math").sin(a+0.785):.0f} Z" fill="{c}" stroke="#1b1a18" stroke-width="6"/>' for a, c in zip([i * 0.785 for i in range(8)], ["#c4473a", "#3a6a9a", "#e9c46a", "#4f7a4a"] * 2))
ha, ja = ch("ash", "person", 1070, 900, 280, dict(ASH, look=-6))
hl, jl = ch("leon", "person", 840, 910, 300, dict(LEON, look=6, brows="flat"))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2e2a3a"),
         svg(None, 810, 110, 300, 300, "-150 -150 300 300", glass),
         box("left:0;top:640px;width:1920px;height:440px;background:#3e3448"),
         ha, hl,
         box("left:1043px;top:640px;width:54px;height:54px;border-radius:50%;background:#8fbf4a;border:5px solid #1b1a18;opacity:0", "pa"),
         box("left:810px;top:625px;width:60px;height:60px;border-radius:50%;background:#8fbf4a;border:5px solid #1b1a18;opacity:0", "pl"),
         '<div id="@say" class="say" style="left:1020px;top:380px">Leon!</div>',
         '<div id="@stamp" class="abs stamp">INFECTED</div>']
scene("ASHLEY", ["ashley", "infected", "both"], "dip", "#2e2a3a", parts, ja + jl + r'''
  say(tl, "#@say", 0.5, 1.2);
  tl.to("#@ash .armL", { rotation: 60, duration: 0.3, ease: "back.out(2)" }, 0.6);
  tl.to("#@leon .armR", { rotation: -50, duration: 0.3, ease: "back.out(2)" }, 0.9);
  ["#@pa", "#@pl"].forEach(function (s, k) { tl.fromTo(s, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.4)" }, 2.6 + k * 0.15); tl.to(s, { scale: 1.2, duration: 0.3, yoyo: true, repeat: 3 }, 3.0 + k * 0.15); });
  tl.fromTo("#@stamp", { opacity: 0, scale: 1.8, rotation: -14 }, { opacity: 1, scale: 1, rotation: -8, duration: 0.22, ease: "power3.in" }, 3.0);
  tl.to("#@leon .eyes", { scale: 1.2, duration: 0.2, svgOrigin: "0 -124" }, 3.1);
  blink(tl, "@ash", 1.9);
''', css='#@root .stamp{left:760px;top:300px;padding:6px 26px;border:8px solid #c8262b;color:#c8262b;font-family:"Archivo Black";font-size:72px;background:rgba(244,237,224,.9);border-radius:12px;opacity:0}')
FOCUS.append([(0, 960)])

# 5 THE CULT'S PLAN — Saddler and the plan
hs, js_ = ch("sad", "person", 960, 980, 380, dict(skin="#d9b08a", robe="#5a2a5a", beard=True, glasses=True, brows="angry", mouth="smile"))
plan = ('<div id="@plan" class="abs" style="left:740px;top:140px;width:440px;height:250px;background:#f4ede0;border:6px solid #1b1a18;border-radius:16px">'
        '<div id="@ashp" class="char" style="position:absolute;left:20px;top:30px;width:120px;height:176px;overflow:hidden"></div>'
        '<svg style="position:absolute;left:150px;top:80px;width:90px;height:60px" viewBox="0 0 90 60"><path d="M0 30 L70 30 M50 8 L80 30 L50 52" stroke="#c8262b" stroke-width="10" fill="none" stroke-linecap="round"/></svg>'
        '<svg style="position:absolute;left:250px;top:40px;width:170px;height:150px" viewBox="0 0 170 150"><rect x="10" y="60" width="150" height="80" fill="#fff" stroke="#1b1a18" stroke-width="6"/><path d="M50 60 L85 20 L120 60 Z" fill="#fff" stroke="#1b1a18" stroke-width="6"/>'
        '<path d="M40 70 L40 130 M70 70 L70 130 M100 70 L100 130 M130 70 L130 130" stroke="#1b1a18" stroke-width="5"/><rect x="78" y="0" width="14" height="22" fill="#1b1a18"/></svg></div>')
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#3a2236"),
         box("left:660px;top:0;width:600px;height:1080px;background:#4a2a46"),
         box("left:0;top:700px;width:1920px;height:380px;background:#2a1828")]
js = ""
for k, x in enumerate((730, 1190)):
    hh, jj = ch(f"m{k}", "person", x, 860, 220, dict(skin="#c99a7a", robe="#3a1830", pupil="#e0402a", brows="angry")); parts.append(hh); js += jj
parts += [hs, plan, box("inset:0;background:#b060c0;mix-blend-mode:screen;opacity:0", "pf")]
scene("THE CULT’S PLAN", ["los", "illuminados", "control", "the", "president"], "flash", "#3a2236", parts, js_ + js + '\n  rig("@ashp", "person", ' + json.dumps(dict(ASH, brows="flat")) + ''');
  tl.to("#@sad .armR", { rotation: -150, duration: 0.4, ease: "back.out(1.6)" }, 0.5);
  tl.to("#@sad .armL", { rotation: 150, duration: 0.4, ease: "back.out(1.6)" }, 0.6);
  tl.fromTo("#@pf", { opacity: 0.5 }, { opacity: 0, duration: 0.4 }, 0.9);
  tl.fromTo("#@plan", { opacity: 0, scale: 0.4, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.8)" }, 2.4);
  tl.fromTo(["#@m0", "#@m1"], { y: 0 }, { y: -12, duration: 0.5, yoyo: true, repeat: 5, stagger: 0.2, ease: "sine.inOut" }, 0.4);
  blink(tl, "@sad", 1.8);
''')
FOCUS.append([(0, 960)])

# 6 THE CASTLE — Leon kicks a cultist; Ada on the ledge
castle = ('<path d="M0 360 L0 120 L60 120 L60 160 L100 160 L100 60 L160 60 L160 160 L260 160 L260 0 L330 0 L330 160 L420 160 L420 90 L480 90 L480 360 Z" fill="#2a2436"/>'
          + "".join(f'<rect x="{x}" y="{y}" width="20" height="30" fill="#e9b35a"/>' for x, y in [(120, 100), (285, 40), (285, 220), (440, 130), (180, 240)]))
hl, jl = ch("leon", "person", 860, 960, 300, dict(LEON))
hm, jm = ch("mon", "person", 1090, 960, 280, dict(skin="#c99a7a", robe="#3a1830", pupil="#e0402a", brows="angry", sack=True))
hd, jd = ch("ada", "person", 1460, 640, 250, dict(ADA, look=-6))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#4a4058"),
         svg(None, 720, 110, 480, 360, "0 0 480 360", castle),
         box("left:0;top:700px;width:1920px;height:380px;background:#33293e"),
         box("left:1300px;top:640px;width:400px;height:30px;background:#2a2436;border-top:8px solid #5a4e66"),
         box("left:1456px;top:0px;width:6px;height:420px;background:#1b1a18", "line"),
         hl, hm, hd]
scene("THE CASTLE", ["salazar's", "castle", "ada", "wong"], "whip", "#4a4058", parts, jl + jm + jd + r'''
  tl.to("#@leon .legR", { rotation: -100, duration: 0.18, ease: "power3.out" }, 1.0);
  tl.to("#@leon", { rotation: -10, duration: 0.18, transformOrigin: "50% 100%" }, 1.0);
  tl.to("#@mon", { x: 160, rotation: 70, duration: 0.5, ease: "power2.out", transformOrigin: "50% 100%" }, 1.15);
  tl.to("#@mon", { opacity: 0, duration: 0.3 }, 2.2);
  shake(tl, "#@world", 1.15, 14, 8);
  tl.to("#@leon .legR", { rotation: 0, duration: 0.3 }, 1.5);
  tl.to("#@leon", { rotation: 0, duration: 0.3 }, 1.5);
  tl.fromTo("#@ada", { y: -520 }, { y: 0, duration: 0.7, ease: "power2.out" }, 3.6);
  tl.fromTo("#@line", { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: 0.6, ease: "power2.out" }, 3.5);
  tl.to("#@line", { opacity: 0, duration: 0.3 }, 4.6);
  tl.to("#@ada .armR", { rotation: -60, duration: 0.3 }, 5.0);
  blink(tl, "@ada", 6.0);
''')
FOCUS.append([(0, 960), (4.0, 960), (4.8, 1400)])

# 7 THE CURE — laser machine, then the rocket launcher
arch = '<path d="M0 520 L0 120 A160 160 0 0 1 320 120 L320 520" stroke="#9aa3ab" stroke-width="40" fill="none"/><path d="M0 520 L0 120 A160 160 0 0 1 320 120 L320 520" stroke="#1b1a18" stroke-width="6" fill="none"/>'
hl1, jl1 = ch("leon1", "person", 860, 940, 290, dict(LEON, brows="sad", mouth="shout"))
hl2, jl2 = ch("leon2", "person", 1300, 960, 300, dict(LEON, look=6, rocket=True))
hd, jd = ch("ada", "person", 1520, 470, 200, dict(ADA, look=-6))
worm = '<path d="M0 60 C-20 30 30 20 10 -10" stroke="#6a8f3a" stroke-width="16" fill="none" stroke-linecap="round"/><circle cx="10" cy="-16" r="14" fill="#8fbf4a" stroke="#1b1a18" stroke-width="4"/>'
monster = '<ellipse cx="0" cy="0" rx="200" ry="240" fill="#6a3a6a" stroke="#1b1a18" stroke-width="8"/><ellipse cx="0" cy="-40" rx="90" ry="60" fill="#f4e08a" stroke="#1b1a18" stroke-width="6"/><circle cx="0" cy="-40" r="34" fill="#c4262b"/><path d="M-200 60 C-280 120 -300 220 -260 300 M200 60 C280 120 300 220 260 300" stroke="#6a3a6a" stroke-width="40" fill="none" stroke-linecap="round"/>'
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2f4448"),
         box("left:0;top:720px;width:1920px;height:360px;background:#223234"),
         svg(None, 700, 230, 320, 520, "0 0 320 520", arch), hl1,
         box("left:720px;top:250px;width:280px;height:14px;background:#ff4a4a", "beam"),
         svg("worm", 830, 380, 80, 100, "-40 -40 80 110", worm, "opacity:0"),
         box("left:1300px;top:470px;width:420px;height:24px;background:#1b1a18"),
         hd, svg("monster", 1440, 330, 440, 570, "-240 -260 480 620", monster),
         hl2, box("left:1380px;top:620px;width:70px;height:26px;border-radius:13px;background:#ffb347;border:4px solid #1b1a18;opacity:0", "rk"),
         box("left:1350px;top:440px;width:200px;height:40px;background:#5a6a4a;border:5px solid #1b1a18;border-radius:12px;opacity:0", "thrown"),
         burst("boom", 1640, 520, 1.3)]
scene("THE CURE", ["burns", "out", "rocket", "launcher", "saddler"], "dip", "#2f4448", parts, jl1 + jl2 + jd + r'''
  gsap.set("#@leon2 .armR g", { opacity: 0 });
  tl.fromTo("#@beam", { y: 0 }, { y: 440, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0.3);
  shake(tl, "#@leon1", 0.4, 8, 10);
  tl.set("#@worm", { opacity: 1 }, 1.2);
  tl.fromTo("#@worm", { y: 0, scale: 1 }, { y: -80, scale: 0.2, rotation: 160, duration: 0.8, ease: "power2.in" }, 1.2);
  tl.to("#@worm", { opacity: 0, duration: 0.2 }, 1.9);
  tl.to("#@ada .armR", { rotation: -120, duration: 0.25, ease: "back.out(2)" }, 3.4);
  tl.set("#@thrown", { opacity: 1 }, 3.5);
  tl.fromTo("#@thrown", { x: 0, y: 0, rotation: 0 }, { x: -60, y: 150, rotation: -200, duration: 0.6, ease: "power1.in" }, 3.5);
  tl.set("#@thrown", { opacity: 0 }, 4.1);
  tl.set("#@leon2 .armR g", { opacity: 1 }, 4.1);
  tl.to("#@leon2 .armR", { rotation: -40, duration: 0.25 }, 4.1);
  tl.set("#@rk", { opacity: 1 }, 4.9);
  tl.fromTo("#@rk", { x: 0 }, { x: 230, y: -100, duration: 0.35, ease: "power2.in" }, 4.9);
  tl.set("#@rk", { opacity: 0 }, 5.25);''' + BOOM_JS("#@boom", 5.25) + r'''
  shake(tl, "#@world", 5.3, 26, 12);
  tl.to("#@monster", { opacity: 0, scale: 0.6, duration: 0.4 }, 5.5);
''')
FOCUS.append([(0, 860), (2.6, 860), (3.2, 1450)])

# 8 THE ESCAPE — jet ski, the island blows, Ada leaves with the sample
jet = '<path d="M0 60 L60 0 L360 10 C420 14 440 40 430 70 L40 90 Z" fill="#e9e6df" stroke="#1b1a18" stroke-width="7"/><path d="M60 40 L380 44" stroke="#c4473a" stroke-width="12"/>'
spray = "".join(f'<path class="spr" d="M{x} 0 l-60 -30" stroke="#dfefff" stroke-width="10" stroke-linecap="round"/>' for x in (0, 30, 60))
heli = '<rect x="40" y="40" width="200" height="80" rx="40" fill="#1b1a18"/><path d="M240 70 L360 60 L360 84 L240 90 Z" fill="#1b1a18"/><g class="rot"><path d="M0 26 L300 26" stroke="#1b1a18" stroke-width="10"/></g><circle cx="90" cy="76" r="20" fill="#7fb2d6"/><circle id="@vial" cx="160" cy="130" r="16" fill="#8fbf4a" stroke="#1b1a18" stroke-width="5"/>'
hl, jl = ch("leon", "person", 900, 820, 230, dict(LEON, look=6, mouth="smile"))
ha, ja = ch("ash", "person", 1020, 815, 210, dict(ASH, look=6, mouth="smile", brows="flat"))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#e8955a"),
         box("left:0;top:0;width:1920px;height:300px;background:#d9784a"),
         svg("isle", 1000, 380, 600, 260, "0 0 600 260", '<path d="M0 260 C80 120 160 60 300 40 C440 60 520 140 600 260 Z" fill="#3a3a32"/>'),
         burst("ib", 1300, 420, 1.6, ("#ffd36b", "#ff6a1a", "#fff6c8")),
         box("left:0;top:620px;width:1920px;height:460px;background:#2a5a7a"),
         box("left:0;top:640px;width:1920px;height:10px;background:#5a8aaa", "w1"),
         box("left:0;top:720px;width:1920px;height:10px;background:#5a8aaa", "w2"),
         '<div id="@ride" class="abs" style="left:0;top:0;width:1920px;height:1080px">' + ha + hl + svg(None, 740, 700, 440, 100, "0 0 440 100", jet) + svg(None, 760, 760, 60, 40, "-60 -30 60 40", spray) + "</div>",
         svg("heli", 1500, 100, 360, 160, "0 0 360 160", heli)]
scene("THE ESCAPE", ["ada", "plaga", "sample", "far", "from", "over"], "flash", "#e8955a", parts, jl + ja + r'''''' + BOOM_JS("#@ib", 0.5) + r'''
  tl.to("#@isle", { opacity: 0, duration: 0.3 }, 0.8);
  shake(tl, "#@world", 0.55, 20, 10);
  tl.fromTo("#@ride", { y: 0, rotation: 0 }, { y: -12, rotation: -1.5, duration: 0.25, yoyo: true, repeat: Math.round(D / 0.25) - 1, ease: "sine.inOut", transformOrigin: "50% 70%" }, 0);
  tl.fromTo(["#@w1", "#@w2"], { x: 0 }, { x: -160, duration: 0.5, ease: "none", repeat: Math.round(D / 0.5) - 1 }, 0);
  tl.to("#@ash .armL", { rotation: 120, duration: 0.3, ease: "back.out(2)" }, 1.6);
  tl.fromTo("#@heli", { x: 100 }, { x: -900, duration: 4.4, ease: "power1.inOut" }, 4.2);
  tl.fromTo("#@heli .rot", { scaleX: 1, transformOrigin: "50% 50%" }, { scaleX: 0.2, duration: 0.06, yoyo: true, repeat: Math.round(D / 0.06) - 1, ease: "none" }, 0);
  tl.fromTo("#@vial", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.4, duration: 0.3, yoyo: true, repeat: 7 }, 6.0);
''')
FOCUS.append([(0, 1150), (1.6, 1150), (3.0, 980)])

# ---------- write ----------
COMMON = f"""
    #root {{ position: absolute; inset: 0; overflow: hidden; background: {INK}; }}
    #@world {{ position: absolute; inset: 0; overflow: hidden; }}
    #@pan {{ position: absolute; left: 0; top: 0; width: 3000px; height: 1080px; }}
    #@root .abs {{ position: absolute; }}
    #@root .char {{ position: absolute; }}
    #@root .char svg {{ width: 100%; height: 100%; overflow: visible; }}
    #@vp {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; }}
    #@cam {{ position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }}
    #@card {{ position: absolute; left: 50%; top: 120px; padding: 16px 28px 16px; background: {CREAM}; border: 5px solid {INK}; border-radius: 20px; z-index: 20; white-space: nowrap; }}
    #@chip {{ display: inline-block; font-family: "Archivo Black", sans-serif; font-size: 30px; line-height: 1; color: #fff; background: #c8262b; padding: 8px 12px 6px; border-radius: 10px; margin-right: 14px; vertical-align: 4px; }}
    #@ttl {{ display: inline; font-family: "Archivo Black", sans-serif; font-size: 40px; line-height: 1.1; color: {INK}; }}
    #@cap {{ position: absolute; left: 0; top: 1440px; width: 1080px; height: 300px; z-index: 20; }}
    #@cap .chunk {{ position: absolute; left: 50%; top: 0; width: max-content; max-width: 960px; padding: 16px 34px 20px; background: {CREAM}; border: 5px solid {INK}; border-radius: 22px; text-align: center; font-family: "Inter", sans-serif; font-weight: 800; font-size: 62px; line-height: 1.12; color: {INK}; white-space: normal; opacity: 0; }}
    #@cap .w {{ display: inline-block; margin: 0 0.12em; opacity: 0.3; }}
    #@cap .hl {{ color: #c9653f; }}
    #@root .say {{ position: absolute; padding: 16px 34px; background: #fbfaf7; border: 5px solid {INK}; border-radius: 26px; font-family: "Archivo Black", sans-serif; font-size: 50px; line-height: 1; color: {INK}; white-space: nowrap; z-index: 15; opacity: 0; }}
    #@flash {{ position: absolute; inset: 0; background: #f4f6ff; opacity: 0; z-index: 30; }}
    #@dip {{ position: absolute; inset: 0; background: {INK}; opacity: 0; z-index: 30; }}
"""
ENTER = {"dip": 'tl.fromTo("#@dip", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power2.out" }, 0);',
         "flash": 'tl.fromTo("#@flash", { opacity: 0.95 }, { opacity: 0, duration: 0.4, ease: "power2.out" }, 0);',
         "whip": 'tl.fromTo("#@world", { x: 1920 }, { x: 0, duration: 0.34, ease: "power3.out" }, 0);',
         "glitch": '[[-60,0],[44,0.05],[-26,0.1],[70,0.14],[-12,0.19],[0,0.24]].forEach(function(g){ tl.set("#@world", { x: g[0] }, g[1]); }); tl.fromTo("#@dip", { opacity: 0.7 }, { opacity: 0, duration: 0.24, ease: "steps(4)" }, 0);',
         "cut": ""}
hosts, auds, starts, t = [], [], [], 0.0
for n, s in enumerate(SC, 1):
    sid = f"s{n}"; f = f"{ROOT}/assets/vo/l{n}.wav"
    words, times, vd = word_times(LINES[n - 1], f)
    D = round(LEAD + vd + TAIL + (LAST_HOLD if n == len(SC) else 0), 2)
    hi = [re.sub(r"[^a-z]", "", h) for h in s["hi"]]
    ch_ = chunks(words); hc, cc = [], []
    for ci, idx in enumerate(ch_):
        spans = "".join(f'<span class="w{" hl" if re.sub(r"[^a-z]", "", words[i].lower().replace("’", "")) in hi else ""}">{words[i]}</span>' for i in idx)
        hc.append(f'<div class="chunk" id="@c{ci}">{spans}</div>')
        nxt = ch_[ci + 1][0] if ci + 1 < len(ch_) else None
        cc.append(dict(i=ci, t0=round(LEAD + times[idx[0]] - 0.08, 3), t1=round(LEAD + times[nxt] - 0.08, 3) if nxt is not None else round(D - 0.2, 3), words=[round(LEAD + times[i], 3) for i in idx]))
    body = "\n      ".join(s["parts"])
    if n == 3: body = '<div id="@pan">' + body + "</div>"
    html = f"""<template>
  <style>{COMMON}
    #@world {{ background: {s['bg']}; }}
    {s['css']}
  </style>
  <div id="root" data-composition-id="{sid}" data-width="1080" data-height="1920" data-layout-allow-overflow data-layout-allow-overlap>
    <span id="@root" style="display:contents">
    <div id="@vp"><div id="@cam"><div id="@world">
      {body}
    </div></div></div>
    <div id="@card"><span id="@chip">SCENE {n}</span><span id="@ttl">{s['title']}</span></div>
    <div id="@cap">{''.join(hc)}</div>
    <div id="@flash"></div>
    <div id="@dip"></div>
    </span>
  </div>
  <script>
    (function () {{
{RIG}
      var P = "#@", D = {D};
      var CH = {json.dumps(cc)};
      var tl = gsap.timeline({{ paused: true }});
      gsap.set(P + "cap .chunk", {{ xPercent: -50 }});
      gsap.set(P + "card", {{ xPercent: -50 }});
      var K = 1920 / 1080, F = {json.dumps(FOCUS[n - 1])};
      var fx = function (x) {{ return 540 - x * K; }};
      gsap.set(P + "cam", {{ scale: K, transformOrigin: "0 0", x: fx(F[0][1]) }});
      for (var i = 1; i < F.length; i++) tl.fromTo(P + "cam", {{ x: fx(F[i - 1][1]) }}, {{ x: fx(F[i][1]), duration: F[i][0] - F[i - 1][0], ease: "power2.inOut", immediateRender: false }}, F[i - 1][0]);
      {ENTER[s['enter']]}
      tl.fromTo(P + "card", {{ opacity: 0, y: -30, rotation: -3, xPercent: -50 }}, {{ opacity: 1, y: 0, rotation: 0, duration: 0.4, ease: "back.out(1.8)" }}, 0.08);
      CH.forEach(function (c) {{
        var el = document.getElementById("@c" + c.i), ws = el.querySelectorAll(".w");
        tl.fromTo(el, {{ opacity: 0, y: 16 }}, {{ opacity: 1, y: 0, duration: 0.16, ease: "power3.out" }}, Math.max(0, c.t0 + 0.02));
        c.words.forEach(function (tt, k) {{ tl.fromTo(ws[k], {{ opacity: 0.3 }}, {{ opacity: 1, duration: 0.08 }}, tt); }});
        tl.to(el, {{ opacity: 0, duration: 0.06 }}, c.t1 - 0.06);
      }});
{s['js']}
      window.__timelines["{sid}"] = tl;
    }})();
  </script>
</template>
"""
    open(f"{ROOT}/compositions/{sid}.html", "w").write(html.replace("@", sid + "-"))
    hosts.append(f'      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{t:.2f}" data-duration="{D}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>')
    auds.append(f'      <audio id="vo-{n}" class="clip" src="assets/vo/l{n}.wav" data-start="{t + LEAD:.2f}" data-duration="{vd:.2f}" data-volume="1" data-track-index="{30 + n % 2}"></audio>')
    starts.append(t); t += D
TOTAL = round(t, 2)
S = lambda n, o=0.0: round(starts[n - 1] + o, 3)
sfx = [("a1", "impact-bass-1", 0.12, 2.0, 0.3), ("a2", "whoosh-short", S(2, -0.12), 0.55, 0.3), ("a2p", "glitch-3", S(2, 3.38), 1.2, 0.25),
       ("a3", "glitch-3", S(3, 0.0), 1.2, 0.3), ("a3b", "impact-bass-1", S(3, 2.75), 2.0, 0.3), ("a4", "pop", S(4, 0.42), 0.6, 0.25),
       ("a4s", "impact-bass-1", S(4, 2.95), 2.0, 0.25), ("a5", "impact-bass-2", S(5, 0.9 - 1.986), 2.55, 0.3), ("a6", "whoosh", S(6, 0.88), 0.55, 0.35),
       ("a6b", "whoosh-short", S(6, 3.4), 0.55, 0.25), ("a7", "whoosh-short", S(7, 3.38), 0.55, 0.3), ("a7r", "riser", S(7, 5.25 - 10.03), 10.0, 0.18),
       ("a7b", "impact-bass-1", S(7, 5.2), 2.0, 0.4), ("a8", "impact-bass-2", S(8, 0.5 - 1.986), 2.55, 0.35)]
auds += [f'      <audio id="{a}" class="clip" src="assets/sfx/{fn}.mp3" data-start="{max(0, s_)}" data-duration="{d}" data-volume="{v}" data-track-index="{40 + k}"></audio>' for k, (a, fn, s_, d, v) in enumerate(sfx)]
open(f"{ROOT}/index.html", "w").write(f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: {INK}; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: {INK}; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920">
{chr(10).join(hosts)}
{chr(10).join(auds)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
""")
print("total", TOTAL, [round(x, 2) for x in starts])
