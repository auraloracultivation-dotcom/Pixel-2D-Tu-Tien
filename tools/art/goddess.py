"""Sáu nữ thần theo hệ (ảnh chủ dự án gửi, nền hồng tươi): cắt từng ô, xoá nền, thu nhỏ về lưới điểm ảnh thật.
nu-than-6.png (chi tiết), nu-than-6-don-gian.png (pixel khối to): 6 nhân vật lưới 3×2. nu-than-bo.png: bảng 3 hàng × 6 ô có khung (nhân vật, vũ khí, hiệu ứng)."""
from pathlib import Path
import numpy as np
from PIL import Image

from px import Canvas

SRC = Path(__file__).parent / 'nguon'
ORDER = ['quang', 'loi', 'bang', 'thuy', 'am', 'thoi']   # Quang, Lôi, Băng, Thủy, Ám, Thời gian
_BO_X = [(18, 250), (260, 492), (502, 724), (734, 962), (972, 1196), (1206, 1432)]
_BO_Y = {'vu-khi': (412, 700), 'hieu-ung': (714, 1010)}


def _cut(rgb, k, min_area=24, inset=0, edge=False):
    """Ô ảnh RGB (nguồn) → Canvas 1/k: xoá nền hồng, bỏ cụm vụn; edge: bỏ cả viền và hoa văn góc thẻ; cắt sát."""
    a = rgb[inset:rgb.shape[0] - inset, inset:rgb.shape[1] - inset].astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    pink = (g < 90) & (r > 170) & (b > 170) & (np.abs(r - b) < 60)
    solid = ~pink
    if edge:   # xoá các đường thẳng của khung thẻ gần mép ô (hàng/cột gần như toàn điểm đặc)
        for ax in (0, 1):
            full = solid.mean(axis=1 - ax) > 0.5
            n = solid.shape[ax]
            for i in np.where(full)[0]:
                if i < 30 or i >= n - 30:
                    if ax == 0:
                        solid[max(0, i - 1):i + 2] = False
                    else:
                        solid[:, max(0, i - 1):i + 2] = False
    lab = _label(solid)
    keep = np.zeros_like(solid)
    ids, cnt = np.unique(lab[lab > 0], return_counts=True)
    for i, n in zip(ids, cnt):
        if n < min_area * k * k:
            continue
        ys, xs = np.where(lab == i)
        if edge and (ys.min() < 30 or ys.max() >= a.shape[0] - 30) and (xs.min() < 30 or xs.max() >= a.shape[1] - 30) and n < 3000:
            continue   # hoa văn góc thẻ
        keep |= lab == i
    ys, xs = np.where(keep)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    h, w = int(-(-(y1 - y0) // k)), int(-(-(x1 - x0) // k))
    pad = np.zeros((h * k, w * k), bool)
    pad[:y1 - y0, :x1 - x0] = keep[y0:y1, x0:x1]
    col = np.zeros((h * k, w * k, 3))
    col[:y1 - y0, :x1 - x0] = a[y0:y1, x0:x1]
    m = pad.reshape(h, k, w, k).astype(float)
    cov = m.mean(axis=(1, 3))
    rgbk = (col.reshape(h, k, w, k, 3) * m[..., None]).sum(axis=(1, 3)) / np.maximum(m.sum(axis=(1, 3)), 1)[..., None]
    cv = Canvas(w + 2, h + 2)
    cv.a[1:-1, 1:-1, :3] = np.clip(rgbk, 0, 255).astype(np.uint8)
    cv.a[1:-1, 1:-1, 3] = np.where(cov >= 0.5, 255, 0)
    return cv


def _label(mask):
    """Gán số cụm (nối 4 hướng) bằng loang theo hàng: trả mảng nhãn cùng cỡ."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    for y0, x0 in zip(*np.where(mask)):
        if lab[y0, x0]:
            continue
        n += 1
        lab[y0, x0] = n
        todo = [(y0, x0)]
        while todo:
            y, x = todo.pop()
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    todo.append((yy, xx))
    return lab


def heroes(name='nu-than-6', k=5):
    """→ {hệ: Canvas} sáu nhân vật từ tools/art/nguon/<name>.png, mỗi điểm ảnh hình = k điểm ảnh nguồn."""
    a = np.array(Image.open(SRC / f'{name}.png').convert('RGB'))
    cw, ch = a.shape[1] // 3, a.shape[0] // 2
    return {e: _cut(a[(i // 3) * ch:(i // 3 + 1) * ch, (i % 3) * cw:(i % 3 + 1) * cw], k) for i, e in enumerate(ORDER)}


def items(row, k=5):
    """→ {hệ: Canvas} hàng 'vu-khi' hoặc 'hieu-ung' của bảng đầy đủ."""
    a = np.array(Image.open(SRC / 'nu-than-bo.png').convert('RGB'))
    y0, y1 = _BO_Y[row]
    return {e: _cut(a[y0:y1, x0:x1], k, edge=True) for e, (x0, x1) in zip(ORDER, _BO_X)}


def same_size(frames, middle=False):
    """Đặt các hình về cùng cỡ ô (canh giữa ngang; canh đáy, hoặc giữa nếu middle) để xếp thành một dải."""
    w, h = int(max(f.w for f in frames)), int(max(f.h for f in frames))
    out = []
    for f in frames:
        cv = Canvas(w, h)
        x, y = (w - f.w) // 2, (h - f.h) // 2 if middle else h - f.h
        cv.a[y:y + f.h, x:x + f.w] = f.a
        out.append(cv)
    return out
