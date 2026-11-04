"""Bộ khung hoa đào từ ảnh GPT (chủ dự án 04/11/2026 10:05, 10:16, 10:23; nguon/ai/ui/hoa-dao-1.png … hoa-dao-4.png).
Ảnh nền trong suốt nhưng còn quầng mờ (độ mờ thấp) quanh hình: bỏ điểm alpha dưới 64, giữ nguyên độ mờ mép còn lại; cắt từng món theo khung
đo trên ảnh (toạ độ ảnh gốc 1536×1024), giữ nguyên độ phân giải (chỉ cắt và ghép, chủ dự án 02/11/2026 22:51).
Món nào lắp vào đâu (style-ui-hoa-dao.css; tên hình ui-hd-<khoá> theo bảng B1–B4 bên dưới):
- chân dung theo Linh căn: mộc hoa đào, kim vàng kim cương, thủy vòng sóng, hỏa vòng lửa, thổ vòng mây vàng (ảnh 2); lòng tròn khoét
  trong suốt, tâm / bán kính lòng ghi vào data/art.json → hole (src/ui/hud-ava.js đọc);
- thanh Sinh lực / linh khí: ruột đỏ, lam, khung rỗng (ảnh 3); nút tròn trên màn hình: vòng hoa đào lòng tím; vòng chiêu, Lướt
  (khoét lòng), nút Đánh (ảnh 2); bản đồ tròn: vòng hoa đào lòng trống (ảnh 3);
- bảng: khung mái ngói hoa đào đèn lồng (bang); cột mục bên trái: cuộn giấy (cuon); ô mục tím / đang chọn vàng (o, vang-nho);
- hộp thoại NPC: khung góc mây (thoai), bảng tên (ten), nút lựa chọn (chon); tab tím / vàng (tab, tab-on);
- màn đăng nhập: bảng tên game mái chùa hoa đào (tieu-de), khung trăng mây (trang), nút vàng / tím (vang, tim), ô nhập (o-nhap),
  ô ghi chú góc mây (may); nút biểu tượng vuông: đóng (i-dong), lui / tới (i-lui, i-toi), ! (i-than)…
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas, MANIFEST
from ui_kit import _main

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui'


def _load(k):
    a = np.array(Image.open(SRC / f'hoa-dao-{k}.png').convert('RGBA'))
    a[:, :, 3] = np.where(a[:, :, 3] >= 64, a[:, :, 3], 0)   # bỏ quầng mờ nhạt, giữ mép mềm của ảnh gốc (chủ dự án 04/11/2026 10:39: cắt cứng thì mép vỡ)
    return a


def _cut(a, box):
    x0, y0, x1, y1 = box
    return _main(np.ascontiguousarray(a[y0:y1, x0:x1]))


def _hole(c, grow=1.0):
    """Lòng tròn tím của vòng: loang từ tâm theo dải màu chuyển dần (điểm kề lệch màu ít), dừng ở mép vòng (đổi màu gắt);
    lòng đã trong suốt thì loang qua điểm trong suốt. Khớp hình tròn cùng diện tích rồi khoét. Trả (hình, tâm x, tâm y, bán kính)."""
    h, w = c.shape[:2]; rgb = c[:, :, :3].astype(int); al = c[:, :, 3] > 0
    y0, x0 = h // 2, w // 2
    clear = not al[y0, x0]
    seen = np.zeros((h, w), bool); seen[y0, x0] = True; q = deque([(y0, x0)])
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if not (0 <= ny < h and 0 <= nx < w) or seen[ny, nx]: continue
            if clear: ok = not al[ny, nx]
            else: ok = al[ny, nx] and np.abs(rgb[ny, nx] - rgb[y, x]).sum() < 24 and rgb[ny, nx].sum() < 420
            if ok: seen[ny, nx] = True; q.append((ny, nx))
    ys, xs = np.nonzero(seen)
    cy, cx, r = ys.mean(), xs.mean(), (seen.sum() / np.pi) ** 0.5 * grow
    yy, xx = np.mgrid[0:h, 0:w]; c = c.copy()
    c[((yy - cy) ** 2 + (xx - cx) ** 2 < r * r) | seen, 3] = 0
    return c, cx, cy, r


def _plate(ring, plate):
    """Ghép bảng cấp (Lv) vào giữa mép dưới vòng."""
    rh, rw = ring.shape[:2]; ph, pw = plate.shape[:2]
    W = max(rw, pw); H = rh + ph // 2
    out = np.zeros((H, W, 4), np.uint8)
    ox = (W - rw) // 2; out[:rh, ox:ox + rw] = ring
    px, py = (W - pw) // 2, H - ph
    m = plate[:, :, 3] > 0; out[py:py + ph, px:px + pw][m] = plate[m]
    return out, ox


# khung đo trên ảnh (x0, y0, x1, y1); B<k> = ảnh hoa-dao-<k>.png
B2 = {
    'ava-moc': (15, 4, 221, 212), 'ava-kim': (237, 6, 423, 212), 'lv': (422, 780, 498, 824),
    'ava-hoa': (293, 881, 418, 1010), 'ava-thuy': (581, 881, 706, 1008), 'ava-tho': (435, 883, 565, 1010),
    'vong-hoa': (721, 880, 856, 1010), 'ring': (4, 884, 130, 1008), 'ring-lam': (141, 876, 282, 1017), 'atk': (1316, 811, 1532, 1020),
}
B3 = {
    'bang': (9, 2, 395, 415), 'trang': (752, 8, 1061, 338), 'tieu-de': (428, 358, 800, 496), 'thoai': (93, 430, 405, 631),
    'cuon': (650, 509, 832, 741), 'viec': (837, 357, 1180, 424), 'ten': (1200, 364, 1366, 433),
    'bar-do': (261, 734, 471, 773), 'bar-lam': (261, 784, 472, 823), 'bar-rong': (260, 835, 473, 873),
    'thong-bao': (397, 900, 997, 1008),
    'i-lui': (17, 458, 80, 517), 'i-toi': (17, 527, 80, 585), 'i-dong': (18, 595, 80, 652), 'i-ok': (17, 661, 80, 720),
    'i-cai-dat': (23, 729, 78, 783), 'i-hoi': (24, 790, 77, 841), 'i-than': (24, 848, 77, 899), 'i-tin': (24, 907, 77, 961),
}
B4 = {
    'khung': (15, 43, 362, 435), 'mai': (382, 12, 778, 290), 'trang2': (794, 23, 1152, 288), 'hop': (384, 289, 707, 437),
    'may': (727, 316, 1128, 431), 'o-nhap': (1151, 380, 1415, 434), 'vang': (15, 462, 360, 534), 'tim': (381, 461, 691, 531),
    'vang-nho': (912, 453, 1127, 512), 'tim-nho': (712, 453, 891, 527), 'tab': (913, 591, 1056, 634), 'tab-on': (1073, 589, 1215, 631),
    'o': (384, 544, 692, 610), 'chon': (15, 638, 347, 725), 'chat': (243, 745, 602, 852), 'nhap': (1151, 515, 1415, 568),
}

B5 = {   # ảnh 5 (chủ dự án 04/11/2026 10:46): nền khung đăng nhập, chơi tiếp, nút
    'dn-khung': (10, 26, 399, 444), 'dn-tiep': (400, 9, 805, 292), 'dn-vang': (12, 458, 393, 539), 'dn-tim': (10, 542, 395, 624),
    'dn-o': (1150, 318, 1423, 376), 'dn-may': (747, 318, 1132, 441),
}


def build(save):
    a2, a3, a4 = _load(2), _load(3), _load(4)
    n = 0
    holes = {}

    def put(sid, arr, note):
        nonlocal n
        c = Canvas(arr.shape[1], arr.shape[0]); c.a = np.ascontiguousarray(arr, dtype=np.uint8)
        save(sid, [c], (c.w // 2, c.h // 2), note + ' (ảnh GPT bộ hoa đào)'); n += 1

    lv = _cut(a2, B2['lv'])
    for k in ('moc', 'kim', 'hoa', 'thuy', 'tho'):
        ring, cx, cy, r = _hole(_cut(a2, B2['ava-' + k]), 1.02)
        if k in ('hoa', 'thuy', 'tho'):
            ring, ox = _plate(ring, lv); cx += ox
        holes[k] = [round(float(cx) / ring.shape[1], 3), round(float(cy) / ring.shape[0], 3), round(float(r) / ring.shape[1], 3), round(ring.shape[0] / ring.shape[1], 3)]
        put('ui.hd-ava-' + k, ring, 'khung chân dung hệ ' + k)
        MANIFEST['ui.hd-ava-' + k]['hole'] = holes[k]   # [tâm x / rộng, tâm y / cao, bán kính / rộng, cao / rộng] cho src/ui/hud-ava.js
    put('ui.hd-vong-hoa', _cut(a2, B2['vong-hoa']), 'vòng hoa đào lòng tím (nút tròn)')
    put('ui.hd-ring', _hole(_cut(a2, B2['ring']), 1.0)[0], 'vòng chiêu khoét lòng')
    vb, cx, cy, r = _hole(_cut(a3, (493, 732, 630, 893)), 1.0)
    put('ui.hd-vong-ban-do', vb, 'vòng hoa đào lòng trống (khung bản đồ tròn)')
    MANIFEST['ui.hd-vong-ban-do']['hole'] = [round(float(cx) / vb.shape[1], 3), round(float(cy) / vb.shape[0], 3), round(float(r) / vb.shape[1], 3), round(vb.shape[0] / vb.shape[1], 3)]
    put('ui.hd-ring-lam', _hole(_cut(a2, B2['ring-lam']), 1.0)[0], 'vòng Lướt đá lam khoét lòng')
    put('ui.hd-atk', _cut(a2, B2['atk']), 'nút Đánh song kiếm hoa đào')
    for k, box in B3.items():
        put('ui.hd-' + k, _cut(a3, box), 'khung ' + k)
    a5 = _load(5)
    for k, box in B5.items():
        put('ui.hd-' + k, _cut(a5, box), 'khung ' + k)
    for k, box in B4.items():
        put('ui.hd-' + k, _cut(a4, box), 'khung ' + k)
    print('lòng chân dung:', holes)
    return n
