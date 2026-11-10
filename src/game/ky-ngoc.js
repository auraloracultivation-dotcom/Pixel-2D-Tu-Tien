// Khảm / gỡ / ghép ngọc, luyện pháp bảo khi đã đăng nhập: máy chủ quyết (chữ ký món giai đoạn 2, chủ dự án duyệt 05/11/2026).
// Máy chủ chuyển ngọc giữa túi ngọc và ô khảm, trừ Linh Thạch / mảnh pháp bảo trên bản lưu máy chủ, ký lại món
// (migration 20261105020000_p2d_ky_ngoc.sql); máy này làm theo qua game.cloud.run như tẩy luyện (src/game/ky-mon.js).
// Chơi thử không tài khoản hoặc máy chủ chưa có hàm: tính ở máy như cũ (items.js socket / unsocket / mergeGems, refine.js).
import { socket, unsocket, mergeGems } from './items.js';
import { refine } from './refine.js';
import { applyKy, kyErr } from './ky-mon.js';
import { dailyEvent } from './daily.js';

const net = async () => (await import('../net/ky-mon.js')).kyCalls;
let noFn = false;   // máy chủ chưa có hàm giai đoạn 2: từ đó về sau tính ở máy (riêng với tẩy luyện, cường hoá)

export const gemOnServer = game => !!game.cloud && !noFn;

// Ngọc thêm / bớt theo máy chủ ({ "loại:cấp": số }), hết thì xoá khoá như máy khách
export function applyDoi(save, doi) {
  save.gems ??= {};
  for (const [k, n] of Object.entries(doi || {})) {
    if (!n) continue;
    save.gems[k] = Math.max(0, (save.gems[k] || 0) + n);
    if (!save.gems[k]) delete save.gems[k];
  }
}

// Gọi một lệnh máy chủ; lỗi thì báo bằng toast (quiet: tự hành, không báo), trả null. 'chua_co_ham' thì chạy local().
async function run(game, call, why, local, quiet = false) {
  if (!gemOnServer(game)) return local();
  if (game.kyBusy) return null;
  game.kyBusy = true;
  try {
    return await game.cloud.run(async () => call(await net()), r => { applyDoi(game.save, r?.doi); applyKy(game, { ...r, tru: { ...r?.tru, why } }); });
  } catch (e) {
    if (String(e?.message).includes('chua_co_ham')) { noFn = true; return local(); }
    if (!quiet) game.toast(kyErr(game, e), 2.4);
    return null;
  } finally { game.kyBusy = false; }
}

const ok = r => !!r;   // máy chủ trả món (object), tính ở máy trả true / false

// Như items.js socket: true khi đã khảm
export async function kySocket(game, uid, idx, key, quiet = false) {
  const r = ok(await run(game, n => n.socket(uid, idx, key), 'kham-ngoc', () => socket(game.save, uid, idx, key), quiet));
  if (r && !quiet) dailyEvent(game, 'socket');   // việc ngày Khảm ngọc (tự khảm không tính)
  return r;
}

// Như items.js unsocket: true khi đã gỡ
export async function kyUnsocket(game, uid, idx) {
  return ok(await run(game, n => n.unsocket(uid, idx), 'go-ngoc', () => unsocket(game.save, uid, idx)));
}

// Ghép tối đa n lần (nút "Ghép hết", tự hành 1 lần), chừa keep Linh Thạch. Trả số lần đã ghép.
export async function kyMerge(game, key, keep = 0, n = 1, quiet = false) {
  const r = await run(game, c => c.merge(key, keep, n), 'ghep-ngoc', () => {
    let k = 0;
    while (k < n && mergeGems(game.data, game.save, key, keep)) k++;
    return k;
  }, quiet);
  const k = typeof r === 'number' ? r : r?.lan || 0;
  if (k && !quiet) dailyEvent(game, 'merge', null, k);   // việc ngày Ghép ngọc
  return k;
}

// Như refine.js refine: true khi đã luyện lên một bậc
export async function kyRefine(game, it) {
  return ok(await run(game, n => n.refine(it.uid), 'luyen-phap-bao', () => refine(game, it)));
}
