"""Hiệu ứng chiêu vẽ pixel: dây leo (Mộc), gai đá (Thổ), gió xoáy. Glow thêm lúc chạy game, không vẽ vào hình."""
import math, random
from px import Canvas, hx, BAYER4

WOOD = [hx(c) for c in ['#14301f', '#1d4a33', '#2e6d43', '#45935a', '#6fbf6a', '#b6e88a', '#eaffd0']]
EARTH = [hx(c) for c in ['#2a1b12', '#4e3422', '#7a5232', '#a07850', '#c8a070', '#ecd2a0']]
WIND = [hx(c) for c in ['#3a8a7a', '#5ab8a0', '#9af0c8', '#d8fff0', '#ffffff']]

# ---------------------------------------------------------------- dây leo: trồi lên, đung đưa, héo rụng (8 khung)
VW, VH, VBASE = 40, 36, 30
VINES = [(-12, 16, 0.0, 1), (-4, 24, 1.4, -1), (5, 26, 2.6, 1), (13, 15, 0.7, -1)]   # lệch x, cao, pha, chiều cuộn


def _vine_pts(dx, h, ph, d, g, sway):
    pts = []
    for i in range(int(h * g) + 1):
        s = i / h
        x = VW / 2 + dx + d * math.sin(s * math.pi * 1.6 + ph + sway) * 3.5 * s
        pts.append((x, VBASE - i))
    if g >= 1:   # ngọn cuộn tròn
        tx, ty = pts[-1]
        for k in range(1, 6):
            a = k / 5 * math.pi * 1.3
            pts.append((tx + d * (2 - 2 * math.cos(a)), ty - 2 * math.sin(a)))
    return pts


def _soil(c, amount):
    for y in range(VH):
        for x in range(VW):
            e = ((x - VW / 2) / 17) ** 2 + ((y - VBASE - 1) / 4) ** 2
            if e < 1 and BAYER4[y % 4][x % 4] < amount * (8 if e > 0.6 else 14):
                c.px(x, y, WOOD[1] if e < 0.5 else WOOD[0])


def _vines(g, sway=0.0, wither=0):
    c = Canvas(VW, VH)
    _soil(c, 1 - wither * 0.4)
    rnd = random.Random(5)
    for (dx, h, ph, d) in VINES:
        pts = _vine_pts(dx, h, ph, d, g, sway)
        keep = len(pts) if not wither else int(len(pts) * (1 - wither * 0.35))
        for i, (x, y) in enumerate(pts[:keep]):
            thick = i < h * 0.5
            dark, mid, lit = (WOOD[1], WOOD[2], WOOD[3]) if wither else (WOOD[2], WOOD[3], WOOD[4])
            c.px(x, y, mid)
            if thick:
                c.px(x - 1, y, lit)
                c.px(x + 1, y, dark)
        for s in (0.35, 0.6, 0.82):   # lá mọc so le
            i = int(s * h)
            if i >= keep or i >= len(pts) or g < s:
                continue
            x, y = pts[i]
            side = 1 if (int(s * 10) + d) % 2 else -1
            for j, (lx, ly) in enumerate(((1, 0), (2, -1), (3, -1), (2, 0), (3, -2))):
                col = WOOD[5] if j == 2 else WOOD[4] if not wither else WOOD[3]
                c.px(x + side * lx, y + ly, col)
        if g >= 1 and not wither:
            c.px(*pts[-1], WOOD[6])   # ngọn sáng
    if wither:   # lá rơi lả tả
        for k in range(10):
            x = VW / 2 + rnd.uniform(-15, 15) + math.sin(k + wither * 2) * 2
            y = VBASE - rnd.uniform(6, 24) + wither * 5
            c.px(x, y, WOOD[5] if k % 3 == 0 else WOOD[4])
            c.px(x + 1, y, WOOD[3])
    return c


def vine_frames():
    return [_vines(g) for g in (0.3, 0.6, 0.9, 1)] + [_vines(1, 0.35), _vines(1, -0.35)] + [_vines(1, 0, w) for w in (1, 2)]


# ---------------------------------------------------------------- gai đá: nứt đất, trồi, giữ, vỡ ra bụi (8 khung)
RW, RH, RBASE = 48, 40, 32
ROCKS = [(14, 13, 4, 1), (24, 22, 5, 0), (33, 15, 4, 1), (8, 7, 3, 2), (40, 8, 3, 2)]   # x, cao, nửa rộng, trễ


