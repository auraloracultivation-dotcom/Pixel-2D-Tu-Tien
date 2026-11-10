// Lưới túi đồ nằm DƯỚI nhân vật trên bảng Nhân vật (chủ dự án 11/11/2026 00:50: màn dọc nên túi để trên dưới, không trái phải;
// cột chọn mục bên trái). Mục: Trang bị (ô vuông như ô đang mặc, mũi tên xanh khi mặc vào mạnh hơn), Ngọc, Nguyên liệu, Đan dược
// (dùng lại lưới của Túi đồ, src/ui/bag-stock.js). Chạm ô: tấm chi tiết trượt lên trong bảng (src/ui/self-panel.js vẽ).
// Trên lưới: Linh Thạch (chạm xem lịch sử), lọc theo loại, bán / phân giải nhanh, mặc đồ tốt nhất (như Túi đồ cũ). Mục Cá riêng.
// Đang chọn ngọc để khảm (st.pickSocket): mục Ngọc hiện dòng nhắc, chạm viên nào là khảm viên đó.
import { el, icon, powerGain } from './bag-detail.js';
import { renderGemGrid, renderMatGrid, renderPillGrid } from './bag-stock.js';
import { gradeColor } from './self-gear.js';
import { kySocket } from '../game/ky-ngoc.js';
import { bestGems } from '../game/autogem.js';
import { itemName } from '../game/items.js';
import { grade } from '../game/tiers.js';
import { renderQuick } from './bag-quick.js';
import { coins } from '../game/shop.js';

export const BAG_TABS = [['do', '裝', 'Trang bị'], ['ngoc', '玉', 'Ngọc'], ['nl', '材', 'Nguyên liệu'], ['dan', '丹', 'Đan dược'], ['ca', '魚', 'Cá']];
const worn = (save, uid) => Object.values(save.equip || {}).includes(uid);
const SORTS = [['moi', 'Mới nhất'], ['manh', 'Mạnh nhất'], ['pham', 'Phẩm cao']];

function gearGrid(game, st, box, refresh) {
  const { data, save } = game;
  let items = save.bag.filter(i => !worn(save, i.uid) && (!st.slot || st.slot === 'all' || data.items.bases[i.base]?.slot === st.slot));
  const gain = new Map(items.map(i => [i.uid, powerGain(game, i)]));
  if (st.sort === 'manh') items.sort((a, b) => gain.get(b.uid) - gain.get(a.uid));
  else if (st.sort === 'pham') items.sort((a, b) => grade(data, b).idx - grade(data, a).idx || b.lvl - a.lvl);
  else items.sort((a, b) => b.uid - a.uid);
  for (const it of items) {
    const b = el('button', 'sv-slot sv-bagc' + (st.sel === it.uid ? ' sel' : ''));
    b.style.setProperty('--q', gradeColor(data, it));
    b.setAttribute('aria-label', itemName(data, it));
    b.append(icon(data, it));
    if (it.plus) b.append(el('b', 'sv-plus', '+' + it.plus));
    if (it.lvl) b.append(el('span', 'sv-lv', 'Cấp ' + it.lvl));
    if (it.lock) b.append(el('span', 'sv-lock', '🔒'));
    if (gain.get(it.uid) > 0) b.append(el('span', 'sv-up', '▲'));   // mặc vào thì lực chiến tăng
    b.onclick = () => { st.sel = st.sel === it.uid ? null : it.uid; st.stock = null; refresh(); };
    box.append(b);
  }
  const free = Math.max(0, data.items.bag_size - save.bag.length);
  for (let i = 0; i < Math.min(free, 10); i++) box.append(el('i', 'sv-empty'));   // vài ô trống cho thấy túi còn chỗ
  return items.length;
}

