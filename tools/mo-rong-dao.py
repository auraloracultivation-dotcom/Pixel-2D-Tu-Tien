"""Nới tinh cầu (chủ dự án 09/11/2026 12:29: "đảo rộng 92 ô, trống mới là bình thường; phố làm đường lớn hơn, nhiều đường hơn;
quái tản ra; thêm sự sống, cảnh lớn, đường và biển chỉ lối; không phải càng dày càng tốt mà phải thú vị").
Chạy MỘT LẦN cho mỗi bản đồ (ghi đè data/maps/<id>.json, khoá planet.grown đánh dấu đã nới, chạy lại thì bỏ qua):
  python3 -I tools/mo-rong-dao.py thien-kiem-phong
Cách làm:
  1. Phố cũ giãn S lần (lấy mẫu ô gần nhất): đường, sân to ra, nhà, đồ hội, NPC cách nhau xa hơn; vật một ô (cổng truyền tống,
     bồ đoàn, cây, đá, hoa) chỉ giữ một ô. Đặt giữa đĩa mới đường kính D.
  2. Vòng ngoài là đất hoang: đường mòn toả từ phố ra (spokes) nối vào một vòng đường quanh đảo (ring), cảnh lớn đặt ven vòng đường,
     một hồ nhỏ, các lùm cây (3-5 cây), bụi, đá rải thưa, đèn đá dọc đường, biển gỗ chỉ lối ở đầu mỗi đường mòn.
  3. Bãi quái giãn theo; bãi nào rơi vào phố hội (le-hoi.json khu) thì đẩy ra vòng ngoài. Khung khu giãn theo.
Mọi đồ đặt có kiểm chỗ: không đè đường, nước, cổng, NPC, chỗ xuất hiện, bãi quái, và cách nhau tối thiểu GAP ô (không chật).
Cấu hình từng đảo ở CFG dưới đây (mã hình trong data/art.json)."""
import json, math, random, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
S, D, GAP = 1.5, 92, 1.6
ONE = set('PMFRTYVSn')   # vật một ô: giãn ra vẫn chỉ một ô
CFG = {
    'thien-kiem-phong': {
        'base': '.', 'water': '=', 'path': ',', 'seed': 7,
        'trees': ['tk.cay-thong-m', 'tk.cay-anh-dao-m', 'tk.cay-phong-m', 'tk.cay-ngan-hanh-m', 'tk.truc-m', 'tk.cay-thong-m'],
        'bush': ['tk.bui-xanh-m', 'tk.bui-hong-m', 'tk.bui-lau-m', 'tk.bui-cuc-m'],
        'rock': ['tk.da-reu-m', 'tk.da-cum-m', 'tk.soi-m', 'tk.da-tim-m'],
        'lamp': 'tk.den-da-m', 'sign': 'chung.bien-go',
        'marks': [['tk.co-thu-lon-m', 300, 'Cổ Thụ Ngàn Năm'], ['tk.kiem-trung-m', 30, 'Kiếm Trủng'], ['tk.tien-dai-m', 120, 'Tiên Nhân Đài'],
                  ['tk.nguyet-mon-m', 210, 'Nguyệt Môn'], ['tk.dien-nho-m', 165, 'Miếu Sơn Thần']],
        'spokes': 6,
    },
    'dao-han-bang': {
        'base': 'w', 'water': 'O', 'path': ',', 'seed': 11,
        'trees': ['hb.cay-tung-tuyet-m', 'hb.cay-tung-nho-m', 'hb.cay-mai-m', 'hb.cay-kho-m', 'hb.cay-bang-m', 'hb.lieu-bang-m'],
        'bush': ['hb.bui-tuyet-m', 'hb.bui-hoa-bang-m', 'hb.bui-co-trang-m', 'hb.bui-mai-m'],
        'rock': ['hb.da-tuyet-m', 'hb.da-bang-m', 'hb.soi-tuyet-m', 'hb.manh-bang-m'],
        'lamp': 'hb.den-da-tuyet-m', 'sign': 'chung.bien-go',
        'marks': [['hb.thac-bang-lon-m', 20, 'Thác Băng'], ['hb.pha-le-to-m', 110, 'Mỏ Pha Lê'], ['hb.bang-tam-chau-m', 200, 'Băng Tâm Châu'],
                  ['hb.nhu-bang-lon-m', 290, 'Vách Nhũ Băng'], ['hb.han-ngoc-tru-m', 250, 'Trụ Hàn Ngọc']],
        'spokes': 5,
    },
}


