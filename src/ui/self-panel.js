// Bảng Nhân vật + Túi đồ một màn (chủ dự án 11/11/2026 00:39–00:57; màn dọc nên túi nằm dưới, nhân vật không đóng khung).
// Cột trái: chọn mục túi (Trang bị, Ngọc, Nguyên liệu, Đan dược). Trên: tên, cảnh giới, danh hiệu, linh khí. Giữa: nhân vật đứng
// trên vòng pháp trận mờ, linh thú bên cạnh, ô đang mặc xếp hai bên (src/ui/self-gear.js). Dưới: dòng Lực Chiến, bảng chỉ số có
// biểu tượng (Thêm ra hết), rồi lưới túi (src/ui/self-bag.js). Chạm món: tấm rèn luyện / mặc trượt lên ngay trong bảng
// (dùng chung src/ui/bag-detail.js, bag-stock.js với Túi đồ): cường hoá, tẩy luyện, khảm, gỡ ngọc, mặc, tháo. Kiểu ở style-self.css.
import { heroLook } from '../render/draw-hero.js';
import { spriteIcon } from './sprite-icon.js';
import { playerStats, realmLabel, rootOf, qiNeed } from '../game/stats.js';
import { power, titleOf } from '../game/achieve.js';
import { el, renderDetail } from './bag-detail.js';
import { gearCell, buffCell } from './self-gear.js';
import { renderSelfBag, BAG_TABS } from './self-bag.js';
import { renderStockSheet } from './bag-stock.js';
import { renderCoinLog } from './coin-log-sheet.js';

const vn = n => Math.round(n || 0).toLocaleString('vi-VN');
const pct = n => `${Math.round((n || 0) * 1000) / 10}%`;
const LEFT = ['vu-khi', 'mu', 'giap', 'giay'], RIGHT = ['ngoc-boi', 'nhan', 'phap-bao', null];   // null: ô chừa (chủ dự án 11/11 01:07: mỗi bên 4 ô)
const BUFFS = ['pet', 'comp', 'comp2', 'mount', 'spare'];

export function createSelfPanel(game) {
  const root = el('div', 'panel self-panel sv'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', '✕'), body = el('div', 'self-body'), sheet = el('div', 'sv-sheet');
  const wrapRow = el('div', 'sv-wrap'), rail = el('div', 'sv-rail');
  head.append(el('b', null, 'Nhân Vật'), x);
  sheet.hidden = true;
  wrapRow.append(rail, body);
  root.append(head, wrapRow, sheet);
  document.body.append(root);
  const st = { sel: null, more: false, tab: 'do', sort: 'moi', stock: null, pickSocket: null };
  function close() { root.hidden = true; game.uiOpen = false; st.sel = null; st.stock = null; st.pickSocket = null; }
  x.onclick = close;
  const goOld = it => { close(); game.openOldPanel?.(it); };

  function changed(full = true) {
    if (full) { game.refreshStats(); game.persist(); }
    render();
    if (st.pickSocket) body.querySelector('.sv-bag')?.scrollIntoView({ block: 'start', behavior: 'smooth' });   // "+ Khảm ngọc": chọn viên ở lưới Ngọc bên dưới
  }
  function pick(slot, it) {
    if (!it) {   // ô trống: về mục Trang bị bên dưới để chọn món mặc vào
      st.tab = 'do'; st.sort = 'manh'; st.sel = null; st.stock = null; render();
      game.toast(`Chọn ${game.data.items.slots[slot].toLowerCase()} trong túi bên dưới để mặc vào.`, 2);
      body.querySelector('.sv-bag')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return;
    }
    st.sel = st.sel === it.uid ? null : it.uid; st.stock = null; render();
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
    mid.append(el('i', 'sv-circle'), spriteIcon(game, look.sprite, 0, 96, 'sv-hero', true));
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
      const w = el('div', 'sv-cell ' + side), b = el('button', 'sv-slot spare'); b.disabled = true; b.append(el('span', 'sv-big', '?'), el('span', 'sv-name', 'Sắp mở')); w.append(b); c.append(w);
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
    row('❤', 'Sinh lực', vn(stt.maxHp), 'c-hp'); row('★', 'Bạo kích', pct(stt.crit), 'c-cr');
    row('⚔', 'Công', vn(stt.atk), 'c-atk'); row('✸', 'ST bạo', pct(stt.critMult), 'c-cr');
    row('⛨', 'Phòng ngự', vn(stt.def), 'c-def'); row('⟳', 'Giảm hồi', pct(stt.cdr), 'c-mp');
    row('➤', 'Tốc chạy', pct(stt.speedMul), 'c-spd'); row('✚', 'Hút máu', pct(stt.lifesteal), 'c-hp');
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

  function renderRail() {   // cột chọn mục túi bên trái (mẫu chủ dự án gửi 11/11/2026 00:50)
    rail.replaceChildren(...BAG_TABS.map(([id, han, name]) => {
      const b = el('button', 'sv-rb' + (st.tab === id ? ' on' : ''));
      b.append(el('i', null, han), el('small', null, name));
      b.onclick = () => { st.tab = id; st.sel = null; st.stock = null; st.coinLog = false; if (id !== 'ngoc') st.pickSocket = null; render(); body.querySelector('.sv-bag')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
      return b;
    }));
  }

  function render() {
    const s = game.save, d = game.data, stt = playerStats(s, d);
    const keep = body.scrollTop;
    const card = el('div', 'sv-card'); card.append(top(s, d), hero(s, d), cpBar(), stats(stt, game.player));
    body.replaceChildren(card, renderSelfBag(game, st, changed, render));
    body.scrollTop = keep;
    renderRail();
    let has = false;
    if (st.coinLog) has = renderCoinLog(game, sheet, () => { st.coinLog = false; render(); });
    else if (st.sel != null) has = renderDetail(game, st, sheet, changed, () => { st.sel = null; render(); });
    else if (st.stock) has = renderStockSheet(game, st, sheet, changed, () => { st.stock = null; render(); });
    if (!has) { st.sel = null; st.stock = null; st.coinLog = false; }
    sheet.hidden = !has;
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    for (const p of document.querySelectorAll('.panel, #bag')) if (p !== root && !p.hidden) p.querySelector('[id$="-close"]')?.click();
    game.uiOpen = true; root.hidden = false; st.sel = null; render();
  }
  game.openSelf = open;
  const R = document.getElementById('realm');   // chạm khung tên, cảnh giới
  R?.addEventListener('click', e => { e.stopPropagation(); open(); }, true);
  document.getElementById('power')?.addEventListener('click', e => { e.stopPropagation(); open(); });
}
