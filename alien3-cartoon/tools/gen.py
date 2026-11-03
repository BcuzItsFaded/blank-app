"""Generates the Alien 3 cartoon recap: index.html + compositions/*.html.
Run: python3 tools/gen.py  (from the project folder)"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RIG = open(os.path.join(HERE, "rig.js")).read()
D = 4.4
INTRO, OUTRO = 2.6, 4.0
INK, CREAM, OR = "#1b1a18", "#f4ede0", "#d97757"

# ---------------- placement helpers ----------------
def ch(id_, kind, x, floor, W, opts=None, flip=False, z=None):
    if kind == "person": H = W * 380 / 260; top = floor - 0.974 * H
    elif kind == "alien": H = W * 300 / 520; top = floor - 0.967 * H
    elif kind == "queen": H = W * 0.6; top = floor - H
    else: H = W * 200 / 240; top = floor - H
    cls = "char flip" if flip else "char"
    zs = f"z-index:{z};" if z is not None else ""
    html = f'<div id="@{id_}" class="{cls}" style="left:{x - W/2:.0f}px;top:{top:.0f}px;width:{W:.0f}px;height:{H:.0f}px;{zs}"></div>'
    js = f'rig("@{id_}", "{kind}", {json.dumps(opts or {})});'
    return html, js

def box(css): return f'<div class="abs" style="{css}"></div>'
def flame(x, y, w, h, col="#ff8a2a", inner="#ffd36b"):
    return (f'<svg class="flame" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;overflow:visible" viewBox="0 0 100 160">'
            f'<path d="M50 0 C70 40 100 60 92 110 C86 145 64 160 50 160 C36 160 14 145 8 110 C0 70 36 50 50 0 Z" fill="{col}"/>'
            f'<path d="M50 50 C62 80 78 96 72 126 C68 146 58 156 50 156 C42 156 32 146 28 126 C24 100 42 84 50 50 Z" fill="{inner}"/></svg>')

# ---------------- the 12 scenes ----------------
SC = []

def scene(title, cap, enter, bg, parts, js, css=""):
    SC.append(dict(title=title, cap=cap, enter=enter, bg=bg, parts=parts, js=js, css=css))

# 1 ── the crash
h_pod = ('<div id="@pod" class="abs" style="left:880px;top:700px;width:300px;height:150px">'
         '<svg viewBox="0 0 300 150" style="width:100%;height:100%;overflow:visible">'
         '<g id="@trail"><path d="M40 60 L-420 -330 L-300 -360 L70 30 Z" fill="#ff8a2a"/><path d="M50 60 L-260 -220 L-200 -240 L70 40 Z" fill="#ffd36b"/></g>'
         f'<rect x="20" y="20" width="260" height="110" rx="55" fill="#d9d6cf" stroke="{INK}" stroke-width="7"/>'
         f'<circle cx="200" cy="75" r="28" fill="#7fb2d6" stroke="{INK}" stroke-width="6"/>'
         '<rect x="70" y="40" width="70" height="16" rx="8" fill="#d97757"/><rect x="70" y="94" width="70" height="16" rx="8" fill="#d97757"/></svg></div>')
h_splash = ('<svg id="@splash" class="abs" viewBox="-200 -200 400 400" style="left:830px;top:560px;width:420px;height:420px;overflow:visible">'
            '<polygon points="0,-190 30,-60 120,-150 70,-30 190,-40 80,20 160,110 30,50 0,180 -30,50 -160,110 -80,20 -190,-40 -70,-30 -120,-150 -30,-60" fill="#e8f0f4"/></svg>')
puffs = "".join(f'<div class="puff abs" style="left:{x}px;top:{y}px;width:{s}px;height:{s}px;border-radius:50%;background:#aab3bd"></div>' for x, y, s in [(930,700,90),(1010,680,120),(1090,700,80),(980,650,70)])
scene("THE CRASH ON FIORINA 161", "Ripley’s escape pod crashes on a prison planet.", "dip", "#39405a",
      [box("left:1440px;top:150px;width:180px;height:180px;border-radius:50%;background:#d9d2c3"),
       box("left:0;top:560px;width:1920px;height:300px;background:#4b5268;clip-path:polygon(0 40%,15% 10%,35% 45%,55% 15%,75% 50%,90% 20%,100% 40%,100% 100%,0 100%)"),
       box("left:160px;top:470px;width:520px;height:330px;background:#2a2e3c"),
       box("left:220px;top:330px;width:60px;height:160px;background:#2a2e3c"),
       box("left:520px;top:360px;width:70px;height:130px;background:#2a2e3c"),
       '<div class="abs" style="left:200px;top:520px;width:440px;height:200px;background:repeating-linear-gradient(90deg,#e9b35a 0 26px,transparent 26px 70px);clip-path:inset(0 0 0 0);-webkit-mask:repeating-linear-gradient(0deg,#000 0 22px,transparent 22px 60px);mask:repeating-linear-gradient(0deg,#000 0 22px,transparent 22px 60px)"></div>',
       box("left:0;top:780px;width:1920px;height:300px;background:#26303d"),
       box("left:0;top:820px;width:1920px;height:8px;background:#33404f"), box("left:0;top:900px;width:1920px;height:8px;background:#33404f"),
       h_pod, h_splash, puffs],
      r'''
  gsap.set("#@splash", { scale: 0, opacity: 1 }); gsap.set("#@root .puff", { opacity: 0 });
  tl.fromTo("#@pod", { x: -1150, y: -760, rotation: 22 }, { x: 0, y: 0, rotation: 8, duration: 1.2, ease: "power2.in" }, 0.3);
  tl.to("#@trail", { opacity: 0, duration: 0.1 }, 1.5);
  tl.fromTo("#@splash", { scale: 0, opacity: 1 }, { scale: 1, duration: 0.3, ease: "expo.out" }, 1.5);
  tl.to("#@splash", { scale: 1.2, opacity: 0, duration: 0.5, ease: "power2.in" }, 1.85);
  shake(tl, "#@world", 1.5, 26, 12);
  tl.to("#@pod", { y: 26, rotation: 12, duration: 0.6, ease: "power2.out" }, 1.55);
  document.querySelectorAll("#@root .puff").forEach(function (p, k) {
    tl.fromTo(p, { opacity: 0, y: 0, scale: 0.4 }, { opacity: 0.85, y: -140 - k * 30, scale: 1.3, duration: 1.8, ease: "power1.out" }, 1.7 + k * 0.12);
    tl.to(p, { opacity: 0, duration: 0.6 }, 3.2 + k * 0.1);
  });
''')

# 2 ── only survivor
tube = lambda x: (f'<div class="abs" style="left:{x}px;top:330px;width:240px;height:540px"><svg viewBox="0 0 240 540" style="width:100%;height:100%">'
                  f'<rect x="10" y="10" width="220" height="520" rx="110" fill="#c9d0d4" stroke="{INK}" stroke-width="7"/>'
                  '<rect x="40" y="40" width="160" height="440" rx="80" fill="#7fa9c4"/>'
                  '<circle cx="120" cy="150" r="44" fill="#4c6a80"/><rect x="70" y="200" width="100" height="240" rx="40" fill="#4c6a80"/>'
                  '<path d="M60 90 L100 140 L84 180 L130 230 M150 70 L170 120 L150 150" stroke="#f4ede0" stroke-width="5" fill="none"/>'
                  f'<circle cx="120" cy="505" r="10" fill="#c4473a"/></svg></div>')
h, j = ch("rip", "person", 860, 960, 380, dict(hair="buzz", lashes=True, skin="#efc4a2", suit="#8a8070", brows="sad", look=8))
h2, j2 = ch("doc", "person", 450, 960, 360, dict(hair="thin", coat=True, glasses=True, suit="#6e7a86", look=8))
scene("SHE’S THE ONLY SURVIVOR", "Newt and Hicks didn’t make it. Only Ripley did.", "whip", "#9aa5ac",
      ['<div class="abs" style="inset:0;background:repeating-linear-gradient(0deg,#8e999f 0 4px,transparent 4px 90px),repeating-linear-gradient(90deg,#8e999f 0 4px,transparent 4px 90px)"></div>',
       box("left:0;top:880px;width:1920px;height:200px;background:#5d6870"), tube(1280), tube(1560), h2, h],
      j + j2 + r'''
  tl.fromTo("#@doc", { x: -620 }, { x: 0, duration: 1.0, ease: "power2.out" }, 0.3);
  walk(tl, "@doc", 0.3, 1.0);
  tl.to("#@rip .head", { rotation: 10, duration: 0.45, ease: "power2.inOut" }, 0.8);
  tl.to("#@doc .armR", { rotation: -62, duration: 0.4, ease: "back.out(1.8)" }, 1.5);
  tl.to("#@rip .head", { rotation: 18, duration: 0.6, ease: "power2.inOut" }, 2.2);
  blink(tl, "@rip", 1.9); blink(tl, "@doc", 2.6); blink(tl, "@rip", 3.5);
''')

# 3 ── a prison full of killers
inm = [(260, "#c99a7a"), (520, "#8a5a3c"), (760, "#e0b08a"), (1160, "#6b4430"), (1400, "#b88462"), (1660, "#d9a581")]
parts, js = [box("left:0;top:280px;width:1920px;height:40px;background:#3e2a20"),
             '<div class="abs" style="left:0;top:180px;width:1920px;height:100px;background:repeating-linear-gradient(90deg,#3e2a20 0 10px,transparent 10px 120px)"></div>',
             box("left:0;top:860px;width:1920px;height:220px;background:#3e2c22")], ""
for x in (300, 900, 1500):
    parts.append(f'<div class="abs" style="left:{x}px;top:330px;width:120px;height:70px;background:#e9b35a;clip-path:polygon(30% 0,70% 0,100% 100%,0 100%)"></div>')
for k, (x, sk) in enumerate(inm):
    hh, jj = ch(f"i{k}", "person", x, 860, 190, dict(skin=sk, suit="#7a5a3e", brows="angry", look=-8))
    parts.append(hh); js += jj
hh, jj = ch("dil", "person", 960, 1060, 440, dict(skin="#6b4430", suit="#7a5a3e", beard=True, brows="angry"))
parts.append(hh); js += jj
scene("A PRISON FULL OF KILLERS", "Dillon’s inmates haven’t seen a woman in years.", "cut", "#5b3f30", parts, js + r'''
  for (var k = 0; k < 6; k++) {
    gsap.set("#@i" + k + " .head", { rotation: -14 });
    tl.to("#@i" + k + " .head", { rotation: 0, duration: 0.3, ease: "back.out(2)" }, 0.7 + [0, 0.35, 0.15, 0.5, 0.25, 0.6][k]);
    tl.to("#@i" + k + " .pup", { x: 8, duration: 0.2 }, 0.75 + [0, 0.35, 0.15, 0.5, 0.25, 0.6][k]);
  }
  tl.fromTo("#@dil", { scale: 1 }, { scale: 1.06, duration: 1.4, ease: "power2.inOut", transformOrigin: "50% 100%" }, 1.8);
  blink(tl, "@dil", 1.4); blink(tl, "@dil", 3.6);
''')

# 4 ── something came with her
pipes = "".join(box(f"left:{x}px;top:0;width:{w}px;height:900px;background:#4a5566;border-right:14px solid #5e6b7e") for x, w in [(80, 90), (230, 60), (1620, 110), (1790, 70)])
hh, jj = ch("pris", "person", 420, 900, 210, dict(skin="#c99a7a", suit="#7a5a3e", brows="sad", mouth="open", look=10))
ha, ja = ch("al", "alien", 1160, 900, 980)
scene("SOMETHING CAME WITH HER", "A stowaway facehugger births a brand new Alien.", "dip", "#2e3644",
      [pipes, box("left:0;top:240px;width:1920px;height:70px;background:#4a5566;border-bottom:14px solid #5e6b7e"),
       box("left:0;top:880px;width:1920px;height:200px;background:#222832"), hh, ha],
      jj + ja + r'''
  tl.fromTo("#@al", { x: 1300 }, { x: 0, duration: 2.0, ease: "power1.out" }, 0.2);
  crawl(tl, "@al", 0.2, 2.0);
  tl.fromTo("#@pris", { scale: 1 }, { scale: 0.94, duration: 0.2, yoyo: true, repeat: 1, transformOrigin: "50% 100%" }, 2.5);
  tl.to("#@al .head", { rotation: 10, duration: 0.4, ease: "power2.out" }, 2.3);
  hiss(tl, "@al", 2.7);
  shake(tl, "#@world", 2.75, 14, 8);
  tl.fromTo("#@al .drool", { scaleY: 0.4, svgOrigin: "-170 32" }, { scaleY: 1.4, duration: 1.2, ease: "power1.in", svgOrigin: "-170 32" }, 2.9);
  blink(tl, "@pris", 1.2);
''')

# 5 ── Bishop
hr, jr = ch("rip", "person", 620, 1000, 420, dict(hair="buzz", lashes=True, skin="#efc4a2", suit="#8a8070", brows="sad", look=10))
hb, jb = ch("bis", "bishop", 1200, 760, 380)
scene("BISHOP’S LAST WORDS", "Ripley wakes Bishop. He confirms the Alien rode down with her.", "whip", "#3c4450",
      [box("left:0;top:900px;width:1920px;height:180px;background:#2c323b"),
       box("left:880px;top:760px;width:640px;height:34px;background:#8b939c;border:6px solid #1b1a18;border-radius:8px"),
       box("left:930px;top:794px;width:26px;height:150px;background:#5f666e"), box("left:1440px;top:794px;width:26px;height:150px;background:#5f666e"),
       hb, hr, '<div id="@sp" class="abs" style="left:1180px;top:720px;width:80px;height:60px"><svg viewBox="0 0 80 60" style="width:100%;height:100%"><path d="M10 50 L30 20 M40 55 L50 10 M60 50 L76 24" stroke="#ffd36b" stroke-width="6" stroke-linecap="round"/></svg></div>',
       '<div id="@say" class="say" style="left:1100px;top:330px">It came with you.</div>'],
      jr + jb + r'''
  tl.fromTo("#@rip", { rotation: 0 }, { rotation: 7, duration: 0.6, ease: "power2.inOut", transformOrigin: "50% 100%" }, 0.3);
  tl.to("#@rip .armR", { rotation: -55, duration: 0.4, ease: "power2.out" }, 0.6);
  [0.4, 0.9, 1.5, 2.3, 3.1].forEach(function (t) { tl.fromTo("#@sp", { opacity: 1 }, { opacity: 0, duration: 0.12, ease: "steps(1)" }, t); });
  blink(tl, "@bis", 0.9);
  say(tl, "#@say", 1.2, 2.4);
  tl.to("#@rip .eyes", { scale: 1.25, duration: 0.2, ease: "back.out(2)", svgOrigin: "0 -124" }, 2.0);
''')

# 6 ── it won't kill her
hr, jr = ch("rip", "person", 520, 1210, 660, dict(hair="buzz", lashes=True, skin="#efc4a2", suit="#8a8070", brows="sad", mouth="open", look=14))
ha, ja = ch("al", "alien", 1440, 1000, 1500)
scene("IT WON’T KILL HER", "The creature corners Ripley… then walks away.", "flash", "#24302c",
      [box("left:0;top:0;width:1920px;height:1080px;background:repeating-linear-gradient(90deg,#24302c 0 160px,#2b3934 160px 200px)"), hr, ha],
      jr + ja + r'''
  tl.fromTo("#@al", { x: 1000 }, { x: 0, duration: 0.55, ease: "power3.out" }, 0.4);
  tl.to("#@rip .head", { rotation: -9, duration: 0.25, ease: "power3.out" }, 0.75);
  hiss(tl, "@al", 1.1);
  shake(tl, "#@world", 1.3, 20, 10);
  tl.to("#@rip .eyes", { scaleY: 0.1, duration: 0.08 }, 1.3);
  tl.to("#@al .head", { rotation: -6, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 1 }, 1.8);
  tl.to("#@al", { x: 1500, duration: 0.7, ease: "power2.in" }, 2.8);
  tl.to("#@rip .eyes", { scaleY: 1, duration: 0.1 }, 3.4);
  tl.to("#@rip .head", { rotation: 0, duration: 0.5, ease: "power2.inOut" }, 3.4);
''')

# 7 ── rally
parts, js = [box("left:0;top:280px;width:1920px;height:40px;background:#3e2a20"),
             box("left:0;top:860px;width:1920px;height:220px;background:#3e2c22")], ""
for k, (x, sk) in enumerate([(240, "#c99a7a"), (470, "#8a5a3c"), (1460, "#e0b08a"), (1690, "#b88462"), (1910, "#d9a581")]):
    hh, jj = ch(f"i{k}", "person", x, 850, 200, dict(skin=sk, suit="#7a5a3e", brows="angry", mouth="shout", fistR=True))
    parts.append(hh); js += jj
hr, jr = ch("rip", "person", 720, 1030, 330, dict(hair="buzz", lashes=True, skin="#efc4a2", suit="#8a8070", brows="angry", look=10))
hd, jd = ch("dil", "person", 1160, 1040, 360, dict(skin="#6b4430", suit="#7a5a3e", beard=True, brows="angry", mouth="shout", fistR=True, look=-6))
parts += [hr, hd, '<div id="@say" class="say" style="left:1150px;top:300px">We fight it!</div>']
scene("NO GUNS, ONLY GUTS", "Ripley and Dillon rally the prisoners to fight back.", "cut", "#5b3f30", parts, js + jr + jd + r'''
  tl.to("#@dil .armR", { rotation: -150, duration: 0.3, ease: "back.out(2)" }, 0.7);
  say(tl, "#@say", 0.8, 2.0);
  [1.3, 1.55, 1.42, 1.7, 1.6].forEach(function (t, k) {
    tl.to("#@i" + k + " .armR", { rotation: -150, duration: 0.3, ease: "back.out(2)" }, t);
    tl.fromTo("#@i" + k, { y: 0 }, { y: -26, duration: 0.15, yoyo: true, repeat: 3, ease: "power2.out" }, t + 0.1);
  });
  tl.fromTo("#@rip .head", { rotation: 0 }, { rotation: 8, duration: 0.18, yoyo: true, repeat: 3 }, 2.2);
''')

# 8 ── the queen inside her
mon = ('<div class="abs" style="left:960px;top:200px;width:820px;height:560px;background:#0f1a17;border:14px solid #5a6a66;border-radius:24px;overflow:hidden">'
       '<svg viewBox="0 0 820 560" style="width:100%;height:100%"><g stroke="#7dff9e" stroke-width="6" fill="none">'
       '<circle cx="410" cy="110" r="70"/><path d="M300 560 L300 280 Q300 190 410 190 Q520 190 520 280 L520 560"/></g>'
       '<g id="@emb"><path d="M380 330 C340 330 330 400 380 410 C430 420 460 370 430 340 C410 320 380 340 400 360" stroke="#c4ff7a" stroke-width="9" fill="none" stroke-linecap="round"/>'
       '<circle cx="400" cy="358" r="10" fill="#c4ff7a"/></g></svg>'
       '<div id="@scan" style="position:absolute;left:0;top:0;width:100%;height:10px;background:#7dff9e"></div></div>')
hr, jr = ch("rip", "person", 500, 1020, 430, dict(hair="buzz", lashes=True, skin="#efc4a2", suit="#8a8070", brows="sad", mouth="open", look=12))
scene("THE QUEEN INSIDE HER", "The scan explains why: she’s carrying a Queen.", "whip", "#2f4a4f",
      [box("left:0;top:900px;width:1920px;height:180px;background:#243a3e"), mon, hr],
      jr + r'''
  tl.fromTo("#@scan", { y: 0 }, { y: 550, duration: 1.4, ease: "none" }, 0.4);
  tl.fromTo("#@scan", { y: 0 }, { y: 550, duration: 1.4, ease: "none", immediateRender: false }, 2.0);
  tl.fromTo("#@emb", { scale: 1, svgOrigin: "400 370" }, { scale: 1.15, duration: 0.35, yoyo: true, repeat: 7, ease: "sine.inOut", svgOrigin: "400 370" }, 0.6);
  tl.to("#@rip .armR", { rotation: -95, duration: 0.5, ease: "power2.out" }, 1.4);
  tl.to("#@rip .head", { rotation: 6, duration: 0.5, ease: "power2.inOut" }, 1.4);
  blink(tl, "@rip", 2.8);
''')

# 9 ── the company wants her alive
term = ('<div class="abs" style="left:150px;top:230px;width:960px;height:520px;background:#0f1a12;border:14px solid #4a5a4e;border-radius:20px;padding:44px 50px;font-family:JetBrains Mono,monospace">'
        '<div id="@l1" style="font-size:32px;color:#5fbf7a">INCOMING TRANSMISSION</div>'
        '<div id="@l2" style="font-size:66px;line-height:1.15;color:#7dff9e;font-weight:700;margin-top:30px">RECOVERY TEAM<br>INBOUND</div>'
        '<div id="@l3" style="font-size:58px;color:#ff6a5a;font-weight:700;margin-top:40px">PRIORITY: RIPLEY</div></div>')
port = ('<div class="abs" style="left:1360px;top:250px;width:400px;height:400px;border-radius:50%;background:#39405a;border:18px solid #6b6f6a;overflow:hidden">'
        f'<svg id="@ship" viewBox="0 0 300 120" style="position:absolute;left:50px;top:120px;width:300px;height:120px"><path d="M10 80 L80 30 L220 30 L290 80 L220 100 L80 100 Z" fill="#1b1a18"/>'
        '<circle cx="110" cy="70" r="8" fill="#ffd36b"/><circle cx="150" cy="70" r="8" fill="#ffd36b"/><circle cx="190" cy="70" r="8" fill="#ffd36b"/></svg></div>')
hr, jr = ch("rip", "person", 1220, 1090, 380, dict(hair="buzz", lashes=True, skin="#efc4a2", suit="#8a8070", brows="angry", look=-12))
scene("THE COMPANY WANTS HER ALIVE", "Weyland-Yutani is coming: for her, and the Queen.", "glitch", "#3a3f3a",
      [box("left:0;top:880px;width:1920px;height:200px;background:#2c302c"), term, port, hr],
      jr + r'''
  gsap.set(["#@l1", "#@l2", "#@l3"], { opacity: 0 });
  tl.set("#@l1", { opacity: 1 }, 0.4); tl.set("#@l2", { opacity: 1 }, 0.9);
  tl.fromTo("#@l3", { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "steps(1)", yoyo: true, repeat: 7 }, 1.4);
  tl.set("#@l3", { opacity: 1 }, 3.0);
  tl.fromTo("#@ship", { y: -260 }, { y: 30, duration: 3.2, ease: "power1.out" }, 0.6);
  blink(tl, "@rip", 2.2);
''')

# 10 ── Dillon's final plan
parts = [box("left:0;top:300px;width:1920px;height:30px;background:#2a1a12")]
for x in (150, 700, 1250):
    parts.append(box(f"left:{x}px;top:420px;width:300px;height:220px;border-radius:30px 30px 0 0;background:#ff8a2a;border:12px solid #2a1a12"))
    parts.append(box(f"left:{x+60}px;top:500px;width:180px;height:140px;border-radius:24px 24px 0 0;background:#ffd36b"))
parts.append(box("left:0;top:860px;width:1920px;height:220px;background:#2a1a12"))
for k, x in enumerate((180, 300, 760, 880, 1320, 1440)):
    parts.append(flame(x, 470, 90, 170))
js = ""
for k, (x, sk) in enumerate([(-200, "#c99a7a"), (-480, "#8a5a3c"), (-760, "#6b4430")]):
    hh, jj = ch(f"r{k}", "person", x, 920, 230, dict(skin=sk, suit="#7a5a3e", brows="sad", mouth="open", look=10, beard=(k == 2)))
    parts.append(hh); js += jj
ha, ja = ch("al", "alien", -1500, 930, 760, flip=True)
parts.append(ha)
scene("DILLON’S FINAL PLAN", "Lure the Alien into the foundry’s lead mould.", "dip", "#3b2418", parts, js + ja + r'''
  flames(tl, "#@root .flame", 0, D);
  for (var k = 0; k < 3; k++) {
    tl.fromTo("#@r" + k, { x: 0 }, { x: 2600, duration: 3.0, ease: "none" }, 0.2 + k * 0.12);
    walk(tl, "@r" + k, 0.2 + k * 0.12, 3.0, 0.11);
    tl.fromTo("#@r" + k, { rotation: 6 }, { rotation: 6, duration: 0.01 }, 0);
  }
  tl.fromTo("#@al", { x: 0 }, { x: 3300, duration: 3.2, ease: "none" }, 0.9);
  crawl(tl, "@al", 0.9, 3.2);
''', css="#@root .flip svg{transform:scaleX(-1)}")

# 11 ── Dillon's sacrifice
ladle = ('<div id="@ladle" class="abs" style="left:1330px;top:110px;width:420px;height:260px"><svg viewBox="0 0 420 260" style="width:100%;height:100%;overflow:visible">'
         f'<path d="M40 40 L380 40 L340 240 L80 240 Z" fill="#5f504a" stroke="{INK}" stroke-width="8"/><rect x="30" y="20" width="360" height="40" rx="10" fill="#ffb347" stroke="{INK}" stroke-width="8"/>'
         f'<path d="M210 -40 L210 20" stroke="{INK}" stroke-width="12"/></svg></div>')
stream = '<div id="@stream" class="abs" style="left:1350px;top:250px;width:110px;height:600px;background:#ffb347;border-left:20px solid #ffd36b;border-radius:40px"></div>'
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#3b2418")]
for x in (100, 400, 1500, 1750):
    parts.append(flame(x, 500, 140, 260))
hd, jd = ch("dil", "person", 640, 1040, 420, dict(skin="#6b4430", suit="#7a5a3e", beard=True, brows="angry", mouth="shout", look=10))
ha, ja = ch("al", "alien", 1080, 990, 820)
parts += [ha, hd, ladle, stream,
          box("left:0;top:880px;width:1920px;height:200px;background:#4a3a32;border-top:22px solid #6b5a4e"),
          '<div id="@splashF" class="abs" style="inset:0">' + "".join(flame(x, 560, 200, 320, "#ff6a1a", "#ffd36b") for x in (1100, 1260, 1420, 1580)) + "</div>",
          '<div id="@say" class="say" style="left:300px;top:300px">Come on!</div>',
          '<div id="@glow" class="abs" style="inset:0;background:#ff7a1f;mix-blend-mode:soft-light;opacity:0"></div>']
scene("DILLON’S SACRIFICE AND THE MOLTEN LEAD", "Dillon holds it down as the molten lead pours.", "flash", "#3b2418", parts, jd + ja + r'''
  flames(tl, "#@root .flame", 0, D);
  gsap.set("#@stream", { scaleY: 0, transformOrigin: "50% 0%" }); gsap.set("#@splashF", { opacity: 0 });
  tl.to("#@dil .armR", { rotation: -70, duration: 0.3, ease: "back.out(2)" }, 0.3);
  tl.to("#@dil .armL", { rotation: -30, duration: 0.3, ease: "back.out(2)" }, 0.35);
  say(tl, "#@say", 0.5, 1.1);
  hiss(tl, "@al", 0.6);
  tl.fromTo("#@ladle", { rotation: 0 }, { rotation: -32, duration: 0.6, ease: "power2.inOut", transformOrigin: "20% 20%" }, 1.0);
  tl.to("#@stream", { scaleY: 1, duration: 0.4, ease: "power2.in" }, 1.4);
  tl.set("#@splashF", { opacity: 1 }, 1.8);
  tl.fromTo("#@splashF", { scaleY: 0.2, transformOrigin: "50% 100%" }, { scaleY: 1.3, duration: 0.5, ease: "expo.out" }, 1.8);
  shake(tl, "#@world", 1.8, 24, 12);
  [0, 0.12, 0.3, 0.42, 0.7, 0.9, 1.2, 1.5, 1.8, 2.1].forEach(function (t, k) { tl.set("#@glow", { opacity: [0.35, 0.15, 0.4, 0.2, 0.3, 0.1, 0.35, 0.18, 0.3, 0.15][k] }, 1.8 + t); });
''')

# 12 ── the best thing Weyland-Yutani will ever get
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2a1a12"),
         box("left:1000px;top:616px;width:920px;height:60px;background:#4a3a32;border-bottom:16px solid #6b5a4e")]
hr, jr = ch("rip", "person", 1300, 620, 340, dict(hair="buzz", lashes=True, skin="#efc4a2", suit="#8a8070", brows="sad", look=0))
hq, jq = ch("q", "queen", 1300, 520, 190, z=5)
parts += [hr, hq]
for x in range(-60, 1920, 170):
    parts.append(flame(x, 640, 230, 460, "#ff8a2a", "#ffd36b"))
parts.append('<div id="@glow" class="abs" style="inset:0;background:#ff7a1f;mix-blend-mode:screen;opacity:0.15"></div>')
scene("THE BEST THING WEYLAND-YUTANI WILL EVER GET", "Ripley falls into the fire, taking the Queen with her.", "cut", "#2a1a12", parts, jr + jq + r'''
  flames(tl, "#@root .flame", 0, D);
  gsap.set("#@q", { scale: 0, transformOrigin: "0% 50%" });
  tl.to("#@q", { scale: 1, duration: 0.3, ease: "back.out(2)" }, 0.8);
  shake(tl, "#@rip", 0.8, 10, 8);
  tl.to("#@rip .armL", { rotation: -40, duration: 0.3 }, 1.0);
  tl.to("#@rip .armR", { rotation: 40, duration: 0.3 }, 1.05);
  tl.to(["#@rip", "#@q"], { y: 760, duration: 1.8, ease: "power2.in" }, 1.9);
  tl.to("#@rip", { rotation: -24, duration: 1.8, ease: "power1.in", transformOrigin: "50% 60%" }, 1.9);
  tl.to("#@q", { rotation: -24, duration: 1.8, ease: "power1.in" }, 1.9);
  tl.to("#@rip .armL", { rotation: 100, duration: 0.6, ease: "power2.out" }, 2.1);
  tl.to("#@rip .armR", { rotation: -100, duration: 0.6, ease: "power2.out" }, 2.15);
  tl.fromTo("#@dip", { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "power2.in", immediateRender: false }, D - 0.8);
''')

# ---------------- write scene files ----------------
COMMON_CSS = f"""
    #root {{ position: absolute; inset: 0; overflow: hidden; background: {INK}; }}
    #@world {{ position: absolute; inset: 0; overflow: hidden; }}
    #@root .abs {{ position: absolute; }}
    #@root .char {{ position: absolute; }}
    #@root .char svg {{ width: 100%; height: 100%; overflow: visible; }}
    #@card {{ position: absolute; left: 70px; top: 56px; max-width: 1180px; padding: 18px 30px 22px; background: {CREAM}; border: 5px solid {INK}; border-radius: 22px; z-index: 20; }}
    #@chip {{ display: inline-block; font-family: "Archivo Black", sans-serif; font-size: 34px; line-height: 1; color: {INK}; background: {OR}; padding: 8px 12px 6px; border-radius: 10px; margin-right: 16px; vertical-align: 6px; }}
    #@ttl {{ display: inline; font-family: "Archivo Black", sans-serif; font-size: 44px; line-height: 1.1; color: {INK}; }}
    #@cap {{ margin-top: 10px; font-family: "Inter", sans-serif; font-weight: 600; font-size: 34px; color: #3d3929; }}
    #@cap .w {{ display: inline-block; margin-right: 0.26em; }}
    #@root .say {{ position: absolute; padding: 16px 34px; background: #fbfaf7; border: 5px solid {INK}; border-radius: 26px; font-family: "Archivo Black", sans-serif; font-size: 54px; line-height: 1; color: {INK}; white-space: nowrap; z-index: 15; opacity: 0; }}
    #@flash {{ position: absolute; inset: 0; background: #fff7ea; opacity: 0; z-index: 30; }}
    #@dip {{ position: absolute; inset: 0; background: {INK}; opacity: 0; z-index: 30; }}
