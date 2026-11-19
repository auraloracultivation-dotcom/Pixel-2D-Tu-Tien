"""Thiên Kiếm Tinh dựng theo luật thế giới (docs/12-LUAT-THE-GIOI.md). Chủ dự án 18/11/2026 11:03 "tôi muốn xây lại thiên kiếm tinh",
13:23 "đẹp nhưng tinh cầu chưa đủ rộng, nên hơi chật… giúp tui làm lại toàn bộ": đĩa nới từ 92 lên 128 ô (rộng gần gấp đôi), các khu
giãn ra, nhà cửa, núi, cầu, đá, hoa bụi, mép tinh cầu dùng hình SpriteCook mới (tools/art/sc_tk.py, sc_tk2.py). 23:06 "Làm tiếp":
cây, đèn đá, tượng, cờ, vạc lửa, sạp hàng cũng đổi sang hình SpriteCook, thác chạy 16 khung, cổng Bí cảnh Huyết Nha và cửa động phủ
có công trình riêng (tools/art/sc_tk3.py).
Máy này sinh ra data/maps/thien-kiem-phong.json — KHÔNG sửa tay tệp đó: sửa ở đây rồi chạy lại.
Bố cục (đĩa 128 ô, tâm 64): pháp trận truyền tống ở quảng trường (64, 76), ba đại lộ gạch rộng 4 ô và một lối vườn rộng 2 ô —
  bắc: cổng tông môn, sân Thiên Kiếm Tông, Thiên Kiếm Điện tựa vào Thiên Kiếm Phong;   đông: phường chợ;
  nam: xóm dân quanh Suối Vọng Nguyệt, cuối lối là Tiên Đài ngắm sao ở mép tinh cầu;
  tây: Nguyệt Môn vào vườn ven sông, Cầu Vọng Tiên sang động phủ.
Sông: nguồn ở Thác Kiếm Tuyền dưới núi tây bắc, chảy xuôi nam vào hồ Bích Thủy (hai bến câu, đình ven hồ); ba chỗ qua sông: cầu dây
phía bắc, cầu đá giữa, đá bước phía nam. Vòng ngoài là rừng, bãi quái, di tích cuối đường mòn; ngoài mép là các hòn đất nổi.
Chạy: python3 tools/the-gioi/tk_moi.py            ghi bản đồ thật + vùng phố, lối khách, người bán hội (data/le-hoi.json) + chỗ NPC đồ cũ
                                                  (data/do-cu.json) + chỗ đầu boss cũ cho bài kiểm máy chủ phòng (cloud/src/mang-cfg.js)
      python3 tools/the-gioi/tk_moi.py --nhap     chỉ ghi bản nháp tools/the-gioi/nhap/ để xem trước (toan_canh.py)
Cảnh tự nhiên, núi ở tk_moi_canh.py. Toạ độ ở đây là toạ độ ô THẬT (như đồ hoi.do); NPC, điểm tới lúc ghi ra lùi 0,5 vì game đặt ở tâm ô."""
import json
import math
import sys
from pathlib import Path

import ban_do
from ban_do import Canh, ROOT

D, C = 128, 64
MAP = ROOT / 'data/maps/thien-kiem-phong.json'
NHAP = Path(__file__).parent / 'nhap' / 'thien-kiem-phong.json'
PLAZA = TRAN = (64, 76)   # tâm quảng trường = tâm pháp trận
BAY_TU = 14   # bố cục "Bày cảnh" lưu trên máy chủ tới bản này là của bản đồ cũ: game bỏ qua (src/ui/bay-canh-start.js)
NEN = {'nuoc': 'nen.tk-nuoc', 'dat': 'nen.tk-dat', 'san': 'nen.tk-san', 'gach': 'nen.tk-gach', 'nui': 'nen.tk-nui', 'mep': 'nen.tk-mep',
       'vach': 'nen.tk-vach', 'hoa': 'nen.tk-hoa'}

