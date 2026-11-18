"""Máy lọc hình SpriteCook cho Thiên Kiếm Tinh, đợt 18/11/2026 13:23 ("làm tiếp đi… giúp tui làm lại toàn bộ"): núi, cầu bến, đá
và thạch anh, hoa bụi, hòn đất nổi quanh mép, pháp trận, thác, và nhà cửa làm lại theo đúng dáng ảnh của chủ dự án.
Nguồn: tools/art/nguon/ai/the-gioi/tk2/ (sổ việc, mã asset ở spritecook-assets.json). Ra: assets/art/ + data/art.json + kiểu chân,
kiểu chuyển động của món mới trong data/le-hoi.json. Phần nền (bộ 15 mảnh) ở tools/art/sc_tk.py.
Mọi hình mới vẽ ở 0,5 đơn vị mỗi điểm hình (như nhân vật): trên điện thoại một điểm hình đúng một điểm màn, không phải vẽ mịn.
Mỗi món: cắt theo khung (dò bằng vùng liền của kênh trong suốt), gom còn tối đa `mau` màu, chân ở giữa đáy hình (trừ cầu: chân ở mép
gần của mặt cầu, vòm cầu thả xuống dưới). Đèn (lights) tự dò theo cụm điểm vàng ấm / lam lạnh sáng nhất để đêm có quầng sáng.
Chạy: python3 tools/art/sc_tk.py && python3 tools/art/sc_tk2.py"""
import hashlib
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

from png_nho import luu
from sc_tk import ART, OUT, ROOT, SCALE, SRC2

LE_HOI = ROOT / 'data/le-hoi.json'
# kiểu chân mới (data/le-hoi.json → foot) và món nào theo kiểu nào (kinds; khoá dài nhất thắng, src/world/hoi-foot.js)
FOOT = {'cong-to': {'pillars': True, 'w': 0.33, 'd': 1}, 'cong-tron': {'pillars': True, 'w': 0.31, 'd': 1},
        'cau-vom': {'walk': True, 'w': 0.92, 'dh': 0.47}, 'cau-day': {'walk': True, 'w': 0.92, 'dh': 0.56},
        'nui': {'w': 0.8, 'd': 1.4, 'dh': 0.4, 'bake': True}, 'noi': {}}   # nui: chắn như tượng, IN THẲNG VÀO NỀN (bake: núi đứng trên ô chắn,
        # không ai đi ra sau được nên khỏi xếp theo hàng, đỡ 150 hình vẽ mỗi khung; src/world/draw-nen.js); noi: hòn đất nổi ngoài tinh không
KINDS = {'tk.cong-kiem-sc': 'cong-to', 'tk.nguyet-mon-sc': 'cong-tron', 'tk.cau-da-sc': 'cau-vom', 'tk.cau-go-sc': 'cau-day',
         'tk.nui': 'nui', 'tk.nui-doi': 'tuong', 'tk.mieu': 'nha', 'tk.goc-cay': 'tru', 'tk.khuc-go': 'tuong', 'tk.thuyen': 'nho', 'tk.hon-noi': 'noi',
         'tk.hoa-do-sc': 'nho', 'tk.hoa-lam-sc': 'nho', 'tk.hoa-vang-sc': 'nho'}   # khóm hoa: không viết thì ăn theo khoá 'hb.ho' (hồ nước, chắn đường)
# khoá chuyển động khớp phần sau tiền tố tinh cầu của MỌI tinh cầu (draw-hoi-tro.js hoiAnim): viết đủ tên hình mới, không viết 'hoa-'
# (sẽ dính cả hb.hoa-den, xd.hoa-lua-m của tinh cầu khác); ANIM_BO: khoá cũ viết rộng quá, gỡ khỏi data/le-hoi.json
ANIM = {'hon-noi': 'bob', 'hoa-do-sc': 'sway-s', 'hoa-lam-sc': 'sway-s', 'hoa-vang-sc': 'sway-s', 'linh-thao-sc': 'sway-s'}
ANIM_BO = ('hoa-', 'linh-thao')

