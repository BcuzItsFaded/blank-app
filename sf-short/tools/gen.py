"""STREET FIGHTER (2026) recap, flat-cartoon VERTICAL SHORT (1080x1920). Run: python3 tools/gen.py"""
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

RYU = dict(skin="#efc4a2", hair="spiky", headband="#c4262b", suit="#f0ece4", belt="#1b1a18", brows="angry")
KEN = dict(skin="#f0c8a8", hair="leon", suit="#c4262b", belt="#1b1a18", brows="angry", mouth="smile")
CHUN = dict(skin="#f0c8a8", hair="buns", suit="#2a5aa8", belt="#e9c46a", brows="angry", lashes=True)
BISON = dict(skin="#e0b090", mcap="#8a1f2a", suit="#8a1f2a", cape="#2a1420", belt="#e9c46a", brows="angry", mouth="smile")
AKUMA = dict(skin="#8a5a44", hair="spiky", hairc="#b8262b", suit="#3a3040", belt="#1b1a18", brows="angry", pupil="#e0402a", mouth="shout")
EVIL = dict(RYU, suit="#4a4048", pupil="#e0402a", mouth="shout")
SAGAT = dict(skin="#b88462", suit="#6a3a8a", patch=True, brows="angry", mouth="smile")
import math
def burst(id_, x, y, s, cols=("#ffd36b", "#ff8a2a", "#fff6c8")):
    body = ""
    for k, (r, c) in enumerate(zip((1.0, 0.7, 0.4), cols)):
        pts = [f"{math.cos(i*math.pi/12)*(200 if i % 2 == 0 else 90)*r:.0f},{math.sin(i*math.pi/12)*(200 if i % 2 == 0 else 90)*r:.0f}" for i in range(24)]
        body += f'<polygon points="{" ".join(pts)}" fill="{c}" stroke="#1b1a18" stroke-width="{6 - k*2}" stroke-linejoin="round"/>'
    return svg(id_, x - 200 * s, y - 200 * s, 400 * s, 400 * s, "-200 -200 400 400", body, "opacity:0")
BOOM_JS = lambda sel, t: f'''
  tl.set("{sel}", {{ opacity: 1 }}, {t});
  tl.fromTo("{sel}", {{ scale: 0.1, rotation: 0 }}, {{ scale: 1.1, rotation: 20, duration: 0.3, ease: "expo.out" }}, {t});
  tl.to("{sel}", {{ scale: 1.3, opacity: 0, duration: 0.4, ease: "power2.in" }}, {t} + 0.5);'''
def hado(id_, x, y, s=1, c=("#3a9be0", "#8fd0ff", "#eaf8ff")):
    return svg(id_, x, y, 180 * s, 140 * s, "-90 -70 180 140",
               f'<path d="M-90 0 C-60 -50 -20 -60 20 -50 C-10 -20 -10 20 20 50 C-20 60 -60 50 -90 0 Z" fill="{c[0]}" opacity="0.7"/>'
               f'<circle cx="30" cy="0" r="60" fill="{c[0]}" stroke="#1b1a18" stroke-width="6"/><circle cx="36" cy="0" r="40" fill="{c[1]}"/><circle cx="42" cy="0" r="20" fill="{c[2]}"/>', "opacity:0")
HADO_POSE = lambda who, t: f'''
  tl.to("#{who} .armR", {{ rotation: -78, duration: 0.15, ease: "power3.out" }}, {t});
  tl.to("#{who} .armL", {{ rotation: -150, duration: 0.15, ease: "power3.out" }}, {t});'''
def hud(x, w, p1, p2):
    bar = lambda side, name: (f'<div class="hp {side}"><div class="hpf" id="@hp{side}"></div></div><div class="hpn {side}">{name}</div>')
    return f'<div class="abs hud" style="left:{x}px;top:150px;width:{w}px;height:80px">{bar("l", p1)}{bar("r", p2)}<div class="vs">VS</div></div>'
