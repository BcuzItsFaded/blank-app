"""Generates index.html and compositions/ for the Aliens Ep 2 short.

Edit SCENES / NARRATION here and re-run `python3 build.py` to retime or rewrite.
If assets/transcript.json exists (word timings of the voiceover), scene starts
follow the voice and captions are word-synced; otherwise the storyboard clock is used.
"""
import json, os, html

ROOT = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
END_CARD = 3.0

# id, board title, entry, camera stops [(scale, fx, fy)], narration
SCENES = [
    ("Fifty-seven years of loss", "cut", [(1.05, .40, .50), (1.30, .75, .50)],
     "Ripley wakes up fifty-seven years after the Nostromo. Her daughter grew old and died while she drifted in hypersleep."),
    ("Who started the outbreak?", "whip-l", [(1.50, .30, .45), (1.60, .76, .66)],
     "Meanwhile, Burke sends a colony family to check out a derelict ship. Newt's father comes back with something wrapped around his face."),
    ("The Marines don't believe her", "zoom", [(1.10, .25, .50), (1.25, .75, .55)],
     "When the colony goes silent, a squad of cocky Colonial Marines ships out. Ripley knows their guns might not be enough."),
    ("The child who survived", "dip", [(1.05, .50, .50), (1.35, .66, .50)],
     "The colony is empty. Except for one little girl. Newt survived in the air vents, and Ripley becomes the protector she desperately needs."),
    ("The reactor mistake", "whip-r", [(1.30, .50, .78), (1.12, .50, .35)],
     "The colonists' signals lead beneath the reactor. One stray shot could blow it, so Gorman orders the ammo collected. Then the aliens strike."),
    ("The Marines are defeated", "flash", [(1.40, .35, .55), (1.80, .86, .24)],
     "The Marines are torn apart. Ripley rescues the survivors, but an alien brings down their dropship."),
    ("They came through the ceiling", "cut", [(1.20, .45, .28), (1.45, .20, .80)],
     "Sentry guns buy them precious time. Then the motion tracker picks up movement inside their defenses. They're coming through the ceiling."),
    ("Burke is the real traitor", "zoom", [(1.80, .25, .33), (1.60, .74, .33), (1.70, .50, .86)],
     "Then Ripley uncovers the truth. Burke sent the colonists to that ship on purpose. He wants alien specimens brought home, growing inside her and Newt."),
    ("The colony collapses", "whip-l", [(1.80, .18, .30), (1.70, .66, .25), (1.60, .80, .76)],
     "The aliens break in. Marines fall, Hicks is burned by acid, and Newt is dragged down into the hive."),
    ("Mother against mother", "dip", [(1.05, .50, .50), (1.35, .66, .30)],
     "Ripley goes in alone. She finds Newt, and the Queen, laying eggs. Mother against mother. She torches the nest and runs."),
    ("The Queen's last trick", "flash", [(1.80, .62, .18), (1.50, .60, .70)],
     "Bishop picks them up seconds before the blast. But the Queen stowed away, and she tears Bishop in half."),
    ("The final battle", "whip-r", [(1.50, .50, .35), (1.90, .86, .74), (1.90, .30, .88)],
     "So Ripley climbs into a power loader, battles the Queen, and blasts her out the airlock. This time, she saves her daughter."),
]
BOARD_STARTS = [0, 8, 15, 22, 30, 38, 45, 53, 60, 68, 75, 82, 90]

TITLE_SWAP = 2.4  # scene 1: ALIENS title art, then the scene title


def load_words():
    p = os.path.join(ROOT, "assets", "transcript.json")
    if not os.path.exists(p):
        return None
    data = json.load(open(p))
    words = data.get("words", data) if isinstance(data, dict) else data
    return [w for w in words if w.get("text", "").strip()]


