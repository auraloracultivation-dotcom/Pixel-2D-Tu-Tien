// Khung vẽ: kích thước theo màn hình, máy quay bám người chơi, rung màn hình.
// dpr: hàm trả độ phân giải vẽ (src/core/perf.js hạ khi máy yếu); s.resize() vẽ lại khung theo độ phân giải mới
// Lưới điểm ảnh chung (chủ dự án xin 29/10/2026 "lấy nét": không nhoè, không vỡ; theo Dungeon Chibi Style Guide "một lưới chung,
// phóng số nguyên"): cfg.pixel_snap thì nếu số nguyên điểm khung vẽ mỗi đơn vị bản đồ gần cỡ muốn (lệch ≤ snap_tol) thì lấy số
// nguyên đó (máy lớn, phóng nhiều thì gần như luôn khớp; điện thoại phóng 2–3 lần thì bước nhảy quá thô, giữ đúng tầm nhìn chủ dự án
// chọn). Tính theo độ phân giải chuẩn của máy (tối đa 2), không theo mức nhẹ máy, để tầm nhìn không nhảy khi game tự hạ mức.
// Máy quay luôn đặt đúng lưới điểm khung vẽ (làm tròn), đỡ lấp lánh khi máy quay trôi.
const refDpr = () => Math.min(window.devicePixelRatio || 1, 2);
const snapZ = (cfg, want) => {
  const d = refDpr(), z = want * d, k = Math.round(z);
  return cfg.pixel_snap && k >= 2 && Math.abs(k - z) / z <= (cfg.snap_tol ?? 0.08) ? k / d : want;
};
export function createScreen(canvas, cfg, dpr = () => Math.min(window.devicePixelRatio || 1, 2)) {
  const s = {
    canvas, ctx: canvas.getContext('2d'),
    w: 0, h: 0, dpr: 1, zoom: 1, base: 1, mul: 1, mulT: 1,
    camX: 0, camY: 0, shakeT: 0, shakeA: 0, shake0: 0, shakeP: 0, sx: 0, sy: 0,
  };

  function resize() {
    s.dpr = dpr();
    s.w = window.innerWidth; s.h = window.innerHeight;
    canvas.width = Math.round(s.w * s.dpr); canvas.height = Math.round(s.h * s.dpr);
    canvas.style.width = s.w + 'px'; canvas.style.height = s.h + 'px';
    s.base = snapZ(cfg, Math.min(s.w, s.h * 0.75) / (cfg.tile * cfg.view_tiles)); s.zoom = s.mul === 1 ? s.base : snapZ(cfg, s.base * s.mul);
  }
  window.addEventListener('resize', resize);
  resize();
  s.resize = resize;

  // Rung dịu mắt (config.comfort): nhỏ lại, có trần, lắc mượt và nhỏ dần tới hết thay vì nhảy ngẫu nhiên mỗi khung
  s.shake = (amount, time = 0.18) => {
    const c = cfg.comfort || {}, a = Math.min(c.shake_max ?? 99, amount * (c.shake_mul ?? 1));
    if (a <= 0) return;
    if (s.shakeT <= 0) s.shakeP = Math.random() * 10;
    s.shakeA = Math.max(s.shakeA, a); s.shakeT = Math.max(s.shakeT, time); s.shake0 = Math.max(s.shakeT, s.shake0 || 0);
  };

  // Lùi, tiến máy quay mượt (ngắm cảnh)
  s.zoomTo = k => { s.mulT = k; };

  s.follow = (x, y, dt, map) => {
    const k = 1 - Math.exp(-dt * 8);
    if (s.mul !== s.mulT) {   // đang lùi, tiến máy quay: mượt; dừng hẳn thì về đúng lưới điểm
      s.mul += (s.mulT - s.mul) * (1 - Math.exp(-dt * 1.2));
      if (Math.abs(s.mul - s.mulT) < 0.002) s.mul = s.mulT;
      s.zoom = s.mul === s.mulT ? snapZ(cfg, s.base * s.mul) : s.base * s.mul;
    }
    s.camX += (x - s.camX) * k; s.camY += (y - s.camY) * k;
    if (map) {
      const hw = s.w / s.zoom / 2, hh = s.h / s.zoom / 2;
      const W = map.w * cfg.tile, H = map.h * cfg.tile;
      s.camX = W > hw * 2 ? Math.min(Math.max(s.camX, hw), W - hw) : W / 2;
      // màn dọc: cho máy quay lố mép trên, mép dưới bản đồ một khoảng (cfg.cam_pad) để người đứng sát mép không bị cột HUD, nút đánh che
      const tall = s.h > s.w, pt = tall ? (cfg.cam_pad?.top || 0) * s.h / s.zoom : 0, pb = tall ? (cfg.cam_pad?.bottom || 0) * s.h / s.zoom : 0;
      s.camY = H + pt + pb > hh * 2 ? Math.min(Math.max(s.camY, hh - pt), H - hh + pb) : H / 2;
    }
    if (s.shakeT > 0) {
      s.shakeT -= dt; s.shakeP += dt;
      const k = Math.max(0, s.shakeT / s.shake0), w = (cfg.comfort?.shake_hz ?? 14) * Math.PI * 2, a = s.shakeA * k * k;
      s.sx = Math.sin(s.shakeP * w) * a; s.sy = Math.sin(s.shakeP * w * 1.31 + 1.7) * a * 0.7;
      if (s.shakeT <= 0) { s.shakeA = 0; s.shake0 = 0; }
    } else { s.sx = 0; s.sy = 0; }
  };

  s.snap = (x, y) => { s.camX = x; s.camY = y; };

  // Toạ độ thế giới → khung vẽ
  s.worldTransform = () => {
    const z = s.zoom * s.dpr;
    s.ctx.setTransform(z, 0, 0, z, Math.round(s.w / 2 * s.dpr - (s.camX - s.sx) * z), Math.round(s.h / 2 * s.dpr - (s.camY - s.sy) * z));
  };
  s.screenTransform = () => s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

  s.toWorld = (px, py) => ({ x: (px - s.w / 2) / s.zoom + s.camX, y: (py - s.h / 2) / s.zoom + s.camY });
  s.toScreen = (x, y) => ({ x: (x - s.camX) * s.zoom + s.w / 2, y: (y - s.camY) * s.zoom + s.h / 2 });

  s.viewRect = () => {
    const hw = s.w / s.zoom / 2 + 16, hh = s.h / s.zoom / 2 + 16;
    return { x0: s.camX - hw, y0: s.camY - hh, x1: s.camX + hw, y1: s.camY + hh };
  };
  return s;
}
