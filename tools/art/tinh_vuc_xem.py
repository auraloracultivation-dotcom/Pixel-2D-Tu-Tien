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
N, FPS = 96, 12                            # 8 giây một vòng
TAU = 2 * math.pi
cx, cy = W / 2, H / 2
RX = W / 2 - 3                             # như viewOf: màn dọc thì tinh đồ tròn
HINH = {'sun': 'linh-nhat', 'thien-kiem-phong': 'thien-kiem-tinh', 'thanh-khe': 'thanh-khe', 'dao-xich-dien': 'xich-diem',
        'dao-han-bang': 'han-bang', 'hac-phong-dao': 'hac-phong', 'dao-moc': 'thanh-moc', 'dao-thien-kim': 'thien-kim',
        'dao-hau-tho': 'hau-tho', 'vet-nut-ngoai': 'vet-nut-ngoai', 'mat-1': 'mat-1', 'mat-2': 'mat-2', 'ma-vuong': 'ma-vuong'}
TEN = {'sun': 'Linh Nhật', 'ma-vuong': 'Ma Vương', 'mat-1': 'Tinh cầu đã mất', 'mat-2': 'Tinh cầu đã mất'}


def duong_kinh(size, sun=False):        # đường kính trên màn (điểm màn): to hơn bản cũ để thấy rõ hình
    return 130 if sun else int(40 + size * 7)


def vi_tri():
    out = [('sun', 0.0, 0.0, SM['sun']['size'], True)]
    for b in SM['bodies']:
        r = SM['orbits']['first'] + SM['orbits']['step'] * (b['orbit'] - 1)
        a = math.radians(b['angle'])
        out.append((b.get('id') or b['map'], math.cos(a) * r, math.sin(a) * r, b['size'], False))
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


def nen(i, tkt):
    t = i / N; a = TAU * t
    img = np.zeros((H, W, 3), np.uint8); img[:] = (23, 14, 34)
    for x, y, s in SAO:
        if math.sin(a * 2 + s * 30) > -0.3:
            img[y, x] = (255, 244, 216) if s > 0.8 else (154, 138, 168)
    # vòng quỹ đạo chấm
    rr = np.hypot(xx - cx, yy - cy); th = np.arctan2(yy - cy, xx - cx)
    for o in range(1, 9):
        r = (SM['orbits']['first'] + SM['orbits']['step'] * (o - 1)) * RX
        img[(np.abs(rr - r) < 0.5) & (((th * r).astype(int) % 4) == 0)] = (96, 78, 70)
    # ma khí vòng ngoài: dồn vào từ mép, gợn
    mk = SM['makhi']['from'] * RX + 4 * np.sin(5 * th + a) + 3 * np.sin(9 * th - a)
    d = np.clip((rr - mk) / 40, 0, 1) * (0.75 + 0.25 * np.sin(rr * 0.12 - a + 3 * np.sin(2 * th)))
    for k, mau in enumerate(MA):
        img[(rr > mk) & (d > 0.08 + 0.18 * k)] = mau
    img[(rr > mk) & (rr < mk + 1.5)] = (122, 58, 160)
    # kết giới Thiên Kiếm Tinh: linh khí toả ra, ma khí từng dải bám ngoài, chỗ giằng co lõm vào
    x0, y0, R = tkt
    r2 = np.hypot(xx - x0, yy - y0); t2 = np.arctan2(yy - y0, xx - x0)
    ep = np.zeros_like(t2)
    for k in range(4):
        g = k * TAU / 4 + 0.3 * np.sin(a + k)
        dg = np.angle(np.exp(1j * (t2 - g)))
        ep = np.maximum(ep, np.exp(-(dg / 0.25) ** 2) * (0.5 + 0.5 * np.sin(a + k * 1.7)) ** 2)
    bk = R + 2 * np.sin(2 * t2 + a) - 4 * ep
    trong = (r2 <= bk) & (r2 > R * 0.55)
    lv = 1 - np.clip((r2 - R * 0.55) / (bk - R * 0.55), 0, 1)
    img[trong & caro & (lv > 0.0)] = (24, 44, 34)
    img[trong & (lv > 0.5)] = (34, 66, 44)
    img[trong & (bk - r2 < 1.5 + ep)] = (120, 180, 80)
    img[trong & (bk - r2 < 0.8) & (ep > 0.3)] = (250, 240, 170)
    vanh = (r2 > bk) & (r2 < bk + 6 + 6 * ep)
    dm = 1 - (r2 - bk) / (6 + 6 * ep)
    img[vanh & (dm > 0.5)] = MA[2]
    img[vanh & (dm <= 0.5) & caro] = MA[1]
    img[(r2 > bk) & (r2 < bk + 1.2)] = (122, 58, 160)
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
            fr = dong[k][(i * 8 // FPS) % 16]
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
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-stream_loop', '1', '-framerate', str(FPS), '-i', f'{tam}/%03d.png',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', '20', out], check=True)
    Image.open(f'{tam}/000.png').save(f'{TV}/tinh-do-xem.png')
    print(out)


if __name__ == '__main__':
    main()
