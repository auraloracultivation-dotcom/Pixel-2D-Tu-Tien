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
            out.append(a[round(r * h / rows):round((r + 1) * h / rows), round(c * w / cols):round((c + 1) * w / cols)])
    return out


def _key(a):
    """Bỏ nền hồng tím theo màu (cả chỗ kẹp giữa chân mà loang từ mép không tới) và vệt bóng tím sẫm dưới chân."""
    c = a[:, :, :3].astype(int); r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    mag = (r - g > 90) & (b - g > 90) & (np.abs(r - b) < 90)
    shadow = (b >= r - 10) & (g < r) & (b - g > 25) & (r < 170) & (np.arange(a.shape[0])[:, None] > a.shape[0] * 0.55)
    out = a.copy(); out[:, :, 3] = np.where(mag | shadow, 0, a[:, :, 3])
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


def _act_frames(cells, h, colors):
    """Thu về cao h điểm ảnh bằng trung bình vùng (giữ mắt, mặt rõ hơn màu đa số khi ảnh gốc to), gom màu chung, viền mực."""
    boxes = [_bbox(c) for c in cells]
    k = (h - 2) / max(b[3] - b[1] for b in boxes)
    outs = []
    for c, b in zip(cells, boxes):
        part = Image.fromarray(np.ascontiguousarray(c[b[1]:b[3], b[0]:b[2]])).convert('RGBa')
        a = np.array(part.resize((max(1, round((b[2] - b[0]) * k)), max(1, round((b[3] - b[1]) * k))), Image.BOX).convert('RGBA'))
        a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0); outs.append(a)
    W, H = max(o.shape[1] for o in outs), max(o.shape[0] for o in outs)
    fr = []
    for o in outs:
        f = np.zeros((H, W, 4), np.uint8); x0 = (W - o.shape[1]) // 2
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
        if sid.startswith('_') or not (AI / s['src']).exists():
            continue
        old = manifest.get(sid) or ({'w': 1, 'h': 1, 'frames': 6, 'anchor': [0, 0]} if s.get('acts') else None)   # hình mới chưa có bản code (bạn đồng hành)
        if not old:
            print('bỏ qua (không có hình code cùng id):', sid); continue
        if s.get('acts') and s.get('h'):   # ảnh gốc đầy đủ (chủ dự án gửi): bỏ nền theo màu, tự tách khung, thu về cao h
            a = np.array(Image.open(AI / s['src']).convert('RGBA'))
            cells = _split(_key(a) if s.get('key') == 'magenta' else remove_bg(a, 60))
            frames = _act_frames(cells, s['h'], s.get('colors', 14))
            h, w = frames[0].shape[:2]
            save(sid, [_canvas(f) for f in frames], (w // 2, h - 2), s.get('note', sid) + ' · ảnh AI 6 động tác')
            n += 1; continue
        cells = _cells(AI / s['src'], s.get('grid', [1, 1]))
        cells = [cells[i] for i in s.get('cells', range(len(cells)))]
        cells = [c for c in cells if _bbox(c)]
        if not cells:
            print('ảnh trống:', sid); continue
        sc = s.get('scale', 1.0)
        tw, th = round(old['w'] * sc), round(old['h'] * sc)
        mode = s.get('mode', 'pixel')
        if mode == 'rot':
            import flyweapons as FWP
            base = _pixel_frames(cells[:1], tw, round(th * 0.45), s.get('colors', 12))[0]
            fr, side = FWP.rotations(_canvas(base))
            save(sid, fr, (side // 2, side // 2), (old.get('note') or '') + ' · ảnh Canva')
            n += 1; continue
        if s.get('acts'):   # 6 khung động tác (src/render/draw-acts.js): giữ đủ, cỡ theo "box" [rộng, cao], neo giữa chân
            bw, bh = s.get('box', [tw, th])
            frames = _pixel_frames(cells, bw, bh, s.get('colors', 14))
            h, w = frames[0].shape[:2]
            save(sid, [_canvas(f) for f in frames], (w // 2, h - 2), (old.get('note') or '') + ' · ảnh Canva 6 động tác')
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
