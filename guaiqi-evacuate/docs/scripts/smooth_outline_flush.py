#!/usr/bin/env python3
"""Add smooth thick black outline flush to sprite; preserve interior colors.
Usage: python3 smooth_outline_flush.py input.png output.png [--thickness 7]
Requires: pillow, numpy, scipy
"""
import argparse
from PIL import Image
import numpy as np
from scipy import ndimage

def process(im, thickness=7, smooth=2.0, aa=1.5, upscale=3, canvas_size=None):
    im = im.convert('RGBA')
    w, h = im.size
    hi = im.resize((w * upscale, h * upscale), Image.LANCZOS)
    arr = np.array(hi).astype(np.float32)
    rgb, a0 = arr[:, :, :3], arr[:, :, 3] / 255.0
    body_a = a0.copy(); body_a[body_a < 0.12] = 0
    body_bin = body_a > 0.35
    pad = int(thickness * upscale + smooth * upscale * 3 + 20)
    H, W = body_bin.shape
    body_p = np.zeros((H + 2 * pad, W + 2 * pad), bool)
    body_p[pad:pad + H, pad:pad + W] = body_bin
    soft = ndimage.gaussian_filter(body_p.astype(np.float32), sigma=max(smooth * upscale / 2, 0.8))
    soft_b = ndimage.binary_dilation(ndimage.binary_closing(soft > 0.40, iterations=max(1, upscale)), iterations=1)
    dist = ndimage.distance_transform_edt(~soft_b)
    T, AA = float(thickness * upscale), float(aa * upscale)
    outside = ~body_p
    solid = (dist <= max(T - AA, 1)) & outside
    gap_zone = soft_b & outside
    rim = np.zeros_like(dist, np.float32)
    m = (dist > max(T - AA, 0)) & (dist <= T) & outside
    rim[m] = 1.0 - (dist[m] - (T - AA)) / max(AA, 1e-3)
    outline_a = np.zeros_like(dist, np.float32)
    outline_a[solid | gap_zone] = 1.0
    outline_a[m] = np.maximum(outline_a[m], rim[m])
    src_p = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.float32)
    src_p[pad:pad + H, pad:pad + W, :3] = rgb
    src_p[pad:pad + H, pad:pad + W, 3] = body_a * 255
    ol = np.zeros_like(src_p)
    ol[:, :, 0], ol[:, :, 1], ol[:, :, 2] = 12, 10, 8
    ol[:, :, 3] = np.clip(outline_a, 0, 1) * 255
    sa, oa = src_p[:, :, 3:4] / 255.0, ol[:, :, 3:4] / 255.0
    out = np.zeros_like(src_p)
    out[:, :, :3] = src_p[:, :, :3] * sa + ol[:, :, :3] * oa * (1 - sa)
    out[:, :, 3:4] = (sa + oa * (1 - sa)) * 255
    opaque = out[:, :, 3] > 160
    closed = ndimage.binary_closing(opaque, structure=np.ones((3, 3)), iterations=max(2, upscale))
    holes = closed & (out[:, :, 3] < 80)
    out[holes, 0], out[holes, 1], out[holes, 2], out[holes, 3] = 12, 10, 8, 255
    opaque = out[:, :, 3] > 160
    lum = out[:, :, 0].astype(np.int16) + out[:, :, 1] + out[:, :, 2]
    is_black, is_body = opaque & (lum < 50), opaque & (lum >= 50)
    gap = (out[:, :, 3] < 80) & ndimage.binary_dilation(is_black, iterations=max(2, upscale)) & ndimage.binary_dilation(is_body, iterations=max(2, upscale))
    out[gap, 0], out[gap, 1], out[gap, 2], out[gap, 3] = 12, 10, 8, 255
    full = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    ys, xs = np.where(out[:, :, 3] > 8)
    full = full.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    if canvas_size is None:
        canvas_size = (full.width, full.height)
    tw, th = canvas_size
    fw, fh = full.size
    sc = min((tw - 4) / fw, (th - 4) / fh, 1.0)
    if sc < 1:
        full = full.resize((max(1, int(fw * sc)), max(1, int(fh * sc))), Image.LANCZOS)
        fw, fh = full.size
    canvas = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    canvas.paste(full, ((tw - fw) // 2, th - fh - 2), full)
    return canvas

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('inp'); ap.add_argument('out'); ap.add_argument('--thickness', type=int, default=7)
    args = ap.parse_args()
    process(Image.open(args.inp), thickness=args.thickness).save(args.out)
    print('wrote', args.out)
