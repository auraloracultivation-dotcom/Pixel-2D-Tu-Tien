// Sổ tự hành: lúc tắt tự hành (bấm nút, gục, bấm Tự đánh...) báo gọn đã làm được gì trong lượt đó (data/config.json → pilot.log).
import { totalLayer } from './stats.js';
import { coins } from './shop.js';

function snap(game) {
  const s = game.save, fish = Object.keys(game.data.fishing.fish);
  return {
    t: Date.now(), kills: s.stats?.kills || 0, items: s.nextUid || 0, coins: coins(s),
    fish: fish.reduce((a, id) => a + (s.mats[id] || 0), 0), layers: totalLayer(s, game.data.realms),
  };
}

export function updatePilotLog(game) {
  if (game.pilot && !game.pilotLog) game.pilotLog = snap(game);
  if (game.pilot || !game.pilotLog) return;
  const a = game.pilotLog, b = snap(game), L = game.data.config.pilot.log;
  game.pilotLog = null;
  const sec = (b.t - a.t) / 1000;
  if (sec < L.min_sec) return;
  const parts = Object.entries(L.parts).map(([k, f]) => b[k] - a[k] > 0 && f.replace('{n}', (b[k] - a[k]).toLocaleString('vi-VN')).replace('{coin}', game.data.shop.name)).filter(Boolean);
  setTimeout(() => game.toast(L.head.replace('{min}', Math.max(1, Math.round(sec / 60))) + ' ' + (parts.length ? parts.join(', ') + '.' : L.none), L.sec), L.delay * 1000);   // chờ thông báo tắt tự hành hiện xong
}
