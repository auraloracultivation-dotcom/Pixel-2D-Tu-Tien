// Bố cục hai bảng (chủ dự án 17/11/2026 00:11, ảnh mẫu GPT: "màn hình trở nên trống trải hơn, để sau dễ quay video; 4 nút skill và
// đánh thường, tự động, lướt, đan, chat… thành dạng bảng ở dưới; thông số, mấy ô chức năng ở trên thì dạng bảng ở trên; ảnh đại diện
// và map sửa thành khung vuông"). Ở đây chỉ gắn body.hud-bang và dựng hai tấm nền #bang-tren, #bang-duoi; mọi vị trí ở src/ui/hud-bang.css,
// các nút vẫn nằm chỗ cũ trong DOM (hud-order.js, hud-gon.js, hud-ava.js, mini-map.js, chat-dock.js giữ nguyên việc của mình).
// 21/11/2026 (chủ dự án gửi ảnh màn chơi trở về giao diện cũ, rồi "không xoá bản cũ để lấy bản này làm cố định được hả"): bỏ công tắc
// hud.bang, bố cục này là bố cục duy nhất. Ba tệp khung (hud-bang, hud-khung, hud-ngang.css) nạp cùng trang ở index.html, không còn nạp
// sau bằng code; tệp nào chưa tới (mạng chập chờn) thì nạp lại tối đa NAP_LAI lần, vẫn thiếu thì tải lại trang một lần.
import { goc } from '../core/build.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const TEP = { 'hud-bang': '--nap-bang', 'hud-khung': '--nap-khung', 'hud-ngang': '--nap-ngang' };   // tệp → mốc kiểm cuối tệp
const NAP_LAI = 3, KEY = 'p2d_nap_khung';

function giuKhung() {
  let lan = 0;
  const thieu = () => Object.keys(TEP).filter(f => !getComputedStyle(document.body).getPropertyValue(TEP[f]).trim());
  const kiem = () => {
    const t = thieu();
    if (!t.length) { try { sessionStorage.removeItem(KEY); } catch { /* không có kho */ } return; }
    if (lan++ < NAP_LAI) {
      for (const f of t) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = goc(`src/ui/${f}.css`) + '&r=' + Date.now(); document.head.append(l); }
      setTimeout(kiem, 3000);
      return;
    }
    try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch { return; }
    dispatchEvent(new Event('p2d-tai-lai')); location.reload();   // src/ui/tu-vao.js: tải lại xong tự vào game
  };
  setTimeout(kiem, 1500);
}

export function createHudBang(game) {
  document.body.classList.add('hud-bang', 'ngang-' + (game.data.menu.hud.ngang || 'a'));
  giuKhung();   // kiểu bố cục lúc cầm ngang (src/ui/hud-ngang.css)
  document.body.style.setProperty('--nk', game.data.menu.hud.ngang_co || 1);   // cỡ các khung lúc cầm ngang
  const cv = document.getElementById('game');   // nền nằm ngay trên canvas, dưới mọi nút (#hud, #buttons vẽ sau nên đè lên)
  const mk = id => { const e = document.createElement('div'); e.id = id; e.hidden = true; if (cv) cv.after(e); else document.body.prepend(e); return e; };
  const top = mk('bang-tren'), bot = mk('bang-duoi'), hud = document.getElementById('hud');
  const sync = () => { const on = !!(game.save && game.player && hud && !hud.hidden && !game.trip); top.hidden = bot.hidden = !on; };
  sync(); every(sync, 500);
  if (hud) new MutationObserver(sync).observe(hud, { attributes: true, attributeFilter: ['hidden'] });   // màn chơi vừa hiện: dựng ngay
}
