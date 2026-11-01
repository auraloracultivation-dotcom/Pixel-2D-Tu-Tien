// Một lượt bí cảnh (chủ dự án chốt 02/11/2026 03:25): chụp túi lúc vào, hết lượt so lại để hiện bảng ô vuông mọi thứ thu được.
// Mỗi bí cảnh tối đa dungeon.per_day lượt mỗi ngày (vượt hay càn quét đều tính). Càn quét: bậc đã qua, nhận ngay thưởng cố định
// của bậc đó, không phải đánh. Bảng kết quả (src/ui/dun-result.js) có 3 nút: Tiếp tục (bậc kế), Càn quét, Thoát.
import { grant } from './daily.js';

const C = game => game.data.dungeon;
const today = () => new Date().toDateString();

// Số lượt đã dùng hôm nay của bí cảnh id
export function runsUsed(game, id) {
  const s = game.save, r = s.dunRuns?.day === today() ? s.dunRuns : (s.dunRuns = { day: today() });
  return r[id] || 0;
}
export const runsLeft = (game, id) => Math.max(0, C(game).per_day - runsUsed(game, id));
export function useRun(game, id) { runsUsed(game, id); game.save.dunRuns[id] = (game.save.dunRuns[id] || 0) + 1; }

// Thưởng cố định của bậc L (cấp theo bậc, Linh Thạch nhích theo bậc, trang bị đúng ô của bí cảnh)
export function rewardOf(game, id, L) {
  const D = C(game), M = D.modes, md = M[Math.min(M.length - 1, Math.floor(L / D.steps))];
  if (!md?.reward) return null;
  return { ...md.reward, slot: D.drops?.[id], coins: Math.round((md.reward.coins || 0) * (1 + D.reward_step * (L % D.steps))) || undefined };
}

export function snapRun(game) {
  const s = game.save;
  return { coins: s.lingshi || 0, mats: { ...s.mats }, gems: { ...s.gems }, pills: { ...(s.pills || {}) }, uids: new Set((s.bag || []).map(i => i.uid)) };
}

// Thứ tăng thêm so với lúc chụp: [{ kind: 'coins'|'mat'|'gem'|'pill'|'item', id, n, it }]
export function diffRun(game, snap) {
  const s = game.save, out = [], up = (kind, now, was) => {
    for (const [id, n] of Object.entries(now || {})) { const d = Math.floor(n - (was[id] || 0)); if (d > 0) out.push({ kind, id, n: d }); }
  };
  const c = Math.floor((s.lingshi || 0) - snap.coins);
  if (c > 0) out.push({ kind: 'coins', id: 'coins', n: c });
  for (const it of s.bag || []) if (!snap.uids.has(it.uid)) out.push({ kind: 'item', id: it.uid, n: 1, it });
  up('gem', s.gems, snap.gems); up('pill', s.pills, snap.pills); up('mat', s.mats, snap.mats);
  return out;
}

// Vào bản đồ bí cảnh (createDungeon gọi): bắt đầu đếm đồ thu được
export function startRun(game) { game.dunRun = { id: game.map.id, L: game.dunMode || 0, snap: snapRun(game) }; }

// Hạ boss xong (dungeonDone gọi sau khi phát thưởng): mở bảng kết quả
export function finishRun(game) {
  const r = game.dunRun;
  if (!r || r.id !== game.map.id) return;
  game.dunRun = null;
  setTimeout(() => game.openDunResult?.({ id: r.id, L: r.L, loot: diffRun(game, r.snap), inside: true, party: !!game.party?.run }), 600);
}

// Càn quét bậc L đã qua: tốn một lượt, nhận ngay thưởng cố định. Trả về danh sách đồ nhận, null khi không được
export function sweep(game, id, L) {
  if (runsLeft(game, id) <= 0 || L < 0) return null;
  const r = rewardOf(game, id, L);
  if (!r) return null;
  const snap = snapRun(game);
  useRun(game, id);
  grant(game, r);
  return diffRun(game, snap);
}

// Vào bậc L của bí cảnh id (nút Tiếp tục): bay qua cổng vào phòng đầu
export async function enterLevel(game, id, L) {
  if (runsLeft(game, id) <= 0) return false;
  game.dunMode = L;
  const sp = game.data.maps[id].spawns || {};
  await game.travel(id, sp.vao ? 'vao' : Object.keys(sp)[0], true, { text: game.data.maps[id].name, kind: 'portal' });
  return true;
}

// Thoát bí cảnh: đi cổng ra của bản đồ đang đứng
export async function leaveRun(game) {
  const pt = (game.map.def.portals || [])[0];
  if (!pt || !(game.map.def.rooms || []).length) return;
  game.dunMode = 0;
  await game.travel(pt.to, pt.spawn, true, { text: pt.label, kind: 'portal' });
}
