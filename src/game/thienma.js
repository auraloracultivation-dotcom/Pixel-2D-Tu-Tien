// Đại Ma Thần (chủ dự án 31/10/2026, tài liệu dự án y-tuong-thien-ma-ngoai-vuc.md): tài khoản admin xuất thế khi online. Ai từ
// Kim Đan trở lên khiêu chiến được, không giới hạn, bằng cách chạm Đài Ma Thần ở
// góc trên bên phải Ngoại Vực Vết Nứt (đi lại quanh 2 ô). THẮNG THUA DO MÁY CHỦ QUYẾT trước khi vào trận (p2d_thien_ma_khieu_chien); trận So tài với bản sao Đại Ma
// Thần sau đó chỉ để xem. Thắng: Đạo Vận vàng vào Hòm thư. Thua: mất 10% tổng tu vi, nhận 1 viên ngọc cấp 4.
// Chữ ở data/duel.json → thien_ma.
import { startDuel } from './duel.js';
import { loadPlayer } from './profile.js';

const net = () => import('../net/thienma.js');
const T = game => game.data.duel.thien_ma;
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
let live = [], mine = null, busy = false, luc = 0, dangHoi = false;   // mine: chính mình là Đại Ma Thần; luc: lần hỏi máy chủ gần nhất

const on = game => !!(game.online && game.cloud && game.save);
export const tmLive = () => live.find(t => t.online) || null;

// Hỏi máy chủ ai đang xuất thế, CHỈ lúc chạm Đài Ma Thần (nút ⚔ trên màn hình đã bỏ 04/11/2026, không chỗ nào khác cần số này).
// Trước 20/11/2026 máy nào đã đăng nhập cũng hỏi poll_s = 20 giây một lần dù đứng ở đâu: 2,9 lệnh gọi máy chủ dữ liệu mỗi phút mỗi người online
// chỉ để phục vụ một cú chạm hiếm khi xảy ra (thiết kế máy chủ 1 000 người). Kết quả giữ fresh_s giây cho các lần chạm liền nhau.
async function hoi(game) {
  if (Date.now() - luc < (T(game).fresh_s ?? 5) * 1000) return;
  try { const all = await (await net()).tmList(), me = game.online?.me?.id; mine = all.find(t => t.id === me) || null; live = all.filter(t => t.id !== me); luc = Date.now(); } catch { /* mạng lỗi: dùng số lần trước */ }
}

export async function challenge(game) {
  const c = T(game);
  if (busy || dangHoi) return;
  if (!on(game)) { game.toast(c.text.login, 2.4); return; }
  dangHoi = true;
  try { await hoi(game); } finally { dangHoi = false; }
  const tm = tmLive();
  if (mine) { game.toast(fill(c.text.self, { name: mine.ten }), 3.5); return; }   // Đại Ma Thần chạm đài của chính mình
  if (!tm) { game.toast(c.text.away, 2.4); return; }
  if (game.save.realm < c.min_realm) { game.toast(c.text.err.chua_du, 2.4); return; }
  const ok = await game.dialog.choose(fill(c.text.ask, { name: tm.ten }), [{ id: 'yes', label: c.text.yes, desc: c.text.yes_desc }, { id: 'no', label: c.text.no, desc: '' }]);
  if (ok !== 'yes') return;
  busy = true;
  try {
    let prof = null;
    try { prof = await loadPlayer(game, tm.k, true); } catch { /* không dựng được bản sao: vẫn phân xử, không vào đài */ }
    const s = game.save;
    const r = await game.cloud.run(async () => (await net()).tmChallenge(tm.id), res => {
      if (res && !res.thang && res.sau) { s.realm = res.sau.realm; s.layer = res.sau.layer; s.qi = res.sau.qi; game.refreshStats(); game.persist(); }
    });
    const text = r.thang ? fill(c.text.win, { name: tm.ten }) : fill(c.text.lose, { name: tm.ten, realm: game.data.realms.names[r.sau.realm], layer: r.sau.layer });
    if (prof?.save && await startDuel(game, { ...prof, ten: tm.ten })) { if (game.duel) game.duel.tmText = text; }
    else game.toast(text, 4);
  } catch (e) {
    game.toast(c.text.err[e.message] || c.text.err.net, 2.6);
  } finally { busy = false; }
}
