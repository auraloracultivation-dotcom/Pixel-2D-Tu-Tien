"""Cửu Đầu Thôn Thiên Mãng cả con trên tinh đồ (chủ dự án 06/11/2026 14:35, ảnh GPT nguon/ai/boss/mang-dung.png 3×3 khung đứng,
mang-gam.png 3×4 khung gầm, nền trong suốt). Mỗi tấm: tách khung theo mảng lớn liền nhau, xếp theo hàng rồi cột. Căn khung theo khúc
thân cuộn dưới đáy (tâm ngang và đáy của dải 12% thấp nhất) để con rắn không trôi, không nảy giữa các khung; tấm gầm vẽ nhỏ hơn nên
nhân theo bề ngang khúc cuộn cho cùng cỡ tấm đứng. Thu về cao H điểm ảnh (tinh đồ vẽ mượt, không cần phân giải gốc).
Xuất 'boss.mang' 21 khung: 0–8 đứng, 9–20 gầm (src/render/draw-mang-sky.js, data/thien-mang.json → sky).
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from px import Canvas

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'boss'
SHEETS = [('mang-dung.png', 3), ('mang-gam.png', 3)]   # (tệp, số hàng)
H = 240


def _frames(f, rows):
    a = np.array(Image.open(SRC / f).convert('RGBA')); a[:, :, 3] = np.where(a[:, :, 3] >= 50, a[:, :, 3], 0)
    m = a[:, :, 3] > 0
    lab, n = nd.label(nd.binary_dilation(m, iterations=4))
    sz = nd.sum(m, lab, range(1, n + 1)); objs = nd.find_objects(lab)
    boxes = [(s[0].start, s[0].stop, s[1].start, s[1].stop) for i, s in enumerate(objs) if sz[i] > 5000]
    rh = a.shape[0] / rows
    boxes.sort(key=lambda b: (int(((b[0] + b[1]) / 2) // rh), b[2]))
    out = []
    for y0, y1, x0, x1 in boxes:
        c = a[y0:y1, x0:x1].copy(); c[~(lab[y0:y1, x0:x1] > 0)] = 0
        al = c[:, :, 3] > 0; ys, xs = np.nonzero(al)
        band = al[int(ys.max() - (ys.max() - ys.min()) * 0.12):ys.max() + 1]
        bx = np.nonzero(band.any(0))[0]
        out.append((c, (bx.min() + bx.max()) / 2, ys.max(), bx.max() - bx.min()))   # hình, tâm khúc cuộn, đáy, bề ngang khúc cuộn
    return out


def build(save):
    sets = [_frames(f, r) for f, r in SHEETS]
    ref = np.median([w for _, _, _, w in sets[0]])
    scaled = []
    for fr in sets:
        k = ref / np.median([w for _, _, _, w in fr])
        for c, cx, by, w in fr:
            im = Image.fromarray(c)
            if abs(k - 1) > 0.01: im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            scaled.append((im, cx * k, by * k))
    L = max(cx for _, cx, _ in scaled); R = max(im.width - cx for im, cx, _ in scaled); T = max(by for _, _, by in scaled)
    W0, H0 = int(L + R) + 4, int(T) + 4
    s = H / H0; W = round(W0 * s)
    frames = []
    for im, cx, by in scaled:
        big = Image.new('RGBA', (W0, H0)); big.alpha_composite(im, (int(round(L - cx)) + 2, int(round(T - by)) + 2))
        sm = big.resize((W, H), Image.LANCZOS)
        cv = Canvas(W, H); cv.a = np.array(sm); frames.append(cv)
    save('boss.mang', frames, (W // 2, H - 2), 'Cửu Đầu Thôn Thiên Mãng cả con (ảnh GPT): 0–8 đứng, 9–20 gầm')
    print('boss.mang', len(frames), 'khung', W, '×', H)
    return 1
