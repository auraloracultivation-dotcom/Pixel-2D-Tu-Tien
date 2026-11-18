// Bố cục hai bảng (chủ dự án 17/11/2026 00:11, ảnh mẫu GPT: "màn hình trở nên trống trải hơn, để sau dễ quay video; 4 nút skill và
// đánh thường, tự động, lướt, đan, chat… thành dạng bảng ở dưới; thông số, mấy ô chức năng ở trên thì dạng bảng ở trên; ảnh đại diện
// và map sửa thành khung vuông"). Ở đây chỉ gắn body.hud-bang và dựng hai tấm nền #bang-tren, #bang-duoi; mọi vị trí ở src/ui/hud-bang.css,
// các nút vẫn nằm chỗ cũ trong DOM (hud-order.js, hud-gon.js, hud-ava.js, mini-map.js, chat-dock.js giữ nguyên việc của mình).
// Bật / tắt: data/menu.json → hud.bang. Khung tạm bằng code; đồ hoạ khung chủ dự án làm sau.
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';

export function createHudBang(game) {
  if (!game.data.menu?.hud?.bang) return;
  for (const f of ['hud-bang', 'hud-khung', 'hud-ngang']) {   // vị trí (hud-bang.css) rồi hình khung (hud-khung.css), rồi bố cục cầm ngang (hud-ngang.css); nạp sau style.css nên thắng các bộ khung cũ
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = new URL(`./${f}.css?v=${ver()}`, import.meta.url).href;
    document.head.append(css);
  }
  document.body.classList.add('hud-bang', 'ngang-' + (game.data.menu.hud.ngang || 'a'));   // kiểu bố cục lúc cầm ngang (src/ui/hud-ngang.css)
  document.body.style.setProperty('--nk', game.data.menu.hud.ngang_co || 1);   // cỡ các khung lúc cầm ngang
  const cv = document.getElementById('game');   // nền nằm ngay trên canvas, dưới mọi nút (#hud, #buttons vẽ sau nên đè lên)
  const mk = id => { const e = document.createElement('div'); e.id = id; e.hidden = true; if (cv) cv.after(e); else document.body.prepend(e); return e; };
  const top = mk('bang-tren'), bot = mk('bang-duoi'), hud = document.getElementById('hud');
  const sync = () => { const on = !!(game.save && game.player && hud && !hud.hidden && !game.trip); top.hidden = bot.hidden = !on; };
  sync(); every(sync, 500);
  if (hud) new MutationObserver(sync).observe(hud, { attributes: true, attributeFilter: ['hidden'] });   // màn chơi vừa hiện: dựng ngay
}
