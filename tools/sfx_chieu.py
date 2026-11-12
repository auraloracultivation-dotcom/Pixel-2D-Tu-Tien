"""Tiếng riêng từng chiêu (chủ dự án 13/11/2026: "hiệu ứng đẹp âm thanh tốt là thứ cần nhất"; đi cùng bộ hiệu ứng điểm ảnh, chỉ kêu khi
hiệu ứng điểm ảnh bật). Ghi data/tieng-chieu.json (file do công cụ này ghi toàn bộ, KHÔNG đụng data/sounds.json là bộ tiếng chung chủ dự án
đã chỉnh tay). Chạy: python3 -I tools/sfx_chieu.py   (tự gọi node tools/sfx-check.mjs để đo rồi chỉnh âm lượng từng tiếng về độ to đích).

Cách dựng một tiếng (src/core/synth.js): mỗi tiếng là nhiều lớp cộng lại, ba phần:
  đầu tiếng (nứt, cộp vài ms cho rõ nhịp) → thân (vút, nện, gầm: bản sắc của hệ) → đuôi (lách tách, rền, ngân: độ lớn của chiêu).
Lưu ý khi chỉnh:
  - Loa điện thoại gần như không ra tiếng dưới ~300 Hz: phần nện trầm chỉ để nhỏ (đeo tai nghe mới thấy), thân tiếng phải nằm ở 300–2500 Hz;
    nện trầm luôn kèm méo nhẹ (dist) và một lớp gõ trung trầm để loa nhỏ vẫn nghe "nặng".
  - Chủ dự án chê "ting ting", "chói tai" (09/11/2026): hạn chế chuông cao, năng lượng trên 2,5 kHz để thấp; tiếng kim loại ngắn, nhỏ.
  - Mỗi tiếng khai "to": độ to đích trên loa điện thoại (dB, cột LP của tools/sfx-check.mjs); công cụ tự tính v (đỉnh) để đạt. Bậc độ to:
    tiếng trúng −25 · chiêu thường (hồi 3–5 giây) −22 · chiêu nhiều đạn, lướt −20 · chiêu vùng, khiên, hồi máu −19 … −17 · chiêu lớn −16 ·
    tuyệt kỹ Vạn Bảo Lâu −13 · tiếng nền của vùng chiêu −28 (để so: tiếng chém thường 'swing' −25, 'crit' −30, 'levelup' −16). Tiếng nào bị chặn ở đỉnh 0,9 là còn quá nhiều trầm, phải sửa công thức.
  - Nốt có cao độ theo ngũ cung Đô (Đô Rê Mi Sol La) cho hợp nhạc nền.
Bảng by_skill: mã chiêu → { c: lúc tung, h: đạn trúng, b: đạn nổ lan, z: [tiếng, chu kỳ giây, âm lượng] lặp khi vùng còn,
  r / s / k: mốc riêng của chiêu đặc biệt (xem src/game/skill-sfx.js) }. Giá trị: tên tiếng hoặc [tên, âm lượng]."""
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'tieng-chieu.json'
VMAX = 0.9


def N(d, v=1.0, t=0.0, **k):   # nhiễu (gió, lửa, vụn)
    return {'k': 'noise', 't': t, 'd': d, 'v': v, **k}


def O(f, d, v=1.0, t=0.0, w='sine', **k):   # sóng (nện trầm, gầm, ngân)
    return {'k': 'osc', 'w': w, 'f': f, 't': t, 'd': d, 'v': v, **k}


def F(f, d, v=1.0, t=0.0, r=1.41, i=3.0, **k):   # FM (chuông, chiêng, kim loại)
    return {'k': 'fm', 'f': f, 'r': r, 'i': i, 't': t, 'd': d, 'v': v, **k}


def P(f, d, v=1.0, t=0.0, damp=0.35, br=0.75, **k):   # dây gảy
    return {'k': 'pluck', 'f': f, 't': t, 'd': d, 'v': v, 'damp': damp, 'br': br, **k}


def M(f, d, v=0.6, t=0.0, **k):   # mộc cầm
    return {'k': 'mallet', 'f': f, 't': t, 'd': d, 'v': v, **k}


def thump(f=150, f2=55, d=0.3, v=1.0, t=0.0, drive=2.3, c=1.9):
    """Thân nện: sin tụt cao độ có méo (phần trầm, để nhỏ) + tiếng gõ trung trầm + hơi nhiễu 300–450 Hz (hai lớp sau là phần loa nhỏ nghe được)."""
    return [O(f, d, v * 0.55, t, f2=f2, g=d * 0.55, dist=drive, c=c, a=0.002),
            O(f * 2.6, d * 0.5, v * 0.5, t, w='tri', f2=f2 * 2.6, g=d * 0.3, lp=1100, c=2.2, a=0.002),
            N(d * 0.55, v * 0.55, t, bp=450, bp2=300, bq=1.0, a=0.003, c=2.2)]


def crack(v=0.5, t=0.0, d=0.028, hp=1000):
    """Tiếng nứt đầu: vài chục ms nhiễu rộng, cho rõ nhịp."""
    return N(d, v, t, hp=hp, lp=4800, a=0.001, c=1.6)


def boom(t=0.0, size=1.0, v=1.0):
    """Nổ: nứt đầu + nhiễu trầm quét xuống (thân, nghe được trên loa nhỏ) + nện trầm. size 0,3 nhỏ … 1,5 rất lớn."""
    d = 0.3 + 0.32 * size
    return [N(d * 1.25, v, t, lp=1700 + 700 * size, lp2=320, hp=110, a=0.004, c=1.9), N(d * 0.8, v * 0.7, t, bp=620, bp2=320, bq=0.7, a=0.004, c=1.9),
            *thump(132 - 22 * size, 40, d, v * 0.5, t, 2.3 + 0.3 * size, 1.8), crack(v * 0.55, t)]


def rumble(d, v=0.8, t=0.0, am=9, a=0.02, c=1.4, top=900):
    """Rền (đất rung, sấm lăn): nhiễu 140–900 Hz rung chậm; cắt phần dưới 140 Hz vốn chỉ chiếm đỉnh mà loa nhỏ không ra."""
    return N(d, v, t, lp=top, lp2=top * 0.45, hp=140, am=am, amd=0.45, a=a, c=c)


def pops(d, v=0.3, t=0.0, rate=0.0035, c=1.5, a=0.004):
    """Lửa lách tách, tia lửa: hạt nổ lẻ tẻ."""
    return N(d, v, t, hp=1500, lp=4800, crackle=rate, c=c, a=a)


def gravel(d, v=0.35, t=0.0, f=1300, rate=0.005, c=1.5, a=0.004):
    """Đá vụn, sỏi lăn."""
    return N(d, v, t, bp=f, bq=1.5, crackle=rate, c=c, a=a)


def ice_ticks(d, v=0.4, t=0.0, rate=0.01, c=2.0):
    """Băng nứt lách cách."""
    return N(d, v, t, bp=2500, bq=2.2, lp=5200, crackle=rate, c=c, a=0.002)


