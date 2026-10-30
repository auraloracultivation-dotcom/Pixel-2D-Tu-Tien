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


def gear(save):
    n = 0
    for src, (per, ids) in GEAR.items():
        if not (SRC / src).exists(): continue
        cells = _sheet(src, per)
        if len(cells) != len(ids):
            print('icon trang bị: cắt', src, 'ra', len(cells), 'ô, cần', len(ids)); continue
        for gid, c in zip(ids, cells):
            if gid and gid.startswith('dao-van'): c = _defringe(c)   # bộ trắng vàng: mép bị ám hồng của nền
            if gid: _save(save, 'gear.' + gid, [c], 22, f'icon trang bị {gid} (ảnh Canva nguon/ai/props/{src})', 'mid'); n += 1
    return n
