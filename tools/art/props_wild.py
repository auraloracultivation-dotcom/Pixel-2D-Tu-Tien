"""Cây cỏ và vật hoang trên tinh cầu Mộc, Phong và vùng Hư Không bằng pixel (thay hình khối trong
src/world/draw-forest.js, draw-wind.js, draw-void.js): cổ thụ (Z), nấm phát sáng (n), đèn lồng (Q), cây khô (V),
trụ đá đen (U), tinh thể tím (*)."""
import math, random
from px import Canvas, hx


def _blobs(c, blobs, L, w, h):
    """Tán lá từ các đốm tròn: sáng phía trên trái, tối phía dưới phải, viền ngoài tối."""
    for y in range(h):
        for x in range(w):
            best = None
            for bx, by, r in blobs:
                d = math.hypot(x - bx, (y - by) * 1.1)
                if d <= r:
                    lit = ((bx - x) + (by - y)) / r
                    v = 1 + (1 if lit > 0.55 else 0) - (1 if lit < -0.45 or (d > r - 1.2 and lit < 0) else 0)
                    best = v if best is None else max(best, v)
            if best is not None:
                c.px(x, y, L[max(0, min(3, best))])


def old_tree(seed):
    """Cổ thụ 32×40: thân to có rễ bò, tán đậm nhiều tầng, rêu và đốm sáng; seed 1 có dây leo hoa trắng."""
    w, h = 32, 40
    c = Canvas(w, h)
    B = [hx('#2e2014'), hx('#4a3420'), hx('#6a4a2c'), hx('#8a6a42')]
    for y in range(22, 38):   # thân loe dần xuống gốc
        half = 3 + (y - 22) // 5
        for x in range(16 - half, 16 + half):
            lx = x - (16 - half)
            c.px(x, y, B[3] if lx == 0 else B[0] if lx == 2 * half - 1 else B[2] if lx < half else B[1])
        if y % 4 == 1:
            c.px(15, y, B[0])
    for dx, ln in ((-1, 6), (1, 7)):   # rễ bò sang hai bên
        for k in range(ln):
            x = 16 + dx * (5 + k)
            y = 37 - (k < 2)
            c.px(x, y, B[1]); c.px(x, y + 1, B[0])
    L = [hx('#123a22'), hx('#1f5a32'), hx('#2e7a3e'), hx('#4aa055')]
    _blobs(c, [(16, 13, 11), (7, 19, 7), (25, 19, 7), (10, 8, 7), (22, 7, 7), (16, 22, 8)], L, w, h)
    rnd = random.Random(seed + 40)
    for _ in range(10):
        x, y = rnd.randrange(6, 26), rnd.randrange(3, 22)
        if c.get(x, y)[:3] == L[2][:3]:
            c.px(x, y, hx('#8ccc72'))
    if seed % 2:   # dây leo hoa trắng rủ xuống thân
        for y in range(18, 30):
            c.px(12 + (y % 3 == 0), y, hx('#3e8a48'))
        for y in (21, 25, 28):
            c.px(12, y, hx('#f6f2e0'))
    return c.outline(hx('#0a2014'))


def mushroom(seed):
    """Cụm nấm phát sáng 16×12: mũ xanh ngọc có đốm, chân trắng ngà; seed 1 thêm nấm nhỏ."""
    c = Canvas(16, 12)
    CAP = [hx('#1a6a8a'), hx('#3aa8d0'), hx('#7ae0ff'), hx('#d0f8ff')]
    STEM = [hx('#a89a80'), hx('#e8e0c8')]
    caps = [(5, 5, 4, 2.6), (11, 7, 3, 2)] + ([(14, 9, 2, 1.4)] if seed % 2 else [])
    for cx, cy, rw, rh in caps:
        for y in range(int(cy), 12):   # chân
            c.px(cx, y, STEM[1]); c.px(cx + 1, y, STEM[0])
        for y in range(int(cy - rh) - 1, int(cy) + 1):
            for x in range(cx - rw, cx + rw + 2):
                e = ((x - cx - 0.5) / (rw + 0.5)) ** 2 + ((y - cy) / (rh + 0.5)) ** 2
                if e < 1 and y <= cy:
                    c.px(x, y, CAP[3] if y < cy - rh + 0.6 and x <= cx else CAP[2] if x <= cx else CAP[1])
        for x in range(cx - rw, cx + rw + 2):
            if c.filled(x, int(cy)):
                c.px(x, int(cy), CAP[0])
        c.px(cx - 1, int(cy - 1), CAP[3])
    return c.outline(hx('#0a2a3a'))


