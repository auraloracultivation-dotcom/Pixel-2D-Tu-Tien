"""Máy lọc hình SpriteCook cho Thiên Kiếm Tinh, đợt 19/11/2026 (chủ dự án 18/11 23:06 "Làm tiếp", sau khi được hỏi ba mục có số):
1. Cây, đèn đá, tượng, cờ, vạc lửa, sạp hàng làm lại ĐÚNG DÁNG hình cũ tk.*-m (tấm ghép hình cũ làm ảnh mẫu, giữ chỗ và cỡ), cùng cỡ
   điểm với nhà cửa mới (0,5 đơn vị mỗi điểm). Mã mới = mã cũ đổi đuôi -m thành -sc; hình cũ giữ nguyên (tinh cầu khai hoang còn dùng).
   SpriteCook giữ đúng cỡ sạp, tượng, giếng; cây thông, cây phong, trúc, cổ thụ lớn ra to hơn mẫu 1,2–1,4 lần; cờ ra to gấp 1,7 lần,
   thùng gỗ, hòm, rổ giỏ to gấp 2 lần (tấm mẫu thưa quá nên máy vẽ to cho đầy khung). Tệp hình giữ đúng cỡ máy vẽ ra, không lọc lại;
   máy sinh bản đồ (tools/the-gioi/tk_moi.py) dùng cờ, trúc đúng cỡ đó (cờ cao 3,25 ô, xếp thưa ra), thu thông và phong trong rừng
   còn 0,85 và 0,9, thu thùng, hòm, rổ còn 0,6 cho vừa tầm người.
2. Công trình riêng cho cổng Bí cảnh Huyết Nha (cổng đá hình hàm thú, xoáy đỏ tím) và cổng động phủ (hang đá cửa tròn, đèn lồng).
3. Thác Kiếm Tuyền chảy thật: 16 khung SpriteCook (8 khung mỗi giây). Phần đá, tuyết, cây lấy từ ảnh tĩnh cho khỏi nhấp nháy, chỉ vùng
   nước, bọt, sương lấy theo từng khung. Game vẽ bằng kiểu chuyển động `khung` (src/render/draw-hoi-tro.js).
Nguồn: tools/art/nguon/ai/the-gioi/tk3/ (sổ việc ở spritecook-assets.json → dot_3). Ra: assets/art/ + data/art.json + data/le-hoi.json.
Chạy: cd tools/art && python3 sc_tk.py && python3 sc_tk2.py && python3 sc_tk3.py"""
import hashlib
import json

import numpy as np
from PIL import Image

from png_nho import luu
from sc_tk import ART, OUT, ROOT, SCALE, SRC2
from sc_tk2 import N, cum, ghi_le_hoi, mon

SRC3 = ROOT / 'tools/art/nguon/ai/the-gioi/tk3'
FPS = 8   # thác: số khung mỗi giây SpriteCook trả về
# hai cổng: chắn như nhà (ô cổng P nằm ngay dưới bậc thềm, tools/the-gioi/tk_moi.py); quầng sáng đỏ máu cho cổng bí cảnh
KINDS = {'tk.cong-bi-canh-sc': 'nha', 'tk.cong-dong-phu-sc': 'nha'}
# cờ Thuỷ: khoá cũ 'co-thu' (cổ thụ, lắc như cây) nuốt mất 'co-thuy' nên cờ cũ lắc như cây; hình mới viết đủ tên để bay như cờ
# cổng bí cảnh: cả hình sáng lên tắt xuống theo nhịp (pulse) thay cho ô cổng xoáy cũ đã ẩn (bản đồ prop_hide "P")
ANIM = {'thac-sc': 'khung', 'co-thuy-sc': 'wave', 'cong-bi-canh-sc': 'pulse'}
GLOW = {'huyet': {'c': '255,84,104', 'r': 20, 'a': 0.2}}

