"""Dáng quái phần 2: khôi đá, rắn, quái bay, kiếm hồn, bóng ma, ma tướng, người tuyết, bí ngô."""
import math
from mob_px import mix
from mob_parts import (FIRE, ICE, LEAF, VOID, GOLD, BONE, STEEL, WOOD, STONE, CLOTH_RED, SNOW, PUMP, FX,
                       phase, eye, horn, leaves)

def golem(c, R, f, s, o):
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    bob = -abs(math.sin(p)) * s
    dark = [mix(x, (0, 0, 0), 0.3) for x in R]
    core = FX.get(o["el"], GOLD)
    for k, sg in ((0, 1), (1, -1)):
        lx = cx + (-5 + 9 * k) * s; sw = math.sin(p) * 2.5 * s * sg
        c.rect(lx + sw - 3 * s, gy - 9 * s + bob, 6 * s, 9 * s - bob - 1, dark if k == 0 else R)
    c.poly([(cx - 10 * s, gy - 24 * s + bob), (cx + 10 * s, gy - 23 * s + bob), (cx + 8 * s, gy - 8 * s + bob), (cx - 8 * s, gy - 8 * s + bob)], R, light=0.55)
    # nứt phát sáng + lõi
    c.ellipse(cx + 1 * s, gy - 16 * s + bob, 3 * s, 3 * s, core)
    c.line(cx - 6 * s, gy - 20 * s + bob, cx - 2 * s, gy - 14 * s + bob, core[2])
    # tay
    sw = math.sin(p) * 2 * s
    c.ellipse(cx - 11 * s, gy - 13 * s + bob - sw, 4 * s, 6 * s, dark)
    c.ellipse(cx + 12 * s, gy - 13 * s + bob + sw, 4 * s, 6 * s, R)
    # đầu nhỏ
    hy = gy - 27 * s + bob
    c.rect(cx - 4 * s, hy - 3 * s, 8 * s, 6 * s, R)
    eye(c, cx + 0 * s, hy - 0.5 * s, o["eye"]); eye(c, cx + 2.5 * s, hy - 0.5 * s, o["eye"])
    return [(cx - 8 * s, gy - 24 * s + bob), (cx + 7 * s, gy - 24 * s + bob)], (cx, hy - 3 * s)


def snake(c, R, f, s, o):
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    n = 9
    pts = []
    for k in range(n):
        t = k / (n - 1)
        x = cx - 14 * s + t * 22 * s
        y = gy - 3 * s - math.sin(p + t * 5) * 2 * s * (1 - t * 0.5) - (t > 0.75) * (t - 0.75) * 40 * s
        pts.append((x, y, (1.5 + 2.5 * math.sin(t * math.pi * 0.9)) * s))
    for (x, y, r) in pts:
        c.ellipse(x, y, r, r, R)
    hx_, hy, _ = pts[-1]
    c.ellipse(hx_ + 2 * s, hy - 1 * s, 4.5 * s, 3.5 * s, R)
    eye(c, hx_ + 3 * s, hy - 2.5 * s, o["eye"])
    if f % 2 == 0:
        c.line(hx_ + 6 * s, hy, hx_ + 9 * s, hy + 0.5 * s, (220, 40, 60))
    return [(x, y - r) for (x, y, r) in pts[1:7:2]], (hx_ + 2 * s, hy - 4 * s)


def wing(c, R, f, s, o):
    """Quái bay: thân nhỏ, đôi cánh vỗ (dơi/bướm)."""
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    hover = gy - 14 * s - math.sin(p) * 2 * s
    dark = [mix(x, (0, 0, 0), 0.35) for x in R]
    fl = math.cos(p)                 # 1: cánh lên, -1: cánh xuống
    for side, Rw in ((-1, dark), (1, R)):
        tip = (cx + side * 13 * s, hover - 8 * s * fl)
        mid = (cx + side * 9 * s, hover + 3 * s - 2 * s * fl)
        c.poly([(cx + side * 2 * s, hover - 2 * s), tip, (cx + side * 14 * s, hover + 1 * s - 5 * s * fl), mid, (cx + side * 2 * s, hover + 3 * s)], Rw, light=0.55)
    c.ellipse(cx, hover, 4 * s, 5 * s, R)
    c.poly([(cx - 3 * s, hover - 4 * s), (cx - 4 * s, hover - 8 * s), (cx - 1 * s, hover - 5 * s)], R, light=0.7)
    c.poly([(cx + 1 * s, hover - 5 * s), (cx + 4 * s, hover - 8 * s), (cx + 3 * s, hover - 4 * s)], R, light=0.7)
    eye(c, cx - 1 * s, hover - 2 * s, o["eye"]); eye(c, cx + 2 * s, hover - 2 * s, o["eye"])
    return [(cx, hover + 6 * s)], (cx, hover - 8 * s)


