// Bảng Thành tựu: tab Thành tựu (tiến độ, nhận thưởng), Danh hiệu (chọn danh hiệu hiện trên đầu), Thời trang, Nhật ký.
import { claimAchv, titles, setTitle, achvText, power } from '../game/achieve.js';
import { owned, buyOutfit, wear, howToGet } from '../game/fashion.js';
import { journal } from '../game/journal.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createAchvPanel(game) {
  const { data } = game, D = data.status;
  let tab = 'thanh-tuu', msg = '';

  const mini = (text, fn, off) => { const b = el('button', 'mini', text); b.disabled = !!off; b.onclick = () => { fn(); render(); }; return b; };
  const rewardText = r => [r.coins && `${r.coins} ${data.shop.name}`, r.stones && `${r.stones} thạch`, r.gem && `${r.gem} ngọc`, r.item && 'trang bị'].filter(Boolean).join(', ');

  function card(color, title, lines, btn) {
    const c = el('div', 'skill-card');
    c.style.borderLeftColor = color;
    c.append(el('b', null, title), ...lines.map(l => el('small', null, l)));
    if (btn) { const row = el('div', 'card-acts'); row.append(btn); c.append(row); }
    return c;
  }

  function renderAchv(list) {
    const st = game.save.achv, done = D.achievements.filter(a => st[a.id]).length;
    $('achv-sub').textContent = `${done}/${D.achievements.length} · Lực chiến ${power(game).toLocaleString('vi-VN')}`;
    // chưa nhận lên đầu, đã nhận xuống cuối
    const order = a => st[a.id] === 1 ? 0 : st[a.id] ? 2 : 1;
    for (const a of [...D.achievements].sort((x, y) => order(x) - order(y))) {
      const s = st[a.id], lines = [achvText(game, a), `Thưởng: ${rewardText(a.give)}${a.title ? ` · danh hiệu ${D.titles[a.title].name}` : ''}`];
      list.append(card(s === 2 ? '#c8c4d0' : s ? '#5fd07a' : '#f2c94c', a.name, lines,
        mini(s === 2 ? 'Đã nhận' : s ? 'Nhận thưởng' : 'Chưa xong', () => { const g = claimAchv(game, a.id); if (g) { msg = 'Nhận: ' + g.join(', '); game.sfx('levelup'); } }, s !== 1)));
    }
  }

  function renderTitles(list) {
    const own = titles(game);
    const keep = id => !D.titles[id].weekly;   // danh hiệu xếp hạng tuần không tính vào tổng
    $('achv-sub').textContent = `${own.filter(keep).length}/${Object.keys(D.titles).filter(keep).length} danh hiệu`;
    if (!own.length) list.append(card('#c8c4d0', 'Chưa có danh hiệu', ['Hoàn thành thành tựu để mở danh hiệu.']));
    for (const id of own) {
      const t = D.titles[id], on = game.save.title === id;
      list.append(card(t.color, t.name, [(t.weekly ? 'Danh hiệu tuần này. ' : '') + (on ? 'Đang dùng, hiện trên đầu.' : 'Chạm để mang.')], mini(on ? 'Bỏ' : 'Mang', () => setTitle(game, id))));
    }
  }

  // Thời trang: mặc bộ đã có, mua bộ bán bằng Linh Thạch
  function renderFashion(list) {
    const F = data.fashion.list, s = game.save, cur = s.outfit || 'dong-phuc';
    $('achv-sub').textContent = `${Object.keys(F).filter(id => owned(game, id)).length}/${Object.keys(F).length} bộ · chỉ đổi dáng vẻ`;
    for (const [id, f] of Object.entries(F)) {
      const own = owned(game, id), on = cur === id;
      const btn = on ? mini('Đang mặc', () => {}, true) : own ? mini('Mặc', () => { wear(game, id); msg = `Đã mặc ${f.name}.`; })
        : f.from.shop ? mini(`Mua ${f.from.shop}`, () => { if (buyOutfit(game, id)) { wear(game, id); msg = `Mua và mặc ${f.name}.`; game.sfx('pickup'); } }, (s.lingshi || 0) < f.from.shop) : null;
      const c = card(f.robe, f.name, [own ? 'Đã có' : howToGet(game, f)], btn);
      const sw = document.createElement('i'); sw.className = 'swatch'; sw.style.background = `linear-gradient(90deg, ${f.robe} 60%, ${f.hair} 60%)`;
      c.prepend(sw); list.append(c);
    }
  }

  // Nhật ký: dấu mốc tự ghi, mới nhất trên cùng
  function renderJournal(list) {
    const j = journal(game);
    $('achv-sub').textContent = `${j.length} dòng nhật ký`;
    if (!j.length) list.append(card('#c8c4d0', 'Trang giấy còn trắng', ['Những dấu mốc trên đường tu tiên sẽ tự ghi vào đây.']));
    for (const e of j) list.append(card('#b8a0e0', new Date(e.t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }), [e.text]));
  }

  function render() {
    const list = $('achv-list');
    for (const b of document.querySelectorAll('#achv-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    list.innerHTML = '';
    $('achv-msg').textContent = msg;
    if (tab === 'thanh-tuu') renderAchv(list); else if (tab === 'thoi-trang') renderFashion(list); else if (tab === 'nhat-ky') renderJournal(list); else renderTitles(list);
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    game.uiOpen = true; game.newAchv = false; msg = ''; $('achv').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('achv').hidden = true; }

  $('achv-close').onclick = close;
  for (const b of document.querySelectorAll('#achv-tabs [data-tab]')) b.onclick = () => { tab = b.dataset.tab; msg = ''; render(); };
  $('btn-achv').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  return { open, close };
}
