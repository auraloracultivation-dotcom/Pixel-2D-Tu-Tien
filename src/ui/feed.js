// Cột thông báo nhận được bên trái màn hình (chủ dự án 29/10/2026: linh khí, Linh Thạch, nhặt đồ bay trên đầu nhân vật chồng chữ
// đau mắt). Máu và sát thương vẫn bay trên đầu (combat.js addNumber). Dòng cùng loại trong lúc còn hiện thì cộng dồn số;
// tối đa MAX dòng, mỗi dòng hiện LIFE giây rồi mờ. Phần tử tự tạo (không sửa index.html), kiểu ở style-khung.css (#feed).
const MAX = 5, LIFE = 3.2;

const fmt = n => (Math.round(n * 10) / 10).toLocaleString('vi-VN');

export function createFeed(game) {
  const box = document.createElement('div');
  box.id = 'feed';
  document.body.append(box);
  const lines = [];   // { el, key, sum, unit, t }

  function drop(L) { L.el.remove(); lines.splice(lines.indexOf(L), 1); }

  // text: "+12.5 linh khí" (cộng dồn theo đơn vị) hoặc chữ thường ("Nhặt [Linh] Thiết Kiếm"); color: màu chữ
  game.feed = (text, color = '#ffe6a0') => {
    const m = /^\+([\d.,]+) (.+)$/.exec(String(text)), now = performance.now() / 1000;
    const key = m ? 'g|' + m[2] : 't|' + text;
    let L = lines.find(l => l.key === key && now - l.t < LIFE);
    if (L) {
      if (m) { L.sum += parseFloat(m[1].replace(',', '.')); L.el.textContent = `+${fmt(L.sum)} ${m[2]}`; }
      else L.n = (L.n || 1) + 1, L.el.textContent = `${text} ×${L.n}`;
      L.t = now; L.el.classList.remove('out'); L.el.classList.add('bump'); setTimeout(() => L.el.classList.remove('bump'), 160);
      box.append(L.el);   // dòng vừa cộng xuống cuối (mới nhất)
      return;
    }
    const el = document.createElement('div');
    el.className = 'feed-line'; el.style.color = color;
    L = { el, key, t: now, sum: m ? parseFloat(m[1].replace(',', '.')) : 0 };
    el.textContent = m ? `+${fmt(L.sum)} ${m[2]}` : String(text);
    place(); lines.push(L); box.append(el);
    while (lines.length > MAX) drop(lines[0]);
  };

  // cột bám ngay dưới hàng nút bảng điều khiển (hàng nút có thể mọc thêm dòng: nút Thông báo, chip sự kiện), không đè lên nhau
  const place = () => { const r = document.querySelector('.hud-btns')?.getBoundingClientRect(); if (r && r.height) box.style.top = Math.round(r.bottom + 8) + 'px'; };

  setInterval(() => {   // mờ rồi bỏ dòng cũ
    if (lines.length) place();
    const now = performance.now() / 1000;
    for (const L of [...lines]) {
      if (now - L.t > LIFE) drop(L);
      else if (now - L.t > LIFE - 0.6) L.el.classList.add('out');
    }
  }, 200);
}
