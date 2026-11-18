"""Cảnh tự nhiên, núi và đồ trang trí của Thiên Kiếm Tinh (gọi từ tk_moi.py), theo luật thế giới:
cây trong phố thành hàng, ngoài hoang thành cụm có khoảng trống, cây ưa nước ở ven bờ, không mọc trên đường;
đèn chỉ theo phố và cửa nhà; đá gần núi và bờ nước; thạch anh mọc cụm ở nơi linh khí (thác, Kiếm Trủng); mép tinh cầu để trống;
núi là đồ đứng xếp nhiều hàng trên nền đá, Thiên Kiếm Phong sau lưng đại điện; ngoài mép, ở bốn góc trời, có các hòn đất nổi."""
import math

C, D = 64, 128
CHERRY, GINKGO, PINE, MAPLE, OLD, BAMBOO, WILLOW = ('tk.cay-anh-dao-sc', 'tk.cay-ngan-hanh-sc', 'tk.cay-thong-sc', 'tk.cay-phong-sc',
                                                     'tk.cay-co-thu-sc', 'tk.truc-sc', 'tk.lieu-sc')
CO = {PINE: 0.85, MAPLE: 0.9}   # thông, phong SpriteCook vẽ cao hơn cây cũ 1,35 và 1,2 lần: trong rừng thu bớt cho tán không trùm quá rộng
BUI = ['tk.bui-xanh-lon-sc', 'tk.bui-xanh-nho-sc', 'tk.bui-xanh-nho-sc', 'tk.bui-co-cao-sc', 'tk.bui-duong-xi-sc']
BUI_HOA = ['tk.bui-do-quyen-sc', 'tk.bui-cuc-vang-sc', 'tk.bui-hoa-trang-sc', 'tk.bui-mau-don-sc']
DA = ['tk.da-vua-sc', 'tk.da-nho-sc', 'tk.da-nho-sc', 'tk.da-cum-sc', 'tk.da-phien-sc', 'tk.soi-sc']
DA_NUI = ['tk.da-nui-1-sc', 'tk.da-nui-2-sc', 'tk.da-nui-3-sc', 'tk.da-nui-4-sc', 'tk.nui-doi-1-sc', 'tk.da-cum-sc', 'tk.da-vua-sc']
NUI = ['tk.nui-3-sc'] * 7 + ['tk.nui-2-sc'] * 6 + ['tk.nui-4-sc'] * 4 + ['tk.nui-1-sc'] * 3
# đèn đá: hai bên đại lộ, cửa lầu, đầu cầu, quảng trường suối, bến câu, cổng, đài ngắm sao (ngoài hoang không có đèn)
DEN = [(60.8, 63.6), (67.2, 63.6), (80.6, 73.4), (91, 73.4), (101, 73.4), (109, 73.4), (80.6, 78.8), (95, 78.6), (109.2, 78.8), (115.4, 74.6),
       (82.6, 95.8), (105.4, 95.8), (61.4, 88.6), (66.6, 88.6), (61.4, 105.6), (66.6, 105.6), (58.6, 95.2), (69.4, 95.2), (58.6, 101.6), (69.4, 101.6),
       (48.6, 74.4), (37.4, 74.4), (37.4, 77.8), (27.6, 74.4), (27.6, 77.8), (37.8, 96.6), (23.8, 93.2), (44.8, 103.8), (37.2, 103.8),
       (89.4, 112.2), (60.2, 122), (68.8, 122), (84.6, 44.8), (91.4, 44.8), (47.6, 70.8), (57.2, 70.8), (46.4, 49.8), (81.6, 49.8)]


def vnoise(seed):
    """Nhiễu mượt 0..1 theo toạ độ ô (cụm rừng, bãi trống)."""
    def h(x, y):
        n = (x * 374761393 + y * 668265263 + seed * 1442695041) & 0xffffffff
        n = ((n ^ (n >> 13)) * 1274126177) & 0xffffffff
        return ((n ^ (n >> 16)) & 0xffff) / 65535

    def f(x, y, s):
        x, y = x / s, y / s
        x0, y0 = math.floor(x), math.floor(y)
        u, v = x - x0, y - y0
        u, v = u * u * (3 - 2 * u), v * v * (3 - 2 * v)
        return (h(x0, y0) * (1 - u) + h(x0 + 1, y0) * u) * (1 - v) + (h(x0, y0 + 1) * (1 - u) + h(x0 + 1, y0 + 1) * u) * v
    return f


