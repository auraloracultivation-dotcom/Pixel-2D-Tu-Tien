"""Vạn Kiếm Thiên Lâm (chủ dự án 10/11/2026 12:35, ba tấm ảnh GPT ở nguon/ai/kiem/):
  kiem.png 8×4 = 32 thanh kiếm sạch (gọi kiếm bay về, cắm đất), kiem-khi.png 8×3 = 24 kiếm quấn kiếm khí (tụ kiếm khí),
  kiem-dam.png 8×3 = 24 kiếm bốc lửa linh khí mũi chúc xuống (kiếm đâm xuống đất).
Nền ba tấm là màu loang, không trong suốt:
  - kiem: nền mượt, kiếm có viền mực → lấy chỗ khác nền (lọc trung vị lớn) + chỗ đổi sáng gắt, lấp lỗ, mỗi ô giữ mảng lớn nhất.
  - kiem-khi, kiem-dam: kiếm và quầng sáng hoà vào nền → độ trong = phần sáng hơn nền tối quanh khe giữa các ô (thu nhỏ để tính nhanh),
    mũ 1,5 cho quầng mờ bớt, nhân mặt nạ bầu dục mỗi ô để mép ô không lộ khung. Vẽ trong game bằng chế độ cộng sáng.
Thu về 1/3 (vẽ mượt trong game). Ghép màu: mỗi thanh kiếm sạch tìm thanh kiếm khí và kiếm đâm cùng sắc gần nhất → data/kiem-vu.json.
Dựng: python3 -I tools/art/ui_kit_only.py."""
import json
from pathlib import Path
import colorsys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from px import Canvas

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'kiem'
DATA = Path(__file__).resolve().parents[2] / 'data' / 'kiem-vu.json'
K = 3   # thu nhỏ


def _clean(a):
    rgb = a[:, :, :3].astype(float); L = rgb.mean(2)
    bg = np.stack([nd.median_filter(rgb[:, :, c], size=41) for c in range(3)], 2)
    m = (np.abs(rgb - bg).max(2) > 38) | (np.hypot(nd.sobel(L, 0), nd.sobel(L, 1)) > 120)
    m = nd.binary_opening(nd.binary_fill_holes(nd.binary_closing(m, iterations=2)), iterations=1)
    out = np.zeros(a.shape[:2] + (4,), np.uint8); out[:, :, :3] = rgb; out[:, :, 3] = m * 255
    return out


def _glow(a):
    im = Image.fromarray(a[:, :, :3]); rgb = a[:, :, :3].astype(float); L = rgb.max(2); H, W = L.shape
    s = np.array(im.resize((W // 8, H // 8), Image.BOX)).astype(float).max(2)
    lb = nd.gaussian_filter(nd.minimum_filter(s, size=(13, 9)), 4)
    Lb = np.array(Image.fromarray(lb.astype(np.float32)).resize((W, H), Image.BILINEAR))
    r = np.clip((L - Lb * 1.05) / np.maximum(255 - Lb, 1), 0, 1) ** 1.5
    cw, ch = W / 8, H / 3; yy, xx = np.mgrid[0:H, 0:W]; u = ((xx % cw) / cw - 0.5) * 2; v = ((yy % ch) / ch - 0.5) * 2
    mask = np.clip((1 - np.sqrt((u / 0.98) ** 2 + (v / 1.02) ** 2)) * 3, 0, 1)
    out = np.zeros((H, W, 4)); out[:, :, :3] = rgb; out[:, :, 3] = np.clip(r * mask * 1.2, 0, 1) * 255
    return out.astype(np.uint8)


def _cells(a, cols, rows, solid):
    H, W = a.shape[:2]; cw, ch = W // cols, H // rows; out = []
    for j in range(rows):
        for i in range(cols):
            c = a[j * ch:(j + 1) * ch, i * cw:(i + 1) * cw].copy()
            if solid:   # giữ mảng lớn nhất (thanh kiếm), bỏ vụn
                lab, n = nd.label(c[:, :, 3] > 0)
                if n > 1:
                    sz = nd.sum(np.ones_like(lab), lab, range(1, n + 1)); c[lab != 1 + int(np.argmax(sz))] = 0
            out.append(c)
    return out


def _hue(c):
    rgb = c[:, :, :3].astype(float) / 255; w = c[:, :, 3].astype(float) / 255
    mx, mn = rgb.max(2), rgb.min(2); sat = (mx - mn) * w * mx
    if sat.sum() < 1: return 0.0, 0.0
    hsv = [colorsys.rgb_to_hsv(*rgb[y, x]) for y, x in zip(*np.nonzero(sat > np.percentile(sat, 85)))]
    h = np.array([q[0] for q in hsv]); ang = np.angle(np.exp(2j * np.pi * h).mean()) / (2 * np.pi) % 1
    return float(ang), float(np.mean([q[1] for q in hsv]))


def _hd(a, b):
    d = abs(a - b) % 1
    return min(d, 1 - d)


def build(save):
    sets = {}
    for name, f, cols, rows, solid in [('vfx.vk-kiem', 'kiem.png', 8, 4, True), ('vfx.vk-khi', 'kiem-khi.png', 8, 3, False), ('vfx.vk-dam', 'kiem-dam.png', 8, 3, False)]:
        a = np.array(Image.open(SRC / f).convert('RGBA'))
        a = _clean(a) if solid else _glow(a)
        cells = _cells(a, cols, rows, solid)
        frames = []
        for c in cells:
            im = Image.fromarray(c).resize((c.shape[1] // K, c.shape[0] // K), Image.LANCZOS)
            cv = Canvas(im.width, im.height); cv.a = np.array(im); frames.append(cv)
        w, h = frames[0].w, frames[0].h
        save(name, frames, (w // 2, h // 2), f'Vạn Kiếm Quy Tông: {f} ({len(frames)} kiếm, tâm ô làm neo)')
        sets[name] = [_hue(c) for c in cells]
    pick = lambda hs, pool: min(range(len(pool)), key=lambda j: _hd(hs[0], pool[j][0]) + 0.4 * abs(hs[1] - pool[j][1]) + (0.5 if pool[j][1] < 0.25 else 0))
    pairs = [[pick(h, sets['vfx.vk-khi']), pick(h, sets['vfx.vk-dam'])] for h in sets['vfx.vk-kiem']]
    DATA.write_text(json.dumps({'_note': 'Sinh tự động bởi tools/art/vfx_kiem.py, đừng sửa tay: mỗi thanh kiếm sạch (vfx.vk-kiem khung i) → [khung vfx.vk-khi, khung vfx.vk-dam] cùng sắc. Chỉ số chiêu ở data/skills.json → van-kiem-thien.', 'pairs': pairs}, ensure_ascii=False) + '\n', encoding='utf-8')
    print('vfx.kiem*', len(pairs), 'cặp')
    return 3
