"""Thú cưỡi làm lại (chủ dự án 04/11/2026 17:58–18:01): hình đứng chi tiết hơn (SpriteCook, chibi pixel art, theo đúng hình cũ,
nguon/ai/thu-cuoi/<id>-goc96.png) + chạy 8 khung (pixel-engine-v1.5, <id>-chay.webp). Xuất 'mount.<id>' 9 khung: 0 đứng, 1–8 chạy
(walk), mọi khung chung ô vuông, chung đáy (chân). 'px' = đơn vị bản đồ mỗi điểm ảnh: cao bằng hình cũ (OLD_H điểm ảnh × 24/45)
nhân SCALE (chủ dự án 04/11/2026 18:44: to gấp 1,3 lần).
Chỗ đứng của người cưỡi đo theo yên trên TỪNG khung (chủ dự án 18:44: chạy thì chân hở khỏi lưng thú, vì lưng nhấp nhô theo
khung chạy mà chỗ đứng chỉ đo ở khung đứng): lấy mảng yên trên khung đứng (SADDLE, toạ độ ảnh goc96), dò chỗ khớp nhất trên mỗi
khung, ghi vào manifest 'seat' [độ cao mặt yên, đơn vị bản đồ] và 'seat_x' [lệch ngang tâm yên] theo khung (src/render/draw-pet.js đọc).
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas, MANIFEST

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'thu-cuoi'
OLD_H = {'bach-loc': 66, 'phong-lang': 56, 'hoa-ky-lan': 60, 'tuyet-ly': 56}   # cao (điểm ảnh) của hình cũ, 24/45 đơn vị mỗi điểm
UNIT = 24 / 45
SCALE = 1.3
# mặt yên trên hình đứng <id>-goc96.png (x0, y0 = mép trên mặt yên, x1, y1), đo bằng mắt trên lưới phóng to
SADDLE = {'bach-loc': (30, 47, 54, 56), 'phong-lang': (29, 38, 50, 46), 'hoa-ky-lan': (29, 38, 43, 45), 'tuyet-ly': (36, 39, 52, 47)}
SEARCH = 14   # dò lệch tối đa (điểm ảnh) quanh chỗ yên ở khung đứng


def _fit(f, S):
    a = np.array(f); ys, xs = np.nonzero(a[:, :, 3] > 40)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    out = np.zeros((S, S, 4), np.uint8); h, w = a.shape[:2]
    ox = (S - w) // 2; out[S - 2 - h:S - 2, ox:ox + w] = a
    return out, h, (ox - xs.min(), S - 2 - h - ys.min())


def _find(frame, tpl, x0, y0):
    """Chỗ mảng yên tpl khớp nhất trên khung (tổng bình phương lệch màu, tính cả độ trong suốt), quanh (x0, y0)."""
    th, tw = tpl.shape[:2]; S = frame.shape[0]; t = tpl.astype(int); best = None
    for y in range(max(0, y0 - SEARCH), min(S - th, y0 + SEARCH) + 1):
        for x in range(max(0, x0 - SEARCH), min(S - tw, x0 + SEARCH) + 1):
            d = ((frame[y:y + th, x:x + tw].astype(int) - t) ** 2).sum()
            if best is None or d < best[0]: best = (d, x, y)
    return best[1], best[2]


def build(save):
    n = 0
    for mid, oldh in OLD_H.items():
        g, r = SRC / f'{mid}-goc96.png', SRC / f'{mid}-chay.webp'
        if not (g.exists() and r.exists()): continue
        run = Image.open(r).convert('RGBA'); fw = run.height; S = fw
        frames, arrs, hs = [], [], []
        for i, f in enumerate([Image.open(g).convert('RGBA')] + [run.crop((i * fw, 0, i * fw + fw, fw)) for i in range(run.width // fw)]):
            a, h, off = _fit(f, S); hs.append(h); arrs.append(a); c = Canvas(S, S); c.a = a; frames.append(c)
            if i == 0: off0 = off
        px = round(oldh * UNIT / hs[0] * SCALE, 4)
        sx0, sy0, sx1, sy1 = SADDLE[mid]; bx, by = sx0 + off0[0], sy0 + off0[1]
        tpl = arrs[0][by:by + sy1 - sy0, bx:bx + sx1 - sx0]
        seat, seat_x = [], []
        for a in arrs:
            x, y = _find(a, tpl, bx, by)
            seat.append(round((S - 3 - y) * px, 2)); seat_x.append(round((x + (sx1 - sx0) / 2 - S // 2) * px, 2))
        save('mount.' + mid, frames, (S // 2, S - 2), f'thú cưỡi {mid}: đứng + chạy {len(frames) - 1} khung (SpriteCook)')
        M = MANIFEST['mount.' + mid]
        M['walk'] = list(range(1, len(frames))); M['px'] = px; M['seat'] = seat; M['seat_x'] = seat_x
        n += 1
    return n
