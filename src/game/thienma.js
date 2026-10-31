// Đại Ma Thần (chủ dự án 31/10/2026, tài liệu dự án y-tuong-thien-ma-ngoai-vuc.md): tài khoản admin xuất thế khi online. Ai từ
// Kim Đan trở lên khiêu chiến được, không giới hạn: nút trên màn hình (chỉ hiện khi Đại Ma Thần online) hoặc Đài Ma Thần ở
// Thiên Kiếm Phong. THẮNG THUA DO MÁY CHỦ QUYẾT trước khi vào trận (p2d_thien_ma_khieu_chien); trận So tài với bản sao Đại Ma
// Thần sau đó chỉ để xem. Thắng: Đạo Vận vàng vào Hòm thư. Thua: mất 10% tổng tu vi, nhận 1 viên ngọc cấp 4.
// Chữ ở data/duel.json → thien_ma.
import { startDuel } from './duel.js';
import { loadPlayer } from './profile.js';

const net = () => import('../net/thienma.js');
const T = game => game.data.duel.thien_ma;
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
let live = [], busy = false;

const on = game => !!(game.online && game.cloud && game.save);
export const tmLive = () => live.find(t => t.online) || null;

export function startThienMa(game) {
  const c = T(game);
  if (!c) return;
  const btn = document.createElement('button');
  btn.id = 'btn-thien-ma'; btn.textContent = c.text.btn; btn.hidden = true;
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); challenge(game); });
  document.getElementById('btn-world')?.after(btn);
  const poll = async () => {
    if (!on(game)) { btn.hidden = true; return; }
    try { live = (await (await net()).tmList()).filter(t => t.id !== game.online?.me?.id); } catch { /* mạng lỗi: lần sau */ }
    btn.hidden = !tmLive();
  };
  setInterval(poll, c.poll_s * 1000); setTimeout(poll, 3000);
}

export async function challenge(game) {
  const c = T(game), tm = tmLive();
  if (busy) return;
  if (!on(game)) { game.toast(c.text.login, 2.4); return; }
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
