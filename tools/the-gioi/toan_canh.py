"""Ảnh toàn cảnh một bản đồ tinh cầu (để chủ dự án duyệt bố cục trước khi đưa vào game).
Nền vẽ đúng cách game sẽ vẽ: bộ 15 mảnh lưới đôi của SpriteCook, ô 32 điểm (khoá "nen" của bản đồ); đồ dán theo chân, xếp theo hàng.
Chạy: python3 tools/the-gioi/toan_canh.py <bản đồ .json> <ảnh ra .png> [--chu] [--cat x0,y0,x1,y1] [--thu 0.5]
  --chu: thêm chú thích (NPC, bãi quái, cổng, tên công trình, vùng phố)."""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from ban_do import ART, ROOT, kind_of

P = 32                                                            # điểm mỗi ô
FRAME = [-1, 15, 8, 9, 0, 11, 14, 7, 13, 4, 1, 10, 3, 2, 5, 6]    # khung theo mặt nạ 4 góc (SpriteCook)
COL = {'1': (142, 136, 150), '2': (176, 170, 160), '_': (200, 196, 184), 'P': (176, 170, 160), 'M': (176, 170, 160)}


def h2(x, y):
    n = (x * 374761393 + y * 668265263) & 0xffffffff
    n = ((n ^ (n >> 13)) * 1274126177) & 0xffffffff
    return ((n ^ (n >> 16)) & 0xffff) / 65535


def sheet(sid):
    s = ART[sid]
    return Image.open(ROOT / s['file']).convert('RGBA'), s


def tile(im, f):
    return im.crop(((f % 4) * P, (f // 4) * P, (f % 4) * P + P, (f // 4) * P + P))


def dual(out, im, filled, D, zero=-1):   # zero: khung cho ô không góc nào đầy (bộ hai mặt: khung 12 = mặt thứ hai đặc)
    for y in range(D + 1):
        for x in range(D + 1):
            m = (1 if filled(x - 1, y - 1) else 0) | (2 if filled(x, y - 1) else 0) | (4 if filled(x - 1, y) else 0) | (8 if filled(x, y) else 0)
            f = FRAME[m] if m else zero
            if f >= 0:
                out.alpha_composite(tile(im, f), (x * P - P // 2, y * P - P // 2))


def ground(m):
    g, D = m['grid'], len(m['grid'])
    at = lambda x, y: g[y][x] if 0 <= x < D and 0 <= y < D else '~'
    out = Image.new('RGBA', (D * P, D * P), (0, 0, 0, 0))
    nen = m.get('nen') or {}
    nuoc, _ = sheet(nen.get('nuoc', 'nen.tk-nuoc'))
    co = tile(nuoc, 6)
    flips = [co, co.transpose(Image.FLIP_LEFT_RIGHT), co.transpose(Image.FLIP_TOP_BOTTOM), co.transpose(Image.ROTATE_180)]
    for y in range(D):
        for x in range(D):
            out.paste(flips[int(h2(x, y) * 4) % 4], (x * P, y * P))
    w = Image.new('RGBA', out.size, (0, 0, 0, 0))
    dual(w, nuoc, lambda x, y: at(x, y) != '=', D, zero=12)
    wm = Image.new('L', out.size, 0)   # chỉ lấy lớp nước ở quanh ô nước (chỗ khác giữ cỏ lật ngẫu nhiên cho đỡ lặp)
    dm = ImageDraw.Draw(wm)
    for y in range(D):
        for x in range(D):
            if at(x, y) == '=':
                dm.rectangle([x * P - P, y * P - P, x * P + 2 * P - 1, y * P + 2 * P - 1], fill=255)
    out.paste(w, (0, 0), Image.composite(w.split()[3], Image.new('L', out.size, 0), wm))
    d = ImageDraw.Draw(out)
    lat = bool(nen.get('san'))   # có bộ nền lát (sân đá, phố gạch) thì vẽ lưới đôi như game; không thì khối màu
    under = lambda x, y: (next((c for c in (at(x, y + 1), at(x + 1, y), at(x - 1, y), at(x, y - 1)) if c in '.,12_'), '.') if at(x, y) in 'PMS' else at(x, y))
    for y in range(D):
        for x in range(D):
            ch = under(x, y)
            if ch in COL and not (lat and ch in '12'):
                c = COL[ch]
                k = 0.95 + h2(x + 9, y) * 0.1
                d.rectangle([x * P, y * P, x * P + P - 1, y * P + P - 1], fill=tuple(int(v * k) for v in c) + (255,))
            elif ch == '^':   # núi: khối tạm (trong game là hình núi cũ)
                k = 0.8 + h2(x, y + 5) * 0.3
                d.rectangle([x * P, y * P, x * P + P - 1, y * P + P - 1], fill=(int(118 * k), int(112 * k), int(124 * k), 255))
                d.polygon([(x * P, y * P + P - 1), (x * P + 16, y * P + 4), (x * P + P - 1, y * P + P - 1)], fill=(int(150 * k), int(146 * k), int(158 * k), 255))
                if at(x, y - 1) != '^':
                    d.polygon([(x * P + 9, y * P + 14), (x * P + 16, y * P + 4), (x * P + 23, y * P + 14)], fill=(236, 240, 248, 255))
    if lat:
        dual(out, sheet(nen['san'])[0], lambda x, y: under(x, y) in '12', D)
        if nen.get('gach'):
            dual(out, sheet(nen['gach'])[0], lambda x, y: under(x, y) == '1', D)
    dat, _ = sheet(nen.get('dat', 'nen.tk-dat'))
    dual(out, dat, lambda x, y: at(x, y) == ',', D)
    return out


def render(m, chu=False):
    g, D = m['grid'], len(m['grid'])
    out = ground(m)
    c, r = D * P / 2, (D / 2 - 1.21) * P
    mask = Image.new('L', out.size, 0)
    ImageDraw.Draw(mask).ellipse([c - r, c - r, c + r, c + r], fill=255)
    sky = Image.new('RGBA', out.size, (14, 12, 34, 255))
    ds = ImageDraw.Draw(sky)
    for i in range(900):
        ds.point((h2(i, 1) * out.width, h2(i, 2) * out.height), fill=(235, 240, 255, 255))
    ds.ellipse([c - r - 3, c - r + 10, c + r + 3, c + r + 26], fill=(88, 72, 62, 255))   # vách dưới mép đĩa
    sky.paste(out, (0, 0), mask)
    out = sky
    k = 2 * 16 / 16   # ô 32 điểm ↔ 16 đơn vị: 1 đơn vị = 2 điểm
    for sid, x, y, *rest in sorted(m['hoi']['do'], key=lambda it: (kind_of(it[0]) != 'phang', it[2])):
        o = rest[1] if len(rest) > 1 and rest[1] else {}
        im, s = sheet(sid)
        im = im.crop((0, 0, s['w'], s['h']))
        sc = s.get('scale', 1) * o.get('s', 1) * k
        im = im.resize((max(1, round(s['w'] * sc)), max(1, round(s['h'] * sc))), Image.NEAREST)
        if o.get('f'):
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        out.alpha_composite(im, (round(x * P - im.width / 2), round(y * P - im.height)))
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
            hgt = s['h'] * s.get('scale', 1) * ((it[4] or {}).get('s', 1) if len(it) > 4 else 1) / 16
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
