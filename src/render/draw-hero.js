// Nhân vật chính bằng tấm hình (data/heroes.json + data/art.json). Hình gốc nhìn phải, quay trái thì lật gương.
const imgs = {};

function image(file) {
  if (!imgs[file]) { const im = new Image(); im.src = file; imgs[file] = im; }
  return imgs[file].complete && imgs[file].naturalWidth ? imgs[file] : null;
}

export function heroLook(game) {
  const H = game.data.heroes;
  return H.list[game.save?.look] || H.list[H.default];
}

// → [tên động tác, số khung trong danh sách]. Đòn đánh chạy hết một lượt rồi mới về đứng/đi.
function anim(p, look, t) {
  if (p.swingT > (p.heroSw ?? 0) && look.attacks?.length) {   // vừa vung đòn mới: đổi động tác đánh
    p.heroAtkN = ((p.heroAtkN ?? -1) + 1) % look.attacks.length;
    p.heroAtk0 = t;
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
  const im = spr && image(spr.file);
  if (!im) return false;
  const [name, i] = anim(p, look, t), list = look.anims[name] || look.anims.idle;
  const f = list[i % list.length];
  if (Math.abs(p.face.x) > 0.2) p.lookX = Math.sign(p.face.x);   // chỉ hai hướng: giữ hướng cũ khi đi thẳng lên xuống
  const k = look.height / spr.h, bob = name === 'idle' ? Math.round(Math.sin(t * 2.5) * (look.bob || 0) * 2) / 2 : 0;
  ctx.fillStyle = 'rgba(27,24,48,0.25)';   // bóng dưới chân
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 6, 2.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y - bob);
  ctx.scale((p.lookX || 1) * k, k);
  ctx.imageSmoothingEnabled = false;
  if (flash) ctx.filter = 'brightness(3)';
  ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
  return true;
}
