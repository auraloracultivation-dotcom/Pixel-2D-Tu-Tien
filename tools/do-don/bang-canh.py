# Bảng khung hình từ quay-canh.mjs: python3 -I tools/do-don/bang-canh.py <thư mục khung> <ra.png> <khung đầu> <số khung> [cột=6] [phóng=1] [bước=1] [cắt x,y,w,h]
import sys, os
from PIL import Image, ImageDraw
d, out, f0, n = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 6
k = int(sys.argv[6]) if len(sys.argv) > 6 else 1
step = int(sys.argv[7]) if len(sys.argv) > 7 else 1
crop = tuple(map(int, sys.argv[8].split(','))) if len(sys.argv) > 8 else None
ims = []
for i in range(n):
    f = f0 + i * step
    path = f'{d}/f-{f:04d}.png'
    im = Image.open(path if os.path.exists(path) else path[:-3] + 'jpg').convert('RGB')   # quay-canh.mjs ghi png, quay-man.mjs ghi jpg
    if crop: im = im.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3]))
    if k != 1: im = im.resize((im.width * k, im.height * k), Image.NEAREST)
    ImageDraw.Draw(im).text((4, 3), f'{f}', fill=(255, 255, 0))
    ims.append(im)
w, hh = ims[0].size
rows = (len(ims) + cols - 1) // cols
sh = Image.new('RGB', (cols * w + (cols - 1) * 2, rows * hh + (rows - 1) * 2), (40, 40, 40))
for i, im in enumerate(ims): sh.paste(im, ((i % cols) * (w + 2), (i // cols) * (hh + 2)))
sh.save(out); print(sh.size)
