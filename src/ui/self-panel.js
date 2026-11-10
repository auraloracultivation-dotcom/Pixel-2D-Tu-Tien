// Bảng Nhân vật + Kho, kiểu My Heroes Dungeon Raid (chủ dự án 11/11/2026 01:34): bảng ngang nằm giữa màn hình dọc, TRÁI là thẻ
// nhân vật (tên, cảnh giới, linh khí, nhân vật đứng trên vòng pháp trận, mỗi bên 4 ô đồ có thanh ngọc khảm dính dưới, hàng linh thú /
// khôi lỗi / thú cưỡi, Lực Chiến, chỉ số), PHẢI là kho: hàng mục ngay trên kho (Trang bị, Ngọc, Nguyên liệu, Cá, Đan dược), lưới đồ
// (src/ui/self-bag.js). Chạm món (đang mặc hoặc trong kho): phần mặc / cường hoá / tẩy luyện / khảm hiện ngay ở khung phải, ✕ về kho
// (dùng chung src/ui/bag-detail.js, bag-stock.js với Túi đồ). Kiểu ở style-self.css.
import { heroLook } from '../render/draw-hero.js';
import { spriteIcon } from './sprite-icon.js';
import { playerStats, realmLabel, rootOf, qiNeed } from '../game/stats.js';
import { power, titleOf } from '../game/achieve.js';
import { el, renderDetail } from './bag-detail.js';
import { gearCell, buffCell, uiIco } from './self-gear.js';
import { renderSelfBag, BAG_TABS } from './self-bag.js';
import { renderStockSheet } from './bag-stock.js';
import { renderCoinLog } from './coin-log-sheet.js';
import { host, unhost } from './self-host.js';

const vn = n => Math.round(n || 0).toLocaleString('vi-VN');
const pct = n => `${Math.round((n || 0) * 1000) / 10}%`;
const LEFT = ['vu-khi', 'mu', 'giap', 'giay'], RIGHT = ['ngoc-boi', 'nhan', 'phap-bao', null];   // null: ô chừa (chủ dự án 11/11 01:07: mỗi bên 4 ô)
const BUFFS = ['pet', 'comp', 'comp2', 'mount', 'spare'];
// Cột chức năng tăng sức mạnh bên phải (chủ dự án 11/11/2026 01:43): [trang, hình, tên]
const PAGES = [['do', 'ui.ic-vu-khi', 'Trang bị'], ['kho', 'ui.ic-tui', 'Kho'], ['cp', 'ui.ic-cong-phap', 'Công pháp'], ['tt', 'ui.ic-thoi-trang', 'Thời trang']];
const KHO = ['ngoc', 'nl', 'ca', 'dan'];   // mục trong Kho

