// Thẻ MỞ QUYỂN / KHÉP QUYỂN của Trấn Ma Kỷ (data/tran-ma-ky.json → card; src/game/tran-ma-ky.js gọi game.theQuyen). Cùng ngôn ngữ hình với nghi lễ đột
// phá cảnh giới (src/ui/mung-canh.js; docs/10-CAI-HON.md việc 4b): cả màn, nền tối, vầng sáng điểm ảnh nở giữa màn, dải chữ khung ảnh GPT thả xuống,
// tên quyển từ to đập xuống, từng dòng hiện kèm một nốt đàn, nút Tiếp tục. Kịch bản từng nhịp (giây từ lúc hiện, số ở card.t):
//   0,00 nền tối dần, chớp nhẹ, tiếng gió dâng (mở) · 0,10 vầng sáng nở · 0,25 dải "Trấn Ma Kỷ" thả xuống · 0,55 TÊN QUYỂN đập xuống, tiếng đàn có
//   chiêng (mở) / đàn rải (khép), hạt toé · 0,85 dòng nơi chốn · 1,15 → các dòng lời (mở: câu đề của quyển; khép: "Ngươi đứng đây vì ai?", câu trả lời
//   của quyển, số trang đã chép, quyển kế mở ở đâu), cách nhau 0,22 giây · sau dòng cuối 0,5 giây: nút Tiếp tục sáng theo nhịp.
// Chạm sớm: hiện hết luôn (không đóng). Đang Tự hành / Tự đánh: game vẫn chạy, thẻ tự đóng sau card.t.auto giây. Trả về lời hứa xong khi thẻ đã tan.
// Mọi chuyển động tính theo giờ thật từng khung (thế giới đang dừng nên giờ game không chạy). Chữ chỉ gán textContent.
import { goc } from '../core/build.js';
import { createRays } from './reward-rays.js';
import { el, cl, back, set, arr, rnd, rgb, mix } from './mung.js';

const TAU = Math.PI * 2;

