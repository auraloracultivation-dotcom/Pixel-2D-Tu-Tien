"""Hình AI (Canva) cho linh thú và thú cưỡi: ảnh gốc ở tools/art/nguon/ai/linh-thu/<id>-goc.png và thu-cuoi/<id>-goc.png.
Có ảnh thì build.py dùng ảnh này thay hình vẽ code; không có thì vẫn vẽ code như cũ (tools/art/pets.py).
Ảnh qua tools/art/ai_import.py (bỏ nền, về điểm ảnh thật, gom màu, viền mực). Khung 2 là nhún: thân dịch xuống 1 điểm ảnh
(chân giữ nguyên chỗ đứng), đủ cho game đổi khung khi đi như hình code."""
from pathlib import Path
import numpy as np
from PIL import Image
from px import Canvas
from ai_import import remove_bg, crop, shrink, quantize, outline

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai'
BOX = {'pet': (24, 18), 'mount': (44, 40)}   # khung tối đa (rộng, cao) kể cả viền: linh thú cỡ hình code 14–24 × 14–18, thú cưỡi 42×35
FOLDER = {'pet': 'linh-thu', 'mount': 'thu-cuoi'}


def source(kind, sid):
    p = SRC / FOLDER[kind] / f'{sid}-goc.png'
    return p if p.exists() else None


def _canvas(a):
    c = Canvas(a.shape[1], a.shape[0])
    c.a = a.copy()
    return c


def frames(kind, sid, colors=12, tol=60):
    """Trả về ([khung đứng, khung nhún], điểm neo chân) hoặc None nếu chưa có ảnh AI."""
    p = source(kind, sid)
    if not p:
        return None
    a = np.array(Image.open(p).convert('RGBA'))
    a = crop(remove_bg(a, tol))
    bw, bh = BOX[kind]
    th = min(bh, round((bw - 2) * a.shape[0] / a.shape[1]) + 2)
    a = outline(quantize(shrink(a, th - 2), colors))
    h, w = a.shape[:2]
    base = np.zeros((h + 1, w, 4), np.uint8)
    f0 = base.copy(); f0[1:] = a                    # đứng: chừa 1 hàng trên
    f1 = base.copy(); f1[2:] = a[:-1]               # nhún: thân xuống 1, giữ hàng chân cuối
    f1[-1] = np.where(f1[-1, :, 3:4] > 0, f1[-1], a[-1])
    return [_canvas(f0), _canvas(f1)], (w // 2, h)
