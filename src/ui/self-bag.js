// Khung phải bảng Nhân vật, phần kho (chủ dự án 11/11/2026 01:47, khuôn mẫu: hàng mục trên đầu, lưới ô giữa, thanh dưới cùng).
// Trang bị: lọc theo nhóm (Tất cả, Vũ khí, Phòng cụ, Trang sức, Pháp bảo), ô khung phẩm, mũi tên xanh khi mặc vào mạnh hơn;
// thanh dưới: số ô, Xếp, Bán nhanh, Mặc tốt nhất. Kho: Ngọc, Nguyên liệu, Cá, Đan dược (ô hình + số lượng); thanh dưới: Linh Thạch
// (chạm xem lịch sử), Khảm tốt nhất. Chạm ô: phần mặc / rèn / ghép / dùng hiện ngay trong khung (src/ui/self-panel.js vẽ).
// Đang chọn ngọc để khảm (st.pickSocket): Kho → Ngọc hiện dòng nhắc, chạm viên nào là khảm viên đó.
import { el, icon, powerGain } from './bag-detail.js';
import { renderGemGrid, renderMatGrid, renderPillGrid } from './bag-stock.js';
import { gradeColor, gradeId, uiIco, socketCol } from './self-gear.js';
import { kySocket } from '../game/ky-ngoc.js';
import { bestGems } from '../game/autogem.js';
import { bestGear } from '../game/autogear.js';
import { itemName } from '../game/items.js';
import { grade } from '../game/tiers.js';
import { renderQuick } from './bag-quick.js';
import { coins } from '../game/shop.js';

// Hàng mục trên kho theo từng trang: [mục, hình, tên]
const GROUPS = { all: null, vk: ['vu-khi'], pc: ['mu', 'giap', 'giay'], ts: ['ngoc-boi', 'nhan'], pb: ['phap-bao'] };
export const SUBS = {   // biểu tượng mục con (ảnh GPT 11/11/2026 03:03, tools/art/ui_nhan_vat.py)
  do: [['all', 'ui.nv-tab-tat-ca', 'Tất cả'], ['vk', 'ui.nv-tab-vu-khi', 'Vũ khí'], ['pc', 'ui.nv-tab-giap', 'Giáp'], ['ts', 'ui.nv-tab-nhan', 'Nhẫn'], ['pb', 'ui.nv-tab-phap-bao', 'P.bảo']],   // Giáp: mũ, giáp, giày; Nhẫn: nhẫn, ngọc bội
  kho: [['ngoc', 'ui.nv-tab-ngoc', 'Ngọc'], ['nl', 'ui.nv-tab-nguyen-lieu', 'N.liệu'], ['ca', 'ui.nv-tab-ca', 'Cá'], ['dan', 'ui.nv-tab-dan', 'Đan']],
  cp: [['chieu', 'ui.nv-tab-chieu', 'Chiêu'], ['cong-phap', 'ui.nv-tab-bi-kip', 'Công pháp']],
  tt: [['thoi-trang', 'ui.nv-tab-thoi-trang', 'Thời trang'], ['danh-hieu', 'ui.nv-tab-danh-hieu', 'Danh hiệu']],
};
export const groupOf = slot => Object.keys(GROUPS).find(g => GROUPS[g]?.includes(slot)) || 'all';
const worn = (save, uid) => Object.values(save.equip || {}).includes(uid);
const SORTS = [['moi', 'Mới', 'mới nhất'], ['manh', 'Mạnh', 'mạnh nhất'], ['pham', 'Phẩm', 'phẩm cao'], ['cap', 'Cấp', 'cấp cao']];
const btn = (txt, cls, fn, ico) => {   // ico: biểu tượng ảnh trước chữ (màn hẹp chỉ hiện hình, style-self.css)
  const b = el('button', cls + (ico ? ' has-ico' : '')); if (ico) b.append(ico); if (txt) b.append(el('span', null, txt)); b.onclick = fn; return b;
};

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
    if (it.lock) b.append(uiIco(data, 'ui.nv-khoa', 'sv-lock'));   // đã khoá: không bị bán, phân giải
    if (gain.get(it.uid) > 0) b.append(el('span', 'sv-up', '▲'));   // góc dưới phải như mẫu: mặc vào mạnh hơn
    const gems = socketCol(game, it); if (gems) b.append(gems);   // cột ngọc khảm dọc mép trái
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
    const n = el('span', 'sv-cnt', `${save.bag.length}/${data.items.bag_size}`);
    const sort = btn('', 'sv-bbtn ico', () => {   // nút xếp chỉ có hình cho gọn, bấm thì báo đang xếp theo gì
      st.sort = SORTS[(SORTS.findIndex(x => x[0] === st.sort) + 1) % SORTS.length][0];
      game.toast?.(`Xếp: ${SORTS.find(x => x[0] === st.sort)[2]}`, 1.2); refresh();
    }, uiIco(data, 'ui.nv-sap-xep', 'sv-bico'));
    sort.title = 'Xếp: ' + SORTS.find(x => x[0] === st.sort)[2];
    const quick = btn(st.qs ? 'Xong' : 'Bán', 'sv-bbtn' + (st.qs ? ' on' : ''), () => { st.qs = !st.qs; refresh(); }, uiIco(data, 'ui.nv-ban', 'sv-bico'));
    const best = btn('Mặc', 'sv-bbtn gold', () => {   // mặc đồ tốt nhất   // góp ý #58
      const r = bestGear(game);
      game.toast?.(r.n ? `Đã thay ${r.n} món: lực chiến ${r.gain >= 0 ? '+' : ''}${r.gain.toLocaleString('vi-VN')}` : 'Đồ đang mặc đã là tốt nhất.', 2.2);
      if (r.n) { game.sfx('shield'); changed(); }
    }, uiIco(data, 'ui.nv-mac-tot', 'sv-bico'));
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
  money.append(uiIco(data, 'ui.ic-linh-thach', 'sv-bico'), `${coins(save).toLocaleString('vi-VN')}`, uiIco(data, 'ui.nv-lich-su', 'sv-bico'));
  money.onclick = () => { st.coinLog = true; st.sel = null; st.stock = null; refresh(); };
  bar.append(money);
  if (st.sub === 'ngoc' && !st.pickSocket && Object.keys(save.gems || {}).length) {   // đề xuất #33: khảm hết bằng một lần bấm
    const b = btn('Khảm tốt nhất', 'sv-bbtn gold', async () => {   // nút có hình khảm (cuối hàm)
      b.disabled = true; b.textContent = data.items.ky_mon.busy;
      const r = await bestGems(game);
      game.toast(r.n ? `Đã khảm ${r.n} lần: lực chiến +${r.gain.toLocaleString('vi-VN')}` : 'Ngọc đang khảm đã là tốt nhất.', 2.2);
      if (r.n) game.sfx('levelup');
      changed();
    }, uiIco(data, 'ui.nv-kham', 'sv-bico'));
    bar.append(b);
  }
  return { wrap, bar };
}
