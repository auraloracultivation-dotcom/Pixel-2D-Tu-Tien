"""Đạn chiêu vẽ pixel, nhìn sang phải (game xoay theo hướng bay). Neo ở đầu đạn. Không viền trừ đá."""
import math, random
from px import Canvas, hx, BAYER4
from fx_skill import FIRE, ICE
from fx_nature import WOOD, EARTH

STEEL = [hx(c) for c in ['#4a5a8a', '#8fa8d8', '#c8e0ff', '#eef6ff', '#ffffff']]
SHAFT = [hx(c) for c in ['#5a3a20', '#8a5a30', '#c89a5a', '#f0d090']]
SOUND = [hx(c) for c in ['#5a3a8a', '#9a6ad8', '#d8b0ff', '#f4e8ff', '#ffffff']]


# ---------------------------------------------------------------- cầu lửa: đầu tròn, đuôi lửa bập bùng (4 khung lặp)
def fireball(frame):
    c = Canvas(18, 11)
    hx_, hy = 13, 5
    rnd = random.Random(frame * 7 + 1)
    for x in range(18):   # đuôi: hẹp dần về sau, rung theo khung
        t = (hx_ - x) / 12
        if t <= 0 or t > 1:
            continue
        w = 3.2 * (1 - t) + 0.4
        wob = math.sin(x * 0.9 + frame * 1.6) * 1.1 * t
        for y in range(11):
            d = abs(y - hy - wob)
            if d > w or rnd.random() < t * 0.35:
                continue
            k = d / w + t * 0.9
            c.px(x, y, FIRE[4] if k < 0.5 else FIRE[3] if k < 0.9 else FIRE[2] if k < 1.3 else FIRE[1])
    for y in range(11):
        for x in range(18):
            d = math.hypot(x - hx_, y - hy)
            if d <= 3.6:
                c.px(x, y, FIRE[5] if d < 1.6 else FIRE[4] if d < 2.7 else FIRE[3])
    c.px(hx_ - 1, hy - 1, (255, 255, 255, 255))
    return c


# ---------------------------------------------------------------- mũi băng: thoi dài mặt trên sáng, mặt dưới tối (2 khung)
def ice_shard(frame):
    c = Canvas(15, 7)
    for x in range(15):
        w = 2.2 * (1 - abs(x - 9) / (6.5 if x < 9 else 5.5))
        for y in range(7):
            if abs(y - 3) > w:
                continue
            c.px(x, y, ICE[4] if y < 3 else ICE[2] if y > 3 else ICE[5])
    c.px(14, 3, (255, 255, 255, 255))
    if frame:   # lấp lánh chạy dọc
        c.px(7, 2, (255, 255, 255, 255))
        c.px(2, 3, ICE[3])
    else:
        c.px(11, 2, (255, 255, 255, 255))
    return c


# ---------------------------------------------------------------- kiếm khí: trăng lưỡi liềm lồi về trước, lõi trắng (3 khung)
def crescent(frame):
    c = Canvas(13, 21)
    cx, cy = 3, 10
    thick = (2.6, 3.2, 2.8)[frame]
    for y in range(21):
        for x in range(13):
            d1 = math.hypot((x - cx) / 1.0, (y - cy) / 1.05)
            d2 = math.hypot(x - cx + thick, y - cy)
            if 6 < d1 <= 8.5 and d2 > 7.2:
                edge = 8.5 - d1
                c.px(x, y, STEEL[4] if edge > 1.4 else STEEL[3] if edge > 0.7 else STEEL[2])
    for y in range(21):   # vệt tan phía sau bằng dither
        for x in range(4):
            if c.filled(x + 3, y) and BAYER4[y % 4][(x + frame) % 4] < 5:
                c.px(x, y, STEEL[1])
    return c


