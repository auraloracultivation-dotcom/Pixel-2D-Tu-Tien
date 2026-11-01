// Nút trên màn hình theo nhóm A–L chủ dự án gom (02/11/2026 03:43; danh sách ở data/menu.json → hud.list).
// Nút có sẵn thì dời vào đúng chỗ và đổi chữ; nút chưa có thì tạo (Bí cảnh, Sự kiện, Đạo Vận bấm hộ như ô Menu).
// Nút không có trong danh sách (tiếng, Zalo, báo lỗi, đề xuất…) dời vào #hud-menu (luôn ẩn), mở từ Menu → Cài đặt, liên hệ.
// show: 'badge' chỉ hiện khi có số chưa xem, 'on' chỉ hiện khi đang bật (nút quay clip đang quay).
// Vài nút được tạo muộn (quay clip nạp sau): mỗi giây xếp lại nếu lệch.
export function orderHud(game) {
  const H = game.data.menu?.hud, bar = document.querySelector('.hud-btns'), stash = document.getElementById('hud-menu');
  if (!H || !bar || !stash) return;
  const setLabel = (b, t) => { const n = [...b.childNodes].find(x => x.nodeType === 3); if (n) n.textContent = t; else b.prepend(t); };
  const made = new Set();
  function make(e) {
    const b = document.createElement('button'); b.id = e.id; b.textContent = e.label || '';
    b.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      if (!game.save || game.dialog.open || game.trip) return;
      if (e.dun) game.openDungeons?.(); else if (e.hub) game.openHub?.(e.hub); else game.openOldPanel?.(e);
    });
    return b;
  }
  function place() {
    const want = [];
    for (const e of H.list) {
      let b = document.getElementById(e.id);
      if (!b && (e.dun || e.btn || e.hub)) b = make(e);
      if (!b) continue;
      if (e.label && !made.has(e.id)) { setLabel(b, e.label); made.add(e.id); }
      if (e.where === 'home') b.hidden = game.map?.id !== game.data.home?.map;
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
  place(); setInterval(place, 1000);
}