def blade(c, R, f, s, o):
    """Kiếm hồn: thanh kiếm bay, hồn lửa xanh bao quanh."""
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    y0 = gy - 6 * s - math.sin(p) * 2 * s
    tilt = math.sin(p) * 2 * s
    aura = [(30, 60, 90), (60, 120, 170), (110, 190, 230), (180, 235, 255), (240, 255, 255)]
    for k in range(5):
        c.ellipse(cx + (k - 2) * 3 * s, y0 - 10 * s + math.sin(p + k) * 2 * s, 3 * s, 5 * s, aura, outline=False, light=0.5)
    c.poly([(cx - 1.6 * s + tilt * 0.2, y0 - 2 * s), (cx + tilt, y0 - 26 * s), (cx + 1.6 * s + tilt * 0.2, y0 - 2 * s)], STEEL, light=0.8)
    c.rect(cx - 5 * s, y0 - 2 * s, 10 * s, 2 * s, GOLD)
    c.rect(cx - 1 * s, y0, 2 * s, 5 * s, WOOD)
    c.ellipse(cx, y0 + 5.5 * s, 1.6 * s, 1.6 * s, GOLD)
    eye(c, cx - 2 * s, y0 - 12 * s, o["eye"]); eye(c, cx + 1 * s, y0 - 12 * s, o["eye"])
    return [], (cx, y0 - 26 * s)


def shade(c, R, f, s, o):
    """Bóng ma: áo choàng trôi, đuôi gợn sóng."""
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    y0 = gy - 4 * s - math.sin(p) * 2 * s
    pts = [(cx - 8 * s, y0 - 14 * s), (cx - 1 * s, y0 - 26 * s), (cx + 7 * s, y0 - 15 * s), (cx + 9 * s, y0 - 3 * s)]
    for k in range(5):
        pts.append((cx + 9 * s - k * 4.5 * s, y0 + (2 if (k + f) % 2 else -1) * s))
    pts.append((cx - 11 * s, y0 - 6 * s))
    c.poly(pts, R, light=0.65)
    c.ellipse(cx + 1 * s, y0 - 16 * s, 4.5 * s, 3.5 * s, [(5, 2, 10)] * 5, outline=False)
    eye(c, cx - 1 * s, y0 - 17 * s, o["eye"], True); eye(c, cx + 3 * s, y0 - 17 * s, o["eye"], True)
    c.limb(cx + 5 * s, y0 - 11 * s, cx + 11 * s, y0 - 9 * s + math.sin(p) * 2 * s, 2 * s, R)
    return [(cx - 8 * s, y0 - 10 * s), (cx + 6 * s, y0 - 4 * s)], (cx - 1 * s, y0 - 26 * s)


def lord(c, R, f, s, o):
    """Ma tướng: giáp nặng, áo choàng, sừng lớn, vũ khí theo hệ."""
    gy = c.h - 2; cx = c.w / 2 - 2 * s; p = phase(f)
    bob = -abs(math.sin(p)) * s
    A = o.get("armor", STEEL); dark = [mix(x, (0, 0, 0), 0.35) for x in R]
    cape = o.get("cape", dark)
    # áo choàng sau
    sw = math.sin(p) * 1.5 * s
    c.poly([(cx - 5 * s, gy - 22 * s + bob), (cx + 4 * s, gy - 22 * s + bob), (cx - 2 * s, gy - 3 * s), (cx - 10 * s + sw, gy - 2 * s), (cx - 12 * s - sw, gy - 6 * s)], cape, light=0.45)
    # chân
    for k, sg in ((0, 1), (1, -1)):
        lx = cx + (-3 + 6 * k) * s; sl = math.sin(p) * 3 * s * sg
        c.limb(lx, gy - 10 * s + bob, lx + sl, gy - 3 * s, 4 * s, [mix(x, (0, 0, 0), .3) for x in A] if k == 0 else A)
        c.rect(lx + sl - 2 * s, gy - 4 * s, 5 * s, 3.5 * s, dark)
    # thân giáp
    c.poly([(cx - 7 * s, gy - 23 * s + bob), (cx + 7 * s, gy - 23 * s + bob), (cx + 5 * s, gy - 9 * s + bob), (cx - 5 * s, gy - 9 * s + bob)], A, light=0.55)
    c.ellipse(cx, gy - 17 * s + bob, 2.2 * s, 2.2 * s, FX.get(o["el"], CLOTH_RED))
    c.rect(cx - 6 * s, gy - 11 * s + bob, 12 * s, 2.5 * s, R)
    # giáp vai gai
    for side in (-1, 1):
        x = cx + side * 7 * s
        c.ellipse(x, gy - 22 * s + bob, 4 * s, 3 * s, A)
        c.poly([(x - 1.5 * s, gy - 24 * s + bob), (x + side * 2 * s, gy - 28 * s + bob), (x + 1.5 * s, gy - 24 * s + bob)], BONE, light=0.7)
    # vũ khí
    wx, wy = cx + 10 * s, gy - 14 * s + bob
    W = o.get("weapon", "sword")
    if W == "sword":
        c.poly([(wx - 1.3 * s, wy), (wx + 6 * s, wy - 20 * s), (wx + 8 * s, wy - 19 * s), (wx + 1.3 * s, wy + 1 * s)], STEEL, light=0.8)
    elif W == "axe":
        c.line(wx, wy + 6 * s, wx + 4 * s, wy - 18 * s, WOOD[1], max(1, int(s)))
        c.poly([(wx + 3 * s, wy - 16 * s), (wx + 11 * s, wy - 20 * s), (wx + 11 * s, wy - 9 * s), (wx + 4 * s, wy - 12 * s)], STEEL, light=0.8)
    else:  # trượng
        c.line(wx, wy + 8 * s, wx + 2 * s, wy - 20 * s, WOOD[1], max(1, int(s)))
        c.ellipse(wx + 2 * s, wy - 22 * s, 3 * s, 3 * s, FX.get(o["el"], VOID))
    c.limb(cx + 4 * s, gy - 20 * s + bob, wx, wy, 3 * s, A)
    c.ellipse(wx, wy, 2.2 * s, 2.2 * s, dark)
    # đầu
    hy = gy - 28 * s + bob
    c.ellipse(cx, hy, 6.5 * s, 6 * s, R)
    c.rect(cx - 6.5 * s, hy - 1 * s, 13 * s, 3.5 * s, A, light=0.5)  # mặt nạ
    eye(c, cx + 0.5 * s, hy, o["eye"], True); eye(c, cx + 4 * s, hy, o["eye"], True)
    horn(c, cx - 4 * s, hy - 4 * s, s, -1, BONE, h=9)
    horn(c, cx + 4 * s, hy - 4 * s, s, 1, BONE, h=9)
    return [(cx - 6 * s, gy - 24 * s + bob), (cx + 6 * s, gy - 24 * s + bob), (cx - 10 * s, gy - 8 * s)], (cx, hy - 6 * s)


