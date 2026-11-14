// Mừng tu vi lên (docs/10-CAI-HON.md việc 4b; chủ dự án 14/11/2026 17:38: "cả hiệu ứng thăng tiểu cảnh giới và đại cảnh giới"). Hai màn, tờ khai do
// src/game/len-tang.js đưa:
//   game.mungTang({ color, title, name, cells: { n, from, to }, lines, gain, done }): thẻ LÊN TẦNG. Hiện ngay trên đầu nhân vật (đáy thẻ ở mung.tang.y bề
//     cao màn, trên đầu cột sáng), không che nhân vật, không nhận chạm. Nhịp: dải chữ "Đột phá" thả xuống → tên tầng bật ra → thang chín ô (ô đã đạt vàng
//     sẵn) sáng thêm ô vừa đạt, mỗi ô một nốt đàn → chỉ số trước → sau, quà tu vi → "Lực chiến ▲ +N" chạy số → tự tan, gọi done(). Lên tầng nữa lúc thẻ
//     còn hiện thì diễn lại từ đầu với số mới.
//   game.mungCanh({ color, title, name, sub, lines, gain, done }): nghi lễ ĐỘT PHÁ CẢNH GIỚI, cả màn. Nhịp: nền tối, chớp trắng → vầng sáng màu cảnh
//     giới mới nở sau lưng → nhân vật bật ra giữa màn, đốm sáng bay lên quanh người → dải chữ "Độ kiếp thành công" → TÊN CẢNH GIỚI đập xuống (hạt toé,
//     khối chữ nảy) → "cũ → mới" → từng dòng chỉ số, gia trì, quà (mỗi dòng một nốt đàn đi lên) → "Lực chiến ▲ +N" chạy số → nút Tiếp tục.
//     Chạm sớm: hiện hết luôn (không đóng). Đang Tự hành / Tự đánh: tự đóng sau ít giây. Đóng xong gọi done().
// Mọi chuyển động tính theo giờ game từng khung (phòng đo tools/do-don/quay-mung.mjs quay lại được); hạt bay theo công thức, không nhớ gì giữa hai khung.
// Số, chữ, tiếng: data/juice.json → mung.tang, mung.canh. Kiểu: mung.css. Chữ chỉ gán textContent.
import { createRays } from './reward-rays.js';
import { spriteIcon } from './sprite-icon.js';
import { heroLook } from '../render/draw-hero.js';
import { mungOn, el, cl, back, set, num, arr, rnd, rgb, mix } from './mung.js';

const TAU = Math.PI * 2;
// Một dòng: { text } hoặc { label, from, to } "Công 13 → 14", hoặc { pairs: [{ label, from, to }, …] } nhiều chỉ số chung một dòng
function lineEl(l) {
  const d = el('div', 'm-line' + (l.soft ? ' soft' : l.gift ? ' gift' : '') + (l.wrap ? ' wrap' : ''));
  if (l.text != null) { d.textContent = l.text; return d; }
  (l.pairs || [l]).forEach((q, i) => d.append(el('span', null, (i ? ' · ' : '') + q.label + ' '), el('s', null, q.from), el('i', null, ' → '), el('b', null, q.to)));
  return d;
}
const powEl = (X, gain) => { const pow = el('div', 'm-pow'), pv = el('b'); pow.append(X.power + ' ', pv); pow.hidden = !gain; return { pow, pv }; };

