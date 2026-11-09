#!/usr/bin/env python3
"""Extract the dominant colours of a reference image (or a cropped region) so brick colours are measured, not guessed.
Usage: palette.py <image> [--k 6] [--crop x0,y0,x1,y1]   (crop as fractions 0-1, e.g. 0.1,0.2,0.5,0.9)
Prints hex + share, and a ready-to-paste JS array. Near-white/near-black background can be skipped with --skip-bg."""
import argparse, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('image'); ap.add_argument('--k', type=int, default=6); ap.add_argument('--crop'); ap.add_argument('--skip-bg', action='store_true')
a = ap.parse_args()
im = Image.open(a.image).convert('RGB')
if a.crop:
    x0, y0, x1, y1 = [float(v) for v in a.crop.split(',')]; w, h = im.size
    im = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
im.thumbnail((240, 240))
q = im.quantize(colors=a.k + (2 if a.skip_bg else 0), method=Image.Quantize.MEDIANCUT)
pal = q.getpalette(); counts = sorted(q.getcolors(), reverse=True); tot = sum(c for c, _ in counts)
out = []
for c, i in counts:
    r, g, b = pal[i * 3:i * 3 + 3]
    if a.skip_bg and (min(r, g, b) > 240 or max(r, g, b) < 14): continue
    out.append((c / tot, '#%02x%02x%02x' % (r, g, b)))
for share, hx in out[:a.k]: print(f'{hx}  {share * 100:4.1f}%')
print('// JS: [' + ', '.join('0x' + hx[1:] for _, hx in out[:a.k]) + ']')
