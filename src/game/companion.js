// Bạn đồng hành (data/companions.json): mang 1 người đi cùng, đánh như linh thú, có cấp riêng.
import { updateFollower } from './pets.js';

const C = game => game.data.companions;
export const compNeed = (data, lv) => Math.round(data.companions.exp_base * Math.pow(lv, data.companions.exp_pow));
export const compLevel = (game, id = game.save.companion) => game.save.comps?.[id]?.lv || 0;
export const away = (game, id) => !!game.save.flags[C(game).list[id]?.unless];
export const canInvite = (game, id) => !!C(game).list[id] && !!game.save.flags[C(game).list[id].need || C(game).need] && !away(game, id);

export function spawnCompanion(game) {
  const id = game.save.companion, p = game.player;
  game.comp = id && p ? { id, def: C(game).list[id], npc: game.data.npcs[id], x: p.x - 10, y: p.y - 8, cd: 1, skillCd: 4, hop: 0, face: 1 } : null;
}

export function updateCompanion(game, dt) {
  if (!game.comp) return;
  if (away(game, game.comp.id)) { game.save.companion = null; game.comp = null; return; }
  updateFollower(game, game.comp, 1 + (compLevel(game) - 1) * C(game).lv_bonus, C(game).follow, dt, C(game).lift, C(game).side || 0);   // đi sau lưng, lệch lên: không chắn trước mặt
}

// Nhận một phần linh khí người chơi thu được
export function gainCompExp(game, amount) {
  const id = game.save.companion, st = game.save.comps?.[id], cfg = C(game);
  if (!st || st.lv >= cfg.max_level) return;
  st.exp += amount * cfg.share;
  while (st.lv < cfg.max_level && st.exp >= compNeed(game.data, st.lv)) {
    st.exp -= compNeed(game.data, st.lv); st.lv++;
    game.toast(`${game.data.npcs[id].name} lên cấp ${st.lv}!`, 1.6);
  }
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
  const H = game.data.heroes, key = H.list[game.save.look] ? game.save.look : H.default, hid = `hero.y-${game.save.outfit || 'dong-phuc'}-${key}`;   // trang phục chibi: nhân vật ngã theo khung ngã
  d.push({ id: game.data.art.sprites[hid]?.frames >= 6 ? hid : null, x: p.x, y: p.y, dir: p.lookX || 1, t0: game.time, color: el || '#bff4ff' });
  const c = game.comp;
  if (c && game.data.art.sprites['comp.' + c.id]?.frames >= 6) d.push({ id: 'comp.' + c.id, x: c.x, y: c.y, dir: c.face < 0 ? -1 : 1, t0: game.time, color: c.npc.color });
}
