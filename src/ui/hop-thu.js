// Nút Thư gộp (chủ dự án 04/11/2026 09:31: "4 mục Zalo, đề xuất, báo lỗi, thư… dồn hết vào trong thư"): một nút Thư trên màn hình
// (data/menu.json → hud.list, open: hopThu), chạm mở hộp nhỏ ngay dưới nút với bốn dòng Hòm thư, Zalo, Đề xuất, Báo lỗi. Mỗi dòng
// bấm hộ nút cũ (các nút cũ vẫn còn, cất trong #hud-menu): Hòm thư nghe pointerdown, Zalo và hai nút góp ý nghe click.
// Chấm đỏ trên nút Thư khi có thư chưa đọc hoặc quà Zalo chưa nhận. Kiểu ở style-ui-kit3.css.
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const ROWS = [
  { id: 'btn-inbox', label: 'Hòm thư', ev: 'pointerdown' },
  { id: 'btn-zalo', label: 'Zalo', ev: 'click' },
  { id: 'btn-fb-de_xuat', label: 'Đề xuất', ev: 'click' },
  { id: 'btn-fb-loi', label: 'Báo lỗi', ev: 'click' },
];

export function createHopThu(game) {
  const box = document.createElement('div'); box.id = 'hop-thu'; box.hidden = true;
  document.body.append(box);
  box.addEventListener('pointerdown', e => e.stopPropagation());
  const hot = id => {   // dòng có tin: thư chưa đọc (số), quà Zalo
    const b = document.getElementById(id);
    if (id === 'btn-inbox') { const i = b?.querySelector('.ib-badge'); return i && !i.hidden ? i.textContent : ''; }
    return id === 'btn-zalo' && b?.classList.contains('gift') ? '!' : '';
  };
  function paint() {
    box.replaceChildren();
    for (const r of ROWS) {
      const src = document.getElementById(r.id);
      if (!src) continue;
      const row = document.createElement('button'); row.className = 'ht-row'; row.dataset.k = r.id; row.textContent = r.label;
      const n = hot(r.id); if (n) { const i = document.createElement('i'); i.textContent = n; row.append(i); }
      row.onclick = () => { box.hidden = true; src.dispatchEvent(r.ev === 'click' ? new MouseEvent('click', { bubbles: true }) : new PointerEvent('pointerdown', { bubbles: true })); };
      box.append(row);
    }
  }
  function place() {
    const b = document.getElementById('hud-thu')?.getBoundingClientRect();
    if (!b) return;
    box.style.top = Math.round(b.bottom + 4) + 'px';
    box.style.right = Math.max(6, Math.round(innerWidth - b.right - 30)) + 'px';
  }
  game.openHopThu = () => {
    if (!box.hidden) { box.hidden = true; return; }
    paint(); place(); box.hidden = false;
  };
  // chạm ra ngoài thì đóng
  addEventListener('pointerdown', e => { if (!box.hidden && !box.contains(e.target) && e.target.id !== 'hud-thu') box.hidden = true; }, true);
  every(() => {
    const t = document.getElementById('hud-thu');
    if (t) t.classList.toggle('co', !!(hot('btn-inbox') || hot('btn-zalo')));
    if (!box.hidden && (game.trip || game.dialog.open)) box.hidden = true;
  }, 1000);
}
