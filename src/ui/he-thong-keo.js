// Kéo Hệ Thống đi chỗ khác (chủ dự án 07/11/2026 02:10): giữ biểu tượng rồi kéo (quá 8px mới tính là kéo, chạm nhẹ vẫn mở bảng).
// Đang bị kéo: mặt cau có (mat.ev.keo), nói một câu càu nhàu dễ thương (dao.keo); thả ra: dỗi rồi nói câu khác (mat.ev.tha, dao.tha),
// đứng ở chỗ mới một lúc rồi mới đi lung tung tiếp. Kéo lâu thì càu nhàu thêm (dao.keo_lau, mỗi keo_s giây).
// getPos(): đối tượng { x, y } vị trí đang dùng (của he-thong-dao.js) hoặc null; onDrop({ x, y }) báo chỗ mới.
const pick = a => a?.length ? a[Math.floor(Math.random() * a.length)] : '';

export function makeDraggable(game, ic, tip, face, D, getPos, onDrop) {
  let d = null, tSay = 0;
  const say = text => {
    if (!text) return;
    tip.textContent = text; tip.hidden = false;
    clearTimeout(tSay); tSay = setTimeout(() => { if (!d) tip.hidden = true; }, 3500);
  };
  const put = (x, y) => {
    const S = ic.offsetWidth || 56, SH = ic.offsetHeight || 50, W = innerWidth;
    x = Math.max(4, Math.min(W - S - 4, x)); y = Math.max(40, Math.min(innerHeight - SH - 8, y));
    const p = getPos(); if (p) { p.x = x; p.y = y; }
    ic.style.left = `${Math.round(x)}px`; ic.style.top = `${Math.round(y)}px`;
    if (x > W / 2) { tip.style.left = ''; tip.style.right = `${Math.round(W - x + 6)}px`; } else { tip.style.right = ''; tip.style.left = `${Math.round(x + S + 6)}px`; }
    tip.style.top = `${Math.round(y)}px`;
    return { x, y };
  };
  ic.addEventListener('pointerdown', e => {
    const r = ic.getBoundingClientRect();
    d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, on: false, at: 0 };
  });
  ic.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.on) {
      if (Math.hypot(dx, dy) < 8) return;
      d.on = true; d.at = performance.now(); ic.setPointerCapture?.(e.pointerId); ic.classList.add('keo');
      face.react('keo'); say(pick(D.keo)); game.sfx?.('hit');
    }
    const now = performance.now();
    if (now - d.at > (D.keo_s || 3) * 1000) { d.at = now; face.react('keo'); say(pick(D.keo_lau || D.keo)); }
    d.last = put(d.ox + dx, d.oy + dy);
    e.preventDefault();
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const was = d.on, last = d.last; d = null;
    if (!was) return;
    ic.classList.remove('keo'); ic.dataset.keo = '1'; setTimeout(() => { delete ic.dataset.keo; }, 400);   // chặn cú click ngay sau khi thả
    face.react('tha'); say(pick(D.tha));
    if (last) onDrop(last);
  };
  ic.addEventListener('pointerup', end);
  ic.addEventListener('pointercancel', end);
}
