"""Đưa ảnh gốc SpriteCook (ảnh "raw" 2048 điểm, nền trắng, vẽ kiểu pixel nhưng mỗi điểm hình to 5–10 điểm ảnh) về điểm ảnh thật.
Vì sao cần: bước tự dò lưới của SpriteCook có lúc dò sai (18/11/2026: Thiên Kiếm Điện ra tấm 110×110 bị bóp ngang còn 33 điểm,
trong khi ảnh gốc là tranh 400×400 điểm rất nét). Máy này dò lại lưới bằng phổ tần của đường viền rồi lấy màu giữa từng ô.
  1. Dò chu kỳ lưới: cộng độ đổi màu theo cột, theo hàng, lấy đỉnh phổ trong khoảng 3–14 điểm ảnh; số ô = 2048 / chu kỳ, làm tròn.
  2. Mỗi ô lấy màu trung vị của phần giữa ô (bỏ mép bị nhoè do JPEG).
  3. Bỏ nền trắng: loang từ viền ảnh qua các ô gần trắng; lỗ trắng kín bên trong đủ lớn cũng bỏ; gọt quầng xám nhạt sát mép.
  4. Gom màu về tối đa `mau` màu (không rắc hạt), cắt sát hình.
Dùng trong máy khác:  from sc_luoi import ve_luoi;  im, n = ve_luoi(path)
Chạy thử:             python3 tools/art/sc_luoi.py <ảnh gốc> <ảnh ra .png> [số màu]"""
import sys
from collections import deque

import numpy as np
from PIL import Image


def chu_ky(profile, lo=3.0, hi=14.0):
    """Chu kỳ lưới (điểm ảnh) mạnh nhất của một dãy độ đổi màu."""
    p = profile - profile.mean()
    f = np.abs(np.fft.rfft(p))
    n = len(p)
    k0, k1 = int(n / hi), int(n / lo) + 1
    k = k0 + int(np.argmax(f[k0:k1]))
    return n / k


def so_o(g):
    """Số ô lưới theo ngang, dọc của ảnh xám g. Chu kỳ ngắn (5,1) có thể chỉ là hoạ âm của lưới thô (10,2): chọn chu kỳ dài nhất
    trong các đỉnh mạnh (từ 60% đỉnh cao nhất)."""
    out = []
    for axis in (1, 0):
        prof = np.abs(np.diff(g, axis=axis)).sum(axis=1 - axis)
        p = prof - prof.mean()
        f = np.abs(np.fft.rfft(p))
        n = len(p)
        cand = [(f[k], n / k) for k in range(int(n / 14.0), int(n / 3.0) + 1)]
        top = max(c[0] for c in cand)
        out.append(round(n / max(per for amp, per in cand if amp >= top * 0.6)))
    return out


def lay_o(a, nx, ny):
    """Màu trung vị phần giữa mỗi ô → mảng (ny, nx, 3)."""
    H, W = a.shape[:2]
    out = np.zeros((ny, nx, 3), np.uint8)
    xs = [(int(round((i + 0.25) * W / nx)), max(int(round((i + 0.75) * W / nx)), int(round((i + 0.25) * W / nx)) + 1)) for i in range(nx)]
    ys = [(int(round((j + 0.25) * H / ny)), max(int(round((j + 0.75) * H / ny)), int(round((j + 0.25) * H / ny)) + 1)) for j in range(ny)]
    for j, (y0, y1) in enumerate(ys):
        row = a[y0:y1]
        for i, (x0, x1) in enumerate(xs):
            out[j, i] = np.median(row[:, x0:x1].reshape(-1, 3), axis=0)
    return out


def bo_nen(c, sang=238, lo_kin=10):
    """Mặt nạ hình (True = giữ). Nền: ô gần trắng nối với viền ảnh; lỗ trắng kín từ lo_kin ô trở lên; quầng xám nhạt sát mép."""
    h, w = c.shape[:2]
    mn, mx = c.min(axis=2).astype(int), c.max(axis=2).astype(int)
    white = (mn >= sang) & (mx - mn <= 14)
    seen = np.zeros((h, w), bool)
    bg = np.zeros((h, w), bool)

    def flood(seeds):
        q, cells = deque(seeds), []
        for s in seeds:
            seen[s] = True
        while q:
            y, x = q.popleft()
            cells.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and white[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    q.append((yy, xx))
        return cells

    border = [(y, x) for y in range(h) for x in (0, w - 1) if white[y, x]] + [(y, x) for x in range(w) for y in (0, h - 1) if white[y, x]]
    for y, x in flood(list(dict.fromkeys(border))):
        bg[y, x] = True
    for y in range(h):
        for x in range(w):
            if white[y, x] and not seen[y, x]:
                cells = flood([(y, x)])
                if len(cells) >= lo_kin:
                    for cy, cx in cells:
                        bg[cy, cx] = True
    for _ in range(2):   # quầng: ô sáng, ít màu, kề nền
        near = np.zeros((h, w), bool)
        near[1:] |= bg[:-1]; near[:-1] |= bg[1:]; near[:, 1:] |= bg[:, :-1]; near[:, :-1] |= bg[:, 1:]
        halo = near & ~bg & (mn >= 205) & (mx - mn <= 26)
        if not halo.any():
            break
        bg |= halo
    return ~bg


def ve_luoi(path, mau=96, o=None):
    """Ảnh gốc → (ảnh RGBA điểm ảnh thật đã cắt sát, số ô ngang của lưới). o: ép số ô (ngang, dọc) khi biết trước."""
    a = np.asarray(Image.open(path).convert('RGB'))
    nx, ny = o or so_o(a.astype(np.float32).mean(axis=2))
    c = lay_o(a, nx, ny)
    keep = bo_nen(c)
    rgb = Image.fromarray(c, 'RGB')
    if mau:
        rgb = rgb.quantize(mau, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    out = np.dstack([np.asarray(rgb), np.where(keep, 255, 0).astype(np.uint8)])
    out[~keep] = 0
    im = Image.fromarray(out, 'RGBA')
    return im.crop(im.getbbox()), nx


if __name__ == '__main__':
    im, n = ve_luoi(sys.argv[1], int(sys.argv[3]) if len(sys.argv) > 3 else 96)
    im.save(sys.argv[2])
    print(sys.argv[2], im.size, 'lưới', n, 'màu', len(im.getcolors(1 << 20) or []))
