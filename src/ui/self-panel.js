// Bảng Nhân vật (chủ dự án 11/11/2026 01:47: khuôn bảng ngang thấp như mẫu gửi, nằm giữa màn hình dọc; game nhiều chức năng hơn mẫu).
// Cột trái: 4 mục lớn Trang bị, Kho, Công pháp, Thời trang. Giữa: thẻ nhân vật (src/ui/self-left.js). Khung phải: hàng mục con
// trên đầu (đổi theo mục lớn, src/ui/self-bag.js → SUBS), lưới ô ở giữa, thanh dưới cùng. Chạm món (đang mặc hoặc trong kho):
// phần mặc / cường hoá / tẩy luyện / khảm hiện ngay ở khung phải, ✕ về lưới (dùng chung src/ui/bag-detail.js, bag-stock.js với
// Túi đồ). Công pháp, Thời trang: gắn chính bảng có sẵn của game vào khung phải (src/ui/self-host.js). Kiểu ở style-self.css.
import { playerStats } from '../game/stats.js';
import { el, renderDetail } from './bag-detail.js';
import { uiIco } from './self-gear.js';
import { leftCard, statsSheet } from './self-left.js';
import { renderStore, SUBS, groupOf } from './self-bag.js';
import { renderStockSheet } from './bag-stock.js';
import { renderCoinLog } from './coin-log-sheet.js';
import { host, unhost, HOSTS } from './self-host.js';

const PAGES = [['do', 'ui.ic-tui', 'Trang bị'], ['kho', 'ui.ic-ruong', 'Kho'], ['cp', 'ui.ic-cong-phap', 'Công pháp'], ['tt', 'ui.ic-thoi-trang', 'Thời trang']];
const SUB0 = { do: 'all', kho: 'ngoc', cp: 'chieu', tt: 'thoi-trang' };

