// Bảng Quầy Tiên Ngọc (data/topup.json): số dư, thẻ tháng, gói nạp (chưa mở), đổi Tiên Ngọc lấy đồ.
import { tn, starterGift, cardLeft, cardClaimed, claimCard, buyTn, shopOwned } from '../game/topup.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createTopupPanel(game) {
  const T = game.data.topup;
  let note = '';

  function row(title, sub, btn) {
    const r = el('div', 'mk-row'), info = el('div');
    info.append(el('b', null, title), el('small', null, sub));
    r.append(info); if (btn) r.append(btn);
    return r;
  }
  // Lệnh có thể chờ máy chủ (Tiên Ngọc do máy chủ giữ khi đã đăng nhập): khoá nút trong lúc chờ, lỗi thì báo
  function btn(text, fn, off) {
    const b = el('button', 'mini', text); b.disabled = !!off;
    b.onclick = async () => { b.disabled = true; try { await fn(); } catch { note = T.busy; game.sfx('hurt'); } render(); };
    return b;
  }

  function render() {
    const box = $('topup-list'); box.innerHTML = '';
    $('topup-title').textContent = T.title;
    $('topup-sub').textContent = note || `${tn(game)} ${T.name}`;
    const c = T.card, left = cardLeft(game);
    box.append(el('b', 'tp-head', c.name));
    const cdesc = c.desc.replace('{now}', c.now).replace('{tn}', c.daily.tn).replace('{coins}', c.daily.give.coins).replace('{days}', c.days);
    if (left) box.append(row(c.left.replace('{d}', left), cdesc, cardClaimed(game) ? el('small', null, c.claimed) : btn(c.claim, async () => { const got = await claimCard(game); if (got) { note = T.got.replace('{got}', got.join(', ')); game.sfx('pickup'); } })));
    else box.append(row(`${c.vnd.toLocaleString('vi-VN')}đ`, cdesc, btn(T.soon, () => {}, !T.open)));
    box.append(el('b', 'tp-head', T.packs_head));
    for (const p of T.packs) box.append(row(`${p.tn}${p.bonus ? ' + ' + p.bonus : ''} ${T.name}`, `${p.vnd.toLocaleString('vi-VN')}đ`, btn(T.soon, () => {}, !T.open)));
    if (!T.open) box.append(el('small', 'tp-note', T.closed));
    box.append(el('b', 'tp-head', T.shop_head));
    for (const x of T.shop) {
      const have = shopOwned(game, x);
      box.append(row(x.label, `${x.tn} ${T.name}`, have ? el('small', null, T.owned) : btn(T.buy, async () => {
        const got = await buyTn(game, x.id);
        note = got ? T.got.replace('{got}', got.join(', ')) : T.poor;
        game.sfx(got ? 'pickup' : 'hurt');
      }, tn(game) < x.tn)));
    }
  }

  function open() {
    game.uiOpen = true; $('topup').hidden = false;
    note = '';
    render();
    starterGift(game).then(n => { if (n) { note = T.starter_text.replace('{n}', n); render(); } }).catch(() => {});
  }
  function close() { game.uiOpen = false; $('topup').hidden = true; }
  $('topup-close').onclick = close;
  game.openTopup = open;
  return { open, close };
}
