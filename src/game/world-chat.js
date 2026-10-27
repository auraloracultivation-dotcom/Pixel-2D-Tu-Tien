// Chat lưu trên máy chủ theo kênh (data/social.json → world): "the-gioi" cho cả máy chủ, "bang:<mã>" cho bang.
// Đọc lại mỗi vài giây khi đang mở tab, lọc từ bậy khi gửi và khi hiện.
import { cleanText } from './social.js';

const W = game => game.data.social.world;

export function chatState(game, kenh = 'the-gioi') {
  const all = (game.chats ??= {});
  return (all[kenh] ??= { list: [], last: 0, sentT: 0, busy: false, err: '' });
}

export async function pullChat(game, kenh = 'the-gioi') {
  const s = chatState(game, kenh);
  if (!game.online || s.busy) return false;
  s.busy = true;
  try {
    const { readChat } = await import('../net/chat.js');
    const rows = await readChat(kenh, s.last);
    for (const r of rows) s.list.push({ ...r, chu: cleanText(game, r.chu) });
    if (rows.length) s.last = rows[rows.length - 1].id;
    if (s.list.length > W(game).keep) s.list.splice(0, s.list.length - W(game).keep);
    s.err = '';
    return rows.length > 0;
  } catch { s.err = W(game).error; return false; }
  finally { s.busy = false; }
}

// Trả về lời nhắc nếu chưa gửi được, rỗng nếu đã gửi
export async function sendTo(game, kenh, text) {
  const w = W(game), s = chatState(game, kenh), now = Date.now() / 1000;
  const t = cleanText(game, text).slice(0, w.max_len);
  if (!t) return '';
  if (now - s.sentT < w.cooldown) return w.wait;
  s.sentT = now;
  try {
    const { sendChat } = await import('../net/chat.js');
    await sendChat(kenh, t);
  } catch (e) { return String(e?.message).includes('nhanh_qua') ? w.wait : w.error; }
  await pullChat(game, kenh);
  return '';
}

export const worldState = game => chatState(game, 'the-gioi');
export const pullWorld = game => pullChat(game, 'the-gioi');
export const sendWorld = (game, text) => sendTo(game, 'the-gioi', text);
