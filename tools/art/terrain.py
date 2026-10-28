"""Mặt đất đặc biệt bằng pixel (thay hình khối cũ trong src/world/draw-map.js):
dung nham (L), hồ băng nứt (O), khe hư không (f), mép bờ (đá bazan quanh dung nham, tuyết quanh băng, đá tím quanh khe), bọt, nhà cháy (B).
Dung nham và hồ băng vẽ một tấm 64×64 lặp liền rồi cắt 16 ô 16×16: game chọn ô theo (tx % 4, ty % 4) nên cả hồ liền mạch,
không lộ ô vuông."""
import math, random
import numpy as np
from px import Canvas, hx, BAYER4

LAVA = [hx(c) for c in ('#5a140e', '#8a2414', '#c03a1a', '#e85a24', '#ff8a3a', '#ffc45a', '#fff0a0')]
CRUST = [hx(c) for c in ('#1e1214', '#33201c', '#4a2e26', '#6a4436')]
ICE = [hx(c) for c in ('#2e5a8a', '#4a7eb4', '#6aa2d4', '#8cc2e8', '#bfe0f2', '#eef8ff')]
SNOW = [hx(c) for c in ('#9ab4cc', '#c4d6e6', '#e4eef6', '#f6fbff')]
N = 64


def _noise(seed, cells):
    """Nhiễu giá trị lặp đúng chu kỳ 64 điểm (lưới cells × cells nội suy cosin)."""
    rnd = np.random.default_rng(seed)
    g = rnd.random((cells, cells))
    s = N / cells
    out = np.zeros((N, N))
    for y in range(N):
        for x in range(N):
            gx, gy = x / s, y / s
            x0, y0 = int(gx) % cells, int(gy) % cells
            x1, y1 = (x0 + 1) % cells, (y0 + 1) % cells
            fx, fy = (1 - math.cos((gx % 1) * math.pi)) / 2, (1 - math.cos((gy % 1) * math.pi)) / 2
            a = g[y0, x0] * (1 - fx) + g[y0, x1] * fx
            b = g[y1, x0] * (1 - fx) + g[y1, x1] * fx
            out[y, x] = a * (1 - fy) + b * fy
    return out


def _slice(big):
    """Tấm 64×64 → 16 khung 16×16, thứ tự hàng: khung = (tx % 4) + (ty % 4) × 4."""
    out = []
    for ty in range(4):
        for tx in range(4):
            c = Canvas(16, 16); c.a = np.ascontiguousarray(big.a[ty * 16:(ty + 1) * 16, tx * 16:(tx + 1) * 16]); out.append(c)
    return out


def lava_frames():
    """Dung nham: vỏ nguội sẫm trôi thành mảng, mép mảng đỏ rực, dòng chảy giữa sáng vàng; hòa dải bằng Bayer."""
    n = _noise(5, 8) * 0.65 + _noise(9, 16) * 0.35
    heat = _noise(21, 4)
    big = Canvas(N, N)
    for y in range(N):
        for x in range(N):
            v, b = n[y, x], BAYER4[y % 4, x % 4] / 16
            if v > 0.62:   # vỏ nguội: đỉnh sáng phía trên trái, chân tối phía dưới phải
                up, dn = n[(y - 1) % N, (x - 1) % N], n[(y + 1) % N, (x + 1) % N]
                col = CRUST[3] if up <= 0.62 else CRUST[0] if dn <= 0.62 else CRUST[1] if (x * 3 + y) % 7 else CRUST[2]
            elif v > 0.58:
                col = LAVA[1]   # mép vỏ đỏ sẫm
            elif v > 0.54:
                col = LAVA[2] if b < 0.5 else LAVA[3]
            else:
                t = (0.54 - v) / 0.54 + (heat[y, x] - 0.5) * 0.6   # càng xa vỏ càng nóng
                k = 3 + t * 3.2 + (b - 0.5) * 0.9
                col = LAVA[max(3, min(6, int(k)))]
            big.px(x, y, col)
    return _slice(big)


