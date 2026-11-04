// Thưởng tổ đội farm (data/doi-farm.json): mỗi thành viên khác mình đang online và cùng tinh cầu với mình thêm pct_each
// Linh Thạch rơi và linh khí hạ quái, tính tối đa max - 1 người. Hàm thuần (không đụng DOM, mạng) để thử bằng node.
// st: trạng thái máy chủ trả ({ toi: { tv: [{ cung, la_toi }] } }); at: lúc nhận (ms); map: tinh cầu lúc gửi nhịp.
// here: tinh cầu đang đứng, open: đang ở thế giới mở (bí cảnh, động phủ không cộng); now: giờ hiện tại (ms).

export function teamOthers(cfg, view, here, open, now) {
  const tv = view?.st?.toi?.tv;
  if (!open || !Array.isArray(tv) || view.map !== here || !(now - view.at <= cfg.stale_s * 1000)) return 0;
  const n = tv.filter(m => m && m.cung === true && !m.la_toi).length;
  return Math.max(0, Math.min(n, cfg.max - 1));
}

// Hệ số nhân: 1 + pct_each × số người hợp lệ
export const teamMul = (cfg, others) => 1 + cfg.pct_each * others;

// Phần trăm hiện trên dòng thưởng (làm tròn số nguyên)
export const teamPct = (cfg, others) => Math.round(cfg.pct_each * others * 100);
