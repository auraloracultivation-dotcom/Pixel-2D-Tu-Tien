"""Bộ 16 trang phục mới (chủ dự án 16/11/2026 18:24: "thiết kế lại 16 nhân vật này, làm xong tui duyệt sẽ lại đẩy lên spritecook"):
16 nhân vật chibi trong bảng ảnh GPT 4×4 (tools/art/nguon/ai/trang-phuc-moi/goc.png, nền trong suốt, viền lem màu đỏ / xanh / tím mờ)
về ảnh tĩnh đúng chuẩn pixel game (docs/02-CHUAN-PIXEL.md), làm nguồn cho SpriteCook: xếp bằng vận khí cầu (ảnh mẫu mau-xep-bang.png),
đứng nghỉ, chạy, hai đòn tay không bắn pháp lực. mau-phap-tuong.png chỉ để xem trước pháp tượng, làm sau.
1. Chia ô theo khe trong suốt (hàng rồi cột). Giữ điểm đục (alpha từ 200): quầng lem màu quanh nhân vật đều là điểm mờ nên rơi hết.
2. Thu về cỡ điểm nhân vật với MỘT hệ số K cho cả 16 (giữ tương quan cao thấp như tranh): nhân vật giữa (cao 293 điểm tranh) cao
   CAO điểm game kể cả viền, thân người ~45 điểm như hero.nam (1 điểm = 0,5333 đơn vị, data/heroes.json body). Gom màu, giữ mắt
   (quai_tinh.py, cách của Bộ Quái Mới), viền mực.
Ra: tinh/NN.png (ảnh tĩnh), xem/NN-goc.png (ô tranh gốc thu nhỏ để so), ds.json (cỡ, hệ số).
Chạy: python3 -I tools/art/trang_phuc_moi.py"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_import import shrink, quantize, outline
from quai_tinh import drop_specks, auto_masks, paint_small

D = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'trang-phuc-moi'
CAO = 50          # cao (điểm game) của nhân vật giữa, kể cả viền mực
COLORS = 24
TEN = ['Huyết y kiếm khách', 'Băng vương', 'Tử hoa tiểu thư', 'Đào hoa tiên tử', 'Băng lam tiên nữ', 'Hỏa bào vương gia', 'Mộc linh tiên tử',
       'Ngân phát hắc bào', 'Long giác tiên cơ', 'Lam hoa thiếu nữ', 'Hắc phát hoàng tử', 'Tử đinh hương', 'Thanh long cơ', 'Xích hồ công tử',
       'Huyết hoa bạch phát', 'Đấu lạp hiệp khách']   # tên tả tạm, chờ chủ dự án đặt


def runs(v, gap=8):
    out, s = [], None
    for i, x in enumerate(v):
        if x and s is None: s = i
        if not x and s is not None: out.append((s, i)); s = None
    if s is not None: out.append((s, len(v)))
    return [r for r in out if r[1] - r[0] > 20]


def cells(a):
    op = a[..., 3] >= 200; out = []
    for y0, y1 in runs(op.sum(1) > 0):
        for x0, x1 in runs(op[y0:y1].sum(0) > 0): out.append((x0, y0, x1, y1))
    return out


def main():
    a = np.array(Image.open(D / 'goc.png').convert('RGBA'))
    cs = cells(a); assert len(cs) == 16, f'tìm thấy {len(cs)} ô, cần 16'
    hs = []
    for x0, y0, x1, y1 in cs:
        m = a[y0:y1, x0:x1, 3] >= 200; ys = np.nonzero(m.any(1))[0]; hs.append(ys.max() - ys.min() + 1)
    K = (CAO - 2) / float(np.median(hs)); res = []
    for n, (x0, y0, x1, y1) in enumerate(cs, 1):
        c = a[y0:y1, x0:x1].copy(); c[..., 3] = np.where(c[..., 3] >= 200, 255, 0)
        c = drop_specks(c, 0.002)
        ys, xs = np.nonzero(c[..., 3] > 0); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        th = max(12, round(c.shape[0] * K))
        q = quantize(shrink(c, th), COLORS)
        for em in auto_masks(c): paint_small(q, c, em, th)
        out = outline(q)
        oy, ox = np.nonzero(out[..., 3]); out = out[oy.min():oy.max() + 1, ox.min():ox.max() + 1]
        Image.fromarray(out, 'RGBA').save(D / 'tinh' / f'{n:02d}.png')
        g = Image.fromarray(c, 'RGBA'); s = 180 / g.height
        g.resize((round(g.width * s), 180), Image.LANCZOS).save(D / 'xem' / f'{n:02d}-goc.png')
        res.append({'n': n, 'ten': TEN[n - 1], 'w': int(out.shape[1]), 'h': int(out.shape[0])})
    json.dump({'_note': 'Bộ 16 trang phục mới (chủ dự án 16/11/2026 18:24): ảnh tĩnh ở tinh/NN.png, cỡ điểm game (1 điểm = 0,5333 đơn vị); ten: tên tả tạm.',
               'k': round(K, 4), 'cao': CAO, 'ds': res}, open(D / 'ds.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for r in res: print(r)


if __name__ == '__main__':
    main()
