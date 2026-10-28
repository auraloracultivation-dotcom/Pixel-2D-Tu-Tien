"""Ảnh cho trang CH Play, vẽ bằng code từ chính hình pixel của game (assets/art, sinh bởi build.py):
- store/feature-1024x500.png: ảnh bìa (feature graphic) 1024×500: trời chiều dải màu, mây, đảo bay có nhà mái ngói, cây, núi tuyết, kiếm bay, chữ tên game.
- store/icon-512.png: biểu tượng ứng dụng 512×512 (PNG 32 bit, vuông kín), vẽ hoàn toàn bằng code: phương án thay biểu tượng hiện tại trong assets/icon.
Vẽ ở độ phân giải gốc nhỏ rồi phóng nguyên lần, giữ điểm ảnh vuông. Chạy sau build.py: python3 -I tools/art/store.py"""
import json, math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'store'
ART = json.loads((ROOT / 'data' / 'art.json').read_text(encoding='utf-8'))['sprites']
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
INK = (27, 24, 48, 255)


def frame(sid, f=0):
    s = ART[sid]
    im = Image.open(ROOT / s['file']).convert('RGBA')
    return im.crop((f * s['w'], 0, (f + 1) * s['w'], s['h'])), s['anchor']


def put(base, sid, x, y, f=0, flip=False):
    """Đặt hình theo điểm neo (chân) tại (x, y)."""
    im, (ax, ay) = frame(sid, f)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT); ax = im.width - 1 - ax
    base.alpha_composite(im, (x - ax, y - ay))


def sky(w, h, top, bottom, bands=7):
    """Trời dải màu bậc thang, mép dải hoà bằng Bayer 4×4 (kiểu pixel, không mờ trơn)."""
    B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    cols = [tuple(int(top[i] + (bottom[i] - top[i]) * k / (bands - 1)) for i in range(3)) + (255,) for k in range(bands)]
    im = Image.new('RGBA', (w, h))
    px = im.load()
    for y in range(h):
        v = y / h * (bands - 1)
        for x in range(w):
            i = int(v) + (1 if (v % 1) * 16 > B[y % 4][x % 4] else 0)
            px[x, y] = cols[min(bands - 1, i)]
    return im


