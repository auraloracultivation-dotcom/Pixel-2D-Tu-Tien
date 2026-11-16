"""Câu lệnh SpriteCook cho bộ 16 trang phục mới (chủ dự án 16/11/2026 18:57: "Làm trước 1 bộ đi, nhớ là khi xếp bằng thì phải tụ
quả cầu linh lực ở giữa, mắt không được nhắm; còn 2 chiêu công kích lúc đứng phải đánh sang bên phải, và phải có pháp lực đẩy ra").
Mỗi bộ 5 món, cùng một bản tả đặc điểm:
  ngoi   ảnh ngồi xếp bằng vận khí cầu: Nano Banana 2.1, edit_asset_id = ô tranh gốc (nguon-sc/NN-hd.png), mẫu dáng mau-ngoi.png ở
         style_asset_ids (không dùng được edit cùng reference);
         khí cầu nhỏ giữa hai tay có sẵn trong ảnh, quầng sáng và linh lực tụ về vẽ bằng code.
  dung   đứng nghỉ; chay chạy; danh1 một chưởng; danh2 hai tay kết ấn rồi cùng đẩy. Chuyển động pixel-engine-v1.5 từ ảnh tĩnh đã duyệt
         (nguon-sc/NN-dem.png, đệm trong suốt trái 6, phải 18 điểm; đệm KHÔNG có tác dụng: SpriteCook cắt theo hình rồi tự đóng khung,
         giữ cho mọi bộ cùng một cách).
Luật câu lệnh như Bộ Quái Mới (docs/02-CHUAN-PIXEL.md): liệt kê đủ đặc điểm nhìn thấy + câu giữ nguyên; mắt luôn mở; không vẽ thêm
hiệu ứng (luồng pháp lực vẽ bằng code, bắn đúng khung tay vươn xa nhất); đòn đánh ngang sang PHẢI, không về phía người xem, chân
đứng yên (game tự nhún tới), xong đòn về lại dáng đứng.
Ra: tools/art/nguon/ai/trang-phuc-moi/cau-lenh.json. Chạy: python3 -I tools/art/trang_phuc_cau_lenh.py"""
import json
from pathlib import Path

D = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'trang-phuc-moi'