def glass(f, d, v=0.2, t=0.0, i=1.5, c=2.5):
    """Tiếng pha lê ngắn (lọc bớt phần chói)."""
    return F(f, d, v, t, r=3.5, i=i, c=c, a=0.002, lp=4600)


def ring(f, d, v=0.2, t=0.0, i=2.0, r=2.76, c=2.4):
    """Kim loại ngân ngắn (lưỡi kiếm)."""
    return F(f, d, v, t, r=r, i=i, i2=0.15, c=c, a=0.002, lp=5000)


def gong(f, d, v=0.6, t=0.0, i=4.0):
    """Chuông chùa, chiêng trầm."""
    return [F(f, d, v, t, r=1.41, i=i, i2=0.35, c=1.5, a=0.004), F(f * 2, d * 0.65, v * 0.3, t, r=2.76, i=2.0, c=1.9, a=0.003)]


def swish(d, lo, hi, v=1.0, t=0.0, q=1.6, a=None, c=2.1, **k):
    """Vút: nhiễu lọc dải quét (lo → hi Hz)."""
    return N(d, v, t, bp=lo, bp2=hi, bq=q, a=d * 0.25 if a is None else a, c=c, **k)


def roar(v=0.8, t=0.0, lo=60.0, hi=96.0, d=1.2, form=(700, 1150), am=26, drive=4.0):
    """Rồng gầm: răng cưa trầm méo, cao độ lên rồi xuống, rung gắt, hai dải cộng hưởng như họng."""
    up, dn = d * 0.42, d * 0.78
    out = []
    for n, (bp, k) in enumerate([(None, 0.6)] + [(f, 0.9 - 0.25 * n) for n, f in enumerate(form)]):
        flt = {'lp': 1500, 'lp2': 800, 'hp': 220} if bp is None else {'bp': bp, 'bq': 3.0}   # cắt nốt gốc 60–100 Hz: tai vẫn nghe ra tiếng trầm qua bồi âm
        dt = n * 0.0037   # các dải lệch nhau vài ms: đỉnh sóng không chồng lên nhau, cùng đỉnh mà nghe to hơn
        out += [O(lo, up, v * k, t + dt, w='saw', f2=hi, g=up * 0.55, dist=drive, am=am + 2, amd=0.5, a=0.07, h=up * 0.45, c=1.5, **flt),   # h: giữ hơi, gầm dài chứ không sủa
                O(hi, dn, v * k, t + dt + up * 0.55, w='saw', f2=lo * 0.92, g=dn * 0.85, dist=drive, am=am - 2, amd=0.55, a=0.1, h=dn * 0.4, c=1.7, **flt)]
    return out


def mallets(notes, gap=0.08, d=1.0, v=0.6, t=0.0):
    return [M(f, d + 0.06 * k, v, t + k * gap) for k, f in enumerate(notes)]


DO, RE, MI, SOL, LA = 261.63, 293.66, 329.63, 392.0, 440.0   # ngũ cung Đô (quãng 4)
S = {}

# ============ KIM: kiếm, luân, sét ============
S['sk.kiem_khi'] = {'to': -22.5, 'jit': 1.5, 'rev': 0.12, 'gap': 0.05, 'L': [
    swish(0.2, 700, 2600, 1.0, a=0.03), ring(880, 0.28, 0.15, i=1.6), N(0.12, 0.1, 0.03, hp=3000, lp=6000, a=0.02), *thump(230, 130, 0.11, 0.16)]}
S['sk.h_kiem'] = {'to': -25, 'jit': 2, 'gap': 0.05, 'L': [
    swish(0.1, 2300, 800, 1.0, q=1.3, a=0.002), ring(1100, 0.13, 0.1, i=1.5, r=3.17, c=3), *thump(175, 75, 0.12, 0.2)]}
S['sk.h_kim'] = {'to': -24.5, 'jit': 1.5, 'gap': 0.05, 'rev': 0.15, 'L': [
    ring(784, 0.3, 0.3, i=1.8, r=3.17, c=2.6), swish(0.09, 2200, 800, 1.0, q=1.2, a=0.002), *thump(165, 70, 0.12, 0.25)]}
S['sk.van_kiem'] = {'to': -20, 'jit': 1, 'rev': 0.2, 'L': [
    *[swish(0.13, 900 + k * 150, 2500 + k * 180, 0.6, k * 0.035, q=2.0, a=0.015) for k in range(5)],
    swish(0.32, 500, 2000, 0.8, q=1.0, a=0.06),
    *[ring(f, 0.24, 0.1, 0.02 + k * 0.04, i=1.5) for k, f in enumerate([740, 831, 988, 1109])], *thump(200, 90, 0.14, 0.25)]}
S['sk.kim_luan'] = {'to': -19.5, 'jit': 0.8, 'rev': 0.25, 'L': [
    N(0.9, 1.0, bp=900, bp2=1900, bq=1.4, am=14, amd=0.85, a=0.1, c=1.7), O(90, 0.7, 0.3, w='saw', f2=250, g=0.5, lp=1300, lq=2, am=22, amd=0.7, a=0.05, c=1.6),
    ring(990, 0.8, 0.22, 0.04, i=2.0), *thump(170, 80, 0.2, 0.3)]}
S['sk.z_kim'] = {'to': -28, 'jit': 1.5, 'gap': 0.5, 'pan': 0.3, 'L': [
    N(1.15, 1.0, bp=1300, bq=1.6, am=13, amd=0.9, a=0.25, c=1.2), ring(1319, 0.45, 0.06, 0.2, i=1.2)]}
S['sk.phap_kim_luan'] = {'to': -20, 'jit': 1, 'rev': 0.25, 'L': [
    N(0.5, 1.0, bp=700, bp2=2300, bq=1.2, am=18, amd=0.65, a=0.04, c=1.9), ring(880, 0.5, 0.2, i=2.0), ring(1319, 0.4, 0.1, 0.05, i=1.5), *thump(180, 80, 0.16, 0.3)]}
S['sk.kim_quang'] = {'to': -19.5, 'jit': 0.8, 'rev': 0.2, 'L': [
    swish(0.2, 500, 3000, 1.0, q=1.3, a=0.05, c=2.0),
    swish(0.12, 2600, 900, 1.0, 0.15, q=1.2, a=0.002), ring(990, 0.4, 0.3, 0.15, i=3.0, r=3.17), *thump(165, 60, 0.2, 0.55, 0.15)]}
S['sk.long_thuong'] = {'to': -19, 'jit': 0.7, 'rev': 0.25, 'L': [
    swish(0.22, 400, 2600, 1.0, q=1.5, a=0.04), *roar(0.55, 0.0, 74, 112, 0.6, (850,), 30, 3.5),
    *thump(140, 50, 0.3, 0.5, 0.17), swish(0.1, 2200, 700, 0.9, 0.17, q=1.2, a=0.002), ring(660, 0.5, 0.25, 0.17, i=2.5)]}
