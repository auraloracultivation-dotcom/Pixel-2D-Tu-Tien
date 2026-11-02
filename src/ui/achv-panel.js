// Bảng Thành tựu: phần Thành tựu (tiến độ, nhận thưởng), Danh hiệu (chọn danh hiệu hiện trên đầu), Thời trang, Nhật ký.
// Thanh tab ẩn (src/ui/side-nav.css): mỗi mục Menu / Túi đồ mở đúng một phần, tên bảng đổi theo phần đó.
import { claimAchv, titles, setTitle, achvText, power } from '../game/achieve.js';
import { owned, buyOutfit, wear, howToGet, curOutfit, versions } from '../game/fashion.js';
import { journal } from '../game/journal.js';
import { outfitLine, linesText } from '../game/beast.js';
import { tierOf } from '../game/tiers.js';

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

  // Hình ô lưới: nhân vật chính mặc đúng bộ đó (hình chibi hero.y-<bộ>-<nam|nu>), không có thì hình gốc
  function icon(c, id, alt) {
    const sp = data.art.sprites;
    if (sp[id]) { c.dataset.icon = id; c.dataset.iconSize = 46; } else if (alt && sp[alt]) c.dataset.icon = alt;
  }

  // Thời trang: mỗi bộ có bản nam và bản nữ, đều hiện (bản đúng giới tính mình lên trước); mua bản nào nhận bản đó,
  // chỉ mặc được bản đúng giới tính (đổi giới tính: Đan đổi giới tính ở Lò đan). Ô đang mặc ghi "Đang mặc".
  function renderFashion(list) {
    const s = game.save, F = data.fashion.list, H = data.heroes, look = H.list[s.look] ? s.look : H.default, cur = curOutfit(game);
    const gName = g => H.list[g].name.split(' ·')[0].toLowerCase();
    const rows = [];
    for (const [id, f] of Object.entries(F)) for (const g of versions(game, id)) rows.push([id, f, g]);
    rows.sort((x, y) => (x[2] !== look) - (y[2] !== look));
    $('achv-sub').textContent = `${rows.filter(([id, , g]) => owned(game, id, g)).length}/${rows.length} bộ`;
    for (const [id, f, g] of rows) {
      const own = owned(game, id, g), on = cur === id && g === look, mine = g === look, two = versions(game, id).length > 1;
      const btn = on ? mini('Đang mặc', () => {}, true) : own && !mine ? mini(`Chỉ ${gName(g)}`, () => {}, true) : own ? mini('Mặc', () => { wear(game, id); msg = `Đã mặc ${f.name}.`; })
        : f.from.shop ? mini(`Mua ${f.from.shop}`, () => { if (buyOutfit(game, id, g)) { if (mine) wear(game, id); msg = `Đã mua ${f.name} (${gName(g)}).`; game.sfx('pickup'); } }, (s.lingshi || 0) < f.from.shop) : null;
      const T = data.pets.beast.fashion.tier, t = T[Object.keys(f.from).find(k => T[k] != null)] ?? 0;
      const bonus = own ? `Cộng khi mặc: ${linesText(data, [outfitLine(game, `${id}:${g}`, f)])[0]}` : `Có bộ thì bốc 1 dòng chỉ số màu ${tierOf(data, t).name}, cố định mãi`;
      const c = card(f.robe, two ? `${f.name} (${gName(g)})` : f.name, [on ? 'Đang mặc' : own ? (mine ? 'Đã có' : `Đã có · chỉ ${gName(g)} mặc được`) : howToGet(game, f), bonus], btn);
      const sw = document.createElement('i'); sw.className = 'swatch'; sw.style.background = `linear-gradient(90deg, ${f.robe} 60%, ${f.hair} 60%)`;
      c.prepend(sw); icon(c, `hero.y-${id}-${g}`, f.sprite === 'goc' && H.list[g]?.sprite); list.append(c);
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
    $('achv').querySelector('.bag-head b').textContent = document.querySelector(`#achv-tabs [data-tab="${tab}"]`).textContent;
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
