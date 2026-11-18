"""Dựng lại Thiên Kiếm Tinh theo luật thế giới (docs/12-LUAT-THE-GIOI.md; chủ dự án 18/11/2026 11:03 "tôi muốn xây lại thiên kiếm tinh").
Ra BẢN NHÁP tools/the-gioi/nhap/thien-kiem-phong.json (chưa thay bản đồ đang chạy): chủ dự án duyệt ảnh toàn cảnh rồi mới đưa vào data/maps/.
Bố cục (đĩa 92 ô, tâm 46): pháp trận truyền tống ở quảng trường giữa, bốn phố gạch toả bốn hướng —
  bắc: tông môn dưới chân dãy Thiên Kiếm Phong;   đông: phường chợ;   nam: xóm dân, cuối lối là Tiên Đài ngắm sao ở mép tinh cầu;
  tây: Nguyệt Môn, vườn ven sông, cầu đá sang động phủ.
Sông: nguồn ở thác dưới núi tây bắc, chảy xuôi nam vào hồ Bích Thủy (bến câu). Vòng ngoài là rừng, bãi quái, di tích cuối đường mòn.
Chạy: python3 tools/the-gioi/tk_moi.py  (cảnh tự nhiên ở tk_moi_canh.py)"""
import json
import math
from pathlib import Path

from ban_do import Grid, ROOT, astar, box, foot, kind_of, rng, smooth

D, C = 92, 46
OUT = Path(__file__).parent / 'nhap' / 'thien-kiem-phong.json'
ROAD = '12,'
TALL = ('cay', 'nha', 'tru', 'tuong', 'cong', 'sap')
PLAZA = (46, 48)

# ---- mốc cố định: NPC, cổng, bãi quái (đặt trước, mọi thứ khác né ra) ----
NPCS = [
    ('van-hac', 46, 27.6), ('lac-tuyet', 49.5, 30, {'unless': 'lac-tuyet-vang'}), ('tieu-dao', 42.5, 30, {'unless': 'tieu-dao-vang'}),
    ('chap-su', 38, 45.4), ('ho-linh', 27.4, 51.4), ('quan-binh-kho', 78.5, 48.2), ('ngu-thu-su', 60.5, 59.6), ('khoi-loi-su', 66.5, 59.6),
    ('van-bao', 61.5, 46.4), ('chu-cho', 69.5, 46.4), ('to-doi', 50.5, 51.5, {'need': 'mo-bi-canh'}), ('tieu-phu', 62, 19),
    ('dc-dong-phuc-nu', 42.4, 52), ('dc-thanh-sam-nam', 58, 50.5), ('dc-tien-nhan-nam', 51.5, 34.5), ('dc-hoang-kim-nu', 72.5, 50.5),
    ('dc-kim-bao-nam', 63, 51), ('dc-kim-bao-nu', 68, 51), ('dc-thien-kiem-bao-nam', 40.5, 34.5), ('dc-thien-kiem-bao-nu', 43, 61),
]
GATES = {'bi-canh': (68, 72), 'dong-phu': (16, 48)}   # ô P (cổng riêng ngoài phố: luật pháp trận)
FLY = [('dao-xich-dien', 'ngu-kiem', 'Xích Diễm Tinh', 'tu-xich-dien'), ('dao-han-bang', 'han-bang', 'Hàn Băng Tinh', 'tu-han-bang'),
       ('hac-phong-dao', 'hac-phong', 'Hắc Phong Tinh', 'tu-hac-phong'), ('dao-moc', 'dao-moc', 'Thanh Mộc Tinh', 'tu-dao-moc'),
       ('dao-thien-kim', 'dao-kim', 'Thiên Kim Tinh', 'tu-thien-kim'), ('dao-hau-tho', 'dao-tho', 'Hậu Thổ Tinh', 'tu-hau-tho'),
       ('vet-nut-ngoai', 'vet-nut', 'Ngoại Vực Vết Nứt', 'tu-vet-nut')]
