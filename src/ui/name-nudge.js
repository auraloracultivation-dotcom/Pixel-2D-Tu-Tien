// Nhắc đặt tên (chủ dự án chốt 29/10/2026): tài khoản tạo từ 27/10 mang tên mặc định "Đạo hữu XXXX" (không lộ tên đăng nhập),
// nhiều người không biết nút "✎ Tên" trong bảng Đạo hữu nên bảng xếp hạng toàn "Đạo hữu ...". Còn tên mặc định thì mỗi ngày
// hỏi một lần lúc rảnh tay (đợi qua phần hướng dẫn đầu game). Chữ ở data/notice.json → name_nudge, lỗi dùng data/social.json → name.err.
// Kiểu dùng chung src/ui/event.css (bảng thông báo đã nạp). Cùng bảng này dùng để đổi tên: game.openRename (chạm tên trên màn hình, nút Đổi tên ở bảng Đạo hữu).
const KEY = 'p2d.name-nudge';
const DEF = /^đạo hữu /i;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createNameNudge(game) {
  const T = game.data.notice?.name_nudge, E = game.data.social?.name?.err || {};
  if (!T) return;
  const root = el('div', 'panel ev-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', T.later), body = el('div', 'ev-body'), title = el('b', null, T.title);
  head.append(title, x);
  const inp = el('input', 'ev-input'), ok = el('button', 'act-btn primary', T.ok), row = el('div', 'ev-row'), msg = el('p', 'fb-msg');
  inp.maxLength = 16; inp.placeholder = T.ph; inp.style.textTransform = 'none';   // ô mã mời viết hoa, ô tên thì không
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') ok.click(); });
  row.append(inp, ok);
  const lines = el('div');
  body.append(lines, row, msg);
  root.append(head, body);
  document.body.append(root);
  root.addEventListener('pointerdown', e => e.stopPropagation());

  const key = () => `${KEY}:${game.owner || ''}`;
  const seen = () => { try { return localStorage.getItem(key()) === today(); } catch { return false; } };
  const mark = () => { try { localStorage.setItem(key(), today()); } catch { /* chế độ riêng tư */ } };
  function close() { root.hidden = true; game.uiOpen = false; }
  x.onclick = close;
  function show(head, rows, okText, laterText) {
    title.textContent = head; ok.textContent = okText; x.textContent = laterText;
    lines.replaceChildren(...rows.map(l => el('p', null, l)));
    inp.value = ''; msg.textContent = ''; ok.disabled = false;
    root.hidden = false; game.uiOpen = true;
  }
  // Đổi tên (chạm tên trên màn hình, nút trong bảng Đạo hữu): đặt lần đầu miễn phí, 1 lần đổi miễn phí, sau đó cần Vé đổi tên
  game.openRename = async () => {
    const R = T.rename;
    if (!R || !game.cloud || !game.save || game.dialog.open || game.trip || !root.hidden) return;
    show(R.title, [R.line, R.loading], R.ok, R.later);
    let left = null;
    try { left = await (await import('../net/profile.js')).renameLeft(); } catch { /* mạng lỗi: vẫn cho thử, máy chủ tự chặn */ }
    const st = !left ? '' : left.dau ? R.first : left.free > 0 ? R.free.replace('{n}', left.free) : left.ve > 0 ? R.ticket.replace('{n}', left.ve) : R.none;
    lines.replaceChildren(...[R.line, st].filter(Boolean).map(l => el('p', null, l)));
    ok.disabled = !!left && !left.dau && left.free <= 0 && left.ve <= 0;
  };

  ok.onclick = async () => {
    const t = inp.value.trim();
    if (!t) return;
    ok.disabled = true; msg.textContent = '';
    try {
      const { setDisplayName } = await import('../net/profile.js');
      const name = await setDisplayName(t);
      game.cloud.name = name; game.online?.rename?.(name);
      game.toast?.(T.done.replace('{name}', name), 3); game.sfx?.('levelup');
      close();
    } catch (e) {
      const m = String(e?.message || '');
      msg.textContent = E[Object.keys(E).find(k => m.includes(k))] || E.other || '';
    } finally { ok.disabled = false; }
  };

  setInterval(() => {
    if (!root.hidden || seen()) return;
    if (!game.save || !game.player || !game.cloud || game.dialog.open || game.story?.busy || game.uiOpen || game.traveling || game.trip) return;
    if ((game.save.step || 0) < (T.step ?? 3)) return;   // qua đoạn truyện mở đầu là hỏi
    if (!DEF.test(game.cloud.name || '')) return;   // chưa lưu lên máy chủ (tên rỗng) hoặc đã có tên riêng
    mark(); show(T.title, T.lines, T.ok, T.later);
  }, 4000);
}
