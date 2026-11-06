// Bảng boss thế giới Cửu Đầu Thôn Thiên Mãng (chủ dự án 06/11/2026: "bxh ngay màn hình bên phải ghi bxh sát thương của người chơi,
// boss k chết, cứ điền là 99% hp"). Hiện khi tinh cầu đang đứng có một cái đầu (game/thien-mang.js). Chữ trơn viền mực như bảng
// tổ đội, không chặn chạm; dưới hạng là Linh Thạch thưởng (gấp lt_mult lần farm, chờ vào Hòm thư); chạm dòng tên boss để thu gọn (nhớ trong máy). Chữ ở data/thien-mang.json → text, kiểu ở mang.css.
import { every } from '../core/ticker.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
const KEY = 'p2d-mang-gon';
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const fmt = n => Number(n || 0).toLocaleString('vi-VN');
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createMangPanel(game) {
  const C = game.data['thien-mang'];
  if (!C) return;
  const T = C.text;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./mang.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);
  const box = el('div', 'mang-panel'); box.id = 'mang-panel'; box.hidden = true;
  document.body.append(box);
  let gon = false, key = '';
  try { gon = localStorage.getItem(KEY) === '1'; } catch { /* chế độ riêng tư */ }

  function paint() {
    const s = game.mang, show = !!(s?.m && game.mobs.includes(s.m)) && !game.trip;
    box.hidden = !show;
    if (!show) { key = ''; return; }
    const b = s.board, k = JSON.stringify([b?.top, b?.n, b?.me, gon, !!game.online?.bossDmg]);
    if (k === key) return;
    key = k;
    const rows = [];
    const head = el('div', 'mang-head tap', `${T.title} ${gon ? '▸' : '▾'}`);
    head.addEventListener('click', ev => { ev.stopPropagation(); gon = !gon; try { localStorage.setItem(KEY, gon ? '1' : '0'); } catch { /* riêng tư */ } key = ''; paint(); });
    rows.push(head);
    const pct = Math.round((C.hp_show ?? 0.99) * 100);
    const bar = el('div', 'mang-bar'), fillEl = el('i'); fillEl.style.width = `${pct}%`; bar.append(fillEl, el('span', null, fill(T.hp, { pct })));
    rows.push(bar);
    if (!gon) {
      if (!game.online?.bossDmg) rows.push(el('div', 'mang-muted', T.offline));
      else {
        if (b?.n) rows.push(el('div', 'mang-n', fill(T.attackers, { n: b.n })));
        rows.push(el('div', 'mang-sub', T.board));
        const top = b?.top || [];
        if (!top.length) rows.push(el('div', 'mang-muted', T.empty));
        top.slice(0, C.top || 10).forEach(([name, v], i) => {
          const r = el('div', `mang-row r${i + 1}`);
          r.append(el('b', null, `${i + 1}.`), el('span', null, name), el('small', null, fmt(v)));
          rows.push(r);
        });
        rows.push(el('div', 'mang-me', b?.me ? fill(T.me, { r: b.me[0], v: fmt(b.me[1]) }) : T.me_none));
        const h = s.head, x = C.lt_mult || 10;   // thưởng Linh Thạch gấp lt_mult lần farm (máy chủ phòng tính, Hòm thư 5 phút một lần)
        if (h?.farm_lt_s) rows.push(el('div', 'mang-lt', fill(T.lt_rate, { lt: fmt(Math.round(h.farm_lt_s * x * 10) / 10), x, b: Math.round((C.lt_bonus || 0) * 100) })));
        if (b?.lt != null) rows.push(el('div', 'mang-lt', fill(T.lt, { lt: fmt(b.lt) })));
      }
    }
    box.replaceChildren(...rows);
  }
  every(paint, 500);
}
