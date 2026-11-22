# Replace the team logos in the barber image with original marks (flat repaint + pixel text).
from PIL import Image, ImageDraw, ImageFont
import numpy as np
src = Image.open("barber-original.jpg").convert("RGB")
a = np.array(src).astype(float)
FONT = "fonts/PressStart2P-Regular.ttf"

def median(box, pred):
    x0, y0, x1, y1 = box
    px = a[y0:y1, x0:x1].reshape(-1, 3)
    px = px[[pred(c) for c in px]]
    return tuple(int(v) for v in np.median(px, axis=0))

# jersey: blend the clean rows just above and below the wordmark
y0, y1, x0, x1 = 748, 828, 326, 482
for y in range(y0, y1):
    k = (y - y0) / (y1 - y0)
    a[y, x0:x1] = a[y0 - 1, x0:x1] * (1 - k) + a[y1, x0:x1] * k
img = Image.fromarray(a.clip(0, 255).astype("uint8"))
d = ImageDraw.Draw(img)
d.fontmode = "1"

cap_blue = median((345, 420, 410, 490), lambda c: c[2] > c[0] + 60 and c.sum() > 200)
d.rectangle((352, 424, 401, 484), fill=cap_blue)
pen_blue = median((25, 75, 150, 155), lambda c: c[2] > c[0] + 60)
d.polygon([(23, 74), (150, 117), (23, 153)], fill=pen_blue)
gold = median((185, 115, 300, 195), lambda c: c[0] > 180 and c[1] > 120 and c[2] < 90)
d.polygon([(185, 118), (303, 160), (185, 193)], fill=gold)

def pixel_text(text, color, center, scale, angle=0, outline=None):
    f = ImageFont.truetype(FONT, 8)
    l, t, r, b = f.getbbox(text)
    m = Image.new("RGBA", (r - l + 4, b - t + 4))
    md = ImageDraw.Draw(m); md.fontmode = "1"
    if outline:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                md.text((2 - l + dx, 2 - t + dy), text, font=f, fill=outline)
    md.text((2 - l, 2 - t), text, font=f, fill=color)
    m = m.resize((m.width * scale, m.height * scale), Image.NEAREST)
    if angle: m = m.rotate(angle, resample=Image.NEAREST, expand=True)
    img.paste(m, (center[0] - m.width // 2, center[1] - m.height // 2), m)

pixel_text("FRESH", (30, 72, 160), (404, 788), 3, angle=5, outline=(250, 250, 255))
pixel_text("FRESH", (245, 245, 250), (70, 115), 2, angle=-9)
pixel_text("CUTS", (80, 36, 120), (236, 156), 3, angle=-5)
img.save("barber-shop.png")
