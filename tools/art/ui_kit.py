"""Bộ khung giao diện từ ảnh GPT (chủ dự án 02/11/2026 21:46, nguon/ai/ui/ui-kit-1.png, mẫu ghép ui-mau-1.png).
Ảnh "giả pixel" khối 3 điểm: bỏ nền hồng, thu 1/3 về điểm ảnh thật, gom màu. Chữ vẽ sẵn trong ảnh không dùng (game tự viết chữ
bằng phông pixel), nên:
- khung nút dài (ui-k-btn): lấy nút "Túi đồ", tô lại lòng nút theo màu cột sát mép phải (xoá biểu tượng, chữ), dùng 9 mảnh;
- biểu tượng nút (ui-k-i-<tên>): cắt phần biểu tượng bên trái mỗi nút mẫu, loang bỏ màu lòng nút quanh biểu tượng;
- vòng nút tròn (ui-k-ring-lam / -do): lấy nút Lướt, Liệt Diễm, khoét lòng tròn trong suốt để biểu tượng chiêu hiện bên dưới;
- nút Đánh (ui-k-atk): cả hình (vòng, song kiếm, chữ Đánh);
- khung bảng (ui-k-panel), thanh máu / linh khí / rỗng (ui-k-bar-*), ô chat (ui-k-chat), mũi tên thu gọn (ui-k-arrow-l/-r).
Kiểu dùng ở style-ui-kit.css. Gọi từ build.py: ui_kit.build(save)."""
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas
import ai_import as AI
from scipy import ndimage as nd
from le_hoi import _key, _crop

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui' / 'ui-kit-1.png'
K = 3   # khối điểm của ảnh nguồn; chủ dự án 02/11/2026 22:51: giữ nguyên độ phân giải ảnh gốc, chỉ cắt và bỏ nền (không thu về điểm ảnh)

# (x0, y0, x1, y1) trên ảnh nguồn 1024×1536
BTN_L, BTN_R = (22, 34), (241, 462)
ROWS = [(263, 337), (342, 412), (418, 488), (495, 567), (571, 644)]
ICONS = {   # tên: khung cắt biểu tượng, nằm trong lòng nút (chừa viền khung 3 điểm trên dưới, trái), kẻo dính vạch khung
    'tui': (34, 272, 104, 328), 'menu': (252, 272, 340, 328), 'cong-phap': (34, 351, 110, 403), 'bi-canh': (262, 351, 336, 403),
    'su-kien': (36, 427, 110, 479), 'nhiem-vu': (254, 427, 336, 479), 'dong-phu': (34, 504, 112, 558), 'ban-do': (252, 504, 334, 558),
    'xep-hang': (34, 580, 110, 635), 'thu': (262, 584, 338, 634), 'loi': (372, 584, 450, 634), 'de-xuat': (42, 656, 108, 708),
    'tu-danh': (550, 636, 616, 694),
}


def _cut(a, box):
    x0, y0, x1, y1 = box
    return _crop(a[y0:y1, x0:x1])


def _px(c, colors=40):
    return np.ascontiguousarray(c, dtype=np.uint8)   # giữ nguyên ảnh gốc (chỉ cắt, bỏ nền)


