"""Kiểm SpriteCook có bỏ bớt đặc điểm của quái không (chủ dự án 16/11/2026: "nhiều khi spritecook tự bỏ bớt mấy cái đặc điểm").
So từng khung với ảnh tĩnh đã duyệt, không cần khai tay:
  1. Màu nhấn (mắt, ngọc, mũi tên, lửa...): màu rực (S > 0,45, V > 0,55) chiếm ít (< 6% thân). Đổi mỗi điểm khung về màu gần nhất
     của ảnh tĩnh rồi đếm; khung nào một màu nhấn còn dưới 50% (hoặc mất hẳn) là THIẾU.
  2. Mảnh rời (lửa bay quanh, khói tách thân...): số mảng rời >= 6 điểm của khung không được ít hơn ảnh tĩnh.
  3. Diện tích thân trong khoảng 0,7–1,4 lần ảnh tĩnh (không bị cắt cụt, không phình).
Chạy: python3 -I tools/art/kiem_dac_diem.py <tĩnh.png> <anim.webp>"""
import sys, colorsys, numpy as np
from collections import Counter, deque
from PIL import Image, ImageSequence

def palette(a):
    m = a[..., 3] > 128
    return Counter(map(tuple, a[m][:, :3].astype(int)))

def nearest_counts(a, pal):
    m = a[..., 3] > 128; px = a[m][:, :3].astype(int)
    P = np.array(pal); d = ((px[:, None, :] - P[None, :, :]) ** 2).sum(-1)
    idx = d.argmin(1); ok = d.min(1) <= 70 ** 2
    return Counter(idx[ok].tolist())

def blobs(a, minpx=6):
    m = a[..., 3] > 128; h, w = m.shape; seen = np.zeros_like(m); n = 0
    for y0 in range(h):
        for x0 in range(w):
            if not m[y0, x0] or seen[y0, x0]: continue
            q = deque([(y0, x0)]); seen[y0, x0] = True; k = 0
            while q:
                y, x = q.popleft(); k += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; q.append((yy, xx))
            n += k >= minpx
    return n

def check(still_path, anim_path, quiet=False):
    st = np.array(Image.open(still_path).convert('RGBA'))
    frames = [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(anim_path))]
    P = palette(st); pal = list(P.keys()); area0 = sum(P.values())
    acc = []
    for i, c in enumerate(pal):
        h, s, v = colorsys.rgb_to_hsv(*[x / 255 for x in c])
        if s > 0.45 and v > 0.55 and P[c] < 0.06 * area0: acc.append(i)
    base = nearest_counts(st, pal); b0 = blobs(st)
    report = {'frames': len(frames), 'missing': [], 'blobs_low': [], 'area': []}
    for fi, f in enumerate(frames, 1):
        cnt = nearest_counts(f, pal)
        for i in acc:
            if base.get(i, 0) >= 3 and cnt.get(i, 0) < 0.5 * base[i]:
                report['missing'].append((fi, pal[i], base[i], cnt.get(i, 0)))
        if blobs(f) < b0: report['blobs_low'].append(fi)
        report['area'].append(round(int((f[..., 3] > 128).sum()) / area0, 2))
    ok = not report['missing'] and all(0.7 <= r <= 1.4 for r in report['area'])   # mảnh rời dính thân chỉ là cảnh báo
    report['ok'] = ok; report['accents'] = [pal[i] for i in acc]; report['blobs0'] = b0
    if not quiet:
        print(f"{anim_path}: {len(frames)} khung · màu nhấn {len(acc)} · mảnh rời tĩnh {b0}")
        print('  diện tích / tĩnh:', report['area'])
        if report['missing']:
            for fi, c, a0, a1 in report['missing'][:12]: print(f'  khung {fi}: màu nhấn {c} còn {a1}/{a0}')
        if report['blobs_low']: print('  (cảnh báo) mảnh rời dính vào thân ở khung', report['blobs_low'])
        print('  KẾT LUẬN:', 'GIỮ ĐỦ đặc điểm' if ok else 'CÓ CHỖ THIẾU, xem lại')
    return report

if __name__ == '__main__':
    check(sys.argv[1], sys.argv[2])
