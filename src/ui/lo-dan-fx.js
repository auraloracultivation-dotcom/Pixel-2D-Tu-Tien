// Hiệu ứng luyện đan bằng code (chủ dự án 20/11/2026 13:5x: "chưa có ảnh và hiệu ứng"). Ba nhịp, vẽ bằng thẻ DOM nổi trên bảng:
// 1) nguyên liệu trong 9 ô bay vào miệng lò; 2) lò rung, lửa dưới đáy bùng, tia lửa bay lên (máy chủ tính kết quả trong lúc này);
// 3) thành: hào quang vàng, viên đan bật ra khỏi nắp kèm số viên; hỏng: khói đen bốc lên, lò giật. Số giờ ở data/cave.json → lo.fx.
import { el } from './bag-detail.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const center = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
function layer() {
  let L = document.getElementById('ld-fx');
  if (!L) { L = el('div'); L.id = 'ld-fx'; document.body.append(L); }
  return L;
}
function bit(cls, x, y, html) {   // một thẻ nổi đặt theo toạ độ màn hình
  const d = el('div', 'ldx ' + cls); d.style.left = x + 'px'; d.style.top = y + 'px';
  if (html) d.append(html);
  layer().append(d);
  return d;
}

// Nhịp 1 + 2: chạy tới khi job() xong (ít nhất F.burn ms), trả kết quả của job()
export async function brewFx(game, box, slotEls, job) {
  const F = game.data.cave.lo.fx, img = box.querySelector('.ld-lo-img'), m = center(img), mouth = { x: m.x, y: m.y - m.h * 0.28 };
  for (const [i, s] of slotEls.entries()) {   // nguyên liệu bay vào miệng lò, lần lượt
    const ico = s.querySelector('.ld-ico'); if (!ico) continue;
    const c = center(ico), d = bit('ldx-bay', c.x, c.y, ico.cloneNode(true));
    d.style.width = c.w + 'px'; d.style.height = c.h + 'px';
    setTimeout(() => { d.style.transform = `translate(${mouth.x - c.x}px, ${mouth.y - c.y}px) scale(.25)`; d.style.opacity = '0.2'; }, 20 + i * F.gap);
    setTimeout(() => d.remove(), F.fly + i * F.gap + 60);
    s.classList.add('ld-tat');
  }
  game.sfx?.('pickup');
  await wait(F.fly + Math.max(0, slotEls.length - 1) * F.gap);
  box.classList.add('ld-chay');   // lò rung, đáy lò đỏ rực (lo-dan.css)
  game.sfx?.('brew');
  const t0 = performance.now(), sparks = setInterval(() => {   // tia lửa, đốm lửa bay lên từ đáy lò
    for (let k = 0; k < 3; k++) {
      const s = bit('ldx-lua', m.x + (Math.random() - 0.5) * m.w * 0.55, m.y + m.h * 0.32);
      s.style.setProperty('--dx', (Math.random() - 0.5) * 30 + 'px'); s.style.setProperty('--dy', -(40 + Math.random() * 60) + 'px');
      s.style.background = ['#ffe27a', '#ff9a3a', '#ff5a2a', '#fff4c0'][k % 4];
      setTimeout(() => s.remove(), 900);
    }
  }, 90);
  let res;
  try { res = await job(); } finally {
    await wait(Math.max(0, F.burn - (performance.now() - t0)));
    clearInterval(sparks);
    box.classList.remove('ld-chay');
  }
  return res;
}

// Nhịp 3: kết quả
export function resultFx(game, box, ok, dan, n) {
  const D = game.data, img = box.querySelector('.ld-lo-img'), m = center(img), lid = { x: m.x, y: m.y - m.h * 0.42 };
  if (ok) {
    const glow = bit('ldx-hao', m.x, m.y); setTimeout(() => glow.remove(), 1400);
    for (let k = 0; k < 14; k++) {   // tia vàng toả ra
      const s = bit('ldx-sao', lid.x, lid.y), a = (k / 14) * Math.PI * 2;
      s.style.setProperty('--dx', Math.cos(a) * 60 + 'px'); s.style.setProperty('--dy', Math.sin(a) * 45 + 'px');
      setTimeout(() => s.remove(), 900);
    }
    const spr = D.art.sprites['ui.vk-' + dan], p = el('i', 'ldx-ico');
    if (spr) p.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`; else p.style.background = D.cave.pills[dan]?.color || '#ffe27a';
    const pill = bit('ldx-dan', lid.x, lid.y, p);
    pill.append(el('b', null, '×' + n));
    setTimeout(() => pill.remove(), 1900);
    game.sfx?.('levelup');
  } else {
    box.classList.add('ld-no'); setTimeout(() => box.classList.remove('ld-no'), 700);
    for (let k = 0; k < 9; k++) {   // khói đen cuộn lên
      const s = bit('ldx-khoi', lid.x + (Math.random() - 0.5) * 30, lid.y + 6);
      s.style.setProperty('--dx', (Math.random() - 0.5) * 70 + 'px'); s.style.setProperty('--dy', -(50 + Math.random() * 50) + 'px');
      s.style.animationDelay = k * 40 + 'ms';
      setTimeout(() => s.remove(), 1500);
    }
    game.sfx?.('hurt');
  }
}
