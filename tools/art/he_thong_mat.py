"""Biểu cảm Hệ Thống Tu Tiên (chủ dự án 06/11/2026 19:03, ảnh GPT do chủ dự án tạo, giao Claude phụ trách).

Nguồn: tools/art/nguon/ai/he-thong/
  bieu-cam-16.png  lưới 4×4: 16 biểu cảm (thứ tự như câu lệnh: bình thường, Đinh!, kiêu, lè lưỡi, cười lăn, nhếch mép, vỗ tay chán,
                   ôm mặt, giận, sốc, khóc giả, ngáp, nháy mắt, phấn khích, ngượng, mưu mô)
  khen-9.png       lưới 3×3: chuỗi khung "khen" (giơ ngón cái, cười)
  dam-9.png        lưới 3×3: chuỗi khung "vung nắm đấm" (đắc ý trêu tức)
Cắt từng ô theo khe trống, bỏ điểm mờ (viền nhoè đỏ vàng của ảnh GPT), xếp chung một khung, thu về điểm ảnh thật bằng màu đa số
(tools/art/ai_import.py), gom màu, viền mực. Ra một dải khung assets/art/he-thong/mat.png (mọi khung cùng cỡ, xếp ngang) và in
danh sách khung cho data/he-thong.json → mat.
Chạy: python3 -I tools/art/he_thong_mat.py [--h 56]
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_import import shrink, quantize, outline

SRC = 'tools/art/nguon/ai/he-thong'
OUT = 'assets/art/he-thong/mat.png'
SHEETS = [('bieu-cam-16', ['thuong', 'dinh', 'kieu', 'le-luoi', 'cuoi-lan', 'nhech', 'vo-tay', 'om-mat', 'gian', 'soc', 'khoc-gia', 'ngap',
                           'nhay-mat', 'phan-khich', 'nguong', 'muu-mo']),
          ('khen-9', [f'khen-{i}' for i in range(9)]),
          ('dam-9', [f'dam-{i}' for i in range(9)])]


def spans(p, minlen=20):
    on = p >= 3
    out, s = [], None
    for i, v in enumerate(list(on) + [False]):
        if v and s is None: s = i
        if not v and s is not None:
            if i - s >= minlen: out.append((s, i))
            s = None
    return out


def cells(a):
    solid = a[:, :, 3] >= 160
    out = []
    for y0, y1 in spans(solid.sum(1)):
        band = solid[y0:y1]
        for x0, x1 in spans(band.sum(0)):
            out.append((y0, y1, x0, x1))
    return out


def clean(c):
    c = c.copy()
    c[c[:, :, 3] < 160] = 0
    c[:, :, 3] = np.where(c[:, :, 3] > 0, 255, 0)
    return c


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--h', type=int, default=64); ap.add_argument('--colors', type=int, default=24)
    o = ap.parse_args()
    frames = []   # (tên, ảnh đã cắt sạch)
    for sheet, names in SHEETS:
        a = np.array(Image.open(f'{SRC}/{sheet}.png').convert('RGBA'))
        cs = cells(a)
        if len(cs) != len(names):
            raise SystemExit(f'{sheet}: cắt ra {len(cs)} ô, cần {len(names)}')
        for n, (y0, y1, x0, x1) in zip(names, cs):
            frames.append((n, clean(a[y0:y1, x0:x1])))
    # các tấm vẽ cỡ khác nhau: phóng từng tấm cho thân tinh thể bằng nhau (cao trung vị mỗi tấm = cao trung vị tấm lớn nhất)
    by = {}
    for (sheet, names) in SHEETS:
        hs = sorted(f.shape[0] for n, f in frames if n in names); by[sheet] = hs[len(hs) // 2]
    ref = max(by.values())
    scaled = []
    for sheet, names in SHEETS:
        k = ref / by[sheet]
        for n, f in frames:
            if n in names:
                im = Image.fromarray(f).resize((round(f.shape[1] * k), round(f.shape[0] * k)), Image.NEAREST)
                scaled.append((n, np.array(im)))
    frames = scaled
    # chung một khung: căn giữa ngang, căn đáy (quả chuông vàng dưới chân), cao bằng ô cao nhất
    H = max(f.shape[0] for _, f in frames); W = max(f.shape[1] for _, f in frames)
    canv = []
    for n, f in frames:
        c = np.zeros((H, W, 4), np.uint8); h, w = f.shape[:2]
        c[H - h:, (W - w) // 2:(W - w) // 2 + w] = f
        canv.append((n, c))
    th = o.h - 2
    tw = max(1, round(W * th / H))
    small = [(n, outline(quantize(shrink(c, th), o.colors))) for n, c in canv]
    fh, fw = small[0][1].shape[:2]
    small = [(n, s) if s.shape[:2] == (fh, fw) else (n, np.array(Image.fromarray(s).resize((fw, fh), Image.NEAREST))) for n, s in small]
    strip = np.concatenate([s for _, s in small], axis=1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    Image.fromarray(strip, 'RGBA').save(OUT, optimize=True)
    Image.fromarray(strip, 'RGBA').resize((strip.shape[1] * 3, strip.shape[0] * 3), Image.NEAREST).save('/tmp/he-thong-mat-zoom.png')
    print(json.dumps({'src': OUT, 'w': fw, 'h': fh, 'frames': [n for n, _ in small]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
