// Nhạc trận (data/sounds.json → music.maps.boss): đang độ kiếp, hoặc boss đã nhắm mình ở gần, thì đổi sang khúc nhanh, trầm;
// hết thì về nhạc của bản đồ. Xét mỗi CHECK giây cho khỏi đổi qua lại. Quái đang đánh ở gần: lớp trống vào (src/core/music.js).
// Trùm vừa nhắm mình (lần đầu trong config.boss_intro.again giây): bảng tên trùm, tiếng gầm, rung màn (chủ dự án 08/11/2026 16:40).
import { dist } from './combat.js';

const CHECK = 0.5, NEAR = 260, FIGHT = 170;

export function updateBossMusic(game, dt) {
  if ((game.bossMusicT = (game.bossMusicT || 0) - dt) > 0) return;
  game.bossMusicT = CHECK;
  const p = game.player;
  // trùm đang nhắm mình, hoặc đứng gần đầu Cửu Đầu Thôn Thiên Mãng (đầu boss sự kiện không có aggro, src/game/thien-mang.js)
  const boss = game.mobs.find(m => !m.dead && m.def.ai === 'boss' && (m.aggro || m.wboss) && dist(m, p) < (m.wboss ? NEAR * 2 : NEAR));
  game.music(game.trib.active || boss ? 'boss' : game.map.id);
  if (boss) bossIntro(game, boss);
  const n = game.mobs.filter(m => !m.dead && m.aggro && !m.dummy && dist(m, p) < FIGHT).length;   // quái đang đánh mình ở gần: lớp trống vào theo số quái
  game.combat?.(n ? Math.min(1, 0.3 + n * 0.18) : 0);
}

function bossIntro(game, m) {
  const I = game.data.config.boss_intro, key = m.id || m.def.name;
  if (!I || game.banner) return;
  const seen = (game.bossSeen ??= {});
  if (seen[key] && game.time - seen[key] < I.again) return;
  seen[key] = game.time;
  game.banner = { name: m.wboss?.name || m.def.name, parts: [{ t: I.text, c: I.color }], at: game.time };
  game.sfx?.(I.sfx); game.screen.shake(I.shake, I.t);
}
