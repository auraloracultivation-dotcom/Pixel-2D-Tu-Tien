"""Ảnh ngồi xếp bằng vận khí cầu của bộ trang phục mới (chủ dự án 16/11/2026 18:57: "khi xếp bằng thì phải tụ quả cầu linh lực ở giữa,
mắt không được nhắm"). Ảnh SpriteCook ngoi/NN-sc.png (Nano Banana 2.1 sửa từ ô tranh gốc nguon-sc/NN-hd.png theo dáng mau-ngoi.png,
tools/art/trang_phuc_cau_lenh.py) về cỡ điểm game CÙNG CỠ ĐẦU với ảnh đứng tinh/NN.png:
  hệ số = K của trang_phuc_moi.py × (cỡ mặt trên tranh gốc / cỡ mặt trên ảnh ngồi); mặt = mảng màu da lớn nhất (đo, không chỉnh bằng mắt).
  Ngồi không được cao hơn đứng: SpriteCook vẽ thân lúc ngồi to hơn thân lúc đứng (bộ #1: cùng cỡ mặt thì ngồi cao 55, đứng 51), nên
  chặn ở chiều cao ảnh đứng; mặt nhỏ đi chưa tới 1 điểm (#1: 12,6 → 11,7).
Rồi như ảnh đứng: giữ điểm đục, bỏ chấm rời, gom 24 màu, giữ mắt, viền mực.
Tâm khí cầu = giữa mảng lõi vàng trắng sáng nhất (khí cầu có sẵn trong ảnh, nhỏ); code vẽ quầng sáng nhịp thở và linh lực tụ về đúng chỗ đó.
Ra: ngoi/NN.png; ds.json → ngoi.NN {w, h, cau: [x, y] (điểm game, gốc trên trái), k}. Chạy: python3 -I tools/art/trang_phuc_ngoi.py [NN …]"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_import import shrink, quantize, outline
from quai_tinh import drop_specks, auto_masks, paint_small

D = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'trang-phuc-moi'
COLORS = 24


def biggest(m):
    lab, n = nd.label(m)
    if not n: return None
    i = 1 + int(np.argmax(nd.sum(m, lab, range(1, n + 1)))); ys, xs = np.nonzero(lab == i)
    return xs.min(), xs.max(), ys.min(), ys.max(), xs.mean(), ys.mean()


def face(a):
    """Khung mảng da lớn nhất (mặt): sáng, ấm, R ≥ G ≥ B; áo trắng (R≈B) và vàng kim (B thấp) không lọt."""
    c = a[..., :3].astype(int); r, g, b = c[..., 0], c[..., 1], c[..., 2]
    f = biggest((a[..., 3] >= 200) & (r > 200) & (g > 165) & (b > 135) & (r >= g) & (g >= b) & (r - b > 20))
    return f[1] - f[0] + 1, f[3] - f[2] + 1


def orb(a):
    """Lõi khí cầu: vàng trắng rất sáng (R, G cao, B vừa); da (G thấp hơn) và áo trắng (B cao) không lọt. Chỉ tìm ở tầm ngực
    (45–90% chiều cao): sừng, trâm vàng nhạt trên đầu cũng sáng như lõi khí cầu (#13 sừng vàng)."""
    c = a[..., :3].astype(int); h = a.shape[0]; zone = np.zeros(a.shape[:2], bool); zone[int(h * 0.45):int(h * 0.9)] = True
    f = biggest(zone & (a[..., 3] >= 200) & (c[..., 0] >= 250) & (c[..., 1] >= 230) & (c[..., 2] >= 150) & (c[..., 2] <= 215))
    return None if f is None else (f[4], f[5])


def one(n, K, hs):
    k = f'{n:02d}'
    hd = np.array(Image.open(D / 'nguon-sc' / f'{k}-hd.png').convert('RGBA'))
    c = np.array(Image.open(D / 'ngoi' / f'{k}-sc.png').convert('RGBA')); c[..., 3] = np.where(c[..., 3] >= 200, 255, 0)
    c = drop_specks(c, 0.002); ys, xs = np.nonzero(c[..., 3] > 0); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    fw, fh = face(hd); sw, sh = face(c); ks = K * (fw / sw + fh / sh) / 2
    th = max(12, min(round(c.shape[0] * ks), hs - 2)); ks = th / c.shape[0]; q = quantize(shrink(c, th), COLORS)   # hs: cao ảnh đứng kể cả viền
    for em in auto_masks(c): paint_small(q, c, em, th)
    out = outline(q); oy, ox = np.nonzero(out[..., 3]); y0, x0 = oy.min(), ox.min(); out = out[y0:oy.max() + 1, x0:ox.max() + 1]
    Image.fromarray(out, 'RGBA').save(D / 'ngoi' / f'{k}.png')
    s = q.shape[0] / c.shape[0]; o = orb(c)   # outline() thêm 1 điểm viền mỗi phía rồi cắt lại theo khung đục
    cau = None if o is None else [round(o[0] * s + 1 - x0, 1), round(o[1] * s + 1 - y0, 1)]
    return {'w': int(out.shape[1]), 'h': int(out.shape[0]), 'cau': cau, 'k': round(ks, 4), 'mat': [int(sw), int(sh)]}


def main(ns):
    p = D / 'ds.json'; ds = json.load(open(p, encoding='utf-8')); ds.setdefault('ngoi', {})
    for n in ns:
        r = one(n, ds['k'], ds['ds'][n - 1]['h']); ds['ngoi'][f'{n:02d}'] = r; print(n, r)
    json.dump(ds, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main([int(x) for x in sys.argv[1:]] or [int(f.name[:2]) for f in sorted((D / 'ngoi').glob('??-sc.png'))])
