"""Câu lệnh SpriteCook cho quái #4–60 (theo docs/02-CHUAN-PIXEL.md: tả chuyển động + liệt kê đủ đặc điểm,
đứng tại chỗ, đòn đánh kết thúc đúng dáng đứng, khói/lửa chỉ lay động, con nhiều phần thì không phần nào bị che).
Con bay, lướt (bay/luot): chỉ đứng + công kích (chủ dự án duyệt đề xuất 16/11 13:27). Ra prompts.json."""
import json, sys

F = 'right'; V = 'viewer'
# n: (chủ thể, đặc điểm, hướng, chi tiết lúc đứng, đòn công kích, phần bò/trườn hoặc None)
M = {
 4: ('The small wooden forest sprite', 'the tan wooden head shaped like an open hand with finger-like twigs, the glowing green eye, the bushy green leaf crown with two white flowers, the leafy green body and the two short curled wooden arms', V,
     'while its leaves rustle softly', 'leans back, then swings one curled wooden arm forward in a quick slap', None),
 5: ('The fire wolf', 'the dark maroon wolf body, the orange and yellow flames along its back, the flaming tail, the glowing orange eye and the pointed ears', F,
     'while the flames on its back and tail flicker', 'crouches back, then lunges forward and snaps its jaws in a quick bite', None),
 6: ('The little fire spirit', 'the red mask-like face with two glowing yellow eyes, the orange and yellow flame on top of its head, the brown ring circling around it and the small brown rock fragments floating around it', V,
     'while its head flame flickers and the rock fragments drift slightly', 'pulls back, then pushes forward in a quick headbutt while its flame leans forward', None),
 7: ('The cursed demon sword', 'the dark curved blade with red streaks and a white cutting edge, the tan crossguard, the red wrapped grip with a tan pommel and the loop of brown prayer beads around it', V,
     'while the prayer beads sway slightly', 'tilts back to wind up, then swings itself forward in one fast diagonal slash', None),
 8: ('The hooded purple mage', 'the purple hood with two dark red horns, the pale face with two red eyes, the purple robe, the wooden staff topped with a glowing purple orb and the lavender flames beside it', V,
     'while the lavender flames flicker and the orb glows', 'raises the staff so the purple orb glows brighter, then thrusts the staff forward as if casting a spell; no projectile appears', None),
 9: ('The white blood wolf', 'the white wolf head with a red eye and sharp fangs, the white fur body with a dark maroon underside and the long flowing crimson mane and tail', F,
     'while its crimson mane and tail ripple', 'rears back, then lunges forward and bites hard with its jaws wide open', None),
 10: ('The ice wolf', 'the white fluffy wolf body, the light blue ice crystal spikes on its back, the blue legs and tail tip, the cyan eye and the small ice crystal floating near its tail', F,
     'while the floating ice crystal bobs', 'crouches back, then lunges forward and snaps its jaws in a quick bite', None),
 11: ('The ice crystal spirit', 'the large light blue crystal body with glowing white eyes, the light blue ring circling its middle and the small ice shards floating around it', V,
     'while the ring slowly turns and the ice shards drift', 'pulls back, then pushes forward in a quick bump while the ice shards spin closer', None),
 12: ('The icy ghost archer', 'the pale blue ghost head with dark eye holes, the wispy pale blue smoke body, the long arrow with a cyan ice arrowhead held in its grip and the small ice shards floating around it', F,
     'while its smoke tails wave softly and it holds the arrow steady', 'pulls the arrow back toward its body to wind up, then thrusts it sharply forward in a quick jab; the arrow never leaves its grip and stays whole', None),
 13: ('The ice demon guard', 'the dark blue helmet with two light blue horns, the glowing cyan eyes, the light blue ice crystal armor and shoulder spikes, the dark blue body and the long spear with an ice blade', V,
     'while it grips the spear upright', 'pulls the spear back, then thrusts it forward in a strong stab', None),
 14: ('The ice demon general', 'the dark blue helmet with two light blue horns and glowing cyan eyes, the thick white fur mantle, the ice blue armor plates and the two cyan ghost flames at its shoulders', V,
     'while the two ghost flames flicker', 'raises both arms high, then slams them down forward in a heavy strike', None),
 15: ('The wind spirit dragon riding a cloud', 'the white dragon head with a cyan eye and long swept-back horns, the swirling white cloud body and the mint green wind streaks around it', F,
     'while the cloud slowly swirls and the wind streaks drift around it', 'rears its head back, then lunges forward and bites while the wind streaks whirl', None),
 16: ('The dark butterfly fairy', 'the two bright purple butterfly wings with dark veins, the white face with glowing purple eyes, the dark curled antennae and hair, the white and purple dress and the small purple crystal shards floating below', V,
     'while its wings flap slowly', 'beats its wings hard and leans forward with both hands out as if casting a spell; no projectile appears', None),
 17: ('The wind ghost guard', 'the white mask with dark eye holes, the swirling pale blue wind wisps forming its body and the dark purple lower robe', F,
     'while its wind wisps swirl', 'pulls back, then lunges forward in a swirling strike', None),
 18: ('The dark wind lord', 'the cream bone mask with two big curved horns and glowing purple eyes, the dark purple cloak and the black smoky wisps around its head', V,
     'while the black smoke wisps sway', 'rises up, then sweeps its dark cloak forward in a wide heavy strike', None),
 19: ('The flower dryad', 'the big pink flower on its head, the green leafy hair, the pale face with green eyes and the white root body', V,
     'while its leaves sway', 'leans back, then whips its leafy hair forward in a quick strike', None),
 20: ('The carnivorous vine plant', 'the magenta flytrap head with yellow-green jagged teeth, the dark twisting vines and the green leaves', F,
     'while the flytrap head sways and the jaws open and close slightly', 'pulls the flytrap head back, then lunges it forward and snaps the jaws open wide; no projectile appears', 'dark twisting vines'),
 21: ('The ghost detective', 'the purple wide-brimmed hat with a tan clover badge, the pale face with a round gold monocle, the dark purple coat, the magnifying glass, the small lantern and the curling pipe smoke', V,
     'while the pipe smoke curls and the lantern sways', 'raises the magnifying glass, then swings it forward in a quick strike', None),
 22: ('The tree guard', 'the brown wooden body with bark texture, the green leaf crown on its head and shoulders, the glowing green eyes and the two gray stone fists', V,
     'while its leaves rustle', 'pulls one stone fist back, then punches forward hard', None),
 23: ('The flower demon queen', 'the gold crown, the large pink flower petals around her head, the white face with magenta eyes, the green vine hair and the pink petal skirt', V,
     'while her petals and vines sway', 'spreads her petals wide, then lashes her green vines forward in a sweeping strike', None),
 24: ('The dark seed sprout', 'the round dark purple seed body with a cream hood and glowing pink eyes, the green sprout on top, the green leaves at its base and the pink berries', V,
     'while the sprout on top sways', 'leans back, then springs forward in a quick headbutt', None),
 25: ('The root demon', 'the tangled brown roots forming its body, the dark face hollow with two glowing yellow eyes and the small floating seed particles', V,
     'while its roots slowly writhe', 'pulls its roots back, then whips them forward; no projectile appears', 'tangled brown roots'),
 26: ('The thorn demon guard', 'the dark purple body wrapped in green thorny vines, the pink thorn spikes, the purple horned head and the glowing yellow eyes', V,
     'while its thorny vines sway', 'pulls its thorny arm back, then slashes forward', None),
 27: ('The dark lotus demon', 'the large dark purple lotus petals, the gold crescent at its top, the dark face with two glowing yellow eyes and the purple tentacle roots', V,
     'while its tentacle roots sway', 'opens its petals wide, then lashes its tentacle roots forward', 'purple tentacle roots'),
 28: ('The golden horned beetle', 'the golden armored shell with spiky plates, the two big curved golden horns, the dark head with glowing yellow eyes and the dark mandible', F,
     'while its spiky plates shift slightly', 'pulls back, then rams forward with its horns', 'six short legs'),
 29: ('The sand ghost', 'the tan sand body flowing like cloth, the pointed sand hood, the dark face hollow with two glowing yellow eyes and the floating sand particles', V,
     'while its sand body ripples and the particles drift', 'raises one sandy arm, then flings it forward as if throwing sand; no projectile appears', None),
 30: ('The sword spirit', 'the light blue sword blade pointing down, the white and gold crossguard with a small dark face, the purple cloth sash wrapped around it and the cyan ghost flames around it', V,
     'while the sash flutters and the cyan flames flicker', 'rises up, then stabs downward and forward in one fast thrust', None),
 31: ('The golden armored guard', 'the golden armor plates, the golden ring behind its head, the dark face with glowing yellow eyes and the claw-like golden gauntlets', V,
     'while it flexes its claws', 'pulls one clawed gauntlet back, then swipes forward', None),
 32: ('The sword demon general', 'the white horned mask with a red eye, the fan of many silver swords with gold hilts behind its back, the red and black cape and the gold trim', V,
     'while its cape sways', 'spreads its fan of swords wider, then thrusts forward in a heavy strike while every sword stays in place', None),
 33: ('The mossy rock golem', 'the round body made of gray boulders, the mossy green crystal spikes on its back and the small face with two yellow eyes', F,
     'while it sits heavily', 'leans back, then slams forward in a heavy body bump', None),
 34: ('The lava rock serpent', 'the gray rock serpent body coiled in an S shape, the glowing orange lava cracks, the rocky spikes along its back and the glowing orange eye', F,
     'while its coils shift slightly', 'rears its head back, then strikes forward with its mouth open; no projectile appears', 'coiled rock body'),
 35: ('The rock bat', 'the two gray stone wings with orange lava cracks, the round gray rock body with glowing orange eyes, the stone spike on its head and the small stone hanging below', V,
     'while its stone wings flap slowly', 'pulls its wings up, then dives forward in a quick strike', None),
 36: ('The stone demon guard', 'the gray stone body with an orange swirl rune on its chest, the glowing orange eyes, the rocky head crest and the big stone shield with an orange rune', V,
     'while it holds its shield ready', 'pulls the stone shield back, then bashes forward with it', None),
 37: ('The mountain-breaker stone general', 'the dark stone body with light orange crack lines, the two curved tan horns, the glowing orange eyes and the two huge stone fists', V,
     'while it stands heavily', 'raises both stone fists high, then brings them down forward in a heavy punch', None),
 38: ('The void orb demon', 'the black void orb with a glowing purple rim, the purple ring circling it, the dark purple smoke wisps and the small dark shards floating around it', V,
     'while the ring slowly turns and the smoke wisps sway', 'pulls back as its purple rim glows brighter, then lunges forward', None),
 39: ('The netherworld mage', 'the dark gray witch hat with gold stitching and a hanging charm, the pale skull face, the tattered dark robe and the staff topped with a purple flame', V,
     'while the purple flame on its staff flickers', 'raises the staff, then points it forward as if casting a spell; no projectile appears', None),
 40: ('The void phantom', 'the lavender hooded phantom with a dark face hollow and one glowing eye, the flowing lavender robe streaks and the small lavender crystals floating around it', F,
     'while its robe streaks flow', 'pulls back, then lunges forward in a quick strike', None),
 41: ('The netherworld guard', 'the dark gray hood with purple flames, the dark face with glowing blue eyes, the tattered gray robe and the spear with a pale blade', V,
     'while the purple flames on its hood flicker', 'pulls the spear back, then thrusts it forward in a strong stab', None),
 42: ('The void prison lord', 'the stone frame with purple crystal spikes, the glowing purple void eye in its center, the hanging blue chains and the lavender crystal pendants', V,
     'while the chains and crystal pendants sway', 'pulls back as the void eye glows brighter, then swings its chains forward', None),
 43: ('The demon sovereign', 'the white skull mask with a gold crown, the two pairs of big curved horns, one dark and one gold, the glowing purple gem on the chest, the gold shoulder plates and the long dark red cape', V,
     'while its long cape sways', 'spreads its arms and cape wide, then thrusts forward in a heavy strike', None),
 44: ('The heart demon', 'the white face with red eyes, the black and purple smoke hair and body and the four glowing red diamond crystals floating around it', V,
     'while its smoke hair sways and the four red crystals bob', 'pulls back, then lunges forward while the four red crystals stay around it', None),
 45: ('The spirit crystal sprite', 'the light blue round body with blue eyes, the purple crystal cluster on its head, the curled tail and the floating purple and blue crystals', V,
     'while the floating crystals bob', 'leans back, then springs forward in a quick headbutt', None),
 46: ('The spirit herb sprite', 'the pink lotus flower on its head, the green leafy hair, the pale face with dark eyes, the leafy green body and the round green bud hands', V,
     'while its leaves sway', 'swings both vine arms forward in a quick slap', None),
 47: ('The little snow yeti', 'the round white snow body, the blue eyes, the orange carrot nose, the dark red scarf and the blue ice spikes on its back and hands', V,
     'while its scarf ends flutter', 'raises one icy hand, then swipes forward', None),
 48: ('The pumpkin witch', 'the orange pumpkin head with a carved grin, the dark purple witch hat with an orange band, the green leaves and the curling vines', V,
     'while the hat tip and vines sway', 'leans back, then lunges forward and chomps with its carved mouth', None),
 49: ('The wood dragon king', 'the long cream serpent dragon body, the green vine and leaf coils, the branching wooden antlers, the glowing green eye and the pale pink lotus flower', F,
     'while its vines and leaves sway', 'rears its head back, then strikes forward and bites', 'serpent body'),
 50: ('The fire wolf king', 'the dark red body with molten orange cracks, the two white curved horns, the glowing yellow eye, the cream fangs, the flames along its back and tail and the floating flame wisp', F,
     'while the flames on its back and tail flicker', 'crouches back, then lunges forward and bites with its fangs bared', None),
 51: ('The ice wolf king', 'the white fluffy wolf body, the large light blue ice crystal spikes on its back and tail, the glowing blue eye and the blue-tipped legs', F,
     'while its fur ripples', 'crouches back, then lunges forward and bites', None),
 52: ('The wind spirit king', 'the dark round face with two glowing yellow eyes, the white cloud body and hood, the blue wind wisps, the gold rings circling it and the gold collar', F,
     'while the gold rings slowly turn and the cloud swirls', 'pulls back, then lunges forward in a swirling strike', None),
 53: ('The ancient tree king', 'the large green leafy canopy, the brown trunk with a face, the two glowing green eyes, the yellow gem on the forehead, the white root beard and the green root feet', V,
     'while its leafy canopy sways', 'raises its branch arms, then swings them down forward in a heavy strike', 'green root feet'),
 54: ('The golden beetle king', 'the golden spiked armor plates, the huge curved golden horn, the dark head with a glowing yellow eye and the white translucent wings', F,
     'while its white wings buzz slowly', 'pulls back, then charges forward horn first', None),
 55: ('The stone armored beast', 'the dark stone shell with golden yellow cracks, the gray stone spikes with golden tips on its back, the gold horn, the glowing orange eye and the stubby stone legs with yellow claws', F,
     'while it breathes heavily', 'pulls back, then charges forward head first', None),
 56: ('The void whale beast', 'the dark purple whale body with a lavender belly, the glowing white eye, the purple halo ring above its head, the purple tentacle fins and the small dark sparkles', F,
     'while its tentacle fins sway and the sparkles twinkle', 'pulls back, then lunges forward and bites', None),
 57: ('The skeletal blood wolf', 'the white wolf skull with a red eye, the white ribcage and bone legs, the dark maroon smoky body and the flowing crimson mane', F,
     'while its crimson mane ripples', 'rears back, then lunges forward and bites with the skull jaws open wide', None),
 58: ('The ice general ghost', 'the pale blue spiked horned crown, the dark face with glowing cyan eyes, the white skull on its shoulder, the tattered blue ghostly robe and the cyan ghost flames', V,
     'while the cyan flames flicker and the robe sways', 'raises its arms, then sweeps forward in a heavy strike', None),
 59: ('The dark wind lord ghost', 'the wide dark purple hat with a gold rim and gold emblem, the glowing magenta eyes, the dark purple tentacle-like robe, the gold ring on its chest and the purple smoke wisps', V,
     'while its tentacle robe and smoke wisps sway', 'pulls back, then lashes its tentacle robe forward', None),
 60: ('The flower queen ghost', 'the coral pink flower petals with yellow centers on its head, the green leaf hood, the pale face with magenta eyes, the green vine tendrils and the cream body', V,
     'while her vine tendrils sway', 'pulls back, then lashes her vine tendrils forward', None),
}

