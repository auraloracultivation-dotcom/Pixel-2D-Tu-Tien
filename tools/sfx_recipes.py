"""Công thức tiếng hiệu ứng (chủ dự án 06/11/2026 19:15: làm lại bộ âm thanh bằng code, cổ phong Á Đông pha 16-bit).
Ghi vào data/sounds.json → sfx, by_fx, warm, music.drums/combat (giữ nguyên volume, music). Chạy: python3 -I tools/sfx_recipes.py
Lớp (src/core/synth.js): k osc|noise|pluck|fm; w sine|tri|saw|square|pulse; f, f2 (Hz đầu, cuối), g (giây quét cao độ);
t (bắt đầu), d (dài), a (lên), h (giữ), c (độ cong tắt); v (âm lượng lớp); lp/lp2, hp/hp2, bp/bp2 (lọc quét), lq/hq/bq;
vib, vd (rung cao độ); am, amd (rung âm lượng); dist (méo); i, i2, r (FM: chỉ số đầu, cuối, tỉ lệ); damp, br (dây gảy);
crackle (hạt lách tách), smooth. Mỗi tiếng: v (đỉnh sau chuẩn hoá), jit (lệch cao độ ngẫu nhiên, cung), gap (giây tối thiểu
giữa hai lần), rev (gửi vào vang), pan (lệch trái phải ngẫu nhiên), gain."""
import json
from pathlib import Path

P = Path(__file__).resolve().parents[1] / 'data' / 'sounds.json'
PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0]   # ngũ cung Đô


def bell(f, t=0, d=0.8, v=0.6, r=3.5, i=1.6):
    return {'k': 'fm', 'f': f, 'r': r, 'i': i, 't': t, 'd': d, 'v': v, 'a': 0.002}


def pl(f, t=0, d=1.0, v=0.7, damp=0.35, br=0.75):
    return {'k': 'pluck', 'f': f, 't': t, 'd': d, 'v': v, 'damp': damp, 'br': br}


S = {}
# ---- giao diện: gõ gỗ, ngọc; nhỏ, ngắn, không mỏi tai
S['click'] = {'v': 0.26, 'jit': 1, 'gap': 0.03, 'pan': 0, 'L': [{'k': 'fm', 'f': 1175, 'r': 2.4, 'i': 1.2, 'd': 0.07, 'v': 0.8, 'c': 3}, {'k': 'noise', 'bp': 3200, 'bq': 3, 'd': 0.02, 'v': 0.4}]}
S['talk'] = {'v': 0.14, 'jit': 2, 'gap': 0.05, 'pan': 0, 'L': [{'k': 'osc', 'w': 'pulse', 'f': 620, 'd': 0.045, 'v': 0.6, 'lp': 2200, 'c': 2}]}
S['chime'] = {'v': 0.34, 'rev': 0.4, 'L': [bell(1318.5, d=1.1, v=0.8), bell(1975.5, t=0.06, d=0.8, v=0.4)]}
# ---- nhặt đồ, thưởng
S['pickup'] = {'v': 0.28, 'jit': 1, 'gap': 0.05, 'rev': 0.18, 'L': [bell(1568, d=0.25, v=0.7, r=2, i=1.2), bell(2093, t=0.06, d=0.32, v=0.6, r=2, i=1.2)]}
S['rare'] = {'v': 0.45, 'rev': 0.45, 'L': [bell(f, t=k * 0.07, d=0.7, v=0.6) for k, f in enumerate([1174.66, 1396.9, 1760, 2349.3])] + [{'k': 'noise', 'hp': 6000, 'a': 0.1, 'd': 0.6, 'v': 0.15}]}
S['levelup'] = {'v': 0.5, 'rev': 0.35, 'L': [pl(f, t=k * 0.07, d=1.1, v=0.8) for k, f in enumerate([523.25, 659.25, 783.99, 1046.5])] + [bell(2093, t=0.28, d=0.9, v=0.35)]}
S['layer_up'] = {'v': 0.6, 'rev': 0.5, 'L': [pl(f, t=k * 0.035, d=1.2, v=0.7) for k, f in enumerate([392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1567.98])] + [bell(1568, t=0.38, d=1.2, v=0.45), {'k': 'fm', 'f': 110, 'r': 1.41, 'i': 4, 'd': 2.2, 'v': 0.6, 'c': 1.6}]}
S['breakthrough'] = {'v': 0.85, 'rev': 0.6, 'L': [
    {'k': 'fm', 'f': 82, 'r': 1.48, 'i': 6, 'i2': 0.5, 'd': 3.6, 'a': 0.005, 'c': 1.5, 'v': 1},
    {'k': 'fm', 'f': 164, 'r': 2.76, 'i': 3, 'd': 2.6, 'v': 0.45},
    {'k': 'noise', 'hp': 3000, 'hp2': 9000, 'a': 0.8, 'd': 2.2, 'v': 0.2},
    {'k': 'osc', 'w': 'saw', 'f': 329.6, 'lp': 1400, 'a': 0.8, 'd': 3.2, 'v': 0.16, 'vib': 5, 'vd': 0.006, 'c': 1.4},
    {'k': 'osc', 'w': 'saw', 'f': 493.9, 'lp': 1400, 'a': 0.9, 'd': 3.2, 'v': 0.13, 'vib': 5.4, 'vd': 0.006, 'c': 1.4},
    {'k': 'osc', 'w': 'saw', 'f': 659.3, 'lp': 1600, 'a': 1.0, 'd': 3.2, 'v': 0.1, 'vib': 4.7, 'vd': 0.006, 'c': 1.4}]}
