from PIL import Image, ImageDraw, ImageFont
F = "Bangers.ttf"
W, H = 2000, 440
im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rounded_rectangle((40, 45, W - 20, H - 15), 36, fill=(0, 0, 0, 200))
d.rounded_rectangle((20, 20, W - 40, H - 40), 36, fill=(255, 221, 0, 255), outline=(0, 0, 0, 255), width=20)
f1 = ImageFont.truetype(F, 215); f2 = ImageFont.truetype(F, 150)
t1, t2 = "DON'T SPOIL IT", "with R & A"
w1 = d.textlength(t1, font=f1); w2 = d.textlength(t2, font=f2)
d.text(((W - 20 - w1) / 2, 28), t1, font=f1, fill=(225, 20, 30), stroke_width=13, stroke_fill=(0, 0, 0))
x2 = (W - 20 - w2) / 2
d.text((x2, 238), t2, font=f2, fill=(255, 255, 255), stroke_width=11, stroke_fill=(0, 0, 0))
im = im.rotate(4, resample=Image.BICUBIC, expand=True)
im.save("banner.png")
