// Bảng kết quả bí cảnh (chủ dự án chốt 02/11/2026 03:25): lưới ô vuông, mỗi ô một thứ thu được trong lượt (trang bị, ngọc,
// đan, nguyên liệu, Linh Thạch), dưới là 3 nút: Tiếp tục (vượt bậc kế), Càn quét (bậc vừa qua, nhận ngay thưởng cố định), Thoát.
// Luật ở src/game/dun-run.js; mở bằng game.openDunResult({ id, L, loot, inside, swept, party }).
import { el, icon } from './bag-detail.js';
import { gemIcon } from './gem-icon.js';
import { gemInfo, rarityOf, itemName } from '../game/items.js';
import { quality } from '../game/tiers.js';
import { matInfo } from '../game/cave.js';
import { levelName, cleared } from '../game/dun-mode.js';
import { runsLeft, sweep, enterLevel, leaveRun } from '../game/dun-run.js';

export function createDunResult(game) {
  const data = game.data, T = data.dungeon.texts;
  const root = el('div', 'panel dr-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), title = el('b'), grid = el('div', 'dr-grid'), note = el('div', 'muted tiny dr-note'), acts = el('div', 'dr-acts');
  head.append(title);
  root.append(head, grid, note, acts);
  document.body.append(root);

  function cell(x) {
    const c = el('div', 'dr-cell');
    let name = '', color = '#c8c4d0';
    if (x.kind === 'item') {
      const q = quality(data, x.it) || rarityOf(data.items, x.it.rarity);
      c.append(icon(data, x.it)); name = itemName(data, x.it); color = q?.color || color;
    } else if (x.kind === 'gem') { const g = gemInfo(data, x.id); const box = el('div', 'dr-gem'); box.append(gemIcon(game, x.id, g.lv < 6 ? 84 : 56)); c.append(box); name = g.name; color = g.color || color; }   // ngọc cấp thấp hình nhỏ giữa khung: phóng to, cắt viền trống
    else {
      const m = x.kind === 'coins' ? { name: T.coins, color: '#f2c94c' } : x.kind === 'pill' ? data.cave.pills[x.id] : matInfo(data, x.id);
      const dot = el('i', 'dr-dot'); dot.style.background = m?.color || color;
      c.append(dot); name = m?.name || x.id; color = m?.color || color;
    }
    c.style.borderColor = color; c.title = name;
    c.append(el('small', null, name));
    if (x.n > 1 || x.kind === 'coins') c.append(el('b', 'dr-n', '×' + x.n.toLocaleString('vi-VN')));
    return c;
  }

  function btn(text, fn, off) { const b = el('button', 'act-btn', text); b.disabled = !!off; b.onclick = fn; acts.append(b); }
  function close() { root.hidden = true; game.uiOpen = false; }

  function open(r) {
    const name = data.maps[r.id].name, left = runsLeft(game, r.id), n = data.dungeon.per_day;
    title.textContent = (r.swept ? T.res_swept : T.res_title).replace('{map}', name).replace('{level}', levelName(game, r.L));
    grid.replaceChildren(...r.loot.map(cell));
    if (!r.loot.length) grid.append(el('div', 'muted', T.res_empty));
    note.textContent = r.party ? T.res_party : T.res_left.replace('{left}', left).replace('{n}', n);
    acts.replaceChildren();
    const top = cleared(game, r.id), next = r.inside ? r.L + 1 : top;
    if (!r.party) {
      btn(T.next.replace('{level}', levelName(game, next)), () => { close(); enterLevel(game, r.id, next); }, !left || next > top);
      btn(T.again.replace('{level}', levelName(game, Math.max(0, top - 1))), () => {
        const loot = sweep(game, r.id, top - 1);
        if (loot) { game.sfx('levelup'); open({ ...r, L: top - 1, loot, swept: true }); }
      }, !left || top < 1);
    }
    btn(r.inside ? T.exit : T.close, () => { close(); if (r.inside) leaveRun(game); });
    game.uiOpen = true; root.hidden = false;
  }

  game.openDunResult = open;
}
