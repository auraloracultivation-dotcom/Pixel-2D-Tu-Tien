"""Linh thú đi theo người dùng hình Bộ Quái Mới của chính loài đó: linh thú là con quái farm được (thu phục dị chủng cùng loài),
khác thú cưỡi. Chủ dự án 16/11/2026 22:58: linh thú đi theo người vẫn còn ảnh cũ; bản 23:08 lấy nhầm hình thú cưỡi (còn yên);
23:3x chủ dự án: "linh thú là con thú farm được, thú cưỡi khác". Mục pet.<mã> trong data/art.json dùng chung tấm qm-<mã>.png của quái
cùng mã (quai_moi_game.py: anim dung | di | danh; con bay không có di thì chạy dùng đứng), vẽ bằng K lần cỡ quái (px, thu nhỏ có làm mịn
như các hình px khác), không tạo tấm mới. draw-pet.js chọn khung theo spr.idle / walk / atk.
Gọi từ tools/art/build.py hoặc chạy riêng: python3 -I tools/art/linh_thu_moi.py"""
import json, os

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


K = 0.75   # linh thú bằng chừng này lần con quái ngoài bãi (thu nửa thì nhỏ quá, bị vũ khí bay che mất)


def build_into(sprites):
    pets = json.load(open(os.path.join(R, 'data/pets.json'), encoding='utf-8'))['pets']
    done = []
    for pid, p in pets.items():
        mk = pid; m = sprites.get('mob.' + pid); A = m and m.get('anim')
        if not A: continue
        seq = lambda k: list(range(A[k][0], A[k][0] + A[k][1])) if A.get(k) else None
        sc = m.get('scale', 0.5333)
        sprites['pet.' + pid] = {'file': m['file'], 'v': m['v'], 'w': m['w'], 'h': m['h'], 'frames': m['frames'], 'anchor': m['anchor'],
                                 'px': round(sc * K, 4), 'idle': seq('dung'), 'walk': seq('di') or seq('dung'), 'atk': seq('danh'), 'hit': A['danh'][0] + A.get('hit', 4), 'fps': A.get('fps', 8),
                                 'note': f'{p["name"]}: dùng chung tấm hình quái {mk} (Bộ Quái Mới), vẽ bằng {K} lần cỡ quái (tools/art/linh_thu_moi.py, chủ dự án 16/11/2026 23:3x)'}
        done.append(f'{pid} ← mob.{mk} × {K}')
    if __name__ == '__main__': print('\n'.join(done))
    return len(done)


if __name__ == '__main__':
    ap = os.path.join(R, 'data/art.json'); A = json.load(open(ap, encoding='utf-8'))
    build_into(A['sprites'])
    A['sprites'] = dict(sorted(A['sprites'].items()))
    open(ap, 'w', encoding='utf-8').write(json.dumps(A, ensure_ascii=False, indent=1) + '\n')
