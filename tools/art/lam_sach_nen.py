"""Bỏ vết màu nền (matte) SpriteCook còn sót trong chuyển động.
Điểm giống màu nền sát chỗ trống thì xoá; nằm trong thân thì lấy màu hàng xóm nhiều nhất.
Quái có sẵn màu cùng họ với màu nền (lá xanh khi nền #00ff00) thì chỉ bắt điểm rất gần màu nền, không đụng màu của quái.
Chạy: python3 -I tools/art/lam_sach_nen.py <vào.webp> <ra.webp> [--matte '#00ff00'] [--still <ảnh tĩnh.png>]"""
import argparse
import numpy as np
from collections import Counter
from PIL import Image, ImageSequence


def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)])


def broad(a, m):
    """Cùng họ màu nền: kênh nào nền bật (255) thì cao hơn hẳn kênh nền tắt (0)."""
    c = a[..., :3].astype(int); on = [i for i in range(3) if m[i] > 127]; off = [i for i in range(3) if m[i] <= 127]
    ok = a[..., 3] > 0
    for i in on:
        for j in off: ok &= c[..., i] > c[..., j] + 50
    return ok


def strict(a, m):
    return (a[..., 3] > 0) & (np.linalg.norm(a[..., :3].astype(int) - m, axis=2) < 90)


def clean(fr, m, rule):
    a = np.array(fr.convert('RGBA')); mk = rule(a, m); n = int(mk.sum()); h, w = mk.shape
    for y, x in zip(*np.nonzero(mk)):
        nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < h and 0 <= x + dx < w]
        if any(a[yy, xx, 3] == 0 for yy, xx in nb): a[y, x] = (0, 0, 0, 0); continue
        cols = [tuple(a[yy, xx]) for yy, xx in nb if not mk[yy, xx] and a[yy, xx, 3] > 0]
        a[y, x] = Counter(cols).most_common(1)[0][0] if cols else (0, 0, 0, 0)
    return Image.fromarray(a, 'RGBA'), n


def run(src, dst, matte='#00ff00', still=None):
    m = hexrgb(matte); rule = broad
    if still is not None:
        s = np.array(Image.open(still).convert('RGBA'))
        if broad(s, m).sum() > 0.005 * (s[..., 3] > 0).sum(): rule = strict   # quái có màu cùng họ nền
    out, tot = [], 0
    for f in ImageSequence.Iterator(Image.open(src)):
        o, n = clean(f.copy(), m, rule); out.append(o); tot += n
    out[0].save(dst, 'WEBP', save_all=True, append_images=out[1:], duration=125, loop=0, lossless=True)
    return tot, rule.__name__


if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('src'); p.add_argument('dst')
    p.add_argument('--matte', default='#00ff00'); p.add_argument('--still', default=None)
    a = p.parse_args(); n, r = run(a.src, a.dst, a.matte, a.still)
    print(a.src.split('/')[-1], f'điểm màu nền đã xử lý: {n} ({r})')
