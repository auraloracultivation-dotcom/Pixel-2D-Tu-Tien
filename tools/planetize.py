# Phóng đảo thành tinh cầu tròn (data/planets.json). Chạy: python3 -I tools/planetize.py
# Đảo cũ đặt giữa đĩa, vùng mới rải vật cản thành cụm, bốn đường mòn toả từ tâm ra mép, thêm bãi quái vòng ngoài,
# rồi dịch mọi toạ độ trỏ vào bản đồ đó (bản đồ, story, side, scenic, events). Bản đồ đã có "planet" thì bỏ qua.
import json, math, random, os, sys
from collections import deque

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'data')
HARD = set('HBWQNzKASMPDGJ')   # không bao giờ cắt đường qua


def load(name):
    with open(os.path.join(DATA, name), encoding='utf8') as f:
        return json.load(f)


def dump_compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(', ', ': '))


def save_map(path, m):
    # Giữ kiểu viết cũ: mỗi khoá một dòng, lưới mỗi hàng một dòng
    out = ['{']
    keys = list(m.keys())
    for i, k in enumerate(keys):
        end = ',' if i < len(keys) - 1 else ''
        if k == 'grid':
            out.append(' "grid": [')
            out += ['  ' + json.dumps(r, ensure_ascii=False) + (',' if j < len(m['grid']) - 1 else '') for j, r in enumerate(m['grid'])]
            out.append(' ]' + end)
        else:
            out.append(f' {json.dumps(k)}: {dump_compact(m[k])}{end}')
    out.append('}')
    with open(path, 'w', encoding='utf8') as f:
        f.write('\n'.join(out) + '\n')


def save_json(name, obj, text):
    with open(os.path.join(DATA, name), 'w', encoding='utf8') as f:
        f.write(text)


