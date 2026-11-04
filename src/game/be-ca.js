// Bể cá động phủ (chủ dự án 04/11/2026 11:57; số, chữ ở data/home.json → be_ca). Đứng gần bể (ở nhà mình) thì nút tương tác
// hiện "Bể cá": thả cá câu được (save.mats, loài trong data/fishing.json → fish) vào bể, mỗi lần một con, tối đa max.
// Cá trong bể lưu save.beCa = { loài: số } (thăm nhà bạn thì không thả). Vẽ: src/render/draw-be-ca.js.
const C = game => game.data.home.be_ca;
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

export const beCaCount = s => Object.values(s?.beCa || {}).reduce((a, n) => a + n, 0);

export function nearBeCa(game) {
  const c = C(game);
  if (!c || game.map.id !== game.data.home.map || game.visiting) return false;
  const p = game.map.center(c.at[0], c.at[1]), q = game.player;
  return Math.hypot(p.x - q.x, p.y - q.y) < c.range;
}

export async function talkBeCa(game) {
  const c = C(game), s = game.save, F = game.data.fishing.fish, M = game.data.cave.materials;
  const top = await game.dialog.choose(fill(c.ask, { n: beCaCount(s), max: c.max }), [{ id: 'tha', label: c.release, color: '#5fb8ff' }, { id: 'no', label: c.later }]);
  if (top !== 'tha') return;
  for (;;) {
    if (beCaCount(s) >= c.max) { game.toast(fill(c.full, { max: c.max }), 2); return; }
    const have = Object.keys(F).filter(id => (s.mats?.[id] || 0) >= 1);
    if (!have.length) { game.toast(c.none, 2.4); return; }
    const id = await game.dialog.choose(fill(c.ask, { n: beCaCount(s), max: c.max }) + '\n' + c.pick,
      [{ id: 'xong', label: c.done, color: '#ff8a7a' }, ...have.map(k => ({ id: k, label: `${M[k]?.name || k} (×${s.mats[k]})`, color: M[k]?.color }))]);   // nút Xong lên đầu: danh sách dài vẫn thoát được ngay
    if (!id || id === 'xong' || !have.includes(id)) return;
    s.mats[id] -= 1; s.beCa ??= {}; s.beCa[id] = (s.beCa[id] || 0) + 1;
    game.persist(); game.sfx('pickup');
    game.toast(fill(c.in, { name: M[id]?.name || id }), 1.4);
  }
}