export function createSelfPanel(game) {
  const root = el('div', 'panel self-panel sv'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', '✕'), body = el('div', 'self-body'), sheet = el('div', 'sv-sheet');
  const two = el('div', 'sv-two'), right = el('div', 'sv-right'), rail = el('div', 'sv-tabs2'), store = el('div', 'sv-store');
  const pages = el('div', 'sv-pages'), hostBox = el('div', 'sv-hostbox');
  head.append(el('b', null, 'Nhân Vật'), x);
  right.append(rail, store, sheet, hostBox);
  two.append(body, right, pages);
  root.append(head, two);
  document.body.append(root);
  const st = { sel: null, more: false, page: 'do', tab: 'do', sort: 'moi', stock: null, pickSocket: null, slot: 'all', coinLog: false };
  function close() { unhost(); root.hidden = true; game.uiOpen = false; st.sel = null; st.stock = null; st.pickSocket = null; }
  x.onclick = close;
  const goOld = it => { close(); game.openOldPanel?.(it); };

  function changed(full = true) {
    if (full) { game.refreshStats(); game.persist(); }
    render();

  }
  function pick(slot, it) {
    if (!it) {   // ô trống: kho bên phải lọc đúng chỗ đó, mạnh nhất lên đầu
      st.page = 'do'; st.tab = 'do'; st.slot = slot; st.sort = 'manh'; st.sel = null; st.stock = null; st.coinLog = false; render(); return;
    }
    st.sel = st.sel === it.uid ? null : it.uid; st.stock = null; st.coinLog = false; if (st.page !== 'do' && st.page !== 'kho') st.page = 'do', st.tab = 'do'; render();
  }
  const openExtra = k => goOld({ btn: 'btn-pets', tabs: 'pets-tabs', tab: k === 'pet' ? 'linh-thu' : k === 'mount' ? 'thu-cuoi' : 'dong-hanh' });

  function top(s, d) {   // đầu bảng: tên, cảnh giới, danh hiệu, thanh linh khí
    const t = el('div', 'sv-top'), tt = titleOf(game), info = el('div', 'sv-info');
    const nm = el('button', 'sv-nm', game.cloud?.name || 'Đạo hữu');
    nm.onclick = () => { close(); game.openRename?.(); };
    const e = el('button', 'sv-title', tt ? tt.name : 'Chọn danh hiệu ›'); if (tt?.color) e.style.color = tt.color;
    e.onclick = () => goOld({ btn: 'btn-achv', tabs: 'achv-tabs', tab: 'danh-hieu' });
    info.append(nm, el('span', 'sv-realm', realmLabel(s, d.realms)), e);
    const need = qiNeed(s, d.realms), qi = el('div', 'sv-qi'), bar = el('i');
    bar.style.width = Math.min(100, (s.qi || 0) / Math.max(1, need) * 100) + '%';
    qi.append(bar, el('span', null, `Linh khí ${vn(s.qi)}/${vn(need)}`));
    t.append(info, qi);
    return t;
  }

  // nhân vật đứng tự do trên vòng pháp trận mờ (không đóng khung, chủ dự án 11/11/2026 00:57), ô trang bị xếp hai bên
  function hero(s, d) {
    const g = el('div', 'sv-hero-area'), mid = el('div', 'sv-center'), look = heroLook(game);
    mid.append(el('i', 'sv-circle'), spriteIcon(game, look.sprite, 0, 84, 'sv-hero', true));
    if (s.element) {
      const e = d.elements[s.element], seal = el('span', 'sv-seal', { kim: '金', moc: '木', thuy: '水', hoa: '火', tho: '土' }[s.element] || '?');
      seal.style.setProperty('--e', e.color); seal.title = `Linh căn ${e.name} · ${rootOf(s, d).name}`; mid.append(seal);
    }
    g.append(column('l', LEFT), mid, column('r', RIGHT));
    const row = el('div', 'sv-buffs');   // linh thú, khôi lỗi, thú cưỡi, ô chừa
    for (const k of BUFFS) row.append(buffCell(game, k, openExtra));
    const box = el('div', 'sv-heroes'); box.append(g, row);
    return box;
  }

  function column(side, slots) {
    const c = el('div', 'sv-col ' + side);
    for (const k of slots) {
      if (k) { c.append(gearCell(game, k, side, pick)); continue; }
      const w = el('div', 'sv-cell ' + side), b = el('button', 'sv-slot spare'); b.disabled = true; b.title = 'Sắp mở'; b.append(uiIco(game.data, 'ui.ic-khoa')); w.append(b); c.append(w);
    }
    return c;
  }

  function cpBar() {
    const b = el('div', 'sv-cpbar');
    b.append(el('i', null, '⚔'), el('span', null, 'Lực Chiến'), el('b', null, vn(power(game))));
    return b;
  }

  function stats(stt, p) {   // bảng chỉ số có biểu tượng như mẫu; chạm Thêm ra hết
    const box = el('div', 'sv-stats'), grid = el('div', 'sv-grid');
    const row = (ic, k, v, cls) => { const r = el('div', 'sv-row ' + (cls || '')); r.append(el('i', null, ic), el('span', null, k), el('b', null, v)); grid.append(r); };
    row('❤', 'HP', vn(stt.maxHp), 'c-hp'); row('★', 'Bạo', pct(stt.crit), 'c-cr');
    row('⚔', 'Công', vn(stt.atk), 'c-atk'); row('✸', 'ST bạo', pct(stt.critMult), 'c-cr');
    row('⛨', 'Thủ', vn(stt.def), 'c-def'); row('⟳', 'Hồi chiêu', pct(stt.cdr), 'c-mp');
    row('➤', 'Tốc', pct(stt.speedMul), 'c-spd'); row('✚', 'Hút máu', pct(stt.lifesteal), 'c-hp');
    if (st.more) {
      row('◆', 'Linh lực', `${vn(p?.mp)}/${vn(p?.mpMax)}`, 'c-mp'); row('☯', 'Tốc tu', `×${stt.qiMul.toFixed(2)}`, 'c-mp');
      row('↯', 'Phản đòn', pct(stt.thorns), 'c-def'); row('♥', 'Hồi máu', `${vn(stt.regen)}/giây`, 'c-hp');
      row('⛨', 'Giảm sát thương', pct(stt.dr), 'c-def'); row('◇', 'Hồi linh lực', `${Math.round((game.data.config.mana.regen_pct + stt.mpRegen) * 1000) / 10}%/giây`, 'c-mp');
    }
    const more = el('button', 'sv-more', st.more ? 'Thu gọn ▲' : 'Thêm chỉ số ▼');
    more.onclick = () => { st.more = !st.more; render(); };
    box.append(grid, more);
    return box;
  }

  function renderRail() {   // hàng mục ngay trên kho (mẫu chủ dự án gửi 11/11/2026 01:34)
    rail.hidden = st.page !== 'kho';
    rail.replaceChildren(...BAG_TABS.filter(t => KHO.includes(t[0])).map(([id, han, name, short]) => {
      const b = el('button', 'sv-rb' + (st.tab === id ? ' on' : '')); b.title = name;
      b.append(uiIco(game.data, han, 'sv-rico'), el('small', null, short || name));
      b.onclick = () => { st.tab = id; st.sel = null; st.stock = null; st.coinLog = false; if (id !== 'ngoc') st.pickSocket = null; render(); };
      return b;
    }));
  }

  function renderPages() {   // cột chức năng bên phải: Trang bị, Kho, Công pháp, Thời trang
    pages.replaceChildren(...PAGES.map(([id, ico, name]) => {
      const b = el('button', 'sv-pg' + (st.page === id ? ' on' : '')); b.title = name;
      b.append(uiIco(game.data, ico, 'sv-rico'), el('small', null, name));
      b.onclick = () => {
        st.page = id; st.sel = null; st.stock = null; st.coinLog = false; st.pickSocket = null;
        if (id === 'do') st.tab = 'do'; else if (id === 'kho' && !KHO.includes(st.tab)) st.tab = 'ngoc';
        render();
      };
      return b;
    }));
  }

  function render() {
    const s = game.save, d = game.data, stt = playerStats(s, d);
    const keep = body.scrollTop, keep2 = store.scrollTop;
    body.replaceChildren(top(s, d), hero(s, d), cpBar(), stats(stt, game.player));
    if (st.pickSocket) { st.page = 'kho'; st.tab = 'ngoc'; }   // "+ Khảm ngọc": sang Kho → Ngọc chọn viên
    renderPages();
    const hosted = st.page === 'cp' || st.page === 'tt';
    hostBox.hidden = !hosted;
    if (hosted) { store.hidden = true; sheet.hidden = true; rail.hidden = true; host(hostBox, st.page); return; }
    unhost();
    store.replaceChildren(renderSelfBag(game, st, changed, render));
    body.scrollTop = keep; store.scrollTop = keep2;
    renderRail();
    let has = false;
    if (st.coinLog) has = renderCoinLog(game, sheet, () => { st.coinLog = false; render(); });
    else if (st.sel != null) has = renderDetail(game, st, sheet, changed, () => { st.sel = null; render(); });
    else if (st.stock) has = renderStockSheet(game, st, sheet, changed, () => { st.stock = null; render(); });
    if (!has) { st.sel = null; st.stock = null; st.coinLog = false; }
    sheet.hidden = !has; store.hidden = has;   // món đang chọn: phần mặc / rèn thay chỗ lưới kho
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
    game.uiOpen = true; root.hidden = false; st.sel = null; render();
  }
  game.openSelf = open;
  const R = document.getElementById('realm');   // chạm khung tên, cảnh giới
  R?.addEventListener('click', e => { e.stopPropagation(); open(); }, true);
  document.getElementById('power')?.addEventListener('click', e => { e.stopPropagation(); open(); });
}
