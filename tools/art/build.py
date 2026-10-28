"""Vẽ toàn bộ hình của Mốc 1 bằng code → assets/art/*.png (1×) + data/art.json.
Chạy: python3 -I tools/art/build.py
Chuẩn: docs/02-CHUAN-PIXEL.md (viền 1 px cùng tông, 3 tông bóng đổi sắc, không anti-alias)."""
import json, math, random, sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from px import Canvas, hx, save, write_manifest, blob_mask, BAYER4, clean  # noqa: E402
from chars import CHARS, draw  # noqa: E402
from fx import slash_frames, spark_frames, puff_frames, MOON  # noqa: E402
from fx_skill import fire_frames, ice_frames, bolt_frames  # noqa: E402
from fx_nature import vine_frames, rock_frames, wind_frames  # noqa: E402
from fx_aura import heal_frames, shield_frames, buff_frames  # noqa: E402
from fx_proj import proj_sprites  # noqa: E402
from icons import icon_sprites  # noqa: E402
from heroes import sheet, foot, fit, shrink, picture  # noqa: E402
import world as W  # noqa: E402
import terrain as TR  # noqa: E402
import houses as HS  # noqa: E402
import props_planet as PP  # noqa: E402
import props_wild as PW  # noqa: E402
import props_home as PH  # noqa: E402
import terrain2 as T2  # noqa: E402
import walls as WL  # noqa: E402
import flyweapons as FWP  # noqa: E402
import dungeon as DG  # noqa: E402
from ground import ground_frames  # noqa: E402
from mobs import mob_frames  # noqa: E402
from npcs import npc_frames  # noqa: E402
from gear import gear_icon  # noqa: E402
from pets import pet_frames, mount_frames  # noqa: E402
import ai_sprites  # noqa: E402
from px import MANIFEST  # noqa: E402

clean()

# ---------------------------------------------------------------- nhân vật (4 khung: đứng, nhún, bước trái, bước phải)
for sid, spec in CHARS.items():
    save(sid, [draw(spec, f) for f in range(4)], (11, 23), f"{spec['name']} — khung: đứng, nhún, bước A, bước B")

# ---------------------------------------------------------------- nhân vật chính dùng tạm từ ảnh chủ dự án (data/heroes.json)
# chuyển động SpriteCook, mỗi động tác 8 khung, xếp nối nhau: thứ tự khung ở data/heroes.json
_SMOKE = [(0x7f, 0x80, 0x80), (0x7e, 0x80, 0x80)]   # khói xám SpriteCook lẫn vào quầng
_f = sheet('nam-dung') + sheet('nam-di', drop=_SMOKE) + sheet('nam-chem') + sheet('nam-bo', drop=_SMOKE) + sheet('nam-hat', drop=_SMOKE) + sheet('nam-ngang')
save('hero.nam', _f, foot(_f[0]), 'nam kiếm tu (SpriteCook): đứng, đi, chém vòng, bổ dọc, hất lên, quét ngang; mỗi động tác 8 khung')
_f = shrink(fit(sheet('liem-dung') + sheet('liem-di') + sheet('liem-cheo') + sheet('liem-ngang') + sheet('liem-moc')), 0.6)   # thân ~46 px như nam
save('hero.nu', _f, foot(_f[0]), 'nữ liềm tím tóc oải hương (SpriteCook): đứng, đi, chém chéo kéo lên, quét ngang thu về, móc liềm sát đất; mỗi động tác 8 khung, mọi đòn vung về phía trước')

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

