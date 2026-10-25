from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
F = "Bangers.ttf"; TW, TH = 1280, 720
b = Image.open("board.png").convert("RGB")
def up(im, w=None, h=None):
    if w: h = round(im.height * w / im.width)
    else: w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 120, 2))
bg = up(b.crop((772, 687, 1154, 1024)), w=TW)
bg = bg.crop((0, (bg.height - TH) // 2, TW, (bg.height - TH) // 2 + TH))
bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(9))).enhance(0.4)
bg = Image.blend(bg, Image.new("RGB", (TW, TH), (90, 50, 10)), 0.3).convert("RGBA")
# the monster, big on the right with a soft left edge
mon = up(b.crop((440, 470, 768, 683)), h=TH + 40).convert("RGBA")
m = Image.new("L", mon.size, 255); md = ImageDraw.Draw(m)
for i in range(160): md.line((i, 0, i, mon.height), fill=int(255 * i / 160))
mon.putalpha(m)
bg.alpha_composite(mon, (TW - mon.width + 30, -20))
# hosts reaction panel with the banner
hb = b.copy().convert("RGBA"); bn = Image.open("banner.png"); w = 280
bn = bn.resize((w, round(bn.height * w / bn.width)), Image.LANCZOS)
hb.alpha_composite(bn, (1335 - w // 2, 978 - bn.height // 2))
hosts = up(hb.crop((1172, 752, 1536, 1024)).convert("RGB"), w=500)
fr = Image.new("RGB", (hosts.width + 16, hosts.height + 16), (232, 170, 70)); fr.paste(hosts, (8, 8))
bg.alpha_composite(fr.convert("RGBA"), (28, TH - fr.height - 24))
d = ImageDraw.Draw(bg)
def t(xy, s, size, col, sw=None):
    d.text(xy, s, font=ImageFont.truetype(F, size), fill=col, stroke_width=sw or max(8, size // 14), stroke_fill=(0, 0, 0))
t((34, 18), "CLAYFACE", 150, (245, 232, 205))
t((34, 158), "ENDING EXPLAINED", 84, (235, 30, 40))
bg.convert("RGB").save("thumb_clayface_full.jpg", quality=92)
