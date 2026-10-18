#!/usr/bin/env python3
"""Smooth thick flush outlines for icon sheets and small UI sprites.

Adapts the idea in smooth_outline_flush.py for icons that already have a
pixel contour and internal holes (sheets of paper, sparks, fan blades):

- Fill colors are copied back exactly. Interior pixels are never painted black.
- A smooth anti-aliased black rim is drawn only in previously transparent pixels.
- Only tiny transparent gaps between that rim and the fill are sealed.
- Icon-sheet cells stay on the original 5×5 grid so upgrade UVs do not move.

Character sprites should still use smooth_outline_flush.py (feet baseline,
thicker rim). This script is for upgrade icons, projectiles, and hub tiles.
"""
import os
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(ROOT, 'assets')
INK = (12, 10, 8, 255)


def smooth_rim(im, thickness=2.3, aa=1.2, up=4):
    """Return RGBA with a smooth outer rim. Original pixels (alpha>40) are unchanged."""
    im = im.convert('RGBA')
    src = np.array(im).astype(np.float32)
    h, w = src.shape[:2]
    alpha = src[:, :, 3]
    keep = alpha > 40
    if int(keep.sum()) < 8:
        return im
    keep_hi = np.array(
        Image.fromarray((keep.astype(np.uint8) * 255), 'L').resize((w * up, h * up), Image.NEAREST)
    ) > 127
    soft = ndimage.gaussian_filter(keep_hi.astype(np.float32), sigma=max(0.75, up * 0.28))
    solid = soft > 0.5
    dist_smooth = ndimage.distance_transform_edt(~np.maximum(solid, keep_hi))
    dist_out = ndimage.distance_transform_edt(~keep_hi)
    T = float(thickness * up)
    AA = float(aa * up)
    band = (~keep_hi) & (dist_out <= (T + 0.6)) & (dist_smooth <= T)
    d = np.minimum(dist_out, dist_smooth + 0.01)
    outline = np.zeros(dist_out.shape, np.float32)
    inner = band & (d <= max(T - AA, 0.35))
    rim = band & (d > max(T - AA, 0.0)) & (d <= T)
    outline[inner] = 1.0
    if rim.any():
        outline[rim] = np.clip(1.0 - (d[rim] - (T - AA)) / max(AA, 1e-3), 0, 1)

    fill_hi = np.array(
        Image.fromarray(np.clip(src, 0, 255).astype(np.uint8), 'RGBA').resize((w * up, h * up), Image.NEAREST)
    ).astype(np.float32)
    fa = fill_hi[:, :, 3] / 255.0
    oa = outline * (fa < 0.12)
    out = fill_hi.copy()
    out[:, :, 0] = fill_hi[:, :, 0] * fa + INK[0] * oa * (1 - fa)
    out[:, :, 1] = fill_hi[:, :, 1] * fa + INK[1] * oa * (1 - fa)
    out[:, :, 2] = fill_hi[:, :, 2] * fa + INK[2] * oa * (1 - fa)
    out[:, :, 3] = np.clip(fa + oa * (1 - fa), 0, 1) * 255

    black = (out[:, :, 3] > 150) & (out[:, :, :3].sum(axis=2) < 80)
    body = (out[:, :, 3] > 150) & (out[:, :, :3].sum(axis=2) >= 80)
    gap = (out[:, :, 3] < 28) & ndimage.binary_dilation(black, iterations=1) & ndimage.binary_dilation(body, iterations=1)
    labels, n = ndimage.label(gap)
    if n:
        sizes = np.bincount(labels.ravel())
        small = sizes[labels] < (up * up * 2)
        small[labels == 0] = False
        out[small, 0] = INK[0]
        out[small, 1] = INK[1]
        out[small, 2] = INK[2]
        out[small, 3] = 255

    small_img = np.array(
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)
    ).astype(np.float32)
    restore = alpha > 40
    small_img[restore] = src[restore]
    return Image.fromarray(np.clip(small_img, 0, 255).astype(np.uint8), 'RGBA')


