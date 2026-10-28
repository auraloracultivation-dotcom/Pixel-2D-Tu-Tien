"""Dáng quái phần 1: quỷ nhỏ, lính, pháp sư, sói, slime, cây yêu, bọ giáp.
Mỗi hàm vẽ 1 khung (f = 0..3, chu kỳ đi) quay mặt sang phải, s = tỉ lệ (boss to hơn).
Trả (điểm đặt hiệu ứng hệ, đỉnh đầu để đội vương miện)."""
import math
from mob_px import mix
from mob_parts import (FIRE, ICE, LEAF, VOID, GOLD, BONE, STEEL, WOOD, STONE, CLOTH_RED, SNOW, PUMP, FX,
                       phase, eye, horn, leaves)

def imp(c, R, f, s, o):
    """Tiểu quỷ: đầu to, sừng, cánh dơi, đuôi."""
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    bob = -abs(math.sin(p)) * s
    dark = [mix(x, (10, 5, 20), 0.35) for x in R]
    # cánh sau
    fl = math.sin(p) * 2 * s
    wx, wy = cx - 2 * s, gy - 16 * s + bob
    c.poly([(wx, wy), (wx - 11 * s, wy - 7 * s - fl), (wx - 9 * s, wy - 2 * s - fl), (wx - 12 * s, wy + 1 * s - fl * 0.5),
            (wx - 7 * s, wy + 2 * s), (wx - 8 * s, wy + 5 * s), (wx - 1 * s, wy + 4 * s)], dark, light=0.5)
    # đuôi
    tx = cx - 5 * s
    c.line(tx, gy - 7 * s + bob, tx - 6 * s, gy - 5 * s - math.sin(p) * s, dark[1], max(1, int(s)))
    c.poly([(tx - 6 * s, gy - 7 * s), (tx - 9 * s, gy - 5 * s), (tx - 6 * s, gy - 3 * s)], dark, light=0.5)
    # chân
    for k, sg in ((0, 1), (1, -1)):
        lx = cx + (-2 + 3 * k) * s
        sw = math.sin(p) * 3 * s * sg
        Rl = dark if k == 0 else R
        c.limb(lx, gy - 6 * s + bob, lx + sw, gy - 1, 3 * s, Rl)
        c.ellipse(lx + sw + 1 * s, gy - 1, 2 * s, 1.2 * s, Rl)
    # thân
    c.ellipse(cx, gy - 9 * s + bob, 5.5 * s, 5 * s, R)
    # tay
    c.limb(cx + 2 * s, gy - 11 * s + bob, cx + 6 * s - math.sin(p) * 2 * s, gy - 7 * s + bob, 2.4 * s, R)
    # đầu
    hy = gy - 19 * s + bob
    c.ellipse(cx + 1 * s, hy, 8.5 * s, 7.5 * s, R)
    # tai nhọn
    c.poly([(cx - 6 * s, hy), (cx - 11 * s, hy - 2 * s), (cx - 6 * s, hy + 3 * s)], R, light=0.5)
    horn(c, cx - 4 * s, hy - 5 * s, s, -1, o.get("horn", BONE))
    horn(c, cx + 5 * s, hy - 5 * s, s, 1, o.get("horn", BONE))
    eye(c, cx + 2 * s, hy + 0 * s, o["eye"], big=s > 1)
    eye(c, cx + 6 * s, hy + 0 * s, o["eye"], big=s > 1)
    c.line(cx + 3 * s, hy + 4 * s, cx + 6 * s, hy + 4 * s, R[0])
    return [(cx - 2 * s, hy - 7 * s), (cx + 4 * s, hy - 8 * s)], (cx + 1 * s, hy - 8 * s)