# n: (chủ thể, đặc điểm theo thứ tự đầu → chân, phần lay khi đứng nghỉ, phần bay ngược khi chạy)
M = {
    1: ('The chibi cultivator in a white robe',
        ['the long dark brown hair tied in a high ponytail that flows down behind the back', 'the small gold crown ornament on top of the head',
         'the gold ribbons hanging from the ponytail', 'the red eyes', 'the white robe with wide sleeves and a red crossed collar',
         'the gold belt over the dark sash', 'the dark under-robe at the front', 'the red tassel cord hanging at the side', 'the dark brown boots'],
        'the ponytail, the gold ribbons and the long sleeves', 'the ponytail, the gold ribbons and the sleeves'),
    2: ('The chibi cultivator in a blue robe with a white fur collar',
        ['the long silver white hair tied in a high ponytail', 'the small gold crown on top of the head', 'the blue eyes',
         'the fluffy white fur collar around the shoulders', 'the blue robe with a white front and white sleeves', 'the gold sash tied at the waist',
         'the dark blue boots'],
        'the long ponytail and the robe hem', 'the ponytail and the sleeves'),
    3: ('The chibi cultivator in a lavender dress',
        ['the dark plum black hair with two round buns on top and long hair falling down the back',
         'the big white flower with a yellow center on the left side of the head', 'the purple tassel with a small gold bead hanging beside it',
         'the small pink flower on the right bun', 'the purple eyes', 'the off-shoulder white and lavender dress', 'the small gold brooch at the chest',
         'the layered purple skirt'],
        'the long hair and the purple tassel', 'the long hair, the tassel and the skirt'),
    4: ('The chibi cultivator in a pink and white dress',
        ['the long fluffy pink hair with two round buns', 'the pink peach blossom flowers in the hair',
         'the gold hair ornament with a red tassel and a white ribbon on the left side of the head', 'the red eyes',
         'the white top with wide pink sleeves', 'the small gold brooch at the chest', 'the pink and red pleated skirt'],
        'the long pink hair, the red tassel and the wide sleeves', 'the long pink hair, the tassel and the sleeves'),
    5: ('The chibi cultivator in a light blue and white dress',
        ['the long wavy light blue hair', 'the big white bow and the white flower on the left side of the head', 'the small gold hair tassel',
         'the blue eyes', 'the white and light blue dress with wide sleeves', 'the small gold brooch at the chest', 'the light blue skirt'],
        'the long blue hair, the white bow and the wide sleeves', 'the long blue hair, the bow and the sleeves'),
    6: ('The chibi cultivator in a dark red and gold robe',
        ['the long dark brown hair tied in a high ponytail', 'the gold crown ornament on top of the head', 'the red ribbons tied in the ponytail',
         'the red eyes', 'the dark red robe with gold trim and gold patterns', 'the gold belt', 'the dark brown boots'],
        'the ponytail, the red ribbons and the robe hem', 'the ponytail, the red ribbons and the sleeves'),
    7: ('The chibi cultivator in a white and green dress',
        ['the long wavy blonde hair', 'the green leaves and the white ribbon in the hair', 'the green eyes',
         'the white dress with green leaf trim and wide white sleeves', 'the small green brooch at the chest', 'the white shoes'],
        'the long blonde hair, the white ribbon and the dress', 'the long blonde hair, the ribbon and the dress'),
    8: ('The chibi cultivator in a black and white robe',
        ['the long silver white hair tied in a high ponytail', 'the thin gold crown ornament', 'the amber eyes',
         'the black robe with a white outer robe and gold trim', 'the gold belt', 'the black boots'],
        'the long ponytail and the robe hem', 'the ponytail and the sleeves'),
    9: ('The chibi cultivator with golden antlers in a white and purple robe',
        ['the long silver white hair', 'the two golden branching antlers on the head', 'the purple ribbon in the hair', 'the purple eyes',
         'the small red mark on the forehead', 'the white and purple robe with wide sleeves and gold trim'],
        'the long hair, the purple ribbon and the wide sleeves', 'the long hair, the ribbon and the sleeves'),
    10: ('The chibi cultivator in a white and light blue dress',
         ['the long brown hair with two buns', 'the white flower, the light blue ribbons and the gold hairpin on the left side of the head',
          'the small light blue bow on the right bun', 'the blue eyes', 'the small blue earrings',
          'the white off-shoulder dress with light blue wide sleeves', 'the small gold brooch at the chest', 'the white shoes'],
         'the long hair, the light blue ribbons and the wide sleeves', 'the long hair, the ribbons and the sleeves'),
    11: ('The chibi cultivator in a white robe with a dark blue sash',
         ['the long black hair tied in a top bun', 'the gold crown ornament on the bun', 'the dark brown eyes', 'the white robe with wide sleeves',
          'the gold trim on the cuffs', 'the dark blue sash and dark blue under-robe at the front', 'the dark boots'],
         'the long hair and the wide sleeves', 'the long hair and the sleeves'),
    12: ('The chibi cultivator in a lavender and white dress',
         ['the long wavy lavender hair with a bun', 'the pale pink flower, the white ribbons and the small gold tassel on the left side of the head',
          'the purple eyes', 'the white and lavender off-shoulder dress with wide sleeves', 'the small gold brooch at the chest'],
         'the long hair, the white ribbons and the wide sleeves', 'the long hair, the ribbons and the sleeves'),
    13: ('The chibi cultivator with golden horns in a white and teal robe',
         ['the long flowing teal hair', 'the two golden curved horns on the head', 'the pale blue flower on the left side of the head',
          'the teal eyes', 'the white and teal robe with wide sleeves', 'the small gold brooch at the chest'],
         'the long teal hair and the wide sleeves', 'the long teal hair and the sleeves'),
    14: ('The chibi cultivator in a black and gold robe with a red cape',
         ['the long messy auburn hair tied in a high ponytail', 'the small gold crown in the hair', 'the amber eyes',
          'the white fur collar', 'the black and gold robe with a red front panel', 'the gold belt', 'the red cape behind',
          'the dark brown boots'],
         'the ponytail, the red cape and the robe hem', 'the ponytail and the red cape'),
    15: ('The chibi cultivator in a white and red dress',
         ['the long silver white hair with a bun', 'the big red flower with a gold center and the red ribbons on the left side of the head',
          'the red eyes', 'the small gold earrings', 'the white dress with red trim and red panels on the skirt', 'the small gold brooch at the chest'],
         'the long hair, the red ribbons and the dress', 'the long hair, the red ribbons and the dress'),
    16: ('The chibi cultivator in a wide conical hat and a white robe',
         ['the wide dark navy conical hat with a gold rim and gold tassels', 'the sheer white veil hanging from the brim of the hat',
          'the long dark navy hair', 'the blue eyes', 'the white robe with wide sleeves over a dark navy under-robe',
          'the small gold brooch at the chest'],
         'the veil, the long hair and the wide sleeves', 'the veil, the long hair and the sleeves'),
}
MATTE = {}   # đặt tay nếu cần; còn lại chọn tự động màu thuần xa nhất với ảnh tĩnh (matte())
PURE = ['#00ff00', '#ff00ff', '#0000ff', '#00ffff']


