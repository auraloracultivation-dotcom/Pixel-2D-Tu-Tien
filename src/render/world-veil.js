// Màn che lúc mới vào bản đồ (chủ dự án 09/11/2026 16:55: "vào động phủ thấy 3 màn: đồ đạc lộn xộn, nền mờ, rồi mới chạy bình thường"):
// tấm nền chưa dựng xong (hình nền chưa tải, vẽ tạm hình khối) hoặc hình đồ trên bản đồ chưa tải xong thì phủ màu tối và chữ
// "Đang tải…" đè lên, xong thì mờ đi trong fade giây. Quá max giây vẫn chưa xong (mạng yếu, hình hỏng) thì thôi che.
// Số ở data/config.json → veil.
import { groundReady } from '../world/draw-ground.js';
import { spriteImage } from './sprites.js';

let st = { map: null, t0: 0, done: 0 };

const ready = map => groundReady(map) && (map.hoi || []).every(it => !it.spr || spriteImage(it.spr));

// Vẽ màn che theo toạ độ màn hình; true khi đang che hẳn (khỏi vẽ mũi tên, cần điều khiển đè lên)
export function drawVeil(ctx, game, screen) {
  const V = game.data.config.veil, map = game.map;
  if (!V?.on || !map) return false;
  const now = performance.now();
  if (st.map !== map) st = { map, t0: now, done: 0 };
  if (!st.done && (ready(map) || now - st.t0 > V.max * 1000)) st.done = now;
  const a = st.done ? 1 - (now - st.done) / (V.fade * 1000) : 1;
  if (a <= 0) return false;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = V.color; ctx.fillRect(0, 0, screen.w, screen.h);
  if (!st.done) {
    ctx.fillStyle = '#e8dcc0'; ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(V.text + '.'.repeat(1 + Math.floor(now / 400) % 3), screen.w / 2, screen.h / 2);
  }
  ctx.restore();
  return !st.done;
}
