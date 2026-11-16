"""Đưa 16 thú cưỡi mới vào game (chủ dự án 16/11/2026 17:35 "Tạo đi, tạo 16 thú cưỡi"; ảnh tĩnh thu_cuoi_moi.py, câu lệnh
thu_cuoi_cau_lenh.py). Mỗi con một tấm PNG ngang assets/art/mount-<mã>.png: 8 khung đứng nghỉ | 8 khung chạy | 8 khung tấn công, lấy từ
chuyển động SpriteCook đã làm sạch nền (tools/art/nguon/ai/thu-cuoi-moi/sc/NN-<dung|chay|danh>.webp), giữ nguyên điểm ảnh.
Ba chuyển động chung một ô, canh theo chỗ ảnh tĩnh nằm trong khung đầu của từng chuyển động (so mặt nạ), nên đổi đứng ↔ chạy không giật.
Ghi mục mount.<mã> trong data/art.json: frames 24, idle [0..7], walk [8..15], atk [16..23], hit (khung đòn chạm), fps 8,
px 0,5333 (cùng mật độ điểm với nhân vật, như ảnh ghép người cưỡi đã duyệt), anchor = chân (giữa thân, đáy ảnh tĩnh; con bay nhấc lên).
Chỗ người cưỡi đứng theo TỪNG khung (như thu_cuoi.py, chủ dự án 04/11/2026 18:44: chạy thì lưng nhấp nhô, chân không được hở):
dò mảng yên (quanh chỗ ngồi trên ảnh tĩnh, có cả 3 hàng trong suốt phía trên) trên mỗi khung; seat = độ cao mặt yên (đơn vị bản đồ),
seat_x = lệch ngang so với chân thú; chân người lún 2 điểm vào yên như ảnh ghép.
Gọi từ tools/art/build.py (sau Bộ Quái Mới) hoặc chạy riêng: python3 -I tools/art/thu_cuoi_moi_game.py [NN …]"""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageSequence

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
Q = os.path.join(R, 'tools/art/nguon/ai/thu-cuoi-moi')
PX = round(24 / 45, 4)   # đơn vị bản đồ mỗi điểm ảnh, như nhân vật (draw-acts.js UNIT_PER_PX)
ID = {1: 'cuu-vi-ho', 2: 'rua-non-bo', 3: 'su-thuu', 4: 'huou-sao', 5: 'hoa-long', 6: 'rua-nam', 7: 'meo-co-quan', 8: 'ca-voi-may',
      9: 'coc-sen', 10: 'ho-pha-le', 11: 'phuong-hoang', 12: 'sua-den-long', 13: 'su-tu-da', 14: 'bach-tuoc', 15: 'huou-may', 16: 'nhen-pha-le'}
HOVER = {8: 6, 12: 6}   # con bay (cá voi mây, sứa đèn lồng): nhấc khỏi bóng đổ
MOTIONS = ('dung', 'chay', 'danh')
SINK = 2       # chân người cưỡi lún vào yên (điểm), như ảnh ghép đã duyệt
TW, TH, TUP = 16, 6, 3   # mảng yên để dò: nửa bề ngang, số hàng yên, số hàng trống phía trên
SEARCH = 14


def frames(path):
    return [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(path))]


def bbox(a):
    ys, xs = np.nonzero(a[..., 3] > 0)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def place(still, ref):
    """Chỗ (x, y) góc trên trái ảnh tĩnh trong khung ref khớp thân nhất (tỉ lệ giao / hợp của mặt nạ)."""
    m = still[..., 3] > 0; r = ref[..., 3] > 0; h, w = m.shape; H, W = r.shape
    best = (-1, 0, 0)
    for y in range(0, H - h + 1):
        for x in range(0, W - w + 1):
            s = r[y:y + h, x:x + w]; v = (m & s).sum() / max(1, (m | s).sum())
            if v > best[0]: best = (v, x, y)
    return best[1], best[2], best[0]


