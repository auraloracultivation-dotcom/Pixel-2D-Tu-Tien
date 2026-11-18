"""Xem trước cả tinh đồ Tinh Vực với tinh cầu mới (SpriteCook) ở đúng chỗ trong data/starmap.json, cỡ màn điện thoại dọc.
Chủ dự án 19/11/2026 01:44: "phải đưa cả map tinh vực tui xem chứ gửi thế này làm sao tui biết đã đúng ý chưa".
Nền sao, vòng quỹ đạo, ma khí vòng ngoài và kết giới quanh Thiên Kiếm Tinh vẽ ở tấm nhỏ (mỗi điểm = P điểm màn) rồi phóng nguyên;
tinh cầu dán ở độ phân giải thật. Chỉ để xem, chưa phải code game.
Chạy: python3 -I tools/art/tinh_vuc_xem.py → tools/art/nguon/ai/tinh-vuc/tinh-do-xem.mp4 (+ .png)
"""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

GOC = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(GOC, 'nguon/ai/tinh-vuc')
SM = json.load(open(os.path.join(GOC, '../../data/starmap.json')))
SW, SH, P = 1080, 1920, 3                 # màn điện thoại dọc, mỗi điểm tinh đồ = 3 điểm màn
W, H = SW // P, SH // P
N, FPS = 144, 12                           # 12 giây một vòng, chậm
TAU = 2 * math.pi
cx, cy = W / 2, H / 2
RX = W / 2 - 3                             # như viewOf: màn dọc thì tinh đồ tròn
HINH = {'sun': 'linh-nhat', 'thien-kiem-phong': 'thien-kiem-tinh', 'thanh-khe': 'thanh-khe', 'dao-xich-dien': 'xich-diem',
        'dao-han-bang': 'han-bang', 'hac-phong-dao': 'hac-phong', 'dao-moc': 'thanh-moc', 'dao-thien-kim': 'thien-kim',
        'dao-hau-tho': 'hau-tho', 'vet-nut-ngoai': 'vet-nut-ngoai', 'mat-1': 'mat-1', 'mat-2': 'mat-2', 'ma-vuong': 'ma-vuong'}
TEN = {'sun': 'Linh Nhật', 'ma-vuong': 'Ma Vương', 'mat-1': 'Tinh cầu đã mất', 'mat-2': 'Tinh cầu đã mất'}


def duong_kinh(size, sun=False):        # đường kính trên màn (điểm màn): to hơn bản cũ để thấy rõ hình
    return 110 if sun else int(40 + size * 7)


def vi_tri():
    """Chủ dự án 01:48: kết giới bọc cả tinh hệ, trung tâm linh khí là Thiên Kiếm Tinh → Thiên Kiếm Tinh ở giữa,
    Linh Nhật đổi ra chỗ cũ của Thiên Kiếm Tinh (vòng 1)."""
    out = []
    for b in SM['bodies']:
        k = b.get('id') or b['map']
        if k == 'thien-kiem-phong':
            out.append((k, 0.0, 0.0, 15, False))   # to nhất tinh đồ
            a, r = math.radians(b['angle']), SM['orbits']['first']
            out.append(('sun', math.cos(a) * r, math.sin(a) * r, SM['sun']['size'], True))
            continue
        r = SM['orbits']['first'] + SM['orbits']['step'] * (b['orbit'] - 1)
        a = math.radians(b['angle'])
        out.append((k, math.cos(a) * r, math.sin(a) * r, b['size'], False))
    return out


def doc_dong(ten):
    im = Image.open(f'{TV}/dong/{ten}.webp'); L = []
    for k in range(im.n_frames):
        im.seek(k); L.append(im.convert('RGBA').copy())
    return L


yy, xx = np.mgrid[0:H, 0:W]
caro = ((xx + yy) % 2) == 0
rng = np.random.default_rng(3)
SAO = [(int(rng.integers(0, W)), int(rng.integers(0, H)), rng.random()) for _ in range(260)]
MA = [(30, 12, 42), (48, 18, 66), (70, 26, 94), (96, 38, 124)]


