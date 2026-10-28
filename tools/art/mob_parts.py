"""Phần dùng chung cho các dáng quái (mob_looks_a.py, mob_looks_b.py): bảng màu, mắt, sừng, vương miện,
hiệu ứng theo hệ (lửa, băng, lá, khói hư không, gió, ánh kim)."""
import math
from mob_px import Canvas, ramp, hx, mix

FIRE = [(120, 20, 10), (200, 50, 15), (245, 110, 25), (255, 180, 50), (255, 235, 140)]
ICE = [(40, 70, 130), (80, 130, 200), (140, 195, 240), (205, 235, 255), (250, 255, 255)]
LEAF = [(25, 55, 25), (45, 100, 40), (80, 150, 55), (130, 200, 80), (190, 235, 130)]
VOID = [(30, 10, 50), (80, 30, 130), (140, 70, 210), (200, 140, 255), (240, 210, 255)]
GOLD = [(90, 55, 10), (160, 105, 20), (215, 160, 40), (250, 215, 90), (255, 245, 190)]
BONE = [(80, 70, 70), (150, 140, 135), (205, 198, 188), (235, 230, 220), (255, 252, 245)]
STEEL = [(40, 44, 58), (80, 86, 104), (130, 138, 156), (185, 192, 208), (235, 240, 250)]
WOOD = [(45, 25, 15), (85, 50, 28), (125, 80, 45), (165, 115, 70), (205, 160, 110)]
STONE = [(40, 34, 34), (80, 70, 66), (120, 108, 100), (160, 148, 138), (200, 190, 180)]
CLOTH_RED = [(60, 10, 20), (120, 20, 35), (175, 35, 50), (215, 70, 80), (240, 130, 130)]
SNOW = [(120, 140, 175), (175, 195, 225), (220, 232, 248), (244, 248, 255), (255, 255, 255)]
PUMP = [(110, 40, 10), (190, 80, 20), (240, 130, 35), (255, 175, 70), (255, 215, 130)]
EYE = {"fire": (255, 220, 60), "ice": (120, 220, 255), "void": (230, 120, 255), "blood": (255, 60, 60),
       "wood": (230, 255, 120), "metal": (255, 230, 120), "earth": (255, 170, 60), "wind": (200, 255, 240),
       None: (255, 200, 60)}
FX = {"fire": FIRE, "ice": ICE, "wood": LEAF, "void": VOID, "blood": CLOTH_RED,
      "metal": GOLD, "earth": STONE, "wind": [(60, 80, 100), (110, 140, 160), (170, 205, 215), (215, 240, 240), (250, 255, 255)]}


def phase(f):
    return f / 4 * 2 * math.pi


def eye(c, x, y, col, big=False):
    """Mắt phát sáng 2x2 có điểm sáng."""
    hi = mix(col, (255, 255, 255), 0.6)
    lo = mix(col, (0, 0, 0), 0.35)
    if big:
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (2, 1)):
            c.put(x + dx, y + dy, col)
        c.put(x + 2, y + 1, lo); c.put(x, y, hi)
    else:
        c.put(x, y, hi); c.put(x + 1, y, col); c.put(x, y + 1, col); c.put(x + 1, y + 1, lo)


def horn(c, x, y, s, side, R=BONE, h=7, bend=1):
    """Sừng cong; side=-1 trái, 1 phải."""
    pts = []
    n = 6
    for k in range(n + 1):
        t = k / n
        px = x + side * (t * 3 * s + math.sin(t * 2.4) * 2 * s * bend)
        py = y - t * h * s
        w = (1 - t) * 1.6 * s + 0.4
        pts.append((px, py, w))
    left = [(p[0] - p[2], p[1]) for p in pts]
    right = [(p[0] + p[2], p[1]) for p in pts][::-1]
    c.poly(left + right, R, light=0.7)


def crown(c, x, y, s):
    w = 9 * s; h = 5 * s
    pts = [(x - w / 2, y), (x - w / 2, y - h), (x - w / 4, y - h * 0.5), (x, y - h * 1.2),
           (x + w / 4, y - h * 0.5), (x + w / 2, y - h), (x + w / 2, y)]
    c.poly(pts, GOLD, light=0.75)
    c.put(x, y - h * 0.4, (255, 60, 90)); c.put(x - w / 4, y - 1, (90, 200, 255)); c.put(x + w / 4, y - 1, (90, 200, 255))


def flames(c, pts, f, s, R=FIRE, h=7):
    """Lưỡi lửa bập bùng dọc theo các điểm."""
    for k, (x, y) in enumerate(pts):
        hh = h * s * (0.7 + 0.35 * math.sin(phase(f) * 2 + k * 1.7))
        lean = -2 * s + math.sin(phase(f) + k) * 1.2 * s
        w = 2.4 * s
        c.poly([(x - w, y), (x + lean * 0.4, y - hh * 0.6), (x + lean, y - hh), (x + w, y)], R, light=0.8, outline=False)
        c.poly([(x - w * 0.45, y), (x + lean * 0.7, y - hh * 0.65), (x + w * 0.45, y)], R[2:], light=0.9, outline=False)


def crystals(c, pts, f, s, R=ICE, h=6):
    for k, (x, y) in enumerate(pts):
        hh = h * s * (0.8 + 0.25 * ((k * 7) % 3) / 2)
        lean = (k % 3 - 1) * 1.2 * s
        c.poly([(x - 1.6 * s, y), (x + lean, y - hh), (x + 1.6 * s, y)], R, light=0.85)
    if f % 2 == 0 and pts:
        x, y = pts[f % len(pts)]; c.put(x, y - h * s, (255, 255, 255))


def leaves(c, pts, f, s, R=LEAF):
    for k, (x, y) in enumerate(pts):
        a = -1.2 + (k % 3) * 0.9 + math.sin(phase(f) + k) * 0.15
        L = 5 * s
        ex, ey = x + math.cos(a) * L, y + math.sin(a) * L
        nx, ny = -math.sin(a) * 1.8 * s, math.cos(a) * 1.8 * s
        mx, my = (x + ex) / 2, (y + ey) / 2
        c.poly([(x, y), (mx + nx, my + ny), (ex, ey), (mx - nx, my - ny)], R, light=0.7)


def wisps(c, pts, f, s, R=VOID):
    for k, (x, y) in enumerate(pts):
        up = ((f + k) % 4) * 2 * s
        c.ellipse(x + math.sin(k + f) * s, y - up, 1.4 * s, 1.4 * s, R, outline=False)


def element_fx(c, el, pts, f, s):
    if el == "fire": flames(c, pts, f, s)
    elif el == "ice": crystals(c, pts, f, s)
    elif el == "wood": leaves(c, pts, f, s)
    elif el in ("void", "blood"): wisps(c, pts, f, s, FX[el])
    elif el == "wind":
        for k, (x, y) in enumerate(pts):
            for t in range(6):
                a = t * 0.6 + phase(f) + k
                c.put(x + math.cos(a) * (2 + t) * s * 0.6, y - 2 * s + math.sin(a) * 2 * s, FX["wind"][2 + t % 3])
    elif el == "metal":
        for k, (x, y) in enumerate(pts[:2]):
            if (f + k) % 2 == 0:
                c.put(x, y, (255, 255, 230)); c.put(x - 1, y, GOLD[3]); c.put(x + 1, y, GOLD[3]); c.put(x, y - 1, GOLD[3]); c.put(x, y + 1, GOLD[3])
