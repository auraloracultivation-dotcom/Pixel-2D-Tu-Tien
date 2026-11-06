// Tiếng chiêu theo hệ (chủ dự án 06/11/2026 19:15: làm lại bộ âm thanh): data/sounds.json → by_fx[fx của chiêu] = [tiếng phát, tiếng trúng].
// Chiêu chưa có trong bảng thì dùng tiếng chung theo loại chiêu như cũ.
const BY_TYPE = { projectile: 'shoot', multi: 'shoot', aoe: 'boom', zone: 'boom', heal: 'heal', shield: 'shield', buff: 'buff', dash: 'dash' };

const pair = (game, s) => (s && game.data.sounds.by_fx?.[s.fx]) || null;

export function castSfx(game, s, vol = 1) {
  game.sfx(pair(game, s)?.[0] || BY_TYPE[s.type], vol);
}

// id: chiêu (b.sk của đạn). Không có tiếng trúng riêng thì im, tiếng 'hit' của đòn đánh đã kêu (src/game/combat.js)
export function hitSfx(game, id, vol = 0.7) {
  const h = pair(game, game.data.skills[id])?.[1];
  if (h) game.sfx(h, vol);
}
