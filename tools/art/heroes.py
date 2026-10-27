"""Nhân vật chính dùng tạm từ hình có sẵn (tools/art/nguon/), không vẽ bằng code.
strip: dải ngang nền hồng tím (ảnh chủ dự án gửi). sheet: dải khung vuông nền trong suốt (chuyển động SpriteCook)."""
from pathlib import Path
import numpy as np
from PIL import Image

from px import Canvas

SRC = Path(__file__).parent / 'nguon'


def _key(a):
    """Nền hồng tím (và viền nhoè của nó) thành trong suốt."""
    r, g, b = (a[..., i].astype(int) for i in range(3))
    bg = (r - g > 60) & (b - g > 60) & (b > 110)
    out = np.zeros((*a.shape[:2], 4), np.uint8)
    out[..., :3] = a[..., :3]
    out[..., 3] = np.where(bg, 0, 255)
    return out


def strip(name, n):
    """→ (list[Canvas] cùng cỡ, neo chân) từ tools/art/nguon/<name>.png: n dáng chia đều theo chiều ngang,
    giữ nguyên vị trí trong ô để các khung không bị xê dịch."""
    a = _key(np.array(Image.open(SRC / f'{name}.png').convert('RGB')))
    ys = np.where(a[..., 3].any(axis=1))[0]
    a = a[ys[0]:ys[-1] + 1]
    w = a.shape[1] // n
    frames = []
    for i in range(n):
        cv = Canvas(w, a.shape[0])
        cv.a[:] = a[:, i * w:(i + 1) * w]
        frames.append(cv)
    return frames, foot(frames[0])


def foot(cv, rows=8):
    """Neo chân: giữa các điểm đặc ở vài hàng dưới cùng của khung đứng."""
    xs = np.where(cv.a[-rows:, :, 3].any(axis=0))[0]
    return (int(xs.mean()), cv.h - 2)


def sheet(name, drop=(), min_area=16):
    """→ list[Canvas] từ tools/art/nguon/<name>.png: dải ngang nhiều khung vuông, nền trong suốt.
    drop: các màu rác cần xoá (vd. khói xám lẫn vào); min_area: xoá cụm điểm rời nhỏ hơn số này (vệt lấm tấm)."""
    a = np.array(Image.open(SRC / f'{name}.png').convert('RGBA'))
    a[..., 3] = np.where(a[..., 3] > 0, 255, 0)
    for c in drop:
        a[(a[..., :3] == c).all(axis=2), 3] = 0
    s = a.shape[0]
    frames = []
    for i in range(a.shape[1] // s):
        cv = Canvas(s, s)
        cv.a[:] = a[:, i * s:(i + 1) * s]
        _despeckle(cv.a, min_area)
        frames.append(cv)
    return frames


def _despeckle(a, min_area):
    """Xoá cụm điểm đặc (nối 8 hướng) nhỏ hơn min_area."""
    h, w = a.shape[:2]
    seen = a[..., 3] == 0
    for y0, x0 in zip(*np.where(~seen)):
        if seen[y0, x0]:
            continue
        seen[y0, x0] = True
        todo, blob = [(y0, x0)], []
        while todo:
            y, x = todo.pop()
            blob.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and not seen[yy, xx]:
                        seen[yy, xx] = True
                        todo.append((yy, xx))
        if len(blob) < min_area:
            for y, x in blob:
                a[y, x, 3] = 0


def trim_above(frames, ref, margin=2):
    """Xoá điểm nằm cao hơn đỉnh của khung ref quá margin hàng (từng cột): giọt, vệt bắn lên trên quầng."""
    a = ref.a[..., 3] > 0
    top = np.where(a.any(axis=0), a.argmax(axis=0), ref.h) - margin
    rows = np.arange(ref.h)[:, None]
    for cv in frames:
        cv.a[rows < top, 3] = 0
    return frames


def recolor(frames, red_hue=None, hair=None):
    """Đổi bảng màu, giữ nét: red_hue (độ) thay sắc đỏ (hào quang, giáo, mắt) bằng sắc khác, giữ độ sáng/đậm;
    hair = (sắc, độ đậm, sáng thấp, sáng cao) tô lại vùng xám sáng (tóc trắng) theo dải sáng mới."""
    for cv in frames:
        a = cv.a
        rgb = a[..., :3].astype(float) / 255
        mx, mn = rgb.max(axis=2), rgb.min(axis=2)
        v, s = mx, np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
        hue = _hue(rgb, mx, mn)
        solid = a[..., 3] > 0
        out = rgb.copy()
        if red_hue is not None:
            m = solid & (s > 0.4) & ((hue > 320) | (hue < 15))
            out[m] = _hsv(np.full(m.sum(), red_hue / 360), s[m], v[m])
        if hair is not None:
            h, sat, lo, hi = hair
            m = solid & (s < 0.15) & (v >= 0.45)
            t = (v[m] - 0.45) / 0.55
            out[m] = _hsv(np.full(m.sum(), h / 360), np.full(m.sum(), sat) * (1.15 - 0.3 * t), lo + (hi - lo) * t)
        a[..., :3] = np.round(out * 255).astype(np.uint8)
    return frames


def _hue(rgb, mx, mn):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    return h * 60


def _hsv(h, s, v):
    s = np.clip(s, 0, 1)
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    table = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    out = np.zeros((len(h), 3))
    for k, (r, g, b) in enumerate(table):
        sel = i == k
        out[sel] = np.stack([r[sel], g[sel], b[sel]], axis=1)
    return out
