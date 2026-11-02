// Nhịp sống gửi máy chủ (supabase/migrations/20261031020000_p2d_nhip_song.sql): máy chủ chỉ cộng hạn mức Linh Thạch,
// nguyên liệu cho thời gian còn liên lạc. Trả true khi máy chủ nhận trong ms mili giây, false khi lỗi hoặc quá chậm.
import { supabase } from './client.js';

export async function beat(ms) {
  try {
    const call = supabase.rpc('p2d_nhip_song').then(({ error }) => !error);
    return await Promise.race([call, new Promise(ok => setTimeout(() => ok(false), ms))]);
  } catch { return false; }
}

// Một tài khoản một máy (supabase/migrations/20261102200000_p2d_mot_may.sql): vào game thì nhận mã phiên; nhịp sống bản 2
// trả { ok, khac }: khac = true khi máy khác đã vào sau (máy này phải thoát).
export async function claimSession(phien) {
  const { error } = await supabase.rpc('p2d_phien_dat', { p_phien: phien });
  return !error;
}
export async function beat2(phien, ms) {
  try {
    const call = supabase.rpc('p2d_nhip_song2', { p_phien: phien }).then(({ data, error }) => (error ? { ok: false } : { ok: true, khac: !!data?.khac }));
    return await Promise.race([call, new Promise(ok => setTimeout(() => ok({ ok: false }), ms))]);
  } catch { return { ok: false }; }
}
