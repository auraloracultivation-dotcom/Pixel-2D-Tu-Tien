"""Ghép thử tinh đồ Tinh Vực màn ngang theo bố cục ảnh GPT của chủ dự án (19/11/2026 02:20, mau/bo-cuc-gpt.png):
Linh Nhật to ở giữa, quỹ đạo elip, tinh cầu nhỏ, vòng kết giới linh khí có 8 trụ kiếm, ma khí ép từ ngoài (nặng bên phải),
chỗ ma khí chọc vào kết giới loé vết nứt. Tinh cầu, mây ma khí, tinh thể, trụ kiếm, vết nứt, vòng kết giới: SpriteCook
(dong/*.webp, hieu-ung/*.png). Code chỉ đặt chỗ, cho trôi / nhấp nháy nhẹ, chấm quỹ đạo, hạt linh khí, nhãn tên.
Chạy: python3 -I tools/art/tinh_vuc_ban_do.py → tools/art/nguon/ai/tinh-vuc/tinh-do-ngang.mp4 (+ .png)
"""
import math, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tinh_vuc_ma_gioi import MaGioi
from tinh_vuc_khai_hoang import KhaiHoang
import numpy as np
from PIL import Image, ImageDraw, ImageFont

TV = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'nguon/ai/tinh-vuc')
SW, SH = 1920, 1080
N, FPS = 288, 12          # 24 giây một vòng: mọi thứ chậm (chủ dự án 02:37)
TAU = 2 * math.pi
GX, GY = SW / 1671, SH / 941   # đổi toạ độ từ ảnh GPT
FONT = '/usr/share/fonts/opentype/unifont/unifont_jp.otf'

# (mã hình, tên, x, y trên ảnh GPT, đường kính trên màn 1080)
THIEN_THE = [
    ('linh-nhat', 'Linh Nhật', 722, 405, 150),
    ('thanh-moc', 'Thanh Mộc Tinh', 687, 195, 74),
    ('xich-diem', 'Xích Diễm Tinh', 1050, 255, 62),
    ('mat-1', 'Tinh cầu đã mất', 1362, 282, 66),
    ('ma-vuong', 'Ma Vương', 295, 410, 86),
    ('thien-kiem-tinh', 'Thiên Kiếm Tinh', 950, 478, 84),
    ('thanh-khe', 'Mảnh Vỡ Thanh Khê', 1110, 395, 48),
    ('thien-kim', 'Thiên Kim Tinh', 1290, 458, 62),
    ('hac-phong', 'Hắc Phong Tinh', 476, 543, 66),
    ('han-bang', 'Hàn Băng Tinh', 1057, 615, 62),
    ('vet-nut-ngoai', 'Ngoại Vực Vết Nứt', 1395, 585, 70),
    ('hau-tho', 'Hậu Thổ Tinh', 615, 693, 68),
    ('mat-2', 'Tinh cầu đã mất', 1063, 760, 66),
]
# Mặt trăng (SpriteCook, trang/*.png): tinh cầu mẹ, hình, khoảng cách quỹ đạo (lần bán kính mẹ), góc đầu, đường kính, chiều quay.
# Quay đúng 1 vòng mỗi vòng video (24 giây) nên nối liền; nửa sau quỹ đạo vẽ sau lưng tinh cầu mẹ.
TRANG = [('thien-kiem-tinh', 'dong-phu', 1.25, 0.6, 42, 1), ('thien-kiem-tinh', 'bi-canh', 1.6, 3.4, 38, -1),
         ('xich-diem', 'hoa-quat', 1.5, 1.0, 34, 1), ('han-bang', 'han-bang-quat', 1.5, 4.0, 34, -1),
         ('hac-phong', 'hac-phong-dong', 1.5, 2.0, 34, 1), ('thanh-moc', 'lang-tinh-linh', 1.35, 0.2, 40, 1),
         ('thanh-moc', 'co-thu-tam', 1.75, 2.3, 34, 1), ('thanh-moc', 're-mau-thu', 2.1, 4.4, 34, 1),
         ('thien-kim', 'kiem-trung', 1.5, 5.0, 36, -1), ('hau-tho', 'dia-cung', 1.5, 3.0, 36, 1),
         ('vet-nut-ngoai', 'hu-khong-lao', 1.4, 0.8, 38, -1), ('vet-nut-ngoai', 'vet-nut', 1.85, 3.9, 40, -1)]
