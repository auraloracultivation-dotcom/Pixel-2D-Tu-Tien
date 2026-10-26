// Đạo lữ ở nhà (data/home.json): ngồi cạnh bồ đoàn trong động phủ, trò chuyện theo giờ trong ngày, mỗi ngày tặng một món quà nhỏ.
// Mỗi ngày còn có một người bạn đã thân ghé chơi (visit).
import { daoLuHere, daoLu, affinity } from './affinity.js';
import { phase } from './daynight.js';
import { grant } from './daily.js';
import { setCompanion } from './companion.js';
import { comfort } from './decor.js';

const C = game => game.data.home;
const pick = a => a[Math.floor(Math.random() * a.length)];
const today = () => new Date().toDateString();

// Khách hôm nay: chọn theo ngày trong số bạn đã quen đủ thân, không phải đạo lữ, không đang đi cùng, không vắng mặt
export function visitorToday(game) {
  const v = C(game).visit, s = game.save, list = game.data.companions.list;
  const ok = Object.keys(s.comps || {}).filter(id => list[id] && id !== daoLu(game) && id !== s.companion && affinity(game, id) >= v.pts && !s.flags[list[id].unless]);
  if (!ok.length) return null;
  const d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
  return ok.sort()[seed % ok.length];
}

const seat = (game, id, at, key) => {
  if (game.npcs.some(n => n.id === id)) return null;
  game.addNpc(id, at);
  const n = game.npcs[game.npcs.length - 1]; n[key] = true;
  return n;
};

// Gọi khi vào bản đồ: ở động phủ thì đạo lữ ngồi chờ (trừ khi đang đi cùng), khách hôm nay ngồi bên kia
export function spawnHome(game) {
  if (game.map.id !== C(game).map) return;
  const id = daoLuHere(game);
  if (id && game.save.companion !== id) seat(game, id, C(game).at, 'home');
  const v = visitorToday(game), n = v && seat(game, v, C(game).visit.at, 'visit');
  if (n) game.toast(C(game).visit.toast.replace('{name}', n.def.name), 2.4);
}

// Đạo lữ đang ngồi cùng song tu: người chơi đả tọa gần đạo lữ ở nhà
export function songTuNpc(game) {
  const p = game.player;
  if (!p.meditating) return null;
  return game.npcs.find(n => n.home && Math.hypot(n.x - p.x, n.y - p.y) < C(game).song_tu.range) || null;
}
// Đả tọa ở nhà: song tu nhân mul, đồ trang trí cộng thêm phần trăm
export const homeMul = game => (songTuNpc(game) ? C(game).song_tu.mul : 1) * (game.map.id === C(game).map ? 1 + comfort(game) / 100 : 1);

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
  if (npc.visit) return talkVisit(game, npc);
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

// Khách ghé chơi: trò chuyện, quà mỗi ngày một lần, rủ đi cùng
async function talkVisit(game, npc) {
  const v = C(game).visit, id = npc.id, name = npc.def.name, line = () => pick(v.lines[id] || v.lines.default);
  const opts = [{ id: 'talk', label: 'Trò chuyện', desc: '' }];
  if (game.save.visitGift !== today()) opts.push({ id: 'gift', label: 'Nhận quà', desc: 'Khách mang tới', color: '#ffb0d0' });
  opts.push({ id: 'join', label: 'Rủ đi cùng', desc: game.save.companion ? `${game.data.npcs[game.save.companion].name} sẽ về nghỉ` : '' });
  const ch = await game.dialog.choose(`${name}: ${line()}`, opts);
  if (ch === 'talk') await game.dialog.say([[name, line()]]);
  else if (ch === 'gift') {
    game.save.visitGift = today();
    const got = grant(game, pick(C(game).gifts));
    game.sfx('levelup');
    await game.dialog.say([[name, pick(v.gift_lines[id] || v.gift_lines.default)], ['', `Nhận: ${got.join(', ')}.`]]);
  } else if (ch === 'join') {
    setCompanion(game, id);
    await game.dialog.say([[name, game.data.companions.list[id]?.join || 'Đi thôi.']]);
  }
}