# ---------------------------------------------------------------- tinh cầu Hỏa, Băng (tools/art/terrain.py, vẽ ở src/world/draw-ground.js, draw-lava.js)
save('tile.lava', TR.lava_frames(), (0, 0), 'dung nham: tấm 64×64 lặp liền cắt 16 ô, khung = (tx % 4) + (ty % 4) × 4')
save('tile.icelake', TR.icelake_frames(), (0, 0), 'hồ băng nứt: tấm 64×64 lặp liền cắt 16 ô, khung = (tx % 4) + (ty % 4) × 4')
save('tile.lava-rim', TR.lava_rim(), (0, 0), 'bờ đá bazan quanh dung nham: cạnh trên, phải, dưới, trái, rồi góc trên trái, trên phải, dưới phải, dưới trái (góc trong và bo góc ngoài)')
save('tile.snow-rim', TR.snow_rim(), (0, 0), 'bờ tuyết quanh mặt băng, hồ băng: cạnh trên, phải, dưới, trái, rồi 4 góc')
save('fx.lava-bubble', TR.bubble_frames(), (3, 6), 'bọt dung nham phồng, vỡ, tia bắn, trống: 6 khung')
save('tile.void', TR.void_frames(), (0, 0), 'khe hư không (ô f): đáy đen, mạch tím; tấm 64×64 lặp liền cắt 16 ô')
save('tile.void-rim', TR.void_rim(), (0, 0), 'bờ đá tím quanh khe hư không: 4 cạnh rồi 4 góc')
save('fx.void-wisp', TR.wisp_frames(), (2, 9), 'khói tím bốc lên khỏi khe hư không: 6 khung')

# ---------------------------------------------------------------- núi, nước tinh cầu (tools/art/terrain2.py, vẽ ở src/world/draw-ground.js)
save('tile.water', T2.water_frames(), (0, 0), 'nước (ô =): sóng lăn tăn; tấm 64×64 lặp liền cắt 16 ô')
save('tile.water-rim', T2.water_rim(), (0, 0), 'bọt ven bờ nước: 4 cạnh rồi 4 góc')
save('fx.water-glint', T2.glint_frames(), (2, 1), 'đốm lấp lánh trên mặt nước: 6 khung')
_maps = [json.loads(_p.read_text(encoding='utf-8')) for _p in sorted((Path(__file__).resolve().parents[2] / 'data' / 'maps').glob('*.json'))]
for _g in T2.grounds(_maps):
    save('prop.peak-' + T2.key(_g), [T2.peak(_g, _s) for _s in range(3)], (12, 29), f"đỉnh núi phủ tuyết (ô ^ không có núi phía trên), đá theo màu đất {_g or 'đảo cỏ'}: 3 dáng")
    save('tile.slope-' + T2.key(_g), [T2.slope(_g, _s) for _s in range(4)], (0, 0), f"sườn đá (ô ^ có núi phía trên), đá theo màu đất {_g or 'đảo cỏ'}: 4 biến thể")
save('tile.house-burnt', TR.burnt_house_frames(), (0, 0), 'nhà cháy (ô B): cùng thứ tự khung với tile.house, mái thủng lộ xà, tường ám muội, than hồng')

# ---------------------------------------------------------------- nhà và vật tinh cầu Kim, Thổ, Mộc (tools/art/houses.py, props_planet.py)
save('tile.house-forge', HS.frames('forge'), (0, 0), 'nhà rèn (ô N, Thiên Kim): mái đá phiến, tường đá khối, ống khói; cùng thứ tự khung với tile.house')
save('tile.house-adobe', HS.frames('adobe'), (0, 0), 'nhà đất (ô z, Hậu Thổ): mái rơm, tường đất nện, cửa vòm; cùng thứ tự khung với tile.house')
save('tile.house-tree', HS.frames('tree'), (0, 0), 'nhà trên cây (ô W, Thanh Mộc, Làng Tinh Linh): mái lá, vách ván; cùng thứ tự khung với tile.house')
save('prop.sword-grave', [PP.sword_grave(s) for s in range(2)], (8, 22), 'mộ kiếm (ô J): kiếm cắm thẳng, kiếm nghiêng có tua')
save('prop.broken-sword', [PP.broken_sword(k) for k in range(3)], (8, 8), 'kiếm gãy nằm (ô h, nền Kiếm Trủng): ngang, chéo xuống, chéo lên')
save('prop.pillar', [PP.pillar(s) for s in range(2)], (6, 24), 'cột đá đất nung (ô I): trơn, có chữ cổ hổ phách')
save('tile.terrace', [PP.terrace(s) for s in range(4)], (0, 0), 'ruộng bậc thang (ô y): bờ đất, mặt nước, lúa non; 4 biến thể ghép liền ngang')

