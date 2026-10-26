// Lưu nhân vật lên máy chủ qua hai hàm p2d_tai / p2d_luu (supabase/migrations). Chỉ dùng khi
// data/config.json bật "server_save"; mặc định tắt, game vẫn lưu trong máy cho tới khi chủ dự án duyệt.
import { supabase } from './client.js';

const WAIT_MS = 4000; // gom nhiều lần lưu liên tiếp thành một lần gửi

export function createCloudSave({ onConflict, onError }) {
  let version = 0, timer = null, pending = null, stopped = false, sending = false;

  async function load() {
    const { data, error } = await supabase.rpc('p2d_tai');
    if (error) throw error;
    version = data?.phien_ban || 0;
    return data?.data || null;
  }

  async function flush() {
    timer = null;
    if (stopped || sending || !pending) return;
    const body = pending; pending = null; sending = true;
    const { data, error } = await supabase.rpc('p2d_luu', { p_data: body, p_phien_ban: version });
    sending = false;
    if (!error) { version = data; if (pending) schedule(); return; }
    if (error.message?.includes('phien_ban_cu')) { stopped = true; onConflict?.(); return; }
    pending = pending || body; schedule(); // lỗi mạng: giữ bản lưu, thử lại sau
    onError?.(error);
  }

  function schedule() { if (!timer) timer = setTimeout(flush, WAIT_MS); }

  // Lưu bản sao để thay đổi sau đó không lẫn vào lần gửi đang chờ
  function save(s) { if (stopped) return; pending = JSON.parse(JSON.stringify(s)); schedule(); }

  return { load, save, flush };
}
