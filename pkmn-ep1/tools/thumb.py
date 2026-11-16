"""Builds thumbnail/v.html and thumbnail/w.html (screenshot them at 1080x1920 and 1280x720)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(os.path.dirname(HERE), "thumbnail")
rig = open(os.path.join(HERE, "rig.js")).read()
F = "file:///root/.cache/hyperframes/fonts/archivo-black/400-normal-1bcaacf553e2.woff2"
ASH = '{skin:"#efc4a2",hair:"spiky",pcap:"#c4262b",suit:"#2a5aa8",brows:"angry",mouth:"shout"}'
GARY = '{skin:"#efc4a2",hair:"spiky",hairc:"#8a5a2e",suit:"#6a4a8a",brows:"angry",mouth:"smile"}'
def page(W, H, body):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:'Archivo Black';src:url('{F}')}}
*{{margin:0;padding:0;box-sizing:border-box}} body{{width:{W}px;height:{H}px;overflow:hidden;background:#6a8ab8;font-family:'Archivo Black'}}
.abs{{position:absolute}} .char svg{{width:100%;height:100%;overflow:visible}} .flip svg{{transform:scaleX(-1)}}
.t{{position:absolute;color:#f4ede0;-webkit-text-stroke:10px #1b1a18;paint-order:stroke fill;line-height:.95;text-align:center}} .y{{color:#f6c744}}
.tag{{position:absolute;padding:12px 26px;background:#c8262b;color:#fff;border:6px solid #1b1a18;border-radius:16px;white-space:nowrap}}
</style><script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script></head><body>{body}
<script>{rig}
document.getElementById("cha").innerHTML=monSVG({{kind:"charizard"}}); document.getElementById("bla").innerHTML=monSVG({{kind:"blastoise"}});
rig("ash","person",{ASH}); rig("gary","person",{GARY});
</script></body></html>"""
ray = lambda x, y, w, h, c1, c2: f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{h//2}px;background:{c1};border:6px solid #1b1a18"><div style="position:absolute;left:10%;right:10%;top:30%;bottom:30%;border-radius:20px;background:{c2}"></div></div>'
v = f"""<div class="abs" style="left:0;top:1100px;width:1080px;height:820px;background:#b8a07a"></div>
<div id="cha" class="char abs" style="left:-20px;top:820px;width:560px;height:560px"></div>
<div id="bla" class="char abs flip" style="left:540px;top:820px;width:560px;height:560px"></div>
{ray(420, 1000, 150, 60, "#ff8a2a", "#ffe08a")}{ray(520, 1040, 150, 60, "#3a9be0", "#dff6ff")}
<div id="ash" class="char abs" style="left:60px;top:1400px;width:330px;height:482px"></div>
<div id="gary" class="char abs" style="left:690px;top:1400px;width:330px;height:482px"></div>
<div class="t" style="left:30px;top:110px;width:1020px;font-size:140px">ASH VS<br><span class="y">GARY</span></div>
<div class="tag" style="left:110px;top:430px;font-size:54px;transform:rotate(-4deg)">THE ULTIMATE RIVALRY</div>
<div class="t" style="left:30px;top:600px;width:1020px;font-size:60px">POKEMON BATTLE · EP. 1</div>"""
w = f"""<div class="abs" style="left:0;top:560px;width:1280px;height:160px;background:#b8a07a"></div>
<div id="cha" class="char abs" style="left:620px;top:250px;width:360px;height:360px"></div>
<div id="bla" class="char abs flip" style="left:920px;top:250px;width:360px;height:360px"></div>
{ray(880, 380, 110, 46, "#ff8a2a", "#ffe08a")}
<div id="ash" class="char abs" style="display:none"></div><div id="gary" class="char abs" style="display:none"></div>
<div class="t" style="left:40px;top:60px;width:620px;font-size:118px;text-align:left">ASH VS<br><span class="y">GARY</span></div>
<div class="tag" style="left:40px;top:340px;font-size:40px;transform:rotate(-3deg)">THE ULTIMATE RIVALRY</div>
<div class="t" style="left:40px;top:450px;width:640px;font-size:40px;text-align:left">POKEMON BATTLE · EP. 1</div>"""
open(os.path.join(OUT, "v.html"), "w").write(page(1080, 1920, v)); open(os.path.join(OUT, "w.html"), "w").write(page(1280, 720, w))