def dist_map(S, chars, maxd=8):
    """Khoảng cách (ô) từ mỗi ô tới ô gần nhất thuộc chars (lan theo 8 hướng)."""
    d, cur = {}, [(x, y) for y in range(D) for x in range(D) if S.G.get(x, y) in chars]
    for c in cur:
        d[c] = 0
    k = 0
    while cur and k < maxd:
        k += 1
        nxt = []
        for x, y in cur:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (x + dx, y + dy)
                    if n not in d and 0 <= n[0] < D and 0 <= n[1] < D:
                        d[n] = k
                        nxt.append(n)
        cur = nxt
    return d


def gan(S, sid, x, y):
    """Đặt món ở (x, y); không được thì thử các ô sát bên (trái phải trước, rồi trên dưới, rồi chéo)."""
    return any(S.put(sid, x + ox, y + oy) for ox, oy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1), (2, 0), (-2, 0)))


def nature(S, KHU):
    R, P, G = S.R, S.put, S.G
    road, water, peak = dist_map(S, '12,P'), dist_map(S, '='), dist_map(S, '^')
    rd = lambda x, y: road.get((int(x), int(y)), 9)
    wd = lambda x, y: water.get((int(x), int(y)), 9)
    pd = lambda x, y: peak.get((int(x), int(y)), 9)
    in_town = lambda x, y, m=0: any(a - m <= x <= c + m and b - m <= y <= d + m for a, b, c, d in KHU)
    camp = lambda x, y: any(math.hypot(x - cx, y - cy) < cr for cx, cy, cr in S.clear)
    rr = lambda x, y: math.hypot(x - C, y - C)
    fl = lambda: R.random() < 0.5

    # 1. đèn đá (chỗ đã khai mà vướng đường mòn, vướng người đứng thì nhích sang ô bên cạnh, không bỏ đèn)
    for x, y in DEN:
        gan(S, 'tk.den-da-sc', x, y)

    # 2. cây trong phố: thành hàng, đứng ngoài lề để tán không trùm đường. Chỗ khai sẵn mà không đặt được thì báo ra
    # (bản 18/11 lặng lẽ bỏ 20 cây khai sẵn vì tán trùm sân, trùm đèn: hàng cây bên có bên không)
    def co_dinh(sid, x, y, **o):
        if not P(sid, x, y, **o):
            print('  KHÔNG ĐẶT ĐƯỢC (cây khai sẵn):', sid, x, y, S.why)

    for y in (54.8, 59.2):
        co_dinh(PINE, 55.6, y, s=0.8); co_dinh(PINE, 72.4, y, s=0.8)        # hai bên cổng tông môn
    for x in (45.4, 82.6):
        for y in (36.6, 41):
            co_dinh(PINE, x, y, s=0.8)                                      # hai bên sân tông môn (chừa lối mòn ra ở hàng 44)
    co_dinh(CHERRY, 57.6, 64.6, s=0.85); co_dinh(CHERRY, 70.4, 64.6, s=0.85)   # cửa bắc quảng trường
    for i, y in enumerate((90.4, 106.4, 110.6)):                            # đại lộ nam: anh đào xen ngân hạnh
        for x in (59.6, 68.4):
            co_dinh(CHERRY if i % 2 == 0 else GINKGO, x, y, s=0.85)
    for x, y, sid in ((51.2, 88.4, GINKGO), (77, 88.4, GINKGO), (81, 99.4, GINKGO), (108.2, 99.4, GINKGO), (108.6, 84, CHERRY), (108, 92, GINKGO),
                      (79.6, 71.6, CHERRY), (117.4, 71.6, GINKGO), (78.6, 110, GINKGO)):
        co_dinh(sid, x, y, s=0.85)
    # vườn Nguyệt Môn: trúc ở hai góc bắc, anh đào bên ao, bụi hoa viền lối, linh thảo cạnh suối
    co_dinh(BAMBOO, 39.6, 58.8); co_dinh(BAMBOO, 46.6, 57.4)                # (bụi trúc tây lùi xuống cho khỏi trùm bãi quái phía bắc vườn)
    co_dinh(CHERRY, 47.4, 64.8, s=0.8); P('tk.linh-thao-sc', 44.6, 60.6); P('tk.sen-la-sc', 42.8, 63.4, s=0.5, force=True)
    for i, (x, y) in enumerate(((40.6, 66.6), (44.8, 66.8), (39.4, 62.6), (46, 63.2), (41, 58), (44.4, 57.8), (38.4, 67.4), (47, 61.4), (40.8, 69.4), (44.6, 69.6))):
        P(BUI_HOA[i % 4], x, y)
    # (bốn góc quảng trường là sân lát, đã có vạc lửa: không đặt bụi hoa trên đá)
    for x, y, sid in ((57.2, 96, 0), (70.8, 96.2, 3), (57.4, 101, 1), (70.6, 100.8, 2),
                      (52.4, 94.2, 2), (58, 94.4, 1), (75.8, 94.2, 0), (70.2, 94.2, 3), (52.2, 106.2, 3), (76.2, 115.2, 1), (70.6, 115.2, 0)):
        P(BUI_HOA[sid], x, y)

    # 3. ven nước: liễu, trúc trên bờ; lau, cỏ nến sát mép; sen trong hồ; đá rêu
    shore = [(x, y) for y in range(D) for x in range(D) if G.get(x, y) == '.' and wd(x, y) == 1 and S.walk_r(x, y)]
    R.shuffle(shore)
    n = {'w': 0, 'b': 0, 'r': 0}
    for x, y in shore:
        if rd(x, y) < 2 or camp(x, y) or (38 <= x <= 48 and 55 <= y <= 74):
            continue
        t = R.random()
        if t < 0.13 and n['w'] < 20 and P(WILLOW, x + 0.5, y + 0.9, s=round(0.76 + R.random() * 0.16, 2), f=fl()):
            n['w'] += 1
        elif t < 0.24 and n['b'] < 16 and P(BAMBOO if R.random() < 0.6 else 'tk.truc-non-sc', x + 0.5, y + 0.9, f=fl()):
            n['b'] += 1
        elif t < 0.52 and n['r'] < 54:
            n['r'] += P('tk.bui-lau-sc' if R.random() < 0.55 else 'tk.bui-co-nen-sc', x + R.random(), y + 0.3 + R.random() * 0.6, s=0.6, f=fl())
        elif t < 0.6:
            P(R.choice(['tk.soi-reu-sc', 'tk.da-nho-sc', 'tk.da-cum-sc']), x + 0.5, y + 0.8, f=fl())
    lake = [(x, y) for y in range(93, 110) for x in range(13, 39) if G.get(x, y) == '=' and wd(x + 2, y) == 0 and wd(x - 2, y) == 0 and wd(x, y + 1) == 0 and wd(x, y - 1) == 0]
    R.shuffle(lake)
    k = 0
    for x, y in lake:
        if k < 9 and not (abs(x - 36) < 4 or abs(x - 22) < 3.5 and y < 101) and math.hypot(x - 27, y - 100) > 4 and math.hypot(x - 31.5, y - 105) > 3:   # chừa mặt nước trước hai bến, quanh thuyền
            k += P('tk.sen-la-sc', x + 0.5, y + 1, s=0.6, force=True, f=fl())
    P('tk.da-reu-lon-sc', 34.6, 31.4, s=0.9); P('tk.da-lon-sc', 24.2, 30.8, f=1)

    # 4. nơi linh khí: thạch anh quanh thác, kiếm đá và thạch anh quanh Kiếm Trủng, bia cổ ở lối vào
    for cx, cy in ((35.4, 33.4), (25.6, 33)):
        P('tk.pha-le-lon-sc', cx, cy); P('tk.pha-le-lam-sc', cx + 1.6, cy + 0.5); P('tk.linh-thao-sc', cx - 1.4, cy + 0.6)
    for x, y, sid, f in ((100.4, 34, 'tk.kiem-da-1-sc', 0), (107.6, 34.2, 'tk.kiem-da-2-sc', 0), (101.6, 37.6, 'tk.kiem-da-2-sc', 1), (107, 37.8, 'tk.kiem-da-1-sc', 1),
                         (98.6, 36.6, 'tk.pha-le-tim-sc', 0), (109.4, 36.4, 'tk.pha-le-luc-sc', 0), (105.8, 33, 'tk.pha-le-tim-sc', 1),
                         (61.4, 119.6, 'tk.pha-le-lam-sc', 0), (67.8, 119.4, 'tk.pha-le-lam-sc', 1)):
        P(sid, x, y, f=f)
    gan(S, 'tk.bia-co-sc', 99, 39.6); gan(S, 'tk.bia-co-sc', 36.6, 36.2)

    # 5. rừng ngoài hoang: mọc theo cụm (nhiễu), loài theo vùng; chừa đường, bãi quái, mép tinh cầu
    f1, f2 = vnoise(7), vnoise(23)
    pts = [(x + R.random() * 5, y + R.random() * 5) for y in range(10, 124, 5) for x in range(4, 124, 5) for _ in range(12)]
    R.shuffle(pts)
    for x, y in pts:
        r = rr(x, y)
        if r > 58.5 or camp(x, y) or rd(x, y) < 2 or wd(x, y) < 2 or G.get(int(x), int(y)) != '.':
            continue
        dens = f1(x, y, 10) * 0.65 + f2(x, y, 4.5) * 0.35
        if dens < (0.66 if in_town(x, y, 1) else 0.4 if r > 42 else 0.52) or (in_town(x, y, 1) and rd(x, y) < 5):
            continue   # trong phố đã có hàng cây, chỉ thêm vài gốc ở góc khuất; rừng dày dần ra phía mép
        if pd(x, y) < 6 or y < 36:
            sid = PINE
        elif x > 82 and y < 90:
            sid = MAPLE if R.random() < 0.7 else GINKGO
        elif y > 86:
            sid = CHERRY if R.random() < 0.55 else GINKGO
        elif x < 28:
            sid = PINE if R.random() < 0.7 else MAPLE
        else:
            sid = PINE if R.random() < 0.5 else MAPLE
        if R.random() < 0.06:
            sid = OLD
        P(sid, x, y, s=round((0.85 + R.random() * 0.3) * CO.get(sid, 1), 2), f=fl())

    # 6. tầng thấp: bụi hoa gần phố, bụi xanh và dương xỉ trong rừng, gốc cây, khúc gỗ, nấm; đá gần núi; vài tảng đá lớn làm mốc
    for x, y, sid in ((52.6, 57.4, 'tk.da-lon-sc'), (108.4, 110.2, 'tk.da-lon-sc'), (12.6, 68.4, 'tk.da-dung-sc'), (88.6, 60.4, 'tk.da-dung-sc'),
                      (35.6, 112.6, 'tk.da-lon-sc'), (118.6, 62.4, 'tk.da-dung-sc'), (76.6, 124.2, 'tk.da-reu-lon-sc')):
        P(sid, x, y, f=fl())
    pts = [(x + R.random() * 2, y + R.random() * 2) for y in range(8, 126, 2) for x in range(4, 126, 2)]
    R.shuffle(pts)
    for x, y in pts:
        r = rr(x, y)
        if r > 60 or rd(x, y) < 1 or wd(x, y) < 2 or G.get(int(x), int(y)) != '.' or (int(x), int(y)) in S.solid:
            continue
        t, v = R.random(), f2(x + 40, y, 5)
        if pd(x, y) < 4 and t < 0.2:
            P(R.choice(DA_NUI), x, y, f=fl())
        elif in_town(x, y) and t < 0.035 and 1 < rd(x, y) < 4:
            P(R.choice(BUI_HOA), x, y)
        elif not in_town(x, y, 1) and not camp(x, y) and v > 0.55 and t < 0.12:
            P(R.choice(BUI + BUI + DA + ['tk.goc-cay-sc', 'tk.khuc-go-sc', 'tk.nam-nau-sc', 'tk.nam-nau-sc', 'tk.truc-non-sc']), x, y, f=fl())


