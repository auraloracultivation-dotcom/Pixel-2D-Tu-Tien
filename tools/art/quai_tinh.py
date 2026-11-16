"""Ảnh tĩnh quái mới (bộ 60 tên cũ, ảnh GPT chủ dự án 16/11/2026) về đúng chuẩn pixel game:
bỏ mảnh vụn rời, thu về chiều cao đích theo cỡ điểm nhân vật (1 điểm = 0,5 đơn vị), gom màu, viền mực,
rồi GIỮ MẮT: điểm nào mà ô nguồn có từ 30% điểm màu mắt thì tô lại màu mắt (mắt nhỏ hay bị gom mất khi thu nhỏ).
Chạy: python3 -I tools/art/quai_tinh.py <ô nguồn.png> <ra.png> --h 38 --eye yellow|red|none [--colors 20]"""
import argparse, colorsys, sys
import numpy as np
from PIL import Image
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from ai_import import remove_bg, crop, shrink, quantize, outline

EYES = {   # (khoảng màu hue độ, S tối thiểu, V tối thiểu)
    'yellow': [((28, 68), 0.55, 0.70)],
    'red': [((0, 14), 0.55, 0.55), ((340, 360), 0.55, 0.55)],
    'cyan': [((170, 205), 0.45, 0.70)],
    'green': [((70, 150), 0.45, 0.65)],
    'purple': [((265, 300), 0.45, 0.70)],
    'pink': [((300, 340), 0.45, 0.75)],
}

def drop_specks(a, frac=0.004):
    """Bỏ các mảng rời quá nhỏ (vụn của ô bên cạnh, hạt lem)."""
    from collections import deque
    m = a[:, :, 3] > 100
    h, w = m.shape; seen = np.zeros_like(m); keep = np.zeros_like(m); total = m.sum()
    for y0 in range(h):
        for x0 in range(w):
            if not m[y0, x0] or seen[y0, x0]: continue
            q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
            while q:
                y, x = q.popleft(); pts.append((y, x))
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    yy, xx = y+dy, x+dx
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; q.append((yy, xx))
            if len(pts) >= total * frac:
                for y, x in pts: keep[y, x] = True
    out = a.copy(); out[~keep, 3] = 0
    return out

def eye_mask(a, kind):
    rgb = a[:, :, :3].astype(float) / 255; al = a[:, :, 3] > 100
    mx = rgb.max(2); mn = rgb.min(2); v = mx; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    m = np.zeros(al.shape, bool)
    for (h0, h1), smin, vmin in EYES[kind]:
        m |= (hue >= h0) & (hue <= h1) & (s >= smin) & (v >= vmin)
    return m & al

def convert(src, dst, th, eye='none', colors=20, region=None):
    a = np.array(Image.open(src).convert('RGBA'))
    a = crop(drop_specks(remove_bg(a, 40)))
    th_in = th - 2
    small = shrink(a, th_in)
    q = quantize(small, colors)
    if eye != 'none':
        em = eye_mask(a, eye)
        if region:   # chỉ giữ mắt trong vùng mặt (tỉ lệ x0,y0,x1,y1 của ảnh đã cắt)
            H, W = em.shape; x0, y0, x1, y1 = region
            rm = np.zeros_like(em); rm[int(y0*H):int(y1*H), int(x0*W):int(x1*W)] = True; em &= rm
        h, w = a.shape[:2]; k = h / th_in; tw = q.shape[1]
        cols = a[em][:, :3]
        if len(cols):
            # màu mắt: lấy điểm sáng nhất 40% để mắt rực như tranh gốc
            vv = cols.max(1); col = cols[vv >= np.percentile(vv, 60)].mean(0).astype(np.uint8)
            for y in range(th_in):
                for x in range(tw):
                    blk = em[int(y*k):max(int(y*k)+1, int((y+1)*k)), int(x*k):max(int(x*k)+1, int((x+1)*k))]
                    if blk.size and blk.mean() >= 0.3 and q[y, x, 3]:
                        q[y, x, :3] = col
    out = outline(q)
    Image.fromarray(out, 'RGBA').save(dst)
    return out.shape[1], out.shape[0]

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('src'); p.add_argument('dst'); p.add_argument('--h', type=int, required=True)
    p.add_argument('--eye', default='none'); p.add_argument('--colors', type=int, default=20)
    p.add_argument('--region', default=None, help='x0,y0,x1,y1 tỉ lệ vùng mặt')
    a = p.parse_args()
    reg = tuple(map(float, a.region.split(','))) if a.region else None
    print(convert(a.src, a.dst, a.h, a.eye, a.colors, reg))
