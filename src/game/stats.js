// Cảnh giới, linh khí, chỉ số người chơi. Công thức lấy số từ data/realms.json.
import { gearStats, artOf } from './items.js';
import { techStats } from './techniques.js';
import { pillHp } from './cave.js';
import { setStats } from './enhance.js';
import { daoVanStats } from './daovan.js';
import { wornExtra } from './beast.js';
import { pbStats } from './phap-bao.js';
// Linh khí hạ quái nhân theo cảnh giới (data/realms.json → kill_qi): cảnh giới cao hấp thụ linh khí phàm thú chậm hơn
export const killQiMul = (save, realms) => realms.kill_qi?.[save.realm] ?? 1;
// Linh khí thật một con quái (data/mobs.json → lk, chủ dự án 09/11/2026: số ghi là số nhận, không nhân ẩn): quái bị nhân mạnh
// (vùng ma khí, bí cảnh, ma đầu, linh thú) thì lk nhân theo cùng tỉ lệ qi. qi vẫn là giá trị gốc để tính Linh Thạch rơi.
export const mobLk = (mobs, m) => { const b = mobs?.[m.id]; return b?.lk != null ? b.lk * (m.def.qi || 0) / (b.qi || 1) : (m.def.qi || 0) * 0.02; };

export function totalLayer(save, realms) {
  return save.realm * realms.layers + (save.layer - 1);
}

export function qiNeed(save, realms) {
  const n = totalLayer(save, realms), soft = realms.qi_soft_from ?? Infinity;
  return Math.round(realms.qi_base * Math.pow(realms.qi_growth, Math.min(n, soft)) * Math.pow(realms.qi_soft_growth || 1, Math.max(0, n - soft)) * (realms.need_mul?.[save.realm] ?? 1));   // need_mul: cảnh giới càng cao cần càng gấp (chủ dự án 09/11/2026)
}

export function realmLabel(save, realms) {
  if (realms.peak && save.realm >= realms.names.length - 1 && save.layer >= realms.layers) return `${realms.names[save.realm]} ${realms.peak}`;   // tầng cuối cảnh giới cuối: "Độ Kiếp Viên Mãn" (chủ dự án 04/11/2026)
  return `${realms.names[save.realm]} tầng ${save.layer}`;
}

// Phẩm linh căn (realms.roots), tung một lần lúc thức tỉnh
export function rootOf(save, data) {
  const list = data.realms.roots.list;
  return list.find(r => r.id === save.root) || list[0];
}

export function rollRoot(data) {
  const list = data.realms.roots.list, total = list.reduce((s, r) => s + r.weight, 0);
  let x = Math.random() * total;
  for (const r of list) { x -= r.weight; if (x <= 0) return r.id; }
  return list[0].id;
}

// Chiêu của pháp bảo đang mặc (ô phap-bao), không có thì null
export function artSkill(save, data) {
  const it = save.bag?.find(i => i.uid === save.equip?.['phap-bao']);
  return artOf(data, it);
}

// Loại vũ khí đang dùng: theo món mặc ở ô Vũ khí, chưa mặc thì theo cốt truyện (save.weapon)
export function weaponId(save, data) {
  const it = save.bag?.find(i => i.uid === save.equip?.['vu-khi']);
  return data.items.bases[it?.base]?.weapon || it?.wt || save.weapon;   // Đạo Vận Binh mang loại vũ khí lúc nhận (it.wt)
}

// Cảnh giới gia trì (chủ dự án 12/11/2026 04:07 duyệt đề xuất 03:42): mỗi lần đột phá cảnh giới máu, công gốc ×(1 + pct%),
// thêm linh lực %, tốc tu %, giờ bế quan tối đa (off). Viên Mãn (tầng cuối Độ Kiếp) dùng peak. data/realms.json → buff.
export function realmBuff(save, R) {
  const B = R.buff || [], b = B[Math.min(B.length - 1, save.realm || 0)] || {};
  return (save.realm || 0) >= R.names.length - 1 && (save.layer || 1) >= R.layers && R.peak_buff ? { ...b, ...R.peak_buff } : b;
}

// Chỉ số cuối = gốc theo cảnh giới + vũ khí + trang bị và ngọc khảm
export function playerStats(save, data) {
  const n = totalLayer(save, data.realms);
  const w = data.weapons[weaponId(save, data)], pc = data.config.player;
  const g = gearStats(data, save), tg = techStats(save, data);
  for (const [s, x] of Object.entries(tg)) g[s] = (g[s] || 0) + x;
  const rb = realmBuff(save, data.realms);   // cảnh giới gia trì (data/realms.json → buff): linh lực %, tốc tu %
  g.mp_pct = (g.mp_pct || 0) + (rb.mp || 0); g.qi_gain = (g.qi_gain || 0) + (rb.qi || 0);
  for (const [s, x] of Object.entries(setStats(data, save).stats)) g[s] = (g[s] || 0) + x;
  for (const [s, x] of Object.entries(daoVanStats(save, data))) g[s] = (g[s] || 0) + x;   // thưởng bộ Đạo Vận hợp hệ
  for (const [s, x] of Object.entries(wornExtra(save, data))) g[s] = (g[s] || 0) + x;
  for (const [s, x] of Object.entries(pbStats(save, data))) g[s] = (g[s] || 0) + x;   // 3 pháp bảo đang mặc (src/game/phap-bao.js)   // dòng thú cưỡi đang chọn, bộ thời trang đang mặc
  const v = s => g[s] || 0;
  const rk = 1 + (rb.pct || 0) / 100;   // máu, công gốc nhân theo cảnh giới (riêng, không cộng chung % trang bị)
  const base = { maxHp: Math.round((pc.hp + n * data.realms.hp_per_layer + v('hp') + pillHp(save, data)) * (1 + v('hp_pct') / 100) * rk) };
  return {
    maxHp: base.maxHp,
    atk: Math.round((w.atk + n * data.realms.atk_per_layer + v('atk')) * (1 + v('atk_pct') / 100) * rk),
    crit: pc.crit + v('crit') / 100,
    critMult: pc.crit_mult + v('crit_dmg') / 100,
    cdr: v('cdr') / 100,
    def: v('def'),
    speedMul: 1 + v('speed') / 100,
    qiMul: (1 + v('qi_gain') / 100) * rootOf(save, data).qi,
    lifesteal: v('lifesteal') / 100,
    thorns: v('thorns') / 100,
    regen: v('regen') + base.maxHp * v('regen_pct') / 100,   // regen_pct: hồi % máu tối đa mỗi giây (công pháp, 05/11/2026)
    dr: Math.min(0.5, v('dr') / 100),   // giảm sát thương nhận % (công pháp hộ thân, tối đa 50%)
    mpPct: v('mp_pct') / 100,           // Linh lực tối đa + % (công pháp Linh lực)
    mpRegen: v('mp_regen') / 100,       // hồi thêm % linh lực tối đa mỗi giây
  };
}

// Cộng linh khí; trả về số tầng vừa đột phá (0 nếu chưa), hoặc -1 nếu kẹt ở đỉnh cảnh giới (cần thiên kiếp)
export function addQi(save, realms, amount) {
  let broke = 0;
  save.qi += amount;
  while (save.qi >= qiNeed(save, realms)) {
    if (save.layer >= realms.layers) { save.qi = qiNeed(save, realms); return broke || -1; }
    save.qi -= qiNeed(save, realms);
    save.layer += 1; broke += 1;
  }
  return broke;
}
