"""Quái thế hệ 2 (28/10/2026): Claude thiết kế bằng code, chi tiết gấp đôi bản cũ (mobs.py).
Mỗi quái trong data/mobs.json → 4 khung đi (chân bước, cánh vỗ, lửa bập bùng), nhìn phải.
Dáng lấy từ "look" (vài con có dáng riêng ở LOOK_FIX), hệ đoán từ id (lửa, băng, mộc, kim, thổ, hư không, phong, huyết),
boss to theo máu. Hình vẽ chi tiết hơn nên game thu lại theo "scale" để cỡ trên bản đồ vẫn theo radius như cũ."""
import numpy as np
from PIL import Image
from mob_px import Canvas, ramp, hx, mix
import mob_parts as P
from mob_looks_b import LOOKS, BOX

EL_KEYS = [("fire", ["hoa", "viem"]), ("blood", ["huyet"]), ("ice", ["tuyet", "bang", "han"]),
           ("wood", ["moc", "doc-dang", "re-ma", "gai", "cuc", "thao", "co-thu", "thu-moc"]),
           ("metal", ["kim", "kiem", "sa-ma"]), ("earth", ["tho", "nham", "thach", "son"]),
           ("void", ["hu-", "u-minh", "ma-ton", "tam-ma", "nguc"]), ("wind", ["phong", "hac-diep"])]
# dáng riêng: lính gác dùng dáng lính cầm giáo, rễ ma là thân rắn, ma thám tử là bóng ma
LOOK_FIX = {"ma-binh": "soldier", "han-ma-ve": "soldier", "ma-phong-ve": "soldier", "kim-ma-ve": "soldier",
            "tho-ma-ve": "soldier", "u-minh-ve": "soldier", "re-ma": "snake", "ma-tham-tu": "shade"}
WEAPON = {"han-hon-ma-tuong": "staff", "toai-son-ma-tuong": "axe", "hu-khong-nguc-chu": "staff", "ma-ton": "staff",
          "hac-phong-ma-quan": "axe"}
FXS = {"wolf": 1.5, "lord": 1.25, "golem": 1.3, "imp": 1.1, "plant": 1.1, "beetle": 1.2, "snake": 1.2}
DESIGNED = set(BOX) | {"person"}


def element(mid):
    for el, keys in EL_KEYS:
        if any(x in mid for x in keys):
            return el
    return None


def _opts(mid, d, el):
    o = {"el": el, "eye": P.EYE[el]}
    col = d.get("color", "#8a8a9a")
    if el == "fire": o["cloth"] = P.FIRE
    if el == "ice":
        o["cloth"] = P.ICE
        o["armor"] = [(50, 70, 110), (90, 120, 170), (140, 175, 215), (195, 220, 245), (240, 250, 255)]
    if el == "metal": o["armor"] = P.GOLD; o["cloth"] = P.CLOTH_RED
    if el == "earth": o["armor"] = P.STONE; o["cloth"] = [mix(c, (90, 50, 20), .5) for c in P.CLOTH_RED]
    if el == "void":
        o["cloth"] = P.VOID
        o["armor"] = [(20, 12, 32), (45, 30, 70), (75, 55, 110), (110, 90, 150), (160, 140, 200)]
    if el == "wind": o["cloth"] = [(40, 70, 70), (60, 110, 110), (90, 160, 150), (150, 210, 200), (210, 245, 240)]
    if el == "wood":
        purple = "thuc-moc" in mid
        o["bark"] = [mix(c, (90, 20, 60), .4) for c in P.WOOD] if purple else P.WOOD
        if purple: o["flower"] = [(90, 10, 40), (170, 30, 80), (230, 70, 130), (255, 140, 180), (255, 210, 230)]
        if "co-thu" in mid or "thao" in mid: o["flower"] = [(120, 90, 20), (200, 160, 40), (250, 220, 90), (255, 240, 160), (255, 255, 220)]
    if mid in WEAPON: o["weapon"] = WEAPON[mid]
    if d.get("look") == "lord":
        o["armor"] = [mix(c, hx(col), 0.35) for c in o["armor"]] if "armor" in o else ramp(mix(hx(col), (70, 70, 90), 0.55), spread=0.8)
    if "tan-hon" in mid: o["ghost"] = True
    return o


class _Frame:
    """Khung đã cắt, có .w .h .img() như px.Canvas để px.save dùng được."""
    def __init__(self, a): self.a = a; self.h, self.w = a.shape[:2]
    def img(self): return Image.fromarray(self.a, "RGBA")


def mob_frames2(mid, d):
    """→ (4 khung, neo chân, tỉ lệ vẽ trong game). None nếu quái không có dáng (đấu sĩ)."""
    look = LOOK_FIX.get(mid, d.get("look"))
    if look == "person": look = "soldier"
    if look not in LOOKS:
        return None
    el, boss = element(mid), d.get("ai") == "boss"
    s = 1.0
    if boss:
        s = 1.35 if d["hp"] < 5000 else 1.55 if d["hp"] < 30000 else 1.75
        if mid == "ma-ton": s = 2.0
        if mid == "huyet-nha": s = 1.2
    W, H = int(BOX[look][0] * s) + 18, int(BOX[look][1] * s) + 16   # chừa chỗ sừng, lửa, vương miện
    o, R = _opts(mid, d, el), ramp(d.get("color", "#8a8a9a"))
    raw = []
    for f in range(4):
        c = Canvas(W, H)
        fx_pts, head = LOOKS[look](c, R, f, s, o)
        if el and fx_pts and look not in ("snowman", "pumpkin"):
            P.element_fx(c, el, fx_pts, f, s * FXS.get(look, 1.0))
        if d.get("crown"):
            P.crown(c, head[0], head[1] - 1, max(1, s * 0.8))
        c.outline()
        px = c.px
        if o.get("ghost"):   # tàn hồn: trong mờ, ám tím
            px[..., :3] = (px[..., :3] * 0.65 + np.array([120, 90, 200]) * 0.35).astype(np.uint8)
            px[..., 3] = np.where(px[..., 3] > 0, 200, 0)
        raw.append(px)
    a = np.zeros(raw[0].shape[:2], bool)
    for fr in raw: a |= fr[..., 3] > 0
    ys, xs = np.nonzero(a)
    y0, y1 = max(0, ys.min() - 1), H - 1                      # đáy khung = mặt đất + 1
    x0, x1 = max(0, xs.min() - 1), min(W, xs.max() + 2)
    frames = [_Frame(np.ascontiguousarray(fr[y0:y1, x0:x1])) for fr in raw]
    anchor = (int(round(W / 2 - x0)), int(H - 2 - y0))
    target = 2.6 * d.get("radius", 6) + 4 + (6 if d.get("crown") else 0)   # cỡ cũ theo radius
    scale = round(max(0.5, min(1.0, target / (y1 - y0))), 2)
    return frames, anchor, scale
