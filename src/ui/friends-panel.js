// Bảng Bạn bè (Menu → Bạn bè, Động phủ → Nhà bạn bè): bạn, lời mời đến, lời mời đã gửi; nút Thăm nhà, Đồng ý, Từ chối, Huỷ.
// Kết bạn: chạm tên người chơi (bảng xếp hạng, kênh chat) → hồ sơ → Kết bạn. Luật ở máy chủ (src/game/friends.js).
import { friendList, addFriend, removeFriend, visitFriend } from '../game/friends.js';
import { realmLabel } from '../game/stats.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const ERR = { khong_thay: 'Không tìm thấy người này.', chinh_minh: 'Không tự kết bạn với mình được.', qua_nhieu_ban: 'Đã đủ 100 bạn.', qua_nhieu_loi_moi: 'Đang chờ quá nhiều lời mời, đợi người ta đồng ý đã.', chua_la_ban: 'Hai người chưa là bạn.', net: 'Mạng chập chờn, thử lại sau.' };
export const friendErr = e => ERR[e?.message] || ERR.net;

export function createFriendsPanel(game) {
  const root = el('div', 'panel ev-panel friends-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', '✕'), body = el('div', 'ev-body');
  head.append(el('b', null, 'Bạn bè'), x);
  root.append(head, body);
  document.body.append(root);
  const close = () => { root.hidden = true; game.uiOpen = false; };
  x.onclick = close;
  const say = t => body.prepend(el('p', 'fb-reward', t));

  async function render(note) {
    body.replaceChildren(el('p', null, 'Đang tải…'));
    if (!game.online) { body.replaceChildren(el('p', null, 'Đăng nhập tài khoản để kết bạn.')); return; }
    let list;
    try { list = await friendList(); } catch (e) { body.replaceChildren(el('p', null, friendErr(e))); return; }
    body.replaceChildren(el('p', null, 'Kết bạn: chạm tên người chơi ở bảng xếp hạng hoặc kênh chat → Kết bạn. Chọn nhà bạn để vào thăm.'));
    if (note) say(note);
    const groups = [['moi_toi', 'Lời mời kết bạn'], ['ban', 'Bạn bè'], ['toi_moi', 'Đã gửi lời mời']];
    for (const [tt, title] of groups) {
      const rows = list.filter(r => r.trang_thai === tt);
      if (!rows.length) continue;
      body.append(el('div', 'pf-label', `${title} (${rows.length})`));
      for (const r of rows) {
        const card = el('div', 'ev-note'), acts = el('div', 'pf-acts');
        card.append(el('b', 'ev-note-title', r.ten), el('p', null, realmLabel({ realm: r.canh_gioi, layer: r.tang }, game.data.realms)));
        const btn = (t, fn, cls = 'act-btn') => { const b = el('button', cls, t); b.onclick = async () => { b.disabled = true; try { await fn(); } catch (e) { say(friendErr(e)); b.disabled = false; } }; acts.append(b); };
        if (tt === 'ban') btn('Thăm nhà', async () => { close(); await visitFriend(game, r.k, r.ten); }, 'act-btn primary');
        if (tt === 'moi_toi') btn('Đồng ý', async () => { await addFriend(r.k); render(`Đã kết bạn với ${r.ten}.`); }, 'act-btn primary');
        btn(tt === 'ban' ? 'Huỷ bạn' : tt === 'moi_toi' ? 'Từ chối' : 'Rút lời mời', async () => { await removeFriend(r.k); render(); });
        if (game.openProfile) btn('Hồ sơ', async () => { close(); game.openProfile(r.k, r.ten); });
        card.append(acts); body.append(card);
      }
    }
    if (!list.length) body.append(el('p', 'muted', 'Chưa có bạn nào.'));
  }

  game.openFriends = () => {
    if (!game.save || game.dialog.open) return;
    for (const p of document.querySelectorAll('.panel, #bag')) if (p !== root && !p.hidden) p.querySelector('[id$="-close"]')?.click();
    game.uiOpen = true; root.hidden = false; render();
  };
}
