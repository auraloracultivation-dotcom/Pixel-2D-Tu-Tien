"""Kết giới Thiên Kiếm Tinh: bản xem trước hiệu ứng (chủ dự án 19/11/2026 01:32: "Thiên Kiếm Tinh đang toả ra linh khí,
ma khí bên ngoài đang xâm lấn, tạo thành một cái ranh giới"). Vẽ bằng code, điểm ảnh phẳng ít sắc độ, không tốn credit.
Lớp: nền sao → ma khí tím đen bò từ ngoài vào (vòi ma khí thò vào rồi rụt lại) → vầng linh khí vàng lục trong kết giới →
vòng kết giới gợn theo chỗ bị ép, loé sáng chỗ ma khí chạm vào → tinh cầu chuyển động 16 khung (SpriteCook) ở giữa.
Một vòng lặp 12 giây (144 khung, 12 khung/giây), mọi thứ chạy theo sin của thời gian nên nối vòng không giật.
Chạy: python3 -I tools/art/tinh_vuc_ket_gioi.py  → tools/art/nguon/ai/tinh-vuc/ket-gioi.mp4 (+ .gif)
"""
import math, os, subprocess
import numpy as np
from PIL import Image

GOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'nguon/ai/tinh-vuc')
W = H = 300          # khung điểm ảnh thật
ZOOM = 3             # phóng to để xem (nearest)
N = 144              # số khung một vòng (12 giây, chậm như hơi thở)
R0 = 108             # bán kính kết giới
TAU = 2 * math.pi

# Bảng màu ít sắc độ
NEN = (16, 10, 26)
MA = [(30, 12, 42), (48, 18, 66), (70, 26, 94), (96, 38, 124)]   # ma khí: sâu → mép
MA_MEP = (122, 58, 160)
LINH = [(70, 120, 60), (120, 180, 80), (190, 220, 110), (250, 240, 170)]  # linh khí: nhạt → sáng
VONG = [(255, 236, 150), (180, 240, 220)]   # vòng kết giới: vàng, xanh ngọc
LOE = [(255, 255, 230), (240, 140, 255)]    # chỗ chạm: trắng vàng, tím hồng

yy, xx = np.mgrid[0:H, 0:W]
cx = cy = W / 2
dx, dy = xx - cx, yy - cy
rr = np.hypot(dx, dy)
th = np.arctan2(dy, dx)
rng = np.random.default_rng(7)
SAO = [(int(rng.integers(0, W)), int(rng.integers(0, H)), rng.random()) for _ in range(120)]
# Hạt linh khí: góc, pha, tốc
HAT = [(rng.random() * TAU, rng.random(), float(rng.integers(1, 4))) for _ in range(70)]
# Đốm ma khí trôi vào
DOM = [(rng.random() * TAU, rng.random(), float(rng.integers(1, 3))) for _ in range(40)]


def ep(theta, t):
    """Chỗ vòi ma khí đang ép vào (0..1): 5 vòi bò quanh chậm, mỗi vòi thò vào rồi rụt lại lệch pha."""
    a = TAU * t
    v = np.zeros_like(np.asarray(theta, float))
    for k in range(5):
        g = k * TAU / 5 + 0.35 * np.sin(a + k)            # vị trí vòi đung đưa
        dg = np.angle(np.exp(1j * (theta - g)))
        v = np.maximum(v, np.exp(-(dg / 0.16) ** 2) * (0.5 + 0.5 * np.sin(a + k * 1.7)) ** 2)
    return v


def ban_kinh(theta, t):
    """Bán kính kết giới: gần tròn, gợn nhẹ, lõm vào chỗ bị vòi ma khí ép."""
    a = TAU * t
    return R0 + 5.0 * np.sin(2 * theta + a) + 3.0 * np.sin(3 * theta - a + 1.0) - 9.0 * ep(theta, t)


def suong(theta, r, t, bk):
    """Mật độ ma khí (0..1): dày dần về phía kết giới (đang dồn vào), cuộn xoáy, vòi thò sát mép."""
    a = TAU * t
    cuon = (0.5 + 0.25 * np.sin(r * 0.09 - a + 3 * np.sin(2 * theta + a))
            + 0.25 * np.sin(5 * theta + r * 0.04 + 2 * a))
    gan = np.clip(1 - (r - bk) / 70.0, 0, 1)
    voi = ep(theta, t) * np.clip(1 - (r - bk) / 45.0, 0, 1)
    return np.clip(0.25 + 0.45 * gan * cuon + 0.25 * cuon + 0.7 * voi - 0.25 * np.clip((r - bk) / 140, 0, 1), 0, 1)


