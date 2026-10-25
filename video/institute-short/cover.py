from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
W, H = 1080, 1920; F = "Bangers.ttf"
b = Image.open("board.png").convert("RGB")
def up(im, w):
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 100, 2))
twist = b.crop((484, 425, 934, 1080 - 1080 + 1085)).crop((0, 0, 450, 660 - 0))  # panel 4 art area
twist = b.crop((486, 425, 932, 1085))
bg = twist.resize((round(twist.width * H / twist.height), H), Image.LANCZOS)
bg = bg.crop(((bg.width - W) // 2, 0, (bg.width - W) // 2 + W, H)).filter(ImageFilter.GaussianBlur(3))
bg = ImageEnhance.Brightness(bg).enhance(0.55).convert("RGBA")
head = up(b.crop((0, 0, 941, 380)), W)
bg.alpha_composite(head.convert("RGBA"), (0, 0))
art = up(b.crop((540, 832, 932, 1080)), 980)   # twist panel art (no caption)
fr = Image.new("RGB", (art.width + 18, art.height + 18), (235, 185, 70)); fr.paste(art, (9, 9))
bg.alpha_composite(fr.convert("RGBA"), ((W - fr.width) // 2, 560))
d = ImageDraw.Draw(bg)
for (y, s, size, col) in ((1250, "THE TWIST", 190, (255, 221, 0)), (1440, "NOBODY SAW", 150, (245, 232, 205)), (1600, "COMING!", 190, (235, 30, 40))):
    d.text((W / 2, y), s, font=ImageFont.truetype(F, size), fill=col, anchor="mm", stroke_width=14, stroke_fill=(0, 0, 0))
bg.convert("RGB").save("cover.jpg", quality=92)
