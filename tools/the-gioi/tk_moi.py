"""Thiên Kiếm Tinh dựng lại theo luật thế giới (docs/12-LUAT-THE-GIOI.md). Chủ dự án 18/11/2026 11:03 "tôi muốn xây lại thiên kiếm tinh",
12:02 "Đẩy lên game đi". Máy này sinh ra data/maps/thien-kiem-phong.json — KHÔNG sửa tay tệp đó: sửa ở đây rồi chạy lại.
Bố cục (đĩa 92 ô, tâm 46): pháp trận truyền tống ở quảng trường giữa, bốn phố gạch toả bốn hướng —
  bắc: tông môn dưới chân dãy Thiên Kiếm Phong;   đông: phường chợ;   nam: xóm dân, cuối lối là Tiên Đài ngắm sao ở mép tinh cầu;
  tây: Nguyệt Môn, vườn ven sông, cầu đá sang động phủ.
Sông: nguồn ở thác dưới núi tây bắc, chảy xuôi nam vào hồ Bích Thủy (bến câu). Vòng ngoài là rừng, bãi quái, di tích cuối đường mòn.
Chạy: python3 tools/the-gioi/tk_moi.py            ghi bản đồ thật + vùng phố, lối khách hội (data/le-hoi.json) + chỗ NPC đồ cũ (data/do-cu.json)
      python3 tools/the-gioi/tk_moi.py --nhap     chỉ ghi bản nháp tools/the-gioi/nhap/ để xem trước (toan_canh.py)
Cảnh tự nhiên ở tk_moi_canh.py. Toạ độ ở đây là toạ độ ô THẬT (như đồ hoi.do); NPC, điểm tới lúc ghi ra lùi 0,5 vì game đặt ở tâm ô."""
import json
import math
import sys
from pathlib import Path

import ban_do
from ban_do import Canh, ROOT

D, C = 92, 46
MAP = ROOT / 'data/maps/thien-kiem-phong.json'
NHAP = Path(__file__).parent / 'nhap' / 'thien-kiem-phong.json'
PLAZA, TRAN = (46, 48), (46, 47.4)   # tâm quảng trường, tâm pháp trận
BAY_TU = 14   # bố cục "Bày cảnh" lưu trên máy chủ tới bản này là của bản đồ cũ: game bỏ qua (src/ui/bay-canh-start.js)
KINDS = {'tk.tien-dai': 'tuong'}   # kiểu chân bổ sung (data/le-hoi.json → kinds): tượng Tiên Đài chắn đế như tượng khác

# ---- mốc cố định: NPC, cổng, bãi quái (đặt trước, mọi thứ khác né ra) ----
NPCS = [
    ('van-hac', 46, 27.9), ('lac-tuyet', 51.5, 47.2, {'unless': 'lac-tuyet-vang'}), ('tieu-dao', 40.5, 47.2, {'unless': 'tieu-dao-vang'}),
    ('chap-su', 38, 45.7), ('ho-linh', 27.4, 51.4), ('quan-binh-kho', 78.5, 48.5), ('ngu-thu-su', 61, 62), ('khoi-loi-su', 67, 62),
    ('van-bao', 61.5, 46.9), ('chu-cho', 69.5, 46.9), ('to-doi', 50.6, 51.6, {'need': 'mo-bi-canh'}), ('tieu-phu', 66, 25.8),
    ('dc-dong-phuc-nu', 42.4, 52.2), ('dc-thanh-sam-nam', 58.5, 50.3), ('dc-tien-nhan-nam', 51.5, 34.6), ('dc-hoang-kim-nu', 72.2, 50.3),
    ('dc-kim-bao-nam', 62.6, 55.4), ('dc-kim-bao-nu', 67.6, 55.4), ('dc-thien-kiem-bao-nam', 40.5, 34.6), ('dc-thien-kiem-bao-nu', 43.2, 61.2),
]
GATES = {'bi-canh': (64, 72), 'dong-phu': (16, 48)}   # ô P: cổng riêng ngoài phố (luật pháp trận)
DA_TOA = [(41, 32), (18, 50)]                          # ô M bồ đoàn: sân tông môn (tự hành ngồi ở đây), trước động phủ
FLY = [('dao-xich-dien', 'ngu-kiem', 'Xích Diễm Tinh', 'tu-xich-dien'), ('dao-han-bang', 'han-bang', 'Hàn Băng Tinh', 'tu-han-bang'),
       ('hac-phong-dao', 'hac-phong', 'Hắc Phong Tinh', 'tu-hac-phong'), ('dao-moc', 'dao-moc', 'Thanh Mộc Tinh', 'tu-dao-moc'),
       ('dao-thien-kim', 'dao-kim', 'Thiên Kim Tinh', 'tu-thien-kim'), ('dao-hau-tho', 'dao-tho', 'Hậu Thổ Tinh', 'tu-hau-tho'),
       ('vet-nut-ngoai', 'vet-nut', 'Ngoại Vực Vết Nứt', 'tu-vet-nut')]
