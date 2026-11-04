"""Hình hiệu ứng chiêu từ ảnh GPT (chủ dự án 05/11/2026 02:31, nguon/ai/chieu/chieu-1..3.png; lệnh vẽ ở câu trả lời 02:16):
mỗi ảnh 3 hàng × 7 hình, nền trong suốt. Ảnh 1, 2: hình chính của 42 chiêu theo đúng thứ tự data/skills.json; ảnh 3: chuông lửa
(Hỏa Hồn Linh) + 20 mảnh dùng chung (nổ theo hệ, pháp trận theo hệ, hạt). Chỉ cắt và bỏ quầng mờ dưới alpha 40, giữ nguyên hình,
thu về cạnh dài tối đa MAX điểm ảnh (chiêu vẽ mượt, không cần phân giải gốc 200+). Tên hình 'vfx.<tên>'; dùng ở data/vfx.json,
src/render/vfx/. Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas
from ui_vu_khi import _segs

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'chieu'
MAX = 128
SHEETS = {
    'chieu-1.png': [['kiem-khi', 'dang-phuoc', 'hoi-xuan', 'hoa-cau', 'liet-diem', 'bang-truy', 'thuy-thuan'],
                    ['kim-quang-tram', 'kim-cuong-the', 'dia-chan', 'thach-giap', 'van-moc-cham', 'thanh-moc-vuc', 'luc-dang-long'],
                    ['truong-xuan', 'hoa-long', 'phan-thien', 'liet-hoa-tran', 'phuong-hoang', 'bang-phong', 'thuy-long']],
    'chieu-2.png': [['han-bang-vuc', 'bang-phach', 'van-kiem', 'kim-luan', 'loi-dinh', 'kim-than', 'luu-sa'],
                    ['thach-chuy', 'son-nhac', 'dai-dia', 'long-thuong', 'cuong-phong', 'that-huyen', 'tu-nguyet-liem'],
                    ['song-nguyet-tram', 'tu-nguyet-luan', 'lien-chau', 'phap-kim-luan', 'phap-thanh-moc', 'phap-huyen-thuy', 'phap-tran-yeu']],
    'chieu-3.png': [['phap-hoa-hon', 'no-lua', 'no-bang', 'no-da', 'no-nuoc', 'no-la', 'sao-vang'],
                    ['tran-hoa', 'tran-thuy', 'tran-moc', 'tran-kim', 'tran-tho', 'lua', 'tuyet'],
                    ['la', 'da', 'giot', 'set', 'gio', 'am', 'thanh-quang']],
}


def build(save):
    n = 0
    for f, rows in SHEETS.items():
        a = np.array(Image.open(SRC / f).convert('RGBA')); a[:, :, 3] = np.where(a[:, :, 3] >= 40, a[:, :, 3], 0)
        m = a[:, :, 3] > 0
        bands = _segs(m, 1, 6, len(rows))
        bands = sorted(sorted(bands, key=lambda s: s[1] - s[0], reverse=True)[:len(rows)])
        for (y0, y1), names in zip(bands, rows):
            segs = _segs(m[y0:y1], 0, 6, len(names))
            segs = sorted(sorted(segs, key=lambda s: s[1] - s[0], reverse=True)[:len(names)])   # bỏ vụn quầng
            for (x0, x1), k in zip(segs, names):
                c = a[y0:y1, x0:x1]; ys, xs = np.nonzero(c[:, :, 3])
                c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
                im = Image.fromarray(np.ascontiguousarray(c)); s = min(1, MAX / max(im.size))
                if s < 1: im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
                cv = Canvas(im.width, im.height); cv.a = np.array(im)
                save('vfx.' + k, [cv], (im.width // 2, im.height // 2), f'hiệu ứng chiêu {k} (ảnh GPT {f})'); n += 1
        print('vfx', f, len(bands), 'hàng')
    return n
