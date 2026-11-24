"""Noah storyboard, scenes 7-8, flat cartoon, vertical 9:16 frames.
Builds storyboard.html (open in a browser) from original characters only.
Run: python3 tools/build.py   (from the noah-storyboard folder)"""
import json, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RIG = open(os.path.join(HERE, "rig.js")).read()
INK = "#1b1a18"
FONT = "file:///root/.cache/hyperframes/fonts/archivo-black/400-normal-1bcaacf553e2.woff2"
NOAH = dict(skin="#b07c5a", hair="messy", hood="#d9902a", suit="#5a4a3a", brows="sad", mouth="open")
RESC = dict(skin="#e0b090", hair="buzz", hairc="#3a2e28", suit="#c8e040", belt=INK, mcap="#e8662a", brows="flat", mouth="smile")


def r0(v):
    return int(round(v))


def ash(seed, n=60):
    r = random.Random(seed)
    return "".join('<circle cx="%d" cy="%d" r="%d" fill="#b8b0b2" opacity="%.2f"/>'
                   % (r.randint(0, 1080), r.randint(0, 1920), r.randint(3, 8), r.uniform(0.3, 0.7)) for _ in range(n))


def volcano(cx, base, w, h):
    top = base - h
    return ('<polygon points="%d,%d %d,%d %d,%d %d,%d" fill="#1d1a1f"/>'
            % (r0(cx - w / 2), base, r0(cx - w * 0.07), top, r0(cx + w * 0.07), top, r0(cx + w / 2), base)
            + '<ellipse cx="%d" cy="%d" rx="%d" ry="22" fill="#ff7a1f"/>' % (r0(cx), top, r0(w * 0.09))
            + '<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#ff7a1f" opacity="0.25"/>' % (r0(cx), top + 10, r0(w * 0.35), r0(h * 0.25)))


def smoke(cx, cy, s=1.0):
    out = ""
    for dx, dy, rx, ry in [(0, 0, 120, 70), (-110, 60, 90, 55), (110, 80, 100, 60), (40, -80, 80, 50)]:
        out += '<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#4a4650" opacity="0.8"/>' % (r0(cx + dx * s), r0(cy - dy * s), r0(rx * s), r0(ry * s))
    return out


def truck(x, y, s):
    return ('<g transform="translate(%d %d) scale(%s)">' % (x, y, s)
            + '<rect x="0" y="0" width="420" height="190" rx="14" fill="#e6e6ea" stroke="%s" stroke-width="6"/>' % INK
            + '<rect x="300" y="60" width="120" height="130" rx="10" fill="#e6e6ea" stroke="%s" stroke-width="6"/>' % INK
            + '<rect x="320" y="80" width="84" height="50" fill="#7fb2d6"/>'
            + '<rect x="20" y="120" width="260" height="22" fill="#e0402a"/>'
            + '<rect x="120" y="-26" width="180" height="22" rx="6" fill="%s"/>' % INK
            + '<circle cx="150" cy="-15" r="70" fill="#e0402a" opacity="0.3"/><circle cx="240" cy="-15" r="70" fill="#3a9be0" opacity="0.3"/>'
            + '<circle cx="150" cy="-15" r="14" fill="#e0402a"/><circle cx="240" cy="-15" r="14" fill="#3a9be0"/>'
            + '<circle cx="90" cy="200" r="40" fill="%s" stroke="%s" stroke-width="6"/>' % (INK, INK)
            + '<circle cx="340" cy="200" r="40" fill="%s" stroke="%s" stroke-width="6"/>' % (INK, INK)
            + '</g>')


def flashlight(x, y, ang, beam=0):
    s = '<g transform="translate(%d %d) rotate(%s)">' % (x, y, ang)
    if beam:
        s += '<polygon points="140,0 %d,%d %d,%d" fill="#fff3b0" opacity="0.3"/>' % (beam, -r0(beam * 0.45), beam, r0(beam * 0.45))
    s += '<rect x="0" y="-14" width="120" height="28" rx="8" fill="#2a2a30" stroke="%s" stroke-width="4"/>' % INK
    s += '<rect x="110" y="-22" width="30" height="44" rx="6" fill="#c8c8d0" stroke="%s" stroke-width="4"/>' % INK
    return s + '</g>'


