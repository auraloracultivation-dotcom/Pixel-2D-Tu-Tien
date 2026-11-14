// Thẻ "Hẹn ngày mai" (docs/10-CAI-HON.md việc 5b; số liệu do src/game/hen-mai.js tính): nền tối nhẹ, thẻ giữa màn, ba hàng hiện lần lượt.
//   1. Bế quan lúc vắng: thang chín ô tầng của cảnh giới đang tu. Ô đã đạt sáng vàng; các ô một đêm bế quan sẽ lấp sáng lên từng ô một màu lam, mỗi ô
//      một nốt đàn; dưới thang là thanh linh khí tới tầng kế (trước / sau) và dòng "Nghỉ 8 tiếng: +N linh khí → tới tầng nào".
//   2. Quà ngày mai: quà điểm danh ngày mai, còn mấy ngày tới mốc 7 ngày.
//   3. Bậc kế tiếp: mốc nhận pháp bảo gần nhất, còn mấy tầng.
// Rồi một câu của Hệ Thống và nút Chơi tiếp. Chạm sớm thì hiện hết luôn. Mọi chuyển động tính theo giờ game từng khung (phòng đo quay lại được),
// chỉ xin khung hình trong lúc thẻ đang hiện. Kiểu: hen-mai.css. Giờ từng nhịp, chữ: data/juice.json → mai. Chữ chỉ gán textContent.
import { maiOn, restForecast, nextStep, giftTomorrow } from '../game/hen-mai.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const set = (e, p, v) => { if (e['_' + p] !== v) { e['_' + p] = v; e.style[p] = v; } };
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const num = n => Math.round(n).toLocaleString('vi-VN');