S['sk.kim_cuong'] = {'to': -18, 'rev': 0.4, 'L': [
    O(110, 0.6, 0.35, w='saw', f2=220, lp=500, lp2=2200, a=0.35, c=1.5), *gong(330, 1.3, 0.8, 0.3, 3.5),
    N(0.7, 0.08, 0.25, hp=3200, lp=7000, a=0.15), *thump(125, 70, 0.2, 0.35, 0.3)]}
S['sk.kim_than'] = {'to': -15.5, 'rev': 0.5, 'L': [
    *gong(146.83, 2.4, 1.0, 0.0, 5.0),
    *[O(f, 2.0, v, w='saw', lp=1300, a=0.5, vib=5 + k * 0.4, vd=0.006, c=1.4) for k, (f, v) in enumerate([(220, 0.14), (329.63, 0.11), (440, 0.09)])],
    N(1.2, 0.12, hp=2500, hp2=6000, lp=7500, a=0.6), *thump(115, 50, 0.4, 0.5)]}
S['sk.loi_dinh'] = {'to': -16.5, 'jit': 0.8, 'rev': 0.4, 'L': [
    N(0.045, 1.0, hp=1300, lp=5500, a=0.001, c=1.5), N(0.32, 0.9, 0.005, bp=2400, bp2=600, bq=0.8, crackle=0.25, c=1.8),
    *thump(108, 34, 0.7, 0.5, drive=2.6, c=1.7), rumble(1.5, 0.85, 0.05, 7, 0.03, 1.4, 1100),
    O(110, 0.22, 0.2, w='square', lp=1800, am=47, amd=0.9)]}

# ============ HỎA ============
S['sk.hoa_cau'] = {'to': -22, 'jit': 1.5, 'rev': 0.15, 'gap': 0.05, 'L': [
    N(0.3, 1.0, bp=380, bp2=1500, bq=0.9, a=0.05, c=2.0, crackle=0.03), N(0.3, 0.45, 0.03, bp=900, bq=0.7, am=22, amd=0.6, a=0.05),
    pops(0.3, 0.3, 0.05, 0.003), *thump(160, 78, 0.2, 0.25)]}
S['sk.h_lua'] = {'to': -24.5, 'jit': 1.5, 'gap': 0.06, 'rev': 0.2, 'L': [*boom(0.0, 0.35), pops(0.4, 0.3, 0.04, 0.004)]}
S['sk.h_lua_to'] = {'to': -18.5, 'jit': 1, 'gap': 0.08, 'rev': 0.3, 'L': [
    *boom(0.0, 1.1), pops(0.9, 0.35, 0.05, 0.004), N(0.5, 0.4, 0.02, bp=320, bp2=900, bq=0.7, a=0.1)]}
S['sk.liet_hoa_tran'] = {'to': -20, 'jit': 1.2, 'rev': 0.18, 'L': [
    *[N(0.24, 0.85, k * 0.07, bp=380 + 60 * k, bp2=1500 + 250 * k, bq=0.9, a=0.04, c=2.0, crackle=0.03) for k in range(3)],
    pops(0.42, 0.3, 0.05, 0.004), *thump(160, 78, 0.18, 0.25), *thump(175, 85, 0.16, 0.2, 0.14)]}
S['sk.hoa_long'] = {'to': -17.5, 'jit': 0.7, 'rev': 0.35, 'L': [
    *roar(0.8, 0.0, 62, 98, 1.2), N(1.1, 0.6, bp=450, bp2=1300, bq=0.8, a=0.15, c=1.6, crackle=0.02),
    N(0.8, 0.55, 0.1, bp=320, bp2=1800, bq=1.0, a=0.25, c=1.8), *thump(125, 50, 0.4, 0.4, drive=2.5), pops(1.0, 0.22, 0.1, 0.003)]}
S['sk.liet_diem'] = {'to': -18, 'jit': 1, 'rev': 0.3, 'L': [
    *boom(0.0, 0.8), N(0.9, 0.55, 0.05, bp=520, bp2=900, bq=0.7, am=17, amd=0.5, a=0.08, c=1.5), pops(0.9, 0.3, 0.06, 0.004, 1.4)]}
S['sk.hoa_hon'] = {'to': -17.5, 'jit': 0.6, 'rev': 0.45, 'L': [
    *boom(0.0, 0.6, 0.9), N(0.8, 0.5, 0.05, bp=520, bp2=900, bq=0.7, am=17, amd=0.5, a=0.08, c=1.5), pops(0.8, 0.25, 0.06, 0.004, 1.4),
    *gong(196, 1.6, 0.55, 0.02)]}
S['sk.phan_thien'] = {'to': -18.5, 'jit': 0.8, 'rev': 0.3, 'L': [
    N(0.5, 1.0, bp=320, bp2=1600, bq=0.9, a=0.12, c=1.8, crackle=0.03), N(2.6, 0.75, 0.2, bp=620, bp2=480, bq=0.6, am=15, amd=0.5, a=0.3, c=1.3),
    pops(2.6, 0.3, 0.15, 0.0035, 1.2), *thump(100, 55, 0.9, 0.4, c=1.6), rumble(1.5, 0.4, 0.0, 6, 0.1, 1.5, 700)]}
S['sk.z_lua'] = {'to': -28, 'jit': 2, 'gap': 0.5, 'pan': 0.3, 'L': [
    N(1.5, 1.0, bp=580, bq=0.6, am=14, amd=0.5, a=0.35, c=1.1), pops(1.4, 0.5, 0.0, 0.0035, 1.1, 0.2)]}
S['sk.phuong_hoang'] = {'to': -16, 'jit': 0.6, 'rev': 0.35, 'L': [
    O(1180, 0.5, 0.42, w='pulse', f2=830, g=0.42, lp=2400, vib=27, vd=0.035, a=0.025, c=1.7),
    O(1770, 0.3, 0.1, w='pulse', f2=1245, g=0.3, lp=3000, vib=27, vd=0.035, a=0.02, c=1.9),
    N(0.42, 1.0, bp=380, bp2=2300, bq=1.0, a=0.1, c=1.9, crackle=0.02),
    *boom(0.24, 0.8, 0.9), pops(0.8, 0.3, 0.28, 0.004)]}

# ============ THỦY: băng, nước ============
S['sk.bang_truy'] = {'to': -22, 'jit': 1.2, 'rev': 0.3, 'gap': 0.05, 'L': [
    swish(0.2, 900, 2800, 1.0, a=0.03, c=2.2), glass(1397, 0.35, 0.22, i=1.6), glass(2093, 0.22, 0.08, 0.03, i=1.2, c=2.8),
    N(0.25, 0.12, 0.02, hp=3500, lp=7000, a=0.04), *thump(220, 130, 0.1, 0.16)]}
