// Hòm thư (data/inbox.json): kho tin trong máy theo tài khoản, không vào bản lưu máy chủ.
// notify thêm hoặc cập nhật một tin theo key (cùng key thì thay chữ, đưa lên đầu, đánh dấu chưa đọc).
// mark: mốc của từng nguồn tin (tin thế giới đã xem tới đâu, tông môn, lời đáp báo lỗi...) để mở lại game không báo lại tin cũ.
// Tin: { key, kind, title, text, t, read, go, arg }; go là việc làm khi chạm tin (src/ui/inbox-panel.js).
const STORE = 'p2d.inbox.v1:';
const C = game => game.data.inbox;

function load(owner) {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(STORE + owner)); } catch { /* chế độ riêng tư: hòm thư chỉ sống trong phiên */ }
  return { owner, items: Array.isArray(d?.items) ? d.items : [], mark: d?.mark && typeof d.mark === 'object' ? d.mark : {} };
}

export function inboxState(game) {
  const owner = game.owner || 'guest';
  if (game.inbox?.owner !== owner) game.inbox = load(owner);
  return game.inbox;
}

export function saveInbox(game) {
  const s = inboxState(game);
  try { localStorage.setItem(STORE + s.owner, JSON.stringify({ items: s.items, mark: s.mark })); } catch { /* đầy bộ nhớ: bỏ qua */ }
}

function prune(game, s) {
  const cut = Date.now() - C(game).keep_days * 86400000;
  s.items = s.items.filter(it => it.t >= cut).slice(0, C(game).keep);
}

export function notify(game, it) {
  const s = inboxState(game), old = s.items.findIndex(x => x.key === it.key);
  if (old >= 0) s.items.splice(old, 1);
  s.items.unshift({ read: false, t: Date.now(), ...it });
  prune(game, s);
  saveInbox(game);
}

export const unreadCount = game => inboxState(game).items.filter(it => !it.read).length;

export function markRead(game, key) {
  const it = inboxState(game).items.find(x => x.key === key);
  if (it && !it.read) { it.read = true; saveInbox(game); }
}

export function readAll(game) {
  for (const it of inboxState(game).items) it.read = true;
  saveInbox(game);
}
