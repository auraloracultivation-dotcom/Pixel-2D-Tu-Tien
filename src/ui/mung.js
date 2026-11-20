// Mừng mạnh lên (docs/10-CAI-HON.md việc 4b; chủ dự án 14/11/2026 17:25: "tẩy luyện với nâng cấp cũng có hiệu ứng chúc mừng… nói chung mạnh lên là
// phải chúc mừng"). Một màn mừng ngắn hiện giữa màn mỗi khi người chơi vừa tự tay làm mình mạnh lên trong một bảng: cường hoá thành công, tẩy luyện mở
// dòng mới, luyện pháp bảo, nâng cấp chiêu, động phủ, linh thú… Nơi gọi đưa tờ khai: game.mung({ kind, lvl, ray, ico | spr, badge, title, lines, gain, fx, quiet }).
// Khác nghi lễ nhận thưởng (reward-show.js): không giữ tay người chơi. Lớp này không nhận chạm (bấm Cường tiếp được ngay, lần thành công kế diễn lại
// từ đầu) và tự tan. Nhịp: nền tối nhẹ → món bật ra giữa màn, loé trắng, tia lửa toé (fx 'lua': rèn) hoặc bụi sao bay lên (fx 'sao': tẩy luyện) → vầng
// sáng nở sau món → số "+N" đập vào góc món → dải chữ thả xuống → từng dòng chỉ số đổi → "Lực chiến ▲ +N" chạy số → tan.
// Việc càng khó (cấp cường hoá cao, dòng màu cao) diễn càng lớn: lvl 0..3 (vầng sáng to hơn, nhiều hạt hơn, chớp sáng, tiếng dày hơn, giữ lâu hơn).
// Mọi chuyển động tính theo giờ game từng khung (phòng đo tools/do-don/quay-mung.mjs quay lại được); hạt bay theo công thức, không nhớ gì giữa hai khung.
// Số, chữ, tiếng: data/juice.json → mung (mung.on tắt: chỉ máy mở địa chỉ có ?mung=1 thấy). Kiểu: mung.css. Chữ chỉ gán textContent.
import { goc } from '../core/build.js';
import { createRays } from './reward-rays.js';
import { spriteIcon } from './sprite-icon.js';

