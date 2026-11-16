"""Bộ khung giao diện tím viền bạc, đá vàng góc (chủ dự án 17/11/2026 02:03 gửi ảnh mẫu khung mong muốn, 02:05 "tôi cần kết quả":
em tự chọn cách làm). Ảnh mẫu của chủ dự án đưa lên SpriteCook làm bản mẫu bộ giao diện (UI kit d4ad18be…), SpriteCook vẽ một
tấm các khung rỗng trên nền trong suốt (sheet-1.png, 22 credit). Công cụ này cắt từng khung ra, đưa về điểm ảnh thật (trung bình
ô K×K vì tranh mịn, rồi gom màu và viền mực bằng ai_import), đo bề dày viền (kể cả đá góc) để cắt 9 mảnh trong CSS, và ghi:
  assets/art/ui-kt-<tên>.png, ui-kt-<tên>-vien.png (chỉ còn viền, đè lên ảnh)   (hình 1 điểm ảnh = 1 điểm CSS; src/ui/hud-khung.css dùng border-image với số cắt in ra dưới đây)
  tools/art/nguon/ai/khung-ui/khung.json   (cỡ, số cắt 9 mảnh từng khung)
Khung bảng lớn bỏ vương miện giữa mép trên (vá bằng cột viền sạch) để co giãn được; vương miện là hình riêng đặt đè giữa bảng trên.
Chạy: python3 -I tools/art/khung_ui.py"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(R, 'tools', 'art'))
from ai_import import quantize, outline   # noqa: E402

SRC = os.path.join(R, 'tools/art/nguon/ai/khung-ui/sheet-1.png')
K = 5   # điểm tấm SpriteCook mỗi điểm ảnh game
# tên theo vị trí trên tấm (góc trái trên của khung, điểm tấm 2048): xếp theo hàng rồi cột
NAMES = [('bang', 43, 82), ('mat', 57, 629), ('ban-do', 488, 629), ('the', 915, 718), ('phim', 1448, 732), ('o', 1741, 732),
         ('danh', 61, 1071), ('thanh', 1016, 1094), ('nut', 647, 1185), ('vuong-mien', 792, 1637), ('da', 393, 1696)]
TH = {'danh': 72, 'nut': 44, 'vuong-mien': 22, 'da': 14}   # món vẽ đúng cỡ trên màn (không cắt 9 mảnh): cao đích, điểm ảnh game
RIM = {'mat', 'ban-do', 'o'}   # có thêm bản chỉ còn viền
FRAMES = {'bang', 'mat', 'ban-do', 'the', 'phim', 'o', 'danh', 'nut', 'thanh'}   # khung có lòng: đo số cắt 9 mảnh


def pieces(a):
    lab, _ = ndimage.label(ndimage.binary_closing(a[:, :, 3] >= 128, iterations=2))
    out = {}
    for s in ndimage.find_objects(lab):
        if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) < 2000:
            continue
        for name, x, y in NAMES:
            if abs(s[1].start - x) < 12 and abs(s[0].start - y) < 12:
                out[name] = a[s]
    missing = [n for n, *_ in NAMES if n not in out]
    if missing:
        raise SystemExit('không thấy khung: ' + ', '.join(missing))
    return out


def box(a, th):
    """Thu nhỏ trung bình ô (tranh SpriteCook mịn, không phải điểm ảnh thật: lấy màu đa số từng ô thì lấm tấm), rồi alpha về 0 / 255."""
    h, w = a.shape[:2]
    tw = max(1, round(w * th / h))
    pre = a.astype(np.float32); pre[:, :, :3] *= pre[:, :, 3:4] / 255   # trộn theo alpha cho mép khỏi lem màu nền
    im = Image.fromarray(np.clip(pre, 0, 255).astype(np.uint8), 'RGBA').resize((tw, th), Image.BOX)
    b = np.array(im).astype(np.float32)
    al = b[:, :, 3:4]; b[:, :, :3] = np.where(al > 0, b[:, :, :3] * 255 / np.maximum(al, 1), 0)
    b[:, :, 3] = np.where(b[:, :, 3] >= 140, 255, 0)
    return np.clip(b, 0, 255).astype(np.uint8)


def no_crest(a):
    """Khung bảng lớn: bỏ phần vương miện nhô lên và vá mép trên giữa bằng cột viền sạch ở 30% bề ngang."""
    h, w = a.shape[:2]
    ref = int(w * 0.3)
    top = int(np.argmax(a[:, ref, 3] >= 128))
    a = a[top:].copy()
    band = int(a.shape[0] * 0.3)
    a[:band, int(w * 0.36):int(w * 0.64)] = a[:band, ref:ref + 1]
    return a


def slices(p):
    """Bề dày viền 4 phía (điểm ảnh game), kể cả đá góc: quét từ mép vào tới khi gặp màu lòng khung (màu giữa khung)."""
    h, w = p.shape[:2]
    fill = p[h // 2, w // 2, :3].astype(int)
    isf = (p[:, :, 3] > 0) & (np.abs(p[:, :, :3].astype(int) - fill).sum(axis=2) < 60)

    def scan(line):   # vị trí điểm lòng đầu tiên (2 điểm liền) tính từ đầu dòng
        for i in range(len(line) - 1):
            if line[i] and line[i + 1]:
                return i
        return None

    def side(get, n, span):
        vals = [scan(get(i)) for i in span]
        vals = [v for v in vals if v is not None and v < n // 2]
        return max(vals) if vals else n // 4
    xs = range(int(w * 0.1), int(w * 0.3)) if w > 30 else range(w // 3, w // 2)
    ys = range(int(h * 0.1), int(h * 0.3)) if h > 30 else range(h // 3, h // 2)
    return {'top': side(lambda x: isf[:, x], h, xs), 'bottom': side(lambda x: isf[::-1, x], h, xs),
            'left': side(lambda y: isf[y, :], w, ys), 'right': side(lambda y: isf[y, ::-1], w, ys)}


def rim(p):
    """Bản chỉ còn viền (ui-kt-<tên>-vien.png): loang từ giữa khung qua các điểm gần màu lòng thành trong suốt, để đặt đè lên ảnh
    đại diện, bản đồ, hình pháp bảo mà không che."""
    h, w = p.shape[:2]
    fill = p[h // 2, w // 2, :3].astype(int)
    near = (p[:, :, 3] > 0) & (np.abs(p[:, :, :3].astype(int) - fill).sum(axis=2) < 70)
    lab, _ = ndimage.label(near)
    out = p.copy()
    out[lab == lab[h // 2, w // 2], 3] = 0
    return out


def main():
    a = np.array(Image.open(SRC).convert('RGBA'))
    a[a[:, :, 3] < 128, 3] = 0   # bỏ quầng mờ quanh hình (viền hồng lam do tách nền)
    info = {}
    for name, crop in pieces(a).items():
        if name == 'bang':
            crop = no_crest(crop)
        th = TH.get(name) or max(8, round(crop.shape[0] / K))
        p = outline(quantize(box(crop, th - 2), 64))
        Image.fromarray(p, 'RGBA').save(os.path.join(R, f'assets/art/ui-kt-{name}.png'), optimize=True)
        if name in RIM:
            Image.fromarray(rim(p), 'RGBA').save(os.path.join(R, f'assets/art/ui-kt-{name}-vien.png'), optimize=True)
        info[name] = {'w': p.shape[1], 'h': p.shape[0], **(slices(p) if name in FRAMES else {})}
        print(name, info[name])
    json.dump(info, open(os.path.join(R, 'tools/art/nguon/ai/khung-ui/khung.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
