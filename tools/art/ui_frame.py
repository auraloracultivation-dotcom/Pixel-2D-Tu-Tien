"""Khung giao diện kiểu cung điện ấm, thắp đèn (chủ dự án 29/10/2026): khung 9 mảnh vẽ bằng code và các nguồn sáng
(đèn lồng, đuốc, nến, đá phát sáng, bí ngô, đèn dầu...) lấy từ ảnh Canva ở nguon/ai/ui/ (2 tấm, mỗi tấm 6 món xếp 3×2).
Ánh sáng lập lòe vẽ bằng CSS (style-khung.css), không dùng ánh sáng tự nhiên. Gọi từ build.py: frames(save), lights(save)."""
from pathlib import Path
import numpy as np
from px import Canvas, hx
import ai_sprites as A

AI = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui'
# tên hình theo thứ tự ô (đọc trái sang phải, trên xuống dưới) và chiều cao điểm ảnh sau khi thu
LIGHTS = {
    'den-1.png': [('lantern', 26), ('torch', 24), ('candles', 22), ('crystal', 20), ('pumpkin', 18), ('stonelamp', 22)],
    'den-2.png': [('bracket', 26), ('lamppost', 26), ('lanterns3', 20), ('incense', 20), ('wisp', 22), ('oillamp', 16)],
}

INK, GOLD_D, GOLD, GOLD_L, WOOD_D, WOOD, WOOD_L = (hx(c) for c in ('#140a08', '#7a4a16', '#c8902e', '#ffe08a', '#2a1210', '#4a1c16', '#6a2a1e'))


def _frame(corner):
    """Khung 36×36 cắt 12 mỗi cạnh: viền mực, nẹp vàng hai lớp, gỗ sơn son ở giữa, đinh vàng; góc có hoa văn vàng."""
    S = 36
    c = Canvas(S, S)
    for y in range(S):
        for x in range(S):
            d = min(x, y, S - 1 - x, S - 1 - y)
            if d == 0: col = INK
            elif d == 1: col = GOLD_L if (x + y) % 2 else GOLD
            elif d == 2: col = GOLD_D
            elif d < 9: col = WOOD_L if d == 3 else WOOD if d < 8 else WOOD_D   # gỗ sơn son, sáng ở mép ngoài
            elif d == 9: col = GOLD
            elif d == 10: col = INK
            else: continue
            c.px(x, y, col)
    for i in range(12, S - 12, 6):   # đinh vàng dọc nẹp gỗ
        for x, y in ((i, 5), (i, S - 6), (5, i), (S - 6, i)):
            c.px(x, y, GOLD_L); c.px(x + 1, y, GOLD); c.px(x, y + 1, GOLD_D)
    if corner:   # góc: ô vuông vàng chạm hoa, nút đỏ ở giữa
        for ox, oy in ((0, 0), (S - 12, 0), (0, S - 12), (S - 12, S - 12)):
            for y in range(12):
                for x in range(12):
                    e = min(x, y, 11 - x, 11 - y)
                    if 2 <= e <= 4: c.px(ox + x, oy + y, GOLD_L if e == 2 else GOLD if e == 3 else GOLD_D)
            for y in range(5, 7):
                for x in range(5, 7): c.px(ox + x, oy + y, hx('#e0402a'))
    return c


def frames(save):
    save('ui.frame', [_frame(True)], (0, 0), 'khung bảng 36×36 cắt 12 (border-image, style-khung.css): mực, nẹp vàng, gỗ sơn son, góc chạm vàng')
    save('ui.frame-thin', [_frame(False)], (0, 0), 'khung mảnh 36×36 cắt 12 cho hộp thoại, thông báo: không có ô góc')


def lights(save):
    n = 0
    for src, names in LIGHTS.items():
        a = A._key_near(np.array(__import__('PIL.Image', fromlist=['Image']).open(AI / src).convert('RGBA')))
        cells = A._split_rows(a, per=[3, 3])
        for (name, h), cell in zip(names, cells):
            f = A._act_frames([cell], h, 16)[0]
            cv = Canvas(f.shape[1], f.shape[0]); cv.a = np.ascontiguousarray(f, dtype=np.uint8)
            save('ui.' + name, [cv], (f.shape[1] // 2, f.shape[0] - 1), f'nguồn sáng khung giao diện: {name} (ảnh Canva {src})')
            n += 1
    return n
