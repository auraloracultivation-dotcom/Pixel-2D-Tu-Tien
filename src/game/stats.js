// Cảnh giới, linh khí, chỉ số người chơi. Công thức lấy số từ data/realms.json.
import { gearStats } from './items.js';
export function totalLayer(save, realms) {
  return save.realm * realms.layers + (save.layer - 1);
}

export function qiNeed(save, realms) {
  return Math.round(realms.qi_base * Math.pow(realms.qi_growth, totalLayer(save, realms)));
}

export function realmLabel(save, realms) {
  return `${realms.names[save.realm]} tầng ${save.layer}`;
}

// Chỉ số cuối = gốc theo cảnh giới + vũ khí + trang bị và ngọc khảm
export function playerStats(save, data) {
  const n = totalLayer(save, data.realms);
  const w = data.weapons[save.weapon], pc = data.config.player;
  const g = gearStats(data, save);
  const v = s => g[s] || 0;
  return {
    maxHp: Math.round((pc.hp + n * data.realms.hp_per_layer + v('hp')) * (1 + v('hp_pct') / 100)),
    atk: Math.round((w.atk + n * data.realms.atk_per_layer + v('atk')) * (1 + v('atk_pct') / 100)),
    crit: pc.crit + v('crit') / 100,
    critMult: pc.crit_mult + v('crit_dmg') / 100,
    cdr: v('cdr') / 100,
    def: v('def'),
    speedMul: 1 + v('speed') / 100,
    qiMul: 1 + v('qi_gain') / 100,
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