IDLE = {'bay': '{s} floats in place, gently bobbing up and down by one or two pixels {d}.',
        'luot': '{s} hovers just above the ground in place, swaying gently {d}.',
        'chan': '{s} stands in place in a steady idle stance, breathing slowly so its body rises and falls by one pixel {d}.',
        'nay': '{s} sits in place and breathes with a soft squash and stretch, squishing down and back up by one or two pixels {d}.',
        'bo': '{s} rests in place {d}.'}
MOVE = {'chan': '{s} walks forward in a steady walking loop, stepping its legs in turn, while staying centered in place.',
        'nay': '{s} hops forward in a bouncy loop while staying centered in place: it squashes down, springs up one or two pixels and lands with a small squash.',
        'bo': '{s} crawls forward in a loop while staying centered in place, its {p} rippling and pulling in turn.'}

FIRE = ('flame', 'fire')
SMOKE = ('smoke', 'smoky')

def keep(f, facing):
    # Chỉ nhắc đúng thứ con đó CÓ. Nhắc chữ "flames" cho con không có lửa thì SpriteCook vẽ thêm lửa:
    # #4, #7 (không lửa không khói) mọc lửa; #21 (chỉ có khói tẩu xanh) khói hoá lửa cam.
    t = f'Keep every detail identical in every frame: {f} stay clearly visible and unchanged in shape and color; nothing disappears or hides behind another part.'
    fire, smoke = any(w in f for w in FIRE), any(w in f for w in SMOKE)
    if fire and smoke: t += ' The smoke and flames only sway and flicker, they do not grow or change color.'
    elif fire: t += ' The flames only sway and flicker, they do not grow or change color.'
    elif smoke: t += ' The smoke only drifts and curls gently and keeps exactly the same colors. No new objects or effects appear.'
    else: t += ' No new objects or effects appear.'
    return t + (' It faces right and stays centered on the same spot.' if facing == F else ' It faces the viewer and stays centered on the same spot.')

def build(mons):
    out = {}
    for m in mons:
        n = m['n']
        if n not in M: continue
        s, f, facing, d, atk, crawl = M[n]; mv = m['mv']
        if n == 49: mv = 'bo'   # bản thêm #61 là rồng trườn, không có chân
        p = {'dung': IDLE[mv].format(s=s, d=d) + ' ' + keep(f, facing)}
        if mv in MOVE: p['di'] = MOVE[mv].format(s=s, p=crawl or 'body') + ' ' + keep(f, facing)
        p['danh'] = f'{s} attacks: it {atk}, then returns exactly to its starting pose. ' + keep(f, facing)
        out[n] = {'mv': mv, 'prompts': p}
    return out

if __name__ == '__main__':
    d = json.load(open(sys.argv[1]))
    out = build(d['mons'])
    json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
    print(len(out), 'con,', sum(len(v['prompts']) for v in out.values()), 'chuyển động')
