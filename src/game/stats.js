// Cảnh giới, linh khí, chỉ số người chơi. Công thức lấy số từ data/realms.json.
import { gearStats } from './items.js';
import { techStats } from './techniques.js';
import { pillHp } from './cave.js';
import { setStats } from './enhance.js';
import { snackStats } from './snack.js';
export function totalLayer(save, realms) {
  return save.realm * realms.layers + (save.layer - 1);
}

export function qiNeed(save, realms) {
  const n = totalLayer(save, realms), soft = realms.qi_soft_from ?? Infinity;
  return Math.round(realms.qi_base * Math.pow(realms.qi_growth, Math.min(n, soft)) * Math.pow(realms.qi_soft_growth || 1, Math.max(0, n - soft)));
}

export function realmLabel(save, realms) {
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
  return data.items.bases[it?.base]?.art || null;
}

// Loại vũ khí đang dùng: theo món mặc ở ô Vũ khí, chưa mặc thì theo cốt truyện (save.weapon)
export function weaponId(save, data) {
  const it = save.bag?.find(i => i.uid === save.equip?.['vu-khi']);
  return data.items.bases[it?.base]?.weapon || save.weapon;
}

// Chỉ số cuối = gốc theo cảnh giới + vũ khí + trang bị và ngọc khảm
export function playerStats(save, data) {
  const n = totalLayer(save, data.realms);
  const w = data.weapons[weaponId(save, data)], pc = data.config.player;
  const g = gearStats(data, save), tg = techStats(save, data);
  for (const [s, x] of Object.entries(tg)) g[s] = (g[s] || 0) + x;
  for (const [s, x] of Object.entries(setStats(data, save).stats)) g[s] = (g[s] || 0) + x;
  for (const [s, x] of Object.entries(snackStats(save, data))) g[s] = (g[s] || 0) + x;   // linh thực đang ăn
  const v = s => g[s] || 0;
  return {
    maxHp: Math.round((pc.hp + n * data.realms.hp_per_layer + v('hp') + pillHp(save, data)) * (1 + v('hp_pct') / 100)),
    atk: Math.round((w.atk + n * data.realms.atk_per_layer + v('atk')) * (1 + v('atk_pct') / 100)),
    crit: pc.crit + v('crit') / 100,
    critMult: pc.crit_mult + v('crit_dmg') / 100,
    cdr: v('cdr') / 100,
    def: v('def'),
    speedMul: 1 + v('speed') / 100,
    qiMul: (1 + v('qi_gain') / 100) * rootOf(save, data).qi,
    lifesteal: v('lifesteal') / 100,
    thorns: v('thorns') / 100,
    regen: v('regen'),
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
