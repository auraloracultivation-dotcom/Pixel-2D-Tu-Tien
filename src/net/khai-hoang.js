// Khai Hoang Tinh Cầu: gọi các hàm p2d_kh_* (supabase/migrations/20261112130000_p2d_khai_hoang.sql). Máy chủ kiểm hết (tông chủ,
// cảnh giới, kho đủ mảnh và Linh Thạch, vé trận, thời gian trận); máy khách chỉ gửi yêu cầu.
import { supabase } from './client.js';

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const khCalls = {
  list: () => rpc('p2d_kh_ds'),                                           // tinh cầu đang hiện trên Vành Khai Hoang (ai cũng đọc)
  mine: () => rpc('p2d_kh_toi'),                                          // kho, người góp nhiều, tinh cầu và trận của tông môn mình
  give: (manh, lt) => rpc('p2d_kh_gop', { p_manh: manh, p_lt: lt }),      // góp vào kho: trừ trong bản lưu trên máy chủ
  open: (ten, dat) => rpc('p2d_kh_mo_tran', { p_ten: ten || '', p_dat: dat || '' }),   // tông chủ mở trận Khai Tinh / nâng cấp
  win: ve => rpc('p2d_kh_thang', { p_ve: ve }),                           // tông chủ hạ trùm: máy chủ trừ kho, khai / nâng cấp
  lose: ve => rpc('p2d_kh_thua', { p_ve: ve }),
  visit: id => rpc('p2d_kh_ghe', { p_id: id }),                           // thành viên ghé tinh cầu của mình (giữ khỏi ma khí)
  buy: (ma, so) => rpc('p2d_kh_mua', { p_ma: ma, p_so: so }),             // tông chủ mua công trình / đồ trang trí bằng kho
  assign: (k, on) => rpc('p2d_kh_giao', { p_k: k, p_on: on }),            // giao / thôi giao trưởng lão bày tinh cầu
  saveLayout: (id, items, ver) => rpc('p2d_kh_bay_luu', { p_tinh: id, p_items: items, p_ver: ver ?? null }),
  history: id => rpc('p2d_kh_bay_ls', { p_tinh: id }),
  restore: hid => rpc('p2d_kh_bay_lay', { p_id: hid }),
  challenge: id => rpc('p2d_kh_khieu_chien', { p_tinh: id }),             // khiêu chiến tinh cầu bỏ trống: máy chủ quyết thắng thua
  // Gửi ảnh công trình: tải lên kho riêng tư kh-anh (thư mục mã tài khoản), rồi xếp hàng chờ duyệt
  async sendImage(file, tenCt, loai, tenNpc) {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) throw new Error('chua_luu');
    const ext = file.type === 'image/webp' ? 'webp' : 'png', path = `${u.user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('kh-anh').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return rpc('p2d_kh_anh_gui', { p_duong: path, p_ten_ct: tenCt, p_loai: loai, p_ten_npc: tenNpc });
  },
};
