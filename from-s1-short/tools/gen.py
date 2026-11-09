"""FROM S1 'Big Theory', flat-cartoon VERTICAL SHORT (1080x1920). Run: python3 tools/gen.py"""
import json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RIG = open(os.path.join(HERE, "rig.js")).read()
INK, CREAM, OR = "#1b1a18", "#f4ede0", "#d97757"
LEAD, TAIL, LAST_HOLD = 0.25, 0.35, 1.9
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
FOCUS = [
  [(0, 440), (2.2, 440), (3.0, 1420)],
  [(0, 1380), (0.4, 1380), (1.4, 840)],
  [(0, 380), (0.6, 380), (3.8, 1150)],
  [(0, 960), (1.0, 960), (1.4, 1400), (2.6, 1400), (3.0, 1000)],
  [(0, 700), (1.5, 700), (2.5, 1230)],
  [(0, 640), (2.0, 640), (3.0, 960)],
  [(0, 1420), (3.9, 1420), (4.7, 450)],
  [(0, 620), (4.3, 620), (4.8, 1350)],
]
def scene(title, hi, enter, bg, parts, js, css=""):
    SC.append(dict(title=title, hi=hi, enter=enter, bg=bg, parts=parts, js=js, css=css))

JIM = dict(skin="#d9a27e", hair="messy", beard=True, jacket=True, suit="#5a4636", brows="sad")
TAB = dict(skin="#c98f6e", hair="long", suit="#7a6a5a", brows="sad", lashes=True)

# 1 HOOK — Fromville sign, crow, the sky vortex
rings = "".join(f'<circle cx="0" cy="0" r="{r}" fill="none" stroke="{c}" stroke-width="{w}" stroke-dasharray="{d}"/>' for r, c, w, d in
                [(260, "#3d4f75", 30, "300 120"), (200, "#56709f", 26, "220 90"), (140, "#7d9ccc", 22, "160 70"), (80, "#a9c6ec", 18, "90 50"), (30, "#dbe9fb", 30, "1 0")])
crow = ('<g id="@crowb"><path d="M0 40 C10 0 70 -10 110 20 L150 30 L110 44 C80 70 20 70 0 40 Z" fill="#141416"/>'
        '<path d="M30 40 L-30 70 L20 54 Z" fill="#141416"/><circle cx="96" cy="22" r="5" fill="#e9b35a"/>'
        '<g id="@beak"><path d="M118 22 L160 30 L118 34 Z" fill="#3a3a3a"/></g><path d="M50 62 L46 86 M70 62 L72 86" stroke="#141416" stroke-width="6"/></g>')
parts = [svg("vort", 1160, 40, 560, 560, "-280 -280 560 560", rings),
         box("left:0;top:600px;width:1920px;height:480px;background:#1c2531"),
         tree(60, 380, 1.1), tree(1700, 360, 1.2), tree(1560, 420, 0.9),
         house(820, 520, 200, 120), house(1080, 500, 240, 140), house(1360, 530, 180, 110),
         svg(None, 1250, 360, 60, 180, "0 0 60 180", '<path d="M30 0 L60 70 L60 180 L0 180 L0 70 Z" fill="#2a3042"/><rect x="22" y="100" width="16" height="26" fill="#e9b35a"/>'),
         box("left:700px;top:640px;width:900px;height:440px;background:#2a3140;clip-path:polygon(45% 0,55% 0,100% 100%,0 100%)"),
         box("left:1140px;top:700px;width:14px;height:380px;background:#e9c46a;clip-path:polygon(40% 0,60% 0,100% 100%,0 100%)"),
         svg("sign", 120, 300, 640, 560, "0 0 640 560",
             f'<rect x="90" y="250" width="34" height="310" fill="#5a4030" stroke="{INK}" stroke-width="6"/><rect x="510" y="250" width="34" height="310" fill="#5a4030" stroke="{INK}" stroke-width="6"/>'
             f'<rect x="10" y="90" width="620" height="200" rx="10" fill="#b59a7a" stroke="{INK}" stroke-width="8"/>'
             f'<path d="M40 120 L120 140 M500 260 L600 230 M300 110 L340 130" stroke="#8a7052" stroke-width="6"/>'
             f'<text x="320" y="225" text-anchor="middle" font-family="Archivo Black" font-size="104" fill="{INK}">FROMVILLE</text>'),
         svg("crow", 420, 236, 280, 165, "-40 -10 210 110", crow),
         box("inset:0;background:#e8efff;mix-blend-mode:screen;opacity:0", "bolt")]
