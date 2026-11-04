"""Thú cưỡi làm lại (chủ dự án 04/11/2026 17:58–18:01): hình đứng chi tiết hơn (SpriteCook, chibi pixel art, theo đúng hình cũ,
nguon/ai/thu-cuoi/<id>-goc96.png) + chạy 8 khung (pixel-engine-v1.5, <id>-chay.webp). Xuất 'mount.<id>' 9 khung: 0 đứng, 1–8 chạy
(walk), mọi khung chung ô vuông, chung đáy (chân). 'px' = đơn vị bản đồ mỗi điểm ảnh, tính để thú cao đúng bằng hình cũ
(OLD_H điểm ảnh × 24/45) — hình chi tiết hơn nhưng không to ra, chỗ ngồi (data/pets.json → seat) giữ nguyên.
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas, MANIFEST

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'thu-cuoi'
OLD_H = {'bach-loc': 66, 'phong-lang': 56, 'hoa-ky-lan': 60, 'tuyet-ly': 56}   # cao (điểm ảnh) của hình cũ, 24/45 đơn vị mỗi điểm
UNIT = 24 / 45


def _fit(f, S):
    a = np.array(f); ys, xs = np.nonzero(a[:, :, 3] > 40)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    out = np.zeros((S, S, 4), np.uint8); h, w = a.shape[:2]
    ox = (S - w) // 2; out[S - 2 - h:S - 2, ox:ox + w] = a
    return out, h


def build(save):
    n = 0
    for mid, oldh in OLD_H.items():
        g, r = SRC / f'{mid}-goc96.png', SRC / f'{mid}-chay.webp'
        if not (g.exists() and r.exists()): continue
        run = Image.open(r).convert('RGBA'); fw = run.height; S = fw
        frames, hs = [], []
        for f in [Image.open(g).convert('RGBA')] + [run.crop((i * fw, 0, i * fw + fw, fw)) for i in range(run.width // fw)]:
            a, h = _fit(f, S); hs.append(h); c = Canvas(S, S); c.a = a; frames.append(c)
        save('mount.' + mid, frames, (S // 2, S - 2), f'thú cưỡi {mid}: đứng + chạy {len(frames) - 1} khung (SpriteCook)')
        MANIFEST['mount.' + mid]['walk'] = list(range(1, len(frames)))
        MANIFEST['mount.' + mid]['px'] = round(oldh * UNIT / hs[0], 4)   # cao như hình cũ
        n += 1
    return n
