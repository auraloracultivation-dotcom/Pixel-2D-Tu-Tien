// Hệ Thống chạy lung tung trên màn hình như thú cưng tò mò (data/he-thong.json → dao; chủ dự án 06/11/2026 19:29): bay tới một nút
// đang hiện (hoặc một chỗ trống), dừng lại ngó nghiêng với biểu cảm tò mò (mat.ev.tim), cứ mumble_every lần dừng thì lẩm bẩm một câu
// về thứ nó đang xem (tên nút). Đang nhắc việc (dòng nhắc hiện), đang mở bảng, đang chuyến bay: đứng yên. Không che nút Đánh, Lướt.
// Đang có khung thoại: không đậu đè lên chữ thoại (14/11/2026: nó bay tới nút pháp bảo vừa hiện, nút ấy nằm dưới khung thoại, che mất nửa câu đang đọc):
// không chọn nút nằm dưới khung, đang ở dưới thì lướt lên ngay trên mép khung.
// step(dt): gọi mỗi khung hình. Trả { x, y } chỗ biểu tượng để đặt dòng nhắc cạnh đó.

export function createWander(game, ic, face, D) {
  const pos = { x: innerWidth - 80, y: innerHeight * 0.55 }, st = { mode: 'look', t: 1.5, tgt: null, stops: 0, flip: 1, say: null };
  const label = e => (e.getAttribute('aria-label') || e.title || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18);
  const skip = new Set(D.skip || []);
  let dTop = Infinity, dAt = 0;
  // bố cục hai bảng (src/ui/hud-bang.js): chỉ đi trong khoảng trống giữa bảng trên và bảng dưới, không ngó nút trong bảng (đứng cạnh là đè ô bên)
  let zAt = 0, zone = null;
  const band = () => { const now = performance.now(); if (zone && now - zAt < 500) return zone; zAt = now; const t = document.getElementById('bang-tren'), b = document.getElementById('bang-duoi'); return (zone = { t: t && !t.hidden ? t.getBoundingClientRect().bottom + 4 : 40, b: b && !b.hidden ? b.getBoundingClientRect().top - 58 : innerHeight - 8 }); };   // chừa hàng Lướt, Tự đánh ngay trên bảng dưới
  function dlgTop() {   // mép trên khung thoại đang mở, kể cả thẻ tên và hình người nói (đo lại mỗi 0,3 giây); không có thoại: vô cực
    if (!game.dialog?.open) return (dTop = Infinity);
    const now = performance.now();
    if (now - dAt > 300 || dTop === Infinity) {
      dAt = now; const d = document.getElementById('dialog');
      dTop = d && !d.hidden ? Math.min(d.getBoundingClientRect().top, ...[...d.children].map(c => (c.offsetParent ? c.getBoundingClientRect().top : Infinity))) : Infinity;
    }
    return dTop;
  }
  function pick() {
    const W = innerWidth, S = ic.offsetWidth || 56, SH = ic.offsetHeight || 50, Z = band(), H = Z.b + 10, top = dlgTop();
    const list = [...document.querySelectorAll('button')].filter(e => {
      if (skip.has(e.id) || e === ic || !e.offsetParent || e.closest('.panel, #dialog, .ht-back, .ht-icon, #bag')) return false;
      const r = e.getBoundingClientRect();
      return r.width > 12 && r.width < W * 0.6 && r.top > Z.t && r.bottom < Math.min(H - 10, top - 6) && r.left >= 0 && r.right <= W;
    });
    if (list.length && Math.random() < 0.8) {
      const e = list[Math.floor(Math.random() * list.length)], r = e.getBoundingClientRect();
      const left = r.left > S + 8 && (r.right + S + 8 > W || Math.random() < 0.5);   // ngó từ bên cạnh, không đè lên nút
      return { x: left ? r.left - S + 6 : r.right - 6, y: r.top + r.height / 2 - SH / 2 - 6, name: label(e) };
    }
    return { x: 20 + Math.random() * (W - S - 40), y: Z.t + 50 + Math.random() * Math.max(10, Math.min(H - Z.t - SH - 210, top - Z.t - SH - 60)), name: '' };
  }
  function arrive() {
    face.react('tim');
    st.mode = 'look'; st.stops++;
    const [a, b] = D.pause || [2, 5]; st.t = a + Math.random() * (b - a);
    if (st.stops % (D.mumble_every || 3) === 0) {
      const n = st.tgt?.name, L = n ? D.mumble : D.plain;
      st.say = L?.length ? L[Math.floor(Math.random() * L.length)].replace('{x}', n) : null;
    }
  }
  return {
    pos,
    drop() { st.mode = 'look'; st.tgt = null; st.t = 5 + Math.random() * 3; },   // bị người chơi kéo thả: đứng hờn ở chỗ mới một lúc rồi mới đi tiếp
    get say() { const s = st.say; st.say = null; return s; },   // câu lẩm bẩm vừa có (lấy một lần)
    step(dt, hold) {
      const S = ic.offsetWidth || 56, SH = ic.offsetHeight || 50;
      if (!hold) {
        // Hệ Thống đang CHÉP một dòng vào sổ Trấn Ma Kỷ (hàng chữ lớn có nhãn "Trấn Ma Kỷ chép", src/ui/chu-lon.js đặt game.chepO = chỗ cuối nhãn): bay nhanh
        // tới đậu ngay cuối nhãn như người cầm bút, nhún nhanh như đang viết; hết dòng thì đi ngó nghiêng tiếp. Người chơi đã khoá biểu tượng (hold) thì thôi.
        const C = game.chepO;
        if (C) { st.tgt = { x: C.x, y: C.yb - SH, name: '' }; st.mode = 'move'; }
        else if (st.chep) { st.chep = 0; st.mode = 'look'; st.t = 1.2; }
        if (st.mode === 'look') { st.t -= dt; if (st.t <= 0) { st.tgt = pick(); st.mode = 'move'; } }
        else {
          const dx = st.tgt.x - pos.x, dy = st.tgt.y - pos.y, d = Math.hypot(dx, dy), v = (C ? Math.max(D.speed || 60, d / 0.22) : D.speed || 60) * dt;
          if (Math.abs(dx) > 2) st.flip = dx < 0 ? -1 : 1;
          if (d <= v) { pos.x = st.tgt.x; pos.y = st.tgt.y; if (!C) arrive(); else if (!st.chep) { st.chep = 1; face.react('tim'); } } else { pos.x += dx / d * v; pos.y += dy / d * v; }
        }
      }
      const lim = dlgTop() - SH - 10;   // có khung thoại: lướt lên trên mép khung (kể cả khi đang đứng nhắc việc)
      const chip = document.getElementById('nv-hud');   // thẻ nhiệm vụ chính (góc trái dưới khung nhân vật): không đậu đè lên. Thẻ rộng 204–224, cao thêm khi việc dài hai dòng
      if (chip && !chip.hidden) { const cr = chip.offsetLeft + chip.offsetWidth + 4, cb = chip.offsetTop + chip.offsetHeight + 6, ct = chip.offsetTop - SH; if (pos.x < cr && pos.y > ct && pos.y < cb) { pos.y += (cb - pos.y) * Math.min(1, dt * 8); if (st.tgt && st.tgt.x < cr && st.tgt.y > ct && st.tgt.y < cb) st.tgt.y = cb; } }
      const cl = !game.chepO && document.getElementById('chu-lon');   // hàng chữ lớn đang hiện (khẩu quyết, kỹ năng vừa học) mà không phải dòng chép sổ: dạt sang phải, không che chữ
      if (cl && !cl.hidden) { const r = cl.getBoundingClientRect(); if (r.width && pos.x < r.right + 4 && pos.x + S > r.left && pos.y + SH > r.top && pos.y < r.bottom) { pos.x += (r.right + 6 - pos.x) * Math.min(1, dt * 8); if (st.tgt && st.tgt.x < r.right + 6) st.tgt.x = r.right + 6; } }
      if (pos.y > lim) { pos.y += (lim - pos.y) * Math.min(1, dt * 8); if (st.tgt && st.tgt.y > lim) st.tgt.y = lim; }
      pos.x = Math.max(4, Math.min(innerWidth - S - 4, pos.x)); const Z = band(); pos.y = Math.max(Z.t, Math.min(Z.b - SH, pos.y));
      const bob = Math.sin(performance.now() / (st.mode === 'move' ? 160 : 420)) * (st.mode === 'move' ? 3 : 1.5);
      ic.style.left = `${Math.round(pos.x)}px`; ic.style.top = `${Math.round(pos.y + bob)}px`;
      face.node.style.transform = st.flip < 0 ? 'scaleX(-1)' : '';
      return pos;
    },
  };
}
