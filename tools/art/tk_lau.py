"""Hai toà lâu ở quảng trường Thiên Kiếm Phong (chủ dự án 11/11/2026 21:19: "Vạn bảo lâu và chợ chưa thấy cái toà lâu nào cả,
thiết kế cho 2 ông này 2 cái lâu"): Vạn Bảo Lâu (lầu ba tầng bán bảo vật) và Chợ Phiên (lầu chợ hai tầng, hiên vải đỏ).
Ảnh GPT chủ dự án gửi 21:26, vẽ theo ảnh mẫu bộ nhà Thiên Kiếm (nền trong suốt, nhìn thẳng mặt trước): nguon/ai/le-hoi/thien-kiem/lau/s01.png
(ảnh gốc ~2 MB không vào kho, như bộ moi/). Xử lý y như bộ mới (tk_moi.py _build: thu về điểm ảnh thật theo cỡ đơn vị bản đồ,
bớt rực, gom màu, viền mực, đèn tự dò); tên tk.lau-* nên chắn đường kiểu nhà (data/le-hoi.json kinds "hb.lau" → nha).
Biển trên cửa để trống: tên do game viết lên biển gỗ (phần tử thứ tư trong khoá hoi.do, src/render/draw-hoi.js).
Chạy: python3 -I tools/art/tk_lau.py — chỉ thay hai món này trong data/art.json."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tk_moi as TK  # noqa: E402
from px import MANIFEST  # noqa: E402

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'le-hoi' / 'thien-kiem' / 'lau'
# id: (tấm, (y0, x0, y1, x1), cỡ đơn vị ngang, 'w', hiệu ứng)
BO = {
    'tk.lau-van-bao-m': (1, (0, 0, 887, 905), 120, 'w', ''),   # Vạn Bảo Lâu: rộng hơn Chợ (người chuẩn cao 24)
    'tk.lau-cho-m': (1, (230, 915, 887, 1774), 100, 'w', ''),   # Chợ Phiên
}


def plaque(sid):
    """Tấm biển trống trên cửa (mảng xám tối nằm ngang, gần giữa hình, hẹp hơn nửa bề ngang) → [x, y, w, h] điểm ảnh hình:
    game viết tên lên đó (src/render/draw-hoi.js plaqueLabel)."""
    import numpy as np
    from PIL import Image
    from scipy import ndimage as nd
    from px import ROOT
    a = np.array(Image.open(ROOT / MANIFEST[sid]['file']).convert('RGBA')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (a[..., 3] > 0) & (np.maximum(np.maximum(r, g), b) < 95) & (np.abs(r - b) < 30) & (np.abs(r - g) < 30)
    lab, k = nd.label(m)
    best = None
    for i, sl in enumerate(nd.find_objects(lab)):
        x0, x1, y0, y1 = sl[1].start, sl[1].stop, sl[0].start, sl[0].stop
        w, h, n = x1 - x0, y1 - y0, int((lab[sl] == i + 1).sum())
        if w > a.shape[1] * 0.5 or w < h * 2.5 or abs((x0 + x1) / 2 - a.shape[1] / 2) > a.shape[1] * 0.15 or n < w * h * 0.6:
            continue
        if not best or n > best[0]:
            best = (n, [int(x0), int(y0), int(w), int(h)])
    return best and best[1]


if __name__ == '__main__':
    import json
    from px import ROOT, save, write_manifest
    MANIFEST.update(json.loads((ROOT / 'data' / 'art.json').read_text(encoding='utf-8'))['sprites'])
    print('lâu Thiên Kiếm Phong:', TK._build(save, SRC, BO))
    for k in BO:
        MANIFEST[k]['note'] = MANIFEST[k]['note'].replace('moi/', 'lau/')
        pq = plaque(k)
        if pq: MANIFEST[k]['plaque'] = pq
    write_manifest()
