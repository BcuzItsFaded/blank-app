#!/usr/bin/env python3
"""Motion QA: per-second frame-to-frame change for a video (ffmpeg) or a frames directory (f_%05d.jpg).
Flags seconds that are (nearly) static so you can add camera/character/particle motion before delivering.
Usage: motion_report.py <video.mp4 | frames_dir> [--fps 30] [--min 1.2]   (min = mean abs change per pixel, 0-255 scale ×0.1)"""
import argparse, os, subprocess, sys, glob
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('--fps', type=int, default=30); ap.add_argument('--min', type=float, default=1.2)
a = ap.parse_args(); W, H = 90, 160
if os.path.isdir(a.src):
    from PIL import Image
    files = sorted(glob.glob(os.path.join(a.src, 'f_*.jpg')))
    frames = [np.asarray(Image.open(f).convert('L').resize((W, H)), dtype=np.float32) for f in files]
else:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', a.src, '-vf', f'fps={a.fps},scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    n = len(raw) // (W * H); frames = list(np.frombuffer(raw[:n * W * H], dtype=np.uint8).reshape(n, H, W).astype(np.float32))
diffs = [float(np.abs(frames[i + 1] - frames[i]).mean()) for i in range(len(frames) - 1)]
secs = len(diffs) // a.fps; bad = []
print('sec  motion  bar'); mx = max(diffs) if diffs else 1
for s in range(secs):
    d = diffs[s * a.fps:(s + 1) * a.fps]; m = float(np.mean(d)); flag = '  <-- STATIC' if m < a.min else ''
    cuts = sum(1 for x in d if x > 18)
    print(f'{s:3d}  {m:6.2f}  ' + '#' * int(min(40, m * 4)) + (f'  ({cuts} cut)' if cuts else '') + flag)
    if m < a.min: bad.append(s)
print(f'\nmean motion {np.mean(diffs):.2f}; static seconds: {bad if bad else "none"}')
sys.exit(1 if bad else 0)
