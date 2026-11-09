// Hạn mức hiệu ứng (chủ dự án 09/11/2026 01:08: đánh đông quái, lực chiến cao thì "quá rối mắt, chẳng thấy gì khác biệt"):
// mỗi loại hiệu ứng chỉ được hiện tối đa n lần trong w giây (data/juice.json → budget). Quá hạn mức thì bỏ hiệu ứng nhỏ
// (đòn thường, hạ quái thường); hạ trùm, Bạo Nộ vẫn luôn hiện. Đếm bằng mốc thời gian, không cần dọn.
export function fxOk(game, key) {
  const B = game.data.juice?.budget?.[key];
  if (!B) return true;
  const S = (game.fxBudget ??= {}), q = (S[key] ??= []), now = game.time;
  while (q.length && now - q[0] > B.w) q.shift();
  if (q.length >= B.n) return false;
  q.push(now);
  return true;
}

// Rút gọn số lớn cho dễ đọc: 253.636.070 → "253Tr", 1.520.000.000 → "1,5Tỷ" (dưới min giữ nguyên số)
export function shortNum(v, min = 100000) {
  if (v < min) return String(v);
  const U = [[1e12, 'Ng.Tỷ'], [1e9, 'Tỷ'], [1e6, 'Tr'], [1e3, 'K']];
  for (const [d, u] of U) if (v >= d) { const x = v / d; return (x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10).toString().replace('.', ',') + u; }
  return String(v);
}