# bãi quái: (góc độ, bán kính, thêm). Vòng trong 30–36 ô, vòng ngoài 39–40 ô (quái gấp đôi): càng xa phố càng mạnh
CAMPS = [(120, 33, {'n': 4, 'spread': 6, 'respawn': 6}), (32, 39, {'farm': True}), (72, 33, {'farm': True}), (330, 33, {'farm': True}),
         (215, 36, {'farm': True}), (12, 40, {'farm': True, 'mul': 2}), (56, 41, {'farm': True, 'mul': 2}), (108, 39, {'farm': True, 'mul': 2}),
         (150, 40, {'farm': True, 'mul': 2}), (345, 40, {'farm': True, 'mul': 2})]
KHU = [[28, 15, 64, 58], [52, 36, 81, 61], [34, 54, 58, 72]]   # phố: quái không vào


class Canh:
    """Cảnh đang dựng: lưới ô + đồ đặt theo chân, tự soát chồng lấn, che khuất, chắn lối."""

    def __init__(self):
        self.G = Grid(D)
        self.items, self.solid, self.open, self.boxes, self.keep, self.clear = [], set(), set(), [], [], []
        self.R = rng(1811)
        self.must = True

    def walk_r(self, x, y):   # trong vòng đi được của đĩa (src/world/map.js discOf: lùi 1,46 ô)
        return math.hypot(x + 0.5 - C, y + 0.5 - C) <= D / 2 - 1.46

    def put(self, sid, x, y, s=1.0, label=None, f=0, on='.2', force=False):
        """Đặt một món chân ở (x, y). Trả False nếu phạm luật: chắn đường, đè nước, chồng món khác, che NPC / cổng."""
        sol, opn = foot(sid, x, y, s)
        b, k = box(sid, x, y, s), kind_of(sid)
        ok = self._ok(sid, x, y, s, sol, b, k, on) if not force else True
        if not ok:
            if self.must:
                print('  KHÔNG ĐẶT ĐƯỢC:', sid, x, y, self.why)
            return False
        self.solid |= sol
        self.open |= opn
        if k in TALL:
            self.boxes.append(b)
        it = [sid, round(x, 1), round(y, 1)]
        if label or s != 1 or f:
            it.append(label)
        if s != 1 or f:
            it.append({**({'s': s} if s != 1 else {}), **({'f': 1} if f else {})})
        self.items.append(it)
        return True

    def _ok(self, sid, x, y, s, sol, b, k, on):
        if True:
            for c in sol:
                if self.G.get(*c) not in on or c in self.solid or not self.walk_r(*c):
                    self.why = f'ô {c} {self.G.get(*c)!r}'
                    return ''
            for kx, ky, kr in self.keep:   # không chắn, không che người và cổng
                if any(abs(cx + 0.5 - kx) < kr and abs(cy + 0.5 - ky) < kr for cx, cy in sol) or (b[0] < kx < b[2] and b[1] < ky - 0.4 and ky < y):
                    self.why = f'mốc {kx, ky}'
                    return ''
            if k == 'cay':
                for ob in self.boxes:   # cây không đè lên nhà, cây khác quá nửa hình
                    ix, iy = min(b[2], ob[2]) - max(b[0], ob[0]), min(b[3], ob[3]) - max(b[1], ob[1])
                    if ix > 0 and iy > 0 and ix * iy > 0.5 * min((b[2] - b[0]) * (b[3] - b[1]), (ob[2] - ob[0]) * (ob[3] - ob[1])):
                        self.why = 'đè hình'
                        return ''
        return 'ok'

    def passable(self, x, y):
        ch = self.G.get(x, y)
        if (x, y) in self.open:
            return True
        return ch not in '~^=' and (x, y) not in self.solid and self.walk_r(x, y)

    def trail(self, a, b, wide=False):
        """Đường mòn đất từ a tới b: đi vòng vật cản, ưa nhập vào đường có sẵn (luật đường 09/11)."""

        def cost(x, y):
            if not self.passable(x, y):
                return None
            ch = self.G.get(x, y)
            return 0.35 if ch == ',' else 0.6 if ch in '12' else 1 + ((x * 7 + y * 13) % 5) * 0.12

        p = astar(D, a, b, cost)
        assert p, f'không nối được {a} → {b}'
        for x, y in p:   # vệt chân rộng hai ô (ô lưới đôi vẽ ra lối đi liền, không đứt khúc)
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)) if wide else ((0, 0), (1, 0), (0, 1)):
                if self.passable(x + dx, y + dy):
                    self.G.set(x + dx, y + dy, ',', keep='~=^12PM')
        return p


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
    for seg in (smooth(src, 6), [(23, 44.5), (23, 51.5)], smooth(low, 6)):
        G.stroke(seg, 2.0, '=', keep='~')
    G.disc(21, 65.5, 7, '=', ry=4.8)
    G.disc(17, 68, 4, '=', ry=3)
    # quảng trường, bốn phố gạch, sân tông môn, sân chợ, sân xóm
    G.disc(*PLAZA, 6.5, '2', ry=5)
    G.rect(45, 37, 47, 43, '1'); G.rect(53, 47, 75, 49, '1'); G.rect(45, 53, 47, 70, '1'); G.rect(30, 47, 39, 49, '1')
    G.rect(38, 27, 54, 36, '2'); G.rect(57, 46, 73, 59, '2'); G.disc(46, 62.5, 4.2, '2', ry=3.2)
    G.rect(36, 45, 40, 46, '2')   # thềm Nhiệm Vụ Đường
    for name, (x, y) in GATES.items():
        G.set(x, y, 'P')
    G.set(18, 50, 'M')   # bồ đoàn đả toạ trước động phủ