def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))


def main(mid):
    C = CFG[mid]; rnd = random.Random(C['seed'])
    path = ROOT / 'data' / 'maps' / f'{mid}.json'
    d = load(path)
    if d['planet'].get('grown'):
        print(mid, 'đã nới rồi, bỏ qua'); return
    G = d['grid']; H, W, d0 = len(G), len(G[0]), d['planet']['d']
    off = D / 2 - d0 / 2 * S
    tx = lambda x: x * S + off   # toạ độ ô số thực (chân đồ hội)
    ti = lambda x: int(math.floor((x + 0.5) * S + off))   # ô nguyên (NPC, cổng, chỗ xuất hiện)
    at = lambda x, y: G[y][x] if 0 <= y < H and 0 <= x < W else '~'
    cx = cy = D / 2; R = D / 2 - 1.21 + 0.8   # ô đất phủ quá vòng đĩa một chút để mép tròn (draw-rim.js) cắt gọn, không lộ bậc thang ô
    rtown = d0 / 2 * S
    # 1. lưới mới
    N = [[C['base']] * D for _ in range(D)]
    anchor = {}
    for y in range(H):
        for x in range(W):
            anchor[(ti(x), ti(y))] = (x, y)
    for Y in range(D):
        for X in range(D):
            if math.hypot(X + 0.5 - cx, Y + 0.5 - cy) > R: N[Y][X] = '~'; continue
            ox, oy = math.floor((X + 0.5 - off) / S), math.floor((Y + 0.5 - off) / S)
            c = at(ox, oy)
            if c == '~': continue
            if c in ONE and anchor.get((X, Y)) != (ox, oy):
                nb = [at(ox + a, oy + b) for a in (-1, 0, 1) for b in (-1, 0, 1) if (a or b)]
                nb = [k for k in nb if k not in ONE and k != '~' and k not in 'HB']
                c = max(set(nb), key=nb.count) if nb else C['base']
            N[Y][X] = c
    # nhà ô (H, B): giãn ra thành khối 4-5 ô không có hình nguyên căn, nên thu lại đúng 3×2 ô ở giữa đáy khối cũ
    seen = set()
    for Y in range(D):
        for X in range(D):
            ch = N[Y][X]
            if ch not in 'HB' or (X, Y) in seen: continue
            blk, st = [], [(X, Y)]
            while st:
                a, b = st.pop()
                if (a, b) in seen or not (0 <= a < D and 0 <= b < D) or N[b][a] != ch: continue
                seen.add((a, b)); blk.append((a, b)); st += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)]
            for a, b in blk: N[b][a] = C['base']
            x0 = min(a for a, _ in blk); x1 = max(a for a, _ in blk); y1 = max(b for _, b in blk)
            mx = (x0 + x1) // 2
            for a in range(mx - 1, mx + 2):
                for b in (y1 - 1, y1): N[b][a] = ch
    # 2. toạ độ
    for k, v in d['spawns'].items(): d['spawns'][k] = [ti(v[0]), ti(v[1])]
    for p in d['portals']: p['at'] = [ti(p['at'][0]), ti(p['at'][1])]
    for n in d['npcs']: n['at'] = [ti(n['at'][0]), ti(n['at'][1])]
    for s in d['spawners']:
        s['at'] = [ti(s['at'][0]), ti(s['at'][1])]
        if s.get('spread'): s['spread'] = round(s['spread'] * S)
    if d.get('hamlets'): d['hamlets'] = [[ti(a), ti(b)] for a, b in d['hamlets']]
    for it in d.get('hoi', {}).get('do', []): it[1] = round(tx(it[1]), 1); it[2] = round(tx(it[2]), 1)
    L = load(ROOT / 'data' / 'le-hoi.json'); fest = L['festivals'].get(mid, {})
    khu = [[ti(a), ti(b), ti(c2), ti(e)] for a, b, c2, e in fest.get('khu', [])]
    inkhu = lambda x, y: any(a <= x <= c2 and b <= y <= e for a, b, c2, e in khu)
    # bãi quái trong phố hội: đẩy ra vòng ngoài theo hướng từ tâm
    for s in d['spawners']:
        x, y = s['at']
        if inkhu(x, y) or math.hypot(x - cx, y - cy) < rtown - 4:
            a = math.atan2(y - cy, x - cx); r = rtown + 5
            s['at'] = [int(cx + math.cos(a) * r), int(cy + math.sin(a) * r)]
    # 3. đường mòn: vòng quanh đảo + đường toả từ mép phố
    ring_r = (rtown + R) / 2 + 1
    def paint(x, y, w=1):
        for a in range(-w, w + 1):
            for b in range(-w, w + 1):
                X, Y = int(x + a), int(y + b)
                if 0 <= X < D and 0 <= Y < D and N[Y][X] == C['base']: N[Y][X] = C['path']
    for i in range(720):
        a = i / 720 * 2 * math.pi; r = ring_r + math.sin(a * 5 + C['seed']) * 1.2
        paint(cx + math.cos(a) * r, cy + math.sin(a) * r, 1)
    ang0 = rnd.random() * 360
    spoke_ang = [ang0 + i * 360 / C['spokes'] + rnd.uniform(-12, 12) for i in range(C['spokes'])]
    for a in spoke_ang:
        ar = math.radians(a)
        for r10 in range(int((rtown - 8) * 10), int(ring_r * 10)):
            r = r10 / 10; w = math.sin(r * 0.6 + a) * 0.8
            paint(cx + math.cos(ar) * r - math.sin(ar) * w, cy + math.sin(ar) * r + math.cos(ar) * w, 1)
    # 4. hồ nhỏ ở vòng ngoài
    pa = math.radians(ang0 + 360 / C['spokes'] / 2); pr = ring_r + 4.5
    px_, py_ = cx + math.cos(pa) * pr, cy + math.sin(pa) * pr
    for Y in range(D):
        for X in range(D):
            if ((X + 0.5 - px_) / 3.6) ** 2 + ((Y + 0.5 - py_) / 2.6) ** 2 < 1 and N[Y][X] == C['base']: N[Y][X] = C['water']
    # 5. đặt đồ có kiểm chỗ
    A = load(ROOT / 'data' / 'art.json')['sprites']
    def size(i): s = A[i]; k = s.get('scale', 1); return s['w'] * k / 16, s['h'] * k / 16
    boxes = []
    for it in d.get('hoi', {}).get('do', []):
        if it[0] in A: w, h = size(it[0]); boxes.append((it[1] - w / 2, it[2] - min(h, 2), it[1] + w / 2, it[2]))
    keep = [tuple(v) for v in d['spawns'].values()] + [tuple(p['at']) for p in d['portals']] + [tuple(n['at']) for n in d['npcs']]
    keep += [tuple(s['at']) for s in d['spawners']]
    def free(i, x, y, gap=GAP):
        w, h = size(i); x0, y0, x1, y1 = x - w / 2, y - min(h, 2.2), x + w / 2, y
        for Y in range(int(y0) - 1, int(y1) + 1):
            for X in range(int(x0), int(x1) + 1):
                if not (0 <= X < D and 0 <= Y < D) or N[Y][X] != C['base']: return False
        if math.hypot(x - cx, y - cy) > R - 3.2 or inkhu(x, y): return False
        for kx, ky in keep:
            if x0 - 1.5 <= kx <= x1 + 1.5 and y0 - 2 <= ky <= y1 + 2: return False
        for a0, b0, a1, b1 in boxes:
            if a0 - gap < x1 and a1 + gap > x0 and b0 - gap < y1 and b1 + gap > y0: return False
        return True
    added = []
    def put(i, x, y, gap=GAP, label=None):
        if i not in A or not free(i, x, y, gap): return False
        w, h = size(i); boxes.append((x - w / 2, y - min(h, 2), x + w / 2, y))
        e = [i, round(x, 1), round(y, 1)] + ([label] if label else []); added.append(e); return True
    def near(i, x, y, r=3.5, tries=40, gap=GAP, label=None):
        for _ in range(tries):
            a = rnd.random() * 2 * math.pi; q = rnd.random() * r
            if put(i, x + math.cos(a) * q, y + math.sin(a) * q, gap, label): return True
        return False
    # cảnh lớn ven vòng đường, mỗi cảnh một biển gỗ và đèn
    for i, ang, name in C['marks']:
        done = False
        for da in (0, 8, -8, 16, -16, 24, -24, 32, -32):   # cảnh to: chỗ đúng hướng chưa đủ rộng thì xoay dần sang hai bên
            ar = math.radians(ang + da)
            for dr in (4, -4.5, 5.5, -6, 3, -3, 7):
                if near(i, cx + math.cos(ar) * (ring_r + dr), cy + math.sin(ar) * (ring_r + dr), 3, 30):
                    e = added[-1]; near(C['sign'], e[1] + 2.5, e[2] + 1, 2.5, gap=0.6, label=name); near(C['lamp'], e[1] - 3, e[2] + 0.5, 2, gap=0.6)
                    done = True; break
            if done: break
        if not done: print('  không đủ chỗ cho cảnh', name)
    # biển gỗ ở đầu mỗi đường mòn (mép phố)
    for a in spoke_ang:
        ar = math.radians(a); r = rtown - 2
        mk = min(C['marks'], key=lambda m: abs((m[1] - a + 180) % 360 - 180))   # ghi tên cảnh gần hướng đường mòn này nhất
        near(C['sign'], cx + math.cos(ar) * r + 2 * math.sin(ar), cy + math.sin(ar) * r - 2 * math.cos(ar), 3, gap=0.6, label='→ ' + mk[2])
    # đèn đá thưa dọc vòng đường
    for k in range(12):
        ar = math.radians(k * 30 + 15)
        near(C['lamp'], cx + math.cos(ar) * (ring_r + 2.4), cy + math.sin(ar) * (ring_r + 2.4), 1.5, gap=1)
    # lùm cây: 3-5 cây cùng loại pha một loại khác, bụi và đá quanh lùm
    for g in range(16):
        a = rnd.random() * 2 * math.pi; r = rnd.uniform(rtown + 1.5, R - 3)
        gx, gy = cx + math.cos(a) * r, cy + math.sin(a) * r
        t0, t1 = rnd.choice(C['trees']), rnd.choice(C['trees'])
        for _ in range(rnd.randint(3, 5)): near(t0 if rnd.random() < 0.7 else t1, gx, gy, 4.5, 25)
        for _ in range(rnd.randint(1, 3)): near(rnd.choice(C['bush']), gx, gy, 5.5, 20, gap=0.8)
        if rnd.random() < 0.6: near(rnd.choice(C['rock']), gx, gy, 6, 20, gap=0.8)
    for _ in range(14):   # đá, bụi lẻ rải thưa
        a = rnd.random() * 2 * math.pi; r = rnd.uniform(rtown + 1, R - 2.5)
        near(rnd.choice(C['rock'] + C['bush']), cx + math.cos(a) * r, cy + math.sin(a) * r, 2, 15, gap=1.2)
    d.setdefault('hoi', {}).setdefault('do', []).extend(added)
    d['grid'] = [''.join(r) for r in N]
    d['planet']['d'] = D; d['planet']['grown'] = {'s': S, 'from': d0, 'note': 'tools/mo-rong-dao.py 09/11/2026'}
    txt = json.dumps(d, ensure_ascii=False, indent=1)
    path.write_text(txt + '\n', encoding='utf-8')
    if fest:   # phố hội: khung khu, điểm dừng của khách [x, y(, nhìn x, nhìn y)], chỗ bán hàng [người, x, y] giãn theo
        fest['khu'] = khu
        k = fest.get('khach', {})
        if k.get('nodes'): k['nodes'] = [[round(v * S + off, 1) for v in n] for n in k['nodes']]
        if k.get('ban'): k['ban'] = [[b[0]] + [round(v * S + off, 1) for v in b[1:3]] + b[3:] for b in k['ban']]
        (ROOT / 'data' / 'le-hoi.json').write_text(json.dumps(L, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(mid, f'{d0} → {D} ô, thêm {len(added)} món, {C["spokes"]} đường mòn, bãi quái {len(d["spawners"])}')


if __name__ == '__main__':
    for m in sys.argv[1:]: main(m)