scene("HOOK", ["supernatural", "trap", "experiment"], "cut", "#26324a", parts, r'''
  tl.fromTo("#@vort", { rotation: 0 }, { rotation: 140, duration: D, ease: "none" }, 0);
  tl.fromTo("#@vort", { scale: 0.9 }, { scale: 1.08, duration: D, ease: "sine.inOut" }, 0);
  tl.fromTo("#@crowb", { rotation: 0, svgOrigin: "60 40" }, { rotation: -10, duration: 0.2, yoyo: true, repeat: 1, svgOrigin: "60 40" }, 1.1);
  tl.fromTo("#@beak", { rotation: 0, svgOrigin: "118 28" }, { rotation: 18, duration: 0.08, yoyo: true, repeat: 3, svgOrigin: "118 28" }, 1.4);
  tl.fromTo("#@crowb", { x: 0 }, { x: 14, duration: 0.15, yoyo: true, repeat: 1 }, 3.3);
  [0.9, 1.0, 3.6].forEach(function (t) { tl.fromTo("#@bolt", { opacity: 0.5 }, { opacity: 0, duration: 0.18, immediateRender: false }, t); });
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.06, duration: D, ease: "sine.inOut", transformOrigin: "40% 60%" }, 0);
''')

# 2 THE THEORY (PT. 1) — Jim under the flickering streetlight
hj, jj = ch("jim", "person", 760, 900, 420, dict(JIM, look=6))
parts = [tree(40, 360, 1.2), tree(1700, 380, 1.1), house(1150, 470, 260, 160), house(240, 500, 220, 130),
         box("left:0;top:820px;width:1920px;height:260px;background:#1c2531"),
         svg(None, 1380, 160, 300, 760, "0 0 300 760", f'<rect x="230" y="0" width="22" height="760" fill="#4a3a30" stroke="{INK}" stroke-width="5"/><path d="M241 40 L80 40" stroke="{INK}" stroke-width="10"/><path d="M40 40 L120 40 L110 70 L50 70 Z" fill="#3a3a3a" stroke="{INK}" stroke-width="5"/>'),
         box("left:1420px;top:230px;width:100px;height:600px;background:#ffd27a;opacity:0.3;clip-path:polygon(40% 0,60% 0,100% 100%,0 100%)", "cone"),
         box("left:1440px;top:210px;width:60px;height:30px;border-radius:50%;background:#ffe9a8", "bulb"),
         hj, box("", "q", "abs qm") ]
scene("THE THEORY (PT. 1)", ["experiment", "theory"], "whip", "#26324a", parts, jj + r'''
  [0, 0.4, 0.46, 1.3, 1.36, 2.2, 3.0, 3.06, 3.9].forEach(function (t, k) { var v = [1, 0.15, 1, 0.2, 1, 0.9, 0.1, 1, 1][k]; tl.set(["#@cone", "#@bulb"], { opacity: v * (k % 2 ? 1 : 1) }, t); });
  tl.to("#@jim .head", { rotation: -8, duration: 0.5, ease: "power2.inOut" }, 0.4);
  tl.to("#@jim .armR", { rotation: -140, duration: 0.4, ease: "back.out(1.6)" }, 1.4);
  tl.fromTo("#@jim .armR", { rotation: -140 }, { rotation: -124, duration: 0.15, yoyo: true, repeat: 5, immediateRender: false }, 1.8);
  tl.fromTo("#@q", { opacity: 0, scale: 0.3, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(2.4)" }, 2.2);
  blink(tl, "@jim", 1.1); blink(tl, "@jim", 3.6);
''', css='#@root .qm{left:900px;top:220px;width:120px;height:140px;font-family:"Archivo Black";font-size:140px;line-height:1;color:#f4ede0;-webkit-text-stroke:5px #1b1a18;paint-order:stroke fill}#@root .qm::after{content:"?"}')

# 3 THE THEORY (PT. 2) — wires that connect to nothing (camera follows the wire)
wires = ('<path d="M300 160 C700 360 1100 380 1500 300 C1800 240 2100 330 2300 560" class="wire"/>'
         '<path d="M300 210 C700 430 1100 460 1500 380 C1800 320 2050 420 2240 640" class="wire"/>')
