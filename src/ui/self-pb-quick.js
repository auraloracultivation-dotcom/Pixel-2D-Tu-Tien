// Hàng Bán nhanh / Rã nhanh dưới lưới pháp bảo (Trang bị → Pháp bảo), giống bán nhanh trang bị trong Túi đồ. Logic: src/game/phap-bao-ban.js.
import { PB } from '../game/phap-bao.js';
import { pbQuickList, pbQuickGain, pbQuickDo } from '../game/phap-bao-ban.js';
import { el } from './bag-detail.js';

// st: trạng thái túi (st.pbQ = { open, pick: [phẩm] }); redo: vẽ lại mục pháp bảo
export function pbQuick(game, st, redo) {
  const D = PB(game), U = D.ui, q = (st.pbQ ??= { open: false, pick: ['pham'] }), wrap = el('div', 'quick-sell');
  const toggle = el('button', 'mini' + (q.open ? ' on' : ''), q.open ? U.q_close : U.q_open);
  toggle.onclick = () => { q.open = !q.open; redo(); };
  wrap.append(toggle);
  if (!q.open) return wrap;
  const chips = el('div', 'quick-chips');
  for (const g of D.grades) {
    const on = q.pick.includes(g.id), c = el('button', 'mini quick-chip' + (on ? ' on' : ''), g.name);
    c.style.borderColor = g.color;
    c.onclick = () => { q.pick = on ? q.pick.filter(x => x !== g.id) : [...q.pick, g.id]; redo(); };
    chips.append(c);
  }
  const list = pbQuickList(game, q.pick), G = pbQuickGain(game, list), n = list.length;
  const sell = el('button', 'act-btn', n ? U.q_sell.replace('{n}', n).replace('{c}', G.coins.toLocaleString('vi-VN')) : U.q_none);
  const ra = el('button', 'act-btn', n ? U.q_ra.replace('{n}', n).replace('{s}', G.stones) : U.q_none);
  sell.disabled = ra.disabled = !n;
  const go = (mode, b) => {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = U.q_sure; return; }   // bấm hai lần cho chắc
    const r = pbQuickDo(game, q.pick, mode);
    if (r.n) { game.sfx(mode === 'ban' ? 'pickup' : 'die'); game.toast?.(mode === 'ban' ? U.q_sold.replace('{n}', r.n).replace('{c}', r.coins.toLocaleString('vi-VN')) : U.q_done.replace('{n}', r.n).replace('{s}', r.stones), 2.4); }
    st.pbSel = null; redo();
  };
  sell.onclick = () => go('ban', sell); ra.onclick = () => go('ra', ra);
  wrap.append(chips, el('div', 'muted tiny', U.q_note + (G.lost ? ' ' + U.q_full.replace('{n}', G.lost) : '')), sell, ra);
  return wrap;
}