S['achieve'] = {'v': 0.45, 'rev': 0.35, 'L': [{'k': 'osc', 'w': 'pulse', 'f': f, 't': t, 'd': d, 'v': 0.5, 'lp': 3000, 'c': 1.8} for f, t, d in [(784, 0, 0.12), (988, 0.1, 0.12), (1175, 0.2, 0.12), (1568, 0.3, 0.6)]] + [bell(3136, t=0.3, d=0.8, v=0.3)]}
# ---- đánh, trúng
S['swing'] = {'v': 0.3, 'jit': 2, 'gap': 0.03, 'rev': 0.05, 'L': [{'k': 'noise', 'bp': 1200, 'bp2': 3600, 'bq': 1.5, 'a': 0.02, 'd': 0.15, 'v': 1, 'c': 2}, {'k': 'noise', 'hp': 5000, 'd': 0.06, 'v': 0.25}]}
S['hit'] = {'v': 0.4, 'jit': 1.5, 'gap': 0.03, 'L': [{'k': 'osc', 'f': 160, 'f2': 60, 'd': 0.09, 'v': 1, 'c': 2}, {'k': 'noise', 'lp': 2200, 'lp2': 600, 'd': 0.07, 'v': 0.7}, {'k': 'noise', 'hp': 3000, 'd': 0.015, 'v': 0.4}]}
S['crit'] = {'v': 0.55, 'jit': 0.8, 'gap': 0.04, 'rev': 0.2, 'L': [{'k': 'fm', 'f': 1760, 'r': 3.01, 'i': 3, 'd': 0.38, 'v': 0.6}, {'k': 'osc', 'f': 120, 'f2': 45, 'd': 0.16, 'v': 1}, {'k': 'noise', 'bp': 4000, 'd': 0.05, 'v': 0.5}]}
S['hurt'] = {'v': 0.42, 'gap': 0.1, 'L': [{'k': 'osc', 'f': 200, 'f2': 80, 'd': 0.15, 'v': 1}, {'k': 'noise', 'lp': 900, 'd': 0.12, 'v': 0.5}, {'k': 'osc', 'w': 'saw', 'f': 140, 'f2': 100, 'lp': 600, 'd': 0.14, 'v': 0.2}]}
S['die'] = {'v': 0.32, 'jit': 2, 'gap': 0.06, 'rev': 0.15, 'L': [{'k': 'noise', 'bp': 900, 'bp2': 300, 'a': 0.01, 'd': 0.3, 'v': 0.8}, {'k': 'osc', 'w': 'tri', 'f': 600, 'f2': 150, 'd': 0.25, 'v': 0.3}]}
S['dash'] = {'v': 0.36, 'jit': 1, 'L': [{'k': 'noise', 'bp': 600, 'bp2': 3000, 'bq': 1.2, 'a': 0.03, 'd': 0.22, 'v': 1}, {'k': 'osc', 'f': 300, 'f2': 900, 'd': 0.15, 'v': 0.15}]}
S['shoot'] = {'v': 0.3, 'jit': 1.5, 'gap': 0.05, 'L': [{'k': 'osc', 'w': 'tri', 'f': 900, 'f2': 1500, 'd': 0.12, 'v': 0.5}, {'k': 'noise', 'bp': 2500, 'bp2': 4500, 'd': 0.12, 'v': 0.5}]}
S['boom'] = {'v': 0.55, 'jit': 1, 'gap': 0.06, 'rev': 0.25, 'L': [{'k': 'noise', 'lp': 1400, 'lp2': 250, 'a': 0.005, 'd': 0.45, 'v': 1, 'c': 1.8}, {'k': 'osc', 'f': 110, 'f2': 40, 'd': 0.4, 'v': 0.8}]}
# ---- chiêu theo hệ: phát (cast) và trúng (hit)
S['fire_cast'] = {'v': 0.45, 'jit': 1.5, 'rev': 0.2, 'L': [{'k': 'noise', 'bp': 500, 'bp2': 1500, 'a': 0.05, 'd': 0.42, 'v': 1, 'crackle': 0.02}, {'k': 'noise', 'hp': 3000, 'crackle': 0.05, 'd': 0.35, 'v': 0.35}, {'k': 'osc', 'f': 140, 'f2': 90, 'd': 0.3, 'v': 0.3}]}
S['fire_hit'] = {'v': 0.52, 'jit': 1.5, 'gap': 0.06, 'rev': 0.25, 'L': [{'k': 'noise', 'lp': 1800, 'lp2': 300, 'a': 0.005, 'd': 0.5, 'c': 1.8, 'v': 1}, {'k': 'noise', 'hp': 2500, 'crackle': 0.06, 'd': 0.45, 'v': 0.4}, {'k': 'osc', 'f': 110, 'f2': 40, 'd': 0.35, 'v': 0.8}]}
S['ice_cast'] = {'v': 0.4, 'jit': 1, 'rev': 0.4, 'L': [bell(2637, d=0.5, v=0.5, r=3.5, i=2), bell(3520, t=0.05, d=0.4, v=0.3), {'k': 'noise', 'hp': 6000, 'a': 0.05, 'd': 0.3, 'v': 0.3}, {'k': 'osc', 'f': 900, 'f2': 1800, 'd': 0.2, 'v': 0.2}]}
S['ice_hit'] = {'v': 0.45, 'jit': 2, 'gap': 0.05, 'rev': 0.25, 'L': [{'k': 'noise', 'hp': 3000, 'd': 0.25, 'c': 3, 'crackle': 0.2, 'v': 1}, bell(3136, d=0.3, v=0.5, r=2.3, i=4), bell(4186, t=0.03, d=0.25, v=0.4, r=2.3, i=3)]}
S['bolt'] = {'v': 0.62, 'rev': 0.35, 'L': [{'k': 'noise', 'hp': 2000, 'd': 0.06, 'v': 1}, {'k': 'noise', 'bp': 1500, 'bp2': 400, 'd': 0.5, 'crackle': 0.15, 'v': 0.7}, {'k': 'osc', 'f': 70, 'f2': 40, 'd': 0.6, 'v': 0.7}, {'k': 'osc', 'w': 'square', 'f': 120, 'am': 40, 'd': 0.2, 'lp': 1500, 'v': 0.2}]}
S['wood_cast'] = {'v': 0.4, 'jit': 1.5, 'rev': 0.25, 'L': [{'k': 'noise', 'bp': 2500, 'bq': 1, 'a': 0.08, 'd': 0.45, 'crackle': 0.1, 'am': 12, 'amd': 0.5, 'v': 0.8}, {'k': 'fm', 'f': 600, 'r': 1.5, 'i': 1, 'd': 0.12, 'v': 0.5}, pl(220, d=0.5, v=0.35, damp=0.6)]}
S['wood_hit'] = {'v': 0.38, 'jit': 2, 'gap': 0.05, 'L': [{'k': 'fm', 'f': 520, 'r': 1.5, 'i': 1.4, 'd': 0.15, 'v': 0.9}, {'k': 'noise', 'bp': 3000, 'd': 0.25, 'crackle': 0.15, 'v': 0.5}]}
S['earth_cast'] = {'v': 0.55, 'jit': 1, 'rev': 0.2, 'L': [{'k': 'noise', 'lp': 300, 'a': 0.1, 'd': 0.6, 'v': 1}, {'k': 'osc', 'f': 60, 'f2': 45, 'a': 0.05, 'd': 0.6, 'v': 0.9}, {'k': 'noise', 'bp': 900, 'crackle': 0.05, 'd': 0.5, 'v': 0.3}]}
S['earth_hit'] = {'v': 0.58, 'jit': 1.5, 'gap': 0.06, 'rev': 0.2, 'L': [{'k': 'osc', 'f': 120, 'f2': 40, 'd': 0.35, 'v': 1}, {'k': 'noise', 'lp': 1500, 'lp2': 300, 'd': 0.45, 'crackle': 0.1, 'v': 0.8}, {'k': 'noise', 'bp': 2500, 'crackle': 0.3, 'd': 0.3, 'v': 0.4}]}
S['metal_cast'] = {'v': 0.45, 'jit': 1, 'rev': 0.35, 'L': [{'k': 'fm', 'f': 1318.5, 'r': 2.76, 'i': 3, 'i2': 0.3, 'd': 0.9, 'v': 0.7}, {'k': 'noise', 'bp': 4000, 'd': 0.15, 'v': 0.3}, {'k': 'osc', 'f': 2637, 'd': 0.5, 'v': 0.2}]}
S['metal_hit'] = {'v': 0.48, 'jit': 1.5, 'gap': 0.04, 'rev': 0.2, 'L': [{'k': 'fm', 'f': 987.8, 'r': 3.17, 'i': 5, 'd': 0.45, 'v': 0.9}, {'k': 'noise', 'hp': 3500, 'd': 0.05, 'v': 0.5}, {'k': 'osc', 'f': 140, 'f2': 60, 'd': 0.1, 'v': 0.5}]}
S['water_cast'] = {'v': 0.4, 'jit': 1.5, 'rev': 0.3, 'L': [{'k': 'noise', 'bp': 400, 'bp2': 1200, 'a': 0.05, 'd': 0.4, 'v': 0.8}] + [{'k': 'osc', 'f': f, 'f2': f * 2.1, 't': k * 0.07, 'd': 0.08, 'v': 0.3} for k, f in enumerate([400, 520, 640])] + [{'k': 'osc', 'f': 120, 'd': 0.3, 'v': 0.3}]}
S['water_hit'] = {'v': 0.45, 'jit': 2, 'gap': 0.05, 'L': [{'k': 'noise', 'bp': 1500, 'bp2': 500, 'a': 0.005, 'd': 0.3, 'v': 1}, {'k': 'osc', 'f': 300, 'f2': 900, 'd': 0.06, 'v': 0.4}, {'k': 'osc', 'f': 600, 'f2': 1300, 't': 0.05, 'd': 0.06, 'v': 0.3}]}
S['wind_cast'] = {'v': 0.5, 'jit': 1, 'rev': 0.3, 'L': [{'k': 'noise', 'bp': 300, 'bp2': 1400, 'bq': 1, 'a': 0.2, 'd': 0.85, 'am': 4, 'amd': 0.3, 'v': 1}, {'k': 'noise', 'hp': 4000, 'a': 0.2, 'd': 0.6, 'v': 0.2}]}
S['qin'] = {'v': 0.5, 'jit': 0.5, 'rev': 0.45, 'L': [pl(196, d=1.3, v=1, damp=0.3, br=0.9), pl(293.66, t=0.03, d=1.1, v=0.6, damp=0.3, br=0.9), {'k': 'osc', 'f': 98, 'd': 0.8, 'v': 0.3}]}
S['qin_hit'] = {'v': 0.28, 'jit': 2, 'gap': 0.05, 'rev': 0.2, 'L': [pl(587.33, d=0.45, v=1, br=0.9)]}
S['liem_cast'] = {'v': 0.42, 'jit': 1.5, 'rev': 0.25, 'L': [{'k': 'noise', 'bp': 700, 'bp2': 2500, 'bq': 2, 'a': 0.02, 'd': 0.3, 'v': 1}, {'k': 'osc', 'w': 'saw', 'f': 220, 'f2': 440, 'lp': 1200, 'am': 30, 'd': 0.25, 'v': 0.3}]}
S['arrow'] = {'v': 0.4, 'jit': 1.5, 'gap': 0.05, 'L': [pl(147, d=0.35, v=1, damp=0.5, br=0.9), {'k': 'noise', 'bp': 2500, 'bp2': 4500, 't': 0.03, 'a': 0.02, 'd': 0.2, 'v': 0.6}]}
S['arrow_hit'] = {'v': 0.33, 'jit': 2, 'gap': 0.04, 'L': [{'k': 'osc', 'f': 300, 'f2': 120, 'd': 0.06, 'v': 1}, {'k': 'noise', 'bp': 2000, 'd': 0.04, 'v': 0.6}]}
S['heal'] = {'v': 0.45, 'rev': 0.5, 'L': [bell(f, t=t, d=0.8, v=0.6, i=1.5) for f, t in [(1046.5, 0), (1318.5, 0.08), (1568, 0.16), (2093, 0.26)]] + [{'k': 'osc', 'f': 523.25, 'a': 0.2, 'd': 1.0, 'v': 0.2}]}
S['shield'] = {'v': 0.42, 'rev': 0.45, 'L': [{'k': 'osc', 'f': 523.25, 'a': 0.15, 'd': 0.9, 'am': 8, 'amd': 0.3, 'v': 0.5}, {'k': 'fm', 'f': 1568, 'r': 2, 'i': 1, 'a': 0.1, 'd': 0.9, 'v': 0.4}, {'k': 'noise', 'hp': 5000, 'a': 0.2, 'd': 0.6, 'v': 0.1}]}
S['stone_shield'] = {'v': 0.5, 'rev': 0.3, 'L': [{'k': 'noise', 'lp': 900, 'd': 0.3, 'crackle': 0.1, 'v': 0.8}, {'k': 'osc', 'f': 90, 'f2': 60, 'd': 0.3, 'v': 0.8}, {'k': 'fm', 'f': 523.25, 'r': 1.4, 'i': 2, 't': 0.1, 'd': 0.6, 'v': 0.4}]}
S['buff'] = {'v': 0.55, 'rev': 0.45, 'L': [{'k': 'osc', 'w': 'saw', 'f': 220, 'f2': 440, 'lp': 600, 'lp2': 2400, 'a': 0.3, 'd': 0.8, 'v': 0.4}, {'k': 'fm', 'f': 220, 'r': 1.41, 'i': 3, 't': 0.3, 'd': 1.5, 'v': 0.7}, {'k': 'noise', 'hp': 3000, 'hp2': 8000, 'a': 0.3, 'd': 0.8, 'v': 0.2}]}
# ---- thế giới
S['door'] = {'v': 0.4, 'rev': 0.2, 'L': [{'k': 'osc', 'w': 'saw', 'f': 180, 'f2': 140, 'lp': 900, 'vib': 7, 'vd': 0.03, 'd': 0.3, 'v': 0.3}, {'k': 'osc', 'f': 90, 'f2': 60, 't': 0.25, 'd': 0.2, 'v': 0.6}]}
S['portal'] = {'v': 0.45, 'rev': 0.5, 'L': [{'k': 'noise', 'bp': 300, 'bp2': 3000, 'bq': 3, 'a': 0.3, 'd': 1.0, 'am': 6, 'amd': 0.4, 'v': 1}, {'k': 'osc', 'f': 220, 'f2': 880, 'd': 1.0, 'v': 0.2}, bell(1760, t=0.7, d=0.8, v=0.3)]}
S['fly'] = {'v': 0.4, 'rev': 0.3, 'L': [{'k': 'noise', 'bp': 400, 'bp2': 1600, 'bq': 1, 'a': 0.4, 'd': 1.4, 'v': 1}, bell(1318.5, t=0.15, d=0.9, v=0.25)]}
S['pluck'] = {'v': 0.35, 'jit': 0.5, 'rev': 0.4, 'L': [pl(392, d=1.5, v=1)]}
S['warn'] = {'v': 0.52, 'rev': 0.2, 'L': [{'k': 'osc', 'f': 120, 'f2': 55, 't': t, 'd': 0.25, 'v': 1} for t in (0, 0.3)] + [{'k': 'noise', 'lp': 300, 't': t, 'd': 0.1, 'v': 0.6} for t in (0, 0.3)]}
S['roar'] = {'v': 0.8, 'rev': 0.35, 'L': [{'k': 'osc', 'w': 'saw', 'f': 70, 'f2': 55, 'lp': 500, 'dist': 3, 'am': 23, 'amd': 0.5, 'a': 0.1, 'd': 1.4, 'v': 1}, {'k': 'noise', 'lp': 700, 'a': 0.2, 'd': 1.2, 'v': 0.6}, {'k': 'osc', 'f': 45, 'd': 1.4, 'v': 0.6}]}
S['thunder'] = {'v': 0.88, 'rev': 0.4, 'L': [{'k': 'noise', 'hp': 1500, 'd': 0.08, 'v': 1}, {'k': 'noise', 'lp': 900, 'lp2': 200, 'a': 0.02, 'd': 2.4, 'c': 1.3, 'crackle': 0.08, 'v': 0.9}, {'k': 'osc', 'f': 50, 'f2': 35, 'd': 2.0, 'v': 0.6}]}
S['meteor'] = {'v': 0.7, 'rev': 0.3, 'L': [{'k': 'osc', 'f': 1800, 'f2': 300, 'd': 0.6, 'v': 0.3}, {'k': 'noise', 'lp': 600, 't': 0.55, 'd': 0.8, 'v': 1}, {'k': 'osc', 'f': 90, 'f2': 35, 't': 0.55, 'd': 0.7, 'v': 0.8}]}
S['brew'] = {'v': 0.4, 'rev': 0.25, 'L': [{'k': 'osc', 'f': f, 'f2': f * 1.8, 't': t, 'd': 0.07, 'v': 0.4} for f, t in [(300, 0), (420, 0.09), (360, 0.2), (480, 0.31)]] + [{'k': 'noise', 'bp': 1200, 'crackle': 0.05, 'd': 0.6, 'v': 0.3}, bell(1568, t=0.4, d=0.8, v=0.4)]}
S['anvil'] = {'v': 0.5, 'jit': 1, 'rev': 0.3, 'L': [{'k': 'fm', 'f': 1046.5, 'r': 3.5, 'i': 6, 'd': 0.7, 'v': 0.9}, {'k': 'noise', 'hp': 3000, 'd': 0.04, 'v': 0.6}, {'k': 'osc', 'f': 160, 'f2': 70, 'd': 0.12, 'v': 0.6}]}

