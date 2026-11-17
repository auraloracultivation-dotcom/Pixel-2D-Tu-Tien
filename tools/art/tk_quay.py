"""Hai quầy ở quảng trường Thiên Kiếm Phong (chủ dự án 18/11/2026 06:08 gửi tấm 4 công trình GPT nền trong suốt, "lấy 2 ảnh cuối":
quầy Ngự Thú (dấu móng thú, chuồng sói) và quầy Khôi Lỗi (bánh răng, khôi lỗi máy). Ảnh gốc ~1,9 MB không vào kho, như bộ lau/:
nguon/ai/le-hoi/thien-kiem/quay/s01.png. Xử lý y như bộ lâu (tk_lau.py → tk_moi._build: về điểm ảnh thật theo cỡ đơn vị bản đồ,
bớt rực, gom màu, viền mực, đèn tự dò); tên tk.sap-* nên chắn đường kiểu sạp (data/le-hoi.json kinds "hb.sap").
Biển trên mái để trống: game viết tên lên biển (plaque, src/render/draw-hoi.js).
Chạy: python3 -I tools/art/tk_quay.py — chỉ thay hai món này trong data/art.json."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tk_moi as TK  # noqa: E402
import tk_lau as LAU  # noqa: E402
from px import MANIFEST  # noqa: E402

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'le-hoi' / 'thien-kiem' / 'quay'
# id: (tấm, (y0, x0, y1, x1), cỡ đơn vị ngang, 'w', hiệu ứng). Cỡ: lớn hơn sạp thường (64), nhỏ hơn Chợ Phiên (100)
BO = {
    'tk.sap-thu-m': (1, (250, 1196, 670, 1676), 80, 'w', ''),   # quầy Ngự Thú
    'tk.sap-khoi-loi-m': (1, (240, 1699, 670, 2172), 80, 'w', ''),   # quầy Khôi Lỗi
}

if __name__ == '__main__':
    import json
    from px import ROOT, save, write_manifest
    MANIFEST.update(json.loads((ROOT / 'data' / 'art.json').read_text(encoding='utf-8'))['sprites'])
    print('quầy Thiên Kiếm Phong:', TK._build(save, SRC, BO))
    for k in BO:
        MANIFEST[k]['note'] = MANIFEST[k]['note'].replace('moi/', 'quay/')
        pq = LAU.plaque(k)
        if pq: MANIFEST[k]['plaque'] = pq
        print(k, MANIFEST[k]['w'], MANIFEST[k]['h'], MANIFEST[k].get('plaque'), len(MANIFEST[k].get('lights', [])))
    write_manifest()
