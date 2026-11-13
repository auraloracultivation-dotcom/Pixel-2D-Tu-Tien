"""Món pháp bảo hiện ra lúc đánh: ĐỒ LẠI bằng điểm ảnh theo tranh mẫu của chủ dự án (ảnh GPT ở tools/art/nguon/ai/phap-bao/goc/).

Chủ dự án 13/11/2026 08:17: "cái vụ lấy ảnh GPT để tạo chuyển động thì thôi; nếu lấy ảnh đó để sao chép điểm ảnh rồi biến nó thành của bạn
tự vẽ ra thì được, chứ ảnh GPT nhìn không hợp chuyển động". → tranh GPT chỉ là MẪU ĐỂ ĐỒ. Không còn kéo giãn, xoay chính tấm tranh (bản 08:04
làm thế: tranh tô loang nhiều màu, mỗi khung thu nhỏ lại một lần nên điểm ảnh bên trong nhấp nháy như ảnh chụp bị bóp méo).

Cách làm:
  1. Dọn tranh mẫu: gỡ phần "hiệu ứng" vẽ sẵn (nước, khói), vá chỗ bị che, tách phần treo (nút gỗ, dây).
  2. ĐỒ: chia món thành vài chất liệu (vàng, dây đỏ, ngọc...), mỗi chất liệu một dải ít sắc độ từ tối tới sáng (bảng màu của game, không lấy
     màu loang của tranh); mỗi điểm tranh về đúng một sắc độ, dọn điểm lẻ → một bản vẽ phẳng, mảng màu rõ (kiểu tô điểm ảnh).
  3. Cho cử động TRÊN BẢN VẼ ĐÓ: mỗi dáng dựng bằng cách bỏ phiếu từng điểm hình (lớp màu nào chiếm nhiều thì thắng, không pha màu). Thân
     chỉ có vài dáng cố định, giữ nguyên từng điểm giữa các khung (không nhấp nháy); phần treo đung đưa riêng; vệt sáng lướt là đẩy sắc độ
     lên một, hai nấc chứ không cộng sáng.
  4. Viền mực 1 điểm như mọi hình nhân vật (tools/art/ai_import.py), xếp tấm, ghi meta.

Ra: tools/art/nguon/pfx/<tên>.png + một mục trong meta.json (ext: true: không phải hình PixelFX, export.mjs không xoá) →
python3 -I tools/art/vfx_pfx.py đưa vào assets/art và data/art.json thành 'pfx.<tên>' (game vẽ bằng src/render/vfx/pfx.js như mọi hình pfx:
n khung mỗi hướng, dirs hướng dựng sẵn 0..90 độ, điểm neo = điểm tựa của món). Cỡ: 1 điểm hình = 1 điểm màn hình, như nhân vật.

Chạy: python3 -I tools/art/pb_vat.py [tên ...] [--xem <thư mục>]   (--xem: xuất thêm bảng phóng to và bản vẽ phẳng để xem thử)"""
import json
import math
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))   # chạy với python3 -I: thư mục của file không tự nằm trong đường tìm module
import ai_import as ai  # noqa: E402

SRC = HERE / 'nguon' / 'ai' / 'phap-bao' / 'goc'
OUT = HERE / 'nguon' / 'pfx'
YY = XX = None


# ================================================================ 1. dọn tranh mẫu
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


