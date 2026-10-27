"""Hiệu ứng nhỏ vẽ pixel (đánh thường, tia lửa, khói). Glow mềm thêm lúc chạy game, không vẽ vào hình."""
import math, random
from px import Canvas, hx, BAYER4

W, H, CX, CY, R = 56, 48, 18, 24, 19
TONES = [hx('#3f8f9a'), hx('#6fd6e0'), hx('#c8f6ff'), hx('#ffffff')]  # mép → lõi trắng (kiếm khí); đổi màu theo hệ trong code


def slash(a0, a1, wmax, tones, dissolve=0.0):
    """Lưỡi liềm: dày nhất ~2/3 về phía đầu chém, sáng nhất ở mép cắt, đuôi nguội 1 tông, tia bong ở mặt trong."""
    c = Canvas(W, H)
    rnd = random.Random(5)
    start = {k: rnd.uniform(0.0, 0.45) for k in range(14)}
    for y in range(H):
        for x in range(W):
            dx, dy = x - CX, y - CY
            r = math.hypot(dx, dy)
            ang = math.degrees(math.atan2(dy, dx))
            if not (a0 <= ang <= a1):
                continue
            u = (ang - a0) / max(1e-6, a1 - a0)
            w = wmax * math.sin(math.pi * u ** 1.6)
            if dissolve and BAYER4[y % 4][x % 4] < dissolve * 16:
                continue
            if R - w <= r <= R + 0.5 and w >= 0.6:
                d = (R - r) / max(w, 1)
                i = 3 if d < 0.22 else 2 if d < 0.5 else 1 if d < 0.8 else 0
                if u < 0.3:
                    i = max(0, i - 1)
                if u < 0.12:
                    i = 0
                c.px(x, y, tones[i])
            elif max(R - w - 7, R - 13) <= r < R - w:
                k = int(R - r)
                if k % 2 == 0 and start.get(k, 1) < u < 0.75:
                    c.px(x, y, tones[0] if u < 0.5 else tones[1])
    return c


def spark0():
    c = Canvas(W, H)
    x0, y0 = CX + R * math.cos(math.radians(-95)), CY + R * math.sin(math.radians(-95))
    for dx, dy, t in [(0, 0, 3), (1, 0, 2), (-1, 0, 2), (0, 1, 2), (0, -1, 2), (2, 0, 1), (-2, 0, 1), (0, 2, 1), (0, -2, 1)]:
        c.px(x0 + dx, y0 + dy, TONES[t])
    return c


KEYS = [(-100, -55, 4, 0.0), (-100, 25, 7, 0.0), (-85, 90, 9, 0.0), (-20, 100, 7, 0.3), (30, 105, 5, 0.55), (70, 110, 3, 0.8)]


MOON = [hx('#6a4a9a'), hx('#a88ad8'), hx('#dccbf6'), hx('#ffffff')]  # vệt liềm tím (vũ khí Liềm)


def slash_frames(tones=TONES):
    out = [spark0()]
    for a0, a1, wmax, dis in KEYS:
        t = tones if dis < 0.5 else [tones[0], tones[0], tones[1], tones[2]]
        out.append(slash(a0, a1, wmax, t, dis))
    return out


def spark_frames():
    out = []
    for k in range(4):
        c = Canvas(11, 11)
        r = 1 + k * 1.3
        for a in range(0, 360, 45):
            x, y = 5 + math.cos(math.radians(a)) * r, 5 + math.sin(math.radians(a)) * r
            c.px(x, y, TONES[3] if k < 2 else TONES[1])
        if k == 0:
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                c.px(5 + dx, 5 + dy, TONES[3])
        out.append(c)
    return out


def puff_frames():
    out = []
    col = [hx('#ffffff'), hx('#e6e1f0'), hx('#b4aec6'), hx('#7d7794')]
    for k in range(5):
        c = Canvas(16, 16)
        rr = 2.5 + k * 1.4
        for y in range(16):
            for x in range(16):
                d = math.hypot(x - 7.5, y - 7.5)
                if d <= rr and (k < 2 or BAYER4[y % 4][x % 4] >= (k - 1) * 4):
                    c.px(x, y, col[min(3, k)] if d > rr - 1.5 else col[max(0, k - 1)])
        out.append(c)
    return out
