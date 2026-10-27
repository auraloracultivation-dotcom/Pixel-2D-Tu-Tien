// Truyền âm (data/social.json → whisper): tin riêng gửi và nhận, gom theo người (k), đếm tin chưa đọc, lọc từ bậy khi hiện.
import { cleanText } from './social.js';
import { isBlocked } from './world-chat.js';

const W = game => game.data.social.whisper;
export const whisperState = game => (game.whisper ??= { list: [], last: 0, busy: false, err: '', with: null, sentT: 0 });

export async function pullWhisper(game) {
  const s = whisperState(game);
  if (!game.online || s.busy) return 0;
  s.busy = true;
  try {
    const { readWhispers } = await import('../net/whisper.js');
    const rows = await readWhispers(s.last);
    for (const r of rows) if (r.la_toi || !isBlocked(game, r.k)) s.list.push({ ...r, chu: cleanText(game, r.chu) });
    if (rows.length) s.last = rows[rows.length - 1].id;
    if (s.list.length > 300) s.list.splice(0, s.list.length - 300);
    s.err = '';
    if (s.with) markRead(game, s.with);
    return rows.filter(r => !r.la_toi).length;
  } catch { s.err = W(game).error; return 0; }
  finally { s.busy = false; }
}

export const unreadCount = game => whisperState(game).list.filter(m => !m.la_toi && !m.doc).length;

// Danh sách người đã truyền âm, mới nhất lên trên
export function threads(game) {
  const by = new Map();
  for (const m of whisperState(game).list) {
    const t = by.get(m.k) || { k: m.k, ten: m.ten, last: m, unread: 0 };
    t.last = m; t.ten = m.ten || t.ten;
    if (!m.la_toi && !m.doc) t.unread++;
    by.set(m.k, t);
  }
  return [...by.values()].sort((a, b) => b.last.id - a.last.id);
}
export const threadOf = (game, k) => whisperState(game).list.filter(m => m.k === k);

export async function markRead(game, k) {
  const L = whisperState(game).list.filter(m => m.k === k && !m.la_toi && !m.doc);
  if (!L.length) return;
  for (const m of L) m.doc = true;
  try { const { markWhispers } = await import('../net/whisper.js'); await markWhispers(k); } catch { /* lần sau đánh dấu lại */ }
}

// Trả về lời nhắc nếu chưa gửi được, rỗng nếu đã gửi
export async function sendWhisper(game, k, text) {
  const w = W(game), s = whisperState(game), now = Date.now() / 1000;
  const t = cleanText(game, text).slice(0, w.max_len);
  if (!t || !k) return '';
  if (now - s.sentT < w.cooldown) return w.wait;
  s.sentT = now;
  try {
    const { sendWhisper: send } = await import('../net/whisper.js');
    await send(k, t);
  } catch (e) {
    const m = String(e?.message);
    return m.includes('nhanh_qua') ? w.wait : m.includes('bi_cam') ? game.data.social.mod.muted : m.includes('khong_thay') ? w.gone : w.error;
  }
  await pullWhisper(game);
  return '';
}