def fig(id_, x, floor, W, opts, arm=None, head=None):
    H = W * 380 / 260
    top = floor - 0.974 * H
    div = '<div id="%s" style="position:absolute;left:%dpx;top:%dpx;width:%dpx;height:%dpx"></div>' % (id_, r0(x - W / 2), r0(top), r0(W), r0(H))
    js = 'rig("%s","person",%s);' % (id_, json.dumps(opts))
    if arm:
        js += 'document.querySelector("#%s .armR").setAttribute("transform","%s");' % (id_, arm)
    if head:
        js += 'document.querySelector("#%s .head").setAttribute("transform","%s");' % (id_, head)
    return div, js


def bubble(x, y, w, text, size=96):
    return ('<div style="position:absolute;left:%dpx;top:%dpx;width:%dpx;padding:22px 30px;background:#fbfaf7;border:10px solid %s;'
            'border-radius:60px;font-family:\'Archivo Black\',sans-serif;font-size:%dpx;line-height:1.1;text-align:center;color:%s">%s</div>'
            % (x, y, w, INK, size, INK, text))


def card(lines):
    body = "".join('<div style="font-family:\'Archivo Black\',sans-serif;font-size:%dpx;line-height:1.05;color:%s;text-align:center">%s</div>'
                   % (sz, col, t) for sz, col, t in lines)
    return ('<div style="position:absolute;left:0;top:0;width:1080px;height:1920px;display:flex;flex-direction:column;'
            'justify-content:center;align-items:center;gap:70px">' + body + '</div>')


def frame(bgcolor, bgsvg, figs=(), overlay="", extra=""):
    fig_html = "".join(f[0] for f in figs)
    js = "".join(f[1] for f in figs)
    html = ('<div class="frame" style="background:%s">' % bgcolor
            + '<svg viewBox="0 0 1080 1920">%s</svg>' % bgsvg
            + fig_html
            + '<svg viewBox="0 0 1080 1920">%s</svg>' % overlay
            + extra + '</div>')
    return html, js


SCENES = []

# ---------- Scene 7: rescue ----------
# 7A wide: far emergency lights through the ash
bg7a = ('<polygon points="0,1450 300,1300 620,1420 1080,1280 1080,1920 0,1920" fill="#2c2622"/>'
        '<circle cx="330" cy="1110" r="120" fill="#e0402a" opacity="0.25"/><circle cx="330" cy="1110" r="26" fill="#e0402a"/>'
        '<circle cx="760" cy="1090" r="120" fill="#3a9be0" opacity="0.25"/><circle cx="760" cy="1090" r="26" fill="#3a9be0"/>')
f7a = frame("#4a4046", bg7a, [fig("n1", 540, 1800, 230, NOAH)], ash(7))
# 7B close-up: lights flash across his face, flashlight in hand
bg7b = ('<circle cx="80" cy="900" r="260" fill="#e0402a" opacity="0.3"/>'
        '<circle cx="1000" cy="800" r="260" fill="#3a9be0" opacity="0.3"/>')
f7b = frame("#2a2630", bg7b, [fig("n2", 540, 1900, 900, NOAH, head="rotate(-6 0 -70)")],
            flashlight(824, 1463, -40, 0) + ash(8, 40))
# 7C medium: waving the flashlight, HEY! I'M HERE!
bg7c = '<rect x="0" y="1500" width="1080" height="420" fill="#2c2622"/>'
f7c = frame("#3a3440", bg7c, [fig("n3", 540, 1900, 520, NOAH, arm="rotate(-150 40 -36)")],
            flashlight(620, 1345, -95, 520)
            + '<path d="M420 980 Q620 860 820 980" stroke="#fff3b0" stroke-width="10" fill="none" stroke-dasharray="22 14" opacity="0.6"/>',
            bubble(180, 700, 720, "HEY! I'M HERE!", 110))
