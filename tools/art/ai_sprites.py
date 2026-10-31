"""Thay hình vẽ code bằng ảnh Canva (chủ dự án chốt 28/10/2026: mọi linh thú, thú cưỡi, NPC, quái, boss, chiêu, hiệu ứng,
vũ khí, đồ dùng ảnh Canva; Claude viết lệnh, duyệt, đưa vào game).

Khai trong tools/art/nguon/ai/sheets.json: { "<id hình>": {"src": "<file trong nguon/ai/>", "grid": [cột, hàng],
  "cells": [ô theo thứ tự đọc, dùng cho từng khung], "mode": "pixel" | "glow" | "rot", "scale": 1.0, "bob": false} }.
- Ảnh gốc đã xoá nền (công cụ xoá nền Canva; hết lượt thì ai_import.remove_bg). Mỗi ô của lưới là một khung.
- Cỡ và điểm neo lấy theo hình code cùng id (khung tối đa = cỡ cũ × scale, neo giữ đúng tỉ lệ), nên game không phải sửa.
- Số khung đúng bằng số khung hình code (lặp lại các ô nếu thiếu). bob: chỉ 1 ô thì khung lẻ nhún 1 điểm ảnh.
- pixel: thu về điểm ảnh thật bằng màu đa số, gom màu chung cả tấm, viền mực. glow (hiệu ứng ánh sáng): thu mượt, giữ alpha, không viền.
- rot (vũ khí bay): 1 ô vũ khí nằm ngang mũi chĩa phải, xoay sẵn đủ hướng bằng flyweapons.rotations.
Gọi apply(MANIFEST, save) ở cuối build.py."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas
from ai_import import remove_bg, quantize, outline, shrink

AI = Path(__file__).resolve().parent / 'nguon' / 'ai'
HD = round(24 / 45, 4)   # đơn vị bản đồ trên một điểm ảnh, như nhân vật chính (data/heroes.json: thân 45 điểm ảnh = 24 đơn vị)


def _canvas(a):
    c = Canvas(a.shape[1], a.shape[0])
    c.a = np.ascontiguousarray(a, dtype=np.uint8)
    return c


def _cells(src, grid):
    a = np.array(Image.open(src).convert('RGBA'))
    if a[:, :, 3].min() == 255:   # chưa xoá nền: dùng công cụ của Claude
        a = remove_bg(a, 60)
    a[a[:, :, 3] < 96] = 0
    cols, rows = grid
    h, w = a.shape[:2]
    out = []
    for r in range(rows):
        for c in range(cols):
            out.append(_trim(a[round(r * h / rows):round((r + 1) * h / rows), round(c * w / cols):round((c + 1) * w / cols)].copy()))
    return out


def _trim(c):
    """Bỏ mảnh rời chạm mép trái/phải ô (phần hình của ô bên cạnh lấn sang khi cắt lưới đều)."""
    from scipy import ndimage
    lab, n = ndimage.label(c[:, :, 3] > 0)
    if n < 2:
        return c
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    big = 1 + int(np.argmax(sizes))
    for i in range(1, n + 1):
        if i == big: continue
        xs = np.nonzero((lab == i).any(axis=0))[0]
        if xs.min() <= 1 or xs.max() >= c.shape[1] - 2:
            c[lab == i] = 0
    return c


def _key(a, shadow=True):
    """Bỏ nền hồng tím theo màu (cả chỗ kẹp giữa chân mà loang từ mép không tới) và vệt bóng tím sẫm dưới chân.
    shadow=False: giữ màu tím sẫm (linh thú bóng tối, cánh dơi tím) vì dễ bị nhầm là bóng."""
    c = a[:, :, :3].astype(int); r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    mag = (r - g > 90) & (b - g > 90) & (np.abs(r - b) < 90)
    shadow = shadow & (b >= r - 10) & (g < r) & (b - g > 25) & (r < 170) & (np.arange(a.shape[0])[:, None] > a.shape[0] * 0.55)
    out = a.copy(); out[:, :, 3] = np.where(mag | shadow, 0, a[:, :, 3])
    return out


def _defringe(c):
    """Khử ám hồng (nền #FF00FF lẫn vào vệt sáng vàng, trắng): điểm có đỏ và lam cùng cao hơn lục rõ rệt thì kéo đỏ, lam về gần lục."""
    a = c.copy(); r, g, b = (a[:, :, i].astype(int) for i in range(3))
    m = (a[:, :, 3] > 0) & (r - g > 30) & (b - g > 30)
    a[m, 0] = np.clip(g[m] + (r[m] - g[m]) // 3 + 30, 0, 255); a[m, 2] = np.clip(g[m] + (b[m] - g[m]) // 5, 0, 255)
    return a


def _key_near(a):
    """Bỏ nền hồng tím chặt hơn _key: chỉ màu gần màu nền (lấy ở góc ảnh) hoặc nền pha mực ở mép (đỏ = lam, không có lục).
    Dùng cho nhân vật mặc đồ tím, quầng tím (Mặc Ảnh) mà _key ăn mất."""
    c = a[:, :, :3].astype(int); bg = np.median(np.concatenate([c[:4, :4].reshape(-1, 3), c[-4:, -4:].reshape(-1, 3)]), axis=0)
    near = np.sqrt(((c - bg) ** 2).sum(axis=2)) < 80
    r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    fringe = (np.abs(r - b) < 28) & (g < 0.12 * r) & (r > 90)
    out = a.copy(); out[:, :, 3] = np.where(near | fringe, 0, a[:, :, 3])
    return out


def _split(a, gap=8):
    """Tách khung theo cột trống (ảnh một hàng, khung cách nhau)."""
    cols = np.nonzero((a[:, :, 3] > 0).any(axis=0))[0]
    segs, s, p = [], cols[0], cols[0]
    for c in cols[1:]:
        if c - p > gap: segs.append((s, p + 1)); s = c
        p = c
    segs.append((s, p + 1))
    return [a[:, x0:x1] for x0, x1 in segs]


def _split_rows(a, gap=8, per=None):
    """Ảnh nhiều hàng (Canva khung vuông: 3 dáng trên, 2 dáng dưới): tách hàng theo dòng trống rồi tách khung từng hàng."""
    rows = np.nonzero((a[:, :, 3] > 0).any(axis=1))[0]
    bands, s, p = [], rows[0], rows[0]
    for r in rows[1:]:
        if r - p > gap: bands.append((s, p + 1)); s = r
        p = r
    bands.append((s, p + 1))
    if per and len(bands) != len(per):   # vũ khí giơ cao chạm hàng trên: cắt hàng ở dòng thưa nhất quanh mốc chia đều
        dens = (a[:, :, 3] > 0).sum(axis=1); y0, y1 = rows[0], rows[-1] + 1; h = (y1 - y0) / len(per)
        cuts = [y0] + [int(y0 + h * (i - 0.25)) + int(np.argmin(dens[int(y0 + h * (i - 0.25)):int(y0 + h * (i + 0.25))])) for i in range(1, len(per))] + [y1]
        bands = [(cuts[i], cuts[i + 1]) for i in range(len(per))]
    out = []
    for i, (y0, y1) in enumerate(bands):
        segs = [c for c in _split(a[y0:y1], gap) if _bbox(c) and (_bbox(c)[3] - _bbox(c)[1]) > (y1 - y0) * 0.4]   # bỏ mảnh vụn
        n = per[i] if per and i < len(per) else 0
        if n and len(segs) != n: segs = _cut(a[y0:y1], n)   # dáng chạm nhau (đuôi, dây leo): cắt ở khe thưa nhất
        out += segs
    return out


def _cut(band, n):
    """Chia một hàng thành n khung: chỗ cắt là cột ít điểm ảnh đặc nhất quanh mỗi mốc chia đều."""
    dens = (band[:, :, 3] > 0).sum(axis=0)
    xs = np.nonzero(dens)[0]; x0, x1 = xs[0], xs[-1] + 1; w = (x1 - x0) / n
    cuts = [x0]
    for i in range(1, n):
        lo, hi = int(x0 + w * (i - 0.3)), int(x0 + w * (i + 0.3))
        cuts.append(lo + int(np.argmin(dens[lo:hi])))
    cuts.append(x1)
    return [band[:, cuts[i]:cuts[i + 1]].copy() for i in range(n)]


def _grid(a, grid):
    """Chia đều theo lưới [cột, hàng] (ảnh đã xếp mỗi khung một ô, hiệu ứng rời như sóng âm, lấp lánh vẫn ở cùng ô)."""
    cols, rows = grid
    h, w = a.shape[:2]
    out = [a[round(r * h / rows):round((r + 1) * h / rows), round(c * w / cols):round((c + 1) * w / cols)].copy()
           for r in range(rows) for c in range(cols)]
    return [c for c in out if _bbox(c)]


def _lift(f):
    g = np.zeros_like(f); g[:-1] = f[1:]
    return g


def _feet(o):
    """Cột giữa phần chân (40% dưới của hình) theo điểm ảnh đặc."""
    m = o[int(o.shape[0] * 0.6):, :, 3] > 0
    xs = np.nonzero(m)[1]
    return float(xs.mean()) if len(xs) else o.shape[1] / 2


def _act_frames(cells, h, colors, align='center', fit=None):
    """Thu về cao h điểm ảnh bằng trung bình vùng (giữ mắt, mặt rõ hơn màu đa số khi ảnh gốc to), gom màu chung, viền mực."""
    boxes = [_bbox(c) for c in cells]
    k = (h - 2) / ((boxes[0][3] - boxes[0][1]) if fit == 'idle' else max(b[3] - b[1] for b in boxes))   # fit idle: cao h tính theo dáng đứng, dáng chồm, giơ vũ khí được cao hơn
    outs = []
    for c, b in zip(cells, boxes):
        part = Image.fromarray(np.ascontiguousarray(c[b[1]:b[3], b[0]:b[2]])).convert('RGBa')
        a = np.array(part.resize((max(1, round((b[2] - b[0]) * k)), max(1, round((b[3] - b[1]) * k))), Image.BOX).convert('RGBA'))
        a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0); outs.append(a)
    H = max(o.shape[0] for o in outs)
    if align == 'feet':   # căn theo chân: khung đánh có cầu lửa, vệt chém thì người không bị đẩy lệch
        feet = [_feet(o) for o in outs]
        half = int(np.ceil(max(max(c, o.shape[1] - c) for c, o in zip(feet, outs))))
        W, xs = 2 * half, [int(round(half - c)) for c in feet]
    else:
        W = max(o.shape[1] for o in outs); xs = [(W - o.shape[1]) // 2 for o in outs]
    fr = []
    for o, x0 in zip(outs, xs):
        f = np.zeros((H, W, 4), np.uint8)
        f[H - o.shape[0]:, x0:x0 + o.shape[1]] = o; fr.append(f)
    strip = quantize(np.concatenate(fr, axis=1), colors)
    return [outline(strip[:, i * W:(i + 1) * W]) for i in range(len(fr))]


def _bbox(a):
    ys, xs = np.nonzero(a[:, :, 3] > 0)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1) if len(ys) else None


def _pixel_frames(cells, tw, th, colors):
    boxes = [_bbox(c) for c in cells]
    mw = max(b[2] - b[0] for b in boxes); mh = max(b[3] - b[1] for b in boxes)
    k = min((tw - 2) / mw, (th - 2) / mh)
    W, H = max(1, round(mw * k)), max(1, round(mh * k))
    outs = []
    for c, b in zip(cells, boxes):
        cw, ch = b[2] - b[0], b[3] - b[1]
        part = shrink(c[b[1]:b[3], b[0]:b[2]], max(1, round(ch * k)))
        f = np.zeros((H, W, 4), np.uint8)
        ph, pw = part.shape[:2]
        x0 = (W - pw) // 2; y0 = H - ph                    # chân chạm đáy, giữa theo chiều ngang
        f[y0:y0 + ph, max(0, x0):max(0, x0) + min(pw, W)] = part[:, :min(pw, W)]
        outs.append(f)
    strip = quantize(np.concatenate(outs, axis=1), colors)   # gom màu chung cả tấm cho các khung khỏi lệch màu
    return [outline(strip[:, i * W:(i + 1) * W]) for i in range(len(outs))]


def _glow_frames(cells, tw, th):
    boxes = [b for b in (_bbox(c) for c in cells) if b]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes); x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    k = min(tw / (x1 - x0), th / (y1 - y0))
    W, H = max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))
    outs = []
    for c in cells:
        im = Image.fromarray(np.ascontiguousarray(c[y0:y1, x0:x1])).convert('RGBa')   # nhân alpha trước khi thu cho mép sáng không viền đen
        outs.append(np.array(im.resize((W, H), Image.LANCZOS).convert('RGBA')))
    return outs