DAO_CHIEU = ('linh-nhat', 'thien-kiem-tinh', 'hau-tho')   # đo: chỗ nối lệch > 1,6 lần bước thường
VK = 3.6                                   # vòng kết giới phóng 3,6 lần (tâm ảnh vòng 258,139; bán kính 210 × 132)
VCX, VCY, VRX, VRY = SW / 2, SH / 2, 210 * VK, 132 * VK


def doc(p):
    im = Image.open(p)
    if getattr(im, 'n_frames', 1) == 1:
        return [im.convert('RGBA')]
    L = []
    for k in range(im.n_frames):
        im.seek(k); L.append(im.convert('RGBA').copy())
    return L


def to(im, k):
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST)


def dan(nen, im, x, y, alpha=1.0):
    if alpha < 1:
        a = im.split()[3].point(lambda v: int(v * alpha)); im = im.copy(); im.putalpha(a)
    nen.alpha_composite(im, (int(x - im.width / 2), int(y - im.height / 2)))


def tren_vong(g, d=0.0):
    return VCX + math.cos(g) * (VRX + d), VCY + math.sin(g) * (VRY + d)


def set_danh(img, g, hat, f):
    """Một tia sét gấp khúc từ ngoài ma khí đánh vào điểm góc g trên kết giới; khung 0 lõi trắng, sau nhạt dần. Bám lưới 3 điểm."""
    r = np.random.default_rng(hat)
    tx, ty = tren_vong(g)
    dai = r.uniform(160, 340)
    sx_, sy_ = tx + math.cos(g + r.uniform(-0.5, 0.5)) * dai, ty + math.sin(g + r.uniform(-0.5, 0.5)) * dai * 0.8
    pts = [(sx_, sy_)]
    n = 7
    for j in range(1, n):
        u = j / n
        x = sx_ + (tx - sx_) * u + r.uniform(-28, 28) * (1 - u * 0.6)
        y = sy_ + (ty - sy_) * u + r.uniform(-28, 28) * (1 - u * 0.6)
        pts.append((x, y))
    pts.append((tx, ty))
    nhanh = []
    for _ in range(2):
        j = int(r.integers(1, n - 1)); x, y = pts[j]
        nhanh.append([(x, y), (x + r.uniform(-60, 60), y + r.uniform(-50, 50)), (x + r.uniform(-90, 90), y + r.uniform(-80, 80))])
    luoi = lambda q: [(round(x / 3) * 3, round(y / 3) * 3) for x, y in q]
    dr = ImageDraw.Draw(img)
    lop = [((150, 50, 220), 18), ((230, 110, 255), 9), ((255, 240, 255), 4)] if f == 0 else \
          [((150, 50, 220), 12), ((240, 140, 255), 6)] if f == 1 else [((120, 40, 190), 6), ((200, 100, 240), 3)] if f == 2 else [((90, 30, 140), 3)]
    for mau, w in lop:
        dr.line(luoi(pts), fill=mau, width=w)
        for q in nhanh:
            dr.line(luoi(q), fill=mau, width=max(3, w - 3))


