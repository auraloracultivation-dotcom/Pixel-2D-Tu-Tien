"""Nhân vật chính dùng tạm từ ảnh chủ dự án gửi (tools/art/nguon/), không vẽ bằng code.
Dải ngang nền hồng tím: tách nền, chia đều thành từng khung."""
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
