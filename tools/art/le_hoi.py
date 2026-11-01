"""Đồ lễ hội các tinh cầu (chủ dự án 02/11/2026: mọi tinh cầu là đêm trăng, tinh cầu nào cũng đang mở hội).
Nguồn: ảnh GPT bộ vật phẩm nền hồng tím ở nguon/ai/le-hoi/<tinh cầu>/bo-<số>.png (chủ dự án tạo, cho phép dùng).
Mỗi món cắt theo khung đã dò sẵn (lh_bo.py, toạ độ trên ảnh gốc 1536×1024), bỏ nền hồng, thu về điểm ảnh thật ở cỡ đúng
(cỡ ghi bằng đơn vị bản đồ, 1 ô = 16; người chuẩn cao 24), gom màu, viền mực. Hình lưu theo tỉ lệ "scale" như nhân vật (0,5333:
một điểm ảnh hình = 0,5333 đơn vị bản đồ) để nét đều với người. Đèn, pha lê, lửa, mặt nước dò tự động từ điểm ảnh sáng:
ghi "lights" (đèn hắt quầng, lập loè), "glints" (mặt nước lấp lánh), "flame" (miệng lò lửa) vào data/art.json để game vẽ hiệu
ứng bằng code (src/render/draw-hoi.js). Gọi từ build.py: le_hoi.build(save)."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from px import Canvas, MANIFEST
import ai_import as AI
from lh_bo import BO

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'le-hoi'
SC = 0.5333   # đơn vị bản đồ mỗi điểm ảnh hình (bằng nhân vật)


def _key(a):
    """Bỏ nền hồng tím (cả quầng tím nhạt quanh đèn): đỏ, lam cao, lục thấp hẳn."""
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    bg = (r > 150) & (b > 150) & (g < 130) & (g < r - 60) & (g < b - 60)
    # vùng hồng không thông ra mép tấm là nằm trong hình: đốm nhỏ tô bằng màu điểm hình gần nhất (kẻo thủng lỗ đen); vùng lớn mà màu
    # lệch xa màu nền (quầng tím của trận pháp, mái vải tím) là màu thật của hình, giữ nguyên; vùng lớn đúng màu nền (lỗ vòng cổng) bỏ
    lab, k = nd.label(bg)
    if k:
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        idx = np.arange(1, k + 1)
        size = nd.sum(np.ones_like(lab), lab, index=idx)
        col = a[:, :, :3].astype(float)
        bgc = np.median(col[lab == max(edge, key=lambda e: size[e - 1])], axis=0) if edge else np.array([250, 5, 250])
        dist = np.sqrt(((col - bgc) ** 2).sum(axis=2))
        mdist = nd.mean(dist, lab, index=idx)
        inner = np.array([i not in edge for i in idx])
        small = np.isin(lab, idx[inner & (size < 260)])
        keep = np.isin(lab, idx[inner & (size >= 260) & (mdist > 70)])
        if small.any():
            _, (iy, ix) = nd.distance_transform_edt(bg, return_indices=True)
            a = a.copy(); a[small] = a[iy[small], ix[small]]
        bg = bg & ~small & ~keep
    out = np.dstack([a[:, :, :3], np.where(bg, 0, 255).astype(np.uint8)])
    # mép ám hồng: điểm sát nền mà vẫn ngả hồng tím thì bỏ thêm hai vòng
    for _ in range(2):
        s = out[:, :, 3] > 0
        near = np.zeros_like(s)
        near[1:, :] |= ~s[:-1, :]; near[:-1, :] |= ~s[1:, :]; near[:, 1:] |= ~s[:, :-1]; near[:, :-1] |= ~s[:, 1:]
        pink = (r > 120) & (b > 120) & (g < r - 45) & (g < b - 45)
        out[near & s & pink, 3] = 0
    return out


def _crop(a):
    ys, xs = np.nonzero(a[:, :, 3] > 0)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def _shrink_w(a, tw):
    """Thu theo bề ngang tw điểm ảnh (giữ tỉ lệ), màu đa số từng ô như ai_import.shrink."""
    th = max(4, round(a.shape[0] * tw / a.shape[1]))
    return AI.shrink(a, th)


def _spots(a, test, gap, most):
    """Gom điểm ảnh thoả test thành cụm (lưới gap điểm), trả tâm các cụm to nhất (x, y trong hình)."""
    ys, xs = np.nonzero(test & (a[:, :, 3] > 0))
    cells = {}
    for y, x in zip(ys, xs):
        k = (x // gap, y // gap)
        cells.setdefault(k, []).append((x, y))
    best = sorted(cells.values(), key=len, reverse=True)
    return [[int(round(np.mean([p[0] for p in c]))), int(round(np.mean([p[1] for p in c])))] for c in best[:most] if len(c) >= 2]


def _merge(pts, d):
    """Gộp các điểm sáng gần nhau hơn d điểm ảnh (một chiếc đèn lồng chỉ một quầng)."""
    out = []
    for x, y, k in pts:
        for o in out:
            if o[2] == k and abs(o[0] - x) <= d and abs(o[1] - y) <= d:
                break
        else:
            out.append([x, y, k])
    return out


def _lights(a):
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    warm = (r > 225) & (g > 150) & (b < 170) & (r - b > 70)
    cold = (b > 215) & (g > 190) & (r < 215) & (b - r > 25)
    pink = (r > 215) & (b > 200) & (g < 190) & (g < r - 40)
    out = [[x, y, 'warm'] for x, y in _spots(a, warm, 9, 10)]
    out += [[x, y, 'cold'] for x, y in _spots(a, cold, 12, 3)]
    out += [[x, y, 'pink'] for x, y in _spots(a, pink, 12, 2)]
    return _merge(out, max(10, a.shape[1] // 14))


def _glints(a):
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    water = (b > 120) & (r < 90) & (b > g + 20)
    ys, xs = np.nonzero(water & (a[:, :, 3] > 0))
    if len(ys) < 30:
        return []
    rng = np.random.default_rng(len(ys))
    pick = rng.choice(len(ys), size=min(24, len(ys) // 12), replace=False)
    return [[int(xs[i]), int(ys[i])] for i in pick]


def _flame(a):
    """Miệng lò lửa: cụm sáng cao nhất (lửa nằm trên bát)."""
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    bright = (r + g + b > 560) & (a[:, :, 3] > 0)
    ys, xs = np.nonzero(bright)
    if not len(ys):
        return None
    top = ys < ys.min() + max(3, (ys.max() - ys.min()) // 2)
    return [int(round(xs[top].mean())), int(round(ys[top].mean()))]


def _make(cell, units, by, colors):
    px_ = max(6, round(units / SC))
    if by == 'h':
        a = AI.shrink(cell, px_ - 2)
    else:
        a = _shrink_w(cell, px_ - 2)
    a = AI.outline(AI.quantize(a, colors))
    return np.ascontiguousarray(a, dtype=np.uint8)


def build(save):
    n = 0
    for planet, sheets in BO.items():
        srcs = {}
        for sid, (sheet, box, units, by, fx) in sheets.items():
            if sheet not in srcs:
                srcs[sheet] = _key(np.array(Image.open(SRC / planet / f'bo-{sheet}.png').convert('RGB')))
            y0, x0, y1, x1 = box
            cell = _crop(srcs[sheet][y0:y1, x0:x1])
            a = _make(cell, units, by, 40 if units > 90 else 28)
            c = Canvas(a.shape[1], a.shape[0]); c.a = a
            save(sid, [c], (c.w // 2, c.h - 2), f'đồ lễ hội {planet}: bo-{sheet}.png ({units} đơn vị {"cao" if by == "h" else "ngang"})')
            m = MANIFEST[sid]
            m['scale'] = SC
            lights = _lights(a)
            if lights:
                m['lights'] = lights
            if 'water' in fx:
                m['glints'] = _glints(a)
            if 'fire' in fx:
                f = _flame(a)
                if f:
                    m['flame'] = f
                    if '-' in fx:
                        m['flame_c'] = fx.split('-')[1]   # màu lửa: lam, hong (mặc định vàng)
            n += 1
    return n
