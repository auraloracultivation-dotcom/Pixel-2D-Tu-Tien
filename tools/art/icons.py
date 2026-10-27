"""Biểu tượng chiêu 16×16 cho nút chiêu: mỗi loại hiệu ứng (fx) một hình, chiêu không có fx dùng theo kiểu chiêu.
Viền mực 1 px, sáng trên trái, không khử răng cưa."""
import math
from px import Canvas, hx
from fx_skill import FIRE, ICE, BOLT
from fx_nature import WOOD, EARTH, WIND
from fx_aura import HEAL, SHIELD, SHIELD_EARTH, GOLD

INK = hx('#1b1830')
STEEL = [hx(c) for c in ['#4a5a8a', '#8fa8d8', '#c8e0ff', '#eef6ff', '#ffffff']]
ORB = [hx(c) for c in ['#5a3a8a', '#9a6ad8', '#d8b0ff', '#f4e8ff', '#ffffff']]


def _disc(c, cx, cy, r, P):
    for y in range(16):
        for x in range(16):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r * r:
                lit = (-dx - dy) / r
                c.px(x, y, P[4] if lit > 0.9 else P[3] if lit > 0.3 else P[2] if lit > -0.4 else P[1])


def fire():
    c = Canvas(16, 16)
    for y in range(16):   # ngọn lửa giọt nước lộn ngược
        for x in range(16):
            dx, t = x + 0.5 - 8, (y - 2) / 12
            if 0 <= t <= 1:
                w = 5.5 * math.sin(t * math.pi * 0.85) ** 0.8
                if abs(dx + (1 - t) * 1.5) <= w:
                    k = abs(dx) / max(w, 0.1) + (1 - t) * 0.5
                    c.px(x, y, FIRE[5] if k < 0.35 else FIRE[4] if k < 0.65 else FIRE[3] if k < 0.95 else FIRE[2])
    return c


def ice():
    c = Canvas(16, 16)
    for i in range(3):   # bông tuyết 6 cánh
        a = i * math.pi / 3
        for r in range(-6, 7):
            c.px(8 + math.cos(a) * r, 8 + math.sin(a) * r, ICE[4] if abs(r) < 4 else ICE[3])
    for a in range(6):
        ang = a * math.pi / 3
        c.px(8 + math.cos(ang) * 6, 8 + math.sin(ang) * 6, ICE[5])
    c.px(8, 8, ICE[5])
    return c


def bolt():
    c = Canvas(16, 16)
    pts = [(10, 1), (5, 8), (8, 8), (5, 15), (12, 6), (9, 6), (11, 1)]
    for y in range(16):   # tia sét đặc
        xs = []
        for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
            if (ay <= y < by) or (by <= y < ay):
                xs.append(ax + (y + 0.5 - ay) * (bx - ax) / (by - ay))
        xs.sort()
        for x0, x1 in zip(xs[::2], xs[1::2]):
            for x in range(int(round(x0)), int(round(x1)) + 1):
                c.px(x, y, BOLT[4] if x < (x0 + x1) / 2 else BOLT[3])
    return c


def slash():
    c = Canvas(16, 16)
    for i in range(12):   # lưỡi kiếm chéo + vệt chém cong
        c.px(2 + i, 13 - i, STEEL[4]); c.px(3 + i, 13 - i, STEEL[2])
    for x, y in ((2, 11), (3, 12), (4, 13)):
        c.px(x, y, GOLD[2])
    c.px(1, 14, hx('#a3352a'))
    for k in range(9):
        a = math.pi * (0.95 + k * 0.07)
        c.px(9 + math.cos(a) * 7, 9 + math.sin(a) * 7, STEEL[1])
    return c


def vine():
    c = Canvas(16, 16)
    for y in range(3, 15):   # thân cong, lá hai bên
        x = 8 + math.sin(y * 0.6) * 2
        c.px(x, y, WOOD[3]); c.px(x + 1, y, WOOD[2])
    for (x, y, d) in ((6, 5, -1), (10, 8, 1), (5, 11, -1)):
        for j, (lx, ly) in enumerate(((0, 0), (d, 0), (2 * d, -1), (d, -1), (3 * d, -1), (2 * d, -2))):
            c.px(x + lx, y + ly, WOOD[5] if j in (2, 5) else WOOD[4])
    c.px(9, 2, WOOD[6])
    return c