# tấm → [(mã hình, khung cắt, ghi chú, thêm)]. thêm như sc_tk2 và: den_n (số đèn tối đa), lua (vạc lửa: game vẽ lưỡi lửa nhảy ở chân
# ngọn lửa vẽ sẵn), sang (đèn đặt tay [x, y, loại] theo điểm của hình đã cắt: đèn lồng đỏ, đèn giấy kem máy dò đèn của sc_tk2 không nhận ra,
# hoặc nhận nhầm hoa văn vàng trên mái bạt), lap (điểm lấp lánh đặt tay: nước vòi, cạnh tinh thể)
TAM = {
    'cay-1': [('tk.cay-anh-dao-sc', (41, 33, 158, 178), 'cây anh đào'), ('tk.cay-ngan-hanh-sc', (247, 33, 354, 178), 'cây ngân hạnh lá vàng'),
              ('tk.cay-phong-sc', (31, 220, 169, 392), 'cây phong lá đỏ'), ('tk.cay-thong-sc', (239, 205, 361, 393), 'cây thông')],
    'cay-2': [('tk.co-thu-lon-sc', (7, 15, 218, 244), 'Cổ Thụ Ngàn Năm', {'mau': 96}), ('tk.cay-co-thu-sc', (253, 40, 353, 170), 'cây cổ thụ thân vặn'),
              ('tk.truc-sc', (29, 278, 123, 384), 'khóm trúc'), ('tk.sen-chau-sc', (172, 319, 229, 370), 'cụm sen'),
              ('tk.sen-chau-2-sc', (292, 308, 345, 370), 'sen trồng chậu sứ lam')],
    'sap-1': [('tk.sap-kiem-sc', (32, 50, 167, 164), 'sạp binh khí', {N: 1, 'sang': [[11, 39, 'warm'], [119, 39, 'warm']]}),
              ('tk.sap-mi-sc', (233, 41, 372, 164), 'sạp mì', {N: 1, 'sang': [[12, 57, 'warm'], [122, 57, 'warm']]}),
              ('tk.sap-thuoc-sc', (33, 249, 165, 366), 'sạp thảo dược', {N: 1, 'sang': [[113, 52, 'warm']]}),
              ('tk.sap-vai-sc', (240, 295, 365, 366), 'sạp vải', {N: 1, 'sang': [[110, 29, 'warm']]})],
    'sap-2': [('tk.sap-thu-sc', (20, 15, 184, 157), 'quầy Ngự Thú (theo ảnh của chủ dự án 18/11)', {N: 1, 'sang': [[33, 71, 'warm'], [123, 71, 'warm']], 'bien': (77, 49, 50, 15)}),
              ('tk.sap-khoi-loi-sc', (220, 11, 384, 157), 'quầy Khôi Lỗi (theo ảnh của chủ dự án 18/11)', {N: 1, 'sang': [[40, 79, 'warm'], [121, 78, 'warm']], 'bien': (277, 50, 50, 15)}),
              ('tk.gieng-sc', (14, 293, 91, 382), 'giếng đá mái ngói'), ('tk.voi-nuoc-sc', (103, 310, 175, 382), 'vòi nước máng trúc', {'lap': [[18, 33], [26, 33], [34, 33], [42, 33], [38, 18], [36, 22]]}),
              ('tk.tuong-hac-sc', (187, 294, 234, 382), 'tượng hạc đá'), ('tk.tuong-rong-sc', (246, 278, 311, 382), 'tượng rồng đá'),
              ('tk.tuong-tien-sc', (325, 289, 386, 382), 'tượng tiên nhân ngồi')],
    'do-1': [('tk.den-da-sc', (28, 57, 67, 111), 'đèn đá', {'den': 'am', 'den_n': 1}), ('tk.vac-lua-sc', (120, 46, 162, 111), 'vạc lửa đồng', {'lua': 1}),
             ('tk.lu-huong-sc', (212, 46, 255, 111), 'lư hương đồng', {'khoi': 1}), ('tk.chuong-sc', (293, 36, 359, 111), 'chuông đồng treo giá gỗ đỏ'),
             ('tk.trong-rong-sc', (392, 38, 446, 111), 'trống rồng'), ('tk.bia-kiem-sc', (27, 165, 69, 244), 'bia đá khắc kiếm'),
             ('tk.bia-cung-sc', (108, 183, 174, 244), 'bia bắn cung'), ('tk.tru-moc-nhan-sc', (213, 188, 253, 244), 'mộc nhân'),
             ('tk.kiem-gia-vo-sc', (293, 160, 360, 244), 'giá binh khí'), ('tk.kiem-bay-sc', (397, 160, 442, 244), 'linh kiếm lơ lửng', {'den': 'lanh', 'den_n': 2})],
    'do-2': [('tk.co-do-sc', (9, 5, 74, 165), 'cờ đỏ phượng vàng'), ('tk.co-tong-sc', (84, 11, 145, 165), 'cờ tông môn âm dương'),
             ('tk.co-hoa-sc', (162, 50, 207, 158), 'cờ Hoả'), ('tk.co-kim-sc', (226, 49, 270, 158), 'cờ Kim'), ('tk.co-moc-sc', (290, 47, 333, 158), 'cờ Mộc'),
             ('tk.co-tho-sc', (353, 50, 397, 158), 'cờ Thổ'), ('tk.co-thuy-sc', (417, 50, 460, 158), 'cờ Thuỷ'),
             ('tk.thung-go-sc', (35, 189, 111, 258), 'ba thùng gỗ'), ('tk.thung-hom-sc', (201, 185, 281, 258), 'hòm gỗ và vò sành'),
             ('tk.ro-gio-sc', (334, 177, 465, 258), 'rổ giỏ, bao tải')],
    'cong': [('tk.cong-bi-canh-sc', (7, 21, 223, 260), 'cổng Bí cảnh Huyết Nha: cổng đá hình hàm thú, xoáy đỏ tím',
              {N: 1, 'sang': [[110, 114, 'huyet'], [25, 196, 'huyet'], [197, 178, 'huyet']],
               'lap': [[8, 172], [31, 198], [33, 203], [67, 222], [193, 183], [200, 198], [210, 184]]}),   # lap: cạnh sáng của tinh thể huyết thạch
             ('tk.cong-dong-phu-sc', (241, 9, 466, 257), 'cổng động phủ: hang đá cửa tròn, biển trống, hai đèn lồng', {N: 1, 'sang': [[58, 152, 'warm'], [161, 152, 'warm']], 'bien': (328, 118, 48, 12)})],
}
THAC = ('tk.thac-sc', (10, 0, 175, 186))   # cùng khung cắt với ảnh tĩnh ở sc_tk2 (tấm thac)