def costmap(frame, tpl, x0, y0):
    """Độ lệch (trung bình mỗi điểm yên) khi đặt mảng yên tpl ở (x0 + dx, y0 + dy), dx, dy trong ±SEARCH: lệch màu chỗ cả hai có hình,
    cộng phạt chỗ trong / đục lệch nhau; các hàng trống phía trên yên nhẹ tay (cánh, đuôi sau lưng có lúc lướt qua)."""
    th, tw = tpl.shape[:2]; H, W = frame.shape[:2]; t = tpl.astype(int); ta = t[..., 3] > 0
    wgt = np.ones((th, tw)); wgt[:TUP] = 0.25; S = 2 * SEARCH + 1; C = np.full((S, S), 1e9)
    for j in range(S):
        for i in range(S):
            x, y = x0 + i - SEARCH, y0 + j - SEARCH
            if x < 0 or y < 0 or x + tw > W or y + th > H: continue
            f = frame[y:y + th, x:x + tw].astype(int); fa = f[..., 3] > 0
            C[j, i] = ((np.abs(f[..., :3] - t[..., :3]).sum(2) * (ta & fa) * wgt).sum() + 400 * ((ta != fa) * wgt).sum()) / max(1, ta.sum())
    return C


def track(costs, lam=4, step=6):
    """Đường đi yên qua các khung một chuyển động (Viterbi): khớp từng khung + phạt lam mỗi điểm dời giữa hai khung liền (tối đa step),
    khung đầu kéo về chỗ ảnh tĩnh. Khung yên bị cánh / đuôi che thì đi theo khung trước sau thay vì nhảy tới chỗ giống màu."""
    S = costs[0].shape[0]; g = np.abs(np.arange(S) - SEARCH); acc = costs[0] + lam * (g[None, :] + g[:, None]); back = []
    for c in costs[1:]:
        best = np.full_like(acc, np.inf); arg = np.zeros(acc.shape + (2,), int)
        for ddy in range(-step, step + 1):
            for ddx in range(-step, step + 1):
                sh = np.full_like(acc, np.inf)
                sh[max(0, ddy):S + min(0, ddy), max(0, ddx):S + min(0, ddx)] = acc[max(0, -ddy):S + min(0, -ddy), max(0, -ddx):S + min(0, -ddx)] + lam * (abs(ddx) + abs(ddy))
                m = sh < best; best[m] = sh[m]; arg[m] = (ddy, ddx)
        back.append(arg); acc = best + c
    j, i = np.unravel_index(int(np.argmin(acc)), acc.shape); path = [(j, i)]
    for arg in reversed(back):
        ddy, ddx = arg[j, i]; j, i = j - ddy, i - ddx; path.append((j, i))
    return [(i - SEARCH, j - SEARCH) for j, i in reversed(path)]


def hit_frame(d):
    """Khung đòn chạm (chỉ số trong tấm): khung 2–6 của đòn mà mép trước vươn xa nhất, hoà thì khung sớm hơn."""
    x1 = [bbox(f)[2] for f in d]
    return 16 + 2 + int(np.argmax(x1[2:7]))


