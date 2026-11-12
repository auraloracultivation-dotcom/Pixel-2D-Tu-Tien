// Pháp bảo rơi như trang bị (chủ dự án 12/11/2026 12:42: "pháp bảo giống như một loại trang bị, nhặt được nhiều chiếc cùng loại,
// đeo cả 4 ô đều là kiếm"; 12:47 chọn cả bốn nguồn). Ở máy: quái thường, phá bí cảnh (src/game/dun-mode.js, dun-run.js).
// Triệu hồi Hệ Thống, boss Thôn Thiên Mãng: máy chủ gửi thư (đợt sau). Số ở data/phap-bao.json → drop. Bán bớt: pbSell.
import { PB, pbOn, pbState, pbAdd, pbType, pbGrade } from './phap-bao.js';
import { addCoins } from './shop.js';

const roll = w => { const e = Object.entries(w), t = e.reduce((a, [, v]) => a + v, 0); let r = Math.random() * t; for (const [k, v] of e) if ((r -= v) < 0) return k; return e[0][0]; };
let fullT = 0;

// src: 'mob' | 'dun'; L: bậc khó bí cảnh. Trả món vừa nhặt hoặc null
export function pbDrop(game, src, L = 0) {
  const D = PB(game)?.drop, c = D?.[src];
  if (!c || !pbOn(game) || Math.random() >= c.rate) return null;
  const st = pbState(game), U = PB(game).ui;
  if (st.items.length >= D.max) { if (Date.now() - fullT > 60000) { fullT = Date.now(); game.toast?.(U.full.replace('{n}', D.max), 3); } return null; }
  const ids = PB(game).grades.map(g => g.id);
  let gi = ids.indexOf(roll(c.grades));
  for (let i = 0; i < L; i++) if (Math.random() < (c.up || 0)) gi = Math.min(ids.length - 1, gi + 1);
  const types = Object.keys(PB(game).types), it = pbAdd(game, types[Math.floor(Math.random() * types.length)], ids[gi]);
  game.toast?.(U.drop_got.replace('{grade}', pbGrade(game, it).name).replace('{name}', pbType(game, it).name), 3);
  game.sfx?.('rare'); game.newItems = true; game.refreshStats?.(); game.persist?.();
  return it;
}

// Giá bán một món (không bán món đang mặc)
export const pbPrice = (game, it) => { const D = PB(game).drop; return Math.round((D?.sell?.[it.grade] || 0) * (1 + (D?.lv_k || 0) * (it.lv || 0))); };
export function pbSell(game, it) {
  const st = pbState(game), U = PB(game).ui;
  if (st.wear.includes(it.uid)) return U.sell_worn;
  const n = pbPrice(game, it), name = pbType(game, it).name;
  st.items = st.items.filter(x => x.uid !== it.uid);
  addCoins(game, n, 'ban-do');
  game.refreshStats?.(); game.persist?.();
  return U.sold.replace('{name}', name).replace('{n}', n.toLocaleString('vi-VN'));
}