HUD_CSS = ('#@root .hud .hp{position:absolute;top:0;width:44%;height:26px;background:#5a1a1a;border:5px solid #1b1a18;border-radius:6px;overflow:hidden}'
           '#@root .hud .hp.l{left:0}#@root .hud .hp.r{right:0}#@root .hpf{position:absolute;inset:0;background:#f6c744}#@root .hp.r .hpf{transform-origin:100% 50%}#@root .hp.l .hpf{transform-origin:0 50%}'
           '#@root .hpn{position:absolute;top:34px;font-family:"Archivo Black";font-size:30px;color:#f4ede0;-webkit-text-stroke:3px #1b1a18;paint-order:stroke fill}#@root .hpn.l{left:0}#@root .hpn.r{right:0}'
           '#@root .vs{position:absolute;left:50%;top:-6px;transform:translateX(-50%);font-family:"Archivo Black";font-size:34px;color:#c8262b;-webkit-text-stroke:3px #1b1a18;paint-order:stroke fill}'
           '#@root .ko{position:absolute;font-family:"Archivo Black";font-size:150px;color:#f6c744;-webkit-text-stroke:10px #1b1a18;paint-order:stroke fill;opacity:0;white-space:nowrap}'
           '#@root .stampy{position:absolute;padding:6px 24px;border:7px solid #c8262b;color:#c8262b;font-family:"Archivo Black";font-size:64px;background:rgba(244,237,224,.92);border-radius:12px;opacity:0;white-space:nowrap}'
           '#@root .year{position:absolute;font-family:"Archivo Black";font-size:120px;color:#f4ede0;-webkit-text-stroke:8px #1b1a18;paint-order:stroke fill;white-space:nowrap}')
def crowd(y, col="#2a2030"):
    return "".join(box(f"left:{x}px;top:{y + (x * 37) % 30}px;width:70px;height:120px;border-radius:35px 35px 0 0;background:{col}") for x in range(0, 1920, 60))

# 1 1987 — Ryu wins, Akuma kills Gouken, Ryu disappears
hr, jr = ch("ryu", "person", 960, 960, 320, dict(RYU, mouth="smile", brows="flat"))
hg, jg = ch("gou", "person", 790, 950, 280, dict(skin="#d9b08a", suit="#7a5a3e", beard=True, brows="flat", belt="#1b1a18"))
ha, ja = ch("aku", "person", 1150, 960, 330, dict(AKUMA))
trophy = '<path d="M20 0 L120 0 L110 60 C100 100 40 100 30 60 Z" fill="#e9c46a" stroke="#1b1a18" stroke-width="6"/><rect x="60" y="96" width="20" height="40" fill="#e9c46a" stroke="#1b1a18" stroke-width="5"/><rect x="36" y="130" width="70" height="20" fill="#5a4030" stroke="#1b1a18" stroke-width="5"/>'
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#3a2a40"), crowd(560),
         box("left:0;top:640px;width:1920px;height:440px;background:#6a4a3a"),
         '<div class="year" style="left:800px;top:220px">1987</div>',
         hg, hr, svg("tro", 1010, 370, 140, 150, "0 0 140 150", trophy), ha,
         box("inset:0;background:#e0402a;mix-blend-mode:screen;opacity:0", "red"),
         box("left:1020px;top:380px;width:260px;height:600px;border-radius:130px;background:#8a2a8a;opacity:0;mix-blend-mode:screen", "aura")]
