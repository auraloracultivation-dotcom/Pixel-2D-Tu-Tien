"""Hình cho khung trên màn chơi (chân dung, thanh, bản đồ tròn, nút).
- ui-hud-kenh (vẽ bằng code, chủ dự án 11/11/2026 11:25: nút TikTok cạnh nút Thư): điện thoại dựng đứng, màn hình tím có nút phát
  vàng ở giữa và trái tim nhỏ góc dưới. Không vẽ lại logo của hãng nào; chữ "TikTok" là nhãn dưới nút (data/menu.json → hud.tron.lb).
- Từ ảnh GPT chủ dự án gửi 11/11/2026 11:42 (nguon/ai/ui/hud-*.png, nền trong suốt sẵn; thu nhỏ, giữ nguyên hình như ui_nhan_vat.py):
  ui-hud-thanh-khung: khung thanh rỗng (rãnh tối, viền vàng, hai đầu hoa văn), dùng kiểu 9 mảnh: 'slice' = [trên, phải, dưới, trái];
  ui-hud-thanh-do / -lam / -no / -khi: ruột thanh Sinh lực, Linh lực, Nộ, Linh khí (chỉ phần trong rãnh, neo trái, không kéo giãn);
  ui-hud-vong-mat: vòng chân dung có ổ ngọc hệ góc trên phải và bảng cấp dưới; 'hole' = [tâm x / rộng, tâm y / cao, bán kính / rộng],
  'socket', 'plate' = [tâm x / rộng, tâm y / cao, rộng / rộng, cao / cao] để đặt huy hiệu hệ, chữ Lv;
  ui-hud-vong-ban-do: vòng bản đồ tròn bốn đinh vàng ('hole' như trên); ui-hud-bang-ten: băng tên cuộn hai đầu ('slice').
Gọi từ build.py và ui_kit_only.py: ui_hud_tren.build(save)."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from px import Canvas, hx, MANIFEST

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui'

INK = hx('#140f24')
GOLD = [hx('#9a5a10'), hx('#e8a22a'), hx('#ffd766'), hx('#fff4c6')]
BODY = [hx('#2a2448'), hx('#3c3466'), hx('#544a8a')]
SCREEN = [hx('#3a1f78'), hx('#5a34b0'), hx('#7d58e0')]
HEART = [hx('#9a1424'), hx('#e3343e'), hx('#ff9a9a')]


def _phone():
    W, H = 30, 38
    c = Canvas(W, H)
    x0, y0, x1, y1 = 5, 2, 24, 35   # thân máy, góc bo 3 điểm ảnh
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            cut = min(x - x0, x1 - x, y - y0, y1 - y)
            if cut < 3 and (min(x - x0, x1 - x) + min(y - y0, y1 - y)) < 3:
                continue   # bo góc
            ring = min(x - x0, x1 - x, y - y0, y1 - y)
            c.px(x, y, GOLD[1] if ring == 0 else GOLD[2] if ring == 1 else BODY[1])
    for x in range(x0 + 2, x1 - 1):   # sáng mép trên, tối mép dưới cho có khối
        c.px(x, y0 + 1, GOLD[3])
        c.px(x, y1 - 1, GOLD[0])
    sx0, sy0, sx1, sy1 = 8, 7, 21, 29   # màn hình: tím, sáng dần lên trên
    for y in range(sy0, sy1 + 1):
        t = (y - sy0) / (sy1 - sy0)
        for x in range(sx0, sx1 + 1):
            c.px(x, y, SCREEN[2] if t < 0.25 else SCREEN[1] if t < 0.7 else SCREEN[0])
    for x in range(sx0, sx1 + 1):
        c.px(x, sy0 - 1, INK)
    for x in range(12, 18):   # loa trên, nút dưới
        c.px(x, 4, BODY[0])
    for x in range(13, 17):
        c.px(x, 32, GOLD[0])
        c.px(x, 31, BODY[2])
    for i in range(9):   # nút phát: tam giác vàng trỏ phải, viền mực
        top, bot = 13 + i // 2, 23 - i // 2
        for y in range(top, bot + 1):
            c.px(11 + i, y, GOLD[3] if i < 3 else GOLD[2] if i < 7 else GOLD[1])
    for y in range(12, 25):
        c.px(10, y, INK)
    for (x, y) in [(18, 25), (19, 25), (21, 25), (22, 25), (17, 26), (18, 26), (19, 26), (20, 26), (21, 26), (22, 26), (23, 26),
                   (17, 27), (18, 27), (19, 27), (20, 27), (21, 27), (22, 27), (23, 27), (18, 28), (19, 28), (20, 28), (21, 28), (22, 28),
                   (19, 29), (20, 29), (21, 29), (20, 30)]:   # trái tim nhỏ góc dưới phải, tràn ra mép máy
        c.px(x, y, HEART[1])
    for (x, y) in [(18, 26), (18, 27), (19, 26)]:
        c.px(x, y, HEART[2])
    for (x, y) in [(22, 28), (21, 29), (20, 30)]:
        c.px(x, y, HEART[0])
    c.outline(INK)
    return c


def _load(name, cut=64):
    a = np.array(Image.open(SRC / name).convert('RGBA'))
    a[:, :, 3] = np.where(a[:, :, 3] >= cut, a[:, :, 3], 0)   # bỏ quầng mờ
    return a


def _pieces(a, big=20000):
    """Các mảnh hình lớn theo thứ tự trên → dưới, trái → phải: [(y0, x0, mảng)]."""
    lab, _ = nd.label(a[:, :, 3] > 0)
    out = []
    for i, o in enumerate(nd.find_objects(lab), 1):
        if (lab[o] == i).sum() >= big:
            out.append((o[0].start, o[1].start, a[o] * (lab[o] == i)[..., None]))
    return sorted(out, key=lambda t: (t[0] // 60, t[1]))


def _fit(a, k):
    """Thu nhỏ k lần, nhân alpha trước khi lấy mẫu cho mép khỏi viền đen."""
    h, w = a.shape[:2]
    im = Image.fromarray(np.ascontiguousarray(a, dtype=np.uint8), 'RGBA').convert('RGBa')
    return np.array(im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS).convert('RGBA'))


def _put(save, sid, a, note, **meta):
    c = Canvas(a.shape[1], a.shape[0]); c.a = np.ascontiguousarray(a, dtype=np.uint8)
    save(sid, [c], (c.w // 2, c.h // 2), note + ' (ảnh GPT, tools/art/ui_hud_tren.py)')
    for k, v in meta.items():
        MANIFEST[sid][k] = v


def _navy(a):
    """Mặt nạ lõi xanh tím đậm của khung (rãnh thanh, lòng ổ ngọc, bảng cấp)."""
    r, g, b, al = (a[:, :, i].astype(int) for i in range(4))
    return (b > r + 15) & (r < 70) & (al > 128)


def _hole(a):
    """Lòng trong suốt kín (không chạm mép): tâm, bán kính theo tỉ lệ bề ngang / cao."""
    lab, _ = nd.label(a[:, :, 3] == 0)
    h, w = a.shape[:2]
    for i, o in enumerate(nd.find_objects(lab), 1):
        if o[0].start > 0 and o[1].start > 0 and o[0].stop < h and o[1].stop < w and (lab[o] == i).sum() > 0.05 * h * w:
            m = lab == i; cy, cx = nd.center_of_mass(m)
            return [round(float(cx) / w, 4), round(float(cy) / h, 4), round(float((m.sum() / np.pi) ** 0.5) / w, 4)]
    return None


def _box(m, w, h):
    ys, xs = np.nonzero(m)
    return [round(float(xs.min() + xs.max() + 1) / 2 / w, 4), round(float(ys.min() + ys.max() + 1) / 2 / h, 4), round(float(xs.max() - xs.min() + 1) / w, 4), round(float(ys.max() - ys.min() + 1) / h, 4)]


def _bars(save):
    bars = [p[2] for p in _pieces(_load('hud-thanh.png'))]
    frame = bars[0]
    lab, _ = nd.label(_navy(frame))   # rãnh: mảng xanh lớn nhất của khung rỗng
    big = np.argmax(np.bincount(lab.ravel())[1:]) + 1
    ys, xs = np.nonzero(lab == big)
    t, b, l, r = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    k = 0.5
    f = _fit(frame, k)
    sl = [round(t * k), round((frame.shape[1] - r) * k), round((frame.shape[0] - b) * k), round(l * k)]
    _put(save, 'ui.hud-thanh-khung', f, 'khung thanh rỗng, 9 mảnh', slice=sl)
    for name, bar in zip(['do', 'lam', 'no', 'khi'], bars[1:5]):
        fill = bar[t + 2:b - 2, l + 14:r - 14]   # chỉ ruột trong rãnh, bỏ mép tối và mũi nhọn hai đầu
        _put(save, 'ui.hud-thanh-' + name, _fit(fill, 16 / fill.shape[0]), 'ruột thanh ' + name)
    return 5


def _rings(save):
    ring = _pieces(_load('hud-vong-mat.png'))[0][2]
    h, w = ring.shape[:2]
    lab, _ = nd.label(_navy(ring))
    parts = [(lab == i) for i in range(1, lab.max() + 1)]
    sock = max((m for m in parts if _box(m, w, h)[0] > 0.7 and _box(m, w, h)[1] < 0.35), key=lambda m: m.sum())   # ổ ngọc góc trên phải
    plate = max((m for m in parts if _box(m, w, h)[1] > 0.8), key=lambda m: m.sum())   # bảng cấp dưới
    _put(save, 'ui.hud-vong-mat', _fit(ring, 200 / w), 'vòng chân dung', hole=_hole(ring), socket=_box(sock, w, h), plate=_box(plate, w, h))
    mm, rib = [p[2] for p in sorted(_pieces(_load('hud-ban-do.png')), key=lambda p: p[1])]
    _put(save, 'ui.hud-vong-ban-do', _fit(mm, 180 / mm.shape[1]), 'vòng bản đồ tròn', hole=_hole(mm))
    lab, _ = nd.label(_navy(rib))
    big = np.argmax(np.bincount(lab.ravel())[1:]) + 1
    ys, xs = np.nonzero(lab == big)
    k = 0.25
    _put(save, 'ui.hud-bang-ten', _fit(rib, k), 'băng tên bản đồ, 9 mảnh',
         slice=[round(ys.min() * k), round((rib.shape[1] - xs.max() - 1) * k), round((rib.shape[0] - ys.max() - 1) * k), round(xs.min() * k)])
    return 3


def build(save):
    save('ui.hud-kenh', [_phone()], (15, 37), 'nút kênh video (TikTok) trên màn chơi (tools/art/ui_hud_tren.py)')
    return 1 + _bars(save) + _rings(save)
