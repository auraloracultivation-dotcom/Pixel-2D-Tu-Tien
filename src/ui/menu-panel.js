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

  function close() { root.hidden = true; game.uiOpen = false; focus = null; }
  const toast = msg => game.toast(msg, 2);

  // Mở bảng cũ qua nút cũ, rồi bấm tab nếu có
  function openOld(it) {
    close();
    $(it.btn)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    if (it.click) $(it.btn)?.click();   // nút nghe sự kiện click (Zalo, báo lỗi, thông báo)
    if (it.tab) setTimeout(() => document.querySelector(`#${it.tabs} [data-tab="${it.tab}"]`)?.click(), 0);
  }

  // focus: { mob, ids } khi mở từ nút Đi làm của nhiệm vụ hạ quái chỉ có trong bí cảnh (src/game/dailyjob.js): bí cảnh có loài đó
  // lên đầu, viền vàng, ghi "Nhiệm vụ: … ở đây" (chủ dự án 11/11/2026 20:33: bấm nhiệm vụ tới bảng Bí cảnh không biết chọn cái nào)
  let focus = null;
  function renderDungeons() {
    title.textContent = D.title; sub.textContent = '';
    let list = dungeonList(game);
    if (focus) list = list.filter(d => focus.ids.includes(d.id)).concat(list.filter(d => !focus.ids.includes(d.id)));
    for (const d of list) {
      const goal = focus?.ids.includes(d.id);
      const row = el('div', 'menu-dun' + (d.open ? '' : ' locked') + (goal ? ' md-nv' : '')), info = el('div', 'md-info');
      info.append(el('b', null, d.name + (game.data.dungeon.coin_dun?.[d.id] ? ' · ' + game.data.dungeon.texts.coin_tag : '')), el('small', null, D.from.replace('{name}', d.from)));
      const tag = el('small', 'md-tag', d.open ? (d.done ? D.done + ' · ' : '') + (d.hint?.text || '') : d.closed ? D.closed : D.locked);
      if (d.hint) tag.style.color = d.hint.color;
      info.append(tag);
      if (goal) info.append(el('small', 'md-goal', D.task_here.replace('{mob}', focus.mob)));
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

  function open(f) {   // f: { mob: tên quái, ids: [bí cảnh có quái đó] } hoặc không có
    if (!game.save || game.dialog.open || game.trip) return;
    for (const p of document.querySelectorAll('.panel, #bag')) if (p !== root && !p.hidden) p.querySelector('[id$="-close"]')?.click();
    focus = f?.ids?.length ? f : null;
    game.uiOpen = true; root.hidden = false; render();
  }
  x.onclick = close;
  game.openDungeons = open;   // nút Bí cảnh trên màn hình (src/ui/hud-order.js)
  game.openOldPanel = openOld;
  $('btn-menu').addEventListener('pointerdown', e => { e.stopPropagation(); game.openNav?.('menu'); });
  return { open, close };
}
