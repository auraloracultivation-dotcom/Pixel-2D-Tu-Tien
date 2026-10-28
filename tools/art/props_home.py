"""Vật trong động phủ và cổng truyền tống bằng pixel (thay hình khối trong src/world/draw-map.js, draw-cave.js):
cổng truyền tống (P), bồ đoàn đả tọa (M), lò đan (K), lò rèn (A), đất linh điền (G: đã khai, còn hoang)."""
import math, random
from px import Canvas, hx, BAYER4

INK = hx('#1b1830')


def portal(f):
    """Cổng truyền tống 20×14 nằm trên nền: vòng đá khắc, lòng xoáy tím xoay 4 khung, đốm sáng bốc lên."""
    c = Canvas(20, 14)
    P = [hx('#3a1a6a'), hx('#6a3ab0'), hx('#9a6aff'), hx('#d0b0ff'), hx('#ffffff')]
    S = [hx('#4a4458'), hx('#6e6880'), hx('#948ea8')]
    for y in range(14):
        for x in range(20):
            e = ((x - 9.5) / 9.5) ** 2 + ((y - 7) / 6.5) ** 2
            if e < 1:
                if e > 0.62:   # vành đá: trên sáng, dưới tối, khắc rãnh
                    col = S[2] if y < 5 else S[0] if y > 9 else S[1]
                    if (int(math.atan2(y - 7, x - 9.5) * 4) + 8) % 3 == 0 and 0.7 < e < 0.9:
                        col = P[2]
                else:   # lòng xoáy: tay xoắn theo góc + bán kính, xoay theo khung
                    a = math.atan2((y - 7) * 1.45, x - 9.5)
                    r = math.sqrt(e)
                    v = (a / (2 * math.pi) * 3 + r * 2.2 - f / 4) % 1
                    col = P[3] if v < 0.18 else P[2] if v < 0.45 else P[1]
                    if r < 0.22:
                        col = P[4] if f % 2 == 0 else P[3]
                c.px(x, y, col)
    for k, (x, y) in enumerate(((6, 4), (13, 3), (9, 2), (11, 5))):
        if (k + f) % 4 < 2:
            c.px(x, y - (f % 2), P[4])
    return c.outline(INK)


def cushion():
    """Bồ đoàn 16×11: đệm cói tròn tết vòng, giữa thêu hoa sen vàng."""
    c = Canvas(16, 11)
    C = [hx('#6a2a20'), hx('#9a3e2a'), hx('#c0603a'), hx('#e08a52')]
    G = [hx('#c08a20'), hx('#f2c94c'), hx('#fff2a8')]
    for y in range(11):
        for x in range(16):
            e = ((x - 7.5) / 7.5) ** 2 + ((y - 5) / 4.6) ** 2
            if e < 1:
                ring = int(e * 4)
                col = C[3] if y < 4 and ring >= 2 else C[2] if ring % 2 else C[1]
                if y > 7 and e > 0.6:
                    col = C[0]
                c.px(x, y, col)
    for x, y in ((7, 3), (8, 3), (6, 4), (9, 4), (7, 5), (8, 5), (5, 5), (10, 5), (7, 6), (8, 6)):
        c.px(x, y, G[1])
    c.px(7, 4, G[2]); c.px(8, 4, G[0])
    return c.outline(INK)


def furnace(f):
    """Lò đan 20×24: đỉnh đồng ba chân, nắp có núm, bụng khắc vân, cửa lò lửa nhảy 3 khung."""
    c = Canvas(20, 24)
    B = [hx('#5a3a14'), hx('#8a5e22'), hx('#b8862e'), hx('#e0b24e'), hx('#fff0a0')]
    for x0 in (4, 9, 14):   # ba chân
        for y in range(18, 23):
            c.px(x0, y, B[1]); c.px(x0 + 1, y, B[0])
    for y in range(8, 19):   # bụng tròn
        half = int(8 * math.sqrt(max(0, 1 - ((y - 13) / 6.5) ** 2))) + 1
        for x in range(10 - half, 10 + half):
            lx = (x - (10 - half)) / (2 * half)
            c.px(x, y, B[3] if lx < 0.25 and y < 14 else B[2] if lx < 0.6 else B[1] if lx < 0.85 else B[0])
    for x in range(3, 17):   # vành miệng
        c.px(x, 7, B[3]); c.px(x, 8, B[0])
    for x in range(5, 15):   # nắp
        c.px(x, 6, B[2]); c.px(x, 5, B[3] if x < 9 else B[2])
    for x in range(7, 13):
        c.px(x, 4, B[2])
    c.px(9, 2, B[3]); c.px(10, 2, B[2]); c.px(9, 3, B[2]); c.px(10, 3, B[1])   # núm
    for x in (5, 8, 11, 14):   # vân khắc
        c.px(x, 11, B[0])
    F = [hx('#c03a1a'), hx('#ff8a3a'), hx('#ffd27a')]
    for y in range(14, 18):   # cửa lò
        for x in range(8, 12):
            c.px(x, y, INK if y == 14 or x in (8, 11) else F[(x + y + f) % 3])
    c.px(9 + f % 2, 15, F[2])
    return c.outline(INK)