# ---- mốc cố định: NPC, cổng, bãi quái (đặt trước, mọi thứ khác né ra) ----
NPCS = [
    ('van-hac', 64, 37.6), ('lac-tuyet', 70.5, 82.6, {'unless': 'lac-tuyet-vang'}), ('tieu-dao', 57.5, 82.6, {'unless': 'tieu-dao-vang'}),
    ('chap-su', 52, 68.3), ('ho-linh', 45.4, 64.6), ('quan-binh-kho', 105.5, 74.3), ('ngu-thu-su', 87.5, 95.5), ('khoi-loi-su', 95, 95.5), ('tiem-thoi-trang', 102, 95.5),
    ('van-bao', 86, 74.2), ('chu-cho', 96, 74.2), ('to-doi', 69.5, 85, {'need': 'mo-bi-canh'}), ('tieu-phu', 96, 44.6),
    ('dc-dong-phuc-nu', 58.5, 94.4), ('dc-thanh-sam-nam', 83.4, 79.6), ('dc-tien-nhan-nam', 74.2, 44.4), ('dc-hoang-kim-nu', 112, 74.3),
    ('dc-kim-bao-nam', 84.4, 86.3), ('dc-kim-bao-nu', 90.9, 86.3), ('dc-thien-kiem-bao-nam', 57, 45.6), ('dc-thien-kiem-bao-nu', 70, 106),
]
GATES = {'bi-canh': (92, 108), 'dong-phu': (20, 76)}   # ô P: cổng riêng ngoài phố (luật pháp trận); công trình cổng đứng ngay trên ô P, mặt quay xuống nam
DA_TOA = [(58, 47), (22, 78)]                          # ô M bồ đoàn: sân tông môn (tự hành ngồi ở đây), trước động phủ
FLY = [('dao-xich-dien', 'ngu-kiem', 'Xích Diễm Tinh', 'tu-xich-dien'), ('dao-han-bang', 'han-bang', 'Hàn Băng Tinh', 'tu-han-bang'),
       ('hac-phong-dao', 'hac-phong', 'Hắc Phong Tinh', 'tu-hac-phong'), ('dao-moc', 'dao-moc', 'Thanh Mộc Tinh', 'tu-dao-moc'),
       ('dao-thien-kim', 'dao-kim', 'Thiên Kim Tinh', 'tu-thien-kim'), ('dao-hau-tho', 'dao-tho', 'Hậu Thổ Tinh', 'tu-hau-tho'),
       ('vet-nut-ngoai', 'vet-nut', 'Ngoại Vực Vết Nứt', 'tu-vet-nut')]
# bãi quái (x, y, thêm): bãi đầu cho người mới ở tây nam xóm dân; bốn bãi vòng trong; năm bãi sát mép quái gấp đôi (càng xa phố càng mạnh);
# cách vùng phố từ 3 ô, cách cổng bí cảnh trên 9 ô
CAMPS = [(46, 112, {'n': 4, 'spread': 6, 'respawn': 6}), (40, 51, {'farm': True}), (97, 54, {'farm': True}), (112, 58, {'farm': True}),
         (20, 40, {'farm': True}), (15, 58, {'farm': True, 'mul': 2}), (116, 44, {'farm': True, 'mul': 2}), (113, 92, {'farm': True, 'mul': 2}),
         (104, 104, {'farm': True, 'mul': 2}), (84, 118, {'farm': True, 'mul': 2})]
# phố (quái không vào): tông môn, quảng trường + Nhiệm Vụ Đường, vườn và lối tây, chợ, cuối phố đông, xóm dân, Tàng Kinh Các
KHU = [[45, 22, 83, 62], [47, 61, 80, 88], [36, 55, 48, 78], [80, 64, 108, 99], [108, 66, 116, 79], [50, 86, 79, 115], [84, 36, 92, 45]]
# người bán của hội (data/le-hoi.json → khach.ban): bốn người đứng sạp (game tự kéo về góc phải sạp gần nhất), bốn người đứng chỗ khai
BAN = [['thuong-nhan', 86, 85], ['lao-than', 92.5, 85], ['ba-do-den', 99, 85], ['co-ban-nuoc', 106, 95],
       ['tho-kim-sa', 102.6, 80.4], ['ong-hai-nam', 76.6, 106.8], ['ong-do', 60.4, 100.6], ['lao-nong', 58.6, 106.4]]


