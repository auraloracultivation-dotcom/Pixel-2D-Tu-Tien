"""Lắp nền và cây SpriteCook lên bố cục đang có của các tinh cầu khác Thiên Kiếm Tinh (chủ dự án 21/11/2026 02:3x "Làm toàn bộ nha,
nền và cây, hoa cỏ"; xếp lại bố cục theo luật thế giới và nhà cửa là đợt sau). Không đổi lưới ô: ô nào đi được vẫn đi được, ô chắn
vẫn chắn (truyện, Tự hành, bãi quái giữ nguyên). Mỗi bản đồ:
  nen        bộ 15 mảnh của tinh cầu (tools/art/sc_tc.py) + "ky": ký tự ô của từng lớp (src/world/draw-nen.js).
  prop_hide  ô cây, đá, trụ, hoa, núi không vẽ hình cũ nữa; mỗi ô đó đặt một món SpriteCook (hoi.do) cùng chỗ, ô vẫn chắn như cũ.
  hoi.do     đồ đang có giữ nguyên; cây, bụi, đá kiểu cũ (ảnh GPT -m của Xích Diễm, Hàn Băng) đổi sang hình SpriteCook cùng chỗ; thêm bụi,
             đồ nhỏ rải thưa trên nền trống (không chắn đường, tránh đường, cổng, NPC, bãi quái, phố hội). Làng Tinh Linh rải dày hoa.
  hoi.bay_tu số bản bố cục Bày cảnh trên máy chủ đã có (bố cục cũ bỏ qua, dùng bản này; món chủ dự án bày thêm đã chép vào THEM).
Ngẫu nhiên có hạt cố định theo bản đồ: chạy lại ra y hệt. Chạy: python3 tools/the-gioi/tc_nen.py [mã bản đồ…]"""
import json
import math
import random
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOC = '8b728a2f'   # bản đồ gốc (main 21/11/2026 trước đợt này): chạy lại bao nhiêu lần cũng dựng từ bản gốc, không cộng dồn
MAPS = ROOT / 'data/maps'
LH = json.loads((ROOT / 'data/le-hoi.json').read_text(encoding='utf-8'))
TK = {'nuoc': 'nen.tk-nuoc', 'dat': 'nen.tk-dat', 'mep': 'nen.tk-mep', 'vach': 'nen.tk-vach', 'nui': 'nen.tk-nui', 'hoa': 'nen.tk-hoa'}


def bo(tc, dat=True, san=None, gach=None):
    n = {k: f'nen.tc-{tc}-{k}' for k in ('nuoc', 'mep', 'vach', 'nui', 'hoa')}
    if dat:
        n['dat'] = f'nen.tc-{tc}-dat'
    if san:
        n['san'] = f'nen.tc-{tc}-san'
    if gach:
        n['gach'] = f'nen.tc-{tc}-gach'
    return n


NUI = lambda tc: [(f'tc.da-nui-{i}-{tc}-sc', 1, 0.9, 1.15) for i in (1, 2, 3, 4)] + [(f'tc.nui-doi-{i}-{tc}-sc', 1, 0.8, 1) for i in (1, 2)]
TKNUI = [(f'tk.da-nui-{i}-sc', 1, 0.9, 1.15) for i in (1, 2, 3, 4)] + [(f'tk.nui-doi-{i}-sc', 1, 0.8, 1) for i in (1, 2)]
NHO = lambda tc: [(f'tc.nho-{tc}-{i}-sc', 1, 0.9, 1.1) for i in range(5)]
TKHOA = [('tk.bui-cuc-vang-sc', 1, 0.8, 1), ('tk.bui-do-quyen-sc', 1, 0.8, 1), ('tk.bui-hoa-trang-sc', 1, 0.8, 1), ('tk.bui-mau-don-sc', 1, 0.8, 1),
         ('tk.hoa-do-sc', 1, 0.9, 1.1), ('tk.hoa-lam-sc', 1, 0.9, 1.1), ('tk.hoa-vang-sc', 1, 0.9, 1.1)]