def cut(a, poly):
    """Tách một phần của món ra khỏi tranh (nút gỗ treo dây): poly là đa giác khoanh phần đó. Trả (phần tách, phần còn lại)."""
    m = Image.new('L', (a.shape[1], a.shape[0]), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    mask = (np.array(m) > 0) & (a[:, :, 3] > 0)
    piece = np.zeros_like(a); piece[mask] = a[mask]
    rest = a.copy(); rest[mask] = 0
    return piece, rest


def tether(piece, piv, w=6, col=((84, 10, 14, 255), (206, 36, 30, 255))):
    """Nối dài sợi dây của phần đã tách tới điểm buộc piv (đoạn dây khuất sau thân trong tranh mẫu), để lúc đung đưa dây không hở khỏi thân."""
    ys, xs = np.nonzero(piece[:, :, 3] > 127)
    i = int(np.argmin((xs - piv[0]) ** 2 + (ys - piv[1]) ** 2)); p0 = (int(xs[i]), int(ys[i]))
    im = Image.new('RGBA', (piece.shape[1], piece.shape[0]), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.line([p0, piv], fill=col[0], width=w + 4); d.line([p0, piv], fill=col[1], width=w)
    out = np.array(im); top = piece[:, :, 3] > 127
    out[top] = piece[top]
    return out


def over(top, under):
    out = under.copy(); m = top[:, :, 3] > 127
    out[m] = top[m]
    return out


# ================================================================ 2. đồ: tranh mẫu → bản vẽ phẳng (mỗi điểm một lớp màu)
def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def hue(lo, hi):
    """Luật chọn chất liệu theo sắc (độ): lo..hi, vòng qua 360 nếu lo > hi. Luật nhận F (h sắc, r g b 0..1 của từng điểm tranh)."""
    return (lambda F: (F.h >= lo) & (F.h < hi)) if lo <= hi else (lambda F: (F.h >= lo) | (F.h < hi))


def do_tuoi(lo=335, hi=12, near=5):
    """Dây, tua đỏ: sắc đỏ nằm sát chỗ đỏ tươi. Bóng đỏ sẫm của vỏ (cùng sắc đỏ nhưng không sát chỗ nào đỏ tươi) không tính, để nó thuộc về vỏ."""
    def luat(F):
        red = hue(lo, hi)(F)
        return red & nd.binary_dilation(red & (F.r > 0.8) & (F.g < 0.2 * F.r), iterations=near)
    return luat


class Bang:
    """Bảng màu của một món. mats: [(tên, luật sắc, [sắc độ từ tối tới sáng])]. Mỗi sắc độ khai 'màu trong tranh>màu vẽ ra' (điểm tranh gần
    màu trước nhất thì vẽ bằng màu sau), hoặc một màu dùng cho cả hai; để None hết thì tự gom cụm màu của tranh (dùng lúc dò, in ra bằng --xem).
    Lớp 0 = trống; lớp cuối = mực."""

    def __init__(self, a, mats):
        self.mats = mats; self.pal = [(0, 0, 0)]; self.cen = {}; self.base = {}; self.name = {}
        m, rgb = self.chat(a), self.mem(a)
        for j, (ten, _, cols) in enumerate(mats, 1):
            if cols[0] is None:
                px = rgb[m == j].astype(np.uint8)
                q = Image.fromarray(px.reshape(1, -1, 3)).quantize(colors=len(cols), method=Image.Quantize.MEDIANCUT, kmeans=6, dither=Image.Dither.NONE)
                c = np.array(q.getpalette()[:len(cols) * 3], np.float32).reshape(-1, 3)
                self.cen[j] = c[np.argsort(c @ np.array([0.3, 0.59, 0.11]))]; out = [tuple(int(v) for v in x) for x in self.cen[j]]
            else:
                self.cen[j] = np.array([hexrgb(h.split('>')[0]) for h in cols], np.float32); out = [hexrgb(h.split('>')[-1]) for h in cols]
            self.base[j] = len(self.pal); self.name[ten] = j
            self.pal += out
        self.ink = len(self.pal); self.pal.append(ai.INK[:3])
        self.up = list(range(len(self.pal)))          # lớp sáng hơn một nấc trong cùng chất liệu
        self.down = list(range(len(self.pal)))        # lớp tối hơn một nấc (không xuống tới nét tối nhất: đó là nét viền)
        self.mat = [0] * len(self.pal); self.w = [1.0] * len(self.pal)   # w: nét tối nhất của mỗi chất liệu nặng phiếu hơn (nét mảnh không bị nuốt)
        for j, (_, _, cols) in enumerate(mats, 1):
            for t in range(len(cols)):
                self.up[self.base[j] + t] = self.base[j] + min(t + 1, len(cols) - 1); self.mat[self.base[j] + t] = j
                self.down[self.base[j] + t] = self.base[j] + (max(t - 1, 1) if t else 0)
            self.w[self.base[j]] = 1.7

    def auto(self):
        return {ten: ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in self.cen[j]] for ten, j in self.name.items()}

    @staticmethod
    def mem(a):
        """Màu đã làm dịu nhẹ (bỏ hạt nhiễu của tranh), không lem màu từ vùng trống."""
        al = nd.gaussian_filter((a[:, :, 3] > 127).astype(np.float32), 0.8)
        return np.dstack([nd.gaussian_filter(a[:, :, i].astype(np.float32) * (a[:, :, 3] > 127), 0.8) / np.maximum(al, 1e-3) for i in range(3)])

    def chat(self, a):
        """Chất liệu của từng điểm tranh. Điểm màu rõ thì theo luật sắc; điểm xám, tối (nét viền, bóng) theo chất liệu của điểm rõ gần nhất."""
        p = a[:, :, :3].astype(np.float32) / 255; op = a[:, :, 3] > 127
        mx, mn = p.max(2), p.min(2); d = np.maximum(mx - mn, 1e-6)
        r, g, b = p[:, :, 0], p[:, :, 1], p[:, :, 2]
        h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
        sure = op & ((mx - mn) / np.maximum(mx, 1e-6) > 0.28) & (mx > 0.22)
        lab = np.zeros(op.shape, np.int32)
        F = SimpleNamespace(h=h, r=r, g=g, b=b)
        for j, (_, luat, _) in enumerate(self.mats, 1):       # luật khai trước được chọn trước
            lab[sure & (lab == 0) & luat(F)] = j
        i = nd.distance_transform_edt(lab == 0, return_distances=False, return_indices=True)
        return np.where(op, lab[i[0], i[1]], 0)

    def lop(self, a, mode=1):
        """Đồ: mỗi điểm tranh về một lớp màu (sắc độ gần nhất trong chất liệu của nó), rồi dọn điểm lẻ bằng bỏ phiếu 3 × 3 (mode lượt)."""
        m, rgb = self.chat(a), self.mem(a); out = np.zeros(m.shape, np.int32)
        for j in self.cen:
            sel = m == j
            d = ((rgb[sel][:, None, :] - self.cen[j][None, :, :]) ** 2 * np.array([0.9, 1.2, 0.8])).sum(axis=2)
            out[sel] = self.base[j] + np.argmin(d, axis=1)
        for _ in range(mode):
            vote = np.dstack([nd.uniform_filter((out == c).astype(np.float32), 3) for c in range(1, self.ink)])
            out = np.where(out > 0, vote.argmax(2) + 1, 0)
        return out

    def rgba(self, i):
        pal = np.array(self.pal, np.uint8)
        return np.dstack([pal[i], np.where(i > 0, 255, 0).astype(np.uint8)])


# ================================================================ 3. cho cử động trên bản vẽ
def cell(k, R):
    return int(2 * R / k / 2) * 2


def dang(piv, k, n, axis=0.0, turn=0.0, squash=(1, 1), bulge=None, quay=None):
    """Một dáng: phép đưa điểm hình (khung n × n, điểm tựa piv nằm giữa khung) về toạ độ tranh mẫu. k: số điểm tranh trên một điểm hình;
    turn: xoay cả món (độ, thuận kim đồng hồ trên màn hình); squash: (dọc trục, ngang trục) co giãn quanh điểm tựa, axis: hướng trục thân;
    bulge: (x, y, r, k) phồng quanh một điểm; quay: ((x, y), độ) phần treo xoay quanh điểm buộc."""
    tr = math.radians(-turn); c, s = math.cos(tr), math.sin(tr)
    t = math.radians(axis); ax, ay = math.cos(t), math.sin(t)

    def inv(ox, oy):
        x, y = (ox - n / 2) * k, (oy - n / 2) * k
        x, y = x * c - y * s, x * s + y * c
        al, ac = (x * ax + y * ay) / squash[0], (-x * ay + y * ax) / squash[1]
        x, y = al * ax - ac * ay + piv[0], al * ay + ac * ax + piv[1]
        if bulge:
            bx, by, br, bk = bulge
            dx, dy = x - bx, y - by; d2 = (dx * dx + dy * dy) / (br * br)
            f = 1 / (1 + bk * np.clip(1 - d2, 0, 1) ** 1.5)
            x, y = bx + dx * f, by + dy * f
        if quay:
            (px, py), deg = quay; q = math.radians(-deg); qc, qs = math.cos(q), math.sin(q); dx, dy = x - px, y - py
            x, y = dx * qc - dy * qs + px, dx * qs + dy * qc + py
        return x, y
    return inv


def ve(cls, n, inv, B, ss=4):
    """Dựng một khung n × n từ bản vẽ phẳng cls: mỗi điểm hình lấy ss × ss mẫu, lớp màu nhiều phiếu nhất thắng (không pha màu);
    quá nửa mẫu rơi vào chỗ trống thì điểm đó trống. Phiếu nhân trọng số B.w (nét tối mảnh nặng phiếu hơn)."""
    H, W = cls.shape
    acc = np.zeros((n, n, len(B.pal)), np.float32); rr, cc = np.mgrid[0:n, 0:n]
    for j in range(ss):
        for i in range(ss):
            sx, sy = inv(cc + (i + 0.5) / ss, rr + (j + 0.5) / ss)
            xi, yi = np.floor(sx).astype(np.int32), np.floor(sy).astype(np.int32)
            ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H)
            acc[rr, cc, np.where(ok, cls[np.clip(yi, 0, H - 1), np.clip(xi, 0, W - 1)], 0)] += 1
    solid = acc[:, :, 1:].sum(2) * 2 >= ss * ss
    acc = acc * np.asarray(B.w, np.float32)
    return np.where(solid, acc[:, :, 1:].argmax(2) + 1, 0)


