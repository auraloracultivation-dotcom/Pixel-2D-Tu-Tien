// Nhân vật chính bằng tấm hình (data/heroes.json + data/art.json). Hình gốc nhìn phải, quay trái thì lật gương.
import { spriteImage } from './sprites.js';

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
    if (i >= 0 && i < look.anims[name].length) return [name, i];
    p.heroAtk0 = null;
  }
  const name = p.moving && !p.meditating ? 'walk' : 'idle';
  return [name, Math.floor(t * (look.fps[name] || 1))];
}

// Trả về true nếu đã vẽ bằng hình; false thì nơi gọi vẽ hình khối như cũ.
export function drawHero(ctx, game, p, t, flash) {
  const look = heroLook(game), spr = look.sprite && game.data.art.sprites[look.sprite];
  const im = spr && spriteImage(spr);
  if (!im) return false;
  const [name, i] = anim(game, p, look, t), list = look.anims[name] || look.anims.idle;
  const f = list[i % list.length];
  if (Math.abs(p.face.x) > 0.2) p.lookX = Math.sign(p.face.x);   // chỉ hai hướng: giữ hướng cũ khi đi thẳng lên xuống
  ctx.fillStyle = 'rgba(27,24,48,0.25)';   // bóng dưới chân
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 6, 2.7, 0, 0, Math.PI * 2); ctx.fill();
  // Pixel thật: mỗi điểm ảnh hình = số nguyên điểm màn hình, đặt đúng lưới điểm màn hình.
  // Màn quá nhỏ (dưới 0.75 điểm mỗi điểm ảnh) thì thu nhỏ có làm mịn để khỏi rụng nét.
  const m = ctx.getTransform(), want = look.height / spr.h * m.d;
  const n = want >= 0.75 && !look.still ? Math.max(1, Math.round(want)) : want;   // hình tĩnh: giữ đúng chiều cao, không làm tròn
  ctx.save();
  ctx.setTransform(n * (p.lookX || 1), 0, 0, n, Math.round(m.a * p.x + m.e), Math.round(m.d * p.y + m.f));
  ctx.imageSmoothingEnabled = n < 1;
  if (flash) ctx.filter = 'brightness(3)';
  const [bx, by] = look.still ? bob(p, t, spr.h) : [0, 0];
  ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, bx - spr.anchor[0], by - spr.anchor[1], spr.w, spr.h);
  ctx.restore();
  if (look.weapon) drawHeld(ctx, game, p, look);
  return true;
}

// Hình tĩnh (chưa có chuyển động): thở nhẹ khi đứng, nảy khi đi, nhào tới khi đánh. Tính bằng điểm ảnh hình, số nguyên.
function bob(p, t, h) {
  const u = Math.max(1, Math.round(h / 48));   // hình càng nhiều điểm ảnh thì nhún càng nhiều điểm
  if (p.swingT > 0) return [2 * u, 0];
  if (p.moving && !p.meditating) return [0, -Math.round(Math.abs(Math.sin(t * 9)) * 2 * u)];
  return [0, Math.sin(t * 2.4) > 0.3 ? -u : 0];
}

// Vũ khí cầm tay (heroes.json weapon: [mục art, khung], hình vẽ chéo cán xuống trái): đứng thì cầm nghiêng,
// đánh thì vung một vòng theo thời gian vung đòn (swingT 0.18 → 0).
function drawHeld(ctx, game, p, look) {
  const [id, frame] = look.weapon, spr = game.data.art.sprites[id], im = spr && spriteImage(spr);
  if (!im) return;
  const dir = p.lookX || 1, k = p.swingT > 0 ? 1 - p.swingT / 0.18 : -1;
  const rot = k >= 0 ? -1.3 + k * 2.4 : 0.15;
  const s = (look.weapon_size || 15) / spr.h;
  ctx.save();
  ctx.translate(p.x + dir * 6, p.y - 7);
  ctx.scale(dir * s, s);
  ctx.rotate(rot);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, frame * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
}
