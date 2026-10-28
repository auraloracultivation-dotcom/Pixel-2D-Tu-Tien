// Gợi ý lần đầu (data/hints.json): nút của hệ mới mở sáng lên tới khi bấm lần đầu, bấm thì hiện tip.
const $ = id => document.getElementById(id);

export function createHints(game) {
  const H = game.data.hints.buttons;
  const unlocked = h => {
    const s = game.save;
    if (h.flag) return !!s.flags[h.flag];
    const i = game.data.story.steps.findIndex(x => x.id === h.after);
    return s.step > i;
  };
  const fresh = id => game.save && !game.save.seenBtn?.[id] && unlocked(H[id]);

  for (const id of Object.keys(H)) {
    $(id)?.addEventListener('pointerdown', () => {
      if (!fresh(id)) return;
      (game.save.seenBtn ??= {})[id] = true;
      game.toast(H[id].tip, 3.2);
      game.persist();
    });
  }

  // Gọi mỗi khung từ HUD: bật tắt lớp sáng
  return function update() {
    if (!game.save) return;
    // bản lưu có từ trước khi có gợi ý: coi các nút đã mở là đã biết
    if (!game.save.seenBtn) game.save.seenBtn = Object.fromEntries(Object.keys(H).filter(id => unlocked(H[id])).map(id => [id, true]));
    let any = false;
    for (const id of Object.keys(H)) {
      const on = fresh(id), b = $(id);
      if (b && b.classList.contains('glow-hint') !== on) b.classList.toggle('glow-hint', on);
      if (on && !['btn-auto', 'btn-pilot', 'btn-world'].includes(id)) any = true;   // các nút này nằm ngoài Menu
    }
    const m = $('btn-menu');
    if (m.classList.contains('glow-hint') !== any) m.classList.toggle('glow-hint', any);
  };
}