N, B = 'nha', 96   # số màu: nhà 96, còn lại 64
# tấm → [(mã hình, khung cắt, ghi chú, thêm)]. thêm: mau, den ('am' | 'lanh'), bien (khung biển trống theo toạ độ TẤM), khoi (ống khói),
# bo_roi (bỏ cụm rời nhỏ ở phần trên: khói vẽ sẵn), neo (chân ở hàng điểm này tính từ đỉnh khung cắt), lap_lanh (điểm nước lấp lánh)
TAM = {
    'nui-lon': [('tk.nui-1-sc', (42, 6, 158, 190), 'núi kiếm một ngọn'), ('tk.nui-2-sc', (221, 10, 377, 192), 'núi kiếm hai ngọn'),
                ('tk.nui-3-sc', (5, 209, 195, 389), 'núi kiếm lớn nhiều ngọn'), ('tk.nui-4-sc', (232, 210, 367, 389), 'núi kiếm ba mũi nhọn')],
    'nui-chan': [('tk.thac-nho-sc', (7, 6, 86, 103), 'thác nhỏ trên vách đá', {'lap_lanh': 10}), ('tk.nui-doi-1-sc', (88, 10, 195, 53), 'gờ đá thấp'),
                 ('tk.nui-doi-2-sc', (90, 58, 191, 124), 'đồi đá phủ tuyết có hai gốc thông'), ('tk.da-nui-1-sc', (7, 108, 86, 139), 'mỏm đá rêu'),
                 ('tk.da-nui-2-sc', (8, 144, 80, 194), 'đống đá tảng'), ('tk.da-nui-3-sc', (88, 135, 148, 193), 'đoạn vách đá có cỏ'),
                 ('tk.da-nui-4-sc', (153, 125, 195, 194), 'mũi đá nhọn hình kiếm')],
    'cau-ben': [('tk.cau-da-sc', (12, 12, 285, 121), 'cầu đá ba vòm nhìn thẳng, mặt cầu đi được', {'neo': 80}),
                ('tk.cau-go-sc', (9, 135, 278, 223), 'cầu ván dây thừng nhìn thẳng', {'neo': 80}),
                ('tk.cau-tau-1-sc', (298, 135, 384, 309), 'bến gỗ dài chạy xuống nước'), ('tk.cau-tau-2-sc', (16, 241, 100, 387), 'bến gỗ sẫm chạy xuống nước'),
                ('tk.thuyen-1-sc', (138, 242, 272, 319), 'thuyền gỗ có mái chèo'), ('tk.thuyen-2-sc', (130, 329, 220, 379), 'thuyền gỗ nhỏ'),
                ('tk.cau-da-buoc-sc', (236, 341, 384, 373), 'ba phiến đá bước qua suối')],
    'da': [('tk.da-lon-sc', (10, 9, 146, 126), 'đá tảng lớn phủ rêu'), ('tk.da-vua-sc', (163, 23, 230, 76), 'đá tảng vừa'),
           ('tk.da-nho-sc', (250, 38, 289, 69), 'đá nhỏ'), ('tk.da-cum-sc', (304, 25, 376, 81), 'cụm đá rêu'),
           ('tk.da-dung-sc', (385, 10, 454, 132), 'đá dựng phủ dây leo'), ('tk.da-phien-sc', (164, 95, 257, 136), 'phiến đá phẳng'),
           ('tk.soi-sc', (278, 97, 343, 134), 'đám sỏi'), ('tk.pha-le-lon-sc', (11, 149, 101, 258), 'cụm thạch anh lam trên đá', {'den': 'lanh'}),
           ('tk.pha-le-tim-sc', (112, 180, 159, 242), 'thạch anh tím', {'den': 'lanh'}), ('tk.pha-le-lam-sc', (173, 197, 212, 241), 'thạch anh lam nhỏ', {'den': 'lanh'}),
           ('tk.pha-le-luc-sc', (226, 186, 259, 240), 'mảnh ngọc lục', {'den': 'lanh'}), ('tk.kiem-da-1-sc', (269, 152, 327, 256), 'kiếm đá cổ cắm đất'),
           ('tk.kiem-da-2-sc', (336, 143, 391, 255), 'kiếm đá cổ quấn dây leo'), ('tk.bia-co-sc', (402, 163, 467, 258), 'bia đá khắc cổ tự')],
    'hoa-bui': [('tk.bui-xanh-lon-sc', (28, 8, 102, 73), 'bụi xanh lớn'), ('tk.bui-xanh-nho-sc', (157, 20, 207, 62), 'bụi xanh nhỏ'),
                ('tk.bui-do-quyen-sc', (261, 12, 330, 69), 'bụi đỗ quyên hồng'), ('tk.bui-cuc-vang-sc', (377, 13, 444, 68), 'bụi cúc vàng'),
                ('tk.bui-hoa-trang-sc', (28, 81, 102, 137), 'bụi hoa trắng'), ('tk.bui-mau-don-sc', (147, 81, 217, 138), 'bụi mẫu đơn đỏ'),
                ('tk.bui-co-cao-sc', (261, 80, 329, 138), 'bụi cỏ cao'), ('tk.bui-duong-xi-sc', (372, 81, 450, 138), 'dương xỉ'),
                ('tk.hoa-do-sc', (42, 150, 88, 188), 'khóm hoa dại đỏ'), ('tk.hoa-lam-sc', (161, 150, 204, 187), 'khóm hoa dại lam'),
                ('tk.hoa-vang-sc', (270, 149, 320, 189), 'khóm hoa dại trắng vàng'), ('tk.nam-nau-sc', (390, 152, 433, 184), 'cụm nấm nâu'),
                ('tk.goc-cay-sc', (31, 205, 100, 258), 'gốc cây cụt phủ rêu'), ('tk.khuc-go-sc', (138, 201, 227, 257), 'khúc gỗ mục'),
                ('tk.truc-non-sc', (266, 197, 323, 257), 'khóm trúc non'), ('tk.linh-thao-sc', (385, 198, 435, 255), 'linh thảo lam phát sáng', {'den': 'lanh'})],
    'mep-vo': [('tk.hon-noi-1-sc', (22, 178, 65, 217), 'hòn đất nổi nhỏ'), ('tk.hon-noi-2-sc', (98, 144, 166, 244), 'hòn đất nổi có gốc thông'),
               ('tk.hon-noi-3-sc', (196, 162, 267, 251), 'hòn đất nổi có thạch anh', {'den': 'lanh'}), ('tk.hon-noi-4-sc', (293, 170, 381, 244), 'hòn đất nổi có bụi cây'),
               ('tk.hon-noi-5-sc', (407, 182, 446, 226), 'hòn đất nổi nhỏ có rễ rủ')],
    'phap-tran': [('tk.tran-truyen-tong-sc', (0, 15, 390, 374), 'pháp trận truyền tống: đài đá, bát quái, cổ tự lam, kiếm ấn', {'mau': 128, 'den': 'lanh'})],
    'thac': [('tk.thac-sc', (10, 0, 175, 186), 'thác Kiếm Tuyền đổ xuống hồ đá', {'mau': 96, 'lap_lanh': 26})],
    'nui-thien-kiem': [('tk.nui-thien-kiem-sc', (42, 0, 343, 386), 'Thiên Kiếm Phong: ngọn núi hình thanh kiếm khắc cổ tự', {'mau': 96, 'den': 'lanh'})],
    'dien-chinh': [('tk.dien-chinh-sc', (0, 0, 378, 381), 'Thiên Kiếm Điện', {N: 1, 'den': 'am'})],
    'nha-a': [('tk.lau-sach-sc', (20, 8, 183, 198), 'Tàng Kinh Các', {N: 1, 'den': 'am'}), ('tk.dien-nho-sc', (214, 8, 391, 197), 'Nhiệm Vụ Đường', {N: 1, 'den': 'am'}),
              ('tk.nha-ren-sc', (16, 208, 187, 397), 'lò rèn Binh Khố', {N: 1, 'den': 'am', 'bo_roi': 1, 'khoi': 1}),
              ('tk.quan-tra-sc', (214, 220, 390, 398), 'Trà Quán', {N: 1, 'den': 'am'})],
    'nha-b': [('tk.nha-thuoc-sc', (23, 11, 178, 193), 'tiệm đan dược', {N: 1, 'den': 'am'}), ('tk.thap-canh-sc', (243, 5, 362, 194), 'tháp canh', {N: 1}),
              ('tk.tien-dai-sc', (42, 211, 158, 394), 'tượng tiên nhân Tiên Đài'), ('tk.kiem-trung-sc', (250, 206, 354, 395), 'Kiếm Trủng: cổ kiếm cắm mỏm đá', {'den': 'lanh'})],
    'nha-c': [('tk.dien-phu-sc', (3, 7, 236, 260), 'điện phụ (Luyện Võ Đường, Truyền Công Đường)', {N: 1, 'den': 'am'}),
              ('tk.lau-cho-sc', (241, 7, 472, 260), 'Chợ Phiên', {N: 1, 'den': 'am', 'bien': (329, 147, 54, 16)})],
    'nha-d': [('tk.lau-van-bao-sc', (2, 33, 237, 261), 'Vạn Bảo Lâu', {N: 1, 'den': 'am', 'bien': (88, 168, 62, 17)}),
              ('tk.nguyet-mon-sc', (242, 33, 472, 261), 'Nguyệt Môn', {N: 1, 'den': 'am'})],
    'nha-e': [('tk.cong-kiem-sc', (11, 25, 385, 393), 'cổng Thiên Kiếm Tông', {N: 1})],
    'nha-f': [('tk.dinh-ho-sc', (211, 206, 371, 391), 'đình lục giác ven hồ (ba căn nhà vẽ chéo góc của tấm này không dùng)', {N: 1})],
    'nha-g': [('tk.nha-dan-1-sc', (0, 34, 170, 175), 'nhà dân tường trắng'), ('tk.nha-dan-2-sc', (201, 0, 369, 189), 'nhà dân hai tầng lan can đỏ', {'den': 'am'}),
              ('tk.nha-dan-3-sc', (12, 246, 169, 387), 'nhà gỗ có hiên'), ('tk.mieu-sc', (204, 219, 367, 388), 'miếu nhỏ có lư hương', {'den': 'am'})],
}
for _k in ('nha-g',):   # nhà dân cũng là nhà: 96 màu
    TAM[_k] = [(a, b, c, {N: 1, **(d[0] if d else {})}) for a, b, c, *d in TAM[_k]]


