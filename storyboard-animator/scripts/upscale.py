#!/usr/bin/env python3
"""AI 4x upscale (Real-ESRGAN general x4v3, ONNX) for small storyboard panels, so camera moves stay sharp.

Usage: upscale.py MODEL.onnx in.png out.png [in2.png out2.png ...]

Get the model (free, ~4.5 MB) from Qualcomm AI Hub:
  https://qaihub-public-assets.s3.us-west-2.amazonaws.com/qai-hub-models/models/real_esrgan_general_x4v3/releases/v0.64.0/real_esrgan_general_x4v3-onnx-float.zip
Needs: pip install onnxruntime numpy pillow
"""
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image

TILE, PAD, SCALE = 128, 12, 4  # model input size, overlap trimmed from each tile edge, upscale factor


def upscale(session, img):
    name = session.get_inputs()[0].name
    a = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    h, w = a.shape[:2]
    step = TILE - 2 * PAD
    ph, pw = -(-h // step) * step, -(-w // step) * step
    padded = np.pad(a, ((PAD, ph - h + PAD), (PAD, pw - w + PAD), (0, 0)), mode="reflect")
    out = np.zeros((ph * SCALE, pw * SCALE, 3), dtype=np.float32)
    for y in range(0, ph, step):
        for x in range(0, pw, step):
            tile = padded[y:y + TILE, x:x + TILE].transpose(2, 0, 1)[None]
            res = session.run(None, {name: tile})[0][0].transpose(1, 2, 0)
            core = res[PAD * SCALE:(PAD + step) * SCALE, PAD * SCALE:(PAD + step) * SCALE]
            out[y * SCALE:(y + step) * SCALE, x * SCALE:(x + step) * SCALE] = core
    out = np.clip(out[:h * SCALE, :w * SCALE] * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(out)


def main():
    if len(sys.argv) < 4 or len(sys.argv) % 2:
        sys.exit(__doc__)
    session = ort.InferenceSession(sys.argv[1], providers=["CPUExecutionProvider"])
    for src, dst in zip(sys.argv[2::2], sys.argv[3::2]):
        upscale(session, Image.open(src)).save(dst)
        print(dst)


if __name__ == "__main__":
    main()
