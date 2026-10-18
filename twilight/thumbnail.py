"""1280x720 YouTube thumbnail for the Twilight explainer."""
import cairo

import tw
from tw import TW, C, hx, text, wolf, sparkle, WOLF_COLORS, moon_icon

W, H = 1920, 1080
surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
ctx = cairo.Context(surf)
tw.bg_forest(ctx, 2.0, rain_a=0.15)
ctx.set_source_rgba(0.25, 0.0, 0.08, 0.35)
ctx.paint()
wolf(ctx, 2130, 1130, 0.95, 1.0, WOLF_COLORS["jacob"], facing=-1)
TW["edward"].draw(ctx, 1150, 1400, 1.4, t=1.0, expr="cold", look=0.6)
sparkle(ctx, 1150, 380, 1100, 260, 1.3, 1.0)
TW["bella"].draw(ctx, 1480, 1420, 1.3, t=1.0, facing=-1, expr="shock", look=-0.6)
g = cairo.LinearGradient(0, 0, 1050, 0)
g.add_color_stop_rgba(0, 0, 0, 0, 0.85)
g.add_color_stop_rgba(1, 0, 0, 0, 0)
ctx.set_source(g)
ctx.paint()
text(ctx, "BOOK", 70, 170, 210, hx("#f4ead2"), outline=13, anchor="l")
text(ctx, "vs", 90, 360, 130, hx("#e0a0a8"), "Liberation Serif", outline=9, anchor="l", italic=True)
text(ctx, "MOVIE", 70, 540, 210, hx("#ff3b3b"), outline=13, anchor="l")
for i, kind in enumerate(("twilight", "newmoon", "eclipse", "dawn")):
    moon_icon(ctx, 130 + i * 190, 760, 62, kind)
C.rrect(ctx, 50, 905, 900, 110, 24)
C.fs(ctx, hx("#8a1a2a"), 6)
text(ctx, "EVERY TWILIGHT BOOK EXPLAINED", 500, 955, 40, (1, 1, 1), outline=4)
out = cairo.ImageSurface(cairo.FORMAT_ARGB32, 1280, 720)
c2 = cairo.Context(out)
c2.scale(1280 / W, 720 / H)
c2.set_source_surface(surf, 0, 0)
c2.get_source().set_filter(cairo.FILTER_BEST)
c2.paint()
out.write_to_png("twilight_THUMBNAIL.png")
print("ok")
