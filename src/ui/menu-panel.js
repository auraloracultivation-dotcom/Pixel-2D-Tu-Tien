// Bảng Bí cảnh (nút Bí cảnh): danh sách bí cảnh, vào thẳng (src/game/menu-acts.js). Nút Menu giờ mở cột mục bên trái
// (src/ui/side-nav.js, chủ dự án 02/11/2026). game.openOldPanel: bấm hộ nút bảng cũ (ẩn trong #hud-menu) rồi chọn đúng phần.
import { busyWhy, dungeonList, enterDungeon } from '../game/menu-acts.js';

const $ = id => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createMenuPanel(game) {
  const D = game.data.menu.dungeon;
  const root = el('div', 'panel menu-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), title = el('b', null, D.title), sub = el('span', 'panel-sub', ''), x = el('button', 'mini', '✕');
  head.append(title, sub, x);
  const body = el('div', 'menu-body');
  root.append(head, body);
  document.body.append(root);

  function close() { root.hidden = true; game.uiOpen = false; }
  const toast = msg => game.toast(msg, 2);

  // Mở bảng cũ qua nút cũ, rồi bấm tab nếu có
  function openOld(it) {
    close();
    $(it.btn)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    if (it.click) $(it.btn)?.click();   // nút nghe sự kiện click (Zalo, báo lỗi, thông báo)
    if (it.tab) setTimeout(() => document.querySelector(`#${it.tabs} [data-tab="${it.tab}"]`)?.click(), 0);
  }

  function renderDungeons() {
    title.textContent = D.title; sub.textContent = '';
    for (const d of dungeonList(game)) {
      const row = el('div', 'menu-dun' + (d.open ? '' : ' locked')), info = el('div', 'md-info');
      info.append(el('b', null, d.name), el('small', null, D.from.replace('{name}', d.from)));
      const tag = el('small', 'md-tag', d.open ? (d.done ? D.done + ' · ' : '') + (d.hint?.text || '') : d.closed ? D.closed : D.locked);
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
    renderDungeons();
    body.scrollTop = 0;
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    for (const p of document.querySelectorAll('.panel, #bag')) if (p !== root && !p.hidden) p.querySelector('[id$="-close"]')?.click();
    game.uiOpen = true; root.hidden = false; render();
  }
  x.onclick = close;
  game.openDungeons = open;   // nút Bí cảnh trên màn hình (src/ui/hud-order.js)
  game.openOldPanel = openOld;
  $('btn-menu').addEventListener('pointerdown', e => { e.stopPropagation(); game.openNav?.('menu'); });
  return { open, close };
}
