"""Bộ đồ mới của Thiên Kiếm Phong (chủ dự án 09/11/2026 12:00 gửi 16 tấm GPT nền trong suốt, nhìn thẳng mặt trước; giao toàn quyền:
"vừa đẹp vừa hợp lý, không đau mắt, màu nổi quá thì tự chỉnh"). Nguồn: nguon/ai/le-hoi/thien-kiem/moi/s01..s16.png.
Mỗi món cắt theo khung (y0, x0, y1, x1) trên tấm gốc, thu về điểm ảnh thật theo cỡ đơn vị bản đồ (người chuẩn cao 24, ô 16),
gom màu, bớt rực (SAT), viền mực, lưu tỉ lệ 0,5333 như đồ lễ hội (le_hoi.py). Đèn, lửa, mặt nước dò tự động; khói, cây lắc,
cờ bay, kiếm bay khai ở data/le-hoi.json → anim, vẽ bằng code (src/render/draw-hoi*.js).
Thêm: 5 căn nhà ô H (house.H-3, house.H-2) từ tấm nhà GPT 09/11/2026 11:30 (nguon/ai/props/nha-gpt-0911.png, nền tối: tách nền theo
độ phẳng màu).
Chạy riêng (không dựng lại toàn bộ): python3 -I tools/art/tk_moi.py — đọc data/art.json, thay các món này, ghi lại."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ai_import as AI  # noqa: E402
import le_hoi as LH  # noqa: E402
from px import Canvas, MANIFEST  # noqa: E402

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'le-hoi' / 'thien-kiem' / 'moi'
SC = LH.SC
SAT = 0.82   # giữ 82% độ rực: đồ nền không lấn người

# id: (tấm, (y0, x0, y1, x1), cỡ đơn vị, 'w' ngang / 'h' cao, hiệu ứng: fire, water, smoke@fx,fy (tỉ lệ trong hình), jade)
BO = {
    # s01 nhà nhỏ
    'tk.nha-ren-m': (1, (244, 10, 718, 382), 72, 'w', 'smoke@0.36,0.03'),   # lò rèn, ống khói
    'tk.nha-dan-m': (1, (328, 390, 718, 722), 64, 'w', 'jade'),   # nhà luyện đan, vạc xanh
    'tk.lau-sach-m': (1, (308, 733, 718, 1091), 74, 'w', ''),   # tàng kinh các
    'tk.quan-tra-m': (1, (338, 1091, 721, 1473), 78, 'w', ''),   # quán trà
    'tk.thap-canh-m': (1, (242, 1469, 713, 1769), 84, 'h', ''),   # tháp canh
    # s02 cổng
    'tk.cong-kiem-m': (2, (208, 0, 705, 458), 112, 'w', ''),   # cổng đá kiếm, sư tử
    'tk.cong-go-m': (2, (286, 477, 705, 869), 72, 'w', ''),   # cổng gỗ
    'tk.cong-trang-m': (2, (301, 871, 702, 1324), 80, 'w', ''),   # cổng trăng
    'tk.cong-do-m': (2, (216, 1293, 703, 1774), 96, 'w', ''),   # bài lâu đỏ
    # s03 điện
    'tk.dien-chinh-m': (3, (129, 28, 775, 851), 176, 'w', ''),   # đại điện
    'tk.dien-phu-m': (3, (264, 863, 771, 1328), 104, 'w', ''),   # điện phụ
    'tk.dien-nho-m': (3, (371, 1362, 771, 1739), 76, 'w', ''),   # điện nhỏ
    # s04 cây bụi
    'tk.bui-xanh-m': (4, (109, 146, 438, 585), 24, 'w', ''),
    'tk.bui-hong-m': (4, (68, 681, 438, 1105), 24, 'w', ''),
    'tk.truc-m': (4, (7, 1213, 438, 1623), 34, 'h', ''),
    'tk.bui-lau-m': (4, (470, 109, 869, 587), 24, 'w', ''),
    'tk.bui-cuc-m': (4, (465, 704, 869, 1102), 20, 'h', ''),
    'tk.sen-chau-m': (4, (484, 1229, 869, 1672), 22, 'h', ''),
    # s05 đèn
    'tk.den-da-m': (5, (461, 24, 860, 268), 24, 'h', ''),
    'tk.den-treo-m': (5, (303, 263, 860, 484), 32, 'h', ''),
    'tk.den-doi-m': (5, (256, 507, 860, 774), 40, 'h', ''),
    'tk.den-sen-m': (5, (382, 787, 860, 1052), 26, 'h', ''),
    'tk.den-dong-m': (5, (161, 1070, 860, 1332), 44, 'h', ''),
    'tk.den-nen-m': (5, (443, 1330, 860, 1505), 20, 'h', 'fire'),
    # s06 cây (cắt theo cột trống)
    'tk.cay-thong-m': (6, (190, 0, 720, 327), 68, 'h', ''),
    'tk.cay-anh-dao-m': (6, (190, 327, 720, 703), 70, 'h', ''),
    'tk.cay-phong-m': (6, (190, 703, 720, 1062), 70, 'h', ''),
    'tk.cay-ngan-hanh-m': (6, (190, 1062, 720, 1402), 70, 'h', ''),
    'tk.cay-co-thu-m': (6, (190, 1402, 720, 1774), 64, 'h', ''),
    # s07 luyện võ
    'tk.tru-moc-nhan-m': (7, (255, 40, 780, 399), 26, 'h', ''),
    'tk.bia-cung-m': (7, (281, 452, 779, 880), 28, 'h', ''),
    'tk.da-ta-m': (7, (457, 903, 780, 1338), 30, 'w', ''),
    'tk.kiem-gia-vo-m': (7, (291, 1353, 782, 1752), 28, 'h', ''),
    # s08 kiếm
    'tk.kiem-da-m': (8, (122, 7, 766, 369), 46, 'h', ''),
    'tk.kiem-gia-m': (8, (312, 392, 761, 768), 32, 'w', ''),
    'tk.bia-kiem-m': (8, (175, 794, 770, 1096), 38, 'h', ''),
    'tk.kiem-bay-m': (8, (214, 1129, 768, 1428), 38, 'h', ''),
    'tk.co-kiem-m': (8, (160, 1432, 771, 1762), 38, 'h', ''),
    # s09 cầu (nhìn ngang, cắt theo cột trống)
    'tk.cau-go-m': (9, (230, 0, 520, 535), 64, 'w', ''),
    'tk.cau-da-m': (9, (230, 535, 520, 1086), 64, 'w', ''),
    'tk.cau-do-m': (9, (230, 1086, 520, 1632), 64, 'w', ''),
    'tk.cau-van-m': (9, (230, 1632, 520, 2172), 64, 'w', ''),
    # s10 nước
    'tk.thac-m': (10, (209, 0, 751, 539), 50, 'w', 'water'),
    'tk.gieng-m': (10, (260, 526, 742, 938), 36, 'w', ''),
    'tk.voi-nuoc-m': (10, (328, 958, 750, 1382), 34, 'w', 'water'),
    'tk.sen-chau-2-m': (10, (312, 1392, 748, 1763), 26, 'h', ''),
    # s11 rào (mỗi đoạn 4 ô)
    'tk.lan-can-go-m': (11, (28, 32, 220, 1067), 64, 'w', ''),
    'tk.lan-can-da-m': (11, (18, 1113, 220, 2144), 64, 'w', ''),
    'tk.lan-can-do-m': (11, (247, 20, 461, 1068), 64, 'w', ''),
    'tk.lan-can-truc-m': (11, (247, 1105, 463, 2150), 64, 'w', ''),
    'tk.lan-can-hoa-m': (11, (502, 23, 692, 1076), 64, 'w', ''),
    'tk.lan-can-tuong-m': (11, (506, 1114, 692, 2145), 64, 'w', ''),
    # s12 đồ lễ
    'tk.lu-huong-m': (12, (201, 15, 712, 353), 28, 'h', 'smoke@0.45,0.02'),
    'tk.vac-lua-m': (12, (280, 377, 713, 672), 26, 'h', 'fire'),
    'tk.trong-rong-m': (12, (258, 690, 710, 1023), 34, 'h', ''),
    'tk.chuong-m': (12, (280, 1048, 713, 1369), 34, 'h', ''),
    'tk.ban-le-m': (12, (330, 1379, 717, 1765), 32, 'w', ''),
    # s13 tượng
    'tk.su-tu-m': (13, (226, 2, 812, 429), 36, 'h', ''),
    'tk.tuong-hac-m': (13, (137, 457, 812, 799), 42, 'h', ''),
    'tk.tuong-rong-m': (13, (69, 842, 812, 1295), 50, 'h', ''),
    'tk.tuong-tien-m': (13, (152, 1345, 812, 1769), 44, 'h', ''),
    # s14 chợ
    'tk.sap-mi-m': (14, (17, 24, 518, 567), 64, 'w', ''),
    'tk.sap-thuoc-m': (14, (36, 604, 520, 1149), 64, 'w', ''),
    'tk.sap-kiem-m': (14, (36, 1192, 514, 1750), 64, 'w', ''),
    'tk.sap-vai-m': (14, (540, 11, 858, 571), 60, 'w', ''),
    'tk.ro-gio-m': (14, (546, 611, 861, 1142), 34, 'w', ''),
    'tk.thung-go-m': (14, (619, 1177, 869, 1448), 18, 'w', ''),
    'tk.thung-hom-m': (14, (574, 1456, 861, 1765), 20, 'w', ''),
    # s15 đá
    'tk.da-reu-m': (15, (74, 97, 461, 646), 34, 'w', ''),
    'tk.da-cum-m': (15, (114, 678, 454, 1168), 30, 'w', ''),
    'tk.da-phu-van-m': (15, (31, 1210, 456, 1668), 30, 'h', ''),
    'tk.soi-m': (15, (664, 173, 847, 587), 18, 'w', ''),
    'tk.da-tim-m': (15, (565, 717, 858, 1121), 22, 'w', ''),
    'tk.bia-trong-m': (15, (457, 1244, 863, 1627), 28, 'h', ''),
    # s16 cờ
    'tk.co-tong-m': (16, (23, 32, 828, 318), 46, 'h', ''),
    'tk.co-do-m': (16, (45, 335, 828, 642), 46, 'h', ''),
    'tk.co-hoa-m': (16, (256, 641, 828, 852), 32, 'h', ''),
    'tk.co-thuy-m': (16, (256, 859, 828, 1061), 32, 'h', ''),
    'tk.co-moc-m': (16, (249, 1077, 828, 1284), 32, 'h', ''),
    'tk.co-tho-m': (16, (249, 1300, 828, 1516), 32, 'h', ''),
    'tk.co-kim-m': (16, (253, 1533, 828, 1748), 32, 'h', ''),
}


def _alpha(a):
    a = a.copy()
    a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0)
    return a


def _calm(a):
    """Bớt rực: kéo màu về xám cùng độ sáng theo SAT."""
    rgb = a[:, :, :3].astype(float)
    l = (rgb * [0.3, 0.59, 0.11]).sum(axis=2, keepdims=True)
    a = a.copy(); a[:, :, :3] = np.clip(l + (rgb - l) * SAT, 0, 255).astype(np.uint8)
    return a


def _pal(sid):
    """Lưu lại dạng bảng màu (đồ ít hơn 50 màu, nhẹ hơn ba lần để tải và đẩy lên kho), cập nhật mã nội dung."""
    import hashlib
    from px import ROOT
    f = ROOT / MANIFEST[sid]['file']
    Image.open(f).convert('RGBA').quantize(256, method=Image.Quantize.FASTOCTREE).save(f, optimize=True)
    MANIFEST[sid]['v'] = hashlib.sha1(f.read_bytes()).hexdigest()[:8]


def _jade(a):
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    return LH._spots(a, (g > 200) & (g - r > 60) & (g - b > 40), 10, 2)


def build(save):
    srcs, n = {}, 0
    if not SRC.exists():   # ảnh gốc không vào kho (.gitignore): máy không có thì giữ nguyên hình cũ, báo để chép ảnh gốc về
        print('  thiếu ảnh gốc', SRC, '— bỏ qua bộ mới Thiên Kiếm Phong (đừng dựng lại toàn bộ khi thiếu, hình tk.*-m sẽ mất)')
        return 0
    for sid, (sheet, (y0, x0, y1, x1), units, by, fx) in BO.items():
        if sheet not in srcs:
            srcs[sheet] = _alpha(np.array(Image.open(SRC / f's{sheet:02d}.png').convert('RGBA')))
        cell = srcs[sheet][y0:y1, x0:x1]
        lab, k = nd.label(nd.binary_dilation(cell[:, :, 3] > 0, iterations=8))   # chỉ giữ cụm lớn nhất (bỏ mẩu món bên cạnh)
        if k > 1:
            sizes = nd.sum(cell[:, :, 3] > 0, lab, range(1, k + 1))
            cell = cell.copy(); cell[lab != 1 + int(np.argmax(sizes)), 3] = 0
        a = LH._make(_calm(LH._crop(cell)), units, by, 40 if units > 60 else 28)
        c = Canvas(a.shape[1], a.shape[0]); c.a = a
        save(sid, [c], (c.w // 2, c.h - 2), f'Thiên Kiếm Phong bộ mới: moi/s{sheet:02d}.png ({units} đơn vị {"cao" if by == "h" else "ngang"})')
        _pal(sid)
        m = MANIFEST[sid]; m['scale'] = SC
        lights = LH._lights(a) + ([[x, y, 'jade'] for x, y in _jade(a)] if 'jade' in fx else [])
        if lights: m['lights'] = lights
        if 'water' in fx: m['glints'] = LH._glints(a)
        if 'fire' in fx:
            f = LH._flame(a)
            if f: m['flame'] = f
        for part in fx.split():
            if part.startswith('smoke@'):
                fxr, fyr = (float(v) for v in part[6:].split(','))
                m['smoke'] = [round(fxr * c.w), round(fyr * c.h)]
        n += 1
    return n + houses(save)


# ---- nhà ô H (5 căn) ----
NHA = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'props' / 'nha-gpt-0911.png'


def _house_cells():
    a = np.array(Image.open(NHA).convert('RGB')).astype(float)
    mx = a.max(2); lum = a.mean(2)
    m = nd.uniform_filter(lum, 7); v = nd.uniform_filter(lum * lum, 7) - m * m
    cand = (mx < 80) & (v < 12)   # nền tối phẳng màu (ảnh có quầng tối dần)
    lab, _ = nd.label(cand)
    edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
    bg = np.isin(lab, list(edge))
    bg = (nd.binary_dilation(bg, iterations=2) & (mx < 70) & ~((a[..., 2] - a[..., 0] >= 8) & (mx < 45))) | bg
    fg = nd.binary_opening(nd.binary_fill_holes(~bg), iterations=2)
    L, k = nd.label(fg); sizes = nd.sum(fg, L, range(1, k + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s > 15000]
    out = np.dstack([a, np.where(np.isin(L, keep), 255, 0)]).astype(np.uint8)
    objs = nd.find_objects(L)
    boxes = sorted([objs[i - 1] for i in keep], key=lambda s: (s[0].start // 400, s[1].start))
    return [out[b] for b in boxes][:5]   # căn thứ 6 là cổng, không làm nhà


def _box_shrink(a, H):
    """Thu nhỏ trung bình vùng (nét đều hơn màu đa số ở tỉ lệ ~1:10), tăng tương phản nhẹ, gom 24 màu, viền mực."""
    al = a[:, :, 3:] / 255; pre = a.astype(float); pre[:, :, :3] *= al
    w = round(a.shape[1] * (H - 2) / a.shape[0])
    p = np.array(Image.fromarray(pre.astype(np.uint8)).resize((w, H - 2), Image.BOX)).astype(float)
    A = p[:, :, 3]
    rgb = np.where(A[..., None] > 0, p[:, :, :3] * 255 / np.maximum(A[..., None], 1), 0)
    rgb = np.clip((rgb - 128) * 1.12 + 132, 0, 255)
    q = np.array(Image.fromarray(rgb.astype(np.uint8)).quantize(24, method=Image.Quantize.MEDIANCUT).convert('RGB'))
    out = np.zeros((H - 2, w, 4), np.uint8); out[:, :, :3] = q; out[:, :, 3] = (A > 110) * 255
    return AI.outline(out)


def houses(save):
    if not NHA.exists():
        return 0
    cells = _house_cells()
    for name, H in (('H-3', 44), ('H-2', 30)):
        ims = [_box_shrink(c, H) for c in cells]
        w = max(i.shape[1] for i in ims); h = max(i.shape[0] for i in ims)
        frames = []
        for im in ims:
            c = Canvas(w, h); c.a = np.zeros((h, w, 4), np.uint8)
            x = (w - im.shape[1]) // 2; c.a[h - im.shape[0]:, x:x + im.shape[1]] = im
            frames.append(c)
        save(f'house.{name}', frames, (w // 2, h - 1), f'5 nhà ảnh GPT chủ dự án gửi 09/11/2026 11:30 (gỗ hiên, mái tranh, có mái che bán hàng, tường trắng, miếu nhỏ); mỗi khối nhà một căn theo vị trí (draw-ground.js)')
    return 2


if __name__ == '__main__':
    import json
    from px import ROOT, save, write_manifest
    MANIFEST.update(json.loads((ROOT / 'data' / 'art.json').read_text(encoding='utf-8'))['sprites'])
    print('bộ mới Thiên Kiếm Phong:', build(save))
    write_manifest()
