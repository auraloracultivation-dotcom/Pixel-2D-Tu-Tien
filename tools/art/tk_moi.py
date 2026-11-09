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

# Hàn Băng Tinh bộ mới (chủ dự án 09/11/2026 12:12 gửi 14 tấm, nguồn nguon/ai/le-hoi/han-bang/moi/s01..s14.png)
SRC_HB = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'le-hoi' / 'han-bang' / 'moi'
BO_HB = {
    'hb.dien-bang-m': (1, (0, 200, 598, 1250), 176, 'w', ''),
    'hb.dien-tuyet-m': (1, (600, 0, 1010, 760), 104, 'w', ''),
    'hb.dien-nho-m': (1, (598, 770, 1010, 1536), 100, 'w', ''),
    'hb.nha-tuyet-m': (2, (353, 6, 733, 388), 64, 'w', 'smoke@0.32,0.0'),
    'hb.nha-pha-le-m': (2, (303, 393, 725, 768), 60, 'w', ''),
    'hb.thap-tuyet-m': (2, (133, 767, 730, 1062), 100, 'h', ''),
    'hb.nha-ca-m': (2, (300, 1062, 730, 1393), 64, 'w', ''),
    'hb.quan-tra-m': (2, (352, 1390, 728, 1774), 66, 'w', ''),
    'hb.cay-tung-tuyet-m': (3, (2, 29, 511, 436), 70, 'h', ''),
    'hb.cay-kho-m': (3, (15, 470, 511, 997), 66, 'h', ''),
    'hb.cay-mai-m': (3, (7, 1034, 511, 1517), 64, 'h', ''),
    'hb.lieu-bang-m': (3, (518, 18, 999, 544), 66, 'h', ''),
    'hb.cay-tung-nho-m': (3, (552, 589, 987, 947), 52, 'h', ''),
    'hb.cay-bang-m': (3, (528, 1017, 987, 1512), 62, 'h', ''),
    'hb.den-da-tuyet-m': (4, (30, 190, 510, 508), 26, 'h', ''),
    'hb.den-linh-m': (4, (16, 607, 511, 892), 36, 'h', ''),
    'hb.den-bang-m': (4, (0, 1000, 511, 1347), 38, 'h', ''),
    'hb.den-giay-m': (4, (516, 186, 999, 477), 36, 'h', ''),
    'hb.den-dong-m': (4, (538, 614, 993, 919), 30, 'h', ''),
    'hb.den-sen-m': (4, (577, 1012, 992, 1348), 28, 'h', ''),
    'hb.bui-tuyet-m': (5, (433, 18, 685, 341), 24, 'w', ''),
    'hb.bui-hoa-bang-m': (5, (392, 350, 687, 614), 22, 'h', ''),
    'hb.bui-co-trang-m': (5, (371, 622, 690, 887), 22, 'w', ''),
    'hb.bui-lau-m': (5, (338, 899, 687, 1150), 26, 'h', ''),
    'hb.sen-bang-m': (5, (436, 1151, 687, 1456), 24, 'w', ''),
    'hb.bui-mai-m': (5, (373, 1468, 685, 1756), 26, 'h', ''),
    'hb.pha-le-lon-m': (6, (0, 80, 548, 575), 44, 'h', ''),
    'hb.pha-le-tim-m': (6, (87, 657, 548, 1080), 36, 'h', ''),
    'hb.tru-pha-le-m': (6, (1, 1149, 548, 1469), 44, 'h', ''),
    'hb.manh-bang-m': (6, (680, 70, 975, 560), 30, 'w', ''),
    'hb.pha-le-dai-m': (6, (563, 618, 992, 1043), 36, 'h', ''),
    'hb.qua-cau-bang-m': (6, (619, 1142, 1001, 1485), 40, 'h', ''),
    'hb.da-tuyet-m': (7, (385, 5, 675, 340), 34, 'w', ''),
    'hb.da-bang-m': (7, (385, 347, 673, 630), 30, 'h', ''),
    'hb.bia-van-m': (7, (366, 641, 670, 897), 32, 'h', ''),
    'hb.soi-tuyet-m': (7, (480, 906, 671, 1163), 24, 'w', ''),
    'hb.bia-cua-m': (7, (334, 1174, 672, 1442), 34, 'h', ''),
    'hb.da-vach-m': (7, (390, 1447, 673, 1769), 40, 'w', ''),
    'hb.thac-bang-m': (8, (9, 34, 584, 864), 56, 'w', 'water'),
    'hb.gieng-bang-m': (8, (34, 899, 581, 1472), 40, 'w', ''),
    'hb.da-khoi-bang-m': (8, (629, 51, 1011, 825), 44, 'w', ''),
    'hb.da-nhu-bang-m': (8, (597, 872, 1015, 1496), 48, 'w', ''),
    'hb.cau-go-m': (9, (252, 11, 541, 551), 64, 'w', ''),
    'hb.cau-da-m': (9, (259, 562, 542, 1078), 64, 'w', ''),
    'hb.cau-bang-m': (9, (248, 1090, 545, 1622), 64, 'w', ''),
    'hb.cau-day-m': (9, (257, 1634, 545, 2148), 64, 'w', ''),
    'hb.lan-can-go-m': (10, (108, 38, 338, 752), 64, 'w', ''),
    'hb.lan-can-da-m': (10, (94, 790, 338, 1508), 64, 'w', ''),
    'hb.lan-can-bang-m': (10, (409, 42, 641, 751), 64, 'w', ''),
    'hb.lan-can-truc-m': (10, (407, 789, 642, 1512), 64, 'w', ''),
    'hb.lan-can-tuyet-m': (10, (720, 7, 934, 767), 64, 'w', ''),
    'hb.lan-can-tuong-m': (10, (712, 776, 932, 1515), 64, 'w', ''),
    'hb.nguoi-tuyet-m': (11, (318, 11, 628, 289), 28, 'h', ''),
    'hb.cui-m': (11, (389, 295, 625, 595), 30, 'w', ''),
    'hb.thung-tuyet-m': (11, (382, 607, 624, 861), 26, 'w', ''),
    'hb.ro-ca-m': (11, (393, 881, 622, 1129), 26, 'w', ''),
    'hb.xe-truot-m': (11, (382, 1122, 628, 1520), 36, 'w', ''),
    'hb.lua-trai-m': (11, (395, 1527, 628, 1771), 28, 'w', 'fire'),
    'hb.cong-bang-m': (12, (232, 15, 686, 449), 80, 'w', ''),
    'hb.cong-go-m': (12, (284, 455, 689, 872), 72, 'w', ''),
    'hb.cong-trang-m': (12, (229, 896, 689, 1343), 80, 'w', ''),
    'hb.cong-tron-m': (12, (305, 1354, 690, 1772), 80, 'w', ''),
    'hb.lu-huong-m': (13, (251, 11, 771, 378), 30, 'h', ''),
    'hb.vac-bang-m': (13, (361, 376, 782, 727), 28, 'h', ''),
    'hb.guong-trang-m': (13, (310, 742, 779, 1067), 38, 'h', ''),
    'hb.chuong-m': (13, (273, 1094, 782, 1382), 40, 'h', ''),
    'hb.ban-le-m': (13, (415, 1405, 784, 1760), 36, 'w', ''),
    'hb.sap-lau-m': (14, (58, 23, 503, 481), 60, 'w', ''),
    'hb.sap-ruou-m': (14, (56, 506, 504, 1002), 60, 'w', ''),
    'hb.sap-long-m': (14, (58, 1019, 504, 1515), 60, 'w', ''),
    'hb.sap-thuoc-m': (14, (564, 16, 968, 494), 60, 'w', ''),
    'hb.sap-thit-m': (14, (589, 515, 957, 991), 56, 'w', ''),
    'hb.sap-tra-m': (14, (549, 1023, 953, 1513), 60, 'w', ''),
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


# Cảnh lớn ven vòng đường quanh đảo (tools/mo-rong-dao.py marks): cùng hình nhưng to hẳn để đứng xa đã thấy, đáng đi tới xem
LON = {'tk.co-thu-lon-m': ('tk.cay-co-thu-m', 104), 'tk.kiem-trung-m': ('tk.kiem-da-m', 84), 'tk.tien-dai-m': ('tk.tuong-tien-m', 76),
       'tk.nguyet-mon-m': ('tk.cong-trang-m', 112), 'hb.thac-bang-lon-m': ('hb.thac-bang-m', 96), 'hb.pha-le-to-m': ('hb.pha-le-lon-m', 80),
       'hb.bang-tam-chau-m': ('hb.qua-cau-bang-m', 66), 'hb.nhu-bang-lon-m': ('hb.da-nhu-bang-m', 84), 'hb.han-ngoc-tru-m': ('hb.tru-pha-le-m', 84)}


def build(save):
    for k, (src, units) in LON.items():
        B = BO if src in BO else BO_HB
        B[k] = B[src][:2] + (units,) + B[src][3:]
    return _build(save, SRC, BO) + _build(save, SRC_HB, BO_HB) + houses(save) + sign(save)


def sign(save):
    """Biển gỗ chỉ lối (vẽ bằng code): cọc gỗ, tấm ván hai lớp, đinh, rêu chân cọc. Chữ tên vùng game tự vẽ khi đi gần
    (src/render/draw-hoi.js, món có nhãn ở phần tử thứ tư trong khoá hoi.do)."""
    W, H = 22, 22
    a = np.zeros((H, W, 4), np.uint8)
    def r(x0, y0, x1, y1, c): a[y0:y1, x0:x1] = list(bytes.fromhex(c)) + [255]
    r(9, 7, 13, 21, '1b1830'); r(10, 8, 12, 21, '7a4e2e'); r(10, 8, 11, 21, '9a6a3e')   # cọc
    r(1, 2, 21, 12, '1b1830'); r(2, 3, 20, 11, 'a8743f'); r(2, 3, 20, 4, 'c99256'); r(2, 7, 20, 8, '8a5a30')   # ván, mép sáng, khe ván
    r(2, 10, 20, 11, '7a4a28')
    for x in (3, 18): r(x, 5, x + 1, 6, '4a3a3a'); r(x, 9, x + 1, 10, '4a3a3a')   # đinh
    r(7, 19, 16, 21, '1b1830'); r(8, 19, 15, 20, '5a8a4a'); r(12, 18, 14, 19, '6a9a52')   # cỏ chân cọc
    c = Canvas(W, H); c.a = a
    save('chung.bien-go', [c], (W // 2, H - 1), 'biển gỗ chỉ lối vẽ bằng code (tools/art/tk_moi.py sign)')
    MANIFEST['chung.bien-go']['scale'] = SC
    return 1


def _build(save, SRC, BO):
    srcs, n = {}, 0
    if not SRC.exists():   # ảnh gốc không vào kho (.gitignore): máy không có thì giữ nguyên hình cũ, báo để chép ảnh gốc về
        print('  thiếu ảnh gốc', SRC, '— bỏ qua (đừng dựng lại toàn bộ khi thiếu, hình *-m sẽ mất)')
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
        save(sid, [c], (c.w // 2, c.h - 2), f'bộ mới {SRC.parent.name}: moi/s{sheet:02d}.png ({units} đơn vị {"cao" if by == "h" else "ngang"})')
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
    return n


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
