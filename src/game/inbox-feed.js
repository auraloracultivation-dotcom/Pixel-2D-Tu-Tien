// Nguồn tin cho Hòm thư (data/inbox.json → poll): mỗi vài giây xem các nguồn, có tin mới thì notify (src/game/inbox.js).
// - Truyền âm: danh sách bảng Đạo hữu đã đọc định kỳ (game/whisper.js); mỗi người một tin, đọc xong ở bảng kia thì tự thành đã đọc.
// - Kênh Thế giới: đọc định kỳ, chỉ báo khi có người nhắc tên mình.
// - Tông môn: tin trò chuyện mới (gộp một tin), người xin vào (khi mình là chủ / phó).
// - Lời đáp báo lỗi / đề xuất của đội làm game.
// Thư chợ và thư hệ thống báo ngay lúc nhận (src/game/market.js → claimMail). Lần đầu chạy chỉ đặt mốc, không báo tin cũ.
import { inboxState, notify, markRead, saveInbox } from './inbox.js';
import { threads } from './whisper.js';
import { worldState, pullWorld } from './world-chat.js';
import { guildState, loadMine, guildChat, pullGuildChat, canGuild } from './guild.js';

const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const cut = (s, n = 90) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const shown = id => { const e = document.getElementById(id); return !!e && !e.hidden; };

function whispers(game, s, T) {
  for (const th of threads(game)) {
    const key = 'w:' + th.k, item = s.items.find(x => x.key === key);
    if (th.unread && th.last.id > (s.mark[key] || 0) && !th.last.la_toi) {
      s.mark[key] = th.last.id;
      notify(game, { key, kind: 'truyen_am', title: fill(th.unread > 1 ? T.whisper_n : T.whisper, { name: th.ten || '?', n: th.unread }), text: cut(th.last.chu), go: 'whisper', arg: { k: th.k, ten: th.ten } });
    } else if (!th.unread && item && !item.read) markRead(game, key);   // đã đọc ở bảng Đạo hữu
  }
}

function mentions(game, s, T) {
  const name = (game.cloud?.name || '').trim().toLowerCase(), list = worldState(game).list;
  const top = list.length ? list[list.length - 1].id : 0;
  if (s.mark.world == null) { s.mark.world = top; return; }
  if (name.length >= 2) {
    for (const r of list) if (r.id > s.mark.world && !r.la_toi && String(r.chu || '').toLowerCase().includes(name)) {
      notify(game, { key: 'tg:' + r.id, kind: 'the_gioi', title: fill(T.mention, { name: r.ten || '?' }), text: cut(r.chu), go: 'world' });
    }
  }
  s.mark.world = Math.max(s.mark.world, top);
}

function guildNews(game, s, T) {
  const mine = guildState(game).mine, ch = mine && guildChat(game);
  if (!ch) return;
  const top = ch.list.length ? ch.list[ch.list.length - 1].id : 0;
  if (s.mark.guild == null || shown('guild')) {   // lần đầu, hoặc đang mở bảng Tông môn: coi như đã xem
    s.mark.guild = top; markRead(game, 'gc'); return;
  }
  const fresh = ch.list.filter(r => r.id > s.mark.guild && !r.la_toi);
  if (fresh.length) {
    const prev = s.items.find(x => x.key === 'gc'), n = fresh.length + (prev && !prev.read ? prev.n || 0 : 0), last = fresh[fresh.length - 1];
    notify(game, { key: 'gc', kind: 'tong_mon', n, title: fill(T.guild_chat, { n }), text: cut(`${last.ten}: ${last.chu}`), go: 'guild' });
  }
  s.mark.guild = Math.max(s.mark.guild, top);
}

function joinRequests(game, s, T) {
  const mine = guildState(game).mine;
  if (!mine || !['chu', 'pho'].includes(mine.chuc)) return;
  const had = new Set(s.mark.xin || []), now = (mine.xin || []).map(x => x.k);
  for (const x of mine.xin || []) if (!had.has(x.k)) notify(game, { key: 'xin:' + x.k, kind: 'tong_mon', title: fill(T.guild_join, { name: x.ten || '?' }), text: T.guild_join_text, go: 'guild' });
  s.mark.xin = now;
}

async function feedback(game, s, T) {
  const rows = await import('../net/feedback.js').then(m => m.myFeedback()).catch(() => null);
  if (!rows) return;
  const st = game.data.community?.feedback?.text?.status || {}, fb = (s.mark.fb ??= {});
  for (const r of rows) {
    const sig = `${r.trang_thai}|${r.tra_loi || ''}`;
    if (fb[r.id] !== sig && r.tra_loi) {
      notify(game, { key: 'fb:' + r.id, kind: 'he_thong', title: fill(T.feedback, { title: cut(r.tieu_de, 40) }), text: `${r.tra_loi} (${fill(T.feedback_status, { status: st[r.trang_thai] || r.trang_thai })})`, go: 'feedback', arg: { loai: r.loai } });
    }
    fb[r.id] = sig;
  }
}

export function startInbox(game) {
  const P = game.data.inbox.poll, T = game.data.inbox.text, last = {};
  const due = (k, sec) => { const now = Date.now(); if (now - (last[k] || 0) < sec * 1000) return false; last[k] = now; return true; };
  setInterval(async () => {
    if (!game.save || !game.online || !game.cloud) return;
    const s = inboxState(game);
    try {
      whispers(game, s, T);
      if (due('world', P.world)) { await pullWorld(game); mentions(game, s, T); }
      if (canGuild(game) && due('guild_info', P.guild_info)) { await loadMine(game).catch(() => null); joinRequests(game, s, T); }
      if (guildState(game).mine && due('guild', P.guild)) { await pullGuildChat(game); guildNews(game, s, T); }
      if (due('feedback', P.feedback)) await feedback(game, s, T);
    } catch { /* mạng chập chờn: lần sau */ }
    saveInbox(game);
  }, P.tick * 1000);
}
