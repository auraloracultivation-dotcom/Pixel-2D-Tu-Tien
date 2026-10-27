# Lớp địa hình trên tinh cầu tròn (data/planets.json → terrain): dãy núi, hồ hoặc biển, sông từ chân núi ra mép đĩa.
# Chạy: python3 -I tools/terrain.py. Bản đồ đã làm có planet.terrain thì bỏ qua. Không đặt lên đảo cũ, mép đĩa, bãi quái, cổng, NPC.
import json, math, random, os, sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from planetize import load, save_map, DATA   # noqa: E402

MOUNT = '^'


def terrain(mid, cfg, T, tiles):
    path = os.path.join(DATA, 'maps', mid + '.json')
    m = load(os.path.join('maps', mid + '.json'))
    pl = m.get('planet')
    if not pl or pl.get('terrain'):
        return False
    solid = lambda ch: tiles.get(ch, {}).get('solid', False)
    g = [list(r) for r in m['grid']]
    D = pl['d']
    ox, oy = pl['origin']
    c, R = D / 2, D / 2 - 0.5
    inside = lambda x, y: 0 <= x < D and 0 <= y < D and (x + 0.5 - c) ** 2 + (y + 0.5 - c) ** 2 <= R * R
    rim = lambda x, y: any(not inside(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
    oldbox = lambda x, y: ox - 1 <= x <= D - ox and oy - 1 <= y <= D - oy
    fill = cfg['fill']
    keep = set()
    for p in list(m['spawns'].values()) + [p['at'] for p in m['portals']] + [n['at'] for n in m['npcs']]:
        keep.add(tuple(p))
    for s in m['spawners']:
        for y in range(s['at'][1] - 2, s['at'][1] + 3):
            for x in range(s['at'][0] - 2, s['at'][0] + 3):
                keep.add((x, y))
    sc = next((s['at'] for s in load('scenic.json')['spots'] if s['map'] == mid), None)
    if sc:
        for y in range(sc[1] - 2, sc[1] + 2):
            for x in range(sc[0] - 2, sc[0] + 3):
                keep.add((x, y))
    road = lambda x, y: cfg['path'] != fill and g[y][x] == cfg['path']   # đường mòn giữ nguyên (sông chảy qua thành cầu)
    base = lambda x, y: inside(x, y) and not rim(x, y) and not oldbox(x, y) and (x, y) not in keep
    ok = lambda x, y: base(x, y) and not road(x, y) and (not solid(g[y][x]) or g[y][x] in cfg['scatter'])
    rng = random.Random(mid + ':terrain')
    zone = [(x, y) for y in range(D) for x in range(D) if ok(x, y) and 0.4 * R < math.hypot(x + 0.5 - c, y + 0.5 - c) < 0.88 * R]
    if not zone:
        return False
    water = T['water'].get(mid, '=')
    mounts = []
    # Dãy núi: bước ngẫu nhiên, nghiêng theo hướng vòng quanh tâm
    for _ in range(T['mountains']):
        x, y = rng.choice(zone)
        a = math.atan2(y + 0.5 - c, x + 0.5 - c) + math.pi / 2 * rng.choice((1, -1))
        for _ in range(rng.randint(*T['len'])):
            for px, py in ((x, y), (x + rng.choice((-1, 0, 1)), y + rng.choice((-1, 0, 1)))):
                if ok(px, py):
                    g[py][px] = MOUNT
                    mounts.append((px, py))
            a += rng.uniform(-0.5, 0.5)
            x, y = int(round(x + math.cos(a))), int(round(y + math.sin(a)))
    # Hồ, biển
    lakes = []
    for _ in range(T['lakes']):
        lx, ly = rng.choice(zone)
        r = rng.randint(*T['r'])
        for y in range(ly - r - 1, ly + r + 2):
            for x in range(lx - r - 1, lx + r + 2):
                if ok(x, y) and math.hypot(x - lx, y - ly) <= r + rng.uniform(-0.6, 0.6):
                    g[y][x] = water
        lakes.append((lx, ly))
    # Sông: từ chân núi chảy ra xa tâm, lượn nhẹ, cứ ford ô để một chỗ lội
    for i in range(T['rivers']):
        if not mounts:
            break
        x, y = rng.choice(mounts)
        step = 0
        for _ in range(60):
            vx, vy = x + 0.5 - c, y + 0.5 - c
            if rng.random() < 0.35:
                vx, vy = -vy, vx   # rẽ ngang một chút cho sông uốn
            nx, ny = (x + (1 if vx > 0 else -1), y) if abs(vx) >= abs(vy) else (x, y + (1 if vy > 0 else -1))
            if not inside(nx, ny) or rim(nx, ny) or g[ny][nx] == water:
                break
            x, y = nx, ny
            if oldbox(x, y) or (x, y) in keep:
                break
            step += 1
            if g[y][x] != MOUNT and not road(x, y):
                g[y][x] = fill if step % T['ford'] == 0 else water
    # Nối liền: bãi quái, cổng, đá ngắm cảnh phải tới được; túi kín ở vùng mới thì lấp núi
    start = tuple(m['spawns']['vao'])
    seen, q = {start}, deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in seen and inside(*n) and not solid(g[n[1]][n[0]]):
                seen.add(n)
                q.append(n)
    must = [tuple(s['at']) for s in m['spawners']] + [tuple(p['at']) for p in m['portals']] + ([tuple(sc)] if sc else [])
    for p in must:
        if p not in seen:
            sys.exit(f'{mid}: {p} không tới được sau khi đắp địa hình')
    lost = 0
    for y in range(D):
        for x in range(D):
            if inside(x, y) and not oldbox(x, y) and not solid(g[y][x]) and (x, y) not in seen:
                g[y][x] = MOUNT
                lost += 1
    m['grid'] = [''.join(r) for r in g]
    pl['terrain'] = 1
    save_map(path, m)
    print(f'{mid}: {len(mounts)} ô núi, {len(lakes)} hồ ({water}), {T["rivers"]} sông, lấp {lost} ô kín')
    return True


def main():
    P, tiles = load('planets.json'), load('tiles.json')['types']
    T = P['terrain']
    done = [mid for mid, cfg in P['maps'].items() if terrain(mid, cfg, T, tiles)]
    print('Xong' if done else 'Không có bản đồ nào cần đắp địa hình.')


if __name__ == '__main__':
    main()