parts = [box("left:0;top:0;width:3000px;height:1080px;background:#2b3850", "wide"),
         tree(1300, 420, 1.2), tree(1500, 460, 1), tree(2500, 380, 1.3), tree(2700, 440, 1.1),
         box("left:0;top:860px;width:3000px;height:220px;background:#1c2531"),
         svg(None, 160, 80, 360, 820, "0 0 360 820", f'<rect x="160" y="0" width="34" height="820" fill="#5a4030" stroke="{INK}" stroke-width="6"/><rect x="20" y="60" width="320" height="26" fill="#5a4030" stroke="{INK}" stroke-width="6"/><rect x="200" y="200" width="110" height="160" rx="16" fill="#6e7680" stroke="{INK}" stroke-width="7"/><path d="M215 240 L295 240 M215 280 L295 280" stroke="{INK}" stroke-width="5"/>'),
         svg("wires", 0, 0, 3000, 1080, "0 0 3000 1080", wires, "fill:none"),
         svg("spk", 2190, 540, 160, 160, "-80 -80 160 160", '<path d="M0 0 L-60 -50 M0 0 L60 -60 M0 0 L70 30 M0 0 L-50 60 M0 0 L10 -76" stroke="#ffe27a" stroke-width="10" stroke-linecap="round"/><circle r="16" fill="#fff6c8"/>', "opacity:0"),
         svg("plug", 2120, 700, 220, 140, "0 0 220 140", f'<rect x="20" y="20" width="180" height="100" rx="16" fill="#f4ede0" stroke="{INK}" stroke-width="7"/><text x="110" y="90" text-anchor="middle" font-family="Archivo Black" font-size="56" fill="#c4473a">???</text>', "opacity:0")]
scene("THE THEORY (PT. 2)", ["don't", "connect"], "cut", "#2b3850", parts, r'''
  tl.fromTo("#@pan", { x: 0 }, { x: -1080, duration: 3.2, ease: "power2.inOut" }, 0.6);
  [1.0, 1.6, 1.68, 2.9, 3.8, 3.9, 4.8].forEach(function (t) { tl.fromTo("#@spk", { opacity: 1, scale: 0.5 }, { opacity: 0, scale: 1.3, duration: 0.18, immediateRender: false }, t); });
  tl.fromTo("#@wires", { rotation: 0, transformOrigin: "10% 15%" }, { rotation: 0.6, duration: 0.6, yoyo: true, repeat: 7, ease: "sine.inOut" }, 0);
  tl.fromTo("#@plug", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.2)" }, 3.6);
''', css="#@root .wire{stroke:#1b1a18;stroke-width:10;fill:none;stroke-linecap:round}")

# 4 THE THEORY WARNING — Jim on the radio, Tabitha behind
hj, jj = ch("jim", "person", 760, 920, 430, dict(JIM, look=6, brows="angry"))
ht, jt = ch("tab", "person", 1180, 880, 360, dict(TAB, look=-6))
radio = (f'<rect x="0" y="0" width="520" height="300" rx="18" fill="#5a4a3e" stroke="{INK}" stroke-width="8"/>'
         '<rect x="30" y="30" width="260" height="110" rx="10" fill="#2a221c"/><rect id="@dial" x="40" y="40" width="240" height="90" rx="8" fill="#ffb347"/>'
         f'<circle cx="390" cy="90" r="50" fill="#3a302a" stroke="{INK}" stroke-width="6"/><circle cx="110" cy="220" r="34" fill="#3a302a" stroke="{INK}" stroke-width="6"/><circle cx="230" cy="220" r="34" fill="#3a302a" stroke="{INK}" stroke-width="6"/>'
         '<g fill="#2a221c">' + "".join(f'<rect x="{330 + i*30}" y="180" width="14" height="90" rx="7"/>' for i in range(5)) + '</g>')
waves = "".join(f'<path class="wv" d="M{0} {-60 - i*40} A{60 + i*40} {60 + i*40} 0 0 1 {0} {60 + i*40}" stroke="#ffb347" stroke-width="10" fill="none" stroke-linecap="round"/>' for i in range(3))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:repeating-linear-gradient(90deg,#4a3828 0 120px,#433224 120px 128px)"),
         box("left:0;top:820px;width:1920px;height:260px;background:#2e2219"),
         ht, hj, svg("radio", 1340, 560, 520, 300, "0 0 520 300", radio),
         box("left:1320px;top:860px;width:600px;height:40px;background:#3a2a1e"),
         svg("waves", 1840, 620, 260, 260, "-40 -200 260 400", waves),
         '<div id="@say" class="say" style="left:1080px;top:250px">“Tabitha is digging…”</div>']
