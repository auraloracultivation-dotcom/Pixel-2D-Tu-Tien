// Bản đồ thế giới: các đảo đã tới (map có "world"), chạm để bay từ bất cứ đâu ngoài bí cảnh.
const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createWorldMap(game) {
  const { data } = game;

  // Đang ở bí cảnh, đang độ kiếp hay truyện đang chạy thì không bay
  const blocked = () => (game.map.def.rooms || []).length ? 'Đang ở bí cảnh, ra cổng trước đã.'
    : game.map.def.tower || game.map.def.res ? 'Đang trong tháp hoặc bí cảnh, ra cổng trước đã.'
    : game.trib.active ? 'Đang độ kiếp!' : game.story.busy ? 'Đang có chuyện, đợi xong đã.' : null;

  function render() {
    const box = $('world-sky'); box.innerHTML = '';
    const why = blocked();
    $('world-sub').textContent = why || 'Chạm đảo đã tới để bay.';
    for (const [id, m] of Object.entries(data.maps)) {
      if (!m.world) continue;
      const seen = game.save.visited?.[id], here = game.map.id === id;
      const b = el('button', 'isle' + (here ? ' here' : '') + (seen ? '' : ' locked'), seen ? m.name : '???');
      b.style.left = m.world.x + '%'; b.style.top = m.world.y + '%';
      b.style.background = m.island?.top || m.ground || '#7cc46a';
      if (here) b.append(el('small', null, 'Bạn ở đây'));
      b.disabled = !seen || here || !!why;
      b.onclick = () => { close(); game.travel(id, 'vao', true, { text: `Ngự kiếm bay tới ${m.name}`, kind: m.indoor ? 'portal' : 'flight' }); };
      box.append(b);
    }
    for (const l of new Set(Object.values(data.maps).filter(m => m.world).map(m => m.world.layer))) {
      const ys = Object.values(data.maps).filter(m => m.world?.layer === l).map(m => m.world.y);
      const t = el('span', 'isle-layer', l); t.style.top = Math.min(...ys) - 9 + '%'; box.append(t);
    }
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip || game.traveling) return;
    game.uiOpen = true; $('world').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('world').hidden = true; }

  $('world-close').onclick = close;
  $('btn-world').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  return { open, close };
}