KG = 0.86          # bán kính kết giới (phần nửa bề rộng tinh đồ): vòng 9 (hai tinh cầu mất, Ma Vương) nằm ngoài
HAT = [(rng.random() * TAU, rng.random(), float(rng.integers(1, 3))) for _ in range(160)]
DOM = [(rng.random() * TAU, rng.random(), float(rng.integers(1, 3))) for _ in range(90)]


def ep(th, a):
    """Chỗ vòi ma khí đang ép vào kết giới (0..1): 6 vòi đung đưa, thò vào rút ra lệch pha."""
    v = np.zeros_like(np.asarray(th, float))
    for k in range(6):
        g = k * TAU / 6 + 0.3 * np.sin(a + k)
        dg = np.angle(np.exp(1j * (th - g)))
        v = np.maximum(v, np.exp(-(dg / 0.18) ** 2) * (0.5 + 0.5 * np.sin(a + k * 2.1)) ** 2)
    return v


def ban_kinh(th, a):
    return KG * RX + 3 * np.sin(3 * th + a) + 2 * np.sin(5 * th - a) - 10 * ep(th, a)


def nen(i, tkt):
    t = i / N; a = TAU * t
    img = np.zeros((H, W, 3), np.uint8); img[:] = (23, 14, 34)
    rr = np.hypot(xx - cx, yy - cy); th = np.arctan2(yy - cy, xx - cx)
    bk = ban_kinh(th, a)
    trong, ngoai = rr <= bk, rr > bk
    # Linh khí trong kết giới: sóng toả từ Thiên Kiếm Tinh ra (vòng sáng mờ chạy ra ngoài), nhạt dần về phía kết giới
    muc = 1 - np.clip(rr / bk, 0, 1)
    song = 0.5 + 0.5 * np.sin(rr * 0.09 - 3 * a + 0.8 * np.sin(4 * th + a))
    lv = 0.55 * muc + 0.45 * song * (0.4 + 0.6 * muc)
    img[trong & caro & (lv > 0.28)] = (22, 34, 34)
    img[trong & (lv > 0.48)] = (24, 40, 36)
    img[trong & caro & (lv > 0.62)] = (30, 54, 42)
    for x, y, s in SAO:
        if math.sin(a * 2 + s * 30) > -0.3:
            img[y, x] = (255, 244, 216) if s > 0.8 else (154, 138, 168)
    for o in range(1, 9):   # vòng quỹ đạo chấm
        r = (SM['orbits']['first'] + SM['orbits']['step'] * (o - 1)) * RX
        img[trong & (np.abs(rr - r) < 0.5) & (((th * r).astype(int) % 4) == 0)] = (96, 88, 70)
    # Ma khí ngoài kết giới: đặc dần ra xa, cuộn xoáy, dồn sát mép
    cuon = 0.5 + 0.25 * np.sin(rr * 0.07 - a + 3 * np.sin(2 * th + a)) + 0.25 * np.sin(6 * th + rr * 0.03 + a)
    d = np.clip(0.3 + 0.35 * cuon + 0.4 * np.clip((rr - bk) / 120, 0, 1) + 0.5 * ep(th, a) * np.clip(1 - (rr - bk) / 30, 0, 1), 0, 1)
    for k, mau in enumerate(MA):
        n0 = 0.3 + 0.17 * k
        img[ngoai & (d > n0 + 0.03)] = mau
        img[ngoai & (np.abs(d - n0) <= 0.03) & caro] = mau
    # Mép giằng co: mặt trong linh khí sáng dồn lại, mặt ngoài ma khí tím; chỗ bị ép sáng hơn
    e = ep(th, a)
    sau = bk - rr
    img[trong & (sau < 4 + 4 * e) & caro] = (70, 120, 60)
    img[trong & (sau < 2 + 2 * e)] = (120, 180, 80)
    img[trong & (sau < 1.1) & (e > 0.3)] = (250, 240, 170)
    img[ngoai & (rr - bk < 1.5)] = (122, 58, 160)
    # Hạt linh khí từ Thiên Kiếm Tinh bay ra theo đường xoắn, tới kết giới thì tan
    for g, p, v in HAT:
        q = (p + t * v) % 1.0
        g2 = g + 0.6 * q
        R = float(ban_kinh(np.array(g2), a)) - 2
        r = 22 + q * (R - 22)
        x, y = int(cx + math.cos(g2) * r), int(cy + math.sin(g2) * r)
        if 0 <= x < W - 1 and 0 <= y < H - 1:
            img[y, x] = (250, 240, 170) if q < 0.5 else (190, 220, 110)
    # Đốm ma khí trôi vào, vỡ ở kết giới
    for g, p, v in DOM:
        q = (p + t * v) % 1.0
        R = float(ban_kinh(np.array(g), a)) + 2
        r = H * 0.6 - q * (H * 0.6 - R)
        x, y = int(cx + math.cos(g) * r), int(cy + math.sin(g) * r)
        if 0 <= x < W - 1 and 0 <= y < H - 1:
            img[y:y + 2, x:x + 2] = (122, 58, 160) if q > 0.85 else MA[3]
    # Tia lửa chỗ va nhau (thưa)
    for k in range(480):
        g = k / 480 * TAU
        if float(ep(np.array(g), a)) < 0.5 or (k * 7 + i // 2) % 29:
            continue
        r = float(ban_kinh(np.array(g), a)); x, y = cx + math.cos(g) * r, cy + math.sin(g) * r
        for s_, mau in ((1, (240, 140, 255)), (-1, (255, 255, 230))):
            gg = g + 0.6 * math.sin(k * 3.1)
            for j in range(1, 3 + (k + i // 3) % 3):
                px, py = int(round(x + math.cos(gg) * j * s_)), int(round(y + math.sin(gg) * j * s_))
                if 0 <= px < W and 0 <= py < H:
                    img[py, px] = mau
    return img


def main():
    font = ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont_jp.otf', 32)
    vt = vi_tri(); dong = {k: doc_dong(HINH[k]) for k, *_ in vt}
    pos = {}
    for k, fx, fy, size, sun in vt:
        D = duong_kinh(size, sun)
        pos[k] = (SW / 2 + fx * RX * P, SH / 2 + fy * RX * P, D)
    x, y, D = pos['thien-kiem-phong']
    tkt = (x / P, y / P, D / P * 0.8)
    tam = os.path.join(TV, 'tinh-do-khung'); os.makedirs(tam, exist_ok=True)
    for i in range(N):
        img = Image.fromarray(nen(i, tkt)).resize((SW, SH), Image.NEAREST).convert('RGBA')
        for k, *_ in sorted(vt, key=lambda v: pos[v[0]][1]):
            x, y, D = pos[k]
            fr = dong[k][(i // 3) % 16]   # 4 khung/giây cho chậm
            s = D / fr.width
            fr = fr.resize((D, int(fr.height * s)), Image.NEAREST)
            img.alpha_composite(fr, (int(x - fr.width / 2), int(y - fr.height / 2)))
        dr = ImageDraw.Draw(img)
        hop = []   # như placeLabels trong game: nhãn đè nhãn đã đặt thì bỏ, Linh Nhật đặt sau cùng
        for k, fx, fy, size, sun in sorted(vt, key=lambda v: v[4]):
            x, y, D = pos[k]
            b = next((b for b in SM['bodies'] if (b.get('id') or b.get('map')) == k), {})
            ten = TEN.get(k) or b.get('name') or k
            xy, an = ((x, y - D * 0.5 - 4), 'mb') if sun else ((x, y + D * 0.42), 'mt')
            bx = dr.textbbox(xy, ten, font=font, anchor=an, stroke_width=4)
            if any(bx[0] < o[2] and bx[2] > o[0] and bx[1] < o[3] and bx[3] > o[1] for o in hop):
                continue
            hop.append(bx)
            dr.text(xy, ten, font=font, anchor=an, fill=(255, 228, 138) if sun else (244, 234, 216), stroke_width=4, stroke_fill=(27, 24, 48))
        dr.text((SW / 2, 40), SM['name'], font=ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont_jp.otf', 48),
                anchor='mt', fill=(255, 228, 138), stroke_width=5, stroke_fill=(27, 24, 48))
        img.convert('RGB').save(f'{tam}/{i:03d}.png')
    out = f'{TV}/tinh-do-xem.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-stream_loop', '0', '-framerate', str(FPS), '-i', f'{tam}/%03d.png',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', '20', out], check=True)
    Image.open(f'{tam}/000.png').save(f'{TV}/tinh-do-xem.png')
    print(out)


if __name__ == '__main__':
    main()