# ---------------------------------------------------------------- cây cỏ, vật hoang tinh cầu Mộc, Phong, Hư Không (tools/art/props_wild.py)
save('prop.oldtree', [PW.old_tree(s) for s in range(2)], (16, 38), 'cổ thụ (ô Z): tán đậm nhiều tầng, rễ bò; có dây leo hoa trắng')
save('prop.mushroom', [PW.mushroom(s) for s in range(2)], (8, 11), 'cụm nấm phát sáng (ô n): mũ xanh ngọc; thêm nấm nhỏ')
save('prop.lantern', [PW.lantern(f) for f in range(2)], (5, 21), 'đèn lồng giấy đỏ treo cột gỗ (ô Q): 2 khung lửa nhảy')
save('prop.deadtree', [PW.dead_tree(s) for s in range(2)], (8, 23), 'cây khô (ô V): cành trơ; có quạ đậu')
save('prop.blackpillar', [PW.black_pillar(s) for s in range(2)], (6, 25), 'trụ đá đen (ô U): phù văn tím; vỡ đỉnh')
save('prop.crystal', [PW.crystal(s) for s in range(2)], (7, 19), 'tinh thể tím (ô *): cụm cao, cụm thấp')
save('prop.pine', [PW.pine(s) for s in range(2)], (9, 26), 'tùng phủ tuyết (ô Y): ba tầng tán, tuyết đọng; cây thấp')
save('prop.icepillar', [PW.ice_pillar(s) for s in range(2)], (6, 25), 'trụ băng (ô k): tinh thể vát nhọn; có nhánh nhỏ')

# ---------------------------------------------------------------- động phủ, cổng truyền tống (tools/art/props_home.py)
save('prop.portal', [PH.portal(f) for f in range(4)], (10, 7), 'cổng truyền tống (ô P): vành đá khắc, lòng xoáy tím xoay 4 khung')
save('prop.cushion', [PH.cushion()], (8, 5), 'bồ đoàn đả tọa (ô M): đệm cói tết vòng, thêu sen vàng')
save('prop.furnace', [PH.furnace(f) for f in range(3)], (10, 22), 'lò đan (ô K): đỉnh đồng ba chân, cửa lò lửa nhảy 3 khung')
save('prop.anvil', [PH.anvil(f) for f in range(2)], (11, 16), 'lò rèn (ô A): bệ than hồng, đe sắt trên gốc gỗ, búa dựa; 2 khung')
save('tile.plot', [PH.plot(True, s) for s in range(2)] + [PH.plot(False, s) for s in range(2)], (0, 0), 'đất linh điền (ô G): 2 khung đã khai luống cày, 2 khung còn hoang cỏ dại')