scene("THE THEORY WARNING", ["knows", "tabitha", "is", "digging"], "glitch", "#4a3828", parts, jj + jt + r'''
  tl.to("#@jim .armR", { rotation: -118, duration: 0.4, ease: "power2.out" }, 0.3);
  [0, 0.5, 0.56, 1.4, 1.46, 2.3, 3.1, 3.16, 4.0].forEach(function (t, k) { tl.set("#@dial", { opacity: [1, 0.4, 1, 0.5, 1, 0.9, 0.3, 1, 1][k] }, t); });
  document.querySelectorAll("#@root .wv").forEach(function (w, k) { tl.fromTo(w, { opacity: 0 }, { opacity: 1, duration: 0.15, yoyo: true, repeat: 5, ease: "steps(1)" }, 1.0 + k * 0.1); });
  say(tl, "#@say", 1.3, 1.25);
  [[1.5, 18], [1.56, -14], [1.62, 8], [1.68, 0]].forEach(function (g) { tl.set("#@world", { x: g[1] }, g[0]); });
  tl.to("#@tab .head", { rotation: 10, duration: 0.3, ease: "back.out(2)" }, 1.6);
  tl.to("#@tab .eyes", { scale: 1.2, duration: 0.2, svgOrigin: "0 -124" }, 1.6);
  tl.to("#@jim .head", { rotation: -6, duration: 0.3 }, 1.9);
  blink(tl, "@tab", 3.2);
''')

# 5 THE OTHER CLUES (PT. 1) — the watcher at the monitors
def mon(x, y, k):
    scenes = [
        house(40, 90, 120, 70, "#3a4a5e") + house(200, 100, 100, 60, "#3a4a5e"),
        '<circle cx="120" cy="150" r="14" fill="#f4ede0"/><rect x="110" y="166" width="20" height="40" fill="#f4ede0"/><circle cx="200" cy="150" r="14" fill="#f4ede0"/><rect x="190" y="166" width="20" height="40" fill="#f4ede0"/>',
        '<path d="M20 200 L300 200 L180 100 Z" fill="#2a3a2e"/>' + '<circle cx="150" cy="150" r="14" fill="#d9a27e"/><rect x="140" y="166" width="20" height="40" fill="#5a4636"/>',
        '<circle cx="160" cy="130" r="20" fill="#c98f6e"/><path d="M140 120 C140 90 180 90 180 120" fill="#3a2418"/><rect x="146" y="152" width="28" height="50" fill="#7a6a5a"/><path d="M200 210 L240 150" stroke="#8a7052" stroke-width="8"/>',
    ]
    return (f'<div class="abs mon" style="left:{x}px;top:{y}px;width:340px;height:230px;background:#13202a;border:12px solid #3a4652;border-radius:14px;overflow:hidden">'
            f'<svg viewBox="0 0 320 210" style="position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible">{scenes[k]}</svg><div class="scan" style="position:absolute;left:0;top:0;width:100%;height:8px;background:#b8f3ff;opacity:0.6"></div></div>')
hw, jw = ch("watch", "person", 520, 1180, 560, dict(back=True, phones=True, suit="#2b2f38", skin="#2b2f38"))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#16202a"),
         mon(860, 140, 0), mon(1260, 140, 1), mon(860, 440, 2), mon(1260, 440, 3),
         box("left:780px;top:740px;width:960px;height:50px;background:#2a3440;border-radius:10px"), hw,
         '<div id="@pill" class="pill">IMAGINED THEORY · NOT CANON</div>']
scene("THE OTHER CLUES (PT. 1)", ["someone", "watching", "them"], "dip", "#16202a", parts, jw + r'''
  document.querySelectorAll("#@root .scan").forEach(function (s, k) { tl.fromTo(s, { y: 0 }, { y: 210, duration: 1.6, ease: "none", repeat: 2 }, k * 0.3); });
  tl.fromTo("#@pill", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, 0.4);
  tl.to("#@watch .head", { rotation: 8, duration: 0.6, ease: "power2.inOut" }, 1.2);
  tl.to("#@watch .head", { rotation: -4, duration: 0.7, ease: "power2.inOut" }, 2.8);
  tl.to("#@watch .armR", { rotation: -60, duration: 0.4 }, 2.0);
''', css='#@root .pill{position:absolute;left:1000px;top:690px;padding:8px 18px 10px;border:3px solid #f6c744;background:#16202a;font-family:"Archivo Black";font-size:28px;color:#f6c744;white-space:nowrap;opacity:0}')

