// Tab Sổ cá trong bảng Thành tựu: loại đã câu (số con, mô tả), loại chưa câu (dấu ?, gợi ý chỗ câu), mốc thưởng.
import { bookOf, kinds, hintOf } from '../game/fishbook.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function renderFishBook(game, list) {
  const F = game.data.fishing, M = game.data.cave.materials, b = bookOf(game), all = Object.keys(F.fish);
  const head = el('div', 'skill-card');
  head.append(el('b', null, `Đã câu ${kinds(game)}/${all.length} loại`),
    ...F.book.milestones.map((m, i) => el('small', null, `${b.got.includes(i) ? '✓' : '○'} Đủ ${m.n} loại`)));
  list.append(head);
  for (const id of all) {
    const c = el('div', 'skill-card'), n = b.n[id];
    c.style.borderLeftColor = n ? M[id].color : '#c8c4d0';
    if (n) c.append(el('b', null, `${M[id].name} · ${n} con`), el('small', null, M[id].desc));
    else c.append(el('b', null, '???'), el('small', null, hintOf(game, F.fish[id])));
    list.append(c);
  }
}