def lua(a):
    """Chân ngọn lửa vẽ sẵn trên vạc: cụm điểm cam vàng sáng lớn nhất ở nửa trên; trả [x giữa cụm, hàng đáy cụm]."""
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    m = (r > 215) & (g > 110) & (b < 120) & (al > 0)
    m[a.shape[0] // 2:] = False
    n, x0, y0, x1, y1, sx, sy = cum(m)[0]
    return [round(sx / n), y1]


def mo_rong(m, n):
    """Nở mặt nạ n điểm (4 hướng)."""
    for _ in range(n):
        p = np.pad(m, 1)
        m = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m


def thac(S):
    """Thác chảy: vùng nước (điểm đổi màu giữa các khung, bỏ đốm lẻ, nở 2 điểm) lấy theo từng khung, phần còn lại lấy từ ảnh tĩnh."""
    sid, box = THAC
    tinh = np.array(Image.open(SRC2 / 'thac.png').convert('RGBA').crop(box))
    tam = Image.open(SRC3 / 'thac-dong.png').convert('RGBA')
    W = tam.height   # khung vuông 186
    n = tam.width // W
    fr = [np.array(tam.crop((i * W + box[0], box[1], i * W + box[2], box[3]))) for i in range(n)]
    rgb = np.stack([f[..., :3].astype(int) for f in fr])
    al = np.stack([f[..., 3] > 127 for f in fr])
    dong = ((rgb.max(axis=0) - rgb.min(axis=0)).sum(axis=2) > 36) | (al.any(axis=0) != al.all(axis=0))
    keep = np.zeros_like(dong)
    for c in cum(dong):   # chỉ giữ các mảng động lớn (dòng nước, hồ, sương); đốm lẻ trên đá là nhiễu gom màu
        if c[0] >= 120:
            keep[c[2]:c[4], c[1]:c[3]] |= dong[c[2]:c[4], c[1]:c[3]]
    dong = mo_rong(keep, 2)
    out = []
    for f in fr:
        o = tinh.copy()
        o[dong] = f[dong]
        o[o[..., 3] <= 127] = 0
        o[..., 3] = np.where(o[..., 3] > 127, 255, 0)
        out.append(o)
    strip = Image.fromarray(np.concatenate(out, axis=1), 'RGBA')
    q = strip.convert('RGB').quantize(128, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    a = np.dstack([np.asarray(q), np.asarray(strip)[..., 3]])
    a[a[..., 3] == 0] = 0
    im = Image.fromarray(a, 'RGBA')
    f = OUT / (sid.replace('.', '-') + '.png')
    luu(im, f)
    w, h = box[2] - box[0], box[3] - box[1]
    S[sid] = {'file': f'assets/art/{f.name}', 'v': hashlib.sha1(f.read_bytes()).hexdigest()[:8], 'w': w, 'h': h, 'frames': n, 'fps': FPS,
              'anchor': [w // 2, h - 2], 'note': f'SpriteCook: thác Kiếm Tuyền chảy, {n} khung; đá lấy từ ảnh tĩnh (tools/art/sc_tk3.py)', 'scale': SCALE}
    print(f'{sid:26s} {w}×{h} × {n} khung, vùng nước {int(dong.sum())} điểm, {len(im.getcolors(1 << 20))} màu, {f.stat().st_size} byte')


def main():
    art = json.loads(ART.read_text(encoding='utf-8'))
    S = art['sprites']
    for tam, items in TAM.items():
        sheet = Image.open(SRC3 / f'{tam}.png').convert('RGBA')
        for sid, box, note, *rest in items:
            o = rest[0] if rest else {}
            e, a, bb = mon(S, sheet, sid, box, note, o, 'sc_tk3.py')
            if o.get('lua'):
                e['flame'] = lua(a)
            if o.get('sang'):
                e['lights'] = e.get('lights', []) + [list(v) for v in o['sang']]
            if o.get('lap'):   # điểm lấp lánh đặt tay (nước vòi màu lục lam nhạt, tinh thể đỏ: máy dò của sc_tk2 chỉ nhận nước lam sáng)
                e['glints'] = [list(v) for v in o['lap']]
    thac(S)
    ART.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    ghi_le_hoi({}, KINDS, ANIM, glow=GLOW)


if __name__ == '__main__':
    main()