# ---------------------------------------------------------------- kim gỗ: cây kim xanh, lá non ở đuôi (2 khung)
def needle(frame):
    c = Canvas(13, 7)
    for x in range(1, 13):
        c.px(x, 3, WOOD[5] if x > 9 else WOOD[4])
        if 3 < x < 10:
            c.px(x, 4, WOOD[2])
    c.px(12, 3, WOOD[6])
    s = 1 if frame else -1   # lá phất lên xuống
    for lx, ly in ((1, 0), (2, s), (3, s), (2, 2 * s)):
        c.px(lx, 3 + ly, WOOD[4])
    return c


# ---------------------------------------------------------------- đá ném: tảng đá tròn có viền, game cho xoay (1 khung)
def stone():
    c = Canvas(9, 9)
    for y in range(9):
        for x in range(9):
            d = math.hypot(x - 4, y - 4)
            if d <= 3.6:
                lit = (4 - x) + (4 - y)
                c.px(x, y, EARTH[5] if lit > 3 else EARTH[4] if lit > 0 else EARTH[3] if lit > -3 else EARTH[2])
    c.px(5, 5, EARTH[2])
    c.px(6, 4, EARTH[2])
    return c.outline(EARTH[0])


# ---------------------------------------------------------------- mũi tên: thân gỗ, mũi thép, đuôi lông vũ, vệt gió sau đuôi (2 khung)
def arrow(frame):
    c = Canvas(17, 7)
    for x in range(3, 13):
        c.px(x, 3, SHAFT[2] if x % 3 else SHAFT[1])
    for x, y, col in ((13, 2, STEEL[2]), (13, 3, STEEL[3]), (13, 4, STEEL[1]), (14, 2, STEEL[3]), (14, 3, STEEL[4]),
                      (14, 4, STEEL[2]), (15, 3, STEEL[4]), (16, 3, STEEL[3])):
        c.px(x, y, col)
    for x in range(3, 7):   # lông đuôi chẻ đôi
        c.px(x, 2 - (x < 5), SHAFT[3]); c.px(x, 4 + (x < 5), SHAFT[2])
    for x in range(0, 3) if frame else range(1, 3):   # vệt gió
        c.px(x, 3, SHAFT[3])
    return c


# ---------------------------------------------------------------- sóng âm: ba vòng cung lồng nhau loang dần ra trước, nốt nhạc nhỏ (3 khung)
def sound_wave(frame):
    c = Canvas(12, 17)
    for k, r in enumerate((3 + frame, 6 + frame, 9 + frame)):
        if r > 11:
            continue
        col = SOUND[4] if k == 2 else SOUND[3] if k == 1 else SOUND[2]
        for y in range(17):
            dy = y - 8
            if abs(dy) > r * 0.85:
                continue
            x = round(math.sqrt(max(0, r * r - dy * dy)))
            if x < 12:
                c.px(x, y, col if abs(dy) < r * 0.6 else SOUND[1])
    nx, ny = 2 + frame, 3 if frame % 2 else 13   # nốt nhạc bay theo
    c.px(nx, ny, SOUND[4]); c.px(nx + 1, ny - 1, SOUND[3]); c.px(nx + 1, ny - 2, SOUND[3])
    return c


def proj_sprites():
    """id: (khung, neo)"""
    return {
        'proj.fire': ([fireball(f) for f in range(4)], (13, 5), 'cầu lửa bay, đuôi lửa bập bùng 4 khung'),
        'proj.ice': ([ice_shard(f) for f in range(2)], (9, 3), 'mũi băng bay, 2 khung lấp lánh'),
        'proj.slash': ([crescent(f) for f in range(3)], (8, 10), 'kiếm khí lưỡi liềm, lõi trắng, game tô quầng theo màu chiêu'),
        'proj.vine': ([needle(f) for f in range(2)], (8, 3), 'kim gỗ có lá non ở đuôi, 2 khung'),
        'proj.rock': ([stone()], (4, 4), 'tảng đá ném, game cho xoay tròn'),
        'proj.arrow': ([arrow(f) for f in range(2)], (15, 3), 'mũi tên cung, lông đuôi, vệt gió 2 khung'),
        'proj.sound': ([sound_wave(f) for f in range(3)], (8, 8), 'sóng âm đàn: ba vòng cung loang ra, nốt nhạc nhỏ, 3 khung'),
    }
