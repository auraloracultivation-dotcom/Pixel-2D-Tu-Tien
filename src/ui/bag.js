// Túi đồ: ô đang mặc, danh sách đồ và ngọc, chi tiết món đồ với mặc/tháo, tẩy luyện, khảm ngọc, phân giải.
import {
  ensureInv, equip, unequip, salvage, reroll, socket, unsocket, mergeGems,
  gemInfo, rarityOf, itemName, statText, gearStats,
} from '../game/items.js';
import { salvageIron, matInfo } from '../game/cave.js';
import { dailyEvent } from '../game/daily.js';
import { enhance, enhanceCost, setStats } from '../game/enhance.js';
import { costText } from '../game/cave.js';

const $ = id => document.getElementById(id);

const bonusText = (s, v) => ({ lifesteal: `hút máu ${v}%`, thorns: `phản đòn ${v}%`, regen: `hồi ${v} máu/giây` })[s] || null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createBag(game) {
  const { data } = game;
  const st = { tab: 'do', sel: null, pickSocket: null };

  const save = () => game.save;
  const isEq = uid => Object.values(save().equip).includes(uid);

  function changed() { game.refreshStats(); game.persist(); render(); }

  function itemCard(it) {
    const r = rarityOf(data.items, it.rarity);
    const b = el('button', 'item' + (st.sel === it.uid ? ' sel' : ''));
    b.style.borderColor = r.color;
    b.append(el('b', null, itemName(data, it)), el('small', null, `${r.name} · cấp ${it.lvl}${isEq(it.uid) ? ' · đang mặc' : ''}`));
    b.onclick = () => { st.sel = it.uid; st.pickSocket = null; render(); };
    return b;
  }

  function renderEquip() {
    const box = $('bag-equip'); box.innerHTML = '';
    for (const [slot, name] of Object.entries(data.items.slots)) {
      const it = save().bag.find(i => i.uid === save().equip[slot]);
      const cell = el('div', 'slot');
      cell.append(el('span', 'slot-name', name));
      if (it) cell.append(itemCard(it)); else cell.append(el('div', 'empty', 'Trống'));
      box.append(cell);
    }
    const g = gearStats(data, save());
    $('bag-stats').textContent = Object.keys(g).length
      ? 'Tổng từ đồ: ' + Object.entries(g).map(([s, v]) => statText(data, s, v)).join(' · ')
      : 'Chưa mặc đồ.';
    $('bag-mats').textContent = Object.entries(save().mats).filter(([, n]) => n > 0).map(([k, n]) => `${matInfo(data, k)?.name || k} ${n}`).join(' · ') || 'Chưa có nguyên liệu';
  }

  function renderList() {
    const box = $('bag-list'); box.innerHTML = '';
    if (st.tab === 'do') {
      const items = save().bag.filter(i => !isEq(i.uid));
      if (!items.length) box.append(el('p', 'muted', 'Túi trống. Hạ quái để nhặt đồ.'));
      for (const it of items) box.append(itemCard(it));
      return;
    }
    const keys = Object.keys(save().gems).sort();
    if (!keys.length) box.append(el('p', 'muted', 'Chưa có ngọc. Quái và boss có thể rơi ngọc.'));
    for (const k of keys) {
      const gi = gemInfo(data, k), row = el('div', 'gem-row');
      const dot = el('i', 'gem-dot'); dot.style.background = gi.color;
      row.append(dot, el('span', null, `${gi.name} ×${save().gems[k]} (${statText(data, gi.stat, gi.value)})`));
      if (st.pickSocket) {
        const b = el('button', 'mini', 'Khảm');
        b.onclick = () => { socket(save(), st.pickSocket.uid, st.pickSocket.idx, k); st.pickSocket = null; st.tab = 'do'; changed(); };
        row.append(b);
      } else if (gi.lv < data.items.gems.max_level) {
        const b = el('button', 'mini', `Ghép ${data.items.gems.merge}→1`);
        b.disabled = save().gems[k] < data.items.gems.merge;
        b.onclick = () => { if (mergeGems(data, save(), k)) { game.sfx('levelup'); changed(); } };
        row.append(b);
      }
      box.append(row);
    }
  }

  function renderDetail() {
    const box = $('bag-detail'); box.innerHTML = '';
    const it = save().bag.find(i => i.uid === st.sel);
    if (!it) { box.append(el('p', 'muted', 'Chọn một món để xem.')); return; }
    const r = rarityOf(data.items, it.rarity), base = data.items.bases[it.base];
    const title = el('div', 'd-title', `[${r.name}] ${itemName(data, it)}`); title.style.color = r.color;
    box.append(title, el('div', 'muted', `${data.items.slots[base.slot]} · cấp ${it.lvl}`));
    const k = 1 + (it.plus || 0) * data.gear.enhance.main_per;
    for (const [s, v] of Object.entries(it.main)) box.append(el('div', 'd-main', statText(data, s, Math.round(v * k))));
    if (base.art) box.append(el('div', 'd-line', `Chiêu pháp bảo ${data.skills[base.art].name}: ${data.skills[base.art].desc}`));
    if (base.set) {
      const sd = data.gear.sets[base.set], n = setStats(data, save()).count[base.set] || 0;
      const t = el('div', 'd-line', `${sd.name} (đang mặc ${n}): ` + Object.entries(sd.bonus).map(([need, b]) => `${need} món: ` + Object.entries(b).map(([s, v]) => bonusText(s, v) || statText(data, s, v)).join(', ')).join(' · '));
      t.style.color = sd.color; box.append(t);
    }
    for (const l of it.lines) box.append(el('div', 'd-line', '◆ ' + statText(data, l.s, l.v)));
    if (it.sockets.length) {
      const row = el('div', 'd-sockets');
      it.sockets.forEach((g, idx) => {
        const b = el('button', 'socket' + (g ? ' full' : ''));
        if (g) { const gi = gemInfo(data, g); b.textContent = `${gi.name}`; b.style.borderColor = gi.color; b.onclick = () => { unsocket(save(), it.uid, idx); changed(); }; }
        else { b.textContent = '+ Khảm ngọc'; b.onclick = () => { st.pickSocket = { uid: it.uid, idx }; st.tab = 'ngoc'; render(); }; }
        row.append(b);
      });
      box.append(row, el('div', 'muted tiny', 'Chạm ô có ngọc để gỡ ngọc về túi.'));
    }
    const acts = el('div', 'd-acts');
    const btn = (t, fn, off) => { const b = el('button', 'act-btn', t); b.disabled = !!off; b.onclick = fn; acts.append(b); };
    if (isEq(it.uid)) btn('Tháo', () => { unequip(save(), base.slot); changed(); });
    else btn('Mặc', () => { equip(save(), data, it.uid); game.sfx('shield'); changed(); });
    const ec = enhanceCost(data, it);
    if (ec) {
      const can = Object.entries(ec.cost).every(([m, n]) => (save().mats[m] || 0) >= n);
      btn(`Cường hóa +${(it.plus || 0) + 1} (${costText(data, ec.cost)}, ${Math.round(ec.rate * 100)}%)`, () => {
        const r = enhance(game, it.uid);
        st.msg = r === 'up' ? `Thành công! +${it.plus}` : r === 'drop' ? `Hỏng, tụt còn +${it.plus}` : 'Hỏng, giữ nguyên cấp';
        game.sfx(r === 'up' ? 'levelup' : 'hurt'); changed();
      }, !can);
    }
    const stones = save().mats['tay-luyen-thach'] || 0, cost = data.items.reroll_cost;
    btn(`Tẩy luyện (${cost} thạch)`, () => { if (reroll(data, save(), it.uid)) { game.sfx('heal'); changed(); } }, stones < cost);
    const iron = data.cave.salvage_iron[it.rarity] || 0;
    btn(`Phân giải (+${r.salvage} thạch, +${iron} tinh thiết)`, () => { if (salvage(data, save(), it.uid)) { salvageIron(game, it.rarity); dailyEvent(game, 'salvage'); } st.sel = null; game.sfx('die'); changed(); }, isEq(it.uid));
    box.append(acts);
    if (st.msg) { box.append(el('div', 'd-main', st.msg)); st.msg = ''; }
  }

  function render() {
    ensureInv(save());
    for (const b of document.querySelectorAll('#bag [data-tab]')) b.classList.toggle('on', b.dataset.tab === st.tab);
    $('bag-pick').hidden = !st.pickSocket;
    renderEquip(); renderList(); renderDetail();
  }

  for (const b of document.querySelectorAll('#bag [data-tab]')) b.onclick = () => { st.tab = b.dataset.tab; st.pickSocket = null; render(); };
  $('bag-close').onclick = () => close();
  $('btn-bag').addEventListener('pointerdown', e => { e.stopPropagation(); open(); });

  function open() {
    if (!game.save || game.dialog.open) return;
    game.uiOpen = true; game.newItems = 0; $('bag').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('bag').hidden = true; }

  return { open, close };
}
