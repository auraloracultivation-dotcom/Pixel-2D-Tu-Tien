"""Nhà các tinh cầu theo hệ, cùng bố cục khung với nhà mái ngói (world.house_frames): mái nóc/giữa/mép/thấp × trái/giữa/phải,
rồi tường trái, giữa, phải, cửa, cửa sổ. Game ghép theo khối ô cùng loại (src/world/draw-ground.js housePiece).
- forge (ô N, Thiên Kim Tinh): mái đá phiến xám xanh, tường đá khối, cửa gỗ đai sắt, cửa sổ ánh lò rèn, ống khói ở chái phải.
- adobe (ô z, Hậu Thổ Tinh): mái rơm vàng, tường đất nện, cửa vòm tối, cửa sổ tròn.
- tree (ô W, Thanh Mộc Tinh, Làng Tinh Linh): mái lá xanh, vách ván gỗ, cửa tròn, cửa sổ đèn vàng."""
import random
from px import Canvas, hx

KITS = {
    'forge': dict(roof=('#2a2e3a', '#3e4454', '#545c70', '#6e7890', '#94a0b8'), wall=('#5a5652', '#7a7470', '#9a948c', '#b8b2a8'),
                  wood=('#2a1c14', '#4a3222', '#6a4a30'), metal='#9aa4b4', glow=('#c04a1a', '#ff8a3a', '#ffd27a')),
    'adobe': dict(roof=('#6a4a1e', '#9a7a32', '#c49e48', '#e0c068', '#f6e09a'), wall=('#7a5232', '#a07048', '#c08a5a', '#d8a878'),
                  wood=('#2e1c10', '#4e3220', '#6e4a2e'), metal='#c89a5a', glow=('#3a2412', '#3a2412', '#5a3a22')),
    'tree': dict(roof=('#1a4a2a', '#2a6a3a', '#3e8a48', '#5aa858', '#8ccc72'), wall=('#4a321e', '#6a4a2c', '#8a663e', '#a8845a'),
                 wood=('#2a1a10', '#40281a', '#5e3e26'), metal='#c8a060', glow=('#c08a2a', '#ffd27a', '#fff2c0')),
}
CLEAR = (0, 0, 0, 0)


