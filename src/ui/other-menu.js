// Chạm người chơi khác trên bản đồ (chủ dự án 19/11/2026 10:21, theo góp ý của một người chơi: "bấm vào người khác chỉ thấy tắt khiên"):
// hiện ba nút bám ngay trên đầu người đó (10:37): Kết bạn, Xem thông tin (Hồ sơ), Truyền âm. Chạm chỗ khác, người đó
// đi khuất, mở bảng khác hoặc sau 8 giây thì thẻ tắt. Chữ ở data/social.json → nguoi, kiểu ở pvp.css (.om-*).
import { chatKey } from '../game/social.js';
import { addFriend } from '../game/friends.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createOtherMenu(game) {
  const T = game.data.social.nguoi;
  if (!T) return;
  const card = el('div', 'om-card'); card.hidden = true;
  const nm = el('b', 'om-name'), row = el('div', 'om-row');
  card.append(row);   // chỉ ba nút ngay trên đầu (tên họ đã hiện sẵn trên đầu; chủ dự án 19/11/2026 10:37)
  document.body.append(card);
  let who = null, until = 0;
  const close = () => { card.hidden = true; who = null; };
  const btn = (text, fn) => {
    const b = el('button', 'om-btn', text); b.type = 'button';
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); const o = who; if (!o) return; if (!game.online) { game.toast(T.offline, 2); return; } close(); fn(o, chatKey(o.id), o.def?.name || ''); });
    row.append(b);
  };
  btn(T.friend, async (o, k, ten) => {   // thứ tự chủ dự án 10:37: Kết bạn, Xem thông tin, Truyền âm
    try { const r = await addFriend(k); game.toast((r === 'thanh_ban' ? T.made : r === 'da_la_ban' ? T.already : T.sent).replace('{name}', ten), 2.4); }
    catch { game.toast(T.fail, 2.4); }
  });
  btn(T.info, (o, k, ten) => game.openProfile?.(k, ten));
  btn(T.chat, (o, k, ten) => game.openWhisper?.(k, ten));
  card.addEventListener('pointerdown', e => e.stopPropagation());

  // game.js updateTaps gọi khi chạm trúng một người chơi khác
  game.tapOther = o => {
    if (!o?.id) return;
    if (who === o && !card.hidden) { close(); return; }   // chạm lại người đó: tắt
    who = o; until = performance.now() + 8000;
    nm.textContent = o.def?.name || '';
    card.hidden = false; place();
  };
  game.closeOtherMenu = close;

  function place() {
    const o = who, s = game.screen.toScreen(o.x, o.y - (o.top || 24) - (o.riding ? o.lift || 0 : 0) - 16);
    const half = card.offsetWidth / 2, x = Math.min(innerWidth - half - 6, Math.max(half + 6, s.x)), y = Math.max(card.offsetHeight + 6, s.y);   // không tràn mép màn
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }
  let tf = 0;
  const frame = t => {
    requestAnimationFrame(frame);
    if (card.hidden || t - tf < 32) return; tf = t;
    const o = who;
    if (!o || t > until || game.uiOpen || game.dialog?.open || !game.others?.visible().includes(o)) { close(); return; }
    place();
  };
  requestAnimationFrame(frame);
}