S['sk.h_bang'] = {'to': -25, 'jit': 2, 'gap': 0.05, 'rev': 0.25, 'L': [
    crack(0.7, 0.0, 0.02, 1400), ice_ticks(0.26, 1.0, 0.0, 0.012, 2.2), glass(1865, 0.2, 0.25, i=1.6, c=2.6), glass(2489, 0.16, 0.12, 0.025, i=1.4, c=2.8),
    swish(0.09, 2000, 900, 0.6, q=1.0, a=0.002), *thump(190, 85, 0.1, 0.2)]}
S['sk.bang_phach'] = {'to': -18, 'jit': 0.8, 'rev': 0.35, 'L': [
    *[glass(1245 * 1.122 ** k, 0.12, 0.25, k * 0.04, i=1.4, c=2.6) for k in range(6)],
    N(0.5, 1.0, bp=1000, bp2=2900, bq=0.9, a=0.08, c=1.8), N(0.6, 0.12, hp=4000, lp=7500, a=0.1), *thump(170, 70, 0.25, 0.4),
    ice_ticks(0.4, 0.3, 0.05, 0.01)]}
S['sk.thuy_long'] = {'to': -17.5, 'jit': 0.7, 'rev': 0.35, 'L': [
    N(0.9, 1.0, bp=320, bp2=1000, bq=0.8, am=10, amd=0.55, a=0.15, c=1.6), N(0.5, 0.3, 0.05, bp=2000, bq=0.8, a=0.1, c=2.0),
    *roar(0.45, 0.0, 84, 126, 0.95, (900,), 28, 3.0),
    *[O(280 + 70 * k, 0.07, 0.22, 0.08 + 0.07 * k, f2=(280 + 70 * k) * 2.2) for k in range(5)], *thump(135, 55, 0.3, 0.35)]}
S['sk.h_nuoc'] = {'to': -25, 'jit': 2, 'gap': 0.05, 'rev': 0.15, 'L': [
    N(0.3, 1.0, bp=1500, bp2=500, bq=0.9, a=0.004, c=2.0), N(0.2, 0.22, 0.02, hp=2800, lp=6500, a=0.02, c=2.2),
    O(320, 0.06, 0.35, f2=900), O(600, 0.06, 0.25, 0.05, f2=1300), *thump(165, 70, 0.12, 0.2)]}
S['sk.bang_phong'] = {'to': -18, 'jit': 0.8, 'rev': 0.4, 'L': [
    N(0.4, 0.9, bp=1200, bp2=3600, bq=1.5, crackle=0.02, a=0.02, c=1.6), *boom(0.0, 0.7),
    glass(1046.5, 0.9, 0.25, 0.03, i=1.5, c=2.0), glass(1567.98, 0.8, 0.16, 0.06, i=1.3, c=2.2), glass(2093, 0.6, 0.08, 0.1, i=1.1),
    N(1.0, 0.3, 0.1, bp=1900, bp2=1200, bq=0.6, a=0.2, c=1.5)]}
S['sk.han_bang'] = {'to': -19, 'jit': 0.6, 'rev': 0.45, 'L': [
    N(2.4, 1.0, bp=700, bp2=1500, bq=0.7, am=3.5, amd=0.35, a=0.4, c=1.3), ice_ticks(0.9, 0.5, 0.05, 0.008, 1.6),
    O(110, 1.6, 0.18, a=0.2, c=1.5, dist=1.6), glass(1318.5, 0.6, 0.15, 0.2, i=1.4), glass(1975.5, 0.5, 0.09, 0.5, i=1.2), glass(1568, 0.6, 0.12, 0.9, i=1.3),
    *thump(145, 60, 0.3, 0.35)]}
S['sk.z_bang'] = {'to': -28, 'jit': 2, 'gap': 0.5, 'pan': 0.3, 'L': [
    N(1.6, 1.0, bp=1100, bq=0.6, am=3, amd=0.4, a=0.5, c=1.1), ice_ticks(1.2, 0.3, 0.2, 0.004, 1.3)]}
S['sk.thuy_thuan'] = {'to': -19.5, 'rev': 0.45, 'L': [
    O(280, 0.2, 0.8, f2=700, g=0.16, a=0.01, c=1.8), N(0.7, 0.7, bp=500, bp2=1200, bq=1.0, am=11, amd=0.6, a=0.1, c=1.6),
    O(SOL, 1.0, 0.3, a=0.15, am=6, amd=0.3, c=1.5), O(DO * 2, 0.9, 0.22, a=0.2, am=6, amd=0.3, c=1.5),
    O(900, 0.05, 0.2, 0.3, f2=1700), O(1100, 0.05, 0.15, 0.42, f2=2000)]}
S['sk.huyen_thuy'] = {'to': -19, 'rev': 0.45, 'L': [
    *thump(145, 65, 0.3, 0.6), N(0.08, 0.4, lp=1500), M(SOL, 1.0, 0.5, 0.05), M(RE * 2, 0.9, 0.35, 0.13),
    N(0.9, 0.6, 0.05, bp=420, bp2=1000, bq=1.0, am=9, amd=0.6, a=0.12, c=1.6), O(RE, 1.1, 0.25, a=0.2, am=5, amd=0.3, c=1.5)]}

# ============ MỘC ============
S['sk.dang_phuoc'] = {'to': -19.5, 'jit': 1, 'rev': 0.25, 'L': [
    *thump(138, 58, 0.3, 0.4), O(85, 0.5, 0.6, w='saw', f2=150, g=0.4, lp=1100, hp=180, lq=2, am=19, amd=0.7, vib=9, vd=0.03, a=0.03, c=1.6),
    N(0.7, 0.8, bp=2200, bq=0.8, lp=5000, crackle=0.1, am=13, amd=0.5, a=0.05, c=1.7), crack(0.7, 0.1, 0.03, 1400), crack(0.5, 0.22, 0.03, 1400),
    F(330, 0.1, 0.45, 0.05, r=1.5, i=1.2), F(247, 0.12, 0.4, 0.16, r=1.5, i=1.2)]}
S['sk.van_moc_cham'] = {'to': -21.5, 'jit': 1.5, 'rev': 0.12, 'L': [
    *[swish(0.07, 1600 + 220 * k, 3000 + 250 * k, 0.8, k * 0.035, q=2.5, a=0.008) for k in range(5)],
    *[F(520 + 40 * k, 0.05, 0.35, k * 0.035, r=1.5, i=1.0) for k in range(5)], P(196, 0.4, 0.3, damp=0.6), *thump(185, 100, 0.1, 0.2)]}
S['sk.h_la'] = {'to': -25, 'jit': 2, 'gap': 0.05, 'L': [
    F(440, 0.12, 0.9, r=1.5, i=1.4, c=2.6), N(0.2, 0.5, bp=2300, bq=0.9, lp=5000, crackle=0.12, c=2.2), *thump(170, 80, 0.1, 0.25)]}
S['sk.luc_dang_long'] = {'to': -17.5, 'jit': 0.7, 'rev': 0.35, 'L': [
    *roar(0.8, 0.0, 58, 92, 1.15, (650, 1050), 21), N(1.0, 0.75, bp=900, bp2=2600, bq=0.8, lp=5000, crackle=0.08, am=12, amd=0.4, a=0.2, c=1.6),
    O(120, 0.6, 0.35, 0.1, w='saw', f2=190, lp=1000, lq=2.5, am=17, amd=0.7, vib=8, vd=0.03), *thump(128, 50, 0.4, 0.4, drive=2.4)]}