LTLHOA = [(f'tc.bui-{t}-sc', 1, 0.55, 0.7) for t in ('oai-huong', 'mau-don-hong', 'hue-trang', 'tu-cau', 'cuc-vang-lon', 'tra-do')]
# mỗi bản đồ: nen, ky, cay (ký tự ô → [(hình, trọng số, cỡ nhỏ nhất, lớn nhất)]), thua (ô cây đứng sát cây khác: món nhỏ hơn cho đỡ chồng),
# doi (đồ hội cũ → [(hình mới, cỡ)]), rai ([(hình…)], tỉ lệ ô trống được rải), them (món chủ dự án bày thêm trên máy chủ), bay (bản máy chủ)
CFG = {
    'thanh-khe': {'nen': {**TK, 'san': 'nen.tk-san'}, 'ky': {'san': '_'},
                  'cay': {'T': [('tk.cay-anh-dao-sc', 1, 0.8, 1), ('tk.cay-ngan-hanh-sc', 2, 0.8, 1), ('tk.cay-phong-sc', 1, 0.75, 0.95), ('tk.cay-thong-sc', 2, 0.75, 0.95)],
                          'R': [('tk.da-cum-sc', 2, 0.9, 1.1), ('tk.da-vua-sc', 2, 0.9, 1.1), ('tk.da-reu-lon-sc', 1, 0.7, 0.85)],
                          'F': TKHOA, '^': TKNUI},
                  'thua': [('tk.bui-xanh-lon-sc', 2, 0.9, 1.1), ('tk.bui-xanh-nho-sc', 2, 0.9, 1.1), ('tk.goc-cay-sc', 1, 0.9, 1)],
                  'doi': {'tk.cay-anh-dao-m': [('tk.cay-anh-dao-sc', 0.95)]}, 'rai': (TKHOA[:4] + [('tk.bui-xanh-nho-sc', 2, 0.8, 1), ('tk.bui-co-cao-sc', 2, 0.7, 0.9)], 0.02),
                  'bay': 1},
    'dao-xich-dien': {'nen': bo('xd', san=1, gach=1), 'ky': {'nen': 'a', 'nuoc': 'L'},
                      'doi': {'xd.cay-chay-m': [('tc.cay-chay-sc', 0.9)], 'xd.cay-than-m': [('tc.cay-chay-sc', 0.8)], 'xd.cay-den-m': [('tc.cay-chay-mai-sc', 0.95)],
                              'xd.cay-hoa-lua-m': [('tc.cay-chay-la-sc', 0.9)], 'xd.truc-do-m': [('tc.cay-chay-mai-sc', 0.8)],
                              'xd.bui-tro-m': [('tc.bui-tro-sc', 0.6)], 'xd.bui-chay-m': [('tc.bui-tro-sc', 0.55)], 'xd.bui-co-do-m': [('tc.bui-tro-sc', 0.5)],
                              'xd.da-dung-nham-m': [('tc.da-nui-lua-sc', 0.75)], 'xd.da-bazan-m': [('tc.da-nui-lua-sc', 0.65)], 'xd.soi-tro-m': [('tc.soi-nui-lua-sc', 0.7)]},
                      'rai': (NHO('xd') + [('tc.bui-tro-sc', 2, 0.45, 0.6), ('tc.soi-nui-lua-sc', 2, 0.5, 0.65)], 0.02),
                      'them': [['xd.cong-hac-m', 46.6, 31.8]], 'bay': 3},
    'dao-han-bang': {'nen': bo('hb', san=1, gach=1), 'ky': {'nen': 'w', 'nuoc': 'O', 'them': [['nen.tc-hb-bang', 'i']]},
                     'doi': {'hb.cay-tung-tuyet-m': [('tc.tung-tuyet-sc', 0.9), ('tc.tung-tuyet-vua-sc', 1)], 'hb.cay-tung-nho-m': [('tc.tung-tuyet-non-sc', 1.1)],
                             'hb.cay-kho-m': [('tc.cay-bang-sc', 0.9)], 'hb.cay-bang-m': [('tc.cay-bang-sc', 1)], 'hb.lieu-bang-m': [('tc.cay-bang-sc', 0.95)],
                             'hb.cay-mai-m': [('tk.cay-anh-dao-sc', 0.9)], 'hb.bui-tuyet-m': [('tc.bui-tuyet-sc', 0.6)], 'hb.bui-mai-m': [('tc.bui-tuyet-sc', 0.5)],
                             'hb.da-bang-m': [('tc.da-tuyet-sc', 0.7)], 'hb.da-tuyet-m': [('tc.da-tuyet-sc', 0.8)],
                             'hb.bui-hoa-bang-m': [('tc.nho-hb-0-sc', 1)], 'hb.bui-co-trang-m': [('tc.nho-hb-3-sc', 1)], 'hb.soi-tuyet-m': [('tc.nho-hb-2-sc', 1)],
                             'hb.manh-bang-m': [('tc.nho-hb-4-sc', 1)]},
                     'rai': (NHO('hb') + [('tc.bui-tuyet-sc', 2, 0.45, 0.6)], 0.02), 'bay': 1},
    'hac-phong-dao': {'nen': bo('hp'), 'ky': {'nen': 'd'},
                      'cay': {'V': [('tc.cay-kho-gio-sc', 2, 0.7, 0.85), ('tc.cay-chay-mai-sc', 1, 0.75, 0.9)],
                              'U': [('tc.tru-da-den-sc', 2, 0.8, 1), ('tc.tru-da-gay-sc', 2, 0.85, 1)], 'R': [('tc.da-den-sc', 1, 0.55, 0.7)], '^': NUI('hp')},
                      'thua': [('tc.bui-gai-sc', 1, 0.5, 0.6), ('tc.da-den-sc', 1, 0.45, 0.55)],
                      'rai': (NHO('hp') + [('tc.bui-co-kho-sc', 2, 0.45, 0.6), ('tc.bui-gai-sc', 1, 0.45, 0.55)], 0.02),
                      'them': [['tk.cong-kiem-m', 25.5, 16.8, None, {'s': 0.7}]], 'bay': 4},
    'dao-moc': {'nen': bo('tm', dat=False), 'ky': {'nen': 'mn'},
                'cay': {'Z': [('tk.cay-co-thu-sc', 3, 0.9, 1.1), ('tc.cay-rung-sc', 2, 0.95, 1.15), ('tk.co-thu-lon-sc', 0.3, 0.6, 0.7)],
                        'n': [('tc.nam-cum-sc', 3, 0.8, 1), ('tk.nam-nau-sc', 2, 0.9, 1.1), ('tc.nho-tm-0-sc', 2, 1, 1.2)], '^': NUI('tm')},
                'thua': [('tc.bui-duong-xi-lon-sc', 2, 0.55, 0.7), ('tk.bui-duong-xi-sc', 2, 0.8, 1), ('tc.da-reu-xanh-sc', 1, 0.6, 0.75),
                         ('tc.nam-lam-to-sc', 1, 0.8, 1), ('tc.nam-tim-to-sc', 1, 0.8, 1)],
                'rai': (NHO('tm') + [('tk.bui-duong-xi-sc', 2, 0.7, 0.9), ('tc.nam-cum-sc', 1, 0.7, 0.9)], 0.025)},
    'dao-thien-kim': {'nen': bo('tkim', san=1), 'ky': {'nen': 's', 'san': 'g'},
                      'cay': {'T': [('tc.cay-ho-duong-sc', 1, 0.7, 0.85), ('tc.cay-ho-duong-nho-sc', 2, 0.9, 1.1)],
                              'J': [('tc.kiem-co-cat-sc', 2, 0.55, 0.7), ('tk.kiem-da-1-sc', 1, 0.7, 0.8), ('tk.kiem-da-2-sc', 1, 0.7, 0.8)],
                              'b': [('tc.da-quang-vang-sc', 2, 0.5, 0.65), ('tc.soi-vang-sc', 1, 0.6, 0.75)], 'h': [('tc.nho-tkim-3-sc', 1, 1, 1.2)],
                              'F': [('tc.nho-tkim-2-sc', 1, 1, 1.2)], '^': NUI('tkim')},
                      'rai': (NHO('tkim') + [('tc.bui-sa-mac-sc', 2, 0.4, 0.5)], 0.02),
                      'them': [['xd.cong-phuong-m', 49.5, 28.7]], 'bay': 1,
                      # cổng Phượng chủ dự án bày trên máy chủ (bản 1) chắn ô điểm tới từ Kiếm Trủng [47, 28] (lỗi có sẵn trên game): dời xuống một ô
                      'spawns': {'tu-kiem-trung': [47, 29]}},
    'dao-hau-tho': {'nen': bo('ht', dat=False, san=1), 'ky': {'nen': 't', 'san': 'o', 'them': [['nen.tc-ht-ruong', 'y']]},
                    'cay': {'T': [('tc.cay-thu-sc', 2, 0.8, 1), ('tk.cay-phong-sc', 1, 0.75, 0.95), ('tk.cay-ngan-hanh-sc', 1, 0.8, 1)],
                            'I': [('tc.tru-dat-cao-sc', 1, 0.6, 0.75), ('tc.tru-dat-sc', 2, 0.6, 0.75)], '^': NUI('ht')},
                    'thua': [('tc.bui-thu-sc', 2, 0.5, 0.6), ('tc.da-dat-set-sc', 1, 0.55, 0.7)],
                    'rai': (NHO('ht') + [('tc.bui-thu-sc', 2, 0.45, 0.55), ('tc.bo-lua-chin-sc', 1, 0.45, 0.55)], 0.02)},
    'vet-nut-ngoai': {'nen': bo('nv', dat=False), 'ky': {'nen': 'p', 'nuoc': 'f'},
                      'cay': {'*': [('tc.pha-le-cao-sc', 2, 0.6, 0.8), ('tc.pha-le-cum-sc', 3, 0.8, 1), ('tk.pha-le-tim-sc', 2, 0.9, 1.1),
                                    ('tc.cay-hu-khong-sc', 1, 0.7, 0.85), ('tc.da-noi-hk-sc', 1, 0.7, 0.85)], '^': NUI('nv')},
                      'thua': [('tc.da-hac-dieu-sc', 1, 0.7, 0.85), ('tc.pha-le-cum-sc', 1, 0.6, 0.75)],
                      'rai': (NHO('nv') + [('tc.bui-hoa-hk-sc', 1, 0.6, 0.75)], 0.02)},
    'lang-tinh-linh': {'nen': {**TK, 'hoa': 'nen.tc-ltl-hoa'}, 'ky': {'them': [['nen.tc-ltl-go', 'l']]},
                       'cay': {'Z': [('tc.tu-dang-sc', 2, 0.75, 0.9), ('tc.cay-moc-lan-sc', 1, 0.7, 0.85), ('tc.dao-hoa-sc', 2, 0.7, 0.85),
                                     ('tc.cay-que-hoa-sc', 1, 0.7, 0.85), ('tk.cay-anh-dao-sc', 2, 0.9, 1.05)],
                               'F': LTLHOA, 'n': [('tk.nam-nau-sc', 1, 0.9, 1.1)], '^': TKNUI},
                       'thua': LTLHOA, 'rai': (LTLHOA + NHO('ltl') + TKHOA, 0.09)},
}
TO = {'tk.co-thu-lon-sc', 'tc.cay-ho-duong-sc', 'tc.tu-dang-sc', 'tc.cay-moc-lan-sc', 'tc.dao-hoa-sc', 'tc.cay-que-hoa-sc'}   # tán rộng