def build(n, art, ds):
    mid, q = ID[n], ds[n]
    still = np.array(Image.open(f'{Q}/tinh/{n:02d}.png').convert('RGBA')); sh, sw = still.shape[:2]
    clips = {k: frames(f'{Q}/sc/{n:02d}-{k}.webp') for k in MOTIONS}
    at = {k: place(still, c[0]) for k, c in clips.items()}   # ảnh tĩnh nằm đâu trong khung đầu mỗi chuyển động
    # hợp khung mọi chuyển động theo toạ độ ảnh tĩnh → một ô chung
    U = [10 ** 6, 10 ** 6, -10 ** 6, -10 ** 6]
    for k, c in clips.items():
        ox, oy = at[k][:2]
        for f in c:
            x0, y0, x1, y1 = bbox(f); U = [min(U[0], x0 - ox), min(U[1], y0 - oy), max(U[2], x1 - ox), max(U[3], y1 - oy)]
    W, H = U[2] - U[0] + 2, U[3] - U[1] + 2
    seq = []
    for k in MOTIONS:
        ox, oy = at[k][:2]
        for f in clips[k]:
            o = np.zeros((H, W, 4), np.uint8); dx, dy = -ox - U[0] + 1, -oy - U[1] + 1   # toạ độ khung → ô
            fh, fw = f.shape[:2]; x0, y0 = max(0, dx), max(0, dy); x1, y1 = min(W, dx + fw), min(H, dy + fh)
            o[y0:y1, x0:x1] = f[y0 - dy:y1 - dy, x0 - dx:x1 - dx]; seq.append(o)
    cx, cy = -U[0] + 1, -U[1] + 1   # góc ảnh tĩnh trong ô
    ax, ay = cx + sw // 2, cy + sh + HOVER.get(n, 0)   # chân: giữa ảnh tĩnh, ngay dưới đáy (con bay nhấc lên)
    sx, sy = q['seat'][0] + cx, q['seat'][1] + cy   # chỗ ngồi (đáy ô hồng cũ, giữa ô) trên ô
    tpl = np.zeros((TUP + TH, 2 * TW + 1, 4), np.uint8)
    tx0, ty0 = q['seat'][0] - TW, q['seat'][1] - TUP
    for yy in range(TUP + TH):
        for xx in range(2 * TW + 1):
            Y, X = ty0 + yy, tx0 + xx
            if 0 <= Y < sh and 0 <= X < sw: tpl[yy, xx] = still[Y, X]
    seat, seat_x, trk = [], [], []
    for m in range(len(MOTIONS)):   # mỗi chuyển động một đường đi yên
        trk += track([costmap(f, tpl, sx - TW, sy - TUP) for f in seq[m * 8:(m + 1) * 8]])
    for ddx, ddy in trk:
        seat.append(round((ay - (sy + ddy + SINK)) * PX - 1, 2)); seat_x.append(round((sx + ddx - ax) * PX, 2))
    strip = Image.fromarray(np.concatenate(seq, axis=1), 'RGBA')
    path = f'assets/art/mount-{mid}.png'; full = os.path.join(R, path)
    strip.save(full, optimize=True)
    pal = strip.quantize(colors=256, method=Image.Quantize.FASTOCTREE)   # tấm bảng màu nhẹ hơn, chỉ dùng khi giữ đúng từng điểm
    if np.array_equal(np.array(pal.convert('RGBA')), np.array(strip)):
        pal.save(full + '.p.png', optimize=True)
        if os.path.getsize(full + '.p.png') < os.path.getsize(full): os.replace(full + '.p.png', full)
        else: os.remove(full + '.p.png')
    v = hashlib.sha256(open(full, 'rb').read()).hexdigest()[:8]
    art[f'mount.{mid}'] = {'file': path, 'v': v, 'w': W, 'h': H, 'frames': len(seq), 'anchor': [ax, ay], 'px': PX,
                           'idle': list(range(0, 8)), 'walk': list(range(8, 16)), 'atk': list(range(16, 24)), 'hit': hit_frame(clips['danh']), 'fps': 8,
                           'seat': seat, 'seat_x': seat_x,
                           'note': f'thú cưỡi mới #{n} {q["ten"]} (SpriteCook 16/11/2026): đứng nghỉ, chạy, tấn công mỗi thứ 8 khung'}
    if n not in HOVER:   # bay giữa tinh cầu: giữ khung chạy vươn dài nhất (draw-pet.js); con bay thì cứ bơi
        art[f'mount.{mid}']['fly'] = 8 + int(np.argmax([bbox(f)[2] - bbox(f)[0] for f in seq[8:16]]))
    return f'#{n:02d} {mid}: {W}×{H} · chân {ax},{ay} · khớp ảnh tĩnh ' + ' '.join(f'{k} {at[k][2]:.2f}' for k in MOTIONS) + \
        f" · yên lệch x {min(t[0] for t in trk)}..{max(t[0] for t in trk)}, y {min(t[1] for t in trk)}..{max(t[1] for t in trk)}"


def build_into(sprites, only=()):
    """Gọi từ tools/art/build.py (trước write_manifest) hoặc chạy riêng. Con nào chưa đủ ba chuyển động thì bỏ qua. Trả số con đã dựng."""
    ds = {r['n']: r for r in json.load(open(f'{Q}/ds.json', encoding='utf-8'))['thu']}
    done = [build(n, sprites, ds) for n in ID if (not only or n in only) and all(os.path.exists(f'{Q}/sc/{n:02d}-{k}.webp') for k in MOTIONS)]
    if __name__ == '__main__': print('\n'.join(done))
    return len(done)


def main(only):
    ap = os.path.join(R, 'data/art.json'); A = json.load(open(ap, encoding='utf-8'))
    build_into(A['sprites'], only)
    A['sprites'] = dict(sorted(A['sprites'].items()))
    open(ap, 'w', encoding='utf-8').write(json.dumps(A, ensure_ascii=False, indent=1) + '\n')   # cùng kiểu px.write_manifest


if __name__ == '__main__':
    main({int(a) for a in sys.argv[1:]})
