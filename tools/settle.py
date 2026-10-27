# Lớp nhà cửa, cây cối trên tinh cầu (data/planets.json → settle): xóm nhỏ có sân và vài căn nhà, lùm cây.
# Chạy: python3 -I tools/settle.py. Bản đồ đã làm có planet.settle thì bỏ qua. Không đặt lên đảo cũ, mép đĩa, bãi quái, cổng, NPC.
import json, math, random, os, sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from planetize import load, save_map, DATA   # noqa: E402


def settle(mid, cfg, S, tiles):
    path = os.path.join(DATA, 'maps', mid + '.json')
    m = load(os.path.join('maps', mid + '.json'))
    pl = m.get('planet')
    if not pl or pl.get('settle'):
        return False
    solid = lambda ch: tiles.get(ch, {}).get('solid', False)
    g = [list(r) for r in m['grid']]
    D = pl['d']
    ox, oy = pl['origin']
    c, R = D / 2, D / 2 - 0.5
    inside = lambda x, y: 0 <= x < D and 0 <= y < D and (x + 0.5 - c) ** 2 + (y + 0.5 - c) ** 2 <= R * R
    rim = lambda x, y: any(not inside(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
    oldbox = lambda x, y: ox - 1 <= x <= D - ox and oy - 1 <= y <= D - oy
    fill, pch = cfg['fill'], cfg['path']
    keep = set()
    for p in list(m['spawns'].values()) + [p['at'] for p in m['portals']] + [n['at'] for n in m['npcs']]:
        keep.add(tuple(p))
    for s in m['spawners']:
        for y in range(s['at'][1] - 3, s['at'][1] + 4):
            for x in range(s['at'][0] - 3, s['at'][0] + 4):
                keep.add((x, y))
    sc = next((s['at'] for s in load('scenic.json')['spots'] if s['map'] == mid), None)
    if sc:
        for y in range(sc[1] - 2, sc[1] + 2):
            for x in range(sc[0] - 2, sc[0] + 3):
                keep.add((x, y))
    plain = lambda x, y: inside(x, y) and not rim(x, y) and not oldbox(x, y) and (x, y) not in keep and g[y][x] in (fill, *cfg['scatter'])
    rng = random.Random(mid + ':settle')
    house = S['house'].get(mid, 'H')
    tree = S['tree'].get(mid, 'T')
    zone = [(x, y) for y in range(D) for x in range(D) if plain(x, y) and 0.3 * R < math.hypot(x + 0.5 - c, y + 0.5 - c) < 0.9 * R]
    built, w, h, pr, plazas = 0, S['w'], S['h'], S['plaza'], []
    for _ in range(S['hamlets'] if house else 0):
        # Tìm chỗ đủ rộng cho sân và dãy nhà phía bắc sân (thử nhiều nhà trước, chật thì ít nhà)
        found = None
        for n in range(S['houses'][1], S['houses'][0] - 1, -1):
            row = n * w + n - 1
            for _try in range(400):
                hx, hy = rng.choice(zone)
                x0 = hx - row // 2
                box = [(x, y) for y in range(hy - pr - h - 1, hy + pr + 1) for x in range(min(x0, hx - pr) - 1, max(x0 + row, hx + pr + 1) + 1)]
                if all(plain(x, y) for x, y in box):
                    found = (n, hx, hy, x0)
                    break
            if found:
                break
        if not found:
            continue
        n, hx, hy, x0 = found
        plazas.append([hx, hy])
        for y in range(hy - pr, hy + pr + 1):
            for x in range(hx - pr, hx + pr + 1):
                g[y][x] = pch if pch != fill else fill
        slots = [(x0 + i * (w + 1), hy - pr - h) for i in range(n)]   # cửa nhìn xuống sân
        for sx, sy in slots:
            for y in range(sy, sy + h):
                for x in range(sx, sx + w):
                    g[y][x] = house
            built += 1
        # Đường mòn từ sân về phía tâm cho tới khi gặp đường cũ hoặc đảo cũ
        x, y = hx, hy + pr + 1
        while inside(x, y) and not oldbox(x, y) and g[y][x] != pch:
            if (x, y) in keep or solid(g[y][x]) and g[y][x] not in (*cfg['scatter'], '^'):
                break
            if not rim(x, y):
                g[y][x] = pch if pch != fill else fill
            vx, vy = c - x, c - y
            x, y = (x + (1 if vx > 0 else -1), y) if abs(vx) > abs(vy) else (x, y + (1 if vy > 0 else -1))
    trees = 0
    for _ in range(S['groves']):
        gx, gy = rng.choice(zone)
        r = rng.randint(*S['grove_r'])
        for y in range(gy - r, gy + r + 1):
            for x in range(gx - r, gx + r + 1):
                if plain(x, y) and g[y][x] == fill and math.hypot(x - gx, y - gy) <= r and rng.random() < 0.6:
                    g[y][x] = tree
                    trees += 1
    # Nối liền như các lớp trước
    start = tuple(m['spawns']['vao'])
    seen, q = {start}, deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = (x + dx, y + dy)
            if nb not in seen and inside(*nb) and not solid(g[nb[1]][nb[0]]):
                seen.add(nb)
                q.append(nb)
    for p in [tuple(s['at']) for s in m['spawners']] + [tuple(p['at']) for p in m['portals']] + ([tuple(sc)] if sc else []):
        if p not in seen:
            sys.exit(f'{mid}: {p} không tới được sau khi xây xóm')
    lost = 0
    for y in range(D):
        for x in range(D):
            if inside(x, y) and not oldbox(x, y) and not solid(g[y][x]) and (x, y) not in seen:
                g[y][x] = tree
                lost += 1
    m['grid'] = [''.join(r) for r in g]
    pl['settle'] = 1
    if plazas:
        m['hamlets'] = plazas   # sân các xóm mới: lớp người, thú đặt dân làng ở đây
    save_map(path, m)
    print(f'{mid}: {built} căn nhà ({house}), {trees} cây ({tree}), lấp {lost} ô kín')
    return True


def main():
    P, tiles = load('planets.json'), load('tiles.json')['types']
    done = [mid for mid, cfg in P['maps'].items() if settle(mid, cfg, P['settle'], tiles)]
    print('Xong' if done else 'Không có bản đồ nào cần xây.')


if __name__ == '__main__':
    main()