def icelake_frames():
    """Hồ băng nứt: mảng băng xanh đậm nhạt (ô Voronoi lặp), vết nứt trắng có bóng dưới, vệt sáng chéo."""
    rnd = random.Random(17)
    pts = [(rnd.uniform(0, N), rnd.uniform(0, N)) for _ in range(6)]
    big = Canvas(N, N)
    for y in range(N):
        for x in range(N):
            ds = sorted((min(abs(x - px_), N - abs(x - px_)) ** 2 + min(abs(y - py_), N - abs(y - py_)) ** 2, i) for i, (px_, py_) in enumerate(pts))
            d1, d2 = math.sqrt(ds[0][0]), math.sqrt(ds[1][0])
            cell = ds[0][1]
            col = ICE[2] if cell % 3 else ICE[1]
            if (x + y * 2 + cell * 5) % 23 < 2:
                col = ICE[3]
            if d2 - d1 < 1.1:
                col = ICE[5] if (x * 7 + y * 3) % 5 == 0 else ICE[4]   # vết nứt, chỗ sáng chỗ mờ
            elif d2 - d1 < 2.1 and (x + y) % 2 == 0:
                col = ICE[1] if col != ICE[1] else ICE[0]
            big.px(x, y, col)
    for k in range(7):   # vệt sáng chéo
        x0, y0 = rnd.randrange(N), rnd.randrange(N)
        for i in range(4 + k % 3):
            big.px((x0 + i) % N, (y0 - i) % N, ICE[4])
    return _slice(big)


VOID = [hx(c) for c in ('#05020c', '#0e0620', '#1e0c3a', '#3a1a6a', '#7a3ac8', '#c08aff', '#f0e0ff')]


def void_frames():
    """Khe hư không: đáy đen sâu, mạch tím phát sáng chảy ngoằn ngoèo (nhiễu dải hẹp), sao lấm tấm."""
    n = _noise(33, 8) * 0.7 + _noise(41, 16) * 0.3
    rnd = random.Random(29)
    big = Canvas(N, N)
    for y in range(N):
        for x in range(N):
            v = abs(n[y, x] - 0.5)   # gần 0.5 là mạch
            b = BAYER4[y % 4, x % 4] / 16
            col = VOID[5] if v < 0.012 else VOID[4] if v < 0.03 else VOID[3] if v < 0.05 + b * 0.02 else VOID[2] if v < 0.09 else VOID[1] if v < 0.18 else VOID[0]
            big.px(x, y, col)
    for _ in range(26):
        big.px(rnd.randrange(N), rnd.randrange(N), VOID[6] if rnd.random() < 0.4 else VOID[5])
    return _slice(big)


def void_rim():
    """Bờ đá tím quanh khe hư không: 4 cạnh rồi 4 góc. Dưới mép là ánh tím hắt lên."""
    return _rim(hx('#2a2236'), hx('#5a4a72'), VOID[3], 21) + _corners(hx('#2a2236'), hx('#5a4a72'))


def wisp_frames():
    """Khói tím bốc lên khỏi khe: 6 khung 5×10, đốm sáng to dần, bay lên, tan; neo ở chân."""
    out = []
    for f in range(6):
        c = Canvas(5, 10)
        y = 8 - f
        if f < 5:
            col = VOID[6] if f < 2 else VOID[5] if f < 4 else VOID[4]
            c.px(2, y, col)
            if 1 <= f <= 3:
                c.px(1, y, VOID[4]); c.px(3, y, VOID[4]); c.px(2, y - 1, VOID[5])
        out.append(c)
    return out


def _rim(fill, lip, shade, seed, depth=(1, 3)):
    """Mép bờ phủ lên một cạnh ô (cạnh trên), 4 hướng xoay: trên, phải, dưới, trái. fill: thân bờ, lip: mép sáng, shade: bóng dưới mép."""
    rnd = random.Random(seed)
    base = Canvas(16, 16)
    for x in range(16):
        d = depth[0] + (rnd.random() < 0.5) + (x % 6 == 3) * (depth[1] - depth[0] - 1)
        for y in range(d):
            base.px(x, y, fill)
        base.px(x, d - 1, lip)
        if shade and (x + seed) % 3:   # bóng / ánh hắt dưới mép, đứt quãng cho khỏi thành khung
            base.px(x, d, shade)
    out = []
    for k in range(4):
        c = Canvas(16, 16); c.a = np.ascontiguousarray(np.rot90(base.a, -k)); out.append(c)
    return out


