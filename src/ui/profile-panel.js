// Hồ sơ đạo hữu (data/duel.json profile): chạm tên ở bảng xếp hạng (rank-view.js → game.openProfile) thì mở. Cảnh giới,
// lực chiến, chỉ số, đồ từng ô kèm cường hoá, dòng phụ, ngọc đang khảm; chiêu đang mang kèm cấp, chiêu pháp bảo, công pháp,
// linh thú, đồng hành. Nút So tài (game/duel.js) và Truyền âm. Dữ liệu từ game/profile.js (đã lọc), chữ chỉ gán textContent.
import { loadPlayer } from '../game/profile.js';
import { startDuel } from '../game/duel.js';
import { playerStats, realmLabel, weaponId, artSkill } from '../game/stats.js';
import { skillSlots } from '../game/skills.js';
import { petDef } from '../game/evolve.js';
import { rarityOf, itemName, statText, gemInfo } from '../game/items.js';
import { icon, mainStats } from './bag-detail.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const vn = n => Math.round(n || 0).toLocaleString('vi-VN');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function section(title, ...kids) {
  const s = el('div', 'pf-sec');
  s.append(el('div', 'pf-label', title), ...kids);
  return s;
}

function itemCard(game, save, slot, T) {
  const { data } = game, it = save.bag.find(i => i.uid === save.equip[slot]), card = el('div', 'pf-item');
  if (!it) {
    card.classList.add('empty');
    card.append(el('span', 'pf-slot', data.items.slots[slot]), el('span', 'muted', T.slot_empty));
    return card;
  }
  const r = rarityOf(data.items, it.rarity), ico = icon(data, it), txt = el('div', 'pf-it');
  ico.style.borderColor = r.color;
  const name = el('b', null, itemName(data, it)); name.style.color = r.color;
  txt.append(name, el('small', 'muted', `${data.items.slots[slot]} · ${fill(T.item_sub, { rarity: r.name, lvl: it.lvl })}`));
  const st = el('div', 'pf-stats');
  for (const [s, v] of Object.entries(mainStats(data, save, it))) st.append(el('span', 'd-main', statText(data, s, v)));
  for (const l of it.lines) st.append(el('span', 'd-line', '◆ ' + statText(data, l.s, l.v)));
  if (it.sockets.length) {
    const gems = el('div', 'pf-gems');
    for (const g of it.sockets) {
      if (!g) { gems.append(el('span', 'pf-gem empty', T.gem_empty)); continue; }
      const gi = gemInfo(data, g), chip = el('span', 'pf-gem', `${gi.name}: ${statText(data, gi.stat, gi.value)}`);
      chip.style.borderColor = gi.color; chip.style.color = gi.color;
      gems.append(chip);
    }
    st.append(gems);
  }
  txt.append(st);
  card.append(ico, txt);
  return card;
}

function chips(list) {
  const d = el('div', 'pf-chips');
  for (const [text, color] of list) { const c = el('span', 'pf-chip', text); if (color) c.style.borderColor = color; d.append(c); }
  return d;
}

