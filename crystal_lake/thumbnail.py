"""1280x720 YouTube thumbnail built from the same assets as the video."""
from PIL import Image, ImageDraw, ImageFilter
import render as R

W, H = 1920, 1080
A = R.Assets(W, H, 0.62, (0.82, 0.32))
img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
R.background(img, A, 3.0)
img.alpha_composite(Image.new("RGBA", (W, H), (60, 0, 0, 70)))
R.sack_figure(img, A, W * 0.76, H + 60, 10, 0, scale=1.35)
img.alpha_composite(A.vig)
d = ImageDraw.Draw(img)
for i, (s, c) in enumerate([("JASON", R.BONE), ("NEVER", R.BONE), ("DIED?", (235, 35, 30))]):
    d.text((70, 90 + i * 260), s, font=R.font(R.SANS, 250), fill=c, stroke_width=12, stroke_fill=(0, 0, 0))
R.badge(d, 70, 960, "CRYSTAL LAKE ENDING EXPLAINED", R.font(R.SANS, 62), (255, 255, 255), (200, 20, 20), anchor="l")
img.convert("RGB").resize((1280, 720), Image.LANCZOS).save("crystal_lake_THUMBNAIL.jpg", quality=92)
print("ok")