export const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
export const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const back = k => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;   // vọt quá đà một chút rồi về 1
export const set = (e, p, v) => { if (e['_' + p] !== v) { e['_' + p] = v; e.style[p] = v; } };
export const num = n => Math.abs(n).toLocaleString('vi-VN');
export const arr = v => [].concat(v);   // tiếng ghi "tên" hoặc ["tên", độ to]
export const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // số "ngẫu nhiên" cố định theo thứ tự hạt
export const rgb = hex => { const v = parseInt(hex.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
export const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
const LUA = ['#ffffff', '#fff3b0', '#ffc94a', '#ff8f2e', '#c9461c'], TAU = Math.PI * 2;   // tia lửa: trắng → vàng → cam → đỏ than

let ON = null;
export function mungOn(game) {
  if (ON != null) return ON;
  const C = game.data.juice?.mung; let v = null;
  try { const q = new URLSearchParams(location.search).get('mung'); if (q != null) localStorage.setItem('p2d-mung', q); v = localStorage.getItem('p2d-mung'); } catch { /* không có kho nhớ: theo mặc định */ }
  return (ON = !!C && (v != null ? v === '1' : !!C.on));
}

export function createMung(game) {
  const C = game.data.juice?.mung;
  if (!C || !mungOn(game)) return;
  const T = C.t, X = C.text;
  let root = null, S = null, raf = 0;
  { const l = el('link'); l.rel = 'stylesheet'; l.href = goc('src/ui/mung.css'); document.head.append(l); }   // tải kiểu ngay lúc vào game: lần mừng đầu tiên không bị vỡ hình vì chờ kiểu
  const loop = () => { raf = 0; if (S) paint(); if (S) raf = requestAnimationFrame(loop); };
  // khung vầng sáng và hạt: mỗi điểm ảnh phủ một số nguyên điểm thật của màn hình (như reward-show.js)
  const grid = size => { const dpr = window.devicePixelRatio || 1, m = Math.max(1, Math.round(C.px * dpr)), n = Math.round(size * dpr / m); return { n, css: n * m / dpr }; };

  function show(K) {
    const lvl = cl(K.lvl | 0, 0, 3), G = grid(Math.min(C.size[lvl], window.innerWidth - 8)), ray = K.ray || C.ray.enhance, c = rgb(ray);
    root ||= document.body.appendChild(el('div', 'mung')); root.id = 'mung'; root.textContent = ''; root.hidden = false;
    const dim = el('div', 'm-dim'), flash = el('div', 'm-flash'), col = el('div', 'm-col'), stage = el('div', 'm-stage');
    const rays = createRays(ray, lvl, G.n), fx = el('canvas', 'm-fx'), ico = el('i', 'm-ico'), badge = el('b', 'm-badge', K.badge || ''), title = el('div', 'm-title');
    stage.style.width = stage.style.height = G.css + 'px'; rays.canvas.className = 'm-rays'; fx.width = fx.height = G.n;
    ico.style.width = ico.style.height = C.icon + 'px';
    if (K.spr) ico.append(spriteIcon(game, K.spr.id, K.spr.frame || 0, C.icon, 'm-spr')); else ico.style.backgroundImage = K.ico || '';
    title.append(el('span', null, K.title || '')); title.style.top = Math.round(G.css / 2 - C.icon / 2 - 42) + 'px';
    stage.append(rays.canvas, ico, fx, badge, title);
    const box = el('div', 'm-lines'), lines = [];
    box.style.marginTop = -Math.round(G.css / 2 - C.icon / 2 - 10) + 'px'; box.style.setProperty('--g', ray);   // các dòng kéo lên ngay dưới chân món, trên một tấm nền tối (mung.css) cho chữ màu nào cũng đọc được
    for (const l of K.lines || []) {
      const d = box.appendChild(el('div', 'm-line' + (l.big ? ' big' : '')));
      if (l.from != null) d.append(el('span', null, l.label + ' '), el('s', null, l.from), el('i', null, ' → '), el('b', null, l.to)); else d.textContent = l.text;
      if (l.color) d.style.color = l.color;
      lines.push(d);
    }
    const pow = el('div', 'm-pow'), pv = el('b'), gain = Math.max(0, Math.round(K.gain || 0));
    pow.append(X.power + ' ', pv); pow.hidden = !gain;
    col.append(stage, box, pow); root.append(dim, flash, col);
    col.style.top = Math.round(window.innerHeight * C.y - G.css / 2) + 'px';
    const tPow = T.line + lines.length * T.gap, tEnd = tPow + (gain ? 0.4 : 0) + T.hold[lvl];
    S = { K, lvl, gain, t0: game.time, n: G.n, rays, fx, g: fx.getContext('2d'), dim, flash, ico, badge, title, box, lines, pow, pv, tPow, tEnd, fired: {},
      pal: K.fx === 'sao' ? ['#ffffff', mix(c, [255, 255, 255], 0.6), mix(c, [255, 255, 255], 0.25), ray] : LUA };
    game.fpsHi = performance.now() + (tEnd + T.out + 0.3) * 1000;   // đang diễn: vẽ đủ khung cho mượt (core/perf.js)
    paint(); if (!raf) raf = requestAnimationFrame(loop);
  }

  // Hạt: vị trí tính thẳng từ thời gian (a giây kể từ lúc món bật ra) nên quay lại từng khung lúc nào cũng ra đúng hình đó
  function drawFx(a) {
    const { g, n, lvl, pal } = S, c = (n - 1) / 2, u = n / 120, N = C.sparks[lvl], sao = S.K.fx === 'sao';
    g.clearRect(0, 0, n, n);
    for (let i = 0; i < N; i++) {
      const born = sao ? rnd(i + 11) * 0.5 : rnd(i + 11) * 0.06, life = sao ? 0.5 + rnd(i + 3) * 0.4 : 0.34 + rnd(i + 3) * 0.3, t = a - born, k = t / life;
      if (t < 0 || k >= 1) continue;
      let x, y;
      if (sao) {   // bụi sao: hiện quanh món rồi bay chậm lên, lượn nhẹ
        const an = rnd(i) * TAU, r = 14 + rnd(i + 7) * 30;
        x = c + (Math.cos(an) * r + Math.sin(t * 6 + i) * 2) * u; y = c + (Math.sin(an) * r * 0.7 - t * (22 + rnd(i + 5) * 26)) * u;
      } else {     // tia lửa: toé lên từ chỗ búa gõ rồi rơi
        const an = -Math.PI / 2 + (rnd(i) - 0.5) * 2.7, v = 55 + rnd(i + 7) * 100;
        x = c + Math.cos(an) * v * t * u; y = c + (Math.sin(an) * v * t + 150 * t * t) * u;
      }
      g.fillStyle = pal[Math.min(pal.length - 1, Math.floor(k * pal.length))];
      const s = k < 0.45 ? 2 : 1;   // hạt mới to, sắp tàn nhỏ lại
      g.fillRect(Math.round(x), Math.round(y), s, s);
    }
  }

  // Một nhịp có tiếng: tới giờ thì phát đúng một lần
  const beat = (key, at, a, name) => { if (name && a >= at && !S.fired[key]) { S.fired[key] = 1; game.sfx(...arr(name)); } };

  function paint() {
    const a = game.time - S.t0, o = cl((a - S.tEnd) / T.out), L = S.lvl;
    if (o >= 1) { root.hidden = true; root.textContent = ''; S = null; return; }
    const Q = S.K.quiet || {};   // quiet: nơi gọi đã tự phát tiếng ấy (nâng cấp pháp bảo: tiếng búa; đục ô: tiếng mừng)
    if (!Q.hit) beat('hit', 0, a, C.sfx.hit[S.K.kind] || C.sfx.hit.enhance);
    if (!Q.burst) beat('burst', T.badge, a, C.sfx.burst[L]);
    set(S.dim, 'opacity', (C.dim * cl(a / T.dim) * (1 - o)).toFixed(3));
    set(S.flash, 'opacity', (a < 0.22 ? C.flash[L] * (1 - a / 0.22) : 0).toFixed(3));
    const kr = cl((a - T.ray) / 0.28);
    if (S.tr !== game.time) { S.tr = game.time; S.rays.draw(a, kr <= 0 ? 0 : 0.25 + 0.75 * (1 - (1 - kr) ** 3)); drawFx(a); }
    set(S.rays.canvas, 'opacity', (kr > 0 ? 1 - o : 0).toFixed(2)); set(S.fx, 'opacity', (1 - o).toFixed(2));
    set(S.ico, 'transform', `translate(-50%, -50%) scale(${back(cl(a / T.pop)).toFixed(3)})`); set(S.ico, 'opacity', (1 - o).toFixed(2));
    set(S.ico, 'filter', a < 0.14 ? `brightness(${(1 + 3 * (1 - a / 0.14)).toFixed(2)})` : '');   // loé trắng lúc búa gõ
    const kb = cl((a - T.badge) / 0.18);   // số +N: từ to gấp 2,4 đập xuống, lún nhẹ rồi về cỡ
    set(S.badge, 'opacity', (a >= T.badge ? 1 - o : 0).toFixed(2)); set(S.badge, 'transform', `scale(${(2.4 - 1.4 * back(kb)).toFixed(3)})`);
    const tt = cl((a - T.title) / 0.16);
    set(S.title, 'opacity', (tt * (1 - o)).toFixed(2)); set(S.title, 'transform', `translate(-50%, ${Math.round((1 - back(tt)) * -16)}px)`);
    set(S.box, 'opacity', (cl((a - T.line + 0.05) / 0.12) * (1 - o)).toFixed(2));
    S.lines.forEach((d, i) => {
      const at = T.line + i * T.gap, k = cl((a - at) / 0.13);
      set(d, 'opacity', k.toFixed(2)); set(d, 'transform', `scale(${(1.4 - 0.4 * k).toFixed(3)})`);
      beat('l' + i, at, a, C.sfx.line[Math.min(i, C.sfx.line.length - 1)]);
    });
    const kw = cl((a - S.tPow) / 0.14), kc = cl((a - S.tPow) / 0.4), pt = '▲ +' + num(Math.round(S.gain * (1 - (1 - kc) ** 3)));
    set(S.pow, 'opacity', (kw * (1 - o)).toFixed(2)); set(S.pow, 'transform', `scale(${(1.3 - 0.3 * kw).toFixed(3)})`);
    if (S.pv.textContent !== pt) S.pv.textContent = pt;
    if (S.gain) beat('pow', S.tPow, a, C.sfx.pow);
  }

  game.mung = K => { try { show(K); } catch (e) { console.error('mung', e); } };   // lỗi ở màn mừng không được làm hỏng việc vừa làm
  game.sfxWarm?.([...Object.values(C.sfx.hit), ...C.sfx.burst, ...C.sfx.line, C.sfx.pow].filter(Boolean).map(v => arr(v)[0]));
}
