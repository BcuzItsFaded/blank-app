"""FROM S1 theory short: writes index.html + compositions/*.html. Run: python3 tools/gen.py"""
import json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
LEAD, TAIL, LAST_HOLD = 0.25, 0.35, 1.9

# title, highlight words (lowercase, punctuation stripped), enter, fx, camera (s0,s1,x0,x1,y0,y1)
SC = [
 ("HOOK", ["supernatural", "trap", "experiment"], "cut", ["vortex"], (1.04, 1.16, 0, -60, 0, 20)),
 ("THE THEORY (PT. 1)", ["experiment", "theory"], "whip", ["lamp"], (1.10, 1.02, -80, 40, 10, 0)),
 ("THE THEORY (PT. 2)", ["don't", "connect"], "cut", ["sparks"], (1.04, 1.18, 0, 30, -20, 20)),
 ("THE THEORY WARNING", ["knows", "tabitha", "is", "digging"], "glitch", ["radio"], (1.06, 1.16, 40, -40, 0, 0)),
 ("THE OTHER CLUES (PT. 1)", ["someone", "watching", "them"], "dip", ["scan", "canon"], (1.04, 1.14, -60, 60, 0, 0)),
 ("THE OTHER CLUES (PT. 2)", ["reacts", "or", "learning", "how", "it", "works"], "flash", ["lightning"], (1.04, 1.20, 0, 0, 30, -10)),
 ("WHAT WE KNOW (PT. 1)", ["supernatural", "explanation"], "dip", ["glowlight"], (1.04, 1.22, 0, -220, 0, 0)),
 ("THE QUESTION", ["who", "do", "you", "think", "is", "on", "the", "other", "end"], "whip", ["window"], (1.04, 1.22, 0, -200, 0, 10)),
]
LINES = [l.strip() for l in open(os.path.join(HERE, "vo.txt")) if l.strip()]

def dur(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode())
def speech_bounds(f):
    out = subprocess.run(["ffmpeg", "-i", f, "-af", "silencedetect=n=-38dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    D = dur(f)
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    on = ends[0] if starts and starts[0] < 0.02 and ends else 0.0
    off = starts[-1] if starts and starts[-1] > D - 0.6 else D
    pauses = [(s, e) for s, e in zip(starts, ends) if s > on + 0.05 and e < off - 0.05]
    return on, off, pauses, D

def word_times(text, f):
    """Spread words over the voiced time, weighting by length; punctuation pauses come from silencedetect."""
    on, off, pauses, D = speech_bounds(f)
    words = text.replace("...", "… ").split()
    w = [max(2, len(re.sub(r"[^\w']", "", x))) + 1 for x in words]
    # break points: words that end a phrase, in order, line up with detected pauses
    brk = [i for i, x in enumerate(words) if re.search(r"[,.…?!—]$", x)][: len(pauses)]
    segs, prev_i, prev_t = [], 0, on
    for (i, (ps, pe)) in zip(brk, pauses):
        segs.append((prev_i, i + 1, prev_t, ps)); prev_i, prev_t = i + 1, pe
    segs.append((prev_i, len(words), prev_t, off))
    times = [0.0] * len(words)
    for a, b, t0, t1 in segs:
        tot = sum(w[a:b]) or 1; t = t0
        for k in range(a, b): times[k] = round(t, 3); t += (t1 - t0) * w[k] / tot
    return words, times, D

def chunks(words, maxw=8):
    out, cur = [], []
    for i, x in enumerate(words):
        cur.append(i)
        if len(cur) >= maxw or (re.search(r"[.?!…—]$", x) and len(cur) >= 3) or (x.endswith(",") and len(cur) >= 5):
            out.append(cur); cur = []
    if cur:
        if out and len(cur) < 3: out[-1] += cur
        else: out.append(cur)
    return out

TPL = open(os.path.join(HERE, "scene_tpl.html")).read()
hosts, auds, t = [], [], 0.0
starts = []
for n, (title, hi, enter, fx, cam) in enumerate(SC, 1):
    f = f"{ROOT}/assets/vo/l{n}.wav"
    words, times, vd = word_times(LINES[n - 1], f)
    D = round(LEAD + vd + TAIL + (LAST_HOLD if n == len(SC) else 0), 2)
    ch = chunks(words)
    html_chunks = []
    cfg_chunks = []
    for ci, idx in enumerate(ch):
        spans = "".join(f'<span class="w{" hl" if re.sub(r"[^a-z]", "", words[i].lower().replace("’", "")) in [re.sub(r"[^a-z]", "", h) for h in hi] else ""}">{words[i]}</span>' for i in idx)
        html_chunks.append(f'<div class="chunk" id="@c{ci}">{spans}</div>')
        nxt = ch[ci + 1][0] if ci + 1 < len(ch) else None
        cfg_chunks.append(dict(i=ci, t0=round(LEAD + times[idx[0]] - 0.08, 3), t1=round(LEAD + times[nxt] - 0.08, 3) if nxt is not None else round(D - 0.2, 3),
                               words=[round(LEAD + times[i], 3) for i in idx]))
    cfg = dict(n=n, D=D, enter=enter, fx=fx, cam=cam, chunks=cfg_chunks)
    sid = f"s{n}"
    html = (TPL.replace("__N__", str(n)).replace("__TITLE__", title).replace("__IMG__", f"assets/panels/p{n}.png")
            .replace("__CHUNKS__", "\n      ".join(html_chunks)).replace("__CFG__", json.dumps(cfg)).replace("@", sid + "-").replace("__SID__", sid))
    open(f"{ROOT}/compositions/{sid}.html", "w").write(html)
    hosts.append(f'      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{t:.2f}" data-duration="{D}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>')
    auds.append(f'      <audio id="vo-{n}" class="clip" src="assets/vo/l{n}.wav" data-start="{t + LEAD:.2f}" data-duration="{vd:.2f}" data-volume="1" data-track-index="{30 + n % 2}"></audio>')
    starts.append(t); t += D
TOTAL = round(t, 2)
S = lambda n, o=0.0: round(starts[n - 1] + o, 3)
sfx = [("a1", "impact-bass-1", 0.0, 2.0, 0.35), ("a2", "whoosh-short", S(2, -0.12), 0.55, 0.3), ("a4", "glitch-3", S(4, -0.02), 1.2, 0.3),
       ("a5", "glitch-3", S(5, 0.0), 1.2, 0.18), ("a6", "impact-bass-2", S(6, 0.05 - 1.986 + 0.4), 2.55, 0.35), ("a6b", "impact-bass-1", S(6, 2.4), 2.0, 0.25),
       ("a8", "whoosh-short", S(8, -0.12), 0.55, 0.3), ("a8r", "riser", round(TOTAL - 1.6 - 10.03, 3), 10.0, 0.18), ("a8e", "impact-bass-1", round(TOTAL - 1.62, 3), 1.6, 0.35)]
auds += [f'      <audio id="{a}" class="clip" src="assets/sfx/{fn}.mp3" data-start="{max(0, s_)}" data-duration="{d}" data-volume="{v}" data-track-index="{40 + k}"></audio>' for k, (a, fn, s_, d, v) in enumerate(sfx)]
index = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #0b0f14; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: #0b0f14; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1920" data-height="1080">
{chr(10).join(hosts)}
{chr(10).join(auds)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
open(f"{ROOT}/index.html", "w").write(index)
print("total", TOTAL, [round(s, 2) for s in starts])
