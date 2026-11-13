// Tự vào lại game sau khi trang tự tải lại (báo trong nhóm Zalo 13/11/2026 11:26: "lâu lâu treo hồi là mình thoát ra màn hình đăng nhập").
// Trang tự tải lại khi có bản game mới (src/net/ban-moi.js) hoặc mất kết nối quá lâu (src/game/net-watch.js); trước đây tải lại xong
// dừng ở màn đăng nhập, người đang treo (Tự đánh, Tự hành, đả tọa) mất lượt treo. Giờ: ngay trước khi tải lại, hai chỗ đó phát sự kiện
// 'p2d-tai-lai'; file này ghi vào sessionStorage (chỉ thẻ này) đang treo kiểu gì; tải lại xong màn đăng nhập thấy còn phiên đăng nhập thì
// tự bấm Tiếp tục (src/ui/login.js gọi tuVao), vào game rồi bật lại Tự đánh / Tự hành như lúc trước. Hết hạn sau MAX_MS.
// 13/11/2026 16:06 nhóm Zalo vẫn báo "lâu lâu bị văng game": điện thoại tự đóng thẻ / ứng dụng (thiếu bộ nhớ, iOS dọn máy) thì trang tải lại
// mà không kịp phát sự kiện nào. Nên lúc đang trong game cứ SONG_GAP_MS ghi thêm một dấu "đang chơi" vào localStorage (còn sau khi ứng
// dụng màn hình chính bị tắt); mở lại trong SONG_MAX_MS mà còn phiên đăng nhập thì cũng tự vào. Đăng xuất thì không còn phiên nên không tự vào.
import { toggleAuto } from '../game/auto.js';
import { togglePilot } from '../game/pilot.js';

const KEY = 'p2d-tu-vao', MAX_MS = 5 * 60 * 1000, SONG = 'p2d-dang-choi', SONG_GAP_MS = 5000, SONG_MAX_MS = 30 * 60 * 1000;
const mark = game => JSON.stringify({ t: Date.now(), auto: !!game.auto, pilot: !!game.pilot });

export function watchTuVao(game) {
  addEventListener('p2d-tai-lai', () => {
    if (!game.save || !game.cloud) return;   // chưa vào game hoặc chơi không tài khoản: thôi
    try { sessionStorage.setItem(KEY, mark(game)); } catch { /* chế độ riêng tư */ }
  });
  setInterval(() => {   // dấu đang chơi (chỉ khi đang trong game có tài khoản; bị đá sang máy khác thì game.cloud = null)
    if (!game.save || !game.cloud || !game.player) return;
    try { localStorage.setItem(SONG, mark(game)); } catch { /* chế độ riêng tư */ }
  }, SONG_GAP_MS);
}

// Đổi tài khoản, đăng xuất: bỏ dấu đang chơi (src/ui/side-nav.js, src/ui/login.js)
export function boDauChoi() { try { localStorage.removeItem(SONG); } catch { /* không sao */ } }

function take(store, key, max) {
  try { const s = JSON.parse(store.getItem(key) || 'null'); store.removeItem(key); return s && Date.now() - s.t <= max ? s : null; } catch { return null; }
}

// Gọi ở màn đăng nhập khi đã có phiên: trả true nếu vừa tự tải lại (đã tự vào game)
export function tuVao(game, go) {
  let s = null;
  let song = null;
  try { s = take(sessionStorage, KEY, MAX_MS); } catch { /* không có sessionStorage */ }
  try { song = take(localStorage, SONG, SONG_MAX_MS); } catch { /* không có localStorage */ }
  s = s || song;
  if (!s) return false;
  go();
  const t0 = Date.now(), wait = setInterval(() => {   // chờ vào game xong rồi bật lại kiểu treo cũ
    if (Date.now() - t0 > 60000) { clearInterval(wait); return; }
    if (!game.save || !game.player || !game.map || game.dialog?.open) return;
    clearInterval(wait);
    try { if (s.auto && !game.auto) toggleAuto(game); else if (s.pilot && !game.pilot) togglePilot(game); } catch { /* chỗ này không cho tự đánh */ }
  }, 500);
  return true;
}