def timing():
    """Scene starts, scene ends, and caption words with times."""
    words = load_words()
    narr = [s[3].split() for s in SCENES]
    if words is None:
        starts = BOARD_STARTS[:-1]
        end = BOARD_STARTS[-1]
        cw = []
        for i, ws in enumerate(narr):
            a, b = starts[i] + 0.3, (BOARD_STARTS[i + 1]) - 0.4
            step = (b - a) / len(ws)
            for j, t in enumerate(ws):
                cw.append(dict(text=t, start=a + j * step, end=a + (j + 1) * step, scene=i))
        return starts, end, cw
    # map transcript words to narration words by position
    flat = [(i, t) for i, ws in enumerate(narr) for t in ws]
    if len(words) != len(flat):
        raise SystemExit(f"transcript has {len(words)} words, narration {len(flat)}: align by hand")
    cw = [dict(text=t, start=float(w["start"]), end=float(w["end"]), scene=i) for (i, t), w in zip(flat, words)]
    starts = []
    for i in range(len(SCENES)):
        first = next(w for w in cw if w["scene"] == i)
        starts.append(0.0 if i == 0 else round(first["start"] - 0.35, 3))
    end = round(cw[-1]["end"] + 1.2, 3)
    return starts, end, cw


def cam_state(s, fx, fy):
    lim = (s - 1) * 50
    x = max(-lim, min(lim, (0.5 - fx) * s * 100))
    y = max(-lim, min(lim, (0.5 - fy) * s * 100))
    return dict(scale=s, xPercent=round(x, 2), yPercent=round(y, 2))


def scene_html(i, title, entry, stops, dur):
    n = i + 1
    sid = f"s{n:02d}"
    words = title.upper().split()
    word_spans = "".join(f'<span class="w">{html.escape(w)}</span> ' for w in words)
    first = cam_state(*stops[0])
    js = [f"const tl = gsap.timeline({{ paused: true }});", f"const D = {dur:.3f};"]
    # camera
    if len(stops) == 2 and stops[0][0] < 1.45 and stops[1][0] < 1.45:
        js.append(f"tl.fromTo('#{sid}-cam', {json.dumps(first)}, {{ ...{json.dumps(cam_state(*stops[1]))}, duration: D, ease: 'power1.inOut' }}, 0);")
    else:
        seg = dur / len(stops)
        js.append(f"tl.fromTo('#{sid}-cam', {json.dumps(first)}, {{ scale: {first['scale'] * 1.04:.3f}, duration: {seg:.3f}, ease: 'none' }}, 0);")
        for k in range(1, len(stops)):
            st = cam_state(*stops[k])
            t0 = seg * k - 0.6
            js.append(f"tl.to('#{sid}-cam', {{ ...{json.dumps(st)}, duration: 1.2, ease: 'power2.inOut' }}, {t0:.3f});")
            js.append(f"tl.to('#{sid}-cam', {{ scale: {st['scale'] * 1.04:.3f}, duration: {seg - 0.6 - (0.6 if k < len(stops) - 1 else 0):.3f}, ease: 'none' }}, {t0 + 1.2:.3f});")
    # entry
    if entry == "whip-l" or entry == "whip-r":
        sign = 1 if entry == "whip-l" else -1
        js.append(f"tl.fromTo('#{sid}-win', {{ x: {sign * 1100} }}, {{ x: 0, duration: 0.3, ease: 'expo.out' }}, 0);")
    elif entry == "zoom":
        js.append(f"tl.fromTo('#{sid}-win', {{ scale: 1.5 }}, {{ scale: 1, duration: 0.6, ease: 'expo.out' }}, 0);")
    elif entry == "dip":
        js.append(f"tl.fromTo('#{sid}-veil', {{ opacity: 1 }}, {{ opacity: 0, duration: 0.25, ease: 'power2.out' }}, 0);")
    elif entry == "flash":
        js.append(f"tl.fromTo('#{sid}-flash', {{ opacity: 1 }}, {{ opacity: 0, duration: 0.35, ease: 'power2.out' }}, 0);")
    # title
    t_in = TITLE_SWAP if n == 1 else 0.15
    if n % 2:
        js.append(f"tl.fromTo('#{sid}-title .w', {{ opacity: 0, filter: 'blur(6px)' }}, {{ opacity: 1, filter: 'blur(0px)', duration: 0.13, stagger: 0.067, ease: 'power2.out' }}, {t_in});")
    else:
        js.append(f"tl.fromTo('#{sid}-title', {{ opacity: 0, filter: 'blur(8px)' }}, {{ opacity: 1, filter: 'blur(0px)', duration: 0.18, ease: 'power2.out' }}, {t_in});")
    js.append(f"tl.fromTo('#{sid}-num', {{ opacity: 0 }}, {{ opacity: 1, duration: 0.1 }}, {t_in});")
    js.append(f"tl.to(['#{sid}-title', '#{sid}-num'], {{ opacity: 0, filter: 'blur(6px)', duration: 0.2, ease: 'power2.in' }}, D - 0.25);")
    logo = ""
    if n == 1:
        logo = f'<img id="{sid}-logo" class="logo" src="assets/title.png" alt="Aliens (1986): The colony that never came home" />'
        js.append(f"tl.fromTo('#{sid}-logo', {{ opacity: 1, filter: 'blur(0px)' }}, {{ opacity: 0, filter: 'blur(8px)', duration: 0.2, ease: 'power2.in' }}, {TITLE_SWAP - 0.2});")
    js.append(f"window.__timelines['{sid}'] = tl;")
    script = "\n    ".join(js)
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; }}
    #{sid}-head {{ position: absolute; left: 70px; right: 70px; top: 180px; height: 200px; display: flex; flex-direction: column; justify-content: flex-end; }}
    #{sid}-num {{ align-self: flex-start; background: var(--accent); color: var(--ink); font: 400 40px/1 'League Gothic'; padding: 6px 14px 4px; letter-spacing: 0.04em; margin-bottom: 10px; }}
    #{sid}-title {{ color: var(--ink); font: 400 104px/0.92 'League Gothic'; letter-spacing: 0.01em; text-transform: uppercase; }}
    #{sid}-win {{ position: absolute; left: 0; top: 400px; width: {W}px; height: 780px; overflow: hidden; border-top: 6px solid var(--paper); border-bottom: 6px solid var(--paper); background: #000; }}
    #{sid}-cam {{ position: absolute; inset: 0; }}
    #{sid}-cam img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
    #{sid}-veil, #{sid}-flash {{ position: absolute; inset: 0; opacity: 0; pointer-events: none; }}
    #{sid}-veil {{ background: #000; }}
    #{sid}-flash {{ background: #fff7e8; }}
    .logo {{ position: absolute; left: 0; top: 196px; width: {W}px; height: auto; }}
  </style>
  <div id="root" data-composition-id="{sid}" data-width="{W}" data-height="{H}">
    <div id="{sid}-win" data-layout-allow-overflow>
      <div id="{sid}-cam"><img id="{sid}-img" src="assets/panels/p{n:02d}.jpg" alt="{html.escape(title)}" /></div>
    </div>
    <div id="{sid}-head" data-layout-allow-overlap>
      <div id="{sid}-num">{n:02d}</div>
      <div id="{sid}-title">{word_spans.strip()}</div>
    </div>
    {logo}
    <div id="{sid}-veil"></div>
    <div id="{sid}-flash"></div>
  </div>
  <script>
    {script}
  </script>
