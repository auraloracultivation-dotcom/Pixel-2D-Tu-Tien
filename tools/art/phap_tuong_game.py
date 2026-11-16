"""Đưa 16 pháp tượng vào game (chủ dự án 16/11/2026 21:57: pháp tượng thay ô Ngọc bội, đeo vào là luôn hiện sau lưng).
Mỗi cái một tấm PNG ngang assets/art/pt-NN.png: 16 khung lặp SpriteCook (tools/art/nguon/ai/phap-tuong/sc/NN.webp), giữ nguyên điểm ảnh,
cùng mật độ điểm với trang phục mới (người ngồi xếp bằng ôm vừa lỗ giữa).
Mục pt.NN trong data/art.json: anchor = chỗ đặt vào người (trục đối xứng của pháp tượng; có lỗ giữa thì tâm lỗ, đặt vào mặt người;
không có lỗ thì 92% chiều cao, đặt vào chân người), lo: true / false. Chỗ ảnh tĩnh nằm trong khung đầu tìm bằng so mặt nạ.
Gọi từ tools/art/build.py hoặc chạy riêng: python3 -I tools/art/phap_tuong_game.py"""
import hashlib, json, os
import numpy as np
from PIL import Image, ImageSequence

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
Q = os.path.join(R, 'tools/art/nguon/ai/phap-tuong')


def place(st, f0):
    m = st[..., 3] > 0; r = f0[..., 3] > 0; h, w = m.shape; ys, xs = np.nonzero(r); bx, by = xs.min(), ys.min(); best = (-1, bx, by)
    for y in range(max(0, by - 8), by + 9):
        for x in range(max(0, bx - 8), bx + 9):
            s = r[y:y + h, x:x + w]
            if s.shape != m.shape: continue
            v = (m & s).sum() / max(1, (m | s).sum())
            if v > best[0]: best = (v, x, y)
    return int(best[1]), int(best[2])


def build_into(sprites):
    ds = json.load(open(os.path.join(Q, 'ds.json'), encoding='utf-8'))['pt']
    n = 0
    for k, q in sorted(ds.items()):
        p = os.path.join(Q, 'sc', f'{k}.webp')
        if not os.path.exists(p): continue
        fr = [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(p))]
        fh, fw = fr[0].shape[:2]; sheet = Image.new('RGBA', (fw * len(fr), fh), (0, 0, 0, 0))
        for i, a in enumerate(fr): sheet.alpha_composite(Image.fromarray(a), (i * fw, 0))
        fn = f'assets/art/pt-{k}.png'; sheet.save(os.path.join(R, fn), optimize=True)
        v = hashlib.sha256(open(os.path.join(R, fn), 'rb').read()).hexdigest()[:8]
        ox, oy = place(np.array(Image.open(os.path.join(Q, 'tinh', f'{k}.png')).convert('RGBA')), fr[0])
        lo = q.get('lo'); ay = oy + lo[1] if lo else oy + round(q['h'] * 0.92)
        sprites[f'pt.{k}'] = {'file': fn, 'v': v, 'w': fw, 'h': fh, 'frames': len(fr), 'anchor': [round(ox + q['truc']), ay], 'lo': bool(lo), 'fps': 10,
                              'note': f'pháp tượng #{int(k)} (SpriteCook 16/11/2026): 16 khung lặp; anchor đặt vào mặt người (có lỗ) hoặc chân (không lỗ)'}
        n += 1
    return n


def main():
    ap = os.path.join(R, 'data/art.json'); A = json.load(open(ap, encoding='utf-8'))
    print(build_into(A['sprites']), 'pháp tượng')
    A['sprites'] = dict(sorted(A['sprites'].items()))
    open(ap, 'w', encoding='utf-8').write(json.dumps(A, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