BY_FX = {'fire': ['fire_cast', 'fire_hit'], 'ice': ['ice_cast', 'ice_hit'], 'bolt': ['bolt', None], 'vine': ['wood_cast', 'wood_hit'],
         'rock': ['earth_cast', 'earth_hit'], 'slash': ['metal_cast', 'metal_hit'], 'wind': ['wind_cast', 'wood_hit'], 'sound': ['qin', 'qin_hit'],
         'liem': ['liem_cast', 'metal_hit'], 'arrow': ['arrow', 'arrow_hit'], 'heal': ['heal', None], 'shield': ['shield', None],
         'shield-earth': ['stone_shield', None], 'buff': ['buff', None]}

d = json.loads(P.read_text(encoding='utf-8'))
d['_note'] = ("Âm thanh tổng hợp bằng code, không cần file (chủ dự án 06/11/2026 19:15: làm lại, cổ phong Á Đông pha 16-bit). sfx: công thức "
              "từng tiếng, dựng bằng src/core/synth.js (viết ở tools/sfx_recipes.py, chạy lại thì ghi đè sfx, by_fx, warm, music.drums). by_fx: chiêu theo fx "
              "(data/skills.json) → [tiếng phát, tiếng trúng]. warm: tiếng dựng sẵn khi bật âm thanh. Bấm nút giao diện: sfx.click (src/ui/click-sound.js). music: nhạc nền (src/core/music.js).")
