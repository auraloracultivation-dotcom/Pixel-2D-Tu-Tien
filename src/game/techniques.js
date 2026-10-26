// Công pháp (data/techniques.json): học từ bí kíp rơi ra, mang tối đa 3 cuốn, lên cấp bằng linh khí thu được.
export function ensureTech(save) { save.techs ??= {}; save.techSlots ??= []; }

export function techNeed(data, lv) {
  const t = data.techniques;
  return Math.round(t.exp_base * Math.pow(lv, t.exp_pow));
}

// Cộng dồn chỉ số từ các cuốn đang mang
export function techStats(save, data) {
  const out = {};
  for (const id of save.techSlots || []) {
    const t = data.techniques.list[id], lv = save.techs?.[id]?.lv || 0;
    if (!t) continue;
    for (const [s, v] of Object.entries(t.per_level)) out[s] = (out[s] || 0) + v * lv;
  }
  return out;
}

// Học cuốn mới (hoặc đã có thì đổi thành kinh nghiệm cho cuốn đó); tự mang nếu còn ô
export function learnTech(game, id) {
  const { save, data } = game, t = data.techniques.list[id];
  ensureTech(save);
  if (save.techs[id]) {
    gainTechExp(game, techNeed(data, save.techs[id].lv), id);
    game.toast(`Bí kíp ${t.name} trùng: cộng kinh nghiệm cho công pháp`, 2);
    return;
  }
  save.techs[id] = { lv: 1, exp: 0 };
  if (save.techSlots.length < data.techniques.slots) save.techSlots.push(id);
  game.toast(`Học được công pháp ${t.name}!`, 2.4);
  game.newSkills = true;
  game.refreshStats(); game.persist();
}

// Linh khí thu được chia đều kinh nghiệm cho các cuốn đang mang (only: chỉ một cuốn)
export function gainTechExp(game, amount, only) {
  const { save, data } = game, max = data.techniques.max_level;
  const ids = only ? [only] : save.techSlots || [];
  let up = false;
  for (const id of ids) {
    const s = save.techs?.[id];
    if (!s || s.lv >= max) continue;
    s.exp += amount;
    while (s.lv < max && s.exp >= techNeed(data, s.lv)) {
      s.exp -= techNeed(data, s.lv); s.lv++; up = true;
      game.toast(`${data.techniques.list[id].name} lên tầng ${s.lv}!`, 1.8);
    }
    if (s.lv >= max) s.exp = 0;
  }
  if (up) { game.refreshStats(); game.sfx('levelup'); }
}

export function setTechSlot(game, i, id) {
  const sl = game.save.techSlots, j = sl.indexOf(id);
  if (j >= 0) sl.splice(j, 1);
  if (i >= sl.length) sl.push(id); else sl[i] = id;
  game.save.techSlots = sl.slice(0, game.data.techniques.slots);
  game.refreshStats(); game.persist();
}

// Rơi bí kíp khi hạ quái
export function techDrop(game, m) {
  const t = game.data.techniques;
  const boss = t.boss_drops[m.id];
  if (boss) {
    const fresh = boss.filter(id => !game.save.techs?.[id]);
    const pool = fresh.length ? fresh : boss;
    if (!fresh.length && Math.random() > 0.35) return; // đã học hết: thỉnh thoảng rơi bản trùng
    learnTech(game, pool[Math.floor(Math.random() * pool.length)]);
    return;
  }
  if (Math.random() < (t.drops[m.id] || 0)) {
    const ids = Object.keys(t.list).filter(id => id !== t.starter);
    learnTech(game, ids[Math.floor(Math.random() * ids.length)]);
  }
}