# bãi quái: (góc độ, bán kính, thêm). Vòng trong, rồi vòng ngoài sát mép (quái gấp đôi): càng xa phố càng mạnh; cách cổng bí cảnh trên 9 ô
CAMPS = [(120, 33, {'n': 4, 'spread': 6, 'respawn': 6}), (30, 40, {'farm': True}), (72, 33, {'farm': True}), (330, 33, {'farm': True}),
         (215, 36, {'farm': True}), (12, 40, {'farm': True, 'mul': 2}), (56, 41, {'farm': True, 'mul': 2}), (108, 39, {'farm': True, 'mul': 2}),
         (150, 40, {'farm': True, 'mul': 2}), (345, 40, {'farm': True, 'mul': 2})]
KHU = [[28, 15, 64, 58], [52, 36, 81, 52], [55, 52, 76, 65], [34, 54, 58, 72]]   # phố: quái không vào


def terrain(S):
    G, R = S.G, S.R
    # dãy Thiên Kiếm Phong chắn mép bắc, trũng xuống ở tây bắc nơi thác đổ
    jag = [R.random() for _ in range(D)]
    for x in range(D):
        lim = 8.5 + 6.5 * math.exp(-((x - 21) / 9) ** 2) + 2.5 * math.exp(-((x - 70) / 7) ** 2) + (jag[x] + jag[(x + 1) % D]) * 0.9
        for y in range(int(lim)):
            G.set(x, y, '^')
    # sông: từ thác chảy xuôi nam, khúc thẳng hẹp ở chỗ bắc cầu (hàng 48), đổ vào hồ Bích Thủy
    src = [(24.5, 15.5), (23.5, 21), (20.5, 27), (21, 34), (24, 40), (23, 44.5)]
    low = [(23, 51.5), (20.5, 56), (21, 61)]
    for seg in (ban_do.smooth(src, 6), [(23, 44.5), (23, 51.5)], ban_do.smooth(low, 6)):
        G.stroke(seg, 2.0, '=', keep='~')
    G.disc(21, 65.5, 7, '=', ry=4.8)
    G.disc(17, 68, 4, '=', ry=3)
    # quảng trường, bốn phố gạch, sân tông môn, sân chợ, sân xóm, đài ngắm sao ở mép nam
    G.disc(*PLAZA, 6.5, '2', ry=5)
    G.rect(45, 37, 47, 43, '1'); G.rect(53, 47, 75, 49, '1'); G.rect(45, 53, 47, 70, '1'); G.rect(30, 47, 39, 49, '1')
    G.rect(38, 27, 54, 36, '2'); G.rect(57, 46, 73, 63, '2'); G.disc(46, 62.5, 4.2, '2', ry=3.2)
    G.rect(36, 45, 40, 46, '2')   # thềm Nhiệm Vụ Đường
    G.disc(46.5, 85.7, 3.6, '2', ry=1.7)
    for x, y in GATES.values():
        G.set(x, y, 'P')
    for x, y in DA_TOA:
        G.set(x, y, 'M')


