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
    def __init__(self, D):
        self.D, self.c, self.R = D, D / 2, D / 2 - 0.5

    def inside(self, x, y):
        return 0 <= x < self.D and 0 <= y < self.D and (x + 0.5 - self.c) ** 2 + (y + 0.5 - self.c) ** 2 <= self.R ** 2

    def r(self, x, y):
        return math.hypot(x + 0.5 - self.c, y + 0.5 - self.c)

    def at(self, r, deg):
        a = math.radians(deg)   # 0 độ = đông, 90 độ = nam (y xuống)
        return self.c + math.cos(a) * r, self.c + math.sin(a) * r


class Grid:
    def __init__(self, D, fill='.', void='~'):
        self.disk = Disk(D)
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


def rng(seed):
    return random.Random(seed)