scene("1987", ["ryu", "akuma", "gouken", "disappears"], "cut", "#3a2a40", parts, jr + jg + ja + r'''
  gsap.set("#@aku", { opacity: 0 });
  tl.fromTo("#@ryu .armR", { rotation: 0 }, { rotation: -150, duration: 0.35, ease: "back.out(2)" }, 0.3);
  tl.fromTo("#@tro", { y: 260, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(2)" }, 0.3);
  tl.fromTo("#@ryu", { y: 0 }, { y: -24, duration: 0.18, yoyo: true, repeat: 3 }, 0.7);
  tl.to("#@tro", { opacity: 0, duration: 0.2 }, 3.0);
  tl.to("#@ryu .armR", { rotation: 0, duration: 0.3 }, 3.0);
  tl.fromTo("#@red", { opacity: 0.6 }, { opacity: 0, duration: 0.5, immediateRender: false }, 3.4);
  tl.to("#@aku", { opacity: 1, duration: 0.15 }, 3.4);
  tl.fromTo("#@aura", { opacity: 0 }, { opacity: 0.45, duration: 0.3, yoyo: true, repeat: 5 }, 3.4);
  tl.to("#@aku .armR", { rotation: -80, duration: 0.12, ease: "power3.in" }, 4.3);
  tl.to("#@gou", { rotation: -90, x: -60, y: 40, duration: 0.4, ease: "power2.in", transformOrigin: "50% 100%" }, 4.4);
  shake(tl, "#@world", 4.45, 18, 8);
  tl.to("#@ryu .head", { rotation: 14, duration: 0.4 }, 5.0);
  tl.to(["#@ryu"], { opacity: 0, x: 120, duration: 1.2, ease: "power1.in" }, 7.4);
  walk(tl, "@ryu", 7.4, 1.2, 0.15);
''', css=HUD_CSS)
FOCUS.append([(0, 960)])

# 2 1993 — Chun-Li recruits Ryu and Ken
hr, jr = ch("ryu", "person", 760, 960, 300, dict(RYU, look=-6, brows="flat"))
hk, jk = ch("ken", "person", 1170, 960, 300, dict(KEN, look=6, mouth="flat"))
hc, jc = ch("chun", "person", 965, 980, 300, dict(CHUN))
badge = '<rect x="0" y="0" width="200" height="120" rx="12" fill="#1b1a18"/><rect x="10" y="10" width="180" height="100" rx="8" fill="#e9c46a"/><text x="100" y="74" text-anchor="middle" font-family="Archivo Black" font-size="32" fill="#1b1a18">INTERPOL</text>'
card = lambda i, x: f'<div id="@inv{i}" class="abs inv" style="left:{x}px;top:470px">INVITE</div>'
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2a3348"),
         house(580, 300, 260, 240, "#3a4056", True), house(1100, 280, 300, 260, "#3a4056", True),
         box("left:0;top:640px;width:1920px;height:440px;background:#3a3a44"),
         '<div class="year" style="left:800px;top:190px">1993</div>', hr, hk, hc,
         svg("badge", 860, 330, 200, 120, "0 0 200 120", badge, "opacity:0"), card(0, 900), card(1, 980)]
scene("1993", ["chun-li", "interpol", "ken", "estranged"], "whip", "#2a3348", parts, jr + jk + jc + r'''
  tl.fromTo("#@badge", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.4)" }, 1.4);
  tl.to("#@chun .armR", { rotation: -110, duration: 0.3, ease: "back.out(2)" }, 1.3);
  tl.to("#@badge", { opacity: 0, duration: 0.2 }, 3.2);
  tl.to("#@chun .armR", { rotation: -40, duration: 0.25 }, 3.4);
  tl.to("#@chun .armL", { rotation: 40, duration: 0.25 }, 3.4);
  tl.set(["#@inv0", "#@inv1"], { opacity: 1 }, 3.5);
  tl.fromTo("#@inv0", { x: 0, y: 0, rotation: 0 }, { x: -190, y: 40, rotation: -20, duration: 0.4, ease: "power2.out" }, 3.5);
  tl.fromTo("#@inv1", { x: 0, y: 0, rotation: 0 }, { x: 180, y: 40, rotation: 20, duration: 0.4, ease: "power2.out" }, 3.6);
  tl.to("#@ryu .head", { rotation: 12, duration: 0.3 }, 5.5);
  tl.to("#@ken .head", { rotation: -12, duration: 0.3 }, 5.6);
  tl.to(["#@ryu .head", "#@ken .head"], { rotation: 0, duration: 0.3 }, 6.6);
  blink(tl, "@chun", 2.4);
''', css=HUD_CSS + "#@root .inv{padding:10px 18px;background:#f4ede0;border:5px solid #1b1a18;border-radius:8px;font-family:'Archivo Black';font-size:30px;opacity:0}")
FOCUS.append([(0, 965)])