def matte(n):
    """Màu nền tạm: màu thuần có khoảng cách nhỏ nhất tới các màu ảnh tĩnh LỚN nhất (như thú cưỡi mới)."""
    if n in MATTE: return MATTE[n]
    import numpy as np
    from PIL import Image
    a = np.array(Image.open(D / 'tinh' / f'{n:02d}.png').convert('RGBA')); c = a[a[..., 3] > 0][:, :3].astype(int)
    best = max(PURE, key=lambda h: np.linalg.norm(c - np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)]), axis=1).min())
    return best

DUNG = '{s} stands in place in a calm idle stance in 3/4 view facing right, breathing slowly so the body rises and falls by one pixel while {sway} sway gently.'
CHAY = ('{s} runs to the right in a fast running loop while staying in place: the legs stride forward and push back in turn, the arms swing, '
        'the body leans forward a little and {flow} stream back behind. Side view facing right.')
DANH1 = ('Side view facing right; the attack moves horizontally to the RIGHT, never toward the camera. {s} draws one hand back to the waist, '
         'then leans forward and thrusts that open palm straight out to the RIGHT at chest height until the arm is fully extended, holds the push '
         'for a moment, then pulls the hand back and returns to the same standing pose. The feet stay planted on the same spot.')
DANH2 = ('Side view facing right; the attack moves horizontally to the RIGHT, never toward the camera. {s} brings both hands together in front '
         'of the chest in a hand seal and bends the knees a little to gather strength, then leans forward and pushes both open palms straight out '
         'to the RIGHT together until the arms are fully extended, holds the push for a moment, then returns to the same standing pose. '
         'The feet stay planted on the same spot.')
NGOI = ('Redraw the chibi character from the edited image in a new pose: sitting cross-legged on the ground in meditation, in 3/4 view facing '
        'right, like the sitting pose in the other image (use that image only for the pose; ignore its swirling aura and its background). Both hands are held together in front of the chest, cupping a small round glowing golden '
        'orb of spiritual energy at the center between the hands, above the crossed legs. The eyes are wide open, looking calmly forward at the '
        'orb; the eyes are not closed. Keep the same character design: {f}. Same chibi proportions, same colors and the same pixel art style as '
        'the edited image. Only the character and the small orb: no aura, no flames, no swirling energy, no sparkles, no background, no shadow, '
        'no text.')


def ds(f):
    return ', '.join(f[:-1]) + ' and ' + f[-1]


def keep(f):
    return (f'Keep every detail identical in every frame: {ds(f)} stay clearly visible and unchanged in shape and color; nothing disappears or '
            'hides behind another part. The eyes stay open in every frame. No new objects or effects appear: no energy, no glow, no sparks, '
            'no projectiles. It faces right and stays on the same spot.')


def build():
    out = {'_note': 'Câu lệnh SpriteCook bộ 16 trang phục mới (tools/art/trang_phuc_cau_lenh.py). ngoi: generate_game_art; còn lại: animate_game_art.'}
    for n, (s, f, sway, flow) in M.items():
        k = keep(f); f2 = ds([x.replace('the ', '', 1) for x in f])
        out[str(n)] = {'matte': '#00ff00' if n == 1 else matte(n), 'prompts': {
            'ngoi': NGOI.format(f=f2),
            'dung': DUNG.format(s=s, sway=sway) + ' ' + k,
            'chay': CHAY.format(s=s, flow=flow) + ' ' + k,
            'danh1': DANH1.format(s=s) + ' ' + k,
            'danh2': DANH2.format(s=s) + ' ' + k}}
    return out


if __name__ == '__main__':
    o = build(); json.dump(o, open(D / 'cau-lenh.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for n, v in o.items():
        if n != '_note':
            for m, p in v['prompts'].items(): print(n, m, len(p), p[:160], '…')
