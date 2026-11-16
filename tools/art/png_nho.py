"""Ghi PNG nhỏ nhất mà không đổi điểm ảnh nào (17/11/2026, chủ dự án 03:51 "nén những file có thể nén để tối ưu load game").
Hình ≤ 256 màu (gần hết sprite điểm ảnh) ghi dạng bảng màu có độ trong từng màu: nhẹ ~3 lần so với RGBA; còn lại RGBA nén mức cao nhất.
Nhân vật chính vẫn nét y nguyên (không gom màu, không đổi cỡ). Dùng: from png_nho import luu; luu(im, đường_dẫn).
Nén lại cả kho: python3 tools/art/png_nho.py (chỉ thay tệp khi nhỏ hơn và giống từng điểm ảnh)."""
import io, os, subprocess, sys
from PIL import Image


def nho(im):
    rgba = im.convert('RGBA')
    cands = []
    b = io.BytesIO(); rgba.save(b, 'PNG', optimize=True, compress_level=9); cands.append(b.getvalue())
    if rgba.getextrema()[3] == (255, 255):
        b = io.BytesIO(); rgba.convert('RGB').save(b, 'PNG', optimize=True); cands.append(b.getvalue())
    cols = rgba.getcolors(256)
    if cols:
        pal = [c for _, c in cols]; idx = {c: i for i, c in enumerate(pal)}
        p = Image.new('P', rgba.size); p.putdata([idx[c] for c in rgba.get_flattened_data()] if hasattr(rgba, 'get_flattened_data') else [idx[c] for c in rgba.getdata()])
        p.putpalette([v for c in pal for v in c[:3]])
        b = io.BytesIO(); p.save(b, 'PNG', optimize=True, transparency=bytes(c[3] for c in pal)); cands.append(b.getvalue())
    return rgba, min(cands, key=len)


def giong(a, out):
    b = Image.open(io.BytesIO(out)).convert('RGBA')
    return a.size == b.size and all(x == y or (x[3] == 0 and y[3] == 0) for x, y in zip(a.getdata(), b.getdata()))


def luu(im, path):
    _, out = nho(im)
    with open(path, 'wb') as f:
        f.write(out)


def nen_tep(path):
    s0 = os.path.getsize(path)
    rgba, out = nho(Image.open(path))
    if len(out) < s0 * 0.97 and giong(rgba, out):
        with open(path, 'wb') as f:
            f.write(out)
        return s0, len(out)
    return s0, s0


if __name__ == '__main__':
    from multiprocessing import Pool
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    files = [os.path.join(root, p) for p in subprocess.run(['git', 'ls-files', 'assets/*.png'], cwd=root, capture_output=True, text=True).stdout.split()]
    with Pool() as pool:
        r = pool.map(nen_tep, files, chunksize=8)
    print(f'{len(files)} tệp: {sum(a for a, _ in r) / 1048576:.1f} MB → {sum(b for _, b in r) / 1048576:.1f} MB')
