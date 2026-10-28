// Lễ hội cho khung giao diện (style-khung.css): gắn body[data-le] để đổi đèn, màn đăng nhập (bí ngô Halloween, đèn đá Giáng sinh,
// dây đèn lồng Tết). Khoảng ngày ở data/light.json le (tháng-ngày, from > to là vắt qua năm mới). Hết mùa thì GIỮ giao diện lễ vừa qua
// cho tới khi lễ sau bắt đầu (chủ dự án 29/10/2026: "giữ đến event sau luôn"). Kiểm tra lại mỗi giờ.
const md = d => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const inside = (l, m) => l.from <= l.to ? m >= l.from && m <= l.to : m >= l.from || m <= l.to;

export function current(list, now = new Date()) {
  const m = md(now), on = list.find(l => inside(l, m));
  if (on) return on.id;
  // lễ đã qua gần nhất: ngày kết thúc (năm nay hoặc năm ngoái) trước hôm nay, gần nhất
  let best = null, bestT = -Infinity;
  for (const l of list) {
    const [mm, dd] = l.to.split('-').map(Number);
    let end = new Date(now.getFullYear(), mm - 1, dd);
    if (end > now) end = new Date(now.getFullYear() - 1, mm - 1, dd);
    if (+end > bestT) { bestT = +end; best = l.id; }
  }
  return best;
}

export function leHoi(game) {
  const list = game.data.light?.le || [];
  const check = () => { const id = current(list); if (id) document.body.dataset.le = id; else delete document.body.dataset.le; };
  check();
  setInterval(check, 3600e3);
}
