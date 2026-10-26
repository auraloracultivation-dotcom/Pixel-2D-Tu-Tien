// Bảng động phủ: tab Lò đan (luyện và dùng đan), Lò rèn (chọn ô, rèn đồ mới), Động phủ (nâng cấp). Mở khi đứng cạnh lò.
import { brew, brewRate, usePill, forge, costText, canPay, matInfo } from '../game/cave.js';
import { rarityOf, itemName } from '../game/items.js';
import { caveLv, caveLevel, caveNext, upgradeCave } from '../game/evolve.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createCavePanel(game) {
  const { data } = game;
  let tab = 'dan', slot = 'vu-khi', last = '';

  const mini = (text, fn, off) => { const b = el('button', 'mini', text); b.disabled = !!off; b.onclick = fn; return b; };

  function render() {
    const s = game.save;
    for (const b of document.querySelectorAll('#cave-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    $('cave-mats').textContent = Object.entries(s.mats).filter(([, n]) => n > 0).map(([k, n]) => `${matInfo(data, k)?.name || k} ${n}`).join(' · ') || 'Chưa có nguyên liệu. Đánh quái, phân giải đồ, trồng linh điền.';
    $('cave-msg').textContent = last;
    const top = $('cave-slots'), list = $('cave-list');
    top.innerHTML = ''; list.innerHTML = '';
    top.hidden = tab !== 'ren';
    if (tab === 'phu') { renderCave(list); return; }
    if (tab === 'dan') {
      for (const [id, p] of Object.entries(data.cave.pills)) {
        const c = el('div', 'skill-card');
        c.style.borderLeftColor = p.color;
        const have = s.pills[id] || 0;
        c.append(el('b', null, `${p.name} · có ${have}`), el('small', null, p.desc), el('small', null, `Cần: ${costText(data, p.recipe)} → ${p.make} viên · thành ${Math.round(brewRate(game, id) * 100)}%`));
        const row = el('div', 'card-acts');
        row.append(
          mini('Luyện', () => {
            const n = brew(game, id);
            if (n === 'fail') { game.sfx('hurt'); last = `Lò nổ! Luyện ${p.name} thất bại, mất nguyên liệu.`; }
            else if (n) { game.sfx('heal'); last = `Luyện thành ${n} ${p.name}!`; }
            render();
          }, !canPay(game, p.recipe)),
          mini('Dùng', () => { const m = usePill(game, id); last = m ? `${p.name}: ${m}` : 'Lúc này dùng không có tác dụng.'; if (m) game.sfx('levelup'); render(); }, !have),
        );
        c.append(row); list.append(c);
      }
      return;
    }
    for (const [id, name] of Object.entries(data.items.slots)) {
      const b = el('button', id === slot ? 'on' : '', name);
      b.onclick = () => { slot = id; render(); };
      top.append(b);
    }
    for (const r of data.cave.forge) {
      const c = el('div', 'skill-card');
      c.style.borderLeftColor = rarityOf(data.items, r.min_rarity).color;
      c.append(el('b', null, r.name), el('small', null, r.desc), el('small', null, `Cần: ${costText(data, r.cost)}`));
      const row = el('div', 'card-acts');
      row.append(mini(`Rèn ${data.items.slots[slot]}`, () => {
        const it = forge(game, r.id, slot);
        if (it === 'full') last = 'Túi đầy! Phân giải bớt đồ.';
        else if (it) { const rr = rarityOf(data.items, it.rarity); last = `Rèn ra [${rr.name}] ${itemName(data, it)}! Mở Túi để mặc.`; game.sfx('levelup'); game.screen.shake(2, 0.2); }
        render();
      }, !canPay(game, r.cost)));
      c.append(row); list.append(c);
    }
  }

  // Nâng cấp động phủ: cấp hiện tại và cấp tới
  function renderCave(list) {
    const L = data.cave.levels, cur = caveLevel(game), n = caveNext(game);
    const info = l => [`Đả tọa x${l.meditate_mul}`, `Linh thảo chín sau ${l.grow_min} phút, mỗi luống ${l.yield}`, l.brew_bonus ? `Luyện đan +${Math.round(l.brew_bonus * 100)}%` : ''].filter(Boolean);
    const c = el('div', 'skill-card'); c.style.borderLeftColor = '#5fd07a';
    c.append(el('b', null, `${cur.name} · cấp ${caveLv(game.save) + 1}/${L.length}`), ...info(cur).map(t => el('small', null, t)));
    list.append(c);
    if (!n) { list.append(el('p', 'muted', 'Động phủ đã tới cấp cao nhất.')); return; }
    const d = el('div', 'skill-card'); d.style.borderLeftColor = n.ok ? '#ffb03a' : '#c8c4d0';
    d.append(el('b', null, `Lên ${n.name}`), ...info(n).map(t => el('small', null, t)),
      el('small', null, `Cần: ${costText(data, n.cost)}, ${n.coins} ${data.shop.name}, cảnh giới ${game.data.realms.names[n.realm]}`));
    const row = el('div', 'card-acts');
    row.append(mini('Nâng cấp', () => { if (upgradeCave(game)) last = `Động phủ thành ${caveLevel(game).name}!`; render(); }, !n.ok));
    d.append(row); list.append(d);
  }

  function open(t) {
    if (!game.save || game.dialog.open || game.trip) return;
    tab = t || tab; last = '';
    game.uiOpen = true; $('cave').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('cave').hidden = true; }

  $('cave-close').onclick = close;
  for (const b of document.querySelectorAll('#cave-tabs [data-tab]')) b.onclick = () => { tab = b.dataset.tab; last = ''; render(); };
  game.openCave = open;
  return { open, close };
}