def chon(rng, ds):
    tong = sum(w for _, w, *_ in ds)
    r = rng.random() * tong
    for it in ds:
        r -= it[1]
        if r <= 0:
            return it
    return ds[-1]


def mon(rng, it, x, y):
    sid, _, lo, hi = it
    o = {'s': round(rng.uniform(lo, hi), 2)}
    if rng.random() < 0.5:
        o['f'] = 1
    return [sid, round(x, 2), round(y, 2), None, o]


def cam(m):
    """Ô không rải đồ: quanh NPC, cổng, điểm vào, bãi quái, phố hội."""
    bad = set()
    pts = [n['at'] for n in m.get('npcs', [])] + [p['at'] for p in m.get('portals', [])] + list(m.get('spawns', {}).values())
    for (x, y) in pts:
        bad |= {(x + dx, y + dy) for dx in range(-2, 3) for dy in range(-2, 3)}
    for s in m.get('spawners', []):
        r = s.get('spread', 3) + 1
        x, y = s['at']
        bad |= {(x + dx, y + dy) for dx in range(-r, r + 1) for dy in range(-r, r + 1)}
    for k in (LH['festivals'].get(m['id'], {}).get('khu') or []):
        x0, y0, x1, y1 = k
        bad |= {(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)}
    return bad


