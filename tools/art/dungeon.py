"""Hầm ngục, bí cảnh về đêm (theo bài pixel-lessons: nền đá tối, đuốc lửa lập loè).
Nền và vách là lớp phủ trong suốt (mạch vữa tối, cạnh sáng) đè lên màu đất riêng của từng bản đồ,
nên một bộ hình dùng chung cho hang lửa, băng quật, địa cung... Đuốc 4 khung lửa nhảy."""
import random
from px import Canvas, hx

INK = (16, 7, 10, 255)
FIRE = [hx(c) for c in ['#641429', '#9c4429', '#ea571b', '#e88129', '#efbb0a', '#fff3b0']]
IRON = [hx(c) for c in ['#2a2433', '#4a4458', '#6e6880']]
WOOD = [hx(c) for c in ['#3e2618', '#6a4428']]


def _a(c, a):
    return c[:3] + (a,)


DARK, LIGHT = (8, 4, 14), (255, 240, 220)


# Bố cục phiến đá trong một ô 16×16 (x, y, rộng, cao). Trước đây phiến 8×8 xếp đều, mạch vữa đậm nên nền đọc thành
# tường gạch (chơi thử 28/10: nền hầm trông như vách). Nay phiến to nhỏ không đều, mạch nhạt, nền khác hẳn vách.
LAYOUTS = [
    [(0, 0, 10, 7), (10, 0, 6, 7), (0, 7, 6, 9), (6, 7, 10, 9)],
    [(0, 0, 16, 6), (0, 6, 7, 10), (7, 6, 9, 5), (7, 11, 9, 5)],
    [(0, 0, 7, 9), (7, 0, 9, 9), (0, 9, 11, 7), (11, 9, 5, 7)],
    [(0, 0, 5, 16), (5, 0, 11, 8), (5, 8, 6, 8), (11, 8, 5, 8)],
]


def floor(seed):
    """Phiến đá to nhỏ không đều: mạch vữa nhạt, cạnh trên bắt sáng rất nhẹ, mỗi phiến đậm nhạt một chút."""
    rnd = random.Random(seed * 7 + 1)
    c = Canvas(16, 16)
    for (x0, y0, w, h) in LAYOUTS[seed % len(LAYOUTS)]:
        shade = rnd.choice((0, 0, 0, 14, 24, 34))
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                lx, ly = x - x0, y - y0
                if lx == w - 1 or ly == h - 1:
                    c.px(x, y, _a(DARK, 105))            # mạch vữa (một nét, nhạt)
                elif ly == 0 and 0 < lx < w - 2:
                    c.px(x, y, _a(LIGHT, 18))            # cạnh trên bắt sáng
                elif shade:
                    c.px(x, y, _a(DARK, shade))
    if seed % 4 == 1:   # vết nứt
        x, y = rnd.randrange(2, 10), rnd.randrange(2, 12)
        for k in range(4):
            c.px(x + k, y + (k > 1), _a(DARK, 140))
    if seed % 4 == 3:   # sỏi vụn
        for _ in range(3):
            x, y = rnd.randrange(1, 14), rnd.randrange(1, 14)
            c.px(x, y, _a(LIGHT, 30)); c.px(x + 1, y + 1, _a(DARK, 90))
    return c


def wall(face, seed):
    """Vách: mặt có gạch đá (ô ngay trên nền đi được) hoặc đỉnh vách tối có vân."""
    rnd = random.Random(seed + 40)
    c = Canvas(16, 16)
    if not face:
        for y in range(16):
            for x in range(16):
                if (x * 5 + y * 3 + seed) % 13 == 0:
                    c.px(x, y, _a(LIGHT, 14))
                elif (x * 7 + y * 11 + seed) % 17 == 0:
                    c.px(x, y, _a(DARK, 90))
        return c
    for y in range(16):   # gạch 8×5, ba hàng, chân vách tối dần
        row, ly = divmod(y, 5)
        off = 4 if row % 2 else 0
        for x in range(16):
            lx = (x + off + seed * 3) % 8
            if ly == 4 or lx == 7:
                c.px(x, y, _a(DARK, 160))
            elif ly == 0:
                c.px(x, y, _a(LIGHT, 40))
            elif y >= 13:
                c.px(x, y, _a(DARK, 90))
    for _ in range(2):   # rêu, vết loang
        x, y = rnd.randrange(1, 14), rnd.randrange(6, 13)
        c.px(x, y, _a(DARK, 110)); c.px(x + 1, y, _a(DARK, 70))
    return c


def torch(frame):
    """Đuốc treo vách: đế sắt, cán gỗ, chén lửa; lửa 3 cột cao thấp đổi theo khung."""
    c = Canvas(10, 18)
    for y in range(11, 17):          # cán gỗ
        c.px(4, y, WOOD[1]); c.px(5, y, WOOD[0])
    for x in range(2, 8):            # chén sắt
        c.px(x, 10, IRON[2] if x < 5 else IRON[1])
    for x in range(3, 7):
        c.px(x, 11, IRON[1])
    c.px(3, 15, IRON[1]); c.px(6, 15, IRON[1])   # vòng kẹp vào vách
    hts = [[4, 7, 5], [5, 6, 6], [6, 5, 4], [5, 7, 4]][frame % 4]
    for i, ht in enumerate(hts):
        x = 3 + i + (1 if i == 2 else 0)
        for k in range(ht):
            col = FIRE[5] if k < 2 and i == 1 else FIRE[4] if k < ht - 2 else FIRE[3] if k < ht - 1 else FIRE[2]
            c.px(x, 9 - k, col)
    if frame % 2:   # tàn lửa bay
        c.px(5 + (frame % 3) - 1, 9 - max(hts) - 2, FIRE[4])
    c.outline(INK)
    return c