</template>
"""


def groups(cw, maxw=5):
    out, cur = [], []
    for k, w in enumerate(cw):
        cur.append(w)
        nxt = cw[k + 1] if k + 1 < len(cw) else None
        brk = (len(cur) >= maxw or w["text"][-1] in ".,!?" and len(cur) >= 2 or nxt is None
               or nxt["scene"] != w["scene"] or nxt["start"] - w["end"] > 0.15 and len(cur) >= 2)
        if brk:
            out.append(cur); cur = []
    return out


def captions_html(cw, total):
    gs = groups(cw)
    items, js = [], ["const tl = gsap.timeline({ paused: true });"]
    for k, g in enumerate(gs):
        gid = f"cap-{k}"
        a = max(0.15, g[0]["start"] - 0.05)
        b = g[-1]["end"] + 0.1
        if k + 1 < len(gs):
            b = min(b + 0.25, gs[k + 1][0]["start"] - 0.06)
        spans = " ".join(f'<span class="cw" id="{gid}-w{j}">{html.escape(w["text"])}</span>' for j, w in enumerate(g))
        items.append(f'<div class="cg" id="{gid}"><div class="box">{spans}</div></div>')
        js.append(f"tl.set('#{gid}', {{ opacity: 1, visibility: 'visible' }}, {a:.3f});")
        js.append(f"tl.fromTo('#{gid} .box', {{ scale: 0.94 }}, {{ scale: 1, duration: 0.18, ease: 'expo.out' }}, {a:.3f});")
        for j, w in enumerate(g):
            js.append(f"tl.fromTo('#{gid}-w{j}', {{ color: '#8f8a80' }}, {{ color: '#f4f2ec', duration: 0.08 }}, {max(a, w['start']):.3f});")
        js.append(f"tl.to('#{gid}', {{ opacity: 0, duration: 0.12, ease: 'power2.in' }}, {b - 0.12:.3f});")
        js.append(f"tl.set('#{gid}', {{ opacity: 0, visibility: 'hidden' }}, {b:.3f});")
    js.append("window.__timelines['captions'] = tl;")
    body = "\n    ".join(items)
    script = "\n    ".join(js)
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; }}
    .cg {{ position: absolute; left: 0; width: {W}px; top: 1196px; height: 128px; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; overflow: visible; }}
    .box {{ max-width: 940px; padding: 14px 28px; background: rgba(10, 14, 20, 0.82); border: 3px solid var(--paper); text-align: center; font: 700 50px/1.12 'Roboto'; color: var(--ink); }}
    .cw {{ display: inline; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="{W}" data-height="{H}">
    {body}
  </div>
  <script>
    {script}
  </script>
</template>
"""


