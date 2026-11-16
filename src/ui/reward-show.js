// Màn nghi lễ nhận thưởng (docs/10-CAI-HON.md việc 4; src/game/reward.js quyết món nào diễn kiểu nào rồi gọi game.rewardShow(món, 'full' | 'mini')).
// Bản đầy đủ, theo lời chủ dự án 14/11/2026 00:15: nền tối lại → vầng sáng nở ra và xoay sau lưng (src/ui/reward-rays.js) → món đồ bật ra giữa màn →
// dải chữ "Chúc mừng nhận được" trên đầu món → tên món theo màu phẩm → từng dòng chỉ số hiện lần lượt, mỗi dòng một tiếng đàn → lực chiến đổi bao nhiêu →
// nút Mặc ngay / Cất vào túi. Chạm sớm thì hiện hết luôn (không đóng). Phẩm càng cao vầng sáng càng lớn, nhiều tia, chớp sáng, tiếng càng dày.
// Thẻ nhỏ: món phẩm vừa vừa, hoặc lúc đang bận (đánh nhau, Tự hành): hiện vài giây giữa màn, không dừng game, chạm thẻ để xem bản đầy đủ.
// Mọi chuyển động tính theo giờ game từng khung (không dùng hiệu ứng CSS chạy theo giờ thật) để phòng đo tools/do-don/ bước từng khung quay lại đúng.
// Giờ từng nhịp, cỡ, chữ: data/juice.json → reward. Kiểu: reward-show.css. Chữ chỉ gán textContent.
import { createRays } from './reward-rays.js';
import { grade } from '../game/tiers.js';
import { equip, itemName, statText } from '../game/items.js';
import { mainStats, powerGain } from './bag-detail.js';
import { lineText } from './hc-text.js';
import { rewardOn, rewardSettled } from '../game/reward.js';
import { spriteIcon } from './sprite-icon.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const back = k => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;   // vọt quá đà một chút rồi về 1
const set = (e, p, v) => { if (e['_' + p] !== v) { e['_' + p] = v; e.style[p] = v; } };   // chỉ ghi kiểu khi giá trị đổi
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const num = n => Math.abs(n).toLocaleString('vi-VN');
const arr = v => [].concat(v);   // tiếng ghi "tên" hoặc ["tên", độ to]

