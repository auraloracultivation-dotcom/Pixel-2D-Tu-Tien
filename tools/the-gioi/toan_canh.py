"""Ảnh toàn cảnh một bản đồ tinh cầu (để chủ dự án duyệt bố cục trước khi đưa vào game).
Nền vẽ đúng cách game vẽ (src/world/draw-nen.js, cùng hàm băm nên hoa cỏ in nền nằm đúng chỗ như trong game): bộ 15 mảnh lưới đôi của
SpriteCook, ô 32 điểm (khoá "nen" của bản đồ); đồ dán theo chân (anchor), cầu và đồ phẳng nằm dưới, còn lại xếp theo hàng.
Chạy: python3 tools/the-gioi/toan_canh.py <bản đồ .json> <ảnh ra .png> [--chu] [--cat x0,y0,x1,y1] [--thu 0.5]
  --chu: thêm chú thích (NPC, bãi quái, cổng, tên công trình, vùng phố)."""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from ban_do import ART, LH, ROOT, kind_of

P = 32                                                            # điểm mỗi ô
FRAME = [-1, 15, 8, 9, 0, 11, 14, 7, 13, 4, 1, 10, 3, 2, 5, 6]    # khung theo mặt nạ 4 góc (SpriteCook)
COL = {'1': (142, 136, 150), '2': (176, 170, 160), '_': (200, 196, 184), 'P': (176, 170, 160), 'M': (176, 170, 160)}


def jh(x, y):
    """Hàm băm của game (src/world/draw-map.js hash), tính y như JavaScript (số thực 64 bit rồi cắt 32 bit)."""
    h = (x * 374761393 + y * 668265263) & 0xffffffff
    if h >= 1 << 31:
        h -= 1 << 32
    v = (h ^ ((h & 0xffffffff) >> 13))
    v = (v & 0xffffffff) - (1 << 32) if (v & 0xffffffff) >= 1 << 31 else v & 0xffffffff
    a = int(float(v) * 1274126177.0) & 0xffffffff
    return ((a ^ (a >> 16)) & 0xffffffff) / 4294967296


def vn(x, y, s, o=900):
    """Nhiễu mượt 0..1 (nội suy hàm băm trên lưới s ô), y như vn() của draw-nen.js."""
    gx, gy = math.floor(x / s), math.floor(y / s)
    u, v = x / s - gx, y / s - gy
    a, b = u * u * (3 - 2 * u), v * v * (3 - 2 * v)
    return (jh(gx + o, gy + o) * (1 - a) + jh(gx + 1 + o, gy + o) * a) * (1 - b) + (jh(gx + o, gy + 1 + o) * (1 - a) + jh(gx + 1 + o, gy + 1 + o) * a) * b


