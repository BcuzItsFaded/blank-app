"""Plot Twist with A&R: Pokemon Battle Ep. 1 (Ash vs Gary), flat-cartoon VERTICAL SHORT (1080x1920). Run: python3 tools/gen.py"""
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

import math
SLOTS = [7, 7, 7, 8, 8, 8, 8, 7]
ASH = dict(skin="#efc4a2", hair="spiky", pcap="#c4262b", suit="#2a5aa8", brows="angry", mouth="smile")
GARY = dict(skin="#efc4a2", hair="spiky", hairc="#8a5a2e", suit="#6a4a8a", brows="angry", mouth="smile")
def burst(id_, x, y, s, cols=("#ffd36b", "#ff8a2a", "#fff6c8")):
    body = ""
    for k, (r, c) in enumerate(zip((1.0, 0.7, 0.4), cols)):
        pts = [f"{math.cos(i*math.pi/12)*(200 if i % 2 == 0 else 90)*r:.0f},{math.sin(i*math.pi/12)*(200 if i % 2 == 0 else 90)*r:.0f}" for i in range(24)]
        body += f'<polygon points="{" ".join(pts)}" fill="{c}" stroke="#1b1a18" stroke-width="{6 - k*2}" stroke-linejoin="round"/>'
    return svg(id_, x - 200 * s, y - 200 * s, 400 * s, 400 * s, "-200 -200 400 400", body, "opacity:0")
BALL = '<circle r="40" fill="#f4ede0" stroke="#1b1a18" stroke-width="7"/><path d="M-40 0 A40 40 0 0 1 40 0 Z" fill="#e0402a" stroke="#1b1a18" stroke-width="7"/><path d="M-40 0 L40 0" stroke="#1b1a18" stroke-width="7"/><circle r="12" fill="#f4ede0" stroke="#1b1a18" stroke-width="6"/>'
def mon(id_, kind, x, floor=780, W=300, gary=False):
    h, j = ch(id_, "mon", x, floor, W, dict(kind=kind), flip=gary)
    tag = f'<div id="@{id_}t" class="abs ntag {"g" if gary else "a"}" style="left:{x - 150}px;top:{floor - W - 50}px;width:300px">{kind.upper()}</div>'
    return h + tag, j
ARENA = [box("left:0;top:0;width:1920px;height:1080px;background:#6a8ab8"),
         "".join(box(f"left:{x}px;top:{300 + (x * 37) % 40}px;width:70px;height:120px;border-radius:35px 35px 0 0;background:{['#c4473a', '#3a6a9a', '#e9c46a', '#4f7a4a'][(x // 60) % 4]}") for x in range(0, 1920, 60)),
         box("left:0;top:400px;width:1920px;height:30px;background:#3a3a44"),
         box("left:0;top:430px;width:1920px;height:650px;background:#b8a07a"),
         box("left:560px;top:450px;width:800px;height:600px;border:8px solid #f4ede0;border-radius:6px"),
         box("left:955px;top:450px;width:8px;height:600px;background:#f4ede0"),
         "".join(box(f"left:{x}px;top:{y}px;width:{w}px;height:{w*0.7:.0f}px;border-radius:50% 50% 40% 40%;background:#8a8478;border:5px solid #1b1a18", None, "abs rock") for x, y, w in [(600, 520, 120), (1180, 500, 140), (700, 840, 100), (1240, 860, 110), (940, 950, 90)])]
MON_CSS = ('#@root .flip svg{transform:scaleX(-1)}'
           '#@root .ntag{text-align:center;font-family:"Archivo Black";font-size:30px;color:#fff;-webkit-text-stroke:4px #1b1a18;paint-order:stroke fill}'
           '#@root .ntag.a{color:#ffd36b}#@root .ntag.g{color:#d9b8ff}'
           '#@root .stampy{position:absolute;padding:6px 24px;border:7px solid #c8262b;color:#c8262b;font-family:"Archivo Black";font-size:60px;background:rgba(244,237,224,.94);border-radius:12px;opacity:0;white-space:nowrap}'
           '#@root .big{position:absolute;font-family:"Archivo Black";color:#f6c744;-webkit-text-stroke:9px #1b1a18;paint-order:stroke fill;white-space:nowrap;opacity:0}')
