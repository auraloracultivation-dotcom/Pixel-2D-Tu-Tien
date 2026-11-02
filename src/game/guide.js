// Chỉ đường nhiệm vụ (đề xuất #23, chủ dự án 31/10/2026: mũi tên, không tự đi): chạm khung mục tiêu trên màn hình để đổi việc
// mũi tên chỉ tới. Mỗi việc có chỗ cần tới trên bản đồ đang đứng: truyện chính (ô đích), treo thưởng / việc phụ (quái gần nhất
// đang cần hạ, vật cần nhặt gần nhất, hoặc NPC lãnh thưởng khi đã xong). Việc không có chỗ trên bản đồ này thì mũi tên không hiện.

const near = (game, list) => {
  const p = game.player; let best = null, bd = Infinity;
  for (const e of list) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
  return best ? { x: best.x, y: best.y } : null;
};
const npcPos = (game, id) => near(game, game.npcs.filter(n => n.id === id));
const mobPos = (game, id) => near(game, game.mobs.filter(m => !m.dead && m.id === id));

// [{ key, pos }] theo đúng thứ tự dòng mục tiêu (game.goals); pos null khi không có chỗ trên bản đồ này
export function guideList(game) {
  const s = game.save, out = [];
  if (!s || !game.map) return out;
  const g = game.story?.goal();
  if (g) out.push({ key: 'story', pos: g.target ? game.map.center(g.target[0], g.target[1]) : null });
  return out;
}

// Việc đang được chỉ: việc đã chọn nếu còn, không thì việc đầu tiên có chỗ trên bản đồ này
export function guideTarget(game) {
  const L = guideList(game), pick = L.find(e => e.key === game.guidePick && e.pos);
  return (pick || L.find(e => e.pos))?.pos || null;
}

// Chạm khung mục tiêu: chuyển sang việc kế tiếp có chỗ trên bản đồ này
export function guideNext(game) {
  const L = guideList(game).filter(e => e.pos);
  if (!L.length) return false;
  const i = L.findIndex(e => e.key === game.guidePick);
  game.guidePick = L[(i + 1) % L.length].key;
  return true;
}
export const guideKey = game => { const L = guideList(game), pick = L.find(e => e.key === game.guidePick && e.pos); return (pick || L.find(e => e.pos))?.key || null; };

// Dòng chữ của việc đang được chỉ (để khung mục tiêu đánh dấu ➤)
export function guideLine(game) {
  const k = guideKey(game);
  if (!k) return null;
  if (k === 'story') return game.story?.goal()?.text || null;
  return null;
}
