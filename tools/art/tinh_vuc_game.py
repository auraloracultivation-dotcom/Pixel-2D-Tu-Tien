"""Hình Tinh Vực mới vào game (chủ dự án 19/11/2026 03:14 "Áp dụng lên game đi"): ghi tấm ngang vào assets/art và mục tv.* trong data/art.json.
Nguồn ở tools/art/nguon/ai/tinh-vuc/ (SpriteCook, sổ credit spritecook-assets.json):
  tv.<mã thiên thể>   13 tinh cầu + Linh Nhật động 16 khung (dong/*.webp); hình không nối vòng thì chạy tới rồi lùi (32 khung)
  tv.trang.<mã>       12 mặt trăng tĩnh (trang/*.png)
  tv.kh.<đất>         7 tinh cầu khai hoang theo loại đất (khai-hoang/*.png, khớp data/khai-hoang.json → grounds)
  tv.vong             vòng kết giới, phóng 3 lần rồi gọt mỏng (02:52), khung 0 thường, khung 1 sáng (lúc bị đánh)
  tv.tru, tv.may-1..3, tv.tinh-the, tv.nut   trụ kiếm, mây ma khí, tinh thể ma khí, vết nứt
Gọi từ tools/art/build.py (trước write_manifest) hoặc chạy riêng: python3 -I tools/art/tinh_vuc_game.py
"""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageFilter

R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
TV = os.path.join(R, 'tools/art/nguon/ai/tinh-vuc')
OUT = os.path.join(R, 'assets/art')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from png_nho import luu  # noqa: E402

DONG = {'sun': 'linh-nhat', 'thien-kiem-phong': 'thien-kiem-tinh', 'thanh-khe': 'thanh-khe', 'dao-xich-dien': 'xich-diem',
        'dao-han-bang': 'han-bang', 'hac-phong-dao': 'hac-phong', 'dao-moc': 'thanh-moc', 'dao-thien-kim': 'thien-kim',
        'dao-hau-tho': 'hau-tho', 'vet-nut-ngoai': 'vet-nut-ngoai', 'mat-1': 'mat-1', 'mat-2': 'mat-2', 'ma-vuong': 'ma-vuong'}
DAO_CHIEU = ('linh-nhat', 'thien-kiem-tinh', 'hau-tho')   # đo 19/11: khung cuối lệch khung đầu > 1,6 lần bước thường


def khung_webp(p):
    im = Image.open(p); L = []
    for k in range(im.n_frames):
        im.seek(k); L.append(im.convert('RGBA').copy())
    return L


def ghi(sprites, sid, frames, note, anchor=None):
    w, h = frames[0].size
    sheet = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * w, 0))
    name = sid.replace('.', '-') + '.png'
    luu(sheet, os.path.join(OUT, name))
    v = hashlib.sha1(open(os.path.join(OUT, name), 'rb').read()).hexdigest()[:8]
    sprites[sid] = {'file': f'assets/art/{name}', 'v': v, 'w': w, 'h': h, 'frames': len(frames),
                    'anchor': list(anchor or (w // 2, h // 2)), 'note': note}


def build_into(sprites):
    n = 0
    for bid, ten in DONG.items():
        f = khung_webp(f'{TV}/dong/{ten}.webp')
        if ten in DAO_CHIEU:
            f = f + f[::-1]
        ghi(sprites, f'tv.{bid}', f, f'Tinh Vực 19/11/2026: {ten} (SpriteCook), 8 khung/giây' + (', chạy tới rồi lùi' if ten in DAO_CHIEU else '')); n += 1
    for p in sorted(os.listdir(f'{TV}/trang')):
        ghi(sprites, f'tv.trang.{p[:-4]}', [Image.open(f'{TV}/trang/{p}').convert('RGBA')], 'mặt trăng Tinh Vực (SpriteCook 19/11/2026)'); n += 1
    for p in sorted(os.listdir(f'{TV}/khai-hoang')):
        ghi(sprites, f'tv.kh.{p[:-4]}', [Image.open(f'{TV}/khai-hoang/{p}').convert('RGBA')], 'tinh cầu khai hoang theo loại đất (SpriteCook 19/11/2026)'); n += 1
    HU = f'{TV}/hieu-ung'
    v = Image.open(f'{HU}/vong.png').convert('RGBA')
    v = v.resize((v.width * 3, v.height * 3), Image.NEAREST)
    v.putalpha(v.split()[3].filter(ImageFilter.MinFilter(5)))          # gọt mỏng (chủ dự án 02:52)
    s = np.array(v).astype(float)
    s[..., :3] = np.clip(s[..., :3] * 0.55 + np.array([235, 255, 190]) * 0.45, 0, 255)
    ghi(sprites, 'tv.vong', [v, Image.fromarray(s.astype(np.uint8))],
        'vòng kết giới (SpriteCook, phóng 3, gọt mỏng): khung 0 thường, khung 1 sáng; tâm 756,410, bán kính giữa 612×372 (đo ở hàng, cột giữa)'); n += 1
    for ten, sid in (('tru-kiem', 'tv.tru'), ('may-1', 'tv.may-1'), ('may-2', 'tv.may-2'), ('may-3', 'tv.may-3'),
                     ('tinh-the', 'tv.tinh-the'), ('vet-nut', 'tv.nut')):
        im = Image.open(f'{HU}/{ten}.png').convert('RGBA')
        ghi(sprites, sid, [im.crop(im.getbbox())], f'Tinh Vực: {ten} (SpriteCook 19/11/2026)'); n += 1
    return n


def main():
    ap = os.path.join(R, 'data/art.json'); A = json.load(open(ap, encoding='utf-8'))
    n = build_into(A['sprites'])
    open(ap, 'w', encoding='utf-8').write(json.dumps(A, ensure_ascii=False, indent=1) + '\n')
    print(n, 'hình tv.*')


if __name__ == '__main__':
    main()