def soldier(c, R, f, s, o):
    """Ma binh: mũ sắt có chùm lông, giáp, giáo."""
    gy = c.h - 2; cx = c.w / 2 - 2 * s; p = phase(f)
    bob = -abs(math.sin(p)) * s
    A = o.get("armor", STEEL); Ad = [mix(x, (0, 0, 0), 0.3) for x in A]
    cloth = o.get("cloth", CLOTH_RED)
    # giáo (sau)
    sx = cx + 9 * s; sy = gy - 1
    c.line(sx - 1 * s, sy, sx + 3 * s, gy - 34 * s + bob, WOOD[1], max(1, int(s)))
    c.poly([(sx + 3 * s - 2 * s, gy - 33 * s + bob), (sx + 3.6 * s, gy - 40 * s + bob), (sx + 3 * s + 2 * s, gy - 33 * s + bob)], STEEL, light=0.85)
    c.poly([(sx + 2 * s, gy - 31 * s + bob), (sx + 4 * s, gy - 31 * s + bob), (sx + 4 * s, gy - 26 * s + bob), (sx + 2 * s, gy - 27 * s + bob)], cloth, light=0.6)
    # chân
    for k, sg in ((0, 1), (1, -1)):
        lx = cx + (-2 + 4 * k) * s; sw = math.sin(p) * 3 * s * sg
        Rl = Ad if k == 0 else A
        c.limb(lx, gy - 8 * s + bob, lx + sw, gy - 2, 3.4 * s, cloth if k else [mix(x, (0, 0, 0), .3) for x in cloth])
        c.rect(lx + sw - 1.5 * s, gy - 3 * s, 4 * s, 3 * s, Rl)
    # thân giáp
    c.poly([(cx - 6 * s, gy - 18 * s + bob), (cx + 6 * s, gy - 18 * s + bob), (cx + 5 * s, gy - 7 * s + bob), (cx - 5 * s, gy - 7 * s + bob)], A, light=0.55)
    c.rect(cx - 5 * s, gy - 9 * s + bob, 10 * s, 2 * s, cloth)
    # giáp vai
    c.ellipse(cx - 5 * s, gy - 17 * s + bob, 3.5 * s, 2.6 * s, A)
    # tay cầm giáo
    c.limb(cx + 3 * s, gy - 16 * s + bob, sx + 1 * s, gy - 14 * s + bob, 2.6 * s, Ad)
    c.ellipse(sx + 1 * s, gy - 14 * s + bob, 1.8 * s, 1.8 * s, o.get("skin", BONE))
    # đầu (mũ)
    hy = gy - 24 * s + bob
    c.ellipse(cx, hy, 7 * s, 6.5 * s, A)
    c.rect(cx - 3 * s, hy, 9 * s, 4 * s, [(15, 10, 15)] * 5, outline=False)
    eye(c, cx + 0 * s, hy + 1 * s, o["eye"]); eye(c, cx + 4 * s, hy + 1 * s, o["eye"])
    c.line(cx - 7 * s, hy - 0.5 * s, cx + 7 * s, hy - 0.5 * s, A[3])
    # chùm lông
    fl = math.sin(p) * s
    c.poly([(cx - 1 * s, hy - 6 * s), (cx - 6 * s, hy - 10 * s - fl), (cx - 11 * s, hy - 6 * s - fl), (cx - 7 * s, hy - 8 * s - fl), (cx - 3 * s, hy - 4 * s)], cloth, light=0.7)
    return [(cx - 4 * s, hy - 5 * s), (cx + 3 * s, hy - 6 * s)], (cx, hy - 6 * s)


