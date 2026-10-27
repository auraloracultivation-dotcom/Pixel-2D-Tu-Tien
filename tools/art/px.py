"""Bộ công cụ vẽ pixel bằng code: khung RGBA ở độ phân giải gốc (1×), viền tự động, xuất PNG + mục trong data/art.json."""
import hashlib, json, math, random
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'assets' / 'art'
BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])


def hx(c):
    c = c.lstrip('#')
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), 255)


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), np.uint8)

    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.a[y, x] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return tuple(self.a[y, x])
        return (0, 0, 0, 0)

    def filled(self, x, y):
        return self.get(x, y)[3] > 0

    def line(self, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = map(int, map(round, (x0, y0, x1, y1)))
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy

    def outline(self, c, diag=False):
        """Viền 1 px quanh mọi điểm đã tô (chỉ 4 hướng, trừ khi diag)."""
        a = self.a[..., 3] > 0
        ring = np.zeros_like(a)
        dirs = [(0, 1), (0, -1), (1, 0), (-1, 0)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if diag else [])
        for dy, dx in dirs:
            sh = np.zeros_like(a)
            ys = slice(max(dy, 0), self.h + min(dy, 0)); yd = slice(max(-dy, 0), self.h + min(-dy, 0))
            xs = slice(max(dx, 0), self.w + min(dx, 0)); xd = slice(max(-dx, 0), self.w + min(-dx, 0))
            sh[ys, xs] = a[yd, xd]
            ring |= sh
        self.a[ring & ~a] = c
        return self

    def paste(self, other, ox, oy):
        for y in range(other.h):
            for x in range(other.w):
                p = other.a[y, x]
                if p[3]:
                    self.px(x + ox, y + oy, tuple(p))

    def img(self):
        return Image.fromarray(self.a, 'RGBA')


MANIFEST = {}


def clean():
    """Xoá PNG cũ do chính công cụ này sinh ra (theo data/art.json) để không còn hình mồ côi."""
    old = ROOT / 'data' / 'art.json'
    if old.exists():
        for v in json.loads(old.read_text(encoding='utf-8')).get('sprites', {}).values():
            (ROOT / v['file']).unlink(missing_ok=True)


def save(sid, frames, anchor, note=''):
    """frames: list[Canvas] cùng cỡ → một tấm ngang. anchor: điểm neo (chân) tính từ góc trên trái một khung."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    w, h = frames[0].w, frames[0].h
    sheet = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f.img(), (i * w, 0))
    name = sid.replace('.', '-') + '.png'
    sheet.save(OUT_DIR / name, optimize=True)
    v = hashlib.sha1((OUT_DIR / name).read_bytes()).hexdigest()[:8]   # mã nội dung: đổi hình thì đổi đường dẫn tải
    MANIFEST[sid] = {'file': f'assets/art/{name}', 'v': v, 'w': w, 'h': h, 'frames': len(frames), 'anchor': list(anchor)}
    if note:
        MANIFEST[sid]['note'] = note


def write_manifest():
    data = {'_note': 'Sinh bằng tools/art/build.py — không sửa tay. Mỗi hình 1× (1 art px), nhiều khung xếp ngang.', 'sprites': dict(sorted(MANIFEST.items()))}
    (ROOT / 'data' / 'art.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def blob_mask(w, h, seed, fill=0.55, cells=5):
    """Mặt nạ hình đốm tròn trịa (vùng đất, bụi cây)."""
    rnd = random.Random(seed)
    pts = [(rnd.uniform(0.25, 0.75) * w, rnd.uniform(0.3, 0.7) * h, rnd.uniform(0.18, 0.3) * min(w, h) * 1.6) for _ in range(cells)]
    m = np.zeros((h, w), bool)
    for y in range(h):
        for x in range(w):
            v = sum(max(0, 1 - math.hypot((x - px_) / r, (y - py_) / (r * 0.75))) for px_, py_, r in pts)
            m[y, x] = v > fill
    return m