def loang(i, B, k, s0, wd, mats, dx=0.8, dy=0.6):
    """Vệt sáng lướt chéo: trong dải rộng wd (điểm tranh) quanh vị trí s0, các lớp thuộc chất liệu mats sáng lên một nấc, lõi dải hai nấc."""
    n = i.shape[0]; rr, cc = np.mgrid[0:n, 0:n]
    d = np.abs(((cc - n / 2) * dx + (rr - n / 2) * dy) * k - s0)
    ok = np.isin(np.array(B.mat)[i], [B.name[m] for m in mats])
    up = np.array(B.up); out = np.where(ok & (d < wd), up[i], i)
    return np.where(ok & (d < wd * 0.45), up[out], out)


def vien(i, ink):
    """Viền mực 1 điểm quanh hình (khung rộng thêm 1 điểm mỗi phía)."""
    out = np.zeros((i.shape[0] + 2, i.shape[1] + 2), np.int32); out[1:-1, 1:-1] = i
    s = out > 0; g = np.zeros_like(s)
    g[1:, :] |= s[:-1, :]; g[:-1, :] |= s[1:, :]; g[:, 1:] |= s[:, :-1]; g[:, :-1] |= s[:, 1:]
    out[g & ~s] = ink
    return out


def xuat(name, cells, B, meta, xem=None):
    """cells[hướng][khung] = khung lớp màu vuông cùng cỡ (điểm neo ở giữa). Viền mực, cắt khung chung, xếp tấm, ghi meta."""
    flat = [B.rgba(vien(c, B.ink)) for row in cells for c in row]
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
        show(sheet, Path(xem) / f'{name}.png', 3)
    print(f'{name}: {w}x{h} × {nf} khung × {nd_} hướng, neo {M[name]["anchor"]}, {len(B.pal) - 1} màu')