def lim(x):
    """Hàng dưới cùng của dãy núi ở cột x: dãy dày nhất ở tây bắc (thác) và đông bắc; sau lưng Thiên Kiếm Điện núi ăn xuống sát nhà."""
    if 59 <= x <= 68:
        return 34
    return 20.5 + 6.5 * math.exp(-((x - 30) / 11) ** 2) + 3.0 * math.exp(-((x - 100) / 9) ** 2)


def terrain(S):
    G, R = S.G, S.R
    jag = [R.random() for _ in range(D + 1)]
    for x in range(D):
        top = lim(x) + (0 if 59 <= x <= 68 else (jag[x] + jag[x + 1]) * 0.9)
        for y in range(int(top)):
            G.set(x, y, '^')
    # sông: thác (30, 29) → khúc thẳng cho cầu dây (hàng 45–46) → khúc thẳng cho cầu đá (hàng 75–76) → khúc hẹp cho đá bước (hàng 88) → hồ
    for seg, w in ((ban_do.smooth([(30, 29.5), (29, 35), (30.5, 41)], 6), 4.4), ([(30.5, 41), (30.5, 51)], 5),
                   (ban_do.smooth([(30.5, 51), (33, 58), (33.5, 65), (32.5, 70)], 6), 4.4), ([(32.5, 70), (32.5, 82)], 5),
                   (ban_do.smooth([(32.5, 82), (31.3, 84.5), (30.5, 86)], 4), 4), ([(30.5, 86), (30.5, 91.5)], 3), ([(30.5, 91.5), (29.5, 95)], 4.2)):
        G.stroke(seg, w, '=', keep='~')
    G.disc(26, 101, 11, '=', ry=7)
    G.disc(22, 105, 4.5, '=', ry=3.2)
    G.disc(42.5, 62.4, 2.8, '=', ry=1.5)   # ao sen trong vườn Nguyệt Môn
    # quảng trường, đại lộ bắc / đông / nam (4 ô), lối vườn tây (2 ô), sân tông môn, sân chợ, quảng trường suối, các thềm
    G.disc(*PLAZA, 14, '2', ry=10.5)
    G.rect(62, 50, 65, 66, '1'); G.rect(78, 74, 110, 77, '1'); G.rect(62, 86, 65, 108, '1'); G.rect(36, 75, 50, 76, '1')
    G.rect(47, 34, 80, 49, '2'); G.disc(64, 98, 5.6, '2', ry=4.3)
    G.rect(82, 78, 106, 96, '2'); G.rect(82, 87, 106, 88, '1')   # sân chợ, giữa hai dãy sạp là một lối gạch; bốn góc sân vát một ô
    for x, y in ((82, 96), (106, 96)):
        G.set(x, y, '.')
    G.rect(47, 66, 57, 70, '2')                       # thềm Nhiệm Vụ Đường
    G.rect(85, 40, 91, 44, '2')                       # thềm Tàng Kinh Các
    G.rect(42, 64, 43, 73, '2', keep='~=')            # lối đá trong vườn, từ Nguyệt Môn tới ao sen
    G.rect(38, 100, 44, 103, '2', keep='~=')          # thềm đình ven hồ
    G.rect(109, 72, 115, 73, '2')                     # thềm tiệm đan dược cuối phố đông
    G.disc(64.5, 120.8, 4.4, '2', ry=2.0)             # đài ngắm sao trước mặt tượng Tiên Đài
    gx, gy = GATES['bi-canh']
    G.disc(gx + 0.5, gy + 1.9, 3.6, ',', keep='~=^12', ry=2.1)   # sân đất dưới chân bậc cổng bí cảnh (lối tới vòng bên tây, tránh bãi quái phía đông)
    dx, dy = GATES['dong-phu']
    G.rect(dx - 1, dy, dx + 2, dy + 1, ',', keep='~=^12')          # thềm đất trước cửa động phủ
    for x, y in GATES.values():
        G.set(x, y, 'P')
    for x, y in DA_TOA:
        G.set(x, y, 'M')


