from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
F = "Bangers.ttf"
TW, TH = 1280, 720

def up(im, w=None, h=None):
    if w: h = round(im.height * w / im.width)
    else: w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 120, 2))

def text(d, xy, s, size, fill, stroke=10, anchor="la"):
    d.text(xy, s, font=ImageFont.truetype(F, size), fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0), anchor=anchor)

def make(board_path, bg_box, chucky_box, lines, out, tint=(70, 0, 110)):
    b = Image.open(board_path).convert("RGB")
    # background: blurred, darkened panel art with purple tint
    bg = up(b.crop(bg_box), w=TW).crop((0, 0, TW, TH)).resize((TW, TH))
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(10))).enhance(0.45)
    bg = Image.blend(bg, Image.new("RGB", (TW, TH), tint), 0.35)
    t = bg.convert("RGBA")
    # Chucky big on the right, soft-edged
    ch = up(b.crop(chucky_box), h=TH + 40).convert("RGBA")
    m = Image.new("L", ch.size, 255); md = ImageDraw.Draw(m)
    for i in range(140): md.rectangle((i, 0, i, ch.height), fill=int(255 * i / 140))
    ch.putalpha(m)
    t.alpha_composite(ch, (TW - ch.width + 20, -10))
    # hosts photo, bottom-left, with yellow frame + banner
    hb = b.copy().convert("RGBA")
    bn = Image.open("banner.png"); bw = 400
    bn = bn.resize((bw, round(bn.height * bw / bn.width)), Image.LANCZOS)
    hb.alpha_composite(bn, (245 - bw // 2, 214 - bn.height // 2))
    hosts = up(hb.crop((132, 0, 470, 262)).convert("RGB"), w=520)
    fr = Image.new("RGB", (hosts.width + 16, hosts.height + 16), (255, 221, 0))
    fr.paste(hosts, (8, 8))
    fr = fr.rotate(-3, expand=True, resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0)) if False else fr
    t.alpha_composite(fr.convert("RGBA"), (28, TH - fr.height - 24))
    d = ImageDraw.Draw(t)
    y = 22
    for s, size, col in lines:
        text(d, (34, y), s, size, col, stroke=max(8, size // 14))
        y += int(size * 0.92)
    t.convert("RGB").save(out, quality=92)

make("chucky/board.png", (9, 271, 478, 545), (1000, 0, 1240, 262),
     [("EVERY CHUCKY", 128, (255, 221, 0)), ("MOVIE EXPLAINED", 96, (235, 30, 40))],
     "thumb_movie_breakdown.jpg")
make("chucky2/board.png", (496, 815, 942, 1083), (1000, 0, 1240, 262),
     [("CHUCKY'S", 110, (255, 221, 0)), ("SECRETS", 140, (235, 30, 40)), ("REVEALED!", 84, (255, 255, 255))],
     "thumb_plot_twists.jpg", tint=(150, 10, 20))
