"""Vũ khí bay (ngự kiếm, src/game/flyweapon.js): mỗi loại vũ khí một hình nằm ngang mũi chĩa sang phải, rồi xoay sẵn
DIRS hướng kiểu RotSprite (phóng 8 lần, xoay, thu lại lấy màu chiếm đa số mỗi ô) để xoay góc nào điểm ảnh cũng gọn,
không ra lốm đốm như xoay thẳng bằng ctx.rotate. Khung i = góc i / DIRS vòng (0 = chĩa phải, theo chiều kim đồng hồ trên màn)."""
import math
import numpy as np
from PIL import Image
from px import Canvas, hx

DIRS = 32
INK = hx('#1b1830')
STEEL = [hx(c) for c in ('#4a5468', '#8a96aa', '#c8d4e6', '#f4f8ff')]
GOLD = [hx(c) for c in ('#8a5a10', '#c8963a', '#f2c94c')]
WOOD = [hx(c) for c in ('#4a2e18', '#7a5230', '#a87a4a', '#d0a46a')]
RED = [hx('#801a28'), hx('#c0283a')]
PURP = [hx(c) for c in ('#2e1a4a', '#5a3a8a', '#8a6ac8', '#c8b0f0', '#f0e6ff')]


def kiem():
    c = Canvas(26, 9)
    for x in range(8, 24):   # lưỡi 2 điểm: sống sáng trên, lưỡi tối dưới, mũi vát
        c.px(x, 3, STEEL[3] if x < 22 else STEEL[2]); c.px(x, 4, STEEL[1] if x < 23 else None)
    c.px(24, 3, STEEL[2]); c.px(23, 4, STEEL[1])
    for x in range(9, 21, 4):
        c.px(x, 3, STEEL[2])
    for y in range(1, 7):   # chắn tay vàng
        c.px(7, y, GOLD[2] if y < 4 else GOLD[1])
    for x in range(2, 7):   # chuôi quấn
        c.px(x, 3, WOOD[2] if x % 2 else WOOD[1]); c.px(x, 4, WOOD[1] if x % 2 else WOOD[0])
    c.px(1, 3, GOLD[2]); c.px(1, 4, GOLD[1])
    c.px(0, 5, RED[1]); c.px(0, 6, RED[0])   # tua
    return c.outline(INK)


def gay():
    c = Canvas(24, 6)
    for x in range(1, 23):
        c.px(x, 2, WOOD[3] if x % 5 else WOOD[2]); c.px(x, 3, WOOD[1])
    for x in (1, 2, 21, 22):
        c.px(x, 2, GOLD[2]); c.px(x, 3, GOLD[1])
    return c.outline(INK)


