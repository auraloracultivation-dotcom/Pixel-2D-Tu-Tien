"""Quái bằng pixel: mỗi quái trong data/mobs.json có "look" (dáng) thì vẽ một tấm riêng theo màu và cỡ của nó.
Dáng: slime (giọt), imp (tiểu ma có sừng), mage (pháp sư trùm mũ), wolf (sói), wing (có cánh), plant (cây yêu),
beetle (giáp trùng), golem (khối đá), snake (xà), lord (ma tướng, áo choàng); thêm person, shade, blade, snowman, pumpkin ở mobs_extra.py. "crown": true thêm vương miện (vua quái).
Hình gốc nhìn sang phải, 2 khung (đứng / bước, vỗ cánh, nảy). Cỡ theo radius: cao khoảng 2.6 × radius + 4 điểm ảnh."""
import math
from px import Canvas, hx

GLOW = hx('#ffe27a')
GOLD = [hx('#a8701e'), hx('#f2c94c'), hx('#fff0a0')]


def _mix(a, b, k):
    return tuple(int(round(a[i] * (1 - k) + b[i] * k)) for i in range(3)) + (255,)


def tones(color):
    """5 tông đổi sắc (tối ngả tím, sáng ngả vàng) + màu viền, từ một màu gốc."""
    c = hx(color)
    if 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2] < 55:   # quái quá tối: nâng lên để còn thấy khối
        c = _mix(c, (150, 130, 190), 0.22)
    dark = _mix(tuple(v * 0.55 for v in c), (40, 20, 80), 0.25)
    return [dark, _mix(tuple(v * 0.78 for v in c), (60, 30, 110), 0.15), c, _mix(c, (255, 240, 200), 0.35), _mix(c, (255, 255, 235), 0.7)], _mix(tuple(v * 0.25 for v in c), (20, 12, 36), 0.6)


