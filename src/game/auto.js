// Tự động săn (nút Tự đánh): đánh quái thường quanh chỗ bật, không tự làm truyện, không đánh boss, không chạy trong bí cảnh, tháp, độ kiếp.
import { dist } from './combat.js';
import { skillSlots } from './skills.js';
import { weaponId } from './stats.js';

export const autoAllowed = game => !(game.map.def.rooms || []).length && !game.map.def.tower && !game.map.def.res && !game.map.def.indoor && !game.trib.active;

export function toggleAuto(game) {
  if (!game.auto && !autoAllowed(game)) { game.toast('Không tự đánh được ở đây.', 1.4); return; }
  game.auto = !game.auto;
  if (game.auto) game.autoHome = { x: game.player.x, y: game.player.y };
  game.toast(game.auto ? 'Tự đánh: săn quái quanh đây' : 'Tắt tự đánh', 1.2);
}

// Gọi khi người chơi không tự đẩy cần: trả về hướng đi và có đánh thường không; bấm chiêu đã hồi
export function autoStep(game, ax) {
  const p = game.player, cfg = game.data.config.auto;
  if (!game.auto) return { ax, atk: false };
  if (!autoAllowed(game)) { game.auto = false; return { ax, atk: false }; }
  if (Math.hypot(ax.x, ax.y) > 0.1) { game.autoHome = { x: p.x, y: p.y }; return { ax, atk: false }; } // tự tay đi: dời chỗ săn theo
  const home = game.autoHome;
  let tgt = null, bd = Infinity;
  for (const m of game.mobs) {
    if (m.dead || m.def.ai === 'boss' || m.story || Math.hypot(m.x - home.x, m.y - home.y) > cfg.radius) continue;
    const d = dist(m, p); if (d < bd) { bd = d; tgt = m; }
  }
  if (!tgt) return { ax: Math.hypot(home.x - p.x, home.y - p.y) > 8 ? toward(p, home.x, home.y) : ax, atk: false };
  return fightStep(game, tgt, ax);
}

export const toward = (p, x, y) => { const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; };

// Đánh một con: áp sát tới tầm vũ khí, đánh thường, bấm chiêu đã hồi
export function fightStep(game, tgt, ax = { x: 0, y: 0 }) {
  const p = game.player, w = game.data.weapons[weaponId(game.save, game.data)], bd = dist(tgt, p);
  const reach = w.range * (w.attack === 'shot' ? 0.7 : 0.6) + tgt.r;
  const slots = skillSlots(game);
  if (bd < reach + 30) for (let i = 0; i < 3; i++) if (slots[i] && p.skillCd[i] <= 0) game.input.pressed.add('s' + i);
  return bd > reach ? { ax: toward(p, tgt.x, tgt.y), atk: false } : { ax, atk: true };
}
