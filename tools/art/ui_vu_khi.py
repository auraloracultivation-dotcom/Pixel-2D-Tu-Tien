"""Hình vũ khí thật hiện trong ô trang bị (chủ dự án 04/11/2026 11:33, ảnh GPT nguon/ai/ui/vu-khi-1.png): chín món theo đúng tên
data/items.json → bases. Biểu tượng loại (ui-ic-vu-khi) vẫn dùng cho ô trống và lọc; món đã có hình ở đây thì ô đồ hiện hình này
(src/ui/bag-detail.js đọc data/art.json → 'ui.vk-<món>'). Chỉ cắt, bỏ quầng mờ (alpha dưới 64), đặt giữa nền vuông trong suốt.
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui' / 'vu-khi-1.png'
BOX = {   # (x0, y0, x1, y1) trên ảnh 2172×724
    'thiet-kiem': (38, 15, 375, 373), 'thanh-van-kiem': (473, 10, 852, 360), 'thien-mach-kiem': (926, 0, 1312, 366),
    'thiet-thuong': (1376, 0, 1728, 362), 'ba-tieu-phien': (1790, 17, 2162, 360), 'moc-cam': (96, 361, 463, 716),
    'tu-nguyet-liem': (550, 358, 962, 718), 'truc-cung': (1039, 356, 1377, 716), 'dao-van-binh': (1475, 356, 1856, 718),
}


def build(save):
    a = np.array(Image.open(SRC).convert('RGBA'))
    a[:, :, 3] = np.where(a[:, :, 3] >= 64, a[:, :, 3], 0)
    n = 0
    for k, (x0, y0, x1, y1) in BOX.items():
        c = a[y0:y1, x0:x1]
        ys, xs = np.nonzero(c[:, :, 3])
        c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        S = max(c.shape[:2]); sq = np.zeros((S, S, 4), np.uint8)
        oy, ox = (S - c.shape[0]) // 2, (S - c.shape[1]) // 2; sq[oy:oy + c.shape[0], ox:ox + c.shape[1]] = c
        cv = Canvas(S, S); cv.a = sq
        save('ui.vk-' + k, [cv], (S // 2, S // 2), 'vũ khí ' + k + ' (ảnh GPT vu-khi-1.png)'); n += 1
    return n
