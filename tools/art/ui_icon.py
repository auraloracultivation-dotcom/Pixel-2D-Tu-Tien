"""Bộ biểu tượng mới từ ảnh GPT (chủ dự án 04/11/2026 11:17, nguon/ai/ui/icon-moi.png): 74 biểu tượng xếp lưới, thay toàn bộ biểu
tượng cũ (nút trên màn, cột mục, hộp Thư, ô trang bị). Ảnh nền trong suốt còn quầng sáng mờ: bỏ điểm alpha dưới 110 (quầng),
giữ mảng hình lớn nhất mỗi ô. Không đổi hình. Tên hình ui-ic-<tên>. Dùng ở style-ui-icon.css, src/ui/bag-detail.js (ô trang bị
theo loại món). Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas
from ui_kit import _main

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui' / 'icon-moi.png'
ROWS = [0, 172, 322, 460, 592, 732, 870, 1024]
COLS = [
    [(18, 218), (221, 366), (379, 551), (555, 684), (690, 845), (859, 977), (989, 1122), (1128, 1274), (1284, 1416), (1420, 1527)],
    [(20, 171), (181, 338), (345, 498), (509, 662), (679, 802), (818, 958), (973, 1091), (1108, 1238), (1245, 1390), (1392, 1516)],
    [(19, 164), (183, 317), (345, 468), (491, 613), (636, 751), (779, 898), (910, 1063), (1073, 1221), (1235, 1354), (1364, 1511)],
    [(11, 178), (191, 319), (350, 457), (490, 625), (647, 758), (779, 902), (919, 1048), (1063, 1211), (1231, 1362), (1381, 1523)],
    [(22, 167), (187, 308), (331, 465), (483, 610), (632, 749), (786, 906), (938, 1057), (1084, 1218), (1236, 1365), (1376, 1521)],
    [(28, 161), (172, 314), (340, 444), (466, 613), (628, 760), (786, 914), (939, 1059), (1085, 1197), (1229, 1349), (1390, 1501)],
    [(18, 105), (118, 201), (214, 310), (321, 415), (421, 508), (531, 617), (633, 724), (747, 824), (827, 921), (932, 1008), (1022, 1139), (1142, 1264), (1269, 1392), (1396, 1526)],
]
NAMES = [
    ['dong-phu', 'tu-luyen', 'bi-canh', 'su-kien', 'xep-hang', 'thu', 'dao-lu', 'tong-mon', 'cho', 'linh-thach'],
    ['thanh-tuu', 'danh-hieu', 'nhat-ky', 'dau', 'am-thanh', 'ban-do', 'quay', 'tui', 'giap', 'vu-khi'],
    ['mu', 'giay', 'nhan', 'ngoc-boi', 'phap-bao', 'dan', 'duoc', 'cong-phap', 'linh-thu', 'thu-cuoi'],
    ['thoi-trang', 'chia-khoa', 'khoa', 'cai-dat', 'than', 'an', 'tu-hanh', 'nhiem-vu', 'diem-danh', 'ruong'],
    ['qua', 'dong-xu', 'nguyen-bao', 'tinh-thach', 'ngoc', 'binh-do', 'binh-lam', 'hoa', 'thuy', 'phong'],
    ['moc', 'tho', 'loi', 'bang', 'lua', 'chat', 'chuong', 'dong', 'lui', 'ok'],
    ['cong', 'tru', 'lam-moi', 'tim', 'loc', 'sap-xep', 'xoa', 'ghim', 'vi-tri', 'den', 'hoa-dao', 'may', 'trang', 'nha-nho'],
]


def build(save):
    a = np.array(Image.open(SRC).convert('RGBA'))
    a[:, :, 3] = np.where(a[:, :, 3] >= 110, a[:, :, 3], 0)
    n = 0
    for r, (cols, names) in enumerate(zip(COLS, NAMES)):
        for (x0, x1), k in zip(cols, names):
            arr = _main(np.ascontiguousarray(a[ROWS[r]:ROWS[r + 1], x0:x1]))
            c = Canvas(arr.shape[1], arr.shape[0]); c.a = np.ascontiguousarray(arr, dtype=np.uint8)
            save('ui.ic-' + k, [c], (c.w // 2, c.h // 2), 'biểu tượng ' + k + ' (ảnh GPT icon-moi.png)'); n += 1
    return n
