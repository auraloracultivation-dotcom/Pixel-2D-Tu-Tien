"""Câu lệnh SpriteCook cho bộ 16 trang phục mới (chủ dự án 16/11/2026 18:57: "Làm trước 1 bộ đi, nhớ là khi xếp bằng thì phải tụ
quả cầu linh lực ở giữa, mắt không được nhắm; còn 2 chiêu công kích lúc đứng phải đánh sang bên phải, và phải có pháp lực đẩy ra").
Mỗi bộ 5 món, cùng một bản tả đặc điểm:
  ngoi   ảnh ngồi xếp bằng vận khí cầu: Nano Banana 2.1, sửa từ ô tranh gốc (nguon-sc/NN-hd.png), dáng theo mau-ngoi.png;
         khí cầu nhỏ giữa hai tay có sẵn trong ảnh, quầng sáng và linh lực tụ về vẽ bằng code.
  dung   đứng nghỉ; chay chạy; danh1 một chưởng; danh2 hai tay kết ấn rồi cùng đẩy. Chuyển động pixel-engine-v1.5 từ ảnh tĩnh đã duyệt
         đệm trong suốt (nguon-sc/NN-dem.png: trái 6, phải 18 điểm cho tay đẩy không chạm mép khung).
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
}
MATTE = {}   # màu nền tạm khác #00ff00 cho bộ có màu xanh lá

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
        'right, like the pose in the reference image. Both hands are held together in front of the chest, cupping a small round glowing golden '
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
        out[str(n)] = {'matte': MATTE.get(n, '#00ff00'), 'prompts': {
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
