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

// Chuyển động lò (SpriteCook 20/11/2026, data/art.json → lo.<mã>.chay | .thanh): tấm khung đè đúng chỗ ảnh tĩnh, cùng cỡ điểm ảnh,
// đáy giữa trùng đáy giữa ảnh tĩnh. loop: chạy vòng tới khi gọi stop(); không loop: chạy một lượt rồi tự tắt. Trả { stop, done } hoặc null.
function play(game, box, kind, loop) {
  const D = game.data, a = D.art.sprites[`${box.dataset.spr}.${kind}`], base = D.art.sprites[box.dataset.spr], img = box.querySelector('.ld-lo-img');
  if (!a || !base || !img) return null;
  const r = img.getBoundingClientRect(), s = r.height / base.h, d = el('i', 'ld-anim ld-anim-' + kind), fps = 8;   // nổi trên màn (lớp #ld-fx) để nắp bay lên không bị khung bảng cắt
  Object.assign(d.style, { width: a.w * s + 'px', height: a.h * s + 'px', left: r.left + r.width / 2 - a.anchor[0] * s + 'px',
    top: r.bottom - (a.anchor[1] + 1) * s + 'px', backgroundImage: `url("${a.file}?v=${a.v}")`, backgroundSize: `${a.frames * 100}% 100%` });
  d.style.setProperty('--q', getComputedStyle(box).getPropertyValue('--q'));
  layer().append(d); img.style.visibility = 'hidden';
  let i = 0, end, t = null;
  const done = new Promise(r => { end = r; });
  const stop = () => { clearInterval(t); d.remove(); img.style.visibility = ''; end(); };
  const step = () => {
    if (i >= a.frames) { if (!loop) return stop(); i = 0; }
    d.style.backgroundPositionX = (a.frames > 1 ? (i / (a.frames - 1)) * 100 : 0) + '%'; i++;
  };
  step(); t = setInterval(step, 1000 / fps);
  return { stop, done };
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
  const anim = play(game, box, 'chay', true);   // lửa đáy lò, lửa trong lòng lò, khói, rung nhẹ; chưa có chuyển động thì rung bằng CSS
  box.classList.add(anim ? 'ld-chay-sc' : 'ld-chay');
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
    anim?.stop();
    box.classList.remove('ld-chay', 'ld-chay-sc');
  }
  return res;
}

// Nhịp 3: kết quả r ({ ds: [{ dan, vien, thanh }], thanh }). Thành: lò bung nắp (SpriteCook .thanh: nắp bật ở khung 3–5), từng viên đan
// chui ra từ miệng lò bay lên (14:3x), hào quang nằm sau lò; xong lượt chuyển động mới trả (rồi bảng nhận thưởng mở). Hỏng: khói đen, lò giật.
export function resultFx(game, box, r) {
  const D = game.data, img = box.querySelector('.ld-lo-img'), m = center(img), lid = { x: m.x, y: m.y - m.h * 0.42 }, mouth = { x: m.x, y: m.y - m.h * 0.22 };
  if (r.thanh) {
    const ok = r.ds.filter(d => d.thanh), a = play(game, box, 'thanh', false);
    setTimeout(() => {
      const glow = bit('ldx-hao' + (a ? ' nhe' : ''), m.x, m.y); setTimeout(() => glow.remove(), 1400);
      ok.forEach((d, i) => setTimeout(() => pop(game, D, { x: mouth.x + (i - (ok.length - 1) / 2) * 30, y: mouth.y, len: m.h * 0.62 }, d.dan, d.vien), i * 260));
      game.sfx?.('levelup');
    }, a ? 300 : 0);   // nắp vừa nhấc (khung 3) thì đan chui ra
    return a ? a.done : wait(1500);
  }
  box.classList.add('ld-no'); setTimeout(() => box.classList.remove('ld-no'), 700);
  for (let k = 0; k < 9; k++) {   // khói đen cuộn lên
    const s = bit('ldx-khoi', lid.x + (Math.random() - 0.5) * 30, lid.y + 6);
    s.style.setProperty('--dx', (Math.random() - 0.5) * 70 + 'px'); s.style.setProperty('--dy', -(50 + Math.random() * 50) + 'px');
    s.style.animationDelay = k * 40 + 'ms';
    setTimeout(() => s.remove(), 1500);
  }
  game.sfx?.('hurt');
  return wait(700);
}

function pop(game, D, at, dan, n) {   // một viên đan chui ra từ miệng lò, tia vàng toả quanh, kèm số viên
  for (let k = 0; k < 10; k++) {
    const t = bit('ldx-sao', at.x, at.y), g = (k / 10) * Math.PI * 2;
    t.style.setProperty('--dx', Math.cos(g) * 46 + 'px'); t.style.setProperty('--dy', Math.sin(g) * 34 + 'px');
    setTimeout(() => t.remove(), 900);
  }
  const spr = D.art.sprites['ui.vk-' + dan], p = el('i', 'ldx-ico');
  if (spr) p.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`; else p.style.background = D.cave.pills[dan]?.color || '#ffe27a';
  const pill = bit('ldx-dan ldx-chui', at.x, at.y, p);
  pill.style.setProperty('--len', (at.len || 60) + 'px');   // bay lên khỏi nắp lò
  pill.append(el('b', null, '×' + n));
  setTimeout(() => pill.remove(), 2100);
}
