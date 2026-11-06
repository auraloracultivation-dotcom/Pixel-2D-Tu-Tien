"""Thời trang Tử Linh Ma Yêu (chủ dự án 06/11/2026 20:31: bộ chủ dự án tạo trên SpriteCook, lấy về, cao 1m78; 20:35 duyệt bảng chỉ số:
nặng 62kg, vệt chém tím, quầng tử khí, chuỗi đâm + bổ). Ảnh gốc ở nguon/ai/tu-linh/: dung.png (ảnh tĩnh 72×72), 4 động tác 8 khung
84×84 (nghi, chay, bo, dam .webp) nền xám đặc, khoá màu nền thành trong suốt. Gộp về chung ô S, đáy khung trùng đáy ô, giữ độ phân giải (game tự thu, có làm mịn).
Xuất 'hero.tu-linh' 32 khung: 0–7 nghỉ, 8–15 chạy, 16–23 bổ chéo xuống phía phải, 24–31 đâm thẳng (data/fashion.json → tu-linh-ma-yeu.look).
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageSequence
from px import Canvas

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'tu-linh'
PARTS = ['nghi', 'chay', 'bo', 'dam']
FOOT = 2   # chân cách đáy ô


def build(save):
    sheets = [[f.convert('RGBA').copy() for f in ImageSequence.Iterator(Image.open(SRC / f'{p}.webp'))] for p in PARTS]
    fw = max(f.height for fr in sheets for f in fr)
    S = fw + FOOT
    frames = []
    for fr in sheets:
        for f in fr[:8]:
            out = np.zeros((S, S, 4), np.uint8); a = np.array(f)
            oy = S - FOOT - a.shape[0]; ox = (S - a.shape[1]) // 2
            out[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
            out[:, :, 3] = np.where(out[:, :, 3] >= 40, out[:, :, 3], 0)   # bỏ viền mờ lấm tấm
            bg = a[0, 0, :3].astype(int)   # tấm SpriteCook nền xám đặc (~126,126,126): khoá màu nền thành trong suốt
            if a[0, 0, 3] == 255:
                key = np.abs(out[:, :, :3].astype(int) - bg).max(2) <= 8
                out[key] = 0
            c = Canvas(S, S); c.a = out; frames.append(c)
    save('hero.tu-linh', frames, (S // 2, S - FOOT - 1), 'thời trang Tử Linh Ma Yêu (SpriteCook): nghỉ, chạy, bổ, đâm; mỗi động tác 8 khung')
    return 1
