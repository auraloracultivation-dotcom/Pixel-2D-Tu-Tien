"""Đồ cũ thành khôi lỗi và NPC (chủ dự án 17/11/2026 00:1x: "thời trang và nhân vật cũ bị bỏ biến thành khôi lỗi và NPC bán hàng hoặc
gắn liền với công trình trang trí"; 00:2x duyệt cách chia: 20 bộ thời trang cũ thành 20 khôi lỗi, bản giới tính còn lại của bộ thành NPC bán
hàng, hình còn dư thành NPC đứng ở công trình). Bảng ở data/do-cu.json; công cụ này ghi vào:
  - data/companions.json list kl-<bộ> (khôi lỗi đánh xa), data/npcs.json kl-<bộ> (tên, màu, lời) và dc-<hình> (NPC bán hàng, NPC công trình),
  - data/pets.json shop.puppets (giá khôi lỗi, chủ dự án duyệt), data/shop.json npc_goods (NPC bán hàng bán món đang có, cùng giá),
  - data/maps/<bản đồ>.json npcs (chỗ đứng; game.js addNpc dời sang ô trống gần nhất nếu vướng),
  - data/art.json comp.kl-<bộ>, npc.dc-<hình>: dùng chung tấm 7 động tác hero.y-<bộ>-<giới>; bộ có hình riêng (hero.nam, hero.nu, tny,
    huyet-nguyet, tu-linh, ly-hoa: tấm nhiều khung) thì dựng tấm 7 động tác assets/art/kl-<bộ>.png cao 44 điểm (đứng, 2 bước, lấy đà, đánh,
    đứng, đứng).
Chạy lại được (ghi đè mục cũ cùng mã): python3 -I tools/do_cu.py"""
import hashlib, json, os
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(R, p), encoding='utf-8'))


def save(p, obj, indent=1):
    open(os.path.join(R, p), 'w', encoding='utf-8').write(json.dumps(obj, ensure_ascii=False, indent=indent) + '\n')


def span(text, key, start=0):
    """Vị trí mở / đóng của giá trị object hay mảng sau "key": (đếm ngoặc, bỏ qua trong chuỗi)."""
    i = text.index(json.dumps(key, ensure_ascii=False) + ':', start); i = min(j for j in (text.find('{', i), text.find('[', i)) if j >= 0)
    depth, q, esc = 0, False, False
    for j in range(i, len(text)):
        c = text[j]
        if q:
            esc = (c == '\\') and not esc if c == '\\' else False if esc else esc
            if c == '"' and not esc: q = False
            continue
        if c == '"': q = True
        elif c in '{[': depth += 1
        elif c in '}]':
            depth -= 1
            if depth == 0: return i, j
    raise ValueError(key)


def insert(text, key, items, start=0):
    """Chèn các cặp (khoá, giá trị) vào object "key" (hoặc giá trị vào mảng) ngay trước dấu đóng, giữ nguyên cách viết của tệp;
    khoá đã có thì bỏ qua (chạy lại không nhân đôi)."""
    i, j = span(text, key, start); body = text[i + 1:j]; arr = text[i] == '['
    multi = '\n' in body; ind = (body.rstrip().rsplit('\n', 1)[-1][:len(body.rstrip().rsplit('\n', 1)[-1]) - len(body.rstrip().rsplit('\n', 1)[-1].lstrip())]) if multi else ''
    add = []
    for k, v in items:
        enc = json.dumps(v, ensure_ascii=False)
        if arr:
            if json.dumps(k, ensure_ascii=False) in body: continue
            add.append(enc)
        else:
            if json.dumps(k, ensure_ascii=False) + ':' in body: continue
            add.append(json.dumps(k, ensure_ascii=False) + ': ' + enc)
    if not add: return text
    core = body.rstrip(); tail = body[len(core):]
    sep = (',\n' + ind) if multi else ', '
    new = core + (sep if core.strip() else ('\n' + ind if multi else '')) + sep.join(add) + tail
    return text[:i + 1] + new + text[j:]


def edit(path, fn):
    t = open(os.path.join(R, path), encoding='utf-8').read(); t2 = fn(t); json.loads(t2)
    if t2 != t: open(os.path.join(R, path), 'w', encoding='utf-8').write(t2)


