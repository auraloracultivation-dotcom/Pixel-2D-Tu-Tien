// Tiếng gõ gỗ nhẹ khi bấm nút trong bảng, hộp thoại, menu (data/sounds.json → sfx.click). Nút đánh, lướt, chiêu có tiếng riêng nên bỏ qua.
export function clickSounds(game) {
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest?.('button, .choice');
    if (!b || b.disabled || b.closest('#buttons')) return;
    game.sfx('click', 0.8);
  }, { capture: true });
}
