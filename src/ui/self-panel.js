// Bảng Nhân vật (chủ dự án 11/11/2026 00:39, mẫu My Heroes Dungeon Raid; trước đây là danh sách chữ nhóm D 02/11/2026).
// Trên: chân dung, tên, cảnh giới, lực chiến. Giữa: nhân vật và linh thú đang mang, dưới chân là lực chiến, sinh lực, phòng ngự;
// hai bên là ô trang bị (src/ui/self-gear.js) cùng linh thú, thú cưỡi, thời trang. Dưới: Tổng Quan Chỉ Số (chạm Xem thêm ra hết),
// hàng nút. Chạm món đang mặc: tấm rèn luyện trượt lên ngay trong bảng (dùng chung src/ui/bag-detail.js với Túi đồ): cường hoá,
// tẩy luyện, khảm, gỡ ngọc, tháo, đổi hệ. Chạm ô trống: mở Túi đồ lọc đúng chỗ đó. Kiểu ở style-self.css.
import { heroLook } from '../render/draw-hero.js';
import { spriteIcon } from './sprite-icon.js';
import { playerStats, realmLabel, rootOf, qiNeed } from '../game/stats.js';
import { power, titleOf } from '../game/achieve.js';
import { el, renderDetail } from './bag-detail.js';
import { gearCell, extraCell } from './self-gear.js';

const vn = n => Math.round(n || 0).toLocaleString('vi-VN');
const pct = n => `${Math.round((n || 0) * 1000) / 10}%`;
const LEFT = ['vu-khi', 'mu', 'giap', 'giay'], RIGHT = ['ngoc-boi', 'nhan', 'phap-bao'];

