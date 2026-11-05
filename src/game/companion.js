// Khôi lỗi (trước là bạn đồng hành, data/companions.json; chủ dự án đổi 02/11/2026 14:39): mang tối đa 2 con đi cùng
// (save.companion, save.companion2), đánh như linh thú, có cấp riêng; mua bán ở Ngự Thú Sư (src/game/beast-shop.js),
// chỉ số và tẩy luyện ở src/game/beast.js (holder là save.comps[id]).
import { updateFollower } from './pets.js';
import { curOutfit } from './fashion.js';

const C = game => game.data.companions;
export const compNeed = (data, lv) => Math.round(data.companions.exp_base * Math.pow(lv, data.companions.exp_pow));
export const compLevel = (game, id = game.save.companion) => game.save.comps?.[id]?.lv || 0;
export const away = (game, id) => !!game.save.flags[C(game).list[id]?.unless];
// Chỉ khôi lỗi mới mang theo được (05/11/2026: Lạc Tuyết, Tiêu Dao bị Đại Ma Thần bắt trong truyện mới, không còn là bạn đồng hành)
export const isCarry = (game, id) => !!C(game).list[id] && !!game.data.pets.shop?.puppets?.[id];
export const canInvite = (game, id) => isCarry(game, id) && !!game.save.comps?.[id] && !away(game, id);   // khôi lỗi: phải mua rồi mới mang được

const mk = (game, id, dx) => { const p = game.player; return id && p && C(game).list[id] ? { id, def: C(game).list[id], npc: game.data.npcs[id], x: p.x - dx, y: p.y - 8, cd: 1, skillCd: 4, hop: 0, face: 1 } : null; };
export function spawnCompanion(game) {
  const s = game.save;   // bản lưu cũ còn mang người không phải khôi lỗi (Lạc Tuyết, Tiêu Dao): cho về, nhường ô
  if (s.companion2 && !isCarry(game, s.companion2)) s.companion2 = null;
  if (s.companion && !isCarry(game, s.companion)) { s.companion = s.companion2 || null; s.companion2 = null; }
  game.comp = mk(game, game.save.companion, 10);
  game.comp2 = mk(game, game.save.companion2, -10);
}

export function updateCompanion(game, dt) {
  if (game.comp && away(game, game.comp.id)) { game.save.companion = null; game.comp = null; }
  const c = C(game);
  if (game.comp) updateFollower(game, game.comp, 1 + (compLevel(game) - 1) * c.lv_bonus, c.follow, dt, c.lift, c.side || 0);   // đi sau lưng, lệch lên: không chắn trước mặt
  if (game.comp2) updateFollower(game, game.comp2, 1 + (compLevel(game, game.comp2.id) - 1) * c.lv_bonus, c.follow + 14, dt, c.lift, -(c.side || 0));   // con thứ hai lệch sang bên kia
}

// Nhận một phần linh khí người chơi thu được (cả hai con đang mang)
export function gainCompExp(game, amount) {
  const cfg = C(game);
  for (const id of [game.save.companion, game.save.companion2]) {
    const st = game.save.comps?.[id];
    if (!st || st.lv >= cfg.max_level) continue;
    st.exp += amount * cfg.share;
    while (st.lv < cfg.max_level && st.exp >= compNeed(game.data, st.lv)) {
      st.exp -= compNeed(game.data, st.lv); st.lv++;
      game.toast(`Khôi lỗi ${game.data.npcs[id].name} lên cấp ${st.lv}!`, 1.6);
    }
  }
}

// Mang theo / cất khôi lỗi: tối đa 2 con; đủ 2 thì con mới thay con thứ hai
export function togglePuppet(game, id) {
  const s = game.save;
  if (!s.comps?.[id]) return;
  if (s.companion === id) { s.companion = s.companion2 || null; s.companion2 = null; }
  else if (s.companion2 === id) s.companion2 = null;
  else if (!s.companion) s.companion = id;
  else s.companion2 = id;
  game.npcs = game.npcs.filter(n => n.id !== id);
  spawnCompanion(game); game.persist();
}

export function setCompanion(game, id) {
  const s = game.save;
  s.comps ??= {};
  s.comps[id] ??= { lv: 1, exp: 0 };
  s.companion = id;
  game.npcs = game.npcs.filter(n => n.id !== id);
  spawnCompanion(game); game.persist();
}

// Nói chuyện với người có thể mời: mời đi cùng, hoặc trò chuyện
export async function talkCompanion(game, npc) {
  const d = C(game).list[npc.id], name = npc.def.name, lv = compLevel(game, npc.id);
  const pick = await game.dialog.choose(`${name}${lv ? ` (cấp ${lv})` : ''}: ${d.desc}`, [
    { id: 'join', label: 'Mời đi cùng', desc: game.save.companion ? `${game.data.npcs[game.save.companion].name} sẽ về nghỉ` : 'Mang theo một người', color: d.color },
    { id: 'talk', label: 'Trò chuyện', desc: '' },
  ]);
  if (pick === 'join') {
    setCompanion(game, npc.id);
    await game.dialog.say([[name, d.join]]);
  } else if (pick === 'talk') await game.dialog.say([[name, npc.def.lines[Math.floor(Math.random() * npc.def.lines.length)]]]);
}

// Người chơi gục: ghi lượt gục để vẽ tại chỗ (render/draw-act-fx.js): hồn người chơi bay lên, bạn đồng hành ngã theo rồi đứng dậy ở điểm hồi sinh
export function downFx(game) {
  const p = game.player, el = game.save.element && game.data.elements[game.save.element]?.color, d = game.downs ||= [];
  const H = game.data.heroes, key = H.list[game.save.look] ? game.save.look : H.default, hid = `hero.y-${curOutfit(game)}-${key}`;   // trang phục chibi: nhân vật ngã theo khung ngã
  d.push({ id: game.data.art.sprites[hid]?.frames >= 6 ? hid : null, x: p.x, y: p.y, dir: p.lookX || 1, t0: game.time, color: el || '#bff4ff' });
  const c = game.comp;
  if (c && game.data.art.sprites['comp.' + c.id]?.frames >= 6) d.push({ id: 'comp.' + c.id, x: c.x, y: c.y, dir: c.face < 0 ? -1 : 1, t0: game.time, color: c.npc.color });
}