def mage(c, R, f, s, o):
    """Pháp sư trùm mũ, áo choàng, gậy có ngọc."""
    gy = c.h - 2; cx = c.w / 2 - 1 * s; p = phase(f)
    bob = -abs(math.sin(p)) * 0.8 * s
    orb = FX.get(o["el"], VOID)
    # gậy
    sx = cx + 8 * s
    c.line(sx, gy - 1, sx + 1 * s, gy - 26 * s + bob, WOOD[2], max(1, int(s)))
    glow = 2.6 * s + (f % 2) * 0.5 * s
    c.ellipse(sx + 1 * s, gy - 28 * s + bob, glow, glow, orb)
    c.put(sx, gy - 29 * s + bob, (255, 255, 255))
    # áo choàng
    sw = math.sin(p) * 1.5 * s
    hem = [(cx - 8 * s + sw, gy - 1), (cx - 5 * s, gy - 1 - s), (cx - 2 * s + sw, gy - 1), (cx + 1 * s, gy - 1 - s), (cx + 4 * s + sw, gy - 1), (cx + 6 * s, gy - 1)]
    c.poly([(cx - 4 * s, gy - 20 * s + bob), (cx + 4 * s, gy - 20 * s + bob)] + hem[::-1], R, light=0.55)
    c.rect(cx - 5 * s, gy - 11 * s + bob, 10 * s, 2 * s, GOLD, light=0.6)
    # tay
    c.limb(cx + 2 * s, gy - 17 * s + bob, sx, gy - 15 * s + bob, 2.6 * s, R)
    c.ellipse(sx, gy - 15 * s + bob, 1.6 * s, 1.6 * s, o.get("skin", BONE))
    # mũ trùm
    hy = gy - 23 * s + bob
    c.poly([(cx - 6 * s, hy + 4 * s), (cx - 4 * s, hy - 5 * s), (cx - 1 * s, hy - 10 * s), (cx + 3 * s, hy - 6 * s), (cx + 6 * s, hy + 4 * s)], R, light=0.65)
    c.ellipse(cx + 1.5 * s, hy + 0.5 * s, 3.5 * s, 3 * s, [(10, 6, 14)] * 5, outline=False)
    eye(c, cx + 0.5 * s, hy, o["eye"]); eye(c, cx + 3 * s, hy, o["eye"])
    return [(cx - 3 * s, hy - 6 * s)], (cx - 1 * s, hy - 10 * s)


def wolf(c, R, f, s, o):
    """Sói bốn chân, bờm theo hệ."""
    gy = c.h - 2; cx = c.w / 2 - 2 * s; p = phase(f)
    bob = -abs(math.sin(p)) * s
    dark = [mix(x, (10, 5, 25), 0.35) for x in R]
    by = gy - 12 * s + bob
    # đuôi
    tw = math.sin(p) * 1.5 * s
    c.poly([(cx - 10 * s, by - 2 * s), (cx - 17 * s, by - 6 * s + tw), (cx - 20 * s, by - 3 * s + tw), (cx - 16 * s, by + 1 * s), (cx - 10 * s, by + 2 * s)], R, light=0.6)
    # chân xa
    def leg(x, ph, Rl):
        sw = math.sin(ph) * 3.5 * s; lift = max(0, math.cos(ph)) * 2 * s
        c.limb(x, by + 2 * s, x + sw, gy - 1 - lift, 3.2 * s, Rl)
        c.ellipse(x + sw + 0.8 * s, gy - 1 - lift, 1.8 * s, 1.1 * s, Rl)
    leg(cx - 7 * s, p + math.pi, dark); leg(cx + 8 * s, p, dark)
    # thân
    c.ellipse(cx, by, 12 * s, 5.5 * s, R)
    c.ellipse(cx + 8 * s, by + 0.5 * s, 5 * s, 5.5 * s, R)
    leg(cx - 6 * s, p, R); leg(cx + 9 * s, p + math.pi, R)
    # đầu
    hx_, hy = cx + 14 * s, by - 5 * s
    c.poly([(hx_ - 2 * s, hy - 3 * s), (hx_ - 1 * s, hy - 10 * s), (hx_ + 2 * s, hy - 4 * s)], R, light=0.7)   # tai
    c.ellipse(hx_, hy, 5 * s, 4.5 * s, R)
    c.poly([(hx_ + 2 * s, hy - 1 * s), (hx_ + 9 * s, hy + 1 * s), (hx_ + 9 * s, hy + 3 * s), (hx_ + 2 * s, hy + 4 * s)], R, light=0.7)  # mõm
    c.put(hx_ + 9 * s, hy + 1 * s, (20, 15, 20))
    for k in range(3):
        c.put(hx_ + (4 + 1.6 * k) * s, hy + 3 * s, (250, 250, 240))
    eye(c, hx_ + 1 * s, hy - 1.5 * s, o["eye"], big=s > 1)
    back = [(cx - 8 * s + k * 4 * s, by - 5 * s) for k in range(6)] + [(cx - 18 * s, by - 3 * s)]
    return back, (hx_, hy - 5 * s)


