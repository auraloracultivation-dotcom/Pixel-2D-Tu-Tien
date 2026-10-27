// Một dòng chat (kênh thế giới, tông môn): cảnh giới, tên, chữ. Chạm vào tin người khác thì hiện nút Chặn, Báo cáo
// (data/social.json → mod). Tin của người bị chặn không hiện; đếm số tin đã ẩn để báo một dòng.
import { isBlocked, block, report } from '../game/world-chat.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Vẽ danh sách tin vào box; onNote(text) báo một dòng ngắn; redraw() vẽ lại sau khi chặn
export function chatLines(game, box, list, onNote, redraw) {
  const M = game.data.social.mod, names = game.data.realms.names;
  let hidden = 0;
  for (const m of list) {
    if (!m.la_toi && isBlocked(game, m.k)) { hidden++; continue; }
    const d = el('div', m.la_toi ? 'me' : 'chat-msg');
    if (m.canh_gioi != null) d.append(el('small', null, `[${names[m.canh_gioi]}] `));
    d.append(el('b', null, m.ten), m.chu);
    if (!m.la_toi && m.k) d.onclick = () => toggle(game, d, m, onNote, redraw);
    box.append(d);
  }
  if (hidden) box.append(el('div', 'chat-hidden', M.hidden.replace('{n}', hidden)));
}

function toggle(game, d, m, onNote, redraw) {
  const M = game.data.social.mod, open = d.nextSibling?.classList?.contains('chat-act');
  d.parentNode.querySelectorAll('.chat-act').forEach(x => x.remove());
  if (open) return;
  const row = el('div', 'chat-act');
  const btn = (t, fn) => { const b = el('button', 'mini', t); b.onclick = e => { e.stopPropagation(); fn(); }; row.append(b); };
  if (game.openWhisper) btn(game.data.social.whisper.btn, () => { row.remove(); game.openWhisper(m.k, m.ten); });   // nhắn riêng
  btn(M.block, () => { block(game, m.k, m.ten); onNote(M.blocked.replace('{name}', m.ten)); redraw(); });
  btn(M.report, () => {
    row.innerHTML = ''; row.append(el('small', null, M.ask));
    for (const r of M.reasons) btn(r, async () => { row.remove(); onNote(await report(game, m.id, r)); });
    btn(M.cancel, () => row.remove());
  });
  btn(M.cancel, () => row.remove());
  d.after(row);
}
