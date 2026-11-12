// Nét điểm ảnh vẽ thẳng lên khung (không qua tấm hình dựng sẵn): vành xung kích, vòng trận, mặt sóng của luồng quạt, tia nảy, vệt bay.
// Vùng đòn pháp bảo rộng 80–270 đơn vị, dựng thành tấm hình thì quá nặng, nên vẽ bằng ô vuông bám lưới, màu phẳng lấy từ dải màu của đòn:
// nét cùng kiểu với hình pfx.* (không viền mờ, không chuyển màu mượt). m = 2: một ô = một điểm ảnh của thế giới; m = 1: ô nhỏ bằng điểm hình
// hiệu ứng. Toạ độ, bán kính, bề dày theo đơn vị bản đồ. Gọi sau pfxBegin (./pfx.js); mỗi hàm tự đặt lại phép biến đổi về điểm khung vẽ.
import { pfxView } from './pfx.js';

const cell = (T, m) => Math.max(1, Math.round(T.z * 0.5 * m));
const begin = (ctx, color, a) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = color; };

// Vành elip đặc (w >= rx: đĩa đặc): tâm (x, y), bán kính ngang rx, dọc ry, dày w. Quét từng hàng ô: mỗi hàng một hoặc hai đoạn.
export function pxRing(ctx, x, y, rx, ry, w, color, a = 1, m = 2) {
  const T = pfxView(), g = cell(T, m), RX = rx * T.z, RY = ry * T.z;
  if (a <= 0.01 || RX < g || RY < g) return;
  const cx = Math.round((T.tx + x * T.z) / g), cy = Math.round((T.ty + y * T.z) / g), W = Math.max(g, w * T.z), IX = RX - W, IY = IX > 0 ? RY * IX / RX : 0;
  const n = Math.round(RY / g), j0 = Math.max(-n, -cy - 1), j1 = Math.min(n - 1, Math.ceil(ctx.canvas.height / g) - cy);
  begin(ctx, color, a);
  for (let j = j0; j <= j1; j++) {
    const dy = (j + 0.5) * g, xo = Math.round(RX * Math.sqrt(Math.max(0, 1 - (dy / RY) ** 2)) / g);
    if (xo < 1) continue;
    let xi = IY > 0 && Math.abs(dy) < IY ? Math.round(IX * Math.sqrt(1 - (dy / IY) ** 2) / g) : 0;
    if (xi >= xo) xi = xo - 1;
    if (xi <= 0) ctx.fillRect((cx - xo) * g, (cy + j) * g, xo * 2 * g, g);
    else { ctx.fillRect((cx - xo) * g, (cy + j) * g, (xo - xi) * g, g); ctx.fillRect((cx + xi) * g, (cy + j) * g, (xo - xi) * g, g); }
  }
}

// Cung chấm từng ô: tâm (x, y), bán kính r, ép dọc sy (1 = tròn), từ góc a0 tới a1 (rad), dày w. dash: [dài, hở] rad (vòng nét đứt), ph: lệch pha.
export function pxArc(ctx, x, y, r, sy, a0, a1, w, color, a = 1, m = 2, dash = null, ph = 0) {
  const T = pfxView(), g = cell(T, m), R = r * T.z;
  if (a <= 0.01 || R < g || a1 <= a0) return;
  const cx = T.tx + x * T.z, cy = T.ty + y * T.z, n = Math.max(1, Math.round(w * T.z / g)), per = dash ? dash[0] + dash[1] : 0;
  begin(ctx, color, a); ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const rr = R - i * g;
    if (rr < g) break;
    for (let t = a0, da = g * 0.8 / rr; t <= a1; t += da) {
      if (per && ((((t + ph) % per) + per) % per) > dash[0]) continue;
      ctx.rect(Math.round((cx + Math.cos(t) * rr) / g) * g, Math.round((cy + Math.sin(t) * rr * sy) / g) * g, g, g);
    }
  }
  ctx.fill();
}

// Đường gấp khúc: pts [[x, y]...], bút vuông w ô (tia nảy, vệt bay, vạch tốc độ)
export function pxLine(ctx, pts, w, color, a = 1, m = 1) {
  const T = pfxView(), g = cell(T, m), b = g * Math.max(1, Math.round(w)), off = Math.floor(b / 2 / g) * g;
  if (a <= 0.01 || pts.length < 2) return;
  begin(ctx, color, a); ctx.beginPath();
  for (let i = 0; i + 1 < pts.length; i++) {
    const x0 = T.tx + pts[i][0] * T.z, y0 = T.ty + pts[i][1] * T.z, x1 = T.tx + pts[i + 1][0] * T.z, y1 = T.ty + pts[i + 1][1] * T.z;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / g));
    for (let k = 0; k <= n; k++) ctx.rect(Math.round((x0 + (x1 - x0) * k / n) / g) * g - off, Math.round((y0 + (y1 - y0) * k / n) / g) * g - off, b, b);
  }
  ctx.fill();
}

// Một ô vuông cạnh s ô lưới tại (x, y): tia lấp lánh, đốm sáng
export function pxDot(ctx, x, y, s, color, a = 1, m = 1) {
  const T = pfxView(), g = cell(T, m), b = g * s;
  if (a <= 0.01) return;
  begin(ctx, color, a);
  ctx.fillRect(Math.round((T.tx + x * T.z) / g) * g - Math.floor(s / 2) * g, Math.round((T.ty + y * T.z) / g) * g - Math.floor(s / 2) * g, b, b);
}

// Quầng sáng cộng (mềm, như lớp sáng của hình pfx.*): bán kính r, ép dọc sy; độ rực theo trời tối (lk)
export function pxGlow(ctx, x, y, r, color, a, sy = 1) {
  const T = pfxView(), k = Math.min(1, a * T.lk), R = r * T.z;
  if (k <= 0.01 || R <= 1) return;
  const X = T.tx + x * T.z, Y = T.ty + y * T.z, n = parseInt(color.slice(1), 16), c = `${n >> 16},${(n >> 8) & 255},${n & 255}`, gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  gr.addColorStop(0, `rgba(${c},${k})`); gr.addColorStop(0.5, `rgba(${c},${k * 0.4})`); gr.addColorStop(1, `rgba(${c},0)`);
  ctx.setTransform(1, 0, 0, sy, X, Y); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.globalCompositeOperation = 'source-over';
}