def show(rgba, path, z):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    im = Image.fromarray(rgba, 'RGBA'); im = im.resize((im.width * z, im.height * z), Image.NEAREST)
    bg = Image.new('RGBA', im.size, (92, 140, 96, 255)); bg.alpha_composite(im); bg.save(path)


# ================================================================ Hồ Lô
# Tranh mẫu hu-ho-lo.png (640 × 427): trái hồ lô đã bật nút, miệng chếch lên phải, đang phun nước. Gỡ nước, vẽ lại miệng.
# axis: trục thân (co giãn); aim: hướng miệng nhìn ra (xoay theo hướng đánh); piv: điểm tựa, nằm sau miệng 95 điểm tranh theo hướng aim
HL = dict(axis=-57.0, aim=-40.0, piv=(220, 229), bulb=(210, 290, 84), bulb2=(250, 197, 48), mouth=(293, 168), k=2.7, R=246)
NUT = dict(poly=[(246, 156), (258, 130), (300, 117), (330, 121), (424, 136), (424, 40), (246, 40)], piv=(277, 153))   # nút gỗ + dây vắt qua cổ; điểm buộc nằm khuất sau vành miệng
HL_MAU = [   # dây + tua đỏ, vỏ hồ lô sơn vàng cam (cả nút gỗ, vành miệng, hạt vàng; bóng của vỏ ngả đỏ sẫm), hạt ngọc lam
    ('do', do_tuoi(), ['#240304>#3a0610', '#6a1012>#7c1016', '#a82418>#b81e1e', '#e62a22>#e8322a', '#ff6a50>#ff7858']),
    ('vang', hue(335, 75), ['#351608>#3a1608', '#8a3410>#9c420c', '#c35215>#d0620e', '#ee8418>#ee8a14', '#f9b93b>#fbb934', '#fadd7d>#fddc78', '#fcf5d2>#fff6d0']),
    ('ngoc', hue(140, 215), ['#1f1b1c>#143c40', '#51aba7>#3fb6ae', '#aae4d4>#b8f4e6']),
]


