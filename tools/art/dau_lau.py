"""Đầu lâu thay khiên khi đang hóa ma (chủ dự án 22/11/2026 02:21: "cái khiên sẽ đổi thành hình dạng đầu lâu"): ui.k-dau-lau.
Vẽ điểm ảnh bằng code (20 × 20, viền mực, xương ngà, hốc mắt đỏ rực, quầng ma khí đỏ sẫm), phóng ×5 cho cùng cỡ hai hình khiên ui.k-khien-*
(ảnh GPT của chủ dự án, cao 96). Chủ dự án gửi ảnh GPT đầu lâu thì thay bằng ảnh đó (qua ai_import.py), bỏ tệp này.
Gọi từ tools/art/build.py (trước write_manifest) hoặc chạy riêng: python3 -I tools/art/dau_lau.py (ghi luôn vào data/art.json)
"""
import hashlib, json, math, os, sys
from PIL import Image

R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(R, 'assets/art')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from png_nho import luu  # noqa: E402

N, K = 20, 5   # cỡ điểm ảnh, hệ số phóng
INK, BONE, SHADE, DEEP = (26, 11, 18, 255), (239, 230, 210, 255), (185, 169, 141, 255), (74, 52, 48, 255)
RED, CORE, AURA = (255, 51, 68, 255), (255, 214, 214, 255), (110, 10, 24, 150)


def ve():
    g = [[None] * N for _ in range(N)]
    trong = lambda x, y, cx, cy, rx, ry: ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1
    for y in range(N):
        for x in range(N):
            if trong(x, y, 10, 8.4, 7.6, 7.1) or (5 <= x <= 14 and 12 <= y <= 14) or (6 <= x <= 13 and 15 <= y <= 16):
                g[y][x] = BONE
    for y in range(N):   # bóng: nửa phải, phần dưới hộp sọ
        for x in range(N):
            if g[y][x] == BONE and (x >= 14 or (y >= 13 and x >= 12) or (y == 16)):
                g[y][x] = SHADE
    for cx in (6.9, 13.1):   # hốc mắt sâu, mắt đỏ rực
        for y in range(N):
            for x in range(N):
                if g[y][x] and trong(x, y, cx, 9.6, 2.5, 2.2):
                    g[y][x] = DEEP
        ex = int(cx)
        g[9][ex] = g[9][ex - 1 if cx < 10 else ex + 1] = RED
        g[10][ex] = RED; g[9][ex] = CORE
    for y, xs in ((12, (9, 10)), (13, (9, 10))):   # hốc mũi
        for x in xs:
            g[y][x] = DEEP if y == 12 else INK
    for x in range(7, 13, 2):   # răng
        g[15][x] = INK; g[16][x] = INK
    g[14] = [INK if (c and 6 <= i <= 13) else c for i, c in enumerate(g[14])]   # khe hàm
    for i in range(6, 14):
        if i % 2 == 1:
            g[14][i] = SHADE
    img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    da = {(x, y) for y in range(N) for x in range(N) if g[y][x]}
    vien = {(x + dx, y + dy) for x, y in da for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            if 0 <= x + dx < N and 0 <= y + dy < N and (x + dx, y + dy) not in da}
    quang = {(x + dx, y + dy) for x, y in vien for dx in (-1, 0, 1) for dy in (-1, 0, 1)
             if 0 <= x + dx < N and 0 <= y + dy < N and (x + dx, y + dy) not in da and (x + dx, y + dy) not in vien}
    for x, y in quang:
        img.putpixel((x, y), AURA)
    for x, y in vien:
        img.putpixel((x, y), INK)
    for x, y in da:
        img.putpixel((x, y), g[y][x])
    return img.resize((N * K, N * K), Image.NEAREST)


def build_into(sprites):
    im = ve()
    name = 'ui-k-dau-lau.png'
    luu(im, os.path.join(OUT, name))
    v = hashlib.sha1(open(os.path.join(OUT, name), 'rb').read()).hexdigest()[:8]
    sprites['ui.k-dau-lau'] = {'file': f'assets/art/{name}', 'v': v, 'w': im.width, 'h': im.height, 'frames': 1, 'anchor': [im.width // 2, im.height // 2],
                               'note': 'đầu lâu thay khiên khi đang hóa ma (vẽ bằng code tools/art/dau_lau.py, 22/11/2026)'}
    return 1


if __name__ == '__main__':
    p = os.path.join(R, 'data/art.json')
    data = json.load(open(p, encoding='utf-8'))
    moi = {}
    build_into(moi)
    cu = {k: v for k, v in data['sprites'].items() if k not in moi}   # chèn đúng chỗ theo thứ tự chữ, giữ nguyên thứ tự các hình khác (khỏi đổi cả tệp)
    vi = next((i for i, k in enumerate(cu) if k > 'ui.k-dau-lau'), len(cu))
    ds = list(cu.items())
    data['sprites'] = dict(ds[:vi] + list(moi.items()) + ds[vi:])
    open(p, 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    print('ui.k-dau-lau', data['sprites']['ui.k-dau-lau'])
