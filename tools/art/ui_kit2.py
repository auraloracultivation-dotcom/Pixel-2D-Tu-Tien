"""Bộ khung giao diện GPT thứ hai (chủ dự án 02/11/2026 22:10, nguon/ai/ui/ui-kit-2.png): khung chân dung theo hệ, nút loa / mắt,
biểu tượng mục (Tự hành … Dược viên), bảng có tiêu đề + nút đóng + tab, hộp thoại NPC, băng thông báo, thanh máu boss đầu quỷ,
ô đồ theo độ hiếm, Linh Thạch, vòng nút tròn trống, nút Đánh không chữ. Giữ nguyên độ phân giải ảnh gốc (chủ dự án 02/11/2026 22:51), chỉ cắt, bỏ nền, xoá chữ.
Chữ mẫu vẽ trong ảnh (Lv.1, Tiêu đề, Tab, Tên NPC, lời thoại, Thành tựu, Tên Boss) được xoá: mỗi hàng trong vùng chữ tô bằng màu
điểm sát mép vùng. Kiểu dùng ở style-ui-kit2.css. Dựng riêng: python3 -I tools/art/ui_kit_only.py (gọi cả hai bộ)."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas
from le_hoi import _key
from ui_kit import _cut, _px, _main, _icon, _ring

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui' / 'ui-kit-2.png'
# tâm, bán kính lòng vòng chân dung theo tỉ lệ bề ngang / cao hình (đo tia từ tâm tới vòng vàng); src/ui/hud-ava.js dùng cùng số
AVA_HOLE = {'hoa-sen': (0.526, 0.438, 0.314), 'kim': (0.489, 0.451, 0.331), 'thuy': (0.474, 0.469, 0.326), 'hoa': (0.5, 0.458, 0.343), 'phong': (0.481, 0.458, 0.326)}
AVA = {'hoa-sen': (15, 12, 194, 192), 'kim': (210, 26, 349, 173), 'thuy': (362, 22, 501, 173), 'hoa': (511, 25, 650, 173), 'phong': (662, 25, 802, 173)}
ROUND = {'loa': (835, 60, 915, 140), 'loa-tat': (921, 60, 1001, 140), 'mat': (1005, 60, 1086, 140), 'mat-tat': (1090, 60, 1170, 140)}
TILES = ['tu-hanh', 'linh-thu', 'thanh-tuu', 'dao-huu', 'bang-hoi', 'cua-hang', 'lo-dan', 'lo-ren', 'duoc-vien']
TILE_X = [22, 156, 286, 414, 542, 670, 798, 928, 1057]
RAR = ['trang', 'luc', 'lam', 'tim', 'cam', 'vang', 'do', 'den']
RAR_X = [21, 132, 243, 352, 461, 569, 684, 795]


def _wipe(b, x0, x1, y0, y1, sx):
    """Xoá chữ: hàng y0..y1, cột x0..x1 tô bằng màu điểm cột sx cùng hàng (toạ độ điểm ảnh thật)."""
    for y in range(y0, y1):
        if 0 <= y < b.shape[0] and b[y, sx, 3]: b[y, x0:x1] = b[y, sx]
    return b


def _hole(b):
    """Lòng khung chân dung: loang từ giữa vòng (ngang giữa, cao 42%) qua các điểm tím sẫm, đặt trong suốt để mặt nhân vật hiện dưới."""
    from collections import deque
    h, w = b.shape[:2]; rgb = b[:, :, :3].astype(int); dark = (rgb.sum(axis=2) < 420) & (b[:, :, 3] > 0)
    seen = np.zeros((h, w), bool); q = deque([(int(h * 0.42), w // 2)])
    while q:
        y, x = q.popleft()
        if not (0 <= y < h and 0 <= x < w) or seen[y, x] or not dark[y, x]: continue
        seen[y, x] = True; q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    b = b.copy(); b[seen, 3] = 0
    return b


def _circle(b, hole):
    """Khoét lòng tròn chân dung trong suốt (mặt nhân vật vẽ dưới khung)."""
    h, w = b.shape[:2]; cx, cy, r = hole[0] * w, hole[1] * h, hole[2] * w * 0.97
    yy, xx = np.mgrid[0:h, 0:w]; b = b.copy()
    b[(yy - cy) ** 2 + (xx - cx) ** 2 < r * r, 3] = 0
    return b


def build(save):
    a = _key(np.array(Image.open(SRC).convert('RGB')))
    n = 0
    def put(sid, arr, note):
        nonlocal n
        c = Canvas(arr.shape[1], arr.shape[0]); c.a = np.ascontiguousarray(arr, dtype=np.uint8)
        save(sid, [c], (c.w // 2, c.h // 2), note + ' (ảnh GPT nguon/ai/ui/ui-kit-2.png)'); n += 1
    for k, box in AVA.items():
        put('ui.k-ava-' + k, _circle(_main(_px(_cut(a, box))), AVA_HOLE[k]), 'khung chân dung ' + k + ' (ô Lv có chữ mẫu, game phủ chữ cấp lên)')
    for k, box in ROUND.items():
        put('ui.k-nut-' + k, _main(_px(_cut(a, box))), 'nút vuông ' + k)
    for k, x in zip(TILES, TILE_X):
        put('ui.k-i-' + k, _icon(a, (x + 12, 214, x + 112, 290)), 'biểu tượng mục ' + k + ' (phần hình phía trên chữ)')
    # bảng: tiêu đề (xoá chữ), nút đóng, tab đang chọn / không chọn (xoá chữ), khung lòng bảng góc mây
    t = _px(_cut(a, (180, 386, 522, 440)))
    put('ui.k-tieu-de', _wipe(t, 42, t.shape[1] - 42, 12, t.shape[0] - 12, 36), 'băng tiêu đề bảng (đã xoá chữ)')
    put('ui.k-dong', _main(_px(_cut(a, (594, 386, 652, 438)))), 'nút đóng X')
    for k, box in (('tab-on', (64, 465, 204, 517)), ('tab', (208, 468, 342, 517))):
        b = _px(_cut(a, box)); put('ui.k-' + k, _wipe(b, 18, b.shape[1] - 18, 9, b.shape[0] - 6, 12), 'tab ' + k + ' (đã xoá chữ)')
    put('ui.k-khung', _px(_cut(a, (6, 1045, 191, 1225))), 'khung lòng bảng góc mây 9 mảnh')
    put('ui.k-khung-dai', _px(_cut(a, (195, 1062, 479, 1210))), 'khung dài góc mây')
    # hộp thoại NPC: bảng tên (xoá chữ), khung lời (xoá chữ, bỏ đuôi)
    nm = _px(_cut(a, (716, 386, 920, 434)))
    put('ui.k-ten-npc', _wipe(nm, 30, nm.shape[1] - 30, 9, nm.shape[0] - 9, 24), 'bảng tên người nói (đã xoá chữ)')
    dl = _px(_cut(a, (688, 434, 1180, 548)))
    put('ui.k-thoai', _wipe(dl, 21, dl.shape[1] - 24, 15, dl.shape[0] - 18, dl.shape[1] - 42), 'khung lời thoại giấy hồng (đã xoá chữ)')
    # băng thông báo thành tựu: xoá chữ ở dải giữa
    to = _px(_cut(a, (689, 604, 1171, 698)))   # bỏ hoa sen phía trên (giãn ngang sẽ méo), hoa sen là hình riêng đặt giữa
    to = _wipe(to, 60, to.shape[1] - 60, 24, 66, 54)
    to[30:63, 48:to.shape[1] - 48] = to[42, 54]
    to[0:18, 102:to.shape[1] - 102, 3] = 0   # bỏ vụn đế hoa sen ở mép trên giữa băng   # lòng băng một màu tím sẫm: chữ hai dòng không bị vạch sáng cắt ngang
    put('ui.k-bang', to, 'băng thông báo (đã xoá chữ, bỏ hoa sen, lòng một màu)')
    put('ui.k-bang-sen', _main(_px(_cut(a, (862, 563, 1000, 616)))), 'hoa sen pha lê đặt giữa băng thông báo')
    # thanh boss: đầu quỷ, bảng tên (xoá chữ)
    bo = _px(_cut(a, (679, 709, 1184, 825)))
    put('ui.k-boss', _wipe(bo, 126, 315, 21, 54, 120), 'thanh máu boss đầu quỷ (đã xoá chữ tên)')
    for k, x in zip(RAR, RAR_X):
        put('ui.k-o-' + k, _main(_px(_cut(a, (x, 852, x + 104, 952)))), 'ô đồ độ hiếm ' + k)
    for k, box in (('linh-thach', (950, 947, 985, 1006)), ('linh-thach-2', (1015, 944, 1074, 1000)), ('linh-thach-3', (1099, 938, 1172, 1005))):
        put('ui.k-' + k, _main(_px(_cut(a, box))), 'Linh Thạch')
    put('ui.k-atk2', _main(_px(_cut(a, (1028, 1044, 1196, 1230)))), 'nút Đánh song kiếm không chữ')
    # vòng nút tròn trống hàng dưới (chủ dự án 04/11/2026 09:05, bố cục nút tròn theo ảnh mẫu): lòng tím đặc cho nút mục,
    # bản khoét lòng cho bản đồ tròn góc phải trên (src/ui/mini-map.js)
    for k, box in (('vong-lam', (667, 1060, 782, 1200)), ('vong-tim', (781, 1060, 896, 1200)), ('vong-vang', (896, 1050, 1026, 1210))):
        put('ui.k-' + k, _main(_cut(a, box)), 'vòng nút tròn ' + k)
    put('ui.k-vong-tim-rong', _main(_ring(a, (781, 1060, 896, 1200), 0.80)), 'vòng tím khoét lòng (khung bản đồ tròn)')
    return n
