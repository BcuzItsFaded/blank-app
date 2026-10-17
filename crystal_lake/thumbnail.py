"""1280x720 YouTube thumbnail in the cartoon style."""
import cairo

import cartoon as C
from cartoon import CAST, hx, text

W, H = 1920, 1080
surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
ctx = cairo.Context(surf)
C.bg_lake(ctx, 3.0, dock=False, moon_xy=(1480, 250))
ctx.set_source_rgba(0.4, 0, 0, 0.25)
ctx.paint()
CAST["pam"].draw(ctx, 1150, 1300, 1.25, t=1.0, expr="manic", armL=30, armR=30, elbowL=40, elbowR=40)
CAST["jason"].draw(ctx, 1600, 1350, 1.15, t=1.0, facing=-1, eye_glow=1.0)
g = cairo.LinearGradient(0, 0, 1100, 0)
g.add_color_stop_rgba(0, 0, 0, 0, 0.75)
g.add_color_stop_rgba(1, 0, 0, 0, 0)
ctx.set_source(g)
ctx.paint()
for i, (s, c) in enumerate((("JASON", hx("#f4ead2")), ("NEVER", hx("#f4ead2")), ("DIED?", hx("#ff2a1f")))):
    text(ctx, s, 70, 200 + i * 250, 240, c, outline=14, anchor="l")
C.rrect(ctx, 60, 900, 1010, 110, 24)
C.fs(ctx, hx("#c81414"), 6)
text(ctx, "CRYSTAL LAKE ENDING EXPLAINED", 565, 950, 46, (1, 1, 1), outline=4)
out = cairo.ImageSurface(cairo.FORMAT_ARGB32, 1280, 720)
c2 = cairo.Context(out)
c2.scale(1280 / W, 720 / H)
c2.set_source_surface(surf, 0, 0)
c2.get_source().set_filter(cairo.FILTER_BEST)
c2.paint()
out.write_to_png("crystal_lake_THUMBNAIL.png")
print("ok")
