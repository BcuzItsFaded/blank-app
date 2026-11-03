import json, os, random
ROOT = "/home/user/blank-app/alien3-recap"
D = 4.6
INTRO = 2.6
OUTRO = 3.6

S = [
 # title, caption, kb (s0,s1,x0,x1,y0,y1), enter, fx
 ("THE CRASH ON FIORINA 161", "Ripley’s escape pod crashes on a prison planet.", (1.10,1.24,40,140,0,30), "dip", []),
 ("SHE’S THE ONLY SURVIVOR", "Newt and Hicks are dead. Only Ripley made it.", (1.18,1.10,-120,90,0,0), "whipR", []),
 ("A PRISON FULL OF KILLERS", "Dillon’s inmates haven’t seen a woman in years.", (1.10,1.26,0,-60,10,40), "cut", []),
 ("SOMETHING CAME WITH HER", "A stowaway facehugger births a new Alien.", (1.10,1.30,120,-60,0,-10), "dip", ["shake@3.3"]),
 ("BISHOP’S LAST WORDS", "Bishop confirms it: the Alien rode down with her.", (1.12,1.26,-40,-200,0,0), "whipL", []),
 ("IT WON’T KILL HER", "The creature corners Ripley… then walks away.", (1.10,1.16,0,-40,0,0), "flash", ["punch@1.4", "shake@1.4"]),
 ("NO GUNS, ONLY GUTS", "Ripley and Dillon rally the prisoners to fight.", (1.20,1.10,-100,80,0,0), "cut", []),
 ("THE QUEEN INSIDE HER", "The scan explains why: she carries a Queen.", (1.10,1.24,180,220,0,0), "whipR", ["scan"]),
 ("THE COMPANY WANTS HER ALIVE", "Weyland-Yutani is coming for her — and the Queen.", (1.10,1.22,220,160,0,10), "glitch", ["blink"]),
 ("DILLON’S FINAL PLAN", "Lure the Alien into the lead mould.", (1.08,1.22,0,0,-20,20), "dip", ["embers", "flicker"]),
 ("DILLON’S SACRIFICE AND THE MOLTEN LEAD", "Dillon holds it down as the molten lead pours.", (1.12,1.28,140,40,0,0), "flash", ["embers", "flicker", "shake@2.2"]),
 ("THE BEST THING WEYLAND-YUTANI WILL EVER GET", "Ripley falls into the fire, taking the Queen with her.", (1.10,1.34,-60,-300,0,40), "cut", ["embers", "flicker", "fadeout"]),
]

TPL = open(os.path.join(os.path.dirname(__file__), "scene_tpl.html")).read()

def scene(i, t):
    n = i + 1
    sid = f"s{n:02d}"
    title, cap, kb, enter, fx = t
    rnd = random.Random(1000 + n)
    embers = ""
    ember_js = []
    if "embers" in fx:
        for e in range(46):
            x = rnd.uniform(0, 1920); y = rnd.uniform(380, 760); sz = rnd.uniform(4, 10)
            col = rnd.choice(["#ffb347", "#ff8a2a", "#ffd36b", "#ff6a1a"])
            embers += f'<div class="ember" style="left:{x:.0f}px;top:{y:.0f}px;width:{sz:.0f}px;height:{sz:.0f}px;background:{col}"></div>'
            ember_js.append([round(rnd.uniform(-0.8, 1.4), 2), round(rnd.uniform(1.6, 3.0), 2), round(rnd.uniform(-120, 120)), round(rnd.uniform(-520, -260))])
    flick = [round(rnd.uniform(0.05, 0.28), 3) for _ in range(40)]
    shakes = [float(f.split("@")[1]) for f in fx if f.startswith("shake@")]
    punches = [float(f.split("@")[1]) for f in fx if f.startswith("punch@")]
    jitter = [[round(rnd.uniform(-1, 1), 2), round(rnd.uniform(-1, 1), 2)] for _ in range(10)]
    words = cap.split(" ")
    cfg = dict(id=sid, D=D, kb=kb, enter=enter, fx=fx, embers=ember_js, flick=flick, shakes=shakes, punches=punches, jitter=jitter)
    html = (TPL.replace("__ID__", sid)
            .replace("__N__", f"{n:02d}")
            .replace("__IMG__", f"assets/panels/p{n:02d}.png")
            .replace("__TITLE__", title)
            .replace("__CAPWORDS__", "".join(f'<span class="w">{w}</span>' for w in words))
            .replace("__EMBERS__", embers)
            .replace("__CFG__", json.dumps(cfg)))
    open(f"{ROOT}/compositions/{sid}.html", "w").write(html)
    return sid

hosts = []
t0 = INTRO
starts = {}
for i, t in enumerate(S):
    sid = scene(i, t)
    starts[i + 1] = round(t0, 2)
    hosts.append(f'''      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{t0:.2f}" data-duration="{D}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>''')
    t0 += D
outro_start = round(t0, 2)
TOTAL = round(t0 + OUTRO, 2)

def st(n, off=0.0):
    return round(starts[n] + off, 3)

sfx = [
    ("a-intro", "impact-bass-1", 0.28, 2.0, 0.55),
    ("a-w2", "whoosh-short", st(2, -0.12), 0.55, 0.5),
    ("a-d4", "impact-bass-2", st(4, 0.35 - 1.986), 2.55, 0.55),
    ("a-w5", "whoosh", st(5, -0.12), 0.55, 0.5),
    ("a-f6", "impact-bass-1", st(6, -0.04), 2.0, 0.6),
    ("a-w8", "whoosh-short", st(8, -0.12), 0.55, 0.45),
    ("a-p8", "ping", st(8, 0.9), 1.3, 0.25),
    ("a-g9", "glitch-3", st(9, -0.02), 1.2, 0.4),
    ("a-r11", "riser", st(11, -10.0), 10.0, 0.4),
    ("a-f11", "impact-bass-1", st(11, -0.04), 2.0, 0.65),
    ("a-s11", "impact-bass-2", st(11, 2.2 - 1.986), 2.55, 0.45),
    ("a-out", "whoosh-cinematic", round(outro_start + 0.35 - 2.503, 3), 4.0, 0.45),
]
aud = "\n".join(f'      <audio id="{a}" class="clip" src="assets/sfx/{f}.mp3" data-start="{s}" data-duration="{d}" data-volume="{v}" data-track-index="{20+k}"></audio>' for k, (a, f, s, d, v) in enumerate(sfx))

index = f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #070707; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: #070707; }}
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
'''
open(f"{ROOT}/index.html", "w").write(index)
print("total", TOTAL, "outro", outro_start)