def ho_lo_src():
    """Trả (thân hồ lô đã gỡ nước, vẽ lại miệng; nút gỗ + dây tách riêng để đung đưa)."""
    a = strip_water(load('hu-ho-lo.png'), [HL['bulb'][:2] + (83,), HL['bulb2'][:2] + (47,)], keep=[(316, 262, 17)])
    nut, rest = cut(a, NUT['poly'])
    return biggest(mouth(rest, HL['mouth'], HL['aim'], 36, 13)), tether(nut, NUT['piv'])


def ho_lo(xem=None):
    than, nut = ho_lo_src()
    B = Bang(over(than, nut), HL_MAU); T, N = B.lop(than), B.lop(nut)
    k, n, piv, axis = HL['k'], cell(HL['k'], HL['R']), HL['piv'], HL['axis']
    bx, by, br = HL['bulb']
    if xem:
        show(B.rgba(np.where(T > 0, T, N)), Path(xem) / 'ho-lo-ban-ve.png', 2); print(' sắc độ tìm được:', B.auto())

    def khung(q, deg, turn=0.0):
        """Thân ở dáng q + nút gỗ treo lệch deg độ (nút nằm sau thân)."""
        t = ve(T, n, dang(piv, k, n, axis, turn, **q), B)
        return np.where(t > 0, t, ve(N, n, dang(piv, k, n, axis, turn, quay=(NUT['piv'], deg), **q), B))

    # hít 1 giây (dáng như tranh mẫu: miệng chếch lên phải; quay trái thì game lật). Thân chỉ có 4 dáng phồng (0..3), giữ nguyên giữa các khung;
    # ba hơi hít, hơi sau phồng hơn hơi trước. Nút gỗ bật lên phía trên miệng rồi rung theo gió hút. Vệt sáng lướt hai lần.
    Q = [dict(squash=(1 - 0.015 * v, 1 + 0.015 * v), bulge=(bx, by, br * 1.4, 0.1 * v)) for v in range(4)]
    fr = []
    for i, v in enumerate([0, 1, 1, 0, 1, 2, 2, 1, 2, 3, 3, 3]):
        u = (i + 0.3) / 12
        f = khung(Q[v], -58 + 14 * max(0, 1 - u * 5) + 7 * math.sin(u * math.tau * 4))
        fr.append(loang(f, B, k, -170 + ((u * 2) % 1) * 340, 16, ['vang']))
    xuat('pb-holo', [fr], B, {'fps': 12, 'dur': 1.0, 'loop': False, 'fx': 'đồ theo tranh hu-ho-lo.png', 'note': 'Hồ Lô lúc hít linh khí (đồ lại bằng điểm ảnh theo tranh mẫu của chủ dự án): 12 khung, bụng phồng theo ba hơi, nút gỗ đung đưa, miệng chếch lên phải'}, xem)
    # phun: ba thế × 9 hướng (0..90 độ, miệng chúc theo hướng đánh): 0 căng phồng lấy đà, 1 đang phun (vươn tới, nút gỗ bị hất ngược ra sau), 2 xẹp lại
    P = [(-12, dict(squash=(0.9, 1.08), bulge=(bx, by, br * 1.4, 0.3))), (-100, dict(squash=(1.07, 0.95), bulge=(bx, by, br * 1.4, 0.1))), (-70, dict(squash=(1, 1)))]
    cells = [[khung(q, deg, d * 90 / 8 - HL['aim']) for deg, q in P] for d in range(9)]
    xuat('pb-holo-phun', cells, B, {'fps': 10, 'times': [0, 0.08, 0.42], 'dur': 0.62, 'loop': False, 'fx': 'đồ theo tranh hu-ho-lo.png', 'note': 'Hồ Lô lúc phun (đồ lại bằng điểm ảnh theo tranh mẫu của chủ dự án): ba thế × 9 hướng, miệng chúc theo hướng đánh'}, xem)


