"""Máy lọc hình SpriteCook cho Thiên Kiếm Tinh mới (chủ dự án 18/11/2026 11:03: "sông hồ đất đá… để bên spritecook làm").
Nguồn: tools/art/nguon/ai/the-gioi/thu/ (sổ ở spritecook-assets.json). Ra: assets/art/ + data/art.json.
  - Bộ nền 15 mảnh (lưới 4×4, ô 32 điểm = 1 ô bản đồ 16 đơn vị, tức 1 điểm = 0,5 đơn vị như nhân vật):
      nen.tk-nuoc: cỏ ↔ nước, giữ nguyên (khung 6 = cỏ đặc, khung 12 = nước đặc);
      nen.tk-dat:  đường đất; SpriteCook để trắng phần ngoài đường → đổi thành trong suốt, viền cỏ đổi về đúng bảng màu cỏ của
                   bộ nước (luật 4: một bảng màu chung) để phủ lên nền cỏ không lộ mép.
  - Tấm 8 đồ ven sông: cắt rời, chân ở giữa đáy hình.
Chạy: python3 tools/art/sc_tk.py"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/art/nguon/ai/the-gioi/thu'
OUT = ROOT / 'assets/art'
ART = ROOT / 'data/art.json'
SCALE = 0.5333   # như đồ của chủ dự án: 1 điểm hình = 0,53 đơn vị

# khung cắt tấm đồ ven sông (x0, y0, x1, y1), dò bằng vùng liền của kênh trong suốt
DO = {
    'tk.lieu-sc': ((13, 9, 151, 159), 'liễu rủ ven nước'),
    'tk.bui-lau-sc': ((173, 31, 241, 122), 'bụi lau'),
    'tk.bui-co-nen-sc': ((265, 37, 331, 117), 'cỏ nến'),
    'tk.sen-la-sc': ((353, 44, 449, 109), 'lá sen, một bông sen hồng (nổi trên nước)'),
    'tk.da-reu-lon-sc': ((24, 176, 112, 250), 'đá rêu lớn'),
    'tk.soi-reu-sc': ((129, 209, 185, 248), 'hai hòn đá rêu nhỏ'),
    'tk.cau-ben-sc': ((198, 160, 294, 244), 'bến gỗ câu cá (đi lên được)'),
    'tk.cau-da-vom-sc': ((309, 140, 467, 257), 'cầu đá vòm'),
}


def green(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (g > r * 1.12) & (g > b * 1.25) & (a[..., 3] > 0)


def lum(a):
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def tiles():
    nuoc = Image.open(SRC / 'tk-co-nuoc-b.png').convert('RGBA')
    dat = np.array(Image.open(SRC / 'tk-co-dat-b.png').convert('RGBA'))
    white = (dat[..., :3].min(axis=2) > 232)
    dat[white] = (0, 0, 0, 0)
    # bảng cỏ chuẩn: khung 6 (cỏ đặc) của bộ nước, xếp theo độ sáng
    g6 = np.array(nuoc.crop((64, 32, 96, 64)))
    ref = g6.reshape(-1, 4)
    ref = ref[np.argsort(lum(ref))]
    m = green(dat)
    L = lum(dat)[m]
    rank = np.argsort(np.argsort(L)) / max(1, len(L) - 1)
    dat[m] = ref[(rank * (len(ref) - 1)).astype(int)]
    return {'nen.tk-nuoc': (nuoc, 'cỏ ↔ nước, bờ cát'), 'nen.tk-dat': (Image.fromarray(dat), 'đường đất phủ lên cỏ')}


def main():
    art = json.loads(ART.read_text(encoding='utf-8'))
    S = art['sprites']

    def save(sid, im, extra):
        f = OUT / (sid.replace('.', '-') + '.png')
        im.save(f)
        S[sid] = {'file': f'assets/art/{f.name}', 'v': hashlib.sha1(f.read_bytes()).hexdigest()[:8], **extra}

    for sid, (im, note) in tiles().items():
        save(sid, im, {'w': 32, 'h': 32, 'frames': 4, 'rows': 4, 'anchor': [0, 0],
                       'note': f'SpriteCook bộ nền 15 mảnh lưới đôi, ô 32 điểm: {note} (tools/art/sc_tk.py)'})
    sheet = Image.open(SRC / 'tk-do-ven-song.png').convert('RGBA')
    for sid, (box, note) in DO.items():
        im = sheet.crop(box)
        im = im.crop(im.getbbox())
        save(sid, im, {'w': im.width, 'h': im.height, 'frames': 1, 'anchor': [im.width // 2, im.height - 2],
                       'note': f'SpriteCook: {note} (tools/art/sc_tk.py)', 'scale': SCALE})
        print(sid, im.size)
    ART.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