def build(S):
    P = S.put
    for n in NPCS:
        S.keep.append((n[1], n[2], 0.6))
    for x, y in list(GATES.values()) + DA_TOA:
        S.keep.append((x + 0.5, y + 0.5, 1.6 if (x, y) in GATES.values() else 1.0))
    S.keep.append((TRAN[0], TRAN[1], 3.4))
    for a, r, _ in CAMPS:
        S.clear.append((C + r * math.cos(math.radians(a)), C + r * math.sin(math.radians(a)), 5.5))
    # --- bắc: Thiên Kiếm Tông ---
    P('tk.dien-chinh-m', 46, 26.5, label='Thiên Kiếm Điện')
    P('tk.dien-phu-m', 34.5, 33, label='Luyện Võ Đường'); P('tk.dien-phu-m', 57.5, 33, label='Truyền Công Đường')
    P('tk.cong-kiem-m', 46, 37.6, on='.12', label='Thiên Kiếm Tông')
    P('tk.lau-sach-m', 60.5, 24, label='Tàng Kinh Các'); P('tk.thap-canh-m', 31.5, 24.5)
    for i, sid in enumerate(['tk.co-moc-m', 'tk.co-hoa-m', 'tk.co-tho-m', 'tk.co-kim-m', 'tk.co-thuy-m']):
        P(sid, 39.3, 28.5 + i * 1.6); P(sid, 52.7, 28.5 + i * 1.6)
    P('tk.co-tong-m', 40.6, 27.3); P('tk.co-do-m', 51.4, 27.3); P('tk.lu-huong-m', 46, 29.8)
    P('tk.vac-lua-m', 42.2, 27.6); P('tk.vac-lua-m', 49.8, 27.6); P('tk.chuong-m', 39.4, 35.8); P('tk.trong-rong-m', 52.6, 35.8)
    P('tk.su-tu-m', 43.6, 39.2, on='.12'); P('tk.su-tu-m', 48.4, 39.2, f=1, on='.12'); P('tk.kiem-bay-m', 46, 32.8)
    P('tk.tuong-rong-m', 57.5, 37.8); P('tk.tru-moc-nhan-m', 33, 35.6); P('tk.tru-moc-nhan-m', 36, 35.6); P('tk.kiem-gia-vo-m', 31.6, 34.2)
    # --- giữa: pháp trận truyền tống (một cái duy nhất), Nhiệm Vụ Đường ---
    P('tk.tran-bat-quai', TRAN[0], TRAN[1] + 2, s=1.6, force=True, label='Pháp Trận Truyền Tống')
    P('tk.dien-nho-m', 38, 44.6, label='Nhiệm Vụ Đường')
    for dx, dy in ((-5.2, -2.6), (5.2, -2.6), (-5.2, 3.4), (5.2, 3.4)):
        P('tk.vac-lua-m', PLAZA[0] + dx, PLAZA[1] + dy)
    P('tk.tuong-hac-m', 42.6, 44.6); P('tk.tuong-hac-m', 49.4, 44.6, f=1)
    # --- đông: phường chợ (hai dãy sạp cách nhau một lối rộng, dãy sau không che người đứng trước dãy trước) ---
    P('tk.lau-van-bao-m', 61.5, 45.8, label='Vạn Bảo Lâu'); P('tk.lau-cho-m', 69.5, 45.8, label='Chợ Phiên')
    P('tk.nha-ren-m', 78.5, 47.2, label='Binh Khố')
    for sid, x in (('tk.sap-kiem-m', 60), ('tk.sap-thuoc-m', 65), ('tk.sap-mi-m', 70)):
        P(sid, x, 54)
    P('tk.sap-thu-m', 60.5, 60.6, label='Ngự Thú'); P('tk.sap-khoi-loi-m', 66.5, 60.6, label='Khôi Lỗi'); P('tk.sap-vai-m', 71.6, 60.4)
    P('tk.thung-hom-m', 73.6, 54); P('tk.ro-gio-m', 57.6, 54.6); P('tk.thung-go-m', 74, 60.6)
    # --- nam: xóm dân ---
    P('tk.voi-nuoc-m', 46, 63.2, label='Suối Vọng Nguyệt')
    for x, y in ((39.5, 59.5), (52.5, 59.5), (39.5, 68.5), (52.5, 68.5)):
        P('tk.nha-dan-m', x, y)
    P('tk.quan-tra-m', 36, 55.2, label='Trà Quán'); P('tk.gieng-m', 53.5, 64.6)
    # --- tây: Nguyệt Môn, vườn ven sông, cầu đá sang động phủ ---
    P('tk.nguyet-mon-m', 31, 49.4, on='.12', label='Nguyệt Môn'); P('tk.cau-da-m', 23, 49, on='.=,', label='Cầu Vọng Tiên')
    P('tk.tuong-tien-m', 27.5, 44.2); P('tk.sen-chau-m', 29.6, 46.2); P('tk.sen-chau-2-m', 26.4, 50.6)
    # --- di tích cuối đường mòn (mỗi hướng một cảnh lớn); lối tới luôn ở phía trước mặt hình ---
    P('tk.kiem-trung-m', 72, 20.5, label='Kiếm Trủng'); P('tk.co-thu-lon-m', 83, 46.5, s=1.3, label='Cổ Thụ Ngàn Năm')
    P('tk.tien-dai-m', 46.5, 83.4, s=1.3, label='Tiên Đài Ngắm Sao'); P('tk.thac-m', 24.6, 16.6, on='.=^', label='Thác Kiếm Tuyền')
    P('tk.cau-ben-sc', 27.5, 66.2, on='.=', label='Bến Câu Bích Thủy')
    P('tk.bia-kiem-m', 66.4, 70.8); P('tk.bia-cung-m', 14.4, 46.8)