"""
ENTER = {
    "dip": 'tl.fromTo("#@dip", { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power2.out" }, 0);',
    "flash": 'tl.fromTo("#@flash", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power2.out" }, 0);',
    "whip": 'tl.fromTo("#@world", { x: 1920 }, { x: 0, duration: 0.36, ease: "power3.out" }, 0);',
    "glitch": '[[-70,0],[50,0.05],[-30,0.1],[80,0.14],[-14,0.19],[0,0.24]].forEach(function(g){ tl.set("#@world", { x: g[0] }, g[1]); }); tl.fromTo("#@dip", { opacity: 0.7 }, { opacity: 0, duration: 0.24, ease: "steps(4)" }, 0);',
    "cut": "",
}

def write_scene(n, s):
    sid = f"s{n:02d}"
    pre = sid + "-"
    words = "".join(f'<span class="w">{w}</span>' for w in s["cap"].split(" "))
    body = "\n      ".join(s["parts"])
    html = f"""<template>
  <style>{COMMON_CSS}
    #@world {{ background: {s['bg']}; }}
    {s['css']}
  </style>
  <div id="root" data-composition-id="{sid}" data-width="1920" data-height="1080" data-layout-allow-overflow data-layout-allow-overlap>
    <span id="@root" style="display:contents">
    <div id="@world">
      {body}
    </div>
    <div id="@card"><span id="@chip">{n:02d}</span><span id="@ttl">{s['title']}</span><div id="@cap">{words}</div></div>
    <div id="@flash"></div>
    <div id="@dip"></div>
    </span>
  </div>
  <script>
    (function () {{
{RIG}
      var P = "#@", D = {D};
      var tl = gsap.timeline({{ paused: true }});
      gsap.set([P + "card", P + "cap .w"], {{ opacity: 0 }});
      {ENTER[s['enter']]}
      card(tl, P, D);
{s['js']}
      window.__timelines["{sid}"] = tl;
    }})();
  </script>
