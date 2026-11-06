// Hòm thư (data/inbox.json): nút ✉ ngay sau nút Menu, số đỏ là tin chưa đọc. Bảng chia mục (Tất cả, Chợ thư, Truyền âm,
// Tông môn, Thế giới, Hệ thống); chạm tin thì đánh dấu đã đọc và mở đúng chỗ (truyền âm với người đó, bảng Tông môn,
// kênh Thế giới, chợ, bảng báo lỗi / đề xuất). Kho tin ở src/game/inbox.js, nguồn tin ở src/game/inbox-feed.js.
// Quà chờ nhận (chủ dự án 06/11/2026: mọi quà qua thư, bấm Nhận mới vào kho): thư máy chủ chưa nhận (src/game/mail.js) đứng
// đầu mục Tất cả và Chợ, thư; mỗi thư một nút Nhận, thêm nút Nhận hết. Số đỏ trên nút = tin chưa đọc + thư quà chưa nhận.
// Bảng dựng bằng code (không thêm vào index.html), chữ người chơi chỉ gán textContent.
import { inboxState, unreadCount, markRead, readAll } from '../game/inbox.js';
import { claimMail, refreshMail, mailHead, mailLines, canMail } from '../game/mail.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const press = id => document.getElementById(id)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

export function createInbox(game) {
  const I = game.data.inbox, T = I.text, menu = document.getElementById('btn-menu');
  if (!I || !menu) return;
  const btn = el('button', 'ib-btn', I.btn), badge = el('i', 'ib-badge');
  btn.id = 'btn-inbox'; btn.title = I.label; btn.setAttribute('aria-label', I.label);
  btn.append(badge);
  menu.after(btn);

  const root = el('div', 'panel ib-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), all = el('button', 'mini', T.read_all), x = el('button', 'mini', T.close);
  head.append(el('b', null, T.title), all, x);
  const tabs = el('div', 'ib-tabs'), list = el('div', 'ib-list');
  root.append(head, tabs, list);
  document.body.append(root);
  let tab = 'all';

  function ago(t) {
    const m = Math.floor((Date.now() - t) / 60000);
    return m < 1 ? T.ago_now : m < 60 ? fill(T.ago_min, { n: m }) : m < 1440 ? fill(T.ago_hour, { n: Math.floor(m / 60) }) : fill(T.ago_day, { n: Math.floor(m / 1440) });
  }

  function go(it) {
    const a = it.arg || {};
    close();
    if (it.go === 'whisper' && a.k) game.openWhisper?.(a.k, a.ten);
    else if (it.go === 'guild') press('btn-guild');
    else if (it.go === 'world') game.openSocial?.('world');
    else if (it.go === 'market') game.openMarket?.();
    else if (it.go === 'feedback') document.getElementById(a.loai === 'de_xuat' ? 'btn-fb-de_xuat' : 'btn-fb-loi')?.click();
  }

  let busy = false, note = '';
  async function take(ids) {
    if (busy) return;
    busy = true; note = T.taking || '…'; render();
    try {
      const got = await claimMail(game, ids);
      note = got.length ? fill(T.got || 'Đã nhận: {list}', { list: got.join(' · ') }) : '';
      if (got.length) { game.sfx?.('levelup'); game.toast(got.join(' · '), 3); }
      const s = game.save;
      if ((game.mail || []).some(m => m.noi_dung?.item) && s && s.bag.length >= game.data.items.bag_size) note = T.bag_full || note;
    } catch { note = T.take_err || ''; }
    busy = false; paint(); render();
  }

  function gifts() {
    const mail = game.mail || [], box = el('div', 'ib-gifts');
    if (!mail.length && !note) return null;
    const top = el('div', 'ib-top');
    top.append(el('b', 'ib-title', fill(T.gifts || 'Quà chờ nhận ({n})', { n: mail.length })));
    if (mail.length > 1) { const b = el('button', 'mini primary', T.take_all || 'Nhận hết'); b.disabled = busy; b.onclick = () => take(); top.append(b); }
    box.append(top);
    if (note) box.append(el('small', 'muted', note));
    for (const m of mail) {
      const row = el('div', 'ib-row new'), head = el('div', 'ib-top'), b = el('button', 'mini primary', T.take || 'Nhận');
      b.disabled = busy; b.onclick = () => take([m.id]);
      head.append(el('span', 'ib-icon', '🎁'), el('b', 'ib-title', mailHead(game, m)), b);
      row.append(head);
      const lines = mailLines(game, m);
      if (lines.length) row.append(el('small', 'ib-text', lines.join(' · ')));
      box.append(row);
    }
    return box;
  }

  function render() {
    tabs.textContent = '';
    const items = inboxState(game).items, inTab = it => tab === 'all' || it.kind === tab || (tab === 'cho' && it.kind === 'thu');
    for (const [id, name] of I.tabs) {
      const n = items.filter(it => !it.read && (id === 'all' || it.kind === id || (id === 'cho' && it.kind === 'thu'))).length;
      const b = el('button', `mini ib-tab${id === tab ? ' on' : ''}`, n ? `${name} ${n}` : name);
      b.onclick = () => { tab = id; render(); };
      tabs.append(b);
    }
    list.textContent = '';
    if (!game.cloud) list.append(el('p', 'muted', T.login));
    const g = (tab === 'all' || tab === 'cho') && gifts();
    if (g) list.append(g);
    const shown = items.filter(inTab);
    if (!shown.length) { if (!g) list.append(el('p', 'muted', T.empty)); return; }
    for (const it of shown) {
      const K = I.kinds[it.kind] || {}, row = el('button', `ib-row${it.read ? '' : ' new'}`);
      const top = el('div', 'ib-top');
      top.append(el('span', 'ib-icon', K.icon || '•'), el('b', 'ib-title', it.title), el('small', 'ib-ago', ago(it.t)));
      row.append(top);
      if (it.text) row.append(el('small', 'ib-text', it.text));
      row.onclick = () => { markRead(game, it.key); paint(); if (it.go) go(it); else render(); };
      list.append(row);
    }
  }

  function paint() {
    const n = unreadCount(game) + (game.mail?.length || 0);
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.hidden = !n;
  }

  function close() { root.hidden = true; game.uiOpen = false; }
  x.onclick = close;
  all.onclick = () => { readAll(game); paint(); render(); };
  root.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (!root.hidden) { close(); return; }
    if (!game.save || game.dialog.open) return;
    root.hidden = false; game.uiOpen = true; note = ''; render();
    if (canMail(game)) refreshMail(game).then(() => { paint(); if (!root.hidden) render(); }).catch(() => {});
  });
  paint();
  let sig = '';   // vẽ lại khi có tin mới hay đổi đã đọc (không vẽ lại vô cớ kẻo nhảy chỗ đang cuộn)
  every(() => {
    paint();
    const s = inboxState(game).items, now = `${s.length}|${s[0]?.key}|${s[0]?.t}|${unreadCount(game)}|${(game.mail || []).map(m => m.id).join(',')}`;
    if (!root.hidden && now !== sig) render();
    sig = now;
  }, 2000);
}