def roads(S):
    T = S.trail
    T((29, 48), (25, 48)); T((20, 48), (17, 48))                      # tây: qua cầu tới động phủ
    T((26, 47), (27, 19))                                             # tây bắc: men bờ đông lên thác
    T((53, 27), (60, 25)); T((60, 25), (71, 22), wide=True)           # đông bắc: Tàng Kinh Các rồi Kiếm Trủng
    T((38, 27), (34, 25))                                             # tháp canh
    T((76, 48), (81, 48))                                             # đông: cổ thụ
    T((64, 64), (64, 71), wide=True)                                  # nam chợ: cổng bí cảnh
    T((46, 71), (50, 80), wide=True); T((50, 80), (49, 85))           # nam: vòng sang bên rồi ra đài ngắm sao trước mặt tượng
    T((44, 66), (29, 66))                                             # tây nam: bến câu
    T((18, 49), (17, 30)); T((17, 52), (12, 64))                      # bờ tây: lên rừng thông, xuống tây hồ
    for sx, sy, text in ((27.8, 46.4, '↑ Thác Kiếm Tuyền'), (62.6, 26.6, '→ Kiếm Trủng'), (62.4, 65.4, '↓ Bí cảnh Huyết Nha'),
                         (48.6, 72.6, '↓ Tiên Đài'), (43.4, 67.6, '← Bến Câu'), (76.4, 50.2, '→ Cổ Thụ'), (19.4, 46.6, '← Động phủ')):
        S.put('chung.bien-go', sx, sy, label=text)


def data(S):
    """Điểm tới, cổng, NPC, bãi quái. Mọi lối sang tinh cầu khác tụ quanh pháp trận (luật: một pháp trận mỗi tinh cầu)."""
    gx, gy = GATES['bi-canh']
    dx, dy = GATES['dong-phu']
    spawns = {'vao': [46, 50], 'tu-bi-canh': [gx, gy - 2], 'tu-bi-canh-tn': [gx - 1, gy - 2], 'tu-dong-phu': [dx + 2, dy], 'tu-thap': [42, 51], 'tu-luan-vo': [50, 51]}
    portals = [{'at': [gx, gy], 'to': 'bi-canh', 'spawn': 'vao', 'need': 'mo-bi-canh', 'label': 'Bí cảnh Huyết Nha'},
               {'at': [dx, dy], 'to': 'dong-phu', 'spawn': 'vao', 'need': 'dong-phu', 'kind': 'portal', 'label': 'Vào động phủ'}]
    for i, (to, need, name, sp) in enumerate(FLY):
        a = -math.pi / 2 + i * 2 * math.pi / len(FLY)
        at = [math.floor(TRAN[0] + 3.6 * math.cos(a)), math.floor(TRAN[1] + 2.6 * math.sin(a))]
        spawns[sp] = at
        portals.append({'at': at, 'to': to, 'spawn': 'vao', 'need': need, 'label': f'Truyền tống tới {name}', 'fly': True})
    cells = [tuple(v) for v in spawns.values()]
    assert len(set(cells)) == len(cells) and all(S.passable(*c) for c in cells), 'điểm tới trùng nhau hoặc nằm trong vật cản'
    npcs = [{'id': n[0], 'at': [round(n[1] - 0.5, 1), round(n[2] - 0.5, 1)], **(n[3] if len(n) > 3 else {})} for n in NPCS]
    spawners = [{'mob': 'moc-linh', 'at': [round(C + r * math.cos(math.radians(a))), round(C + r * math.sin(math.radians(a)))], **o} for a, r, o in CAMPS]
    return spawns, portals, npcs, spawners


