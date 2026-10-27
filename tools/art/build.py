"""Vẽ toàn bộ hình của Mốc 1 bằng code → assets/art/*.png (1×) + data/art.json.
Chạy: python3 -I tools/art/build.py
Chuẩn: docs/02-CHUAN-PIXEL.md (viền 1 px cùng tông, 3 tông bóng đổi sắc, không anti-alias)."""
import json, math, random, sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from px import Canvas, hx, save, write_manifest, blob_mask, BAYER4, clean  # noqa: E402
from chars import CHARS, draw  # noqa: E402
from fx import slash_frames, spark_frames, puff_frames  # noqa: E402
from fx_skill import fire_frames, ice_frames, bolt_frames  # noqa: E402
from heroes import sheet, foot, trim_above  # noqa: E402
import world as W  # noqa: E402
from mobs import mob_frames  # noqa: E402

clean()

# ---------------------------------------------------------------- nhân vật (4 khung: đứng, nhún, bước trái, bước phải)
for sid, spec in CHARS.items():
    save(sid, [draw(spec, f) for f in range(4)], (11, 23), f"{spec['name']} — khung: đứng, nhún, bước A, bước B")

# ---------------------------------------------------------------- nhân vật chính dùng tạm từ ảnh chủ dự án (data/heroes.json)
# chuyển động SpriteCook, mỗi động tác 8 khung, xếp nối nhau: thứ tự khung ở data/heroes.json
_SMOKE = [(0x7f, 0x80, 0x80), (0x7e, 0x80, 0x80)]   # khói xám SpriteCook lẫn vào quầng
_f = sheet('nam-dung') + sheet('nam-di', drop=_SMOKE) + sheet('nam-chem') + sheet('nam-bo', drop=_SMOKE) + sheet('nam-hat', drop=_SMOKE) + sheet('nam-ngang')
save('hero.nam', _f, foot(_f[0]), 'nam kiếm tu (SpriteCook): đứng, đi, chém vòng, bổ dọc, hất lên, quét ngang; mỗi động tác 8 khung')
_f = sheet('nu-dung')
_f = trim_above(_f, _f[0]) + sheet('nu-di') + sheet('nu-dam') + sheet('nu-chem') + sheet('nu-bo') + sheet('nu-hat') + sheet('nu-ngang')   # đứng: xoá giọt đỏ nhỏ lên trên quầng
save('hero.nu', _f, foot(_f[0]), 'nữ tóc trắng cầm giáo (SpriteCook): đứng, đi, đâm, chém vòng, bổ dọc, hất lên, quét ngang; mỗi động tác 8 khung')

# ---------------------------------------------------------------- nền đảo 16×16 (tools/art/world.py, vẽ ở src/world/draw-ground.js)
save('tile.grass', [W.grass(s) for s in range(4)], (0, 0), 'cỏ, 4 biến thể ghép liền')
save('tile.path', [W.path(s) for s in range(4)], (0, 0), 'đường đất, 4 biến thể')
save('tile.stone', [W.stone(s) for s in range(4)], (0, 0), 'nền đá lát, 4 biến thể')
save('tile.edge', W.edge(), (0, 0), 'mép cỏ phủ lên đường / đá: cỏ ở cạnh trên, phải, dưới, trái')
save('tile.cliff', [W.cliff(s) for s in range(3)] + [W.cliff(s, True) for s in range(3)], (0, 0), 'vách đảo: 3 khung hàng ngay dưới đất, 3 khung hàng thứ hai')
save('tile.house', W.house_frames(), (0, 0), 'nhà mái ngói: mái nóc/giữa/mép/thấp × trái/giữa/phải, rồi tường trái, giữa, phải, cửa, cửa sổ')
save('prop.tree', [W.tree(s) for s in range(3)], (15, 36), 'cây: quả đỏ, tán tròn, hoa đào')
save('prop.rock', [W.rock(s) for s in range(2)], (8, 11), 'đá, đá có rêu')
save('decal.flowers', [W.flowers(s) for s in range(3)], (3, 3), 'hoa nhỏ trắng / vàng / hồng')
G = {k: hx(v) for k, v in dict(d='#245a3c', b='#3a8a52', l='#4fa463', t='#7cc96a').items()}
D = {k: hx(v) for k, v in dict(d='#6e5a3e', b='#8f7754', l='#a88f68', c='#5b4831', lip='#3e3122').items()}


