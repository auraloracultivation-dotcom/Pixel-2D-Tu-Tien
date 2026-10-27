"""Biểu tượng trang bị 16×16 cho túi đồ: mỗi món gốc trong data/items.json bases một hình gear.<id>.
Dáng theo ô đồ (vũ khí theo loại: kiếm, thương, quạt, đàn, cung, liềm; giáp, giày, nhẫn, ngọc bội, pháp bảo theo chiêu),
màu theo bộ đồ (data/gear.json sets color), không thuộc bộ thì màu mặc định của ô. Viền mực, sáng trên trái."""
import math
from px import Canvas, hx
from mobs import tones, ell, rect, tri

INK = hx('#1b1830')
WOOD = [hx('#5a3a1a'), hx('#8a5a2a'), hx('#b07a3a'), hx('#d8a060'), hx('#f0c890')]
GOLD = [hx('#8a5a10'), hx('#c8963a'), hx('#f2c94c'), hx('#fff0a0'), hx('#ffffff')]
DEFAULT = {'vu-khi': '#c8d4ee', 'giap': '#8a7a6a', 'giay': '#7a5a3a', 'nhan': '#c8c8d8', 'ngoc-boi': '#6fd0a0', 'phap-bao': '#f2c94c'}


def _blade(c, P, x0, y0, n, w=1):
    for i in range(n):
        for k in range(w):
            c.px(x0 + i + k, y0 - i, P[4] if k == 0 else P[2])
        c.px(x0 + i + 1, y0 - i + 1, P[1])


def kiem(P):
    c = Canvas(16, 16)
    _blade(c, P, 5, 10, 10)
    for x, y in ((2, 10), (3, 11), (4, 12), (5, 13)):
        c.px(x, y, GOLD[2])
    c.px(3, 13, WOOD[2]); c.px(2, 14, WOOD[1]); c.px(1, 15, hx('#a3352a'))
    return c


def thuong(P):
    c = Canvas(16, 16)
    for i in range(12):   # cán gỗ dài
        c.px(1 + i, 14 - i, WOOD[3] if i % 3 else WOOD[2])
    tri(c, 11, 2, 13, 4, 15, 0, P[3])   # mũi thương
    c.px(14, 1, P[4])
    c.px(11, 5, hx('#d84a4a')); c.px(10, 6, hx('#d84a4a'))   # tua đỏ
    return c


def quat(P):
    c = Canvas(16, 16)
    for y in range(16):   # quạt xoè nửa vòng
        for x in range(16):
            dx, dy = x + 0.5 - 8, y + 0.5 - 13
            r, a = math.hypot(dx, dy), math.atan2(dy, dx)
            if 2 < r <= 11 and -math.pi * 0.95 < a < -math.pi * 0.05:
                rib = int((a + math.pi) / (math.pi / 7)) % 2
                c.px(x, y, P[3] if rib else P[2])
    rect(c, 7, 12, 8, 14, WOOD[2])
    return c


