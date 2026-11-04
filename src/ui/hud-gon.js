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
    tron();
    const r = qi?.getBoundingClientRect();
    if (!r || !r.width) return;
    const top = Math.round(r.bottom + 2), left = Math.round(r.left);
    gon.style.top = an.style.top = `${top}px`;
    gon.style.left = `${left}px`; an.style.left = `${left + 34}px`;
    if (st.an) an.style.left = `${left}px`;
  }
  // nút tròn theo ảnh mẫu (chủ dự án 04/11/2026 09:05; data/menu.json → hud.tron, style-ui-kit3.css): xếp lại vị trí theo nút đang hiện
  const T = game.data.menu?.hud?.tron;
  function tron() {
    if (!T) return;
    const put = (ids, attr) => {   // hàng ngang canh mép phải: --<attr> = số thứ tự đếm từ phải sang (nút ẩn không chiếm chỗ)
      const vis = ids.map(id => document.getElementById(id)).filter(b => b && b.closest('#hud .hud-btns') && !b.hidden);
      for (const id of ids) {
        const b = document.getElementById(id);
        if (!b || !b.closest('#hud .hud-btns')) continue;
        b.classList.add('tron'); b.dataset.lb = T.lb[id] || ''; if (attr) b.dataset[attr] = '1';
        if (attr && !b.hidden) b.style.setProperty('--' + attr, vis.length - 1 - vis.indexOf(b));
      }
    };
    put(T.cot, 'cot'); put(T.tron2, 'tron2'); put([T.goc]);
    // hai hàng bên phải bắt đầu dưới việc truyện / bản đồ tròn
    const g = document.getElementById('goal')?.getBoundingClientRect(), mm = document.getElementById('mini-map')?.getBoundingClientRect();
    const top = Math.max(g && g.height ? g.bottom : 0, mm && mm.height ? mm.bottom + 14 : 0, 110) + 6;
    document.body.style.setProperty('--cot-top', Math.round(top) + 'px');
  }
  apply(); place(); every(place, 2000); addEventListener('resize', place);
}