# 6 THE OTHER CLUES (PT. 2) — the tower goes up, the storm destroys it, the sky watches
tower = (f'<g stroke="{INK}" stroke-width="10" fill="none" stroke-linejoin="round"><path d="M60 700 L150 0 L240 700"/>' +
         "".join(f'<path d="M{60 + i*13} {700 - i*100} L{240 - i*13} {700 - i*100}"/><path d="M{60 + i*13} {700 - i*100} L{240 - (i+1)*13} {600 - i*100}"/>' for i in range(6)) +
         '</g><circle cx="150" cy="0" r="16" fill="#c4473a"/>')
h1, j1 = ch("p1", "person", 520, 900, 230, dict(skin="#d9a27e", suit="#5a6a7a", brows="flat", mouth="smile"))
h2, j2 = ch("p2", "person", 700, 900, 220, dict(skin="#c98f6e", suit="#7a5a5a", brows="flat", mouth="smile", hair="long"))
h3, j3 = ch("p3", "person", 1500, 900, 230, dict(JIM, mouth="smile", brows="flat"))
eye = '<ellipse cx="0" cy="0" rx="150" ry="70" fill="#f4ede0" stroke="#1b1a18" stroke-width="8"/><circle id="@pupil" cx="0" cy="0" r="40" fill="#1b1a18"/>'
clouds = "".join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#2a3242"/>' for x, y, rx, ry in [(200, 120, 300, 110), (700, 90, 360, 120), (1200, 130, 320, 110), (1700, 100, 340, 120)])
rain = "".join(f'<path d="M{x} {y} L{x - 30} {y + 90}" stroke="#9fb4d0" stroke-width="5" stroke-linecap="round"/>' for x, y in [((i * 137) % 1920, (i * 263) % 900) for i in range(70)])
parts = [box("left:0;top:820px;width:1920px;height:260px;background:#2a3a2a"),
         tree(80, 420, 1.3), tree(1700, 420, 1.2),
         svg("tower", 810, 120, 300, 700, "0 0 300 700", tower), h1, h2, h3,
         svg("clouds", 0, -40, 1920, 300, "0 0 1920 300", clouds), svg("rain", 0, 0, 1920, 1080, "0 0 1920 1080", rain, "opacity:0"),
         bolt("b1", 880, -40, 1.1), bolt("b2", 1300, 0, 0.8),
         svg("eye", 810, 150, 300, 140, "-150 -70 300 140", eye, "opacity:0"),
         box("inset:0;background:#e8efff;mix-blend-mode:screen;opacity:0", "flashb")]
scene("THE OTHER CLUES (PT. 2)", ["reacts", "or", "learning", "how", "it", "works"], "flash", "#4a6284", parts, j1 + j2 + j3 + r'''
  tl.fromTo("#@tower", { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 1.4, ease: "back.out(1.3)" }, 0.3);
  ["@p1", "@p2", "@p3"].forEach(function (p, k) { tl.to("#" + p + " .armR", { rotation: -150, duration: 0.3, ease: "back.out(2)" }, 1.5 + k * 0.12); tl.to("#" + p + " .armL", { rotation: 150, duration: 0.3, ease: "back.out(2)" }, 1.58 + k * 0.12); });
  tl.fromTo("#@clouds", { y: -320 }, { y: 0, duration: 1.0, ease: "power2.out" }, 2.0);
  tl.to("#@world", { backgroundColor: "#26324a", duration: 0.8 }, 2.0);
  tl.set("#@rain", { opacity: 1 }, 2.4);
  tl.fromTo("#@rain", { y: -80 }, { y: 80, duration: 0.3, ease: "none", repeat: 25 }, 2.4);
  [[2.9, "#@b1"], [3.0, "#@b1"], [4.6, "#@b2"], [4.7, "#@b2"]].forEach(function (b) {
    tl.fromTo(b[1], { opacity: 1 }, { opacity: 0, duration: 0.12, immediateRender: false }, b[0]);
    tl.fromTo("#@flashb", { opacity: 0.7 }, { opacity: 0, duration: 0.14, immediateRender: false }, b[0]);
  });
  shake(tl, "#@world", 2.95, 22, 10);
  ["@p1", "@p2", "@p3"].forEach(function (p, k) { tl.to("#" + p + " .armR", { rotation: 0, duration: 0.2 }, 3.0); tl.to("#" + p + " .armL", { rotation: 0, duration: 0.2 }, 3.0); tl.to("#" + p, { x: (k < 2 ? -900 : 900), duration: 1.4, ease: "power2.in" }, 3.4 + k * 0.1); walk(tl, p, 3.4 + k * 0.1, 1.4, 0.1); });
  tl.to("#@tower", { rotation: -68, duration: 0.9, ease: "power3.in", transformOrigin: "50% 100%" }, 3.2);
  shake(tl, "#@world", 4.1, 26, 12);
  tl.fromTo("#@eye", { opacity: 0, scaleY: 0.05 }, { opacity: 1, scaleY: 1, duration: 0.45, ease: "power3.out" }, 6.3);
  tl.fromTo("#@pupil", { x: 0 }, { x: -60, duration: 0.6, ease: "power2.inOut" }, 7.2);
  tl.to("#@pupil", { x: 60, duration: 0.8, ease: "power2.inOut" }, 8.3);
  tl.to("#@pupil", { x: 0, y: 14, duration: 0.5, ease: "power2.inOut" }, 9.4);
''')

