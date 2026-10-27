"""Nền đảo bằng pixel: cỏ, đường đất, nền đá, mép cỏ, vách đảo, nhà mái ngói, cây, đá, hoa.
Mỗi ô 16×16 điểm ảnh = 1 ô bản đồ. Màu sáng ấm, hợp tông hình khối cũ (cỏ #7cc46a, đất #c9a46a, đá #d8d2c4)."""
import math, random
import numpy as np
from px import Canvas, hx

G = [hx(c) for c in ('#4f9a4e', '#6cb85e', '#7cc46a', '#9cd67a', '#c4ec98')]   # cỏ: tối → sáng
DIRT = [hx(c) for c in ('#8a6a44', '#a8844f', '#c9a46a', '#dcbf8a')]
STONE = [hx(c) for c in ('#9a927f', '#b4ac9c', '#d0c9b9', '#e4ded0')]
EARTH = [hx(c) for c in ('#4a3424', '#6a4e36', '#8a6a48', '#a8845a')]


def _wrap(c, x, y, col):
    c.px(x % 16, y % 16, col)


def grass(seed):
    rnd = random.Random(seed)
    c = Canvas(16, 16); c.a[:, :] = G[2]
    for _ in range(6):   # túm cỏ chữ v
        x, y = rnd.randrange(16), rnd.randrange(16)
        _wrap(c, x, y, G[1]); _wrap(c, x - 1, y - 1, G[1]); _wrap(c, x + 1, y - 1, G[1]); _wrap(c, x, y - 1, G[3])
    for _ in range(4):
        _wrap(c, rnd.randrange(16), rnd.randrange(16), G[3])
    if seed % 4 == 3:   # đốm cỏ non
        x, y = rnd.randrange(16), rnd.randrange(16)
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            _wrap(c, x + dx, y + dy, G[3])
        _wrap(c, x, y, G[4])
    return c


def path(seed):
    rnd = random.Random(seed + 50)
    c = Canvas(16, 16); c.a[:, :] = DIRT[2]
    for _ in range(5):   # vệt đất sẫm, sáng
        x, y = rnd.randrange(16), rnd.randrange(16)
        _wrap(c, x, y, DIRT[1]); _wrap(c, x + 1, y, DIRT[1])
        _wrap(c, rnd.randrange(16), rnd.randrange(16), DIRT[3])
    for _ in range(seed % 3):   # sỏi: viền dưới tối, đỉnh sáng
        x, y = rnd.randrange(2, 14), rnd.randrange(2, 14)
        c.px(x, y, STONE[2]); c.px(x + 1, y, STONE[2]); c.px(x, y + 1, DIRT[0]); c.px(x + 1, y + 1, DIRT[0]); c.px(x, y - 1, STONE[3])
    return c


def stone(seed):
    """Nền đá lát: hai hàng phiến lệch nhau, mạch vữa, cạnh trên sáng, cạnh dưới tối."""
    rnd = random.Random(seed + 90)
    c = Canvas(16, 16); c.a[:, :] = STONE[2]
    for row, off in ((0, 0), (8, 5 + seed % 3)):
        for x in range(16):
            c.px(x, row + 7, STONE[0]); c.px(x, row, STONE[3])
            c.px(x, row + 6, STONE[1])
        for jx in (off, off + 8):   # mạch dọc
            jx %= 16
            for y in range(row, row + 8):
                c.px(jx, y, STONE[0])
            for y in range(row + 1, row + 6):
                c.px((jx + 1) % 16, y, STONE[3])
    if seed % 4 == 1:   # vết nứt
        x, y = rnd.randrange(3, 12), rnd.randrange(2, 5)
        for k in range(4):
            c.px(x + k, y + (k > 1), STONE[0])
    if seed % 4 == 2:   # rêu kẽ đá
        x = rnd.randrange(2, 13)
        for dx in range(3):
            c.px(x + dx, 7, G[1]); c.px(x + dx + 1, 15, G[2])
    return c


def edge():
    """Mép cỏ phủ lên đường đất / nền đá, 4 hướng: trên, phải, dưới, trái (cỏ nằm ở cạnh đó)."""
    rnd = random.Random(7)
    base = Canvas(16, 16)
    for x in range(16):
        d = 2 + (rnd.random() < 0.45) + (x % 5 == 2)
        for y in range(d):
            base.px(x, y, G[2] if y < d - 1 else G[1])
        base.px(x, d, (0, 0, 0, 40))   # bóng mờ dưới mép cỏ
    out = []
    for k in range(4):
        c = Canvas(16, 16); c.a = np.ascontiguousarray(np.rot90(base.a, -k)); out.append(c)
    return out