def cloud(base, x, y, w, rnd, col=(255, 248, 236, 255), shade=(232, 214, 222, 255)):
    d = ImageDraw.Draw(base)
    for i in range(w // 6):
        cx, r = x + i * 6 + rnd.randint(-1, 1), rnd.randint(4, 7)
        d.ellipse((cx - r, y - r, cx + r, y + r // 2 + 2), fill=col)
    d.rectangle((x - 3, y + 1, x + w + 2, y + 3), fill=shade)


def island(base, x0, y0, tiles_w, rows=2):
    """Đảo bay: hàng cỏ trên cùng, vách đất hai hàng bên dưới, đáy nhọn dần."""
    for i in range(tiles_w):
        g, _ = frame('tile.grass', i % 4)
        for r in range(rows):
            base.alpha_composite(g, (x0 + i * 16, y0 + r * 16))
        c1, _ = frame('tile.cliff', i % 3)
        c2, _ = frame('tile.cliff', 3 + i % 3)
        base.alpha_composite(c1, (x0 + i * 16, y0 + rows * 16))
        if 0 < i < tiles_w - 1:
            base.alpha_composite(c2, (x0 + i * 16, y0 + rows * 16 + 16))


def house(base, x0, y0, w=3):
    """Nhà mái ngói 3 ô: hàng mái thấp (khung 9–11) rồi tường trái, cửa, phải (khung 12, 15, 14)."""
    for i in range(w):
        pos = 0 if i == 0 else 2 if i == w - 1 else 1
        r, _ = frame('tile.house', 9 + pos)
        base.alpha_composite(r, (x0 + i * 16, y0))
        wall = 12 if i == 0 else 14 if i == w - 1 else 15
        t, _ = frame('tile.house', wall)
        base.alpha_composite(t, (x0 + i * 16, y0 + 16))


def pixel_text(base, text, cx, y, size, fill, outline=INK, shadow=(90, 40, 60, 255)):
    """Chữ không khử răng cưa (fontmode 1), viền mực 1 điểm và bóng đổ, căn giữa tại cx."""
    font = ImageFont.truetype(FONT, size)
    tmp = Image.new('RGBA', base.size)
    d = ImageDraw.Draw(tmp); d.fontmode = '1'
    w = d.textlength(text, font=font)
    x = int(cx - w / 2)
    for dx, dy in [(0, 2), (1, 2), (-1, 2)]:
        d.text((x + dx, y + dy), text, font=font, fill=shadow)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if dx or dy:
                d.text((x + dx, y + dy), text, font=font, fill=outline)
    d.text((x, y), text, font=font, fill=fill)
    base.alpha_composite(tmp)


def feature():
    W, H, K = 256, 125, 4
    rnd = random.Random(28)
    base = sky(W, H, (120, 150, 230), (255, 196, 160))
    d = ImageDraw.Draw(base)
    for r, a in ((26, 60), (20, 110), (14, 255)):   # mặt trời chiều, quầng bậc
        d.ellipse((196 - r, 40 - r, 196 + r, 40 + r), fill=(255, 236, 170, a))
    for _ in range(5):
        cloud(base, rnd.randint(-10, 230), rnd.randint(14, 70), rnd.randint(20, 40), rnd)
    for x, f in ((150, 0), (172, 1), (196, 2), (222, 0)):   # dãy núi tuyết phía xa
        put(base, 'prop.peak-8a8070', x, 96, f)
    island(base, 92, 82, 6)
    house(base, 116, 50)
    put(base, 'prop.tree', 104, 82, 2)
    put(base, 'prop.tree', 178, 82, 0)
    put(base, 'prop.lantern', 168, 82, 0)
    for x in (98, 150, 160):
        put(base, 'decal.flowers', x, 80, x % 3)
    island(base, 12, 100, 3, rows=1)
    put(base, 'prop.tree', 30, 100, 1)
    island(base, 214, 104, 2, rows=1)
    kiem, _ = frame('item.kiem')
    kiem = kiem.resize((26, 26), Image.NEAREST)
    base.alpha_composite(kiem, (58, 58))
    for i in range(10):   # vệt kiếm khí sau thanh kiếm
        base.putpixel((56 - i * 2, 80 + i), (255, 255, 255, 200 - i * 18))
    big = base.resize((W * K, H * K), Image.NEAREST)
    pixel_text(big, 'PIXEL 2D TU TIÊN', 512, 34, 76, (255, 230, 150, 255))
    pixel_text(big, 'Tu tiên pixel ấm · tự hành · độ kiếp · đạo lữ', 512, 128, 30, (255, 248, 230, 255))
    return big.convert('RGB')


def icon():
    S, K = 128, 4
    base = sky(S, S, (110, 140, 230), (255, 200, 170), bands=6)
    d = ImageDraw.Draw(base)
    for r, a in ((22, 90), (16, 255)):
        d.ellipse((92 - r, 30 - r, 92 + r, 30 + r), fill=(255, 236, 170, a))
    rnd = random.Random(5)
    cloud(base, 6, 40, 30, rnd); cloud(base, 84, 62, 26, rnd)
    island(base, 16, 84, 6, rows=1)   # đảo bay giữa trời
    house(base, 40, 54)
    put(base, 'prop.tree', 30, 86, 2)
    put(base, 'prop.tree', 98, 86, 0)
    kiem, _ = frame('item.kiem')
    base.alpha_composite(kiem.resize((39, 39), Image.NEAREST), (6, 6))   # kiếm bay
    for i in range(12):
        base.putpixel((10 + i, 44 + i // 2), (255, 255, 255, 210 - i * 15))
    return base.resize((S * K, S * K), Image.NEAREST)   # vuông kín, không bo góc: CH Play tự bo (chuẩn biểu tượng Google)


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    feature().save(OUT / 'feature-1024x500.png', optimize=True)
    icon().save(OUT / 'icon-512.png', optimize=True)
    print('ok', OUT)