def endcard_html():
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; background: var(--ground); }}
    #end-badge {{ position: absolute; left: 165px; top: 560px; width: 750px; height: auto; }}
    #end-title {{ position: absolute; left: 0; top: 260px; width: {W}px; height: auto; }}
    #end-ep {{ position: absolute; left: 0; width: {W}px; top: 1000px; text-align: center; color: var(--ink); font: 400 120px/1 'League Gothic'; letter-spacing: 0.03em; }}
    #end-cta {{ position: absolute; left: 0; width: {W}px; top: 1150px; text-align: center; color: var(--ink); font: 700 56px/1 'Roboto'; letter-spacing: 0.06em; }}
  </style>
  <div id="root" data-composition-id="endcard" data-width="{W}" data-height="{H}">
    <img id="end-title" src="assets/title.png" alt="Aliens (1986)" />
    <img id="end-badge" src="assets/badge.png" alt="Don't Spoil It RG" />
    <div id="end-ep">EPISODE 2</div>
    <div id="end-cta">FOLLOW FOR MORE</div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo('#end-title', {{ opacity: 0, filter: 'blur(8px)' }}, {{ opacity: 1, filter: 'blur(0px)', duration: 0.2, ease: 'power2.out' }}, 0);
    tl.fromTo('#end-badge', {{ scale: 2.2, rotation: -9, opacity: 0 }}, {{ scale: 1, rotation: -3, opacity: 1, duration: 0.6, ease: 'expo.out' }}, 0.1);
    tl.fromTo('#end-ep', {{ opacity: 0, filter: 'blur(8px)' }}, {{ opacity: 1, filter: 'blur(0px)', duration: 0.18 }}, 0.55);
    tl.fromTo('#end-cta', {{ opacity: 0 }}, {{ opacity: 1, duration: 0.15 }}, 0.8);
    window.__timelines['endcard'] = tl;
  </script>
</template>
"""


def strip_html(starts):
    """The 12 board panels as a strip under the platform UI; the current one centred and lit."""
    tw, th, gap, top = 340, 248, 22, 1420
    thumbs = "\n    ".join(
        f'<div class="th" id="strip-t{k + 1:02d}" style="left:{k * (tw + gap)}px"><img src="assets/panels/p{k + 1:02d}.jpg" alt="" /></div>'
        for k in range(len(SCENES)))
    js = ["const tl = gsap.timeline({ paused: true });"]
    x = lambda k: round(W / 2 - tw / 2 - k * (tw + gap))
    js.append(f"tl.fromTo('#strip-row', {{ x: {x(0)} }}, {{ x: {x(0)}, duration: 0.01 }}, 0);")
    js.append("tl.fromTo('.th', { opacity: 0.32 }, { opacity: 0.32, duration: 0.01 }, 0);")
    js.append("tl.fromTo('#strip-t01', { opacity: 0.32 }, { opacity: 1, duration: 0.3 }, 0);")
    for k in range(1, len(SCENES)):
        t = starts[k]
        js.append(f"tl.to('#strip-row', {{ x: {x(k)}, duration: 0.5, ease: 'power3.inOut' }}, {max(0, t - 0.25):.3f});")
        js.append(f"tl.to('#strip-t{k:02d}', {{ opacity: 0.32, duration: 0.3 }}, {t:.3f});")
        js.append(f"tl.to('#strip-t{k + 1:02d}', {{ opacity: 1, duration: 0.3 }}, {t:.3f});")
    js.append("window.__timelines['strip'] = tl;")
    script = "\n    ".join(js)
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; }}
    #strip-row {{ position: absolute; left: 0; top: {top}px; height: {th}px; width: {len(SCENES) * (tw + gap)}px; }}
    .th {{ position: absolute; top: 0; width: {tw}px; height: {th}px; border: 4px solid var(--paper); overflow: hidden; background: #000; }}
    .th img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
  </style>
  <div id="root" data-composition-id="strip" data-width="{W}" data-height="{H}" data-layout-ignore>
    <div id="strip-row" data-layout-allow-overflow data-layout-ignore>
    {thumbs}
    </div>
  </div>
  <script>
    {script}
  </script>
</template>
"""


