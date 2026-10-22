#!/usr/bin/env python3
"""Contact sheet of every panel crop, to verify crop boxes before rendering.

    python3 crop_check.py <episodeDir> <out.png>

Reads assets/storyboard.* and the `rect: [x, y, w, h]` boxes from assets/project.js (normalized 0..1).
Each tile is numbered; it must show only artwork (no number/title bar, no caption text, no border).
"""
import glob, json, os, re, sys
from PIL import Image, ImageDraw

ep, out = sys.argv[1], sys.argv[2]
board = sorted(glob.glob(os.path.join(ep, "assets", "storyboard.*")))
if not board:
    sys.exit("no assets/storyboard.* in " + ep)
src = open(os.path.join(ep, "assets", "project.js")).read()
rects = [json.loads(m) for m in re.findall(r'"?rect"?\s*:\s*(\[[^\]]+\])', src)]
im = Image.open(board[0]).convert("RGB")
W, H = im.size
tw, th, cols = 320, 200, 5
sheet = Image.new("RGB", (tw * cols, th * ((len(rects) + cols - 1) // cols)), (60, 60, 60))
for i, (x, y, w, h) in enumerate(rects):
    tile = im.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)))
    tile.thumbnail((tw, th))
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 28, 18], fill="red")
    d.text((5, 3), str(i + 1), fill="white")
    sheet.paste(tile, ((i % cols) * tw, (i // cols) * th))
sheet.save(out)
print(f"{len(rects)} crops from {os.path.basename(board[0])} ({W}x{H}) -> {out}")
