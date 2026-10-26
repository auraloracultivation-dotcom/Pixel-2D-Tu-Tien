// Bảng Thú: tab Linh thú (con đang mang, cấp, kinh nghiệm, đổi con) và tab Thú cưỡi (chọn con để cưỡi).
import { petNeed, setPet, setMount } from '../game/pets.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createPetsPanel(game) {
  const { data } = game, P = data.pets;
  let tab = 'linh-thu';

  function card(color, title, lines, using, onPick) {
    const c = el('button', 'skill-card' + (using ? ' using' : ''));
    c.style.borderLeftColor = color;
    c.append(el('b', null, title), ...lines.map(l => el('small', null, l)));
    c.onclick = () => { onPick(); game.sfx('pickup'); render(); };
    return c;
  }

  function renderPets(s, list) {
    $('pets-sub').textContent = 'Chạm để mang theo. Linh thú hưởng nửa linh khí bạn thu được.';
    const ids = Object.keys(s.pets);
    if (!ids.length) list.append(el('p', 'muted', 'Chưa có linh thú. Gặp Ngự Thú Sư ở Thiên Kiếm Phong, hoặc hạ quái dị chủng (có ánh vàng).'));
    for (const id of ids) {
      const d = P.pets[id], st = s.pets[id], max = st.lv >= P.max_level;
      list.append(card(d.color, `${d.name} · cấp ${st.lv}${s.pet === id ? ' · đang mang' : ''}`, [
        d.desc,
        `Sát thương ${Math.round(d.mult * (1 + (st.lv - 1) * P.lv_bonus) * 100)}% công của bạn`,
        max ? 'Đã tối đa.' : `Kinh nghiệm ${Math.floor(st.exp)}/${petNeed(data, st.lv)}`,
      ], s.pet === id, () => setPet(game, id)));
    }
    const missing = Object.entries(P.pets).filter(([id]) => !s.pets[id]).map(([id]) => P.rare.prefix + data.mobs[id].name);
    if (missing.length) list.append(el('p', 'muted', 'Chưa thu phục: ' + missing.join(', ') + '.'));
  }

  function renderMounts(s, list) {
    $('pets-sub').textContent = 'Đi trên đảo lúc yên ổn là tự cưỡi. Đánh nhau thì xuống.';
    for (const [id, m] of Object.entries(P.mounts)) {
      const got = s.mounts[id];
      const c = card(m.color, `${m.name}${s.mount === id ? ' · đang dùng' : got ? '' : ' · chưa có'}`, [m.desc], s.mount === id, () => setMount(game, id));
      c.disabled = !got;
      if (!got) c.classList.add('locked');
      list.append(c);
    }
  }

  function render() {
    const s = game.save, list = $('pets-list');
    for (const b of document.querySelectorAll('#pets-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    list.innerHTML = '';
    if (tab === 'linh-thu') renderPets(s, list); else renderMounts(s, list);
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    game.uiOpen = true; game.newPets = false; $('pets').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('pets').hidden = true; }

  $('pets-close').onclick = close;
  for (const b of document.querySelectorAll('#pets-tabs [data-tab]')) b.onclick = () => { tab = b.dataset.tab; render(); };
  $('btn-pets').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  return { open, close };
}