S['sk.thanh_moc'] = {'to': -19, 'rev': 0.45, 'L': [
    O(130.81, 0.7, 0.5, f2=196, g=0.5, a=0.05, dist=1.6, c=1.6), *mallets([SOL, DO * 2, MI * 2], 0.12, 1.0, 0.45, 0.05),
    N(1.8, 0.5, bp=2200, bq=0.7, lp=5000, crackle=0.08, am=9, amd=0.5, a=0.4, c=1.3), O(196, 1.6, 0.25, a=0.3, c=1.4), O(RE, 1.6, 0.18, a=0.35, c=1.4)]}
S['sk.z_moc'] = {'to': -28.5, 'jit': 1, 'gap': 0.5, 'pan': 0.3, 'L': [
    N(1.5, 1.0, bp=1800, bq=0.7, lp=4200, crackle=0.06, am=7, amd=0.5, a=0.4, c=1.1), M(SOL * 2, 0.6, 0.12, 0.3)]}
S['sk.hoi_xuan'] = {'to': -17.5, 'rev': 0.5, 'L': [
    *mallets([DO * 2, MI * 2, SOL * 2], 0.08, 1.0, 0.6), O(DO, 0.9, 0.22, a=0.15, c=1.5), N(0.6, 0.05, hp=4500, lp=8000, a=0.2),
    N(0.5, 0.12, bp=2300, bq=0.8, lp=5000, crackle=0.08, a=0.1)]}
S['sk.truong_xuan'] = {'to': -16, 'rev': 0.55, 'L': [
    *mallets([SOL, DO * 2, MI * 2, SOL * 2, DO * 4], 0.09, 1.4, 0.55), *[O(f, 1.8, v, a=0.3, c=1.4) for f, v in [(196, 0.2), (DO, 0.18), (SOL, 0.12)]],
    N(1.2, 0.06, hp=4200, lp=8000, a=0.5), O(98, 0.8, 0.35, f2=130.81, dist=1.5, a=0.05, c=1.6)]}
S['sk.thanh_moc_an'] = {'to': -17, 'rev': 0.5, 'L': [
    *thump(142, 70, 0.25, 0.5), *mallets([SOL, 493.88, RE * 2, SOL * 2], 0.08, 1.0, 0.52, 0.04),
    N(0.6, 0.14, bp=2300, bq=0.8, lp=5000, crackle=0.08, a=0.1), O(196, 1.0, 0.2, a=0.15, c=1.5)]}

# ============ THỔ ============
S['sk.thach_chuy'] = {'to': -20.5, 'jit': 1, 'rev': 0.15, 'L': [
    N(0.4, 1.0, bp=260, bp2=800, bq=0.9, a=0.1, c=1.9), *thump(118, 50, 0.3, 0.4, drive=2.5), gravel(0.35, 0.6, 0.0, 900, 0.01, 2.0), rumble(0.4, 0.5, 0.0, 14, 0.03, 1.8, 800)]}
S['sk.h_da'] = {'to': -24, 'jit': 1.5, 'gap': 0.06, 'rev': 0.2, 'L': [
    N(0.4, 1.0, lp=1700, lp2=360, hp=130, crackle=0.1, c=2.0), *thump(142, 42, 0.32, 0.3, drive=2.6), gravel(0.45, 0.6, 0.04, 1400, 0.006, 1.6), crack(0.5, 0.0, 0.025, 900)]}
S['sk.dia_chan'] = {'to': -17.5, 'jit': 0.8, 'rev': 0.3, 'L': [
    N(0.8, 1.0, lp=1600, lp2=340, hp=130, crackle=0.08, c=1.8), rumble(1.3, 0.9, 0.0, 11), *thump(98, 32, 0.75, 0.45, drive=2.8, c=1.6),
    gravel(1.0, 0.5, 0.1, 1200, 0.005, 1.4), crack(0.55, 0.0, 0.03, 900)]}
S['sk.son_nhac'] = {'to': -15.5, 'jit': 0.5, 'rev': 0.4, 'L': [
    N(0.17, 0.4, bp=1400, bp2=350, bq=1.0, a=0.12, c=2.0),
    N(1.0, 1.0, 0.16, lp=1700, lp2=340, hp=130, crackle=0.08, c=1.7), rumble(1.8, 0.9, 0.16, 9, 0.02, 1.3),
    *thump(88, 28, 1.0, 0.5, 0.16, 3.0, 1.5), *thump(125, 45, 0.4, 0.3, 0.18, 2.5),
    gravel(1.4, 0.4, 0.28, 1100, 0.005, 1.3), *gong(98, 2.2, 0.5, 0.19), crack(0.55, 0.16, 0.03, 900)]}
S['sk.luu_sa'] = {'to': -19.5, 'jit': 0.8, 'rev': 0.25, 'L': [
    N(2.4, 1.0, bp=1700, bp2=1200, bq=0.5, lp=3600, am=5, amd=0.35, a=0.35, c=1.3), rumble(1.6, 0.6, 0.0, 8, 0.1),
    *thump(115, 55, 0.4, 0.4), gravel(1.2, 0.3, 0.0, 1000, 0.006, 1.5, 0.1)]}
S['sk.z_cat'] = {'to': -28.5, 'jit': 2, 'gap': 0.5, 'pan': 0.3, 'L': [
    N(1.6, 1.0, bp=1400, bq=0.5, lp=3400, am=4, amd=0.4, a=0.5, c=1.1), gravel(1.3, 0.3, 0.1, 1000, 0.004, 1.2, 0.2)]}
S['sk.thach_giap'] = {'to': -19.5, 'rev': 0.3, 'L': [
    *[x for k, t in enumerate([0, 0.09, 0.19]) for x in (*thump(152 - 15 * k, 70, 0.14, 0.35, t), N(0.07, 0.9, t, lp=1500, hp=200, crackle=0.1), crack(0.4, t, 0.02, 900))],
    F(196, 0.8, 0.3, 0.2, r=1.41, i=2, c=1.8), gravel(0.5, 0.3, 0.05, 1100, 0.006)]}
S['sk.dai_dia'] = {'to': -17.5, 'rev': 0.4, 'L': [
    *thump(122, 48, 0.4, 0.7, drive=2.6), *thump(112, 42, 0.5, 0.65, 0.28, 2.6), N(0.6, 0.7, lp=1400, lp2=500, crackle=0.08, a=0.02),
    N(0.5, 0.6, 0.28, lp=1300, lp2=450, crackle=0.08, a=0.01), *gong(110, 1.8, 0.5, 0.28), rumble(1.2, 0.5, 0.0, 8, 0.1)]}
