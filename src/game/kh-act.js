// Việc khai hoang gọi máy chủ ngoài trận Khai Tinh (src/net/khai-hoang.js): mua công trình, giao thợ, gửi ảnh công trình, khiêu chiến
// tinh cầu bỏ trống. Lỗi trả về câu trong data/khai-hoang.json (khErr).
import { khState, khLoad, khMine, khErr } from './khai-hoang.js';
import { checkImage } from './kh-anh.js';
import { startDuel } from './duel.js';
import { loadPlayer } from './profile.js';

const net = async () => (await import('../net/khai-hoang.js')).khCalls;
const K = game => game.data['khai-hoang'];
const fill = (s, o) => Object.entries(o).reduce((t, [k, v]) => t.split(`{${k}}`).join(v), s);

export async function khBuy(game, ma, so) { const r = await (await net()).buy(ma, so); await khMine(game); return r; }
export async function khAssign(game, k, on) { await (await net()).assign(k, on); await khMine(game); }

// Gửi ảnh: kiểm ở máy trước (kh-anh.js), rồi tải lên kho riêng tư và xếp hàng chờ duyệt
export async function khSendImage(game, file, tenCt, loai, tenNpc) {
  const A = K(game).anh, T = K(game).text, bad = await checkImage(file, A);
  if (bad) throw new Error(fill(T['anh_' + bad], A));
  if (!loai) throw new Error('loai_sai');
  const id = await (await net()).sendImage(file, tenCt.trim(), loai, tenNpc.trim());
  await khMine(game);
  return id;
}

// Khiêu chiến tông chủ cũ của tinh cầu bỏ trống: máy chủ quyết; trận so tài với bản sao tông chủ cũ để xem (như khiêu chiến Đại Ma Thần)
export async function khChallenge(game, p) {
  const T = K(game).text;
  let r;
  try { r = await (await net()).challenge(p.id); } catch (e) { game.toast(khErr(game, e), 3); return; }
  const text = r.thang ? fill(T.kc_win, { chu: r.chu_cu || p.chu_ten, ten: p.ten }) : fill(T.kc_lose, { chu: r.chu_cu || p.chu_ten, ta: r.ta, cu: r.cu });
  await Promise.all([khLoad(game), khMine(game)]).catch(() => {});
  let prof = null;
  try { prof = await loadPlayer(game, r.chu_k, true); } catch { /* không có hồ sơ: chỉ báo kết quả */ }
  if (prof?.save && await startDuel(game, { ...prof, ten: r.chu_cu })) { if (game.duel) game.duel.tmText = text; }
  else game.toast(text, 4);
  if (r.thang) khState(game).won = p.id;
}