# ================================================================ Đại Ấn
# Tranh mẫu pb-dai-an.png (640 × 640): khối ấn ngọc nẹp vàng hồi văn, kỳ lân ngọc nằm trên, nhìn chếch từ trên xuống. Không có hiệu ứng vẽ sẵn.
# piv: tâm đáy khối ấn (chỗ ấn chạm đất).
DA = dict(piv=(322, 470), k=3.6, R=356)
DA_MAU = [   # ngọc bích (kỳ lân, khối ấn), nẹp vàng hồi văn
    ('ngoc', hue(62, 215), ['#0b2022>#0c2226', '#195648>#15564a', '#418767>#34896a', '#71b882>#60bd86', '#b0df9d>#a8e6a6', '#e4f3cc>#e8f8d4']),
    ('vang', hue(10, 62), ['#0d1117>#1a120e', '#503725>#5c3a1c', '#a16437>#aa6a2c', '#dd9e49>#e8a83e', '#f0d985>#ffe488']),
]


def dai_an(xem=None):
    a = biggest(load('pb-dai-an.png'))
    B = Bang(a, DA_MAU); T = B.lop(a)
    k, n, piv = DA['k'], cell(DA['k'], DA['R']), DA['piv']
    if xem:
        show(B.rgba(T), Path(xem) / 'dai-an-ban-ve.png', 2); print(' sắc độ tìm được:', B.auto())
    than = ve(T, n, dang(piv, k, n, -90), B)
    fr = [loang(than, B, k, -400 + i / 8 * 640, 26, ['ngoc', 'vang']) for i in range(8)]
    xuat('pb-an', [fr], B, {'fps': 10, 'dur': 0.8, 'loop': True, 'fx': 'đồ theo tranh pb-dai-an.png', 'note': 'Đại Ấn treo trên cao / đang giáng (đồ lại bằng điểm ảnh theo tranh mẫu của chủ dự án): 8 khung, vệt sáng lướt qua vàng và ngọc; neo ở tâm đáy'}, xem)
    fr = [ve(T, n, dang(piv, k, n, -90, squash=q), B) for q in [(0.86, 1.1), (0.95, 1.04)]] + [than]
    xuat('pb-an-dap', [fr], B, {'fps': 10, 'times': [0, 0.07, 0.15], 'dur': 0.6, 'loop': False, 'fx': 'đồ theo tranh pb-dai-an.png', 'note': 'Đại Ấn vừa nện xuống đất (đồ lại bằng điểm ảnh theo tranh mẫu của chủ dự án): bẹp xuống rồi nảy lại, nằm một nhịp'}, xem)