def ell(c, cx, cy, rx, ry, P, flat=False):
    """Khối tròn sáng phía trên trái: 4 tông theo hướng sáng."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1:
                lit = -dx * 0.55 - dy * 0.85
                c.px(x, y, P[1] if flat else P[3] if lit > 0.6 else P[2] if lit > -0.15 else P[1] if lit > -0.65 else P[0])


def rect(c, x0, y0, x1, y1, col):
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            c.px(x, y, col)


def tri(c, ax, ay, bx, by, tx, ty, col):
    """Tam giác đặc (sừng, gai, tai)."""
    for y in range(int(min(ay, by, ty)), int(max(ay, by, ty)) + 1):
        for x in range(int(min(ax, bx, tx)), int(max(ax, bx, tx)) + 1):
            px, py = x + 0.5, y + 0.5
            d = lambda x1, y1, x2, y2: (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)
            s1, s2, s3 = d(ax, ay, bx, by), d(bx, by, tx, ty), d(tx, ty, ax, ay)
            if not ((s1 < 0 or s2 < 0 or s3 < 0) and (s1 > 0 or s2 > 0 or s3 > 0)):
                c.px(x, y, col)


def eyes(c, x, y, gap, col, big=1):
    for ex in (x, x + gap):
        rect(c, ex, y, ex + big - 1, y + big, col)


def slime(P, s, f):
    W, H = 2 * s + 6, 2 * s + 6
    c = Canvas(W, H)
    rx, ry = s + 1 + f, s - f * 0.8
    ell(c, W / 2, H - 1 - ry, rx, ry, P)
    rect(c, W / 2 - rx + 1, H - 2, W / 2 + rx - 2, H - 2, P[0])
    cy = H - 1 - ry
    eyes(c, W / 2 + 0, cy - 0.5, max(2, s // 2 + 1), P[0] if False else hx('#1b1830'))
    c.px(W / 2 - rx * 0.45, cy - ry * 0.55, P[4]); c.px(W / 2 - rx * 0.45 + 1, cy - ry * 0.55, P[4])
    return c, (W // 2, H - 1)


def imp(P, s, f):
    W, H = 2 * s + 8, 2 * s + 10
    c = Canvas(W, H)
    cx, cy = W / 2, H - 3 - s * 0.9
    for i, fx in enumerate((-s * 0.45, s * 0.45)):   # chân bước luân phiên
        up = 1 if (i + f) % 2 else 0
        rect(c, cx + fx - 1, H - 3 - up, cx + fx + 1, H - 2 - up, P[0])
    ell(c, cx, cy, s, s * 0.9, P)
    bone = [hx('#8a7a6a'), hx('#e8dcc0'), hx('#fff8e8')]
    for d in (-1, 1):   # sừng
        bx = cx + d * s * 0.55
        tri(c, bx - 1.5, cy - s * 0.55, bx + 1.5, cy - s * 0.55, bx + d * 2, cy - s * 0.9 - 3, bone[1])
        c.px(bx + d * 2, cy - s * 0.9 - 2, bone[2])
    eyes(c, cx + 0.5, cy - 1, max(2, int(s * 0.6)), GLOW)
    c.px(cx + 1, cy + s * 0.4, hx('#ffffff')); c.px(cx + s * 0.6 + 1, cy + s * 0.4, hx('#ffffff'))   # răng nanh
    return c, (W // 2, H - 2)


def mage(P, s, f):
    W, H = 2 * s + 12, int(2.6 * s) + 8
    c = Canvas(W, H)
    cx, top = W / 2 - 2, 3
    for y in range(top + s, H - 1):   # áo choàng loe xuống
        half = s * 0.5 + (y - top - s) * 0.45
        for x in range(int(cx - half), int(cx + half) + 1):
            lit = -(x - cx) / max(1, half) * 0.6
            c.px(x, y, P[2] if lit > 0.2 else P[1] if lit > -0.4 else P[0])
    for x in range(int(cx - s * 0.5 - (H - top - s) * 0.45), int(cx + s * 0.5 + (H - top - s) * 0.45) + 1, 3):
        c.px(x, H - 1, P[0])   # gấu áo răng cưa
    ell(c, cx, top + s * 0.75, s * 0.85, s * 0.8, P)   # mũ trùm
    tri(c, cx - s * 0.5, top + s * 0.3, cx + s * 0.3, top + s * 0.1, cx - s * 0.2, top - 2, P[2])
    ell(c, cx + s * 0.2, top + s * 0.95, s * 0.55, s * 0.45, [hx('#120c1c')] * 4)   # mặt tối
    eyes(c, cx + s * 0.05, top + s * 0.85, max(2, int(s * 0.5)), GLOW)
    oy = top + s * 1.4 + (1 if f else -1)   # quả cầu phép lơ lửng
    ell(c, cx + s + 3, oy, 2.2, 2.2, [P[3], P[4], hx('#ffffff'), hx('#ffffff')])
    return c, (int(cx), H - 1)


def wolf(P, s, f):
    W, H = int(3.6 * s) + 8, int(2.4 * s) + 6
    c = Canvas(W, H)
    by = H - 3 - s * 0.95
    for i, lx in enumerate((-s * 0.95, -s * 0.45, s * 0.45, s * 0.95)):   # bốn chân
        k = (1 if (i + f) % 2 else -1)
        x = W / 2 - 1 + lx + k * 0.6
        rect(c, x, by + s * 0.3, x + 1, H - 2, P[0] if i in (1, 3) else P[1])
    for i in range(5):   # đuôi cong
        c.px(W / 2 - s * 1.4 - i * 0.8, by - i * 0.7 - (f and i > 2), P[2] if i < 3 else P[3])
        c.px(W / 2 - s * 1.4 - i * 0.8, by - i * 0.7 + 1 - (f and i > 2), P[1])
    ell(c, W / 2 - 1, by, s * 1.35, s * 0.62, P)
    hx_, hy = W / 2 + s * 1.1, by - s * 0.55
    ell(c, hx_, hy, s * 0.62, s * 0.55, P)
    ell(c, hx_ + s * 0.55, hy + s * 0.2, s * 0.42, s * 0.28, P)   # mõm
    tri(c, hx_ - s * 0.5, hy - s * 0.3, hx_ - s * 0.05, hy - s * 0.35, hx_ - s * 0.4, hy - s - 1, P[2])   # tai
    tri(c, hx_ - s * 0.05, hy - s * 0.35, hx_ + s * 0.35, hy - s * 0.3, hx_ + s * 0.05, hy - s - 1, P[3])
    c.px(hx_ + s * 0.2, hy - 1, GLOW); c.px(hx_ + s * 0.2 + 1, hy - 1, GLOW)
    c.px(hx_ + s * 0.95, hy + s * 0.1, hx('#1b1830'))
    for i in range(3):   # bờm sáng trên lưng
        c.px(W / 2 - s * 0.6 + i * s * 0.5, by - s * 0.62, P[4])
    return c, (W // 2, H - 2)


def wing(P, s, f):
    W, H = 4 * s + 8, int(2.6 * s) + 8
    c = Canvas(W, H)
    cx, cy = W / 2, H - 4 - s * 1.1
    for d in (-1, 1):   # cánh: khung 0 giương lên, khung 1 cụp xuống
        wx = cx + d * s * 1.15
        wy = cy - s * 0.45 if not f else cy + s * 0.25
        ell(c, wx, wy, s * 1.05, s * (0.75 if not f else 0.5), [P[0], P[1], P[1], P[2]])
        for k in range(3):   # gân cánh
            c.px(wx + d * k * s * 0.3, wy + (k - 1) * 1.2, P[3])
    ell(c, cx, cy, s * 0.7, s * 0.85, P)
    eyes(c, cx - 0.5, cy - 1, max(2, int(s * 0.5)), GLOW)
    for d in (-1, 1):   # râu
        c.px(cx + d * 1.5, cy - s * 0.85 - 1, P[0]); c.px(cx + d * 2.5, cy - s * 0.85 - 2, P[3])
    return c, (W // 2, H - 1)


LEAF = [hx('#1e4a2c'), hx('#2f7a44'), hx('#4aa055'), hx('#7cc46a'), hx('#b4e89a')]


def plant(P, s, f):
    W, H = 2 * s + 12, int(2.7 * s) + 6
    c = Canvas(W, H)
    cx = W / 2
    lf = LEAF if P[2][1] < P[2][0] or P[2][1] < 140 else [P[0], P[1], P[2], P[3], P[4]]
    for d in (-1, 1):   # hai lá dưới gốc, đung đưa
        ell(c, cx + d * (s * 0.95 + (f if d > 0 else 1 - f)), H - 3, s * 0.75, s * 0.32, lf)
    sway = 1 if f else 0
    ell(c, cx + sway * 0.5, H - 3 - s * 1.05, s * 0.95, s * 1.05, P)
    for k in range(-1, 2):   # gai trên đầu
        bx = cx + sway * 0.5 + k * s * 0.5
        tri(c, bx - 1.2, H - 3 - s * 1.9, bx + 1.2, H - 3 - s * 1.9, bx + sway, H - 3 - s * 2.1 - 3, P[3])
    my = H - 3 - s * 0.85   # miệng rộng có răng
    rect(c, cx - s * 0.45, my, cx + s * 0.6, my + max(1, s * 0.35), hx('#2a0a14'))
    for x in range(int(cx - s * 0.4), int(cx + s * 0.6), 2):
        c.px(x, my, hx('#fff8e8'))
    eyes(c, cx - s * 0.25 + sway, H - 3 - s * 1.45, max(2, int(s * 0.55)), GLOW)
    return c, (W // 2, H - 2)


def beetle(P, s, f):
    W, H = int(2.8 * s) + 8, 2 * s + 7
    c = Canvas(W, H)
    cx, cy = W / 2 - 1, H - 3 - s * 0.75
    for i in range(3):   # 3 cặp chân
        lx = cx - s * 0.7 + i * s * 0.7
        k = 1 if (i + f) % 2 else 0
        c.px(lx - k, H - 2, P[0]); c.px(lx, H - 3, P[0])
    ell(c, cx + s * 1.05, cy + 1, s * 0.45, s * 0.42, [P[0]] * 2 + [P[1]] * 2)   # đầu
    tri(c, cx + s * 1.2, cy - 1, cx + s * 1.5, cy, cx + s * 1.6 + 2, cy - s * 0.7 - 2, P[3])   # sừng
    ell(c, cx, cy, s * 1.1, s * 0.78, P)
    for x in range(int(cx - s), int(cx + s) + 1):   # khe vỏ giữa lưng
        c.px(x, cy - s * 0.1 + (x - cx) * 0.05, P[0])
    c.px(cx - s * 0.5, cy - s * 0.5, P[4]); c.px(cx - s * 0.4, cy - s * 0.5, P[4])
    c.px(cx + s * 1.2, cy + 0.5, GLOW)
    return c, (W // 2, H - 2)


def golem(P, s, f):
    W, H = int(2.8 * s) + 8, int(2.5 * s) + 6
    c = Canvas(W, H)
    cx, base = W / 2, H - 2
    for d in (-1, 1):   # chân
        rect(c, cx + d * s * 0.45 - 1.5, base - s * 0.5, cx + d * s * 0.45 + 1.5, base, P[0])
    bt, bb = base - s * 2.0, base - s * 0.45   # thân khối
    for y in range(int(bt), int(bb) + 1):
        for x in range(int(cx - s), int(cx + s) + 1):
            lit = -(x - cx) / s * 0.5 - (y - (bt + bb) / 2) / (bb - bt) * 1.2
            c.px(x, y, P[3] if lit > 0.55 else P[2] if lit > -0.1 else P[1] if lit > -0.6 else P[0])
    for d in (-1, 1):   # tay to, nhấc lên hạ xuống
        ax = cx + d * (s + 1.5)
        rect(c, ax - 1.5, bt + s * 0.3 + f * d, ax + 1.5, bb + s * 0.1 + f * d, P[1])
        c.px(ax - 0.5, bt + s * 0.3 + f * d, P[3])
    rect(c, cx - s * 0.45, bt - s * 0.45, cx + s * 0.45, bt, P[2])   # đầu
    c.px(cx - s * 0.2, bt - s * 0.25, GLOW); c.px(cx + s * 0.25, bt - s * 0.25, GLOW)
    core = [hx('#ffb03a'), hx('#ffe27a'), hx('#ffffff')]   # lõi phát sáng, vết nứt
    ell(c, cx, (bt + bb) / 2, max(1.5, s * 0.25), max(1.5, s * 0.25), [core[0], core[1], core[1], core[2]])
    c.line(cx + s * 0.3, bt + 2, cx + s * 0.6, bt + s * 0.6, P[0])
    return c, (W // 2, H - 2)


def snake(P, s, f):
    W, H = int(3 * s) + 6, int(2.6 * s) + 6
    c = Canvas(W, H)
    cx = W / 2 - s * 0.4
    for i, (k, r) in enumerate(((0, 1.0), (1, 0.8))):   # hai vòng cuộn
        ell(c, cx + i * s * 0.2, H - 2 - s * 0.45 - i * s * 0.55, s * 1.1 * r, s * 0.45 * r, P)
    nx, ny = cx + s * 0.8, H - 2 - s * 1.2
    for i in range(int(s * 1.2)):   # cổ vươn lên
        ell(c, nx + i * 0.15, ny - i * 0.6, s * 0.32, s * 0.32, P)
    hx_, hy = nx + s * 0.35, ny - s * 0.8 - 1
    ell(c, hx_, hy, s * 0.55, s * 0.4, P)
    c.px(hx_ + s * 0.15, hy - 1, GLOW)
    if f:   # lưỡi đỏ thè ra
        c.px(hx_ + s * 0.6, hy + 1, hx('#e04a5a')); c.px(hx_ + s * 0.6 + 1, hy + 1, hx('#e04a5a')); c.px(hx_ + s * 0.6 + 2, hy, hx('#e04a5a'))
    for i in range(3):   # vảy sáng
        c.px(cx - s * 0.5 + i * s * 0.5, H - 2 - s * 0.75, P[4])
    return c, (W // 2, H - 2)


def lord(P, s, f):
    W, H = int(2.6 * s) + 10, int(2.7 * s) + 8
    c = Canvas(W, H)
    cx, base = W / 2, H - 2
    cape = [P[0], P[0], P[1], P[1]]
    for y in range(int(base - s * 1.7), base + 1):   # áo choàng sau lưng, gấu bay theo khung
        half = s * 0.6 + (y - (base - s * 1.7)) * 0.42
        for x in range(int(cx - half), int(cx + half) + 1):
            if y < base or (x + f) % 3:
                c.px(x, y, cape[0] if abs(x - cx) > half - 1.5 else cape[2])
    ell(c, cx, base - s * 0.95, s * 0.75, s * 0.85, P)   # thân giáp
    for d in (-1, 1):   # giáp vai nhọn
        tri(c, cx + d * s * 0.4, base - s * 1.55, cx + d * s * 1.1, base - s * 1.3, cx + d * s * 1.15, base - s * 1.85, P[3])
    hy = base - s * 1.85
    ell(c, cx, hy, s * 0.48, s * 0.48, P)   # đầu
    for d in (-1, 1):   # sừng cong
        tri(c, cx + d * s * 0.2, hy - s * 0.3, cx + d * s * 0.5, hy - s * 0.2, cx + d * s * 0.75, hy - s * 0.95, hx('#e8dcc0'))
    eyes(c, cx - s * 0.2, hy - 0.5, max(2, int(s * 0.4)), hx('#ff4a5a'))
    ell(c, cx, base - s * 0.95, max(1.5, s * 0.18), max(1.5, s * 0.18), [hx('#ff4a5a'), hx('#ff8a8a'), hx('#ff8a8a'), hx('#ffffff')])   # ngọc ngực
    return c, (W // 2, H - 1)


def crown(c, top):
    """Vương miện vàng 3 gai đặt trên chỗ cao nhất của hình (đầu, tai) — vua quái."""
    xs = [x for x in range(c.w) if c.a[top + 1, x, 3]]
    cx = (xs[0] + xs[-1]) // 2
    rect(c, cx - 3, top - 2, cx + 3, top - 1, GOLD[1])
    for dx in (-3, 0, 3):
        rect(c, cx + dx, top - 4 - (dx == 0), cx + dx, top - 3, GOLD[1])
        c.px(cx + dx, top - 4 - (dx == 0), GOLD[2])
    c.px(cx, top - 2, hx('#e04a5a'))


LOOKS = dict(slime=slime, imp=imp, mage=mage, wolf=wolf, wing=wing, plant=plant, beetle=beetle, golem=golem, snake=snake, lord=lord)


def mob_frames(d):
    """→ (khung, neo) cho một quái trong data/mobs.json."""
    P, ink = tones(d['color'])
    s = d['radius']
    out, anchor = [], None
    for f in range(2):
        if d['look'] in LOOKS:
            c, anchor = LOOKS[d['look']](P, s, f)
        else:   # dáng thêm ở mobs_extra.py, cần cả mục quái (tóc, đai)
            from mobs_extra import EXTRA
            c, anchor = EXTRA[d['look']](P, s, f, d)
        if d.get('crown'):
            big = Canvas(c.w, c.h + 6); big.paste(c, 0, 6)
            ys = [y for y in range(big.h) if big.a[y, :, 3].any()]
            crown(big, ys[0] + 1)
            c, anchor = big, (anchor[0], anchor[1] + 6)
        out.append(c.outline(ink))
    return out, anchor
