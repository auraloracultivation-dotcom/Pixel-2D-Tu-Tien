"""Đưa Bộ Quái Mới vào game (chủ dự án 16/11/2026 15:07 "Chuẩn bị đẩy lên game").
Mỗi con một tấm PNG ngang assets/art/qm-<mã>.png: 8 khung đứng, 8 khung đi (con bay, lướt không có thì thôi), 8 khung công kích,
lấy từ chuyển động SpriteCook đã làm sạch (tools/art/nguon/ai/quai-moi/sc/). Ghi mục mob.<mã> trong data/art.json:
  anim {dung: [khung đầu, số khung], di, danh, hit: khung đòn chạm (khác khung đầu nhiều nhất), fps}, anchor = chân (giữa thân, đáy
  khung đứng đầu; con bay nhấc lên 5 điểm, con lướt 2 điểm cho lơ lửng), top = từ chân tới đỉnh đầu (thanh máu đặt trên đó).
Chuyển động ghi `tam` trong ds.json (đang chờ làm lại) thì dựng tạm từ ảnh tĩnh: đặt đúng chỗ thân trong khung, nhún / chồm bằng
dịch điểm ảnh, không vẽ thêm gì. Kiểu đòn, màu hiệu ứng (ds.json fx, mau) ghi vào data/mobs.json → fx.
Chạy: python3 -I tools/art/quai_moi_game.py [mã …]"""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageSequence

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
Q = os.path.join(R, 'tools/art/nguon/ai/quai-moi')
SCALE, HOVER = 0.5333, {'bay': 5, 'luot': 2}
BOB = {'dung': {'bay': [0, -1, -1, -2, -2, -1, -1, 0], 'luot': [0, -1, -1, -2, -2, -1, -1, 0], '*': [0, 0, 0, 1, 1, 1, 0, 0]},
       'di': {'nay': [0, -1, -2, -3, -3, -2, -1, 0], 'chan': [0, -1, 0, 0, 0, -1, 0, 0], '*': [0, 0, 1, 1, 0, 0, 1, 1]}}
LUNGE = [(-1, 0), (-2, 1), (-2, 1), (0, 0), (3, 0), (4, 0), (2, 0), (0, 0)]   # công kích tạm: lùi lấy đà rồi chồm tới (dx về phía trước, dy)


def frames(path):
    return [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(path))]


