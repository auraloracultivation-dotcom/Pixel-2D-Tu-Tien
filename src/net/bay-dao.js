// Bày cảnh (supabase/migrations/20261109060000_p2d_bay_dao.sql): bố cục đồ mỗi bản đồ do chủ dự án tự bày trong game.
// Ai cũng đọc; chỉ người có quyền bày ghi được, qua hàm p2d_bay_luu (máy chủ kiểm quyền, kiểm dữ liệu, chép bản cũ vào lịch sử).
import { supabase } from './client.js';

async function rpc(fn, args) { const { data, error } = await supabase.rpc(fn, args); if (error) throw error; return data; }

// { map_id: { items, ver } } của mọi bản đồ đã bày (vài chục KB, tải một lần lúc vào game)
export async function layoutsAll() {
  const { data, error } = await supabase.from('p2d_bay_dao').select('map_id, items, ver');
  if (error) throw error;
  return Object.fromEntries((data || []).map(r => [r.map_id, { items: r.items, ver: r.ver }]));
}
export async function layoutOne(map) {
  const { data, error } = await supabase.from('p2d_bay_dao').select('items, ver').eq('map_id', map).maybeSingle();
  if (error) throw error;
  return data;
}
// Chưa có phiên đăng nhập (đang nạp, hết hạn) thì trả null, không gọi: máy chủ chỉ cho người đã đăng nhập, gọi bằng khoá khách sẽ bị 401 rác (10/11/2026: 77 lần/ngày)
export async function canArrange() {
  const { data } = await supabase.auth.getSession();
  if (!data?.session) return null;
  return rpc('p2d_bay_co_quyen');
}
export const saveLayout = (map, items, ver) => rpc('p2d_bay_luu', { p_map: map, p_items: items, p_ver: ver ?? null });
export const layoutHistory = map => rpc('p2d_bay_lich_su', { p_map: map });
export const layoutRestore = id => rpc('p2d_bay_lay_lai', { p_id: id });
