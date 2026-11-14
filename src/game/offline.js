// Bế quan khi vắng mặt: lúc vào lại game, cộng linh khí theo thời gian rời đi (data/config.json → offline).
// Rời game khi đang ở động phủ thì bế quan ở nhà: đồ trang trí và đạo lữ ở nhà làm nhanh thêm.
import { qiNeed, realmBuff } from './stats.js';
import { daoLuHere } from './affinity.js';
import { comfort } from './decor.js';
import { awayGifts } from './offgift.js';
import { noteOffline } from './retreat.js';
import { maiOn, restSpan } from './hen-mai.js';
import { pbOn, pbState, pbType } from './phap-bao.js';

// Hệ số bế quan ở nhà: đồ trang trí cộng phần trăm, đạo lữ ở nhà thì song tu
function homeOffline(game) {
  const s = game.save, h = game.data.home;
  if (s.map !== h.map) return 1;
  const d = daoLuHere(game);
  return (1 + comfort(game) / 100) * (d && s.companion !== d ? h.song_tu.mul : 1);
}

export const stamp = save => { save.lastSeen = Date.now(); };

export async function offlineGains(game, lastSeen) {
  const s = game.save, cfg = game.data.config, o = cfg.offline;
  const away = lastSeen ? (Date.now() - lastSeen) / 1000 : 0;
  if (away < o.min_minutes * 60) { await letter(game, away); return; }
  const maxH = o.max_hours + (realmBuff(s, game.data.realms).off || 0);   // cảnh giới gia trì: bế quan lâu hơn
  const sec = Math.min(away, maxH * 3600);
  noteOffline(game, sec);   // cộng vào giờ bế quan tích luỹ (src/game/retreat.js)
  const layer = s.layer, realm = s.realm;
  const mul = homeOffline(game);
  const before = { realm: s.realm, layer: s.layer, qi: s.qi }, pb0 = pbOn(game) ? pbState(game).items.map(i => i.uid) : [];
  game.mungMute = true;   // lên tầng trong lúc vắng: thẻ Xuất quan bên dưới kể từng tầng, thẻ mừng lên tầng (src/game/len-tang.js) khỏi hiện chồng
  const got = game.gainQi(cfg.meditate.qi_per_sec * o.rate * sec * mul, game.player.x, game.player.y, true);
  game.mungMute = false;
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  const capped = away > sec ? ` (tối đa ${maxH} tiếng)` : '';
  const full = s.layer >= game.data.realms.layers && s.qi >= qiNeed(s, game.data.realms);
  const up = (s.layer !== layer || s.realm !== realm ? ' Tu vi đã tăng tầng!' : '') + (full ? ' Linh khí đã đầy tới đỉnh, cần độ thiên kiếp.' : '');
  const home = mul > 1 ? ` Bế quan ở động phủ nên nhanh gấp ${String(Math.round(mul * 100) / 100).replace('.', ',')}.` : '';
  const gifts = awayGifts(game, sec);
  // Màn "Xuất quan" (docs/10-CAI-HON.md việc 5b, src/ui/hen-mai.js): thay dòng thoại bằng thẻ cho thấy từng tầng sáng lên; công tắc mai tắt thì như cũ
  let shown = false;
  if (maiOn(game) && game.xuatQuanShow) {
    await new Promise(r => setTimeout(r, 250));   // chờ một nhịp: mốc vừa qua có thể bật bảng chọn pháp bảo
    for (let i = 0; i < 300 && game.dialog?.open; i++) await new Promise(r => setTimeout(r, 200));   // đang chọn pháp bảo: chọn xong mới mở thẻ
    const pb = pbOn(game) ? pbState(game).items.filter(i => !pb0.includes(i.uid)).map(i => pbType(game, i).name) : [];   // pháp bảo nhận ở các mốc vừa qua
    try { await game.xuatQuanShow({ ...restSpan(game.data.realms, before, got), time: `${h ? h + ' giờ ' : ''}${m} phút`, home: mul > 1 ? String(Math.round(mul * 100) / 100).replace('.', ',') : '', gifts, pb }); shown = true; }
    catch (e) { console.error('xuat quan', e); }   // thẻ lỗi thì báo bằng dòng thoại như cũ, không để kẹt lúc vào game
  }
  if (!shown) await game.dialog.say([['', `Bạn bế quan ${h ? h + ' giờ ' : ''}${m} phút khi vắng mặt${capped}. Linh khí chảy vào người.${home}${up}`], ...gifts]);
  await letter(game, away);
}

// Thư đạo lữ để lại khi vắng lâu (data/letters.json)
async function letter(game, away) {
  const L = game.data.letters, who = daoLuHere(game), set = who && L.lines[who];
  if (!set || away < L.min_minutes * 60) return;
  const h = Math.floor(away / 3600), time = h >= 24 ? `${Math.floor(h / 24)} ngày` : h ? `${h} giờ` : `${Math.floor(away / 60)} phút`;
  await game.dialog.say([[`Thư của ${game.data.npcs[who].name}`, set[Math.floor(Math.random() * set.length)].replace('{time}', time)]]);
}
