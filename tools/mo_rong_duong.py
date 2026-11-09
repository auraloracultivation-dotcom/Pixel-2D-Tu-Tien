"""Phần bày đảo của tools/mo-rong-dao.py (chủ dự án 09/11/2026 13:15): "con đường là vết chân người đi nhiều mà thành, phải dẫn tới
một đích cụ thể (bãi quái, cây cổ thụ, tiệm...), đường lát và đường đất phải liền nhau; cột cờ, cây không được đung đưa cả chân;
núi, cây không được chặn đường; bỏ hết đồ bộ cũ viền đậm; đèn đường đặt chỗ hợp lý; đừng thấy gì lắp nấy".
Cách làm:
  1. Dọn: bỏ đồ hội bộ cũ (không có đuôi -m), hồ bộ cũ đổi thành mặt nước vẽ bằng code (ô nước của lưới), bỏ khối nhà ô, bỏ đường đất
     cũ (vẽ lại), bỏ đèn cũ (đặt lại theo đường).
  2. Cảnh lớn đặt trước ở vòng ngoài (mỗi cảnh một hướng), có biển tên.
  3. Đường: mỗi đích (cảnh lớn, bãi quái, cổng truyền tống, NPC ngoài phố) tìm đường ngắn nhất (A*) về mạng đường đã có (phố lát hoặc
     đường đất trước đó): đi trên đường có sẵn rẻ (nên các lối nhập vào nhau như người đi), qua núi đắt (chỉ xẻ núi khi không có lối
     vòng), không đi qua chân đồ. Ô nhiều lối đi qua (đông người) thì đường rộng hai ô.
  4. Đèn: dọc mép phố lát cách nhau đều, ở chỗ đường đất rẽ khỏi phố, và bên mỗi cảnh lớn. Biển gỗ ở chỗ rẽ ghi tên đích.
  5. Lùm cây, bụi, đá rải ở chỗ trống, cách đường một ô."""
import heapq, math

PAVED = set('12_')


