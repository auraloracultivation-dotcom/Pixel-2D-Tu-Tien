"""Màn đăng nhập và màn tải "đêm trăng" (chủ dự án 12/11/2026 07:46 gửi 2 ảnh GPT: "thêm màn hình chờ và màn đăng nhập nền mới").
Theo lệ màn đăng nhập (02/11/2026 22:51: giao diện giữ độ phân giải gốc, không thu về điểm ảnh), chỉ cắt, làm sạch, thu cỡ vừa máy, nén:
  - nền: nguon/ai/ui/nen-dem-trang-goc.png (1145×1374, trăng, chùa, thác, hoa đào) → assets/icon/splash-dem.jpg (ngang 960, JPEG)
  - khung: nguon/ai/ui/khung-dn-dem-goc.png (1218×1291, nền trong suốt, mái chùa âm dương, 2 ô nhập, nút Đăng nhập / Đăng ký vẽ sẵn; chữ trên nút xoá, chữ thật do trang đặt)
    → assets/art/ui-dn-khung-dem.png (cắt sát hình, mép mờ GPT (alpha 1–2) bỏ, lòng đặc alpha 253 thành 255, ngang 768, gom 256 màu)
Ô nhập và nút thật đặt chồng đúng chỗ vẽ (tỉ lệ % in ra khi chạy, dùng ở style-man-dau.css). Ảnh gốc không đưa vào kho (.gitignore).
Chạy: python3 -I tools/art/man_dn_dem.py"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools' / 'art' / 'nguon' / 'ai' / 'ui'
BG_W, FR_W = 960, 768
# chỗ vẽ sẵn trên tấm khung gốc (x0, y0, x1, y1), đo bằng màu (ô nhập xanh đen, nút vàng)
SPOTS = {'acc': (327, 475, 806, 570), 'pwd': (327, 601, 806, 697), 'login': (345, 774, 880, 886), 'signup': (447, 922, 772, 994)}


def nen():
    im = Image.open(SRC / 'nen-dem-trang-goc.png').convert('RGB')
    h = round(im.height * BG_W / im.width)
    im.resize((BG_W, h), Image.LANCZOS).save(ROOT / 'assets' / 'icon' / 'splash-dem.jpg', quality=84, optimize=True, progressive=True)
    print('nền', BG_W, h)


def xoa_chu(a, x0, y0, x1, y1, l, r):
    """Xoá chữ vẽ sẵn trên nút (game có 3 thứ tiếng, chữ nút là chữ thật trong trang): mỗi dòng nội suy ngang giữa dải sạch bên trái
    (cột l..l+6) và bên phải (r..r+6), giữ đúng sắc chuyển dọc của thân nút."""
    L = a[y0:y1, l:l + 6, :3].astype(float).mean(axis=1)
    R = a[y0:y1, r:r + 6, :3].astype(float).mean(axis=1)
    t = np.linspace(0, 1, x1 - x0)[None, :, None]
    a[y0:y1, x0:x1, :3] = (L[:, None, :] * (1 - t) + R[:, None, :] * t).round().astype(np.uint8)


def khung():
    a = np.array(Image.open(SRC / 'khung-dn-dem-goc.png').convert('RGBA'))
    xoa_chu(a, 486, 798, 744, 863, 478, 744)   # "Đăng nhập" trên thân vàng
    xoa_chu(a, 544, 940, 688, 979, 532, 688)   # "Đăng ký" trên thân xanh
    al = a[:, :, 3]
    al[al <= 8] = 0
    al[al >= 200] = 255
    ys, xs = np.nonzero(al)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    a = a[y0:y1, x0:x1]
    a[a[:, :, 3] == 0, :3] = 0
    W, H = x1 - x0, y1 - y0
    im = Image.fromarray(a, 'RGBA')
    h = round(H * FR_W / W)
    im = im.resize((FR_W, h), Image.LANCZOS).quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    im.save(ROOT / 'assets' / 'art' / 'ui-dn-khung-dem.png', optimize=True)
    print('khung', FR_W, h, 'tỉ lệ', W, '/', H)
    for k, (a0, b0, a1, b1) in SPOTS.items():
        print(f'  {k}: left {(a0 - x0) / W * 100:.1f}% top {(b0 - y0) / H * 100:.1f}% width {(a1 - a0) / W * 100:.1f}% height {(b1 - b0) / H * 100:.1f}%')


if __name__ == '__main__':
    nen()
    khung()
