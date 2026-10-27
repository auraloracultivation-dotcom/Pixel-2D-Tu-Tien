"""Hiệu ứng chiêu vẽ pixel: lửa, gai băng, sét (theo bài pixel-lessons). Glow thêm lúc chạy game, không vẽ vào hình."""
import math, random
import numpy as np
from px import Canvas, hx, BAYER4

FIRE = [hx(c) for c in ['#641429', '#9c4429', '#ea571b', '#e88129', '#efbb0a', '#fff3b0']]
ICE = [hx(c) for c in ['#1a2a6a', '#4c568e', '#778edd', '#73d2db', '#bed9f6', '#dff8f9']]
BOLT = [hx(c) for c in ['#3b2a8a', '#6a6ff0', '#73d2db', '#dff8f9', '#ffffff']]
SOOT = [hx('#10070a'), hx('#1d1523')]

# ---------------------------------------------------------------- lửa: ngọn lửa lặp 8 khung, nhiễu cuộn lên
FW, FH, FBASE = 24, 34, 28
_LAT = np.random.RandomState(3).rand(8, 6)   # lưới nhiễu tuần hoàn 8×6, ô 4 px


def _noise(x, y):
    gx, gy = x / 4.0, y / 4.0
    x0, y0 = int(math.floor(gx)), int(math.floor(gy))
    fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    v = lambda i, j: _LAT[j % 8, i % 6]
    a = v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx
    b = v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx
    return a * (1 - fy) + b * fy


def _half_width(y):
    if y > FBASE:
        t = (y - FBASE) / 4.0
        return 7.5 * math.sqrt(max(0, 1 - t * t))
    h = (FBASE - y) / 26.0
    return 0 if h > 1 else 7.5 * (1 - h) ** 0.9


def flame(frame):
    c = Canvas(FW, FH)
    for y in range(FH):
        hw = _half_width(y)
        for x in range(FW):
            dx = x + 0.5 - FW / 2
            shape = 0 if hw <= 0 or abs(dx) > hw else 1 - (dx / hw) ** 2
            h = max(0, (FBASE - y) / 26.0)
            n = _noise(x, y + frame * 4)   # 8 khung × 4 px = đúng chu kỳ lưới
            v = shape * (0.45 + 0.75 * n) - h * 0.35
            if shape == 0 and y < FBASE and abs(dx) < 2.5 and n > 0.78 and h < 1.0:
                v = 0.3   # lưỡi lửa bập bùng phía trên
            col = (FIRE[5] if v > 0.9 else FIRE[4] if v > 0.68 else FIRE[3] if v > 0.45
                   else FIRE[2] if v > 0.25 else FIRE[1] if v > 0.1 else FIRE[0] if v > 0.02 else None)
            c.px(x, y, col)
    return c


def fire_frames():
    return [flame(f) for f in range(8)]


# ---------------------------------------------------------------- băng: gai trồi lên, giữ, vỡ (10 khung)
IW, IH = 48, 40
SPIKES = [(14, 30, 12, 3, 1), (33, 30, 13, 3, 1), (20, 33, 18, 4, 0), (28, 34, 22, 4, 0), (9, 34, 8, 2, 2), (39, 34, 9, 2, 2)]
#          x, chân y, cao, nửa rộng, trễ (khung)


def _frost(c, amount=1.0):
    for y in range(IH):
        for x in range(IW):
            e = ((x - 24) / 19) ** 2 + ((y - 33) / 5.5) ** 2
            if e < 1 and BAYER4[y % 4][x % 4] < amount * (10 if e > 0.6 else 16):
                c.px(x, y, ICE[3] if e < 0.35 else ICE[2] if e < 0.7 else ICE[1])


def _spike(c, x0, by, h, hw, g):
    top = by - int(round(h * g))
    for y in range(by, top - 1, -1):
        w = hw * (1 - (by - y) / max(1, h)) + 0.3
        for x in range(int(math.floor(x0 - w)), int(math.ceil(x0 + w)) + 1):
            if abs(x - x0) > w:
                continue
            col = ICE[4] if x <= x0 else ICE[2]   # mặt trái sáng, mặt phải tối
            if abs(x - (x0 - w)) < 1:
                col = ICE[5]
            if abs(x - (x0 + w)) < 1:
                col = ICE[1]
            if y == by:
                col = ICE[1]
            if y == top:
                col = ICE[5]
            if x == x0 and (by - y) % 5 == 2:
                col = ICE[3]   # vết nứt
            c.px(x, y, col)


def _ice(grow=None):
    c = Canvas(IW, IH)
    _frost(c)
    for (x, by, h, hw, d) in SPIKES:
        g = 1.0 if grow is None else max(0, min(1, (grow - d) / 2.0))
        if g > 0:
            _spike(c, x, by, h, hw, g)
    return c