# 3 THE TRAP — Bison on his balcony, Ryu is the target
hb, jb = ch("bis", "person", 960, 960, 330, dict(BISON))
screen = ('<div class="abs" style="left:720px;top:150px;width:480px;height:300px;background:#1b1a18;border:10px solid #5a5a62;border-radius:12px;overflow:hidden">'
          '<div id="@rface" class="char" style="position:absolute;left:150px;top:20px;width:180px;height:263px"></div>'
          '<svg id="@cross" style="position:absolute;left:140px;top:30px;width:200px;height:200px" viewBox="0 0 200 200"><circle cx="100" cy="100" r="70" stroke="#e0402a" stroke-width="8" fill="none"/><path d="M100 10 L100 60 M100 140 L100 190 M10 100 L60 100 M140 100 L190 100" stroke="#e0402a" stroke-width="8"/></svg>'
          '<div style="position:absolute;left:0;bottom:6px;width:100%;text-align:center;font-family:Archivo Black;font-size:36px;color:#e0402a">TARGET: RYU</div></div>')
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2a1620"),
         box("left:640px;top:920px;width:640px;height:40px;background:#5a2a36;border-top:10px solid #8a3a46"),
         crowd(820, "#1a0e14"), box("left:0;top:960px;width:1920px;height:200px;background:#1a0e14"),
         screen, hb, box("inset:0;background:#e0402a;mix-blend-mode:screen;opacity:0", "red")]
scene("THE TRAP", ["m.", "bison", "trap", "steal", "ryu's", "power"], "dip", "#2a1620", parts, jb + '\n  rig("@rface", "person", ' + json.dumps(dict(RYU, brows="flat")) + ''');
  tl.to("#@bis .armR", { rotation: -150, duration: 0.4, ease: "back.out(1.6)" }, 0.5);
  tl.to("#@bis .armL", { rotation: 150, duration: 0.4, ease: "back.out(1.6)" }, 0.6);
  tl.fromTo("#@red", { opacity: 0.5 }, { opacity: 0, duration: 0.5, immediateRender: false }, 0.9);
  tl.fromTo("#@cross", { scale: 1.6, rotation: -40, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, rotation: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, 2.4);
  tl.fromTo("#@cross", { scale: 1 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 5, immediateRender: false }, 2.9);
  blink(tl, "@bis", 1.8);
''', css=HUD_CSS)
FOCUS.append([(0, 960)])