def anvil(f):
    """Lò rèn 22×18: bệ lửa đá có than hồng, đe sắt trên gốc gỗ, búa dựa; 2 khung than sáng tối."""
    c = Canvas(22, 18)
    S = [hx('#2e2a30'), hx('#4a4450'), hx('#6a6274')]
    for y in range(8, 17):   # bệ lửa bên trái
        for x in range(1, 10):
            c.px(x, y, S[2] if y == 8 else S[0] if x in (1, 9) or y == 16 else S[1])
    E = [hx('#8a2a14'), hx('#e0502a'), hx('#ffb050')]
    for x in range(2, 9):
        c.px(x, 9, E[(x + f) % 2 + 1] if x % 3 else E[0]); c.px(x, 10, E[0] if (x + f) % 2 else E[1])
    W = [hx('#3e2a1a'), hx('#6a4a2c'), hx('#8a6a42')]
    for y in range(11, 17):   # gốc gỗ
        for x in range(12, 20):
            c.px(x, y, W[2] if x == 12 else W[0] if x == 19 else W[1])
    I = [hx('#3a3e4a'), hx('#6a7080'), hx('#9aa2b4'), hx('#d0d8e8')]
    for x in range(11, 21):   # mặt đe, mỏ đe nhô trái
        c.px(x, 7, I[3] if x < 18 else I[2]); c.px(x, 8, I[1])
    for x in range(9, 11):
        c.px(x, 7, I[2]); c.px(x, 8, I[1]) if x == 10 else None
    for y in range(9, 11):
        for x in range(14, 18):
            c.px(x, y, I[1] if x < 17 else I[0])
    for y in range(1, 7):   # búa dựa
        c.px(19, y, W[2])
    for x in range(17, 22):
        c.px(x, 1, I[2]); c.px(x, 2, I[0])
    if f:
        c.px(14, 5, hx('#ffe27a')); c.px(16, 4, hx('#ffb050'))   # tia lửa
    return c.outline(INK)


def plot(tilled, seed):
    """Đất linh điền 16×16: đã khai có luống cày, bờ đất sáng; còn hoang có cỏ dại, đá vụn."""
    rnd = random.Random(seed + (10 if tilled else 0))
    D = [hx('#2e1c12'), hx('#4a3020'), hx('#5e4028'), hx('#7a5636')]
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            if tilled:
                ly = y % 5
                col = D[3] if ly == 0 else D[2] if ly == 1 else D[1] if ly < 4 else D[0]
            else:
                col = D[2] if (x * 3 + y * 7 + seed) % 9 else D[3]
            c.px(x, y, col)
    for x in range(16):
        c.px(x, 0, D[0]); c.px(x, 15, D[0])
    for y in range(16):
        c.px(0, y, D[0]); c.px(15, y, D[0])
    if not tilled:
        Wd = [hx('#4a6a2a'), hx('#6a8a3a'), hx('#8aa84a')]
        for _ in range(4):
            x, y = rnd.randrange(2, 13), rnd.randrange(3, 13)
            c.px(x, y, Wd[1]); c.px(x - 1, y - 1, Wd[0]); c.px(x + 1, y - 1, Wd[2])
        x, y = rnd.randrange(3, 12), rnd.randrange(4, 12)
        c.px(x, y, hx('#8a8498')); c.px(x + 1, y, hx('#a8a2b8')); c.px(x, y + 1, D[0])
    return c
