"""Thời trang Thần Nguyên Y (chủ dự án 04/11/2026 13:15–13:32): hình chủ dự án gửi (nguon/ai/nv/thien-su-goc.png), động tác làm
bằng SpriteCook từ hình đó: đứng thở, chạy, phép 1 (đẩy chưởng), phép 2 (vung tay, đập cánh), mỗi động tác 8 khung
(nguon/ai/nv/than-nguyen-y-<động tác>.webp). Khung khác cỡ (124 / 128) gộp về chung ô 128, canh giữa, chung đáy (chân).
Xuất 'hero.tny', 'hero.ly-hoa' 32 khung: 0–7 đứng, 8–15 chạy, 16–23 phép 1, 24–31 phép 2 (data/fashion.json → than-nguyen-y.look)."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'nv'
PARTS = ['dung', 'chay', 'danh1', 'danh2']
N = 8
# bộ: (tên tệp gốc, ô vuông khung, tên hình) — Ly Hoa (chủ dự án 04/11/2026 14:23): hình nghiêng phải, đòn 1 tay trái, đòn 2 tay phải
SETS = [('than-nguyen-y', 128, 'hero.tny', 'thời trang Thần Nguyên Y'), ('ly-hoa', 100, 'hero.ly-hoa', 'thời trang Ly Hoa')]


def build(save):
    for name, S, sid, note in SETS:
        _one(save, name, S, sid, note)
    return len(SETS)


def _one(save, name, S, sid, note):
    frames = []
    for p in PARTS:
        im = Image.open(SRC / f'{name}-{p}.webp').convert('RGBA'); fw = im.width // N
        for i in range(N):
            f = np.array(im.crop((i * fw, 0, i * fw + fw, im.height)))
            ys = np.nonzero(f[:, :, 3] > 40)[0]; bot = ys.max() if len(ys) else f.shape[0] - 1
            out = np.zeros((S, S, 4), np.uint8); ox = (S - fw) // 2; oy = (S - 3) - bot   # chân cách đáy ô 3 điểm
            src_y0 = max(0, -oy); dst_y0 = max(0, oy); h = min(f.shape[0] - src_y0, S - dst_y0)
            out[dst_y0:dst_y0 + h, ox:ox + fw] = f[src_y0:src_y0 + h]
            c = Canvas(S, S); c.a = out; frames.append(c)
    save(sid, frames, (S // 2, S - 3), note + ' (SpriteCook): đứng, chạy, đòn 1, đòn 2; mỗi động tác 8 khung')