# ================================================================ Hộ Thuẫn
# Tranh mẫu pb-ho-thuan.png (640 × 640): tấm thuẫn mai rùa ngọc bích, khung vàng, giữa là bát quái + thái cực, hai viên ngọc trên dưới; nhìn thẳng.
# piv: tâm tấm thuẫn.
HT = dict(piv=(320, 316), k=5.6, R=260)
HT_MAU = [   # mảnh mai ngọc bích (cả mặt bát quái sáng màu), khung vàng
    ('ngoc', hue(62, 215), ['#112726>#0c2226', '#084e4d>#0a4e4c', '#26584a>#1f5e52', '#2d745f>#2c7a64', '#4f9571>#4c9c78', '#7fba8b>#84c492', '#c9e0ac>#d4ecb8']),
    ('vang', hue(10, 62), ['#170a0c>#1a120e', '#723e16>#7a4418', '#c77d2e>#c8802c', '#f1b94b>#f2bc4a', '#d9d38a>#ffe9a0']),
]


def ho_thuan(xem=None):
    a = biggest(load('pb-ho-thuan.png'))
    B = Bang(a, HT_MAU); T = B.lop(a)
    piv = HT['piv']
    if xem:
        show(B.rgba(T), Path(xem) / 'ho-thuan-ban-ve.png', 1); print(' sắc độ tìm được:', B.auto())
    for ten, k in (('pb-thuan', HT['k']), ('pb-thuan-2', HT['k'] / 1.5)):      # '-2': cỡ lớn cho phẩm cao, dựng thẳng từ bản vẽ (không phóng điểm ảnh)
        n = cell(k, HT['R']); than = ve(T, n, dang(piv, k, n), B)
        fr = [loang(than, B, k, -380 + i / 8 * 760, 30, ['ngoc', 'vang']) for i in range(8)]
        xuat(ten, [fr], B, {'fps': 10, 'dur': 0.8, 'loop': True, 'fx': 'đồ theo tranh pb-ho-thuan.png', 'note': 'Hộ Thuẫn (đồ lại bằng điểm ảnh theo tranh mẫu của chủ dự án): tấm thuẫn mai rùa bát quái hiện sau lưng người trong vòm khiên, 8 khung vệt sáng lướt; neo ở tâm'}, xem)


