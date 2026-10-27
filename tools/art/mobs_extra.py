"""Thêm dáng quái (tiếp tools/art/mobs.py): person (đấu sĩ, ma vệ: hình người, tóc, đai màu), shade (tâm ma, hư ảnh:
bóng ma trùm đầu, đuôi khói, mắt tím), blade (kiếm hồn: kiếm lơ lửng quấn khói), snowman (người tuyết), pumpkin (bí ngô).
Hàm nhận thêm d (mục trong data/mobs.json) để lấy tóc, đai. Nhìn phải, 2 khung."""
from px import Canvas, hx
from mobs import ell, rect, tri, eyes

INK = hx('#1b1830')
SKIN = [hx('#c88a6a'), hx('#e8b896'), hx('#fbe3d2'), hx('#fff4ea')]


def person(P, s, f, d):
    W, H = 2 * s + 10, int(2.6 * s) + 8
    c = Canvas(W, H)
    cx = W / 2
    head_r = max(3, s * 0.62)
    hy = 2 + head_r
    by0, by1 = hy + head_r - 1, H - 4   # thân áo
    for i, fx in enumerate((-s * 0.3, s * 0.3)):   # chân bước luân phiên
        up = 1 if (i + f) % 2 else 0
        rect(c, cx + fx - 1, by1 - up, cx + fx, H - 2 - up, P[0])
        rect(c, cx + fx - 1, H - 2 - up, cx + fx + 1, H - 2 - up, INK)
    for y in range(int(by0), int(by1) + 1):   # áo loe nhẹ, sáng bên trái
        half = s * 0.55 + (y - by0) * 0.18
        for x in range(int(cx - half), int(cx + half) + 1):
            lit = -(x - cx) / max(1, half)
            c.px(x, y, P[3] if lit > 0.55 else P[2] if lit > -0.2 else P[1])
    sash = hx(d.get('sash', '#f2c94c'))
    sy = by0 + (by1 - by0) * 0.45
    rect(c, cx - s * 0.6, sy, cx + s * 0.6, sy + 1, sash)
    c.px(cx - s * 0.6 - 1, sy + 2, sash)   # đuôi đai bay phía sau
    arm = 1 if f else 0   # tay vung theo bước
    rect(c, cx + s * 0.55, by0 + 1 + arm, cx + s * 0.55 + 1, by0 + 3 + arm, SKIN[1])
    ell(c, cx, hy, head_r, head_r, SKIN)
    hair = hx(d.get('hair', '#2a1a1a'))
    for y in range(int(hy - head_r) - 1, int(hy) + 1):   # tóc phủ nửa đầu, búi tóc phía sau
        for x in range(int(cx - head_r) - 1, int(cx + head_r) + 1):
            dx, dy = (x + 0.5 - cx) / head_r, (y + 0.5 - hy) / head_r
            if dx * dx + dy * dy <= 1.05 and (dy < -0.15 or dx < -0.45):
                c.px(x, y, hair)
    rect(c, cx - head_r - 1, hy - head_r - 1, cx - head_r + 1, hy - head_r + 1, hair)
    eyes(c, cx + head_r * 0.15, hy, max(2, int(head_r * 0.7)), INK)
    return c, (int(cx), H - 1)


