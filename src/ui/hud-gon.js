// Thu gọn bảng nút góc trên trái và ẩn giao diện (chủ dự án 02/11/2026 21:46: "thu phóng bảng công năng cho gọn lúc farm hoặc review,
// hoặc nút ẩn UI"). Hai nút nhỏ cạnh thanh máu: mũi tên thu / mở cột nút (body.hud-gon); "Ẩn" giấu thanh trạng thái, cột nhiệm vụ,
// khung trò chuyện, cột nhặt đồ (body.ui-an), chỉ chừa cụm nút đánh để vẫn farm được; chạm "Hiện" để bày lại. Cột nhiệm vụ riêng thì
// thu / mở bằng nút Nhiệm vụ như cũ. Nhớ trên máy (localStorage, lỗi thì thôi). Kiểu ở style-ui-kit.css.
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt
const KEY = 'p2d.hudgon.v1';
const ICO = { 'btn-bag': 1, 'btn-menu': 1, 'btn-skills': 1, 'hud-dun': 1, 'hud-event': 1, 'hud-quest': 1, 'hud-home': 1, 'btn-world': 1, 'hud-rank': 1 };

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function store(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* chế độ riêng tư */ } }

export function createHudGon(game) {
  const st = load(), body = document.body;
  const mk = (id, text, title) => {
    const b = document.createElement('button'); b.id = id; b.className = 'uk-tog'; b.textContent = text; b.title = title; b.hidden = true;
    b.addEventListener('pointerdown', e => e.stopPropagation()); document.body.append(b); return b;
  };
  const gon = mk('uk-gon', '', 'Thu gọn / mở các nút'), an = mk('uk-an', 'Ẩn', 'Ẩn / hiện giao diện');
  const apply = () => {
    body.classList.toggle('hud-gon', !!st.gon); body.classList.toggle('ui-an', !!st.an);
    an.textContent = st.an ? 'Hiện' : 'Ẩn';
  };
  gon.onclick = () => { st.gon = !st.gon; store(st); apply(); place(); };
  an.onclick = () => { st.an = !st.an; store(st); apply(); place(); };
  // hai nút đứng ngay dưới thanh linh khí (cột nút dời xuống một hàng, style-ui-kit.css); ẩn giao diện thì chỉ còn nút Hiện ở đó
  function place() {
    const hud = document.getElementById('hud'), qi = document.querySelector('#hud .bar.qi');
    const on = !!game.save && hud && !hud.hidden;
    gon.hidden = an.hidden = !on;
    if (!on) return;
    for (const b of document.querySelectorAll('#hud .hud-btns > button')) if (ICO[b.id] && !b.dataset.ico) b.dataset.ico = '1';   // biểu tượng nút (CSS --ico)
    const r = qi?.getBoundingClientRect();
    if (!r || !r.width) return;
    const top = Math.round(r.bottom + 2), left = Math.round(r.left);
    gon.style.top = an.style.top = `${top}px`;
    gon.style.left = `${left}px`; an.style.left = `${left + 34}px`;
    if (st.an) an.style.left = `${left}px`;
  }
  apply(); place(); every(place, 2000); addEventListener('resize', place);
}
