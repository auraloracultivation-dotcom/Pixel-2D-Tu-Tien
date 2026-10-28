"""Bộ vẽ quái thế hệ 2 (tools/art/mob_design.py): hình khối có đổ bóng theo ánh sáng trên-trái,
mỗi khối tự viền tối, cuối cùng viền ngoài cả hình."""
import colorsys, math
import numpy as np

LIGHT = np.array([-0.55, -0.75, 0.6]); LIGHT = LIGHT / np.linalg.norm(LIGHT)


def hx(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def ramp(base, n=5, spread=0.9):
    """Dải màu tối -> sáng, tối ngả lạnh/tím, sáng ngả ấm (kiểu pixel art)."""
    r, g, b = [v / 255 for v in (hx(base) if isinstance(base, str) else base)]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    out = []
    for i in range(n):
        k = (i - (n - 1) * 0.55) / (n - 1)          # -0.55 .. 0.45
        hh = (h + (-0.035 * k if k > 0 else 0.05 * -k * (1 if h > 0.5 or h < 0.1 else -1))) % 1
        ll = min(0.96, max(0.05, l + k * spread * (0.55 if l > 0.75 else 0.75)))
        ss = min(1, max(0, s * (1 + 0.25 * -k)))
        out.append(tuple(int(v * 255) for v in colorsys.hls_to_rgb(hh, ll, ss)))
    return out


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = np.zeros((h, w, 4), np.uint8)

    def put(self, x, y, c, a=255):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y, x, :3] = c[:3]; self.px[y, x, 3] = a

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h and self.px[y, x, 3]:
            return tuple(self.px[y, x, :3])
        return None

    # --- khối cơ bản -------------------------------------------------------
    def mask_fill(self, mask, x0, y0, R, shade_fn, outline=True, rim=True):
        """mask: mảng bool cục bộ; shade_fn(i,j)->0..1 độ sáng."""
        h, w = mask.shape
        for j in range(h):
            for i in range(w):
                if not mask[j, i]:
                    continue
                edge = outline and (i == 0 or j == 0 or i == w - 1 or j == h - 1 or
                                    not mask[j - 1, i] or not mask[j + 1, i] or
                                    not mask[j, i - 1] or not mask[j, i + 1])
                if edge:
                    c = R[0]
                    # viền sáng ở mép đón sáng
                    if rim and (j > 0 and not mask[j - 1, i]) and shade_fn(i, j) > 0.72:
                        c = R[2]
                else:
                    v = shade_fn(i, j)
                    c = R[min(len(R) - 1, max(1, int(v * (len(R) - 1) + 0.5)))]
                self.put(x0 + i, y0 + j, c)

    def ellipse(self, cx, cy, rx, ry, R, outline=True, light=1.0, flat=False):
        x0, y0 = int(math.floor(cx - rx)), int(math.floor(cy - ry))
        w, h = int(math.ceil(cx + rx)) - x0 + 1, int(math.ceil(cy + ry)) - y0 + 1
        jj, ii = np.mgrid[0:h, 0:w]
        dx = (ii + x0 + 0.5 - cx) / max(rx, 0.5); dy = (jj + y0 + 0.5 - cy) / max(ry, 0.5)
        m = dx * dx + dy * dy <= 1.0
        def sh(i, j):
            if flat: return 0.6 * light
            nx, ny = dx[j, i], dy[j, i]; nz = math.sqrt(max(0, 1 - nx * nx - ny * ny))
            d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]
            return max(0, min(1, (0.25 + 0.75 * d) * light))
        self.mask_fill(m, x0, y0, R, sh, outline)

    def poly(self, pts, R, outline=True, light=0.6, grad=True):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, y0 = int(math.floor(min(xs))), int(math.floor(min(ys)))
        w, h = int(math.ceil(max(xs))) - x0 + 1, int(math.ceil(max(ys))) - y0 + 1
        m = np.zeros((h, w), bool)
        for j in range(h):
            for i in range(w):
                m[j, i] = _inside(i + x0 + 0.5, j + y0 + 0.5, pts)
        def sh(i, j):
            if not grad: return light
            return max(0, min(1, light + 0.35 * (1 - j / max(h - 1, 1)) - 0.2 * (i / max(w - 1, 1)) + 0.05))
        self.mask_fill(m, x0, y0, R, sh, outline)

    def rect(self, x, y, w, h, R, outline=True, light=0.6):
        self.poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], R, outline, light)

    def line(self, x0, y0, x1, y1, c, th=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for k in range(n + 1):
            t = k / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            for a in range(th):
                for b in range(th):
                    self.put(x - th // 2 + a, y - th // 2 + b, c)

    def limb(self, x0, y0, x1, y1, w, R):
        """Chi (tay/chân): đoạn dày có viền."""
        ang = math.atan2(y1 - y0, x1 - x0) + math.pi / 2
        ox, oy = math.cos(ang) * w / 2, math.sin(ang) * w / 2
        self.poly([(x0 - ox, y0 - oy), (x0 + ox, y0 + oy), (x1 + ox, y1 + oy), (x1 - ox, y1 - oy)], R, light=0.55)

    # --- hậu kỳ -------------------------------------------------------------
    def outline(self, dark=0.35):
        a = self.px[..., 3] > 0
        out = self.px.copy()
        for y in range(self.h):
            for x in range(self.w):
                if a[y, x]:
                    continue
                nb = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                      if 0 <= x + dx < self.w and 0 <= y + dy < self.h and a[y + dy, x + dx]]
                if nb:
                    c = np.mean([self.px[yy, xx, :3] for xx, yy in nb], 0)
                    out[y, x, :3] = (c * dark * 0.6 + np.array([20, 14, 32]) * 0.4).astype(np.uint8)
                    out[y, x, 3] = 255
        self.px = out

    def flip(self):
        self.px = self.px[:, ::-1].copy()


def _inside(x, y, pts):
    ins = False; n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-9) + x1:
            ins = not ins
    return ins
