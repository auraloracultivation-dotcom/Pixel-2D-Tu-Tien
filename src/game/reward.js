// Nghi lễ nhận thưởng (docs/10-CAI-HON.md việc 4; chủ dự án 14/11/2026 00:15: "nhận quà cũng vậy… người ta còn không cảm thấy à thì ra mình đã nhận được
// món quà giá trị như vậy. Trang bị ở giữa màn hình, đằng sau có ánh sáng đang toả ra và xoay vòng vòng, toàn bộ nền tối lại, trên đầu trang bị có chữ
// chúc mừng nhận được…"). File này quyết định món nào được diễn kiểu nào; phần hình ở src/ui/reward-show.js.
//   · bản đầy đủ ('full'): game đứng lại, nền tối, vầng sáng xoay sau món đồ, chỉ số hiện lần lượt, nút Mặc ngay / Cất vào túi. Cho món phẩm từ full_from
//     trở lên và phần thưởng được trao hẳn hoi (o.full). Không chen ngang trận đánh: còn quái đang đánh mình thì hiện thẻ nhỏ trước, hết quái mới diễn
//     (chờ quá wait_max giây thì thôi). Đang Tự hành / Tự đánh, đang mở bảng, hoặc vừa diễn xong chưa đầy gap giây: chỉ thẻ nhỏ, chạm thẻ để xem đầy đủ;
//   · thẻ nhỏ ('mini'): thẻ giữa màn vài giây, không dừng game. Cho món phẩm từ mini_from;
//   · phẩm thấp hơn: chỉ có dòng "Nhặt …" ở cột thông báo như cũ.
// Số ở data/juice.json → reward. Công tắc cho mọi người: reward.on; riêng một máy: địa chỉ ?qua=1 / ?qua=0, nhớ trên máy đó.
import { grade } from './tiers.js';

const R = game => game.data.juice?.reward;
let ON = null;   // một trang một game: hỏi một lần rồi nhớ
export function rewardOn(game) {
  if (ON != null) return ON;
  let v = null;
  try { const q = new URLSearchParams(location.search).get('qua'); if (q != null) localStorage.setItem('p2d-qua', q); v = localStorage.getItem('p2d-qua'); } catch { /* không có kho nhớ: theo mặc định */ }
  return (ON = !!R(game) && (v != null ? v === '1' : !!R(game).on));
}

const busy = game => !!(game.pilot || game.auto || game.dialog?.open || game.traveling || game.trip || (game.uiOpen && game.uiOpen !== 'qua'));
// Yên: không còn con quái nào đang đánh mình ở gần, và nhát kết liễu gần nhất đã diễn xong (hình hết khựng, xác vừa ngã đã quá calm_t giây):
// nghi lễ không được cắt ngang khoảnh khắc hạ quái
export const rewardSettled = game => !(game.hitstop > 0) && !(game.corpses || []).some(c => game.time - c.t0 < R(game).calm_t);
function calm(game) {
  const p = game.player, r = R(game).calm_r;
  return rewardSettled(game) && !game.mobs.some(m => !m.dead && m.aggro && !m.dummy && (m.x - p.x) ** 2 + (m.y - p.y) ** 2 < r * r);
}

// Vừa nhận món trang bị it (đã nằm trong túi). o.full: diễn đầy đủ ngay dù phẩm thấp (phần thưởng trao hẳn hoi của cốt truyện đi qua game.rewardGive ở
// ui/reward-show.js: chờ được tới lúc người chơi đóng nghi lễ). Trả 'full', 'mini' hoặc null (không diễn gì: nơi gọi tự phát tiếng nhặt đồ như cũ).
export function rewardItem(game, it, o = {}) {
  if (!it || !rewardOn(game) || !game.rewardShow) return null;
  const C = R(game), g = grade(game.data, it).idx;
  if (o.full) { game.rwLast = game.time; game.rewardShow(it, 'full'); return 'full'; }
  if (g < C.mini_from) return null;
  if (g >= C.full_from && !busy(game) && game.time - (game.rwLast ?? -1e9) >= C.gap) {
    if (calm(game)) { game.rwLast = game.time; game.rewardShow(it, 'full'); return 'full'; }
    game.rwWait = { it, until: game.time + C.wait_max };   // đang đánh nhau: báo bằng thẻ nhỏ, hết quái thì diễn (rewardTick)
  }
  game.rewardShow(it, 'mini');
  return 'mini';
}

// Mỗi khung lúc game đang chạy: món đang chờ lúc yên thì diễn khi hết quái quanh mình
export function rewardTick(game) {
  const w = game.rwWait;
  if (!w) return;
  if (game.time > w.until || busy(game) || !game.save.bag.includes(w.it)) { game.rwWait = null; return; }
  if (calm(game)) { game.rwWait = null; game.rwLast = game.time; game.rewardShow(w.it, 'full'); }
}
