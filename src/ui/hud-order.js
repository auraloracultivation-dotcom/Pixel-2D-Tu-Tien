// Nút trên màn hình theo nhóm A–L chủ dự án gom (02/11/2026 03:43; danh sách ở data/menu.json → hud.list).
// Nút có sẵn thì dời vào đúng chỗ và đổi chữ; nút chưa có thì tạo. Mỗi nút đúng một việc (chủ dự án 02/11/2026 10:50):
// nav = cột mục bên trái (Túi đồ, Menu, Động phủ: src/ui/side-nav.js), open = game.open<Tên> (Sự kiện → giới thiệu nhận quà),
// social = bảng Đạo hữu mở thẳng một phần (Xếp hạng), btn = bấm hộ nút bảng cũ (Nhiệm vụ), link = mở trang ngoài (TikTok). Bấm nút nào cũng đóng bảng đang mở.
// Nút không có trong danh sách (tiếng, Zalo, báo lỗi, đề xuất…) dời vào #hud-menu (luôn ẩn), mở từ Menu → Cài đặt, liên hệ.
// show: 'badge' chỉ hiện khi có số chưa xem, 'on' chỉ hiện khi đang bật (nút quay clip đang quay).
// Vài nút được tạo muộn (quay clip nạp sau): hai giây một lần xếp lại nếu lệch (trang ẩn thì thôi).
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt
export function orderHud(game) {
  const H = game.data.menu?.hud, bar = document.querySelector('.hud-btns'), stash = document.getElementById('hud-menu');
  if (!H || !bar || !stash) return;
  const setLabel = (b, t) => { const n = [...b.childNodes].find(x => x.nodeType === 3); if (n) n.textContent = t; else b.prepend(t); };
  const made = new Set();
  const auto = document.getElementById('btn-auto'), pad = document.getElementById('buttons');   // Tự đánh: xuống cụm nút đánh, cạnh nút chiêu linh thú
  if (auto && pad) { pad.append(auto); auto.classList.add('auto-dock'); }
  function make(e) {
    const b = document.createElement('button'); b.id = e.id; b.textContent = e.label || '';
    b.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      if (!game.save || game.dialog.open || game.trip) return;
      if (e.nav) { game.openNav?.(e.nav); return; }
      if (e.link) { const L = game.data.community?.[e.link]; if (L?.url) window.open(L.url, '_blank', 'noopener'); return; }   // TikTok: mở kênh (data/community.json)
      game.closeAll?.();
      if (e.toggle) game.toggleQuestDock?.();   // Nhiệm vụ: ẩn / hiện cột nhiệm vụ hằng ngày trên màn hình (src/ui/quest-dock.js)
      else if (e.dun) game.openDungeons?.();
      else if (e.social) game.openSocial?.(e.social);
      else if (e.open) game['open' + e.open[0].toUpperCase() + e.open.slice(1)]?.();
      else game.openOldPanel?.(e);
    });
    // Nút mở trang ngoài (TikTok, data/community.json): mở lúc chạm nhả (click). iPhone chặn mở thẻ mới từ pointerdown nên trước bấm không
    // ăn (chủ dự án 11/11/2026 20:45). Bị chặn thì dùng thẻ <a> tạm, vẫn trong cùng lần chạm.
    if (e.link) b.addEventListener('click', ev => {
      ev.stopPropagation();
      const L = game.data.community?.[e.link];
      if (!L?.url) return;
      const w = window.open(L.url, '_blank');   // không dùng 'noopener' ở đây: có nó thì luôn trả null, khỏi biết mở được chưa
      if (w) { try { w.opener = null; } catch { /* trang khác nguồn */ } return; }
      const a = document.createElement('a'); a.href = L.url; a.target = '_blank'; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove();
    });
    return b;
  }
  function place() {
    const want = [];
    for (const e of H.list) {
      let b = document.getElementById(e.id);
      if (!b && (e.dun || e.btn || e.nav || e.open || e.social || e.toggle || e.link)) b = make(e);
      if (!b) continue;
      if (e.label && !made.has(e.id)) { setLabel(b, e.label); made.add(e.id); }
      if (e.where === 'home') b.hidden = game.map?.id !== game.data.home?.map;
      if (e.link) b.hidden = !game.data.community?.[e.link]?.on;   // kênh tắt (on: false) thì ẩn nút
      if (e.show) b.hidden = e.show === 'on' ? !b.classList.contains('on') : !(b.querySelector('i') && !b.querySelector('i').hidden);
      if (e.badge) {   // chấm đỏ theo chấm của nút cũ (Việc)
        const src = document.getElementById(e.badge), on = !!src && !src.hidden;
        let dot = b.querySelector('i.hud-dot');
        if (on && !dot) { dot = document.createElement('i'); dot.className = 'hud-dot'; b.append(dot); }
        if (dot) dot.hidden = !on;
      }
      want.push(b);
    }
    const now = [...bar.children];
    if (now.length !== want.length || now.some((b, i) => b !== want[i])) {
      for (const b of now) if (!want.includes(b)) stash.append(b);
      for (const b of want) bar.append(b);
    }
    const chip = document.getElementById('btn-ev-gt');   // chip sự kiện giới thiệu: đã có nút Sự kiện
    if (chip && chip.parentElement !== stash) stash.append(chip);
  }
  // Bấm nút bảng nào trên màn hình cũng đóng bảng đang mở trước (không chồng hai bảng); Túi đồ, Menu, Động phủ tự lo (bấm lại là đóng)
  const own = new Set(['btn-bag', 'btn-menu', 'btn-auto', 'btn-mute', ...H.list.filter(e => e.nav).map(e => e.id)]);
  bar.addEventListener('pointerdown', ev => { const b = ev.target.closest('button'); if (b && !own.has(b.id)) game.closeAll?.(); }, true);
  place(); every(place, 2000);
}
