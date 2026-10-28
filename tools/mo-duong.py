# Mở đường trên các tinh cầu (chủ dự án xin 28/10/2026: "mấy cái cây chắn lối farm", "truyền tống hành tinh thì bỏ đi").
# Chạy: python3 -I tools/mo-duong.py. Bản đồ đã làm có planet.open thì bỏ qua.
# 1. Hàng cây dài (viền đảo cũ, mê cung Rừng Mê) tỉa thành lùm nhỏ cách quãng: mỗi lùm tối đa 4 cây, giữa hai lùm còn lối đi ít nhất 2 ô.
# 2. Quanh bãi quái (bán kính spread + 2) và quanh cổng, NPC, chỗ xuất hiện không còn cây.
# 3. Cổng nối hai tinh cầu (bay được bằng Bản đồ) thành đường bay: thêm "fly": true, bỏ ô cổng trên lưới, giẫm qua không bị truyền tống.
#    Cổng vào bí cảnh, động phủ, Làng Tinh Linh giữ nguyên.
import json, math, os, sys
from collections import deque, Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from planetize import load, save_map, DATA   # noqa: E402

TREES = set('TZYV')
GAP = 3        # hai lùm cách nhau ít nhất (ô, Chebyshev)
CLUMP = 4      # số cây tối đa mỗi lùm
LONG = 6       # hàng cây từ chừng này ô trở lên thì tỉa


def planets():
    sm = load('starmap.json')
    return {b['map'] for b in sm['bodies'] if b.get('map') and b.get('kind') not in ('lost', 'soon', 'boss')}


def open_map(mid, P, tiles, fills):
    path = os.path.join(DATA, 'maps', mid + '.json')
    m = load(os.path.join('maps', mid + '.json'))
    pl = m.get('planet')
    if not pl or pl.get('open'):
        return None
    solid = lambda ch: tiles.get(ch, {}).get('solid', False)
    g = [list(r) for r in m['grid']]
    H, W = len(g), len(g[0])
    fill = fills.get(mid, {}).get('fill', '.')
    paths = {',', 'l', 'o', fills.get(mid, {}).get('path', ',')}

    def floor_at(x, y):   # nền thay cho cây: nền đi được phổ biến nhất quanh đó (không lấy đường mòn, cổng)
        cnt = Counter()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if (dx or dy) and 0 <= y + dy < H and 0 <= x + dx < W:
                    ch = g[y + dy][x + dx]
                    if ch and not solid(ch) and ch not in paths and ch not in 'PMSD~F':
                        cnt[ch] += 1
        return cnt.most_common(1)[0][0] if cnt else fill

    removed = 0
    # 1. tỉa hàng cây dài
    seen = set()
    for y in range(H):
        for x in range(W):
            if g[y][x] not in TREES or (x, y) in seen:
                continue
            comp, q = [], deque([(x, y)])
            seen.add((x, y))
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        n = (cx + dx, cy + dy)
                        if 0 <= n[1] < H and 0 <= n[0] < W and n not in seen and g[n[1]][n[0]] in TREES:
                            seen.add(n); q.append(n)
            if len(comp) < LONG:
                continue
            cs, keep, seeds = set(comp), set(), []
            for cx, cy in sorted(comp, key=lambda p: (p[1], p[0])):
                if any(max(abs(cx - sx), abs(cy - sy)) < GAP + 1 for sx, sy in seeds):
                    continue
                seeds.append((cx, cy)); keep.add((cx, cy))
                for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
                    if len([k for k in keep if max(abs(k[0] - cx), abs(k[1] - cy)) <= 1]) >= CLUMP:
                        break
                    if (cx + dx, cy + dy) in cs:
                        keep.add((cx + dx, cy + dy))
            for cx, cy in comp:
                if (cx, cy) not in keep:
                    g[cy][cx] = None
                    removed += 1
    for y in range(H):
        for x in range(W):
            if g[y][x] is None:
                g[y][x] = floor_at(x, y)
    # 2. dọn quanh bãi quái, cổng, NPC, chỗ xuất hiện
    clear = []
    for s in m['spawners']:
        r = s.get('spread', P['farm']['spread'] if s.get('farm') else 2) + 2
        clear.append((s['at'], r))
    for p in list(m['spawns'].values()) + [p['at'] for p in m['portals']] + [n['at'] for n in m['npcs']]:
        clear.append((p, 1))
    for (ax, ay), r in clear:
        for y in range(ay - r, ay + r + 1):
            for x in range(ax - r, ax + r + 1):
                if 0 <= y < H and 0 <= x < W and g[y][x] in TREES:
                    g[y][x] = floor_at(x, y); removed += 1
    # 3. cổng nối hai tinh cầu thành đường bay
    flown = []
    for p in m['portals']:
        if mid in PLANETS and p['to'] in PLANETS:
            p['fly'] = True
            x, y = p['at']
            if g[y][x] == 'P':
                g[y][x] = floor_at(x, y)
            flown.append(p['to'])
    m['grid'] = [''.join(r) for r in g]
    pl['open'] = 1
    save_map(path, m)
    return removed, flown


def reach_report(mid, tiles):
    m = load(os.path.join('maps', mid + '.json'))
    solid = lambda ch: tiles.get(ch, {}).get('solid', False)
    g, start = m['grid'], tuple(m['spawns'].get('vao') or next(iter(m['spawns'].values())))
    dist, q = {start: 0}, deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in dist and 0 <= n[1] < len(g) and 0 <= n[0] < len(g[0]) and not solid(g[n[1]][n[0]]):
                dist[n] = dist[(x, y)] + 1; q.append(n)
    worst = []
    for s in m['spawners']:
        a = tuple(s['at'])
        d = dist.get(a)
        straight = abs(a[0] - start[0]) + abs(a[1] - start[1])
        worst.append((round(d / max(1, straight), 2) if d is not None else 'KHONG TOI', s['mob'], a))
    return worst


if __name__ == '__main__':
    P = load('planets.json')
    tiles = load('tiles.json')['types']
    PLANETS = planets()
    for mid in load('config.json')['maps']:
        r = open_map(mid, P, tiles, P['maps'])
        if r:
            print(f'{mid}: bỏ {r[0]} cây, đường bay tới {r[1]}')
            bad = [w for w in reach_report(mid, tiles) if w[0] == 'KHONG TOI' or w[0] > 1.6]
            if bad:
                print('   bãi đi vòng xa:', bad)