def build(S):
    P = S.put
    for n in NPCS:
        S.keep.append((n[1], n[2], 0.6))
    for _, x, y in BAN:
        S.keep.append((x, y + 0.6, 0.5))
    for x, y in list(GATES.values()) + DA_TOA:
        S.keep.append((x + 0.5, y + 0.5, 1.6 if (x, y) in GATES.values() else 1.0))
    S.keep.append((TRAN[0], TRAN[1], 7))
    for x, y, _ in CAMPS:
        S.clear.append((x + 0.5, y + 0.5, 5.5))
    # --- bắc: Thiên Kiếm Tông ---
    P('tk.dien-chinh-sc', 64, 36, label='Thiên Kiếm Điện')
    P('tk.dien-phu-sc', 52, 43, label='Luyện Võ Đường'); P('tk.dien-phu-sc', 76, 43, label='Truyền Công Đường')
    P('tk.cong-kiem-sc', 64, 60, on='.12', label='Thiên Kiếm Tông')
    P('tk.lau-sach-sc', 88, 42.6, label='Tàng Kinh Các'); P('tk.thap-canh-sc', 40, 41)
    for i, sid in enumerate(['tk.co-moc-sc', 'tk.co-hoa-sc', 'tk.co-tho-sc', 'tk.co-kim-sc', 'tk.co-thuy-sc']):
        P(sid, 59.4, 38.2 + i * 2.4); P(sid, 68.6, 38.2 + i * 2.4)   # cờ mới cao 3,25 ô: cách nhau 2,4 ô cho lá cờ sau không che lá cờ trước
    P('tk.co-tong-sc', 61.3, 49.8); P('tk.co-do-sc', 66.7, 49.8); P('tk.lu-huong-sc', 64, 41.6)
    P('tk.vac-lua-sc', 61.2, 38.4); P('tk.vac-lua-sc', 66.8, 38.4); P('tk.kiem-bay-sc', 64, 45.6)
    P('tk.sen-chau-sc', 57.8, 37.2); P('tk.sen-chau-2-sc', 70.2, 37.2); P('tk.tuong-hac-sc', 48.6, 36.4); P('tk.tuong-hac-sc', 79.4, 36.4, f=1)
    P('tk.chuong-sc', 56.5, 48.8); P('tk.trong-rong-sc', 71.5, 48.8); P('tk.tuong-rong-sc', 77, 47.8)
    P('tk.tru-moc-nhan-sc', 47.8, 47.6); P('tk.tru-moc-nhan-sc', 49.8, 47.6); P('tk.kiem-gia-vo-sc', 48.6, 45.4)
    # --- giữa: pháp trận truyền tống (một cái duy nhất), Nhiệm Vụ Đường ---
    P('tk.tran-truyen-tong-sc', TRAN[0], TRAN[1] + 5.6, force=True, label='Pháp Trận Truyền Tống')
    P('tk.dien-nho-sc', 52, 67, label='Nhiệm Vụ Đường')
    for dx, dy in ((-11.4, -3.6), (11.4, -3.6), (-11.4, 4.4), (11.4, 4.4)):
        P('tk.vac-lua-sc', PLAZA[0] + dx, PLAZA[1] + dy)
    P('tk.tuong-hac-sc', 59.6, 67.4); P('tk.tuong-hac-sc', 68.4, 67.4, f=1)
    # --- đông: phường chợ (bốn lầu quay mặt ra đại lộ; hai dãy sạp cách nhau một lối rộng, dãy sau không che người đứng trước dãy trước) ---
    P('tk.lau-van-bao-sc', 86, 73, label='Vạn Bảo Lâu'); P('tk.lau-cho-sc', 96, 73, label='Chợ Phiên')
    P('tk.nha-ren-sc', 105.5, 73, label='Binh Khố'); P('tk.nha-thuoc-sc', 112, 73, label='Đan Dược Phường')
    for sid, x in (('tk.sap-kiem-sc', 86), ('tk.sap-thuoc-sc', 92.5), ('tk.sap-mi-sc', 99)):
        P(sid, x, 85)
    P('tk.sap-thu-sc', 87, 94, label='Ngự Thú'); P('tk.sap-khoi-loi-sc', 94.5, 94, label='Khôi Lỗi'); P('tk.sap-vai-sc', 101.5, 93.8, label='Thời Trang')
    for sid, x, y in (('tk.thung-hom-sc', 103.4, 85), ('tk.ro-gio-sc', 82.8, 85.4), ('tk.thung-go-sc', 104.8, 93.8), ('tk.thung-go-sc', 83.2, 93.6), ('tk.ro-gio-sc', 104.6, 79.6)):
        P(sid, x, y, s=0.6)   # tấm SpriteCook vẽ thùng, sọt to gấp đôi món cũ: thu lại cho vừa tầm người
    P('tk.co-do-sc', 88.2, 81); P('tk.co-do-sc', 99.8, 81); P('tk.vac-lua-sc', 90.8, 80.2); P('tk.vac-lua-sc', 97.4, 80.2)
    # --- nam: xóm dân quanh Suối Vọng Nguyệt ---
    P('tk.voi-nuoc-sc', 64, 98.8, label='Suối Vọng Nguyệt')
    P('tk.nha-dan-1-sc', 55, 93); P('tk.nha-dan-2-sc', 73, 93); P('tk.nha-dan-3-sc', 55, 105)
    P('tk.quan-tra-sc', 73, 105.5, label='Trà Quán'); P('tk.mieu-sc', 73.5, 114, label='Thổ Địa Miếu'); P('tk.gieng-sc', 53.2, 109.6)
    # --- tây: Nguyệt Môn vào vườn ven sông, Cầu Vọng Tiên sang động phủ ---
    P('tk.nguyet-mon-sc', 42.5, 74, on='.12', label='Nguyệt Môn'); P('tk.cau-da-sc', 32.5, 77, on='.=,12', label='Cầu Vọng Tiên')
    P('tk.thac-nho-sc', 42.5, 60.4, on='.='); P('tk.tuong-tien-sc', 39.6, 65.6); P('tk.sen-chau-sc', 45.8, 61.4); P('tk.sen-chau-2-sc', 39.2, 60.8)
    P('tk.cau-go-sc', 30.5, 47, on='.=,', label='Cầu Dây'); P('tk.cau-da-buoc-sc', 30.5, 88.9, on='.=,')
    # --- hồ Bích Thủy: hai bến câu, thuyền, đình ven hồ ---
    P('tk.cau-tau-1-sc', 36, 101, on='.=,', label='Bến Câu Bích Thủy'); P('tk.cau-tau-2-sc', 22, 98.4, on='.=,')
    P('tk.thuyen-1-sc', 27, 100.8, force=True); P('tk.thuyen-2-sc', 31.5, 105.6, force=True, f=1)
    P('tk.dinh-ho-sc', 41, 102, label='Vọng Nguyệt Đình')
    # --- di tích cuối đường mòn (mỗi hướng một cảnh lớn); lối tới luôn ở phía trước mặt hình ---
    P('tk.kiem-trung-sc', 104, 35.6, label='Kiếm Trủng'); P('tk.co-thu-lon-sc', 119, 77.6, label='Cổ Thụ Ngàn Năm')
    P('tk.tien-dai-sc', 64.5, 118.6, label='Tiên Đài Ngắm Sao'); P('tk.thac-sc', 30, 29.3, on='.=^', label='Thác Kiếm Tuyền')
    # --- hai cổng riêng: công trình đứng ngay trên ô P (ô cổng nằm dưới chân bậc), người đi vòng ra trước mặt mới vào được ---
    gx, gy = GATES['bi-canh']
    dx, dy = GATES['dong-phu']
    P('tk.cong-bi-canh-sc', gx - 0.4, gy, force=True, label='Bí cảnh Huyết Nha')   # bậc thềm trong hình lệch phải 0,9 ô: chân bậc rơi đúng ô P
    P('tk.cong-dong-phu-sc', dx + 0.5, dy, force=True, label='Động phủ')            # tên viết lên tấm biển đá trên cửa
    P('tk.bia-kiem-sc', gx + 4.6, gy + 1.6); P('tk.bia-cung-sc', dx - 2.6, dy + 2.2)


