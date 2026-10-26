// Cảnh giới, linh khí, chỉ số người chơi. Công thức lấy số từ data/realms.json.
export function totalLayer(save, realms) {
  return save.realm * realms.layers + (save.layer - 1);
}

export function qiNeed(save, realms) {
  return Math.round(realms.qi_base * Math.pow(realms.qi_growth, totalLayer(save, realms)));
}

export function realmLabel(save, realms) {
  return `${realms.names[save.realm]} tầng ${save.layer}`;
}

export function playerStats(save, data) {
  const n = totalLayer(save, data.realms);
  const w = data.weapons[save.weapon];
  return {
    maxHp: data.config.player.hp + n * data.realms.hp_per_layer,
    atk: w.atk + n * data.realms.atk_per_layer,
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
