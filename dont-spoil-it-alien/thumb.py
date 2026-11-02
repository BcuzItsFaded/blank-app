from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops
import numpy as np
W, H = 1280, 720
B = '/usr/share/fonts/opentype/inter/Inter-Black.otf'

def base(path, box, sat=1.25, bright=1.12):
    im = Image.open(path).convert('RGB').crop(box).resize((W, H), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Contrast(im).enhance(1.15)
    im = ImageEnhance.Brightness(im).enhance(bright)
    return im.filter(ImageFilter.UnsharpMask(2, 80, 2))

def shade_left(im, frac=0.55, amt=0.85):
    a = np.asarray(im, np.float32)
    x = np.linspace(0, 1, W)[None, :, None]
    m = np.clip((frac - x) / frac, 0, 1) ** 1.3 * amt
    return Image.fromarray((a * (1 - m)).astype(np.uint8))

def text(im, xy, s, size, fill, stroke=10, glowcol=None, anchor='la'):
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(B, size)
    if glowcol:
        g = Image.new('RGB', im.size, 0)
        ImageDraw.Draw(g).text(xy, s, font=f, fill=glowcol, anchor=anchor, stroke_width=stroke + 8, stroke_fill=glowcol)
        im = ImageChops.add(im, g.filter(ImageFilter.GaussianBlur(18)))
        d = ImageDraw.Draw(im)
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(0, 0, 0))
    return im

def badge(im, xy, s, size, bg=(220, 30, 30), fg=(255, 255, 255)):
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(B, size)
    x0, y0, x1, y1 = d.textbbox(xy, s, font=f)
    d.rounded_rectangle([x0 - 18, y0 - 12, x1 + 18, y1 + 14], 10, fill=bg, outline=(0, 0, 0), width=4)
    d.text(xy, s, font=f, fill=fg)
    return im

# Option A: Xenomorph over Brett
im = base('s06.jpg', (300, 8, 1900, 908))
im = shade_left(im, 0.6, 0.8)
im = text(im, (52, 70), 'ALIEN', 190, (255, 255, 255), 12, glowcol=(40, 220, 90))
im = text(im, (60, 270), '(1979)', 72, (120, 255, 150), 8)
im = text(im, (52, 380), 'FULL STORY', 96, (255, 235, 70), 10)
im = text(im, (52, 485), 'EXPLAINED', 96, (255, 235, 70), 10)
im = badge(im, (66, 625), "DON'T SPOIL IT RG", 40)
im.save('thumbnail_A.jpg', quality=92)

# Option B: Special Order 937 + Ripley
im = base('s08.jpg', (240, 8, 1840, 908))
im = shade_left(im, 0.62, 0.8)
im = text(im, (40, 440), 'THE COMPANY', 84, (255, 255, 255), 10)
im = text(im, (40, 540), 'KNEW.', 130, (255, 60, 50), 12, glowcol=(200, 20, 20))
im = badge(im, (52, 40), "ALIEN (1979) EXPLAINED", 44, bg=(20, 20, 20), fg=(120, 255, 150))
im.save('thumbnail_B.jpg', quality=92)

# Option C: facehugger close-up
im = base('s03.jpg', (200, 8, 1800, 908))
im = shade_left(im, 0.45, 0.85)
im = text(im, (40, 60), 'IT', 230, (255, 255, 255), 14, glowcol=(255, 170, 40))
im = text(im, (40, 300), 'GOT', 140, (255, 255, 255), 12)
im = text(im, (40, 450), 'INSIDE', 140, (255, 200, 60), 12, glowcol=(200, 90, 0))
im = badge(im, (52, 640), 'ALIEN (1979) · EXPLAINED', 36)
im.save('thumbnail_C.jpg', quality=92)

sh = Image.new('RGB', (1280 * 3 // 2, 720 // 2))
for i, n in enumerate('ABC'):
    sh.paste(Image.open(f'thumbnail_{n}.jpg').resize((640, 360)), (i * 640, 0))
sh.save('thumbs.png')
