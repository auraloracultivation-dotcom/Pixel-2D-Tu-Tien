"""Vách hang theo hệ, đá linh căn, cửa phong ấn bằng pixel (thay hình khối trong src/world/draw-forest.js, draw-metal.js,
draw-earth.js, draw-map.js). Vách mỗi loại 4 khung: 2 khung mặt vách (ô ngay trên nền đi được, thấy mặt đứng) và 2 khung đỉnh vách.
- root (X, Cổ Thụ Tâm, Rễ Mẫu Thụ): đất sẫm, rễ cây bò, rêu ở mép trên.
- copper (C, Kiếm Trủng): đá đồng sẫm, mạch vàng, mép trên đồng sáng.
- earth (E, Địa Cung): đất nện từng lớp, đá lẫn, mép trên nâu đỏ."""
import random
from px import Canvas, hx

KITS = {
    'root': dict(base=('#140e0a', '#241a12', '#33251a', '#4a3624'), vein=('#3e2a18', '#5a4026', '#7a5a36'), lip=('#2e5a2e', '#3e7a3e', '#5aa058')),
    'copper': dict(base=('#16120c', '#2a2418', '#3a3222', '#4e4430'), vein=('#8a6a2a', '#c89a3a', '#ffd24a'), lip=('#5a4422', '#8a6a3a', '#c09a5a')),
    'earth': dict(base=('#22160e', '#3a2618', '#4e3422', '#6a4a30'), vein=('#5a5048', '#7a7068', '#a09890'), lip=('#5a3a20', '#8a5a32', '#b07a4a')),
}


def wall(kind, face, seed):
    K = KITS[kind]
    B, V, L = [hx(c) for c in K['base']], [hx(c) for c in K['vein']], [hx(c) for c in K['lip']]
    rnd = random.Random(seed * 17 + len(kind) + face * 3)
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            if face:   # mặt đứng: lớp ngang, tối dần xuống chân
                band = (y + (x // 4 + seed) % 2) // 4
                col = B[3] if band == 0 else B[2] if band == 1 else B[1] if band == 2 else B[0]
                if kind == 'earth' and y % 4 == 3:
                    col = B[0]
            else:   # đỉnh vách nhìn từ trên: lốm đốm tối
                col = B[1] if (x * 5 + y * 3 + seed) % 7 else B[0]
                if (x * 7 + y * 11 + seed) % 23 == 0:
                    col = B[2]
            c.px(x, y, col)
    if kind == 'root':   # rễ bò ngoằn ngoèo
        x = rnd.randrange(3, 13)
        for y in range(16):
            x += rnd.choice((-1, 0, 0, 1))
            x = max(1, min(14, x))
            c.px(x, y, V[1]); c.px(x + 1, y, V[0])
            if y % 5 == 2:
                c.px(x - 1, y, V[2])
    elif kind == 'copper':   # mạch vàng chéo, đốm kim loại
        x0, y0 = rnd.randrange(0, 8), rnd.randrange(0, 6)
        for k in range(10):
            c.px(x0 + k, y0 + k // 2 + (k % 3 == 0), V[1] if k % 4 else V[2])
        for _ in range(3):
            c.px(rnd.randrange(16), rnd.randrange(16), V[0])
    else:   # đá lẫn trong đất
        for _ in range(2):
            x, y = rnd.randrange(1, 13), rnd.randrange(2, 13)
            c.px(x, y, V[2]); c.px(x + 1, y, V[1]); c.px(x, y + 1, V[0]); c.px(x + 1, y + 1, B[0])
    if face:   # mép trên: rêu / đồng / đất sáng rủ xuống
        for x in range(16):
            c.px(x, 0, L[1]); c.px(x, 1, L[2] if (x + seed) % 3 == 0 else L[1])
            if (x + seed) % 4 == 1:
                c.px(x, 2, L[0])
        for x in range(16):
            c.px(x, 15, B[0])
    return c


def wall_frames(kind):
    """Thứ tự: mặt vách ×2, đỉnh vách ×2 (src/world/draw-ground.js drawWallTile)."""
    return [wall(kind, True, s) for s in range(2)] + [wall(kind, False, s) for s in range(2)]


def spirit_stone():
    """Đá linh căn 14×26: trụ đá xám khắc, khe giữa để trống (game tô màu linh căn của người chơi vào khe, nhấp nháy)."""
    c = Canvas(14, 26)
    S = [hx('#4a4458'), hx('#6a6478'), hx('#8a8498'), hx('#aaa4b8'), hx('#cec8dc')]
    for y in range(26):
        cap = y < 3 or y > 22
        x0, x1 = (0, 14) if cap else (2, 12)
        for x in range(x0, x1):
            lx = x - x0
            col = S[4] if cap and y in (0, 23) else S[3] if lx == 0 else S[0] if lx == x1 - x0 - 1 else S[2] if lx < (x1 - x0) // 2 else S[1]
            c.px(x, y, col)
    for y in range(5, 21):   # khe trống giữa thân
        for x in (6, 7):
            c.a[y, x] = 0
    for y in (4, 21):
        for x in range(5, 9):
            c.px(x, y, S[0])
    for y in range(5, 21):
        c.px(5, y, S[0]); c.px(8, y, S[3])
    return c.outline(hx('#1b1830'))


def seal(f):
    """Cửa phong ấn 16×16 (cửa bí cảnh còn khoá): màn chắn đỏ, bùa vàng dán giữa, vân chạy 2 khung."""
    c = Canvas(16, 16)
    R = [hx('#3a0e18'), hx('#5a1a28'), hx('#8a2234'), hx('#c0283a'), hx('#ff6a7a')]
    for y in range(16):
        for x in range(16):
            v = (x + y * 2 + f * 3) % 8
            c.px(x, y, R[3] if v == 0 else R[2] if v < 3 else R[1])
    for y in range(16):
        c.px(0, y, R[0]); c.px(15, y, R[0])
    for y in range(3, 13):   # lá bùa
        for x in range(5, 11):
            c.px(x, y, hx('#f2c94c') if x not in (5, 10) else hx('#c08a20'))
    for y in (5, 7, 9, 11):
        c.px(7, y, R[3]); c.px(8, y, R[3])
    c.px(7, 6, R[2]); c.px(8, 8, R[2]); c.px(7, 10, R[2])
    if f:
        c.px(3, 4, R[4]); c.px(12, 11, R[4])
    return c