def apply(manifest, save):
    spec_file = AI / 'sheets.json'
    if not spec_file.exists():
        return 0
    spec = json.loads(spec_file.read_text(encoding='utf-8'))
    n = 0
    for sid, s in spec.items():
        if sid.startswith('_'): continue
        if s.get('like'):   # linh thú theo quái (chủ dự án 30/10): lấy nguyên khai của quái 6 động tác, thu cao còn k lần (24–34 điểm ảnh)
            b = spec[s['like']]
            s = {**b, **{k: v for k, v in s.items() if k not in ('like', 'k')}, 'h': max(24, min(34, round(b['h'] * s.get('k', 0.7))))}
        if not (AI / s['src']).exists():
            continue
        old = manifest.get(sid) or ({'w': 1, 'h': 1, 'frames': 6, 'anchor': [0, 0]} if s.get('acts') else None)   # hình mới chưa có bản code (bạn đồng hành)
        if s.get('size'):   # cỡ, neo khai thẳng (hình hiệu ứng mới, hoặc đổi hẳn dáng so với bản code): số khung = số ô
            w0, h0 = s['size']
            old = {'w': w0, 'h': h0, 'frames': 0, 'anchor': s.get('anchor', [w0 // 2, h0 // 2]), 'note': s.get('note', '')}
        if not old:
            print('bỏ qua (không có hình code cùng id):', sid); continue
        if s.get('acts') and s.get('h'):   # ảnh gốc đầy đủ (chủ dự án gửi): bỏ nền theo màu, tự tách khung, thu về cao h
            a = np.array(Image.open(AI / s['src']).convert('RGBA'))
            a = _key(a, s.get('shadow', True)) if s.get('key') == 'magenta' else _key_near(a) if s.get('key') == 'near' else remove_bg(a, 60)
            cells = _grid(a, s['grid']) if s.get('grid') else _split_rows(a, per=s['rows'] if isinstance(s['rows'], list) else None) if s.get('rows') else _split(a)
            if s.get('defringe'): cells = [_defringe(c) for c in cells]   # bụi, vệt sáng bị ám hồng của nền
            if s.get('down') in ('rot', 'flip'):   # ảnh không có dáng ngã: khung 5 = dáng đứng nằm xuống (người xoay 90°, thú 4 chân lật ngửa)
                stand = cells[s['order'][0]] if s.get('order') else cells[0]   # dáng đứng theo order (linh thú lấy ô giữa tấm quái)
                lie = np.rot90(_trim(stand), 1) if s['down'] == 'rot' else np.flipud(_trim(stand))
                cells = cells + [np.ascontiguousarray(lie)]
            if s.get('order'): cells = [cells[i] for i in s['order']]   # ô ảnh gốc → khung: 0 đứng, 1–2 đi, 3 lấy đà, 4 đánh, 5 ngã, 6 tung chiêu
            frames = _act_frames(cells, s['h'], s.get('colors', 14), s.get('align', 'center'), s.get('fit'))
            if s.get('bright'):   # ảnh gốc quá tối (Đại Ma Thần đen tím): nâng sáng, giữ viền mực
                for f in frames: f[:, :, :3] = np.clip(f[:, :, :3].astype(float) * s['bright'] + 6, 0, 255).astype(np.uint8)
            if s.get('hop'): frames[2] = _lift(frames[2])   # ảnh chỉ 1 dáng: bước 2 nhảy lên 1 điểm ảnh cho thấy đang đi
            h, w = frames[0].shape[:2]
            save(sid, [_canvas(f) for f in frames], (w // 2, h - 2), s.get('note', sid) + f' · ảnh chủ dự án {len(frames)} khung')
            manifest[sid]['scale'] = HD
            if s.get('walk'): manifest[sid]['walk'] = s['walk']
            if sid.startswith(('mob.', 'rival.')): manifest[sid]['acts'] = True   # 7 khung: đứng, bước ×2, lấy đà, đánh, ngã, chiêu (draw-mob-sprite.js)
            n += 1; continue
        cells = _cells(AI / s['src'], s.get('grid', [1, 1]))
        cells = [cells[i] for i in s.get('cells', range(len(cells)))]
        cells = [c for c in cells if _bbox(c)]
        if not cells:
            print('ảnh trống:', sid); continue
        if s.get('size'): old['frames'] = len(cells)
        sc = s.get('scale', 1.0)
        tw, th = round(old['w'] * sc), round(old['h'] * sc)
        mode = s.get('mode', 'pixel')
        if mode == 'rot':
            import flyweapons as FWP
            base = _pixel_frames(cells[:1], tw, round(th * s.get('thick', 0.45)), s.get('colors', 12))[0]   # thick: vũ khí bè (quạt, đàn, cung) cho cao hơn
            fr, side = FWP.rotations(_canvas(base))
            save(sid, fr, (side // 2, side // 2), (old.get('note') or '') + ' · ảnh Canva')
            n += 1; continue
        if s.get('defringe'): cells = [_defringe(c) for c in cells]   # vệt vàng, trắng bị ám hồng của nền
        if s.get('hd') or s.get('acts'):   # vẽ gấp đôi độ phân giải (mật độ nhân vật chính), game thu theo scale; giữ đủ mọi ô làm khung
            frames = _act_frames(cells, s.get('h') or round(th / HD), s.get('colors', 14), s.get('align', 'center'))   # align feet: dáng đánh có vệt lửa, vệt chém thì thân không lệch
            h, w = frames[0].shape[:2]
            save(sid, [_canvas(f) for f in frames], (w // 2, h - 2), (old.get('note') or '') + ' · ảnh Canva')
            manifest[sid]['scale'] = HD
            if sid.startswith(('mob.', 'rival.')) and len(frames) == 2: manifest[sid]['atk'] = True   # khung 2 là tư thế ra đòn
            n += 1; continue
        frames = _glow_frames(cells, tw, th) if mode == 'glow' else _pixel_frames(cells, tw, th, s.get('colors', 14))
        if s.get('bob') and len(frames) == 1:
            a = frames[0]; b = np.zeros_like(a); b[1:] = a[:-1]; b[-1] = np.where(b[-1, :, 3:4] > 0, b[-1], a[-1])
            frames = [a, b]
        frames = [frames[i % len(frames)] for i in range(old['frames'])]
        h, w = frames[0].shape[:2]
        ax, ay = old['anchor']
        anchor = (round(ax / old['w'] * w), round(ay / old['h'] * h))
        save(sid, [_canvas(f) for f in frames], anchor, (old.get('note') or '') + ' · ảnh Canva')
        n += 1
    return n
