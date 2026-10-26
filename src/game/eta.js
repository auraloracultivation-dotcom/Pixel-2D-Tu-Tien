// Ước lượng còn bao lâu đả tọa tới cảnh giới truyện đang chờ: đo linh khí đả tọa mỗi window giây (trung bình trượt, bỏ qua lúc không ngồi),
// cộng linh khí còn thiếu của các tầng tới cảnh giới đó (data/config.json → pilot.eta).
import { qiNeed } from './stats.js';

// Gọi từ nhịp đả tọa (player.js): chỉ đếm linh khí đả tọa, không tính bế quan khi vắng mặt, thưởng nhiệm vụ, đan
export const noteQi = (game, amount) => { game.qiAcc = (game.qiAcc || 0) + amount; };

export function updateEta(game, dt) {
  const E = game.data.config.pilot.eta;
  if (game.player?.meditating) game.qiSec = (game.qiSec || 0) + dt;   // số giây thật sự ngồi trong cửa sổ
  if ((game.etaT = (game.etaT ?? E.window) - dt) > 0) return;
  game.etaT = E.window;
  const r = game.qiSec >= E.window / 4 ? (game.qiAcc || 0) / game.qiSec : 0;
  game.qiAcc = 0; game.qiSec = 0;
  if (!r) return;
  game.qiRate = game.qiRate ? game.qiRate * (1 - E.smooth) + r * E.smooth : r;
}

const fmt = (E, sec) => {
  const h = Math.floor(sec / 3600), m = Math.max(1, Math.round(sec % 3600 / 60));
  return h ? E.hours.replace('{h}', h).replace('{m}', m) : E.minutes.replace('{m}', m);
};

// Câu "còn khoảng ... tới ...", rỗng nếu truyện không chờ cảnh giới hoặc chưa đo được tốc độ
export function etaText(game) {
  const s = game.save, R = game.data.realms, E = game.data.config.pilot.eta;
  const want = game.data.story.steps[s.step]?.until?.realm;
  if (!want || s.realm >= want || !(game.qiRate > 0)) return '';
  let left = Math.max(0, qiNeed(s, R) - s.qi);
  for (let n = s.realm * R.layers + s.layer; n < want * R.layers; n++) left += qiNeed({ realm: Math.floor(n / R.layers), layer: n % R.layers + 1 }, R);
  return E.text.replace('{time}', fmt(E, left / game.qiRate)).replace('{realm}', R.names[want]);
}