# 7 WHAT WE KNOW (PT. 1) — the cave drawing and the tunnel
stick = lambda x, y: f'<circle cx="{x}" cy="{y}" r="12" fill="none" stroke="#3a2a1e" stroke-width="5"/><path d="M{x} {y+12} L{x} {y+50} M{x-18} {y+28} L{x+18} {y+28} M{x} {y+50} L{x-14} {y+76} M{x} {y+50} L{x+14} {y+76}" stroke="#3a2a1e" stroke-width="5"/>'
cave = ('<rect x="0" y="0" width="900" height="1080" fill="#cdb89a"/><circle cx="450" cy="480" r="330" fill="none" stroke="#3a2a1e" stroke-width="8"/>'
        '<path d="M450 200 L450 760 M450 300 L330 200 M450 300 L570 200 M450 380 L300 300 M450 380 L600 300 M450 460 L330 420 M450 460 L570 420" stroke="#3a2a1e" stroke-width="9"/>'
        + "".join(stick(450 + 300 * __import__("math").cos(a), 470 + 300 * __import__("math").sin(a)) for a in [0.3, 1.0, 1.9, 2.6, 3.5, 4.3, 5.2]))
tunnel = "".join(f'<path d="M{-r} 1080 L{-r} {540 - r*0.2:.0f} A{r} {r*1.1:.0f} 0 0 1 {r} {540 - r*0.2:.0f} L{r} 1080 Z" fill="{c}"/>' for r, c in [(520, "#1d2a24"), (420, "#26352e"), (320, "#33463c"), (220, "#4d6656"), (130, "#9fbfa4"), (70, "#f4f6e0")])
sil = lambda x, s: f'<g transform="translate({x} 760) scale({s})"><circle cx="0" cy="-150" r="40" fill="#0f1612"/><rect x="-44" y="-110" width="88" height="200" rx="30" fill="#0f1612"/></g>'
parts = [svg(None, 0, 0, 900, 1080, "0 0 900 1080", cave),
         svg("tun", 900, 0, 1020, 1080, "-510 0 1020 1080", tunnel + '<g id="@sils">' + sil(-260, 1.2) + sil(-120, 1.0) + sil(150, 1.05) + sil(290, 1.25) + "</g>"),
         box("left:896px;top:0;width:10px;height:1080px;background:#1b1a18"),
         svg("lab", 1240, 330, 360, 200, "0 0 360 200", f'<rect x="10" y="10" width="340" height="180" rx="18" fill="#f4ede0" stroke="{INK}" stroke-width="8"/><text x="180" y="125" text-anchor="middle" font-family="Archivo Black" font-size="76" fill="{INK}">LAB?</text>'),
         svg("x", 1250, 320, 340, 220, "0 0 340 220", '<path d="M30 30 L310 190 M310 30 L30 190" stroke="#c4473a" stroke-width="22" stroke-linecap="round"/>', "opacity:0")]