MON_JS = r'''
  var popIn = function (id, t) { tl.fromTo("#" + id, { scale: 0, opacity: 0, transformOrigin: "50% 90%" }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.2)", immediateRender: t > 0.05 ? false : true }, t);
    tl.fromTo("#" + id + "t", { opacity: 0 }, { opacity: 1, duration: 0.2, immediateRender: false }, t + 0.1); };
  var hide = function (ids) { ids.forEach(function (id) { gsap.set(["#" + id, "#" + id + "t"], { opacity: 0 }); }); };
  var lunge = function (id, dx, t) { tl.to("#" + id, { x: dx, duration: 0.14, ease: "power3.in" }, t); tl.to("#" + id, { x: 0, duration: 0.3, ease: "power2.out" }, t + 0.16); };
  var hit = function (id, t) { shake(tl, "#" + id, t, 14, 8); tl.fromTo("#" + id, { opacity: 0.3 }, { opacity: 1, duration: 0.06, repeat: 3, yoyo: true, immediateRender: false }, t); };
  var faint = function (id, t) { tl.set("#" + id + " .ko", { opacity: 1 }, t); tl.to("#" + id, { y: 40, rotation: 0, scaleY: 0.85, opacity: 0, duration: 0.6, ease: "power2.in", transformOrigin: "50% 100%" }, t + 0.25); tl.to("#" + id + "t", { opacity: 0, duration: 0.3 }, t + 0.3); };
  var bob = function (id, t0, dur) { tl.fromTo("#" + id + " .mb", { y: 0 }, { y: -8, duration: 0.4, yoyo: true, repeat: Math.max(1, Math.round(dur / 0.4) - 1), ease: "sine.inOut", immediateRender: false }, t0); };
  var beam = function (sel, t, dur) { tl.set(sel, { opacity: 1 }, t); tl.fromTo(sel, { scaleX: 0 }, { scaleX: 1, duration: 0.25, ease: "power2.out" }, t); tl.to(sel, { opacity: 0, duration: 0.2 }, t + dur); };
  var stamp = function (sel, t) { tl.fromTo(sel, { opacity: 0, scale: 1.8, rotation: -14 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.2, ease: "power3.in" }, t); };
'''
BOOM_JS = lambda sel, t: f'''
  tl.set("{sel}", {{ opacity: 1 }}, {t});
  tl.fromTo("{sel}", {{ scale: 0.1, rotation: 0 }}, {{ scale: 1.1, rotation: 20, duration: 0.3, ease: "expo.out" }}, {t});
  tl.to("{sel}", {{ scale: 1.3, opacity: 0, duration: 0.4, ease: "power2.in" }}, {t} + 0.5);'''
def ray(id_, x, y, w, h, c1, c2, rtl=False):
    origin = "100% 50%" if rtl else "0% 50%"
    return f'<div id="@{id_}" class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{h//2}px;background:{c1};border:6px solid #1b1a18;opacity:0;transform-origin:{origin}"><div style="position:absolute;left:10%;right:10%;top:30%;bottom:30%;border-radius:20px;background:{c2}"></div></div>'

