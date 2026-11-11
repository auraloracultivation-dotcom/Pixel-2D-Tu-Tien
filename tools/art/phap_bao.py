"""Hệ Pháp Bảo Luyện Chế (chủ dự án 12/11/2026, trang thiết kế https://claude.ai/artifact/8JeWpJgWcutqtPEuw4kM5z).
Nguồn ở tools/art/nguon/ai/phap-bao/:
  goc/pb-*.png  hình pháp bảo (ảnh GPT, đã thu về cạnh 640) → 'pb.<loại>' cao 40, 16 màu, viền mực (ai_import)
  goc/ck-*.png  biểu tượng chiêu khảm → 'ck.<chiêu>' cao 32 (chiêu ngang dài cao 26), 12 màu
  sc/*.webp     chuyển động SpriteCook (pixel-engine-v1.1, 8 khung, 20 credit mỗi cái) từ ảnh tĩnh goc/hu-*.png
                → 'pbfx.<loại>': cắt chung khung, bỏ chấm xám lọt nền, thu 1/2 (vẽ mượt trong game)
Biểu tượng chiêu ngũ hành, Lôi Kích lấy một khung hiệu ứng có sẵn (fx.fire, fx.ice, fx.vine, fx.rock, fx.bolt) → 'ck.<hệ>'.
Dựng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import colorsys
import numpy as np
from PIL import Image, ImageSequence
from scipy import ndimage as nd
from px import Canvas
import ai_import as ai

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'phap-bao'
ART = Path(__file__).resolve().parents[2] / 'assets' / 'art'
TALL = {'ck-lien-phat': 26, 'ck-xuyen-thau': 26, 'ck-truy-kich': 26}
# hệ, Lôi Kích: (hình có sẵn, khung)
BORROW = {'hoa': ('fx-fire.png', 22, 3), 'thuy': ('fx-ice.png', 36, 5), 'moc': ('fx-vine.png', 30, 3), 'tho': ('fx-rock.png', 38, 3), 'loi-kich': ('fx-bolt.png', 36, 2)}
FX = {'linh-chau': 'linh-chau.webp', 'dai-an': 'dai-an.webp', 'ho-lo': 'ho-lo.webp'}


def _canvas(a):
    cv = Canvas(a.shape[1], a.shape[0]); cv.a = a.astype(np.uint8); return cv


def _icon(path, h, colors):
    a = np.array(Image.open(path).convert('RGBA'))
    a = ai.crop(ai.remove_bg(a, 40))
    return ai.outline(ai.quantize(ai.shrink(a, h - 2), colors))


def _clean(a):
    """Bỏ chấm xám lọt nền (ít sắc, tối vừa) và vụn lẻ dưới 4 điểm ảnh."""
    rgb = a[:, :, :3].astype(int); mx, mn = rgb.max(2), rgb.min(2)
    gray = (a[:, :, 3] > 0) & (mx - mn < 16) & (mx > 30) & (mx < 150)
    a[gray] = 0
    lab, n = nd.label(a[:, :, 3] > 0)
    if n:
        sz = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
        for i, s in enumerate(sz):
            if s < 4: a[lab == i + 1] = 0
    return a


def _fx(path):
    fr = [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(path))]
    fr = [_clean(f) for f in fr]
    m = np.zeros(fr[0].shape[:2], bool)
    for f in fr: m |= f[:, :, 3] > 0
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = []
    for f in fr:
        im = Image.fromarray(f[y0:y1, x0:x1]).resize(((x1 - x0 + 1) // 2, (y1 - y0 + 1) // 2), Image.LANCZOS)
        out.append(_canvas(np.array(im)))
    return out


def build(save):
    n = 0
    for f in sorted((SRC / 'goc').glob('pb-*.png')):
        a = _icon(f, 40, 16); save('pb.' + f.stem[3:], [_canvas(a)], (a.shape[1] // 2, a.shape[0] - 1), 'Pháp bảo: ' + f.name); n += 1
    for f in sorted((SRC / 'goc').glob('ck-*.png')):
        a = _icon(f, TALL.get(f.stem, 32), 12); save('ck.' + f.stem[3:], [_canvas(a)], (a.shape[1] // 2, a.shape[0] // 2), 'Chiêu khảm: ' + f.name); n += 1
    for k, (fn, w, i) in BORROW.items():
        im = Image.open(ART / fn).convert('RGBA'); a = np.array(im.crop((i * w, 0, (i + 1) * w, im.height)))
        ys, xs = np.nonzero(a[:, :, 3]); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        save('ck.' + k, [_canvas(a)], (a.shape[1] // 2, a.shape[0] // 2), f'Chiêu khảm: khung {i} của {fn}'); n += 1
    for k, fn in FX.items():
        fr = _fx(SRC / 'sc' / fn)
        save('pbfx.' + k, fr, (fr[0].w // 2, fr[0].h // 2), f'Hiệu ứng pháp bảo: SpriteCook {fn} ({len(fr)} khung, thu 1/2)'); n += 1
    print('pháp bảo:', n, 'hình')
    return n