def hoa_o(at, tx, ty, nen='.'):
    """Ô cỏ này in cụm hoa cỏ nào (−1: không). Y như hoaO() của draw-nen.js."""
    if any(at(tx + dx, ty + dy) not in nen for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1))):
        return -1
    n = vn(tx, ty, 7)
    p = 0.26 if n > 0.66 else 0.07 if n > 0.52 else 0.018
    if jh(tx + 101, ty + 59) >= p:
        return -1
    v = jh(tx + 7, ty + 211)
    if v < 0.12:
        return 3 if v < 0.06 else 4
    return math.floor(jh(tx // 11 + 3, ty // 11 + 9) * 3) if v < 0.8 else math.floor(v * 100) % 3


def sheet(sid):
    s = ART[sid]
    return Image.open(ROOT / s['file']).convert('RGBA'), s


def tile(im, f):
    return im.crop(((f % 4) * P, (f // 4) * P, (f % 4) * P + P, (f // 4) * P + P))


def dual(out, im, filled, D, zero=-1, skip15=False, clear=False):
    """Một lớp lưới đôi. zero: khung khi không góc nào đầy; skip15: bỏ mảnh đầy cả 4 góc; clear: xoá ô trước khi dán (lớp mép)."""
    for y in range(D + 1):
        for x in range(D + 1):
            m = (1 if filled(x - 1, y - 1) else 0) | (2 if filled(x, y - 1) else 0) | (4 if filled(x - 1, y) else 0) | (8 if filled(x, y) else 0)
            f = FRAME[m] if m else zero
            if f < 0 or (skip15 and m == 15):
                continue
            if clear:
                out.paste((0, 0, 0, 0), (x * P - P // 2, y * P - P // 2, x * P + P // 2, y * P + P // 2))
            out.alpha_composite(tile(im, f), (max(0, x * P - P // 2), max(0, y * P - P // 2)),
                                (max(0, P // 2 - x * P), max(0, P // 2 - y * P), P, P))


def ground(m):
    g, D = m['grid'], len(m['grid'])
    at = lambda x, y: g[y][x] if 0 <= x < D and 0 <= y < D else '~'
    out = Image.new('RGBA', (D * P, D * P + 4 * P), (0, 0, 0, 0))
    nen = m.get('nen') or {}
    ky = {'nen': '.', 'nuoc': '=', 'dat': ',', 'san': '12', 'gach': '1', 'nui': '^', 'them': [], **(nen.get('ky') or {})}   # như kyOf() của draw-nen.js
    lot = bool(nen.get('ky'))
    nuoc, _ = sheet(nen.get('nuoc', 'nen.tk-nuoc'))
    co = tile(nuoc, 6)
    lat = bool(nen.get('san'))   # có bộ nền lát (sân đá, phố gạch) thì vẽ lưới đôi như game; không thì khối màu
    under = lambda x, y: (next((c for c in (at(x, y + 1), at(x + 1, y), at(x - 1, y), at(x, y - 1)) if c in '.,12_'), '.') if at(x, y) in 'PMS' else at(x, y))
    d = ImageDraw.Draw(out)
    for y in range(D):
        for x in range(D):
            ch = under(x, y)
            if ch == '~':
                continue
            if not lot and ch in COL and not (lat and ch in '12'):
                c = COL[ch]
                k = 0.95 + jh(x + 9, y) * 0.1
                d.rectangle([x * P, y * P, x * P + P - 1, y * P + P - 1], fill=tuple(int(v * k) for v in c) + (255,))
                continue
            h = jh(x, y)
            t = co if h < 0.5 else co.transpose(Image.FLIP_LEFT_RIGHT)
            out.paste(t if (h * 2) % 1 < 0.5 else t.transpose(Image.FLIP_TOP_BOTTOM), (x * P, y * P))
            if ch == '^' and not nen.get('nui'):   # núi: khối tạm khi bản đồ chưa có nền đá
                k = 0.8 + jh(x, y + 5) * 0.3
                d.rectangle([x * P, y * P, x * P + P - 1, y * P + P - 1], fill=(int(118 * k), int(112 * k), int(124 * k), 255))
    if nen.get('hoa'):   # hoa cỏ in nền
        hoa, hs = sheet(nen['hoa'])
        for y in range(D):
            for x in range(D):
                k = hoa_o(at, x, y, ky['nen'])
                if k >= 0:
                    px = round((x + 0.5) * P + round((jh(x + 31, y + 17) - 0.5) * 16) - hs['w'] / 2)
                    py = (y + 1) * P - round(jh(x + 5, y + 71) * 10) - hs['h']
                    out.alpha_composite(hoa.crop((k * hs['w'], 0, (k + 1) * hs['w'], hs['h'])), (max(0, px), max(0, py)))
    if nen.get('nui'):
        dual(out, sheet(nen['nui'])[0], lambda x, y: at(x, y) in ky['nui'], D)
    dual(out, nuoc, lambda x, y: at(x, y) not in ky['nuoc'], D, zero=12, skip15=True)
    if lat:
        dual(out, sheet(nen['san'])[0], lambda x, y: under(x, y) in ky['san'], D)
        if nen.get('gach'):
            dual(out, sheet(nen['gach'])[0], lambda x, y: under(x, y) in ky['gach'], D)
    for sid, chs in ky['them']:
        dual(out, sheet(sid)[0], lambda x, y, chs=chs: under(x, y) in chs, D)
    if nen.get('dat') or not lot:
        dual(out, sheet(nen.get('dat', 'nen.tk-dat'))[0], lambda x, y: at(x, y) in ky['dat'], D)
    if nen.get('mep'):
        dual(out, sheet(nen['mep'])[0], lambda x, y: at(x, y) != '~', D, skip15=True, clear=True)
    return out


def vach(size, m):
    """Dải vách đá dưới đáy tinh cầu: mỗi cột điểm ảnh một lát của hình vách, uốn theo vòng tròn mép nam; lặp ngang kiểu soi gương."""
    D = len(m['grid'])
    im, s = sheet(m['nen']['vach'])
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    c, r = D * P / 2, (D / 2 - 0.76) * P
    for x in range(size[0]):
        dx = x + 0.5 - c
        if dx * dx > r * r:
            continue
        yb = math.floor(c + math.sqrt(r * r - dx * dx)) - 8
        u = x % (2 * s['w'])
        u = u if u < s['w'] else 2 * s['w'] - 1 - u
        out.paste(im.crop((u, 0, u + 1, s['h'])), (x, yb))
    return out


def render(m, chu=False):
    g, D = m['grid'], len(m['grid'])
    land = ground(m)
    nen = m.get('nen') or {}
    sky = Image.new('RGBA', land.size, (14, 12, 34, 255))
    ds = ImageDraw.Draw(sky)
    for i in range(1400):
        ds.point((jh(i, 1) * land.width, jh(i, 2) * land.height), fill=(235, 240, 255, 255))
    c, r = D * P / 2, (D / 2 - 1.21) * P
    if nen.get('mep'):
        if nen.get('vach'):
            sky.alpha_composite(vach(land.size, m))
        sky.alpha_composite(land)
    else:   # bản đồ chưa có lớp mép: cắt tròn như game
        mask = Image.new('L', land.size, 0)
        ImageDraw.Draw(mask).ellipse([c - r, c - r, c + r, c + r], fill=255)
        ds.ellipse([c - r - 3, c - r + 10, c + r + 3, c + r + 26], fill=(88, 72, 62, 255))   # vách dưới mép đĩa
        sky.paste(land, (0, 0), mask)
    out = sky
    ft = lambda sid: LH['foot'].get(kind_of(sid), {})
    lop = lambda sid: 0 if ft(sid).get('flat') or ft(sid).get('walk') else 1 if ft(sid).get('bake') else 2   # đồ nằm dưới chân, núi in nền, đồ đứng
    for sid, x, y, *rest in sorted(m['hoi']['do'], key=lambda it: (lop(it[0]), it[2])):
        o = rest[1] if len(rest) > 1 and rest[1] else {}
        im, s = sheet(sid)
        im = im.crop((0, 0, s['w'], s['h']))
        sc = s.get('scale', 1) * o.get('s', 1) * 2   # ô 32 điểm ↔ 16 đơn vị: 1 đơn vị = 2 điểm
        ax, ay = s.get('anchor', [s['w'] // 2, s['h']])
        if abs(sc - 1) > 1e-6:
            im = im.resize((max(1, round(s['w'] * sc)), max(1, round(s['h'] * sc))), Image.NEAREST)
        if o.get('f'):
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
            ax = s['w'] - ax
        px, py = round(x * P - ax * sc), round(y * P - ay * sc)
        out.alpha_composite(im, (max(0, px), max(0, py)), (max(0, -px), max(0, -py), im.width, im.height))
    if chu:
        annotate(out, m)
    return out


def annotate(out, m):
    d = ImageDraw.Draw(out)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
        fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
    except OSError:
        f = fs = ImageFont.load_default()

    def text(x, y, s, font, fill):
        w = d.textlength(s, font=font)
        d.text((x - w / 2, y), s, font=font, fill=fill, stroke_width=4, stroke_fill=(10, 10, 20, 255))

    for a, b, c, e in (m.get('le_hoi') or {}).get('khu', []):
        d.rectangle([a * P, b * P, c * P, e * P], outline=(255, 230, 120, 255), width=3)
    for s in m['spawners']:
        x, y = s['at']
        col = (255, 90, 90, 255) if s.get('mul') else (255, 170, 80, 255)
        d.ellipse([(x - 5) * P, (y - 5) * P, (x + 6) * P, (y + 6) * P], outline=col, width=5)
        text((x + 0.5) * P, (y - 0.4) * P, 'Bãi quái ×2' if s.get('mul') else 'Bãi quái', fs, col)
    for n in m['npcs']:
        x, y = n['at'][0] + 0.5, n['at'][1] + 0.5   # game đặt NPC ở tâm ô
        d.ellipse([x * P - 9, y * P - 22, x * P + 9, y * P - 4], fill=(90, 220, 255, 255), outline=(10, 10, 20, 255), width=3)
    for p in m['portals']:
        if not p.get('fly'):
            x, y = p['at']
            d.ellipse([x * P - 8, y * P - 8, x * P + P + 8, y * P + P + 8], outline=(200, 130, 255, 255), width=6)
            text((x + 0.5) * P, (y + 1.4) * P, p['label'], fs, (220, 170, 255, 255))
    for it in m['hoi']['do']:
        if len(it) > 3 and it[3] and it[0] != 'chung.bien-go':
            s = ART[it[0]]
            hgt = s.get('anchor', [0, s['h']])[1] * s.get('scale', 1) * ((it[4] or {}).get('s', 1) if len(it) > 4 else 1) / 16
            text(it[1] * P, (it[2] - hgt) * P - 36, it[3], f, (255, 255, 255, 255))


def main():
    a = sys.argv[1:]
    m = json.loads(Path(a[0]).read_text(encoding='utf-8'))
    out = render(m, '--chu' in a)
    if '--cat' in a:
        x0, y0, x1, y1 = (float(v) for v in a[a.index('--cat') + 1].split(','))
        out = out.crop((int(x0 * P), int(y0 * P), int(x1 * P), int(y1 * P)))
    if '--thu' in a:
        t = float(a[a.index('--thu') + 1])
        out = out.resize((round(out.width * t), round(out.height * t)), Image.LANCZOS if t < 1 else Image.NEAREST)
    out.convert('RGB').save(a[1])
    print(a[1], out.size)


if __name__ == '__main__':
    main()
