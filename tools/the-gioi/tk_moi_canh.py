"""Cảnh tự nhiên và đồ trang trí của Thiên Kiếm Tinh mới (gọi từ tk_moi.py), theo luật thế giới:
cây trong phố thành hàng, ngoài hoang thành cụm có khoảng trống, cây ưa nước ở ven bờ, không mọc trên đường;
đèn chỉ theo phố và cửa nhà; đá gần núi và bờ nước; thạch anh mọc cụm ở nơi linh khí (thác, Kiếm Trủng); mép tinh cầu để trống."""
import math

from ban_do import size

C, D = 46, 92
CHERRY, GINKGO, PINE, MAPLE, OLD, BAMBOO, WILLOW = ('tk.cay-anh-dao-m', 'tk.cay-ngan-hanh-m', 'tk.cay-thong-m', 'tk.cay-phong-m',
                                                     'tk.cay-co-thu-m', 'tk.truc-m', 'tk.lieu-sc')


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


def nature(S, KHU):
    R, P, G = S.R, S.put, S.G
    road, water, peak = dist_map(S, '12,P'), dist_map(S, '='), dist_map(S, '^')
    rd = lambda x, y: road.get((int(x), int(y)), 9)
    wd = lambda x, y: water.get((int(x), int(y)), 9)
    pd = lambda x, y: peak.get((int(x), int(y)), 9)
    in_town = lambda x, y, m=0: any(a - m <= x <= c + m and b - m <= y <= d + m for a, b, c, d in KHU)
    camp = lambda x, y: any(math.hypot(x - cx, y - cy) < cr for cx, cy, cr in S.clear)
    rr = lambda x, y: math.hypot(x - C, y - C)

    # 1. đèn đá dọc bốn phố gạch, so le hai bên (ngoài hoang không có đèn)
    for i, t in enumerate(range(38, 44, 3)):
        P('tk.den-da-m', 44.4 if i % 2 else 47.6, t + 0.5)
    for i, t in enumerate(range(54, 71, 4)):
        P('tk.den-da-m', 44.4 if i % 2 else 47.6, t + 0.6)
    for i, t in enumerate(range(54, 75, 5)):
        P('tk.den-da-m', t + 0.5, 46.6 if i % 2 else 50.6)
    for i, t in enumerate(range(31, 39, 4)):
        P('tk.den-da-m', t + 0.5, 46.6 if i % 2 else 50.6)
    for x, y in ((24.9, 47.2), (21.1, 47.2), (58.2, 45.9), (72.8, 45.9), (42.4, 63.6), (49.6, 63.6), (28.6, 67.2), (44.6, 85.6), (47.4, 85.6)):
        P('tk.den-da-m', x, y)   # đầu cầu, cửa lầu, suối, bến câu, Tiên Đài

    # 2. cây trong phố: hàng anh đào xen ngân hạnh hai bên phố, cách đều
    for i, y in enumerate(range(55, 71, 4)):
        for x in (42.6, 49.4):
            P(CHERRY if i % 2 == 0 else GINKGO, x, y + 0.4, s=0.85)
    for i, x in enumerate(range(31, 40, 4)):
        for y in (45.6, 52.2):
            P(CHERRY, x + 0.5, y, s=0.85)
    for x in (36.2, 55.8):
        for y in (29.2, 26.4):
            P(PINE, x, y, s=0.9)
    for x, y in ((56, 61.5), (62, 62), (74.5, 61), (75.5, 44), (55.5, 44.4)):
        P(GINKGO, x, y, s=0.85)

    # 3. ven nước: liễu, trúc trên bờ; lau, cỏ nến sát mép; sen trong hồ; đá rêu
    shore = [(x, y) for y in range(D) for x in range(D) if G.get(x, y) == '.' and wd(x, y) == 1 and S.walk_r(x, y)]
    R.shuffle(shore)
    n = {'w': 0, 'b': 0, 'r': 0}
    for x, y in shore:
        if rd(x, y) < 2 or camp(x, y):
            continue
        t = R.random()
        if t < 0.16 and n['w'] < 13 and P(WILLOW, x + 0.5, y + 0.9, s=round(0.72 + R.random() * 0.14, 2), f=R.random() < 0.5):
            n['w'] += 1
        elif t < 0.3 and n['b'] < 12 and P(BAMBOO, x + 0.5, y + 0.9, f=R.random() < 0.5):
            n['b'] += 1
        elif t < 0.62 and n['r'] < 34:
            n['r'] += P('tk.bui-lau-sc' if R.random() < 0.55 else 'tk.bui-co-nen-sc', x + R.random(), y + 0.3 + R.random() * 0.6, s=0.55, f=R.random() < 0.5)
        elif t < 0.7:
            P('tk.soi-reu-sc' if R.random() < 0.6 else 'tk.da-reu-m', x + 0.5, y + 0.8, s=0.8)
    lake = [(x, y) for y in range(60, 72) for x in range(13, 29) if G.get(x, y) == '=' and wd(x + 2, y) == 0 and wd(x - 2, y) == 0 and wd(x, y + 1) == 0 and wd(x, y - 1) == 0]
    R.shuffle(lake)
    for x, y in lake[:6]:
        if abs(x - 27) > 3 or abs(y - 65) > 2:   # chừa mặt nước trước bến câu
            P('tk.sen-la-sc', x + 0.5, y + 1, s=0.6, force=True, f=R.random() < 0.5)
    P('tk.da-reu-lon-sc', 26.8, 18.4, s=0.8); P('tk.da-reu-lon-sc', 21.6, 17.8, s=0.7, f=1)

    # 4. thạch anh mọc cụm ở nơi linh khí: chân thác và quanh Kiếm Trủng
    for cx, cy in ((28.6, 20.4), (74.6, 21.6), (69.4, 22.6)):
        for sid, dx, dy in (('tk.pha-le-lam', 0, 0), ('tk.pha-le-nho', 1.1, 0.5), ('tk.pha-le-tim', -0.9, 0.7)):
            P(sid, cx + dx, cy + dy)
    for x, y in ((70.4, 18.8), (73.8, 18.6), (75, 23.4)):
        P('tk.kiem-da-m', x, y, s=0.8)

    # 5. rừng ngoài hoang: mọc theo cụm (nhiễu), loài theo vùng; chừa đường, bãi quái, mép tinh cầu
    f1, f2 = vnoise(7), vnoise(23)
    pts = [(x + R.random() * 5, y + R.random() * 5) for y in range(8, 90, 5) for x in range(4, 90, 5) for _ in range(12)]
    R.shuffle(pts)
    for x, y in pts:
        r = rr(x, y)
        if r > 41.5 or camp(x, y) or rd(x, y) < 2 or wd(x, y) < 2 or G.get(int(x), int(y)) != '.':
            continue
        dens = f1(x, y, 9) * 0.65 + f2(x, y, 4) * 0.35
        if dens < (0.62 if in_town(x, y, 1) else 0.36 if r > 30 else 0.5) or (in_town(x, y, 1) and rd(x, y) < 4):
            continue   # trong phố đã có hàng cây, chỉ thêm vài gốc ở góc khuất; ven làng thưa hơn rừng sâu
        if pd(x, y) < 6 or y < 22:
            sid = PINE
        elif x > 62 and y < 60:
            sid = MAPLE if R.random() < 0.7 else GINKGO
        elif y > 62:
            sid = CHERRY if R.random() < 0.55 else GINKGO
        else:
            sid = PINE if R.random() < 0.5 else MAPLE
        if R.random() < 0.06:
            sid = OLD
        P(sid, x, y, s=round(0.85 + R.random() * 0.3, 2), f=R.random() < 0.5)

    # 6. bụi, đá, sỏi rải thưa: bụi hoa gần phố, bụi xanh và lau trong rừng, đá gần núi
    pts = [(x + R.random() * 2, y + R.random() * 2) for y in range(8, 90, 2) for x in range(4, 90, 2)]
    R.shuffle(pts)
    for x, y in pts:
        r = rr(x, y)
        if r > 42.5 or rd(x, y) < 1 or wd(x, y) < 2 or G.get(int(x), int(y)) != '.' or (int(x), int(y)) in S.solid:
            continue
        t, v = R.random(), f2(x + 40, y, 5)
        if pd(x, y) < 4 and t < 0.16:
            P(R.choice(['tk.da-cum-m', 'tk.da-reu-m', 'tk.da-ta-m']), x, y, f=R.random() < 0.5)
        elif in_town(x, y) and t < 0.05 and rd(x, y) < 4:
            P(R.choice(['tk.bui-hong-m', 'tk.bui-cuc-m']), x, y)
        elif not in_town(x, y, 1) and not camp(x, y) and v > 0.55 and t < 0.1:
            P(R.choice(['tk.bui-xanh-m', 'tk.bui-xanh-m', 'tk.bui-lau-m', 'tk.soi-m', 'tk.da-tim-m']), x, y, f=R.random() < 0.5)