def rock():
    c = Canvas(16, 16)
    for (x0, h, hw) in ((5, 9, 3), (10, 12, 3.5), (13, 6, 2)):
        for y in range(15, 15 - h, -1):
            w = hw * (1 - (15 - y) / h) + 0.4
            for x in range(int(x0 - w), int(x0 + w) + 1):
                c.px(x, y, EARTH[4] if x < x0 else EARTH[3] if x < x0 + w * 0.5 else EARTH[2])
        c.px(x0, 15 - h + 1, EARTH[5])
    return c


def wind():
    c = Canvas(16, 16)
    for k, (cy, r, x0) in enumerate(((5, 4, 3), (9, 5, 1), (13, 3, 4))):   # ba vệt gió cuộn
        for x in range(x0, 13):
            c.px(x, cy, WIND[3] if x < 10 else WIND[2])
        for i in range(6):
            a = -math.pi / 2 + i * 0.5
            c.px(13 + math.cos(a) * 2, cy - 2 + math.sin(a) * 2, WIND[4] if i < 3 else WIND[2])
    return c


def heal():
    c = Canvas(16, 16)
    _disc(c, 8, 8, 6.5, HEAL)
    for d in range(-4, 5):   # dấu cộng trắng
        c.px(8 + d, 8, HEAL[4]); c.px(8, 8 + d, HEAL[4])
        c.px(8 + d, 9, HEAL[3]); c.px(9, 8 + d, HEAL[3])
    return c


def _shield(P):
    c = Canvas(16, 16)
    for y in range(1, 15):   # khiên đầu tròn, đáy nhọn
        w = 6 if y < 8 else 6 * (1 - (y - 8) / 7) + 0.5
        for x in range(int(8 - w), int(8 + w) + 1):
            edge = abs(x + 0.5 - 8) > w - 1.2 or y == 1
            c.px(x, y, P[4] if edge and x < 8 else P[1] if edge else P[3] if x < 7 else P[2])
    for y in range(3, 12):
        c.px(8, y, P[4])
    return c


def shield():
    return _shield(SHIELD)


def shield_earth():
    return _shield(SHIELD_EARTH)


def buff():
    c = Canvas(16, 16)
    for y in range(2, 15):   # mũi tên vàng hướng lên
        w = 6 * (y - 2) / 5 if y < 7 else 2.2
        for x in range(int(8 - w), int(8 + w) + 1):
            c.px(x, y, GOLD[4] if x < 8 and y < 9 else GOLD[3] if x < 8 else GOLD[2])
    return c


def orb():
    c = Canvas(16, 16)
    for (x, y, r) in ((6, 6, 3.2), (11, 8, 2.6), (7, 12, 2.4)):   # chuỗi linh châu
        _disc(c, x, y, r, ORB)
    return c


def arrow():
    c = Canvas(16, 16)
    for ox in (-3, 0, 3):   # ba mũi tên song song bay chéo lên phải
        for i in range(8):
            c.px(3 + i + ox, 12 - i + ox, STEEL[3] if i > 5 else (200, 154, 90, 255))
        hx_, hy = 11 + ox, 4 + ox
        c.px(hx_, hy, STEEL[4]); c.px(hx_ - 1, hy, STEEL[2]); c.px(hx_, hy + 1, STEEL[2])
        c.px(3 + ox, 13 + ox, (240, 208, 144, 255))
    return c


def sound():
    c = Canvas(16, 16)
    for r, col in ((4, ORB[4]), (8, ORB[3]), (12, ORB[2])):   # sóng âm loang từ góc dưới trái
        for y in range(16):
            for x in range(16):
                if abs(math.hypot(x - 2, y - 13) - r) < 0.75:
                    c.px(x, y, col)
    return c


def icon_sprites():
    out = {}
    for name, fn in dict(fire=fire, ice=ice, bolt=bolt, slash=slash, vine=vine, rock=rock, wind=wind, heal=heal,
                         shield=shield, buff=buff, orb=orb, arrow=arrow, sound=sound).items():
        out['icon.' + name] = fn().outline(INK)
    out['icon.shield-earth'] = shield_earth().outline(INK)
    return out