def _shatter(t):
    c = Canvas(IW, IH)
    _frost(c, max(0, 1 - t * 0.3))
    rnd = random.Random(11)
    for (x, by, h, hw, d) in SPIKES:
        for k in range(5):
            sx, sy = x + rnd.uniform(-hw, hw), by - rnd.uniform(0, h)
            vx, vy = rnd.uniform(-1.6, 1.6), rnd.uniform(-1.5, -0.3)
            px_, py_ = sx + vx * t * 3, sy + vy * t * 3 + 0.6 * (t * 3) ** 2 / 3
            c.px(px_, py_, ICE[5] if k % 3 == 0 else ICE[4] if t < 2 else ICE[2])
            if t < 2 and k % 2 == 0:
                c.px(px_ + 1, py_, ICE[2])
    return c


def ice_frames():
    return [_ice(g) for g in (0.6, 1.5, 2.5, 3.5, 5)] + [_ice(), _ice()] + [_shatter(t) for t in (1, 2, 3)]


# ---------------------------------------------------------------- sét: mồi, đánh xuống, đổi hình, mảnh, cháy xém (7 khung)
LW, LH = 40, 56


def _path(seed, x0=20, y0=0, x1=21, y1=46, rough=7):
    rnd = random.Random(seed)
    pts = [(x0, y0), (x1, y1)]
    for _ in range(4):
        new = [pts[0]]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            new += [((ax + bx) / 2 + rnd.uniform(-rough, rough), (ay + by) / 2), (bx, by)]
        pts = new
        rough *= 0.55
    return [(round(x), round(y)) for x, y in pts]


def _bolt(seed, thin=False):
    c, core = Canvas(LW, LH), Canvas(LW, LH)
    pts = _path(seed)
    for a, b in zip(pts, pts[1:]):
        core.line(*a, *b, BOLT[4])
    rnd = random.Random(seed + 100)
    branches = []
    for i in rnd.sample(range(3, len(pts) - 4), 3):
        sx, sy = pts[i]
        d = rnd.choice([-1, 1])
        branches.append(_path(seed + i, sx, sy, sx + d * rnd.randint(6, 10), sy + rnd.randint(5, 9), rough=3))
    ys, xs = np.nonzero(core.a[..., 3])
    if not thin:
        for x, y in zip(xs, ys):
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-1, 0, 1):
                    if abs(dx) + abs(dy) <= 2 and c.get(x + dx, y + dy)[3] == 0:
                        c.px(x + dx, y + dy, BOLT[0] if abs(dx) == 2 else BOLT[1])
        for x, y in zip(xs, ys):
            c.px(x - 1, y, BOLT[2])
            c.px(x + 1, y, BOLT[2])
    for bp in branches:
        for a, b in zip(bp, bp[1:]):
            c.line(*a, *b, BOLT[1] if thin else BOLT[2])
    for x, y in zip(xs, ys):
        c.px(x, y, BOLT[3] if thin else BOLT[4])
    if not thin:   # chớp sáng chỗ chạm đất
        ex, ey = pts[-1]
        for y in range(LH):
            for x in range(LW):
                e = ((x - ex) / 9) ** 2 + ((y - ey - 1) / 3.5) ** 2
                if e < 1 and c.get(x, y)[3] == 0:
                    c.px(x, y, BOLT[4] if e < 0.2 else BOLT[3] if e < 0.5 else BOLT[2] if e < 0.8 else BOLT[1])
    return c


def _scorch(t, end):
    c = Canvas(LW, LH)
    ex, ey = end
    rnd = random.Random(9)
    for k in range(10):
        a, s = rnd.uniform(math.pi, 2 * math.pi), rnd.uniform(1.5, 3)
        c.px(ex + math.cos(a) * s * t * 2, ey + math.sin(a) * s * t * 1.3 + t * t * 0.6, BOLT[3] if t < 2 else BOLT[1])
    for y in range(LH):
        for x in range(LW):
            e = ((x - ex) / 6) ** 2 + ((y - ey - 1) / 2.4) ** 2
            if e < 1 and BAYER4[y % 4][x % 4] < 16 - t * 4:
                c.px(x, y, SOOT[0] if e < 0.5 else SOOT[1])
    return c


def bolt_frames():
    end = _path(1)[-1]
    lead = Canvas(LW, LH)
    for a, b in zip(_path(1), _path(1)[1:]):
        lead.line(*a, *b, BOLT[1])
    lead.a[30:] = 0
    return [lead, _bolt(1), _bolt(2), _bolt(1, thin=True)] + [_scorch(t, end) for t in (1, 2, 3)], (end[0], end[1] + 1)
