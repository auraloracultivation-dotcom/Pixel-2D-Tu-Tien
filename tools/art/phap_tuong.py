"""16 pháp tượng (chủ dự án 16/11/2026 20:36 gửi bảng ảnh GPT 4×4, 20:44 "làm trên SpriteCook"): cắt từng cái, đưa về cỡ điểm game.
  goc/bang-16.png  bảng gốc (2,2 MB, giữ ở máy làm việc, .gitignore); goc/NN.png ảnh cắt cỡ gốc (alpha ≥ 128)
  tinh/NN.png      ảnh tĩnh cỡ game: MỘT hệ số cho cả 16 cái (#01 rộng 128 điểm: lỗ giữa ôm vừa đầu người ngồi xếp bằng, cỡ trang phục
                   mới), giữ đúng tỉ lệ to nhỏ giữa các pháp tượng như bảng gốc; 32 màu, KHÔNG viền mực (pháp tượng là ánh sáng)
  ds.json → pt.NN  {w, h, truc: trục đối xứng (x), lo: [x, y] tâm lỗ giữa trên trục (bán kính ≥ 8 điểm) hoặc null}
Đặt người ngồi xếp bằng trước pháp tượng (trang duyệt, sau này trong game): giữa hai chân (ngoi.NN.chan) đúng trục; có lỗ thì mặt
(30% chiều cao ảnh ngồi) ở tâm lỗ, không có lỗ thì đáy ảnh ngồi ở 92% chiều cao pháp tượng. Chủ dự án 16/11/2026 21:0x chấm "lệch" 6 cái
(#02 #04 #08 #11 #12 #14) khi bản đầu đặt mặt vào chỗ trống xa hình nhất, chỗ đó lệch khỏi trục.
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


def axis(e):
    """Trục đối xứng: lật gương mặt nạ, dời từng điểm, chỗ khớp nhất (phần không chồng tính là lệch); trả về (x trục, độ khớp)."""
    m = e[..., 3] > 0; W = m.shape[1]; f = m[:, ::-1]; best = (-1.0, (W - 1) / 2)
    for s in range(-W // 3, W // 3 + 1):
        a, b = (m[:, s:], f[:, :W - s]) if s >= 0 else (m[:, :W + s], f[:, -s:])
        v = (a & b).sum() / max(1, (a | b).sum() + (m.sum() - a.sum()) + (f.sum() - b.sum()))
        if v > best[0]: best = (float(v), (W - 1 + s) / 2)
    return best[1], round(best[0], 3)


def hole(e, ax):
    """Tâm lỗ giữa trên trục: điểm trong suốt xa hình nhất trong dải ±2 điểm quanh trục, 15–85% chiều cao; bán kính dưới 8 là không có lỗ."""
    H = e.shape[0]; dt = nd.distance_transform_edt(e[..., 3] == 0); x0, x1 = int(round(ax)) - 2, int(round(ax)) + 3
    z = np.zeros_like(dt); z[int(.15 * H):int(.85 * H), x0:x1] = dt[int(.15 * H):int(.85 * H), x0:x1]
    y, x = np.unravel_index(int(np.argmax(z)), z.shape)
    return ([round(ax, 1), int(y)], round(float(z[y, x]), 1)) if z[y, x] >= 8 else (None, 0)


def seat(e, ax, lo, ng, chan):
    """Góc trên trái ảnh ngồi trước pháp tượng: giữa hai chân đúng trục; mặt ở tâm lỗ, không có lỗ thì đáy ở 92% chiều cao."""
    x = round(ax - chan); y = round(lo[1] - ng.height * 0.30) if lo else round(e.shape[0] * 0.92) - ng.height + 1
    return x, y


def mock(n, e, ax, lo, out):
    """Người ngồi xếp bằng (trang phục mới #n) trước pháp tượng trên nền trong suốt: để trang duyệt so cỡ, so trục."""
    ng = Image.open(TP / 'ngoi' / f'{n:02d}.png').convert('RGBA'); H, W = e.shape[:2]
    chan = json.load(open(TP / 'ds.json', encoding='utf-8'))['ngoi'][f'{n:02d}']['chan']; ox, oy = seat(e, ax, lo, ng, chan)
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
        Image.fromarray(e, 'RGBA').save(D / 'tinh' / f'{n:02d}.png'); ax, fit = axis(e); lo, rad = hole(e, ax)
        ds['pt'][f'{n:02d}'] = {'w': int(e.shape[1]), 'h': int(e.shape[0]), 'truc': ax, 'khop': fit, 'lo': lo, 'lo_r': rad}
        if tam: mock(n, e, ax, lo, Path(tam) / f'ghep-{n:02d}.png')
        print(n, r.shape[1], 'x', r.shape[0], '→', e.shape[1], 'x', e.shape[0], 'trục', ax, 'khớp', fit, 'lỗ', lo, rad)
    json.dump(ds, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