# 4 THE TOURNAMENT — Ryu caged and forfeits; Ken beats Balrog and Dhalsim
cage = '<rect x="0" y="0" width="320" height="420" fill="none" stroke="#9aa3ab" stroke-width="12"/>' + "".join(f'<path d="M{x} 0 L{x} 420" stroke="#9aa3ab" stroke-width="10"/>' for x in range(40, 320, 50))
hr, jr = ch("ryu", "person", 500, 900, 260, dict(RYU, brows="sad", mouth="open"))
hk, jk = ch("ken", "person", 980, 960, 300, dict(KEN))
hb2, jb2 = ch("bal", "person", 1240, 960, 320, dict(skin="#6b4430", suit="#2a5aa8", brows="angry", fistR=True))
hd, jd = ch("dha", "person", 1240, 960, 300, dict(skin="#8a5a3e", suit="#e9a03a", brows="flat"))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2e2638"), crowd(520),
         box("left:0;top:660px;width:1920px;height:420px;background:#4a3a2e"),
         box("left:760px;top:600px;width:700px;height:10px;background:#c4262b"), box("left:760px;top:650px;width:700px;height:10px;background:#c4262b"),
         hr, svg(None, 340, 420, 320, 420, "0 0 320 420", cage),
         '<div id="@ff" class="stampy" style="left:330px;top:300px">FORFEIT</div>',
         hud(820, 560, "KEN", "BALROG"), hk, hb2, hd,
         '<div id="@ko1" class="ko" style="left:880px;top:280px">K.O.</div>', '<div id="@ko2" class="ko" style="left:880px;top:280px">K.O.</div>',
         '<div id="@nm2" class="abs hpn" style="left:1200px;top:184px;opacity:0;font-family:Archivo Black;font-size:30px;color:#f4ede0;-webkit-text-stroke:3px #1b1a18;paint-order:stroke fill;background:#2e2638;padding:0 6px">DHALSIM</div>']
scene("THE TOURNAMENT", ["forfeits", "ken", "final", "balrog", "dhalsim"], "glitch", "#2e2638", parts, jr + jk + jb2 + jd + r'''
  gsap.set("#@dha", { opacity: 0 });
  tl.fromTo("#@ff", { opacity: 0, scale: 1.8, rotation: -14 }, { opacity: 1, scale: 1, rotation: -8, duration: 0.2, ease: "power3.in" }, 0.6);
  shake(tl, "#@ryu", 0.2, 8, 10);
  tl.to("#@ken .armR", { rotation: -80, duration: 0.12, ease: "power3.out" }, 2.4);
  tl.to("#@ken .armR", { rotation: 0, duration: 0.2 }, 2.6);
  tl.to("#@hpr", { scaleX: 0, duration: 0.5, ease: "power2.out" }, 2.5);
  tl.to("#@bal", { x: 260, rotation: 80, duration: 0.45, ease: "power2.out", transformOrigin: "50% 100%" }, 2.5);
  tl.fromTo("#@ko1", { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power3.in" }, 2.6);
  shake(tl, "#@world", 2.65, 18, 8);
  tl.to("#@ko1", { opacity: 0, duration: 0.15 }, 3.5);
  tl.set("#@bal", { opacity: 0 }, 3.5);
  tl.set("#@dha", { opacity: 1 }, 3.6); tl.set("#@hpr", { scaleX: 1 }, 3.6); tl.set("#@nm2", { opacity: 1 }, 3.6);
  tl.fromTo("#@dha", { x: 300 }, { x: 0, duration: 0.3, ease: "power2.out" }, 3.6);
  tl.to("#@ken .legR", { rotation: -100, duration: 0.15, ease: "power3.out" }, 4.6);
  tl.to("#@ken .legR", { rotation: 0, duration: 0.25 }, 4.85);
  tl.to("#@hpr", { scaleX: 0, duration: 0.5, ease: "power2.out" }, 4.7);
  tl.to("#@dha", { x: 260, rotation: 80, duration: 0.45, ease: "power2.out", transformOrigin: "50% 100%" }, 4.7);
  tl.fromTo("#@ko2", { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power3.in" }, 4.8);
  shake(tl, "#@world", 4.85, 18, 8);
  tl.to("#@hpl", { scaleX: 0.8, duration: 0.3 }, 4.0);
''', css=HUD_CSS)
FOCUS.append([(0, 520), (1.6, 520), (2.2, 1100)])

