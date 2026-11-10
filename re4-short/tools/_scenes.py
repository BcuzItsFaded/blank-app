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
hl2, jl2 = ch("leon2", "person", 1250, 960, 300, dict(LEON, look=6, rocket=True))
hd, jd = ch("ada", "person", 1500, 470, 200, dict(ADA, look=-6))
worm = '<path d="M0 60 C-20 30 30 20 10 -10" stroke="#6a8f3a" stroke-width="16" fill="none" stroke-linecap="round"/><circle cx="10" cy="-16" r="14" fill="#8fbf4a" stroke="#1b1a18" stroke-width="4"/>'
monster = '<ellipse cx="0" cy="0" rx="200" ry="240" fill="#6a3a6a" stroke="#1b1a18" stroke-width="8"/><ellipse cx="0" cy="-40" rx="90" ry="60" fill="#f4e08a" stroke="#1b1a18" stroke-width="6"/><circle cx="0" cy="-40" r="34" fill="#c4262b"/><path d="M-200 60 C-280 120 -300 220 -260 300 M200 60 C280 120 300 220 260 300" stroke="#6a3a6a" stroke-width="40" fill="none" stroke-linecap="round"/>'
parts = [box("left:0;top:0;width:1920px;height:1080px;background:#2f4448"),
         box("left:0;top:720px;width:1920px;height:360px;background:#223234"),
         svg(None, 700, 230, 320, 520, "0 0 320 520", arch), hl1,
         box("left:720px;top:250px;width:280px;height:14px;background:#ff4a4a", "beam"),
         svg("worm", 830, 380, 80, 100, "-40 -40 80 110", worm, "opacity:0"),
         box("left:1300px;top:470px;width:420px;height:24px;background:#1b1a18"),
         hd, svg("monster", 1620, 300, 480, 620, "-240 -260 480 620", monster),
         hl2, box("left:1330px;top:620px;width:70px;height:26px;border-radius:13px;background:#ffb347;border:4px solid #1b1a18;opacity:0", "rk"),
         box("left:1350px;top:440px;width:200px;height:40px;background:#5a6a4a;border:5px solid #1b1a18;border-radius:12px;opacity:0", "thrown"),
         burst("boom", 1700, 520, 1.4)]
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
  tl.fromTo("#@rk", { x: 0 }, { x: 330, y: -100, duration: 0.35, ease: "power2.in" }, 4.9);
  tl.set("#@rk", { opacity: 0 }, 5.25);''' + BOOM_JS("#@boom", 5.25) + r'''
  shake(tl, "#@world", 5.3, 26, 12);
  tl.to("#@monster", { opacity: 0, scale: 0.6, duration: 0.4 }, 5.5);
''')
FOCUS.append([(0, 860), (2.6, 860), (3.2, 1380)])

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
  tl.fromTo("#@heli", { x: 600 }, { x: -300, duration: 4.0, ease: "power1.inOut" }, 4.4);
  tl.fromTo("#@heli .rot", { scaleX: 1, transformOrigin: "50% 50%" }, { scaleX: 0.2, duration: 0.06, yoyo: true, repeat: Math.round(D / 0.06) - 1, ease: "none" }, 0);
  tl.fromTo("#@vial", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.4, duration: 0.3, yoyo: true, repeat: 7 }, 6.0);
''')
FOCUS.append([(0, 1080), (2.2, 1080), (4.6, 960), (6.2, 1300)])
