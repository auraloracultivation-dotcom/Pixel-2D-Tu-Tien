// Bán nhanh trong Túi đồ (tab Trang bị): bấm "Bán nhanh" mở hàng chọn phẩm chất, thấy trước số món và Linh Thạch nhận, bấm bán là xong.
// Luật chọn món ở src/game/shop.js quickList (không bán đồ đang mặc, Đạo Vận, đồ đã cường hoá).
import { quickList, quickSell, sellPrice, quickSalvage, salvageGain } from '../game/shop.js';
import { bestGear } from '../game/autogear.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// st: trạng thái túi (st.quick = { open, pick: [phẩm theo màu dòng, data/items.json → line_tiers.list] }); changed: lưu và vẽ lại túi
export function renderQuick(game, box, st, changed) {
  const { data } = game, sv = game.save.autoSell, q = (st.quick ??= { open: false, pick: sv?.on && sv.tiers?.length ? [...sv.tiers] : [...data.shop.quick.pick] });
  const wrap = el('div', 'quick-sell');
  const toggle = el('button', 'mini' + (q.open ? ' on' : ''), q.open ? 'Đóng bán nhanh' : 'Bán nhanh');
  toggle.onclick = () => { q.open = !q.open; changed(false); };
  const best = el('button', 'mini', 'Mặc đồ tốt nhất');   // góp ý #58
  best.onclick = () => {
    const r = bestGear(game);
    game.toast?.(r.n ? `Đã thay ${r.n} món: lực chiến ${r.gain >= 0 ? '+' : ''}${r.gain.toLocaleString('vi-VN')}` : 'Đồ đang mặc đã là tốt nhất.', 2.2);
    if (r.n) { game.sfx('shield'); st.sel = null; changed(true); }
  };
  wrap.append(toggle, best);
  if (!q.open) { box.append(wrap); return; }
  const chips = el('div', 'quick-chips');
  q.pick = q.pick.filter(id => data.items.line_tiers.list.some(t => t.id === id));   // bỏ lựa chọn kiểu phẩm chất cũ
  for (const r of data.items.line_tiers.list) {
    const on = q.pick.includes(r.id), c = el('button', 'mini quick-chip' + (on ? ' on' : ''), r.name);
    c.style.borderColor = r.color;
    c.onclick = () => { q.pick = on ? q.pick.filter(x => x !== r.id) : [...q.pick, r.id]; changed(false); };
    chips.append(c);
  }
  const list = quickList(game, q.pick), coins = list.reduce((a, it) => a + sellPrice(game, it), 0);
  const go = el('button', 'act-btn', list.length ? `Bán ${list.length} món (+${coins.toLocaleString('vi-VN')} ${data.shop.name})` : 'Không có món nào để bán');
  go.disabled = !list.length;
  go.onclick = () => {
    const r = quickSell(game, q.pick);
    if (r.n) { game.sfx('pickup'); game.toast?.(`Đã bán ${r.n} món, nhận ${r.coins.toLocaleString('vi-VN')} ${data.shop.name}`); }
    st.sel = null; changed(true);
  };
  const sg = salvageGain(game, list), sal = el('button', 'act-btn', list.length ? `Phân giải ${list.length} món (+${sg.stones} Tẩy Luyện Thạch, +${sg.iron} Tinh Thiết)` : 'Không có món nào để phân giải');   // góp ý #146
  sal.disabled = !list.length;
  sal.onclick = () => {
    const r = quickSalvage(game, q.pick);
    if (r.n) { game.sfx('die'); game.toast?.(`Đã phân giải ${r.n} món: +${r.stones} Tẩy Luyện Thạch, +${r.iron} Tinh Thiết`); }
    st.sel = null; changed(true);
  };
  const as = (game.save.autoSell ??= { on: false, tiers: [] });   // góp ý #86: tự bán khi túi đầy theo đúng các phẩm đang chọn
  const auto = el('label', 'quick-auto'), cb = el('input');
  cb.type = 'checkbox'; cb.id = 'quick-auto-cb'; cb.checked = !!as.on;
  cb.onchange = () => { as.on = cb.checked; as.tiers = [...q.pick]; game.persist(); changed(false); };
  if (as.on && as.tiers.join() !== q.pick.join()) { as.tiers = [...q.pick]; game.persist(); }   // đổi phẩm chọn thì tự bán theo phẩm mới
  const mode = el('select', 'quick-mode');   // khi túi đầy: bán hay phân giải (góp ý #146)
  for (const [v, t] of [['ban', 'bán'], ['phan_giai', 'phân giải']]) { const o = el('option', null, t); o.value = v; o.selected = (as.mode || 'ban') === v; mode.append(o); }
  mode.onchange = () => { as.mode = mode.value; game.persist(); };
  auto.append(cb, document.createTextNode(' Tự '), mode, document.createTextNode(' các phẩm này khi túi đầy'));
  // Báo nhặt đồ (góp ý #145): chỉ hiện dòng "Nhặt ..." ở cột trái cho đồ từ phẩm này trở lên, cho màn hình thoáng
  const fm = el('label', 'quick-auto'), fs = el('select', 'quick-mode');
  data.items.line_tiers.list.forEach((t, i) => { const o = el('option', null, i ? `${t.name} trở lên` : 'mọi phẩm'); o.value = i; o.selected = (game.save.feedMin || 0) === i; fs.append(o); });
  fs.onchange = () => { game.save.feedMin = +fs.value; game.persist(); };
  fm.append(document.createTextNode('Báo nhặt đồ: '), fs);
  const names = q.pick.map(id => data.items.line_tiers.list.find(t => t.id === id)?.name).filter(Boolean).join(', ');
  wrap.append(chips, auto, el('div', 'muted tiny', `Bán hết đồ ${names || '(chưa chọn phẩm chất)'} trong túi. Không bán đồ đang mặc, đồ đã khoá, đồ Đạo Vận, đồ đã cường hoá.`), go, sal, fm);
  box.append(wrap);
}