# 5 THE FORFEIT — Ken walks out, Joe wins, Ken frees Ryu
hk, jk = ch("ken", "person", 1000, 960, 300, dict(KEN, mouth="flat"))
hj, jj = ch("joe", "person", 1250, 960, 300, dict(skin="#e0b090", suit="#3a3a3a", brows="flat", mouth="smile", hair="buzz"))
hn, jn = ch("ann", "person", 1500, 940, 260, dict(skin="#8a5a3e", suit="#e9c46a", brows="flat", mouth="shout", glasses=True))
hr, jr = ch("ryu", "person", 500, 900, 260, dict(RYU, brows="sad"))
cage = '<rect x="0" y="0" width="320" height="420" fill="none" stroke="#9aa3ab" stroke-width="12"/>' + "".join(f'<path d="M{x} 0 L{x} 420" stroke="#9aa3ab" stroke-width="10"/>' for x in range(40, 320, 50))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2e2638"), crowd(520),
         box("left:0;top:660px;width:1920px;height:420px;background:#4a3a2e"),
         hr, svg("cage", 340, 420, 320, 420, "0 0 320 420", cage), hk, hj, hn,
         '<div id="@win" class="stampy" style="left:950px;top:300px;font-size:48px;text-align:center">WINNER BY<br>FORFEIT: JOE</div>']
scene("THE FORFEIT", ["walks", "away", "joe"], "cut", "#2e2638", parts, jr + jk + jj + jn + r'''
  tl.to("#@ken .head", { rotation: -14, duration: 0.3 }, 0.4);
  tl.fromTo("#@ken", { x: 0 }, { x: -380, duration: 1.4, ease: "power1.inOut" }, 0.8);
  walk(tl, "@ken", 0.8, 1.4, 0.14);
  tl.to("#@joe .armR", { rotation: -160, duration: 0.3, ease: "back.out(2)" }, 1.9);
  tl.to("#@ann .armR", { rotation: -120, duration: 0.3, ease: "back.out(2)" }, 1.8);
  tl.fromTo("#@win", { opacity: 0, scale: 1.6, rotation: -10 }, { opacity: 1, scale: 1, rotation: -5, duration: 0.25, ease: "power3.in" }, 2.2);
  tl.to("#@ken .legR", { rotation: -100, duration: 0.15, ease: "power3.out" }, 3.8);
  tl.to("#@cage", { x: -120, y: 200, rotation: -30, opacity: 0, duration: 0.5, ease: "power2.in" }, 3.9);
  shake(tl, "#@world", 3.95, 16, 8);
  tl.to("#@ken .legR", { rotation: 0, duration: 0.25 }, 4.1);
  tl.to("#@ryu .head", { rotation: 10, duration: 0.3 }, 4.5);
''', css=HUD_CSS)
FOCUS.append([(0, 1180), (2.9, 1180), (3.6, 720)])

# 6 AKUMA — Ryu's dark power takes over
hr, jr = ch("ryu", "person", 800, 960, 320, dict(RYU))
he, je = ch("evil", "person", 800, 960, 320, dict(EVIL))
ha, ja = ch("aku", "person", 1130, 960, 340, dict(AKUMA))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#1e1622"),
         box("left:0;top:680px;width:1920px;height:400px;background:#2e2230"),
         box("left:640px;top:330px;width:320px;height:640px;border-radius:160px;background:#e0402a;mix-blend-mode:screen;opacity:0", "da"),
         box("left:960px;top:330px;width:340px;height:660px;border-radius:170px;background:#8a2a8a;mix-blend-mode:screen;opacity:0.35", "aa"),
         hud(660, 600, "RYU", "AKUMA"), hr, he, ha, hado("dh", 900, 600, 1.2, ("#8a1a2a", "#e0402a", "#ffb0a0")), burst("boom", 1130, 700, 1.0),
         '<div id="@ko" class="ko" style="left:790px;top:300px">K.O.</div>']
