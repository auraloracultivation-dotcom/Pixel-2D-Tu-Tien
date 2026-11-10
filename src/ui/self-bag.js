// Khung phải bảng Nhân vật, phần kho (chủ dự án 11/11/2026 01:47, khuôn mẫu: hàng mục trên đầu, lưới ô giữa, thanh dưới cùng).
// Trang bị: lọc theo nhóm (Tất cả, Vũ khí, Phòng cụ, Trang sức, Pháp bảo), ô khung phẩm, mũi tên xanh khi mặc vào mạnh hơn;
// thanh dưới: số ô, Xếp, Bán nhanh, Mặc tốt nhất. Kho: Ngọc, Nguyên liệu, Cá, Đan dược (ô hình + số lượng); thanh dưới: Linh Thạch
// (chạm xem lịch sử), Khảm tốt nhất. Chạm ô: phần mặc / rèn / ghép / dùng hiện ngay trong khung (src/ui/self-panel.js vẽ).
// Đang chọn ngọc để khảm (st.pickSocket): Kho → Ngọc hiện dòng nhắc, chạm viên nào là khảm viên đó.
import { el, icon, powerGain } from './bag-detail.js';
import { renderGemGrid, renderMatGrid, renderPillGrid } from './bag-stock.js';
import { gradeColor, gradeId, uiIco } from './self-gear.js';
import { kySocket } from '../game/ky-ngoc.js';
import { bestGems } from '../game/autogem.js';
import { bestGear } from '../game/autogear.js';
import { itemName } from '../game/items.js';
import { grade } from '../game/tiers.js';
import { renderQuick } from './bag-quick.js';
import { coins } from '../game/shop.js';

// Hàng mục trên kho theo từng trang: [mục, hình, tên]
const GROUPS = { all: null, vk: ['vu-khi'], pc: ['mu', 'giap', 'giay'], ts: ['ngoc-boi', 'nhan'], pb: ['phap-bao'] };
export const SUBS = {
  do: [['all', 'ui.ic-ruong', 'Tất cả'], ['vk', 'ui.ic-vu-khi', 'Vũ khí'], ['pc', 'ui.ic-giap', 'Giáp'], ['ts', 'ui.ic-nhan', 'Nhẫn'], ['pb', 'ui.ic-phap-bao', 'P.bảo']],   // Giáp: mũ, giáp, giày; Nhẫn: nhẫn, ngọc bội
  kho: [['ngoc', 'ui.ic-ngoc', 'Ngọc'], ['nl', 'ui.ic-tinh-thach', 'N.liệu'], ['ca', 'ui.m-fish', 'Cá'], ['dan', 'ui.ic-dan', 'Đan']],
  cp: [['chieu', 'ui.ic-tu-luyen', 'Chiêu'], ['cong-phap', 'ui.ic-cong-phap', 'Công pháp']],
  tt: [['thoi-trang', 'ui.ic-thoi-trang', 'Thời trang'], ['danh-hieu', 'ui.ic-danh-hieu', 'Danh hiệu']],
};
export const groupOf = slot => Object.keys(GROUPS).find(g => GROUPS[g]?.includes(slot)) || 'all';
const worn = (save, uid) => Object.values(save.equip || {}).includes(uid);
const SORTS = [['moi', 'Mới'], ['manh', 'Mạnh'], ['pham', 'Phẩm'], ['cap', 'Cấp']];   // xếp: mới nhất, mạnh nhất, phẩm cao, cấp cao
const btn = (txt, cls, fn) => { const b = el('button', cls, txt); b.onclick = fn; return b; };

function gearGrid(game, st, box, refresh) {
  const { data, save } = game, g = GROUPS[st.sub] || null;
  let items = save.bag.filter(i => !worn(save, i.uid) && (!g || g.includes(data.items.bases[i.base]?.slot)));
  const gain = new Map(items.map(i => [i.uid, powerGain(game, i)]));
  if (st.sort === 'manh') items.sort((a, b) => gain.get(b.uid) - gain.get(a.uid));
  else if (st.sort === 'pham') items.sort((a, b) => grade(data, b).idx - grade(data, a).idx || b.lvl - a.lvl);
  else if (st.sort === 'cap') items.sort((a, b) => b.lvl - a.lvl || grade(data, b).idx - grade(data, a).idx);
  else items.sort((a, b) => b.uid - a.uid);
  for (const it of items) {
    const b = el('button', 'sv-slot sv-bagc');
    b.style.setProperty('--q', gradeColor(data, it)); b.dataset.o = gradeId(data, it);   // khung ảnh riêng từng phẩm
    b.setAttribute('aria-label', itemName(data, it));
    b.append(icon(data, it));
    if (it.plus) b.append(el('b', 'sv-plus', '+' + it.plus));
    if (it.lock) b.append(el('span', 'sv-lock', '🔒'));
    if (gain.get(it.uid) > 0) b.append(el('span', 'sv-up', '▲'));
    b.onclick = () => { st.sel = it.uid; st.stock = null; refresh(); };
    box.append(b);
  }
  const free = Math.max(0, data.items.bag_size - save.bag.length);
  for (let i = 0; i < free; i++) box.append(el('i', 'sv-empty'));   // ô trống như mẫu: thấy túi còn bao nhiêu chỗ
}