def dan(P):
    c = Canvas(16, 16)
    for i in range(14):   # thân đàn chéo
        for k in range(4):
            c.px(1 + i + k // 2, 11 - i // 2 + k, WOOD[3] if k < 2 else WOOD[1])
    for s in range(3):   # dây đàn
        for i in range(13):
            c.px(1 + i, 12 - i // 2 + s - 1 - 1, P[4] if s == 1 else P[3])
    return c


def cung(P):
    c = Canvas(16, 16)
    for i in range(14):   # cánh cung cong
        a = -math.pi / 2 + i / 13 * math.pi
        c.px(5 + math.cos(a) * 7, 8 + math.sin(a) * 7, WOOD[3]); c.px(4 + math.cos(a) * 7, 8 + math.sin(a) * 7, WOOD[1])
    for y in range(1, 16):
        c.px(5, y, P[4])   # dây cung
    for x in range(2, 15):
        c.px(x, 8, P[2])   # mũi tên
    tri(c, 13, 6, 13, 10, 15, 8, P[3])
    return c


def giap(P):
    c = Canvas(16, 16)
    for y in range(3, 15):   # áo giáp: vai rộng, thân thuôn
        w = 7 if y < 6 else 5 if y < 13 else 5.5
        for x in range(int(8 - w), int(8 + w)):
            c.px(x, y, P[3] if x < 6 else P[2] if x < 11 else P[1])
    for y in range(3, 7):
        c.px(8, y, INK); c.px(7, y, INK) if y == 3 else None   # cổ áo
    for x in range(4, 12):
        c.px(x, 9, GOLD[2])   # đai
    return c


def giay(P):
    c = Canvas(16, 16)
    rect(c, 4, 2, 9, 11, P[2]); rect(c, 4, 2, 5, 11, P[3])   # cổ giày
    rect(c, 4, 11, 14, 13, P[1]); rect(c, 4, 11, 13, 11, P[2])   # mũi giày
    rect(c, 4, 14, 14, 14, WOOD[0])   # đế
    rect(c, 4, 4, 9, 4, GOLD[2])
    return c


def nhan(P):
    c = Canvas(16, 16)
    for y in range(16):   # vòng nhẫn
        for x in range(16):
            r = math.hypot(x + 0.5 - 8, (y + 0.5 - 10) * 1.2)
            if 3.4 < r <= 5.6:
                c.px(x, y, P[3] if x < 8 and y < 10 else P[2] if x < 10 else P[1])
    ell(c, 8, 4, 2.6, 2.4, [hx('#2a6a9a'), hx('#4aa0e0'), hx('#9ad8ff'), hx('#ffffff')])   # đá quý
    return c


def ngoc_boi(P):
    c = Canvas(16, 16)
    rect(c, 8, 0, 8, 2, hx('#d84a4a'))   # dây đỏ
    for y in range(16):
        for x in range(16):
            r = math.hypot(x + 0.5 - 8, y + 0.5 - 7)
            if 1.5 < r <= 5.5:
                lit = (8 - x) + (7 - y)
                c.px(x, y, P[4] if lit > 5 else P[3] if lit > 0 else P[2] if lit > -4 else P[1])
    for x, y in ((7, 13), (8, 13), (9, 13), (7, 14), (9, 14), (8, 15)):
        c.px(x, y, hx('#d84a4a'))   # tua
    return c


def phap_bao(P, art):
    c = Canvas(16, 16)
    if art == 'phap-kim-luan':   # kim luân: vòng có nan
        for i in range(24):
            a = i / 24 * math.pi * 2
            c.px(8 + math.cos(a) * 6, 8 + math.sin(a) * 6, GOLD[3] if i < 12 else GOLD[1])
        for i in range(6):
            a = i / 6 * math.pi * 2
            for r in range(1, 6):
                c.px(8 + math.cos(a) * r, 8 + math.sin(a) * r, GOLD[2])
    elif art == 'phap-tran-yeu':   # tháp ba tầng
        for k, (w, y) in enumerate(((6, 13), (4.5, 9), (3, 5))):
            rect(c, 8 - w, y - 1, 8 + w - 1, y, P[1]); rect(c, 8 - w + 1, y - 3, 8 + w - 2, y - 2, P[3])
        tri(c, 6, 2, 10, 2, 8, 0, GOLD[2])
    else:   # hỏa hồn linh: chuông lửa
        ell(c, 8, 9, 5, 5, [hx('#9c4429'), hx('#ea571b'), hx('#efbb0a'), hx('#fff3b0')])
        rect(c, 7, 2, 8, 4, GOLD[2]); c.px(8, 14, GOLD[3])
    return c


VIOLET = [hx('#3a2458'), hx('#6a4a9a'), hx('#a88ad8'), hx('#dccbf6'), hx('#ffffff')]
SHAFT = [hx('#3a2450'), hx('#6a4a8a')]


def liem(P):
    c = Canvas(16, 16)
    for i in range(12):   # cán tím sẫm chéo, chuôi nhọn vàng
        c.px(2 + i, 14 - i, SHAFT[1] if i % 3 else SHAFT[0])
    c.px(1, 15, GOLD[2]); c.px(4, 12, GOLD[2]); c.px(8, 8, GOLD[2])
    for y in range(9):   # lưỡi liềm trăng khuyết cong sang trái rồi rủ xuống
        for x in range(16):
            d1 = math.hypot(x + 0.5 - 9, (y + 0.5 - 7.5) * 1.15)
            d2 = math.hypot(x + 0.5 - 9.5, (y + 0.5 - 9.2) * 1.15)
            if 4.5 < d1 <= 7.5 and d2 > 6 and x < 12:
                edge = 7.5 - d1
                c.px(x, y, VIOLET[4] if edge < 0.8 else VIOLET[3] if edge < 1.8 else VIOLET[2])
    for x, y in ((11, 2), (13, 2), (12, 1), (12, 3)):
        c.px(x, y, GOLD[2])   # chắn hình sao vàng
    c.px(12, 2, VIOLET[1]); c.px(13, 3, GOLD[1])   # ngọc tím giữa
    return c


SHAPES = dict(kiem=kiem, thuong=thuong, quat=quat, dan=dan, cung=cung, liem=liem)


def gear_icon(base, sets):
    color = sets.get(base.get('set'), {}).get('color') or DEFAULT[base['slot']]
    P, _ = tones(color)
    slot = base['slot']
    if slot == 'vu-khi':
        c = SHAPES.get(base.get('weapon', 'kiem'), kiem)(P)
    elif slot == 'phap-bao':
        c = phap_bao(P, base.get('art'))
    else:
        c = {'giap': giap, 'giay': giay, 'nhan': nhan, 'ngoc-boi': ngoc_boi}[slot](P)
    return c.outline(INK)