export function createProfile(game) {
  const P = game.data.duel?.profile;
  if (!P) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./profile.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);
  const root = el('div', 'panel pf-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', P.close), body = el('div', 'pf-body');
  head.append(el('b', null, P.title), x);
  root.append(head, body);
  document.body.append(root);
  let ticket = 0, under = false;   // under: bảng Đạo hữu đang mở bên dưới: ẩn tạm cho khỏi chồng hai lớp nền trong mờ
  const social = () => document.getElementById('social');

  function close(back = true) {   // back: hiện lại bảng Đạo hữu (So tài, Truyền âm thì không)
    root.hidden = true; ticket++;
    if (under && back && social()) social().hidden = false;
    else game.uiOpen = false;
    under = false;
  }
  x.onclick = () => close();
  root.addEventListener('pointerdown', e => e.stopPropagation());

  function msg(text, retry) {
    body.textContent = '';
    const d = el('p', 'muted', text);
    if (retry) { const b = el('button', 'mini', '↻'); b.onclick = retry; d.append(' ', b); }
    body.append(d);
  }

  function render(prof) {
    const { data } = game, s = prof.save, st = playerStats(s, data), T = P;
    body.textContent = '';
    const top = el('div', 'pf-top'), name = el('div', 'pf-name' + (prof.co ? ' co' : ''), prof.ten);
    if (prof.co) name.title = T.flag;
    top.append(name, el('div', 'pf-realm', `${realmLabel(s, data.realms)} · ${fill(T.power, { v: vn(prof.luc_chien) })}`));
    top.append(el('div', 'pf-line', fill(T.stats, { hp: vn(st.maxHp), atk: vn(st.atk), def: vn(st.def), crit: Math.round(st.crit * 100), cm: Math.round(st.critMult * 100) })));
    const elm = s.element && data.elements[s.element], line = el('div', 'pf-line', `${elm ? fill(T.element, { name: elm.name }) : T.element_none} · ${fill(T.weapon, { name: data.weapons[weaponId(s, data)].name })}`);
    if (elm) line.style.color = elm.color;
    top.append(line);
    const acts = el('div', 'pf-acts'), duel = el('button', 'act-btn primary', prof.la_toi ? T.duel_self : T.duel);
    duel.onclick = () => { close(false); game.closeSocial?.(); startDuel(game, prof); };
    acts.append(duel);
    if (!prof.la_toi && game.openWhisper) { const w = el('button', 'act-btn', T.whisper); w.onclick = () => { close(false); game.openWhisper(prof.k, prof.ten); }; acts.append(w); }
    top.append(acts, el('div', 'muted tiny', T.note));
    body.append(top);

    const gear = el('div', 'pf-gear');
    for (const slot of Object.keys(data.items.slots)) gear.append(itemCard(game, s, slot, T));
    body.append(section(T.gear, gear));

    const lvMax = data.config.skill_lv.max, lv = id => Math.max(1, Math.min(lvMax, s.skillLv[id] || 1));
    const sk = skillSlots({ data, save: s }).filter(Boolean).map(id => [`${data.skills[id].name} · ${fill(T.skill_lv, { lv: lv(id) })}`, data.skills[id].color]);
    const art = artSkill(s, data);
    if (art) sk.push([fill(T.art, { name: `${data.skills[art].name} · ${fill(T.skill_lv, { lv: lv(art) })}` }), data.skills[art].color]);
    body.append(section(T.skills, sk.length ? chips(sk) : el('span', 'muted', T.none)));
    const tech = s.techSlots.map(id => [`${data.techniques.list[id].name} · ${fill(T.skill_lv, { lv: s.techs[id]?.lv || 0 })}`, data.techniques.list[id].color]);
    body.append(section(T.techs, tech.length ? chips(tech) : el('span', 'muted', T.none)));
    const pet = s.pet && s.pets[s.pet], pd = pet && petDef(data, s, s.pet);
    body.append(section(T.pet, pet ? chips([[fill(T.pet_line, { name: pd.name, lv: pet.lv, star: pet.star ? ` · ★${pet.star}` : '' }), pd.color]]) : el('span', 'muted', T.none)));
    const comp = s.companion && s.comps[s.companion];
    body.append(section(T.comp, comp ? chips([[fill(T.comp_line, { name: data.npcs[s.companion].name, lv: comp.lv }), data.companions.list[s.companion].color]]) : el('span', 'muted', T.none)));
  }

  async function open(k, ten) {
    if (root.hidden) { under = social()?.hidden === false; if (under) social().hidden = true; }
    root.hidden = false; game.uiOpen = true;
    if (!game.online) return msg(P.offline);
    const my = ++ticket;
    msg(`${ten ? ten + ': ' : ''}${P.loading}`);
    try {
      const prof = await loadPlayer(game, k);
      if (my === ticket) render(prof);
    } catch { if (my === ticket) msg(P.error, () => open(k, ten)); }
  }
  game.openProfile = open;
}
