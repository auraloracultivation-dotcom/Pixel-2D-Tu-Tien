"""Đưa 16 trang phục mới vào game làm nhân vật (chủ dự án 16/11/2026 21:57: bỏ nhân vật, thời trang cũ, thay bằng 16 bộ mới).
Mỗi bộ một tấm PNG ngang assets/art/hero-tp-NN.png, ô bằng khung chuyển động SpriteCook của bộ đó (ds.json → bo.NN.khung):
  0–7 đứng nghỉ | 8–15 chạy | 16–23 đòn 1 | 24–31 đòn 2 | 32 ngồi xếp bằng (ảnh ngồi ngoi/NN.png, giữa hai chân đặt đúng chân khung, đáy ở đáy khung).
Giữ nguyên điểm ảnh SpriteCook (tools/art/nguon/ai/trang-phuc-moi/sc/NN-<dung|chay|danh1|danh2>.webp).
Ghi mục hero.tp-NN trong data/art.json (anchor = chân); chạy riêng thì in body (điểm ảnh thân lúc đứng, đỉnh tóc tới chân), chỗ khí cầu
lúc ngồi (orb) cho data/fashion.json. Gọi từ tools/art/build.py (sau thú cưỡi mới) hoặc chạy riêng: python3 -I tools/art/trang_phuc_game.py"""
import hashlib, json, os
import numpy as np
from PIL import Image, ImageSequence

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
Q = os.path.join(R, 'tools/art/nguon/ai/trang-phuc-moi')
MOTIONS = ('dung', 'chay', 'danh1', 'danh2')


def frames(path):
    return [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(path))]


def build_into(sprites):
    ds = json.load(open(os.path.join(Q, 'ds.json'), encoding='utf-8'))
    out = {}
    for k, b in sorted(ds['bo'].items()):
        fw, fh = b['khung']; cx, cy = b['chan']; ax, ay = int(round(cx)), int(cy)
        fr = []
        for m in MOTIONS:
            f = frames(os.path.join(Q, 'sc', f'{k}-{m}.webp'))
            assert len(f) == 8 and f[0].shape[:2] == (fh, fw), (k, m, len(f), f[0].shape)
            fr += f
        ng = Image.open(os.path.join(Q, 'ngoi', f'{k}.png')).convert('RGBA'); g = ds['ngoi'][k]
        cell = Image.new('RGBA', (fw, fh), (0, 0, 0, 0)); cell.alpha_composite(ng, (int(round(ax - g['chan'])), fh - ng.height))
        fr.append(np.array(cell))
        sheet = Image.new('RGBA', (fw * len(fr), fh), (0, 0, 0, 0))
        for i, a in enumerate(fr): sheet.alpha_composite(Image.fromarray(a), (i * fw, 0))
        fn = f'assets/art/hero-tp-{k}.png'; sheet.save(os.path.join(R, fn), optimize=True)
        v = hashlib.sha256(open(os.path.join(R, fn), 'rb').read()).hexdigest()[:8]
        ys = np.nonzero((fr[0][..., 3] > 0).any(1))[0]; body = int(ys.max() - ys.min() + 1)
        sprites[f'hero.tp-{k}'] = {'file': fn, 'v': v, 'w': fw, 'h': fh, 'frames': len(fr), 'anchor': [ax, ay],
                                          'note': f'trang phục mới #{int(k)} (SpriteCook 16/11/2026): đứng, chạy, đòn 1, đòn 2 mỗi thứ 8 khung, khung 32 ngồi xếp bằng'}
        out[k] = {'body': body, 'orb': [round(ax - g['chan'] + g['cau'][0], 1), round(fh - ng.height + g['cau'][1], 1)],
                  'hit': [b['danh1']['hit'], b['danh2']['hit']], 'mau': b['mau']}
    return out


def main():
    ap = os.path.join(R, 'data/art.json'); A = json.load(open(ap, encoding='utf-8'))
    out = build_into(A['sprites'])
    A['sprites'] = dict(sorted(A['sprites'].items()))
    open(ap, 'w', encoding='utf-8').write(json.dumps(A, ensure_ascii=False, indent=1) + '\n')   # cùng kiểu px.write_manifest
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