S['sk.tran_yeu'] = {'to': -17.5, 'rev': 0.5, 'L': [
    N(0.16, 0.5, bp=1800, bp2=500, bq=1.2, a=0.1, c=2.0), *gong(196, 2.2, 1.0, 0.16, 4.5), *thump(128, 50, 0.4, 0.6, 0.15, 2.5),
    N(0.3, 0.6, 0.15, lp=1300, crackle=0.08), N(0.9, 0.06, 0.2, hp=3800, lp=7500, a=0.2)]}

# ============ PHONG, ÂM, NGUYỆT, TIỄN ============
S['sk.cuong_phong'] = {'to': -19, 'jit': 1, 'rev': 0.3, 'L': [
    N(1.0, 1.0, bp=300, bp2=1500, bq=0.9, am=5, amd=0.35, a=0.14, c=1.6), N(0.8, 0.3, 0.05, bp=2200, bp2=3000, bq=0.8, a=0.15, c=1.8),
    *[swish(0.14, 900, 2600, 0.5, t, q=2.2, a=0.04) for t in (0.08, 0.22, 0.38)], O(820, 0.6, 0.06, 0.1, f2=1250, vib=6, vd=0.02, a=0.2),
    *thump(125, 60, 0.3, 0.35)]}
S['sk.that_huyen'] = {'to': -19, 'jit': 0.5, 'rev': 0.45, 'L': [
    *[P(f, 1.3 - 0.05 * k, 0.9 - 0.06 * k, k * 0.028, damp=0.3, br=0.8, lp=3600) for k, f in enumerate([146.83, 196, 220, RE, SOL, LA])],
    O(98, 0.8, 0.3, c=1.6), swish(0.4, 800, 2000, 0.3, 0.1, q=1.2, a=0.12), N(0.012, 0.25, hp=2200, lp=5000)]}
S['sk.h_am'] = {'to': -25.5, 'jit': 2, 'gap': 0.06, 'rev': 0.2, 'L': [P(RE * 2, 0.4, 1.0, br=0.8, lp=3600), *thump(190, 90, 0.09, 0.2)]}
S['sk.tu_nguyet_liem'] = {'to': -22, 'jit': 1.5, 'rev': 0.3, 'gap': 0.05, 'L': [
    swish(0.32, 450, 1900, 1.0, q=2.0, a=0.05, c=2.0), O(110, 0.4, 0.45, w='saw', f2=82, lp=700, am=31, amd=0.6, a=0.02, c=1.8),
    F(740, 0.45, 0.14, 0.03, r=1.5, i=2, c=2.2), F(784, 0.4, 0.08, 0.05, r=1.5, i=1.5, c=2.2), *thump(155, 80, 0.12, 0.2)]}
S['sk.h_liem'] = {'to': -25, 'jit': 1.5, 'gap': 0.05, 'rev': 0.2, 'L': [
    swish(0.11, 2100, 700, 1.0, q=1.3, a=0.002), *thump(132, 48, 0.18, 0.3), F(370, 0.2, 0.3, r=1.5, i=2.5, c=2.5)]}
S['sk.song_nguyet'] = {'to': -20, 'jit': 1.2, 'rev': 0.3, 'L': [
    swish(0.26, 500, 2000, 1.0, q=2.0, a=0.04), swish(0.26, 600, 2200, 0.85, 0.09, q=2.0, a=0.04), swish(0.22, 700, 2400, 0.6, 0.17, q=2.0, a=0.04),
    O(110, 0.45, 0.45, w='saw', f2=82, lp=700, am=31, amd=0.6, a=0.02, c=1.8), F(740, 0.45, 0.12, 0.03, r=1.5, i=2, c=2.2), *thump(155, 80, 0.12, 0.2)]}
S['sk.tu_nguyet_luan'] = {'to': -16.5, 'jit': 0.7, 'rev': 0.4, 'L': [
    N(0.8, 1.0, bp=400, bp2=2100, bq=1.4, am=12, amd=0.7, a=0.08, c=1.7), *gong(185, 1.4, 0.55),
    O(98, 0.7, 0.45, w='saw', f2=73, lp=650, am=29, amd=0.6, c=1.7), F(740, 0.7, 0.12, 0.05, r=1.5, i=2), F(784, 0.6, 0.08, 0.08, r=1.5, i=1.5),
    *thump(142, 55, 0.3, 0.4)]}
S['sk.lien_chau'] = {'to': -22, 'jit': 1, 'L': [
    *[x for k, f in enumerate([147, 165, 185]) for x in (P(f, 0.3, 1.0 - 0.1 * k, k * 0.06, damp=0.5, br=0.75, lp=3200),
                                                     swish(0.16, 1800, 3200, 0.45, k * 0.06 + 0.025, q=1.5, a=0.02))]]}
S['sk.h_ten'] = {'to': -27, 'jit': 2, 'gap': 0.04, 'L': [N(0.05, 1.0, bp=1600, bq=1.0, a=0.002), O(380, 0.07, 0.6, f2=150), F(520, 0.07, 0.4, r=1.5, i=1.0)]}

# ============ CHIÊU ĐẶC BIỆT (Vạn Bảo Lâu) ============
# Phá Thiên Tuyệt Trảm: tụ 2,5 giây (to dần, tim đập dồn) rồi chém
BEATS = [0.0, 0.5, 0.95, 1.35, 1.7, 2.0, 2.25, 2.45]
S['sk.pha_thien_tu'] = {'to': -17, 'rev': 0.35, 'L': [
    O(55, 2.6, 0.5, w='saw', f2=165, g=2.5, lp=450, lp2=2600, dist=2.5, a=2.4, c=1.0),
    *[x for k, t in enumerate(BEATS) for x in thump(105, 55, 0.18, 0.3 + 0.04 * k, t)],
    N(2.6, 0.7, bp=320, bp2=3200, bq=1.2, a=2.4, c=1.0), pops(2.5, 0.35, 0.1, 0.004, 1.0, 2.0),
    O(220, 2.6, 0.2, f2=440, g=2.5, a=2.3, vib=7, vd=0.01, c=1.0), O(329.63, 2.6, 0.14, f2=659.25, g=2.5, a=2.3, vib=7.5, vd=0.01, c=1.0)]}
S['sk.pha_thien_chem'] = {'to': -12.5, 'rev': 0.5, 'L': [
    N(0.5, 1.0, bp=3600, bp2=600, bq=1.1, a=0.004, c=1.8), F(554.37, 1.2, 0.45, r=3.17, i=4.5, i2=0.3, c=1.6, lp=5000), F(277.18, 1.4, 0.4, r=1.41, i=4, i2=0.3, c=1.5),
    N(1.2, 0.9, lp=2400, lp2=220, c=1.6), *thump(102, 30, 0.9, 0.6, drive=3.0, c=1.5), N(1.0, 0.45, 0.1, bp=1200, bp2=420, bq=0.7, a=0.1, c=1.5)]}
