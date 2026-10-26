// Boss hiếm khi săn (data/worldboss.json): săn trên đảo đủ 15 tới 20 phút thì Yêu Vương của đảo hiện ra gần người chơi.
const C = game => game.data.worldboss;
const roll = cfg => (cfg.min_min + Math.random() * (cfg.max_min - cfg.min_min)) * 60;

export function updateWorldBoss(game, dt) {
  const cfg = C(game), s = game.save, id = cfg.maps[game.map.id];
  if (game.wb && (game.wb.dead || !game.mobs.includes(game.wb))) {
    if (!game.wb.dead) s.wbT = Math.min(s.wbT ?? Infinity, cfg.retry_min * 60); // rời đảo khi boss còn sống: hiện lại sớm
    game.wb = null;
  }
  if (!id || game.wb || game.map.def.indoor || game.story.busy || game.traveling || game.trib.active) return;
  s.wbT ??= roll(cfg);
  if ((s.wbT -= dt) > 0) return;
  s.wbT = roll(cfg);
  const p = game.player, T = game.map.T;
  const pos = game.map.freeNear(Math.floor(p.x / T) + 3, Math.floor(p.y / T) - 2, 3, 8);
  game.wb = game.spawn(id, pos.x, pos.y, { wb: true });
  game.toast(cfg.intro.replace('{name}', game.data.mobs[id].name), 2.6);
  game.sfx('roar'); game.screen.shake(4, 0.5);
  game.persist();
}
