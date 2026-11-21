// Tiềm năng (chủ dự án 21/11/2026 17:23; docs/15-TIEM-NANG-KY-NANG.md; số và chữ ở data/tiem-nang.json).
// - HUYẾT MẠCH: lúc Cây Thế Giới nhận linh căn, Cây gọi luôn tên tộc. Quay đúng MỘT lượt (quay): ra tộc theo tỉ lệ và vài chỉ số gốc theo
//   hướng của tộc. Mọi tộc quay chung một khoảng tổng điểm, chỉ khác chia vào chỉ số nào ("khác hướng, ngang sức"); tộc hiếm thêm một thiên phú.
// - ĐIỂM TIỀM NĂNG: mỗi lần đột phá đại cảnh giới có thêm điểm; tính thẳng từ cảnh giới đang ở nên người chơi cũ tự có đủ, không cần phát bù.
// Điểm là "Công % tương đương": đổi ra % của từng chỉ số bằng tỷ giá data/tiem-nang.json → quy, rồi cộng vào chỉ số như một nguồn
// thưởng nhỏ có trần (src/game/he-chien.js playerStatsHC, ext.tiem). Lưu: save.tiem { toc, goc: { chỉ số: điểm }, cong: { chỉ số: lần cộng }, tay }.
// Tệp này không đụng giao diện: lễ gọi huyết mạch ở src/game/le-toc.js, mục Tiềm năng ở src/ui/tiem-nang-view.js.

export const TN = data => data?.['tiem-nang'];
export const tnOn = data => !!TN(data)?.on;
export const tocCua = (save, data) => (tnOn(data) && TN(data).toc[save?.tiem?.toc]) || null;
const f = (data, k) => TN(data).quy?.[k] ?? data['he-chien']?.line_f?.[k] ?? 1;   // 1 điểm = bao nhiêu % của chỉ số k (data/tiem-nang.json → quy: ngang nhau về lực chiến)
const lam = (x, n = 10) => Math.round(x * n) / n;

// Quay một lượt: { toc, goc }. rnd: nguồn số ngẫu nhiên 0–1 (bài thử truyền số cố định).
export function quay(data, rnd = Math.random) {
  const T = TN(data), ids = Object.keys(T.toc), W = ids.reduce((s, id) => s + T.toc[id].w, 0);
  let r = rnd() * W, toc = ids[0];
  for (const id of ids) { r -= T.toc[id].w; if (r < 0) { toc = id; break; } }
  const [a, b] = T.quay.tong, tong = a + (b - a) * rnd();
  const phan = Object.entries(T.toc[toc].huong).map(([k, p]) => [k, p * (1 + (rnd() * 2 - 1) * T.quay.lech)]), sum = phan.reduce((s, [, p]) => s + p, 0);
  return { toc, goc: Object.fromEntries(phan.map(([k, p]) => [k, lam(tong * p / sum)])) };
}

// Chỉ số gốc đã quay, đã kẹp về đúng luật (bản lưu bị sửa tay cũng không vượt được: chỉ nhận chỉ số thuộc hướng của tộc, tổng không quá mức quay cao nhất).
export function gocCua(save, data) {
  const t = tocCua(save, data), g = save?.tiem?.goc, out = {};
  if (!t || !g) return out;
  const max = TN(data).quay.tong[1]; let sum = 0;
  for (const k of Object.keys(t.huong)) { const v = Math.max(0, Math.min(Number(g[k]) || 0, max - sum)); if (v > 0) { out[k] = v; sum += v; } }
  return out;
}

// Điểm tiềm năng: có bao nhiêu (theo cảnh giới), đã cộng bao nhiêu, mỗi chỉ số cộng được tới đâu
// Điểm có theo cảnh giới cao nhất từng đạt (save.tiem.max; hóa ma 22/11/2026: ma bị diệt có thể tụt cảnh giới, điểm đã có không mất, lên lại không thêm;
// máy chủ giữ p2d_nhan_vat.canh_max, trả về data.tiem.max)
export const diemCo = (save, data) => (tnOn(data) && save?.tiem?.toc ? TN(data).diem.moi * Math.max(0, save.realm | 0, save.tiem.max | 0) : 0);
export const tranCua = (data, k) => TN(data).diem.tran_rieng?.[k] ?? TN(data).diem.tran;
export function congCua(save, data) {
  const D = TN(data)?.diem, c = save?.tiem?.cong, out = {};
  if (!D || !c) return out;
  let con = diemCo(save, data);
  for (const k of D.chi_so) { const n = Math.max(0, Math.min(c[k] | 0, tranCua(data, k), con)); if (n) { out[k] = n; con -= n; } }
  return out;
}
export const diemCon = (save, data) => diemCo(save, data) - Object.values(congCua(save, data)).reduce((s, n) => s + n, 0);

