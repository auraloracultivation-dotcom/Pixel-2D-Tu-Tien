// Thẻ Điểm danh ở đầu tab Hằng ngày (bảng Việc): nút điểm danh hôm nay và tiến độ mốc tuần, tháng, quý.
import { checkinOn, checkinCached, loadCheckin, doCheckin } from '../game/checkin.js';

let loading = false;

const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

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
  const lines = [fill(T.day, C.rules.ngay)];
  for (const k of ['tuan', 'thang', 'quy']) {
    const p = st[k] || {}, r = C.rules[k];
    const row = fill(p.da_nhan ? T.row_got : T.row, { name: C.names[k], co: p.co ?? 0, can: p.can ?? r.can, reward: fill(T.reward, r) });
    lines.push(p.da_nhan ? row : `${row} (${fill(T.left, { n: Math.max(0, p.con ?? 0) })})`);
  }
  const btn = h.mini(st.hom_nay ? T.done : T.btn, async () => {
    const r = await doCheckin(game);
    if (r.ok) game.sfx('levelup');
    h.say(r.msg); h.rerender();
  }, st.hom_nay);
  list.append(h.card(st.hom_nay ? '#c8c4d0' : '#ff7ab6', T.title, lines, btn));
}