def nen_sao():
    rng = np.random.default_rng(11)
    img = np.zeros((SH // 3, SW // 3, 3), np.uint8); img[:] = (12, 10, 30)
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    # tinh vân tím mờ ở các góc, xanh thẫm giữa
    for cx, cy, r, c in ((0, 0, 260, (34, 18, 60)), (w, h, 300, (40, 16, 64)), (w, 0, 220, (36, 14, 58)), (0, h, 220, (30, 16, 56))):
        d = np.hypot(xx - cx, yy - cy)
        m = (d < r) & ((xx + yy) % 2 == 0) & ((d < r * 0.6) | ((xx * 3 + yy) % 5 == 0))
        img[m] = c
    sao = [(int(rng.integers(0, w)), int(rng.integers(0, h)), rng.random()) for _ in range(380)]
    return Image.fromarray(img).resize((SW, SH), Image.NEAREST).convert('RGBA'), sao


def nhan(dr, x, y, ten, font, to_=False):
    w = dr.textlength(ten, font=font)
    pad, hh = (14, 34) if to_ else (10, 26)
    x0, x1, y0 = x - w / 2 - pad, x + w / 2 + pad, y
    dr.rounded_rectangle((x0, y0, x1, y0 + hh), radius=6, fill=(26, 16, 34), outline=(214, 160, 70), width=3)
    dr.rounded_rectangle((x0 + 4, y0 + 4, x1 - 4, y0 + hh - 4), radius=4, outline=(110, 70, 40), width=1)
    dr.text((x, y0 + hh / 2), ten, font=font, anchor='mm', fill=(255, 236, 190))


def main():
    HU = f'{TV}/hieu-ung'
    vong = to(doc(f'{HU}/vong.png')[0], VK)
    # 02:52 "thu mỏng vòng": gọt mặt nạ trong suốt (lọc min) cho dải sét mảnh lại, giữ nguyên màu điểm ảnh còn lại
    from PIL import ImageFilter
    am = vong.split()[3].filter(ImageFilter.MinFilter(7))
    vong.putalpha(am)
    vs = np.array(vong).astype(float)                       # bản sáng: kéo về vàng trắng, giữ nét
    vs[..., :3] = np.clip(vs[..., :3] * 0.55 + np.array([235, 255, 190]) * 0.45, 0, 255)
    vong_sang = Image.fromarray(vs.astype(np.uint8))
    may1, may2, may3 = (doc(f'{HU}/{n}.png')[0] for n in ('may-1', 'may-2', 'may-3'))
    tinh_the, tru, nut = (doc(f'{HU}/{n}.png')[0] for n in ('tinh-the', 'tru-kiem', 'vet-nut'))
    tru = to(tru, 0.62); tinh_the = to(tinh_the, 1.3); nut = to(nut, 0.95)
    # Tinh cầu khai hoang mẫu (tên tông bịa để xem): quỹ đạo ngoài cùng trong kết giới (chủ dự án 03:08)
    def kh_vt(g):
        return VCX + math.cos(g) * VRX * 0.85, VCY + math.sin(g) * VRY * 0.82
    KH_MAU = [('rung', 5, False, 'Thanh Vân Tông', (80, 200, 120), 1, -2.55), ('co', 2, False, 'Bạch Hạc Môn', (230, 230, 240), 2, -1.3),
              ('tuyet', 4, False, 'Hàn Nguyệt Cung', (120, 180, 255), 3, -0.95), ('tro', 3, False, 'Xích Hỏa Bang', (230, 80, 60), 4, 0.75),
              ('cat', 1, False, 'Kim Sa Phái', (240, 200, 80), 5, 1.9), ('da-den', 2, True, 'Tinh cầu vô chủ', (0, 0, 0), 6, 2.3),
              ('hau-tho', 3, False, 'Địa Long Các', (200, 130, 70), 7, 2.75)]
    kh = KhaiHoang(f'{TV}/khai-hoang', to, [(d_, c, tr, t, m, h, *kh_vt(g)) for d_, c, tr, t, m, h, g in KH_MAU])
    font_kh = ImageFont.truetype(FONT, 16)
    anh_trang = {t: to(doc(f'{TV}/trang/{t}.png')[0], d / 128) for _, t, _, _, d, _ in TRANG}
    hinh = {m: [to(f, d / f.width * 1.18) for f in doc(f'{TV}/dong/{m}.webp')] for m, _, _, _, d in THIEN_THE}
    for m in DAO_CHIEU:   # khung cuối không khớp khung đầu: chạy tới rồi chạy lùi để nối vòng liền (0..15, 15..0)
        hinh[m] = hinh[m] + hinh[m][::-1]
    nen, sao = nen_sao()
    mg = MaGioi(SW // 3, SH // 3, VCX / 3, VCY / 3, 200 * VK / 3, 125 * VK / 3, N)
    font, font_to = ImageFont.truetype(FONT, 20), ImageFont.truetype(FONT, 34)
    # Ma khí bên ngoài: (hình, x, y, phóng, lật, pha) — dày bên phải như ảnh mẫu
    MAY = [(may2, 1790, 250, 1.6, False, 0), (may2, 1830, 640, 1.7, False, 1.5), (may2, 1700, 980, 1.4, False, 3),
           (may1, 1650, 70, 1.4, False, 2), (may1, 1500, 1030, 1.5, True, 4), (may1, 160, 1030, 1.3, False, 5),
           (may1, 120, 60, 1.2, True, 1), (may2, 60, 520, 1.2, True, 2.5),
           (may3, 1560, 160, 0.9, False, 0.7), (may3, 1600, 860, 1.0, False, 2.2), (may3, 300, 950, 0.8, False, 3.3),
           # 02:44: che mép bằng của tường mây (ảnh may-2 bị cắt phẳng trên dưới) và hai góc dưới còn hở
           (may1, 110, 300, 1.1, True, 0.9), (may3, 50, 250, 0.9, False, 1.7),
           (may1, 110, 800, 1.4, False, 2.9), (may1, 40, 930, 1.3, True, 4.4), (may3, 250, 770, 0.9, False, 5.5),
           (may1, 1720, 880, 1.4, True, 3.6), (may1, 1860, 1010, 1.3, False, 0.4), (may3, 1640, 990, 1.0, False, 1.2),
           (may3, 1860, 840, 0.9, False, 2.8)]
    MAY = [(to(im.transpose(Image.FLIP_LEFT_RIGHT) if lat else im, k), x, y, ph) for im, x, y, k, lat, ph in MAY]
    TINH_THE = [(1760, 120, 0), (1840, 420, 1.3), (1700, 560, 2.6), (1820, 820, 3.9), (1610, 330, 5.1)]
    # Ma tộc công kích rìa tinh hệ (chủ dự án 02:42: nhanh, lâu lâu một chớp, lâu lâu vài tia sét đánh vào rìa):
    # mỗi vòng 24 giây có 6 chớp vết nứt và 4 loạt sét 2–4 tia; mỗi lần chỉ sáng vài khung rồi tắt. Phía phải (ma khí dày) nhiều hơn.
    rc = np.random.default_rng(42)
    def goc_ra():
        return float(rc.uniform(-1.1, 1.1)) if rc.random() < 0.75 else float(rc.uniform(math.pi - 0.9, math.pi + 0.9))
    CHOP = [(int(k * N / 6 + rc.integers(0, N // 12)), goc_ra()) for k in range(6)]
    SET = []
    for k in range(4):
        k0, g0 = int(k * N / 4 + rc.integers(N // 24, N // 10)), goc_ra()
        for j in range(int(rc.integers(2, 5))):
            SET.append((k0 + int(rc.integers(0, 6)), g0 + float(rc.uniform(-0.25, 0.25)), int(rc.integers(0, 10 ** 6))))
    TRU = [k * TAU / 8 for k in range(8)]
    rng = np.random.default_rng(5)
    HAT = [(rng.random() * TAU, rng.random(), 0.8 + rng.random() * 0.6) for _ in range(90)]
    sx, sy = 722 * GX, 405 * GY
    tam = f'{TV}/tinh-do-ngang-khung'; os.makedirs(tam, exist_ok=True)
    for i in range(N):
        t = i / N; a = TAU * t
        ma = mg.khung(i)
        img = Image.fromarray(np.where(mg.ngoai[..., None], ma, np.array(nen.convert('RGB'))[::3, ::3])).resize((SW, SH), Image.NEAREST).convert('RGBA')
        dr = ImageDraw.Draw(img)
        for x, y, s in sao:
            if mg.ngoai[min(y, mg.H - 1), min(x, mg.W - 1)]:
                continue
            if math.sin(a * 2 + s * 40) > -0.3:
                c = (255, 244, 216) if s > 0.85 else (150, 140, 200)
                dr.rectangle((x * 3, y * 3, x * 3 + 2, y * 3 + 2), fill=c)
                if s > 0.97:
                    dr.rectangle((x * 3 - 6, y * 3, x * 3 + 8, y * 3 + 2), fill=(200, 180, 255)); dr.rectangle((x * 3, y * 3 - 6, x * 3 + 2, y * 3 + 8), fill=(200, 180, 255))
        # quỹ đạo chấm quanh Linh Nhật
        for k in range(1, 8):
            rx, ry = 95 + k * 92, (95 + k * 92) * 0.6
            n = int(rx * 0.5)
            for j in range(0, n, 2):
                g = j / n * TAU
                x, y = sx + math.cos(g) * rx, sy + math.sin(g) * ry
                if ((x - VCX) / VRX) ** 2 + ((y - VCY) / VRY) ** 2 < 0.93:
                    dr.rectangle((x, y, x + 2, y + 2), fill=(120, 100, 80))
        # hạt linh khí toả từ Linh Nhật ra tới kết giới
        for g, p, v in HAT:
            q = (p + t * v) % 1.0
            x, y = sx + math.cos(g) * (130 + q * (VRX - 160)), sy + math.sin(g) * (80 + q * (VRY - 110))
            c = (250, 240, 170) if q < 0.4 else (150, 220, 90)
            dr.rectangle((x, y, x + 2, y + 2), fill=c)
        # ma khí trôi qua lại chậm, tinh thể bồng bềnh
        for im, x, y, ph in MAY:   # mây ma khí SpriteCook giữ nguyên, lớp code chỉ lấp chỗ trống bên dưới
            dan(img, im, x + 10 * math.sin(a + ph), y + 4 * math.sin(a + ph * 2))
        for x, y, ph in TINH_THE:
            dan(img, tinh_the, x, y + 8 * math.sin(a + ph))
        # vòng kết giới: sáng tối theo nhịp thở
        # pháp trận hộ tông: bình thường tối dần, bị đánh thì sáng lên, đánh càng dồn càng sáng, rồi mờ dần (02:47)
        E = sum(0.6 * math.exp(-((i - k0) % N) / 6) for k0, _ in CHOP) + sum(0.35 * math.exp(-((i - k0) % N) / 6) for k0, _, _ in SET)
        dan(img, vong, VCX, VCY, 0.38 + 0.3 * min(1, E) + 0.04 * math.sin(a * 3))
        if E > 0.04:
            dan(img, vong_sang, VCX, VCY, min(1.0, E * 0.8))
        for g in TRU:
            x, y = tren_vong(g)
            dan(img, tru, x, y - 10 + 4 * math.sin(a + g))
        for k0, g in CHOP:   # chớp vết nứt: bùng to rồi co lại trong 5 khung (~0,4 giây)
            f = (i - k0) % N
            if f < 5:
                x, y = tren_vong(g)
                dan(img, to(nut, (1.25, 1.05, 0.85, 0.7, 0.55)[f]), x, y, (1, 1, 0.8, 0.55, 0.3)[f])
        for k0, g, hat in SET:   # tia sét từ ma khí đánh vào rìa kết giới, sáng 4 khung
            f = (i - k0) % N
            if f < 4:
                set_danh(img, g, hat, f)
                if f < 2:
                    x, y = tren_vong(g)
                    dan(img, to(nut, 0.45 - 0.1 * f), x, y, 0.9)
        # tinh cầu
        vt_trang = []
        for me, t_, kc, g0, dd, chieu in TRANG:
            pm = next(v for v in THIEN_THE if v[0] == me)
            g = g0 + chieu * a
            r = pm[4] / 2 * kc + dd / 2
            vt_trang.append((math.sin(g) < 0, pm[2] * GX + math.cos(g) * r, pm[3] * GY + math.sin(g) * r * 0.55, t_))
        for sau, x, y, t_ in vt_trang:
            if sau:
                dan(img, anh_trang[t_], x, y)
        for m, ten, gx, gy, d in THIEN_THE:
            fr = hinh[m][(i // 3) % len(hinh[m])]   # 4 khung/giây (bản gốc 8): chậm lại
            x, y = gx * GX, gy * GY
            if m == 'thien-kiem-tinh':   # quầng xanh và kiếm trấn phía trên như ảnh mẫu
                for j in range(40):
                    g = j / 40 * TAU + a
                    dr.rectangle((x + math.cos(g) * d * 0.78, y + 8 + math.sin(g) * d * 0.3, x + math.cos(g) * d * 0.78 + 3, y + 11 + math.sin(g) * d * 0.3), fill=(120, 230, 90))
                dan(img, to(tru, 0.6), x, y - d * 0.95 + 3 * math.sin(a * 2))
            dan(img, fr, x, y)
        for sau, x, y, t_ in vt_trang:
            if not sau:
                dan(img, anh_trang[t_], x, y)
        kh.ve(img, ImageDraw.Draw(img), a, dan)
        dr = ImageDraw.Draw(img)
        for m, ten, gx, gy, d in THIEN_THE:
            nhan(dr, gx * GX, gy * GY + d * 0.55, ten, font)
        kh.nhan(dr, font_kh)
        # bảng tên tinh hệ góc trái trên
        dr.rounded_rectangle((24, 22, 440, 132), radius=10, fill=(26, 16, 34), outline=(214, 160, 70), width=4)
        dr.text((232, 58), 'Tinh Hệ Thiên Kiếm', font=font_to, anchor='mm', fill=(255, 214, 110))
        dr.text((232, 105), 'Phòng Tuyến Cuối Cùng', font=font, anchor='mm', fill=(244, 234, 216))
        img.convert('RGB').save(f'{tam}/{i:03d}.png')
    out = f'{TV}/tinh-do-ngang.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-stream_loop', '1', '-framerate', str(FPS), '-i', f'{tam}/%03d.png',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', '20', out], check=True)
    Image.open(f'{tam}/000.png').save(f'{TV}/tinh-do-ngang.png')
    print(out)


if __name__ == '__main__':
    main()