def media_len(rel):
    import subprocess
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(ROOT, rel)], capture_output=True, text=True).stdout
    return round(float(out) - 0.01, 2)


def main():
    starts, story_end, cw = timing()
    total = round(story_end + END_CARD, 3)
    os.makedirs(os.path.join(ROOT, "compositions"), exist_ok=True)
    hosts = []
    for i, (title, entry, stops, _) in enumerate(SCENES):
        st = starts[i]
        en = starts[i + 1] if i + 1 < len(starts) else story_end
        dur = round(en - st, 3)
        sid = f"s{i + 1:02d}"
        open(os.path.join(ROOT, "compositions", f"{sid}.html"), "w").write(scene_html(i, title, entry, stops, dur))
        vals = json.dumps({"title": title.upper()})
        hosts.append(f'<div id="{sid}" class="clip" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{st}" data-duration="{dur}" data-track-index="1" data-track-kind="graphics" data-width="{W}" data-height="{H}" style="z-index: 2"></div>')
    open(os.path.join(ROOT, "compositions", "captions.html"), "w").write(captions_html(cw, story_end))
    open(os.path.join(ROOT, "compositions", "endcard.html"), "w").write(endcard_html())
    hosts.append(f'<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{story_end}" data-track-index="2" data-track-kind="captions" data-width="{W}" data-height="{H}" style="z-index: 5"></div>')
    hosts.append(f'<div id="endcard" class="clip" data-composition-id="endcard" data-composition-src="compositions/endcard.html" data-start="{story_end}" data-duration="{END_CARD}" data-track-index="1" data-track-kind="graphics" data-width="{W}" data-height="{H}" style="z-index: 3"></div>')
    open(os.path.join(ROOT, "compositions", "strip.html"), "w").write(strip_html(starts))
    hosts.append(f'<div id="strip" class="clip" data-composition-id="strip" data-composition-src="compositions/strip.html" data-start="0" data-duration="{story_end}" data-track-index="3" data-track-kind="graphics" data-width="{W}" data-height="{H}" style="z-index: 1"></div>')
    audio = []
    if os.path.exists(os.path.join(ROOT, "assets", "voice.mp3")):
        audio.append(f'<audio id="voice" class="clip" src="assets/voice.mp3" data-start="0" data-duration="{media_len('assets/voice.mp3')}" data-track-index="10" data-volume="1"></audio>')
    if os.path.exists(os.path.join(ROOT, "assets", "music.mp3")):
        audio.append(f'<audio id="music" class="clip" src="assets/music.mp3" data-start="0" data-duration="{total}" data-track-index="11" data-volume="0.14" data-fade-out="2"></audio>')
    hosts_s = "\n      ".join(hosts + audio)
    index = f"""<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {{ --ground: #0a0e14; --ink: #f4f2ec; --paper: #e9e6df; --accent: #b3221e; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: {W}px; height: {H}px; overflow: hidden; background: var(--ground); }}
      #root {{ width: 100%; height: 100%; position: relative; background: var(--ground); }}
      #dots {{ position: absolute; inset: 0; opacity: 0.07; background-image: radial-gradient(circle, #f4f2ec 1.4px, transparent 1.6px); background-size: 6px 6px; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="{W}" data-height="{H}" data-motion-blur="on">
      <div id="dots"></div>
      {hosts_s}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
    open(os.path.join(ROOT, "index.html"), "w").write(index)
    print("total", total, "scene starts", starts)


if __name__ == "__main__":
    main()
