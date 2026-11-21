// Ba ô Kỹ năng trên màn chơi (chủ dự án 21/11/2026, bảng câu hỏi: "3 ô hàng dọc sát mép phải phía dưới, bên trên khung dưới"). Nút #btn-k0..2 (index.html,
// lệnh sk0–sk2), ô k0 dưới cùng. Chưa học kỹ năng nào thì cả cột ẩn và các nút khác đứng như cũ; có rồi thì body có lớp co-kn: Lướt, Tự đánh, nút việc
// lùi sang trái nhường mép phải (ky-nang-hud.css). Ô trống hiện mờ. Đang hồi: quạt tối + số giây; thiếu linh lực: xám; vừa học: nháy sáng kèm tên chiêu.
// src/ui/hud.js gọi knHud mỗi lần vẽ lại màn chơi. Logic: src/game/ky-nang.js.
import { goc } from '../core/build.js';
import { knOn, knO, knMo, knDef, knMocTick } from '../game/ky-nang.js';
import { skillGrade } from '../game/skill-grade.js';
import { manaCost } from '../game/mana.js';

let cssOn = false;
export function knHud(game, skillIcon) {
  if (!cssOn) { cssOn = true; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = goc('src/ui/ky-nang-hud.css'); document.head.append(l); }
  const t = performance.now(); if (t - (game.knSoatT || 0) > 1000) { game.knSoatT = t; knMocTick(game); }   // mốc 5, 10, 15 nhiệm vụ chính: nhận sách trống
  const on = knOn(game), lo = on ? knO(game) : [], co = on && knMo(game).length > 0, p = game.player, d = game.data;
  if (document.body.classList.contains('co-kn') !== co) document.body.classList.toggle('co-kn', co);
  const moi = co && (game.time || 0) < (game.knMoi || 0);
  for (let i = 0; i < 3; i++) {
    const b = document.getElementById('btn-k' + i);
    if (!b) continue;
    if (b.hidden !== !co) b.hidden = !co;
    if (!co) continue;
    const id = lo[i] || '';
    if (b.dataset.id !== id) {
      b.dataset.id = id; b.classList.toggle('off', !id);
      b.style.backgroundImage = id ? skillIcon(d, id) : ''; b.dataset.ten = id ? d.skills[id].name : '';
      if (id) b.style.setProperty('--gc', d.skills[id].color || skillGrade(d, id).color); else b.style.removeProperty('--gc');
    }
    const left = id ? Math.max(0, p?.knCd?.[i] || 0) : 0, max = p?.knCdMax?.[i] || 1, cd = left > 0 ? Math.min(1, left / max) : 0, so = left > 0 ? String(Math.ceil(left)) : '';
    if (b._cd !== cd) { b._cd = cd; b.style.setProperty('--cd', cd.toFixed(3)); }
    const lbl = b.querySelector('b'); if (lbl.textContent !== so) lbl.textContent = so;
    b.classList.toggle('thieu', !!id && left <= 0 && (p?.mp ?? 0) < manaCost(game, id, knDef(game, id)));
    b.classList.toggle('moi', moi && !!id);
  }
}
