"""Bộ hình bảng Nhân vật từ ảnh GPT (chủ dự án 11/11/2026 02:21; nguon/ai/ui/nv-bieu-tuong.png, nv-be-phap-tran.png, nv-khung.png).
Ảnh có nền trong suốt sẵn: bỏ quầng mờ (alpha thấp), tách từng món theo mảng hình liền, thu nhỏ vừa dùng, giữ nguyên hình (không gom
màu, như ui_pham_cap.py). Dùng ở style-self.css, src/ui/self-*.js.
- ui-nv-<tên>: 24 biểu tượng (lưới 6 × 4 của ảnh, hàng lệch nhau nên dò từng hình rồi xếp theo hàng, cột): chỉ số, ngũ hành, khôi lỗi,
  lỗ khảm trống, giảm sát thương, lực chiến, danh hiệu, bán nhanh, mặc đồ tốt nhất;
- ui-nv-be: bệ pháp trận dưới chân nhân vật;
- ui-nv-khung (khung bảng), ui-nv-the (khung thẻ trong), ui-nv-tab / -tab-on (nút mục tắt / bật), ui-nv-nut / -nut-vang (nút nhỏ),
  ui-nv-dong (nút đóng), ui-nv-o (ô kho trống): dùng kiểu 9 mảnh (border-image). Khung bảng, khung thẻ có hoa văn giữa cạnh trên
  dưới: thay đoạn giữa bằng cạnh trơn kề bên cho khỏi méo khi kéo giãn.
Dựng riêng: python3 -I tools/art/ui_kit_only.py."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from px import Canvas

SRC = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'ui'
ICONS = [['hp', 'cong', 'thu', 'toc', 'bao', 'st-bao'], ['hoi-chieu', 'hut-mau', 'phan-don', 'hoi-mau', 'linh-luc', 'tu-luyen'],
         ['kim', 'moc', 'thuy', 'hoa', 'tho', 'khoi-loi'], ['lo-kham', 'giam-st', 'luc-chien', 'danh-hieu', 'ban', 'mac-tot']]
# mảnh bộ khung theo thứ tự diện tích giảm dần (dò được 8 mảnh): tên, đoạn cạnh giữa cần làm trơn (tỉ lệ bề ngang) hoặc None
KIT = {'khung': (0.33, 0.67), 'the': (0.3, 0.7), 'o-luoi': None, 'tab': None, 'tab-on': None, 'nut': None, 'nut-vang': None, 'dong': None}


def _load(name, cut=64):
    a = np.array(Image.open(SRC / name).convert('RGBA'))
    a[:, :, 3] = np.where(a[:, :, 3] >= cut, a[:, :, 3], 0)   # bỏ quầng sáng mờ quanh hình
    return a


def _crop(a):
    ys, xs = np.nonzero(a[:, :, 3] > 0)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def _fit(a, k):
    """Thu nhỏ k lần (giữ trong suốt đúng: nhân alpha trước khi lấy mẫu)."""
    h, w = a.shape[:2]
    im = Image.fromarray(np.ascontiguousarray(a, dtype=np.uint8), 'RGBA').convert('RGBa')
    return np.array(im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS).convert('RGBA'))


def _save(save, sid, a, note=''):
    c = Canvas(a.shape[1], a.shape[0]); c.a = np.ascontiguousarray(a, dtype=np.uint8)
    save(sid, [c], (a.shape[1] // 2, a.shape[0]), note)


def _parts(a, big, thr=128):
    """Mảng hình lớn (≥ big điểm) và các mẩu nhỏ quanh nó (tia lửa, giọt máu) gộp vào mảng gần nhất."""
    m = a[:, :, 3] >= thr
    lab, k = nd.label(m, structure=np.ones((3, 3)))
    sizes = nd.sum(m, lab, range(1, k + 1)); sl = nd.find_objects(lab)
    mains = [i for i in range(k) if sizes[i] >= big]
    owner = {i: i for i in mains}
    for i in range(k):
        if i in owner: continue
        cy, cx = (sl[i][0].start + sl[i][0].stop) / 2, (sl[i][1].start + sl[i][1].stop) / 2
        near = [j for j in mains if sl[j][0].start - 20 <= cy <= sl[j][0].stop + 20 and sl[j][1].start - 20 <= cx <= sl[j][1].stop + 20]
        if near: owner[i] = near[0]
    out = []
    for j in mains:
        ids = [i + 1 for i, o in owner.items() if o == j]
        mask = nd.binary_dilation(np.isin(lab, ids), iterations=2)   # giữ mép mềm sát hình
        piece = a.copy(); piece[~mask, 3] = 0
        out.append((sl[j], _crop(piece), sizes[j]))
    return out


def _smooth_mid(a, span, band):
    """Thay đoạn giữa cạnh trên, dưới (span: tỉ lệ bề ngang) bằng cột cạnh trơn ngay bên trái đoạn đó (band: bề dày cạnh)."""
    a = a.copy(); w = a.shape[1]; x0, x1 = int(w * span[0]), int(w * span[1])
    for ys in (slice(0, band), slice(a.shape[0] - band, a.shape[0])):
        a[ys, x0:x1] = a[ys, x0 - 1:x0]
    return a


def build(save):
    n = 0
    ic = _load('nv-bieu-tuong.png')
    parts = sorted(_parts(ic, 1500), key=lambda p: ((p[0][0].start + p[0][0].stop) // 2 // 200, p[0][1].start))
    assert len(parts) == 24, len(parts)
    for r, row in enumerate(ICONS):
        for q, name in enumerate(row):
            _save(save, 'ui.nv-' + name, _fit(parts[r * 6 + q][1], 0.48)); n += 1
    be = _crop(_load('nv-be-phap-tran.png', 40))
    _save(save, 'ui.nv-be', _fit(be, 0.3)); n += 1
    kit = _load('nv-khung.png', 24)
    pieces = sorted(_parts(kit, 15000), key=lambda p: -p[2])
    assert len(pieces) == len(KIT), len(pieces)
    names = list(KIT)
    # thứ tự diện tích: khung, thẻ, lưới ô, nút mục tắt, nút mục bật, nút nhỏ (2 cái gần bằng nhau), nút đóng → xếp lại theo vị trí
    tabs = sorted(pieces[3:5], key=lambda p: p[0][1].start)
    btns = sorted(pieces[5:7], key=lambda p: p[0][0].start)
    order = [pieces[0], pieces[1], pieces[2], tabs[0], tabs[1], btns[0], btns[1], pieces[7]]
    for name, p in zip(names, order):
        img = p[1]
        if KIT[name]: img = _smooth_mid(img, KIT[name], int(img.shape[0] * 0.16))
        if name == 'o-luoi':   # một ô trong lưới mẫu (hàng 2, cột 2) làm ô kho trống
            h, w = img.shape[:2]
            img = _crop(img[int(h * 0.33):int(h * 0.67), int(w * 0.255):int(w * 0.505)])
            name = 'o'
        _save(save, 'ui.nv-' + name, _fit(img, 0.5)); n += 1
    return n
