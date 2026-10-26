// Đạo lữ ở nhà (data/home.json): ngồi cạnh bồ đoàn trong động phủ, trò chuyện theo giờ trong ngày, mỗi ngày tặng một món quà nhỏ.
import { daoLuHere } from './affinity.js';
import { phase } from './daynight.js';
import { grant } from './daily.js';
import { setCompanion } from './companion.js';

const C = game => game.data.home;
const pick = a => a[Math.floor(Math.random() * a.length)];
const today = () => new Date().toDateString();

// Gọi khi vào bản đồ: ở động phủ thì đạo lữ ngồi chờ (trừ khi đang đi cùng)
export function spawnHome(game) {
  const id = daoLuHere(game);
  if (!id || game.map.id !== C(game).map || game.save.companion === id || game.npcs.some(n => n.id === id)) return;
  game.addNpc(id, C(game).at);
  game.npcs[game.npcs.length - 1].home = true;
}

// Đạo lữ đang ngồi cùng song tu: người chơi đả tọa gần đạo lữ ở nhà
export function songTuNpc(game) {
  const p = game.player;
  if (!p.meditating) return null;
  return game.npcs.find(n => n.home && Math.hypot(n.x - p.x, n.y - p.y) < C(game).song_tu.range) || null;
}
export const homeMul = game => songTuNpc(game) ? C(game).song_tu.mul : 1;

// Bắt đầu song tu thì báo một câu và để đạo lữ nói nhỏ một lời
export function updateHome(game, dt) {
  const n = songTuNpc(game), was = game.songTu, st = C(game).song_tu;
  game.songTu = n;
  if (n && was === n && game.songTuSay > 0 && (game.songTuSay -= dt) <= 0) game.say(n.def.name, pick(st.lines[n.id] || st.lines.default), 3.2);
  if (!n || was) return;
  game.toast(st.start.replace('{name}', n.def.name), 2.6);
  game.songTuSay = 2.8;
}

const lineOf = (game, id) => {
  const L = C(game).lines, ph = phase(game).id;
  return pick(L[id]?.[ph] || L.default[ph] || L.default.ngay);
};

export async function talkHome(game, npc) {
  const id = npc.id, name = npc.def.name, gifted = game.save.homeGift === today();
  const opts = [{ id: 'talk', label: 'Trò chuyện', desc: '' }];
  if (!gifted) opts.push({ id: 'gift', label: 'Nhận quà', desc: 'Mỗi ngày một món nhỏ', color: '#ffb0d0' });
  opts.push({ id: 'join', label: 'Rủ đi cùng', desc: game.save.companion ? `${game.data.npcs[game.save.companion].name} sẽ về nghỉ` : '' });
  const ch = await game.dialog.choose(`${name}: ${lineOf(game, id)}`, opts);
  if (ch === 'talk') await game.dialog.say([[name, lineOf(game, id)]]);
  else if (ch === 'gift') {
    game.save.homeGift = today();
    const got = grant(game, pick(C(game).gifts));
    game.sfx('levelup');
    await game.dialog.say([[name, pick(C(game).gift_lines[id] || C(game).gift_lines.default)], ['', `Nhận: ${got.join(', ')}.`]]);
  } else if (ch === 'join') {
    setCompanion(game, id);
    await game.dialog.say([[name, game.data.companions.list[id]?.join || 'Đi thôi.']]);
  }
}
