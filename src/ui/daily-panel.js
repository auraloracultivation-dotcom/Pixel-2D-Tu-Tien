// Bảng Việc: tab Hằng ngày (việc hôm nay, nhận thưởng, rương) và tab Tông môn (chức vị, cống hiến, đổi thưởng).
import { ensureDaily, taskDef, taskText, claimTask, claimChest, bountyLeft, rankOf, rankIdx, buy } from '../game/daily.js';
import { renderEvents } from './event-tab.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createDailyPanel(game) {
  const { data } = game, D = data.daily;
  let tab = 'ngay', msg = '';

  const mini = (text, fn, off) => { const b = el('button', 'mini', text); b.disabled = !!off; b.onclick = () => { fn(); render(); }; return b; };
  const rewardText = r => [r.coins && `${r.coins} ${data.shop.name}`, r.contrib && `${r.contrib} cống hiến`, r.stones && `${r.stones} thạch`, r.qi && `${r.qi} linh khí`, r.gem && `${r.gem} ngọc`, r.item && 'trang bị', r.mats && 'nguyên liệu'].filter(Boolean).join(', ');

  function card(color, title, lines, btn) {
    const c = el('div', 'skill-card');
    c.style.borderLeftColor = color;
    c.append(el('b', null, title), ...lines.map(l => el('small', null, l)));
    if (btn) { const row = el('div', 'card-acts'); row.append(btn); c.append(row); }
    return c;
  }

  function renderDay(list) {
    const dl = ensureDaily(game);
    $('daily-sub').textContent = `Treo thưởng còn ${Math.max(0, bountyLeft(game))}/${D.bounty_per_day} lượt hôm nay`;
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

  function renderSect(list) {
    const s = game.save, ri = rankIdx(game), next = D.ranks[ri + 1];
    $('daily-sub').textContent = `${rankOf(game).name} · cống hiến ${s.contrib}`;
    list.append(card('#5ab8f0', rankOf(game).name, [
      `Cống hiến tích luỹ ${s.contribTotal || 0}`,
      next ? `Lên ${next.name} khi đủ ${next.need}` : 'Đã tới chức vị cao nhất hiện có.',
    ]));
    for (const it of D.shop) {
      const lock = it.rank && ri < rankIdx(game, it.rank);
      list.append(card(lock ? '#c8c4d0' : '#f2c94c', it.name, [`${it.cost} cống hiến${lock ? ` · cần ${rankOf(game, it.rank).name}` : ''}`],
        mini('Đổi', () => { const g = buy(game, it.id); if (g) { msg = 'Đổi được: ' + g.join(', '); game.sfx('pickup'); } }, lock || s.contrib < it.cost)));
    }
  }

  function render() {
    const list = $('daily-list');
    for (const b of document.querySelectorAll('#daily-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    list.innerHTML = '';
    $('daily-msg').textContent = msg;
    if (tab === 'ngay') renderDay(list);
    else if (tab === 'su-kien') renderEvents(game, list, { card, mini, rewardText, say: t => { msg = t; } });
    else renderSect(list);
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    game.uiOpen = true; game.newDaily = false; msg = ''; $('daily').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('daily').hidden = true; }

  $('daily-close').onclick = close;
  for (const b of document.querySelectorAll('#daily-tabs [data-tab]')) b.onclick = () => { tab = b.dataset.tab; msg = ''; render(); };
  $('btn-daily').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  return { open, close };
}