def roads(S):
    T = S.trail
    T((28, 76), (21, 76))                                              # tây: qua cầu đá tới trước cửa động phủ
    T((46, 44), (41, 43)); T((41, 43), (35, 46))                       # tây bắc: sân tông môn → tháp canh → đầu cầu dây
    T((36, 74), (36, 48))                                              # men bờ đông từ cầu đá lên cầu dây (lách giữa vườn và sông)
    T((35, 45), (33, 32))                                              # men bờ đông lên Thác Kiếm Tuyền
    T((26, 46), (21, 41))                                              # bờ tây: lên rừng thông (xuống động phủ thì đi bờ đông rồi qua cầu đá)
    T((22, 79), (22, 92))                                              # động phủ → bến câu tây hồ
    T((81, 44), (84, 43)); T((92, 42), (104, 37), wide=True)           # đông bắc: Tàng Kinh Các rồi Kiếm Trủng
    T((111, 76), (117, 79))                                            # đông: cổ thụ
    T((90, 97), (86, 102), wide=True); T((86, 102), (86, 109), wide=True); T((86, 109), (91, 110), wide=True)   # nam chợ: vòng bên tây ra trước mặt cổng bí cảnh
    T((64, 109), (71, 117), wide=True); T((71, 117), (68, 121))        # nam: vòng sang bên rồi ra đài ngắm sao trước mặt tượng
    T((58, 99), (45, 102)); T((38, 99), (36, 96))                      # tây nam: đình ven hồ, bến câu
    T((37, 77), (33, 88)); T((28, 88), (23, 84))                       # bờ đông xuống đá bước, sang bờ tây
    for sx, sy, text in ((36.6, 73.2, '↑ Thác Kiếm Tuyền'), (93.6, 44.6, '→ Kiếm Trủng'), (92.6, 98.6, '↓ Bí cảnh Huyết Nha'),
                         (66.6, 110.6, '↓ Tiên Đài'), (57.4, 100.8, '← Bến Câu'), (111.6, 78.6, '→ Cổ Thụ'), (27.4, 74.4, '← Động phủ'),
                         (36.4, 44.2, '← Cầu Dây')):
        S.put('chung.bien-go', sx, sy, label=text)


