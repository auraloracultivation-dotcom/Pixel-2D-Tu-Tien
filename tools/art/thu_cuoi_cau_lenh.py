"""Câu lệnh SpriteCook cho 16 thú cưỡi mới (chủ dự án 16/11/2026 17:35 "Tạo đi, tạo 16 thú cưỡi"): mỗi con ba chuyển động
dung (đứng nghỉ), chay (chạy), danh (tấn công), 8 khung, pixel-engine-v1.5, auto_enhance_prompt tắt.
Theo docs/02-CHUAN-PIXEL.md (rút từ Bộ Quái Mới): một đoạn tả chuyển động, rồi liệt kê ĐỦ mọi đặc điểm nhìn thấy trên ảnh tĩnh
tinh/NN.png, đúng màu đang thấy; chỉ nhắc lửa với con có lửa (#5, #11), không chữ "smoke", chỉ ghi "glowing" khi ảnh tĩnh phát sáng
thật; đứng tại chỗ (game tự dời); đòn đánh kết thúc đúng dáng đứng. Riêng thú cưỡi: yên giữ nguyên chỗ trên lưng (người cưỡi đứng
lên đó, chỗ ngồi dò theo yên từng khung), không có vật mới (không tự vẽ thêm người cưỡi).
matte: màu nền tạm không có trên con đó (xa nhất trong các màu thuần): #00ff00, riêng #2 rùa non bộ (nhiều xanh lá) #ff00ff,
#13 sư tử đá rêu (xanh rêu, xám đá) #0000ff. align center cho con bay, nảy (#8, #9, #12).
Chạy: python3 -I tools/art/thu_cuoi_cau_lenh.py  → tools/art/nguon/ai/thu-cuoi-moi/cau-lenh.json"""
import json
from pathlib import Path

D = Path(__file__).resolve().parent / 'nguon' / 'ai' / 'thu-cuoi-moi'

