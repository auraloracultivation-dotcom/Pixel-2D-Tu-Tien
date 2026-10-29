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

# biểu tượng ô Menu (chủ dự án 29/10/2026: "mấy cái bảng này cũng thiết kế lại bằng canvas"), 3 tấm Canva 4×4×4 món, cao 32 (ô Menu 34)
_M = lambda *n: [('m-' + x, 32) for x in n]
LIGHTS.update({
    'menu-1.png': _M('bag', 'sword', 'manual', 'robe', 'medal', 'cauldron', 'anvil', 'herb', 'cave', 'root', 'portal', 'pagoda'),
    'menu-2.png': _M('arena', 'chest', 'flags', 'demon', 'checklist', 'taiji', 'banner', 'firework', 'auto', 'trophy', 'diary', 'fish'),
    'menu-3.png': _M('globe', 'friends', 'podium', 'palace', 'market', 'jade', 'tea', 'lantern', 'mapscroll', 'boots', 'potion', 'star'),
})
PER.update({f'menu-{i}.png': [4, 4, 4] for i in (1, 2, 3)})

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


def _ring(gem, S=64):
    """Khung tròn đều cho nút chiêu, lướt, đan, pháp bảo (chủ dự án 29/10/2026: khung Canva có chóp cao thấp khác nhau trông lệch):
    viền mực, nẹp vàng ba lớp, lòng trong suốt, bốn viên ngọc ở bốn hướng và tám đinh vàng xen giữa. Cạnh S, tâm ở giữa."""
    import math
    c = Canvas(S, S); cx = cy = (S - 1) / 2; R = S / 2 - 1
    for y in range(S):
        for x in range(S):
            d = R - math.hypot(x - cx, y - cy)
            if d < -0.5 or d > 6.5: continue
            k = int(d + 0.5)
            col = (INK, GOLD_L, GOLD, GOLD, GOLD_D, GOLD_D, INK)[min(k, 6)]
            if k == 1 and y > cy: col = GOLD          # sáng trên, tối dưới
            if k == 2 and y < cy - R * 0.4: col = GOLD_L
            c.px(x, y, col)
    g0, g1 = hx(gem[0]), hx(gem[1])
    for i in range(12):
        a = i * math.pi / 6; ox = int(cx + math.cos(a) * (R - 3)); oy = int(cy + math.sin(a) * (R - 3))   # tâm nguyên: tránh làm tròn .5 kiểu ngân hàng
        if i % 3 == 0:   # ngọc hình thoi 9×9 ở bốn hướng
            for dy in range(-4, 5):
                for dx in range(-4, 5):
                    m = abs(dx) + abs(dy)
                    if m > 4: continue
                    col = INK if m == 4 else (g1 if dx + dy > 0 else g0)
                    c.px(int(round(ox + dx)), int(round(oy + dy)), col)
            c.px(int(round(ox - 1)), int(round(oy - 1)), hx('#ffffff')); c.px(int(round(ox - 1)), int(round(oy - 2)), hx('#ffffff'))
        else:            # đinh vàng
            x0, y0 = int(round(ox)), int(round(oy)); c.px(x0, y0, GOLD_L); c.px(x0 + 1, y0, GOLD_L); c.px(x0, y0 + 1, GOLD_D); c.px(x0 + 1, y0 + 1, GOLD_D)
    return c


RINGS = {'skill': ('#ff6a4a', '#a8201a'), 'art': ('#7affc0', '#1a8a5a'), 'pill': ('#ff8ad8', '#a02a6a'), 'dash': ('#8ad8ff', '#2a5aa8')}


def frames(save):
    for k, gem in RINGS.items():
        save('ui.round-' + k, [_ring(gem)], (32, 32), f'khung tròn đều 64×64 cho nút {k} (vẽ code, ngọc {gem[0]})')
    save('ui.btn', [_button(False)], (0, 0), 'khung nút chữ 12×12 cắt 4 (border-image): mực, nẹp vàng, lòng gỗ son')
    save('ui.btn-on', [_button(True)], (0, 0), 'khung nút chữ đang bật: lòng cam bí ngô')
    save('ui.frame', [_frame(True)], (0, 0), 'khung bảng 36×36 cắt 12 (border-image, style-khung.css): mực, nẹp vàng, gỗ sơn son, góc chạm vàng')
    save('ui.frame-thin', [_frame(False)], (0, 0), 'khung mảnh 36×36 cắt 12 cho hộp thoại, thông báo: không có ô góc')


# ảnh một món (huy hiệu màn đăng nhập theo mùa lễ): tên hình, chiều cao
SINGLE = {'huy-hieu-halloween.png': ('crest-halloween', 56), 'loa.png': ('i-loa', 18)}   # loa: nút Thông báo (chủ dự án 29/10/2026)


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