def _corners(fill, lip):
    """Mẩu bờ tam giác ở góc trên trái, trên phải, dưới phải, dưới trái: dùng cho góc trong (hai cạnh là hồ, ô chéo là bờ)
    và bo tròn góc ngoài (hai cạnh kề đều là bờ)."""
    base = Canvas(16, 16)
    for y in range(4):
        for x in range(4 - y):
            base.px(x, y, fill)
    base.px(3, 0, lip); base.px(2, 1, lip); base.px(1, 2, lip); base.px(0, 3, lip)
    out = []
    for k in range(4):
        c = Canvas(16, 16); c.a = np.ascontiguousarray(np.rot90(base.a, -k)); out.append(c)
    return out


def lava_rim():
    """Bờ đá bazan quanh dung nham: 4 cạnh rồi 4 góc. Dưới mép là vệt lửa hắt sáng."""
    return _rim(CRUST[1], CRUST[3], LAVA[4], 3) + _corners(CRUST[1], CRUST[3])


def snow_rim():
    """Bờ tuyết quanh mặt băng, hồ băng: 4 cạnh rồi 4 góc. Dưới mép là bóng xanh nhạt."""
    return _rim(SNOW[2], SNOW[3], SNOW[0], 8) + _corners(SNOW[2], SNOW[3])


def bubble_frames():
    """Bọt dung nham phồng lên rồi vỡ: 6 khung 7×7, neo giữa đáy."""
    out = []
    for f in range(6):
        c = Canvas(7, 7)
        if f == 0:
            c.px(3, 4, LAVA[5]); c.px(4, 4, LAVA[4])
        elif f in (1, 2):
            r = 1 if f == 1 else 2
            for y in range(-r, r + 1):
                for x in range(-r, r + 1):
                    if x * x + y * y <= r * r + 0.5:
                        c.px(3 + x, 4 + y, LAVA[4] if y > 0 else LAVA[5])
            c.px(3 - r + 1, 4 - r + (r > 1), LAVA[6])
            if f == 2:
                for x in range(1, 6):
                    c.px(x, 6, LAVA[2])
        elif f == 3:   # vỡ: vòng hở
            for x, y in ((1, 3), (1, 5), (5, 3), (5, 5), (2, 6), (4, 6), (3, 2)):
                c.px(x, y, LAVA[5])
        elif f == 4:   # tia bắn
            for x, y in ((0, 1), (6, 1), (3, 0), (1, 4), (5, 4)):
                c.px(x, y, LAVA[4])
        out.append(c)
    return out


# ---------------------------------------------------------------- nhà cháy (B), cùng bố cục khung với tile.house
SOOT = [hx(c) for c in ('#1c1418', '#2e2226', '#433236', '#5a4648', '#74605c')]
ASHW = [hx(c) for c in ('#4e423e', '#6e625a', '#8a7e72', '#a49888')]
EMBER = [hx('#c03a1a'), hx('#ff7a3a'), hx('#ffc45a')]
BEAM = [hx('#140c0a'), hx('#2a1a14'), hx('#40281c')]


