"""Núi (^) và nước (=) trên tinh cầu bằng pixel (thay hình khối trong src/world/draw-terrain.js).
- Nước: tấm 64×64 lặp liền cắt 16 ô như dung nham (khung theo vị trí ô), sóng lăn tăn, bọt trắng ven bờ, đốm lấp lánh chạy theo thời gian.
- Núi: màu đá theo màu đất của từng tinh cầu (map.def.ground, không có thì đá xám nâu), đỉnh nhọn phủ tuyết vượt lên trên ô
  và sườn đá có gờ cho các ô núi bên dưới."""
import math, random
from px import Canvas, hx, BAYER4
from terrain import _noise, _slice, _rim, _corners, N
from ground import tones

WATER = [hx(c) for c in ('#1e4a8a', '#2a5ea8', '#3a72b8', '#4a8ad0', '#7ab4e8', '#d8f0ff')]
SNOW = [hx('#9aaac4'), hx('#d4dcea'), hx('#f4f6fa')]
DEFAULT_ROCK = '#8a8070'


def water_frames():
    """Nước: nền xanh, dải sóng cong sáng (nhiễu kéo ngang), vài vệt trắng đỉnh sóng."""
    n = _noise(51, 8) * 0.6 + _noise(57, 16) * 0.4
    big = Canvas(N, N)
    for y in range(N):
        for x in range(N):
            v = (y / 6 + n[y, x] * 3.2) % 1   # sóng chạy ngang, uốn theo nhiễu
            b = BAYER4[y % 4, x % 4] / 16
            col = WATER[4] if v < 0.07 else WATER[3] if v < 0.2 + b * 0.06 else WATER[2] if v < 0.62 else WATER[1]
            if v < 0.03 and (x * 7 + y) % 5 == 0:
                col = WATER[5]
            big.px(x, y, col)
    return _slice(big)


def water_rim():
    """Bọt ven bờ: dải bọt trắng xanh đứt quãng, dưới là nước sẫm (bờ nào cũng hợp vì không vẽ màu đất)."""
    return _rim(WATER[4], WATER[5], WATER[1], 13, depth=(1, 2)) + _corners(WATER[4], WATER[5])


def glint_frames():
    """Đốm lấp lánh trên mặt nước: 6 khung 5×3, chớp lên, dài ra, tắt."""
    out = []
    for f in range(6):
        c = Canvas(5, 3)
        if f in (1, 4):
            c.px(2, 1, WATER[5])
        elif f in (2, 3):
            for x in range(1 + (f == 3), 4):
                c.px(x, 1, WATER[5])
            c.px(2, 0, WATER[4]); c.px(2, 2, WATER[4])
        out.append(c)
    return out


def _rock(ground):
    """5 tông đá từ màu đất: tối hơn đất (như hình khối cũ ×0,62), bóng ngả lạnh, sáng ngả ấm."""
    r, g, b, _ = hx(ground or DEFAULT_ROCK)
    k = 0.62 if ground else 1.0
    return tones('#%02x%02x%02x' % (int(r * k), int(g * k), int(b * k)))


def peak(ground, seed):
    """Đỉnh núi 24×30: sườn trái sáng, sườn phải khuất, gờ đá xiên, chóp tuyết lởm chởm; chân rộng phủ kín ô."""
    R = _rock(ground)
    rnd = random.Random(seed * 5 + 1)
    c = Canvas(24, 30)
    top = 2 + seed * 3   # đỉnh cao thấp khác nhau
    cx = 11 + (seed - 1)
    for y in range(top, 30):
        t = (y - top) / (29 - top)
        half = 1 + t * 11.5
        for x in range(int(cx - half), int(cx + half) + 1):
            if not 0 <= x < 24:
                continue
            left = x <= cx
            col = R[3] if left and x > cx - half * 0.55 else R[2] if left else R[1] if x < cx + half * 0.6 else R[0]
            if (y + x // 3 + seed) % 6 == 0 and 0.15 < t:   # gờ đá xiên
                col = R[1] if left else R[0]
            if left and (x + y) % 9 == 0 and t > 0.3:
                col = R[4]
            c.px(x, y, col)
    snow_to = top + 6 + seed % 2
    for y in range(top, snow_to + 1):
        for x in range(24):
            if c.filled(x, y) and (y < snow_to - 1 or (x + seed) % 3):
                c.px(x, y, SNOW[2] if x <= cx else SNOW[1] if y < snow_to - 2 else SNOW[0])
    for _ in range(3):   # tuyết lấm tấm dưới chóp
        x, y = rnd.randrange(int(cx) - 4, int(cx) + 5), rnd.randrange(snow_to + 1, snow_to + 5)
        if c.filled(x, y):
            c.px(x, y, SNOW[1])
    return c.outline(hx('#1b1830'))


def slope(ground, seed):
    """Sườn đá 16×16 cho ô núi có núi phía trên: khối đá, gờ ngang sáng trên tối dưới, khe nứt."""
    R = _rock(ground)
    rnd = random.Random(seed * 11 + 4)
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            ledge = (y + (x // 5 + seed) % 3) % 6
            col = R[3] if ledge == 0 else R[0] if ledge == 5 else R[2] if (x * 3 + y + seed) % 7 else R[1]
            c.px(x, y, col)
    for _ in range(2):   # khe nứt dọc
        x, y = rnd.randrange(2, 14), rnd.randrange(1, 9)
        for k in range(4):
            c.px(x + (k == 2), y + k, R[0])
    return c


def grounds(maps):
    """Màu đất các bản đồ có núi (None = đảo cỏ, đá xám nâu). Tên hình: prop.peak-<mã màu>, tile.slope-<mã màu>."""
    out = []
    for m in maps:
        if any('^' in row for row in m.get('grid', [])):
            g = m.get('ground')
            if g not in out:
                out.append(g)
    return out


def key(ground):
    return (ground or DEFAULT_ROCK).lstrip('#')