def cum(mask):
    """Các cụm điểm liền nhau (8 hướng) của mặt nạ: [(số điểm, x0, y0, x1, y1, tổng x, tổng y)…]."""
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    out = []
    for y0, x0 in zip(*np.where(mask)):
        if seen[y0, x0]:
            continue
        q, n, bx0, by0, bx1, by1, sx, sy = deque([(y0, x0)]), 0, x0, y0, x0, y0, 0, 0
        seen[y0, x0] = True
        while q:
            y, x = q.popleft()
            n += 1; sx += x; sy += y
            bx0, by0, bx1, by1 = min(bx0, x), min(by0, y), max(bx1, x), max(by1, y)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        q.append((yy, xx))
        out.append((n, int(bx0), int(by0), int(bx1) + 1, int(by1) + 1, sx, sy))
    return sorted(out, reverse=True)


def den(a, loai, toi_da=5):
    """Chỗ đặt quầng sáng. 'am': đèn lồng, cửa sáng = cụm điểm vàng kem gọn (không lấy cả mảng tường sáng); 'lanh': thạch anh, cổ tự lam."""
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    if loai == 'am':
        m = ((r > 228) & (g > 170) & (b < 165) & (r - b > 80)) | ((r >= 222) & (g >= 195) & (b >= 150) & (b <= 200) & (r - b >= 35))
        cs = [c for c in cum(m & (al > 0)) if 18 <= c[0] <= 420 and c[3] - c[1] <= 34 and c[4] - c[2] <= 34]
    else:
        cs = [c for c in cum((b > 215) & (g > 190) & (r < 150) & (al > 0)) if c[0] >= 4]
    return [[round(sx / n), round(sy / n), 'warm' if loai == 'am' else 'cold'] for n, x0, y0, x1, y1, sx, sy in cs[:toi_da]]