# 1 HOOK — Ash vs Gary at the Johto League
ha, ja = ch("ash", "person", 800, 940, 320, dict(ASH))
hg, jg = ch("gary", "person", 1120, 940, 320, dict(GARY, look=-6))
parts = ARENA + ['<div class="abs" style="left:700px;top:150px;width:520px;padding:14px 0;background:#c8262b;border:6px solid #1b1a18;border-radius:14px;text-align:center;font-family:Archivo Black;font-size:46px;color:#fff">JOHTO LEAGUE</div>',
                 ha, hg, '<div id="@vs" class="big" style="left:880px;top:420px;font-size:120px">VS</div>',
                 svg("ball", 860, 560, 90, 90, "-45 -45 90 90", BALL, "opacity:0"),
                 svg("bolt", 920, 250, 80, 260, "0 0 200 520", '<path d="M120 0 L40 230 L110 230 L20 520 L180 190 L105 190 L170 0 Z" fill="#f6c744" stroke="#1b1a18" stroke-width="10"/>', "opacity:0")]
scene("THE ULTIMATE RIVALRY", ["ash", "gary", "johto", "league"], "cut", "#6a8ab8", parts, ja + jg + MON_JS + r'''
  tl.fromTo("#@vs", { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power3.in" }, 1.6);
  tl.fromTo("#@bolt", { opacity: 0 }, { opacity: 1, duration: 0.05, yoyo: true, repeat: 5, immediateRender: false }, 1.85);
  shake(tl, "#@world", 1.85, 14, 8);
  tl.to("#@ash .armR", { rotation: -60, duration: 0.25, ease: "back.out(2)" }, 2.6);
  tl.to("#@gary .armL", { rotation: 40, duration: 0.25, ease: "back.out(2)" }, 3.0);
  tl.to("#@ash .armR", { rotation: -160, duration: 0.2, ease: "power3.in" }, 4.6);
  tl.set("#@ball", { opacity: 1 }, 4.8);
  tl.fromTo("#@ball", { x: 0, y: 0, rotation: 0 }, { x: 160, y: -260, rotation: 540, duration: 0.8, ease: "power2.out" }, 4.8);
  blink(tl, "@gary", 2.2); blink(tl, "@ash", 3.6);
''', css=MON_CSS)
FOCUS.append([(0, 960)])

# 2 Nidoqueen beats Tauros; Heracross beats Magmar
h1, j1 = mon("tau", "tauros", 800, 780, 300)
h2, j2 = mon("nid", "nidoqueen", 1120, 780, 300, True)
h3, j3 = mon("her", "heracross", 800, 780, 300)
h4, j4 = mon("mag", "magmar", 1120, 780, 300, True)
parts = ARENA + [h1, h2, h3, h4, burst("b1", 860, 600, 0.6), burst("b2", 1080, 600, 0.6)]
scene("THE OPENING", ["nidoqueen", "tauros", "heracross", "magmar"], "whip", "#6a8ab8", parts, j1 + j2 + j3 + j4 + MON_JS + r'''
  hide(["@her", "@mag"]);
  popIn("@tau", 0.0); popIn("@nid", 0.1); bob("@nid", 0.5, 2.0);
  lunge("@tau", 160, 0.9); hit("@nid", 1.05);
  lunge("@nid", -170, 1.7);''' + BOOM_JS("#@b1", 1.85) + r'''
  hit("@tau", 1.85); faint("@tau", 2.3);
  tl.to(["#@nid", "#@nidt"], { scale: 0, opacity: 0, duration: 0.25, transformOrigin: "50% 90%" }, 3.0);
  popIn("@her", 3.2); popIn("@mag", 3.35); bob("@mag", 3.7, 1.0);
  tl.to("#@her .head", { rotation: -20, svgOrigin: "10 -70", duration: 0.2 }, 4.3);
  lunge("@her", 200, 4.6);''' + BOOM_JS("#@b2", 4.76) + r'''
  hit("@mag", 4.76); faint("@mag", 5.2);
  tl.to("#@her .head", { rotation: 0, svgOrigin: "10 -70", duration: 0.3 }, 5.0);
''', css=MON_CSS)
FOCUS.append([(0, 960)])