scene("AKUMA", ["akuma", "dark", "power", "evil", "ryu"], "flash", "#1e1622", parts, jr + je + ja + r'''
  gsap.set("#@evil", { opacity: 0 });
  tl.fromTo("#@aku", { x: 500 }, { x: 0, duration: 0.5, ease: "power3.out" }, 0.2);
  tl.fromTo("#@aa", { opacity: 0.2 }, { opacity: 0.5, duration: 0.3, yoyo: true, repeat: 15 }, 0);
  tl.to("#@aku .armR", { rotation: -80, duration: 0.12 }, 1.0);
  tl.to("#@hpl", { scaleX: 0.4, duration: 0.4 }, 1.05);
  shake(tl, "#@ryu", 1.05, 12, 8);
  tl.to("#@aku .armR", { rotation: 0, duration: 0.2 }, 1.3);
  tl.fromTo("#@da", { opacity: 0 }, { opacity: 0.55, duration: 0.5 }, 1.9);
  tl.to("#@evil", { opacity: 1, duration: 0.4 }, 2.1);
  tl.to("#@ryu", { opacity: 0, duration: 0.4 }, 2.1);
  shake(tl, "#@world", 2.2, 10, 10);''' + HADO_POSE("@evil", 3.4) + r'''
  tl.set("#@dh", { opacity: 1 }, 3.55);
  tl.fromTo("#@dh", { x: 0 }, { x: 160, duration: 0.25, ease: "power2.in" }, 3.55);
  tl.set("#@dh", { opacity: 0 }, 3.8);''' + BOOM_JS("#@boom", 3.8) + r'''
  tl.to("#@hpr", { scaleX: 0, duration: 0.5 }, 3.8);
  tl.to("#@aku", { x: 260, rotation: 80, duration: 0.5, ease: "power2.out", transformOrigin: "50% 100%" }, 3.85);
  shake(tl, "#@world", 3.85, 22, 10);
  tl.fromTo("#@ko", { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power3.in" }, 4.2);
''', css=HUD_CSS)
FOCUS.append([(0, 960)])

# 7 KEN'S HADOUKEN — Ken saves Ryu; Bison escapes with Akuma
he, je = ch("evil", "person", 1100, 960, 320, dict(EVIL))
hr, jr = ch("ryu", "person", 1100, 960, 320, dict(RYU, brows="sad", mouth="open"))
hk, jk = ch("ken", "person", 800, 960, 310, dict(KEN, mouth="shout"))
hb, jb = ch("bis", "person", 1440, 960, 300, dict(BISON))
ha, ja = ch("aku", "person", 1640, 940, 300, dict(AKUMA, mouth="flat"))
van = '<rect x="0" y="40" width="420" height="200" rx="20" fill="#2a2a32" stroke="#1b1a18" stroke-width="8"/><rect x="300" y="70" width="100" height="70" fill="#7fb2d6"/><circle cx="90" cy="250" r="40" fill="#1b1a18"/><circle cx="330" cy="250" r="40" fill="#1b1a18"/><circle cx="210" cy="130" r="30" fill="#8a1f2a"/>'
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2a2230"),
         box("left:0;top:680px;width:1920px;height:400px;background:#3a2e36"),
         box("left:940px;top:330px;width:320px;height:640px;border-radius:160px;background:#e0402a;mix-blend-mode:screen;opacity:0.5", "da"),
         svg("van", 1460, 640, 420, 290, "0 0 420 290", van), hb, ha, he, hr, hk,
         hado("kh", 880, 600, 1.2), burst("hit", 1100, 700, 0.9, ("#8fd0ff", "#3a9be0", "#eaf8ff"))]