# ================================================================ Trận Kỳ
# Tranh mẫu pb-tran-ky.png (616 × 640): cờ đuôi nheo tím thêu bát quái vàng, cán gỗ nghiêng 10,5 độ, đầu cán bọc vàng có ngọc, dải lụa lam và kem.
# piv: mũi nhọn dưới cán (chỗ cắm xuống đất). Trục cán: x = 0,186 y + 124,5.
TK = dict(piv=(236, 598), k=4.4, R=600)
TK_MAU = [   # cán gỗ, vàng (viền, hình thêu, đầu cán, dải lụa kem), dải lụa lam, lá cờ tím
    ('go', hue(350, 24), ['#0d0605>#170a08', '#3f1c16>#45201a', '#713627>#783a28', '#954c31>#9c5230', '#c07047>#c87a48']),
    ('vang', hue(24, 70), ['#140f0a>#1a120c', '#745a38>#7a5426', '#c78e43>#c48a34', '#b49f7a>#d8b46a', '#f2c75f>#f6cc62', '#f3dd91>#ffe9a0']),
    ('lam', hue(200, 243), ['#06070e>#0a0c1e', '#1c214b>#1c2458', '#2e357e>#2e3c92', '#4558a6>#4a66c4', '#6c7db7>#86a6e8']),
    ('tim', hue(243, 300), ['#372d69>#2a1f5e', '#4e3f7e>#3d2f82', '#5d4991>#5340a2', '#6e5792>#6c58bc', '#8e7b85>#9484d6']),
]


def tran_ky(xem=None):
    a = biggest(load('pb-tran-ky.png'))
    B = Bang(a, TK_MAU); T = B.lop(a)
    for t in (2, 3, 4, 5):
        B.w[B.base[B.name['vang']] + t] = 1.45       # nét thêu vàng mảnh hơn một điểm hình: cho nặng phiếu để hình bát quái còn liền nét
    k, n, piv = TK['k'], cell(TK['k'], TK['R']), TK['piv']
    if xem:
        show(B.rgba(T), Path(xem) / 'tran-ky-ban-ve.png', 1); print(' sắc độ tìm được:', B.auto())
    vai = np.isin(np.array(B.mat), [B.name['lam'], B.name['tim'], B.name['vang']]); up, down = np.array(B.up), np.array(B.down)

    def song(x, y, w):
        """Gió thổi lá cờ: d = khoảng cách ra xa cán; càng xa cán càng phất mạnh, sóng chạy dọc lá cờ. Trả (biên độ, pha)."""
        d = (x - (0.186 * y + 124.5)) * 0.983
        return 13 * np.clip((d - 16) / 44, 0, 1) * (0.3 + 0.7 * np.clip(d / 420, 0, 1.2)), d / 240 * math.tau - w

    fr = []
    for i in range(8):
        w = i / 8 * math.tau

        def inv(ox, oy):
            x, y = (ox - n / 2) * k + piv[0], (oy - n / 2) * k + piv[1]
            A, ph = song(x, y, w)
            return x + 0.3 * A * np.cos(ph), y + A * np.sin(ph)
        f = ve(T, n, inv, B)
        rr, cc = np.mgrid[0:n, 0:n]; A, ph = song((cc - n / 2) * k + piv[0], (rr - n / 2) * k + piv[1], w)
        c = np.cos(ph + 0.9); fold = (A > 4) & vai[f]                      # nếp vải: sườn đón sáng nhạt lên một nấc, sườn khuất sẫm xuống một nấc
        f = np.where(fold & (c > 0.6), up[f], np.where(fold & (c < -0.6), down[f], f))
        fr.append(f)
    xuat('pb-co', [fr], B, {'fps': 10, 'dur': 0.8, 'loop': True, 'fx': 'đồ theo tranh pb-tran-ky.png', 'note': 'Trận Kỳ (đồ lại bằng điểm ảnh theo tranh mẫu của chủ dự án): cờ đuôi nheo tím thêu bát quái, 8 khung phất trong gió (sóng chạy dọc lá cờ, nếp vải đổi sáng tối); neo ở mũi cán cắm đất'}, xem)


ALL = {'ho-lo': ho_lo, 'dai-an': dai_an, 'ho-thuan': ho_thuan, 'tran-ky': tran_ky}

if __name__ == '__main__':
    args = sys.argv[1:]; xem = None
    if '--xem' in args:
        i = args.index('--xem'); xem = args[i + 1]; del args[i:i + 2]
    for k in args or ALL:
        ALL[k](xem)
