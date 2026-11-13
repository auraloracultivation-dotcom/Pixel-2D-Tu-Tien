"""Món pháp bảo hiện ra lúc đánh, dựng từ TRANH GỐC của chủ dự án (ảnh GPT ở tools/art/nguon/ai/phap-bao/goc/).

Chủ dự án 13/11/2026 07:39: "tui không thích dùng ảnh GPT làm HIỆU ỨNG skill chứ không nói không thích ảnh GPT; icon cũ giữ nguyên; nếu có thể
thì tận dụng ảnh GPT để biến nó thành đồ của bạn". → món bay ra lúc đánh phải chính là món trong hình trên nút. File này lấy tranh gốc, gỡ phần
"hiệu ứng" vẽ sẵn trong tranh (nước, khói, tia), vá chỗ bị che, cho món cử động ở cỡ tranh gốc (phồng bụng, co giãn, xoay theo hướng đánh,
vệt sáng lướt) rồi mới thu về cỡ điểm của nhân vật (1 điểm hình = 0,5 đơn vị bản đồ) bằng màu đa số từng ô, gom về một bảng màu chung cho mọi
khung, viền mực như mọi hình nhân vật (tools/art/ai_import.py). Hiệu ứng quanh món (xoáy hút, luồng phun, sóng, hạt) vẫn vẽ bằng code điểm ảnh
(tools/art/pfx/fx/).

Ra: tools/art/nguon/pfx/<tên>.png + một mục trong meta.json (ext: true: không phải hình PixelFX, export.mjs không xoá) →
python3 -I tools/art/vfx_pfx.py đưa vào assets/art và data/art.json thành 'pfx.<tên>' (game vẽ bằng src/render/vfx/pfx.js như mọi hình pfx:
n khung mỗi hướng, dirs hướng dựng sẵn 0..90 độ, điểm neo = điểm tựa của món).

Chạy: python3 -I tools/art/pb_vat.py [tên ...] [--xem <thư mục>]   (--xem: xuất thêm bảng phóng to để xem thử)"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))   # chạy với python3 -I: thư mục của file không tự nằm trong đường tìm module
import ai_import as ai  # noqa: E402

SRC = HERE / 'nguon' / 'ai' / 'phap-bao' / 'goc'
OUT = HERE / 'nguon' / 'pfx'
YY = XX = None


def load(name):
    global YY, XX
    a = np.array(Image.open(SRC / name).convert('RGBA'))
    YY, XX = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    return a


def biggest(a):
    """Chỉ giữ khối liền lớn nhất (bỏ tia lấp lánh, vụn rời)."""
    lab, n = nd.label(a[:, :, 3] > 127)
    if n > 1:
        sz = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
        a[lab != 1 + int(np.argmax(sz))] = 0
    return a


def strip_water(a, body, keep=()):
    """Gỡ phần nước / khói xanh trắng vẽ sẵn trong tranh. body: [(x, y, r)] các khối tròn của thân: nước đè lên thân thì vá bằng màu gần nhất,
    ngoài thân thì bỏ hẳn. keep: [(x, y, r)] chỗ màu xanh thuộc về món (hạt ngọc)."""
    r, g, b, al = [a[:, :, i].astype(int) for i in range(4)]
    op = al > 127
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    blue = op & (b > r + 18) & (b > g - 25)
    white = op & (mn > 205) & (mx - mn < 45)
    safe = np.zeros_like(op)
    for x, y, rr in keep:
        safe |= (XX - x) ** 2 + (YY - y) ** 2 < rr * rr
    water = nd.binary_propagation(blue & ~safe, mask=(blue | white) & ~safe, structure=np.ones((3, 3)))
    water = nd.binary_dilation(water, iterations=3) & ~safe          # mép nhoè của nước
    inside = np.zeros_like(op)
    for x, y, rr in body:
        inside |= (XX - x) ** 2 + (YY - y) ** 2 < rr * rr
    valid = op & ~water
    idx = nd.distance_transform_edt(~valid, return_distances=False, return_indices=True)
    out = a.copy()
    hole = water & inside
    out[hole] = a[idx[0], idx[1]][hole]
    soft = np.dstack([nd.gaussian_filter(out[:, :, i].astype(float), 2.2) for i in range(3)])   # vá xong làm dịu vệt kéo màu
    out[hole, :3] = soft[hole].astype(np.uint8)
    out[hole, 3] = 255
    out[water & ~inside] = 0
    return biggest(out)


def mouth(a, c, normal_deg, A, B):
    """Vẽ lại miệng món (hồ lô) chỗ bị nước che: vành vàng hình elip, lòng miệng tối. c: tâm miệng, normal_deg: hướng miệng nhìn ra,
    A, B: nửa trục lớn / nhỏ của vành ngoài. Mẩu vành cũ thừa ra phía ngoài thì gọt bỏ."""
    t = math.radians(normal_deg); ax, ay = math.cos(t), math.sin(t)
    dx, dy = XX - c[0], YY - c[1]
    v = dx * ax + dy * ay                    # theo hướng miệng (dương: ra ngoài)
    u = -dx * ay + dy * ax                   # dọc vành miệng
    e_out = (u / A) ** 2 + (v / B) ** 2
    e_in = (u / (A - 7)) ** 2 + (v / (B - 4.5)) ** 2
    e_big = (u / (A + 9)) ** 2 + (v / (B + 9)) ** 2
    lit = np.clip(0.5 - (dx * 0.6 + dy * 0.7) / (A * 1.5), 0, 1)[..., None]     # sáng từ trên trái
    hi, md, lo, dk = np.array([255, 240, 190.]), np.array([246, 196, 86.]), np.array([196, 122, 26.]), np.array([70, 26, 6.])
    rim = np.where(lit > 0.6, hi, np.where(lit > 0.34, md, lo))
    ring = (e_out <= 1) & (e_in > 1)
    rim[(e_out > 0.82) | (e_in < 1.25)] = dk                                     # nét viền ngoài và mép trong của vành
    deep = np.clip(0.5 - v / (B - 4.5) * 0.5, 0, 1)[..., None]                   # thành trong phía xa hơi sáng
    inner = np.array([30, 10, 4.]) * (1 - deep) + np.array([104, 50, 16.]) * deep
    out = a.copy()
    out[(e_big <= 1) & (e_out > 1) & (v > 1)] = 0                                # mẩu vành cũ, mẩu dây thừa phía ngoài miệng
    out[ring, :3] = rim[ring].astype(np.uint8); out[ring, 3] = 255
    hole = e_in <= 1
    out[hole, :3] = inner[hole].astype(np.uint8); out[hole, 3] = 255
    return out


def pm(a):
    f = a.astype(np.float32); f[:, :, :3] *= f[:, :, 3:4] / 255; return f


def unpm(f):
    al = np.clip(f[:, :, 3], 0, 255); rgb = np.where(al[..., None] > 1, f[:, :, :3] * 255 / np.maximum(al[..., None], 1), 0)
    return np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8)


def cut(a, poly):
    """Tách một phần của món ra khỏi tranh (nút gỗ treo dây): poly là đa giác khoanh phần đó. Trả (phần tách, phần còn lại)."""
    m = Image.new('L', (a.shape[1], a.shape[0]), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    mask = (np.array(m) > 0) & (a[:, :, 3] > 0)
    piece = np.zeros_like(a); piece[mask] = a[mask]
    rest = a.copy(); rest[mask] = 0
    return piece, rest


def tether(piece, piv, w=6, col=((84, 10, 14, 255), (206, 36, 30, 255))):
    """Nối dài sợi dây của phần đã tách tới điểm buộc piv (đoạn dây khuất sau thân trong tranh gốc), để lúc đung đưa dây không hở khỏi thân."""
    ys, xs = np.nonzero(piece[:, :, 3] > 127)
    i = int(np.argmin((xs - piv[0]) ** 2 + (ys - piv[1]) ** 2)); p0 = (int(xs[i]), int(ys[i]))
    im = Image.new('RGBA', (piece.shape[1], piece.shape[0]), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.line([p0, piv], fill=col[0], width=w + 4); d.line([p0, piv], fill=col[1], width=w)
    out = np.array(im); top = piece[:, :, 3] > 127
    out[top] = piece[top]
    return out


def swing(rest, piece, piv, deg):
    """Gắn lại phần đã tách, xoay deg độ quanh điểm buộc piv (dương = thuận kim đồng hồ trên màn hình). Phần xoay nằm SAU thân
    (dây buộc ở phía khuất của cổ)."""
    if deg:
        P = pm(piece); t = math.radians(-deg); c, sn = math.cos(t), math.sin(t)
        dx, dy = XX - piv[0] + 0.0, YY - piv[1] + 0.0
        sx, sy = dx * c - dy * sn + piv[0], dx * sn + dy * c + piv[1]
        piece = unpm(np.dstack([nd.map_coordinates(P[:, :, i], [sy, sx], order=1, mode='constant', cval=0) for i in range(4)]))
    out = piece.copy(); top = rest[:, :, 3] > 127
    out[top] = rest[top]
    return out


def pose(a, piv, axis_deg, R, turn=0.0, squash=(1, 1), bulge=None, sheen=None):
    """Một dáng của món ở cỡ tranh gốc, trên khung vuông cạnh 2R tâm là điểm tựa piv. turn: xoay thêm (độ, thuận kim đồng hồ trên màn hình);
    squash: (dọc trục, ngang trục) co giãn quanh điểm tựa; bulge: (x, y, r, k) phồng quanh một điểm; sheen: (vị trí, rộng) vệt sáng lướt chéo."""
    src = a
    if sheen is not None:
        s0, wd = sheen
        r, g, b = [a[:, :, i].astype(int) for i in range(3)]
        gold = (a[:, :, 3] > 127) & (r > 150) & (g > 90) & (r > b + 60) & (g > b + 25)
        d = (XX - piv[0]) * 0.8 + (YY - piv[1]) * 0.6 - s0
        band = gold & (np.abs(d) < wd)
        src = a.copy(); add = (70 * (1 - np.abs(d) / wd))[..., None] * np.array([1, 0.95, 0.7])
        src[band, :3] = np.clip(src[band, :3] + add[band], 0, 255).astype(np.uint8)
    P = pm(src)
    n = int(2 * R)
    oy, ox = np.mgrid[0:n, 0:n].astype(np.float32)
    x, y = ox - R + 0.5, oy - R + 0.5                                   # toạ độ quanh điểm tựa (khung ra)
    tr = math.radians(-turn); c, s = math.cos(tr), math.sin(tr)
    x, y = x * c - y * s, x * s + y * c                                 # bỏ phép xoay
    t = math.radians(axis_deg); ax, ay = math.cos(t), math.sin(t)
    al, ac = x * ax + y * ay, -x * ay + y * ax                          # theo trục thân / ngang thân
    al, ac = al / squash[0], ac / squash[1]
    x, y = al * ax - ac * ay + piv[0], al * ay + ac * ax + piv[1]
    if bulge:
        bx, by, br, bk = bulge
        dx, dy = x - bx, y - by; d2 = (dx * dx + dy * dy) / (br * br)
        f = 1 / (1 + bk * np.clip(1 - d2, 0, 1) ** 1.5)
        x, y = bx + dx * f, by + dy * f
    out = np.dstack([nd.map_coordinates(P[:, :, i], [y - 0.5, x - 0.5], order=1, mode='constant', cval=0) for i in range(4)])
    return unpm(out)


def shrink(a, k):
    """Thu nhỏ k lần (k điểm tranh = 1 điểm hình) bằng màu đa số từng ô; khung vuông, tâm khung rơi đúng mép ô (điểm neo = giữa hình ra)."""
    n = a.shape[0]; m = int(n / k / 2) * 2; off = n / 2 - m / 2 * k
    out = np.zeros((m, m, 4), np.uint8)
    for j in range(m):
        y0, y1 = int(off + j * k), max(int(off + j * k) + 1, int(off + (j + 1) * k))
        row = a[y0:y1]
        if not (row[:, :, 3] > 127).any():
            continue
        for i in range(m):
            x0, x1 = int(off + i * k), max(int(off + i * k) + 1, int(off + (i + 1) * k))
            cell = row[:, x0:x1].reshape(-1, 4)
            solid = cell[cell[:, 3] >= 128]
            if len(solid) * 2 < len(cell):
                continue
            q = (solid[:, :3] // 12).astype(np.int32)
            key = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
            vals, cnt = np.unique(key, return_counts=True)
            out[j, i, :3] = solid[key == vals[np.argmax(cnt)]][:, :3].mean(axis=0)
            out[j, i, 3] = 255
    return out


def palette(frames, n, keep=()):
    """Bảng n màu chung cho mọi khung (cắt trung vị) + các màu keep phải có (màu ít điểm dễ bị gộp mất: hạt ngọc)."""
    px = np.concatenate([f[f[:, :, 3] > 0][:, :3] for f in frames])
    im = Image.fromarray(px.reshape(1, -1, 3)).quantize(colors=n - len(keep), method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(im.getpalette()[:(n - len(keep)) * 3], np.float32).reshape(-1, 3)
    return np.vstack([pal, np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in keep], np.float32)]) if keep else pal


def to_pal(a, pal):
    m = a[:, :, 3] > 0
    if m.any():
        p = a[m][:, :3].astype(np.float32)
        d = ((p[:, None, :] - pal[None, :, :]) ** 2 * np.array([0.9, 1.2, 0.8])).sum(axis=2)
        a[m, :3] = pal[np.argmin(d, axis=1)].astype(np.uint8)
    return a


def build(name, cells, meta, pal_n=30, keep=(), xem=None):
    """cells[hướng][khung] = hình RGBA vuông cùng cỡ (điểm neo ở giữa). Gom màu, viền mực, cắt khung chung, xếp tấm, ghi meta."""
    flat = [c for row in cells for c in row]
    pal = palette(flat[:max(1, len(cells[0]))], pal_n, keep)
    flat = [ai.outline(to_pal(c, pal)) for c in flat]
    n = flat[0].shape[0]; m = np.zeros((n, n), bool)
    for c in flat:
        m |= c[:, :, 3] > 0
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    w, h, nf, nd_ = x1 - x0, y1 - y0, len(cells[0]), len(cells)
    sheet = np.zeros((h * nd_, w * nf, 4), np.uint8)
    for d in range(nd_):
        for f in range(nf):
            sheet[d * h:(d + 1) * h, f * w:(f + 1) * w] = flat[d * nf + f][y0:y1, x0:x1]
    Image.fromarray(sheet, 'RGBA').save(OUT / f'{name}.png')
    mp = OUT / 'meta.json'; M = json.loads(mp.read_text(encoding='utf-8'))
    M[name] = {'w': int(w), 'h': int(h), 'cols': nf, 'rows': nd_, 'n': nf, 'dirs': nd_, 'anchor': [int(n // 2 - x0), int(n // 2 - y0)], 'k': 0.5, 'ext': True, **meta}
    mp.write_text(json.dumps(dict(sorted(M.items())), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if xem:
        Path(xem).mkdir(parents=True, exist_ok=True)
        z = Image.fromarray(sheet, 'RGBA'); z = z.resize((z.width * 3, z.height * 3), Image.NEAREST)
        bg = Image.new('RGBA', z.size, (92, 140, 96, 255)); bg.alpha_composite(z); bg.save(Path(xem) / f'{name}.png')
    print(f'{name}: {w}x{h} × {nf} khung × {nd_} hướng, neo {M[name]["anchor"]}, {len(pal)} màu')


# ---------------------------------------------------------------- Hồ Lô
# Tranh hu-ho-lo.png (640 × 427): trái hồ lô đã bật nút, miệng chếch lên phải, đang phun nước. Gỡ nước, vẽ lại miệng.
# axis: trục thân (co giãn); aim: hướng miệng nhìn ra (xoay theo hướng đánh); piv: điểm tựa, nằm sau miệng 95 điểm tranh theo hướng aim
HL = dict(axis=-57.0, aim=-40.0, piv=(220, 229), bulb=(210, 290, 84), bulb2=(250, 197, 48), mouth=(293, 168), k=2.7, R=246)


NUT = dict(poly=[(246, 156), (258, 130), (300, 117), (330, 121), (424, 136), (424, 40), (246, 40)], piv=(277, 153))   # nút gỗ + dây vắt qua cổ; điểm buộc nằm khuất sau vành miệng
NGOC = ('#1e7a78', '#58c8c0', '#b8f0e8')   # hạt ngọc lam


def ho_lo_src():
    """Trả (thân hồ lô đã gỡ nước, vẽ lại miệng; nút gỗ + dây tách riêng để đung đưa)."""
    a = strip_water(load('hu-ho-lo.png'), [HL['bulb'][:2] + (83,), HL['bulb2'][:2] + (47,)], keep=[(316, 262, 17)])
    nut, rest = cut(a, NUT['poly'])
    return biggest(mouth(rest, HL['mouth'], HL['aim'], 36, 13)), tether(nut, NUT['piv'])


def ho_lo(xem=None):
    than, nut = ho_lo_src()
    bx, by, br = HL['bulb']
    # hít 1 giây (dáng như tranh gốc: miệng chếch lên phải; quay trái thì game lật): bụng phồng dần theo ba hơi, vệt sáng lướt hai lần,
    # nút gỗ bật lên phía trên miệng rồi rung theo gió hút (không che phễu xoáy)
    fr = []
    for i in range(12):
        u = (i + 0.3) / 12
        sw = (3 * u * u - 2 * u ** 3) * 0.9 + 0.09 * math.sin(u * math.tau * 3) * (1 - 0.4 * u)
        g = 1 + 0.03 * math.sin(u * math.tau * 3)
        b = swing(than, nut, NUT['piv'], -58 + 14 * max(0, 1 - u * 5) + 7 * math.sin(u * math.tau * 4))
        fr.append(shrink(pose(b, HL['piv'], HL['axis'], HL['R'], squash=(2 - g, g), bulge=(bx, by, br * 1.4, 0.26 * sw), sheen=(-170 + ((u * 2) % 1) * 340, 16)), HL['k']))
    build('pb-holo', [fr], {'fps': 12, 'dur': 1.0, 'loop': False, 'fx': 'tranh gốc hu-ho-lo.png', 'note': 'Hồ Lô lúc hít linh khí (tranh gốc của chủ dự án, gỡ nước, cho phồng bụng, nút gỗ đung đưa): 12 khung, miệng chếch lên phải'}, keep=NGOC, xem=xem)
    # phun: ba thế × 9 hướng (0..90 độ, miệng chúc theo hướng đánh): 0 căng phồng lấy đà, 1 đang phun (vươn tới, nút gỗ bị hất ngược ra sau), 2 xẹp lại
    P = [(-12, dict(squash=(0.9, 1.08), bulge=(bx, by, br * 1.4, 0.3))), (-100, dict(squash=(1.07, 0.95), bulge=(bx, by, br * 1.4, 0.1))), (-70, dict(squash=(1, 1)))]
    S = [swing(than, nut, NUT['piv'], deg) for deg, _ in P]
    cells = [[shrink(pose(S[j], HL['piv'], HL['axis'], HL['R'], turn=d * 90 / 8 - HL['aim'], **q), HL['k']) for j, (_, q) in enumerate(P)] for d in range(9)]
    build('pb-holo-phun', cells, {'fps': 10, 'times': [0, 0.08, 0.42], 'dur': 0.62, 'loop': False, 'fx': 'tranh gốc hu-ho-lo.png', 'note': 'Hồ Lô lúc phun (tranh gốc của chủ dự án): ba thế × 9 hướng, miệng chúc theo hướng đánh'}, keep=NGOC, xem=xem)


ALL = {'ho-lo': ho_lo}

if __name__ == '__main__':
    args = sys.argv[1:]; xem = None
    if '--xem' in args:
        i = args.index('--xem'); xem = args[i + 1]; del args[i:i + 2]
    for k in args or ALL:
        ALL[k](xem)