# 7D medium wide: the rescue vehicle turns toward him
bg7d = '<rect x="0" y="1640" width="1080" height="280" fill="#2c2622"/>'
f7d = frame("#3a3440", bg7d,
            [fig("n4", 230, 1900, 400, NOAH, arm="rotate(-150 40 -36)"), fig("r1", 700, 1900, 380, RESC)],
            truck(340, 1300, 1.7)
            + '<circle cx="595" cy="1274" r="170" fill="#e0402a" opacity="0.2"/><circle cx="748" cy="1274" r="170" fill="#3a9be0" opacity="0.2"/>'
            + '<path d="M150 1680 L70 1680 M170 1720 L90 1720" stroke="#bbb" stroke-width="10" stroke-linecap="round"/>')

SCENES.append(dict(
    code="SCENE 7", title="Rescue (working title)", time="about 10 sec (not given; narration is about 7 sec)",
    narration="Just when Noah thought he had missed his chance, a rescue worker spotted his flashing light.",
    sfx="Emergency siren, vehicle engine",
    panels=[
        dict(code="7A", title="Wide, through the ash", frame=f7a,
             visual="Through the ash, Noah spots flashing emergency lights in the distance.", camera="Static, slow push-in", sound="Low ash hiss, distant siren begins", dialogue="", onscreen=""),
        dict(code="7B", title="Close-up", frame=f7b,
             visual="Lights flash across Noah's face as he grips his flashlight.", camera="Slow push-in", sound="Siren louder", dialogue="", onscreen=""),
        dict(code="7C", title="Medium, waving", frame=f7c,
             visual="He waves the flashlight in wide arcs toward the lights.", camera="Handheld shake", sound="Siren louder, engine rising", dialogue="HEY! I'M HERE!", onscreen=""),
        dict(code="7D", title="Medium wide, vehicle", frame=f7d,
             visual="The rescue vehicle turns toward him, lights strobing; a worker in an orange helmet steps down.", camera="Follows the vehicle", sound="Siren peak, engine rumble", dialogue="", onscreen=""),
    ]))

# ---------- Scene 8: survivor ----------
bg8a = ('<rect x="0" y="0" width="1080" height="120" fill="#22222a"/>'
        '<rect x="200" y="1200" width="680" height="720" rx="30" fill="#4a4048"/>'
        '<rect x="120" y="260" width="840" height="880" fill="#1d2a3a" stroke="%s" stroke-width="16"/>' % INK
        + volcano(560, 1080, 640, 560) + smoke(560, 420, 1.0)
        + '<rect x="536" y="260" width="8" height="880" fill="%s"/>' % INK)
blanket = '<path d="M330 1480 Q560 1390 790 1480 L860 1900 L260 1900 Z" fill="#9a9aa8" stroke="%s" stroke-width="8"/>' % INK
f8a = frame("#34343e", bg8a, [fig("n5", 560, 1900, 520, NOAH)], blanket)
bg8b = ('<circle cx="1000" cy="500" r="300" fill="#ff7a1f" opacity="0.25"/>'
        '<rect x="600" y="0" width="480" height="1920" fill="#ffffff" opacity="0.04"/>')
f8b = frame("#3a3440", bg8b, [fig("n6", 540, 1950, 1000, NOAH, head="rotate(-8 0 -70)")], ash(9, 30))
f8c = frame("#0b0b0e", "", [], "", card([(96, "#fbfaf7", "VOLCANO:"), (150, "#ff7a1f", "SURVIVED")]))
f8d = frame("#0b0b0e", "", [], "", card([(96, "#fbfaf7", "NEXT CHALLENGE:"), (150, "#f6c744", "UNKNOWN")]))

