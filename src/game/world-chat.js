// Chat chung cả máy chủ (data/social.json → world): đọc lại mỗi vài giây khi đang mở tab, lọc từ bậy khi gửi và khi hiện.
import { cleanText } from './social.js';

const W = game => game.data.social.world;

export function worldState(game) {
  return (game.world ??= { list: [], last: 0, sentT: 0, busy: false, err: '' });
}

export async function pullWorld(game) {
  const s = worldState(game);
  if (!game.online || s.busy) return false;
  s.busy = true;
  try {
    const { readChat } = await import('../net/chat.js');
    const rows = await readChat('the-gioi', s.last);
    for (const r of rows) s.list.push({ ...r, chu: cleanText(game, r.chu) });
    if (rows.length) s.last = rows[rows.length - 1].id;
    if (s.list.length > W(game).keep) s.list.splice(0, s.list.length - W(game).keep);
    s.err = '';
    return rows.length > 0;
  } catch { s.err = W(game).error; return false; }
  finally { s.busy = false; }
}

// Trả về lời nhắc nếu chưa gửi được, rỗng nếu đã gửi
export async function sendWorld(game, text) {
  const w = W(game), s = worldState(game), now = Date.now() / 1000;
  const t = cleanText(game, text).slice(0, w.max_len);
  if (!t) return '';
  if (now - s.sentT < w.cooldown) return w.wait;
  s.sentT = now;
  try {
    const { sendChat } = await import('../net/chat.js');
    await sendChat('the-gioi', t);
  } catch (e) { return String(e?.message).includes('nhanh_qua') ? w.wait : w.error; }
  await pullWorld(game);
  return '';
}