def lay(d, N, C, A, rnd, ctx):
    D = len(N); cx = cy = D / 2; R, rtown, inkhu, mobs = ctx['R'], ctx['rtown'], ctx['inkhu'], ctx['mobs']
    base, water = C['base'], C['water']
    def size(i): s = A[i]; k = s.get('scale', 1); return s['w'] * k / 16, s['h'] * k / 16
    # 1. dọn
    items = d.setdefault('hoi', {}).setdefault('do', [])
    keep_items = []
    for e in items:
        i = e[0]
        if i.endswith('-m') or i.startswith('chung.'):
            if any(k in i for k in ('.den-', '.cot-den')): continue   # đèn đặt lại theo đường
            keep_items.append(e); continue
        if '.ho' in i and i in A:   # hồ bộ cũ → mặt nước của lưới (vẽ bằng code, draw-nature.js)
            w, h = size(i); px, py, rx, ry = e[1], e[2] - h * 0.4, w * 0.42, h * 0.3
            for Y in range(D):
                for X in range(D):
                    if ((X + 0.5 - px) / rx) ** 2 + ((Y + 0.5 - py) / ry) ** 2 < 1 and N[Y][X] not in '~': N[Y][X] = water
    items[:] = keep_items
    for Y in range(D):
        for X in range(D):
            if N[Y][X] in 'HBNWz' or N[Y][X] == C['path']: N[Y][X] = base
    # chân đồ (ô bị chiếm) để tìm đường, đặt đồ
    foot = set()
    def mark(i, x, y):
        w, h = size(i)
        for Y in range(int(y - min(h, 2.2)), int(y) + 1):
            for X in range(int(x - w / 2), int(x + w / 2) + 1): foot.add((X, Y))
    for e in items: mark(e[0], e[1], e[2])
    boxes = [(e[1] - size(e[0])[0] / 2, e[2] - min(size(e[0])[1], 2), e[1] + size(e[0])[0] / 2, e[2]) for e in items]
    pts = [tuple(v) for v in d['spawns'].values()] + [tuple(p['at']) for p in d['portals']] + [tuple(n['at']) for n in d['npcs']]
    pts += [tuple(s['at']) for s in d['spawners']]
    road = lambda X, Y: N[Y][X] in PAVED or N[Y][X] == C['path']
    def free(i, x, y, gap=1.6, margin=1):
        w, h = size(i); x0, y0, x1, y1 = x - w / 2, y - min(h, 2.2), x + w / 2, y
        for Y in range(int(y0) - margin, int(y1) + 1 + margin):
            for X in range(int(x0) - margin, int(x1) + 1 + margin):
                if not (0 <= X < D and 0 <= Y < D): return False
                inside = int(x0) <= X <= int(x1) and int(y0) <= Y <= int(y1)
                if road(X, Y) or N[Y][X] == '~' or (inside and N[Y][X] != base): return False
        if math.hypot(x - cx, y - cy) > R - 3.2 or inkhu(x, y): return False
        for kx, ky in pts:
            if x0 - 1.5 <= kx <= x1 + 1.5 and y0 - 2 <= ky <= y1 + 2: return False
        for a0, b0, a1, b1 in boxes:
            if a0 - gap < x1 and a1 + gap > x0 and b0 - gap < y1 and b1 + gap > y0: return False
        return True
    added = []
    def put(i, x, y, gap=1.6, label=None, margin=1):
        if i not in A or not free(i, x, y, gap, margin): return False
        w, h = size(i); boxes.append((x - w / 2, y - min(h, 2), x + w / 2, y)); mark(i, x, y)
        added.append([i, round(x, 1), round(y, 1)] + ([label] if label else [])); return True
    def near(i, x, y, r=3.5, tries=40, gap=1.6, label=None, margin=1):
        for _ in range(tries):
            a = rnd.random() * 2 * math.pi; q = rnd.random() * r
            if put(i, x + math.cos(a) * q, y + math.sin(a) * q, gap, label, margin): return True
        return False
    # 1b. phố (khai sẵn trong CFG town): đặt gần chỗ định, sát phố
    for i, dx, dy in C.get('town', []):
        if not near(i, cx + dx, cy + dy, 2.5, 50, gap=1.0, margin=0): print('  không đủ chỗ phố', i)
    # 2. cảnh lớn ở vòng ngoài
    dests = []   # (x, y, tên, loại)
    ring = (rtown + R) / 2 + 1
    for i, ang, name in C['marks']:
        ok = False
        for da in (0, 8, -8, 16, -16, 24, -24, 32, -32):
            ar = math.radians(ang + da)
            for dr in (0, 3, -3, 5, -5):
                if near(i, cx + math.cos(ar) * (ring + dr), cy + math.sin(ar) * (ring + dr), 2.5, 25, margin=2):
                    e = added[-1]; dests.append((e[1], e[2] + 1.5, name, 'mark')); ok = True; break
            if ok: break
        if not ok: print('  không đủ chỗ cho cảnh', name)
    for s in d['spawners']: dests.append((s['at'][0] + 0.5, s['at'][1] + 0.5, 'Bãi ' + mobs.get(s['mob'], s['mob']), 'mob'))
    for p in d['portals']: dests.append((p['at'][0] + 0.5, p['at'][1] + 1.5, p.get('label', ''), 'portal'))
    for n in d['npcs']:
        if not road(*n['at']): dests.append((n['at'][0] + 0.5, n['at'][1] + 1.5, '', 'npc'))
    # 3. đường A* về mạng đường
    traffic = {}
    def cost(X, Y):
        c = N[Y][X]
        if c == '~' or c == water or c in '=LO' or not (math.hypot(X + 0.5 - cx, Y + 0.5 - cy) < R - 2): return None
        if road(X, Y): return 0.35
        if (X, Y) in foot: return 30
        if c == '^': return 9
        if c in 'TRYV#': return 6
        return 1
    def route(sx, sy):
        sx, sy = int(sx), int(sy)
        if not (0 <= sx < D and 0 <= sy < D): return None
        net = [(X, Y) for Y in range(D) for X in range(D) if road(X, Y)]
        if not net: return None
        hx = lambda X, Y: min(abs(X - a) + abs(Y - b) for a, b in net[::7]) * 0.35
        best = {(sx, sy): 0}; prev = {}; q = [(0, sx, sy)]
        while q:
            g, X, Y = heapq.heappop(q)
            if g > best.get((X, Y), 1e9): continue
            if road(X, Y) and (X, Y) != (sx, sy):
                out = [(X, Y)]
                while out[-1] in prev: out.append(prev[out[-1]])
                return out
            for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = X + a, Y + b
                if not (0 <= nx < D and 0 <= ny < D): continue
                c = cost(nx, ny)
                if c is None: continue
                ng = g + c
                if ng < best.get((nx, ny), 1e9): best[(nx, ny)] = ng; prev[(nx, ny)] = (X, Y); heapq.heappush(q, (ng, nx, ny))
        return None
    exits = []   # (ô đầu đường đất sát phố lát, tên đích)
    for x, y, name, kind in sorted(dests, key=lambda t: math.hypot(t[0] - cx, t[1] - cy)):
        rt = route(x, y)
        if not rt: print('  không có đường tới', name or kind); continue
        first_dirt = None
        for X, Y in rt:
            traffic[(X, Y)] = traffic.get((X, Y), 0) + (2 if kind == 'portal' else 1)
            if N[Y][X] not in PAVED:
                N[Y][X] = C['path']
                if any(0 <= X + a < D and 0 <= Y + b < D and N[Y + b][X + a] in PAVED for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): first_dirt = (X, Y)
        if first_dirt and name and kind in ('mark', 'mob'): exits.append((first_dirt, name))
    for (X, Y), t in list(traffic.items()):   # đường đông người rộng hai ô
        if t >= 2 and N[Y][X] == C['path']:
            for a, b in ((1, 0), (0, 1)):
                if 0 <= X + a < D and 0 <= Y + b < D and N[Y + b][X + a] == base and (X + a, Y + b) not in foot: N[Y + b][X + a] = C['path']; break
    # 4. đèn và biển
    lamp, sign = C['lamp'], C['sign']
    done_exit = {}
    for (X, Y), name in exits:
        k = done_exit.setdefault((X // 3, Y // 3), [])
        if name in k: continue
        k.append(name)
        near(sign, X + 1.5, Y + 0.5, 2, 30, gap=0.4, label='→ ' + name, margin=0)
        near(lamp, X - 1, Y + 0.5, 2, 30, gap=0.8, margin=0)
    for x, y, name, kind in dests:
        if kind == 'mark':
            near(sign, x + 2, y + 0.5, 2.5, 30, gap=0.4, label=name, margin=0); near(lamp, x - 2.5, y, 2, 30, gap=0.6, margin=0)
    # mép phố lát: đèn cách nhau ~7 ô
    edge = [(X, Y) for Y in range(D) for X in range(D) if N[Y][X] == base and any(0 <= X + a < D and 0 <= Y + b < D and N[Y + b][X + a] in PAVED for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    lit = []
    for X, Y in edge:
        if all(math.hypot(X - a, Y - b) > 7 for a, b in lit) and put(lamp, X + 0.5, Y + 0.9, 0.6, margin=0): lit.append((X, Y))
    # 5. lùm cây, bụi, đá ở chỗ trống
    for g in range(20):
        a = rnd.random() * 2 * math.pi; r = rnd.uniform(rtown - 2, R - 3)
        gx, gy = cx + math.cos(a) * r, cy + math.sin(a) * r
        t0, t1 = rnd.choice(C['trees']), rnd.choice(C['trees'])
        for _ in range(rnd.randint(3, 5)): near(t0 if rnd.random() < 0.7 else t1, gx, gy, 4.5, 25)
        for _ in range(rnd.randint(1, 3)): near(rnd.choice(C['bush']), gx, gy, 5.5, 20, gap=0.8)
        if rnd.random() < 0.6: near(rnd.choice(C['rock']), gx, gy, 6, 20, gap=0.8)
    for _ in range(16):
        a = rnd.random() * 2 * math.pi; r = rnd.uniform(rtown - 4, R - 2.5)
        near(rnd.choice(C['rock'] + C['bush']), cx + math.cos(a) * r, cy + math.sin(a) * r, 2, 15, gap=1.2)
    items.extend(added)
    return len(added)
