"""Nền pixel cho các đảo theo hệ và hang động: lấy màu ô trong data/tiles.json làm tông giữa, tự pha 5 tông
(tối ngả lạnh, sáng ngả ấm) rồi vẽ theo kiểu "tex" của ô: hạt (cát, tuyết, đất), phiến (đá lát, đá đen), băng, rêu, sàn gỗ.
Mỗi ô 4 biến thể 16×16 ghép liền."""
import random
from px import Canvas, hx


def tones(col):
    """5 tông từ tối tới sáng, bóng ngả tím lạnh, sáng ngả vàng ấm."""
    r, g, b, _ = hx(col)
    out = []
    for k, warm in ((0.62, -14), (0.8, -7), (1.0, 0), (1.12, 8), (1.24, 14)):
        out.append((max(0, min(255, int(r * k + warm))), max(0, min(255, int(g * k + warm * 0.4))),
                    max(0, min(255, int(b * k - warm * 0.6 + (10 if warm < 0 else 0)))), 255))
    return out


def _w(c, x, y, col):
    c.px(x % 16, y % 16, col)


def speckle(P, seed):
    """Hạt: đốm sẫm sáng rải đều, vài cụm sỏi nhỏ (viền dưới tối, đỉnh sáng)."""
    rnd = random.Random(seed * 13 + 5)
    c = Canvas(16, 16); c.a[:, :] = P[2]
    for _ in range(5):
        x, y = rnd.randrange(16), rnd.randrange(16)
        _w(c, x, y, P[1]); _w(c, x + 1, y, P[1] if rnd.random() < 0.3 else P[2])
    for _ in range(4):
        _w(c, rnd.randrange(16), rnd.randrange(16), P[3])
    for _ in range(1 + seed % 2):
        x, y = rnd.randrange(2, 14), rnd.randrange(2, 13)
        c.px(x, y, P[3]); c.px(x + 1, y, P[4]); c.px(x, y + 1, P[0]); c.px(x + 1, y + 1, P[1])
    return c


def slab(P, seed):
    """Phiến đá 8×8 lệch hàng: mạch tối, cạnh trên sáng, phiến đậm nhạt xen nhau, có khi nứt."""
    rnd = random.Random(seed * 7 + 2)
    c = Canvas(16, 16)
    for row in (0, 8):
        off = 0 if row == 0 else 4
        for sx in range(-8, 16, 8):
            base = P[rnd.choice((1, 2, 2, 3))]
            for y in range(row, row + 8):
                for x in range(sx + off, sx + off + 8):
                    if not 0 <= x < 16:
                        continue
                    lx, ly = x - sx - off, y - row
                    c.px(x, y, P[0] if lx == 7 or ly == 7 else P[4] if ly == 0 and lx < 6 else P[1] if ly == 6 else base)
    if seed % 4 == 1:
        x, y = rnd.randrange(2, 10), rnd.randrange(2, 5)
        for k in range(4):
            c.px(x + k, y + (k > 1), P[0])
    return c


def ice(P, seed):
    """Mặt băng: nền trong, vệt sáng chéo, vết nứt mảnh."""
    rnd = random.Random(seed + 31)
    c = Canvas(16, 16); c.a[:, :] = P[2]
    for k in range(3):
        x0 = rnd.randrange(16)
        for i in range(4 + k):
            _w(c, x0 + i, 12 - i - k * 4, P[4] if i % 2 == 0 else P[3])
    x, y = rnd.randrange(16), rnd.randrange(16)
    for i in range(5):
        _w(c, x + i, y + (i // 2), P[1])
    return c


def moss(P, seed):
    """Rêu: túm lá chữ v như cỏ đảo chính, đậm hơn, vài đốm sáng."""
    rnd = random.Random(seed + 77)
    c = Canvas(16, 16); c.a[:, :] = P[2]
    for _ in range(7):
        x, y = rnd.randrange(16), rnd.randrange(16)
        _w(c, x, y, P[1]); _w(c, x - 1, y - 1, P[1]); _w(c, x + 1, y - 1, P[1]); _w(c, x, y - 1, P[3])
    for _ in range(4):
        _w(c, rnd.randrange(16), rnd.randrange(16), P[4] if rnd.random() < 0.3 else P[0])
    return c


def plank(P, seed):
    """Sàn gỗ: ván ngang 4 px, khe tối, vân gỗ và đinh."""
    rnd = random.Random(seed + 3)
    c = Canvas(16, 16)
    for row in range(4):
        cut = (rnd.randrange(4, 12) + seed * 3) % 16
        for x in range(16):
            for ly in range(4):
                y = row * 4 + ly
                c.px(x, y, P[0] if ly == 3 or x == cut else P[3] if ly == 0 else P[2])
        for _ in range(2):
            x = rnd.randrange(16)
            c.px(x, row * 4 + 1, P[1]); c.px((x + 1) % 16, row * 4 + 1, P[1])
    return c


STYLES = {'speckle': speckle, 'slab': slab, 'ice': ice, 'moss': moss, 'plank': plank}


def ground_frames(color, tex):
    P = tones(color)
    return [STYLES[tex](P, s) for s in range(4)]