def cat(sheet, box, o):
    im = sheet.crop(box)
    a = np.array(im)
    if o.get('bo_roi'):   # bỏ cụm rời nhỏ (khói vẽ sẵn trên ống khói: game tự vẽ khói bay)
        for n, x0, y0, x1, y1, *_ in cum(a[..., 3] > 0)[1:]:
            if n < 400:
                a[y0:y1, x0:x1][a[y0:y1, x0:x1, 3] > 0] = 0
    im = Image.fromarray(a)
    bb = im.getbbox()
    im = im.crop(bb)
    a = np.array(im)
    keep = a[..., 3] > 127
    q = im.convert('RGB').quantize(o.get('mau') or (B if o.get(N) else 64), method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    out = np.dstack([np.asarray(q), np.where(keep, 255, 0).astype(np.uint8)])
    out[~keep] = 0
    return Image.fromarray(out, 'RGBA'), bb


def mon(S, sheet, sid, box, note, o, nguon='sc_tk2.py'):
    """Cắt một món khỏi tấm, ghi tệp hình và dòng data/art.json; trả (dòng, mảng điểm ảnh, khung thật trong khung cắt)."""
    im, bb = cat(sheet, box, o)
    a = np.array(im)
    f = OUT / (sid.replace('.', '-') + '.png')
    luu(im, f)
    e = {'file': f'assets/art/{f.name}', 'v': hashlib.sha1(f.read_bytes()).hexdigest()[:8], 'w': im.width, 'h': im.height, 'frames': 1,
         'anchor': [im.width // 2, (o['neo'] - bb[1]) if o.get('neo') else im.height - 2], 'note': f'SpriteCook: {note} (tools/art/{nguon})', 'scale': SCALE}
    if o.get('den'):
        li = den(a, o['den'], o.get('den_n', 5))
        if li:
            e['lights'] = li
    if o.get('bien'):
        x, y, w, h = o['bien']
        e['plaque'] = [x - box[0] - bb[0], y - box[1] - bb[1], w, h]
    if o.get('khoi'):   # miệng ống khói: hàng trên cùng của hình
        xs = np.where(a[1, :, 3] > 0)[0]
        e['smoke'] = [int(xs.mean()), 2]
    if o.get('lap_lanh'):   # điểm lấp lánh trên mặt nước: rải đều trong vùng nước sáng
        ys, xs = np.where((a[..., 2] > 200) & (a[..., 0] < 185) & (a[..., 3] > 0))
        step = max(1, len(xs) // o['lap_lanh'])
        e['glints'] = [[int(xs[i]), int(ys[i])] for i in range(step // 2, len(xs), step)][:o['lap_lanh']]
    S[sid] = e
    print(f'{sid:26s} {im.width:3d}×{im.height:3d}  {im.width / 32:4.1f}×{im.height / 32:4.1f} ô  {len(im.getcolors(1 << 20))} màu', e.get('lights', ''), e.get('plaque', ''), e.get('smoke', ''))
    return e, a, bb


def ghi_le_hoi(foot, kinds, anim, anim_bo=(), glow=None):
    """Thêm kiểu chân, kiểu chuyển động (và màu quầng sáng) của hình mới vào data/le-hoi.json, giữ nguyên cách viết của tệp."""
    old = LE_HOI.read_text(encoding='utf-8')
    d, tail = json.loads(old), '\n' if old.endswith('\n') else ''
    assert json.dumps(d, ensure_ascii=False, indent=1) + tail == old, 'data/le-hoi.json: cách viết lạ, không dám ghi đè'
    d['foot'].update(foot); d['kinds'].update(kinds); d['anim'].update(anim); d['glow'].update(glow or {})
    for k in anim_bo:
        d['anim'].pop(k, None)
    LE_HOI.write_text(json.dumps(d, ensure_ascii=False, indent=1) + tail, encoding='utf-8')


def main():
    art = json.loads(ART.read_text(encoding='utf-8'))
    S = art['sprites']
    for tam, items in TAM.items():
        sheet = Image.open(SRC2 / f'{tam}.png').convert('RGBA')
        for sid, box, note, *rest in items:
            mon(S, sheet, sid, box, note, rest[0] if rest else {})
    ART.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    ghi_le_hoi(FOOT, KINDS, ANIM, ANIM_BO)


if __name__ == '__main__':
    main()
