"""Hình đồ nhiệm vụ nhặt trên đất (data/items.json quest_items; báo cáo #10, issue #332: linh thảo hiện thành hạt tròn).
Mỗi món một hình 11×11 vẽ theo bản đồ chữ: k mực, a màu nền (base), b màu sáng (color), w trắng, s xanh thân cây, d nâu đất,
g vàng kim, . trong suốt. Màu a, b lấy từ items.json nên đổi màu ở dữ liệu là hình đổi theo. Gọi từ build.py: pickup_sprites(save)."""
import json
from pathlib import Path
from px import Canvas, hx

ROOT = Path(__file__).resolve().parents[2]

MAPS = {
    'linh-thao': [   # cây linh thảo ba lá, nụ sáng trên ngọn
        '....kbk....',
        '...kbwbk...',
        '.kk.kbk.kk.',
        'kbbk.k.kbbk',
        'kabbkskbbak',
        '.kaabsbaak.',
        '..kkksskk..',
        '....kss....',
        '...kdssdk..',
        '..kdddddk..',
        '...kkkkk...'],
    'hoa-tinh-thach': [   # tinh thạch lửa nhiều mũi
        '.....k.....',
        '....kbk....',
        '..k.kbk.k..',
        '.kbkbwbkbk.',
        '.kbkbbbkbk.',
        'kbbabbbabbk',
        'kabaabaabak',
        'kaaakakaaak',
        '.kaaaaaaak.',
        '..kkkkkkk..',
        '...........'],
    'bang-tam': [   # trái tim băng
        '...........',
        '.kkk...kkk.',
        'kbwbk.kbbbk',
        'kwbbbkbbbak',
        'kbbbbbbbaak',
        '.kbbbbbaak.',
        '..kbbbaak..',
        '...kbaak...',
        '....kak....',
        '.....k.....',
        '...........'],
    'ngoc-cau-cuu': [   # ngọc bài có dây đỏ
        '....krk....',
        '....krk....',
        '..kkkkkkk..',
        '.kgbbbbbgk.',
        '.kbbwbbbbk.',
        '.kbbkkkbbk.',
        '.kbbkgkbbk.',
        '.kbbkkkbbk.',
        '.kgbbbbbgk.',
        '..kkkkkkk..',
        '...........'],
    'linh-quang': [   # đốm sáng có tia
        '.....b.....',
        '.....b.....',
        '..b..b..b..',
        '...kkkkk...',
        '..kbbwbbk..',
        'bbkbwwwbkbb',
        '..kbbwbbk..',
        '...kkkkk...',
        '..b..b..b..',
        '.....b.....',
        '.....b.....'],
    'suong-mai': [   # giọt sương
        '.....k.....',
        '....kbk....',
        '....kbk....',
        '...kbbbk...',
        '..kbwbbbk..',
        '..kwbbbak..',
        '.kbbbbbaak.',
        '.kbbbbaaak.',
        '..kbbaaak..',
        '...kkkkk...',
        '...........'],
    'manh-kiem': [   # mảnh lưỡi kiếm gãy, cắm chéo
        '.........kk',
        '........kwk',
        '.......kwbk',
        '......kwbk.',
        '.....kwbk..',
        '....kwbk...',
        '...kkbk....',
        '..kgkk.....',
        '.kgkgk.....',
        'kkk.kk.....',
        '...........'],
    'kim-sa-tinh': [   # đống cát vàng lấp lánh
        '...........',
        '.....w.....',
        '....kbk....',
        '...kbbbk...',
        '..kbbwbbk..',
        '..kbabbbk..',
        '.kbbbbabbk.',
        '.kabbbbbak.',
        'kaabaaabaak',
        '.kkkkkkkkk.',
        '...........'],
    'bang-hoa': [   # bông băng sáu cánh
        '.....k.....',
        '..k.kbk.k..',
        '.kbkkbkkbk.',
        '..kbkbkbk..',
        'kkkkbwbkkkk',
        'kbbbwwwbbbk',
        'kkkkbwbkkkk',
        '..kbkbkbk..',
        '.kbkkbkkbk.',
        '..k.kbk.k..',
        '.....k.....'],
    'linh-nhuong': [   # cục đất linh có mầm
        '.....s.....',
        '....sks....',
        '.....k.....',
        '...kkkkk...',
        '..kbbwbbk..',
        '.kbbbbbbak.',
        '.kbabbbaak.',
        'kaabaaabaak',
        'kaaaaaaaaak',
        '.kkkkkkkkk.',
        '...........'],
    'tran-nhan': [   # mảnh trận nhãn khắc phù văn
        '...........',
        '....kkkk...',
        '...kbbbbk..',
        '..kbwbkbbk.',
        '.kbbkbbkbk.',
        '.kbbbkkbak.',
        '.kbkbbbaak.',
        '..kbbkaak..',
        '...kbaak...',
        '....kkk....',
        '...........'],
    'hu-tinh': [   # tinh thể hư không lơ lửng
        '.....k.....',
        '....kwk....',
        '...kbwbk...',
        '...kbbbk...',
        '..kbbbbak..',
        '..kbbbaak..',
        '...kbaak...',
        '...kbaak...',
        '....kak....',
        '.....k.....',
        '..b.....b..'],
}

FIXED = {'k': '#1b1830', 'w': '#ffffff', 's': '#3a8a3a', 'd': '#6a4a2a', 'g': '#f2c94c', 'r': '#c8322a'}


def pickup_sprites(save):
    q = json.loads((ROOT / 'data' / 'items.json').read_text(encoding='utf-8'))['quest_items']
    n = 0
    for iid, rows in MAPS.items():
        it = q.get(iid)
        if not it: continue
        pal = {**FIXED, 'a': it.get('base', '#2f7a44'), 'b': it.get('color', '#9af0a8')}
        c = Canvas(11, 11)
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.': c.px(x, y, hx(pal[ch]))
        save('pickup.' + iid, [c], (5, 10), f'đồ nhiệm vụ nhặt trên đất: {it["name"]} (vẽ code, màu theo items.json)')
        n += 1
    return n
