"""Hiệu ứng chiêu tự thân vẽ pixel: hồi máu, khiên (nước / đất), tăng sức. Không viền, lõi trắng, tan bằng dither."""
import math, random
from px import Canvas, hx, BAYER4

HEAL = [hx(c) for c in ['#2e8a52', '#5fd07a', '#9af0a8', '#d8ffe0', '#ffffff']]
SHIELD = [hx(c) for c in ['#1a4a8a', '#3a7ad0', '#7ad0ff', '#c8f0ff', '#ffffff']]
SHIELD_EARTH = [hx(c) for c in ['#6e4a2e', '#a07850', '#d0a070', '#f0d8a8', '#fff6e0']]
GOLD = [hx(c) for c in ['#8a4a10', '#e08a20', '#ffd04a', '#fff3a0', '#ffffff']]


def _ground_ring(c, cx, cy, rx, ry, pal, amount):
    for y in range(c.h):
        for x in range(c.w):
            e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if 0.55 < e < 1 and BAYER4[y % 4][x % 4] < amount * 16:
                c.px(x, y, pal[2] if e < 0.8 else pal[1])


# ---------------------------------------------------------------- hồi máu: vòng sáng dưới chân, dấu cộng và đốm bay lên (8 khung)
HW, HH, HBASE = 28, 38, 32


def _plus(c, x, y, big, pal):
    c.px(x, y, pal[4])
    for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        c.px(x + d[0], y + d[1], pal[3])
        if big:
            c.px(x + d[0] * 2, y + d[1] * 2, pal[2])


def heal(frame):
    c = Canvas(HW, HH)
    fade = max(0, 1 - max(0, frame - 4) / 4)
    _ground_ring(c, HW / 2, HBASE, 12, 4, HEAL, fade)
    rnd = random.Random(21)
    for k in range(7):
        x0, d, big = rnd.uniform(4, HW - 4), rnd.uniform(0, 3), k % 3 == 0
        y = HBASE - 2 - (frame + d) * 3.2
        if y < 2 or BAYER4[k % 4][frame % 4] >= fade * 16 + 2:
            continue
        x = x0 + math.sin(frame * 0.9 + k) * 1.2
        if k % 2 == 0:
            _plus(c, x, y, big, HEAL)
        else:
            c.px(x, y, HEAL[3])
            c.px(x, y + 1, HEAL[1])
    return c


def heal_frames():
    return [heal(f) for f in range(8)]


# ---------------------------------------------------------------- khiên: bong bóng nở, chớp, vệt sáng quét qua (6 khung)
SW, SH = 34, 36
SCX, SCY = 17, 18


def shield(frame, pal):
    c = Canvas(SW, SH)
    r = (6, 11, 15, 14, 14, 14)[frame]
    sweep = (None, None, None, -10, 0, 10)[frame]
    for y in range(SH):
        for x in range(SW):
            dx, dy = x + 0.5 - SCX, y + 0.5 - SCY
            d = math.hypot(dx, dy)
            if d > r:
                continue
            lit = (-dx - dy) / max(1, r)   # sáng từ trên trái
            if d > r - 1:
                col = pal[4] if frame == 2 else pal[3] if lit > 0.2 else pal[2]
            elif d > r - 2:
                col = pal[2] if lit > -0.3 else pal[1]
            elif BAYER4[y % 4][x % 4] < (6 if frame == 2 else 2):
                col = pal[2]   # mặt trong lấm tấm, nhìn xuyên được
            else:
                col = None
            if sweep is not None and abs(dx + dy * 0.6 - sweep) < 1.2 and d < r - 1:
                col = pal[4]
            c.px(x, y, col)
    if frame >= 3:   # đốm sáng phản chiếu
        c.px(SCX - 6, SCY - 8, pal[4])
        c.px(SCX - 7, SCY - 7, pal[3])
    return c


def shield_frames(earth=False):
    pal = SHIELD_EARTH if earth else SHIELD
    return [shield(f, pal) for f in range(6)]


# ---------------------------------------------------------------- tăng sức: vầng vàng bốc lên quanh người (8 khung lặp)
BW, BH, BBASE = 30, 38, 32


def buff(frame):
    c = Canvas(BW, BH)
    _ground_ring(c, BW / 2, BBASE, 13, 4, GOLD, 0.8)
    rnd = random.Random(33)
    for k in range(14):
        side = -1 if k % 2 else 1
        x = BW / 2 + side * rnd.uniform(6, 12)
        y = BBASE - ((frame * 4 + rnd.uniform(0, 32)) % 32)
        n = 5 - (BBASE - y) // 8   # tia ngắn dần khi lên cao
        for i in range(max(1, int(n))):
            col = GOLD[4] if i == 0 else GOLD[3] if i == 1 else GOLD[2] if i < 4 else GOLD[1]
            c.px(x, y + i, col)
            if i < 2 and k % 3 == 0:
                c.px(x + side, y + i, GOLD[2])   # tia dày hơn ở gần chân
    for k in range(3):   # đốm lấp lánh
        a = frame / 8 * math.pi * 2 + k * 2.1
        c.px(BW / 2 + math.cos(a) * 9, 16 + math.sin(a * 2) * 6, GOLD[4])
    return c


def buff_frames():
    return [buff(f) for f in range(8)]