def dirt_patch(w, h, seed):
    """Vùng đất có mép cỏ lượn: đất + vết nứt, viền nâu sẫm phía trên (bậc), dải cỏ đậm bao ngoài. Ngoài cùng trong suốt."""
    m = blob_mask(w, h, seed, fill=0.62)
    m[:2, :] = m[-2:, :] = False; m[:, :2] = m[:, -2:] = False
    c = Canvas(w, h)
    rnd = random.Random(seed + 7)
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                c.px(x, y, D['b'] if (x * 3 + y * 5 + seed) % 11 else D['l'])
    for y in range(h):  # mép trên: bậc cỏ đổ xuống đất
        for x in range(w):
            if m[y, x] and y > 0 and not m[y - 1, x]:
                c.px(x, y, D['lip'])
                if y + 1 < h and m[y + 1, x]:
                    c.px(x, y + 1, D['d'])
            elif m[y, x] and ((x > 0 and not m[y, x - 1]) or (x + 1 < w and not m[y, x + 1]) or (y + 1 < h and not m[y + 1, x])):
                c.px(x, y, D['d'])
    for _ in range(max(2, w * h // 220)):  # vết nứt + vệt sáng dưới
        x, y = rnd.randrange(4, w - 6), rnd.randrange(4, h - 4)
        for k in range(rnd.randrange(3, 6)):
            if m[y, x] and m[y + 1, x]:
                c.px(x, y, D['c']); c.px(x, y + 1, D['l'])
            x += 1; y += rnd.choice((-1, 0, 0, 1))
    ring = Canvas(w, h)  # dải cỏ đậm ôm quanh
    for y in range(h):
        for x in range(w):
            if not m[y, x] and any(0 <= y + dy < h and 0 <= x + dx < w and m[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                ring.px(x, y, G['d'])
    ring.paste(c, 0, 0)
    return ring


save('decal.dirt', [dirt_patch(48, 32, s) for s in (3, 11, 19)], (24, 16), 'vùng đất mép cỏ, 3 dáng')

# ---------------------------------------------------------------- đồ trang trí
def bush(seed):
    c = Canvas(16, 11)
    L = [hx('#1d4a33'), hx('#2e6d43'), hx('#45935a'), hx('#6fbf6a')]
    for y in range(11):
        for x in range(16):
            for bx, by, r in ((5, 6, 4.5), (10, 5, 5), (13, 7, 3.5)):
                d = math.hypot(x - bx, y - by)
                if d <= r:
                    lit = ((bx - x) + (by - y)) / r
                    c.px(x, y, L[2] if lit > 0.4 else L[1] if lit > -0.6 else L[0])
    c.px(9, 2, L[3]); c.px(4, 4, L[3])
    if seed % 2:
        for x, y in ((6, 5), (11, 3), (12, 7)):
            c.px(x, y, hx('#f2c94c'))
    return c.outline(hx('#10261a'))


# ---------------------------------------------------------------- quái (tools/art/mobs.py): mỗi quái có "look" trong data/mobs.json
for _id, _d in json.loads((Path(__file__).resolve().parents[2] / 'data' / 'mobs.json').read_text(encoding='utf-8')).items():
    if isinstance(_d, dict) and _d.get('look'):
        _f, _a = mob_frames(_d)
        save('mob.' + _id, _f, _a, f"{_d['name']} ({_d['look']}): đứng, bước")


# ---------------------------------------------------------------- kiếm bay (45°)
def sword():
    c = Canvas(13, 13)
    for i in range(2, 11):  # lưỡi
        c.px(i + 1, 11 - i, hx('#eef3ff')); c.px(i + 1, 12 - i, hx('#9fb2d6'))
    c.px(12, 0, hx('#ffffff'))
    for x, y in ((2, 9), (3, 10), (4, 11)):  # chắn kiếm
        c.px(x, y, hx('#f2c94c'))
    c.px(1, 11, hx('#7a4a2a')); c.px(0, 12, hx('#a3352a'))
    return c.outline(hx('#1b1830'))


save('item.kiem', [sword()], (2, 10), 'kiếm bay cạnh nhân vật, chĩa lên phải')

# ---------------------------------------------------------------- hiệu ứng nhỏ (pixel + quầng sáng, docs/02)
save('fx.slash', slash_frames(), (18, 24), 'vệt chém đánh thường, 7 khung; tâm cung tại neo')
save('fx.spark', spark_frames(), (5, 5), 'tia lửa khi trúng, 4 khung')
save('fx.puff', puff_frames(), (8, 8), 'khói tan khi quái chết, 5 khung')
save('fx.fire', fire_frames(), (12, 31), 'ngọn lửa lặp 8 khung (chiêu hệ hỏa); neo ở chân lửa')
save('fx.ice', ice_frames(), (24, 33), 'gai băng trồi lên, giữ, vỡ: 10 khung (chiêu hệ băng); neo ở giữa nền băng')
_f, _a = bolt_frames()
save('fx.bolt', _f, _a, 'sét đánh xuống: mồi, đánh, đổi hình, mảnh, cháy xém ×3 (chiêu lôi); neo ở chỗ chạm đất')

# ---------------------------------------------------------------- chữ số pixel 3×5 (+viền) cho số sát thương
DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
       '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111']


def digit(bits, col):
    c = Canvas(5, 7)
    for i, b in enumerate(bits):
        if b == '1':
            c.px(1 + i % 3, 1 + i // 3, col)
    return c.outline(hx('#1b1830'))


save('ui.digits', [digit(b, hx('#ffffff')) for b in DIG], (0, 0), 'số 0–9 trắng')
save('ui.digits-crit', [digit(b, hx('#ffd84a')) for b in DIG], (0, 0), 'số 0–9 vàng (bạo kích)')

write_manifest()
print('ok', len(list((Path(__file__).resolve().parents[2] / 'assets' / 'art').glob('*.png'))), 'hình')
