from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
W, H = 1080, 1920
b = Image.open("board.png").convert("RGB")
end = b.crop((26, 1806, 1145 - 578, 2281))  # ending reveal panel
s = H / end.height
bg = end.resize((round(end.width * s), H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 100, 2))
cx = int(bg.width * 0.42)
bg = bg.crop((cx - W // 2, 0, cx + W // 2, H))
bg = ImageEnhance.Brightness(bg).enhance(0.8).convert("RGBA")
shade = Image.new("RGBA", (W, H)); sd = ImageDraw.Draw(shade)
for y in range(H):
    a = 210 if y < 400 else (int(210 * (680 - y) / 280) if y < 680 else (0 if y < 1150 else int(220 * (y - 1150) / 770)))
    sd.line((0, y, W, y), fill=(0, 0, 0, a))
bg.alpha_composite(shade)
d = ImageDraw.Draw(bg)
F = "Bangers.ttf"
def t(xy, s, size, col, sw=12):
    d.text(xy, s, font=ImageFont.truetype(F, size), fill=col, anchor="mm", stroke_width=sw, stroke_fill=(0, 0, 0))
t((W / 2, 150), "CLAYFACE", 210, (245, 232, 205), 14)
t((W / 2, 320), "ENDING EXPLAINED", 120, (232, 170, 70))
t((W / 2, 450), "HE'S STILL ALIVE?!", 110, (235, 30, 40))
hosts = b.crop((604, 1806, 1145, 2281))
hosts = hosts.resize((640, round(640 * hosts.height / hosts.width)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 100, 2))
fr = Image.new("RGB", (hosts.width + 20, hosts.height + 20), (232, 170, 70)); fr.paste(hosts, (10, 10))
bg.alpha_composite(fr.convert("RGBA"), ((W - fr.width) // 2, H - fr.height - 300))
bn = Image.open("banner.png"); bn = bn.resize((600, round(bn.height * 600 / bn.width)), Image.LANCZOS)
bg.alpha_composite(bn, ((W - bn.width) // 2, H - 300 - 40))
bg.convert("RGB").save("clayface_short_cover.jpg", quality=92)
