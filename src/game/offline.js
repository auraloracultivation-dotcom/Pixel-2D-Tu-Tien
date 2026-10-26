// Bế quan khi vắng mặt: lúc vào lại game, cộng linh khí theo thời gian rời đi (data/config.json → offline).
import { qiNeed } from './stats.js';
import { daoLu } from './affinity.js';

export const stamp = save => { save.lastSeen = Date.now(); };

export async function offlineGains(game, lastSeen) {
  const s = game.save, cfg = game.data.config, o = cfg.offline;
  const away = lastSeen ? (Date.now() - lastSeen) / 1000 : 0;
  if (away < o.min_minutes * 60) { await letter(game, away); return; }
  const sec = Math.min(away, o.max_hours * 3600);
  const layer = s.layer, realm = s.realm;
  game.gainQi(cfg.meditate.qi_per_sec * o.rate * sec, game.player.x, game.player.y, true);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  const capped = away > sec ? ` (tối đa ${o.max_hours} tiếng)` : '';
  const full = s.layer >= game.data.realms.layers && s.qi >= qiNeed(s, game.data.realms);
  const up = (s.layer !== layer || s.realm !== realm ? ' Tu vi đã tăng tầng!' : '') + (full ? ' Linh khí đã đầy tới đỉnh, cần độ thiên kiếp.' : '');
  await game.dialog.say([['', `Bạn bế quan ${h ? h + ' giờ ' : ''}${m} phút khi vắng mặt${capped}. Linh khí chảy vào người.${up}`]]);
  await letter(game, away);
}

// Thư đạo lữ để lại khi vắng lâu (data/letters.json)
async function letter(game, away) {
  const L = game.data.letters, who = daoLu(game), set = who && L.lines[who];
  if (!set || away < L.min_minutes * 60) return;
  const h = Math.floor(away / 3600), time = h >= 24 ? `${Math.floor(h / 24)} ngày` : h ? `${h} giờ` : `${Math.floor(away / 60)} phút`;
  await game.dialog.say([[`Thư của ${game.data.npcs[who].name}`, set[Math.floor(Math.random() * set.length)].replace('{time}', time)]]);
}