def burnt_roof(kind, pos, seed):
    c = Canvas(16, 16)
    top, bot = kind in ('top', 'one'), kind in ('bot', 'one')
    rnd = random.Random(seed)
    for y in range(16):
        for x in range(16):
            k = x % 4
            col = SOOT[1] if k == 0 else SOOT[3] if k == 1 else SOOT[2]
            if (y + (0 if top else 2)) % 5 == 4:
                col = SOOT[1] if k else SOOT[0]
            c.px(x, y, col)
    if seed % 3 != 1:   # lỗ thủng mái lộ xà cháy, than hồng
        hx0, hy0 = rnd.randrange(3, 10), rnd.randrange(4 if top else 2, 9)
        for y in range(hy0, hy0 + 4):
            for x in range(hx0 - (y - hy0 > 1), hx0 + 5 - (y == hy0)):
                c.px(x, y, BEAM[0])
        for x in range(hx0 - 1, hx0 + 6):
            c.px(x, hy0 + 2, BEAM[2])   # xà ngang
        c.px(hx0 + 1, hy0 + 3, EMBER[1]); c.px(hx0 + 3, hy0 + 1, EMBER[0])
    for _ in range(3):   # ngói vỡ sáng tro
        c.px(rnd.randrange(16), rnd.randrange(3, 13), SOOT[4])
    if top:
        for x in range(16):
            c.px(x, 0, SOOT[0]); c.px(x, 1, SOOT[0]); c.px(x, 2, SOOT[3] if x % 3 else SOOT[2])
        for x in range(rnd.randrange(4, 10), 16 if pos == 'R' else 13):   # bờ nóc gãy một khúc
            if x % 5 < 2:
                c.px(x, 0, (0, 0, 0, 0))
        if pos != 'M':
            ex = 0 if pos == 'L' else 15
            d = 1 if pos == 'L' else -1
            for k in range(3):
                c.a[0:3, ex + d * k] = 0
    if bot:
        for x in range(16):
            c.px(x, 13, SOOT[4] if x % 4 else SOOT[3]); c.px(x, 14, SOOT[0]); c.px(x, 15, (0, 0, 0, 0))
        for x in range(2 + seed % 5, 16, 6):   # diềm mái sứt
            c.px(x, 14, (0, 0, 0, 0)); c.px(x, 13, SOOT[1])
    if pos != 'M':
        ex = 0 if pos == 'L' else 15
        for y in range(3 if top else 0, 14 if bot else 16):
            c.px(ex, y, SOOT[0])
    return c


def burnt_wall(kind):
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            col = ASHW[2] if y > 1 else ASHW[0]
            if y < 7 and (x * 5 + y * 3) % 9 < (7 - y) // 2:   # muội khói ám từ trên xuống
                col = ASHW[1]
            c.px(x, y, col)
    for x in range(16):
        c.px(x, 2, ASHW[0]); c.px(x, 14, ASHW[1]); c.px(x, 15, BEAM[1])
    for x, y in ((5, 6), (6, 7), (6, 8), (7, 9), (11, 4), (11, 5), (12, 6)):   # vết nứt
        c.px(x, y, ASHW[0])
    if kind in ('L', 'R'):
        ex = 0 if kind == 'L' else 13
        for y in range(1, 16):
            c.px(ex, y, BEAM[0]); c.px(ex + 1, y, BEAM[2] if y % 4 else EMBER[0]); c.px(ex + 2, y, BEAM[1])
    if kind == 'door':   # cửa cháy đổ một cánh, trong tối
        for y in range(4, 16):
            for x in range(3, 13):
                c.px(x, y, BEAM[0] if x < 8 else BEAM[2] if x not in (8, 12) else BEAM[1])
        c.px(5, 13, EMBER[1]); c.px(6, 14, EMBER[0]); c.px(4, 14, EMBER[2])
        for x in range(3, 13):
            c.px(x, 4, BEAM[1])
        for x in range(8, 13):
            c.px(x, 9 + (x - 8) // 2, BEAM[0])   # cánh cửa nghiêng
    if kind == 'win':   # cửa sổ vỡ, ánh than hồng bên trong
        for y in range(5, 11):
            for x in range(4, 12):
                c.px(x, y, BEAM[0] if x in (4, 11) or y in (5, 10) else EMBER[0] if y > 8 else BEAM[1])
        c.px(6, 9, EMBER[1]); c.px(9, 9, EMBER[2]); c.px(7, 6, BEAM[2]); c.px(8, 7, BEAM[2])
        for x in range(4, 12):
            c.px(x, 4, SOOT[0] if x % 2 else ASHW[1])   # muội bốc lên từ cửa sổ
    return c


def burnt_house_frames():
    """Cùng thứ tự với world.house_frames(): mái nóc/giữa/mép/thấp × trái/giữa/phải, rồi tường trái, giữa, phải, cửa, cửa sổ."""
    f = [burnt_roof(k, p, i * 3 + j) for i, k in enumerate(('top', 'mid', 'bot', 'one')) for j, p in enumerate('LMR')]
    return f + [burnt_wall(k) for k in ('L', 'M', 'R', 'door', 'win')]
