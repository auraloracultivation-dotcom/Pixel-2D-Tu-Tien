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

# biểu tượng nút bảng điều khiển (thay emoji) và khung tròn nút đánh, chiêu, lướt, đan (chủ dự án 29/10/2026: làm một lượt trên Canva)
LIGHTS.update({
    'bieu-tuong.png': [('i-sound', 18), ('i-camera', 18), ('i-mail', 16), ('i-bug', 18), ('i-idea', 18), ('i-scroll', 18),
                       ('i-map', 18), ('i-swords', 18), ('i-steps', 18), ('i-bag', 18), ('i-gift', 18), ('i-pumpkin', 18)],
    'vong-nut.png': [('ring-atk', 60), ('ring-skill', 56), ('ring-dash', 56), ('ring-pill', 56), ('ring-art', 56), ('ring-act', 56)],
})
PER = {'bieu-tuong.png': [4, 4, 4]}

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


def _button(on):
    """Khung nút chữ 12×12 cắt 4: viền mực, nẹp vàng, lòng gỗ son (đang bật: lòng cam bí ngô, nẹp vàng sáng)."""
    S = 12
    c = Canvas(S, S)
    fill = (hx('#e07a24'), hx('#b8460e')) if on else (WOOD_L, WOOD_D)
    for y in range(S):
        for x in range(S):
            d = min(x, y, S - 1 - x, S - 1 - y)
            if d == 0: col = INK if (x, y) not in ((0, 0), (S - 1, 0), (0, S - 1), (S - 1, S - 1)) else None   # góc vạt
            elif d == 1: col = GOLD_L if on or y < S // 2 else GOLD
            elif d == 2: col = GOLD_D
            else: col = fill[0] if y < S // 2 else fill[1]
            if col: c.px(x, y, col)
    return c


def _hole(f):
    """Khung tròn: khoét lòng tối ở giữa (loang từ tâm qua điểm tối) cho trong suốt, để khung đè lên nút mà vẫn thấy chữ, biểu tượng chiêu."""
    f = f.copy(); h, w = f.shape[:2]
    lum = f[:, :, :3].astype(int).sum(axis=2)
    seen = np.zeros((h, w), bool); st = [(h // 2, w // 2)]
    while st:
        y, x = st.pop()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or f[y, x, 3] == 0 and False: continue
        if seen[y, x] or lum[y, x] > 200: continue
        seen[y, x] = True
        st += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    f[seen, 3] = 0
    return f


def frames(save):
    save('ui.btn', [_button(False)], (0, 0), 'khung nút chữ 12×12 cắt 4 (border-image): mực, nẹp vàng, lòng gỗ son')
    save('ui.btn-on', [_button(True)], (0, 0), 'khung nút chữ đang bật: lòng cam bí ngô')
    save('ui.frame', [_frame(True)], (0, 0), 'khung bảng 36×36 cắt 12 (border-image, style-khung.css): mực, nẹp vàng, gỗ sơn son, góc chạm vàng')
    save('ui.frame-thin', [_frame(False)], (0, 0), 'khung mảnh 36×36 cắt 12 cho hộp thoại, thông báo: không có ô góc')


# ảnh một món (huy hiệu màn đăng nhập theo mùa lễ): tên hình, chiều cao
SINGLE = {'huy-hieu-halloween.png': ('crest-halloween', 56)}


def lights(save):
    n = 0
    for src, (name, h) in SINGLE.items():
        a = A._key_near(np.array(__import__('PIL.Image', fromlist=['Image']).open(AI / src).convert('RGBA')))
        f = A._act_frames([A._trim(a)], h, 20)[0]
        cv = Canvas(f.shape[1], f.shape[0]); cv.a = np.ascontiguousarray(f, dtype=np.uint8)
        save('ui.' + name, [cv], (f.shape[1] // 2, f.shape[0] - 1), f'huy hiệu màn đăng nhập (ảnh Canva {src})')
        n += 1
    for src, names in LIGHTS.items():
        a = A._key_near(np.array(__import__('PIL.Image', fromlist=['Image']).open(AI / src).convert('RGBA')))
        per = PER.get(src, [3, 3])
        cells = A._split_rows(a, per=per)
        for (name, h), cell in zip(names, cells):
            f = A._act_frames([cell], h, 20 if src == 'vong-nut.png' else 16)[0]
            if name.startswith('ring-'): f = _hole(f)
            cv = Canvas(f.shape[1], f.shape[0]); cv.a = np.ascontiguousarray(f, dtype=np.uint8)
            save('ui.' + name, [cv], (f.shape[1] // 2, f.shape[0] - 1), f'nguồn sáng khung giao diện: {name} (ảnh Canva {src})')
            n += 1
    return n
