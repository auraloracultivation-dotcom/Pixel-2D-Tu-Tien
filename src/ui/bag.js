// Túi đồ: ô đang mặc (chạm để xem), lọc theo ô và sắp xếp, danh sách đồ; ngọc, nguyên liệu dạng lưới ở src/ui/bag-stock.js.
// Chạm một món thì tấm chi tiết trượt lên từ đáy túi (src/ui/bag-detail.js): nút Mặc / Thay nằm ngay đầu tấm,
// kèm lực chiến tăng giảm và so sánh với món đang mặc, không phải cuộn xuống cuối túi như trước.
import { ensureInv, rarityOf, itemName, statText, gearStats } from '../game/items.js';
import { kySocket } from '../game/ky-ngoc.js';   // đã đăng nhập: máy chủ khảm ngọc
import { matInfo } from '../game/cave.js';
import { coins } from '../game/shop.js';
import { renderQuick } from './bag-quick.js';
import { el, icon, renderDetail, powerGain } from './bag-detail.js';
import { renderGemGrid, renderMatGrid, renderPillGrid, renderStockSheet } from './bag-stock.js';
import { bestGems } from '../game/autogem.js';
import { quality, grade } from '../game/tiers.js';
import { startCoinLog } from '../game/coin-log.js';
import { renderCoinLog } from './coin-log-sheet.js';

const $ = id => document.getElementById(id);
const SORTS = [['moi', 'Mới nhặt'], ['pham', 'Phẩm chất'], ['cap', 'Cấp'], ['manh', 'Lực chiến']];

