"""Linh thú và thú cưỡi bằng pixel. Linh thú: dáng của quái cùng tên (data/mobs.json look) vẽ nhỏ theo màu linh thú.
Thú cưỡi: thân sói cỡ lớn (mobs.wolf) thêm đặc điểm theo "look" trong data/pets.json mounts:
deer (gạc hươu), wolf (bờm nhọn), qilin (sừng, đuôi lửa), lynx (tai chỏm lông). Nhìn phải, 2 khung bước."""
from px import Canvas, hx
from mobs import LOOKS, tones, wolf, tri, rect


def pet_frames(pet, mob):
    P, ink = tones(pet['color'])
    look = mob.get('look', 'slime')
    out, anchor = [], None
    for f in range(2):
        if look in LOOKS:
            c, anchor = LOOKS[look](P, 4, f)
        else:
            from mobs_extra import EXTRA
            c, anchor = EXTRA[look](P, 4, f, mob)
        out.append(c.outline(ink))
    return out, anchor


def mount_frames(m):
    P, ink = tones(m['color'])
    acc = tones(m['accent'])[0]
    s, out, anchor = 9, [], None
    for f in range(2):
        c, anchor = wolf(P, s, f)
        big = Canvas(c.w + 2, c.h + 8)   # chừa chỗ cho gạc, sừng
        big.paste(c, 0, 8)
        hx_, hy = c.w / 2 + s * 1.1, 8 + c.h - 3 - s * 0.95 - s * 0.55   # tâm đầu (giống mobs.wolf)
        look = m.get('look', 'wolf')
        if look == 'deer':   # gạc hai nhánh
            for d in (-2, 2):
                x = hx_ + d * 0.6
                rect(big, x, hy - s - 6, x, hy - s + 1, acc[2])
                big.px(x - 1, hy - s - 3, acc[2]); big.px(x + 1, hy - s - 5, acc[3]); big.px(x - 2, hy - s - 6, acc[3])
        elif look == 'qilin':   # sừng vàng, vảy lửa dọc lưng, đuôi lửa
            tri(big, hx_ - 1, hy - s + 1, hx_ + 1, hy - s + 1, hx_ + 2, hy - s - 5, acc[3])
            for i in range(4):
                big.px(c.w / 2 - s * 0.8 + i * s * 0.45, 8 + c.h - 3 - s * 0.95 - s * 0.7 - (i + f) % 2, acc[2])
            for i in range(3):
                big.px(c.w / 2 - s * 1.4 - 4 - i, 8 + c.h - 3 - s * 0.95 - 4 - i - f, acc[3 - i % 2])
        elif look == 'lynx':   # chỏm lông đầu tai
            big.px(hx_ - s * 0.4, hy - s - 2, acc[1]); big.px(hx_ + s * 0.05, hy - s - 2, acc[1])
            big.px(hx_ - s * 0.4, hy - s - 3, acc[2]); big.px(hx_ + s * 0.05, hy - s - 3, acc[2])
        else:   # sói: bờm nhọn màu nhấn
            for i in range(4):
                big.px(c.w / 2 - s * 0.9 + i * s * 0.5, 8 + c.h - 3 - s * 0.95 - s * 0.62 - 1, acc[2])
        for x in range(int(c.w / 2 - s * 0.5), int(c.w / 2 + s * 0.4)):   # yên cưỡi
            big.px(x, 8 + c.h - 3 - s * 0.95 - s * 0.62, acc[1])
            big.px(x, 8 + c.h - 3 - s * 0.95 - s * 0.62 + 1, acc[0])
        out.append(big.outline(ink))
    return out, (anchor[0], anchor[1] + 8)
