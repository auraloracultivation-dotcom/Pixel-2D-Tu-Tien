"""Tinh Vực mới (chủ dự án 19/11/2026 01:30 gửi bảng 3 ảnh GPT: Thiên Kiếm Tinh, Linh Nhật, Hắc Phong Tinh).
Cắt bảng thành từng thiên thể (chia đều theo cột), rồi đưa về điểm ảnh thật bằng ai_import (bỏ nền, thu cỡ, gom màu, viền mực).
Cùng một chiều cao cho cả bảng để tinh cầu to nhỏ đúng như tranh mẫu. Ảnh ra ở tools/art/nguon/ai/tinh-vuc/gpt/.
Chạy: python3 -I tools/art/tinh_vuc.py [--h 144] [--colors 32]
"""
import argparse, os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_import import convert

GOC = os.path.join(os.path.dirname(__file__), 'nguon/ai/tinh-vuc')
TEN = ['thien-kiem-tinh', 'linh-nhat', 'hac-phong']

def main():
    p = argparse.ArgumentParser(); p.add_argument('--h', type=int, default=144); p.add_argument('--colors', type=int, default=32)
    a = p.parse_args()
    im = Image.open(f'{GOC}/goc/bang-3.png').convert('RGBA')
    w = im.width // 3
    for i, ten in enumerate(TEN):
        tam = f'{GOC}/goc/{ten}.png'
        im.crop((i * w, 0, (i + 1) * w, im.height)).save(tam)
        convert(tam, f'{GOC}/gpt/{ten}.png', a.h, colors=a.colors, tol=40, line=True, zoom=3)
        print(ten, Image.open(f'{GOC}/gpt/{ten}.png').size)

if __name__ == '__main__':
    main()
