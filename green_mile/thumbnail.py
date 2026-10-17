"""1280x720 YouTube thumbnail for the Green Mile explainer."""
import cairo

import gm
from gm import GM, C, hx, text, heal_glow

W, H = 1920, 1080
surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
ctx = cairo.Context(surf)
gm.bg_mile_corridor(ctx, 2.0)
heal_glow(ctx, 1380, 560, 420, 0.8, 1.0)
GM["coffey"].draw(ctx, 1380, 1500, 1.35, t=1.0, expr="sad", tears=True, look=-0.4)
GM["old_paul"].draw(ctx, 1010, 1260, 0.95, t=1.0, expr="sad", tears=True, look=1)
g = cairo.LinearGradient(0, 0, 1000, 0)
g.add_color_stop_rgba(0, 0, 0, 0, 0.8)
g.add_color_stop_rgba(1, 0, 0, 0, 0)
ctx.set_source(g)
ctx.paint()
text(ctx, "HE'S", 70, 190, 170, hx("#f4ead2"), outline=12, anchor="l")
text(ctx, "108?!", 60, 420, 300, hx("#ffe14a"), outline=16, anchor="l")
text(ctx, "THE CURSE", 70, 650, 120, hx("#9fd36a"), "Liberation Serif", outline=9, anchor="l")
C.rrect(ctx, 60, 900, 820, 110, 24)
C.fs(ctx, hx("#2f6b2a"), 6)
text(ctx, "GREEN MILE ENDING EXPLAINED", 470, 950, 44, (1, 1, 1), outline=4)
out = cairo.ImageSurface(cairo.FORMAT_ARGB32, 1280, 720)
c2 = cairo.Context(out)
c2.scale(1280 / W, 720 / H)
c2.set_source_surface(surf, 0, 0)
c2.get_source().set_filter(cairo.FILTER_BEST)
c2.paint()
out.write_to_png("green_mile_THUMBNAIL.png")
print("ok")
