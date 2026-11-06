"""Rương triệu hồi của Hệ Thống (chủ dự án 06/11/2026 23:19, ảnh GPT do chủ dự án tạo): tấm tools/art/nguon/ai/he-thong/ruong.png có
rương đóng (trái) và rương mở (phải). Cắt hai hình theo khe trống, bỏ điểm mờ, thu về điểm ảnh thật cùng một tỉ lệ (rương đóng cao H),
gom màu, viền mực (tools/art/ai_import.py). Ra assets/art/he-thong/ruong-dong.png, ruong-mo.png (cùng đáy, cùng bề ngang khung).
Chạy: python3 -I tools/art/he_thong_ruong.py [--h 56]"""
import argparse, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_import import shrink, quantize, outline, crop

ap = argparse.ArgumentParser(); ap.add_argument('--h', type=int, default=56); ap.add_argument('--colors', type=int, default=64); o = ap.parse_args()
a = np.array(Image.open('tools/art/nguon/ai/he-thong/ruong.png').convert('RGBA'))
a[a[:, :, 3] < 160] = 0; a[:, :, 3] = np.where(a[:, :, 3] > 0, 255, 0)
cols = (a[:, :, 3] > 0).sum(0); mid = a.shape[1] // 2
gap = min(range(mid - 200, mid + 200), key=lambda x: cols[x])   # khe giữa hai rương
dong, mo = crop(a[:, :gap]), crop(a[:, gap:])
k = (o.h - 2) / dong.shape[0]
out = {}
for n, im in (('dong', dong), ('mo', mo)):
    out[n] = outline(quantize(shrink(im, max(1, round(im.shape[0] * k))), o.colors))
W = max(x.shape[1] for x in out.values()); H = max(x.shape[0] for x in out.values())
os.makedirs('assets/art/he-thong', exist_ok=True)
for n, im in out.items():
    c = np.zeros((H, W, 4), np.uint8); h, w = im.shape[:2]
    c[H - h:, (W - w) // 2:(W - w) // 2 + w] = im
    Image.fromarray(c, 'RGBA').save(f'assets/art/he-thong/ruong-{n}.png', optimize=True)
    print(n, W, H)
