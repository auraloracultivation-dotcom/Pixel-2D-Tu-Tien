"""Dọn cây, đá, núi, hoa cũ của lưới bản đồ nằm dưới hình đồ lễ hội (chủ dự án 02/11/2026: cây vàng đứng sau mà đè lên cây xanh).
Vật cũ của lưới vẽ sẵn vào lớp nền nên luôn nằm dưới đồ hội; chỗ nào hình đồ hội phủ lên (khung hình, nới thêm 1 ô) thì đổi ô đó
thành nền của tinh cầu. Chạy lại được: python3 -I tools/hoi-don.py <mã bản đồ> <ký tự nền>."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
NATURAL = 'TRYVZ*knF^'
mid, fill = sys.argv[1], sys.argv[2]
p = ROOT / 'data' / 'maps' / f'{mid}.json'
txt = p.read_text(encoding='utf-8'); m = json.loads(txt)
art = json.loads((ROOT / 'data' / 'art.json').read_text(encoding='utf-8'))['sprites']
g = [list(r) for r in m['grid']]; n = 0
for sid, x, y in m.get('hoi', {}).get('do', []):
    s = art.get(sid)
    if not s: continue
    k = s.get('scale', 1) / 16; w, h = s['w'] * k, s['h'] * k
    for ty in range(int(y - h) - 1, int(y) + 2):
        for tx in range(int(x - w / 2) - 1, int(x + w / 2) + 2):
            if 0 <= ty < len(g) and 0 <= tx < len(g[ty]) and g[ty][tx] in NATURAL:
                g[ty][tx] = fill; n += 1
new = [''.join(r) for r in g]
for old, row in zip(m['grid'], new):
    txt = txt.replace(json.dumps(old, ensure_ascii=False), json.dumps(row, ensure_ascii=False), 1)
p.write_text(txt, encoding='utf-8')
print(mid, 'dọn', n, 'ô')
