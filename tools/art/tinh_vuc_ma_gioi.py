"""Ma giới ngoài kết giới Tinh Vực, vẽ bằng code (chủ dự án 19/11/2026 02:28): ngoài vùng xanh tối như mực, bốn lớp:
1 Thiên không nền: tím đen / xanh tím rất tối, phủ kín, không viền.
2 Biển Ma Vân: tầng mây ma khí khổng lồ, nối liền theo chiều ngang (vân nhiễu tuần hoàn), trôi chậm, hai lớp thị sai.
3 Ma khí lưu động: dòng ma khí uốn lượn, tia điện tím hồng chạy dọc bên trong, lặp liên tục.
4 Dị tượng: vòng xoáy ma khí khổng lồ, khe nứt không gian, cột ma khí bốc lên, sấm sét ngẫu nhiên.
Vẽ trên tấm nhỏ (mỗi điểm = P điểm màn), màu phẳng ít sắc độ, chuyển bậc bằng chấm Bayer; trả về ảnh và mặt nạ "ngoài kết giới".
"""
import math
import numpy as np

TAU = 2 * math.pi
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
NEN = (7, 5, 14)
MAY = [(14, 9, 28), (22, 13, 42), (34, 17, 58), (50, 24, 80)]
VIEN_MAY = (66, 32, 98)
DONG = [(40, 18, 64), (64, 28, 96)]
DIEN = [(214, 120, 255), (255, 170, 240), (255, 240, 255)]


def van(w, h, seed, mu=2.2, cat=0.0, dep=2.6):
    """Vân nhiễu tuần hoàn hai chiều (lọc tần số), giá trị 0..1; nối liền mép trái-phải và trên-dưới."""
    rng = np.random.default_rng(seed)
    f = np.fft.fft2(rng.standard_normal((h, w)))
    ky = np.fft.fftfreq(h)[:, None]; kx = np.fft.fftfreq(w)[None, :] * dep   # dep > 1: mây kéo dài theo chiều ngang
    k = np.hypot(kx, ky); k[0, 0] = 1
    g = np.real(np.fft.ifft2(f / k ** mu * (k > cat)))
    r = np.empty(g.size); r[np.argsort(g, axis=None)] = np.linspace(0, 1, g.size)   # san đều: mây chiếm đúng tỉ lệ ngưỡng
    return r.reshape(g.shape)


