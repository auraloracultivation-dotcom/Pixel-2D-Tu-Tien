// Bảng Chiêu: tab Chiêu (3 ô chiêu đang mang, chiêu đã mở và chưa mở) và tab Công pháp (3 cuốn đang mang, cấp, kinh nghiệm).
import { unlockedSkills, skillSlots, setSlot } from '../game/skills.js';
import { weaponId } from '../game/stats.js';
import { setTechSlot, techNeed } from '../game/techniques.js';
import { statText } from '../game/items.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createSkillsPanel(game) {
  const { data } = game;
  let slot = 0, tab = 'chieu';

  // Mốc mở chiêu: tổng tầng → "Trúc Cơ tầng 1"
  const need = n => `${data.realms.names[Math.floor(n / data.realms.layers)]} tầng ${n % data.realms.layers + 1}`;

  function render() {
    for (const b of document.querySelectorAll('#skills-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    $('skills-sub').textContent = tab === 'chieu' ? 'Chọn ô rồi chạm chiêu để mang' : 'Chọn ô rồi chạm công pháp để mang';
    if (tab === 'chieu') renderSkills(); else renderTechs();
  }

  // Một dòng hiệu ứng công pháp: "Công +6% · Tốc tu +6%"
  const effText = (t, lv) => Object.entries(t.per_level).map(([k, v]) => {
    const n = Math.round(v * lv * 10) / 10;
    if (k === 'lifesteal') return `Hút máu ${n}%`;
    if (k === 'thorns') return `Phản đòn ${n}%`;
    if (k === 'regen') return `Hồi ${n} máu/giây`;
    return statText(data, k, n);
  }).join(' · ');

  function renderTechs() {
    const T = data.techniques, sl = game.save.techSlots;
    const box = $('skills-slots'); box.innerHTML = '';
    for (let i = 0; i < T.slots; i++) {
      const id = sl[i], b = el('button', i === slot ? 'on' : '', id ? T.list[id].name : 'Trống');
      b.append(el('small', null, id ? `tầng ${game.save.techs[id].lv}` : `Ô ${i + 1}`));
      b.onclick = () => { slot = i; render(); };
      box.append(b);
    }
    const list = $('skills-list'); list.innerHTML = '';
    const known = Object.keys(game.save.techs);
    if (!known.length) list.append(el('p', 'muted', 'Chưa có công pháp. Bí kíp rơi từ boss và quái mạnh.'));
    for (const id of known) {
      const t = T.list[id], st = game.save.techs[id], max = st.lv >= T.max_level;
      const c = el('button', 'skill-card' + (sl.includes(id) ? ' using' : ''));
      c.style.borderLeftColor = t.color;
      c.append(el('b', null, `${t.name} · tầng ${st.lv}/${T.max_level}`),
        el('small', null, effText(t, st.lv)),
        el('small', null, max ? 'Đã viên mãn.' : `Kinh nghiệm ${Math.floor(st.exp)}/${techNeed(data, st.lv)} (mang theo để tu)`),
        el('small', null, t.desc));
      c.onclick = () => { setTechSlot(game, slot, id); slot = (slot + 1) % T.slots; game.sfx('pickup'); render(); };
      list.append(c);
    }
  }

  function renderSkills() {
    const lo = skillSlots(game), open = unlockedSkills(game);
    const box = $('skills-slots'); box.innerHTML = '';
    lo.forEach((id, i) => {
      const b = el('button', i === slot ? 'on' : '', id ? data.skills[id].name : 'Trống');
      b.append(el('small', null, `Ô ${i + 1}`));
      b.onclick = () => { slot = i; render(); };
      box.append(b);
    });
    const list = $('skills-list'); list.innerHTML = '';
    const all = [];
    const w = data.weapons[weaponId(game.save, data)];
    if (w.skill) all.push({ id: w.skill, from: w.name });
    const e = game.save.element ? data.elements[game.save.element] : null;
    if (e) e.skills.forEach((id, i) => all.push({ id, from: `Hệ ${e.name}`, at: data.elements._unlock[i] }));
    for (const { id, from, at } of all) {
      const s = data.skills[id], ok = open.includes(id);
      const c = el('button', 'skill-card' + (ok ? '' : ' locked') + (lo.includes(id) ? ' using' : ''));
      c.style.borderLeftColor = s.color;
      c.append(el('b', null, s.name), el('small', null, `${from} · hồi ${s.cd} giây${ok ? '' : ` · mở ở ${need(at)}`}`), el('small', null, s.desc || ''));
      c.disabled = !ok;
      c.onclick = () => { setSlot(game, slot, id); slot = (slot + 1) % 3; game.sfx('pickup'); render(); };
      list.append(c);
    }
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    game.uiOpen = true; game.newSkills = false; $('skills').hidden = false; slot = 0; render();
  }
  function close() { game.uiOpen = false; $('skills').hidden = true; }

  $('skills-close').onclick = close;
  for (const b of document.querySelectorAll('#skills-tabs [data-tab]')) b.onclick = () => { tab = b.dataset.tab; slot = 0; render(); };
  $('btn-skills').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  return { open, close };
}
