"""Bộ soát luật thế giới (docs/12-LUAT-THE-GIOI.md) cho bản đồ tinh cầu. LỖI = phải sửa trước khi đưa vào game; NHẮC = nên xem.
Chạy: python3 tools/the-gioi/soat.py [bản đồ .json …]   (không ghi gì thì soát mọi bản đồ có "planet" trong data/maps và bản nháp)
Soát: liên thông (NPC, cổng, bãi quái, điểm tới không kẹt), đường cắt nước không cầu, cây mọc trên đường, đèn lửa ngoài hoang,
bãi quái sát phố hoặc chật, đồ che NPC, công trình sát mép tinh cầu, chỗ câu cá ở nước thật, số đèn một màn."""
import json
import math
import sys
from pathlib import Path

from ban_do import ART, LH, ROOT, TILES, box, foot, kind_of

ROAD = '12,_'


def soat(m):
    loi, nhac = [], []
    g = m['grid']
    H, W = len(g), max(len(r) for r in g)
    at = lambda x, y: g[y][x] if 0 <= y < H and 0 <= x < len(g[y]) else '~'
    items = [it for it in (m.get('hoi') or {}).get('do', []) if it[0] in ART]
    solid, opened, boxes = set(), set(), []
    for it in items:
        s = (it[4] or {}).get('s', 1) if len(it) > 4 else 1
        a, b = foot(it[0], it[1], it[2], s)
        solid |= a
        opened |= b
        boxes.append((it, box(it[0], it[1], it[2], s), kind_of(it[0])))
    d = (m.get('planet') or {}).get('d')
    rim = lambda x, y: bool(d) and math.hypot((x + 0.5) * 16 - d * 8, (y + 0.5) * 16 - d * 8) > (d / 2 - 1.21) * 16 - 4
    tsolid = lambda ch: (lambda k: bool(k.get('solid')) and not k.get('flat'))(TILES.get(ch, {}))
    free = lambda x, y: 0 <= x < W and 0 <= y < H and not rim(x, y) and (((x, y) in opened) or (not tsolid(at(x, y)) and (x, y) not in solid))
    cell = lambda p: (math.floor(p[0]), math.floor(p[1]))
    khu = (m.get('le_hoi') or {}).get('khu') or LH['festivals'].get(m['id'], {}).get('khu') or []
    in_khu = lambda x, y, mg=0: any(a - mg <= x <= c + mg and b - mg <= y <= e + mg for a, b, c, e in khu)

    # 1. liên thông từ điểm vào
    start = cell(m['spawns'].get('vao') or next(iter(m['spawns'].values())))
    seen, todo = {start}, [start]
    while todo:
        x, y = todo.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in seen and free(*n):
                seen.add(n)
                todo.append(n)
    near = lambda c, r=1: any((c[0] + dx, c[1] + dy) in seen for dx in range(-r, r + 1) for dy in range(-r, r + 1))
    for n in m.get('npcs', []):
        if not near(cell(n['at'])):
            loi.append(f"NPC {n['id']} {n['at']} không đi tới được")
    for p in m.get('portals', []):
        if not near(tuple(p['at'])):
            loi.append(f"cổng {p.get('label') or p['to']} {p['at']} không đi tới được")
    for k, v in m['spawns'].items():
        if cell(v) not in seen:
            loi.append(f'điểm tới {k} {v} nằm trong vật cản hoặc bị cô lập')
    lost = sum(1 for y in range(H) for x in range(W) if free(x, y) and (x, y) not in seen)
    if lost > 12:
        nhac.append(f'{lost} ô đi được nhưng bị cô lập (chỉ bay tới được: phải có thưởng, không đặt nhiệm vụ)')

    # 2. bãi quái: ngoài phố, đủ trống cho Tự đánh
    for s in m.get('spawners', []):
        x, y = s['at']
        if not near((x, y), 2):
            loi.append(f'bãi quái {s["at"]} không đi tới được')
        if in_khu(x, y, 3):
            loi.append(f'bãi quái {s["at"]} trong phố hoặc cách phố dưới 4 ô')
        blk = sum(1 for dx in range(-4, 5) for dy in range(-4, 5) if not free(x + dx, y + dy))
        if blk > 81 * 0.3:
            nhac.append(f'bãi quái {s["at"]} chật: {blk}/81 ô quanh bãi bị chắn')

    # 3. đường và nước: đường không cắt nước nếu không có cầu; cây không mọc trên đường
    for y in range(H):
        for x in range(W):
            if at(x, y) == '=' and (x, y) not in opened:
                for dx, dy in ((1, 0), (0, 1)):
                    if at(x - dx, y - dy) in ROAD and at(x + dx, y + dy) in ROAD:
                        loi.append(f'đường cắt nước ở ô {(x, y)} mà không có cầu')
    for it, b, k in boxes:
        c = cell((it[1], it[2] - 0.1))
        if k == 'cay' and at(*c) in ROAD:
            loi.append(f'cây {it[0]} mọc trên đường ở {c}')
        if k in ('nha', 'cong', 'tru', 'sap') and d and math.hypot(it[1] - d / 2, it[2] - d / 2) > d / 2 - 3.5 and 'tien-dai' not in it[0]:
            nhac.append(f'{it[0]} sát mép tinh cầu ở {it[1], it[2]} (mép chỉ có đài ngắm sao)')

    # 4. đèn, lửa phải ở chỗ có người: trong phố hoặc cách đường không quá 3 ô
    road = {(x, y) for y in range(H) for x in range(W) if at(x, y) in ROAD + 'P'}
    lit = [(it, b) for it, b, k in boxes if ART[it[0]].get('lights') and any(t in it[0] for t in ('.den-', '.vac-', '.lua-', '.cot-den', '.lu-huong'))]
    for it, b in lit:
        c = cell((it[1], it[2]))
        if khu and not in_khu(*c, 2) and not any((c[0] + dx, c[1] + dy) in road for dx in range(-3, 4) for dy in range(-3, 4)):
            nhac.append(f'{it[0]} ở {c}: đèn, lửa ngoài hoang, xa đường')
    if lit:
        worst = max(sum(1 for o, _ in lit if abs(o[1] - it[1]) < 13 and abs(o[2] - it[2]) < 27) for it, _ in lit)
        if worst > 24:
            nhac.append(f'một màn có tới {worst} đèn, lửa (giới hạn sức máy 24)')

    # 5. che khuất: hình đứng trước (chân thấp hơn) trùm lên NPC
    for n in m.get('npcs', []):
        x, y = n['at']
        for it, b, k in boxes:
            if k != 'phang' and b[0] + 0.2 < x < b[2] - 0.2 and b[1] < y - 1.2 and y < it[2] - 0.3:
                nhac.append(f"NPC {n['id']} bị {it[0]} che")
                break

    # 6. câu cá ở nước thật
    if d and not any(at(x, y) in '=LOf' and near((x, y)) for y in range(H) for x in range(W)):
        nhac.append('không có mặt nước nào đứng cạnh được: tinh cầu này chưa có chỗ câu cá theo luật mới')
    return loi, nhac


def main():
    files = [Path(a) for a in sys.argv[1:]] or sorted(p for p in (ROOT / 'data/maps').glob('*.json') if '"planet"' in p.read_text(encoding='utf-8')) + sorted((Path(__file__).parent / 'nhap').glob('*.json'))
    bad = 0
    for f in files:
        m = json.loads(f.read_text(encoding='utf-8'))
        loi, nhac = soat(m)
        bad += len(loi)
        tag = 'nháp' if f.parent.name == 'nhap' else 'đang chạy'
        print(f"{'❌' if loi else '✅'} {m['id']} ({tag}): {len(loi)} lỗi, {len(nhac)} nhắc")
        for s in loi[:12]:
            print('   LỖI ', s)
        for s in nhac[:8]:
            print('   nhắc', s)
        if len(loi) > 12 or len(nhac) > 8:
            print(f'   … còn {max(0, len(loi) - 12)} lỗi, {max(0, len(nhac) - 8)} nhắc nữa')
    sys.exit(1 if bad and '--chan' in sys.argv else 0)


if __name__ == '__main__':
    main()
