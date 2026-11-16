// Hình nhân vật giữa thẻ Trang bị (src/ui/self-left.js). Chủ dự án 16/11/2026 23:01: thú cưỡi và pháp tượng cũng hiện trong bảng trang bị.
// Vẽ bằng đúng các hàm vẽ trong game (draw-pet.js drawMount, draw-hero.js drawHero, draw-phap-tuong.js) lên một canvas riêng:
// có thú cưỡi đang chọn thì người ngồi xếp bằng trên lưng thú, pháp tượng sau lưng; chưa có thú thì đứng, pháp tượng sau lưng.
// Chạy chậm (10 khung / giây) khi thẻ đang hiện: lửa pháp tượng, thú thở, khí cầu; thẻ bị thay thì tự dừng.
import { heroLook, drawHero } from '../render/draw-hero.js';
import { drawMount } from '../render/draw-pet.js';
import { drawPhapTuong, ptSprite } from '../render/draw-phap-tuong.js';
import { spriteIcon } from './sprite-icon.js';

const Z = 45 / 24 * 2;   // điểm canvas mỗi đơn vị bản đồ: mỗi điểm ảnh hình nhân vật (24/45 đơn vị) = 2 điểm canvas, nét vẫn vuông
const BOX = { w: 92, h: 84, foot: 76 };   // khung cảnh (đơn vị bản đồ): chân thú / người cách đỉnh foot

// Mã để vá giữ canvas cũ khi không đổi gì (src/ui/morph.js)
export const sceneKey = game => [heroLook(game).sprite, game.save.mount || '', ptSprite(game) || ''].join('|');

// size: chiều cao hiện (điểm CSS). Hỏng gì thì quay về hình đứng tĩnh như trước
export function heroScene(game, size) {
  const s = game.save, mid = s.mount && game.data.pets.mounts[s.mount] ? s.mount : null;
  if (!mid && !ptSprite(game)) return spriteIcon(game, heroLook(game).sprite, 0, size * 0.6, 'sv-hero', true);
  const cv = document.createElement('canvas'), W = Math.round(BOX.w * Z), H = Math.round(BOX.h * Z);
  cv.className = 'sv-hero sv-scene'; cv.width = W; cv.height = H;
  cv.style.height = size + 'px'; cv.style.width = Math.round(size * W / H) + 'px';
  const ctx = cv.getContext('2d'), p = { x: 0, y: 0, face: { x: 1, y: 0 }, lookX: 1, moving: false, walkT: 0, riding: !!mid, flash: 0, ptPhase: 0 };
  const lk = heroLook(game), md = mid && game.data.pets.mounts[mid];
  const paint = () => {
    const t = performance.now() / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.setTransform(Z, 0, 0, Z, Math.round(W / 2), Math.round(BOX.foot * Z)); ctx.imageSmoothingEnabled = false;
    if (md) {   // chỗ ngồi của khung này: vẽ thử thú một lần lên canvas rồi xoá, như người cưỡi trong game dùng chỗ ngồi khung trước
      p.lift = drawMount(ctx, p, md, t, game.data.art, mid);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.restore();
      drawPhapTuong(ctx, game, p, t, s, lk, lk.anims?.ngoi ? 'ngoi' : 'idle', p.seatX || 0, -p.lift);
      drawMount(ctx, p, md, t, game.data.art, mid);
      ctx.save(); ctx.translate(p.seatX || 0, -p.lift);
    }
    drawHero(ctx, game, p, t, false);
    if (md) ctx.restore();
  };
  try { paint(); } catch { return spriteIcon(game, lk.sprite, 0, size * 0.6, 'sv-hero', true); }
  let first = true;
  const tick = () => {
    if (!cv.isConnected && !first) return;   // thẻ đã bị thay (hoặc bảng đóng hẳn): thôi vẽ
    if (cv.isConnected) { first = false; try { paint(); } catch { return; } }
    setTimeout(tick, 100);
  };
  setTimeout(tick, 100);
  return cv;
}
