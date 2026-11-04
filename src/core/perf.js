// Nhẹ máy (chủ dự án báo 28/10/2026: người chơi nóng máy, tụt pin, giật lag). Số ở data/config.json → perf.
// - Giới hạn khung hình: màn 120 Hz cũng chỉ vẽ fps khung mỗi giây; mở bảng, hộp thoại, ngắm cảnh, đả tọa thì fps_ui.
// - Độ phân giải vẽ: tối đa dpr[mức] điểm ảnh mỗi điểm CSS (máy 3x trước đây vẽ 1170×2532, nặng gấp 2,25 lần mức 2x mà
//   hình pixel trông như nhau). Máy yếu (ít nhân, ít RAM) bắt đầu ở mức 1; khung hình thật chậm hơn slow_ms trong window
//   giây thì tự hạ một mức (không tự nâng lại để khỏi chập chờn).
// - Chủ dự án 04/11/2026 (máy nóng): mức 1 vẽ 45 khung; máy tầm trung (mid: ít nhân, ít RAM vừa phải) cũng bắt đầu ở mức 1.
//   Chuẩn "chậm" nhân theo fps[0] / fps[mức] để mức 45 hay 30 khung không bị tính nhầm là chậm. Tốc độ game không đổi:
//   main.js tính dt theo thời gian thật (chặn tối đa 0,05 giây).
const below = (C, k) => (navigator.hardwareConcurrency || 8) <= C[k].cores || (navigator.deviceMemory || 8) <= C[k].mem;
export function createPerf(cfg, onChange) {
  const C = cfg.perf, weak = below(C, 'weak') || (C.mid && below(C, 'mid'));
  const P = { level: weak ? 1 : 0, last: 0, sum: 0, n: 0, since: 0, warm: performance.now() + C.warm * 1000, map: null, slow: 0 };
  const mark = () => { document.body.dataset.perf = P.level; document.body.classList.toggle('perf-calm', P.level >= (C.calm_from ?? 99)); };   // style-khung.css tắt hiệu ứng CSS
  mark();
  // dpr khung vẽ: không quá trần của mức, và màn phóng khung vẽ lên số nguyên lần (máy 3x: 1,5 chứ không 2) để điểm ảnh đều, không vỡ
  P.dpr = () => { const dev = window.devicePixelRatio || 1, cap = C.dpr[P.level]; return dev <= cap ? dev : dev / Math.ceil(dev / cap - 1e-6); };
  P.fps = game => (game?.uiOpen || game?.dialog?.open || game?.view || (game?.player?.meditating && !game.trib?.active) ? C.fps_ui : C.fps[P.level]);   // mở bảng, hộp thoại, ngắm cảnh, đả tọa: cảnh gần như đứng yên

  // Gọi đầu mỗi lần trình duyệt mời vẽ: true = vẽ khung này
  // Nhịp vẽ cộng dồn theo khoảng khung (P.last), không đặt lại bằng now: màn 60 Hz với 45 khung vẽ 3 trong 4 lần mời
  // (đặt lại bằng now thì chỉ còn 30). gap đo độ chậm là khoảng thật giữa hai khung đã vẽ (P.drawn).
  P.drawn = 0;
  P.tick = (now, game) => {
    const step = 1000 / P.fps(game);
    if (now - P.last < step - C.slack) return false;
    P.last = now - P.last > step * 2 ? now : Math.min(now, P.last + step);
    const gap = now - P.drawn;
    P.drawn = now;
    if (game?.map?.id !== P.map) { P.map = game?.map?.id; P.warm = Math.max(P.warm, now + C.warm * 500); }   // vừa nạp bản đồ: khung đầu dựng nền rất lâu, chưa tính
    if (now < P.warm) { P.sum = 0; P.n = 0; P.since = now; return true; }
    if (gap < 250 && P.fps(game) === C.fps[P.level]) {   // đo độ chậm (bỏ lúc ẩn trang, lúc đang mở bảng)
      P.sum += gap; P.n++;
      if (now - P.since > C.window * 1000) {
        P.slow = P.sum / P.n > C.slow_ms * C.fps[0] / C.fps[P.level] ? P.slow + 1 : 0;   // chậm hai lượt liền mới hạ
        if (P.slow >= 2 && P.level < C.dpr.length - 1) { P.level++; P.slow = 0; mark(); onChange?.(); }
        P.sum = 0; P.n = 0; P.since = now;
      }
    }
    return true;
  };
  return P;
}