export function createBag(game) {
  const { data } = game;
  const st = { tab: 'do', sel: null, pickSocket: null, slot: 'all', sort: 'moi', coinLog: false };
  startCoinLog(game);   // Lịch sử Linh Thạch: ghi trong máy (src/game/coin-log.js)

  const save = () => game.save;
  const isEq = uid => Object.values(save().equip).includes(uid);

  // full = false: chỉ vẽ lại (đổi tab, chọn ngọc), không lưu
  function changed(full = true) { if (full) { game.refreshStats(); game.persist(); } render(); }
  const pick = uid => { st.sel = st.sel === uid ? null : uid; st.pickSocket = null; st.coinLog = false; render(); };

  function itemCard(it, gain) {
    const r = rarityOf(data.items, it.rarity), q = quality(data, it);   // tẩy luyện mới: màu theo phẩm trung bình các dòng
    const b = el('button', 'item' + (st.sel === it.uid ? ' sel' : ''));
    b.style.setProperty('--rar', q ? q.edge || q.color : r.color);
    b.dataset.o = q ? q.id : r.id;   // ô đồ theo độ hiếm (style-ui-kit2.css)
    b.append(icon(data, it), el('b', null, (it.lock ? '🔒' : '') + itemName(data, it)), el('small', null, `${q ? 'Phẩm ' + q.name : r.name} · ${it.lines.length} dòng · cấp ${it.lvl}`));
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
        const r = rarityOf(data.items, it.rarity), q = quality(data, it);
        cell.style.setProperty('--rar', q ? q.edge || q.color : r.color);
        cell.dataset.o = q ? q.id : r.id;
        cell.append(icon(data, it), el('small', null, name));
        cell.title = itemName(data, it);
        cell.onclick = () => pick(it.uid);
      } else {
        const ic = el('i', 'ico'), spr = data.art.sprites['ui.ic-' + slot];   // ô trống: biểu tượng loại ô mờ
        if (spr) ic.style.setProperty('--ic', `url("${spr.file}?v=${spr.v}")`);
        cell.append(ic, el('small', null, name));
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
      if (st.sort === 'pham') items = items.slice().sort((a, b) => grade(data, b).idx - grade(data, a).idx || b.lvl - a.lvl);   // xếp theo phẩm màu dòng (#138)
      if (st.sort === 'cap') items = items.slice().sort((a, b) => b.lvl - a.lvl || grade(data, b).idx - grade(data, a).idx);
      if (st.sort === 'manh') items = items.slice().sort((a, b) => gain.get(b.uid) - gain.get(a.uid));
      if (save().bag.some(i => !isEq(i.uid))) renderQuick(game, box, st, full => full ? changed() : render());
      if (!items.length) box.append(el('p', 'muted', st.slot === 'all' ? 'Túi trống. Hạ quái để nhặt đồ.' : `Chưa có ${data.items.slots[st.slot].toLowerCase()} nào trong túi.`));
      for (const it of items) box.append(itemCard(it, gain.get(it.uid)));
      return;
    }
    const pickStock = v => { st.stock = st.stock?.id === v.id ? null : v; st.sel = null; st.coinLog = false; render(); };
    if (st.tab === 'nl' || st.tab === 'ca') { renderMatGrid(game, box, st, pickStock, st.tab === 'ca'); return; }   // Cá: mục riêng (chủ dự án 04/11/2026 11:50)
    if (st.tab === 'dan') { renderPillGrid(game, box, st, pickStock); return; }   // đan dược dùng ngay trong túi (góp ý #53)
    if (!Object.keys(save().gems).length) { box.append(el('p', 'muted', 'Chưa có ngọc. Quái và boss có thể rơi ngọc.')); return; }
    if (!st.pickSocket) {   // đề xuất #33: khảm hết bằng một lần bấm
      const b = el('button', 'mini primary gem-best', 'Khảm ngọc tốt nhất');
      b.onclick = async () => {
        b.disabled = true; b.textContent = data.items.ky_mon.busy;
        const r = await bestGems(game);
        game.toast(r.n ? `Đã khảm ${r.n} lần: lực chiến +${r.gain.toLocaleString('vi-VN')}` : 'Ngọc đang khảm đã là tốt nhất.', 2.2);
        if (r.n) game.sfx('levelup');
        changed();
      };
      box.append(b);
    }
    renderGemGrid(game, box, st, pickStock, async k => {
      const p = st.pickSocket; if (!p) return;
      await kySocket(game, p.uid, p.idx, k);
      st.sel = p.uid; st.pickSocket = null; st.tab = 'do'; changed();
    });
  }

  function renderSheet() {
    if (st.tab === 'do') st.stock = null;
    const has = st.coinLog ? renderCoinLog(game, $('bag-detail'), () => { st.coinLog = false; render(); }) : st.stock ? renderStockSheet(game, st, $('bag-detail'), changed, () => { st.stock = null; render(); }) : renderDetail(game, st, $('bag-detail'), changed, () => { st.sel = null; render(); });
    $('bag-sheet').hidden = !has;
    $('bag').classList.toggle('sheet-open', has);
  }

  function render() {
    ensureInv(save());
    for (const b of document.querySelectorAll('#bag [data-tab]')) b.classList.toggle('on', b.dataset.tab === st.tab);
    $('bag-pick').hidden = !st.pickSocket;
    renderEquip(); renderFilter(); renderList(); renderSheet();
  }

  for (const b of document.querySelectorAll('#bag [data-tab]')) b.onclick = () => { st.tab = b.dataset.tab; st.pickSocket = null; st.sel = null; st.stock = null; st.coinLog = false; render(); };
  $('bag-close').onclick = () => close();
  const logBtn = el('button', 'mini', data.shop.coin_log.btn);   // nút Lịch sử cạnh số Linh Thạch (đề xuất #137)
  logBtn.id = 'bag-coinlog';
  $('bag-mats').after(logBtn);
  logBtn.onclick = $('bag-mats').onclick = () => { st.coinLog = !st.coinLog; st.sel = null; st.stock = null; st.pickSocket = null; render(); };
  $('bag-stats').onclick = () => $('bag-stats').classList.toggle('open');   // dòng chỉ số rút gọn một dòng, chạm để xem hết
  $('btn-bag').addEventListener('pointerdown', e => { e.stopPropagation(); if (game.openNav) game.openNav('bag'); else open(); });   // cột mục bên trái (src/ui/side-nav.js)
  game.openBag = tab => { if (tab) { st.tab = tab; st.pickSocket = null; st.stock = null; } open(); };

  function open() {
    if (!game.save || game.dialog.open) return;
    game.uiOpen = true; game.newItems = 0; st.sel = null; st.coinLog = false; $('bag').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('bag').hidden = true; }

  return { open, close };
}
