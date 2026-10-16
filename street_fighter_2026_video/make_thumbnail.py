"""YouTube thumbnail (1280x720) + Shorts cover (1080x1920) in the video's style.  python3 make_thumbnail.py"""
import math, os
import numpy as np
from PIL import Image, ImageDraw
import make_video as mv

OUT = mv.OUT


def split_bg(W, H, portrait):
    yy, xx = np.mgrid[0:H, 0:W]
    # diagonal split: red (critics) vs green (fans)
    side = (xx - W / 2) + (yy - H / 2) * (-.35 if not portrait else 0) > 0 if not portrait else (yy > H * .5)
    arr = np.zeros((H, W, 3), np.float32)
    for c in range(3):
        arr[..., c] = np.where(side, mv.GREEN[c] * .45, mv.RED[c] * .5)
    # vignette + glow centers
    for cx, cy, col in (((.25, .55), None, mv.RED), ((.75, .55), None, mv.GREEN)) if not portrait else (((.5, .28), None, mv.RED), ((.5, .72), None, mv.GREEN)):
        gx, gy = cx
        d = np.sqrt((xx - gx * W) ** 2 + (yy - gy * H) ** 2) / max(W, H)
        g = np.clip(1 - d * 2.2, 0, 1) ** 2 * .7
        for c in range(3):
            arr[..., c] += g * col[c]
    v = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
    arr *= np.clip(1.25 - v * 1.1, .35, 1)[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def big_text(img, text, x, y, size, fill, anchor="mm", stroke=None, angle=0):
    f = mv.font(mv.F_BLACK, size)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l, t, r, b = tmp.textbbox((0, 0), text, font=f, stroke_width=stroke or size // 12)
    pad = size // 4
    spr = Image.new("RGBA", (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(spr)
    sw = stroke or size // 12
    d.text((pad - l + size // 18, pad - t + size // 18), text, font=f, fill=(0, 0, 0, 200), stroke_width=sw, stroke_fill=(0, 0, 0, 200))
    d.text((pad - l, pad - t), text, font=f, fill=fill, stroke_width=sw, stroke_fill=(10, 10, 14))
    mv.put(img, spr, x, y, anchor, angle=angle)


def badge(img, text, x, y, size, bg, fg, angle=0, anchor="mm"):
    f = mv.font(mv.F_BLACK, size)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = tmp.textlength(text, font=f)
    spr = Image.new("RGBA", (int(w + size * 1.1), int(size * 1.6)), (0, 0, 0, 0))
    d = ImageDraw.Draw(spr)
    d.rounded_rectangle([0, 0, spr.width - 1, spr.height - 1], radius=size // 3, fill=bg, outline=(255, 255, 255), width=max(3, size // 10))
    d.text((spr.width / 2, spr.height / 2), text, font=f, fill=fg, anchor="mm")
    mv.put(img, spr, x, y, anchor, angle=angle)


def clash(img, d, x, y, s):
    mv.put(img, mv.glow((255, 255, 255), 520 * s), x, y, "mm")
    mv.put(img, mv.glow(mv.GOLD, 380 * s), x, y, "mm")
    for i in range(16):
        a = i * math.pi / 8 + .2
        r0, r1 = 40 * s, (150 if i % 2 else 210) * s
        d.line([(x + math.cos(a) * r0, y + math.sin(a) * r0), (x + math.cos(a) * r1, y + math.sin(a) * r1)], fill=(255, 235, 150, 230), width=int(8 * s))


def thumbnail():
    W, H = 1280, 720
    img = split_bg(W, H, False)
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(-10, 30):  # speed lines
        x = i * 70
        d.line([(x, H), (x + 300, 0)], fill=(255, 255, 255, 14), width=3)
    sc = 1.55
    cx, gy = W / 2, 470
    clash(img, d, cx, gy - 120 * sc, 1.3)
    mv.fighter(d, cx - 150 * sc, gy, sc, mv.POSES["punch"], 1, mv.RED, 0, bob=False)
    mv.fighter(d, cx + 150 * sc, gy, sc, mv.POSES["punch"], -1, mv.GREEN, 0, bob=False)
    big_text(img, "45%", 200, 345, 150, mv.RED + (255,), angle=4)
    big_text(img, "84%", W - 200, 345, 150, mv.GREEN + (255,), angle=-4)
    big_text(img, "CRITICS", 200, 460, 58, (255, 255, 255, 255))
    big_text(img, "FANS", W - 200, 460, 58, (255, 255, 255, 255))
    big_text(img, "STREET FIGHTER", W / 2, 80, 100, mv.GOLD + (255,))
    big_text(img, "WHO'S RIGHT?", W / 2, 175, 56, (255, 255, 255, 255))
    badge(img, "NO SPOILERS", 200, 640, 40, mv.GOLD, mv.INK, angle=-3)
    badge(img, "+ CREDITS SCENE", W - 230, 640, 40, (255, 255, 255), mv.INK, angle=3)
    big_text(img, "RG", W / 2, 655, 64, (255, 255, 255, 255))
    p = os.path.join(OUT, "thumbnail_youtube.png")
    img.save(p, optimize=True)
    img.convert("RGB").save(p.replace(".png", ".jpg"), quality=92)
    return p


def short_cover():
    W, H = 1080, 1920
    img = split_bg(W, H, True)
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(-20, 30):
        x = i * 90
        d.line([(x, H), (x + 700, 0)], fill=(255, 255, 255, 12), width=3)
    sc = 2.0
    cx, gy = W / 2, 1180
    clash(img, d, cx, gy - 120 * sc, 1.6)
    mv.fighter(d, cx - 130 * sc, gy, sc, mv.POSES["punch"], 1, mv.RED, 0, bob=False)
    mv.fighter(d, cx + 130 * sc, gy, sc, mv.POSES["punch"], -1, mv.GREEN, 0, bob=False)
    big_text(img, "STREET FIGHTER", W / 2, 120, 104, mv.GOLD + (255,))
    big_text(img, "CRITICS", W / 2, 290, 130, (255, 255, 255, 255))
    big_text(img, "45%", W / 2, 480, 210, mv.RED + (255,), angle=3)
    big_text(img, "84%", W / 2, 1520, 230, mv.GREEN + (255,), angle=-3)
    big_text(img, "FANS", W / 2, 1730, 150, (255, 255, 255, 255))
    badge(img, "NO SPOILERS", 230, 680, 46, mv.GOLD, mv.INK, angle=-4)
    big_text(img, "RG", W - 120, 680, 80, (255, 255, 255, 255))
    p = os.path.join(OUT, "thumbnail_short.png")
    img.save(p, optimize=True)
    img.convert("RGB").save(p.replace(".png", ".jpg"), quality=92)
    return p


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print(thumbnail()); print(short_cover())
