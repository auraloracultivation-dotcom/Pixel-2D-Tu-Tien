"""Hiệu ứng rèn luyện trên bảng Nhân vật, vẽ bằng code (chủ dự án 11/11/2026 03:10: ảnh GPT viền đỏ nham nhở, nhờ tự vẽ; dáng và nhịp
theo 4 tấm GPT gửi kèm). Mỗi hiệu ứng 10 khung 48 × 48 xếp ngang, nền trong suốt, tâm ở giữa khung; src/ui/self-fx.js chạy khung.
- ui-fx-ren-thanh: cường hoá thành công: sao bốn cánh vàng nở, vòng sáng loang, tia lửa bắn chéo, cuối cùng tàn lửa rơi;
- ui-fx-ren-hong: cường hoá hỏng: khói xám pha xanh ngọc bốc lên, mảnh vụn văng rồi rơi, khói tan;
- ui-fx-kham: khảm ngọc: đốm sáng lam tím xoáy hút vào giữa, loé sao trắng, tắt;
- ui-fx-luc-chien: lực chiến tăng: vòng hào quang vàng (nhìn nghiêng) loang ra, tia sáng dọc và sao nhỏ bay lên, mờ dần.
Phai dần bằng ma trận Bayer (không bán trong suốt) cho đúng chất pixel. Gọi từ build.py và ui_kit_only.py: fx_ren.build(save)."""
import math, random
import numpy as np
from px import Canvas, hx, BAYER4

N, S = 10, 48
C0 = (S - 1) / 2
GOLD = [hx('#7a3a08'), hx('#c46a12'), hx('#f4a52a'), hx('#ffd75a'), hx('#fff4c2'), hx('#ffffff')]
SMOKE = [hx('#232c33'), hx('#3e4a52'), hx('#5d6a72'), hx('#84909a'), hx('#aab4ba')]
TEAL = [hx('#127a74'), hx('#2bc0b4'), hx('#8af5ea')]
BLUE = [hx('#2a1f7a'), hx('#3d4fd0'), hx('#5a8cff'), hx('#9ad0ff'), hx('#e4f4ff'), hx('#ffffff')]
VIOLET = [hx('#5a2a9a'), hx('#9a6ae8'), hx('#e0c8ff')]
YY, XX = np.mgrid[0:S, 0:S]


def _keep(fade):
    """Mặt nạ giữ điểm khi phai (fade 0 → giữ hết, 1 → bỏ hết) theo Bayer 4 × 4 (chỉ dùng cho vòng đứt khúc)."""
    return BAYER4[YY % 4, XX % 4] >= fade * 16


def _put(c, mask, col):
    c.a[mask] = col


def _star(c, cx, cy, r, tones, thin=0.42):
    """Sao bốn cánh (đường astroid): ngoài tối, lõi sáng (tones tối → sáng)."""
    if r < 0.8: return
    dx, dy = np.abs(XX - cx) / r, np.abs(YY - cy) / r
    v = dx ** thin + dy ** thin
    for k, col in enumerate(tones):
        _put(c, v <= 1.0 - k / len(tones) * 0.92, col)


def _ring(c, cx, cy, r, w, col, gone=0.0, sy=1.0, seg=14):
    """Vòng tròn (sy < 1: nhìn nghiêng); gone 0 → liền, 1 → mất: đứt dần thành từng khúc, khúc ngắn lại."""
    if r <= 0: return
    d = np.hypot(XX - cx, (YY - cy) / sy)
    m = np.abs(d - r) <= w / 2
    if gone > 0:
        ang = (np.arctan2((YY - cy) / sy, XX - cx) / (2 * math.pi) + 1) % 1 * seg
        m &= (ang % 1) < (1 - gone) * 0.95
    _put(c, m, col)


def _dot(c, x, y, r, col):
    if r > 0: _put(c, np.hypot(XX - x, YY - y) <= r, col)


def _wisp(c, x, y, r, col, side=1):
    """Vệt khói hình liềm (đĩa trừ đĩa lệch), khói đang tan."""
    if r <= 0.8: return
    _put(c, (np.hypot(XX - x, YY - y) <= r) & (np.hypot(XX - x - side * r * 0.55, YY - y + r * 0.35) > r * 0.85), col)