def data(S):
    """Điểm tới, cổng, NPC, bãi quái. Mọi lối sang tinh cầu khác tụ quanh pháp trận (luật: một pháp trận mỗi tinh cầu)."""
    gx, gy = GATES['bi-canh']
    dx, dy = GATES['dong-phu']
    spawns = {'vao': [64, 84], 'tu-bi-canh': [gx, gy + 2], 'tu-bi-canh-tn': [gx - 1, gy + 2], 'tu-dong-phu': [dx + 2, dy], 'tu-thap': [60, 85], 'tu-luan-vo': [67, 85]}
    portals = [{'at': [gx, gy], 'to': 'bi-canh', 'spawn': 'vao', 'need': 'mo-bi-canh', 'label': 'Bí cảnh Huyết Nha'},
               {'at': [dx, dy], 'to': 'dong-phu', 'spawn': 'vao', 'need': 'dong-phu', 'kind': 'portal', 'label': 'Vào động phủ'}]
    for i, (to, need, name, sp) in enumerate(FLY):   # bảy điểm bay quanh vành pháp trận (đài đá 12 × 11 ô), chừa phía nam cho điểm vào game
        a = -math.pi / 2 + (i - 3) * 2 * math.pi / 8.4
        at = [math.floor(TRAN[0] + 8.6 * math.cos(a)), math.floor(TRAN[1] + 7.2 * math.sin(a))]
        spawns[sp] = at
        portals.append({'at': at, 'to': to, 'spawn': 'vao', 'need': need, 'label': f'Truyền tống tới {name}', 'fly': True})
    cells = [tuple(v) for v in spawns.values()]
    assert len(set(cells)) == len(cells) and all(S.passable(*c) for c in cells), 'điểm tới trùng nhau hoặc nằm trong vật cản'
    sap = [(i[1], i[2]) for i in S.items if '.sap-' in i[0]]   # người bán đứng sạp: game tự kéo về góc phải sạp trong 3 ô; còn lại phải đứng chỗ trống
    for _, x, y in BAN:
        assert any(math.hypot(x - sx, y - sy) < 3 for sx, sy in sap) or S.passable(int(x), int(y)), f'người bán hội đứng trong vật cản: {x}, {y}'
    npcs = [{'id': n[0], 'at': [round(n[1] - 0.5, 1), round(n[2] - 0.5, 1)], **(n[3] if len(n) > 3 else {})} for n in NPCS]
    spawners = [{'mob': 'moc-linh', 'at': [x, y], **o} for x, y, o in CAMPS]
    return spawns, portals, npcs, spawners


