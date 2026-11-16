"""Thú cưỡi mới (chủ dự án 16/11/2026 16:50–16:58): 16 con từ bảng ảnh GPT 4×4 (tools/art/nguon/ai/thu-cuoi-moi/goc.png), mỗi con có một
ô hồng đánh dấu chỗ người ngồi; sẽ làm ba chuyển động SpriteCook "đứng nghỉ, chạy, tấn công" sau khi chủ dự án duyệt ảnh tĩnh và credit.
File này làm ảnh tĩnh đúng chuẩn pixel game (docs/02-CHUAN-PIXEL.md):
1. Mặt nạ hồng = ĐÚNG những điểm màu hồng của 16 mảng hồng lớn (mảng liền trên 2000 điểm), cộng mép lem hồng với nền trắng sát mảng đó.
   Không lấy theo khung chữ nhật: yên, khoen vàng, tai, pha lê vẽ đè lên mảng hồng phải giữ nguyên (chủ dự án 16/11/2026 17:18: "chỉ cần
   xoá màu hồng là được, có phải nền hồng nào cũng hình vuông đâu"; bản trước cắt theo khung, ăn vào yên). Mép lem hồng với viền mực trả về màu mực.
2. Tách từng con theo khe nền giữa các con (hàng trước, rồi cột trong hàng; hai con chạm nhau thì cắt ở cột ít điểm nhất giữa hai mảng hồng).
3. Bỏ nền (ai_import.remove_bg) với mảng hồng làm tường chắn (nền không tràn qua chỗ hồng vào lông trắng); rồi điểm hồng thành trong suốt
   (chỗ người ngồi, không vẽ thêm gì), gỡ túi nền trắng kẹt giữa mảng hồng và thân.
4. Thu về cỡ điểm game với MỘT hệ số K cho cả 16 con (giữ tương quan to nhỏ như tranh): mảng hồng rộng ~80 điểm tranh ≈ bề ngang người cưỡi
   ~26 điểm game (nhân vật cao 44 điểm, 1 điểm = 0,5333 đơn vị như quái, nhân vật). Gom màu, giữ mắt (cách của quai_tinh.py), viền mực.
5. Chỗ ngồi: giữa mảng hồng theo bề ngang; độ cao = đáy mảng hồng ở khúc giữa (ngay trên mặt yên).
Ra: tinh/NN.png (ảnh tĩnh), xem/NN-goc.png (ô tranh gốc còn ô hồng, thu nhỏ để so), ds.json (cỡ, chỗ ngồi [x, y] trên ảnh ra, hệ số).
Chạy: python3 -I tools/art/thu_cuoi_moi.py"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_import import remove_bg, shrink, quantize, outline, INK
from quai_tinh import drop_specks, auto_masks, paint_small

D = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'thu-cuoi-moi'
K = 0.33          # hệ số thu chung (điểm game / điểm tranh)
COLORS = 24       # thú cưỡi nhiều chi tiết (yên, đèn, chuông) hơn quái: 24 màu
TEN = ['Cửu vĩ hồ trắng', 'Rùa non bộ', 'Sư thứu trắng', 'Hươu sao đêm', 'Hỏa long dung nham', 'Rùa nấm đỏ', 'Mèo cơ quan', 'Cá voi mây',
       'Cóc sen', 'Hổ pha lê', 'Phượng hoàng lửa', 'Sứa đèn lồng', 'Sư tử đá rêu', 'Bạch tuộc đèn lồng', 'Hươu mây', 'Nhện pha lê']   # tên tả tạm


def boxes(rgb):
    from scipy import ndimage
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    m = (r > 200) & (g < 60) & (b > 170)
    lab, n = ndimage.label(m)
    out = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) > 2000: out.append([int(xs.min()) - 3, int(ys.min()) - 3, int(xs.max()) + 4, int(ys.max()) + 4])
    return out


def runs0(p, lo, hi):
    """Các khúc cột / hàng không có hình trong [lo, hi)."""
    out, s = [], None
    for i in range(lo, hi):
        if p[i] == 0 and s is None: s = i
        if p[i] != 0 and s is not None: out.append((s, i)); s = None
    if s is not None: out.append((s, hi))
    return out


def cells(rgb, B):
    """Khung từng con: chia hàng theo khe nền ngang, trong hàng chia cột giữa hai ô hồng liền nhau."""
    nb = (np.abs(rgb - 252).sum(2) > 45)
    H, W = nb.shape
    rows = sorted(B, key=lambda b: b[1])
    bands, cur = [], [rows[0]]
    for b in rows[1:]:
        if b[1] - cur[-1][1] > 120: bands.append(cur); cur = [b]
        else: cur.append(b)
    bands.append(cur)
    rp = nb.sum(1); edges = [0]
    for i in range(len(bands) - 1):
        lo, hi = max(b[3] for b in bands[i]), min(b[1] for b in bands[i + 1])
        lo = max(lo, max(b[3] for b in bands[i]) + 60)   # khe phải nằm dưới chân hàng trên
        gs = [g for g in runs0(rp, lo, H) if g[0] < hi + 200]
        edges.append((gs[0][0] + gs[0][1]) // 2 if gs else (lo + hi) // 2)
    edges.append(H)
    out = []
    for i, band in enumerate(bands):
        y0, y1 = edges[i], edges[i + 1]
        cp = nb[y0:y1].sum(0); band = sorted(band, key=lambda b: b[0]); cut = [0]
        for a, c in zip(band, band[1:]):
            ca, cc = (a[0] + a[2]) // 2, (c[0] + c[2]) // 2
            gs = [g for g in runs0(cp, ca, cc) if g[1] - g[0] >= 2]
            cut.append((max(gs, key=lambda g: g[1] - g[0])[0] + max(gs, key=lambda g: g[1] - g[0])[1]) // 2 if gs else ca + int(np.argmin(cp[ca:cc])))
        cut.append(W)
        for j, b in enumerate(band): out.append(((cut[j], y0, cut[j + 1], y1), b))
    return out


def pockets(a, hole, tol=15, near=16):
    """Túi nền bị ô hồng chắn lại (kẹp giữa ô và thân, nền tràn từ ngoài không tới): loang từ mép ô qua điểm đúng màu nền (xám trắng,
    không tối hơn 252 − tol − 1, không ngả màu), chỉ trong near điểm quanh ô. Lông trắng có ngả xanh / hồng và có viền nên không bị ăn."""
    from collections import deque
    rgb = a[..., :3].astype(int); H, W = hole.shape
    bgish = (rgb.min(2) >= 252 - tol - 1) & (rgb.max(2) - rgb.min(2) <= 8)   # nền ô cờ xám trắng 236–255, không ngả màu
    ys, xs = np.nonzero(hole); y0, y1, x0, x1 = ys.min() - near, ys.max() + near, xs.min() - near, xs.max() + near
    seen = np.zeros_like(hole); q = deque()
    for y, x in zip(*np.nonzero(hole)):
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < H and 0 <= xx < W and not hole[yy, xx] and bgish[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; q.append((yy, xx))
    while q:
        y, x = q.popleft()
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if y0 <= yy <= y1 and x0 <= xx <= x1 and 0 <= yy < H and 0 <= xx < W and not hole[yy, xx] and bgish[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True; q.append((yy, xx))
    return seen


PINK = np.array([249, 6, 207])


def seg(rgb, q):
    """Điểm có phải màu trộn giữa hồng và màu q không: trả (t: tỉ lệ q, d: lệch khỏi đoạn hồng–q)."""
    v = np.array(q, float) - PINK; c = rgb.astype(float) - PINK
    t = np.clip((c @ v) / (v @ v), 0, 1); d = np.linalg.norm(c - t[..., None] * v, axis=-1)
    return t, d


def pink_masks(rgb):
    """big: điểm hồng của các mảng hồng lớn; bg: mép lem hồng–trắng sát mảng (thành nền); ink: mép lem hồng–mực sát mảng (thành màu mực)."""
    from scipy import ndimage
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    core = (r > 200) & (g < 60) & (b > 170)
    lab, n = ndimage.label(core); sizes = ndimage.sum(core, lab, range(1, n + 1))
    big = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 2000])
    near = ndimage.binary_dilation(big, iterations=3) & ~big
    tw, dw = seg(rgb, (252, 252, 252)); tk, dk = seg(rgb, INK[:3])
    bg = near & (dw < 34) & (tw < 0.92)
    ink = near & ~bg & (dk < 40) & (tk > 0.25)
    return big, bg, ink, lab


def one(rgb, cell, n, big, bgm, ink):
    x0, y0, x1, y1 = cell
    a = np.dstack([rgb[y0:y1, x0:x1], np.full((y1 - y0, x1 - x0), 255)]).astype(np.uint8)
    pm, bm = big[y0:y1, x0:x1], bgm[y0:y1, x0:x1]
    a[ink[y0:y1, x0:x1], :3] = INK[:3]   # mép lem hồng–mực: về màu mực
    a[0, 0, :3] = 252
    wall = a.copy(); wall[pm | bm, :3] = PINK   # điểm hồng chặn nền tràn vào lông trắng
    clean = remove_bg(wall, 40); clean[..., :3] = a[..., :3]
    gone = pm | bm
    clean[gone, 3] = 0
    clean[pockets(a, gone), 3] = 0
    clean = drop_specks(clean, 0.0015)
    ys, xs = np.nonzero(clean[..., 3] > 0)
    cy0, cy1, cx0, cx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    src = clean[cy0:cy1, cx0:cx1]
    th = max(12, round((cy1 - cy0) * K)); k = (cy1 - cy0) / th
    q = quantize(shrink(src, th), COLORS)
    for em in auto_masks(src): paint_small(q, src, em, th)
    out = outline(q)
    py, px = np.nonzero(pm); mx0, mx1 = px.min(), px.max(); cxm = (mx0 + mx1) / 2; half = (mx1 - mx0) * 0.2
    bottoms = [py[px == c].max() for c in range(int(cxm - half), int(cxm + half) + 1) if (px == c).any()]
    sy = float(np.median(bottoms)) + 1   # mặt yên ngay dưới đáy mảng hồng
    seat = [round((cxm - cx0) / k) + 1, round((sy - cy0) / k) + 1]   # +1: viền mực
    oy, ox = np.nonzero(out[..., 3]); out = out[oy.min():oy.max() + 1, ox.min():ox.max() + 1]
    seat = [seat[0] - int(ox.min()), seat[1] - int(oy.min())]
    Image.fromarray(out, 'RGBA').save(D / 'tinh' / f'{n:02d}.png')
    g = np.dstack([rgb[y0:y1, x0:x1], np.full((y1 - y0, x1 - x0), 255)]).astype(np.uint8)
    gy, gx = np.nonzero(np.abs(rgb[y0:y1, x0:x1] - 252).sum(2) > 45); g = g[gy.min():gy.max() + 1, gx.min():gx.max() + 1]
    Image.fromarray(g, 'RGBA').resize((max(1, round(g.shape[1] * K)), max(1, round(g.shape[0] * K))), Image.LANCZOS).save(D / 'xem' / f'{n:02d}-goc.png')
    return {'n': n, 'ten': TEN[n - 1], 'w': int(out.shape[1]), 'h': int(out.shape[0]), 'seat': seat, 'hong': int(pm.sum() + bm.sum())}


def main():
    rgb = np.array(Image.open(D / 'goc.png').convert('RGB')).astype(int)
    (D / 'tinh').mkdir(exist_ok=True); (D / 'xem').mkdir(exist_ok=True)
    big, bgm, ink, _ = pink_masks(rgb)
    B = boxes(rgb)
    assert len(B) == 16, f'tìm thấy {len(B)} mảng hồng, cần 16'
    res = [one(rgb, c, i + 1, big, bgm, ink) for i, (c, b) in enumerate(cells(rgb, B))]
    json.dump({'_note': 'Thú cưỡi mới (chủ dự án 16/11/2026): ảnh tĩnh ở tinh/NN.png, cỡ điểm game (1 điểm = 0,5333 đơn vị); chỉ xoá đúng điểm hồng (17:18); seat: chỗ chân người cưỡi trên ảnh ra (giữa mảng hồng, ngay trên mặt yên); ten: tên tả tạm; hong: số điểm hồng đã xoá (cỡ tranh).', 'k': K, 'thu': res},
              open(D / 'ds.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for r in res: print(r)


if __name__ == '__main__':
    main()
