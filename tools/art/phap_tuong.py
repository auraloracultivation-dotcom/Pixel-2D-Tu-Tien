"""16 pháp tượng (chủ dự án 16/11/2026 20:36 gửi bảng ảnh GPT 4×4, 20:44 "làm trên SpriteCook"): cắt từng cái, đưa về cỡ điểm game.
  goc/bang-16.png  bảng gốc (2,2 MB, giữ ở máy làm việc, .gitignore); goc/NN.png ảnh cắt cỡ gốc (alpha ≥ 128)
  tinh/NN.png      ảnh tĩnh cỡ game: MỘT hệ số cho cả 16 cái (#01 rộng 128 điểm: lỗ giữa ôm vừa đầu người ngồi xếp bằng, cỡ trang phục
                   mới), giữ đúng tỉ lệ to nhỏ giữa các pháp tượng như bảng gốc; 32 màu, KHÔNG viền mực (pháp tượng là ánh sáng)
  ds.json → pt.NN  {w, h, lo: [x, y] tâm lỗ giữa nếu có (bán kính ≥ 8 điểm), không có thì giữa ảnh}
Cắt theo ô: mỗi mảng hình (alpha ≥ 128, từ 30 điểm) thuộc ô có tâm mảng nằm trong; một pháp tượng có thể nhiều mảng (rồng nước #13).
Chạy: python3 -I tools/art/phap_tuong.py [NN …] [--tam <thư mục>]  (--tam: thêm ảnh ghép người ngồi xếp bằng trước pháp tượng cho trang duyệt)"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_import import shrink, quantize

D = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'phap-tuong'
TP = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'trang-phuc-moi'
COLS, ROWS, COLORS = 4, 4, 32
K = 128 / 324   # #01 cắt rộng 324 điểm → 128 điểm game


def cut(sheet):
    a = np.array(Image.open(sheet).convert('RGBA')); H, W = a.shape[:2]; m = a[..., 3] >= 128
    lab, n = nd.label(m); sz = nd.sum(m, lab, range(1, n + 1)); cells = {}
    for i in range(1, n + 1):
        if sz[i - 1] < 30: continue
        ys, xs = np.nonzero(lab == i); c = int(xs.mean() // (W / COLS)) + COLS * int(ys.mean() // (H / ROWS))
        cells.setdefault(c + 1, []).append(i)
    out = {}
    for k, ids in cells.items():
        keep = np.isin(lab, ids); ys, xs = np.nonzero(keep); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        r = a[y0:y1, x0:x1].copy(); r[..., 3] = np.where(keep[y0:y1, x0:x1], 255, 0); out[k] = r
    return out


def hole(e):
    """Tâm lỗ giữa: điểm trong suốt xa hình nhất ở vùng giữa (30–70% ngang, 15–85% dọc); bán kính dưới 8 thì coi như không có lỗ."""
    H, W = e.shape[:2]; dt = nd.distance_transform_edt(e[..., 3] == 0); z = np.zeros_like(dt)
    z[int(.15 * H):int(.85 * H), int(.3 * W):int(.7 * W)] = dt[int(.15 * H):int(.85 * H), int(.3 * W):int(.7 * W)]
    y, x = np.unravel_index(int(np.argmax(z)), z.shape)
    return ([int(x), int(y)], round(float(z[y, x]), 1)) if z[y, x] >= 8 else ([W // 2, int(H * 0.5)], 0)


def mock(n, e, lo, out):
    """Người ngồi xếp bằng (trang phục mới #n) trước pháp tượng, mặt ở tâm lỗ, trên nền cỏ: để trang duyệt so cỡ."""
    ng = Image.open(TP / 'ngoi' / f'{n:02d}.png').convert('RGBA'); H, W = e.shape[:2]
    fx, fy = ng.width * 0.55, ng.height * 0.30; ox, oy = round(lo[0] - fx), round(lo[1] - fy)
    x0, y0 = min(0, ox), min(0, oy); x1, y1 = max(W, ox + ng.width), max(H, oy + ng.height)
    c = Image.new('RGBA', (x1 - x0 + 16, y1 - y0 + 12), (0, 0, 0, 0))
    c.alpha_composite(Image.fromarray(e, 'RGBA'), (8 - x0, 6 - y0)); c.alpha_composite(ng, (8 + ox - x0, 6 + oy - y0)); c.save(out)


def main(argv):
    tam = argv[argv.index('--tam') + 1] if '--tam' in argv else None
    ns = [int(x) for x in argv if x.isdigit() and x != tam]
    cuts = cut(D / 'goc' / 'bang-16.png'); (D / 'tinh').mkdir(exist_ok=True)
    p = D / 'ds.json'; ds = json.load(open(p, encoding='utf-8')) if p.exists() else {}; ds.setdefault('pt', {}); ds['k'] = round(K, 5)
    for n in ns or sorted(cuts):
        r = cuts[n]; Image.fromarray(r, 'RGBA').save(D / 'goc' / f'{n:02d}.png')
        th = max(8, round(r.shape[0] * K)); e = quantize(shrink(r, th), COLORS)
        Image.fromarray(e, 'RGBA').save(D / 'tinh' / f'{n:02d}.png'); lo, rad = hole(e)
        ds['pt'][f'{n:02d}'] = {'w': int(e.shape[1]), 'h': int(e.shape[0]), 'lo': lo, 'lo_r': rad}
        if tam: mock(n, e, lo, Path(tam) / f'ghep-{n:02d}.png')
        print(n, r.shape[1], 'x', r.shape[0], '→', e.shape[1], 'x', e.shape[0], 'lỗ', lo, rad)
    json.dump(ds, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
