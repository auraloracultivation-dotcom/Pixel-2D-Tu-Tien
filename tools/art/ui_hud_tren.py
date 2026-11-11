"""Hình cho khung trên màn chơi, vẽ bằng code (chủ dự án 11/11/2026 11:25: đưa nút TikTok ra màn hình cạnh nút Thư).
- ui-hud-kenh: nút kênh video (TikTok): điện thoại dựng đứng, màn hình tím có nút phát vàng ở giữa và trái tim nhỏ góc dưới.
  Không vẽ lại logo của hãng nào; chữ "TikTok" là nhãn dưới nút (data/menu.json → hud.tron.lb).
Gọi từ build.py và ui_kit_only.py: ui_hud_tren.build(save)."""
from px import Canvas, hx

INK = hx('#140f24')
GOLD = [hx('#9a5a10'), hx('#e8a22a'), hx('#ffd766'), hx('#fff4c6')]
BODY = [hx('#2a2448'), hx('#3c3466'), hx('#544a8a')]
SCREEN = [hx('#3a1f78'), hx('#5a34b0'), hx('#7d58e0')]
HEART = [hx('#9a1424'), hx('#e3343e'), hx('#ff9a9a')]


def _phone():
    W, H = 30, 38
    c = Canvas(W, H)
    x0, y0, x1, y1 = 5, 2, 24, 35   # thân máy, góc bo 3 điểm ảnh
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            cut = min(x - x0, x1 - x, y - y0, y1 - y)
            if cut < 3 and (min(x - x0, x1 - x) + min(y - y0, y1 - y)) < 3:
                continue   # bo góc
            ring = min(x - x0, x1 - x, y - y0, y1 - y)
            c.px(x, y, GOLD[1] if ring == 0 else GOLD[2] if ring == 1 else BODY[1])
    for x in range(x0 + 2, x1 - 1):   # sáng mép trên, tối mép dưới cho có khối
        c.px(x, y0 + 1, GOLD[3])
        c.px(x, y1 - 1, GOLD[0])
    sx0, sy0, sx1, sy1 = 8, 7, 21, 29   # màn hình: tím, sáng dần lên trên
    for y in range(sy0, sy1 + 1):
        t = (y - sy0) / (sy1 - sy0)
        for x in range(sx0, sx1 + 1):
            c.px(x, y, SCREEN[2] if t < 0.25 else SCREEN[1] if t < 0.7 else SCREEN[0])
    for x in range(sx0, sx1 + 1):
        c.px(x, sy0 - 1, INK)
    for x in range(12, 18):   # loa trên, nút dưới
        c.px(x, 4, BODY[0])
    for x in range(13, 17):
        c.px(x, 32, GOLD[0])
        c.px(x, 31, BODY[2])
    for i in range(9):   # nút phát: tam giác vàng trỏ phải, viền mực
        top, bot = 13 + i // 2, 23 - i // 2
        for y in range(top, bot + 1):
            c.px(11 + i, y, GOLD[3] if i < 3 else GOLD[2] if i < 7 else GOLD[1])
    for y in range(12, 25):
        c.px(10, y, INK)
    for (x, y) in [(18, 25), (19, 25), (21, 25), (22, 25), (17, 26), (18, 26), (19, 26), (20, 26), (21, 26), (22, 26), (23, 26),
                   (17, 27), (18, 27), (19, 27), (20, 27), (21, 27), (22, 27), (23, 27), (18, 28), (19, 28), (20, 28), (21, 28), (22, 28),
                   (19, 29), (20, 29), (21, 29), (20, 30)]:   # trái tim nhỏ góc dưới phải, tràn ra mép máy
        c.px(x, y, HEART[1])
    for (x, y) in [(18, 26), (18, 27), (19, 26)]:
        c.px(x, y, HEART[2])
    for (x, y) in [(22, 28), (21, 29), (20, 30)]:
        c.px(x, y, HEART[0])
    c.outline(INK)
    return c


def build(save):
    save('ui.hud-kenh', [_phone()], (15, 37), 'nút kênh video (TikTok) trên màn chơi (tools/art/ui_hud_tren.py)')
    return 1
