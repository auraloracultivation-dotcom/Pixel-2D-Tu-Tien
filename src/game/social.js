// Chào hỏi, trò chuyện với người chơi cùng đảo (data/social.json): gửi qua net/online.js, hiện bong bóng trên đầu, giữ log ngắn.
// Lọc từ bậy cả lúc gửi lẫn lúc nhận, nên máy khác có sửa code cũng không hiện được chữ bậy ở máy mình.
import { addFx } from './combat.js';

const C = game => game.data.social;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let badRe = null;

// Thay từ bậy bằng mask (khớp cả từ, không phân biệt hoa thường). Bản không dấu ghi riêng trong danh sách,
// để khỏi che nhầm chữ thường như "lon nước", "các bạn".
export function cleanText(game, text) {
  const c = C(game);
  let t = String(text || '').normalize('NFC').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, c.chat.max_len);
  badRe ??= new RegExp(`(^|[^\\p{L}\\p{N}])(${[...c.bad].sort((a, b) => b.length - a.length).map(esc).join('|')})(?=$|[^\\p{L}\\p{N}])`, 'giu');
  const hits = [];
  for (const m of t.toLowerCase().matchAll(badRe)) hits.push([m.index + m[1].length, m[2].length]);
  for (const [i, n] of hits.reverse()) t = t.slice(0, i) + c.mask + t.slice(i + n);
  return t;
}

function bubble(game, who, text) {
  who.bubble = { text, t: 0, sec: C(game).chat.sec };
}

function log(game, name, text) {
  const L = (game.chatLog ??= []);
  L.push({ name, text });
  if (L.length > C(game).chat.log) L.shift();
  game.chatNew = true;
}

export function sendEmote(game, id) {
  const e = C(game).emotes.find(x => x.id === id);
  if (!e || !game.online) return;
  game.online.say({ e: id });
  showEmote(game, game.player, e, game.online.me.name);
}

// Trả về chữ báo lỗi (đợi, rỗng) hoặc '' khi đã gửi
export function sendChat(game, raw) {
  const c = C(game).chat, now = Date.now() / 1000;
  if (!game.online) return c.offline;
  if (now - (game.chatT || 0) < c.cooldown) return c.wait;
  const text = cleanText(game, raw);
  if (!text) return '';
  game.chatT = now;
  game.online.say({ m: text });
  bubble(game, game.player, text); log(game, game.online.me.name, text);
  return '';
}

function showEmote(game, who, e, name) {
  bubble(game, who, e.text); log(game, name, e.text);
  if (e.fx) for (let i = 0; i < 3; i++) addFx(game, { type: 'heart', x: who.x + (i - 1) * 5, y: who.y - i * 3, color: e.fx, life: 1 + i * 0.2 });
}

// Nhận từ người khác: tra người nói trong danh sách cùng đảo, bỏ tin dồn dập
export function onSay(game, p) {
  const o = game.others.list.get(p.id), c = C(game);
  if (!o || o.x === null) return;
  const now = Date.now() / 1000;
  if (now - (o.sayT || 0) < c.chat.min_gap) return;
  o.sayT = now;
  if (p.e) { const e = c.emotes.find(x => x.id === p.e); if (e) showEmote(game, o, e, o.def.name); return; }
  const text = cleanText(game, p.m);
  if (text) { bubble(game, o, text); log(game, o.def.name, text); }
}

export function updateSocial(game, dt) {
  for (const w of [game.player, ...game.others.visible()]) if (w?.bubble && (w.bubble.t += dt) >= w.bubble.sec) w.bubble = null;
}
