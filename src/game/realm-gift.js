// Quà tu vi (chủ dự án 12/11/2026 04:07 duyệt đề xuất 03:42; data/realms.json → gift, buff): mỗi lần lên tầng nhận Đá Khai Khiếu
// và Linh Thạch; đột phá cảnh giới nhận nhiều hơn và báo cảnh giới gia trì (máu, công, linh lực, tốc tu, bế quan, ô pháp bảo 4).
// save.giftAt = tổng tầng đã nhận quà; bản lưu chưa có thì ghi số hiện tại (không phát bù). Gọi từ src/game/skills.js checkUnlocks.
import { addCoins } from './shop.js';
import { realmBuff } from './stats.js';
import { pbOn, pbState, PB } from './phap-bao.js';

const total = s => (s.realm || 0) * 9 + (s.layer || 1) - 1;

export function realmGifts(game) {
  const s = game.save, R = game.data.realms, G = R.gift, n = total(s);
  if (!G) return;
  if (s.giftAt == null || s.giftAt > n) { s.giftAt = n; return; }
  if (s.giftAt === n) return;
  let stones = 0, coins = 0, broke = null;
  for (let k = s.giftAt + 1; k <= n; k++) {
    const realm = Math.floor(k / R.layers), up = k % R.layers === 0, g = up ? G.realm : G.layer, mul = Math.pow(G.grow || 1, realm);
    if (!up && k < (G.layer.from || 0)) continue;
    stones += g.stones || 0; coins += Math.round((g.coins || 0) * mul);
    if (up) broke = realm;
  }
  s.giftAt = n;
  if (coins) addCoins(game, coins, 'tu-vi');
  if (stones && pbOn(game)) { const st = pbState(game); st.stones = (st.stones || 0) + stones; }
  const parts = [coins && `${coins.toLocaleString('vi-VN')} Linh Thạch`, stones && pbOn(game) && `${stones} Đá Khai Khiếu`].filter(Boolean);
  if (broke != null) setTimeout(() => game.toast(buffLine(game, broke) + (parts.length ? ` Quà đột phá: ${parts.join(', ')}.` : ''), 6), 3200);   // sau câu "Độ kiếp thành công"
  else if (parts.length) game.toast(`Quà tu vi: ${parts.join(', ')}`, 2.4);
  game.persist?.();
}

// "Cảnh giới gia trì: Máu, Công +18% · Linh lực +15% · Tốc tu +10% · Bế quan tối đa 10 giờ · Mở ô pháp bảo thứ 4"
export function buffLine(game, realm) {
  const R = game.data.realms, b = realmBuff({ realm, layer: 1 }, R), o = game.data.config.offline.max_hours;
  const bits = [b.pct && `Máu, Công gốc +${b.pct}%`, b.mp && `Linh lực +${b.mp}%`, b.qi && `Tốc tu +${b.qi}%`, b.off && `Bế quan tối đa ${o + b.off} giờ`];
  if (pbOn(game) && realm === PB(game).slot4_realm) bits.push('Mở ô pháp bảo thứ 4');
  return `Đinh! ${R.names[realm]} gia trì: ${bits.filter(Boolean).join(' · ')}.`;
}
