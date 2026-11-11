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
  // chủ dự án 04/11/2026 09:57: nút mắt ngay dưới nút "!" góc phải trên; mũi tên thu / mở ngay sau nút Thư (ô cuối hàng nút dưới,
  // các nút hàng đó dịch sang trái một ô). Ẩn giao diện thì chỉ còn nút mắt ở đó.
  function place() {
    const hud = document.getElementById('hud');
    const on = !!game.save && hud && !hud.hidden;
    gon.hidden = an.hidden = !on;
    const top = tron();   // xếp nút tròn cả khi màn chơi chưa hiện: vào game không thoáng thấy bố cục nút chữ cũ (chủ dự án 04/11/2026 10:31)
    if (!on) return;
    for (const b of document.querySelectorAll('#hud .hud-btns > button')) if (ICO[b.id] && !b.dataset.ico) b.dataset.ico = '1';   // biểu tượng nút (CSS --ico)
    const f = document.getElementById('btn-faq'), fr = f && !f.hidden ? f.getBoundingClientRect() : null;
    Object.assign(an.style, { left: 'auto', right: `${fr && fr.width ? Math.round(innerWidth - fr.right - 2) : 8}px`, top: `${fr && fr.height ? Math.round(fr.bottom + 6) : 8}px` });
    Object.assign(gon.style, { left: 'auto', right: '16px', top: `${top + 62 + 6}px` });
    // khay chung sau hai hàng nút bên phải (khung trên mới, style-hud-tren.css; chủ dự án 11/11/2026 11:42): ôm đúng các nút đang hiện
    const bars = document.querySelector('#hud .bars');
    if (bars && khay.parentNode !== bars) bars.append(khay);
    const rs = [...document.querySelectorAll('#hud .hud-btns > button.tron[data-cot], #hud .hud-btns > button.tron[data-tron2], #uk-gon')]
      .filter(b => !b.hidden).map(b => b.getBoundingClientRect()).filter(r => r.width && r.height);
    khay.hidden = rs.length < 2 || body.classList.contains('hud-gon');
    if (!khay.hidden) {
      const l = Math.min(...rs.map(r => r.left)), r = Math.max(...rs.map(r => r.right)), t = Math.min(...rs.map(r => r.top)), b = Math.max(...rs.map(r => r.bottom));
      Object.assign(khay.style, { left: `${Math.round(l - 5)}px`, top: `${Math.round(t - 5)}px`, width: `${Math.round(r - l + 10)}px`, height: `${Math.round(b - t + 10)}px` });
    }
  }
  const khay = document.createElement('i'); khay.id = 'hud-khay'; khay.hidden = true;
  // nút tròn theo ảnh mẫu (chủ dự án 04/11/2026 09:05; data/menu.json → hud.tron, style-ui-kit3.css): xếp lại vị trí theo nút đang hiện
  const T = game.data.menu?.hud?.tron;
  function tron() {
    if (!T) return 160;
    const put = (ids, attr, off = 0) => {   // hàng ngang canh mép phải: --<attr> = số thứ tự đếm từ phải sang (nút ẩn không chiếm chỗ)
      const vis = ids.map(id => document.getElementById(id)).filter(b => b && b.closest('#hud .hud-btns') && !b.hidden);
      for (const id of ids) {
        const b = document.getElementById(id);
        if (!b || !b.closest('#hud .hud-btns')) continue;
        b.classList.add('tron'); b.dataset.lb = T.lb[id] || ''; if (attr) b.dataset[attr] = '1';
        if (attr && !b.hidden) b.style.setProperty('--' + attr, vis.length - 1 - vis.indexOf(b) + off);
      }
    };
    put(T.cot, 'cot'); put(T.tron2, 'tron2', 1); put([T.goc]);
    // hai hàng bên phải bắt đầu dưới việc truyện / bản đồ tròn
    const g = document.getElementById('goal')?.getBoundingClientRect(), mm = document.getElementById('mini-map')?.getBoundingClientRect();
    let top = Math.max(g && g.height ? g.bottom : 0, mm && mm.height ? mm.bottom + 14 : 0, 110) + 6;
    const card = document.querySelector('#uk-ava.v2') && document.querySelector('#hud .bars')?.getBoundingClientRect();   // khung trên mới, màn hẹp: khay nút chạm thẻ nhân vật thì hạ xuống dưới thẻ
    const xs = [...document.querySelectorAll('#hud .hud-btns > button.tron[data-cot], #hud .hud-btns > button.tron[data-tron2]')].map(b => b.getBoundingClientRect()).filter(r => r.width).map(r => r.left);
    if (card && card.width && xs.length && Math.min(...xs) - 7 < card.right) top = Math.max(top, Math.round(card.bottom + 12));
    document.body.style.setProperty('--cot-top', Math.round(top) + 'px');
    return Math.round(top);
  }
  apply(); place(); every(place, 2000); addEventListener('resize', place);
  const hud = document.getElementById('hud');   // màn chơi vừa hiện: xếp ngay, không đợi lượt 2 giây
  if (hud) new MutationObserver(() => { if (!hud.hidden) place(); }).observe(hud, { attributes: true, attributeFilter: ['hidden'] });
}