# Thiên Phạt: tụ sét 2,5 giây rồi nổ thành chùm sét
S['sk.thien_phat_tu'] = {'to': -17.5, 'rev': 0.35, 'L': [
    O(60, 2.6, 0.4, w='square', f2=120, g=2.5, lp=900, lp2=2400, am=50, amd=0.8, a=2.3, c=1.0), N(2.6, 0.7, hp=1400, lp=5500, crackle=0.006, a=2.2, c=1.0),
    *[N(0.07, 0.5, t, bp=2400, bp2=900, bq=1.0, crackle=0.3) for t in (0.4, 0.9, 1.3, 1.65, 1.95, 2.2, 2.4)],
    rumble(2.6, 0.5, 0.0, 9, 2.0, 1.0), O(196, 2.6, 0.16, f2=392, g=2.5, a=2.3, vib=8, vd=0.012, c=1.0)]}
S['sk.thien_phat_no'] = {'to': -13, 'rev': 0.5, 'L': [
    *[N(0.045, 1.0 - 0.12 * k, t, hp=1300, lp=5500, a=0.001, c=1.5) for k, t in enumerate([0.0, 0.07, 0.16, 0.27])],
    N(0.6, 1.0, bp=2600, bp2=500, bq=0.8, crackle=0.25, c=1.6), *thump(102, 30, 1.0, 0.45, drive=3.0, c=1.5),
    rumble(2.6, 1.0, 0.05, 6, 0.03, 1.3, 1400), O(110, 0.4, 0.2, w='square', lp=2000, am=45, amd=0.9)]}
# Vô Ảnh Trảm Vực: mở lĩnh vực tối (1 giây), vạn trảm, nhát kết
S['sk.vo_anh_mo'] = {'to': -17, 'rev': 0.5, 'L': [
    N(1.0, 0.9, bp=2300, bp2=320, bq=1.2, a=0.8, c=1.2), *thump(142, 40, 0.9, 0.6, 0.05, 2.5, 1.4),
    F(233.08, 1.6, 0.4, r=1.5, i=3, i2=0.5, a=0.3, c=1.4), F(246.94, 1.6, 0.3, r=1.5, i=2.5, a=0.3, c=1.4), N(1.4, 0.25, hp=2800, lp=6000, a=0.6, am=7, amd=0.5)]}
S['sk.vo_anh_chem'] = {'to': -27, 'jit': 3, 'gap': 0.07, 'pan': 0.5, 'L': [
    swish(0.09, 2500, 900, 1.0, q=1.6, a=0.002, c=2.2), ring(1480, 0.08, 0.08, i=2, r=3.17, c=3), *thump(190, 90, 0.07, 0.12)]}
S['sk.vo_anh_ket'] = {'to': -13.5, 'rev': 0.5, 'L': [
    N(0.4, 1.0, bp=3400, bp2=500, bq=1.1, a=0.003, c=1.8), F(415.3, 1.0, 0.45, r=3.17, i=4.5, i2=0.3, c=1.6, lp=5000),
    N(0.9, 0.85, lp=2000, lp2=220, c=1.7), *thump(106, 32, 0.7, 0.6, drive=2.8, c=1.6)]}
# Thiểm Ảnh Liên Trảm: lướt chém 6 nhát trong 1 giây
S['sk.thiem_anh'] = {'to': -23.5, 'jit': 1, 'rev': 0.15, 'L': [
    swish(0.12, 1200, 3400, 1.0, q=2.0, a=0.01), O(600, 0.08, 0.3, f2=1500), *thump(200, 100, 0.1, 0.2)]}
S['sk.thiem_chem'] = {'to': -24.5, 'jit': 2.5, 'gap': 0.05, 'pan': 0.4, 'L': [
    swish(0.1, 2400, 800, 1.0, q=1.4, a=0.002), ring(1175, 0.12, 0.1, i=1.6, r=3.17, c=3), *thump(172, 70, 0.1, 0.2)]}
# Vạn Kiếm Thiên Lâm: gọi kiếm 2,5 giây, kiếm khí bùng, từng thanh rời vòng và cắm đất
ARRIVE = [0.1 + k * 0.22 + (0.05 if k % 2 else 0) for k in range(10)]
S['sk.vkt_trieu'] = {'to': -18, 'rev': 0.4, 'L': [
    *[x for k, t in enumerate(ARRIVE) for x in (swish(0.18, 1400, 3000, 0.5, t, q=2.5, a=0.1, c=2.0),
                                              ring([587.33, 659.25, 783.99, 880, 987.77][k % 5], 0.3, 0.09, t + 0.1, i=1.5))],
    N(2.6, 0.5, bp=400, bp2=1800, bq=0.8, a=2.2, c=1.0, am=6, amd=0.3), O(73.42, 2.6, 0.3, w='saw', f2=110, g=2.4, lp=550, lp2=1400, a=2.2, c=1.0, dist=2)]}
S['sk.vkt_bung'] = {'to': -15, 'rev': 0.45, 'L': [
    ring(880, 1.0, 0.45, i=3.0, c=1.8), F(440, 1.2, 0.4, r=1.41, i=3, c=1.6), swish(0.3, 2000, 600, 0.9, q=1.0, a=0.004),
    *thump(132, 50, 0.4, 0.5, drive=2.4), N(0.8, 0.1, hp=3200, lp=7500, a=0.05)]}
S['sk.vkt_bay'] = {'to': -27, 'jit': 3, 'gap': 0.06, 'pan': 0.5, 'L': [swish(0.14, 1300, 2800, 1.0, q=2.2, a=0.02, c=2.2)]}
S['sk.vkt_cam'] = {'to': -23, 'jit': 2.5, 'gap': 0.05, 'pan': 0.4, 'rev': 0.2, 'L': [
    swish(0.08, 2200, 800, 1.0, q=1.2, a=0.002), *thump(162, 60, 0.14, 0.35), ring(932.33, 0.3, 0.28, i=3.0, r=3.17), gravel(0.2, 0.3, 0.02, 1300, 0.008)]}

