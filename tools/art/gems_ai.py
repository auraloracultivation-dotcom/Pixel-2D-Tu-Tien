"""Ngọc khảm 4 loại × 20 cấp từ ảnh Canva (chủ dự án 31/10/2026: "ngọc là điều quan trọng nhất mà không ai nhận ra";
mỗi loại một dáng riêng: Hồng Ngọc ngọn lửa, Lam Ngọc giọt nước, Hoàng Ngọc ngôi sao, Lục Ngọc chiếc lá; càng cao càng đẹp, càng khủng).
Nguồn nguon/ai/ngoc/<loại>-1.png (cấp 1–10) và <loại>-2.png (cấp 11–20), mỗi tấm 2 hàng × 5 ô, nền hồng.
Mỗi cấp một hình gem.<loại>-<cấp>, khung vuông S×S, 6 khung động: cấp ≥ 6 vệt sáng lướt qua, ≥ 11 sao lấp lánh quanh, ≥ 16 hào quang nhịp thở.
Cấp 1–10 giữ tỉ lệ lớn dần trong tấm (cấp 1 là viên đá vụn nhỏ). Gọi từ build.py: gems_ai.gems(save)."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas
import ai_sprites as A

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ngoc'
TYPES = {'hong-ngoc': (255, 120, 80), 'lam-ngoc': (110, 190, 255), 'hoang-ngoc': (255, 220, 90), 'luc-ngoc': (120, 240, 140)}
# thứ tự cấp → ô ảnh nguồn (1–10 tấm -1, 11–20 tấm -2): rà bằng mắt 31/10/2026, chủ dự án thấy "nhiều ngọc 11 không đẹp bằng ngọc 10".
# Viên vương miện mảnh, cánh nhỏ của tấm -2 đứng trước viên hào quang tròn cuối tấm -1; càng lên càng to, nhiều lớp, rực hơn.
ORDER = {'hong-ngoc': [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 11, 14, 12, 10, 15, 16, 17, 18, 19, 20],
         'lam-ngoc': [1, 2, 3, 4, 5, 6, 7, 8, 13, 11, 9, 14, 12, 10, 15, 16, 17, 18, 19, 20],
         'hoang-ngoc': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 11, 14, 16, 12, 15, 17, 18, 19, 20],
         'luc-ngoc': [1, 2, 3, 4, 5, 6, 7, 8, 17, 13, 15, 9, 11, 10, 14, 12, 16, 18, 19, 20]}
S, N = 28, 6   # cạnh khung, số khung động
HS = [7, 9, 11, 12, 14, 15, 17, 18, 20, 21, 22, 22, 23, 23, 24, 24, 25, 26, 27, 28]   # cao từng cấp: lớn dần đều, cấp 11 không bé hơn cấp 10


def _cells(name):
    a = A._key_near(np.array(Image.open(SRC / name).convert('RGBA')))
    cells = [A._trim(c) for c in A._split_rows(a, per=[5, 5])]
    if len(cells) != 10: raise SystemExit(f'ngọc {name}: cắt ra {len(cells)} ô, cần 10')
    return [A._defringe(c) for c in cells]


def _square(f):
    out = np.zeros((S, S, 4), np.uint8); h, w = f.shape[:2]
    f = f[max(0, (h - S) // 2):max(0, (h - S) // 2) + S, max(0, (w - S) // 2):max(0, (w - S) // 2) + S]; h, w = f.shape[:2]
    y, x = S - h - max(0, (S - h) // 4), (S - w) // 2   # hơi dưới tâm như viên đặt trên ô
    out[y:y + h, x:x + w] = f
    return out


def _shine(a, k):
    """Vệt sáng chéo lướt qua viên ngọc (khung k / N)."""
    b = a.copy(); yy, xx = np.mgrid[0:S, 0:S]; pos = -8 + k * (2 * S + 8) / (N - 1)
    m = (b[:, :, 3] > 0) & (np.abs(xx + yy - pos) < 2.2)
    b[m, :3] = np.clip(b[m, :3].astype(int) + 90, 0, 255)
    return b


def _star(b, x, y, r, col):
    for dx, dy in [(0, 0)] + [(i, 0) for i in range(-r, r + 1)] + [(0, i) for i in range(-r, r + 1)]:
        px, py = x + dx, y + dy
        if 0 <= px < S and 0 <= py < S and b[py, px, 3] == 0:
            c = (255, 255, 255) if dx == 0 and dy == 0 else col
            b[py, px] = (*c, 255)


def _halo(b, col, alpha):
    m = b[:, :, 3] > 0; ring = np.zeros_like(m)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    ring &= ~m
    b[ring] = (*col, alpha)


def _frames(base, lv, col, seed):
    rnd = np.random.default_rng(seed); spots = [(int(rnd.integers(2, S - 2)), int(rnd.integers(2, S - 6)), int(rnd.integers(0, N))) for _ in range(2 + lv // 5)]
    out = []
    for k in range(N):
        b = base.copy()
        if lv >= 16: _halo(b, tuple(min(255, v + 60) for v in col), (120, 170, 220, 255, 220, 170)[k])   # hào quang sáng hơn màu loại, nhịp thở
        if lv >= 6 and k < 4: b = _shine(b, k + 1)
        if lv >= 11:
            for x, y, ph in spots:
                t = (k - ph) % N
                if t < 3: _star(b, x, y, (1, 2, 1)[t] if lv >= 16 else (0, 1, 0)[t], col)
        c = Canvas(S, S); c.a = np.ascontiguousarray(b); out.append(c)
    return out


def gems(save):
    n = 0
    for t, col in TYPES.items():
        if not (SRC / f'{t}-1.png').exists(): continue
        src = _cells(f'{t}-1.png') + (_cells(f'{t}-2.png') if (SRC / f'{t}-2.png').exists() else [])
        cells = [src[j - 1] for j in ORDER[t] if j <= len(src)]
        for i, c in enumerate(cells):
            lv = i + 1
            f = A._act_frames([c], HS[i], 20 if lv <= 10 else 24, 'feet')[0]
            base = _square(A._trim(f) if A._bbox(f) else f)
            save(f'gem.{t}-{lv}', _frames(base, lv, col, lv * 7 + len(t)), (S // 2, S // 2), f'{t} cấp {lv} (ảnh Canva nguon/ai/ngoc/, {N} khung động)')
            n += 1
    return n
