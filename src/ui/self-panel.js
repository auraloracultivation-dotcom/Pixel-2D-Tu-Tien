// Nhóm D khung nhân vật (chủ dự án gom 02/11/2026): chạm tên / cảnh giới góc trái trên mở bảng gồm ảnh nhân vật (avatar),
// tên + đổi tên, danh hiệu (chọn ở Thành tựu → Danh hiệu), cảnh giới, linh căn, máu, linh lực, lực chiến, chỉ số cơ bản.
import { heroLook } from '../render/draw-hero.js';
import { spriteIcon } from './sprite-icon.js';
import { playerStats, realmLabel, rootOf, qiNeed } from '../game/stats.js';
import { power, titleOf } from '../game/achieve.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const vn = n => Math.round(n || 0).toLocaleString('vi-VN');

export function createSelfPanel(game) {
  const root = el('div', 'panel self-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', '✕'), body = el('div', 'self-body');
  head.append(el('b', null, 'Nhân vật'), x);
  root.append(head, body);
  document.body.append(root);
  function close() { root.hidden = true; game.uiOpen = false; }
  x.onclick = close;

  function row(k, v) { const r = el('div', 'self-row'); r.append(el('span', null, k), el('b', null, v)); return r; }
  function render() {
    const s = game.save, d = game.data, p = game.player, st = playerStats(s, d);
    body.replaceChildren();
    const top = el('div', 'self-top'), ava = el('div', 'self-ava');
    const look = heroLook(game);
    ava.append(spriteIcon(game, look.sprite, 0, 72, 'self-ico', true));
    const info = el('div', 'self-info'), name = game.cloud?.name || 'Đạo hữu', t = titleOf(game);
    const nm = el('b', 'self-name', name);
    const rename = el('button', 'mini', 'Đổi tên'); rename.onclick = () => { close(); game.openRename?.(); };
    const tt = el('div', 'self-title', t ? `Danh hiệu: ${t.name}` : 'Chưa đeo danh hiệu');
    if (t?.color) tt.style.color = t.color;
    const pick = el('button', 'mini', 'Chọn danh hiệu'); pick.onclick = () => { close(); game.openOldPanel?.({ btn: 'btn-achv', tabs: 'achv-tabs', tab: 'danh-hieu' }); };
    const btns = el('div', 'self-btns'); btns.append(rename, pick);
    info.append(nm, tt, el('div', 'self-realm', realmLabel(s, d.realms)), btns);
    top.append(ava, info);
    const need = qiNeed(s, d.realms);
    const stats = el('div', 'self-stats');
    stats.append(
      row('Linh căn', s.element ? `${d.elements[s.element].name} · ${rootOf(s, d).name}` : 'Chưa thức tỉnh'),
      row('Lực chiến', vn(power(game))),
      row('Máu', `${vn(p?.hp)}/${vn(st.maxHp)}`),
      row('Linh lực', `${vn(s.qi)}/${vn(need)}`),
      row('Công', vn(st.atk)),
      row('Phòng', vn(st.def)),
      row('Bạo kích', `${Math.round(st.crit * 100)}%`),
      row('Sát thương bạo', `${Math.round(st.critMult * 100)}%`),
      row('Giảm hồi chiêu', `${Math.round(st.cdr * 100)}%`),
      row('Tốc chạy', `${Math.round(st.speedMul * 100)}%`),
      row('Tốc tu', `×${st.qiMul.toFixed(2)}`),
      row('Hút máu', `${Math.round(st.lifesteal * 100)}%`),
      row('Phản đòn', `${Math.round(st.thorns * 100)}%`),
      row('Hồi máu', `${st.regen}/giây`),
    );
    body.append(top, stats);
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    for (const p of document.querySelectorAll('.panel, #bag')) if (p !== root && !p.hidden) p.querySelector('[id$="-close"]')?.click();
    game.uiOpen = true; root.hidden = false; render();
  }
  game.openSelf = open;
  const R = document.getElementById('realm');   // chạm khung tên, cảnh giới (trước chỉ chạm tên để đổi tên)
  R?.addEventListener('click', e => { e.stopPropagation(); open(); }, true);   // bắt trước nút tên cũ (đổi tên giờ nằm trong bảng)
  document.getElementById('power')?.addEventListener('click', e => { e.stopPropagation(); open(); });
}