# 3 Blastoise takes down Heracross and Bayleef
h1, j1 = mon("her", "heracross", 800, 780, 300)
h2, j2 = mon("bla", "blastoise", 1120, 780, 330, True)
h3, j3 = mon("bay", "bayleef", 800, 780, 320)
parts = ARENA + [h1, h3, h2, ray("hp", 830, 440, 260, 70, "#3a9be0", "#dff6ff", True), burst("b1", 860, 620, 0.6, ("#8fd0ff", "#3a9be0", "#eaf8ff"))]
scene("BLASTOISE", ["blastoise", "overwhelming", "power", "heracross", "bayleef"], "dip", "#6a8ab8", parts, j1 + j2 + j3 + MON_JS + r'''
  hide(["@bay"]);
  tl.fromTo("#@bla", { y: -700 }, { y: 0, duration: 0.45, ease: "power3.in" }, 0.2);
  tl.fromTo("#@blat", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.7);
  shake(tl, "#@world", 0.65, 24, 12);
  beam("#@hp", 1.5, 0.5);''' + BOOM_JS("#@b1", 1.7) + r'''
  hit("@her", 1.7); faint("@her", 2.1);
  popIn("@bay", 3.0); bob("@bay", 3.4, 0.8);
  lunge("@bla", -220, 4.0);
  hit("@bay", 4.16); faint("@bay", 4.5);
  shake(tl, "#@world", 4.16, 16, 8);
''', css=MON_CSS)
FOCUS.append([(0, 960)])

# 4 Snorlax beats Arcanine and Nidoqueen; Scizor turns it around
h1, j1 = mon("sno", "snorlax", 790, 790, 340)
h2, j2 = mon("arc", "arcanine", 1120, 780, 300, True)
h3, j3 = mon("nid", "nidoqueen", 1120, 780, 300, True)
h4, j4 = mon("sci", "scizor", 1120, 780, 300, True)
parts = ARENA + [h1, h2, h3, h4, burst("b1", 1080, 640, 0.6), burst("b2", 1080, 640, 0.6), burst("b3", 840, 620, 0.7, ("#ff6a6a", "#c8263a", "#fff6c8"))]
scene("SNORLAX VS. SCIZOR", ["snorlax", "arcanine", "nidoqueen", "scizor", "turns", "the", "battle", "around"], "glitch", "#6a8ab8", parts, j1 + j2 + j3 + j4 + MON_JS + r'''
  hide(["@nid", "@sci"]);
  popIn("@arc", 0.0); bob("@sno", 0.2, 6.0);
  tl.to("#@sno", { y: -260, x: 140, duration: 0.35, ease: "power2.out" }, 0.8);
  tl.to("#@sno", { y: 0, x: 0, duration: 0.3, ease: "power3.in" }, 1.15);''' + BOOM_JS("#@b1", 1.42) + r'''
  shake(tl, "#@world", 1.42, 22, 10); faint("@arc", 1.6);
  popIn("@nid", 2.4);
  tl.to("#@sno", { y: -260, x: 140, duration: 0.35, ease: "power2.out" }, 3.0);
  tl.to("#@sno", { y: 0, x: 0, duration: 0.3, ease: "power3.in" }, 3.35);''' + BOOM_JS("#@b2", 3.62) + r'''
  shake(tl, "#@world", 3.62, 22, 10); faint("@nid", 3.8);
  popIn("@sci", 4.6);
  [5.3, 5.6, 5.9].forEach(function (t) { lunge("@sci", -230, t); });''' + BOOM_JS("#@b3", 5.5) + r'''
  hit("@sno", 5.5); hit("@sno", 5.8); faint("@sno", 6.3);
''', css=MON_CSS)
FOCUS.append([(0, 960)])

# 5 Charizard beats Scizor and Golem; one challenger left
h1, j1 = mon("cha", "charizard", 800, 780, 320)
h2, j2 = mon("sci", "scizor", 1120, 780, 300, True)
h3, j3 = mon("gol", "golem", 1120, 790, 300, True)
parts = ARENA + [h2, h3, h1, ray("ft", 900, 470, 260, 70, "#ff8a2a", "#ffe08a"), burst("b1", 1100, 600, 0.6), burst("b2", 1100, 640, 0.7),
                 burst("en", 800, 600, 0.9, ("#ffb347", "#ff6a1a", "#fff6c8")),
                 svg("last", 900, 190, 120, 120, "-45 -45 90 90", BALL, "opacity:0"),
                 '<div id="@q" class="big" style="left:1010px;top:170px;font-size:110px">?</div>']
