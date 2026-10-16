"""YouTube thumbnail (1280x720) + Shorts cover (1080x1920).  python3 make_thumbnail.py"""
import os
from PIL import ImageDraw
import make_video as mv


def badge(img, text, x, y, size, bg, fg, angle=0):
    from PIL import Image
    f = mv.font(mv.F_SANS, size)
    w = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textlength(text, font=f)
    spr = Image.new("RGBA", (int(w + size * 1.2), int(size * 1.7)), (0, 0, 0, 0))
    d = ImageDraw.Draw(spr)
    d.rounded_rectangle([0, 0, spr.width - 1, spr.height - 1], radius=size // 3, fill=bg)
    d.text((spr.width / 2, spr.height / 2), text, font=f, fill=fg, anchor="mm")
    mv.put(img, spr, x, y, "mm", angle=angle)


def render(W, H, portrait):
    L = mv.layout(W, H)
    L["tree"] = None
    sc = mv.SHORT[0] if portrait else mv.LONG[0]
    bg = mv.scene_setup(sc, L, 0)
    img, d = mv.landscape(L, 2.0, bg, "golden")
    d = ImageDraw.Draw(img, "RGBA")
    s = L["s"]
    if not portrait:
        mv.apple_tree(d, W * .8, H * .72, 1.55, 0)
        mv.portrait(img, d, W * .82, H * .42, 1.25, "woman", "CATHY", 5, 0)
        mv.put(img, mv.text_sprite("EAST OF EDEN", mv.F_PLAY, 104, mv.CREAM + (255,), "Black", 8, 6), 40, 70, "lt")
        mv.put(img, mv.text_sprite("87%", mv.F_PLAY, 150, mv.GOLD + (255,), "Black", 8), 50, 330, "lm")
        mv.put(img, mv.text_sprite("85%", mv.F_PLAY, 150, mv.CREAM + (255,), "Black", 8), 360, 330, "lm")
        mv.put(img, mv.text_sprite("CRITICS", mv.F_SANS, 34, mv.GOLD + (255,), None, 4), 140, 430, "mm")
        mv.put(img, mv.text_sprite("FANS", mv.F_SANS, 34, mv.CREAM + (255,), None, 4), 455, 430, "mm")
        mv.put(img, mv.text_sprite("WORTH THE HYPE?", mv.F_PLAY, 64, mv.CREAM + (255,), "Black", 6), 40, 540, "lm")
        badge(img, "NO SPOILERS", 170, 640, 34, mv.GOLD, mv.INK, -2)
        badge(img, "NETFLIX SERIES", 470, 640, 34, (200, 30, 36), mv.CREAM, 2)
        mv.put(img, mv.text_sprite("RG", mv.F_PLAY, 58, mv.GOLD + (255,), "Black", 5), W - 30, 22, "rt")
    else:
        mv.apple_tree(d, W * .5, H * .66, 2.2, 0)
        mv.put(img, mv.text_sprite("EAST OF", mv.F_PLAY, 170, mv.CREAM + (255,), "Black", 10), W / 2, 250, "mm")
        mv.put(img, mv.text_sprite("EDEN", mv.F_PLAY, 200, mv.GOLD + (255,), "Black", 10), W / 2, 440, "mm")
        mv.put(img, mv.text_sprite("87%", mv.F_PLAY, 190, mv.GOLD + (255,), "Black", 10), W * .28, 1450, "mm")
        mv.put(img, mv.text_sprite("85%", mv.F_PLAY, 190, mv.CREAM + (255,), "Black", 10), W * .72, 1450, "mm")
        mv.put(img, mv.text_sprite("CRITICS", mv.F_SANS, 46, mv.GOLD + (255,), None, 5), W * .28, 1580, "mm")
        mv.put(img, mv.text_sprite("FANS", mv.F_SANS, 46, mv.CREAM + (255,), None, 5), W * .72, 1580, "mm")
        badge(img, "NO SPOILERS", W / 2, 1720, 46, mv.GOLD, mv.INK, -2)
        mv.put(img, mv.text_sprite("RG", mv.F_PLAY, 80, mv.GOLD + (255,), "Black", 6), W - 40, 40, "rt")
    from PIL import Image
    img = Image.alpha_composite(img.convert("RGBA"), mv.overlays(W, H, 0)[0]).convert("RGB")
    return img


if __name__ == "__main__":
    os.makedirs(mv.OUT, exist_ok=True)
    render(1280, 720, False).save(os.path.join(mv.OUT, "thumbnail_youtube.jpg"), quality=92)
    render(1080, 1920, True).save(os.path.join(mv.OUT, "thumbnail_short.jpg"), quality=92)
    print("ok")