SCENES.append(dict(
    code="SCENE 8", title="Survivor", time="80-90 sec as briefed. The narration is only about 9 sec, so the rest needs more shots (see notes).",
    narration="Noah survived because he stayed calm, understood the danger and made smart decisions. But this was only the beginning of his survival journey.",
    sfx="Engine hum, distant rumble",
    panels=[
        dict(code="8A", title="Wide, inside the vehicle", frame=f8a,
             visual="Noah, wrapped in a blanket, sits inside the evacuation vehicle; the volcano glows through the window.", camera="Static", sound="Engine hum, distant rumble", dialogue="", onscreen=""),
        dict(code="8B", title="Close-up, calm face", frame=f8b,
             visual="His calm face; the volcano reflected in the glass.", camera="Slow push-in", sound="Engine hum", dialogue="", onscreen=""),
        dict(code="8C", title="Title card", frame=f8c,
             visual="Card: VOLCANO: SURVIVED", camera="Hard cut", sound="Music sting", dialogue="", onscreen="VOLCANO: SURVIVED"),
        dict(code="8D", title="Title card", frame=f8d,
             visual="Card: NEXT CHALLENGE: UNKNOWN", camera="Hard cut", sound="Music holds", dialogue="", onscreen="NEXT CHALLENGE: UNKNOWN"),
    ]))


def render_panel(p):
    html, js = p["frame"]
    meta = ('<div class="meta"><b>Visual:</b> %s<br><b>Camera:</b> %s<br><b>Sound:</b> %s' % (p["visual"], p["camera"], p["sound"]))
    if p["dialogue"]:
        meta += '<br><b>Dialogue:</b> &ldquo;%s&rdquo;' % p["dialogue"]
    if p["onscreen"]:
        meta += '<br><b>On-screen:</b> %s' % p["onscreen"]
    meta += "</div>"
    return ('<div class="card"><div class="panel">%s<script>%s</script></div>'
            '<div class="code">%s &middot; %s</div>%s</div>' % (html, js, p["code"], p["title"], meta))


sections = []
for sc in SCENES:
    head = ('<h2>%s &mdash; %s</h2><div class="meta" style="margin:-6px 0 14px"><b>Length:</b> %s<br><b>Narration:</b> &ldquo;%s&rdquo;<br><b>SFX:</b> %s</div>'
            % (sc["code"], sc["title"], sc["time"], sc["narration"], sc["sfx"]))
    sections.append(head + '<div class="row">' + "".join(render_panel(p) for p in sc["panels"]) + "</div>")

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Noah storyboard, scenes 7-8</title>
<style>
@font-face{font-family:'Archivo Black';src:url('__FONT__')}
body{background:#14131a;color:#f4ede0;font-family:system-ui,sans-serif;margin:32px}
h1{font-family:'Archivo Black',sans-serif;font-size:34px;margin:0 0 6px}
h2{font-family:'Archivo Black',sans-serif;font-size:22px;margin:40px 0 12px;color:#f6c744}
.row{display:flex;gap:22px;flex-wrap:wrap}
.card{width:324px}
.panel{width:324px;height:576px;position:relative;overflow:hidden;border:4px solid #3a3440;border-radius:10px;background:#000}
.frame{position:absolute;left:0;top:0;width:1080px;height:1920px;transform:scale(.3);transform-origin:0 0;overflow:hidden}
.frame > svg{position:absolute;left:0;top:0;width:1080px;height:1920px}
.frame > div svg{width:100%;height:100%;overflow:visible}
.code{font-family:'Archivo Black',sans-serif;color:#e0402a;font-size:17px;margin-top:10px}
.meta{font-size:14px;line-height:1.45;color:#cfc7b8;margin-top:6px}
.meta b{color:#f4ede0}
</style>
<script>var gsap={set:function(){},to:function(){},fromTo:function(){}};</script>
<script>__RIG__</script>
</head><body>
<h1>Noah &mdash; storyboard, scenes 7&ndash;8</h1>
<div class="meta">Flat cartoon style, vertical 9:16. Noah and the rescue worker are original characters.</div>
__SECTIONS__
</body></html>
"""
page = PAGE.replace("__FONT__", FONT).replace("__RIG__", RIG).replace("__SECTIONS__", "".join(sections))
open(os.path.join(ROOT, "storyboard.html"), "w", encoding="utf-8").write(page)
print("wrote", os.path.join(ROOT, "storyboard.html"))
