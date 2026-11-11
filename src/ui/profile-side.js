// Khung phải của Hồ sơ đạo hữu (src/ui/profile-panel.js; chủ dự án 11/11/2026 21:04: bảng xếp hạng chưa dùng bảng trang bị mới).
// Mặc định: linh căn, binh khí, nút So tài / Truyền âm / Kết bạn, chiêu, công pháp. Chạm ô đồ hay ô thú trên thẻ nhân vật: tấm chi tiết
// chỉ xem (không nút rèn, mặc, gỡ ngọc), ✕ về mặc định. Chữ ở data/duel.json → profile. Dữ liệu người khác chỉ gán textContent.
import { el, icon, mainStats, tierLine } from './bag-detail.js';
import { spriteIcon } from './sprite-icon.js';
import { gemIcon } from './gem-icon.js';
import { itemName, statText, gemInfo, rarityOf } from '../game/items.js';
import { quality } from '../game/tiers.js';
import { weaponId, artSkill } from '../game/stats.js';
import { skillSlots } from '../game/skills.js';
import { petDef } from '../game/evolve.js';
import { beastStats } from '../game/beast.js';

const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

function head(ico, name, color, sub, close) {
  const h = el('div', 'd-head'), t = el('div', 'd-title', name), txt = el('div', 'd-name'), x = el('button', 'd-close', '✕');
  t.style.color = color; txt.append(t, el('div', 'd-sub', sub));
  x.setAttribute('aria-label', 'Đóng chi tiết'); x.onclick = close;
  h.append(ico, txt, x);
  return h;
}

// Một món người đó đang mặc: chỉ số chính (đã cường hoá), dòng tẩy luyện, ngọc khảm. null nếu ô trống
export function itemSheet(game, save, slot, T, close) {
  const { data } = game, it = save.bag.find(i => i.uid === save.equip[slot]);
  if (!it) return null;
  const r0 = rarityOf(data.items, it.rarity), q = quality(data, it), color = q ? q.edge || q.color : r0.color, ico = icon(data, it);
  ico.style.borderColor = color;
  const box = el('div', 'pf-sheet'), st = el('div', 'd-stats');
  box.append(head(ico, itemName(data, it), color, `${q ? 'Phẩm ' + q.name : r0.name} · ${data.items.slots[slot]} · ${fill(T.item_lv, { lvl: it.lvl })}`, close));
  for (const [s, v] of Object.entries(mainStats(data, save, it))) st.append(el('div', 'd-main', statText(data, s, v)));
  for (const l of it.lines) st.append(tierLine(data, l));
  box.append(st);
  if (it.sockets.length) {
    const row = el('div', 'd-sockets');
    for (const g of it.sockets) {
      const c = el('span', 'socket' + (g ? ' full' : ''));
      if (g) { const gi = gemInfo(data, g); c.append(gemIcon(game, g, 18, 'gem-ico sm'), `${gi.name}: ${statText(data, gi.stat, gi.value)}`); c.style.borderColor = gi.color; }
      else c.textContent = T.gem_empty;
      row.append(c);
    }
    box.append(el('div', 'd-label', T.gems), row);
  }
  return box;
}

const pick = (save, kind) => (kind === 'pet' ? save.pet : kind === 'mount' ? save.mount : kind === 'comp' ? save.companion : kind === 'comp2' ? save.companion2 : null);

// Linh thú / khôi lỗi / thú cưỡi người đó đang mang: cấp, sao, tiến hoá, chỉ số, dòng tẩy luyện. null nếu không mang
export function beastSheet(game, save, kind, T, close) {
  const { data } = game, id = pick(save, kind);
  if (!id) return null;
  const pre = kind === 'pet' ? 'pet.' : kind === 'mount' ? 'mount.' : 'comp.', spr = [pre + id, 'npc.' + id].find(k => data.art.sprites[k]);
  const ico = spr ? spriteIcon(game, spr, 0, 26, 'pf-spr', true) : el('i', 'ico');
  const box = el('div', 'pf-sheet'), st = el('div', 'd-stats');
  if (kind === 'mount') {
    const m = data.pets.mounts[id], l = save.mountLine?.[id];
    box.append(head(ico, m.name, m.color, T.mount, close));
    st.append(el('div', 'd-main', fill(T.speed, { v: Math.round(m.speed * 100) })));
    if (l) st.append(tierLine(data, l));
  } else {
    const pet = kind === 'pet', b = pet ? save.pets[id] : save.comps[id], k = pet ? 'pet' : 'puppet';
    const name = pet ? petDef(data, save, id).name : data.npcs[id].name, color = pet ? data.pets.pets[id].color : data.companions.list[id].color;
    box.append(head(ico, name, color, [pet ? T.pet : T.puppet, fill(T.skill_lv, { lv: b.lv }), b.star ? '★' + b.star : '', b.evo ? T.evo : ''].filter(Boolean).join(' · '), close));
    const bare = { pets: { [id]: { ...b, lines: [] } }, comps: { [id]: { ...b, lines: [] } } };   // chỉ số theo loài, cấp, sao; dòng tẩy để riêng bên dưới
    for (const [s, v] of Object.entries(beastStats(data, bare, k, id))) st.append(el('div', 'd-main', statText(data, s, v)));
    for (const l of b.lines || []) st.append(tierLine(data, l));
  }
  box.append(st);
  return box;
}

function chips(list) {
  const d = el('div', 'pf-chips');
  for (const [text, color] of list) { const c = el('span', 'pf-chip', text); if (color) c.style.borderColor = color; d.append(c); }
  return d;
}

// Phần mặc định: linh căn, binh khí, nút (acts, do profile-panel.js dựng), chiêu đang mang, công pháp
export function infoSheet(game, prof, T, acts) {
  const { data } = game, s = prof.save, box = el('div', 'pf-info'), elm = s.element && data.elements[s.element];
  const line = el('div', 'pf-line', `${elm ? fill(T.element, { name: elm.name }) : T.element_none} · ${fill(T.weapon, { name: data.weapons[weaponId(s, data)].name })}`);
  if (elm) line.style.color = elm.color;
  box.append(line);
  if (prof.co) box.append(el('div', 'pf-flag', '⚑ ' + T.flag));
  box.append(acts, el('div', 'pf-hint', T.tap));
  const lvMax = data.config.skill_lv.max, lv = id => Math.max(1, Math.min(lvMax, s.skillLv[id] || 1));
  const sk = skillSlots({ data, save: s }).filter(Boolean).map(id => [`${data.skills[id].name} · ${fill(T.skill_lv, { lv: lv(id) })}`, data.skills[id].color]);
  const art = artSkill(s, data);
  if (art) sk.push([fill(T.art, { name: `${data.skills[art].name} · ${fill(T.skill_lv, { lv: lv(art) })}` }), data.skills[art].color]);
  const tech = s.techSlots.map(id => [`${data.techniques.list[id].name} · ${fill(T.skill_lv, { lv: s.techs[id]?.lv || 0 })}`, data.techniques.list[id].color]);
  for (const [title, list] of [[T.skills, sk], [T.techs, tech]]) box.append(el('div', 'pf-label', title), list.length ? chips(list) : el('span', 'pf-none', T.none));
  box.append(el('div', 'pf-note', T.note));
  return box;
}
