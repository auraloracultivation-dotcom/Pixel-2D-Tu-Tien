// Tự vào lại game sau khi trang tự tải lại (báo trong nhóm Zalo 13/11/2026 11:26: "lâu lâu treo hồi là mình thoát ra màn hình đăng nhập").
// Trang tự tải lại khi có bản game mới (src/net/ban-moi.js) hoặc mất kết nối quá lâu (src/game/net-watch.js); trước đây tải lại xong
// dừng ở màn đăng nhập, người đang treo (Tự đánh, Tự hành, đả tọa) mất lượt treo. Giờ: ngay trước khi tải lại, hai chỗ đó phát sự kiện
// 'p2d-tai-lai'; file này ghi vào sessionStorage (chỉ thẻ này) đang treo kiểu gì; tải lại xong màn đăng nhập thấy còn phiên đăng nhập thì
// tự bấm Tiếp tục (src/ui/login.js gọi tuVao), vào game rồi bật lại Tự đánh / Tự hành như lúc trước. Hết hạn sau MAX_MS.
import { toggleAuto } from '../game/auto.js';
import { togglePilot } from '../game/pilot.js';

const KEY = 'p2d-tu-vao', MAX_MS = 5 * 60 * 1000;

export function watchTuVao(game) {
  addEventListener('p2d-tai-lai', () => {
    if (!game.save || !game.cloud) return;   // chưa vào game hoặc chơi không tài khoản: thôi
    try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), auto: !!game.auto, pilot: !!game.pilot })); } catch { /* chế độ riêng tư */ }
  });
}

// Gọi ở màn đăng nhập khi đã có phiên: trả true nếu vừa tự tải lại (đã tự vào game)
export function tuVao(game, go) {
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch { return false; }
  if (!s || Date.now() - s.t > MAX_MS) return false;
  go();
  const t0 = Date.now(), wait = setInterval(() => {   // chờ vào game xong rồi bật lại kiểu treo cũ
    if (Date.now() - t0 > 60000) { clearInterval(wait); return; }
    if (!game.save || !game.player || !game.map || game.dialog?.open) return;
    clearInterval(wait);
    try { if (s.auto && !game.auto) toggleAuto(game); else if (s.pilot && !game.pilot) togglePilot(game); } catch { /* chỗ này không cho tự đánh */ }
  }, 500);
  return true;
}