scene("WHAT WE KNOW (PT. 1)", ["supernatural", "explanation"], "dip", "#1d2a24", parts, r'''
  tl.fromTo("#@tun", { scale: 1 }, { scale: 1.12, duration: D, ease: "sine.inOut", transformOrigin: "50% 50%" }, 0);
  tl.fromTo("#@sils", { y: 0 }, { y: -20, duration: 0.5, yoyo: true, repeat: 7, ease: "sine.inOut" }, 0);
  tl.fromTo("#@lab", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.2)" }, 0.8);
  tl.fromTo("#@x", { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power3.in" }, 1.6);
  shake(tl, "#@lab", 1.8, 10, 6);
  tl.to(["#@lab", "#@x"], { opacity: 0, duration: 0.3 }, 4.2);
''')

# 8 THE QUESTION — Jim at the window, someone outside
hj, jj = ch("jim", "person", 520, 1320, 760, dict(JIM, look=6, brows="sad"))
win = (f'<rect x="0" y="0" width="760" height="620" fill="#3a2a1e" stroke="{INK}" stroke-width="10"/>'
       '<rect x="30" y="30" width="700" height="560" fill="#2b3e58"/>'
       '<g id="@shadow"><circle cx="420" cy="250" r="80" fill="#121a26"/><path d="M290 590 C300 400 540 400 550 590 Z" fill="#121a26"/></g>'
       + "".join(f'<path d="M{40 + (i*61) % 680} {40 + (i*97) % 520} l-10 34" stroke="#9fb4d0" stroke-width="4" stroke-linecap="round"/>' for i in range(40)) +
       f'<path d="M380 30 L380 590 M30 310 L730 310" stroke="#3a2a1e" stroke-width="20"/>')
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#3a2e24"),
         svg("win", 1040, 150, 760, 620, "0 0 760 620", win),
         box("left:1070px;top:180px;width:700px;height:560px;background:#e8efff;mix-blend-mode:screen;opacity:0", "wflash"), hj]
scene("THE QUESTION", ["who", "do", "you", "think", "is", "on", "the", "other", "end"], "whip", "#3a2e24", parts, jj + r'''
  gsap.set("#@shadow", { opacity: 0.15 });
  [1.2, 1.28, 4.6, 4.68, 8.0].forEach(function (t, k) { tl.fromTo("#@wflash", { opacity: [0.5, 0.3, 0.55, 0.3, 0.5][k] }, { opacity: 0, duration: 0.14, immediateRender: false }, t); tl.fromTo("#@shadow", { opacity: 1 }, { opacity: 0.15, duration: 0.5, immediateRender: false }, t); });
  tl.to("#@jim .head", { rotation: 6, duration: 0.6, ease: "power2.inOut" }, 1.4);
  tl.to("#@jim .eyes", { scale: 1.2, duration: 0.2, svgOrigin: "0 -124" }, 4.7);
  tl.fromTo("#@shadow", { x: 0 }, { x: -60, duration: 2.0, ease: "sine.inOut", immediateRender: false }, 5.0);
  tl.set("#@shadow", { opacity: 0.85 }, 8.6);
  tl.fromTo("#@world", { scale: 1 }, { scale: 1.14, duration: 3.0, ease: "power2.inOut", transformOrigin: "75% 40%" }, 7.4);
  blink(tl, "@jim", 2.6);
''')

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
sfx = [("a1", "impact-bass-1", 0.0, 2.0, 0.3), ("a2", "whoosh-short", S(2, -0.12), 0.55, 0.3), ("a2q", "pop", S(2, 2.08), 0.6, 0.25),
       ("a3p", "pop", S(3, 3.48), 0.6, 0.25), ("a4", "glitch-3", S(4, -0.02), 1.2, 0.3), ("a4b", "glitch-3", S(4, 1.3), 1.2, 0.2),
       ("a5", "glitch-3", S(5, 0.0), 1.2, 0.15), ("a6", "impact-bass-2", S(6, 2.93 - 1.986), 2.55, 0.35), ("a6b", "impact-bass-1", S(6, 4.08), 2.0, 0.3),
       ("a7", "impact-bass-1", S(7, 1.57), 2.0, 0.25), ("a8", "whoosh-short", S(8, -0.12), 0.55, 0.3),
       ("a8r", "riser", round(TOTAL - 1.6 - 10.03, 3), 10.0, 0.18), ("a8e", "impact-bass-1", round(TOTAL - 1.62, 3), 1.6, 0.3)]
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
