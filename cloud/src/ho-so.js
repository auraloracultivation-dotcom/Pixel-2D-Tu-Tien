// Hồ sơ thật của người vào phòng: đọc dòng của chính họ trong p2d_nhan_vat bằng vé của họ (RLS chỉ cho đọc dòng mình):
// tên hiển thị, lực chiến máy chủ đang giữ (đã qua chống hack); cờ đỏ hỏi p2d_co_toi (bảng cờ đỏ thật p2d_co_do, trừ tài khoản miễn
// khoá — 06/11/2026: trước đây lấy nghi_van ≥ 10 nên Đại Ma Thần, nghi_van tích từ cảnh báo lực chiến, bị chặn thưởng boss).
// Giữ 60 giây trong bộ nhớ.
const cache = new Map();

export async function profileOf(uid, token, env) {
  const c = cache.get(uid);
  if (c && Date.now() - c.at < 60000) return c.v;
  try {
    const h = { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${token}` };
    const [r, rc] = await Promise.all([
      fetch(`${env.SUPABASE_URL}/rest/v1/p2d_nhan_vat?select=ten,luc_chien&user_id=eq.${encodeURIComponent(uid)}`, { headers: h }),
      fetch(`${env.SUPABASE_URL}/rest/v1/rpc/p2d_co_toi`, { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: '{}' }),
    ]);
    if (!r.ok) return null;
    const row = (await r.json())[0], co = rc.ok ? (await rc.json().catch(() => false)) === true : false;
    const v = row ? { name: String(row.ten || 'Đạo hữu').slice(0, 24), power: Math.max(0, Number(row.luc_chien) || 0), co } : null;
    if (cache.size > 5000) cache.clear();
    cache.set(uid, { at: Date.now(), v });
    return v;
  } catch { return null; }
}
