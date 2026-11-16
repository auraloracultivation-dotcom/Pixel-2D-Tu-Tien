"""Ảnh tĩnh quái mới (bộ 60 tên cũ, ảnh GPT chủ dự án 16/11/2026) về đúng chuẩn pixel game:
bỏ mảnh vụn rời, thu về chiều cao đích theo cỡ điểm nhân vật (1 điểm = 0,5 đơn vị), gom màu, viền mực,
rồi GIỮ MẮT: điểm nào mà ô nguồn có từ 30% điểm màu mắt thì tô lại màu mắt (mắt nhỏ hay bị gom mất khi thu nhỏ).
--eye auto: tự tìm mảng nhấn nhỏ (sáng, đậm, khác hẳn màu xung quanh: mắt, ngọc) và giữ lại sau khi thu nhỏ.
--d: cạnh dài nhất đích (thay cho --h), để con dẹt như rắn, bọ không bị phóng quá to.
Chạy: python3 -I tools/art/quai_tinh.py <ô nguồn.png> <ra.png> (--h 38 | --d 48) --eye yellow|red|auto|none [--colors 20]"""
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

def hue_sv(rgb):
    mx = rgb.max(2); mn = rgb.min(2); d = np.maximum(mx - mn, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return hue, np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0), mx

def auto_masks(a):
    """Điểm nhấn: đậm (S>=0,45) và sáng (V>=0,55) — mắt, ngọc, đốm lửa —, tách theo dải màu 30° để mắt xanh không dính vào vỏ cây vàng."""
    al = a[:, :, 3] > 100; hue, s, v = hue_sv(a[:, :, :3].astype(float) / 255)
    acc = al & (s >= 0.45) & (v >= 0.55)
    return [acc & (hue >= b0) & (hue < b0 + 30) for b0 in range(0, 360, 30)]

def grow(m, r):
    out = m.copy()
    for _ in range(r):
        g = out.copy(); g[1:] |= out[:-1]; g[:-1] |= out[1:]; g[:, 1:] |= out[:, :-1]; g[:, :-1] |= out[:, 1:]; out = g
    return out

def blobs(m):
    """Các mảng liền của mặt nạ (4 hướng), mỗi mảng là danh sách (y, x)."""
    from collections import deque
    seen = np.zeros_like(m); out = []
    for y0, x0 in zip(*np.nonzero(m)):
        if seen[y0, x0]: continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for yy, xx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True; q.append((yy, xx))
        out.append(pts)
    return out

def paint(q, a, em, th_in):
    """Tô lại màu nhấn: điểm ra nào có từ 30% điểm nhấn thì tô; mỗi mảng nhấn đủ lớn (mắt) chắc chắn còn ít nhất 1 điểm."""
    h, w = a.shape[:2]; k = h / th_in; tw = q.shape[1]; cols = a[em][:, :3]
    if not len(cols): return
    vv = cols.max(1); col = cols[vv >= np.percentile(vv, 60)].mean(0).astype(np.uint8)   # 40% sáng nhất
    for y in range(th_in):
        for x in range(tw):
            blk = em[int(y*k):max(int(y*k)+1, int((y+1)*k)), int(x*k):max(int(x*k)+1, int((x+1)*k))]
            if blk.size and blk.mean() >= 0.3 and q[y, x, 3]:
                q[y, x, :3] = col
    for pts in blobs(em):
        if len(pts) < 0.4 * k * k: continue
        cnt = {}
        for y, x in pts:
            c = (min(th_in - 1, int(y / k)), min(tw - 1, int(x / k))); cnt[c] = cnt.get(c, 0) + 1
        (y, x), _ = max(cnt.items(), key=lambda t: t[1])
        if q[y, x, 3]: q[y, x, :3] = col

def paint_small(q, a, em, th_in, eye=16.0, big=48.0):
    """Chế độ auto, từng mảng nhấn khác hẳn màu xung quanh (từ nửa vòng quanh nó lệch >= 80):
    mảng cỡ mắt (0,4–16 điểm ra) tô lại bằng màu sáng của chính nó, chắc chắn còn ít nhất 1 điểm;
    mảng vừa (đến 48 điểm ra, mắt to của boss, ngọc) chỉ tô lại chỗ gom màu làm lệch hẳn màu.
    Mảng to (sừng, mũi tên, khăn) và đốm lửa giữa lửa thì để nguyên."""
    h, w = a.shape[:2]; k = h / th_in; tw = q.shape[1]; al = a[:, :, 3] > 100
    for pts in blobs(em):
        if not (0.4 * k * k <= len(pts) <= big * k * k): continue
        ys, xs = np.array(pts).T; bm = np.zeros(em.shape, bool); bm[ys, xs] = True
        ring = grow(bm, max(2, round(k))) & ~bm & al
        if not ring.any(): continue
        c = a[ys, xs, :3].astype(float); vv = c.max(1)
        small = len(pts) <= eye * k * k
        col = c[vv >= np.percentile(vv, 60)].mean(0) if small else c.mean(0)
        if (np.linalg.norm(a[ring][:, :3].astype(float) - col, axis=1) >= 80).mean() < 0.5: continue
        cnt = {}
        for y, x in pts:
            key = (min(th_in - 1, int(y / k)), min(tw - 1, int(x / k)))
            if q[key[0], key[1], 3]: cnt[key] = cnt.get(key, 0) + 1
        if not cnt: continue
        best = max(cnt.values())
        for (y, x), n in cnt.items():
            if small and (n == best or n >= 0.3 * k * k):
                q[y, x, :3] = col.astype(np.uint8)
            elif not small and n >= 0.5 * k * k and np.linalg.norm(q[y, x, :3].astype(float) - col) >= 60:
                q[y, x, :3] = col.astype(np.uint8)

def convert(src, dst, th=0, eye='none', colors=20, region=None, d=0):
    a = np.array(Image.open(src).convert('RGBA'))
    a = crop(drop_specks(remove_bg(a, 40)))
    if d:   # cạnh dài nhất = d
        h0, w0 = a.shape[:2]; th = d if h0 >= w0 else max(12, round(d * h0 / w0))
    th_in = th - 2
    small = shrink(a, th_in)
    q = quantize(small, colors)
    if eye == 'auto':
        for em in auto_masks(a): paint_small(q, a, em, th_in)
    elif eye != 'none':
        em = eye_mask(a, eye)
        if region:   # chỉ giữ mắt trong vùng mặt (tỉ lệ x0,y0,x1,y1 của ảnh đã cắt)
            H, W = em.shape; x0, y0, x1, y1 = region
            rm = np.zeros_like(em); rm[int(y0*H):int(y1*H), int(x0*W):int(x1*W)] = True; em &= rm
        paint(q, a, em, th_in)
    out = outline(q)
    Image.fromarray(out, 'RGBA').save(dst)
    return out.shape[1], out.shape[0]

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('src'); p.add_argument('dst'); p.add_argument('--h', type=int, default=0)
    p.add_argument('--d', type=int, default=0, help='cạnh dài nhất đích')
    p.add_argument('--eye', default='none'); p.add_argument('--colors', type=int, default=20)
    p.add_argument('--region', default=None, help='x0,y0,x1,y1 tỉ lệ vùng mặt')
    a = p.parse_args()
    reg = tuple(map(float, a.region.split(','))) if a.region else None
    if not (a.h or a.d): p.error('cần --h hoặc --d')
    print(convert(a.src, a.dst, a.h, a.eye, a.colors, reg, a.d))
