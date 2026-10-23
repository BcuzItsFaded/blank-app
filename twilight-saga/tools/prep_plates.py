#!/usr/bin/env python3
"""Build 1920x1080 animation plates from the storyboard panels.

For each scene:
  1. upscale the panel 4x (Real-ESRGAN anime 6B) and place it at full height on a 16:9 canvas;
  2. cut animated objects (van, wolves, thought bubble…) out as RGBA sprites (rembg isnet-anime);
  3. remove the drawn characters/objects and outpaint the side strips with LaMa, so the
     re-drawn animated characters move over a clean background;
  4. save foreground occluders (desks, blanket) that characters sit behind.

Shapes are in panel-normalized coordinates (u, v in 0..1):
  ["rect", u0, v0, u1, v1]   ["ell", cu, cv, ru, rv]   ["poly", [[u, v], ...]]   ["ring", cu, cv, ru, rv, thick]

    python tools/prep_plates.py [scene numbers…]
Writes assets/plates/sceneNN.jpg, assets/sprites/*.png and assets/plates.json.
"""
import json, os, sys
import numpy as np
import cv2, torch
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1920, 1080

SPEC = {
    1: {"remove": [["rect", .08, .18, .44, 1.0]],
        "sprites": {"cars": ["rect", .40, .57, .65, .75]}},
    2: {"remove": [["rect", .05, .20, .38, .80], ["rect", .28, .10, .38, .42],
                   ["rect", .60, .10, .93, .80]],
        "occluders": {"desks": ["rect", 0, .785, 1, 1]}},
    3: {"remove": [["rect", .02, .26, .27, 1.0], ["rect", .24, .28, .70, 1.0]],
        "sprites": {"van": ["rect", .535, .07, 1.0, .97]}},
    4: {"remove": [["rect", .18, .30, .51, .94], ["rect", .45, .10, .82, .97]]},
    5: {"remove": [["rect", 0, 0, .38, 1.0], ["rect", .55, .38, .99, .96]]},
    6: {"remove": [["rect", .28, .30, .68, .95]]},
    7: {"remove": [["rect", .13, .23, .41, 1.0], ["rect", .41, .18, .69, 1.0]]},
    8: {"remove": [["rect", .12, .25, .52, 1.0]],
        "sprites": {"wolf8": ["rect", .40, .02, .95, .99]}, "anime": ["wolf8"]},
    9: {"remove": [["rect", 0, .22, .48, .97], ["rect", .40, 0, 1.0, .56]],
        "sprites": {"bubble": ["ell", .69, .215, .275, .205]}, "shape_cut": ["bubble"]},
    10: {"remove": [["rect", 0, .30, .27, .77], ["rect", .19, .0, .83, .83], ["rect", .74, .33, 1.0, .77]],
         "sprites": {"bannerL": ["rect", .09, .0, .22, .38], "bannerR": ["rect", .79, .0, .92, .38]}},
    11: {"remove": [["rect", 0, 0, .31, 1.0], ["rect", .21, .22, 1.0, .99]]},
    12: {"remove": [["rect", 0, .14, .34, 1.0], ["rect", .29, .26, .63, 1.0], ["rect", .64, .08, 1.0, 1.0],
                    ["rect", .55, .18, .65, .34]]},
    13: {"remove": [["poly", [[0, 1], [0, .80], [.18, .30], [.30, .17], [.48, .17], [.50, .02], [.72, .02],
                              [.72, 1.0]]]]},
    14: {"remove": [["rect", .0, .10, .58, .80], ["rect", .50, .0, .84, .64]],
         "occluders": {"blanket": ["poly", [[0, .80], [.25, .74], [.45, .78], [.62, .70], [.85, .66], [1, .64],
                                            [1, 1], [0, 1]]]}},
    15: {"remove": [["rect", 0, .24, .43, .75], ["rect", .43, .16, .815, .84]]},  # wolf + 2 behind it stay
    16: {"remove": [["rect", .29, .21, .71, .99], ["rect", .15, .22, .35, .80], ["rect", .58, .16, .78, .83],
                    ["ring", .505, .47, .39, .53, .05]]},
}

