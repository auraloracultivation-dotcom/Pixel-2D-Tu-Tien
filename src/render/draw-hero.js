// Nhân vật chính bằng tấm hình (data/heroes.json + data/art.json). Hình gốc nhìn phải, quay trái thì lật gương.
import { spriteImage, drawHitFrame } from './sprites.js';
import { strikeLean } from '../game/flyweapon.js';

// Hình nhân vật: bộ thời trang đang mặc có hình chibi hero.y-<bộ>-<nam|nu> thì dùng hình đó và động tác chibi (data/heroes.json chibi),
// chưa có thì hình gốc của nhân vật
// save: bản lưu của người được vẽ (mặc định người chơi; bản sao so tài truyền bản lưu hồ sơ người kia, game/duel.js)
export const outfitSprite = (game, key, save = game.save) => `hero.y-${save?.outfit || 'dong-phuc'}-${key}`;
export function heroLook(game, save = game.save) {
  const H = game.data.heroes, key = H.list[save?.look] ? save.look : H.default, base = H.list[key], id = outfitSprite(game, key, save);
  if (game.data.fashion.list[save?.outfit]?.sprite === 'goc') return base;   // bộ mặc hình gốc của nhân vật (data/fashion.json)
  return H.chibi && game.data.art.sprites[id] ? { ...base, ...H.chibi, sprite: id } : base;
}

// → [tên động tác, số khung trong danh sách]. Đòn đánh chạy hết một lượt rồi mới về đứng/đi.
function anim(game, p, look, t) {
  const walkName = p.moving && !p.meditating && !p.riding ? 'walk' : 'idle';
  if (game.data.heroes.fly) {   // ngự kiếm: động tác đánh do flyweapon.js chọn (p.heroAnim), chạy cùng lúc vũ khí bay lao ra
    const ha = p.heroAnim, list = ha && look.anims[ha.name];
    if (list) {
      const i = Math.floor((game.time - ha.t0) * look.fps[ha.name]);
      if (i >= 0 && i < list.length) return [ha.name, i, i / list.length, true];
      p.heroAnim = null;
    }
    const k = p === game.player ? strikeLean(game) : null, cast = look.anims.cast;   // vũ khí bay chỉ người chơi có   // nhân vật chưa có động tác đánh: chạy vận lực (cast) nếu có, không thì nhún nhẹ
    if (k != null && cast) return ['cast', Math.min(cast.length - 1, Math.floor(k * cast.length)), k];
    return [walkName, Math.floor(t * (look.fps[walkName] || 1)), k ?? undefined];
  }
  if (p.swingT > (p.heroSw ?? 0) && look.attacks?.length) {   // vừa vung đòn mới: ra đòn kế tiếp trong chuỗi
    const fresh = t - (p.heroAtkLast ?? -99) > (game.data.heroes.combo_reset || 1.2);   // nghỉ lâu thì về đòn đầu
    p.heroAtkN = fresh ? 0 : ((p.heroAtkN ?? -1) + 1) % look.attacks.length;
    p.heroAtk0 = p.heroAtkLast = t;
  }
  p.heroSw = p.swingT;
  if (p.heroAtk0 != null) {
    const name = look.attacks[p.heroAtkN % look.attacks.length], i = Math.floor((t - p.heroAtk0) * look.fps[name]);
    if (i >= 0 && i < look.anims[name].length) return [name, i, i / look.anims[name].length];
    p.heroAtk0 = null;
  }
  const name = p.moving && !p.meditating && !p.riding ? 'walk' : 'idle';   // cưỡi thú: đứng yên trên lưng thú, không bước chân
  return [name, Math.floor(t * (look.fps[name] || 1))];
}

// Dáng thân theo kiểu đòn của vũ khí bay (chủ dự án 30/10/2026: "kiếm cũng chém nhiều hướng, chiêu không thể một chiêu"):
// hình chibi chỉ có một cặp khung đánh, nên mỗi kiểu đòn cho thân chuyển động riêng bằng dời và nén hình (không xoay, giữ điểm ảnh vuông).
// k: tiến độ đòn 0 → 1 (flyweapon.js strikeLean). Trả về dời ngang dx (về phía trước), dời dọc dy (âm là lên), nén sx, sy, lật flip.
const ease = k => (k < 0 ? 0 : k > 1 ? 1 : 1 - (1 - k) * (1 - k));
const bump = (k, a, b) => (k <= a || k >= b ? 0 : Math.sin(Math.PI * (k - a) / (b - a)));
export function strikePose(move, k) {
  const P = { dx: 0, dy: 0, sx: 1, sy: 1, flip: 1 };
  if (k == null) return P;
  if (move === 'bo') {   // bổ: bật lên cao rồi đập xuống, nén khi chạm đất
    P.dy = -7 * bump(k, 0, 0.55); const hit = bump(k, 0.5, 0.75); P.sy = 1 - 0.14 * hit; P.sx = 1 + 0.12 * hit; P.dx = 2 * ease(k / 0.6);
  } else if (move === 'hat') {   // hất: khom xuống lấy đà rồi vút lên, duỗi người
    const crouch = bump(k, 0, 0.35), rise = bump(k, 0.3, 0.8);
    P.sy = 1 - 0.14 * crouch + 0.1 * rise; P.sx = 1 + 0.08 * crouch; P.dy = -5 * rise; P.dx = 2 * rise;
  } else if (move === 'xoay') {   // xoay: xoay người một vòng (lật mặt hai lần), nhấc nhẹ khỏi đất
    P.flip = k < 0.15 || k > 0.65 ? 1 : (Math.floor((k - 0.15) / 0.125) % 2 ? 1 : -1); P.dy = -3 * bump(k, 0.1, 0.7);
  } else if (move === 'moc') {   // móc: hạ thấp sát đất, trượt tới
    const low = bump(k, 0.1, 0.9); P.sy = 1 - 0.16 * low; P.sx = 1 + 0.1 * low; P.dx = 4 * low;
  } else if (move === 'dam') {   // đâm: lao người tới trước thật nhanh
    P.dx = 6 * bump(k, 0.15, 0.85); P.sx = 1 + 0.08 * bump(k, 0.3, 0.6);
  } else {   // quét ngang (quet) và còn lại: lướt tới, ngả người
    P.dx = 4 * bump(k, 0.1, 0.9); P.sy = 1 - 0.06 * bump(k, 0.35, 0.7);
  }
  return P;
}

