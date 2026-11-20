// MỘT hàm vẽ nhân vật người chơi, dùng cho cả MÌNH lẫn NGƯỜI KHÁC (đợt dọn 20/11/2026; chủ dự án: "nhân vật trên màn hình người khác
// hiển thị cái gì thì mọi người đều thấy cái đó, game online mà"). Trước đây là hai đoạn code riêng (drawPlayer, drawOther): thêm một thứ
// trên người mình là phải nhớ vẽ lại ở đoạn kia, quên thì người khác không thấy, hoặc thấy khác (hào quang thiếu vòng và hạt sáng, phi
// kiếm không có vệt gió, chưa mặc vũ khí thì người khác không thấy vũ khí bay…).
//   e: thân người được vẽ (chỗ đứng, hướng nhìn, đang đi, đang cưỡi / bay / đả tọa, vừa vung đòn…). Mình: game.player; người khác: bản
//      đang thấy của họ (src/game/others.js).
//   h: hồ sơ ngoại hình của họ, đúng các trường khai ở data/dong-bo.json → ho_so. Mình: game.hoSo (chính bản gửi cho phòng,
//      src/game/ho-so-phong.js); người khác: bản họ gửi, đã lọc.
// LUẬT (tools/check.mjs giữ): tệp này không đọc bản lưu (game.save). Ngoại hình chỉ lấy từ h, nên thứ gì vẽ được trên người mình thì đã
// nằm trong hồ sơ gửi đi. Cần vẽ thêm một thứ mới: thêm trường vào bảng rồi vẽ ở đây một lần, cả hai phía cùng có.
// Chỗ mình và người khác còn khác nhau (ghi rõ để không ai tưởng là quên):
//   - vũ khí lúc ra đòn: mình có mô phỏng đủ (src/game/flyweapon.js, p.fw: lao tới mục tiêu, vệt sáng); người khác xem bản gần đúng
//     theo nhịp vung đòn họ báo (draw-flyweapon.js drawOtherWeapon). Cùng hình, cùng cỡ, cùng chỗ treo lúc nghỉ.
//   - mình gục: bong bóng linh hồn có đếm giây (draw-ghost.js); người khác thấy mình mờ đi (không biết còn mấy giây).
//   - khiên, buff ngắn hạn (e.shield, e.buffT) và nhấp nháy lúc vừa trúng đòn (e.invT): mới có số ở máy mình; đoạn vẽ đã viết chung,
//     khi nào các số này được gửi đi thì người khác tự thấy.
//   - tên trên đầu: chỉ vẽ cho người khác (tên mình là nút HTML, src/ui/pvp-btn.js).
import { circle } from '../world/draw-map.js';
import { curOutfit } from '../game/fashion.js';
import { vfxOf } from '../game/vfx.js';
import { drawWeapon } from './weapon.js';
import { drawMount } from './draw-pet.js';
import { drawAura, drawTitle } from './draw-aura.js';
import { drawHero, heroLook } from './draw-hero.js';
import { drawFlySword } from './draw-fly.js';
import { drawKdBack } from './draw-ket-dan.js';
import { drawPhapTuong } from './draw-phap-tuong.js';
import { textQ } from './draw-focus.js';
import { drawNameShield } from './draw-pvp-tag.js';
import { drawGhost } from './draw-ghost.js';
import { domainVis } from './draw-domain.js';
import { ring } from './pixel-shapes.js';
import { drawFlyWeapon, drawOtherWeapon } from './draw-flyweapon.js';
import { drawPerson, INK } from './draw-person.js';