// Phần giữa (lưới) và thanh dưới cho trang Trang bị / Kho. changed(): lưu + vẽ lại; refresh(): chỉ vẽ lại
export function renderStore(game, st, changed, refresh) {
  const { data, save } = game, grid = el('div', 'sv-bag-grid'), wrap = el('div', 'sv-bag'), bar = el('div', 'sv-bar');
  const pickStock = v => { st.stock = v; st.sel = null; refresh(); };
  if (st.page === 'do') {
    if (st.qs) {   // Bán nhanh: chọn phẩm rồi bán (src/ui/bag-quick.js giữ trạng thái ở st.quick)
      if (!st.quick) renderQuick(game, el('div'), st, () => {});
      st.quick.open = true; renderQuick(game, wrap, st, full => (full ? changed() : refresh()));
    }
    else { gearGrid(game, st, grid, refresh); wrap.append(grid); }
    const n = el('span', 'sv-cnt'); n.append(uiIco(data, 'ui.ic-tui', 'sv-bico'), `${save.bag.length}/${data.items.bag_size}`);
    const sort = btn('⇅ ' + SORTS.find(x => x[0] === st.sort)[1], 'sv-bbtn', () => { st.sort = SORTS[(SORTS.findIndex(x => x[0] === st.sort) + 1) % SORTS.length][0]; refresh(); });
    const quick = btn(st.qs ? 'Xong' : 'Bán', 'sv-bbtn' + (st.qs ? ' on' : ''), () => { st.qs = !st.qs; refresh(); });
    const best = btn('Mặc tốt', 'sv-bbtn gold', () => {   // góp ý #58
      const r = bestGear(game);
      game.toast?.(r.n ? `Đã thay ${r.n} món: lực chiến ${r.gain >= 0 ? '+' : ''}${r.gain.toLocaleString('vi-VN')}` : 'Đồ đang mặc đã là tốt nhất.', 2.2);
      if (r.n) { game.sfx('shield'); changed(); }
    });
    bar.append(n, sort, quick, best);
    return { wrap, bar };
  }
  // Kho
  if (st.pickSocket) {
    const it = save.bag.find(i => i.uid === st.pickSocket.uid), tip = el('div', 'sv-pick');
    tip.append(el('span', null, `Chọn ngọc khảm vào ${it ? itemName(data, it) : 'món đồ'}`), btn('Huỷ', 'sv-bbtn', () => { st.pickSocket = null; st.page = 'do'; st.sel = it?.uid ?? null; refresh(); }));
    wrap.append(tip);
  }
  if (st.sub === 'ngoc') {
    if (!renderGemGrid(game, grid, st, pickStock, async k => {
      const p = st.pickSocket; if (!p) return;
      await kySocket(game, p.uid, p.idx, k);
      st.sel = p.uid; st.pickSocket = null; st.page = 'do'; changed();
    })) wrap.append(el('p', 'muted sv-none', 'Chưa có ngọc. Quái và boss có thể rơi ngọc.'));
  } else if (st.sub === 'nl' || st.sub === 'ca') renderMatGrid(game, grid, st, pickStock, st.sub === 'ca');
  else renderPillGrid(game, grid, st, pickStock);
  grid.classList.add('stock'); wrap.append(grid);
  for (const c of grid.querySelectorAll('.item.stock')) {   // ô nhỏ: hình + số lượng, tên hiện khi chạm (tấm chi tiết)
    const sm = c.querySelector('small'), b = c.querySelector('b');
    if (sm) sm.textContent = sm.textContent.split(' · ')[0];
    if (b) c.title = b.textContent;
  }
  const money = el('button', 'sv-money');   // Linh Thạch, chạm xem lịch sử vào ra (đề xuất #137)
  money.append(uiIco(data, 'ui.ic-linh-thach', 'sv-bico'), `${coins(save).toLocaleString('vi-VN')}`);
  money.onclick = () => { st.coinLog = true; st.sel = null; st.stock = null; refresh(); };
  bar.append(money);
  if (st.sub === 'ngoc' && !st.pickSocket && Object.keys(save.gems || {}).length) {   // đề xuất #33: khảm hết bằng một lần bấm
    const b = btn('Khảm tốt nhất', 'sv-bbtn gold', async () => {
      b.disabled = true; b.textContent = data.items.ky_mon.busy;
      const r = await bestGems(game);
      game.toast(r.n ? `Đã khảm ${r.n} lần: lực chiến +${r.gain.toLocaleString('vi-VN')}` : 'Ngọc đang khảm đã là tốt nhất.', 2.2);
      if (r.n) game.sfx('levelup');
      changed();
    });
    bar.append(b);
  }
  return { wrap, bar };
}