// Bề ngang so với NPC theo kg/cm² (căn bậc hai cho đỡ gắt); lệch dưới 10% thì 1 cho khỏi méo vì lệch nhỏ
function build(H, look) {
  if (!look.kg || !look.cm) return 1;
  const r = Math.sqrt((look.kg / look.cm ** 2) / (H.npc_kg / H.npc_cm ** 2));
  return Math.abs(r - 1) < 0.1 ? 1 : r;
}

// Trả về true nếu đã vẽ bằng hình; false thì nơi gọi vẽ hình khối như cũ.
export function drawHero(ctx, game, p, t, flash, save = game.save) {
  const look = heroLook(game, save), spr = look.sprite && game.data.art.sprites[look.sprite];
  const im = spr && spriteImage(spr);
  if (!im) return false;
  const [name, i, atk, own] = anim(game, p, look, t), list = look.anims[name] || look.anims.idle;
  const f = list[i % list.length];
  if (Math.abs(p.face.x) > 0.2) p.lookX = Math.sign(p.face.x);   // chỉ hai hướng: giữ hướng cũ khi đi thẳng lên xuống
  ctx.fillStyle = 'rgba(27,24,48,0.25)';   // bóng dưới chân
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 6, 2.7, 0, 0, Math.PI * 2); ctx.fill();
  // Pixel thật: mỗi điểm ảnh hình = số nguyên điểm màn hình, đặt đúng lưới điểm màn hình.
  // Màn quá nhỏ (dưới 0.75 điểm mỗi điểm ảnh) thì thu nhỏ có làm mịn để khỏi rụng nét.
  // Cỡ theo chỉ số (data/heroes.json): làm tròn cỡ người chuẩn NPC trước, rồi nhân đúng tỉ lệ cm / npc_cm và bề ngang,
  // để 1m75 vẫn thấp hơn NPC một xíu dù làm tròn (lệch vài phần trăm, điểm ảnh gần như vẫn vuông)
  const H = game.data.heroes, m = ctx.getTransform(), want = H.char_height / look.body * m.d;
  p.top = H.char_height * (look.cm || H.npc_cm) / H.npc_cm;   // cao thân (đơn vị bản đồ): danh hiệu đặt trên đầu theo số này
  const n0 = want >= 0.75 ? Math.max(1, Math.round(want)) : want, n = n0 * (look.cm || H.npc_cm) / H.npc_cm, wide = build(H, look);
  ctx.save();
  const fly = game.data.heroes.fly, lunge = fly && !own ? fly.lean : look.lunge;   // động tác đánh của nhân vật: nhún như cũ; không có thì nhún nhẹ vận lực
  const dx = atk != null && lunge ? (p.lookX || 1) * lunge * Math.sin(Math.PI * atk) : 0;   // đòn đánh: nhún người tới trước rồi lùi về
  const breath = look.breath && name === 'idle' && Math.sin(t * 2.2) > 0.55 ? n : 0;   // chibi đứng: thở nhún 1 điểm ảnh
  const P = look.breath && p === game.player && !own ? strikePose(p.fw?.act?.move, atk) : strikePose(null, null);   // chibi: dáng thân theo kiểu đòn
  const side = (p.lookX || 1) * P.flip, px = p.x + dx + (p.lookX || 1) * P.dx;
  ctx.setTransform(n * wide * side * P.sx, 0, 0, n * P.sy, Math.round(m.a * px + m.e), Math.round(m.d * (p.y + P.dy) + m.f - breath));
  ctx.imageSmoothingEnabled = n0 < 0.75;
  drawHitFrame(ctx, spr, im, f, flash ? Math.min(1, p.flash / 0.12) : 0);
  ctx.restore();
  return true;
}
