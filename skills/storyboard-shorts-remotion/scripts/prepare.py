"""Prepare a storyboard + script for the Remotion Short template.

Usage: python3 prepare.py BOARD.png SCRIPT.json PROJECT_DIR --grid COLSxROWS [--title "YOU — SEASON 1"] [--subtitle "..."] [--voice en-US-ChristopherNeural] [--rate +6%]

SCRIPT.json: [{"label": "THE BOOKSTORE", "lines": ["Sentence one.", "Sentence two."]}, ...]
One entry per storyboard panel, in reading order (left to right, top to bottom).
Writes PROJECT_DIR/public/panels, public/audio (narration + music bed) and src/data.json.
"""
import argparse, json, os, subprocess, sys, wave
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("board"); ap.add_argument("script"); ap.add_argument("project")
ap.add_argument("--grid", required=True, help="e.g. 3x4 = 3 columns, 4 rows")
ap.add_argument("--voice", default="en-US-ChristopherNeural"); ap.add_argument("--rate", default="+6%")
ap.add_argument("--title", default="TITLE"); ap.add_argument("--subtitle", default="")
ap.add_argument("--gutter", type=int, default=6, help="pixels trimmed around each panel")
a = ap.parse_args()
cols, rows = map(int, a.grid.lower().split("x"))
P = a.project; here = os.path.dirname(os.path.abspath(__file__))
for d in ("public/panels", "public/audio/lines", "src"):
    os.makedirs(os.path.join(P, d), exist_ok=True)
scenes = json.load(open(a.script))
board = Image.open(a.board).convert("RGB"); W, H = board.size
cw, rh, g = W / cols, H / rows, a.gutter
for i in range(len(scenes)):
    c, r = i % cols, i // cols
    box = (round(c * cw + g), round(r * rh + g), round((c + 1) * cw - g), round((r + 1) * rh - g))
    board.crop(box).resize((960, 960), Image.LANCZOS).save(f"{P}/public/panels/p{i:02d}.jpg", quality=93)

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))

gap = f"{P}/public/audio/gap.mp3"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.4", gap], check=True)
FPS, LEAD, TAIL = 30, 0.35, 0.55
t, segs = 0.0, []
for i, sc in enumerate(scenes):
    words, parts, off = [], [], 0.0
    for j, text in enumerate(sc["lines"]):
        mp = f"{P}/public/audio/lines/{i:02d}_{j:02d}.mp3"
        subprocess.run([sys.executable, f"{here}/tts_words.py", a.voice, a.rate, text, mp], check=True)
        wj = json.load(open(mp[:-4] + ".json")); toks = text.split()
        if len(toks) == len(wj):  # timings drop punctuation; restore it so captions break on it
            for x, tok in zip(wj, toks): x["w"] = tok
        words += [{"w": x["w"], "t": round(off + x["t"], 3)} for x in wj]
        parts.append(os.path.abspath(mp)); off += dur(mp)
        if j < len(sc["lines"]) - 1:
            parts.append(os.path.abspath(gap)); off += 0.4
    lst = f"{P}/public/audio/list.txt"
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    out = f"{P}/public/audio/s{i:02d}.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ar", "44100", "-ac", "1", out], check=True)
    L = dur(out)
    segs.append({"start": round(t * FPS), "dur": round((LEAD + L + TAIL) * FPS), "audioFrom": round((t + LEAD) * FPS),
                 "words": words, "panel": f"panels/p{i:02d}.jpg", "label": sc["label"]})
    t += LEAD + L + TAIL

# dark drone music bed, ducked by the template's low volume
n = int((t + 1) * 44100); tt = np.arange(n) / 44100
m = sum(k * np.sin(2 * np.pi * f * tt + p) for f, k, p in ((55, .5, 0), (55.3, .3, 1), (82.4, .22, 2), (110, .1, 3)))
m *= 0.55 + 0.45 * np.sin(2 * np.pi * tt / 9); m /= np.abs(m).max() / 0.9
with wave.open(f"{P}/public/audio/music.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100); w.writeframes((m * 32767).astype(np.int16).tobytes())
json.dump({"fps": FPS, "total": round((t + 0.8) * FPS), "bumper": 0, "title": a.title, "subtitle": a.subtitle, "segs": segs}, open(f"{P}/src/data.json", "w"))
print(f"ready: {len(segs)} scenes, {t:.1f}s")
