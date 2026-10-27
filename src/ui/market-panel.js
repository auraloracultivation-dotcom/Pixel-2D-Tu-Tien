// Bảng Chợ Phiên (data/market.json): tab Mua (hàng người khác đang rao), Bán (đồ trong túi, nguyên liệu), Của tôi (hàng mình đang rao).
// Mọi việc mua bán đi qua game/market.js.
import { canTrade, errText, goodsName, sellItem, sellMat, buy, cancel, claimMail } from '../game/market.js';
import { coins } from '../game/shop.js';
import { isEquipped } from '../game/items.js';
import { matInfo } from '../game/cave.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createMarketPanel(game) {
  const M = game.data.market;
  let tab = 'buy', rows = [], note = '', pick = null, busy = false;

  function sub() {
    $('market-sub').textContent = note || `${game.data.shop.name} ${coins(game.save).toLocaleString('vi-VN')} · ${M.sub.replace('{tax}', Math.round(M.tax * 100)).replace('{h}', M.hours)}`;
  }

  function goodsRow(g, price, btn) {
    const d = el('div', 'mk-row'), info = el('div');
    const name = el('b', null, g.name); if (g.color) name.style.color = g.color;
    info.append(name, el('small', null, g.sub));
    d.append(info);
    if (price != null) d.append(el('span', 'mk-price', price.toLocaleString('vi-VN')));
    if (btn) d.append(btn);
    return d;
  }

  function button(text, fn, disabled) {
    const b = el('button', 'mini', text); b.disabled = !!disabled || busy;
    b.onclick = () => run(fn);
    return b;
  }

  async function run(fn) {
    if (busy) return;
    busy = true; note = M.loading; render();
    try { const got = await fn(); note = Array.isArray(got) && got.length ? got.join(' · ') : ''; game.sfx?.('coin'); }
    catch (e) { note = errText(game, e); }
    busy = false; await load();
  }

  async function load() {
    if (!canTrade(game)) { render(); return; }
    if (tab === 'sell') { render(); return; }
    try { const { listMarket } = await import('../net/market.js'); rows = await listMarket(); }
    catch (e) { note = errText(game, e); rows = []; }
    render();
  }

  function renderSell(box) {
    const s = game.save, list = [];
    for (const it of s.bag.filter(i => !isEquipped(s, i.uid) && !game.data.items.bases[i.base]?.dv)) list.push({ key: `i${it.uid}`, loai: 'mon', it, g: goodsName(game, 'mon', it), price: M.price.item[it.rarity] });
    for (const [id, n] of Object.entries(s.mats)) if (n > 0 && matInfo(game.data, id)) list.push({ key: `m${id}`, loai: 'nl', id, n, g: { name: `${matInfo(game.data, id).name} ×${n}`, sub: 'Nguyên liệu' }, price: M.price.mat });
    if (!list.length) box.append(el('div', 'empty', M.empty_sell));
    for (const x of list) {
      const r = goodsRow(x.g, null, null);
      if (pick?.key === x.key) r.classList.add('sel');
      r.onclick = () => { pick = x; $('market-price').value = x.price; $('market-n').value = x.loai === 'nl' ? 1 : ''; render(); };
      box.append(r);
    }
  }

  function render() {
    if ($('market').hidden) return;
    for (const b of document.querySelectorAll('#market-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    sub();
    const box = $('market-list'); box.innerHTML = '';
    $('market-form').hidden = tab !== 'sell' || !pick;
    if (!canTrade(game)) { box.append(el('div', 'empty', M.offline)); return; }
    if (tab === 'sell') { renderSell(box); updateForm(); return; }
    const list = rows.filter(r => (tab === 'mine') === r.la_toi);
    if (!list.length) box.append(el('div', 'empty', tab === 'mine' ? M.empty_mine : M.empty_buy));
    for (const r of list) {
      const g = goodsName(game, r.loai, r.mon);
      g.sub = `${g.sub} · ${r.ten}`;
      const btn = tab === 'mine' ? button(M.cancel_btn, () => cancel(game, r.id)) : button(M.buy_btn, () => buy(game, r), coins(game.save) < r.gia);
      box.append(goodsRow(g, r.gia, btn));
    }
  }

  function updateForm() {
    if (!pick) return;
    $('market-n').hidden = pick.loai !== 'nl';
    const v = Math.floor(+$('market-price').value || 0);
    $('market-get').textContent = M.you_get.replace('{v}', (v - Math.ceil(v * M.tax)).toLocaleString('vi-VN'));
  }

  function open() {
    if (!game.save || game.dialog.open) return;
    game.uiOpen = true; $('market').hidden = false; note = ''; pick = null;
    render();
    if (canTrade(game)) run(() => claimMail(game));
  }
  function close() { game.uiOpen = false; $('market').hidden = true; }

  $('market-title').textContent = M.title;
  $('market-price').placeholder = M.price_ph;
  $('market-n').placeholder = M.n_ph;
  $('market-send').textContent = M.list_btn;
  $('market-close').onclick = close;
  $('market-price').oninput = updateForm;
  for (const b of document.querySelectorAll('#market-tabs [data-tab]')) {
    b.textContent = M.tabs[b.dataset.tab];
    b.onclick = () => { tab = b.dataset.tab; pick = null; note = ''; load(); };
  }
  $('market-form').onsubmit = ev => {
    ev.preventDefault();
    const price = Math.floor(+$('market-price').value || 0), x = pick;
    if (!x || price < 1) return;
    pick = null;
    if (x.loai === 'mon') run(() => sellItem(game, x.it.uid, price));
    else run(() => sellMat(game, x.id, Math.max(1, Math.min(x.n, Math.floor(+$('market-n').value || 1))), price));
  };
  game.openMarket = open;
  return { open, close };
}
