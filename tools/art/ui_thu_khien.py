"""Biểu tượng thư và khiên (ảnh GPT chủ dự án gửi 07/11/2026 09:04, nguon/ai/ui/thu-khien.png, nền đã trong suốt): thư chưa xem
(phong bì niêm sáp đỏ), thư đã xem (phong bì mở, lấp lánh), khiên tắt (kiếm chéo, giao diện đang ẩn), khiên bật (khiên sáng, giao
diện đang hiện). Cắt theo cột có hình, thu về cao H điểm ảnh (giữ nét, lọc LANCZOS vì ảnh GPT chỉ "giả pixel"), gộp vào data/art.json.
Chạy: python3 -I tools/art/ui_thu_khien.py"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
import px

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui' / 'thu-khien.png'
NAMES = ['ui.k-thu-moi', 'ui.k-thu-da-xem', 'ui.k-khien-tat', 'ui.k-khien-bat']
H = 96


def build(save):
    im = Image.open(SRC).convert('RGBA'); a = np.array(im); al = a[:, :, 3] > 20
    runs, s = [], None
    for x in range(a.shape[1]):
        if al[:, x].any():
            if s is None: s = x
        elif s is not None: runs.append((s, x)); s = None
    runs = [r for r in runs if r[1] - r[0] > 20]
    assert len(runs) == 4, runs
    for sid, (x0, x1) in zip(NAMES, runs):
        rows = np.where(al[:, x0:x1].any(1))[0]
        part = im.crop((x0, rows[0], x1, rows[-1] + 1))
        w = max(1, round(part.width * H / part.height))
        part = part.resize((w, H), Image.LANCZOS)
        c = px.Canvas(w, H); c.a = np.ascontiguousarray(np.array(part), dtype=np.uint8)
        save(sid, [c], (w // 2, H // 2), 'biểu tượng ' + sid[5:] + ' (ảnh GPT nguon/ai/ui/thu-khien.png)')
    return len(NAMES)


if __name__ == '__main__':
    n = build(px.save)
    p = Path(__file__).resolve().parents[2] / 'data' / 'art.json'
    art = json.loads(p.read_text(encoding='utf-8'))
    art['sprites'].update({k: v for k, v in px.MANIFEST.items() if k in NAMES})
    art['sprites'] = dict(sorted(art['sprites'].items()))
    p.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('thư, khiên:', n)