class MaGioi:
    def __init__(self, W, H, cx, cy, rx, ry, N):
        self.W, self.H, self.N = W, H, N
        yy, xx = np.mgrid[0:H, 0:W]
        self.xx, self.yy = xx, yy
        self.e = np.hypot((xx - cx) / rx, (yy - cy) / ry)          # 1 = đúng vòng kết giới
        self.ngoai = self.e > 1.03
        self.bay = BAYER[yy % 4, xx % 4]
        self.v1 = van(W * 2, H, 1, 1.8, 4 / (W * 2))                              # biển mây xa (to, chậm)
        self.v2 = van(W * 2, H, 2, 1.6, 9 / (W * 2))                              # biển mây gần (chi tiết, nhanh hơn)
        self.cx, self.cy = cx, cy
        # vòng xoáy ở mép phải, nửa ngoài màn
        self.vx, self.vy, self.vr = W * 0.97, H * 0.46, H * 0.55
        rng = np.random.default_rng(9)
        self.dong = [(H * (0.1 + 0.8 * k / 4) + rng.random() * 20, 0.4 + rng.random() * 0.6, rng.random() * TAU, 12 + rng.random() * 14) for k in range(5)]
        self.nut = [(W * 0.035, H * 0.2, 1.1), (W * 0.93, H * 0.9, 2.3), (W * 0.1, H * 0.86, 0.4), (W * 0.84, H * 0.07, 3.0)]
        self.cot = [(W * 0.04, 1.0), (W * 0.075, 2.7), (W * 0.9, 0.3), (W * 0.955, 1.9), (W * 0.62, 4.0), (W * 0.3, 5.2)]
        self.set = rng.integers(0, N, 7)   # khung bắt đầu của 7 tia sét ngẫu nhiên trong một vòng

    def khung(self, i):
        W, H, N = self.W, self.H, self.N
        t = i / N; a = TAU * t
        img = np.zeros((H, W, 3), np.uint8); img[:] = NEN
        ng, bay, xx, yy = self.ngoai, self.bay, self.xx, self.yy
        # lớp 2: biển ma vân, hai lớp trôi ngang (vân rộng gấp đôi màn nên nối vòng liền)
        for v, toc, lech, nguong in ((self.v1, 1, 0.0, (0.35, 0.55, 0.75)), (self.v2, 2, 0.2, (0.6, 0.75, 0.88))):
            o = int(i * toc * 0.25) % v.shape[1]   # trôi rất chậm
            d = np.roll(v, -o, axis=1)[:, :W] * (0.85 + 0.25 * np.clip(self.e - 1, 0, 1))
            for k, n0 in enumerate(nguong):
                img[ng & (d + 0.06 * (bay - 0.5) > n0)] = MAY[k + (1 if v is self.v2 else 0)]
            ria = ng & (d > nguong[-1]) & (np.roll(d, 2, axis=0) <= nguong[-1]) & (bay < 0.75)   # mép trên mây sáng
            img[ria] = VIEN_MAY
        # lớp 4a: vòng xoáy ma khí khổng lồ
        dx, dy = xx - self.vx, yy - self.vy
        r = np.hypot(dx, dy * 1.4); g = np.arctan2(dy * 1.4, dx)
        xoan = np.sin(2 * g - r * 0.045 + a * 2)
        mx = ng & (r < self.vr)
        k = 1 - r / self.vr
        img[mx & (xoan > 0.55 - 0.5 * k) & (bay < 0.5 + k)] = MAY[3]
        img[mx & (xoan > 0.82 - 0.3 * k)] = DONG[1]
        img[mx & (r < self.vr * 0.12)] = (10, 4, 16)
        img[mx & (np.abs(r - self.vr * 0.12) < 1.2)] = DIEN[0]
        # lớp 3: dòng ma khí uốn lượn, điện chạy dọc bên trong
        for y0, f, ph, A in self.dong:
            xs = np.arange(W)
            ys = y0 + A * np.sin(xs * 0.02 * f + a + ph) + 0.5 * A * np.sin(xs * 0.05 + 2 * a)
            for x, y in zip(xs, ys):
                y = int(y) % H
                day = math.sin(x * 0.012 + ph * 3 + a)          # dòng chỉ hiện từng khúc, đầu khúc mảnh dần
                if not ng[y, x] or day < 0:
                    continue
                if day < 0.35 and (x + i) % 2:
                    continue
                for d in range(-int(1 + 4 * min(1, day * 2)), int(2 + 4 * min(1, day * 2))):
                    yy2 = (y + d) % H
                    if not ng[yy2, x] or (abs(d) > 2 and (x + yy2 + i // 2) % (2 if abs(d) < 5 else 3)):
                        continue
                    img[yy2, x] = (110, 52, 156) if d == -1 else DONG[1] if abs(d) <= 2 else DONG[0]
            # tia điện chạy theo dòng
            for s in range(3):
                xh = int((t * f * 1.5 + s / 3 + ph) % 1 * W)
                for j in range(14):
                    x = (xh - j) % W
                    y = int(ys[x] + (1 if (j + i) % 4 < 2 else -1)) % H
                    if ng[y, x]:
                        img[y, x] = DIEN[2] if j < 2 else DIEN[1] if j < 6 else DIEN[0]
        # lớp 4b: cột ma khí bốc lên từ đáy, sóng chạy lên trên
        for x0, ph in self.cot:
            w = 9 + 3 * math.sin(a + ph)
            for y in range(H):
                c = x0 + 3 * math.sin(y * 0.08 + a * 2 + ph)
                cao = (H - y) / H
                if cao > 0.55 + 0.1 * math.sin(a + ph):
                    continue
                for x in range(int(c - w * (1 - cao)), int(c + w * (1 - cao)) + 1):
                    if 0 <= x < W and ng[y, x]:
                        lo = (y + int(i * 2)) % 6 < 3
                        img[y, x] = DONG[1] if lo else MAY[3]
                if 0 <= int(c) < W and ng[y, int(c)] and (y + i * 3) % 9 < 2:
                    img[y, int(c)] = DIEN[0]
        # lớp 4c: khe nứt không gian, mở ra khép lại
        for x0, y0, ph in self.nut:
            mo = (math.sin(a + ph) + 1) / 2
            rng = np.random.default_rng(int(x0 * 7 + y0))
            x, y = x0, y0
            for j in range(40):
                x += rng.integers(-2, 3); y += rng.integers(1, 3) * (1 if j % 2 else -1) * 0.5 + 1
                for d in range(-int(1 + 2 * mo * (1 - abs(j - 20) / 20)), int(2 + 2 * mo * (1 - abs(j - 20) / 20))):
                    px, py = int(x + d), int(y)
                    if 0 <= px < W and 0 <= py < H and ng[py, px]:
                        img[py, px] = (255, 220, 255) if abs(d) < 1 and mo > 0.6 else (4, 2, 8) if abs(d) < 1 else DIEN[0] if mo > 0.4 else DONG[1]
        # lớp 4d: sấm sét ngẫu nhiên (mỗi tia sáng 3 khung)
        for n, k0 in enumerate(self.set):
            if not (0 <= (i - k0) % N < 3):
                continue
            rng = np.random.default_rng(100 + n)
            vung = [(rng.random() * W * 0.08, 0), (W - rng.random() * W * 0.1, 0), (rng.random() * W, 0)][n % 3]
            x, y = vung
            mau = DIEN[2] if (i - k0) % N == 0 else DIEN[1]
            while y < H * (0.4 + rng.random() * 0.5):
                nx, ny = x + rng.integers(-4, 5), y + rng.integers(2, 6)
                for s in np.linspace(0, 1, 6):
                    px, py = int(x + (nx - x) * s), int(y + (ny - y) * s)
                    if 0 <= px < W and 0 <= py < H and ng[py, px]:
                        img[py, px] = mau
                x, y = nx, ny
        # sát kết giới: ma khí dồn tối lại một dải mỏng cho ranh giới rõ
        img[(self.e > 1.0) & (self.e < 1.06) & (bay < 0.5)] = NEN
        return img