def planetize(mid, cfg, P, tiles):
    path = os.path.join(DATA, 'maps', mid + '.json')
    m = load(os.path.join('maps', mid + '.json'))
    if 'planet' in m:
        return None
    solid = lambda ch: tiles.get(ch, {}).get('solid', False)
    g = m['grid']
    W, H = max(len(r) for r in g), len(g)
    g = [r.ljust(W, '~') for r in g]
    D = cfg['d']
    ox, oy = (D - W) // 2, (D - H) // 2
    c, R = D / 2, D / 2 - 0.5
    inside = lambda x, y: 0 <= x < D and 0 <= y < D and (x + 0.5 - c) ** 2 + (y + 0.5 - c) ** 2 <= R * R
    rim = lambda x, y: inside(x, y) and any(not inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    new = [['~'] * D for _ in range(D)]
    old = set()
    for y in range(H):
        for x in range(W):
            if g[y][x] != '~':
                X, Y = x + ox, y + oy
                if not inside(X, Y):
                    sys.exit(f'{mid}: ô cũ ({x},{y}) nằm ngoài đĩa, tăng d')
                new[Y][X] = g[y][x]
                old.add((X, Y))
    fill = cfg['fill']
    for y in range(D):
        for x in range(D):
            if inside(x, y) and (x, y) not in old:
                new[y][x] = fill
    sh = lambda p: [p[0] + ox, p[1] + oy]
    keep = set()   # ô không được đè: NPC, cổng, điểm vào
    for p in m['spawns'].values():
        keep.add(tuple(sh(p)))
    for p in m['portals']:
        keep.add(tuple(sh(p['at'])))
    for n in m['npcs']:
        keep.add(tuple(sh(n['at'])))
    rng = random.Random(mid)
    free = [(x, y) for y in range(D) for x in range(D) if inside(x, y) and (x, y) not in old and not rim(x, y)]
    freeset = set(free)
    # Vật cản rải thành cụm
    for ch, pct in cfg['scatter'].items():
        target, placed, tries = len(free) * pct / 100, 0, 0
        while placed < target and tries < 5000:
            tries += 1
            sx, sy = rng.choice(free)
            r = rng.choice((1, 1, 2, 2, 3))
            for y in range(sy - r, sy + r + 1):
                for x in range(sx - r, sx + r + 1):
                    if (x, y) in freeset and new[y][x] == fill and (x - sx) ** 2 + (y - sy) ** 2 <= r * r + 0.5 and rng.random() < 0.7:
                        new[y][x] = ch
                        placed += 1
    # Đường mòn: từ tâm đảo cũ toả 4 hướng ra mép
    soft, pch = set(P['soft']), cfg['path']
    cx, cy = ox + W // 2, oy + H // 2
    for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
        for off in (0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6):
            x, y = cx + off * abs(dy), cy + off * abs(dx)
            cells = []
            while inside(x, y):
                cells.append((x, y))
                x, y = x + dx, y + dy
            if any(new[b][a] in HARD or (a, b) in keep for a, b in cells):
                continue
            for a, b in cells:
                ch = new[b][a]
                if solid(ch) and ch in soft:
                    new[b][a] = pch
                elif (a, b) not in old:
                    new[b][a] = pch
            break
    # Bãi quái vòng ngoài
    mobs = [s['mob'] for s in m['spawners'] if not s.get('need') and not s.get('unless')]
    added = []
    for ring in cfg.get('rings', P['rings']) if mobs else []:
        a0 = rng.random() * math.tau
        for i in range(ring['n']):
            a = a0 + i * math.tau / ring['n']
            tx, ty = int(c + math.cos(a) * ring['r'] * R), int(c + math.sin(a) * ring['r'] * R)
            spot = min((p for p in free if new[p[1]][p[0]] != '~'), key=lambda p: (p[0] - tx) ** 2 + (p[1] - ty) ** 2)
            for y in range(spot[1] - 1, spot[1] + 2):
                for x in range(spot[0] - 1, spot[0] + 2):
                    if (x, y) in freeset and solid(new[y][x]):
                        new[y][x] = fill
            sp = {'mob': mobs[(i + len(added)) % len(mobs)], 'at': list(spot), 'farm': True}
            if ring['mul'] != 1:
                sp['mul'] = ring['mul']
            added.append(sp)
    # Đá ngắm cảnh: mép nam
    sx = int(c)
    sy = max(y for y in range(D) if inside(sx, y))
    for y in range(sy - 1, sy + 1):
        for x in range(sx - 1, sx + 2):
            if inside(x, y) and (x, y) not in old:
                new[y][x] = fill
    scenic_at = [sx, sy]
    # Nối liền: vùng mới không tới được từ điểm vào thì lấp bằng vật cản (không để túi kín có quái)
    start = tuple(sh(m['spawns']['vao']))
    seen, q = {start}, deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in seen and inside(*n) and not solid(new[n[1]][n[0]]):
                seen.add(n)
                q.append(n)
    filler = next((ch for ch in cfg['scatter'] if solid(ch)), '#')
    lost = 0
    for y in range(D):
        for x in range(D):
            if inside(x, y) and (x, y) not in old and not solid(new[y][x]) and (x, y) not in seen:
                new[y][x] = filler
                lost += 1
    for sp in added:
        if tuple(sp['at']) not in seen:
            sys.exit(f'{mid}: bãi quái {sp["at"]} không tới được')
    if tuple(scenic_at) not in seen:
        sys.exit(f'{mid}: đá ngắm cảnh {scenic_at} không tới được')
    # Dịch toạ độ trong bản đồ
    m['spawns'] = {k: sh(p) for k, p in m['spawns'].items()}
    for p in m['portals']:
        p['at'] = sh(p['at'])
    for n in m['npcs']:
        n['at'] = sh(n['at'])
    for s in m['spawners']:
        s['at'] = sh(s['at'])
    m['spawners'] += added
    m['grid'] = [''.join(r) for r in new]
    out = {}
    for k, v in m.items():   # đặt "planet" ngay sau "world"
        out[k] = v
        if k == 'world':
            out['planet'] = {'d': D, 'origin': [ox, oy]}
    if 'planet' not in out:
        out['planet'] = {'d': D, 'origin': [ox, oy]}
    save_map(path, out)
    print(f'{mid}: {W}x{H} → đĩa {D}, gốc ({ox},{oy}), thêm {len(added)} bãi quái, lấp {lost} ô kín')
    return (ox, oy), scenic_at


def shift_pairs(v, o):
    if isinstance(v, list) and len(v) == 2 and all(isinstance(a, int) for a in v):
        return [v[0] + o[0], v[1] + o[1]]
    if isinstance(v, list):
        return [shift_pairs(a, o) for a in v]
    return v


def main():
    P, tiles = load('planets.json'), load('tiles.json')['types']
    off, scenic = {}, {}
    for mid, cfg in P['maps'].items():
        r = planetize(mid, cfg, P, tiles)
        if r:
            off[mid], scenic[mid] = r
    if not off:
        print('Không có bản đồ nào cần phóng.')
        return
    # Kịch bản: target theo target_map hoặc map của bước; toạ độ trong do và until.reach theo map của bước
    raw = open(os.path.join(DATA, 'story.json'), encoding='utf8').read()
    story = json.loads(raw)
    n = 0
    for st in story['steps']:
        tm, mp = st.get('target_map') or st.get('map'), st.get('map')
        if st.get('target') and tm in off:
            st['target'] = shift_pairs(st['target'], off[tm]); n += 1
        if mp in off:
            for d in st.get('do', []):
                if 'at' in d:
                    d['at'] = shift_pairs(d['at'], off[mp]); n += 1
            u = st.get('until') or {}
            if 'reach' in u:
                u['reach'] = shift_pairs(u['reach'], off[mp]); n += 1
    write_like(raw, story, 'story.json')
    side_raw = open(os.path.join(DATA, 'side.json'), encoding='utf8').read()
    side = json.loads(side_raw)
    for q in side['quests'].values() if 'quests' in side else []:
        if q.get('map') in off and 'at' in q:
            q['at'] = shift_pairs(q['at'], off[q['map']]); n += 1
    write_like(side_raw, side, 'side.json')
    sc_raw = open(os.path.join(DATA, 'scenic.json'), encoding='utf8').read()
    sc = json.loads(sc_raw)
    for s in sc['spots']:
        if s['map'] in scenic:
            s['at'] = scenic[s['map']]; n += 1
    write_like(sc_raw, sc, 'scenic.json')
    ev_raw = open(os.path.join(DATA, 'events.json'), encoding='utf8').read()
    ev = json.loads(ev_raw)
    for f in ev.get('festivals', []):
        if f.get('npc_map') in off and 'npc_at' in f:
            f['npc_at'] = shift_pairs(f['npc_at'], off[f['npc_map']]); n += 1
    write_like(ev_raw, ev, 'events.json')
    print(f'Đã dịch {n} toạ độ ngoài bản đồ.')


def write_like(raw, obj, name):
    # Ghi lại bằng cách thay từng mảng toạ độ trong văn bản gốc để giữ nguyên định dạng
    old = json.loads(raw)
    text = raw
    pairs = []
    collect(old, obj, pairs)
    pos = 0
    for a, b in pairs:
        sa, sb = dump_compact(a), dump_compact(b)
        i = text.find(sa, pos)
        if i < 0:
            sys.exit(f'{name}: không tìm thấy {sa} để thay')
        text = text[:i] + sb + text[i + len(sa):]
        pos = i + len(sb)
    if json.loads(text) != obj:
        sys.exit(f'{name}: ghi lại không khớp')
    save_json(name, obj, text)


def collect(a, b, out):
    # Liệt kê theo thứ tự trong văn bản các giá trị đã đổi (chỉ mảng toạ độ)
    if isinstance(a, dict):
        for k in a:
            collect(a[k], b[k], out)
    elif isinstance(a, list) and a != b and (is_pair(a) or (a and all(is_pair(x) for x in a))):
        out.append((a, b))
    elif isinstance(a, list):
        for x, y in zip(a, b):
            collect(x, y, out)


def is_pair(v):
    return isinstance(v, list) and len(v) == 2 and all(isinstance(x, int) for x in v)


if __name__ == '__main__':
    main()