def _roof_base(style, R, top, x, y):
    if style == 'forge':   # đá phiến vảy cá: hàng lệch nhau, mép dưới mỗi viên tối
        row = (y + (0 if top else 1)) // 3
        lx = (x + (2 if row % 2 else 0)) % 4
        ly = (y + (0 if top else 1)) % 3
        return R[0] if ly == 2 else R[1] if lx == 3 else R[3] if ly == 0 and lx < 2 else R[2]
    if style == 'adobe':   # rơm: sợi dọc lệch, cứ 4 hàng một bó buộc
        k = (x * 3 + y) % 5
        col = R[2] if k < 2 else R[3] if k < 4 else R[1]
        return R[1] if (y + (0 if top else 2)) % 4 == 3 and x % 2 else col
    k = (x + (y // 3) * 2) % 5   # lá: vảy lá chồng, đầu lá sáng
    ly = y % 3
    return R[4] if ly == 0 and k == 1 else R[3] if ly == 0 else R[1] if ly == 2 and k > 2 else R[2]


def roof(style, kind, pos):
    K = KITS[style]
    R = [hx(c) for c in K['roof']]
    c = Canvas(16, 16)
    top, bot = kind in ('top', 'one'), kind in ('bot', 'one')
    for y in range(16):
        for x in range(16):
            c.px(x, y, _roof_base(style, R, top, x, y))
    if top:
        for x in range(16):
            c.px(x, 0, R[0]); c.px(x, 1, R[1] if style != 'forge' else R[0]); c.px(x, 2, R[4] if x % 3 else R[3])
        if style == 'adobe':   # nóc rơm tròn, không đầu đao
            for x in (0, 15):
                if (pos == 'L' and x == 0) or (pos == 'R' and x == 15):
                    c.px(x, 0, CLEAR); c.px(x, 1, R[0])
        elif style == 'tree':   # lá rủ lởm chởm trên nóc
            for x in range(0, 16, 3):
                c.px(x, 0, CLEAR)
        elif pos != 'M':
            ex, d = (0, 1) if pos == 'L' else (15, -1)
            for k in range(2):
                c.a[0:2, ex + d * k] = 0
        if style == 'forge' and pos == 'R':   # ống khói đá
            for y in range(0, 7):
                for x in range(9, 13):
                    c.px(x, y, hx('#4a4642') if x in (9, 12) or y == 0 else hx('#6e6862'))
            c.px(10, 0, hx('#1e1a18')); c.px(11, 0, hx('#1e1a18'))
    if bot:
        edge = R[4] if style != 'tree' else R[3]
        for x in range(16):
            c.px(x, 13, edge); c.px(x, 14, R[0]); c.px(x, 15, CLEAR)
        if style == 'adobe':   # rơm rủ so le dưới mép
            for x in range(1, 16, 3):
                c.px(x, 15, R[1])
        if style == 'tree':
            for x in range(0, 16, 4):
                c.px(x, 15, R[1]); c.px(x + 1, 15, R[2])
    if pos != 'M':
        ex = 0 if pos == 'L' else 15
        for y in range(3 if top else 0, 14 if bot else 16):
            c.px(ex, y, R[0])
    return c


def _wall_base(style, Wl, x, y):
    if style == 'forge':   # đá khối 8×4 lệch hàng
        row = y // 4
        lx, ly = (x + (4 if row % 2 else 0)) % 8, y % 4
        return Wl[0] if ly == 3 or lx == 7 else Wl[3] if ly == 0 and lx < 5 else Wl[2] if (row + x // 8) % 3 else Wl[1]
    if style == 'adobe':   # đất nện, vệt rơm lẫn
        return Wl[3] if (x * 7 + y * 3) % 17 == 0 else Wl[1] if (x * 5 + y * 11) % 13 == 0 else Wl[2]
    lx = x % 4   # ván gỗ dọc
    return Wl[0] if lx == 3 else Wl[3] if lx == 0 and y % 6 else Wl[2] if (x // 4) % 2 else Wl[1]


def wall(style, kind):
    K = KITS[style]
    Wl, Wd, G = [hx(c) for c in K['wall']], [hx(c) for c in K['wood']], [hx(c) for c in K['glow']]
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            c.px(x, y, _wall_base(style, Wl, x, y) if y > 1 else Wl[0])
    for x in range(16):
        c.px(x, 2, Wl[1] if style != 'tree' else Wl[0]); c.px(x, 15, Wd[1])
    if kind in ('L', 'R'):
        ex = 0 if kind == 'L' else 13
        for y in range(1, 16):
            if style == 'forge':
                c.px(ex, y, Wl[0]); c.px(ex + 1, y, Wl[3]); c.px(ex + 2, y, Wl[1])   # trụ đá góc
            else:
                c.px(ex, y, Wd[0]); c.px(ex + 1, y, Wd[2]); c.px(ex + 2, y, Wd[1])
    if kind == 'door':
        if style == 'adobe':   # cửa vòm tối, ngưỡng gỗ
            for y in range(5, 16):
                for x in range(4, 12):
                    if y > 6 or 5 < x < 10 or (y == 6 and 4 < x < 11):
                        c.px(x, y, G[0] if x not in (4, 11) else Wd[1])
            for x in range(6, 10):
                c.px(x, 4, Wl[0])
            c.px(5, 5, Wl[0]); c.px(10, 5, Wl[0])
        elif style == 'tree':   # cửa tròn ván gỗ, khoen vàng
            for y in range(5, 16):
                for x in range(4, 12):
                    if not (y == 5 and x in (4, 11)):
                        c.px(x, y, Wd[0] if x in (4, 11) or y == 5 else Wd[2] if x % 2 else Wd[1])
            c.px(9, 11, G[1])
        else:   # gỗ đai sắt
            for y in range(4, 16):
                for x in range(3, 13):
                    c.px(x, y, Wd[1] if x not in (3, 12) else Wd[0])
                c.px(8, y, Wd[0])
            for y in (6, 11):
                for x in range(3, 13):
                    c.px(x, y, hx(K['metal']))
            c.px(6, 9, hx('#f2c94c')); c.px(9, 9, hx('#f2c94c'))
    if kind == 'win':
        if style == 'adobe':   # cửa sổ tròn nhỏ
            for y in range(5, 11):
                for x in range(5, 11):
                    d = (x - 7.5) ** 2 + (y - 7.5) ** 2
                    if d < 9:
                        c.px(x, y, Wd[0] if d > 5 else hx('#f6d898') if (x + y) % 3 else Wd[1])
        else:
            lit = G[1] if style == 'forge' else G[2]
            for y in range(5, 11):
                for x in range(4, 12):
                    frame = x in (4, 11) or y in (5, 10)
                    c.px(x, y, Wd[0] if frame else (G[0] if y > 8 and style == 'forge' else lit) if (x not in (7, 8)) else Wd[1])
            for x in range(4, 12):
                c.px(x, 11, Wl[0])
    return c


def frames(style):
    f = [roof(style, k, p) for k in ('top', 'mid', 'bot', 'one') for p in 'LMR']
    return f + [wall(style, k) for k in ('L', 'M', 'R', 'door', 'win')]