# n: (chủ thể, đặc điểm, kiểu đứng, chi tiết lúc đứng, kiểu chạy, chi tiết lúc chạy, phần chân khi bò, đòn tấn công)
M = {
 1: ('The white nine-tailed fox',
     'the white fox body with lavender shading, the fan of big fluffy white tails with blue tips behind it, the pointed ears with pink insides, '
     'the blue eye with a red marking, the small gold and teal ornament on its forehead, the dark red saddle with a thick gold rim on its back, '
     'the gold harness with round gold bells and red tassels hanging at its side and the red collar with gold ornaments',
     'dung', ' while its fluffy tails sway softly and the red tassels swing a little',
     'phi', ', its fluffy tails stream behind it and the bells and tassels swing', None,
     'crouches back, then lunges forward and snaps its jaws in a quick bite'),
 2: ('The giant bonsai garden turtle',
     'the big brown and tan shell carrying a rocky garden, the small bonsai pine tree with green foliage, the two orange lanterns hanging from the tree, '
     'the grey rocks with green moss, the small light blue waterfall on the shell, the green turtle head with a mossy green tuft on top and a dark eye, '
     'the four thick green scaly legs and the brown leather saddle with a tan rim on the front of the shell',
     'dung', ' while the lanterns sway gently and the little waterfall keeps flowing',
     'nang', ', the lanterns swinging from the little tree', None,
     'pulls its head back, then thrusts its head forward and snaps its jaws in a quick bite'),
 3: ('The white griffin',
     'the white eagle head with a yellow beak and a blue eye, the gold crest ornament on its head, the large light blue and white feathered wings '
     'raised behind its back with a gold wing ornament, the white furry lion body, the yellow eagle talons and paws, the long tail of blue feathers '
     'with a red bead, the brown leather saddle with gold trim and the gold harness with blue gems across its chest',
     'dung', ' while its wings shift slightly and its tail feathers sway',
     'phi', ', its wings lifting slightly and its tail feathers streaming behind it', None,
     'rears back with its wings spread a little wider, then lunges forward and strikes with its beak'),
 4: ('The starry night deer',
     'the dark navy blue deer body with small blue and purple star speckles, the tall branching purple antlers with a small orange lantern hanging '
     'from them, the glowing blue eye, the gold headband, the long wavy lavender mist tail, the brown saddle with gold trim, the gold harness with a '
     'gold bell and the small orange lantern hanging under the saddle',
     'dung', ' while its misty tail sways and the lanterns swing gently',
     'phi', ', its misty tail streaming behind it and the lanterns swinging', None,
     'lowers its head, then charges forward and thrusts its antlers in a quick butt'),
 5: ('The lava salamander dragon',
     'the dark maroon dragon body with bright orange and yellow lava cracks, the dark curved horns with orange tips, the yellow eye, the spiky back '
     'ridge, the curled tail ending in an orange and yellow flame, the sharp orange claws, the orange belly scales, the dark red saddle with gold trim '
     'and the gold harness',
     'dung', ' while the flame on its tail flickers',
     'phi', ', its curled tail swaying', None,
     'crouches back, then lunges forward and snaps its jaws in a fierce bite; no fire comes out of its mouth'),
 6: ('The red mushroom beast',
     'the big red mushroom cap with cream spots on its head, the two glowing purple eyes under the cap, the round cream body, the short cream legs, '
     'the smaller red mushrooms with cream spots growing on its back, the green leaves and vines around its body and the brown leather saddle with '
     'gold buckles',
     'dung', ' while the small mushrooms and leaves wobble softly',
     'lach', ', the small mushrooms wobbling', None,
     'leans back, then headbutts forward with its big mushroom cap'),
 7: ('The clockwork cat',
     'the cream white cat head with big orange eyes, pointed ears, red cheek marks and a small blue gem on its forehead, the cream and tan mechanical '
     'body with gold plates and small cyan gems, the big gold gear on its hip, the striped segmented tail curled up behind it with a gold '
     'lantern with a glowing blue crystal hanging from its tip and the brown saddle with gold buckles',
     'dung', ' while its gear turns slowly and the lantern sways',
     'phi', ', its gear spinning and the lantern swinging', None,
     'crouches, then pounces forward and swipes with one front paw'),
 8: ('The cloud whale',
     'the blue whale body with white belly stripes, the big wavy light blue fins and tail fin, the gold horns on its head, the blue eye, the swirly '
     'white cloud under its tail, the small blue bubbles floating around it and the brown saddle with gold trim strapped on its back',
     'bay', ' while its fins wave slowly and the bubbles drift',
     'boi', ', its body undulating and its big fins and tail fin sweeping up and down', None,
     'pulls back, then rams forward with its head in a quick charge'),
 9: ('The lotus toad',
     'the big green toad body with a cream belly, the round golden orange eyes, the large pink lotus flowers with yellow centers on its back and head, '
     'the green lotus leaves, the purple saddle with a gold rim, the gold coin ornaments, the red tassels hanging at its side and the gold bell on a '
     'teal bead necklace',
     'ngoi', ' while the lotus flowers sway gently',
     'nhay', ', the lotus flowers and tassels bouncing', None,
     'crouches, then lunges forward and snaps its wide mouth'),
 10: ('The crystal tiger',
      'the white tiger body with dark blue stripes, the blue eye, the small gold crown with a teal gem on its head, the light blue ice crystal cluster '
      'on its back behind the saddle, the gold harness with teal gems around its chest, the gold collar with a green gem, the striped curled tail '
      'and the brown saddle with gold trim',
      'dung', ' while its striped tail sways',
      'phi', ', its striped tail swinging', None,
      'crouches, then pounces forward and swipes with one front paw'),
 11: ('The fire phoenix',
      'the orange and red phoenix bird with flame shaped feathers, the yellow eye, the flame crest on its head, the long flowing flame tail feathers '
      'and wing feathers in orange, red and yellow, the orange legs with talons, the purple saddle with gold trim and the red tassel hanging under it',
      'dung', ' while its flame feathers flicker',
      'chim', ', its wings held half open and its long tail feathers streaming', None,
      'rears back with its wings raised, then lunges forward and strikes with its beak; no fireball appears'),
 12: ('The lantern jellyfish',
      'the lavender translucent jellyfish body, the long wavy lavender tentacles, the pagoda lantern on top with a dark blue roof, gold rim and gold '
      'finial over a big glowing yellow lantern, the small orange lanterns hanging from its tentacles, the two little lavender spirit wisps with '
      'smiling faces floating beside it and the purple saddle with gold trim',
      'bay', ' while its tentacles sway and the spirit wisps drift',
      'boi', ', its tentacles trailing and rippling behind it', None,
      'pulls its tentacles in, then lashes them forward in a quick sweeping strike'),
 13: ('The mossy stone lion',
      'the grey stone lion body with cream carved spiral patterns and patches of green moss, the stone lion head with a fierce face, a green eye and '
      'a stone mane, the small pink cherry blossom tree growing on its back behind the saddle, the carved stone tablet on its side, the brown saddle '
      'with gold trim and the gold medallion',
      'dung', ' while the cherry blossoms sway gently',
      'phi', ', its heavy stone paws stomping', None,
      'rears back, then lunges forward and bites with its stone jaws'),
 14: ('The lantern octopus',
      'the purple octopus body with lighter purple spots, the curling purple tentacles, the yellow orange eye, the dark purple dome cap with a gold '
      'rim on its head, the raised tentacle with gold bands holding a small orange lantern, the two small orange lanterns hanging at its side and '
      'the dark purple saddle with gold trim',
      'dung', ' while its tentacles curl and uncurl slowly and the lanterns sway',
      'bo', ', the lanterns swinging', 'tentacles',
      'pulls back, then lashes two tentacles forward in a whip strike'),
 15: ('The cloud deer',
      'the cream white deer body, the tan antlers, the green eye, the blue feathery mane, the big swirly cream cloud around its hind legs and tail, '
      'the blue wispy tail, the blue saddle cloth with gold trim and teal gems, the brown saddle, the gold bell on its chest and the blue hooves',
      'dung', ' while its mane and the swirly cloud drift gently',
      'phi', ', its mane and the swirly cloud streaming behind it and the bell swinging', None,
      'lowers its head, then charges forward and thrusts its antlers in a quick butt'),
 16: ('The crystal spider',
      'the dark purple spider body, the spiky purple legs with lavender crystal tips, the large translucent pink and lavender crystal wings behind it, '
      'the two big curved purple pincers raised at the front, the gold framed lavender gem on its front, the purple saddle with gold trim and the '
      'gold medallion',
      'dung', ' while its crystal wings shift slightly',
      'bo', '', 'legs',
      'rears up, then strikes forward with its two big front pincers'),
}
MATTE = {2: '#ff00ff', 13: '#0000ff'}
CENTER = {8, 9, 12}

