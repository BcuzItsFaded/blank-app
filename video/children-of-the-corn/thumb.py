from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
F = "Bangers.ttf"; TW, TH = 1280, 720
b = Image.open("board.png").convert("RGB")
def up(im, w=None, h=None):
    if w: h = round(im.height * w / im.width)
    else: w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 110, 2))
# backdrop = creature/scarecrow panel art (no label, no caption box)
art = b.crop((1272, 487, 1642, 616))
bg = up(art, h=TH)                      # scale to fill height
bg = bg.crop(((bg.width - TW) // 2, 0, (bg.width - TW) // 2 + TW, TH)) if bg.width >= TW else bg.resize((TW, TH))
bg = ImageEnhance.Contrast(ImageEnhance.Brightness(bg).enhance(0.92)).enhance(1.08)
bg = Image.blend(bg, Image.new("RGB", (TW, TH), (120, 20, 15)), 0.18).convert("RGBA")
# darken left third behind the title
sh = Image.new("RGBA", (TW, TH), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
for y in range(TH):
    for seg, a0 in (((0, int(TW * 0.5)), 175),):
        pass
    sd.line((0, y, int(TW * 0.52), y), fill=(0, 0, 0, 150))
sh = sh.filter(ImageFilter.GaussianBlur(40))
bg.alpha_composite(sh)
# hosts panel (12) with banner, bottom-left
hb = b.copy().convert("RGBA"); bn = Image.open("banner.png"); w = 300
bn = bn.resize((w, round(bn.height * w / bn.width)), Image.LANCZOS)
hosts = up(hb.crop((1290, 722, 1625, 860)).convert("RGB"), w=520)
fr = Image.new("RGB", (hosts.width + 16, hosts.height + 16), (235, 185, 70)); fr.paste(hosts, (8, 8))
bg.alpha_composite(fr.convert("RGBA"), (30, TH - fr.height - 28))
_tb = Image.new("RGBA", (TW, TH), (0, 0, 0, 0)); _td = ImageDraw.Draw(_tb)
for _y in range(90):
    _td.line((0, _y, TW, _y), fill=(0, 0, 0, int(210 * (1 - _y / 90))))
bg.alpha_composite(_tb)
d = ImageDraw.Draw(bg)
def t(xy, s, size, col, sw=None):
    d.text(xy, s, font=ImageFont.truetype(F, size), fill=col, stroke_width=sw or max(8, size // 13), stroke_fill=(0, 0, 0))
t((34, 22), "CHILDREN OF", 94, (245, 232, 205))
t((34, 108), "THE CORN", 130, (235, 30, 40))
t((34, 238), "PLOT TWISTS WITH R & A", 70, (255, 221, 0))
d.text((40, 318), "Stephen King's Original Story", font=ImageFont.truetype(F, 50), fill=(245, 232, 205), stroke_width=5, stroke_fill=(0, 0, 0))
bg.convert("RGB").save("thumb_corn.jpg", quality=92)
