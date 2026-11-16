"""Thú cưỡi mới (chủ dự án 16/11/2026 16:50–16:58): 16 con từ bảng ảnh GPT 4×4 (tools/art/nguon/ai/thu-cuoi-moi/goc.png), mỗi con có một
ô hồng đánh dấu chỗ người ngồi; sẽ làm ba chuyển động SpriteCook "đứng nghỉ, chạy, tấn công" sau khi chủ dự án duyệt ảnh tĩnh và credit.
File này làm ảnh tĩnh đúng chuẩn pixel game (docs/02-CHUAN-PIXEL.md):
1. Tìm 16 ô hồng (mảng liền màu hồng đậm trên 2000 điểm), nới 3 điểm cho mép lem. Chỗ ngồi = giữa đáy ô (đáy ô nằm đúng mặt yên).
2. Tách từng con theo khe nền giữa các con (hàng trước, rồi cột trong hàng; hai con chạm nhau thì cắt ở cột ít điểm nhất giữa hai ô hồng).
3. Bỏ nền (ai_import.remove_bg) với ô hồng làm tường chắn, để nền không tràn qua chỗ hở vào lông trắng; rồi ô hồng thành chỗ trống cần vá.
4. Thu về cỡ điểm game với MỘT hệ số K cho cả 16 con (giữ tương quan to nhỏ như tranh): ô hồng rộng ~80 điểm tranh ≈ bề ngang người cưỡi
   ~26 điểm game (nhân vật cao 44 điểm, 1 điểm = 0,5333 đơn vị như quái, nhân vật).
5. Vá chỗ ô hồng che, ở cỡ điểm game (patch): khoảng trên yên để trống như tranh định (chỗ người ngồi), chỉ nối lại dải yên, thứ chĩa từ
   trên xuống và thứ thò vào từ hai bên; màu lấy điểm đã biết gần nhất cùng hàng / cột.
6. Gom màu, giữ mắt (cách của quai_tinh.py), viền mực.
Ra: tinh/NN.png (ảnh tĩnh), xem/NN-goc.png (ô tranh gốc còn ô hồng, thu nhỏ để so), ds.json (cỡ, chỗ ngồi [x, y] trên ảnh ra, hệ số).
Chạy: python3 -I tools/art/thu_cuoi_moi.py"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_import import remove_bg, shrink, quantize, outline
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


CAP, TOP, SIDE = 4, 4, 3   # dải yên cao tối đa CAP điểm trên đáy ô; thứ chĩa từ trên chạy tiếp TOP điểm; thò từ bên kéo vào SIDE điểm (đều thu tròn đầu)


def patch(img, hole):
    """Vá chỗ ô hồng che (ảnh cỡ game, chưa viền). Ô hồng đánh dấu chỗ người ngồi nên khoảng trên yên để trống như tranh định; chỉ nối lại:
    1. dải yên: mép trên nội suy từ hai cột sát hai bên, không cao quá đáy ô CAP điểm, chỉ ở cột mà ngay dưới chỗ vá là thân;
    2. thứ chĩa từ trên xuống (sừng, pha lê, cuống đèn), trừ mảng sát hai mép (thuộc cổ, đuôi: để luật 3): chạy tiếp TOP điểm, đầu bo tròn;
    3. thứ thò vào từ hai bên (đuôi, cánh, cổ): kéo vào tối đa SIDE điểm, đầu bo tròn, khỏi cụt thẳng đứng theo mép ô.
    Đầu chạy tiếp ngắn vì phần đó nằm sau lưng người cưỡi. Màu: chép điểm đã biết theo đúng hướng chạy tiếp (luật 2 chép từ trên xuống,
    luật 1, 3 chép theo hàng), không sinh màu mới."""
    a = img.copy(); solid = (a[..., 3] > 0) & ~hole; H, W = hole.shape
    ys, xs = np.nonzero(hole)
    if not len(ys): return a
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    body = np.zeros_like(hole); S = lambda y, x: 0 <= y < H and 0 <= x < W and solid[y, x]
    def side_top(x):   # mép trên dải yên ở cột sát bên chỗ vá: từ dưới đáy chỗ vá đi lên chừng nào còn thân, không quá CAP
        if not (S(y1 + 1, x) or S(y1, x)): return None
        y = y1 + 1 if S(y1 + 1, x) else y1
        while y - 1 >= y1 - CAP and S(y - 1, x): y -= 1
        return y
    sl, sr = side_top(x0 - 1), side_top(x1 + 1)
    sl, sr = (sl if sl is not None else sr), (sr if sr is not None else sl)
    if sl is not None:
        for x in range(x0, x1 + 1):
            if not (S(y1 + 1, x) or S(y1 + 2, x)): continue
            t = int(round(sl + (sr - sl) * (x - x0 + 1) / (x1 - x0 + 2)))
            body[t:y1 + 1, x] |= hole[t:y1 + 1, x]
    side = np.zeros_like(hole)   # 1 và 3 chép theo hàng, 2 chép từ trên xuống
    side |= body
    top = [x for x in range(x0, x1 + 1) if S(y0 - 1, x)]   # 2. thứ chĩa từ trên xuống
    for c0, c1 in _runs(top):
        if c0 <= x0 + 1 or c1 >= x1 - 1: continue
        mid, half = (c0 + c1) / 2, (c1 - c0 + 1) / 2
        for x in range(c0, c1 + 1):
            dep = int(round(TOP * (1 - (abs(x - mid) / max(half, 1)) ** 2)))
            body[y0:y0 + dep, x] |= hole[y0:y0 + dep, x]
    for xb, sgn in ((x0 - 1, 1), (x1 + 1, -1)):   # 3. thò vào từ hai bên
        for r0, r1 in _runs([y for y in range(y0, y1 + 1) if S(y, xb)]):
            mid, half = (r0 + r1) / 2, (r1 - r0 + 1) / 2
            for y in range(r0, r1 + 1):
                dep = int(round(SIDE * (1 - (abs(y - mid) / max(half, 1)) ** 2)))
                for k in range(1, dep + 1):
                    x = xb + sgn * k
                    if 0 <= x < W and hole[y, x]: body[y, x] = True; side[y, x] = True
    by, bx = np.nonzero(body)
    for y, x in zip(by, bx):   # màu: điểm thân đã biết gần nhất theo hướng chạy tiếp
        best = None
        for dy, dx in (((0, -1), (0, 1), (1, 0)) if side[y, x] else ((-1, 0),)):
            for k in range(1, max(H, W)):
                yy, xx = y + dy * k, x + dx * k
                if not (0 <= yy < H and 0 <= xx < W): break
                if solid[yy, xx]:
                    if side[y, x] and dx and a[yy, xx, :3].astype(int).sum() < 150 and S(yy, xx + dx): yy, xx = yy, xx + dx   # mép là viền mực: lấy điểm trong một nấc
                    if best is None or k < best[0]: best = (k, yy, xx)
                    break
        if best: a[y, x] = a[best[1], best[2]]
        else: body[y, x] = False
    a[hole & ~body, 3] = 0; a[body, 3] = 255
    return a


def _runs(v):
    """Các đoạn liền của dãy số tăng dần."""
    out = []
    for x in v:
        if out and x == out[-1][1] + 1: out[-1][1] = x
        else: out.append([x, x])
    return [tuple(r) for r in out]


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


def shrink_mask(m, th, h):
    """Mặt nạ cùng lưới với ai_import.shrink (cao th): điểm ra là trống nếu từ 35% ô nguồn trống."""
    k = h / th; tw = max(1, round(m.shape[1] / k)); out = np.zeros((th, tw), bool)
    for y in range(th):
        for x in range(tw):
            c = m[int(y * k):max(int(y * k) + 1, int((y + 1) * k)), int(x * k):max(int(x * k) + 1, int((x + 1) * k))]
            out[y, x] = c.size and c.mean() >= 0.35
    return out


def one(rgb, cell, box, n):
    (x0, y0, x1, y1), (bx0, by0, bx1, by1) = cell, box
    a = np.dstack([rgb[y0:y1, x0:x1], np.full((y1 - y0, x1 - x0), 255)]).astype(np.uint8)
    hole = np.zeros(a.shape[:2], bool); hole[max(0, by0 - y0):by1 - y0, max(0, bx0 - x0):bx1 - x0] = True
    a[0, 0, :3] = 252
    wall = a.copy(); wall[hole, :3] = (249, 6, 207)   # cả ô hồng lẫn mép nới tô hồng: nền không tràn qua chỗ hở vào lông trắng
    clean = remove_bg(wall, 40); clean[..., :3] = a[..., :3]
    clean[hole, 3] = 0
    clean[pockets(a, hole), 3] = 0
    clean = drop_specks(clean, 0.0015)
    clean[hole, 3] = 0
    ys, xs = np.nonzero((clean[..., 3] > 0) | hole)
    cy0, cy1, cx0, cx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    src, hm = clean[cy0:cy1, cx0:cx1], hole[cy0:cy1, cx0:cx1]
    th = max(12, round((cy1 - cy0) * K)); k = (cy1 - cy0) / th
    small = shrink(src, th); hs = shrink_mask(hm, th, cy1 - cy0)[:, :small.shape[1]]
    small = patch(small, hs)
    q = quantize(small, COLORS)
    for em in auto_masks(np.where(hm[..., None], 0, src).astype(np.uint8)): paint_small(q, src, em, th)
    q[small[..., 3] == 0, 3] = 0
    out = outline(q)
    seat = [round(((bx0 + bx1) / 2 - x0 - cx0) / k) + 1, round((by1 - 3 - y0 - cy0) / k) + 1]   # +1: viền mực
    oy, ox = np.nonzero(out[..., 3]); out = out[oy.min():oy.max() + 1, ox.min():ox.max() + 1]   # bỏ hàng trống phía trên (chỗ ô hồng nhô quá lưng)
    seat = [seat[0] - int(ox.min()), seat[1] - int(oy.min())]
    Image.fromarray(out, 'RGBA').save(D / 'tinh' / f'{n:02d}.png')
    g = np.dstack([rgb[y0:y1, x0:x1], np.full((y1 - y0, x1 - x0), 255)]).astype(np.uint8)[cy0:cy1, cx0:cx1]
    Image.fromarray(g, 'RGBA').resize((max(1, round(g.shape[1] * K)), max(1, round(g.shape[0] * K))), Image.LANCZOS).save(D / 'xem' / f'{n:02d}-goc.png')
    return {'n': n, 'ten': TEN[n - 1], 'w': int(out.shape[1]), 'h': int(out.shape[0]), 'seat': seat, 'hole': int(hs.sum())}


def main():
    rgb = np.array(Image.open(D / 'goc.png').convert('RGB')).astype(int)
    (D / 'tinh').mkdir(exist_ok=True); (D / 'xem').mkdir(exist_ok=True)
    B = boxes(rgb)
    assert len(B) == 16, f'tìm thấy {len(B)} ô hồng, cần 16'
    res = [one(rgb, c, b, i + 1) for i, (c, b) in enumerate(cells(rgb, B))]
    json.dump({'_note': 'Thú cưỡi mới (chủ dự án 16/11/2026): ảnh tĩnh ở tinh/NN.png, cỡ điểm game (1 điểm = 0,5333 đơn vị); seat: chỗ chân người cưỡi trên ảnh ra (giữa đáy ô hồng); ten: tên tả tạm; hole: số điểm phải vá.', 'k': K, 'thu': res},
              open(D / 'ds.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for r in res: print(r)


if __name__ == '__main__':
    main()
