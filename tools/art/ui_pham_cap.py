"""Khung ô trang bị theo phẩm cấp từ ảnh GPT (chủ dự án 04/11/2026 10:28, nguon/ai/ui/pham-cap.png): bảy phẩm lục, lam, tím, cam,
vàng, đỏ, đen (tím sẫm). Ảnh không có lớp trong suốt (nền ô ca-rô trắng xám vẽ sẵn): bỏ các vùng xám trắng ít màu nối liền (trên 40
điểm), rồi gọt hai lượt viền sáng xám sát chỗ trong suốt. Giữ nguyên hình (chỉ cắt, bỏ nền).
- ui-pc-<phẩm>: ô vuông lòng tối (hàng hai của ảnh) làm khung ô đồ trong túi (style-ui-hoa-dao.css, bag.js gắn data-o);
- ui-pc-ten-<phẩm>: băng tên cùng màu (hàng ba), ui-pc-da-<phẩm>: viên đá phẩm (hàng cuối).
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from px import Canvas
from ui_kit import _main

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui' / 'pham-cap.png'
PHAM = ['luc', 'lam', 'tim', 'cam', 'vang', 'do', 'den']
O = [(31, 382, 232, 598), (245, 382, 449, 598), (461, 381, 662, 598), (673, 381, 879, 599), (882, 371, 1092, 599), (1092, 371, 1305, 599), (1310, 371, 1520, 599)]
TEN = [(17, 647, 219, 728), (233, 648, 435, 726), (449, 646, 657, 727), (669, 648, 870, 727), (884, 639, 1095, 728), (1110, 647, 1306, 727), (1314, 646, 1520, 730)]
DA = [(1078, 821, 1126, 891), (1136, 821, 1184, 891), (1194, 820, 1242, 891), (1252, 819, 1301, 891), (1310, 816, 1361, 892), (1367, 817, 1417, 892), (1427, 815, 1477, 892)]


def _clean():
    a = np.array(Image.open(SRC).convert('RGBA')).astype(int)
    mx, mn = a[:, :, :3].max(2), a[:, :, :3].min(2)
    lab, n = nd.label((mn > 200) & (mx - mn < 16))
    if n:
        sz = nd.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
        big = np.zeros(n + 1, bool); big[1:] = sz > 40
        a[big[lab], 3] = 0
    for _ in range(2):   # viền sáng xám (trộn với nền ca-rô) sát chỗ đã trong suốt
        near = nd.binary_dilation(a[:, :, 3] == 0) & (a[:, :, 3] > 0) & (mn > 150) & (mx - mn < 40)
        a[near, 3] = 0
    return a.astype(np.uint8)


def build(save):
    a = _clean()
    n = 0
    def put(sid, box, note):
        nonlocal n
        x0, y0, x1, y1 = box
        arr = _main(np.ascontiguousarray(a[y0:y1, x0:x1]))
        c = Canvas(arr.shape[1], arr.shape[0]); c.a = np.ascontiguousarray(arr, dtype=np.uint8)
        save(sid, [c], (c.w // 2, c.h // 2), note + ' (ảnh GPT pham-cap.png)'); n += 1
    for k, o, t, d in zip(PHAM, O, TEN, DA):
        put('ui.pc-' + k, o, 'ô trang bị phẩm ' + k)
        put('ui.pc-ten-' + k, t, 'băng tên phẩm ' + k)
        put('ui.pc-da-' + k, d, 'đá phẩm ' + k)
    return n