scene("KEN’S HADOUKEN", ["ken", "hadouken", "bison", "escapes", "akuma"], "whip", "#2a2230", parts, je + jr + jk + jb + ja + r'''
  gsap.set("#@ryu", { opacity: 0 });
  tl.fromTo("#@evil", { x: 0 }, { x: -40, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.2);''' + HADO_POSE("@ken", 1.3) + r'''
  tl.set("#@kh", { opacity: 1 }, 1.45);
  tl.fromTo("#@kh", { x: 0 }, { x: 140, duration: 0.25, ease: "power2.in" }, 1.45);
  tl.set("#@kh", { opacity: 0 }, 1.7);''' + BOOM_JS("#@hit", 1.7) + r'''
  tl.to("#@da", { opacity: 0, duration: 0.5 }, 1.8);
  tl.to("#@evil", { opacity: 0, duration: 0.4 }, 1.9);
  tl.to("#@ryu", { opacity: 1, duration: 0.4 }, 1.9);
  tl.to(["#@ken .armR", "#@ken .armL"], { rotation: 0, duration: 0.3 }, 2.6);
  tl.to("#@bis .armL", { rotation: 70, duration: 0.3 }, 4.2);
  tl.to(["#@bis", "#@aku"], { x: 260, opacity: 0, duration: 0.6, ease: "power2.in" }, 4.9);
  tl.to("#@van", { x: 900, duration: 0.8, ease: "power3.in" }, 5.4);
''')
FOCUS.append([(0, 960), (3.6, 960), (4.3, 1500)])

# 8 ROUND TWO — Bison recruits Sagat
hb, jb = ch("bis", "person", 840, 980, 320, dict(BISON))
hs, js = ch("sag", "person", 1110, 990, 400, dict(SAGAT))
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#1a1218"),
         box("left:560px;top:120px;width:800px;height:900px;background:#2e1e28;border-radius:400px 400px 0 0"),
         box("left:0;top:760px;width:1920px;height:320px;background:#120c10"), hb, hs,
         '<div id="@r2" class="ko" style="left:700px;top:160px;width:550px;font-size:130px;text-align:center;line-height:1">ROUND<br>2?</div>']
scene("ROUND TWO", ["sagat", "round", "two"], "dip", "#1a1218", parts, jb + js + r'''
  tl.fromTo("#@sag", { opacity: 0, x: 200 }, { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }, 0.3);
  tl.to("#@bis .armR", { rotation: -70, duration: 0.3 }, 1.2);
  tl.to("#@sag .armL", { rotation: 70, duration: 0.3 }, 1.3);
  tl.fromTo("#@r2", { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power3.in" }, 2.8);
  shake(tl, "#@world", 2.85, 14, 8);
  blink(tl, "@sag", 2.0);
''', css=HUD_CSS)
FOCUS.append([(0, 975)])

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
sfx = [("a1", "pop", S(1, 0.28), 0.6, 0.25), ("a1b", "impact-bass-2", S(1, 3.4 - 1.986), 2.55, 0.3), ("a1c", "impact-bass-1", S(1, 4.4), 2.0, 0.3),
       ("a2", "whoosh-short", S(2, -0.12), 0.55, 0.3), ("a2b", "pop", S(2, 1.32), 0.6, 0.25), ("a3", "impact-bass-1", S(3, 0.85), 2.0, 0.3),
       ("a4", "glitch-3", S(4, -0.02), 1.2, 0.3), ("a4b", "impact-bass-1", S(4, 2.5), 2.0, 0.35), ("a4c", "impact-bass-1", S(4, 4.7), 2.0, 0.35),
       ("a5", "pop", S(5, 2.15), 0.6, 0.25), ("a5b", "impact-bass-1", S(5, 3.9), 2.0, 0.3), ("a6", "impact-bass-2", S(6, 2.1 - 1.986), 2.55, 0.35),
       ("a6b", "whoosh", S(6, 3.45), 0.55, 0.35), ("a6c", "impact-bass-1", S(6, 3.78), 2.0, 0.4), ("a7", "whoosh", S(7, 1.35), 0.55, 0.35),
       ("a7b", "impact-bass-1", S(7, 1.68), 2.0, 0.35), ("a7c", "whoosh-short", S(7, 5.3), 0.55, 0.3), ("a8r", "riser", S(8, 2.8 - 10.03), 10.0, 0.15),
       ("a8", "impact-bass-1", S(8, 2.78), 2.0, 0.4)]
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
