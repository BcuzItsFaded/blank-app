import json, math, subprocess, sys, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, '/tmp/claude-0/cl')
from scenes import *

D = '/tmp/claude-0/cl/'
FPS = 30
OUT = sys.argv[1] if len(sys.argv) > 1 else D + 'out.mp4'
PREVIEW = '--preview' in sys.argv
TL = json.load(open(D + 'timeline.json'))
specs = [fn() for fn in SCENES]
rng = np.random.default_rng(1)

# precomputed overlays
fsmall = Image.fromarray((rng.random((H // 16, W * 2 // 16)) * 255).astype('uint8')).resize((W * 2, H), Image.BICUBIC)
fogmap = np.asarray(fsmall.filter(ImageFilter.GaussianBlur(40)), np.float32) / 255
fogmap = np.clip((fogmap - 0.3) * 1.8, 0, 1) * np.linspace(0.5, 1.0, H, dtype=np.float32)[:, None]
grains = [rng.normal(0, 8, (H, W, 1)).astype(np.float32) for _ in range(6)]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
vign = (1 - 0.6 * r ** 2.2)[..., None].astype(np.float32)
rains = []
for k in range(4):
    L = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(L)
    rr = random.Random(k)
    for _ in range(420):
        x, y = rr.uniform(-100, W), rr.uniform(-100, H)
        ln = rr.uniform(40, 110)
        dr.line([(x, y), (x + ln * 0.18, y + ln)], fill=int(rr.uniform(60, 140)), width=2)
    rains.append((np.asarray(L, np.float32) / 255)[..., None])
bub = [(random.Random(i).uniform(0, W), random.Random(i + 99).uniform(0, H), random.Random(i + 7).uniform(6, 20),
        random.Random(i + 3).uniform(80, 220)) for i in range(30)]

FCAP = font(F_BLACK, 86)
FSTAMP = font(F_BLACK, 118)
RED_WORDS = {'JASON', 'MOTHER', 'MOMMY', 'KILLER', 'MONSTER', 'BLAME', 'PAMELA', 'KILL', 'WATER', 'DISAPPEAR', 'NEVER'}


def ease(t):
    return t * t * (3 - 2 * t)


def smooth(a, b, t):
    return ease(min(1, max(0, (t - a) / (b - a))))


def draw_words(d, lines_words, cy, f, line_h):
    tot = len(lines_words) * line_h
    for li, ws in enumerate(lines_words):
        gap = f.size * 0.3
        widths = [d.textlength(w.upper(), font=f) + gap for w in ws]
        x = W / 2 - (sum(widths) - gap) / 2
        y = cy - tot / 2 + li * line_h
        for w, wd in zip(ws, widths):
            key = ''.join(ch for ch in w.upper() if ch.isalpha())
            col = (235, 35, 35) if key in RED_WORDS else (255, 255, 255)
            d.text((x, y), w.upper(), font=f, fill=col, stroke_width=10, stroke_fill=(0, 0, 0))
            x += wd


def wrap(words, f, d, maxw=W - 160):
    lines, cur = [], []
    for w in words:
        if cur and d.textlength(' '.join(cur + [w]).upper(), font=f) > maxw:
            lines.append(cur); cur = []
        cur.append(w)
    lines.append(cur)
    return lines


def frame(T):
    i = max(j for j, s in enumerate(TL['scenes']) if s['start'] <= T + 1e-6)
    s, sp = TL['scenes'][i], specs[i]
    ls = T - s['start']
    t = min(1, ls / s['dur'])
    z0, z1, c0, c1 = sp['cam']
    e = ease(t)
    z = z0 + (z1 - z0) * e
    cx = (c0[0] + (c1[0] - c0[0]) * e) * BW
    cy = (c0[1] + (c1[1] - c0[1]) * e) * BH
    if sp.get('shake'):
        cx += math.sin(T * 37) * 6 * t
        cy += math.cos(T * 29) * 6 * t
    cw, ch = BW / z, BH / z
    cx = min(max(cx, cw / 2), BW - cw / 2)
    cy = min(max(cy, ch / 2), BH - ch / 2)
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    bases = sp['bases']
    mode = sp.get('mode')
    if mode == 'fade':
        a = smooth(*sp['fade'], t)
        im = Image.blend(bases[0].resize((W, H), Image.BILINEAR, box=box), bases[1].resize((W, H), Image.BILINEAR, box=box), a)
    elif mode == 'step':
        steps = sp.get('steps') or [k / len(bases) for k in range(len(bases))]
        idx = max(k for k, st in enumerate(steps) if st <= t)
        im = bases[idx].resize((W, H), Image.BILINEAR, box=box)
    else:
        im = bases[0].resize((W, H), Image.BILINEAR, box=box)
    if sp.get('bubbles'):
        dr = ImageDraw.Draw(im)
        for bx, by, br, spd in bub:
            y = (by - spd * T) % (H + 60) - 30
            x = bx + 12 * math.sin(T * 2 + by)
            dr.ellipse([x - br, y - br, x + br, y + br], outline=(200, 240, 240), width=3)
    f = np.asarray(im, np.float32)
    if sp.get('ripple'):
        amp = sp['ripple']
        dx = (amp * np.sin(np.arange(H) / 38 + T * 3.2)).astype(np.int32)
        cols = np.clip(np.arange(W)[None, :] + dx[:, None], 0, W - 1)
        f = f[np.arange(H)[:, None], cols]
    if sp.get('redpulse'):
        f[..., 0] *= 1 + 0.12 * (0.5 + 0.5 * math.sin(T * 2 * math.pi * 1.1))
    if sp.get('fog'):
        off = int((T * 40) % W)
        a = fogmap[:, off:off + W, None] * sp['fog'] * 0.75
        f = f * (1 - a) + np.array(sp['fogc'], np.float32) * a
    if sp.get('rain'):
        f += rains[int(T * FPS) % 4] * 110
    for lt in sp.get('lightning', []):
        dt = ls - lt * s['dur']
        if dt >= 0:
            fl = math.exp(-dt / 0.12)
            f = f + fl * np.array([170, 180, 220], np.float32) * (0.6 + 0.4 * (int(dt * 30) % 2 == 0))
    f = f * vign
    f += grains[int(T * FPS) % 6]
    f *= 1 + rng.normal(0, 0.012)
    if i > 0 and ls < 0.12:
        f *= ls / 0.12
    im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    if i == 0 and ls > 0.2:
        draw_words(d, [['THE', 'KILLER', 'WAS'], ['NEVER', 'JASON']], 420, FSTAMP, 140)
    if i == 11 and t > 0.5:
        draw_words(d, [['IT', 'WAS'], ['HIS', 'MOTHER']], 380, FSTAMP, 140)
    for c in TL['caps']:
        if c['t0'] <= T < c['t1']:
            draw_words(d, wrap(c['words'], FCAP, d), 1330, FCAP, 104)
    last = TL['scenes'][-1]
    if i == 13 and T > last['vo_start'] + last['vo_dur'] + 0.2:
        draw_words(d, [['COMMENT', 'BELOW']], 1330, FCAP, 104)
        d.polygon([(W / 2 - 50, 1420), (W / 2 + 50, 1420), (W / 2, 1490)], fill=(235, 35, 35), outline=(0, 0, 0), width=6)
    return im


if PREVIEW:
    times = [s['start'] + s['dur'] * 0.6 for s in TL['scenes']]
    tw, th = 270, 480
    sheet = Image.new('RGB', (7 * tw, 2 * th))
    for k, T in enumerate(times):
        sheet.paste(frame(T).resize((tw, th)), ((k % 7) * tw, (k // 7) * th))
    sheet.save(D + 'preview.png')
    sys.exit()

nfr = int(TL['total'] * FPS)
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                      '-i', '-', '-i', D + 'mix.wav', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
                      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
for n in range(nfr):
    p.stdin.write(frame(n / FPS).tobytes())
    if n % 300 == 0:
        print(n, '/', nfr, flush=True)
p.stdin.close()
p.wait()
print('done', OUT)