d['sfx'] = S; d['by_fx'] = BY_FX; d['warm'] = ['click', 'swing', 'hit', 'crit', 'pickup', 'die', 'hurt']
d.pop('ui', None)
P.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(S), 'tiếng')

# ---- nhạc nền: trống lớp đánh nhau, nhị hồ, dây trầm (src/core/music.js)
m = d['music']
m['drums'] = {'taiko': {'v': 0.8, 'L': [{'k': 'osc', 'f': 95, 'f2': 48, 'g': 0.25, 'd': 0.5, 'c': 2.2, 'v': 1}, {'k': 'noise', 'lp': 600, 'd': 0.12, 'v': 0.5}]},
              'tick': {'v': 0.5, 'L': [{'k': 'fm', 'f': 900, 'r': 1.5, 'i': 2, 'd': 0.08, 'v': 1, 'c': 3}, {'k': 'noise', 'bp': 2500, 'd': 0.03, 'v': 0.5}]},
              'gong': {'v': 0.8, 'L': [{'k': 'fm', 'f': 110, 'r': 1.41, 'i': 4, 'i2': 0.4, 'd': 3, 'c': 1.4, 'v': 1}, {'k': 'fm', 'f': 220, 'r': 2.76, 'i': 2, 'd': 2, 'v': 0.4}]}}
m['combat'] = {'vol': 0.35, 'up': 0.5, 'down': 0.12, 'boss': 0.75}
m['bass'] = 0.12; m['erhu'] = 0.045; m['erhu_p'] = 0.4
m['maps']['boss']['boss'] = True
m['_note'] = m['_note'].split(' Đàn tranh dây gảy')[0] + (' Đàn tranh dây gảy (Karplus-Strong), nhị hồ ở đảo mood toi (erhu: âm lượng, erhu_p: tỉ lệ câu), bass: dây trầm.'
             ' drums: công thức trống (taiko, tick, gong) như sfx; combat: lớp trống khi đánh nhau (vol, up/down: tốc độ vào ra, boss: mức tối thiểu ở map trùm).')
P.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
