"""1280x720 thumbnail for DON'T SPOIL IT RG, Episode 3: Alien 3."""
import cairo

import a3
from a3 import A3, C, hx, text, xeno, brand

W, H = 1920, 1080
surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
ctx = cairo.Context(surf)
a3.bg_foundry(ctx, 2.0, heat=1.3)
a3.furnace(ctx, 1500, 1080, 1.4, 2.0)
xeno(ctx, 1950, 1180, 1.25, 2.0, facing=-1, jaw=1.0, rear=0.5)
A3["ripley_bald"].draw(ctx, 1200, 1500, 1.5, t=1.0, expr="cold", look=0.5)
g = cairo.LinearGradient(0, 0, 1050, 0)
g.add_color_stop_rgba(0, 0, 0, 0, 0.85)
g.add_color_stop_rgba(1, 0, 0, 0, 0)
ctx.set_source(g)
ctx.paint()
text(ctx, "HER LAST", 70, 200, 170, hx("#f4ead2"), outline=12, anchor="l")
text(ctx, "SACRIFICE", 60, 410, 190, hx("#ff8a2a"), outline=13, anchor="l")
text(ctx, "ALIEN 3 (1992) EXPLAINED", 75, 600, 64, hx("#f4ead2"), outline=5, anchor="l")
brand(ctx, 430, 920, 92)
out = cairo.ImageSurface(cairo.FORMAT_ARGB32, 1280, 720)
c2 = cairo.Context(out)
c2.scale(1280 / W, 720 / H)
c2.set_source_surface(surf, 0, 0)
c2.get_source().set_filter(cairo.FILTER_BEST)
c2.paint()
out.write_to_png("alien3_THUMBNAIL.png")
print("ok")