DEV = "cpu"
torch.set_num_threads(os.cpu_count() or 4)


def load_models():
    import spandrel
    up = spandrel.ModelLoader().load_from_file(os.path.expanduser("~/.cache/upscale/RealESRGAN_x4plus_anime_6B.pth")).eval()
    lama = torch.jit.load(os.path.expanduser("~/.cache/lama/big-lama.pt"), map_location=DEV).eval()
    from rembg import new_session
    # u2net cuts objects (vehicles, banners, bubbles) cleanly; isnet-anime is best on drawn creatures
    seg = {"anime": new_session("isnet-anime"), "general": new_session("u2net")}
    return up, lama, seg


def upscale(up, img):
    t = torch.from_numpy(np.asarray(img).astype(np.float32) / 255).permute(2, 0, 1)[None]
    with torch.no_grad():
        o = up(t)[0].clamp(0, 1).permute(1, 2, 0).numpy()
    return Image.fromarray((o * 255).round().astype(np.uint8))


def lama_fill(lama, img, mask, work=(1024, 576)):
    """Inpaint at a moderate resolution (coherent big fills), composite back at full res."""
    small = img.resize(work, Image.LANCZOS)
    m = mask.resize(work, Image.NEAREST)
    it = torch.from_numpy(np.asarray(small).astype(np.float32) / 255).permute(2, 0, 1)[None]
    mt = (torch.from_numpy(np.asarray(m).astype(np.float32) / 255)[None, None] > 0.5).float()
    with torch.no_grad():
        o = lama(it, mt)[0].clamp(0, 1).permute(1, 2, 0).numpy()
    filled = Image.fromarray((o * 255).round().astype(np.uint8)).resize(img.size, Image.LANCZOS)
    soft = mask.filter(ImageFilter.GaussianBlur(6))
    return Image.composite(filled, img, soft)


def shape_mask(shapes, box, size=(W, H)):
    """box = (x0, y0, w, h): where the panel sits on the canvas."""
    x0, y0, bw, bh = box
    P = lambda u, v: (x0 + u * bw, y0 + v * bh)
    m = Image.new("L", size, 0); d = ImageDraw.Draw(m)
    for s in shapes:
        k = s[0]
        if k == "rect": d.rectangle([P(s[1], s[2]), P(s[3], s[4])], fill=255)
        elif k == "ell":
            (cx, cy), (rx, ry) = P(s[1], s[2]), (s[3] * bw, s[4] * bh)
            d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
        elif k == "poly": d.polygon([P(u, v) for u, v in s[1]], fill=255)
        elif k == "ring":
            (cx, cy), rx, ry, t = P(s[1], s[2]), s[3] * bw, s[4] * bh, s[5] * bw
            r = Image.new("L", size, 0); rd = ImageDraw.Draw(r)
            rd.ellipse([cx - rx - t, cy - ry - t, cx + rx + t, cy + ry + t], fill=255)
            rd.ellipse([cx - rx + t, cy - ry + t, cx + rx - t, cy + ry - t], fill=0)
            m = Image.fromarray(np.maximum(np.asarray(m), np.asarray(r))); d = ImageDraw.Draw(m)
    return m