// Vẽ phần túi; changed(): lưu + vẽ lại cả bảng; refresh(): chỉ vẽ lại
export function renderSelfBag(game, st, changed, refresh) {
  const { data, save } = game, wrap = el('div', 'sv-bag'), head = el('div', 'sv-bag-head'), grid = el('div', 'sv-bag-grid');
  const tab = BAG_TABS.find(t => t[0] === st.tab) || BAG_TABS[0];
  head.append(el('b', null, tab[2]));
  if (st.tab === 'do') {
    head.append(el('span', 'sv-cnt', `${save.bag.length}/${data.items.bag_size}`));
    const s = el('button', 'sv-sort', '⇅ ' + SORTS.find(x => x[0] === st.sort)[1]);
    s.onclick = () => { st.sort = SORTS[(SORTS.findIndex(x => x[0] === st.sort) + 1) % SORTS.length][0]; refresh(); };
    head.append(s);
  }
  if (st.tab === 'ngoc' && !st.pickSocket && Object.keys(save.gems || {}).length) {   // đề xuất #33: khảm hết bằng một lần bấm
    const b = el('button', 'sv-sort', 'Khảm tốt nhất');
    b.onclick = async () => {
      b.disabled = true; b.textContent = data.items.ky_mon.busy;
      const r = await bestGems(game);
      game.toast(r.n ? `Đã khảm ${r.n} lần: lực chiến +${r.gain.toLocaleString('vi-VN')}` : 'Ngọc đang khảm đã là tốt nhất.', 2.2);
      if (r.n) game.sfx('levelup');
      changed();
    };
    head.append(b);
  }
  const money = el('button', 'sv-money');   // Linh Thạch đang có, chạm xem lịch sử vào ra (đề xuất #137)
  money.append(el('span', null, `${coins(save).toLocaleString('vi-VN')} ${data.shop.name}`), el('small', null, data.shop.coin_log.btn));
  money.onclick = () => { st.coinLog = !st.coinLog; st.sel = null; st.stock = null; refresh(); };
  wrap.append(head, money);
  if (st.tab === 'do') {
    const chips = el('div', 'sv-chips');   // lọc theo loại
    for (const [id, name] of [['all', 'Tất cả'], ...Object.entries(data.items.slots)]) {
      const c = el('button', 'chip' + ((st.slot || 'all') === id ? ' on' : ''), name);
      c.onclick = () => { st.slot = id; refresh(); };
      chips.append(c);
    }
    wrap.append(chips);
    if (save.bag.some(i => !worn(save, i.uid))) { const q = el('div', 'sv-quick'); renderQuick(game, q, st, full => full ? changed() : refresh()); wrap.append(q); }   // bán / phân giải nhanh, mặc đồ tốt nhất
  }
  if (st.pickSocket) {
    const it = save.bag.find(i => i.uid === st.pickSocket.uid), tip = el('div', 'sv-pick'), no = el('button', 'sv-sort', 'Huỷ');
    no.onclick = () => { st.pickSocket = null; st.tab = 'do'; st.sel = it?.uid ?? null; refresh(); };
    tip.append(el('span', null, `Chọn viên ngọc để khảm vào ${it ? itemName(data, it) : 'món đồ'}`), no);
    wrap.append(tip);
  }
  const pickStock = v => { st.stock = st.stock?.id === v.id ? null : v; st.sel = null; refresh(); };
  if (st.tab === 'do') { if (!gearGrid(game, st, grid, refresh)) wrap.append(el('p', 'muted sv-none', 'Túi chưa có món nào ngoài đồ đang mặc. Hạ quái để nhặt đồ.')); }
  else if (st.tab === 'ngoc') {
    if (!renderGemGrid(game, grid, st, pickStock, async k => {
      const p = st.pickSocket; if (!p) return;
      await kySocket(game, p.uid, p.idx, k);
      st.sel = p.uid; st.pickSocket = null; st.tab = 'do'; changed();
    })) wrap.append(el('p', 'muted sv-none', 'Chưa có ngọc. Quái và boss có thể rơi ngọc.'));
  } else if (st.tab === 'nl' || st.tab === 'ca') renderMatGrid(game, grid, st, pickStock, st.tab === 'ca');
  else renderPillGrid(game, grid, st, pickStock);
  grid.classList.toggle('stock', st.tab !== 'do');
  wrap.append(grid);
  return wrap;
}