def ren_thanh():
    rnd = random.Random(11)
    rays = [(math.radians(45 + 90 * i + rnd.uniform(-10, 10)), rnd.uniform(0.9, 1.1)) for i in range(4)] + \
           [(math.radians(90 * i + 22 + rnd.uniform(-8, 8)), rnd.uniform(0.6, 0.8)) for i in range(4)]
    embers = [(rnd.uniform(-13, 13), rnd.uniform(-5, 5), rnd.uniform(-1.0, 1.0)) for _ in range(8)]
    out = []
    for f in range(N):
        c = Canvas(S, S)
        if f <= 7:   # vòng sáng loang ra rồi đứt khúc
            rr = 6 + 14 * min(1.0, f / 5)
            _ring(c, C0, C0, rr, 1.6, GOLD[3], gone=max(0, (f - 4) / 4))
        if 1 <= f <= 7:   # tia lửa hình thoi bắn chéo, nhỏ dần
            for a, k in rays:
                d = (6 + 15 * min(1.0, (f - 1) / 4)) * k
                _star(c, C0 + math.cos(a) * d, C0 + math.sin(a) * d, 3.4 - 0.45 * max(0, f - 4), [GOLD[2], GOLD[3], GOLD[4]], thin=0.8)
        r = [5, 10, 15, 19, 21, 20, 15, 10, 6, 3][f]   # sao lớn nở rồi thu
        _star(c, C0, C0, r, [GOLD[1], GOLD[2], GOLD[3], GOLD[4], GOLD[5]], thin=0.4)
        if f >= 6:   # tàn lửa rơi, nhỏ dần
            for ex, ey, vx in embers:
                k = f - 6
                _dot(c, C0 + ex + vx * k * 2, C0 + ey + 3 + k * k * 1.4, 1.4 - k * 0.3, GOLD[3] if k < 2 else GOLD[2])
        c.outline(GOLD[0])
        out.append(c)
    return out


def ren_hong():
    rnd = random.Random(7)
    puffs = [(rnd.uniform(-6, 6), i / 6, rnd.uniform(5, 7.5), rnd.choice([-1, 1])) for i in range(7)]
    chips = [(math.radians(rnd.uniform(200, 340)), rnd.uniform(1.6, 2.4), rnd.choice([1.5, 2, 2.5])) for _ in range(6)]
    out = []
    for f in range(N):
        c = Canvas(S, S); t = f / (N - 1)
        tan = max(0.0, (f - 5) / 4)   # 0 → khói đặc, 1 → tan hết
        for i, (ox, k, pr, side) in enumerate(puffs):   # cột khói xoắn bốc lên
            y = C0 + 12 - (4 + 26 * k) * min(1.0, 0.3 + t * 1.2)
            x = C0 + ox * (0.5 + t) + math.sin(k * 5 + f * 0.6) * 3
            r = pr * min(1.0, 0.4 + t * 1.5) * (1 - 0.55 * tan)
            if tan > 0.15: _wisp(c, x + side * tan * 4, y - tan * 3, r, SMOKE[2 + (i % 2)], side)
            else:
                _dot(c, x, y, r, SMOKE[2]); _dot(c, x - r * 0.3, y - r * 0.3, r * 0.55, SMOKE[3])
        if f <= 4:   # lửa xanh ngọc tắt dần ở chân khói
            _star(c, C0, C0 + 8 - f, 7 - f * 1.3, [TEAL[0], TEAL[1], TEAL[2]], thin=0.7)
        for a, sp, sz in chips:   # mảnh vụn văng ra rồi rơi
            x = C0 + math.cos(a) * sp * f * 2.2
            y = C0 + 6 + math.sin(a) * sp * f * 2.2 + 0.9 * f * f
            if f >= 9: continue
            m = (np.abs(XX - x) + np.abs(YY - y) * 1.3) <= sz
            _put(c, m, SMOKE[3]); _put(c, m & (YY < y), SMOKE[4])
        c.outline(SMOKE[0])
        out.append(c)
    return out