export function createSelfPanel(game) {
  const root = el('div', 'panel self-panel sv'); root.hidden = true;
  const x = el('button', 'sv-x', '✕'), frame = el('div', 'sv-frame'), rail = el('div', 'sv-pages'), left = el('div', 'sv-left');
  const right = el('div', 'sv-right'), subs = el('div', 'sv-subs'), mid = el('div', 'sv-mid'), bar = el('div', 'sv-barbox'), hostBox = el('div', 'sv-hostbox');
  x.setAttribute('aria-label', 'Đóng');
  right.append(subs, mid, hostBox, bar);
  frame.append(rail, left, right);
  root.append(frame, x);
  document.body.append(root);
  const st = { page: 'do', sub: 'all', sel: null, stock: null, coinLog: false, more: false, pickSocket: null, sort: 'moi', qs: false };
  const reset = () => { st.sel = null; st.stock = null; st.coinLog = false; st.more = false; };
  function close() { unhost(); root.hidden = true; game.uiOpen = false; reset(); st.pickSocket = null; st.qs = false; }
  x.onclick = close;
  const goOld = it => { close(); game.openOldPanel?.(it); };
  const go = (page, sub) => { st.page = page; st.sub = sub || SUB0[page]; reset(); st.qs = false; if (page !== 'kho') st.pickSocket = null; render(); };

  function changed(full = true) {
    if (full) { game.refreshStats(); game.persist(); }
    if (st.pickSocket && st.page !== 'kho') { st.page = 'kho'; st.sub = 'ngoc'; st.sel = null; }   // "+ Khảm ngọc": Kho → Ngọc chọn viên
    render();
  }
  const h = {
    pick: (slot, it) => {
      if (!it) { st.sort = 'manh'; go('do', groupOf(slot)); return; }   // ô trống: kho lọc đúng nhóm, mạnh nhất lên đầu
      if (st.page !== 'kho') st.page = 'do';
      reset(); st.sel = it.uid; render();
    },
    openExtra: k => goOld({ btn: 'btn-pets', tabs: 'pets-tabs', tab: k === 'pet' ? 'linh-thu' : k === 'mount' ? 'thu-cuoi' : 'dong-hanh' }),
    rename: () => { close(); game.openRename?.(); },
    stats: () => { const m = !st.more; reset(); st.more = m; if (st.page !== 'do' && st.page !== 'kho') st.page = 'do'; render(); },
  };

  function tabBtn(cls, on, ico, name, fn) {
    const b = el('button', cls + (on ? ' on' : '')); b.title = name;
    b.append(uiIco(game.data, ico, 'sv-rico'), el('small', null, name)); b.onclick = fn;
    return b;
  }

  function render() {
    const s = game.save, d = game.data, stt = playerStats(s, d);
    rail.replaceChildren(...PAGES.map(([id, ico, name]) => tabBtn('sv-pg', st.page === id, ico, name, () => go(id))));
    left.replaceChildren(leftCard(game, stt, h));
    subs.replaceChildren(...SUBS[st.page].map(([id, ico, name]) => tabBtn('sv-sb', st.sub === id, ico, name, () => {
      st.sub = id; reset(); st.qs = false;
      if (HOSTS[st.page]) document.querySelector(`#${HOSTS[st.page][2]} [data-tab="${id}"]`)?.click();   // tab của bảng đang gắn
      render();
    })));
    const hosted = !!HOSTS[st.page];
    hostBox.hidden = !hosted; mid.hidden = hosted; bar.hidden = hosted;
    if (hosted) { host(hostBox, st.page, st.sub); return; }
    unhost();
    const keep = mid.scrollTop;
    let has = false;   // phần chi tiết thay chỗ lưới
    if (st.more) has = statsSheet(game, stt, mid, () => { st.more = false; render(); });
    else if (st.coinLog) has = renderCoinLog(game, mid, () => { st.coinLog = false; render(); });
    else if (st.sel != null) has = renderDetail(game, st, mid, changed, () => { st.sel = null; render(); });
    else if (st.stock) has = renderStockSheet(game, st, mid, changed, () => { st.stock = null; render(); });
    mid.classList.toggle('sheet', has);
    if (has) { bar.hidden = true; mid.scrollTop = 0; return; }
    reset();
    const r = renderStore(game, st, changed, render);
    mid.replaceChildren(r.wrap); bar.replaceChildren(r.bar);
    mid.scrollTop = keep;
  }

  function render() {
    const s = game.save, d = game.data, stt = playerStats(s, d);
    before = snap(game);
    patchList(rail, PAGES.map(([id, ico, name]) => tabBtn('sv-pg', st.page === id, ico, name, () => go(id))));
    patch(left, leftCard(game, stt, h));   // vá thẻ cũ, không thay cả thẻ (src/ui/morph.js)
    subs.classList.toggle('many', SUBS[st.page].length > 3);   // nhiều mục con: chỉ hiện hình cho khỏi cắt chữ
    patchList(subs, SUBS[st.page].map(([id, ico, name]) => tabBtn('sv-sb', st.sub === id, ico, name, () => {
      st.sub = id; reset(); st.qs = false;
      if (HOSTS[st.page]) document.querySelector(`#${HOSTS[st.page][2]} [data-tab="${id}"]`)?.click();   // tab của bảng đang gắn
      render();
    })));
    const hosted = !!HOSTS[st.page];
    hostBox.hidden = !hosted; mid.hidden = hosted; bar.hidden = hosted;
    if (hosted) { host(hostBox, st.page, st.sub, game, hostedChanged); return; }
    unhost();
    const keep = mid.scrollTop, same = mid.classList.contains('sheet') && st.sel != null && st.sel === lastSel;   // vẽ lại cùng món (bấm −/+ ô mua): giữ chỗ đang cuộn
    lastSel = st.sel;
    let has = false;   // phần chi tiết thay chỗ lưới
    if (st.more) has = statsSheet(game, stt, mid, () => { st.more = false; render(); });
    else if (st.coinLog) has = renderCoinLog(game, mid, () => { st.coinLog = false; render(); });
    else if (st.sel != null) has = renderDetail(game, st, mid, changed, () => { st.sel = null; render(); });
    else if (st.stock) has = renderStockSheet(game, st, mid, changed, () => { st.stock = null; render(); });
    mid.classList.toggle('sheet', has);
    if (has) decorate(game, mid);
    if (has) { bar.hidden = true; mid.scrollTop = same ? keep : 0; return; }
    reset();
    const r = renderStore(game, st, changed, render);
    mid.replaceChildren(r.wrap); bar.replaceChildren(r.bar);
    mid.scrollTop = keep;
  }

  function open(page, sub) {   // page, sub: mở thẳng một mục (vd 'kho', 'dan')
    if (!game.save || game.dialog.open || game.trip) return;
    for (const p of document.querySelectorAll('.panel, #bag')) if (p !== root && !p.hidden) p.querySelector('[id$="-close"]')?.click();
    game.uiOpen = true; root.hidden = false; reset(); render();
  }
  game.openSelf = open;
  const R = document.getElementById('realm');   // chạm khung tên, cảnh giới
  R?.addEventListener('click', e => { e.stopPropagation(); open(); }, true);
  document.getElementById('power')?.addEventListener('click', e => { e.stopPropagation(); open(); });
}
