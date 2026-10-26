// Bảng Chiêu: 3 ô chiêu đang mang, danh sách chiêu đã mở và chưa mở (kèm mốc cảnh giới).
import { unlockedSkills, skillSlots, setSlot } from '../game/skills.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createSkillsPanel(game) {
  const { data } = game;
  let slot = 0;

  // Mốc mở chiêu: tổng tầng → "Trúc Cơ tầng 1"
  const need = n => `${data.realms.names[Math.floor(n / data.realms.layers)]} tầng ${n % data.realms.layers + 1}`;

  function render() {
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
    const w = data.weapons[game.save.weapon];
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
  $('btn-skills').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  return { open, close };
}
