// Đan đặc biệt ở Lò đan (chủ dự án 02/11/2026 14:39): Đan tẩy linh căn (trước nói chuyện với trưởng lão, giờ luyện ngay ở Lò
// đan; luật, giá ở data/elements.json → _reroot) và Đan đổi giới tính (data/gender.json → pill). Bảng Lò đan (src/ui/cave-panel.js)
// hiện hai thẻ này trên đầu; bấm thì đóng bảng, hỏi lại bằng hộp thoại rồi mới làm.
import { coins, addCoins } from './shop.js';
import { talkReroot } from './reroot.js';
import { applyWords } from './gender.js';
import { curOutfit, owned } from './fashion.js';

const costText = (game, c) => [`${c.coins.toLocaleString('vi-VN')} ${game.data.shop.name}`, ...Object.entries(c.mats).map(([id, n]) => `${n} ${game.data.cave.materials[id]?.name || id}`)].join(', ');
const canPay = (game, c) => coins(game.save) >= c.coins && Object.entries(c.mats).every(([id, n]) => (game.save.mats[id] || 0) >= n);

async function genderPill(game) {
  const P = game.data.gender.pill, G = game.data.gender, s = game.save, cost = costText(game, P);
  const to = (s.look || s.gioi || G.default) === 'nu' ? 'nam' : 'nu', label = G.list[to].label.toLowerCase();
  if (!canPay(game, P)) { game.toast(P.short.replace('{cost}', cost), 2.4); return; }
  const ok = await game.dialog.choose(P.ask.replace('{to}', label).replace('{cost}', cost), [{ id: 'yes', label: P.yes, color: G.list[to].color }, { id: 'no', label: P.no }]);
  if (ok !== 'yes' || !canPay(game, P)) return;
  addCoins(game, -P.coins);
  for (const [m, n] of Object.entries(P.mats)) s.mats[m] -= n;
  s.gioi = to;
  if (game.data.heroes.list[G.list[to].look]) s.look = G.list[to].look;
  if (!owned(game, curOutfit(game), s.look)) s.outfit = 'dong-phuc';   // bộ đang mặc không có bản giới tính mới
  applyWords(game); game.refreshStats(); game.persist(); game.sfx('levelup');
  game.toast(P.done.replace('{to}', label), 2.6);
}

// → [{ name, desc, cost, lock, run }]
export function specialPills(game) {
  const R = game.data.elements._reroot, P = game.data.gender.pill, s = game.save;
  const realm = game.data.realms.names?.[R.realm] || '';
  return [
    { name: 'Đan tẩy linh căn', desc: R.desc.replace('{cost}', costText(game, R.cost)), lock: !s.element ? 'Chưa thức tỉnh linh căn' : s.realm < R.realm ? `Mở từ ${realm}` : !canPay(game, R.cost) ? 'Chưa đủ nguyên liệu' : '',
      run: () => talkReroot(game, { id: R.npc, def: { name: 'Lò đan', lines: [''] } }, true), color: '#ff9a3a' },
    P && { name: P.name, desc: `${P.desc} Tốn ${costText(game, P)}.`, lock: canPay(game, P) ? '' : 'Chưa đủ nguyên liệu', run: () => genderPill(game), color: '#e86a9a' },
  ].filter(Boolean);
}