def khach():
    """Lối khách hội dạo: quảng trường, bốn phố, sân tông môn, sân chợ, xóm dân. Điểm 4 số là chỗ đứng xem trò."""
    nodes = [[46, 50.5], [46, 44.5], [46, 40], [46, 35], [42, 31.5], [50, 31.5], [46, 31.5], [52.5, 48.5], [58, 48.5], [65, 49.5], [72, 49.5],
             [62, 52], [68, 52], [63.5, 57], [46, 54.5], [46, 59.5], [43, 62.5], [49, 62.5], [46, 66.5], [39.5, 48.5], [35, 48.5], [31, 50.6],
             [37.5, 35, 34.5, 34.6], [53.5, 37.6, 57.5, 37.6], [50.6, 36.6, 52.6, 35.8], [40.5, 49], [51.5, 49]]
    links = [[0, 25], [0, 26], [25, 19], [26, 7], [0, 1], [1, 2], [2, 3], [3, 6], [6, 4], [6, 5], [4, 22], [5, 23], [3, 24], [7, 8], [8, 9],
             [9, 10], [9, 11], [9, 12], [11, 13], [12, 13], [11, 12], [0, 14], [14, 15], [15, 16], [15, 17], [16, 18], [17, 18], [19, 20], [20, 21]]
    return {'nodes': nodes, 'links': links}
