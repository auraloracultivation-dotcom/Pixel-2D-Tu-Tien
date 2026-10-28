// Lễ hội cho khung giao diện (style-khung.css): đúng mùa thì gắn body[data-le] để đổi đèn (bí ngô Halloween, đèn đá Giáng sinh,
// dây đèn lồng Tết). Khoảng ngày ở data/light.json le (tháng-ngày, from > to là vắt qua năm mới). Kiểm tra lại mỗi giờ.
export function leHoi(game) {
  const list = game.data.light?.le || [];
  const check = () => {
    const d = new Date(), md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const on = list.find(l => l.from <= l.to ? md >= l.from && md <= l.to : md >= l.from || md <= l.to);
    if (on) document.body.dataset.le = on.id; else delete document.body.dataset.le;
  };
  check();
  setInterval(check, 3600e3);
}
