"""Bộ khung giao diện theo ảnh của chủ dự án (17/11/2026 02:20: gửi tấm bộ khung tím viền bạc, "áp dụng thử đi, tôi muốn kết quả giống ảnh 2").
Ảnh tĩnh của chủ dự án dùng thẳng (CLAUDE.md "ảnh tĩnh dùng ảnh GPT của chủ dự án"): không đồ lại điểm ảnh, không gom màu (bản 02:1x thu về
điểm ảnh 1:1 làm mất chi tiết, chủ dự án chê "xấu, không giống"), chỉ cắt từng món, làm đặc nền (alpha ≥ 200 thành 255) và:
  - bảng trên (cả bố cục: ô ảnh đại diện, 4 thanh, 8 ô chức năng, ô bản đồ, vương miện): xoá 4 thanh vẽ sẵn (game vẽ thanh thật đè lên đúng chỗ);
  - ô vuông nhỏ: thêm bản chỉ còn viền (-vien) để đè lên hình pháp bảo.
Ra assets/art/ui-kg-<tên>.png; số đo vị trí các ô trong bảng trên (điểm ảnh của ảnh gốc) dùng ở src/ui/hud-khung.css.
Chạy: python3 -I tools/art/khung_kg.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(R, 'tools/art/nguon/ai/khung-ui/bo-khung-chu-du-an.png')
# tên: (x, y, rộng, cao) trên ảnh gốc 2172 × 724 (tìm bằng vùng alpha > 40)
BOX = {'tren': (23, 3, 1585, 387), 'danh': (1852, 397, 290, 299), 'bang-mien': (33, 400, 578, 185), 'bang': (646, 416, 608, 270),
       'o': (1286, 459, 130, 131), 'the': (35, 600, 322, 99), 'vien-tron': (1396, 617, 260, 87)}
BARS = (300, 182, 662, 353)   # vùng 4 thanh vẽ sẵn trong bảng trên (x0, y0, x1, y1, ảnh gốc)


def cut(a, name):
    x, y, w, h = BOX[name]
    p = a[y:y + h, x:x + w].copy()
    lab, _ = ndimage.label(p[:, :, 3] > 40)   # chỉ giữ mảng lớn nhất (bỏ mẩu món bên cạnh lọt vào khung cắt)
    big = np.argmax(np.bincount(lab.ravel())[1:]) + 1
    p[lab != big, 3] = 0
    p[p[:, :, 3] >= 200, 3] = 255
    return p


def rim(p):
    """Bỏ lòng khung: loang từ giữa qua các điểm gần màu lòng thành trong suốt."""
    h, w = p.shape[:2]
    fill = p[h // 2, w // 2, :3].astype(int)
    near = (p[:, :, 3] > 0) & (np.abs(p[:, :, :3].astype(int) - fill).sum(axis=2) < 90)
    lab, _ = ndimage.label(near)
    out = p.copy()
    out[lab == lab[h // 2, w // 2], 3] = 0
    return out


def main():
    a = np.array(Image.open(SRC).convert('RGBA'))
    for name in BOX:
        p = cut(a, name)
        if name == 'tren':   # xoá 4 thanh vẽ sẵn: chép cột nền ngay bên trái vùng thanh sang cả vùng
            x0, y0, x1, y1 = (v - o for v, o in zip(BARS, (23, 3, 23, 3)))
            p[y0:y1, x0:x1] = p[y0:y1, x0 - 6:x0 - 5]
        Image.fromarray(p, 'RGBA').save(os.path.join(R, f'assets/art/ui-kg-{name}.png'), optimize=True)
        if name == 'o':
            Image.fromarray(rim(p), 'RGBA').save(os.path.join(R, 'assets/art/ui-kg-o-vien.png'), optimize=True)
        print(name, p.shape[1], p.shape[0])


if __name__ == '__main__':
    main()