def _main(c):
    """Giữ mảng hình lớn nhất (và mảnh nhỏ nằm trong khung của nó), bỏ mẩu hình bên cạnh lọt vào khung cắt."""
    lab, k = nd.label(c[:, :, 3] > 0, structure=np.ones((3, 3)))
    if k <= 1: return c
    size = nd.sum(np.ones_like(lab), lab, index=np.arange(1, k + 1)); big = int(np.argmax(size)) + 1
    sl = nd.find_objects(lab); y0, y1, x0, x1 = sl[big - 1][0].start, sl[big - 1][0].stop, sl[big - 1][1].start, sl[big - 1][1].stop
    keep = np.zeros(k + 1, bool); keep[big] = True
    for i, s in enumerate(sl, 1):
        cy, cx = (s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2
        if y0 <= cy <= y1 and x0 <= cx <= x1: keep[i] = True
    c = c.copy(); c[~keep[lab], 3] = 0
    return np.ascontiguousarray(_crop(c), dtype=np.uint8)


def _canvas(a):
    c = Canvas(a.shape[1], a.shape[0]); c.a = a; return c


def _empty_btn(a):
    """Nút Túi đồ → khung rỗng: mỗi hàng trong lòng (chừa viền 3 điểm) tô bằng màu điểm cách mép phải 5 điểm."""
    b = _px(_cut(a, (22, 263, 234, 337)))
    h, w = b.shape[:2]
    for y in range(9, h - 9):
        col = b[y, w - 18].copy()
        if col[3] == 0: continue
        b[y, 12:w - 15] = col
    return b


def _icon(a, box):
    """Biểu tượng trên lòng nút: loang từ mép khung cắt bỏ điểm tối giống màu lòng nút (biểu tượng có viền mực sẫm hơn hẳn)."""
    c = _px(_cut(a, box), 32)
    h, w = c.shape[:2]
    rgb = c[:, :, :3].astype(int)
    lum = rgb.sum(axis=2)
    bgc = np.median(np.concatenate([rgb[:, 0], rgb[:, -1], rgb[0], rgb[-1]]), axis=0)
    near = (np.abs(rgb - bgc).sum(axis=2) < 80) & (lum < 340) | (c[:, :, 3] == 0)
    seen = np.zeros((h, w), bool); q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
    while q:
        y, x = q.popleft()
        if not (0 <= y < h and 0 <= x < w) or seen[y, x] or not near[y, x]: continue
        seen[y, x] = True; q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    c[seen, 3] = 0
    # viền khung nút (vạch vàng ngang trên, dưới) chạy dài hơn biểu tượng: chỉ giữ cột trong bề ngang biểu tượng ở các hàng giữa
    rows = np.nonzero((c[:, :, 3] > 0).any(axis=1))[0]
    if len(rows) > 6:
        mid = c[rows[0] + len(rows) // 5: rows[-1] - len(rows) // 5, :, 3] > 0
        cols = np.nonzero(mid.any(axis=0))[0]
        if len(cols):
            c[:, :max(0, cols[0] - 3), 3] = 0; c[:, cols[-1] + 6:, 3] = 0
    return _main(c)


def _empty_chat(a):
    """Ô chat: xoá chữ mẫu, mỗi hàng tô bằng màu điểm ngay trước biểu tượng bong bóng."""
    b = _px(_cut(a, (21, 903, 484, 966)))
    h, w = b.shape[:2]
    for y in range(9, h - 9):
        col = b[y, 300].copy()
        if col[3]: b[y, 12:w - 66] = col
    return b


def _ring(a, box, inner):
    """Nút tròn → vòng: khoét lòng tròn (bán kính inner × bán kính ngoài) trong suốt."""
    c = _px(_cut(a, box))
    h, w = c.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    cy, cx = (h - 1) / 2, (w - 1) / 2
    c[(yy - cy) ** 2 + (xx - cx) ** 2 < (min(h, w) / 2 * inner) ** 2, 3] = 0
    return c


def build(save):
    a = _key(np.array(Image.open(SRC).convert('RGB')))
    n = 0
    def put(sid, arr, note, anchor=None):
        nonlocal n
        c = _canvas(arr); save(sid, [c], anchor or (c.w // 2, c.h // 2), note + ' (ảnh GPT nguon/ai/ui/ui-kit-1.png)'); n += 1
    put('ui.k-btn', _empty_btn(a), 'khung nút dài 9 mảnh, lòng tím sẫm')
    for name, box in ICONS.items():
        put('ui.k-i-' + name, _icon(a, box), 'biểu tượng nút ' + name)
    put('ui.k-ring-lam', _ring(a, (22, 751, 138, 869), 0.70), 'vòng nút tròn đá lam (Lướt)')
    put('ui.k-ring-do', _ring(a, (391, 752, 507, 865), 0.72), 'vòng nút tròn đá đỏ (chiêu, đan, pháp bảo; từ nút Đan)')
    put('ui.k-atk', _main(_px(_cut(a, (796, 698, 998, 902)))), 'nút Đánh: vòng vàng, song kiếm, chữ Đánh')
    pn = _px(_cut(a, (641, 1058, 849, 1198)))
    pn[18:-18, 18:-18, 3] = np.where(pn[18:-18, 18:-18, 3] > 0, 150, 0)   # lòng bảng trong mờ: vẫn thấy cảnh, đồ rơi phía sau (chủ dự án 02/11 13:38)
    put('ui.k-panel', pn, 'khung bảng 9 mảnh góc vàng, lòng trong mờ')
    put('ui.k-chat', _empty_chat(a), 'ô nhập trò chuyện (đã xoá chữ mẫu)')
    put('ui.k-bar-do', _px(_cut(a, (21, 988, 211, 1022))), 'thanh máu')
    put('ui.k-bar-lam', _px(_cut(a, (214, 986, 393, 1022))), 'thanh linh khí')
    put('ui.k-bar-rong', _px(_cut(a, (396, 986, 575, 1022))), 'thanh rỗng')
    put('ui.k-arrow-l', _px(_cut(a, (880, 1230, 916, 1281))), 'mũi tên trái (thu gọn)')
    put('ui.k-arrow-r', _px(_cut(a, (938, 1231, 973, 1282))), 'mũi tên phải (mở ra)')
    put('ui.k-den', _px(_cut(a, (849, 22, 912, 214))), 'đèn lồng treo góc bảng')
    return n
