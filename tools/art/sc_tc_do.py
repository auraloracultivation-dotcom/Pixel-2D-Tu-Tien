"""Máy cắt tấm đồ vật SpriteCook (cây, bụi, đá, hoa) cho các tinh cầu khác Thiên Kiếm Tinh (chủ dự án 21/11/2026 02:3x "Làm toàn bộ
nha, nền và cây, hoa cỏ"; "cây trùng thì lấy cây đã thiết kế của Thiên Kiếm Tinh"). Nguồn: tools/art/nguon/ai/the-gioi/tc/<tinh cầu>-do.png
(tấm 2K, lưới ~400 điểm; Thanh Mộc và tấm hoa Làng Tinh Linh bộ dò lưới hỏng nên lấy ảnh thô 2048 qua sc_luoi.py, ra lưới 288 / 336).
Cắt bằng vùng liền của kênh trong suốt (nới vài điểm cho tán lá rời, tia lửa dính vào món), xếp theo hàng rồi trái sang phải, đặt tên theo
thứ tự trong câu lệnh đã gửi SpriteCook. Hàng dưới (5 đồ nhỏ) ghi ra tc/cat/<tc>-nho-<i>.png cho sc_tc.py ghép thành tấm in nền.
Mã hình tc.<tên>-sc, cỡ điểm 0,5 đơn vị như mọi hình SpriteCook (luật 1). Tên bắt đầu bằng khoá kiểu chân của data/le-hoi.json (cay-,
tung-, dao-, da-, tru-, pha-le-, kiem-, bui-) nên cây chắn gốc, đá chắn thân, bụi hoa không chắn; KINDS thêm khoá riêng khi cần.
Chạy: cd tools/art && python3 sc_tc_do.py"""
import hashlib
import json

import numpy as np
from PIL import Image
from scipy import ndimage

from png_nho import luu
from sc_tk import ART, OUT, ROOT, SCALE
from sc_tk2 import ghi_le_hoi

SRC = ROOT / 'tools/art/nguon/ai/the-gioi/tc'
NHO = '·'   # đồ nhỏ in nền
# tấm → (nới, diện tích nhỏ nhất, tên theo thứ tự đọc: hàng trên, hàng giữa, hàng dưới)
TAM = {
    'xd': (4, 40, ['cay-chay', 'cay-chay-la', 'cay-chay-mai', 'da-nui-lua', 'soi-nui-lua', 'bui-tro'] + [NHO] * 5),
    'hb': (4, 40, ['tung-tuyet', 'tung-tuyet-vua', 'tung-tuyet-non', 'cay-bang', 'bui-tuyet', 'da-tuyet'] + [NHO] * 5),
    'hp': (4, 40, ['cay-kho-gio', 'tru-da-den', 'tru-da-gay', 'bui-gai', 'da-den', 'bui-co-kho'] + [NHO] * 5),
    'tm': (3, 30, ['nam-lam-to', 'nam-tim-to', 'bui-duong-xi-lon', 'cay-rung', 'da-reu-xanh', 'nam-cum'] + [NHO] * 5),
    'tkim': (4, 40, ['cay-ho-duong', 'cay-ho-duong-nho', 'bui-sa-mac', 'da-quang-vang', 'soi-vang', 'kiem-co-cat'] + [NHO] * 5),
    'ht': (4, 40, ['tru-dat-cao', 'tru-dat', 'cay-thu', 'bui-thu', 'da-dat-set', 'bo-lua-chin'] + [NHO] * 5),
    'nv': (4, 40, ['cay-hu-khong', 'pha-le-cao', 'da-noi-hk', 'pha-le-cum', 'da-hac-dieu', 'bui-hoa-hk'] + [NHO] * 5),
    'ltl-hoa': (2, 40, ['bui-oai-huong', 'bui-mau-don-hong', 'bui-hue-trang', 'bui-tu-cau', 'bui-cuc-vang-lon', 'bui-tra-do'] + [NHO] * 5),
    'ltl-cay': (4, 150, ['tu-dang', 'cay-moc-lan', 'dao-hoa', 'cay-que-hoa']),
}
NOTE = {'cay-chay': 'cây cháy thân đen nứt than hồng', 'cay-chay-la': 'cây cháy còn vài lá đỏ', 'cay-chay-mai': 'cây khô cháy mảnh, khói',
        'da-nui-lua': 'tảng đá núi lửa nứt dung nham', 'soi-nui-lua': 'đống đá núi lửa nhỏ', 'bui-tro': 'bụi khô màu tro, tàn lửa',
        'tung-tuyet': 'tùng phủ tuyết lớn', 'tung-tuyet-vua': 'tùng phủ tuyết vừa', 'tung-tuyet-non': 'tùng tuyết non',
        'cay-bang': 'cây trơ cành phủ sương, băng rủ', 'bui-tuyet': 'bụi phủ tuyết', 'da-tuyet': 'tảng đá đội tuyết',
        'cay-kho-gio': 'cây khô cong theo gió', 'tru-da-den': 'trụ đá đen rêu tím', 'tru-da-gay': 'trụ đá đen gãy', 'bui-gai': 'bụi gai khô',
        'da-den': 'cụm đá đen tím', 'bui-co-kho': 'khóm cỏ khô vàng', 'nam-lam-to': 'nấm lam phát sáng khổng lồ', 'nam-tim-to': 'đôi nấm tím phát sáng',
        'bui-duong-xi-lon': 'dương xỉ lớn', 'cay-rung': 'cây rừng dây leo', 'da-reu-xanh': 'tảng đá phủ rêu', 'nam-cum': 'cụm nấm lam nhỏ phát sáng',
        'cay-ho-duong': 'hồ dương lá vàng', 'cay-ho-duong-nho': 'hồ dương nhỏ', 'bui-sa-mac': 'bụi sa mạc', 'da-quang-vang': 'tảng đá quặng vàng',
        'soi-vang': 'cụm đá vân vàng', 'kiem-co-cat': 'kiếm cổ gỉ cắm cát', 'tru-dat-cao': 'cột đất đỏ cao', 'tru-dat': 'cột đất thấp',
        'cay-thu': 'cây lá đỏ mùa thu', 'bui-thu': 'bụi cam mùa thu', 'da-dat-set': 'tảng đá đất sét', 'bo-lua-chin': 'bó lúa chín',
        'cay-hu-khong': 'cây chết hư không nứt tím', 'pha-le-cao': 'trụ pha lê tím cao', 'da-noi-hk': 'đá vụn lơ lửng sáng tím',
        'pha-le-cum': 'cụm pha lê tím', 'da-hac-dieu': 'tảng hắc diệu thạch', 'bui-hoa-hk': 'bụi hoa hư không tím',
        'bui-oai-huong': 'bụi oải hương', 'bui-mau-don-hong': 'bụi mẫu đơn hồng', 'bui-hue-trang': 'khóm huệ trắng', 'bui-tu-cau': 'bụi tú cầu lam',
        'bui-cuc-vang-lon': 'bụi cúc vàng', 'bui-tra-do': 'bụi trà đỏ', 'tu-dang': 'cây tử đằng', 'cay-moc-lan': 'cây mộc lan trắng',
        'dao-hoa': 'cây đào hoa hồng', 'cay-que-hoa': 'cây quế hoa vàng'}
