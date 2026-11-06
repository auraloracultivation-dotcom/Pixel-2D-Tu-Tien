// Hệ Thống chạy lung tung trên màn hình như thú cưng tò mò (data/he-thong.json → dao; chủ dự án 06/11/2026 19:29): bay tới một nút
// đang hiện (hoặc một chỗ trống), dừng lại ngó nghiêng với biểu cảm tò mò (mat.ev.tim), cứ mumble_every lần dừng thì lẩm bẩm một câu
// về thứ nó đang xem (tên nút). Đang nhắc việc (dòng nhắc hiện), đang mở bảng, đang chuyến bay: đứng yên. Không che nút Đánh, Lướt.
// step(dt): gọi mỗi khung hình. Trả { x, y } chỗ biểu tượng để đặt dòng nhắc cạnh đó.

export function createWander(game, ic, face, D) {
  const pos = { x: innerWidth - 80, y: innerHeight * 0.55 }, st = { mode: 'look', t: 1.5, tgt: null, stops: 0, flip: 1, say: null };
  const label = e => (e.getAttribute('aria-label') || e.title || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18);
  const skip = new Set(D.skip || []);
  function pick() {
    const W = innerWidth, H = innerHeight, S = ic.offsetWidth || 56, SH = ic.offsetHeight || 50;
    const list = [...document.querySelectorAll('button')].filter(e => {
      if (skip.has(e.id) || e === ic || !e.offsetParent || e.closest('.panel, #dialog, .ht-back, .ht-icon, #bag')) return false;
      const r = e.getBoundingClientRect();
      return r.width > 12 && r.width < W * 0.6 && r.top > 40 && r.bottom < H - 10 && r.left >= 0 && r.right <= W;
    });
    if (list.length && Math.random() < 0.8) {
      const e = list[Math.floor(Math.random() * list.length)], r = e.getBoundingClientRect();
      const left = r.left > S + 8 && (r.right + S + 8 > W || Math.random() < 0.5);   // ngó từ bên cạnh, không đè lên nút
      return { x: left ? r.left - S + 6 : r.right - 6, y: r.top + r.height / 2 - SH / 2 - 6, name: label(e) };
    }
    return { x: 20 + Math.random() * (W - S - 40), y: 90 + Math.random() * (H - SH - 260), name: '' };
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
    get say() { const s = st.say; st.say = null; return s; },   // câu lẩm bẩm vừa có (lấy một lần)
    step(dt, hold) {
      const S = ic.offsetWidth || 56, SH = ic.offsetHeight || 50;
      if (!hold) {
        if (st.mode === 'look') { st.t -= dt; if (st.t <= 0) { st.tgt = pick(); st.mode = 'move'; } }
        else {
          const dx = st.tgt.x - pos.x, dy = st.tgt.y - pos.y, d = Math.hypot(dx, dy), v = (D.speed || 60) * dt;
          if (Math.abs(dx) > 2) st.flip = dx < 0 ? -1 : 1;
          if (d <= v) { pos.x = st.tgt.x; pos.y = st.tgt.y; arrive(); } else { pos.x += dx / d * v; pos.y += dy / d * v; }
        }
      }
      pos.x = Math.max(4, Math.min(innerWidth - S - 4, pos.x)); pos.y = Math.max(40, Math.min(innerHeight - SH - 8, pos.y));
      const bob = Math.sin(performance.now() / (st.mode === 'move' ? 160 : 420)) * (st.mode === 'move' ? 3 : 1.5);
      ic.style.left = `${Math.round(pos.x)}px`; ic.style.top = `${Math.round(pos.y + bob)}px`;
      face.node.style.transform = st.flip < 0 ? 'scaleX(-1)' : '';
      return pos;
    },
  };
}