# ---------------------------------------------------------------- vũ khí bay ngự kiếm (tools/art/flyweapons.py, vẽ ở src/render/draw-flyweapon.js)
for _id, _fn in FWP.SHAPES.items():
    _f, _side = FWP.rotations(_fn())
    save('fw.' + _id, _f, (_side // 2, _side // 2), f'vũ khí bay {_id}: {FWP.DIRS} hướng xoay sẵn, khung i = góc i/{FWP.DIRS} vòng (0 chĩa phải, theo chiều kim đồng hồ)')

# ---------------------------------------------------------------- vách hang theo hệ, đá linh căn, cửa phong ấn (tools/art/walls.py)
save('tile.wall-root', WL.wall_frames('root'), (0, 0), 'vách rễ (ô X): mặt vách ×2 có rêu mép trên, đỉnh vách ×2')
save('tile.wall-copper', WL.wall_frames('copper'), (0, 0), 'vách đồng (ô C): mặt vách ×2 mạch vàng, đỉnh vách ×2')
save('tile.wall-earth', WL.wall_frames('earth'), (0, 0), 'vách núi đất (ô E): mặt vách ×2 từng lớp, đỉnh vách ×2')
save('prop.spiritstone', [WL.spirit_stone()], (7, 25), 'đá linh căn (ô S): trụ đá khắc, khe giữa để game tô màu linh căn')
save('tile.seal', [WL.seal(f) for f in range(2)], (0, 0), 'cửa bí cảnh còn khoá (ô D): màn phong ấn đỏ, bùa vàng; 2 khung vân chạy')

# ---------------------------------------------------------------- động phủ, cổng truyền tống (tools/art/props_home.py)
save('prop.portal', [PH.portal(f) for f in range(4)], (10, 7), 'cổng truyền tống (ô P): vành đá khắc, lòng xoáy tím xoay 4 khung')
save('prop.cushion', [PH.cushion()], (8, 5), 'bồ đoàn đả tọa (ô M): đệm cói tết vòng, thêu sen vàng')
save('prop.furnace', [PH.furnace(f) for f in range(3)], (10, 22), 'lò đan (ô K): đỉnh đồng ba chân, cửa lò lửa nhảy 3 khung')
save('prop.anvil', [PH.anvil(f) for f in range(2)], (11, 16), 'lò rèn (ô A): bệ than hồng, đe sắt trên gốc gỗ, búa dựa; 2 khung')
save('tile.plot', [PH.plot(True, s) for s in range(2)] + [PH.plot(False, s) for s in range(2)], (0, 0), 'đất linh điền (ô G): 2 khung đã khai luống cày, 2 khung còn hoang cỏ dại')

# ---------------------------------------------------------------- hầm ngục, bí cảnh về đêm (tools/art/dungeon.py, vẽ ở src/world/draw-ground.js, src/render/draw-light.js)
save('tile.dfloor', [DG.floor(s) for s in range(4)], (0, 0), 'lớp phủ nền đá hầm ngục (trong suốt, đè lên màu đất của bản đồ), 4 biến thể')
save('tile.dwall', [DG.wall(True, s) for s in range(2)] + [DG.wall(False, s) for s in range(2)], (0, 0), 'lớp phủ vách: 2 khung mặt gạch, 2 khung đỉnh vách')
save('prop.torch', [DG.torch(f) for f in range(4)], (5, 17), 'đuốc treo vách, 4 khung lửa nhảy')

# ---------------------------------------------------------------- nền các đảo theo hệ, hang động (tools/art/ground.py): ô có "tex" trong data/tiles.json
for _ch, _t in json.loads((Path(__file__).resolve().parents[2] / 'data' / 'tiles.json').read_text())['types'].items():
    if 'tex' in _t:
        save(f'ground.{_ch}', ground_frames(_t['color'], _t['tex']), (0, 0), f"nền {_t['name']} ({_t['tex']}), 4 biến thể")
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


save('prop.bush', [bush(0), bush(1)], (8, 10), 'bụi cây thấp: xanh, có hoa vàng; rải trên cỏ')


# ---------------------------------------------------------------- quái (tools/art/mobs.py): mỗi quái có "look" trong data/mobs.json
for _id, _d in json.loads((Path(__file__).resolve().parents[2] / 'data' / 'mobs.json').read_text(encoding='utf-8')).items():
    if isinstance(_d, dict) and _d.get('look'):
        _f, _a = mob_frames(_d)
        save('mob.' + _id, _f, _a, f"{_d['name']} ({_d['look']}): đứng, bước")


# ---------------------------------------------------------------- linh thú, thú cưỡi (tools/art/pets.py)
_root = Path(__file__).resolve().parents[2] / 'data'
_pets, _mobs = (json.loads((_root / f).read_text(encoding='utf-8')) for f in ('pets.json', 'mobs.json'))
for _id, _d in _pets['pets'].items():
    _f, _a = pet_frames(_d, _mobs.get(_id, {}))
    save('pet.' + _id, _f, _a, f"{_d['name']}: đứng, bước")
for _id, _d in _pets['mounts'].items():
    _f, _a = mount_frames(_d)
    save('mount.' + _id, _f, _a, f"{_d['name']}: đứng, bước; người cưỡi ngồi trên yên")


# ---------------------------------------------------------------- NPC chibi (tools/art/npcs.py): mỗi NPC trong data/npcs.json một tấm
for _id, _d in json.loads((Path(__file__).resolve().parents[2] / 'data' / 'npcs.json').read_text(encoding='utf-8')).items():
    if isinstance(_d, dict) and _d.get('name'):
        save('npc.' + _id, npc_frames(_d), (11, 23), f"{_d['name']}: đứng, nhún, bước A, bước B")

# đấu sĩ luận võ (data/arena.json rivals): chibi như NPC theo màu áo, tóc; kiểu tóc xoay vòng, đấu sĩ mạnh (dau-si-ba) có ấn trán
_STY = ['bun', 'long', 'spiky']
for _i, _r in enumerate(json.loads((Path(__file__).resolve().parents[2] / 'data' / 'arena.json').read_text(encoding='utf-8'))['rivals']):
    _d = {'name': _r['name'], 'color': _r['robe'], 'hair': _r['hair'], 'art': {'style': _STY[_i % 3], 'acc': ['mark'] if _r['base'] == 'dau-si-ba' else []}}
    save('rival.' + _r['id'], npc_frames(_d), (11, 23), f"đấu sĩ {_r['name']} (hạng {_r['rank']}): đứng, nhún, bước A, bước B")


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
save('fx.liem', slash_frames(MOON), (18, 24), 'vệt liềm tím vươn xa trước mặt (vũ khí Liềm, chiêu liềm trúng), 7 khung; tâm cung tại neo')
save('fx.spark', spark_frames(), (5, 5), 'tia lửa khi trúng, 4 khung')
save('fx.puff', puff_frames(), (8, 8), 'khói tan khi quái chết, 5 khung')
save('fx.fire', fire_frames(), (12, 31), 'ngọn lửa lặp 8 khung (chiêu hệ hỏa); neo ở chân lửa')
save('fx.ice', ice_frames(), (24, 33), 'gai băng trồi lên, giữ, vỡ: 10 khung (chiêu hệ băng); neo ở giữa nền băng')
_f, _a = bolt_frames()
save('fx.bolt', _f, _a, 'sét đánh xuống: mồi, đánh, đổi hình, mảnh, cháy xém ×3 (chiêu lôi); neo ở chỗ chạm đất')
save('fx.vine', vine_frames(), (20, 30), 'dây leo trồi ×4, đung đưa ×2, héo rụng ×2 (chiêu hệ mộc); neo ở giữa nền đất')
save('fx.rock', rock_frames(), (24, 32), 'nứt đất, gai đá trồi ×4, vỡ ra bụi ×3 (chiêu hệ thổ); neo ở giữa nền')
save('fx.wind', wind_frames(), (18, 22), 'gió xoáy lặp 8 khung (chiêu phong); neo dưới tâm xoáy')
save('fx.heal', heal_frames(), (14, 32), 'hồi máu: vòng sáng chân, dấu cộng bay lên, 8 khung; neo ở chân')
save('fx.shield', shield_frames(), (17, 32), 'khiên nước: nở, chớp, vệt sáng quét, 6 khung; neo ở chân')
save('fx.shield-earth', shield_frames(True), (17, 32), 'khiên đất / vàng: như khiên nước, tông đất')
for _id, (_f, _a, _n) in proj_sprites().items():
    save(_id, _f, _a, _n)
save('fx.buff', buff_frames(), (15, 32), 'tăng sức: vầng vàng bốc lên quanh người, lặp 8 khung; neo ở chân')

# ---------------------------------------------------------------- biểu tượng chiêu 16×16 trên nút chiêu (tools/art/icons.py)
for _id, _c in icon_sprites().items():
    save(_id, [_c], (8, 8), 'biểu tượng chiêu ' + _id[5:])
# ---------------------------------------------------------------- biểu tượng trang bị 16×16 trong túi đồ (tools/art/gear.py)
_items, _gear = (json.loads((Path(__file__).resolve().parents[2] / 'data' / f).read_text(encoding='utf-8')) for f in ('items.json', 'gear.json'))
for _id, _b in _items['bases'].items():
    save('gear.' + _id, [gear_icon(_b, _gear['sets'])], (8, 8), _b['name'])
# món có hình vẽ sẵn (SpriteCook theo mẫu chủ dự án) thay biểu tượng vẽ code; túi đồ hiện mọi biểu tượng ở ô 32 px
save('gear.tu-nguyet-liem', [picture('liem-vu-khi', 64, hx('#1b1830'))], (32, 32), 'Tử Nguyệt Liềm (SpriteCook theo liềm mẫu)')

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

# ---------------------------------------------------------------- ảnh Canva thay hình code (tools/art/ai_sprites.py, nguon/ai/sheets.json)
print('ảnh Canva:', ai_sprites.apply(MANIFEST, save))

write_manifest()
print('ok', len(list((Path(__file__).resolve().parents[2] / 'assets' / 'art').glob('*.png'))), 'hình')