def lantern(f):
    """Đèn lồng giấy đỏ treo cột gỗ 10×22: 2 khung lửa nhảy."""
    c = Canvas(10, 22)
    W = [hx('#2e1e12'), hx('#5a3e24'), hx('#7a5a36')]
    for y in range(4, 22):
        c.px(4, y, W[2]); c.px(5, y, W[1])
    for x in range(1, 9):
        c.px(x, 3, W[1])
    R = [hx('#8a1a1a'), hx('#c0302a'), hx('#e85a3a'), hx('#ffb070')]
    for y in range(5, 13):
        half = 3 if 6 < y < 11 else 2
        for x in range(5 - half - 1, 5 + half):
            col = R[1] if x < 4 else R[0]
            if 6 < y < 11 and x in (3, 4, 5):
                col = R[3] if f == 0 and y in (8, 9) else R[2]
            c.px(x, y, col)
    for x in range(2, 8):
        c.px(x, 5, R[0]); c.px(x, 12, R[0])
    c.px(4, 13, hx('#f2c94c')); c.px(4, 14 + f, hx('#c0302a'))   # tua
    return c.outline(hx('#1b1830'))


def dead_tree(seed):
    """Cây khô 16×24: thân xám tím nứt, cành trơ chĩa lên, seed 1 có quạ đậu."""
    c = Canvas(16, 24)
    B = [hx('#1e1a24'), hx('#2e2834'), hx('#4a4252'), hx('#6a6074')]
    for y in range(9, 23):
        c.px(7, y, B[3]); c.px(8, y, B[1]); c.px(9, y, B[0] if y > 15 else B[1])
    c.px(6, 22, B[1]); c.px(10, 22, B[0]); c.px(5, 23, B[0]); c.px(11, 23, B[0])
    for pts in ([(7, 12), (5, 10), (4, 8), (3, 6), (3, 5)], [(9, 10), (11, 8), (12, 6), (13, 4)], [(8, 9), (8, 6), (7, 4), (7, 2)], [(12, 6), (14, 6)], [(4, 8), (2, 8)]):
        for x, y in pts:
            c.px(x, y, B[2])
    if seed % 2:
        for x, y in ((12, 4), (13, 3), (14, 4), (13, 4)):
            c.px(x, y - 1, B[0])
        c.px(14, 2, hx('#c0283a'))
    return c.outline(hx('#0e0c14'))


def black_pillar(seed):
    """Trụ đá đen 12×26: khối đá thô lệch, phù văn tím phát sáng; seed 1 vỡ đỉnh."""
    c = Canvas(12, 26)
    S = [hx('#16121e'), hx('#2a2434'), hx('#3e3648'), hx('#5a5068')]
    top = 3 if seed % 2 else 0
    for y in range(top, 26):
        for x in range(1, 11):
            if seed % 2 and y < 6 and x > 4 + (y - 3) * 2:
                continue
            col = S[3] if x == 1 else S[0] if x == 10 else S[2] if x < 5 else S[1]
            if y % 7 == 6:
                col = S[0] if x > 1 else S[1]
            c.px(x, y, col)
    for x, y in ((5, 10), (6, 11), (5, 12), (6, 15), (5, 16), (6, 17), (5, 19)):
        c.px(x, y, hx('#c0a0ff'))
    c.px(6, 12, hx('#8a6ad0')); c.px(5, 18, hx('#8a6ad0'))
    return c.outline(hx('#0a0810'))


def crystal(seed):
    """Tinh thể tím 14×20: cụm lăng trụ, mặt sáng trái, mặt tối phải, đỉnh trắng; seed 1 cụm thấp ba nhánh."""
    c = Canvas(14, 20)
    P = [hx('#2e1450'), hx('#5a2a8a'), hx('#8a4ac8'), hx('#c06aff'), hx('#f0d8ff')]
    shards = [(7, 1, 3, 19), (3, 8, 2, 19), (11, 9, 2, 19)] if seed == 0 else [(6, 6, 3, 19), (2, 10, 2, 19), (10, 7, 2, 19), (12, 13, 1, 19)]
    for sx, top, hw, bot in shards:
        for y in range(top, bot + 1):
            spread = min(hw, (y - top + 1) // 2 + 1)
            for x in range(sx - spread, sx + spread + 1):
                col = P[3] if x < sx else P[2] if x == sx else P[1]
                if y <= top + 1:
                    col = P[4]
                c.px(x, y, col)
        c.px(sx - 1, top + 3, P[4])
    for x in range(1, 13):
        if c.filled(x, 19):
            c.px(x, 19, P[0])
    return c.outline(hx('#14081e'))
