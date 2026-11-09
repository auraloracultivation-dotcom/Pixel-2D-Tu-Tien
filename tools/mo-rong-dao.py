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
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from mo_rong_duong import lay  # noqa: E402
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
    for Y in range(D):
        for X in range(D):
            if N[Y][X] in '^RTYVFn': N[Y][X] = C['base']   # núi, đá, cây ô vuông bộ cũ (viền đậm, chặn đường): bỏ, cây đá mới đặt bằng đồ
    d.pop('hamlets', None)
    # 3-5. dọn đồ cũ, cảnh lớn, đường theo đích, đèn, biển, cây (tools/mo_rong_duong.py)
    A = load(ROOT / 'data' / 'art.json')['sprites']
    mobs = {k: v.get('name', k) for k, v in load(ROOT / 'data' / 'mobs.json').items() if isinstance(v, dict)}
    added = range(lay(d, N, C, A, rnd, {'R': R, 'rtown': rtown, 'inkhu': inkhu, 'mobs': mobs}))
    d['grid'] = [''.join(r) for r in N]
    d['planet']['d'] = D; d['planet']['grown'] = {'s': S, 'from': d0, 'note': 'tools/mo-rong-dao.py 09/11/2026'}
    txt = json.dumps(d, ensure_ascii=False, indent=1)
    path.write_text(txt + '\n', encoding='utf-8')
    # đích nhiệm vụ truyện trên bản đồ này (data/story.json steps[].target, until.reach) giãn theo
    sp = ROOT / 'data' / 'story.json'; st = load(sp); ch = 0
    for x in st['steps']:
        if x.get('map') != mid: continue
        if x.get('target'): x['target'] = [ti(x['target'][0]), ti(x['target'][1])]; ch += 1
        if x.get('until', {}).get('reach'): x['until']['reach'] = [ti(v) for v in x['until']['reach']]; ch += 1
    if ch: sp.write_text(json.dumps(st, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if fest:   # phố hội: khung khu, điểm dừng của khách [x, y(, nhìn x, nhìn y)], chỗ bán hàng [người, x, y] giãn theo
        fest['khu'] = khu
        for t in fest.get('tro', []):   # trò diễn gắn đồ bộ cũ (đã bỏ) chuyển sang đồ bộ mới
            t['item'] = {'tk.trong-lon': 'tk.trong-rong-m', 'tk.tran-bat-quai': 'tk.tuong-rong-m', 'tk.loi-dai-co': 'tk.dien-phu-m'}.get(t['item'], t['item'])
            if t['kind'] == 'ty-vo' and t['item'] == 'tk.dien-phu-m': t['dy'] = 22   # tỷ võ trên sân trước điện phụ
            if t['kind'] == 'trong': t['dx'] = -22
        k = fest.get('khach', {})
        if k.get('nodes'): k['nodes'] = [[round(v * S + off, 1) for v in n] for n in k['nodes']]
        if k.get('ban'): k['ban'] = [[b[0]] + [round(v * S + off, 1) for v in b[1:3]] + b[3:] for b in k['ban']]
        (ROOT / 'data' / 'le-hoi.json').write_text(json.dumps(L, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(mid, f'{d0} → {D} ô, thêm {len(added)} món, bãi quái {len(d["spawners"])}')


if __name__ == '__main__':
    for m in sys.argv[1:]: main(m)