# kiểu chân riêng: nấm khổng lồ, đá vụn lơ lửng chắn như trụ; đá hắc diệu, đá đất sét chắn như tảng đá (khoá da- sẵn có)
KINDS = {'tc.nam-lam-to': 'tru', 'tc.nam-tim-to': 'tru', 'tc.soi-nui-lua': 'nho', 'tc.soi-vang': 'nho'}


def cum(a, gian, nho):
    """Khung các món: vùng liền của kênh trong suốt sau khi nới gian điểm; xếp theo hàng (gom theo tâm dọc) rồi trái sang phải."""
    m = a[..., 3] > 0
    lab, _ = ndimage.label(ndimage.binary_dilation(m, iterations=gian))
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        mm = (lab[sl] == i) & m[sl]
        if mm.sum() < nho:
            continue
        ys, xs = np.where(mm)
        boxes.append((sl[1].start + xs.min(), sl[0].start + ys.min(), sl[1].start + xs.max() + 1, sl[0].start + ys.max() + 1, i))
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows = []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        r = next((r for r in rows if abs(r[0] - cy) < max(20, (b[3] - b[1]) * 0.45)), None)
        (r[1].append(b) if r else rows.append([cy, [b]]))
    return [b for r in rows for b in sorted(r[1], key=lambda b: b[0])], lab


def main():
    art = json.loads(ART.read_text(encoding='utf-8'))
    S = art['sprites']
    (SRC / 'cat').mkdir(exist_ok=True)
    for tam, (gian, nho, ten) in TAM.items():
        a = np.array(Image.open(SRC / f'{tam}.png' if tam.startswith('ltl') else SRC / f'{tam}-do.png').convert('RGBA'))
        boxes, lab = cum(a, gian, nho)
        assert len(boxes) == len(ten), f'{tam}: {len(boxes)} món, cần {len(ten)}'
        k = 0
        for (x0, y0, x1, y1, i), t in zip(boxes, ten):
            sub = a[y0:y1, x0:x1].copy()
            sub[lab[y0:y1, x0:x1] != i] = 0   # chỉ giữ điểm của món này (món bên cạnh lấn khung thì bỏ)
            im = Image.fromarray(sub)
            if t == NHO:   # đồ nhỏ: tấm in nền (sc_tc.py) và hình đứng riêng tc.nho-<tc>-<i>-sc (rải trên bản đồ, không chắn)
                luu(im, SRC / 'cat' / f"{tam.split('-')[0]}-nho-{k}.png")
                t, k = f"nho-{tam.split('-')[0]}-{k}", k + 1
            sid = f'tc.{t}-sc'
            f = OUT / (sid.replace('.', '-') + '.png')
            luu(im, f)
            S[sid] = {'file': f'assets/art/{f.name}', 'v': hashlib.sha1(f.read_bytes()).hexdigest()[:8], 'w': im.width, 'h': im.height,
                      'frames': 1, 'anchor': [im.width // 2, im.height - 2], 'note': f"SpriteCook: {NOTE.get(t, 'đồ nhỏ in nền')} (tools/art/sc_tc_do.py)", 'scale': SCALE}
            print(f'{sid:28s} {im.width:3d}×{im.height:3d}  {im.width / 32:4.1f}×{im.height / 32:4.1f} ô')
    ART.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    ghi_le_hoi({}, KINDS, {})


if __name__ == '__main__':
    main()