def soat_khach(S, kh):
    """Khách hội đi thẳng từ điểm này sang điểm kia (không dò đường): mỗi đoạn nối phải không xuyên vật cản."""
    bad = 0
    for a, b in kh['links']:
        (x0, y0), (x1, y1) = kh['nodes'][a][:2], kh['nodes'][b][:2]
        n = max(2, int(math.hypot(x1 - x0, y1 - y0) * 4))
        hit = [(int(x0 + (x1 - x0) * i / n), int(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]
        hit = [c for c in dict.fromkeys(hit) if not S.passable(*c)]
        if hit:
            bad += 1
            print(f'  LỐI KHÁCH {a}–{b} xuyên vật cản ở', hit[:4])
    return bad


def rewrite(path, fn):
    """Sửa một tệp JSON thụt 1 (data/le-hoi.json, data/do-cu.json), giữ nguyên cách viết để khác biệt nhỏ nhất."""
    old = path.read_text(encoding='utf-8')
    d, tail = json.loads(old), '\n' if old.endswith('\n') else ''
    assert json.dumps(d, ensure_ascii=False, indent=1) + tail == old, f'{path.name}: cách viết lạ, không dám ghi đè'
    fn(d)
    path.write_text(json.dumps(d, ensure_ascii=False, indent=1) + tail, encoding='utf-8')


def main():
    from tk_moi_canh import nature, nui, hon_noi, khach
    nhap = '--nhap' in sys.argv
    S = Canh(D, R=D / 2 - 0.41, seed=1811)   # bán kính ô đất như các tinh cầu khác (tools/mo-rong-dao.py)
    terrain(S)
    build(S)
    roads(S)
    S.must = False
    nature(S, KHU)
    nui(S, lim)
    hon_noi(S)
    spawns, portals, npcs, spawners = data(S)
    S.items.sort(key=lambda it: (it[2], it[1]))
    assert not soat_khach(S, khach()), 'lối khách hội xuyên vật cản: sửa nodes / links trong tk_moi_canh.py'
    m = {'id': 'thien-kiem-phong', 'name': 'Thiên Kiếm Tinh',
         '_note': 'Dựng theo luật thế giới 18/11/2026 bằng tools/the-gioi/tk_moi.py (KHÔNG sửa tay: sửa máy sinh rồi chạy lại). nen: nền bộ 15 mảnh '
                  'SpriteCook, mép tinh cầu, vách đá, hoa cỏ in nền (src/world/draw-nen.js). prop_hide "^P": núi là đồ đứng tk.nui-*, hai cổng riêng là công trình tk.cong-*: không vẽ ô núi, ô cổng xoáy cũ. '
                  'moc: tên mốc → ô, truyện trỏ theo tên (data/story.json target). hoi.bay_tu: bố cục Bày cảnh trên máy chủ tới bản đó là của bản đồ cũ, '
                  'game bỏ qua. planet.luat: câu cá chỉ ở nước thật; các cờ terrain, settle, open, grown giữ để công cụ một lần cũ (tools/terrain.py…) không đụng vào.',
         'sky': '#b8d8f8', 'dark': 0, 'island': {'top': '#9cd08a', 'under': '#8a7a6a', 'hall': True}, 'world': True,
         'planet': {'d': D, 'luat': 1, 'terrain': 1, 'settle': 1, 'open': 1, 'grown': 1}, 'nen': NEN, 'prop_hide': '^P',
         'grid': S.G.rows(), 'spawns': spawns, 'portals': portals, 'npcs': npcs, 'spawners': spawners, 'rooms': [],
         'hoi': {'le': 'cuu-tong-tranh-phong', 'bay_tu': BAY_TU, 'do': S.items},
         'moc': {'da-toa': list(DA_TOA[0]), 'bi-canh': list(GATES['bi-canh']), 'dong-phu': list(GATES['dong-phu']), 'phap-tran': list(TRAN), 'ben-cau': [36, 96]}}
    if nhap:
        m['le_hoi'] = {'khu': KHU, 'khach': khach()}
        NHAP.parent.mkdir(exist_ok=True)
        NHAP.write_text(json.dumps(m, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    else:
        MAP.write_text(json.dumps(m, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

        def le_hoi(d):
            f = d['festivals']['thien-kiem-phong']
            f['khu'] = KHU
            f['_khu'] = 'Vùng phố của bản đồ dựng 18/11/2026: tools/the-gioi/tk_moi.py ghi (khu, khach.nodes, khach.links, khach.ban, tro[].item), không sửa tay.'
            f['khach'].update(khach())
            f['khach']['ban'] = BAN
            for tro, sid in zip(f['tro'], ('tk.dien-phu-sc', 'tk.trong-rong-sc', 'tk.tuong-rong-sc')):   # tỷ võ trước Luyện Võ Đường, trống rồng, múa kiếm quanh tượng rồng (hình mới)
                tro['item'] = sid
        rewrite(ROOT / 'data/le-hoi.json', le_hoi)

        def do_cu(d):
            at = {n[0][3:]: [round(n[1] - 0.5, 1), round(n[2] - 0.5, 1)] for n in NPCS if n[0].startswith('dc-')}
            for k, v in d['npc'].items():
                if v.get('map') == 'thien-kiem-phong':
                    v['at'] = at[k]
        rewrite(ROOT / 'data/do-cu.json', do_cu)
        dau(S)
    from collections import Counter
    print('nháp' if nhap else 'bản đồ thật', '| ô:', dict(Counter(''.join(m['grid']))), '| đồ:', len(S.items), 'loại:', len({i[0] for i in S.items}))


def dau(S):
    """Chỗ đầu boss cũ ở mép trên tinh cầu trong bảng của máy chủ phòng (cloud/src/mang-cfg.js HEAD; tools/cloud/phong.test.mjs so với
    bản đồ). Đầu boss đã dời ra vùng không gian riêng từ 06/11/2026 nên số này không còn dùng lúc chạy, chỉ giữ cho bài kiểm khớp."""
    import re
    g, cx = S.G.rows(), D // 2
    ry = next(y for y in range(D) if g[y][cx] != '~')
    p = ROOT / 'cloud/src/mang-cfg.js'
    s = p.read_text(encoding='utf-8')
    new, n = re.subn(r'"thien-kiem-phong": \[[0-9.]+, [0-9.]+\]', f'"thien-kiem-phong": [{(cx + 0.5) * 16:.1f}, {(max(0, ry - 1) + 0.5) * 16:.1f}]', s)
    assert n == 1, 'cloud/src/mang-cfg.js: không thấy mục HEAD của Thiên Kiếm Tinh'
    p.write_text(new, encoding='utf-8')


if __name__ == '__main__':
    main()
