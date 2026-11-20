"""Máy lọc hình SpriteCook phần NỀN cho các tinh cầu khác Thiên Kiếm Tinh (chủ dự án 21/11/2026 02:3x "Làm toàn bộ nha, nền và cây,
hoa cỏ"). Nguồn: tools/art/nguon/ai/the-gioi/tc/ (sổ việc so.json). Ra: assets/art/nen-tc-<tinh cầu>-<lớp>.png + data/art.json.
Mỗi tinh cầu một bộ theo hệ, cùng cỡ điểm với Thiên Kiếm Tinh (ô 32 điểm = 1 ô bản đồ), vẽ ở src/world/draw-nen.js:
  nuoc  bộ hai mặt (nền ↔ nước / dung nham / hồ băng / khe hư không). Hậu Thổ bản a thiếu khung 12 (nước đặc): ghép lại từ bốn góc nước
        đối diện của bốn khung chỉ có một góc đất.
  dat   đường mòn; Hắc Phong và Thiên Kim bản SpriteCook hỏng (sỏi nhạt bị coi là nền trắng) nên lấy đường đất Thiên Kiếm Tinh ngả tông.
  mep   mép tinh cầu; mặt đất của bộ mép kéo 60% về bảng màu nền (như sc_tk.py làm với cỏ) cho khỏi thành đường viền chói.
  vach, nui  dải vách đá dưới đáy tinh cầu, nền đá chân núi: hình Thiên Kiếm Tinh ngả theo dải màu đá của từng tinh cầu (luật 4: bảng màu
        chung, mỗi tinh cầu chỉ ngả tông).
  hoa   5 cụm đồ nhỏ in nền: lấy ở hàng dưới tấm đồ vật của tinh cầu (tools/art/sc_tc_do.py ghi ra trước).
  them  lớp phủ thêm: mặt băng (Hàn Băng ô i), ruộng bậc thang (Hậu Thổ ô y), sàn gỗ (Làng Tinh Linh ô l).
Thanh Khê, Làng Tinh Linh dùng nền Thiên Kiếm Tinh (cỏ, nước, đường đất y hệt).
Chạy: cd tools/art && python3 sc_tc_do.py && python3 sc_tc.py"""
import hashlib
import json

import numpy as np
from PIL import Image

from png_nho import luu
from sc_tk import ART, OUT, ROOT, SCALE
from sc_tk2 import ghi_le_hoi

SRC = ROOT / 'tools/art/nguon/ai/the-gioi/tc'
P = 32
# dải màu đá (tối → sáng) của vách, chân núi, đường ngả tông
DA = {
    'xd': ['#120e12', '#221a1c', '#382a28', '#563c34', '#7a5242'],
    'hb': ['#2a3a54', '#465c7c', '#7890ac', '#aec2d6', '#e2ecf4'],
    'hp': ['#1a1622', '#2c2636', '#443c52', '#5c5468', '#7c748c'],
    'tm': ['#241a12', '#3e2e1e', '#5c4630', '#7e6440', '#9e8456'],
    'tkim': ['#5a3a1a', '#88582a', '#ae783a', '#d49e4e', '#eec676'],
    'ht': ['#381c10', '#5a301e', '#82462a', '#aa663e', '#cc8656'],
    'nv': ['#0c0814', '#1c1230', '#32204c', '#4c3272', '#7650a4'],
}
# tinh cầu: bộ hai mặt (tệp), đường (tệp, hoặc 'tk:<hệ số sáng>' = đường đất Thiên Kiếm Tinh ngả theo nền), lớp thêm
TC = {
    'xd': {'nuoc': 'xd-nuoc-b', 'dat': 'xd-dat'},
    'hb': {'nuoc': 'hb-nuoc-b', 'dat': 'hb-dat', 'them': {'bang': 'hb-bang'}},
    'hp': {'nuoc': 'hp-nuoc-a', 'dat': 'tk:1.35'},
    'tm': {'nuoc': 'tm-nuoc-a'},
    'tkim': {'nuoc': 'tkim-nuoc-b', 'dat': 'tk:0.82'},
    'ht': {'nuoc': 'ht-nuoc-a', 'dat': None, 'sua12': True, 'them': {'ruong': 'ht-ruong'}},
    'nv': {'nuoc': 'nv-nuoc-a'},
    'ltl': {'them': {'go': 'ltl-go-b'}},
}
HOA = (72, 44)
# sân lát (ô 1, 2 phố hội; bãi mộ kiếm g; đường đá lát o) và phố gạch: hình Thiên Kiếm Tinh ngả theo tông đá sáng của tinh cầu
SAN = {
    'xd': ['#2a2224', '#463a38', '#64524a', '#86705e', '#a88c74'],
    'hb': ['#5a6e8a', '#7e94b0', '#a6bcd2', '#cddbe8', '#eef4fa'],
    'tkim': ['#6a5034', '#8e7048', '#b0905e', '#ccac78', '#e6ca98'],
    'ht': ['#5a3c28', '#7a5638', '#9a744c', '#b89262', '#d4b07e'],
}
# đá chân núi đứng trên ô núi '^' (ô vốn chắn, nên kiểu chân 'nho' không chắn thêm): đá núi Thiên Kiếm Tinh ngả tông từng tinh cầu
NUI = ['da-nui-1', 'da-nui-2', 'da-nui-3', 'da-nui-4', 'nui-doi-1', 'nui-doi-2']


