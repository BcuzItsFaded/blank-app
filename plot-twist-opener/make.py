import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops, ImageEnhance
art_p, out, title, sub = sys.argv[1:5]
W, H, Y0 = 1080, 1920, 400
B = '/usr/share/fonts/opentype/inter/Inter-Black.otf'
art = Image.open(art_p).convert('RGB')
bg = art.resize((H, H), Image.LANCZOS).crop(((H - W) // 2, 0, (H - W) // 2 + W, H)).filter(ImageFilter.GaussianBlur(35))
bg = ImageEnhance.Brightness(bg).enhance(0.35)
sq = art.resize((W, W), Image.LANCZOS)
bg.paste(sq, (0, Y0))
d = ImageDraw.Draw(bg)
d.rectangle([0, Y0 - 5, W, Y0], fill=(210, 30, 30))
d.rectangle([0, Y0 + W, W, Y0 + W + 5], fill=(210, 30, 30))
size = 92
while True:
    F = ImageFont.truetype(B, size)
    if d.textlength(title, font=F) <= W - 90 or size < 50:
        break
    size -= 4
FS = ImageFont.truetype(B, 38)
glow = Image.new('RGB', bg.size, 0)
gd = ImageDraw.Draw(glow)
tw = gd.textlength(title, font=F)
gd.text(((W - tw) / 2, 175), title, font=F, fill=(200, 20, 20))
bg = ImageChops.add(bg, glow.filter(ImageFilter.GaussianBlur(16)))
d = ImageDraw.Draw(bg)
d.text(((W - tw) / 2, 175), title, font=F, fill=(245, 240, 232), stroke_width=6, stroke_fill=(0, 0, 0))
sw = d.textlength(sub, font=FS)
d.text(((W - sw) / 2, 175 + size + 22), sub, font=FS, fill=(235, 45, 45), stroke_width=4, stroke_fill=(0, 0, 0))
bg.save(out)
