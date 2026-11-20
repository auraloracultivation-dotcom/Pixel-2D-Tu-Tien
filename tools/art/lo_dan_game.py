"""Lò luyện đan (chủ dự án 20/11/2026 14:10: 4 mẫu ảnh GPT, 4 loại lò; SpriteCook làm chuyển động): ghi vào assets/art và data/art.json.
Nguồn ở tools/art/nguon/ai/lo-dan/ (sổ credit spritecook-assets.json):
  lo.<mã>          ảnh tĩnh (tinh/<mã>.png, ai_import --h 96 --colors 24), neo giữa đáy
  lo.<mã>.chay     đang luyện, chạy vòng: lửa đáy lò, lửa trong lòng lò, khói, rung nhẹ (dong/<mã>-chay.png, 16 khung 8 khung/giây)
  lo.<mã>.thanh    luyện thành: bung nắp, tắt lửa, về trạng thái cơ bản (dong/<mã>-thanh.png, 16 khung 8 khung/giây)
Tấm SpriteCook khung 132×132, lò ở đáy giữa cùng cỡ ảnh tĩnh (cao 96): cắt bớt hai bên còn 96×132 (giữ khói, nắp bay lên), neo (48, 131).
Gọi từ tools/art/build.py (trước write_manifest) hoặc chạy riêng: python3 -I tools/art/lo_dan_game.py
"""
import hashlib, json, os, sys
from PIL import Image

R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SRC = os.path.join(R, 'tools/art/nguon/ai/lo-dan')
OUT = os.path.join(R, 'assets/art')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from png_nho import luu  # noqa: E402

LO = ('hong-sen', 'bang-ngoc', 'huyen-quy', 'tu-nguyet')
TEN = {'hong-sen': 'Hồng Sen', 'bang-ngoc': 'Băng Ngọc', 'huyen-quy': 'Huyền Quy', 'tu-nguyet': 'Tử Nguyệt'}
FW, X0 = 96, 18   # bề ngang khung sau khi cắt, mép trái cắt trong khung 132


def ghi(sprites, sid, frames, anchor, note):
    w, h = frames[0].size
    sheet = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * w, 0))
    name = sid.replace('.', '-') + '.png'
    luu(sheet, os.path.join(OUT, name))
    v = hashlib.sha1(open(os.path.join(OUT, name), 'rb').read()).hexdigest()[:8]
    sprites[sid] = {'file': f'assets/art/{name}', 'v': v, 'w': w, 'h': h, 'frames': len(frames), 'anchor': list(anchor), 'note': note}


def build_into(sprites):
    n = 0
    for m in LO:
        t = Image.open(f'{SRC}/tinh/{m}.png').convert('RGBA')
        ghi(sprites, f'lo.{m}', [t], (t.width // 2, t.height - 1), f'lò {TEN[m]} (ảnh GPT chủ dự án 20/11/2026 14:10, ai_import --h 96 --colors 24)'); n += 1
        for k, ghi_chu in (('chay', 'đang luyện, chạy vòng'), ('thanh', 'luyện thành: bung nắp, tắt lửa, về cơ bản')):
            s = Image.open(f'{SRC}/dong/{m}-{k}.png').convert('RGBA'); fh = s.height; nf = s.width // fh
            fr = [s.crop((i * fh + X0, 0, i * fh + X0 + FW, fh)) for i in range(nf)]
            ghi(sprites, f'lo.{m}.{k}', fr, (FW // 2, fh - 1), f'lò {TEN[m]} {ghi_chu} (SpriteCook 20/11/2026), 8 khung/giây'); n += 1
    return n


def main():
    ap = os.path.join(R, 'data/art.json'); A = json.load(open(ap, encoding='utf-8'))
    n = build_into(A['sprites'])
    open(ap, 'w', encoding='utf-8').write(json.dumps(A, ensure_ascii=False, indent=1) + '\n')
    print(n, 'hình lo.*')


if __name__ == '__main__':
    main()
