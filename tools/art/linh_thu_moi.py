"""Linh thú đi theo người dùng hình 16 thú mới (chủ dự án 16/11/2026 22:58: "linh thú đi theo người" vẫn còn ảnh cũ).
Mỗi linh thú có data/pets.json → pets.<mã>.hinh = mã thú cưỡi lấy hình. Tấm assets/art/linh-thu-<mã>.png là tấm mount-<hinh>.png
(thu_cuoi_moi_game.py: 8 khung đứng nghỉ | 8 chạy | 8 tấn công) thu NỬA cỡ: mỗi ô 2×2 điểm lấy màu đục chiếm nhiều nhất (đủ 2 điểm đục
mới giữ), nên vẫn là điểm ảnh sạch cùng mật độ với nhân vật (px 0,5333), linh thú nhỏ bằng nửa thú cưỡi. Ghi mục pet.<mã> trong
data/art.json (đè hình cũ từ tools/art/pets.py): frames 24, idle / walk / atk, hit, fps như thú cưỡi; draw-pet.js chọn khung theo
spr.idle. Gọi từ tools/art/build.py (sau thú cưỡi mới) hoặc chạy riêng: python3 -I tools/art/linh_thu_moi.py"""
import hashlib, json, os
from collections import Counter
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def half(im):
    W, H = im.size; px = im.load(); out = Image.new('RGBA', ((W + 1) // 2, (H + 1) // 2), (0, 0, 0, 0)); po = out.load()
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            c = Counter(px[i, j] for i in (x, x + 1) for j in (y, y + 1) if i < W and j < H and px[i, j][3] > 0)
            if sum(c.values()) >= 2: po[x // 2, y // 2] = c.most_common(1)[0][0]
    return out


def build_into(sprites):
    pets = json.load(open(os.path.join(R, 'data/pets.json'), encoding='utf-8'))['pets']
    done = []
    for pid, p in pets.items():
        mk = p.get('hinh'); m = mk and sprites.get('mount.' + mk)
        if not m: continue
        src = Image.open(os.path.join(R, m['file'])).convert('RGBA'); w2 = (m['w'] + 1) // 2
        frames = [half(src.crop((f * m['w'], 0, (f + 1) * m['w'], m['h']))) for f in range(m['frames'])]
        h2 = frames[0].size[1]; strip = Image.new('RGBA', (w2 * len(frames), h2), (0, 0, 0, 0))
        for f, im in enumerate(frames): strip.paste(im, (f * w2, 0))
        path = f'assets/art/linh-thu-{pid}.png'; full = os.path.join(R, path); strip.save(full, optimize=True)
        v = hashlib.sha256(open(full, 'rb').read()).hexdigest()[:8]
        sprites['pet.' + pid] = {'file': path, 'v': v, 'w': w2, 'h': h2, 'frames': len(frames), 'anchor': [m['anchor'][0] // 2, (m['anchor'][1] + 1) // 2],
                                 'px': m['px'], 'idle': m['idle'], 'walk': m['walk'], 'atk': m['atk'], 'hit': m['hit'], 'fps': m.get('fps', 8),
                                 'note': f'{p["name"]}: hình thú mới {mk} thu nửa cỡ (tools/art/linh_thu_moi.py, chủ dự án 16/11/2026 22:58)'}
        done.append(f'{pid} ← {mk}: {w2}×{h2}')
    if __name__ == '__main__': print('\n'.join(done))
    return len(done)


if __name__ == '__main__':
    ap = os.path.join(R, 'data/art.json'); A = json.load(open(ap, encoding='utf-8'))
    build_into(A['sprites'])
    A['sprites'] = dict(sorted(A['sprites'].items()))
    open(ap, 'w', encoding='utf-8').write(json.dumps(A, ensure_ascii=False, indent=1) + '\n')