def build(S):
    P = S.put
    for n in NPCS:
        S.keep.append((n[1], n[2], 0.6))
    for x, y in GATES.values():
        S.keep.append((x + 0.5, y + 0.5, 1.6))
    S.keep.append((PLAZA[0], PLAZA[1] + 0.5, 3.2))
    for a, r, _ in CAMPS:
        S.clear.append((C + r * math.cos(math.radians(a)), C + r * math.sin(math.radians(a)), 5.5))
    # --- bắc: Thiên Kiếm Tông ---
    P('tk.dien-chinh-m', 46, 26.5, label='Thiên Kiếm Điện')
    P('tk.dien-phu-m', 34.5, 33, label='Luyện Võ Đường'); P('tk.dien-phu-m', 57.5, 33, label='Truyền Công Đường')
    P('tk.cong-kiem-m', 46, 37.6, on='.12', label='Thiên Kiếm Tông')
    P('tk.lau-sach-m', 60.5, 24, label='Tàng Kinh Các'); P('tk.thap-canh-m', 31.5, 24.5)
    for i, sid in enumerate(['tk.co-moc-m', 'tk.co-hoa-m', 'tk.co-tho-m', 'tk.co-kim-m', 'tk.co-thuy-m']):
        P(sid, 39.3, 28.5 + i * 1.6); P(sid, 52.7, 28.5 + i * 1.6)
    P('tk.co-tong-m', 40.6, 27.3); P('tk.co-do-m', 51.4, 27.3); P('tk.lu-huong-m', 46, 29.6)
    P('tk.vac-lua-m', 42.2, 27.6); P('tk.vac-lua-m', 49.8, 27.6); P('tk.chuong-m', 39.4, 35.8); P('tk.trong-rong-m', 52.6, 35.8)
    P('tk.su-tu-m', 43.6, 39.2, on='.12'); P('tk.su-tu-m', 48.4, 39.2, f=1, on='.12'); P('tk.kiem-bay-m', 46, 32.5)
    P('tk.tuong-rong-m', 57.5, 37.8); P('tk.tru-moc-nhan-m', 33, 35.6); P('tk.tru-moc-nhan-m', 36, 35.6); P('tk.kiem-gia-vo-m', 31.6, 34.2)
    # --- giữa: pháp trận truyền tống (một cái duy nhất), Nhiệm Vụ Đường ---
    P('tk.tran-bat-quai', PLAZA[0], PLAZA[1] + 1.2, s=1.6, force=True, label='Pháp Trận Truyền Tống')
    P('tk.dien-nho-m', 38, 44.6, label='Nhiệm Vụ Đường')
    for dx, dy in ((-5.2, -2.6), (5.2, -2.6), (-5.2, 3.4), (5.2, 3.4)):
        P('tk.vac-lua-m', PLAZA[0] + dx, PLAZA[1] + dy)
    P('tk.tuong-hac-m', 42.6, 44.6); P('tk.tuong-hac-m', 49.4, 44.6, f=1)
    # --- đông: phường chợ ---
    P('tk.lau-van-bao-m', 61.5, 45.8, label='Vạn Bảo Lâu'); P('tk.lau-cho-m', 69.5, 45.8, label='Chợ Phiên')
    P('tk.nha-ren-m', 78.5, 47.2, label='Binh Khố')
    for sid, x in (('tk.sap-kiem-m', 60), ('tk.sap-thuoc-m', 65), ('tk.sap-mi-m', 70)):
        P(sid, x, 54.6)
    P('tk.sap-thu-m', 60.5, 58.6, label='Ngự Thú'); P('tk.sap-khoi-loi-m', 66.5, 58.6, label='Khôi Lỗi'); P('tk.sap-vai-m', 71.6, 58.2)
    P('tk.thung-hom-m', 73.4, 54.4); P('tk.ro-gio-m', 57.6, 55); P('tk.thung-go-m', 74.2, 58.6)
    # --- nam: xóm dân ---
    P('tk.voi-nuoc-m', 46, 63.2, label='Suối Vọng Nguyệt')
    for x, y in ((39.5, 59.5), (52.5, 59.5), (39.5, 68.5), (52.5, 68.5)):
        P('tk.nha-dan-m', x, y)
    P('tk.quan-tra-m', 36, 53.6, label='Trà Quán'); P('tk.gieng-m', 53.5, 64.6)
    # --- tây: Nguyệt Môn, vườn ven sông, cầu đá sang động phủ ---
    P('tk.nguyet-mon-m', 31, 49.4, on='.12', label='Nguyệt Môn'); P('tk.cau-da-m', 23, 49, on='.=,', label='Cầu Vọng Tiên')
    P('tk.tuong-tien-m', 27.5, 44.2); P('tk.sen-chau-m', 29.6, 46.2); P('tk.sen-chau-2-m', 26.4, 50.6)
    # --- di tích cuối đường mòn (mỗi hướng một cảnh lớn) ---
    P('tk.kiem-trung-m', 72, 20.5, label='Kiếm Trủng'); P('tk.co-thu-lon-m', 83, 46.5, s=1.3, label='Cổ Thụ Ngàn Năm')
    P('tk.tien-dai-m', 46, 86.4, s=1.3, label='Tiên Đài Ngắm Sao'); P('tk.thac-m', 24.6, 16.6, on='.=^', label='Thác Kiếm Tuyền')
    P('tk.cau-ben-sc', 27.5, 66.2, on='.=', label='Bến Câu Bích Thủy')
    P('tk.bia-kiem-m', 70.6, 70.4); P('tk.bia-cung-m', 14.4, 46.8)