// % cộng vào từng chỉ số của luật chiến đấu (atk_pct, hp_pct, def_pct, crit, crit_dmg, cdr, lifesteal, thorns): gốc tộc + điểm đã cộng
export function tiemPct(save, data) {
  const out = {}, D = TN(data)?.diem;
  if (!tocCua(save, data)) return out;
  for (const [k, v] of Object.entries(gocCua(save, data))) out[k] = (out[k] || 0) + v * f(data, k);
  for (const [k, n] of Object.entries(congCua(save, data))) out[k] = (out[k] || 0) + n * D.k * f(data, k);
  for (const k of Object.keys(out)) out[k] = lam(out[k], 100);
  return out;
}
export const motDiem = (data, k) => lam(TN(data).diem.k * f(data, k), 100);   // một lần cộng thêm bao nhiêu % chỉ số k
export const gocPct = (data, k, v) => lam(v * f(data, k), 10);                  // điểm gốc đổi ra % để hiện

// Thiên phú của tộc hiếm: phần cộng vào chỉ số ngoài trận (tốc tu, linh lực, hồi máu) theo tên chỉ số của công pháp
export const thienPhu = (save, data) => tocCua(save, data)?.thien_phu || null;
export const tiemThem = (save, data) => thienPhu(save, data)?.them || {};
export const luotNhanh = (save, data) => thienPhu(save, data)?.luot || 0;   // Lướt hồi nhanh hơn bấy nhiêu phần

// Thiên phú hồi sinh (Thần Huyết): máu tụt dưới ngưỡng thì hồi ngay một phần, cd giây một lần. Gọi mỗi khung hình (src/game/player.js).
export function tiemTick(game, dt) {
  const s = game.save;
  if (s?.tiem?.toc && (s.realm | 0) > (s.tiem.max | 0)) s.tiem.max = s.realm | 0;   // cảnh giới cao nhất từng đạt (diemCo)
  const h = thienPhu(game.save, game.data)?.hoi_sinh, p = game.player;
  if (!h || !p) return;
  p.tnCd = Math.max(0, (p.tnCd || 0) - dt);
  if (p.tnCd > 0 || !(p.hp > 0) || p.hp >= p.maxHp * h.duoi) return;
  p.tnCd = h.cd; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * h.hoi); p.invT = Math.max(p.invT || 0, 0.6);
  game.sfx?.('heal'); game.chuLon?.({ cau: thienPhu(game.save, game.data).ten, mau: tocCua(game.save, game.data).mau, han: tocCua(game.save, game.data).han, giu: 0.9 });
}

// Cộng một điểm vào chỉ số k; tẩy điểm (lần đầu miễn phí, sau đó tốn Linh Thạch: giaTay). Trả về true nếu làm được.
export function congDiem(game, k) {
  const s = game.save, D = TN(game.data).diem;
  if (!s.tiem?.toc || !D.chi_so.includes(k) || diemCon(s, game.data) < 1 || (congCua(s, game.data)[k] || 0) >= tranCua(game.data, k)) return false;
  s.tiem.cong = { ...congCua(s, game.data), [k]: (congCua(s, game.data)[k] || 0) + 1 };
  return true;
}
export function giaTay(game) {
  const s = game.save, Y = TN(game.data).diem.tay;
  return (s.tiem?.tay | 0) < Y.free ? 0 : Math.round(Y.gia * Y.grow ** Math.max(0, s.realm | 0));
}
export function tayDiem(game) {   // người gọi trả Linh Thạch trước (giaTay), ở đây chỉ thu điểm về
  const s = game.save;
  if (!s.tiem?.toc || !Object.keys(congCua(s, game.data)).length) return false;
  s.tiem.cong = {}; s.tiem.tay = (s.tiem.tay | 0) + 1;
  return true;
}
