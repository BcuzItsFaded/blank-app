from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
F = "Bangers.ttf"; W, H = 1080, 1920
b = Image.open("board.png").convert("RGB")
def up(im, w=None, h=None):
    if w: h = round(im.height * w / im.width)
    else: w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 110, 2))
# backdrop: amusement mile clown strip (panel 5 left) zoomed
am = b.crop((14, 1467, 760, 1803))
bg = up(am, h=H)
bg = bg.crop((max(0, (bg.width - W) // 2), 0, max(0, (bg.width - W) // 2) + W, H))
bg = ImageEnhance.Brightness(bg).enhance(0.72).convert("RGBA")
sh = Image.new("RGBA", (W, H)); sd = ImageDraw.Draw(sh)
for y in range(H):
    a = 205 if y < 430 else (int(205 * (720 - y) / 290) if y < 720 else (0 if y < 1120 else int(225 * (y - 1120) / 800)))
    sd.line((0, y, W, y), fill=(0, 0, 0, max(0, a)))
bg.alpha_composite(sh)
d = ImageDraw.Draw(bg)
def t(xy, s, size, col, sw=None, anchor="mm"):
    d.text(xy, s, font=ImageFont.truetype(F, size), fill=col, anchor=anchor, stroke_width=sw or max(8, size // 13), stroke_fill=(0, 0, 0))
t((W / 2, 150), "CLAYFACE", 180, (245, 232, 205), 14)
t((W / 2, 300), "5 BATMAN", 150, (255, 221, 0))
t((W / 2, 420), "EASTER EGGS", 128, (235, 30, 40))
# couple reaction panel (panel 6) with banner
hb = b.copy().convert("RGBA"); bn = Image.open("banner.png"); w = 560
bn = bn.resize((w, round(bn.height * w / bn.width)), Image.LANCZOS)
hp = up(hb.crop((345, 1838, 918, 2150)).convert("RGB"), w=720)
fr = Image.new("RGB", (hp.width + 18, hp.height + 18), (235, 185, 70)); fr.paste(hp, (9, 9))
bg.alpha_composite(fr.convert("RGBA"), ((W - fr.width) // 2, H - fr.height - 300))
bg.alpha_composite(bn, ((W - bn.width) // 2, H - 300 - 30))
bg.convert("RGB").save("cover.jpg", quality=92)