def snowman(c, R, f, s, o):
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    lean = math.sin(p) * 1 * s
    c.ellipse(cx, gy - 7 * s, 8 * s, 7 * s, SNOW)
    c.ellipse(cx + lean, gy - 18 * s, 6 * s, 5.5 * s, SNOW)
    c.line(cx - 5 * s, gy - 14 * s, cx - 11 * s, gy - 18 * s - lean, WOOD[1], max(1, int(s)))
    c.line(cx + 5 * s, gy - 14 * s, cx + 11 * s, gy - 17 * s + lean, WOOD[1], max(1, int(s)))
    c.rect(cx - 6 * s + lean, gy - 14 * s, 12 * s, 2 * s, CLOTH_RED)
    eye(c, cx + 0 * s + lean, gy - 20 * s, (20, 20, 40)); eye(c, cx + 3 * s + lean, gy - 20 * s, (20, 20, 40))
    c.poly([(cx + 4 * s + lean, gy - 18 * s), (cx + 9 * s + lean, gy - 17 * s), (cx + 4 * s + lean, gy - 16 * s)], PUMP, light=0.8)
    c.rect(cx - 5 * s + lean, gy - 26 * s, 9 * s, 3 * s, [(30, 30, 40), (50, 50, 64), (70, 70, 90), (90, 90, 110), (120, 120, 140)])
    return [], (cx, gy - 27 * s)


def pumpkin(c, R, f, s, o):
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    hop = -abs(math.sin(p)) * 3 * s
    for dx in (-5, 5, 0):
        c.ellipse(cx + dx * s, gy - 8 * s + hop, 6 * s, 7.5 * s, PUMP)
    c.limb(cx, gy - 15 * s + hop, cx + 2 * s, gy - 19 * s + hop, 2 * s, LEAF)
    leaves(c, [(cx + 2 * s, gy - 18 * s + hop)], f, s * 0.8)
    face = (60, 20, 5); glow = (255, 220, 90)
    for x in (cx - 2 * s, cx + 4 * s):
        c.poly([(x - 1.5 * s, gy - 9 * s + hop), (x, gy - 12 * s + hop), (x + 1.5 * s, gy - 9 * s + hop)], [face, glow, glow, glow, glow], outline=False, light=0.9)
    c.poly([(cx - 4 * s, gy - 6 * s + hop), (cx + 6 * s, gy - 6 * s + hop), (cx + 4 * s, gy - 3 * s + hop), (cx - 2 * s, gy - 3 * s + hop)], [face, glow, glow, glow, glow], outline=False, light=0.9)
    return [], (cx, gy - 19 * s + hop)


from mob_looks_a import imp, soldier, mage, wolf, slime, plant, beetle  # noqa: E402

LOOKS = dict(imp=imp, soldier=soldier, mage=mage, wolf=wolf, slime=slime, plant=plant, beetle=beetle,
             golem=golem, snake=snake, wing=wing, blade=blade, shade=shade, lord=lord, snowman=snowman,
             pumpkin=pumpkin)
# kích thước khung (rộng, cao) ở s=1
BOX = dict(imp=(34, 34), soldier=(36, 46), mage=(30, 40), wolf=(50, 30), slime=(24, 24), plant=(34, 38),
           beetle=(38, 24), golem=(36, 36), snake=(40, 30), wing=(34, 30), blade=(20, 40), shade=(28, 36),
           lord=(40, 46), snowman=(26, 34), pumpkin=(26, 28))
