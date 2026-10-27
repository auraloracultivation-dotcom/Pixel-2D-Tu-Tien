// Nhân vật chính bằng tấm hình (data/heroes.json + data/art.json). Hình gốc nhìn phải, quay trái thì lật gương.
import { spriteImage, drawHitFrame } from './sprites.js';

export function heroLook(game) {
  const H = game.data.heroes;
  return H.list[game.save?.look] || H.list[H.default];
}

// → [tên động tác, số khung trong danh sách]. Đòn đánh chạy hết một lượt rồi mới về đứng/đi.
function anim(game, p, look, t) {
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

// Trả về true nếu đã vẽ bằng hình; false thì nơi gọi vẽ hình khối như cũ.
export function drawHero(ctx, game, p, t, flash) {
  const look = heroLook(game), spr = look.sprite && game.data.art.sprites[look.sprite];
  const im = spr && spriteImage(spr);
  if (!im) return false;
  const [name, i, atk] = anim(game, p, look, t), list = look.anims[name] || look.anims.idle;
  const f = list[i % list.length];
  if (Math.abs(p.face.x) > 0.2) p.lookX = Math.sign(p.face.x);   // chỉ hai hướng: giữ hướng cũ khi đi thẳng lên xuống
  ctx.fillStyle = 'rgba(27,24,48,0.25)';   // bóng dưới chân
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 6, 2.7, 0, 0, Math.PI * 2); ctx.fill();
  // Pixel thật: mỗi điểm ảnh hình = số nguyên điểm màn hình, đặt đúng lưới điểm màn hình.
  // Màn quá nhỏ (dưới 0.75 điểm mỗi điểm ảnh) thì thu nhỏ có làm mịn để khỏi rụng nét.
  const m = ctx.getTransform(), want = game.data.heroes.char_height / look.body * m.d;   // thân cao bằng NPC (data/heroes.json char_height)
  const n = want >= 0.75 ? Math.max(1, Math.round(want)) : want;
  ctx.save();
  const dx = atk != null && look.lunge ? (p.lookX || 1) * look.lunge * Math.sin(Math.PI * atk) : 0;   // đòn đánh: nhún người tới trước rồi lùi về
  ctx.setTransform(n * (p.lookX || 1), 0, 0, n, Math.round(m.a * (p.x + dx) + m.e), Math.round(m.d * p.y + m.f));
  ctx.imageSmoothingEnabled = n < 0.75;
  drawHitFrame(ctx, spr, im, f, flash ? Math.min(1, p.flash / 0.12) : 0);
  ctx.restore();
  return true;
}