def thuong():
    c = Canvas(28, 9)
    for x in range(1, 19):
        c.px(x, 4, WOOD[2] if x % 3 else WOOD[3]); c.px(x, 5, WOOD[1])
    for k in range(7):   # mũi thương tam giác
        for y in range(4 - (6 - k) // 2, 6 + (6 - k) // 2):
            c.px(20 + k, y, STEEL[3] if y < 5 else STEEL[1])
    c.px(19, 3, GOLD[2]); c.px(19, 6, GOLD[2]); c.px(19, 4, GOLD[1]); c.px(19, 5, GOLD[1])
    for k, y in enumerate((6, 7, 7, 8)):   # tua đỏ
        c.px(18 - k, y, RED[1] if k < 2 else RED[0])
    return c.outline(INK)


def liem():
    c = Canvas(26, 14)
    for x in range(1, 20):   # cán tím
        c.px(x, 3, PURP[2] if x % 4 else PURP[3]); c.px(x, 4, PURP[1])
    for i in range(10):   # lưỡi liềm cong xuống phía trước
        a = math.pi * 0.05 + i / 9 * math.pi * 0.55
        x, y = 19 + math.cos(a) * 6 - 1, 4 + math.sin(a) * 9
        c.px(round(x), round(y), PURP[4]); c.px(round(x) - 1, round(y), PURP[3]); c.px(round(x) - 2, round(y) - 1, PURP[2])
    c.px(20, 3, GOLD[2]); c.px(21, 4, GOLD[1]); c.px(20, 5, GOLD[2])   # khoen vàng
    c.px(0, 3, GOLD[2]); c.px(0, 4, GOLD[1])
    return c.outline(INK)


def quat():
    c = Canvas(18, 18)
    cx, cy = 3, 9
    for y in range(18):   # quạt xoè, nan gỗ, mặt giấy hai màu
        for x in range(18):
            d, a = math.hypot(x - cx, y - cy), math.atan2(y - cy, x - cx)
            if 4 < d < 14 and abs(a) < 0.95:
                c.px(x, y, WOOD[1] if int(a * 7) % 2 == 0 and d > 12.5 else hx('#e8f0d8') if int(a * 5 + 9) % 2 else hx('#9ad890'))
    for d in range(2, 6):
        c.px(cx + d, cy, WOOD[2])
    c.px(cx, cy, GOLD[2])
    return c.outline(INK)


def dan():
    c = Canvas(22, 9)
    for x in range(1, 21):   # thân đàn gỗ, dây sáng
        for y in range(2, 7):
            c.px(x, y, WOOD[2] if y in (2, 6) else WOOD[1])
        for y in (3, 4, 5):
            c.px(x, y, hx('#f2e0b0') if (x + y) % 2 else WOOD[1])
    for y in range(2, 7):
        c.px(4, y, GOLD[1]); c.px(17, y, GOLD[1])
    return c.outline(INK)


def cung():
    c = Canvas(22, 18)
    for y in range(1, 17):   # thân cung cong về phía trước
        x = 14 + round(4 * math.sin(math.pi * (y - 1) / 15))
        c.px(x, y, WOOD[2]); c.px(x - 1, y, WOOD[1])
    for y in range(2, 16):
        c.px(13, y, hx('#f4f0e0'))   # dây cung
    for x in range(1, 21):   # mũi tên đặt trên dây
        c.px(x, 9, STEEL[2] if x > 17 else WOOD[3])
    c.px(20, 8, STEEL[3]); c.px(20, 10, STEEL[1]); c.px(1, 8, RED[1]); c.px(1, 10, RED[1])
    return c.outline(INK)


SHAPES = {'kiem': kiem, 'gay-go': gay, 'thuong': thuong, 'liem': liem, 'quat': quat, 'dan': dan, 'cung': cung}


def rotations(base):
    """Xoay DIRS hướng kiểu RotSprite: phóng 8 lần (cận kề), xoay quanh tâm, thu 8 lần lấy màu đa số mỗi ô 8×8."""
    K = 8
    im = base.img()
    side = int(math.ceil(math.hypot(base.w, base.h))) + 2
    pad = Image.new('RGBA', (side, side)); pad.alpha_composite(im, ((side - base.w) // 2, (side - base.h) // 2))
    big = pad.resize((side * K, side * K), Image.NEAREST)
    out = []
    for i in range(DIRS):
        r = np.asarray(big.rotate(-360 * i / DIRS, resample=Image.NEAREST), dtype=np.uint8).reshape(side, K, side, K, 4).transpose(0, 2, 1, 3, 4).reshape(side, side, K * K, 4)
        c = Canvas(side, side)
        for y in range(side):
            for x in range(side):
                blk = r[y, x]
                op = blk[blk[:, 3] > 0]
                if len(op) * 2 < K * K:
                    continue
                vals, cnt = np.unique(op.view(np.uint32).ravel(), return_counts=True)
                c.a[y, x] = np.frombuffer(np.uint32(vals[cnt.argmax()]).tobytes(), dtype=np.uint8)
        out.append(c)
    return out, side
