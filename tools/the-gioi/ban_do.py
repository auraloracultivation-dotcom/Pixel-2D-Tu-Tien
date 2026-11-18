"""Đồ nghề dựng bản đồ tinh cầu theo luật thế giới (chủ dự án chốt 18/11/2026; luật ở docs/12-LUAT-THE-GIOI.md).
Dùng chung cho máy sinh từng tinh cầu (tk_moi.py …), ảnh toàn cảnh (toan_canh.py) và bộ soát luật (soat.py).
Toạ độ theo ô; món trang trí đặt theo CHÂN hình (x giữa, y đáy) như khoá hoi.do của bản đồ."""
import heapq
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data'


def load(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


ART = load('art.json')['sprites']
LH = load('le-hoi.json')
TILES = load('tiles.json')['types']


def solid_tile(ch):
    return bool(TILES.get(ch, {}).get('solid'))


# ---------- kiểu chân món (chép đúng src/world/hoi-foot.js) ----------
def kind_of(sid):
    rest, own_pre = sid[sid.index('.') + 1:], sid[:sid.index('.') + 1]
    best, kind = -1, 'nho'
    for p, k in LH['kinds'].items():
        key = p[p.index('.') + 1:]
        score = len(key) * 2 + (1 if p.startswith(own_pre) else 0)
        if rest.startswith(key) and score > best:
            best, kind = score, k
    return kind


def size(sid, s=1.0):
    """Cỡ hình theo ô (rộng, cao)."""
    sp = ART[sid]
    k = sp.get('scale', 1) * s / 16
    return sp['w'] * k, sp['h'] * k


def foot(sid, x, y, s=1.0):
    """Tập ô chắn (solid) và ô mở (open: cầu) của một món đặt chân ở (x, y)."""
    T = 16
    w, h = size(sid, s)
    w, h = w * T, h * T
    f = LH['foot'].get(kind_of(sid), {})
    solid, opn = set(), set()
    X, Y = x * T, y * T

    def mark(st, x0, x1, y0, y1):
        n0 = len(st)
        ty = math.floor(y0 / T)
        while ty * T < y1:
            tx = math.floor(x0 / T)
            while tx * T < x1:
                cx, cy = (tx + 0.5) * T, (ty + 0.5) * T
                if x0 <= cx <= x1 and y0 <= cy <= y1:
                    st.add((tx, ty))
                tx += 1
            ty += 1
        if len(st) == n0:
            st.add((math.floor((x0 + x1) / 2 / T), math.floor((y1 - 1) / T)))

    if f.get('flat') or (not f.get('w') and not f.get('walk')):
        return solid, opn
    d = h * f['dh'] if f.get('dh') else f.get('d', 0) * T
    if f.get('d') and f.get('dh'):
        d = min(f['d'] * T, h * f['dh'])
    if f.get('cap'):
        d = min(d, f['cap'] * T)
    ww = max(f.get('min', 0), w * f.get('w', 0))
    y0, y1 = Y - d, Y
    if f.get('walk'):
        mark(opn, X - ww / 2, X + ww / 2, y0, y1)
    elif f.get('pillars'):
        pw, L0, R1 = w * f['w'], X - w / 2 + w * 0.03, X + w / 2 - w * 0.03
        mark(solid, L0, L0 + pw, y0, y1)
        mark(solid, R1 - pw, R1, y0, y1)
    else:
        mark(solid, X - ww / 2, X + ww / 2, y0, y1)
    return solid, opn


def box(sid, x, y, s=1.0):
    """Khung hình (x0, y0, x1, y1) theo ô: để soát che khuất, chồng hình."""
    w, h = size(sid, s)
    return x - w / 2, y - h, x + w / 2, y


# ---------- đĩa tinh cầu ----------
class Disk:
    def __init__(self, D, R=None):
        self.D, self.c, self.R = D, D / 2, R or D / 2 - 0.5   # R: bán kính phần có ô đất (mặc định như tools/planetize.py)

    def inside(self, x, y):
        return 0 <= x < self.D and 0 <= y < self.D and (x + 0.5 - self.c) ** 2 + (y + 0.5 - self.c) ** 2 <= self.R ** 2

    def r(self, x, y):
        return math.hypot(x + 0.5 - self.c, y + 0.5 - self.c)

    def at(self, r, deg):
        a = math.radians(deg)   # 0 độ = đông, 90 độ = nam (y xuống)
        return self.c + math.cos(a) * r, self.c + math.sin(a) * r


class Grid:
    def __init__(self, D, fill='.', void='~', R=None):
        self.disk = Disk(D, R)
        self.D = D
        self.g = [[fill if self.disk.inside(x, y) else void for x in range(D)] for y in range(D)]

    def ok(self, x, y):
        return 0 <= x < self.D and 0 <= y < self.D and self.g[y][x] != '~'

    def get(self, x, y):
        return self.g[y][x] if 0 <= x < self.D and 0 <= y < self.D else '~'

    def set(self, x, y, ch, keep='~'):
        if self.ok(x, y) and self.g[y][x] not in keep:
            self.g[y][x] = ch

    def disc(self, cx, cy, r, ch, keep='~', ry=None):
        ry = ry or r
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                if ((x + 0.5 - cx) / r) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self.set(x, y, ch, keep)

    def rect(self, x0, y0, x1, y1, ch, keep='~'):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, ch, keep)

    def stroke(self, pts, width, ch, keep='~'):
        """Vẽ dải rộng width (ô) theo đường gấp khúc pts [(x, y)…] (tâm ô)."""
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            n = max(1, int(math.hypot(bx - ax, by - ay) * 3))
            for i in range(n + 1):
                t = i / n
                self.disc(ax + (bx - ax) * t, ay + (by - ay) * t, width / 2, ch, keep)

    def rows(self):
        return [''.join(r) for r in self.g]