def _cracks(c, n):
    rnd = random.Random(7)
    for k in range(6):
        a = k / 6 * math.pi * 2 + rnd.uniform(-0.3, 0.3)
        x, y = RW / 2, RBASE
        for _ in range(n):
            x += math.cos(a) * 1.6 + rnd.uniform(-0.5, 0.5)
            y += math.sin(a) * 0.55
            c.px(x, y, EARTH[0])
            c.px(x, y + 1, EARTH[3])


def _rock(c, x0, h, hw, g):
    top = RBASE - int(round(h * g))
    for y in range(RBASE, top - 1, -1):
        w = hw * (1 - (RBASE - y) / max(1, h)) ** 0.8 + 0.4
        for x in range(int(math.floor(x0 - w)), int(math.ceil(x0 + w)) + 1):
            if abs(x - x0) > w:
                continue
            col = EARTH[4] if x < x0 - w * 0.2 else EARTH[3] if x < x0 + w * 0.4 else EARTH[2]
            if (y * 3 + x) % 7 == 0:
                col = EARTH[2]   # vân đá
            c.px(x, y, col)
        c.px(x0 - w, y, EARTH[5])
    c.px(x0, top, EARTH[5])


def _rocks(grow, cracks=10):
    c = Canvas(RW, RH)
    _cracks(c, cracks)
    for (x, h, hw, d) in ROCKS:
        g = max(0, min(1, (grow - d) / 2.0))
        if g > 0:
            _rock(c, x, h, hw, g)
    return c.outline(EARTH[0])


def _crumble(t):
    c = Canvas(RW, RH)
    _cracks(c, max(0, 10 - t * 3))
    rnd = random.Random(13)
    for (x, h, hw, d) in ROCKS:   # mảnh đá văng rơi
        for k in range(4):
            sx, sy = x + rnd.uniform(-hw, hw), RBASE - rnd.uniform(2, h)
            vx = rnd.uniform(-1.4, 1.4)
            px_, py_ = sx + vx * t * 3, min(RBASE, sy + (t * 3) ** 2 * 0.5)
            c.px(px_, py_, EARTH[4] if k % 2 else EARTH[3])
            c.px(px_ + 1, py_, EARTH[1])
    for y in range(RH):   # bụi tan bằng dither
        for x in range(RW):
            e = ((x - RW / 2) / (12 + t * 4)) ** 2 + ((y - RBASE + 4 + t) / (5 + t)) ** 2
            if e < 1 and BAYER4[y % 4][x % 4] < 9 - t * 3:
                c.px(x, y, EARTH[5] if e < 0.4 else EARTH[4])
    return c


def rock_frames():
    return [_rocks(0, 5), _rocks(1.2), _rocks(2.4), _rocks(4.2), _rocks(5)] + [_crumble(t) for t in (1, 2, 3)]


# ---------------------------------------------------------------- gió xoáy: ba vệt cung quay quanh (8 khung lặp)
WW, WH = 36, 28


def wind(frame):
    c = Canvas(WW, WH)
    cx, cy = WW / 2, 15
    for k in range(3):
        a0 = frame / 8 * math.pi * 2 + k * math.pi * 2 / 3
        rx, ry = 15 - k * 3, 7 - k
        for i in range(30):   # đầu sáng, đuôi nhạt dần
            a = a0 - i * 0.055
            x, y = cx + math.cos(a) * rx, cy + math.sin(a) * ry - k * 3
            col = WIND[4] if i < 4 else WIND[3] if i < 10 else WIND[2] if i < 18 else WIND[1]
            if i > 22 and BAYER4[int(y) % 4][int(x) % 4] > 7:
                continue   # đuôi tan bằng dither
            c.px(x, y, col)
            if i < 12:
                c.px(x, y + 1, WIND[2])
    rnd = random.Random(frame)
    for _ in range(4):   # hạt bụi cuốn theo
        a = rnd.uniform(0, math.pi * 2)
        c.px(cx + math.cos(a) * rnd.uniform(4, 16), cy + math.sin(a) * rnd.uniform(2, 8), WIND[3])
    return c


def wind_frames():
    return [wind(f) for f in range(8)]
