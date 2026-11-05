// Chat lưu trên máy chủ theo kênh (data/social.json → world): kênh thế giới và kênh tông môn. Tin mới máy chủ đẩy qua Realtime (game/chat-push.js), đọc bù định kỳ khi mất kết nối; lọc từ bậy khi gửi và khi hiện.
import { cleanText } from './social.js';

const W = game => game.data.social.world, M = game => game.data.social.mod;

// Mỗi kênh một hàng tin: "the-gioi" (cả máy chủ), "bang:<id>" (tông môn, game/guild.js). last: mốc đọc của lần đọc gần nhất
// (chỉ lần đọc qua p2d_doc_chat đẩy mốc, tin máy chủ đẩy qua Realtime không đẩy, nên rớt kết nối giữa chừng vẫn đọc bù đủ);
// rev tăng mỗi khi có tin mới (bảng đang mở thì vẽ lại); mine: id tin mình vừa gửi.
export function chanState(game, kenh) {
  return ((game.chats ??= {})[kenh] ??= { list: [], last: 0, sentT: 0, busy: false, err: '', at: 0, rev: 0, mine: new Set() });
}
export const worldState = game => chanState(game, 'the-gioi');
export const pullWorld = game => pullChan(game, 'the-gioi');
export const sendWorld = (game, text) => sendChan(game, 'the-gioi', text);

// Gộp tin (từ lần đọc hoặc Realtime) theo id, bỏ trùng, giữ thứ tự; trả số tin mới
export function mergeRows(game, kenh, rows) {
  const s = chanState(game, kenh), have = new Set(s.list.map(m => m.id)), myK = game.chatK;
  let n = 0;
  for (const r of rows) {
    if (r.la_toi && r.k) game.chatK = r.k;   // nhớ mã chat của mình để nhận ra tin mình trong tin được đẩy
    if (have.has(r.id)) continue;
    have.add(r.id); n++;
    s.list.push({ ...r, la_toi: !!r.la_toi || s.mine.has(r.id) || (!!myK && r.k === myK), chu: cleanText(game, r.chu) });
  }
  if (!n) return 0;
  s.list.sort((a, b) => a.id - b.id);
  if (s.list.length > W(game).keep) s.list.splice(0, s.list.length - W(game).keep);
  s.rev++;
  return n;
}

// Một dòng máy chủ đẩy (data/config.json → realtime, game/chat-push.js): dữ liệu lạ, kiểm kiểu từng trường rồi gộp như lần đọc
export function pushRow(game, kenh, p) {
  if (!p || p.kenh !== kenh || !Number.isSafeInteger(p.id) || p.id <= 0 || typeof p.chu !== 'string') return 0;
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  return mergeRows(game, kenh, [{ id: p.id, ten: str(p.ten, 24), chu: p.chu.slice(0, W(game).max_len), luc: str(p.luc, 40),
    canh_gioi: Number.isInteger(p.canh_gioi) ? p.canh_gioi : null, k: /^[0-9a-f]{12}$/.test(p.k || '') ? p.k : null, la_toi: false }]);
}

// Đọc tin mới qua p2d_doc_chat. Kênh đang nhận Realtime (game.push) thì chỉ đọc bù mỗi fallback_s giây, trừ khi force.
export async function pullChan(game, kenh, force = false) {
  const s = chanState(game, kenh);
  if (!game.online || s.busy) return false;
  const R = game.data.config.realtime || {};
  if (!force && game.push?.live(kenh) && Date.now() - s.at < (R.fallback_s || 120) * 1000) return false;
  s.busy = true;
  try {
    const { readChat } = await import('../net/chat.js');
    const rows = await readChat(kenh, s.last);
    if (rows.length) s.last = Math.max(s.last, rows[rows.length - 1].id);
    s.at = Date.now();
    s.err = '';
    return mergeRows(game, kenh, rows) > 0;
  } catch { s.err = W(game).error; return false; }
  finally { s.busy = false; }
}

// Trả về lời nhắc nếu chưa gửi được, rỗng nếu đã gửi
export async function sendChan(game, kenh, text) {
  const w = W(game), s = chanState(game, kenh), now = Date.now() / 1000;
  const t = cleanText(game, text).slice(0, w.max_len);
  if (!t) return '';
  if (now - s.sentT < w.cooldown) return w.wait;
  s.sentT = now;
  try {
    const { sendChat } = await import('../net/chat.js');
    const id = await sendChat(kenh, t);
    if (Number.isSafeInteger(id)) { s.mine.add(id); const m = s.list.find(x => x.id === id); if (m) { m.la_toi = true; s.rev++; } }   // tin đẩy về trước cả lời đáp
  } catch (e) { const m = String(e?.message); return m.includes('nhanh_qua') ? w.wait : m.includes('bi_cam') ? M(game).muted : w.error; }
  await pullChan(game, kenh, true);
  return '';
}

// Chặn: lưu mã người gửi (k, băm ở máy chủ) trong bản lưu; tin của người bị chặn ẩn ở mọi kênh
export const isBlocked = (game, k) => !!k && (game.save.blocked || []).some(b => b.k === k);
export function block(game, k, ten) {
  if (!k || isBlocked(game, k)) return;
  const L = (game.save.blocked ??= []);
  L.push({ k, ten: String(ten || '').slice(0, 24) });
  if (L.length > M(game).max) L.shift();
  game.persist();
}
export function unblockAll(game) { game.save.blocked = []; game.persist(); }

// Báo cáo một tin: trả về lời báo cho người chơi
export async function report(game, id, reason) {
  try {
    const { reportChat } = await import('../net/chat.js');
    await reportChat(id, reason);
    return M(game).reported;
  } catch (e) { return String(e?.message).includes('bao_nhieu') ? M(game).report_many : M(game).report_fail; }
}