TALL = ('cay', 'nha', 'tru', 'tuong', 'cong', 'cong-to', 'cong-tron', 'sap', 'nui')   # kiểu món có hình cao, che được người đứng sau
ROADS = '12,PM'


class Canh:
    """Cảnh đang dựng: lưới ô + đồ đặt theo chân; tự soát chắn lối, đè nước, chồng hình, che người, che đường (luật che khuất)."""

    def __init__(self, D, R=None, seed=1):
        self.D, self.C = D, D / 2
        self.G = Grid(D, R=R)
        self.items, self.solid, self.open, self.boxes, self.cover = [], set(), set(), [], set()
        self.keep, self.clear = [], []   # mốc phải chừa (x, y, bán kính ô); bãi trống (x, y, bán kính)
        self.cay, self.cap_cay = [], 12  # chân các cây đã trồng; số cây tối đa trong một màn dọc điện thoại (17×38 ô) quanh mỗi cây
        self.R = random.Random(seed)
        self.must, self.why = True, ''

    def walk_r(self, x, y):   # trong vòng đi được của đĩa (src/world/map.js discOf: lùi 1,46 ô)
        return math.hypot(x + 0.5 - self.C, y + 0.5 - self.C) <= self.D / 2 - 1.46

    def put(self, sid, x, y, s=1.0, label=None, f=0, on='.2', force=False):
        """Đặt một món chân ở (x, y). Trả False (và ghi why) nếu phạm luật."""
        sol, opn = foot(sid, x, y, s)
        b, k = box(sid, x, y, s), kind_of(sid)
        if not force and not self._ok(x, y, sol, b, k, on):
            if self.must:
                print('  KHÔNG ĐẶT ĐƯỢC:', sid, x, y, self.why)
            return False
        self.solid |= sol
        self.open |= opn
        if k in TALL:
            self.boxes.append(b)
        if k == 'cay':
            self.cay.append((x, y))
        if k in ('nha', 'tru', 'tuong', 'sap'):   # ô nằm sau hình cao (trên chân hình): đường mòn tránh đi qua kẻo người đi bị che
            self.cover |= {(cx, cy) for cx in range(int(b[0]), int(b[2]) + 1) for cy in range(int(b[1]), int(y))
                           if b[0] < cx + 0.5 < b[2] and b[1] < cy + 0.5 < y - 0.3}
        it = [sid, round(x, 1), round(y, 1)]
        if label or s != 1 or f:
            it.append(label)
        if s != 1 or f:
            it.append({**({'s': s} if s != 1 else {}), **({'f': 1} if f else {})})
        self.items.append(it)
        return True

    def _ok(self, x, y, sol, b, k, on):
        for c in sol:   # chân món: đúng loại nền, không chồng món khác, trong vòng đi được
            if self.G.get(*c) not in on or c in self.solid or not self.walk_r(*c):
                self.why = f'ô {c} {self.G.get(*c)!r}'
                return False
        for kx, ky, kr in self.keep:   # không chắn, không che người và cổng
            if any(abs(cx + 0.5 - kx) < kr and abs(cy + 0.5 - ky) < kr for cx, cy in sol) or (b[0] < kx < b[2] and b[1] < ky - 0.4 and ky < y):
                self.why = f'mốc {kx, ky}'
                return False
        if k == 'cay':
            if sum(1 for tx, ty in self.cay if abs(tx - x) <= 8.5 and abs(ty - y) <= 19) >= self.cap_cay:   # luật sức máy: rừng không dày quá
                self.why = 'rừng quá dày'
                return False
            for ob in self.boxes:   # cây không đè lên nhà, cây khác quá nửa hình
                ix, iy = min(b[2], ob[2]) - max(b[0], ob[0]), min(b[3], ob[3]) - max(b[1], ob[1])
                if ix > 0 and iy > 0 and ix * iy > 0.5 * min((b[2] - b[0]) * (b[3] - b[1]), (ob[2] - ob[0]) * (ob[3] - ob[1])):
                    self.why = 'đè hình'
                    return False
            for cx in range(int(b[0]), int(b[2]) + 1):   # tán cây không trùm lên đường, sân (người đi đường luôn thấy được)
                for cy in range(int(b[1]), int(y) + 1):
                    if b[0] < cx + 0.5 < b[2] and b[1] < cy + 0.5 < y and self.G.get(cx, cy) in ROADS:
                        self.why = f'tán che đường {cx, cy}'
                        return False
            for cx, cy, cr in self.clear:   # tán cây không trùm vào giữa bãi quái
                nx, ny = min(max(cx, b[0]), b[2]), min(max(cy, b[1]), b[3])
                if math.hypot(nx - cx, ny - cy) < cr - 1.5:
                    self.why = 'che bãi quái'
                    return False
        return True

    def passable(self, x, y):
        if (x, y) in self.open:
            return True
        return self.G.get(x, y) not in '~^=' and (x, y) not in self.solid and self.walk_r(x, y)

    def trail(self, a, b, wide=False):
        """Đường mòn đất từ a tới b: vòng qua vật cản, ưa nhập vào đường có sẵn, tránh luồn sau nhà (luật đường 09/11, luật che khuất)."""

        def cost(x, y):
            if not self.passable(x, y):
                return None
            ch = self.G.get(x, y)
            return (0.35 if ch == ',' else 0.6 if ch in '12' else 1 + ((x * 7 + y * 13) % 5) * 0.12) + (6 if (x, y) in self.cover else 0)

        p = astar(self.D, a, b, cost)
        assert p, f'không nối được {a} → {b}'
        for x, y in p:   # vệt chân rộng hai ô (ô lưới đôi vẽ ra lối đi liền, không đứt khúc)
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)) if wide else ((0, 0), (1, 0), (0, 1)):
                if self.passable(x + dx, y + dy) and (not (dx or dy) or (x + dx, y + dy) not in self.cover):   # không nới vệt vào sau mái nhà
                    self.G.set(x + dx, y + dy, ',', keep='~=^12PM')
        return p


