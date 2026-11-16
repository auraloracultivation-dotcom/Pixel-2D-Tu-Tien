"""Mốc cho hiệu ứng vẽ bằng code của từng bộ trang phục mới (chủ dự án 16/11/2026 18:57: "2 chiêu công kích lúc đứng phải đánh sang
bên phải, và phải có pháp lực đẩy ra"; 19:24 "làm hết all đi"), đo từ 4 chuyển động đã làm sạch nền sc/NN-<dung|chay|danh1|danh2>.webp:
  chan        chỗ chân: giữa 3 hàng điểm dưới cùng của khung đứng nghỉ đầu (khung SpriteCook đứng trên mép dưới);
  danhX.hit   khung ra đòn = khung đầu tiên trong 2–6 có bàn tay (điểm DA mới so với khung đầu, ở tầm ngực) vươn xa nhất bên phải;
              tay = ngay trước bàn tay khung đó (chỗ bắn pháp lực). Không thấy da (tay áo che) thì lấy mép trước như cũ;
  danhX.vuon  mép trước khung ra đòn vươn thêm bao nhiêu điểm so với khung đầu (dưới 2 thì ghi 'xem' để mắt người xem lại);
  danh2.ket_an chỗ hai tay chụm trước ngực ở khung ngay trước khung ra đòn = mép phải mảng da tay ở tầm ngực, bỏ mảng da mặt
              (linh lực tụ thành khí cầu nhỏ ở đó), tu_khi = [khung đầu, khung ra đòn];
  mau         4 màu hiệu ứng (lõi, giữa, ngoài, viền) theo màu áo từng bộ.
Ra: ds.json → bo.NN. --tam <thư mục>: thêm tấm ghép tpNN.png (4 hàng đứng nghỉ, chạy, đòn 1, đòn 2 × 8 khung) và tpNN-ngoi.png cho trang duyệt.
Chạy: python3 -I tools/art/trang_phuc_bo.py [NN …] [--tam <thư mục>]"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageSequence
from scipy import ndimage as nd

D = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'trang-phuc-moi'
MOTIONS = ['dung', 'chay', 'danh1', 'danh2']
MAU = {   # lõi, giữa, ngoài, viền (đặt theo áo, chủ dự án đổi được)
    1: ['#fff6d6', '#ffc93c', '#ff7a2f', '#e5323f'], 2: ['#f4fbff', '#8fd8ff', '#3f8fe0', '#2a4fb0'],
    3: ['#fbf2ff', '#d6a8ff', '#a35cf0', '#6a2fc0'], 4: ['#fff4f8', '#ffb3d1', '#ff6fa8', '#d63b7a'],
    5: ['#f2feff', '#a8ecff', '#4cc4f0', '#2a7fc8'], 6: ['#fff2c4', '#ffb43c', '#ff5a1f', '#c0201a'],
    7: ['#f6ffe8', '#b8f070', '#5cc84a', '#2f8a3a'], 8: ['#fff8e0', '#ffd36b', '#e09a2a', '#7a3f12'],
    9: ['#fdf6ff', '#e5c6ff', '#b48cf0', '#7a54c8'], 10: ['#f4fbff', '#bfe3ff', '#6fb4f0', '#3a78c8'],
    11: ['#ffffff', '#d8ecff', '#7aa8e8', '#34508f'], 12: ['#fff4fd', '#f0c4f0', '#c890e6', '#8a58b8'],
    13: ['#effffb', '#9ff0dc', '#36c8b0', '#1a8a80'], 14: ['#fff0d8', '#ff9a4a', '#f0502a', '#a8201f'],
    15: ['#fff2f2', '#ff9aa8', '#f0465a', '#b01e3a'], 16: ['#f8fbff', '#cfd9ff', '#8c9ee8', '#4a56a8'],
}


def frames(p):
    return [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(p))]


def band(a0):
    """Tầm ngực, tay: 58–85% chiều cao người tính từ đỉnh đầu ở khung đầu (#1: hàng 38–51, tay đẩy ở hàng 43,5)."""
    ys = np.nonzero((a0[..., 3] > 0).any(1))[0]; t, h = ys.min(), ys.max() - ys.min()
    return int(t + 0.58 * h), int(round(t + 0.85 * h))


def front(a, a0):
    """Mép trước (phải) ở tầm ngực: trả về (x xa nhất, y trung bình các hàng chạm tới đó). Khung khác khung đầu thì chỉ tính điểm
    MỚI so với khung đầu (tay vươn ra), để tóc, búi tóc to lệch theo người không bị nhận nhầm là tay (#3)."""
    al = a[..., 3] > 0; y0, y1 = band(a0)
    if a is not a0:
        o = a0[..., 3] > 0; g = o.copy(); g[:, 1:] |= o[:, :-1]; g[:, :-1] |= o[:, 1:]; g[1:] |= o[:-1]; g[:-1] |= o[1:]
        if (al & ~g)[y0:y1 + 1].any(): al = al & ~g
    rows = [(y, int(np.nonzero(al[y])[0].max())) for y in range(y0, y1 + 1) if al[y].any()]
    bx = max(x for _, x in rows)
    return bx, round(float(np.mean([y for y, x in rows if x >= bx - 1])), 1)


def skin(a):
    """Da (bàn tay, mặt): sáng, ấm, R ≥ G ≥ B; áo trắng (R≈B), vàng kim (B thấp), tóc tím hồng (B > G) không lọt."""
    c = a[..., :3].astype(int); r, g, b = c[..., 0], c[..., 1], c[..., 2]
    return (a[..., 3] > 0) & (r > 190) & (g > 140) & (b > 110) & (r >= g) & (g >= b) & (r - b >= 25) & (r - b <= 110)


def grow(m):
    g = m.copy(); g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]; g[1:] |= m[:-1]; g[:-1] |= m[1:]
    return g


