// Hồ sơ thật của người vào phòng: đọc dòng của chính họ trong p2d_nhan_vat bằng vé của họ (RLS chỉ cho đọc dòng mình):
// tên hiển thị, lực chiến máy chủ đang giữ (đã qua chống hack), cờ đỏ (nghi_van ≥ 10). Giữ 60 giây trong bộ nhớ.
const cache = new Map();

export async function profileOf(uid, token, env) {
  const c = cache.get(uid);
  if (c && Date.now() - c.at < 60000) return c.v;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/p2d_nhan_vat?select=ten,luc_chien,nghi_van&user_id=eq.${encodeURIComponent(uid)}`,
      { headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const row = (await r.json())[0];
    const v = row ? { name: String(row.ten || 'Đạo hữu').slice(0, 24), power: Math.max(0, Number(row.luc_chien) || 0), co: (row.nghi_van || 0) >= 10 } : null;
    if (cache.size > 5000) cache.clear();
    cache.set(uid, { at: Date.now(), v });
    return v;
  } catch { return null; }
}
