// PvP Ngoại Vực: người vừa gục trả nợ (supabase/migrations/20261106020000_p2d_pvp.sql p2d_pvp_tra). Máy chủ tự trừ trong bản lưu
// trên máy chủ, gửi đồ + Linh Thạch vào Hòm thư người hạ, trả { mat: [...], phien_ban } để máy này sửa y như vậy (game/pvp.js).
import { supabase } from './client.js';

export async function settlePvp() {
  const { data, error } = await supabase.rpc('p2d_pvp_tra');
  if (error) throw error;
  return data;
}
