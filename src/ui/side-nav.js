// Bảng dọc bên trái (chủ dự án 02/11/2026 10:50: "Menu đừng phân nhóm nữa, xếp thành 1 bảng dọc, ấn vào hiển thị nội dung bên
// cạnh. Túi đồ cũng vậy… mỗi mục 1 tính năng"). Nút Túi đồ, Menu, Động phủ mở cột mục bên trái (data/menu.json → nav); chạm
// một mục thì bảng của mục đó mở ngay bên phải, khoá đúng phần đó (thanh tab của bảng cũ đã ẩn, không nhảy sang bảng khác).
// Mục không có bảng riêng (Tự động, Âm thanh, Ngôn ngữ, Đăng xuất) hiện trong khung #nav-pane. Đóng bảng bên phải là đóng hết.
import { itemLock, busyWhy, talkMenu } from '../game/menu-acts.js';
import { homeAct } from '../game/home-acts.js';
import { renderPilotOpts } from './pilot-tab.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const shown = () => [...document.querySelectorAll('.panel, #bag')].filter(p => !p.hidden);

export function createSideNav(game) {
  const N = game.data.menu?.nav;
  if (!N) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./side-nav.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);

  const nav = el('div', 'side-nav'); nav.id = 'side-nav'; nav.hidden = true;
  const navTitle = el('b', 'sn-title'), navList = el('div', 'sn-list');
  nav.append(navTitle, navList);
  const pane = el('div', 'panel nav-pane'); pane.id = 'nav-pane'; pane.hidden = true;
  const head = el('div', 'bag-head'), paneTitle = el('b'), paneSub = el('span', 'panel-sub'), x = el('button', 'mini', '✕'), body = el('div', 'nav-body');
  x.id = 'nav-pane-close';
  head.append(paneTitle, paneSub, x);
  pane.append(head, body);
  document.body.append(pane, nav);
  for (const e of [nav, pane]) e.addEventListener('pointerdown', ev => ev.stopPropagation());

  let which = null, cur = null, switching = 0, sure = null;

  function closePanels() {
    for (const p of shown()) {
      if (p === pane) { pane.hidden = true; continue; }
      const b = p.querySelector('[id$="-close"]') || p.querySelector('.bag-head > button:last-child');
      if (b) b.click(); else p.hidden = true;
    }
    game.uiOpen = false;
  }
  function closeNav() { nav.hidden = true; document.body.classList.remove('nav-on'); which = null; cur = null; }
  function closeAll() { closePanels(); closeNav(); }
  x.onclick = closeAll;

  // Khung #nav-pane cho mục không có bảng riêng
  const card = (color, title, lines, btn) => {
    const c = el('div', 'skill-card'); c.style.borderLeftColor = color;
    c.append(el('b', null, title), ...lines.map(l => el('small', null, l)));
    if (btn) { const r = el('div', 'card-acts'); r.append(btn); c.append(r); }
    return c;
  };
  const mini = (text, fn, off) => { const b = el('button', 'mini', text); b.disabled = !!off; b.onclick = () => { fn(); paneRender(); }; return b; };
  let paneItem = null;
  function paneRender() {
    const it = paneItem, D = N[which] || {};
    body.replaceChildren(); paneSub.textContent = '';
    paneTitle.textContent = it ? it.label : D.title;
    if (!it) { body.append(el('p', 'muted', D.hint || '')); return; }
    if (it.pilot) renderPilotOpts(game, body, { card, mini, sub: t => { paneSub.textContent = t; } });
    else if (it.sound) {
      const m = document.getElementById('btn-mute'), off = m?.classList.contains('off');
      body.append(card(off ? '#c8c4d0' : '#5fd07a', it.label, [off ? it.off : it.on], mini(off ? it.btn_on : it.btn_off, () => m?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))));
    } else if (it.reload) {
      body.append(card('#ff7a7a', it.label, [it.text], mini(sure === it.id ? it.sure : it.btn, () => {
        if (sure !== it.id) { sure = it.id; return; }
        game.persist(); Promise.resolve(game.cloud?.flush?.()).catch(() => {}).finally(() => setTimeout(() => location.reload(), 300));
      })));
    } else body.append(card('#b8a0e0', it.label, [it.text || '']));
  }
  function openPane(it) { paneItem = it; sure = null; pane.hidden = false; game.uiOpen = true; paneRender(); }

  let painted = '';
  function paintNav(soft) {
    if (!which) return;
    const key = which + cur + N[which].items.map(it => (itemLock(game, it) ? 1 : 0) + (it.badge && !document.getElementById(it.badge)?.hidden ? 2 : 0)).join('');
    if (soft && key === painted) return;   // chỉ vẽ lại khi chấm đỏ / khoá đổi (vẽ lại giữa lúc chạm thì mất cú chạm)
    painted = key;
    navList.replaceChildren();
    for (const it of N[which].items) {
      const lock = itemLock(game, it), b = el('button', 'sn-item' + (lock ? ' locked' : '') + (cur === it.id ? ' on' : ''), it.label);
      const dot = it.badge && document.getElementById(it.badge);
      if (dot && !dot.hidden) b.append(el('i', 'sn-dot'));
      b.onclick = () => pick(it);
      navList.append(b);
    }
  }

  function pick(it) {
    const lock = itemLock(game, it);
    if (lock) { game.toast(lock, 2); return; }
    if (it.home || it.talk) {   // việc trong động phủ, nói chuyện thẳng với NPC: đóng bảng để thấy hội thoại
      const why = it.talk && busyWhy(game);
      if (why) { game.toast(game.data.menu.dungeon.busy.replace('{why}', why), 2); return; }
      closeAll();
      if (it.home) { const w = homeAct(game, it.home); if (w) game.toast(w, 2); } else talkMenu(game, it.talk);
      return;
    }
    cur = it.id; paintNav();
    switching = Date.now();
    closePanels();
    if (it.bag) game.openBag?.(it.bag);
    else if (it.cave) game.openCave?.(it.cave);
    else if (it.btn) game.openOldPanel?.(it);
    else if (it.open) game['open' + it.open[0].toUpperCase() + it.open.slice(1)]?.();
    else openPane(it);
  }

  function openNav(id) {
    if (!game.save || game.dialog.open || game.trip || !N[id]) return;
    if (which === id && !nav.hidden) { closeAll(); return; }
    closeAll();
    which = id; navTitle.textContent = N[id].title;
    nav.hidden = false; document.body.classList.add('nav-on');
    const first = N[id].first && N[id].items.find(i => !itemLock(game, i));
    if (first) pick(first); else { cur = null; paintNav(); openPane(null); }
  }

  // Bảng bên phải tự đóng (hoặc người chơi bấm ✕ của nó): cột bên trái đóng theo
  setInterval(() => {
    if (nav.hidden || Date.now() - switching < 500) return;
    if (!shown().length || game.dialog.open) closeNav(); else paintNav(true);
  }, 300);

  game.openNav = openNav;
  game.closeAll = closeAll;
}