def smooth(pts, n=8):
    """Đường cong Catmull-Rom qua các điểm (cho sông, đường mòn uốn tự nhiên)."""
    if len(pts) < 3:
        return pts
    P = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1])
    return out


def astar(D, start, goal, cost):
    """Đường ngắn nhất theo ô (8 hướng, đi chéo đắt hơn). cost(x, y) → None là không qua được."""
    sx, sy = start
    gx, gy = goal
    best = {start: 0}
    prev = {}
    pq = [(0, 0, start)]
    while pq:
        _, d, cur = heapq.heappop(pq)
        if cur == goal:
            break
        if d > best.get(cur, 1e18):
            continue
        cx, cy = cur
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            nx, ny = cx + dx, cy + dy
            if not (0 <= nx < D and 0 <= ny < D):
                continue
            c = cost(nx, ny)
            if c is None:
                continue
            if dx and dy and (cost(cx + dx, cy) is None or cost(cx, cy + dy) is None):
                continue   # không lách chéo qua khe hai vật
            nd = d + c * (1.414 if dx and dy else 1)
            if nd < best.get((nx, ny), 1e18):
                best[(nx, ny)] = nd
                prev[(nx, ny)] = cur
                heapq.heappush(pq, (nd + math.hypot(gx - nx, gy - ny) * 0.3, nd, (nx, ny)))
    if goal not in prev and goal != start:
        return None
    path, v = [goal], goal
    while v != start:
        v = prev[v]
        path.append(v)
    return path[::-1]

