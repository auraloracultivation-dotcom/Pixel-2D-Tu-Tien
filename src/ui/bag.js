// Túi đồ: ô đang mặc (chạm để xem), lọc theo ô và sắp xếp, danh sách đồ và ngọc.
// Chạm một món thì tấm chi tiết trượt lên từ đáy túi (src/ui/bag-detail.js): nút Mặc / Thay nằm ngay đầu tấm,
// kèm lực chiến tăng giảm và so sánh với món đang mặc, không phải cuộn xuống cuối túi như trước.
import { ensureInv, socket, mergeGems, gemMergeFee, gemInfo, rarityOf, itemName, statText, gearStats } from '../game/items.js';
import { matInfo } from '../game/cave.js';
import { coins } from '../game/shop.js';
import { renderQuick } from './bag-quick.js';
import { el, icon, renderDetail, powerGain } from './bag-detail.js';
import { gemIcon } from './gem-icon.js';

const $ = id => document.getElementById(id);
const SORTS = [['moi', 'Mới nhặt'], ['pham', 'Phẩm chất'], ['cap', 'Cấp'], ['manh', 'Lực chiến']];

export function createBag(game) {
  const { data } = game;
  const st = { tab: 'do', sel: null, pickSocket: null, slot: 'all', sort: 'moi' };

  const save = () => game.save;
  const isEq = uid => Object.values(save().equip).includes(uid);
  const rIdx = id => data.items.rarities.findIndex(r => r.id === id);

  // full = false: chỉ vẽ lại (đổi tab, chọn ngọc), không lưu
  function changed(full = true) { if (full) { game.refreshStats(); game.persist(); } render(); }
  const pick = uid => { st.sel = st.sel === uid ? null : uid; st.pickSocket = null; render(); };

  function itemCard(it, gain) {
    const r = rarityOf(data.items, it.rarity);
    const b = el('button', 'item' + (st.sel === it.uid ? ' sel' : ''));
    b.style.setProperty('--rar', r.color);
    b.append(icon(data, it), el('b', null, itemName(data, it)), el('small', null, `${r.name} · cấp ${it.lvl}`));
    if (gain > 0) b.append(el('em', 'up', '▲ ' + gain.toLocaleString('vi-VN')));
    b.onclick = () => pick(it.uid);
    return b;
  }

  function renderEquip() {
    const box = $('bag-equip'); box.innerHTML = '';
    for (const [slot, name] of Object.entries(data.items.slots)) {
      const it = save().bag.find(i => i.uid === save().equip[slot]);
      const cell = el('button', 'slot' + (it ? '' : ' empty') + (it && st.sel === it.uid ? ' sel' : ''));
      if (it) {
        const r = rarityOf(data.items, it.rarity);
        cell.style.setProperty('--rar', r.color);
        cell.append(icon(data, it), el('small', null, name));
        cell.title = itemName(data, it);
        cell.onclick = () => pick(it.uid);
      } else {
        cell.append(el('i', 'ico'), el('small', null, name));
        cell.onclick = () => { st.tab = 'do'; st.slot = slot; st.sel = null; render(); };   // ô trống: lọc túi theo ô đó
      }
      box.append(cell);
    }
    const g = gearStats(data, save());
    $('bag-stats').textContent = Object.keys(g).length
      ? Object.entries(g).map(([s, v]) => statText(data, s, v)).join(' · ')
      : 'Chưa mặc đồ.';
    $('bag-mats').textContent = `${coins(save()).toLocaleString('vi-VN')} ${data.shop.name}`;
    $('bag-mats').title = Object.entries(save().mats).filter(([, n]) => n > 0).map(([k, n]) => `${matInfo(data, k)?.name || k} ${n}`).join(' · ');
  }

  function renderFilter() {
    const box = $('bag-filter'); box.innerHTML = '';
    box.hidden = st.tab !== 'do';
    if (box.hidden) return;
    const chips = el('div', 'chips');
    for (const [id, name] of [['all', 'Tất cả'], ...Object.entries(data.items.slots)]) {
      const c = el('button', 'chip' + (st.slot === id ? ' on' : ''), name);
      c.onclick = () => { st.slot = id; render(); };
      chips.append(c);
    }
    const sort = el('button', 'chip sort', '⇅ ' + SORTS.find(s => s[0] === st.sort)[1]);
    sort.onclick = () => { st.sort = SORTS[(SORTS.findIndex(s => s[0] === st.sort) + 1) % SORTS.length][0]; render(); };
    box.append(chips, sort);
  }

  function renderList() {
    const box = $('bag-list'); box.innerHTML = '';
    if (st.tab === 'do') {
      let items = save().bag.filter(i => !isEq(i.uid) && (st.slot === 'all' || data.items.bases[i.base].slot === st.slot));
      const gain = new Map(items.map(i => [i.uid, powerGain(game, i)]));
      if (st.sort === 'moi') items = items.slice().sort((a, b) => b.uid - a.uid);
      if (st.sort === 'pham') items = items.slice().sort((a, b) => rIdx(b.rarity) - rIdx(a.rarity) || b.lvl - a.lvl);
      if (st.sort === 'cap') items = items.slice().sort((a, b) => b.lvl - a.lvl || rIdx(b.rarity) - rIdx(a.rarity));
      if (st.sort === 'manh') items = items.slice().sort((a, b) => gain.get(b.uid) - gain.get(a.uid));
      if (save().bag.some(i => !isEq(i.uid))) renderQuick(game, box, st, full => full ? changed() : render());
      if (!items.length) box.append(el('p', 'muted', st.slot === 'all' ? 'Túi trống. Hạ quái để nhặt đồ.' : `Chưa có ${data.items.slots[st.slot].toLowerCase()} nào trong túi.`));
      for (const it of items) box.append(itemCard(it, gain.get(it.uid)));
      return;
    }
    if (st.tab === 'nl') { renderMats(box); return; }
    const keys = Object.keys(save().gems).sort((a, b) => a.split(':')[0].localeCompare(b.split(':')[0]) || b.split(':')[1] - a.split(':')[1]);   // theo loại, cấp cao lên trước
    if (!keys.length) box.append(el('p', 'muted', 'Chưa có ngọc. Quái và boss có thể rơi ngọc.'));
    for (const k of keys) {
      const gi = gemInfo(data, k), row = el('div', 'gem-row');
      row.append(gemIcon(game, k, 56), el('span', null, `${gi.name} ×${save().gems[k]} (${statText(data, gi.stat, gi.value)})`));
      if (st.pickSocket) {
        const b = el('button', 'mini primary', 'Khảm');
        b.onclick = () => { socket(save(), st.pickSocket.uid, st.pickSocket.idx, k); st.sel = st.pickSocket.uid; st.pickSocket = null; st.tab = 'do'; changed(); };
        row.append(b);
      } else if (gi.lv < data.items.gems.max_level) {
        const fee = gemMergeFee(data, gi.lv), b = el('button', 'mini', `Ghép ${data.items.gems.merge}→1 (${fee.toLocaleString('vi-VN')} ${data.shop.name})`);
        b.disabled = save().gems[k] < data.items.gems.merge || (save().lingshi || 0) < fee;
        b.onclick = () => { if (mergeGems(data, save(), k)) { game.sfx('levelup'); changed(); } };
        row.append(b);
      }
      box.append(row);
    }
  }

  // Mục lục nguyên liệu (đề xuất #29): mọi nguyên liệu, số đang có, nơi kiếm (cave.json → materials.desc); món đang có lên trước
  function renderMats(box) {
    const M = data.cave.materials, have = save().mats || {};
    const ids = Object.keys(M).sort((a, b) => ((have[b] || 0) > 0) - ((have[a] || 0) > 0) || M[a].name.localeCompare(M[b].name, 'vi'));
    for (const id of ids) {
      const m = M[id], row = el('div', 'mat-row'), dot = el('i', 'mat-dot');
      dot.style.background = m.color || '#ccc';
      const txt = el('div', null); txt.append(el('b', null, `${m.name} ×${Math.floor(have[id] || 0).toLocaleString('vi-VN')}`), el('small', null, m.desc || ''));
      row.append(dot, txt); box.append(row);
    }
  }

  function renderSheet() {
    const has = renderDetail(game, st, $('bag-detail'), changed, () => { st.sel = null; render(); });
    $('bag-sheet').hidden = !has;
    $('bag').classList.toggle('sheet-open', has);
  }

  function render() {
    ensureInv(save());
    for (const b of document.querySelectorAll('#bag [data-tab]')) b.classList.toggle('on', b.dataset.tab === st.tab);
    $('bag-pick').hidden = !st.pickSocket;
    renderEquip(); renderFilter(); renderList(); renderSheet();
  }

  for (const b of document.querySelectorAll('#bag [data-tab]')) b.onclick = () => { st.tab = b.dataset.tab; st.pickSocket = null; st.sel = null; render(); };
  $('bag-close').onclick = () => close();
  $('bag-stats').onclick = () => $('bag-stats').classList.toggle('open');   // dòng chỉ số rút gọn một dòng, chạm để xem hết
  $('btn-bag').addEventListener('pointerdown', e => { e.stopPropagation(); open(); });

  function open() {
    if (!game.save || game.dialog.open) return;
    game.uiOpen = true; game.newItems = 0; st.sel = null; $('bag').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('bag').hidden = true; }

  return { open, close };
}
