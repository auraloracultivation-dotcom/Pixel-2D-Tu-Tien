// Linh thú, khôi lỗi, thú cưỡi, công pháp, thời trang, cấp chiêu, động phủ do máy chủ kiểm (chủ dự án duyệt 05/11/2026 "vá lỗ hổng
// linh thú", migration 20261105120000_p2d_ky_thu.sql). Máy chủ so mỗi lần lưu với bản máy chủ; phần sai trả về sua.thu:
// applyThu sửa lại bản trong máy (mã → bản máy chủ, null là bỏ). Tẩy luyện linh thú / khôi lỗi / thú cưỡi khi đã đăng nhập:
// máy chủ tung (p2d_tay_thu) qua game.cloud.run như src/game/ky-mon.js; chơi thử không tài khoản / máy chủ chưa có hàm: tính ở máy.
import { rerollBeast, rerollMount } from './beast.js';
import { tierOf } from './tiers.js';
import { kyErr } from './ky-mon.js';
import { noteCoins } from './coin-log.js';
import { spawnPet } from './pets.js';
import { spawnCompanion } from './companion.js';

const net = async () => (await import('../net/ky-mon.js')).kyCalls;
const MAPS = ['pets', 'comps', 'mounts', 'mountLine', 'outfits', 'outfitLine', 'techs', 'skillLv'];
const ONE = ['caveLv', 'pet', 'mount', 'companion', 'companion2'];
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
let noFn = false;   // máy chủ chưa có p2d_tay_thu: từ đó về sau tính ở máy

// Thay đối tượng tại chỗ (chỗ khác đang trỏ tới vẫn đúng)
function put(o, k, v) {
  if (v === null) { delete o[k]; return; }
  const cur = o[k];
  if (isObj(v) && isObj(cur)) { for (const x of Object.keys(cur)) if (!(x in v)) delete cur[x]; Object.assign(cur, v); }
  else o[k] = isObj(v) ? { ...v } : v;
}

// sua.thu: { pets: { mã: bản máy chủ | null }, …, mounts_all (bảng thú cưỡi đầy đủ), techSlots, caveLv, pet, mount, companion, companion2, im }
export function applyThu(game, t) {
  const s = game.save;
  if (!s || !isObj(t)) return;
  for (const k of MAPS) {
    if (!isObj(t[k])) continue;
    if (!isObj(s[k])) s[k] = {};
    for (const [id, v] of Object.entries(t[k])) put(s[k], id, v);
  }
  if (isObj(t.mounts_all)) s.mounts = { ...t.mounts_all };
  if (Array.isArray(t.techSlots)) s.techSlots = t.techSlots.slice();
  for (const k of ONE) if (k in t) s[k] = t[k];
  try {
    if (t.pets || 'pet' in t) spawnPet(game);
    if (t.comps || 'companion' in t || 'companion2' in t) spawnCompanion(game);
  } catch { /* chưa vào bản đồ */ }
}

// Chỉ dòng máy chủ bốc thay chỗ trống (không có gì sai): khỏi báo "đã khôi phục"
export const thuQuiet = sua => !!sua?.thu?.im && Object.keys(sua).every(k => k === 'thu');

// Nhận kết quả máy chủ: dòng mới, trừ phí như máy chủ đã trừ
function mirror(game, loai, id, r) {
  const s = game.save;
  if (loai === 'mount') (s.mountLine ??= {})[id] = r.thu;
  else { const k = loai === 'pet' ? 'pets' : 'comps'; if (isObj(s[k]?.[id]) && isObj(r.thu)) put(s[k], id, r.thu); }
  const t = r.tru || {};
  if (t.coins) { s.lingshi = Math.max(0, (s.lingshi || 0) - t.coins); noteCoins(s, -t.coins, 'linh-thu'); }
  for (const [m, n] of Object.entries(t.mats || {})) if (n) s.mats[m] = Math.max(0, (s.mats[m] || 0) - n);
  game.refreshStats?.(); game.persist?.();
  if (!r.du_dong) game.sfx?.('levelup');
}

async function run(game, loai, id, local) {
  if (!game.cloud || noFn) return { local: local() };
  if (game.kyBusy) return { msg: game.data.items.ky_mon.busy };
  game.kyBusy = true;
  try {
    return { r: await game.cloud.run(async () => (await net()).rerollThu(loai, id), r => mirror(game, loai, id, r)) };
  } catch (e) {
    if (String(e?.message).includes('chua_co_ham')) { noFn = true; return { local: local() }; }
    return { msg: kyErr(game, e) };
  } finally { game.kyBusy = false; }
}

// Như beast.js rerollBeast: trả câu báo
export async function kyRerollBeast(game, kind, id) {
  const x = await run(game, kind === 'pet' ? 'pet' : 'puppet', id, () => rerollBeast(game, kind, id));
  if ('local' in x) return x.local;
  if (x.msg) return x.msg;
  const { data } = game, b = x.r.thu, r = { line: x.r.dong, last: x.r.cuoi };
  if (x.r.du_dong) return `Đã đủ ${b.cap} dòng, không tẩy thêm được.`;
  return `Mở dòng ${tierOf(data, r.line.t).name}: ${data.items.stats[r.line.s].name} +${r.line.v}${r.last ? ' · đã đủ dòng' : ''}`;
}

// Như beast.js rerollMount: trả câu báo
export async function kyRerollMount(game, id) {
  const x = await run(game, 'mount', id, () => rerollMount(game, id));
  if ('local' in x) return x.local;
  if (x.msg) return x.msg;
  const { data } = game, l = x.r.thu;
  return `Dòng mới [${tierOf(data, l.t).name}] ${data.items.stats[l.s].name} +${l.v}%`;
}