export function createSelfPanel(game) {
  const root = el('div', 'panel self-panel sv'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', '✕'), body = el('div', 'self-body'), sheet = el('div', 'sv-sheet');
  head.append(el('b', null, 'Nhân Vật'), x);
  sheet.hidden = true;
  root.append(head, body, sheet);
  document.body.append(root);
  const st = { sel: null, more: false };
  function close() { root.hidden = true; game.uiOpen = false; st.sel = null; }
  x.onclick = close;
  const goOld = it => { close(); game.openOldPanel?.(it); };

  function changed(full = true) {
    if (st.pickSocket) { const p = st.pickSocket; st.pickSocket = null; close(); game.openBagSocket?.(p); return; }   // "+ Khảm ngọc": chọn viên trong Túi
    if (full) { game.refreshStats(); game.persist(); }
    render();
  }
  function pick(slot, it) {
    if (!it) { close(); game.openBagSlot?.(slot); return; }
    st.sel = st.sel === it.uid ? null : it.uid; render();
  }
  const openExtra = k => goOld(k === 'outfit' ? { btn: 'btn-achv', tabs: 'achv-tabs', tab: 'thoi-trang' } : { btn: 'btn-pets', tabs: 'pets-tabs', tab: k === 'pet' ? 'linh-thu' : 'thu-cuoi' });

  function top(s, d) {
    const t = el('div', 'sv-top'), ava = el('div', 'sv-ava'), look = heroLook(game), tt = titleOf(game);
    ava.append(spriteIcon(game, look.sprite, 0, 40, 'sv-ava-ico', true));
    const info = el('div', 'sv-info'), nm = el('button', 'sv-nm', game.cloud?.name || 'Đạo hữu');
    nm.onclick = () => { close(); game.openRename?.(); };
    info.append(nm, el('div', 'sv-realm', realmLabel(s, d.realms)));
    if (tt) { const e = el('div', 'sv-title', tt.name); if (tt.color) e.style.color = tt.color; info.append(e); }
    const pw = el('div', 'sv-pw'); pw.append(el('small', null, 'Lực chiến'), el('b', null, vn(power(game))));
    t.append(ava, info, pw);
    return t;
  }

  function stage(s, d, stt) {
    const g = el('div', 'sv-stage'), sky = el('div', 'sv-sky'), look = heroLook(game);
    sky.append(el('i', 'sv-moon'), el('i', 'sv-ring'));
    if (s.element) { const e = d.elements[s.element], seal = el('span', 'sv-seal', { kim: '金', moc: '木', thuy: '水', hoa: '火', tho: '土' }[s.element] || '?'); seal.style.setProperty('--e', e.color); seal.title = `Linh căn ${e.name} · ${rootOf(s, d).name}`; g.append(seal); }
    const hero = spriteIcon(game, look.sprite, 0, 120, 'sv-hero', true);
    g.append(sky, hero);
    if (s.pet && d.art.sprites['pet.' + s.pet]) g.append(spriteIcon(game, 'pet.' + s.pet, 0, 46, 'sv-pet', true));
    const foot = el('div', 'sv-foot');
    foot.append(el('div', 'sv-cp', '⚔ ' + vn(power(game))));
    const need = qiNeed(s, d.realms), qi = el('div', 'sv-qi'), bar = el('i');
    bar.style.width = Math.min(100, (s.qi || 0) / Math.max(1, need) * 100) + '%';
    qi.append(bar, el('span', null, `Linh khí ${vn(s.qi)}/${vn(need)}`));
    foot.append(qi);
    g.append(foot);
    return g;
  }

  function pills(stt) {   // ba ô to dưới nhân vật: sinh lực, công, phòng (mẫu chủ dự án gửi 11/11/2026 00:47)
    const sub = el('div', 'sv-sub'), pill = (cls, ic, v) => { const e = el('div', 'sv-pill ' + cls); e.append(el('i', null, ic), el('b', null, v)); sub.append(e); };
    pill('c-hp', '❤', vn(stt.maxHp)); pill('c-atk', '⚔', vn(stt.atk)); pill('c-def', '🛡', vn(stt.def));
    return sub;
  }

  function column(side, slots, extras) {
    const c = el('div', 'sv-col ' + side);
    for (const k of slots) c.append(gearCell(game, k, side, pick));
    for (const k of extras) c.append(extraCell(game, k, side, openExtra));
    return c;
  }

  function stats(stt, p) {
    const box = el('div', 'sv-stats'), grid = el('div', 'sv-grid');
    box.append(el('div', 'sv-h', 'Tổng Quan Chỉ Số'));
    const row = (k, v, cls) => { const r = el('div', 'sv-row' + (cls ? ' ' + cls : '')); r.append(el('span', null, k), el('b', null, v)); grid.append(r); };
    row('Công', vn(stt.atk), 'c-atk'); row('Tốc chạy', pct(stt.speedMul));
    row('Sinh lực', vn(stt.maxHp), 'c-hp'); row('Bạo kích', pct(stt.crit));
    row('Phòng ngự', vn(stt.def), 'c-def'); row('Sát thương bạo', pct(stt.critMult));
    if (st.more) {
      row('Linh lực', `${vn(p?.mp)}/${vn(p?.mpMax)}`); row('Giảm hồi chiêu', pct(stt.cdr));
      row('Tốc tu', `×${stt.qiMul.toFixed(2)}`); row('Hút máu', pct(stt.lifesteal));
      row('Phản đòn', pct(stt.thorns)); row('Hồi máu', `${vn(stt.regen)}/giây`);
      row('Giảm sát thương', pct(stt.dr)); row('Hồi linh lực', `${Math.round((game.data.config.mana.regen_pct + stt.mpRegen) * 1000) / 10}%/giây`);
    }
    const more = el('button', 'sv-more', st.more ? 'Thu gọn ▲' : 'Xem thêm ▼');
    more.onclick = () => { st.more = !st.more; render(); };
    box.append(grid, more);
    return box;
  }

  function tabs() {
    const t = el('div', 'sv-tabs'), b = (txt, fn) => { const e = el('button', 'sv-tab', txt); e.onclick = fn; t.append(e); };
    b('Túi đồ', () => { close(); game.openBag?.('do'); });
    b('Ngọc khảm', () => { close(); game.openBag?.('ngoc'); });
    b('Danh hiệu', () => goOld({ btn: 'btn-achv', tabs: 'achv-tabs', tab: 'danh-hieu' }));
    b('Đổi tên', () => { close(); game.openRename?.(); });
    return t;
  }

  function render() {
    const s = game.save, d = game.data, stt = playerStats(s, d);
    const mid = el('div', 'sv-mid');
    mid.append(column('l', LEFT, ['outfit']), stage(s, d, stt), column('r', RIGHT, ['pet', 'mount']));
    body.replaceChildren(top(s, d), mid, pills(stt), stats(stt, game.player), tabs());
    const has = st.sel != null && renderDetail(game, st, sheet, changed, () => { st.sel = null; render(); });
    if (!has) st.sel = null;
    sheet.hidden = !has;
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
