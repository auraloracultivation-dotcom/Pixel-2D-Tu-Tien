// Pháp bảo: nâng cấp và hạ cấp qua máy chủ (chủ dự án 15/11/2026 01:53, câu 19: đổi sang món mới thì hạ cấp món cũ được "hoàn linh thạch").
// Máy chủ giữ sổ số Linh Thạch đã trả cho từng món (migration 20261115100000_p2d_pb_ha_cap.sql): nâng cấp trừ tiền, lên cấp, ghi sổ;
// hạ cấp đưa cấp về 0, hoàn data/phap-bao.json → level.refund (80%) số trong sổ. Chơi thử không mạng, hoặc máy chủ chưa có hàm: nâng cấp
// tính ở máy như cũ (pbUpgrade), hạ cấp không làm được (không có sổ thì không hoàn).
import { PB, pbUpgrade, pbUpCost } from './phap-bao.js';
import { addCoins } from './shop.js';

const net = async () => (await import('../net/ky-mon.js')).pbCalls;
let noFn = false;
const done = game => { game.refreshStats?.(); game.persist?.(); };

// Linh Thạch hoàn ước tính (đúng số nếu mọi cấp đều nâng qua máy chủ hoặc có trước khi có sổ)
export function pbRefund(game, it) {
  let s = 0;
  for (let i = 0; i < (it.lv || 0); i++) s += pbUpCost(game, { ...it, lv: i });
  return Math.floor((PB(game).level.refund ?? 0.8) * s);
}
export const pbCanDown = game => !!game.cloud && !noFn;

// Trả null khi lên cấp, hoặc chữ báo lỗi (như pbUpgrade)
export async function pbUpgradeNet(game, it) {
  if (!game.cloud || noFn) return pbUpgrade(game, it);
  const U = PB(game).ui, c = pbUpCost(game, it);
  if ((game.save.lingshi || 0) < c) return U.no_ls;
  if (game.kyBusy) return '';
  game.kyBusy = true;
  try {
    let ok = false;
    await game.cloud.run(async () => (await net()).up(it.uid), r => { addCoins(game, -(r?.tru ?? c), 'pb-nang'); it.lv = r?.lv ?? (it.lv || 0) + 1; ok = true; game.sfx?.('anvil'); done(game); });
    return ok ? null : U.fail_net;
  } catch (e) {
    const m = String(e?.message || '');
    if (m.includes('chua_co_ham')) { noFn = true; return pbUpgrade(game, it); }
    return m.includes('thieu') ? U.no_ls : m.includes('tran') ? U.cap : U.fail_net;
  } finally { game.kyBusy = false; }
}

// Trả { msg, hoan }
export async function pbDowngrade(game, it) {
  const U = PB(game).ui;
  if (!(it.lv > 0)) return { msg: U.down_none, hoan: 0 };
  if (!pbCanDown(game)) return { msg: U.down_off, hoan: 0 };
  if (game.kyBusy) return { msg: '', hoan: 0 };
  game.kyBusy = true;
  try {
    let res = null;
    await game.cloud.run(async () => (await net()).down(it.uid), r => {
      const n = r?.hoan || 0; it.lv = 0; if (n) { addCoins(game, n, 'pb-hoan'); if (game.save.stats) game.save.stats.coins -= n; } done(game);   // tiền hoàn không tính là kiếm được
      res = { msg: U.down_ok.replace('{lv}', r?.lv_cu ?? '').replace('{n}', n.toLocaleString('vi-VN')), hoan: n };
    });
    return res || { msg: U.fail_net, hoan: 0 };
  } catch (e) {
    const m = String(e?.message || '');
    if (m.includes('chua_co_ham')) noFn = true;
    return { msg: m.includes('chua_co_ham') ? U.down_off : U.fail_net, hoan: 0 };
  } finally { game.kyBusy = false; }
}
