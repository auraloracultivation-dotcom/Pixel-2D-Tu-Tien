// Tẩy luyện, cường hoá, đổi hệ khi đã đăng nhập: máy chủ quyết (chủ dự án duyệt 05/11/2026, chống sửa món trong túi).
// Máy chủ tung, trừ Linh Thạch / nguyên liệu trên bản lưu máy chủ, ký lại món (migration 20261105010000_p2d_ky_mon.sql);
// máy này làm theo kết quả qua game.cloud.run (đẩy bản lưu mới nhất trước, nhận phien_ban mới, không đè nhau).
// Chơi thử không tài khoản (không có game.cloud) hoặc máy chủ chưa có hàm: tính ở máy như cũ (items.js, enhance.js, daovan.js).
// Chữ báo ở data/items.json → ky_mon.
import { reroll } from './items.js';
import { enhance } from './enhance.js';
import { rerollEl } from './daovan.js';
import { noteCoins } from './coin-log.js';

const net = async () => (await import('../net/ky-mon.js')).kyCalls;
let noFn = false;   // máy chủ chưa có hàm: từ đó về sau tính ở máy

export const onServer = game => !!game.cloud && !noFn;
export const kyBusy = game => !!game.kyBusy;

// Thay món trong túi bằng bản máy chủ (giữ nguyên đối tượng để chỗ khác đang trỏ tới vẫn đúng), trừ phần máy chủ đã trừ
export function applyKy(game, r) {
  const s = game.save, it = r?.mon && s.bag.find(x => x.uid === r.mon.uid);
  if (it) { for (const k of Object.keys(it)) if (!(k in r.mon)) delete it[k]; Object.assign(it, r.mon); }
  const t = r?.tru || {};
  if (t.coins) { s.lingshi = Math.max(0, (s.lingshi || 0) - t.coins); noteCoins(s, -t.coins, t.why || 'tay-luyen'); }
  for (const [m, n] of Object.entries(t.mats || {})) if (n) s.mats[m] = Math.max(0, (s.mats[m] || 0) - n);
  game.refreshStats?.(); game.persist?.();
  return it;
}

export function kyErr(game, e) {
  const msg = String(e?.message || ''), E = game.data.items.ky_mon.err;
  return E[Object.keys(E).find(k => msg.includes(k))] || E.other;
}

// Gọi một lệnh máy chủ; lỗi thì báo bằng toast, trả null. 'chua_co_ham' thì chạy local() như cũ.
async function run(game, kind, uid, why, local, quiet = false) {
  if (!onServer(game)) return local();
  if (game.kyBusy) return null;
  game.kyBusy = true;
  try {
    return await game.cloud.run(async () => (await net())[kind](uid), r => applyKy(game, { ...r, tru: { ...r.tru, why } }));
  } catch (e) {
    if (String(e?.message).includes('chua_co_ham')) { noFn = true; return local(); }
    if (!quiet) game.toast(kyErr(game, e), 2.4);
    return null;
  } finally { game.kyBusy = false; }
}

// Như items.js reroll: trả { line, last }, { full } khi đã đủ dòng, false / null khi không làm được
export async function kyReroll(game, uid) {
  const r = await run(game, 'reroll', uid, 'tay-luyen', () => reroll(game.data, game.save, uid));
  if (!r || !('mon' in r)) return r;   // tính ở máy: r đã đúng dạng
  return r.du_dong ? { full: true } : { line: r.dong, last: !!r.cuoi };
}

// Như enhance.js enhance: 'up' | 'fail' | 'drop' | null
export async function kyEnhance(game, uid, quiet = false) {   // quiet: tự hành, lỗi không báo
  const r = await run(game, 'enhance', uid, 'cuong-hoa', () => enhance(game, uid), quiet);
  return r && typeof r === 'object' ? r.kq : r;
}

// Như daovan.js rerollEl: trả hệ mới hoặc null
export async function kyRerollEl(game, uid) {
  const r = await run(game, 'rerollEl', uid, 'dao-van', () => rerollEl(game, uid));
  return r && typeof r === 'object' ? r.he : r;
}