def cliff(seed, deep=False):
    """Vách đảo ngay dưới đất liền (deep: hàng thứ hai, đáy lởm chởm và rễ treo). Hai mép trái phải khớp nhau để ghép liền."""
    rnd = random.Random(seed * 13 + deep)
    c = Canvas(16, 16)
    for x in range(16):
        bottom = 16 if not deep else (3 + int(4 * abs(math.sin((x + seed * 5) * 0.9))) if 0 < x < 15 else 3)
        for y in range(bottom):
            yy = y + (16 if deep else 0)
            band = (yy + (x * 7 + seed) % 3) // 5
            col = EARTH[3 - min(3, band // 2 + 1)] if yy > 2 else EARTH[3]
            if y == bottom - 1:
                col = EARTH[0]
            c.px(x, y, col)
        if not deep:
            c.px(x, 0, G[1]); c.px(x, 1, G[0] if (x + seed) % 4 else G[1])   # mép cỏ rủ xuống
            if (x + seed) % 5 == 0:
                c.px(x, 2, G[0])
    for _ in range(2 if not deep else 1):   # đá lẫn trong đất
        x, y = rnd.randrange(2, 13), rnd.randrange(5, 12) if not deep else 1
        c.px(x, y, STONE[1]); c.px(x + 1, y, STONE[2]); c.px(x, y + 1, EARTH[0]); c.px(x + 1, y + 1, EARTH[0])
    if deep:   # rễ treo
        x = 4 + seed * 3 % 8
        for y in range(3, 9):
            c.px(x + (y > 6), y, EARTH[1])
    return c


ROOF = [hx(c) for c in ('#5a2224', '#8a3430', '#a8463a', '#c8604a', '#e88a62')]
WALL = [hx(c) for c in ('#a89878', '#d4c6a4', '#e8dcc0', '#f6eedc')]
WOOD = [hx(c) for c in ('#3e2a1e', '#5a3a2a', '#7a5238')]


def roof(kind, pos):
    """kind: top (nóc), mid, bot (mép mái), one (nóc + mép, nhà thấp). pos: L, M, R."""
    c = Canvas(16, 16)
    top, bot = kind in ('top', 'one'), kind in ('bot', 'one')
    for y in range(16):
        for x in range(16):
            k = x % 4   # ngói ống chạy dọc: rãnh tối, sống sáng; mỗi 5 hàng một mép viên ngói
            col = ROOF[1] if k == 0 else ROOF[3] if k == 1 else ROOF[2]
            if (y + (0 if top else 2)) % 5 == 4:
                col = ROOF[1] if k else ROOF[0]
            c.px(x, y, col)
    if top:   # bờ nóc sẫm, đầu đao cong
        for x in range(16):
            c.px(x, 0, ROOF[0]); c.px(x, 1, ROOF[0]); c.px(x, 2, ROOF[4] if x % 3 else ROOF[3])
        if pos != 'M':
            ex = 0 if pos == 'L' else 15
            d = 1 if pos == 'L' else -1
            for k in range(3):
                c.a[0:3, ex + d * k] = 0
            c.px(ex, 0, ROOF[0]); c.px(ex + d, 1, ROOF[0]); c.px(ex, 1, (0, 0, 0, 0)); c.px(ex, 0, ROOF[0])
    if bot:   # mép mái: diềm sẫm + bóng đổ lên tường
        for x in range(16):
            c.px(x, 13, ROOF[4]); c.px(x, 14, ROOF[0]); c.px(x, 15, (0, 0, 0, 0))
        if pos != 'M':   # đầu mái hất lên
            ex = 0 if pos == 'L' else 15
            c.px(ex, 13, ROOF[0]); c.px(ex, 12, ROOF[4])
    if pos != 'M':   # chái mái nghiêng hai bên
        ex = 0 if pos == 'L' else 15
        for y in range(3 if top else 0, 14 if bot else 16):
            c.px(ex, y, ROOF[0])
    return c


def wall(kind):
    """L, M, R: tường vôi, cột gỗ hai bên; door: cửa gỗ hai cánh; win: cửa sổ song gỗ."""
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            c.px(x, y, WALL[2] if y > 1 else WALL[0])
    for x in range(16):
        c.px(x, 2, WALL[1]); c.px(x, 14, WALL[1]); c.px(x, 15, WOOD[1])   # bóng mái, chân tường
    if kind in ('L', 'R'):
        ex = 0 if kind == 'L' else 13
        for y in range(1, 16):
            c.px(ex, y, WOOD[0]); c.px(ex + 1, y, WOOD[2]); c.px(ex + 2, y, WOOD[1])
    if kind == 'door':
        for y in range(4, 16):
            for x in range(3, 13):
                c.px(x, y, WOOD[1] if x not in (3, 12) else WOOD[0])
            c.px(8, y, WOOD[0])
        for x in range(3, 13):
            c.px(x, 4, WOOD[0]); c.px(x, 5, WOOD[2])
        c.px(6, 10, hx('#f2c94c')); c.px(9, 10, hx('#f2c94c'))   # khoen cửa
        for x in range(2, 14):
            c.px(x, 3, ROOF[1])   # biển ngang
    if kind == 'win':
        for y in range(5, 11):
            for x in range(4, 12):
                c.px(x, y, WOOD[0] if x in (4, 11) or y in (5, 10) or x in (6, 9) or y == 8 else hx('#f6e2a8'))
        for x in range(4, 12):
            c.px(x, 11, WALL[1])
    return c


def house_frames():
    """Thứ tự khung (src/world/draw-ground.js đọc theo đúng thứ tự này)."""
    f = [roof(k, p) for k in ('top', 'mid', 'bot', 'one') for p in 'LMR']
    return f + [wall(k) for k in ('L', 'M', 'R', 'door', 'win')]


def tree(seed):
    """Cây tán tròn sáng (seed 2: hoa đào hồng)."""
    w, h = 30, 38
    c = Canvas(w, h)
    T = [hx('#4a2f22'), hx('#6e4630'), hx('#8a5a3a')]
    for y in range(24, 36):
        for x in range(13, 17):
            c.px(x, y, T[2] if x == 13 else T[0] if x == 16 else T[1])
    c.px(12, 35, T[0]); c.px(17, 35, T[0]); c.px(11, 35, T[1])
    L = [hx('#2f7a44'), hx('#4aa055'), hx('#6cc46a'), hx('#a6e08a')] if seed != 2 else [hx('#b0507a'), hx('#e07aa0'), hx('#f6a8c4'), hx('#ffe0ec')]
    rnd = random.Random(seed)
    blobs = [(15, 13, 10), (8, 18, 7), (22, 18, 7), (11, 9, 6), (19, 8, 6), (15, 21, 7)]
    if seed == 1:
        blobs = [(15, 12, 9), (9, 17, 7), (21, 17, 7), (15, 20, 8), (15, 6, 6)]
    for y in range(h):
        for x in range(w):
            best = None
            for bx, by, r in blobs:
                d = math.hypot(x - bx, (y - by) * 1.1)
                if d <= r:
                    lit = ((bx - x) + (by - y)) / r
                    v = 1 + (1 if lit > 0.55 else 0) - (1 if lit < -0.45 or d > r - 1.2 and lit < 0 else 0)
                    best = v if best is None else max(best, v)
            if best is not None:
                c.px(x, y, L[max(0, min(3, best))])
    for _ in range(8):
        x, y = rnd.randrange(6, 24), rnd.randrange(4, 18)
        if c.get(x, y)[:3] == L[2][:3]:
            c.px(x, y, L[3])
    if seed == 0:   # quả đỏ
        for x, y in ((9, 16), (20, 14), (14, 19), (23, 20)):
            c.px(x, y, hx('#e04a3a')); c.px(x, y - 1, hx('#ff9a7a'))
    return c.outline(hx('#1e3a24') if seed != 2 else hx('#5a1e3a'))


def rock(seed):
    w, h = 16, 12
    c = Canvas(w, h)
    R = [hx('#5e586c'), hx('#7a7488'), hx('#a8a2b8'), hx('#cec8dc')]
    for y in range(h):
        for x in range(w):
            e = ((x - w / 2 + 0.5) / (w / 2 - 1)) ** 2 + ((y - h / 2 - 0.5 - (x > 9) * 1) / (h / 2 - 1)) ** 2
            if e < 1:
                lit = -(x - w / 2) * 0.6 - (y - h / 2) * 1.0
                c.px(x, y, R[3] if lit > 3.5 else R[2] if lit > 0.5 else R[1] if lit > -2.5 else R[0])
    c.px(9, 5, R[0]); c.px(10, 6, R[0]); c.px(10, 7, R[0])
    if seed:   # rêu trên đỉnh
        for x in range(4, 9):
            c.px(x, 2 + (x == 4 or x == 8), G[1])
        c.px(5, 2, G[3])
    return c.outline(hx('#2a2436'))


def flowers(seed):
    c = Canvas(7, 6)
    col = [hx('#ffffff'), hx('#ffe27a'), hx('#ffb0d0')][seed % 3]
    mid = [hx('#f2c94c'), hx('#e08a2a'), hx('#ffffff')][seed % 3]
    for x, y in ((1, 1), (5, 2), (3, 3)):
        c.px(x, y + 1, G[0]); c.px(x, y + 2, G[0])
        c.px(x - 1, y, col); c.px(x + 1, y, col); c.px(x, y - 1, col); c.px(x, y + 1, col); c.px(x, y, mid)
    return c