def fit_center(im, size, margin=3):
    arr = np.array(im)
    mask = arr[:, :, 3] > 10
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    if not mask.any():
        return canvas
    ys, xs = np.where(mask)
    crop = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    avail = max(1, size - margin * 2)
    scale = min(avail / crop.width, avail / crop.height, 1.0)
    if scale < 0.999:
        crop = crop.resize(
            (max(1, int(round(crop.width * scale))), max(1, int(round(crop.height * scale)))),
            Image.LANCZOS,
        )
    canvas.paste(crop, ((size - crop.width) // 2, (size - crop.height) // 2), crop)
    return canvas


def knock_mat(im):
    """Drop a beige tile mat and its outer black frame. Keep the icon and its own outline."""
    im = im.convert('RGBA')
    arr = np.array(im)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mat = (
        (alpha > 200) & (r > 190) & (g > 150) & (b > 90) & (b < 190)
        & ((r - b) > 25) & (np.abs(r - g) < 55)
    )
    dark = (alpha > 140) & (rgb.max(axis=2) < 50)
    color = (alpha > 140) & ~mat & ~dark
    protected = dark & ndimage.binary_dilation(color, iterations=1)
    removable_dark = dark & ~protected
    walk = mat | (alpha < 20) | removable_dark
    seeds = np.zeros((h, w), bool)
    seeds[0, :] = seeds[-1, :] = seeds[:, 0] = seeds[:, -1] = True
    reach = seeds & walk
    for _ in range(max(h, w)):
        nxt = ndimage.binary_dilation(reach, iterations=1) & walk
        if int(nxt.sum()) == int(reach.sum()):
            break
        reach = nxt
    drop = reach & (mat | removable_dark)
    out = arr.copy()
    out[drop, 3] = 0
    return Image.fromarray(out, 'RGBA')


def process_padded(im, thickness, margin=3):
    """Outline on a padded canvas, then fit back to the original size."""
    im = im.convert('RGBA')
    pad = max(6, int(np.ceil(thickness + 3)))
    canvas = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad), im)
    outlined = smooth_rim(canvas, thickness=thickness)
    return fit_center(outlined, im.width if im.width == im.height else im.width, margin=margin) if im.width == im.height else _fit_box(outlined, im.size, margin)


