// Dấu truyện: việc người chơi đã làm trong một nhiệm vụ chính để lại một dấu nhỏ trên bản đồ CỦA RIÊNG HỌ, quay lại lúc nào cũng còn thấy
// (ngọn nến thứ mười hai trên bàn lễ trước Hỏa Quật…). Khai ở data/story.json → dau: [{ co: cờ trong save.flags, map, at: [ô x, ô y], kieu, mau }].
// Dấu là hiệu ứng vẽ bằng code đặt lên vật đã có sẵn trên bản đồ, không thêm hình tĩnh nào. Kiểu:
//   nen  một ngọn lửa nến nhỏ lay nhẹ, có quầng sáng (src/render/draw-lights.js đọc f.dau để khoét bóng tối)
//   the  một tấm thẻ gỗ nhỏ có lỗ xỏ dây, thỉnh thoảng ánh lên một nét (thẻ tên người chơi đặt lên bàn lễ lúc vào quật; ra thì lấy lại: lệnh unflag tắt cờ)
// Cờ tắt (unflag) thì dấu cũng mất ở nhịp kế.
import { addFx } from './combat.js';
import { every } from '../core/ticker.js';

const VE = {
  nen(ctx, f, k, game) {
    const t = game.time || 0, x = Math.round(f.x), y = Math.round(f.y), lay = Math.sin(t * 9 + f.seed) > 0.4 ? 1 : 0, cao = 3 + (Math.sin(t * 5 + f.seed * 2) > 0 ? 1 : 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16; ctx.fillStyle = f.color; ctx.fillRect(x - 4, y - cao - 4, 9, cao + 7);   // quầng
    ctx.globalAlpha = 0.9; ctx.fillRect(x - 1 + lay, y - cao, 2, cao);   // thân lửa
    ctx.fillStyle = '#fff6d8'; ctx.fillRect(x + lay, y - 2, 1, 2);   // lõi sáng
    ctx.restore();
  },
  the(ctx, f, k, game) {
    const t = game.time || 0, x = Math.round(f.x), y = Math.round(f.y), anh = (t * 0.5 + f.seed) % 3 < 0.18;
    ctx.save();
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x - 3, y - 2, 7, 5);   // viền
    ctx.fillStyle = f.color; ctx.fillRect(x - 2, y - 1, 5, 3);   // mặt gỗ
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - 1, y, 3, 1);   // nét khắc tên
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + 1, y - 1, 1, 1);   // lỗ xỏ dây
    if (anh) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff6d8'; ctx.fillRect(x - 2, y - 1, 2, 1); }
    ctx.restore();
  },
};
const SANG = { nen: 1 };   // kiểu dấu có quầng sáng trong bóng tối

export function createDauTruyen(game) {
  const L = game.data.story.dau || [];
  if (!L.length) return;
  every(() => {
    const s = game.save, m = game.map;
    if (!s?.flags || !m || game.trip) return;
    for (const f of game.fx) if (f.dau && !s.flags[f.dau]) f.life = 0;   // cờ đã tắt: dấu mất
    for (const d of L) {
      if (d.map !== m.id || !s.flags[d.co] || !VE[d.kieu] || game.fx.some(f => f.dau === d.co && f.map === m.id && f.life > 0)) continue;
      const c = m.center(d.at[0], d.at[1]);
      addFx(game, { type: 'dau', dau: d.co, sang: SANG[d.kieu] || 0, map: m.id, x: c.x, y: c.y, life: 1e9, color: d.mau || '#ffb060', seed: d.at[0] * 7 + d.at[1], draw: VE[d.kieu] });
    }
  }, 700);
}