def palm(fr):
    """Bàn tay đẩy chưởng = điểm DA MỚI (không có ở khung đầu) xa nhất bên phải ở tầm ngực; trả về điểm ngay trước bàn tay.
    Tóc dài buông trước ngực lay theo người cũng là điểm mới (#10 đòn 1: tóc khung 6 ra xa hơn bàn tay khung 4), nên tìm theo da."""
    s0 = grow(skin(fr[0])); y0, y1 = band(fr[0]); out = [None]
    for a in fr[1:]:
        m = skin(a) & ~s0; m[:y0] = False; m[y1 + 1:] = False; ys, xs = np.nonzero(m)
        out.append((int(xs.max()) + 1, round(float(ys[xs >= xs.max() - 1].mean()), 1)) if len(xs) >= 2 else None)
    return out


def seal(a, a0):
    """Hai tay kết ấn: điểm da xa nhất bên phải ở tầm ngực, chỉ tính mảng da không chạm lên trên tầm ngực (mảng đó là mặt).
    Mép trước điểm mới (cách cũ) nhận nhầm tóc sau lưng khi tay nằm trong bóng người (#4, #11, #12: x 8–11)."""
    y0, y1 = band(a0); lab, n = nd.label(skin(a)); keep = np.zeros(a.shape[:2], bool)
    for i in range(1, n + 1):
        c = lab == i
        if np.nonzero(c.any(1))[0].min() >= y0 - 1: keep |= c
    keep[:y0] = False; keep[y1 + 1:] = False; ys, xs = np.nonzero(keep)
    return (int(xs.max()), round(float(ys[xs >= xs.max() - 1].mean()), 1)) if len(xs) else None


def strike(fr):
    f0 = front(fr[0], fr[0]); fs = [f0] + [front(a, fr[0]) for a in fr[1:]]; ps = palm(fr); rng = range(2, min(7, len(fr)))
    if any(ps[i] for i in rng):
        hit = max((i for i in rng if ps[i]), key=lambda i: (ps[i][0], -i)); tay = ps[hit]
    else:
        hit = max(rng, key=lambda i: (fs[i][0], -i)); tay = fs[hit]
    return hit, fs, tay, fs[hit][0] - f0[0]


def foot(a):
    ys, xs = np.nonzero(a[-3:, :, 3] > 0)
    return round(float(xs.mean()), 1)


def one(n, ds, tam):
    k = f'{n:02d}'; fr = {m: frames(D / 'sc' / f'{k}-{m}.webp') for m in MOTIONS}
    fh, fw = fr['dung'][0].shape[:2]
    assert all(len(v) == 8 and v[0].shape[:2] == (fh, fw) for v in fr.values()), k
    r = {'khung': [fw, fh], 'chan': [foot(fr['dung'][0]), fh - 1], 'fps': {'dung': 8, 'chay': 12, 'danh': 12}, 'mau': dict(zip(['core', 'mid', 'outer', 'edge'], MAU[n]))}
    for m in ('danh1', 'danh2'):
        hit, fs, tay, vuon = strike(fr[m]); d = {'hit': hit, 'tay': [tay[0], tay[1]], 'vuon': vuon}
        if vuon < 2: d['xem'] = 'tay vươn ít, xem lại'
        if m == 'danh2':
            s = seal(fr[m][hit - 1], fr[m][0]) or (fs[hit - 1][0] - 1, fs[hit - 1][1]); d['ket_an'] = [s[0], s[1]]; d['tu_khi'] = [1, hit]
        r[m] = d
    ng = ds.get('ngoi', {}).get(k)
    if ng:
        a = np.array(Image.open(D / 'ngoi' / f'{k}.png').convert('RGBA')); ng['chan'] = foot(a)
    if tam:
        sh = Image.new('RGBA', (8 * fw, 4 * fh), (0, 0, 0, 0))
        for row, m in enumerate(MOTIONS):
            for i, a in enumerate(fr[m]): sh.alpha_composite(Image.fromarray(a, 'RGBA'), (i * fw, row * fh))
        sh.save(Path(tam) / f'tp{k}.png')
        if ng: Image.open(D / 'ngoi' / f'{k}.png').save(Path(tam) / f'tp{k}-ngoi.png')
    return r


def main(argv):
    tam = argv[argv.index('--tam') + 1] if '--tam' in argv else None
    ns = [int(x) for x in argv if x.isdigit() and (not tam or x != tam)]
    p = D / 'ds.json'; ds = json.load(open(p, encoding='utf-8')); ds.setdefault('bo', {})
    ns = ns or [n for n in range(1, 17) if all((D / 'sc' / f'{n:02d}-{m}.webp').exists() for m in MOTIONS)]
    for n in ns:
        r = one(n, ds, tam); old = ds['bo'].get(f'{n:02d}', {}); r['_note'] = old.get('_note', ''); ds['bo'][f'{n:02d}'] = r
        print(n, r['khung'], r['chan'], 'đòn1', r['danh1']['hit'], r['danh1']['tay'], r['danh1']['vuon'], 'đòn2', r['danh2']['hit'], r['danh2']['tay'], r['danh2']['vuon'])
    json.dump(ds, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