export function createTheQuyen(game) {
  const C = game.data['tran-ma-ky'];
  if (!C?.card) return;
  const K = C.card, T = K.t, X = C.text;
  for (const f of ['src/ui/mung.css', 'src/ui/the-quyen.css']) { const l = el('link'); l.rel = 'stylesheet'; l.href = goc(f); document.head.append(l); }
  let root = null, S = null, raf = 0;
  const now = () => performance.now() / 1000;
  const loop = () => { raf = 0; if (S) paint(); if (S) raf = requestAnimationFrame(loop); };
  const beat = (key, at, a, name) => { if (name && a >= at && !S.fired[key]) { S.fired[key] = 1; if (!S.fired.skip) game.sfx?.(...arr(name)); } };

  function show(Q, resolve) {
    const khep = Q.kind === 'khep', color = khep ? K.color_khep : K.color, c = rgb(color);
    const dpr = window.devicePixelRatio || 1, m = Math.max(1, Math.round(1.3333 * dpr)), n = Math.round(Math.min(K.size, window.innerWidth - 8) * dpr / m), css = n * m / dpr;
    root ||= document.body.appendChild(el('div', 'mung')); root.id = 'the-quyen'; root.textContent = ''; root.hidden = false; root.classList.remove('ready');
    root.style.setProperty('--g', color);
    const dim = el('div', 'm-dim'), flash = el('div', 'm-flash'), col = el('div', 'm-col'), stage = el('div', 'q-stage');
    const rays = createRays(color, K.lvl, n), fx = el('canvas', 'm-fx'), title = el('div', 'm-title');
    stage.style.width = stage.style.height = css + 'px'; rays.canvas.className = 'm-rays'; fx.width = fx.height = n;
    title.append(el('span', null, X.card_title)); title.style.top = Math.round(css / 2 - 74) + 'px';
    const plate = el('div', 'q-plate'), kind = el('div', 'q-kind', String(khep ? X.close : X.open).replace('{q}', Q.so || '').trim()), name = el('div', 'q-name', Q.ten), sub = el('div', 'q-sub', Q.noi || '');
    plate.append(kind, name, sub); plate.style.marginTop = -Math.round(css / 2 + 30) + 'px';
    stage.append(rays.canvas, fx, title);
    const box = el('div', 'm-lines'), lines = [];
    for (const t of Q.lines || []) lines.push(box.appendChild(el('div', 'm-line wrap' + (!lines.length ? '' : khep && lines.length === 1 ? ' gift q-dap' : ' soft'), t)));   // khép quyển: dòng hai là câu trả lời của quyển, nổi màu vàng
    const btn = el('button', 'q-btn', X.ok), hint = el('div', 'q-hint', X.skip); btn.type = 'button';
    col.append(stage, plate, box, btn); root.append(dim, flash, col, hint);
    const room = window.innerWidth - 24;   // tên quyển dài: thu cỡ chữ cho vừa bề ngang
    if (name.offsetWidth > room) name.style.fontSize = Math.floor(parseFloat(getComputedStyle(name).fontSize) * room / name.offsetWidth) + 'px';
    const H = window.innerHeight, need = col.offsetHeight, ks = Math.min(1, (H - 10) / Math.max(1, need - css * 0.25));   // màn thấp: thu cả khối, phần tia phía trên được phép tràn
    col.style.top = Math.round(Math.min(H * K.y - css / 2, H - 6 - need * ks)) + 'px'; col.style.transform = ks < 1 ? `scale(${ks.toFixed(3)})` : '';
    const tEnd = T.line + lines.length * T.gap + T.end;
    S = { Q, khep, t0: now(), born: performance.now(), shown: performance.now(), n, rays, fx, g: fx.getContext('2d'), dim, flash, title, plate, kind, name, sub, lines, btn, hint, tEnd, resolve,
      fired: {}, out: null, mine: !game.uiOpen, pal: ['#ffffff', mix(c, [255, 255, 255], 0.6), mix(c, [255, 255, 255], 0.25), color] };
    if (S.mine) game.uiOpen = 'the-quyen';   // dừng thế giới trong lúc diễn (đang Tự hành / Tự đánh thì game vẫn chạy: src/game/game.js keep)
    game.fpsHi = performance.now() + (tEnd + 0.6) * 1000;
    game.sfx?.(...arr(khep ? K.sfx.name_khep : K.sfx.open));
    btn.onclick = e => { e.stopPropagation(); close(); };
    root.onpointerdown = e => {   // chạm sớm: hiện hết luôn, không đóng (0,6 giây đầu chưa nhận)
      if (e.target.closest?.('button')) return;
      e.preventDefault();
      if (S && !S.out && now() - S.t0 < S.tEnd && performance.now() - S.born > 600) { S.t0 = now() - S.tEnd; S.fired.skip = 1; S.shown = performance.now(); }
    };
    paint(); if (!raf) raf = requestAnimationFrame(loop);
  }

  // Hạt toé ra lúc tên quyển đập xuống + đốm sáng bay lên chậm: vị trí tính thẳng từ thời gian (quay lại khung nào cũng ra đúng hình đó)
  function drawFx(a) {
    const { g, n, pal } = S, c = (n - 1) / 2, u = n / 120, b = a - T.name;
    g.clearRect(0, 0, n, n);
    const dot = (x, y, k) => { g.fillStyle = pal[Math.min(pal.length - 1, Math.floor(k * pal.length))]; const s = k < 0.45 ? 2 : 1; g.fillRect(Math.round(x), Math.round(y), s, s); };
    if (b >= 0) for (let i = 0; i < 26; i++) {
      const life = 0.45 + rnd(i + 23) * 0.4, k = b / life, an = rnd(i + 31) * TAU, v = 40 + rnd(i + 37) * 90;
      if (k < 1) dot(c + Math.cos(an) * v * b * u, c + (Math.sin(an) * v * 0.5 * b + 60 * b * b) * u, k);
    }
    if (a >= T.ray) for (let i = 0; i < 16; i++) {
      const per = 1.6 + rnd(i + 3), t = (a - T.ray + rnd(i + 11) * per) % per, k = t / per, an = rnd(i) * TAU, r = 18 + rnd(i + 7) * 36;
      if (a - T.ray >= t && k < 0.94) dot(c + (Math.cos(an) * r + Math.sin(t * 4 + i) * 2) * u, c + (18 + Math.sin(an) * r * 0.4 - t * (14 + rnd(i + 5) * 16)) * u, k);
    }
  }

  function paint() {
    const a = now() - S.t0, o = S.out ? cl((now() - S.out) / T.out) : 0;
    if (S.out && o >= 1) { finish(); return; }
    set(S.dim, 'opacity', (K.dim * cl(a / T.dim) * (1 - o)).toFixed(3));
    const bn = a - T.name;
    set(S.flash, 'opacity', (a < 0.22 ? K.flash * (1 - a / 0.22) : bn >= 0 && bn < 0.16 ? K.flash * 0.6 * (1 - bn / 0.16) : 0).toFixed(3));
    const kr = cl((a - T.ray) / 0.35);
    S.rays.draw(a, kr <= 0 ? 0 : 0.25 + 0.75 * (1 - (1 - kr) ** 3)); drawFx(a);
    set(S.rays.canvas, 'opacity', (kr > 0 ? 0.85 * (1 - o) : 0).toFixed(2)); set(S.fx, 'opacity', (1 - o).toFixed(2));
    const tt = cl((a - T.title) / 0.16);
    set(S.title, 'opacity', (tt * (1 - o)).toFixed(2)); set(S.title, 'transform', `translate(-50%, ${Math.round((1 - back(tt)) * -18)}px)`);
    const kn = cl(bn / 0.22), jolt = bn >= 0.1 && bn < 0.3 ? Math.round(Math.sin((bn - 0.1) / 0.2 * Math.PI * 2) * 3 * (1 - (bn - 0.1) / 0.2)) : 0;
    set(S.plate, 'opacity', (cl((a - T.title - 0.1) / 0.1) * (1 - o)).toFixed(2)); set(S.plate, 'transform', jolt ? `translateY(${jolt}px)` : '');
    set(S.name, 'opacity', cl(bn / 0.06).toFixed(2)); set(S.name, 'transform', `scale(${(2.4 - 1.4 * back(kn)).toFixed(3)})`);
    beat('name', T.name, a, S.khep ? null : K.sfx.name);
    set(S.sub, 'opacity', cl((a - T.sub) / 0.18).toFixed(2));
    S.lines.forEach((d, i) => {
      const at = T.line + i * T.gap, k = cl((a - at) / 0.14);
      set(d, 'opacity', (k * (1 - o)).toFixed(2)); set(d, 'transform', `translateY(${Math.round((1 - k) * 8)}px)`);
      beat('l' + i, at, a, K.sfx.line[Math.min(i, K.sfx.line.length - 1)]);
    });
    const ke = cl((a - S.tEnd) / 0.15), ready = ke >= 1 && !S.out && performance.now() - S.shown > 250;
    set(S.btn, 'opacity', (ke * (1 - o)).toFixed(2)); set(S.btn, 'transform', `translateY(${Math.round((1 - ke) * 8)}px)`);
    if (ready !== S.ready) { S.ready = ready; root.classList.toggle('ready', ready); }
    set(S.btn, 'filter', ke >= 1 && !S.out ? `brightness(${(1.42 + 0.2 * Math.sin((a - S.tEnd) * 5.2)).toFixed(2)}) saturate(1.15)` : '');
    set(S.hint, 'opacity', (a > 0.6 && a < S.tEnd ? 0.75 : 0).toFixed(2));
    if (!S.out && (game.pilot || game.auto) && a > S.tEnd + T.auto) close();
  }

  function close() {
    if (!S || S.out) return;
    game.sfx?.(...arr(K.sfx.ok));
    S.out = now(); root.classList.remove('ready');
  }
  function finish() {
    const r = S.resolve;
    root.hidden = true; root.textContent = ''; root.classList.remove('ready');
    if (S.mine && game.uiOpen === 'the-quyen') game.uiOpen = false;
    S = null;
    r();
  }

  // Lỗi ở thẻ không được làm kẹt truyện: coi như đã xem xong
  game.theQuyen = Q => new Promise(resolve => {
    try { show(Q, resolve); } catch (e) { console.error('the-quyen', e); if (S?.mine && game.uiOpen === 'the-quyen') game.uiOpen = false; S = null; if (root) root.hidden = true; resolve(); }
  });
  game.sfxWarm?.([K.sfx.open, K.sfx.name, K.sfx.name_khep, ...K.sfx.line, K.sfx.ok].filter(Boolean).map(v => arr(v)[0]));
}
