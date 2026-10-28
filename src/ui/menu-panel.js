// Bảng Menu (nút Menu, chủ dự án xin 28/10/2026): mọi chức năng và phó bản chia nhóm, mỗi ô có hình lấy từ hình trong game.
// Ô và cách mở ở data/menu.json; điều kiện, nói chuyện thẳng với NPC, vào bí cảnh ở src/game/menu-acts.js.
// Bảng cũ vẫn mở bằng nút cũ (ẩn trong #hud-menu) để khỏi sửa từng bảng; ô có tab thì bấm luôn tab đó.
import { spriteIcon } from './sprite-icon.js';
import { itemLock, busyWhy, talkMenu, dungeonList, enterDungeon, enterDemon } from '../game/menu-acts.js';

const $ = id => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createMenuPanel(game) {
  const M = game.data.menu, D = M.dungeon;
  const root = el('div', 'panel menu-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), title = el('b', null, M.title), sub = el('span', 'panel-sub', M.sub), x = el('button', 'mini', '✕');
  head.append(title, sub, x);
  const body = el('div', 'menu-body');
  root.append(head, body);
  document.body.append(root);
  let view = 'main';

  function close() { root.hidden = true; game.uiOpen = false; }
  const toast = msg => game.toast(msg, 2);

  // Mở bảng cũ qua nút cũ, rồi bấm tab nếu có
  function openOld(it) {
    close();
    $(it.btn)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    if (it.tab) setTimeout(() => document.querySelector(`#${it.tabs} [data-tab="${it.tab}"]`)?.click(), 0);
  }

  function act(it) {
    const lock = itemLock(game, it);
    if (lock) { toast(lock); return; }
    if (it.dungeons) { view = 'dun'; render(); return; }
    if (it.btn) { openOld(it); return; }
    if (it.cave) { close(); game.openCave?.(it.cave); return; }
    if (it.open === 'world') { close(); game.worldMap?.open(); return; }
    if (it.open) { close(); game['open' + it.open[0].toUpperCase() + it.open.slice(1)]?.(); return; }
    const why = busyWhy(game);
    if (why) { toast(D.busy.replace('{why}', why)); return; }
    close();
    if (it.talk) talkMenu(game, it.talk);
    else if (it.demon) enterDemon(game).then(w => w && toast(D.busy.replace('{why}', w)));
  }

  function renderMain() {
    title.textContent = M.title; sub.textContent = M.sub;
    for (const g of M.groups) {
      body.append(el('div', 'menu-group', g.name));
      const grid = el('div', 'menu-grid');
      for (const it of g.items) {
        const lock = itemLock(game, it), b = el('button', 'menu-tile' + (lock ? ' locked' : ''));
        b.append(spriteIcon(game, it.icon, it.frame, 34, 'mt-ico', it.icon.startsWith('comp.')), el('span', null, it.label));   // đồng hành chibi: vừa theo chiều cao
        if (it.badge && $(it.badge) && !$(it.badge).hidden) b.append(el('i', 'menu-dot'));
        if (it.btn && $(it.btn)?.classList.contains('glow-hint')) b.classList.add('glow-hint');
        b.onclick = () => act(it);
        grid.append(b);
      }
      body.append(grid);
    }
  }

  function renderDungeons() {
    title.textContent = D.title; sub.textContent = '';
    const back = el('button', 'mini menu-back', D.back);
    back.onclick = () => { view = 'main'; render(); };
    body.append(back);
    for (const d of dungeonList(game)) {
      const row = el('div', 'menu-dun' + (d.open ? '' : ' locked')), info = el('div', 'md-info');
      info.append(el('b', null, d.name), el('small', null, D.from.replace('{name}', d.from)));
      const tag = el('small', 'md-tag', d.open ? (d.done ? D.done + ' · ' : '') + (d.hint?.text || '') : D.locked);
      if (d.hint) tag.style.color = d.hint.color;
      info.append(tag);
      const go = el('button', 'mini primary', D.go);
      go.disabled = !d.open;
      go.onclick = () => {
        const why = busyWhy(game);
        if (why) { toast(D.busy.replace('{why}', why)); return; }
        close();
        enterDungeon(game, d).then(w => w && toast(D.busy.replace('{why}', w)));
      };
      row.append(info, go);
      body.append(row);
    }
  }

  function render() {
    body.innerHTML = '';
    if (view === 'dun') renderDungeons(); else renderMain();
    body.scrollTop = 0;
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    for (const p of document.querySelectorAll('.panel, #bag')) if (p !== root && !p.hidden) p.querySelector('[id$="-close"]')?.click();
    view = 'main'; game.uiOpen = true; root.hidden = false; render();
  }
  x.onclick = close;
  $('btn-menu').addEventListener('pointerdown', e => { e.stopPropagation(); if (root.hidden) open(); else close(); });
  return { open, close };
}
