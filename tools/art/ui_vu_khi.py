"""Hình trang bị thật hiện trong ô đồ (chủ dự án 04/11/2026 11:33–11:39, ảnh GPT nguon/ai/ui/<loại>-1.png): mỗi ảnh một loại ô,
món xếp trái sang phải, trên xuống dưới theo đúng thứ tự data/items.json → bases của loại đó. Biểu tượng loại (ui-ic-<ô>) vẫn dùng
cho ô trống, món chưa có hình. src/ui/bag-detail.js đọc data/art.json → 'ui.vk-<món>'. Tách món: chia hàng theo dải trống ngang,
trong hàng chia cột theo dải trống dọc (thiếu thì cắt cột rộng nhất ở chỗ ít điểm nhất); bỏ quầng mờ (alpha dưới 64), đặt giữa nền
vuông trong suốt. Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from px import Canvas

ART = Path(__file__).resolve().parent
SRC = ART / 'nguon' / 'ai' / 'ui'
SHEETS = {'vu-khi': 'vu-khi-1.png', 'mu': 'mu-1.png', 'giap': 'giap-1.png', 'ngoc-boi': 'ngoc-boi-1.png', 'giay': 'giay-1.png', 'phap-bao': 'phap-bao-1.png'}
# thứ tự vũ khí trên ảnh khác thứ tự trong data (ba kiếm đứng liền nhau)
ORDER = {'vu-khi': ['thiet-kiem', 'thanh-van-kiem', 'thien-mach-kiem', 'thiet-thuong', 'ba-tieu-phien', 'moc-cam', 'tu-nguyet-liem', 'truc-cung', 'dao-van-binh']}
# nguyên liệu (chủ dự án 11:43, 11:45): mỗi hàng một danh sách, id theo data/cave.json → materials, data/items.json → materials
ROWS = {
    'ren-1.png': [['tinh-thiet', 'manh-phap-bao', 'tay-luyen-thach', 'khoa-linh-thach'], ['dao-van-thach', 'bi-kip-chieu', 'yeu-vuong-dan']],
    'nguyen-lieu-1.png': [['linh-thao', 'yeu-huyet', 'hoa-linh-chi'], ['ngoc-lo-hoa', 'linh-mach', 'linh-dau', 'hong-qua', 'kim-tieu', 'tu-van-sam', 'thai-hu-lien']],
}


def _segs(mask, axis, gap, need=None):
    prof = mask.sum(axis=axis)
    lab, n = nd.label(nd.binary_dilation(prof > 3, iterations=gap))
    segs = [[s[0].start, s[0].stop] for s in nd.find_objects(lab)]
    while need and len(segs) < need:   # thiếu: cắt đoạn rộng nhất ở chỗ ít điểm nhất quanh giữa
        i = max(range(len(segs)), key=lambda j: segs[j][1] - segs[j][0]); a, b = segs[i]
        w = b - a; lo, hi = a + w // 4, b - w // 4; cut = lo + int(np.argmin(prof[lo:hi]))
        segs[i:i + 1] = [[a, cut], [cut, b]]
    return segs


def build(save):
    bases = json.loads((ART.parents[1] / 'data' / 'items.json').read_text(encoding='utf-8'))['bases']
    n = 0
    jobs = [(slot, f, ORDER.get(slot) or [k for k, v in bases.items() if v['slot'] == slot], None) for slot, f in SHEETS.items()]
    jobs += [('nguyen-lieu', f, [k for r in rows for k in r], rows) for f, rows in ROWS.items()]
    for slot, f, names, fixed in jobs:
        a = np.array(Image.open(SRC / f).convert('RGBA')); a[:, :, 3] = np.where(a[:, :, 3] >= 64, a[:, :, 3], 0)
        m = a[:, :, 3] > 0
        rows = _segs(m, 1, 4, len(fixed) if fixed else (2 if len(names) > 5 else 1))
        per = -(-len(names) // len(rows))
        boxes = []
        for r, (y0, y1) in enumerate(rows):
            left = len(names) - len(boxes)
            want = len(fixed[r]) if fixed and r < len(fixed) else min(per, left)
            segs = _segs(m[y0:y1], 0, 8, want)
            segs = sorted(sorted(segs, key=lambda s: s[1] - s[0], reverse=True)[:want])   # bỏ vụn quầng
            for x0, x1 in segs:
                boxes.append((x0, y0, x1, y1))
        for k, (x0, y0, x1, y1) in zip(names, boxes):
            c = a[y0:y1, x0:x1]; ys, xs = np.nonzero(c[:, :, 3])
            c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            S = max(c.shape[:2]); sq = np.zeros((S, S, 4), np.uint8)
            oy, ox = (S - c.shape[0]) // 2, (S - c.shape[1]) // 2; sq[oy:oy + c.shape[0], ox:ox + c.shape[1]] = c
            cv = Canvas(S, S); cv.a = sq
            save('ui.vk-' + k, [cv], (S // 2, S // 2), f'{slot} {k} (ảnh GPT {f})'); n += 1
        print(slot, len(rows), 'hàng', len(boxes), 'ô /', len(names), 'món')
    return n