export function createRewardShow(game) {
  const C = game.data.juice?.reward, data = game.data;
  if (!C) return;
  const T = C.t, X = C.text, queue = [], waits = new Map();   // waits: món đang diễn theo lời hứa của game.rewardGive → hàm báo xong
  let css = false, root = null, mini = null, S = null, M = null, raf = 0;
  const style = () => { if (css) return; css = true; const l = el('link'); l.rel = 'stylesheet'; l.href = new URL(`./reward-show.css?v=${ver()}`, import.meta.url).href; document.head.append(l); };
  const loop = () => { raf = 0; if (S) paint(); if (M) paintMini(); if (S || M) raf = requestAnimationFrame(loop); };
  const run = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const tierOf = it => { const g = grade(data, it), t = data.items.line_tiers.list[g.idx] || {}; return { g, ray: t.color || g.color, ink: t.edge ? '#ffd6d6' : g.color, lvl: C.lvl[cl(g.idx, 0, C.lvl.length - 1)] }; };
  const icoUrl = it => { const A = data.art.sprites, s = A['ui.vk-' + it.base] || A['ui.ic-' + data.items.bases[it.base]?.slot]; return s ? `url("${s.file}?v=${s.v}")` : ''; };
  // khung vầng sáng: mỗi điểm ảnh phủ một số nguyên điểm thật của màn hình (máy 3x: 4 điểm) cho mẫu chấm đều, không vằn
  const grid = size => { const dpr = window.devicePixelRatio || 1, m = Math.max(1, Math.round(C.px * dpr)), n = Math.round(size * dpr / m); return { n, css: n * m / dpr }; };

  // Tờ khai của một phần thưởng cho màn diễn. Món trang bị trong túi: tự khai từ món. Phần thưởng khác (pháp bảo trao trong truyện…): nơi gọi đưa sẵn
  // { qua: { ray: màu vầng sáng, ink: màu tên, lvl, name, tag: nhãn phẩm, sub, lines: [{ text, color, main, desc }], spr: { id, frame } hình trong data/art.json
  // (hoặc node: hàm (cỡ) trả phần tử hình),
  // gain: lực chiến đã tăng (null: không ghi) } }: coi như đã nhận xong, chỉ có một nút Tiếp tục.
  function khai(it) {
    if (it.qua) return { worn: true, cur: false, inBag: false, lines: [], ...it.qua };
    const { g, ray, ink, lvl } = tierOf(it), slot = data.items.bases[it.base].slot, inBag = game.save.bag.includes(it);
    const worn = game.save.equip[slot] === it.uid, cur = !worn && game.save.equip[slot] != null;
    const lines = Object.entries(mainStats(data, game.save, it)).map(([k, v]) => ({ text: statText(data, k, v), main: true }));
    for (const l of it.lines || []) { const t = Number.isInteger(l.t) ? data.items.line_tiers.list[l.t] : null; lines.push({ text: '◆ ' + lineText(data, l), color: t ? (t.edge ? '#ffd6d6' : t.color) : '' }); }
    return { ray, ink, lvl, name: itemName(data, it), tag: g.name, sub: fill(X.sub, { slot: data.items.slots[slot], lvl: it.lvl || 0 }), lines, ico: icoUrl(it), inBag, worn, cur, gain: inBag && !worn ? Math.round(powerGain(game, it)) : worn ? null : 0 };
  }

  // tap: người chơi tự chạm thẻ nhỏ để xem (không tự đóng dù đang Tự hành / Tự đánh)
  function open(it, tap) {
    style();
    if (game.rwWait?.it === it) game.rwWait = null;
    if (M?.it === it) hideMini();
    const K = khai(it), lvl = K.lvl, G = grid(Math.min(C.size[lvl], window.innerWidth - 8));
    root ||= document.body.appendChild(el('div')); root.id = 'qua'; root.className = ''; root.textContent = ''; root.hidden = false;
    const dim = el('div', 'q-dim'), flash = el('div', 'q-flash'), col = el('div', 'q-col'), title = el('div', 'q-title');
    title.append(el('span', null, X.title));
    const stage = el('div', 'q-stage'), rays = createRays(K.ray, lvl, G.n), ico = el('i', 'q-ico');
    stage.style.width = stage.style.height = G.css + 'px'; rays.canvas.className = 'q-rays';
    ico.style.width = ico.style.height = C.icon + 'px';
    if (K.spr) ico.append(spriteIcon(game, K.spr.id, K.spr.frame || 0, C.icon * 1.5, 'q-spr'));   // hình là một khung trong tấm hình nhiều khung (pháp bảo): vẽ lên canvas
    else if (K.node) { const n = K.node(Math.round(C.icon * 0.9)); Object.assign(n.style, { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }); ico.append(n); }   // nơi gọi tự dựng hình (quà triệu hồi: ngọc, thú cưỡi, áo…)
    else ico.style.backgroundImage = K.ico;
    stage.append(rays.canvas, ico, title);
    title.style.top = Math.round(G.css / 2 - C.icon / 2 - 46) + 'px';
    const plate = el('div', 'q-plate'), name = el('div', 'q-name', K.name), sub = el('div', 'q-sub');
    sub.append(el('b', null, K.tag), el('span', null, K.sub));   // nhãn phẩm tô màu phẩm, rồi ô và cấp
    name.style.color = K.ink; plate.style.setProperty('--g', K.ink); plate.style.marginTop = -Math.round(G.css / 2 - C.icon / 2 - 28) + 'px';   // bảng tên kéo lên dưới chân món, nằm trên phần đuôi tia đã thưa
    plate.append(name, sub);
    const stats = el('div', 'q-stats'), lines = [];
    for (const l of K.lines) { const d = stats.appendChild(el('div', l.desc ? 'q-line q-desc' : l.main ? 'q-main' : 'q-line', l.text)); if (l.color) d.style.color = l.color; lines.push(d); }   // desc: câu mô tả dài (pháp bảo), cho xuống dòng
    const worn = K.worn, cur = K.cur, inBag = K.inBag, gain = K.gain ?? 0, noPow = K.gain == null;
    const pow = el('div', 'q-pow' + (gain > 0 ? ' up' : gain < 0 ? ' down' : '')), pv = el('b');
    pow.append(noPow ? X.worn : X.power + ' ', pv);
    if (noPow && it.qua) pow.hidden = true;
    const btns = el('div', 'q-btns'), bWear = el('button', 'q-btn', cur ? X.swap : X.wear), bKeep = el('button', 'q-btn', worn || !inBag ? X.ok : X.keep);
    bWear.type = bKeep.type = 'button'; (gain > 0 && !worn && inBag ? bWear : bKeep).classList.add('go');
    if (worn || !inBag) bWear.hidden = true;
    btns.append(bWear, bKeep);
    const hint = el('div', 'q-hint', X.skip);
    col.append(stage, plate, stats, pow, btns); root.append(dim, flash, col, hint);
    // màn thấp (máy nhỏ, cầm ngang): thu cả khối lại, đẩy lên cho hàng nút không lọt khỏi màn (phần tia phía trên dải chữ được phép tràn ra ngoài)
    const H = window.innerHeight, need = col.offsetHeight, over = Math.max(0, G.css / 2 - C.icon / 2 - 54), k = Math.min(1, (H - 10) / (need - over));
    col.style.top = Math.round(Math.min(H * C.y - G.css / 2, H - 6 - need * k)) + 'px'; col.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : '';
    const tPow = T.stats + lines.length * T.line + 0.08, tEnd = tPow + T.end;
    S = { it, lvl, gain, worn: noPow, tap, born: performance.now(), t0: game.time, tPow, tEnd, rays, dim, flash, col, title, stage, ico, plate, name, sub, lines, go: gain > 0 && !worn && inBag ? bWear : bKeep, pow, pv, btns, hint, fired: {}, out: null, mine: !game.uiOpen, shown: performance.now() };
    if (S.mine) game.uiOpen = 'qua';
    game.fpsHi = performance.now() + (tEnd + 0.5) * 1000;   // lúc món hiện ra, chỉ số chạy: vẽ đủ khung cho mượt (core/perf.js), xong lại về nhịp tiết kiệm
    bWear.onclick = e => { e.stopPropagation(); close('wear'); };
    bKeep.onclick = e => { e.stopPropagation(); close('keep'); };
    root.onpointerdown = e => {   // chạm sớm: hiện hết luôn, không đóng (0,6 giây đầu chưa nhận: đang bấm nút đánh liên tục thì khỏi lỡ tay)
      if (e.target.closest?.('button')) return;
      e.preventDefault();
      if (S && !S.out && game.time - S.t0 < S.tEnd && performance.now() - S.born > 600) { S.t0 = game.time - S.tEnd; S.fired.skip = 1; S.shown = performance.now(); game.fpsHi = performance.now() + 500; }
    };
    game.sfx(...arr(C.sfx.open));
    paint(); run();
  }

  // Một nhịp có tiếng: tới giờ thì phát đúng một lần (đã chạm xem nhanh thì thôi các tiếng lẻ)
  const beat = (key, at, a, name) => { if (a >= at && !S.fired[key]) { S.fired[key] = 1; if (!S.fired.skip || key === 'burst') game.sfx(...arr(name)); } };

  function paint() {
    const a = game.time - S.t0, o = S.out ? cl((game.time - S.out.t) / T.out) : 0, F = C.flash[S.lvl] || 0;
    beat('burst', T.burst, a, C.sfx.burst[S.lvl]);
    set(S.dim, 'opacity', (C.dim * cl(a / T.dim) * (1 - o)).toFixed(3));
    const kr = cl((a - (T.burst - 0.1)) / 0.3), over = a < T.burst + 0.4 ? 1 + 0.07 * Math.sin(cl((a - T.burst) / 0.4) * Math.PI) : 1;
    if (S.tr !== game.time) { S.tr = game.time; S.rays.draw(a, kr <= 0 ? 0 : 0.25 + 0.75 * (1 - (1 - kr) ** 3)); }
    set(S.rays.canvas, 'opacity', (kr > 0 ? 1 - o : 0).toFixed(2));
    set(S.rays.canvas, 'transform', `scale(${(over * (1 - 0.5 * o)).toFixed(3)})`);
    const b = a - T.burst, kp = cl(b / T.pop), sc = b < 0 ? 0 : back(kp) * (1 - 0.75 * o), bob = b > T.pop ? Math.round(Math.sin((b - T.pop) * 2.4) * 3) : 0;
    const fly = S.out ? (S.out.how === 'wear' ? -1 : 1) * 46 * o * o : 0;
    set(S.ico, 'transform', `translate(-50%, -50%) translateY(${bob + fly}px) scale(${sc.toFixed(3)})`);
    set(S.ico, 'opacity', (b < 0 ? 0 : 1 - o).toFixed(2));
    const wf = S.out?.how === 'wear' ? 1 + 3 * (1 - cl((game.time - S.out.t) / 0.12)) : 1;   // bấm Mặc: món loé sáng rồi bay lên
    set(S.ico, 'filter', b >= 0 && b < 0.16 ? `brightness(${(1 + 3 * (1 - b / 0.16)).toFixed(2)})` : wf > 1.01 ? `brightness(${wf.toFixed(2)})` : '');
    set(S.flash, 'opacity', (b >= 0 && b < 0.25 ? F * (1 - b / 0.25) : 0).toFixed(3));
    const tt = cl((a - T.title) / 0.16);
    set(S.title, 'opacity', (tt * (1 - o)).toFixed(2)); set(S.title, 'transform', `translate(-50%, ${Math.round((1 - back(tt)) * -18)}px)`);
    const tn = cl((a - T.name) / 0.14), ts = cl((a - T.name - 0.08) / 0.14);
    set(S.plate, 'opacity', (tn * (1 - o)).toFixed(2)); set(S.name, 'transform', `scale(${(1.25 - 0.25 * tn).toFixed(3)})`);
    set(S.sub, 'opacity', ts.toFixed(2));
    S.lines.forEach((d, i) => {
      const at = T.stats + i * T.line, k = cl((a - at) / 0.12);
      set(d, 'opacity', (k * (1 - o)).toFixed(2)); set(d, 'transform', `translateX(${Math.round((1 - k) * -12)}px)`);
      beat('l' + i, at, a, C.sfx.line[Math.min(i, C.sfx.line.length - 1)]);
    });
    const kw = cl((a - S.tPow) / 0.14), kc = cl((a - S.tPow) / 0.4), shown = Math.round(S.gain * (1 - (1 - kc) ** 3));
    set(S.pow, 'opacity', (kw * (1 - o)).toFixed(2)); set(S.pow, 'transform', `scale(${(1.3 - 0.3 * kw).toFixed(3)})`);
    const pt = S.worn ? '' : (S.gain > 0 ? '▲ +' : S.gain < 0 ? '▼ −' : '± ') + num(shown);
    if (S.pv.textContent !== pt) S.pv.textContent = pt;
    const ke = cl((a - S.tEnd) / 0.15);
    set(S.btns, 'opacity', (ke * (1 - o)).toFixed(2)); set(S.btns, 'transform', `translateY(${Math.round((1 - ke) * 8)}px)`);
    const ready = ke >= 1 && !S.out && performance.now() - S.shown > 250;   // nút chỉ nhận chạm sau khi đã hiện rõ (khỏi bấm nhầm lúc chạm xem nhanh)
    if (ready !== S.ready) { S.ready = ready; root.classList.toggle('ready', ready); }
    set(S.go, 'filter', ke >= 1 && !S.out ? `brightness(${(1.42 + 0.2 * Math.sin((a - S.tEnd) * 5.2)).toFixed(2)}) saturate(1.15)` : '');   // nút nên bấm sáng lên theo nhịp
    set(S.hint, 'opacity', (a > 0.5 && a < S.tEnd ? 0.75 : 0).toFixed(2));
    if (!S.out && !S.tap && (game.pilot || game.auto) && a > S.tEnd + T.auto) close('keep');   // phần thưởng trao lúc đang Tự hành / Tự đánh: tự cất sau ít giây, không giữ chân
    if (S.out && o >= 1) finish();
  }

  function close(how) {
    if (!S || S.out) return;
    const it = S.it;
    if (how === 'wear' && game.save.bag.includes(it)) { equip(game.save, data, it.uid); game.refreshStats(); game.persist(); game.sfx(...arr(C.sfx.wear)); }
    else game.sfx(...arr(C.sfx.keep));
    S.out = { t: game.time, how }; root.classList.remove('ready'); game.fpsHi = performance.now() + 700;
  }
  function finish() {
    root.hidden = true; root.textContent = '';
    if (S.mine && game.uiOpen === 'qua') game.uiOpen = false;
    waits.get(S.it)?.();
    S = null;
    if (queue.length) open(queue.shift());
  }

  // ---- thẻ nhỏ ----
  function showMini(it) {
    style();
    const { g, ray, ink, lvl } = tierOf(it), G = grid(72);
    mini ||= document.body.appendChild(el('div')); mini.id = 'qua-mini'; mini.textContent = ''; mini.hidden = false;
    const box = el('div', 'qm-ico'), rays = createRays(ray, Math.min(1, lvl), G.n), ico = el('i'), txt = el('div', 'qm-txt');
    rays.canvas.style.width = rays.canvas.style.height = G.css + 'px'; ico.style.backgroundImage = icoUrl(it);
    box.append(rays.canvas, ico);
    const nm = el('b', null, itemName(data, it)); nm.style.color = ink;
    txt.append(el('small', null, X.mini), nm, el('em', null, `${g.name} · ${X.mini_tap}`));
    mini.append(box, txt); mini.style.setProperty('--g', ink);
    mini.style.top = Math.round(window.innerHeight * C.mini.y) + 'px';
    M = { it, t0: game.time, rays };
    mini.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); if (!S) { hideMini(); open(it, true); } };
    game.sfx(...arr(C.sfx.mini));
    paintMini(); run();
  }
  const hideMini = () => { if (mini) mini.hidden = true; M = null; };
  function paintMini() {
    const a = game.time - M.t0, L = C.mini, ki = cl(a / L.in), ko = cl((a - L.life) / L.out);
    if (ko >= 1) { hideMini(); return; }
    if (M.tr !== game.time) { M.tr = game.time; M.rays.draw(a, 1); }
    set(mini, 'opacity', (ki * (1 - ko)).toFixed(2));
    set(mini, 'transform', `translate(-50%, ${Math.round((1 - back(ki)) * -14 - ko * 8)}px)`);
  }

  game.rewardShow = (it, mode) => {
    if (mode !== 'full') { showMini(it); return; }
    if (S) queue.push(it); else open(it);
  };
  // Phần thưởng trao hẳn hoi (cốt truyện: game.giveReward): luôn diễn đầy đủ dù phẩm thấp. Trả lời hứa, xong khi người chơi đóng nghi lễ (công tắc tắt:
  // xong ngay) để lời thoại kế tiếp chờ được. Mở sau khi nhát kết liễu vừa rồi diễn xong (chờ tối đa 1,5 giây); quá 60 giây chưa đóng thì cứ cho truyện
  // đi tiếp, không để kẹt.
  game.rewardGive = it => new Promise(res => {
    if (!rewardOn(game)) { res(); return; }
    const t0 = performance.now(), done = () => { waits.delete(it); res(); };
    const go = () => {
      if (!rewardSettled(game) && performance.now() - t0 < 1500) { setTimeout(go, 50); return; }
      waits.set(it, done); setTimeout(done, 60000);
      try { game.rwLast = game.time; game.rewardShow(it, 'full'); } catch (e) { done(); throw e; }
    };
    go();
  });
  if (rewardOn(game)) { style(); game.sfxWarm?.([C.sfx.open, ...C.sfx.burst, ...C.sfx.line, C.sfx.wear, C.sfx.keep, C.sfx.mini].map(v => arr(v)[0])); }
}
