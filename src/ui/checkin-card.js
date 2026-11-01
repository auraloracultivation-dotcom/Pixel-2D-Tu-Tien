// Thẻ Điểm danh ở đầu tab Hằng ngày (bảng Việc), chủ dự án chốt 02/11/2026: bảng ô số 1→N của khối 28 ngày hiện tại trong
// vòng 112 ngày, ô đã điểm danh tích V, ô mốc (7, 14, 21, 28… và 112) có hộp quà; quà ghi rõ bên dưới. Luật ở máy chủ.
import { checkinOn, checkinCached, loadCheckin, doCheckin } from '../game/checkin.js';

let loading = false;

const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Bảng 28 ô của khối đang đi (ngày 1–28, 29–56, 57–84, 85–112)
function board(C, st) {
  const R = C.rules, pos = st.vi_tri || 0, wrap = !st.hom_nay && pos >= R.vong;   // hết vòng 112: hôm nay là ngày 1 vòng mới
  const done = wrap ? 0 : pos, next = st.hom_nay ? pos : wrap ? 1 : pos + 1, start = Math.floor((Math.max(1, next) - 1) / 28) * 28 + 1;
  const g = el('div', 'ck-grid');
  for (let n = start; n < start + 28 && n <= R.vong; n++) {
    const c = el('div', 'ck-cell' + (n <= done ? ' on' : '') + (n === next && !st.hom_nay ? ' today' : ''));
    const gift = n % R.m112.moi === 0 ? 'm112' : n % R.m28.moi === 0 ? 'm28' : n % R.m7.moi === 0 ? 'm7' : '';
    if (gift) c.classList.add('gift', gift);
    c.append(el('b', null, String(n)), el('i', null, n <= done ? '✓' : gift ? '🎁' : ''));
    g.append(c);
  }
  return g;
}

// h: { card, mini, say, rerender } từ bảng Việc
export function renderCheckin(game, list, h) {
  const C = game.data.checkin, T = C.text;
  if (!checkinOn(game)) { list.append(h.card('#c8c4d0', T.title, [T.login])); return; }
  const st = checkinCached();
  if (!st) {
    list.append(h.card('#c8c4d0', T.title, [T.loading]));
    if (!loading) { loading = true; loadCheckin(game).finally(() => { loading = false; if (checkinCached()) h.rerender(); }); }
    return;
  }
  if (st.vi_tri == null) { list.append(h.card('#c8c4d0', T.title, [T.loading])); return; }   // máy chủ chưa lên bảng mới
  const lines = [fill(T.board, { vong: st.vong_thu || 1, pos: st.vi_tri || 0, tong: st.tong || 0 }), fill(T.day, C.rules.ngay)];
  for (const k of ['m7', 'm28', 'm112']) lines.push(fill(T.gift_row, { name: C.names[k], reward: fill(T.reward, C.rules[k]) }));
  const btn = h.mini(st.hom_nay ? T.done : T.btn, async () => {
    const r = await doCheckin(game);
    if (r.ok) game.sfx('levelup');
    h.say(r.msg); h.rerender();
  }, st.hom_nay);
  const card = h.card(st.hom_nay ? '#c8c4d0' : '#ff7ab6', T.title, lines, btn);
  const b = board(C, st), first = card.querySelector('b')?.nextSibling;
  if (first) card.insertBefore(b, first); else card.append(b);
  list.append(card);
}