def hx(c):
    return [int(c[i:i + 2], 16) for i in (1, 3, 5)]


def lum(a):
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def khung(a, f):
    return a[(f >> 2) * P:(f >> 2) * P + P, (f % 4) * P:(f % 4) * P + P]


def bang_mau(a):
    """Bảng màu một khung (điểm đục), xếp theo độ sáng."""
    r = a.reshape(-1, 4)
    r = r[r[:, 3] > 0]
    return r[np.argsort(lum(r.astype(float)))]


def theo_bang(a, mask, ref, k=1.0):
    """Đổi màu các điểm mask theo thứ hạng độ sáng sang bảng ref, trộn k (0..1)."""
    L = lum(a[mask].astype(float))
    if not len(L):
        return
    rk = np.argsort(np.argsort(L)) / max(1, len(L) - 1)
    new = ref[(rk * (len(ref) - 1)).astype(int)][:, :3].astype(float)
    a[mask, :3] = (a[mask, :3] * (1 - k) + new * k).astype(np.uint8)


def ngả(im, ramp, k=1.0):
    """Ngả cả hình về dải màu ramp theo độ sáng (giữ kênh trong suốt)."""
    a = np.array(im.convert('RGBA'))
    m = a[..., 3] > 0
    L = lum(a[m].astype(float))
    lo, hi = np.percentile(L, 2), np.percentile(L, 98)
    t = np.clip((L - lo) / max(1, hi - lo), 0, 1) * (len(ramp) - 1)
    R = np.array([hx(c) for c in ramp], float)
    i0 = np.floor(t).astype(int).clip(0, len(ramp) - 2)
    c = R[i0] * (1 - (t - i0))[:, None] + R[i0 + 1] * (t - i0)[:, None]
    a[m, :3] = (a[m, :3] * (1 - k) + c * k).astype(np.uint8)
    return Image.fromarray(a)


def sua12(a):
    """Khung 12 (mặt hai đặc) ghép từ góc đối diện của bốn khung có một góc mặt một: mặt nạ 8 → góc trên trái, 4 → trên phải,
    2 → dưới trái, 1 → dưới phải (FRAME của SpriteCook: 8→13, 4→0, 2→8, 1→15)."""
    h = P // 2
    out = np.zeros((P, P, 4), np.uint8)
    for f, (oy, ox) in ((13, (0, 0)), (0, (0, h)), (8, (h, 0)), (15, (h, h))):
        out[oy:oy + h, ox:ox + h] = khung(a, f)[oy:oy + h, ox:ox + h]
    a[(12 >> 2) * P:(12 >> 2) * P + P, (12 % 4) * P:(12 % 4) * P + P] = out


def mep(tc, nen6):
    """Bộ mép: điểm cùng màu mặt đất của chính bộ mép kéo 60% về bảng nền; khung đặc = mảnh nền."""
    a = np.array(Image.open(SRC / f'{tc}-mep.png').convert('RGBA'))
    own = {tuple(c) for c in bang_mau(khung(a, 6))[:, :3]}
    m = np.zeros(a.shape[:2], bool)
    rgb = a[..., :3]
    for (y, x) in zip(*np.where(a[..., 3] > 0)):
        m[y, x] = tuple(rgb[y, x]) in own
    theo_bang(a, m, bang_mau(nen6), 0.6)
    a[(6 >> 2) * P:(6 >> 2) * P + P, (6 % 4) * P:(6 % 4) * P + P] = nen6
    return Image.fromarray(a)