def kham():
    rnd = random.Random(3)
    motes = [(rnd.uniform(0, 2 * math.pi), rnd.uniform(15, 20), rnd.choice([BLUE, VIOLET])) for _ in range(8)]
    out = []
    for f in range(N):
        c = Canvas(S, S)
        k = min(1.0, f / 5)
        if f <= 5:
            for a0, r0, tone in motes:   # xoáy hút vào giữa, đuôi cong
                a = a0 + k * 2.6; r = r0 * (1 - k) + 2
                for j in range(3):
                    aj = a - 0.2 * (j + 1); rj = r + 1.4 * (j + 1)
                    _dot(c, C0 + math.cos(aj) * rj, C0 + math.sin(aj) * rj, 1.4 - j * 0.35, tone[1])
                _star(c, C0 + math.cos(a) * r, C0 + math.sin(a) * r, 2.8, [tone[1], tone[2], tone[-1]], thin=0.6)
        if 4 <= f <= 8:   # loé sao trắng ở giữa, vòng sáng đứt dần
            r = [5, 12, 15, 10, 5][f - 4]
            _ring(c, C0, C0, r + 4, 1.2, BLUE[3], gone=max(0, (f - 5) / 3))
            _star(c, C0, C0, r, [BLUE[1], BLUE[2], BLUE[3], BLUE[4], BLUE[5]])
        if f >= 7:   # vài đốm còn sót bay ra, nhỏ dần
            for i in range(5):
                a = i * 1.26 + 0.4; d = 7 + (f - 7) * 5
                _star(c, C0 + math.cos(a) * d, C0 + math.sin(a) * d, 2.4 - (f - 7) * 0.5, [BLUE[2], BLUE[4]], thin=0.6)
        c.outline(BLUE[0])
        out.append(c)
    return out


def luc_chien():
    rnd = random.Random(5)
    beams = [(-9, 0.75), (-3, 1.0), (4, 0.9), (10, 0.6)]
    stars = [(rnd.uniform(-12, 12), rnd.uniform(0.6, 1.0)) for _ in range(5)]
    out = []
    for f in range(N):
        c = Canvas(S, S); t = f / (N - 1)
        base = C0 + 11
        gone = max(0.0, (f - 5) / 4)
        r = 5 + 16 * min(1.0, f / 6)   # vòng hào quang nhìn nghiêng loang ra, đứt dần
        _ring(c, C0, base, r, 2.2, GOLD[2], gone, sy=0.32)
        _ring(c, C0, base, r - 2.2, 1, GOLD[4], gone, sy=0.32)
        for bx, k in beams:   # tia sáng dọc mảnh: đầu sáng trắng, thân vàng, ngắn dần khi tan
            h = (8 + 20 * k) * min(1.0, f / 4) * (1 - gone) ** 0.7
            top = base - 3 - h - 6 * t
            x = C0 + bx * (0.6 + 0.4 * min(1.0, f / 5))
            m = (np.abs(XX - x) < 0.6) & (YY > top) & (YY < top + h)
            _put(c, m, GOLD[3]); _put(c, m & (YY < top + 3), GOLD[5])
        for sx, k in stars:   # sao nhỏ bay lên, nhỏ dần
            y = base - 6 - (6 + 22 * k) * min(1.0, f / 7)
            _star(c, C0 + sx, y, 2.6 - 0.6 * max(0, f - 6), [GOLD[2], GOLD[4], GOLD[5]], thin=0.6)
        rs = [3, 7, 10, 11, 9, 7, 5, 3, 0, 0][f]   # sao sáng giữa vòng
        _star(c, C0, base - 3, rs, [GOLD[2], GOLD[3], GOLD[4], GOLD[5]])
        c.outline(GOLD[0])
        out.append(c)
    return out


def build(save):
    for name, fn in [('ren-thanh', ren_thanh), ('ren-hong', ren_hong), ('kham', kham), ('luc-chien', luc_chien)]:
        save('ui.fx-' + name, fn(), (S // 2, S // 2), 'hiệu ứng bảng Nhân vật, 10 khung (tools/art/fx_ren.py)')
    return 4