export function createHenMai(game) {
  const C = game.data.juice?.mai;
  if (!C || !maiOn(game)) return;
  const T = C.t, X = C.text;
  let root = null, S = null, raf = 0, css = false;
  const loop = () => { raf = 0; if (S) { paint(); raf = requestAnimationFrame(loop); } };

  function open() {
    if (S || !game.save) return;
    if (!css) { css = true; const l = el('link'); l.rel = 'stylesheet'; l.href = new URL(`./hen-mai.css?v=${ver()}`, import.meta.url).href; document.head.append(l); }
    const F = restForecast(game), N = nextStep(game), G = giftTomorrow(game), R = game.data.realms;
    root ??= document.body.appendChild(el('div')); root.id = 'hen-mai'; root.textContent = ''; root.hidden = false;
    const dim = root.appendChild(el('div', 'm-dim')), card = root.appendChild(el('div', 'm-card')), rows = [];
    card.appendChild(el('div', 'm-title')).append(el('span', null, X.title));
    const row = head => { const r = card.appendChild(el('div', 'm-row')); r.append(el('small', null, head)); rows.push(r); return r; };
    // hàng 1: thang tầng + thanh linh khí
    const r1 = row(X.rest), lad = r1.appendChild(el('div', 'm-lad')), cells = [];
    for (let i = 1; i <= R.layers; i++) cells.push(lad.appendChild(el('i', i <= F.from.layer ? 'on' : '', String(i))));
    const bar = r1.appendChild(el('div', 'm-bar')), b1 = bar.appendChild(el('i', 'm-b1')), b0 = bar.appendChild(el('i', 'm-b0'));
    r1.append(el('b', null, fill(X.rest_line, { h: F.hours, qi: num(F.qi) })));
    const pct = Math.round((F.p1 - F.p0) * 100);   // cảnh giới cao, một đêm chưa nhích nổi vài phần trăm: chỉ nêu số linh khí, không nêu phần trăm cho khỏi nản
    if (F.full || F.up || pct >= C.pct_min) r1.append(el('em', null, fill(F.full ? X.rest_full : F.up ? X.rest_to : X.rest_same, { label: F.label, pct })));
    // hàng 2: quà ngày mai
    const r2 = row(X.gift);
    if (G.guest || G.wait) r2.append(el('b', null, G.guest ? X.gift_guest : X.gift_wait));
    else {
      r2.append(el('b', null, fill(X.gift_day, { n: G.day, coins: num(G.coins) })));
      r2.append(el('em', null, fill(G.k ? X.gift_m7 : X.gift_m7_now, { k: G.k, coins: num(G.m7.coins), khoa: G.m7.khoa, ngoc: G.m7.ngoc })));
      if (G.today) r2.append(el('u', null, fill(X.gift_today, { coins: num(G.coins) })));
    }
    // hàng 3: bậc kế tiếp
    if (N) {
      const r3 = row(X.next);
      r3.append(el('b', null, N.realm ? fill(X.next_realm, { name: N.realm }) : fill(N.pick ? X.next_pick : X.next_pb, N)));
      if (N.far) r3.append(el('em', null, fill(N.far <= F.up ? X.next_reach : X.next_far, N)));   // một đêm bế quan là tới mốc: nói thẳng "ngủ dậy là có"
    }
    const say = card.appendChild(el('p', 'm-say', X.say)), ok = card.appendChild(el('button', 'm-ok', X.ok)); ok.type = 'button';
    ok.addEventListener('click', () => { if (S && !S.out) { S.out = game.time; game.sfx?.('click'); } });
    root.onpointerdown = e => { if (S && e.target !== ok && game.time - S.t0 < S.tEnd) S.t0 = game.time - S.tEnd; };   // chạm sớm: hiện hết luôn
    const gain = cells.slice(F.from.layer, F.to.layer), tCell = T.row + 0.15, tRow2 = tCell + gain.length * T.cell + T.gap;
    S = { t0: game.time, dim, card, rows, cells, gain, b0, b1, F, say, ok, tCell, tRow2, tEnd: tRow2 + (rows.length - 1) * T.gap + T.end, fired: {}, own: !game.uiOpen };
    if (S.own) game.uiOpen = 'mai';
    game.sfx?.(C.sfx.open, 0.7); paint();
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function paint() {
    const t = game.time - S.t0, F = S.F, once = (k, f) => { if (!S.fired[k]) { S.fired[k] = 1; f(); } };
    if (S.out != null) {
      const k = cl((game.time - S.out) / T.out);
      set(S.dim, 'opacity', (C.dim * (1 - k)).toFixed(3)); set(S.card, 'opacity', (1 - k).toFixed(3));
      if (k >= 1) { root.hidden = true; if (S.own && game.uiOpen === 'mai') game.uiOpen = false; S = null; }
      return;
    }
    const kin = cl(t / T.in);
    set(S.dim, 'opacity', (C.dim * kin).toFixed(3)); set(S.card, 'opacity', kin.toFixed(3)); set(S.card, 'transform', `translateY(${Math.round((1 - kin) ** 2 * 26)}px)`);
    S.rows.forEach((r, i) => { const a = cl((t - (i ? S.tRow2 + (i - 1) * T.gap : T.row)) / 0.2); set(r, 'opacity', a.toFixed(2)); if (a > 0 && i) once('r' + i, () => game.sfx?.(C.sfx.row, 0.5)); });
    S.gain.forEach((c, i) => {   // từng ô tầng sẽ lấp sáng lên, nảy một nhịp, mỗi ô một nốt cao dần
      const a = t - S.tCell - i * T.cell;
      if (a < 0) return;
      once('c' + i, () => { c.classList.add('new'); game.sfx?.(C.sfx.cell[Math.min(i, C.sfx.cell.length - 1)], 0.6); });
      set(c, 'transform', a < 0.18 ? `scale(${(1 + 0.5 * (1 - a / 0.18)).toFixed(3)})` : '');
    });
    const kb = cl((t - S.tCell) / Math.max(0.3, S.gain.length * T.cell));   // thanh linh khí tới tầng kế: phần đang có (vàng), phần bế quan thêm (lam)
    set(S.b0, 'width', `${((F.up ? 0 : F.p0) * 100).toFixed(1)}%`); set(S.b1, 'width', `${((F.up ? F.p1 * kb : F.p0 + (F.p1 - F.p0) * kb) * 100).toFixed(1)}%`);
    const ke = cl((t - S.tEnd + T.end) / T.end);
    set(S.say, 'opacity', ke.toFixed(2)); set(S.ok, 'opacity', ke.toFixed(2)); S.ok.classList.toggle('ready', ke >= 1);
  }

  game.henMaiShow = open;
}
