// Tab Truyền âm ở bảng Đạo hữu: danh sách người đã nhắn (chưa đọc hiện số), chạm vào để xem và nhắn tiếp.
import { whisperState, threads, threadOf, markRead } from '../game/whisper.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ui: { log, sub, input, send, note, redraw }
export function renderWhisper(game, ui) {
  const W = game.data.social.whisper, s = whisperState(game), on = !!game.online;
  const name = s.withName || threadOf(game, s.with)[0]?.ten || '';
  ui.sub.textContent = ui.note || (!on ? W.offline : s.with ? W.with.replace('{name}', name) : s.err || W.sub);
  const log = ui.log; log.innerHTML = '';
  ui.input.maxLength = W.max_len;
  ui.input.placeholder = s.with ? W.placeholder.replace('{name}', name) : W.pick;
  ui.input.disabled = ui.send.disabled = !on || !s.with;
  if (!s.with) {
    const list = threads(game);
    if (!list.length) log.append(el('div', 'empty', on ? `${W.empty} ${W.pick}` : W.offline));
    for (const t of list) {
      const row = el('div', 'chat-msg wh-row');
      row.append(el('b', null, t.ten), (t.last.la_toi ? '↗ ' : '') + t.last.chu);
      if (t.unread) row.append(el('small', 'wh-new', ' ' + W.unread.replace('{n}', t.unread)));
      row.onclick = () => { s.with = t.k; s.withName = t.ten; markRead(game, t.k); ui.redraw(); };
      log.append(row);
    }
    return;
  }
  const back = el('button', 'mini', W.back);
  back.onclick = () => { s.with = null; s.withName = ''; ui.redraw(); };
  log.append(back);
  for (const m of threadOf(game, s.with)) {
    const d = el('div', m.la_toi ? 'me' : 'chat-msg');
    d.append(el('b', null, m.la_toi ? '' : m.ten), m.chu);
    log.append(d);
  }
  log.scrollTop = log.scrollHeight;
}