def act_strip(art, look, out):
    """Tấm nhiều khung (anims) → tấm 7 động tác cao 44 điểm, thu nhỏ giữ nét (LANCZOS rồi cắt trong suốt)."""
    s = art[look['sprite']]; im = Image.open(os.path.join(R, s['file'])).convert('RGBA')
    A = look['anims']; atk = A[look['attacks'][0]]
    pick = [A['idle'][0], A['walk'][2], A['walk'][6 % len(A['walk'])], atk[len(atk) // 3], atk[(2 * len(atk)) // 3], A['idle'][0], A['idle'][len(A['idle']) // 2]]
    k = 44 / look['body']; W, H = max(1, round(s['w'] * k)), max(1, round(s['h'] * k))
    strip = Image.new('RGBA', (W * 7, H), (0, 0, 0, 0))
    for i, f in enumerate(pick):
        fr = im.crop((f * s['w'], 0, (f + 1) * s['w'], s['h'])).resize((W, H), Image.LANCZOS)
        a = fr.getchannel('A').point(lambda v: 255 if v >= 110 else 0); fr.putalpha(a)
        strip.paste(fr, (i * W, 0))
    strip.save(os.path.join(R, out), optimize=True)
    v = hashlib.sha256(open(os.path.join(R, out), 'rb').read()).hexdigest()[:8]
    return {'file': out, 'v': v, 'w': W, 'h': H, 'frames': 7, 'anchor': [round(s['anchor'][0] * k), round(s['anchor'][1] * k)], 'scale': 0.5333}


def main():
    D = J('data/do-cu.json'); S = J('data/shop.json'); A = J('data/art.json'); art = A['sprites']
    comps, npcs, gia, goods, maps = [], [], [], [], {}
    for k, p in D['khoi_loi'].items():
        kid = 'kl-' + k
        comps.append((kid, {'desc': p['desc'], 'mult': p['mult'], 'cd': p['cd'], 'range': p['range'], 'melee': False, 'color': p['color'], 'skill': p['skill'], 'join': p['join'], 'tu_do_cu': k}))
        npcs.append((kid, {'name': p['name'], 'color': p['color'], 'hair': p.get('hair', '#2a2a3a'), 'lines': p['lines']}))
        gia.append((kid, p['gia']))
        art['comp.' + kid] = ({**act_strip(art, D['looks'][p['look']], f'assets/art/kl-{k}.png'), 'note': f'Khôi lỗi {p["name"]} (đồ cũ, tools/do_cu.py)'} if p.get('look')
                             else {**art[p['hinh']], 'note': f'Khôi lỗi {p["name"]}: dùng chung {p["hinh"]} (đồ cũ, tools/do_cu.py)'})
    for k, n in D['npc'].items():
        nid = 'dc-' + k
        npcs.append((nid, {'name': n['name'], 'color': n['color'], 'hair': n.get('hair', '#2a2a3a'), 'lines': n['lines']}))
        art['npc.' + nid] = {**art[n['hinh']], 'note': f'NPC {n["name"]}: dùng chung {n["hinh"]} (đồ cũ, tools/do_cu.py)'}
        if n.get('ban'): g = S['npc_goods'][n['ban']]; goods.append((nid, {**g, 'line': n.get('ban_line', g['line'])}))
        if n.get('map'): maps.setdefault(n['map'], []).append((nid, {'id': nid, 'at': n['at']}))   # NPC bán trùng đồ đã thay (20/11/2026): không đặt lên bản đồ
    edit('data/companions.json', lambda t: insert(t, 'list', comps))
    edit('data/npcs.json', lambda t: t[:t.rstrip().rindex('}')].rstrip() + ''.join(',\n ' + json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False) for k, v in npcs if json.dumps(k, ensure_ascii=False) + ':' not in t) + '\n}\n')
    edit('data/pets.json', lambda t: insert(t, 'puppets', gia))
    edit('data/shop.json', lambda t: insert(t, 'npc_goods', goods))
    for mid, L in maps.items(): edit(f'data/maps/{mid}.json', lambda t, L=L: insert(t, 'npcs', L))
    A['sprites'] = dict(sorted(art.items()))
    save('data/art.json', A)
    print(len(D['khoi_loi']), 'khôi lỗi,', len(D['npc']), 'NPC,', len(maps), 'bản đồ')


if __name__ == '__main__':
    main()
