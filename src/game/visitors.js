// Khách ghé động phủ (data/visitors.json, home.json visit): bạn quen hoặc khách phương xa.
// Khách phương xa kể chuyện, tặng quà, có người bán nguyên liệu; khách nào cũng chơi được một ván cờ mỗi ngày.
import { grant } from './daily.js';
import { setCompanion } from './companion.js';
import { coins, addCoins } from './shop.js';

const V = game => game.data.visitors;
const pick = a => a[Math.floor(Math.random() * a.length)];
const today = () => new Date().toDateString();
const daySeed = () => { const d = new Date(); return d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate(); };

// Khách lạ hôm nay: mỗi every ngày một lần, hoặc khi chưa có bạn quen nào tới (friend = null)
export function strangerToday(game, friend) {
  const seed = daySeed();
  if (friend && seed % V(game).every) return null;
  const ok = Object.entries(V(game).strangers).filter(([, s]) => game.save.realm >= s.realm).map(([id]) => id);
  return ok.length ? ok[seed % ok.length] : null;
}
export const isStranger = (game, id) => !!V(game).strangers[id];
const freshStory = (game, id) => { const st = V(game).strangers[id]; return !!st && (game.save.stories?.[id] || 0) < st.stories.length; };

// Tự hành: việc còn làm được với khách hôm nay (quà, nghe chuyện mới, ván cờ, mua nguyên liệu nấu ăn khi dư tiền), theo thứ tự đó
export function visitJob(game, id) {
  const s = game.save, day = today();
  if (s.visitGift !== day) return 'gift';
  if (freshStory(game, id) && s.storyDay !== day) return 'talk';
  if (s.chess !== day) return 'chess';
  const t = V(game).strangers[id]?.trade;   // mua khi vẫn còn chừa được garden_keep Linh Thạch
  if (t && s.trade !== day && coins(s) >= t.coins + game.data.config.pilot.garden_keep) return 'trade';
  return null;
}

// Ván cờ ba nước kiểu oẳn tù tì: tấn công thắng bày thế, bày thế thắng phòng thủ, phòng thủ thắng tấn công
async function chess(game, npc) {
  const c = V(game).chess, name = npc.def.name, s = game.save;
  s.chess = today();
  let score = 0;
  for (let i = 1; i <= c.rounds; i++) {
    const me = game.pilot ? pick(c.moves) : await askMove(game, c, i);
    const them = pick(c.moves), key = me.beats === them.id ? 'win' : them.beats === me.id ? 'lose' : 'draw';
    score += key === 'win' ? 1 : key === 'lose' ? -1 : 0;
    await game.dialog.say([['', c.round[key].replace('{me}', me.label).replace('{them}', them.label)]]);
  }
  const res = score > 0 ? c.win : c.lose, got = grant(game, res.give);
  if (!isStranger(game, npc.id)) { s.affinity ??= {}; s.affinity[npc.id] = Math.min(game.data.affinity.max, (s.affinity[npc.id] || 0) + res.pts); }
  game.sfx(score > 0 ? 'levelup' : 'pickup');
  game.persist();
  await game.dialog.say([[name, pick(c.lines[score > 0 ? 'win' : 'lose'])], ['', `${res.text} Nhận: ${got.join(', ')}.`]]);
}

async function askMove(game, c, n) {
  const id = await game.dialog.choose(c.ask.replace('{n}', n), c.moves.map(m => ({ id: m.id, label: m.label, desc: '' })));
  return c.moves.find(m => m.id === id);
}

async function trade(game, npc, t) {
  const s = game.save;
  if (coins(s) < t.coins) { await game.dialog.say([[npc.def.name, V(game).trade_none]]); return; }
  addCoins(game, -t.coins); s.trade = today();
  const got = grant(game, { mats: t.mats });
  game.sfx('pickup'); game.persist();
  await game.dialog.say([['', `Nhận: ${got.join(', ')}.`]]);
}

// Nói chuyện với khách: trò chuyện (khách lạ kể chuyện), quà mỗi ngày, cờ, mua hàng, rủ đi cùng (chỉ bạn quen)
export async function talkVisit(game, npc) {
  const H = game.data.home.visit, id = npc.id, name = npc.def.name, s = game.save, st = V(game).strangers[id];
  const line = () => st ? st.hello : pick(H.lines[id] || H.lines.default);
  const opts = [{ id: 'talk', label: st ? 'Nghe kể chuyện' : 'Trò chuyện', desc: '' }];
  if (s.visitGift !== today()) opts.push({ id: 'gift', label: 'Nhận quà', desc: 'Khách mang tới', color: '#ffb0d0' });
  if (s.chess !== today()) opts.push({ id: 'chess', label: V(game).chess.label, desc: V(game).chess.desc, color: '#c8b080' });
  if (st?.trade && s.trade !== today()) opts.push({ id: 'trade', label: st.trade.label, desc: '', color: '#ffd24a' });
  if (!st) opts.push({ id: 'join', label: 'Rủ đi cùng', desc: s.companion ? `${game.data.npcs[s.companion].name} sẽ về nghỉ` : '' });
  const auto = game.pilot && visitJob(game, id);   // tự hành: nhận quà, nghe chuyện mới (mỗi ngày một chuyện), đánh cờ
  const ch = auto || await game.dialog.choose(`${name}: ${line()}`, opts);
  if (ch === 'talk') await story(game, npc, st, line);
  else if (ch === 'gift') {
    s.visitGift = today();
    const got = grant(game, pick(st ? V(game).gifts : game.data.home.gifts));
    game.sfx('levelup');
    await game.dialog.say([[name, pick(st ? st.gift_lines : H.gift_lines[id] || H.gift_lines.default)], ['', `Nhận: ${got.join(', ')}.`]]);
  } else if (ch === 'chess') await chess(game, npc);
  else if (ch === 'trade') await trade(game, npc, st.trade);
  else if (ch === 'join') {
    setCompanion(game, id);
    await game.dialog.say([[name, game.data.companions.list[id]?.join || 'Đi thôi.']]);
  }
}

// Khách lạ kể lần lượt từng chuyện; chuyện mới nghe lần đầu thì ngộ ra chút linh khí
async function story(game, npc, st, line) {
  if (!st) { await game.dialog.say([[npc.def.name, line()]]); return; }
  const s = game.save, heard = s.stories ??= {}, i = (heard[npc.id] || 0) % st.stories.length, fresh = (heard[npc.id] || 0) < st.stories.length;
  heard[npc.id] = (heard[npc.id] || 0) + 1; s.storyDay = today();
  await game.dialog.say([[npc.def.name, st.stories[i]]]);
  if (fresh) { game.gainQi(V(game).story_qi, game.player.x, game.player.y); game.toast(`Nghe chuyện, ngộ ra chút đạo lý. +${V(game).story_qi} linh khí`, 2.4); }
  game.persist();
}