IDLE = {'dung': '{s} stands in place in a steady idle stance, breathing slowly so its body rises and falls by one pixel{d}.',
        'bay': '{s} floats in place, gently bobbing up and down by one or two pixels{d}.',
        'ngoi': '{s} sits in place and breathes slowly, its throat puffing in and out and its body rising and falling by one pixel{d}.'}
RUN = {'phi': '{s} runs forward in a fast galloping loop while staying centered in place: its legs reach forward and push back in turn and its body '
              'rises and falls by one or two pixels{d}.',
       'nang': '{s} trots forward in a quick, heavy loop while staying centered in place, stepping its four short legs in turn so its body rises '
               'and falls by one pixel{d}.',
       'lach': '{s} waddles forward in a quick bouncy loop while staying centered in place, stepping its short legs in turn so its body bobs up '
               'and down by one pixel{d}.',
       'boi': '{s} swims forward through the air in a smooth loop while staying centered in place{d}.',
       'nhay': '{s} hops forward in a bouncy loop while staying centered in place: it squashes down, springs up two or three pixels and lands '
               'with a small squash{d}.',
       'chim': '{s} runs forward on its two legs in quick bird-like strides while staying centered in place, its body bobbing slightly{d}.',
       'bo': '{s} scuttles forward in a quick loop while staying centered in place, its {p} reaching and pulling in turn{d}.'}


def keep(f):
    t = f'Keep every detail identical in every frame: {f} stay clearly visible and unchanged in shape and color; nothing disappears or hides behind another part.'
    if any(w in f for w in ('flame', 'fire')): t += ' The flames only sway and flicker, they do not grow or change color.'
    t += ' The saddle stays strapped in the same place on its back and keeps its shape. No new objects or effects appear.'
    return t + ' It faces right and stays centered on the same spot.'


def build():
    out = {}
    for n, (s, f, idle, d, run, rd, p, atk) in M.items():
        k = keep(f); atk, _, no = atk.partition('; ')   # "…; no fire comes out…" thành câu riêng sau đòn
        out[n] = {'matte': MATTE.get(n, '#00ff00'), 'align': 'center' if n in CENTER else None, 'prompts': {
            'dung': IDLE[idle].format(s=s, d=d) + ' ' + k,
            'chay': RUN[run].format(s=s, d=rd, p=p or 'legs') + ' ' + k,
            'danh': f'{s} attacks: it {atk}, then returns exactly to its starting pose. ' + (no[:1].upper() + no[1:] + '. ' if no else '') + k}}
    return out


if __name__ == '__main__':
    out = build()
    json.dump(out, open(D / 'cau-lenh.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(out), 'con,', sum(len(v['prompts']) for v in out.values()), 'chuyển động;', max(len(p) for v in out.values() for p in v['prompts'].values()), 'ký tự dài nhất')
