// Lưu nhân vật lên máy chủ qua hai hàm p2d_tai / p2d_luu (supabase/migrations). Chỉ dùng khi
// data/config.json bật "server_save"; mất mạng thì game vẫn chơi với bản lưu trong máy.
// Máy chủ giữ thật: Linh Thạch và nguyên liệu tăng theo hạn mức, Tiên Ngọc, chợ, hòm thư (migration 20261027140000).
// Lệnh nào sửa bản lưu ở máy chủ (rao bán, mua, nhận thư, Tiên Ngọc) chạy qua run(): đợi lần lưu đang gửi xong, đẩy
// bản mới nhất, gọi lệnh, nhận phien_ban mới; trong lúc đó không gửi bản lưu nào (khỏi bị coi là bản cũ).
import { supabase } from './client.js';

const WAIT_MS = 4000; // gom nhiều lần lưu liên tiếp thành một lần gửi

export function createCloudSave({ onConflict, onError }) {
  let version = 0, timer = null, pending = null, stopped = false, sending = null, busy = 0;
  const api = { name: '' };

  async function load() {
    const { data, error } = await supabase.rpc('p2d_tai');
    if (error) throw error;
    version = data?.phien_ban || 0;
    api.name = data?.ten || '';
    return data?.data || null;
  }

  async function send() {
    const body = pending; pending = null;
    const { data, error } = await supabase.rpc('p2d_luu', { p_data: body, p_phien_ban: version });
    if (!error) { version = data; return true; }
    if (error.message?.includes('phien_ban_cu')) { stopped = true; onConflict?.(); return false; }
    pending = pending || body; // lỗi mạng: giữ bản lưu, thử lại sau
    onError?.(error);
    return false;
  }

  async function flush() {
    timer = null;
    if (stopped || sending || busy || !pending) return;
    sending = send();
    await sending; sending = null;
    if (pending && !busy) schedule();
  }

  function schedule() { if (!timer && !stopped) timer = setTimeout(flush, WAIT_MS); }

  // Lưu bản sao để thay đổi sau đó không lẫn vào lần gửi đang chờ
  function save(s) { if (stopped) return; pending = JSON.parse(JSON.stringify(s)); schedule(); }

  // Chạy một lệnh sửa bản lưu ở máy chủ. fn trả về { phien_ban, ... }; mirror(kq) sửa bản lưu trong máy cho giống máy chủ
  // (rồi gọi game.persist như thường). Bản lưu chờ gửi được đẩy lên trước để máy chủ kiểm tra theo bản mới nhất.
  async function run(fn, mirror) {
    if (stopped) throw new Error('phien_ban_cu');
    busy++;
    try {
      clearTimeout(timer); timer = null;
      if (sending) await sending;
      if (pending) { sending = send(); const ok = await sending; sending = null; if (!ok && stopped) throw new Error('phien_ban_cu'); }
      const r = await fn();
      if (r && Number.isInteger(r.phien_ban)) version = r.phien_ban;
      mirror?.(r);
      return r;
    } finally {
      busy--;
      if (pending && !busy) schedule();
    }
  }

  return Object.assign(api, { load, save, flush, run });
}

// Đặt tên hiển thị (khác tên đăng nhập): 2–16 ký tự, mỗi ngày đổi một lần
export async function setDisplayName(ten) {
  const { data, error } = await supabase.rpc('p2d_dat_ten', { p_ten: ten });
  if (error) throw error;
  return data;
}

// Tiên Ngọc: máy chủ giữ số dư
export const topupCalls = {
  starter: () => rpc('p2d_qua_tn'),
  buy: ma => rpc('p2d_doi_tn', { p_ma: ma }),
  card: () => rpc('p2d_nhan_the'),
};

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}
