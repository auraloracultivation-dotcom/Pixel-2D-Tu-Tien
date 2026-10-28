// Ngự kiếm trong tinh cầu (chủ dự án xin 28/10/2026): mở Bản đồ, chạm vào chỗ nào trên tinh cầu đang đứng là bay tới đó.
// Chạm trúng vách, cây, nước thì đáp xuống ô đi được gần nhất. Bản đồ vẽ ở src/ui/planet-map.js.
import { addFx } from './combat.js';

const T = game => game.data.starmap.texts;

// Lý do chưa bay được trên tinh cầu này (null = bay được)
export function hopWhy(game) {
  const def = game.map?.def;
  if (!def?.planet) return T(game).hop_none;
  if (game.trib.active) return 'Đang độ kiếp!';
  if (game.story.busy || game.dialog.open) return 'Đang có chuyện, đợi xong đã.';
  if (game.trip || game.traveling) return T(game).hop_busy;
  return null;
}

// Ô đi được gần (tx, ty) nhất, dò vòng dần ra tới 6 ô; không có thì null
export function landTile(game, tx, ty) {
  const map = game.map, ok = (x, y) => !map.solidTile(x, y) && !map.def.portals.some(pt => !pt.fly && pt.at[0] === x && pt.at[1] === y);
  for (let d = 0; d <= 6; d++) {
    let best = null, bd = Infinity;
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d || !ok(tx + dx, ty + dy)) continue;
      const k = dx * dx + dy * dy;
      if (k < bd) { bd = k; best = [tx + dx, ty + dy]; }
    }
    if (best) return best;
  }
  return null;
}

// Bay tới ô (tx, ty). name: tên chỗ tới để báo (bãi quái, NPC...). Trả về true nếu đã bay.
export function hopTo(game, tx, ty, name) {
  if (hopWhy(game)) return false;
  const land = landTile(game, tx, ty);
  if (!land) return false;
  const p = game.player, to = game.map.center(land[0], land[1]), col = game.save.element ? game.data.elements[game.save.element].color : '#bff4ff';
  addFx(game, { type: 'ring', x: p.x, y: p.y, r: 16, color: col, life: 0.45 });
  p.x = to.x; p.y = to.y;
  p.meditating = false; p.riding = false; p.hitQ = null;
  addFx(game, { type: 'ring', x: to.x, y: to.y, r: 18, color: col, life: 0.55, fill: true });
  if (game.auto) game.autoHome = { x: to.x, y: to.y };   // Tự đánh: săn quanh chỗ mới
  if (game.pilot) game.pilot.path = null;
  game.portalLock = 0.8;
  game.sfx('dash');
  game.toast(T(game).hop_done.replace('{name}', name || game.map.def.name), 1.6);
  return true;
}
