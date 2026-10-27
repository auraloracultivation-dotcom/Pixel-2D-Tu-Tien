"""Hình chibi cho mọi NPC trong data/npcs.json, ghép lớp bằng chars.draw từ màu áo (color) và màu tóc (hair).
Kiểu tóc, phụ kiện lấy ở "art" của NPC: {"style": bun | long | spiky, "acc": [fox-ears, horns, mark]}; không có thì búi tóc.
4 khung như chars.py: đứng, nhún, bước A, bước B. Nhìn phải."""
from px import hx
from chars import draw
from mobs import tones


def _hair(color):
    P, _ = tones(color)
    return [P[3], P[2], P[1]]


def npc_spec(d):
    P, _ = tones(d.get('color', '#c9a46a'))
    trim = hx('#f2c94c') if sum(hx(d.get('color', '#c9a46a'))[:3]) < 300 else P[0]   # áo tối thì viền vàng cho nổi
    art = d.get('art', {})
    return dict(name=d['name'], hair=dict(style=art.get('style', 'bun'), pal=_hair(d.get('hair', '#5a4a86'))),
                robe=[P[3], P[2], P[1], trim], belt=P[0] if trim != P[0] else hx('#f2c94c'), acc=art.get('acc', []))


def npc_frames(d):
    spec = npc_spec(d)
    return [draw(spec, f) for f in range(4)]