def nui(S, lim):
    """Dãy Thiên Kiếm Phong: Thiên Kiếm Phong khổng lồ sau lưng đại điện, quanh nó các ngọn núi kiếm xếp nhiều hàng trên nền đá
    (hàng trước che chân hàng sau), hàng ngoài cùng đứng sát mép dưới của nền đá. Chừa khoảng trước thác."""
    R, G = S.R, S.G
    S.put('tk.nui-thien-kiem-sc', 64, 27.4, force=True, label='Thiên Kiếm Phong')
    pts = []
    for gy in range(0, 14):
        y = 4.6 + gy * 2.9
        for gx in range(0, 34):
            x = 13 + gx * 3.3 + (1.65 if gy % 2 else 0) + (R.random() - 0.5) * 1.4
            yy = y + (R.random() - 0.5) * 0.9
            if G.get(int(x), int(yy)) == '^' and G.get(int(x), int(yy + 1.2)) == '^':
                pts.append((x, yy))
    for x in [16 + i * 3.1 for i in range(32)]:   # hàng trước: chân núi sát mép dưới nền đá
        xx = x + (R.random() - 0.5)
        col = [y for y in range(D) if G.get(int(xx), y) == '^']
        if col:
            pts.append((xx, max(col) + 0.9))
    n = 0
    for x, y in sorted(pts, key=lambda p: p[1]):
        if abs(x - 30) < 2.4 and y > 24.5:                       # ngay trên thác: để trống cho thấy thác
            continue
        if abs(x - 64) < 5.4 and y > 27.4 or abs(x - 64) < 2.6 and y > 18:   # trước chân Thiên Kiếm Phong (sau mái đại điện) và ngay sau lưỡi kiếm
            continue
        n += S.put(R.choice(NUI), round(x, 1), round(y, 1), f=R.random() < 0.5, force=True)
    return n


