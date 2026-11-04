"""Thời trang Huyết Nguyệt (chủ dự án 04/11/2026 23:04–23:26): ảnh chủ dự án gửi (nguon/ai/nhan-vat/huyet-nguyet-goc.png),
SpriteCook bỏ khói, nền (huyet-nguyet-sua.png, chủ dự án duyệt), rồi làm 5 động tác 8 khung từ ảnh đó: nghỉ, chạy, chém chéo xuống
phía phải, chém ngược quét về trái, đâm thẳng tới (hn-<động tác>.webp). Giữ mặt trăng, rồng đỏ phía sau.
Các tấm SpriteCook chỉ thêm lề hai bên và phía trên (đáy là mặt đất), cùng tỉ lệ với ảnh gốc: gộp về chung ô S, canh giữa ngang,
đáy tấm trùng đáy ô (không canh theo điểm thấp nhất từng khung để khỏi giật). Giữ nguyên độ phân giải (game tự thu nhỏ có làm mịn).
Xuất 'hero.huyet-nguyet' 40 khung: 0–7 nghỉ, 8–15 chạy, 16–23 chém 1, 24–31 chém 2, 32–39 đâm (data/fashion.json → huyet-nguyet.look).
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'nhan-vat'
PARTS = ['nghi', 'chay', 'chem1', 'chem2', 'dam']
N = 8
FOOT = 2   # chân cách đáy ô


def build(save):
    sheets = [Image.open(SRC / f'hn-{p}.webp').convert('RGBA') for p in PARTS]
    S = max(im.height for im in sheets) + FOOT
    frames = []
    for im in sheets:
        fw = im.height
        for i in range(N):
            f = np.array(im.crop((i * fw, 0, i * fw + fw, fw)))
            out = np.zeros((S, S, 4), np.uint8); ox = (S - fw) // 2; oy = S - FOOT - fw
            out[oy:oy + fw, ox:ox + fw] = f
            c = Canvas(S, S); c.a = out; frames.append(c)
    save('hero.huyet-nguyet', frames, (S // 2, S - FOOT - 1), 'thời trang Huyết Nguyệt (SpriteCook): nghỉ, chạy, chém 1, chém 2, đâm; mỗi động tác 8 khung')
    return 1