BY = {
    'kiem-khi': {'c': 'sk.kiem_khi', 'h': 'sk.h_kiem'},
    'van-kiem': {'c': 'sk.van_kiem', 'h': 'sk.h_kiem'},
    'kim-luan': {'c': 'sk.kim_luan', 'z': ['sk.z_kim', 1.0, 0.8]},
    'phap-kim-luan': {'c': 'sk.phap_kim_luan', 'h': 'sk.h_kim'},
    'kim-quang-tram': {'c': 'sk.kim_quang'},
    'long-thuong': {'c': 'sk.long_thuong'},
    'kim-cuong-the': {'c': 'sk.kim_cuong'},
    'kim-than': {'c': 'sk.kim_than'},
    'loi-dinh': {'c': 'sk.loi_dinh'},
    'hoa-cau': {'c': 'sk.hoa_cau', 'h': 'sk.h_lua'},
    'liet-hoa-tran': {'c': 'sk.liet_hoa_tran', 'h': 'sk.h_lua'},
    'hoa-long': {'c': 'sk.hoa_long', 'h': 'sk.h_lua', 'b': 'sk.h_lua_to'},
    'liet-diem': {'c': 'sk.liet_diem'},
    'phap-hoa-hon': {'c': 'sk.hoa_hon'},
    'phan-thien': {'c': 'sk.phan_thien', 'z': ['sk.z_lua', 1.2, 0.8]},
    'phuong-hoang': {'c': 'sk.phuong_hoang'},
    'bang-truy': {'c': 'sk.bang_truy', 'h': 'sk.h_bang'},
    'bang-phach': {'c': 'sk.bang_phach', 'h': 'sk.h_bang'},
    'thuy-long': {'c': 'sk.thuy_long', 'h': 'sk.h_nuoc'},
    'bang-phong': {'c': 'sk.bang_phong'},
    'han-bang-vuc': {'c': 'sk.han_bang', 'z': ['sk.z_bang', 1.4, 0.8]},
    'thuy-thuan': {'c': 'sk.thuy_thuan'},
    'phap-huyen-thuy': {'c': 'sk.huyen_thuy'},
    'dang-phuoc': {'c': 'sk.dang_phuoc'},
    'van-moc-cham': {'c': 'sk.van_moc_cham', 'h': 'sk.h_la'},
    'luc-dang-long': {'c': 'sk.luc_dang_long', 'h': 'sk.h_la'},
    'thanh-moc-vuc': {'c': 'sk.thanh_moc', 'z': ['sk.z_moc', 1.5, 0.8]},
    'hoi-xuan': {'c': 'sk.hoi_xuan'},
    'truong-xuan': {'c': 'sk.truong_xuan'},
    'phap-thanh-moc': {'c': 'sk.thanh_moc_an'},
    'thach-chuy': {'c': 'sk.thach_chuy', 'h': 'sk.h_da'},
    'dia-chan': {'c': 'sk.dia_chan'},
    'son-nhac': {'c': 'sk.son_nhac'},
    'luu-sa': {'c': 'sk.luu_sa', 'z': ['sk.z_cat', 1.4, 0.8]},
    'thach-giap': {'c': 'sk.thach_giap'},
    'dai-dia': {'c': 'sk.dai_dia'},
    'phap-tran-yeu': {'c': 'sk.tran_yeu'},
    'cuong-phong': {'c': 'sk.cuong_phong'},
    'that-huyen': {'c': 'sk.that_huyen', 'h': 'sk.h_am'},
    'tu-nguyet-liem': {'c': 'sk.tu_nguyet_liem', 'h': 'sk.h_liem'},
    'song-nguyet-tram': {'c': 'sk.song_nguyet', 'h': 'sk.h_liem'},
    'tu-nguyet-luan': {'c': 'sk.tu_nguyet_luan', 'h': 'sk.h_liem'},
    'lien-chau': {'c': 'sk.lien_chau', 'h': 'sk.h_ten'},
    'pha-thien': {'c': 'sk.pha_thien_tu', 'r': 'sk.pha_thien_chem'},
    'thien-phat': {'c': 'sk.thien_phat_tu', 'r': 'sk.thien_phat_no'},
    'vo-anh': {'c': 'sk.vo_anh_mo', 'k': ['sk.vo_anh_chem', 2.2], 'r': 'sk.vo_anh_ket'},   # k: game gọi với âm lượng 0,45 (tiếng vút cũ)
    'thiem-anh': {'c': 'sk.thiem_anh', 'k': ['sk.thiem_chem', 1.1]},
    'van-kiem-thien': {'c': 'sk.vkt_trieu', 'r': ['sk.vkt_bung', 1.25], 's': ['sk.vkt_bay', 2.0], 'k': ['sk.vkt_cam', 1.4]},   # game gọi 0,8 / 0,5 / 0,7
}

NOTE = ("Tiếng riêng từng chiêu (chủ dự án 13/11/2026), đi cùng bộ hiệu ứng điểm ảnh: chỉ kêu khi hiệu ứng điểm ảnh bật (data/vfx.json → px_on "
        "hoặc địa chỉ ?pfx=1); tắt thì dùng tiếng theo hệ ở data/sounds.json → by_fx. File do tools/sfx_chieu.py ghi toàn bộ, muốn sửa thì sửa ở đó "
        "rồi chạy lại. sfx: công thức (như data/sounds.json → sfx, dựng bằng src/core/synth.js); to: độ to đích trên loa điện thoại (dB), v do công cụ "
        "tính ra để đạt. by_skill: mã chiêu → { c: lúc tung, h: đạn trúng, b: đạn nổ lan, z: [tiếng, chu kỳ giây, âm lượng] lặp khi vùng chiêu còn, "
        "r / s / k: mốc riêng của chiêu đặc biệt } (src/game/skill-sfx.js). Đo bằng node tools/sfx-check.mjs --chieu.")


def rnd(x):   # số gọn cho file dữ liệu
    if isinstance(x, float):
        return round(x, 4)
    if isinstance(x, dict):
        return {k: rnd(v) for k, v in x.items()}
    if isinstance(x, list):
        return [rnd(v) for v in x]
    return x


def write(vol):
    """Ghi file; vol: tên tiếng → v (đỉnh sau chuẩn hoá)."""
    sfx = {k: rnd({'v': vol[k], **r}) for k, r in S.items()}
    lines = ['{', ' "_note": ' + json.dumps(NOTE, ensure_ascii=False) + ',', ' "sfx": {']
    lines += ['  ' + json.dumps(k) + ': ' + json.dumps(v, ensure_ascii=False) + (',' if i < len(sfx) - 1 else '') for i, (k, v) in enumerate(sfx.items())]
    lines += [' },', ' "by_skill": {']
    lines += ['  ' + json.dumps(k) + ': ' + json.dumps(v, ensure_ascii=False) + (',' if i < len(BY) - 1 else '') for i, (k, v) in enumerate(BY.items())]
    lines += [' }', '}']
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    json.loads(OUT.read_text(encoding='utf-8'))


# Lượt 1: mọi tiếng đỉnh 0,5, đo độ to trên loa điện thoại (LP). Lượt 2: chỉnh v để LP về đúng "to".
write({k: 0.5 for k in S})
with tempfile.TemporaryDirectory() as tmp:
    do = Path(tmp) / 'do.json'
    subprocess.run(['node', str(ROOT / 'tools' / 'sfx-check.mjs'), '--chieu', '--do', str(do)], cwd=ROOT, capture_output=True, text=True)
    m = json.loads(do.read_text(encoding='utf-8'))
vol, capped = {}, []
for k, r in S.items():
    v = 0.5 * 10 ** ((r['to'] - m[k]['lp']) / 20)
    if v > VMAX:
        capped.append(f"{k} (cần {v:.2f}: thiếu {20 * __import__('math').log10(v / VMAX):.1f} dB)")
    vol[k] = round(min(VMAX, max(0.05, v)), 3)
write(vol)
print(len(S), 'tiếng,', len(BY), 'chiêu →', OUT.name)
if capped:
    print('Bị chặn ở đỉnh', VMAX, '(còn nhiều trầm quá, nên sửa công thức):', ', '.join(capped))