def hon_noi(S):
    """Hòn đất nổi ngoài mép tinh cầu, ở bốn góc trời (máy quay không ra khỏi khung vuông của bản đồ nên chỉ góc mới thấy)."""
    R, got = S.R, []
    for a0 in (45, 135, 225, 315):
        for _ in range(60):
            if sum(1 for g in got if g[2] == a0) >= 6:
                break
            a = math.radians(a0 + (R.random() - 0.5) * 50)
            r = 67 + R.random() * 15
            x, y = C + r * math.cos(a), C + r * math.sin(a)
            if not (3 < x < D - 3 and 5 < y < D - 2) or any(math.hypot(x - g[0], y - g[1]) < 5.5 for g in got):
                continue
            got.append((x, y, a0))
            S.put(f'tk.hon-noi-{R.choice([1, 1, 2, 3, 4, 4, 5, 5])}-sc', round(x, 1), round(y, 1), f=R.random() < 0.5, force=True)


def khach():
    """Lối khách hội dạo (toạ độ ô thật): quảng trường, lối lên tông môn qua cổng, sân tông môn, phố chợ và hai dãy sạp (đi qua khe giữa
    các sạp), quảng trường suối, lối vườn tây qua Nguyệt Môn. Điểm 4 số là chỗ đứng xem trò: [x, y, nhìn x, nhìn y].
    tk_moi.py soát từng đoạn nối không xuyên vật cản."""
    nodes = [[64, 84.6], [56, 76.5], [72, 76.5], [64, 67.2], [64, 62.5], [64, 57], [64, 51], [64, 47.6], [57.6, 46.4], [70.4, 46.4],      # 0–9
             [61.8, 43.4], [62, 39.6], [55.6, 46.4, 52, 44.4], [70.4, 47.4, 71.5, 48.6], [73.6, 49.2, 77, 47.4], [79.5, 76], [86, 75.7],   # 10–16
             [96, 75.7], [105, 75.8], [84, 80], [89.3, 81.6], [89.3, 87.8], [95.8, 81.6], [95.8, 87.8], [91, 88.4], [90.8, 95.8],           # 17–25
             [98.3, 95.8], [104, 88.4], [64, 89], [64, 93.4], [59.4, 98.2], [68.6, 98.2], [64, 103], [64, 107], [49, 75.6], [45, 75.6],   # 26–35
             [42.5, 75.6], [42.5, 72.6], [43.6, 66.4], [54.4, 69.6]]                                                                             # 36–39
    links = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [7, 9], [7, 10], [10, 11], [8, 12], [9, 13], [9, 14],
             [2, 15], [15, 16], [16, 17], [17, 18], [15, 19], [19, 20], [20, 21], [20, 22], [22, 23], [21, 24], [23, 24], [24, 25], [25, 26],
             [23, 27], [18, 27], [0, 28], [28, 29], [29, 30], [29, 31], [30, 32], [31, 32], [32, 33], [1, 34], [34, 35], [35, 36], [36, 37],
             [37, 38], [1, 39], [3, 39]]
    return {'nodes': nodes, 'links': links}
