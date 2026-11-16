"""Bộ khung giao diện theo ảnh của chủ dự án (17/11/2026 02:20: gửi tấm bộ khung tím viền bạc, "áp dụng thử đi, tôi muốn kết quả giống ảnh 2").
Ảnh tĩnh của chủ dự án dùng thẳng (CLAUDE.md "ảnh tĩnh dùng ảnh GPT của chủ dự án"): không đồ lại điểm ảnh, không gom màu (bản 02:1x thu về
điểm ảnh 1:1 làm mất chi tiết, chủ dự án chê "xấu, không giống"), chỉ cắt từng món, làm đặc nền (alpha ≥ 200 thành 255) và:
  - bảng trên (cả bố cục: ô ảnh đại diện, 4 thanh, 8 ô chức năng, ô bản đồ, vương miện): xoá 4 thanh vẽ sẵn (game vẽ thanh thật đè lên đúng chỗ);
  - ô vuông nhỏ: thêm bản chỉ còn viền (-vien) để đè lên hình pháp bảo.
Thêm (02:28): nền màn tải / đăng nhập từ ảnh chủ dự án (nen-tai-goc.png): bỏ thanh trạng thái điện thoại, xoá hộp "Đang tải" và dòng mẹo
vẽ sẵn (hộp thật của game nằm đúng chỗ đó) → assets/icon/nen-tai.jpg; hộp màn tải ui-kg-hop.webp = khung tím lớn + vương miện của bảng trên.
Ra assets/art/ui-kg-<tên>.webp (WebP có mất mát chất lượng 88: tranh mịn nên nhẹ gấp ~8 lần PNG mà nhìn như nhau; chủ dự án 02:46 "nóng máy, load chậm, cái gì nén được thì nén"); số đo vị trí các ô trong bảng trên (điểm ảnh của ảnh gốc) dùng ở src/ui/hud-khung.css.
Chạy: python3 -I tools/art/khung_kg.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(R, 'tools/art/nguon/ai/khung-ui/bo-khung-chu-du-an.png')
# tên: (x, y, rộng, cao) trên ảnh gốc 2172 × 724 (tìm bằng vùng alpha > 40); bảng miền (33, 400, 578, 185) bỏ 17/11/2026 vì game không dùng
BOX = {'tren': (23, 3, 1585, 387), 'danh': (1852, 397, 290, 299), 'bang': (646, 416, 608, 270),
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


def hop(a):
    """Khung hộp màn tải: khung tím lớn (bang) chừa 22 điểm trên, vương miện cắt từ giữa mép trên bảng trên đặt lên giữa."""
    b = cut(a, 'bang'); t = cut(a, 'tren')
    cr = t[0:56, 520:1065]   # vương miện (trên ảnh bảng trên đã cắt): cánh bạc + đá tím, phần nhô trên viền
    k = 0.5
    cr = np.array(Image.fromarray(cr, 'RGBA').resize((round(cr.shape[1] * k), round(cr.shape[0] * k)), Image.LANCZOS))
    out = np.zeros((b.shape[0] + 22, b.shape[1], 4), np.uint8)
    out[22:] = b
    x = (out.shape[1] - cr.shape[1]) // 2
    im = Image.fromarray(out, 'RGBA'); im.alpha_composite(Image.fromarray(cr, 'RGBA'), (x, max(0, 22 + 12 - cr.shape[0])))   # chân vương miện đè lên viền trên
    return im


def nen_tai():
    import cv2
    a = np.array(Image.open(os.path.join(R, 'tools/art/nguon/ai/khung-ui/nen-tai-goc.png')).convert('RGB'))
    m = np.zeros(a.shape[:2], np.uint8)
    m[738:1085, 128:726] = 255   # hộp "Pixel 2D Tu Tiên / Đang tải" vẽ sẵn
    m[1100:1180, 140:712] = 255   # dòng mẹo vẽ sẵn
    out = cv2.inpaint(np.ascontiguousarray(a[:, :, ::-1]), m, 12, cv2.INPAINT_TELEA)[:, :, ::-1]
    # vết vá loang thành vệt chéo: phủ bản làm mờ mạnh, mép mờ dần, cho giống sương mù quanh thác (hộp thật che phần lớn)
    soft = cv2.GaussianBlur(out, (0, 0), 22)
    w = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 14)[:, :, None]
    out = (out * (1 - w) + soft * w).astype(np.uint8)
    Image.fromarray(out[106:]).save(os.path.join(R, 'assets/icon/nen-tai.jpg'), quality=86, optimize=True)   # bỏ thanh trạng thái điện thoại (106 điểm trên)


def bang_menu():
    """Khung bảng (chủ dự án 02:35 gửi bo-khung-bang.png: cột mục trái có vương miện, 9 ô mục; bảng nội dung phải có vương miện,
    hoa văn góc, nút X đỏ). Ra: ui-kg-cot.webp (cột trái, đã xoá 9 ô mục để co giãn), ui-kg-muc.webp (một ô mục),
    ui-kg-bang-to.webp (bảng phải, đã xoá nút X), ui-kg-x.webp (nút X đỏ cho mọi nút tắt bảng)."""
    a = np.array(Image.open(os.path.join(R, 'tools/art/nguon/ai/khung-ui/bo-khung-bang.png')).convert('RGBA'))
    a[a[:, :, 3] >= 200, 3] = 255
    cot = a[:, 5:362].copy()
    muc = a[183:290, 43:330].copy()
    g = np.linspace(0, 1, 1218 - 172)[:, None, None]   # xoá 9 ô mục: tô lòng cột màu nền tím (đậm trên, nhạt dần xuống như ảnh)
    cot[172:1218, 41:327, :3] = (np.array([49, 27, 77]) * (1 - g) + np.array([62, 36, 96]) * g).astype(np.uint8)
    cot[172:1218, 41:327, 3] = 255
    big = a[:, 374:1204].copy()
    x = a[110:184, 1074:1150].copy()
    big[100:196, 690:780] = big[100:196, 600:690]   # xoá nút X: chép mảng nền bên trái sang
    for name, p in (('cot', cot), ('muc', muc), ('bang-to', big), ('x', x)):
        ys, xs = np.nonzero(p[:, :, 3] > 0)
        p = p[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        save(p, name)
        print(name, p.shape[1], p.shape[0])


def save(im, name):
    if not isinstance(im, Image.Image):
        im = Image.fromarray(im, 'RGBA')
    im.save(os.path.join(R, f'assets/art/ui-kg-{name}.webp'), 'WEBP', quality=88, method=6)


def main():
    a = np.array(Image.open(SRC).convert('RGBA'))
    for name in BOX:
        p = cut(a, name)
        if name == 'tren':   # xoá 4 thanh vẽ sẵn: chép cột nền ngay bên trái vùng thanh sang cả vùng
            x0, y0, x1, y1 = (v - o for v, o in zip(BARS, (23, 3, 23, 3)))
            p[y0:y1, x0:x1] = p[y0:y1, x0 - 6:x0 - 5]
        save(p, name)
        if name == 'o':
            save(rim(p), 'o-vien')
        print(name, p.shape[1], p.shape[0])
    save(hop(a), 'hop')
    nen_tai()
    bang_menu()


if __name__ == '__main__':
    main()