def hoa_tam(tc):
    """Tấm 5 đồ nhỏ in nền: mỗi món một ô 72×44, chân ở giữa đáy (sc_tc_do.py ghi tc/<tc>-nho-<i>.png)."""
    w, h = HOA
    out = Image.new('RGBA', (w * 5, h), (0, 0, 0, 0))
    for i in range(5):
        f = SRC / 'cat' / f'{tc}-nho-{i}.png'
        im = Image.open(f).convert('RGBA')
        im = im.crop((max(0, (im.width - w) // 2), max(0, im.height - h), min(im.width, (im.width + w) // 2), im.height))
        out.alpha_composite(im, (i * w + (w - im.width) // 2, h - im.height))
    return out


def main():
    art = json.loads(ART.read_text(encoding='utf-8'))
    S = art['sprites']

    def save(sid, im, extra):
        f = OUT / (sid.replace('.', '-') + '.png')
        luu(im, f)
        S[sid] = {'file': f'assets/art/{f.name}', 'v': hashlib.sha1(f.read_bytes()).hexdigest()[:8], **extra}
        print(sid, im.size)

    bo = lambda note: {'w': P, 'h': P, 'frames': 4, 'rows': 4, 'anchor': [0, 0],
                       'note': f'SpriteCook bộ nền 15 mảnh lưới đôi, ô 32 điểm: {note} (tools/art/sc_tc.py)'}
    tk = lambda n: Image.open(OUT / f'nen-tk-{n}.png').convert('RGBA')
    for tc, o in TC.items():
        if o.get('nuoc'):
            a = np.array(Image.open(SRC / f"{o['nuoc']}.png").convert('RGBA'))
            if o.get('sua12'):
                sua12(a)
            nen6 = khung(a, 6).copy()
            save(f'nen.tc-{tc}-nuoc', Image.fromarray(a), bo('nền ↔ mặt hai (nước, dung nham, hồ băng, khe hư không)'))
            d = o.get('dat')
            if d and d.startswith('tk:'):   # đường đất Thiên Kiếm Tinh ngả theo bảng nền, sáng/tối hơn nền cho rõ lối
                ramp = ['#%02x%02x%02x' % tuple(int(min(255, v * float(d[3:]))) for v in c[:3]) for c in bang_mau(nen6)[::max(1, len(bang_mau(nen6)) // 5)]]
                save(f'nen.tc-{tc}-dat', ngả(tk('dat'), ramp), bo('đường mòn (đường đất Thiên Kiếm Tinh ngả theo nền)'))
            elif d:
                save(f'nen.tc-{tc}-dat', Image.open(SRC / f'{d}.png').convert('RGBA'), bo('đường mòn'))
            save(f'nen.tc-{tc}-mep', mep(tc, nen6), bo('mép tinh cầu'))
            ramp = DA[tc]
            v = ngả(tk('vach'), ramp)
            save(f'nen.tc-{tc}-vach', v, {'w': v.width, 'h': v.height, 'frames': 1, 'anchor': [0, 0],
                                          'note': 'dải vách đá dưới đáy tinh cầu: hình Thiên Kiếm Tinh ngả tông đá của tinh cầu (tools/art/sc_tc.py)'})
            save(f'nen.tc-{tc}-nui', ngả(tk('nui'), ramp), bo('nền đá chân núi (Thiên Kiếm Tinh ngả tông)'))
            if tc in SAN:
                save(f'nen.tc-{tc}-san', ngả(tk('san'), SAN[tc], 0.8), bo('sân lát đá (Thiên Kiếm Tinh ngả tông)'))
                save(f'nen.tc-{tc}-gach', ngả(tk('gach'), SAN[tc], 0.8), bo('phố gạch (Thiên Kiếm Tinh ngả tông)'))
            for k in NUI:
                im = ngả(Image.open(OUT / f'tk-{k}-sc.png').convert('RGBA'), ramp, 0.85)
                save(f'tc.{k}-{tc}-sc', im, {'w': im.width, 'h': im.height, 'frames': 1, 'anchor': [im.width // 2, im.height - 2], 'scale': SCALE,
                                              'note': 'đá chân núi Thiên Kiếm Tinh ngả tông đá của tinh cầu (tools/art/sc_tc.py)'})
        for k, f in o.get('them', {}).items():
            save(f'nen.tc-{tc}-{k}', Image.open(SRC / f'{f}.png').convert('RGBA'), bo({'bang': 'mặt băng', 'ruong': 'ruộng bậc thang', 'go': 'sàn gỗ'}[k]))
        w, h = HOA
        if (SRC / 'cat' / f'{tc}-nho-0.png').exists():
            save(f'nen.tc-{tc}-hoa', hoa_tam(tc), {'w': w, 'h': h, 'frames': 5, 'anchor': [w // 2, h],
                                                   'note': 'SpriteCook: 5 đồ nhỏ in vào nền (tools/art/sc_tc.py)'})
    ART.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    ghi_le_hoi({}, {f'tc.{k}-': 'nho' for k in NUI}, {})


if __name__ == '__main__':
    main()
