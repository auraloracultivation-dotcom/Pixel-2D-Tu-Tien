// Luyện pháp bảo (data/gear.json → refine): phân giải pháp bảo ra mảnh, dùng mảnh nâng bậc pháp bảo (it.pb).
// Bậc nhân chỉ số chính của pháp bảo và sức chiêu pháp bảo; không sửa chỉ số đã lưu trong món.
const R = data => data.gear.refine;

export const isArt = (data, it) => data.items.bases[it?.base]?.slot === 'phap-bao';
export const refineMul = (data, it) => 1 + (isArt(data, it) ? (it.pb || 0) * R(data).per : 0);

// Mảnh cần để luyện từ bậc hiện tại lên bậc kế; null nếu đã tối đa hoặc không phải pháp bảo
export function refineCost(data, it) {
  const c = R(data), n = it.pb || 0;
  return isArt(data, it) && n < c.max ? Math.ceil(c.base * c.r ** n - 1e-9) : null;
}

export function refine(game, it) {
  const c = R(game.data), need = refineCost(game.data, it), s = game.save;
  if (need == null || (s.mats[c.mat] || 0) < need) return false;
  s.mats[c.mat] -= need;
  it.pb = (it.pb || 0) + 1;
  game.persist();
  return true;
}

// Phân giải pháp bảo: thêm mảnh theo độ hiếm (gọi sau khi món đã bị bỏ khỏi túi)
export function salvageArt(game, it) {
  if (!isArt(game.data, it)) return 0;
  const c = R(game.data), n = (c.salvage[it.rarity] || 1) + Math.floor((it.pb || 0) / 2);   // bậc đã luyện trả lại một phần
  game.save.mats[c.mat] = (game.save.mats[c.mat] || 0) + n;
  return n;
}

// Chiêu pháp bảo mạnh thêm theo bậc của pháp bảo đang mặc
export function artSkillMul(game, id) {
  const s = game.save, it = s?.bag?.find(i => i.uid === s.equip?.['phap-bao']);
  return it && game.data.items.bases[it.base]?.art === id ? 1 + (it.pb || 0) * R(game.data).skill : 1;
}
