// Bảng Nhiệm vụ (nút Nhiệm vụ trên màn hình): chủ dự án chốt 02/11/2026 chỉ còn 2 thứ, điểm danh (checkin-card.js) và nhiệm vụ
// hằng ngày (việc hôm nay, nhận thưởng, rương). Tab Đạo Vận, Sự kiện đã bỏ; Tự hành thành mục Tự động trong Menu (side-nav.js).
import { ensureDaily, taskDef, taskText, claimTask, claimChest } from '../game/daily.js';
import { renderCheckin } from './checkin-card.js';
import { loadCheckin } from '../game/checkin.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createDailyPanel(game) {
  const { data } = game, D = data.daily;
  let msg = '';

  const mini = (text, fn, off) => { const b = el('button', 'mini', text); b.disabled = !!off; b.onclick = () => { fn(); render(); }; return b; };
  const rewardText = r => [r.coins && `${r.coins} ${data.shop.name}`, r.stones && `${r.stones} thạch`, r.qi && `${r.qi} linh khí`, r.gem && `${r.gem} ngọc`, r.item && 'trang bị', r.mats && 'nguyên liệu'].filter(Boolean).join(', ');

  function card(color, title, lines, btn) {
    const c = el('div', 'skill-card');
    c.style.borderLeftColor = color;
    c.append(el('b', null, title), ...lines.map(l => el('small', null, l)));
    if (btn) { const row = el('div', 'card-acts'); row.append(btn); c.append(row); }
    return c;
  }

  function renderDay(list) {
    const dl = ensureDaily(game);
    renderCheckin(game, list, { card, mini, say: t => { msg = t; }, rerender: () => { if (!$('daily').hidden) render(); } });
    $('daily-sub').textContent = '';
    dl.tasks.forEach((t, i) => {
      const d = taskDef(game, t.id); if (!d) return;
      const done = t.n >= d.n;
      list.append(card(t.got ? '#c8c4d0' : done ? '#5fd07a' : '#f2c94c', taskText(d, t.n), [`Thưởng: ${rewardText(d.reward)}`],
        mini(t.got ? 'Đã nhận' : done ? 'Nhận thưởng' : 'Chưa xong', () => { const g = claimTask(game, i); if (g) { msg = 'Nhận: ' + g.join(', '); game.sfx('levelup'); } }, t.got || !done)));
    });
    const all = dl.tasks.every(t => t.got);
    list.append(card('#ffb03a', 'Rương hằng ngày', [`Xong và nhận đủ ${dl.tasks.length} việc để mở. ${rewardText(D.chest)}.`],
      mini(dl.chest ? 'Đã mở' : 'Mở rương', () => { const g = claimChest(game); if (g) { msg = 'Rương: ' + g.join(', '); game.sfx('levelup'); } }, dl.chest || !all)));
  }

  function render() {
    const list = $('daily-list');
    list.innerHTML = '';
    $('daily-msg').textContent = msg;
    renderDay(list);
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    game.uiOpen = true; game.newDaily = false; msg = ''; $('daily').hidden = false; render();
    loadCheckin(game).then(() => { if (!$('daily').hidden) render(); });   // ngày mới: đọc lại điểm danh
  }
  function close() { game.uiOpen = false; $('daily').hidden = true; }

  $('daily-close').onclick = close;
  $('btn-daily').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  return { open, close };
}
