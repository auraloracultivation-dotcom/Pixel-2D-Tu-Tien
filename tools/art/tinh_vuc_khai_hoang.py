"""Tinh cầu khai hoang do người chơi tạo trên tinh đồ (chủ dự án 19/11/2026 03:05–03:08: "84 credit", "trong kết giới, vòng ngoài cùng").
7 hình SpriteCook theo loại đất (nguon/ai/tinh-vuc/khai-hoang/<đất>.png, khớp data/khai-hoang.json → grounds); code biến tấu
cho mỗi tinh cầu một vẻ theo hạt giống: lật ngang, lệch sắc màu nhẹ (±14°), cỡ theo cấp; cấp 3+ có vành sáng quay chậm, cấp 5 thêm
quầng; cờ tông môn cắm trên đỉnh theo màu tông; tinh cầu bỏ trống thì tối, nhạt màu, không cờ.
"""
import math
import numpy as np
from PIL import Image

TAU = 2 * math.pi


def lech_sac(im, do):
    """Xoay sắc màu do độ (giữ độ sáng, độ đậm, trong suốt) cho điểm ảnh phẳng không bị nhoè."""
    a = im.split()[3]
    h, s, v = im.convert('RGB').convert('HSV').split()
    h = h.point(lambda x: int(x + do / 360 * 255) % 256)
    out = Image.merge('HSV', (h, s, v)).convert('RGBA'); out.putalpha(a)
    return out


def tat_mau(im, k=0.45, toi=0.78):
    """Bỏ trống: nhạt màu và tối đi."""
    x = np.array(im).astype(float)
    xam = x[..., :3].mean(2, keepdims=True)
    x[..., :3] = (x[..., :3] * (1 - k) + xam * k) * toi
    return Image.fromarray(x.clip(0, 255).astype(np.uint8))


class KhaiHoang:
    def __init__(self, thu_muc, to, ds):
        """ds: [(đất, cấp, trống, tên tông/tinh cầu, màu cờ (r,g,b), hạt giống, x, y)]"""
        self.ds = []
        for dat, cap, trong, ten, mau, hat, x, y in ds:
            r = np.random.default_rng(hat)
            im = Image.open(f'{thu_muc}/{dat}.png').convert('RGBA')
            if r.random() < 0.5:
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            im = lech_sac(im, float(r.uniform(-14, 14)))
            if trong:
                im = tat_mau(im)
            d = 34 + 7 * cap
            self.ds.append(dict(im=to(im, d / im.width * 1.1), d=d, cap=cap, trong=trong, ten=ten, mau=mau, x=x, y=y, ph=float(r.random() * TAU)))

    def ve(self, img, dr, a, dan):
        for p in self.ds:
            x, y, d = p['x'], p['y'], p['d']
            if p['cap'] >= 5 and not p['trong']:   # quầng cấp 5: chấm vàng nhạt nhấp nháy quanh tinh cầu
                for j in range(28):
                    g = j / 28 * TAU
                    if math.sin(a * 2 + j * 1.7 + p['ph']) > 0.2:
                        dr.rectangle((x + math.cos(g) * d * 0.68, y + math.sin(g) * d * 0.68, x + math.cos(g) * d * 0.68 + 2, y + math.sin(g) * d * 0.68 + 2), fill=(255, 226, 140))
            sau, truoc = [], []
            if p['cap'] >= 3 and not p['trong']:   # vành sáng quay chậm, nửa sau khuất sau tinh cầu
                for j in range(36):
                    g = j / 36 * TAU + a + p['ph']
                    pt = (x + math.cos(g) * d * 0.85, y + math.sin(g) * d * 0.22)
                    (sau if math.sin(g) < 0 else truoc).append(pt)
            for px_, py_ in sau:
                dr.rectangle((px_, py_, px_ + 2, py_ + 2), fill=(170, 150, 110))
            dan(img, p['im'], x, y)
            for px_, py_ in truoc:
                dr.rectangle((px_, py_, px_ + 2, py_ + 2), fill=(255, 220, 140))
            if not p['trong']:   # cờ tông môn: cán bạc, lá cờ màu tông bay phấp phới
                cx, cy = x + d * 0.12, y - d * 0.5
                dr.rectangle((cx, cy - 21, cx + 2, cy + 3), fill=(220, 220, 230))
                for k in range(5):
                    lay = round(1.5 * math.sin(a * 6 + k * 0.9 + p['ph']))
                    dr.rectangle((cx + 3 + k * 3, cy - 21 + lay, cx + 5 + k * 3, cy - 12 + lay), fill=p['mau'])
                dr.rectangle((cx + 3, cy - 21 + round(1.5 * math.sin(a * 6 + p['ph'])), cx + 17, cy - 20), fill=tuple(min(255, c + 60) for c in p['mau']))

    def nhan(self, dr, font):
        for p in self.ds:
            ten = p['ten'] + (' (bỏ trống)' if p['trong'] else f"  ·  cấp {p['cap']}")
            w = dr.textlength(ten, font=font)
            x, y = p['x'], p['y'] + p['d'] * 0.55
            vien = (110, 110, 120) if p['trong'] else p['mau']
            dr.rounded_rectangle((x - w / 2 - 8, y, x + w / 2 + 8, y + 24), radius=5, fill=(18, 14, 30), outline=vien, width=2)
            dr.text((x, y + 12), ten, font=font, anchor='mm', fill=(150, 150, 160) if p['trong'] else (230, 236, 255))