def _fit_box(im, size, margin):
    tw, th = size
    arr = np.array(im)
    mask = arr[:, :, 3] > 10
    canvas = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    if not mask.any():
        return canvas
    ys, xs = np.where(mask)
    crop = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    avail_w, avail_h = max(1, tw - margin * 2), max(1, th - margin * 2)
    scale = min(avail_w / crop.width, avail_h / crop.height, 1.0)
    if scale < 0.999:
        crop = crop.resize(
            (max(1, int(round(crop.width * scale))), max(1, int(round(crop.height * scale)))),
            Image.LANCZOS,
        )
    canvas.paste(crop, ((tw - crop.width) // 2, (th - crop.height) // 2), crop)
    return canvas


def process_sheet(path, thickness=2.35):
    sheet = Image.open(path).convert('RGBA')
    w, h = sheet.size
    if w != h or w % 5:
        raise SystemExit(f'expected square 5×5 sheet, got {sheet.size}')
    cell = w // 5
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for row in range(5):
        for col in range(5):
            tile = sheet.crop((col * cell, row * cell, (col + 1) * cell, (row + 1) * cell))
            painted = process_padded(tile, thickness=thickness, margin=4)
            out.paste(painted, (col * cell, row * cell), painted)
    arr = np.array(out)
    # Cells must not bleed: the outer pixel of each cell stays clear.
    for row in range(5):
        for col in range(5):
            tile = arr[row * cell:(row + 1) * cell, col * cell:(col + 1) * cell, 3]
            if tile[0, :].max() > 8 or tile[-1, :].max() > 8 or tile[:, 0].max() > 8 or tile[:, -1].max() > 8:
                raise SystemExit(f'cell {row},{col} touches the grid edge')
    out.save(path)
    return path


def process_file(path, thickness, margin=3):
    im = Image.open(path).convert('RGBA')
    process_padded(im, thickness=thickness, margin=margin).save(path)


def drop_frame_bits(im):
    """Remove tile-frame fragments left after knock_mat. Keep the icon body."""
    arr = np.array(im.convert('RGBA'))
    opaque = arr[:, :, 3] > 20
    labels, count = ndimage.label(opaque)
    if count == 0:
        return im
    h, w = opaque.shape
    sizes = np.bincount(labels.ravel())
    largest = int(sizes[1:].max())
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum(np.minimum(xx, yy), np.minimum(w - 1 - xx, h - 1 - yy))
    for i in range(1, count + 1):
        sel = labels == i
        if sizes[i] >= largest * 0.45:
            continue
        ys, xs = np.where(sel)
        bw = int(xs.max() - xs.min() + 1)
        bh = int(ys.max() - ys.min() + 1)
        density = sizes[i] / float(bw * bh)
        thin = min(bw, bh) <= 14 and max(bw, bh) >= w * 0.4
        sparse = density < 0.12 and max(bw, bh) > w * 0.45
        speck = sizes[i] < 36
        # Small chunks hugging the tile edge are leftover frame corners, not the icon.
        border_junk = int(edge[sel].min()) <= 16 and sizes[i] < largest * 0.15
        if speck or thin or sparse or border_junk:
            arr[sel, 3] = 0
    return Image.fromarray(arr, 'RGBA')


def process_hub(path, thickness=2.7):
    im = drop_frame_bits(knock_mat(Image.open(path)))
    process_padded(im, thickness=thickness, margin=8).save(path)


def draw_pause(path):
    s = 128
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink = (59, 42, 26, 255)
    paper = (255, 246, 226, 255)
    d.rounded_rectangle((8, 8, 120, 120), radius=28, fill=paper, outline=ink, width=8)
    d.rounded_rectangle((44, 36, 58, 92), radius=6, fill=ink)
    d.rounded_rectangle((70, 36, 84, 92), radius=6, fill=ink)
    im.save(path)


def draw_panel(path):
    """Smooth ink frame, transparent center. Not a chunky pixel window."""
    w, h = 384, 512
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink = (59, 42, 26, 255)
    cream = (255, 243, 220, 255)
    d.rounded_rectangle((8, 8, w - 9, h - 9), radius=36, outline=ink, width=16)
    d.rounded_rectangle((28, 28, w - 29, h - 29), radius=26, outline=cream, width=4)
    im.save(path)


def draw_btn_frame(path, size, accent):
    w, h = size
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink = (59, 42, 26, 255)
    paper = (255, 243, 220, 255)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=18, fill=paper, outline=ink, width=6)
    # small accent ticks, smooth squares not pixel stairs
    t = 10
    for x, y in ((10, 10), (w - 10 - t, 10), (10, h - 10 - t), (w - 10 - t, h - 10 - t)):
        d.rounded_rectangle((x, y, x + t, y + t), radius=3, fill=accent)
    im.save(path)


def main():
    sheet = os.path.join(ASSETS, 'upgrade_icons_sheet.png')
    process_sheet(sheet, thickness=2.35)
    print('sheet', sheet)
    for name, thickness in (
        ('proj_bullet.png', 2.1),
        ('proj_chem.png', 2.0),
        ('proj_nail.png', 2.1),
        ('proj_extinguish.png', 2.0),
        ('icon_stapler.png', 2.3),
        ('icon_fan_blade.png', 2.3),
        ('icon_chem_jug.png', 2.3),
        ('icon_extinguisher.png', 2.3),
        ('icon_nail_bomb.png', 2.3),
        ('icon_robo_vac.png', 2.3),
        ('equip_weapon.png', 2.4),
        ('equip_hat.png', 2.4),
        ('equip_coat.png', 2.4),
        ('equip_shoes.png', 2.4),
    ):
        process_file(os.path.join(ASSETS, name), thickness=thickness, margin=3)
        print('sprite', name)
    for name in (
        'hub_bag.png', 'hub_chars.png', 'hub_gacha.png',
        'hub_gallery.png', 'hub_settings.png', 'hub_stages.png',
    ):
        process_hub(os.path.join(ASSETS, name), thickness=2.7)
        print('hub', name)
    draw_pause(os.path.join(ASSETS, 'ui_btn_pause.png'))
    draw_panel(os.path.join(ASSETS, 'ui_panel.png'))
    draw_btn_frame(os.path.join(ASSETS, 'btn_primary_frame.png'), (400, 123), (240, 138, 50, 255))
    draw_btn_frame(os.path.join(ASSETS, 'btn_secondary_frame.png'), (400, 176), (63, 181, 165, 255))
    print('ui frames')


if __name__ == '__main__':
    main()
