"""Đưa ảnh AI (Canva, Hugging Face...) về đúng chuẩn pixel của game (docs/02-CHUAN-PIXEL.md).

Ảnh AI chỉ "giả pixel": ô vuông to nhỏ không đều, mép mờ, nền trắng. Công cụ này:
  1. Bỏ nền: loang từ mép ảnh, màu gần màu nền (mặc định lấy góc trên trái) thành trong suốt.
  2. Cắt sát hình, thu về chiều cao đích (điểm ảnh thật của game) bằng màu đa số từng ô (không làm mịn).
  3. Gom màu về tối đa N màu, bỏ điểm mờ (alpha nửa vời), thêm viền 1 px tối (mực #1b1830).
Chạy:  python3 -I tools/art/ai_import.py <ảnh vào> <ảnh ra.png> --h 22 [--colors 12] [--tol 40] [--no-outline] [--zoom 8]
--zoom: xuất thêm bản phóng to <ra>.zoom.png để xem trước (nearest neighbor).
Ảnh ra để ở tools/art/nguon/ai/ rồi khai trong build.py như hình nguồn khác.
"""
import argparse
from collections import Counter, deque
import numpy as np
from PIL import Image

INK = (0x1b, 0x18, 0x30, 255)


def remove_bg(a, tol):
    h, w = a.shape[:2]
    bg = a[0, 0, :3].astype(int)
    rgb = a[:, :, :3].astype(int)
    near = (np.abs(rgb - bg).sum(axis=2) <= tol) | (a[:, :, 3] < 16)
    seen = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in (0, w - 1)) + deque((y, x) for x in range(w) for y in (0, h - 1))
    while q:
        y, x = q.popleft()
        if not (0 <= y < h and 0 <= x < w) or seen[y, x] or not near[y, x]:
            continue
        seen[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    # Viền nhoè (điểm hơi giống nền nằm sát vùng đã bỏ): gọt thêm vài vòng với ngưỡng rộng gấp 3
    loose = np.abs(rgb - bg).sum(axis=2) <= tol * 3
    for _ in range(4):
        edge = np.zeros_like(seen)
        edge[1:, :] |= seen[:-1, :]; edge[:-1, :] |= seen[1:, :]; edge[:, 1:] |= seen[:, :-1]; edge[:, :-1] |= seen[:, 1:]
        seen |= edge & loose
    out = a.copy()
    out[seen, 3] = 0
    return out


def crop(a):
    ys, xs = np.nonzero(a[:, :, 3] > 0)
    if not len(ys):
        raise SystemExit('ảnh trống sau khi bỏ nền: thử --tol nhỏ hơn')
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def shrink(a, th):
    """Thu về cao th điểm ảnh: mỗi điểm ra lấy màu xuất hiện nhiều nhất trong ô tương ứng (đa số > nửa ô thì có hình)."""
    h, w = a.shape[:2]
    k = h / th
    tw = max(1, round(w / k))
    out = np.zeros((th, tw, 4), np.uint8)
    for y in range(th):
        for x in range(tw):
            cell = a[int(y * k):max(int(y * k) + 1, int((y + 1) * k)), int(x * k):max(int(x * k) + 1, int((x + 1) * k))].reshape(-1, 4)
            solid = cell[cell[:, 3] >= 128]
            if len(solid) * 2 < len(cell):
                continue
            q = (solid[:, :3] // 8) * 8   # gom sắc gần nhau trước khi đếm
            col = Counter(map(tuple, q)).most_common(1)[0][0]
            pick = solid[(q == col).all(axis=1)][:, :3].mean(axis=0)
            out[y, x] = (*pick.astype(np.uint8), 255)
    return out


def quantize(a, n):
    mask = a[:, :, 3] > 0
    if not mask.any():
        return a
    img = Image.fromarray(a[:, :, :3]).quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.array(img), np.where(mask, 255, 0).astype(np.uint8)])
    return out


def outline(a):
    h, w = a.shape[:2]
    out = np.zeros((h + 2, w + 2, 4), np.uint8)
    out[1:-1, 1:-1] = a
    solid = out[:, :, 3] > 0
    grow = np.zeros_like(solid)
    grow[1:, :] |= solid[:-1, :]; grow[:-1, :] |= solid[1:, :]; grow[:, 1:] |= solid[:, :-1]; grow[:, :-1] |= solid[:, 1:]
    out[grow & ~solid] = INK
    return out


def convert(src, dst, th, colors=12, tol=40, line=True, zoom=0):
    a = np.array(Image.open(src).convert('RGBA'))
    a = crop(remove_bg(a, tol))
    a = quantize(shrink(a, th - (2 if line else 0)), colors)
    if line:
        a = outline(a)
    im = Image.fromarray(a, 'RGBA')
    im.save(dst)
    if zoom:
        im.resize((im.width * zoom, im.height * zoom), Image.NEAREST).save(str(dst).replace('.png', '.zoom.png'))
    return im.size


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('src'); p.add_argument('dst')
    p.add_argument('--h', type=int, required=True, help='chiều cao đích (điểm ảnh game, tính cả viền)')
    p.add_argument('--colors', type=int, default=12)
    p.add_argument('--tol', type=int, default=40, help='độ lệch màu so với nền vẫn coi là nền (0–765)')
    p.add_argument('--no-outline', action='store_true')
    p.add_argument('--zoom', type=int, default=0)
    a = p.parse_args()
    print(convert(a.src, a.dst, a.h, a.colors, a.tol, not a.no_outline, a.zoom))