</template>
"""
    open(f"{ROOT}/compositions/{sid}.html", "w").write(html.replace("@", pre))
    return sid

hosts, starts, t = [], {}, INTRO
for i, s in enumerate(SC):
    sid = write_scene(i + 1, s)
    starts[i + 1] = round(t, 2)
    hosts.append(f'      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{t:.2f}" data-duration="{D}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>')
    t += D
outro_start = round(t, 2)
TOTAL = round(t + OUTRO, 2)
st = lambda n, o=0.0: round(starts[n] + o, 3)
sfx = [
    ("a-in", "impact-bass-1", 1.17, 2.0, 0.4),
    ("a-1", "whoosh-cinematic", st(1, 1.53 - 2.503), 3.0, 0.4),
    ("a-1b", "impact-bass-1", st(1, 1.46), 2.0, 0.55),
    ("a-2", "whoosh-short", st(2, -0.12), 0.55, 0.4),
    ("a-4", "impact-bass-2", st(4, 2.73 - 1.986), 2.55, 0.45),
    ("a-5", "whoosh", st(5, -0.12), 0.55, 0.4),
    ("a-5b", "pop", st(5, 1.12), 0.6, 0.3),
    ("a-6", "impact-bass-1", st(6, 1.26), 2.0, 0.55),
    ("a-7", "pop", st(7, 0.72), 0.6, 0.3),
    ("a-8", "whoosh-short", st(8, -0.12), 0.55, 0.4),
    ("a-8b", "ping", st(8, 0.6), 1.3, 0.2),
    ("a-9", "glitch-3", st(9, -0.02), 1.2, 0.35),
    ("a-9b", "typing", st(9, 0.0), 1.0, 0.3),
    ("a-11r", "riser", st(11, 1.83 - 10.03), 10.0, 0.3),
    ("a-11", "impact-bass-1", st(11, 1.76), 2.0, 0.6),
    ("a-12", "impact-bass-2", st(12, 0.83 - 1.986), 2.55, 0.4),
    ("a-out", "whoosh", round(outro_start + 0.2, 3), 0.55, 0.35),
]
aud = "\n".join(f'      <audio id="{a}" class="clip" src="assets/sfx/{f}.mp3" data-start="{s_}" data-duration="{d}" data-volume="{v}" data-track-index="{20+k}"></audio>' for k, (a, f, s_, d, v) in enumerate(sfx))
index = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: {INK}; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: {INK}; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1920" data-height="1080">
      <div id="intro" data-composition-id="intro" data-composition-src="compositions/intro.html" data-start="0" data-duration="{INTRO}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>
{chr(10).join(hosts)}
      <div id="outro" data-composition-id="outro" data-composition-src="compositions/outro.html" data-start="{outro_start}" data-duration="{OUTRO}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>
{aud}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
open(f"{ROOT}/index.html", "w").write(index)

# intro + outro
intro = f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; background: #26303d; }}
    #in-t {{ position: absolute; left: 150px; top: 330px; font-family: "Archivo Black", sans-serif; font-size: 230px; line-height: 0.9; color: {CREAM}; white-space: nowrap; }}
    #in-t span {{ display: inline-block; }}
    #in-s {{ position: absolute; left: 160px; top: 590px; font-family: "Inter", sans-serif; font-weight: 800; font-size: 44px; letter-spacing: 3px; color: {OR}; white-space: nowrap; }}
    #in-al {{ position: absolute; left: 1180px; top: 380px; width: 1300px; height: 750px; }}
    #in-al svg {{ width: 100%; height: 100%; overflow: visible; }}
  </style>
  <div id="root" data-composition-id="intro" data-width="1920" data-height="1080" data-layout-allow-overflow>
    <div id="in-t"><span>A</span><span>L</span><span>I</span><span>E</span><span>N</span><span>&nbsp;</span><span>3</span></div>
    <div id="in-s">THE WHOLE STORY, IN CARTOON</div>
    <div id="in-al"></div>
  </div>
  <script>
    (function () {{
{RIG}
      rig("in-al", "alien", {{}});
      var tl = gsap.timeline({{ paused: true }});
      gsap.set("#in-t span", {{ opacity: 0.35 }});
      tl.fromTo("#in-t span", {{ opacity: 0.35, y: 0 }}, {{ opacity: 1, duration: 0.2, stagger: 0.06, ease: "power2.out" }}, 0);
      tl.fromTo("#in-s", {{ opacity: 0, filter: "blur(8px)" }}, {{ opacity: 1, filter: "blur(0px)", duration: 0.2 }}, 0.45);
      tl.fromTo("#in-al", {{ x: 900 }}, {{ x: 0, duration: 0.7, ease: "power3.out" }}, 0.4);
      crawl(tl, "in-al", 0.4, 0.7);
      hiss(tl, "in-al", 1.15);
      tl.to(["#in-t", "#in-s", "#in-al"], {{ opacity: 0, duration: 0.2 }}, 2.35);
      window.__timelines["intro"] = tl;
    }})();
  </script>
</template>
"""
open(f"{ROOT}/compositions/intro.html", "w").write(intro)
outro = f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; background: {CREAM}; }}
    #ou-t {{ position: absolute; left: 150px; top: 330px; font-family: "Archivo Black", sans-serif; font-size: 170px; line-height: 0.95; color: {INK}; white-space: nowrap; }}
    #ou-t .w {{ display: inline-block; margin-right: 0.2em; }}
    #ou-t .o {{ color: #c9653f; }}
    #ou-b {{ position: absolute; left: 156px; top: 540px; font-family: "Inter", sans-serif; font-size: 46px; color: #3d3929; white-space: nowrap; }}
    #ou-c {{ position: absolute; left: 156px; top: 650px; font-family: "Inter", sans-serif; font-weight: 800; font-size: 32px; letter-spacing: 4px; color: #c9653f; white-space: nowrap; }}
  </style>
  <div id="root" data-composition-id="outro" data-width="1920" data-height="1080">
    <div id="ou-t"><span class="w">SHE</span><span class="w">ENDED</span><span class="w o">IT.</span></div>
    <div id="ou-b">Ripley’s sacrifice kept the Queen out of the Company’s hands.</div>
    <div id="ou-c">ALIEN 3 · THE WHOLE STORY IN 12 SCENES</div>
  </div>
  <script>
    (function () {{
      var tl = gsap.timeline({{ paused: true }});
      gsap.set(["#ou-t .w", "#ou-b", "#ou-c"], {{ opacity: 0 }});
      tl.fromTo("#ou-t .w", {{ opacity: 0, filter: "blur(10px)" }}, {{ opacity: 1, filter: "blur(0px)", duration: 0.2, stagger: 0.14 }}, 0.3);
      tl.fromTo("#ou-b", {{ opacity: 0, filter: "blur(8px)" }}, {{ opacity: 1, filter: "blur(0px)", duration: 0.2 }}, 0.85);
      tl.fromTo("#ou-c", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, 1.2);
      window.__timelines["outro"] = tl;
    }})();
  </script>
</template>
"""
open(f"{ROOT}/compositions/outro.html", "w").write(outro)
print("total", TOTAL)