def shade(P, s, f, d):
    W, H = 2 * s + 10, int(2.6 * s) + 8
    c = Canvas(W, H)
    cx, top = W / 2, 2
    for y in range(top + s, H - 1):   # thân khói thuôn dần, mép dưới tua rua
        k = (y - top - s) / max(1, H - top - s)
        half = s * 0.85 * (1 - k * 0.55)
        wob = (1 if ((y + f * 2) // 3) % 2 else -1) * k * 1.5
        for x in range(int(cx - half + wob), int(cx + half + wob) + 1):
            lit = -(x - cx) / max(1, half)
            c.px(x, y, P[2] if lit > 0.4 else P[1] if lit > -0.3 else P[0])
    for i in range(3):   # đuôi khói
        x = cx - s * 0.5 + i * s * 0.5 + (f if i % 2 else -f)
        rect(c, x, H - 2, x, H - 1, P[0])
    ell(c, cx, top + s * 0.8, s * 0.9, s * 0.85, P)   # mũ trùm
    ell(c, cx + s * 0.2, top + s * 0.95, s * 0.6, s * 0.5, [hx('#0a0612')] * 4)   # mặt tối hẳn
    eyes(c, cx + s * 0.05, top + s * 0.8, max(2, int(s * 0.55)), hx('#d0a0ff'))
    return c, (int(cx), H - 1)


def blade(P, s, f, d):
    W, H = 4 * s + 6, 2 * s + 10
    c = Canvas(W, H)
    cy = H / 2 - 1 - f   # lơ lửng nhấp nhô
    smoke = hx('#2a1440')
    for x in range(2, W - 4, 2):   # khói đen quấn quanh lưỡi
        c.px(x, cy - 2 + (x // 2 + f) % 3, smoke)
        c.px(x + 1, cy + 2 - (x // 2 + f) % 3, smoke)
    x0, x1 = 6, W - 3
    for x in range(x0, x1):   # lưỡi kiếm: sống sáng, lưỡi tối
        c.px(x, cy - 1, P[4])
        c.px(x, cy, P[3])
        c.px(x, cy + 1, P[1])
    c.px(x1, cy, P[4]); c.px(x1, cy - 1, P[3])   # mũi
    c.px(x1 + 1, cy, hx('#ffffff'))
    guard = [hx('#7a5a2a'), hx('#c8963a'), hx('#f2c94c')]
    rect(c, x0 - 1, cy - 3, x0, cy + 3, guard[1])   # chắn kiếm
    c.px(x0 - 1, cy - 3, guard[2])
    rect(c, 1, cy, x0 - 2, cy, guard[0])   # chuôi
    c.px(0, cy, hx('#a3352a'))
    return c, (W // 2, H - 1)


def snowman(P, s, f, d):
    W, H = 2 * s + 8, int(2.6 * s) + 8
    c = Canvas(W, H)
    cx = W / 2
    snow = [hx('#9aaad0'), hx('#c8d4ee'), hx('#f4f8ff'), hx('#ffffff')]
    br, hr = s * 0.95, s * 0.62
    by = H - 1 - br - f * 0.5   # nảy theo khung
    ell(c, cx, by, br, br * 0.9, snow)
    hy = by - br * 0.8 - hr * 0.8
    ell(c, cx, hy, hr, hr, snow)
    scarf = [hx('#a02a3a'), hx('#d84a4a')]
    rect(c, cx - hr, hy + hr * 0.7, cx + hr, hy + hr * 0.7 + 1, scarf[1])
    rect(c, cx - hr * 0.6, hy + hr * 0.7 + 2, cx - hr * 0.6 + 1, hy + hr * 0.7 + 3 + f, scarf[0])   # đuôi khăn
    eyes(c, cx - hr * 0.1, hy - hr * 0.25, max(2, int(hr * 0.7)), INK)
    rect(c, cx + hr * 0.45, hy + hr * 0.1, cx + hr + 1, hy + hr * 0.1, hx('#ff8a2a'))   # mũi cà rốt
    for k in range(2):   # cúc áo
        c.px(cx + 1, by - br * 0.35 + k * 3, INK)
    return c, (int(cx), H - 1)


def pumpkin(P, s, f, d):
    W, H = 2 * s + 8, 2 * s + 9
    c = Canvas(W, H)
    cx = W / 2
    rx, ry = s + 1 + f * 0.5, s * 0.8 - f * 0.4
    cy = H - 1 - ry
    ell(c, cx, cy, rx, ry, P)
    for k in (-0.45, 0.45):   # khía dọc
        x = cx + k * rx
        for y in range(int(cy - ry * 0.8), int(cy + ry * 0.8) + 1):
            c.px(x, y, P[1])
    stem = [hx('#2a5a2a'), hx('#3a8a3a'), hx('#6fbf6a')]
    rect(c, cx - 1, cy - ry - 3, cx, cy - ry, stem[1])
    rect(c, cx + 1, cy - ry - 3, cx + 3, cy - ry - 3, stem[2])   # lá non
    glow = [hx('#ffe27a'), hx('#fff3b0')]
    tri(c, cx + 0, cy - 2, cx + 2, cy - 2, cx + 1, cy - 4, glow[0])   # mắt khoét sáng
    tri(c, cx + 3, cy - 2, cx + 5, cy - 2, cx + 4, cy - 4, glow[0])
    rect(c, cx, cy + 1, cx + 5, cy + 1, glow[0])   # miệng răng cưa
    for x in range(int(cx), int(cx) + 6, 2):
        c.px(x, cy + 2, glow[1])
    return c, (int(cx), H - 1)


EXTRA = dict(person=person, shade=shade, blade=blade, snowman=snowman, pumpkin=pumpkin)