export function createMungCanh(game) {
  const C = game.data.juice?.mung;
  if (!C || !mungOn(game)) return;
  const TG = C.tang, CG = C.canh, X = C.text;
  let card = null, A = null, root = null, B = null, raf = 0;
  const loop = () => { raf = 0; if (A) paintTang(); if (B) paintCanh(); if (A || B) raf = requestAnimationFrame(loop); };
  const run = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const grid = size => { const dpr = window.devicePixelRatio || 1, m = Math.max(1, Math.round(C.px * dpr)), n = Math.round(size * dpr / m); return { n, css: n * m / dpr }; };
  const beat = (S, key, at, a, name) => { if (name && a >= at && !S.fired[key]) { S.fired[key] = 1; if (!S.fired.skip) game.sfx(...arr(name)); } };   // một nhịp có tiếng: tới giờ thì phát đúng một lần

  // ---- thẻ lên tầng ----
  const doneOf = S => { try { S?.K.done?.(); } catch (e) { console.error('mung', e); } };
  function showTang(K) {
    const T = TG.t, old = A;
    A = null; doneOf(old);   // thẻ trước còn hiện: coi như xong (trả các dòng báo nó giữ)
    card ||= document.body.appendChild(el('div', 'mung')); card.id = 'mung-tang'; card.textContent = ''; card.hidden = false;
    card.style.setProperty('--g', K.color); card.style.opacity = '0'; card._opacity = '0';
    // hai tấm nền chồng khít nhau: tấm trên (tên tầng, thang ô) có ngay; tấm dưới (chỉ số, quà, lực chiến) hiện cùng dòng đầu, thẻ như mở dần xuống
    const title = el('div', 'm-title'), plate = el('div', 'm-lines t-top'), more = el('div', 'm-lines t-more'), name = el('div', 't-name', K.name), lad = el('div', 't-lad'), cells = [], lines = [];
    title.append(el('span', null, K.title));
    for (let i = 1; i <= K.cells.n; i++) cells.push(lad.appendChild(el('i', i <= K.cells.from ? 'on' : '', String(i))));
    plate.append(name, lad);
    for (const l of K.lines || []) lines.push(more.appendChild(lineEl(l)));
    const gain = Math.max(0, Math.round(K.gain || 0)), { pow, pv } = powEl(X, gain);
    more.append(pow); card.append(title, plate, more);
    card.style.top = Math.max(TG.top_min, Math.round(window.innerHeight * TG.y - card.offsetHeight)) + 'px';   // đáy thẻ nằm ngay trên đầu nhân vật; máy thấp thì lấn lên vùng nút phía trên chứ không che nhân vật
    const tLine = T.cell + Math.max(0, K.cells.to - K.cells.from - 1) * T.cell_gap + T.line, tPow = tLine + lines.length * T.gap, tEnd = tPow + (gain ? 0.4 : 0) + T.hold;
    A = { K, gain, t0: game.time, title, plate, more, name, lad, cells, lines, pow, pv, tLine, tPow, tEnd, fired: {} };
    game.fpsHi = performance.now() + (tEnd + T.out + 0.3) * 1000;   // đang diễn: vẽ đủ khung cho mượt (core/perf.js)
    paintTang(); run();
  }

  function paintTang() {
    const T = TG.t, a = game.time - A.t0, o = cl((a - A.tEnd) / T.out), { from, to } = A.K.cells;
    if (o >= 1) { const old = A; card.hidden = true; card.textContent = ''; A = null; doneOf(old); return; }
    set(card, 'opacity', (1 - o).toFixed(2)); set(card, 'transform', o > 0 ? `translateY(${Math.round(-8 * o)}px)` : '');
    const tt = cl((a - T.title) / 0.16), kn = cl((a - T.name) / 0.2);
    set(A.title, 'opacity', tt.toFixed(2)); set(A.title, 'transform', `translateY(${Math.round((1 - back(tt)) * -14)}px)`);
    set(A.plate, 'opacity', cl(a / 0.12).toFixed(2)); set(A.more, 'opacity', cl((a - A.tLine + 0.06) / 0.12).toFixed(2));
    set(A.name, 'opacity', cl((a - T.name) / 0.07).toFixed(2)); set(A.name, 'transform', `scale(${(1.55 - 0.55 * back(kn)).toFixed(3)})`);   // tên tầng: từ to đập xuống, lún nhẹ rồi về cỡ
    set(A.lad, 'opacity', cl((a - T.name - 0.06) / 0.12).toFixed(2));
    for (let i = from + 1; i <= to; i++) {   // ô vừa đạt: loé trắng, nảy to rồi về cỡ, thành ô vàng
      const e = A.cells[i - 1], at = T.cell + (i - from - 1) * T.cell_gap, k = cl((a - at) / 0.22);
      if (a >= at && !e._on) { e._on = 1; e.classList.add('on'); }
      set(e, 'transform', a >= at && k < 1 ? `scale(${(1 + 0.75 * (1 - back(k))).toFixed(3)})` : ''); set(e, 'filter', a >= at && k < 1 ? `brightness(${(1 + 2.2 * (1 - k)).toFixed(2)})` : '');
      beat(A, 'c' + i, at, a, TG.sfx.cell[Math.min(i - from - 1, TG.sfx.cell.length - 1)]);
    }
    A.lines.forEach((d, i) => {
      const at = A.tLine + i * T.gap, k = cl((a - at) / 0.13);
      set(d, 'opacity', k.toFixed(2)); set(d, 'transform', `scale(${(1.3 - 0.3 * k).toFixed(3)})`);
      beat(A, 'l' + i, at, a, TG.sfx.line);
    });
    const kw = cl((a - A.tPow) / 0.14), kc = cl((a - A.tPow) / 0.4), pt = '▲ +' + num(Math.round(A.gain * (1 - (1 - kc) ** 3)));
    set(A.pow, 'opacity', kw.toFixed(2)); set(A.pow, 'transform', `scale(${(1.3 - 0.3 * kw).toFixed(3)})`);
    if (A.pv.textContent !== pt) A.pv.textContent = pt;
    if (A.gain) beat(A, 'pow', A.tPow, a, TG.sfx.pow);
  }

  // ---- nghi lễ đột phá cảnh giới ----
  function showCanh(K) {
    const T = CG.t, G = grid(Math.min(CG.size, window.innerWidth - 8)), c = rgb(K.color);
    root ||= document.body.appendChild(el('div', 'mung')); root.id = 'mung-canh'; root.className = 'mung'; root.textContent = ''; root.hidden = false;
    root.style.setProperty('--g', K.color);
    const dim = el('div', 'm-dim'), flash = el('div', 'm-flash'), col = el('div', 'm-col'), stage = el('div', 'm-stage');
    const rays = createRays(K.color, CG.lvl, G.n), fx = el('canvas', 'm-fx'), title = el('div', 'm-title');
    stage.style.width = stage.style.height = G.css + 'px'; rays.canvas.className = 'm-rays'; fx.width = fx.height = G.n;
    // nhân vật: khung đứng yên, phóng nguyên lần cho thân cao chừng CG.body điểm màn; thân nằm giữa vầng sáng, nảy lên từ chân
    const look = heroLook(game), spr = game.data.art.sprites[look.sprite], body = look.body || spr?.h || CG.body, k = Math.max(1, Math.round(CG.body / body)), foot = Math.round(body * k / 2);
    const hero = el('i', 'c-hero'), fig = hero.appendChild(spriteIcon(game, look.sprite, look.anims?.idle?.[0] || 0, 64, '', true));   // khung ngoài: viền mực quanh dáng người (mung.css), nảy; hình bên trong: loé sáng
    if (spr) {
      fig.style.width = spr.w * k + 'px'; fig.style.height = spr.h * k + 'px'; hero.style.transformOrigin = `${spr.anchor[0] * k}px ${spr.anchor[1] * k}px`;
      hero.style.left = Math.round(G.css / 2 - spr.anchor[0] * k) + 'px'; hero.style.top = Math.round(G.css / 2 + foot - spr.anchor[1] * k) + 'px';
    }
    title.append(el('span', null, K.title)); title.style.top = Math.round(G.css / 2 - foot - 48) + 'px';
    stage.append(rays.canvas, hero, fx, title);
    const plate = el('div', 'c-plate'), name = el('div', 'c-name', K.name), sub = el('div', 'c-sub', K.sub || '');
    plate.style.marginTop = -Math.round(G.css / 2 - foot - 12) + 'px';   // bảng tên kéo lên ngay dưới chân nhân vật, nằm trên phần đuôi tia đã thưa
    plate.append(name, sub);
    const box = el('div', 'm-lines'), lines = [];
    for (const l of K.lines || []) lines.push(box.appendChild(lineEl(l)));
    const gain = Math.max(0, Math.round(K.gain || 0)), { pow, pv } = powEl(X, gain);
    const btn = el('button', 'c-btn', X.ok), hint = el('div', 'c-hint', X.skip); btn.type = 'button';
    col.append(stage, plate, box, pow, btn); root.append(dim, flash, col, hint);
    const wide = name.offsetWidth, room = window.innerWidth - 20;   // tên cảnh giới dài (bản dịch: "Foundation Establishment"): thu cỡ chữ cho vừa bề ngang màn
    if (wide > room) name.style.fontSize = Math.floor(parseFloat(getComputedStyle(name).fontSize) * room / wide) + 'px';
    // màn thấp (máy nhỏ, cầm ngang): thu cả khối lại, đẩy lên cho nút không lọt khỏi màn (phần tia phía trên dải chữ được phép tràn ra ngoài)
    const H = window.innerHeight, need = col.offsetHeight, over = Math.max(0, G.css / 2 - foot - 56), ks = Math.min(1, (H - 10) / (need - over));
    col.style.top = Math.round(Math.min(H * CG.y - G.css / 2, H - 6 - need * ks)) + 'px'; col.style.transform = ks < 1 ? `scale(${ks.toFixed(3)})` : '';
    const tPow = T.line + lines.length * T.gap + 0.06, tEnd = tPow + (gain ? 0.4 : 0) + T.end;
    B = { K, gain, t0: game.time, born: performance.now(), shown: performance.now(), n: G.n, u: G.n / G.css, foot, rays, fx, g: fx.getContext('2d'), dim, flash, hero, fig, title, plate, name, sub, lines, pow, pv, btn, hint, tPow, tEnd,
      fired: {}, out: null, mine: !game.uiOpen, pal: ['#ffffff', mix(c, [255, 255, 255], 0.6), mix(c, [255, 255, 255], 0.25), K.color] };
    if (B.mine) game.uiOpen = 'mung';   // dừng thế giới trong lúc diễn (đang Tự hành / Tự đánh thì game vẫn chạy, nghi lễ tự đóng)
    game.fpsHi = performance.now() + (tEnd + 0.5) * 1000;
    btn.onclick = e => { e.stopPropagation(); close(); };
    root.onpointerdown = e => {   // chạm sớm: hiện hết luôn, không đóng (0,6 giây đầu chưa nhận: đang bấm nút đánh liên tục thì khỏi lỡ tay)
      if (e.target.closest?.('button')) return;
      e.preventDefault();
      if (B && !B.out && game.time - B.t0 < B.tEnd && performance.now() - B.born > 600) { B.t0 = game.time - B.tEnd; B.fired.skip = 1; B.shown = performance.now(); game.fpsHi = performance.now() + 500; }
    };
    paintCanh(); run();
  }

  // Hạt quanh nhân vật: vị trí tính thẳng từ thời gian nên quay lại từng khung lúc nào cũng ra đúng hình đó.
  // Đốm sáng bay lên quanh người (lặp mãi tới lúc đóng) + chùm hạt toé ra từ tên cảnh giới lúc tên đập xuống.
  function drawFx(a) {
    const { g, n, pal } = B, T = CG.t, c = (n - 1) / 2, u = n / 120, ny = c + (B.foot + 34) * B.u;
    g.clearRect(0, 0, n, n);
    const dot = (x, y, k) => { g.fillStyle = pal[Math.min(pal.length - 1, Math.floor(k * pal.length))]; const s = k < 0.45 ? 2 : 1; g.fillRect(Math.round(x), Math.round(y), s, s); };
    if (a >= T.pop) for (let i = 0; i < CG.motes; i++) {
      const per = 1.2 + rnd(i + 3), t = (a - T.pop + rnd(i + 11) * per) % per, k = t / per, an = rnd(i) * TAU, r = 15 + rnd(i + 7) * 34;
      if (a - T.pop < t || k > 0.94) continue;   // vòng đầu: đốm nào chưa tới lượt sinh thì chưa hiện
      dot(c + (Math.cos(an) * r + Math.sin(t * 5 + i) * 2) * u, c + (22 + Math.sin(an) * r * 0.45 - t * (20 + rnd(i + 5) * 24)) * u, k);
    }
    const b = a - T.name;
    if (b >= 0) for (let i = 0; i < CG.burst; i++) {
      const life = 0.4 + rnd(i + 23) * 0.35, k = b / life, an = rnd(i + 31) * TAU, v = 45 + rnd(i + 37) * 95;
      if (k < 1) dot(c + Math.cos(an) * v * b * u, ny + (Math.sin(an) * v * 0.55 * b + 70 * b * b) * u, k);
    }
  }

  function paintCanh() {
    const T = CG.t, a = game.time - B.t0, o = B.out ? cl((game.time - B.out.t) / T.out) : 0;
    if (B.out && o >= 1) { finish(); return; }
    set(B.dim, 'opacity', (CG.dim * cl(a / T.dim) * (1 - o)).toFixed(3));
    const bn = a - T.name;   // tên cảnh giới đập xuống: chớp trắng lần hai (nhẹ), khối chữ nảy
    set(B.flash, 'opacity', (a < 0.25 ? CG.flash * (1 - a / 0.25) : bn >= 0 && bn < 0.16 ? CG.flash * 0.45 * (1 - bn / 0.16) : 0).toFixed(3));
    const kr = cl((a - T.ray) / 0.3);
    if (B.tr !== game.time) { B.tr = game.time; B.rays.draw(a, kr <= 0 ? 0 : 0.25 + 0.75 * (1 - (1 - kr) ** 3)); drawFx(a); }
    set(B.rays.canvas, 'opacity', (kr > 0 ? 1 - o : 0).toFixed(2)); set(B.rays.canvas, 'transform', `scale(${(1 - 0.4 * o).toFixed(3)})`);
    set(B.fx, 'opacity', (1 - o).toFixed(2));
    const h = a - T.pop, kh = cl(h / 0.24), bob = h > 0.24 ? Math.round(Math.sin((h - 0.24) * 2.4) * 2) : 0;
    set(B.hero, 'opacity', (h < 0 ? 0 : 1 - o).toFixed(2)); set(B.hero, 'transform', `translateY(${bob}px) scale(${(h < 0 ? 0 : back(kh)).toFixed(3)})`);
    set(B.fig, 'filter', h >= 0 && h < 0.18 ? `brightness(${(1 + 4 * (1 - h / 0.18)).toFixed(2)})` : bn >= 0 && bn < 0.14 ? `brightness(${(1 + 1.5 * (1 - bn / 0.14)).toFixed(2)})` : '');
    const tt = cl((a - T.title) / 0.16);
    set(B.title, 'opacity', (tt * (1 - o)).toFixed(2)); set(B.title, 'transform', `translate(-50%, ${Math.round((1 - back(tt)) * -18)}px)`);
    const kn = cl(bn / 0.22), jolt = bn >= 0.1 && bn < 0.3 ? Math.round(Math.sin((bn - 0.1) / 0.2 * Math.PI * 2) * 3 * (1 - (bn - 0.1) / 0.2)) : 0;
    set(B.plate, 'opacity', (cl(bn / 0.06) * (1 - o)).toFixed(2)); set(B.plate, 'transform', jolt ? `translateY(${jolt}px)` : '');
    set(B.name, 'transform', `scale(${(2.7 - 1.7 * back(kn)).toFixed(3)})`);
    beat(B, 'name', T.name, a, CG.sfx.name);
    set(B.sub, 'opacity', cl((a - T.sub) / 0.16).toFixed(2));
    B.lines.forEach((d, i) => {
      const at = T.line + i * T.gap, k = cl((a - at) / 0.12);
      set(d, 'opacity', (k * (1 - o)).toFixed(2)); set(d, 'transform', `translateX(${Math.round((1 - k) * -12)}px)`);
      beat(B, 'l' + i, at, a, CG.sfx.line[Math.min(i, CG.sfx.line.length - 1)]);
    });
    const kw = cl((a - B.tPow) / 0.14), kc = cl((a - B.tPow) / 0.4), pt = '▲ +' + num(Math.round(B.gain * (1 - (1 - kc) ** 3)));
    set(B.pow, 'opacity', (kw * (1 - o)).toFixed(2)); set(B.pow, 'transform', `scale(${(1.3 - 0.3 * kw).toFixed(3)})`);
    if (B.pv.textContent !== pt) B.pv.textContent = pt;
    if (B.gain) beat(B, 'pow', B.tPow, a, CG.sfx.pow);
    const ke = cl((a - B.tEnd) / 0.15), ready = ke >= 1 && !B.out && performance.now() - B.shown > 250;   // nút chỉ nhận chạm sau khi đã hiện rõ (khỏi bấm nhầm lúc chạm xem nhanh)
    set(B.btn, 'opacity', (ke * (1 - o)).toFixed(2)); set(B.btn, 'transform', `translateY(${Math.round((1 - ke) * 8)}px)`);
    if (ready !== B.ready) { B.ready = ready; root.classList.toggle('ready', ready); }
    set(B.btn, 'filter', ke >= 1 && !B.out ? `brightness(${(1.42 + 0.2 * Math.sin((a - B.tEnd) * 5.2)).toFixed(2)}) saturate(1.15)` : '');   // nút sáng lên theo nhịp
    set(B.hint, 'opacity', (a > 0.6 && a < B.tEnd ? 0.75 : 0).toFixed(2));
    if (!B.out && (game.pilot || game.auto) && a > B.tEnd + T.auto) close();   // đang Tự hành / Tự đánh: tự đóng sau ít giây, không giữ chân
  }

  function close() {
    if (!B || B.out) return;
    game.sfx(...arr(CG.sfx.ok));
    B.out = { t: game.time }; root.classList.remove('ready'); game.fpsHi = performance.now() + 700;
  }
  function finish() {
    const done = B.K.done;
    root.hidden = true; root.textContent = ''; root.classList.remove('ready');
    if (B.mine && game.uiOpen === 'mung') game.uiOpen = false;
    B = null;
    if (CG.sfx.out) game.sfx(...arr(CG.sfx.out));
    try { done?.(); } catch (e) { console.error('mung', e); }
  }

  // Lỗi ở màn mừng không được làm hỏng việc vừa làm: vẫn báo bằng dòng báo thường
  game.mungTang = K => { try { showTang(K); } catch (e) { console.error('mung', e); A = null; if (card) card.hidden = true; game.toast(`${K.title}! ${K.name}`, 2.2); K.done?.(); } };
  game.mungCanh = K => {
    try { showCanh(K); } catch (e) { console.error('mung', e); if (B?.mine && game.uiOpen === 'mung') game.uiOpen = false; B = null; if (root) root.hidden = true; game.toast(`${K.title}! ${K.name}`, 3); K.done?.(); }
  };
  game.sfxWarm?.([...TG.sfx.cell, TG.sfx.pow, CG.sfx.name, ...CG.sfx.line, CG.sfx.pow, CG.sfx.ok, CG.sfx.out].filter(Boolean).map(v => arr(v)[0]));
}