def rewrite(path, fn):
    """Sửa một tệp JSON thụt 1 (data/le-hoi.json, data/do-cu.json), giữ nguyên cách viết để khác biệt nhỏ nhất."""
    old = path.read_text(encoding='utf-8')
    d, tail = json.loads(old), '\n' if old.endswith('\n') else ''
    assert json.dumps(d, ensure_ascii=False, indent=1) + tail == old, f'{path.name}: cách viết lạ, không dám ghi đè'
    fn(d)
    path.write_text(json.dumps(d, ensure_ascii=False, indent=1) + tail, encoding='utf-8')


def main():
    from tk_moi_canh import nature, khach
    nhap = '--nhap' in sys.argv
    ban_do.LH['kinds'].update(KINDS)
    S = Canh(D, R=D / 2 - 0.41, seed=1811)   # bán kính ô đất như bản đồ cũ (tools/mo-rong-dao.py): máy chủ boss, mép tròn không đổi
    terrain(S)
    build(S)
    roads(S)
    S.must = False
    nature(S, KHU)
    spawns, portals, npcs, spawners = data(S)
    S.items.sort(key=lambda it: (it[2], it[1]))
    m = {'id': 'thien-kiem-phong', 'name': 'Thiên Kiếm Tinh',
         '_note': 'Dựng lại theo luật thế giới 18/11/2026 bằng tools/the-gioi/tk_moi.py (KHÔNG sửa tay: sửa máy sinh rồi chạy lại). nen: nền bộ 15 mảnh '
                  'SpriteCook (src/world/draw-nen.js). moc: tên mốc → ô, truyện trỏ theo tên (data/story.json target). hoi.bay_tu: bố cục Bày cảnh '
                  'trên máy chủ tới bản đó là của bản đồ cũ, game bỏ qua. planet.luat: câu cá chỉ ở nước thật; các cờ terrain, settle, open, grown '
                  'giữ để công cụ một lần cũ (tools/terrain.py…) không đụng vào.',
         'sky': '#b8d8f8', 'dark': 0, 'island': {'top': '#9cd08a', 'under': '#8a7a6a', 'hall': True}, 'world': True,
         'planet': {'d': D, 'luat': 1, 'terrain': 1, 'settle': 1, 'open': 1, 'grown': 1}, 'nen': {'nuoc': 'nen.tk-nuoc', 'dat': 'nen.tk-dat', 'san': 'nen.tk-san', 'gach': 'nen.tk-gach'},
         'grid': S.G.rows(), 'spawns': spawns, 'portals': portals, 'npcs': npcs, 'spawners': spawners, 'rooms': [],
         'hoi': {'le': 'cuu-tong-tranh-phong', 'bay_tu': BAY_TU, 'do': S.items},
         'moc': {'da-toa': list(DA_TOA[0]), 'bi-canh': list(GATES['bi-canh']), 'dong-phu': list(GATES['dong-phu']), 'phap-tran': [46, 47], 'ben-cau': [29, 66]}}
    if nhap:
        m['le_hoi'] = {'khu': KHU, 'khach': khach()}
        NHAP.parent.mkdir(exist_ok=True)
        NHAP.write_text(json.dumps(m, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    else:
        MAP.write_text(json.dumps(m, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

        def le_hoi(d):
            f = d['festivals']['thien-kiem-phong']
            f['khu'] = KHU
            f['_khu'] = 'Vùng phố của bản đồ dựng lại 18/11/2026: tools/the-gioi/tk_moi.py ghi (khu, khach.nodes, khach.links), không sửa tay.'
            f['khach'].update(khach())
            d['kinds'].update(KINDS)
        rewrite(ROOT / 'data/le-hoi.json', le_hoi)

        def do_cu(d):
            at = {n[0][3:]: [round(n[1] - 0.5, 1), round(n[2] - 0.5, 1)] for n in NPCS if n[0].startswith('dc-')}
            for k, v in d['npc'].items():
                if v.get('map') == 'thien-kiem-phong':
                    v['at'] = at[k]
        rewrite(ROOT / 'data/do-cu.json', do_cu)
    from collections import Counter
    print('nháp' if nhap else 'bản đồ thật', '| ô:', dict(Counter(''.join(m['grid']))), '| đồ:', len(S.items), 'loại:', len({i[0] for i in S.items}))


if __name__ == '__main__':
    main()
