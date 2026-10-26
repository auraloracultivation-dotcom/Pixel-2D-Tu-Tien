"""Nhân vật chibi tu tiên ghép lớp, vẽ bằng code (Claude thiết kế, không lấy hình ngoài).
Lớp: thân (đầu + mặt + áo + chân) → tóc → phụ kiện. Đổi lớp / bảng màu = nhân vật mới; động tác làm bằng khung + code.
Ô 22×26, nhìn sang PHẢI (trái = lật trong game). Viền 1 px tím đậm, bóng 3 tông: sáng trên-trái, tối dưới-phải."""
from px import Canvas, hx

W, H = 22, 26
INK = hx('#1b1830')
SKIN = dict(b=hx('#fbe3d2'), d=hx('#eab8a6'), m=hx('#e8788c'), e=INK)


def _head_shape(x, y):
    """Đầu tròn to: 16 rộng × 12 cao, bo góc 2 px (x 3..18, y 3..14)."""
    if not (3 <= x <= 18 and 3 <= y <= 14):
        return False
    cut = {3: 3, 4: 1, 14: 1}.get(y, 0)
    return 3 + cut <= x <= 18 - cut


def _face(x, y):
    return 6 <= x <= 16 and 9 <= y <= 14


def draw(spec, frame=0):
    """spec: {hair:{style, pal[3]}, robe:[sáng, gốc, tối, viền áo], acc:[...]}. frame: 0 đứng · 1 nhún · 2 bước A · 3 bước B."""
    c = Canvas(W, H)
    bob = 1 if frame == 1 else 0
    hl, hb, hd = spec['hair']['pal']
    rl, rb, rd, rt = spec['robe']
    style = spec['hair']['style']

    # áo: thân 10 rộng y 15..20, tay áo xoè 1 px hai bên y 16..19
    for y in range(15, 21):
        for x in range(5, 17):
            side = (x in (5, 16))
            if side and not (16 <= y <= 20):
                continue
            col = rl if x <= 7 and y <= 17 else rd if x >= 14 or y == 20 else rb
            if x in (10, 11) and y >= 15:
                col = rt  # vạt áo giữa
            c.px(x, y + bob, col)
    for x in range(8, 14):  # đai lưng
        c.px(x, 18 + bob, spec.get('belt', rt))

    # đầu (tóc phủ toàn bộ rồi khoét mặt)
    for y in range(3, 15):
        for x in range(3, 19):
            if _head_shape(x, y):
                col = hl if (x + y <= 11 and y <= 8) or (y == 4 and x <= 11) else hd if x >= 17 or (x >= 15 and y >= 11) else hb
                c.px(x, y + bob, col)
    for y in range(9, 15):
        for x in range(6, 17):
            if _face(x, y):
                c.px(x, y + bob, SKIN['d'] if y == 14 or x == 16 else SKIN['b'])
    for y in range(9, 13):  # tóc mai hai bên ôm mặt
        c.px(6, y + bob, hb if y < 12 else hd); c.px(16, y + bob, hd)
    c.px(7, 9 + bob, hb)
    for x in (8, 9, 12):  # tóc mái lởm chởm che trán
        c.px(x, 9 + bob, hb)
    c.px(9, 10 + bob, hd)
    for ex in (10, 14):  # mắt 1×2 đặc, lệch phải vì nhìn sang phải
        c.px(ex, 11 + bob, SKIN['e']); c.px(ex, 12 + bob, SKIN['e'])
    c.px(12, 13 + bob, SKIN['m'])
    c.px(8, 13 + bob, SKIN['d']); c.px(16, 13 + bob, SKIN['d'])  # má

    # kiểu tóc
    if style == 'bun':  # búi tóc + trâm
        for y in range(0, 3):
            for x in range(8, 13):
                if (y, x) not in ((0, 8), (0, 12)):
                    c.px(x, y + bob, hl if x <= 9 else hb)
        c.px(13, 1 + bob, spec.get('pin', hx('#6fe0c0'))); c.px(14, 0 + bob, spec.get('pin', hx('#6fe0c0')))
    elif style == 'long':  # tóc dài rủ hai bên tới ngang áo
        for y in range(9, 20):
            for x in (2, 3, 4, 17, 18):
                if y >= 15 and x in (4, 17):
                    continue
                c.px(x, y + bob, hl if x <= 3 else hd)
    elif style == 'spiky':  # tóc ngắn dựng
        for x, y in ((5, 2), (6, 1), (9, 2), (10, 1), (13, 2), (14, 1), (16, 2)):
            c.px(x, y + bob, hb); c.px(x, y + 1 + bob, hb)

    for a in spec.get('acc', []):
        if a == 'fox-ears':
            for x, y in ((4, 2), (4, 1), (5, 2), (4, 0), (17, 2), (17, 1), (16, 2), (17, 0)):
                c.px(x, y + bob, hl)
            c.px(4, 2 + bob, hx('#ff9ac0')); c.px(17, 2 + bob, hx('#ff9ac0'))
        elif a == 'horns':
            for x, y in ((5, 2), (5, 1), (4, 0), (16, 2), (16, 1), (17, 0)):
                c.px(x, y + bob, hx('#e8453c'))
        elif a == 'mark':  # ấn trán
            c.px(11, 10 + bob, hx('#e8453c'))

    # chân: 2 khối 2 px dưới vạt áo; bước A nhấc chân trước, bước B nhấc chân sau
    lift = {0: (0, 0), 1: (0, 0), 2: (0, 1), 3: (1, 0)}[frame]
    for fx, up in zip((7, 12), lift):
        for dy in range(2 - up):
            c.px(fx, 21 + dy, rd); c.px(fx + 1, 21 + dy, rd)
    c.outline(INK)
    return c


CHARS = {
    'hero.kiem-tu': dict(name='Kiếm Tu', hair=dict(style='bun', pal=[hx('#5a4a86'), hx('#3a2e5c'), hx('#251c3e')]),
                         robe=[hx('#ffffff'), hx('#e6ebf7'), hx('#b4bedb'), hx('#4a86e8')], belt=hx('#f2c94c')),
    'npc.linh-ho': dict(name='Linh Hồ', hair=dict(style='long', pal=[hx('#ffffff'), hx('#ece6f6'), hx('#bfb3d6')]),
                        robe=[hx('#ffc2d6'), hx('#ff9ac0'), hx('#d9668f'), hx('#ffffff')], acc=['fox-ears', 'mark']),
    'npc.bang-co': dict(name='Băng Cơ', hair=dict(style='long', pal=[hx('#c8f0ff'), hx('#7cc8f2'), hx('#3f86c8')]),
                        robe=[hx('#eaf6ff'), hx('#c4e2fa'), hx('#8ab4e0'), hx('#3f86c8')]),
    'npc.hoa-dong': dict(name='Hỏa Đồng', hair=dict(style='spiky', pal=[hx('#ff8a5a'), hx('#e0482e'), hx('#9a2a20')]),
                         robe=[hx('#ffcf7a'), hx('#ffa23a'), hx('#d4701e'), hx('#e0482e')]),
    'npc.ma-tu': dict(name='Ma Tu', hair=dict(style='long', pal=[hx('#6a4a9a'), hx('#3e2a66'), hx('#22163e')]),
                      robe=[hx('#4a3a66'), hx('#2e2444'), hx('#1c1630'), hx('#e8453c')], acc=['horns']),
}