scene("CHARIZARD", ["charizard", "scizor", "golem", "one", "last", "challenger"], "flash", "#6a8ab8", parts, j1 + j2 + j3 + MON_JS + r'''
  hide(["@gol"]);''' + BOOM_JS("#@en", 0.3) + r'''
  popIn("@cha", 0.35); popIn("@sci", 0.2); bob("@cha", 0.8, 6.5);
  tl.to("#@cha .head", { rotation: -10, svgOrigin: "34 -70", duration: 0.2 }, 1.7);
  beam("#@ft", 1.9, 0.6);''' + BOOM_JS("#@b1", 2.1) + r'''
  hit("@sci", 2.1); faint("@sci", 2.6);
  tl.to("#@cha .head", { rotation: 0, svgOrigin: "34 -70", duration: 0.2 }, 2.6);
  popIn("@gol", 3.4);
  tl.to("#@cha", { y: -360, duration: 0.4, ease: "power2.out" }, 4.1);
  tl.to("#@cha", { y: 0, x: 220, duration: 0.25, ease: "power3.in" }, 4.5);''' + BOOM_JS("#@b2", 4.75) + r'''
  shake(tl, "#@world", 4.75, 22, 10); faint("@gol", 4.9);
  tl.to("#@cha", { x: 0, duration: 0.4, ease: "power2.out" }, 5.0);
  tl.fromTo("#@last", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.4)" }, 6.0);
  tl.fromTo("#@q", { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power3.in" }, 6.3);
''', css=MON_CSS)
FOCUS.append([(0, 960)])

# 6 Blastoise returns; Hydro Pump; type advantage
h1, j1 = mon("cha", "charizard", 800, 780, 320)
h2, j2 = mon("bla", "blastoise", 1120, 780, 330, True)
badge = '<div id="@adv" class="abs" style="left:700px;top:170px;width:520px;padding:14px 0;text-align:center;background:#f4ede0;border:7px solid #1b1a18;border-radius:16px;font-family:Archivo Black;font-size:52px;opacity:0"><span style="color:#3a7ac8">WATER</span> &gt; <span style="color:#e0602a">FIRE</span></div>'
parts = ARENA + [h1, h2, ray("hp", 800, 460, 300, 100, "#3a9be0", "#dff6ff", True), burst("b1", 830, 620, 0.8, ("#8fd0ff", "#3a9be0", "#eaf8ff")), badge]
scene("TYPE ADVANTAGE", ["blastoise", "returns", "hydro", "pump", "massive", "type", "advantage"], "whip", "#6a8ab8", parts, j1 + j2 + MON_JS + r'''
  bob("@cha", 0.2, 7.0);
  popIn("@bla", 0.3); bob("@bla", 0.8, 1.2);
  tl.to("#@bla .cannon", { rotation: -10, svgOrigin: "0 -80", duration: 0.2 }, 1.8);
  beam("#@hp", 2.1, 1.4);''' + BOOM_JS("#@b1", 2.3) + r'''
  tl.to("#@cha", { x: -160, duration: 0.6, ease: "power2.out" }, 2.3);
  hit("@cha", 2.3); hit("@cha", 2.8);
  tl.to("#@cha", { x: 0, duration: 0.5, ease: "power2.inOut" }, 3.6);
  tl.fromTo("#@adv", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.4)" }, 3.6);
  shake(tl, "#@adv", 4.2, 8, 6);
''', css=MON_CSS)
FOCUS.append([(0, 960)])