def bbox(a):
    ys, xs = np.nonzero(a[..., 3] > 0)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def place(still, ref, W, H):
    """Chỗ đặt ảnh tĩnh trong khung W×H khớp thân nhất với khung tham chiếu (so mặt nạ, chỉ dò quanh chính giữa)."""
    h, w = still.shape[:2]; cx, cy = (W - w) // 2, (H - h) // 2
    if ref is None: return cx, cy
    m, best = still[..., 3] > 0, (-1, cx, cy)
    for dy in range(-(H - h) // 2 - 1, (H - h) // 2 + 2):
        for dx in range(-4, 5):
            x, y = cx + dx, cy + dy
            if x < 0 or y < 0 or x + w > W or y + h > H: continue
            r = ref[y:y + h, x:x + w, 3] > 0
            s = (m & r).sum() / max(1, (m | r).sum())
            if s > best[0]: best = (s, x, y)
    return best[1], best[2]


def still_clip(still, at, W, H, offs):
    out = []
    for dx, dy in offs:
        f = np.zeros((H, W, 4), np.uint8); x, y = at[0] + dx, at[1] + dy
        h, w = still.shape[:2]
        f[max(0, y):min(H, y + h), max(0, x):min(W, x + w)] = still[max(0, -y):min(h, H - y), max(0, -x):min(w, W - x)]
        out.append(f)
    return out


def hit_frame(d):
    """Khung đòn chạm (game cho đòn trúng đúng khung này): trong khung 2–6, khung đầu tiên mép trước vươn xa nhất (vươn ≥ 3 điểm so với khung
    đứng), không thì khung thân chồm xa nhất (trọng tâm ≥ 1,5 điểm), không nữa thì khung khác khung đầu nhiều nhất. Soát bằng mắt 16/11/2026:
    đúng 52/56 con; 4 con còn lại ghi `hit` trong ds.json."""
    x1 = [bbox(f)[2] for f in d]; c = [float(np.nonzero(f[..., 3] > 0)[1].mean()) for f in d]
    def first_max(v): s = v[2:7]; m = max(s); return 2 + s.index(m), m - v[0]
    fe, fg = first_max(x1); ce, cg = first_max(c)
    if fg >= 3: return fe
    if cg >= 1.5: return ce
    diff = [int(((f[..., 3] > 0) != (d[0][..., 3] > 0)).sum() + (np.abs(f[..., :3].astype(int) - d[0][..., :3]).sum(2) > 60).sum()) for f in d]
    return min(6, max(2, int(np.argmax(diff[1:-1])) + 1))


def build(q, art, mobs=None):
    n, mid, mv = q['n'], q['id'], q['mv']
    clips = {k: frames(f'{Q}/sc/{n:02d}-{k}.webp') for k in ('dung', 'di', 'danh') if os.path.exists(f'{Q}/sc/{n:02d}-{k}.webp')}
    W = max(c[0].shape[1] for c in clips.values()); H = max(c[0].shape[0] for c in clips.values())
    for k, c in clips.items():   # khung lệch cỡ thì đệm giữa (SpriteCook cùng ảnh gốc ra cùng cỡ, phòng hờ)
        if c[0].shape[:2] != (H, W):
            clips[k] = [np.pad(f, (((H - f.shape[0]) // 2, (H - f.shape[0] + 1) // 2), ((W - f.shape[1]) // 2, (W - f.shape[1] + 1) // 2), (0, 0))) for f in c]
    tam = q.get('tam', [])
    if tam:
        still = np.array(Image.open(f'{Q}/tinh/{n:02d}.png').convert('RGBA'))
        ok = [k for k in clips if k not in tam]
        at = place(still, clips[ok[0]][0] if ok else clips[tam[0]][0], W, H)
        for k in tam:
            if k == 'danh': clips[k] = still_clip(still, at, W, H, LUNGE)
            else: clips[k] = still_clip(still, at, W, H, [(0, d) for d in BOB[k].get(mv, BOB[k]['*'])])
    order, anim, seq = [k for k in ('dung', 'di', 'danh') if k in clips], {}, []
    for k in order: anim[k] = [len(seq), len(clips[k])]; seq += clips[k]
    f0 = clips['dung'][0]; x0, y0, x1, y1 = bbox(f0)
    hov = HOVER.get(mv, 0); ax, ay = (x0 + x1) // 2, y1 + hov
    anim['hit'] = int(q.get('hit') or hit_frame(clips['danh']))
    anim['fps'] = 8
    strip = Image.fromarray(np.concatenate(seq, axis=1), 'RGBA')
    path = f'assets/art/qm-{mid}.png'; full = os.path.join(R, path)
    strip.save(full, optimize=True)
    pal = strip.quantize(colors=256, method=Image.Quantize.FASTOCTREE)   # tấm bảng màu nhẹ hơn, chỉ dùng khi giữ đúng từng điểm
    if np.array_equal(np.array(pal.convert('RGBA')), np.array(strip)):
        pal.save(full + '.p.png', optimize=True)
        if os.path.getsize(full + '.p.png') < os.path.getsize(full): os.replace(full + '.p.png', full)
        else: os.remove(full + '.p.png')
    v = hashlib.sha256(open(full, 'rb').read()).hexdigest()[:8]
    art[f'mob.{mid}'] = {'file': path, 'v': v, 'w': W, 'h': H, 'frames': len(seq), 'anchor': [ax, ay], 'scale': SCALE, 'anim': anim, 'top': ay - y0,
                         'note': f'Bộ Quái Mới #{n} {q["ten"]} (SpriteCook 16/11/2026): ' + ', '.join(k for k in order) + (f'; tạm từ ảnh tĩnh: {", ".join(tam)}' if tam else '')}
    if mobs is not None: mobs[mid]['fx'] = {'k': q['fx'], 'c': q['mau']}
    return f'#{n:02d} {mid}: {W}×{H} · {len(seq)} khung · chân {ax},{ay} · cao {ay - y0} · đòn khung {anim["hit"]}' + (f' · tạm {tam}' if tam else '')


def build_into(sprites, mobs=None, only=()):
    """Gọi từ tools/art/build.py (trước write_manifest, đè mục mob.<mã> cũ) hoặc chạy riêng. Trả số con đã dựng."""
    ds = json.load(open(f'{Q}/ds.json', encoding='utf-8'))['quai']
    done = [build(q, sprites, mobs) for q in ds if not only or q['id'] in only]
    if __name__ == '__main__': print('\n'.join(done))
    return len(done)


def main(only):
    ap, mp = os.path.join(R, 'data/art.json'), os.path.join(R, 'data/mobs.json')
    A, M = json.load(open(ap, encoding='utf-8')), json.load(open(mp, encoding='utf-8'))
    build_into(A['sprites'], M, only)
    open(ap, 'w', encoding='utf-8').write(json.dumps(A, ensure_ascii=False, indent=1) + '\n')   # cùng kiểu px.write_manifest
    open(mp, 'w', encoding='utf-8').write('{\n' + ',\n'.join(f' {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in M.items()) + '\n}\n')   # mỗi con một dòng như cũ


if __name__ == '__main__':
    main(set(sys.argv[1:]))