def roads(S):
    T = S.trail
    T((29, 48), (25, 48)); T((20, 48), (17, 48))                      # tây: qua cầu tới động phủ
    T((26, 47), (27, 19))                                             # tây bắc: men bờ đông lên thác
    T((55, 29), (71, 22), wide=True)                                  # đông bắc: Kiếm Trủng
    T((76, 48), (81, 48))                                             # đông: cổ thụ
    T((66, 60), (68, 71), wide=True)                                  # đông nam: cổng bí cảnh
    T((46, 71), (46, 84), wide=True)                                  # nam: Tiên Đài
    T((44, 66), (29, 66))                                             # tây nam: bến câu
    T((55, 28), (60, 25)); T((37, 29), (32, 26))                      # Tàng Kinh Các, tháp canh
    T((18, 49), (17, 30)); T((17, 52), (12, 64))                      # bờ tây: lên rừng thông, xuống tây hồ
    for sx, sy, text in ((27.8, 46.4, '↑ Thác Kiếm Tuyền'), (56.2, 30, '→ Kiếm Trủng'), (64.4, 61.4, '↓ Bí cảnh Huyết Nha'),
                         (47.8, 72.4, '↓ Tiên Đài'), (43.4, 67.4, '← Bến Câu'), (76.4, 50.2, '→ Cổ Thụ'), (19.4, 46.6, '← Động phủ')):
        S.put('chung.bien-go', sx, sy, label=text)