# 7 Charizard scorches the field; Blastoise cools the rocks; steam
h1, j1 = mon("cha", "charizard", 800, 780, 320)
h2, j2 = mon("bla", "blastoise", 1120, 780, 330, True)
steam = "".join(box(f"left:{x}px;top:{y}px;width:{s}px;height:{s}px;border-radius:50%;background:#f4f6f8;opacity:0", None, "abs st") for x, y, s in
                [(600, 600, 260), (820, 560, 300), (1060, 600, 280), (700, 420, 240), (940, 380, 300), (1150, 440, 240), (620, 760, 260), (880, 760, 300), (1120, 760, 260), (780, 240, 260), (1020, 220, 260)])
parts = ARENA + [box("left:560px;top:450px;width:800px;height:600px;background:#ff6a1a;mix-blend-mode:screen;opacity:0", "glow"), h1, h2,
                 ray("ft", 900, 640, 330, 70, "#ff8a2a", "#ffe08a"), ray("wt", 820, 640, 300, 70, "#3a9be0", "#dff6ff", True), steam]
scene("STEAM", ["scorches", "battlefield", "cools", "rocks", "thick", "steam"], "dip", "#6a8ab8", parts, j1 + j2 + MON_JS + r'''
  bob("@cha", 0.2, 3.0); bob("@bla", 0.2, 3.0);
  tl.to("#@cha .head", { rotation: 20, svgOrigin: "34 -70", duration: 0.25 }, 0.4);
  beam("#@ft", 0.6, 1.8);
  tl.fromTo("#@ft", { rotation: 0 }, { rotation: 18, duration: 1.6, ease: "sine.inOut", immediateRender: false }, 0.7);
  tl.to("#@root .rock", { backgroundColor: "#ff8a2a", duration: 0.8, stagger: 0.15 }, 0.9);
  tl.fromTo("#@glow", { opacity: 0 }, { opacity: 0.35, duration: 0.8 }, 1.0);
  tl.to("#@cha .head", { rotation: 0, svgOrigin: "34 -70", duration: 0.25 }, 2.5);
  beam("#@wt", 3.0, 1.2);
  tl.fromTo("#@wt", { rotation: 0 }, { rotation: -18, duration: 1.0, ease: "sine.inOut", immediateRender: false }, 3.1);
  tl.to("#@root .rock", { backgroundColor: "#8a8478", duration: 0.6, stagger: 0.1 }, 3.4);
  tl.to("#@glow", { opacity: 0, duration: 0.6 }, 3.4);
  document.querySelectorAll("#@root .st").forEach(function (s, k) { tl.fromTo(s, { opacity: 0, scale: 0.3 }, { opacity: 0.95, scale: 1.2, duration: 1.0, ease: "power2.out" }, 3.6 + k * 0.12); });
''', css=MON_CSS)
FOCUS.append([(0, 960)])

# 8 Seismic Toss — Ash wins
h1, j1 = mon("cha", "charizard", 800, 780, 320)
h2, j2 = mon("bla", "blastoise", 1120, 780, 330, True)
ha, ja = ch("ash", "person", 820, 1000, 260, dict(ASH, mouth="shout"))
hg, jg = ch("gary", "person", 1110, 1000, 240, dict(GARY, brows="sad", mouth="open"))
steam = "".join(box(f"left:{x}px;top:{y}px;width:{s}px;height:{s}px;border-radius:50%;background:#f4f6f8;opacity:0.95", None, "abs st") for x, y, s in
                [(600, 600, 260), (820, 560, 300), (1060, 600, 280), (700, 420, 240), (940, 380, 300), (1150, 440, 240), (620, 760, 260), (880, 760, 300), (1120, 760, 260)])
parts = ARENA + [h2, '<div id="@duo" class="abs" style="left:0;top:0;width:1920px;height:1080px">' + h1 + "</div>", steam,
                 burst("imp", 960, 720, 1.1), ha, hg, '<div id="@win" class="stampy" style="left:690px;top:180px;font-size:64px">WINNER: ASH!</div>']
