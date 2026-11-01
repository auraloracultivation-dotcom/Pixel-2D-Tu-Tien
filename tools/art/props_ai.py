"""Đồ vật bản đồ từ ảnh Canva (chủ dự án 30/10/2026: "vào game thì cây cối nhà cửa... đều có thể lên canvas tạo"):
4 tấm 3×2 ở nguon/ai/props/ (nền hồng), cắt từng ô, thu về đúng chiều cao hình cũ (vừa ô bản đồ), gom màu, viền mực, căn theo chân.
Ghi đè prop.<tên> đã vẽ code (cùng số khung, khung là biến thể). Đồ có lửa nhảy, xoáy (đuốc, đèn lồng, lò, cổng) vẫn vẽ code.
Gọi từ build.py sau khi vẽ đồ vật code: props_ai.props(save)."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas, MANIFEST
import ai_sprites as A

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'props'
SHEETS = ['cay-1.png', 'cay-2.png', 'da-1.png', 'cot-1.png']   # ô đánh số liên tiếp: tấm 0 ô 0–5, tấm 1 ô 6–11...
# tên đồ vật: (các ô làm khung, chiều cao điểm ảnh, ghi chú); ô âm = lật ngang ô đó
PROPS = {
    'tree': ([0, 1, 2], 38, 'cây quả đỏ, hoa đào, hoa trắng'),
    'oldtree': ([3, 4], 40, 'cổ thụ tán tầng, cổ thụ dây leo hoa trắng'),
    'pine': ([5, 6], 28, 'tùng phủ tuyết lớn, nhỏ'),
    'deadtree': ([7, 8], 24, 'cây khô cành trơ, có quạ đậu'),
    'bush': ([9, 10], 12, 'bụi xanh, bụi hoa vàng'),
    'rock': ([11, 12], 12, 'đá xám, đá rêu'),
    'mushroom': ([13, 14], 12, 'cụm nấm phát sáng xanh ngọc'),
    'crystal': ([15, 16], 20, 'tinh thể tím cao, thấp'),
    'icepillar': ([17, 18], 26, 'trụ băng'),
    'blackpillar': ([19, 20], 26, 'trụ đá đen phù văn tím, vỡ đỉnh'),
    'pillar': ([21, 22], 26, 'cột đất nung, có chữ cổ hổ phách'),
    'sword-grave': ([23, -23], 24, 'mộ kiếm (khung 2 lật ngang)'),
}


def _cells():
    out = []
    for name in SHEETS:
        a = A._key_near(np.array(Image.open(SRC / name).convert('RGBA')))
        cells = A._split_rows(a, per=[3, 3])
        if len(cells) != 6: raise SystemExit(f'{name}: cắt ra {len(cells)} ô, cần 6')
        out += [A._trim(c) for c in cells]
    return out


def props(save):
    cells, n = _cells(), 0
    for pid, (idx, h, note) in PROPS.items():
        src = [cells[abs(i)][:, ::-1] if i < 0 else cells[i] for i in idx]
        fr = A._act_frames(src, h, 18, 'feet')
        hh, ww = fr[0].shape[:2]
        cvs = []
        for f in fr:
            c = Canvas(ww, hh); c.a = np.ascontiguousarray(f, dtype=np.uint8); cvs.append(c)
        old = MANIFEST.get('prop.' + pid, {}); up = old['h'] - old['anchor'][1] if old else 1   # giữ khoảng cách gốc tới đáy hình như cũ
        save('prop.' + pid, cvs, (ww // 2, hh - up), f'{note} (ảnh Canva nguon/ai/props/, {len(cvs)} biến thể)')
        n += 1
    return n


# đồ nhiệm vụ nhặt trên đất (thứ tự ô như pickups.MAPS) và cảnh bàn tay ma khí (draw-story-fx.js), ảnh Canva 30/10/2026
PICKS = ['linh-thao', 'hoa-tinh-thach', 'bang-tam', 'ngoc-cau-cuu', 'linh-quang', 'suong-mai', 'manh-kiem', 'kim-sa-tinh',
         'bang-hoa', 'linh-nhuong', 'tran-nhan', 'hu-tinh']
HAND = [('fx.ma-tay', [0, 1, 2], 34, 'bàn tay khói ma khí: xòe, nửa nắm, nắm'), ('fx.ma-tay-than', [3], 30, 'đoạn cánh tay khói ma khí (lát nối)'),
        ('fx.ma-nut', [4], 14, 'khe nứt đất tỏa tím'), ('fx.ma-khi', [5], 22, 'đám mây ma khí')]


def _sheet(name, per):
    a = A._key_near(np.array(Image.open(SRC / name).convert('RGBA')))
    return [A._trim(c) for c in A._split_rows(a, per=per)]


def _save(save, sid, cells, h, note, anchor='feet'):
    fr = A._act_frames(cells, h, 18, 'center')
    hh, ww = fr[0].shape[:2]
    cvs = []
    for f in fr:
        c = Canvas(ww, hh); c.a = np.ascontiguousarray(f, dtype=np.uint8); cvs.append(c)
    save(sid, cvs, (ww // 2, hh - 1 if anchor == 'feet' else hh // 2), note)


def extras(save):
    cells = _sheet('do-nhat.png', [4, 4, 4])
    if len(cells) == 12:
        for iid, c in zip(PICKS, cells):
            _save(save, 'pickup.' + iid, [c], 13, f'đồ nhiệm vụ nhặt trên đất: {iid} (ảnh Canva nguon/ai/props/do-nhat.png)')
    cells = _sheet('ma-tay.png', [3, 3])
    if len(cells) == 6:
        for sid, idx, h, note in HAND:
            _save(save, sid, [cells[i] for i in idx], h, note + ' (ảnh Canva nguon/ai/props/ma-tay.png)', 'feet' if sid != 'fx.ma-khi' else 'mid')
    return len(cells)


# icon đồ trang bị không phải vũ khí bay (chủ dự án 30/10/2026): 5 tấm Canva nguon/ai/props/trang-bi-*.png, thứ tự ô trái sang phải, trên xuống
GEAR = {
    'trang-bi-1.png': ([4, 4, 4], ['thanh-moc-quan', 'thanh-moc-bao', 'thanh-moc-boi', 'thanh-moc-gioi', 'thanh-moc-hai', 'xich-diem-quan',
                                   'xich-diem-giap', 'xich-diem-boi', 'xich-diem-gioi', 'xich-diem-hai', 'bo-can', 'bo-hai']),
    'trang-bi-2.png': ([4, 4, 4], ['han-bang-quan', 'han-bang-giap', 'han-bang-boi', 'han-bang-gioi', 'han-bang-hai', 'hau-tho-quan',
                                   'hau-tho-giap', 'hau-tho-boi', 'hau-tho-gioi', 'hau-tho-hai', 'bo-y', 'thiet-khoi']),
    'trang-bi-3.png': ([4, 4, 4], ['kim-cang-quan', 'kim-cang-giap', 'kim-cang-boi', 'kim-cang-gioi', 'kim-cang-hai', 'hac-phong-quan',
                                   'hac-phong-giap', 'hac-phong-boi', 'hac-phong-gioi', 'hac-phong-hai', 'thiet-gioi', 'linh-ngoc-gioi']),
    'trang-bi-4.png': ([4, 4, 4], ['thai-hu-quan', 'thai-hu-giap', 'thai-hu-boi', 'thai-hu-gioi', 'thai-hu-hai', 'dao-van-quan',
                                   'dao-van-bao', 'dao-van-an', 'dao-van-binh', 'dao-van-boi', 'dao-van-gioi', 'dao-van-hai']),
    'trang-bi-5.png': ([4, 4], ['hoa-hon-linh', 'huyen-giap', 'kim-luan', 'linh-phu', 'ngoc-boi-tho', 'tran-yeu-thap', 'van-van-ngoa', None]),
}


def _defringe(c):
    """Khử ám hồng (nền #FF00FF lẫn vào mép trắng, vàng): điểm có đỏ và lam cùng cao hơn lục rõ rệt thì kéo đỏ, lam về gần lục."""
    a = c.copy(); r, g, b = (a[:, :, i].astype(int) for i in range(3))
    m = (a[:, :, 3] > 0) & (r - g > 30) & (b - g > 30)
    a[m, 0] = np.clip(g[m] + (r[m] - g[m]) // 4 + 10, 0, 255); a[m, 2] = np.clip(g[m] + (b[m] - g[m]) // 5, 0, 255)
    return a


def _pink_to_green(c):
    """Điểm ám hồng tím (đỏ và lam cùng cao hơn lục) đổi sang xanh lá cùng độ sáng (sau khi gom màu, để không lọt lại màu hồng)."""
    a = c.copy(); r, g, b = (a[:, :, i].astype(int) for i in range(3))
    m = (a[:, :, 3] > 0) & (r - g > 24) & (b - g > 24)
    hi = np.maximum(r, b)
    a[m, 0] = np.clip(g[m] * 0.6 + hi[m] * 0.25, 0, 255); a[m, 1] = np.clip(hi[m] + 20, 0, 255); a[m, 2] = np.clip(g[m] * 0.5 + hi[m] * 0.2, 0, 255)
    return a


# biểu tượng chiêu (nút chiêu, bảng chiêu), ảnh Canva 30/10/2026; None = ô thừa
SKILL_ICONS = {'icon-chieu-1.png': ['fire', 'ice', 'bolt', 'vine', 'rock', 'wind', 'heal', 'shield'],
               'icon-chieu-2.png': ['shield-earth', 'buff', 'arrow', 'liem', 'orb', 'slash', 'sound', None]}


def gear(save):
    n = 0
    for src, ids in SKILL_ICONS.items():
        cells = _sheet(src, [4, 4])
        if len(cells) != len(ids): print('icon chiêu: cắt', src, 'ra', len(cells), 'ô, cần', len(ids)); continue
        for sid, c in zip(ids, cells):
            if not sid: continue
            if sid == 'arrow': c = _defringe(c)   # mép tên bị ám hồng của nền
            f = A._act_frames([c], 15, 18, 'center')[0]; f = f[:, :16]   # nút chiêu kéo hình về ô vuông (style-khung.css): đệm giữa khung 16×16
            if sid == 'heal': f = _pink_to_green(f)   # lá hồi xuân lốm đốm hồng tím của nền: đổi thành đốm sáng xanh lá
            sq = Canvas(16, 16); y, x = (16 - f.shape[0]) // 2, (16 - f.shape[1]) // 2
            sq.a[y:y + f.shape[0], x:x + f.shape[1]] = f
            save('icon.' + sid, [sq], (8, 8), f'biểu tượng chiêu {sid} (ảnh Canva nguon/ai/props/{src})'); n += 1
    for src, (per, ids) in GEAR.items():
        if not (SRC / src).exists(): continue
        cells = _sheet(src, per)
        if len(cells) != len(ids):
            print('icon trang bị: cắt', src, 'ra', len(cells), 'ô, cần', len(ids)); continue
        for gid, c in zip(ids, cells):
            if gid and gid.startswith('dao-van'): c = _defringe(c)   # bộ trắng vàng: mép bị ám hồng của nền
            if gid: _save(save, 'gear.' + gid, [c], 22, f'icon trang bị {gid} (ảnh Canva nguon/ai/props/{src})', 'mid'); n += 1
    return n


# nhà nguyên căn (chủ dự án chọn 30/10/2026: "mỗi nhà một hình Canva"): vẽ một lần ở ô dưới trái của khối ô nhà (src/world/draw-ground.js),
# bề ngang đúng số ô × 16, cao theo tỉ lệ ảnh. Tên house.<ký tự ô>-<số ô ngang>; cỡ khối chưa có hình thì vẫn ghép ô như cũ.
HOUSES = {'H': 0, 'B': 1, 'N': 2, 'z': 3, 'W': 4}   # ô trong nha-1.png (3 trên, 2 dưới)


def _by_width(save, sid, cell, w, note):
    b = A._bbox(cell); h = max(8, round(w * (b[3] - b[1]) / (b[2] - b[0])))
    fr = A._act_frames([cell], h, 24, 'center')[0]
    c = Canvas(fr.shape[1], fr.shape[0]); c.a = np.ascontiguousarray(fr, dtype=np.uint8)
    save(sid, [c], (c.w // 2, c.h - 1), note)


def houses(save):
    cells = _sheet('nha-1.png', [3, 2])
    if len(cells) != 5: print('nhà: cắt ra', len(cells), 'ô, cần 5'); return 0
    n = 0
    for ch, i in HOUSES.items():
        for tiles in (3, 2):
            _by_width(save, f'house.{ch}-{tiles}', cells[i], tiles * 16, f'nhà nguyên căn ô {ch} rộng {tiles} ô (ảnh Canva nguon/ai/props/nha-1.png)'); n += 1
    hall = A._trim(A._key_near(np.array(Image.open(SRC / 'dien-lon.png').convert('RGBA'))))
    _by_width(save, 'house.H-10', hall, 160, 'điện lớn tông môn rộng 10 ô (ảnh Canva nguon/ai/props/dien-lon.png)'); n += 1
    return n


# hiệu ứng chiêu (chủ dự án chọn 30/10/2026 "đòn và chiêu nhân vật chính trước"): mỗi hiệu ứng một tấm Canva 6 khung (3 trên, 3 dưới,
# đọc trái sang phải, trên xuống), xếp lại đúng số khung cũ (khung lặp cho đủ nhịp), cao như cũ, căn đáy, giữ điểm neo cũ.
FX = {
    'fire': ([0, 1, 2, 3, 4, 5, 4, 3], 34, 'ngọn lửa lặp'),
    'ice': ([0, 1, 2, 3, 3, 3, 4, 4, 5, 5], 40, 'gai băng trồi lên, giữ, vỡ'),
    'bolt': ([0, 1, 2, 3, 4, 5, 5], 56, 'sét: mồi, đánh, toả nhánh, tàn, cháy xém'),
    'vine': ([0, 1, 2, 2, 3, 3, 4, 5], 36, 'dây leo trồi, đung đưa, héo rụng'),
    'rock': ([0, 1, 2, 2, 3, 4, 5, 5], 40, 'nứt đất, gai đá trồi, vỡ ra bụi'),
    'wind': ([0, 1, 2, 3, 4, 5, 4, 3], 28, 'gió xoáy lặp'),
    'heal': ([0, 1, 2, 2, 3, 4, 5, 5], 38, 'hồi máu: vòng sáng chân, dấu cộng bay lên'),
    'shield': ([0, 1, 2, 3, 4, 5], 36, 'khiên nước: nở, chớp, vệt sáng quét (thân vòm trong nửa)'),
    'shield-earth': ([0, 1, 2, 3, 4, 5], 36, 'khiên đất vàng: đá tụ, chớp, vệt sáng quét (thân vòm trong nửa)'),
    'buff': ([0, 1, 2, 3, 4, 5, 4, 3], 38, 'tăng sức: vầng vàng bốc lên lặp'),
}


def _smoke_grey(c):
    a = c.copy(); r, g, b = (a[:, :, i].astype(int) for i in range(3))
    m = (a[:, :, 3] > 0) & (r - g > 25) & (b - g > 25)
    v = ((r + g + b) // 3)[m]; a[m, 0] = v; a[m, 1] = v; a[m, 2] = np.clip(v + 6, 0, 255)
    return a


def _pink_to(c, col):
    a = c.copy(); r, g, b = (a[:, :, i].astype(int) for i in range(3))
    m = (a[:, :, 3] > 0) & (r - g > 25) & (b - g > 25)
    a[m, 0], a[m, 1], a[m, 2] = col
    return a


def skill_fx(save):
    n = 0
    for k, (order, h, note) in FX.items():
        src = f'fx-{k}.png'
        if not (SRC / src).exists(): continue
        cells = _sheet(src, [3, 3])
        if len(cells) != 6: print('hiệu ứng', k, 'cắt ra', len(cells), 'ô'); continue
        if k == 'bolt': cells[5] = _smoke_grey(cells[5])   # khói cháy xém bị ám tím của nền: về xám
        if k == 'heal': cells = [_pink_to(c, (200, 255, 190)) for c in cells]   # dấu cộng, tia sáng bị ám hồng: về xanh nhạt
        fr = A._act_frames([cells[i] for i in order], h, 20, 'feet')
        hh, ww = fr[0].shape[:2]
        cvs = []
        for f in fr:
            if k.startswith('shield'):   # vòm khiên che người: thân trong nửa, viền tối và điểm rất sáng giữ đậm
                lum = f[:, :, :3].astype(int).sum(2); op = f[:, :, 3] > 0
                f[op & (lum < 650), 3] = 150
            c = Canvas(ww, hh); c.a = np.ascontiguousarray(f, dtype=np.uint8); cvs.append(c)
        old = MANIFEST.get('fx.' + k, {}); up = old['h'] - old['anchor'][1] if old else 1
        save('fx.' + k, cvs, (ww // 2, hh - up), f'{note} (ảnh Canva nguon/ai/props/{src}, {len(cvs)} khung)')
        n += 1
    return n


# đồ có lửa nhảy, xoáy: mỗi tấm Canva một hàng, mỗi ô là một khung động (30/10/2026); cao đúng hình code cũ, giữ neo như cũ
ANIM = [('torch', 'anim-torch.png', [0, 1, 2, 3], 'đuốc treo vách, 4 khung lửa nhảy'),
        ('lantern', 'anim-lantern.png', [0, 1], 'đèn lồng giấy đỏ treo cột gỗ, 2 khung sáng tối'),
        ('furnace', 'anim-furnace.png', [0, 1, 2], 'lò đan đỉnh đồng ba chân, 3 khung lửa cửa lò'),
        ('portal', 'anim-portal.png', [0, 1, 2, 3], 'cổng truyền tống vành đá, xoáy tím 4 khung'),
        ('anvil', 'anim-anvil.png', [0, 1], 'lò rèn: bệ than, đe trên gốc gỗ, búa; 2 khung than hồng'),
        ('cushion', 'anim-misc.png', [0], 'bồ đoàn cói thêu sen vàng'),
        ('broken-sword', 'anim-misc.png', [1, 2, 3], 'kiếm gãy nằm: ngang, chéo xuống, chéo lên')]


def anim(save):
    n, cache = 0, {}
    count = {}
    for _, name, idx, _ in ANIM: count[name] = max(count.get(name, 0), max(idx) + 1)
    for pid, name, idx, note in ANIM:
        if name not in cache:
            a = A._key_near(np.array(Image.open(SRC / name).convert('RGBA')))
            cache[name] = [A._trim(c) for c in A._split_rows(a, per=[count[name]])]
        cells = cache[name]
        if max(idx) >= len(cells): raise SystemExit(f'{name}: cắt ra {len(cells)} ô, cần {max(idx) + 1}')
        old = MANIFEST['prop.' + pid]
        src = [_smoke_grey(cells[i]) if pid == 'furnace' else cells[i] for i in idx]   # khói lò bị ám hồng nền → xám
        fr = A._act_frames(src, old['h'], 18, 'feet')
        hh, ww = fr[0].shape[:2]
        cvs = []
        for f in fr:
            c = Canvas(ww, hh); c.a = np.ascontiguousarray(f, dtype=np.uint8); cvs.append(c)
        up = old['h'] - old['anchor'][1]
        save('prop.' + pid, cvs, (ww // 2, hh - up), f'{note} (ảnh Canva nguon/ai/props/{name})')
        n += 1
    return n


# hiệu ứng trúng đòn, khói tan, đạn quái (30/10/2026): mỗi tấm một hàng, cắt đều; giữ cao hình code cũ, neo theo tỉ lệ cũ (đầu cầu lửa...)
HITFX = [('fx.spark', 'fx-spark.png', 4, [0, 1, 2, 3], 'tia lửa khi trúng, 4 khung'),
      ('fx.puff', 'fx-puff.png', 5, [0, 1, 2, 3, 4], 'khói tan khi quái chết, 5 khung'),
      ('proj.fire', 'proj-fire.png', 4, [0, 1, 2, 3], 'cầu lửa bay, đuôi lửa 4 khung'),
      ('proj.rock', 'proj-rock-vine.png', 3, [0], 'tảng đá ném, game cho xoay tròn'),
      ('proj.vine', 'proj-rock-vine.png', 3, [1, 2], 'kim gỗ lá non ở đuôi, 2 khung')]


def hit_fx(save):
    n, cache = 0, {}
    for sid, name, cnt, idx, note in HITFX:
        if name not in cache:
            a = A._key_near(np.array(Image.open(SRC / name).convert('RGBA')))
            cache[name] = [A._trim(c) for c in A._cut(a, cnt)]
        old = MANIFEST[sid]
        fr = A._act_frames([_defringe(cache[name][i]) for i in idx], old['h'], 16, 'center')   # khói, đuôi lửa bị ám hồng của nền
        hh, ww = fr[0].shape[:2]
        cvs = []
        for f in fr:
            c = Canvas(ww, hh); c.a = np.ascontiguousarray(f, dtype=np.uint8); cvs.append(c)
        ax, ay = old['anchor']
        save(sid, cvs, (round(ax * ww / old['w']), round(ay * hh / old['h'])), f'{note} (ảnh Canva nguon/ai/props/{name})')
        n += 1
    return n


def ma_than_weapon(save):
    """Thương của Đại Ma Thần (chủ dự án 31/10/2026: "vũ khí phải là thương, lớn gấp đôi vũ khí thường, cực đỉnh"): ảnh Canva nằm ngang,
    dài 72 điểm ảnh (vũ khí bay thường ~36). Game xoay, nhấp nhô sau lưng (src/render/draw-ma-khi.js)."""
    if not (SRC / 'ma-than-thuong.png').exists(): return 0
    a = A._key_near(np.array(Image.open(SRC / 'ma-than-thuong.png').convert('RGBA')))
    _by_width(save, 'wpn.ma-than-thuong', A._trim(a), 80, 'thương Đại Ma Thần, mũi hướng phải (ảnh Canva nguon/ai/props/ma-than-thuong.png)')
    return 1


def weapon_icons(save):
    """Biểu tượng chiêu riêng cho vũ khí chưa có (01/11/2026: chiêu Long Thương Đột của thương mà hiện hình kiếm): cắt từ hình
    vũ khí bay fw.<loại> ở khung chéo lên (khung 28 / 32 = xoay -45°), thu vào ô 16×16 như các biểu tượng chiêu khác."""
    n = 0
    for kind in ('thuong',):
        spr = MANIFEST.get('fw.' + kind)
        if not spr: continue
        sheet = np.array(Image.open(Path(__file__).resolve().parents[2] / spr['file']).convert('RGBA'))
        k = 28 % spr['frames']; cell = sheet[:, k * spr['w']:(k + 1) * spr['w']]
        f = A._act_frames([A._trim(cell)], 15, 18, 'center')[0][:, :16].copy()
        f[:, :, :3] = np.clip(f[:, :, :3].astype(float) * 1.35 + 10, 0, 255).astype(np.uint8)   # hình bay nhỏ tối: nâng sáng cho ngang các biểu tượng khác
        sq = Canvas(16, 16); y, x = (16 - f.shape[0]) // 2, (16 - f.shape[1]) // 2
        sq.a[y:y + f.shape[0], x:x + f.shape[1]] = f
        save('icon.' + kind, [sq], (8, 8), f'biểu tượng chiêu {kind}, cắt từ fw.{kind}'); n += 1
    return n
