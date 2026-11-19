// Chọn số lượng khi mua (góp ý người chơi 19/11/2026, chủ dự án 20/11/2026 01:20 "mua số lượng lớn"): sau khi chọn món ở quầy,
// hiện ×1 / ×10 / ×50 / Tối đa / Nhập số; max là số mua được nhiều nhất (đủ Linh Thạch, còn lượt trong ngày, trần quầy).
// Chữ ở data/shop.json → qty. Trả số đã chọn (≥ 1) hoặc 0 khi thôi.
const vn = n => Math.round(n).toLocaleString('vi-VN');

export async function pickQty(game, title, unit, max) {
  const T = game.data.shop.qty || {}, cap = Math.max(0, Math.floor(max));
  if (cap <= 1) return cap;
  const opts = [];
  for (const n of T.steps || [1, 10, 50]) if (n < cap) opts.push({ id: String(n), label: `×${n}`, desc: `${vn(unit * n)} ${T.cur || 'Linh Thạch'}` });
  opts.push({ id: String(cap), label: (T.max || 'Tối đa') + ` ×${cap}`, desc: `${vn(unit * cap)} ${T.cur || 'Linh Thạch'}`, color: '#f2c94c' });
  opts.push({ id: 'nhap', label: T.type || 'Nhập số', desc: '' }, { id: 'thoi', label: T.no || 'Thôi', desc: '' });
  const pick = await game.dialog.choose(title, opts);
  if (!pick || pick === 'thoi') return 0;
  if (pick !== 'nhap') return Math.min(cap, +pick || 0);
  const raw = await game.dialog.ask((T.ask || 'Mua bao nhiêu? (tối đa {n})').replace('{n}', cap), '1', 5, T.ok || 'Mua', T.no || 'Thôi');
  const n = Math.floor(Number(String(raw || '').replace(/\D/g, '')));
  return Number.isFinite(n) && n > 0 ? Math.min(cap, n) : 0;
}