def khung(i, tinh):
    t = i / N
    a = TAU * t
    img = np.zeros((H, W, 3), np.uint8)
    img[:] = NEN
    for x, y, s in SAO:   # sao nhấp nháy, bị ma khí che
        if math.sin(a * 2 + s * 20) > -0.2:
            img[y, x] = (200, 190, 230) if s > 0.8 else (110, 100, 150)
    bk = ban_kinh(th, t)
    ngoai = rr > bk
    caro = ((xx + yy) % 2) == 0
    # Ma khí: bậc màu phẳng, chỗ chuyển bậc chấm caro
    d = suong(th, rr, t, bk)
    for k, mau in enumerate(MA):
        nguong = 0.32 + 0.16 * k
        img[ngoai & (d > nguong + 0.04)] = mau
        img[ngoai & (d > nguong - 0.04) & (d <= nguong + 0.04) & caro] = mau
    img[ngoai & (rr < bk + 2.5) & (d > 0.55)] = MA_MEP         # mép ma khí liếm sát kết giới
    # Linh khí toả từ tinh cầu ra: đậm sát tinh cầu, nhạt dần, tới chỗ gặp ma khí thì dồn lại thành mép sáng
    trong = ~ngoai
    sau = bk - rr
    muc = 1 - np.clip((rr - 62) / np.maximum(bk - 62, 1), 0, 1)
    tho = 0.12 * np.sin(rr * 0.12 - 2 * a + 2 * np.sin(3 * th))
    lv = muc + tho
    for nguong, mau, mat in ((0.0, (20, 34, 30), caro), (0.35, (28, 52, 38), caro), (0.55, (34, 66, 44), np.ones_like(caro)),
                             (0.8, (48, 88, 52), caro)):
        img[trong & (rr > 58) & (lv > nguong) & mat] = mau
    manh = ep(th, t)
    img[trong & (sau < 4 + 4 * manh) & caro] = LINH[0]
    img[trong & (sau < 2 + 2 * manh)] = LINH[1]
    img[trong & (sau < 1.2) & (manh > 0.35)] = LINH[2]
    # Hạt linh khí bốc từ mặt tinh cầu ra kết giới, tới nơi thì tan
    for g, p, v in HAT:
        q = (p + t * v) % 1.0
        r = 70 + q * (float(ban_kinh(np.array(g), t)) - 3 - 70)
        g2 = g + 0.15 * math.sin(a + p * 9) * q
        x, y = int(cx + math.cos(g2) * r), int(cy + math.sin(g2) * r)
        if 0 <= x < W - 1 and 0 <= y < H - 1:
            mau = LINH[3] if q < 0.5 else LINH[2]
            img[y, x] = mau
            if q < 0.3:
                img[y, x + 1] = mau
    # Đốm ma khí trôi vào, vỡ ở kết giới
    for g, p, v in DOM:
        q = (p + t * v) % 1.0
        r = W * 0.72 - q * (W * 0.72 - float(ban_kinh(np.array(g), t)) - 3)
        x, y = int(cx + math.cos(g) * r), int(cy + math.sin(g) * r)
        if 0 <= x < W - 1 and 0 <= y < H - 1:
            img[y:y + 2, x:x + 2] = MA_MEP if q > 0.8 else MA[3]
    # Chỗ ma khí ép mạnh: linh khí và ma khí va nhau toé tia lửa (thưa, lâu lâu mới loé)
    for k in range(360):
        g = k / 360 * TAU
        e = float(ep(np.array(g), t))
        if e < 0.5 or (k * 7 + i // 2) % 23:
            continue
        r = float(ban_kinh(np.array(g), t))
        x, y = cx + math.cos(g) * r, cy + math.sin(g) * r
        for s_, mau2 in ((1, LOE[1]), (-1, LOE[0])):
            for j in range(1, 3 + (k + i // 3) % 3):
                gg = g + 0.6 * math.sin(k * 3.1)
                px, py = int(round(x + math.cos(gg) * j * s_)), int(round(y + math.sin(gg) * j * s_))
                if 0 <= px < W and 0 <= py < H:
                    img[py, px] = mau2
    out = Image.fromarray(img).convert('RGBA')
    # Tinh cầu ở giữa (16 khung, 8 khung/giây → mỗi khung 1,5 khung ở đây)
    fr = tinh[(i // 3) % len(tinh)]   # 16 khung chạy 4 khung/giây cho chậm
    out.alpha_composite(fr, (int(cx - fr.width / 2), int(cy - fr.height / 2)))
    return out.convert('RGB')


def main():
    src = Image.open(f'{GOC}/dong/thien-kiem-tinh.webp')
    tinh = []
    for k in range(src.n_frames):
        src.seek(k); tinh.append(src.convert('RGBA').copy())
    tam = f'{GOC}/ket-gioi-khung'
    os.makedirs(tam, exist_ok=True)
    frames = []
    for i in range(N):
        f = khung(i, tinh).resize((W * ZOOM, H * ZOOM), Image.NEAREST)
        f.save(f'{tam}/{i:03d}.png'); frames.append(f)
    out = f'{GOC}/ket-gioi.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-stream_loop', '1', '-framerate', '12', '-i', f'{tam}/%03d.png',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', '18', out], check=True)
    frames[0].resize((W * 2, H * 2), Image.NEAREST).save(f'{GOC}/ket-gioi.png')
    print(out)


if __name__ == '__main__':
    main()
