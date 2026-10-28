"""Vật trên mặt tinh cầu Kim và Thổ bằng pixel (thay hình khối trong src/world/draw-metal.js, draw-earth.js):
mộ kiếm (J), kiếm gãy nằm (h), cột đá khắc chữ cổ (I), ruộng bậc thang (y)."""
import random
from px import Canvas, hx

STEEL = [hx(c) for c in ('#5a6474', '#9aa4b4', '#d8e0ea', '#ffffff')]
HILT = [hx(c) for c in ('#3e2a14', '#7a5a2a', '#a8803a')]
GOLD = hx('#ffd24a')
MOUND = [hx(c) for c in ('#5e5240', '#7a6c52', '#948466', '#ae9e7e')]
INK = hx('#1b1830')


def sword_grave(seed):
    """Mộ kiếm 16×24: nấm mộ đất đá thấp, thanh kiếm cắm thẳng, chuôi vàng; seed 1 kiếm nghiêng, có tua đỏ."""
    c = Canvas(16, 24)
    for y in range(18, 23):   # nấm mộ
        for x in range(2, 14):
            e = ((x - 7.5) / 6) ** 2 + ((y - 20.5) / 2.6) ** 2
            if e < 1:
                c.px(x, y, MOUND[3] if y < 19.5 and x < 9 else MOUND[2] if e < 0.55 else MOUND[1])
    for x in (4, 10, 12):
        c.px(x, 21, MOUND[0])
    lean = 1 if seed % 2 else 0
    for y in range(6, 20):   # lưỡi kiếm: sống sáng trái, cạnh tối phải
        dx = (lean * (19 - y)) // 7
        c.px(7 + dx, y, STEEL[2]); c.px(8 + dx, y, STEEL[1])
    c.px(7, 19, STEEL[0]); c.px(8, 19, STEEL[0])
    dx = (lean * 13) // 7
    for x in range(4, 12):   # chắn tay
        c.px(x + dx, 5, HILT[1])
    c.px(4 + dx, 5, HILT[0]); c.px(11 + dx, 5, HILT[0])
    for y in range(1, 5):   # chuôi quấn
        c.px(7 + dx, y, HILT[2] if y % 2 else HILT[1]); c.px(8 + dx, y, HILT[1] if y % 2 else HILT[0])
    c.px(7 + dx, 0, GOLD); c.px(8 + dx, 0, GOLD)
    if seed % 2:   # tua đỏ phất
        for k, (x, y) in enumerate(((9, 3), (10, 4), (10, 5), (11, 6))):
            c.px(x + dx, y, hx('#c0283a') if k < 3 else hx('#801a28'))
    c.outline(INK)
    for x in range(3, 13):   # bóng dưới mộ
        if not c.filled(x, 23):
            c.px(x, 23, (27, 24, 48, 60))
    return c


def broken_sword(kind):
    """Kiếm gãy nằm 16×16: 0 ngang, 1 chéo xuống, 2 chéo lên. Lưỡi cụt có mẻ, chuôi gỗ."""
    c = Canvas(16, 16)
    if kind == 0:
        pts = [(x, 9) for x in range(3, 10)]
    elif kind == 1:
        pts = [(3 + i, 5 + i) for i in range(7)]
    else:
        pts = [(3 + i, 12 - i) for i in range(7)]
    for i, (x, y) in enumerate(pts):
        c.px(x, y, STEEL[2] if i % 3 else STEEL[1]); c.px(x, y + 1, STEEL[0])
    ex, ey = pts[-1]
    sx, sy = (1, 0) if kind == 0 else (1, 1) if kind == 1 else (1, -1)
    for k in range(1, 3):   # chắn tay + chuôi
        c.px(ex + sx * k, ey + sy * k, HILT[1]); c.px(ex + sx * k, ey + sy * k + 1, HILT[0])
    c.px(ex + sx, ey + sy - 1, HILT[2]); c.px(ex + sx, ey + sy + 2, HILT[0])
    c.px(ex + sx * 3, ey + sy * 3, GOLD)
    x0, y0 = pts[0]
    c.px(x0 - 1, y0 + 1, STEEL[1])   # mảnh vỡ
    c.outline(INK)
    return c


def pillar(seed):
    """Cột đá đất nung 12×26: đế và mũ loe, thân sọc khối, seed 1 có chữ cổ phát sáng hổ phách."""
    P = [hx(c) for c in ('#4a3020', '#6a4a30', '#8a6a4a', '#a8865e')]
    c = Canvas(12, 26)
    for y in range(26):
        cap = y < 3 or y > 21
        x0, x1 = (0, 12) if cap else (2, 10)
        for x in range(x0, x1):
            lx = x - x0
            col = P[3] if lx == 0 or (cap and y in (0, 22)) else P[0] if lx == x1 - x0 - 1 or y in (2, 25) else P[2] if lx < (x1 - x0) // 2 else P[1]
            if not cap and y % 6 == 5:
                col = P[0] if lx else P[1]
            c.px(x, y, col)
    if seed % 2:
        for x, y in ((5, 8), (6, 8), (5, 9), (6, 10), (5, 12), (6, 12), (6, 13), (5, 14)):
            c.px(x, y, hx('#ffc070'))
        c.px(5, 10, hx('#d8a070')); c.px(5, 13, hx('#d8a070'))
    return c.outline(hx('#2a1a10'))


def terrace(seed):
    """Ruộng bậc thang 16×16, ghép liền ngang: bờ đất trên, mặt nước ruộng phản sáng, lúa non xanh hai hàng."""
    rnd = random.Random(seed + 3)
    E = [hx(c) for c in ('#4a3420', '#6a5030', '#8a6a42')]
    Wt = [hx(c) for c in ('#5a7a5a', '#7a9a6a', '#a8c8a0')]
    R = [hx(c) for c in ('#4a7a2a', '#7aa83a', '#a8c05a', '#d0e080')]
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            c.px(x, y, Wt[1] if (x + y * 3 + seed) % 11 else Wt[2])
    for x in range(16):   # bờ đất: đỉnh sáng, mặt bờ, bóng xuống ruộng
        c.px(x, 0, E[2]); c.px(x, 1, E[1]); c.px(x, 2, E[0] if x % 3 else E[1]); c.px(x, 3, Wt[0])
    for row in (6, 11):
        for x in range(1 + seed % 2, 16, 3):
            h = 3 + (rnd.random() < 0.4)
            for k in range(h):
                c.px(x, row + 3 - k, R[1] if k < h - 1 else R[3])
            c.px(x + 1, row + 3, R[0])
            c.px(x - 1, row + 2, R[2])
    return c