def data(S):
    ring = lambda r, i, n, o=0: (round(PLAZA[0] + r * math.cos(o + i * 2 * math.pi / n), 1), round(PLAZA[1] + 0.4 + r * 0.7 * math.sin(o + i * 2 * math.pi / n), 1))
    spawns = {'vao': [46, 50.5], 'tu-bi-canh': [68, 70], 'tu-bi-canh-tn': [67, 70], 'tu-dong-phu': [17.5, 48.5], 'tu-thap': [43, 49], 'tu-luan-vo': [49, 49]}
    portals = [{'at': list(GATES['bi-canh']), 'to': 'bi-canh', 'spawn': 'vao', 'need': 'mo-bi-canh', 'label': 'Bí cảnh Huyết Nha'},
               {'at': list(GATES['dong-phu']), 'to': 'dong-phu', 'spawn': 'vao', 'need': 'dong-phu', 'kind': 'portal', 'label': 'Vào động phủ'}]
    for i, (to, need, name, sp) in enumerate(FLY):
        x, y = ring(3.4, i, len(FLY), -math.pi / 2)
        spawns[sp] = [x, y]
        portals.append({'at': [math.floor(x), math.floor(y)], 'to': to, 'spawn': 'vao', 'need': need, 'label': f'Truyền tống tới {name}', 'fly': True})
    npcs = [{'id': n[0], 'at': [n[1], n[2]], **(n[3] if len(n) > 3 else {})} for n in NPCS]
    spawners = [{'mob': 'moc-linh', 'at': [round(C + r * math.cos(math.radians(a))), round(C + r * math.sin(math.radians(a)))], **o} for a, r, o in CAMPS]
    return spawns, portals, npcs, spawners


def main():
    from tk_moi_canh import nature, khach
    S = Canh()
    terrain(S)
    build(S)
    roads(S)
    S.must = False
    nature(S, KHU)
    spawns, portals, npcs, spawners = data(S)
    old = json.loads((ROOT / 'data/maps/thien-kiem-phong.json').read_text(encoding='utf-8'))
    S.items.sort(key=lambda it: (it[2], it[1]))
    m = {'id': old['id'], 'name': old['name'],
         '_note': 'Dựng lại theo luật thế giới 18/11/2026 bằng tools/the-gioi/tk_moi.py (không sửa tay: sửa máy sinh rồi chạy lại).',
         'sky': old['sky'], 'dark': 0, 'island': old['island'], 'world': True, 'ground': '#8a8070',
         'planet': {'d': D, 'luat': 1}, 'nen': {'co': 'nen.tk-nuoc', 'nuoc': 'nen.tk-nuoc', 'dat': 'nen.tk-dat'},
         'grid': S.G.rows(), 'spawns': spawns, 'portals': portals, 'npcs': npcs, 'spawners': spawners, 'rooms': [],
         'hoi': {'le': old['hoi']['le'], 'do': S.items},
         'moc': {'da-toa': [18, 50], 'bi-canh': list(GATES['bi-canh']), 'dong-phu': list(GATES['dong-phu']), 'phap-tran': list(PLAZA), 'ben-cau': [29, 66]},
         'le_hoi': {'khu': KHU, 'khach': khach()}}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(m, ensure_ascii=False, separators=(',', ':')).replace('],[', '],\n[') + '\n', encoding='utf-8')
    from collections import Counter
    print('ô:', dict(Counter(''.join(m['grid']))))
    print('đồ:', len(S.items), 'loại:', len({i[0] for i in S.items}))


if __name__ == '__main__':
    main()