def main():
    only = [int(a) for a in sys.argv[1:]] or sorted(SPEC)
    up, lama, seg = load_models()
    from rembg import remove
    os.makedirs(f"{ROOT}/assets/plates", exist_ok=True); os.makedirs(f"{ROOT}/assets/sprites", exist_ok=True)
    meta_path = f"{ROOT}/assets/plates.json"
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    for n in only:
        spec = SPEC[n]
        panel = Image.open(f"{ROOT}/assets/panels/scene{n:02d}.png").convert("RGB")
        big = upscale(up, panel)
        bw = round(H * panel.width / panel.height); bh = H
        content = big.resize((bw, bh), Image.LANCZOS)
        if bw >= W:  # wider than 16:9: crop sides (keeps full height)
            x0 = (W - bw) // 2
        else:
            x0 = (W - bw) // 2
        canvas = Image.new("RGB", (W, H)); canvas.paste(content, (x0, 0))
        box = (x0, 0, bw, bh)
        # sprites (cut from the untouched art)
        sprites = {}
        for name, shp in spec.get("sprites", {}).items():
            m = shape_mask([shp], box)
            bx = m.getbbox()
            crop = canvas.crop(bx)
            if name in spec.get("shape_cut", []):  # cut by the shape itself (e.g. a thought bubble)
                a = np.asarray(m.crop(bx).filter(ImageFilter.GaussianBlur(2)))
            else:
                model = "anime" if name in spec.get("anime", []) else "general"
                cut = remove(crop, session=seg[model], post_process_mask=True)
                a = np.asarray(cut)[..., 3]
                if name in spec.get("anime", []):  # drop dark shapes entering from the top (legs of people behind)
                    rgb = np.asarray(crop).astype(int)
                    dark = ((rgb.max(2) < 95) & (a > 0)).astype(np.uint8)
                    nlab, lab, st, _ = cv2.connectedComponentsWithStats(dark)
                    for i in range(1, nlab):
                        if st[i, cv2.CC_STAT_TOP] <= 2 and st[i, cv2.CC_STAT_HEIGHT] > 0.25 * a.shape[0]:
                            a = np.where(cv2.dilate((lab == i).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0, 0, a).astype(np.uint8)
            a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
            # keep only the main pieces (drops stray lamp dots / bits of neighbours)
            nlab, lab, stats, _ = cv2.connectedComponentsWithStats((a > 128).astype(np.uint8))
            if nlab > 2:
                big_area = stats[1:, cv2.CC_STAT_AREA].max()
                keep = np.isin(lab, [i for i in range(1, nlab) if stats[i, cv2.CC_STAT_AREA] >= 0.12 * big_area])
                a = np.where(cv2.dilate(keep.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0, a, 0).astype(np.uint8)
            rgba = np.dstack([np.asarray(crop), a])
            Image.fromarray(rgba).save(f"{ROOT}/assets/sprites/{name}.png")
            sprites[name] = {"x": bx[0], "y": bx[1], "w": bx[2] - bx[0], "h": bx[3] - bx[1]}
        # removal mask: characters + sprite areas + the side strips to outpaint
        mask = shape_mask(spec.get("remove", []) + list(spec.get("sprites", {}).values()), box)
        md = ImageDraw.Draw(mask)
        if x0 > 0:
            md.rectangle([0, 0, x0 + 3, H], fill=255); md.rectangle([x0 + bw - 3, 0, W, H], fill=255)
        mask = mask.filter(ImageFilter.MaxFilter(9))
        plate = lama_fill(lama, canvas, mask)
        plate.save(f"{ROOT}/assets/plates/scene{n:02d}.jpg", quality=92)
        occ = {}
        for name, shp in spec.get("occluders", {}).items():
            m = shape_mask([shp], box).filter(ImageFilter.GaussianBlur(1.5))
            rgba = plate.convert("RGBA"); rgba.putalpha(m)
            bx = m.getbbox(); rgba.crop(bx).save(f"{ROOT}/assets/sprites/{name}.png")
            occ[name] = {"x": bx[0], "y": bx[1], "w": bx[2] - bx[0], "h": bx[3] - bx[1]}
        meta[str(n)] = {"box": box, "sprites": sprites, "occluders": occ}
        print(f"scene {n}: plate ok, sprites {list(sprites)}, occluders {list(occ)}", flush=True)
        json.dump(meta, open(meta_path, "w"), indent=1)


if __name__ == "__main__":
    main()