def slime(c, R, f, s, o):
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    sq = math.sin(p) * 0.12
    rx, ry = 9 * s * (1 + sq), 7.5 * s * (1 - sq)
    c.ellipse(cx, gy - ry, rx, ry, R)
    c.ellipse(cx - 3 * s, gy - ry * 1.45, 2 * s, 1.3 * s, [R[4]] * 5, outline=False)
    ey = gy - ry * 1.1
    eye(c, cx + 1 * s, ey, (20, 20, 30)); eye(c, cx + 5 * s, ey, (20, 20, 30))
    c.put(cx + 1 * s, ey, (255, 255, 255)); c.put(cx + 5 * s, ey, (255, 255, 255))
    c.line(cx + 2 * s, ey + 3.5 * s, cx + 5 * s, ey + 3.5 * s, R[0])
    return [(cx - 1 * s, gy - ry * 2), (cx + 3 * s, gy - ry * 1.9)], (cx, gy - ry * 2)


def plant(c, R, f, s, o):
    """Cây yêu: thân gỗ, tán lá, miệng có răng, rễ bò."""
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    bark = o.get("bark", WOOD); dark = [mix(x, (0, 0, 0), 0.3) for x in bark]
    # rễ chân
    for k in range(4):
        x = cx - 6 * s + k * 4 * s; sw = math.sin(p + k * 1.6) * 2 * s
        c.limb(x, gy - 6 * s, x + sw - 2 * s + k * 1.2 * s, gy - 1, 2.4 * s, dark if k % 2 else bark)
    # thân
    c.poly([(cx - 6 * s, gy - 4 * s), (cx - 5 * s, gy - 18 * s), (cx + 5 * s, gy - 18 * s), (cx + 7 * s, gy - 4 * s)], bark, light=0.55)
    # cành tay
    sw = math.sin(p) * 2 * s
    c.limb(cx + 4 * s, gy - 14 * s, cx + 11 * s, gy - 18 * s + sw, 2.4 * s, bark)
    c.limb(cx - 4 * s, gy - 14 * s, cx - 11 * s, gy - 17 * s - sw, 2.4 * s, dark)
    # tán lá
    top = gy - 24 * s
    for (dx, dy, rr) in ((-6, 2, 6), (6, 2, 6), (0, -3, 7.5), (-2, 4, 6), (4, 5, 5)):
        c.ellipse(cx + dx * s, top + dy * s, rr * s, rr * 0.85 * s, R)
    # mặt
    eye(c, cx - 1 * s, gy - 15 * s, o["eye"]); eye(c, cx + 3 * s, gy - 15 * s, o["eye"])
    c.rect(cx - 2 * s, gy - 11 * s, 7 * s, 3 * s, [(25, 10, 10)] * 5, outline=False)
    for k in range(int(3 * s) + 1):
        c.put(cx - 1 * s + k * 2, gy - 11 * s, (240, 235, 210))
    flower = o.get("flower")
    pts = [(cx + (-6 + 4 * k) * s, top - 4 * s) for k in range(4)]
    if flower:
        for (x, y) in pts[1:3]:
            c.ellipse(x, y, 2 * s, 2 * s, flower); c.put(x, y, (255, 240, 120))
    return pts, (cx, top - 8 * s)


def beetle(c, R, f, s, o):
    gy = c.h - 2; cx = c.w / 2; p = phase(f)
    dark = [mix(x, (0, 0, 0), 0.4) for x in R]
    by = gy - 7 * s
    for k in range(3):
        x = cx - 6 * s + k * 6 * s
        for side, Rl in ((p, dark), (p + math.pi, dark)):
            sw = math.sin(side + k * 2) * 2 * s
            c.limb(x, by + 2 * s, x + sw + 1 * s, gy - 1, 1.5 * s, Rl)
    c.ellipse(cx + 11 * s, by + 1 * s, 4 * s, 3.5 * s, dark)                      # đầu
    c.poly([(cx + 12 * s, by - 1 * s), (cx + 15 * s, by - 9 * s - (f % 2) * s), (cx + 16 * s, by - 8 * s), (cx + 15 * s, by + 1 * s)], R, light=0.8)  # sừng
    c.ellipse(cx, by - 1 * s, 10 * s, 6.5 * s, R)                                 # mai
    c.line(cx - 1 * s, by - 7 * s, cx + 1 * s, by + 5 * s, R[0])
    eye(c, cx + 12 * s, by + 0.5 * s, o["eye"])
    return [(cx - 5 * s, by - 6 * s), (cx + 4 * s, by - 6 * s)], (cx, by - 7 * s)
