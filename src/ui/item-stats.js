// Chỉ số một món trang bị dạng gọn (chợ, chủ dự án 06/11/2026 18:52: "hiển thị chỉ số trang bị trên chợ, đỡ có ai bị lừa"):
// chỉ số chính (đã tính cường hoá, hợp hệ với người đang xem), từng dòng phụ tô màu theo bậc, ô khảm và ngọc đang khảm,
// lực chiến người xem đổi bao nhiêu nếu mặc món này. Chữ chỉ gán textContent.
import { statText, gemInfo } from '../game/items.js';
import { mainStats } from './bag-detail.js';
import { trial } from '../game/autoequip.js';
import { power } from '../game/achieve.js';
import { playerStats } from '../game/stats.js';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// Lực chiến đổi nếu mặc món it (món không có trong túi: thử tạm một bản sao rồi bỏ ra)
function gainIfWorn(game, it) {
  const s = game.save, d = game.data, slot = d.items.bases[it.base]?.slot;
  if (!s || !slot) return 0;
  const copy = { ...it, uid: -1 };
  s.bag.push(copy);
  try { return trial(game, slot, -1) - power(game, playerStats(s, d)); }
  finally { s.bag.splice(s.bag.indexOf(copy), 1); }
}

export function itemStats(game, it) {
  const d = game.data, T = d.market.stats, box = el('div', 'it-stats');
  for (const [s, v] of Object.entries(mainStats(d, game.save, it))) box.append(el('span', 'd-main', statText(d, s, v)));
  for (const l of it.lines || []) {
    const t = Number.isInteger(l.t) && d.items.line_tiers.list[l.t], x = el('span', 'd-line', `◆ ${statText(d, l.s, l.v)}`);
    if (t) { x.style.color = t.edge ? '#ff8a8a' : t.color; x.title = t.name; }
    box.append(x);
  }
  for (const g of it.sockets || []) {
    const gi = g && gemInfo(d, g);
    const c = el('span', `it-gem${gi ? '' : ' empty'}`, gi ? `${gi.name}: ${statText(d, gi.stat, gi.value)}` : T.gem_empty);
    if (gi) { c.style.borderColor = gi.color; c.style.color = gi.color; }
    box.append(c);
  }
  const g = Math.round(gainIfWorn(game, it));
  box.append(el('span', `it-gain${g > 0 ? ' up' : g < 0 ? ' down' : ''}`, T.gain.replace('{v}', (g > 0 ? '+' : g < 0 ? '−' : '±') + Math.abs(g).toLocaleString('vi-VN'))));
  return box;
}
