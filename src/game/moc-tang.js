// Mốc nhỏ trong tầng (data/he-thong.json → moc.tang; chủ dự án 19/11/2026 03:21–03:26): linh khí qua mỗi 10% của tầng đang tu thì
// tặng ngay một quà nhỏ, cho đường lên tầng dài (vài ngày) vẫn có cái mừng giữa chừng. Mỗi tầng 9 lần, mỗi tầng chỉ một lần:
// save.mocT = { l: tầng (tính từ đầu), k: mốc đã tặng }. Tầng thấp hơn đã ghi (mùa mới reset cảnh giới) thì ghi lại, không tặng bù.
// Gọi sau mỗi lần cộng linh khí (game.gainQi). Hình quà hiện ở src/ui/moc-chip.js (game.mocTangShow).
import { qiNeed, totalLayer } from './stats.js';
import { grant } from './daily.js';

export function mocTang(game) {
  const s = game.save, T = game.data['he-thong']?.moc?.tang;
  if (!s || !T?.list?.length) return;
  const L = totalLayer(s, game.data.realms), need = qiNeed(s, game.data.realms);
  if (!need) return;
  const k = Math.min(T.list.length, Math.floor((s.qi || 0) / need * 10));
  const st = s.mocT;
  if (!st || L < st.l) { s.mocT = { l: L, k, ...(st?.m ? { m: st.m } : {}) }; return; }   // bản lưu cũ chưa có / mùa mới / bị diệt lúc hóa ma tụt tầng: ghi mốc hiện tại, không tặng bù
  if (L > st.l) { st.l = L; st.k = L <= (st.m || -1) ? T.list.length : 0; }   // m: tầng cao nhất đã tặng trước khi tụt (pvp-ma.js maTra): lên lại tầng đó không tặng lần nữa
  if (k <= st.k) return;
  const qua = [];
  for (let i = st.k + 1; i <= k; i++) {
    const q = T.list[i - 1];
    if (q.coins_r) qua.push({ coins: q.coins_r * ((s.realm || 0) + 1) }); else qua.push({ ...q });
  }
  st.k = k;
  const r = { coins: 0, pills: {} };
  for (const q of qua) { if (q.coins) r.coins += q.coins; if (q.pill) r.pills[q.pill] = (r.pills[q.pill] || 0) + q.n; }
  grant(game, r, 'moc-tang');
  game.mocTangShow?.(k * 10, qua);
}
