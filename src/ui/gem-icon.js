// Hình ngọc khảm theo loại và cấp (data/art.json gem.<loại>-<cấp>, tools/art/gems_ai.py): canvas phóng nguyên lần, pixelated.
// Cấp cao có khung động (vệt sáng, sao lấp lánh, hào quang): tự chạy khi ô còn trên màn hình, tự dừng khi bị gỡ.
import { spriteImage } from '../render/sprites.js';

const FPS = 7, MOVE_FROM = 6;   // cấp 6 trở lên mới có khung động (data gems_ai: vệt sáng từ cấp 6)

export function gemIcon(game, key, size = 28, cls = 'gem-ico') {
  const [type, lv] = key.split(':'), spr = game.data.art.sprites[`gem.${type}-${lv}`];
  const cv = document.createElement('canvas');
  cv.className = cls;
  if (!spr) return cv;
  cv.width = spr.w; cv.height = spr.h;
  const k = size >= spr.w ? Math.floor(size / spr.w) : size / spr.w;   // to: phóng nguyên lần; nhỏ (ô khảm, hồ sơ): thu lại
  cv.style.width = spr.w * k + 'px'; cv.style.height = spr.h * k + 'px';
  const ctx = cv.getContext('2d');
  const draw = f => { const im = spriteImage(spr); if (!im) return false; ctx.clearRect(0, 0, spr.w, spr.h); ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, 0, 0, spr.w, spr.h); return true; };
  let f = 0, tries = 0;
  const id = setInterval(() => {
    if (tries > 4 && !cv.isConnected) return clearInterval(id);   // ô đã bị vẽ lại / đóng bảng
    tries++;
    if (!draw(f)) return;
    if (Number(lv) < MOVE_FROM) return clearInterval(id);
    f = (f + 1) % spr.frames;
  }, 1000 / FPS);
  draw(0);
  return cv;
}
