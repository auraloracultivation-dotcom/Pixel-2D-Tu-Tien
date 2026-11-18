"""Máy lọc hình SpriteCook cho Thiên Kiếm Tinh: phần NỀN và tấm đồ ven sông của bản thử (chủ dự án 18/11/2026 11:03: "sông hồ đất đá…
để bên spritecook làm"; 13:23: làm tiếp phần còn lại và làm lại toàn bộ). Phần đồ vật, núi, nhà cửa ở tools/art/sc_tk2.py.
Nguồn: tools/art/nguon/ai/the-gioi/thu/ (bản thử) và tk2/ (đợt 13:23); sổ ở spritecook-assets.json. Ra: assets/art/ + data/art.json.
Bộ nền 15 mảnh (lưới 4×4, ô 32 điểm = 1 ô bản đồ 16 đơn vị, tức 1 điểm = 0,5 đơn vị như nhân vật), vẽ ở src/world/draw-nen.js:
  nen.tk-nuoc  cỏ ↔ nước, giữ nguyên (khung 6 = cỏ đặc, khung 12 = nước đặc);
  nen.tk-dat   đường đất; SpriteCook để trắng phần ngoài đường → trong suốt, viền cỏ đổi về bảng màu cỏ của bộ nước (luật 4);
  nen.tk-san   sân lát đá phiến lớn (bản b), mép trong suốt;        nen.tk-gach  phố gạch xanh xám (bản b), làm sáng lên cho đỡ nặng;
  nen.tk-nui   nền đá chân núi (bản b), mép trong suốt;              nen.tk-mep   mép tinh cầu: cỏ, viền đất đá, rễ rủ ở mép nam (bản a);
  nen.tk-vach  dải vách đá dưới đáy tinh cầu (cắt từ tấm mép đất vỡ), dán uốn theo mép nam;
  nen.tk-hoa   5 cụm hoa cỏ nhỏ (hoa đỏ, lam, vàng trắng, nấm, sỏi) in thẳng vào nền cỏ cho bãi cỏ rộng đỡ trống.
Chạy: python3 tools/art/sc_tk.py"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/art/nguon/ai/the-gioi/thu'
SRC2 = ROOT / 'tools/art/nguon/ai/the-gioi/tk2'
OUT = ROOT / 'assets/art'
ART = ROOT / 'data/art.json'
SCALE = 0.5   # 1 điểm hình = 0,5 đơn vị: trên điện thoại (2 điểm màn mỗi đơn vị) mỗi điểm hình đúng một điểm màn, nét như nhân vật
HOA = {'nen.tk-hoa': (72, 44)}   # ô của tấm hoa cỏ in nền
# cụm hoa cỏ in nền: (tấm, khung cắt)
HOA_CAT = [('hoa-bui', (42, 150, 88, 188)), ('hoa-bui', (161, 150, 204, 187)), ('hoa-bui', (270, 149, 320, 189)),
           ('hoa-bui', (390, 152, 433, 184)), ('da', (278, 97, 343, 134))]

# khung cắt tấm đồ ven sông của bản thử (x0, y0, x1, y1), dò bằng vùng liền của kênh trong suốt
DO = {
    'tk.lieu-sc': ((13, 9, 151, 159), 'liễu rủ ven nước'),
    'tk.bui-lau-sc': ((173, 31, 241, 122), 'bụi lau'),
    'tk.bui-co-nen-sc': ((265, 37, 331, 117), 'cỏ nến'),
    'tk.sen-la-sc': ((353, 44, 449, 109), 'lá sen, một bông sen hồng (nổi trên nước)'),
    'tk.da-reu-lon-sc': ((24, 176, 112, 250), 'đá rêu lớn'),
    'tk.soi-reu-sc': ((129, 209, 185, 248), 'hai hòn đá rêu nhỏ'),
    'tk.cau-ben-sc': ((198, 160, 294, 244), 'bến gỗ câu cá vẽ chéo góc (bản mới dùng tk.cau-tau-*-sc)'),
    'tk.cau-da-vom-sc': ((309, 140, 467, 257), 'cầu đá vòm vẽ chéo góc (không dùng; bản mới là tk.cau-da-sc)'),
}


def green(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (g > r * 1.12) & (g > b * 1.25) & (a[..., 3] > 0)


def lum(a):
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def sang(im, k, gamma):
    """Làm sáng một bộ nền: nâng gamma rồi nhân k (giữ kênh trong suốt)."""
    a = np.array(im.convert('RGBA')).astype(np.float32)
    a[..., :3] = np.clip(255 * (a[..., :3] / 255) ** gamma * k, 0, 255)
    return Image.fromarray(a.astype(np.uint8))


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
    mep = np.array(Image.open(SRC2 / 'nen-mep-a.png').convert('RGBA'))
    mm = green(mep)   # cỏ của bộ mép kéo 60% về bảng cỏ nền: dải cỏ sáng sát mép còn nhận ra nhưng không thành một đường viền chói
    Lm = lum(mep)[mm]
    rk = np.argsort(np.argsort(Lm)) / max(1, len(Lm) - 1)
    mep[mm] = (mep[mm] * 0.4 + ref[(rk * (len(ref) - 1)).astype(int)] * 0.6).astype(np.uint8)
    mep[32:64, 64:96] = g6   # khung đặc của mép = đúng mảnh cỏ nền (chỉ dùng để soát; game không vẽ mảnh đặc của lớp mép)
    return {'nen.tk-nuoc': (nuoc, 'cỏ ↔ nước, bờ cát'), 'nen.tk-dat': (Image.fromarray(dat), 'đường đất phủ lên cỏ'),
            'nen.tk-san': (sang(Image.open(SRC2 / 'nen-san-b.png'), 0.97, 1.22), 'sân lát đá phiến lớn, mép trong suốt (hạ sáng một chút cho đỡ chói giữa nền cỏ)'),
            'nen.tk-gach': (sang(Image.open(SRC2 / 'nen-gach-b.png'), 1.12, 0.62), 'phố gạch xanh xám, mép trong suốt (đã làm sáng)'),
            'nen.tk-nui': (Image.open(SRC2 / 'nen-nui-b.png').convert('RGBA'), 'nền đá chân núi, mép trong suốt'),
            'nen.tk-mep': (Image.fromarray(mep), 'mép tinh cầu: cỏ, viền đất đá, rễ rủ ở mép nam')}


def hoa():
    """Tấm 5 cụm hoa cỏ nhỏ, mỗi cụm một ô, chân cụm ở giữa đáy ô."""
    w, h = HOA['nen.tk-hoa']
    out = Image.new('RGBA', (w * len(HOA_CAT), h), (0, 0, 0, 0))
    for i, (tam, box) in enumerate(HOA_CAT):
        im = Image.open(SRC2 / f'{tam}.png').convert('RGBA').crop(box)
        im = im.crop(im.getbbox())
        out.alpha_composite(im, (i * w + (w - im.width) // 2, h - im.height))
    return out


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
    vach = Image.open(SRC2 / 'mep-vo.png').convert('RGBA').crop((0, 39, 472, 137))
    save('nen.tk-vach', vach, {'w': vach.width, 'h': vach.height, 'frames': 1, 'anchor': [0, 0],
                               'note': 'SpriteCook: dải vách đá dưới đáy tinh cầu, dán uốn theo mép nam, lặp ngang kiểu soi gương (src/world/draw-nen.js)'})
    w, h = HOA['nen.tk-hoa']
    save('nen.tk-hoa', hoa(), {'w': w, 'h': h, 'frames': len(HOA_CAT), 'anchor': [w // 2, h],
                               'note': 'SpriteCook: 5 cụm hoa cỏ nhỏ in vào nền cỏ (hoa đỏ, lam, vàng trắng, nấm, sỏi), src/world/draw-nen.js'})
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