export function drawNguoi(ctx, game, e, h, t) {
  const toi = e === game.player, D = game.data;
  if (toi) {
    if (game.ghost) return drawGhost(ctx, game, t);   // gục chờ hồi sinh: bong bóng linh hồn (draw-ghost.js)
    if (e.domain && domainVis(game, e) <= 0.01) return;   // ẩn trong lĩnh vực Vô Ảnh: cả vũ khí, danh hiệu (draw-domain.js)
  }
  const lk = heroLook(game, h), md = e.riding ? D.pets.mounts[h.mount] : null;
  const el = (h.element && D.elements[h.element]?.color) || '#e6ebf7';
  const A = !toi && h.st === 'guc' ? 0.45 : 1;   // độ đậm nền: người khác đang gục chờ hồi sinh thì mờ
  let luu = 0;   // số lần ctx.save() còn phải trả
  if (!toi && e.swingNew) { const L = lk.attacks || []; if (L.length) e.heroAnim = { name: L[e.atkN++ % L.length], t0: game.time }; e.swingNew = false; }   // họ vừa vung đòn: động tác đánh kế tiếp của nhân vật
  if (A !== 1) ctx.globalAlpha = A;
  if (e.invT > 0 && Math.floor(t * 20) % 2 && e.flash <= 0 && !e.kd) ctx.globalAlpha = A * 0.5;   // vừa trúng đòn: nhấp nháy
  if (md) {
    drawPhapTuong(ctx, game, e, t, h, lk, lk.anims?.ngoi ? 'ngoi' : 'idle', e.x + (e.seatX || 0), e.y - (e.lift || 0));   // pháp tượng sau lưng người cưỡi, sau cả thú (chỗ ngồi của khung trước)
    const lift = drawMount(ctx, e, md, t, D.art, h.mount); e.lift = lift;
    ctx.save(); luu++; ctx.translate(e.seatX || 0, -lift - (!e.seatSync && e.moving && Math.floor(e.walkT * 7) % 2 ? 1 : 0));   // người cưỡi nhún theo nhịp phi (thú có chỗ đứng theo khung thì đã nhấp nhô theo lưng, không nhún thêm)
  }
  if (e.flying) { e.lift = drawFlySword(ctx, game, e, h, t, A); ctx.save(); luu++; ctx.translate(0, -e.lift); }   // nút Bay: đứng trên vũ khí đang mặc (draw-fly.js)
  if (e.kd) { drawKdBack(ctx, game, e, t); ctx.save(); luu++; ctx.translate(e.kdDx || 0, -(e.kdLift || 0)); }   // kết đan: lơ lửng, nửa sau vòng khói vẽ trước thân
  if (e.meditating) { ctx.globalAlpha = A * (0.5 + 0.3 * Math.sin(t * 3)); ring(ctx, e.x, e.y - 6, 12 + Math.sin(t * 2) * 2, el); ctx.globalAlpha = A; }   // đả tọa: vòng linh khí màu hệ
  drawAura(ctx, game, e, t, +h.ri || 0, A);   // hào quang cảnh giới
  if (toi) drawFlyWeapon(ctx, game, 'back'); else drawOtherWeapon(ctx, game, e, t, false, h);   // vũ khí treo sau lưng vẽ trước thân người
  const hero = drawHero(ctx, game, e, t, e.flash > 0, h);
  if (!hero) {   // hình nhân vật chưa tải xong: hình khối, màu theo thời trang, đai lưng màu hệ, vũ khí cầm tay vẽ bằng code
    const f = D.fashion.list[curOutfit(game, h)], w = D.weapons[h.vkl];
    drawPerson(ctx, e, f.robe, f.hair, t, e.flash > 0, e.face);
    ctx.fillStyle = f.sash || el; ctx.fillRect(e.x - 4, e.y - 6, 8, 1.5);
    if (w?.look) drawWeapon(ctx, e, w);
  }
  if (toi) drawFlyWeapon(ctx, game, 'front'); else drawOtherWeapon(ctx, game, e, t, true, h);
  if (e.shield > 0 && !vfxOf(game, e.shieldSk)) { ctx.globalAlpha = A * 0.7; ring(ctx, e.x, e.y - 6, 10, e.shieldColor); }   // khiên có hiệu ứng mới: vẽ ở lớp trên (src/render/vfx/)
  if (e.buffT > 0 && !vfxOf(game, e.buffSk)) { ctx.fillStyle = e.buffColor; ctx.globalAlpha = A * 0.25; circle(ctx, e.x, e.y - 6, 10); }
  ctx.globalAlpha = A;
  let ty = e.y - (e.top || 24) - (D.heroes.title_gap ?? 10);   // danh hiệu: tách hẳn khỏi đầu, tóc, vũ khí đeo vai (chủ dự án 29/10/2026)
  if (!toi) {   // tên + hình khiên PvP (draw-pvp-tag.js); tắt khiên thì tên đỏ, kèm thanh máu PvP khi vừa trúng đòn; danh hiệu nằm TRÊN tên (18/11/2026 09:49)
    const q = textQ(game, 6), ny = e.y - (e.top || 22) - 3;
    ctx.font = `bold ${6 * q}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 2 * q; ctx.strokeStyle = INK;
    drawNameShield(ctx, game, e, ny, q, INK, e.pk ? '#ff5a5a' : el);
    if (e.pk && e.pvpR < 1 && game.time - (e.pvpAt || 0) < 10) { ctx.fillStyle = INK; ctx.fillRect(e.x - 10, ny + 1.5, 20, 2.5); ctx.fillStyle = '#ff5a5a'; ctx.fillRect(e.x - 10, ny + 1.5, 20 * Math.max(0, e.pvpR), 2.5); }
    if (e.swingT > 0 && !hero) { const a = Math.atan2(e.face.y, e.face.x); ctx.globalAlpha = A * e.swingT / 0.18; ring(ctx, e.x, e.y - 3, 22, '#c8f6ff', a - 1.1, a + 1.1, 2); ctx.globalAlpha = A; }   // chưa có hình: vệt vung đòn
    ty = ny - 8 * q;
  }
  drawTitle(ctx, game, e, h.title && D.status.titles?.[h.title], ty);
  while (luu-- > 0) ctx.restore();
  ctx.globalAlpha = 1;
}
