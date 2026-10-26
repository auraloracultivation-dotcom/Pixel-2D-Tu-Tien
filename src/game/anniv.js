// Kỷ niệm đạo lữ (data/affinity.json → dao_lu.anniv): đủ số ngày kết đạo lữ thì về động phủ, đạo lữ tặng quà và nói một câu, ghi nhật ký.
import { daoLuHere } from './affinity.js';
import { grant } from './daily.js';
import { addEntry } from './journal.js';

const DAY = 86400000;

export function updateAnniv(game, dt) {
  if ((game.annivT = (game.annivT ?? 3) - dt) > 0) return;
  game.annivT = 10;
  const s = game.save, d = daoLuHere(game), A = game.data.affinity.dao_lu.anniv;
  if (!d || game.dialog.open || game.story.busy) return;
  s.daoLuAt ??= Date.now();   // bản lưu cũ: tính từ lúc này
  const days = Math.floor((Date.now() - s.daoLuAt) / DAY), m = A.days.filter(x => x <= days && !(s.anniv || []).includes(x)).pop();
  const n = m && game.map.id === game.data.home.map && game.npcs.find(x => x.id === d && x.home);
  if (!n) return;
  (s.anniv ??= []).push(...A.days.filter(x => x <= m && !s.anniv.includes(x)));   // mốc đã qua lúc vắng thì gộp vào mốc lớn nhất
  const L = A.lines[d] || A.lines.default, got = grant(game, A.gift);
  game.say(n.def.name, L[Math.floor(Math.random() * L.length)].replace('{days}', m), 5);
  game.toast(A.toast.replace('{days}', m).replace('{got}', got.join(', ')), 4);
  addEntry(game, game.data.journal.anniv.replace('{days}', m).replace('{name}', n.def.name));
  game.sfx('chime'); game.persist();
}