scene("SEISMIC TOSS", ["seismic", "toss", "blastoise", "falls", "ash", "finally", "defeats", "gary"], "cut", "#6a8ab8", parts, j1 + j2 + ja + jg + MON_JS + r'''
  gsap.set(["#@ash", "#@gary"], { opacity: 0 });
  tl.fromTo("#@root .st", { opacity: 0.95 }, { opacity: 0, scale: 1.4, duration: 0.8, stagger: 0.05, immediateRender: false }, 0.5);
  tl.to("#@cha", { x: 260, duration: 0.3, ease: "power3.in" }, 0.6);
  tl.to(["#@cha", "#@bla"], { y: -560, duration: 0.6, ease: "power2.out" }, 0.95);
  tl.to(["#@cha", "#@bla"], { rotation: 360, duration: 0.9, ease: "none", transformOrigin: "50% 50%" }, 0.95);
  tl.to(["#@cha", "#@bla"], { y: 0, duration: 0.4, ease: "power3.in" }, 1.6);''' + BOOM_JS("#@imp", 2.0) + r'''
  shake(tl, "#@world", 2.0, 30, 14);
  tl.set("#@cha", { rotation: 0, x: 0 }, 2.05);
  faint("@bla", 2.3);
  tl.fromTo(["#@ash", "#@gary"], { opacity: 0, y: 200 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.6)", stagger: 0.1, immediateRender: false }, 3.2);
  tl.to("#@ash .armL", { rotation: 160, duration: 0.25, ease: "back.out(2)" }, 3.6);
  tl.fromTo("#@ash", { y: 0 }, { y: -30, duration: 0.18, yoyo: true, repeat: 5, immediateRender: false }, 3.7);
  tl.to("#@gary .head", { rotation: 16, duration: 0.4 }, 3.8);
  stamp("#@win", 4.0);
''', css=MON_CSS)
FOCUS.append([(0, 960)])

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
    D = SLOTS[n - 1]
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
sfx = [("a1", "impact-bass-1", S(1, 1.6), 2.0, 0.35), ("a1b", "whoosh-short", S(1, 4.7), 0.55, 0.3),
       ("a2", "pop", S(2, -0.05), 0.6, 0.2), ("a2b", "impact-bass-1", S(2, 1.82), 2.0, 0.3), ("a2c", "impact-bass-1", S(2, 4.73), 2.0, 0.3),
       ("a3", "impact-bass-2", S(3, 0.65 - 1.986), 2.55, 0.35), ("a3b", "whoosh", S(3, 1.4), 0.55, 0.3), ("a3c", "impact-bass-1", S(3, 4.13), 2.0, 0.3),
       ("a4", "impact-bass-1", S(4, 1.39), 2.0, 0.35), ("a4b", "impact-bass-1", S(4, 3.59), 2.0, 0.35), ("a4c", "whoosh-short", S(4, 5.2), 0.55, 0.3),
       ("a5", "whoosh", S(5, 1.8), 0.55, 0.35), ("a5b", "impact-bass-1", S(5, 4.72), 2.0, 0.35), ("a5c", "pop", S(5, 5.9), 0.6, 0.25),
       ("a6", "whoosh", S(6, 2.0), 0.55, 0.35), ("a6b", "impact-bass-1", S(6, 2.27), 2.0, 0.3), ("a6c", "pop", S(6, 3.5), 0.6, 0.25),
       ("a7", "whoosh", S(7, 0.5), 0.55, 0.3), ("a7b", "whoosh", S(7, 2.9), 0.55, 0.3), ("a7c", "glitch-3", S(7, 3.6), 1.2, 0.2),
       ("a8r", "riser", S(8, 1.95 - 10.03), 10.0, 0.18), ("a8", "impact-bass-2", S(8, 2.0 - 1.986), 2.55, 0.4), ("a8b", "pop", S(8, 3.95), 0.6, 0.3)]
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
