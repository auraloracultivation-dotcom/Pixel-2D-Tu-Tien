// Vùng ma khí Ngoại Vực Vết Nứt (data/planets.json → makhi, chủ dự án chốt 02/11/2026): mỗi lần vào bản đồ, các bầy quái
// không còn dùng mọc ở chỗ ngẫu nhiên, mỗi bầy một bậc ma khí ngẫu nhiên (Tàn … Ma Thần): máu, công nhân mul, tên có tag.
function pickW(list, rnd) {
  let r = rnd() * list.reduce((a, x) => a + x.w, 0);
  for (const x of list) { r -= x.w; if (r <= 0) return x; }
  return list[list.length - 1];
}

export function makhiSpawn(game, def, rnd = Math.random) {
  const Z = game.data.planets?.makhi;
  if (!Z || def.id !== Z.map) return;
  const mobs = Z.mobs.filter(id => game.data.mobs[id]), W = game.map.w, H = game.map.h;
  for (let i = 0; i < Z.n && mobs.length; i++) {
    const t = pickW(Z.tiers, rnd), at = [2 + Math.floor(rnd() * (W - 4)), 2 + Math.floor(rnd() * (H - 4))];
    game.spawners.push({ mob: mobs[Math.floor(rnd() * mobs.length)], at, n: Z.per, spread: 3, respawn: Z.respawn, mul: t.mul, tag: t.tag, alive: [], timer: 0 });
  }
}