def dung(m, c):
    rng = random.Random(m['id'])
    g = m['grid']
    H, W = len(g), len(g[0])
    at = lambda x, y: g[y][x] if 0 <= y < H and 0 <= x < W else '~'
    m['nen'] = {**c['nen'], 'ky': c['ky']}
    cay = c.get('cay', {})
    m['prop_hide'] = ''.join(sorted(set(cay) | (set(m.get('prop_hide', '')) - set(cay))))
    old = (m.get('hoi') or {}).get('do', [])
    doi = c.get('doi', {})
    do = []
    ky = c['ky']
    nen = ky.get('nen', '.')
    npc = [(n['at'][0] + 0.5, n['at'][1] + 0.5) for n in m.get('npcs', [])]
    che = lambda cx, cy: any(abs(nx - cx) < 3 and 0.3 < cy - ny < 5 for nx, ny in npc)   # món cao đứng trước NPC thì che NPC
    for it in old + c.get('them', []):
        if it[0] in doi:
            sid, s = rng.choice(doi[it[0]])
            o = dict(it[4]) if len(it) > 4 and it[4] else {}
            o['s'] = round(s * (0.92 + rng.random() * 0.16), 2)
            x, y = it[1], it[2]
            if at(int(x), int(y)) not in nen and sid.startswith('tk.cay'):   # cây cũ đứng trên đường: dời sang ô nền gần nhất
                x, y = min(((a + 0.5, b + 0.85) for a in range(int(x) - 3, int(x) + 4) for b in range(int(y) - 3, int(y) + 4) if at(a, b) in nen),
                           key=lambda q: math.hypot(q[0] - it[1], q[1] - it[2]))
            do.append([sid, round(x, 2), round(y, 2), None, o])
        else:
            do.append(it)
    cho = []   # chân các cây đã đặt (cây to cách nhau ≥ 2 ô, chồng thì ô đó dùng món nhỏ)
    for y in range(H):
        for x in range(W):
            ch = at(x, y)
            if ch not in cay:
                continue
            it = chon(rng, cay[ch])
            cx, cy = x + 0.5 + rng.uniform(-0.15, 0.15), y + 0.85
            gan = min((math.hypot(cx - a, cy - b) for a, b in cho), default=9)
            nho = [d for d in c.get('rai', ([], 0))[0] if '.nho-' in d[0] or '.hoa-' in d[0]]
            if ch != '^' and che(cx, cy) and nho:   # đứng trước NPC: chỉ đồ nhỏ sát đất
                it = chon(rng, nho)
            elif ch != '^' and c.get('thua') and (gan < (2.6 if it[0] in TO else 1.7) or che(cx, cy)):
                it = chon(rng, c['thua'])
            elif it[0] not in [n[0] for n in cay.get('^', [])]:
                cho.append((cx, cy))
            do.append(mon(rng, it, cx, cy))
    if c.get('rai'):
        ds, p = c['rai']
        bad = cam(m)
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                if (x, y) in bad or any(at(x + dx, y + dy) not in nen for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    continue
                if rng.random() < p:
                    do.append(mon(rng, chon(rng, ds), x + rng.uniform(0.2, 0.8), y + rng.uniform(0.6, 0.95)))
    m['spawns'].update(c.get('spawns', {}))
    hoi = dict(m.get('hoi') or {})
    hoi['do'] = do
    if c.get('bay'):
        hoi['bay_tu'] = c['bay']
    m['hoi'] = hoi
    return len(old), len(do)


def ghi(path, m):
    """Mỗi khoá cấp một một dòng; lưới và đồ hội mỗi phần tử một dòng (giống cách viết sẵn của các bản đồ)."""
    J = lambda v: json.dumps(v, ensure_ascii=False, separators=(', ', ': '))
    out, keys = ['{'], list(m)
    for i, k in enumerate(keys):
        v, cm = m[k], (',' if i < len(keys) - 1 else '')
        if k == 'grid':
            out += [f' "grid": ['] + [f'  {J(r)}' + (',' if j < len(v) - 1 else '') for j, r in enumerate(v)] + [' ]' + cm]
        elif k == 'hoi':
            rest = {a: b for a, b in v.items() if a != 'do'}
            out.append(' "hoi": {' + ''.join(f'{J(a)}: {J(b)}, ' for a, b in rest.items()) + '"do": [')
            out += [f'  {J(r)}' + (',' if j < len(v['do']) - 1 else '') for j, r in enumerate(v['do'])] + [' ]}' + cm]
        else:
            out.append(f' {J(k)}: {J(v)}{cm}')
    path.write_text('\n'.join(out + ['}']) + '\n', encoding='utf-8')


def main():
    ids = sys.argv[1:] or list(CFG)
    for mid in ids:
        p = MAPS / f'{mid}.json'
        m = json.loads(subprocess.run(['git', 'show', f'{GOC}:data/maps/{mid}.json'], cwd=ROOT, capture_output=True, check=True).stdout)
        a, b = dung(m, CFG[mid])
        ghi(p, m)
        print(f'{mid:16s} đồ hội {a} → {b}, ẩn ô {m["prop_hide"]}')


if __name__ == '__main__':
    main()
