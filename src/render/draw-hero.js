// Nhân vật chính bằng tấm hình (data/heroes.json + data/art.json). Hình gốc nhìn phải, quay trái thì lật gương.
import { spriteImage, drawHitFrame } from './sprites.js';
import { strikeLean } from '../game/flyweapon.js';

// Hình nhân vật: bộ thời trang đang mặc có hình chibi hero.y-<bộ>-<nam|nu> thì dùng hình đó và động tác chibi (data/heroes.json chibi),
// chưa có thì hình gốc của nhân vật
export const outfitSprite = (game, key) => `hero.y-${game.save?.outfit || 'dong-phuc'}-${key}`;
export function heroLook(game) {
  const H = game.data.heroes, key = H.list[game.save?.look] ? game.save.look : H.default, base = H.list[key], id = outfitSprite(game, key);
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
    const k = strikeLean(game), cast = look.anims.cast;   // nhân vật chưa có động tác đánh: chạy vận lực (cast) nếu có, không thì nhún nhẹ
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

// Bề ngang so với NPC theo kg/cm² (căn bậc hai cho đỡ gắt); lệch dưới 10% thì 1 cho khỏi méo vì lệch nhỏ
function build(H, look) {
  if (!look.kg || !look.cm) return 1;
  const r = Math.sqrt((look.kg / look.cm ** 2) / (H.npc_kg / H.npc_cm ** 2));
  return Math.abs(r - 1) < 0.1 ? 1 : r;
}

// Trả về true nếu đã vẽ bằng hình; false thì nơi gọi vẽ hình khối như cũ.
export function drawHero(ctx, game, p, t, flash) {
  const look = heroLook(game), spr = look.sprite && game.data.art.sprites[look.sprite];
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
  ctx.setTransform(n * wide * (p.lookX || 1), 0, 0, n, Math.round(m.a * (p.x + dx) + m.e), Math.round(m.d * p.y + m.f - breath));
  ctx.imageSmoothingEnabled = n0 < 0.75;
  drawHitFrame(ctx, spr, im, f, flash ? Math.min(1, p.flash / 0.12) : 0);
  ctx.restore();
  return true;
}
