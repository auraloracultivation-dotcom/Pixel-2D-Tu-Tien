"""Kiểm SpriteCook có bỏ bớt hay vẽ thêm đặc điểm của quái không (chủ dự án 16/11/2026: "nhiều khi spritecook tự bỏ bớt mấy cái đặc điểm").
So từng khung với ảnh tĩnh đã duyệt, không cần khai tay:
  1. THIẾU màu nhấn (mắt, ngọc, mũi tên, lửa...): điểm rực (S > 0,45, V > 0,55) gom theo dải màu 30°; dải nào ít (< 6% thân)
     là dải nhấn. Một khung bị tính THIẾU khi cả hai cách đếm cùng hụt dưới 50% ảnh tĩnh:
       a. đếm điểm rực trong dải đó và hai dải kề (màu sát ranh giới dải không bị tính là mất);
       b. đếm điểm có màu gần (khoảng cách < 50) một trong 4 màu nhiều nhất của dải đó ở ảnh tĩnh.
     Cần cả hai vì SpriteCook gom lại bảng màu: vàng kim nhạt đi chút (#32) làm (a) hụt mà (b) vẫn đủ; mắt tím tắt
     sáng (#18 công kích) thì cả hai cùng hụt.
  2. THÊM thứ lạ: điểm rất rực (S > 0,7, V > 0,85) của một dải màu tăng gấp đôi và thêm từ 2% thân (vd lửa mọc trên
     quái gỗ), hoặc dải màu ảnh tĩnh gần như không có mà khung có hẳn một mảng (khói xanh hoá lửa cam ở #21).
     Miệng há đỏ lúc cắn cũng bị bắt (#10): chỉ là gợi ý để em xem tận mắt.
  3. Mảnh rời (lửa bay quanh, khói tách thân...): số mảng rời >= 6 điểm của khung không được ít hơn ảnh tĩnh (chỉ cảnh báo).
  4. Diện tích thân trong khoảng 0,7–1,4 lần ảnh tĩnh (không bị cắt cụt, không phình).
Chạy: python3 -I tools/art/kiem_dac_diem.py <tĩnh.png> <anim.webp>"""
import sys, numpy as np
from collections import Counter, deque
from PIL import Image, ImageSequence


def _hsv(a):
    """Màu (RGB), dải màu 30°, độ rực S, độ sáng V của các điểm có thân."""
    c = a[a[..., 3] > 128][:, :3].astype(float); x = c / 255
    mx = x.max(1); mn = x.min(1); d = np.maximum(mx - mn, 1e-6); s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = x[:, 0], x[:, 1], x[:, 2]
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return c, (h // 30).astype(int) % 12, s, mx


def hue_bins(a, smin=0.45, vmin=0.55):
    """Số điểm rực theo 12 dải màu 30°."""
    _, b, s, v = _hsv(a)
    return np.bincount(b[(s > smin) & (v > vmin)], minlength=12)


def near(c, cols, dmax=50):
    """Số điểm có màu cách một trong các màu mẫu dưới dmax."""
    if not cols or not len(c): return 0
    d = np.linalg.norm(c[:, None, :] - np.array(cols, float)[None, :, :], axis=2).min(1)
    return int((d < dmax).sum())


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
    c0, b0, s0, v0 = _hsv(st); area0 = len(c0); viv0 = (s0 > 0.45) & (v0 > 0.55)
    base = np.bincount(b0[viv0], minlength=12); hot0 = hue_bins(st, 0.7, 0.85); bl0 = blobs(st)
    win = lambda v, i: v[(i - 1) % 12] + v[i] + v[(i + 1) % 12]   # cửa sổ 90°
    acc = [i for i in range(12) if 8 <= base[i] < 0.06 * area0]
    ref = {i: [k for k, _ in Counter(map(tuple, c0[viv0 & (b0 == i)].astype(int))).most_common(4)] for i in acc}
    ref_n = {i: near(c0, ref[i]) for i in acc}
    report = {'frames': len(frames), 'missing': [], 'extra': [], 'blobs_low': [], 'area': []}
    for fi, f in enumerate(frames, 1):
        cnt = hue_bins(f); hot = hue_bins(f, 0.7, 0.85); cf = f[f[..., 3] > 128][:, :3].astype(float)
        for i in acc:
            if win(cnt, i) < 0.5 * win(base, i) and near(cf, ref[i]) < 0.5 * ref_n[i]:
                report['missing'].append((fi, i * 30, int(win(base, i)), int(win(cnt, i))))
        for i in range(12):
            if hot[i] >= hot0[i] + max(0.02 * area0, hot0[i]): report['extra'].append((fi, i * 30, int(hot[i] - hot0[i])))
            elif win(base, i) < 4 and cnt[i] >= max(10, 0.008 * area0): report['extra'].append((fi, i * 30, int(cnt[i])))
        if blobs(f) < bl0: report['blobs_low'].append(fi)
        report['area'].append(round(int((f[..., 3] > 128).sum()) / area0, 2))
    ok = not report['missing'] and not report['extra'] and all(0.7 <= r <= 1.4 for r in report['area'])
    report['ok'] = ok; report['accent_hues'] = [i * 30 for i in acc]; report['blobs0'] = bl0
    if not quiet:
        print(f"{anim_path}: {len(frames)} khung · dải nhấn {report['accent_hues']} · mảnh rời tĩnh {bl0}")
        print('  diện tích / tĩnh:', report['area'])
        for fi, hue, a0, a1 in report['missing'][:12]: print(f'  khung {fi}: dải màu {hue}° còn {a1}/{a0}')
        for fi, hue, n in report['extra'][:12]: print(f'  khung {fi}: THÊM dải màu {hue}° ({n} điểm) mà ảnh tĩnh không có')
        if report['blobs_low']: print('  (cảnh báo) mảnh rời dính vào thân ở khung', report['blobs_low'])
        print('  KẾT LUẬN:', 'GIỮ ĐỦ đặc điểm' if ok else 'CÓ CHỖ THIẾU HOẶC THÊM, xem lại')
    return report


if __name__ == '__main__':
    check(sys.argv[1], sys.argv[2])
