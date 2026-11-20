// Thẻ "Hẹn ngày mai" và thẻ "Xuất quan" (docs/10-CAI-HON.md việc 5b; số liệu do src/game/hen-mai.js tính): nền tối nhẹ, thẻ giữa màn, các hàng hiện lần lượt.
// Hẹn ngày mai (trước lúc rời game, lời hứa):
//   1. Bế quan lúc vắng: thang chín ô tầng của cảnh giới đang tu. Ô đã đạt sáng vàng; các ô một đêm bế quan sẽ lấp sáng lên từng ô một màu lam, mỗi ô
//      một nốt đàn; dưới thang là thanh linh khí tới tầng kế (trước / sau) và dòng "Nghỉ 8 tiếng: +N linh khí → tới tầng nào".
//   2. Quà ngày mai: quà điểm danh ngày mai, còn mấy ngày tới mốc 7 ngày.
//   3. Bậc kế tiếp: mốc nhận pháp bảo gần nhất, còn mấy tầng.
// Xuất quan (lúc quay lại sau khi vắng, src/game/offline.js gọi game.xuatQuanShow; lời hứa hôm trước được trả): cùng thang tầng ấy nhưng là số thật vừa
// nhận, quà linh thú và bạn đồng hành mang về lúc vắng, quà điểm danh hôm nay chưa nhận. Trả lời hứa, xong khi người chơi bấm nút.
// Cuối thẻ là một câu của Hệ Thống và một nút. Chạm sớm thì hiện hết luôn. Mọi chuyển động tính theo giờ game từng khung (phòng đo quay lại được),
// chỉ xin khung hình trong lúc thẻ đang hiện. Kiểu: hen-mai.css. Giờ từng nhịp, chữ: data/juice.json → mai. Chữ chỉ gán textContent.
import { goc } from '../core/build.js';
import { maiOn, restForecast, nextStep, giftTomorrow } from '../game/hen-mai.js';

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

  // V: kết quả bế quan lúc quay lại (thẻ Xuất quan); không có: thẻ Hẹn ngày mai
  function open(V) {
    if (S || !game.save) return Promise.resolve();
    if (!css) { css = true; const l = el('link'); l.rel = 'stylesheet'; l.href = goc('src/ui/hen-mai.css'); document.head.append(l); }
    const F = V || restForecast(game), N = V ? null : nextStep(game), G = giftTomorrow(game), R = game.data.realms;
    root ??= document.body.appendChild(el('div')); root.id = 'hen-mai'; root.textContent = ''; root.hidden = false;
    const dim = root.appendChild(el('div', 'm-dim')), card = root.appendChild(el('div', 'm-card')), rows = [];
    card.appendChild(el('div', 'm-title')).append(el('span', null, V ? X.back_title : X.title));
    const row = head => { const r = card.appendChild(el('div', 'm-row')); r.append(el('small', null, head)); rows.push(r); return r; };
    // hàng 1: thang tầng + thanh linh khí
    const r1 = row(X.rest), lad = r1.appendChild(el('div', 'm-lad')), cells = [];
    for (let i = 1; i <= R.layers; i++) cells.push(lad.appendChild(el('i', i <= F.from.layer ? 'on' : '', String(i))));
    const bar = r1.appendChild(el('div', 'm-bar')), b1 = bar.appendChild(el('i', 'm-b1')), b0 = bar.appendChild(el('i', 'm-b0'));
    const pct = Math.round((F.p1 - F.p0) * 100), o = { h: F.hours, time: V?.time, qi: num(F.qi), label: F.label, pct };
    if (V && !F.qi) r1.append(el('b', null, fill(X.back_none, o)));   // linh khí đã đầy từ trước: bế quan không thêm được
    else {
      r1.append(el('b', null, fill(V ? X.back_line : F.full ? X.rest_line_full : X.rest_line, o)));
      // cảnh giới cao, một đêm chưa nhích nổi vài phần trăm: chỉ nêu số linh khí, không nêu phần trăm cho khỏi nản
      if (F.full || F.up || pct >= C.pct_min) r1.append(el('em', null, fill(V ? (F.full ? X.back_full : F.up ? X.back_to : X.rest_same) : F.full ? X.rest_full : F.up ? X.rest_to : X.rest_same, o)));
    }
    if (V?.home) r1.append(el('u', null, fill(X.back_home, { mul: V.home })));
    if (V?.pb?.length) row(X.back_pb).append(el('b', null, V.pb.join(', ')));   // pháp bảo nhận ở các mốc vừa qua (hôm trước thẻ Hẹn ngày mai đã hứa)
    if (V?.gifts?.length) { const r = row(X.back_gifts); for (const [who, text] of V.gifts) r.append(el('b', null, who ? `${who}: ${text}` : text)); }
    // hàng quà: ngày mai (Hẹn ngày mai) hoặc hôm nay chưa nhận (Xuất quan)
    if (V) {
      if (G.guest) row(X.gift_now).append(el('b', null, X.gift_guest));
      else if (G.today) { const r = row(X.gift_now); r.append(el('b', null, fill(X.gift_day, { n: G.day - 1, coins: num(G.coins) })), el('u', null, X.gift_now_how)); }
    } else {
      const r2 = row(X.gift);
      if (G.guest || G.wait) r2.append(el('b', null, G.guest ? X.gift_guest : X.gift_wait));
      else {
        r2.append(el('b', null, fill(X.gift_day, { n: G.day, coins: num(G.coins) })));
        r2.append(el('em', null, fill(G.k ? X.gift_m7 : X.gift_m7_now, { k: G.k, coins: num(G.m7.coins), khoa: G.m7.khoa, ngoc: G.m7.ngoc })));
        if (G.today) r2.append(el('u', null, fill(X.gift_today, { coins: num(G.coins) })));
      }
    }
    // hàng bậc kế tiếp
    if (N) {
      const r3 = row(X.next);
      r3.append(el('b', null, N.realm ? fill(X.next_realm, { name: N.realm }) : fill(N.pick ? X.next_pick : X.next_pb, N)));
      if (N.far) r3.append(el('em', null, fill(N.far <= F.up ? X.next_reach : X.next_far, N)));   // một đêm bế quan là tới mốc: nói thẳng "bế quan đêm nay là tới"
    }
    const say = card.appendChild(el('p', 'm-say', V ? X.back_say : X.say)), ok = card.appendChild(el('button', 'm-ok', V ? X.back_ok : X.ok)); ok.type = 'button';
    ok.addEventListener('click', () => { if (S && !S.out) { S.out = game.time; game.sfx?.('click'); } });
    root.onpointerdown = e => { if (S && e.target !== ok && game.time - S.t0 < S.tEnd) S.t0 = game.time - S.tEnd; };   // chạm sớm: hiện hết luôn
    const gain = cells.slice(F.from.layer, F.to.layer), tCell = T.row + 0.15, tRow2 = tCell + gain.length * T.cell + T.gap;
    S = { t0: game.time, dim, card, rows, gain, b0, b1, F, say, ok, tCell, tRow2, tEnd: tRow2 + (rows.length - 1) * T.gap + T.end, fired: {}, own: !game.uiOpen };
    if (S.own) game.uiOpen = 'mai';
    game.sfx?.(C.sfx.open, 0.7); paint();
    if (!raf) raf = requestAnimationFrame(loop);
    return new Promise(res => { S.done = res; setTimeout(res, 120000); });   // quá hai phút chưa bấm thì nơi gọi cứ đi tiếp, không kẹt lúc vào game
  }

  function paint() {
    const t = game.time - S.t0, F = S.F, once = (k, f) => { if (!S.fired[k]) { S.fired[k] = 1; f(); } };
    if (S.out != null) {
      const k = cl((game.time - S.out) / T.out);
      set(S.dim, 'opacity', (C.dim * (1 - k)).toFixed(3)); set(S.card, 'opacity', (1 - k).toFixed(3));
      if (k >= 1) { root.hidden = true; if (S.own && game.uiOpen === 'mai') game.uiOpen = false; S.done?.(); S = null; }
      return;
    }
    const kin = cl(t / T.in);
    set(S.dim, 'opacity', (C.dim * kin).toFixed(3)); set(S.card, 'opacity', kin.toFixed(3)); set(S.card, 'transform', `translateY(${Math.round((1 - kin) ** 2 * 26)}px)`);
    S.rows.forEach((r, i) => { const a = cl((t - (i ? S.tRow2 + (i - 1) * T.gap : T.row)) / 0.2); set(r, 'opacity', a.toFixed(2)); if (a > 0 && i) once('r' + i, () => game.sfx?.(C.sfx.row, 0.5)); });
    S.gain.forEach((c, i) => {   // từng ô tầng lấp sáng lên, nảy một nhịp, mỗi ô một nốt cao dần
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

  game.henMaiShow = () => open();
  game.xuatQuanShow = V => open(V);
}
